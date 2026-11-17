// 喵打：前端
import { BANK, CAT_NAME, LEN_NAME, CODE_UNITS, randomSpec, textOf } from "/shared/bank.js";
import { learnCard } from "/learn.js";
import { Typist, summarize, speedOf, unitOf } from "/shared/judge.js";
import { analyze, tips, drillText, baseKey, show, esc, classify } from "/shared/analyze.js";

const $ = (s) => document.querySelector(s);
const VERSION = "__APP_VERSION__";
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
const SID = rid();
const CONSENT_KEY = "mt-consent-v1";
let consent = store.get(CONSENT_KEY, null); // true / false / null（還沒選）
let CID = store.get("mt-cid", null);
const device = (() => {
  const touch = matchMedia("(pointer: coarse)").matches;
  if (!touch) return "desktop";
  return Math.min(screen.width, screen.height) >= 700 ? "tablet" : "mobile";
})();
const online = /^https?:$/.test(location.protocol);
function post(path, body) {
  if (!online) return Promise.resolve(null);
  return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: path !== "/api/score" })
    .then((r) => (r.status === 204 ? {} : r.json())).catch(() => null);
}

const S = Object.assign({ cat: "cpp", len: "para", mode: "full", rule: "back", unit: "" }, store.get("mt-settings", {}));
const isCode = () => S.cat === "cpp" || S.cat === "py";
const timed = () => S.mode === "t60" && !R.drill;
const txt = $("#txt"), ta = $("#ta"), box = $("#box"), comp = $("#comp");
let R = null, spans = [], composing = false, lastComp = { t: 0, d: "" }, raf = 0, lastSpec = null;

