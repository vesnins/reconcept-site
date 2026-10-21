// Картинки для соцсетей (og:image) 1200×630: /og/<slug>.png для постов и /og/blog.png для ленты. Генерируются при сборке.
import { readFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { AUTHOR, POSTS, ruDate } from '../../data/blog';

const f = (n: string) => readFileSync(`${process.cwd()}/src/og/${n}`);
const fonts = [
  { name: 'Inter', data: f('inter-600.ttf'), weight: 600 as const },
  { name: 'Mono', data: f('departure-mono.ttf'), weight: 400 as const },
];
// Сдвиг спирали по горизонтали — как object-position в blog.css
const PX: Record<string, number> = { 'menteora-cam': .5, 'halo-oglasi': .5, 'halo-oglasi-in': .5, 'ai-news-rewriter': .46, 'ai-news-rewriter-in': .5, mentor: .5 };
const W = 1200, H = 630, IW = 540, INK = '#4f483e', MUTE = '#8a7d6b';

type P = { ttl: string; ill: string; meta: string };
export const getStaticPaths = () => [
  ...POSTS.map((p) => ({ params: { slug: p.slug }, props: { ttl: p.card ?? p.title, ill: p.cover ?? p.ill, meta: `${p.author ?? 'Reconcept'} · ${ruDate(p.date)}` } })),
  { params: { slug: AUTHOR.slug }, props: { ttl: AUTHOR.name, ill: AUTHOR.ill, meta: 'Автор блога' } },
  { params: { slug: 'blog' }, props: { ttl: 'Блог Reconcept', ill: 'mentor', meta: 'Кодинг' } },
];

const el = (type: string, style: object, children?: unknown, src?: string) => ({ type, props: { style, children, ...(src && { src, width: H, height: H }) } });

export async function GET({ props }: { props: P }) {
  const { ttl, ill, meta } = props;
  const svg = readFileSync(`${process.cwd()}/public/blog/${ill}.svg`).toString('base64');
  const fs = ttl.length <= 24 ? 68 : ttl.length <= 48 ? 56 : 44;
  const node = el('div', { width: W, height: H, display: 'flex', background: '#ece4d9', color: INK }, [
    el('div', { width: IW, height: H, display: 'flex', overflow: 'hidden', background: '#fffbf5', position: 'relative' },
      el('img', { position: 'absolute', left: (IW - H) * (PX[ill] ?? .59), top: 0, width: H, height: H }, undefined, `data:image/svg+xml;base64,${svg}`)),
    el('div', { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 56, fontFamily: 'Mono', fontSize: 22, color: MUTE }, [
      el('div', { display: 'flex' }, 'RECONCEPT / БЛОГ'),
      el('div', { display: 'flex', fontFamily: 'Inter', fontWeight: 600, fontSize: fs, lineHeight: 1.08, letterSpacing: -fs * .02, color: INK }, ttl),
      el('div', { display: 'flex' }, meta),
    ]),
  ]);
  const png = new Resvg(await satori(node as never, { width: W, height: H, fonts })).render().asPng();
  return new Response(new Uint8Array(await sharp(png).png({ palette: true, quality: 90, effort: 10 }).toBuffer()), { headers: { 'Content-Type': 'image/png' } });
}
