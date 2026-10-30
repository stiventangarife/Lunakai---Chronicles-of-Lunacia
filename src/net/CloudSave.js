// CloudSave.js — Sincroniza las ranuras de SaveSlotManager con Supabase (tabla save_slots).
//
// - localStorage es la caché por cuenta (el juego sigue guardando como siempre, al instante).
// - Cada cambio marca la ranura como "pendiente" y se sube tras unos segundos (debounce).
// - El servidor guarda con versión: si otro dispositivo guardó antes, gana la copia jugada
//   más recientemente (lastSaved) y se avisa al jugador; nunca se pisa en silencio.
// - Si falla la red, reintenta con espera creciente y expone el estado para el indicador.

import { NET_CONFIG } from './config.js';
import { supabaseFetch } from './AuthService.js';
import * as i18n from '../i18n/i18n.js';

const LOCAL_ONLY_FIELDS = ['sapidaePortrait', 'sapidaePortraitKey']; // pesados y regenerables: no viajan a la nube (la clave va con su retrato)

/** Copia de la ranura lista para subir. */
export function toCloudData(slot) {
  if (!slot) return null;
  const copy = JSON.parse(JSON.stringify(slot));
  LOCAL_ONLY_FIELDS.forEach((k) => delete copy[k]);
  return copy;
}

/** Huella del contenido (ignora la marca de tiempo) para no subir lo mismo dos veces. */
export function contentHash(data) {
  if (!data) return '';
  const { lastSaved, ...rest } = data;
  const s = JSON.stringify(rest);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + ':' + s.length;
}

export class CloudSave {
  constructor({ saveSlotManager, authService, config = NET_CONFIG.cloudSave, fetcher = supabaseFetch } = {}) {
    this.ssm = saveSlotManager;
    this.auth = authService;
    this.cfg = config;
    this.fetch = fetcher;
    this.status = 'idle';      // idle | saving | saved | error | offline
    this.lastError = null;
    this._timers = new Map();
    this._retryTimer = null;
    this._retryIndex = 0;
    this._inflight = new Map();
    this._listeners = new Set();
    this.enabled = false;
    this.onServerApplied = null; // Hito 77: (slotId, deltas) → MarketService
    this.walletTicket = null;    // Hito 78: () → marca del saldo (EconomyService)
    this.onServerWallet = null;  // Hito 78: (slotId, res, ticket) → EconomyService
  }

