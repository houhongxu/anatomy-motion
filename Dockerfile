# 从当前提交构建 React 网页 / Build React from the checked-out source.
FROM node:22-bookworm-slim AS frontend
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# 原生 SQLite 依赖构建 / Build native SQLite production dependencies.
FROM node:22-bookworm-slim AS dependencies
WORKDIR /build/server
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 非特权运行，仅 /data 可写 / Run unprivileged; only /data needs writes.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 WEB_ROOT=/app/web DATABASE_PATH=/data/anatomy.sqlite
WORKDIR /app
COPY --from=dependencies --chown=node:node /build/server/node_modules ./server/node_modules
COPY --chown=node:node server/package.json ./server/package.json
COPY --chown=node:node server/src ./server/src
COPY --chown=node:node LICENSE ./LICENSE
COPY --chown=node:node models/web ./models/web
COPY --chown=node:node models/manifest.json models/learning.json models/acupuncture.json ./models/
COPY --chown=node:node deploy/licenses/CC-BY-4.0.txt ./models/LICENSE-CC-BY-4.0.txt
COPY --chown=node:node deploy/licenses/CC-BY-SA-2.1-JP.html ./models/LICENSE-CC-BY-SA-2.1-JP.html
COPY --chown=node:node deploy/licenses/NOTICE.md ./models/LICENSE-NOTICE.md
COPY --chown=node:node shared/anatomy-manifest.json shared/supplemental-manifest.json ./shared/
COPY --from=frontend --chown=node:node /build/web/dist/ ./web/
RUN mkdir -p /data && chown node:node /data
USER 1000:1000
EXPOSE 3000
CMD ["node", "server/src/index.js"]