/* ---------- 像素貓 ---------- */
const BODY = ["..........k...k.", ".........kok.kok", ".........koooook", "k........kooeoek", "ko.......kooopok", ".ko.kkkkkkoooook", "..kkoooooooooook", "..kowwoooooowwk.", "..koooooooooook.", "...kkkkkkkkkkk.."];
const LEGS = [["...ko.ko..ko.ko.", "...kk.kk..kk.kk."], ["....koko..koko..", "....kkkk..kkkk.."]];
function catSVG(f, ghost) {
  const P = ghost ? { k: "#5b5b66", o: "#b9b9c6", w: "#e6e6ee", e: "#333", p: "#c9a0aa" } : { k: "#3b2418", o: "#f2a03d", w: "#fff3e0", e: "#1a1a1a", p: "#f08da0" };
  let r = "";
  BODY.concat(LEGS[f]).forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${P[c]}"/>`; }));
  return `<svg viewBox="0 0 16 12" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const SV = [[catSVG(0, 0), catSVG(1, 0)], [catSVG(0, 1), catSVG(1, 1)]];
const me = $("#me"), gh = $("#ghost");
function setCat(el, g, f) { if (el._f === f) return; el.querySelector("svg")?.remove(); el.insertAdjacentHTML("afterbegin", SV[g][f]); el._f = f; }
setCat(me, 0, 0); setCat(gh, 1, 0);
function placeCat(el, p) { const w = $("#track").clientWidth - 64 - 36; el.style.left = 6 + Math.max(0, Math.min(1, p)) * w + "px"; }
function trip() { me.classList.remove("trip"); void me.offsetWidth; me.classList.add("trip"); }

/* ---------- 最佳紀錄（這台電腦） ---------- */
const pbKey = () => `mt-pb-${S.cat}-${S.len}-${S.mode}`;

/* ---------- 一局 ---------- */
/* 學一下的使用紀錄：離開結算畫面時送出 */
let learnLog = null;
function flushLearn() {
  if (learnLog && consent === true) post("/api/learn", { cid: CID, sid: SID, c: learnLog.c, l: learnLog.l, item: learnLog.item, quiz: learnLog.quiz, answered: learnLog.answered, correct: learnLog.correct, skipped: learnLog.skipped, opened: learnLog.opened });
  learnLog = null;
}
function abandon() {
  flushLearn();
  if (R && R.ty.started && !R.ended) { sendRun(false); post("/api/end", { sid: SID }); }
}
/** newRun()：隨機新題；newRun(null, false, spec)：同一題再一次；newRun(文字, true)：弱點練習 */
function newRun(text, drill, spec) {
  abandon();
  cancelAnimationFrame(raf);
  if (drill) spec = null;
  else { if (!spec) { spec = randomSpec(S.cat, S.len, lastSpec, Math.random, isCode() ? S.unit : ""); lastSpec = spec; } text = textOf(spec); }
  R = { ty: null, specs: spec ? [spec] : [], spec0: spec, start: 0, ended: false, endT: 0, pastes: 0, ime: 0, drill: !!drill, text0: text, pb: drill ? null : store.get(pbKey(), null) };
  R.ty = new Typist(S.rule, chunkDone);
  R.ty.setText(text);
  build(); paint(); updLive();
  placeCat(me, 0); placeCat(gh, 0); gh.style.display = R.pb ? "" : "none";
  $("#res").hidden = true; box.classList.remove("end");
  const cjk = isCode() && /[\u3000-\u9fff\uff00-\uffef]/.test(text);
  $("#hint").textContent = (isCode() ? "Tab 縮排（補到 4 的倍數）・" : "") + "Esc 重來同一題・不能貼上" + (S.cat === "zh" ? "・用注音或其他中文輸入法打" : "") + (cjk ? "・字串裡的中文要切回中文輸入法，打完再切回英數" : "");
  ta.value = ""; ta.focus({ preventScroll: true });
}
function build() {
  txt.className = S.cat === "zh" ? "zh" : "";
  const t = R.ty.text; let h = "", ls = true;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "\n") { h += `<span class="nl">↵</span><br>`; ls = true; continue; }
    if (c === " " && ls && isCode()) { h += `<span class="ind">·</span>`; continue; }
    ls = false; h += `<span>${esc(c)}</span>`;
  }
  txt.innerHTML = h; spans = [...txt.querySelectorAll("span")]; txt.scrollTop = 0;
}
function paint() {
  const ty = R.ty, fb = S.rule === "back" ? ty.firstBad() : -1, n = ty.typed.length;
  spans.forEach((s, i) => {
    const t = ty.typed[i], base = s.classList.contains("ind") ? "ind" : s.classList.contains("nl") ? "nl" : "";
    let c = base;
    if (t === undefined) { if (i === n) c += " cur"; delete s.dataset.got; }
    else {
      const ok = t === ty.text[i] && (fb < 0 || i < fb);
      c += ok ? " ok" : " bad";
      if (!ok && t !== ty.text[i]) s.dataset.got = show(t); else delete s.dataset.got;
    }
    s.className = c.trim();
  });
  const cur = spans[Math.min(n, spans.length - 1)];
  if (cur) {
    const b = box.getBoundingClientRect(), r = cur.getBoundingClientRect();
    const x = (n >= spans.length ? r.right : r.left) - b.left, y = r.top - b.top;
    ta.style.left = x + "px"; ta.style.top = y + "px"; comp.style.left = x + "px"; comp.style.top = y - 4 + "px";
    const tr = txt.getBoundingClientRect();
    if (r.bottom > tr.bottom - 10 || r.top < tr.top) cur.scrollIntoView({ block: "center" });
  }
}
function now() { return performance.now(); }
function event(ev) {
  if (!R || R.ended) return;
  const t0 = now();
  if (!R.start) { R.start = t0; post("/api/start", { sid: SID }); loop(); }
  if (timed() && t0 - R.start >= 60000) { finish(60000); return; }
  ev[0] = Math.round(t0 - R.start);
  R.endT = ev[0];
  const r = R.ty.apply(ev);
  if (r.rejected) toast("一次湧進太多字，已擋下");
  if (r.trip) trip();
  if (!R.ended) { paint(); updLive(); }
}
function chunkDone(ty) {
  if (timed()) {
    const spec = randomSpec(S.cat, S.len, lastSpec, Math.random, isCode() ? S.unit : ""); lastSpec = spec; R.specs.push(spec);
    ty.setText(textOf(spec)); build();
    return;
  }
  queueMicrotask(() => finish(R.endT));
}

/* ---------- 計時與即時數字 ---------- */
const elapsed = () => (R.start ? (R.ended ? R.ms : now() - R.start) : 0);
function goal() {
  if (timed()) return Math.max(R.pb ? R.pb.chars * 1.1 : S.cat === "zh" ? 50 : 180, R.ty.totalCorrect() + 1);
  return R.ty.text.length;
}
function updLive() {
  const ms = elapsed(), c = R.ty.totalCorrect(), ks = R.ty.keys.filter((k) => !k.after);
  $("#lu").textContent = "速度（" + unitOf(S.cat) + "）";
  $("#ls").textContent = Math.round(speedOf(S.cat, c, ms));
  $("#la").textContent = ks.length ? Math.round((ks.filter((k) => k.ok).length / ks.length) * 100) + "%" : "100%";
  $("#le").textContent = ks.filter((k) => !k.ok).length;
  $("#lt0").textContent = timed() ? "剩下（秒）" : "時間（秒）";
  $("#lt").textContent = timed() ? Math.max(0, 60 - ms / 1000).toFixed(1) : (ms / 1000).toFixed(1);
  placeCat(me, c / goal());
  if (R.pb) placeCat(gh, timed() ? ((ms / 60000) * R.pb.chars) / goal() : (R.pb.cpm * ms) / 60000 / R.ty.text.length);
}
function loop() {
  raf = requestAnimationFrame(() => {
    if (!R || R.ended) return;
    const t = now(), f = Math.floor(t / 120) % 2;
    setCat(me, 0, t - R.start - R.endT < 400 ? f : 0); setCat(gh, 1, f);
    updLive();
    if (timed() && t - R.start >= 60000) { finish(60000); return; }
    loop();
  });
}

/* ---------- 結算 ---------- */
function kbHTML(A) {
  const cnt = {}; A.E.forEach((k) => { const b = baseKey(k.exp); cnt[b] = (cnt[b] || 0) + 1; });
  const mx = Math.max(1, ...Object.values(cnt));
  const cell = (k, l, cl = "") => { const n = cnt[k] || 0; return `<span class="${cl}" title="${esc(k)}：${n}" style="${n ? `background:color-mix(in srgb,var(--bad) ${20 + (60 * n) / mx}%,var(--soft));color:#fff` : ""}">${esc(l || k.toUpperCase())}</span>`; };
  const rows = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./"];
  return `<div class="kb">${rows.map((r, i) => `<div style="padding-left:${i * 10}px">${[...r].map((k) => cell(k)).join("")}${i === 2 ? cell("Enter", "↵") : ""}</div>`).join("")}<div style="padding-left:60px">${cell("空白", "空白鍵", "sp")}</div></div>`;
}
function runPayload(finished) {
  ensureCid();
  const ms = R.ended ? R.ms : R.endT;
  const s = summarize(R.ty, S.cat, ms || 1), c = classify(R.ty.keys.filter((k) => !k.after && !k.ok));
  return { cid: CID, sid: SID, device, c: S.cat, l: R.drill ? "drill" : S.len, m: S.mode, rule: S.rule, drill: R.drill, ms: Math.round(ms), correct: s.correct, keys: s.keys, errs: s.errs,
    acc: s.acc, speed: s.speed, width: c.width.length, indent: c.indent.length, semi: c.semi.length, kase: c.kase.length, enter: c.enter.length,
    backs: R.ty.backs, pastes: R.pastes, bursts: R.ty.bursts, ime: R.ime, finished };
}
function sendRun(finished) { if (consent === true) post("/api/run", runPayload(finished)); }

function finish(ms) {
  if (R.ended) return;
  R.ended = true; R.ms = ms; cancelAnimationFrame(raf); ta.blur(); box.classList.add("end");
  post("/api/end", { sid: SID });
  setCat(me, 0, 0); setCat(gh, 1, 0); updLive(); paint();
  const A = analyze(R.ty, S.cat, ms), sp = speedOf(S.cat, A.correct, ms), cpm = A.correct / (ms / 60000 || 1);
  let isPB = false;
  if (!R.drill && A.correct > 5 && A.acc >= 0.8 && (!R.pb || cpm > R.pb.cpm)) { isPB = !!R.pb; store.set(pbKey(), { cpm, chars: A.correct }); }
  sendRun(true);
  const T = tips(A, { cat: S.cat, rule: S.rule, pastes: R.pastes, ime: R.ime }), c = A.cls;
  const L = R.drill ? null : learnCard(R.specs[0], S.cat, S.len);
  const chip = (l, n) => `<span class="${n ? "hot" : ""}">${l} ${n}</span>`;
  const mx = Math.max(1, ...A.seg);
  const canBoard = !R.drill && A.acc >= 0.9 && A.correct >= 20 && online;
  $("#res").innerHTML = `<div class="res">
   <h2>${R.drill ? "弱點練習結果" : "這次的成績"} ${isPB ? '<span class="pb">新紀錄</span>' : ""}</h2>
   <div class="big"><div><small>速度（${unitOf(S.cat)}）</small><strong>${Math.round(sp)}</strong></div>
    <div class="s"><small>正確率</small><strong>${Math.round(A.acc * 100)}%</strong></div>
    <div class="s"><small>時間</small><strong>${(ms / 1000).toFixed(1)} 秒</strong></div>
    <div class="s"><small>打對的字</small><strong>${A.correct}</strong></div>
    ${S.cat !== "zh" ? `<div class="s"><small>字元／分</small><strong>${Math.round(cpm)}</strong></div>` : ""}</div>
   ${canBoard ? `<form class="submit" id="sub"><label for="nick"><b>上排行榜</b></label><input id="nick" maxlength="10" placeholder="暱稱（不要填真名）" value="${esc(store.get("mt-nick", ""))}" autocomplete="off"><button class="main" type="submit">送出成績</button><p id="subMsg">${CAT_NAME[S.cat]}・${LEN_NAME[S.len]}・${S.mode === "t60" ? "1 分鐘" : "打完一題"}，每人只留最好的一次。</p></form>`
      : !R.drill && online ? `<div class="submit"><p>正確率 90% 以上、打對 20 個字以上才能上排行榜。</p></div>` : ""}
   ${L ? L.html : ""}
   <div class="cols"><div><h3>建議</h3><ul class="tips">${T.map(([b, t]) => `<li><b>${b}</b>${t}</li>`).join("") || "<li><b>很穩</b>這次沒有明顯的問題。</li>"}</ul></div>
   <div><h3>錯誤分類</h3><div class="chips">${chip("全形半形", c.width.length)}${isCode() ? chip("縮排", c.indent.length) + chip("大小寫", c.kase.length) : ""}${S.cat === "cpp" ? chip("分號", c.semi.length) : ""}${isCode() ? chip("Enter", c.enter.length) : ""}${chip("其他", c.other.length)}</div>
   ${S.cat !== "zh" ? "<h3>哪些鍵打錯</h3>" + kbHTML(A) : ""}
   <h3>速度變化</h3><div class="curve">${A.seg.map((v) => `<i style="height:${(v / mx) * 100}%" title="${Math.round(v)}"></i>`).join("")}</div><div class="cl"><span>開始</span><span>結束</span></div>
   ${A.pauses.length ? `<h3 style="margin-top:16px">停最久的地方</h3><ol class="pz">${A.pauses.map((k) => `<li><code>${esc(show(k.exp))}</code> 前停了 ${(k.gap / 1000).toFixed(1)} 秒</li>`).join("")}</ol>` : ""}</div></div>
   <div class="btns"><button class="main" id="bAgain" type="button">同一題再一次</button><button id="bNew" type="button">換一題</button>${A.E.length ? '<button id="bDrill" type="button">針對弱點練習</button>' : ""}</div></div>`;
  $("#res").hidden = false;
  if (L) {
    const it0 = R.specs[0];
    learnLog = { c: S.cat, l: S.len, item: it0 ? it0.i.join(",") : "", quiz: /id="quiz"/.test(L.html) ? 1 : 0, answered: 0, correct: 0, skipped: 0, opened: 0,
      onAnswer(right) {
        if (!right) return;
        const n = store.get("mt-quiz-right", 0) + 1; store.set("mt-quiz-right", n);
        me.classList.remove("hop"); void me.offsetWidth; me.classList.add("hop");
        toast(`答對了！你已經答對 ${n} 題`);
      } };
    L.bind($("#res"), learnLog);
  }
  const same = R.text0, drill = R.drill, specs = R.specs.slice(), events = R.ty.events.slice(), rule = S.rule;
  const spec0 = R.spec0;
  $("#bAgain").onclick = () => newRun(same, drill, spec0);
  $("#bNew").onclick = () => newRun();
  if ($("#bDrill")) $("#bDrill").onclick = () => newRun(drillText(A, S.cat), true);
  const f = $("#sub");
  if (f) f.onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#nick").value.trim(), msg = $("#subMsg");
    if (!name) { msg.textContent = "先填一個暱稱"; $("#nick").focus(); return; }
    store.set("mt-nick", name);
    f.querySelector("button").disabled = true; msg.textContent = "送出中…";
    const r = await post("/api/score", { cid: ensureCid(), name, c: S.cat, l: S.len, m: S.mode, rule, specs, events, ms: Math.round(ms), speed: sp });
    if (!r || r.error) { msg.textContent = r?.error || "送不出去，等一下再試"; f.querySelector("button").disabled = false; return; }
    msg.className = "msg";
    msg.textContent = r.flagged ? "收到了，但這次的打字節奏不太像人打的，先不放上排行榜。" : r.rank ? `上榜了！今天第 ${r.rank} 名。` : "收到了，但沒有比你之前的成績好，排行榜留最好的那次。";
    loadBoard();
  };
  $("#res").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
// 隨機編號：排行榜用它做「每人只留最好的一次」；只有同意之後才會跟著練習數據送出
function ensureCid() { if (!CID) { CID = rid(); store.set("mt-cid", CID); } return CID; }

/* ---------- 排行榜 ---------- */
let per = store.get("mt-board-per", "day");
async function loadBoard() {
  $("#bset").textContent = `${CAT_NAME[S.cat]}・${LEN_NAME[S.len]}・${S.mode === "t60" ? "1 分鐘" : "打完一題"}（${unitOf(S.cat)}）`;
  document.querySelectorAll("#bper button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === per));
  if (!online) { $("#blist").innerHTML = '<p class="empty">要連上伺服器才看得到排行榜。</p>'; return; }
  const q = new URLSearchParams({ c: S.cat, l: S.len, m: S.mode, p: per, me: CID || "" });
  let rows = null;
  try { rows = await (await fetch("/api/board?" + q)).json(); } catch {}
  if (!Array.isArray(rows)) { $("#blist").innerHTML = '<p class="empty">排行榜暫時讀不到。</p>'; return; }
  if (!rows.length) { $("#blist").innerHTML = '<p class="empty">還沒有人上榜，第一名就是你的。</p>'; return; }
  const RN = { block: "擋下", back: "倒退修", free: "帶錯" };
  $("#blist").innerHTML = `<table class="lb"><thead><tr><th>名次</th><th>暱稱</th><th class="n">速度</th><th class="n">正確率</th><th>打錯時</th></tr></thead><tbody>${rows.map((r, i) =>
    `<tr class="${r.me ? "me" : ""}"><td class="rk">${i + 1}</td><td>${esc(r.name)}</td><td class="n">${Math.round(r.speed)}</td><td class="n">${Math.round(r.acc * 100)}%</td><td>${RN[r.rule] || ""}</td></tr>`).join("")}</tbody></table>`;
}
$("#bper").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; per = b.dataset.v; store.set("mt-board-per", per); loadBoard(); });

/* ---------- 輸入事件 ---------- */
let tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1800); }
function pasted() { if (R && !R.ended) R.pastes++; toast("這裡不能貼上，要自己打喔"); }
ta.addEventListener("keydown", (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Tab") { e.preventDefault(); if (isCode()) event([0, "t"]); }
  else if (e.key === "Escape") { e.preventDefault(); newRun(R.text0, R.drill, R.spec0); }
});
ta.addEventListener("beforeinput", (e) => {
  const t = e.inputType || "";
  if (composing || e.isComposing || t.includes("Composition")) return;
  e.preventDefault();
  if (t === "insertText") {
    const d = e.data || "";
    if (Date.now() - lastComp.t < 80 && d === lastComp.d) return;
    event([0, "i", d, 0]);
  } else if (t === "insertLineBreak" || t === "insertParagraph") event([0, "i", "\n", 0]);
  else if (t === "deleteContentBackward") event([0, "b"]);
  else if (t.startsWith("delete") && t.endsWith("Backward")) event([0, "w"]);
  else if (t.startsWith("insertFrom")) pasted();
});
ta.addEventListener("compositionstart", () => {
  composing = true;
  // 程式題的字串裡可能有中文：下一個要打的字是中文就不提醒
  const next = R && R.ty.text[R.ty.typed.length] || "";
  const wantCJK = /[\u3000-\u9fff\uff00-\uffef]/.test(next);
  if (S.cat !== "zh" && R && !R.ended && !wantCJK) { if (!R.ime) toast("輸入法在中文模式，請切到英數"); R.ime++; }
});
ta.addEventListener("compositionupdate", (e) => { comp.textContent = e.data || ""; });
ta.addEventListener("compositionend", (e) => {
  composing = false; comp.textContent = "";
  const d = e.data || ""; lastComp = { t: Date.now(), d };
  setTimeout(() => { ta.value = ""; }, 0);
  if (d) event([0, "i", d, 1]);
});
ta.addEventListener("input", () => { if (!composing) ta.value = ""; });
ta.addEventListener("paste", (e) => { e.preventDefault(); pasted(); });
ta.addEventListener("drop", (e) => { e.preventDefault(); pasted(); });
["copy", "cut", "contextmenu", "dragstart"].forEach((ev) => box.addEventListener(ev, (e) => e.preventDefault()));
ta.addEventListener("focus", () => box.classList.add("on"));
ta.addEventListener("blur", () => box.classList.remove("on"));
box.addEventListener("mousedown", (e) => { e.preventDefault(); if (!R.ended) ta.focus({ preventScroll: true }); });
box.addEventListener("touchend", () => { if (!R.ended) ta.focus({ preventScroll: true }); });

/* ---------- 設定 ---------- */
function syncSeg() { document.querySelectorAll(".opts .seg").forEach((g) => g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", S[g.dataset.k] === b.dataset.v))); }
document.querySelectorAll(".opts .seg").forEach((g) => g.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || S[g.dataset.k] === b.dataset.v) return;
  S[g.dataset.k] = b.dataset.v; store.set("mt-settings", S); syncSeg(); syncUnit();
  if (g.dataset.k === "rule" && R && !R.ty.started) { R.ty.rule = S.rule; ta.focus(); return; }
  newRun(); loadBoard();
}));
addEventListener("resize", () => { if (R) { paint(); updLive(); } });
addEventListener("pagehide", () => { abandon(); flushLearn(); });

/* 單元（程式題才有） */
const unitSel = $("#unit");
function syncUnit() {
  const show = isCode();
  unitSel.closest(".grp").hidden = !show;
  if (!show) return;
  const units = CODE_UNITS[S.cat];
  if (S.unit && !units.includes(S.unit)) S.unit = "";
  unitSel.innerHTML = `<option value="">全部單元</option>` + units.map((u) => `<option${u === S.unit ? " selected" : ""}>${u}</option>`).join("");
}
unitSel.addEventListener("change", () => { S.unit = unitSel.value; store.set("mt-settings", S); newRun(); });

/* ---------- 同意說明 ---------- */
function showConsent() { $("#consent").hidden = false; $("#cYes").focus(); }
$("#cYes").onclick = () => {
  const first = consent !== true;
  consent = true; store.set(CONSENT_KEY, true); ensureCid();
  $("#consent").hidden = true; ta.focus();
  if (first) visit();
};
$("#cNo").onclick = () => { consent = false; store.set(CONSENT_KEY, false); $("#consent").hidden = true; ta.focus(); };
$("#showConsent").onclick = showConsent;
function visit() { if (consent === true) post("/api/visit", { cid: CID, sid: SID, device, sw: screen.width, sh: screen.height }); }

/* ---------- 新版本提示 ---------- */
async function checkVersion() {
  if (!online) return;
  try {
    const v = await (await fetch("/version", { cache: "no-store" })).json();
    if (v.version && v.version !== VERSION && VERSION !== "dev") {
      const busy = R && R.ty.started && !R.ended;
      if (document.hidden && !busy) location.reload();
      else $("#newver").hidden = false;
    }
  } catch {}
}
$("#newver").onclick = () => location.reload();
setInterval(checkVersion, 60000);

/* ---------- 開始 ---------- */
syncSeg(); syncUnit(); newRun(); loadBoard();
if (consent === null && online) showConsent(); else visit();
