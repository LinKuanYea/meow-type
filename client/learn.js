// 「學一下」卡片：打完之後的教學內容
// - 程式（句子、整段）：先考「這段程式會輸出什麼？」（可跳過），答完或跳過才看一句話說明與逐行註解
// - 程式（單詞）：每一行在做什麼
// - 英文：單字與片語（中文、詞性、程度、例句）
// - 中文（單詞）：成語意思
import { itemsOf } from "/shared/bank.js";
import { esc } from "/shared/analyze.js";

const LV = { 1: "國中", 2: "高中" };
const lv = (n) => (n ? `<span class="lv lv${n}">${LV[n]}</span>` : "");
const pre = (s) => `<pre class="out">${esc(s === "" ? "（沒有輸出）" : s)}</pre>`;

/** 洗牌（固定種子，同一題每次選項順序一樣） */
function shuffle(arr, seed) {
  const a = arr.slice(); let s = [...seed].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 7);
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function codeHTML(it) {
  return it.t.split("\n").map((line, i) => {
    const note = it.notes[i];
    const code = esc(line) || " ";
    return note ? `<details class="ln"><summary><code>${code}</code></summary><p>${esc(note)}</p></details>` : `<div class="ln"><code>${code}</code></div>`;
  }).join("");
}

/** 回傳 { html, bind(root, log) }；沒有可教的內容回傳 null */
export function learnCard(spec, cat, len) {
  const items = spec && itemsOf(spec);
  if (!items) return null;
  const it = items[0];
  if ((cat === "cpp" || cat === "py") && len !== "word" && it.quiz) {
    const opts = shuffle([it.quiz.out, ...it.quiz.wrong], it.id);
    return {
      html: `<section class="learn" id="learn"><h3>學一下：${esc(it.title)} <small>${esc(it.unit)}・老師的寫法</small></h3>
        <div class="quiz" id="quiz"><p class="q"><b>考考你</b>　${it.quiz.input ? "輸入下面的資料，" : ""}這段程式會輸出什麼？</p>
          ${it.quiz.input ? `<p class="inl">輸入</p>${pre(it.quiz.input)}` : ""}
          <div class="opts2">${opts.map((o, k) => `<button type="button" class="opt" data-k="${k}">${pre(o)}</button>`).join("")}</div>
          <button type="button" class="link" id="qskip">跳過，直接看說明</button></div>
        <div class="explain" id="explain" hidden><p class="sum">${esc(it.summary)}</p>
          <div class="codebox"><div class="cbh"><span>點有 ▸ 的那一行看說明</span><button type="button" class="link" id="openAll">全部展開</button></div>${codeHTML(it)}</div></div></section>`,
      bind(root, log) {
        const reveal = () => { root.querySelector("#explain").hidden = false; root.querySelector("#qskip").hidden = true; };
        root.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
          if (log.answered || log.skipped) return;
          const right = opts[+b.dataset.k] === it.quiz.out;
          log.answered = 1; log.correct = right ? 1 : 0;
          root.querySelectorAll(".opt").forEach((x) => { x.disabled = true; if (opts[+x.dataset.k] === it.quiz.out) x.classList.add("right"); });
          if (!right) b.classList.add("wrong");
          root.querySelector("#quiz").insertAdjacentHTML("beforeend", `<p class="verdict ${right ? "ok" : "no"}">${right ? "答對了！" : "不是這個。綠色的才是正確的輸出，看看下面的說明想想為什麼。"}</p>`);
          reveal(); log.onAnswer?.(right);
        }));
        root.querySelector("#qskip").addEventListener("click", () => { if (!log.answered) log.skipped = 1; reveal(); });
        root.querySelector("#explain").addEventListener("toggle", (e) => { if (e.target.open) log.opened++; }, true);
        root.querySelector("#openAll").addEventListener("click", () => root.querySelectorAll("#explain details").forEach((d) => { d.open = true; }));
      },
    };
  }
  if ((cat === "cpp" || cat === "py") && len === "word") {
    return { html: `<section class="learn"><h3>學一下：這幾行在做什麼</h3><dl class="vocab">${items.map((x) =>
      `<div><dt><code>${esc(x.t)}</code></dt><dd>${esc(x.note)}<small>出自「${esc(x.from)}」</small></dd></div>`).join("")}</dl></section>`, bind() {} };
  }
  if (cat === "en") {
    const list = len === "word" ? items.map((x) => ({ w: x.t, pos: x.pos, zh: x.zh, lv: x.lv })) : it.vocab;
    return { html: `<section class="learn"><h3>學一下：${len === "word" ? "這次打的單字" : "單字與片語"}</h3><dl class="vocab">${list.map((x) =>
      `<div><dt>${esc(x.w)} <i>${esc(x.pos)}</i> ${lv(x.lv)}</dt><dd>${esc(x.zh)}${x.ex ? `<small>${esc(x.ex)}</small>` : ""}</dd></div>`).join("")}</dl></section>`, bind() {} };
  }
  if (cat === "zh" && len === "word") {
    const idioms = items.filter((x) => typeof x === "object");
    if (!idioms.length) return null;
    return { html: `<section class="learn"><h3>學一下：成語</h3><dl class="vocab">${idioms.map((x) => `<div><dt>${esc(x.t)}</dt><dd>${esc(x.zh)}</dd></div>`).join("")}</dl></section>`, bind() {} };
  }
  return null;
}
