// 分享連結的預覽圖（LINE、Messenger、Discord 貼上 /c/編號 時顯示）：伺服器自己畫 1200×630 的 PNG。
// 不收使用者上傳的圖片（避免有人傳奇怪的圖）；畫面只有像素貓（穿分享者目前的裝扮）、速度、正確率，暱稱放在 og:title 文字裡。
// 沒有 npm 套件：自己用 node:zlib 壓 PNG，文字用 5×7 點陣字。
import { deflateSync } from "node:zlib";
import { BODY, LEGS, PAL, dressedPixels } from "../shared/catpix.js";

const W = 1200, H = 630;

/* ---------- 5×7 點陣字（只放用得到的字） ---------- */
const FONT = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
};
// 中文單位「字/分」：9×9 點陣
const ZH = {
  字: ["000010000", "111111111", "100000001", "001111100", "000001000", "111111111", "000010000", "000010000", "000110000"],
  分: ["001000100", "010000010", "100000001", "011111110", "000100010", "000100010", "001000010", "010000010", "100001100"],
};

const hex = (c) => { const n = parseInt(c.slice(1), 16); return c.length === 4 ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17] : [n >> 16, (n >> 8) & 255, n & 255]; };

function canvas() {
  const px = Buffer.alloc(W * H * 3);
  const rect = (x, y, w, h, color) => {
    const [r, g, b] = hex(color);
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) { const o = (j * W + i) * 3; px[o] = r; px[o + 1] = g; px[o + 2] = b; }
  };
  /** 畫一行字，回傳寬度；s＝每點幾像素 */
  const text = (str, x, y, s, color, measure = false) => {
    let cx = x;
    for (const ch of String(str)) {
      const zh = ZH[ch], g = zh || FONT[ch] || FONT[" "], w = g[0].length;
      const ys = zh ? y - 2 * s : y; // 中文 9 點高，跟 7 點的英文字底部對齊
      if (!measure) g.forEach((row, j) => [...row].forEach((v, i) => { if (v === "1") rect(cx + i * s, ys + j * s, s, s, color); }));
      cx += (w + 1) * s;
    }
    return cx - x - s;
  };
  return { px, rect, text };
}

/* ---------- PNG ---------- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePNG(px, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; // 8 位元 RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

/**
 * 畫分享預覽圖。sh＝getShare() 的結果：{ c, speed, acc, outfit }；unit＝"WPM" 或 "字/分"
 */
export function shareImage(sh, unit) {
  const { px, rect, text } = canvas();
  // 天空、草地、跑道虛線（跟前端的成績圖片同一套顏色）
  rect(0, 0, W, H, "#cfeaf6");
  rect(0, 430, W, 200, "#6dae4f");
  for (let x = 0; x < W; x += 56) rect(x, 530, 30, 6, "#a8d293");
  // 終點旗
  for (let y = 310; y < 570; y += 20) for (let x = 0; x < 2; x++) rect(1110 + x * 20, y, 20, 20, ((y - 310) / 20 + x) % 2 ? "#222222" : "#ffffff");
  // 貓（登入的人穿目前的裝扮）
  const s = 15, cx = 70, cy = 430 - 14 * s + 2 * s;
  if (sh.outfit) for (const [i, j, c] of dressedPixels(1, sh.outfit)) rect(cx + i * s, cy - 2 * s + j * s, s, s, c);
  else BODY.concat(LEGS[1]).forEach((row, j) => [...row].forEach((c, i) => { if (c !== ".") rect(cx + i * s, cy + j * s, s, s, PAL.me[c]); }));
  // 標題
  text("MEOW-TYPE", 60, 50, 8, "#d9741a");
  // 速度（大字）＋單位
  const sp = String(Math.max(0, Math.round(sh.speed || 0))), big = 22;
  const spW = text(sp, 0, 0, big, "", true), unitW = text(unit, 0, 0, 9, "", true);
  const x0 = Math.max(380, 1060 - spW - 30 - unitW);
  text(sp, x0, 150, big, "#2a1d14");
  text(unit, x0 + spW + 30, 150 + 7 * big - 7 * 9, 9, "#5b4636");
  // 正確率
  const acc = `ACC ${Math.round((sh.acc || 0) * 100)}%`, aw = text(acc, 0, 0, 8, "", true);
  rect(1060 - aw - 24, 340 - 18, aw + 48, 7 * 8 + 36, "#fffaf2");
  text(acc, 1060 - aw, 340, 8, "#2d7a1f");
  return encodePNG(px, W, H);
}
