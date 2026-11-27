// 貓窩裡的貓：走動、用家具的小動作、兩隻貓碰鼻子。只在前端畫圖，不影響伺服器。
// 每一隻貓是一種擁有的毛色（最多 MAX_CATS 隻）；第一隻是「主貓」，穿玩家現在的裝扮，其他的只有毛色。
// 姿勢圖：16 × 12 格，字母和 cat.js 一樣（k 外框、o 毛、w 肚子、e 眼睛、p 鼻子），畫的時候和換裝貓一樣往下 2 格（上面留給帽子）。全部原創。
import { ROOM, PX, DEN_ITEM, artH } from "/shared/den.js";
import { ITEM } from "/shared/items.js";
import { BODY, LEGS, drawDressed } from "/cat.js";

export const MAX_CATS = 5;
const AW = ROOM.w * PX, AH = ROOM.h * PX, FLOOR_Y = ROOM.wall * PX;
const SPEED = 12; // 每秒走幾個像素
const JUMP_MS = 450;

const POSE = {
  STAND0: BODY.concat(LEGS[0]), STAND1: BODY.concat(LEGS[1]),
  SIT: ["..........k...k.", ".........kok.kok", ".........koooook", ".........kooeoek", ".........kooopok", "........kkoooook", ".......koowwwkk.", "......kooowwwk..", "......kooowwwk..", "..kk..koooowwk..", ".k..k.kooookok..", "..kkkkkkkkkkkk.."],
  SIT2: ["..........k...k.", ".........kok.kok", ".........koooook", ".........kooeoek", ".........kooopok", "........kkoooook", ".......koowwwkk.", "......kooowwwk..", "k.....kooowwwk..", ".k....koooowwk..", ".k....kooookok..", "..kkkkkkkkkkkk.."],
  LICK: ["..........k...k.", ".........kok.kok", ".........koooook", ".........kooeoek", ".........kooopok", "........kkooooko", ".......koowwwkok", "......kooowwwk..", "......kooowwwk..", "..kk..koooowwk..", ".k..k.kooookok..", "..kkkkkkkkkkkk.."],
  YAWN: ["..........k...k.", ".........kok.kok", ".........koooook", ".........kookokk", ".........koooppk", "........kkooopkk", ".......koowwwkk.", "......kooowwwk..", "......kooowwwk..", "..kk..koooowwk..", ".k..k.kooookok..", "..kkkkkkkkkkkk.."],
  LOAF: ["................", "................", "..........k...k.", ".........kok.kok", ".........koooook", "k........kooeoek", "ko.......kooopok", ".ko.kkkkkkoooook", "..kkoooooooooook", "..kowwoooooowwk.", "..koooooooooook.", "...kkkkkkkkkkk.."],
  SLEEP: ["................", "................", "..........k...k.", ".........kok.kok", ".........koooook", "k........kookokk", "ko.......kooopok", ".ko.kkkkkkoooook", "..kkoooooooooook", "..kowwoooooowwk.", "..koooooooooook.", "...kkkkkkkkkkk.."],
  SNIFF: ["................", "................", "..........k...k.", "k........kok.kok", "ko.......koooook", ".ko.kkkkkkooeoek", "..kkoooookooopok", "..kowwoookoooook", "..koooooooooook.", "...kkkkkkkkkkk..", "...ko.ko..ko.ko.", "...kk.kk..kk.kk."],
  STRETCH: ["................", "................", "..........k...k.", "k........kok.kok", "ko.......koooook", ".ko.kkkkkkooeoek", "..kkoooookooopok", "..kowwoookoooook", "..koooooooooook.", "...kkkkkkkkkkk..", "...ko.ko...kokok", "...kk.kk...kkkkk"],
  UP0: ["........k...k...", ".......kok.kok..", ".......koooook.k", ".......kooeoekok", ".......kooopok.k", "........kooookk.", ".......koowwkk..", ".......koowwkok.", ".......koowwk.kk", "...kk..koooook..", "..k....kook.ok..", "...kkkkkkkk.kk.."],
  UP1: ["........k...k...", ".......kok.kok..", ".......koooook..", ".......kooeoek..", ".......kooopokk.", "........kooookok", ".......koowwkk.k", ".......koowwkok.", ".......koowwk.k.", "...kk..koooook..", "..k....kook.ok..", "...kkkkkkkk.kk.."],
  BACK0: ["................", "................", "................", "..kk..kk.kk.....", "..ok..ok.ok.....", "..ok..ok.ok.....", ".kkwwwwwwwkkkkkk", "kowwwwwwwwkooook", ".kookoooookoopok", "..kkkkkkkkkoeoek", "..........kooook", "..........k.k.k."],
  BACK1: ["................", "................", ".kk..kk.........", ".ok..ok..kk.....", "..ok..ok.ok.....", "..ok..ok.ok.....", ".kkwwwwwwwkkkkkk", "kowwwwwwwwkooook", ".kookoooookoopok", "..kkkkkkkkkoeoek", "..........kooook", "..........k.k.k."],
  LOOK0: [".....k...k......", "....kok.kok.....", "....kooooook....", "....kooooook....", "....kooooook....", ".....kooook.....", "....koooooook...", "...koooooooook..", "...koooooooook.k", "...koooooooook.k", "...koooooooookk.", "....kkkkkkkkkk.."],
  LOOK1: [".....k...k......", "....kok.kok.....", "....kooooook....", "....kooooook....", "....kooooook....", ".....kooook.....", "....koooooook...", "...koooooooook..", "k..koooooooook..", "k..koooooooook..", ".kkkoooooooook..", "....kkkkkkkkkk.."],
};
// 這些姿勢的頭在哪裡（相對站姿的位移），主貓的帽子、臉、脖子裝扮跟著畫；沒列的（翻肚、背影）不畫裝扮
const ACC = { SIT: [0, 0], SIT2: [0, 0], LICK: [0, 0], YAWN: [0, 0], LOAF: [0, 2], SLEEP: [0, 2], SNIFF: [0, 2], STRETCH: [0, 2], UP0: [-2, 0], UP1: [-2, 0] };
const HEART = [".h.h.", "hhhhh", ".hhh.", "..h.."];
const ZZ = ["kkkk", "..k.", ".k..", "kkkk"];
// 沒事做的時候的小動作：[名稱, 毫秒]
const FREE = [["groom", 3200], ["stretch", 2000], ["swish", 3000], ["yawn", 2200]];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const center = (tx, ty) => ({ x: Math.max(8, Math.min(AW - 8, tx * PX + 4)), y: ty * PX + 6 }); // 貓 16 格寬，靠牆的格子往內一點才不會被切掉
const tileOf = (p) => ({ tx: Math.max(0, Math.min(ROOM.w - 1, Math.floor(p.x / PX))), ty: Math.max(ROOM.wall, Math.min(ROOM.h - 1, Math.floor((p.y - 1) / PX))) });
const inRoom = (p) => p.x >= 6 && p.x <= AW - 6;

