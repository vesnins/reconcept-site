/* Reconcept Quiz v1.8.2 — перенесён из vesnins/reconcept-quiz. Открывается любой ссылкой href="#quiz" */
(function () {
  'use strict';

  /* ---------- НАСТРОЙКИ (правятся здесь) ---------- */
  var CFG = {
    YM: 5609182,
    EUR: 100,          // руб. за евро
    HOUR: 40 * 100,    // 4000 руб/час
    TPL_PAGE: 1600,    // типовая страница
    MULTI_BASE: 120000,
    ASTRO_K: 2,
    ASTRO_MIN: 120000,
    SOFT_LIMIT: 60,    // часов: граница модуль/Astro
    TILDA_K: 0.5,      // доля часов на штатные функции Тильды (настройка, подключение)
    LINKS: {
      tg: 'https://t.me/vesnin',
      max: 'https://max.ru/u/f9LHodD0cOLzIoHQFDNyrCKPvcLAdhvTg_SuRq5XdCnqyc_cAKB8rhm9kVM'
    }
  };

  /* ---------- СТАВКИ ---------- */
  var RATE_COMPANY = { ip: 5000, u20: 5000, u100: 10000, o100: 10000, holding: 10000 };

  /* ---------- ФУНКЦИОНАЛ ----------
     hard   — жёсткий триггер Astro
     native — штатно в Тильде (не тарифицируется на чистой Тильде)
     h      — часы [min, max] для Astro и внешних модулей            */
  var FEATURES = {
    leads:     { t: 'Принимать заявки в Telegram и почту', h: [0, 0], native: true, always: true },
    calc:      { t: 'Считать стоимость онлайн', h: [12, 20], native: true },
    booking:   { t: 'Записывать на встречу или бронировать', h: [20, 30], native: true },
    pay:       { t: 'Принимать оплату', h: [15, 25], native: true },
    crm:       { t: 'Складывать заявки в CRM', h: [8, 15], native: true },
    catalog:   { t: 'Каталог с фильтрами и поиском', h: [40, 60], native: true },
    cabinet:   { t: 'Личный кабинет клиента', h: [40, 80], hard: true },
    onec:      { t: 'Обмен с 1С или складом', h: [30, 60], hard: true },
    multilang: { t: 'Несколько языков', h: [20, 30], hard: true },
    anim:      { t: 'Сложные анимации и 3D', h: [20, 60] }
  };

  /* ---------- ВОПРОСЫ ---------- */
  var Q = {
    q_task: {
      t: 'Что должен делать сайт?', multi: true,
      hint: 'Можно выбрать несколько задач',
      o: [
        ['a', 'Продавать услуги, приносить заявки'],
        ['b', 'Продавать товары'],
        ['c', 'Представлять компанию, вызывать доверие'],
        ['d', 'Приводить людей из поиска, отвечать на их вопросы'],
        ['f', 'Другое']
      ]
    },
    q_scale: {
      group: [
        {
          id: 'q_sections',
          t: 'Сколько разделов на сайте?',
          hint: 'Раздел — отдельная страница: услуга, каталог, о компании, кейсы, блог, контакты',
          o: [['r1', '1–2'], ['r2', '3–5'], ['r3', '6–10'], ['r4', '11–20'], ['r5', 'Больше 20'], ['unknown', 'Пока не знаю']]
        },
        {
          id: 'q_catalog',
          t: 'Сколько товаров в каталоге?',
          when: function () { return has('b'); },
          o: [['c1', 'До 50'], ['c2', '50–500'], ['c3', '500–5 000'], ['c4', 'Больше 5 000'], ['unknown', 'Пока не знаю']]
        }
      ]
    },
    q_features: {
      t: 'Что сайт должен уметь?', multi: true,
      hint: 'Можно выбрать несколько. Заявки в Telegram и почту входят всегда',
      o: [
        ['calc', FEATURES.calc.t], ['booking', FEATURES.booking.t], ['pay', FEATURES.pay.t],
        ['crm', FEATURES.crm.t], ['catalog', FEATURES.catalog.t], ['cabinet', FEATURES.cabinet.t],
        ['onec', FEATURES.onec.t], ['multilang', FEATURES.multilang.t], ['anim', FEATURES.anim.t],
        ['none', 'Ничего из этого']
      ]
    },
    q_rhythm: {
      t: 'Кто будет менять контент на сайте?',
      o: [
        ['often', 'Хотим часто менять и тестировать, нашими руками'],
        ['rare', 'Правки редкие, можем просить вас'],
        ['no', 'Контента почти не будет'],
        ['unknown', 'Пока не знаю']
      ]
    },
    q_company: {
      t: 'Масштаб компании',
      o: [
        ['ip', 'ИП или частная практика'], ['u20', 'До 20 человек'],
        ['u100', '20–100 человек'], ['o100', 'Больше 100 человек'],
        ['holding', 'Холдинг, госструктура, тендеры']
      ]
    }
  };

  function has(k) { return (S.a.q_task || []).indexOf(k) > -1; }

  /* ---------- СОСТОЯНИЕ ---------- */
  var KEY = 'rq_state_v3';
  var S = { a: {}, idx: 0, sid: '', started: false, done: false, max: 0 };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var p = JSON.parse(raw); if (p && p.a) S = p; }
    } catch (e) {}
    if (!S.sid) S.sid = 'RQ-' + Date.now().toString(36).toUpperCase();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} S = { a: {}, idx: 0, sid: 'RQ-' + Date.now().toString(36).toUpperCase(), started: false, done: false, max: 0 }; }

  /* ---------- МЕТРИКА ---------- */
  function ym(goal, params) {
    try {
      if (typeof window.ym === 'function') {
        window.ym(CFG.YM, 'reachGoal', goal);
        if (params) window.ym(CFG.YM, 'params', { quiz: params });
      }
    } catch (e) {}
  }

  /* ---------- ОЧЕРЕДЬ ВОПРОСОВ ---------- */
  function queue() {
    var t = S.a.q_task || [];
    if (!t.length || has('f')) return ['q_task'];
    return ['q_task', 'q_scale', 'q_features', 'q_rhythm', 'q_company'];
  }

  function subsOf(cfg, id) {
    if (!cfg.group) return [{ id: id, t: cfg.t, hint: cfg.hint, o: cfg.o, multi: cfg.multi }];
    return cfg.group.filter(function (s) { return !s.when || s.when(); });
  }

  /* ---------- РАСЧЁТ ---------- */
  function rate() { return RATE_COMPANY[S.a.q_company] || 5000; }

  var SEC = { r1: [1, 2], r2: [3, 5], r3: [6, 10], r4: [11, 20], r5: [21, 30], unknown: [5, 15] };
  var CAT = { c1: [2, 2], c2: [3, 5], c3: [6, 10], c4: [10, 16], unknown: [3, 10] };

  function scope() {
    var s = S.a.q_sections, sec = SEC[s] || SEC.unknown, shop = has('b');
    var lo = sec[0], hi = sec[1];
    if (shop) { var c = CAT[S.a.q_catalog] || CAT.unknown; lo += c[0]; hi += c[1]; }
    var hardSel = (S.a.q_features || []).some(function (k) { return FEATURES[k] && FEATURES[k].hard; });
    var kind = shop ? 'shop' : (s === 'r1' && !hardSel ? 'landing' : 'multi');
    if (kind === 'landing') { lo = 6; hi = 8; }
    var unsure = !s || s === 'unknown' || (shop && (!S.a.q_catalog || S.a.q_catalog === 'unknown'));
    return { kind: kind, n: [lo, hi], unsure: unsure };
  }

  function feats() {
    var sel = (S.a.q_features || []).filter(function (k) { return k !== 'none' && FEATURES[k]; });
    if (has('b') && sel.indexOf('catalog') < 0) sel.unshift('catalog');
    var hard = false, h0 = 0, h1 = 0, nonNative0 = 0, nonNative1 = 0;
    sel.forEach(function (k) {
      var f = FEATURES[k];
      if (f.hard) hard = true;
      h0 += f.h[0]; h1 += f.h[1];
      if (!f.native) { nonNative0 += f.h[0]; nonNative1 += f.h[1]; }
    });
    return {
      sel: sel, hard: hard, h: [h0, h1],
      soft: [nonNative0, nonNative1],
      nat: [h0 - nonNative0, h1 - nonNative1]
    };
  }

  function platform(f) {
    if (f.hard || S.a.q_company === 'holding' || S.a.q_catalog === 'c4') return 'astro';
    if (S.a.q_rhythm === 'often') return f.soft[1] > 0 ? 'module' : 'tilda';
    if (f.soft[1] > CFG.SOFT_LIMIT) return 'astro';
    if (f.soft[1] > 0) return 'module';
    return 'tilda';
  }

  function baseTilda(sp, r, pages) {
    if (sp.kind === 'landing') return pages * r;
    var ind = Math.min(pages, 20), tpl = Math.max(0, pages - 20);
    return CFG.MULTI_BASE * (r / 5000) + Math.max(0, ind - 6) * r * 2.5 + tpl * CFG.TPL_PAGE;
  }

  function calc() {
    var sp = scope(), r = rate(), f = feats(), p = platform(f);

    // часы: на Astro считаем все функции, на Тильде — внешние полностью, штатные с коэффициентом
    function hours(i) {
      return p === 'astro' ? f.h[i] : f.soft[i] + f.nat[i] * CFG.TILDA_K;
    }

    function total(pages, h) {
      var b = baseTilda(sp, r, pages);
      if (p === 'astro') b = Math.max(b * CFG.ASTRO_K, CFG.ASTRO_MIN);
      return b + h * CFG.HOUR;
    }
    var lo = total(sp.n[0], hours(0));
    var hi = total(sp.n[1], hours(1));

    // альтернатива на Astro для сравнения
    var altLo = 0, altHi = 0;
    if (p !== 'astro') {
      altLo = (Math.max(baseTilda(sp, r, sp.n[0]) * CFG.ASTRO_K, CFG.ASTRO_MIN) + f.h[0] * CFG.HOUR);
      altHi = (Math.max(baseTilda(sp, r, sp.n[1]) * CFG.ASTRO_K, CFG.ASTRO_MIN) + f.h[1] * CFG.HOUR);
    }

    if (sp.unsure) { hi *= 1.2; altHi *= 1.2; }

    var main = pair(lo, hi), alt = pair(altLo, altHi);

    return {
      scope: sp, rate: r, f: f, platform: p,
      lo: main[0], hi: main[1],
      altLo: alt[0], altHi: alt[1],
      weeks: weeks(sp, p, sp.n[1], hours(1)),
      altWeeks: weeks(sp, 'astro', sp.n[1], f.h[1])
    };
  }

  // вилка: нижняя граница вниз, верхняя вверх, минимальный разброс 15 %
  function pair(lo, hi) {
    var a = rnd(lo, 0), b = rnd(hi, 1);
    if (a > 0 && b < a * 1.15) b = rnd(a * 1.15, 1);
    return [a, b];
  }

  function rnd(v, up) {
    var s = v < 300000 ? 5000 : 10000;
    return (up ? Math.ceil(v / s) : Math.round(v / s)) * s;
  }

  function weeks(sp, p, pages, h) {
    var astro = p === 'astro', w;
    if (sp.kind === 'landing') w = astro ? 4 : 2;
    else if (sp.kind === 'shop') w = astro ? 10 : 5;
    else if (pages > 12) w = astro ? 10 : 6;
    else w = astro ? 8 : 4;
    if (p === 'module') w += 2;
    w += Math.round((h || 0) / 40);
    return w;
  }

  /* ---------- ТЕКСТЫ РЕШЕНИЯ ---------- */
  var FORMAT_T = { landing: 'Одностраничный сайт', multi: 'Многостраничный сайт', shop: 'Интернет-магазин' };
  var PLATFORM_T = { tilda: 'на Тильде', module: 'на Тильде с внешним модулем', astro: 'на своём коде (Astro)' };

  function reasons(c) {
    var r = [], f = c.f;
    if (c.platform === 'tilda') {
      if (S.a.q_rhythm === 'often') r.push('Вы хотите часто менять контент своими руками — на Тильде это делается без разработчика.');
      r.push('Запуск быстрее и дешевле: от ' + c.weeks + ' недель.');
      r.push('SEO-база закрывается полностью, но потолок оптимизации ниже, чем на своём коде.');
    } else if (c.platform === 'module') {
      var name = f.sel.filter(function (k) { return !FEATURES[k].native; }).map(function (k) { return FEATURES[k].t.toLowerCase(); })[0] || 'нужную функцию';
      r.push('Сайт на Тильде, а ' + name + ' разворачиваем отдельно и подключаем к нему.');
      r.push('Контент остаётся под вашим управлением, кастом — под нашим.');
      r.push('Дешевле полной разработки при том же результате для пользователя.');
    } else {
      var hardNames = f.sel.filter(function (k) { return FEATURES[k].hard; }).map(function (k) { return FEATURES[k].t.toLowerCase(); });
      if (S.a.q_company === 'holding') hardNames.push('требования к своему серверу и коду');
      if (S.a.q_catalog === 'c4') hardNames.push('каталог больше 5 000 позиций');
      if (hardNames.length) r.push(hardNames[0].charAt(0).toUpperCase() + hardNames[0].slice(1) + ' — на конструкторе не делается.');
      r.push('Максимум из технического SEO и скорости загрузки.');
      r.push('Код и сервер ваши, платформа вас ничем не ограничивает.');
    }
    return r;
  }

  function works(c) {
    var w = ['Индивидуальный дизайн', 'Адаптив: десктоп, планшет, смартфон'];
    w.push(c.scope.kind === 'landing'
      ? 'Вёрстка ' + c.scope.n[0] + '–' + c.scope.n[1] + ' экранов'
      : 'Вёрстка ' + c.scope.n[0] + '–' + c.scope.n[1] + ' страниц');
    w.push('Базовая SEO-оптимизация');
    w.push('Формы заявок в Telegram и на почту');
    w.push('Подключение домена и запуск');
    c.f.sel.forEach(function (k) { w.push(FEATURES[k].t); });
    w.push('Обучение работе с сайтом');
    return w;
  }

  function range(a, b) { return a === b ? money(a) : money(a) + ' – ' + money(b); }

  function money(n) { return n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽'; }

  /* ---------- РЕНДЕР ---------- */
  var root, dlg, body;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    root.innerHTML = '';
    if (S.done) return renderResult();
    var q = queue(), id = q[Math.min(S.idx, q.length - 1)];
    if (S.idx >= q.length) { finish(); return; }
    renderQuestion(id, q.length > 1 ? q.length : 6);
  }

  function renderQuestion(id, total) {
    var cfg = Q[id], subs = subsOf(cfg, id);
    var wrap = el('div', 'rq-step');

    var head = el('div', 'rq-head');
    var bar = el('div', 'rq-bar');
    bar.appendChild(el('i', '', ''));
    bar.firstChild.style.width = Math.round((S.idx / total) * 100) + '%';
    head.appendChild(bar);
    wrap.appendChild(head);

    subs.forEach(function (s, si) {
      wrap.appendChild(el('h3', 'rq-q' + (si ? ' rq-q--next' : ''), esc(s.t)));
      if (s.hint) wrap.appendChild(el('p', 'rq-hint', esc(s.hint)));
      var list = el('div', 'rq-opts ' + (s.multi ? 'rq-opts--multi' : 'rq-opts--single'));
      list.setAttribute('role', s.multi ? 'group' : 'radiogroup');
      var picked = S.a[s.id];
      (s.o || []).forEach(function (o) {
        var b = el('button', 'rq-opt');
        b.type = 'button';
        b.setAttribute('data-v', o[0]);
        var on = s.multi ? (picked || []).indexOf(o[0]) > -1 : picked === o[0];
        if (on) b.className += ' is-on';
        b.setAttribute('role', s.multi ? 'checkbox' : 'radio');
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.innerHTML = '<span class="rq-ctrl"></span><span>' + esc(o[1]) + '</span>';
        b.addEventListener('click', function () { pick(s, o[0], id, subs); });
        list.appendChild(b);
      });
      wrap.appendChild(list);
    });

    var nav = el('div', 'rq-nav');
    if (S.idx > 0) {
      var back = el('button', 'rq-back', 'Назад');
      back.type = 'button';
      back.addEventListener('click', function () { S.idx--; ym('quiz_back', { back_from: id }); save(); render(); scrollTop(); });
      nav.appendChild(back);
    }
    if (cfg.multi && ready(subs)) {
      var next = el('button', 'rq-next', 'Далее');
      next.type = 'button';
      next.addEventListener('click', function () { step(id); });
      nav.appendChild(next);
    }
    wrap.appendChild(nav);
    root.appendChild(wrap);
  }

  function ready(subs) {
    return subs.every(function (s) {
      var v = S.a[s.id];
      return v != null && (!Array.isArray(v) || v.length > 0);
    });
  }

  function pick(sub, val, stepId, subs) {
    if (!S.started) { S.started = true; ym('quiz_start'); }
    var id = sub.id;
    if (sub.multi) {
      var arr = S.a[id] ? S.a[id].slice() : [];
      var solo = val === 'none' || val === 'f';
      if (solo) arr = arr.indexOf(val) > -1 ? [] : [val];
      else {
        arr = arr.filter(function (x) { return x !== 'none' && x !== 'f'; });
        var i = arr.indexOf(val);
        if (i > -1) arr.splice(i, 1); else arr.push(val);
      }
      S.a[id] = arr;
      if (id === 'q_task') { delete S.a.q_sections; delete S.a.q_catalog; }
      save(); render();
      return;
    }
    S.a[id] = val;
    save();
    if (ready(subs)) setTimeout(function () { step(stepId); }, 180);
    else render();
  }

  var t0 = Date.now();
  function step(id) {
    if (!ready(subsOf(Q[id], id))) return;
    var n = S.idx + 1, sec = Math.round((Date.now() - t0) / 1000);
    if (n > S.max) S.max = n;
    ym('quiz_step_' + n, { max_step: S.max, last_q: id, ['t_' + id]: sec });
    S.idx++;
    save();
    var q = queue();
    if (S.idx >= q.length) finish(); else { render(); scrollTop(); }
  }

  function finish() {
    S.done = true; save();
    render(); scrollTop();
  }

  function scrollTop() {
    t0 = Date.now();
    if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- РЕЗУЛЬТАТ ---------- */
  function renderResult() {
    var free = has('f');
    var c = free ? null : calc();
    var wrap = el('div', 'rq-result');

    if (free) {
      wrap.appendChild(el('h3', 'rq-q', 'Задача нетиповая — посчитаем лично'));
      wrap.appendChild(el('p', 'rq-lead', 'Шаблонный расчёт тут ничего не даст. Напишите, в двух словах, что нужно — разберём задачу и назовём цифру.'));
      ym('quiz_result', { task: 'other' });
    } else {
      wrap.appendChild(el('h3', 'rq-q', esc(FORMAT_T[c.scope.kind] + ' ' + PLATFORM_T[c.platform])));

      var ul = el('ul', 'rq-why');
      reasons(c).forEach(function (t) { ul.appendChild(el('li', '', esc(t))); });
      wrap.appendChild(ul);

      var price = el('div', 'rq-price');
      price.appendChild(el('div', 'rq-num', range(c.lo, c.hi)));
      price.appendChild(el('div', 'rq-term', 'Срок: от ' + c.weeks + ' недель'));
      wrap.appendChild(price);

      var cols = el('div', 'rq-cols');
      var w = el('div', 'rq-works');
      var wl = el('ol', '');
      works(c).forEach(function (t) { wl.appendChild(el('li', '', esc(t))); });
      w.appendChild(wl);
      cols.appendChild(w);

      var showAlt = c.platform !== 'astro' && S.a.q_rhythm !== 'often' &&
        S.a.q_company !== 'ip' && S.a.q_company !== 'u20' && c.altHi > c.hi;
      if (showAlt) {
        var alt = el('div', 'rq-alt');
        alt.appendChild(el('h3', 'rq-q', 'Альтернатива: на своём коде'));
        alt.appendChild(el('div', 'rq-num', range(c.altLo, c.altHi)));
        alt.appendChild(el('div', 'rq-term', 'Срок: от ' + c.altWeeks + ' недель'));
        alt.appendChild(el('p', '', 'Дороже и дольше, зато максимальная скорость загрузки, потолок по SEO выше, код и сервер ваши, любой функционал возможен.'));
        cols.appendChild(alt);
      }
      wrap.appendChild(cols);

      wrap.appendChild(el('p', 'rq-disc', 'Это ориентир по похожим проектам. Точная смета — после обсуждения задачи и технического задания. Цена может измениться в обе стороны.'));

      ym('quiz_result', {
        task: (S.a.q_task || []).join('+'), company: S.a.q_company,
        format: c.scope.kind, platform: c.platform, min: c.lo, max: c.hi
      });
    }

    var bonus = el('div', 'rq-bonus');
    bonus.appendChild(el('p', '', 'Бесплатная консультация 30 минут'));
    bonus.appendChild(el('p', '', 'Разберём задачу и отдадим структуру будущего сайта — даже если работать будете не с нами.'));
    var btns = el('div', 'rq-btns');
    [['tg', 'написать в Telegram', 'quiz_tg'], ['max', 'написать в MAX', 'quiz_max']].forEach(function (b) {
      var a = el('a', 'rq-btn', esc(b[1]));
      a.href = CFG.LINKS[b[0]];
      a.target = '_blank';
      a.rel = 'noopener';
      a.addEventListener('click', function () { ym(b[2], { contact: b[0] }); });
      btns.appendChild(a);
    });
    bonus.appendChild(btns);
    wrap.appendChild(bonus);

    var again = el('button', 'rq-again', 'Пройти заново');
    again.type = 'button';
    again.addEventListener('click', function () { reset(); render(); scrollTop(); });
    wrap.appendChild(again);

    root.appendChild(wrap);
  }

  /* ---------- КЛАВИАТУРА ---------- */
  function keys(e) {
    if (S.done || !dlg || !dlg.open) return;
    var q = queue(), id = q[Math.min(S.idx, q.length - 1)], cfg = Q[id];
    if (!cfg) return;
    var subs = subsOf(cfg, id);
    var sub = subs.filter(function (s) { return S.a[s.id] == null; })[0] || subs[subs.length - 1];
    if (e.key === 'Enter') { step(id); return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9 && sub.o && sub.o[n - 1]) pick(sub, sub.o[n - 1][0], id, subs);
  }

  /* ---------- СТАРТ ---------- */
  function init() {
    root = document.getElementById('rq');
    if (!root) return;
    root.className = 'rq';
    dlg = el('dialog', 'rq-dlg');
    dlg.tabIndex = -1;
    dlg.setAttribute('aria-label', 'Расчёт стоимости сайта');
    var x = el('button', 'rq-x', '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2" fill="none"/></svg>');
    x.type = 'button';
    x.setAttribute('aria-label', 'Закрыть');
    x.addEventListener('click', function () { dlg.close(); });
    body = el('div', 'rq-body');
    body.appendChild(root);
    dlg.appendChild(x);
    dlg.appendChild(body);
    document.body.appendChild(dlg);
    // закрытие по клику на фон (не срабатывает при выделении текста с уходом за край)
    var down;
    dlg.addEventListener('pointerdown', function (e) { down = e.target; });
    dlg.addEventListener('click', function (e) { if (e.target === dlg && down === dlg) dlg.close(); });
    // триггер: любая ссылка #quiz
    window.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href$="#quiz"]');
      if (!a) return;
      e.preventDefault(); e.stopPropagation();
      open();
    }, true);
    document.addEventListener('keydown', keys);
    if (location.hash === '#quiz') open();
  }

  function open() {
    reset(); render();
    dlg.showModal();
    dlg.focus();
    body.scrollTop = 0;
    t0 = Date.now();
    ym('quiz_view');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
