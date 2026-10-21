// ForgeService.js — Estado y reglas de la Forja (pantalla 25 del sistema de diseño). Fuente de verdad única.
//
// Se guarda en la ranura activa: slot.forge = { slp, baxs, mats: { id: n }, jobs: [...], uid, starter }
// (viaja con la partida como el resto del progreso). Sin ranura activa funciona en memoria.
//  · Crear: receta (CRAFT_RECIPES) → oro + materiales → objeto Tier 0 a la Mochila al instante.
//  · Evolucionar: pieza → siguiente de su línea pagando SLP + materiales + esquirlas + bAXS (comisión y rapidez).
//    Tarda horas reales (EVOLUTION_COST.hours / rapidez). La pieza sale de donde esté
//    (ranura o Mochila) y se queda en el yunque; al recogerla vuelve equipada en su ranura si sigue libre, o a la Mochila.
// El oro y el equipo viven en EquipmentManager; aquí solo SLP, bAXS, materiales y yunques.

import { saveSlotManager } from './SaveSlotManager.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import {
  MATERIALS, TIER0_ITEMS, CRAFT_RECIPES, EVOLUTION_COST, FORGE_ANVILS, SPEEDUP_BAXS, SPEEDUP_TIER_MULT, evolutionQuote, nextEvolution,
} from '../tactics/data/EconomyCatalog.js';

export const EQ_SLOTS = ['weapon', 'hat', 'shield', 'body', 'boots'];
const HOUR_MS = 3600 * 1000;

/** Para probar la demo: cada partida nueva recibe una vez este lote (aún no hay botín de materiales ni SLP). */
const STARTER = { slp: 1000, baxs: 100, mats: { mat_copper: 6, mat_slime_goo: 6, mat_chimera_tail: 4, mat_lunar_shard: 1 } };
/** Partidas que ya recibieron el lote anterior (200 SLP · 3 bAXS): se les completa la diferencia una vez. */
const STARTER_V1 = { slp: 200, baxs: 3 };

const tierOf = (id) => (TIER0_ITEMS[id] ? 0 : ITEMS_DB[id]?.tier ?? null);

class ForgeServiceImpl {
  constructor(slots = saveSlotManager) {
    this.slots = slots;
    this.memory = null;
    this.em = null;
    this.onSave = null;
    this.listeners = new Set();
  }

  /** @param {{ equipmentManager: object, onSave?: () => void }} deps */
  init({ equipmentManager, onSave = null }) { this.em = equipmentManager; this.onSave = onSave; }

  _store() {
    const slot = this.slots?.getActiveSlot?.();
    const fresh = () => ({ slp: 0, baxs: 0, mats: {}, jobs: [], uid: 0, starter: false });
    let f;
    if (!slot) f = (this.memory ||= fresh());
    else {
      if (!slot.forge || typeof slot.forge !== 'object') slot.forge = fresh();
      f = slot.forge;
    }
    f.mats ||= {}; f.jobs = Array.isArray(f.jobs) ? f.jobs : []; f.uid ||= 0;
    if (!f.starter) { // lote inicial de la demo (una sola vez por partida)
      f.starter = true;
      f.slp = (f.slp || 0) + STARTER.slp; f.baxs = +((f.baxs || 0) + STARTER.baxs).toFixed(2);
      Object.entries(STARTER.mats).forEach(([id, n]) => { f.mats[id] = (f.mats[id] || 0) + n; });
      f.starterV = 2;
    } else if ((f.starterV || 1) < 2) {
      f.starterV = 2;
      f.slp = (f.slp || 0) + STARTER.slp - STARTER_V1.slp; f.baxs = +((f.baxs || 0) + STARTER.baxs - STARTER_V1.baxs).toFixed(2);
    }
    if ((f.starterV || 1) < 3) { // Hito 46: materiales nuevos. Se quitan los que ya no existen y se da el lote nuevo.
      f.starterV = 3;
      Object.keys(f.mats).forEach((id) => { if (!MATERIALS[id]) delete f.mats[id]; });
      Object.entries(STARTER.mats).forEach(([id, n]) => { f.mats[id] = Math.max(f.mats[id] || 0, n); });
      f.jobs = f.jobs.filter((j) => ITEMS_DB[j.to] && (!j.from || ITEMS_DB[j.from]));
    }
    return f;
  }

