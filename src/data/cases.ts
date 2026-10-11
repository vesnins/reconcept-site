// Кейсы на главной (порядок = порядок вывода). video — ID видео Kinescope.
import replatforms from '../assets/cases/replatforms.webp';
import ukpa from '../assets/cases/uk-property-advisors.webp';
import identity from '../assets/cases/identity.svg';
import type { ImageMetadata } from 'astro';

export interface Case { title: string; text: string; bg: string; read?: string; site?: string; video?: string; ratio?: string; image?: ImageMetadata }

export const cases: Case[] = [
  { title: 'Спорт-Инновация', text: 'Сайт для представителя Lynx в России', bg: '#2a115a', site: 'https://sport-inv.ru/', video: 'btJpS8XHvkeNziQZbgYt4m' },
  { title: 'Enli', text: 'Сайт для фабрики мебели', bg: '#675446', site: 'https://enlimsk.ru/', video: '7paPmG7cSrawYxZCzshPnc' },
  { title: 'eTiming', text: 'Платформа для трансляции результатов российских соревнований по легкой атлетике и других видов спорта в режиме онлайн на табло и Матч ТВ', bg: '#55009c', site: 'https://etiming.ru/', video: 'cLgTGD7xSHYPhPNRdWHcFL' },
  { title: 'Эластур', text: 'Сайт для завода спортивных покрытий «Эластомер»', bg: '#4b7ddc', site: 'https://elastur.ru/', video: 'd4jrNSw1RccViUcCFF96Gk' },
  { title: 'Freeul', text: 'Интернет-магазин российского бренда БАДов', bg: '#c8c8fc', read: '/portfolio/e-commerce-website-development-freeul', site: 'https://freeul.ru/', video: '45femd2Z2etVuW6RMWyMkx' },
  { title: 'Цветкова', text: 'Сайт и стиль для бренда домашнего текстиля', bg: '#75915c', read: '/portfolio/website-development-cvetkova', site: 'https://cvkv.ru/', video: 'rdzGLEhWngwdLRRdidyGLM' },
  { title: 'Orway', text: 'Сайт итальянского стартапа', bg: '#303030', read: '/portfolio/website-development-orway', site: 'https://orway.com/en', video: 'tHY1xrCHc8VZ4vXrkVQYhB', ratio: '1000/577' },
  { title: 'Filmoza', text: 'Лендинг', bg: '#314b37', read: '/portfolio/landing-page-development-filmoza', site: 'https://filmoza.ru/', video: '8GyKXGgmSZQb1z2rP9MJKa' },
  { title: 'Нейросемантика', text: 'Дизайн ИИ-сервиса', bg: '#00c13d', read: '/portfolio/ux-ui-design-neuro-semantic', site: 'https://neuro-semantic.ru/app/login', video: 'tJiH6FtBsFqeXG6kuj34uv', ratio: '1000/577' },
  { title: 'KPMI', text: 'Дизайн ИИ-сервиса', bg: '#c8c8fc', read: '/portfolio/ux-ui-design-webdesign-and-frontend-development-ai-startup-kpmi', site: 'https://kpmi.ru/', video: 'eMSLTho7a5AwZx6TQaHmCy' },
  { title: 'Александр Тихонов', text: 'Официальный сайт для 4-кратного олимпийского чемпиона', bg: '#112191', read: '/portfolio/website-development-mr-biathlon-aleksander-tikhonov', site: 'https://alexander-tikhonov.com/', video: 'sm6MUXo92TLqHoAQhUPNex' },
  { title: 'RePlatforms', text: 'Платформа для управления недвижимостью', bg: '#6e372b', read: '/portfolio/custom-website-development-replatforms', image: replatforms },
  { title: 'Бабочка', text: 'Сайт текстильного салона и цеха', bg: '#392637', read: '/portfolio/landing-page-development-babochka', site: 'https://decorbabochka.ru/', video: '8MqmP79bntNVA9Qej3MBzF' },
  { title: 'UK Property Advisors Ltd', text: 'Агентство элитной недвижимости в Лондоне', bg: '#804832', read: '/portfolio/corporate-website-development-uk-property-advisors-ltd', image: ukpa },
  { title: 'Айдентика', text: 'Логотипы, знаки, стиль, полиграфия', bg: '#c8c8fc', read: '/services/brand-identity-design', image: identity },
];
