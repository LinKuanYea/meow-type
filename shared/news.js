// 每日新聞任務：每天一篇國際新聞英文短文（高中程度，用自己的話改寫，附單字、理解題、原始報導連結）。
// 原始檔在 content/news/日期.json，scripts/build-text-bank.mjs 檢查後複製到 shared/news/。
// 前端顯示與伺服器驗算共用這裡的關卡設定與小魚乾規則。

export const NEWS_TARGET = 25; // 三星速度（WPM）
export const NEWS_FISH = { today: 10, history: 4, streakMin: 3, streakBonus: 5 };
export const NEWS_ID = /^news-(\d{4}-\d{2}-\d{2})$/;

/** 台灣時間的日期字串（YYYY-MM-DD） */
export function twDate(ms = Date.now()) { return new Date(ms + 8 * 3600000).toISOString().slice(0, 10); }
export function addDays(date, n) { return new Date(Date.parse(date + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10); }

/** 新聞 → 冒險模式的關卡（每一段是一個段落，打完自動接下一段） */
export function newsLevel(n) {
  return {
    id: "news-" + n.date, name: n.title, lang: "en", texts: n.paras, target: NEWS_TARGET, news: n,
    boss: { name: "今日新聞怪", glyph: "N", color: "#5a8fd6" }, big: true, prev: null, login: false, index: 0, chapter: "news", island: "news",
  };
}

/** 小魚乾：當天的新聞每顆新星 10 條、以前的 4 條；當天第一次過關且連續 3 天以上再加 5 條；重打同冒險模式 */
export function newsFishFor(isToday, prevStars, stars, replaysToday, streak, replayFish, replayPerDay) {
  let f = Math.max(0, stars - prevStars) * (isToday ? NEWS_FISH.today : NEWS_FISH.history);
  if (isToday && prevStars === 0 && stars > 0 && streak >= NEWS_FISH.streakMin) f += NEWS_FISH.streakBonus;
  if (stars > 0 && stars <= prevStars && replaysToday < replayPerDay) f += replayFish;
  return f;
}

/** 連續天數：dates＝「在新聞當天就過關」的日期；從今天（今天還沒打就從昨天）往回數 */
export function streakOf(dates, today) {
  const set = new Set(dates);
  let d = set.has(today) ? today : addDays(today, -1), n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
