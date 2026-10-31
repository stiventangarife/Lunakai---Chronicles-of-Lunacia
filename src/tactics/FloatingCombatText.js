// FloatingCombatText.js — Números y avisos flotantes del combate (Hito 107, sistema de diseño «Crónica Celeste»).
//
// Tres niveles (ver docs/HITO_107_NUMEROS_DE_COMBATE.md):
//   · principal  — daño, cura, escudo ganado, esquiva: Nunito Sans 900 cursiva, crece con el golpe.
//                  Daño a un enemigo en blanco (`hit`), a un aliado en carmesí suave (`taken`).
//   · crítico    — dorado, etiqueta «Crítico» encima del número (nunca en la misma línea), destello y chispas.
//   · etiquetas  — escudo roto, PA/PM, estados, runas…: píldoras pequeñas que se apilan en una columna a la
//                  derecha del número, de una en una (cola por unidad), para que nada se pise.
// Además: golpes seguidos sobre la misma unidad se suman en un solo número (`merge`), los golpes grandes cuentan
// hasta su valor, el número se queda en su pico mientras dura la pausa de impacto (`isFrozen`), sello «KO»,
// total de los ataques en área y título de Ultimate.
//
// Rendimiento: nodos reutilizados (sin crear y borrar `div` en cada golpe), una sola escritura de `transform` y
// `opacity` por fotograma, sin animaciones CSS infinitas y un tope de elementos a la vez.
// Accesibilidad: tamaños en rem (Tamaño del texto), colores por variables (modo daltonismo), «Reducir movimiento»
// (sin rebote ni deriva) y Opciones › Accesibilidad › Números de combate (completos / solo daño / ocultos).
import * as THREE from 'three';
import { access } from '../ui/AccessPrefs.js';

const MAX_ITEMS = 40;
const TAG_GAP_S = 0.1;        // separación entre etiquetas de la misma unidad
const TAG_ROW_PX = 30;        // alto de una fila de etiquetas
const MERGE_WINDOW_S = 0.45;  // golpes seguidos a la misma unidad dentro de este tiempo se suman

/** Clases de elemento: nivel y duración base (s). */
const KIND = {
  hit:     { tier: 'main', life: 1.05 },
  taken:   { tier: 'main', life: 1.05 },
  crit:    { tier: 'main', life: 1.35 },
  heal:    { tier: 'main', life: 1.05 },
  shield:  { tier: 'main', life: 1.0 },
  miss:    { tier: 'main', life: 0.95 },
  ko:      { tier: 'stamp', life: 1.15 },
  title:   { tier: 'title', life: 1.6 },
  total:   { tier: 'total', life: 1.5 },
  // etiquetas
  shieldBreak: { tier: 'tag', life: 1.0 },
  pa:      { tier: 'tag', life: 0.95 },
  pm:      { tier: 'tag', life: 0.95 },
  buff:    { tier: 'tag', life: 1.05 },
  debuff:  { tier: 'tag', life: 1.05 },
  gilt:    { tier: 'tag', life: 1.05 },
  info:    { tier: 'tag', life: 0.95 },
};
const DAMAGE_ONLY = new Set(['hit', 'taken', 'crit', 'heal', 'shield', 'miss', 'ko']);

