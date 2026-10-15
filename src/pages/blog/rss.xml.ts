// RSS ленты блога: Яндекс, Дзен, агрегаторы и читалки узнают о новых постах.
import { SITE } from '../../lib/site';
import { BLOG, POSTS } from '../../data/blog';

const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const item = (p: (typeof POSTS)[number]) => `<item><title>${x(p.title)}</title><link>${SITE.url}/blog/${p.slug}</link><guid>${SITE.url}/blog/${p.slug}</guid><pubDate>${new Date(`${p.date}T10:00:00+03:00`).toUTCString()}</pubDate>${p.seo ? `<description>${x(p.seo.d)}</description>` : ''}<enclosure url="${SITE.url}/og/${p.slug}.png" type="image/png" length="0"/></item>`;

export const GET = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${x(BLOG.title)}</title><link>${SITE.url}/blog</link><description>${x(BLOG.description)}</description><language>ru</language>${POSTS.map(item).join('')}</channel></rss>\n`,
  { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
);
