// 貓窩裡的貓：走動、用家具的小動作、兩隻貓碰鼻子。只在前端畫圖，不影響伺服器。
// 每一隻貓是一種擁有的毛色（最多 MAX_CATS 隻）；第一隻是「主貓」，穿玩家現在的裝扮，其他的只有毛色。
// 走路：在地板格子上找路（shared/den.js 的 findPath），繞過家具和別隻貓；每隻貓佔一格，踏進下一格前要先預定，所以不會疊在一起。
// 姿勢圖：16 × 12 格，字母和 cat.js 一樣（k 外框、o 毛、w 肚子、e 眼睛、p 鼻子），畫的時候和換裝貓一樣往下 2 格（上面留給帽子）。全部原創。
import { ROOM, PX, DEN_ITEM, artH, findPath, floorBlocked } from "/shared/den.js";
import { ITEM } from "/shared/items.js";
import { BODY, LEGS, drawDressed } from "/cat.js";

export const MAX_CATS = 5;
const AW = ROOM.w * PX;
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

export class Cats {
  /** layout()：目前的擺設；front(e, row)：重畫家具某一列以下（紙箱前緣蓋住貓）；say(msg)：給玩家的提示 */
  constructor(layout, front, say = () => {}) {
    Object.assign(this, { layout, front, say, list: [], boops: new Map(), still: false, fb: new Set() });
  }

  /* ---------- 地板、家具、別隻貓 ---------- */
  placed(id) { return this.layout().find((e) => e.id === id); }
  refreshFloor() { this.fb = floorBlocked(this.layout()); }
  /** 家具擋住（或不在地板上）的格子 */
  furn(tx, ty) { return tx < 0 || tx >= ROOM.w || ty < ROOM.wall || ty >= ROOM.h || this.fb.has(tx + "," + ty); }
  /** 別隻貓站著、正要踏進去、或預定要去的格子 */
  catAt(tx, ty, self) { return this.list.some((c) => c !== self && [c.tile, c.next, c.dest].some((k) => k && k.tx === tx && k.ty === ty)); }
  /** 站在這一格會不會被前面的高家具擋住（例如書櫃、貓跳台的圖蓋過來） */
  hidden(tx, ty) {
    return this.layout().some((e) => {
      const it = DEN_ITEM.get(e.id); if (it.zone !== "floor" || it.flat) return false;
      const bottom = e.y + it.h - 1, top = e.y + it.h - artH(it);
      return bottom > ty && tx >= e.x && tx < e.x + it.w && ty >= top - 1;
    });
  }
  /** 同一列左右隔壁也沒有貓（貓的圖有兩格寬，停下來的地方要留空隙） */
  roomy(tx, ty, self) { return ![-1, 1].some((d) => this.catAt(tx + d, ty, self)); }
  freeTiles(self, { roomy = true, visible = true } = {}) {
    const out = [];
    for (let ty = ROOM.wall; ty < ROOM.h; ty++) for (let tx = 0; tx < ROOM.w; tx++)
      if (!this.furn(tx, ty) && !this.catAt(tx, ty, self) && (!roomy || this.roomy(tx, ty, self)) && (!visible || !this.hidden(tx, ty))) out.push({ tx, ty });
    return out;
  }
  /** 從 from 走到 to 的路：先避開家具和別隻貓；被貓擋住時退而求其次只避開家具（走到前面再等貓讓開） */
  route(c, from, to, cats = true) {
    return (cats && findPath(from, to, (x, y) => this.furn(x, y) || this.catAt(x, y, c))) || findPath(from, to, (x, y) => this.furn(x, y));
  }
  /** 一件家具可以在哪裡用：[{ tile, face, act, perch?, keep? }]（keep＝坐上去還佔著那一格，例如坐墊） */
  spots(e) {
    const it = DEN_ITEM.get(e.id), out = [], add = (tx, ty, o) => { if (!this.furn(tx, ty)) out.push({ tile: { tx, ty }, ...o }); };
    const top = (e.y + it.h - artH(it)) * PX;
    if (it.sit) {
      const perch = { x: e.x * PX + it.sit[0], y: top + it.sit[1] };
      if (it.walk) { for (let i = 0; i < it.w; i++) add(e.x + i, e.y, { act: "nap", face: 1, perch, keep: true }); }
      else {
        for (let i = 0; i < it.w; i++) add(e.x + i, e.y + it.h, { act: "nap", face: 1, perch });
        add(e.x - 1, e.y, { act: "nap", face: 1, perch }); add(e.x + it.w, e.y, { act: "nap", face: -1, perch });
      }
    } else if (e.id === "den-scratch" || e.id === "den-plant") {
      const act = e.id === "den-scratch" ? "scratch" : "plant";
      add(e.x - 1, e.y, { act, face: 1 }); add(e.x + 1, e.y, { act, face: -1 });
    } else if (e.id === "den-rug") {
      for (let i = 0; i < it.w; i++) for (let j = 0; j < it.h; j++) add(e.x + i, e.y + j, { act: "rug", face: (i + j) % 2 ? 1 : -1 });
    } else if (e.id === "den-window") {
      for (let i = 0; i < it.w; i++) add(e.x + i, ROOM.wall, { act: "window", face: 1 });
    }
    return out.filter((s) => s.tile.ty >= ROOM.wall && s.tile.ty < ROOM.h);
  }
  claimed(id, self) { return this.list.some((c) => c !== self && c.goal?.id === id); }
  /** 地板上沒被家具擋住的格子數（拿來判斷房間擠不擠） */
  floorFree() { let n = 0; for (let ty = ROOM.wall; ty < ROOM.h; ty++) for (let tx = 0; tx < ROOM.w; tx++) if (!this.furn(tx, ty)) n++; return n; }
  get crowdedRoom() { return this.floorFree() < this.list.length * 6; }

