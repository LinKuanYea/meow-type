// 喵打冒險模式：地圖、戰鬥、結算、換裝
import { ISLANDS, LEVELS, starsOf, unlocked, STAR_RULE, FISH, learnItem, withSegs, mergeSums, etaMin, SEG_MAX } from "/shared/quest.js";
import { ITEMS, ITEM, SLOTS, DEFAULT_OUTFIT } from "/shared/items.js";
import { BANK } from "/shared/bank.js";
import { newsLevel, NEWS_FISH, NEWS_TARGET } from "/shared/news.js";
import { Typist, summarize } from "/shared/judge.js";
import { esc } from "/shared/analyze.js";
import { ME, loadMe, onLogin, login, askLogin } from "/account.js";
import { drawDressed } from "/cat.js";
import { Battle } from "/battle.js";
import { TypeBox } from "/typebox.js";
import { learnCard } from "/learn.js";
import { videoPanel, canMakeVideo } from "/vidui.js";
import { openDen } from "/den.js";
import { BOSS, BOSS_RULE, DAILY_CAP, BOSS_FISH, randomPiece, accBonus } from "/shared/boss.js";

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
const rule = () => "back"; // 打錯時一律要倒退修

/* ---------- 進度：登入的人存在伺服器；沒登入只能玩第 1 章，星星存在這台電腦 ---------- */
const ST = { login: false, fish: 0, stars: {}, best: {}, owned: [], outfit: { ...DEFAULT_OUTFIT } };
const LOCAL = "mt-adv-local";
/* 分段存檔：登入的人存在伺服器（ST.segs＝打到第幾段）；沒登入存在這台電腦（含每段成績，最後一段一起送去算星星） */
const SEGKEY = "mt-quest-seg";
const localSegs = () => store.get(SEGKEY, {});
const segDone = (lv) => (ST.login ? ST.segs?.[lv.id] || 0 : localSegs()[lv.id]?.done || 0);
function setLocalSeg(id, v) { const a = localSegs(); if (v) a[id] = v; else delete a[id]; store.set(SEGKEY, a); }
/* 預估時間：用這個人最近的平均速度（登入看伺服器紀錄，沒登入看這台電腦），沒有紀錄就用 15 WPM */
const AVGKEY = "mt-quest-avg";
function avgOf(lang) {
  const v = ST.login ? ST.avg?.[lang] : (() => { const a = store.get(AVGKEY, {})[lang] || []; return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; })();
  return v > 3 ? { wpm: v, mine: true } : { wpm: 15, mine: false };
}
function rememberSpeed(lang, sp) { const a = store.get(AVGKEY, {}); a[lang] = [sp, ...(a[lang] || [])].slice(0, 20); store.set(AVGKEY, a); }
/** 關卡卡片上的「約 N 分鐘」和「存到第幾段」 */
function etaHTML(lv, charsLeft, total) {
  const a = avgOf(lv.lang), done = segDone(lv), n = lv.segs?.length || 1;
  return `<span class="lve" title="${a.mine ? `用你最近的平均速度 ${Math.round(a.wpm)} WPM 估計` : "還沒有你的紀錄，先用 15 WPM 估計"}">⏱ 約 ${etaMin(charsLeft ?? total, a.wpm, lv.lang)} 分鐘${n > 1 ? `・分 ${n} 段` : ""}${done ? `・<b>存到第 ${done} 段</b>` : ""}</span>`;
}
const leftChars = (lv) => lv.segs.slice(segDone(lv)).flat().reduce((a, t) => a + t.length, 0);
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
  $("#islands").innerHTML = `<button type="button" data-v="boss" aria-pressed="${island === "boss"}">🌍 世界 Boss</button><button type="button" data-v="news" aria-pressed="${island === "news"}">📰 每日新聞</button>` + ISLANDS.map((is) => `<button type="button" data-v="${is.id}" aria-pressed="${is.id === island}"${is.open ? "" : ' class="soon"'}>${esc(is.name)}${is.open ? "" : "（準備中）"}</button>`).join("");
  if (island === "news") return renderNews();
  if (island === "boss") return renderBoss();
  const is = ISLANDS.find((x) => x.id === island) || ISLANDS[0];
  $("#mapHint").innerHTML = !is.open ? "這座島還在蓋，先到 C++ 島冒險吧！"
    : `${STAR_RULE}。${ST.login ? "" : `<b>沒登入只能玩第 1 章，也拿不到小魚乾和裝扮。</b><button type="button" class="link" id="mapLogin">用 Google 登入</button>`}`;
  $("#mapLogin")?.addEventListener("click", login);
  $("#chapters").innerHTML = is.chapters.map((ch) => {
    const need = ch.login && !ST.login;
    return `<div class="chap"><h3>${esc(ch.name)}${need ? '<span class="lock">要登入</span>' : ""}</h3><ol class="lvls">${ch.levels.map((lv) => {
      const s = ST.stars[lv.id] || 0, open = !need && unlocked(lv, ST.stars);
      return `<li><button type="button" class="lvl${lv.big ? " big" : ""}${s ? " done" : ""}" data-lv="${lv.id}"${open ? "" : " disabled"}>
        <span class="lvn">${lv.chapter.split("-")[1]}-${lv.index + 1}</span><span class="lvt">${esc(lv.name)}</span>
        <span class="lvs" aria-label="${s} 顆星">${open ? starsTxt(s) : "🔒"}</span>${open ? etaHTML(lv, leftChars(lv)) : ""}${lv.drop ? `<span class="lvd">掉落：${esc(ITEM.get(lv.drop).name)}</span>` : ""}</button></li>`;
    }).join("")}</ol></div>`;
  }).join("");
}
$("#islands").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  island = b.dataset.v; store.set("mt-adv-island", island); renderMap();
});
$("#chapters").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lv]"); if (b && !b.disabled) return play(LEVELS.get(b.dataset.lv));
  const n = e.target.closest("[data-news]"); if (n) return playNews(n.dataset.news);
  if (e.target.closest("#wbGo")) return playBoss();
  if (e.target.closest("#wbSeen")) return bossSeen();
});

