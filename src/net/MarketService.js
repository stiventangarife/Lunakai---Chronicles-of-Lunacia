// MarketService.js — Hito 77 (Fase 2 del Mercado): comercio entre jugadores de materiales, comida y pociones por oro.
//
// Funciones de Supabase de la migración 20261026000002_market.sql. El oro lo mueve el servidor (EconomyService.apply).
// Los objetos siguen en la partida: cada entrada o salida del mercado es un «delta» con id que
//   · se aplica aquí en cuanto el servidor responde (publicar, comprar, retirar) y se apunta en slot.marketAck;
//   · si el servidor lo aplica al guardar (caducó un anuncio, el guardado salió antes que la respuesta…), llega en
//     la respuesta de save_slot como `applied` y se aplica aquí si aún no estaba (CloudSave → onServerApplied).
// Así un objeto nunca está a la vez en la partida y en un anuncio, ni se suma dos veces.
//
// Hito 78 (fase 3): cada objeto tiene su moneda (oro: materiales, comida y pociones · equipo T1–3, runas y charms en
// la otra moneda, con solo precio mínimo). Hito 110: esa moneda es el AXS (antes bAXS, que no se intercambia). Mientras tienes anuncios abiertos se consulta market_inbox cada minuto:
// las ventas suben tu saldo y avisan al momento, y lo que vuelve (caducado) entra en la partida sin recargar.
//
// Invitados: pueden mirar los anuncios (solo lectura). Publicar y comprar piden cuenta.
// API: available · canTrade · rules() · browse() · mine() · list() · buy() · cancel() · hint() · inbox() · why()
// Consola: window.lunakaiMarket

import { accountManager } from './AccountManager.js';
import { authService, supabaseFetch } from './AuthService.js';
import { EconomyService } from './EconomyService.js';
import { saveSlotManager } from '../rpg/SaveSlotManager.js';
import { ForgeService } from '../rpg/ForgeService.js';
import { ShopService } from '../rpg/ShopService.js';
import { RuneCharmService } from '../rpg/RuneCharmService.js';
import * as i18n from '../i18n/i18n.js';

const ACK_KEEP = 80;     // ids de deltas ya aplicados que se recuerdan en la partida
export const MARKET_FEE = 0.05;
export const MARKET_MAX_LISTINGS = 20;
export const MARKET_DAYS = 3;
export const AXS_CEIL = 1000000;   // tope técnico por unidad en AXS (contra errores al escribir)
/** Monedas del Mercado con 2 decimales (el bAXS solo aparece en el historial anterior al Hito 110). */
export const isDecimalCurrency = (cur) => cur === 'axs' || cur === 'baxs';
const POLL_MS = 60000;             // revisión del Mercado mientras tienes anuncios abiertos
const RC_BAG = { rune: 'runes', charm: 'charms' };
const rcOf = (id) => { const m = /^(rune|charm):(.+)$/.exec(String(id)); return m ? { kind: RC_BAG[m[1]], id: m[2] } : null; };

class MarketServiceImpl {
  constructor() {
    this.em = null;
    this.game = null;
    this.unavailable = false;  // la base de datos aún no tiene el Mercado
    this._rules = null;        // { item_id: { kind, currency, min, max } }
    this._rulesAt = 0;
    this._listeners = new Set();
    this.open = 0;             // anuncios abiertos de esta partida (para saber si hay que revisar)
    this.onInbox = null;       // (res) → avisos en pantalla (ShopPanel)
    this._polling = false;
  }

