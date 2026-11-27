// 喵打：伺服器
// - 提供網頁（client/、shared/）
// - /api/*：匿名練習統計、排行榜（成績用 shared/judge.js 重播按鍵紀錄驗算）
// - /admin：管理頁（統計、Google 登入設定、資料匯出；需要 ADMIN_PASSWORD 或 STATS_PASSWORD）
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATS, LENS, CAT_NAME, LEN_NAME, textOf } from "../shared/bank.js";
import { RULES, replay, unitOf } from "../shared/judge.js";
import { handleAdmin } from "./admin.js";
import { initAdventure, advState, advClear, advBuy, advWear } from "./adventure.js";
import { loginEnabled, currentUser, handleAuth, logout, changeNick, nickNextChange } from "./auth.js";
import { initStats, history, recordVisit, recordRun, recordLearn, recordScore, board, boards, createShare, getShare, shareEvent, cleanId } from "./stats.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_DIR = path.join(ROOT, "client");
const SHARED_DIR = path.join(ROOT, "shared");

const envInt = (k, d) => { const v = Number.parseInt(process.env[k] ?? "", 10); return Number.isFinite(v) && v > 0 ? v : d; };
const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";
const RATE_PER_MIN = envInt("RATE_PER_MIN", 1500); // 同一個 IP 每分鐘最多幾個請求（學校全班共用一個對外 IP，所以設高一點）
/* 版本：部署時由 deploy.sh 帶入 GitHub commit 代碼（APP_VERSION）與時間（APP_BUILT） */
const PKG_VERSION = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8")).version;
const APP_VERSION = /^[0-9a-f]{4,40}$/.test(process.env.APP_VERSION || "") ? process.env.APP_VERSION : "dev";
const APP_BUILT = String(process.env.APP_BUILT || "").replace(/[^0-9/: -]/g, "").slice(0, 20);
const VERSION_LABEL = `v${PKG_VERSION}（${APP_VERSION}${APP_BUILT ? `・${APP_BUILT}` : ""}）`;
console.log(`喵打 ${VERSION_LABEL}`);
initStats(process.env.STATS_DB || path.join(ROOT, "data", "stats.db"));
initAdventure();

/* ---------- Node 版本檢查（2026-10-21 資安更新） ---------- */
const PATCHED = { 22: [22, 23, 4], 24: [24, 22, 1], 26: [26, 12, 1] };
(function checkNodeVersion() {
  const v = process.versions.node.split(".").map(Number), p = PATCHED[v[0]];
  const lower = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  if (!p) console.warn(`[資安警告] Node ${process.versions.node} 不在目前維護中的版本線，請改用 24.22.1 以上。`);
  else if (lower(v, p) < 0) console.warn(`[資安警告] Node ${process.versions.node} 低於 2026-10 資安修補版 ${p.join(".")}，請更新。`);
})();

/* ---------- 正在打字的人（auto-update.sh 用來判斷能不能更新） ---------- */
const active = new Map(); // sid → 開始時間
const ACTIVE_MS = 3 * 60000;
function playing() { const t = Date.now(); for (const [k, v] of active) if (t - v > ACTIVE_MS) active.delete(k); return active.size; }

