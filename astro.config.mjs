import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://reconcept.ru',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
  vite: { build: { assetsInlineLimit: 0 } }, // без data:-шрифтов (CSP font-src 'self')
});
