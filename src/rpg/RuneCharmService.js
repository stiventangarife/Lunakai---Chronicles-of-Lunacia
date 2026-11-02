// RuneCharmService.js — Runa y charms equipados en cada Axie, y la bolsa de runas y charms del jugador. Fuente de verdad única.
//
// Bolsa (Hito 54): slot.runeCharmBag = { runes: { id: n }, charms: { id: n } } — las que TIENES, equipadas incluidas.
// Solo se equipa lo que queda libre (tienes − equipadas en todos los Axies); al quitarla vuelve a quedar libre.
// Se consiguen en el botín de los combates (neutras), abriendo bolsas de la Forja (de clase) y en el tutorial.
// Las partidas anteriores al Hito 54 no tenían bolsa: al crearla, lo que ya estaba equipado pasa a ser tuyo.
//
// Se guarda en la ranura de guardado activa: slot.runeCharms = { heroId: { rune: id|null, charms: { eyes, ears, mouth, horn, back, tail } } }
// (viaja con la partida y se sincroniza con la nube como el resto del progreso). Sin ranura activa funciona en memoria.
// El combate lee get(heroId) al empezar (SpellManager.runeCharms.setupCombat, tactics/combat/RuneCharmEffects.js).
// Consola: window.lunakaiRuneCharms (y lkDebug.rune / lkDebug.charm / lkDebug.runes).

import { saveSlotManager } from './SaveSlotManager.js';
import { PP_MAX, RUNES, CHARMS, RUNE_BY_ID, CHARM_BY_ID, ppAllocate, ppCanSet } from '../tactics/data/RunesCharms.js';
import { REWARDS as TUT_REWARDS } from './tutorial/TutorialScript.js';

export const PART_ORDER = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
/** Las 6 clases que dan las bolsas de la Forja (Mech, Dawn y Dusk son secretas y sus runas no tienen efecto). */
export const BAG_CLASSES = ['aquatic', 'beast', 'bird', 'bug', 'plant', 'reptile'];
/** Peso de cada rareza al sacar una runa o un charm al azar (bolsas y botín). */
const RARITY_WEIGHT = { common: 45, neutral: 45, rare: 35, epic: 15, mystic: 5 };
const BY_KIND = { runes: RUNE_BY_ID, charms: CHARM_BY_ID };
/** Hito 110: la runa y el charm que regala el tutorial no se comercian (una unidad de cada uno, ligada a la partida).
 *  El servidor aplica la misma regla en _mkt_locked (20261101000003_market_bound_bags.sql): si cambian, cambiar los dos. */
export const BOUND_GIFT = { runes: TUT_REWARDS.rune, charms: TUT_REWARDS.charm };

