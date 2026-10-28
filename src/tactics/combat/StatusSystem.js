// StatusSystem.js — Estados alterados con duración (veneno, sangrado, miedo, sueño, provocación…).
//
// Reglas:
// - Cada estado vive en unit.statuses: { id, value, duration, source }.
// - La duración cuenta TURNOS DE LA UNIDAD AFECTADA y baja al terminar su turno.
//   Un debuff de 1 turno aplicado a un enemigo dura hasta el final de su próximo turno;
//   un buff de 1 turno aplicado a uno mismo dura el resto de su turno actual.
// - Al empezar su turno: daño periódico (veneno, sangrado, quemadura), recursos de "próximo turno"
//   (±PA / ±PM) y, si está aturdido o dormido, pierde el turno.
// - Sin contadores ni cargas: volver a aplicar un estado renueva su duración y se queda con el valor mayor
//   (salvo el veneno, que suma su daño hasta un máximo).

import * as i18n from '../../i18n/i18n.js';

export const STATUS_DEFS = {
  // Daño periódico al inicio del turno de la unidad
  poison:    { label: i18n.t('status.poison'),      icon: '◉', kind: 'debuff', dot: true, stack: 'add', maxValue: 60 },
  bleed:     { label: i18n.t('status.bleed'),    icon: '◈', kind: 'debuff', dot: true },
  burn:      { label: i18n.t('status.burn'),   icon: '▲', kind: 'debuff', dot: true },

  // Control
  stun:      { label: i18n.t('status.stun'),    icon: '✶', kind: 'debuff', skipTurn: true },
  sleep:     { label: i18n.t('status.sleep'),     icon: 'z', kind: 'debuff', skipTurn: true, breaksOnDamage: true },
  fear:      { label: i18n.t('status.fear'),       icon: '!', kind: 'debuff', blocksDamageSpells: true },
  taunt:     { label: i18n.t('status.taunt'), icon: '◎', kind: 'buff' },   // los enemigos deben atacar a esta unidad si pueden

  // Modificadores de daño (value = %)
  fragile:   { label: i18n.t('status.fragile'),      icon: '◇', kind: 'debuff', mod: { damageTakenPct: +1 }, defaultValue: 25 },
  weak:      { label: i18n.t('status.weak'),  icon: '▼', kind: 'debuff', mod: { damageDealtPct: -1 }, defaultValue: 20 },
  empowered: { label: i18n.t('status.empowered'),  icon: '▲', kind: 'buff',   mod: { damageDealtPct: +1 }, defaultValue: 15 },
  guarded:   { label: i18n.t('status.guarded'),   icon: '■', kind: 'buff',   mod: { damageTakenPct: -1 }, defaultValue: 20 },
  guardedRanged: { label: i18n.t('status.guardedRanged'), icon: '▣', kind: 'buff', mod: { rangedDamageTakenPct: -1 }, defaultValue: 30 },
  critUp:    { label: i18n.t('status.critUp'),   icon: '✦', kind: 'buff',   mod: { critPct: +1 }, defaultValue: 20 },

  // Alcance (value = casillas)
  rangeDown: { label: i18n.t('status.rangeDown'),   icon: '⇣', kind: 'debuff', mod: { range: -1 }, defaultValue: 1 },
  rangeUp:   { label: i18n.t('status.rangeUp'),   icon: '⇡', kind: 'buff',   mod: { range: +1 }, defaultValue: 1 },

  // Otros
  healBlock: { label: i18n.t('status.healBlock'),      icon: '⊘', kind: 'debuff', blocksHealing: true },
  reflect:   { label: i18n.t('status.reflect'),     icon: '⟲', kind: 'buff' },   // devuelve `value` de daño a quien golpee cuerpo a cuerpo
  immune:    { label: i18n.t('status.immune'),      icon: '✧', kind: 'buff', immuneTo: ['stun', 'sleep', 'fear'] },
  regen:     { label: i18n.t('status.regen'), icon: '✚', kind: 'buff', hot: true },   // cura `value` al empezar su turno
  soulLink:  { label: i18n.t('status.soulLink'),        icon: '∞', kind: 'buff' },              // reparte a medias el daño con `partner`

  // Fase 4 (cartas de partes)
  jinx:      { label: i18n.t('status.jinx'),        icon: '×', kind: 'debuff', mod: { critPct: -1 }, defaultValue: 100 }, // sin críticos
  nurtured:  { label: i18n.t('status.nurtured'),     icon: '+', kind: 'buff',   mod: { healTakenPct: +1 }, defaultValue: 20 },
  retaliate: { label: i18n.t('status.retaliate'),  icon: '↩', kind: 'buff' },   // devuelve `value` de daño al próximo atacante (una vez)
  barrier:   { label: i18n.t('status.barrier'),     icon: '⬡', kind: 'buff' },   // anula el próximo golpe hasta `value` (una vez)
  reflectPct:{ label: i18n.t('status.reflectPct'),     icon: '⟳', kind: 'buff' },   // devuelve el `value` % del daño recibido
  unmovable: { label: i18n.t('status.unmovable'),   icon: '⊥', kind: 'buff' },   // no puede ser empujado ni atraído
  ward:      { label: i18n.t('status.ward'),      icon: '◆', kind: 'buff' },   // reacción al recibir un golpe (st.data), una vez

  // Recursos del próximo turno (se aplican al empezar el turno de la unidad)
  drained:   { label: i18n.t('status.drained'),        icon: 'PA−', kind: 'debuff', turnStart: { pa: -1 } },
  slowed:    { label: i18n.t('status.slowed'),        icon: 'PM−', kind: 'debuff', turnStart: { pm: -1 } },
  energized: { label: i18n.t('status.energized'),        icon: 'PA+', kind: 'buff',   turnStart: { pa: +1 } },
  hasted:    { label: i18n.t('status.hasted'),        icon: 'PM+', kind: 'buff',   turnStart: { pm: +1 } },
};

