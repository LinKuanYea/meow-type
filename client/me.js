// 個人頁：只有登入的本人看得到自己的練習歷史
import { CAT_NAME, LEN_NAME } from "/shared/bank.js";
import { unitOf } from "/shared/judge.js";
import { esc } from "/shared/analyze.js";
import { login, logout } from "/account.js";

const $ = (s) => document.querySelector(s);
const setName = (c, l, m) => `${CAT_NAME[c] || c}・${LEN_NAME[l] || l}・${m === "t60" ? "1 分鐘" : "打完一題"}`;
const tw = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const pct = (x) => (x == null ? "—" : Math.round(x * 100) + "%");
let tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1800); }

async function main() {
  const r = await fetch("/api/me/history", { cache: "no-store" });
  if (r.status === 401) {
    $("#who").textContent = "還沒登入";
    $("#main").innerHTML = `<div class="board"><p>登入之後，在喵打的練習會記在這裡：速度怎麼進步、常錯哪些字、分享的挑戰有沒有人接。</p>
      <p class="hint">只拿 Google 帳號的編號和 email，不存姓名；這一頁只有你自己看得到。之前沒登入時的練習不會併進來。</p>
      <div class="btns"><button class="main" type="button" id="go">用 Google 登入</button></div></div>`;
    $("#go").onclick = login;
    addEventListener("message", (e) => { if (e.origin === location.origin && e.data?.type === "mt-login" && e.data.ok) location.reload(); });
    return;
  }
  const d = await r.json();
  $("#who").textContent = `用 ${d.user.email || "Google 帳號"} 登入`;
  const t = d.total;
  const hours = t.ms / 3600000;
  const cats = [...new Set(d.trend.map((x) => x.c))];
  $("#main").innerHTML = `
  <section class="board">
    <form class="submit" id="nickForm"><label for="nick"><b>暱稱</b></label><input id="nick" maxlength="10" value="${esc(d.user.nick)}" placeholder="排行榜上顯示的名字"><button class="main" type="submit">儲存</button>
      <button type="button" class="link" id="out">登出</button><p>排行榜和分享只顯示暱稱，不顯示 email。</p></form>
    <div class="big" style="margin-top:16px">
      <div><small>練完的局數</small><strong>${t.done || 0}</strong></div>
      <div class="s"><small>這 7 天練了</small><strong>${t.week || 0} 局</strong></div>
      <div class="s"><small>總共練了</small><strong>${hours >= 1 ? hours.toFixed(1) + " 小時" : Math.round(t.ms / 60000) + " 分鐘"}</strong></div>
      <div class="s"><small>預測輸出答對</small><strong>${d.learn.answered ? `${d.learn.correct}/${d.learn.answered}` : "—"}</strong></div>
    </div>
  </section>
  ${t.done ? `
  <section class="band2 board"><div class="bh"><h2>速度變化</h2>${cats.length > 1 ? `<div class="seg" id="tcat">${cats.map((c, i) => `<button type="button" data-v="${c}" aria-pressed="${i === 0}">${CAT_NAME[c]}</button>`).join("")}</div>` : ""}</div>
    <div class="fig" id="chart" style="min-height:240px"><svg role="img" aria-label="速度變化圖"></svg></div><p class="hint" id="chartNote"></p></section>
  <section class="band2 board"><h2>各種設定的成績</h2>
    <table class="lb"><thead><tr><th>設定</th><th class="n">局數</th><th class="n">最好</th><th class="n">平均</th><th class="n">正確率</th></tr></thead><tbody>
    ${d.best.map((b) => `<tr><td>${setName(b.c, b.l, b.m)}</td><td class="n">${b.n}</td><td class="n">${Math.round(b.best)} ${unitOf(b.c)}</td><td class="n">${Math.round(b.avg)}</td><td class="n">${pct(b.acc)}</td></tr>`).join("")}</tbody></table></section>
  <section class="band2 board"><h2>常犯的錯</h2><p class="hint">每 100 個按鍵平均錯幾次</p>
    <table class="lb"><thead><tr><th>題庫</th><th class="n">全部</th><th class="n">全形半形</th><th class="n">縮排</th><th class="n">分號</th><th class="n">大小寫</th><th class="n">倒退</th></tr></thead><tbody>
    ${d.errors.map((e) => { const k = Math.max(1, e.keys); const r = (x) => ((x / k) * 100).toFixed(1);
      return `<tr><td>${CAT_NAME[e.c]}</td><td class="n">${r(e.errs)}</td><td class="n">${r(e.width)}</td><td class="n">${e.c === "cpp" || e.c === "py" ? r(e.indent) : "—"}</td><td class="n">${e.c === "cpp" ? r(e.semi) : "—"}</td><td class="n">${e.c === "zh" ? "—" : r(e.kase)}</td><td class="n">${r(e.backs)}</td></tr>`; }).join("")}</tbody></table></section>
  <section class="band2 board"><h2>最近的練習</h2>
    <table class="lb"><thead><tr><th>時間</th><th>設定</th><th class="n">速度</th><th class="n">正確率</th><th class="n">秒數</th></tr></thead><tbody>
    ${d.recent.map((x) => `<tr><td>${tw(x.ts)}</td><td>${LEN_NAME[x.l] ? setName(x.c, x.l, x.m) : esc(x.l)}</td><td class="n">${Math.round(x.speed)} ${unitOf(x.c)}</td><td class="n">${pct(x.acc)}</td><td class="n">${(x.ms / 1000).toFixed(1)}</td></tr>`).join("")}</tbody></table></section>`
  : `<section class="band2 board"><p class="empty">登入之後還沒練完任何一局。<a href="/">去練一局</a>，這裡就會開始有紀錄。</p></section>`}
  <section class="band2 board"><h2>我分享的挑戰</h2>
    ${d.shares.length ? `<table class="lb"><thead><tr><th>時間</th><th>設定</th><th class="n">我的速度</th><th class="n">被打開</th><th class="n">接受挑戰</th><th class="n">挑戰者贏／輸</th></tr></thead><tbody>
    ${d.shares.map((x) => `<tr><td><a href="/c/${esc(x.id)}">${tw(x.ts)}</a></td><td>${setName(x.c, x.l, x.m)}</td><td class="n">${Math.round(x.speed)} ${unitOf(x.c)}</td><td class="n">${x.views}</td><td class="n">${x.accepts}</td><td class="n">${x.wins}／${x.loses}</td></tr>`).join("")}</tbody></table>`
    : '<p class="empty">還沒分享過。打完一局後按「產生挑戰連結」，就能傳給朋友挑戰你。</p>'}</section>`;

  $("#out").onclick = async () => { await logout(); location.href = "/"; };
  $("#nickForm").onsubmit = async (e) => {
    e.preventDefault();
    const r = await fetch("/api/me/nick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nick: $("#nick").value.trim() }) });
    const j = await r.json().catch(() => ({}));
    toast(r.ok ? "暱稱已儲存" : j.error || "存不起來，等一下再試");
  };
  if (!t.done) return;
  let cat = cats[0];
  const svg = $("#chart svg");
  const draw = () => {
    const pts = d.trend.filter((x) => x.c === cat), W = svg.clientWidth, H = svg.clientHeight, P = { l: 40, r: 12, t: 12, b: 24 };
    if (!pts.length || !W) { svg.innerHTML = ""; return; }
    const max = Math.max(10, ...pts.map((x) => x.speed)) * 1.1;
    const X = (i) => P.l + (pts.length === 1 ? (W - P.l - P.r) / 2 : (i / (pts.length - 1)) * (W - P.l - P.r)), Y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
    const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
    svg.innerHTML = ticks.map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${P.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--todo)">${v}</text>`).join("")
      + `<polyline fill="none" stroke="var(--gin)" stroke-width="3" stroke-linejoin="round" points="${pts.map((x, i) => `${X(i)},${Y(x.speed)}`).join(" ")}"/>`
      + pts.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x.speed)}" r="4" fill="var(--gin)"><title>${tw(x.ts)} ${setName(x.c, x.l, x.m)}：${Math.round(x.speed)} ${unitOf(x.c)}，正確率 ${pct(x.acc)}</title></circle>`).join("")
      + `<text x="${P.l}" y="${H - 6}" font-size="12" fill="var(--todo)">${tw(pts[0].ts)}</text><text x="${W - P.r}" y="${H - 6}" font-size="12" text-anchor="end" fill="var(--todo)">${tw(pts[pts.length - 1].ts)}</text>`;
    const first = pts.slice(0, 5), last = pts.slice(-5), avg = (a) => a.reduce((s, x) => s + x.speed, 0) / a.length;
    $("#chartNote").textContent = pts.length >= 6 ? `最早 5 局平均 ${Math.round(avg(first))}，最近 5 局平均 ${Math.round(avg(last))} ${unitOf(cat)}（${CAT_NAME[cat]}，各種長度混在一起）` : `${CAT_NAME[cat]} 共 ${pts.length} 局，單位 ${unitOf(cat)}`;
  };
  new ResizeObserver(draw).observe(svg);
  $("#tcat")?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; cat = b.dataset.v; document.querySelectorAll("#tcat button").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
}
main().then(() => { window.__mtReady = true; });
