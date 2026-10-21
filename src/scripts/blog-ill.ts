// Иллюстрации блога: толщина линий (--k) и спирали в canvas. Общий код ленты/поста (blog.ts) и страницы автора.
// Толщина линий иллюстраций = 0.6px на экране при любом масштабе (--k = px на единицу viewBox 240×180)
const fit = new ResizeObserver((es) => es.forEach((e) => {
  const { width: w, height: h } = e.contentRect, el = e.target as HTMLElement, c = el.querySelector('canvas');
  if (w) el.style.setProperty('--k', String(Math.min(w / 240, h / 180)));
  if (c && Math.abs(c.width - Math.round(w * dpr())) > 2) queue(el.querySelector<HTMLImageElement>('img.sp')!);
}));
export const fitAll = (r: ParentNode) => {
  r.querySelectorAll('.bl-ill').forEach((el) => fit.observe(el));
  r.querySelectorAll('img.sp').forEach((el) => spIO.observe(el));
};

// Спирали (100–260 тыс. отрезков): SVG рисуется в canvas один раз под размер блока, дальше скролл и ховер его не перерисовывают.
// img скрыт (CSS), canvas — копия с той же обрезкой object-fit: cover / object-position. По одной картинке за раз, в простое.
const dpr = () => Math.min(devicePixelRatio || 1, 2);
const todo = new Set<HTMLImageElement>();
let busy = false;
const idle = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 300 }) : setTimeout(f, 16));
function queue(img: HTMLImageElement) { todo.add(img); if (!busy) { busy = true; idle(next); } }
async function next() {
  const img = todo.values().next().value as HTMLImageElement | undefined;
  if (!img) { busy = false; return; }
  todo.delete(img);
  const box = img.parentElement!, { width: w, height: h } = box.getBoundingClientRect(), k = dpr();
  if (w && h && img.isConnected) try {
    await img.decode();
    const c = box.querySelector('canvas') ?? box.appendChild(document.createElement('canvas')), s = Math.max(w, h);
    const [px, py] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d')!.drawImage(img, (w - s) * px * k, (h - s) * py * k, s * k, s * k);
  } catch { img.style.visibility = 'visible'; }
  idle(next);
}
const spIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { spIO.unobserve(e.target); queue(e.target as HTMLImageElement); }
}), { rootMargin: '150% 0px' });
fitAll(document);
