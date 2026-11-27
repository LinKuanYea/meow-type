// 喵打冒險模式：貓窩（像素房間、擺家具、書櫃複習、獎盃、剪報牆）
// 房間和家具的資料在 /shared/den.js（和伺服器共用）；這裡只負責畫圖和操作。
import { ROOM, PX, DEN, DEN_ITEM, artH, layoutError } from "/shared/den.js";
import { ISLANDS, LEVELS, learnItem } from "/shared/quest.js";
import { DEFAULT_OUTFIT } from "/shared/items.js";
import { esc } from "/shared/analyze.js";
import { Cats } from "/den-cats.js";

const K = 12; // canvas 上每個像素畫成 K × K（CSS 再縮放）
const AW = ROOM.w * PX, AH = ROOM.h * PX; // 房間的像素大小（96 × 64）
const FLOOR_Y = ROOM.wall * PX;
const $ = (s) => document.querySelector(s);
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let C = null; // quest.js 傳進來的 { show, api, toast, ST }
const D = { login: false, fish: 0, owned: [], unlocked: [], layout: [], books: [], trophies: [], news: 0 };
let focus = null; // 右邊面板正在看的家具 id
let hold = null; // 正在移動的家具：{ id, from: { x, y } | null }
let hover = null; // 滑鼠在房間的哪個像素：{ ax, ay }
let openChap = null; // 書櫃裡打開的章
let raf = 0, last = 0, saving = Promise.resolve();
let sprites = new Map(), bg = null;

/* ---------- 開啟貓窩 ---------- */
export async function openDen(ctx) {
  C = ctx;
  C.show("den");
  if (!$("#denCv")) build();
  const r = await C.api("/api/quest/den");
  if (r.error) C.toast(r.error);
  Object.assign(D, r.login ? r : { login: false, fish: 0, owned: [], unlocked: [], layout: [], books: [], trophies: [], news: 0 });
  if (D.login) setFish(D.fish);
  focus = null; hold = null; openChap = null;
  refresh();
  cats.reset(D.cats || ["fur-orange"], C.ST.outfit || DEFAULT_OUTFIT, reduce());
  start();
}

function build() {
  $("#denBody").innerHTML = `<p class="hint" id="denHint"></p>
    <div class="denwrap">
      <div class="denstage"><canvas id="denCv" width="${AW * K}" height="${AH * K}" tabindex="0" role="img" aria-label="你的貓窩：房間裡的家具列在右邊和下面。選到房間時，方向鍵可以讓你的貓走一格"></canvas>
        <p class="denstat"><span id="denTip"></span><span id="denSave" role="status"></span></p></div>
      <div class="denside" id="denSide" aria-live="polite"></div>
    </div>
    <h3 class="denh">家具</h3><div class="denlist" id="denList"></div>`;
  const cv = $("#denCv");
  cv.addEventListener("pointermove", (e) => { hover = toArt(e); if (hold) draw(); });
  cv.addEventListener("pointerleave", () => { hover = null; if (hold) draw(); });
  cv.addEventListener("click", (e) => clickRoom(toArt(e)));
  cv.addEventListener("keydown", (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || hold) return;
    e.preventDefault();
    const r = cats.step(...d);
    if (r) blocked(r); else if (reduce()) draw();
  });
  $("#denList").addEventListener("click", onButton);
  $("#denSide").addEventListener("click", onButton);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && hold && !$("#den").hidden) cancelHold(); });
}
const toArt = (e) => { const r = e.currentTarget.getBoundingClientRect(); return { ax: ((e.clientX - r.left) / r.width) * AW, ay: ((e.clientY - r.top) / r.height) * AH }; };
function setFish(n) { D.fish = n; C.ST.fish = n; const f = $("#fish"); if (f) f.textContent = `🐟 ${n}`; }