  // ------------------------------------------------------------------ lectura
  wallet() { const f = this._store(); return { gold: this.em?.getGold?.() || 0, slp: f.slp || 0, baxs: f.baxs || 0 }; }
  mats() { return { ...this._store().mats }; }
  jobs() { return this._store().jobs.map((j) => ({ ...j, ready: Date.now() >= j.end })); }
  anvilsFree() { return FORGE_ANVILS - this._store().jobs.length; }
  heroName(id) { return this.em?.heroesBase?.[id]?.name || id; }

  /** Coste comprobado contra lo que tienes. `rows` = materiales con { id, need, have }. */
  check({ gold = 0, slp = 0, baxs = 0, mats = {}, shards = 0 }) {
    const w = this.wallet(), m = this._store().mats;
    const rows = Object.entries(mats).map(([id, need]) => ({ id, need, have: m[id] || 0 }));
    if (shards) rows.push({ id: 'mat_lunar_shard', need: shards, have: m.mat_lunar_shard || 0 });
    const ok = gold <= w.gold && slp <= w.slp && baxs <= w.baxs + 1e-9 && rows.every((r) => r.have >= r.need);
    return { gold, slp, baxs, rows, ok };
  }

  recipes() {
    return CRAFT_RECIPES.map((r) => ({ recipe: r, item: ITEMS_DB[r.result], cost: this.check({ gold: r.gold, mats: r.mats }) }));
  }

  /**
   * Solo para trabajos antiguos (sin `held`), en los que el héroe seguía usando la pieza mientras se forjaba,
   * así que se puede mover: la forja la «aparta» allí donde esté para que no se pueda volver a forjar ni vender
   * (antes se duplicaba equipo así). Orden: su ranura → una copia en la Mochila → la ranura de otro héroe.
   * @returns {Map<number, {type:'e', hero:string, slot:string} | {type:'i', index:number}>} uid → sitio
   */
  _claims() {
    const em = this.em, claims = new Map();
    if (!em) return claims;
    const usedE = new Set(), usedI = new Set(), inv = em.inventory || [];
    const jobs = this._store().jobs.filter((j) => j.hero && !j.held); // `held`: la forja ya tiene la pieza (se quitó al evolucionar)
    jobs.forEach((j) => {
      const k = `${j.hero}:${j.slot}`;
      if (em.equipped?.[j.hero]?.[j.slot] === j.from && !usedE.has(k)) { usedE.add(k); claims.set(j.uid, { type: 'e', hero: j.hero, slot: j.slot }); }
    });
    jobs.forEach((j) => {
      if (claims.has(j.uid)) return;
      const i = inv.findIndex((id, n) => id === j.from && !usedI.has(n));
      if (i >= 0) { usedI.add(i); claims.set(j.uid, { type: 'i', index: i }); return; }
      for (const h of Object.keys(em.equipped || {})) {
        const s = EQ_SLOTS.find((x) => em.equipped[h]?.[x] === j.from && !usedE.has(`${h}:${x}`));
        if (s) { usedE.add(`${h}:${s}`); claims.set(j.uid, { type: 'e', hero: h, slot: s }); return; }
      }
    });
    return claims;
  }

  /** Copias de la Mochila apartadas por la forja (no se venden ni se vuelven a forjar): { id: n }. Lo usa la Tienda. */
  reservedInInventory() {
    const inv = this.em?.inventory || [], out = {};
    this._claims().forEach((c) => { if (c.type === 'i') { const id = inv[c.index]; out[id] = (out[id] || 0) + 1; } });
    return out;
  }

  _claimedSets() {
    const e = new Set(), i = new Set();
    this._claims().forEach((c) => (c.type === 'e' ? e.add(`${c.hero}:${c.slot}`) : i.add(c.index)));
    return { e, i };
  }

