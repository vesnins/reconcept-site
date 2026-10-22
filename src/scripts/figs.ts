// Рисунки /services/paid-search: запуск при появлении на экране (покой = финальный кадр) и переключатель РИС 2
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll<SVGSVGElement>('svg.art').forEach((svg) => {
  const fig = svg.closest<HTMLElement>('.fig');
  svg.pauseAnimations?.();
  if (still) { svg.setCurrentTime?.(2.4); return; }
  if (fig?.dataset.anim === 'pre') svg.classList.add('pre');
  new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return svg.pauseAnimations?.();
    svg.unpauseAnimations?.();
    if (svg.classList.contains('pre')) { svg.getBoundingClientRect(); setTimeout(() => svg.classList.remove('pre'), 500); }
    svg.classList.add('run');
  }, { threshold: 0.3 }).observe(fig || svg);
});

const lk = document.querySelector<SVGSVGElement>('svg.leaks');
const seg = [...document.querySelectorAll<HTMLButtonElement>('.seg button')];
if (lk) {
  let auto = 0, user = false;
  const set = (st: string) => { lk.classList.toggle('fixed', st === 'fixed'); seg.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.st === st))); };
  seg.forEach((b) => b.addEventListener('click', () => { user = true; clearInterval(auto); set(b.dataset.st!); }));
  if (!still) new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !user && !auto) auto = window.setInterval(() => set(lk.classList.contains('fixed') ? 'now' : 'fixed'), 4500);
  }, { threshold: 0.4 }).observe(lk);
}
