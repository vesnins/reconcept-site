// Онлайн-чат: сообщения уходят в Telegram Сергея (мост на Hetzner), ответы приходят сюда по SSE. Сервер: chat.mjs.
import '../styles/chat.css';

type M = { i: number; d: number; t: string }; // d: 0 посетитель, 1 Сергей, 2 ИИ, 3 автоответ от имени Сергея
const API = '/api/chat/';
const p = location.pathname;
const KP = document.getElementById('kp')?.dataset.sid || ''; // страница КП: общий чат этого КП
// Подсказки: [текст, вид]. Вид: 1 — робот попросит описать задачу, 2 — робот отвечает по сути, строка — ссылка
type Chip = [string, 1 | 2 | 3 | string];
const soft = /^\/services\/(development|custom-software)/.test(p); // программы и боты: КП не считается
const KPL: Chip = ['Получить КП за 2 минуты', '/kp/new'], CALC: Chip[] = [['Посчитать в чате', 3], ['Заполнить анкету', '/kp/new']];
const CHIPS: Chip[] = KP ? [['Вопрос по смете', 1], ['Когда можно начать?', 1]]
  : p.startsWith('/services/paid-search') ? [['Сколько стоит реклама в Яндексе?', 1], ['Нужен анализ рекламы в Яндексе', 1], KPL]
  : p.startsWith('/services/development') ? [['Сколько стоит бот?', 1], ['Перенести телеграм-бота в MAX', 1]]
  : p.startsWith('/services/custom-software') ? [['У меня идея, хочу знать цену', 1], ['Обсудить автоматизацию', 1]]
  : p === '/kp/new' ? [['Помогите выбрать ответ', 2], ['Посчитать в чате', 3]]
  : [['Обсудить создание сайта', 1], ['Реклама в Яндексе', 1], ['Разработать бота', 1], ['Обсудить автоматизацию', 1], KPL];
const HI = 'Здравствуйте! Я Сергей, обычно отвечаю в течение минуты-двух. Чем могу помочь?';
const NOTE = KP ? 'Ответ придёт сюда. Можно закрыть страницу — переписка сохранится на странице КП.' : 'Ответ придёт сюда. Можно закрыть страницу — переписка сохранится в этом окне на 30 дней.';
const svg = (d: string, n = 24) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${d}"/></svg>`;
// Робот-секретарь: линии как в иллюстрациях блога, точечная сетка
const BOT = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width=".6" aria-hidden="true"><defs><pattern id="cw-g" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="currentColor" stroke="none" opacity=".25"/></pattern></defs>'
  + '<circle cx="20" cy="20" r="19.7" fill="url(#cw-g)"/><path d="M20 8.5V12M9.5 17v5M30.5 17v5M9.5 19.5H11M29 19.5h1.5M16.5 22.5h7M18.8 21.5v2M21.2 21.5v2M17 26v2h6v-2M6.6 34c1.5-4 6-6 13.4-6s11.9 2 13.4 6"/>'
  + '<circle cx="20" cy="7" r="1.5"/><rect x="11" y="12" width="18" height="14" stroke-width="1"/><circle cx="16" cy="17.5" r="2" stroke-width="1"/><circle cx="24" cy="17.5" r="2" stroke-width="1"/></svg>';
const NAME = ['Сергей', 'Сергей', 'Робот-секретарь'];
const BUBBLE = 'M4 5h16v11H9l-5 4z', X = 'M6 6l12 12M18 6 6 18';

