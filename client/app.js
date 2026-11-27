// 喵打：前端
import { BANK, CAT_NAME, LEN_NAME, CODE_UNITS, randomSpec, textOf } from "/shared/bank.js";
import { learnCard } from "/learn.js";
import { ME, loadMe, onLogin, loginHint, nickField, bannedNote, askLogin } from "/account.js";
import { catSVG, dressedSVG } from "/cat.js";
import { TypeBox } from "/typebox.js";
import { shareCard, bindShare, drawResultImage, setText } from "/share.js";
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
let R = null, raf = 0, lastSpec = null;

/* ---------- 像素貓 ---------- */
const SV = [[catSVG(0, 0), catSVG(1, 0)], [catSVG(0, 1), catSVG(1, 1)]];
const me = $("#me"), gh = $("#ghost");
/** 登入的人：跑道上的貓穿上冒險模式的裝扮 */
async function loadOutfit() {
  if (!ME.user) { SV[0] = [catSVG(0, 0), catSVG(1, 0)]; me.classList.remove("dressed"); me._f = -1; setCat(me, 0, 0); return; }
  try {
    const q = await (await fetch("/api/quest", { cache: "no-store" })).json();
    if (!q.outfit) return;
    SV[0] = [dressedSVG(0, q.outfit), dressedSVG(1, q.outfit)];
    me.classList.add("dressed"); me._f = -1; setCat(me, 0, 0);
  } catch {}
}
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
  R = { ty: null, specs: spec ? [spec] : [], spec0: spec, start: 0, ended: false, endT: 0, pastes: 0, ime: 0, drill: !!drill, text0: text, pb: drill ? null : store.get(pbKey(), null), rival: drill ? null : rival };
  // 灰貓：挑戰對手的速度，沒有的話用這台電腦的最佳紀錄。速度換算成每分鐘打對幾個字元（WPM × 5）
  // 從分享連結挑戰：1 分鐘模式照對方的題目順序出
  R.queue = R.rival?.specs && spec && JSON.stringify(spec) === JSON.stringify(R.rival.specs[0]) ? R.rival.specs.slice(1).map((x) => ({ ...x })) : [];
  R.ghost = R.rival ? { cpm: R.rival.c === "zh" ? R.rival.speed : R.rival.speed * 5 } : R.pb;
  if (R.ghost && !R.ghost.chars) R.ghost.chars = R.ghost.cpm;
  R.ty = new Typist(S.rule, chunkDone);
  R.ty.setText(text);
  build(); paint(); updLive();
  placeCat(me, 0); placeCat(gh, 0); gh.style.display = R.ghost ? "" : "none";
  gh.querySelector("span").textContent = R.rival ? (R.rival.me ? "你的紀錄" : R.rival.name) : "最佳紀錄";
  rivalBar();
  $("#res").hidden = true; box.classList.remove("end");
  const cjk = isCode() && /[\u3000-\u9fff\uff00-\uffef]/.test(text);
  $("#hint").textContent = (isCode() ? "Tab 縮排（補到 4 的倍數）・" : "") + "Esc 重來同一題・不能貼上" + (S.cat === "zh" ? "・用注音或其他中文輸入法打" : "") + (cjk ? "・字串裡的中文要切回中文輸入法，打完再切回英數" : "");
  ta.value = ""; ta.focus({ preventScroll: true });
}
const TB = TypeBox({ box, txt, ta, comp }, {
  ty: () => R && R.ty, active: () => !!R && !R.ended, started: () => !!R && !!R.start,
  isCode, cat: () => S.cat, rule: () => S.rule, event, pasted,
  escape: () => newRun(R.text0, R.drill, R.spec0),
  ime: () => { if (!R.ime) toast("輸入法在中文模式，請切到英數"); R.ime++; },
});
const build = () => TB.build(), paint = () => TB.paint();
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
    const spec = R.queue.length ? R.queue.shift() : randomSpec(S.cat, S.len, lastSpec, Math.random, isCode() ? S.unit : ""); lastSpec = spec; R.specs.push(spec);
    ty.setText(textOf(spec)); build();
    return;
  }
  queueMicrotask(() => finish(R.endT));
}

