// 縮時影片的按鈕與面板（冒險模式、一般練習、手機上的 /v/ 頁面共用）
import { makeVideo, canMakeVideo } from "/video.js";
import { qrSVG } from "/qr.js";
import { esc } from "/shared/analyze.js";

export { canMakeVideo };
const isPhone = () => matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820;

/**
 * 在 box 裡做影片。opts：給 makeVideo 的設定；link：要做「手機掃描」連結時送給 /api/vlink 的資料（沒有就不顯示 QR）
 * shareText：分享時的文字
 */
export async function videoPanel(box, opts, { link, shareText, toast = () => {}, file = "meow-type" } = {}) {
  box.innerHTML = `<p><b>影片製作中…</b> <span class="vpct">0%</span></p><progress max="1" value="0"></progress>`;
  let v;
  try {
    v = await makeVideo(opts, (p) => { const b = box.querySelector("progress"); if (b) { b.value = p; box.querySelector(".vpct").textContent = Math.round(p * 100) + "%"; } });
  } catch (e) {
    box.innerHTML = `<p class="nickrule">做不出影片：${esc(e.message || String(e))}。${link ? "" : "換用 Chrome 或 Safari 試試看。"}</p>${link ? qrButton() : ""}`;
    bindQr(box, link, toast);
    return;
  }
  if (!document.body.contains(box)) return;
  const url = URL.createObjectURL(v.blob), name = `${file}.${v.ext}`;
  const f = new File([v.blob], name, { type: v.type });
  const canShare = !!navigator.canShare?.({ files: [f] }) && isPhone();
  box.innerHTML = `<video src="${url}" controls playsinline muted loop autoplay></video>
    <div class="vidbtns">${canShare ? '<button type="button" class="main vshare">分享（選 Instagram → 限時動態）</button>' : ""}<a class="acctbtn" href="${url}" download="${name}">下載影片</a>
    ${link && !canShare ? qrButton() : ""}</div>
    <p class="hint">${v.ext === "webm" ? "這個瀏覽器只能做 WebM 格式，IG 可能不收，建議用 Chrome 或 Safari。" : ""}</p>`;
  box.querySelector(".vshare")?.addEventListener("click", async () => {
    try { await navigator.share({ files: [f], title: "喵打", text: shareText }); }
    catch (e) { if (e.name !== "AbortError") toast("分享不了，改用下載吧"); }
  });
  bindQr(box, link, toast);
}
const qrButton = () => '<button type="button" class="vqr">📱 用手機掃描，在手機上分享</button><div class="qrbox" hidden></div>';
function bindQr(box, link, toast) {
  const b = box.querySelector(".vqr"); if (!b || !link) return;
  b.addEventListener("click", async () => {
    b.disabled = true; b.textContent = "產生連結中…";
    let r;
    try { const res = await fetch("/api/vlink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(link) }); r = await res.json(); if (!res.ok) throw new Error(r.error); }
    catch (e) { b.disabled = false; b.textContent = "📱 用手機掃描，在手機上分享"; return toast(e.message || "連不上伺服器"); }
    const u = `${location.origin}/v/${r.id}`, q = box.querySelector(".qrbox");
    q.innerHTML = `${qrSVG(u, 200)}<p>用手機相機掃描，打開後會在手機上做同一支影片，再分享到 IG。<br><a href="${u}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, ""))}</a>（${r.days} 天內有效）</p>`;
    q.hidden = false; b.remove();
  });
}
