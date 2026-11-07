// Cookie-согласие и Яндекс Метрика: счётчик грузится только после «Принять».
declare global {
  interface Window { ym?: (...a: unknown[]) => void; goal: (name: string) => void; hit: (url: string, title: string, referer: string) => void }
}

const KEY = 'ck';
const id = Number(document.body.dataset.ym || 0);
const banner = document.getElementById('cookie') as HTMLElement;
let loaded = false;

function loadMetrika() {
  if (loaded || !id) return;
  loaded = true;
  const w = window as any;
  w.ym = w.ym || function (...a: unknown[]) { (w.ym.a = w.ym.a || []).push(a); };
  w.ym.l = Date.now();
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + id;
  document.head.appendChild(s);
  w.ym(id, 'init', { ssr: true, webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true });
}

window.goal = (name: string) => { if (loaded && window.ym) window.ym(id, 'reachGoal', name); };
// Просмотр страницы без перезагрузки (блог: пост открывается через history.pushState)
window.hit = (url, title, referer) => { if (loaded && window.ym) window.ym(id, 'hit', url, { title, referer }); };

// Метрика включается только после «ок»; до этого плашка показывается на каждой странице.
let ok = false;
try { ok = localStorage.getItem(KEY) === 'yes'; } catch {}
if (ok) loadMetrika();
else banner.hidden = false;
document.getElementById('ck-yes')!.addEventListener('click', () => {
  banner.hidden = true;
  try { localStorage.setItem(KEY, 'yes'); } catch {}
  loadMetrika();
});

// Цели на кнопки и ссылки с data-goal
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-goal]') as HTMLElement | null;
  if (!el) return;
  window.goal(el.dataset.goal!);
  if (/^click_(telegram|max|whatsapp|email)$/.test(el.dataset.goal!)) window.goal('contact'); // общая цель
});

export {};

// Для КП: источник (первая страница сессии; последний непрямой — в localStorage), путь по сайту (30 страниц), страницы после КП
try {
  const u = new URLSearchParams(location.search), now = Date.now(), ls = localStorage;
  if (!sessionStorage.getItem('src')) {
    let ref = ''; try { ref = document.referrer && new URL(document.referrer).host !== location.host ? new URL(document.referrer).host.replace(/^www\./, '') : ''; } catch {}
    const utm = Object.fromEntries(['source', 'medium', 'campaign', 'content', 'term'].map((k) => [k, u.get(`utm_${k}`) || '']).filter((x) => x[1]));
    const s = JSON.stringify({ lp: location.pathname, ref, utm, y: u.has('yclid') ? 1 : 0, ts: now });
    sessionStorage.setItem('src', s);
    if (ref || u.has('yclid') || Object.keys(utm).length) ls.setItem('src', s);
  }
  const path: [string, number][] = JSON.parse(ls.getItem('path') || '[]').filter((x: [string, number]) => now - x[1] < 30 * 864e5).slice(-29);
  path.push([location.pathname, now]); ls.setItem('path', JSON.stringify(path));
  const k = JSON.parse(ls.getItem('kpt') || 'null');
  if (k && now - k.ts < 30 * 864e5 && !location.pathname.startsWith('/kp/')) navigator.sendBeacon('/api/kp/page', new Blob([JSON.stringify({ t: k.t, vid: ls.getItem('kpv'), p: location.pathname })], { type: 'application/json' }));
} catch {}

// Онлайн-чат: грузится отдельным файлом. До PUBLIC_CHAT=1 — только для проверки: открыть сайт с ?chat=1 (выключить: ?chat=0)
try {
  const c = new URLSearchParams(location.search).get('chat');
  if (c) c === '1' ? localStorage.setItem('chat-test', '1') : localStorage.removeItem('chat-test');
  if (import.meta.env.PUBLIC_CHAT === '1' || localStorage.getItem('chat-test') === '1') import('./chat');
} catch {}

// Kinescope: плеер грузится только у видимых видео
const vids = document.querySelectorAll<HTMLIFrameElement>('iframe[data-src]');
if (vids.length) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const f = e.target as HTMLIFrameElement;
    f.src = f.dataset.src!; f.removeAttribute('data-src'); io.unobserve(f);
  }), { rootMargin: '200px 0px' });
  vids.forEach((f) => io.observe(f));
}
