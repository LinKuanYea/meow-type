// 冒險模式：島 → 章 → 關。前端顯示與伺服器驗算共用（關卡文字、星星、小魚乾都以這裡為準）。
// 程式題的關卡一律用題庫裡林老師的 AC 作答（content/code/），用 id 或那一行的文字找，不怕題庫順序改變。
import { BANK } from "./bank.js";

const code = (lang, id) => {
  for (const l of ["sent", "para"]) { const x = BANK[lang][l].find((y) => y.id === id); if (x) return x; }
  throw new Error("冒險模式找不到程式題：" + id);
};
const line = (lang, t) => {
  const x = BANK[lang].word.find((y) => y.t === t);
  if (!x) throw new Error("冒險模式找不到這一行：" + t);
  return x;
};

/**
 * 關卡：
 *  parts：要打的段落（打完一段自動接下一段）。{ lines: [...] } ＝ 幾行單獨的程式；{ code: id } ＝ 一整題程式
 *  target：三星要的速度（WPM）
 *  boss：這關的怪物（每關都有，最後一關是大 Boss）
 */
export const ISLANDS = [
  {
    id: "cpp", name: "C++ 島", lang: "cpp", open: true,
    chapters: [
      {
        id: "cpp-1", name: "第 1 章　輸入與輸出", unit: "Basic Input and Output", login: false,
        levels: [
          { id: "cpp-1-1", name: "宣告與輸入", parts: [{ lines: ["int r;", "cin >> r;", "string name;", "cin >> name >> year;"] }], target: 15, boss: { name: "分號史萊姆", glyph: ";", color: "#7cc576" } },
          { id: "cpp-1-2", name: "輸出暖身", parts: [{ lines: ["cout << r*r*3.1415926;", "cout << \">\\\"<\\\\\\\\\\n\\\\|/\";"] }], target: 15, boss: { name: "箭頭蝙蝠", glyph: "<<", color: "#8f7cd6" } },
          { id: "cpp-1-3", name: "圓面積", parts: [{ code: "cpp-circle" }], target: 15, learn: "cpp-circle", boss: { name: "圓周率球", glyph: "π", color: "#5aa9e6" } },
          { id: "cpp-1-4", name: "美國親戚的自我介紹", parts: [{ code: "cpp-intro" }], target: 15, learn: "cpp-intro", boss: { name: "引號雙子", glyph: "\"\"", color: "#e6a35a" } },
          { id: "cpp-1-5", name: "Boss：跳脫字元怪", parts: [{ code: "cpp-escape" }, { lines: ["cout << \"\\\"您好，我的名字是\" << name << \"！民國\" << year-1911 << \"年出生 ><\\\"\\\\\\\\\\\"\";"] }], target: 15, learn: "cpp-escape", big: true, drop: "back-cout", boss: { name: "跳脫字元怪", glyph: "\\", color: "#d65a5a" } },
        ],
      },
      {
        id: "cpp-2", name: "第 2 章　運算子", unit: "Operators", login: true,
        levels: [
          { id: "cpp-2-1", name: "加減乘除", parts: [{ lines: ["int a, b;", "cout << a << \" + \" << b << \" = \" << a + b << endl;", "cout << a << \" / \" << b << \" = \" << a / b << endl;", "cout << a << \" % \" << b << \" = \" << a % b << endl;"] }], target: 18, boss: { name: "加號仙人掌", glyph: "+", color: "#7cc576" } },
          { id: "cpp-2-2", name: "型別轉換", parts: [{ lines: ["double c = a;", "cout << a << \" / \" << b << \" = \" << c/b << endl;", "double a;", "int b = a + 0.5;"] }], target: 18, boss: { name: "小數點蟲", glyph: ".5", color: "#5aa9e6" } },
          { id: "cpp-2-3", name: "整數的五則運算", parts: [{ code: "cpp-arith" }], target: 18, learn: "cpp-arith", boss: { name: "除號刺蝟", glyph: "/", color: "#8f7cd6" } },
          { id: "cpp-2-4", name: "除法原理", parts: [{ code: "cpp-division" }], target: 18, learn: "cpp-division", boss: { name: "餘數幽靈", glyph: "%", color: "#9aa0b5" } },
          { id: "cpp-2-5", name: "Boss：四捨五入魔", parts: [{ lines: ["cout << a << \" = \" << b << \" * \" << a/b << \" + \" << a%b;"] }, { code: "cpp-round" }], target: 18, learn: "cpp-round", big: true, drop: "face-calc", boss: { name: "四捨五入魔", glyph: "≈", color: "#d65a5a" } },
        ],
      },
      {
        id: "cpp-3", name: "第 3 章　選擇結構", unit: "Selection Structure", login: true,
        levels: [
          { id: "cpp-3-1", name: "if 的樣子", parts: [{ lines: ["if (x % y == 0) {", "int price = a*b + c*d;", "if (price <= 100) {", "else if (price % 10 == 9) {"] }], target: 20, boss: { name: "問號鳥", glyph: "?", color: "#e6a35a" } },
          { id: "cpp-3-2", name: "打折條件", parts: [{ lines: ["int result = price * 0.9;", "else if (price % 8 == 0) {", "if (price * 0.85 - a > 0) {", "else if (price % 100 == 77) {", "int result = (price - 100) * 0.5 + 100 + 0.5;"] }], target: 20, boss: { name: "折扣狐狸", glyph: "%", color: "#e6845a" } },
          { id: "cpp-3-3", name: "倍數判斷", parts: [{ code: "cpp-multiple" }], target: 20, learn: "cpp-multiple", boss: { name: "等號雙蛇", glyph: "==", color: "#7cc576" } },
          { id: "cpp-3-4", name: "Boss：福利社店長", parts: [{ code: "cpp-shop" }], target: 20, learn: "cpp-shop", big: true, drop: "hat-crown", boss: { name: "福利社店長", glyph: "if", color: "#d65a5a" } },
        ],
      },
    ],
  },
  { id: "py", name: "Python 島", lang: "py", open: false, chapters: [] },
  { id: "en", name: "英文島", lang: "en", open: false, chapters: [] },
  { id: "zh", name: "中文島", lang: "zh", open: false, chapters: [] },
];