// Hito 80 · iconos de los estados (assets/ui/buff y assets/ui/debuff, WebP de 64 px). `icon` (el símbolo de texto)
// sigue como respaldo y para la marca sobre la cabeza de cada unidad, que se dibuja en el lienzo 3D.
const STATUS_ICON_FILES = {
  poison: 'debuff/debuff-poison', bleed: 'debuff/debuff-bleed', burn: 'debuff/debuff-burn',
  stun: 'debuff/debuff-stunned', sleep: 'debuff/debuff-sleep', fear: 'debuff/debuff-fear', taunt: 'debuff/neutral-taunt',
  fragile: 'debuff/debuff-fragile', weak: 'debuff/debuff-damageDown', empowered: 'buff/buff-damageBoost',
  guarded: 'buff/buff-shieldBoost', guardedRanged: 'buff/buff-feather', critUp: 'buff/buff-rage',
  rangeDown: 'debuff/debuff-rangeDown', rangeUp: 'buff/buff-rangeUp', healBlock: 'debuff/debuff-healBlock',
  reflect: 'buff/buff-bubbleBomb', immune: 'buff/buff-meditate', regen: 'buff/buff-leaf', soulLink: 'buff/buff-soulLink',
  jinx: 'debuff/debuff-hex', nurtured: 'buff/buff-healingBoost', retaliate: 'buff/buff-fury', barrier: 'buff/buff-bubble',
  reflectPct: 'buff/buff-bubbleBomb', unmovable: 'buff/buff-unmovable', ward: 'buff/buff-ward',
  drained: 'debuff/debuff-drained', slowed: 'debuff/debuff-weak', energized: 'buff/buff-energized', hasted: 'buff/buff-hasted',
};
Object.entries(STATUS_ICON_FILES).forEach(([id, f]) => { if (STATUS_DEFS[id]) STATUS_DEFS[id].img = `./assets/ui/${f}.webp`; });

const escAttr = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Icono de un estado para la interfaz: la imagen (con el símbolo como texto alternativo) o, sin imagen, el símbolo. */
export function statusIconHtml(id, glyph = null, cls = 'lk-st-ico') {
  const d = STATUS_DEFS[id];
  const g = glyph || d?.icon || '•';
  return d?.img ? `<img class="${cls}" src="${d.img}" alt="${escAttr(g)}" draggable="false">` : escAttr(g);
}
/** Carga las imágenes de los estados antes del primer combate (unos 76 KB): no aparecen a destiempo. */
export function preloadStatusIcons() {
  if (typeof Image === 'undefined' || preloadStatusIcons.done) return;
  preloadStatusIcons.done = true;
  Object.values(STATUS_DEFS).forEach((d) => { if (d.img) { const im = new Image(); im.decoding = 'async'; im.src = d.img; } });
}

