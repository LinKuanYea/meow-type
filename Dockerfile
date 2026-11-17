# Node 24.22.1：已包含 2026-10-21 資安修補
FROM node:24.22.1-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
# 目前沒有任何 npm 套件（只用 Node 內建功能），之後加套件再補 npm ci
COPY package.json ./
COPY server ./server
COPY shared ./shared
COPY client ./client
COPY scripts/test.mjs ./scripts/test.mjs
# 版本（deploy.sh 帶入 commit 代碼與時間）
ARG APP_VERSION=dev
ARG APP_BUILT=
ENV APP_VERSION=$APP_VERSION APP_BUILT=$APP_BUILT
# 統計資料庫放在 /data（docker volume），更新版本不會不見
RUN mkdir -p /data && chown node:node /data
ENV STATS_DB=/data/stats.db
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
