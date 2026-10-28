// GatheringService.js — Reglas y estado de la recolección (pesca, tala, minería y plantas). Sin three ni DOM.
//
// Se guarda en la ranura activa: slot.gathering = { until: { idPunto: msEpoch }, total: { pesca…: n } }
//   · until: hasta cuándo está agotado cada punto (tiempo real: también corre con el juego cerrado).
//   · total: cuántas veces se ha recolectado de cada tipo (para logros o misiones futuras).
// El botín va a la bolsa de materiales de la Forja (ForgeService.addMats); la comida (pescado, koi) va a la mochila.
// Consola: window.lunakaiGathering (estado, reset(), give…).

import { saveSlotManager } from './SaveSlotManager.js';
import { ForgeService } from './ForgeService.js';
import { MATERIALS } from '../tactics/data/EconomyCatalog.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import { GATHER_RULES, GATHER_LOOT, GATHER_NODE_BY_ID, GATHER_NODES } from '../tactics/data/GatheringCatalog.js';

class GatheringServiceImpl {
  constructor({ slots = saveSlotManager, forge = ForgeService, rules = GATHER_RULES, now = () => Date.now() } = {}) {
    this.slots = slots;
    this.forge = forge;
    this.rules = rules;
    this.now = now;
    this.memory = null;
    this.listeners = new Set();
  }

  _store() {
    const fresh = () => ({ until: {}, total: {} });
    const slot = this.slots?.getActiveSlot?.();
    let g;
    if (!slot) g = (this.memory ||= fresh());
    else {
      if (!slot.gathering || typeof slot.gathering !== 'object') slot.gathering = fresh();
      g = slot.gathering;
    }
    if (!g.until || typeof g.until !== 'object') g.until = {};
    if (!g.total || typeof g.total !== 'object') g.total = {};
    return g;
  }

  /** ms que faltan para que el punto vuelva (0 = disponible). */
  remainingMs(nodeId) {
    const t = this._store().until[nodeId] || 0;
    return Math.max(0, t - this.now());
  }

  isAvailable(nodeId) { return Boolean(GATHER_NODE_BY_ID[nodeId]) && this.remainingMs(nodeId) <= 0; }

  /** Estado de todos los puntos (para el minimapa y la consola). */
  status() {
    return GATHER_NODES.map((n) => ({ id: n.id, zone: n.zone, kind: n.kind, available: this.isAvailable(n.id), remainingMs: this.remainingMs(n.id) }));
  }

  /**
   * Tira el botín sin aplicarlo: 1–3 del material y un 10 % de un raro. rng() en [0, 1).
   * bonus (Hito 87, pesca «¡Perfecto!»): { extra: unidades de más, rareMul: multiplica la probabilidad del raro }.
   */
  roll(nodeId, rng = Math.random, bonus = null) {
    const node = GATHER_NODE_BY_ID[nodeId];
    const table = node && GATHER_LOOT[node.loot];
    if (!table) return [];
    const { amountMin: a, amountMax: b, rareChance } = this.rules;
    const n = a + Math.min(b - a, Math.floor(rng() * (b - a + 1))) + Math.max(0, bonus?.extra | 0);
    const out = [{ id: table.mat, n, rare: false }];
    if (table.rare && rng() < rareChance * (bonus?.rareMul || 1)) out.push({ id: table.rare, n: 1, rare: true });
    return out;
  }

  /**
   * Recolecta un punto: aplica el botín, lo agota durante respawnMs y guarda la partida una vez.
   * @returns {{ ok: boolean, why?: string, loot?: {id, n, rare, name}[], node?: object }}
   */
  gather(nodeId, rng = Math.random, bonus = null) {
    const node = GATHER_NODE_BY_ID[nodeId];
    if (!node) return { ok: false, why: 'Ese punto no existe' };
    const left = this.remainingMs(nodeId);
    if (left > 0) return { ok: false, why: `Vuelve en ${formatWait(left)}`, node };
    const loot = this.roll(nodeId, rng, bonus).map((l) => ({ ...l, name: MATERIALS[l.id]?.name || ITEMS_DB[l.id]?.name || l.id }));
    const g = this._store();
    g.until[nodeId] = this.now() + this.rules.respawnMs;
    g.total[node.kind] = (g.total[node.kind] || 0) + 1;
    // Objetos (el pescado y el koi son comida) a la mochila; materiales a la bolsa de la Forja. Una sola escritura.
    const items = loot.filter((l) => !MATERIALS[l.id] && ITEMS_DB[l.id]);
    const mats = loot.filter((l) => MATERIALS[l.id]);
    if (items.length) this.forge?.em?.addItemsToInventory?.(items.flatMap((l) => Array(l.n).fill(l.id)));
    mats.forEach((l, i) => this.forge?.addMats?.(l.id, l.n, i === mats.length - 1));
    if (!mats.length) this._save();
    this._emit({ type: 'gather', node, loot });
    return { ok: true, loot, node };
  }

  /** Pruebas: deja todos los puntos disponibles (o uno). */
  reset(nodeId = null) {
    const g = this._store();
    if (nodeId) delete g.until[nodeId]; else g.until = {};
    this._save();
    this._emit({ type: 'reset', nodeId });
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(ev) { this.listeners.forEach((fn) => { try { fn(ev); } catch { /* nada */ } }); }
  _save() {
    const sm = this.slots;
    if (sm?.activeSlotId && sm.getActiveSlot?.()) {
      sm.getActiveSlot().lastSaved = Date.now();
      try { this.forge?.onSave?.(); } catch { /* nada */ }
    }
  }
}

/** 7 min 12 s → «7 min» · 45 s → «45 s». */
export function formatWait(ms) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.ceil(s / 60);
  return `${m} min`;
}

export { GatheringServiceImpl };
export const GatheringService = new GatheringServiceImpl();
