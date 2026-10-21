// AxieCareService.js — Axie Care: las tres formas de subir el vínculo fuera de combate (GDD §2.1).
//
//   Acariciar           +5 %   con recarga (PET_COOLDOWN_MS)
//   Dar de comer        +3 / +5 / +8 % según el alimento (item.effect.bond); consume el objeto
//   Caminar juntos      +0,5 % cada 500 m recorridos en el mundo abierto
//
// El vínculo también baja (18-oct):
//   Jugando             −1 % cada 10 min de juego si en los últimos 10 min no se le dio de comer ni se le acarició
//   Sin jugar           −5 % por día con el juego cerrado (proporcional: 12 h = −2,5 %)
// Solo afecta al Axie compañero (el que recibe los cuidados). Nunca baja de 0 %.
//
// El vínculo vive en BondService (ranura de guardado). El estado propio de Axie Care también va en la
// ranura: slot.axieCare = { petAt: { heroId: ms }, walkMeters: { heroId: m }, starterFood: bool }.
// Solo se usa fuera de combate; el combate no cambia el vínculo.

import { BondService } from './BondService.js';
import { saveSlotManager } from './SaveSlotManager.js';

export const PET_BOND = 5;
export const PET_COOLDOWN_MS = 2 * 60 * 1000;   // 2 minutos (demo)
export const WALK_STEP_METERS = 500;
export const WALK_BOND = 0.5;
export const DECAY_STEP_MS = 10 * 60 * 1000;     // cada 10 min de juego…
export const DECAY_BOND = 1;                      // …−1 % si no hubo cuidados en ese tiempo
export const OFFLINE_DECAY_PER_DAY = 5;           // −5 % por día sin jugar
const DAY_MS = 24 * 60 * 60 * 1000;
export const STARTER_FOOD = ['food_berry', 'food_berry', 'food_berry'];

/** Estado emocional según el vínculo (GDD §2.1 B). */
export function moodOf(bond) {
  if (bond >= 76) return { id: 'soul', label: 'Resonancia del alma', icon: '💜' };
  if (bond >= 51) return { id: 'loyal', label: 'Compañero fiel', icon: '💚' };
  if (bond >= 26) return { id: 'neutral', label: 'Neutral', icon: '💛' };
  return { id: 'neglected', label: 'Desatendido', icon: '💢' };
}

export class AxieCareService {
  /**
   * @param {object} deps
   *   equipmentManager  inventario (array de ids) y escuadrón (getSquad)
   *   itemsDb           ITEMS_DB
   *   bond              BondService (inyectable en pruebas)
   *   slots             SaveSlotManager (inyectable en pruebas)
   *   now               reloj (inyectable en pruebas)
   *   onSave            se llama tras cada cambio (guardar inventario/progreso)
   */
  constructor({ equipmentManager, itemsDb = {}, bond = BondService, slots = saveSlotManager, now = () => Date.now(), onSave = null } = {}) {
    this.em = equipmentManager;
    this.items = itemsDb;
    this.bond = bond;
    this.slots = slots;
    this.now = now;
    this.onSave = onSave;
    this.memory = {}; // sin ranura activa (pruebas, menús)
    this.listeners = new Set();
  }

  // ------------------------------------------------ estado guardado
  _state() {
    const holder = this.slots?.getActiveSlot?.() || this.memory;
    if (!holder.axieCare || typeof holder.axieCare !== 'object') holder.axieCare = { petAt: {}, walkMeters: {}, starterFood: false };
    const st = holder.axieCare;
    st.petAt = st.petAt || {};
    st.walkMeters = st.walkMeters || {};
    st.careAt = st.careAt || {}; // último cuidado (comida o caricia) por Axie
    return st;
  }

  _persist() {
    const sm = this.slots;
    if (sm?.activeSlotId && sm.getActiveSlot?.() && typeof sm._saveToStorage === 'function') {
      sm.getActiveSlot().lastSaved = this.now();
      sm._saveToStorage([sm.activeSlotId]);
    }
    try { this.onSave?.(); } catch { /* nada */ }
  }