/* ---------- 計時與即時數字 ---------- */
const elapsed = () => (R.start ? (R.ended ? R.ms : now() - R.start) : 0);
function goal() {
  if (timed()) return Math.max(R.ghost ? R.ghost.chars * 1.1 : S.cat === "zh" ? 50 : 180, R.ty.totalCorrect() + 1);
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
  if (R.ghost) placeCat(gh, timed() ? ((ms / 60000) * R.ghost.chars) / goal() : (R.ghost.cpm * ms) / 60000 / R.ty.text.length);
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
  const NF1 = nickField("nick", store.get("mt-nick", "")), NF2 = nickField("snick", store.get("mt-nick", ""));
  const chip = (l, n) => `<span class="${n ? "hot" : ""}">${l} ${n}</span>`;
  const mx = Math.max(1, ...A.seg);
  const canBoard = !R.drill && A.acc >= 0.9 && A.correct >= 20 && online;
  $("#res").innerHTML = `<div class="res">
   <h2>${R.drill ? "弱點練習結果" : "這次的成績"} ${isPB ? '<span class="pb">新紀錄</span>' : ""}</h2>
   ${R.rival ? `<p class="vs ${sp > R.rival.speed ? "win" : ""}">${sp > R.rival.speed ? `${R.rival.me ? "你超越了自己的紀錄" : `你贏了 ${esc(R.rival.name)}`}！（${Math.round(sp)} 比 ${Math.round(R.rival.speed)}）`
      : `還差 ${Math.max(1, Math.ceil(R.rival.speed - sp))} ${unitOf(S.cat)} 就追上${R.rival.me ? "自己的紀錄" : ` ${esc(R.rival.name)}`}，再試一次！`}</p>` : ""}
   <div class="big"><div><small>速度（${unitOf(S.cat)}）</small><strong>${Math.round(sp)}</strong></div>
    <div class="s"><small>正確率</small><strong>${Math.round(A.acc * 100)}%</strong></div>
    <div class="s"><small>時間</small><strong>${(ms / 1000).toFixed(1)} 秒</strong></div>
    <div class="s"><small>打對的字</small><strong>${A.correct}</strong></div>
    ${S.cat !== "zh" ? `<div class="s"><small>字元／分</small><strong>${Math.round(cpm)}</strong></div>` : ""}</div>
   ${canBoard ? (NF1.banned ? bannedNote() : `<form class="submit" id="sub"><label for="nick"><b>上排行榜</b></label>${NF1.html}<button class="main" type="submit">送出成績</button><p id="subMsg">${CAT_NAME[S.cat]}・${LEN_NAME[S.len]}・${S.mode === "t60" ? "1 分鐘" : "打完一題"}，每人只留最好的一次。</p>${NF1.note}${loginHint()}</form>`)
      : !R.drill && online ? `<div class="submit"><p>正確率 90% 以上、打對 20 個字以上才能上排行榜。</p></div>` : ""}
   ${shareCard(!R.drill && online ? (A.acc >= 0.8 && A.correct >= 10 ? (NF2.banned ? { can: false, reason: "你的帳號已被停權，不能分享。有問題請找老師。" } : { can: true, field: NF2, hint: loginHint() }) : { can: false, reason: "正確率 80% 以上、打對 10 個字以上，就能產生挑戰連結分享給朋友。" }) : { can: false, reason: R.drill ? "弱點練習不能分享，打一般題目再來炫耀吧。" : "要連上伺服器才能分享。" })}
   ${L ? L.html : ""}
   <div class="cols"><div><h3>建議</h3><ul class="tips">${T.map(([b, t]) => `<li><b>${b}</b>${t}</li>`).join("") || "<li><b>很穩</b>這次沒有明顯的問題。</li>"}</ul></div>
   <div><h3>錯誤分類</h3><div class="chips">${chip("全形半形", c.width.length)}${isCode() ? chip("縮排", c.indent.length) + chip("大小寫", c.kase.length) : ""}${S.cat === "cpp" ? chip("分號", c.semi.length) : ""}${isCode() ? chip("Enter", c.enter.length) : ""}${chip("其他", c.other.length)}</div>
   ${S.cat !== "zh" ? "<h3>哪些鍵打錯</h3>" + kbHTML(A) : ""}
   <h3>速度變化</h3><div class="curve">${A.seg.map((v) => `<i style="height:${(v / mx) * 100}%" title="${Math.round(v)}"></i>`).join("")}</div><div class="cl"><span>開始</span><span>結束</span></div>
   ${A.pauses.length ? `<h3 style="margin-top:16px">停最久的地方</h3><ol class="pz">${A.pauses.map((k) => `<li><code>${esc(show(k.exp))}</code> 前停了 ${(k.gap / 1000).toFixed(1)} 秒</li>`).join("")}</ol>` : ""}</div></div>
   <div class="btns"><button class="main" id="bAgain" type="button">同一題再一次</button><button id="bNew" type="button">換一題</button>${A.E.length ? '<button id="bDrill" type="button">針對弱點練習</button>' : ""}</div></div>`;
  $("#res").hidden = false;
  const won = R.rival && sp > R.rival.speed;
  if (R.rival?.share && !R.rival.reported) { R.rival.reported = true; post(`/api/share/${R.rival.share}/${won ? "win" : "lose"}`, {}); }
  bindShare($("#res"), {
    toast,
    create: (name) => { store.set("mt-nick", name); if (ME.user && !ME.user.nick) { ME.user.nick = name; syncNickFields(); } return post("/api/share", { cid: ensureCid(), name, c: S.cat, l: S.len, m: S.mode, rule: S.rule, specs: R.specs.slice(), events: R.ty.events.slice(), ms: Math.round(ms), speed: sp }); },
    imageData: { c: S.cat, l: S.len, m: S.mode, rule: S.rule, speed: sp, acc: A.acc, ms, correct: A.correct, ts: Date.now(), beat: won && !R.rival.me ? R.rival.name : null },
  });
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
    if (ME.user && !ME.user.nick) { ME.user.nick = name; syncNickFields(); }
    msg.className = "msg";
    msg.textContent = r.flagged ? "收到了，但這次的打字節奏不太像人打的，先不放上排行榜。" : r.rank ? `上榜了！今天第 ${r.rank} 名。` : "收到了，但沒有比你之前的成績好，排行榜留最好的那次。";
    loadBoard();
  };
  $("#res").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
