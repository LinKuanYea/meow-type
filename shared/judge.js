// 打字判定引擎（前後端共用）
// 前端用它即時判定；伺服器用同一份程式「重播」按鍵紀錄，驗證排行榜成績。
//
// 打錯時的三種規則：
//   block 擋下：打錯的字不會出現，要打對才前進
//   back  要倒退修：錯字留著顯示紅色，後面打的都不算，要倒退刪掉（最多往後帶 MAX_AHEAD 個字）
//   free  可以帶錯：錯了照樣往前，最後只算打對的字
//
// 按鍵紀錄（events）格式，每筆一個陣列，t＝開始後幾毫秒：
//   [t, "i", 文字, ime]   輸入文字（ime=1 表示輸入法選字送出，可能一次好幾個字）
//   [t, "t"]              Tab（補空白到 4 的倍數）
//   [t, "b"]              倒退一個字
//   [t, "w"]              倒退一個詞（Ctrl/Option + Backspace）

export const RULES = ["block", "back", "free"];
export const MAX_AHEAD = 10;
export const MAX_BURST = 3; // 非輸入法一次輸入超過這麼多字＝疑似貼上或自動打字

export class Typist {
  constructor(rule, onChunkDone) {
    this.rule = RULES.includes(rule) ? rule : "back";
    this.text = "";
    this.typed = [];
    this.keys = [];      // 每一次按鍵的判定：{t, exp, got, ok, gap, i, ime, after, ls, tab, chunk}
    this.events = [];
    this.prog = [];      // {t, c}：累計打對字數
    this.done = 0;       // 已完成段落的打對字數
    this.chunk = 0;
    this.last = 0;
    this.started = false;
    this.backs = 0;
    this.bursts = 0;
    this.onChunkDone = onChunkDone || null;
  }
  setText(text) {
    if (this.text) { this.done += this.correctNow(); this.chunk++; }
    this.text = text; this.typed = [];
  }
  firstBad() { for (let i = 0; i < this.typed.length; i++) if (this.typed[i] !== this.text[i]) return i; return -1; }
  correctNow() {
    if (this.rule === "free") { let n = 0; this.typed.forEach((c, i) => { if (c === this.text[i]) n++; }); return n; }
    const fb = this.firstBad(); return fb < 0 ? this.typed.length : fb;
  }
  totalCorrect() { return this.done + this.correctNow(); }
  chunkDone() { return this.typed.length === this.text.length && (this.rule === "free" || this.firstBad() < 0); }
  lineStart(i) { let j = i - 1; while (j >= 0 && this.text[j] === " ") j--; return j < 0 || this.text[j] === "\n"; }

  /** 套用一筆事件；回傳 { trip: 有沒有打錯（貓要絆一下）, rejected: 被擋下的輸入 } */
  apply(ev) {
    const [t, k] = ev;
    this.events.push(ev);
    if (!this.started) { this.started = true; this.last = t; }
    let r = { trip: false, rejected: false };
    if (k === "i") r = this._insert(t, String(ev[2] ?? ""), !!ev[3]);
    else if (k === "t") r = this._tab(t);
    else if (k === "b" || k === "w") this._back(t, k === "w");
    if (this.chunkDone() && this.onChunkDone) this.onChunkDone(this);
    return r;
  }
  _key(t, c, ime, gap) {
    const i = this.typed.length;
    if (i >= this.text.length) return { ok: false, trip: false };
    const exp = this.text[i], fb = this.rule === "back" ? this.firstBad() : -1, ok = c === exp;
    if (this.rule === "back" && fb >= 0 && i - fb >= MAX_AHEAD) return { ok: false, trip: true };
    this.keys.push({ t, exp, got: c, ok, gap: gap ?? t - this.last, i, ime, after: fb >= 0, ls: this.lineStart(i), chunk: this.chunk });
    this.last = t;
    if (this.rule === "block") { if (ok) this.typed.push(c); }
    else this.typed.push(c);
    this.prog.push({ t, c: this.totalCorrect() });
    return { ok, trip: !ok || fb >= 0 };
  }
  _insert(t, str, ime) {
    const cs = Array.from(str);
    if (!ime && cs.length > MAX_BURST) { this.bursts++; return { trip: false, rejected: true }; }
    let trip = false;
    cs.forEach((c, n) => {
      if (trip && ime && this.rule === "block") return; // 擋下模式：選字送出的一串，從第一個錯字之後都不算
      const r = this._key(t, c, ime, n ? 0 : undefined);
      if (r.trip) trip = true;
    });
    return { trip, rejected: false };
  }
  _tab(t) {
    let col = 0;
    for (let j = this.typed.length - 1; j >= 0 && this.typed[j] !== "\n"; j--) col++;
    const n = 4 - (col % 4), sp = " ".repeat(n), i = this.typed.length;
    if (this.text.substr(i, n) === sp && (this.rule !== "back" || this.firstBad() < 0)) {
      this.keys.push({ t, exp: " ", got: " ", ok: true, gap: t - this.last, i, ls: true, tab: true, chunk: this.chunk });
      this.last = t;
      for (let k = 0; k < n; k++) this.typed.push(" ");
      this.prog.push({ t, c: this.totalCorrect() });
      return { trip: false };
    }
    if (this.rule === "block") return this._key(t, " ", false);
    let trip = false;
    for (let k = 0; k < n; k++) if (this._key(t, " ", false, k ? 0 : undefined).trip) trip = true;
    return { trip };
  }
  _back(t, word) {
    if (this.rule === "block" || !this.typed.length) return;
    this.backs++; this.last = t;
    const T = this.typed;
    const last = () => T[T.length - 1];
    if (word) { while (T.length && /\s/.test(last())) T.pop(); while (T.length && !/\s/.test(last())) T.pop(); }
    else T.pop();
  }
}

