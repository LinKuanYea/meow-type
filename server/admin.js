// 管理頁 /admin：統計、排行榜與分享（標記不雅、放行可疑）、Google 登入設定、帳號與管理員、資料匯出。以後管理相關的都放這裡。
// 登入有兩種：
//   1. 用 Google 帳號登入喵打，且這個帳號被設成管理員（建議）
//   2. 密碼（ADMIN_PASSWORD，沒設定就用 STATS_PASSWORD）→ 管理員 cookie（HttpOnly、SameSite=Strict、只送到 /admin）
//      管理員可以停用密碼登入；萬一 Google 登入壞掉，伺服器 .env 設 ADMIN_PASSWORD_RESCUE=1 重新部署就能暫時用密碼登入
// 防護：密碼錯太多次會擋一陣子；所有 POST 都檢查 Origin 是同一個網站；用戶端密鑰只寫不讀（畫面上只顯示結尾 4 碼）
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { renderStatsBody, exportAll, getSetting, setSetting, dbh, FLAG, RULE, HIDDEN_NAME } from "./stats.js";
import { CAT_NAME, LEN_NAME } from "../shared/bank.js";
import { oauthConfig, googleReady, currentUser, endSession } from "./auth.js";

const PASSWORD = process.env.ADMIN_PASSWORD || process.env.STATS_PASSWORD || "";
const SESSION_MS = 12 * 3600000;
const sessions = new Map(); // token 雜湊 → 到期時間（伺服器重開就要重新登入）
const fails = new Map(); // IP → { n, until }
const sha = (s) => createHash("sha256").update(String(s)).digest();
const hex = (s) => sha(s).toString("hex");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const RESCUE = process.env.ADMIN_PASSWORD_RESCUE === "1";
const adminCount = () => dbh().prepare("SELECT COUNT(*) n FROM users WHERE is_admin=1").get().n;
export const passwordAllowed = () => !!PASSWORD && (getSetting("admin_password_disabled") !== "1" || RESCUE);
if (RESCUE) console.warn("[管理] ADMIN_PASSWORD_RESCUE=1：暫時允許密碼登入管理頁，處理完請拿掉。");