// 隨機編號：排行榜用它做「每人只留最好的一次」；只有同意之後才會跟著練習數據送出
function ensureCid() { if (!CID) { CID = rid(); store.set("mt-cid", CID); } return CID; }

/** 帳號已有暱稱：結算畫面兩個暱稱欄都換成帳號暱稱並鎖住 */
function syncNickFields() {
  if (!ME.user?.nick) return;
  for (const id of ["#nick", "#snick"]) { const el = $(id); if (el) { el.value = ME.user.nick; el.readOnly = true; } }
  document.querySelectorAll(".nickrule").forEach((p) => { p.innerHTML = '這是你的帳號暱稱，要改請到<a href="/me">我的紀錄</a>。暱稱不可以有不雅字眼，發現會被管理員停權。'; });
}

/* ---------- 排行榜 ---------- */
let per = store.get("mt-board-per", "day");
let scope = store.get("mt-board-scope", "mine"); // mine＝目前的設定；all＝所有排行
const RN = { block: "擋下", back: "倒退修", free: "帶錯" };
const setName = (c, l, m) => `${CAT_NAME[c]}・${LEN_NAME[l]}・${m === "t60" ? "1 分鐘" : "打完一題"}`;
let boardRows = []; // 給「挑戰他」按鈕用
function boardTable(rows, c, l, m) {
  return `<table class="lb"><thead><tr><th>名次</th><th>暱稱</th><th class="n">速度（${unitOf(c)}）</th><th class="n">正確率</th><th>打錯時</th><th><span class="sr">挑戰</span></th></tr></thead><tbody>${rows.map((r, i) => {
    const k = boardRows.push({ ...r, c, l, m }) - 1;
    return `<tr class="${r.me ? "me" : ""}"><td class="rk">${i + 1}</td><td>${esc(r.name)}${r.login ? ' <span class="okb" title="已用 Google 登入">✓</span>' : ""}${r.me ? "（你）" : ""}</td><td class="n">${Math.round(r.speed)}</td><td class="n">${Math.round(r.acc * 100)}%</td><td>${RN[r.rule] || ""}</td>`
      + `<td class="ch"><button type="button" class="chal" data-k="${k}">${r.me ? "挑戰自己" : "挑戰他"}</button></td></tr>`;
  }).join("")}</tbody></table>`;
}
async function loadBoard() {
  document.querySelectorAll("#bper button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === per));
  document.querySelectorAll("#bscope button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === scope));
  $("#bset").textContent = scope === "all" ? "每種設定的前 5 名" : `${setName(S.cat, S.len, S.mode)}（${unitOf(S.cat)}）`;
  if (!online) { $("#blist").innerHTML = '<p class="empty">要連上伺服器才看得到排行榜。</p>'; return; }
  boardRows = [];
  try {
    if (scope === "all") {
      const groups = await (await fetch("/api/boards?" + new URLSearchParams({ p: per, me: CID || "" }))).json();
      if (!Array.isArray(groups)) throw 0;
      $("#blist").innerHTML = groups.length ? groups.map((g) => `<h3 class="bg">${setName(g.c, g.l, g.m)}</h3>${boardTable(g.rows, g.c, g.l, g.m)}`).join("")
        : '<p class="empty">這段時間還沒有人上榜。</p>';
    } else {
      const rows = await (await fetch("/api/board?" + new URLSearchParams({ c: S.cat, l: S.len, m: S.mode, p: per, me: CID || "" }))).json();
      if (!Array.isArray(rows)) throw 0;
      $("#blist").innerHTML = rows.length ? boardTable(rows, S.cat, S.len, S.mode) : '<p class="empty">還沒有人上榜，第一名就是你的。</p>';
    }
  } catch { $("#blist").innerHTML = '<p class="empty">排行榜暫時讀不到。</p>'; }
}
$("#bper").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; per = b.dataset.v; store.set("mt-board-per", per); loadBoard(); });
$("#bscope").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; scope = b.dataset.v; store.set("mt-board-scope", scope); loadBoard(); });
$("#blist").addEventListener("click", (e) => {
  const b = e.target.closest(".chal"); if (!b) return;
  const r = boardRows[+b.dataset.k]; if (!r) return;
  challenge(r);
});

