// PvpService.js — Arena PvP en el cliente: llamadas al servidor, cola de emparejamiento y canal de avisos.
// Arena PvP, fase P2. Servidor: supabase/migrations/20261106000000_arena_pvp.sql (+ 20261106000001_arena_realtime.sql).
// La partida en sí (órdenes, huellas, tiempo, final) la lleva PvpSession (rpg/arena/PvpSession.js).
//
//   pvpService.me() · board(season) · startQueue({ slot, onStatus, onMatched }) → stop()
//   pvpService.match(id, from) · act · timeout · ack · report · dispute · surrender (las usa PvpSession)
// Solo cuentas: todas las llamadas (salvo board) llevan el token del jugador.

import { supabaseFetch, AuthError } from './AuthService.js';
import { accountManager } from './AccountManager.js';
import { RealtimeClient } from './RealtimeClient.js';

const QUEUE_BEAT_MS = 4000;      // latido de la cola (el servidor la caduca a los 2 min sin latido)
const RETRYABLE = new Set(['network', 'server_unavailable', 'rate_limited']);

/** sub (id de usuario) de un JWT, sin comprobar la firma (solo para identificarse en la presencia). */
export function jwtSub(token) {
  try {
    const part = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(part) : Buffer.from(part, 'base64').toString('utf8');
    return JSON.parse(json).sub || null;
  } catch { return null; }
}

export class PvpService {
  /**
   * @param {object} [deps]  (pruebas) fetch: (path, opts) => data · getToken: () => Promise<string> · realtime: RealtimeClient
   */
  constructor({ fetch = null, getToken = null, realtime = null } = {}) {
    this._fetch = fetch || supabaseFetch;
    this._getToken = getToken || (() => accountManager.auth.getAccessToken());
    this._rt = realtime;
    this._uid = null;
    this._clockSkew = 0;
  }

  get realtime() {
    if (!this._rt) this._rt = new RealtimeClient({ getToken: () => this._getToken() });
    return this._rt;
  }

  async uid() {
    if (!this._uid) this._uid = jwtSub(await this._getToken());
    return this._uid;
  }

  /** Cierra la conexión de tiempo real si ya no hay ningún canal abierto (al salir de la cola o de una partida). */
  releaseRealtime() {
    if (this._rt && this._rt.channels.size === 0) this._rt.disconnect();
  }

  /** Hora del servidor (aproximada) en ms. */
  serverNow() { return Date.now() + this._clockSkew; }
  _clock(res) {
    const now = res?.now || res?.match?.now;
    if (now) this._clockSkew = new Date(now).getTime() - Date.now();
  }

  /** Llamada a una función del servidor. Reintenta los fallos de red (hasta 3 veces). Devuelve el JSON tal cual. */
  async rpc(fn, args = {}, { auth = true, retries = 2 } = {}) {
    for (let i = 0; ; i++) {
      try {
        const token = auth ? await this._getToken() : undefined;
        const res = await this._fetch(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args, token });
        this._clock(res);
        return res;
      } catch (err) {
        if (i < retries && RETRYABLE.has(err?.code)) { await new Promise((r) => setTimeout(r, 400 * (i + 1))); continue; }
        throw err instanceof AuthError ? err : new AuthError(err?.code || 'error', String(err?.message || err));
      }
    }
  }

  me() { return this.rpc('pvp_me'); }
  board(season = null) { return this.rpc('pvp_board', season ? { p_season: season } : {}, { auth: false }); }
  enqueue(slot) { return this.rpc('pvp_enqueue', { p_slot: slot }); }
  leaveQueue() { return this.rpc('pvp_leave_queue'); }
  match(id, from = 0) { return this.rpc('pvp_match', { p_match: id, p_from: from }); }
  act(id, seq, order, hash = null, next = null) { return this.rpc('pvp_act', { p_match: id, p_seq: seq, p_order: order, p_hash: hash, p_next: next }, { retries: 0 }); }
  timeout(id, seq, hash, next) { return this.rpc('pvp_timeout', { p_match: id, p_seq: seq, p_hash: hash, p_next: next }, { retries: 0 }); }
  ack(id, seq, hash) { return this.rpc('pvp_ack', { p_match: id, p_seq: seq, p_hash: hash }); }
  report(id, winner, reason, hash) { return this.rpc('pvp_report', { p_match: id, p_winner: winner, p_reason: reason, p_hash: hash }); }
  dispute(id, reason, seq = null) { return this.rpc('pvp_dispute', { p_match: id, p_reason: reason, p_seq: seq }); }
  surrender(id) { return this.rpc('pvp_surrender', { p_match: id }); }

  /**
   * Buscar rival. Llama a pvp_enqueue cada 4 s (latido) y escucha el aviso «matched» de su canal personal para
   * enterarse en el acto. onStatus({ status, waited, window, points, error }) · onMatched(match).
   * Devuelve stop(leave = true): para de buscar (y sale de la cola).
   */
  startQueue({ slot, onStatus = null, onMatched = null }) {
    let stopped = false, timer = null, busy = false, channel = null;
    const finish = (match) => {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      channel?.unsubscribe();
      onMatched?.(match);
    };
    const beat = async () => {
      if (stopped || busy) return;
      busy = true;
      try {
        const res = await this.enqueue(slot);
        if (stopped) return;
        if (res?.ok === false) { onStatus?.({ status: 'error', error: res.error }); stop(false); return; }
        if (res.status === 'matched' || res.status === 'in_match') { finish(res.match); return; }
        onStatus?.({ status: 'queued', waited: res.waited, window: res.window, points: res.points });
      } catch (err) {
        if (!stopped) onStatus?.({ status: 'retrying', error: err?.code || 'error' });
      } finally {
        busy = false;
        if (!stopped) { clearTimeout(timer); timer = setTimeout(beat, QUEUE_BEAT_MS); }
      }
    };
    const stop = (leave = true) => {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      channel?.unsubscribe();
      if (leave) this.leaveQueue().catch(() => {});
    };
    // Aviso inmediato por Realtime (si falla, el latido acaba enterándose igual)
    this.uid().then((uid) => {
      if (stopped || !uid) return;
      channel = this.realtime.channel(`pvp_user:${uid}`);
      channel.on('matched', () => { clearTimeout(timer); beat(); });
      channel.subscribe().catch(() => {});
    }).catch(() => {});
    beat();
    return stop;
  }
}

export const pvpService = new PvpService();
if (typeof window !== 'undefined') window.lunakaiPvp = pvpService;