  /** Piezas que se pueden evolucionar: equipadas (por héroe y ranura) y en la Mochila (una entrada por copia). */
  gear() {
    const em = this.em; if (!em) return [];
    const out = [];
    const claimed = this._claimedSets(); // piezas que ya están en un yunque (estén donde estén)
    const heroes = [...new Set(['sapidae', ...(em.unlockedHeroes || [])])].filter((h) => em.equipped?.[h]);
    heroes.forEach((h) => EQ_SLOTS.forEach((s) => {
      const id = em.equipped[h][s];
      if (id && ITEMS_DB[id] && !claimed.e.has(`${h}:${s}`)) out.push({ key: `e:${h}:${s}`, id, hero: h, slot: s });
    }));
    const seen = {};
    (em.inventory || []).forEach((id, n) => {
      if (claimed.i.has(n)) return;
      const it = ITEMS_DB[id]; if (!it || !EQ_SLOTS.includes(it.slot)) return;
      seen[id] = (seen[id] || 0) + 1;
      out.push({ key: `i:${id}:${seen[id]}`, id, hero: null, slot: it.slot });
    });
    return out;
  }

  quote(itemId, speed = 1) {
    const to = nextEvolution(itemId); if (!to || !ITEMS_DB[to]) return null;
    const tier = tierOf(to), q = evolutionQuote(tier, speed); if (!q) return null;
    return { to, tier, hours: q.hours, feeBaxs: q.feeBaxs, speedBaxs: q.speedBaxs, cost: this.check({ slp: q.slp, baxs: q.baxs, mats: q.mats, shards: q.shards }) };
  }

  // ------------------------------------------------------------------ acciones
  _pay(c) {
    const f = this._store();
    if (c.gold) this.em.addGold(-c.gold);
    f.slp -= c.slp || 0; f.baxs = +((f.baxs || 0) - (c.baxs || 0)).toFixed(2);
    c.rows.forEach((r) => { f.mats[r.id] = (f.mats[r.id] || 0) - r.need; });
  }

  craft(recipeId) {
    const r = CRAFT_RECIPES.find((x) => x.id === recipeId); if (!r || !ITEMS_DB[r.result]) return { ok: false, why: 'Receta desconocida' };
    const c = this.check({ gold: r.gold, mats: r.mats }); if (!c.ok) return { ok: false, why: 'Te falta algo' };
    this._pay(c);
    this.em.inventory.push(r.result);
    this._commit();
    return { ok: true, item: ITEMS_DB[r.result] };
  }

  evolve(entry, speed = 1) {
    if (this.anvilsFree() <= 0) return { ok: false, why: 'Los yunques están ocupados' };
    const q = this.quote(entry.id, speed); if (!q) return { ok: false, why: 'Esta pieza ya está en lo más alto' };
    if (!q.cost.ok) return { ok: false, why: 'Te falta algo' };
    const em = this.em, f = this._store();
    const claimed = this._claimedSets();
    if (entry.hero) {
      if (em.equipped?.[entry.hero]?.[entry.slot] !== entry.id) return { ok: false, why: 'La pieza ya no está equipada' };
      if (claimed.e.has(`${entry.hero}:${entry.slot}`)) return { ok: false, why: 'Esa pieza ya está en la forja' };
      em.equipped[entry.hero][entry.slot] = null; // la pieza se queda en el yunque hasta recoger la nueva
      if (entry.hero === 'sapidae' || em.heroesBase?.[entry.hero]?.isSapidae) em._updateSapidaePortrait?.();
    } else {
      const i = em.inventory.findIndex((id, n) => id === entry.id && !claimed.i.has(n));
      if (i < 0) return { ok: false, why: 'La pieza ya no está en la Mochila' };
      em.inventory.splice(i, 1);
    }
    this._pay(q.cost);
    const now = Date.now();
    f.jobs.push({ uid: ++f.uid, from: entry.id, to: q.to, hero: entry.hero, slot: entry.slot, held: true, hours: q.hours, start: now, end: now + q.hours * HOUR_MS, speed });
    this._commit();
    return { ok: true, hours: q.hours, to: ITEMS_DB[q.to] };
  }

