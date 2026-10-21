// MaterialIcons.js — Dibujos (SVG en línea) de los materiales: la Forja, la Mochila, la Tienda, las misiones y el botín.
// Cada material de EconomyCatalog.MATERIALS tiene un `glyph`; matSvg(glyph) devuelve su <svg> (color = currentColor).

const GLYPH = {
  slime: '<path d="M4 18c0-6 3.5-11 8-11s8 5 8 11z"/><path d="M4 18h16"/><circle cx="9.5" cy="13" r="1"/><circle cx="14.5" cy="13" r="1"/><path d="M12 4c1 1 1 2 0 3"/>',
  tail: '<path d="M4 6c6 0 10 3 10 8 0 3-2 5-4 5"/><path d="M10 19l-2 2M10 19l-3-1"/><path d="M14 14c2-1 4-1 6 1-2 0-3 1-4 3"/>',
  fang: '<path d="M7 3c-1 6 0 12 3 18 1-6 1-12 0-18z"/><path d="M14 3c-1 5 0 10 2 15 1-5 1-10 0-15z"/>',
  wool: '<circle cx="9" cy="10" r="4"/><circle cx="15" cy="10" r="4"/><circle cx="12" cy="15" r="4.5"/><path d="M8 20h8"/>',
  branch: '<path d="M5 20L18 5"/><path d="M10 14c-2-1-4-1-5 0M13 11c1-2 1-4 0-5M15 8c2 0 3 1 4 2"/><circle cx="18.5" cy="4.5" r="1.2"/>',
  staff: '<path d="M7 21L16 8"/><circle cx="17.5" cy="6" r="3"/><path d="M15 3.5l-1-1M20 3.5l1-1M21 8l1 .5"/>',
  bamboo: '<path d="M8 3v18M15 3v18"/><path d="M6.5 8h3M6.5 14h3M13.5 6h3M13.5 12h3M13.5 18h3"/><path d="M15 9c2-1 4-1 5 0M8 11c-2-1-4-1-5 0"/>',
  fiber: '<path d="M5 3c4 3-2 6 2 9s-2 6 2 9"/><path d="M11 3c4 3-2 6 2 9s-2 6 2 9"/><path d="M17 3c4 3-2 6 2 9"/>',
  resin: '<path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  hide: '<path d="M7 4c1 1 2 1 5 1s4 0 5-1l2 3-1 3 1 4-2 3 1 3H6l1-3-2-3 1-4-1-3z"/>',
  ingot: '<path d="M3 16l3-7h12l3 7z"/><path d="M6 9l2-3h8l2 3"/><path d="M3 16h18v3H3z"/>',
  crystal: '<path d="M12 2l5 6-5 14-5-14z"/><path d="M7 8h10M12 2v20"/>',
  dust: '<path d="M12 4l1.5 3.5L17 9l-3.5 1.5L12 14l-1.5-3.5L7 9l3.5-1.5z"/><circle cx="6" cy="17" r="1.3"/><circle cx="17" cy="17" r="1.8"/><circle cx="11" cy="20" r="1"/>',
  spool: '<path d="M7 4h10M7 20h10"/><path d="M8 4v16M16 4v16"/><path d="M8 8l8 3M8 12l8 3M8 16l8 2"/>',
  gem: '<path d="M6 4h12l4 6-10 11L2 10z"/><path d="M2 10h20M9 4l3 6 3-6M12 10v11"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5"/>',
  shard: '<path d="M14 3a8 8 0 1 0 7 11A7 7 0 0 1 14 3z"/><path d="M9 9l3 3-2 4"/>',
  log: '<ellipse cx="17" cy="12" rx="3.5" ry="6"/><path d="M17 6H7a3.5 6 0 0 0 0 12h10"/><path d="M17 10.5a1.5 1.5 0 1 1 0 3"/>',
  fish: '<path d="M3 12c3-5 9-6 13-3l5-3-1.5 6L21 18l-5-3c-4 3-10 2-13-3z"/><circle cx="8" cy="11" r="0.8"/>',
  flower: '<circle cx="12" cy="9" r="2"/><path d="M12 7c-1-3 2-4 2-1M14 9c3-1 4 2 1 2M12 11c1 3-2 4-2 1M10 9c-3 1-4-2-1-2"/><path d="M12 11v10M12 17c-2-2-4-2-5-1M12 15c2-2 4-2 5-1"/>',
};

export const MATERIAL_GLYPHS = Object.keys(GLYPH);
/** Icono de un material: su imagen (assets/materials) si la tiene, si no el dibujo SVG. `px` = lado en píxeles (sin `px`, llena su caja). */
export const matIcon = (m, px = 0) => (m?.icon
  ? `<img class="lk-mat-img" src="${m.icon}" alt="" draggable="false" style="${px ? `width:${px}px;height:${px}px;` : 'width:100%;height:100%;'}object-fit:contain">`
  : matSvg(m?.glyph, ''));
export const matSvg = (g, cls = 'lk-mat-ico') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[g] || GLYPH.gem}</svg>`;
