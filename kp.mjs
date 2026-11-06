// Коммерческие предложения: анкета → расчёт на сервере → личная ссылка /kp/<токен>. SQLite /data/kp.db, хранится бессрочно.
// ИИ (отрасль «Другое», хотелка, страницы старого сайта) — через мост на Hetzner: /api/kp/bridge/* (тот же CHAT_SECRET).
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { BlockList, isIP } from 'node:net';
import { lookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';
import { limit, str, ipOf, authed, json, body } from './chat.mjs';
import { SERVICES, TYPES, INDUSTRIES, SCALE, GOODS, FEATURES, FILL, BRAND, REGIONS, label } from './kp-data.mjs';

/* ---------- НАСТРОЙКИ (правятся здесь) ---------- */
const HOUR = 4000, PAGE = 12500, CONTENT = 4000, TYPICAL = 1600, RISK = 1.17, NOSTYLE = 1.2;
const BASE = { landing: 90000, corp: 120000, shop: 120000 }, INCL = 6; // страниц в базе
const GROUP = { beauty: 0, cafe: 0, private: 0, fitness: 0, repair: 0, photo: 0, ecom: 1, wholesale: 1, b2b: 1, realty: 1, edu: 1, travel: 1, auto: 1, factory: 2, medical: 2, finance: 2, developer: 2, logistics: 2 };
const K_IND = [1, 1.3, 2], NORM = [6, 10, 15];
const K_SC = [1, 1.25, 1.6, 2, 2.5], ADD = [0, 2, 5, 10, 15];
// часы; 1 — штатно в Tilda (50 % часов), 2 — только свой код
const FEAT = { calc: [16, 1], booking: [25, 1], pay: [20, 1], crm: [12, 1], catalog: [50, 1], cabinet: [60, 2], onec: [45, 2], langs: [25, 2], delivery: [20, 1], promo: [10, 1], search: [12, 1], chat: [20, 0], map: [8, 1], regions: [30, 2], phone: [10, 1], mail: [8, 1], market: [30, 2] };
const ADMIN_H = 40, MIGRATE_H = 40, AUTO = 200, AI_MAX = 80, AI_WAIT = 60e3;
const DIRECT = { r1: 15000, r2: 15000, r3: 20000, msk: 30000, ru: 30000 };
const VALID = 5; // рабочих дней
// Праздники РФ: ежегодные + переносы по постановлению правительства (дописывать каждый год)
const HOLI = ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', '02-23', '03-08', '05-01', '05-09', '06-12', '11-04'];
const HOLI_Y = ['2026-01-09', '2026-03-09', '2026-05-11', '2026-12-31'];
const STRUCT = {
  corp: ['Главная', 'О компании', 'Услуги', 'Страница услуги', 'Кейсы', 'Контакты', 'Цены', 'Отзывы', 'Команда', 'Вопросы и ответы', 'Блог', 'Статья', 'Новости', 'Вакансии', 'Документы и сертификаты', 'Партнёрам', 'Производство', 'Гарантии', 'Доставка и оплата', 'Галерея'],
  shop: ['Главная', 'Каталог', 'Раздел каталога', 'Карточка товара', 'Корзина', 'Оформление заказа', 'Доставка и оплата', 'О компании', 'Контакты', 'Акции', 'Личный кабинет', 'Гарантия и возврат', 'Отзывы', 'Бренды', 'Вопросы и ответы', 'Блог', 'Статья', 'Оптовикам', 'Вакансии', 'Сравнение товаров'],
};
const KEEP_SITE = ['Дизайн под вашу отрасль', 'Адаптивная вёрстка для телефонов и планшетов', 'Тексты и наполнение страниц', 'Базовое SEO: заголовки, описания, карта сайта', 'Заявки в Telegram и на почту', 'Подключение домена и Яндекс Метрики'];
const KEEP_DIRECT = [['Разбор спроса и конкурентов в аукционе', 'До договора'], ['Семантика и минус-слова', 'Месяц 1'], ['Объявления для Поиска и РСЯ', 'Месяц 1'], ['Цели в Метрике на каждую кнопку и форму', 'Месяц 1'], ['Проверка посадочной и защита форм от ботов', 'Месяц 1'], ['Чистка запросов и площадок', 'Постоянно'], ['Тесты объявлений и стратегий', 'Постоянно'], ['Отчёт: расход, заявки, цена заявки', 'Каждый месяц']];
const LINKS = [['чат telegram', 'https://t.me/vesnin', 'click_telegram'], ['чат whatsapp', 'https://wa.me/message/ZNRHY54PV5TYI1', 'click_whatsapp'], ['чат max', 'https://max.ru/u/f9LHodD0cOLzIoHQFDNyrCKPvcLAdhvTg_SuRq5XdCnqyc_cAKB8rhm9kVM', 'click_max']];
const SITE = 'https://reconcept.ru';
/* ------------------------------------------------ */

const DIR = process.env.DATA_DIR || '/data', PASS = process.env.KP_PASS || '';
const db = new DatabaseSync(`${DIR}/kp.db`);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
CREATE TABLE IF NOT EXISTS kp(id INTEGER PRIMARY KEY AUTOINCREMENT, t TEXT UNIQUE NOT NULL, svc TEXT NOT NULL, a TEXT NOT NULL, e TEXT NOT NULL DEFAULT '{}', c TEXT, price INTEGER, st INTEGER NOT NULL DEFAULT 0, ts INTEGER NOT NULL, until INTEGER, vid TEXT, ip TEXT, ua TEXT, ref TEXT);
CREATE TABLE IF NOT EXISTS v(id INTEGER PRIMARY KEY AUTOINCREMENT, kp INTEGER NOT NULL, vid TEXT NOT NULL, ip TEXT, ua TEXT, start INTEGER NOT NULL, last INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS v_kp ON v(kp, vid, id);
CREATE TABLE IF NOT EXISTS fw(kp INTEGER NOT NULL, ua TEXT, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS job(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, kp INTEGER, data TEXT NOT NULL, sent INTEGER NOT NULL DEFAULT 0);`);
const q = {
  add: db.prepare('INSERT INTO kp(t,svc,a,ts,vid,ip,ua,ref) VALUES(?,?,?,?,?,?,?,?)'),
  byT: db.prepare('SELECT * FROM kp WHERE t=?'),
  byId: db.prepare('SELECT * FROM kp WHERE id=?'),
  setE: db.prepare('UPDATE kp SET e=? WHERE id=?'),
  done: db.prepare('UPDATE kp SET e=?, c=?, price=?, st=CASE st WHEN 2 THEN 2 ELSE 1 END, until=COALESCE(?, until) WHERE id=?'),
  st: db.prepare('UPDATE kp SET st=? WHERE id=?'),
  stale: db.prepare('SELECT id FROM kp WHERE st=0 AND ts<?'),
  list: db.prepare(`SELECT id, t, svc, price, st, ts, until, (SELECT COUNT(*) FROM v WHERE kp=kp.id) n, (SELECT MAX(last) FROM v WHERE kp=kp.id) lv FROM kp ORDER BY id DESC LIMIT 500`),
  visits: db.prepare('SELECT vid, ip, ua, start, last FROM v WHERE kp=? ORDER BY id'),
  lastV: db.prepare('SELECT id, last FROM v WHERE kp=? AND vid=? ORDER BY id DESC LIMIT 1'),
  prevV: db.prepare('SELECT last FROM v WHERE kp=? ORDER BY id DESC LIMIT 1'),
  nV: db.prepare('SELECT COUNT(*) n, SUM(vid=?) mine FROM v WHERE kp=?'),
  addV: db.prepare('INSERT INTO v(kp,vid,ip,ua,start,last) VALUES(?,?,?,?,?,?)'),
  touch: db.prepare('UPDATE v SET last=? WHERE id=?'),
  fw: db.prepare('INSERT INTO fw VALUES(?,?,?)'),
  fwOf: db.prepare('SELECT ua, ts FROM fw WHERE kp=? ORDER BY ts'),
  job: db.prepare('INSERT INTO job(kind,kp,data) VALUES(?,?,?)'),
  jobs: db.prepare('SELECT id, kind, kp, data FROM job WHERE sent<? ORDER BY id LIMIT 20'),
  sent: db.prepare('UPDATE job SET sent=? WHERE id=?'),
  jobOf: db.prepare('SELECT kind, kp FROM job WHERE id=?'),
  jobDel: db.prepare('DELETE FROM job WHERE id=?'),
};

/* ---------- утилиты ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const rub = (n) => `${n.toLocaleString('ru-RU')} ₽`;
const day = (ts) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' }).replace(/\s?г\.$/, '');
const ago = (ms) => { const m = Math.round(ms / 6e4); return m < 1 ? "только что" : m < 60 ? `${m} мин назад` : m < 2880 ? `${Math.round(m / 60)} ч назад` : `${Math.round(m / 1440)} дн назад`; };
const keyOf = (list, v) => (list.some((x) => x[0] === v) ? v : '');
const parse = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
const sameOrigin = (req) => { try { return new URL(String(req.headers.origin || '')).host === req.headers.host; } catch { return false; } };
function device(ua = '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '?';
  const br = /YaBrowser/.test(ua) ? 'Яндекс Браузер' : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '?';
  return `${os}, ${br}`;
}
// Срок цены: конец N-го рабочего дня по Москве
function workUntil(ts, n = VALID) {
  const d = new Date(ts + 3 * 36e5);
  while (n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const iso = d.toISOString().slice(0, 10), w = d.getUTCDay();
    if (w && w !== 6 && !HOLI.includes(iso.slice(5)) && !HOLI_Y.includes(iso)) n--;
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59) - 3 * 36e5;
}

/* ---------- расчёт ---------- */
function calcSite(a, e) {
  const g = e.group?.manual ? e.group.g : a.ind === 'other' ? (e.group?.g ?? 1) : GROUP[a.ind];
  const sc = SCALE.findIndex((x) => x[0] === a.scale);
  const own = (a.type === 'shop' && (a.goods === 'g3' || a.goods === 'g4')) || a.feat.some((f) => FEAT[f][1] === 2);
  let pages = 1, typical = 0;
  if (a.type !== 'landing') {
    if (e.pages?.unique) ({ unique: pages, typical } = e.pages);
    else pages = NORM[g] + ADD[sc];
  }
  const L = [];
  const base = (BASE[a.type] + (a.type === 'landing' ? 0 : Math.max(0, pages - INCL) * PAGE)) * (own ? 2 : 1) * K_IND[g] * K_SC[sc];
  L.push([`Дизайн и разработка: ${label(TYPES, a.type).toLowerCase()} ${own ? 'на своём коде' : 'на Tilda'}${a.type === 'landing' ? '' : `, ${pages} стр.`}`, base]);
  L.push([a.type === 'landing' ? 'Тексты и наполнение' : `Тексты и наполнение, ${pages} стр.`, pages * CONTENT]);
  if (typical) L.push(typical > AUTO ? [`Автоматический перенос ${typical} однотипных страниц`, MIGRATE_H * HOUR] : [`Перенос ${typical} однотипных страниц`, typical * TYPICAL]);
  for (const f of a.feat) L.push([label(FEATURES, f), FEAT[f][0] * HOUR * (!own && FEAT[f][1] === 1 ? 0.5 : 1)]);
  if (own && a.fill === 'self') L.push(['Панель управления для самостоятельного наполнения', ADMIN_H * HOUR]);
  if (a.wish) { const w = e.wish; L.push([w?.title || 'Ваша задача', w?.ok ? w.h * HOUR : null]); }
  const k = RISK * (a.brand === 'no' ? NOSTYLE : 1);
  const lines = L.map(([t, v]) => [t, v == null ? null : Math.floor((v * k) / 10) * 10]);
  return { lines, total: lines.reduce((s, l) => s + (l[1] || 0), 0), pages, typical, own, g, struct: a.type === 'landing' ? null : STRUCT[a.type === 'shop' ? 'shop' : 'corp'].slice(0, Math.min(pages, 20)) };
}
function calcDirect(a) {
  const p = DIRECT[a.reg];
  return { lines: [['Настройка и ведение рекламы, в месяц', p]], total: p, budget: ['r1', 'r2', 'r3'].includes(a.reg) ? 30000 : 60000 };
}
const calc = (svc, a, e) => (svc === 'site' ? calcSite(a, e) : calcDirect(a));

function finish(id, renew) {
  const r = q.byId.get(id);
  if (!r) return;
  const a = parse(r.a), e = parse(r.e);
  if (r.svc === 'site') {
    if (a.ind === 'other' && !e.group) e.group = { g: 1, flag: 'ИИ не ответил' };
    if (a.wish && !e.wish) e.wish = { ok: false, flag: 'ИИ не ответил' };
    if (e.site?.total && !e.pages) e.pages = guess(e.site);
  }
  const c = calc(r.svc, a, e);
  q.done.run(JSON.stringify(e), JSON.stringify(c), c.total, r.until && !renew ? null : workUntil(Date.now()), id);
}
// Без ИИ: каждый раздел карты = 1 шаблон, остальное однотипное
function guess(s) {
  const unique = Math.max(1, Math.min(s.groups, 60));
  return { unique, typical: Math.max(0, s.total - unique), flag: 'оценка без ИИ' };
}
setTimeout(() => { for (const { id } of q.stale.all(Date.now() - AI_WAIT)) finish(id); }, 5e3).unref();

/* ---------- старый сайт: карта сайта или меню (только публичные адреса) ---------- */
const BL = new BlockList();
for (const [a, p] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3]]) BL.addSubnet(a, p, 'ipv4');
for (const [a, p] of [['::', 127], ['fc00::', 7], ['fe80::', 10], ['::ffff:0:0', 96], ['64:ff9b::', 96], ['ff00::', 8]]) BL.addSubnet(a, p, 'ipv6');
const bad = (ip) => BL.check(ip, isIP(ip) === 6 ? 'ipv6' : 'ipv4');
function safeLookup(host, opts, cb) {
  lookup(host, { all: true }, (err, list) => {
    if (err) return cb(err);
    if (!list.length || list.some((x) => bad(x.address))) return cb(new Error('blocked'));
    opts.all ? cb(null, list) : cb(null, list[0].address, list[0].family);
  });
}
function get(href, max = 4e6, hops = 3) {
  return new Promise((ok, no) => {
    const u = new URL(href);
    if (!/^https?:$/.test(u.protocol) || (u.port && !['80', '443'].includes(u.port)) || u.username || (isIP(u.hostname.replace(/^\[|\]$/g, '')) && bad(u.hostname.replace(/^\[|\]$/g, '')))) return no(new Error('url'));
    const req = (u.protocol === 'https:' ? https : http).get(u, { lookup: safeLookup, timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReconceptBot/1.0; +https://reconcept.ru)', 'Accept-Encoding': 'gzip, br' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops) { res.resume(); return get(new URL(res.headers.location, u).href, max, hops - 1).then(ok, no); }
      const parts = []; let n = 0;
      res.on('data', (c) => { n += c.length; if (n > max) { req.destroy(); no(new Error('big')); } else parts.push(c); });
      res.on('end', () => {
        try {
          let b = Buffer.concat(parts); const enc = res.headers['content-encoding'], o = { maxOutputLength: 5e7 };
          if (enc === 'br') b = brotliDecompressSync(b, o); else if (enc === 'gzip' || (b[0] === 0x1f && b[1] === 0x8b)) b = gunzipSync(b, o);
          ok({ status: res.statusCode, text: b.toString('utf8'), url: u.href });
        } catch (e) { no(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', no);
  });
}
function summary(set) {
  const g = new Map();
  for (const p of set) {
    const s = p.split('/').filter(Boolean), k = s.length ? `/${s[0]}${s.length > 1 ? '/…' : ''}` : '/';
    const x = g.get(k) || g.set(k, { n: 0, ex: [] }).get(k); x.n++; if (x.ex.length < 3) x.ex.push(p);
  }
  const rows = [...g].sort((a, b) => b[1].n - a[1].n);
  return { groups: g.size, total: set.size, text: rows.slice(0, 60).map(([k, x]) => `${k} — ${x.n} (${x.ex.join(', ')})`).join('\n') };
}
async function analyze(raw) {
  let u; try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return { src: 'none' }; }
  const host = u.hostname.replace(/^www\./, ''), t0 = Date.now(), urls = new Set();
  const own = (h) => { try { const p = new URL(h, u); return p.hostname.replace(/^www\./, '') === host && /^https?:$/.test(p.protocol) ? decodeURI(p.pathname).replace(/\/+$/, '') || '/' : null; } catch { return null; } };
  let maps = [];
  try { const r = await get(`${u.origin}/robots.txt`, 2e5); if (r.status === 200) maps = [...r.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]).slice(0, 5); } catch {}
  if (!maps.length) maps = [`${u.origin}/sitemap.xml`];
  for (let i = 0; i < maps.length && i < 40 && Date.now() - t0 < 25e3 && urls.size < 5e4; i++) {
    let x; try { x = await get(maps[i], 2e7); } catch { continue; }
    if (x.status !== 200) continue;
    const locs = [...x.text.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/gi)].map((m) => m[1].replace(/&amp;/g, '&'));
    if (/<sitemapindex/i.test(x.text)) maps.push(...locs.slice(0, 50));
    else for (const l of locs) { const p = own(l); if (p) urls.add(p); }
  }
  if (urls.size) return { src: 'sitemap', ...summary(urls) };
  try {
    const r = await get(u.href, 3e6), links = new Set();
    if (r.status === 200) for (const m of r.text.matchAll(/<a\s[^>]*href=["']([^"'#]+)/gi)) { const p = own(m[1]); if (p && !/\.(jpe?g|png|pdf|webp|svg|zip|docx?)$/i.test(p)) links.add(p); }
    if (links.size) return { src: 'menu', ...summary(links) };
  } catch {}
  return { src: 'none' };
}

/* ---------- очередь для моста ---------- */
const waiters = new Set();
const enqueue = (kind, kp, data) => { q.job.run(kind, kp, JSON.stringify(data)); for (const w of waiters) w(); };
const signal = (text, id) => enqueue('sig', id, { text, url: `${SITE}/kp/admin#${id}` });
function pull(req, res) {
  let timer;
  const done = () => {
    const now = Date.now(), rows = q.jobs.all(now - 12e4); // неподтверждённые — повтор через 2 мин
    if (!rows.length) return false;
    for (const r of rows) q.sent.run(now, r.id);
    waiters.delete(done); clearTimeout(timer); json(res, 200, rows.map((r) => ({ ...r, data: parse(r.data) }))); return true;
  };
  if (done()) return;
  timer = setTimeout(() => { waiters.delete(done); json(res, 200, []); }, 25e3);
  waiters.add(done);
  res.on('close', () => { waiters.delete(done); clearTimeout(timer); });
}
async function bridgeDone(req, res) {
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const j = q.jobOf.get(Number(b.id) || 0);
  if (!j) return json(res, 200, {});
  q.jobDel.run(Number(b.id));
  const r = q.byId.get(j.kp);
  if (j.kind === 'ai' && r && r.st === 0) {
    const e = parse(r.e), x = b.r || {};
    const int = (v, lo, hi) => (Number.isFinite(+v) ? Math.min(Math.max(Math.round(+v), lo), hi) : null);
    if (x.group && [0, 1, 2].includes(x.group.g)) e.group = x.group.sure ? { g: x.group.g, ai: 1 } : { g: 1, ai: 1, flag: `ИИ не уверен (предлагал ×${K_IND[x.group.g]})` };
    if (x.wish) { const h = int(x.wish.h, 0, 999); e.wish = { title: str(x.wish.title, 80), h, ok: !!x.wish.sure && h != null && h <= AI_MAX, ai: 1 }; }
    if (x.pages && e.site?.total) { const u = int(x.pages.unique, 1, 100); if (u) e.pages = { unique: u, typical: Math.max(0, e.site.total - u), ai: 1 }; }
    q.setE.run(JSON.stringify(e), r.id);
    finish(r.id);
  }
  json(res, 200, {});
}

/* ---------- анкета ---------- */
function validate(b) {
  const svc = keyOf(SERVICES, b.svc), a = {};
  if (svc === 'site') {
    Object.assign(a, { type: keyOf(TYPES, b.type), ind: keyOf(INDUSTRIES, b.ind), scale: keyOf(SCALE, b.scale), fill: keyOf(FILL, b.fill), brand: keyOf(BRAND, b.brand) });
    if (Object.values(a).some((v) => !v)) return null;
    a.goods = a.type === 'shop' ? keyOf(GOODS, b.goods) : '';
    if (a.type === 'shop' && !a.goods) return null;
    a.feat = [...new Set(Array.isArray(b.feat) ? b.feat : [])].filter((f) => FEAT[f]);
  } else if (svc === 'direct') {
    Object.assign(a, { reg: keyOf(REGIONS, b.reg), ind: keyOf(INDUSTRIES, b.ind) });
    if (!a.reg || !a.ind) return null;
  } else return null;
  a.indText = a.ind === 'other' ? str(b.indText, 200) : '';
  a.wish = svc === 'site' ? str(b.wish, 1000) : '';
  a.url = str(b.url, 300);
  return { svc, a };
}
async function create(req, res) {
  const ip = ipOf(req);
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const v = validate(b);
  if (!v || !(Number(b.ms) >= 3000)) return json(res, 400, {});
  if (!limit(`kc${ip}`, 10, 36e5) || !limit('kcall', 300, 36e5)) return json(res, 429, {});
  const t = randomBytes(24).toString('base64url'), { svc, a } = v;
  const id = Number(q.add.run(t, svc, JSON.stringify(a), Date.now(), str(b.vid, 36), ip, str(req.headers['user-agent'], 300), str(b.ref, 300)).lastInsertRowid);
  const site = svc === 'site' && a.url && a.type !== 'landing';
  const ai = svc === 'site' && (a.wish || site || (a.ind === 'other' && a.indText));
  if (!ai) { finish(id); return json(res, 200, { t }); }
  json(res, 200, { t, wait: site ? 'pages' : 'wish' });
  setTimeout(() => q.byId.get(id)?.st === 0 && finish(id), AI_WAIT).unref?.(); // страховка, если мост молчит
  const e = {};
  if (site) { e.site = await analyze(a.url).catch(() => ({ src: 'none' })); q.setE.run(JSON.stringify(e), id); }
  if (!a.wish && !(a.ind === 'other' && a.indText) && !e.site?.total) return finish(id);
  const own = (a.type === 'shop' && ['g3', 'g4'].includes(a.goods)) || a.feat.some((f) => FEAT[f][1] === 2);
  enqueue('ai', id, { type: label(TYPES, a.type), platform: own ? 'свой код' : 'Tilda', ind: a.ind === 'other' ? a.indText : label(INDUSTRIES, a.ind), needGroup: a.ind === 'other' && !!a.indText, wish: a.wish, feat: a.feat.map((f) => label(FEATURES, f)), site: e.site?.total ? { src: e.site.src, total: e.site.total, text: e.site.text } : null });
}

/* ---------- страница КП ---------- */
let TPL;
const tpl = async (root) => (TPL ??= await readFile(`${root}kp/view.html`, 'utf8'));
function render(r, now) {
  const a = parse(r.a), c = parse(r.c), old = r.until < now;
  const money = (v) => (old ? '' : v == null ? 'обсудим лично' : rub(v));
  const sub = r.svc === 'site'
    ? [label(INDUSTRIES, a.ind) === 'Другое' ? a.indText || 'Другое' : label(INDUSTRIES, a.ind), `${label(SCALE, a.scale)} человек`, a.type === 'landing' ? '' : `расчёт на ${c.pages} стр.`]
    : [label(REGIONS, a.reg), label(INDUSTRIES, a.ind) === 'Другое' ? a.indText : label(INDUSTRIES, a.ind)];
  const h1 = r.svc === 'site' ? `${label(TYPES, a.type)} ${c.own ? 'на своём коде' : 'на Tilda'}` : 'Реклама в Яндекс Директе';
  const total = old
    ? `<div class="kp__sum"><button class="pill pill--fill" type="button" data-recalc>пересчитать</button><span>Срок цены истёк ${day(r.until)}</span></div>`
    : `<div class="kp__sum"><span class="kp__price">${rub(r.price)}${r.svc === 'direct' ? '<small> в месяц</small>' : ''}</span><span>Цена действует до ${day(r.until)}</span></div>`;
  const rows = c.lines.map(([t, v]) => `<tr><td>${esc(t)}</td><td>${money(v)}</td></tr>`).join('');
  const list = (h, items) => `<h2 class="kp__h2">${h}</h2><ul class="kp__ul">${items.join('')}</ul>`;
  return `<p class="kp__meta">Коммерческое предложение №${r.id} · ${day(r.ts)}</p>
<h1 class="kp__h1">${esc(h1)}</h1><p class="kp__sub">${sub.filter(Boolean).map(esc).join(' · ')}</p>${total}
<h2 class="kp__h2">Смета</h2><table class="kp__tbl"><tbody>${rows}</tbody>${old ? '' : `<tfoot><tr><td>Итого${r.svc === 'direct' ? ' в месяц' : ''}</td><td>${rub(r.price)}</td></tr></tfoot>`}</table>
${r.svc === 'direct' ? `<p class="kp__note">Рекламный бюджет Директа оплачивается отдельно: рекомендуем от ${rub(c.budget)} в месяц. Первый месяц — настройка и запуск, стоит столько же, сколько ведение.</p>${list('Что входит', KEEP_DIRECT.map(([t, w]) => `<li><span>${t}</span><span>${w}</span></li>`))}`
  : `${c.struct ? list(`Структура сайта`, c.struct.map((s) => `<li>${s}</li>`).concat(c.pages > 20 ? [`<li>и ещё ${c.pages - 20} стр.</li>`] : [])) : ''}${list('Что входит', KEEP_SITE.map((s) => `<li>${s}</li>`))}`}
<h2 class="kp__h2">Обсудить КП №${r.id}</h2><div class="kp__btns">${LINKS.map(([t, h, g]) => `<a class="pill" href="${h}" target="_blank" rel="noopener" data-goal="${g}">${t}</a>`).join('')}</div>
<p class="kp__note">Не является офертой, итоговая цена после согласования договора.</p>`;
}
const PREVIEW = /TelegramBot|WhatsApp|vkShare|facebookexternalhit|Twitterbot|Slackbot|Discordbot|Viber|SkypeUriPreview|YandexBot|Googlebot/i;
async function view(req, res, t, ctx) {
  const r = q.byT.get(t);
  if (!r) return ctx.notFound(res);
  const ua = String(req.headers['user-agent'] || ''), now = Date.now();
  if (PREVIEW.test(ua)) q.fw.run(r.id, ua.slice(0, 200), now);
  const html = r.st === 2 ? '<h1 class="kp__h1">Предложение отозвано</h1><p class="kp__sub">Напишите нам — обновим расчёт.</p>'
    : r.st === 0 ? '<h1 class="kp__h1">Считаю ваше предложение, минутку...</h1><meta http-equiv="refresh" content="3">'
    : render(r, now);
  const page = (await tpl(ctx.ROOT)).replaceAll('https://reconcept.ru/kp/view', `${SITE}/kp/${t}`).replaceAll('Коммерческое предложение — Reconcept', `КП №${r.id} — Reconcept`).replace('__KP__', () => html).replace('__T__', t);
  res.writeHead(r.st === 2 ? 410 : 200, { ...ctx.SECURITY, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  res.end(page);
}

/* ---------- отслеживание ---------- */
const VID = /^[0-9a-f-]{36}$/;
async function seen(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36), ip = ipOf(req);
  if (!r || r.st !== 1 || !VID.test(vid) || !limit(`ks${ip}`, 60, 6e5)) return json(res, 200, {});
  if (admin(req)) return json(res, 200, { me: 1 }); // свои просмотры не считаем
  const now = Date.now(), lv = q.lastV.get(r.id, vid);
  if (lv && now - lv.last < 18e5) { q.touch.run(now, lv.id); return json(res, 200, {}); }
  const { n, mine } = q.nV.get(vid, r.id), prev = q.prevV.get(r.id), ua = str(req.headers['user-agent'], 300);
  q.addV.run(r.id, vid, ip, ua, now, now);
  if (!n && vid === r.vid) return json(res, 200, {}); // первый показ после анкеты
  const a = parse(r.a);
  signal([`👀 КП №${r.id} · ${r.svc === 'site' ? label(TYPES, a.type) : 'Директ'} · ${rub(r.price)}`,
    `Визит ${n + 1}${prev ? ` · прошлый ${ago(now - prev.last)}` : ''}`,
    `Устройство: ${device(ua)}${mine || vid === r.vid ? '' : ' (новое)'}`,
    r.until < now ? 'Срок цены истёк' : ''].filter(Boolean).join('\n'), r.id);
  json(res, 200, {});
}
async function recalc(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40));
  if (!r || r.st !== 1 || r.until > Date.now() || !limit(`kr${ipOf(req)}`, 5, 36e5)) return json(res, 400, {});
  finish(r.id, true);
  if (!admin(req)) signal(`🔄 КП №${r.id}: клиент нажал «Пересчитать», новая цена ${rub(q.byId.get(r.id).price)}`, r.id);
  json(res, 200, {});
}

/* ---------- админка ---------- */
const sign = (exp) => createHmac('sha256', PASS).update(`kpa${exp}`).digest('base64url');
function admin(req) {
  if (!PASS) return false;
  const m = String(req.headers.cookie || '').match(/(?:^|;\s*)kpa=(\d+)\.([\w-]+)/);
  if (!m || +m[1] < Date.now()) return false;
  const a = Buffer.from(m[2]), b = Buffer.from(sign(m[1]));
  return a.length === b.length && timingSafeEqual(a, b);
}
async function adminApi(req, res, p) {
  if (!sameOrigin(req) && req.method !== 'GET') return json(res, 403, {});
  if (p === 'login') {
    let b; try { b = await body(req); } catch { return json(res, 400, {}); }
    if (!PASS || !limit(`kl${ipOf(req)}`, 5, 6e5)) return json(res, 429, {});
    const x = Buffer.from(createHmac('sha256', 'k').update(str(b.pass, 200)).digest()), y = Buffer.from(createHmac('sha256', 'k').update(PASS).digest());
    if (!timingSafeEqual(x, y)) return json(res, 401, {});
    const exp = Date.now() + 90 * 864e5;
    res.setHeader('Set-Cookie', `kpa=${exp}.${sign(exp)}; Path=/; Max-Age=${90 * 86400}; HttpOnly; Secure; SameSite=Strict`);
    return json(res, 200, {});
  }
  if (!admin(req)) return json(res, 401, {});
  if (p === 'logout') { res.setHeader('Set-Cookie', 'kpa=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'); return json(res, 200, {}); }
  if (p === 'list') return json(res, 200, q.list.all());
  let b = {};
  if (req.method === 'POST') { try { b = await body(req); } catch { return json(res, 400, {}); } }
  const id = Number(b.id || new URL(req.url, 'http://x').searchParams.get('id')) || 0, r = q.byId.get(id);
  if (!r) return json(res, 404, {});
  if (p === 'revoke') q.st.run(b.on ? 2 : 1, id);
  if (p === 'patch' && r.st !== 0) { // ручная правка оценок → пересчёт
    const e = parse(r.e);
    if (b.unique != null) e.pages = { unique: Math.min(Math.max(Math.round(+b.unique) || 1, 1), 100), typical: Math.max(Math.round(+b.typical) || 0, 0), manual: 1 };
    if (b.wishH !== undefined) e.wish = { ...e.wish, h: b.wishH === null ? null : Math.max(Math.round(+b.wishH) || 0, 0), ok: b.wishH !== null, title: str(b.wishTitle, 80) || e.wish?.title, manual: 1 };
    if ([0, 1, 2].includes(b.group)) e.group = { g: b.group, manual: 1 };
    q.setE.run(JSON.stringify(e), id); finish(id);
  }
  const x = q.byId.get(id);
  json(res, 200, { ...x, a: parse(x.a), e: parse(x.e), c: parse(x.c), visits: q.visits.all(id).map((v) => ({ ...v, dev: device(v.ua) })), fw: q.fwOf.all(id), labels: { svc: label(SERVICES, x.svc) } });
}

/* ---------- роутер ---------- */
const TOKEN = /^\/kp\/([\w-]{32})$/;
export function kp(req, res, url, ctx) {
  const m = url.pathname.match(TOKEN);
  if (m && req.method === 'GET') return view(req, res, m[1], ctx);
  const p = url.pathname.slice(8); // после /api/kp/
  if (p === 'create' && req.method === 'POST') return create(req, res);
  if (p === 'status' && req.method === 'GET') { const r = q.byT.get(url.searchParams.get('t') || ''); return json(res, r ? 200 : 404, { st: r?.st }); }
  if (p === 'seen' && req.method === 'POST') return seen(req, res);
  if (p === 'recalc' && req.method === 'POST') return recalc(req, res);
  if (p.startsWith('admin/')) return adminApi(req, res, p.slice(6));
  if (p.startsWith('bridge/')) {
    if (!authed(req)) return json(res, 401, {});
    if (p === 'bridge/pull' && req.method === 'GET') return pull(req, res);
    if (p === 'bridge/done' && req.method === 'POST') return bridgeDone(req, res);
  }
  json(res, 404, {});
}
