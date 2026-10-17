// AxieCareService.js — Axie Care: las tres formas de subir el vínculo fuera de combate (GDD §2.1).
//
//   Acariciar           +5 %   con recarga (PET_COOLDOWN_MS)
//   Dar de comer        +10 / +15 / +25 % según el alimento (item.effect.bond); consume el objeto
//   Caminar juntos      +2 % cada 500 m recorridos en el mundo abierto
//
// El vínculo vive en BondService (ranura de guardado). El estado propio de Axie Care también va en la
// ranura: slot.axieCare = { petAt: { heroId: ms }, walkMeters: { heroId: m }, starterFood: bool }.
// Solo se usa fuera de combate; el combate no cambia el vínculo.

import { BondService } from './BondService.js';
import { saveSlotManager } from './SaveSlotManager.js';

export const PET_BOND = 5;
export const PET_COOLDOWN_MS = 2 * 60 * 1000;   // 2 minutos (demo)
export const WALK_STEP_METERS = 500;
export const WALK_BOND = 2;
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
    if (!s.petReady) return { ok: false, reason: 'cooldown', leftMs: s.petLeftMs };
    const before = s.bond;
    const after = this.bond.add(heroId, PET_BOND);
    this._state().petAt[heroId] = this.now();
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
    const inv = this.em?.inventory || [];
    const idx = inv.indexOf(itemId);
    if (idx < 0) return { ok: false, reason: 'no_item' };
    inv.splice(idx, 1);
    const before = this.bond.get(heroId);
    const after = this.bond.add(heroId, this.items[itemId].effect.bond);
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