/* ---------- 靜態檔案 ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com", "connect-src 'self'", "img-src 'self' data: blob:",
  "base-uri 'none'", "frame-ancestors 'none'", "form-action 'none'",
].join("; ");
const SEC_HEADERS = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": CSP, "Cache-Control": "no-cache" };
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(obj === undefined ? undefined : JSON.stringify(obj)); };

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (/^\/(api|auth|admin)(\/|$)/.test(url.pathname) && !rateOk(req)) return json(res, 429, { error: "太多請求了，等一下再試" });
    if (url.pathname.startsWith("/auth/") && req.method === "GET" && await handleAuth(req, res, url)) return;
    if (await handleAdmin(req, res, url)) return;
    if (req.method === "POST" && url.pathname.startsWith("/api/")) { await handleApi(req, res, url.pathname); return; }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD, POST" }); res.end(); return; }
    if (url.pathname === "/api/board") return handleBoard(req, res, url.searchParams);
    if (url.pathname === "/api/adv") return json(res, 200, advState(currentUser(req)));
    if (url.pathname === "/api/me") {
      const u = currentUser(req);
      return json(res, 200, { login: loginEnabled(), user: u ? { nick: u.nick || "", email: u.email || "", nickNext: nickNextChange(u), banned: !!u.banned } : null });
    }
    if (url.pathname === "/api/me/history") {
      const u = currentUser(req);
      return u ? json(res, 200, { user: { nick: u.nick || "", email: u.email || "", nickNext: nickNextChange(u), banned: !!u.banned }, ...history(u.id) }) : json(res, 401, { error: "要先登入" });
    }
    const sm = /^\/api\/share\/([0-9A-Za-z]{8})$/.exec(url.pathname);
    if (sm) { const sh = getShare(sm[1], true); return sh ? json(res, 200, sh) : json(res, 404, { error: "找不到這個挑戰，可能連結打錯了" }); }
    if (url.pathname === "/api/boards") {
      const p = ["day", "week", "all"].includes(url.searchParams.get("p")) ? url.searchParams.get("p") : "day";
      return json(res, 200, boards(p, cleanId(url.searchParams.get("me")), 5, currentUser(req)?.id ?? null));
    }
    if (url.pathname === "/stats" || url.pathname === "/stats/export.json") { res.writeHead(302, { Location: url.pathname === "/stats" ? "/admin" : "/admin/export.json" }); res.end(); return; } // 舊網址
    if (url.pathname === "/healthz") return json(res, 200, { ok: true, version: APP_VERSION, label: VERSION_LABEL, node: process.versions.node, playing: playing() });
    if (url.pathname === "/version") return json(res, 200, { version: APP_VERSION, label: VERSION_LABEL });
    let p = decodeURIComponent(url.pathname);
    const shareId = /^\/c\/([0-9A-Za-z]{8})$/.exec(p)?.[1] || "";
    if (p === "/" || shareId) p = "/index.html";
    if (p === "/me") p = "/me.html";
    if (p === "/adv") p = "/adv.html";
    if (p === "/privacy" || p === "/terms") p += ".html";
    let base = CLIENT_DIR, rel = p;
    if (p.startsWith("/shared/")) { base = SHARED_DIR; rel = p.slice("/shared".length); }
    const file = path.resolve(base, "." + rel);
    const type = MIME[path.extname(file)];
    if (!file.startsWith(base + path.sep) || !type) throw new Error("not found");
    let data = await readFile(file);
    if (base === CLIENT_DIR && /^text\/(html|javascript)/.test(type)) {
      data = data.toString("utf8").replaceAll("__APP_VERSION_LABEL__", VERSION_LABEL).replaceAll("__APP_VERSION__", APP_VERSION);
    }
    if (type.startsWith("text/html")) data = String(data).replace("<!--OG-->", ogTags(shareId));
    // JS 的 import 網址都加上版本號：瀏覽器或 Cloudflare 快取了舊的檔案也不會混到新版（v0.2.1 出過「舊 bank.js＋新 app.js」）
    if (type.startsWith("text/javascript")) data = versionImports(data.toString("utf8"));
    res.writeHead(200, { "Content-Type": type, ...SEC_HEADERS, ...(type.startsWith("text/html") ? { "Cache-Control": "no-store" } : {}) });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    res.end("找不到這個頁面");
  }
});

/** 分享連結的預覽文字（LINE、Messenger 等貼上連結時顯示） */
function ogTags(shareId) {
  const sh = shareId && getShare(shareId, false);
  const title = sh ? `${sh.name} 向你挑戰喵打！` : "喵打：貓咪打字練習";
  const desc = sh ? `${CAT_NAME[sh.c]}・${LEN_NAME[sh.l]}・${sh.m === "t60" ? "1 分鐘" : "打完一題"}：${Math.round(sh.speed)} ${unitOf(sh.c)}，正確率 ${Math.round(sh.acc * 100)}%。你打得贏嗎？`
    : "程式、英文、中文打字練習，打完告訴你哪裡可以更好。";
  const e = (x) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return `<meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}"><meta property="og:type" content="website">`;
}

export function versionImports(js) {
  return js.replace(/(\bfrom\s*["'])((?:\.{1,2})?\/[^"'?]+\.js)(["'])/g, `$1$2?v=${APP_VERSION}$3`);
}