export class StatusSystem {
  constructor({ events, gridManager } = {}) {
    this.events = events;
    this.gridManager = gridManager;
    // El sueño se rompe al recibir daño
    if (events) {
      events.on('unit:damaged', ({ unit, actual, shieldAbsorbed }) => {
        if ((actual > 0 || shieldAbsorbed > 0) && this.has(unit, 'sleep')) this.remove(unit, 'sleep', 'woke');
      });
    }
  }

  static list(unit) {
    if (!unit.statuses) unit.statuses = [];
    return unit.statuses;
  }

  get(unit, id) { return StatusSystem.list(unit).find((s) => s.id === id) || null; }
  has(unit, id) { return Boolean(this.get(unit, id)); }

  /** Aplica (o renueva) un estado. Devuelve el estado resultante o null si la unidad es inmune. */
  /**
   * delay: turnos del afectado que el estado espera antes de empezar a contar y a actuar
   * (p. ej. delay 1 = actúa en su turno siguiente al próximo).
   */
  apply(unit, id, { value, duration = 1, source = null, partner = null, delay = 0, data = null } = {}) {
    const def = STATUS_DEFS[id];
    if (!def || !unit || unit.isDead) return null;
    if (StatusSystem.list(unit).some((s) => (STATUS_DEFS[s.id]?.immuneTo || []).includes(id))) {
      this.events?.emit('status:resisted', { unit, status: id, source });
      return null;
    }
    const v = value ?? def.defaultValue ?? 0;
    let st = this.get(unit, id);
    if (st) {
      st.value = def.stack === 'add' ? Math.min(def.maxValue ?? Infinity, st.value + v) : Math.max(st.value, v);
      st.duration = Math.max(st.duration, duration);
      st.source = source || st.source;
      if (partner) st.partner = partner;
      if (data) st.data = data;
    } else {
      st = { id, value: v, duration, source, icon: def.icon };
      if (partner) st.partner = partner;
      if (delay > 0) st.delay = delay;
      if (data) st.data = data;
      StatusSystem.list(unit).push(st);
    }
    unit.updateHUD?.();
    this.events?.emit('status:applied', { unit, status: id, value: st.value, duration: st.duration, source, def });
    return st;
  }

  remove(unit, id, reason = 'removed') {
    const list = StatusSystem.list(unit);
    const i = list.findIndex((s) => s.id === id);
    if (i < 0) return false;
    const [st] = list.splice(i, 1);
    unit.updateHUD?.();
    this.events?.emit('status:expired', { unit, status: id, reason, value: st.value });
    return true;
  }

  /** Quita estados negativos (cleanse) o positivos (dispel). count = cuántos (por defecto todos). */
  clear(unit, kind = 'debuff', count = Infinity, only = null) {
    const ids = StatusSystem.list(unit)
      .filter((s) => STATUS_DEFS[s.id]?.kind === kind && (!only || only.includes(s.id)))
      .map((s) => s.id).slice(0, count);
    ids.forEach((id) => this.remove(unit, id, kind === 'debuff' ? 'cleansed' : 'dispelled'));
    // Las penalizaciones heredadas de PM (unit.buffs 'minusPM') también son negativas
    const clearsPM = !only || only.includes('slowed');
    if (kind === 'debuff' && clearsPM && Array.isArray(unit.buffs)) unit.buffs = unit.buffs.filter((b) => b.type !== 'minusPM');
    return ids.length;
  }

  /** Suma de un modificador (p. ej. 'damageTakenPct') sobre todos los estados de la unidad. */
  mod(unit, key) {
    let total = 0;
    for (const s of unit?.statuses || []) {
      if (s.delay > 0) continue;
      const m = STATUS_DEFS[s.id]?.mod;
      if (m && m[key]) total += m[key] * s.value;
    }
    return total;
  }

  isFeared(unit) { return this.has(unit, 'fear'); }

  /** Barrera: absorbe el golpe (hasta su valor) y se consume. Devuelve el daño que pasa. */
  absorbBarrier(unit, dmg) {
    const st = this.get(unit, 'barrier');
    if (!st || dmg <= 0) return dmg;
    const absorbed = Math.min(dmg, st.value);
    this.remove(unit, 'barrier', 'blocked');
    this.events?.emit('status:blocked', { unit, absorbed });
    return dmg - absorbed;
  }

