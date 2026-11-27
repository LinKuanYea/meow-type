// 裝扮：前端畫圖與伺服器（價格、取得方式）共用。全部原創像素圖。
// 貓的格子是 16 × 14（cat.js）：最上面 2 列留給帽子，貓身體從第 2 列開始。
// 圖：每一列 16 個字元，"." 是透明，其他字母查 pal 的顏色。
export const SLOTS = [["fur", "毛色"], ["hat", "帽子"], ["face", "臉"], ["neck", "脖子"], ["back", "背後"]];

export const ITEMS = [
  // 毛色：k 外框、o 毛、w 肚子、e 眼睛、p 鼻子
  { id: "fur-orange", slot: "fur", name: "橘貓", price: 0, fur: { k: "#3b2418", o: "#f2a03d", w: "#fff3e0", e: "#1a1a1a", p: "#f08da0" } },
  { id: "fur-gray", slot: "fur", name: "灰貓", price: 30, fur: { k: "#3e3e48", o: "#9a9aa8", w: "#e8e8ee", e: "#1a1a1a", p: "#e89aa8" } },
  { id: "fur-cream", slot: "fur", name: "奶油貓", price: 30, fur: { k: "#6b4a2e", o: "#f3d7a6", w: "#fff8ec", e: "#2a2a2a", p: "#f08da0" } },
  { id: "fur-black", slot: "fur", name: "黑貓", price: 50, fur: { k: "#0d0d10", o: "#34343c", w: "#d9d9e0", e: "#f5d142", p: "#f08da0" } },
  { id: "fur-white", slot: "fur", name: "白貓", price: 50, fur: { k: "#7a6a60", o: "#fbf7f0", w: "#ffffff", e: "#4a8bd6", p: "#f4a0b0" } },
  // 帽子
  { id: "hat-cap", slot: "hat", name: "棒球帽", price: 40, y: 1, pal: { c: "#3f6fd1", b: "#2a4e9a" },
    art: ["..........cccc..", "..........bbbbbb"] },
  { id: "hat-fisher", slot: "hat", name: "漁夫帽", price: 40, y: 0, pal: { h: "#c9b37e", b: "#8a6d3b" },
    art: ["..........hhhh..", "..........bbbb..", "........hhhhhhhh"] },
  { id: "hat-crown", slot: "hat", name: "if 皇冠", from: "cpp-3-4", y: 0, pal: { y: "#f5c542", r: "#d64545", d: "#b8860b" },
    art: ["..........y.y.y.", "..........yyyyy.", "..........dyryd."] },
  // 臉
  { id: "face-shades", slot: "face", name: "墨鏡", price: 50, y: 4, pal: { d: "#151515", s: "#5a5a66" },
    art: ["...........sssss", "...........ddddd"] },
  { id: "face-calc", slot: "face", name: "計算機眼鏡", from: "cpp-2-5", y: 4, pal: { g: "#2d2d2d" },
    art: ["...........ggggg", "...........g.g.g"] },
  // 脖子
  { id: "neck-red", slot: "neck", name: "紅圍巾", price: 30, y: 7, pal: { s: "#d64545", t: "#a32f2f" },
    art: ["..........ssssss", ".........tt....."] },
  { id: "neck-blue", slot: "neck", name: "藍圍巾", price: 30, y: 7, pal: { s: "#4a8bd6", t: "#2f5fa3" },
    art: ["..........ssssss", ".........tt....."] },
  // 背後
  { id: "back-cout", slot: "back", name: "cout 斗篷", from: "cpp-1-5", y: 6, pal: { c: "#c0392b", d: "#8e2a20", y: "#f5c542" },
    art: ["....ccccc.......", "...cccccccc.....", "..ccycyccd......", ".cccdccd........", "ccd............."] },
];
export const ITEM = new Map(ITEMS.map((x) => [x.id, x]));
export const DEFAULT_OUTFIT = { fur: "fur-orange" };
export const FREE_ITEMS = ITEMS.filter((x) => x.price === 0).map((x) => x.id);

/** 整理裝扮：只留下有擁有、而且部位對得上的 */
export function cleanOutfit(o, owned) {
  const r = { ...DEFAULT_OUTFIT };
  for (const [slot] of SLOTS) {
    const id = o?.[slot];
    if (id && ITEM.get(id)?.slot === slot && (owned.has(id) || FREE_ITEMS.includes(id))) r[slot] = id;
  }
  return r;
}
