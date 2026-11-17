#!/usr/bin/env bash
# 刪除全部遊玩統計（無法復原）。刪除前會先備份一份 JSON。
set -euo pipefail
cd "$(dirname "$0")/.."
read -r -p "確定要刪除全部遊玩統計嗎？輸入 DELETE 確認：" ans
[ "$ans" = "DELETE" ] || { echo "已取消"; exit 0; }
backup="stats-backup-$(date +%Y%m%d-%H%M%S).db"
docker compose exec -T meow-type node -e "require('fs').copyFileSync('/data/stats.db','/data/${backup}')" 2>/dev/null && echo "已備份到 volume 內的 ${backup}" || true
docker compose stop meow-type
docker compose run --rm --no-deps -T --user root --entrypoint sh meow-type -c 'rm -f /data/stats.db /data/stats.db-wal /data/stats.db-shm'
docker compose start meow-type
echo "統計已清空。"
