// 冒險模式的戰鬥畫面（canvas）。
// 畫面只由「時間 t」和記下的事件決定（draw(t)），之後做縮時影片時可以用同一套程式把按鍵紀錄重畫一次。
import { drawDressed } from "/cat.js";

const W = 960, H = 300, GROUND = 236;
// 怪物：16 × 14 格，b 身體、d 深色、w 眼白、e 眼睛、m 嘴巴
const BLOB = [
  "......bbbb......", "....bbbbbbbb....", "...bbbbbbbbbb...", "..bbbbbbbbbbbb..", ".bbbwwbbbbwwbbb.", ".bbbwebbbbwebbb.",
  ".bbbbbbbbbbbbbb.", "bbbbbbmmmmbbbbbb", "bbbbbbbmmbbbbbbb", "bbbbbbbbbbbbbbbb", "bbbbbbbbbbbbbbbb", ".bbbbbbbbbbbbbb.", ".dbbdbbbbbbdbbd.", "..dd.dd..dd.dd..",
];
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const ease = (x) => 1 - (1 - x) * (1 - x);

export class Battle {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext("2d");
    this.reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = W * dpr; this.cv.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }
  /** 新的一場：boss＝{ name, glyph, color }、hp＝總血量、outfit＝貓的裝扮 */
  reset({ boss, hp, outfit, big }) {
    Object.assign(this, { boss, hp, left: hp, shown: hp, outfit, big: !!big, fx: [], lastKey: 0, combo: 0, won: 0, started: false, t0: 0 });
  }
  key(t) { this.lastKey = t; this.started = true; }
  /** 打對：dmg 點傷害；attack＝要不要播放攻擊動畫（滿一行或累積幾個字才播） */
  damage(t, dmg, attack, crit) {
    this.left = Math.max(0, this.left - dmg);
    if (attack) this.fx.push({ k: crit ? "crit" : "atk", t, n: attack });
  }
  miss(t) { this.fx.push({ k: "miss", t }); }
  win(t) { this.won = t; }

  draw(t) {
    const c = this.ctx;
    this.shown += (this.left - this.shown) * 0.25;
    this.fx = this.fx.filter((f) => t - f.t < 900);
    // 背景：天空、遠山、草地方塊
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, "#9fd3f5"); g.addColorStop(1, "#dff1fb");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "#b8dcc0";
    for (let i = 0; i < 12; i++) { const x = i * 90 - 20, h = 30 + ((i * 37) % 40); c.fillRect(x, GROUND - h, 70, h); }
    for (let x = 0; x < W; x += 24) {
      c.fillStyle = (x / 24) % 2 ? "#6abf59" : "#62b452"; c.fillRect(x, GROUND, 24, 10);
      c.fillStyle = (x / 24) % 2 ? "#9b6b43" : "#8f6240"; c.fillRect(x, GROUND + 10, 24, H - GROUND - 10);
    }
    // 攻擊、被打的動畫狀態
    let catDx = 0, catHurt = false, bossShake = 0, slash = null, shot = null;
    for (const f of this.fx) {
      const a = (t - f.t) / 1000;
      if (f.k === "atk" || f.k === "crit") {
        if (a < 0.3) catDx = Math.max(catDx, Math.sin((a / 0.3) * Math.PI) * 120);
        if (a > 0.12 && a < 0.45) { bossShake = Math.max(bossShake, f.k === "crit" ? 8 : 4); slash = f; }
      }
      if (f.k === "miss") { if (a < 0.35) shot = a / 0.35; else if (a < 0.6) catHurt = true; }
    }
    if (this.reduce) catDx = 0;
    // 貓
    const s = 6, catX = 120 + catDx, catY = GROUND - 14 * s;
    const step = this.started && !this.won && t - this.lastKey < 400 ? Math.floor(t / 120) % 2 : 0;
    drawDressed(c, catX, catY, s, step, this.outfit, catHurt && Math.floor(t / 60) % 2 ? { tint: "#ff6b6b" } : {});
    // 怪物
    const bs = this.big ? 9 : 7, bw = 16 * bs, bx = W - 150 - bw / 2 + (bossShake ? Math.sin(t / 20) * bossShake : 0);
    let by = GROUND - 14 * bs, alpha = 1;
    if (this.won) { const a = Math.min(1, (t - this.won) / 700); by += a * 40; alpha = 1 - a; }
    else by += Math.sin(t / 300) * 3;
    const charging = this.started && !this.won && t - this.lastKey > 3000;
    c.save(); c.globalAlpha = alpha;
    if (charging) { c.fillStyle = `rgba(255,80,60,${0.25 + 0.2 * Math.sin(t / 120)})`; c.fillRect(bx - 10, by - 10, bw + 20, 14 * bs + 20); }
    const pal = { b: this.boss.color, d: shade(this.boss.color, 0.65), w: "#fff", e: "#1a1a1a", m: "#5a1a1a" };
    BLOB.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") { c.fillStyle = pal[ch]; c.fillRect(bx + i * bs, by + j * bs, bs + 0.5, bs + 0.5); } }));
    c.fillStyle = "rgba(255,255,255,.92)"; c.font = `bold ${bs * 4}px ui-monospace, Consolas, monospace`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(this.boss.glyph, bx + bw / 2, by + 10.5 * bs);
    c.restore();
    // 斬擊
    if (slash && !this.reduce) {
      const a = Math.min(1, (t - slash.t - 120) / 300);
      c.strokeStyle = slash.k === "crit" ? "#ffd84a" : "#fff"; c.lineWidth = slash.k === "crit" ? 8 : 5;
      c.beginPath(); c.moveTo(bx + bw * 0.1, by + 20 + a * 10); c.lineTo(bx + bw * 0.9, by + 14 * bs - 20 - a * 10); c.stroke();
    }
    // 怪物丟出符號打貓
    if (shot !== null && !this.reduce) {
      const x = bx - 10 + (catX + 80 - bx + 10) * ease(shot), y = by + 40 - Math.sin(shot * Math.PI) * 60;
      c.fillStyle = "#d64545"; c.font = "bold 28px ui-monospace, Consolas, monospace"; c.textAlign = "center"; c.fillText(this.boss.glyph, x, y);
    }
    // 飄出來的數字
    for (const f of this.fx) {
      const a = (t - f.t) / 900;
      c.globalAlpha = 1 - a; c.textAlign = "center"; c.font = `bold ${f.k === "crit" ? 34 : 24}px system-ui, sans-serif`;
      if (f.k === "miss") { c.fillStyle = "#d64545"; c.fillText("打錯了！", 170, catY - 10 - a * 30); }
      else { c.fillStyle = f.k === "crit" ? "#e8a000" : "#fff"; c.strokeStyle = "#3b2418"; c.lineWidth = 4; const y = by - 6 - a * 40; c.strokeText((f.k === "crit" ? "爆擊 " : "-") + f.n, bx + bw / 2, y); c.fillText((f.k === "crit" ? "爆擊 " : "-") + f.n, bx + bw / 2, y); }
      c.globalAlpha = 1;
    }
    // 血條
    const bw2 = 300, hx = W - bw2 - 24, hy = 20;
    c.fillStyle = "rgba(59,36,24,.85)"; c.fillRect(hx - 4, hy - 4, bw2 + 8, 26);
    c.fillStyle = "#5a2a2a"; c.fillRect(hx, hy, bw2, 18);
    c.fillStyle = "#e0503c"; c.fillRect(hx, hy, bw2 * (this.shown / Math.max(1, this.hp)), 18);
    c.fillStyle = "#fff"; c.font = "bold 14px system-ui, sans-serif"; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillText(`${this.boss.name}　${Math.ceil(this.left)} / ${this.hp}`, hx + 6, hy + 9);
    if (charging) { c.fillStyle = "#d64545"; c.textAlign = "right"; c.fillText("蓄力中…快打字！", W - 24, hy + 40); }
    // 連擊
    if (this.combo >= 5) {
      c.textAlign = "left"; c.font = "bold 22px system-ui, sans-serif"; c.fillStyle = this.combo >= 25 ? "#e8a000" : "#3b2418";
      c.fillText(`${this.combo} 連擊`, 24, 32);
    }
  }
}
