import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://reconcept.ru',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [sitemap({ filter: (p) => !p.endsWith('/404') })],
});
