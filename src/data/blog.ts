// Блог (R60, К13). Порядок = по дате, новые первыми; от него зависят стрелки ←/→.
// rel — «Раз вы уже здесь»: связанные посты вручную, по смыслу. ill — ключ иллюстрации из blog-ill.ts.
// body: { p } абзац (HTML), { lead } подводка, { h } подзаголовок, { ul }/{ ol } списки (HTML), { tbl } таблица (1-я строка — шапка), { fig, cap } иллюстрация с подписью.
// card — заголовок превью (иначе title); cover — иллюстрация внутри поста (иначе ill); seo — title/description страницы; author — подпись в мете (иначе Reconcept).
import { menteora } from './posts/menteora';
import { sevengoals } from './posts/sevengoals';
import { esdnevnik } from './posts/esdnevnik';
import { haloOglasi } from './posts/halo-oglasi';
import { aiNewsRewriter } from './posts/ai-news-rewriter';
export type Block = { p: string } | { lead: string } | { h: string } | { ul: string[] } | { ol: string[] } | { tbl: string[][] } | { fig: string; cap?: string };
export interface Post { slug: string; title: string; card?: string; date: string; ill: string; cover?: string; rel: string[]; body: Block[]; seo?: { t: string; d: string }; author?: string }

export const BLOG = { title: 'Блог — Reconcept', category: 'Кодинг', tg: 'https://t.me/reconcept', tgHandle: '@reconcept' };

export const POSTS: Post[] = [
  { slug: 'menteora', title: 'Разработка бота Menteora — учёт стресса в тренировках спортсменов', card: 'Телеграм-бот Menteora', date: '2026-10-08', ill: 'menteora', cover: 'menteora-cam', rel: ['sevengoals', 'esdnevnik'], body: menteora, author: 'Сергей Веснин',
    seo: { t: 'Разработка Telegram-бота на заказ: кейс Menteora — Reconcept', d: 'Как мы сделали Telegram-бота для спортсменов: интеграция с Garmin, оплата картой и СБП, ML-модели и отказ от них. Разработка ботов на заказ — Reconcept.' } },
  { slug: 'sevengoals', title: 'Я разработал приложение, которое помогает найти главную цель в жизни, и оно лежит в App Store. Вот где я ошибся', card: 'Приложение SevenGoals', date: '2026-06-17', ill: 'sevengoals', cover: 'sevengoals-in', rel: ['menteora', 'ai-news-rewriter'], body: sevengoals, author: 'Сергей Веснин',
    seo: { t: 'Разработка мобильного приложения на заказ: кейс SevenGoals — Reconcept', d: 'Как мы сделали iOS и Android-приложение на React Native и Firebase: отказ Apple, тестирование в Google Play, ошибки полуночи и летнего времени. Разработка приложений на заказ.' } },
  { slug: 'esdnevnik', title: 'Бот для сербского школьного дневника: от идеи до полного контроля над оценками', card: 'Телеграм-бот для esDnevnik', date: '2026-03-04', ill: 'esdnevnik', cover: 'esdnevnik-in', rel: ['menteora', 'sevengoals'], body: esdnevnik, author: 'Сергей Веснин',
    seo: { t: 'Разработка мобильного приложения на заказ: кейс esDnevnik — Reconcept', d: 'Как мы сделали Telegram-бота для электронного дневника: обход блокировки через WireGuard, оплата в Telegram Stars, 3 языка. Разработка приложений на заказ.' } },
  { slug: 'halo-oglasi-bot', title: 'Поднял сервер на старом телефоне Samsung и сделал там бота для сообщений о новых квартирах в Белграде', card: 'Телеграм-бот для Halo Oglasi', date: '2025-12-11', ill: 'halo-oglasi', cover: 'halo-oglasi-in', rel: ['esdnevnik', 'menteora'], body: haloOglasi, author: 'Сергей Веснин',
    seo: { t: 'Разработка мобильного приложения на заказ: бот-парсер Halo Oglasi — Reconcept', d: 'Как мы сделали бота, который парсит сайт недвижимости и за 3–5 минут шлёт новые квартиры в Telegram: Cloudflare, сервер на Android-телефоне. Разработка приложений на заказ.' } },
  { slug: 'ai-news-rewriter', title: 'Я написал ИИ-парсер, который рерайтит новости и публикует их в моём блоге', card: 'ИИ-парсер новостей для vesnins.ru', date: '2025-10-21', ill: 'ai-news-rewriter', cover: 'ai-news-rewriter-in', rel: ['halo-oglasi-bot', 'esdnevnik'], body: aiNewsRewriter, author: 'Сергей Веснин',
    seo: { t: 'Разработка мобильного приложения на заказ: ИИ-парсер новостей — Reconcept', d: 'Как мы сделали ИИ-робота: находит новости в RSS, пишет заметки в стиле автора и кладёт черновики в WordPress. Gemini из России, cron, Telegram. Разработка приложений на заказ.' } },
];

export const bySlug = Object.fromEntries(POSTS.map((p) => [p.slug, p]));
export const ruDate = (d: string) => d.split('-').reverse().join('.');
