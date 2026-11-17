#!/usr/bin/env bash
# 部署／更新：檢查 port → 建置 → 在新映像檔跑測試 → 通過才換上 → 健康檢查
# 測試沒過的話，舊版本會繼續跑，不會被換掉。
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then echo "連不到 Docker。請確認 Docker 有在跑，而且目前使用者在 docker 群組裡。"; exit 1; fi

[ -f .env ] || { cp .env.example .env; echo "已從 .env.example 建立 .env"; }
set -a; . ./.env; set +a
PORT="${HOST_PORT:-38218}"

listening() {  # 這個 port 有沒有程式在聽
  local p="$1"
  if command -v ss >/dev/null && ss -Htln "sport = :${p}" 2>/dev/null | grep -q .; then return 0; fi
  (exec 3<>"/dev/tcp/127.0.0.1/${p}") 2>/dev/null && return 0
  return 1
}
port_users() {  # 列出正在用這個主機 port 的容器名稱
  docker ps --format '{{.Names}}|{{.Ports}}' | awk -F'|' -v p=":${1}->" 'index($2, p) { print $1 }'
}
port_busy() {  # $1 = port；被「別人」用就回傳 0。遊戲自己的舊容器不算，更新時會直接換掉
  local p="$1" users
  users="$(port_users "$p")"
  if printf '%s\n' "$users" | grep -vx 'meow-type' | grep -q .; then return 0; fi
  if printf '%s\n' "$users" | grep -qx 'meow-type'; then return 1; fi
  listening "$p"
}
suggest_port() {
  for p in $(seq 38200 38299); do
    if ! port_busy "$p"; then echo "可以在 .env 改成 HOST_PORT=$p 再重跑一次。"; return; fi
  done
}

if [ -f docker-compose.override.yml ] && grep -q 'ports: !reset' docker-compose.override.yml; then
  echo "== 使用 Docker 網路連 cloudflared，不佔用主機 port =="
else
  echo "== 檢查 port ${PORT} =="
  if port_busy "$PORT"; then
    echo "port ${PORT} 已經有其他服務在用："
    command -v ss >/dev/null && { ss -Htlnp "sport = :${PORT}" 2>/dev/null || true; }
    port_users "$PORT" | sed 's/^/  容器 /' || true
    suggest_port
    exit 1
  fi
  if port_users "$PORT" | grep -qx 'meow-type'; then
    echo "port ${PORT} 目前是遊戲自己的舊版本在用，等一下會直接換成新版"
  else
    echo "port ${PORT} 可以用（只綁 127.0.0.1）"
  fi
fi

export APP_VERSION="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
export APP_BUILT="$(TZ=Asia/Taipei git log -1 --format=%cd --date=format-local:'%m/%d %H:%M' 2>/dev/null || true)"
echo "== 建置映像檔（版本 ${APP_VERSION}，Node 24.22.1） =="
docker compose build --pull

echo "== 在新版本上跑測試 =="
# 失敗時再跑一次，兩次都沒過才算真的有問題（避免偶發的時間誤差）
if ! docker compose run --rm --no-deps -T meow-type node --disable-warning=ExperimentalWarning scripts/test.mjs; then
  echo "測試沒過，再跑一次確認…"
  if ! docker compose run --rm --no-deps -T meow-type node --disable-warning=ExperimentalWarning scripts/test.mjs; then
    echo "測試兩次都沒過，不換版本。目前執行中的版本不受影響。"
    exit 1
  fi
fi

echo "== 啟動 =="
docker compose up -d --remove-orphans

if [ -f docker-compose.override.yml ] && grep -q 'ports: !reset' docker-compose.override.yml; then
  check() { docker exec meow-type node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; }
else
  check() { curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null; }
fi
for i in $(seq 1 20); do
  if check 2>/dev/null; then echo "部署完成（版本 ${APP_VERSION}）：http://127.0.0.1:${PORT}（對外請走 Cloudflare Tunnel）"; exit 0; fi
  sleep 1
done
echo "容器啟動了，但健康檢查沒有回應，請看紀錄：docker compose logs --tail=50"
exit 1
