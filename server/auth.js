// Google 登入（選填）：伺服器端 OAuth（authorization code），不用載入 Google 的 JavaScript。
// 流程：/auth/google（彈出視窗）→ Google 選帳號 → /auth/google/callback → 存 session cookie → 通知原視窗、關掉彈出視窗
// 只拿 openid、email 兩個範圍；資料庫存 Google 帳號編號（sub）與 email，不存姓名。
// 每個喵系列專案各自登入，但都用 Google 的 sub 當使用者編號，以後要串起來對得上。
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { dbh } from "./stats.js";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const PUBLIC_URL = String(process.env.PUBLIC_URL || "").replace(/\/+$/, "");
// 測試用：AUTH_FAKE=1 而且不是正式環境時，開放 /auth/fake 直接登入（Docker 映像檔設 NODE_ENV=production，所以正式機一定關閉）
const FAKE = process.env.AUTH_FAKE === "1" && process.env.NODE_ENV !== "production";
const SESSION_DAYS = 180;
const SECURE = PUBLIC_URL.startsWith("https://");

export const loginEnabled = () => FAKE || !!(CLIENT_ID && CLIENT_SECRET && PUBLIC_URL);
if (!loginEnabled()) console.warn("[登入] 沒有設定 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / PUBLIC_URL，Google 登入不會出現。");

const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("="); if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const cookie = (name, value, maxAge, path = "/") =>
  `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${SECURE ? "; Secure" : ""}`;

/** 目前登入的人：{ id, email, nick } 或 null */
export function currentUser(req) {
  const tok = cookies(req).mt_sess;
  if (!tok || tok.length > 100) return null;
  return dbh().prepare(`SELECT u.id, u.email, u.nick FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.hash=? AND s.expires>?`).get(sha(tok), Date.now()) || null;
}

function login(res, { sub, email }) {
  const db = dbh(), now = Date.now();
  db.prepare(`INSERT INTO users (sub, email, created, last_login) VALUES (?,?,?,?)
    ON CONFLICT(sub) DO UPDATE SET email=excluded.email, last_login=excluded.last_login`).run(sub, email || null, now, now);
  const user = db.prepare("SELECT id FROM users WHERE sub=?").get(sub);
  const tok = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (hash, user_id, created, expires) VALUES (?,?,?,?)").run(sha(tok), user.id, now, now + SESSION_DAYS * 86400000);
  db.prepare("DELETE FROM sessions WHERE expires<?").run(now);
  return cookie("mt_sess", tok, SESSION_DAYS * 86400);
}

/** 登入完成的小頁面：通知原視窗後關閉；不是彈出視窗就回到原本的頁面 */
function donePage(res, ok, msg, back, setCookies = []) {
  const e = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": setCookies,
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
  });
  res.end(`<!DOCTYPE html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>喵打登入</title></head>
<body data-ok="${ok ? 1 : 0}" data-back="${e(back)}" style="font:17px/1.6 system-ui,sans-serif;padding:24px;color:#2a1d14;background:#fffaf2">
<p>${e(msg)}</p><p><a href="${e(back)}">回到喵打</a></p><script src="/auth-done.js"></script></body></html>`);
}
const safeBack = (p) => (typeof p === "string" && /^\/[A-Za-z0-9/_-]{0,40}$/.test(p) ? p : "/");

/** /auth/* 的處理；不是登入相關的網址回傳 false */
export async function handleAuth(req, res, url) {
  if (url.pathname === "/auth/google") {
    if (!loginEnabled() || FAKE && !CLIENT_ID) { donePage(res, false, "Google 登入還沒開放。", "/"); return true; }
    const state = randomBytes(18).toString("base64url"), back = safeBack(url.searchParams.get("back"));
    const q = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: `${PUBLIC_URL}/auth/google/callback`, response_type: "code",
      scope: "openid email", state, prompt: "select_account" });
    res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${q}`, "Cache-Control": "no-store",
      "Set-Cookie": [cookie("mt_state", `${state}.${back}`, 600, "/auth")] });
    res.end(); return true;
  }
  if (url.pathname === "/auth/google/callback") {
    const [state, back = "/"] = String(cookies(req).mt_state || "").split(".");
    const clear = cookie("mt_state", "", 0, "/auth");
    const got = String(url.searchParams.get("state") || "");
    if (!state || got.length !== state.length || !timingSafeEqual(Buffer.from(got), Buffer.from(state))) { donePage(res, false, "登入逾時或連結不對，請再試一次。", "/", [clear]); return true; }
    if (url.searchParams.get("error")) { donePage(res, false, "沒有登入（你取消了，或學校帳號還不能使用這個網站）。", safeBack(back), [clear]); return true; }
    try {
      const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code: String(url.searchParams.get("code") || ""), client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
          redirect_uri: `${PUBLIC_URL}/auth/google/callback`, grant_type: "authorization_code" }), signal: AbortSignal.timeout(10000) });
      const tok = await r.json();
      if (!r.ok || !tok.id_token) throw new Error(tok.error || `HTTP ${r.status}`);
      // id_token 是直接從 Google 的 token 端點（HTTPS）拿到的，依 Google 文件可以不再驗簽章；仍檢查發給誰、誰發的、有沒有過期
      const claims = JSON.parse(Buffer.from(tok.id_token.split(".")[1], "base64url").toString("utf8"));
      if (claims.aud !== CLIENT_ID || !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss) || claims.exp * 1000 < Date.now() || !claims.sub)
        throw new Error("id_token 內容不對");
      donePage(res, true, "登入成功！這個視窗會自動關閉。", safeBack(back), [clear, login(res, { sub: String(claims.sub), email: claims.email_verified ? claims.email : null })]);
    } catch (e) {
      console.warn(`[登入] 失敗：${e.message}`);
      donePage(res, false, "登入失敗，請再試一次。", safeBack(back), [clear]);
    }
    return true;
  }
  if (url.pathname === "/auth/fake" && FAKE) {
    const sub = String(url.searchParams.get("sub") || "test-user").slice(0, 60);
    donePage(res, true, "測試登入成功", "/", [login(res, { sub, email: url.searchParams.get("email") || `${sub}@example.com` })]);
    return true;
  }
  return false;
}

export function logout(req, res) {
  const tok = cookies(req).mt_sess;
  if (tok) dbh().prepare("DELETE FROM sessions WHERE hash=?").run(sha(tok));
  res.writeHead(204, { "Set-Cookie": cookie("mt_sess", "", 0), "Cache-Control": "no-store" }); res.end();
}

export function setNick(userId, nick) { dbh().prepare("UPDATE users SET nick=? WHERE id=?").run(nick, userId); }
