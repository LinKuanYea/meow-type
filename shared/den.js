// 貓窩：房間大小、家具目錄、擺設檢查。前端畫圖與伺服器（價格、取得方式、擺設驗證）共用。全部原創像素圖。
// 房間是 ROOM.w × ROOM.h 格；最上面 ROOM.wall 列是牆，下面是地板。
// 家具的圖：每格 8 × 8 個像素（PX），所以每一列的字元數是 w × 8；"." 是透明，其他字母查 pal 的顏色。
// 地板家具的圖可以比佔的格子高（例如貓跳台佔 2 × 1 格、圖有 2 × 4 格高）：圖的下緣對齊佔的格子，多出來的往上畫（像站在牆前面）。
// walk ＝ 貓可以從上面走過去（地毯、坐墊）；其他地板家具會擋路，貓要繞過去。
// 取得方式：learn ＝ 跟學習進度連動（免費、不能買，由伺服器依進度解鎖）；price ＝ 用小魚乾買（和裝扮同一份小魚乾）。

export const ROOM = { w: 12, h: 8, wall: 3 };
export const PX = 8;
export const MAX_PLACED = 30;

/** 書櫃一格放一本書：每層的左上角（圖裡的像素座標），一本書 2 × 5 */
const bookSlots = () => { const s = []; for (const y of [3, 10, 17]) for (let i = 0; i < 6; i++) s.push([3 + i * 3, y]); return s; };
/** 獎盃架：每層 3 個，一個 5 × 5 */
const trophySlots = () => { const s = []; for (const y of [2, 9, 16]) for (let i = 0; i < 3; i++) s.push([3 + i * 7, y]); return s; };

