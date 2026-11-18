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

/** 排行榜、分享表單裡的登入提示（沒登入才顯示） */
export function loginHint() {
  if (!ME.enabled || ME.user) return "";
  return `<p class="loginhint"><button type="button" class="link dologin">用 Google 登入</button>（選填）：登入後可以在「我的紀錄」看到自己的練習歷史，排行榜上會標 ✓。登入會存 Google 帳號編號和 email，不存姓名，紀錄只有你自己看得到。</p>`;
}
document.addEventListener("click", (e) => { if (e.target.closest(".dologin")) login(); });
