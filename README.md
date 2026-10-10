# reconcept.ru — Astro 5, статика

- `npm run dev` — локально; `npm run build` — сборка в `dist/` + br/gzip; `npm start` — сервер (порт 4321).
- Деплой: Coolify → Dockerfile, порт 4321. Build Variables: `PUBLIC_YM_ID=5609182`, после переезда `PUBLIC_INDEX=1` (открывает индексацию).
- 301 со старых адресов Tilda — `server.mjs`, карта `REDIRECTS`.
- Контакты и реквизиты — `src/lib/site.ts`. Общие стили — `src/styles/global.css`.
