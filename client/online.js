// 「現在 N 人在線上」：每個瀏覽器一個隨機代號（不是登入帳號、也不是遊玩數據的代號），每 40 秒報到一次；
// 伺服器只放在記憶體，90 秒沒報到就不算，不寫進資料庫。
let id = "";
try { id = localStorage.getItem("mt-online") || ""; if (!/^[0-9a-z]{12}$/.test(id)) { id = Math.random().toString(36).slice(2, 14).padEnd(12, "0"); localStorage.setItem("mt-online", id); } }
catch { id = Math.random().toString(36).slice(2, 14).padEnd(12, "0"); }
async function ping() {
  if (document.hidden || !navigator.onLine) return;
  try {
    const r = await (await fetch("/api/online", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })).json();
    const el = document.querySelector("#online");
    if (el && r.n) { el.textContent = `🟢 現在 ${r.n} 人在線上`; el.hidden = false; }
  } catch {}
}
ping();
setInterval(ping, 40000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) ping(); });
