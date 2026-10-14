// Блог (R60, К13). Посты — пока рыба. Порядок = по дате, новые первыми; от него зависят стрелки ←/→.
// rel — «Раз вы уже здесь»: связанные посты вручную, по смыслу. ill — ключ иллюстрации из blog-ill.ts.
// body: { p } абзац (HTML), { lead } подводка, { h } подзаголовок, { ul }/{ ol } списки (HTML), { tbl } таблица (1-я строка — шапка), { fig, cap } иллюстрация с подписью.
// card — заголовок превью (иначе title); cover — иллюстрация внутри поста (иначе ill); seo — title/description страницы; author — подпись в мете (иначе Reconcept).
import { menteora } from './posts/menteora';
import { sevengoals } from './posts/sevengoals';
import { esdnevnik } from './posts/esdnevnik';
export type Block = { p: string } | { lead: string } | { h: string } | { ul: string[] } | { ol: string[] } | { tbl: string[][] } | { fig: string; cap?: string };
export interface Post { slug: string; title: string; card?: string; date: string; ill: string; cover?: string; rel: string[]; body: Block[]; seo?: { t: string; d: string }; author?: string }

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
  { slug: 'esdnevnik', title: 'Бот для сербского школьного дневника: от идеи до полного контроля над оценками', card: 'Телеграм-бот для esDnevnik', date: '2026-10-14', ill: 'esdnevnik', cover: 'esdnevnik-in', rel: ['menteora', 'sevengoals'], body: esdnevnik, author: 'Сергей Веснин',
    seo: { t: 'Разработка мобильного приложения на заказ: кейс esDnevnik — Reconcept', d: 'Как мы сделали Telegram-бота для электронного дневника: обход блокировки через WireGuard, оплата в Telegram Stars, 3 языка. Разработка приложений на заказ.' } },
  { slug: 'menteora', title: 'Разработка бота Menteora — учёт стресса в тренировках спортсменов', card: 'Телеграм-бот Menteora', date: '2026-10-13', ill: 'menteora', cover: 'menteora-cam', rel: ['sevengoals', 'esdnevnik'], body: menteora, author: 'Сергей Веснин',
    seo: { t: 'Разработка Telegram-бота на заказ: кейс Menteora — Reconcept', d: 'Как мы сделали Telegram-бота для спортсменов: интеграция с Garmin, оплата картой и СБП, ML-модели и отказ от них. Разработка ботов на заказ — Reconcept.' } },
  post('flats-bot', 'Бот новых объявлений о квартирах', '2026-10-12', 'flats', ['esdnevnik', 'rewriter']),
  { slug: 'sevengoals', title: 'Я разработал приложение, которое помогает найти главную цель в жизни, и оно лежит в App Store. Вот где я ошибся', card: 'Приложение SevenGoals', date: '2026-09-28', ill: 'sevengoals', cover: 'sevengoals-in', rel: ['menteora', 'rewriter'], body: sevengoals, author: 'Сергей Веснин',
    seo: { t: 'Разработка мобильного приложения на заказ: кейс SevenGoals — Reconcept', d: 'Как мы сделали iOS и Android-приложение на React Native и Firebase: отказ Apple, тестирование в Google Play, ошибки полуночи и летнего времени. Разработка приложений на заказ.' } },
  post('rewriter', 'Рерайтор-публикатор для блога', '2026-09-14', 'rewrite', ['menteora', 'flats-bot']),
];

export const bySlug = Object.fromEntries(POSTS.map((p) => [p.slug, p]));
export const ruDate = (d: string) => d.split('-').reverse().join('.');
