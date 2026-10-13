// Иллюстрации блога: SVG 240×180 (в тексте поста — 240×135, ключи в W16), тонкие линии (.ln — прорисовка, .b — плотнее), точечная сетка — фон .bl-ill (blog.css).
const P = 'pathLength="1"';
const ILL: Record<string, string> = {
  goals: `<circle class="ln" ${P} cx="120" cy="90" r="64"/><circle class="ln" ${P} cx="120" cy="90" r="44"/><circle class="ln" ${P} cx="120" cy="90" r="24"/><circle class="fl" cx="120" cy="90" r="3"/>${
    [...Array(7)].map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 7, x = Math.round(120 + 82 * Math.cos(a)), y = Math.round(90 + 82 * Math.sin(a)); return `<rect class="ln" ${P} x="${x - 5}" y="${y - 5}" width="10" height="10"/><text class="lb" x="${x + 8}" y="${y + 3}">0${i + 1}</text>`; }).join('')
  }<path class="ln b" ${P} d="M214 14 123 87"/><path class="ln" ${P} d="M214 14l-6 1M214 14l-1 6M206 20l-6 1M206 20l-1 6"/>`,
  diary: `<rect class="ln" ${P} x="30" y="28" width="96" height="128"/><path class="ln" ${P} d="M44 28v128"/>${
    [52, 70, 88, 106, 124, 142].map((y) => `<path class="ln" ${P} d="M52 ${y}h62"/>`).join('')
  }<text class="lb" x="100" y="49">5</text><rect class="ln" ${P} x="140" y="56" width="78" height="44"/><path class="ln" ${P} d="M150 100l-6 12 18-12"/><path class="ln" ${P} d="M150 70h56M150 80h40M150 90h48"/><text class="lb" x="140" y="124">08:30 · ОЦЕНКА</text>`,
  flats: `<rect class="ln" ${P} x="24" y="42" width="84" height="116"/>${
    [0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => `<rect class="ln" ${P} x="${34 + c * 24}" y="${54 + r * 24}" width="14" height="14"/>`).join('')).join('')
  }<path class="ln" ${P} d="M60 158v-20h12v20"/><circle class="ln b" ${P} cx="166" cy="78" r="34"/><path class="ln b" ${P} d="M190 102l26 26"/><path class="ln" ${P} d="M150 86v-14l16-12 16 12v14z"/><text class="lb" x="146" y="38">NEW · 2 МИН НАЗАД</text><path class="ln" ${P} d="M8 158h224"/>`,
  tg: `${
    [[40, 50], [100, 30], [170, 48], [70, 120], [140, 110], [205, 130]].map(([x, y]) => `<circle class="ln" ${P} cx="${x}" cy="${y}" r="9"/>`).join('')
  }<path class="ln" ${P} d="M48 46l44-12M108 33l54 13M45 58l20 54M78 118l53-6M148 107l50 19M165 56l-20 46M100 39l-26 72"/><rect class="ln" ${P} x="112" y="140" width="96" height="28"/><path class="ln" ${P} d="M122 154h60"/><text class="lb" x="20" y="164">GRAPH / 6 NODES</text>`,
  rewrite: `<rect class="ln" ${P} x="24" y="30" width="78" height="112"/>${
    [46, 58, 70, 82, 94, 106, 118].map((y) => `<path class="ln" ${P} d="M34 ${y}h${y % 24 ? 56 : 42}"/>`).join('')
  }<rect class="ln" ${P} x="140" y="44" width="78" height="112"/>${
    [60, 72, 84, 96, 108, 120, 132].map((y) => `<path class="ln" ${P} d="M150 ${y}h${y % 24 ? 44 : 58}"/>`).join('')
  }<path class="ln b" ${P} d="M104 86c14-18 24-18 34 0"/><path class="ln" ${P} d="M138 86l-7-2M138 86l1-7"/><text class="lb" x="24" y="160">RU → TEXT V2 → PUBLISH</text>`,
  // Menteora: обложка — три шкалы 1–7 → ступени ограничения 0–5
  menteora: `${
    [['МЫШЦЫ', 30, 4], ['ГОЛОВА', 62, 4], ['ДЕЛА', 94, 5]].map(([t, x, v]) => `<path class="ln" ${P} d="M${x} 44V140${[...Array(7)].map((_, i) => `M${+x - 3} ${140 - i * 16}h6`).join('')}"/><circle class="fl" cx="${x}" cy="${140 - (+v - 1) * 16}" r="3"/><text class="lb" x="${x}" y="156" text-anchor="middle">${t}</text>`).join('')
  }<text class="lb" x="18" y="30">ШКАЛА 1–7</text><path class="ln b" ${P} d="M110 92h18M128 92l-5-3M128 92l-5 3"/><path class="ln" ${P} d="M136 50h15v18h15v18h15v18h15v18h15v18h15"/>${
    [...Array(6)].map((_, i) => `<text class="lb" x="${143.5 + i * 15}" y="${46 + i * 18}" text-anchor="middle">${i}</text>`).join('')
  }<path class="ln b" ${P} d="M196 122h15"/><path class="ln" ${P} d="M203.5 124v26"/><text class="lb" x="136" y="30">УРОВЕНЬ 0–5</text><text class="lb" x="224" y="160" text-anchor="end">ТОЛЬКО БАЗА</text>`,

  // Рис. 1: один ресурс, два расхода; часы видят только тренировку
  'mt-load': `<text class="lb" x="120" y="14" text-anchor="middle">РЕСУРС ВОССТАНОВЛЕНИЯ</text><rect class="ln" ${P} x="94" y="20" width="52" height="58"/><path class="ln" ${P} d="M94 46h52M94 54h52M94 62h52M94 70h52"/><path class="ln b" ${P} d="M108 78v22H62M62 100l5-3M62 100l5 3M132 78v22h58M190 100l-5-3M190 100l-5 3"/><text class="lb" x="58" y="102.5" text-anchor="end">ТРЕНИРОВКА</text><text class="lb" x="194" y="102.5">СТРЕСС</text><rect class="ln" ${P} x="14" y="24" width="40" height="22"/><text class="lb" x="34" y="37.5" text-anchor="middle">ЧАСЫ</text><path class="d" d="M34 46l44 50"/><text class="lb" x="58" y="122">ВИДНО ЧАСАМ</text><text class="lb" x="226" y="122" text-anchor="end">ЧАСЫ НЕ ВИДЯТ</text><text class="lb" x="226" y="34" text-anchor="end">ДЕДЛАЙН</text><text class="lb" x="226" y="44" text-anchor="end">НЕРВЫ</text><path class="ln" ${P} d="M208 50l-10 42M198 92l-2-6M198 92l3-5"/>`,

  // Рис. 2: пять ответов с весами → MRI → зона
  'mt-mri': `${
    [['САМОЧУВСТВИЕ', 30], ['СОН', 30], ['МОТИВАЦИЯ', 20], ['СТРЕСС', 10], ['БОЛЬ', 10]].map(([t, w], i) => { const y = 14 + i * 15, e = 72 + +w * 2; return `<text class="lb" x="66" y="${y + 7}" text-anchor="end">${t}</text><rect class="ln" ${P} x="72" y="${y}" width="${+w * 2}" height="9"/><text class="lb" x="75" y="${y + 7}">${w}%</text><path class="ln" ${P} d="M${e} ${y + 4.5}L177 50"/>`; }).join('')
  }<circle class="ln b" ${P} cx="190" cy="50" r="13"/><text class="lb" x="190" y="52.5" text-anchor="middle">MRI</text><text class="lb" x="190" y="74" text-anchor="middle">1–10</text><path class="ln" ${P} d="M190 78v22M190 100l-3-5M190 100l3-5"/><path class="ln" ${P} d="M16 104h208v10H16zM85 104v10M155 104v10"/><text class="lb" x="50" y="126" text-anchor="middle">КРАСНАЯ</text><text class="lb" x="120" y="126" text-anchor="middle">ЖЁЛТАЯ</text><text class="lb" x="190" y="126" text-anchor="middle">ЗЕЛЁНАЯ</text>`,

  // Рис. 3: замкнутый круг обучения
  'mt-loop': `<ellipse class="ln" ${P} cx="120" cy="68" rx="74" ry="45"/><path class="ln b" ${P} d="M191 62l3 6 3-6M43 74l3-6 3 6"/>${
    [['MRI', 120, 23], ['ЗОНА', 184, 45.5], ['СОВЕТ', 184, 90.5], ['ПОЛЕЗНО?', 120, 113], ['МОДЕЛЬ', 56, 90.5], ['ВЕСА', 56, 45.5]].map(([t, x, y]) => `<rect class="ln bx" ${P} x="${+x - 22}" y="${+y - 7}" width="44" height="14"/><text class="lb" x="${x}" y="${+y + 2.5}" text-anchor="middle">${t}</text>`).join('')
  }<text class="lb" x="120" y="74" text-anchor="middle">5 ОТВЕТОВ</text><path class="ln" ${P} d="M120 66V31M120 31l-3 5M120 31l3 5"/>`,

  // Рис. 4: факт против почти плоского прогноза
  'mt-flat': `<path class="ln" ${P} d="M24 14V112H228"/><text class="lb" x="20" y="18" text-anchor="end">MRI</text><text class="lb" x="228" y="124" text-anchor="end">ДНИ</text><path class="d" d="M24 40H228M24 76H228"/><text class="lb" x="226" y="37" text-anchor="end">ЗОНА 3 БАЛЛА</text><path class="ln b" ${P} d="M${[58, 57, 59, 58, 57, 58, 59, 57, 58, 58, 59, 58, 57, 58].map((y, i) => `${30 + i * 14} ${y}`).join('L')}"/><path class="ln" ${P} d="M${[57, 45, 66, 53, 81, 50, 36, 59, 95, 64, 47, 69, 40, 54].map((y, i) => `${30 + i * 14} ${y}`).join('L')}"/><circle class="fl" cx="142" cy="95" r="2.5"/><text class="lb" x="148" y="100">ТЯЖЁЛЫЙ ДЕНЬ</text><path class="ln" ${P} d="M100 10h10"/><text class="lb" x="113" y="12.5">ФАКТ</text><path class="ln b" ${P} d="M140 10h10"/><text class="lb" x="153" y="12.5">ПРОГНОЗ</text>`,

  // Рис. 5: разный фон, общий порог
  'mt-people': [[[2, 4, 2, 3, 5, 2, 1, 4, 3, 2, 5, 2, 3, 2, 4, 1, 3, 2, 3, 2, 4, 2, 3, 4], 54, 'ФОН ×1', 'НЕ СРАБАТЫВАЕТ НИКОГДА'], [[26, 12, 30, 16, 24, 10, 28, 22, 14, 32, 18, 26, 12, 24, 30, 14, 22, 16, 28, 12, 26, 18, 32, 14], 114, 'ФОН ×8', 'СРАБАТЫВАЕТ ЧЕРЕЗ ДЕНЬ']].map(([h, b, t, n]) => `<text class="lb" x="6" y="${+b - 2}">${t}</text><path class="ln" ${P} d="M40 ${b}H226"/><path class="d" d="M40 ${+b - 20}H226"/><text class="lb" x="6" y="${+b - 18}">ПОРОГ</text>${
    (h as number[]).map((v, i) => `<path class="ln${v > 20 ? ' b' : ''}" ${P} d="M${44 + i * 7.6} ${b}v-${v}"/>`).join('')}<text class="lb" x="40" y="${+b + 10}">${n}</text>`).join(''),

  // Рис. 6: 10 замеров по общей шкале → личная норма
  'mt-norm': `<path class="ln" ${P} d="M16 100H224"/><path class="d" d="M20 42H222"/><text class="lb" x="22" y="38">ОБЩИЙ ПОРОГ</text>${
    [70, 58, 82, 64, 76, 52, 68, 80, 60, 72].map((y, i) => `<circle class="ln" ${P} cx="${24 + i * 14}" cy="${y}" r="2.2"/>`).join('')
  }<rect class="ln" ${P} x="157" y="60" width="62" height="16"/><path class="ln" ${P} d="M157 64l4-4M157 72l12-12M163 76l16-16M173 76l16-16M183 76l16-16M193 76l16-16M203 76l16-16M213 76l6-6"/><text class="lb" x="157" y="55">ВАША НОРМА</text>${
    [70, 66, 68].map((y, i) => `<circle class="ln bx" ${P} cx="${164 + i * 14}" cy="${y}" r="2.2"/>`).join('')
  }<circle class="fl" cx="206" cy="50" r="3"/><path class="ln" ${P} d="M206 59v-5"/><text class="lb" x="222" y="30" text-anchor="end">СЕГОДНЯ ХУЖЕ НОРМЫ: +1 СТУПЕНЬ</text><path class="ln" ${P} d="M24 108v4H150v-4M157 108v4H219v-4"/><text class="lb" x="87" y="124" text-anchor="middle">10 ЗАМЕРОВ · ОБЩАЯ ШКАЛА</text><text class="lb" x="188" y="124" text-anchor="middle">ЛИЧНАЯ</text>`,
};

const W16 = /^mt-/;
export const ill = (k: string) => `<svg viewBox="0 0 240 ${W16.test(k) ? 135 : 180}" aria-hidden="true">${ILL[k] ?? ''}</svg>`;
