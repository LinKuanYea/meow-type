// 冒險模式（伺服器）：過關驗算、星星、小魚乾、裝扮。進度只存登入的人；沒登入只回傳這次的星星。
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dbh, getSetting, setSetting } from "./stats.js";
import { NEWS_ID, newsLevel, newsFishFor, streakOf, twDate } from "../shared/news.js";
import { RULES, replay } from "../shared/judge.js";
import { LEVELS, starsOf, fishFor, unlocked, FISH } from "../shared/quest.js";
import { ITEM, ITEMS, SLOTS, cleanOutfit } from "../shared/items.js";

export function initAdventure() {
  dbh().exec(`
    CREATE TABLE IF NOT EXISTS adv (user_id INTEGER NOT NULL, level TEXT NOT NULL, stars INTEGER NOT NULL, speed REAL, acc REAL, clears INTEGER NOT NULL DEFAULT 0,
      first_ts INTEGER NOT NULL, last_ts INTEGER NOT NULL, PRIMARY KEY (user_id, level));
    CREATE TABLE IF NOT EXISTS adv_runs (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, user_id INTEGER, level TEXT, stars INTEGER, speed REAL, acc REAL, ms INTEGER, fish INTEGER, flag TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS items (user_id INTEGER NOT NULL, item TEXT NOT NULL, ts INTEGER NOT NULL, how TEXT, PRIMARY KEY (user_id, item));
    CREATE INDEX IF NOT EXISTS adv_runs_user ON adv_runs(user_id, ts);
  `);
  const has = (c) => dbh().prepare("PRAGMA table_info(users)").all().some((x) => x.name === c);
  if (!has("fish")) dbh().exec("ALTER TABLE users ADD COLUMN fish INTEGER NOT NULL DEFAULT 0");
  if (!has("outfit")) dbh().exec("ALTER TABLE users ADD COLUMN outfit TEXT");
}