export const DEN = [
  /* ---------- 跟學習連動的家具 ---------- */
  {
    id: "den-books", name: "書櫃", w: 3, h: 1, zone: "floor", learn: "books", how: "打倒任何一章的 Boss，就會出現第一本書；每打倒一章多一本",
    // k 外框、w 木頭、d 深色木頭、b 櫃子裡面
    pal: { k: "#4a2c17", w: "#b77940", d: "#8a5428", b: "#5c3a20" }, slots: bookSlots(), slotSize: [2, 5],
    art: [
      ".kkkkkkkkkkkkkkkkkkkkkk.",
      "kwwwwwwwwwwwwwwwwwwwwwwk",
      "kwkkkkkkkkkkkkkkkkkkkkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkddddddddddddddddddkwk",
      "kwkkkkkkkkkkkkkkkkkkkkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkddddddddddddddddddkwk",
      "kwkkkkkkkkkkkkkkkkkkkkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwkbbbbbbbbbbbbbbbbbbkwk",
      "kwwwwwwwwwwwwwwwwwwwwwwk",
      "kddkkkkkkkkkkkkkkkkkkddk",
    ],
  },
  {
    id: "den-trophy", name: "獎盃架", w: 3, h: 1, zone: "floor", learn: "trophies", how: "打倒大 Boss（每章最後一關），就會多一座迷你 Boss 獎盃",
    pal: { k: "#3e2a1c", w: "#e9d3a8", d: "#c4a574", b: "#7b5a3c", g: "#d9b44a" }, slots: trophySlots(), slotSize: [5, 5],
    art: [
      "kkkkkkkkkkkkkkkkkkkkkkkk",
      "kwwwwwwwwwwwwwwwwwwwwwwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwddddddddddddddddddddwk",
      "kwwwwwwwwwwwwwwwwwwwwwwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwddddddddddddddddddddwk",
      "kwwwwwwwwwwwwwwwwwwwwwwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwbbbbbbbbbbbbbbbbbbbbwk",
      "kwddddddddddddddddddddwk",
      "kwwwwwwwwggggggggwwwwwwk",
      "kkkkkkkkkkkkkkkkkkkkkkkk",
    ],
  },
  {
    id: "den-news", name: "新聞剪報牆", w: 3, h: 2, zone: "wall", learn: "news", need: 3, how: "完成 3 篇每日新聞（拿到 1 顆星以上）",
    // 軟木板：k 框、c 軟木、s 軟木斑點；剪報（最多 5 張）和篇數的小牌子由前端依篇數畫上去
    pal: { k: "#6b4524", c: "#d4a86a", s: "#bf8f52", l: "#8a5a30" },
    slots: [[2, 2], [8, 3], [15, 2], [3, 9], [9, 8]], slotSize: [6, 5], countAt: [14, 7],
    art: [
      "kkkkkkkkkkkkkkkkkkkkkkkk",
      "kllllllllllllllllllllllk",
      "klccccccccccsccccccccclk",
      "klccccsccccccccccccccclk",
      "klccccccccccccsccccccclk",
      "klcscccccccccccccccccclk",
      "klccsccccccccccccccccclk",
      "klcccccccccccccccccscclk",
      "klcccscccccccccccccccclk",
      "klcccccccccccscccccccclk",
      "klccccccccccccccccccsclk",
      "klcscccccccccccccccccclk",
      "klccccccccccccccccsccclk",
      "klccccccsccccccccccccclk",
      "kllllllllllllllllllllllk",
      "kkkkkkkkkkkkkkkkkkkkkkkk",
    ],
  },

  /* ---------- 用小魚乾買的家具 ---------- */
  {
    id: "den-box", name: "紙箱", w: 2, h: 1, zone: "floor", price: 20, sit: [8, 12], front: 7, how: "貓咪最愛的紙箱，會跳進去窩著",
    pal: { k: "#6e4a26", c: "#d9a866", f: "#c8924f", d: "#7a5230", t: "#efd9a6", s: "#a8743f" },
    art: [
      "................",
      "................",
      "................",
      "ff............ff",
      ".fff........fff.",
      "..kkkkkkkkkkkk..",
      "..kddddddddddk..",
      "..kcccccccccck..",
      "..kttttttttttk..",
      "..kcccccccccck..",
      "..kcccssscscck..",
      "..kccsssssscck..",
      "..kcccssscscck..",
      "..kcccccccccck..",
      "..kcccccccccck..",
      "..kkkkkkkkkkkk..",
    ],
  },
  {
    id: "den-cushion", name: "坐墊", w: 2, h: 1, zone: "floor", price: 25, sit: [8, 4], walk: true, how: "軟軟的圓坐墊",
    pal: { k: "#9c3f55", p: "#f08da0", l: "#f9c0cb", y: "#f5c542" },
    art: [
      "................",
      "................",
      "...kkkkkkkkkk...",
      ".kkllllllllllkk.",
      ".kpppppyypppppk.",
      ".kppppyyyyppppk.",
      ".kkppppppppppkk.",
      "...kkkkkkkkkk...",
    ],
  },
  {
    id: "den-scratch", name: "貓抓板", w: 1, h: 1, zone: "floor", price: 30, how: "麻繩柱子，磨爪專用",
    pal: { k: "#5a3a20", r: "#d8b77a", s: "#b8955a", b: "#8a5a30", y: "#e05a5a" },
    art: [
      "...yy...",
      "...yy...",
      "..kkkk..",
      "..krrk..",
      "..kssk..",
      "..krrk..",
      "..kssk..",
      "..krrk..",
      "..kssk..",
      "..krrk..",
      "..kssk..",
      "..krrk..",
      "..kssk..",
      ".kkkkkk.",
      "kbbbbbbk",
      "kkkkkkkk",
    ],
  },
  {
    id: "den-plant", name: "貓草盆栽", w: 1, h: 1, zone: "floor", price: 35, how: "一盆綠油油的貓草",
    pal: { g: "#5fae4c", d: "#3f7f35", k: "#7a3e22", p: "#c9693a", l: "#e08a55" },
    art: [
      "...g....",
      ".g.g.g..",
      ".g.gdg.g",
      "..dgdgg.",
      "g.dggdg.",
      ".ggdgdg.",
      "..gdgd..",
      "...dd...",
      "kkkkkkkk",
      "kllllllk",
      ".kppppk.",
      ".kppppk.",
      ".kppppk.",
      "..kppk..",
      "..kkkk..",
      "........",
    ],
  },
  {
    id: "den-rug", name: "地毯", w: 4, h: 2, zone: "floor", price: 40, flat: true, walk: true, how: "暖暖的條紋地毯，中間有腳印",
    pal: { k: "#8a3b2a", r: "#d9634a", o: "#f2a03d", c: "#fbe3b8", p: "#8a3b2a" },
    art: [
      "................................",
      "................................",
      "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
      ".krrrrrrrrrrrrrrrrrrrrrrrrrrrrk.",
      ".kroooooooooooooooooooooooooork.",
      ".krocccccccccpcccpccccccccccork.",
      ".kroccccccccpppcpppcccccccccork.",
      ".krocccccccccpcccpccccccccccork.",
      ".kroccccccccccpppcccccccccccork.",
      ".krocccccccccpppppccccccccccork.",
      ".krocccccccccpppppccccccccccork.",
      ".kroccccccccccccccccccccccccork.",
      ".kroooooooooooooooooooooooooork.",
      ".krrrrrrrrrrrrrrrrrrrrrrrrrrrrk.",
      "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
      "................................",
    ],
  },
  {
    id: "den-clock", name: "掛鐘", w: 1, h: 1, zone: "wall", price: 45, how: "圓圓的貓耳朵掛鐘",
    pal: { k: "#3b2418", o: "#f2a03d", w: "#fff8ec", h: "#3b2418" },
    art: [
      ".k....k.",
      "kok..kok",
      "kookkook",
      "kowwhwok",
      "kowwhwok",
      "kowwwhok",
      ".kowwok.",
      "..kkkk..",
    ],
  },
  {
    id: "den-window", name: "窗戶", w: 2, h: 2, zone: "wall", price: 50, how: "看得到外面的天空（晚上會變成星空）",
    // s 天空、u 雲（晚上前端把 s 換成夜空、u 換成星星）
    pal: { k: "#5a3a20", w: "#f3e2c0", s: "#9fd3f5", u: "#ffffff", c: "#d9634a", d: "#b04a36" },
    art: [
      "cccccccccccccccc",
      "dkkkkkkkkkkkkkkd",
      ".kwwwwwwwwwwwwk.",
      ".kwssssswsssswk.",
      ".kwsuusswsssswk.",
      ".kwuuuuswssuswk.",
      ".kwssssswsuuuwk.",
      ".kwwwwwwwwwwwwk.",
      ".kwssssswsssswk.",
      ".kwssusswsssswk.",
      ".kwssssswsssuwk.",
      ".kwssssswsssswk.",
      ".kwwwwwwwwwwwwk.",
      "kkkkkkkkkkkkkkkk",
      "kwwwwwwwwwwwwwwk",
      ".kkkkkkkkkkkkkk.",
    ],
  },
  {
    id: "den-tower", name: "貓跳台", w: 2, h: 1, zone: "floor", price: 80, sit: [8, 14], how: "兩層的貓跳台，貓咪會跳到最上面",
    pal: { k: "#5a3a20", b: "#c8915a", d: "#9a6638", r: "#d8b77a", s: "#b8955a", p: "#8f7cd6" },
    art: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      ".kkkkkkkkkkkkkk.",
      "kbbbbbbbbbbbbbbk",
      ".kddddddddddddk.",
      "....krk.........",
      "....ksk.........",
      "....krk.........",
      "...kkkkkkkkkkk..",
      "..kbbbbbbbbbbbk.",
      "...kdddddddddk..",
      "....ksk...ksk...",
      "....krk...krk.p.",
      "....ksk...ksk.p.",
      "....krk...krk.p.",
      "....ksk...ksk.pp",
      "....krk...krk...",
      "....ksk...ksk...",
      ".kkkkkkkkkkkkkk.",
      "kbbbbbbbbbbbbbbk",
      "kkkkkkkkkkkkkkkk",
    ],
  },
];
export const DEN_ITEM = new Map(DEN.map((x) => [x.id, x]));
/** 圖有幾格高（地板家具可以比佔的格子高） */
export const artH = (it) => Math.ceil(it.art.length / PX);

