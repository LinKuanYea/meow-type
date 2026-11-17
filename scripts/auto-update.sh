#!/usr/bin/env bash
# 由 systemd 計時器每分鐘呼叫：GitHub 有新 commit 才更新；更新失敗就退回上一版。
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>"/tmp/meow-type-update.lock"
flock -n 9 || exit 0

git fetch --quiet origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse '@{u}')
[ "$LOCAL" = "$REMOTE" ] && exit 0
if [ -f .last-failed-commit ] && [ "$(cat .last-failed-commit)" = "$REMOTE" ]; then exit 0; fi

# 有人正在打字（3 分鐘內開始、還沒打完）就先不更新；下一分鐘計時器會再檢查。
# 更新時伺服器會停約 10 秒，網頁上的打字不受影響，但這段時間送不出成績。FORCE_DEPLOY=1 可以強制更新。
if [ "${FORCE_DEPLOY:-0}" != "1" ]; then
  PORT=$(grep -E '^HOST_PORT=' .env 2>/dev/null | cut -d= -f2 || true); PORT=${PORT:-38218}
  HEALTH=$(curl -fsS -m 3 "http://127.0.0.1:${PORT}/healthz" 2>/dev/null || true)
  PLAYING=$(printf '%s' "$HEALTH" | grep -oE '"playing":[0-9]+' | cut -d: -f2 || true)
  if [ -n "$PLAYING" ] && [ "$PLAYING" -gt 0 ]; then
    # 同一個新版本只提示一次，避免每分鐘洗 log
    if [ "$(cat .deferred-commit 2>/dev/null || true)" != "$REMOTE" ]; then
      echo "發現新版本 ${REMOTE:0:7}，但有 ${PLAYING} 人正在打字，等打完再更新"
      echo "$REMOTE" > .deferred-commit
    fi
    exit 0
  fi
fi
rm -f .deferred-commit

echo "發現新版本 ${REMOTE:0:7}（目前 ${LOCAL:0:7}），開始更新"
git merge --ff-only --quiet '@{u}'
if ./scripts/deploy.sh; then
  rm -f .last-failed-commit
  echo "更新完成：$(git log -1 --format='%h %s')"
else
  echo "$REMOTE" > .last-failed-commit
  echo "新版本 ${REMOTE:0:7} 沒通過，退回 ${LOCAL:0:7}"
  git reset --hard --quiet "$LOCAL"
  # 測試失敗時舊容器本來就還在跑；這裡只是確保映像檔也回到舊版
  ./scripts/deploy.sh || true
fi