/** Tipos antiguos de `spawn()` → clase nueva. */
const LEGACY = { damage: 'taken', crit: 'crit', heal: 'heal', shield: 'info', pa: 'pa', pm: 'pm', buff: 'buff', collision: 'taken', pushback: 'taken' };

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class FloatingCombatText {
  constructor(camera, container) {
    this.camera = camera;
    this.container = container;
    this.items = [];
    this.pool = [];
    this.anchors = new Map();    // clave (unidad) → { tagAt, slots: Set<number>, merge }
    this.tempVec = new THREE.Vector3();
    this.tempVec2 = new THREE.Vector3();
    this.clock = 0;
    /** Lo pone SpellPresentation: true mientras dura la pausa de impacto. */
    this.isFrozen = () => false;
  }

  // ------------------------------------------------------------------ API
  /**
   * Compatibilidad con las llamadas de antes. `type`: damage, crit, heal, shield, pa, pm, buff, collision.
   * @param {{ icon?: string, alt?: string, size?: number }} [opts]
   */
  spawn(worldPos, text, type = 'damage', opts = {}) {
    return this.pop({ pos: worldPos, kind: LEGACY[type] || 'info', text, icon: opts.icon, alt: opts.alt, size: opts.size });
  }

  /**
   * @param {object} s
   * @param {THREE.Vector3} s.pos      posición del suelo de la unidad (o de la casilla)
   * @param {string} s.kind            ver KIND
   * @param {number} [s.value]         número (se dibuja con signo según la clase); si falta, `text`
   * @param {string} [s.text]
   * @param {string} [s.label]         etiqueta pequeña encima del número («Crítico», «Choque», «×2»)
   * @param {string} [s.icon]          imagen delante (estados, escudo); `alt` es el símbolo si no carga
   * @param {number} [s.size]          0,7–1,45 según lo fuerte del golpe
   * @param {*}      [s.key]           unidad: agrupa la cola de etiquetas y la suma de golpes
   * @param {THREE.Vector3} [s.from]   posición del atacante: el número se aleja de él
   * @param {1|-1}   [s.adv]           ventaja (1) o desventaja (−1) de clase: flecha junto al número
   * @param {boolean}[s.merge]         sumar con el golpe anterior a la misma unidad
   * @param {boolean}[s.countUp]       contar hasta el valor (golpes grandes)
   * @param {number} [s.delay]         segundos de espera antes de aparecer
   */
  pop(s) {
    const mode = access.combatNumbers;
    if (mode === 'off') return null;
    const kind = KIND[s.kind] ? s.kind : 'info';
    if (mode === 'damage' && !DAMAGE_ONLY.has(kind)) return null;
    const def = KIND[kind];
    const anchor = s.key != null ? this._anchor(s.key) : null;

    // Golpes seguidos a la misma unidad: un solo número que late y suma
    if (s.merge && anchor?.merge && typeof s.value === 'number') {
      const m = anchor.merge;
      const dmg = (k) => k === 'hit' || k === 'taken' || k === 'crit';
      if (m.alive && m.life < MERGE_WINDOW_S && dmg(m.kind) && dmg(kind)) {
        m.value += s.value;
        m.hits += 1;
        if (kind === 'crit' && m.kind !== 'crit') { m.kind = 'crit'; m.def = KIND.crit; m.maxLife = Math.max(m.maxLife, KIND.crit.life); m.label = s.label || m.label; }
        m.size = Math.min(1.45, Math.max(m.size, s.size || 1) + 0.04);
        m.shown = m.value;                       // sin volver a contar: el salto ya lo marca el latido
        m.life = Math.min(m.life, 0.05);         // vuelve a latir
        m.maxLife += 0.15;
        if (s.adv) m.adv = s.adv;
        this._paint(m);
        return m;
      }
    }

    if (this.items.length >= MAX_ITEMS) this._release(this.items.shift());
    const el = this.pool.pop() || this._makeEl();
    const reduce = access.reduceMotion;
    const item = {
      el, kind, def, key: s.key ?? null,
      value: typeof s.value === 'number' ? s.value : null,
      shown: 0,
      hits: 1,
      text: s.text ?? '',
      label: s.label || '',
      icon: s.icon || '', alt: s.alt || '',
      adv: s.adv || 0,
      size: Math.max(0.7, Math.min(1.45, s.size || 1)),
      countUp: !!s.countUp && !reduce && typeof s.value === 'number' && s.value >= 10,
      pos: new THREE.Vector3(s.pos.x, s.pos.y + (def.tier === 'title' ? 3.9 : 2.35), s.pos.z),
      drift: 0,
      life: 0,
      wait: Math.max(0, s.delay || 0),
      maxLife: def.life + Math.max(0, (s.size || 1) - 1) * 0.4,
      slot: 0,
      side: 1,
      mslot: 0,
      alive: true,
      reduce,
    };
    item.shown = item.countUp ? 0 : item.value;

    // Deriva: el número se aleja un poco del atacante (en pantalla)
    if (s.from && def.tier === 'main' && !reduce) {
      const a = this._project(item.pos, this.tempVec);
      const b = this._project(this.tempVec2.set(s.from.x, item.pos.y, s.from.z), this.tempVec2);
      if (a && b) item.drift = Math.sign(a.x - b.x || 0);
    }

    // Cola de etiquetas: una cada 0,1 s y cada una en su fila
    if (anchor && def.tier === 'tag') {
      const now = this.clock + item.wait;
      const at = Math.max(now, anchor.tagAt);
      item.wait = at - this.clock;
      anchor.tagAt = at + TAG_GAP_S;
      if (!anchor.slots.size) anchor.side = this._tagSide(anchor, item.pos);
      let slot = 0;
      while (anchor.slots.has(slot)) slot += 1;
      anchor.slots.add(slot);
      item.slot = slot;
      item.side = anchor.side;
    }
    if (anchor) anchor.pos = item.pos;
    if (anchor && s.merge && (kind === 'hit' || kind === 'taken' || kind === 'crit')) anchor.merge = item;
    // Varios números principales a la vez sobre la misma unidad (cura + escudo, crítico + esquiva…): cada uno en su
    // fila, por encima del anterior, y con un instante de diferencia
    if (anchor && (def.tier === 'main' || def.tier === 'title')) {
      let slot = 0;
      for (const o of anchor.mains) if (o.alive && o.life + o.wait < 0.6) slot = Math.max(slot, o.mslot + 1);
      item.mslot = slot;
      item.wait += slot * 0.08;
      anchor.mains.add(item);
    }

    el.className = `lk-fct lk-fct--${kind} lk-fct-${def.tier}${item.adv ? (item.adv > 0 ? ' lk-fct-adv' : ' lk-fct-dis') : ''}`;
    if (item.side < 0) el.classList.add('lk-fct-left');
    this._paint(item, true);
    el.style.opacity = '0';
    el.style.display = 'none';
    this.container.appendChild(el);
    this.items.push(item);
    return item;
  }

  update(dt) {
    this.clock += dt;
    const frozen = this.isFrozen();
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.wait > 0) { it.wait -= dt; if (it.wait > 0) continue; }
      // Pausa de impacto: el número se queda en su pico
      const step = (frozen && it.def.tier === 'main' && it.life < 0.14 && it.life > 0.08) ? dt * 0.12 : dt;
      it.life += step;
      if (it.life >= it.maxLife) { this.items.splice(i, 1); this._release(it); continue; }
      const p = it.life / it.maxLife;
      const tier = it.def.tier;

      // Contar hasta el valor (150 ms)
      if (it.countUp && it.shown !== it.value) {
        const v = Math.round(it.value * easeOutCubic(Math.min(1, it.life / 0.15)));
        if (v !== it.shown) { it.shown = v; this._paintValue(it); }
      }

      // Escala: aparece de golpe y se asienta
      let sc = 1;
      if (!it.reduce) {
        const peak = it.kind === 'crit' ? 1.38 : tier === 'stamp' ? 1.6 : tier === 'tag' ? 1.06 : 1.18;
        const tPop = tier === 'tag' ? 0.1 : 0.12;
        if (it.life < tPop) sc = 0.55 + (peak - 0.55) * easeOutBack(it.life / tPop) / easeOutBack(1);
        else if (it.life < tPop + 0.14) sc = peak + (1 - peak) * easeOutCubic((it.life - tPop) / 0.14);
        if (tier === 'stamp' && it.life >= tPop + 0.14) sc = 1;
      }
      // Subida en px (desacelera, no cae) y deriva lateral
      const rise = it.reduce ? 22 : tier === 'tag' ? 26 : tier === 'stamp' ? 6 : tier === 'title' ? 18 : 52 * Math.min(1.3, it.size);
      const dy = -rise * easeOutCubic(Math.min(1, p / 0.9));
      const dx = it.drift * 16 * easeOutCubic(Math.min(1, p / 0.6));
      const op = p < 0.7 ? Math.min(1, it.life / 0.05) : Math.max(0, 1 - (p - 0.7) / 0.3);

      const s = this._project(it.pos, this.tempVec);
      if (!s) { it.el.style.display = 'none'; continue; }
      it.el.style.display = 'block';
      let x = s.x + dx;
      let y = s.y + dy;
      let ax = '-50%';
      if (tier === 'tag') { x += 40 * it.side; y += -6 + it.slot * TAG_ROW_PX; ax = it.side > 0 ? '0%' : '-100%'; }
      if (tier === 'stamp') y += 14;   // bajo el número, sobre la cabeza
      if ((tier === 'main' || tier === 'title') && it.mslot) y -= it.mslot * 40;
      it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(${ax}, -50%) scale(${(sc * (tier === 'main' ? it.size : 1)).toFixed(3)})`;
      it.el.style.opacity = op.toFixed(3);
    }
  }

  clear() {
    for (const it of this.items) this._release(it);
    this.items = [];
    this.anchors.clear();
  }

  // ------------------------------------------------------------------ interno
  _anchor(key) {
    let a = this.anchors.get(key);
    if (!a) { a = { tagAt: 0, slots: new Set(), mains: new Set(), merge: null, side: 1, pos: null }; this.anchors.set(key, a); }
    return a;
  }

  /**
   * Lado de la columna de etiquetas: a la derecha, salvo que a la derecha haya otra unidad con avisos en pantalla
   * (a menos de 200 px) y a la izquierda no. Así dos unidades pegadas no cruzan sus columnas.
   */
  _tagSide(anchor, pos) {
    const me = this._project(pos, this.tempVec);
    if (!me) return 1;
    let right = false, left = false;
    for (const o of this.anchors.values()) {
      if (o === anchor || !o.pos || !(o.slots.size || o.mains.size)) continue;
      const p = this._project(o.pos, this.tempVec2);
      if (!p || Math.abs(p.y - me.y) > 130) continue;
      const dx = p.x - me.x;
      if (dx >= 0 && dx < 200) right = true;
      if (dx < 0 && dx > -200) left = true;
      if (o.slots.size && o.side > 0 && dx < 0 && dx > -260) left = true;   // su columna ya ocupa el hueco entre los dos
    }
    return right && !left ? -1 : 1;
  }

  _project(v, out) {
    out.copy(v).project(this.camera);
    if (out.z > 1) return null;
    return { x: (out.x * 0.5 + 0.5) * window.innerWidth, y: (-(out.y * 0.5) + 0.5) * window.innerHeight };
  }

  _makeEl() {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  _release(it) {
    it.alive = false;
    const a = it.key != null ? this.anchors.get(it.key) : null;
    if (a) {
      if (it.def.tier === 'tag') a.slots.delete(it.slot);
      a.mains.delete(it);
      if (a.merge === it) a.merge = null;
      if (!a.slots.size && !a.mains.size && !a.merge && a.tagAt <= this.clock) this.anchors.delete(it.key);
    }
    it.el.remove();
    it.el.className = '';
    it.el.textContent = '';
    it.el.style.transform = '';
    if (this.pool.length < MAX_ITEMS) this.pool.push(it.el);
  }

  _valueText(it) {
    const v = it.shown ?? it.value;
    switch (it.kind) {
      case 'heal': case 'shield': return `+${v}`;
      case 'hit': case 'taken': case 'crit': return `${v}`;
      default: return `${v}`;
    }
  }

  _paintValue(it) {
    const n = it.el.querySelector('.lk-fct__v');
    if (n) n.textContent = it.value != null ? this._valueText(it) : it.text;
  }

  _paint(it, fresh = false) {
    const label = it.hits > 1 ? `${it.label ? it.label + ' · ' : ''}×${it.hits}` : it.label;
    const ico = it.icon ? `<img class="lk-fct__ico" src="${esc(it.icon)}" alt="${esc(it.alt)}" draggable="false">` : '';
    const adv = it.adv ? `<i class="lk-fct__adv">${it.adv > 0 ? '▲' : '▼'}</i>` : '';
    const body = it.value != null ? this._valueText(it) : it.text;
    it.el.innerHTML = `${label ? `<small class="lk-fct__k">${esc(label)}</small>` : ''}<span class="lk-fct__row">${ico}<span class="lk-fct__v">${esc(body)}</span>${adv}</span>`;
    if (!fresh) {
      it.el.className = `lk-fct lk-fct--${it.kind} lk-fct-${it.def.tier}${it.adv ? (it.adv > 0 ? ' lk-fct-adv' : ' lk-fct-dis') : ''}`;
      if (it.kind === 'crit' && !it.reduce) this._restartFlash(it);
    }
  }

  /** Destello y chispas del crítico: una sola vez (la clase se quita y se vuelve a poner). */
  _restartFlash(it) {
    const el = it.el;
    el.classList.remove('lk-fct-flash');
    void el.offsetWidth; // reinicia la animación de un solo uso
    el.classList.add('lk-fct-flash');
  }
}