export class Cats {
  /** layout()：目前的擺設；front(e, row)：重畫家具某一列以下（紙箱前緣蓋住貓） */
  constructor(layout, front) { this.layout = layout; this.front = front; this.list = []; this.boops = new Map(); this.still = false; }

  /* ---------- 地板與家具 ---------- */
  placed(id) { return this.layout().find((e) => e.id === id); }
  /** 這一格被不是平的地板家具佔住（地毯可以走） */
  blocked(tx, ty) {
    if (tx < 0 || tx >= ROOM.w || ty < ROOM.wall || ty >= ROOM.h) return true;
    return this.layout().some((e) => { const it = DEN_ITEM.get(e.id); return it.zone === "floor" && !it.flat && tx >= e.x && tx < e.x + it.w && ty >= e.y && ty < e.y + it.h; });
  }
  /** 別隻貓站著或正要去的格子 */
  taken(tx, ty, self) {
    return this.list.some((c) => c !== self && [tileOf(c), c.mode === "walk" ? tileOf({ x: c.tx, y: c.ty }) : null].some((t) => t && t.tx === tx && t.ty === ty));
  }
  freeTiles(self) {
    const out = [];
    for (let ty = ROOM.wall; ty < ROOM.h; ty++) for (let tx = 0; tx < ROOM.w; tx++) if (!this.blocked(tx, ty) && !this.taken(tx, ty, self)) out.push({ tx, ty });
    return out;
  }
  /** 一件家具怎麼用：站哪裡、面向哪邊、做什麼（perch＝跳上去的位置） */
  use(e) {
    const it = DEN_ITEM.get(e.id), bottom = (e.y + it.h) * PX, top = (e.y + it.h - artH(it)) * PX;
    if (it.sit) return { stand: { x: e.x * PX + it.sit[0], y: Math.min(AH - 1, bottom + 3) }, perch: { x: e.x * PX + it.sit[0], y: top + it.sit[1] }, act: "nap", face: 1 };
    if (e.id === "den-scratch" || e.id === "den-plant") {
      const gap = e.id === "den-scratch" ? 4 : 5, l = { x: e.x * PX - gap, y: bottom, face: 1 }, r = { x: e.x * PX + PX + gap, y: bottom, face: -1 };
      const s = inRoom(l) ? l : inRoom(r) ? r : null;
      return s && { stand: { x: s.x, y: s.y }, face: s.face, act: e.id === "den-scratch" ? "scratch" : "plant" };
    }
    if (e.id === "den-rug") return { stand: { x: e.x * PX + 8 + Math.round(rand(0, it.w * PX - 16)), y: e.y * PX + 11 }, face: pick([1, -1]), act: "rug" };
    if (e.id === "den-window") {
      if (this.blocked(e.x, ROOM.wall) && this.blocked(e.x + 1, ROOM.wall)) return null;
      return { stand: { x: e.x * PX + 8, y: FLOOR_Y + 6 }, face: 1, act: "window" };
    }
    return null;
  }
  /** 這個點附近有沒有別隻貓（站著的位置或正要走去的位置） */
  crowded(p, self, r = 9) {
    return this.list.some((o) => o !== self && [o, o.mode === "walk" ? { x: o.tx, y: o.ty } : null].some((q) => q && Math.abs(q.x - p.x) < r && Math.abs(q.y - p.y) < 6));
  }
  claimed(id, self) { return this.list.some((c) => c !== self && c.goal?.id === id); }