  _emit(evt) { this.listeners.forEach((fn) => { try { fn(evt); } catch { /* nada */ } }); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  // ------------------------------------------------ compañero
  /** Axie que recibe el cuidado: el principal del escuadrón (squad[1]). */
  companionId() {
    const squad = typeof this.em?.getSquad === 'function' ? this.em.getSquad() : [];
    return squad[1] || 'kotaro';
  }

  status(heroId = this.companionId()) {
    const bond = this.bond.get(heroId);
    const st = this._state();
    const last = st.petAt[heroId] || 0;
    const petLeftMs = Math.max(0, last + PET_COOLDOWN_MS - this.now());
    const walked = st.walkMeters[heroId] || 0;
    return {
      heroId, bond, mood: moodOf(bond), max: bond >= 100,
      petReady: petLeftMs === 0, petLeftMs,
      walkMeters: walked, walkToNext: WALK_STEP_METERS - (walked % WALK_STEP_METERS),
      foods: this.foods(),
    };
  }

  // ------------------------------------------------ acariciar
  pet(heroId = this.companionId()) {
    const s = this.status(heroId);
    // cooldownFree (Hito 48): en el tutorial se puede acariciar sin esperar
    if (!s.petReady && !this.cooldownFree) return { ok: false, reason: 'cooldown', leftMs: s.petLeftMs };
    const before = s.bond;
    const after = this.bond.add(heroId, PET_BOND);
    this._state().petAt[heroId] = this.now();
    this._state().careAt[heroId] = this.now();
    this._persist();
    const res = { ok: true, kind: 'pet', heroId, before, after, gained: after - before };
    this._emit(res);
    return res;
  }

  // ------------------------------------------------ comida
  isFood(itemId) { return Boolean(this.items[itemId]?.effect?.bond); }

  /** Alimentos del inventario agrupados: [{ id, item, count, bond }] ordenados de menor a mayor vínculo. */
  foods() {
    const inv = this.em?.inventory || [];
    const counts = {};
    inv.forEach((id) => { if (this.isFood(id)) counts[id] = (counts[id] || 0) + 1; });
    return Object.entries(counts)
      .map(([id, count]) => ({ id, item: this.items[id], count, bond: this.items[id].effect.bond }))
      .sort((a, b) => a.bond - b.bond);
  }

  feed(itemId, heroId = this.companionId()) {
    if (!this.isFood(itemId)) return { ok: false, reason: 'not_food' };
    // Con el vínculo al 100 % no se gasta la comida (desde Axie Care o desde la Mochila)
    if (this.bond.get(heroId) >= 100) return { ok: false, reason: 'full' };
    const inv = this.em?.inventory || [];
    const idx = inv.indexOf(itemId);
    if (idx < 0) return { ok: false, reason: 'no_item' };
    inv.splice(idx, 1);
    const before = this.bond.get(heroId);
    const after = this.bond.add(heroId, this.items[itemId].effect.bond);
    this._state().careAt[heroId] = this.now();
    this._persist();
    const res = { ok: true, kind: 'feed', heroId, itemId, item: this.items[itemId], before, after, gained: after - before };
    this._emit(res);
    return res;
  }

  /** Regalo de bienvenida: 3 mandarinas lunares la primera vez que se abre Axie Care en la partida. */
  grantStarterFood() {
    const st = this._state();
    if (st.starterFood) return [];
    st.starterFood = true;
    const ids = STARTER_FOOD.filter((id) => this.items[id]);
    if (this.em) {
      if (typeof this.em.addItemsToInventory === 'function') this.em.addItemsToInventory(ids);
      else ids.forEach((id) => this.em.inventory.push(id));
    }
    this._persist();
    return ids;
  }

  // ------------------------------------------------ bajada del vínculo
  /**
   * Al cargar la partida: −5 % por día que pasó desde la última vez que se jugó (proporcional).
   * Empieza también la cuenta de tiempo de juego. Devuelve el % perdido.
   */
  startSession(heroId = this.companionId()) {
    const st = this._state();
    const now = this.now();
    let lost = 0;
    if (typeof st.lastSeenAt === 'number' && now > st.lastSeenAt) {
      const loss = Math.round(((now - st.lastSeenAt) / DAY_MS) * OFFLINE_DECAY_PER_DAY * 10) / 10;
      if (loss > 0) {
        const r = this.bond.lose(heroId, loss);
        lost = r.lost;
        if (lost > 0) this._emit({ ok: true, kind: 'decay_offline', heroId, before: r.before, after: r.after, gained: -lost });
      }
    }
    st.lastSeenAt = now;
    // El tiempo sin cuidados cuenta desde que empieza la sesión
    st.careAt[heroId] = now;
    this._playMs = 0;
    this._persist();
    return lost;
  }

  /**
   * Tiempo de juego (dtMs con el juego abierto). Cada 10 min: −1 % si no hubo comida ni caricia en esos 10 min.
   * También anota «última vez visto» para la bajada sin jugar. Devuelve el % perdido en esta llamada.
   */
  tickPlay(dtMs, heroId = this.companionId()) {
    if (!(dtMs > 0)) return 0;
    const st = this._state();
    const now = this.now();
    st.lastSeenAt = now; // se guarda con el siguiente guardado de la partida
    this._playMs = (this._playMs || 0) + dtMs;
    let lost = 0;
    while (this._playMs >= DECAY_STEP_MS) {
      this._playMs -= DECAY_STEP_MS;
      if (now - (st.careAt[heroId] || 0) >= DECAY_STEP_MS) {
        const r = this.bond.lose(heroId, DECAY_BOND);
        lost += r.lost;
        if (r.lost > 0) this._emit({ ok: true, kind: 'decay', heroId, before: r.before, after: r.after, gained: -r.lost });
      }
    }
    if (lost > 0) this._persist();
    return lost;
  }

  // ------------------------------------------------ paseo
  /** Suma metros caminados juntos. Devuelve el % de vínculo ganado en esta llamada (0 si ninguno). */
  addWalk(meters, heroId = this.companionId()) {
    if (!(meters > 0)) return 0;
    const st = this._state();
    const before = st.walkMeters[heroId] || 0;
    const after = before + meters;
    st.walkMeters[heroId] = after;
    const steps = Math.floor(after / WALK_STEP_METERS) - Math.floor(before / WALK_STEP_METERS);
    if (steps > 0) {
      const b0 = this.bond.get(heroId);
      const b1 = this.bond.add(heroId, steps * WALK_BOND);
      this._persist();
      const res = { ok: true, kind: 'walk', heroId, before: b0, after: b1, gained: b1 - b0, meters: after };
      this._emit(res);
      return res.gained;
    }
    return 0;
  }
}
