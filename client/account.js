// 登入狀態（選填的 Google 登入）：右上角的登入／我的紀錄、表單裡的「用 Google 登入」
export const ME = { enabled: false, user: null };
const listeners = [];
export const onLogin = (f) => listeners.push(f);

export async function loadMe() {
  if (!/^https?:$/.test(location.protocol)) return ME;
  try { Object.assign(ME, await (await fetch("/api/me", { cache: "no-store" })).json()); ME.enabled = !!ME.login; } catch {}
  renderTop();
  return ME;
}

/** 開彈出視窗登入；被擋的話整頁跳過去（回來會回到原本的網址） */
export function login() {
  const w = window.open(`/auth/google?back=${encodeURIComponent(location.pathname)}`, "mtlogin", "width=480,height=640");
  if (!w) location.href = `/auth/google?back=${encodeURIComponent(location.pathname)}`;
}
addEventListener("message", async (e) => {
  if (e.origin !== location.origin || !e.data || e.data.type !== "mt-login" || !e.data.ok) return;
  await loadMe();
  listeners.forEach((f) => f(ME));
});

export async function logout() {
  await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
  ME.user = null; renderTop();
  listeners.forEach((f) => f(ME));
}

function renderTop() {
  const el = document.querySelector("#acct");
  if (!el) return;
  if (!ME.enabled) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = ME.user ? `<a class="acctbtn" href="/me">我的紀錄${ME.user.nick ? `（${esc(ME.user.nick)}）` : ""}</a>`
    : `<button type="button" class="acctbtn" id="acctLogin">用 Google 登入</button>`;
  el.querySelector("#acctLogin")?.addEventListener("click", login);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** 暱稱輸入框：登入且已有暱稱就鎖住（到「我的紀錄」改）；附上暱稱規則 */
export function nickField(id, fallback) {
  const u = ME.user;
  if (u?.banned) return { html: "", banned: true };
  const locked = !!u?.nick;
  const v = u?.nick || fallback || "";
  const note = locked ? `這是你的帳號暱稱，要改請到<a href="/me">我的紀錄</a>。`
    : u ? "這會成為你的帳號暱稱；之後可以改，但每改一次，7 天內不能再改。" : "";
  return {
    html: `<input id="${id}" maxlength="10" placeholder="暱稱（不要填真名）" value="${esc(v)}" autocomplete="off"${locked ? " readonly" : ""}>`,
    note: `<p class="nickrule">${note}暱稱不可以有不雅字眼，發現會被管理員停權。</p>`,
  };
}
export const bannedNote = () => `<div class="submit"><p class="nickrule">你的帳號已被停權，不能上排行榜或分享。有問題請找老師。</p></div>`;

/** 排行榜、分享表單裡的登入提示（沒登入才顯示） */
export function loginHint() {
  if (!ME.enabled || ME.user) return "";
  return `<p class="loginhint"><button type="button" class="link dologin">用 Google 登入</button>（選填）：登入後可以在「我的紀錄」看到自己的練習歷史，排行榜上會標 ✓。登入會存 Google 帳號編號和 email，不存姓名，紀錄只有你自己看得到。</p>`;
}
document.addEventListener("click", (e) => { if (e.target.closest(".dologin")) login(); });