// Состояние: sid, последняя активность, последний прочитанный ответ. Через 30 дней тишины — заново.
let s: { sid?: string; at?: number; seen?: number } = {};
const KEY = KP ? `chat-kp:${KP}` : 'chat';
try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
if (!KP && (!s.at || Date.now() - s.at > 30 * 864e5)) s = {};
if (KP) s.sid = KP;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
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
root.innerHTML = `<div class="cw-tip" role="status" hidden><img class="cw-ta" src="/chat/sergey.webp" width="40" height="40" alt=""><div class="cw-tb"><button type="button" class="cw-tt"><b>Сергей</b><span></span></button><div class="cw-tc"></div></div><button type="button" class="cw-x" aria-label="Закрыть">${svg(X, 16)}</button></div>`
  + `<section class="cw-box" role="dialog" aria-label="Чат с Сергеем" hidden><header class="cw-h"><span class="cw-av"><img src="/chat/sergey.webp" width="40" height="40" alt="">${BOT}</span><b>Сергей</b><button type="button" class="cw-x" aria-label="Закрыть чат">${svg(X)}</button></header>`
  + `<div class="cw-l" aria-live="polite"></div><form class="cw-f"><textarea rows="1" maxlength="1000" placeholder="Напишите сообщение" aria-label="Сообщение"></textarea><button type="submit" aria-label="Отправить">${svg('M5 12h14M13 6l6 6-6 6', 20)}</button></form></section>`
  + `<button type="button" class="cw-b" aria-label="Открыть чат" aria-expanded="false">${svg(BUBBLE)}${svg(X)}<i hidden></i></button>`;
document.body.append(root);
const $ = <T extends HTMLElement>(c: string) => root.querySelector(c) as T;
const tip = $('.cw-tip'), box = $('.cw-box'), list = $('.cw-l'), form = $<HTMLFormElement>('.cw-f'), ta = $<HTMLTextAreaElement>('textarea'), btn = $('.cw-b'), badge = $('.cw-b i');
const t0 = Date.now();

const msgs = new Map<number, HTMLElement>();
let pend: HTMLElement[] = [];
const LINK = /(https:\/\/reconcept\.ru\/[\w\-./?=&%#]*[\w\-/])/; // в ответах кликабельны только ссылки на этот сайт
function add(t: string, d: number, i?: number) {
  const el = document.createElement('p');
  el.className = d === 9 ? 'cw-n' : `cw-m cw-m${d}`;
  if (d === 1 || d === 2) t.split(LINK).forEach((x, j) => { if (j % 2) { const a = document.createElement('a'); a.href = x; a.target = '_blank'; a.rel = 'noopener'; a.textContent = x.replace('https://', ''); if (x.includes('/kp/')) a.onclick = () => window.goal?.('chat_kp'); el.append(a); } else el.append(x); });
  else el.textContent = t;
  if (i) msgs.set(i, el);
  list.insertBefore(el, ty); list.scrollTop = list.scrollHeight;
  return el;
}
// Кто отвечает (1 Сергей, 2 Робот-секретарь): аватар и имя в шапке, «…пишет»
const ty = document.createElement('p');
ty.className = 'cw-ty'; ty.hidden = true; ty.setAttribute('aria-hidden', 'true');
let tyT = 0;
function who(d: number) { root.classList.toggle('cw--ai', d === 2); $('.cw-h b').textContent = NAME[d]; }
function typing(d: number, ms: number) {
  clearTimeout(tyT); ty.hidden = !ms;
  if (!ms) return;
  who(d); ty.innerHTML = `${NAME[d]} пишет<i>.</i><i>.</i><i>.</i>`;
  list.scrollTop = list.scrollHeight;
  tyT = window.setTimeout(() => (ty.hidden = true), ms);
}
list.append(ty);
const hi = add(HI, 1);
let chips: HTMLElement | null = document.createElement('div');
chips.className = 'cw-c';
list.insertBefore(chips, ty);
// Приветствие и подсказки: обычные или от приглашения, по которому открыли чат
function greet(t: string, cs: Chip[]) {
  if (!chips) return;
  hi.textContent = t;
  chips.replaceChildren(...cs.map(([c, k]) => {
    const b = document.createElement(typeof k === 'string' ? 'a' : 'button');
    b.textContent = c;
    if (b instanceof HTMLAnchorElement) { b.href = k as string; b.onclick = () => window.goal?.('chat_kp'); } else { b.type = 'button'; b.onclick = () => post(c, k as number); }
    return b;
  }));
}
greet(HI, CHIPS);
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
  es.addEventListener('typing', onType);
  es.onmessage = (e) => {
    const m: M = JSON.parse(e.data);
    if (m.d === 3) m.d = 1;
    last = Math.max(last, m.i);
    if (msgs.has(m.i)) return;
    if (m.d === 0) {
      noChips();
      const el = pend.find((x) => x.textContent === m.t);
      if (el) { pend = pend.filter((x) => x !== el); el.classList.remove('cw-wait'); msgs.set(m.i, el); return; }
    }
    if (m.d) { who(m.d); typing(m.d, 0); }
    add(m.t, m.d, m.i);
    if (m.d && m.i > (s.seen || 0)) reading() ? seenAll() : badgeSet(unread + 1);
    if (m.d) show();
  };
}
function onType(e: MessageEvent) { const { d, ms } = JSON.parse(e.data); typing(d, ms); }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { es?.close(); es = null; } else { connect(); if (reading()) seenAll(); }
});

