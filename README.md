# 喵打

貓咪打字練習：C++、Python、英文、中文。打完會分析錯誤（全形半形、縮排、分號、大小寫…）並給建議。
目前有：打完一題、1 分鐘測驗、排行榜（今天／本週／全部）、防貼上、匿名練習統計。
之後：即時 PK（房號、隨機配對、互相出題）、全班賽、登入與冒險模式。

## 專案結構

```
shared/bank.js     題庫：英文、中文（原創，附單字、片語、成語說明）＋載入程式題
shared/bank-code.js  程式題（自動產生，不要手改）
content/code/      程式題原始檔：林老師在 MeowJudge 115-1 的 AC 作答（C++ 110 班、Python 班）＋說明
shared/judge.js    打字判定引擎（前後端共用）：三種打錯規則、Tab 縮排、輸入法選字、伺服器驗算
shared/analyze.js  打完後的分析與建議
client/            前端（index.html、style.css、app.js）
server/            伺服器：網頁、API、排行榜、統計頁
scripts/           測試、部署、自動更新
```

### 程式題與「學一下」

程式題來自林老師自己在 MeowJudge 上 AC 的作答（不是參考解答），去掉註解、行尾空白和註解掉的舊程式碼，其餘照原本的寫法。
每一題在 `content/code/` 有兩個檔案：程式本身，以及 `.meta`（題目名稱、單元、一句話說明、預測輸出的輸入與錯誤選項、逐行說明）。
改完執行：

```bash
python3 scripts/build-code-bank.py   # 需要 g++ 與 python3；會實際執行每一題算出預測輸出的正確答案
```

不超過 12 行（C++）／8 行（Python）的算「句子」，其他算「整段」；「單詞」是有說明的那幾行。
選程式題時可以只練某個單元。

打完後的「學一下」卡片：

| 題庫 | 內容 |
|---|---|
| 程式（句子、整段） | 先考「這段程式會輸出什麼？」（可以跳過），答完或跳過才顯示一句話說明和逐行註解（點那一行才展開） |
| 程式（單詞） | 每一行在做什麼、出自哪一題 |
| 英文 | 單字或片語、詞性、中文、程度（國中／高中）、例句 |
| 中文（單詞） | 成語意思 |

統計頁有「學一下」：卡片出現幾次、預測輸出作答與答對率、跳過、展開說明的比例，以及答對率最低的題目。

### 打錯時的三種規則

| 規則 | 打錯當下 | 怎麼繼續 |
|---|---|---|
| 擋下 | 錯的字不會出現，貓絆一下 | 直接打對的字 |
| 要倒退修 | 錯字顯示紅色，後面打的都不算（最多往後帶 10 個字） | 倒退刪掉錯字再打 |
| 可以帶錯 | 錯字顯示紅色 | 照樣往前，只算打對的字 |

### 排行榜怎麼防作弊

- 前端擋貼上、拖放、右鍵，一次湧進 4 個字以上（不是輸入法選字）就擋下。
- 送出成績時附上按鍵紀錄，伺服器用同一份判定引擎重播、重算速度與正確率，不相信前端算的數字。
- 按鍵間隔太短、節奏太規律、速度超過上限、一次湧進很多字的成績會標成「可疑」：收下但不上榜，統計頁看得到。
- 按鍵紀錄驗算完就丟掉，資料庫只存暱稱、成績和一個隨機編號。
- 擋不了所有外掛（例如模擬真人節奏的程式），但一般的貼上、自動打字都會被抓到。

## Google 登入（選填）

不登入也能玩、上排行榜、分享。登入後：排行榜上標 ✓、同一個帳號換電腦也算同一個人、「我的紀錄」（`/me`，只有本人看得到）有速度變化、各設定成績、常犯的錯、最近的練習、分享的挑戰。
登入前的匿名紀錄不會併進帳號。

做法：伺服器端 OAuth（authorization code），只要 `openid email` 兩個範圍，不載入 Google 的 JavaScript。
資料庫存 Google 帳號編號（sub）、email、暱稱，不存姓名；session 是隨機字串，資料庫只存雜湊值，cookie 是 HttpOnly。
喵系列每個專案各自登入，但都用 Google 的 sub 當使用者編號，以後要串起來對得上。

### 設定

在管理頁 `/admin` →「Google 登入」直接貼上用戶端 ID 和密鑰，存在資料庫、馬上生效（頁面上有一步一步的說明）。也可以用環境變數（管理頁沒設定時才用）：

1. Google Cloud Console → Google Auth Platform：
   - 對象（Audience）選「外部」（External），發布狀態設成「正式版」（In production）。只用 openid、email 不需要送 Google 審查。
   - 用戶端 → 建立「網頁應用程式」，已授權的重新導向 URI 填 `https://meow-type.otlab.org/auth/google/callback`。
2. 伺服器 `.env` 加上 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`PUBLIC_URL=https://meow-type.otlab.org`，跑 `./scripts/deploy.sh`。
3. 三個都設定才會出現登入按鈕；沒設定時網頁跟原本一樣。

學校帳號（Google Workspace for Education）：未滿 18 歲的學生只能登入管理員設定過的應用程式。用戶端如果建在學校的 Google Cloud 機構底下，跟 MeowJudge 一樣不用另外設定；建在個人帳號底下的話，要在學校管理控制台（安全性 → 存取權與資料控管 → API 控制項）把這個用戶端設成信任。

## 本機試玩（需要 Node 24.22.1 以上）

```bash
npm start          # 打開 http://localhost:8080
npm test           # 題庫、判定、驗算、API 測試
```

