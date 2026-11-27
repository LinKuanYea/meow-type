// 世界 Boss（伺服器）：每週一隻、全部登入的人共用血條。出擊用 judge 重播按鍵紀錄驗算，可疑的不算；打倒時一次發完獎勵（不會重複發）。
// 資料表：
//   boss_weeks：每週一筆（第一次有人打開時建立）：Boss、建立時算好的基本血量（依上週有打字的登入人數）、打倒的時間
//   boss_hits：每次出擊（counted＝有沒有算進每天的次數、dmg＝真的扣掉的血、raw＝本來的傷害、flag＝可疑原因）
//   boss_rewards：打倒後每個有造成傷害的人一筆（PRIMARY KEY 擋重複發）；seen＝學生看過獎勵通知了沒
// 設定（settings 表，管理頁改了馬上生效）：boss_hp_mult＝血量倍率；boss_hp:<週一日期>＝手動設定那一週的血量
import { dbh, getSetting, setSetting, HIDDEN_NAME } from "./stats.js";
import { replay } from "../shared/judge.js";
import { RULE } from "./quest.js";
import { BOSS, THEMES, weekOf, bossOfIndex, prevWeekKey, pieceOf, damageOf, accBonus, DAILY_CAP, baseHp, hpWith, BOSS_FISH, BOSS_ART } from "../shared/boss.js";
import { ITEM } from "../shared/items.js";
import { DEN_ITEM } from "../shared/den.js";

const DAY = 86400000, TZ = 8 * 3600000;
const todayStart = (now) => { const n = now + TZ; return n - (n % DAY) - TZ; };

export function initBoss() {
  dbh().exec(`
    CREATE TABLE IF NOT EXISTS boss_weeks (week TEXT PRIMARY KEY, boss TEXT NOT NULL, players INTEGER NOT NULL, base_hp INTEGER NOT NULL, created INTEGER NOT NULL, defeated_ts INTEGER);
    CREATE TABLE IF NOT EXISTS boss_hits (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, week TEXT NOT NULL, user_id INTEGER NOT NULL, piece TEXT, correct INTEGER, acc REAL, speed REAL, ms INTEGER,
      raw INTEGER NOT NULL DEFAULT 0, dmg INTEGER NOT NULL DEFAULT 0, counted INTEGER NOT NULL DEFAULT 0, fish INTEGER NOT NULL DEFAULT 0, flag TEXT NOT NULL DEFAULT '');
    CREATE INDEX IF NOT EXISTS boss_hits_week ON boss_hits(week, user_id);
    CREATE INDEX IF NOT EXISTS boss_hits_user ON boss_hits(user_id, ts);
    CREATE TABLE IF NOT EXISTS boss_rewards (week TEXT NOT NULL, user_id INTEGER NOT NULL, rank INTEGER, dmg INTEGER NOT NULL, fish INTEGER NOT NULL, item TEXT, ts INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (week, user_id));
  `);
}

/** 管理頁的血量倍率（0.1～10，沒設定＝1） */
export const hpMult = () => { const v = Number(getSetting("boss_hp_mult")); return v > 0 ? v : 1; };
export const manualHp = (week) => { const v = Number.parseInt(getSetting("boss_hp:" + week), 10); return v > 0 ? v : 0; };
export function setHpMult(v) { setSetting("boss_hp_mult", v === 1 ? "" : String(v)); }
export function setManualHp(week, v) { setSetting("boss_hp:" + week, v > 0 ? String(v) : ""); }

