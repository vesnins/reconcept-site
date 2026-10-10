import { INDEX } from '../lib/site';
export const GET = () => new Response(
  INDEX ? 'User-agent: *\nAllow: /\n\nSitemap: https://reconcept.ru/sitemap-index.xml\n' : 'User-agent: *\nDisallow: /\n',
);
