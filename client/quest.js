// 喵打冒險模式：地圖、戰鬥、結算、換裝
import { ISLANDS, LEVELS, starsOf, unlocked, STAR_RULE, FISH, learnItem } from "/shared/quest.js";
import { ITEMS, ITEM, SLOTS, DEFAULT_OUTFIT } from "/shared/items.js";
import { BANK } from "/shared/bank.js";
import { Typist, summarize } from "/shared/judge.js";
import { esc } from "/shared/analyze.js";
import { ME, loadMe, onLogin, login } from "/account.js";
import { drawDressed } from "/cat.js";
import { Battle } from "/battle.js";
import { TypeBox } from "/typebox.js";
import { learnCard } from "/learn.js";

const $ = (s) => document.querySelector(s);
const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const online = /^https?:$/.test(location.protocol);
async function api(path, body) {
  try {
    const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    return r.ok ? j : { error: j.error || "連不上伺服器，等一下再試" };
  } catch { return { error: "連不上伺服器，等一下再試" }; }
}
let tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2200); }
const rule = () => { const r = store.get("mt-settings", {}).rule; return ["block", "back", "free"].includes(r) ? r : "back"; };

/* ---------- 進度：登入的人存在伺服器；沒登入只能玩第 1 章，星星存在這台電腦 ---------- */
const ST = { login: false, fish: 0, stars: {}, best: {}, owned: [], outfit: { ...DEFAULT_OUTFIT } };
const LOCAL = "mt-adv-local";
async function loadState() {
  const s = online ? await api("/api/quest") : { login: false };
  if (s.login) Object.assign(ST, s);
  else Object.assign(ST, { login: false, fish: 0, stars: store.get(LOCAL, {}), best: {}, owned: [], outfit: { ...DEFAULT_OUTFIT } });
  $("#fish").hidden = !ST.login;
  $("#fish").textContent = `🐟 ${ST.fish}`;
}
const starsTxt = (n, max = 3) => "★".repeat(n) + "☆".repeat(max - n);

/* ---------- 地圖 ---------- */
let island = store.get("mt-adv-island", "cpp");
function renderMap() {
  show("map");
  $("#islands").innerHTML = ISLANDS.map((is) => `<button type="button" data-v="${is.id}" aria-pressed="${is.id === island}"${is.open ? "" : ' class="soon"'}>${esc(is.name)}${is.open ? "" : "（準備中）"}</button>`).join("");
  const is = ISLANDS.find((x) => x.id === island);
  $("#mapHint").innerHTML = !is.open ? "這座島還在蓋，先到 C++ 島冒險吧！"
    : `${STAR_RULE}。${ST.login ? "" : `<b>沒登入只能玩第 1 章，也拿不到小魚乾和裝扮。</b><button type="button" class="link" id="mapLogin">用 Google 登入</button>`}`;
  $("#mapLogin")?.addEventListener("click", login);
  $("#chapters").innerHTML = is.chapters.map((ch) => {
    const need = ch.login && !ST.login;
    return `<div class="chap"><h3>${esc(ch.name)}${need ? '<span class="lock">要登入</span>' : ""}</h3><ol class="lvls">${ch.levels.map((lv) => {
      const s = ST.stars[lv.id] || 0, open = !need && unlocked(lv, ST.stars);
      return `<li><button type="button" class="lvl${lv.big ? " big" : ""}${s ? " done" : ""}" data-lv="${lv.id}"${open ? "" : " disabled"}>
        <span class="lvn">${lv.chapter.split("-")[1]}-${lv.index + 1}</span><span class="lvt">${esc(lv.name)}</span>
        <span class="lvs" aria-label="${s} 顆星">${open ? starsTxt(s) : "🔒"}</span>${lv.drop ? `<span class="lvd">掉落：${esc(ITEM.get(lv.drop).name)}</span>` : ""}</button></li>`;
    }).join("")}</ol></div>`;
  }).join("");
}
$("#islands").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  island = b.dataset.v; store.set("mt-adv-island", island); renderMap();
});
$("#chapters").addEventListener("click", (e) => { const b = e.target.closest("[data-lv]"); if (b && !b.disabled) play(LEVELS.get(b.dataset.lv)); });
function show(id) { for (const s of ["map", "play", "closet"]) $("#" + s).hidden = s !== id; }