async function post(t: string, chip = 0) {
  t = t.trim(); if (!t) return;
  const first = !s.at;
  s.sid ||= crypto.randomUUID(); s.at = Date.now(); save();
  noChips();
  const el = add(t, 0); el.classList.add('cw-wait'); pend.push(el);
  try {
    const r = await fetch(API + 'send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: s.sid, text: t, page: p, ref: ss('chat-ref') || '', chip, t: Date.now() - t0, ...(first && ctx()) }) });
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

// Портрет для первого сообщения: приглашение, источник визита, путь по сайту, ID браузера (как у КП)
function ctx() {
  try {
    const ls = localStorage; let vid = ls.getItem('kpv'); if (!vid) ls.setItem('kpv', (vid = crypto.randomUUID()));
    return { tip: via, vid, src: { ...JSON.parse(sessionStorage.getItem('src') || ls.getItem('src') || '{}'), path: JSON.parse(ls.getItem('path') || '[]').slice(-10) } };
  } catch { return { tip: via }; }
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
root.querySelectorAll<HTMLElement>('.cw-x').forEach((b) => (b.onclick = () => (b.closest('.cw-tip') ? ((tip.hidden = true), ss('chat-tip', '1'), ev(`tips:${cur?.[0]}`)) : toggle(false))));
// Клик по приглашению: чат с приветствием этого приглашения; кнопка-ответ — сразу отправляет его (ссылка — переход)
const open2 = (c?: Chip) => {
  if (cur) { via = cur[0]; greet(cur[3], cur[4]); ev(`tipo:${via}`); window.goal?.('chat_tip_open'); }
  if (c && typeof c[1] === 'string') { window.goal?.('chat_kp'); location.href = c[1]; return; }
  toggle(true); if (c) post(c[0], c[1] as number);
};
$('.cw-tt').onclick = () => open2();
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) toggle(false); });
form.onsubmit = (e) => { e.preventDefault(); const t = ta.value; ta.value = ''; grow(); post(t); };
const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; };
ta.oninput = grow;
ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !mobile.matches) { e.preventDefault(); form.requestSubmit(); } };

// Появление: после cookie-плашки; через 3 с или после 30 % прокрутки (если диалог уже был — сразу).
const ck = document.getElementById('cookie');
let ready = !!s.sid, shown = false;
function show() {
  if (shown || !ready || (ck && !ck.hidden)) return;
  shown = true; root.classList.add('cw--in');
}