/* ---------- 狀態 ---------- */
const have = () => new Set([...D.owned, ...D.unlocked]);
const placed = (id) => D.layout.find((e) => e.id === id);
const available = (it) => (it.learn ? D.unlocked.includes(it.id) : D.owned.includes(it.id));
/** 狀態改變後：重做圖片快取、重畫清單和面板 */
function refresh() {
  sprites = new Map();
  renderHint(); renderList(); renderSide(); cats.fix(); draw();
}
function renderHint() {
  $("#denHint").innerHTML = D.login
    ? `🐟 ${D.fish} 條小魚乾。打倒 Boss、完成每日新聞會解鎖學習家具；其他家具用小魚乾買。`
    : `<b>登入才能布置貓窩。</b><button type="button" class="link dologin">用 Google 登入</button>`;
  $("#denTip").textContent = hold ? `點房間裡的位置放下「${DEN_ITEM.get(hold.id).name}」（Esc 取消）` : D.login ? "點家具可以移動或收起來，擺好會自動儲存。" : "";
}

/* ---------- 家具清單（也是不用滑鼠的操作方式） ---------- */
function renderList() {
  const group = (title, list) => `<h4>${title}</h4><div class="denitems">${list.map(card).join("")}</div>`;
  $("#denList").innerHTML = group("學習家具（跟著進度解鎖，不能買）", DEN.filter((x) => x.learn)) + group("小魚乾家具", DEN.filter((x) => !x.learn && !x.from)) + group("🌍 世界 Boss 限定（打倒那一週的世界 Boss 才拿得到）", DEN.filter((x) => x.from));
  document.querySelectorAll("#denList canvas[data-id]").forEach((cv) => preview(cv, DEN_ITEM.get(cv.dataset.id)));
}
function card(it) {
  const ok = available(it), on = placed(it.id);
  let st, act = "";
  if (it.learn) st = ok ? "已解鎖" : `🔒 ${esc(it.how)}`;
  else if (it.from) st = ok ? "已擁有" : "🔒 世界 Boss 限定";
  else st = ok ? "已擁有" : `🐟 ${it.price}`;
  if (D.login) {
    if (ok) act = (on ? `<button type="button" data-off="${it.id}">收起來</button>` : `<button type="button" class="main" data-put="${it.id}">擺進房間</button>`)
      + (it.learn ? `<button type="button" data-look="${it.id}">打開看看</button>` : "");
    else if (!it.learn && !it.from) act = `<button type="button" data-buy="${it.id}"${D.fish < it.price ? " disabled" : ""}>🐟 ${it.price} 買</button>`;
  }
  return `<div class="denitem${ok ? "" : " no"}${on ? " on" : ""}"><canvas width="144" height="144" data-id="${it.id}" aria-hidden="true"></canvas>
    <b>${esc(it.name)}</b><small>${on ? "擺在房間裡" : st}</small>${it.learn ? "" : `<small class="how">${esc(it.how)}</small>`}<div class="denact">${act}</div></div>`;
}
function preview(cv, it) {
  const c = cv.getContext("2d"), s = sprite(it), w = it.w * PX, h = artH(it) * PX;
  const k = Math.min(cv.width / w, cv.height / h) * 0.9;
  c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height);
  if (!available(it) && (it.learn || it.from)) c.globalAlpha = 0.35;
  c.drawImage(s, (cv.width - w * k) / 2, (cv.height - h * k) / 2, w * k, h * k);
  c.globalAlpha = 1;
}

