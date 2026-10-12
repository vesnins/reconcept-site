// Анимации рисунков, переключатель РИС 2, FAQ-барабан, липкая кнопка.
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll(s)] as T[];

/* Рисунки: покой = финальный кадр; .pre ставится только до появления на экране */
$$<SVGSVGElement>('svg.art').forEach((svg) => {
  const fig = svg.closest('.fig') as HTMLElement | null;
  const usePre = fig?.dataset.anim === 'pre';
  svg.pauseAnimations?.();
  if (still) { svg.setCurrentTime?.(2.4); return; }
  if (usePre) svg.classList.add('pre');
  new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        svg.unpauseAnimations?.();
        if (svg.classList.contains('pre')) { void svg.getBoundingClientRect(); setTimeout(() => svg.classList.remove('pre'), 500); }
        svg.classList.add('run');
      } else svg.pauseAnimations?.();
    }
  }, { threshold: 0.3 }).observe(fig || svg);
});

/* РИС 2 — «Сейчас / После настройки» */
const lk = $<SVGSVGElement>('svg.leaks');
const seg = $$<HTMLButtonElement>('.seg button');
let auto: number | undefined; let userSet = false;
const setSt = (st: string) => { lk.classList.toggle('fixed', st === 'fixed'); seg.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.st === st))); };
seg.forEach((b) => b.addEventListener('click', () => { userSet = true; clearInterval(auto); setSt(b.dataset.st!); }));
if (!still) new IntersectionObserver((e) => {
  if (e[0].isIntersecting && !userSet && !auto) auto = window.setInterval(() => setSt(lk.classList.contains('fixed') ? 'now' : 'fixed'), 4500);
}, { threshold: 0.4 }).observe(lk);

/* FAQ — барабан */
const items = $$<HTMLLIElement>('#drum li');
const pq = $('#pq'), pa = $('#pa'), panel = $('#panel'), drum = $('#drum');
let cur = 0, tmr: number | undefined;
const layout = () => {
  const r = innerWidth <= 900 ? 50 : 56, L = items.length;
  items.forEach((li, i) => {
    let off = ((i - cur) % L + L) % L; if (off > L / 2) off -= L;
    const a = Math.abs(off);
    li.style.transform = `translateY(${off * r}px) rotateX(${-off * 9}deg)`;
    li.style.filter = a ? `blur(${Math.min(a * 1.6, 5)}px)` : 'none';
    li.style.opacity = String(a > 3 ? 0 : 1 - a * 0.2);
    li.classList.toggle('on', !a); li.setAttribute('aria-selected', String(!a)); li.id = 'q' + i;
  });
  drum.setAttribute('aria-activedescendant', 'q' + cur);
};
const show = (i: number, anim: boolean) => {
  cur = (i + items.length) % items.length; layout();
  const q = items[cur].querySelector('.q')!.textContent || '', a = items[cur].querySelector('.a')!.innerHTML;
  clearTimeout(tmr);
  pq.textContent = q;
  if (!anim || still) { pa.innerHTML = a; return; }
  panel.classList.add('load');
  tmr = window.setTimeout(() => { pa.innerHTML = a; panel.classList.remove('load'); }, 420);
};
items.forEach((li, i) => li.addEventListener('click', () => show(i, true)));
$('#up').addEventListener('click', () => show(cur - 1, true));
$('#dn').addEventListener('click', () => show(cur + 1, true));
drum.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') { e.preventDefault(); show(cur - 1, true); }
  if (e.key === 'ArrowDown') { e.preventDefault(); show(cur + 1, true); }
});
let ty: number | null = null;
drum.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
drum.addEventListener('touchend', (e) => { if (ty === null) return; const d = e.changedTouches[0].clientY - ty; if (Math.abs(d) > 30) show(cur + (d < 0 ? 1 : -1), true); ty = null; });
addEventListener('resize', layout);
show(0, false);

/* Липкая кнопка: видна, когда блоки с кнопками связи вне экрана */
const stick = $('#stick'), vis = new Map<Element, boolean>();
const io2 = new IntersectionObserver((e) => {
  e.forEach((en) => vis.set(en.target, en.isIntersecting));
  stick.classList.toggle('show', ![...vis.values()].some(Boolean) && scrollY > 200);
});
['#f-hero', '#cta', '#f-magnet'].forEach((s) => io2.observe($(s)));

export {};
