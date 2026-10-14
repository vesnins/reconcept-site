// Иллюстрации блога: SVG 240×180, тонкие линии (.ln — прорисовка, .b — плотнее), точечная сетка — фон .bl-ill (blog.css).
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
  mentor: `${
    [[40, 50], [100, 30], [170, 48], [70, 120], [140, 110], [205, 130]].map(([x, y]) => `<circle class="ln" ${P} cx="${x}" cy="${y}" r="9"/>`).join('')
  }<path class="ln" ${P} d="M48 46l44-12M108 33l54 13M45 58l20 54M78 118l53-6M148 107l50 19M165 56l-20 46M100 39l-26 72"/><rect class="ln" ${P} x="112" y="140" width="96" height="28"/><path class="ln" ${P} d="M122 154h60"/><text class="lb" x="20" y="164">GRAPH / 6 NODES</text>`,
  rewrite: `<rect class="ln" ${P} x="24" y="30" width="78" height="112"/>${
    [46, 58, 70, 82, 94, 106, 118].map((y) => `<path class="ln" ${P} d="M34 ${y}h${y % 24 ? 56 : 42}"/>`).join('')
  }<rect class="ln" ${P} x="140" y="44" width="78" height="112"/>${
    [60, 72, 84, 96, 108, 120, 132].map((y) => `<path class="ln" ${P} d="M150 ${y}h${y % 24 ? 44 : 58}"/>`).join('')
  }<path class="ln b" ${P} d="M104 86c14-18 24-18 34 0"/><path class="ln" ${P} d="M138 86l-7-2M138 86l1-7"/><text class="lb" x="24" y="160">RU → TEXT V2 → PUBLISH</text>`,
};

// Спиральные портреты: готовый SVG из public/blog (генератор — scripts/spiral-svg.mjs), обрезка object-fit: cover.
const SP = new Set(['menteora', 'menteora-cam', 'sevengoals', 'sevengoals-in', 'esdnevnik', 'esdnevnik-in', 'halo-oglasi', 'halo-oglasi-in']);
export const ill = (k: string) => SP.has(k) ? `<img class="sp" src="/blog/${k}.svg" alt="" decoding="async">` : `<svg viewBox="0 0 240 180" aria-hidden="true">${ILL[k] ?? ''}</svg>`;