  /* ---------- 開始 ---------- */
  /** furs：擁有的毛色；outfit：主貓的裝扮；still：減少動態（不走動、不動畫） */
  reset(furs, outfit, still) {
    this.still = still; this.refreshFloor();
    const main = outfit?.fur || "fur-orange";
    const all = [main, ...furs.filter((f) => f !== main && ITEM.get(f)?.fur)].slice(0, MAX_CATS);
    const t = performance.now();
    this.list = [];
    all.forEach((fur, i) => {
      const c = { fur, main: i === 0, outfit: i === 0 ? outfit : { fur }, mode: "idle", until: t + 800 + i * 1300, face: i % 2 ? -1 : 1, tile: null, next: null, dest: null, path: [], goal: null, perch: null };
      if (this.placeCat(c, i)) this.list.push(c); // 房間太擠、沒有地方放的貓就先不出來
    });
    if (still) this.stillScene();
  }
  /** 找一個地方放貓：分散在看得到的空格；沒有空格就坐到家具上 */
  placeCat(c, i) {
    this.list.push(c);
    let free = this.freeTiles(c);
    if (!free.length) free = this.freeTiles(c, { roomy: false });
    this.list.pop();
    if (free.length) {
      const k = free[Math.floor((((i * 7 + 3) % 11) / 11) * free.length)];
      Object.assign(c, center(k.tx, k.ty), { tile: k });
      return true;
    }
    for (const e of this.layout()) {
      if (!DEN_ITEM.get(e.id).sit || this.claimed(e.id, c) || this.list.some((o) => o.perch === e.id)) continue;
      const s = this.spots(e)[0];
      if (!s || (s.keep && this.catAt(s.tile.tx, s.tile.ty, c))) continue;
      Object.assign(c, s.perch, { perch: e.id, goal: { id: e.id, at: { x: e.x, y: e.y }, spot: s }, tile: s.keep ? s.tile : null, mode: "act", act: { name: "nap", t0: performance.now() - 4000, until: performance.now() + rand(8000, 15000) } });
      return true;
    }
    return false;
  }
  /** 減少動態：主貓坐在第一個能坐的家具上，其他貓坐著或趴著，都不動 */
  stillScene() {
    const poses = ["SIT", "LOAF", "SLEEP", "SIT"];
    this.list.forEach((c, i) => { c.mode = "act"; c.act = { name: "pose", pose: c.perch ? "SLEEP" : i ? poses[(i - 1) % poses.length] : "SIT", t0: 0, until: Infinity }; });
    const m = this.list[0], e = m && !m.perch && this.layout().find((x) => DEN_ITEM.get(x.id).sit && !this.list.some((o) => o.perch === x.id));
    const s = e && this.spots(e).find((k) => !k.keep || !this.catAt(k.tile.tx, k.tile.ty, m));
    if (s) Object.assign(m, s.perch, { perch: e.id, tile: s.keep ? s.tile : null, goal: { id: e.id, at: { x: e.x, y: e.y }, spot: s } });
  }

