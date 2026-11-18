// 喵打測試：題庫、判定、驗算、伺服器 API。deploy.sh 會在新映像檔上跑這個，沒過就不換版本。
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BANK, CATS, LENS, textOf, randomSpec, itemText, itemsOf } from "../shared/bank.js";
import { CODE } from "../shared/bank-code.js";
import { Typist, replay, summarize, MAX_AHEAD } from "../shared/judge.js";
import { analyze, tips, classify, drillText } from "../shared/analyze.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) pass++; else { fail++; console.log("✗ " + name); } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), `${name}：得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`); }

/* ---------- 題庫 ---------- */
for (const c of CATS) for (const l of LENS) {
  for (let k = 0; k < 20; k++) ok(typeof textOf(randomSpec(c, l)) === "string", `題庫 ${c}/${l} 能出題`);
  for (const t of BANK[c][l].map(itemText)) {
    if (c === "cpp" || c === "py") {
      ok(!/\t/.test(t), `程式題不能有 Tab：${t.slice(0, 20)}`);
      ok(!/ +\n| +$/.test(t), `程式題行尾不能有空白：${t.slice(0, 20)}`);
      ok(t.split("\n").every((line) => (line.match(/^ */)[0].length % 4) === 0), `縮排要是 4 的倍數：${t.slice(0, 20)}`);
    }
    if (c === "en") ok(/^[\x20-\x7e\n]*$/.test(t), `英文題目只能有半形字元：${t.slice(0, 20)}`);
    if (c === "cpp" || c === "py") ok(!/[；（），：　]/.test(t.replace(/(["'])(?:\\.|(?!\1).)*\1/g, "")), `程式題字串以外不能有全形標點：${t.slice(0, 20)}`);
    if (c === "zh") ok(!/[,.;:!?]/.test(t), `中文題目標點要全形：${t.slice(0, 20)}`);
  }
}
for (const lang of ["cpp", "py"]) for (const it of CODE[lang]) {
  ok(it.title && it.unit && it.summary, `${it.id}：要有題目名稱、單元、說明`);
  ok(it.quiz && typeof it.quiz.out === "string" && it.quiz.wrong.length >= 2 && !it.quiz.wrong.includes(it.quiz.out), `${it.id}：預測輸出要有答案和至少 2 個不同的錯誤選項`);
  const n = it.t.split("\n").length;
  ok(Object.keys(it.notes).every((k) => +k >= 0 && +k < n), `${it.id}：逐行說明的行號要在程式範圍內`);
}
for (const it of BANK.en.word) ok(it.zh && it.pos && [1, 2].includes(it.lv), `英文單字 ${it.t} 要有中文、詞性、程度`);
for (const it of [...BANK.en.sent, ...BANK.en.para]) ok(it.vocab.length >= 3 && it.vocab.every((x) => x.w && x.zh && x.pos), `英文題目 ${it.t.slice(0, 15)} 要有 3 個以上單字片語`);
ok(itemsOf({ c: "cpp", l: "para", i: [0] })[0].quiz, "itemsOf 拿得到程式題的說明");
ok(randomSpec("cpp", "para", null, Math.random, "Sort").i.every((k) => BANK.cpp.para[k].unit === "Sort"), "可以只出某個單元的題目");
ok(textOf({ c: "cpp", l: "para", i: [999] }) === null, "不存在的題目要回 null");
ok(textOf({ c: "en", l: "word", i: [1, 2] }) === null, "單詞題數量不對要回 null");

/* ---------- 判定 ---------- */
function typeAll(rule, text, evs) { const ty = new Typist(rule); ty.setText(text); let t = 0; for (const e of evs) ty.apply([(t += 100), ...e]); return ty; }
{
  const ty = typeAll("block", "ab;", [["i", "a"], ["i", "x"], ["i", "b"], ["i", "；"], ["i", ";"]]);
  eq(ty.typed.join(""), "ab;", "擋下：錯字不會出現"); ok(ty.chunkDone(), "擋下：打完");
  const s = summarize(ty, "cpp", 500); eq([s.keys, s.errs, s.correct], [5, 2, 3], "擋下：按鍵、錯誤、打對");
  eq(classify(ty.keys.filter((k) => !k.ok)).width.length, 1, "全形分號算全形半形錯誤");
  ty.apply([600, "b"]); eq(ty.typed.length, 3, "擋下：不能倒退");
}
{
  const ty = typeAll("back", "abc", [["i", "a"], ["i", "x"], ["i", "c"]]);
  eq(ty.firstBad(), 1, "倒退修：錯字留著"); ok(!ty.chunkDone(), "倒退修：有錯字不算打完");
  eq(ty.correctNow(), 1, "倒退修：錯字後面都不算");
  ty.apply([400, "b"]); ty.apply([500, "b"]); ty.apply([600, "i", "b"]); ty.apply([700, "i", "c"]);
  ok(ty.chunkDone(), "倒退修：刪掉重打就打完");
  const s = summarize(ty, "en", 700); eq([s.keys, s.errs], [4, 1], "倒退修：錯字後面那一下不算錯誤");
  const t2 = typeAll("back", "a".repeat(30), [["i", "x"], ...Array(20).fill(["i", "a"])]);
  eq(t2.typed.length, MAX_AHEAD, "倒退修：錯字後最多往後帶 10 個字");
}
{
  const ty = typeAll("free", "abc", [["i", "a"], ["i", "x"], ["i", "c"]]);
  ok(ty.chunkDone(), "帶錯：照樣打完"); eq(ty.totalCorrect(), 2, "帶錯：只算打對的字");
}
{
  const ty = typeAll("back", "if x:\n    y", [["i", "i"], ["i", "f"], ["i", " "], ["i", "x"], ["i", ":"], ["i", "\n"], ["t"], ["i", "y"]]);
  ok(ty.chunkDone(), "Tab 補 4 個空白");
  const t2 = typeAll("back", "a\n        b", [["i", "a"], ["i", "\n"], ["t"], ["t"], ["i", "b"]]);
  ok(t2.chunkDone(), "兩層縮排按兩次 Tab");
  const t3 = typeAll("back", "a\nb", [["i", "a"], ["i", "\n"], ["t"]]);
  eq(classify(t3.keys.filter((k) => !k.ok && !k.after)).indent.length, 1, "多縮排算縮排錯誤");
}
{
  const ty = typeAll("block", "貓咪跳", [["i", "貓米跳", 1]]);
  eq(ty.typed.join(""), "貓", "擋下＋選字：從第一個錯字之後都不算"); eq(ty.keys.filter((k) => !k.ok).length, 1, "選字一次只算一個錯");
  const t2 = typeAll("back", "貓咪跳", [["i", "貓咪跳", 1]]); ok(t2.chunkDone(), "選字一次送出好幾個字");
  const t3 = typeAll("back", "abcdef", [["i", "abcd", 0]]); eq([t3.typed.length, t3.bursts], [0, 1], "非選字一次湧進 4 個字要擋下");
}
{
  const ty = typeAll("back", "cout << x;", [..."Cout << x；"].map((c) => ["i", c]));
  const A = analyze(ty, "cpp", 2000), T = tips(A, { cat: "cpp", rule: "back" });
  ok(Array.isArray(T) && T.length > 0, "有錯時要有建議");
  ok(typeof drillText(A, "cpp") === "string", "弱點練習能出題");
}

/* ---------- 伺服器驗算 ---------- */
function rnd(seed) { let s = seed; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); }
/** 模擬人打字：間隔隨機、偶爾打錯再倒退 */
function human(texts, { seed = 1, gap = [70, 260], errRate = 0.03, limitMs = null, rule = "back" } = {}) {
  const r = rnd(seed), evs = []; let t = 0;
  const step = () => (t += gap[0] + Math.floor(r() * (gap[1] - gap[0])));
  for (const text of texts) {
    for (const ch of text) {
      if (limitMs && t > limitMs - 300) return { evs, t };
      if (r() < errRate) { evs.push([step(), "i", "q", 0]); if (rule !== "free") evs.push([step(), "b"]); }
      evs.push([step(), "i", ch, 0]);
    }
  }
  return { evs, t };
}
{
  const spec = { c: "cpp", l: "para", i: [BANK.cpp.para.findIndex((x) => x.id === "cpp-bubble")] }, text = textOf(spec);
  const { evs } = human([text], { seed: 3 });
  const r = replay({ texts: [text], rule: "back", cat: "cpp", events: evs, limitMs: null });
  ok(r.ok, "人打的整段：驗算通過 " + (r.reason || "")); eq(r.flags, [], "人打的整段：不可疑");
  ok(r.sum.acc > 0.9 && r.sum.correct === text.length, "人打的整段：正確率與字數");
  const bot = human([text], { gap: [3, 6], errRate: 0 }).evs;
  const rb = replay({ texts: [text], rule: "back", cat: "cpp", events: bot, limitMs: null });
  ok(rb.ok && rb.flags.includes("too-fast-keys"), "5ms 一個字：標成可疑");
  const reg = human([text], { gap: [150, 151], errRate: 0 }).evs;
  ok(replay({ texts: [text], rule: "back", cat: "cpp", events: reg, limitMs: null }).flags.includes("too-regular"), "每個字間隔都一樣：標成可疑");
  ok(!replay({ texts: [text], rule: "back", cat: "cpp", events: evs.slice(0, -5), limitMs: null }).ok, "沒打完：不收");
  ok(!replay({ texts: [text], rule: "back", cat: "cpp", events: [[5, "i", "a"], [1, "i", "b"]], limitMs: null }).ok, "時間倒流：不收");
  const paste = [[100, "i", text.slice(0, 30), 0], ...evs];
  ok(replay({ texts: [text], rule: "back", cat: "cpp", events: paste, limitMs: null }).flags.includes("burst"), "一次湧進一大段：標成可疑");
}
{
  // 中文：注音組好一整句才按 Enter。計時要從開始組字（"c"）算起，不是從第一次送出字
  const spec = { c: "zh", l: "sent", i: [0] }, text = textOf(spec);
  const late = replay({ texts: [text], rule: "back", cat: "zh", events: [[0, "i", text, 1]], limitMs: null });
  ok(late.ok && late.flags.includes("too-fast"), "沒有組字事件、一次送出整句：速度爆表，標成可疑 " + Math.round(late.sum.speed));
  const ime = replay({ texts: [text], rule: "back", cat: "zh", events: [[0, "c"], [9000, "i", text, 1]], limitMs: null });
  ok(ime.ok && !ime.flags.includes("too-fast") && Math.abs(ime.sum.speed - text.length / 0.15) < 1, "從開始組字計時：速度正常 " + Math.round(ime.sum.speed));
  ok(!replay({ texts: [text], rule: "back", cat: "zh", events: [[0, "x"], [9000, "i", text, 1]], limitMs: null }).ok, "未知的事件：不收");
}
{
  // 1 分鐘、好幾段
  const texts = [0, 1, 2, 3, 4, 5].map((k) => itemText(BANK.en.sent[k]));
  const { evs } = human(texts, { seed: 5, gap: [60, 200], limitMs: 60000 });
  const used = []; let n = 0; const ty = new Typist("back", (t) => { n++; t.setText(texts[n]); }); ty.setText(texts[0]);
  for (const e of evs) ty.apply(e);
  const r = replay({ texts: texts.slice(0, n + 1), rule: "back", cat: "en", events: evs, limitMs: 60000 });
  ok(r.ok && r.flags.length === 0, "1 分鐘多段：驗算通過 " + (r.reason || r.flags));
  ok(r.ok && r.sum.ms === 60000 && r.sum.correct === ty.totalCorrect(), "1 分鐘多段：字數和前端一樣");
  void used;
}

/* ---------- 伺服器 API ---------- */
const dir = mkdtempSync(path.join(tmpdir(), "meow-type-test-"));
const srv = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", path.join(ROOT, "server/index.js")], {
  env: { ...process.env, PORT: "0", HOST: "127.0.0.1", STATS_DB: path.join(dir, "t.db"), STATS_PASSWORD: "pw", APP_VERSION: "abc1234", AUTH_FAKE: "1", NODE_ENV: "test" }, stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
srv.stderr.on("data", (d) => { log += d; });
const base = await new Promise((resolve, reject) => {
  const to = setTimeout(() => reject(new Error("伺服器沒啟動：" + log)), 8000);
  srv.stdout.on("data", (d) => { log += d; const m = /http:\/\/127\.0\.0\.1:(\d+)/.exec(log); if (m) { clearTimeout(to); resolve(`http://127.0.0.1:${m[1]}`); } });
});
const get = (p, h) => fetch(base + p, { headers: h });
const postJ = (p, b) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
try {
  const home = await get("/"); const html = await home.text();
  ok(home.status === 200 && html.includes("喵打") && html.includes("abc1234") && !html.includes("__APP_VERSION"), "首頁與版本號");
  ok(home.headers.get("content-security-policy")?.includes("script-src 'self'"), "首頁有 CSP");
  ok((await get("/app.js")).status === 200 && (await get("/shared/judge.js")).status === 200, "前端與共用程式");
  const appJs = await (await get("/app.js")).text(), anJs = await (await get("/shared/analyze.js")).text();
  ok(appJs.includes('from "/shared/bank.js?v=abc1234"') && appJs.includes('from "/learn.js?v=abc1234"'), "前端 import 網址帶版本號");
  ok(anJs.includes('from "./bank.js?v=abc1234"'), "共用程式 import 網址帶版本號");
  ok((await get("/shared/bank.js?v=abc1234")).status === 200, "帶版本號的網址讀得到");
  ok((await get("/shared/../server/index.js")).status === 404 && (await get("/%2e%2e/server/index.js")).status === 404, "不能讀到伺服器程式");
  const sid = "a".repeat(24), cid = "b".repeat(24);
  eq((await (await get("/healthz")).json()).playing, 0, "一開始沒人在打字");
  await postJ("/api/start", { sid });
  eq((await (await get("/healthz")).json()).playing, 1, "開始打字後 playing=1");
  await postJ("/api/end", { sid });
  eq((await (await get("/healthz")).json()).playing, 0, "打完後 playing=0");
  eq((await postJ("/api/visit", { cid, sid, device: "desktop", sw: 1920, sh: 1080 })).status, 204, "記錄造訪");
  eq((await postJ("/api/run", { cid, sid, device: "desktop", c: "cpp", l: "para", m: "full", rule: "back", ms: 30000, correct: 300, keys: 320, errs: 20, acc: 0.94, speed: 12, width: 2, finished: true })).status, 204, "記錄一局");
  eq((await postJ("/api/run", { c: "xx" })).status, 400, "格式不對的練習紀錄");
  eq((await postJ("/api/learn", { cid, sid, c: "cpp", l: "para", item: "3", quiz: 1, answered: 1, correct: 1, opened: 2 })).status, 204, "記錄學一下");
  eq((await postJ("/api/learn", { c: "cpp", l: "x" })).status, 400, "格式不對的學一下紀錄");
  eq((await postJ("/api/client-error", { msg: "測試", ua: "x" })).status, 204, "前端錯誤回報");
  ok((await get("/boot.js")).status === 200, "開機檢查程式");
  ok((await get("/share.js")).status === 200 && (await get("/cat.js")).status === 200, "分享與貓咪程式");
  ok((await get("/learn.js")).status === 200 && (await get("/shared/bank-code.js")).status === 200, "學一下與程式題庫");

  const spec = { c: "cpp", l: "para", i: [1] }, text = textOf(spec);
  const { evs } = human([text], { seed: 9 });
  const r0 = replay({ texts: [text], rule: "back", cat: "cpp", events: evs, limitMs: null });
  const body = { cid, name: "小橘", c: "cpp", l: "para", m: "full", rule: "back", specs: [spec], events: evs, ms: r0.sum.ms, speed: r0.sum.speed };
  const s1 = await (await postJ("/api/score", body)).json();
  ok(s1.ok && !s1.flagged && s1.rank === 1, "送出成績：上榜第 1 名 " + JSON.stringify(s1));
  const b1 = await (await get(`/api/board?c=cpp&l=para&m=full&p=day&me=${cid}`)).json();
  ok(b1.length === 1 && b1[0].name === "小橘" && b1[0].me === true && !("cid" in b1[0]), "排行榜看得到，而且不外流編號");
  ok(JSON.stringify(b1[0].specs) === JSON.stringify([spec]), "排行榜存了題目（挑戰時打同一題）");
  const slower = human([text], { seed: 11, gap: [200, 400] }).evs;
  const s2 = await (await postJ("/api/score", { ...body, events: slower, speed: replay({ texts: [text], rule: "back", cat: "cpp", events: slower }).sum.speed })).json();
  ok(s2.ok && s2.rank === null, "比之前慢：收下但不更新名次");
  eq((await (await get(`/api/board?c=cpp&l=para&m=full&p=day`)).json()).length, 1, "每人只留最好的一次");
  const all = await (await get(`/api/boards?p=all&me=${cid}`)).json();
  ok(all.length === 1 && all[0].c === "cpp" && all[0].l === "para" && all[0].m === "full" && all[0].rows[0].me && !("cid" in all[0].rows[0]) && !("id" in all[0].rows[0]), "所有排行");
  const bot = human([text], { gap: [3, 6], errRate: 0 }).evs;
  const s3 = await (await postJ("/api/score", { ...body, cid: "c".repeat(24), name: "機器人", events: bot, speed: replay({ texts: [text], rule: "back", cat: "cpp", events: bot }).sum.speed })).json();
  ok(s3.ok && s3.flagged, "機器人成績：標成可疑");
  eq((await (await get(`/api/board?c=cpp&l=para&m=full&p=all`)).json()).length, 1, "可疑成績不上榜");
  const s4 = await postJ("/api/score", { ...body, speed: 999 }); ok((await s4.json()).flagged, "前端報的速度和驗算不同：可疑");
  eq((await postJ("/api/score", { ...body, name: "幹你" })).status, 400, "不適合的暱稱");
  // 分享挑戰
  const sh = await (await postJ("/api/share", { ...body, name: "分享貓" })).json();
  ok(sh.ok && /^[0-9A-Za-z]{8}$/.test(sh.id), "產生分享連結 " + JSON.stringify(sh));
  const got = await (await get("/api/share/" + sh.id)).json();
  ok(got.name === "分享貓" && got.c === "cpp" && got.specs[0].i[0] === spec.i[0] && !("cid" in got) && Math.abs(got.speed - r0.sum.speed) < 0.01, "讀分享內容（不外流編號）");
  const page = await (await get("/c/" + sh.id)).text();
  ok(page.includes('og:title" content="分享貓 向你挑戰喵打！"') && page.includes("/app.js?v=abc1234"), "挑戰連結的網頁與預覽文字");
  ok(!(await (await get("/")).text()).includes("<!--OG-->"), "首頁的 OG 標記有換掉");
  eq((await get("/api/share/zzzzzzzz")).status, 404, "不存在的分享");
  eq((await postJ(`/api/share/${sh.id}/accept`, {})).status, 204, "接受挑戰");
  eq((await postJ(`/api/share/${sh.id}/win`, {})).status, 204, "挑戰結果");
  eq((await postJ("/api/share", { ...body, name: "機器人", events: bot, speed: replay({ texts: [text], rule: "back", cat: "cpp", events: bot }).sum.speed })).status, 400, "可疑成績不能分享");
  eq((await postJ("/api/share", { ...body, name: "<x>" })).status, 200, "分享暱稱過濾符號");
  eq((await postJ("/api/score", { ...body, events: evs.slice(0, 10) })).status, 400, "沒打完的成績不收");
  eq((await postJ("/api/score", { ...body, specs: [{ c: "py", l: "para", i: [1] }] })).status, 400, "題目和類別對不上");
  eq((await postJ("/api/score", { ...body, name: "<b>x</b>" }).then((r) => r.json())).ok, true, "暱稱的 HTML 符號會被去掉");
  const b2 = await (await get(`/api/board?c=cpp&l=para&m=full&p=all`)).json();
  ok(b2.every((r) => !/[<>]/.test(r.name)), "排行榜暱稱沒有 HTML 符號");
  // Google 登入（測試用假登入）
  ok((await (await get("/api/me")).json()).user === null, "沒登入時 /api/me 沒有使用者");
  const lg = await fetch(base + "/auth/fake?sub=g-123&email=cat@example.com", { redirect: "manual" });
  const sess = /mt_sess=([^;]+)/.exec(lg.headers.get("set-cookie") || "")?.[1];
  ok(lg.status === 200 && sess && /HttpOnly/.test(lg.headers.get("set-cookie")), "登入後拿到 HttpOnly 的 session cookie");
  const H = { Cookie: "mt_sess=" + sess, "Content-Type": "application/json" };
  const me1 = await (await fetch(base + "/api/me", { headers: H })).json();
  ok(me1.login === true && me1.user && me1.user.email === "cat@example.com", "登入後 /api/me 有使用者");
  const ls = await (await fetch(base + "/api/score", { method: "POST", headers: H, body: JSON.stringify({ ...body, cid: "d".repeat(24), name: "登入貓" }) })).json();
  ok(ls.ok && !ls.flagged, "登入後送排行榜");
  const lb = await (await fetch(base + "/api/board?c=cpp&l=para&m=full&p=all", { headers: H })).json();
  ok(lb.some((r) => r.name === "登入貓" && r.login && r.me) && lb.some((r) => r.name === "小橘" && !r.login && !r.me), "排行榜標出有登入的人與自己");
  await fetch(base + "/api/run", { method: "POST", headers: H, body: JSON.stringify({ cid, sid, device: "desktop", c: "en", l: "sent", m: "full", rule: "back", ms: 20000, correct: 50, keys: 52, errs: 2, acc: 0.96, speed: 30, finished: true }) });
  const hist = await (await fetch(base + "/api/me/history", { headers: H })).json();
  ok(hist.total.done === 1 && hist.best[0].c === "en" && hist.user.nick === "登入貓", "個人頁紀錄（只算登入後的練習）");
  eq((await get("/api/me/history")).status, 401, "沒登入看不到個人頁資料");
  eq((await fetch(base + "/api/me/nick", { method: "POST", headers: H, body: JSON.stringify({ nick: "新名字" }) })).status, 200, "改暱稱");
  eq((await fetch(base + "/api/me/nick", { method: "POST", headers: H, body: JSON.stringify({ nick: "白癡" }) })).status, 400, "改暱稱也擋不適合的字");
  const n2 = await fetch(base + "/api/me/nick", { method: "POST", headers: H, body: JSON.stringify({ nick: "再改一次" }) });
  ok(n2.status === 400 && (await n2.json()).error.includes("7 天"), "改過暱稱 7 天內不能再改");
  ok((await (await fetch(base + "/api/me", { headers: H })).json()).user.nickNext > Date.now() + 6 * 86400000, "/api/me 告訴前端什麼時候能再改");
  const ls2 = await (await fetch(base + "/api/score", { method: "POST", headers: H, body: JSON.stringify({ ...body, cid: "d".repeat(24), name: "偷改名字" }) })).json();
  ok(ls2.ok, "登入後再送排行榜");
  const lb2 = await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json();
  ok(lb2.some((r) => r.name === "新名字") && !lb2.some((r) => r.name === "偷改名字"), "登入的人上排行榜一律用帳號暱稱（不能從表單偷改）");
  const pv = await (await get("/privacy")).text(), tm = await get("/terms");
  ok(pv.includes("隱私權政策") && pv.includes("openid") && tm.status === 200, "隱私權政策與服務條款");
  ok((await get("/me")).status === 200 && (await get("/auth-done.js")).status === 200 && (await get("/account.js")).status === 200, "個人頁與登入程式");
  await fetch(base + "/api/logout", { method: "POST", headers: H, body: "{}" });
  ok((await (await fetch(base + "/api/me", { headers: H })).json()).user === null, "登出後 session 失效");
  // 管理頁
  eq((await fetch(base + "/stats", { redirect: "manual" })).headers.get("location"), "/admin", "舊統計網址導到管理頁");
  const host = base.replace(/^http:\/\//, ""), O = { Origin: base, "Content-Type": "application/x-www-form-urlencoded" };
  const a0 = await (await get("/admin")).text();
  ok(a0.includes('name="password"') && !a0.includes("上課檢查"), "沒登入只看到管理密碼表單");
  eq((await get("/admin")).headers.get("referrer-policy"), "same-origin", "管理頁的 Referrer-Policy 要讓表單帶 Origin");
  eq((await fetch(base + "/admin/login", { method: "POST", headers: O, body: "password=wrong" })).status, 401, "管理密碼錯誤");
  eq((await fetch(base + "/admin/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "password=pw" })).status, 403, "沒有 Origin 的登入要擋");
  const al = await fetch(base + "/admin/login", { method: "POST", headers: O, body: "password=pw", redirect: "manual" });
  const adm = /mt_admin=([^;]+)/.exec(al.headers.get("set-cookie") || "")?.[1];
  ok(al.status === 303 && adm && /SameSite=Strict/.test(al.headers.get("set-cookie")) && /Path=\/admin/.test(al.headers.get("set-cookie")), "管理登入拿到 cookie");
  const AC = { Cookie: "mt_admin=" + adm };
  const st = await get("/admin", AC);
  const stHtml = await st.text();
  ok(st.status === 200 && stHtml.includes("上課檢查") && stHtml.includes("學一下"), "管理頁的統計");
  const ex = await (await get("/admin/export.json", AC)).json();
  ok(ex.runs.length === 2 && ex.scores.length >= 4 && ex.learn.length === 1 && ex.shares.length === 2 && ex.shares.some((x) => x.views >= 1 && x.accepts === 1 && x.wins === 1), "匯出資料");
  ok(!("settings" in ex), "匯出資料不含管理設定");
  ok(stHtml.includes("分享挑戰"), "統計頁有分享挑戰");
  ok((await (await get("/admin/google", AC)).text()).includes("未開啟"), "Google 登入一開始未開啟");
  const g1 = await fetch(base + "/admin/google", { method: "POST", headers: { ...O, ...AC }, redirect: "manual",
    body: new URLSearchParams({ client_id: "1234567890-abcdef.apps.googleusercontent.com", client_secret: "GOCSPX-secretvalue1234", public_url: "https://meow-type.otlab.org" }).toString() });
  ok(g1.status === 303 && g1.headers.get("location").includes("m=saved"), "儲存 Google 登入設定");
  const gp = await (await get("/admin/google", AC)).text();
  ok(gp.includes("已開啟") && gp.includes("1234567890-abcdef.apps.googleusercontent.com") && !gp.includes("GOCSPX-secretvalue1234") && gp.includes("結尾 1234"), "設定生效，密鑰不會再顯示");
  const gr = await fetch(base + "/auth/google?back=/", { redirect: "manual" });
  ok(gr.status === 302 && gr.headers.get("location").startsWith("https://accounts.google.com/") && gr.headers.get("location").includes("redirect_uri=https%3A%2F%2Fmeow-type.otlab.org%2Fauth%2Fgoogle%2Fcallback"), "設定後導向 Google 登入");
  const g2 = await fetch(base + "/admin/google", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...AC }, redirect: "manual", body: "action=clear" });
  ok(g2.headers.get("location").includes("m=origin") && (await (await get("/admin/google", AC)).text()).includes("已開啟"), "沒有 Origin 的修改要擋");
  const g3 = await fetch(base + "/admin/google", { method: "POST", headers: { ...O, ...AC }, redirect: "manual", body: "client_id=not-a-client-id" });
  ok(g3.headers.get("location").includes("m=bad"), "格式不對的用戶端 ID 不收");
  await fetch(base + "/admin/google", { method: "POST", headers: { ...O, ...AC }, redirect: "manual", body: "action=clear" });
  ok((await (await get("/admin/google", AC)).text()).includes("未開啟"), "清除 Google 登入設定");
  // 帳號與管理員
  const up = await (await get("/admin/users", AC)).text();
  ok(up.includes("cat@example.com") && up.includes("設為管理員"), "帳號列表看得到登入過的人");
  const uid = Number(/name="id" value="(\d+)"><input type="hidden" name="action" value="grant">/.exec(up)?.[1]);
  const lg2 = await fetch(base + "/auth/fake?sub=g-123", { redirect: "manual" });
  const GC = { Cookie: "mt_sess=" + /mt_sess=([^;]+)/.exec(lg2.headers.get("set-cookie"))[1] };
  ok((await (await get("/admin", GC)).text()).includes('name="password"'), "不是管理員的 Google 帳號進不了管理頁");
  const post = (path, body, C) => fetch(base + path, { method: "POST", headers: { ...O, ...C }, redirect: "manual", body });
  ok((await post("/admin/security", "action=disable_password", AC)).headers.get("location").includes("m=needgoogle"), "用密碼登入時不能停用密碼登入");
  ok((await post("/admin/users", `id=${uid}&action=grant`, AC)).headers.get("location").includes("m=granted"), "設為管理員");
  ok((await (await get("/admin", GC)).text()).includes("上課檢查"), "管理員用 Google 帳號直接進管理頁");
  ok((await post("/admin/security", "action=disable_password", GC)).headers.get("location").includes("m=pwoff"), "停用密碼登入");
  eq((await fetch(base + "/admin/login", { method: "POST", headers: O, body: "password=pw" })).status, 403, "停用後密碼登入被擋");
  ok(!(await (await get("/admin", AC)).text()).includes("上課檢查"), "停用後原本的密碼登入失效");
  ok((await post("/admin/users", `id=${uid}&action=revoke`, GC)).headers.get("location").includes("m=last"), "密碼停用時不能取消最後一位管理員");
  ok((await post("/admin/security", "action=enable_password", GC)).headers.get("location").includes("m=pwon"), "重新啟用密碼登入");
  ok((await post("/admin/users", `id=${uid}&action=revoke`, GC)).headers.get("location") === "/admin", "取消自己的管理員");
  ok(!(await (await get("/admin", GC)).text()).includes("上課檢查"), "取消後就進不了管理頁");
  const al2 = await fetch(base + "/admin/login", { method: "POST", headers: O, body: "password=pw", redirect: "manual" });
  const AC2 = { Cookie: "mt_admin=" + /mt_admin=([^;]+)/.exec(al2.headers.get("set-cookie"))[1] };
  // 停權
  ok((await post("/admin/users", `id=${uid}&action=ban&reason=${encodeURIComponent("暱稱不雅")}`, AC2)).headers.get("location").includes("m=banned"), "停權");
  ok((await (await get("/admin/users", AC2)).text()).includes("暱稱不雅"), "管理頁看得到停權原因");
  ok(!(await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json()).some((r) => r.name === "新名字"), "停權後排行榜不顯示");
  const bn = await fetch(base + "/api/score", { method: "POST", headers: { ...GC, "Content-Type": "application/json" }, body: JSON.stringify({ ...body, cid: "d".repeat(24) }) });
  ok(bn.status === 403 && (await bn.json()).error.includes("停權"), "停權後不能上排行榜");
  ok((await (await fetch(base + "/api/me", { headers: GC })).json()).user.banned === true, "/api/me 告訴前端被停權");
  ok((await post("/admin/users", `id=${uid}&action=unban`, AC2)).headers.get("location").includes("m=unbanned"), "恢復");
  ok((await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json()).some((r) => r.name === "新名字"), "恢復後排行榜重新顯示");
  // 排行榜與分享：標記暱稱不雅（不刪除）、放行可疑成績
  const sp = await (await get("/admin/scores", AC2)).text();
  ok(sp.includes("排行榜與分享") && sp.includes("小橘") && sp.includes(sh.id), "管理頁列出排行榜成績和分享");
  const idOf = (html, name) => Number(new RegExp(`<tr><td>(\\d+)</td><td>[^<]*</td><td>${name}`).exec(html)?.[1]);
  const orange = idOf(sp, "小橘"), botId = idOf(sp, "機器人");
  ok(orange > 0 && botId > 0, "找得到成績編號");
  const before = (await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json()).findIndex((r) => r.name === "小橘");
  ok((await post("/admin/scores", `kind=score&id=${orange}&action=hide&all=1`, AC2)).headers.get("location").includes("m=hidden"), "標記暱稱不雅（同一台瀏覽器全部）");
  const bh = await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json();
  ok(!bh.some((r) => r.name === "小橘") && bh[before]?.name === "（暱稱不雅，已隱藏）", "標記後成績還在、名次不變，暱稱遮起來");
  ok((await (await get("/admin/scores?f=hidden", AC2)).text()).includes("小橘"), "管理頁看得到原本的暱稱");
  ok((await post("/admin/scores", `kind=score&id=${orange}&action=unhide&all=1`, AC2)).headers.get("location").includes("m=unhidden"), "取消標記");
  ok((await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json()).some((r) => r.name === "小橘"), "取消後暱稱重新顯示");
  const shh = await post("/admin/scores", `kind=share&id=${sh.id}&action=hide&all=1`, AC2);
  ok(String(shh.headers.get("location")).includes("m=hidden"), "分享：同一人全部標記 " + shh.status + (shh.status >= 400 ? await shh.text() : ""));
  ok((await (await get("/api/share/" + sh.id)).json()).name === "（暱稱不雅，已隱藏）", "分享頁的暱稱遮起來");
  ok(!(await (await get("/c/" + sh.id)).text()).includes("分享貓"), "挑戰連結預覽也不顯示");
  ok(!(await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json()).some((r) => r.name === "小橘"), "同一人的排行榜成績也一起標記");
  await post("/admin/scores", `kind=share&id=${sh.id}&action=unhide&all=1`, AC2);
  ok((await (await get("/api/share/" + sh.id)).json()).name === "分享貓", "同一人全部取消");
  ok((await post("/admin/scores", `kind=share&id=${sh.id}&action=approve`, AC2)).headers.get("location").includes("m=bad"), "分享不能放行（只有可疑成績可以）");
  ok((await (await get("/admin/scores?f=flag", AC2)).text()).includes("按鍵間隔太短"), "可疑清單列出原因");
  ok((await post("/admin/scores", `kind=score&id=${botId}&action=approve`, AC2)).headers.get("location").includes("m=approved"), "放行可疑成績");
  ok((await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json()).some((r) => r.name === "機器人"), "放行後上排行榜");
  await post("/admin/scores", `kind=score&id=${botId}&action=unapprove`, AC2);
  ok(!(await (await get("/api/board?c=cpp&l=para&m=full&p=all")).json()).some((r) => r.name === "機器人"), "取消放行後下榜");
  eq((await fetch(base + "/admin/scores", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...AC2 }, body: `kind=score&id=${orange}&action=hide`, redirect: "manual" })).headers.get("location"), "/admin?m=origin", "沒有 Origin 的標記要擋");
  await fetch(base + "/admin/logout", { method: "POST", headers: { ...O, ...AC2 }, redirect: "manual" });
  ok(!(await (await get("/admin", AC2)).text()).includes("上課檢查"), "管理登出");
  void host;
  ok(!JSON.stringify(ex).includes(text.slice(0, 20)), "資料庫不存打字內容");
  ok(!JSON.stringify(ex).includes("cat@example.com") && !JSON.stringify(ex).includes("g-123"), "匯出資料不含 email 與 Google 編號");
} catch (e) { fail++; console.log("✗ 伺服器測試出錯：" + e.stack + "\n" + log.slice(-600)); }
finally { srv.kill(); rmSync(dir, { recursive: true, force: true }); }

console.log(`測試：${pass} 項通過，${fail} 項失敗`);
process.exit(fail ? 1 : 0);
