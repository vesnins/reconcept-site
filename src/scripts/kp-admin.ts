// Админка КП: вход по паролю (KP_PASS), список, карточка КП, правка оценок ИИ, отзыв ссылки.
import { SERVICES, TYPES, INDUSTRIES, SCALE, GOODS, FEATURES, FILL, BRAND, REGIONS, label } from '../../kp-data.mjs';
const root = document.getElementById('kpa')!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const rub = (n: number | null) => (n == null ? 'обсудим лично' : `${n.toLocaleString('ru-RU')} ₽`);
const dt = (ts: number) => (ts ? new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const ST = ['считается', 'готово', 'отозвано'];
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
  root.innerHTML = `<h1 class="kp__h1">КП</h1><table class="kp__tbl kpa__tbl"><thead><tr><td>№</td><td>Создано</td><td>Услуга</td><td>Цена</td><td>Статус</td><td>Визиты</td><td>Последний</td></tr></thead><tbody>${rows.map((r) => `<tr><td><a href="#${r.id}">${r.id}</a></td><td>${dt(r.ts)}</td><td>${label(SERVICES, r.svc)}</td><td>${r.price == null ? '—' : rub(r.price)}</td><td>${ST[r.st]}${r.st === 1 && r.until < Date.now() ? ', срок истёк' : ''}</td><td>${r.n}</td><td>${dt(r.lv)}</td></tr>`).join('')}</tbody></table>
  <p><button class="rq-back" type="button" id="out">Выйти</button></p>`;
  root.querySelector('#out')!.addEventListener('click', async () => { await api('logout', {}); login(); });
}
async function card(id: number, upd?: object) {
  const k = await api(upd ? 'patch' : `get?id=${id}`, upd ? { id, ...upd } : undefined);
  const a = k.a, e = k.e, c = k.c || {};
  const ans = k.svc === 'site'
    ? [['Тип', label(TYPES, a.type)], ['Отрасль', a.ind === 'other' ? `Другое: ${a.indText}` : label(INDUSTRIES, a.ind)], ['Масштаб', label(SCALE, a.scale)], ['Товары', label(GOODS, a.goods)], ['Функции', a.feat.map((f: string) => label(FEATURES, f)).join(', ')], ['Хотелка', a.wish], ['Наполняет', label(FILL, a.fill)], ['Стиль', label(BRAND, a.brand)], ['Сайт', a.url]]
    : [['Регионы', label(REGIONS, a.reg)], ['Отрасль', a.ind === 'other' ? `Другое: ${a.indText}` : label(INDUSTRIES, a.ind)], ['Сайт', a.url]];
  const flag = (x: any) => (x ? ` <b>${esc(x.flag || (x.manual ? 'правка' : x.ai ? 'ИИ' : ''))}</b>` : '');
  root.innerHTML = `<p><a class="rq-back" href="#">← все КП</a></p>
  <h1 class="kp__h1">КП №${k.id} · ${rub(k.price)}</h1>
  <p class="kp__sub">${label(SERVICES, k.svc)} · ${ST[k.st]} · создано ${dt(k.ts)} · цена до ${dt(k.until)} · <a href="/kp/${k.t}" target="_blank">открыть</a></p>
  <h2 class="kp__h2">Ответы</h2><table class="kp__tbl"><tbody>${ans.filter((x) => x[1]).map(([t, v]) => `<tr><td>${t}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
  <h2 class="kp__h2">Смета</h2><table class="kp__tbl"><tbody>${(c.lines || []).map(([t, v]: [string, number]) => `<tr><td>${esc(t)}</td><td>${rub(v)}</td></tr>`).join('')}</tbody></table>
  ${k.svc === 'site' ? `<h2 class="kp__h2">Оценки</h2><form class="kpa__ed">
    <label>Группа отрасли${flag(e.group)}<select name="group">${['×1', '×1,3', '×2'].map((t, i) => `<option value="${i}"${c.g === i ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    ${a.type !== 'landing' ? `<label>Уникальных страниц${flag(e.pages)}<input name="unique" type="number" min="1" max="100" value="${c.pages}"></label><label>Однотипных<input name="typical" type="number" min="0" value="${c.typical}"></label>` : ''}
    ${a.wish ? `<label>Хотелка: название${flag(e.wish)}<input name="wishTitle" value="${esc(e.wish?.title)}"></label><label>Часы (пусто — «обсудим лично»)<input name="wishH" type="number" min="0" value="${e.wish?.ok ? e.wish.h : ''}"></label>` : ''}
    <button class="pill" type="submit">пересчитать</button></form>
    ${e.site?.text ? `<h2 class="kp__h2">Старый сайт: ${esc(e.site.src)}, ${e.site.total} адресов</h2><pre class="kpa__pre">${esc(e.site.text)}</pre>` : ''}` : ''}
  <h2 class="kp__h2">Визиты</h2><table class="kp__tbl"><tbody>${k.visits.map((v: any, i: number) => `<tr><td>${i + 1}. ${dt(v.start)} – ${dt(v.last)}</td><td>${esc(v.dev)}${v.vid === k.vid ? ' · автор анкеты' : ''} · ${esc(v.ip)}</td></tr>`).join('') || '<tr><td>нет</td></tr>'}</tbody></table>
  ${k.fw.length ? `<h2 class="kp__h2">Превью ссылки</h2><table class="kp__tbl"><tbody>${k.fw.map((f: any) => `<tr><td>${dt(f.ts)}</td><td>${esc(f.ua)}</td></tr>`).join('')}</tbody></table>` : ''}
  <p class="kpa__act"><button class="pill" type="button" id="rv">${k.st === 2 ? 'вернуть ссылку' : 'отозвать ссылку'}</button></p>`;
  root.querySelector('#rv')!.addEventListener('click', async () => { await api('revoke', { id, on: k.st !== 2 }); card(id); });
  const f = root.querySelector<HTMLFormElement>('.kpa__ed');
  if (f) f.onsubmit = (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(f)) as Record<string, string>, u: Record<string, unknown> = +d.group === c.g ? {} : { group: +d.group };
    if ('unique' in d && (+d.unique !== c.pages || +d.typical !== c.typical)) Object.assign(u, { unique: +d.unique, typical: +d.typical });
    if ('wishH' in d) Object.assign(u, { wishTitle: d.wishTitle, wishH: d.wishH === '' ? null : +d.wishH });
    card(id, u);
  };
}
const route = () => { const id = Number(location.hash.slice(1)); (id ? card(id) : list()).catch(() => {}); };
addEventListener('hashchange', route);
route();
