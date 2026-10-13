// Спиральный портрет одной линией → SVG для блога (техника turtletoy). Запуск:
// node scripts/spiral-svg.mjs <фото> <выход.svg> [ox oy] — ox/oy: центр спирали (лицо) в координатах −100…100, y вниз.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
const [src, out, OX = -5, OY = -36] = process.argv.slice(2).map((v, i) => (i < 2 ? v : +v));
const S = 360, D = 0.22, PER = 2, RES = 5000, TMAX = 175;
const L = await sharp(src).resize(S, S).greyscale().clahe({ width: 24, height: 24, maxSlope: 3 }).normalise().raw().toBuffer();
const G = await sharp(src).resize(S, S).greyscale().normalise().raw().toBuffer();
const px = new Float32Array(S * S).map((_, i) => (G[i] > 238 ? 1 : ((G[i] * 0.7 + L[i] * 0.3) / 255) ** 1.5));
const val = (x, y) => { const yy = (S * (y + 100) / 200) | 0, xx = (S * (x + 100) / 200) | 0; return xx < 0 || yy < 0 || xx >= S || yy >= S ? 1 : px[yy * S + xx]; };
let ph = 0, lp = 0, lth = 0, out1 = true, d = '', qx = 0, qy = 0;
for (let i = 0; ; i++) {
  const t = i / RES, th = t / D, s = Math.sin(th), c = Math.cos(th), cx = t * s + OX, cy = t * c + OY, v = val(cx, cy);
  const a = (1 - v) * D * Math.PI, pr = t * 2 * Math.PI;
  ph += (pr ? (PER / Math.max(v, 0.18)) * pr : 1) / RES;
  if (Math.abs(cx) > 102 || Math.abs(cy) > 102) out1 = true;
  else if (out1 || (a > 0.12 && ph - lp >= 1) || th - lth >= 0.012) {
    const r = t + a * Math.sin(ph), x = Math.round((r * s + OX + 100) * 10), y = Math.round((r * c + OY + 100) * 10);
    d += out1 ? `M${x} ${y}` : `l${x - qx} ${y - qy}`; qx = x; qy = y; out1 = false; lp = ph; lth = th;
  }
  if (t > TMAX) break;
}
writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000"><path d="${d}" fill="none" stroke="#4f483e" stroke-width="2.2"/></svg>`);