/* ---------- 右邊面板：選到的家具、書櫃複習、獎盃、剪報 ---------- */
function renderSide() {
  const el = $("#denSide");
  if (hold) {
    const it = DEN_ITEM.get(hold.id);
    el.innerHTML = `<h3>移動「${esc(it.name)}」</h3><p>點房間裡${it.zone === "wall" ? "牆上" : "地板上"}的位置放下。綠框可以放、紅框不行。</p>
      <div class="denact"><button type="button" data-cancel="1">取消（Esc）</button></div>`;
    return;
  }
  const it = focus && DEN_ITEM.get(focus);
  if (!it) {
    el.innerHTML = `<h3>我的貓窩</h3><p>${D.login ? `房間裡有 ${D.layout.length} 件家具。點房間裡的家具可以移動、收起來；書櫃、獎盃架和剪報牆點了可以打開看看。` : `登入後就能用小魚乾買家具、布置自己的貓窩。<button type="button" class="link dologin">用 Google 登入</button>`}</p>
      <p class="hint">讀完一章、打倒 Boss，書櫃就多一本書，可以回來複習那一章的程式。</p>`;
    return;
  }
  const on = placed(it.id), ok = available(it);
  const btns = !D.login || !ok ? "" : on ? `<button type="button" data-move="${it.id}">移動</button><button type="button" data-off="${it.id}">收起來</button>` : `<button type="button" class="main" data-put="${it.id}">擺進房間</button>`;
  el.innerHTML = `<h3>${esc(it.name)}</h3>${btns ? `<div class="denact">${btns}</div>` : ""}${it.learn ? (ok ? learnHTML(it) : `<p>🔒 ${esc(it.how)}</p>`) : `<p>${esc(it.how)}</p>`}
    <p><button type="button" class="link" data-close="1">關閉</button></p>`;
}
const chapOf = (id) => { for (const is of ISLANDS) for (const ch of is.chapters) if (ch.id === id) return { is, ch }; return null; };
function learnHTML(it) {
  if (it.learn === "books") {
    return `<p>每一本書是一章打倒 Boss 的紀錄。點書名複習那一章的程式。</p><ul class="denbooks">${D.books.map((id) => {
      const x = chapOf(id); if (!x) return "";
      const open = openChap === id;
      const lvs = x.ch.levels.filter((lv) => lv.learn);
      return `<li><button type="button" class="link" data-chap="${id}" aria-expanded="${open}">📘 ${esc(x.is.name)}・${esc(x.ch.name)}</button>${open ? `<ol class="denlearn">${lvs.length ? lvs.map((lv) => {
        const c = learnItem(lv);
        return `<li><small>${lv.chapter.split("-")[1]}-${lv.index + 1} ${esc(lv.name)}</small><b>${esc(c.title)}</b><p>${esc(c.summary)}</p></li>`;
      }).join("") : "<li>這一章沒有整題的程式可以複習。</li>"}</ol>` : ""}</li>`;
    }).join("")}</ul>`;
  }
  if (it.learn === "trophies") {
    return `<p>打倒的大 Boss：</p><ul class="dentrophy">${D.trophies.map((id) => {
      const lv = LEVELS.get(id); if (!lv) return "";
      const x = chapOf(lv.chapter);
      return `<li><span class="glyph" style="background:${lv.boss.color}">${esc(lv.boss.glyph)}</span><b>${esc(lv.boss.name)}</b><small>${esc(x.is.name)}・${esc(x.ch.name)}</small></li>`;
    }).join("")}</ul>`;
  }
  return `<p>你已經完成 <b>${D.news}</b> 篇每日新聞。剪報牆上會貼最近的 5 張，小牌子寫著總篇數。</p>`;
}

/* ---------- 按鈕 ---------- */
async function onButton(e) {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.buy) return buy(d.buy);
  if (d.put) return put(d.put);
  if (d.off) { D.layout = D.layout.filter((x) => x.id !== d.off); if (focus === d.off) focus = null; refresh(); return save(); }
  if (d.look) { focus = d.look; renderSide(); $("#denSide").scrollIntoView({ block: "nearest", behavior: reduce() ? "auto" : "smooth" }); return; }
  if (d.move) { const p = placed(d.move); hold = { id: d.move, from: { x: p.x, y: p.y } }; D.layout = D.layout.filter((x) => x.id !== d.move); refresh(); return; }
  if (d.cancel) return cancelHold();
  if (d.close) { focus = null; openChap = null; return renderSide(); }
  if (d.chap) { openChap = openChap === d.chap ? null : d.chap; return renderSide(); }
}
async function buy(id) {
  const it = DEN_ITEM.get(id);
  if (!confirm(`用 ${it.price} 條小魚乾買「${it.name}」？`)) return;
  const r = await C.api("/api/quest/den/buy", { item: id });
  if (r.error) return C.toast(r.error);
  Object.assign(D, r); setFish(r.fish); C.toast(`買到了「${it.name}」！按「擺進房間」放進貓窩`);
  refresh();
}
/** 擺進房間：自動找第一個空位（鍵盤也能用），之後可以再點它移動 */
function put(id) {
  const it = DEN_ITEM.get(id), spot = freeSpot(it);
  if (!spot) return C.toast("房間擺不下了，先收起一些家具");
  D.layout.push({ id, ...spot }); focus = id;
  refresh(); save();
}
function freeSpot(it) {
  const h = have(), y0 = it.zone === "wall" ? 0 : ROOM.wall, y1 = it.zone === "wall" ? ROOM.wall - it.h : ROOM.h - it.h;
  const ok = [];
  for (let y = y0; y <= y1; y++) for (let x = 0; x + it.w <= ROOM.w; x++) if (!layoutError([...D.layout, { id: it.id, x, y }], h)) ok.push({ x, y });
  // 先找圖不會被別的家具擋住的位置（例如窗戶不要掛在高書櫃後面）
  return ok.find((s) => !D.layout.some((e) => overlapArt({ id: it.id, ...s }, e))) || ok[0] || null;
}
/** 兩件家具的圖有沒有疊在一起 */
function overlapArt(a, b) {
  const r = (e) => { const it = DEN_ITEM.get(e.id), top = e.y + it.h - artH(it); return [e.x, top, e.x + it.w, top + artH(it)]; };
  const [a0, a1, a2, a3] = r(a), [b0, b1, b2, b3] = r(b);
  return a0 < b2 && b0 < a2 && a1 < b3 && b1 < a3;
}
function cancelHold() {
  if (!hold) return;
  if (hold.from) D.layout.push({ id: hold.id, ...hold.from });
  hold = null; refresh();
}
/** 存到伺服器（一次一個，照順序） */
function save() {
  const layout = D.layout.map((e) => ({ ...e }));
  $("#denSave").textContent = "儲存中…";
  saving = saving.then(async () => {
    const r = await C.api("/api/quest/den/save", { layout });
    if (r.error) { C.toast("沒存到：" + r.error); const s = await C.api("/api/quest/den"); if (!s.error && s.login) Object.assign(D, s); $("#denSave").textContent = ""; refresh(); return; }
    $("#denSave").textContent = "✓ 已儲存";
  });
}