/* ---------- 每日新聞 ---------- */
const fmtDate = (d) => { const [y, m, dd] = d.split("-").map(Number); return `${m} 月 ${dd} 日（${"日一二三四五六"[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]}）`; };
async function renderNews() {
  $("#mapHint").innerHTML = `每天 3 篇國際新聞短文（高中程度的英文改寫，每篇約 100 字），<b>打完任一篇就算完成今日任務</b>；打完學單字、答理解題。${STAR_RULE.replace(/速度達標/, `速度 ${NEWS_TARGET} WPM`)}。`
    + (ST.login ? `當天的新聞每顆新星 ${NEWS_FISH.today} 條小魚乾（3 篇都可以拿），連續 ${NEWS_FISH.streakMin} 天以上再加 ${NEWS_FISH.streakBonus} 條；以前的新聞每顆星 ${NEWS_FISH.history} 條。` : `<b>登入才能拿小魚乾、記連續天數。</b><button type="button" class="link dologin">用 Google 登入</button>`);
  $("#chapters").innerHTML = '<p class="empty">載入中…</p>';
  const r = online ? await api("/api/news") : { error: "要連上伺服器" };
  if (island !== "news") return;
  if (r.error) { $("#chapters").innerHTML = `<p class="empty">${esc(r.error)}</p>`; return; }
  const todays = r.list.filter((n) => n.date === r.today), rest = r.list.filter((n) => n.date !== r.today);
  const doneToday = todays.some((n) => n.stars > 0);
  const card = (n, big, i) => `<button type="button" class="lvl news${big ? " big" : ""}${n.stars ? " done" : ""}" data-news="${n.key}">
    <span class="lvn">${big && todays.length > 1 ? `第 ${i + 1} 篇` : fmtDate(n.date)}・${esc(n.topic)}</span><span class="lvt">${esc(n.title)}</span><span class="lvs" aria-label="${n.stars} 顆星">${starsTxt(n.stars)}</span>${n.chars ? etaHTML({ id: "news-" + n.key, lang: "en", segs: new Array(n.chars > SEG_MAX * 1.2 ? Math.ceil(n.chars / SEG_MAX) : 1) }, null, n.chars) : ""}${big ? `<span class="go">${n.stars ? "再打一次" : doneToday ? "再打一篇" : "開始今日任務"} →</span>` : ""}</button>`;
  $("#chapters").innerHTML = `<div class="chap"><h3>今日任務${doneToday ? '<span class="ok">✓ 今天完成了</span>' : ""}${ST.login && r.streak ? `<span class="streak">🔥 連續 ${r.streak} 天</span>` : ""}</h3>
    ${todays.length ? `<div class="today"><div class="tcards">${todays.map((n, i) => card(n, true, i)).join("")}</div><div class="board" id="nBoard"><p class="empty">排行榜載入中…</p></div></div>` : `<p class="empty">今天的新聞還沒出來（每天清晨更新），先玩以前的吧！</p>`}</div>
    ${rest.length ? `<div class="chap"><h3>以前的新聞</h3><ol class="lvls">${rest.map((n) => `<li>${card(n)}</li>`).join("")}</ol></div>` : ""}`;
  if (todays.length) showBoard(todays, todays[0].key);
}
// 今天每篇各有排行榜，用分頁切換
async function showBoard(todays, key) {
  const el0 = $("#nBoard"); if (!el0) return;
  const tabs = todays.length > 1 ? `<div class="btabs" role="group" aria-label="選文章">${todays.map((n, i) => `<button type="button" data-bkey="${n.key}" aria-pressed="${n.key === key}">第 ${i + 1} 篇</button>`).join("")}</div>` : "";
  const b = await api(`/api/news/${key}/board`);
  const el = $("#nBoard"); if (!el) return;
  el.innerHTML = `<h4>今天的排行榜</h4>` + tabs + (b.error || !b.length ? '<p class="empty">還沒有人打完，搶第一個！</p>'
      : `<table class="lb"><tbody>${b.map((x, i) => `<tr class="${x.me ? "me" : ""}"><td class="rk">${i + 1}</td><td>${esc(x.name)}${x.me ? "（你）" : ""}</td><td class="n">${Math.round(x.speed)}</td><td class="n">${starsTxt(x.stars)}</td></tr>`).join("")}</tbody></table>`);
  el.querySelectorAll("[data-bkey]").forEach((x) => x.addEventListener("click", () => showBoard(todays, x.dataset.bkey)));
}
async function playNews(date) {
  const n = await api("/api/news/" + date);
  if (n.error) return toast(n.error);
  play(withSegs(newsLevel(n)));
}
function newsLearn(n) {
  const LV = (x) => ["", "國中", "高中", "進階"][x] || "";
  return `<div class="learn"><h3>單字</h3><table class="lb vocab"><tbody>${n.vocab.map((v) => `<tr><td><b>${esc(v.w)}</b></td><td>${esc(v.pos)}</td><td>${esc(v.zh)}</td><td class="n"><span class="lv">${LV(v.lv)}</span></td></tr>`).join("")}</tbody></table>
    <h3>讀懂了嗎？</h3>${n.questions.map((q, i) => `<fieldset class="nq" data-a="${q.answer}"><legend>${i + 1}. ${esc(q.q)}</legend>${q.options.map((o, k) => `<label><input type="radio" name="nq${i}" value="${k}"> ${esc(o)}</label>`).join("")}<p class="why" hidden>${esc(q.why)}</p></fieldset>`).join("")}
    <p class="hint">原始報導：${n.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.name)}</a>`).join("、")}（這篇是用自己的話改寫的練習文章）</p></div>`;
}
/* ---------- 世界 Boss（shared/boss.js、server/boss.js） ---------- */
let WB = null, wbTimer = 0, wbLast = "";
const WB_POLL = 12000;
function drawBossArt(cv, b) {
  const c = cv.getContext("2d"), s = Math.floor(Math.min(cv.width / 16, cv.height / 14));
  const n = parseInt(b.color.slice(1), 16), dk = `rgb(${Math.round((n >> 16) * 0.65)},${Math.round(((n >> 8) & 255) * 0.65)},${Math.round((n & 255) * 0.65)})`;
  const pal = { b: b.color, d: dk, w: "#fff", e: "#1a1a1a", m: "#5a1a1a", p: "#f4a0b0" };
  c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height);
  const ox = (cv.width - 16 * s) / 2, oy = (cv.height - 14 * s) / 2;
  b.art.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") { c.fillStyle = pal[ch]; c.fillRect(ox + i * s, oy + j * s, s, s); } }));
  c.fillStyle = "rgba(255,255,255,.92)"; c.font = `bold ${s * 3.2}px ui-monospace, Consolas, monospace`; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText(b.glyph, ox + 8 * s, oy + 10.8 * s);
}
const leftTxt = (ms) => { if (ms <= 0) return "這週結束了"; const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000); return d ? `還剩 ${d} 天 ${h} 小時` : h ? `還剩 ${h} 小時` : `還剩 ${Math.max(1, Math.round(ms / 60000))} 分鐘`; };
const agoTxt = (ms) => (ms < 60000 ? "剛剛" : ms < 3600000 ? `${Math.floor(ms / 60000)} 分鐘前` : ms < 86400000 ? `${Math.floor(ms / 3600000)} 小時前` : `${Math.floor(ms / 86400000)} 天前`);
async function renderBoss() {
  $("#mapHint").innerHTML = `每週一隻世界 Boss，<b>全部登入的人一起打同一隻</b>、共用血條（台灣時間週一 00:00 到週日 23:59）。${esc(BOSS_RULE)}`
    + (ST.login ? "" : `<b>要登入才能出擊</b>（沒登入可以看血條和排行）。<button type="button" class="link dologin">用 Google 登入</button>`);
  if (!WB) $("#chapters").innerHTML = '<p class="empty">載入中…</p>';
  await refreshBoss(true);
  clearInterval(wbTimer);
  wbTimer = setInterval(() => { if (island !== "boss" || $("#map").hidden) return clearInterval(wbTimer); if (!document.hidden) refreshBoss(); }, WB_POLL);
}
async function refreshBoss(full) {
  const r = online ? await api("/api/boss") : { error: "要連上伺服器" };
  if (island !== "boss" || $("#map").hidden) return;
  if (r.error) { if (!WB) $("#chapters").innerHTML = `<p class="empty">${esc(r.error)}</p>`; return; }
  const changed = !WB || WB.week !== r.week || !!WB.rewards?.length !== !!r.rewards?.length;
  WB = r;
  if (full || changed || !$("#wbBody")) bossShell();
  bossLive();
}
/** 不會跟著輪詢變的部分：Boss 的樣子、介紹、獎勵通知 */
function bossShell() {
  const r = WB, b = r.boss, rw = r.rewards || [];
  $("#chapters").innerHTML = `<div class="wb" id="wbBody">
    ${rw.length ? `<div class="wb-gift" role="status"><canvas id="wbGiftCv" width="120" height="105" aria-hidden="true"></canvas><div><h3>🎉 世界 Boss 被打倒了！</h3>${rw.map((x) => `<p>「${esc(x.boss)}」（${x.week.slice(5).replace("-", "/")} 那週）：你造成 ${x.dmg} 傷害${x.rank ? `，<b>第 ${x.rank} 名</b>` : ""}，拿到 🐟 ${x.fish} 條小魚乾${x.item ? `＋限定${x.item.kind === "den" ? "家具" : "裝扮"}「<b>${esc(x.item.name)}</b>」` : ""}！</p>`).join("")}
      <button type="button" class="main" id="wbSeen">收下</button></div></div>` : ""}
    <div class="wb-head"><canvas id="wbCv" width="160" height="140" aria-label="${esc(b.name)}的樣子"></canvas>
      <div><p class="wb-tag">本週世界 Boss・主題 <b>${esc(b.themeName)}</b></p><h3>${esc(b.name)}</h3><p>${esc(b.intro)}</p>
      ${b.item ? `<p class="hint">打倒的獎勵：每個有造成傷害的人 🐟 ${BOSS_FISH.clear} 條＋限定${b.item.kind === "den" ? "貓窩家具" : "裝扮"}「${esc(b.item.name)}」；傷害前 3 名再加 ${BOSS_FISH.top.join("、")} 條。週日還沒打倒，Boss 就會逃走。</p>` : ""}</div></div>
    <div class="wb-hp"><div class="wb-bar" role="progressbar" aria-label="Boss 剩下的血" aria-valuemin="0" id="wbBar"><i id="wbFill" style="width:${r.hp ? ((r.left / r.hp) * 100).toFixed(2) : 0}%"></i></div><p><b id="wbLeft"></b><span id="wbTime"></span></p></div>
    <div class="wb-me" id="wbMe"></div>
    <div class="wb-grid"><div class="board"><h4>本週傷害排行</h4><div id="wbTop"></div></div><div class="board"><h4>最近的攻擊</h4><ul class="wb-feed" id="wbFeed"></ul></div></div>
  </div>`;
  drawBossArt($("#wbCv"), b);
  if (rw.length && rw[0].item) {
    const it = rw[0].item, c = $("#wbGiftCv").getContext("2d"); c.imageSmoothingEnabled = false;
    if (it.kind === "outfit") drawDressed(c, 4, 0, 7, 0, { ...ST.outfit, [ITEM.get(it.id).slot]: it.id });
    else { c.font = "64px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("🏠", 60, 54); }
  }
}
/** 跟著輪詢更新的部分：血條、剩幾天、我的傷害、排行、最近的攻擊 */
function bossLive() {
  const r = WB, el = $("#wbBody"); if (!el) return;
  const pct = r.hp ? (r.left / r.hp) * 100 : 0;
  $("#wbFill").style.width = pct.toFixed(2) + "%";
  $("#wbBar").setAttribute("aria-valuemax", r.hp); $("#wbBar").setAttribute("aria-valuenow", r.left);
  $("#wbLeft").textContent = r.defeated ? `已經被打倒了！（${r.players} 人合力）` : `${r.left.toLocaleString()} / ${r.hp.toLocaleString()} 血・${r.players} 人參戰`;
  $("#wbTime").textContent = r.defeated ? "　下週一換新的 Boss" : "　" + leftTxt(r.end - r.now);
  const me = r.me;
  $("#wbMe").innerHTML = !r.login ? `<p>登入後就能出擊，一起打倒${esc(r.boss.name)}！</p><button type="button" class="main dologin">用 Google 登入</button>`
    : `<div class="big"><div><small>我的傷害</small><strong>${me.dmg}</strong></div><div class="s"><small>名次</small><strong>${me.rank ? `第 ${me.rank} 名` : "—"}</strong></div><div class="s"><small>今天算傷害的次數</small><strong>${me.today} / ${r.cap}</strong></div></div>
      ${r.defeated ? `<p class="hint">這週的 Boss 已經倒下了，下週一再來！</p>` : `<button type="button" class="main" id="wbGo">⚔️ 出擊！</button><p class="hint">${me.today >= r.cap ? `今天的 ${r.cap} 次已經用完了：還可以打，但不會扣血、沒有小魚乾，明天再來。` : `每次打一段 ${esc(r.boss.themeName)}（從題庫隨機抽），打完就攻擊。`}</p>`}`;
  $("#wbTop").innerHTML = r.top.length ? `<table class="lb"><tbody>${r.top.map((x, i) => `<tr class="${x.me ? "me" : ""}"><td class="rk">${i + 1}</td><td>${esc(x.name)}${x.me ? "（你）" : ""}</td><td class="n">${x.dmg}</td></tr>`).join("")}</tbody></table>` : '<p class="empty">還沒有人出擊，搶第一個！</p>';
  $("#wbFeed").innerHTML = r.recent.length ? r.recent.map((x) => `<li><b>${esc(x.name)}</b> 造成 <b>${x.dmg}</b> 傷害<span class="hint">　${agoTxt(r.now - x.ts)}</span></li>`).join("") : '<li class="empty">還沒有攻擊紀錄</li>';
}
async function bossSeen() {
  const r = await api("/api/boss/seen", {});
  if (r.error) return toast(r.error);
  await loadState(); toast("收下了！裝扮到「換裝」、家具到「貓窩」看看");
  WB = null; renderBoss();
}
function playBoss() {
  if (!ST.login) return login();
  const r = WB, p = randomPiece(r.boss.theme, wbLast); wbLast = p.id;
  play({ id: "world-boss", world: { piece: p.id, hp: r.hp, left: r.left }, name: r.boss.name, lang: p.lang, texts: p.texts, segs: [p.texts], chars: p.chars, from: p.from,
    boss: { name: r.boss.name, glyph: r.boss.glyph, color: r.boss.color, art: r.boss.art }, big: true, target: 0, chapter: "boss", index: 0 }, 0);
}
async function bossFinish(lv, sum) {
  const run = R; run.waiting = true;
  $("#res").innerHTML = `<div class="res"><h2>結算中…</h2></div>`; $("#res").hidden = false;
  const events = R.ty.events.slice(), rule = R.rule;
  const o = online ? await api("/api/boss/hit", { piece: lv.world.piece, rule, events }) : { error: "要連上伺服器" };
  run.waiting = false;
  if (!o.error) {
    ST.fish = o.total; $("#fish").textContent = `🐟 ${ST.fish}`;
    WB = o.state;
    battle.hp = Math.max(1, o.state.hp); battle.left = o.state.left;
    if (o.killed || o.state.defeated) battle.win(now());
    if (!o.flagged) rememberSpeed(lv.lang, o.speed);
  }
  if (R !== run) return;
  const why = o.error ? "" : o.flagged ? "這次的打字節奏不太像人打的，不算傷害。"
    : o.over ? `今天已經出擊 ${o.cap} 次了，這次不扣血（本來可以造成 ${o.raw} 傷害），明天再來！`
    : o.late ? "Boss 已經被別人打倒了，這次沒有傷害，小魚乾照拿。"
    : `打對 ${o.correct} 個字 × 正確率加成 ${o.bonus}${o.dmg < o.raw ? `（最後一擊只需要 ${o.dmg}）` : ""}`;
  $("#res").innerHTML = `<div class="res questres">
    <h2>${o.error ? "這次沒有送出" : o.killed ? `🎉 最後一擊！打倒${esc(lv.name)}！` : o.dmg ? `對${esc(lv.name)}造成 ${o.dmg} 傷害！` : `${esc(lv.name)}沒有受傷…`}</h2>
    <p>${esc(why)}</p>
    <div class="big"><div><small>速度（WPM）</small><strong>${Math.round(o.speed ?? sum.speed)}</strong></div>
      <div class="s"><small>正確率</small><strong>${Math.round((o.acc ?? sum.acc) * 100)}%</strong></div>
      <div class="s"><small>今天的次數</small><strong>${o.error ? "—" : `${o.today} / ${o.cap}`}</strong></div></div>
    ${o.error ? `<p class="nickrule">${esc(o.error)}</p>` : ""}
    ${o.fish ? `<p class="gain">🐟 +${o.fish} 小魚乾（現在 ${ST.fish} 條）</p>` : ""}
    ${o.killed ? `<p class="gain">大家合力打倒了世界 Boss！每個有造成傷害的人都拿到獎勵，回世界 Boss 頁面收下。</p>` : ""}
    <p class="hint">這段來自：${esc(lv.from)}${o.state ? `・Boss 還剩 ${o.state.left} 血` : ""}</p>
    ${canMakeVideo() && !o.flagged && !o.error ? `<div class="vid" id="vid"><button type="button" class="main" id="bVid">🎬 做成縮時影片</button><span class="hint">把剛剛的攻擊過程做成幾秒的直式影片。</span></div>` : ""}
    <div class="btns">${o.state && !o.state.defeated ? '<button class="main" id="bAgain" type="button">再出擊</button>' : ""}<button id="bMap" type="button"${o.state && !o.state.defeated ? "" : ' class="main"'}>回世界 Boss</button></div></div>`;
  if ($("#bVid")) $("#bVid").onclick = () => videoPanel($("#vid"), { scene: "battle", lang: lv.lang, texts: lv.texts, boss: lv.boss, big: true, rule, events, outfit: ST.outfit, nick: ME.user?.nick || "", stars: 0, unit: "WPM", title: `🌍 世界 Boss ${lv.name}` }, {
    link: { kind: "boss", piece: lv.world.piece, rule, events }, toast, file: "meow-type-world-boss",
    shareText: `我在喵打跟大家一起打世界 Boss「${lv.name}」！ https://meow-type.otlab.org/quest`,
  });
  $("#bAgain")?.addEventListener("click", playBoss);
  $("#bMap").onclick = () => { R = null; cancelAnimationFrame(raf); island = "boss"; renderMap(); };
  $("#res").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
