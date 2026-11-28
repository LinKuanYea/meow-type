// 冒險模式（伺服器）：過關驗算、星星、小魚乾、裝扮。進度只存登入的人；沒登入只回傳這次的星星。
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dbh, getSetting, setSetting } from "./stats.js";
import { getSet } from "./custom.js";
import { CUSTOM_ID, customLevel } from "../shared/custom.js";
import { NEWS_ID, NEWS_KEY, keyDate, newsLevel, newsFishFor, streakOf, twDate } from "../shared/news.js";
import { replay } from "../shared/judge.js";
// 打錯時的規則只剩「要倒退修」（林老師 11-27 決定）；judge.js 仍認得三種，給舊資料用
export const RULE = "back";
import { LEVELS, starsOf, fishFor, unlocked, FISH, withSegs, mergeSums } from "../shared/quest.js";
import { ITEM, ITEMS, SLOTS, cleanOutfit } from "../shared/items.js";

export function initAdventure() {
  dbh().exec(`
    CREATE TABLE IF NOT EXISTS adv (user_id INTEGER NOT NULL, level TEXT NOT NULL, stars INTEGER NOT NULL, speed REAL, acc REAL, clears INTEGER NOT NULL DEFAULT 0,
      first_ts INTEGER NOT NULL, last_ts INTEGER NOT NULL, PRIMARY KEY (user_id, level));
    CREATE TABLE IF NOT EXISTS adv_runs (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, user_id INTEGER, level TEXT, stars INTEGER, speed REAL, acc REAL, ms INTEGER, fish INTEGER, flag TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS items (user_id INTEGER NOT NULL, item TEXT NOT NULL, ts INTEGER NOT NULL, how TEXT, PRIMARY KEY (user_id, item));
    CREATE INDEX IF NOT EXISTS adv_runs_user ON adv_runs(user_id, ts);
    CREATE TABLE IF NOT EXISTS adv_seg (user_id INTEGER NOT NULL, level TEXT NOT NULL, seg INTEGER NOT NULL, correct INTEGER, keys INTEGER, errs INTEGER, ms INTEGER, ts INTEGER NOT NULL,
      PRIMARY KEY (user_id, level, seg));
  `);
  const has = (c) => dbh().prepare("PRAGMA table_info(users)").all().some((x) => x.name === c);
  if (!has("fish")) dbh().exec("ALTER TABLE users ADD COLUMN fish INTEGER NOT NULL DEFAULT 0");
  if (!has("outfit")) dbh().exec("ALTER TABLE users ADD COLUMN outfit TEXT");
}