/* ---------- API ---------- */
const rate = new Map();
let clientErrs = 0; // 每分鐘最多記 60 筆前端錯誤
setInterval(() => { clientErrs = 0; }, 60000).unref();
setInterval(() => rate.clear(), 60000).unref();
function clientIp(req) { return String(req.headers["cf-connecting-ip"] || req.socket.remoteAddress || ""); } // 只用來限流，不儲存
function rateOk(req) { const ip = clientIp(req), n = (rate.get(ip) || 0) + 1; rate.set(ip, n); return n <= RATE_PER_MIN; }
function readJson(req, limit) {
  return new Promise((resolve) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { req.removeAllListeners("data"); resolve("too-big"); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { resolve(null); } });
    req.on("error", () => resolve(null));
  });
}
async function handleApi(req, res, pathname) {
  const body = await readJson(req, pathname === "/api/score" || pathname === "/api/share" || pathname === "/api/adv/clear" ? 512 * 1024 : 4096);
  if (body === "too-big") { res.writeHead(413, { Connection: "close" }); res.end(); res.on("finish", () => req.socket.destroy()); return; }
  if (!body || typeof body !== "object") return json(res, 400, { error: "格式不對" });
  const user = currentUser(req);
  try {
    if (pathname === "/api/logout") return logout(req, res);
    if (pathname === "/api/me/nick") {
      if (!user) return json(res, 401, { error: "要先登入" });
      const nick = cleanName(body.nick);
      if (!nick) return json(res, 400, { error: "先填一個暱稱" });
      if (badName(nick)) return json(res, 400, { error: "暱稱有不適合的字，換一個吧" });
      const r = changeNick(user.id, nick);
      return r.error ? json(res, 400, { error: r.error }) : json(res, 200, { ok: true, nick, nickNext: nickNextChange(currentUser(req)) });
    }
    if (pathname === "/api/start") { const s = cleanId(body.sid); if (s && active.size < 5000) active.set(s, Date.now()); return json(res, 204); }
    if (pathname === "/api/end") { active.delete(cleanId(body.sid)); return json(res, 204); }
    if (pathname === "/api/visit") { recordVisit(body); return json(res, 204); }
    if (pathname === "/api/run") { recordRun(body, user?.id ?? null); return json(res, 204); }
    if (pathname === "/api/learn") { recordLearn(body, user?.id ?? null); return json(res, 204); }
    if (pathname === "/api/score") return handleScore(res, body, user);
    const adv = { "/api/adv/clear": advClear, "/api/adv/buy": advBuy, "/api/adv/wear": advWear }[pathname];
    if (adv) { const r = adv(user, body); return r.error ? json(res, r.status || 400, { error: r.error }) : json(res, 200, r); }
    if (pathname === "/api/share") return handleShareCreate(res, body, user);
    const ev = /^\/api\/share\/([0-9A-Za-z]{8})\/(accept|win|lose)$/.exec(pathname);
    if (ev) { shareEvent(ev[1], ev[2]); return json(res, 204); }
    if (pathname === "/api/client-error") {
      const clip = (x, n) => String(x ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);
      if (clientErrs++ < 60) console.warn(`[前端錯誤] v=${clip(body.v, 12)} ${clip(body.msg, 300)} ｜ ${clip(body.ua, 200)}`);
      return json(res, 204);
    }
  } catch (e) { console.warn(`[API] ${pathname}：${e.message}`); return json(res, 400, { error: "格式不對" }); }
  json(res, 404, { error: "沒有這個功能" });
}

/* 暱稱：去掉控制字元與 HTML 符號，最多 10 個字；擋掉不適合的字 */
const BAD = ["幹", "靠北", "靠杯", "操你", "屌", "雞掰", "機掰", "智障", "白癡", "白痴", "去死", "垃圾", "賤", "婊", "fuck", "shit", "bitch", "dick", "porn"];
export function cleanName(s) {
  if (typeof s !== "string") return "";
  s = s.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f<>&"'`\\]/g, "").replace(/\s+/g, " ").trim();
  return Array.from(s).slice(0, 10).join("");
}
export const badName = (s) => { const t = s.toLowerCase().replace(/[\s._\-*]/g, ""); return BAD.some((w) => t.includes(w)); };

/**
 * 驗證一局的成績（排行榜、分享共用）：暱稱、設定、題目、重播按鍵紀錄。
 * 回傳 { error } 或 { cid, name, specs, sum, flags }
 */
