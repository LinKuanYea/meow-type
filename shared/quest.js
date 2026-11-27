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
      {
        id: "cpp-4", name: "第 4 章　條件迴圈", unit: "Conditional Loop", login: true,
        levels: [
          { id: "cpp-4-1", name: "while 的樣子", parts: [{ lines: ["int hp = 100;", "while (hp > 0) {", "hp = hp - atk;", "cout << \"hp = \" << hp << endl;"] }], target: 20, boss: { name: "迴圈陀螺", glyph: "while", color: "#5aa9e6" } },
          { id: "cpp-4-2", name: "換瓶子", parts: [{ lines: ["coke = money / 27;", "bottle = coke;", "while (bottle >= 4) {", "bottle = bottle - 4;", "coke = coke + 1;", "bottle = bottle + 1;", "money = money % 27;"] }], target: 20, boss: { name: "空瓶怪", glyph: "/27", color: "#7cc576" } },
          { id: "cpp-4-3", name: "魔王勇者", parts: [{ code: "cpp-boss" }], target: 20, learn: "cpp-boss", boss: { name: "魔王", glyph: "hp", color: "#8f7cd6" } },
          { id: "cpp-4-4", name: "肥宅快樂水（瓶子）", parts: [{ code: "cpp-coke" }], target: 20, learn: "cpp-coke", boss: { name: "可樂瓶怪", glyph: "%4", color: "#e6845a" } },
          { id: "cpp-4-5", name: "質數判斷", parts: [{ code: "cpp-prime" }], target: 20, learn: "cpp-prime", boss: { name: "質數守門員", glyph: "break", color: "#9aa0b5" } },
          { id: "cpp-4-6", name: "五數最大值", parts: [{ code: "cpp-max5" }], target: 20, learn: "cpp-max5", boss: { name: "最大值熊", glyph: ">", color: "#e6a35a" } },
          { id: "cpp-4-7", name: "Boss：快樂水大魔王", parts: [{ code: "cpp-coke2" }], target: 20, learn: "cpp-coke2", big: true, drop: "neck-bell", boss: { name: "快樂水大魔王", glyph: "||", color: "#d65a5a" } },
        ],
      },
      {
        id: "cpp-5", name: "第 5 章　計數迴圈", unit: "Counting Loop", login: true,
        levels: [
          { id: "cpp-5-1", name: "for 的樣子", parts: [{ lines: ["for (int t = 2; t <= N-1; t = t + 1) {", "for (int m = 0; m <= a-1; m = m + 1) {", "for (int n = 0; n <= b-1; n = n + 1) {", "for (int t = 1; t <= N; t = t + 1) {", "for (int t = 1; t <= n-1; t = t + 1) {"] }], target: 22, boss: { name: "range 蜈蚣", glyph: "for", color: "#7cc576" } },
          { id: "cpp-5-2", name: "for 迴圈裡面", parts: [{ lines: ["cout << \"\\n\";", "string S;", "cout << S;", "int d = a2 - a1;", "cout << a;", "a = a + d;"] }], target: 22, boss: { name: "加一蟲", glyph: "+1", color: "#5aa9e6" } },
          { id: "cpp-5-3", name: "字串重複", parts: [{ code: "cpp-repeat" }], target: 22, learn: "cpp-repeat", boss: { name: "複製蟲", glyph: "×N", color: "#8f7cd6" } },
          { id: "cpp-5-4", name: "等差數列", parts: [{ code: "cpp-seq" }], target: 22, learn: "cpp-seq", boss: { name: "公差蛇", glyph: "+d", color: "#e6a35a" } },
          { id: "cpp-5-5", name: "Boss：格子點巨人", parts: [{ code: "cpp-grid" }], target: 22, learn: "cpp-grid", big: true, drop: "back-wings", boss: { name: "格子點巨人", glyph: "#", color: "#d65a5a" } },
        ],
      },
      {
        id: "cpp-6", name: "第 6 章　陣列與搜尋", unit: "Array and Search", login: true,
        levels: [
          { id: "cpp-6-1", name: "陣列的樣子", parts: [{ lines: ["int vote[7] = {0};", "vote[a] = vote[a] + 1;", "int score[7];", "int num[n];", "int ans = -1;"] }], target: 22, boss: { name: "中括號蟹", glyph: "[]", color: "#5aa9e6" } },
          { id: "cpp-6-2", name: "找最大最小", parts: [{ lines: ["for (int i = 0; i <= 6; i = i + 1) {", "int max, min = score[0];", "if (score[i] > max) {", "if (score[i] < min) {", "float average = 0;", "average = (average - max - min)/5.0;"] }], target: 22, boss: { name: "最大值熊", glyph: "max", color: "#e6a35a" } },
          { id: "cpp-6-3", name: "搜尋", parts: [{ lines: ["if (num[i] == x) {", "ans = i + 1;", "if (ans != -1) {", "int ming = 1;", "if (scores[i] > x) {", "if (scores[i] == x) {", "if (found) {"] }], target: 22, boss: { name: "搜尋貓頭鷹", glyph: "==", color: "#7cc576" } },
          { id: "cpp-6-4", name: "骰子點數統計", parts: [{ code: "cpp-dice" }], target: 22, learn: "cpp-dice", boss: { name: "骰子怪", glyph: "1~6", color: "#8f7cd6" } },
          { id: "cpp-6-5", name: "抽獎箱", parts: [{ code: "cpp-lottery" }], target: 22, learn: "cpp-lottery", boss: { name: "抽獎箱怪", glyph: "?", color: "#e6845a" } },
          { id: "cpp-6-6", name: "我是第幾名", parts: [{ code: "cpp-rank" }], target: 22, learn: "cpp-rank", boss: { name: "名次狐狸", glyph: "#1", color: "#9aa0b5" } },
          { id: "cpp-6-7", name: "Boss：公平成績裁判", parts: [{ code: "cpp-fair" }], target: 22, learn: "cpp-fair", big: true, drop: "hat-chef", boss: { name: "公平成績裁判", glyph: "avg", color: "#d65a5a" } },
        ],
      },
      {
        id: "cpp-7", name: "第 7 章　排序", unit: "Sort", login: true,
        levels: [
          { id: "cpp-7-1", name: "二分搜尋的樣子", parts: [{ lines: ["int left = 0, right = n-1;", "while (right - left >= 0) {", "int mid = (left + right) / 2;", "if (nums[mid] == x) {", "else if (nums[mid] < x) {", "if (!found) {"] }], target: 24, boss: { name: "二分刀魚", glyph: "mid", color: "#5aa9e6" } },
          { id: "cpp-7-2", name: "交換", parts: [{ lines: ["for (int i = 0; i <= n-2; i = i + 1) {", "if (nums[i] > nums[i+1]) {", "int wang = nums[i];", "nums[i] = nums[i+1];", "nums[i+1] = wang;", "for (int i = 0; i <= n-1; i = i + 1) {"] }], target: 24, boss: { name: "交換螃蟹", glyph: "⇄", color: "#7cc576" } },
          { id: "cpp-7-3", name: "氣泡排序法", parts: [{ code: "cpp-bubble" }], target: 24, learn: "cpp-bubble", boss: { name: "泡泡怪", glyph: "○", color: "#8f7cd6" } },
          { id: "cpp-7-4", name: "二分搜尋實驗 A", parts: [{ code: "cpp-bsearch" }], target: 24, learn: "cpp-bsearch", boss: { name: "追蹤蝙蝠", glyph: "log", color: "#e6a35a" } },
          { id: "cpp-7-5", name: "Boss：鳳新圖書館長", parts: [{ code: "cpp-library" }], target: 24, learn: "cpp-library", big: true, drop: "face-patch", boss: { name: "圖書館長", glyph: "sort", color: "#d65a5a" } },
        ],
      },
    ],
  },
  {
    id: "py", name: "Python 島", lang: "py", open: true,
    chapters: [
      {
        id: "py-1", name: "第 1 章　輸入與輸出", unit: "Basic Input and Output", login: false,
        levels: [
          { id: "py-1-1", name: "input 與 int", parts: [{ lines: ["r = input()", "r = int(r)", "pi = 3.1415926"] }], target: 15, boss: { name: "括號蝸牛", glyph: "()", color: "#7cc576" } },
          { id: "py-1-2", name: "Hello Kitty", parts: [{ code: "py-hello" }], target: 15, learn: "py-hello", boss: { name: "引號小蛇", glyph: "''", color: "#e6a35a" } },
          { id: "py-1-3", name: "Boss：f 字串蛇", parts: [{ lines: ["print(f'{r*r*pi:.4f}')"] }, { code: "py-circle" }], target: 15, learn: "py-circle", big: true, drop: "hat-beanie", boss: { name: "f 字串蛇", glyph: "f''", color: "#d65a5a" } },
        ],
      },
      {
        id: "py-2", name: "第 2 章　選擇結構", unit: "Selection Structure", login: true,
        levels: [
          { id: "py-2-1", name: "if 和冒號", parts: [{ lines: ["if (bmi < 18):", "if (x % 1 == 0):", "if x % y == 0:", "height, weight = input().split()"] }], target: 18, boss: { name: "冒號甲蟲", glyph: ":", color: "#8f7cd6" } },
          { id: "py-2-2", name: "型別轉換", parts: [{ lines: ["height = float(height) / 100", "bmi = weight / (height ** 2)", "x = float(x)", "x = int(x)", "x, y = input().split(' ')"] }], target: 18, boss: { name: "小數點蟲", glyph: ".0", color: "#5aa9e6" } },
          { id: "py-2-3", name: "倍數判斷", parts: [{ code: "py-multiple" }], target: 18, learn: "py-multiple", boss: { name: "等號雙蛇", glyph: "==", color: "#7cc576" } },
          { id: "py-2-4", name: "文文的求婚：閏年", parts: [{ code: "py-leap" }], target: 18, learn: "py-leap", boss: { name: "閏年兔", glyph: "%4", color: "#e6845a" } },
          { id: "py-2-5", name: "Larger Number", parts: [{ code: "py-larger" }], target: 18, learn: "py-larger", boss: { name: "def 狐狸", glyph: "def", color: "#9aa0b5" } },
          { id: "py-2-6", name: "Boss：BMI 魔人", parts: [{ code: "py-bmi" }], target: 18, learn: "py-bmi", big: true, drop: "neck-snake", boss: { name: "BMI 魔人", glyph: "elif", color: "#d65a5a" } },
        ],
      },
      {
        id: "py-3", name: "第 3 章　條件迴圈", unit: "Conditional Loop", login: true,
        levels: [
          { id: "py-3-1", name: "while 的樣子", parts: [{ lines: ["while hp > 0:", "hp = hp - atk", "while n != 1:", "n = n // 2", "n = 3*n + 1"] }], target: 20, boss: { name: "迴圈陀螺", glyph: "↻", color: "#5aa9e6" } },
          { id: "py-3-2", name: "換瓶子", parts: [{ lines: ["coke = money // 27", "while bottle >= 4:", "ex = bottle // 4", "bottle = bottle % 4", "bottle += ex", "money %= 27"] }], target: 20, boss: { name: "空瓶怪", glyph: "//", color: "#7cc576" } },
          { id: "py-3-3", name: "魔王勇者", parts: [{ code: "py-boss" }], target: 20, learn: "py-boss", boss: { name: "魔王", glyph: "hp", color: "#8f7cd6" } },
          { id: "py-3-4", name: "考拉茲猜想", parts: [{ code: "py-collatz" }], target: 20, learn: "py-collatz", boss: { name: "3n+1 怪", glyph: "3n", color: "#e6a35a" } },
          { id: "py-3-5", name: "五數最大值", parts: [{ code: "py-max5-a" }], target: 20, learn: "py-max5-a", boss: { name: "最大值熊", glyph: ">", color: "#9aa0b5" } },
          { id: "py-3-6", name: "Boss：快樂水魔", parts: [{ code: "py-coke" }], target: 20, learn: "py-coke", big: true, drop: "face-monocle", boss: { name: "快樂水魔", glyph: "while", color: "#d65a5a" } },
        ],
      },
      {
        id: "py-4", name: "第 4 章　計數迴圈", unit: "Counting Loop", login: true,
        levels: [
          { id: "py-4-1", name: "for 和 range", parts: [{ lines: ["nums = map(int, input().split())", "for t in range(4):", "for n in nums:", "for i in range(2, N):", "for i in range(n-1):"] }], target: 20, boss: { name: "range 蜈蚣", glyph: "for", color: "#7cc576" } },
          { id: "py-4-2", name: "迴圈裡的判斷", parts: [{ lines: ["if max_num == '?' or n > max_num:", "isPrime = True", "if N % i == 0:", "if isPrime:", "while t < N:", "t = t + 1"] }], target: 20, boss: { name: "布林貓頭鷹", glyph: "?", color: "#e6a35a" } },
          { id: "py-4-3", name: "字串重複", parts: [{ code: "py-repeat" }], target: 20, learn: "py-repeat", boss: { name: "複製蟲", glyph: "×N", color: "#5aa9e6" } },
          { id: "py-4-4", name: "五數最大值（一行輸入）", parts: [{ code: "py-max5-b" }], target: 20, learn: "py-max5-b", boss: { name: "map 章魚", glyph: "map", color: "#8f7cd6" } },
          { id: "py-4-5", name: "等差數列", parts: [{ code: "py-seq" }], target: 20, learn: "py-seq", boss: { name: "公差蛇", glyph: "+d", color: "#9aa0b5" } },
          { id: "py-4-6", name: "Boss：質數守門員", parts: [{ code: "py-prime" }], target: 20, learn: "py-prime", big: true, drop: "hat-headband", boss: { name: "質數守門員", glyph: "%", color: "#d65a5a" } },
        ],
      },
      {
        id: "py-5", name: "第 5 章　list 與走訪", unit: "List and Iteration", login: true,
        levels: [
          { id: "py-5-1", name: "list 的樣子", parts: [{ lines: ["passed = []", "passed.append(score)", "scores = list(map(int, input().split()))", "for score in scores:", "total = total + score"] }], target: 22, boss: { name: "中括號蟹", glyph: "[]", color: "#5aa9e6" } },
          { id: "py-5-2", name: "切片", parts: [{ lines: ["first = plain[0::2]", "second = plain[1::2]", "cypher = first + second", "print(*passed)", "average = total / n"] }], target: 22, boss: { name: "切片刀魚", glyph: "::", color: "#7cc576" } },
          { id: "py-5-3", name: "柵欄密碼加密", parts: [{ code: "py-rail" }], target: 22, learn: "py-rail", boss: { name: "柵欄怪", glyph: "#", color: "#e6845a" } },
          { id: "py-5-4", name: "及格與不及格", parts: [{ code: "py-pass" }], target: 22, learn: "py-pass", boss: { name: "append 鴨", glyph: ".add", color: "#8f7cd6" } },
          { id: "py-5-5", name: "Boss：成績統計王", parts: [{ code: "py-stats" }], target: 22, learn: "py-stats", big: true, drop: "back-bag", boss: { name: "成績統計王", glyph: "avg", color: "#d65a5a" } },
        ],
      },
    ],
  },
  { id: "en", name: "英文島", lang: "en", open: false, chapters: [] },
  { id: "zh", name: "中文島", lang: "zh", open: false, chapters: [] },
];