function cookieOf(req, name) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}
const isHttps = (req) => String(req.headers["x-forwarded-proto"] || "").includes("https") || String(req.headers["cf-visitor"] || "").includes("https");
const adminCookie = (req, v, age) => `mt_admin=${v}; Path=/admin; Max-Age=${age}; HttpOnly; SameSite=Strict${isHttps(req) ? "; Secure" : ""}`;
/** 目前是誰在用管理頁：{ kind: "google", user } 或 { kind: "password" } 或 null */
function who(req) {
  const u = currentUser(req);
  if (u && u.is_admin) return { kind: "google", user: u };
  const t = cookieOf(req, "mt_admin");
  if (t && passwordAllowed()) {
    const exp = sessions.get(hex(t));
    if (exp && exp > Date.now()) return { kind: "password" };
    sessions.delete(hex(t));
  }
  return null;
}
function sameOrigin(req) {
  const o = String(req.headers.origin || "");
  if (!o) return false;
  try { return new URL(o).host === String(req.headers.host || ""); } catch { return false; }
}
function readForm(req, limit = 8192) {
  return new Promise((resolve) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { req.removeAllListeners("data"); resolve(null); } else chunks.push(c); });
    req.on("end", () => resolve(new URLSearchParams(Buffer.concat(chunks).toString("utf8"))));
    req.on("error", () => resolve(null));
  });
}
const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
function page(res, title, body, status = 200, headers = {}) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Robots-Tag": "noindex", ...headers }); // same-origin：表單送出時瀏覽器才會帶正確的 Origin（no-referrer 會變成 null）
  res.end(`<!DOCTYPE html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
body{font:15px/1.55 system-ui,"Noto Sans TC",sans-serif;margin:0;color:#2a1d14;background:#fffaf2}
header{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;padding:12px max(4vw,12px);background:#2a1d14;color:#fff}
header b{font-size:18px}header nav{display:flex;flex-wrap:wrap;gap:4px}header a{color:#ffd9b0;text-decoration:none;padding:6px 10px;border-radius:8px}
header a[aria-current]{background:#d9741a;color:#fff}header form{margin-left:auto}
main{padding:16px max(4vw,12px) 48px;max-width:1200px}h1{margin:8px 0 4px;font-size:26px}h2{margin:28px 0 8px;font-size:19px}
table{border-collapse:collapse;width:100%;background:#fff;font-size:14px}th,td{border-bottom:1px solid #ecdcc8;padding:5px 8px;text-align:left;white-space:nowrap}th{background:#f6ead9}
.wrap{overflow-x:auto}.k{display:flex;flex-wrap:wrap;gap:10px}.k div{background:#fff;border:2px solid #ecdcc8;border-radius:10px;padding:6px 12px}.k b{display:block;font-size:24px}
p.n,.n{color:#8a735f;font-size:13px}a{color:#c0641a}
.card{background:#fff;border:2px solid #ecdcc8;border-radius:14px;padding:16px 20px;margin:14px 0;max-width:820px}
label{display:block;font-weight:700;margin:14px 0 4px}input[type=text],input[type=password],input[type=url]{font:inherit;font-size:16px;width:100%;max-width:640px;box-sizing:border-box;min-height:42px;padding:0 10px;border:2px solid #ecdcc8;border-radius:10px}
input:focus-visible,button:focus-visible{outline:3px solid #d9741a;outline-offset:1px}
button{font:inherit;font-weight:700;min-height:42px;padding:0 16px;border-radius:10px;border:2px solid #d9741a;background:#d9741a;color:#fff;cursor:pointer}
button.sec,a.btnlink{background:#fff;color:#d9741a}button.small{min-height:32px;padding:0 10px;font-size:13px}button.warn{background:#c0392b;border-color:#c0392b}form.inl{display:inline-flex;gap:4px;align-items:center;margin:2px 0}
input.rsn{font:inherit;font-size:13px;min-height:32px;width:9em;padding:0 6px;border:2px solid #ecdcc8;border-radius:8px}tr.bn td{background:#fdf0ee}td:last-child{white-space:normal;min-width:15em}.who{color:#ffd9b0;font-size:13px}a.btnlink{font-weight:700;min-height:42px;padding:0 16px;border-radius:10px;border:2px solid #d9741a;display:inline-flex;align-items:center;text-decoration:none}header button{min-height:34px;background:none;border-color:#ffd9b0;color:#ffd9b0}
.ok{color:#2d7a1f;font-weight:700}.no{color:#c0392b;font-weight:700}.msg{padding:10px 14px;border-radius:10px;background:#e3f4dc;margin:10px 0;max-width:820px}.msg.err{background:#fde2df}
code{background:#f6ead9;border-radius:4px;padding:1px 5px;font-size:14px;word-break:break-all}ol li{margin:6px 0}.row{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
</style></head><body>${body}</body></html>`);
}
function shell(res, cur, inner, msg, me) {
  const tabs = [["/admin", "統計"], ["/admin/scores", "排行榜與分享"], ["/admin/users", "帳號與管理員"], ["/admin/google", "Google 登入"], ["/admin/data", "資料"]];
  page(res, "喵打管理", `<header><b>喵打管理</b><nav>${tabs.map(([h, t]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
<form method="post" action="/admin/logout"><span class="who">${me?.kind === "google" ? esc(me.user.email || me.user.nick || "管理員") : "密碼登入"}</span> <button type="submit">登出</button></form></header>
<!--email_off--><main>${msg ? `<div class="msg${msg.err ? " err" : ""}" role="status">${esc(msg.text)}</div>` : ""}${inner}</main><!--/email_off-->`);
  // email_off：Cloudflare 的「電子郵件位址混淆」會把 email 換成 [email protected]，靠一段 JS 還原；管理頁的 CSP 不讓那段 JS 跑，所以請它跳過這裡
}
const redirect = (res, to, headers = {}) => { res.writeHead(303, { Location: to, "Cache-Control": "no-store", ...headers }); res.end(); };
const MSGS = { saved: "已儲存，馬上生效。", cleared: "已清除 Google 登入設定，登入按鈕會隱藏。", bad: "格式不對，沒有儲存。", origin: "請從管理頁送出（來源不對）。",
  granted: "已設為管理員。", revoked: "已取消管理員。", last: "至少要留一位管理員（密碼登入停用時）。", pwoff: "已停用密碼登入，之後只能用管理員的 Google 帳號登入管理頁。",
  pwon: "已重新啟用密碼登入。", banned: "已停權：這個帳號的排行榜成績和分享連結都不再顯示，也不能再上榜、分享或改暱稱。", unbanned: "已恢復，成績和分享會重新顯示。",
  hidden: "已標記暱稱不雅：成績保留、名次不變，暱稱改顯示「" + HIDDEN_NAME + "」。", unhidden: "已取消標記，暱稱重新顯示。",
  approved: "已放行：這筆成績會出現在排行榜。", unapproved: "已取消放行：這筆成績不再出現在排行榜。",
  banadmin: "管理員不能停權，請先取消管理員。", needgoogle: "要先用管理員的 Google 帳號登入管理頁，才能停用密碼登入（避免把自己鎖在外面）。", nopw: "伺服器沒有設定管理密碼，不能啟用密碼登入。" };