function verifyRun(b, { minAcc, minCorrect, what }) {
  const cid = cleanId(b.cid), name = cleanName(b.name);
  if (!cid) return { error: "格式不對" };
  if (!name) return { error: "先填一個暱稱" };
  if (badName(name)) return { error: "暱稱有不適合的字，換一個吧" };
  if (!CATS.includes(b.c) || !LENS.includes(b.l) || !["full", "t60"].includes(b.m) || !RULES.includes(b.rule)) return { error: "格式不對" };
  const specs = Array.isArray(b.specs) ? b.specs.slice(0, 40) : [];
  if (!specs.length || (b.m === "full" && specs.length !== 1) || specs.some((x) => !x || x.c !== b.c || x.l !== b.l)) return { error: "題目對不上" };
  const texts = specs.map(textOf);
  if (texts.some((t) => !t)) return { error: "題目對不上" };
  const r = replay({ texts, rule: b.rule, cat: b.c, events: b.events, limitMs: b.m === "t60" ? 60000 : null });
  if (!r.ok) return { error: "成績驗算沒過：" + r.reason };
  if (r.sum.acc < minAcc || r.sum.correct < minCorrect) return { error: `正確率 ${Math.round(minAcc * 100)}% 以上、打對 ${minCorrect} 個字以上才能${what}` };
  const flags = r.flags.slice();
  if (typeof b.speed !== "number" || Math.abs(b.speed - r.sum.speed) > 1) flags.push("mismatch");
  return { cid, name, specs: specs.map((x) => ({ c: x.c, l: x.l, i: x.i })), sum: r.sum, flags };
}

function handleScore(res, b, user) {
  const v = verifyRun(b, { minAcc: 0.9, minCorrect: 20, what: "上排行榜" });
  if (v.error) return json(res, 400, { error: v.error });
  const nu = accountName(user, v); if (nu) return json(res, 403, { error: nu });
  const s = v.sum, flags = v.flags;
  const out = recordScore({ cid: v.cid, userId: user?.id ?? null, name: v.name, specs: v.specs, c: b.c, l: b.l, m: b.m, rule: b.rule, speed: s.speed, acc: s.acc, correct: s.correct, ms: Math.round(s.ms), flag: flags.join(",") });
  if (flags.length) console.warn(`[排行榜] 可疑成績（${flags.join(",")}）：${b.c}/${b.l}/${b.m} ${s.speed.toFixed(1)}`);
  json(res, 200, { ok: true, flagged: flags.length > 0, rank: out.rank, speed: s.speed, acc: s.acc });
}

/**
 * 登入的人：排行榜和分享一律用帳號暱稱（改暱稱要到「我的紀錄」，7 天一次）；還沒設定暱稱的，第一次送出就把它設成帳號暱稱。
 * 停權的帳號不能上排行榜或分享。回傳錯誤訊息，沒問題回傳空字串（並把 v.name 換成帳號暱稱）。
 */
function accountName(user, v) {
  if (!user) return "";
  if (user.banned) return "這個帳號已被停權，不能上排行榜或分享。有問題請找老師。";
  if (user.nick) { v.name = user.nick; return ""; }
  const r = changeNick(user.id, v.name);
  return r.error || "";
}

/* ---------- 分享挑戰 ---------- */
function handleShareCreate(res, b, user) {
  const v = verifyRun(b, { minAcc: 0.8, minCorrect: 10, what: "分享" });
  if (v.error) return json(res, 400, { error: v.error });
  if (v.flags.length) { console.warn(`[分享] 可疑成績不給分享（${v.flags.join(",")}）`); return json(res, 400, { error: "這次的打字節奏不太像人打的，不能分享" }); }
  const s = v.sum;
  const nu = accountName(user, v); if (nu) return json(res, 403, { error: nu });
  const id = createShare({ cid: v.cid, userId: user?.id ?? null, name: v.name, c: b.c, l: b.l, m: b.m, rule: b.rule, specs: v.specs, speed: s.speed, acc: s.acc, correct: s.correct, ms: Math.round(s.ms) });
  json(res, 200, { ok: true, id, speed: s.speed, acc: s.acc });
}
const SHARE_ID = /^[0-9A-Za-z]{8}$/;

function handleBoard(req, res, q) {
  const c = q.get("c"), l = q.get("l"), m = q.get("m"), p = ["day", "week", "all"].includes(q.get("p")) ? q.get("p") : "day";
  if (!CATS.includes(c) || !LENS.includes(l) || !["full", "t60"].includes(m)) return json(res, 400, { error: "格式不對" });
  json(res, 200, board(c, l, m, p, cleanId(q.get("me")), 20, currentUser(req)?.id ?? null).map(({ id, ...r }) => r));
}

server.listen(PORT, HOST, () => console.log(`喵打伺服器在 http://${HOST}:${server.address().port}`));
const stop = () => { server.close(); setTimeout(() => process.exit(0), 500).unref(); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