  /* ---------- 行動 ---------- */
  idle(c, t, ms = rand(1500, 4000)) { Object.assign(c, { mode: "idle", until: t + ms, act: null, dest: null, path: [] }); if (!c.perch) c.goal = null; }
  startAct(c, name, t, ms) { Object.assign(c, { mode: "act", act: { name, t0: t, until: t + ms }, dest: null, path: [] }); }
  /** 走到 to（格子）；goal＝到了要用的家具。坐在家具上的話先跳下來。回傳 false＝走不到 */
  walkTo(c, to, goal = null) {
    if (c.perch) { c.after = { to, goal }; return this.hopDown(c); }
    const path = this.route(c, c.tile, to);
    if (!path) return false;
    Object.assign(c, { mode: "walk", path, dest: to, goal, act: null, waitT: 0, next: null });
    if (!path.length) this.arrive(c, performance.now());
    return true;
  }
  /** 從家具上跳下來：要有空的格子落地，沒有就繼續待著 */
  hopDown(c) {
    const e = this.placed(c.perch), s = c.goal?.spot;
    let land = s?.keep ? s.tile : null;
    if (!land && e) land = this.spots(e).map((k) => k.tile).find((k) => !this.catAt(k.tx, k.ty, c));
    if (!land) land = this.freeTiles(c, { roomy: false, visible: false }).find((k) => Math.abs(center(k.tx, k.ty).x - c.x) <= 16 && Math.abs(center(k.tx, k.ty).y - c.y) <= 16); // 只跳到旁邊的格子
    if (!land) { this.startAct(c, "nap", performance.now() - 4000, 3000); return false; }
    Object.assign(c, { mode: "jump", from: { x: c.x, y: c.y }, to: center(land.tx, land.ty), t0: performance.now(), perch: null, act: null, tile: land, landed: "floor" });
    return true;
  }
  /** 到了目的地 */
  arrive(c, t) {
    c.dest = null; c.path = [];
    const s = c.goal?.spot, e = c.goal && this.placed(c.goal.id);
    if (s && e) {
      if (s.perch) {
        Object.assign(c, { mode: "jump", from: { x: c.x, y: c.y }, to: s.perch, t0: t, perch: e.id, landed: "perch" });
        if (!s.keep) c.tile = null; // 跳上紙箱、貓跳台：地板那一格讓出來
      } else { c.face = s.face; this.startAct(c, s.act, t, s.act === "window" ? rand(5000, 8000) : s.act === "scratch" ? rand(2500, 4000) : 5000); }
    } else if (Math.random() < 0.3) { const [name, ms] = pick(FREE); this.startAct(c, name, t, ms); }
    else this.idle(c, t);
  }
  /** 去用家具：挑一個走得到、沒有別隻貓的位置 */
  goUse(c, e) {
    const opts = this.spots(e).filter((s) => !this.catAt(s.tile.tx, s.tile.ty, c));
    const from = c.tile || this.groundOf(c);
    const reach = opts.map((s) => ({ s, p: from && this.route(c, from, s.tile) })).filter((x) => x.p).sort((a, b) => a.p.length - b.p.length);
    if (!reach.length) return false;
    return this.walkTo(c, reach[0].s.tile, { id: e.id, at: { x: e.x, y: e.y }, spot: reach[0].s });
  }
  /** 坐在家具上的貓，跳下來大概會在哪一格 */
  groundOf(c) { const e = c.perch && this.placed(c.perch); if (!e) return null; const s = this.spots(e); return (s.find((k) => !this.catAt(k.tile.tx, k.tile.ty, c)) || s[0])?.tile || null; }
  wander(c) {
    const here = c.tile;
    const free = this.freeTiles(c).map((k) => ({ k, p: here && this.route(c, here, k, true) })).filter((x) => x.p && x.p.length && x.p.length <= 7);
    if (!free.length) return false;
    const x = pick(free); return this.walkTo(c, x.k);
  }
  /** 讓這隻貓放下手邊的事（被主貓搶位置、家具被搬走） */
  release(c) {
    c.goal = c.perch ? c.goal : null;
    if (c.perch) this.hopDown(c); else this.idle(c, performance.now(), 300);
  }
  /** 同時在走的貓（不算主貓） */
  moving(self) { return this.list.filter((c) => c !== self && !c.main && (c.mode === "walk" || c.mode === "jump")).length; }
  think(c, t) {
    const busy = !c.main && this.moving(c) >= 2, crowded = this.crowdedRoom;
    const perchOpts = () => this.layout().filter((e) => DEN_ITEM.get(e.id).sit && !this.claimed(e.id, c) && !this.list.some((o) => o.perch === e.id));
    if (!busy) {
      // 房間擠的時候優先跳到家具上（騰出地板），不然就在原地睡
      if (crowded && Math.random() < 0.6) { const o = perchOpts(); if (o.length && this.goUse(c, pick(o))) return; }
      const r = Math.random();
      if (r < 0.42) {
        const opts = this.layout().filter((e) => !this.claimed(e.id, c) && !this.list.some((o) => o !== c && o.perch === e.id) && this.spots(e).length);
        if (opts.length && this.goUse(c, pick(opts))) return;
      }
      if (r < (crowded ? 0.55 : 0.75) && this.wander(c)) return;
    }
    if (crowded || busy ? Math.random() < 0.5 : Math.random() < 0.15) return this.startAct(c, "snooze", t, rand(6000, 12000));
    const [name, ms] = pick(FREE); this.startAct(c, name, t, ms);
  }

