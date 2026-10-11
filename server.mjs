// Production-сервер: статика с готовым сжатием br/gzip и заголовками безопасности.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('./dist/', import.meta.url));
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.avif': 'image/avif',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
};

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://yastatic.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://mc.yandex.ru https://mc.yandex.com",
  "font-src 'self'",
  "connect-src 'self' https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.ru",
  "frame-src https://mc.yandex.ru https://mc.yandex.com https://kinescope.io https://*.kinescope.io",
  "frame-ancestors 'self' https://metrika.yandex.ru https://metrica.yandex.com https://*.webvisor.com https://webvisor.com",
  "base-uri 'self'", "form-action 'self'", "object-src 'none'", 'upgrade-insecure-requests',
].join('; ');

const SECURITY = {
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

// 301 со старых адресов Tilda (K11)
const REDIRECTS = new Map([
  ['/services/naming', '/services/brand-identity-design'],
  ['/services/website-management', '/services'], ['/services2', '/services'],
  ...['/portfolio', '/azalia-illustrator', '/video', '/alias'].map((p) => [p, '/']),
  ...['elastur', 'sport-innovaciya', 'etiming', 'enli', 'prinnnt', 'shomburg', 'qruto', 'agava', 'artur-valiahmetov'].map((s) => [`/portfolio/${s}`, '/']),
]);
const redirectTo = (p) => REDIRECTS.get(p) ?? (p.startsWith('/tpost/') ? '/' : null);

async function file(p) {
  try { const s = await stat(p); return s.isFile() ? s : null; } catch { return null; }
}

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return false; }
  if (path.includes('\0')) return false;
  const rel = normalize(path).replace(/^(\.\.[/\\])+/, '');
  const cands = rel.endsWith('/') ? [join(rel, 'index.html')] : [rel, rel + '.html'];
  for (const c of cands) {
    const abs = join(ROOT, c);
    if (!abs.startsWith(ROOT)) return false;
    const st = await file(abs);
    if (!st) continue;
    const ext = extname(abs);
    const type = TYPES[ext] || 'application/octet-stream';
    const immutable = c.startsWith('/_astro/') || c.startsWith('/fonts/');
    const headers = {
      ...SECURITY, 'Content-Type': type, Vary: 'Accept-Encoding',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400',
    };
    const ae = String(req.headers['accept-encoding'] || '');
    let send = abs, size = st.size;
    for (const [enc, suf] of [['br', '.br'], ['gzip', '.gz']]) {
      if (!ae.includes(enc)) continue;
      const z = await file(abs + suf);
      if (z) { send = abs + suf; size = z.size; headers['Content-Encoding'] = enc; break; }
    }
    headers['Content-Length'] = size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end(), true;
    createReadStream(send).pipe(res);
    return true;
  }
  return false;
}

async function notFound(res) {
  const p = join(ROOT, '404.html');
  res.writeHead(404, { ...SECURITY, 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
  if (await file(p)) createReadStream(p).pipe(res); else res.end('Not found');
}

http.createServer(async (req, res) => {
  try {
    // Без www и без хвостового слэша
    const url = new URL(req.url, 'http://x');
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      res.writeHead(301, { Location: url.pathname.replace(/\/+$/, '') + url.search }); return res.end();
    }
    if (url.pathname === '/index' || url.pathname === '/index.html') { res.writeHead(301, { Location: '/' }); return res.end(); }
    const to = redirectTo(url.pathname);
    if (to) { res.writeHead(301, { Location: to }); return res.end(); }
    if (await serveStatic(req, res)) return;
    return notFound(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500); res.end();
  }
}).listen(PORT, HOST, () => console.log(`reconcept.ru listening on ${HOST}:${PORT}`));