/* ---------- 戰鬥 ---------- */
const battle = new Battle($("#arena"));
let R = null, raf = 0;
const now = () => performance.now();
const TB = TypeBox({ box: $("#box"), txt: $("#txt"), ta: $("#ta"), comp: $("#comp") }, {
  ty: () => R && R.ty, active: () => !!R && !R.ended, started: () => !!R && !!R.start,
  isCode: () => R && (R.lv.lang === "cpp" || R.lv.lang === "py"), cat: () => (R ? R.lv.lang : "cpp"), rule: () => R.rule,
  event, pasted: () => toast("這裡不能貼上，要自己打喔"),
  escape: () => play(R.lv),
  ime: () => { if (!R.ime) toast("輸入法在中文模式，請切到英數"); R.ime = (R.ime || 0) + 1; },
});

function play(lv) {
  cancelAnimationFrame(raf);
  show("play");
  R = { lv, rule: rule(), ty: null, part: 0, start: 0, ended: false, endT: 0, lastC: 0, pend: 0, combo: 0 };
  R.ty = new Typist(R.rule, (ty) => {
    if (R.part + 1 < lv.texts.length) { R.part++; ty.setText(lv.texts[R.part]); TB.build(); return; }
    queueMicrotask(finish);
  });
  R.ty.setText(lv.texts[0]);
  $("#lvName").textContent = `${lv.chapter.split("-")[1]}-${lv.index + 1}　${lv.name}`;
  $("#lg").textContent = `${lv.target}`;
  battle.reset({ boss: lv.boss, hp: lv.texts.reduce((a, t) => a + t.length, 0), outfit: ST.outfit, big: lv.big });
  $("#res").hidden = true; $("#box").classList.remove("end");
  TB.build(); TB.paint(); live();
  frame();
  TB.focus();
  scrollTo({ top: 0 });
}
function frame() {
  raf = requestAnimationFrame(() => {
    if (!R) return;
    battle.combo = R.combo;
    battle.draw(now());
    if (R.start && !R.ended) live();
    if (!R.ended || now() - R.endedAt < 1500) frame();
  });
}
function event(ev) {
  if (!R || R.ended) return;
  const t0 = now();
  if (!R.start) R.start = t0;
  ev[0] = Math.round(t0 - R.start); R.endT = ev[0];
  const r = R.ty.apply(ev);
  if (r.rejected) toast("一次湧進太多字，已擋下");
  battle.key(t0);
  const c = R.ty.totalCorrect(), d = Math.max(0, c - R.lastC);
  R.lastC = Math.max(R.lastC, c);
  if (r.trip) { R.combo = 0; battle.miss(t0); }
  else if (d) {
    const before = R.combo; R.combo += d; R.pend += d;
    const crit = Math.floor(R.combo / 25) > Math.floor(before / 25);
    const nl = ev[1] === "i" && ev[2].includes("\n");
    if (R.pend >= 8 || nl || crit) { battle.damage(t0, d, R.pend, crit); R.pend = 0; }
    else battle.damage(t0, d, 0, false);
  }
  if (!R.ended) { TB.paint(); }
}
function live() {
  const ms = R.ended ? R.endT : R.start ? now() - R.start : 0;
  const s = summarize(R.ty, R.lv.lang, Math.max(1, ms));
  $("#ls").textContent = R.start ? Math.round(s.speed) : 0;
  $("#la").textContent = s.keys ? Math.round(s.acc * 100) + "%" : "100%";
  $("#lt").textContent = (ms / 1000).toFixed(1);
}

