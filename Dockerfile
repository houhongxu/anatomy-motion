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
COPY --chown=node:node models ./models
COPY --chown=node:node deploy/licenses/CC-BY-4.0.txt ./models/LICENSE-CC-BY-4.0.txt
COPY --chown=node:node deploy/licenses/NOTICE.md ./models/LICENSE-NOTICE.md
COPY --chown=node:node shared/anatomy-manifest.json ./shared/anatomy-manifest.json
COPY --chown=node:node .build/web/ ./web/
RUN mkdir -p /data && chown node:node /data
USER 1000:1000
EXPOSE 3000
CMD ["node", "server/src/index.js"]
