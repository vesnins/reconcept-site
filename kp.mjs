// Коммерческие предложения: анкета → расчёт на сервере → личная ссылка /kp/<токен>. SQLite /data/kp.db, хранится бессрочно.
// ИИ (отрасль «Другое», хотелка, страницы старого сайта) — через мост на Hetzner: /api/kp/bridge/* (тот же CHAT_SECRET).
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { BlockList, isIP } from 'node:net';
import { lookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';
import { limit, str, ipOf, authed, json, body, hooks } from './chat.mjs';
import { SERVICES, TYPES, INDUSTRIES, SCALE, GOODS, FEATURES, FILL, BRAND, REGIONS, CASES_SITE, CASES_DIRECT, REVIEWS, DOUBTS, label } from './kp-data.mjs';

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
const TG = 'https://t.me/vesnin', WA = 'https://wa.me/message/ZNRHY54PV5TYI1', MAX = 'https://max.ru/u/f9LHodD0cOLzIoHQFDNyrCKPvcLAdhvTg_SuRq5XdCnqyc_cAKB8rhm9kVM';
const PH = ['создано', 'открыто', 'изучено', 'хочет работать', 'договор', 'отказ'], STUDY = 30; // «изучено»: секунд на цене и смете
const REMIND = 15 * 6e4; // «Согласовать» нажал, «Написал» не отмечено — напоминание
const SITE = 'https://reconcept.ru';
// Город по IP — DaData (ключ DADATA_KEY, бесплатно 10 000 в день); провайдер и компания — RIPE (без ключа). Кэш 30 дней.
const GEO_TTL = 30 * 864e5, DADATA = process.env.DADATA_KEY || '';
const NET_DC = /host|cloud|data ?cent|server|vps|vds|colo|hetzner|selectel|timeweb|beget|reg\.ru|aeza|digitalocean|amazon|google|microsoft|ovh|linode|vultr|contabo|m247|datacamp|leaseweb|scaleway|firstbyte|vdsina|g-?core|cloudflare|yandex.?cloud|choopa|tencent|alibaba|oracle|vpn|proxy|tor\b/i;
const NET_MOB = /mobile|gprs|lte|\b[345]g\b|ggsn|megafon|tele2|t2 mobile|yota|motiv|win mobile|volna|k-telecom/i;
const NET_ISP = /telecom|telekom|rostelecom|er-telecom|dom\.ru|mts|beeline|vimpelcom|mgts|ttk|transtelecom|provider|isp|broadband|net\b|online|kabel|cable|wifi|fiber|optic|link|сеть|связь|телеком/i;
const STUDIO = /studio|web|digital|agency|seo|media|creative|marketing|студи|веб|диджитал|агентств|реклам|маркетинг/i; // сеть похожа на студию — признак конкурента
/* ------------------------------------------------ */

const DIR = process.env.DATA_DIR || '/data', PASS = process.env.KP_PASS || '';
const db = new DatabaseSync(`${DIR}/kp.db`);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
CREATE TABLE IF NOT EXISTS kp(id INTEGER PRIMARY KEY AUTOINCREMENT, t TEXT UNIQUE NOT NULL, svc TEXT NOT NULL, a TEXT NOT NULL, e TEXT NOT NULL DEFAULT '{}', c TEXT, price INTEGER, st INTEGER NOT NULL DEFAULT 0, ts INTEGER NOT NULL, until INTEGER, vid TEXT, ip TEXT, ua TEXT, ref TEXT);
CREATE TABLE IF NOT EXISTS v(id INTEGER PRIMARY KEY AUTOINCREMENT, kp INTEGER NOT NULL, vid TEXT NOT NULL, ip TEXT, ua TEXT, start INTEGER NOT NULL, last INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS v_kp ON v(kp, vid, id);
CREATE TABLE IF NOT EXISTS fw(kp INTEGER NOT NULL, ua TEXT, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS job(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, kp INTEGER, data TEXT NOT NULL, sent INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS ev(d TEXT NOT NULL, k TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(d, k));
CREATE TABLE IF NOT EXISTS act(kp INTEGER NOT NULL, vid TEXT, ts INTEGER NOT NULL, k TEXT NOT NULL, v TEXT);
CREATE INDEX IF NOT EXISTS act_kp ON act(kp, ts);
CREATE TABLE IF NOT EXISTS sh(c TEXT PRIMARY KEY, kp INTEGER NOT NULL, vid TEXT, m TEXT, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS geo(ip TEXT PRIMARY KEY, ts INTEGER NOT NULL, d TEXT NOT NULL);`);
// КП: sid — чат КП, ph — статус (PH), agr/asum/aoff — «Согласовать», ok — «написал» отмечено, rem — напоминание, cht — первое сообщение в чат
// визит: b — секунды по блокам, lb — блок перед уходом, cp — копирования, pr — печать, cl — нажатия «связаться»
for (const c of ['b TEXT', 'lb TEXT', 'cp INTEGER DEFAULT 0', 'pr INTEGER DEFAULT 0', 'cl INTEGER DEFAULT 0', 'f TEXT', 'opt TEXT', 'sum INTEGER', 'tz TEXT']) try { db.exec(`ALTER TABLE v ADD COLUMN ${c}`); } catch {}
for (const c of ['sid TEXT', 'ph INTEGER DEFAULT 0', 'agr INTEGER', 'asum INTEGER', 'aoff TEXT', 'ok INTEGER DEFAULT 0', 'rem INTEGER DEFAULT 0', 'cht INTEGER', 'agl INTEGER', 'src TEXT', 'roi TEXT', 'doubt TEXT']) try { db.exec(`ALTER TABLE kp ADD COLUMN ${c}`); } catch {}
for (const { id } of db.prepare('SELECT id FROM kp WHERE sid IS NULL').all()) db.prepare('UPDATE kp SET sid=? WHERE id=?').run(randomUUID(), id);
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS kp_sid ON kp(sid)');
const q = {
  add: db.prepare('INSERT INTO kp(t,svc,a,ts,vid,ip,ua,ref,sid,src) VALUES(?,?,?,?,?,?,?,?,?,?)'),
  geo: db.prepare('SELECT ts, d FROM geo WHERE ip=?'),
  geoSet: db.prepare('INSERT OR REPLACE INTO geo VALUES(?,?,?)'),
  same: db.prepare('SELECT id, ts FROM kp WHERE id<>?1 AND st>0 AND (vid=?2 OR ip=?3 OR id IN (SELECT kp FROM v WHERE vid=?2)) ORDER BY id DESC LIMIT 10'),
  setRoi: db.prepare('UPDATE kp SET roi=? WHERE id=?'),
  setDoubt: db.prepare('UPDATE kp SET doubt=? WHERE id=?'),
  vTz: db.prepare('UPDATE v SET tz=? WHERE id=?'),
  bySid: db.prepare('SELECT id FROM kp WHERE sid=?'),
  sids: db.prepare('SELECT sid FROM kp'),
  up: db.prepare('UPDATE kp SET ph=? WHERE id=? AND ph<? AND ph<4'),
  ph: db.prepare('UPDATE kp SET ph=? WHERE id=?'),
  agr: db.prepare('UPDATE kp SET agr=COALESCE(agr, ?1), agl=?1, asum=?2, aoff=?3, rem=0, ok=0 WHERE id=?4'),
  ok: db.prepare('UPDATE kp SET ok=1 WHERE id=?'),
  remind: db.prepare('SELECT id, asum FROM kp WHERE agl<? AND ok=0 AND rem=0'),
  rem: db.prepare('UPDATE kp SET rem=1 WHERE id=?'),
  cht: db.prepare('UPDATE kp SET cht=COALESCE(cht, ?) WHERE id=?'),
  act: db.prepare('INSERT INTO act VALUES(?,?,?,?,?)'),
  acts: db.prepare('SELECT vid, ts, k, v FROM act WHERE kp=? ORDER BY ts DESC LIMIT 300'),
  sh: db.prepare('INSERT OR IGNORE INTO sh VALUES(?,?,?,?,?)'),
  shOf: db.prepare('SELECT * FROM sh WHERE c=?'),
  shs: db.prepare('SELECT c, vid, m, ts, (SELECT COUNT(*) FROM v WHERE v.f=sh.c) n FROM sh WHERE kp=? ORDER BY ts'),
  vOpt: db.prepare('UPDATE v SET opt=?, sum=? WHERE id=?'),
  byT: db.prepare('SELECT * FROM kp WHERE t=?'),
  byId: db.prepare('SELECT * FROM kp WHERE id=?'),
  setE: db.prepare('UPDATE kp SET e=? WHERE id=?'),
  done: db.prepare('UPDATE kp SET e=?, c=?, price=?, st=CASE st WHEN 2 THEN 2 ELSE 1 END, until=COALESCE(?, until) WHERE id=?'),
  st: db.prepare('UPDATE kp SET st=? WHERE id=?'),
  stale: db.prepare('SELECT id FROM kp WHERE st=0 AND ts<?'),
  list: db.prepare(`SELECT id, t, svc, price, st, ph, agr, ts, until, (SELECT COUNT(*) FROM v WHERE kp=kp.id) n, (SELECT MAX(last) FROM v WHERE kp=kp.id) lv FROM kp ORDER BY id DESC LIMIT 500`),
  visits: db.prepare('SELECT vid, ip, ua, start, last, b, lb, cp, pr, cl, f, opt, sum FROM v WHERE kp=? ORDER BY id'),
  vB: db.prepare('SELECT b FROM v WHERE id=?'),
  vUpd: db.prepare('UPDATE v SET b=?, lb=COALESCE(?, lb), cp=cp+?, pr=pr+?, cl=cl+? WHERE id=?'),
  evAdd: db.prepare('INSERT INTO ev VALUES(?,?,1) ON CONFLICT(d, k) DO UPDATE SET n=n+1'),
  evSum: db.prepare('SELECT k, SUM(n) n FROM ev WHERE d>=? GROUP BY k'),
  sKp: db.prepare('SELECT id, svc, a, e, price, ts, vid, ref, src, agr, cht FROM kp WHERE ts>=? AND st>0'),
  sV: db.prepare('SELECT v.kp, v.vid, v.b, v.lb, v.cl, kp.vid cv FROM v JOIN kp ON kp.id=v.kp WHERE kp.ts>=? ORDER BY v.id'),
  lastV: db.prepare('SELECT id, last FROM v WHERE kp=? AND vid=? ORDER BY id DESC LIMIT 1'),
  prevV: db.prepare('SELECT last, lb FROM v WHERE kp=? ORDER BY id DESC LIMIT 1'),
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
function calcSite(a, e, off = []) {
  const g = e.group?.manual ? e.group.g : a.ind === 'other' ? (e.group?.g ?? 1) : GROUP[a.ind];
  const sc = SCALE.findIndex((x) => x[0] === a.scale);
  const own = (a.type === 'shop' && (a.goods === 'g3' || a.goods === 'g4')) || a.feat.some((f) => FEAT[f][1] === 2 && !off.includes(`f:${f}`));
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
  for (const f of a.feat) L.push([label(FEATURES, f), FEAT[f][0] * HOUR * (!own && FEAT[f][1] === 1 ? 0.5 : 1), `f:${f}`]);
  if (own && a.fill === 'self') L.push(['Панель управления для самостоятельного наполнения', ADMIN_H * HOUR]);
  if (a.wish) { const w = e.wish; L.push([w?.title || 'Ваша задача', w?.ok ? w.h * HOUR : null, 'w']); }
  const k = RISK * (a.brand === 'no' ? NOSTYLE : 1);
  // строка: [название, цена, ключ опции, 1 — снята галочка]
  const lines = L.map(([t, v, o]) => [t, v == null ? null : Math.floor((v * k) / 10) * 10, ...(o ? [o, +off.includes(o)] : [])]);
  return { lines, total: lines.reduce((s, l) => s + (l[3] ? 0 : l[1] || 0), 0), pages, typical, own, g, struct: a.type === 'landing' ? null : STRUCT[a.type === 'shop' ? 'shop' : 'corp'].slice(0, Math.min(pages, 20)) };
}
function calcDirect(a) {
  const p = DIRECT[a.reg];
  return { lines: [['Настройка и ведение рекламы, в месяц', p]], total: p, budget: ['r1', 'r2', 'r3'].includes(a.reg) ? 30000 : 60000 };
}
const calc = (svc, a, e, off) => (svc === 'site' ? calcSite(a, e, off) : calcDirect(a));
// Снятые галочки: только существующие опции
const offOf = (r, x) => { const ok = new Set(parse(r.c).lines?.map((l) => l[2]).filter(Boolean)); return Array.isArray(x) ? [...new Set(x)].filter((o) => ok.has(o)).slice(0, 30) : []; };

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
  if (r.st === 0) signalNew(id).catch(console.error);
}
const src = (ref) => { try { const u = new URL(ref); return u.hostname.replace(/^www\./, '') === 'reconcept.ru' ? u.pathname : u.hostname; } catch { return 'прямой заход'; } };
// Источник визита на сайт (site.ts): страница входа, сайт-источник, utm, yclid, путь по сайту до анкеты
function srcIn(x) {
  if (!x || typeof x !== 'object') return null;
  const utm = {}; for (const k of ['source', 'medium', 'campaign', 'content', 'term']) if (str(x.utm?.[k], 100)) utm[k] = str(x.utm[k], 100);
  const path = (Array.isArray(x.path) ? x.path : []).slice(-15).map((p) => [str(p?.[0], 150), +p?.[1] || 0]).filter((p) => p[0].startsWith('/'));
  return { lp: str(x.lp, 150), ref: str(x.ref, 100), utm, y: x.y ? 1 : 0, ts: +x.ts || 0, path };
}
const chan = (s) => (!s?.utm ? '' : s.y || (/yandex/i.test(s.utm.source || '') && /cpc|ppc|paid/i.test(s.utm.medium || '')) ? 'Директ' : s.utm.source ? `utm: ${s.utm.source}` : /yandex|google|bing|mail\.ru/.test(s.ref) ? `поиск ${s.ref}` : s.ref || 'прямой заход');
const srcText = (s) => (s?.utm ? [chan(s), s.utm.campaign && `кампания ${s.utm.campaign}`, s.utm.term && `запрос «${s.utm.term}»`, s.lp && `вход ${s.lp}`].filter(Boolean).join(' · ') : '');
const pathText = (s, ts) => s?.path?.length ? s.path.filter((p) => !p[1] || p[1] <= ts).map((p) => p[0]).slice(-8).join(' → ') : '';

/* ---------- кто клиент: город, сеть, компания; повторный; похож на конкурента ---------- */
const getJ = (u, h = {}) => fetch(u, { headers: { Accept: 'application/json', 'User-Agent': 'reconcept-kp', ...h }, signal: AbortSignal.timeout(5000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const pend = new Map();
async function geo(ip) {
  if (!isIP(ip) || bad(ip)) return {};
  const c = q.geo.get(ip);
  if (c && Date.now() - c.ts < GEO_TTL) return parse(c.d);
  if (pend.has(ip)) return pend.get(ip);
  const p = (async () => { try {
    const ripe = (d) => getJ(`https://stat.ripe.net/data/${d}/data.json?resource=${ip}&sourceapp=reconcept`);
    const [dd, po, wh] = await Promise.all([DADATA ? getJ(`https://suggestions.dadata.ru/suggestions/api/4_1/rs/iplocate/address?ip=${ip}`, { Authorization: `Token ${DADATA}` }) : null, ripe('prefix-overview'), ripe('whois')]);
    const loc = dd?.location?.data, asn = po?.data?.asns?.[0], r0 = wh?.data?.records?.[0], rec = Array.isArray(r0) ? r0 : [];
    const f = (k) => rec.filter((x) => x?.key === k).map((x) => x.value).join(' ').slice(0, 120);
    const holder = String(asn?.holder || '').slice(0, 120), net = f('netname'), descr = f('descr') || f('org-name');
    const all = `${holder} ${net} ${descr}`;
    // своя сеть компании: описание блока не про провайдера
    const office = descr && !NET_ISP.test(`${net} ${descr}`) && !NET_DC.test(all) && !holder.toLowerCase().includes(descr.toLowerCase().slice(0, 8));
    const d = { city: loc ? [loc.city || loc.settlement || loc.region, loc.country !== 'Россия' && loc.country].filter(Boolean).join(', ') : '',
      isp: holder, net: NET_DC.test(all) ? 'дата-центр или VPN' : NET_MOB.test(all) ? 'мобильная' : office ? 'офисная' : holder ? 'домашняя или офисная' : '', org: office ? descr : '' };
    if (holder || d.city) q.geoSet.run(ip, Date.now(), JSON.stringify(d));
    return d;
  } catch (e) { console.error(e); return {}; } finally { pend.delete(ip); } })();
  pend.set(ip, p); return p;
}
const geoText = (g) => [g.city, g.org ? `${g.org} (${g.net})` : g.net && `${g.net} сеть${g.isp ? `, ${g.isp}` : ''}`].filter(Boolean).join(' · ');
const clock = (tz) => { try { return `Время у клиента ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz })} (${tz})`; } catch { return ''; } };
// Повторный клиент: другие КП с этого браузера или IP
const repeat = (r) => q.same.all(r.id, r.vid || '-', r.ip || '-').map((x) => `№${x.id}`);
// Похож на конкурента: баллы по признакам, 3 и больше — флаг
function rival(r, g, vs) {
  const why = [], n7 = q.same.all(r.id, r.vid || '-', r.ip || '-').filter((x) => r.ts - x.ts < 7 * 864e5).length;
  if (n7 >= 2) why.push(`${n7 + 1} КП за неделю`);
  if (STUDIO.test(`${g.org} ${g.isp}`)) why.push('сеть похожа на студию');
  if (g.net === 'дата-центр или VPN') why.push('VPN или сервер');
  const b = {}; let cp = 0;
  for (const v of vs) { cp += v.cp || 0; for (const [k, x] of Object.entries(parse(v.b))) b[k] = (b[k] || 0) + x; }
  if (cp) why.push(`копировал ${cp} раз`);
  const pr = (b.price || 0) + (b.smeta || 0), rest = Object.entries(b).reduce((s, [k, x]) => s + (k === 'price' || k === 'smeta' ? 0 : x), 0);
  if (pr >= 30 && rest < 5) why.push('смотрит только цены');
  const score = why.reduce((s, w) => s + (/студию|КП за/.test(w) ? 2 : 1), 0);
  return score >= 3 ? why : [];
}
const indOf = (a) => (a.ind === 'other' ? a.indText || 'Другое' : label(INDUSTRIES, a.ind));
async function signalNew(id) {
  const r = q.byId.get(id), a = parse(r.a), c = parse(r.c), g = await geo(r.ip), s = parse(r.src), rp = repeat(r), cases = pick(r.svc === 'site' ? CASES_SITE : CASES_DIRECT, a.ind, 3);
  const det = r.svc === 'site' ? [indOf(a), `${label(SCALE, a.scale)} чел.`, a.type === 'landing' ? '' : `${c.pages} стр.`, c.own ? 'свой код' : 'Tilda'] : [label(REGIONS, a.reg), indOf(a)];
  signal([`🆕 КП №${r.id} · ${r.svc === 'site' ? label(TYPES, a.type) : 'Директ'} · ${rub(r.price)}`, det.filter(Boolean).join(' · '),
    a.url ? `Сайт: ${a.url}` : '', `Устройство: ${device(r.ua)}`, geoText(g), `Откуда: ${srcText(s) || src(r.ref)}`, pathText(s, r.ts) && `Путь: ${pathText(s, r.ts)}`,
    parse(r.e).bot ? 'Создано роботом в чате' : '', rp.length ? `Повторный клиент: ${rp.join(', ')}` : '', rival(r, g, []).length ? `⚠️ Похож на конкурента: ${rival(r, g, []).join(', ')}` : '',
    cases.length ? `Кейсы в КП: ${cases.map((x) => x[0]).join(', ')}` : ''].filter(Boolean).join('\n'), r.id);
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
      res.on('error', no); res.on('close', () => no(new Error('closed'))); // обрыв ответа — не ждать вечно
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
    const dl = setTimeout(() => req.destroy(new Error('timeout')), 2e4); req.on('close', () => clearTimeout(dl)); // предел на весь ответ: защита от медленной отдачи
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
// chat — кнопка «Написать» (тема КП в группе), ok — кнопка «✅ Написал»
const signal = (text, id, o = {}) => enqueue('sig', id, { text, url: `${SITE}/kp/admin#${id}`, ...(o.chat && { chat: { kp: id, sid: q.byId.get(id).sid } }), ...(o.ok && { ok: id }) });
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
// Создание КП: анкета на сайте или робот в чате (мост). o: vid, ip, ua, ref, src, e
function make({ svc, a }, o) {
  const t = randomBytes(24).toString('base64url'), e = o.e || {};
  const id = Number(q.add.run(t, svc, JSON.stringify(a), Date.now(), o.vid, o.ip, o.ua, o.ref, randomUUID(), JSON.stringify(o.src)).lastInsertRowid);
  if (o.e) q.setE.run(JSON.stringify(e), id);
  const site = svc === 'site' && a.url && a.type !== 'landing';
  const ai = svc === 'site' && (a.wish || site || (a.ind === 'other' && a.indText));
  if (!ai) { finish(id); return { t, id }; }
  setTimeout(() => q.byId.get(id)?.st === 0 && finish(id), AI_WAIT).unref?.(); // страховка, если мост молчит
  (async () => {
    if (site) { e.site = await analyze(a.url).catch(() => ({ src: 'none' })); q.setE.run(JSON.stringify(e), id); }
    if (!a.wish && !(a.ind === 'other' && a.indText) && !e.site?.total) return finish(id);
    const own = (a.type === 'shop' && ['g3', 'g4'].includes(a.goods)) || a.feat.some((f) => FEAT[f][1] === 2);
    enqueue('ai', id, { type: label(TYPES, a.type), platform: own ? 'свой код' : 'Tilda', ind: a.ind === 'other' ? a.indText : label(INDUSTRIES, a.ind), needGroup: a.ind === 'other' && !!a.indText, wish: a.wish, feat: a.feat.map((f) => label(FEATURES, f)), site: e.site?.total ? { src: e.site.src, total: e.site.total, text: e.site.text } : null });
  })().catch(console.error);
  return { t, id, wait: site ? 'pages' : 'wish' };
}
async function create(req, res) {
  const ip = ipOf(req);
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const v = validate(b);
  if (!v || !(Number(b.ms) >= 3000)) return json(res, 400, {});
  if (!limit(`kc${ip}`, 10, 36e5) || !limit('kcall', 300, 36e5)) return json(res, 429, {});
  const r = make(v, { vid: str(b.vid, 36), ip, ua: str(req.headers['user-agent'], 300), ref: str(b.ref, 300), src: srcIn(b.src) });
  json(res, 200, { t: r.t, ...(r.wait && { wait: r.wait }) });
}
// Робот в чате создаёт КП по ответам посетителя (мост, tool create_kp). Источник и браузер — из первого сообщения диалога.
const FORM = { type: TYPES, ind: INDUSTRIES, scale: SCALE, goods: GOODS, feat: FEATURES, fill: FILL, brand: BRAND, reg: REGIONS };
async function bridgeCreate(req, res) {
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const sid = str(b.sid, 36), m = hooks.first?.(sid), v = validate(b);
  if (!m) return json(res, 404, {});
  if (!v) return json(res, 200, { error: 'Не хватает ответов или значение не из списка. Проверь поля и уточни у посетителя недостающее.' });
  if (!limit(`kb${sid}`, 3, 864e5) || !limit('kcall', 300, 36e5)) return json(res, 200, { error: 'Лимит: в этом диалоге уже создано 3 КП. Предложи обсудить детали лично.' });
  const r = make(v, { vid: VID.test(m.vid || '') ? m.vid : '', ip: m.ip || '', ua: m.ua || '', ref: 'чат', src: m.s || null, e: { bot: sid } });
  const k = q.byId.get(r.id);
  json(res, 200, { url: `${SITE}/kp/${r.t}`, n: r.id, ...(k.st === 1 ? { price: rub(k.price) + (v.svc === 'direct' ? ' в месяц' : '') } : { note: 'Цена считается, будет на странице КП через минуту.' }) });
}
// Портрет посетителя для первого сообщения в чате (chat.mjs → тема Telegram)
hooks.who = (x, ts) => { const s = srcIn(x); return s ? { s, from: srcText(s), path: pathText(s, ts) } : {}; };

/* ---------- страница КП ---------- */
let TPL;
const tpl = async (root) => (TPL ??= await readFile(`${root}kp/view.html`, 'utf8'));
// Подбор по отрасли: сначала совпавшие, затем общие по порядку
const pick = (list, ind, n) => [...list.filter((x) => x[3].includes(ind)), ...list.filter((x) => !x[3].includes(ind) && !x[3].length), ...list.filter((x) => !x[3].includes(ind) && x[3].length)].slice(0, n);
function proof(r, a) {
  const cs = pick(r.svc === 'site' ? CASES_SITE : CASES_DIRECT, a.ind, 3), [n, role, t] = pick(REVIEWS, a.ind, 1)[0];
  const ext = (u) => (u.startsWith('http') ? ' target="_blank" rel="noopener"' : '');
  return `<div data-b="cases"><h2 class="kp__h2">${r.svc === 'site' ? 'Похожие проекты' : 'Результаты клиентов'}</h2><ul class="kp__ul kp__cases">${cs.map(([h, d, u]) => `<li><span>${u ? `<a href="${u}"${ext(u)}>${h}</a>` : h}</span><span>${d}</span></li>`).join('')}</ul>
<blockquote class="kp__rev"><p>${esc(t)}</p><footer>${esc(n)}, ${esc(role)}</footer></blockquote>
<p class="kp__note">${r.svc === 'site' ? 'Делаем и сайт, и рекламу в Яндекс Директе — за заявки отвечает одна команда.' : 'Двое клиентов работают с нами по 5 лет. Без долгих договоров.'}</p></div>`;
}
// Окупаемость: считает браузер, цифры клиента сохраняются (roi)
const roiBlock = (r, c) => `<div data-b="roi"><h2 class="kp__h2">Окупаемость</h2><p class="kp__sub">Введите свои цифры — посчитаем, когда вернутся вложения.</p>
<form class="kp__roi" data-cost="${r.svc === 'direct' ? r.price + c.budget : ''}" data-svc="${r.svc}"><label>Средний чек, ₽<input name="check" type="number" min="1" inputmode="numeric"></label><label>Заявок в месяц<input name="leads" type="number" min="0" inputmode="numeric"></label><label>Из 10 заявок покупают<input name="conv" type="number" min="1" max="10" value="2" inputmode="numeric"></label></form>
<p class="kp__roi-out" data-roi-out aria-live="polite"></p></div>`;
const doubtBlock = () => `<div data-b="doubt" class="kp__doubt"><h2 class="kp__h3">Что смущает?</h2><p class="kp__note">Ответ поможет сделать предложение точнее.</p>
<div class="kp__chips">${DOUBTS.map((d, i) => `<button class="pill pill--sm" type="button" aria-pressed="false" data-d="${i}">${d}</button>`).join('')}</div>
<textarea class="kpf__in" rows="1" maxlength="500" placeholder="Своими словами (необязательно)" aria-label="Что смущает"></textarea><button class="pill" type="button" data-doubt disabled>отправить</button><p class="kp__note" data-doubt-ok hidden>Спасибо, учтём.</p></div>`;
const subOf = (r, a, c) => (r.svc === 'site'
  ? [indOf(a), `${label(SCALE, a.scale)} человек`, a.type === 'landing' ? '' : `расчёт на ${c.pages} стр.`]
  : [label(REGIONS, a.reg), indOf(a)]).filter(Boolean).join(' · ');
// Строки сметы; у опций — галочка (пока цена действует)
const rowsOf = (c, old) => c.lines.map(([t, v, o, x]) => `<tr${x ? ' class="kp__off"' : ''}><td>${o && !old ? `<label class="kp__o"><input type="checkbox" data-o="${o}"${x ? '' : ' checked'}><span>${esc(t)}</span></label>` : esc(t)}</td><td>${old ? '' : v == null ? 'обсудим лично' : rub(v)}</td></tr>`).join('');
const msgOf = (r, total, old) => `Хочу обсудить КП №${r.id}${old ? '' : ` на ${rub(total)}${r.svc === 'direct' ? ' в месяц' : ''}`}`;
function render(r, now) {
  const a = parse(r.a), c = parse(r.c), old = r.until < now;
  const h1 = r.svc === 'site' ? `${label(TYPES, a.type)} ${c.own ? 'на своём коде' : 'на Tilda'}` : 'Реклама в Яндекс Директе';
  const total = old
    ? `<div class="kp__sum" data-b="price"><button class="pill pill--fill" type="button" data-recalc>пересчитать</button><span>Срок цены истёк ${day(r.until)}</span></div>`
    : `<div class="kp__sum" data-b="price"><span class="kp__price"><span data-total>${rub(r.price)}</span>${r.svc === 'direct' ? '<small> в месяц</small>' : ''}</span><span>Цена действует до ${day(r.until)}</span></div>`;
  const list = (h, items, b) => `<div data-b="${b}"><h2 class="kp__h2">${h}</h2><ul class="kp__ul">${items.join('')}</ul></div>`;
  const msg = msgOf(r, r.price, old);
  return `<p class="kp__meta">Коммерческое предложение №${r.id} · ${day(r.ts)}</p>
<h1 class="kp__h1">${esc(h1)}</h1><p class="kp__sub">${esc(subOf(r, a, c))}</p>${total}
<div data-b="smeta"><h2 class="kp__h2">Смета</h2>${!old && c.lines.some((l) => l[2]) ? '<p class="kp__note kp__hint">Снимите галочку — цена пересчитается.</p>' : ''}<table class="kp__tbl"><tbody>${rowsOf(c, old)}</tbody>${old ? '' : `<tfoot><tr><td>Итого${r.svc === 'direct' ? ' в месяц' : ''}</td><td data-total>${rub(r.price)}</td></tr></tfoot>`}</table></div>
${r.svc === 'direct' ? `<p class="kp__note">Рекламный бюджет Директа оплачивается отдельно: рекомендуем от ${rub(c.budget)} в месяц. Первый месяц — настройка и запуск, стоит столько же, сколько ведение.</p>${list('Что входит', KEEP_DIRECT.map(([t, w]) => `<li><span>${t}</span><span>${w}</span></li>`), 'incl')}`
  : `${c.struct ? list(`Структура сайта`, c.struct.map((s) => `<li>${s}</li>`).concat(c.pages > 20 ? [`<li>и ещё ${c.pages - 20} стр.</li>`] : []), 'struct') : ''}${list('Что входит', KEEP_SITE.map((s) => `<li>${s}</li>`), 'incl')}`}
${proof(r, a)}${old ? '' : roiBlock(r, c)}
<div data-b="contact"><h2 class="kp__h2">Согласовать КП №${r.id}</h2><p class="kp__sub">Откроется чат с готовым сообщением «<span data-msg>${esc(msg)}</span>» — останется отправить.</p>
<div class="kp__btns"><a class="pill pill--fill" href="${TG}?text=${encodeURIComponent(msg)}" data-h="${TG}?text=" target="_blank" rel="noopener" data-agree="tg" data-goal="click_telegram">согласовать в telegram</a><a class="pill pill--fill" href="${MAX}" target="_blank" rel="noopener" data-agree="max" data-goal="click_max">согласовать в max</a></div>
<p class="kp__note" data-copied hidden>Текст скопирован — вставьте его в чат MAX.</p>
<h2 class="kp__h2">Вопросы</h2><div class="kp__btns"><button class="pill" type="button" data-chat>чат на этой странице</button><a class="pill" href="${WA}" target="_blank" rel="noopener" data-goal="click_whatsapp">whatsapp</a><a class="pill" href="${TG}" target="_blank" rel="noopener" data-goal="click_telegram">telegram</a></div>
<h2 class="kp__h2">Переслать</h2><div class="kp__btns"><button class="pill" type="button" data-share="native" hidden>переслать</button><a class="pill" href="https://t.me/share/url" target="_blank" rel="noopener" data-share="tg">переслать в telegram</a><button class="pill" type="button" data-share="copy">скопировать ссылку</button></div></div>
${doubtBlock()}
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
  const page = (await tpl(ctx.ROOT)).replaceAll('https://reconcept.ru/kp/view', `${SITE}/kp/${t}`).replaceAll('Коммерческое предложение — Reconcept', `КП №${r.id} — Reconcept`).replace('__KP__', () => html).replace('__T__', t).replace('data-sid="__SID__"', r.st === 1 ? `data-sid="${r.sid}" data-n="${r.id}"` : '');
  res.writeHead(r.st === 2 ? 410 : 200, { ...ctx.SECURITY, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  res.end(page);
}

/* ---------- отслеживание ---------- */
const VID = /^[0-9a-f-]{36}$/;
const BLN = { price: 'Цена', smeta: 'Смета', struct: 'Структура', incl: 'Что входит', cases: 'Кейсы', roi: 'Окупаемость', contact: 'Согласовать', doubt: 'Что смущает' };
const up = (id, n) => q.up.run(n, id, n);
// Лента действий: в базу и тем, кто смотрит (админка, SSE)
const live = new Map(), pres = new Map(); // id → Set(res); id → состояние клиента
const push = (id, d) => { for (const r of live.get(id) || []) r.write(`data: ${JSON.stringify(d)}\n\n`); };
function log(id, vid, k, v) { const ts = Date.now(); q.act.run(id, vid, ts, k, v); push(id, { a: { vid, ts, k, v } }); }
const state = (id, x) => { const s = Object.assign(pres.get(id) || {}, x, { ts: Date.now() }); pres.set(id, s); push(id, { s: { ...s, o: undefined } }); }; // o — строки сметы, шлются только при смене
async function seen(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36), ip = ipOf(req);
  if (!r || r.st !== 1 || !VID.test(vid) || !limit(`ks${ip}`, 60, 6e5)) return json(res, 200, {});
  if (admin(req)) return json(res, 200, { me: 1 }); // свои просмотры не считаем
  const now = Date.now(), lv = q.lastV.get(r.id, vid);
  if (lv && now - lv.last < 18e5) { q.touch.run(now, lv.id); visit(r.id, lv.id, b); return json(res, 200, {}); }
  if (b.end) return json(res, 200, {});
  const { n, mine } = q.nV.get(vid, r.id), prev = q.prevV.get(r.id), ua = str(req.headers['user-agent'], 300), f = /^[a-z0-9]{6,12}$/.test(b.f) ? b.f : null;
  const vi = Number(q.addV.run(r.id, vid, ip, ua, now, now).lastInsertRowid), tz = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(b.tz) ? str(b.tz, 40) : null;
  if (f) db.prepare('UPDATE v SET f=? WHERE id=?').run(f, vi);
  if (tz) q.vTz.run(tz, vi);
  visit(r.id, vi, b);
  log(r.id, vid, 'open', `визит ${n + 1} · ${device(ua)}${f ? ' · по пересланной ссылке' : ''}`);
  if (!n && vid === r.vid) return json(res, 200, {}); // первый показ после анкеты
  up(r.id, 1);
  json(res, 200, {});
  const a = parse(r.a), sh = f && q.shOf.get(f), g = await geo(ip), rp = repeat(r), rv = rival(r, g, q.visits.all(r.id));
  signal([`👀 КП №${r.id} · ${r.svc === 'site' ? label(TYPES, a.type) : 'Директ'} · ${rub(r.price)} · ${PH[q.byId.get(r.id).ph]}`,
    `Визит ${n + 1}${prev ? ` · прошлый ${ago(now - prev.last)}` : ''}`,
    `Устройство: ${device(ua)}${mine || vid === r.vid ? '' : ' (новое)'}`, geoText(g), tz ? clock(tz) : '',
    prev?.lb && BLN[prev.lb] ? `Прошлый раз вышел на блоке «${BLN[prev.lb]}»` : '',
    rp.length ? `Повторный клиент: ${rp.join(', ')}` : '', rv.length ? `⚠️ Похож на конкурента: ${rv.join(', ')}` : '',
    f ? `Пришёл по пересланной ссылке${sh ? ` (${SHM[sh.m] || sh.m}, ${ago(now - sh.ts)})` : ''}` : '',
    r.until < now ? 'Срок цены истёк' : ''].filter(Boolean).join('\n'), r.id, { chat: 1 });
}
const BLOCKS = Object.keys(BLN);
function visit(kp, id, b) {
  const s = parse(q.vB.get(id)?.b), d = b.b && typeof b.b === 'object' ? b.b : {}, n = (x, m) => Math.min(Math.max(Math.round(+x || 0), 0), m);
  for (const k of BLOCKS) if (n(d[k], 600)) s[k] = (s[k] || 0) + n(d[k], 600);
  q.vUpd.run(JSON.stringify(s), BLOCKS.includes(b.lb) ? b.lb : null, n(b.cp, 20), n(b.pr, 20), n(b.cl, 20), id);
  if ((s.price || 0) + (s.smeta || 0) >= STUDY) up(kp, 2);
}
// Действия и положение на странице: раз в 5 с, пока смотрят в админке — раз в секунду
const ACT = { blk: (v) => `смотрит «${BLN[v] || '?'}»`, copy: (v) => `скопировал${v ? `: «${v}»` : ''}`, print: () => 'печать', contact: (v) => `нажал «${v}»`, chat: () => 'открыл чат', leave: () => 'ушёл со страницы' };
async function act(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36);
  if (!r || r.st !== 1 || !VID.test(vid) || admin(req) || !limit(`ka${ipOf(req)}`, 900, 6e5)) return json(res, 200, {});
  for (const [k, v] of (Array.isArray(b.e) ? b.e : []).filter(Array.isArray).slice(0, 10)) if (ACT[k] && (k !== 'blk' || BLN[v])) log(r.id, vid, k, ACT[k](str(v, 80)));
  const p = b.p || {};
  state(r.id, { on: b.end ? 0 : 1, vid, b: BLN[p.b] ? p.b : null, f: Math.min(Math.max(+p.f || 0, 0), 1), w: Math.min(Math.max(Math.round(+b.w) || 0, 0), 4000), dev: device(String(req.headers['user-agent'] || '')) });
  json(res, 200, { w: live.has(r.id) ? 1 : 0 });
}
// Галочки сметы: пересчёт на сервере
async function opt(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36), now = Date.now();
  if (!r || r.st !== 1 || r.svc !== 'site' || r.until < now || !limit(`ko${ipOf(req)}`, 120, 6e5)) return json(res, 400, {});
  const off = offOf(r, b.off), c = calc(r.svc, parse(r.a), parse(r.e), off), out = { rows: rowsOf(c, false), total: rub(c.total), msg: msgOf(r, c.total, false) };
  if (!admin(req) && VID.test(vid)) {
    const lv = q.lastV.get(r.id, vid); if (lv) q.vOpt.run(JSON.stringify(off), c.total, lv.id);
    if (b.k && b.log) { const l = c.lines.find((x) => x[2] === b.k); if (l) log(r.id, vid, 'opt', `${l[3] ? 'убрал' : 'вернул'} «${l[0]}» → ${rub(c.total)}`); up(r.id, 2); }
    const o = { rows: out.rows, total: out.total }; (pres.get(r.id) || pres.set(r.id, {}).get(r.id)).o = o; push(r.id, { o });
  }
  json(res, 200, out);
}
// «Согласовать»: ссылка в Telegram/MAX открывается сразу, сюда — sendBeacon
const CHN = { tg: 'Telegram', max: 'MAX' };
async function agree(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36), ip = ipOf(req);
  if (!r || r.st !== 1 || !CHN[b.ch] || admin(req) || !limit(`kg${ip}`, 10, 36e5)) return json(res, 200, {});
  const off = offOf(r, b.off), c = calc(r.svc, parse(r.a), parse(r.e), off), old = r.until < Date.now();
  q.agr.run(Date.now(), c.total, JSON.stringify(off), r.id); up(r.id, 3);
  const cut = c.lines.filter((l) => l[3]).map((l) => l[0]);
  log(r.id, vid, 'agree', `нажал «Согласовать» в ${CHN[b.ch]}${old ? ' (срок цены истёк)' : ` на ${rub(c.total)}`}`);
  if (limit(`kga${r.id}`, 1, 6e5)) signal([`🤝 КП №${r.id}: нажал «Согласовать» в ${CHN[b.ch]}`, old ? 'Срок цены истёк' : `Сумма ${rub(c.total)}${c.total !== r.price ? ` (в КП ${rub(r.price)})` : ''}`, cut.length ? `Убрал: ${cut.join(', ')}` : '', 'Напишет вам в личку. Если написал — нажмите «✅ Написал», иначе через 15 мин напомню.'].filter(Boolean).join('\n'), r.id, { chat: 1, ok: 1 });
  json(res, 200, {});
}
setInterval(() => { for (const x of q.remind.all(Date.now() - REMIND)) { q.rem.run(x.id); signal(`⏰ КП №${x.id}: 15 мин назад нажал «Согласовать» на ${rub(x.asum)}, «Написал» не отмечено. Если сообщения нет — напишите в чат КП.`, x.id, { chat: 1, ok: 1 }); } }, 6e4).unref();
// «Переслать»: у каждого нажатия своя ссылка /kp/<токен>?f=<код>
const SHM = { native: 'меню «Поделиться»', tg: 'Telegram', copy: 'скопировал ссылку' };
async function share(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36);
  if (!r || r.st !== 1 || !SHM[b.m] || !/^[a-z0-9]{6,12}$/.test(b.c) || admin(req) || !limit(`kf${ipOf(req)}`, 30, 36e5)) return json(res, 200, {});
  q.sh.run(b.c, r.id, vid, b.m, Date.now());
  log(r.id, vid, 'share', `переслал: ${SHM[b.m]}`);
  json(res, 200, {});
}
// Окупаемость: цифры клиента
async function roi(req, res) {
  if (!sameOrigin(req)) return json(res, 400, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36), n = (x, m) => Math.min(Math.max(Math.round(+x) || 0, 0), m);
  if (!r || r.st !== 1 || admin(req) || !limit(`kr2${ipOf(req)}`, 60, 6e5)) return json(res, 200, {});
  const x = { check: n(b.check, 1e9), leads: n(b.leads, 1e6), conv: n(b.conv, 10) || 2, ts: Date.now() };
  if (!x.check) return json(res, 200, {});
  const old = parse(r.roi);
  q.setRoi.run(JSON.stringify(x), r.id);
  if (old.check !== x.check || old.leads !== x.leads || old.conv !== x.conv) log(r.id, vid, 'roi', `окупаемость: чек ${rub(x.check)}, заявок ${x.leads} в месяц, покупают ${x.conv} из 10`);
  up(r.id, 2); json(res, 200, {});
}
// «Что смущает?»
async function doubt(req, res) {
  if (!sameOrigin(req)) return json(res, 400, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36);
  if (!r || r.st !== 1 || admin(req) || !limit(`kd${ipOf(req)}`, 5, 36e5)) return json(res, 200, {});
  const d = [...new Set(Array.isArray(b.d) ? b.d : [])].filter((i) => DOUBTS[i]).map((i) => DOUBTS[i]), text = str(b.text, 500);
  if (!d.length && !text) return json(res, 200, {});
  const v = [d.join(', '), text && `«${text}»`].filter(Boolean).join(' · ');
  q.setDoubt.run(JSON.stringify({ d, text, ts: Date.now() }), r.id);
  log(r.id, vid, 'doubt', `смущает: ${v}`);
  signal(`🤔 КП №${r.id} · ${rub(r.price)}: смущает — ${v}`, r.id, { chat: 1 });
  json(res, 200, {});
}
// Страницы сайта после КП (site.ts)
async function page(req, res) {
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40)), vid = str(b.vid, 36), p = str(b.p, 150);
  if (r && r.st === 1 && VID.test(vid) && p.startsWith('/') && !admin(req) && limit(`kp${ipOf(req)}`, 60, 6e5)) log(r.id, vid, 'page', `смотрит сайт: ${p}`);
  json(res, 200, {});
}
// Чат КП (виджет на странице КП): sid КП → номер; сообщение посетителя — в ленту и статус
hooks.kp = (sid) => q.bySid.get(sid)?.id;
hooks.sids = () => q.sids.all().map((x) => x.sid);
hooks.msg = (id, text) => { q.cht.run(Date.now(), id); up(id, 2); log(id, null, 'msg', `написал в чат: «${text.slice(0, 120)}»`); };
// События анкеты по дням (Москва): form, start, soft, recalc, step:<вопрос>
const dayMsk = (ts = Date.now()) => new Date(ts + 3 * 36e5).toISOString().slice(0, 10);
const EV = /^(form|start|soft|step:(svc|type|reg|ind|indText|scale|goods|feat|wish|fill|brand|url)|tip[os]?:[a-z]{2,8})$/; // tip — приглашение в чат: показано, tipo — открыто, tips — закрыто
hooks.ev = (k) => q.evAdd.run(dayMsk(), k); // tipm — написали после приглашения (chat.mjs)
async function ev(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const k = str(b.k, 30);
  if (EV.test(k) && !admin(req) && limit(`ke${ipOf(req)}`, 100, 6e5)) q.evAdd.run(dayMsk(), k);
  json(res, 200, {});
}
function stats(days) {
  const from = days ? Date.now() - days * 864e5 : 0, ev = Object.fromEntries(q.evSum.all(days ? dayMsk(from) : '0').map((x) => [x.k, x.n]));
  const by = new Map(q.sKp.all(from).map((k) => [k.id, { ...k, a: parse(k.a), n: 0, ret: 0, cl: 0 }]));
  const att = {}, last = {}; let nv = 0;
  for (const v of q.sV.all(from)) {
    const k = by.get(v.kp); if (!k) continue;
    if (++k.n > 1 || v.vid !== v.cv) k.ret = 1;
    k.cl += v.cl || 0; nv++;
    for (const [b, s] of Object.entries(parse(v.b))) att[b] = (att[b] || 0) + s;
    if (v.lb) last[v.lb] = (last[v.lb] || 0) + 1;
  }
  const ks = [...by.values()];
  const group = (f) => { const m = {}; for (const k of ks) { const x = (m[f(k)] ||= [0, 0, 0, 0]); x[0]++; x[1] += k.ret; x[2] += k.cl > 0; x[3] += k.price || 0; } return Object.entries(m).sort((a, b) => b[1][0] - a[1][0]).map(([g, x]) => [g, x[0], x[1], x[2], Math.round(x[3] / x[0])]); };
  const sum = (p) => (p < 15e4 ? 'до 150 тыс.' : p < 3e5 ? '150–300 тыс.' : p < 6e5 ? '300–600 тыс.' : p < 1e6 ? '600 тыс. – 1 млн' : 'от 1 млн');
  return {
    ev, created: ks.length, ret: ks.filter((k) => k.ret).length, contact: ks.filter((k) => k.cl).length, chat: ks.filter((k) => k.cht).length, agree: ks.filter((k) => k.agr).length, bot: ks.filter((k) => parse(k.e).bot).length, nv,
    att: Object.fromEntries(BLOCKS.map((b) => [b, nv ? Math.round((att[b] || 0) / nv) : 0])), last,
    type: group((k) => (k.svc === 'site' ? label(TYPES, k.a.type) : 'Директ')), ind: group((k) => indOf(k.a)),
    sum: group((k) => (k.svc === 'site' ? sum(k.price) : 'Директ')), ref: group((k) => chan(parse(k.src)) || src(k.ref)), camp: group((k) => parse(k.src)?.utm?.campaign || '—'),
  };
}
async function recalc(req, res) {
  if (!sameOrigin(req)) return json(res, 403, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const r = q.byT.get(str(b.t, 40));
  if (!r || r.st !== 1 || r.until > Date.now() || !limit(`kr${ipOf(req)}`, 5, 36e5)) return json(res, 400, {});
  finish(r.id, true);
  if (!admin(req)) q.evAdd.run(dayMsk(), 'recalc');
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
  if (p === 'stats') return json(res, 200, stats(Number(new URL(req.url, 'http://x').searchParams.get('days')) || 0));
  if (p === 'live') { // «Смотреть»: действия и положение клиента на странице
    const id = Number(new URL(req.url, 'http://x').searchParams.get('id')) || 0;
    if (!q.byId.get(id)) return json(res, 404, {});
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
    res.write(`retry: 5000\n\ndata: ${JSON.stringify({ s: pres.get(id) || {} })}\n\n`);
    const set = live.get(id) || live.set(id, new Set()).get(id), ping = setInterval(() => res.write(': \n\n'), 25e3);
    set.add(res);
    return res.on('close', () => { clearInterval(ping); set.delete(res); if (!set.size) live.delete(id); });
  }
  let b = {};
  if (req.method === 'POST') { try { b = await body(req); } catch { return json(res, 400, {}); } }
  const id = Number(b.id || new URL(req.url, 'http://x').searchParams.get('id')) || 0, r = q.byId.get(id);
  if (!r) return json(res, 404, {});
  if (p === 'revoke') q.st.run(b.on ? 2 : 1, id);
  if (p === 'phase' && PH[b.ph]) q.ph.run(b.ph, id);
  if (p === 'patch' && r.st !== 0) { // ручная правка оценок → пересчёт
    const e = parse(r.e);
    if (b.unique != null) e.pages = { unique: Math.min(Math.max(Math.round(+b.unique) || 1, 1), 100), typical: Math.max(Math.round(+b.typical) || 0, 0), manual: 1 };
    if (b.wishH !== undefined) e.wish = { ...e.wish, h: b.wishH === null ? null : Math.max(Math.round(+b.wishH) || 0, 0), ok: b.wishH !== null, title: str(b.wishTitle, 80) || e.wish?.title, manual: 1 };
    if ([0, 1, 2].includes(b.group)) e.group = { g: b.group, manual: 1 };
    q.setE.run(JSON.stringify(e), id); finish(id);
  }
  const x = q.byId.get(id), vs = q.visits.all(id), ips = [...new Set([x.ip, ...vs.map((v) => v.ip)])].filter(Boolean);
  const G = Object.fromEntries(await Promise.all(ips.slice(0, 10).map(async (i) => [i, geoText(await geo(i))])));
  const srcO = parse(x.src), who = { src: (srcText(srcO) || src(x.ref)) + (parse(x.e).bot ? ' · создано роботом в чате' : ''), path: pathText(srcO, x.ts), geo: G[x.ip] || '', repeat: repeat(x), rival: rival(x, x.ip ? await geo(x.ip) : {}, vs), roi: parse(x.roi), doubt: parse(x.doubt) };
  json(res, 200, { ...x, who, G, a: parse(x.a), e: parse(x.e), c: parse(x.c), visits: vs.map((v) => ({ ...v, dev: device(v.ua) })), fw: q.fwOf.all(id), acts: q.acts.all(id), sh: q.shs.all(id).map((z) => ({ ...z, m: SHM[z.m] })), html: x.st === 1 ? render(x, Date.now()) : '', PH, labels: { svc: label(SERVICES, x.svc) } });
}

/* ---------- роутер ---------- */
const TOKEN = /^\/kp\/([\w-]{32})$/, POST = { act, opt, agree, share, roi, doubt, page };
export function kp(req, res, url, ctx) {
  const m = url.pathname.match(TOKEN);
  if (m && req.method === 'GET') return view(req, res, m[1], ctx);
  const p = url.pathname.slice(8); // после /api/kp/
  if (p === 'create' && req.method === 'POST') return create(req, res);
  if (p === 'status' && req.method === 'GET') { const r = q.byT.get(url.searchParams.get('t') || ''); return json(res, r ? 200 : 404, { st: r?.st }); }
  if (p === 'seen' && req.method === 'POST') return seen(req, res);
  if (p === 'ev' && req.method === 'POST') return ev(req, res);
  if (p === 'recalc' && req.method === 'POST') return recalc(req, res);
  if (req.method === 'POST' && Object.hasOwn(POST, p)) return POST[p](req, res);
  if (p.startsWith('admin/')) return adminApi(req, res, p.slice(6));
  if (p.startsWith('bridge/')) {
    if (!authed(req)) return json(res, 401, {});
    if (p === 'bridge/pull' && req.method === 'GET') return pull(req, res);
    if (p === 'bridge/done' && req.method === 'POST') return bridgeDone(req, res);
    if (p === 'bridge/create' && req.method === 'POST') return bridgeCreate(req, res);
    if (p === 'bridge/form' && req.method === 'GET') return json(res, 200, FORM);
    if (p === 'bridge/ok' && req.method === 'POST') return body(req).then((b) => { q.ok.run(Number(b.id) || 0); json(res, 200, {}); }, () => json(res, 400, {}));
  }
  json(res, 404, {});
}