  /* ---------- 玩家操作（只動主貓） ---------- */
  get mainCat() { return this.list[0]; }
  /** 叫主貓走到某一格。回傳 "" 或走不過去的原因 */
  commandTile(tx, ty) {
    const m = this.mainCat;
    if (!m) return "走不過去";
    if (this.furn(tx, ty)) return "走不過去：那裡有家具";
    const from = m.tile || this.groundOf(m);
    if (from && !findPath(from, { tx, ty }, (x, y) => this.furn(x, y))) return "走不過去：被家具圍住了";
    // 那一格的別隻貓讓開
    for (const c of this.list) if (c !== m && [c.tile, c.dest].some((k) => k && k.tx === tx && k.ty === ty)) {
      if (this.still) this.shooStill(c, { tx, ty }); else if (!this.wander(c)) return "走不過去：那隻貓不想讓開";
    }
    if (this.still) { const q = { tx, ty }; Object.assign(m, center(tx, ty), { tile: q, perch: null, goal: null }); m.act = { name: "pose", pose: "SIT", t0: 0, until: Infinity }; return ""; }
    return this.walkTo(m, { tx, ty }) ? "" : "走不過去";
  }
  /** 叫主貓去用某件家具；正在用的別隻貓會讓出來。回傳 "" 或原因（不能用的家具回傳 null） */
  commandUse(id) {
    const m = this.mainCat, e = this.placed(id);
    if (!m || !e || !this.spots(e).length) return null;
    if (m.goal?.id === id && (m.perch || m.mode === "act" || m.mode === "walk")) return "";
    for (const c of this.list) if (c !== m && (c.goal?.id === id || c.perch === id)) this.release(c);
    if (this.still) {
      const s = this.spots(e).find((k) => !this.catAt(k.tile.tx, k.tile.ty, m)) || this.spots(e)[0];
      for (const c of this.list) if (c !== m && c.tile && c.tile.tx === s.tile.tx && c.tile.ty === s.tile.ty) this.shooStill(c, s.tile);
      Object.assign(m, s.perch || center(s.tile.tx, s.tile.ty), { perch: s.perch ? id : null, tile: s.perch && !s.keep ? null : s.tile, face: s.face, goal: { id, at: { x: e.x, y: e.y }, spot: s } });
      m.act = { name: "pose", pose: s.perch ? "SIT" : s.act === "window" ? "LOOK0" : s.act === "scratch" ? "UP0" : "SIT", t0: 0, until: Infinity };
      return "";
    }
    if (this.goUse(m, e)) return "";
    const from = m.tile || this.groundOf(m);
    return from && this.spots(e).some((k) => findPath(from, k.tile, (x, y) => this.furn(x, y))) ? "走不過去：別隻貓擋住了" : "走不過去：被家具圍住了";
  }
  /** 減少動態：被擠走的貓換到一個看得到、沒被家具擋住的空格（避開 avoid） */
  shooStill(c, avoid) {
    const ok = (k) => !(avoid && k.tx === avoid.tx && k.ty === avoid.ty) && !(avoid && Math.abs(k.tx - avoid.tx) <= 1 && k.ty === avoid.ty);
    const free = this.freeTiles(c).filter(ok).concat(this.freeTiles(c, { roomy: false }).filter(ok));
    if (free.length) { const k = free[0]; Object.assign(c, center(k.tx, k.ty), { tile: k }); }
  }
  /** 方向鍵：主貓走一格 */
  step(dx, dy) {
    const m = this.mainCat; if (!m) return "走不過去";
    const base = m.dest || m.tile || this.groundOf(m);
    if (!base) return "走不過去";
    return this.commandTile(base.tx + dx, base.ty + dy);
  }
  /** 擺設改了：被家具壓到、或用到被搬走家具的貓，移到最近的空格 */
  fix() {
    this.refreshFloor();
    for (const c of this.list) {
      const e = c.goal && this.placed(c.goal.id);
      const lost = c.goal && (!e || e.x !== c.goal.at.x || e.y !== c.goal.at.y);
      if (lost || (c.tile && this.furn(c.tile.tx, c.tile.ty))) {
        Object.assign(c, { perch: null, goal: null, next: null, dest: null, path: [], tile: null });
        const near = this.freeTiles(c, { roomy: false }).sort((a, b) => Math.abs(a.tx * PX - c.x) + Math.abs(a.ty * PX - c.y) - Math.abs(b.tx * PX - c.x) - Math.abs(b.ty * PX - c.y))[0];
        if (near) Object.assign(c, center(near.tx, near.ty), { tile: near });
        if (this.still) { c.act = { name: "pose", pose: "SIT", t0: 0, until: Infinity }; c.mode = "act"; }
        else this.idle(c, performance.now(), 500);
      } else if (c.mode === "walk" && c.dest) { // 路可能被新家具擋住：重新找路
        const p = this.route(c, c.next || c.tile, c.dest);
        if (p) c.path = p; else this.idle(c, performance.now(), 500);
      }
    }
  }

