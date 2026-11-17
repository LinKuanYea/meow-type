// 炫耀一下：成績圖片＋挑戰連結
import { CAT_NAME, LEN_NAME } from "/shared/bank.js";
import { unitOf } from "/shared/judge.js";
import { esc } from "/shared/analyze.js";
import { drawCat, PAL } from "/cat.js";

const RULE = { block: "擋下", back: "要倒退修", free: "可以帶錯" };
export const setText = (d) => `${CAT_NAME[d.c]}・${LEN_NAME[d.l]}・${d.m === "t60" ? "1 分鐘" : "打完一題"}`;
const dateText = (ts) => { const t = new Date(ts); return `${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()}`; };

async function fontsReady() {
  if (!document.fonts) return;
  const want = ['400 96px "DotGothic16"', '700 40px "Noto Sans TC"', '400 28px "Noto Sans TC"'];
  await Promise.race([Promise.all(want.map((f) => document.fonts.load(f, "喵打0123456789WPM字分"))), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
}

/**
 * 畫成績圖片（1200×630，LINE、IG 限動、Messenger 預覽都好看）
 * d = { name, c, l, m, rule, speed, acc, ms, correct, ts, url, beat? }
 */
export async function drawResultImage(d) {
  await fontsReady();
  const W = 1200, H = 630, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const SANS = '"Noto Sans TC", system-ui, sans-serif', PIX = '"DotGothic16", monospace';
  // 底：天空＋草地，像跑道
  g.fillStyle = "#fffaf2"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#cfeaf6"; g.fillRect(0, 0, W, 410);
  g.fillStyle = "#6dae4f"; g.fillRect(0, 410, W, 220);
  g.fillStyle = "rgba(255,255,255,.55)"; for (let x = 0; x < W; x += 56) g.fillRect(x, 520, 30, 6);
  // 終點旗
  for (let y = 300; y < 560; y += 20) for (let x = 0; x < 2; x++) { g.fillStyle = ((y / 20 + x) % 2) ? "#222" : "#fff"; g.fillRect(1110 + x * 20, y, 20, 20); }
  drawCat(g, 70, 330, 14, 1, PAL.me);
  // 標題列
  g.fillStyle = "#d9741a"; g.font = `400 64px ${PIX}`; g.textBaseline = "alphabetic"; g.fillText("喵打", 60, 98);
  g.fillStyle = "#2a1d14"; g.font = `700 34px ${SANS}`;
  g.fillText(`${d.name}　${setText(d)}`, 230, 92, 900);
  g.font = `400 24px ${SANS}`; g.fillStyle = "#5b4636";
  g.fillText(`打錯時：${RULE[d.rule] || ""}　${dateText(d.ts || Date.now())}`, 232, 130);
  // 大數字
  g.fillStyle = "#2a1d14"; g.font = `400 168px ${PIX}`;
  const sp = String(Math.round(d.speed));
  g.fillText(sp, 330, 330);
  const spW = g.measureText(sp).width;
  g.font = `700 44px ${SANS}`; g.fillStyle = "#d9741a"; g.fillText(unitOf(d.c), 350 + spW, 322);
  g.font = `400 30px ${SANS}`; g.fillStyle = "#2a1d14";
  g.fillText(`正確率 ${Math.round(d.acc * 100)}%　${(d.ms / 1000).toFixed(1)} 秒　打對 ${d.correct} 字`, 334, 384);
  if (d.beat) {
    g.font = `700 30px ${SANS}`; const t = `打敗了 ${d.beat}！`, w = g.measureText(t).width;
    g.fillStyle = "#d4302f"; g.beginPath(); g.roundRect ? g.roundRect(790, 180, w + 40, 56, 14) : g.rect(790, 180, w + 40, 56); g.fill();
    g.fillStyle = "#fff"; g.fillText(t, 810, 219);
  }
  // 下方：挑戰網址
  g.fillStyle = "rgba(42,29,20,.82)"; g.fillRect(0, 560, W, 70);
  g.fillStyle = "#fff"; g.font = `700 30px ${SANS}`;
  g.fillText(d.url ? `來挑戰我 → ${d.url.replace(/^https?:\/\//, "")}` : "喵打：貓咪打字練習", 60, 606, 1080);
  return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
}

/** 結算畫面的「炫耀一下」區塊 */
export function shareCard({ can, reason, nick }) {
  if (!can) return `<section class="brag"><h3>炫耀一下</h3><p class="hint">${esc(reason)}</p></section>`;
  return `<section class="brag" id="brag"><h3>炫耀一下</h3>
    <p>產生成績圖片和挑戰連結傳給朋友，他打開連結就能打同一題、跟你的速度比賽。</p>
    <form class="submit" id="shareForm"><label for="snick"><b>暱稱</b></label><input id="snick" maxlength="10" placeholder="暱稱（不要填真名）" value="${esc(nick)}" autocomplete="off"><button class="main" type="submit">產生挑戰連結</button><p id="shareMsg">連結任何人都打得開，會顯示你的暱稱和成績。</p></form>
    <div class="shareout" id="shareOut" hidden>
      <img id="shareImg" alt="成績圖片">
      <div class="sharebtns"><input id="shareUrl" readonly aria-label="挑戰連結">
        <button type="button" id="bCopy">複製連結</button><button type="button" id="bShare" hidden>分享…</button><a id="bDl" download="喵打成績.png">下載圖片</a></div>
    </div></section>`;
}

/** 綁定「產生挑戰連結」：create(name) 回傳 { id } 或 { error } */
export function bindShare(root, { create, imageData, toast }) {
  const f = root.querySelector("#shareForm");
  if (!f) return;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = root.querySelector("#snick").value.trim(), msg = root.querySelector("#shareMsg"), btn = f.querySelector("button");
    if (!name) { msg.textContent = "先填一個暱稱"; root.querySelector("#snick").focus(); return; }
    btn.disabled = true; msg.textContent = "產生中…";
    const r = await create(name);
    if (!r || r.error) { msg.textContent = r?.error || "送不出去，等一下再試"; btn.disabled = false; return; }
    const url = `${location.origin}/c/${r.id}`;
    const blob = await drawResultImage({ ...imageData, name, url });
    const out = root.querySelector("#shareOut"), img = root.querySelector("#shareImg");
    const objUrl = URL.createObjectURL(blob);
    img.src = objUrl; root.querySelector("#bDl").href = objUrl;
    root.querySelector("#shareUrl").value = url;
    out.hidden = false; msg.textContent = "好了！把連結或圖片傳給朋友。";
    const text = `我在喵打打出 ${Math.round(imageData.speed)} ${unitOf(imageData.c)}（${setText(imageData)}），你打得贏嗎？`;
    root.querySelector("#bCopy").onclick = async () => {
      try { await navigator.clipboard.writeText(`${text}\n${url}`); toast("已複製連結"); }
      catch { root.querySelector("#shareUrl").select(); toast("請按 Ctrl+C 複製"); }
    };
    if (navigator.share) {
      const b = root.querySelector("#bShare"); b.hidden = false;
      b.onclick = async () => {
        const file = new File([blob], "喵打成績.png", { type: "image/png" });
        const data = navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], text: `${text}\n${url}` } : { title: "喵打挑戰", text, url };
        try { await navigator.share(data); } catch {}
      };
    }
  });
}
