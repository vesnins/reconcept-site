// Страница КП. Просмотр — после 7 с на экране, дальше отметка раз в минуту (seen): секунды по блокам, последний блок, копирования, печать, «связаться».
// act — действия и положение на странице (раз в 5 с; раз в секунду, пока КП открыто в админке). opt — галочки сметы, agree — «Согласовать», share — «Переслать».
const box = document.getElementById('kp')!;
const t = box.dataset.t!;
let vid = '';
try { vid = localStorage.getItem('kpv') || ''; if (!vid) localStorage.setItem('kpv', (vid = crypto.randomUUID())); } catch {}
const body = (b: object) => JSON.stringify({ t, vid, ...b });
const post = (p: string, b: object) => fetch(`/api/kp/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(b), keepalive: true });
const beacon = (p: string, b: object) => navigator.sendBeacon(`/api/kp/${p}`, new Blob([body(b)], { type: 'application/json' }));
const $$ = <T extends HTMLElement>(s: string) => box.querySelectorAll<T>(s);
// Пересланная ссылка: код ?f= запоминаем на сессию, из адреса убираем
const url = new URL(location.href);
let f = url.searchParams.get('f') || '';
try { f ? sessionStorage.setItem(`kpf${t}`, f) : (f = sessionStorage.getItem(`kpf${t}`) || ''); } catch {}
if (url.searchParams.has('f')) { url.searchParams.delete('f'); history.replaceState(history.state, '', url.pathname + url.search); }

let B: Record<string, number> = {}, lb = '', cp = 0, pr = 0, cl = 0, shown = 0, timer = 0, sent = false, viewed = false, w = 0, k = 0;
const vis = new Set<string>(), E: [string, string][] = [];
const ev = (k: string, v = '') => E.push([k, v]);
const data = () => { const d = { b: B, lb, cp, pr, cl, f }; B = {}; cp = pr = cl = 0; return d; };
const flush = () => post('seen', data()).then((r) => r.json()).then((x) => { if (!x.me && !viewed) { viewed = true; window.goal?.('kp_view'); } }).catch(() => {});
// Положение: блок посередине экрана и доля пройденного в нём
function pos() {
  const el = lb && box.querySelector<HTMLElement>(`[data-b="${lb}"]`);
  if (!el) return {};
  const r = el.getBoundingClientRect();
  return { b: lb, f: Math.round(Math.min(Math.max((innerHeight / 2 - r.top) / r.height, 0), 1) * 100) / 100 };
}
const act = (end = 0) => {
  const b = { e: E.splice(0, 10), p: pos(), w: innerWidth, end };
  if (end) return beacon('act', b);
  post('act', b).then((r) => r.json()).then((x) => (w = x.w || 0)).catch(() => {});
};
function tick() {
  shown++;
  for (const k of vis) B[k] = (B[k] || 0) + 1;
  if ((!sent && shown >= 7) || (sent && shown >= 60)) { sent = true; shown = 0; flush(); }
  if (++k >= (w ? 1 : 5)) { k = 0; act(); }
}
const leave = () => { clearInterval(timer); ev('leave'); act(1); if (sent) beacon('seen', { ...data(), end: 1 }); sent = false; shown = 0; };
const run = () => { clearInterval(timer); if (document.hidden) return leave(); act(); timer = window.setInterval(tick, 1000); };

const live = !!vid && !!box.querySelector('.kp__meta');
if (live) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const b = (e.target as HTMLElement).dataset.b!;
    if (e.isIntersecting) { vis.add(b); if (lb !== b) ev('blk', (lb = b)); } else vis.delete(b);
  }), { rootMargin: '-40% 0px -40% 0px' }); // блок в средней полосе экрана
  $$('[data-b]').forEach((el) => io.observe(el));
  document.addEventListener('visibilitychange', run);
  addEventListener('pagehide', leave);
  document.addEventListener('copy', () => { cp++; ev('copy', String(getSelection() || '').trim().slice(0, 80)); });
  addEventListener('beforeprint', () => { pr++; ev('print'); });
  $$('.kp__btns a:not([data-share])').forEach((a) => a.addEventListener('click', () => { cl++; ev('contact', a.textContent!); window.goal?.('kp_contact'); }));
  run();
}

// Смета с галочками: цену считает сервер; выбор помним в этом браузере
const tb = box.querySelector('.kp__tbl tbody');
let off: string[] = [];
try { off = JSON.parse(localStorage.getItem(`kpo${t}`) || '[]'); } catch {}
async function opt(k = '') {
  const r = await post('opt', { off, k, log: k ? 1 : 0 }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!r || !tb) return;
  tb.innerHTML = r.rows;
  $$('[data-total]').forEach((e) => (e.textContent = r.total));
  msg(r.msg);
  try { localStorage.setItem(`kpo${t}`, JSON.stringify(off)); } catch {}
}
box.addEventListener('change', (e) => {
  const i = e.target as HTMLInputElement, k = i.dataset.o;
  if (!k) return;
  off = i.checked ? off.filter((x) => x !== k) : [...off, k];
  window.goal?.('kp_opt');
  opt(k);
});
if (off.length && box.querySelector('[data-o]')) opt();

// «Согласовать»: Telegram — с готовым текстом, MAX — текст в буфер обмена
let text = box.querySelector('[data-msg]')?.textContent || '';
function msg(m: string) {
  text = m;
  $$('[data-msg]').forEach((e) => (e.textContent = m));
  $$<HTMLAnchorElement>('[data-agree="tg"]').forEach((a) => (a.href = a.dataset.h + encodeURIComponent(m)));
}
$$('[data-agree]').forEach((a) => a.addEventListener('click', () => {
  const ch = a.dataset.agree!;
  if (ch === 'max') navigator.clipboard?.writeText(text).then(() => { const n = box.querySelector<HTMLElement>('[data-copied]'); if (n) n.hidden = false; }, () => {});
  beacon('agree', { off, ch });
  window.goal?.('kp_agree');
}));

// Вопрос в чат на странице (виджет), без виджета — Telegram
box.querySelector('[data-chat]')?.addEventListener('click', () => {
  const b = document.querySelector<HTMLElement>('.cw-b');
  ev('chat');
  if (!b) return void window.open('https://t.me/vesnin', '_blank', 'noopener');
  if (b.getAttribute('aria-expanded') !== 'true') b.click();
});

// «Переслать»: телефон — меню «Поделиться», компьютер — Telegram или копирование. У каждого нажатия своя ссылка.
const code = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b & 31]).join('');
const mob = !!navigator.share && matchMedia('(pointer:coarse)').matches;
$$('[data-share]').forEach((el) => {
  const m = el.dataset.share!;
  el.hidden = (m === 'native') !== mob;
  el.addEventListener('click', () => {
    const c = code(), u = `${location.origin}/kp/${t}?f=${c}`, title = document.title.replace(/ — Reconcept$/, '');
    beacon('share', { c, m });
    window.goal?.('kp_share');
    if (m === 'native') navigator.share({ title, url: u }).catch(() => {});
    else if (m === 'tg') (el as HTMLAnchorElement).href = `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(title)}`;
    else navigator.clipboard?.writeText(u).then(() => { el.textContent = 'ссылка скопирована'; setTimeout(() => (el.textContent = 'скопировать ссылку'), 2000); }, () => {});
  });
});

box.querySelector('[data-recalc]')?.addEventListener('click', async (e) => {
  (e.currentTarget as HTMLButtonElement).disabled = true;
  window.goal?.('kp_recalc');
  await post('recalc', {}).catch(() => {});
  location.reload();
});
export {};