// Приглашения у кнопки чата: [код, условие, текст у кнопки, приветствие в чате, подсказки]. Срабатывает первое подходящее.
// Не больше двух за визит, с паузой в минуту; закрыл крестиком или открыл чат — больше не показываем; есть диалог — не показываем.
type Rule = [string, () => boolean, string, string, Chip[]];
const ev = (k: string) => { fetch('/api/kp/ev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k }), keepalive: true }).catch(() => {}); };
let sec = 0, act = Date.now(), leaving = false, cur: Rule | null = null, via = '', kpt = '', direct = false, back = false, cases = 0;
try {
  const ls = localStorage, now = Date.now(), k = JSON.parse(ls.getItem('kpt') || 'null'), src = JSON.parse(sessionStorage.getItem('src') || '{}');
  const path: [string, number][] = JSON.parse(ls.getItem('path') || '[]');
  if (k && now - k.ts < 30 * 864e5 && /^[\w-]{32}$/.test(k.t)) kpt = k.t;
  direct = !!src.y || (/yandex/i.test(src.utm?.source || '') && /cpc|ppc|paid/i.test(src.utm?.medium || ''));
  back = path.some((x) => now - x[1] > 36e5); // был на сайте больше часа назад
  cases = new Set(path.filter((x) => now - x[1] < 18e5 && x[0].startsWith('/portfolio/')).map((x) => x[0])).size;
} catch {}
const HI_CALC = soft ? 'Здравствуйте! Опишите задачу в двух словах — оценю сроки и цену.' : 'Здравствуйте! Посчитаю точную цену под ваш проект: несколько вопросов — и откроется личная ссылка со сметой. Контакты не нужны.';
const C_CALC = soft ? CHIPS : CALC;
const RULES: Rule[] = p.startsWith('/kp/') ? [
  ['form', () => (Date.now() - act) / 1e3 >= 40, 'Не знаете, что выбрать? Подскажу', 'Здравствуйте! Подскажу по любому вопросу анкеты. На чём остановились?', CHIPS],
] : [
  ['kp', () => !!kpt && sec >= 5, 'Остались вопросы по вашему КП? Отвечу здесь', 'Здравствуйте! Вы смотрели наше коммерческое предложение. Что уточнить?', [['Открыть моё КП', `/kp/${kpt}`], ['Вопрос по цене', 1], ['Обсудить задачу', 1]]],
  ['direct', () => direct && sec >= 15, soft ? 'Опишите задачу — оценю сроки и цену' : 'Посчитать цену под вашу нишу? 2 минуты, без контактов', HI_CALC, C_CALC],
  ['cases', () => cases >= 3 && p.startsWith('/portfolio/') && sec >= 8, 'Нужно что-то похожее? Посчитаю цену', HI_CALC, CALC],
  ['price', () => p.startsWith('/services') && sec >= 25, soft ? 'Опишите задачу — оценю сроки и цену' : 'Посчитать точную цену под ваш проект?', HI_CALC, C_CALC],
  ['back', () => back && sec >= 10, 'С возвращением! Посчитать ваш проект?', HI_CALC, CALC],
  ['exit', () => leaving && sec >= 20, 'Цена вашего проекта — за 2 минуты, без контактов', HI_CALC, CALC],
  ['idle', () => sec >= 30, 'Есть вопрос? Отвечу здесь', HI, CHIPS],
];
function invite() {
  const done = (ss('chat-tips') || '').split(',').filter(Boolean);
  if (!shown || KP || s.sid || ss('chat-tip') || !box.hidden || !tip.hidden || done.length >= 2 || sec - last2 < 60) return;
  const r = RULES.find((x) => !done.includes(x[0]) && x[1]());
  if (!r) return;
  cur = r; last2 = sec;
  // Сначала «печатает», через 1,2 с — текст и кнопки-ответы (не больше двух)
  const t = $('.cw-tt span'), cs = $('.cw-tc'), rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  t.innerHTML = '<i class="cw-dots"><i>.</i><i>.</i><i>.</i></i>'; cs.replaceChildren(); tip.hidden = false; tip.classList.remove('cw-tip--in');
  setTimeout(() => {
    t.textContent = r[2]; tip.classList.add('cw-tip--in');
    cs.replaceChildren(...(r[4] === CHIPS ? [] : r[4]).slice(0, 2).map((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = i ? '' : 'cw-t1'; b.textContent = c[0]; b.onclick = () => open2(c); return b; }));
  }, rm ? 0 : 1200);
  ss('chat-tips', [...done, r[0]].join(',')); ev(`tip:${r[0]}`); window.goal?.('chat_tip');
}
let last2 = -60;
if (!KP && !s.sid && !ss('chat-tip')) {
  setInterval(() => { if (!document.hidden) { sec++; invite(); } }, 1e3);
  for (const e of ['pointerdown', 'keydown', 'input']) addEventListener(e, () => (act = Date.now()), { passive: true, capture: true });
  if (matchMedia('(hover:hover)').matches) document.documentElement.addEventListener('mouseleave', (e) => { if (e.clientY <= 0) { leaving = true; invite(); } });
}
const go = () => { ready = true; show(); removeEventListener('scroll', onScroll); };
const onScroll = () => { if (scrollY > (document.documentElement.scrollHeight - innerHeight) * 0.3) go(); };
if (ready) show(); else { setTimeout(go, 3e3); addEventListener('scroll', onScroll, { passive: true }); }
if (ck) new MutationObserver(show).observe(ck, { attributes: true, attributeFilter: ['hidden'] });
connect();
