// ShopService.js — Reglas de la Tienda (sistema de diseño · 24 «Tienda · Comprar y vender»). Fuente de verdad única.
//
// Se guarda en la ranura activa: slot.shops = { [shopId]: { stock: { id: quedan|null }, restockAt, buyback: [...] } }.
//  · Comprar: oro → objeto. Equipo y consumibles van a la Mochila (EquipmentManager.inventory); los materiales,
//    a la bolsa de la Forja (ForgeService). Cada tienda repone existencias cada `restockHours`.
//  · Vender: el equipo y los consumibles al 30 %, los materiales al 50 % (EconomyCatalog.sellPrice).
//    Lo equipado no aparece y los objetos de misión no se venden. Lo último vendido se recompra al mismo precio.

import { saveSlotManager } from './SaveSlotManager.js';
import { ForgeService } from './ForgeService.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import { MATERIALS, SHOPS, BUYBACK_SLOTS, buyPrice, sellPrice } from '../tactics/data/EconomyCatalog.js';
import { RUNE_BY_ID, CHARM_BY_ID } from '../tactics/data/RunesCharms.js';
import { RuneCharmService } from './RuneCharmService.js';
import { runeCharmArt } from '../ui/RuneCharmArt.js';
import * as i18n from '../i18n/i18n.js';

export const EQ_SLOTS = ['weapon', 'hat', 'shield', 'body', 'boots'];
const HOUR_MS = 3600 * 1000;

// Runas y charms (Hito 54): se venden con ids «rune:<id>» y «charm:<id>»; salen de la bolsa de RuneCharmService.
const RC_KIND = { rune: 'runes', charm: 'charms' };
const rcParse = (id) => { const m = /^(rune|charm):(.+)$/.exec(String(id)); return m ? { kind: RC_KIND[m[1]], id: m[2], tag: m[1] } : null; };
const RC_RAR = (r) => (['rare', 'epic', 'mystic'].includes(r) ? r : r === 'secret' ? 'epic' : 'common');
function rcItem(key) {
  const p = rcParse(key); if (!p) return null;
  const x = (p.kind === 'runes' ? RUNE_BY_ID : CHARM_BY_ID)[p.id]; if (!x) return null;
  return {
    id: key, name: x.name, runeCharm: p.kind, class: x.class, rarity: RC_RAR(x.rarity), slot: 'runecharm', stats: {},
    icon: runeCharmArt(p.kind, p.id) || `./assets/ui/icons/${p.tag}.png`,
    description: `${p.tag === 'rune' ? (x.class === 'neutral' ? i18n.t('items.rc.runeNeutral') : i18n.t('items.rc.runeClass')) : (x.class === 'neutral' ? i18n.t('items.rc.charmNeutral') : i18n.t('items.rc.charmClass'))} ${x.desc || ''}`.trim(),
  };
}

/** Ficha unificada: entrada de ITEMS_DB, material (con `mat: true`) o runa / charm (con `runeCharm`). */
export const itemOf = (id) => (MATERIALS[id] ? { ...MATERIALS[id], mat: true, matRarity: MATERIALS[id].rarity, rarity: 'common' } : ITEMS_DB[id] || rcItem(id));
/** Tipo para las pestañas: res · gear · food · potion · rc · other. */
export const kindOf = (it) => (it.mat ? 'res' : it.runeCharm ? 'rc' : EQ_SLOTS.includes(it.slot) ? 'gear' : it.category === 'food' ? 'food'
  : (it.slot === 'consumable' || it.category === 'consumable') ? 'potion' : 'other');
const isQuest = (it) => it.slot === 'quest' || it.category === 'quest' || it.type === 'quest';

class ShopServiceImpl {
  constructor(slots = saveSlotManager) {
    this.slots = slots;
    this.memory = {};
    this.em = null;
    this.onSave = null;
  }

  init({ equipmentManager, onSave = null }) { this.em = equipmentManager; this.onSave = onSave; }

  def(shopId) { return SHOPS[shopId] || null; }

