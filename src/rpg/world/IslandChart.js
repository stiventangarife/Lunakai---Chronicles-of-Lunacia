// IslandChart.js — Mapa de la isla actual como «Carta del cartógrafo» (Crónica Celeste, pantalla 23).
//
// · Terreno real: al abrir el mapa en una isla se hace UNA captura cenital ortográfica del escenario 3D
//   (sin jugador, NPC, enemigos, partículas ni niebla) y se guarda en caché por isla.
// · Tratamiento de carta: la captura se tiñe a tonos de pergamino con filtros SVG, se detecta la costa
//   (tierra frente a agua) para entintarla y el mar recibe oleaje dibujado.
// · Marcas con jerarquía: tú (lumen + cono de visión) › destino seguido (dorado que late + ruta) › NPC
//   (! / ?) › lugares (rombos) › barquero › quimeras cercanas.
// · Niebla: lo no explorado queda como papel en blanco; se descubre al recorrerlo (radio ~30 m).
//   El registro se guarda por isla en localStorage (lk_explored_<isla>).
// · Zoom con la rueda hacia el cursor, arrastre, capas, tooltip y «seguir» un lugar.

import * as THREE from 'three';
import { ISLANDS_REGISTRY } from './MapRegistry.js';
import { FERRY_NPC_ID } from './islands/IslandWorldLayout.js';

const NS = 'http://www.w3.org/2000/svg';
const HALF = 240;            // todas las islas miden 480 × 480 m, centradas en el origen
const CAPTURE_PX = 1536;     // resolución de la captura cenital
const FOG_N = 64;            // rejilla de exploración (64 × 64 celdas de 7,5 m)
const FOG_R = 30;            // radio descubierto alrededor del jugador (m)
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };

