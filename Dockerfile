# Goblin Cellar — image unique (frontend + API + SQLite)
# Build : docker compose build

# --- Frontend --------------------------------------------------------------
FROM node:22-bookworm-slim AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Backend ---------------------------------------------------------------
FROM node:22-bookworm-slim AS backend
WORKDIR /src
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build \
  && npm prune --omit=dev

# --- Runtime ---------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    DATABASE_PATH=/data/cave.sqlite \
    PUBLIC_DIR=/app/public

COPY --from=backend --chown=node:node /src/node_modules ./node_modules
COPY --from=backend --chown=node:node /src/dist ./dist
COPY --from=backend --chown=node:node /src/package.json ./package.json
COPY --from=frontend --chown=node:node /src/dist ./public
COPY docker/entrypoint.sh /entrypoint.sh

RUN sed -i 's/\r$//' /entrypoint.sh \
  && chmod +x /entrypoint.sh \
  && mkdir -p /data \
  && chown node:node /data

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
