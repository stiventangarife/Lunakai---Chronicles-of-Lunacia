// RuneCharmService.js — Runa y charms equipados en cada Axie. Fuente de verdad única.
//
// Se guarda en la ranura de guardado activa: slot.runeCharms = { heroId: { rune: id|null, charms: { eyes, ears, mouth, horn, back, tail } } }
// (viaja con la partida y se sincroniza con la nube como el resto del progreso). Sin ranura activa funciona en memoria.
// El combate lee get(heroId) al empezar (SpellManager.runeCharms.setupCombat, tactics/combat/RuneCharmEffects.js).
// Consola: window.lunakaiRuneCharms (y lkDebug.rune / lkDebug.charm / lkDebug.runes).

import { saveSlotManager } from './SaveSlotManager.js';
import { PP_MAX, RUNE_BY_ID, CHARM_BY_ID, ppAllocate, ppCanSet } from '../tactics/data/RunesCharms.js';

export const PART_ORDER = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
const empty = () => ({ rune: null, charms: Object.fromEntries(PART_ORDER.map((p) => [p, null])) });

class RuneCharmServiceImpl {
  constructor(slots = saveSlotManager) {
    this.slots = slots;
    this.memory = {};
    this.listeners = new Set();
  }

  _store() {
    const slot = this.slots?.getActiveSlot?.();
    if (!slot) return this.memory;
    if (!slot.runeCharms || typeof slot.runeCharms !== 'object') slot.runeCharms = {};
    return slot.runeCharms;
  }

  /** Lo equipado en un Axie (copia): { rune, charms: { parte: id|null } }. */
  get(heroId) {
    const cur = this._store()[heroId];
    const base = empty();
    if (!cur) return base;
    return { rune: RUNE_BY_ID[cur.rune] ? cur.rune : null, charms: { ...base.charms, ...Object.fromEntries(Object.entries(cur.charms || {}).filter(([p, id]) => p in base.charms && (id === null || CHARM_BY_ID[id]))) } };
  }

  ppUsed(heroId) { return Object.values(this.get(heroId).charms).reduce((a, id) => a + (id ? CHARM_BY_ID[id]?.pp || 0 : 0), 0); }
  ppLeft(heroId) { return PP_MAX - this.ppUsed(heroId); }

  setRune(heroId, runeId) {
    const cur = this.get(heroId);
    cur.rune = runeId || null;
    this._write(heroId, cur);
  }

  /**
   * PP por clase del Axie (GDD §3): { pools, used, left, over, ok, total, totalUsed }.
   * classes = { axieClass, partClasses: { eyes: 'bug', … } }.
   */
  ppReport(heroId, { axieClass, partClasses } = {}) {
    return ppAllocate(axieClass, partClasses || {}, this.get(heroId).charms);
  }

  /**
   * Engarza (o retira con null) un charm en una parte. Devuelve false si no hay PP suficientes.
   * Con classes ({ axieClass, partClasses }) comprueba los PP de cada clase; sin ellas, solo el total de 15.
   */
  setCharm(heroId, part, charmId, classes = null) {
    const cur = this.get(heroId);
    if (!(part in cur.charms)) return false;
    if (classes && charmId && !ppCanSet(classes.axieClass, classes.partClasses || {}, cur.charms, part, charmId).ok) return false;
    const prevPP = cur.charms[part] ? CHARM_BY_ID[cur.charms[part]]?.pp || 0 : 0;
    const nextPP = charmId ? CHARM_BY_ID[charmId]?.pp || 0 : 0;
    if (this.ppUsed(heroId) - prevPP + nextPP > PP_MAX) return false;
    cur.charms[part] = charmId || null;
    this._write(heroId, cur);
    return true;
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  _write(heroId, data) {
    this._store()[heroId] = data;
    const sm = this.slots;
    if (sm?.activeSlotId && sm.getActiveSlot?.()) {
      sm.getActiveSlot().lastSaved = Date.now();
      if (typeof sm._saveToStorage === 'function') sm._saveToStorage([sm.activeSlotId]);
    }
    this.listeners.forEach((fn) => { try { fn(heroId, data); } catch { /* nada */ } });
  }
}

export const RuneCharmService = new RuneCharmServiceImpl();
if (typeof window !== 'undefined') window.lunakaiRuneCharms = RuneCharmService;
export { RuneCharmServiceImpl };