  onStatus(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  _setStatus(status, extra = {}) {
    this.status = status;
    Object.assign(this, extra);
    this._listeners.forEach((fn) => { try { fn(status, this); } catch (e) { console.warn('[CloudSave] listener', e); } });
  }

  /** Activa la sincronización para la cuenta actual. */
  enable() {
    this.enabled = true;
    this.ssm.onLocalChange = (slotIds) => slotIds.forEach((id) => this.schedule(id));
    this.ssm.onLocalDelete = (slotId) => this.deleteSlot(slotId);
  }

  disable() {
    this.enabled = false;
    this.ssm.onLocalChange = null;
    this.ssm.onLocalDelete = null;
    this._timers.forEach((t) => clearTimeout(t));
    this._timers.clear();
    clearTimeout(this._retryTimer);
    this._setStatus('idle', { lastError: null });
  }

  hasPending() { return this.ssm.getDirtySlotIds().length > 0 || this.ssm.getPendingDeletes().length > 0; }

  // ------------------------------------------------ descarga

  /**
   * Trae las ranuras de la cuenta y las mezcla con la caché local.
   * Devuelve { notices: string[] } con avisos para el jugador.
   */
  async pullAll() {
    const token = await this.auth.getAccessToken();
    const rows = await this.fetch('/rest/v1/save_slots?select=slot_id,data,version,updated_at&order=slot_id', { token });
    const bySlot = new Map((rows || []).map((r) => [Number(r.slot_id), r]));
    const notices = [];

    for (const id of [1, 2, 3]) {
      const remote = bySlot.get(id);
      const local = this.ssm.getSlot(id);
      const dirty = this.ssm.isDirty(id);

      if (remote) {
        const remoteTime = Number(remote.data?.lastSaved || 0);
        const localTime = Number(local?.lastSaved || 0);
        if (local && dirty && localTime > remoteTime) {
          // Progreso local sin subir y más reciente: se conserva y se sube encima.
          this.ssm.setCloudVersion(id, remote.version);
          this.schedule(id, 0);
        } else {
          this.ssm.applyCloudSlot(id, remote.data, remote.version);
          this._lastHash(id, contentHash(toCloudData(remote.data)));
        }
      } else if (local) {
        if (dirty || !this.ssm.getCloudVersion(id)) {
          this.ssm.setCloudVersion(id, 0);
          this.ssm.markDirty(id);
          this.schedule(id, 0);
        } else {
          // Tenía versión en la nube y ya no está: se borró desde otro dispositivo.
          this.ssm.removeSlotLocal(id);
          notices.push(i18n.t('account.notice.slotDeletedRemote', { id }));
        }
      }
    }

    for (const id of this.ssm.getPendingDeletes()) this.deleteSlot(id);
    this._setStatus(this.hasPending() ? 'saving' : 'saved', { lastError: null });
    return { notices };
  }

  // ------------------------------------------------ subida

  schedule(slotId, delay = this.cfg.debounceMs) {
    if (!this.enabled) return;
    clearTimeout(this._timers.get(slotId));
    this._timers.set(slotId, setTimeout(() => {
      this._timers.delete(slotId);
      this._push(slotId).catch(() => { /* gestionado en _push */ });
    }, delay));
  }

  /** Sube ya todo lo pendiente. keepalive=true para el cierre de la pestaña. */
  async flush({ keepalive = false } = {}) {
    if (!this.enabled) return true;
    this._timers.forEach((t) => clearTimeout(t));
    this._timers.clear();
    const ids = this.ssm.getDirtySlotIds();
    const results = await Promise.allSettled(ids.map((id) => this._push(id, { keepalive })));
    return results.every((r) => r.status === 'fulfilled');
  }

  retryNow() {
    clearTimeout(this._retryTimer);
    this._retryIndex = 0;
    return this.flush();
  }

  _lastHash(id, value) {
    this._hashes = this._hashes || new Map();
    if (value !== undefined) this._hashes.set(id, value);
    return this._hashes.get(id);
  }

  async _push(slotId, { keepalive = false } = {}) {
    if (this._inflight.has(slotId)) {
      await this._inflight.get(slotId).catch(() => null);
      if (!this.ssm.isDirty(slotId)) return;
    }
    const run = this._doPush(slotId, { keepalive });
    this._inflight.set(slotId, run);
    try { return await run; } finally { this._inflight.delete(slotId); }
  }

  async _doPush(slotId, { keepalive }) {
    const slot = this.ssm.getSlot(slotId);
    if (!slot) { this.ssm.clearDirty(slotId); return; }
    const data = toCloudData(slot);
    const hash = contentHash(data);
    if (hash === this._lastHash(slotId) && this.ssm.getCloudVersion(slotId)) {
      this.ssm.clearDirty(slotId);
      if (!this.hasPending()) this._setStatus('saved');
      return;
    }

    this._setStatus('saving');
    const snapshotTime = slot.lastSaved;
    try {
      const token = keepalive ? this.auth.session?.access_token : await this.auth.getAccessToken();
      let expected = this.ssm.getCloudVersion(slotId) || 0;
      let ticket = this.walletTicket?.() || null; // Hito 78: para aplicar el saldo que devuelve el guardado
      let res = await this._rpcSave(slotId, data, expected, token, keepalive);

      if (res && res.conflict) {
        const remoteTime = Number(res.data?.lastSaved || 0);
        if (res.data && remoteTime > Number(slot.lastSaved || 0)) {
          // Otro dispositivo tiene una partida jugada más tarde: se adopta esa.
          this.ssm.applyCloudSlot(slotId, res.data, res.version);
          this._lastHash(slotId, contentHash(toCloudData(res.data)));
          this._setStatus(this.hasPending() ? 'saving' : 'saved', {
            lastNotice: i18n.t('account.notice.slotLoadedRemote', { id: slotId }),
          });
          this._listeners.forEach((fn) => { try { fn('conflict', this); } catch { /* nada */ } });
          return;
        }
        // La copia local es la más reciente: se sube sobre la versión del servidor.
        expected = res.version;
        ticket = this.walletTicket?.() || null;
        res = await this._rpcSave(slotId, data, expected, token, keepalive);
      }
      if (!res || !res.ok) throw Object.assign(new Error('save_rejected'), { code: 'save_rejected', retryable: true });

      this.ssm.setCloudVersion(slotId, res.version);
      this._lastHash(slotId, hash);
      // Hito 78: saldo del servidor (oro de una venta del Mercado, etc.) sin esperar a recargar la partida
      if (res.gold != null && typeof this.onServerWallet === 'function') {
        try { this.onServerWallet(slotId, res, ticket); } catch (e) { console.warn('[CloudSave] onServerWallet', e); }
      }
      // Hito 77: entradas y salidas del Mercado que aplicó el servidor al guardar (el juego las aplica si aún no estaban)
      if (Array.isArray(res.applied) && res.applied.length && typeof this.onServerApplied === 'function') {
        try { this.onServerApplied(slotId, res.applied); } catch (e) { console.warn('[CloudSave] onServerApplied', e); }
      }
      if (this.ssm.getSlot(slotId)?.lastSaved === snapshotTime) this.ssm.clearDirty(slotId);
      else this.schedule(slotId); // hubo cambios mientras subía

      this._retryIndex = 0;
      if (!this.hasPending()) this._setStatus('saved', { lastError: null, lastSavedAt: Date.now() });
    } catch (err) {
      const offline = err.code === 'network';
      this._setStatus(offline ? 'offline' : 'error', { lastError: err });
      if (err.code === 'session_expired') return; // la UI pedirá iniciar sesión de nuevo
      this._scheduleRetry();
      throw err;
    }
  }

  _rpcSave(slotId, data, expected, token, keepalive) {
    return this.fetch('/rest/v1/rpc/save_slot', {
      method: 'POST',
      token,
      keepalive,
      body: { p_slot_id: slotId, p_data: data, p_expected_version: expected },
    });
  }

  _scheduleRetry() {
    clearTimeout(this._retryTimer);
    const delays = this.cfg.retryDelaysMs;
    const wait = delays[Math.min(this._retryIndex, delays.length - 1)];
    this._retryIndex++;
    this._retryTimer = setTimeout(() => this.flush().catch(() => null), wait);
  }

  // ------------------------------------------------ borrado

  async deleteSlot(slotId) {
    if (!this.enabled) return;
    this.ssm.addPendingDelete(slotId);
    try {
      const token = await this.auth.getAccessToken();
      await this.fetch(`/rest/v1/save_slots?slot_id=eq.${slotId}`, { method: 'DELETE', token });
      this.ssm.clearPendingDelete(slotId);
      this._lastHash(slotId, '');
    } catch (err) {
      this._setStatus(err.code === 'network' ? 'offline' : 'error', { lastError: err });
      this._scheduleRetry();
    }
  }

  // ------------------------------------------------ invitado → cuenta

  /**
   * Copia las aventuras del invitado a la cuenta.
   * strategy: 'fill' (solo ranuras libres) | 'replace' (sobrescribe las de la cuenta).
   * Devuelve { imported, skipped }.
   */
  async importGuestSlots(guestSlots, strategy = 'fill') {
    const free = [1, 2, 3].filter((id) => !this.ssm.getSlot(id));
    const entries = Object.entries(guestSlots).filter(([, d]) => d);
    let imported = 0;
    let skipped = 0;
    for (const [key, data] of entries) {
      const original = Number(key);
      let target = null;
      if (strategy === 'replace') target = original;
      else if (!this.ssm.getSlot(original)) target = original;
      else target = free.find((id) => !this.ssm.getSlot(id)) || null;
      if (!target) { skipped++; continue; }
      this.ssm.importSlot(target, { ...data, id: target, lastSaved: Date.now() });
      imported++;
    }
    await this.flush();
    return { imported, skipped };
  }
}
