// 題庫
// - C++、Python：林老師在 MeowJudge 的作答（shared/bank-code.js，由 scripts/build-code-bank.py 產生，附說明與預測輸出）
// - 英文、中文：原創文字，附單字、片語、成語說明（shared/bank-text.js，由 scripts/build-text-bank.mjs 從 content/en、content/zh 產生）
// 每一題可以是字串，或是 { t: 文字, …說明 }；"retired": true 的題目不再出題，但編號保留（舊的排行榜、分享連結還對得上）。
import { CODE, CODE_WORDS, CODE_UNITS } from "./bank-code.js";
import { TEXT } from "./bank-text.js";

export const BANK = {
  cpp: { word: CODE_WORDS.cpp, sent: CODE.cpp.filter((x) => x.len === "sent"), para: CODE.cpp.filter((x) => x.len === "para") },
  py: { word: CODE_WORDS.py, sent: CODE.py.filter((x) => x.len === "sent"), para: CODE.py.filter((x) => x.len === "para") },
  en: TEXT.en,
  zh: TEXT.zh,
};

export { CODE_UNITS };
export const CATS = ["cpp", "py", "en", "zh"];
export const LENS = ["word", "sent", "para"];
export const CAT_NAME = { cpp: "C++", py: "Python", en: "英文", zh: "中文" };
export const LEN_NAME = { word: "單詞", sent: "句子", para: "整段", drill: "弱點練習" };
const WORD_N = { cpp: 6, py: 6, en: 15, zh: 10 };
export const itemText = (x) => (typeof x === "string" ? x : x.t);

/** 題目規格 → 用到的題目（物件或字串的陣列）。spec = { c: 類別, l: 長度, i: [索引…] } */
export function itemsOf(spec) {
  const b = BANK[spec?.c]?.[spec?.l];
  if (!b || !Array.isArray(spec.i) || !spec.i.length) return null;
  const items = spec.i.map((k) => (Number.isInteger(k) ? b[k] : undefined));
  return items.some((x) => x === undefined) ? null : items;
}

/** 題目規格 → 文字 */
export function textOf(spec) {
  const items = itemsOf(spec);
  if (!items) return null;
  const ts = items.map(itemText);
  if (spec.l !== "word") return ts.length === 1 ? ts[0] : null;
  if (ts.length !== WORD_N[spec.c]) return null;
  if (spec.c === "zh") return ts.join("，") + "。";
  if (spec.c === "en") return ts.join(" ");
  return ts.join("\n");
}

/** 隨機出一題；avoid＝上一題的規格（避免連續同一題）；unit＝只出這個單元（程式題） */
export function randomSpec(c, l, avoid, rnd = Math.random, unit = "") {
  const b = BANK[c][l];
  let keys = [...b.keys()].filter((k) => !b[k]?.retired);
  if (unit && (c === "cpp" || c === "py")) { const f = keys.filter((k) => b[k].unit === unit); if (f.length) keys = f; }
  if (l === "word") {
    const idx = [];
    let pool = keys.slice();
    while (idx.length < WORD_N[c]) {
      if (!pool.length) pool = keys.slice();
      idx.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    return { c, l, i: idx };
  }
  let k, tries = 0;
  do { k = keys[Math.floor(rnd() * keys.length)]; } while (avoid && avoid.c === c && avoid.l === l && avoid.i?.[0] === k && keys.length > 1 && tries++ < 9);
  return { c, l, i: [k] };
}
