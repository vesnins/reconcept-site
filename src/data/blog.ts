// Блог (R60, К13). Посты — пока рыба. Порядок = по дате, новые первыми; от него зависят стрелки ←/→.
// rel — «Раз вы уже здесь»: связанные посты вручную, по смыслу. ill — ключ иллюстрации из blog-ill.ts.
// body: { p } абзац (HTML), { h } подзаголовок, { fig, cap } иллюстрация с подписью.
export type Block = { p: string } | { h: string } | { fig: string; cap?: string };
export interface Post { slug: string; title: string; date: string; ill: string; rel: string[]; body: Block[] }

export const BLOG = { title: 'Блог — Reconcept', category: 'Кодинг', tg: 'https://t.me/reconcept', tgHandle: '@reconcept' };

const fish = (t: string, ill: string): Block[] => [
  { p: `Здесь будет вступление: какую задачу решает «${t}», для кого он сделан и почему готовые решения не подошли.` },
  { h: 'Задача' },
  { p: 'Черновой абзац. Опишем исходную ситуацию, ограничения и то, как выглядел процесс до появления продукта. Цифры и сроки добавим из реального проекта.' },
  { fig: ill, cap: 'Рис. 1. Схема работы (черновик)' },
  { h: 'Как устроено' },
  { p: 'Черновой абзац. Стек, архитектура, ключевые решения и компромиссы. Здесь будут иллюстрации в той же технике: тонкие линии на точечной сетке.' },
  { p: 'Черновой абзац. Что получилось, что бы сделали иначе и куда продукт развивается дальше.' },
];

const post = (slug: string, title: string, date: string, ill: string, rel: string[]): Post => ({ slug, title, date, ill, rel, body: fish(title, ill) });

export const POSTS: Post[] = [
  post('sevengoals', 'SevenGoals', '2026-10-12', 'goals', ['rewriter', 'mentor-bot']),
  post('diary-bot', 'Бот электронного дневника', '2026-10-05', 'diary', ['flats-bot', 'sevengoals']),
  post('flats-bot', 'Бот новых объявлений о квартирах', '2026-09-28', 'flats', ['diary-bot', 'rewriter']),
  post('mentor-bot', 'Бот Ментеора', '2026-09-21', 'mentor', ['sevengoals', 'diary-bot']),
  post('rewriter', 'Рерайтор-публикатор для блога', '2026-09-14', 'rewrite', ['mentor-bot', 'flats-bot']),
];

export const bySlug = Object.fromEntries(POSTS.map((p) => [p.slug, p]));
export const ruDate = (d: string) => d.split('-').reverse().join('.');