/* ---------- 點房間 ---------- */
/** 拿著家具時，滑鼠位置 → 要放的格子（夾在房間和對的區域裡） */
function spotAt(it, p) {
  const tx = Math.floor(p.ax / PX), ty = Math.floor(p.ay / PX);
  const x = Math.max(0, Math.min(ROOM.w - it.w, tx));
  const y = it.zone === "wall" ? Math.max(0, Math.min(ROOM.wall - it.h, ty)) : Math.max(ROOM.wall, Math.min(ROOM.h - it.h, ty));
  return { x, y };
}
function clickRoom(p) {
  if (hold) {
    const it = DEN_ITEM.get(hold.id), s = spotAt(it, p), next = [...D.layout, { id: it.id, ...s }];
    const err = layoutError(next, have());
    if (err) return C.toast(err);
    D.layout = next; focus = it.id; hold = null;
    refresh(); return save();
  }
  const hit = hitTest(p);
  if (!hit) { // 空的地板：主貓走過去
    const tx = Math.floor(p.ax / PX), ty = Math.floor(p.ay / PX);
    if (ty >= ROOM.wall) { const r = cats.commandTile(tx, ty); if (r) blocked(r); else if (reduce()) draw(); }
  } else { const r = cats.commandUse(hit.id); if (r) blocked(r); else if (r === "" && reduce()) draw(); }
  if (!D.login) return;
  focus = hit ? hit.id : null; openChap = null;
  renderSide();
}
/** 點到哪件家具（看圖上不透明的像素，畫在上面的先算） */
function hitTest(p) {
  const order = drawOrder().filter((d) => d.e).reverse();
  for (const { e } of order) {
    const it = DEN_ITEM.get(e.id), top = (e.y + DEN_ITEM.get(e.id).h - artH(it)) * PX;
    const i = Math.floor(p.ax - e.x * PX), j = Math.floor(p.ay - top);
    if (i >= 0 && j >= 0 && i < it.w * PX && j < it.art.length && it.art[j][i] !== ".") return e;
  }
  return null;
}