function show(id) { for (const s of ["map", "play", "closet", "den"]) $("#" + s).hidden = s !== id; }

/* ---------- 戰鬥 ---------- */
const battle = new Battle($("#arena"));
let R = null, raf = 0;
const now = () => performance.now();
const TB = TypeBox({ box: $("#box"), txt: $("#txt"), ta: $("#ta"), comp: $("#comp") }, {
  ty: () => R && R.ty, active: () => !!R && !R.ended, started: () => !!R && !!R.start,
  isCode: () => R && (R.lv.lang === "cpp" || R.lv.lang === "py"), cat: () => (R ? R.lv.lang : "cpp"), rule: () => R.rule,
  event, pasted: () => toast("這裡不能貼上，要自己打喔"),
  escape: () => play(R.lv, R.seg),
  ime: () => { if (!R.ime) toast("輸入法在中文模式，請切到英數"); R.ime = (R.ime || 0) + 1; },
});

function play(lv, seg = segDone(lv)) {
  cancelAnimationFrame(raf);
  show("play");
  if (seg >= lv.segs.length) seg = 0;
  const texts = lv.segs[seg], nSeg = lv.segs.length;
  R = { lv, seg, texts, rule: rule(), ty: null, part: 0, start: 0, ended: false, endT: 0, lastC: 0, pend: 0, combo: 0 };
  R.ty = new Typist(R.rule, (ty) => {
    if (R.part + 1 < texts.length) { R.part++; ty.setText(texts[R.part]); TB.build(); return; }
    queueMicrotask(finish);
  });
  R.ty.setText(texts[0]);
  $("#lvName").textContent = lv.world ? `🌍 世界 Boss　${lv.name}` : (lv.news ? `📰 ${fmtDate(lv.news.date)}　${lv.name}` : `${lv.chapter.split("-")[1]}-${lv.index + 1}　${lv.name}`) + (nSeg > 1 ? `（第 ${seg + 1}/${nSeg} 段）` : "");
  $("#restart0").hidden = seg === 0;
  const code = lv.lang === "cpp" || lv.lang === "py", cjk = code && lv.texts.some((t) => /[\u3000-\u9fff\uff00-\uffef]/.test(t));
  $("#hint").textContent = (code ? "Tab 縮排（補到 4 的倍數）・" : "") + "Esc 重來這一關・不能貼上" + (cjk ? "・字串裡的中文要切回中文輸入法，打完再切回英數" : "");
  $("#lg").textContent = lv.world ? "×1" : `${lv.target}`;
  $("#lg").previousElementSibling.textContent = lv.world ? "傷害加成" : "三星目標";
  battle.reset({ boss: lv.boss, hp: lv.chars, outfit: ST.outfit, big: lv.big });
  battle.left = battle.shown = lv.chars - lv.segs.slice(0, seg).flat().reduce((a, t) => a + t.length, 0); // 前面幾段已經打掉的血
  if (lv.world) { battle.hp = Math.max(1, lv.world.hp); battle.left = battle.shown = lv.world.left; } // 世界 Boss：畫面上的血條是全部人共用的血
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
    if (!R.ended || R.waiting || now() - Math.max(R.endedAt, battle.won || 0) < 1500) frame();
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
  if (R.lv.world) $("#lg").textContent = "×" + accBonus(s.keys ? s.acc : 1);
}

