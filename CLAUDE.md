# 喵打（meow-type）開發須知

- 跟林老師用台灣繁體中文溝通；程式註解、介面文字、commit 訊息也用繁體中文。
- 推到 GitHub `main` 後，學校伺服器每分鐘會自動拉新版：`scripts/deploy.sh` 在新映像檔跑 `scripts/test.mjs`，沒過就不換版。所以推之前一定要 `npm test` 全部通過。
- 沒有測試站，直接上正式；版本號在 `package.json`，有感的改動就加版本號。
- 判定邏輯只寫在 `shared/judge.js`（前端判定與伺服器驗算共用），不要在前端另外寫一份。
- 英文、中文題庫在 `content/en/`、`content/zh/`（原創，一題一行的 JSON）；改完執行 `node scripts/build-text-bank.mjs` 產生 `shared/bank-text.js`（不要手改）。程式題在 `content/code/`，是林老師自己在 MeowJudge 的 AC 作答（不是參考解答，也不能用學生的作答）；改完執行 `python3 scripts/build-code-bank.py` 產生 `shared/bank-code.js`，不要手改那個檔案。程式題縮排 4 個空白、不能有 Tab 和行尾空白（測試會檢查）。
- 題目編號不能變（排行榜、分享連結存的是編號）：新題目只能加在後面，不能刪題或換順序，要拿掉就標 retired。順序記在 `content/text-bank.lock.json`、`content/code/order.lock.json`，產生腳本會檢查。
- 預測輸出的正確答案一律由腳本實際執行程式產生，不要自己推算。
- 管理相關的功能（統計、設定、匯出…）都放在管理頁 `/admin`（`server/admin.js`），不要另開頁面；設定存在資料庫 `settings` 表，改了馬上生效。
- 伺服器上要查東西時，給林老師一段 prompt，由他在伺服器上開 Claude Code 執行。
- 開發紀錄在 claude.ai 專案文件「喵打-開發紀錄」。
