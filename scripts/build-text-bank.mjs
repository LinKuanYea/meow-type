// 英文、中文題庫：content/en/*.json、content/zh/*.json → shared/bank-text.js
// 用法：node scripts/build-text-bank.mjs          產生
//       node scripts/build-text-bank.mjs --check  只檢查（測試用：資料檔改了卻沒重新產生就失敗）
//
// 規則（檢查不過就不產生）：
// - 每一題一行；只能「加在最後面」或「修錯字」，不能刪除或調換順序。
//   排行榜、分享連結存的是題目編號，刪掉或換順序會讓舊的挑戰變成別的題目。
//   要拿掉一題：在那一題加 "retired": true（不會再出題，但編號保留）。
// - 英文只能用半形英文字、數字、標點；中文句子的標點要全形。
// - 英文單字要有詞性、中文意思、程度（1 = 國中，2 = 高中）。
//
// 每日新聞（content/news/YYYY-MM-DD.json，格式見 content/news/README.md）也在這裡檢查，
// 複製到 shared/news/日期.json，並產生 shared/news/index.json（日期、標題、主題）。
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SRC = {
  en: { word: "content/en/words.json", sent: "content/en/sentences.json", para: "content/en/paragraphs.json" },
  zh: { word: "content/zh/words.json", sent: "content/zh/sentences.json", para: "content/zh/paragraphs.json" },
};
const OUT = "shared/bank-text.js", LOCK = "content/text-bank.lock.json";
const errs = [];
const err = (where, msg) => errs.push(`${where}：${msg}`);
const textOf = (x) => (typeof x === "string" ? x : x?.t);

/** 編輯距離比例（判斷是「修錯字」還是「換成別題」） */
function diffRatio(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n] / Math.max(m, n);
}

