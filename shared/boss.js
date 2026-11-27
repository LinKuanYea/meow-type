// 世界 Boss：每週一隻（台灣時間週一 00:00 到週日 23:59），所有登入的人一起打同一隻、共用血條。
// 前端顯示與伺服器驗算共用：Boss 輪替、週次計算、出擊的文字（從現有題庫抽，不另外寫題目）、傷害、獎勵的數字都以這裡為準。
import { BANK } from "./bank.js";
import { ISLANDS } from "./quest.js";

export const THEMES = { cpp: "C++", py: "Python", en: "英文" };

// Boss 的像素圖：16 × 14 格的貓咪怪獸。b 身體、d 深色（外框、耳朵、腳）、p 粉紅（耳朵裡、鼻子）、w 眼白、e 眼睛、m 嘴巴
export const BOSS_ART = [
  ".dd..........dd.",
  ".dpd........dpd.",
  ".dbbdddddddddbd.",
  ".dbbbbbbbbbbbbd.",
  "dbbwwbbbbbbwwbbd",
  "dbbwebbbbbbwebbd",
  "dbbbbbbppbbbbbbd",
  "dbbbbbmbbmbbbbbd",
  "dbbbbbbmmbbbbbbd",
  ".dbbbbbbbbbbbbd.",
  "dbbbbbbbbbbbbbbd",
  "dbbbbbbbbbbbbbbd",
  ".dbbbbbbbbbbbbd.",
  "..dd.dd..dd.dd..",
];

/**
 * Boss 輪替：每週照順序換下一隻，主題輪流 C++ → Python → 英文。
 * item：打倒後每個有造成傷害的人都拿到的限定裝扮（shared/items.js）或貓窩家具（shared/den.js），那件的 from ＝ "boss:" + id
 */
export const BOSSES = [
  { id: "loop-cat", name: "無限迴圈胖橘", theme: "cpp", glyph: "∞", color: "#f08a24", item: "den-yarn",
    intro: "忘了寫 i++ 的 while 迴圈變成的胖橘貓，一直轉圈圈停不下來。用正確的 C++ 讓牠停下來！" },
  { id: "py-snake", name: "縮排大蟒喵", theme: "py", glyph: ">>>", color: "#3b8f5a", item: "neck-pyscarf",
    intro: "把 Tab 和空白混在一起吃掉的大蟒喵。每一行都縮排對，牠就會頭暈！" },
  { id: "typo-cat", name: "拼字怪喵 Typo", theme: "en", glyph: "Aa", color: "#d6487a", item: "face-magnifier",
    intro: "專門把 the 打成 teh 的搗蛋貓。一個字一個字拼對，牠就沒辦法搗蛋。" },
  { id: "segfault", name: "段錯誤巨喵", theme: "cpp", glyph: "*p", color: "#5b4bc4", item: "hat-antenna",
    intro: "陣列超出範圍時會從記憶體裡跑出來的巨喵。小心每一個中括號！" },
  { id: "except-king", name: "例外貓王", theme: "py", glyph: "!", color: "#c43b3b", item: "back-except",
    intro: "最愛丟出 Exception 的貓王，牠一叫就是一整片紅字。打對每一個冒號讓牠閉嘴！" },
  { id: "grammeow", name: "文法魔喵", theme: "en", glyph: "ABC", color: "#2f7fb8", item: "den-blocks",
    intro: "把單字的順序全部打亂的魔法貓。一句一句打對，把文法變回來！" },
];
export const BOSS = new Map(BOSSES.map((b) => [b.id, b]));

/* ---------- 週次（台灣時間） ---------- */
const DAY = 86400000, TZ = 8 * 3600000;
export const EPOCH_WEEK = "2026-11-23"; // 第 0 週（週一）：BOSSES[0]
/** ms 所在的那一週：{ key: 週一的日期, start, end（下週一 00:00，不含）, index: 第幾週 } */
export function weekOf(ms = Date.now()) {
  const local = ms + TZ, day = Math.floor(local / DAY) * DAY;
  const dow = (new Date(day).getUTCDay() + 6) % 7; // 週一＝0
  const mon = day - dow * DAY;
  const key = new Date(mon).toISOString().slice(0, 10);
  return { key, start: mon - TZ, end: mon + 7 * DAY - TZ, index: Math.round((mon - Date.parse(EPOCH_WEEK + "T00:00:00Z")) / (7 * DAY)) };
}
/** 第幾週的 Boss（往前的週次也對得上） */
export const bossOfIndex = (i) => BOSSES[((i % BOSSES.length) + BOSSES.length) % BOSSES.length];
export const bossOfWeek = (ms = Date.now()) => bossOfIndex(weekOf(ms).index);
/** 上一週的週一日期 */
export const prevWeekKey = (key) => new Date(Date.parse(key + "T00:00:00Z") - 7 * DAY).toISOString().slice(0, 10);

