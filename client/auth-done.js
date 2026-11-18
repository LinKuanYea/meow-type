// 登入完成（彈出視窗）：通知喵打的原視窗，然後關掉自己；不是彈出視窗就回到原本的頁面
(function () {
  var ok = document.body.getAttribute("data-ok") === "1", back = document.body.getAttribute("data-back") || "/";
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "mt-login", ok: ok }, location.origin);
      setTimeout(function () { window.close(); }, ok ? 300 : 2500);
      return;
    }
  } catch (e) {}
  if (ok) setTimeout(function () { location.replace(back); }, 600);
})();