  /* ---------- 開始 ---------- */
  /** furs：擁有的毛色；outfit：主貓的裝扮；still：減少動態（不走動、不動畫） */
  reset(furs, outfit, still) {
    this.still = still;
    const main = outfit?.fur || "fur-orange";
    const all = [main, ...furs.filter((f) => f !== main && ITEM.get(f)?.fur)].slice(0, MAX_CATS);
    const t = performance.now();
    this.list = [];
    all.forEach((fur, i) => {
      const c = { fur, main: i === 0, outfit: i === 0 ? outfit : { fur }, mode: "idle", until: t + 800 + i * 1100, face: i % 2 ? -1 : 1, x: AW / 2, y: AH - 6 };
      this.list.push(c);
      const free = this.freeTiles(c);
      // 盡量分散：從空格裡平均挑
      const tile = free.length ? free[Math.floor(((i * 7 + 3) % 11) / 11 * free.length)] : { tx: 6, ty: ROOM.h - 1 };
      Object.assign(c, center(tile.tx, tile.ty));
    });
    if (still) this.stillScene();
  }
  /** 減少動態：主貓坐在第一個能坐的家具上，其他貓坐著或趴著，都不動 */
  stillScene() {
    const poses = ["SIT", "LOAF", "SLEEP", "SIT"];
    this.list.forEach((c, i) => {
      c.mode = "act"; c.act = { name: "pose", pose: i ? poses[(i - 1) % poses.length] : "SIT", t0: 0, until: Infinity };
    });
    const m = this.list[0], e = this.layout().find((x) => DEN_ITEM.get(x.id).sit);
    if (m && e) { const u = this.use(e); Object.assign(m, u.perch, { perch: e.id, goal: { id: e.id, at: { x: e.x, y: e.y }, u } }); }
  }