  /**
   * Reacciones al recibir un golpe de un enemigo (guardas, represalia, reflejo).
   * Devuelve [{ kind: 'damageAttacker', amount } | { kind: 'shieldUnit', unit, amount }] para que SpellManager
   * aplique el daño y los eventos; los estados se aplican aquí.
   */
  onHit(target, attacker, { taken = 0, dist = 1 } = {}) {
    const out = [];
    if (!attacker || attacker === target || attacker.team === target.team || !(taken > 0)) return out;
    const ward = this.get(target, 'ward');
    if (ward?.data && !(ward.data.meleeOnly && dist > 1)) {
      const d = ward.data;
      if (d.apply && !attacker.isDead) this.apply(attacker, d.apply, { value: d.applyValue, duration: d.applyDuration || 1, source: target });
      if (d.gain === 'casterShield' && ward.source && !ward.source.isDead) out.push({ kind: 'shieldUnit', unit: ward.source, amount: d.amount || 0 });
      if (d.gain === 'energized') this.apply(target, 'energized', { value: d.amount || 1, duration: 1, source: ward.source });
      if (d.gain === 'empowered') this.apply(target, 'empowered', { value: d.amount || 20, duration: 2, source: ward.source });
      this.remove(target, 'ward', 'triggered');
    }
    const ret = this.get(target, 'retaliate');
    if (ret && !attacker.isDead) {
      out.push({ kind: 'damageAttacker', amount: ret.value });
      this.remove(target, 'retaliate', 'triggered');
    }
    const refl = this.get(target, 'reflectPct');
    if (refl && !attacker.isDead) out.push({ kind: 'damageAttacker', amount: Math.round(taken * refl.value / 100) });
    return out;
  }
  isHealBlocked(unit) { return this.has(unit, 'healBlock'); }

  // ------------------------------------------------ ciclo de turno

  /**
   * Al empezar el turno de la unidad (después de reponer PA/PM).
   * Devuelve { skip: bool, died: bool }.
   */
  onTurnStart(unit) {
    const list = StatusSystem.list(unit);
    if (!list.length) return { skip: false, died: false };

    // 1. Daño periódico
    for (const st of [...list]) {
      const def = STATUS_DEFS[st.id];
      if (!def?.dot || unit.isDead || st.delay > 0) continue;
      const dmg = Math.max(0, Math.round(st.value));
      if (!dmg) continue;
      const actual = unit.takeDamage(dmg, { ignoreShield: false, source: st.source, kind: 'dot' });
      this.events?.emit('status:tick', { unit, status: st.id, damage: actual, def });
    }
    if (unit.isDead) return { skip: true, died: true };

    // 1b. Regeneración (respeta Herida)
    for (const st of list) {
      if (!STATUS_DEFS[st.id]?.hot || !(st.value > 0) || st.delay > 0) continue;
      if (this.isHealBlocked(unit)) { this.events?.emit('unit:healBlocked', { unit, source: st.source, spell: null }); continue; }
      const healed = unit.heal(Math.round(st.value));
      this.events?.emit('status:tick', { unit, status: st.id, heal: healed, damage: 0, def: STATUS_DEFS[st.id] });
    }

    // 2. Recursos del próximo turno
    for (const st of list) {
      const ts = STATUS_DEFS[st.id]?.turnStart;
      if (!ts || st.delay > 0) continue;
      const n = Math.max(1, st.value || 1);
      if (ts.pa) unit.currentPA = Math.max(0, unit.currentPA + ts.pa * n);
      if (ts.pm) unit.currentPM = Math.max(0, unit.currentPM + ts.pm * n);
    }

    // 3. Control: pierde el turno
    const blocker = list.find((s) => STATUS_DEFS[s.id]?.skipTurn && !(s.delay > 0));
    if (blocker) {
      unit.currentPA = 0;
      unit.currentPM = 0;
      this.events?.emit('status:skipTurn', { unit, status: blocker.id, def: STATUS_DEFS[blocker.id] });
    }
    unit.updateHUD?.();
    return { skip: Boolean(blocker), died: false };
  }

  /** Al terminar el turno de la unidad: bajan las duraciones y caducan los estados. */
  onTurnEnd(unit) {
    for (const st of [...StatusSystem.list(unit)]) {
      if (st.delay > 0) { st.delay -= 1; continue; } // aún en espera: no gasta duración
      st.duration -= 1;
      if (st.duration <= 0) this.remove(unit, st.id, 'expired');
    }
  }
}