/** 某一週有打字的登入人數（一般練習、冒險模式、世界 Boss 都算） */
function playersIn(start, end) {
  return dbh().prepare(`SELECT COUNT(*) n FROM (
    SELECT user_id FROM runs WHERE user_id IS NOT NULL AND ts>=? AND ts<?
    UNION SELECT user_id FROM adv_runs WHERE user_id IS NOT NULL AND ts>=? AND ts<?
    UNION SELECT user_id FROM boss_hits WHERE ts>=? AND ts<?)`).get(start, end, start, end, start, end).n;
}
/** 這一週的紀錄（第一次用到時建立，血量依上週的人數算好存起來） */
export function weekRow(now = Date.now()) {
  const w = weekOf(now), db = dbh();
  let r = db.prepare("SELECT * FROM boss_weeks WHERE week=?").get(w.key);
  if (!r) {
    const b = bossOfIndex(w.index), players = playersIn(w.start - 7 * DAY, w.start);
    db.prepare("INSERT OR IGNORE INTO boss_weeks (week, boss, players, base_hp, created) VALUES (?,?,?,?,?)").run(w.key, b.id, players, baseHp(players, b.theme), now);
    r = db.prepare("SELECT * FROM boss_weeks WHERE week=?").get(w.key);
  }
  return { ...r, w, info: BOSS.get(r.boss) || bossOfIndex(w.index), hp: manualHp(r.week) || hpWith(r.base_hp, hpMult()) };
}
const dealt = (week) => dbh().prepare("SELECT COALESCE(SUM(dmg),0) d FROM boss_hits WHERE week=?").get(week).d;

/**
 * 傷害排行（每人加總）。暱稱照排行榜的規則：停權的不列出；暱稱被標記不雅的顯示「已隱藏」；沒取暱稱的顯示（還沒取暱稱）
 * all＝管理頁要看全部（含停權、原本的暱稱）
 */
const NAME = `CASE WHEN EXISTS (SELECT 1 FROM scores s WHERE s.user_id=u.id AND s.name_hidden=1) OR EXISTS (SELECT 1 FROM shares h WHERE h.user_id=u.id AND h.name_hidden=1)
  THEN '${HIDDEN_NAME}' ELSE COALESCE(u.nick, '（還沒取暱稱）') END`;
export function ranking(week, limit = 10, all = false) {
  return dbh().prepare(`SELECT u.id, ${all ? "COALESCE(u.nick, '（還沒取暱稱）')" : NAME} name, u.banned, SUM(b.dmg) dmg, COUNT(*) n FROM boss_hits b JOIN users u ON u.id=b.user_id
    WHERE b.week=? AND b.dmg>0 ${all ? "" : "AND u.banned=0"} GROUP BY u.id ORDER BY dmg DESC, MIN(b.ts) ASC LIMIT ?`).all(week, limit);
}
function recent(week, limit = 8) {
  return dbh().prepare(`SELECT ${NAME} name, b.dmg, b.ts, b.acc FROM boss_hits b JOIN users u ON u.id=b.user_id WHERE b.week=? AND b.dmg>0 AND u.banned=0 ORDER BY b.id DESC LIMIT ?`).all(week, limit);
}

