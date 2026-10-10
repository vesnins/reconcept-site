// Cookie-согласие и Яндекс Метрика: счётчик грузится только после «Принять».
declare global {
  interface Window { ym?: (...a: unknown[]) => void; goal: (name: string) => void }
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

let choice: string | null = null;
try { choice = localStorage.getItem(KEY); } catch {}
if (choice === 'yes') loadMetrika();
else if (!choice) banner.hidden = false;

const pick = (v: 'yes' | 'no') => {
  banner.hidden = true;
  try { localStorage.setItem(KEY, v); } catch {}
  if (v === 'yes') loadMetrika();
  else if (loaded) location.reload(); // отзыв согласия — выгружаем счётчик
};
document.getElementById('ck-yes')!.addEventListener('click', () => pick('yes'));
document.getElementById('ck-no')!.addEventListener('click', () => pick('no'));
document.getElementById('ck-open')?.addEventListener('click', () => { banner.hidden = false; });

// Цели на кнопки и ссылки с data-goal
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-goal]') as HTMLElement | null;
  if (!el) return;
  window.goal(el.dataset.goal!);
  if (/^click_(telegram|max|whatsapp|email)$/.test(el.dataset.goal!)) window.goal('contact'); // общая цель
});

export {};
