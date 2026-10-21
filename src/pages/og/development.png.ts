// og:image лендинга /services/development (1200×630), генерируется при сборке
import { readFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const f = (n: string) => readFileSync(`${process.cwd()}/src/og/${n}`);
const el = (style: object, children?: unknown) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

export async function GET() {
  const node = el({ width: 1200, height: 630, padding: 24, background: '#2563eb', color: '#fff' },
    el({ flex: 1, flexDirection: 'column', justifyContent: 'space-between', padding: 56, border: '2px dashed rgba(255,255,255,.9)', fontFamily: 'Mono', fontSize: 24 }, [
      el({}, 'RECONCEPT / РАЗРАБОТКА'),
      el({ fontFamily: 'Inter', fontWeight: 600, fontSize: 84, lineHeight: 1, letterSpacing: -1.5, maxWidth: 900 }, 'Разработка Telegram-ботов и автоматизация бизнеса'),
      el({ color: 'rgba(255,255,255,.8)' }, 'БОТЫ · ПРИЛОЖЕНИЯ · САЙТЫ · ИНТЕГРАЦИИ'),
    ]));
  const svg = await satori(node as never, { width: 1200, height: 630, fonts: [
    { name: 'Inter', data: f('inter-600.ttf'), weight: 600 }, { name: 'Mono', data: f('departure-mono.ttf'), weight: 400 }] });
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(await sharp(png).png({ palette: true, quality: 90, effort: 10 }).toBuffer()), { headers: { 'Content-Type': 'image/png' } });
}