const EN_OK = /^[A-Za-z0-9 .,;:!?'"()\-]+$/;
const ZH_HALF_PUNCT = /[,.;:!?()]/;
const POS = /^(n|v|adj|adv|prep|conj|pron|ph|int|aux)\.(\/(n|v|adj|adv|prep|conj|pron)\.)*$/;

function checkEn(l, x, where) {
  const t = textOf(x);
  if (typeof t !== "string" || !t.trim()) return err(where, "沒有文字");
  if (!EN_OK.test(t)) err(where, `有不該出現的字元：${JSON.stringify(t.replace(/[A-Za-z0-9 .,;:!?'"()\-]/g, ""))}`);
  if (/\s{2,}|^\s|\s$/.test(t)) err(where, "多餘的空白");
  if (l === "word") {
    if (/\s/.test(t)) err(where, "單字不能有空白");
    if (!POS.test(x.pos || "")) err(where, `詞性格式不對：${x.pos}`);
    if (!x.zh) err(where, "缺中文意思");
    if (![1, 2].includes(x.lv)) err(where, "程度要是 1（國中）或 2（高中）");
  } else {
    if (!Array.isArray(x.vocab) || !x.vocab.length) err(where, "缺單字片語說明 vocab");
    for (const [k, vb] of (x.vocab || []).entries()) {
      const w2 = `${where} vocab[${k}]`;
      if (!vb.w || !vb.zh) err(w2, "缺 w 或 zh");
      if (!POS.test(vb.pos || "")) err(w2, `詞性格式不對：${vb.pos}`);
      if (![1, 2].includes(vb.lv)) err(w2, "程度要是 1 或 2");
      if (vb.ex && !EN_OK.test(vb.ex)) err(w2, "例句有不該出現的字元");
    }
  }
}
function checkZh(l, x, where) {
  const t = textOf(x);
  if (typeof t !== "string" || !t.trim()) return err(where, "沒有文字");
  if (/\s/.test(t)) err(where, "中文題目不能有空白");
  if (/[A-Za-z]/.test(t)) err(where, "中文題目不能有英文字母（打字時要切輸入法）");
  if (l === "word") {
    if (/[，。、；：！？]/.test(t)) err(where, "詞語不能有標點");
    if (typeof x !== "string" && !x.zh) err(where, "成語要有解釋 zh");
  } else {
    if (ZH_HALF_PUNCT.test(t)) err(where, "標點要全形");
    if (!/[。！？]$/.test(t)) err(where, "句子要用。！？結尾");
  }
}

const bank = {};
const lock = existsSync(root + LOCK) ? JSON.parse(readFileSync(root + LOCK, "utf8")) : {};
const newLock = {};
for (const [c, ls] of Object.entries(SRC)) {
  bank[c] = {};
  for (const [l, file] of Object.entries(ls)) {
    let arr;
    try { arr = JSON.parse(readFileSync(root + file, "utf8")); } catch (e) { err(file, "JSON 格式錯誤：" + e.message); continue; }
    if (!Array.isArray(arr)) { err(file, "要是陣列"); continue; }
    const seen = new Map();
    arr.forEach((x, i) => {
      const where = `${file} 第 ${i + 1} 題`;
      (c === "en" ? checkEn : checkZh)(l, x, where);
      const t = textOf(x);
      if (seen.has(t)) err(where, `和第 ${seen.get(t) + 1} 題重複`);
      seen.set(t, i);
    });
    const old = lock[`${c}.${l}`] || [];
    if (arr.length < old.length) err(file, `題目變少了（原本 ${old.length} 題）：不能刪除，請改成 "retired": true`);
    old.forEach((ot, i) => {
      const t = textOf(arr[i]);
      if (typeof t === "string" && diffRatio(ot, t) > 0.3) err(`${file} 第 ${i + 1} 題`, `跟原本差太多（原本：${ot.slice(0, 30)}…）。新題目請加在最後面，不要換順序`);
    });
    if (arr.filter((x) => !x?.retired).length < (l === "word" ? 15 : 1)) err(file, "可以出的題目太少");
    bank[c][l] = arr;
    newLock[`${c}.${l}`] = arr.map(textOf);
  }
}

/* ---------- 每日新聞 ---------- */
const NEWS_DIR = "content/news", NEWS_OUT = "shared/news";
const news = {};
const words = (t) => (t.match(/[A-Za-z0-9'-]+/g) || []).length;
const KEY = /^(\d{4}-\d{2}-\d{2})(-[1-9])?$/; // 2026-11-27（最早只有一篇）或 2026-11-28-1、-2、-3（每天 3 篇）
for (const f of existsSync(root + NEWS_DIR) ? readdirSync(root + NEWS_DIR).filter((x) => x.endsWith(".json")).sort() : []) {
  const where = `${NEWS_DIR}/${f}`, key = f.slice(0, -5), km = KEY.exec(key), date = km ? km[1] : "", short = !!km?.[2];
  let n;
  try { n = JSON.parse(readFileSync(root + where, "utf8")); } catch (e) { err(where, "JSON 格式錯誤：" + e.message); continue; }
  if (!km || n.date !== date) err(where, "檔名要是 YYYY-MM-DD-編號.json，date 要跟檔名的日期一樣");
  if (typeof n.title !== "string" || !n.title.trim() || n.title.length > 60) err(where, "title：中文標題，60 字以內");
  if (typeof n.topic !== "string" || !n.topic.trim()) err(where, "缺 topic");
  const [pMin, pMax] = short ? [1, 3] : [2, 5];
  if (!Array.isArray(n.paras) || n.paras.length < pMin || n.paras.length > pMax) err(where, `paras：${pMin}～${pMax} 段`);
  for (const [i, t] of (n.paras || []).entries()) {
    if (typeof t !== "string" || !EN_OK.test(t)) err(`${where} 第 ${i + 1} 段`, `有不該出現的字元（彎引號、破折號、全形…）：${JSON.stringify(String(t).replace(/[A-Za-z0-9 .,;:!?'"()\-]/g, ""))}`);
    else if (/\s{2,}|^\s|\s$/.test(t)) err(`${where} 第 ${i + 1} 段`, "多餘的空白");
  }
  const wc = (n.paras || []).reduce((a, t) => a + words(String(t)), 0);
  const [wMin, wMax] = short ? [70, 140] : [120, 280]; // 短篇目標 80～120 字，留一點彈性
  if (wc < wMin || wc > wMax) err(where, `全文 ${wc} 字，要 ${wMin}～${wMax} 字`);
  const [vMin, vMax] = short ? [3, 8] : [5, 12];
  if (!Array.isArray(n.vocab) || n.vocab.length < vMin || n.vocab.length > vMax) err(where, `vocab：${vMin}～${vMax} 個`);
  for (const [k, vb] of (n.vocab || []).entries()) {
    const w2 = `${where} vocab[${k}]`;
    if (!vb.w || !vb.zh || !POS.test(vb.pos || "") || ![1, 2, 3].includes(vb.lv)) err(w2, "要有 w、pos、zh、lv（1 國中、2 高中、3 進階）");
    else if (!(n.paras || []).join(" ").toLowerCase().includes(vb.w.toLowerCase().split(" ")[0])) err(w2, `文章裡找不到「${vb.w}」`);
  }
  if (!Array.isArray(n.questions) || n.questions.length < 2 || n.questions.length > 3) err(where, "questions：2～3 題");
  for (const [k, q] of (n.questions || []).entries()) {
    const w2 = `${where} questions[${k}]`;
    if (!q.q || !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3 || !q.why) err(w2, "要有 q、4 個 options、answer（0～3）、why（中文說明）");
    else if (new Set(q.options).size !== 4) err(w2, "選項重複");
  }
  if (!Array.isArray(n.sources) || !n.sources.length || n.sources.some((x) => !x.name || !/^https:\/\/[^\s"<>]+$/.test(x.url || ""))) err(where, "sources：至少 1 個 { name, url（https） }");
  news[key] = { key, date, title: n.title, topic: n.topic, paras: n.paras, vocab: n.vocab, questions: n.questions, sources: n.sources };
}
// 同一天的主題要錯開
const byDay = {};
for (const n of Object.values(news)) (byDay[n.date] ||= []).push(n);
for (const [d, ns] of Object.entries(byDay)) {
  const t = ns.map((n) => String(n.topic).trim().toLowerCase());
  if (new Set(t).size !== t.length) err(`${NEWS_DIR}/${d}`, `同一天的主題重複了：${ns.map((n) => n.topic).join("、")}`);
}
// 新的日期在前；同一天照編號
const newsIndex = Object.values(news).sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.key < b.key ? -1 : 1))
  .map(({ key, date, title, topic, paras }) => ({ key, date, title, topic, chars: paras.reduce((x, t) => x + t.length, 0) }));

if (errs.length) {
  console.error("題庫檢查沒過：\n" + errs.map((e) => "  ✗ " + e).join("\n"));
  process.exit(1);
}
const out = `// 由 scripts/build-text-bank.mjs 從 content/en、content/zh 產生，不要手改。\n` +
  `export const TEXT = ${JSON.stringify(bank, null, 0).replace(/\],"/g, '],\n"').replace(/\},\{/g, "},\n{")};\n`;
const lockOut = JSON.stringify(newLock, null, 1) + "\n";
const newsFiles = { "index.json": JSON.stringify(newsIndex) + "\n" };
for (const n of Object.values(news)) newsFiles[n.key + ".json"] = JSON.stringify(n) + "\n";
if (process.argv.includes("--check")) {
  const cur = existsSync(root + OUT) ? readFileSync(root + OUT, "utf8") : "";
  const curLock = existsSync(root + LOCK) ? readFileSync(root + LOCK, "utf8") : "";
  const have = existsSync(root + NEWS_OUT) ? readdirSync(root + NEWS_OUT).sort() : [];
  const newsOk = JSON.stringify(have) === JSON.stringify(Object.keys(newsFiles).sort()) && Object.entries(newsFiles).every(([f, c]) => readFileSync(`${root}${NEWS_OUT}/${f}`, "utf8") === c);
  if (cur !== out || curLock !== lockOut || !newsOk) { console.error("content/ 改過了，請執行 node scripts/build-text-bank.mjs 重新產生"); process.exit(1); }
  console.log("英文、中文題庫、每日新聞：檢查通過");
} else {
  writeFileSync(root + OUT, out);
  writeFileSync(root + LOCK, lockOut);
  rmSync(root + NEWS_OUT, { recursive: true, force: true }); mkdirSync(root + NEWS_OUT, { recursive: true });
  for (const [f, c] of Object.entries(newsFiles)) writeFileSync(`${root}${NEWS_OUT}/${f}`, c);
  const n = (c) => Object.entries(bank[c]).map(([l, a]) => `${l} ${a.length}`).join("、");
  console.log(`已產生 ${OUT}（英文：${n("en")}；中文：${n("zh")}）、每日新聞 ${newsIndex.length} 篇`);
}
