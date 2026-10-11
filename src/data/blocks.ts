// Блоки страниц кейсов и услуг (рендер — src/components/Blocks.astro). Выводятся по порядку.
// pad: [сверху, снизу, сверху ≤480px, снизу ≤480px]; bg — фон блока.
// Картинки: путь от src/assets без расширения ('freeul/01' → cases/freeul/01.jpg, 'svc/ecom/01' → svc/ecom/01.jpg).
// html — текст с разметкой (<br>, <ul>). pairs: '' — пустая половина (скрыта ≤1199).
// gap: img [десктоп, ≤1199] (по умолч. 120/60), pairs — число (по умолч. 60), tiles 0 — без зазоров.
// r — скругление 10px на 960–1199; round — 20px (≤1199 — 10px). al — выравнивание пары (по умолч. центр).
export type Pad = [number, number, number?, number?];
export interface Step { t: string; d: string }
export interface Card { t: string; d: string; img: string; href?: string; ext?: boolean }
type B<T> = T & { pad: Pad; bg?: string };
export type Block =
  | B<{ k: 'video'; id: string; ratio?: string; r?: boolean; round?: boolean }>
  | B<{ k: 'intro'; h: string; html: string; year: string }>
  | B<{ k: 'text'; h?: string; html: string; right?: boolean }>
  | B<{ k: 'img'; img: string[]; gap?: [number, number?]; r?: boolean }>
  | B<{ k: 'gimg'; img: string }>
  | B<{ k: 'pairs'; img: string[][]; gap?: number; al?: 'start' | 'end'; r?: boolean }>
  | B<{ k: 'tiles'; c: 2 | 3 | 4; gap?: 0; img: string[] }>
  | B<{ k: 'site'; href: string }>
  | B<{ k: 'hero'; h: string; price?: string }>
  | B<{ k: 'cols'; html: string[] }>
  | B<{ k: 'feat'; h: string; items: string[] }>
  | B<{ k: 'title'; h: string }>
  | B<{ k: 'store'; cards: Card[] }>
  | B<{ k: 'reviews' }>
  | { k: 'steps'; items: Step[]; cta?: boolean }
  | { k: 'faq'; items: [string, string][] };
export interface Page { title: string; description: string; blocks: Block[] }