async function finish() {
  if (R.ended) return;
  const lv = R.lv;
  R.ended = true; R.endedAt = now(); $("#ta").blur(); $("#box").classList.add("end");
  if (R.pend) battle.damage(now(), 0, R.pend, false);
  live(); TB.paint();
  let sum = summarize(R.ty, lv.lang, Math.max(1, R.endT));
  if (lv.world) return bossFinish(lv, sum);
  const seg = R.seg, nSeg = lv.segs.length, last = seg === nSeg - 1;
  const prior = !ST.login ? (localSegs()[lv.id]?.parts || []).slice(0, seg) : [];
  const local = last ? starsOf(lv, nSeg > 1 && !ST.login ? mergeSums(lv.lang, [...prior, sum]) : sum) : 0;
  const prev = ST.stars[lv.id] || 0;
  let out = { stars: local, fish: 0, drops: [], flagged: false };
  $("#res").innerHTML = `<div class="res"><h2>結算中…</h2></div>`; $("#res").hidden = false;
  if (online) {
    const run = R; run.waiting = true;
    const r = await api("/api/quest/clear", { level: lv.id, rule: R.rule, seg, prior, events: R.ty.events.slice() });
    if (r.error) out.error = r.error; else out = r;
    run.waiting = false;
  }
  if (!out.error && !out.flagged) rememberSpeed(lv.lang, out.part ? out.part.speed : out.speed ?? sum.speed);
  if (nSeg > 1 && !last && !out.error) {
    // 還有下一段：存檔（登入的人伺服器已經存了），顯示「繼續下一段」
    if (!out.flagged) { if (ST.login) ST.segs = { ...ST.segs, [lv.id]: seg + 1 }; else setLocalSeg(lv.id, { done: seg + 1, parts: [...prior, { correct: sum.correct, keys: sum.keys, errs: sum.errs, ms: Math.round(sum.ms) }] }); }
    if (!R || R.lv !== lv || !R.ended) return;
    return renderSegDone(lv, seg, nSeg, sum, out);
  }
  if (nSeg > 1 && !out.error) { if (ST.login) { const c = { ...ST.segs }; delete c[lv.id]; ST.segs = c; } else setLocalSeg(lv.id, null); if (out.speed != null) sum = { ...sum, speed: out.speed, acc: out.acc, ms: out.ms }; }
  if (ST.login && !out.error) { ST.stars[lv.id] = Math.max(prev, out.stars); if (typeof out.total === "number") ST.fish = out.total; out.drops.forEach((d) => ST.owned.push(d)); $("#fish").textContent = `🐟 ${ST.fish}`; }
  if (!ST.login && out.stars > prev) { ST.stars[lv.id] = out.stars; store.set(LOCAL, ST.stars); }
  if (!R || R.lv !== lv || !R.ended) return; // 等結果的時候已經離開這一關（進度照樣記下）
  out.events = R.ty.events.slice(); out.rule = R.rule; out.segTexts = R.texts; out.seg = seg;
  if (out.stars > 0) battle.win(now());
  renderResult(lv, sum, out, prev);
}

