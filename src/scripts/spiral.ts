// Портрет одной спиральной линией (техника turtletoy): яркость карты → размах и частота волны.
// <canvas data-sp="ключ"> внутри .bl-ill. Кадрирование «cover» вокруг фокуса. Ховер (карточка или иллюстрация) — волна бежит по линии.
type Cfg = { map: string; ox: number; oy: number; d: number; per: number; v: [number, number, number, number]; f: [number, number] };
const CFG: Record<string, Cfg> = {
  menteora: { map: '/blog/menteora.png', ox: -5, oy: -36, d: 0.22, per: 2, v: [0, 4, 200, 180], f: [118, 95] },
};
const INK = '#4f483e', SPEED = 6, RES = 5000, TMAX = 175;
type Pts = { n: number; sx: Float32Array; sy: Float32Array; t: Float32Array; a: Float32Array; ph: Float32Array; br: Uint8Array };
const cache = new Map<string, Promise<Pts>>();

async function build(c: Cfg): Promise<Pts> {
  const img = new Image(); img.src = c.map; await img.decode();
  const S = img.naturalWidth, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x0 = cv.getContext('2d')!; x0.drawImage(img, 0, 0);
  const raw = x0.getImageData(0, 0, S, S).data;
  const val = (x: number, y: number) => { const yy = (S * (y + 100) / 200) | 0, xx = (S * (x + 100) / 200) | 0; return xx < 0 || yy < 0 || xx >= S || yy >= S ? 1 : raw[(yy * S + xx) * 4] / 255; };
  const CAP = 200000, p: Pts = { n: 0, sx: new Float32Array(CAP), sy: new Float32Array(CAP), t: new Float32Array(CAP), a: new Float32Array(CAP), ph: new Float32Array(CAP), br: new Uint8Array(CAP) };
  let ph = 0, lp = 0, lth = 0, out = true;
  for (let i = 0; ; i++) {
    const t = i / RES, th = t / c.d, s = Math.sin(th), co = Math.cos(th), cx = t * s + c.ox, cy = t * co - c.oy, v = val(cx, -cy);
    const a = (1 - v) * c.d * Math.PI, pr = t * 2 * Math.PI;
    ph += (pr ? (c.per / Math.max(v, 0.18)) * pr : 1) / RES;
    if (Math.abs(cx) > 102 || Math.abs(cy) > 102) out = true;
    else if (out || (a > 0.12 && ph - lp >= 1) || th - lth >= 0.012) {
      const k = p.n++; p.sx[k] = s; p.sy[k] = co; p.t[k] = t; p.a[k] = a; p.ph[k] = ph; p.br[k] = out ? 1 : 0; out = false; lp = ph; lth = th;
    }
    if (t > TMAX || p.n >= CAP) break;
  }
  return p;
}

function mountOne(el: HTMLCanvasElement) {
  if (el.dataset.on) return; el.dataset.on = '1';
  const c = CFG[el.dataset.sp!]; if (!c) return;
  if (!cache.has(el.dataset.sp!)) cache.set(el.dataset.sp!, build(c));
  const ctx = el.getContext('2d')!, host = (el.closest('.bc') ?? el.parentElement)!;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  let P: Pts | null = null, W = 0, H = 0, off = 0, on = false, last = 0, raf = 0;
  const draw = () => {
    if (!P || !W) return;
    const [vx, vy, vw, vh] = c.v, s = Math.max(W / vw, H / vh), sw = W / s, sh = H / s;
    const l = Math.min(Math.max(c.f[0] - sw / 2, vx), vx + vw - sw), tp = Math.min(Math.max(c.f[1] - sh / 2, vy), vy + vh - sh);
    ctx.clearRect(0, 0, W, H); ctx.beginPath();
    for (let i = 0; i < P.n; i++) {
      const r = P.t[i] + P.a[i] * Math.sin(P.ph[i] - off), x = (r * P.sx[i] + c.ox + 100 - l) * s, y = (100 - r * P.sy[i] + c.oy - tp) * s;
      if (P.br[i]) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 0.22 * s; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke();
  };
  const tick = (t: number) => { off += SPEED * Math.min(0.05, (t - last) / 1000); last = t; draw(); raf = on ? requestAnimationFrame(tick) : 0; };
  const go = (v: boolean) => { if (RM.matches) return; on = v; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  host.addEventListener('pointerenter', (e) => { if ((e as PointerEvent).pointerType === 'mouse') go(true); });
  host.addEventListener('pointerleave', () => go(false));
  new ResizeObserver(() => {
    const d = Math.min(1.5, devicePixelRatio || 1); W = el.width = Math.round(el.clientWidth * d); H = el.height = Math.round(el.clientHeight * d); draw();
  }).observe(el);
  cache.get(el.dataset.sp!)!.then((p) => { P = p; draw(); });
}

const scan = (r: ParentNode) => r.querySelectorAll<HTMLCanvasElement>('canvas[data-sp]').forEach(mountOne);
scan(document);
new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n instanceof Element && scan(n)))).observe(document.body, { childList: true, subtree: true });
