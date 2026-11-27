// 老師自訂題組（shared/custom.js 說明）：存在資料庫 custom_sets，管理頁新增、下架；學生用 /t/編號 打，成績跟冒險模式一樣記在 adv、adv_runs（關卡 id＝set-編號）。
import { randomBytes } from "node:crypto";
import { dbh, HIDDEN_NAME } from "./stats.js";
import { cleanCustom } from "../shared/custom.js";

const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const cache = new Map();

export function initCustom() {
  dbh().exec(`CREATE TABLE IF NOT EXISTS custom_sets (id TEXT PRIMARY KEY, title TEXT NOT NULL, lang TEXT NOT NULL, texts TEXT NOT NULL, target INTEGER NOT NULL,
    created INTEGER NOT NULL, by_user INTEGER, hidden INTEGER NOT NULL DEFAULT 0)`);
}
/** 新增題組；回傳 { id } 或 { error } */
export function createSet(input, byUser) {
  const c = cleanCustom(input);
  if (c.error) return c;
  for (let k = 0; k < 5; k++) {
    const id = Array.from(randomBytes(6), (b) => B62[b % 62]).join("");
    try {
      dbh().prepare("INSERT INTO custom_sets (id, title, lang, texts, target, created, by_user) VALUES (?,?,?,?,?,?,?)")
        .run(id, c.title, c.lang, JSON.stringify(c.texts), c.target, Date.now(), byUser ?? null);
      return { id };
    } catch (e) { if (!/UNIQUE|PRIMARY/.test(e.message)) throw e; }
  }
  return { error: "編號重複，再試一次" };
}
/** 讀一個題組（admin＝下架的也讀） */
export function getSet(id, admin = false) {
  if (!/^[0-9A-Za-z]{6}$/.test(id || "")) return null;
  let s = cache.get(id);
  if (s === undefined) {
    const r = dbh().prepare("SELECT * FROM custom_sets WHERE id=?").get(id);
    s = r ? { id: r.id, title: r.title, lang: r.lang, texts: JSON.parse(r.texts), target: r.target, created: r.created, hidden: !!r.hidden } : null;
    cache.set(id, s);
  }
  return s && (admin || !s.hidden) ? s : null;
}
export function setSetHidden(id, hide) {
  const ch = dbh().prepare("UPDATE custom_sets SET hidden=? WHERE id=?").run(hide ? 1 : 0, id).changes;
  cache.delete(id);
  return ch > 0;
}
export function listSets() {
  return dbh().prepare(`SELECT s.id, s.title, s.lang, s.target, s.created, s.hidden, LENGTH(s.texts) len,
      (SELECT COUNT(*) FROM adv_runs r WHERE r.level='set-'||s.id AND r.flag='') runs,
      (SELECT COUNT(DISTINCT user_id) FROM adv_runs r WHERE r.level='set-'||s.id AND r.flag='') users,
      (SELECT AVG(speed) FROM adv_runs r WHERE r.level='set-'||s.id AND r.flag='' AND r.stars>0) sp
    FROM custom_sets s ORDER BY s.created DESC`).all();
}
/** 題組的排行榜（登入的人每人最好的一次） */
export function setBoard(id, user) {
  if (!getSet(id)) return null;
  return dbh().prepare(`SELECT u.id, COALESCE(u.nick, '（還沒取暱稱）') name, a.speed, a.acc, a.stars FROM adv a JOIN users u ON u.id = a.user_id
      WHERE a.level=? AND u.banned=0 ORDER BY a.speed DESC LIMIT 20`).all("set-" + id)
    .map((r) => ({ name: r.name || HIDDEN_NAME, speed: r.speed, acc: r.acc, stars: r.stars, me: !!user && r.id === user.id }));
}