  _state(shopId) {
    const d = this.def(shopId); if (!d) return null;
    const slot = this.slots?.getActiveSlot?.();
    const root = slot ? (slot.shops ||= {}) : this.memory;
    const st = (root[shopId] ||= { stock: {}, restockAt: 0, buyback: [] });
    st.buyback = Array.isArray(st.buyback) ? st.buyback : [];
    if (Date.now() >= (st.restockAt || 0)) { // reposición
      st.stock = Object.fromEntries(d.stock.map((s) => [s.id, s.stock]));
      st.restockAt = Date.now() + d.restockHours * HOUR_MS;
    } else { // el catálogo cambió desde la última reposición: añade lo nuevo con sus existencias completas
      d.stock.forEach((s) => { if (!(s.id in st.stock)) st.stock[s.id] = s.stock; });
    }
    return st;
  }

  gold() { return this.em?.getGold?.() || 0; }
  restockInHours(shopId) { const st = this._state(shopId); return st ? Math.max(0, (st.restockAt - Date.now()) / HOUR_MS) : 0; }

  /** Cuántos tienes de un objeto (Mochila o bolsa de materiales). */
  have(id) {
    if (MATERIALS[id]) return ForgeService.mats()[id] || 0;
    const rc = rcParse(id); if (rc) return RuneCharmService.owned(rc.kind, rc.id);
    return (this.em?.inventory || []).filter((x) => x === id).length;
  }

  /** Lo que vende la tienda: { key, id, it, left (null = sin límite), price }. */
  buyList(shopId) {
    const d = this.def(shopId), st = this._state(shopId); if (!d) return [];
    return d.stock.map((s) => ({ key: s.id, id: s.id, it: itemOf(s.id), left: st.stock[s.id] ?? null })).filter((e) => e.it)
      .map((e) => ({ ...e, price: buyPrice(e.it) }));
  }

  /** Por qué esta tienda no te compra un objeto ('' = sí lo compra). */
  sellBlock(shopId, it) {
    if (isQuest(it)) return i18n.t('notices.shop.questNoSell');
    const max = this.def(shopId)?.maxGearTier;
    if (max != null && EQ_SLOTS.includes(it.slot) && (it.tier ?? 0) > max) return i18n.t('notices.shop.tierOnly', { max });
    return '';
  }

  /** Cuántos puedes vender: los de la Mochila menos las copias que la forja tiene apartadas (pieza en un yunque). */
  sellable(id) {
    if (MATERIALS[id]) return this.have(id);
    const rc = rcParse(id); if (rc) return RuneCharmService.sellable(rc.kind, rc.id); // ni las equipadas ni las copias Ronin
    return Math.max(0, this.have(id) - (ForgeService.reservedInInventory()[id] || 0));
  }

  /** Lo que puedes venderle: materiales de la bolsa y objetos de la Mochila (no lo equipado ni lo que está en la forja). */
  sellList(shopId) {
    const out = [];
    Object.entries(ForgeService.mats()).forEach(([id, n]) => { if (n > 0 && MATERIALS[id]) out.push({ key: id, id, it: itemOf(id), qty: n }); });
    const counts = {}, reserved = ForgeService.reservedInInventory();
    (this.em?.inventory || []).forEach((id) => { if (ITEMS_DB[id]) counts[id] = (counts[id] || 0) + 1; });
    Object.entries(counts).forEach(([id, n]) => {
      const free = n - (reserved[id] || 0);
      out.push({ key: id, id, it: ITEMS_DB[id], qty: free > 0 ? free : n, lockWhy: free > 0 ? this.sellBlock(shopId, ITEMS_DB[id]) : i18n.t('notices.shop.inForge') });
    });
    // Runas y charms de la bolsa: solo las que no lleva ningún Axie
    [['runes', 'rune'], ['charms', 'charm']].forEach(([kind, tag]) => RuneCharmService.list(kind).forEach((r) => {
      const key = `${tag}:${r.id}`, it = rcItem(key); if (!it) return;
      const sell = r.sellable ?? r.free;
      out.push({ key, id: key, it, qty: sell || r.owned, lockWhy: sell > 0 ? '' : (r.free > 0 ? i18n.t('notices.shop.roninNoSell') : i18n.t('notices.shop.equippedAxie')) });
    }));
    return out.map((e) => ({ ...e, locked: !!e.lockWhy, price: e.lockWhy ? 0 : sellPrice(e.it) }));
  }

