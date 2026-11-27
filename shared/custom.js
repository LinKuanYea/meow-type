// 老師自訂題組：老師在管理頁 /admin/sets 貼文章或程式，學生用 /t/編號 打。
// 例如貼這週英文課本那一課，學生打完就複習了；範圍由老師決定。不給小魚乾（避免刷）。

export const CUSTOM_ID = /^set-([0-9A-Za-z]{6})$/;
export const CUSTOM_LANGS = { en: "英文", zh: "中文", cpp: "C++", py: "Python" };
export const CUSTOM_TARGET = { en: 25, zh: 40, cpp: 15, py: 15 }; // 三星速度的預設（WPM；中文是字/分）
export const CUSTOM_MAX = { chars: 6000, passage: 2500, passages: 20, title: 40 };

/** 英文：把常見的「漂亮」符號換成鍵盤打得出來的 */
function normEn(t) {
  return t.replace(/[‘’′]/g, "'").replace(/[“”″]/g, '"').replace(/[–—−]/g, "-")
    .replace(/…/g, "...").replace(/[ 　]/g, " ").replace(/[ \t]+/g, " ").trim();
}
function normZh(t) { return t.replace(/[ ]/g, " ").replace(/[ \t]+/g, " ").trim(); }
function normCode(t) {
  return t.replace(/\t/g, "    ").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/^\n+|\n+$/g, "");
}

/**
 * 檢查並整理老師貼的內容。text：用單獨一行 --- 隔開不同段落（文章或程式）；英文、中文每一行是一段要打的文字。
 * 回傳 { title, lang, texts, target } 或 { error }
 */
export function cleanCustom({ title, lang, text, target }) {
  title = String(title || "").replace(/\s+/g, " ").trim();
  if (!title || title.length > CUSTOM_MAX.title) return { error: `標題要 1～${CUSTOM_MAX.title} 個字` };
  if (!CUSTOM_LANGS[lang]) return { error: "語言不對" };
  const t = Number(target) || CUSTOM_TARGET[lang];
  if (!(t >= 5 && t <= 200)) return { error: "三星速度要在 5～200 之間" };
  const raw = String(text || "").replace(/\r\n?/g, "\n");
  const passages = raw.split(/\n[ \t]*---+[ \t]*\n/).map((p) => p.replace(/^\s*---+\s*$/gm, ""));
  const texts = [];
  for (const p of passages) {
    if (lang === "cpp" || lang === "py") { const c = normCode(p); if (c) texts.push(c); continue; }
    for (const line of p.split("\n")) {
      const s = lang === "en" ? normEn(line) : normZh(line);
      if (s) texts.push(s);
    }
  }
  if (!texts.length) return { error: "沒有內容" };
  if (texts.length > CUSTOM_MAX.passages * 10) return { error: "段落太多了" };
  for (const s of texts) {
    if (s.length > CUSTOM_MAX.passage) return { error: `有一段超過 ${CUSTOM_MAX.passage} 字，請用 --- 分開` };
    if (lang === "en" && !/^[\x20-\x7e]+$/.test(s)) {
      const bad = [...new Set(s.replace(/[\x20-\x7e]/g, ""))].join(" ");
      return { error: `英文裡有鍵盤打不出來的字元：${bad}` };
    }
    if ((lang === "cpp" || lang === "py") && /[^\x20-\x7e\n　-〿一-鿿＀-￯]/.test(s)) return { error: "程式裡有奇怪的字元（只能英數、符號和中文字）" };
  }
  const chars = texts.reduce((a, s) => a + s.length, 0);
  if (chars > CUSTOM_MAX.chars) return { error: `總共 ${chars} 字，最多 ${CUSTOM_MAX.chars} 字` };
  return { title, lang, texts, target: Math.round(t) };
}

/** 題組變成冒險模式的關卡（前端與伺服器驗算共用） */
export function customLevel(s) {
  return {
    id: "set-" + s.id, name: s.title, lang: s.lang, texts: s.texts, target: s.target, custom: { id: s.id, title: s.title },
    boss: { name: "老師的題目怪", glyph: "✎", color: "#9b6ad6" }, big: false, prev: null, login: false, index: 0, chapter: "set-0", island: "set",
  };
}
