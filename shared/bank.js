// 題庫
// - C++、Python：林老師在 MeowJudge 的作答（shared/bank-code.js，由 scripts/build-code-bank.py 產生，附說明與預測輸出）
// - 英文、中文：原創文字，附單字、片語、成語說明
// 每一題可以是字串，或是 { t: 文字, …說明 }。
import { CODE, CODE_WORDS, CODE_UNITS } from "./bank-code.js";

// 英文程度：1 = 國中，2 = 高中
const EN_WORDS = [
  ["cat", "n.", "貓", 1], ["keyboard", "n.", "鍵盤", 1], ["screen", "n.", "螢幕", 1], ["window", "n.", "窗戶；視窗", 1],
  ["school", "n.", "學校", 1], ["teacher", "n.", "老師", 1], ["student", "n.", "學生", 1], ["practice", "v./n.", "練習", 1],
  ["program", "n./v.", "程式；寫程式", 2], ["computer", "n.", "電腦", 1], ["because", "conj.", "因為", 1], ["different", "adj.", "不同的", 1],
  ["important", "adj.", "重要的", 1], ["question", "n.", "問題", 1], ["answer", "n./v.", "答案；回答", 1], ["library", "n.", "圖書館", 1],
  ["weather", "n.", "天氣", 1], ["umbrella", "n.", "雨傘", 1], ["breakfast", "n.", "早餐", 1], ["together", "adv.", "一起", 1],
  ["remember", "v.", "記得", 1], ["beautiful", "adj.", "美麗的", 1], ["between", "prep.", "在…之間", 1], ["country", "n.", "國家；鄉下", 1],
  ["minute", "n.", "分鐘", 1], ["problem", "n.", "問題", 1], ["family", "n.", "家人；家庭", 1], ["friend", "n.", "朋友", 1],
  ["music", "n.", "音樂", 1], ["picture", "n.", "圖片；照片", 1], ["island", "n.", "島", 1], ["ocean", "n.", "海洋", 1],
  ["yellow", "adj.", "黃色的", 1], ["orange", "n./adj.", "柳橙；橘色的", 1], ["kitten", "n.", "小貓", 1], ["careful", "adj.", "小心的", 1],
  ["quickly", "adv.", "快速地", 1], ["already", "adv.", "已經", 1], ["believe", "v.", "相信", 1], ["enough", "adj./adv.", "足夠的", 1],
  ["finish", "v.", "完成", 1], ["follow", "v.", "跟隨；遵守", 1], ["language", "n.", "語言", 1], ["morning", "n.", "早上", 1],
  ["number", "n.", "數字；號碼", 1], ["people", "n.", "人們", 1], ["science", "n.", "科學", 1], ["travel", "v./n.", "旅行", 1],
].map(([t, pos, zh, lv]) => ({ t, pos, zh, lv }));

const v = (w, pos, zh, lv = 1, ex) => ({ w, pos, zh, lv, ...(ex ? { ex } : {}) });
const EN_SENT = [
  { t: "The cat jumped onto the desk and knocked my pencil off.", vocab: [v("jump onto", "ph.", "跳上（某處）"), v("knock off", "ph.", "把…撞掉", 2, "The dog knocked the cup off the table."), v("pencil", "n.", "鉛筆")] },
  { t: "Please save your file before you close the window.", vocab: [v("save", "v.", "儲存；拯救"), v("file", "n.", "檔案", 2), v("before", "conj.", "在…之前"), v("close", "v.", "關閉")] },
  { t: "A loop repeats the same steps until a condition is false.", vocab: [v("loop", "n.", "迴圈；圈", 2), v("repeat", "v.", "重複", 2), v("until", "conj.", "直到"), v("condition", "n.", "條件；狀況", 2)] },
  { t: "My little brother wants a kitten for his birthday.", vocab: [v("kitten", "n.", "小貓"), v("birthday", "n.", "生日"), v("want", "v.", "想要")] },
  { t: "Practice a little every day, and your fingers will remember.", vocab: [v("practice", "v.", "練習"), v("a little", "ph.", "一點點", 1, "Add a little sugar."), v("finger", "n.", "手指"), v("remember", "v.", "記得")] },
  { t: "The library opens at eight, but the cafe opens at seven.", vocab: [v("library", "n.", "圖書館"), v("open", "v.", "開門；打開"), v("cafe", "n.", "咖啡廳", 2)] },
  { t: "Every program starts with a small idea and a lot of testing.", vocab: [v("start with", "ph.", "從…開始", 1, "Let's start with an easy question."), v("idea", "n.", "想法"), v("a lot of", "ph.", "很多的"), v("testing", "n.", "測試", 2)] },
  { t: "She forgot her umbrella, so she ran home in the rain.", vocab: [v("forget", "v.", "忘記（過去式 forgot）"), v("umbrella", "n.", "雨傘"), v("in the rain", "ph.", "在雨中", 1, "We played soccer in the rain.")] },
];
const EN_PARA = [
  { t: "Cats spend a large part of the day asleep, but they are not lazy. Their bodies are built for short bursts of speed, so they save energy between hunts. When a cat wakes up, it stretches, cleans its fur, and checks its territory before looking for something to chase.",
    vocab: [v("spend", "v.", "花（時間、金錢）"), v("asleep", "adj.", "睡著的"), v("lazy", "adj.", "懶惰的"), v("burst", "n.", "一陣爆發", 2), v("energy", "n.", "能量；精力", 2),
      v("stretch", "v.", "伸展", 2), v("territory", "n.", "地盤；領域", 2), v("look for", "ph.", "尋找", 1, "I'm looking for my keys."), v("chase", "v.", "追逐", 2)] },
  { t: "Learning to type is like learning to ride a bike. At first you look down at the keys and every word feels slow. After a few weeks, your fingers find the right keys on their own, and you can keep your eyes on the screen. The secret is not speed but steady practice.",
    vocab: [v("be like", "ph.", "像…一樣", 1, "Life is like a box of chocolates."), v("at first", "ph.", "起初"), v("look down at", "ph.", "低頭看", 1, "Don't look down at your phone while walking."),
      v("on their own", "ph.", "靠自己；自動地", 2, "The kids finished the project on their own."), v("keep your eyes on", "ph.", "盯著；一直看著", 2), v("secret", "n.", "祕訣；祕密", 1), v("not A but B", "ph.", "不是 A 而是 B", 2), v("steady", "adj.", "穩定的", 2)] },
  { t: "A computer does exactly what you tell it to do, not what you mean. If you forget a semicolon or put a space in the wrong place, the program may stop working. Good programmers read their code carefully and test small pieces one at a time.",
    vocab: [v("exactly", "adv.", "完全；精確地", 2), v("mean", "v.", "意思是；本意"), v("semicolon", "n.", "分號", 2), v("stop working", "ph.", "停止運作", 1),
      v("carefully", "adv.", "仔細地"), v("piece", "n.", "片；部分"), v("one at a time", "ph.", "一次一個", 2, "Please come in one at a time.")] },
];