/* ---------- 出擊的文字：只從現有題庫抽 ---------- */
// C++、Python：冒險模式那座島所有關卡的每一段（關卡文字都是林老師的 AC 作答或裡面的行）
// 英文：bank-text.js 的句子和整段（不出已退休的題目）
// 每段的 id：程式 "q:關卡:段"、英文 "en:sent:編號" / "en:para:編號"
const POOL = new Map();
function buildPool(theme) {
  const out = [];
  if (theme === "en") {
    for (const l of ["sent", "para"]) BANK.en[l].forEach((x, i) => { if (!x.retired) out.push({ id: `en:${l}:${i}`, lang: "en", texts: [typeof x === "string" ? x : x.t], from: l === "sent" ? "英文句子" : "英文整段" }); });
  } else {
    const is = ISLANDS.find((x) => x.id === theme);
    for (const ch of is.chapters) for (const lv of ch.levels) lv.segs.forEach((sg, k) => out.push({ id: `q:${lv.id}:${k}`, lang: theme, texts: sg.slice(), from: `${is.name} ${lv.chapter.split("-")[1]}-${lv.index + 1} ${lv.name}${lv.segs.length > 1 ? `（第 ${k + 1} 段）` : ""}` }));
  }
  for (const p of out) p.chars = p.texts.reduce((a, t) => a + t.length, 0);
  return out;
}
export function piecesOf(theme) { if (!POOL.has(theme)) POOL.set(theme, buildPool(theme)); return POOL.get(theme); }
export function pieceOf(theme, id) { return piecesOf(theme).find((p) => p.id === id) || null; }
/** 隨機抽一段（avoid：上一段的 id，避免連續同一段） */
export function randomPiece(theme, avoid, rnd = Math.random) {
  const all = piecesOf(theme), pool = all.length > 1 ? all.filter((p) => p.id !== avoid) : all;
  return pool[Math.floor(rnd() * pool.length)];
}
export const avgChars = (theme) => { const a = piecesOf(theme); return a.reduce((s, p) => s + p.chars, 0) / a.length; };

/* ---------- 傷害、血量、次數、獎勵 ---------- */
/** 傷害＝打對的字數 × 正確率加成（無條件捨去） */
export const ACC_BONUS = [[0.98, 1.5], [0.95, 1.2], [0.85, 1], [0, 0.5]];
export const accBonus = (acc) => ACC_BONUS.find(([a]) => acc >= a)[1];
export const damageOf = (sum) => Math.floor(sum.correct * accBonus(sum.acc));
export const DAILY_CAP = 5; // 每人每天（台灣時間）最多算幾次出擊的傷害；超過還是可以打，但不扣血、沒有小魚乾
/**
 * 血量＝max(上週有打字的登入人數, 下限 10 人) × 每人份 × 管理頁的倍率，取整到百位。
 * 每人份＝這週主題平均一段的字數 × 4（大約每人 4 次出擊；實際上不是每個人都會來打，來的人要多打幾次＝要大家合作）
 */
export const HP_RULE = { minPlayers: 10, sortiesPerPlayer: 4 };
export function baseHp(players, theme) {
  const n = Math.max(HP_RULE.minPlayers, players | 0);
  return Math.max(100, Math.round((n * avgChars(theme) * HP_RULE.sortiesPerPlayer) / 100) * 100);
}
export const hpWith = (base, mult) => Math.max(1, Math.round(base * (mult > 0 ? mult : 1)));
/**
 * 小魚乾：每次算傷害的出擊 2 條（每天最多 5 次＝10 條，比冒險模式重打每天 20 條少）；
 * 打倒時每個有造成傷害的人 30 條＋限定獎勵；傷害第 1、2、3 名再加 30、20、10 條。逃走了就沒有打倒的獎勵。
 */
export const BOSS_FISH = { hit: 2, clear: 30, top: [30, 20, 10] };
export const BOSS_RULE = `傷害＝打對的字數 × 正確率加成（98% 以上 ×1.5、95% 以上 ×1.2、85% 以上 ×1、更低 ×0.5）。每天前 ${DAILY_CAP} 次出擊算傷害，每次 ${BOSS_FISH.hit} 條小魚乾。`;
