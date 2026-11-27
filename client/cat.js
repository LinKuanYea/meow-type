// 像素貓（16×12 格）：跑道上的貓與分享圖片共用
import { DEFAULT_OUTFIT } from "/shared/items.js";
import { BODY, LEGS, PAL, dressedPixels } from "/shared/catpix.js";
export { BODY, LEGS, PAL };
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

/** 在 canvas 上畫穿好衣服的貓：左上角 (x, y)，每格 s 像素；flip＝面向左 */
export function drawDressed(ctx, x, y, s, f = 0, outfit = DEFAULT_OUTFIT, opt = {}) {
  for (const [i, j, c] of dressedPixels(f, outfit, opt.tint)) { ctx.fillStyle = c; ctx.fillRect(x + (opt.flip ? 15 - i : i) * s, y + j * s, s + 0.5, s + 0.5); }
}
/** 一般練習跑道上的貓（SVG） */
export function dressedSVG(f, outfit) {
  return `<svg class="dressed" viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true">${dressedPixels(f, outfit).map(([x, y, c]) => `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c}"/>`).join("")}</svg>`;
}
