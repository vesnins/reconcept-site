// Готовое сжатие статики (brotli + gzip) — сервер отдаёт .br/.gz без нагрузки на CPU.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const EXT = new Set(['.html', '.css', '.js', '.svg', '.json', '.xml', '.txt', '.webmanifest']);
let n = 0;
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (EXT.has(extname(p))) {
      const buf = await readFile(p);
      if (buf.length < 1024) continue;
      await writeFile(p + '.br', brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
      await writeFile(p + '.gz', gzipSync(buf, { level: 9 }));
      n++;
    }
  }
}
await walk(ROOT);
console.log(`precompressed ${n} files`);
