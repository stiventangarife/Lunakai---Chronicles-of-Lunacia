// EconomyService.js — Hito 76 (Fase 1 del Mercado): oro, bAXS y SLP en el servidor para las partidas con cuenta.
//
// Con cuenta, cada ganancia o gasto se pide a una función de Supabase (migración 20261026000000_economy.sql) y el
// saldo que devuelve es el que vale: se aplica a la partida (EquipmentManager.gold y ForgeService slp/baxs).
// Como invitado no hace nada: el juego sigue en local como siempre (`active` = false).
// Si la base de datos aún no tiene las funciones (migración sin aplicar), se desactiva sola y el juego sigue en local.
//
// API: active · sync() · battleGold() · shopBuy(item, qty) · shopSell(item, qty) · shopRebuy(item, qty)
//      forge(kind, key) · reward(id) · why(res) (mensaje para el jugador)
// Consola: window.lunakaiEconomy

import { accountManager } from './AccountManager.js';
import { authService, supabaseFetch } from './AuthService.js';
import { saveSlotManager } from '../rpg/SaveSlotManager.js';
import * as i18n from '../i18n/i18n.js';

const RETRY_MS = 25000; // reintento de lo pendiente (oro de combate y recompensas cobrados sin conexión)

class EconomyServiceImpl {
  constructor() {
    this.em = null;
    this.forge = null;
    this.unavailable = false; // la base de datos no tiene las funciones: todo en local
    this.pending = [];        // [{ fn, args }] cobros que fallaron por la conexión; se reintentan
    this._timer = null;
    this._seq = 0;            // Hito 78: cuántas veces se aplicó un saldo del servidor (para no pisar uno nuevo con uno viejo)
    this._busy = 0;           // operaciones de dinero en curso
  }

  /** @param {{ equipmentManager: object, forge: object }} deps */
  bind({ equipmentManager, forge }) {
    this.em = equipmentManager; this.forge = forge;
    // Hito 78: cada guardado devuelve el saldo del servidor (p. ej. el oro de una venta del Mercado hecha por otro
    // jugador). Se aplica solo si ninguna operación de dinero empezó o terminó mientras el guardado viajaba.
    const cloud = accountManager?.cloud;
    if (cloud) {
      cloud.walletTicket = () => ({ seq: this._seq, busy: this._busy });
      cloud.onServerWallet = (slotId, res, t) => {
        if (!t || t.busy || this._busy || t.seq !== this._seq) return;
        if (!this.active || Number(slotId) !== this.slot) return;
        this.apply(res);
      };
    }
  }

  /** Envuelve una operación que cambia el saldo (la cuenta como «en curso»). */
  async track(promise) {
    this._busy++;
    try { return await promise; } finally { this._busy--; }
  }

  /** ¿La economía va por el servidor? (partida con cuenta y funciones desplegadas) */
  get active() {
    return !this.unavailable && accountManager?.mode === 'account' && Boolean(saveSlotManager?.activeSlotId);
  }

  get slot() { return Number(saveSlotManager?.activeSlotId) || null; }

  _idem(tag) { return `${tag}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 9)}`; }

  async _rpc(fn, args) {
    const token = await authService.getAccessToken();
    try {
      return await supabaseFetch(`/rest/v1/rpc/${fn}`, { method: 'POST', token, body: args });
    } catch (e) {
      const msg = `${e?.code || ''} ${e?.message || ''}`;
      if (/PGRST202|could not find the function|does not exist|404/i.test(msg)) {
        console.warn('[Economy] La base de datos no tiene las funciones de economía: sigo en local.', msg);
        this.unavailable = true;
        throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
      }
      if (e?.code === 'network' || e?.code === 'server_unavailable') throw Object.assign(new Error('offline'), { code: 'offline' });
      throw e;
    }
  }

  /** Pone en la partida el saldo que manda el servidor. */
  apply(res) {
    if (!res || res.gold == null) return;
    this._seq++;
    const em = this.em, forge = this.forge;
    if (em) em.gold = Math.max(0, Number(res.gold) || 0);
    if (forge?._store) {
      const f = forge._store();
      f.slp = Math.max(0, Number(res.slp) || 0);
      f.baxs = +Math.max(0, Number(res.baxs) || 0).toFixed(2);
    }
    try { forge?._commit?.(false); } catch { /* nada */ }
    try { em?._notifyChange?.(); } catch { /* nada */ }
  }