/** 分段關卡：打完一段（還沒到最後一段） */
function renderSegDone(lv, seg, nSeg, sum, out) {
  $("#res").innerHTML = `<div class="res questres">
    <h2>${out.flagged ? "這一段不算" : `第 ${seg + 1} 段完成！`}</h2>
    <p>${out.flagged ? "這次的打字節奏不太像人打的，這一段要重打。" : `${esc(lv.boss.name)}還剩 ${lv.segs.slice(seg + 1).flat().reduce((a, t) => a + t.length, 0)} 點血。已經存檔，現在離開，下次會從第 ${seg + 2} 段接著打。`}</p>
    <div class="big"><div><small>這段的速度（WPM）</small><strong>${Math.round(sum.speed)}</strong></div>
      <div class="s"><small>正確率</small><strong>${Math.round(sum.acc * 100)}%</strong></div>
      <div class="s"><small>進度</small><strong>${out.flagged ? seg : seg + 1} / ${nSeg} 段</strong></div></div>
    ${!ST.login && !out.flagged ? `<p class="hint">沒登入：進度只存在這台電腦。</p>` : ""}
    <div class="btns">${out.flagged ? '<button class="main" id="bAgain" type="button">重打這一段</button>' : '<button class="main" id="bNextSeg" type="button">繼續下一段</button>'}<button id="bMap" type="button">回地圖</button></div></div>`;
  $("#bNextSeg")?.addEventListener("click", () => play(lv, seg + 1));
  $("#bAgain")?.addEventListener("click", () => play(lv, seg));
  $("#bMap").onclick = renderMap;
  $("#res").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
function nextLevel(lv) {
  if (lv.news) return null;
  for (const is of ISLANDS) for (const ch of is.chapters) { const k = ch.levels.indexOf(lv); if (k >= 0) return ch.levels[k + 1] || is.chapters[is.chapters.indexOf(ch) + 1]?.levels[0] || null; }
  return null;
}
function renderResult(lv, sum, out, prev) {
  const s = out.stars, nx = nextLevel(lv);
  const canNext = nx && s > 0 && (!nx.login || ST.login);
  const it = learnItem(lv), spec = it ? { c: lv.lang, l: it.len, i: [BANK[lv.lang][it.len].indexOf(it)] } : null;
  const L = spec ? learnCard(spec, lv.lang, it.len) : lv.news ? { html: newsLearn(lv.news), bind: bindNewsQuiz } : null;
  const why = s === 0 ? (out.flagged ? "這次的打字節奏不太像人打的，不算過關。" : "正確率要 85% 以上才算打倒怪物，再試一次！")
    : s === 1 ? "正確率 95% 以上就有第 2 顆星。" : s === 2 ? `速度到 ${lv.target} WPM 就有第 3 顆星。` : "三顆星全拿！";
  $("#res").innerHTML = `<div class="res questres">
    <h2>${s ? `打倒${esc(lv.boss.name)}！` : `${esc(lv.boss.name)}還站著…`}</h2>
    <p class="bigstars" aria-label="${s} 顆星">${starsTxt(s)}</p><p>${why}${s > prev && prev ? `（原本 ${prev} 顆）` : ""}</p>
    <div class="big"><div><small>速度（WPM）</small><strong>${Math.round(sum.speed)}</strong></div>
      <div class="s"><small>正確率</small><strong>${Math.round(sum.acc * 100)}%</strong></div>
      <div class="s"><small>時間</small><strong>${(sum.ms / 1000).toFixed(1)} 秒</strong></div></div>
    ${out.error ? `<p class="nickrule">${esc(out.error)}</p>` : ""}
    ${ST.login ? (out.fish ? `<p class="gain">🐟 +${out.fish} 小魚乾（現在 ${ST.fish} 條）${out.streak ? `　🔥 連續 ${out.streak} 天` : ""}</p>` : s && s <= prev ? `<p class="hint">重打已經拿過的星星：每次 ${FISH.replay} 條小魚乾，每天最多 ${FISH.replayPerDay} 次。</p>` : "")
      : `<p class="loginhint"><button type="button" class="link dologin">用 Google 登入</button>就能拿小魚乾、換裝，進度也會存起來（第 2 章以後要登入）。</p>`}
    ${out.drops?.length ? `<div class="drop"><canvas id="dropCv" width="160" height="140"></canvas><p>獲得裝扮：<b>${esc(ITEM.get(out.drops[0]).name)}</b>！到「換裝」穿上它。</p></div>` : ""}
    ${canMakeVideo() && !out.flagged && !out.error ? `<div class="vid" id="vid"><button type="button" class="main" id="bVid">🎬 做成縮時影片</button><span class="hint">把剛剛的打怪過程做成幾秒的直式影片，可以分享到 IG 限時動態。</span></div>` : ""}
    ${L ? L.html : ""}
    <div class="btns">${canNext ? '<button class="main" id="bNext" type="button">下一關</button>' : ""}<button${canNext ? "" : ' class="main"'} id="bAgain" type="button">再打一次</button><button id="bMap" type="button">回地圖</button></div></div>`;
  if (out.drops?.length) { const c = $("#dropCv").getContext("2d"); c.imageSmoothingEnabled = false; drawDressed(c, 8, 0, 9, 0, { ...ST.outfit, [ITEM.get(out.drops[0]).slot]: out.drops[0] }); }
  if (L) L.bind($("#res"), { answered: 0, correct: 0, skipped: 0, opened: 0, onAnswer: (ok) => ok && toast("答對了！") });
  if ($("#bVid")) $("#bVid").onclick = () => videoUI(lv, out);
  $("#bAgain").onclick = () => play(lv);
  $("#bMap").onclick = renderMap;
  if (lv.news) $("#bMap").textContent = "回新聞列表";
  if (canNext) $("#bNext").onclick = () => play(nx);
  $("#res").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
function bindNewsQuiz(root) {
  root.querySelectorAll(".nq").forEach((fs) => fs.addEventListener("change", (e) => {
    const k = Number(e.target.value), a = Number(fs.dataset.a);
    fs.querySelectorAll("label").forEach((l, i) => { l.classList.toggle("right", i === a); l.classList.toggle("wrong", i === k && k !== a); });
    fs.querySelector(".why").hidden = false;
    fs.querySelectorAll("input").forEach((x) => { x.disabled = true; });
    toast(k === a ? "答對了！" : "再看一次文章找找看");
  }));
}
/* ---------- 縮時影片 ---------- */
function videoUI(lv, out) {
  const title = lv.news ? `📰 ${fmtDate(lv.news.date)} ${lv.name}` : `${lv.chapter.split("-")[1]}-${lv.index + 1} ${lv.name}`;
  videoPanel($("#vid"), { scene: "battle", lang: lv.lang, texts: out.segTexts || lv.texts, boss: lv.boss, big: lv.big, rule: out.rule, events: out.events, outfit: ST.outfit, nick: ME.user?.nick || "", stars: out.stars, unit: "WPM", title }, {
    link: { kind: "quest", level: lv.id, seg: out.seg || 0, stars: out.stars, rule: out.rule, events: out.events }, toast, file: `meow-type-${lv.id}`,
    shareText: `我在喵打打倒了${lv.boss.name}！你打得贏嗎？ https://meow-type.otlab.org/quest`,
  });
}
$("#restart0").onclick = () => { if (R) play(R.lv, 0); };
$("#back").onclick = () => { R = null; cancelAnimationFrame(raf); renderMap(); };

/* ---------- 換裝與圖鑑 ---------- */
function bossOf(levelId) { if (String(levelId).startsWith("boss:")) return `世界 Boss「${BOSS.get(levelId.slice(5))?.name || ""}」`; const lv = LEVELS.get(levelId); return lv ? `${lv.chapter.split("-")[1]}-${lv.index + 1} ${lv.boss.name}` : ""; }
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
/* ---------- 貓窩（client/den.js） ---------- */
const den = () => openDen({ show, api, toast, ST });
$("#goDen").onclick = den;
$("#back3").onclick = renderMap;
addEventListener("resize", () => { if (R && !$("#play").hidden) TB.paint(); });

/* ---------- 開始 ---------- */
(async () => {
  await loadMe();
  await loadState();
  renderMap();
  askLogin("（沒登入只能玩第 1 章）");
  if (ST.login && island !== "boss") api("/api/boss").then((r) => { if (r.rewards?.length) toast("🌍 世界 Boss 被打倒了！到「世界 Boss」收下獎勵"); });
  window.__mtReady = true;
})();
onLogin(async () => { await loadState(); if (!$("#map").hidden) renderMap(); else if (!$("#closet").hidden) renderCloset(); else if (!$("#den").hidden) den(); if (ME.user) toast("登入了！進度和小魚乾會存在你的帳號"); });
