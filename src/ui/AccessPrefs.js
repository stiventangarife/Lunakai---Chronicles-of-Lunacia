// AccessPrefs.js — Preferencias de accesibilidad compartidas (Hito 85).
//
// Fuente única para el resto del juego: lectura (tamaño y velocidad del texto, avance automático),
// visión (alto contraste, daltonismo) y movimiento (reducir movimiento, temblor de cámara).
//   · Se lee al importar el módulo (antes de que exista el menú): todo arranca ya con las preferencias.
//   · El menú de Opciones (SettingsModal) guarda en 'axie_lk_prefs' y emite 'lk:settings'; aquí se escucha.
//   · Otros sistemas (el botón «Auto» del diálogo) cambian valores con access.set({ ... }).
//   · La primera vez, «Reducir movimiento» y «Alto contraste» toman el valor del sistema operativo.
//
// En la página: <html data-lk-text="normal|large|xlarge" data-lk-cb="off|rg|tri"> con las clases
// lk-reduce-motion y lk-high-contrast, y la variable --lk-text-scale. Además:
//   · los font-size en px de las hojas de estilo se multiplican por --lk-text-scale (hoja #lk-access-scale);
//   · las reglas @media (prefers-reduced-motion: reduce) se repiten para html.lk-reduce-motion (#lk-access-motion).

const KEY = 'axie_lk_prefs';
const LEGACY_DIALOG_AUTO = 'axie_lk_dialog_auto'; // botón «Auto» del diálogo antes del Hito 85

export const TEXT_SCALE = { normal: 1, large: 1.125, xlarge: 1.25 };
export const TEXT_SPEED_MS = { slow: 40, normal: 22, instant: 0 };   // ms por carácter (0 = la frase entera)
export const AUTO_ADVANCE = { off: 0, normal: 1, slow: 1.7 };         // multiplicador de la espera
const ACCESS_KEYS = ['textSize', 'textSpeed', 'autoAdvance', 'contrast', 'reduceMotion', 'shake', 'colorblind', 'combatNumbers'];
/** Hito 107 · números flotantes del combate: todos, solo daño y curas, o ninguno. */
export const COMBAT_NUMBERS = ['full', 'damage', 'off'];

/**
 * Colores por bando y casillas del tablero. 'off' = los de siempre.
 * rg  (protanopía / deuteranopía): azul cielo frente a naranja (paleta Okabe-Ito).
 * tri (tritanopía): turquesa frente a rosa rojizo.
 */
export const PALETTES = {
  off: { ally: '#00d2ff', enemy: '#ff3b30', allyHp: '#7BD88F', enemyHp: '#E8706B', reach: 0x2f7dff, spell: 0xff1f3d, target: 0xff2020, aoe: 0xff9a1f, path: 0x39e75f },
  rg:  { ally: '#56B4E9', enemy: '#F0A020', allyHp: '#56B4E9', enemyHp: '#F0A020', reach: 0x3f8cff, spell: 0xd55e00, target: 0xff6a00, aoe: 0xf0e442, path: 0xffffff },
  tri: { ally: '#22C3B5', enemy: '#FF4F79', allyHp: '#22C3B5', enemyHp: '#FF4F79', reach: 0x22c3b5, spell: 0xff2a55, target: 0xff1f4d, aoe: 0xf2f2f2, path: 0xffffff },
};

const mq = (q) => { try { return window.matchMedia(q).matches; } catch { return false; } };

/** Valores por defecto (la primera vez se miran las preferencias del sistema operativo). */
export function accessDefaults() {
  let auto = false;
  try { auto = localStorage.getItem(LEGACY_DIALOG_AUTO) === '1'; } catch { /* sin almacenamiento */ }
  return {
    textSize: 'normal',
    textSpeed: 'normal',
    autoAdvance: auto ? 'normal' : 'off',
    contrast: mq('(prefers-contrast: more)'),
    reduceMotion: mq('(prefers-reduced-motion: reduce)'),
    shake: true,
    colorblind: 'off',
    combatNumbers: 'full',
  };
}

function readStored() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

