// 匿名練習統計＋排行榜：SQLite（Node 內建 node:sqlite），存在 /data/stats.db
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { BANK, CATS, LENS, CAT_NAME, LEN_NAME } from "../shared/bank.js";

let db = null;
const ID = /^[0-9a-f]{24}$/;
export const cleanId = (s) => (typeof s === "string" && ID.test(s) ? s : null);
export const cleanDevice = (s) => (["desktop", "tablet", "mobile"].includes(s) ? s : "desktop");
const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };
const int = (v, hi = 1e6) => { const n = num(v, 0, hi); return n == null ? 0 : Math.round(n); };

export function initStats(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;
    CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, cid TEXT, sid TEXT, device TEXT, sw INTEGER, sh INTEGER);
    CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, cid TEXT, sid TEXT, device TEXT, cat TEXT, len TEXT, mode TEXT, rule TEXT,
      ms INTEGER, correct INTEGER, keys INTEGER, errs INTEGER, acc REAL, speed REAL, width INTEGER, indent INTEGER, semi INTEGER, kase INTEGER, enter INTEGER,
      backs INTEGER, pastes INTEGER, bursts INTEGER, ime INTEGER, finished INTEGER);
    CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, cid TEXT, name TEXT, cat TEXT, len TEXT, mode TEXT, rule TEXT,
      speed REAL, acc REAL, correct INTEGER, ms INTEGER, flag TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS learn (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, cid TEXT, sid TEXT, cat TEXT, len TEXT, item TEXT,
      quiz INTEGER, answered INTEGER, correct INTEGER, skipped INTEGER, opened INTEGER);
    CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, cid TEXT, name TEXT, cat TEXT, len TEXT, mode TEXT, rule TEXT,
      specs TEXT, speed REAL, acc REAL, correct INTEGER, ms INTEGER, views INTEGER NOT NULL DEFAULT 0, accepts INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0, loses INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS scores_board ON scores(cat, len, mode, ts);
    CREATE INDEX IF NOT EXISTS runs_ts ON runs(ts);
  `);
  const addCol = (t, c, type) => { if (!db.prepare(`PRAGMA table_info(${t})`).all().some((x) => x.name === c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${type}`); };
  // v0.4.1：排行榜存題目，「挑戰他」才能打同一題（舊資料沒有，挑戰時改成隨機出題）
  addCol("scores", "specs", "TEXT");
  // v0.5：Google 登入（選填）。sub＝Google 帳號固定編號；不存姓名
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, sub TEXT NOT NULL UNIQUE, email TEXT, nick TEXT, created INTEGER NOT NULL, last_login INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL);
  `);
  for (const t of ["runs", "scores", "shares", "learn"]) addCol(t, "user_id", "INTEGER");
  addCol("users", "is_admin", "INTEGER NOT NULL DEFAULT 0"); // v0.7：用 Google 帳號登入管理頁
  addCol("users", "nick_set_at", "INTEGER"); // v0.7：暱稱設定後 7 天內不能再改
  addCol("users", "banned", "INTEGER NOT NULL DEFAULT 0"); // v0.7：停權（不雅暱稱等），排行榜與分享都不顯示
  addCol("users", "banned_at", "INTEGER");
  addCol("users", "ban_reason", "TEXT");
  // v0.8：管理員可以把成績／分享標記「暱稱不雅」（不刪除，只把暱稱遮起來）；可疑成績可以人工放行
  addCol("scores", "name_hidden", "INTEGER NOT NULL DEFAULT 0");
  addCol("scores", "approved", "INTEGER NOT NULL DEFAULT 0");
  addCol("shares", "name_hidden", "INTEGER NOT NULL DEFAULT 0");
  // v0.6：管理頁的設定（例如 Google 登入的用戶端），存在資料庫，改了馬上生效，不用重新部署
  db.exec("CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT, updated INTEGER NOT NULL)");
  db.exec("CREATE INDEX IF NOT EXISTS runs_user ON runs(user_id, ts)");
}

export function recordVisit(v) {
  db.prepare("INSERT INTO visits (ts,cid,sid,device,sw,sh) VALUES (?,?,?,?,?,?)")
    .run(Date.now(), cleanId(v.cid), cleanId(v.sid), cleanDevice(v.device), int(v.sw, 10000), int(v.sh, 10000));
}

export const dbh = () => db;
export function getSetting(k) { return db.prepare("SELECT v FROM settings WHERE k=?").get(k)?.v ?? ""; }
export function setSetting(k, v) {
  if (v == null || v === "") db.prepare("DELETE FROM settings WHERE k=?").run(k);
  else db.prepare("INSERT INTO settings (k,v,updated) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated=excluded.updated").run(k, String(v), Date.now());
}

export function recordRun(r, userId = null) {
  if (!CATS.includes(r.c) || ![...LENS, "drill"].includes(r.l) || !["full", "t60"].includes(r.m) || !["block", "back", "free"].includes(r.rule)) throw new Error("練習紀錄格式不對");
  db.prepare(`INSERT INTO runs (ts,cid,sid,device,cat,len,mode,rule,ms,correct,keys,errs,acc,speed,width,indent,semi,kase,enter,backs,pastes,bursts,ime,finished,user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    Date.now(), cleanId(r.cid), cleanId(r.sid), cleanDevice(r.device), r.c, r.l, r.m, r.rule,
    int(r.ms, 3600000), int(r.correct), int(r.keys), int(r.errs), num(r.acc, 0, 1) ?? 0, num(r.speed, 0, 1000) ?? 0,
    int(r.width), int(r.indent), int(r.semi), int(r.kase), int(r.enter), int(r.backs), int(r.pastes), int(r.bursts), int(r.ime), r.finished ? 1 : 0, userId);
}

