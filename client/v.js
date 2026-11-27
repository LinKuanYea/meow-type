// /v/<編號>：在電腦上打完、掃 QR code 後，在手機上做同一支縮時影片
import { videoPanel, canMakeVideo } from "/vidui.js";
import { esc } from "/shared/analyze.js";

const $ = (s) => document.querySelector(s);
let tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2200); }
const id = location.pathname.split("/")[2];
(async () => {
  let v;
  try { const r = await fetch("/api/vlink/" + id, { cache: "no-store" }); v = await r.json(); if (!r.ok) throw new Error(v.error); }
  catch (e) { $("#vid").innerHTML = `<p class="nickrule">${esc(e.message || "連不上伺服器")}</p>`; return; }
  $("#vt").textContent = v.title;
  if (!canMakeVideo()) { $("#vid").innerHTML = '<p class="nickrule">這個瀏覽器不能做影片，請用 Chrome 或 Safari 打開這個連結。</p>'; return; }
  $("#vid").innerHTML = `<button type="button" class="main" id="go">🎬 做成縮時影片</button><span class="hint">${esc(v.title)}${v.nick ? `・${esc(v.nick)}` : ""}</span>`;
  $("#go").onclick = () => videoPanel($("#vid"), v, {
    toast, file: "meow-type",
    shareText: v.scene === "battle" ? `我在喵打打倒了${v.boss.name}！你打得贏嗎？ https://meow-type.otlab.org/quest` : "我在喵打練打字！你打得贏嗎？ https://meow-type.otlab.org/",
  });
  window.__mtReady = true;
})();