/** 依學習進度解鎖的家具：p ＝ { books: [章], trophies: [關], news: 篇數 } */
export function unlockedOf(p) {
  return DEN.filter((it) => it.learn && (it.learn === "news" ? p.news >= it.need : (p[it.learn] || []).length > 0)).map((it) => it.id);
}

/** 檢查擺設；have ＝ 擁有或解鎖的家具 id（Set）。沒問題回傳空字串，不然回傳原因 */
export function layoutError(layout, have) {
  if (!Array.isArray(layout)) return "格式不對";
  if (layout.length > MAX_PLACED) return `最多擺 ${MAX_PLACED} 件家具`;
  const used = new Set(), cells = new Set();
  for (const e of layout) {
    const it = e && typeof e === "object" && DEN_ITEM.get(e.id);
    if (!it) return "沒有這個家具";
    if (!have.has(it.id)) return `還沒有「${it.name}」`;
    if (used.has(it.id)) return `「${it.name}」只有一個`;
    used.add(it.id);
    const { x, y } = e;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x + it.w > ROOM.w || y + it.h > ROOM.h) return `「${it.name}」超出房間了`;
    if (it.zone === "wall" ? y + it.h > ROOM.wall : y < ROOM.wall) return it.zone === "wall" ? `「${it.name}」要掛在牆上` : `「${it.name}」要放在地板上`;
    if (y + it.h - artH(it) < 0) return `「${it.name}」太高了`;
    for (let i = 0; i < it.w; i++) for (let j = 0; j < it.h; j++) {
      const k = (x + i) + "," + (y + j);
      if (cells.has(k)) return "家具重疊了";
      cells.add(k);
    }
  }
  return "";
}
/** 整理擺設：只留下格式對、擁有、不重疊的（舊資料或家具被拿掉時用） */
export function cleanLayout(layout, have) {
  const out = [];
  for (const e of Array.isArray(layout) ? layout : []) {
    const one = { id: e?.id, x: e?.x, y: e?.y };
    if (!layoutError([...out, one], have)) out.push(one);
  }
  return out;
}

