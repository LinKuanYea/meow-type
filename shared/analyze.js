// 打完後的分析與建議（規則式，不用 AI）
import { BANK, itemText } from "./bank.js";
import { speedOf } from "./judge.js";

const SHIFT = { "~": "`", "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/" };
export const baseKey = (c) => (c === "\n" ? "Enter" : c === " " ? "空白" : SHIFT[c] || c.toLowerCase());
const FING = [["左手小指", "`1qaz"], ["左手無名指", "2wsx"], ["左手中指", "3edc"], ["左手食指", "45rtfgvb"], ["右手食指", "67yuhjnm"], ["右手中指", "8ik,"], ["右手無名指", "9ol."], ["右手小指", "0p;/-['=]\\"]];
export const finger = (k) => (k === "Enter" ? "右手小指" : k === "空白" ? "大拇指" : (FING.find((f) => f[1].includes(k)) || ["其他"])[0]);
const WIDTH = { "　": " ", "「": '"', "」": '"', "『": '"', "』": '"', "“": '"', "”": '"', "‘": "'", "’": "'", "、": ",", "。": ".", "《": "<", "》": ">", "【": "[", "】": "]" };
export function half(c) {
  const x = c.charCodeAt(0);
  if (x >= 0xff01 && x <= 0xff5e) return String.fromCharCode(x - 0xfee0);
  return WIDTH[c] || c;
}
export const show = (c) => (c === "\n" ? "↵" : c === " " ? "␣" : c === "\t" ? "⇥" : c === "　" ? "□" : c);
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cd = (s) => `<code>${esc(s)}</code>`;
const isCode = (cat) => cat === "cpp" || cat === "py";

/** 錯誤分類：width 全形半形、indent 縮排、kase 大小寫、enter 換行、semi 分號（可和 width 重疊） */
export function classify(E) {
  const cls = { width: [], semi: [], indent: [], kase: [], enter: [], other: [] };
  for (const k of E) {
    if (half(k.exp) === half(k.got)) cls.width.push(k);
    else if (k.ls && (k.exp === " " || k.got === " ")) cls.indent.push(k);
    else if (k.exp.toLowerCase() === k.got.toLowerCase()) cls.kase.push(k);
    else if (k.exp === "\n" || k.got === "\n") cls.enter.push(k);
    else cls.other.push(k);
    if (k.exp === ";") cls.semi.push(k);
  }
  return cls;
}

export function analyze(ty, cat, ms) {
  const K = ty.keys.filter((k) => !k.after), E = K.filter((k) => !k.ok);
  const cls = classify(E);
  const byKey = {};
  E.forEach((k) => { const b = cat === "zh" ? k.exp : baseKey(k.exp); byKey[b] = (byKey[b] || 0) + 1; });
  const topKeys = Object.entries(byKey).sort((a, b) => b[1] - a[1]);
  const byF = {};
  if (cat !== "zh") E.forEach((k) => { const f = finger(baseKey(k.exp)); byF[f] = (byF[f] || 0) + 1; });
  const gaps = K.filter((k) => k.ok && !k.ime && k.gap > 0 && k.gap < 5000).map((k) => k.gap).sort((a, b) => a - b);
  const med = gaps.length ? gaps[gaps.length >> 1] : 0;
  const agg = {};
  K.forEach((k) => { if (k.ok && !k.ime && k.gap < 5000 && !k.tab && k.exp !== " ") (agg[k.exp] = agg[k.exp] || []).push(k.gap); });
  const slow = Object.entries(agg).filter(([, a]) => a.length >= 2).map(([c, a]) => [c, a.reduce((x, y) => x + y, 0) / a.length])
    .filter((x) => med && x[1] > med * 1.8).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const pauses = ty.keys.filter((k) => k.gap > 900 && k.i > 0).sort((a, b) => b.gap - a.gap).slice(0, 3);
  const N = 8, seg = [];
  const at = (t) => { let c = 0; for (const p of ty.prog) { if (p.t <= t) c = p.c; else break; } return c; };
  for (let s = 0; s < N; s++) { const a = (ms * s) / N, b = (ms * (s + 1)) / N; seg.push(speedOf(cat, at(b) - at(a), b - a)); }
  const third = Math.floor(N / 3), avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return { K, E, cls, topKeys, byF, slow, med, pauses, seg, first: avg(seg.slice(0, third)), last: avg(seg.slice(-third)), ms,
    acc: K.length ? K.filter((k) => k.ok).length / K.length : 1, correct: ty.totalCorrect(), backs: ty.backs };
}

