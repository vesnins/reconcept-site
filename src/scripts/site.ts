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
  s.src = 'https://mc.yandex.ru/metrika/tag.js';
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
