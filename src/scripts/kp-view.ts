// Страница КП: просмотр засчитывается после 7 с на экране, дальше отметка раз в минуту, пока вкладка видна.
const box = document.getElementById('kp')!;
const t = box.dataset.t!;
let vid = '';
try { vid = localStorage.getItem('kpv') || ''; if (!vid) localStorage.setItem('kpv', (vid = crypto.randomUUID())); } catch {}
const post = (p: string, b: object) => fetch(`/api/kp/${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t, ...b }), keepalive: true });
let shown = 0, timer = 0, sent = false;
function tick() {
  shown += 1;
  if ((!sent && shown >= 7) || (sent && shown >= 60)) { sent = true; shown = 0; post('seen', { vid }).catch(() => {}); }
}
const run = () => { clearInterval(timer); if (!document.hidden) timer = window.setInterval(tick, 1000); else if (sent) shown = 0, sent = false; };
if (vid && box.querySelector('.kp__meta')) { document.addEventListener('visibilitychange', run); run(); }
box.querySelector('[data-recalc]')?.addEventListener('click', async (e) => {
  (e.currentTarget as HTMLButtonElement).disabled = true;
  await post('recalc', {}).catch(() => {});
  location.reload();
});
export {};
