// Админка КП: вход по паролю (KP_PASS), список, карточка КП, правка оценок ИИ, отзыв ссылки.
import { SERVICES, TYPES, INDUSTRIES, SCALE, GOODS, FEATURES, FILL, BRAND, REGIONS, label } from '../../kp-data.mjs';
const root = document.getElementById('kpa')!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const rub = (n: number | null) => (n == null ? 'обсудим лично' : `${n.toLocaleString('ru-RU')} ₽`);
const dt = (ts: number) => (ts ? new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const ST = ['считается', 'готово', 'отозвано'];
const PH = ['создано', 'открыто', 'изучено', 'хочет работать', 'договор', 'отказ'];
// Статус: отозвано / считается, иначе этап; «остыло» — нет визитов 14 дней и клиент ещё не хотел работать
const phase = (r: any) => (r.st !== 1 ? ST[r.st] : r.ph < 3 && Date.now() - Math.max(r.lv || 0, r.ts) > 14 * 864e5 ? 'остыло' : PH[r.ph]) + (r.st === 1 && r.until < Date.now() ? ', срок цены истёк' : '');
let es: EventSource | null = null;
const api = async (p: string, b?: object) => {
  const r = await fetch(`/api/kp/admin/${p}`, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : {});
  if (r.status === 401) { login(); throw 0; }
  return r.json();
};
function login() {
  root.innerHTML = '<form class="kpa__login"><input class="kpf__in" type="password" name="p" placeholder="пароль" autocomplete="current-password" required><button class="pill" type="submit">войти</button><p class="kpa__err"></p></form>';
  root.querySelector('form')!.onsubmit = async (e) => {
    e.preventDefault();
    const r = await fetch('/api/kp/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pass: (e.target as HTMLFormElement).p.value }) });
    if (r.ok) route(); else root.querySelector('.kpa__err')!.textContent = r.status === 429 ? 'Много попыток, подождите 10 минут' : 'Неверный пароль';
  };
}
async function list() {
  const rows: any[] = await api('list');
  root.innerHTML = `<h1 class="kp__h1">Коммерческие предложения</h1><p class="kp__sub"><a href="#stats">Статистика</a></p><table class="kp__tbl kpa__tbl"><thead><tr><td>№</td><td>Создано</td><td>Услуга</td><td>Цена</td><td>Статус</td><td>Визиты</td><td>Последний</td></tr></thead><tbody>${rows.map((r) => `<tr><td><a href="#${r.id}">${r.id}</a></td><td>${dt(r.ts)}</td><td>${label(SERVICES, r.svc)}</td><td>${r.price == null ? '—' : rub(r.price)}</td><td>${phase(r)}</td><td>${r.n}</td><td>${dt(r.lv)}</td></tr>`).join('')}</tbody></table>
  <p><button class="rq-back" type="button" id="out">Выйти</button></p>`;
  root.querySelector('#out')!.addEventListener('click', async () => { await api('logout', {}); login(); });
}
async function card(id: number, upd?: object) {
  const k = await api(upd ? 'patch' : `get?id=${id}`, upd ? { id, ...upd } : undefined);
  k.lv = Math.max(0, ...k.visits.map((v: any) => v.last));
  const a = k.a, e = k.e, c = k.c || {};
  const ans = k.svc === 'site'
    ? [['Тип', label(TYPES, a.type)], ['Отрасль', a.ind === 'other' ? `Другое: ${a.indText}` : label(INDUSTRIES, a.ind)], ['Масштаб', label(SCALE, a.scale)], ['Товары', label(GOODS, a.goods)], ['Функции', a.feat.map((f: string) => label(FEATURES, f)).join(', ')], ['Хотелка', a.wish], ['Наполняет', label(FILL, a.fill)], ['Стиль', label(BRAND, a.brand)], ['Сайт', a.url]]
    : [['Регионы', label(REGIONS, a.reg)], ['Отрасль', a.ind === 'other' ? `Другое: ${a.indText}` : label(INDUSTRIES, a.ind)], ['Сайт', a.url]];
  const flag = (x: any) => (x ? ` <b>${esc(x.flag || (x.manual ? 'правка' : x.ai ? 'ИИ' : ''))}</b>` : '');
  root.innerHTML = `<p><a class="rq-back" href="#">← все КП</a></p>
  <h1 class="kp__h1">КП №${k.id} · ${rub(k.price)}</h1>
  <p class="kp__sub">${label(SERVICES, k.svc)} · ${phase(k)} · создано ${dt(k.ts)} · цена до ${dt(k.until)} · <a href="/kp/${k.t}" target="_blank">открыть</a></p>
  ${k.st === 1 ? `<label class="kpa__ph">Статус<select id="ph">${PH.map((t, i) => `<option value="${i}"${k.ph === i ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
  ${k.agr ? `<p class="kp__sub">«Согласовать»: ${dt(k.agl)} на ${rub(k.asum)}${k.ok ? ' · написал ✅' : ''}</p>` : ''}
  <h2 class="kp__h2">Смотреть <span class="kpa__on" id="on">нет на странице</span></h2><div class="kpw" id="kpw"><div class="kp kpw__in" inert>${k.html}</div></div>
  <h2 class="kp__h2">Действия</h2><ol class="kpa__feed" id="feed">${k.acts.map(li).join('') || '<li>нет</li>'}</ol>` : ''}
  ${who(k)}
  <h2 class="kp__h2">Ответы</h2><table class="kp__tbl"><tbody>${ans.filter((x) => x[1]).map(([t, v]) => `<tr><td>${t}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
  <h2 class="kp__h2">Смета</h2><table class="kp__tbl"><tbody>${(c.lines || []).map(([t, v]: [string, number]) => `<tr><td>${esc(t)}</td><td>${rub(v)}</td></tr>`).join('')}</tbody></table>
  ${k.svc === 'site' ? `<h2 class="kp__h2">Оценки</h2><form class="kpa__ed">
    <label>Группа отрасли${flag(e.group)}<select name="group">${['×1', '×1,3', '×2'].map((t, i) => `<option value="${i}"${c.g === i ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    ${a.type !== 'landing' ? `<label>Уникальных страниц${flag(e.pages)}<input name="unique" type="number" min="1" max="100" value="${c.pages}"></label><label>Однотипных<input name="typical" type="number" min="0" value="${c.typical}"></label>` : ''}
    ${a.wish ? `<label>Хотелка: название${flag(e.wish)}<input name="wishTitle" value="${esc(e.wish?.title)}"></label><label>Часы (пусто — «обсудим лично»)<input name="wishH" type="number" min="0" value="${e.wish?.ok ? e.wish.h : ''}"></label>` : ''}
    <button class="pill" type="submit">пересчитать</button></form>
    ${e.site?.text ? `<h2 class="kp__h2">Старый сайт: ${esc(e.site.src)}, ${e.site.total} адресов</h2><pre class="kpa__pre">${esc(e.site.text)}</pre>` : ''}` : ''}
  <h2 class="kp__h2">Визиты</h2><table class="kp__tbl"><tbody>${k.visits.map((v: any, i: number) => `<tr><td>${i + 1}. ${dt(v.start)} – ${dt(v.last)}</td><td>${esc(v.dev)}${k.G[v.ip] ? ` · ${esc(k.G[v.ip])}` : ''}${v.tz ? ` · ${esc(v.tz)}` : ''}${v.vid === k.vid ? ' · автор анкеты' : ''}${v.f ? ' · по пересланной ссылке' : ''} · ${esc(v.ip)}<br>${blocks(v)}${v.opt && v.opt !== '[]' ? ` · смета ${rub(v.sum)}` : ''}</td></tr>`).join('') || '<tr><td>нет</td></tr>'}</tbody></table>
  ${k.sh.length ? `<h2 class="kp__h2">Переслали</h2><table class="kp__tbl"><tbody>${k.sh.map((z: any) => `<tr><td>${dt(z.ts)} · ${esc(z.m)}</td><td>открыли ${z.n} раз</td></tr>`).join('')}</tbody></table>` : ''}
  ${k.fw.length ? `<h2 class="kp__h2">Превью ссылки</h2><table class="kp__tbl"><tbody>${k.fw.map((f: any) => `<tr><td>${dt(f.ts)}</td><td>${esc(f.ua)}</td></tr>`).join('')}</tbody></table>` : ''}
  <p class="kpa__act"><button class="pill" type="button" id="rv">${k.st === 2 ? 'вернуть ссылку' : 'отозвать ссылку'}</button></p>`;
  root.querySelector('#rv')!.addEventListener('click', async () => { await api('revoke', { id, on: k.st !== 2 }); card(id); });
  root.querySelector<HTMLSelectElement>('#ph')?.addEventListener('change', (e) => api('phase', { id, ph: +(e.target as HTMLSelectElement).value }));
  if (k.st === 1) watch(id);
  const f = root.querySelector<HTMLFormElement>('.kpa__ed');
  if (f) f.onsubmit = (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(f)) as Record<string, string>, u: Record<string, unknown> = +d.group === c.g ? {} : { group: +d.group };
    if ('unique' in d && (+d.unique !== c.pages || +d.typical !== c.typical)) Object.assign(u, { unique: +d.unique, typical: +d.typical });
    if ('wishH' in d) Object.assign(u, { wishTitle: d.wishTitle, wishH: d.wishH === '' ? null : +d.wishH });
    card(id, u);
  };
}
const BL: Record<string, string> = { price: 'Цена', smeta: 'Смета', struct: 'Структура', incl: 'Что входит', cases: 'Кейсы', roi: 'Окупаемость', contact: 'Согласовать', doubt: 'Что смущает' };
// Кто клиент: источник, путь, город и сеть, повторный, конкурент, окупаемость, «что смущает»
function who(k: any) {
  const w = k.who, r = w.roi, d = w.doubt;
  const rows = [['Откуда', w.src], ['Путь до анкеты', w.path], ['Город и сеть', w.geo], ['Повторный клиент', w.repeat.join(', ')], ['⚠️ Похож на конкурента', w.rival.join(', ')],
    ['Окупаемость', r.check && `чек ${rub(r.check)}, заявок ${r.leads} в месяц, покупают ${r.conv} из 10`], ['Что смущает', d.ts && [d.d.join(', '), d.text && `«${d.text}»`].filter(Boolean).join(' · ')]];
  return `<h2 class="kp__h2">Клиент</h2><table class="kp__tbl kpa__tbl"><tbody>${rows.filter((x) => x[1]).map(([t, v]) => `<tr><td>${t}</td><td>${esc(v)}</td></tr>`).join('') || '<tr><td>нет данных</td></tr>'}</tbody></table>`;
}
const li = (a: any) => `<li><time>${dt(a.ts)}</time> ${a.vid ? `<i>${esc(a.vid.slice(0, 4))}</i> ` : ''}${esc(a.v)}</li>`;
// «Смотреть»: копия КП в ширину экрана клиента, прокрутка к его блоку, галочки, лента действий
function watch(id: number) {
  const wrap = root.querySelector<HTMLElement>('#kpw')!, inner = wrap.firstElementChild as HTMLElement, on = root.querySelector('#on')!, feed = root.querySelector('#feed')!;
  let seen = 0;
  es = new EventSource(`/api/kp/admin/live?id=${id}`);
  es.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.a) { if (feed.firstElementChild?.textContent === 'нет') feed.innerHTML = ''; feed.insertAdjacentHTML('afterbegin', li(d.a)); }
    const o = d.o || d.s?.o;
    if (o) { inner.querySelector('.kp__tbl tbody')!.innerHTML = o.rows; inner.querySelectorAll('[data-total]').forEach((x) => (x.textContent = o.total)); }
    const s = d.s;
    if (!s?.ts) return;
    seen = s.on ? s.ts : 0;
    on.textContent = s.on ? `на странице · ${s.dev}${s.w ? ` · экран ${s.w}px` : ''}` : 'нет на странице';
    if (s.w) inner.style.width = `${Math.min(s.w, wrap.clientWidth)}px`;
    inner.querySelectorAll('.kpw__b').forEach((x) => x.classList.remove('kpw__b'));
    const el = s.on && s.b && inner.querySelector<HTMLElement>(`[data-b="${s.b}"]`);
    if (el) { el.classList.add('kpw__b'); wrap.scrollTo({ top: el.offsetTop + el.offsetHeight * s.f - wrap.clientHeight / 2, behavior: 'smooth' }); }
  };
  const t = setInterval(() => { if (!es) return clearInterval(t); if (seen && Date.now() - seen > 15e3) { seen = 0; on.textContent = 'нет на странице'; } }, 5e3);
}
const blocks = (v: any) => {
  const b = JSON.parse(v.b || '{}');
  return [Object.keys(BL).filter((k) => b[k]).map((k) => `${BL[k]} ${b[k]} с`).join(', '), v.lb && `вышел: ${BL[v.lb]}`, v.cp && `копировал ${v.cp}`, v.pr && `печать ${v.pr}`, v.cl && `нажал «связаться» ${v.cl}`].filter(Boolean).join(' · ');
};
const STEPS: [string, string][] = [['svc', 'Услуга'], ['type', 'Тип сайта'], ['reg', 'Регионы'], ['ind', 'Отрасль'], ['indText', 'Своя отрасль'], ['scale', 'Масштаб'], ['goods', 'Товары'], ['feat', 'Функции'], ['wish', 'Своя задача'], ['fill', 'Наполнение'], ['brand', 'Стиль'], ['url', 'Адрес сайта']];
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '—');
const tbl = (h: string, head: string[], rows: unknown[][]) => `<h2 class="kp__h2">${h}</h2><table class="kp__tbl kpa__tbl"><thead><tr>${head.map((x) => `<td>${x}</td>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('') || '<tr><td>нет данных</td></tr>'}</tbody></table>`;
async function stats(days: number) {
  const s = await api(`stats?days=${days}`), e = s.ev;
  const fun: [string, number][] = [['Открыли анкету', e.form || 0], ['Начали', e.start || 0], ['Создали КП', s.created], ['Вернулись к КП', s.ret], ['Написали в чат КП', s.chat], ['Нажали «связаться» в КП', s.contact], ['Нажали «Согласовать»', s.agree]];
  const g = (h: string, rows: any[]) => tbl(h, ['', 'КП', 'Вернулись', 'Связались', 'Средняя цена'], rows.map(([n, c, r, k, p]) => [n, c, `${r} (${pct(r, c)})`, `${k} (${pct(k, c)})`, rub(p)]));
  root.innerHTML = `<p><a class="rq-back" href="#">← все КП</a></p><h1 class="kp__h1">Статистика</h1>
  <p class="kp__sub">${[[7, '7 дней'], [30, '30 дней'], [90, '90 дней'], [0, 'всё время']].map(([d, t]) => d === days ? `<b>${t}</b>` : `<a href="#stats/${d}">${t}</a>`).join(' · ')}</p>
  ${tbl('Воронка', ['', 'Число', 'От предыдущего'], fun.map(([n, v], i) => [n, v, i ? pct(v, fun[i - 1][1]) : '']))}
  <p class="kp__note">«Пересчитать» нажали: ${e.recalc || 0}. Ушли в «Программы и боты»: ${e.soft || 0}.</p>
  ${tbl('Анкета: до какого вопроса дошли', ['Вопрос', 'Дошли', 'От открывших'], STEPS.filter(([k]) => e[`step:${k}`]).map(([k, n]) => [n, e[`step:${k}`], pct(e[`step:${k}`], e.form || 0)]))}
  ${g('По услуге', s.type)}${g('По сумме', s.sum)}${g('По отрасли', s.ind)}${g('По источнику', s.ref)}${g('По кампании (utm_campaign)', s.camp)}
  ${tbl(`Внимание в КП (визитов: ${s.nv})`, ['Блок', 'Секунд за визит', 'Вышли на блоке'], Object.keys(BL).map((k) => [BL[k], s.att[k], s.last[k] || 0]))}`;
}
const route = () => {
  es?.close(); es = null;
  const h = location.hash.slice(1), id = Number(h);
  (h.startsWith('stats') ? stats(Number(h.split('/')[1] ?? 30) || 0) : id ? card(id) : list()).catch((e) => { if (e) { console.error(e); root.insertAdjacentHTML('afterbegin', '<p class="kpa__err">Ошибка загрузки, обновите страницу</p>'); } });
};
addEventListener('hashchange', route);
route();
