// 像素貓的格子資料（前端畫跑道、分享圖片，伺服器畫連結預覽圖共用）
import { ITEM } from "./items.js";
export const BODY = ["..........k...k.", ".........kok.kok", ".........koooook", "k........kooeoek", "ko.......kooopok", ".ko.kkkkkkoooook", "..kkoooooooooook", "..kowwoooooowwk.", "..koooooooooook.", "...kkkkkkkkkkk.."];
export const LEGS = [["...ko.ko..ko.ko.", "...kk.kk..kk.kk."], ["....koko..koko..", "....kkkk..kkkk.."]];
export const PAL = {
  me: { k: "#3b2418", o: "#f2a03d", w: "#fff3e0", e: "#1a1a1a", p: "#f08da0" },
  ghost: { k: "#5b5b66", o: "#b9b9c6", w: "#e6e6ee", e: "#333", p: "#c9a0aa" },
};
/* ---------- 換裝後的貓（冒險模式、換裝頁）：16 × 14 格，最上面 2 列留給帽子 ---------- */
const LAYER_ORDER = ["back", "neck", "face", "hat"];
/** 穿好衣服的貓的每一格：[x, y, 顏色]（16 × 14） */
export function dressedPixels(f, outfit, tint) {
  const fur = (ITEM.get(outfit?.fur) || ITEM.get("fur-orange")).fur, out = [];
  BODY.concat(LEGS[f]).forEach((row, j) => [...row].forEach((c, i) => { if (c !== ".") out.push([i, j + 2, tint || fur[c]]); }));
  for (const slot of LAYER_ORDER) {
    const it = ITEM.get(outfit?.[slot]);
    if (!it?.art) continue;
    it.art.forEach((row, j) => [...row].forEach((c, i) => { if (c !== ".") out.push([i, it.y + j, tint || it.pal[c]]); }));
  }
  return out;
}
