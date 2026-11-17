// 匿名練習統計＋排行榜：SQLite（Node 內建 node:sqlite），存在 /data/stats.db
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
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
    CREATE INDEX IF NOT EXISTS scores_board ON scores(cat, len, mode, ts);
    CREATE INDEX IF NOT EXISTS runs_ts ON runs(ts);
  `);
}

export function recordVisit(v) {
  db.prepare("INSERT INTO visits (ts,cid,sid,device,sw,sh) VALUES (?,?,?,?,?,?)")
    .run(Date.now(), cleanId(v.cid), cleanId(v.sid), cleanDevice(v.device), int(v.sw, 10000), int(v.sh, 10000));
}

export function recordRun(r) {
  if (!CATS.includes(r.c) || ![...LENS, "drill"].includes(r.l) || !["full", "t60"].includes(r.m) || !["block", "back", "free"].includes(r.rule)) throw new Error("練習紀錄格式不對");
  db.prepare(`INSERT INTO runs (ts,cid,sid,device,cat,len,mode,rule,ms,correct,keys,errs,acc,speed,width,indent,semi,kase,enter,backs,pastes,bursts,ime,finished)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    Date.now(), cleanId(r.cid), cleanId(r.sid), cleanDevice(r.device), r.c, r.l, r.m, r.rule,
    int(r.ms, 3600000), int(r.correct), int(r.keys), int(r.errs), num(r.acc, 0, 1) ?? 0, num(r.speed, 0, 1000) ?? 0,
    int(r.width), int(r.indent), int(r.semi), int(r.kase), int(r.enter), int(r.backs), int(r.pastes), int(r.bursts), int(r.ime), r.finished ? 1 : 0);
}