  async _op(fn, args) {
    const res = await this.track(this._rpc(fn, { p_slot: this.slot, ...args }));
    this.apply(res);
    return res || { ok: false, error: 'empty' };
  }

  /** Saldo del servidor al empezar la partida (lo crea la primera vez, con tope). */
  async sync() {
    if (!this.active) return null;
    try { return await this._op('economy_get', {}); } catch (e) { return { ok: false, error: e.code || 'error' }; }
  }

  /** Oro de un combate ganado (20–45, lo decide el servidor). Sin conexión queda pendiente. */
  async battleGold() {
    const args = { p_idem: this._idem('battle') };
    try { return await this._op('economy_battle_gold', args); } catch (e) {
      if (e.code === 'offline') { this._queue('economy_battle_gold', args); return { ok: false, error: 'pending' }; }
      return { ok: false, error: e.code || 'error' };
    }
  }

  /** Antes de vender: que el servidor tenga la última copia de la partida (ahí comprueba que el objeto es tuyo). */
  async _flushSave() {
    try { window.__AXIE_TACTICS_APP__?._saveCurrentProgress?.(); } catch { /* nada */ }
    try { await accountManager.cloud?.flush?.(); } catch { /* si falla, el servidor usa la copia que tenga */ }
  }

  async _spend(fn, args) {
    try { return await this._op(fn, { ...args, p_idem: this._idem(fn) }); } catch (e) { return { ok: false, error: e.code || 'error' }; }
  }
  shopBuy(item, qty) { return this._spend('economy_shop_buy', { p_item: item, p_qty: qty }); }
  async shopSell(item, qty) { await this._flushSave(); return this._spend('economy_shop_sell', { p_item: item, p_qty: qty }); }
  shopRebuy(item, qty) { return this._spend('economy_shop_rebuy', { p_item: item, p_qty: qty }); }
  /** kind: craft (key = receta) · evolve (key = '<pieza>:<rapidez>') · speed (key = '<trabajo>:<pieza destino>:<x>') */
  forgePay(kind, key) { return this._spend('economy_forge', { p_kind: kind, p_key: key }); }

  /** Recompensa de una sola vez (misión, tutorial). Sin conexión queda pendiente. */
  async reward(id) {
    const args = { p_reward: id, p_idem: this._idem(`reward:${id}`) };
    try { return await this._op('economy_reward', args); } catch (e) {
      if (e.code === 'offline') { this._queue('economy_reward', args); return { ok: false, error: 'pending' }; }
      return { ok: false, error: e.code || 'error' };
    }
  }

  _queue(fn, args) {
    this.pending.push({ fn, args, slot: this.slot });
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._flushPending(), RETRY_MS);
  }

  async _flushPending() {
    if (!this.pending.length || !this.active) return;
    const item = this.pending[0];
    if (item.slot !== this.slot) { this.pending.shift(); this._flushPending(); return; } // otra partida
    try {
      await this._op(item.fn, item.args); // la misma clave de idempotencia: nunca se cobra dos veces
      this.pending.shift();
    } catch (e) {
      if (e.code !== 'offline') this.pending.shift();
    }
    if (this.pending.length) this._timer = setTimeout(() => this._flushPending(), RETRY_MS);
  }

  /** Mensaje para el jugador a partir de una respuesta fallida. */
  why(res) {
    const code = res?.error || 'error';
    const n = res?.need;
    const KEYS = {
      offline: 'notices.economy.offline', unavailable: 'notices.economy.error', need_gold: 'notices.economy.needGold',
      need_slp: 'notices.economy.needSlp', need_baxs: 'notices.economy.needBaxs', daily_cap: 'notices.economy.dailyCap',
      too_fast: 'notices.economy.tooFast', not_owned: 'notices.economy.notOwned', already_claimed: 'notices.economy.alreadyClaimed',
      nothing_to_rebuy: 'notices.economy.nothingToRebuy', not_for_sale: 'notices.shop.notForSale', not_sellable: 'notices.economy.notSellable',
    };
    return i18n.t(KEYS[code] || 'notices.economy.error', { n: n != null ? n : '' });
  }
}

export const EconomyService = new EconomyServiceImpl();
if (typeof window !== 'undefined') window.lunakaiEconomy = EconomyService;
