// Блог: пост в окне поверх ленты с настоящим URL /blog/slug; закрытие возвращает на то же место ленты.
// Автоскролл: подхват инерции брошенного скролла и ровное движение 20 px/с (замер с референса).
const ov = document.getElementById('ov')!;
const sc = document.getElementById('ov-sc')!;
const feedTitle = ov.dataset.title!;
const order = [...document.querySelectorAll<HTMLAnchorElement>('.bl__feed a.bc[data-s]')].map((a) => a.dataset.s!);
const url = (s: string) => `/blog/${s}`;
let ref = location.href;
const track = (t: string) => { window.hit?.(location.href, t, ref); ref = location.href; };
const cur = () => sc.querySelector<HTMLElement>('#post')?.dataset.s;

const cache = new Map<string, Promise<Document>>();
const load = (s: string) => {
  if (!cache.has(s)) cache.set(s, fetch(url(s)).then((r) => { if (!r.ok) throw r.status; return r.text(); })
    .then((t) => new DOMParser().parseFromString(t, 'text/html')).catch((e) => { cache.delete(s); throw e; }));
  return cache.get(s)!;
};

// Толщина линий иллюстраций = 0.6px на экране при любом масштабе (--k = px на единицу viewBox 240×180)
const fit = new ResizeObserver((es) => es.forEach((e) => {
  const { width: w, height: h } = e.contentRect, el = e.target as HTMLElement, c = el.querySelector('canvas');
  if (w) el.style.setProperty('--k', String(Math.min(w / 240, h / 180)));
  if (c && Math.abs(c.width - Math.round(w * dpr())) > 2) queue(el.querySelector<HTMLImageElement>('img.sp')!);
}));
const fitAll = (r: ParentNode) => {
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

const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('play'); io.unobserve(e.target); }
}), { root: sc, threshold: 0.4 });

function mount() {
  fitAll(sc);
  sc.querySelectorAll('.io').forEach((el) => io.observe(el));
  const s = cur(); if (!s) return;
  const i = order.indexOf(s);
  [order[(i + 1) % order.length], order[(i - 1 + order.length) % order.length]].forEach((n) => load(n).catch(() => {}));
}

async function show(s: string, mode: 'push' | 'replace' | 'none') {
  let doc: Document;
  try { doc = await load(s); } catch { location.href = url(s); return; }
  const post = doc.getElementById('post');
  if (!post) { location.href = url(s); return; }
  const swap = () => {
    sc.replaceChildren(document.importNode(post, true));
    ov.hidden = false; sc.scrollTop = 0; document.title = doc.title;
    sc.querySelector<HTMLElement>('.bp__x')?.focus({ preventScroll: true });
    mount();
  };
  const d = document as Document & { startViewTransition?: (f: () => void) => unknown };
  if (ov.hidden && d.startViewTransition) d.startViewTransition(swap); else swap();
  if (mode === 'push') history.pushState({ blog: 1 }, '', url(s));
  if (mode === 'replace') history.replaceState(history.state, '', url(s));
  track(doc.title);
}

function hide() { ov.hidden = true; document.title = feedTitle; sc.replaceChildren(); track(feedTitle); }
function close() {
  if (history.state?.blog) history.back();
  else { history.replaceState(null, '', '/blog'); hide(); }
}
function step(dir: 1 | -1) {
  const i = order.indexOf(cur()!);
  if (i > -1) show(order[(i + dir + order.length) % order.length], 'replace');
}

addEventListener('popstate', () => {
  const m = location.pathname.match(/^\/blog\/([^/]+)$/);
  if (m) show(m[1], 'none'); else hide();
});
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const t = e.target as HTMLElement;
  const a = t.closest<HTMLAnchorElement>('a.bc[data-s]');
  if (a) { e.preventDefault(); show(a.dataset.s!, ov.hidden ? 'push' : 'replace'); return; }
  if (t.closest('.bp__x')) { e.preventDefault(); close(); }
});
document.addEventListener('pointerover', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.bc[data-s]');
  if (a) load(a.dataset.s!).catch(() => {});
});
sc.addEventListener('click', (e) => { if (e.target === sc) close(); });
document.getElementById('ov-prev')!.addEventListener('click', () => step(-1));
document.getElementById('ov-next')!.addEventListener('click', () => step(1));
addEventListener('keydown', (e) => {
  if (ov.hidden) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
});
let tx = 0;
sc.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
sc.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 70 && !(e.target as HTMLElement).closest('.bp__strip')) step(dx < 0 ? 1 : -1);
}, { passive: true });
if (!ov.hidden) mount();

// ---------- автоскролл: только десктоп, не при reduced-motion, не при открытом посте ----------
const rm = matchMedia('(prefers-reduced-motion: reduce)'), fine = matchMedia('(pointer:fine) and (min-width:960px)');
const SPEED = 20, HAND = 60, MAXV = 900; // px/с: ровная скорость, порог подхвата, потолок
let dir = 0, auto = false, v = 0, acc = 0, raf = 0, last = 0, vel = 0, lastY = scrollY, lastT = 0, lastD = 0;
const stop = () => { auto = false; v = acc = 0; cancelAnimationFrame(raf); };
addEventListener('scroll', () => {
  if (auto) return;
  const t = performance.now(), dt = t - lastT;
  vel = dt > 0 && dt < 150 ? vel * 0.5 + (scrollY - lastY) / dt * 500 : 0;
  lastY = scrollY; lastT = t;
}, { passive: true });
function loop(t: number) {
  const dt = Math.min(t - last, 50); last = t;
  if (!auto) {
    const sp = Math.sign(vel) === dir ? Math.abs(vel) : 0, idle = t - lastT > 90;
    if (sp && (sp <= HAND || idle)) { auto = true; v = dir * Math.min(sp, MAXV); }
    else if (idle && t - lastT > 600) return;
  }
  if (auto) {
    if (!ov.hidden) return stop();
    v += (dir * SPEED - v) * Math.min(1, dt / 350);
    acc += v * dt / 1000;
    const s = Math.trunc(acc);
    if (s) { scrollBy({ top: s, behavior: 'instant' }); acc -= s; }
    const end = dir > 0 ? innerHeight + scrollY >= document.documentElement.scrollHeight - 1 : scrollY <= 0;
    if (end) return stop();
  }
  raf = requestAnimationFrame(loop);
}
addEventListener('wheel', (e) => {
  if (rm.matches || !fine.matches || !ov.hidden) return;
  const d = Math.sign(e.deltaY), m = Math.abs(e.deltaY);
  if (auto && d === dir && m <= lastD + 1) { lastD = m; return; } // хвост инерции трекпада
  lastD = m; stop(); dir = d; last = performance.now(); raf = requestAnimationFrame(loop);
}, { passive: true });
['pointerdown', 'keydown', 'touchstart'].forEach((t) => addEventListener(t, stop, { passive: true }));

export {};