export const LEVELS = new Map();
for (const is of ISLANDS) for (const ch of is.chapters) ch.levels.forEach((lv, k) => {
  lv.island = is.id; lv.lang = is.lang; lv.chapter = ch.id; lv.login = ch.login; lv.index = k;
  lv.texts = lv.parts.map((p) => (p.code ? code(is.lang, p.code).t : p.lines.map((t) => line(is.lang, t).t).join("\n")));
  lv.prev = k > 0 ? ch.levels[k - 1].id : null;
  LEVELS.set(lv.id, lv);
});
// 每章第一關：上一章的最後一關要過
for (const is of ISLANDS) is.chapters.forEach((ch, k) => { if (k > 0) ch.levels[0].prev = is.chapters[k - 1].levels[is.chapters[k - 1].levels.length - 1].id; });

export const learnItem = (lv) => (lv.learn ? code(lv.lang, lv.learn) : null);

/** 星星：★ 打完且正確率 85% 以上；★★ 正確率 95% 以上；★★★ 再加上速度達標 */
export function starsOf(lv, sum) {
  if (!sum || sum.acc < 0.85) return 0;
  if (sum.acc < 0.95) return 1;
  return sum.speed >= lv.target ? 3 : 2;
}
export const STAR_RULE = "★ 正確率 85% 以上・★★ 正確率 95% 以上・★★★ 再加上速度達標";

/** 小魚乾：第一次拿到的每顆星 10 條，大 Boss 第一次打倒再加 20 條；已經拿過的星星重打一次 2 條（每天最多 10 次） */
export const FISH = { star: 10, boss: 20, replay: 2, replayPerDay: 10 };
export function fishFor(lv, prevStars, stars, replaysToday) {
  let f = Math.max(0, stars - prevStars) * FISH.star;
  if (lv.big && prevStars === 0 && stars > 0) f += FISH.boss;
  if (stars > 0 && stars <= prevStars && replaysToday < FISH.replayPerDay) f += FISH.replay;
  return f;
}
export const unlocked = (lv, stars) => !lv.prev || (stars[lv.prev] || 0) > 0;