const GLYPH = {
  place: '<path d="M12 3l7 7-7 11-7-11z"/><circle cx="12" cy="10" r="2.4"/>',
  ferry: '<path d="M12 3v11M12 4l6 8h-6M4 15h16l-2 4H6z"/>',
  talk: '<path d="M5 6h14v9H10l-4 3v-3H5z"/>'
};
const ICON_SVG = (k, color = 'currentColor') => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k] || GLYPH.place}</svg>`;

export const currentIslandKey = () => Object.values(ISLANDS_REGISTRY).find((i) => i && i.isCurrent)?.id || 'island_forest';

/* ─────────────────────────── Exploración (niebla) ─────────────────────────── */
const explored = new Map(); // islandKey → Uint8Array(FOG_N*FOG_N)
function fogGrid(key) {
  if (!explored.has(key)) {
    let g = new Uint8Array(FOG_N * FOG_N);
    try { const raw = localStorage.getItem('lk_explored_' + key); if (raw) { const a = atob(raw); for (let i = 0; i < a.length && i < g.length; i++) g[i] = a.charCodeAt(i); } } catch { /* sin almacenamiento */ }
    explored.set(key, g);
  }
  return explored.get(key);
}
function saveFog(key) {
  try { const g = explored.get(key); if (!g) return; let s = ''; for (let i = 0; i < g.length; i++) s += String.fromCharCode(g[i]); localStorage.setItem('lk_explored_' + key, btoa(s)); } catch { /* sin almacenamiento */ }
}
function reveal(key, x, z, r = FOG_R) {
  const g = fogGrid(key); const cell = (HALF * 2) / FOG_N; let changed = false;
  const c0 = Math.floor((x - r + HALF) / cell), c1 = Math.floor((x + r + HALF) / cell);
  const r0 = Math.floor((z - r + HALF) / cell), r1 = Math.floor((z + r + HALF) / cell);
  for (let rr = Math.max(0, r0); rr <= Math.min(FOG_N - 1, r1); rr++) {
    for (let cc = Math.max(0, c0); cc <= Math.min(FOG_N - 1, c1); cc++) {
      const cx = -HALF + (cc + .5) * cell, cz = -HALF + (rr + .5) * cell;
      if (Math.hypot(cx - x, cz - z) <= r && !g[rr * FOG_N + cc]) { g[rr * FOG_N + cc] = 1; changed = true; }
    }
  }
  return changed;
}
export function exploredPct(key) { const g = fogGrid(key); let n = 0; for (let i = 0; i < g.length; i++) n += g[i]; return n / g.length; }

let tracking = null;
/** Registra lo explorado mientras se juega (cada 0,5 s). Se llama una vez. */
export function startExplorationTracking(om) {
  if (tracking || !om) return;
  let dirty = 0;
  tracking = setInterval(() => {
    const p = om.player?.position;
    if (!p || om.state !== 'EXPLORING') return;
    const key = currentIslandKey();
    if (reveal(key, p.x, p.z)) dirty++;
    if (dirty >= 6) { saveFog(key); dirty = 0; }
  }, 500);
  addEventListener('beforeunload', () => saveFog(currentIslandKey()));
}

/* ─────────────────────────── Captura cenital ─────────────────────────── */
const captures = new Map(); // islandKey → dataURL
export function invalidateCapture(key) { if (key) captures.delete(key); else captures.clear(); }

function captureTerrain(om) {
  const renderer = om?.renderer, scene = om?.scene;
  if (!renderer || !scene) return null;
  const cam = new THREE.OrthographicCamera(-HALF, HALF, HALF, -HALF, 1, 2000);
  cam.position.set(0, 900, 0);
  cam.up.set(0, 0, -1);           // arriba de la imagen = norte (−z)
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);

  // Se ocultan las entidades y efectos que no forman parte del terreno
  const hidden = [];
  const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
  hide(om.player?.group); hide(om.player?.companionGroup);
  (om.npcManager?.npcs || []).forEach((n) => hide(n.group));
  (om.monsters?.monsters || []).forEach((m) => hide(m.group));
  (om.demoScenaZone?.slimeCreaturesManager?.slimes || []).forEach((s) => hide(s.group));
  hide(om.questTargetArrow);
  scene.traverse((o) => { if (o.isSprite || o.isPoints || o.isLine || o.userData?.noMap) hide(o); });
  const fog = scene.fog; scene.fog = null;
  const bg = scene.background;

  const rt = new THREE.WebGLRenderTarget(CAPTURE_PX, CAPTURE_PX, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const prevRT = renderer.getRenderTarget();
  let url = null;
  try {
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, cam);
    const px = new Uint8Array(CAPTURE_PX * CAPTURE_PX * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, CAPTURE_PX, CAPTURE_PX, px);
    const cv = document.createElement('canvas'); cv.width = cv.height = CAPTURE_PX;
    const ctx = cv.getContext('2d'); const img = ctx.createImageData(CAPTURE_PX, CAPTURE_PX);
    const row = CAPTURE_PX * 4;
    for (let y = 0; y < CAPTURE_PX; y++) img.data.set(px.subarray((CAPTURE_PX - 1 - y) * row, (CAPTURE_PX - y) * row), y * row); // WebGL lee de abajo arriba
    ctx.putImageData(img, 0, 0);
    url = cv.toDataURL('image/jpeg', .86);
  } catch (e) {
    console.warn('[IslandChart] No se pudo capturar el terreno:', e);
  } finally {
    renderer.setRenderTarget(prevRT);
    rt.dispose();
    scene.fog = fog; scene.background = bg;
    hidden.forEach((o) => { o.visible = true; });
  }
  return url;
}

/* ─────────────────────────── Carta ─────────────────────────── */
export class IslandChart {
  constructor(host, om) {
    this.host = host;
    this.om = om;
    this.follow = null;          // id de lugar seguido (o null: la misión seguida)
    this.view = { cx: 0, cz: 0, span: HALF * 1.25 }; // centro y ancho visible (m)
    this.layers = { quest: true, npc: true, poi: true, ferry: true, foe: true, fog: true };
    this._build();
    startExplorationTracking(om);
  }

  _build() {
    const h = this.host;
    h.classList.add('lk-chart');
    h.innerHTML = `
      <div class="lk-chart__filters" role="group" aria-label="Capas del mapa">
        <button type="button" data-layer="quest" aria-pressed="true"><i style="--c:var(--lk-gilt-300)"></i>Misión</button>
        <button type="button" data-layer="npc" aria-pressed="true"><i style="--c:#F6C35B"></i>NPC</button>
        <button type="button" data-layer="poi" aria-pressed="true"><i style="--c:#C9A36A"></i>Lugares</button>
        <button type="button" data-layer="ferry" aria-pressed="true"><i style="--c:var(--lk-lumen-300)"></i>Barquero</button>
        <button type="button" data-layer="foe" aria-pressed="true"><i style="--c:var(--lk-enemy-red)"></i>Quimeras</button>
        <button type="button" data-layer="fog" aria-pressed="true" class="lk-chart__fogbtn"><i style="--c:#CFC4AE"></i>Niebla</button>
      </div>
      <div class="lk-chart__frame">
        <svg class="lk-chart__svg" preserveAspectRatio="xMidYMid slice" aria-label="Carta de la isla"></svg>
        <svg class="lk-chart__cartouche" viewBox="0 0 260 50" aria-hidden="true">
          <path d="M0 8 L14 0 H246 L260 8 V42 L246 50 H14 L0 42 Z" fill="#F2EADA" stroke="#9D7A42" stroke-width="1.6"/>
          <path d="M6 10 L16 4 H244 L254 10 V40 L244 46 H16 L6 40 Z" fill="none" stroke="#D3AE6C" stroke-width="1" opacity=".8"/>
          <text x="130" y="26" text-anchor="middle" font-size="19" class="lk-chart__ct" data-ref="ctTitle">Isla</text>
          <text x="130" y="41" text-anchor="middle" font-size="8.5" class="lk-chart__cs" data-ref="ctSub"></text>
        </svg>
        <svg class="lk-chart__compass" viewBox="-50 -62 100 112" aria-hidden="true">
          <circle r="44" fill="#F2EADA" opacity=".7" stroke="#9D7A42" stroke-width="1"/>
          <circle r="36" fill="none" stroke="#9D7A42" stroke-width=".8" stroke-dasharray="1 3"/>
          <path d="M0 -40 L7 -7 L40 0 L7 7 L0 40 L-7 7 L-40 0 L-7 -7 Z" fill="#D3AE6C" stroke="#6B4A2A" stroke-width="1"/>
          <path d="M0 -40 L7 -7 L0 0 Z M40 0 L7 7 L0 0 Z M0 40 L-7 7 L0 0 Z M-40 0 L-7 -7 L0 0 Z" fill="#6B4A2A" opacity=".7"/>
          <text y="-49" text-anchor="middle" font-size="13" class="lk-chart__ct">N</text>
        </svg>
        <div class="lk-chart__scale" aria-hidden="true"><i data-ref="scaleBar"></i><span data-ref="scaleTxt">50 m</span></div>
        <div class="lk-chart__ctrl">
          <button type="button" class="lk-btn-circle-icon" data-act="me" title="Centrar en ti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button>
          <button type="button" class="lk-btn-circle-icon" data-act="in" title="Acercar">+</button>
          <button type="button" class="lk-btn-circle-icon" data-act="out" title="Alejar">−</button>
        </div>
        <div class="lk-chart__legend"><span><i class="lg-you"></i>Tú</span><span><i class="lg-quest"></i>Destino</span><span><i class="lg-poi"></i>Lugar</span><span><i class="lg-npc"></i>NPC</span><span><i class="lg-ferry"></i>Barquero</span></div>
        <div class="lk-chart__loading" data-ref="loading" hidden>Dibujando la carta…</div>
      </div>`;
    this.$ = (r) => h.querySelector(`[data-ref="${r}"]`);
    this.svg = h.querySelector('.lk-chart__svg');
    this.tip = document.createElement('div');
    this.tip.className = 'lk-ui lk-tooltip-float lk-chart__tip';
    document.body.appendChild(this.tip);
    this._buildSvg();
    this._bind();
  }

  _buildSvg() {
    const svg = this.svg;
    const defs = el('defs', {}, svg);
    // Tinte de pergamino + tierra/agua → costa entintada
    defs.innerHTML = `
      <filter id="lkChartInk" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <!-- 1) Tierra frente a agua: (R+G)/2 − B por encima de un umbral -->
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 1.6 -3.4 0 .08" result="landA"/>
        <feComponentTransfer in="landA" result="land"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
        <feGaussianBlur in="land" stdDeviation="1.4" result="landSoft"/>
        <feComponentTransfer in="landSoft" result="landMask"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
        <!-- 2) Pergamino: luminancia → sepia cálida -->
        <feColorMatrix in="SourceGraphic" type="matrix" values=".42 .52 .12 0 .08  .36 .46 .1 0 .06  .24 .32 .08 0 .03  0 0 0 1 0" result="sepia"/>
        <feComponentTransfer in="sepia" result="sepiaC"><feFuncR type="linear" slope="1.08" intercept=".12"/><feFuncG type="linear" slope="1.02" intercept=".1"/><feFuncB type="linear" slope=".9" intercept=".08"/></feComponentTransfer>
        <feComposite in="sepiaC" in2="landMask" operator="in" result="landPaint"/>
        <!-- 3) Costa: contorno de la máscara de tierra -->
        <feMorphology in="landMask" operator="dilate" radius="2.2" result="landBig"/>
        <feComposite in="landBig" in2="landMask" operator="out" result="ring"/>
        <feFlood flood-color="#4E3820" result="ink"/>
        <feComposite in="ink" in2="ring" operator="in" result="coast"/>
        <feMerge><feMergeNode in="landPaint"/><feMergeNode in="coast"/></feMerge>
      </filter>
      <filter id="lkChartWater" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 1.6 -3.4 0 .08" result="landA"/>
        <feComponentTransfer in="landA" result="land"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
        <feMorphology in="land" operator="dilate" radius="5" result="near"/>
        <feMorphology in="land" operator="dilate" radius="11" result="far"/>
        <feComposite in="far" in2="near" operator="out" result="band"/>
        <feFlood flood-color="#5E7F92" flood-opacity=".22"/>
        <feComposite in2="band" operator="in"/>
      </filter>
      <filter id="lkChartPaper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="3"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .33  0 0 0 0 .18  0 0 0 .18 0"/></filter>
      <filter id="lkChartFogEdge" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="6"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="18"/></filter>
      <mask id="lkChartFogMask" maskUnits="userSpaceOnUse" x="${-HALF * 2}" y="${-HALF * 2}" width="${HALF * 4}" height="${HALF * 4}">
        <rect x="${-HALF * 2}" y="${-HALF * 2}" width="${HALF * 4}" height="${HALF * 4}" fill="#fff"/>
        <g data-ref="explored" fill="#000" filter="url(#lkChartFogEdge)"></g>
      </mask>`;
    // Fondo: mar de papel con grano
    el('rect', { x: -HALF * 2, y: -HALF * 2, width: HALF * 4, height: HALF * 4, fill: '#D6DAD0' }, svg);
    el('rect', { x: -HALF * 2, y: -HALF * 2, width: HALF * 4, height: HALF * 4, fill: '#E9DFC9', opacity: .55 }, svg);
    this.gWater = el('image', { x: -HALF, y: -HALF, width: HALF * 2, height: HALF * 2, filter: 'url(#lkChartWater)', preserveAspectRatio: 'none' }, svg);
    this.gLand = el('image', { x: -HALF, y: -HALF, width: HALF * 2, height: HALF * 2, filter: 'url(#lkChartInk)', preserveAspectRatio: 'none' }, svg);
    el('rect', { x: -HALF * 2, y: -HALF * 2, width: HALF * 4, height: HALF * 4, filter: 'url(#lkChartPaper)', 'pointer-events': 'none' }, svg);
    // Niebla
    this.gFog = el('g', { 'data-layer': 'fog', 'pointer-events': 'none' }, svg);
    el('rect', { x: -HALF * 2, y: -HALF * 2, width: HALF * 4, height: HALF * 4, fill: '#ECE3D0', opacity: .86, mask: 'url(#lkChartFogMask)' }, this.gFog);
    el('rect', { x: -HALF * 2, y: -HALF * 2, width: HALF * 4, height: HALF * 4, filter: 'url(#lkChartPaper)', opacity: .7, mask: 'url(#lkChartFogMask)' }, this.gFog);
    this.gExplored = svg.querySelector('[data-ref="explored"]');
    // Capas de marcas
    this.g = {};
    ['quest', 'ferry', 'poi', 'npc', 'foe'].forEach((k) => (this.g[k] = el('g', { 'data-layer': k }, svg)));
    this.route = el('path', { class: 'lk-chart__route' }, this.g.quest);
    this.gQuestMk = el('g', {}, this.g.quest);
    this.gMe = el('g', {}, svg);
  }

  _bind() {
    const h = this.host, svg = this.svg;
    h.querySelector('.lk-chart__filters').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on));
      this.layers[b.dataset.layer] = on; this._applyLayers();
    });
    h.querySelector('.lk-chart__ctrl').addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'in') this.zoomBy(1 / 1.3);
      if (a === 'out') this.zoomBy(1.3);
      if (a === 'me') { const p = this.om?.player?.position; if (p) this.focus(p.x, p.z, Math.min(this.view.span, 180)); }
    });
    // Zoom hacia el cursor y arrastre
    svg.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); const w = this._toWorld(e.clientX, e.clientY); this.zoomBy(e.deltaY < 0 ? 1 / 1.18 : 1.18, w); }, { passive: false });
    let drag = null;
    svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: this.view.cx, cz: this.view.cz, moved: false }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', (e) => {
      if (drag) {
        const r = svg.getBoundingClientRect(); const mpp = this._metersPerPx(r);
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) { drag.moved = true; svg.classList.add('is-drag'); this._hideTip(); }
        this.view.cx = drag.cx - (e.clientX - drag.x) * mpp; this.view.cz = drag.cz - (e.clientY - drag.y) * mpp; this._clampView(); this._applyView();
        return;
      }
      this._hover(e);
    });
    const end = (e) => {
      if (drag && !drag.moved) { const m = e.target.closest?.('.lk-chart__mk'); if (m && (m.dataset.kind === 'poi' || m.dataset.kind === 'ferry')) this.setFollow(m.dataset.id); }
      drag = null; svg.classList.remove('is-drag');
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', () => { drag = null; svg.classList.remove('is-drag'); });
    svg.addEventListener('pointerleave', () => this._hideTip());
    new ResizeObserver(() => this._applyView()).observe(svg);
  }

  /* ---------- vista ---------- */
  _metersPerPx(r = this.svg.getBoundingClientRect()) {
    // con «slice», la escala la marca el lado que más llena
    return this.view.span / Math.min(r.width || 1, r.height || 1);
  }
  _toWorld(clientX, clientY) {
    const r = this.svg.getBoundingClientRect(); const mpp = this._metersPerPx(r);
    return { x: this.view.cx + (clientX - r.left - r.width / 2) * mpp, z: this.view.cz + (clientY - r.top - r.height / 2) * mpp };
  }
  _clampView() {
    this.view.span = Math.max(60, Math.min(HALF * 2.1, this.view.span));
    const lim = HALF - this.view.span * .25;
    this.view.cx = Math.max(-lim, Math.min(lim, this.view.cx));
    this.view.cz = Math.max(-lim, Math.min(lim, this.view.cz));
  }
  _applyView() {
    const { cx, cz, span } = this.view;
    this.svg.setAttribute('viewBox', `${cx - span / 2} ${cz - span / 2} ${span} ${span}`);
    // Las marcas mantienen su tamaño en pantalla
    const k = this._metersPerPx();
    this.svg.style.setProperty('--k', k);
    this.svg.querySelectorAll('.lk-chart__mk').forEach((m) => m.setAttribute('transform', `translate(${m.dataset.x} ${m.dataset.z}) scale(${k})`));
    // Rótulos cerca de los bordes: se alinean hacia dentro para no salirse de la carta
    const fr = this.svg.getBoundingClientRect();
    if (fr.width) this.svg.querySelectorAll('.lk-chart__mk .lk-chart__lbl').forEach((t) => {
      const r = (t.parentNode.querySelector('.body') || t.parentNode).getBoundingClientRect(); const fx = (r.left + r.width / 2 - fr.left) / fr.width;
      const a = fx > .78 ? 'end' : fx < .22 ? 'start' : 'middle';
      t.setAttribute('text-anchor', a); t.setAttribute('x', a === 'end' ? 16 : a === 'start' ? -16 : 0);
    });
    if (this.route) this.route.style.strokeWidth = 3 * k;
    this.route?.setAttribute('stroke-dasharray', `${2 * k} ${9 * k}`);
    // Escala gráfica
    const steps = [10, 20, 25, 50, 100, 200];
    const m = steps.find((s) => s / k >= 60) || 200;
    const bar = this.$('scaleBar'); if (bar) bar.style.width = `${Math.round(m / k)}px`;
    const txt = this.$('scaleTxt'); if (txt) txt.textContent = `${m} m`;
  }
  zoomBy(f, at = null) {
    const before = { ...this.view };
    this.view.span *= f; this._clampView();
    if (at) { const r = this.view.span / before.span; this.view.cx = at.x - (at.x - before.cx) * r; this.view.cz = at.z - (at.z - before.cz) * r; this._clampView(); }
    this._applyView();
  }
  focus(x, z, span = this.view.span) {
    this.view.cx = x; this.view.cz = z; this.view.span = span; this._clampView();
    this.svg.classList.add('is-anim'); this._applyView(); setTimeout(() => this.svg.classList.remove('is-anim'), 450);
  }
  _applyLayers() {
    this.svg.querySelectorAll('[data-layer]').forEach((g) => g.classList.toggle('is-off', !this.layers[g.dataset.layer]));
  }

  /* ---------- datos ---------- */
  _island() { return ISLANDS_REGISTRY[currentIslandKey()]; }
  _places() {
    const isl = this._island();
    const out = (isl?.landmarks || []).filter((l) => l.coords).map((l) => ({ id: 'poi_' + l.id, kind: 'poi', name: l.name, desc: l.desc, x: l.coords.x, z: l.coords.z }));
    const ferry = (this.om?.npcManager?.npcs || []).find((n) => n.id === FERRY_NPC_ID && n.group);
    if (ferry) out.push({ id: 'ferry', kind: 'ferry', name: 'Barquero', desc: 'Habla con él para viajar a otra isla.', x: ferry.group.position.x, z: ferry.group.position.z });
    return out;
  }
  _npcs() {
    const qm = this.om?.questManager;
    return (this.om?.npcManager?.npcs || []).filter((n) => n.group && n.group.visible && n.id !== FERRY_NPC_ID && !n.isStatue).map((n) => {
      let mark = '';
      const q = n.questId && qm?.getQuest ? qm.getQuest(n.questId) : null;
      if (q?.status === 'ready_to_turn_in') mark = '?';
      else if (q?.status === 'available') mark = '!';
      return { id: 'npc_' + n.id, kind: 'npc', name: n.name, mark, desc: mark === '?' ? 'Tiene algo que entregarte.' : mark === '!' ? 'Tiene una misión para ti.' : 'Habitante de la isla.', x: n.group.position.x, z: n.group.position.z };
    });
  }
  _foes() {
    const p = this.om?.player?.position; if (!p) return [];
    const v = new THREE.Vector3();
    const list = [];
    (this.om?.monsters?.monsters || []).forEach((m) => { if (m.group?.visible) list.push({ name: m.name, tier: m.tier, pos: m.group.position }); });
    (this.om?.demoScenaZone?.slimeCreaturesManager?.slimes || []).forEach((s) => { if (s.group) { s.group.getWorldPosition(v); list.push({ name: s.name, tier: s.tier, pos: v.clone() }); } });
    return list.filter((m) => Math.hypot(m.pos.x - p.x, m.pos.z - p.z) < 60).map((m, i) => ({ id: 'foe_' + i, kind: 'foe', name: String(m.name || 'Quimera').replace(/^./, (c) => c.toUpperCase()), desc: m.tier ? `Nv. ${m.tier}` : 'Quimera', x: m.pos.x, z: m.pos.z }));
  }
  _target() {
    const pl = this.om?.player; const t = pl?.navTargetWorldPos;
    if (this.follow) { const f = this._places().find((p) => p.id === this.follow); if (f) return { ...f, label: 'Destino', title: f.name }; }
    if (t) { const q = this.om?.questManager?.getTrackedQuest?.(); return { id: 'quest', kind: 'quest', name: q?.title || 'Objetivo', desc: 'Misión seguida', x: t.x, z: t.z, label: 'Misión seguida', title: q?.title || 'Objetivo' }; }
    return null;
  }

  /* ---------- marcas ---------- */
  _mk(parent, d, inner) {
    const g = el('g', { class: `lk-chart__mk lk-mk-${d.kind}`, 'data-id': d.id, 'data-kind': d.kind, 'data-x': d.x, 'data-z': d.z }, parent);
    g.innerHTML = inner;
    this._data.set(d.id, d);
    return g;
  }
  _renderMarkers() {
    this._data = new Map();
    ['ferry', 'poi', 'npc', 'foe'].forEach((k) => (this.g[k].innerHTML = ''));
    this.gQuestMk.innerHTML = ''; this.gMe.innerHTML = '';
    const label = (t, y = 30) => `<text class="lk-chart__lbl" y="${y}" text-anchor="middle">${esc(t)}</text>`;
    this._places().forEach((p) => {
      const isF = p.kind === 'ferry';
      this._mk(isF ? this.g.ferry : this.g.poi, p, `<circle class="hit" r="20"/><circle class="ring" r="22"/>
        <g class="body"><rect x="-12" y="-12" width="24" height="24" rx="4" transform="rotate(45)" fill="${isF ? '#2F5E93' : '#1A2236'}" stroke="${isF ? '#A9CCFF' : '#D3AE6C'}" stroke-width="2"/>
        <g transform="translate(-9 -9) scale(.75)" fill="none" stroke="#F2EADA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${GLYPH[isF ? 'ferry' : 'place']}</g></g>${label(p.name, isF ? -22 : 32)}`);
    });
    this._npcs().forEach((n) => {
      this._mk(this.g.npc, n, `<circle class="hit" r="14"/><g class="body">${n.mark
        ? `<rect x="-8" y="-8" width="16" height="16" rx="3" transform="rotate(45)" fill="${n.mark === '?' ? '#F6C35B' : '#EED39A'}" stroke="#3D2C0E" stroke-width="1.6"/><text class="lk-chart__mark" y="4.5" text-anchor="middle">${n.mark}</text>`
        : `<circle r="6" fill="#F2EADA" stroke="#5B4026" stroke-width="1.6"/>`}</g>`);
    });
    this._foes().forEach((f) => this._mk(this.g.foe, f, `<circle class="hit" r="11"/><g class="body"><circle r="5.5" fill="#E0605A" stroke="#5A1A18" stroke-width="1.4"/></g>`));
    // Destino seguido
    const t = this._target(); this._tgt = t;
    if (t) {
      this._mk(this.gQuestMk, { ...t, id: 'tgt' }, `<circle class="lk-chart__pulse" r="16"/><g class="body"><rect x="-9" y="-9" width="18" height="18" rx="3" transform="rotate(45)" fill="#EED39A" stroke="#6B4A2A" stroke-width="1.6"/><circle r="3" fill="#6B4A2A"/></g>`);
    }
    // Tú
    const pl = this.om?.player;
    if (pl?.position) {
      const deg = 90 - (pl.yaw || 0) * 180 / Math.PI; // yaw 0 = +z (sur en la carta)
      this._mk(this.gMe, { id: 'me', kind: 'me', name: 'Tú', desc: pl.name ? `${pl.name}` : 'Tu posición', x: pl.position.x, z: pl.position.z },
        `<g transform="rotate(${deg})"><path d="M0 0 L64 -26 A70 70 0 0 1 64 26 Z" fill="#A9CCFF" opacity=".3"/></g>
         <circle r="12" fill="#1A2236" stroke="#A9CCFF" stroke-width="2.5"/><g transform="rotate(${deg})"><path d="M-5 -6 L8 0 L-5 6 L-2 0 Z" fill="#A9CCFF"/></g>`);
    }
    this._renderRoute();
    this._applyLayers();
    // El refresco reconstruye las marcas: se conservan el resaltado y el destino seguido
    this.svg.querySelectorAll('.lk-chart__mk').forEach((m) => {
      m.classList.toggle('is-hot', m.dataset.id === this._hotId);
      m.classList.toggle('is-follow', m.dataset.id === this.follow);
    });
    this._applyView();
  }
  _renderRoute() {
    const p = this.om?.player?.position, t = this._tgt;
    if (!p || !t) { this.route.setAttribute('d', ''); return; }
    const mx = (p.x + t.x) / 2, mz = (p.z + t.z) / 2;
    const dx = t.x - p.x, dz = t.z - p.z, L = Math.hypot(dx, dz) || 1;
    const bend = Math.min(40, L * .18);
    this.route.setAttribute('d', `M${p.x} ${p.z} Q ${mx - dz / L * bend} ${mz + dx / L * bend} ${t.x} ${t.z}`);
  }
  _renderFog() {
    const key = currentIslandKey(); const g = fogGrid(key); const cell = (HALF * 2) / FOG_N;
    let html = '';
    for (let r = 0; r < FOG_N; r++) for (let c = 0; c < FOG_N; c++) if (g[r * FOG_N + c]) html += `<circle cx="${(-HALF + (c + .5) * cell).toFixed(1)}" cy="${(-HALF + (r + .5) * cell).toFixed(1)}" r="${(cell * .95).toFixed(1)}"/>`;
    this.gExplored.innerHTML = html;
    return exploredPct(key);
  }

  /* ---------- tooltip ---------- */
  _hover(e) {
    const m = e.target.closest?.('.lk-chart__mk');
    this.svg.querySelectorAll('.lk-chart__mk.is-hot').forEach((x) => x !== m && x.classList.remove('is-hot'));
    this._hotId = m?.dataset.id || null;
    if (!m) { this._hideTip(); this.onHover?.(null); return; }
    m.classList.add('is-hot'); this.onHover?.(m.dataset.id);
    const d = this._data.get(m.dataset.id); if (!d) return;
    const K = { poi: ['Lugar', 'var(--lk-gilt-500)'], ferry: ['Barquero', 'var(--lk-lumen-500)'], npc: ['NPC', '#F6C35B'], foe: ['Quimera', 'var(--lk-enemy-red)'], me: ['Tu posición', 'var(--lk-lumen-300)'], quest: ['Misión seguida', 'var(--lk-gilt-500)'] };
    const [kind, c] = K[d.kind] || K.poi;
    const p = this.om?.player?.position;
    const dist = p && d.kind !== 'me' ? ` · a ${Math.round(Math.hypot(d.x - p.x, d.z - p.z))} m` : '';
    const hint = d.kind === 'poi' || d.kind === 'ferry' ? `<p class="lk-chart__tiphint">${this.follow === d.id ? 'Siguiendo este destino' : 'Clic para seguirlo'}</p>` : '';
    this.tip.innerHTML = `<div class="lk-tooltip-tactical" style="--c:${c}"><header><div><small>${kind}${dist}</small><b>${esc(d.name)}</b></div></header><div class="lk-tt-body"><p>${esc(d.desc || '')}</p>${hint}</div></div>`;
    this.tip.classList.add('lk-is-on');
    const t = this.tip.getBoundingClientRect();
    let x = e.clientX + 16, y = e.clientY + 16;
    if (x + t.width > innerWidth - 8) x = e.clientX - t.width - 16;
    if (y + t.height > innerHeight - 8) y = e.clientY - t.height - 16;
    this.tip.style.left = x + 'px'; this.tip.style.top = y + 'px';
  }
  _hideTip() { this.tip.classList.remove('lk-is-on'); }
  highlight(id) { this._hotId = id; this.svg.querySelectorAll('.lk-chart__mk').forEach((m) => m.classList.toggle('is-hot', m.dataset.id === id)); }

  /* ---------- API ---------- */
  setFollow(id) {
    this.follow = this.follow === id ? null : id;
    this._renderMarkers();
    this.svg.querySelectorAll('.lk-chart__mk').forEach((m) => m.classList.toggle('is-follow', m.dataset.id === this.follow));
    this.onFollow?.(this.follow, this._tgt);
  }
  placeId(landmarkId) { return 'poi_' + landmarkId; }
  target() { return this._tgt; }

  /** Abre/actualiza la carta (captura el terreno la primera vez en cada isla). */
  open() {
    const isl = this._island(); const key = currentIslandKey();
    const t = this.$('ctTitle'); if (t) t.textContent = isl?.name || 'Isla';
    const s = this.$('ctSub'); if (s) s.textContent = `LUNACIA · ${String(isl?.levelRange || '').toUpperCase().replace('NIVEL', 'NV.')}`;
    const apply = (url) => { if (!url) return; this.gLand.setAttribute('href', url); this.gWater.setAttribute('href', url); };
    if (captures.has(key)) apply(captures.get(key));
    else {
      const ld = this.$('loading'); if (ld) ld.hidden = false;
      // Un fotograma para que se vea el aviso antes del trabajo de la captura
      requestAnimationFrame(() => setTimeout(() => {
        const url = captureTerrain(this.om);
        if (url) captures.set(key, url);
        apply(url);
        if (ld) ld.hidden = true;
      }, 30));
    }
    const p = this.om?.player?.position;
    if (p) reveal(key, p.x, p.z);
    this.pct = this._renderFog();
    if (p && !this._opened) { this.view = { cx: p.x * .5, cz: p.z * .5, span: HALF * 1.3 }; this._opened = true; }
    this._renderMarkers();
    // Refresco ligero mientras está abierta (te mueves, las quimeras patrullan)
    clearInterval(this._tick);
    this._tick = setInterval(() => { if (!this.host.isConnected || this.host.closest('.hidden')) { clearInterval(this._tick); return; } this._renderMarkers(); }, 1000);
    return this.pct;
  }
  close() { clearInterval(this._tick); this._hideTip(); }
}
