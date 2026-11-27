// 打字框：顯示題目、游標、打對打錯的顏色，接收鍵盤與輸入法（一般練習與冒險模式共用）
// 判定一律交給 shared/judge.js 的 Typist；這裡只負責把鍵盤事件變成 [時間, 種類, …] 交給 h.event()
import { show, esc } from "/shared/analyze.js";

/**
 * els：{ box, txt, ta, comp }
 * h：{ ty(): 目前的 Typist 或 null、active(): 還在打（沒結束）、started(): 已經開始計時、
 *      isCode()、cat()、rule()、event(ev)、escape()、pasted()、ime()：輸入法在中文模式（打程式時） }
 */
export function TypeBox({ box, txt, ta, comp }, h) {
  let spans = [], composing = false, lastComp = { t: 0, d: "" };

  function build() {
    const ty = h.ty();
    txt.className = h.cat() === "zh" ? "zh" : "";
    const t = ty.text; let s = "", ls = true;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (c === "\n") { s += `<span class="nl">↵</span><br>`; ls = true; continue; }
      if (c === " " && ls && h.isCode()) { s += `<span class="ind">·</span>`; continue; }
      ls = false; s += `<span>${esc(c)}</span>`;
    }
    txt.innerHTML = s; spans = [...txt.querySelectorAll("span")]; txt.scrollTop = 0;
  }
  function paint() {
    const ty = h.ty(), fb = h.rule() === "back" ? ty.firstBad() : -1, n = ty.typed.length;
    spans.forEach((s, i) => {
      const t = ty.typed[i], base = s.classList.contains("ind") ? "ind" : s.classList.contains("nl") ? "nl" : "";
      let c = base;
      if (t === undefined) { if (i === n) c += " cur"; delete s.dataset.got; }
      else {
        const ok = t === ty.text[i] && (fb < 0 || i < fb);
        c += ok ? " ok" : " bad";
        if (!ok && t !== ty.text[i]) s.dataset.got = show(t); else delete s.dataset.got;
      }
      s.className = c.trim();
    });
    const cur = spans[Math.min(n, spans.length - 1)];
    if (cur) {
      const b = box.getBoundingClientRect(), r = cur.getBoundingClientRect();
      const x = (n >= spans.length ? r.right : r.left) - b.left, y = r.top - b.top;
      ta.style.left = x + "px"; ta.style.top = y + "px"; comp.style.left = x + "px"; comp.style.top = y - 4 + "px";
      const tr = txt.getBoundingClientRect();
      if (r.bottom > tr.bottom - 10 || r.top < tr.top) cur.scrollIntoView({ block: "center" });
    }
  }

  ta.addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Tab") { e.preventDefault(); if (h.isCode()) h.event([0, "t"]); }
    else if (e.key === "Escape") { e.preventDefault(); h.escape(); }
  });
  ta.addEventListener("beforeinput", (e) => {
    const t = e.inputType || "";
    if (composing || e.isComposing || t.includes("Composition")) return;
    e.preventDefault();
    if (t === "insertText") {
      const d = e.data || "";
      if (Date.now() - lastComp.t < 80 && d === lastComp.d) return;
      h.event([0, "i", d, 0]);
    } else if (t === "insertLineBreak" || t === "insertParagraph") h.event([0, "i", "\n", 0]);
    else if (t === "deleteContentBackward") h.event([0, "b"]);
    else if (t.startsWith("delete") && t.endsWith("Backward")) h.event([0, "w"]);
    else if (t.startsWith("insertFrom")) h.pasted();
  });
  ta.addEventListener("compositionstart", () => {
    composing = true;
    // 開始組字就開始計時（不然注音整句組好再按 Enter，時間幾乎是 0，速度會變成好幾百）
    if (h.active() && !h.started()) h.event([0, "c"]);
    // 程式題的字串裡可能有中文：下一個要打的字是中文就不提醒
    const ty = h.ty(), next = (ty && ty.text[ty.typed.length]) || "";
    if (h.cat() !== "zh" && h.active() && !/[　-鿿＀-￯]/.test(next)) h.ime();
  });
  ta.addEventListener("compositionupdate", (e) => { comp.textContent = e.data || ""; });
  ta.addEventListener("compositionend", (e) => {
    composing = false; comp.textContent = "";
    const d = e.data || ""; lastComp = { t: Date.now(), d };
    setTimeout(() => { ta.value = ""; }, 0);
    if (d) h.event([0, "i", d, 1]);
  });
  ta.addEventListener("input", () => { if (!composing) ta.value = ""; });
  ta.addEventListener("paste", (e) => { e.preventDefault(); h.pasted(); });
  ta.addEventListener("drop", (e) => { e.preventDefault(); h.pasted(); });
  ["copy", "cut", "contextmenu", "dragstart"].forEach((ev) => box.addEventListener(ev, (e) => e.preventDefault()));
  ta.addEventListener("focus", () => box.classList.add("on"));
  ta.addEventListener("blur", () => box.classList.remove("on"));
  box.addEventListener("mousedown", (e) => { e.preventDefault(); if (h.active()) ta.focus({ preventScroll: true }); });
  box.addEventListener("touchend", () => { if (h.active()) ta.focus({ preventScroll: true }); });

  return { build, paint, focus: () => { ta.value = ""; ta.focus({ preventScroll: true }); } };
}