/* ---------- 貓走路：地板格子上找路 ---------- */
/** 被地板家具擋住的格子（"x,y"）；地毯、坐墊這種 walk 的家具不擋 */
export function floorBlocked(layout) {
  const out = new Set();
  for (const e of Array.isArray(layout) ? layout : []) {
    const it = DEN_ITEM.get(e?.id);
    if (!it || it.zone !== "floor" || it.walk) continue;
    for (let i = 0; i < it.w; i++) for (let j = 0; j < it.h; j++) out.add((e.x + i) + "," + (e.y + j));
  }
  return out;
}
/**
 * 在地板上找最短路（上下左右走，BFS）。from、to ＝ { tx, ty }；blocked(tx, ty) 回傳 true 的格子不能走（家具、別隻貓佔著或預定的格子）。
 * 回傳經過的格子（不含起點、含終點），起點就是終點回傳 []；走不到（或終點被擋）回傳 null。
 */
export function findPath(from, to, blocked) {
  const inFloor = (x, y) => x >= 0 && x < ROOM.w && y >= ROOM.wall && y < ROOM.h;
  if (!from || !to || !inFloor(to.tx, to.ty)) return null;
  if (from.tx === to.tx && from.ty === to.ty) return [];
  if (blocked(to.tx, to.ty)) return null;
  const prev = new Map([[from.tx + "," + from.ty, null]]), q = [[from.tx, from.ty]];
  for (let k = 0; k < q.length; k++) {
    const [x, y] = q[k];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, id = nx + "," + ny;
      if (!inFloor(nx, ny) || prev.has(id) || blocked(nx, ny)) continue;
      prev.set(id, x + "," + y);
      if (nx === to.tx && ny === to.ty) {
        const path = [];
        for (let c = id; c !== from.tx + "," + from.ty; c = prev.get(c)) { const [a, b] = c.split(",").map(Number); path.unshift({ tx: a, ty: b }); }
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}