/** 建議：回傳 [[標題, 內容 HTML], …]，最多 5 條 */
export function tips(A, { cat, rule, pastes = 0, ime = 0 }) {
  const L = [], c = A.cls, code = isCode(cat);
  if (pastes) L.push([`偵測到貼上 ${pastes} 次，已擋下`, "比賽和排行榜都要自己打，貼上的內容不算。"]);
  if (ime && cat !== "zh") L.push(["輸入法還在中文模式", `這次有 ${ime} 次開始選字。打${code ? "程式" : "英文"}前先切到英數模式（微軟注音按 Shift，Mac 按 Caps Lock），不然標點會變全形。`]);
  if (c.width.length) {
    const w = {};
    c.width.forEach((k) => { const p = k.got + "\u0000" + k.exp; w[p] = (w[p] || 0) + 1; });
    const top = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([p, n]) => { const [g, e] = p.split("\u0000"); return `把 ${cd(show(e))} 打成 ${cd(show(g))}（${n} 次）`; }).join("、");
    L.push([`全形／半形打錯 ${c.width.length} 次`, (cat === "zh" ? "中文標點要用全形。" : "程式和英文的符號都要用半形，全形符號編譯器看不懂。") + "最常見：" + top + "。"]);
  }
  if (c.semi.length && cat === "cpp") L.push([`分號打錯或漏掉 ${c.semi.length} 次`, `C++ 每個敘述最後都要有 ${cd(";")}，少一個就編譯不過。打完一行先看一眼行尾。`]);
  if (c.indent.length) L.push([`縮排錯 ${c.indent.length} 次`, "每多一層多縮 4 個空白，可以直接按 Tab（會自動補到 4 的倍數）。" + (cat === "py" ? "Python 是靠縮排決定哪些程式碼在迴圈或 if 裡面，縮錯程式就跑不動或結果不對。" : "C++ 縮排錯雖然還能跑，但別人（和你自己）會很難看懂。")]);
  if (c.kase.length) L.push([`大小寫打錯 ${c.kase.length} 次`, `程式的大小寫是不同的字，例如 ${cd(cat === "py" ? "Print" : "Cout")} 和 ${cd(cat === "py" ? "print" : "cout")} 不一樣。`]);
  const fs = Object.entries(A.byF).sort((a, b) => b[1] - a[1]);
  if (A.topKeys.length) {
    const t = A.topKeys.slice(0, 3).map(([k, n]) => (cat === "zh" ? `「${esc(k)}」` : cd(k)) + `（${n}）`).join("、");
    L.push([`最常打錯：${t}`, cat === "zh" ? "這幾個字可能是選字選錯或注音拼錯，打完一個詞先確認再往下。"
      : fs.length && fs[0][1] >= 3 ? `${fs[0][0]}負責的鍵錯最多（${fs[0][1]} 次），可以專門練這一區，練的時候眼睛不要看鍵盤。` : "錯誤沒有集中在某根手指，保持現在的指法就好。"]);
  }
  if (A.slow.length) L.push(["這些地方會停下來想", A.slow.map(([ch, g]) => `${cd(show(ch))} 平均停 ${(g / 1000).toFixed(2)} 秒`).join("、") + `（你平常每個字約 ${(A.med / 1000).toFixed(2)} 秒）。` + (code ? "程式的符號常要按 Shift，多練符號列就會變快。" : "")]);
  const kn = A.K.length;
  if (A.backs && kn && A.backs / kn > 0.12) L.push([`倒退鍵用了 ${A.backs} 次`, `大約每 ${Math.round(kn / A.backs)} 個字就刪一次，先放慢一點、打準，速度自然會上來。`]);
  if (A.first > 0 && A.ms > 15000 && A.last < A.first * 0.75) L.push([`後段掉速 ${Math.round((1 - A.last / A.first) * 100)}%`, "前面打得快、後面慢下來，可能是累了或越打越緊張。練習時試著用穩定的節奏打完。"]);
  if (A.acc < 0.9) L.push([`正確率 ${Math.round(A.acc * 100)}%`, "先求準再求快：正確率到 95% 以上再加速。" + (rule === "free" ? "可以試試「要倒退修」模式。" : "")]);
  else if (A.acc >= 0.97 && kn > 20 && !L.length) L.push(["又快又準", "正確率很高，下一次可以試著加快節奏，或換更長的題目。"]);
  return L.slice(0, 5);
}

/** 針對弱點練習：挑出含有常錯字元最多的題目 */
export function drillText(A, cat) {
  const errs = A.topKeys.slice(0, 3).map((x) => x[0]);
  const b = Object.fromEntries(Object.entries(BANK[cat]).map(([k, a]) => [k, a.map(itemText)]));
  if (isCode(cat)) {
    if (A.cls.indent.length) return b.para.slice().sort((x, y) => (y.match(/\n {8}/g) || []).length - (x.match(/\n {8}/g) || []).length)[0];
    const lines = [...new Set(Object.values(b).flat().flatMap((t) => t.split("\n")).map((s) => s.trim()).filter((s) => s.length > 6))];
    const score = (s) => [...s].filter((ch) => errs.includes(baseKey(ch))).length;
    return lines.sort((x, y) => score(y) - score(x)).slice(0, 6).join("\n");
  }
  if (cat === "en") {
    const sents = [...b.sent, ...b.para.flatMap((p) => p.split(/(?<=\.) /))];
    const score = (s) => [...s].filter((ch) => errs.includes(baseKey(ch))).length / s.length;
    return sents.sort((x, y) => score(y) - score(x)).slice(0, 3).join(" ");
  }
  const sents = [...b.sent, ...b.para.flatMap((p) => p.split(/(?<=。)/))];
  const score = (s) => [...s].filter((ch) => errs.includes(ch)).length;
  return sents.sort((x, y) => score(y) - score(x)).slice(0, 3).join("");
}