async function finish() {
  if (R.ended) return;
  const lv = R.lv;
  R.ended = true; R.endedAt = now(); $("#ta").blur(); $("#box").classList.add("end");
  if (R.pend) battle.damage(now(), 0, R.pend, false);
  live(); TB.paint();
  const sum = summarize(R.ty, lv.lang, Math.max(1, R.endT));
  const local = starsOf(lv, sum);
  if (local > 0) battle.win(now() + 300);
  const prev = ST.stars[lv.id] || 0;
  let out = { stars: local, fish: 0, drops: [], flagged: false };
  $("#res").innerHTML = `<div class="res"><h2>結算中…</h2></div>`; $("#res").hidden = false;
  if (online) {
    const r = await api("/api/quest/clear", { level: lv.id, rule: R.rule, events: R.ty.events.slice() });
    if (r.error) out.error = r.error; else out = r;
  }
  if (ST.login && !out.error) { ST.stars[lv.id] = Math.max(prev, out.stars); if (typeof out.total === "number") ST.fish = out.total; out.drops.forEach((d) => ST.owned.push(d)); $("#fish").textContent = `🐟 ${ST.fish}`; }
  if (!ST.login && out.stars > prev) { ST.stars[lv.id] = out.stars; store.set(LOCAL, ST.stars); }
  renderResult(lv, sum, out, prev);
}