/** 「學一下」卡片的使用情形：有沒有作答預測輸出、答對、跳過、展開幾行說明 */
export function recordLearn(r, userId = null) {
  if (!CATS.includes(r.c) || !LENS.includes(r.l)) throw new Error("學一下紀錄格式不對");
  const item = typeof r.item === "string" && /^[0-9,]{1,60}$/.test(r.item) ? r.item : null;
  db.prepare("INSERT INTO learn (ts,cid,sid,cat,len,item,quiz,answered,correct,skipped,opened,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(Date.now(), cleanId(r.cid), cleanId(r.sid), r.c, r.l, item, r.quiz ? 1 : 0, r.answered ? 1 : 0, r.correct ? 1 : 0, r.skipped ? 1 : 0, int(r.opened, 500), userId);
}

/* ---------- 分享挑戰 ---------- */
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export function createShare(x) {
  for (let k = 0; k < 5; k++) {
    const id = Array.from(randomBytes(8), (b) => B62[b % 62]).join("");
    try {
      db.prepare("INSERT INTO shares (id,ts,cid,name,cat,len,mode,rule,specs,speed,acc,correct,ms,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(id, Date.now(), x.cid, x.name, x.c, x.l, x.m, x.rule, JSON.stringify(x.specs), x.speed, x.acc, x.correct, x.ms, x.userId ?? null);
      return id;
    } catch (e) { if (!/UNIQUE|PRIMARY/.test(e.message)) throw e; }
  }
  throw new Error("分享編號重複");
}
/** 給別人看的分享內容（不含 cid）；count＝算一次瀏覽 */
export function getShare(id, count) {
  const r = db.prepare("SELECT * FROM shares WHERE id=? AND (user_id IS NULL OR user_id NOT IN (SELECT id FROM users WHERE banned=1))").get(id);
  if (!r) return null;
  if (count) db.prepare("UPDATE shares SET views=views+1 WHERE id=?").run(id);
  return { id: r.id, ts: r.ts, name: r.name_hidden ? HIDDEN_NAME : r.name, login: r.user_id != null, c: r.cat, l: r.len, m: r.mode, rule: r.rule, specs: JSON.parse(r.specs), speed: r.speed, acc: r.acc, correct: r.correct, ms: r.ms };
}
export function shareEvent(id, kind) {
  const col = { accept: "accepts", win: "wins", lose: "loses" }[kind];
  if (col) db.prepare(`UPDATE shares SET ${col}=${col}+1 WHERE id=?`).run(id);
}

/* ---------- 排行榜 ---------- */
const TZ = 8 * 3600000; // 台灣時間
export function periodStart(p, now = Date.now()) {
  if (p === "all") return 0;
  const local = now + TZ, day = Math.floor(local / 86400000) * 86400000;
  if (p === "week") { const dow = (new Date(day).getUTCDay() + 6) % 7; return day - dow * 86400000 - TZ; } // 週一 00:00
  return day - TZ;
}
/** 排行榜：每人只留最好的一次。登入的人以帳號算（換電腦也是同一個人），沒登入的以瀏覽器編號算 */
export const HIDDEN_NAME = "（暱稱不雅，已隱藏）";
const SHOWN = "(flag='' OR approved=1) AND (user_id IS NULL OR user_id NOT IN (SELECT id FROM users WHERE banned=1))";
export function board(c, l, m, p, me, limit = 20, meUser = null) {
  // 登入的人顯示目前的帳號暱稱（改暱稱後排行榜跟著變）；被標記不雅的成績遮住暱稱
  const rows = db.prepare(`SELECT CASE WHEN name_hidden=1 THEN '${HIDDEN_NAME}' ELSE COALESCE((SELECT nick FROM users u WHERE u.id = user_id), name) END AS name,
      speed, acc, rule, cid, ts, id, specs, user_id FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY COALESCE('u' || user_id, cid) ORDER BY speed DESC, ts ASC) rn FROM scores
      WHERE cat=? AND len=? AND mode=? AND ts>=? AND ${SHOWN})
      WHERE rn=1 ORDER BY speed DESC, ts ASC LIMIT ?`)
    .all(c, l, m, periodStart(p), limit);
  const parse = (x) => { try { return x ? JSON.parse(x) : null; } catch { return null; } };
  return rows.map((r) => ({ name: r.name, speed: Math.round(r.speed * 10) / 10, acc: Math.round(r.acc * 1000) / 1000, rule: r.rule, login: r.user_id != null,
    me: (meUser != null && r.user_id === meUser) || (!!me && r.cid === me && (r.user_id == null || r.user_id === meUser)), id: r.id, specs: parse(r.specs) }));
}
/** 所有設定的排行榜：每種「題庫×長度×模式」的前幾名（依題庫、長度、模式排序） */
export function boards(p, me, limit = 5, meUser = null) {
  const combos = db.prepare(`SELECT DISTINCT cat, len, mode FROM scores WHERE ts>=? AND ${SHOWN}`).all(periodStart(p));
  const ord = (r) => CATS.indexOf(r.cat) * 100 + LENS.indexOf(r.len) * 10 + (r.mode === "t60" ? 1 : 0);
  return combos.sort((a, b) => ord(a) - ord(b)).map((r) => ({ c: r.cat, l: r.len, m: r.mode, rows: board(r.cat, r.len, r.mode, p, me, limit, meUser).map(({ id, ...x }) => x) }));
}
/** 存一筆成績；回傳今天的名次（這次比之前好才有名次） */
export function recordScore(s) {
  const info = db.prepare("INSERT INTO scores (ts,cid,name,cat,len,mode,rule,speed,acc,correct,ms,flag,specs,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(Date.now(), s.cid, s.name, s.c, s.l, s.m, s.rule, s.speed, s.acc, s.correct, s.ms, s.flag || "", s.specs ? JSON.stringify(s.specs) : null, s.userId ?? null);
  if (s.flag) return { rank: null };
  const day = board(s.c, s.l, s.m, "day", s.cid, 1000, s.userId ?? null);
  const i = day.findIndex((r) => r.id === Number(info.lastInsertRowid));
  return { rank: i >= 0 ? i + 1 : null };
}

/** 個人頁：只有登入的本人看得到 */
export function history(userId) {
  const q = (sql, ...a) => db.prepare(sql).all(...a);
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const since7 = Date.now() - 7 * 86400000;
  return {
    total: one(`SELECT COUNT(*) runs, SUM(finished) done, COALESCE(SUM(ms),0) ms, SUM(CASE WHEN ts>=? THEN 1 ELSE 0 END) week,
      MIN(ts) first FROM runs WHERE user_id=?`, since7, userId),
    best: q(`SELECT cat c, len l, mode m, COUNT(*) n, MAX(speed) best, AVG(speed) avg, AVG(acc) acc FROM runs
      WHERE user_id=? AND finished=1 AND len<>'drill' GROUP BY cat, len, mode ORDER BY n DESC`, userId),
    trend: q(`SELECT ts, cat c, len l, mode m, speed, acc FROM (SELECT * FROM runs WHERE user_id=? AND finished=1 AND len<>'drill' ORDER BY ts DESC LIMIT 200) ORDER BY ts`, userId),
    errors: q(`SELECT cat c, COUNT(*) n, SUM(keys) keys, SUM(errs) errs, SUM(width) width, SUM(indent) indent, SUM(semi) semi, SUM(kase) kase, SUM(enter) enter, SUM(backs) backs
      FROM runs WHERE user_id=? AND finished=1 GROUP BY cat`, userId),
    learn: one("SELECT COUNT(*) n, COALESCE(SUM(answered),0) answered, COALESCE(SUM(correct),0) correct FROM learn WHERE user_id=?", userId),
    recent: q(`SELECT ts, cat c, len l, mode m, rule, speed, acc, ms, errs FROM runs WHERE user_id=? AND finished=1 ORDER BY ts DESC LIMIT 20`, userId),
    shares: q("SELECT id, ts, cat c, len l, mode m, speed, acc, views, accepts, wins, loses FROM shares WHERE user_id=? ORDER BY ts DESC LIMIT 20", userId),
  };
}

export function exportAll() {
  return {
    exported: new Date().toISOString(),
    visits: db.prepare("SELECT * FROM visits").all(),
    runs: db.prepare("SELECT * FROM runs").all(),
    scores: db.prepare("SELECT * FROM scores").all(),
    learn: db.prepare("SELECT * FROM learn").all(),
    shares: db.prepare("SELECT id, ts, cid, user_id, name, cat, len, mode, rule, speed, acc, correct, ms, views, accepts, wins, loses FROM shares").all(),
    users: db.prepare("SELECT id, created, last_login FROM users").all(), // 匯出不含 Google 編號與 email
  };
}

/* ---------- 統計頁 ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pct = (x) => (x == null ? "—" : Math.round(x * 100) + "%");
const r1 = (x) => (x == null ? "—" : (Math.round(x * 10) / 10).toString());
const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${head.length}">還沒有資料</td></tr>`}</tbody></table>`;
const dayExpr = "date((ts/1000) + 8*3600, 'unixepoch')";
export const FLAG = { burst: "一次湧進很多字", "too-fast-keys": "按鍵間隔太短", "too-regular": "節奏太規律", "too-fast": "速度超過上限", mismatch: "前端成績和驗算不同" };
export const RULE = { block: "擋下", back: "要倒退修", free: "可以帶錯" };

/** 統計（放在管理頁裡） */
export function renderStatsBody() {
  const q = (sql, ...a) => db.prepare(sql).all(...a);
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const tot = one(`SELECT (SELECT COUNT(*) FROM visits) v, (SELECT COUNT(DISTINCT cid) FROM visits) u, (SELECT COUNT(*) FROM runs WHERE finished=1) rf,
    (SELECT COUNT(*) FROM runs WHERE finished=0) ra, (SELECT COUNT(*) FROM scores) s, (SELECT COUNT(*) FROM scores WHERE flag<>'') sf`);
  const daily = q(`SELECT ${dayExpr} d, COUNT(*) n, COUNT(DISTINCT cid) u, AVG(finished) fin,
      AVG(CASE WHEN cat='cpp' AND finished=1 THEN speed END) cpp, AVG(CASE WHEN cat='py' AND finished=1 THEN speed END) py,
      AVG(CASE WHEN cat='en' AND finished=1 THEN speed END) en, AVG(CASE WHEN cat='zh' AND finished=1 THEN speed END) zh,
      AVG(CASE WHEN finished=1 THEN acc END) acc, SUM(pastes) pastes, SUM(bursts) bursts, SUM(CASE WHEN cat<>'zh' AND ime>0 THEN 1 ELSE 0 END) ime
    FROM runs GROUP BY d ORDER BY d DESC LIMIT 14`);
  const flagged = Object.fromEntries(q(`SELECT ${dayExpr} d, COUNT(*) n FROM scores WHERE flag<>'' GROUP BY d`).map((r) => [r.d, r.n]));
  const byCat = q(`SELECT cat, len, mode, COUNT(*) n, AVG(speed) sp, AVG(acc) acc, AVG(width) w, AVG(indent) ind, AVG(semi) semi, AVG(kase) k, AVG(backs) b, AVG(ms) ms
    FROM runs WHERE finished=1 GROUP BY cat, len, mode ORDER BY cat, len, mode`);
  const rules = q("SELECT rule, COUNT(*) n, AVG(acc) acc, AVG(speed) sp FROM runs WHERE finished=1 GROUP BY rule");
  const dev = q("SELECT device, COUNT(*) n FROM visits GROUP BY device ORDER BY n DESC");
  const ret = one(`SELECT COUNT(*) u, SUM(CASE WHEN days>1 THEN 1 ELSE 0 END) back FROM (SELECT cid, COUNT(DISTINCT ${dayExpr}) days FROM visits WHERE cid IS NOT NULL GROUP BY cid)`);
  const recent = q("SELECT * FROM scores ORDER BY id DESC LIMIT 40");
  const sh = one("SELECT COUNT(*) n, COALESCE(SUM(views),0) v, COALESCE(SUM(accepts),0) a, COALESCE(SUM(wins),0) w, COALESCE(SUM(loses),0) l FROM shares");
  const shDaily = q(`SELECT ${dayExpr} d, COUNT(*) n, SUM(views) v, SUM(accepts) a, SUM(wins) w, SUM(loses) l FROM shares GROUP BY d ORDER BY d DESC LIMIT 14`);
  const learn = q(`SELECT cat, len, COUNT(*) n, SUM(quiz) quiz, SUM(answered) ans, SUM(correct) ok, SUM(skipped) skip,
      AVG(opened) opened, SUM(CASE WHEN opened>0 THEN 1 ELSE 0 END) anyopen FROM learn GROUP BY cat, len ORDER BY cat, len`);
  const hard = q(`SELECT cat, len, item, COUNT(*) n, SUM(correct) ok FROM learn WHERE answered=1 GROUP BY cat, len, item HAVING n >= 3 ORDER BY 1.0*ok/n LIMIT 10`);
  const itemName = (c, l, item) => { const x = BANK[c]?.[l]?.[Number(String(item).split(",")[0])]; return x && typeof x === "object" ? (x.title || x.t) : esc(item); };
  const tw = (ts) => new Date(ts + TZ).toISOString().slice(5, 16).replace("T", " ");
  return `<p class="n">全部匿名。時間是台灣時間。<a href="/admin/export.json">下載全部原始資料（JSON）</a></p>
<div class="k"><div>登入帳號<b>${one("SELECT COUNT(*) n FROM users").n}</b></div><div>造訪<b>${tot.v}</b></div><div>不同的人<b>${tot.u}</b></div><div>回來第二天以上<b>${ret.back ?? 0}</b></div><div>練完的局數<b>${tot.rf}</b></div><div>中途放棄<b>${tot.ra}</b></div><div>排行榜成績<b>${tot.s}</b></div><div>可疑（沒上榜）<b>${tot.sf}</b></div></div>
<h2>上課檢查（每天）</h2><p class="n">速度：程式和英文是 WPM，中文是字/分（只算練完的局）。「輸入法沒切」＝打程式或英文時開始選字的局數。</p>
<div class="wrap">${table(["日期", "局數", "人數", "練完", "C++", "Python", "英文", "中文", "正確率", "擋下貼上", "一次湧進多字", "輸入法沒切", "可疑成績"],
    daily.map((r) => [r.d, r.n, r.u, pct(r.fin), r1(r.cpp), r1(r.py), r1(r.en), r1(r.zh), pct(r.acc), r.pastes, r.bursts, r.ime, flagged[r.d] || 0]))}</div>
<h2>題庫 × 長度 × 模式</h2><p class="n">每局平均的錯誤次數。</p>
<div class="wrap">${table(["題庫", "長度", "模式", "局數", "平均速度", "正確率", "平均秒數", "全形半形", "縮排", "分號", "大小寫", "倒退"],
    byCat.map((r) => [CAT_NAME[r.cat] || esc(r.cat), LEN_NAME[r.len] || esc(r.len), r.mode === "t60" ? "1 分鐘" : "打完一題", r.n, r1(r.sp), pct(r.acc), r1(r.ms / 1000), r1(r.w), r1(r.ind), r1(r.semi), r1(r.k), r1(r.b)]))}</div>
<h2>學一下</h2><p class="n">打完後的教學卡片。「看到」＝結算畫面出現卡片的次數；程式題（句子、整段）有預測輸出，答完或跳過才看得到說明。</p>
<div class="wrap">${table(["題庫", "長度", "看到", "有預測輸出", "作答", "答對率", "跳過", "有展開說明", "平均展開幾行"],
    learn.map((r) => [CAT_NAME[r.cat] || esc(r.cat), LEN_NAME[r.len] || esc(r.len), r.n, r.quiz, r.ans, r.ans ? pct(r.ok / r.ans) : "—", r.skip, r.anyopen, r1(r.opened)]))}</div>
<p class="n">答對率最低的題目（作答 3 次以上）</p>
<div class="wrap">${table(["題目", "作答", "答對率"], hard.map((r) => [esc(itemName(r.cat, r.len, r.item)), r.n, pct(r.ok / r.n)]))}</div>
<h2>分享挑戰</h2><p class="n">分享出去的挑戰連結：被打開幾次、幾次有人接受挑戰、挑戰者贏或輸（依建立連結的日期）。</p>
<div class="k"><div>分享<b>${sh.n}</b></div><div>被打開<b>${sh.v}</b></div><div>接受挑戰<b>${sh.a}</b></div><div>挑戰者贏<b>${sh.w}</b></div><div>挑戰者輸<b>${sh.l}</b></div></div>
<div class="wrap">${table(["日期", "分享", "被打開", "接受挑戰", "挑戰者贏", "挑戰者輸"], shDaily.map((r) => [r.d, r.n, r.v, r.a, r.w, r.l]))}</div>
<h2>打錯時的規則</h2><div class="wrap">${table(["規則", "局數", "正確率", "平均速度"], rules.map((r) => [RULE[r.rule] || esc(r.rule), r.n, pct(r.acc), r1(r.sp)]))}</div>
<h2>裝置</h2><div class="wrap">${table(["裝置", "造訪"], dev.map((r) => [({ desktop: "電腦", tablet: "平板", mobile: "手機" })[r.device] || esc(r.device), r.n]))}</div>
<h2>最近的排行榜成績</h2><div class="wrap">${table(["時間", "暱稱", "題庫", "長度", "模式", "規則", "速度", "正確率", "狀態"],
    recent.map((r) => [tw(r.ts), esc(r.name), CAT_NAME[r.cat] || "", LEN_NAME[r.len] || "", r.mode === "t60" ? "1 分鐘" : "打完一題", RULE[r.rule] || "", r1(r.speed), pct(r.acc),
      r.flag ? "可疑：" + r.flag.split(",").map((f) => FLAG[f] || esc(f)).join("、") : "上榜"]))}</div>
`;
}