/** 血扣完了：記下打倒的時間，發獎勵給每個有造成傷害的人（只會發一次） */
function settle(row, now) {
  const db = dbh();
  if (row.defeated_ts || dealt(row.week) < row.hp) return false;
  db.exec("BEGIN");
  try {
    if (!db.prepare("UPDATE boss_weeks SET defeated_ts=? WHERE week=? AND defeated_ts IS NULL").run(now, row.week).changes) { db.exec("ROLLBACK"); return false; }
    const top = ranking(row.week, BOSS_FISH.top.length).map((r) => r.id);
    const people = db.prepare("SELECT user_id, SUM(dmg) dmg FROM boss_hits WHERE week=? AND dmg>0 GROUP BY user_id").all(row.week);
    const item = row.info.item;
    for (const p of people) {
      const k = top.indexOf(p.user_id), fish = BOSS_FISH.clear + (k >= 0 ? BOSS_FISH.top[k] : 0);
      if (!db.prepare("INSERT OR IGNORE INTO boss_rewards (week, user_id, rank, dmg, fish, item, ts) VALUES (?,?,?,?,?,?,?)").run(row.week, p.user_id, k >= 0 ? k + 1 : null, p.dmg, fish, item, now).changes) continue;
      db.prepare("UPDATE users SET fish=fish+? WHERE id=?").run(fish, p.user_id);
      db.prepare("INSERT OR IGNORE INTO items (user_id, item, ts, how) VALUES (?,?,?,?)").run(p.user_id, item, now, "boss:" + row.week);
    }
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  console.warn(`[世界 Boss] ${row.week} ${row.info.name} 被打倒了`);
  row.defeated_ts = now;
  return true;
}

const itemInfo = (id) => { const it = ITEM.get(id) || DEN_ITEM.get(id); return it ? { id, name: it.name, kind: ITEM.has(id) ? "outfit" : "den" } : null; };
const bossInfo = (b) => ({ id: b.id, name: b.name, theme: b.theme, themeName: THEMES[b.theme], glyph: b.glyph, color: b.color, art: BOSS_ART, intro: b.intro, item: itemInfo(b.item) });

/** 世界 Boss 的狀態（沒登入也看得到血條和排行；登入的人多了自己的傷害、今天的次數、還沒看過的獎勵） */
export function bossState(user, now = Date.now()) {
  const row = weekRow(now);
  settle(row, now); // 管理員把血量調低到已經打掉的量以下：下一次有人打開就算打倒
  const done = dealt(row.week), db = dbh();
  const players = db.prepare("SELECT COUNT(DISTINCT user_id) n FROM boss_hits WHERE week=? AND dmg>0").get(row.week).n;
  const out = {
    week: row.week, start: row.w.start, end: row.w.end, now, boss: bossInfo(row.info), hp: row.hp, left: Math.max(0, row.hp - done),
    defeated: !!row.defeated_ts, defeatedTs: row.defeated_ts || null, players, cap: DAILY_CAP, login: !!user,
    top: ranking(row.week, 10).map((r) => ({ name: r.name, dmg: r.dmg, n: r.n, me: user?.id === r.id })),
    recent: recent(row.week).map((r) => ({ name: r.name, dmg: r.dmg, ts: r.ts })),
  };
  if (user) {
    const m = db.prepare("SELECT COALESCE(SUM(dmg),0) dmg, COUNT(*) n FROM boss_hits WHERE week=? AND user_id=? AND counted=1").get(row.week, user.id);
    const today = db.prepare("SELECT COUNT(*) n FROM boss_hits WHERE user_id=? AND ts>=? AND counted=1").get(user.id, todayStart(now)).n;
    const rank = m.dmg > 0 ? db.prepare("SELECT COUNT(*) + 1 r FROM (SELECT SUM(dmg) d FROM boss_hits WHERE week=? AND dmg>0 GROUP BY user_id) WHERE d>?").get(row.week, m.dmg).r : null;
    out.me = { dmg: m.dmg, sorties: m.n, today, rank };
    out.rewards = db.prepare("SELECT week, rank, dmg, fish, item FROM boss_rewards WHERE user_id=? AND seen=0 ORDER BY week").all(user.id).map((r) => {
      const wb = db.prepare("SELECT boss FROM boss_weeks WHERE week=?").get(r.week);
      return { ...r, boss: BOSS.get(wb?.boss)?.name || "", item: itemInfo(r.item) };
    });
  }
  return out;
}

/** 出擊：重播按鍵紀錄算傷害。b ＝ { piece, rule, events } */
export function bossHit(user, b, now = Date.now()) {
  if (!user) return { status: 401, error: "要先登入才能打世界 Boss" };
  if (!b || b.rule !== RULE || typeof b.piece !== "string") return { status: 400, error: "格式不對" };
  const row = weekRow(now), p = pieceOf(row.info.theme, b.piece);
  if (!p) return { status: 400, error: "這週換了新的 Boss（或題目對不上），重新出擊吧" };
  const r = replay({ texts: p.texts, rule: b.rule, cat: p.lang, events: b.events, limitMs: null });
  if (!r.ok) return { status: 400, error: "成績驗算沒過：" + r.reason };
  const db = dbh(), sum = r.sum, flag = r.flags.join(",");
  const today = db.prepare("SELECT COUNT(*) n FROM boss_hits WHERE user_id=? AND ts>=? AND counted=1").get(user.id, todayStart(now)).n;
  const raw = flag ? 0 : damageOf(sum);
  const counted = !flag && today < DAILY_CAP ? 1 : 0;
  const dmg = counted && !row.defeated_ts ? Math.min(raw, Math.max(0, row.hp - dealt(row.week))) : 0; // 最後一擊只扣到 0
  const fish = counted ? BOSS_FISH.hit : 0;
  db.prepare("INSERT INTO boss_hits (ts, week, user_id, piece, correct, acc, speed, ms, raw, dmg, counted, fish, flag) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(now, row.week, user.id, p.id, sum.correct, sum.acc, sum.speed, Math.round(sum.ms), raw, dmg, counted, fish, flag);
  if (fish) db.prepare("UPDATE users SET fish=fish+? WHERE id=?").run(fish, user.id);
  if (flag) console.warn(`[世界 Boss] 可疑（${flag}）：${p.id} ${sum.speed.toFixed(1)}`);
  const wasDead = !!row.defeated_ts, killed = !wasDead && settle(row, now);
  return {
    ok: true, piece: p.id, raw, dmg, bonus: accBonus(sum.acc), counted: !!counted, flagged: !!flag, over: !flag && !counted, late: wasDead && !!counted,
    killed, fish, speed: sum.speed, acc: sum.acc, correct: sum.correct, ms: Math.round(sum.ms), today: today + counted, cap: DAILY_CAP,
    total: db.prepare("SELECT fish FROM users WHERE id=?").get(user.id).fish, state: bossState(user, now),
  };
}

/** 看過獎勵通知了 */
export function bossSeen(user, b) {
  if (!user) return { status: 401, error: "要先登入" };
  dbh().prepare("UPDATE boss_rewards SET seen=1 WHERE user_id=?" + (typeof b.week === "string" ? " AND week=?" : "")).run(...(typeof b.week === "string" ? [user.id, b.week] : [user.id]));
  return { ok: true };
}

/** 影片連結用：這週的一段文字和 Boss（驗算在 createVlink 做） */
export function bossPiece(id, now = Date.now()) {
  const row = weekRow(now), p = pieceOf(row.info.theme, id);
  return p ? { piece: p, boss: { name: row.info.name, glyph: row.info.glyph, color: row.info.color, art: BOSS_ART } } : null;
}

/** 管理頁：這週與最近幾週 */
export function bossAdmin(now = Date.now()) {
  const row = weekRow(now); settle(row, now);
  const db = dbh();
  const hits = db.prepare("SELECT COUNT(*) n, SUM(counted) c, SUM(flag<>'') f, COUNT(DISTINCT user_id) u, SUM(counted=1 AND dmg>0) d FROM boss_hits WHERE week=?").get(row.week);
  const weeks = db.prepare("SELECT * FROM boss_weeks ORDER BY week DESC LIMIT 10").all().map((w) => ({
    ...w, name: BOSS.get(w.boss)?.name || w.boss, hp: manualHp(w.week) || hpWith(w.base_hp, hpMult()), dealt: dealt(w.week),
    people: db.prepare("SELECT COUNT(DISTINCT user_id) n FROM boss_hits WHERE week=? AND dmg>0").get(w.week).n,
    rewarded: db.prepare("SELECT COUNT(*) n FROM boss_rewards WHERE week=?").get(w.week).n,
  }));
  return { row, dealt: dealt(row.week), hits, mult: hpMult(), manual: manualHp(row.week), ranking: ranking(row.week, 50, true), weeks, lastPlayers: row.players, prevWeek: prevWeekKey(row.week) };
}