function nextLevel(lv) {
  for (const is of ISLANDS) for (const ch of is.chapters) { const k = ch.levels.indexOf(lv); if (k >= 0) return ch.levels[k + 1] || is.chapters[is.chapters.indexOf(ch) + 1]?.levels[0] || null; }
  return null;
}
function renderResult(lv, sum, out, prev) {
  const s = out.stars, nx = nextLevel(lv);
  const canNext = nx && s > 0 && (!nx.login || ST.login);
  const it = learnItem(lv), spec = it ? { c: lv.lang, l: it.len, i: [BANK[lv.lang][it.len].indexOf(it)] } : null;
  const L = spec ? learnCard(spec, lv.lang, it.len) : null;
  const why = s === 0 ? (out.flagged ? "這次的打字節奏不太像人打的，不算過關。" : "正確率要 85% 以上才算打倒怪物，再試一次！")
    : s === 1 ? "正確率 95% 以上就有第 2 顆星。" : s === 2 ? `速度到 ${lv.target} WPM 就有第 3 顆星。` : "三顆星全拿！";
  $("#res").innerHTML = `<div class="res questres">
    <h2>${s ? `打倒${esc(lv.boss.name)}！` : `${esc(lv.boss.name)}還站著…`}</h2>
    <p class="bigstars" aria-label="${s} 顆星">${starsTxt(s)}</p><p>${why}${s > prev && prev ? `（原本 ${prev} 顆）` : ""}</p>
    <div class="big"><div><small>速度（WPM）</small><strong>${Math.round(sum.speed)}</strong></div>
      <div class="s"><small>正確率</small><strong>${Math.round(sum.acc * 100)}%</strong></div>
      <div class="s"><small>時間</small><strong>${(sum.ms / 1000).toFixed(1)} 秒</strong></div></div>
    ${out.error ? `<p class="nickrule">${esc(out.error)}</p>` : ""}
    ${ST.login ? (out.fish ? `<p class="gain">🐟 +${out.fish} 小魚乾（現在 ${ST.fish} 條）</p>` : s && s <= prev ? `<p class="hint">重打已經拿過的星星：每次 ${FISH.replay} 條小魚乾，每天最多 ${FISH.replayPerDay} 次。</p>` : "")
      : `<p class="loginhint"><button type="button" class="link dologin">用 Google 登入</button>就能拿小魚乾、換裝，進度也會存起來（第 2 章以後要登入）。</p>`}
    ${out.drops?.length ? `<div class="drop"><canvas id="dropCv" width="160" height="140"></canvas><p>獲得裝扮：<b>${esc(ITEM.get(out.drops[0]).name)}</b>！到「換裝」穿上它。</p></div>` : ""}
    ${L ? L.html : ""}
    <div class="btns">${canNext ? '<button class="main" id="bNext" type="button">下一關</button>' : ""}<button${canNext ? "" : ' class="main"'} id="bAgain" type="button">再打一次</button><button id="bMap" type="button">回地圖</button></div></div>`;
  if (out.drops?.length) { const c = $("#dropCv").getContext("2d"); c.imageSmoothingEnabled = false; drawDressed(c, 8, 0, 9, 0, { ...ST.outfit, [ITEM.get(out.drops[0]).slot]: out.drops[0] }); }
  if (L) L.bind($("#res"), { answered: 0, correct: 0, skipped: 0, opened: 0, onAnswer: (ok) => ok && toast("答對了！") });
  $("#bAgain").onclick = () => play(lv);
  $("#bMap").onclick = renderMap;
  if (canNext) $("#bNext").onclick = () => play(nx);
  $("#res").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
$("#back").onclick = () => { R = null; cancelAnimationFrame(raf); renderMap(); };

/* ---------- 換裝與圖鑑 ---------- */
function bossOf(levelId) { const lv = LEVELS.get(levelId); return lv ? `${lv.chapter.split("-")[1]}-${lv.index + 1} ${lv.boss.name}` : ""; }
function renderCloset() {
  show("closet");
  const own = new Set([...ST.owned, ...ITEMS.filter((x) => x.price === 0).map((x) => x.id)]);
  const pv = $("#preview").getContext("2d"); pv.imageSmoothingEnabled = false; pv.clearRect(0, 0, 224, 196);
  drawDressed(pv, 0, 0, 14, 0, ST.outfit);
  $("#closetHint").innerHTML = ST.login ? `🐟 ${ST.fish} 條小魚乾。打倒 Boss 會掉落特別的裝扮，小魚乾可以買其他的。`
    : `<button type="button" class="link dologin">用 Google 登入</button>才能收集和換裝。`;
  $("#slots").innerHTML = SLOTS.map(([slot, name]) => `<h3>${name}</h3><div class="items">${ITEMS.filter((x) => x.slot === slot).map((it) => {
    const has = own.has(it.id), on = ST.outfit[slot] === it.id;
    const act = !ST.login ? "" : has ? (on ? (slot === "fur" ? '<span class="on">穿著</span>' : `<button type="button" data-off="${slot}">脫下</button>`) : `<button type="button" class="main" data-wear="${it.id}">穿上</button>`)
      : it.price ? `<button type="button" data-buy="${it.id}"${ST.fish < it.price ? " disabled" : ""}>🐟 ${it.price} 買</button>` : "";
    return `<div class="item${has ? "" : " no"}${on ? " worn" : ""}"><canvas width="96" height="84" data-it="${it.id}" data-has="${has ? 1 : 0}"></canvas><b>${esc(it.name)}</b>
      <small>${has ? "已擁有" : it.from ? `打倒 ${esc(bossOf(it.from))} 取得` : `🐟 ${it.price}`}</small>${act}</div>`;
  }).join("")}</div>`).join("");
  document.querySelectorAll("#slots canvas").forEach((cv) => {
    const it = ITEM.get(cv.dataset.it), c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
    const o = it.slot === "fur" ? { fur: it.id } : { fur: ST.outfit.fur, [it.slot]: it.id };
    drawDressed(c, 0, 0, 6, 0, o, cv.dataset.has === "1" || it.price ? {} : { tint: "#8a7d70" });
  });
}
$("#slots").addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.buy) {
    const it = ITEM.get(b.dataset.buy);
    if (!confirm(`用 ${it.price} 條小魚乾買「${it.name}」？`)) return;
    const r = await api("/api/quest/buy", { item: it.id });
    if (r.error) return toast(r.error);
    Object.assign(ST, r); $("#fish").textContent = `🐟 ${ST.fish}`; toast(`買到了「${it.name}」！`);
    return renderCloset();
  }
  const o = { ...ST.outfit };
  if (b.dataset.wear) o[ITEM.get(b.dataset.wear).slot] = b.dataset.wear;
  else if (b.dataset.off) delete o[b.dataset.off];
  else return;
  const r = await api("/api/quest/wear", { outfit: o });
  if (r.error) return toast(r.error);
  ST.outfit = r.outfit; renderCloset();
});
$("#goCloset").onclick = renderCloset;
$("#back2").onclick = renderMap;
addEventListener("resize", () => { if (R && !$("#play").hidden) TB.paint(); });

/* ---------- 開始 ---------- */
(async () => {
  await loadMe();
  await loadState();
  renderMap();
  window.__mtReady = true;
})();
onLogin(async () => { await loadState(); if (!$("#map").hidden) renderMap(); else if (!$("#closet").hidden) renderCloset(); if (ME.user) toast("登入了！進度和小魚乾會存在你的帳號"); });
