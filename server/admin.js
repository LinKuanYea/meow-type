// 管理頁 /admin：統計、Google 登入設定、資料匯出。以後管理相關的都放這裡。
// 登入：密碼（ADMIN_PASSWORD，沒設定就用 STATS_PASSWORD）→ 管理員 cookie（HttpOnly、SameSite=Strict、只送到 /admin）
// 防護：密碼錯太多次會擋一陣子；所有 POST 都檢查 Origin 是同一個網站；用戶端密鑰只寫不讀（畫面上只顯示結尾 4 碼）
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { renderStatsBody, exportAll, getSetting, setSetting, dbh } from "./stats.js";
import { oauthConfig, googleReady } from "./auth.js";

const PASSWORD = process.env.ADMIN_PASSWORD || process.env.STATS_PASSWORD || "";
const SESSION_MS = 12 * 3600000;
const sessions = new Map(); // token 雜湊 → 到期時間（伺服器重開就要重新登入）
const fails = new Map(); // IP → { n, until }
const sha = (s) => createHash("sha256").update(String(s)).digest();
const hex = (s) => sha(s).toString("hex");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const adminEnabled = () => !!PASSWORD;
if (!PASSWORD) console.warn("[管理] 沒有設定 ADMIN_PASSWORD 或 STATS_PASSWORD，管理頁 /admin 不會開放。");

function cookieOf(req, name) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}
const isHttps = (req) => String(req.headers["x-forwarded-proto"] || "").includes("https") || String(req.headers["cf-visitor"] || "").includes("https");
const adminCookie = (req, v, age) => `mt_admin=${v}; Path=/admin; Max-Age=${age}; HttpOnly; SameSite=Strict${isHttps(req) ? "; Secure" : ""}`;
function authed(req) {
  const t = cookieOf(req, "mt_admin");
  if (!t) return false;
  const exp = sessions.get(hex(t));
  if (!exp || exp < Date.now()) { sessions.delete(hex(t)); return false; }
  return true;
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
button.sec,a.btnlink{background:#fff;color:#d9741a}a.btnlink{font-weight:700;min-height:42px;padding:0 16px;border-radius:10px;border:2px solid #d9741a;display:inline-flex;align-items:center;text-decoration:none}header button{min-height:34px;background:none;border-color:#ffd9b0;color:#ffd9b0}
.ok{color:#2d7a1f;font-weight:700}.no{color:#c0392b;font-weight:700}.msg{padding:10px 14px;border-radius:10px;background:#e3f4dc;margin:10px 0;max-width:820px}.msg.err{background:#fde2df}
code{background:#f6ead9;border-radius:4px;padding:1px 5px;font-size:14px;word-break:break-all}ol li{margin:6px 0}.row{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
</style></head><body>${body}</body></html>`);
}
function shell(res, cur, inner, msg) {
  const tabs = [["/admin", "統計"], ["/admin/google", "Google 登入"], ["/admin/data", "資料"]];
  page(res, "喵打管理", `<header><b>喵打管理</b><nav>${tabs.map(([h, t]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
<form method="post" action="/admin/logout"><button type="submit">登出</button></form></header>
<main>${msg ? `<div class="msg${msg.err ? " err" : ""}" role="status">${esc(msg.text)}</div>` : ""}${inner}</main>`);
}
const redirect = (res, to, headers = {}) => { res.writeHead(303, { Location: to, "Cache-Control": "no-store", ...headers }); res.end(); };
const MSGS = { saved: "已儲存，馬上生效。", cleared: "已清除 Google 登入設定，登入按鈕會隱藏。", bad: "格式不對，沒有儲存。", origin: "請從管理頁送出（來源不對）。" };

/** /admin 底下的請求；回傳 true 表示處理了 */
export async function handleAdmin(req, res, url) {
  const p = url.pathname;
  if (!(p === "/admin" || p.startsWith("/admin/"))) return false;
  if (!PASSWORD) { page(res, "喵打管理", `<main><h1>管理頁未開放</h1><p>請在伺服器的 .env 設定 <code>ADMIN_PASSWORD</code>（或 <code>STATS_PASSWORD</code>）後重新部署。</p></main>`, 404); return true; }
  const ip = String(req.headers["cf-connecting-ip"] || req.socket.remoteAddress || "");

  if (p === "/admin/login" && req.method === "POST") {
    const f = fails.get(ip);
    if (f && f.until > Date.now()) { page(res, "喵打管理", loginForm("密碼錯太多次，請 10 分鐘後再試。"), 429); return true; }
    if (!sameOrigin(req)) { page(res, "喵打管理", loginForm("請從登入頁送出。"), 403); return true; }
    const form = await readForm(req);
    const pass = form?.get("password") || "";
    if (!timingSafeEqual(sha(pass), sha(PASSWORD))) {
      const n = (f?.n || 0) + 1;
      fails.set(ip, { n, until: n >= 8 ? Date.now() + 10 * 60000 : 0 });
      page(res, "喵打管理", loginForm("密碼不對。"), 401); return true;
    }
    fails.delete(ip);
    const tok = randomBytes(32).toString("base64url");
    sessions.set(hex(tok), Date.now() + SESSION_MS);
    redirect(res, "/admin", { "Set-Cookie": adminCookie(req, tok, SESSION_MS / 1000) }); return true;
  }
  if (!authed(req)) {
    if (req.method !== "GET") { res.writeHead(401); res.end(); return true; }
    page(res, "喵打管理", loginForm(), 200); return true;
  }
  if (req.method === "POST") {
    if (!sameOrigin(req)) { redirect(res, "/admin?m=origin"); return true; }
    if (p === "/admin/logout") {
      sessions.delete(hex(cookieOf(req, "mt_admin")));
      redirect(res, "/admin", { "Set-Cookie": adminCookie(req, "", 0) }); return true;
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
  const msg = m ? { text: m, err: ["bad", "origin"].includes(url.searchParams.get("m")) } : null;
  if (p === "/admin") { shell(res, "/admin", `<h1>統計</h1>${renderStatsBody()}`, msg); return true; }
  if (p === "/admin/google") { shell(res, "/admin/google", googlePage(req), msg); return true; }
  if (p === "/admin/data") { shell(res, "/admin/data", dataPage(), msg); return true; }
  if (p === "/admin/export.json") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="meow-type-stats-${new Date().toISOString().slice(0, 10)}.json"` });
    res.end(JSON.stringify(exportAll())); return true;
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("找不到這個頁面"); return true;
}

function loginForm(err) {
  return `<main style="max-width:420px;margin:10vh auto"><h1>喵打管理</h1>${err ? `<div class="msg err" role="alert">${esc(err)}</div>` : ""}
<form method="post" action="/admin/login" class="card"><label for="pw">管理密碼</label><input id="pw" type="password" name="password" autocomplete="current-password" required autofocus>
<div class="row"><button type="submit">登入</button></div></form></main>`;
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