/** 速度：中文用「字／分」，其他用 WPM（5 個字元算一個字） */
export function speedOf(cat, chars, ms) {
  const m = ms / 60000;
  if (m <= 0) return 0;
  return cat === "zh" ? chars / m : chars / 5 / m;
}
export const unitOf = (cat) => (cat === "zh" ? "字/分" : "WPM");

/** 一局的成績摘要 */
export function summarize(ty, cat, ms) {
  const K = ty.keys.filter((k) => !k.after);
  const ok = K.filter((k) => k.ok).length;
  const correct = ty.totalCorrect();
  return { correct, ms, keys: K.length, errs: K.length - ok, acc: K.length ? ok / K.length : 1, speed: speedOf(cat, correct, ms) };
}

/**
 * 伺服器重播：用題目文字和按鍵紀錄重算成績，並檢查像不像真人在打。
 * texts：依序的題目文字（1 分鐘模式會有好幾段）；limitMs：計時模式的上限（整題模式給 null）
 * 回傳 { ok, reason, sum, flags }，ok=false 表示資料不合理（不收）；flags 有東西表示可疑（收下但不上榜）
 */
export function replay({ texts, rule, cat, events, limitMs, endMs }) {
  if (!Array.isArray(texts) || !texts.length || !Array.isArray(events) || events.length > 20000) return { ok: false, reason: "格式不對" };
  let n = 0;
  const ty = new Typist(rule, (t) => { if (n + 1 < texts.length) { n++; t.setText(texts[n]); } });
  ty.setText(texts[0]);
  let prev = -1;
  for (const ev of events) {
    if (!Array.isArray(ev) || typeof ev[0] !== "number" || !Number.isFinite(ev[0]) || ev[0] < prev || ev[0] < 0) return { ok: false, reason: "時間順序不對" };
    if (!["i", "t", "b", "w"].includes(ev[1])) return { ok: false, reason: "未知的事件" };
    if (ev[1] === "i" && (typeof ev[2] !== "string" || ev[2].length > 40)) return { ok: false, reason: "輸入太長" };
    if (limitMs && ev[0] > limitMs + 50) break;
    prev = ev[0];
    ty.apply(ev);
  }
  const allDone = n === texts.length - 1 && ty.chunkDone();
  if (!limitMs && !allDone) return { ok: false, reason: "沒有打完" };
  if (limitMs && n < texts.length - 1) return { ok: false, reason: "題目段數和紀錄對不上" };
  const ms = limitMs ? limitMs : Math.max(1, Math.min(endMs ?? prev, prev + 2000));
  const sum = summarize(ty, cat, ms);
  const flags = [];
  if (ty.bursts) flags.push("burst");
  const gaps = ty.keys.filter((k) => !k.ime && !k.tab && k.gap > 0 && k.gap < 3000).map((k) => k.gap);
  if (gaps.length >= 20) {
    const fast = gaps.filter((g) => g < 12).length / gaps.length;
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
    if (fast > 0.3) flags.push("too-fast-keys");
    if (gaps.length >= 50 && sd / mean < 0.18) flags.push("too-regular");
  }
  if (sum.speed > (cat === "zh" ? 260 : 220)) flags.push("too-fast");
  return { ok: true, sum, flags, typist: ty };
}