/* ---------- 長關卡分段存檔 ---------- */
// 超過 SEG_MAX 個字的關卡切成幾段：每段打完就存起來（伺服器驗算過），下次從下一段接著打；星星用全部段落合起來算。
// 切法：程式照「行」切（每一塊的結尾是換行），盡量讓每段接近 SEG_MAX；短的關卡只有一段，跟以前一樣。
export const SEG_MAX = 400;
export function segmentsOf(texts) {
  const total = texts.reduce((a, t) => a + t.length, 0);
  if (total <= SEG_MAX * 1.2) return [texts.slice()];
  // 段數＝總字數 ÷ SEG_MAX 無條件進位；照行往下放，累積到「平均每段字數」就換下一段（原本分開的段落仍然分開）
  const n = Math.ceil(total / SEG_MAX), goal = total / n, segs = [[]];
  let acc = 0;
  for (const t of texts) {
    const lines = t.split("\n"); let chunk = "";
    lines.forEach((ln, i) => {
      const piece = ln + (i < lines.length - 1 ? "\n" : "");
      if ((chunk || segs[segs.length - 1].length) && segs.length < n && acc + piece.length / 2 > goal * segs.length) {
        if (chunk) segs[segs.length - 1].push(chunk);
        chunk = ""; segs.push([]);
      }
      chunk += piece; acc += piece.length;
    });
    if (chunk) segs[segs.length - 1].push(chunk);
  }
  return segs.filter((sg) => sg.length);
}
/** 幫關卡加上 segs（每段的文字陣列）與 chars（總字數） */
export function withSegs(lv) {
  lv.segs = segmentsOf(lv.texts);
  lv.chars = lv.texts.reduce((a, t) => a + t.length, 0);
  return lv;
}
/** 把幾段的成績合起來（correct、keys、errs、ms 加總後重算速度、正確率） */
export function mergeSums(lang, sums) {
  const t = sums.reduce((a, s) => ({ correct: a.correct + s.correct, keys: a.keys + s.keys, errs: a.errs + s.errs, ms: a.ms + s.ms }), { correct: 0, keys: 0, errs: 0, ms: 0 });
  const m = t.ms / 60000;
  return { ...t, acc: t.keys ? (t.keys - t.errs) / t.keys : 1, speed: m > 0 ? (lang === "zh" ? t.correct / m : t.correct / 5 / m) : 0 };
}
/** 預估要打幾分鐘（wpm：這個人的平均速度） */
export const etaMin = (chars, wpm, lang) => Math.max(1, Math.round(chars / (lang === "zh" ? wpm : wpm * 5)));

export const LEVELS = new Map();
for (const is of ISLANDS) for (const ch of is.chapters) ch.levels.forEach((lv, k) => {
  lv.island = is.id; lv.lang = is.lang; lv.chapter = ch.id; lv.login = ch.login; lv.index = k;
  lv.texts = lv.parts.map((p) => (p.code ? code(is.lang, p.code).t : p.lines.map((t) => line(is.lang, t).t).join("\n")));
  lv.prev = k > 0 ? ch.levels[k - 1].id : null;
  withSegs(lv);
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
