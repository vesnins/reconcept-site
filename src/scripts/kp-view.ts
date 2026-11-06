// Страница КП: просмотр засчитывается после 7 с на экране, дальше отметка раз в минуту, пока вкладка видна.
// С отметкой уходят секунды по блокам [data-b], последний блок, копирования, печать, нажатия «связаться».
const box = document.getElementById('kp')!;
const t = box.dataset.t!;
let vid = '';
try { vid = localStorage.getItem('kpv') || ''; if (!vid) localStorage.setItem('kpv', (vid = crypto.randomUUID())); } catch {}
const post = (p: string, b: object) => fetch(`/api/kp/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t, ...b }), keepalive: true });
let B: Record<string, number> = {}, lb = '', cp = 0, pr = 0, cl = 0, shown = 0, timer = 0, sent = false, viewed = false;
const vis = new Set<string>();
const data = (end = 0) => { const d = { vid, b: B, lb, cp, pr, cl, end }; B = {}; cp = pr = cl = 0; return d; };
function flush() {
  post('seen', data()).then((r) => r.json()).then((x) => { if (!x.me && !viewed) { viewed = true; window.goal?.('kp_view'); } }).catch(() => {});
}
function tick() {
  shown++;
  for (const k of vis) B[k] = (B[k] || 0) + 1;
  if ((!sent && shown >= 7) || (sent && shown >= 60)) { sent = true; shown = 0; flush(); }
}
const beacon = () => { if (sent) navigator.sendBeacon('/api/kp/seen', new Blob([JSON.stringify({ t, ...data(1) })], { type: 'application/json' })); sent = false; shown = 0; };
function run() {
  clearInterval(timer);
  if (!document.hidden) { timer = window.setInterval(tick, 1000); return; }
  beacon();
}
if (vid && box.querySelector('.kp__meta')) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const k = (e.target as HTMLElement).dataset.b!;
    if (e.isIntersecting) { vis.add(k); lb = k; } else vis.delete(k);
  }), { rootMargin: '-40% 0px -40% 0px' }); // блок в средней полосе экрана
  box.querySelectorAll<HTMLElement>('[data-b]').forEach((el) => io.observe(el));
  document.addEventListener('visibilitychange', run);
  addEventListener('pagehide', () => { clearInterval(timer); beacon(); });
  document.addEventListener('copy', () => cp++);
  addEventListener('beforeprint', () => pr++);
  box.querySelectorAll('.kp__btns a').forEach((a) => a.addEventListener('click', () => { cl++; window.goal?.('kp_contact'); }));
  run();
}
box.querySelector('[data-recalc]')?.addEventListener('click', async (e) => {
  (e.currentTarget as HTMLButtonElement).disabled = true;
  window.goal?.('kp_recalc');
  await post('recalc', {}).catch(() => {});
  location.reload();
});
export {};