  bind({ game, equipmentManager }) {
    this.game = game; this.em = equipmentManager;
    const cloud = accountManager?.cloud;
    if (cloud) cloud.onServerApplied = (slotId, applied) => this.applyDeltas(applied, slotId);
    if (typeof window !== 'undefined' && !this._timer) {
      this._timer = setInterval(() => { if (this.open > 0 && document.visibilityState === 'visible') this.poll(); }, POLL_MS);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && this.open > 0) this.poll(); });
    }
  }

  /** Revisa ventas, caducidades y entradas pendientes (al entrar en la partida y cada minuto con anuncios abiertos). */
  async poll() {
    if (this._polling || !this.canTrade) return null;
    const game = this.game;
    if (game && game.gameState && !['OVERWORLD', 'TRANSITION', 'BATTLE'].includes(game.gameState)) return null; // menús, carga
    this._polling = true;
    try {
      const slot = this.slot;
      const r = await this.inbox();
      if (!r || slot !== this.slot) return null;
      this.open = Number(r.open) || 0;
      if (Array.isArray(r.pending) && r.pending.length) this.applyDeltas(r.pending, slot);
      if ((r.sold || []).length) await EconomyService.sync();
      if ((r.sold || []).length || (r.expired || []).length) { try { this.onInbox?.(r); } catch { /* nada */ } this._emit(); }
      return r;
    } finally { this._polling = false; }
  }

  onChange(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  _emit() { this._listeners.forEach((fn) => { try { fn(); } catch { /* nada */ } }); }

  get slot() { return Number(saveSlotManager?.activeSlotId) || null; }
  /** ¿Se puede publicar y comprar? (cuenta + partida activa + economía del servidor) */
  get canTrade() { return !this.unavailable && EconomyService.active; }

  _idem(tag) { return `${tag}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 9)}`; }

  async _call(path, { body, auth = true, method = 'POST' } = {}) {
    let token;
    if (auth || accountManager?.mode === 'account') { try { token = await authService.getAccessToken(); } catch (e) { if (auth) throw e; } }
    try {
      return await supabaseFetch(path, { method, token, body });
    } catch (e) {
      const msg = `${e?.code || ''} ${e?.message || ''}`;
      if (/PGRST202|PGRST205|could not find the (function|table)|does not exist|HTTP 404/i.test(msg)) {
        console.warn('[Market] La base de datos aún no tiene el Mercado.', msg);
        this.unavailable = true;
        throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
      }
      if (e?.code === 'network' || e?.code === 'server_unavailable') throw Object.assign(new Error('offline'), { code: 'offline' });
      if (e?.code === 'not_configured') { this.unavailable = true; throw Object.assign(new Error('unavailable'), { code: 'unavailable' }); }
      throw e;
    }
  }
  async _rpc(fn, args, opts) {
    try { return (await this._call(`/rest/v1/rpc/${fn}`, { body: args, ...opts })) || { ok: false, error: 'empty' }; }
    catch (e) { return { ok: false, error: e.code || 'error' }; }
  }

  // ------------------------------------------------------------------ lectura
  /** Qué se puede vender y entre qué precios (tabla market_item_rules, generada desde el juego). */
  async rules(force = false) {
    if (this._rules && !force && Date.now() - this._rulesAt < 10 * 60e3) return this._rules;
    try {
      const rows = await this._call('/rest/v1/market_item_rules?select=*', { method: 'GET', auth: false });
      this._rules = Object.fromEntries((rows || []).map((r) => [r.item_id, {
        kind: r.kind, currency: r.currency || 'gold', min: Number(r.min_price), max: r.max_price == null ? null : Number(r.max_price),
      }]));
      this._rulesAt = Date.now();
    } catch { /* sin conexión o sin desplegar: lo que hubiera */ }
    return this._rules || {};
  }
  rule(id) { return this._rules?.[id] || null; }

  browse({ item = null, kind = null, sort = 'price' } = {}) {
    return this._rpc('market_browse', { p_item: item, p_kind: kind, p_sort: sort, p_limit: 200 }, { auth: false });
  }
  async mine() {
    if (!this.canTrade) return { ok: false, error: 'guest' };
    const res = await this._rpc('market_mine', { p_slot: this.slot });
    if (res.ok) this.open = (res.listings || []).filter((l) => l.status === 'open').length;
    return res;
  }
  hint(item) { return this._rpc('market_price_hint', { p_item: item }, { auth: false }); }

  // ------------------------------------------------------------------ acciones (con cuenta)
  async _flushSave() {
    try { this.game?._saveCurrentProgress?.(); } catch { /* nada */ }
    try { await accountManager.cloud?.flush?.(); } catch { /* el servidor usa la copia que tenga */ }
  }

  /** Publicar qty unidades a `price` de oro cada una. El objeto sale de la partida al momento. */
  async list(item, qty, price) {
    if (!this.canTrade) return { ok: false, error: 'guest' };
    await this._flushSave(); // el servidor comprueba lo que tienes en la copia guardada
    const res = await this._rpc('market_list', { p_slot: this.slot, p_item: item, p_qty: qty, p_price: price, p_idem: this._idem('list') });
    if (res.ok && res.delta) this.applyDeltas([res.delta]);
    if (res.ok && !res.replay) this.open++;
    this._emit();
    return res;
  }

  async buy(listingId, qty) {
    if (!this.canTrade) return { ok: false, error: 'guest' };
    const res = await EconomyService.track(this._rpc('market_buy', { p_slot: this.slot, p_listing: listingId, p_qty: qty, p_idem: this._idem('buy') }));
    EconomyService.apply(res);
    if (res.ok && res.delta) this.applyDeltas([res.delta]);
    this._emit();
    return res;
  }

  async cancel(listingId) {
    if (!this.canTrade) return { ok: false, error: 'guest' };
    const res = await this._rpc('market_cancel', { p_slot: this.slot, p_listing: listingId });
    if (res.ok && res.delta) this.applyDeltas([res.delta]);
    if (res.ok) this.open = Math.max(0, this.open - 1);
    this._emit();
    return res;
  }

  /** Lo que pasó mientras no estabas: ventas y anuncios caducados (se marcan como vistos). */
  async inbox() {
    if (!this.canTrade) return null;
    const res = await this._rpc('market_inbox', { p_slot: this.slot });
    return res.ok ? res : null;
  }

  // ------------------------------------------------------------------ objetos: entradas y salidas
  _acks(slot) {
    if (!Array.isArray(slot.marketAck)) slot.marketAck = [];
    return slot.marketAck;
  }

  /** Aplica a la partida los deltas que aún no estaban (sirve tanto para las respuestas como para `applied`). */
  applyDeltas(list, slotId = this.slot) {
    const slot = saveSlotManager?.getSlot?.(slotId);
    if (!slot || !Array.isArray(list) || !list.length) return 0;
    const acks = this._acks(slot);
    const isActive = Number(slotId) === this.slot;
    let n = 0;
    list.forEach((d) => {
      const id = Number(d?.id), delta = Number(d?.delta) || 0;
      if (!id || !delta || acks.includes(id)) return;
      if (d.kind === 'mat') {
        if (isActive) {
          if (!ForgeService.addMats(d.item, delta, false)) ForgeService.addMats(d.item, -(ForgeService.mats()[d.item] || 0), false); // nunca negativo
        } else {
          slot.forge ||= {}; slot.forge.mats ||= {};
          slot.forge.mats[d.item] = Math.max(0, (slot.forge.mats[d.item] || 0) + delta);
        }
      } else if (d.kind === 'rc') {
        // Runas y charms: bolsa de la partida (slot.runeCharmBag)
        const rc = rcOf(d.item);
        if (rc) {
          if (!(isActive && RuneCharmService.add(rc.kind, rc.id, delta, false))) {
            const bag = (slot.runeCharmBag ||= { runes: {}, charms: {} }); bag[rc.kind] ||= {};
            bag[rc.kind][rc.id] = Math.max(0, (bag[rc.kind][rc.id] || 0) + delta);
          }
        }
      } else {
        // Mochila: se cambia la del juego y, a la vez, la copia de la ranura (así el guardado siguiente ya coincide)
        const lists = [isActive ? this.em?.inventory : null, Array.isArray(slot.inventory) && slot.inventory !== this.em?.inventory ? slot.inventory : null].filter(Boolean);
        lists.forEach((inv) => {
          if (delta > 0) for (let i = 0; i < delta; i++) inv.push(d.item);
          else for (let i = 0; i < -delta; i++) { const k = inv.indexOf(d.item); if (k >= 0) inv.splice(k, 1); }
        });
      }
      acks.push(id); n++;
    });
    if (acks.length > ACK_KEEP) acks.splice(0, acks.length - ACK_KEEP);
    if (!n) return 0;
    slot.lastSaved = Date.now();
    if (isActive) {
      try { this.em?._notifyChange?.(); } catch { /* nada */ }
      try { ForgeService._commit?.(false); } catch { /* nada */ }
      try { RuneCharmService._persist?.(); } catch { /* nada */ }
      try { this.game?._saveCurrentProgress?.(); } catch { /* nada */ }
    }
    try { saveSlotManager._saveToStorage([Number(slotId)]); } catch { /* nada */ }
    this._emit();
    return n;
  }

  // ------------------------------------------------------------------ ayudas para la interfaz
  /** Cuántos puedes anunciar: sin lo equipado, lo que está en la Forja ni las copias Ronin (como al vender a Ochi). */
  have(id) { return ShopService.sellable(id); }
  /** Comisión del 5 %: en oro redondeada hacia arriba; en AXS, hacia arriba al céntimo. */
  fee(gross, currency = 'gold') { return isDecimalCurrency(currency) ? Math.ceil(+(gross * MARKET_FEE * 100).toFixed(6)) / 100 : Math.ceil(gross * MARKET_FEE); }

  why(res) {
    const code = res?.error || 'error';
    const KEYS = {
      guest: 'market.err.guest', offline: 'notices.economy.offline', unavailable: 'market.err.unavailable',
      need_gold: 'notices.economy.needGold', need_baxs: 'notices.economy.needBaxs', need_axs: 'notices.economy.needAxs', not_owned: 'market.err.notOwned',
      bad_price: res?.max == null ? 'market.err.badPriceMin' : 'market.err.badPrice',
      not_tradeable: 'market.err.notTradeable', too_many_listings: 'market.err.tooMany', listing_gone: 'market.err.gone',
      own_listing: 'market.err.own', invalid_qty: 'market.err.qty', market_blocked: 'market.err.blocked', other_slot: 'market.err.otherSlot',
    };
    return i18n.t(KEYS[code] || 'notices.economy.error', { n: res?.need ?? '', min: res?.min ?? '', max: res?.max ?? '', left: res?.left ?? '', max_n: MARKET_MAX_LISTINGS });
  }
}

export const MarketService = new MarketServiceImpl();
if (typeof window !== 'undefined') window.lunakaiMarket = MarketService;
