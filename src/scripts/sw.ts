// /services/custom-software: запуск анимаций при появлении, калькулятор окупаемости
// data-io="live" — играет, пока виден; "once" — включается один раз; [data-chat] — чат (dev.css)
document.querySelectorAll<HTMLElement>('[data-io],[data-chat]').forEach((el) => {
  const once = el.dataset.io !== 'live';
  new IntersectionObserver(([e], o) => {
    if (once && e.isIntersecting) { el.dataset.on = '1'; o.disconnect(); } else if (!once) el.dataset.on = e.isIntersecting ? '1' : '';
  }, { threshold: .3 }).observe(el);
});

document.querySelectorAll<SVGSVGElement>('.igr').forEach((ig) => new IntersectionObserver(([e]) => { ig.classList.toggle('off', !e.isIntersecting); e.isIntersecting ? ig.unpauseAnimations() : ig.pauseAnimations(); }).observe(ig));

const f = document.querySelector<HTMLFormElement>('#cf');
if (f) {
  const $ = (id: string) => document.getElementById(id)!;
  const rub = (n: number) => `${Math.round(n / 1000) * 1000 > 0 ? (Math.round(n / 1000) * 1000).toLocaleString('ru-RU') : 0} ₽`;
  const mon = (m: number) => { const n = Math.ceil(m); return `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'месяц' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'месяца' : 'месяцев'}`; };
  const ch = $('c-ch'), NS = 'http://www.w3.org/2000/svg';
  const bars = Array.from({ length: 12 }, (_, i) => { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', String(i * 25 + 3)); r.setAttribute('width', '19'); ch.append(r); return r; });
  const line = document.createElementNS(NS, 'line'); line.setAttribute('x1', '0'); line.setAttribute('x2', '300'); ch.append(line);
  const run = () => {
    const v = (n: string) => +(f.elements.namedItem(n) as HTMLInputElement).value;
    f.querySelectorAll<HTMLInputElement>('input').forEach((i) => {
      i.style.setProperty('--p', `${(+i.value - +i.min) / (+i.max - +i.min) * 100}%`);
      const o = i.previousElementSibling!.querySelector('output')!;
      o.textContent = (+i.value).toLocaleString('ru-RU') + (o.dataset.u ?? '');
    });
    const save = v('p') * v('h') * 21 * v('r') * .7, cost = v('c'), pb = cost / save;
    $('c-loss').textContent = rub(save / .7);
    $('c-pb').textContent = pb > 36 ? 'больше 3 лет' : mon(pb);
    const max = Math.max(save * 12, cost) * 1.08;
    bars.forEach((r, i) => { const h = save * (i + 1) / max * 120; r.setAttribute('y', String(120 - h)); r.setAttribute('height', String(h)); r.classList.toggle('x', save * i >= cost); });
    const y = String(120 - cost / max * 120); line.setAttribute('y1', y); line.setAttribute('y2', y);
  };
  f.addEventListener('input', run); f.addEventListener('submit', (e) => e.preventDefault()); run();
}