/* ---------- 每日新聞 ---------- */
// NEWS_DIR 環境變數只給測試用（放測試用的新聞）
const NEWS_DIR = process.env.NEWS_DIR ? process.env.NEWS_DIR.replace(/\/?$/, "/") : fileURLToPath(new URL("../shared/news/", import.meta.url));
const newsCache = new Map();
export const newsHidden = () => new Set(String(getSetting("news_hidden") || "").split(",").filter(Boolean));
export function setNewsHidden(date, hide) {
  const h = newsHidden(); if (hide) h.add(date); else h.delete(date); // date：新聞的 key（日期或日期-編號）
  setSetting("news_hidden", [...h].sort().join(","));
}
/** 讀一篇新聞（key＝日期或日期-編號）；未來的日期、被管理員下架的、不存在的都回傳 null（admin＝管理頁要看全部） */
export function getNews(key, admin = false) {
  if (!NEWS_KEY.test(key || "")) return null;
  if (!admin && (keyDate(key) > twDate() || newsHidden().has(key))) return null;
  if (!newsCache.has(key)) {
    const f = NEWS_DIR + key + ".json";
    newsCache.set(key, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
  }
  return newsCache.get(key);
}
export function newsIndex(admin = false) {
  let all = [];
  try { all = JSON.parse(readFileSync(NEWS_DIR + "index.json", "utf8")); } catch {}
  const today = twDate(), hid = newsHidden();
  all = all.map((n) => ({ ...n, key: n.key || n.date }));
  all.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.key < b.key ? -1 : 1)); // 新的日期在前；同一天照編號
  return admin ? all.map((n) => ({ ...n, hidden: hid.has(n.key) })) : all.filter((n) => n.date <= today && !hid.has(n.key));
}
/** 在新聞當天就過關的日期（算連續天數用） */
function onTimeDates(uid) {
  return dbh().prepare("SELECT level, first_ts FROM adv WHERE user_id=? AND level LIKE 'news-%'").all(uid)
    .map((r) => [keyDate(r.level.slice(5)), twDate(r.first_ts)]).filter(([d, t]) => d === t).map(([d]) => d);
}
export function newsOverview(user) {
  const today = twDate(), list = newsIndex().slice(0, 60);
  const stars = user ? starMap(user.id) : {};
  return { today, streak: user ? streakOf(onTimeDates(user.id), today) : 0, list: list.map((n) => ({ ...n, stars: stars["news-" + n.key] || 0 })) };
}
/** 某一天新聞的排行榜（登入的人，每人最好的一次） */
export function newsBoard(key, user) {
  if (!getNews(key)) return null;
  return dbh().prepare(`SELECT u.id, COALESCE(u.nick, '（還沒取暱稱）') name, a.speed, a.acc, a.stars FROM adv a JOIN users u ON u.id = a.user_id
    WHERE a.level=? AND a.stars>0 AND u.banned=0 ORDER BY a.speed DESC LIMIT 20`).all("news-" + key)
    .map((r) => ({ name: r.name, speed: r.speed, acc: r.acc, stars: r.stars, me: user?.id === r.id }));
}
const levelOf = (id) => {
  const c = CUSTOM_ID.exec(id || "");
  if (c) { const s = getSet(c[1]); return s ? withSegs(customLevel(s)) : null; }
  const m = NEWS_ID.exec(id || ""); if (!m) return LEVELS.get(id); const n = getNews(m[1]); return n ? withSegs(newsLevel(n)) : null;
};

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
    segs: segProgress(user.id), avg: avgSpeed(user.id),
  };
}
/* ---------- 長關卡分段存檔 ---------- */
const SEG_DAYS = 14; // 存了幾天沒接著打就作廢
/** 每一關已經存了幾段（從第 0 段連續算） */
function segProgress(uid) {
  const rows = dbh().prepare("SELECT level, seg FROM adv_seg WHERE user_id=? AND ts>=? ORDER BY level, seg").all(uid, Date.now() - SEG_DAYS * 86400000);
  const out = {};
  for (const r of rows) if ((out[r.level] || 0) === r.seg) out[r.level] = r.seg + 1;
  return out;
}
/** 這個人最近 20 次過關的平均速度（依語言），用來估計每一關要打多久 */
function avgSpeed(uid) {
  const rows = dbh().prepare("SELECT level, speed FROM adv_runs WHERE user_id=? AND flag='' AND stars>0 ORDER BY ts DESC LIMIT 60").all(uid);
  const by = {};
  for (const r of rows) {
    const lang = r.level.startsWith("news-") ? "en" : r.level.split("-")[0];
    (by[lang] ||= []).length < 20 && by[lang].push(r.speed);
  }
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10]));
}

