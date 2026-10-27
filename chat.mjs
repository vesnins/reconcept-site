// Онлайн-чат: API виджета (SSE) и моста Telegram на Hetzner (long-poll). SQLite в /data, хранение 30 дней.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { createHash, timingSafeEqual } from 'node:crypto';

const DIR = process.env.DATA_DIR || '/data';
const SECRET = process.env.CHAT_SECRET || '';
const KEEP = 30 * 864e5;
mkdirSync(DIR, { recursive: true });
const db = new DatabaseSync(`${DIR}/chat.db`);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
CREATE TABLE IF NOT EXISTS m(id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, d INTEGER NOT NULL, t TEXT NOT NULL, ts INTEGER NOT NULL, meta TEXT);
CREATE INDEX IF NOT EXISTS m_sid ON m(sid, id);`);
const q = {
  add: db.prepare('INSERT INTO m(sid,d,t,ts,meta) VALUES(?,?,?,?,?)'),
  bySid: db.prepare('SELECT id i, d, t FROM m WHERE sid=? AND id>? ORDER BY id LIMIT 300'),
  has: db.prepare('SELECT 1 FROM m WHERE sid=? LIMIT 1'),
  pull: db.prepare('SELECT id, sid, t, meta FROM m WHERE d=0 AND id>? ORDER BY id LIMIT 50'),
  gc: db.prepare('DELETE FROM m WHERE ts<?'),
};
setInterval(() => q.gc.run(Date.now() - KEEP), 36e5).unref();

// Лимиты: ключ → [счётчик, сброс]
const hits = new Map();
const limit = (k, n, ms) => {
  const now = Date.now(); let h = hits.get(k);
  if (!h || h[1] < now) hits.set(k, h = [0, now + ms]);
  return ++h[0] <= n;
};
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (h[1] < now) hits.delete(k); for (const [k, t] of typers) if (t[1] < now) typers.delete(k); }, 6e5).unref();

const SID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const ipOf = (req) => String(req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress || '';
const hash = (s) => createHash('sha256').update(s).digest();
const authed = (req) => !!SECRET && timingSafeEqual(hash(String(req.headers.authorization || '')), hash(`Bearer ${SECRET}`));
const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const body = (req) => new Promise((ok, no) => {
  let s = ''; req.setEncoding('utf8');
  req.on('data', (c) => { s += c; if (s.length > 8192) { no(new Error('big')); req.destroy(); } });
  req.on('end', () => { try { ok(JSON.parse(s)); } catch (e) { no(e); } });
  req.on('error', no);
});

// Подписчики SSE (виджеты) и ожидающие запросы моста
const subs = new Map(); // sid → Set(res)
const conns = new Map(); // ip → число SSE
let total = 0;
const waiters = new Set();
const ev = (m) => `id: ${m.i}\ndata: ${JSON.stringify(m)}\n\n`;
// «…пишет»: в памяти, не в истории. sid → [d, до]
const typers = new Map();
const tev = (d, ms) => `event: typing\ndata: ${JSON.stringify({ d, ms })}\n\n`;
function typeSet(sid, d, ms) {
  ms ? typers.set(sid, [d, Date.now() + ms]) : typers.delete(sid);
  for (const r of subs.get(sid) || []) r.write(tev(d, ms));
}

function insert(sid, d, t, meta) {
  const i = Number(q.add.run(sid, d, t, Date.now(), meta ? JSON.stringify(meta) : null).lastInsertRowid);
  if (d && typers.has(sid)) typeSet(sid, typers.get(sid)[0], 0);
  for (const r of subs.get(sid) || []) r.write(ev({ i, d, t }));
  if (d === 0) for (const w of waiters) w();
  return i;
}

function stream(req, res, url) {
  const sid = url.searchParams.get('sid') || '';
  const ip = ipOf(req);
  if (!SID.test(sid)) return json(res, 400, {});
  if ((conns.get(ip) || 0) >= 6 || total >= 1000) return json(res, 429, {});
  const after = Number(req.headers['last-event-id'] || url.searchParams.get('after') || 0) || 0;
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
  res.write('retry: 5000\n\n');
  for (const m of q.bySid.all(sid, after)) res.write(ev(m));
  const ty = typers.get(sid);
  if (ty && ty[1] > Date.now()) res.write(tev(ty[0], ty[1] - Date.now()));
  if (!subs.has(sid)) subs.set(sid, new Set());
  subs.get(sid).add(res); conns.set(ip, (conns.get(ip) || 0) + 1); total++;
  const ping = setInterval(() => res.write(': \n\n'), 25e3);
  const life = setTimeout(() => res.end(), 6e5); // переподключение раз в 10 мин
  res.on('close', () => {
    clearInterval(ping); clearTimeout(life); total--;
    const set = subs.get(sid); set?.delete(res); if (set && !set.size) subs.delete(sid);
    const n = (conns.get(ip) || 1) - 1; n ? conns.set(ip, n) : conns.delete(ip);
  });
}

async function send(req, res) {
  const ip = ipOf(req);
  const origin = String(req.headers.origin || '');
  try { if (new URL(origin).host !== req.headers.host) throw 0; } catch { return json(res, 403, {}); }
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, {});
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const sid = str(b.sid, 36), text = str(b.text, 1000);
  if (!SID.test(sid) || !text || !(Number(b.t) >= 1000)) return json(res, 400, {});
  const fresh = !q.has.get(sid);
  if (!limit(`i${ip}`, 20, 6e5) || !limit(`s${sid}`, 30, 6e5) || !limit('all', 300, 6e5) || (fresh && !limit(`n${ip}`, 5, 36e5))) return json(res, 429, {});
  const meta = { page: str(b.page, 200) };
  if (fresh) Object.assign(meta, { ref: str(b.ref, 200), ua: str(req.headers['user-agent'], 200) });
  json(res, 200, { id: insert(sid, 0, text, meta) });
}

function pull(req, res, url) {
  const after = Number(url.searchParams.get('after')) || 0;
  let timer;
  const done = () => {
    const rows = q.pull.all(after);
    if (!rows.length) return false;
    waiters.delete(done); clearTimeout(timer); json(res, 200, rows); return true;
  };
  if (done()) return;
  timer = setTimeout(() => { waiters.delete(done); json(res, 200, []); }, 25e3);
  waiters.add(done);
  res.on('close', () => { waiters.delete(done); clearTimeout(timer); });
}

async function push(req, res) {
  let b; try { b = await body(req); } catch { return json(res, 400, {}); }
  const sid = str(b.sid, 36), text = str(b.text, 4000), d = b.d === 2 ? 2 : 1;
  if (!SID.test(sid) || !text || !q.has.get(sid)) return json(res, 404, {});
  json(res, 200, { id: insert(sid, d, text) });
}

export function chat(req, res, url) {
  const p = url.pathname.slice(10); // после /api/chat/
  if (!SECRET) return json(res, 503, {});
  if (p === 'send' && req.method === 'POST') return send(req, res);
  if (p === 'stream' && req.method === 'GET') return stream(req, res, url);
  if (p.startsWith('bridge/')) {
    if (!authed(req)) return json(res, 401, {});
    if (p === 'bridge/pull' && req.method === 'GET') return pull(req, res, url);
    if (p === 'bridge/push' && req.method === 'POST') return push(req, res);
    if (p === 'bridge/typing' && req.method === 'POST') return body(req).then((b) => {
      const sid = str(b.sid, 36), ms = Math.min(Math.max(Number(b.ms) || 0, 0), 3e5);
      if (!SID.test(sid)) return json(res, 400, {});
      typeSet(sid, b.d === 2 ? 2 : 1, ms); json(res, 200, {});
    }, () => json(res, 400, {}));
    if (p === 'bridge/history' && req.method === 'GET') return json(res, 200, q.bySid.all(url.searchParams.get('sid') || '', 0));
  }
  json(res, 404, {});
}
