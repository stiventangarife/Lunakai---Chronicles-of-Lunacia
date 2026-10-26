// BondService.js — Vínculo (0–100 %) entre el Sapidae y cada Axie. Fuente de verdad única.
//
// - Se guarda en la ranura de guardado activa (slot.bond = { heroId: valor }), así viaja con la partida
//   y se sincroniza con la nube como el resto del progreso.
// - Solo cambia FUERA de combate (Axie Care: alimentar, acariciar…; llegará más adelante). Las derrotas
//   del escuadrón lo bajan (CombatEndScreen). Al 100 % el Axie principal habilita su Ultimate.
// - Migración: si la ranura aún no tiene valor para un Axie, se toma el del vínculo de demostración
//   guardado en este navegador (lunakai_demo_bond) o, si no hay, el valor de demostración por defecto.
// - Sin ranura activa (pruebas, menús) funciona en memoria.

import { saveSlotManager } from './SaveSlotManager.js';
import * as i18n from '../i18n/i18n.js';

const LEGACY_KEY = 'lunakai_demo_bond';
const hash = (str) => [...String(str)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
// Admite décimas (paseo +0,5 %, bajada por tiempo sin jugar)
const clamp = (v) => Math.max(0, Math.min(100, Math.round((Number(v) || 0) * 10) / 10));

/** Vínculo para mostrar: «63» o «63,5». */
export const formatBond = (v) => { const r = Math.round((Number(v) || 0) * 10) / 10; return Number.isInteger(r) ? String(r) : (i18n.lang() === 'es' ? r.toFixed(1).replace('.', ',') : r.toFixed(1)); }; // coma decimal solo en español (Hito 62)

export const BOND_MAX = 100;

class BondServiceImpl {
  constructor(slots = saveSlotManager) {
    this.slots = slots;
    this.memory = {}; // sin ranura activa
    this.listeners = new Set();
  }

  _legacy() {
    try { return JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}'); } catch { return {}; }
  }

  _store() {
    const slot = this.slots?.getActiveSlot?.();
    if (!slot) return this.memory;
    if (!slot.bond || typeof slot.bond !== 'object') slot.bond = {};
    return slot.bond;
  }

  /** Vínculo actual con un Axie (0–100). */
  get(heroId) {
    if (!heroId) return 0;
    const store = this._store();
    if (typeof store[heroId] === 'number') return store[heroId];
    const legacy = this._legacy()[heroId];
    return typeof legacy === 'number' ? clamp(legacy) : 40 + (hash(heroId) % 41);
  }

  /** Fija el vínculo y lo guarda en la ranura activa. Devuelve el valor guardado. */
  set(heroId, value) {
    if (!heroId) return 0;
    const before = this.get(heroId);
    const v = clamp(value);
    this._store()[heroId] = v;
    this._persist();
    if (v !== before) this.listeners.forEach((fn) => { try { fn(heroId, v, before); } catch { /* nada */ } });
    return v;
  }

  add(heroId, amount) { return this.set(heroId, this.get(heroId) + amount); }

  /** Resta vínculo (derrotas). Devuelve { before, after, lost }. */
  lose(heroId, amount) {
    const before = this.get(heroId);
    const after = this.set(heroId, before - amount);
    return { before, after, lost: before - after };
  }

  isMax(heroId) { return this.get(heroId) >= BOND_MAX; }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  _persist() {
    const sm = this.slots;
    if (!sm?.activeSlotId || !sm.getActiveSlot?.()) return;
    const slot = sm.getActiveSlot();
    slot.lastSaved = Date.now();
    if (typeof sm._saveToStorage === 'function') sm._saveToStorage([sm.activeSlotId]);
  }
}

export const BondService = new BondServiceImpl();
export { BondServiceImpl };