/** 過關：重播按鍵紀錄算出星星；登入的人記進度、發小魚乾和掉落的裝扮 */
export function advClear(user, b) {
  const lv = levelOf(b.level);
  if (!lv || b.rule !== RULE) return { status: 400, error: "格式不對" };
  if (lv.login && !user) return { status: 401, error: "這一章要登入才能玩" };
  const db = dbh();
  const stars0 = user ? starMap(user.id) : {};
  if (user && !unlocked(lv, stars0)) return { status: 400, error: "還沒解鎖這一關" };
  // 分段：這次打的是第幾段（短的關卡只有第 0 段）
  const nSeg = lv.segs.length, seg = b.seg == null ? 0 : b.seg;
  if (!Number.isInteger(seg) || seg < 0 || seg >= nSeg) return { status: 400, error: "格式不對" };
  const r = replay({ texts: lv.segs[seg], rule: b.rule, cat: lv.lang, events: b.events, limitMs: null });
  if (!r.ok) return { status: 400, error: "成績驗算沒過：" + r.reason };
  let sum = r.sum, flag = r.flags.join(",");
  if (nSeg > 1) {
    if (flag) { console.warn(`[冒險] 可疑（${flag}）：${lv.id} 第 ${seg + 1} 段`); return { ok: true, level: lv.id, seg, segs: nSeg, flagged: true, stars: 0, fish: 0, drops: [] }; }
    const part = { correct: sum.correct, keys: sum.keys, errs: sum.errs, ms: Math.round(sum.ms) };
    let parts;
    if (user) {
      db.prepare(`INSERT INTO adv_seg (user_id, level, seg, correct, keys, errs, ms, ts) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(user_id, level, seg) DO UPDATE SET correct=excluded.correct, keys=excluded.keys, errs=excluded.errs, ms=excluded.ms, ts=excluded.ts`)
        .run(user.id, lv.id, seg, part.correct, part.keys, part.errs, part.ms, Date.now());
      parts = db.prepare("SELECT seg, correct, keys, errs, ms FROM adv_seg WHERE user_id=? AND level=? AND ts>=? ORDER BY seg").all(user.id, lv.id, Date.now() - SEG_DAYS * 86400000);
    } else {
      // 沒登入：前面幾段的成績由瀏覽器帶來（沒有獎勵，只算星星給自己看）
      const prior = Array.isArray(b.prior) ? b.prior.slice(0, nSeg - 1) : [];
      parts = [...prior.map((p, i) => ({ seg: i, correct: +p.correct || 0, keys: +p.keys || 0, errs: +p.errs || 0, ms: +p.ms || 0 })), { seg, ...part }];
    }
    if (seg < nSeg - 1) return { ok: true, level: lv.id, seg, segs: nSeg, saved: !!user, part: { ...part, speed: sum.speed, acc: sum.acc } };
    const have = new Set(parts.map((p) => p.seg));
    if (![...Array(nSeg).keys()].every((i) => have.has(i))) return { status: 400, error: "前面的段落還沒打完（或已經超過 " + SEG_DAYS + " 天），請從第 1 段開始" };
    sum = mergeSums(lv.lang, parts);
    if (user) db.prepare("DELETE FROM adv_seg WHERE user_id=? AND level=?").run(user.id, lv.id);
  }
  const stars = flag ? 0 : starsOf(lv, sum);
  const out = { ok: true, level: lv.id, seg, segs: nSeg, stars, speed: sum.speed, acc: sum.acc, ms: Math.round(sum.ms), flagged: !!flag, fish: 0, drops: [] };
  if (!user) return out;
  const now = Date.now(), prev = stars0[lv.id] || 0;
  if (!flag) {
    // 今天已經拿過幾次「重打」的小魚乾（重打的獎勵固定是 FISH.replay 條，跟星星的 10 的倍數分得開）
    const repToday = db.prepare("SELECT COUNT(*) n FROM adv_runs WHERE user_id=? AND ts>=? AND flag='' AND fish=?").get(user.id, todayStart(), FISH.replay).n;
    if (lv.news) {
      const today = twDate(now), isToday = lv.news.date === today;
      const before = onTimeDates(user.id), hadToday = before.includes(today); // 今天已經有一篇過關了：連續天數的加碼只給一次
      const streak = streakOf([...before, ...(isToday && stars > 0 ? [today] : [])], today);
      out.fish = newsFishFor(isToday, prev, stars, repToday, hadToday ? 0 : streak, FISH.replay, FISH.replayPerDay);
      out.streak = streak;
    } else if (lv.custom) out.fish = 0; // 老師自訂題組不給小魚乾（題目誰都能出，避免刷）
    else out.fish = fishFor(lv, prev, stars, repToday);
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
export function createVlink(user, b, { textOf, CATS, LENS, CAT_NAME, LEN_NAME, unitOf, bossPiece }) {
  if (b.rule !== RULE || !Array.isArray(b.events)) return { status: 400, error: "格式不對" };
  let p;
  if (b.kind === "quest") {
    const lv = levelOf(b.level);
    if (!lv) return { status: 400, error: "找不到這一關" };
    const seg = b.seg == null ? 0 : b.seg;
    if (!Number.isInteger(seg) || seg < 0 || seg >= lv.segs.length) return { status: 400, error: "格式不對" };
    const r = replay({ texts: lv.segs[seg], rule: b.rule, cat: lv.lang, events: b.events, limitMs: null });
    if (!r.ok || r.flags.length) return { status: 400, error: "這一局不能做影片" };
    const title = lv.news ? `📰 ${lv.news.date.slice(5).replace("-", "/")} ${lv.name}` : lv.custom ? `✎ ${lv.name}` : `${lv.chapter.split("-")[1]}-${lv.index + 1} ${lv.name}`;
    p = { scene: "battle", lang: lv.lang, texts: lv.segs[seg], boss: lv.boss, big: !!lv.big, title: title + (lv.segs.length > 1 ? `（第 ${seg + 1}/${lv.segs.length} 段）` : ""), stars: lv.segs.length > 1 ? (user ? starMap(user.id)[lv.id] || 0 : 0) : starsOf(lv, r.sum), unit: unitOf(lv.lang),
      level: lv.id, speed: Math.round(r.sum.speed * 10) / 10, acc: r.sum.acc, levelName: lv.name };
  } else if (b.kind === "boss") {
    // 世界 Boss 的一次出擊：這週的那一段文字（bossPiece 由 server/boss.js 傳進來）
    const x = typeof b.piece === "string" && bossPiece?.(b.piece);
    if (!x) return { status: 400, error: "這週換了新的 Boss（或題目對不上）" };
    const r = replay({ texts: x.piece.texts, rule: b.rule, cat: x.piece.lang, events: b.events, limitMs: null });
    if (!r.ok || r.flags.length) return { status: 400, error: "這一局不能做影片" };
    p = { scene: "battle", lang: x.piece.lang, texts: x.piece.texts, boss: x.boss, big: true, title: `🌍 世界 Boss ${x.boss.name}`, stars: 0, unit: "WPM", level: "boss", speed: Math.round(r.sum.speed * 10) / 10, acc: r.sum.acc };
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
