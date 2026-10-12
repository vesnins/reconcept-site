# Сборка
FROM mirror.gcr.io/library/node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG PUBLIC_YM_ID="5609182"
ARG PUBLIC_INDEX=""
ENV PUBLIC_YM_ID=$PUBLIC_YM_ID PUBLIC_INDEX=$PUBLIC_INDEX
RUN npm run build

# Запуск
FROM mirror.gcr.io/library/node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4321 HOST=0.0.0.0
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs /app/package.json ./
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:4321/ >/dev/null || exit 1
CMD ["node", "server.mjs"]