  /* ---------- 行動 ---------- */
  walk(c, p, goal = null) {
    if (c.perch) return this.hopDown(c, { p, goal });
    c.goal = goal;
    Object.assign(c, { mode: "walk", tx: p.x, ty: p.y, act: null });
  }
  hopDown(c, next) {
    const e = this.placed(c.perch), u = c.goal?.u;
    const to = e && u ? u.stand : { x: c.x, y: AH - 6 };
    Object.assign(c, { mode: "jump", from: { x: c.x, y: c.y }, to, t0: performance.now(), perch: null, act: null, next: next || null });
    if (!next) c.goal = null;
  }
  goUse(c, e) {
    const u = this.use(e);
    if (!u) return false;
    this.walk(c, u.stand, { id: e.id, at: { x: e.x, y: e.y }, u });
    return true;
  }
  wander(c) {
    const near = (t) => this.crowded(center(t.tx, t.ty), c, 12);
    const free = this.freeTiles(c).filter((t) => Math.abs(t.tx - tileOf(c).tx) <= 5 && !near(t));
    if (!free.length) return this.idle(c, performance.now());
    const t = pick(free); this.walk(c, center(t.tx, t.ty));
  }
  idle(c, t, ms = rand(1500, 4000)) { Object.assign(c, { mode: "idle", until: t + ms, act: null }); if (!c.perch) c.goal = null; }
  startAct(c, name, t, ms) { Object.assign(c, { mode: "act", act: { name, t0: t, until: t + ms } }); }
  /** 讓這隻貓放下手邊的事（被主貓搶位置、家具被搬走） */
  release(c) {
    if (c.perch) this.hopDown(c);
    else { c.goal = null; this.idle(c, performance.now(), 300); }
  }
  think(c, t) {
    const r = Math.random();
    if (r < 0.42) {
      const opts = this.layout().filter((e) => { const u = !this.claimed(e.id, c) && this.use(e); return u && (u.perch || !this.crowded(u.stand, c)); });
      if (opts.length && this.goUse(c, pick(opts))) return;
    }
    if (r < 0.75) return this.wander(c);
    const [name, ms] = pick(FREE);
    this.startAct(c, name, t, ms);
  }

  /* ---------- 玩家操作（只動主貓） ---------- */
  get mainCat() { return this.list[0]; }
  /** 叫主貓走到某一格；那一格的別隻貓會讓開 */
  commandTile(tx, ty) {
    const m = this.mainCat;
    if (!m || this.blocked(tx, ty)) return false;
    for (const c of this.list) if (c !== m) { const k = tileOf(c); if ((k.tx === tx && k.ty === ty) || (c.mode === "walk" && tileOf({ x: c.tx, y: c.ty }).tx === tx && tileOf({ x: c.tx, y: c.ty }).ty === ty)) this.wander(c); }
    if (this.still) { const q = center(tx, ty); this.shooStill(q); Object.assign(m, q, { perch: null, goal: null }); m.act = { name: "pose", pose: "SIT", t0: 0, until: Infinity }; return true; }
    this.walk(m, center(tx, ty));
    return true;
  }
  /** 叫主貓去用某件家具；正在用的別隻貓會讓出來 */
  commandUse(id) {
    const m = this.mainCat, e = this.placed(id);
    if (!m || !e || !this.use(e)) return false;
    if (m.goal?.id === id && (m.perch || m.mode === "act")) return true;
    for (const c of this.list) if (c !== m && c.goal?.id === id) this.release(c);
    if (this.still) {
      const u = this.use(e);
      if (!u.perch) this.shooStill(u.stand);
      Object.assign(m, u.perch || u.stand, { perch: u.perch ? id : null, face: u.face, goal: { id, at: { x: e.x, y: e.y }, u } });
      m.act = { name: "pose", pose: u.perch ? "SIT" : u.act === "window" ? "LOOK0" : u.act === "scratch" ? "UP0" : "SIT", t0: 0, until: Infinity };
      return true;
    }
    return this.goUse(m, e);
  }
  /** 減少動態：主貓瞬間移到 p，擋在那裡的別隻貓換到別的空格 */
  shooStill(p) {
    for (const o of this.list) if (o !== this.mainCat && !o.perch && Math.abs(o.x - p.x) < 12 && Math.abs(o.y - p.y) < 6) {
      const t = this.freeTiles(o).find((k) => !this.crowded(center(k.tx, k.ty), o, 14) && !(Math.abs(center(k.tx, k.ty).x - p.x) < 14 && Math.abs(center(k.tx, k.ty).y - p.y) < 6));
      if (t) Object.assign(o, center(t.tx, t.ty));
    }
  }
  /** 方向鍵：主貓走一格 */
  step(dx, dy) {
    const m = this.mainCat; if (!m) return false;
    const base = m.mode === "walk" ? { x: m.tx, y: m.ty } : m.perch && m.goal?.u ? m.goal.u.stand : m;
    const t = tileOf(base);
    return this.commandTile(t.tx + dx, t.ty + dy);
  }
  /** 擺設改了：用到被搬走的家具的貓回到地板 */
  fix() {
    for (const c of this.list) {
      const e = c.goal && this.placed(c.goal.id);
      if (c.goal && (!e || e.x !== c.goal.at.x || e.y !== c.goal.at.y)) {
        const wasUp = c.perch || c.y < FLOOR_Y + 4;
        Object.assign(c, { perch: null, goal: null, next: null });
        if (wasUp) c.y = Math.max(c.y, FLOOR_Y + 6) > AH - 2 ? AH - 6 : Math.max(c.y + 8, FLOOR_Y + 6);
        if (this.still) { c.act = { name: "pose", pose: "SIT", t0: 0, until: Infinity }; c.mode = "act"; }
        else this.idle(c, performance.now(), 500);
      }
    }
  }

