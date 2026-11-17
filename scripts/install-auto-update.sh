#!/usr/bin/env bash
# 安裝 systemd 計時器：每分鐘檢查 GitHub 有沒有新版本
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="$(pwd)"
RUN_AS="${SUDO_USER:-$(whoami)}"
if [ "$(id -u)" -ne 0 ]; then echo "請用 sudo 執行：sudo ./scripts/install-auto-update.sh"; exit 1; fi
if ! id -nG "$RUN_AS" | grep -qw docker && [ "$RUN_AS" != "root" ]; then
  echo "使用者 $RUN_AS 不在 docker 群組，請先執行：sudo usermod -aG docker $RUN_AS（重新登入後生效）"; exit 1
fi
cat > /etc/systemd/system/meow-type-update.service <<UNIT
[Unit]
Description=喵打：檢查 GitHub 新版本並更新
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
User=${RUN_AS}
WorkingDirectory=${DIR}
ExecStart=${DIR}/scripts/auto-update.sh
UNIT
cat > /etc/systemd/system/meow-type-update.timer <<UNIT
[Unit]
Description=每分鐘檢查喵打更新

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
Persistent=true

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now meow-type-update.timer
echo "已安裝。查看更新紀錄：journalctl -u meow-type-update -n 50"
