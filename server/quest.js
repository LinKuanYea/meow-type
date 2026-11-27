// 冒險模式（伺服器）：過關驗算、星星、小魚乾、裝扮。進度只存登入的人；沒登入只回傳這次的星星。
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dbh, getSetting, setSetting } from "./stats.js";
import { NEWS_ID, newsLevel, newsFishFor, streakOf, twDate } from "../shared/news.js";
import { replay } from "../shared/judge.js";
// 打錯時的規則只剩「要倒退修」（林老師 11-27 決定）；judge.js 仍認得三種，給舊資料用
export const RULE = "back";
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
  if (!lv || b.rule !== RULE) return { status: 400, error: "格式不對" };
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

/* ---------- 影片連結：電腦上打完，掃 QR code 在手機上做影片（只存按鍵紀錄和題目，7 天後刪掉） ---------- */
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const VLINK_DAYS = 7;
export function initVlinks() {
  dbh().exec("CREATE TABLE IF NOT EXISTS vlinks (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, user_id INTEGER, payload TEXT NOT NULL)");
}
export function createVlink(user, b, { textOf, CATS, LENS, CAT_NAME, LEN_NAME, unitOf }) {
  if (b.rule !== RULE || !Array.isArray(b.events)) return { status: 400, error: "格式不對" };
  let p;
  if (b.kind === "quest") {
    const lv = levelOf(b.level);
    if (!lv) return { status: 400, error: "找不到這一關" };
    const r = replay({ texts: lv.texts, rule: b.rule, cat: lv.lang, events: b.events, limitMs: null });
    if (!r.ok || r.flags.length) return { status: 400, error: "這一局不能做影片" };
    const title = lv.news ? `📰 ${lv.news.date.slice(5).replace("-", "/")} ${lv.name}` : `${lv.chapter.split("-")[1]}-${lv.index + 1} ${lv.name}`;
    p = { scene: "battle", lang: lv.lang, texts: lv.texts, boss: lv.boss, big: !!lv.big, title, stars: starsOf(lv, r.sum), unit: "WPM" };
  } else if (b.kind === "practice") {
    if (!CATS.includes(b.c) || !LENS.includes(b.l) || !["full", "t60"].includes(b.m)) return { status: 400, error: "格式不對" };
    const specs = Array.isArray(b.specs) ? b.specs.slice(0, 40) : [];
    if (!specs.length || (b.m === "full" && specs.length !== 1) || specs.some((x) => !x || x.c !== b.c || x.l !== b.l)) return { status: 400, error: "題目對不上" };
    const texts = specs.map(textOf);
    if (texts.some((t) => !t)) return { status: 400, error: "題目對不上" };
    const limitMs = b.m === "t60" ? 60000 : null;
    const r = replay({ texts, rule: b.rule, cat: b.c, events: b.events, limitMs });
    if (!r.ok || r.flags.length) return { status: 400, error: "這一局不能做影片" };
    const sub = `${CAT_NAME[b.c]}・${LEN_NAME[b.l]}・${b.m === "t60" ? "1 分鐘" : "打完一題"}`;
    p = { scene: "race", lang: b.c, texts, title: sub, sub, limitMs, unit: unitOf(b.c) };
  } else return { status: 400, error: "格式不對" };
  const st = user ? advState(user) : null;
  const u = user ? dbh().prepare("SELECT nick, banned FROM users WHERE id=?").get(user.id) : null;
  Object.assign(p, { rule: b.rule, events: b.events, nick: u && !u.banned ? u.nick || "" : "", outfit: st?.outfit || null });
  const db = dbh(), now = Date.now();
  db.prepare("DELETE FROM vlinks WHERE ts<?").run(now - VLINK_DAYS * 86400000);
  let id;
  do { id = Array.from(randomBytes(8), (x) => B62[x % 62]).join(""); } while (db.prepare("SELECT 1 FROM vlinks WHERE id=?").get(id));
  db.prepare("INSERT INTO vlinks (id, ts, user_id, payload) VALUES (?,?,?,?)").run(id, now, user?.id ?? null, JSON.stringify(p));
  return { ok: true, id, days: VLINK_DAYS };
}
export function getVlink(id) {
  const r = /^[0-9A-Za-z]{8}$/.test(id || "") && dbh().prepare("SELECT ts, payload FROM vlinks WHERE id=?").get(id);
  if (!r || r.ts < Date.now() - VLINK_DAYS * 86400000) return null;
  return JSON.parse(r.payload);
}
