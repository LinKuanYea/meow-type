// 縮時影片：用這一局的按鍵紀錄重播一次，畫成 8～15 秒的直式影片（1080 × 1920，IG 限時動態的比例）。
// 全部在瀏覽器裡做：WebCodecs 編成 H.264，再用 mp4.js 包成 MP4；不支援的瀏覽器改用 MediaRecorder 即時錄（比較慢）。
import { Typist, summarize } from "/shared/judge.js";
import { Battle } from "/battle.js";
import { muxMp4 } from "/mp4.js";

const W = 1080, H = 1920, FPS = 30, OUTRO = 2800, HOLD = 500;
const INK = "#2a1d14", GIN = "#d9741a", TODO = "#b9a593", BAD = "#d4302f", BG = "#fffaf2";
const SANS = '"Noto Sans TC", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';

/** 影片的時間軸：實際花的時間 T → 影片主體長度 D（太長的會加速） */
function plan(T) {
  const D = T <= 6000 ? Math.max(T, 1500) : Math.min(12000, Math.max(6000, T / 4));
  return { D, speed: T / D, total: D + HOLD + OUTRO };
}

export const canMakeVideo = () => typeof VideoEncoder !== "undefined" || (typeof MediaRecorder !== "undefined" && !!HTMLCanvasElement.prototype.captureStream);

/**
 * 畫影片的每一格。opts：{ lv, rule, events, outfit, nick, stars, unit }
 * 回傳 { frames, drawFrame(i) }，drawFrame 會把第 i 格畫在 canvas 上
 */
function renderer(canvas, opts) {
  const { lv, rule, events } = opts;
  const c = canvas.getContext("2d");
  const T = Math.max(1, events.length ? events[events.length - 1][0] : 1);
  const P = plan(T), frames = Math.ceil((P.total / 1000) * FPS);
  // 戰鬥畫面：沿用冒險模式的 Battle，時鐘換成「影片時間」
  const bc = document.createElement("canvas");
  const battle = new Battle(bc); battle.reduce = false;
  battle.reset({ boss: lv.boss, hp: lv.texts.reduce((a, t) => a + t.length, 0), outfit: opts.outfit, big: lv.big });
  let part = 0, k = 0, lastC = 0, pend = 0, combo = 0, done = false;
  const ty = new Typist(rule, (t) => { if (part + 1 < lv.texts.length) { part++; t.setText(lv.texts[part]); } else done = true; });
  ty.setText(lv.texts[0]);

  function step(tr) {
    while (k < events.length && events[k][0] <= tr) {
      const ev = events[k++], tv = ev[0] / P.speed, r = ty.apply(ev.slice());
      battle.key(tv);
      const cc = ty.totalCorrect(), d = Math.max(0, cc - lastC); lastC = Math.max(lastC, cc);
      if (r.trip) { combo = 0; battle.miss(tv); }
      else if (d) {
        const before = combo; combo += d; pend += d;
        const crit = Math.floor(combo / 25) > Math.floor(before / 25), nl = ev[1] === "i" && String(ev[2]).includes("\n");
        if (pend >= 8 || nl || crit) { battle.damage(tv, d, pend, crit); pend = 0; } else battle.damage(tv, d, 0, false);
      }
    }
  }
  function textPanel(y0, h) {
    const x0 = 70, w = W - 140, fs = 34, lh = 54, cw = fs * 0.6;
    c.fillStyle = "#fff"; c.strokeStyle = "#ecdcc8"; c.lineWidth = 4;
    c.beginPath(); c.roundRect(x0 - 30, y0, w + 60, h, 28); c.fill(); c.stroke();
    const text = ty.text, fb = rule === "back" ? ty.firstBad() : -1, n = ty.typed.length, per = Math.floor(w / cw);
    // 換行：程式照原本的行，太長再折
    const lines = []; let cur = [];
    for (let i = 0; i <= text.length; i++) {
      const ch = text[i];
      if (i === text.length) { lines.push(cur); break; }
      cur.push(i);
      if (ch === "\n" || cur.length >= per) { lines.push(cur); cur = []; }
    }
    const curLine = Math.max(0, lines.findIndex((l) => l.includes(Math.min(n, text.length - 1))));
    const show = Math.floor((h - 60) / lh), from = Math.max(0, Math.min(curLine - Math.floor(show / 3), lines.length - show));
    c.font = `${fs}px ${MONO}`; c.textBaseline = "middle";
    lines.slice(from, from + show).forEach((l, j) => {
      const y = y0 + 50 + j * lh;
      l.forEach((i, col) => {
        const ch = text[i], t = ty.typed[i], x = x0 + col * cw;
        if (i === n) { c.fillStyle = GIN; c.fillRect(x, y + 20, cw, 5); }
        if (ch === "\n") return;
        const ok = t !== undefined && t === ch && (fb < 0 || i < fb);
        c.fillStyle = t === undefined ? TODO : ok ? INK : BAD;
        if (t !== undefined && !ok) { c.fillStyle = "#ffd9d6"; c.fillRect(x, y - 22, cw, 44); c.fillStyle = BAD; }
        if (ch !== " ") c.fillText(ch, x, y);
      });
    });
  }
  function stat(x, label, value) {
    c.fillStyle = "#fff"; c.strokeStyle = "#ecdcc8"; c.lineWidth = 4;
    c.beginPath(); c.roundRect(x, 670, 300, 150, 24); c.fill(); c.stroke();
    c.fillStyle = TODO; c.font = `30px ${SANS}`; c.textAlign = "left"; c.fillText(label, x + 26, 712);
    c.fillStyle = INK; c.font = `bold 64px ${MONO}`; c.fillText(value, x + 26, 778);
  }
  function drawFrame(i) {
    const tv = (i / FPS) * 1000, tr = Math.min(T, tv * P.speed);
    step(tr);
    battle.combo = combo;
    if (done && !battle.won && opts.stars > 0) battle.win(P.D);
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    // 標題
    c.textBaseline = "middle"; c.textAlign = "left";
    c.fillStyle = GIN; c.font = `bold 92px ${SANS}`; c.fillText("喵打", 70, 120);
    c.fillStyle = INK; c.font = `bold 44px ${SANS}`; c.fillText(opts.title, 70, 220);
    c.fillStyle = TODO; c.font = `32px ${SANS}`; c.textAlign = "right"; c.fillText(P.speed > 1.2 ? `▶▶ ${P.speed.toFixed(1)} 倍速` : "", W - 70, 128); c.textAlign = "left";
    battle.draw(tv);
    c.imageSmoothingEnabled = false;
    c.drawImage(bc, 0, 280, W, (W * 300) / 960);
    const s = summarize(ty, lv.lang, Math.max(1, tr));
    stat(70, `速度（${opts.unit}）`, String(Math.round(s.speed)));
    stat(390, "正確率", (s.keys ? Math.round(s.acc * 100) : 100) + "%");
    stat(710, "時間", (tr / 1000).toFixed(1) + " 秒");
    textPanel(870, 820);
    c.fillStyle = TODO; c.font = `34px ${SANS}`; c.textAlign = "center"; c.fillText("meow-type.otlab.org", W / 2, 1810);
    // 結尾：成績卡
    const a = (tv - P.D - HOLD) / 400;
    if (a > 0) {
      c.globalAlpha = Math.min(1, a);
      c.fillStyle = "rgba(42,29,20,.55)"; c.fillRect(0, 0, W, H);
      c.fillStyle = BG; c.strokeStyle = GIN; c.lineWidth = 8;
      c.beginPath(); c.roundRect(90, 520, W - 180, 860, 40); c.fill(); c.stroke();
      c.textAlign = "center"; c.fillStyle = INK; c.font = `bold 64px ${SANS}`;
      c.fillText(opts.stars > 0 ? `打倒${lv.boss.name}！` : `挑戰${lv.boss.name}`, W / 2, 640);
      c.fillStyle = "#e8a000"; c.font = `120px ${SANS}`; c.fillText("★".repeat(opts.stars) + "☆".repeat(3 - opts.stars), W / 2, 790);
      const fin = summarize(ty, lv.lang, T);
      c.fillStyle = GIN; c.font = `bold 120px ${MONO}`; c.fillText(String(Math.round(fin.speed)), W / 2, 960);
      c.fillStyle = TODO; c.font = `36px ${SANS}`; c.fillText(`${opts.unit}・正確率 ${Math.round(fin.acc * 100)}%・${(T / 1000).toFixed(1)} 秒`, W / 2, 1050);
      if (opts.nick) { c.fillStyle = INK; c.font = `bold 48px ${SANS}`; c.fillText(opts.nick, W / 2, 1150); }
      c.fillStyle = GIN; c.font = `bold 52px ${SANS}`; c.fillText("你打得贏嗎？", W / 2, 1270);
      c.globalAlpha = 1;
    }
  }
  return { frames, drawFrame, seconds: P.total / 1000 };
}

const CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42002a", "avc1.42E028"];
async function pickCodec() {
  for (const codec of CODECS) {
    const cfg = { codec, width: W, height: H, bitrate: 5_000_000, framerate: FPS, avc: { format: "avc" } };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch {}
  }
  return null;
}

/** 做影片：回傳 { blob, type, ext }；onProgress(0～1) */
export async function makeVideo(opts, onProgress = () => {}) {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  await document.fonts?.ready;
  const R = renderer(canvas, opts);
  const cfg = typeof VideoEncoder !== "undefined" ? await pickCodec() : null;
  if (cfg) {
    const chunks = []; let avcC = null, err = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (meta?.decoderConfig?.description && !avcC) avcC = meta.decoderConfig.description;
        const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
        chunks.push({ data, key: chunk.type === "key" });
      },
      error: (e) => { err = e; },
    });
    encoder.configure(cfg);
    for (let i = 0; i < R.frames; i++) {
      if (err) throw err;
      R.drawFrame(i);
      const f = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      encoder.encode(f, { keyFrame: i % (FPS * 2) === 0 });
      f.close();
      if (encoder.encodeQueueSize > 4) await new Promise((r) => encoder.addEventListener("dequeue", r, { once: true }));
      if (i % 10 === 0) { onProgress(i / R.frames); await new Promise((r) => setTimeout(r, 0)); }
    }
    await encoder.flush(); encoder.close();
    if (err) throw err;
    if (!avcC) throw new Error("編碼器沒有給 avcC");
    onProgress(1);
    return { blob: muxMp4({ chunks, width: W, height: H, fps: FPS, avcC }), type: "video/mp4", ext: "mp4" };
  }
  // 備用：MediaRecorder 即時錄（影片多長就要等多久）
  const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) throw new Error("這個瀏覽器不能做影片");
  const stream = canvas.captureStream(FPS), rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 5_000_000 }), parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start();
  const t0 = performance.now();
  for (let i = 0; i < R.frames; i++) {
    R.drawFrame(i);
    onProgress(i / R.frames);
    const wait = t0 + ((i + 1) * 1000) / FPS - performance.now();
    await new Promise((r) => setTimeout(r, Math.max(0, wait)));
  }
  rec.stop(); await stopped;
  const mime = type.split(";")[0];
  return { blob: new Blob(parts, { type: mime }), type: mime, ext: mime === "video/mp4" ? "mp4" : "webm" };
}
