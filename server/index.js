// 喵打：伺服器
// - 提供網頁（client/、shared/）
// - /api/*：匿名練習統計、排行榜（成績用 shared/judge.js 重播按鍵紀錄驗算）
// - /stats：統計頁（需要 STATS_PASSWORD）
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, timingSafeEqual } from "node:crypto";
import { CATS, LENS, textOf } from "../shared/bank.js";
import { RULES, replay } from "../shared/judge.js";
import { initStats, recordVisit, recordRun, recordLearn, recordScore, board, exportAll, renderStatsPage, cleanId } from "./stats.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_DIR = path.join(ROOT, "client");
const SHARED_DIR = path.join(ROOT, "shared");

const envInt = (k, d) => { const v = Number.parseInt(process.env[k] ?? "", 10); return Number.isFinite(v) && v > 0 ? v : d; };
const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";
const STATS_PASSWORD = process.env.STATS_PASSWORD || "";
const RATE_PER_MIN = envInt("RATE_PER_MIN", 1500); // 同一個 IP 每分鐘最多幾個請求（學校全班共用一個對外 IP，所以設高一點）
/* 版本：部署時由 deploy.sh 帶入 GitHub commit 代碼（APP_VERSION）與時間（APP_BUILT） */
const PKG_VERSION = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8")).version;
const APP_VERSION = /^[0-9a-f]{4,40}$/.test(process.env.APP_VERSION || "") ? process.env.APP_VERSION : "dev";
const APP_BUILT = String(process.env.APP_BUILT || "").replace(/[^0-9/: -]/g, "").slice(0, 20);
const VERSION_LABEL = `v${PKG_VERSION}（${APP_VERSION}${APP_BUILT ? `・${APP_BUILT}` : ""}）`;
console.log(`喵打 ${VERSION_LABEL}`);
initStats(process.env.STATS_DB || path.join(ROOT, "data", "stats.db"));
if (!STATS_PASSWORD) console.warn("[統計] 沒有設定 STATS_PASSWORD，統計頁 /stats 不會開放。");

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
  "font-src https://fonts.gstatic.com", "connect-src 'self'", "img-src 'self' data:",
  "base-uri 'none'", "frame-ancestors 'none'", "form-action 'none'",
].join("; ");
const SEC_HEADERS = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": CSP, "Cache-Control": "no-cache" };
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(obj === undefined ? undefined : JSON.stringify(obj)); };

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/") && !rateOk(req)) return json(res, 429, { error: "太多請求了，等一下再試" });
    if (req.method === "POST" && url.pathname.startsWith("/api/")) { await handleApi(req, res, url.pathname); return; }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD, POST" }); res.end(); return; }
    if (url.pathname === "/api/board") return handleBoard(res, url.searchParams);
    if (url.pathname === "/stats" || url.pathname === "/stats/export.json") return handleStats(req, res, url.pathname);
    if (url.pathname === "/healthz") return json(res, 200, { ok: true, version: APP_VERSION, label: VERSION_LABEL, node: process.versions.node, playing: playing() });
    if (url.pathname === "/version") return json(res, 200, { version: APP_VERSION, label: VERSION_LABEL });
    let p = decodeURIComponent(url.pathname);
    if (p === "/") p = "/index.html";
    let base = CLIENT_DIR, rel = p;
    if (p.startsWith("/shared/")) { base = SHARED_DIR; rel = p.slice("/shared".length); }
    const file = path.resolve(base, "." + rel);
    const type = MIME[path.extname(file)];
    if (!file.startsWith(base + path.sep) || !type) throw new Error("not found");
    let data = await readFile(file);
    if (base === CLIENT_DIR && /^text\/(html|javascript)/.test(type)) {
      data = data.toString("utf8").replaceAll("__APP_VERSION_LABEL__", VERSION_LABEL).replaceAll("__APP_VERSION__", APP_VERSION);
    }
    res.writeHead(200, { "Content-Type": type, ...SEC_HEADERS, ...(type.startsWith("text/html") ? { "Cache-Control": "no-store" } : {}) });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    res.end("找不到這個頁面");
  }
});