/* ---------- 圖片快取 ---------- */
const BOOK = ["#3f6fd1", "#d64545", "#4caf50", "#f5c542", "#8f7cd6", "#e6845a", "#5aa9e6", "#c9693a"];
const DIGIT = {
  0: ["kkk", "k.k", "k.k", "k.k", "kkk"], 1: [".k.", "kk.", ".k.", ".k.", "kkk"], 2: ["kkk", "..k", "kkk", "k..", "kkk"], 3: ["kkk", "..k", ".kk", "..k", "kkk"],
  4: ["k.k", "k.k", "kkk", "..k", "..k"], 5: ["kkk", "k..", "kkk", "..k", "kkk"], 6: ["kkk", "k..", "kkk", "k.k", "kkk"], 7: ["kkk", "..k", ".k.", ".k.", ".k."],
  8: ["kkk", "k.k", "kkk", "k.k", "kkk"], 9: ["kkk", "k.k", "kkk", "..k", "kkk"],
};
const TROPHY = [".bbb.", "bwbwb", "bbbbb", ".ggg.", "ggggg"];
const night = () => { const h = new Date().getHours(); return h >= 18 || h < 6; };
/** 一件家具的圖（含書、獎盃、剪報），畫成 K 倍大的 canvas */
function sprite(it) {
  if (sprites.has(it.id)) return sprites.get(it.id);
  const w = it.w * PX, h = it.art.length, cv = document.createElement("canvas");
  cv.width = w * K; cv.height = h * K;
  const c = cv.getContext("2d"), dot = (x, y, col) => { c.fillStyle = col; c.fillRect(x * K, y * K, K, K); };
  const pal = it.id === "den-window" && night() ? { ...it.pal, s: "#24345e", u: "#f5e27a" } : it.pal;
  it.art.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") dot(x, y, pal[ch]); }));
  if (it.learn === "books") D.books.slice(0, it.slots.length).forEach((id, n) => {
    const [x, y] = it.slots[n], col = BOOK[n % BOOK.length], tall = n % 3 === 1 ? 1 : 0;
    for (let j = tall; j < 5; j++) for (let i = 0; i < 2; i++) dot(x + i, y + j, j === tall ? "#fff3e0" : col);
    dot(x, y + 3, "#ffffffaa");
  });
  if (it.learn === "trophies") D.trophies.slice(0, it.slots.length).forEach((id, n) => {
    const [x, y] = it.slots[n], b = LEVELS.get(id)?.boss.color || "#d65a5a";
    TROPHY.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") dot(x + i, y + j, ch === "b" ? b : ch === "g" ? "#d9b44a" : "#ffffff"); }));
  });
  if (it.learn === "news" && D.news > 0) {
    it.slots.slice(0, Math.min(D.news, it.slots.length)).forEach(([x, y]) => {
      for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) dot(x + i, y + j, (j === 2 || j === 4) && i > 0 && i < 5 ? "#9a9aa8" : "#fff8ec");
      dot(x + 2, y, "#d64545");
    });
    const [tx, ty] = it.countAt, s = String(Math.min(99, D.news));
    for (let j = 0; j < 7; j++) for (let i = 0; i < 8; i++) dot(tx + i, ty + j, "#fff3e0");
    [...s].forEach((d, k) => DIGIT[d].forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") dot(tx + 1 + (s.length === 1 ? 2 : 0) + k * 4 + i, ty + 1 + j, "#3b2418"); })));
  }
  sprites.set(it.id, cv);
  return cv;
}
/** 牆壁和地板（只畫一次） */
function background() {
  if (bg) return bg;
  const cv = document.createElement("canvas"); cv.width = AW * K; cv.height = AH * K;
  const c = cv.getContext("2d"), dot = (x, y, col) => { c.fillStyle = col; c.fillRect(x * K, y * K, K, K); };
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let y = 0; y < FLOOR_Y; y++) for (let x = 0; x < AW; x++) {
    let col = x % 8 < 2 ? "#f1d9b2" : "#f8e8cc";
    if (x % 8 === 5 && y % 8 === 4) col = "#ebc995"; // 小點點壁紙
    if (y < 2) col = y === 0 ? "#8a5428" : "#b77940";
    if (y >= FLOOR_Y - 3) col = y === FLOOR_Y - 3 ? "#8a5428" : "#b77940";
    dot(x, y, col);
  }
  const wood = ["#c8915a", "#c08850", "#cf9a62", "#bb8249"];
  for (let y = FLOOR_Y; y < AH; y++) {
    const r = Math.floor((y - FLOOR_Y) / 4), off = (r * 7) % 16;
    for (let x = 0; x < AW; x++) {
      const plank = Math.floor((x + off) / 16);
      let col = wood[(plank * 3 + r * 5) % wood.length];
      if ((y - FLOOR_Y) % 4 === 3 || (x + off) % 16 === 0) col = "#9a6638";
      else if (rnd() < 0.05) col = "#d6a46c";
      if (y === FLOOR_Y) col = "#9a6638";
      dot(x, y, col);
    }
  }
  bg = cv;
  return cv;
}

