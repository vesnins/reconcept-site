// Упрощение спиральных SVG (B6): убирает лишние точки линии (алгоритм Рамера — Дугласа — Пекера), вид не меняется.
// Иллюстрации-спирали: оригиналы — art/blog-svg-orig/, на сайте — упрощённые копии (scripts/svg-simplify.mjs). Откат: cp art/blog-svg-orig/*.svg public/blog/
// node scripts/svg-simplify.mjs <вход.svg> <выход.svg> [допуск=1] — допуск в единицах viewBox 2000 (1 ≈ 0,5 px на самой крупной картинке).
import { readFileSync, writeFileSync } from 'node:fs';
const [src, out, E = '1'] = process.argv.slice(2), eps2 = (+E) ** 2;
const svg = readFileSync(src, 'utf8'), d = svg.match(/ d="([^"]+)"/)[1];
const subs = [];
let cur, x = 0, y = 0;
for (const [, c, a, b] of d.matchAll(/([Ml])(-?\d+) (-?\d+)/g)) {
  if (c === 'M') { x = +a; y = +b; subs.push(cur = [[x, y]]); } else { x += +a; y += +b; cur.push([x, y]); }
}
const seg2 = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
};
const rdp = (p) => {
  const keep = new Uint8Array(p.length), st = [[0, p.length - 1]];
  keep[0] = keep[p.length - 1] = 1;
  while (st.length) {
    const [i, j] = st.pop(); let m = 0, k = -1;
    for (let n = i + 1; n < j; n++) { const v = seg2(p[n], p[i], p[j]); if (v > m) { m = v; k = n; } }
    if (m > eps2) { keep[k] = 1; st.push([i, k], [k, j]); }
  }
  return p.filter((_, n) => keep[n]);
};
let o = '';
for (const s of subs) {
  const p = rdp(s); o += `M${p[0][0]} ${p[0][1]}l`; // после «l» пары идут без буквы: «-» или пробел — разделитель
  for (let n = 1; n < p.length; n++) for (const v of [p[n][0] - p[n - 1][0], p[n][1] - p[n - 1][1]]) o += (v < 0 || o.endsWith('l') ? '' : ' ') + v;
}
writeFileSync(out, svg.replace(d, o));