const ERRS = ["bad", "origin", "last", "needgoogle", "nopw", "banadmin"];

/** /admin 底下的請求；回傳 true 表示處理了 */
export async function handleAdmin(req, res, url) {
  const p = url.pathname;
  if (!(p === "/admin" || p.startsWith("/admin/"))) return false;
  if (!PASSWORD && !adminCount()) { page(res, "喵打管理", `<main><h1>管理頁未開放</h1><p>請在伺服器的 .env 設定 <code>ADMIN_PASSWORD</code>（或 <code>STATS_PASSWORD</code>）後重新部署。</p></main>`, 404); return true; }
  const ip = String(req.headers["cf-connecting-ip"] || req.socket.remoteAddress || "");

  if (p === "/admin/login" && req.method === "POST") {
    if (!passwordAllowed()) { page(res, "喵打管理", loginForm(req, "密碼登入已停用，請用管理員的 Google 帳號登入。"), 403); return true; }
    const f = fails.get(ip);
    if (f && f.until > Date.now()) { page(res, "喵打管理", loginForm(req, "密碼錯太多次，請 10 分鐘後再試。"), 429); return true; }
    if (!sameOrigin(req)) { page(res, "喵打管理", loginForm(req, "請從登入頁送出。"), 403); return true; }
    const form = await readForm(req);
    const pass = form?.get("password") || "";
    if (!timingSafeEqual(sha(pass), sha(PASSWORD))) {
      const n = (f?.n || 0) + 1;
      fails.set(ip, { n, until: n >= 8 ? Date.now() + 10 * 60000 : 0 });
      page(res, "喵打管理", loginForm(req, "密碼不對。"), 401); return true;
    }
    fails.delete(ip);
    const tok = randomBytes(32).toString("base64url");
    sessions.set(hex(tok), Date.now() + SESSION_MS);
    redirect(res, "/admin", { "Set-Cookie": adminCookie(req, tok, SESSION_MS / 1000) }); return true;
  }
  const me = who(req);
  if (!me) {
    if (req.method !== "GET") { res.writeHead(401); res.end(); return true; }
    page(res, "喵打管理", loginForm(req), 200); return true;
  }
  if (req.method === "POST") {
    if (!sameOrigin(req)) { redirect(res, "/admin?m=origin"); return true; }
    if (p === "/admin/logout") {
      sessions.delete(hex(cookieOf(req, "mt_admin")));
      const clear = [adminCookie(req, "", 0)];
      if (me.kind === "google") clear.push(endSession(req)); // 用 Google 登入的管理員：連喵打的登入一起登出
      redirect(res, "/admin", { "Set-Cookie": clear }); return true;
    }
    if (p === "/admin/users") {
      const f = await readForm(req);
      const id = Number(f?.get("id")), act = f?.get("action");
      const u = Number.isInteger(id) && dbh().prepare("SELECT id, is_admin, email FROM users WHERE id=?").get(id);
      if (!u || !["grant", "revoke", "ban", "unban"].includes(act)) { redirect(res, "/admin/users?m=bad"); return true; }
      if (act === "ban") {
        if (u.is_admin) { redirect(res, "/admin/users?m=banadmin"); return true; }
        const reason = String(f.get("reason") || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 100);
        dbh().prepare("UPDATE users SET banned=1, banned_at=?, ban_reason=? WHERE id=?").run(Date.now(), reason || null, id);
        console.warn(`[管理] 停權：使用者 #${id}`); redirect(res, "/admin/users?m=banned"); return true;
      }
      if (act === "unban") {
        dbh().prepare("UPDATE users SET banned=0, banned_at=NULL, ban_reason=NULL WHERE id=?").run(id);
        console.warn(`[管理] 恢復：使用者 #${id}`); redirect(res, "/admin/users?m=unbanned"); return true;
      }
      if (act === "revoke" && u.is_admin && adminCount() <= 1 && !passwordAllowed()) { redirect(res, "/admin/users?m=last"); return true; }
      dbh().prepare("UPDATE users SET is_admin=? WHERE id=?").run(act === "grant" ? 1 : 0, id);
      console.warn(`[管理] ${act === "grant" ? "設為" : "取消"}管理員：使用者 #${id}`);
      redirect(res, act === "revoke" && me.kind === "google" && me.user.id === id ? "/admin" : `/admin/users?m=${act === "grant" ? "granted" : "revoked"}`); return true;
    }
    if (p === "/admin/scores") {
      const f = await readForm(req);
      const kind = f?.get("kind") === "share" ? "share" : "score", act = f?.get("action"), all = f?.get("all") === "1";
      const back = ["flag", "hidden", "approved"].includes(f?.get("f")) ? `&f=${f.get("f")}` : "";
      const table = kind === "share" ? "shares" : "scores";
      const id = kind === "share" ? String(f?.get("id") || "") : Number(f?.get("id"));
      const r = id !== "" && dbh().prepare(`SELECT id, cid, user_id, ${kind === "share" ? "'' AS flag" : "flag"} FROM ${table} WHERE id=?`).get(id);
      const ok = r && (["hide", "unhide"].includes(act) || (kind === "score" && ["approve", "unapprove"].includes(act) && r.flag));
      if (!ok) { redirect(res, "/admin/scores?m=bad" + back); return true; }
      if (act === "hide" || act === "unhide") {
        const v = act === "hide" ? 1 : 0;
        if (all) {
          // 同一個人：有登入看帳號，沒登入看瀏覽器代號（cid）；成績和分享一起
          const [col, key] = r.user_id != null ? ["user_id", r.user_id] : ["cid", r.cid];
          for (const t of ["scores", "shares"]) dbh().prepare(`UPDATE ${t} SET name_hidden=? WHERE ${col}=?`).run(v, key);
        } else dbh().prepare(`UPDATE ${table} SET name_hidden=? WHERE id=?`).run(v, id);
        console.warn(`[管理] ${v ? "標記暱稱不雅" : "取消標記"}：${kind === "share" ? "分享" : "成績"} ${id}${all ? "（同一人全部）" : ""}`);
        redirect(res, `/admin/scores?m=${act === "hide" ? "hidden" : "unhidden"}${back}`); return true;
      }
      dbh().prepare("UPDATE scores SET approved=? WHERE id=?").run(act === "approve" ? 1 : 0, id);
      console.warn(`[管理] ${act === "approve" ? "放行" : "取消放行"}可疑成績 #${id}`);
      redirect(res, `/admin/scores?m=${act === "approve" ? "approved" : "unapproved"}${back}`); return true;
    }
    if (p === "/admin/security") {
      const f = await readForm(req), act = f?.get("action");
      if (act === "disable_password") {
        if (me.kind !== "google" || !adminCount()) { redirect(res, "/admin/users?m=needgoogle"); return true; }
        setSetting("admin_password_disabled", "1"); sessions.clear();
        console.warn("[管理] 停用密碼登入"); redirect(res, "/admin/users?m=pwoff"); return true;
      }
      if (act === "enable_password") {
        if (!PASSWORD) { redirect(res, "/admin/users?m=nopw"); return true; }
        setSetting("admin_password_disabled", ""); console.warn("[管理] 重新啟用密碼登入"); redirect(res, "/admin/users?m=pwon"); return true;
      }
      redirect(res, "/admin/users?m=bad"); return true;
    }
    if (p === "/admin/google") {
      const f = await readForm(req);
      if (!f) { redirect(res, "/admin/google?m=bad"); return true; }
      if (f.get("action") === "clear") {
        for (const k of ["google_client_id", "google_client_secret", "public_url"]) setSetting(k, "");
        console.warn("[管理] 清除 Google 登入設定");
        redirect(res, "/admin/google?m=cleared"); return true;
      }
      const id = String(f.get("client_id") || "").trim(), secret = String(f.get("client_secret") || "").trim(), pub = String(f.get("public_url") || "").trim().replace(/\/+$/, "");
      if (id && !/^[0-9A-Za-z._-]{10,200}\.apps\.googleusercontent\.com$/.test(id)) { redirect(res, "/admin/google?m=bad"); return true; }
      if (secret && !/^[0-9A-Za-z_-]{10,200}$/.test(secret)) { redirect(res, "/admin/google?m=bad"); return true; }
      if (pub && !/^https?:\/\/[0-9A-Za-z.-]+(:\d+)?$/.test(pub)) { redirect(res, "/admin/google?m=bad"); return true; }
      if (id) setSetting("google_client_id", id);
      if (secret) setSetting("google_client_secret", secret); // 空白＝不改
      if (pub) setSetting("public_url", pub);
      console.warn("[管理] 更新 Google 登入設定"); // 不印出密鑰
      redirect(res, "/admin/google?m=saved"); return true;
    }
    res.writeHead(404); res.end(); return true;
  }
  const m = MSGS[url.searchParams.get("m")];
  const msg = m ? { text: m, err: ERRS.includes(url.searchParams.get("m")) } : null;
  if (p === "/admin") { shell(res, "/admin", `<h1>統計</h1>${renderStatsBody()}`, msg, me); return true; }
  if (p === "/admin/scores") { shell(res, "/admin/scores", scoresPage(url), msg, me); return true; }
  if (p === "/admin/users") { shell(res, "/admin/users", usersPage(me), msg, me); return true; }
  if (p === "/admin/google") { shell(res, "/admin/google", googlePage(req), msg, me); return true; }
  if (p === "/admin/data") { shell(res, "/admin/data", dataPage(), msg, me); return true; }
  if (p === "/admin/export.json") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="meow-type-stats-${new Date().toISOString().slice(0, 10)}.json"` });
    res.end(JSON.stringify(exportAll())); return true;
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("找不到這個頁面"); return true;
}

function loginForm(req, err) {
  const u = currentUser(req);
  const g = googleReady() ? `<div class="card"><p>${u ? `你目前用 <b>${esc(u.email || u.nick || "Google 帳號")}</b> 登入喵打，但這個帳號不是管理員。` : "用被設為管理員的 Google 帳號登入。"}</p>
<div class="row"><a class="btnlink" href="/auth/google?back=/admin">用 Google 帳號登入</a></div></div>` : "";
  const pw = passwordAllowed() ? `<form method="post" action="/admin/login" class="card"><label for="pw">管理密碼</label><input id="pw" type="password" name="password" autocomplete="current-password" required${g ? "" : " autofocus"}>
<div class="row"><button type="submit">用密碼登入</button></div></form>` : `<p class="n">密碼登入已停用。</p>`;
  return `<main style="max-width:460px;margin:10vh auto"><h1>喵打管理</h1>${err ? `<div class="msg err" role="alert">${esc(err)}</div>` : ""}${g}${pw}</main>`;
}

const tw = (ts) => (ts ? new Date(ts + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ") : "—");
const pct = (x) => (x == null ? "—" : Math.round(x * 100) + "%");

function scoresPage(url) {
  const f = url.searchParams.get("f") || "";
  const where = { flag: "s.flag<>''", hidden: "s.name_hidden=1", approved: "s.approved=1" }[f] || "1";
  const db = dbh();
  const scores = db.prepare(`SELECT s.*, u.nick AS unick, u.banned AS ubanned FROM scores s LEFT JOIN users u ON u.id = s.user_id
    WHERE ${where} ORDER BY s.id DESC LIMIT 200`).all();
  const shares = f ? [] : db.prepare(`SELECT h.*, u.nick AS unick, u.banned AS ubanned FROM shares h LEFT JOIN users u ON u.id = h.user_id ORDER BY h.ts DESC LIMIT 100`).all();
  const cnt = db.prepare("SELECT SUM(flag<>'') fl, SUM(flag<>'' AND approved=0) wait, SUM(name_hidden) hid, SUM(approved) ap FROM scores").get();
  const back = f ? `<input type="hidden" name="f" value="${esc(f)}">` : "";
  const form = (kind, id, act, label, cls = "", extra = "") => `<form method="post" action="/admin/scores" class="inl"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="action" value="${act}">${back}${extra}<button type="submit" class="small ${cls}">${label}</button></form>`;
  const allBox = (kind, r) => `<label class="n"><input type="checkbox" name="all" value="1"> 同一人全部${r.user_id != null ? "（這個帳號）" : "（同一台瀏覽器）"}</label> `;
  const nameCell = (r) => `${esc(r.user_id != null && r.unick ? r.unick : r.name)}${r.user_id != null ? ' <span class="n">（登入' + (r.ubanned ? "・停權" : "") + "）</span>" : ' <span class="n">（沒登入）</span>'}${r.name_hidden ? '<br><span class="no">已標記不雅</span>' : ""}`;
  const hideBtn = (kind, r) => (r.name_hidden ? form(kind, r.id, "unhide", "取消標記", "sec") : form(kind, r.id, "hide", "標記暱稱不雅", "warn", allBox(kind, r)));
  const status = (r) => (!r.flag ? '<span class="ok">上榜</span>'
    : `${r.approved ? '<span class="ok">已放行</span>' : '<span class="no">可疑・沒上榜</span>'}<br><span class="n">${r.flag.split(",").map((x) => FLAG[x] || esc(x)).join("、")}</span>`);
  const apBtn = (r) => (!r.flag ? "" : r.approved ? form("score", r.id, "unapprove", "取消放行", "sec") : form("score", r.id, "approve", "放行"));
  const what = (r) => `${CAT_NAME[r.cat] || esc(r.cat)}・${LEN_NAME[r.len] || esc(r.len)}・${r.mode === "t60" ? "1 分鐘" : "打完一題"}`;
  const speed = (r) => `${Math.round(r.speed * 10) / 10} ${r.cat === "zh" ? "字/分" : "WPM"}`;
  const tabs = [["", "全部"], ["flag", `可疑（${cnt.fl || 0}，待處理 ${cnt.wait || 0}）`], ["hidden", `已標記不雅（${cnt.hid || 0}）`], ["approved", `已放行（${cnt.ap || 0}）`]];
  return `<h1>排行榜與分享</h1>
<p>暱稱不雅：按「標記暱稱不雅」，成績<b>不會刪除</b>、名次不變，只是排行榜和分享頁的暱稱改顯示「${HIDDEN_NAME}」。勾「同一人全部」會把這個人所有的成績和分享一起標記。有登入的人，也可以到<a href="/admin/users">帳號與管理員</a>停權（暱稱不雅是停權的理由，暱稱欄位旁邊都有寫）。</p>
<p>可疑成績：送出時伺服器會重播按鍵紀錄驗算；太快、按鍵間隔太短、節奏太規律、一次湧進很多字、或前端成績和驗算不同，就標成可疑。可疑成績<b>會保留</b>，但不上排行榜、不能分享。你看過覺得沒問題，可以按「放行」讓它上榜。</p>
<p class="row">${tabs.map(([k, t]) => `<a href="/admin/scores${k ? "?f=" + k : ""}"${k === f ? ' aria-current="page"' : ""} class="btnlink${k === f ? "" : " sec"}">${t}</a>`).join(" ")}</p>
<h2>排行榜成績</h2>
<div class="wrap"><table><thead><tr><th>#</th><th>時間</th><th>暱稱</th><th>題目</th><th>規則</th><th>速度</th><th>正確率</th><th>狀態</th><th></th></tr></thead><tbody>
${scores.map((r) => `<tr><td>${r.id}</td><td>${tw(r.ts)}</td><td>${nameCell(r)}</td><td>${what(r)}</td><td>${RULE[r.rule] || esc(r.rule)}</td><td>${speed(r)}</td><td>${pct(r.acc)}</td><td>${status(r)}</td><td>${hideBtn("score", r)} ${apBtn(r)}</td></tr>`).join("")
  || '<tr><td colspan="9">沒有成績。</td></tr>'}</tbody></table></div>
<p class="n">最多列最近 200 筆。</p>
${f ? "" : `<h2>分享連結</h2>
<div class="wrap"><table><thead><tr><th>連結</th><th>時間</th><th>暱稱</th><th>題目</th><th>速度</th><th>被打開</th><th>接受挑戰</th><th></th></tr></thead><tbody>
${shares.map((r) => `<tr><td><a href="/c/${esc(r.id)}" target="_blank" rel="noopener">${esc(r.id)}</a></td><td>${tw(r.ts)}</td><td>${nameCell(r)}</td><td>${what(r)}</td><td>${speed(r)}</td><td>${r.views}</td><td>${r.accepts}</td><td>${hideBtn("share", r)}</td></tr>`).join("")
  || '<tr><td colspan="8">還沒有分享。</td></tr>'}</tbody></table></div><p class="n">最多列最近 100 筆。</p>`}`;
}

function usersPage(me) {
  const users = dbh().prepare(`SELECT u.id, u.email, u.nick, u.nick_set_at, u.created, u.last_login, u.is_admin, u.banned, u.banned_at, u.ban_reason,
      (SELECT COUNT(*) FROM runs r WHERE r.user_id=u.id AND r.finished=1) runs,
      (SELECT COUNT(*) FROM scores s WHERE s.user_id=u.id) scores,
      (SELECT COUNT(*) FROM shares h WHERE h.user_id=u.id) shares
    FROM users u ORDER BY u.is_admin DESC, u.banned DESC, u.last_login DESC LIMIT 1000`).all();
  const admins = users.filter((u) => u.is_admin).length, pwOn = passwordAllowed();
  const form = (u, act, label, cls = "", extra = "") => `<form method="post" action="/admin/users" class="inl"><input type="hidden" name="id" value="${u.id}"><input type="hidden" name="action" value="${act}">${extra}<button type="submit" class="small ${cls}">${label}</button></form>`;
  const btn = (u) => (u.is_admin ? form(u, "revoke", "取消管理員", "sec") : u.banned ? form(u, "unban", "恢復", "sec")
    : form(u, "grant", "設為管理員") + " " + form(u, "ban", "停權", "warn", `<input type="text" name="reason" placeholder="原因（選填）" maxlength="100" class="rsn" aria-label="停權原因">`));
  const status = (u) => (u.is_admin ? '<span class="ok">管理員</span>' : u.banned ? `<span class="no">停權</span><br><span class="n">${tw(u.banned_at)}${u.ban_reason ? "・" + esc(u.ban_reason) : ""}</span>` : "正常");
  return `<h1>帳號與管理員</h1>
<p>用 Google 登入過喵打的帳號都會出現在這裡。被設為管理員的帳號，登入喵打後打開 <code>/admin</code> 就能直接進管理頁。要設定自己：先在<a href="/" target="_blank" rel="noopener">喵打首頁</a>用 Google 登入一次，回到這頁就會看到你的帳號。</p>
<div class="wrap"><table><thead><tr><th>#</th><th>電子郵件</th><th>暱稱</th><th>暱稱上次修改</th><th>第一次登入</th><th>最近登入</th><th>練完</th><th>排行榜</th><th>分享</th><th>狀態</th><th></th></tr></thead><tbody>
${users.map((u) => `<tr${u.banned ? ' class="bn"' : ""}><td>${u.id}</td><td>${esc(u.email || "（沒有提供）")}${me.kind === "google" && me.user.id === u.id ? "（你）" : ""}</td><td>${esc(u.nick || "（還沒設定）")}</td><td>${u.nick_set_at ? tw(u.nick_set_at) : "—"}</td><td>${tw(u.created)}</td><td>${tw(u.last_login)}</td><td>${u.runs}</td><td>${u.scores}</td><td>${u.shares}</td><td>${status(u)}</td><td>${btn(u)}</td></tr>`).join("")
  || '<tr><td colspan="11">還沒有人用 Google 登入過。</td></tr>'}</tbody></table></div>
<p class="n">共 ${users.length} 個帳號、${admins} 位管理員、${users.filter((u) => u.banned).length} 個停權。電子郵件只有管理頁看得到，排行榜和分享只顯示暱稱。</p>
<p class="n">停權：這個帳號的排行榜成績和分享連結都不再顯示，也不能再上榜、分享或改暱稱（還是可以練習）；恢復後成績會重新出現。暱稱第一次設定後可以改，但每改一次，7 天內不能再改。沒登入的人沒有帳號可以停權。</p>
<h2>密碼登入</h2>
<div class="card"><p>目前：${pwOn ? '<span class="no">開啟</span>（用 <code>ADMIN_PASSWORD</code> / <code>STATS_PASSWORD</code> 就能進管理頁）' : '<span class="ok">已停用</span>（只能用管理員的 Google 帳號登入）'}${RESCUE ? "　⚠ 伺服器設了 ADMIN_PASSWORD_RESCUE=1，暫時允許密碼登入，處理完請拿掉。" : ""}</p>
${pwOn ? (me.kind === "google" && admins ? `<p>密碼只要外洩，任何人都能進管理頁；停用後只認管理員的 Google 帳號（有 Google 的兩步驟驗證保護）。</p>
<form method="post" action="/admin/security"><input type="hidden" name="action" value="disable_password"><button type="submit">停用密碼登入</button></form>`
    : `<p class="n">要停用密碼登入：先把你的 Google 帳號設為管理員，登出管理頁，再用 Google 帳號登入，回到這頁就能停用（避免把自己鎖在外面）。</p>`)
  : `<form method="post" action="/admin/security"><input type="hidden" name="action" value="enable_password"><button type="submit" class="sec">重新啟用密碼登入</button></form>
<p class="n">萬一 Google 登入壞掉進不來：在伺服器的 .env 加 <code>ADMIN_PASSWORD_RESCUE=1</code> 重新部署，就能暫時用密碼登入；處理完記得拿掉。</p>`}</div>`;
}

function googlePage(req) {
  const c = oauthConfig();
  const fromDb = { id: !!getSetting("google_client_id"), secret: !!getSetting("google_client_secret"), url: !!getSetting("public_url") };
  const guessUrl = c.url || `https://${String(req.headers.host || "meow-type.otlab.org")}`;
  const redirectUri = `${guessUrl}/auth/google/callback`;
  const users = dbh().prepare("SELECT COUNT(*) n, MAX(last_login) last FROM users").get();
  const src = (k) => (fromDb[k] ? "管理頁" : "環境變數");
  return `<h1>Google 登入</h1>
<p>狀態：${googleReady() ? '<span class="ok">已開啟</span>（網頁右上角有「用 Google 登入」）' : '<span class="no">未開啟</span>（用戶端 ID、密鑰、網址三個都設定才會開啟）'}
　已登入過的帳號：${users.n} 個${users.last ? `，最近一次 ${new Date(users.last + 8 * 3600000).toISOString().slice(5, 16).replace("T", " ")}` : ""}</p>
<form method="post" action="/admin/google" class="card">
  <label for="cid">用戶端 ID</label><input id="cid" type="text" name="client_id" value="${esc(c.id)}" placeholder="xxxx.apps.googleusercontent.com" autocomplete="off" spellcheck="false">
  ${c.id ? `<p class="n">目前來自：${src("id")}</p>` : ""}
  <label for="csec">用戶端密鑰</label><input id="csec" type="password" name="client_secret" value="" placeholder="${c.secret ? `已設定（結尾 ${esc(c.secret.slice(-4))}），留空就不改` : "GOCSPX-…"}" autocomplete="new-password" spellcheck="false">
  ${c.secret ? `<p class="n">目前來自：${src("secret")}。為了安全，密鑰設定後不會再顯示。</p>` : ""}
  <label for="purl">網站網址</label><input id="purl" type="url" name="public_url" value="${esc(c.url || guessUrl)}" autocomplete="off">
  <p class="n">已授權的重新導向 URI 要填：<code>${esc(redirectUri)}</code></p>
  <div class="row"><button type="submit">儲存</button>${googleReady() ? '<a class="btnlink" href="/auth/google?back=/" target="_blank" rel="noopener">開新分頁測試登入</a>' : ""}</div>
</form>
<form method="post" action="/admin/google" class="card"><input type="hidden" name="action" value="clear">
  <p>清除管理頁的設定（環境變數有設定的話會改用環境變數）。</p><div class="row"><button type="submit" class="sec">清除 Google 登入設定</button></div></form>
<div class="card"><h2 style="margin-top:0">怎麼取得用戶端 ID 和密鑰</h2><ol>
  <li>打開 <a href="https://console.cloud.google.com/auth/overview" target="_blank" rel="noopener">Google Cloud Console → Google Auth Platform</a>（第一次會請你建立或選一個專案）。</li>
  <li>「品牌」：應用程式名稱填「喵打」，使用者支援電子郵件選你的信箱。</li>
  <li>「目標對象」：使用者類型選<b>外部</b>，發布狀態按「發布應用程式」改成<b>正式版</b>。只用 openid、email，不需要送 Google 審查。</li>
  <li>「用戶端」→「建立用戶端」：應用程式類型選<b>網頁應用程式</b>，「已授權的重新導向 URI」新增 <code>${esc(redirectUri)}</code>。</li>
  <li>建立後把「用戶端 ID」和「用戶端密鑰」貼到上面，按儲存，馬上生效，不用重新部署。</li>
  <li>用戶端如果建在<b>個人帳號</b>底下：學校帳號未滿 18 歲的學生會被擋，要到學校的 Google 管理控制台（安全性 → 存取權與資料控管 → API 控制項）把這個用戶端 ID 設成信任。建在學校的 Google Cloud 機構底下就不用。</li>
</ol></div>`;
}

function dataPage() {
  return `<h1>資料</h1><div class="card"><p><a href="/admin/export.json">下載全部原始資料（JSON）</a></p>
<p class="n">包含造訪、每局練習、排行榜、學一下、分享挑戰。不包含 Google 帳號編號、email、管理設定。</p>
<p class="n">要刪除統計資料：在伺服器執行 <code>./scripts/stats-reset.sh</code>（會先備份）。</p></div>`;
}
