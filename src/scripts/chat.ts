// Онлайн-чат: сообщения уходят в Telegram Сергея (мост на Hetzner), ответы приходят сюда по SSE. Сервер: chat.mjs.
import '../styles/chat.css';

type M = { i: number; d: number; t: string }; // d: 0 посетитель, 1 Сергей, 2 ИИ
const API = '/api/chat/';
const p = location.pathname;
const CHIPS = p.startsWith('/services/paid-search') ? ['Сколько стоит реклама в Яндексе?', 'Нужен анализ рекламы в Яндексе']
  : p.startsWith('/services/development') ? ['Сколько стоит бот?', 'Перенести телеграм-бота в MAX']
  : p.startsWith('/services/custom-software') ? ['У меня идея, хочу знать цену', 'Обсудить автоматизацию']
  : ['Обсудить создание сайта', 'Реклама в Яндексе', 'Разработать бота', 'Обсудить автоматизацию'];
const HI = 'Здравствуйте! Я Сергей, обычно отвечаю в течение минуты-двух. Чем могу помочь?';
const NOTE = 'Ответ придёт сюда. Можно закрыть страницу — переписка сохранится в этом окне на 30 дней.';
const svg = (d: string, n = 24) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${d}"/></svg>`;
const BUBBLE = 'M4 5h16v11H9l-5 4z', X = 'M6 6l12 12M18 6 6 18';

// Состояние: sid, последняя активность, последний прочитанный ответ. Через 30 дней тишины — заново.
let s: { sid?: string; at?: number; seen?: number } = {};
try { s = JSON.parse(localStorage.getItem('chat') || '{}'); } catch {}
if (!s.at || Date.now() - s.at > 30 * 864e5) s = {};
const save = () => { try { localStorage.setItem('chat', JSON.stringify(s)); } catch {} };
const ss = (k: string, v?: string) => { try { return v === undefined ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch { return null; } };

// Источник визита запоминаем на первой странице сессии
if (ss('chat-ref') === null) {
  const u = new URLSearchParams(location.search);
  let r = ''; try { r = document.referrer && new URL(document.referrer).host !== location.host ? new URL(document.referrer).host : ''; } catch {}
  ss('chat-ref', [u.get('utm_source'), u.get('utm_campaign'), r].filter(Boolean).join(' · '));
}

document.querySelector('.lch')?.remove(); // старая кнопка-Telegram на лендингах
const root = document.createElement('div');
root.className = 'cw' + (getComputedStyle(document.documentElement).getPropertyValue('--b').trim() ? ' cw--dev' : '');
root.innerHTML = `<div class="cw-tip" hidden><button type="button" class="cw-tt">Есть вопрос? Отвечу здесь</button><button type="button" class="cw-x" aria-label="Закрыть">${svg(X, 20)}</button></div>`
  + `<section class="cw-box" role="dialog" aria-label="Чат с Сергеем" hidden><header class="cw-h"><img src="/chat/sergey.webp" width="40" height="40" alt=""><b>Сергей</b><button type="button" class="cw-x" aria-label="Закрыть чат">${svg(X)}</button></header>`
  + `<div class="cw-l" aria-live="polite"></div><form class="cw-f"><textarea rows="1" maxlength="1000" placeholder="Напишите сообщение" aria-label="Сообщение"></textarea><button type="submit" aria-label="Отправить">${svg('M5 12h14M13 6l6 6-6 6', 20)}</button></form></section>`
  + `<button type="button" class="cw-b" aria-label="Открыть чат" aria-expanded="false">${svg(BUBBLE)}${svg(X)}<i hidden></i></button>`;
document.body.append(root);
const $ = <T extends HTMLElement>(c: string) => root.querySelector(c) as T;
const tip = $('.cw-tip'), box = $('.cw-box'), list = $('.cw-l'), form = $<HTMLFormElement>('.cw-f'), ta = $<HTMLTextAreaElement>('textarea'), btn = $('.cw-b'), badge = $('.cw-b i');
const t0 = Date.now();

const msgs = new Map<number, HTMLElement>();
let pend: HTMLElement[] = [];
function add(t: string, d: number, i?: number) {
  const el = document.createElement('p');
  el.className = d === 9 ? 'cw-n' : `cw-m cw-m${d}`;
  el.textContent = t;
  if (i) msgs.set(i, el);
  list.append(el); list.scrollTop = list.scrollHeight;
  return el;
}
add(HI, 1);
let chips: HTMLElement | null = document.createElement('div');
chips.className = 'cw-c';
CHIPS.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.onclick = () => post(c); chips!.append(b); });
list.append(chips);
const noChips = () => { chips?.remove(); chips = null; };

