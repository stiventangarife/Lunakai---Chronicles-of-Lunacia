// CombatEvents.js — Bus de eventos del combate.
//
// La lógica (SpellManager) solo decide QUÉ pasa y lo anuncia aquí; la presentación
// (VFX, sonidos, textos flotantes, sacudidas de cámara) escucha estos eventos.
// Así se puede conectar otro motor de VFX sin tocar las reglas del combate.
//
// Eventos que emite SpellManager (payload entre llaves):
//   spell:cast        { caster, spell, targetCell, casterPos, targetPos }   coste pagado
//   spell:windup      { caster, spell }                                     animación de ataque
//   spell:projectile  { caster, spell, casterPos, targetPos }               ASÍNCRONO: se espera
//   spell:impact      { caster, spell, casterPos, targetPos, affectedCells } llegada al objetivo
//   spell:barricade   { caster, spell, cell, pos }
//   spell:transpose   { caster, target, spell, casterPos, targetPos }
//   spell:aura        { caster, spell, casterPos }
//   spell:landing     { caster, spell, pos }                                salto: aterrizaje
//   spell:jumpImpact  { caster, spell, pos }                                salto: onda final
//   spell:resolved    { caster, spell, targetCell }                         fin del hechizo
//   unit:damaged      { unit, source, spell, actual, shieldAbsorbed, isCrit, plain }
//   unit:healed       { unit, source, spell, amount }
//   unit:shielded     { unit, source, spell, amount, pos?, variant? }
//   unit:resourceGained { unit, source, spell, pa?, pm? }
//   unit:resourceLost   { unit, source, spell, pa?, pm? }
//   unit:pushStart    { unit, source, spell }
//   unit:collision    { unit, source, damage, first }
//   unit:evaded       { unit, source, spell }                               esquiva de runas (Pure Luck, Gates of Unity)
//   runeCharm:proc    { unit, label }                                       se activa una runa o un charm (RuneCharmEffects)

export class CombatEvents {
  constructor() {
    this._handlers = new Map();
  }

  /** Suscribe un oyente. Devuelve una función para darse de baja. */
  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this._handlers.get(event);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }

  /** Emite y no espera a nadie (efectos "dispara y olvida"). */
  emit(event, payload) {
    const list = this._handlers.get(event);
    if (!list || !list.length) return;
    for (const fn of [...list]) {
      try { fn(payload); } catch (e) { console.warn(`[CombatEvents] ${event}:`, e); }
    }
  }

  /**
   * Emite y devuelve una promesa SOLO si algún oyente devolvió una (p. ej. un proyectil
   * que debe llegar antes del daño). Si nadie devuelve promesa, devuelve undefined y el
   * llamador sigue sin ceder el turno: `const p = events.emitAsync(...); if (p) await p;`
   */
  emitAsync(event, payload) {
    const list = this._handlers.get(event);
    if (!list || !list.length) return undefined;
    const pending = [];
    for (const fn of [...list]) {
      try {
        const r = fn(payload);
        if (r && typeof r.then === 'function') pending.push(r.catch((e) => console.warn(`[CombatEvents] ${event}:`, e)));
      } catch (e) { console.warn(`[CombatEvents] ${event}:`, e); }
    }
    return pending.length ? Promise.all(pending) : undefined;
  }

  clear() { this._handlers.clear(); }
}
