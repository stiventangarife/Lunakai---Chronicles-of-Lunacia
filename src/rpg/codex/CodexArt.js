// CodexArt.js — Hito 126 · Diagramas del Códice dibujados en SVG (sin imágenes que descargar, traducibles).
//   loop     → el bucle del juego (explorar → combatir → botín → mejorar → Koliseo)
//   triangle → ventaja de clase: Asalto → Bastión → Torrente → Asalto (+15 % de daño)
//   currencies → las cuatro monedas (oro, SLP, AXS, bAXS)
// Colores del sistema de diseño (variables CSS); los textos salen de i18n (codex.art.*).

import { asset, curIcon } from '../../ui/lk.js';
import * as i18n from '../../i18n/i18n.js';

const ICO = (n) => asset(`assets/ui/icons/${n}.png`);

const t = (k) => i18n.t(`codex.art.${k}`);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const INK = '#2B2416', GILT = '#9D7A42', SOFT = 'rgba(157,122,66,.18)';

/** Etiqueta con fondo de papel: las flechas del círculo pasan por detrás y no la tapan. */
function label(text, angle) {
  const w = Math.round(String(text).length * 8.6 + 18);
  // los nodos de los lados (±0°/180°) llevan la etiqueta debajo y hacia fuera del círculo
  const dx = angle === 0 ? 16 : angle === 180 ? -16 : 0;
  return `<g transform="translate(${dx} 58)"><rect x="${-w / 2}" y="-15" width="${w}" height="22" rx="11" fill="#FBF3E4" stroke="rgba(157,122,66,.35)" stroke-width="1"/>
    <text y="1" text-anchor="middle" font-size="14.5" font-weight="800" fill="${INK}">${esc(text)}</text></g>`;
}

function loop() {
  // 4 estaciones en círculo + rama al Koliseo
  const cx = 195, cy = 200, r = 118;
  const st = [
    { k: 'explore', a: -90, ico: 'map' },
    { k: 'fight', a: 0, ico: 'swords' },
    { k: 'loot', a: 90, ico: 'gift' },
    { k: 'improve', a: 180, ico: 'upgrade' },
  ].map((s) => ({ ...s, x: cx + r * Math.cos((s.a * Math.PI) / 180), y: cy + r * Math.sin((s.a * Math.PI) / 180) }));
  const arc = (a0, a1) => {
    const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0 + 22), [x1, y1] = p(a1 - 22);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${GILT}" stroke-width="3" marker-end="url(#cdxArrow)"/>`;
  };
  return `<svg viewBox="0 0 500 420" role="img" aria-label="${esc(t('loopAria'))}">
    <defs><marker id="cdxArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${GILT}"/></marker></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${SOFT}" stroke-width="18"/>
    ${arc(-90, 0)}${arc(0, 90)}${arc(90, 180)}${arc(180, 270)}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="15" font-weight="800" fill="${GILT}" letter-spacing="1.5">${esc(t('loopCenter1'))}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${INK}" opacity=".7">${esc(t('loopCenter2'))}</text>
    ${st.map((s) => `<g transform="translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})">
      <circle r="38" fill="#2B3350" stroke="${GILT}" stroke-width="2.5"/>
      <image href="${ICO(s.ico)}" x="-20" y="-20" width="40" height="40"/>
      ${label(t(`loop.${s.k}`), s.a)}
    </g>`).join('')}
    <g transform="translate(440 ${cy})">
      <path d="M-${440 - (cx + r) - 40} 0H-40" stroke="${GILT}" stroke-width="3" stroke-dasharray="6 5" marker-end="url(#cdxArrow)"/>
      <circle r="34" fill="#2B3350" stroke="${GILT}" stroke-width="2.5"/><image href="${ICO('tournament')}" x="-18" y="-18" width="36" height="36"/>
      <text y="54" text-anchor="middle" font-size="14" font-weight="800" fill="${INK}">${esc(t('loop.koliseo'))}</text>
    </g>
  </svg>`;
}

function triangle() {
  const N = [
    { k: 'assault', x: 250, y: 92, col: 'var(--lk-class-beast, #E9A23B)', cls: 'assaultClasses' },
    { k: 'bastion', x: 395, y: 292, col: 'var(--lk-class-plant, #6CC24A)', cls: 'bastionClasses' },
    { k: 'torrent', x: 105, y: 292, col: 'var(--lk-class-aquatic, #3FB6E8)', cls: 'torrentClasses' },
  ];
  const edge = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const x0 = a.x + ux * 58, y0 = a.y + uy * 58, x1 = b.x - ux * 62, y1 = b.y - uy * 62;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return `<path d="M${x0} ${y0}L${x1} ${y1}" stroke="${GILT}" stroke-width="3.5" marker-end="url(#cdxArrow2)"/>
      <g transform="translate(${mx} ${my})"><rect x="-30" y="-14" width="60" height="28" rx="14" fill="#FFF8EA" stroke="${GILT}" stroke-width="1.5"/><text y="5" text-anchor="middle" font-size="14" font-weight="800" fill="#7A4A12">+15 %</text></g>`;
  };
  return `<svg viewBox="0 0 500 420" role="img" aria-label="${esc(t('triangleAria'))}">
    <defs><marker id="cdxArrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${GILT}"/></marker></defs>
    ${edge(N[0], N[1])}${edge(N[1], N[2])}${edge(N[2], N[0])}
    ${N.map((n) => `<g transform="translate(${n.x} ${n.y})">
      <circle r="52" fill="#FFF8EA" stroke="${n.col}" stroke-width="6"/>
      <text y="6" text-anchor="middle" font-size="18" font-weight="800" fill="${INK}">${esc(t(n.k))}</text>
      <text y="${n.y < 200 ? -66 : 76}" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}" opacity=".75">${esc(t(n.cls))}</text>
    </g>`).join('')}
    <text x="250" y="408" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}" opacity=".75">${esc(t('triangleNote'))}</text>
  </svg>`;
}

function currencies() {
  const C = [
    { k: 'gold', x: 125, y: 110 },
    { k: 'slp', x: 375, y: 110 },
    { k: 'axs', x: 125, y: 300 },
    { k: 'baxs', x: 375, y: 300 },
  ];
  return `<svg viewBox="0 0 500 420" role="img" aria-label="${esc(t('currenciesAria'))}">
    ${C.map((c) => `<g transform="translate(${c.x} ${c.y})">
      <circle r="50" fill="#2B3350" stroke="${GILT}" stroke-width="2.5"/>
      <image href="${curIcon(c.k)}" x="-34" y="-34" width="68" height="68"/>
      <text y="76" text-anchor="middle" font-size="17" font-weight="800" fill="${INK}">${esc(t(`cur.${c.k}`))}</text>
      <text y="96" text-anchor="middle" font-size="12.5" font-weight="700" fill="${INK}" opacity=".75">${esc(t(`cur.${c.k}Sub`))}</text>
    </g>`).join('')}
  </svg>`;
}

const ART = { loop, triangle, currencies };
export function codexArt(id) { return ART[id] ? ART[id]() : ''; }