沒有任何 npm 套件，統計用 Node 內建的 `node:sqlite`。

## 第一次部署到學校伺服器（Ubuntu + Docker）

### 1. 讓伺服器能讀取這個私人 repo（唯讀部署金鑰）

```bash
ssh-keygen -t ed25519 -f ~/.ssh/meow-type-deploy -N ""
cat ~/.ssh/meow-type-deploy.pub
```

把印出來的公鑰貼到 GitHub：repo → Settings → Deploy keys → Add deploy key，**不要勾** Allow write access。

接著在 `~/.ssh/config` 加上（學校網路擋 22 port 的話，這個設定走 443，通常都通）：

```
Host github-meow-type
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/meow-type-deploy
  IdentitiesOnly yes
```

### 2. 下載並部署

```bash
sudo mkdir -p /opt/meow-type && sudo chown "$USER" /opt/meow-type
git clone git@github-meow-type:LinKuanYea/meow-type.git /opt/meow-type
cd /opt/meow-type
./scripts/deploy.sh
```

`deploy.sh` 會依序：

1. 檢查 `.env` 裡的 `HOST_PORT`（預設 38218）有沒有被其他程式或容器佔用。被佔用就停下來，並建議一個空的 port。
2. 用 Node 24.22.1 建置映像檔。
3. 在新映像檔上跑完整測試。沒過就不換版本，舊版繼續跑。
4. 啟動容器並做健康檢查。

容器只綁在 `127.0.0.1`，外面直接連不到，也不會影響伺服器上其他服務。

### 3. 接上 Cloudflare Tunnel

在 Cloudflare 的 Tunnel 設定新增一個 Public Hostname，例如 `meow.你的網域`：

- **cloudflared 直接裝在伺服器上**：Service 選 `HTTP`，位址填 `localhost:38218`（或你 `.env` 裡的 port）。
- **cloudflared 跑在 Docker 裡**：它連不到主機的 127.0.0.1。把 `docker-compose.override.example.yml` 複製成 `docker-compose.override.yml`，填入 cloudflared 所在的 Docker 網路名稱，Service 位址改成 `http://meow-type:8080`。這樣完全不佔用主機 port。（需要 Docker Compose 2.24 以上）

### 4. 開啟自動更新

```bash
sudo ./scripts/install-auto-update.sh
```

之後每分鐘會檢查 GitHub。有新 commit 就跑一次 `deploy.sh`；測試沒過會自動退回上一版，同一個壞掉的版本不會一直重試。

```bash
journalctl -u meow-type-update -n 50     # 看更新紀錄
systemctl list-timers meow-type-update    # 看下次檢查時間
sudo systemctl disable --now meow-type-update.timer   # 暫停自動更新
```

伺服器上的 `/opt/meow-type` 不要手動改程式碼，更新時會被 GitHub 上的版本覆蓋。`.env` 不受影響。

## 管理頁 /admin

用 `ADMIN_PASSWORD`（沒設定就用 `STATS_PASSWORD`）登入，登入狀態 12 小時、伺服器重開要重新登入；密碼錯 8 次會擋 10 分鐘。
分頁：統計（原本的 /stats）、Google 登入設定、資料匯出。以後管理相關的功能都放這裡。
所有修改都要從管理頁本身送出（檢查 Origin），用戶端密鑰存進去之後畫面上只顯示結尾 4 碼。

## 練習統計

玩家第一次進入會看到說明，按「同意」才記錄（不同意也能練習）。全部匿名：不記姓名、IP、位置、打字內容。

1. 在 `.env` 設定 `STATS_PASSWORD=你的密碼`，重新跑 `./scripts/deploy.sh`。
2. 打開 `https://你的網域/admin`，輸入上面那個密碼。

統計頁有「上課檢查（每天）」：局數、人數、練完比例、各題庫平均速度、正確率、擋下貼上次數、輸入法沒切英數的局數、可疑成績。
另外有題庫 × 長度 × 模式的平均錯誤種類、三種打錯規則的比較、裝置、最近的排行榜成績。頁面上方可以下載全部原始資料（JSON）。

資料存在 Docker volume `meow-type-data`，更新版本不會不見：

```bash
./scripts/stats-reset.sh    # 輸入 DELETE 確認，刪除前會先在 volume 裡備份一份
```

## 版本號與更新

`deploy.sh` 會把 GitHub commit 代碼和時間寫進版本號，顯示在頁面最下面。
伺服器更新後，頁面每分鐘檢查一次：沒在打字而且分頁在背景就自動換新版，否則右下角出現「有新版本」按鈕。
有人正在打字（3 分鐘內開始、還沒打完）時，自動更新會等打完再換。更新時伺服器停約 10 秒，網頁上的打字不受影響，只是這段時間送不出成績。

## 常用指令

```bash
docker compose logs -f --tail=100     # 看伺服器紀錄（可疑成績會記一行 [排行榜]）
curl http://127.0.0.1:38218/healthz   # 版本、正在打字的人數
```

## 資安說明

- 映像檔固定使用 Node 24.22.1（含 2026-10-21 資安修補），伺服器啟動時也會檢查版本。
- 容器以非 root 執行、檔案系統唯讀、移除所有 Linux capabilities，限制記憶體 512MB、CPU 1 核；只綁 127.0.0.1。
- 不需要登入，排行榜只有暱稱（會過濾 HTML 符號與不適合的字）。
- API 有大小上限與每個 IP 每分鐘的請求上限（`RATE_PER_MIN`，學校全班共用一個對外 IP，預設 1500）；網頁有 CSP 等安全標頭。
