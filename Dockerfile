# Сборка
FROM mirror.gcr.io/library/node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
ARG PUBLIC_YM_ID="5609182"
ARG PUBLIC_INDEX=""
ARG PUBLIC_CHAT=""
ENV PUBLIC_YM_ID=$PUBLIC_YM_ID PUBLIC_INDEX=$PUBLIC_INDEX PUBLIC_CHAT=$PUBLIC_CHAT
RUN --mount=type=cache,target=/app/node_modules/.astro npm run build

# Запуск
FROM mirror.gcr.io/library/node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4321 HOST=0.0.0.0
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs /app/chat.mjs /app/package.json ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:4321/ >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]
