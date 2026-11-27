// 貓窩（伺服器）：家具的擁有、跟學習連動的解鎖、房間擺設。只存登入的人。
// 買來的家具記在 items 表（id 以 "den-" 開頭、how＝"buy"）；擺設存在 users.den（JSON：[{ id, x, y }]）。
// 貓：擁有的每一種毛色是一隻貓（cats），前端最多畫 5 隻。
import { dbh } from "./stats.js";
import { ISLANDS } from "../shared/quest.js";
import { DEN_ITEM, unlockedOf, layoutError, cleanLayout } from "../shared/den.js";
import { ITEMS } from "../shared/items.js";

export function initDen() {
  const has = (c) => dbh().prepare("PRAGMA table_info(users)").all().some((x) => x.name === c);
  if (!has("den")) dbh().exec("ALTER TABLE users ADD COLUMN den TEXT");
}

/** 學習進度：打倒 Boss 的章（書）、Boss 關（獎盃）、完成幾篇每日新聞 */
function progress(uid) {
  const stars = Object.fromEntries(dbh().prepare("SELECT level, stars FROM adv WHERE user_id=? AND stars>0").all(uid).map((r) => [r.level, r.stars]));
  const books = [], trophies = [];
  for (const is of ISLANDS) for (const ch of is.chapters) {
    const boss = ch.levels.find((lv) => lv.big);
    if (boss && stars[boss.id] > 0) { books.push(ch.id); trophies.push(boss.id); }
  }
  const news = Object.keys(stars).filter((k) => k.startsWith("news-")).length;
  return { books, trophies, news };
}
/** 擁有的毛色（每一種毛色在貓窩裡是一隻貓）：免費的橘貓加上買到的，照 items.js 的順序 */
function ownedFurs(uid) {
  const own = new Set(dbh().prepare("SELECT item FROM items WHERE user_id=? AND item LIKE 'fur-%'").all(uid).map((r) => r.item));
  return ITEMS.filter((it) => it.slot === "fur" && it.fur && (it.price === 0 || own.has(it.id))).map((it) => it.id);
}
const ownedDen = (uid) => dbh().prepare("SELECT item FROM items WHERE user_id=? AND item LIKE 'den-%'").all(uid).map((r) => r.item).filter((id) => DEN_ITEM.has(id));

/** 這個人的貓窩 */
export function denState(user) {
  if (!user) return { login: false };
  const u = dbh().prepare("SELECT fish, den FROM users WHERE id=?").get(user.id);
  const p = progress(user.id), owned = ownedDen(user.id), unlocked = unlockedOf(p);
  let layout = []; try { layout = JSON.parse(u.den || "[]"); } catch {}
  return { login: true, fish: u.fish, owned, unlocked, cats: ownedFurs(user.id), layout: cleanLayout(layout, new Set([...owned, ...unlocked])), ...p };
}

/** 用小魚乾買家具（跟學習連動的不能買） */
export function denBuy(user, b) {
  if (!user) return { status: 401, error: "要先登入" };
  const it = DEN_ITEM.get(b.item);
  if (!it || it.learn || !(it.price > 0)) return { status: 400, error: "這個不能買" };
  if (ownedDen(user.id).includes(it.id)) return { status: 400, error: "已經有了" };
  const db = dbh();
  const r = db.prepare("UPDATE users SET fish=fish-? WHERE id=? AND fish>=?").run(it.price, user.id, it.price);
  if (!r.changes) return { status: 400, error: "小魚乾不夠" };
  db.prepare("INSERT INTO items (user_id, item, ts, how) VALUES (?,?,?,?)").run(user.id, it.id, Date.now(), "buy");
  return { ok: true, ...denState(user) };
}

/** 存擺設：每件都要擁有或解鎖、在房間裡、牆上或地板對得上、不重疊 */
export function denSave(user, b) {
  if (!user) return { status: 401, error: "要先登入" };
  const st = denState(user);
  const layout = Array.isArray(b.layout) ? b.layout.map((e) => ({ id: e?.id, x: e?.x, y: e?.y })) : null;
  const err = layoutError(layout, new Set([...st.owned, ...st.unlocked]));
  if (err) return { status: 400, error: err };
  dbh().prepare("UPDATE users SET den=? WHERE id=?").run(JSON.stringify(layout), user.id);
  return { ok: true, ...denState(user) };
}
