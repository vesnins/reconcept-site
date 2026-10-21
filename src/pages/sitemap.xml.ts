import { SITE } from '../lib/site';
import { casePages } from '../data/case-pages';
import { servicePages } from '../data/service-pages';
import { POSTS, authorUrl } from '../data/blog';

// Карта сайта. Новую страницу вне кейсов/услуг — добавить в список ниже.
const paths = ['/', '/services', '/contacts', '/services/paid-search',
  ...Object.keys(servicePages).map((s) => `/services/${s}`),
  ...Object.keys(casePages).map((s) => `/portfolio/${s}`), '/blog', authorUrl];
const blog = POSTS.map((p) => `<url><loc>${SITE.url}/blog/${p.slug}</loc><lastmod>${p.upd ?? p.date}</lastmod></url>`);

export const GET = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `<url><loc>${SITE.url}${p === '/' ? '/' : p}</loc></url>`).concat(blog).join('\n')}\n</urlset>\n`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