  /* ---------- 每一格畫面 ---------- */
  update(t, dt) {
    if (this.still) return;
    for (const c of this.list) {
      if (c.mode === "idle" && t > c.until) this.think(c, t);
      else if (c.mode === "walk") {
        const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy), s = SPEED * dt;
        if (Math.abs(dx) > 0.5) c.face = dx < 0 ? -1 : 1;
        if (d > s) { c.x += (dx / d) * s; c.y += (dy / d) * s; continue; }
        c.x = c.tx; c.y = c.ty;
        const o = this.list.find((x) => x !== c && !x.perch && x.mode !== "jump" && Math.abs(x.x - c.x) < 7 && Math.abs(x.y - c.y) < 5);
        if (o) { // 不要疊在一起：在忙的（或主貓）留著，另一隻讓開
          if (!c.main && (o.main || o.mode === "act")) { this.wander(c); continue; }
          this.wander(o);
        }
        const u = c.goal?.u, e = c.goal && this.placed(c.goal.id);
        if (u && e) {
          if (u.perch) Object.assign(c, { mode: "jump", from: { x: c.x, y: c.y }, to: u.perch, t0: t, perch: e.id, next: null });
          else { c.face = u.face; this.startAct(c, u.act, t, u.act === "window" ? rand(5000, 8000) : u.act === "scratch" ? rand(2500, 4000) : 5000); }
        } else if (Math.random() < 0.3) { const [name, ms] = pick(FREE); this.startAct(c, name, t, ms); }
        else this.idle(c, t);
      } else if (c.mode === "jump" && t - c.t0 > JUMP_MS) {
        Object.assign(c, c.to);
        if (c.next) { const n = c.next; c.next = null; c.mode = "idle"; this.walk(c, n.p, n.goal); }
        else if (c.perch) this.startAct(c, "nap", t, rand(7000, 13000));
        else this.idle(c, t, 1200);
      } else if (c.mode === "act" && t > c.act.until) {
        if (c.perch) this.hopDown(c);
        else this.idle(c, t);
      }
    }
    this.meet(t);
  }
  /** 兩隻貓走近了：有時候碰碰鼻子 */
  meet(t) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], key = a.fur + "|" + b.fur;
      if (!["idle", "walk"].includes(a.mode) || !["idle", "walk"].includes(b.mode) || a.perch || b.perch) continue;
      const gap = Math.abs(a.x - b.x);
      if (gap < 13 || gap > 24 || Math.abs(a.y - b.y) > 5 || (this.boops.get(key) || 0) > t) continue;
      if (L.some((o) => o !== a && o !== b && !o.perch && Math.abs(o.x - (a.x + b.x) / 2) < 18 && Math.abs(o.y - a.y) < 6)) continue; // 旁邊還有別隻貓就不碰
      this.boops.set(key, t + 20000);
      if (Math.random() < 0.4) continue;
      // 面對面、各往前挪幾格讓鼻子碰在一起（不會挪到別隻貓身上）
      const [l, r] = a.x <= b.x ? [a, b] : [b, a], d = (r.x - l.x - 16) / 2, y = (l.y + r.y) / 2;
      Object.assign(l, { x: l.x + d, y, face: 1, goal: null }); Object.assign(r, { x: r.x - d, y, face: -1, goal: null });
      this.startAct(l, "boop", t, 1800); this.startAct(r, "boop", t, 1800); l.act.heart = (l.x + r.x) / 2;
    }
  }

  /** 要畫的貓：{ z（前後順序）, draw(c, t) } */
  drawables(K, zOf) {
    return this.list.map((c) => ({
      z: c.mode === "jump" ? 1e6 : c.perch ? zOf(c.perch) + 0.1 : c.y,
      draw: (ctx, t) => this.drawCat(ctx, c, t, K),
    }));
  }
  pos(c, t) {
    if (c.mode !== "jump") return { x: c.x, y: c.y };
    const a = Math.min(1, (t - c.t0) / JUMP_MS);
    return { x: c.from.x + (c.to.x - c.from.x) * a, y: c.from.y + (c.to.y - c.from.y) * a - Math.sin(a * Math.PI) * 10 };
  }
  /** 現在的姿勢 */
  poseOf(c, t) {
    if (c.mode === "walk") return Math.floor(t / 200) % 2 ? "STAND1" : "STAND0";
    if (c.mode !== "act") return "STAND0";
    const a = c.act, el = t - a.t0, alt = (ms, p, q) => (Math.floor(el / ms) % 2 ? q : p);
    switch (a.name) {
      case "pose": return a.pose;
      case "nap": return el < 2000 ? "SIT" : el < 4000 ? "LOAF" : "SLEEP";
      case "scratch": return alt(180, "UP0", "UP1");
      case "plant": return el < 1500 ? "SNIFF" : alt(260, "BACK0", "BACK1");
      case "rug": return el < 2600 ? alt(300, "BACK0", "BACK1") : "STRETCH";
      case "window": return alt(450, "LOOK0", "LOOK1");
      case "groom": return alt(350, "LICK", "SIT");
      case "stretch": return "STRETCH";
      case "swish": return alt(400, "SIT", "SIT2");
      case "yawn": return el > 600 && el < 1600 ? "YAWN" : "SIT";
      default: return "STAND0";
    }
  }
  drawCat(ctx, c, t, K) {
    const p = this.pos(c, t), pose = this.poseOf(c, t), x0 = Math.round(p.x - 8), y0 = Math.round(p.y - 14), flip = c.face < 0;
    if (pose.startsWith("STAND")) drawDressed(ctx, x0 * K, y0 * K, K, pose === "STAND1" ? 1 : 0, c.outfit, { flip });
    else {
      const fur = (ITEM.get(c.fur) || ITEM.get("fur-orange")).fur, X = (i) => x0 + (flip ? 15 - i : i);
      POSE[pose].forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") { ctx.fillStyle = fur[ch]; ctx.fillRect(X(i) * K, (y0 + j + 2) * K, K + 0.5, K + 0.5); } }));
      const acc = c.main && ACC[pose];
      if (acc) for (const slot of ["neck", "face", "hat"]) {
        const it = ITEM.get(c.outfit?.[slot]);
        if (it?.art) it.art.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") { ctx.fillStyle = it.pal[ch]; ctx.fillRect(X(i + acc[0]) * K, (y0 + it.y + j + acc[1]) * K, K + 0.5, K + 0.5); } }));
      }
    }
    // 紙箱：前緣蓋住貓的腳
    if (c.perch && c.mode === "act") { const e = this.placed(c.perch), it = e && DEN_ITEM.get(e.id); if (it?.front) this.front(e, it.front); }
    if (this.still || c.mode !== "act") return;
    const a = c.act, el = t - a.t0, dot = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x * K, y * K, K, K); };
    const sprite = (S, x, y, col) => S.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") dot(x + i, y + j, col); }));
    if (a.name === "nap" && el > 4000) { // 睡著了 zzz
      const k = Math.floor(el / 700) % 3;
      for (let n = 0; n <= k; n++) sprite(ZZ, Math.round(p.x) + (flip && p.x > 24 ? -10 - n * 8 : 6) + n * 4, Math.round(p.y) - 14 - n * 5, "#6b5a8e");
    }
    if (a.name === "scratch") { // 磨爪：飄出來的毛屑
      const f = Math.floor(el / 120);
      for (let n = 0; n < 3; n++) {
        const dx = ((f * 7 + n * 5) % 5) - 1, dy = ((f * 3 + n * 4) % 7);
        dot(Math.round(p.x) + (flip ? -dx - 7 : dx + 7), Math.round(p.y) - 12 + dy, n % 2 ? "#fff3e0" : "#d8b77a");
      }
    }
    if ((a.name === "plant" && el > 1500) || a.heart) { // 開心：愛心往上飄
      const k = (el % 1200) / 1200, hx = a.heart ? Math.round(a.heart) - 2 : Math.round(p.x) + (Math.floor(el / 1200) % 2 ? -6 : 2);
      sprite(HEART, hx, Math.round(p.y) - (a.heart ? 13 : 17) - Math.round(k * 5), "#e8506a");
    }
  }
}