// Непрочитанные: счётчик на кнопке и мигание заголовка вкладки
let unread = 0, blink = 0, title = '';
function badgeSet(n: number) {
  unread = n; badge.hidden = !n; badge.textContent = String(n);
  if (n && !blink) { title = document.title; let on = false; blink = window.setInterval(() => { document.title = (on = !on) ? `(${unread}) Новый ответ` : title; }, 1000); }
  if (!n && blink) { clearInterval(blink); blink = 0; document.title = title; }
}
const reading = () => !box.hidden && !document.hidden;
function seenAll() { const m = Math.max(0, ...[...msgs].filter(([, e]) => !e.classList.contains('cw-m0')).map(([i]) => i)); if (m > (s.seen || 0)) { s.seen = m; save(); } badgeSet(0); }

// Поток сообщений (SSE): открыт, пока вкладка видна и диалог существует
let es: EventSource | null = null, last = 0;
function connect() {
  if (es || !s.sid || document.hidden) return;
  es = new EventSource(`${API}stream?sid=${s.sid}&after=${last}`);
  es.onmessage = (e) => {
    const m: M = JSON.parse(e.data);
    last = Math.max(last, m.i);
    if (msgs.has(m.i)) return;
    if (m.d === 0) {
      noChips();
      const el = pend.find((x) => x.textContent === m.t);
      if (el) { pend = pend.filter((x) => x !== el); el.classList.remove('cw-wait'); msgs.set(m.i, el); return; }
    }
    add(m.t, m.d, m.i);
    if (m.d && m.i > (s.seen || 0)) reading() ? seenAll() : badgeSet(unread + 1);
    if (m.d) show();
  };
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { es?.close(); es = null; } else { connect(); if (reading()) seenAll(); }
});

async function post(t: string) {
  t = t.trim(); if (!t) return;
  const first = !s.sid;
  s.sid ||= crypto.randomUUID(); s.at = Date.now(); save();
  noChips();
  const el = add(t, 0); el.classList.add('cw-wait'); pend.push(el);
  try {
    const r = await fetch(API + 'send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: s.sid, text: t, page: p, ref: ss('chat-ref') || '', t: Date.now() - t0 }) });
    if (!r.ok) throw 0;
    const { id } = await r.json();
    if (pend.includes(el)) { pend = pend.filter((x) => x !== el); el.classList.remove('cw-wait'); msgs.set(id, el); }
    if (first) { add(NOTE, 9); window.goal?.('chat'); window.goal?.('contact'); }
    connect();
  } catch {
    el.remove(); pend = pend.filter((x) => x !== el);
    add('Не отправилось. Попробуйте ещё раз.', 9);
    if (!ta.value) ta.value = t;
  }
}

const mobile = matchMedia('(max-width:600px)');
function toggle(v = box.hidden) {
  box.hidden = !v; root.classList.toggle('cw--open', v);
  btn.setAttribute('aria-expanded', String(v)); btn.setAttribute('aria-label', v ? 'Закрыть чат' : 'Открыть чат');
  document.documentElement.classList.toggle('cw-lock', v && mobile.matches);
  if (!v) return;
  tip.hidden = true; ss('chat-tip', '1'); seenAll(); fit();
  list.scrollTop = list.scrollHeight;
  if (matchMedia('(hover:hover)').matches) ta.focus();
  window.goal?.('chat_open');
}
// Мобильные: окно по видимой области (клавиатура iOS/Android)
const vv = window.visualViewport;
function fit() { if (vv && mobile.matches && !box.hidden) root.style.cssText = `--vh:${vv.height}px;--vt:${vv.offsetTop}px`; }
vv?.addEventListener('resize', fit); vv?.addEventListener('scroll', fit);

btn.onclick = () => toggle();
root.querySelectorAll<HTMLElement>('.cw-x').forEach((b) => (b.onclick = () => (b.closest('.cw-tip') ? ((tip.hidden = true), ss('chat-tip', '1')) : toggle(false))));
$('.cw-tt').onclick = () => toggle(true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) toggle(false); });
form.onsubmit = (e) => { e.preventDefault(); const t = ta.value; ta.value = ''; grow(); post(t); };
const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; };
ta.oninput = grow;
ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !mobile.matches) { e.preventDefault(); form.requestSubmit(); } };

// Появление: после cookie-плашки; через 3 с или после 30 % прокрутки (если диалог уже был — сразу). Подсказка — через 30 с, раз за сессию.
const ck = document.getElementById('cookie');
let ready = !!s.sid, shown = false;
function show() {
  if (shown || !ready || (ck && !ck.hidden)) return;
  shown = true; root.classList.add('cw--in');
  if (!s.sid && !ss('chat-tip')) setTimeout(() => { if (box.hidden && !s.sid) tip.hidden = false; }, 3e4);
}
const go = () => { ready = true; show(); removeEventListener('scroll', onScroll); };
const onScroll = () => { if (scrollY > (document.documentElement.scrollHeight - innerHeight) * 0.3) go(); };
if (ready) show(); else { setTimeout(go, 3e3); addEventListener('scroll', onScroll, { passive: true }); }
if (ck) new MutationObserver(show).observe(ck, { attributes: true, attributeFilter: ['hidden'] });
connect();