class AccessPrefs {
  constructor() {
    const stored = readStored();
    const def = accessDefaults();
    this.p = {};
    for (const k of ACCESS_KEYS) this.p[k] = k in stored ? stored[k] : def[k];
    this._sanitize();
    this._listeners = new Set();
    this._labels = [];
    this._scaleBuilt = false;
    if (typeof document !== 'undefined') {
      this.applyToDocument();
      if (typeof window !== 'undefined') {
        window.addEventListener('lk:settings', (e) => this._fromSettings(e.detail));
        const start = () => { this._buildMotionSheet(); if (this.textScale !== 1) this._buildScaleSheet(); this._watchStyles(); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
        window.addEventListener('load', () => this._rebuildSheets(), { once: true });
      }
    }
  }

  _sanitize() {
    const p = this.p;
    if (!(p.textSize in TEXT_SCALE)) p.textSize = 'normal';
    if (!(p.textSpeed in TEXT_SPEED_MS)) p.textSpeed = 'normal';
    if (!(p.autoAdvance in AUTO_ADVANCE)) p.autoAdvance = 'off';
    if (!(p.colorblind in PALETTES)) p.colorblind = 'off';
    if (!COMBAT_NUMBERS.includes(p.combatNumbers)) p.combatNumbers = 'full';
    p.contrast = Boolean(p.contrast);
    p.reduceMotion = Boolean(p.reduceMotion);
    p.shake = p.shake !== false;
  }

  // ----------------------------------------------------------------- lectura de valores
  get prefs() { return { ...this.p }; }
  get textScale() { return TEXT_SCALE[this.p.textSize] || 1; }
  get textSpeedMs() { return TEXT_SPEED_MS[this.p.textSpeed] ?? 22; }
  get autoAdvance() { return this.p.autoAdvance; }
  /** Espera (ms) del avance automático para una línea de `chars` caracteres; 0 = desactivado. */
  autoDelay(chars = 0) {
    const f = AUTO_ADVANCE[this.p.autoAdvance] || 0;
    if (!f) return 0;
    return Math.round(Math.min(7000, Math.max(1600, 1100 + 38 * chars)) * f);
  }
  get contrast() { return this.p.contrast; }
  get reduceMotion() { return this.p.reduceMotion || mq('(prefers-reduced-motion: reduce)'); }
  get colorblind() { return this.p.colorblind; }
  get combatNumbers() { return this.p.combatNumbers || 'full'; }
  get palette() { return PALETTES[this.p.colorblind] || PALETTES.off; }
  /** Multiplicador del temblor de cámara: 0 apagado; la mitad con «Reducir movimiento». */
  get shakeScale() { return this.p.shake ? (this.reduceMotion ? 0.5 : 1) : 0; }
  /** Multiplicador de destellos a pantalla completa y fogonazos. */
  get flashScale() { return this.reduceMotion ? 0.25 : 1; }

  // ----------------------------------------------------------------- cambios
  /** Cambia valores desde el juego (p. ej. el botón «Auto» del diálogo) y los guarda. */
  set(partial) {
    if (!partial) return;
    const stored = readStored();
    let changed = false;
    for (const k of ACCESS_KEYS) {
      if (k in partial && partial[k] !== this.p[k]) { this.p[k] = partial[k]; changed = true; }
    }
    this._sanitize();
    if (!changed) return;
    try { localStorage.setItem(KEY, JSON.stringify({ ...stored, ...this.p })); } catch { /* sin almacenamiento */ }
    this._changed();
  }

  /** El menú emitió 'lk:settings' con todas las opciones (ya guardadas). */
  _fromSettings(detail) {
    if (!detail) return;
    let changed = false;
    for (const k of ACCESS_KEYS) {
      if (k in detail && detail[k] !== this.p[k]) { this.p[k] = detail[k]; changed = true; }
    }
    this._sanitize();
    if (changed) this._changed();
  }

  _changed() {
    this.applyToDocument();
    if (this.textScale !== 1 && !this._scaleBuilt && typeof document !== 'undefined' && document.head) this._buildScaleSheet();
    this._applyLabels();
    for (const fn of this._listeners) { try { fn(this); } catch (err) { console.error('[AccessPrefs] listener', err); } }
  }

  /** fn(access) en cada cambio. Devuelve la función para darse de baja. */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  applyToDocument() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!root) return;
    root.dataset.lkText = this.p.textSize;
    root.dataset.lkCb = this.p.colorblind;
    root.style.setProperty('--lk-text-scale', String(this.textScale));
    root.classList.toggle('lk-reduce-motion', Boolean(this.p.reduceMotion));
    root.classList.toggle('lk-high-contrast', Boolean(this.p.contrast));
  }

  // ----------------------------------------------------------------- etiquetas 3D con texto
  /** Sprites con texto del mundo (nombres de NPC y de enemigos): su tamaño sigue al tamaño del texto. */
  trackWorldLabel(sprite) {
    if (!sprite || !sprite.scale) return sprite;
    sprite.userData.lkBaseScale = sprite.scale.clone();
    this._labels.push(new WeakRef(sprite));
    this._scaleLabel(sprite);
    return sprite;
  }

  _scaleLabel(s) {
    const b = s.userData.lkBaseScale;
    if (b) s.scale.set(b.x * this.textScale, b.y * this.textScale, b.z);
  }

  _applyLabels() {
    this._labels = this._labels.filter((r) => {
      const s = r.deref();
      if (s) this._scaleLabel(s);
      return Boolean(s);
    });
  }

  // ----------------------------------------------------------------- hojas generadas
  _eachRule(rules, fn, cond = '') {
    for (const r of rules) {
      if (r.type === 1) fn(r, cond); // CSSStyleRule
      else if (r.type === 4) this._eachRule(r.cssRules, fn, `@media ${r.conditionText || r.media.mediaText}`); // CSSMediaRule
      else if (r.type === 12) this._eachRule(r.cssRules, fn, `@supports ${r.conditionText}`); // CSSSupportsRule
    }
  }

  _sourceSheets() {
    const out = [];
    for (const sh of document.styleSheets) {
      const id = sh.ownerNode && sh.ownerNode.id;
      if (id === 'lk-access-scale' || id === 'lk-access-motion') continue;
      try { if (sh.cssRules) out.push(sh); } catch { /* hoja de otro origen (fuentes de Google) */ }
    }
    return out;
  }

  _styleEl(id) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; }
    document.head.appendChild(el); // siempre la última: gana a las reglas iguales anteriores
    return el;
  }

  /** font-size en px → calc(px × --lk-text-scale). Las medidas en rem ya crecen con <html>. */
  _buildScaleSheet() {
    const out = [];
    for (const sh of this._sourceSheets()) {
      this._eachRule(sh.cssRules, (r, cond) => {
        const fs = r.style.getPropertyValue('font-size');
        if (!fs || !/\dpx/.test(fs) || /--lk-text-scale/.test(fs)) return;
        const imp = r.style.getPropertyPriority('font-size') ? ' !important' : '';
        const rule = `${r.selectorText}{font-size:calc(${fs} * var(--lk-text-scale, 1))${imp}}`;
        out.push(cond ? `${cond}{${rule}}` : rule);
      });
    }
    this._styleEl('lk-access-scale').textContent = out.join('\n');
    this._scaleBuilt = true;
    this._scaleRules = out.length;
  }

  /** Repite las reglas de @media (prefers-reduced-motion: reduce) para html.lk-reduce-motion. */
  _buildMotionSheet() {
    const out = [];
    const prefix = (sel) => splitSelectors(sel).map((s) => {
      s = s.trim();
      if (/^(html|:root)\b/.test(s)) return s.replace(/^(html|:root)/, 'html.lk-reduce-motion');
      return `html.lk-reduce-motion ${s}`;
    }).join(', ');
    for (const sh of this._sourceSheets()) {
      this._eachRule(sh.cssRules, (r, cond) => {
        if (!/prefers-reduced-motion\s*:\s*reduce/.test(cond)) return;
        out.push(`${prefix(r.selectorText)}{${r.style.cssText}}`);
      });
    }
    this._styleEl('lk-access-motion').textContent = out.join('\n');
    this._motionRules = out.length;
  }

  _rebuildSheets() {
    if (typeof document === 'undefined' || !document.head) return;
    this._buildMotionSheet();
    if (this._scaleBuilt || this.textScale !== 1) this._buildScaleSheet();
  }

  /** Hojas añadidas después (algunos módulos inyectan <style> al crearse): se regeneran las copias. */
  _watchStyles() {
    if (this._observer || typeof MutationObserver === 'undefined') return;
    let t = 0;
    const later = () => { clearTimeout(t); t = setTimeout(() => this._rebuildSheets(), 120); };
    this._observer = new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) {
        if (n.nodeName === 'STYLE' && n.id !== 'lk-access-scale' && n.id !== 'lk-access-motion') { later(); return; }
        if (n.nodeName === 'LINK' && /stylesheet/i.test(n.rel || '')) { n.addEventListener('load', later, { once: true }); return; }
      }
    });
    this._observer.observe(document.head, { childList: true });
    if (document.body) this._observer.observe(document.body, { childList: true });
  }

  // ----------------------------------------------------------------- auditoría (lkDebug.a11y)
  /** Textos visibles que no crecen con «Tamaño del texto». Devuelve [{ elemento, texto, normal, muyGrande }]. */
  auditTextScale() {
    const root = document.documentElement;
    const prev = { text: root.dataset.lkText, scale: root.style.getPropertyValue('--lk-text-scale') };
    if (!this._scaleBuilt) this._buildScaleSheet();
    const els = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !n.textContent.trim()) continue;
      seen.add(el);
      if (!el.getClientRects().length) continue;
      els.push(el);
    }
    const measure = (size) => {
      root.dataset.lkText = size;
      root.style.setProperty('--lk-text-scale', String(TEXT_SCALE[size]));
      return els.map((el) => parseFloat(getComputedStyle(el).fontSize) || 0);
    };
    const a = measure('normal'), b = measure('xlarge');
    root.dataset.lkText = prev.text;
    root.style.setProperty('--lk-text-scale', prev.scale);
    const rows = [];
    els.forEach((el, i) => {
      if (!(a[i] > 0) || b[i] / a[i] >= 1.1) return;
      const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '';
      rows.push({ elemento: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}`, texto: el.textContent.trim().slice(0, 40), normal: a[i], muyGrande: b[i], enLinea: Boolean(el.style.fontSize) });
    });
    return rows;
  }
}

/** Separa "a, b:is(c, d)" en ["a", "b:is(c, d)"] (respeta paréntesis y corchetes). */
function splitSelectors(sel) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of sel) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export const access = new AccessPrefs();
if (typeof window !== 'undefined') window.lunakaiAccess = access;
export default access;
