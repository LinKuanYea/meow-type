// 像素貓（16×12 格）：跑道上的貓與分享圖片共用
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