/** 「學一下」卡片的使用情形：有沒有作答預測輸出、答對、跳過、展開幾行說明 */
export function recordLearn(r) {
  if (!CATS.includes(r.c) || !LENS.includes(r.l)) throw new Error("學一下紀錄格式不對");
  const item = typeof r.item === "string" && /^[0-9,]{1,60}$/.test(r.item) ? r.item : null;
  db.prepare("INSERT INTO learn (ts,cid,sid,cat,len,item,quiz,answered,correct,skipped,opened) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(Date.now(), cleanId(r.cid), cleanId(r.sid), r.c, r.l, item, r.quiz ? 1 : 0, r.answered ? 1 : 0, r.correct ? 1 : 0, r.skipped ? 1 : 0, int(r.opened, 500));
}

/* ---------- 排行榜 ---------- */
const TZ = 8 * 3600000; // 台灣時間
export function periodStart(p, now = Date.now()) {
  if (p === "all") return 0;
  const local = now + TZ, day = Math.floor(local / 86400000) * 86400000;
  if (p === "week") { const dow = (new Date(day).getUTCDay() + 6) % 7; return day - dow * 86400000 - TZ; } // 週一 00:00
  return day - TZ;
}
export function board(c, l, m, p, me, limit = 20) {
  const rows = db.prepare(`SELECT name, speed, acc, rule, cid, ts, id FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY cid ORDER BY speed DESC, ts ASC) rn FROM scores
      WHERE cat=? AND len=? AND mode=? AND flag='' AND ts>=?) WHERE rn=1 ORDER BY speed DESC, ts ASC LIMIT ?`)
    .all(c, l, m, periodStart(p), limit);
  return rows.map((r) => ({ name: r.name, speed: Math.round(r.speed * 10) / 10, acc: Math.round(r.acc * 1000) / 1000, rule: r.rule, me: !!me && r.cid === me, id: r.id }));
}
/** 所有設定的排行榜：每種「題庫×長度×模式」的前幾名（依題庫、長度、模式排序） */
export function boards(p, me, limit = 5) {
  const combos = db.prepare("SELECT DISTINCT cat, len, mode FROM scores WHERE flag='' AND ts>=?").all(periodStart(p));
  const ord = (r) => CATS.indexOf(r.cat) * 100 + LENS.indexOf(r.len) * 10 + (r.mode === "t60" ? 1 : 0);
  return combos.sort((a, b) => ord(a) - ord(b)).map((r) => ({ c: r.cat, l: r.len, m: r.mode, rows: board(r.cat, r.len, r.mode, p, me, limit).map(({ id, ...x }) => x) }));
}
/** 存一筆成績；回傳今天的名次（這次比之前好才有名次） */
export function recordScore(s) {
  const info = db.prepare("INSERT INTO scores (ts,cid,name,cat,len,mode,rule,speed,acc,correct,ms,flag) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(Date.now(), s.cid, s.name, s.c, s.l, s.m, s.rule, s.speed, s.acc, s.correct, s.ms, s.flag || "");
  if (s.flag) return { rank: null };
  const day = board(s.c, s.l, s.m, "day", s.cid, 1000);
  const i = day.findIndex((r) => r.id === Number(info.lastInsertRowid));
  return { rank: i >= 0 ? i + 1 : null };
}

export function exportAll() {
  return {
    exported: new Date().toISOString(),
    visits: db.prepare("SELECT * FROM visits").all(),
    runs: db.prepare("SELECT * FROM runs").all(),
    scores: db.prepare("SELECT * FROM scores").all(),
    learn: db.prepare("SELECT * FROM learn").all(),
  };
}

/* ---------- 統計頁 ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pct = (x) => (x == null ? "—" : Math.round(x * 100) + "%");
const r1 = (x) => (x == null ? "—" : (Math.round(x * 10) / 10).toString());
const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${head.length}">還沒有資料</td></tr>`}</tbody></table>`;
const dayExpr = "date((ts/1000) + 8*3600, 'unixepoch')";
const FLAG = { burst: "一次湧進很多字", "too-fast-keys": "按鍵間隔太短", "too-regular": "節奏太規律", "too-fast": "速度超過上限", mismatch: "前端成績和驗算不同" };
const RULE = { block: "擋下", back: "要倒退修", free: "可以帶錯" };

export function renderStatsPage() {
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
  const learn = q(`SELECT cat, len, COUNT(*) n, SUM(quiz) quiz, SUM(answered) ans, SUM(correct) ok, SUM(skipped) skip,
      AVG(opened) opened, SUM(CASE WHEN opened>0 THEN 1 ELSE 0 END) anyopen FROM learn GROUP BY cat, len ORDER BY cat, len`);
  const hard = q(`SELECT cat, len, item, COUNT(*) n, SUM(correct) ok FROM learn WHERE answered=1 GROUP BY cat, len, item HAVING n >= 3 ORDER BY 1.0*ok/n LIMIT 10`);
  const itemName = (c, l, item) => { const x = BANK[c]?.[l]?.[Number(String(item).split(",")[0])]; return x && typeof x === "object" ? (x.title || x.t) : esc(item); };
  const tw = (ts) => new Date(ts + TZ).toISOString().slice(5, 16).replace("T", " ");
  return `<!DOCTYPE html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>喵打統計</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:20px max(4vw,12px);color:#2a1d14;background:#fffaf2}h1{margin:0 0 4px}h2{margin:28px 0 8px;font-size:19px}
table{border-collapse:collapse;width:100%;background:#fff;font-size:14px}th,td{border-bottom:1px solid #ecdcc8;padding:5px 8px;text-align:left;white-space:nowrap}th{background:#f6ead9}
.wrap{overflow-x:auto}.k{display:flex;flex-wrap:wrap;gap:10px}.k div{background:#fff;border:2px solid #ecdcc8;border-radius:10px;padding:6px 12px}.k b{display:block;font-size:24px}p.n{color:#8a735f;font-size:13px}a{color:#c0641a}</style></head><body>
<h1>喵打統計</h1><p class="n">全部匿名。時間是台灣時間。<a href="/stats/export.json">下載全部原始資料（JSON）</a></p>
<div class="k"><div>造訪<b>${tot.v}</b></div><div>不同的人<b>${tot.u}</b></div><div>回來第二天以上<b>${ret.back ?? 0}</b></div><div>練完的局數<b>${tot.rf}</b></div><div>中途放棄<b>${tot.ra}</b></div><div>排行榜成績<b>${tot.s}</b></div><div>可疑（沒上榜）<b>${tot.sf}</b></div></div>
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
<h2>打錯時的規則</h2><div class="wrap">${table(["規則", "局數", "正確率", "平均速度"], rules.map((r) => [RULE[r.rule] || esc(r.rule), r.n, pct(r.acc), r1(r.sp)]))}</div>
<h2>裝置</h2><div class="wrap">${table(["裝置", "造訪"], dev.map((r) => [({ desktop: "電腦", tablet: "平板", mobile: "手機" })[r.device] || esc(r.device), r.n]))}</div>
<h2>最近的排行榜成績</h2><div class="wrap">${table(["時間", "暱稱", "題庫", "長度", "模式", "規則", "速度", "正確率", "狀態"],
    recent.map((r) => [tw(r.ts), esc(r.name), CAT_NAME[r.cat] || "", LEN_NAME[r.len] || "", r.mode === "t60" ? "1 分鐘" : "打完一題", RULE[r.rule] || "", r1(r.speed), pct(r.acc),
      r.flag ? "可疑：" + r.flag.split(",").map((f) => FLAG[f] || esc(f)).join("、") : "上榜"]))}</div>
</body></html>`;
}
