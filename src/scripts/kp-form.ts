// Анкета КП: шаги в стиле квиза (.rq-*), ответы → POST /api/kp/create → личная ссылка. Расчёт только на сервере.
type Opt = [string, string];
type Step = { id: string; t: string; hint?: string; o?: Opt[]; multi?: boolean; input?: 'url' | 'text'; ph?: string; when?: () => boolean };
const L = JSON.parse(document.getElementById('kpf')!.dataset.q!) as Record<string, Opt[]>;
const A: Record<string, any> = { feat: [] };
const t0 = Date.now();
const is = (k: string, v: string) => A[k] === v;
const site = () => is('svc', 'site'), direct = () => is('svc', 'direct');
const STEPS: Step[] = [
  { id: 'svc', t: 'Что нужно?', o: L.svc },
  { id: 'type', t: 'Какой сайт?', o: L.type, when: site },
  { id: 'reg', t: 'Где показывать рекламу?', o: L.reg, when: direct },
  { id: 'ind', t: 'Чем занимается компания?', o: L.ind, when: () => site() || direct() },
  { id: 'indText', t: 'Опишите в двух словах', input: 'text', ph: 'например, ветеринарная клиника', when: () => is('ind', 'other') },
  { id: 'scale', t: 'Сколько человек в компании?', o: L.scale, when: site },
  { id: 'goods', t: 'Сколько товаров?', o: L.goods, when: () => site() && is('type', 'shop') },
  { id: 'feat', t: 'Что сайт должен уметь?', hint: 'Можно выбрать несколько или ничего. Заявки в Telegram и на почту входят всегда', o: L.feat, multi: true, when: site },
  { id: 'wish', t: 'Своя задача', hint: 'Если нужно что-то ещё — опишите. Можно пропустить', input: 'text', ph: 'например, бонусная программа для клиентов', when: site },
  { id: 'fill', t: 'Кто будет наполнять сайт и менять контент?', o: L.fill, when: site },
  { id: 'brand', t: 'Есть ли логотип и фирменный стиль?', o: L.brand, when: site },
  { id: 'url', t: 'Есть ли сайт сейчас?', hint: 'Укажите адрес, если есть. Можно пропустить', input: 'url', ph: 'example.ru', when: () => site() || direct() },
];
const root = document.getElementById('kpf-step')!;
let idx = 0;
const queue = () => STEPS.filter((s) => !s.when || s.when());
const el = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ev = (k: string) => { fetch('/api/kp/ev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k }), keepalive: true }).catch(() => {}); };
const seenSteps = new Set<string>();
let started = false;
ev('form');
addEventListener('load', () => window.goal?.('kp_form'));
let vid = '';
try { vid = localStorage.getItem('kpv') || ''; if (!vid) localStorage.setItem('kpv', (vid = crypto.randomUUID())); } catch {}

function render() {
  const q = queue(), s = q[idx];
  if (!seenSteps.has(s.id)) { seenSteps.add(s.id); ev(`step:${s.id}`); }
  root.innerHTML = '';
  const w = el('div', 'rq-step'), bar = el('div', 'rq-bar', '<i></i>'), head = el('div', 'rq-head');
  (bar.firstChild as HTMLElement).style.width = `${Math.round((idx / q.length) * 100)}%`;
  head.append(bar); w.append(head, el('h2', 'rq-q', esc(s.id === 'url' && direct() ? 'Адрес сайта для рекламы' : s.t)));
  if (s.hint) w.append(el('p', 'rq-hint', esc(s.hint)));
  const nav = el('div', 'rq-nav'), next = el('button', 'rq-next', 'Далее') as HTMLButtonElement;
  next.type = 'button';
  if (s.input) {
    const inp = el('input', 'kpf__in') as HTMLInputElement;
    Object.assign(inp, { type: 'text', placeholder: s.ph || '', value: A[s.id] || '', maxLength: s.id === 'wish' ? 1000 : 300 });
    if (s.input === 'url') Object.assign(inp, { inputMode: 'url', autocomplete: 'url' });
    inp.addEventListener('input', () => { A[s.id] = inp.value.trim(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') next.click(); });
    w.append(inp);
    if (s.id === 'indText') next.hidden = !A.indText, inp.addEventListener('input', () => (next.hidden = !A.indText));
    setTimeout(() => inp.focus(), 0);
  } else {
    const list = el('div', `rq-opts ${s.multi ? 'rq-opts--multi' : 'rq-opts--single'}`);
    list.setAttribute('role', s.multi ? 'group' : 'radiogroup');
    for (const [v, t] of s.o!) {
      const on = s.multi ? A[s.id].includes(v) : A[s.id] === v;
      const b = el('button', `rq-opt${on ? ' is-on' : ''}`, `<span class="rq-ctrl"></span><span>${esc(t)}</span>`) as HTMLButtonElement;
      Object.assign(b, { type: 'button' });
      b.setAttribute('role', s.multi ? 'checkbox' : 'radio');
      b.setAttribute('aria-checked', String(on));
      b.addEventListener('click', () => {
        if (s.multi) { const a: string[] = A[s.id]; a.includes(v) ? a.splice(a.indexOf(v), 1) : a.push(v); render(); return; }
        A[s.id] = v; go();
      });
      list.append(b);
    }
    w.append(list);
  }
  if (idx > 0) { const back = el('button', 'rq-back', 'Назад') as HTMLButtonElement; back.type = 'button'; back.onclick = () => { idx--; render(); }; nav.append(back); }
  if (s.multi || s.input) { next.onclick = go; nav.append(next); }
  w.append(nav);
  root.append(w);
}
function go() {
  if (!started) { started = true; ev('start'); window.goal?.('kp_start'); }
  if (A.svc === 'soft') return soft();
  idx++;
  if (idx >= queue().length) return send();
  render();
}
function soft() {
  ev('soft'); window.goal?.('kp_soft');
  root.innerHTML = '';
  root.append(el('h2', 'rq-q', 'Программы и боты считаю лично'), el('p', 'rq-hint', 'Задачи слишком разные для анкеты. Напишите в двух словах, что нужно — назову цену и срок.'),
    el('div', 'kpf__btns', '<a class="pill pill--fill" href="https://t.me/vesnin" target="_blank" rel="noopener" data-goal="click_telegram">обсудить лично<i aria-hidden="true"></i></a>'));
  const back = el('button', 'rq-back', 'Назад') as HTMLButtonElement; back.type = 'button'; back.onclick = () => { A.svc = ''; idx = 0; render(); };
  root.append(back);
}
const WAIT: Record<string, string> = { wish: 'Считаю требуемый вам функционал, минутку...', pages: 'Анализирую количество страниц вашего сайта, минутку...' };
async function send() {
  root.innerHTML = '';
  const msg = el('h2', 'rq-q', 'Готовлю предложение...');
  root.append(msg);
  try {
    const r = await fetch('/api/kp/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...A, vid, ms: Date.now() - t0, ref: document.referrer }) });
    if (!r.ok) throw r.status;
    const { t, wait } = await r.json();
    window.goal?.('kp_create');
    if (wait) {
      msg.textContent = WAIT[wait];
      if (wait === 'pages' && A.wish) setTimeout(() => (msg.textContent = WAIT.wish), 8000);
      for (let i = 0; i < 50; i++) {
        await new Promise((ok) => setTimeout(ok, 1500));
        const s = await fetch(`/api/kp/status?t=${t}`).then((x) => x.json()).catch(() => ({}));
        if (s.st) break;
      }
    }
    location.href = `/kp/${t}`;
  } catch (e) {
    msg.textContent = e === 429 ? 'Слишком много запросов. Попробуйте через час или напишите нам.' : 'Не получилось. Попробуйте ещё раз или напишите нам.';
  }
}
render();
export {};
