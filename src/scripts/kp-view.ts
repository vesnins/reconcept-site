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
const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } })();
const data = () => { const d = { b: B, lb, cp, pr, cl, f, tz }; B = {}; cp = pr = cl = 0; return d; };
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
  try { localStorage.setItem('kpt', JSON.stringify({ t, ts: Date.now() })); } catch {} // site.ts: страницы сайта после КП
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

// Окупаемость: считаем здесь, цифры клиента — на сервер через 1,5 с после ввода
const roi = box.querySelector<HTMLFormElement>('.kp__roi'), out = box.querySelector<HTMLElement>('[data-roi-out]');
const num = (s: string) => +s.replace(/\D/g, '');
const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');
let rt = 0;
function calc(save = true) {
  if (!roi || !out) return;
  const d = Object.fromEntries([...new FormData(roi)].map(([k, v]) => [k, +v])) as Record<string, number>, conv = Math.min(Math.max(d.conv || 2, 1), 10) / 10;
  if (!(d.check > 0)) return void (out.textContent = '');
  const direct = roi.dataset.svc === 'direct', cost = direct ? +roi.dataset.cost! : num(box.querySelector('[data-total]')?.textContent || '');
  const deals = Math.ceil(cost / d.check), sales = d.leads * conv, months = sales ? cost / (sales * d.check) : 0;
  out.textContent = direct
    ? `Реклама с бюджетом окупается при ${deals} ${deals % 10 === 1 && deals % 100 !== 11 ? 'продаже' : 'продажах'} в месяц.${sales ? ` При ваших цифрах — ${fmt(sales)} в месяц, выручка ${fmt(sales * d.check)} ₽.` : ''}`
    : `Вложения вернутся с выручки ${deals} ${deals % 10 === 1 && deals % 100 !== 11 ? 'продажи' : 'продаж'}.${months ? ` При ваших цифрах — примерно за ${months < 1 ? 'месяц' : `${Math.ceil(months * 2) / 2} мес.`}` : ''}`;
  try { localStorage.setItem(`kpr${t}`, JSON.stringify(d)); } catch {}
  if (!save) return;
  clearTimeout(rt); rt = window.setTimeout(() => { post('roi', d); window.goal?.('kp_roi'); }, 1500);
}
if (roi) {
  try { const d = JSON.parse(localStorage.getItem(`kpr${t}`) || '{}'); for (const k in d) if (roi.elements.namedItem(k)) (roi.elements.namedItem(k) as HTMLInputElement).value = d[k]; } catch {}
  roi.addEventListener('input', () => calc());
  roi.addEventListener('submit', (e) => e.preventDefault());
  new MutationObserver(() => calc(false)).observe(box.querySelector('[data-total]') || box, { childList: true, characterData: true, subtree: true }); // сумма по галочкам
  calc(false);
}

// «Что смущает?»: выбор вариантов и текст, одна отправка
const dq = box.querySelector<HTMLElement>('.kp__doubt');
if (dq) {
  const send = dq.querySelector<HTMLButtonElement>('[data-doubt]')!, ta = dq.querySelector('textarea')!;
  const sel = () => [...dq.querySelectorAll<HTMLElement>('[aria-pressed="true"]')].map((b) => +b.dataset.d!);
  const upd = () => (send.disabled = !sel().length && !ta.value.trim());
  dq.querySelectorAll<HTMLElement>('[data-d]').forEach((b) => b.addEventListener('click', () => { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); upd(); }));
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; upd(); });
  send.addEventListener('click', () => {
    post('doubt', { d: sel(), text: ta.value }).catch(() => {});
    window.goal?.('kp_doubt');
    dq.querySelectorAll('button, textarea').forEach((x) => ((x as HTMLButtonElement).disabled = true));
    dq.querySelector<HTMLElement>('[data-doubt-ok]')!.hidden = false;
  });
}

box.querySelector('[data-recalc]')?.addEventListener('click', async (e) => {
  (e.currentTarget as HTMLButtonElement).disabled = true;
  window.goal?.('kp_recalc');
  await post('recalc', {}).catch(() => {});
  location.reload();
});
export {};
