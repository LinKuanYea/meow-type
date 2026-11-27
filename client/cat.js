// 像素貓（16×12 格）：跑道上的貓與分享圖片共用
import { ITEM, DEFAULT_OUTFIT } from "/shared/items.js";
export const BODY = ["..........k...k.", ".........kok.kok", ".........koooook", "k........kooeoek", "ko.......kooopok", ".ko.kkkkkkoooook", "..kkoooooooooook", "..kowwoooooowwk.", "..koooooooooook.", "...kkkkkkkkkkk.."];
export const LEGS = [["...ko.ko..ko.ko.", "...kk.kk..kk.kk."], ["....koko..koko..", "....kkkk..kkkk.."]];
export const PAL = {
  me: { k: "#3b2418", o: "#f2a03d", w: "#fff3e0", e: "#1a1a1a", p: "#f08da0" },
  ghost: { k: "#5b5b66", o: "#b9b9c6", w: "#e6e6ee", e: "#333", p: "#c9a0aa" },
};
export function catSVG(f, ghost) {
  const P = ghost ? PAL.ghost : PAL.me;
  let r = "";
  BODY.concat(LEGS[f]).forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${P[c]}"/>`; }));
  return `<svg viewBox="0 0 16 12" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
/** 在 canvas 上畫貓：左上角 (x, y)，每格 s 像素 */
export function drawCat(ctx, x, y, s, f = 0, pal = PAL.me) {
  BODY.concat(LEGS[f]).forEach((row, j) => [...row].forEach((c, i) => { if (c !== ".") { ctx.fillStyle = pal[c]; ctx.fillRect(x + i * s, y + j * s, s + 0.5, s + 0.5); } }));
}

/* ---------- 換裝後的貓（冒險模式、換裝頁）：16 × 14 格，最上面 2 列留給帽子 ---------- */
const LAYER_ORDER = ["back", "neck", "face", "hat"];
/** 穿好衣服的貓的每一格：[x, y, 顏色]（16 × 14） */
function dressedPixels(f, outfit, tint) {
  const fur = (ITEM.get(outfit?.fur) || ITEM.get("fur-orange")).fur, out = [];
  BODY.concat(LEGS[f]).forEach((row, j) => [...row].forEach((c, i) => { if (c !== ".") out.push([i, j + 2, tint || fur[c]]); }));
  for (const slot of LAYER_ORDER) {
    const it = ITEM.get(outfit?.[slot]);
    if (!it?.art) continue;
    it.art.forEach((row, j) => [...row].forEach((c, i) => { if (c !== ".") out.push([i, it.y + j, tint || it.pal[c]]); }));
  }
  return out;
}
/** 在 canvas 上畫穿好衣服的貓：左上角 (x, y)，每格 s 像素；flip＝面向左 */
export function drawDressed(ctx, x, y, s, f = 0, outfit = DEFAULT_OUTFIT, opt = {}) {
  for (const [i, j, c] of dressedPixels(f, outfit, opt.tint)) { ctx.fillStyle = c; ctx.fillRect(x + (opt.flip ? 15 - i : i) * s, y + j * s, s + 0.5, s + 0.5); }
}
/** 一般練習跑道上的貓（SVG） */
export function dressedSVG(f, outfit) {
  return `<svg class="dressed" viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true">${dressedPixels(f, outfit).map(([x, y, c]) => `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c}"/>`).join("")}</svg>`;
}