  collect(uid) {
    const f = this._store(), j = f.jobs.find((x) => x.uid === uid);
    if (!j || Date.now() < j.end) return { ok: false };
    const em = this.em, at = j.hero && !j.held ? this._claims().get(j.uid) : null;
    if (j.held && j.hero && em.equipped?.[j.hero] && !em.equipped[j.hero][j.slot]) {
      em.equipped[j.hero][j.slot] = j.to; // vuelve equipada en su sitio, ya evolucionada
      if (j.hero === 'sapidae' || em.heroesBase?.[j.hero]?.isSapidae) em._updateSapidaePortrait?.();
    } else if (at?.type === 'e') {
      em.equipped[at.hero][at.slot] = j.to; // se mejora sola donde está (también si se la pasaron a otro héroe)
      if (at.hero === 'sapidae' || em.heroesBase?.[at.hero]?.isSapidae) em._updateSapidaePortrait?.();
    } else if (at?.type === 'i') {
      em.inventory[at.index] = j.to; // la desequiparon mientras tanto: se mejora en la Mochila
    } else {
      em.inventory.push(j.to); // venía de la Mochila (o la pieza ya no está en ningún sitio)
    }
    f.jobs = f.jobs.filter((x) => x !== j);
    this._commit();
    return { ok: true, from: ITEMS_DB[j.from], to: ITEMS_DB[j.to], hero: j.hero };
  }

  /** Suma (o resta, con n negativo) materiales a la bolsa. Lo usa la Tienda. Devuelve false si no alcanzan.
   *  save = false: no guarda la partida (la Tienda guarda una sola vez al terminar la compra o la venta). */
  addMats(id, n, save = true) {
    const f = this._store();
    if ((f.mats[id] || 0) + n < 0) return false;
    f.mats[id] = (f.mats[id] || 0) + n;
    this._commit(save);
    return true;
  }

  /** Hito 48: regalos del tutorial (SLP y bAXS). */
  grant({ slp = 0, baxs = 0 } = {}) {
    const f = this._store();
    f.slp = (f.slp || 0) + slp;
    f.baxs = +((f.baxs || 0) + baxs).toFixed(2);
    this._commit();
  }

  /** Opciones para acelerar una pieza en curso: multiplicadores mayores que el actual, con su coste (la diferencia) en bAXS. */
  speedOptions(uid) {
    const j = this._store().jobs.find((x) => x.uid === uid); if (!j || Date.now() >= j.end) return [];
    const cur = j.speed || 1, tier = tierOf(j.to), left = (j.end - Date.now()) / HOUR_MS;
    const price = (x) => +((SPEEDUP_BAXS[x] ?? 0) * (SPEEDUP_TIER_MULT[tier] ?? 1)).toFixed(2);
    return [2, 4].filter((x) => x > cur).map((x) => ({ x, baxs: +(price(x) - price(cur)).toFixed(2), leftHours: left * cur / x }));
  }

  speedUp(uid, x) {
    const f = this._store(), j = f.jobs.find((y) => y.uid === uid);
    const o = this.speedOptions(uid).find((y) => y.x === x);
    if (!j || !o) return { ok: false, why: 'Ya no se puede acelerar' };
    if (o.baxs > (f.baxs || 0) + 1e-9) return { ok: false, why: `Te faltan ${+(o.baxs - (f.baxs || 0)).toFixed(2)} bAXS` };
    const now = Date.now();
    f.baxs = +((f.baxs || 0) - o.baxs).toFixed(2);
    j.end = now + o.leftHours * HOUR_MS;
    j.hours = (j.end - j.start) / HOUR_MS;
    j.speed = x;
    this._commit();
    return { ok: true, leftHours: o.leftHours };
  }

  /** Pruebas: termina ya todas las piezas en curso (window.lunakaiForge.finishAll()). */
  finishAll() { this._store().jobs.forEach((j) => { j.end = Date.now(); }); this._commit(false); }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  _commit(save = true) {
    try { this.em?._notifyChange?.(); } catch { /* nada */ }
    const sm = this.slots;
    if (save && sm?.activeSlotId && sm.getActiveSlot?.()) {
      sm.getActiveSlot().lastSaved = Date.now();
      try { this.onSave?.(); } catch { /* nada */ }
    }
    this.listeners.forEach((fn) => { try { fn(); } catch { /* nada */ } });
  }
}

export const ForgeService = new ForgeServiceImpl();
export { MATERIALS, TIER0_ITEMS, EVOLUTION_COST, FORGE_ANVILS };