/** Una al azar de la lista, pesada por rareza. */
function pickWeighted(list, rnd = Math.random) {
  const w = list.map((x) => RARITY_WEIGHT[x.rarity] ?? 10);
  let t = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { t -= w[i]; if (t <= 0) return list[i]; }
  return list[list.length - 1] || null;
}
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

  // ------------------------------------------------------------------ bolsa (Hito 54)
  _bag() {
    const slot = this.slots?.getActiveSlot?.();
    const root = slot || this;
    let bag = slot ? slot.runeCharmBag : this.memoryBag;
    if (!bag || typeof bag !== 'object') {
      // Primera vez en esta partida: lo que ya estaba equipado pasa a ser tuyo
      bag = { runes: {}, charms: {} };
      Object.values(this._store()).forEach((e) => {
        if (e?.rune && RUNE_BY_ID[e.rune]) bag.runes[e.rune] = (bag.runes[e.rune] || 0) + 1;
        Object.values(e?.charms || {}).forEach((id) => { if (id && CHARM_BY_ID[id]) bag.charms[id] = (bag.charms[id] || 0) + 1; });
      });
      if (slot) slot.runeCharmBag = bag; else root.memoryBag = bag;
    }
    bag.runes ||= {}; bag.charms ||= {};
    return bag;
  }

  // ------------------------------------------------------------------ Ronin (Hito 75)
  // Runas y charms NFT de la cuenta de Sky Mavis: copia jugable mientras sigan en la billetera. No se venden ni se
  // gastan; se guardan en la partida (slot.roninItems) para que sigan ahí sin conexión hasta la próxima lectura.
  _roninStore() {
    const slot = this.slots?.getActiveSlot?.();
    const root = slot || this;
    if (!root.roninItems || typeof root.roninItems !== 'object') root.roninItems = { at: 0, runes: {}, charms: {} };
    root.roninItems.runes ||= {}; root.roninItems.charms ||= {};
    return root.roninItems;
  }
  /** Cuántas copias Ronin hay de una runa o charm. */
  roninCount(kind, id) { return this._roninStore()[kind]?.[id] || 0; }
  roninTotal() { const s = this._roninStore(); return [s.runes, s.charms].reduce((a, m) => a + Object.values(m).reduce((x, y) => x + y, 0), 0); }
  roninReadAt() { return this._roninStore().at || 0; }
  /**
   * Cambia las copias Ronin por las que hay ahora en la cuenta: { runes: { id: n }, charms: { id: n } }.
   * Lo que ya no está deja de contar; si alguna estaba equipada y ya no alcanza, se quita del Axie.
   */
  setRonin(next = {}) {
    const st = this._roninStore();
    for (const kind of ['runes', 'charms']) {
      const map = {};
      Object.entries(next[kind] || {}).forEach(([id, n]) => { if (BY_KIND[kind][id] && n > 0) map[id] = Math.floor(n); });
      Object.keys(map).forEach((id) => { if (!st[kind][id]) this._markNew(kind, id); });
      st[kind] = map;
    }
    st.at = Date.now();
    // Quita lo equipado que ya no alcanza (empezando por el último Axie)
    const store = this._store();
    const heroes = Object.keys(store).reverse();
    for (const kind of ['runes', 'charms']) {
      const ids = new Set();
      Object.values(store).forEach((e) => { if (kind === 'runes') { if (e?.rune) ids.add(e.rune); } else Object.values(e?.charms || {}).forEach((c) => c && ids.add(c)); });
      ids.forEach((id) => {
        let extra = this.equippedCount(kind, id) - this.owned(kind, id);
        for (const h of heroes) {
          if (extra <= 0) break;
          const e = store[h]; if (!e) continue;
          if (kind === 'runes' && e.rune === id) { e.rune = null; extra--; }
          if (kind === 'charms') Object.keys(e.charms || {}).forEach((p) => { if (extra > 0 && e.charms[p] === id) { e.charms[p] = null; extra--; } });
        }
      });
    }
    this._persist();
    this.listeners.forEach((fn) => { try { fn(null, null); } catch { /* nada */ } });
  }

  /** Cuántas tienes (equipadas incluidas, también las copias Ronin). kind = 'runes' | 'charms'. */
  owned(kind, id) { return (this._bag()[kind]?.[id] || 0) + this.roninCount(kind, id); }

  /** Hito 110: unidades ligadas a la partida (regalo del tutorial, una vez recibido): se equipan pero no se comercian. */
  boundCount(kind, id) {
    const slot = this.slots?.getActiveSlot?.();
    const got = slot?.tutorialProgress?.flags?.runes === true && BOUND_GIFT[kind] === id;
    return got ? Math.min(1, this._bag()[kind]?.[id] || 0) : 0;
  }

  /** Cuántas se pueden vender o gastar: las de la bolsa sin las ligadas ni las equipadas
   *  (lo equipado usa primero las copias Ronin y las ligadas). */
  sellable(kind, id) {
    const bag = this._bag()[kind]?.[id] || 0, bound = this.boundCount(kind, id);
    return Math.max(0, bag - bound - Math.max(0, this.equippedCount(kind, id) - this.roninCount(kind, id) - bound));
  }

  /** Cuántas hay equipadas en todos los Axies. */
  equippedCount(kind, id) {
    let n = 0;
    Object.values(this._store()).forEach((e) => {
      if (kind === 'runes') { if (e?.rune === id) n++; } else Object.values(e?.charms || {}).forEach((c) => { if (c === id) n++; });
    });
    return n;
  }

  /** Cuántas quedan libres para equipar o vender. */
  available(kind, id) { return Math.max(0, this.owned(kind, id) - this.equippedCount(kind, id)); }

  /** Lo que tienes de un tipo: [{ id, item, owned, free }]. */
  list(kind) {
    const db = BY_KIND[kind] || {};
    const ids = new Set([...Object.keys(this._bag()[kind] || {}), ...Object.keys(this._roninStore()[kind] || {})]);
    return [...ids].filter((id) => db[id] && this.owned(kind, id) > 0).map((id) => {
      const n = this.owned(kind, id);
      return { id, item: db[id], owned: n, free: Math.max(0, n - this.equippedCount(kind, id)), ronin: this.roninCount(kind, id), bound: this.boundCount(kind, id), sellable: this.sellable(kind, id) };
    });
  }

  /** Suma (n > 0) o quita (n < 0, solo de las libres) runas o charms. Devuelve false si no alcanzan. */
  add(kind, id, n = 1, save = true) {
    if (!BY_KIND[kind]?.[id] || !n) return false;
    if (n < 0 && this.sellable(kind, id) < -n) return false; // las copias Ronin y el regalo del tutorial no se venden ni se gastan
    const bag = this._bag();
    bag[kind][id] = Math.max(0, (bag[kind][id] || 0) + n);
    if (!bag[kind][id]) delete bag[kind][id];
    if (n > 0) this._markNew(kind, id);
    if (save) this._persist();
    this.listeners.forEach((fn) => { try { fn(null, null); } catch { /* nada */ } });
    return true;
  }

  // ------------------------------------------------------------------ «Nuevo» (Hito 74)
  // Lo recién conseguido (bolsas, botín, tutorial) lleva la marca «Nuevo» en la estantería hasta que se ve.
  _newSet() {
    const slot = this.slots?.getActiveSlot?.();
    const root = slot || this;
    if (!root.runeCharmNew || typeof root.runeCharmNew !== 'object') root.runeCharmNew = { runes: {}, charms: {} };
    root.runeCharmNew.runes ||= {}; root.runeCharmNew.charms ||= {};
    return root.runeCharmNew;
  }
  _markNew(kind, id) { const s = this._newSet(); if (s[kind]) s[kind][id] = 1; }
  isNew(kind, id) { return Boolean(this._newSet()[kind]?.[id]); }
  /** Quita la marca «Nuevo» de una lista (se llama al mostrarla en la estantería). */
  clearNew(kind, ids) { const s = this._newSet()[kind]; if (!s) return; let ch = false; (ids || Object.keys(s)).forEach((id) => { if (s[id]) { delete s[id]; ch = true; } }); if (ch) this._persist(); }
  hasNew() { const s = this._newSet(); return Object.keys(s.runes).length + Object.keys(s.charms).length > 0; }

  /** Abre una bolsa de la Forja: una runa ('runes') o un charm ('charms') de una de las 6 clases, al azar por rareza. */
  openBag(kind, save = true) {
    const pool = (kind === 'runes' ? RUNES : CHARMS).filter((x) => BAG_CLASSES.includes(x.class));
    const pick = pickWeighted(pool);
    if (!pick) return null;
    this.add(kind, pick.id, 1, save);
    return { kind, id: pick.id, item: pick };
  }

  /** Una runa o un charm NEUTRO al azar (botín de los combates). No la entrega: eso lo hace quien llama (add). */
  rollNeutral(kind) {
    return pickWeighted((kind === 'runes' ? RUNES : CHARMS).filter((x) => x.class === 'neutral'));
  }

  ppUsed(heroId) { return Object.values(this.get(heroId).charms).reduce((a, id) => a + (id ? CHARM_BY_ID[id]?.pp || 0 : 0), 0); }
  ppLeft(heroId) { return PP_MAX - this.ppUsed(heroId); }

  /** Equipa (o quita, con null) la runa. Solo se equipa una que tengas libre. Devuelve false si no la tienes. */
  setRune(heroId, runeId) {
    const cur = this.get(heroId);
    if (runeId && runeId !== cur.rune && this.available('runes', runeId) < 1) return false;
    cur.rune = runeId || null;
    this._write(heroId, cur);
    return true;
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
    if (charmId && cur.charms[part] !== charmId && this.available('charms', charmId) < 1) return false; // no la tienes libre
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
    this._bag(); // crea la bolsa (con lo ya equipado) antes del primer cambio
    this._store()[heroId] = data;
    this._persist();
    this.listeners.forEach((fn) => { try { fn(heroId, data); } catch { /* nada */ } });
  }

  _persist() {
    const sm = this.slots;
    if (sm?.activeSlotId && sm.getActiveSlot?.()) {
      sm.getActiveSlot().lastSaved = Date.now();
      if (typeof sm._saveToStorage === 'function') sm._saveToStorage([sm.activeSlotId]);
    }
  }
}

export const RuneCharmService = new RuneCharmServiceImpl();
if (typeof window !== 'undefined') window.lunakaiRuneCharms = RuneCharmService;
export { RuneCharmServiceImpl };