const IDIOM = {
  "一石二鳥": "做一件事同時得到兩種好處。", "畫蛇添足": "多做了不必要的事，反而把事情弄糟。", "守株待兔": "不努力，只想靠運氣得到好處。",
  "對牛彈琴": "對不懂的人說道理，白費力氣。", "井底之蛙": "見識很少的人。", "亡羊補牢": "出了問題後趕快補救，還來得及。",
  "熟能生巧": "練習多了，自然就會做得又快又好。", "半途而廢": "事情做到一半就放棄。",
};
const ZH_WORDS = ["貓咪", "鍵盤", "程式", "迴圈", "變數", "陣列", "排序", "螢幕", "滑鼠", "資料", "網路", "演算法", "練習", "速度", "正確", "高雄", "捷運", "夜市",
  "珍珠奶茶", "颱風", "便當", "機車", "圖書館", "操場", "專心", "耐心", ...Object.keys(IDIOM)].map((t) => (IDIOM[t] ? { t, zh: IDIOM[t] } : t));

export const BANK = {
  cpp: { word: CODE_WORDS.cpp, sent: CODE.cpp.filter((x) => x.len === "sent"), para: CODE.cpp.filter((x) => x.len === "para") },
  py: { word: CODE_WORDS.py, sent: CODE.py.filter((x) => x.len === "sent"), para: CODE.py.filter((x) => x.len === "para") },
  en: { word: EN_WORDS, sent: EN_SENT, para: EN_PARA },
  zh: {
    word: ZH_WORDS,
    sent: ["貓咪跳上鍵盤，把我寫好的作業全部刪掉了。", "放學後我們約在捷運站，一起去夜市吃東西。", "颱風來的前一天，大家都在超市搶買泡麵。", "程式不會照你想的做，只會照你寫的做。",
      "每天練習十分鐘，比一次練兩個小時更有用。", "老師說，迴圈就是把同一件事重複做很多次。", "圖書館的冷氣很強，記得帶一件外套。"],
    para: ["家裡的貓每天早上六點準時叫我起床。牠先在床邊喵喵叫，如果我不理牠，就跳到我的肚子上踩來踩去。等我終於爬起來倒飼料，牠吃了兩口就走了，然後回到沙發上繼續睡。我常常懷疑，牠根本不餓，只是不想讓我睡。",
      "打字跟學騎腳踏車很像。剛開始要一直低頭看鍵盤，打一個字都很慢；練了幾個星期以後，手指會自己找到位置，眼睛就能一直看著螢幕。重點不是一開始打得多快，而是每天都練一點，讓手指記住每個鍵的位置。",
      "氣泡排序是最容易理解的排序方法。它從頭到尾比較相鄰的兩個數字，如果前面的比後面大，就把它們交換。每做完一輪，最大的數字就會像氣泡一樣浮到最後面。雖然它不是最快的方法，但很適合用來認識排序的概念。"],
  },
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
  let keys = [...b.keys()];
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