  buyback(shopId) { return (this._state(shopId)?.buyback || []).map((b) => ({ ...b, it: itemOf(b.id) })).filter((b) => b.it); }

  _give(id, n) {
    if (MATERIALS[id]) return ForgeService.addMats(id, n, false); // se guarda una vez en _commit
    const rc = rcParse(id); if (rc) return RuneCharmService.add(rc.kind, rc.id, n, false);
    for (let i = 0; i < n; i++) this.em.inventory.push(id);
    return true;
  }
  _take(id, n) {
    if (MATERIALS[id]) return ForgeService.addMats(id, -n, false);
    const rc = rcParse(id); if (rc) return RuneCharmService.add(rc.kind, rc.id, -n, false);
    if (this.have(id) < n) return false;
    for (let i = 0; i < n; i++) this.em.inventory.splice(this.em.inventory.indexOf(id), 1);
    return true;
  }

  buy(shopId, id, qty = 1) {
    const st = this._state(shopId), it = itemOf(id); if (!st || !it) return { ok: false, why: i18n.t('notices.shop.notForSale') };
    if (!(id in st.stock)) return { ok: false, why: i18n.t('notices.shop.notForSale') };
    const left = st.stock[id];
    if (left !== null && left < qty) return { ok: false, why: i18n.t('notices.shop.notEnoughStock') };
    const cost = buyPrice(it) * qty;
    if (cost > this.gold()) return { ok: false, why: i18n.t('notices.shop.needGold', { n: cost - this.gold() }) };
    this.em.addGold(-cost);
    if (left !== null) st.stock[id] = left - qty;
    this._give(id, qty);
    this._commit();
    return { ok: true, it, qty, cost };
  }

  sell(shopId, id, qty = 1) {
    const st = this._state(shopId), it = itemOf(id); if (!st || !it) return { ok: false, why: i18n.t('notices.shop.unknownItem') };
    const block = this.sellBlock(shopId, it); if (block) return { ok: false, why: block };
    if (this.sellable(id) < qty) return { ok: false, why: this.have(id) >= qty ? (rcParse(id) ? i18n.t('notices.shop.equippedAxie') : i18n.t('notices.shop.inForge')) : i18n.t('notices.shop.notEnoughOwned') };
    const gain = sellPrice(it) * qty;
    if (!this._take(id, qty)) return { ok: false, why: i18n.t('notices.shop.notEnoughOwned') };
    this.em.addGold(gain);
    st.buyback.unshift({ id, qty, paid: gain });
    st.buyback = st.buyback.slice(0, BUYBACK_SLOTS);
    this._commit();
    return { ok: true, it, qty, gain };
  }

  rebuy(shopId, index) {
    const st = this._state(shopId), b = st?.buyback[index]; if (!b) return { ok: false };
    if (b.paid > this.gold()) return { ok: false, why: i18n.t('notices.shop.needGold', { n: b.paid - this.gold() }) };
    this.em.addGold(-b.paid);
    st.buyback.splice(index, 1);
    this._give(b.id, b.qty);
    this._commit();
    return { ok: true, it: itemOf(b.id), qty: b.qty };
  }

  _commit() {
    try { this.em?._notifyChange?.(); } catch { /* nada */ }
    try { RuneCharmService._persist?.(); } catch { /* nada */ }
    const sm = this.slots;
    if (sm?.activeSlotId && sm.getActiveSlot?.()) { sm.getActiveSlot().lastSaved = Date.now(); try { this.onSave?.(); } catch { /* nada */ } }
  }
}

export const ShopService = new ShopServiceImpl();