  /* ---------- 每一格畫面 ---------- */
  update(t, dt) {
    if (this.still) return;
    for (const c of this.list) {
      if (c.mode === "idle" && t > c.until) this.think(c, t);
      else if (c.mode === "walk") this.walkStep(c, t, dt);
      else if (c.mode === "jump" && t - c.t0 > JUMP_MS) {
        Object.assign(c, c.to);
        if (c.landed === "perch") this.startAct(c, "nap", t, rand(7000, 13000));
        else if (c.after) { const a = c.after; c.after = null; c.mode = "idle"; if (!this.walkTo(c, a.to, a.goal)) { if (c.main) this.say("走不過去：被家具圍住了"); this.idle(c, t, 1000); } }
        else { c.goal = null; this.idle(c, t, 1200); }
      } else if (c.mode === "act" && t > c.act.until) {
        if (c.perch) { if (!this.hopDown(c)) c.act.until = t + 3000; }
        else this.idle(c, t);
      }
    }
    this.meet(t);
  }
  /** 沿著路一格一格走：下一格要先預定好；被別隻貓擋住就等一下，等太久重新找路，找不到就放棄 */
  walkStep(c, t, dt) {
    if (!c.next) {
      if (!c.path.length) return this.arrive(c, t);
      const k = c.path[0];
      if (this.furn(k.tx, k.ty) || this.list.some((o) => o !== c && [o.tile, o.next].some((q) => q && q.tx === k.tx && q.ty === k.ty))) {
        c.waitT = c.waitT || t;
        if (t - c.waitT > 1200) {
          c.waitT = 0;
          const p = findPath(c.tile, c.dest, (x, y) => this.furn(x, y) || this.catAt(x, y, c));
          if (p) c.path = p;
          else { if (c.main) this.say("走不過去：被別隻貓擋住了"); this.idle(c, t, rand(1500, 3000)); }
        }
        return;
      }
      c.waitT = 0; c.next = c.path.shift();
    }
    const p = center(c.next.tx, c.next.ty), dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy), s = SPEED * dt;
    if (Math.abs(dx) > 0.5) c.face = dx < 0 ? -1 : 1;
    if (d > s) { c.x += (dx / d) * s; c.y += (dy / d) * s; return; }
    Object.assign(c, p, { tile: c.next, next: null });
  }
  /** 兩隻貓在同一列、隔一格停著：有時候碰碰鼻子 */
  meet(t) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], key = a.fur + "|" + b.fur;
      if (a.mode !== "idle" || b.mode !== "idle" || a.perch || b.perch || !a.tile || !b.tile) continue;
      if (a.tile.ty !== b.tile.ty || Math.abs(a.tile.tx - b.tile.tx) !== 2 || (this.boops.get(key) || 0) > t) continue;
      this.boops.set(key, t + 20000);
      if (Math.random() < 0.4) continue;
      const [l, r] = a.x <= b.x ? [a, b] : [b, a];
      Object.assign(l, { face: 1, goal: null }); Object.assign(r, { face: -1, goal: null });
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
      case "nap": case "snooze": return el < 2000 ? "SIT" : el < 4000 ? "LOAF" : "SLEEP";
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
    if ((a.name === "nap" || a.name === "snooze") && el > 4000) { // 睡著了 zzz
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
