// 開機檢查（一般 script，比 app.js 先載入）：
// 程式出錯或 5 秒內沒有啟動完成時，在畫面上方顯示原因，並回報給伺服器記到 log（不存資料庫）。
(function () {
  var shown = false;
  function report(msg) {
    try {
      fetch("/api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ msg: String(msg).slice(0, 500), ua: navigator.userAgent.slice(0, 200), v: document.documentElement.getAttribute("data-v") }) });
    } catch (e) {}
  }
  function banner(msg) {
    report(msg);
    if (shown) return; shown = true;
    var d = document.createElement("div");
    d.setAttribute("role", "alert");
    d.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99;background:#d4302f;color:#fff;padding:10px 16px;font:15px/1.5 system-ui,sans-serif";
    d.textContent = "喵打出了問題，請截圖給老師：" + msg + "（" + navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 120) + "）";
    (document.body || document.documentElement).appendChild(d);
  }
  window.addEventListener("error", function (e) { banner((e && e.message) || "載入失敗"); });
  window.addEventListener("unhandledrejection", function (e) { banner("Promise：" + ((e && e.reason && e.reason.message) || e.reason)); });
  setTimeout(function () { if (!window.__mtReady) banner("程式 5 秒內沒有啟動完成，可能是瀏覽器版本太舊或網路中斷"); }, 5000);
})();