/* ---------- 貓（client/den-cats.js） ---------- */
const cats = new Cats(() => D.layout, (e, row) => drawItem($("#denCv").getContext("2d"), e, 1, row), (m) => blocked(m));
/** 貓走不過去：跳出提示，房間下面也寫一下 */
let tipT = 0;
function blocked(m) {
  C.toast(m);
  $("#denTip").textContent = "🐾 " + m; clearTimeout(tipT);
  tipT = setTimeout(renderHint, 3000);
}
const zOf = (id) => { const e = placed(id), it = e && DEN_ITEM.get(e.id); return e ? (e.y + it.h) * PX - 0.5 : 0; };

/* ---------- 畫房間 ---------- */
/** 要畫的東西，照前後排好：牆上的、地毯，然後地板家具和貓依腳的位置 */
function drawOrder() {
  const L = D.layout;
  const it = (e) => DEN_ITEM.get(e.id);
  const out = [];
  for (const e of L) {
    const x = it(e), z = x.zone === "wall" ? -2 : x.flat ? -1 : (e.y + x.h) * PX - 0.5;
    out.push({ e, z });
  }
  for (const k of cats.drawables(K, zOf)) out.push({ cat: k, z: k.z });
  return out.sort((a, b) => a.z - b.z);
}
function drawItem(c, e, alpha = 1, rows = null) {
  const it = DEN_ITEM.get(e.id), s = sprite(it), top = e.y + it.h - artH(it);
  c.globalAlpha = alpha;
  const y0 = rows ? rows : 0, h = it.art.length - y0;
  c.drawImage(s, 0, y0 * K, it.w * PX * K, h * K, e.x * PX * K, (top * PX + y0) * K, it.w * PX * K, h * K);
  c.globalAlpha = 1;
}
function draw(t = performance.now()) {
  const cv = $("#denCv"); if (!cv) return;
  const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
  c.drawImage(background(), 0, 0);
  if (hold) { // 可以放的區域
    const it = DEN_ITEM.get(hold.id);
    c.fillStyle = "rgba(109,174,79,.12)";
    if (it.zone === "wall") c.fillRect(0, 0, AW * K, FLOOR_Y * K); else c.fillRect(0, FLOOR_Y * K, AW * K, (AH - FLOOR_Y) * K);
    c.strokeStyle = "rgba(59,36,24,.18)"; c.lineWidth = 2;
    for (let x = 0; x <= ROOM.w; x++) { c.beginPath(); c.moveTo(x * PX * K, 0); c.lineTo(x * PX * K, AH * K); c.stroke(); }
    for (let y = 0; y <= ROOM.h; y++) { c.beginPath(); c.moveTo(0, y * PX * K); c.lineTo(AW * K, y * PX * K); c.stroke(); }
  }
  for (const d of drawOrder()) {
    if (d.cat) d.cat.draw(c, t);
    else drawItem(c, d.e);
    if (focus && d.e?.id === focus && !hold) outline(c, d.e, "#d9741a");
  }
  if (hold && hover) {
    const it = DEN_ITEM.get(hold.id), s = spotAt(it, hover), e = { id: it.id, ...s };
    const okk = !layoutError([...D.layout, e], have());
    drawItem(c, e, 0.65);
    c.strokeStyle = okk ? "#3f8f2f" : "#d4302f"; c.lineWidth = 6;
    c.strokeRect(s.x * PX * K + 3, s.y * PX * K + 3, it.w * PX * K - 6, it.h * PX * K - 6);
  }
}
function outline(c, e, col) {
  const it = DEN_ITEM.get(e.id), top = e.y + it.h - artH(it);
  c.strokeStyle = col; c.lineWidth = 4; c.setLineDash([12, 8]);
  c.strokeRect(e.x * PX * K + 2, top * PX * K + 2, it.w * PX * K - 4, artH(it) * PX * K - 4);
  c.setLineDash([]);
}
function start() {
  cancelAnimationFrame(raf);
  if (reduce()) { draw(); return; }
  last = performance.now();
  const loop = (t) => {
    if ($("#den").hidden) { raf = 0; return; }
    cats.update(t, Math.min(0.1, (t - last) / 1000)); last = t;
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