/* ---------- API ---------- */
const rate = new Map();
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
  const body = await readJson(req, pathname === "/api/score" ? 512 * 1024 : 4096);
  if (body === "too-big") { res.writeHead(413, { Connection: "close" }); res.end(); res.on("finish", () => req.socket.destroy()); return; }
  if (!body || typeof body !== "object") return json(res, 400, { error: "格式不對" });
  try {
    if (pathname === "/api/start") { const s = cleanId(body.sid); if (s && active.size < 5000) active.set(s, Date.now()); return json(res, 204); }
    if (pathname === "/api/end") { active.delete(cleanId(body.sid)); return json(res, 204); }
    if (pathname === "/api/visit") { recordVisit(body); return json(res, 204); }
    if (pathname === "/api/run") { recordRun(body); return json(res, 204); }
    if (pathname === "/api/learn") { recordLearn(body); return json(res, 204); }
    if (pathname === "/api/score") return handleScore(res, body);
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

function handleScore(res, b) {
  const cid = cleanId(b.cid), name = cleanName(b.name);
  if (!cid) return json(res, 400, { error: "格式不對" });
  if (!name) return json(res, 400, { error: "先填一個暱稱" });
  if (badName(name)) return json(res, 400, { error: "暱稱有不適合的字，換一個吧" });
  if (!CATS.includes(b.c) || !LENS.includes(b.l) || !["full", "t60"].includes(b.m) || !RULES.includes(b.rule)) return json(res, 400, { error: "格式不對" });
  const specs = Array.isArray(b.specs) ? b.specs.slice(0, 40) : [];
  if (!specs.length || (b.m === "full" && specs.length !== 1) || specs.some((s) => !s || s.c !== b.c || s.l !== b.l)) return json(res, 400, { error: "題目對不上" });
  const texts = specs.map(textOf);
  if (texts.some((t) => !t)) return json(res, 400, { error: "題目對不上" });
  const r = replay({ texts, rule: b.rule, cat: b.c, events: b.events, limitMs: b.m === "t60" ? 60000 : null });
  if (!r.ok) return json(res, 400, { error: "成績驗算沒過：" + r.reason });
  const s = r.sum;
  if (s.acc < 0.9 || s.correct < 20) return json(res, 400, { error: "正確率 90% 以上、打對 20 個字以上才能上排行榜" });
  const flags = r.flags.slice();
  if (typeof b.speed !== "number" || Math.abs(b.speed - s.speed) > 1) flags.push("mismatch");
  const out = recordScore({ cid, name, c: b.c, l: b.l, m: b.m, rule: b.rule, speed: s.speed, acc: s.acc, correct: s.correct, ms: Math.round(s.ms), flag: flags.join(",") });
  if (flags.length) console.warn(`[排行榜] 可疑成績（${flags.join(",")}）：${b.c}/${b.l}/${b.m} ${s.speed.toFixed(1)}`);
  json(res, 200, { ok: true, flagged: flags.length > 0, rank: out.rank, speed: s.speed, acc: s.acc });
}

function handleBoard(res, q) {
  const c = q.get("c"), l = q.get("l"), m = q.get("m"), p = ["day", "week", "all"].includes(q.get("p")) ? q.get("p") : "day";
  if (!CATS.includes(c) || !LENS.includes(l) || !["full", "t60"].includes(m)) return json(res, 400, { error: "格式不對" });
  json(res, 200, board(c, l, m, p, cleanId(q.get("me"))).map(({ id, ...r }) => r));
}

const sha = (s) => createHash("sha256").update(String(s)).digest();
function handleStats(req, res, pathname) {
  if (!STATS_PASSWORD) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("統計頁未開放：請在 .env 設定 STATS_PASSWORD 後重新部署。"); return; }
  const auth = String(req.headers.authorization || "");
  const pass = auth.startsWith("Basic ") ? Buffer.from(auth.slice(6), "base64").toString("utf8").split(":").slice(1).join(":") : "";
  if (!timingSafeEqual(sha(pass), sha(STATS_PASSWORD))) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="meow-type-stats", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" });
    res.end("需要密碼"); return;
  }
  const head = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
  if (pathname === "/stats/export.json") {
    res.writeHead(200, { ...head, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="meow-type-stats-${new Date().toISOString().slice(0, 10)}.json"` });
    res.end(JSON.stringify(exportAll())); return;
  }
  res.writeHead(200, { ...head, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" });
  res.end(renderStatsPage());
}

server.listen(PORT, HOST, () => console.log(`喵打伺服器在 http://${HOST}:${server.address().port}`));
const stop = () => { server.close(); setTimeout(() => process.exit(0), 500).unref(); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
