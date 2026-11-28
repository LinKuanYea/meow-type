// 喵打測試：題庫、判定、驗算、伺服器 API。deploy.sh 會在新映像檔上跑這個，沒過就不換版本。
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BANK, CATS, LENS, textOf, randomSpec, itemText, itemsOf } from "../shared/bank.js";
import { CODE } from "../shared/bank-code.js";
import { Typist, replay, summarize, MAX_AHEAD } from "../shared/judge.js";
import { analyze, tips, classify, drillText } from "../shared/analyze.js";
import { ISLANDS, LEVELS, starsOf, fishFor, FISH, withSegs, segmentsOf, mergeSums, etaMin, SEG_MAX } from "../shared/quest.js";
import { ITEMS, ITEM, cleanOutfit } from "../shared/items.js";
import { customLevel, cleanCustom } from "../shared/custom.js";
import { DEN_ITEM as DEN_ITEM0 } from "../shared/den.js";
import { BOSSES, BOSS, BOSS_ART, weekOf, bossOfWeek, bossOfIndex, piecesOf, pieceOf, randomPiece, damageOf, accBonus, baseHp, hpWith, DAILY_CAP, BOSS_FISH, HP_RULE, avgChars } from "../shared/boss.js";
import { newsLevel, newsFishFor, streakOf, twDate, addDays, NEWS_FISH } from "../shared/news.js";

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
/* ---------- QR code ---------- */
{
  const { qrMatrix, qrSVG } = await import("../client/qr.js");
  const M = qrMatrix("https://meow-type.otlab.org/v/Ab3dE9xY");
  const finderOk = (x0, y0) => [0, 1, 2, 3, 4, 5, 6].every((i) => M[y0][x0 + i] && M[y0 + 6][x0 + i] && M[y0 + i][x0] && M[y0 + i][x0 + 6]) && !M[y0 + 1][x0 + 1] && M[y0 + 3][x0 + 3];
  ok(M.length === 29 && finderOk(0, 0) && finderOk(M.length - 7, 0) && finderOk(0, M.length - 7), "QR code：大小與三個定位方塊（版本 3）");
  ok(qrSVG("hi").startsWith("<svg") && qrMatrix("hi").length === 21, "QR code：SVG、短字串用版本 1");
  let tooLong = false; try { qrMatrix("x".repeat(200)); } catch { tooLong = true; }
  ok(tooLong, "QR code：太長會報錯");
}
/* ---------- 縮時影片的 MP4 封裝 ---------- */
{
  const { muxMp4 } = await import("../client/mp4.js");
  const blob = muxMp4({ chunks: [{ data: new Uint8Array([0, 0, 0, 2, 9, 16]), key: true }, { data: new Uint8Array([0, 0, 0, 1, 1]), key: false }], width: 1080, height: 1920, fps: 30, avcC: new Uint8Array([1, 100, 0, 40, 255, 225]) });
  const u = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(u.buffer), td = new TextDecoder();
  const boxes = []; for (let o = 0; o < u.length; o += dv.getUint32(o)) boxes.push(td.decode(u.subarray(o + 4, o + 8)));
  eq(boxes, ["ftyp", "mdat", "moov"], "MP4：ftyp、mdat、moov");
  const s = td.decode(u);
  ok(["avc1", "avcC", "stts", "stss", "stsz", "stco"].every((x) => s.includes(x)) && blob.type === "video/mp4", "MP4：索引齊全");
  const stco = s.indexOf("stco"), off = dv.getUint32(stco + 12);
  eq([...u.subarray(off, off + 6)], [0, 0, 0, 2, 9, 16], "MP4：stco 指到第一格的資料");
}
/* ---------- 冒險模式 ---------- */
{
  ok(LEVELS.size >= 10, "冒險模式有關卡");
  for (const lv of LEVELS.values()) {
    ok(lv.texts.length && lv.texts.every((t) => t && !/\t/.test(t)), `${lv.id}：關卡文字`);
    ok(lv.boss && lv.boss.name && lv.boss.glyph && /^#[0-9a-f]{6}$/i.test(lv.boss.color), `${lv.id}：怪物設定`);
    ok(lv.target > 0, `${lv.id}：三星速度`);
    if (lv.drop) ok(ITEM.get(lv.drop)?.from === lv.id, `${lv.id}：掉落的裝扮對得上`);
  }
  for (const it of ITEMS) {
    ok(it.from ? (it.from.startsWith("boss:") ? BOSS.get(it.from.slice(5))?.item === it.id && !("price" in it) : LEVELS.get(it.from)?.drop === it.id) : it.price >= 0, `${it.id}：取得方式`);
    if (it.art) ok(it.art.every((r) => r.length === 16 && [...r].every((c) => c === "." || it.pal[c])) && it.y + it.art.length <= 14, `${it.id}：像素圖格式`);
    if (it.fur) ok(["k", "o", "w", "e", "p"].every((c) => it.fur[c]), `${it.id}：毛色`);
  }
  ok(new Set(ITEMS.map((x) => x.id)).size === ITEMS.length, "裝扮 id 不重複");
  const lv = LEVELS.get("cpp-1-1");
  eq([starsOf(lv, { acc: 0.8, speed: 99 }), starsOf(lv, { acc: 0.9, speed: 99 }), starsOf(lv, { acc: 0.96, speed: 1 }), starsOf(lv, { acc: 0.96, speed: 99 })], [0, 1, 2, 3], "星星的條件");
  eq([fishFor(lv, 0, 3, 0), fishFor(lv, 1, 3, 0), fishFor(lv, 3, 3, 0), fishFor(lv, 3, 3, FISH.replayPerDay), fishFor(LEVELS.get("cpp-1-5"), 0, 1, 0)], [30, 20, 2, 0, 30], "小魚乾的算法");
  for (const lv of LEVELS.values()) {
    ok(lv.segs.flat().join("") === lv.texts.join("") && lv.segs.every((sg) => sg.every((t) => t.length)), `${lv.id}：分段後文字不變`);
    if (lv.segs.length > 1) ok(lv.segs.every((sg) => sg.reduce((a, t) => a + t.length, 0) <= SEG_MAX * 1.25), `${lv.id}：每段不會太長`);
  }
  ok(LEVELS.get("cpp-7-5").segs.length === 3 && LEVELS.get("cpp-1-1").segs.length === 1, "長的關卡才分段");
  eq(segmentsOf(["a\nb"]), [["a\nb"]], "短的不分段");
  const mg = mergeSums("cpp", [{ correct: 100, keys: 110, errs: 10, ms: 60000 }, { correct: 50, keys: 50, errs: 0, ms: 30000 }]);
  ok(mg.correct === 150 && Math.abs(mg.acc - 150 / 160) < 1e-9 && mg.speed === 20, "分段成績合起來");
  eq([etaMin(1000, 20, "cpp"), etaMin(10, 20, "cpp")], [10, 1], "預估時間");
  eq(cleanOutfit({ fur: "fur-black", hat: "hat-cap", neck: "nope" }, new Set(["hat-cap"])), { fur: "fur-orange", hat: "hat-cap" }, "沒擁有的裝扮穿不上");
  eq(streakOf(["2026-11-25", "2026-11-26", "2026-11-27"], "2026-11-27"), 3, "連續天數");
  eq(streakOf(["2026-11-25", "2026-11-26"], "2026-11-27"), 2, "今天還沒打：從昨天算");
  eq(streakOf(["2026-11-24", "2026-11-26"], "2026-11-27"), 1, "中斷就重算");
  eq(addDays("2026-12-31", 1), "2027-01-01", "日期加一天");
  eq([newsFishFor(true, 0, 3, 0, 1, 2, 10), newsFishFor(true, 0, 1, 0, 3, 2, 10), newsFishFor(false, 0, 3, 0, 5, 2, 10), newsFishFor(false, 3, 3, 0, 0, 2, 10)], [30, 15, 12, 2], "每日新聞的小魚乾");
  for (const is of ISLANDS.filter((x) => x.open)) ok(is.chapters.length && is.chapters[0].login === false && is.chapters.slice(1).every((c) => c.login), `${is.name}：只有第 1 章不用登入`);
  ok(ISLANDS.find((x) => x.id === "py").chapters.length === 5, "Python 島：5 章（照 MeowJudge 單元）");
}
/* ---------- 世界 Boss：輪替、週次（台灣時間）、出擊的文字、傷害、血量 ---------- */
{
  ok(BOSSES.length >= 4 && new Set(BOSSES.map((b) => b.id)).size === BOSSES.length, "世界 Boss：至少 4 隻、id 不重複");
  ok(BOSSES.every((b, i) => b.theme !== BOSSES[(i + 1) % BOSSES.length].theme) && ["cpp", "py", "en"].every((t) => BOSSES.some((b) => b.theme === t)), "世界 Boss：主題輪流 C++、Python、英文");
  for (const b of BOSSES) {
    ok(b.name && b.glyph && b.intro && /^#[0-9a-f]{6}$/i.test(b.color), `${b.id}：名字、符號、介紹、顏色`);
    const it = ITEM.get(b.item) || DEN_ITEM0.get(b.item);
    ok(it && it.from === "boss:" + b.id && !("price" in it), `${b.id}：限定獎勵 ${b.item} 存在、from 對得上、不能買`);
  }
  ok(BOSS_ART.length === 14 && BOSS_ART.every((r) => r.length === 16 && /^[.bdpwem]+$/.test(r)), "世界 Boss：像素圖 16 × 14");
  const tw = (s) => Date.parse(s + "+08:00");
  const w0 = weekOf(tw("2026-11-23T00:00:00")), w0e = weekOf(tw("2026-11-29T23:59:59")), w1 = weekOf(tw("2026-11-30T00:00:00")), wm = weekOf(tw("2026-11-22T23:59:59"));
  eq([w0.key, w0.index, w0e.key, w0e.index, w1.key, w1.index, wm.key, wm.index], ["2026-11-23", 0, "2026-11-23", 0, "2026-11-30", 1, "2026-11-16", -1], "世界 Boss：週一 00:00 到週日 23:59（台灣時間）");
  ok(w0.start === tw("2026-11-23T00:00:00") && w0.end === tw("2026-11-30T00:00:00") && w0.end - w0.start === 7 * 86400000, "世界 Boss：一週的開始與結束");
  eq(weekOf(Date.parse("2026-11-29T16:00:00Z")).key, "2026-11-30", "世界 Boss：UTC 週日 16:00＝台灣週一 00:00");
  ok(bossOfWeek(tw("2026-11-25T12:00:00")) === BOSSES[0] && bossOfWeek(tw("2026-12-01T12:00:00")) === BOSSES[1] && bossOfIndex(-1) === BOSSES.at(-1) && bossOfIndex(BOSSES.length) === BOSSES[0], "世界 Boss：每週照順序換（往前的週次也對得上）");
  for (const t of ["cpp", "py", "en"]) {
    const ps = piecesOf(t);
    ok(ps.length >= 8 && ps.every((p) => p.texts.length && p.chars > 0 && p.lang === t && p.from), `世界 Boss：${t} 有出擊的文字`);
    ok(new Set(ps.map((p) => p.id)).size === ps.length && pieceOf(t, ps[3].id) === ps[3] && pieceOf(t, "nope") === null, `世界 Boss：${t} 每段的 id`);
    ok(randomPiece(t, ps[0].id, () => 0) !== ps[0], `世界 Boss：${t} 不會連續抽到同一段`);
  }
  const allSegs = new Set([...LEVELS.values()].flatMap((lv) => lv.segs.map((sg) => sg.join("\u0000"))));
  ok(["cpp", "py"].every((t) => piecesOf(t).every((p) => allSegs.has(p.texts.join("\u0000")))), "世界 Boss：程式題都來自冒險模式的關卡");
  const enAll = new Set([...BANK.en.sent, ...BANK.en.para].map(itemText));
  ok(piecesOf("en").every((p) => p.texts.length === 1 && enAll.has(p.texts[0])), "世界 Boss：英文都來自題庫");
  eq([1, 0.98, 0.96, 0.9, 0.85, 0.7].map((acc) => damageOf({ correct: 100, acc })), [150, 150, 120, 100, 100, 50], "世界 Boss：傷害＝打對的字數 × 正確率加成");
  eq([accBonus(0.99), accBonus(0.95), accBonus(0.94)], [1.5, 1.2, 1], "世界 Boss：正確率加成");
  ok(baseHp(0, "en") === baseHp(HP_RULE.minPlayers, "en") && baseHp(30, "en") > baseHp(10, "en") && baseHp(20, "cpp") % 100 === 0, "世界 Boss：血量依上週人數（有下限、取整到百位）");
  ok(Math.abs(baseHp(30, "py") - 30 * avgChars("py") * HP_RULE.sortiesPerPlayer) <= 50, "世界 Boss：每人份＝平均一段 × 4 次");
  eq([hpWith(1000, 2), hpWith(1000, 0.5), hpWith(1000, 0)], [2000, 500, 1000], "世界 Boss：血量倍率");
  ok(BOSS_FISH.hit * DAILY_CAP < FISH.replay * FISH.replayPerDay, "世界 Boss：每天出擊的小魚乾比冒險模式重打少");
}
// 英文、中文題庫：content/ 的資料檔和產生的 shared/bank-text.js 一致（部署的映像檔裡沒有 content/，就跳過）
if (existsSync(path.join(ROOT, "content/en"))) {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/build-text-bank.mjs"), "--check"], { encoding: "utf8" });
  ok(r.status === 0, "英文、中文題庫的資料檔已重新產生 " + (r.stderr || "").trim());
}
for (const c of ["en", "zh"]) for (const l of LENS) for (let n = 0; n < 50; n++) {
  const sp = randomSpec(c, l, null);
  ok(sp.i.every((k) => !BANK[c][l][k].retired), `不出已退休的題目 ${c}/${l}`);
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

/* ---------- 老師自訂題組 ---------- */
{
  const c = cleanCustom({ title: " 迴圈 ", lang: "cpp", text: "for (int i=0;i<3;i++) {  \n\tcout << i;\n}\n---\nint x;\n" });
  eq([c.title, c.texts, c.target], ["迴圈", ["for (int i=0;i<3;i++) {\n    cout << i;\n}", "int x;"], 15], "自訂題組：程式 Tab 換空白、去行尾空白、--- 分段");
  eq([cleanCustom({ title: "", lang: "en", text: "a" }).error, cleanCustom({ title: "x", lang: "jp", text: "a" }).error, cleanCustom({ title: "x", lang: "zh", text: "  \n " }).error, cleanCustom({ title: "x", lang: "zh", text: "字".repeat(7000) }).error].map(Boolean), [true, true, true, true], "自訂題組：擋掉沒標題、語言不對、沒內容、太長");
  eq(cleanCustom({ title: "x", lang: "zh", text: "床前明月光，\n疑是地上霜。", target: "30" }).texts.length, 2, "自訂題組：中文每行一段");
}

/* ---------- 世界 Boss：跨週、停權（直接呼叫伺服器函式，用假的時間） ---------- */
{
  const bdir = mkdtempSync(path.join(tmpdir(), "meow-boss-unit-"));
  const st = await import("../server/stats.js");
  st.initStats(path.join(bdir, "b.db"));
  (await import("../server/quest.js")).initAdventure();
  const bs = await import("../server/boss.js");
  bs.initBoss();
  const db = st.dbh();
  db.prepare("INSERT INTO users (id, sub, created, last_login) VALUES (1, 'u1', 0, 0), (2, 'u2', 0, 0)").run();
  const U = { id: 1, banned: 0 }, BAN = { id: 2, banned: 1 };
  const w0 = weekOf(Date.parse("2026-12-06T12:00:00+08:00")), w1 = weekOf(w0.end + 1000); // 週日、下一週
  const prevPiece = randomPiece(bossOfIndex(w0.index).theme);
  const ev = human(prevPiece.texts, { seed: 11, gap: [60, 120], errRate: 0 }).evs;
  const dur = ev[ev.length - 1][0] - ev[0][0];
  // 換週前 1 秒還在打、換週後 (打字時間) 送出：算在上一週
  const hit = bs.bossHit(U, { piece: prevPiece.id, week: w0.key, rule: "back", events: ev }, w1.start + Math.max(0, dur - 60000));
  ok(hit.ok && hit.lastWeek === w0.key && hit.dmg > 0, "跨週：換週前開始打的，算在上一週 " + JSON.stringify({ ok: hit.ok, lastWeek: hit.lastWeek, dmg: hit.dmg, error: hit.error }));
  eq(db.prepare("SELECT week FROM boss_hits ORDER BY id DESC LIMIT 1").get().week, w0.key, "跨週：記在上一週的血條");
  // 換週後才開始打的（打字時間比換週後經過的時間短）：不能算上一週
  const late = bs.bossHit(U, { piece: prevPiece.id, week: w0.key, rule: "back", events: ev }, w1.start + dur + 60000);
  ok(late.status === 400 || (late.ok && !late.lastWeek), "跨週：換週後才開始打的不能算上一週");
  // 超過寬限時間
  const tooLate = bs.bossHit(U, { piece: prevPiece.id, week: w0.key, rule: "back", events: ev }, w1.start + bs.GRACE + 60000);
  ok(tooLate.status === 400 || (tooLate.ok && !tooLate.lastWeek), "跨週：換週超過 15 分鐘就不算上一週");
  // 停權
  const bh = bs.bossHit(BAN, { piece: prevPiece.id, week: w0.key, rule: "back", events: ev }, w0.start + 3600000);
  ok(bh.status === 403 && bs.bossState(BAN, w0.start + 3600000).banned, "停權的人不能打世界 Boss");
  rmSync(bdir, { recursive: true, force: true });
}

/* ---------- 伺服器 API ---------- */
const dir = mkdtempSync(path.join(tmpdir(), "meow-type-test-"));
// 測試用的新聞：正式的新聞加上「今天」的 3 篇短文
const NT = twDate(), newsDir = path.join(dir, "news");
mkdirSync(newsDir);
for (const f of readdirSync(path.join(ROOT, "shared/news"))) copyFileSync(path.join(ROOT, "shared/news", f), path.join(newsDir, f));
{
  // 正式的新聞如果已經有今天的，先拿掉（測試要用自己的 3 篇「今天」，不然每篇會出現兩次）
  const idx = JSON.parse(readFileSync(path.join(newsDir, "index.json"), "utf8")).filter((n) => n.date !== NT);
  const topics = ["科學", "運動", "環境"];
  for (let k = 1; k <= 3; k++) {
    const key = `${NT}-${k}`, paras = [`Test story number ${k} is short. Cats like to read the news every morning.`, `This is the second part of story ${k}. It has only a few words.`];
    writeFileSync(path.join(newsDir, key + ".json"), JSON.stringify({ key, date: NT, title: "測試新聞 " + k, topic: topics[k - 1], paras,
      vocab: [{ w: "morning", pos: "n.", zh: "早上", lv: 1 }], questions: [{ q: "Who reads?", options: ["Cats", "Dogs", "Fish", "Birds"], answer: 0, why: "貓" }], sources: [{ name: "Test", url: "https://example.com/" }] }));
    idx.unshift({ key, date: NT, title: "測試新聞 " + k, topic: topics[k - 1], chars: paras.join("").length });
  }
  writeFileSync(path.join(newsDir, "index.json"), JSON.stringify(idx));
}
const srv = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", path.join(ROOT, "server/index.js")], {
  env: { ...process.env, PORT: "0", HOST: "127.0.0.1", STATS_DB: path.join(dir, "t.db"), NEWS_DIR: newsDir, STATS_PASSWORD: "pw", APP_VERSION: "abc1234", AUTH_FAKE: "1", NODE_ENV: "test" }, stdio: ["ignore", "pipe", "pipe"],
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
  eq((await postJ("/api/score", { ...body, rule: "free" })).status, 400, "打錯規則只剩要倒退修：其他規則不收");
  const s4 = await postJ("/api/score", { ...body, speed: 999 }); ok((await s4.json()).flagged, "前端報的速度和驗算不同：可疑");
  eq((await postJ("/api/score", { ...body, name: "幹你" })).status, 400, "不適合的暱稱");
  // 分享挑戰
  const sh = await (await postJ("/api/share", { ...body, name: "分享貓" })).json();
  ok(sh.ok && /^[0-9A-Za-z]{8}$/.test(sh.id), "產生分享連結 " + JSON.stringify(sh));
  const got = await (await get("/api/share/" + sh.id)).json();
  ok(got.name === "分享貓" && got.c === "cpp" && got.specs[0].i[0] === spec.i[0] && !("cid" in got) && Math.abs(got.speed - r0.sum.speed) < 0.01, "讀分享內容（不外流編號）");
  const page = await (await get("/c/" + sh.id)).text();
  ok(page.includes('og:title" content="分享貓 向你挑戰喵打！"') && page.includes("/app.js?v=abc1234"), "挑戰連結的網頁與預覽文字");
  ok(page.includes(`/c/${sh.id}.png"`) && page.includes('og:image:width" content="1200"'), "挑戰連結有預覽圖");
  const ogr = await get(`/c/${sh.id}.png`), ogb = Buffer.from(await ogr.arrayBuffer());
  ok(ogr.headers.get("content-type") === "image/png" && ogb.subarray(1, 4).toString() === "PNG" && ogb.readUInt32BE(16) === 1200 && ogb.readUInt32BE(20) === 630 && ogb.length < 200000, "預覽圖是 1200×630 的 PNG（" + ogb.length + " bytes）");
  eq([(await get("/c/AAAAAAAA.png")).status, (await get("/")).headers.get("content-type").includes("html") && !(await (await get("/")).text()).includes("og:image")], [404, true], "不存在的分享沒有預覽圖、首頁沒有 og:image");
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
  ok((await (await get("/admin/users", AC2)).text()).includes("<!--email_off-->"), "管理頁請 Cloudflare 不要把 email 換成 [email protected]");
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
  ok((await (await get("/admin/news", AC2)).text()).includes("太空望遠鏡"), "管理頁看得到每日新聞");
  ok((await post("/admin/news", "date=2026-11-27&action=hide", AC2)).headers.get("location").includes("m=newshid"), "下架每日新聞");
  eq((await get("/api/news/2026-11-27")).status, 404, "下架後學生看不到");
  ok((await post("/admin/news", "date=2026-11-27&action=show", AC2)).headers.get("location").includes("m=newsshow"), "恢復上架");
  eq((await get("/api/news/2026-11-27")).status, 200, "恢復後看得到");
  ok((await post("/admin/news", `key=${NT}-3&action=hide`, AC2)).headers.get("location").includes("m=newshid"), "下架其中一篇");
  ok((await get(`/api/news/${NT}-3`)).status === 404 && (await get(`/api/news/${NT}-2`)).status === 200, "下架一篇不影響同一天的其他篇");
  ok(!(await (await fetch(base + "/api/news")).json()).list.some((n) => n.key === NT + "-3"), "列表也不顯示下架的那篇");
  ok((await post("/admin/news", `key=${NT}-3&action=show`, AC2)).headers.get("location").includes("m=newsshow"), "恢復那一篇");
  // 老師自訂題組
  ok((await (await get("/admin/sets", AC2)).text()).includes("新增題組"), "管理頁：自訂題組");
  const setForm = (o) => new URLSearchParams({ action: "create", ...o }).toString();
  const badSet = await (await post("/admin/sets", setForm({ title: "壞的", lang: "en", text: "Hello \u00e9t\u00e9 world" }), AC2)).text();
  ok(badSet.includes("鍵盤打不出來") && badSet.includes("Hello"), "英文有打不出來的字元：提醒、保留剛剛貼的內容");
  const setRes = await post("/admin/sets", setForm({ title: "英文 B3 L5", lang: "en", target: "", text: "The cat\u2019s \u201cbig\u201d day \u2014 fun.\n\nIt sat on the mat.\n---\nSecond story here." }), AC2);
  const setId = /id=([0-9A-Za-z]{6})/.exec(setRes.headers.get("location") || "")?.[1];
  ok(setRes.headers.get("location").includes("m=setok") && setId, "新增題組 " + setId);
  ok((await (await get("/admin/sets", AC2)).text()).includes("/t/" + setId), "題組列表有連結");
  ok((await post("/admin/sets", `id=${setId}&action=hide`, AC2)).headers.get("location").includes("m=sethid") && (await get("/api/set/" + setId)).status === 404, "收起來的題組學生打不開");
  ok((await post("/admin/sets", `id=${setId}&action=show`, AC2)).headers.get("location").includes("m=setshow") && (await get("/api/set/" + setId)).status === 200, "恢復題組");
  const qp = await (await get("/admin/quest", AC2)).text();
  ok(qp.includes("冒險模式") && qp.includes("宣告與輸入") && qp.includes("卡關") && qp.includes("Python"), "管理頁的冒險模式統計");
  ok((await get("/admin/quest?d=7", AC2)).status === 200 && !(await (await get("/admin/quest")).text()).includes("卡關"), "冒險模式統計：最近 7 天、要登入管理頁");
  await fetch(base + "/admin/logout", { method: "POST", headers: { ...O, ...AC2 }, redirect: "manual" });
  ok(!(await (await get("/admin", AC2)).text()).includes("上課檢查"), "管理登出");
  void host;
  // 冒險模式
  ok((await get("/video.js")).status === 200 && (await get("/mp4.js")).status === 200 && /media-src 'self' blob:/.test((await get("/quest")).headers.get("content-security-policy")), "縮時影片的程式與 CSP（blob 影片）");
  ok((await get("/quest")).status === 200 && (await fetch(base + "/adv", { redirect: "manual" })).headers.get("location") === "/quest" && (await get("/quest.js")).status === 200 && (await get("/battle.js")).status === 200 && (await get("/typebox.js")).status === 200 && (await get("/shared/items.js")).status === 200, "冒險模式的網頁");
  eq(await (await get("/api/quest")).json(), { login: false }, "沒登入：沒有冒險進度");
  const xAdvpost = (p, b, C = {}) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", ...C }, body: JSON.stringify(b) });
  const xFast = (id, seed = 5) => human(LEVELS.get(id).texts, { seed, gap: [45, 130], errRate: 0 }).evs;
  const xA0 = await (await xAdvpost("/api/quest/clear", { level: "cpp-1-1", rule: "back", events: xFast("cpp-1-1") })).json();
  ok(xA0.ok && xA0.stars === 3 && xA0.fish === 0, "沒登入也能玩第 1 章（不給小魚乾） " + JSON.stringify(xA0));
  eq((await xAdvpost("/api/quest/clear", { level: "cpp-2-1", rule: "back", events: xFast("cpp-2-1") })).status, 401, "第 2 章要登入");
  const xPy = await (await xAdvpost("/api/quest/clear", { level: "py-1-1", rule: "back", events: xFast("py-1-1") })).json();
  ok(xPy.ok && xPy.stars === 3, "Python 島第 1 章：沒登入也能玩");
  eq((await xAdvpost("/api/quest/clear", { level: "cpp-1-1", rule: "block", events: xFast("cpp-1-1") })).status, 400, "冒險模式也只收要倒退修");
  eq((await xAdvpost("/api/quest/clear", { level: "cpp-1-1", rule: "back", events: xFast("cpp-1-1").slice(0, 5) })).status, 400, "沒打完不算");
  const xAl3 = await fetch(base + "/auth/fake?sub=adv-1&email=adv@example.com", { redirect: "manual" });
  const XAV = { Cookie: "mt_sess=" + /mt_sess=([^;]+)/.exec(xAl3.headers.get("set-cookie"))[1] };
  eq((await xAdvpost("/api/quest/clear", { level: "cpp-1-2", rule: "back", events: xFast("cpp-1-2") }, XAV)).status, 400, "還沒解鎖的關卡不能打");
  const xA1 = await (await xAdvpost("/api/quest/clear", { level: "cpp-1-1", rule: "back", events: xFast("cpp-1-1") }, XAV)).json();
  ok(xA1.stars === 3 && xA1.fish === 30 && xA1.total === 30, "第一次三星：30 條小魚乾 " + JSON.stringify(xA1));
  const xA2 = await (await xAdvpost("/api/quest/clear", { level: "cpp-1-1", rule: "back", events: xFast("cpp-1-1", 9) }, XAV)).json();
  ok(xA2.fish === FISH.replay && xA2.total === 30 + FISH.replay, "重打：少少的小魚乾");
  const xSlow = human(LEVELS.get("cpp-1-1").texts, { seed: 3, gap: [70, 260], errRate: 0.2 }).evs;
  const xA3 = await (await xAdvpost("/api/quest/clear", { level: "cpp-1-1", rule: "back", events: xSlow }, XAV)).json();
  ok(xA3.ok && xA3.stars < 3, "打得比較差：星星不會變少，也不會多拿");
  const xBotev = human(LEVELS.get("cpp-1-1").texts, { gap: [3, 6], errRate: 0 }).evs;
  const xA4 = await (await xAdvpost("/api/quest/clear", { level: "cpp-1-1", rule: "back", events: xBotev }, XAV)).json();
  ok(xA4.flagged && xA4.stars === 0 && xA4.fish === 0, "可疑的打字：不算過關、沒有小魚乾");
  for (const id of ["cpp-1-2", "cpp-1-3", "cpp-1-4"]) await xAdvpost("/api/quest/clear", { level: id, rule: "back", events: xFast(id) }, XAV);
  const xA5 = await (await xAdvpost("/api/quest/clear", { level: "cpp-1-5", rule: "back", events: xFast("cpp-1-5") }, XAV)).json();
  ok(xA5.stars === 3 && xA5.drops[0] === "back-cout" && xA5.fish === 50, "打倒第 1 章 Boss：掉落 cout 斗篷＋50 條 " + JSON.stringify(xA5));
  const xSt = await (await fetch(base + "/api/quest", { headers: XAV })).json();
  ok(xSt.login && xSt.stars["cpp-1-5"] === 3 && xSt.owned.includes("back-cout") && xSt.fish === xA5.total, "冒險進度");
  eq((await xAdvpost("/api/quest/buy", { item: "hat-crown" }, XAV)).status, 400, "Boss 掉落的裝扮不能買");
  eq((await xAdvpost("/api/quest/wear", { outfit: { hat: "hat-cap" } }, XAV)).status, 400, "沒買的不能穿");
  const xB1 = await (await xAdvpost("/api/quest/buy", { item: "hat-cap" }, XAV)).json();
  ok(xB1.ok && xB1.fish === xSt.fish - ITEM.get("hat-cap").price && xB1.owned.includes("hat-cap"), "用小魚乾買帽子");
  eq((await xAdvpost("/api/quest/buy", { item: "hat-cap" }, XAV)).status, 400, "已經有的不能再買");
  const xW1 = await (await xAdvpost("/api/quest/wear", { outfit: { hat: "hat-cap", back: "back-cout" } }, XAV)).json();
  eq(xW1.outfit, { fur: "fur-orange", hat: "hat-cap", back: "back-cout" }, "換裝");
  eq((await (await fetch(base + "/api/quest", { headers: XAV })).json()).outfit, xW1.outfit, "裝扮有存起來");
  let xPoor = 0; for (let k = 0; k < 20; k++) { const r = await xAdvpost("/api/quest/buy", { item: ["fur-black", "fur-white", "face-shades", "neck-red", "neck-blue", "fur-gray", "fur-cream", "hat-fisher"][k % 8] }, XAV); if (r.status === 400) xPoor++; }
  ok(xPoor > 0, "小魚乾不夠就買不了");
  ok((await (await fetch(base + "/api/quest", { headers: XAV })).json()).fish >= 0, "小魚乾不會變負的");
  // 貓窩：家具目錄、購買、擺設
  {
    const { DEN, DEN_ITEM, ROOM, PX, artH, unlockedOf, layoutError, findPath, floorBlocked } = await import("../shared/den.js");
    ok(new Set(DEN.map((x) => x.id)).size === DEN.length && DEN.every((x) => x.id.startsWith("den-") && x.name && x.how), "貓窩：家具 id 不重複、以 den- 開頭、有名稱和取得方式");
    for (const it of DEN) {
      ok(Number.isInteger(it.w) && Number.isInteger(it.h) && it.w > 0 && it.h > 0 && ["floor", "wall"].includes(it.zone), `${it.id}：大小與位置`);
      ok(it.art.length % PX === 0 && it.art.every((r) => r.length === it.w * PX && [...r].every((c) => c === "." || it.pal[c])), `${it.id}：像素圖格式`);
      ok(artH(it) >= it.h && (it.zone === "floor" ? ROOM.wall + it.h - artH(it) >= 0 : artH(it) === it.h && it.h <= ROOM.wall), `${it.id}：圖的高度放得進房間`);
      ok(it.learn || it.from ? !("price" in it) : Number.isInteger(it.price) && it.price >= 20 && it.price <= 80, `${it.id}：學習家具、世界 Boss 限定不能買，其他 20～80 條小魚乾`);
      if (it.from) ok(it.from.startsWith("boss:") && BOSS.get(it.from.slice(5))?.item === it.id, `${it.id}：世界 Boss 限定家具對得上`);
      if (it.slots) ok(it.slots.every(([x, y]) => x >= 0 && y >= 0 && x + it.slotSize[0] <= it.w * PX && y + it.slotSize[1] <= it.art.length), `${it.id}：書、獎盃、剪報的位置在圖裡面`);
    }
    ok(DEN.filter((x) => !x.learn).length >= 8 && ["den-books", "den-trophy", "den-news"].every((id) => DEN_ITEM.get(id)?.learn), "貓窩：3 件學習家具、8 件以上商店家具");
    eq([unlockedOf({ books: [], trophies: [], news: 2 }), unlockedOf({ books: ["cpp-1"], trophies: ["cpp-1-5"], news: 3 })], [[], ["den-books", "den-trophy", "den-news"]], "貓窩：學習家具的解鎖條件");
    // 貓找路
    {
      const step1 = (p, from) => p.every((k, i) => { const q = i ? p[i - 1] : from; return Math.abs(k.tx - q.tx) + Math.abs(k.ty - q.ty) === 1; });
      const wall = new Set(["5,3", "5,4", "5,5", "5,6"]), bl = (x, y) => wall.has(x + "," + y);
      const p1 = findPath({ tx: 3, ty: 4 }, { tx: 7, ty: 4 }, bl);
      ok(p1 && step1(p1, { tx: 3, ty: 4 }) && p1.every((k) => !bl(k.tx, k.ty)) && p1.at(-1).tx === 7 && p1.at(-1).ty === 4, "貓找路：繞過擋住的格子 " + JSON.stringify(p1));
      eq(p1.length, 10, "貓找路：走最短的路");
      ok(p1.every((k) => k.ty >= ROOM.wall && k.ty < ROOM.h && k.tx >= 0 && k.tx < ROOM.w), "貓找路：只走地板");
      eq(findPath({ tx: 3, ty: 4 }, { tx: 7, ty: 4 }, (x, y) => x === 5), null, "貓找路：整排擋住就走不到");
      eq(findPath({ tx: 3, ty: 4 }, { tx: 7, ty: 4 }, (x, y) => x === 7 && y === 4), null, "貓找路：終點被佔住就走不到");
      eq(findPath({ tx: 3, ty: 4 }, { tx: 3, ty: 1 }, () => false), null, "貓找路：牆上走不到");
      eq(findPath({ tx: 3, ty: 4 }, { tx: 3, ty: 4 }, () => false), [], "貓找路：已經在那裡");
      const res = new Set(["4,4", "4,5", "3,5", "4,3"]), p2 = findPath({ tx: 3, ty: 4 }, { tx: 6, ty: 4 }, (x, y) => res.has(x + "," + y));
      ok(p2 && step1(p2, { tx: 3, ty: 4 }) && !p2.some((k) => res.has(k.tx + "," + k.ty)), "貓找路：不會踩到別隻貓預定的格子 " + JSON.stringify(p2));
      const fb = floorBlocked([{ id: "den-box", x: 0, y: 6 }, { id: "den-rug", x: 4, y: 5 }, { id: "den-cushion", x: 9, y: 7 }, { id: "den-window", x: 4, y: 0 }, { id: "den-tower", x: 7, y: 3 }]);
      eq([...fb].sort(), ["0,6", "1,6", "7,3", "8,3"], "貓找路：紙箱、貓跳台擋路，地毯、坐墊可以走過去，牆上的不算");
      const lay = [{ id: "den-books", x: 0, y: 3 }, { id: "den-trophy", x: 3, y: 3 }, { id: "den-tower", x: 6, y: 3 }, { id: "den-box", x: 8, y: 3 }];
      const fb2 = floorBlocked(lay), p3 = findPath({ tx: 0, ty: 7 }, { tx: 11, ty: 3 }, (x, y) => fb2.has(x + "," + y));
      ok(p3 && !p3.some((k) => fb2.has(k.tx + "," + k.ty)), "貓找路：靠牆一排家具也繞得過去");
    }
    const all = new Set(DEN.map((x) => x.id));
    eq([layoutError([{ id: "den-window", x: 0, y: 0 }, { id: "den-clock", x: 2, y: 2 }], all), layoutError([{ id: "den-clock", x: 0, y: 3 }], all), layoutError([{ id: "den-window", x: 0, y: 2 }], all)], ["", "「掛鐘」要掛在牆上", "「窗戶」要掛在牆上"], "貓窩：牆上的家具只能掛牆上");
    eq(await (await get("/api/quest/den")).json(), { login: false }, "貓窩：沒登入");
    eq((await xAdvpost("/api/quest/den/save", { layout: [] })).status, 401, "貓窩：沒登入不能存");
    const dLg = await fetch(base + "/auth/fake?sub=den-1&email=den@example.com", { redirect: "manual" });
    const DV = { Cookie: "mt_sess=" + /mt_sess=([^;]+)/.exec(dLg.headers.get("set-cookie"))[1] };
    const dGet = async () => (await fetch(base + "/api/quest/den", { headers: DV })).json();
    const d0 = await dGet();
    ok(d0.login && d0.fish === 0 && d0.owned.length === 0 && d0.unlocked.length === 0 && d0.layout.length === 0 && d0.books.length === 0 && d0.news === 0, "貓窩：一開始是空的 " + JSON.stringify(d0));
    eq(d0.cats, ["fur-orange"], "貓窩：一開始只有一隻橘貓");
    const dBuy0 = await xAdvpost("/api/quest/den/buy", { item: "den-box" }, DV);
    ok(dBuy0.status === 400 && (await dBuy0.json()).error.includes("不夠"), "貓窩：小魚乾不夠買不了");
    await xAdvpost("/api/quest/clear", { level: "cpp-1-1", rule: "back", events: xFast("cpp-1-1") }, DV);
    eq((await xAdvpost("/api/quest/den/buy", { item: "den-books" }, DV)).status, 400, "貓窩：學習家具不能買");
    eq((await xAdvpost("/api/quest/den/buy", { item: "hat-cap" }, DV)).status, 400, "貓窩：裝扮不能用這裡買");
    const dB1 = await (await xAdvpost("/api/quest/den/buy", { item: "den-box" }, DV)).json();
    ok(dB1.ok && dB1.fish === 30 - DEN_ITEM.get("den-box").price && dB1.owned.includes("den-box"), "貓窩：買紙箱 " + JSON.stringify(dB1));
    eq((await xAdvpost("/api/quest/den/buy", { item: "den-box" }, DV)).status, 400, "貓窩：已經有的不能再買");
    const dSave = async (layout) => xAdvpost("/api/quest/den/save", { layout }, DV);
    const dS1 = await (await dSave([{ id: "den-box", x: 0, y: 3 }])).json();
    ok(dS1.ok && JSON.stringify(dS1.layout) === JSON.stringify([{ id: "den-box", x: 0, y: 3 }]), "貓窩：存擺設");
    eq((await dGet()).layout, [{ id: "den-box", x: 0, y: 3 }], "貓窩：擺設有存起來");
    eq((await dSave([{ id: "den-box", x: 11, y: 5 }])).status, 400, "貓窩：超出房間不行");
    eq((await dSave([{ id: "den-box", x: 0, y: 8 }])).status, 400, "貓窩：超出房間下面不行");
    eq((await dSave([{ id: "den-box", x: -1, y: 4 }])).status, 400, "貓窩：負的座標不行");
    eq((await dSave([{ id: "den-box", x: 0.5, y: 4 }])).status, 400, "貓窩：座標要是整數");
    eq((await dSave([{ id: "den-box", x: 0, y: 1 }])).status, 400, "貓窩：地板家具不能掛牆上");
    eq((await dSave([{ id: "den-cushion", x: 4, y: 4 }])).status, 400, "貓窩：沒買的不能擺");
    eq((await dSave([{ id: "den-books", x: 4, y: 4 }])).status, 400, "貓窩：還沒解鎖的學習家具不能擺");
    eq((await dSave([{ id: "den-nope", x: 4, y: 4 }])).status, 400, "貓窩：沒有這個家具");
    eq((await dSave([{ id: "den-box", x: 0, y: 3 }, { id: "den-box", x: 4, y: 4 }])).status, 400, "貓窩：同一件不能擺兩個");
    eq((await dSave(Array.from({ length: 31 }, () => ({ id: "den-box", x: 0, y: 3 })))).status, 400, "貓窩：最多 30 件");
    eq((await dSave("nope")).status, 400, "貓窩：格式不對");
    for (const id of ["cpp-1-2", "cpp-1-3", "cpp-1-4", "cpp-1-5"]) await xAdvpost("/api/quest/clear", { level: id, rule: "back", events: xFast(id) }, DV);
    const d1 = await dGet();
    ok(d1.books.includes("cpp-1") && d1.trophies.includes("cpp-1-5") && d1.unlocked.includes("den-books") && d1.unlocked.includes("den-trophy") && !d1.unlocked.includes("den-news") && d1.news === 0, "貓窩：打倒第 1 章 Boss，書櫃多一本書、獎盃架多一座獎盃 " + JSON.stringify(d1));
    ok(!d1.books.includes("cpp-2") && d1.trophies.length === 1, "貓窩：沒打倒的章不算");
    const dF = await (await xAdvpost("/api/quest/buy", { item: "fur-gray" }, DV)).json();
    ok(dF.ok && dF.owned.includes("fur-gray"), "貓窩：用小魚乾買灰貓毛色");
    eq((await dGet()).cats, ["fur-orange", "fur-gray"], "貓窩：買了毛色就多一隻貓");
    ok(!(await dGet()).owned.includes("fur-gray"), "貓窩：毛色不算家具");
    const dB2 = await (await xAdvpost("/api/quest/den/buy", { item: "den-cushion" }, DV)).json();
    ok(dB2.ok && dB2.owned.includes("den-cushion"), "貓窩：買坐墊");
    eq((await dSave([{ id: "den-box", x: 0, y: 3 }, { id: "den-cushion", x: 1, y: 3 }])).status, 400, "貓窩：家具重疊不行");
    eq((await dSave([{ id: "den-books", x: 4, y: 4 }, { id: "den-trophy", x: 6, y: 4 }])).status, 400, "貓窩：學習家具也不能重疊");
    const good = [{ id: "den-box", x: 0, y: 3 }, { id: "den-cushion", x: 2, y: 3 }, { id: "den-books", x: 4, y: 3 }, { id: "den-trophy", x: 7, y: 3 }];
    const dS2 = await (await dSave(good)).json();
    ok(dS2.ok && dS2.layout.length === 4, "貓窩：擺學習家具和買來的家具");
    eq((await dGet()).layout, good, "貓窩：重新讀取擺設一樣");
    eq((await xAdvpost("/api/quest/den/save", { layout: good })).status, 401, "貓窩：別人（沒登入）不能改");
    ok(!(await (await fetch(base + "/api/quest/den", { headers: XAV })).json()).owned.includes("den-box"), "貓窩：每個人的家具分開");
    ok((await get("/den.js")).status === 200 && (await get("/den-cats.js")).status === 200 && (await get("/shared/den.js")).status === 200 && (await (await get("/quest")).text()).includes('id="goDen"'), "貓窩：前端程式與按鈕");
  }
  // 世界 Boss
  {
    const bGet = async (C = {}) => (await fetch(base + "/api/boss", { headers: C })).json();
    const bHit = (piece, events, C = {}, extra = {}) => xAdvpost("/api/boss/hit", { piece, rule: "back", events, ...extra }, C);
    const s0 = await bGet();
    const theme = s0.boss.theme, ps = piecesOf(theme), pc = ps.reduce((a, p) => (p.chars < a.chars ? p : a));
    ok(!s0.login && s0.boss.name && s0.boss.art.length === 14 && !("me" in s0) && s0.top.length === 0 && s0.end - s0.start === 7 * 86400000, "世界 Boss：沒登入也看得到血條和排行 " + JSON.stringify(s0).slice(0, 200));
    eq([s0.hp, s0.left, s0.defeated], [baseHp(0, theme), baseHp(0, theme), false], "世界 Boss：上週沒人打字，血量用下限人數算");
    ok((await get("/shared/boss.js")).status === 200, "世界 Boss：前端程式");
    eq((await bHit(pc.id, human(pc.texts, { seed: 1, gap: [45, 130], errRate: 0 }).evs)).status, 401, "世界 Boss：沒登入不能打");
    const bl = async (sub) => ({ Cookie: "mt_sess=" + /mt_sess=([^;]+)/.exec((await fetch(base + `/auth/fake?sub=${sub}`, { redirect: "manual" })).headers.get("set-cookie"))[1] });
    const B1 = await bl("boss-1"), B2 = await bl("boss-2");
    await fetch(base + "/api/me/nick", { method: "POST", headers: { ...B1, "Content-Type": "application/json" }, body: JSON.stringify({ nick: "打王貓" }) });
    const ev = (seed) => human(pc.texts, { seed, gap: [45, 130], errRate: 0 }).evs;
    const h1 = await (await bHit(pc.id, ev(1), B1)).json();
    ok(h1.ok && h1.counted && !h1.flagged && h1.bonus === 1.5 && h1.dmg === damageOf({ correct: pc.chars, acc: 1 }) && h1.fish === BOSS_FISH.hit && h1.today === 1, "世界 Boss：出擊造成傷害 " + JSON.stringify({ ...h1, state: 0 }));
    eq(h1.state.left, s0.hp - h1.dmg, "世界 Boss：共用血條扣血");
    ok(h1.state.me.dmg === h1.dmg && h1.state.me.rank === 1 && h1.state.top[0].name === "打王貓" && h1.state.top[0].me && h1.state.recent[0].dmg === h1.dmg, "世界 Boss：我的傷害、排行、最近的攻擊");
    const hb = await (await bHit(pc.id, human(pc.texts, { gap: [3, 6], errRate: 0 }).evs, B1)).json();
    ok(hb.ok && hb.flagged && hb.dmg === 0 && hb.fish === 0 && hb.today === 1 && hb.state.left === h1.state.left, "世界 Boss：驗算可疑不扣血、不算次數");
    eq((await bHit(pc.id, ev(2).slice(0, 3), B1)).status, 400, "世界 Boss：沒打完不收");
    eq((await bHit("q:nope:0", ev(2), B1)).status, 400, "世界 Boss：不是這週主題的文字不收");
    eq((await bHit(pc.id, ev(2), B1, { rule: "block" })).status, 400, "世界 Boss：只收要倒退修");
    eq((await bGet()).left, h1.state.left, "世界 Boss：驗算失敗的都沒扣血");
    let hk; for (let k = 0; k < DAILY_CAP - 1; k++) hk = await (await bHit(pc.id, ev(10 + k), B1)).json();
    ok(hk.counted && hk.today === DAILY_CAP, "世界 Boss：每天前 " + DAILY_CAP + " 次算傷害");
    const ho = await (await bHit(pc.id, ev(30), B1)).json();
    ok(ho.ok && !ho.counted && ho.over && ho.dmg === 0 && ho.raw > 0 && ho.fish === 0 && ho.state.left === hk.state.left, "世界 Boss：超過次數還能打，但不扣血、沒有小魚乾");
    const h2 = await (await bHit(pc.id, ev(40), B2)).json();
    ok(h2.counted && h2.dmg > 0 && h2.state.players === 2 && h2.state.top[1].name === "（還沒取暱稱）", "世界 Boss：第二個人一起打");
    const vb = await (await xAdvpost("/api/vlink", { kind: "boss", piece: pc.id, rule: "back", events: ev(1) }, B1)).json();
    const vbd = await (await get("/api/vlink/" + vb.id)).json();
    ok(vb.ok && vbd.scene === "battle" && vbd.boss.name === s0.boss.name && vbd.texts.join("") === pc.texts.join(""), "世界 Boss：出擊也能做縮時影片");
    // 管理頁
    const bal = await fetch(base + "/admin/login", { method: "POST", headers: O, body: "password=pw", redirect: "manual" });
    const BA = { Cookie: "mt_admin=" + /mt_admin=([^;]+)/.exec(bal.headers.get("set-cookie"))[1] };
    const bp = await (await get("/admin/boss", BA)).text();
    ok(bp.includes("世界 Boss") && bp.includes(s0.boss.name) && bp.includes("打王貓") && bp.includes("血量倍率"), "世界 Boss：管理頁");
    eq((await get("/admin/boss")).status, 200, "世界 Boss：管理頁沒登入只有登入表單");
    ok(!(await (await get("/admin/boss")).text()).includes("打王貓"), "世界 Boss：管理頁沒登入看不到排行");
    const hpNow = (await bGet()).hp;
    ok((await post("/admin/boss", "action=mult&value=2", BA)).headers.get("location").includes("m=bossmult"), "世界 Boss：調血量倍率");
    eq((await bGet()).hp, hpNow * 2, "世界 Boss：倍率馬上生效");
    ok((await post("/admin/boss", "action=mult&value=50", BA)).headers.get("location").includes("m=bad"), "世界 Boss：倍率超出範圍不收");
    ok((await fetch(base + "/admin/boss", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...BA }, body: "action=mult&value=3", redirect: "manual" })).headers.get("location").includes("m=origin"), "世界 Boss：沒有 Origin 不能改");
    await post("/admin/boss", "action=mult&value=1", BA);
    eq((await bGet()).hp, hpNow, "世界 Boss：倍率改回 1");
    // 打倒：管理員把血量設成只剩一點點，下一擊就打倒
    const st1 = await bGet(B1), dealt = st1.hp - st1.left, fish1 = (await (await fetch(base + "/api/quest", { headers: B1 })).json()).fish;
    ok((await post("/admin/boss", `action=hp&value=${dealt + 5}`, BA)).headers.get("location").includes("m=bosshp"), "世界 Boss：手動設定血量");
    eq((await bGet()).left, 5, "世界 Boss：手動血量馬上生效");
    const hkill = await (await bHit(pc.id, ev(50), B2)).json();
    ok(hkill.killed && hkill.dmg === 5 && hkill.state.defeated && hkill.state.left === 0, "世界 Boss：最後一擊打倒（只扣到 0） " + JSON.stringify({ ...hkill, state: 0 }));
    const item = s0.boss.item.id, isOutfit = !!ITEM.get(item);
    const st2 = await bGet(B1), q2 = await (await fetch(base + "/api/quest", { headers: B1 })).json(), d2 = await (await fetch(base + "/api/quest/den", { headers: B1 })).json();
    ok(st2.rewards.length === 1 && st2.rewards[0].rank === 1 && st2.rewards[0].fish === BOSS_FISH.clear + BOSS_FISH.top[0] && st2.rewards[0].item.id === item, "世界 Boss：第 1 名的獎勵 " + JSON.stringify(st2.rewards));
    eq(q2.fish, fish1 + BOSS_FISH.clear + BOSS_FISH.top[0], "世界 Boss：小魚乾已經發了");
    ok(isOutfit ? q2.owned.includes(item) : d2.owned.includes(item), "世界 Boss：拿到限定" + (isOutfit ? "裝扮" : "家具"));
    const r2 = (await bGet(B2)).rewards;
    ok(r2.length === 1 && r2[0].rank === 2 && r2[0].fish === BOSS_FISH.clear + BOSS_FISH.top[1], "世界 Boss：第 2 名的獎勵");
    const hlate = await (await bHit(pc.id, ev(60), B2)).json();
    ok(hlate.ok && hlate.late && hlate.dmg === 0 && !hlate.killed, "世界 Boss：打倒之後再打不扣血");
    await post("/admin/boss", "action=hp&value=1", BA);
    await bGet(B1); await bGet(B2);
    eq((await (await fetch(base + "/api/quest", { headers: B1 })).json()).fish, q2.fish, "世界 Boss：獎勵只發一次（血量再改也不會重發）");
    eq((await bGet(B1)).rewards.length, 1, "世界 Boss：獎勵通知只有一筆");
    eq((await xAdvpost("/api/boss/seen", {})).status, 401, "世界 Boss：沒登入不能收下");
    ok((await (await xAdvpost("/api/boss/seen", {}, B1)).json()).ok && (await bGet(B1)).rewards.length === 0 && (await bGet(B2)).rewards.length === 1, "世界 Boss：收下後通知就不見（別人的還在）");
    ok((await (await get("/admin/boss", BA)).text()).includes("2 人"), "世界 Boss：管理頁看得到發了幾個人");
    ok((await post("/admin/boss", "action=hp&value=", BA)).headers.get("location").includes("m=bosshpclear"), "世界 Boss：取消手動血量");
    ok((await bGet()).defeated, "世界 Boss：打倒了就一直是打倒");
    ok((await (await get("/privacy")).text()).includes("世界 Boss"), "世界 Boss：隱私權政策有寫");
  }
  // 每日新聞
  const nList = await (await fetch(base + "/api/news", { headers: XAV })).json();
  ok(nList.today === twDate() && nList.list.some((n) => n.date === "2026-11-27") && nList.list.every((n) => n.date <= nList.today), "每日新聞列表（不含未來的日期）");
  const nDay = await (await get("/api/news/2026-11-27")).json();
  ok(nDay.paras.length >= 2 && nDay.vocab.length >= 5 && nDay.sources[0].url.startsWith("https://"), "讀一天的新聞");
  eq((await get("/api/news/2099-01-01")).status, 404, "未來或不存在的日期");
  const nLv = withSegs(newsLevel(nDay)), nEv = human(nLv.segs[0], { seed: 4, gap: [45, 120], errRate: 0 }).evs;
  // 分段的關卡：一段一段打（沒登入時，前面幾段的成績由瀏覽器帶著）
  const playSegs = async (lv, C, seed = 4) => {
    const prior = []; let r;
    for (let k = 0; k < lv.segs.length; k++) {
      r = await (await xAdvpost("/api/quest/clear", { level: lv.id, rule: "back", seg: k, prior, events: human(lv.segs[k], { seed: seed + k, gap: [45, 120], errRate: 0 }).evs }, C)).json();
      if (r.part) prior.push(r.part);
    }
    return r;
  };
  ok(nLv.segs.length >= 2, "每日新聞會分段（" + nLv.chars + " 字，" + nLv.segs.length + " 段）");
  const nA = await playSegs(nLv);
  ok(nA.ok && nA.stars === 3 && nA.fish === 0, "沒登入也能打每日新聞（沒有小魚乾）");
  const nS0 = await (await xAdvpost("/api/quest/clear", { level: nLv.id, rule: "back", seg: 0, events: nEv }, XAV)).json();
  ok(nS0.ok && nS0.saved && nS0.seg === 0 && nS0.segs === nLv.segs.length && nS0.stars === undefined, "打完第 1 段：存檔，還沒結算");
  eq((await (await fetch(base + "/api/quest", { headers: XAV })).json()).segs[nLv.id], 1, "冒險進度記得打到第幾段");
  eq((await xAdvpost("/api/quest/clear", { level: nLv.id, rule: "back", seg: nLv.segs.length - 1, events: human(nLv.segs[nLv.segs.length - 1], { seed: 9, gap: [45, 120], errRate: 0 }).evs }, XAV)).status, nLv.segs.length > 2 ? 400 : 200, "中間的段落沒打不能結算");
  eq((await xAdvpost("/api/quest/clear", { level: nLv.id, rule: "back", seg: 99, events: nEv }, XAV)).status, 400, "段落編號不對");
  const nB = await playSegs(nLv, XAV, 20);
  ok(nB.stars === 3 && nB.speed > 0 && Math.abs(nB.acc - 1) < 1e-9, "最後一段：全部段落合起來算星星");
  ok(!(await (await fetch(base + "/api/quest", { headers: XAV })).json()).segs[nLv.id], "結算後分段紀錄清掉");
  eq(nB.fish, 3 * (nDay.date === twDate() ? NEWS_FISH.today : NEWS_FISH.history), "每日新聞第一次三星的小魚乾");
  eq((await xAdvpost("/api/quest/clear", { level: "news-2099-01-01", rule: "back", events: nEv })).status, 400, "不存在的新聞不能打");
  ok((await (await fetch(base + "/api/quest", { headers: XAV })).json()).avg.cpp > 0, "平均速度（估計時間用）");
  const nBoard = await (await fetch(base + "/api/news/2026-11-27/board", { headers: XAV })).json();
  ok(nBoard.length === 1 && nBoard[0].me && nBoard[0].stars === 3, "每日新聞排行榜");
  // 每天 3 篇：打完任一篇就算今天完成，每篇各有排行榜
  const nL2 = await (await fetch(base + "/api/news", { headers: XAV })).json();
  const t3 = nL2.list.filter((n) => n.date === NT && n.key !== NT);
  eq(t3.map((n) => n.key), [1, 2, 3].map((k) => `${NT}-${k}`), "今天有 3 篇（照編號）");
  ok(t3.every((n) => n.stars === 0 && n.chars > 0), "每篇各自的星星、字數");
  const n1 = await (await get(`/api/news/${NT}-1`)).json();
  ok(n1.key === NT + "-1" && newsLevel(n1).id === `news-${NT}-1` && newsLevel(n1).news.date === NT, "讀一篇（日期-編號）");
  eq([(await get(`/api/news/${NT}-0`)).status, (await get(`/api/news/${NT}-12`)).status, (await get(`/api/news/${NT}-4`)).status], [404, 404, 404], "編號不對、不存在");
  const playOne = async (k, C) => { const lv = withSegs(newsLevel(await (await get(`/api/news/${NT}-${k}`)).json())); return playSegs(lv, C, 30 + k); };
  const r1 = await playOne(1, XAV), r2 = await playOne(2, XAV);
  ok(r1.ok && r1.stars === 3 && r2.ok && r2.stars === 3, "今天的第 1、2 篇都能打");
  eq([r1.fish, r2.fish], [3 * NEWS_FISH.today, 3 * NEWS_FISH.today], "多打的那篇一樣有小魚乾（連續天數加碼一天只給一次）");
  const nL3 = await (await fetch(base + "/api/news", { headers: XAV })).json();
  ok(nL3.streak === 1 && nL3.list.find((n) => n.key === NT + "-2").stars === 3 && nL3.list.find((n) => n.key === NT + "-3").stars === 0, "同一天打很多篇，連續天數還是 1 天");
  const nb2 = await (await fetch(base + `/api/news/${NT}-2/board`, { headers: XAV })).json(), nb3 = await (await fetch(base + `/api/news/${NT}-3/board`, { headers: XAV })).json();
  ok(nb2.length === 1 && nb2[0].me && nb3.length === 0, "每篇各有排行榜");
  // 學生打自訂題組
  const setD = await (await get("/api/set/" + setId)).json();
  eq([setD.texts, setD.target, setD.lang], [["The cat's \"big\" day - fun.", "It sat on the mat.", "Second story here."], 25, "en"], "題組內容（彎引號、破折號換掉，每行一段）");
  ok((await (await get("/t/" + setId)).text()).includes("quest.js"), "/t/編號 打開冒險模式的頁面");
  const setLv = withSegs(customLevel(setD));
  const sA = await playSegs(setLv, XAV, 40);
  ok(sA.ok && sA.stars === 3 && sA.fish === 0, "打自訂題組：有星星、沒有小魚乾");
  const sB = await (await fetch(base + `/api/set/${setId}/board`, { headers: XAV })).json();
  ok(sB.length === 1 && sB[0].me, "題組排行榜");
  eq([(await get("/api/set/zzzzzz")).status, (await get("/api/set/abc")).status], [404, 404], "不存在的題組");
  // 影片連結（電腦打完、手機掃 QR code 做影片）
  ok(["/qr.js", "/vidui.js", "/v.js"].every(Boolean) && (await get("/qr.js")).status === 200 && (await get("/vidui.js")).status === 200 && (await get("/v.js")).status === 200, "影片連結的程式");
  const vq = await (await xAdvpost("/api/vlink", { kind: "quest", level: "cpp-1-1", rule: "back", events: xFast("cpp-1-1") }, XAV)).json();
  ok(vq.ok && /^[0-9A-Za-z]{8}$/.test(vq.id) && vq.days === 7, "冒險模式的影片連結");
  const vqd = await (await get("/api/vlink/" + vq.id)).json();
  ok(vqd.scene === "battle" && vqd.texts.length && vqd.boss.name && vqd.stars === 3 && vqd.outfit?.fur && vqd.events.length > 10, "影片連結的內容（題目、怪物、星星、裝扮）");
  eq((await get("/v/" + vq.id)).status, 200, "手機上的影片頁");
  ok(vqd.level === "cpp-1-1" && vqd.speed > 0 && vqd.acc > 0.9, "影片／挑戰連結記下關卡和驗算過的速度（挑戰用）");
  const on1 = await (await post("/api/online", JSON.stringify({ id: "abc123def456" }), { "Content-Type": "application/json" })).json();
  const on2 = await (await post("/api/online", JSON.stringify({ id: "abc123def456" }), { "Content-Type": "application/json" })).json();
  const on3 = await (await post("/api/online", JSON.stringify({ id: "zzz999zzz999" }), { "Content-Type": "application/json" })).json();
  const on4 = await (await post("/api/online", JSON.stringify({ id: "<bad>" }), { "Content-Type": "application/json" })).json();
  eq([on1.n, on2.n, on3.n, on4.n], [1, 1, 2, 2], "線上人數：同一個瀏覽器只算一次、亂寫的代號不算");
  ok((await (await get("/healthz")).json()).online === 2 && (await (await get("/")).text()).includes('id="online"'), "線上人數：healthz、首頁");
  ok((await get("/quest?ch=" + vq.id)).status === 200 && (await get("/quest?lv=cpp-1-2")).status === 200, "挑戰連結、關卡連結打開冒險模式頁");
  const vp = await (await xAdvpost("/api/vlink", { kind: "practice", c: "cpp", l: "para", m: "full", rule: "back", specs: [spec], events: evs })).json();
  const vpd = await (await get("/api/vlink/" + vp.id)).json();
  ok(vp.ok && vpd.scene === "race" && vpd.texts[0] === text && vpd.nick === "" && vpd.outfit === null, "一般練習的影片連結（沒登入：沒有暱稱和裝扮）");
  eq((await xAdvpost("/api/vlink", { kind: "practice", c: "cpp", l: "para", m: "full", rule: "back", specs: [spec], events: human([text], { gap: [3, 6], errRate: 0 }).evs })).status, 400, "可疑的打字不能做影片連結");
  eq((await xAdvpost("/api/vlink", { kind: "practice", c: "cpp", l: "para", m: "full", rule: "back", specs: [{ c: "py", l: "para", i: [0] }], events: evs })).status, 400, "題目對不上不行");
  eq((await get("/api/vlink/AAAAAAAA")).status, 404, "不存在的影片連結");
  ok(!JSON.stringify(ex).includes(text.slice(0, 20)), "資料庫不存打字內容");
  ok(!JSON.stringify(ex).includes("cat@example.com") && !JSON.stringify(ex).includes("g-123"), "匯出資料不含 email 與 Google 編號");
} catch (e) { fail++; console.log("✗ 伺服器測試出錯：" + e.stack + "\n" + log.slice(-600)); }
finally { srv.kill(); rmSync(dir, { recursive: true, force: true }); }

console.log(`測試：${pass} 項通過，${fail} 項失敗`);
process.exit(fail ? 1 : 0);