/* ---------- 挑戰：用跟對方一樣的設定打，跑道上的灰貓換成對方的速度 ---------- */
let rival = null; // { name, speed, c, l, m, rule }
function challenge(r) {
  Object.assign(S, { cat: r.c, len: r.l, mode: r.m, rule: r.rule, unit: "" });
  store.set("mt-settings", S); syncSeg(); syncUnit();
  // 有存題目就打對方那一題（1 分鐘模式照對方的題目順序）；舊成績沒存題目就隨機出
  const specs = Array.isArray(r.specs) && r.specs.length && r.specs.every((x) => x && x.c === r.c && x.l === r.l && textOf(x)) ? r.specs : null;
  rival = { name: r.name, speed: r.speed, me: r.me, c: r.c, l: r.l, m: r.m, specs };
  if (specs) newRun(null, false, { ...specs[0] }); else newRun();
  loadBoard();
  scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function rivalBar() {
  const bar = $("#rival");
  if (!rival) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.querySelector("span").textContent = `${rival.me ? "挑戰自己的紀錄" : `挑戰 ${rival.name}`}：${Math.round(rival.speed)} ${unitOf(rival.c)}・${setName(rival.c, rival.l, rival.m)}・打錯時${RN[S.rule]}`;
}
$("#rivalOff").addEventListener("click", () => { rival = null; newRun(); });

/* ---------- 輸入事件 ---------- */
let tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1800); }
function pasted() { if (R && !R.ended) R.pastes++; toast("這裡不能貼上，要自己打喔"); }
/* ---------- 設定 ---------- */
function syncSeg() { document.querySelectorAll(".opts .seg").forEach((g) => g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", S[g.dataset.k] === b.dataset.v))); }
document.querySelectorAll(".opts .seg").forEach((g) => g.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || S[g.dataset.k] === b.dataset.v) return;
  S[g.dataset.k] = b.dataset.v; store.set("mt-settings", S); syncSeg(); syncUnit();
  rival = null;
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
unitSel.addEventListener("change", () => { S.unit = unitSel.value; store.set("mt-settings", S); rival = null; newRun(); });

/* ---------- 同意說明 ---------- */
function showConsent() { $("#consent").hidden = false; $("#cYes").focus(); }
$("#cYes").onclick = () => {
  const first = consent !== true;
  consent = true; store.set(CONSENT_KEY, true); ensureCid();
  $("#consent").hidden = true; ta.focus();
  if (first) visit();
  openChallenge(); if (!shareId) askLogin();
};
$("#cNo").onclick = () => { consent = false; store.set(CONSENT_KEY, false); $("#consent").hidden = true; ta.focus(); openChallenge(); if (!shareId) askLogin(); };

/* ---------- 打開別人分享的挑戰連結（/c/xxxxxxxx） ---------- */
const shareId = /^\/c\/([0-9A-Za-z]{8})$/.exec(location.pathname)?.[1] || "";
let chalOpened = false;
async function openChallenge() {
  if (!shareId || chalOpened) return;
  chalOpened = true;
  let sh = null;
  try { const r = await fetch("/api/share/" + shareId); sh = r.ok ? await r.json() : null; } catch {}
  const box = $("#chal");
  if (!sh) {
    $("#chalBody").innerHTML = '<p>找不到這個挑戰，可能連結打錯了。直接開始練習吧！</p>';
    $("#chalGo").hidden = true; box.hidden = false; $("#chalNo").focus(); return;
  }
  $("#chalTitle").textContent = `${sh.name} 向你挑戰！`;
  $("#chalBody").innerHTML = `<p>${esc(sh.name)} 在「${setText(sh)}」打出 <b>${Math.round(sh.speed)} ${unitOf(sh.c)}</b>，正確率 ${Math.round(sh.acc * 100)}%。接受挑戰就會打同一題，跑道上的灰貓用 ${esc(sh.name)} 的速度跑。</p><img id="chalImg" alt="${esc(sh.name)} 的成績圖片">`;
  box.hidden = false; $("#chalGo").focus();
  drawResultImage({ ...sh, url: null }).then((b) => { const img = $("#chalImg"); if (img) img.src = URL.createObjectURL(b); });
  $("#chalGo").onclick = () => {
    box.hidden = true;
    post(`/api/share/${sh.id}/accept`, {});
    Object.assign(S, { cat: sh.c, len: sh.l, mode: sh.m, rule: sh.rule, unit: "" });
    store.set("mt-settings", S); syncSeg(); syncUnit();
    rival = { name: sh.name, speed: sh.speed, c: sh.c, l: sh.l, m: sh.m, share: sh.id, specs: sh.specs };
    newRun(null, false, { ...sh.specs[0] }); loadBoard();
  };
}
$("#chalNo").onclick = () => { $("#chal").hidden = true; ta.focus(); };
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
loadMe().then(() => { loadBoard(); loadOutfit(); if (consent !== null && !shareId) askLogin(); });
// 登入或登出後：排行榜的「你」要重新判斷，結算畫面的登入提示拿掉、暱稱帶入
onLogin(() => {
  loadBoard(); loadOutfit();
  document.querySelectorAll(".loginhint").forEach((x) => x.remove());
  syncNickFields();
  if (ME.user) toast("登入了！之後的練習會記在「我的紀錄」");
});
if (consent === null && online) showConsent(); else { visit(); openChallenge(); }
window.__mtReady = true;
