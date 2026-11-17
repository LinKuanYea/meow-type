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
  env: { ...process.env, PORT: "0", HOST: "127.0.0.1", STATS_DB: path.join(dir, "t.db"), STATS_PASSWORD: "pw", APP_VERSION: "abc1234" }, stdio: ["ignore", "pipe", "pipe"],
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
  eq((await get("/stats")).status, 401, "統計頁要密碼");
  const st = await get("/stats", { Authorization: "Basic " + Buffer.from("x:pw").toString("base64") });
  const stHtml = await st.text();
  ok(st.status === 200 && stHtml.includes("上課檢查") && stHtml.includes("學一下"), "統計頁");
  const ex = await (await get("/stats/export.json", { Authorization: "Basic " + Buffer.from("x:pw").toString("base64") })).json();
  ok(ex.runs.length === 1 && ex.scores.length >= 4 && ex.learn.length === 1 && ex.shares.length === 2 && ex.shares.some((x) => x.views >= 1 && x.accepts === 1 && x.wins === 1), "匯出資料");
  ok(stHtml.includes("分享挑戰"), "統計頁有分享挑戰");
  ok(!JSON.stringify(ex).includes(text.slice(0, 20)), "資料庫不存打字內容");
} catch (e) { fail++; console.log("✗ 伺服器測試出錯：" + e.stack + "\n" + log.slice(-600)); }
finally { srv.kill(); rmSync(dir, { recursive: true, force: true }); }

console.log(`測試：${pass} 項通過，${fail} 項失敗`);
process.exit(fail ? 1 : 0);