/* ---------- 每日新聞 ---------- */
const NEWS_DIR = fileURLToPath(new URL("../shared/news/", import.meta.url));
const newsCache = new Map();
export const newsHidden = () => new Set(String(getSetting("news_hidden") || "").split(",").filter(Boolean));
export function setNewsHidden(date, hide) {
  const h = newsHidden(); if (hide) h.add(date); else h.delete(date);
  setSetting("news_hidden", [...h].sort().join(","));
}
/** 讀一天的新聞；未來的日期、被管理員下架的、不存在的都回傳 null（admin＝管理頁要看全部） */
export function getNews(date, admin = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  if (!admin && (date > twDate() || newsHidden().has(date))) return null;
  if (!newsCache.has(date)) {
    const f = NEWS_DIR + date + ".json";
    newsCache.set(date, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
  }
  return newsCache.get(date);
}
export function newsIndex(admin = false) {
  let all = [];
  try { all = JSON.parse(readFileSync(NEWS_DIR + "index.json", "utf8")); } catch {}
  const today = twDate(), hid = newsHidden();
  return admin ? all.map((n) => ({ ...n, hidden: hid.has(n.date) })) : all.filter((n) => n.date <= today && !hid.has(n.date));
}
/** 在新聞當天就過關的日期（算連續天數用） */
function onTimeDates(uid) {
  return dbh().prepare("SELECT level, first_ts FROM adv WHERE user_id=? AND level LIKE 'news-%'").all(uid)
    .map((r) => [r.level.slice(5), twDate(r.first_ts)]).filter(([d, t]) => d === t).map(([d]) => d);
}
export function newsOverview(user) {
  const today = twDate(), list = newsIndex().slice(0, 60);
  const stars = user ? starMap(user.id) : {};
  return { today, streak: user ? streakOf(onTimeDates(user.id), today) : 0, list: list.map((n) => ({ ...n, stars: stars["news-" + n.date] || 0 })) };
}
/** 某一天新聞的排行榜（登入的人，每人最好的一次） */
export function newsBoard(date, user) {
  if (!getNews(date)) return null;
  return dbh().prepare(`SELECT u.id, COALESCE(u.nick, '（還沒取暱稱）') name, a.speed, a.acc, a.stars FROM adv a JOIN users u ON u.id = a.user_id
    WHERE a.level=? AND a.stars>0 AND u.banned=0 ORDER BY a.speed DESC LIMIT 20`).all("news-" + date)
    .map((r) => ({ name: r.name, speed: r.speed, acc: r.acc, stars: r.stars, me: user?.id === r.id }));
}
const levelOf = (id) => { const m = NEWS_ID.exec(id || ""); if (!m) return LEVELS.get(id); const n = getNews(m[1]); return n ? newsLevel(n) : null; };

const owned = (uid) => new Set(dbh().prepare("SELECT item FROM items WHERE user_id=?").all(uid).map((r) => r.item));
const starMap = (uid) => Object.fromEntries(dbh().prepare("SELECT level, stars FROM adv WHERE user_id=?").all(uid).map((r) => [r.level, r.stars]));
/** 台灣時間今天 0 點 */
const todayStart = () => { const n = Date.now() + 8 * 3600000; return n - (n % 86400000) - 8 * 3600000; };

/** 這個人的冒險進度 */
export function advState(user) {
  if (!user) return { login: false };
  const db = dbh();
  const rows = db.prepare("SELECT level, stars, speed, acc FROM adv WHERE user_id=?").all(user.id);
  const u = db.prepare("SELECT fish, outfit FROM users WHERE id=?").get(user.id);
  const own = owned(user.id);
  let outfit = {}; try { outfit = JSON.parse(u.outfit || "{}"); } catch {}
  return {
    login: true, fish: u.fish,
    stars: Object.fromEntries(rows.map((r) => [r.level, r.stars])),
    best: Object.fromEntries(rows.map((r) => [r.level, { speed: r.speed, acc: r.acc }])),
    owned: [...own], outfit: cleanOutfit(outfit, own),
  };
}

/** 過關：重播按鍵紀錄算出星星；登入的人記進度、發小魚乾和掉落的裝扮 */
export function advClear(user, b) {
  const lv = levelOf(b.level);
  if (!lv || !RULES.includes(b.rule)) return { status: 400, error: "格式不對" };
  if (lv.login && !user) return { status: 401, error: "這一章要登入才能玩" };
  const db = dbh();
  const stars0 = user ? starMap(user.id) : {};
  if (user && !unlocked(lv, stars0)) return { status: 400, error: "還沒解鎖這一關" };
  const r = replay({ texts: lv.texts, rule: b.rule, cat: lv.lang, events: b.events, limitMs: null });
  if (!r.ok) return { status: 400, error: "成績驗算沒過：" + r.reason };
  const sum = r.sum, flag = r.flags.join(",");
  const stars = flag ? 0 : starsOf(lv, sum);
  const out = { ok: true, level: lv.id, stars, speed: sum.speed, acc: sum.acc, ms: Math.round(sum.ms), flagged: !!flag, fish: 0, drops: [] };
  if (!user) return out;
  const now = Date.now(), prev = stars0[lv.id] || 0;
  if (!flag) {
    // 今天已經拿過幾次「重打」的小魚乾（重打的獎勵固定是 FISH.replay 條，跟星星的 10 的倍數分得開）
    const repToday = db.prepare("SELECT COUNT(*) n FROM adv_runs WHERE user_id=? AND ts>=? AND flag='' AND fish=?").get(user.id, todayStart(), FISH.replay).n;
    if (lv.news) {
      const today = twDate(now), isToday = lv.news.date === today;
      const streak = streakOf([...onTimeDates(user.id), ...(isToday && stars > 0 ? [today] : [])], today);
      out.fish = newsFishFor(isToday, prev, stars, repToday, streak, FISH.replay, FISH.replayPerDay);
      out.streak = streak;
    } else out.fish = fishFor(lv, prev, stars, repToday);
    if (stars > 0) {
      db.prepare(`INSERT INTO adv (user_id, level, stars, speed, acc, clears, first_ts, last_ts) VALUES (?,?,?,?,?,1,?,?)
        ON CONFLICT(user_id, level) DO UPDATE SET stars=MAX(stars, excluded.stars), speed=MAX(COALESCE(speed,0), excluded.speed), acc=MAX(COALESCE(acc,0), excluded.acc), clears=clears+1, last_ts=excluded.last_ts`)
        .run(user.id, lv.id, stars, sum.speed, sum.acc, now, now);
      if (lv.drop && prev === 0) {
        const it = ITEM.get(lv.drop);
        if (it && db.prepare("INSERT OR IGNORE INTO items (user_id, item, ts, how) VALUES (?,?,?,?)").run(user.id, it.id, now, "drop:" + lv.id).changes) out.drops.push(it.id);
      }
    }
    if (out.fish) db.prepare("UPDATE users SET fish=fish+? WHERE id=?").run(out.fish, user.id);
  }
  db.prepare("INSERT INTO adv_runs (ts, user_id, level, stars, speed, acc, ms, fish, flag) VALUES (?,?,?,?,?,?,?,?,?)").run(now, user.id, lv.id, stars, sum.speed, sum.acc, out.ms, out.fish, flag);
  if (flag) console.warn(`[冒險] 可疑（${flag}）：${lv.id} ${sum.speed.toFixed(1)}`);
  out.prevStars = prev;
  out.total = db.prepare("SELECT fish FROM users WHERE id=?").get(user.id).fish;
  return out;
}

/** 用小魚乾買裝扮 */
export function advBuy(user, b) {
  if (!user) return { status: 401, error: "要先登入" };
  const it = ITEM.get(b.item);
  if (!it || !(it.price > 0)) return { status: 400, error: "這個不能買" };
  const db = dbh();
  if (owned(user.id).has(it.id)) return { status: 400, error: "已經有了" };
  const r = db.prepare("UPDATE users SET fish=fish-? WHERE id=? AND fish>=?").run(it.price, user.id, it.price);
  if (!r.changes) return { status: 400, error: "小魚乾不夠" };
  db.prepare("INSERT INTO items (user_id, item, ts, how) VALUES (?,?,?,?)").run(user.id, it.id, Date.now(), "buy");
  return { ok: true, ...advState(user) };
}

/** 換裝 */
export function advWear(user, b) {
  if (!user) return { status: 401, error: "要先登入" };
  const own = owned(user.id), want = {};
  for (const [slot] of SLOTS) {
    const id = b.outfit?.[slot];
    if (id == null || id === "") continue;
    if (ITEM.get(id)?.slot !== slot) return { status: 400, error: "格式不對" };
    if (!own.has(id) && ITEM.get(id).price !== 0) return { status: 400, error: "還沒有這件" };
    want[slot] = id;
  }
  const outfit = cleanOutfit(want, own);
  dbh().prepare("UPDATE users SET outfit=? WHERE id=?").run(JSON.stringify(outfit), user.id);
  return { ok: true, outfit };
}

export const ITEM_COUNT = ITEMS.length;
