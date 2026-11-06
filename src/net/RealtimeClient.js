// RealtimeClient.js — Cliente mínimo de Supabase Realtime (protocolo Phoenix 1.0.0 sobre WebSocket), sin npm.
// Arena PvP, fase P2. Solo lo que usa la Arena: canales privados con «broadcast» (avisos que manda el servidor con
// realtime.send) y presencia (¿está conectado el rival?). El cliente no manda broadcast: las órdenes van por RPC.
//
//   const rt = new RealtimeClient({ getToken: () => authService.getAccessToken() });
//   const ch = rt.channel('pvp:<partida>', { presenceKey: uid });
//   ch.on('action', (payload) => …);              // broadcast del servidor (evento «action»)
//   ch.onPresence((state) => …);                  // { clave: [metas] } tras cada cambio
//   await ch.subscribe(); ch.track({ side: 'A' }); …; ch.unsubscribe();
//   rt.onStatus((s) => …)                          // 'connecting' | 'open' | 'closed'
//
// Reconexión sola con espera creciente (1, 2, 5, 10 s), latido cada 25 s, vuelve a unirse a los canales y renueva el
// token de acceso de cada canal cada 4 min (los JWT de Supabase duran 1 h).

import { NET_CONFIG } from './config.js';

const HEARTBEAT_MS = 25_000;
const TOKEN_REFRESH_MS = 4 * 60_000;
const BACKOFF_MS = [1000, 2000, 5000, 10000];
const JOIN_TIMEOUT_MS = 10_000;

export class RealtimeClient {
  /**
   * @param {object} opts
   *   url        wss://…/realtime/v1/websocket (por defecto, la del proyecto de NET_CONFIG)
   *   apikey     clave pública del proyecto
   *   getToken   () => Promise<string> JWT del jugador (canales privados)
   *   WebSocket  constructor (pruebas en Node)
   */
  constructor({ url = null, apikey = NET_CONFIG.supabaseAnonKey, getToken = null, WebSocket: WS = null } = {}) {
    const base = url || `${NET_CONFIG.supabaseUrl.replace(/^http/, 'ws')}/realtime/v1/websocket`;
    this.url = `${base}${base.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(apikey || '')}&vsn=1.0.0`;
    this.getToken = getToken;
    this.WS = WS || globalThis.WebSocket;
    this.ws = null;
    this.ref = 0;
    this.channels = new Map();   // tema → RealtimeChannel
    this.pending = new Map();    // ref → { resolve, reject, timer }
    this.status = 'closed';
    this._statusFns = new Set();
    this._retry = 0;
    this._hb = null;
    this._tokenTimer = null;
    this._closedByUser = false;
    this._openWaiters = [];
  }

  onStatus(fn) { this._statusFns.add(fn); return () => this._statusFns.delete(fn); }
  _setStatus(s) { if (this.status === s) return; this.status = s; this._statusFns.forEach((fn) => { try { fn(s); } catch { /* nada */ } }); }
  _nextRef() { this.ref += 1; return String(this.ref); }

  /** Abre la conexión (si no lo está) y resuelve al abrirse. */
  connect() {
    if (this.status === 'open') return Promise.resolve();
    const p = new Promise((resolve) => this._openWaiters.push(resolve));
    if (this.ws && this.status === 'connecting') return p;
    this._closedByUser = false;
    this._setStatus('connecting');
    let ws;
    try { ws = new this.WS(this.url); } catch (e) { this._scheduleReconnect(); return p; }
    this.ws = ws;
    ws.onopen = () => {
      this._retry = 0;
      this._setStatus('open');
      this._startHeartbeat();
      this._startTokenRefresh();
      const waiters = this._openWaiters.splice(0);
      waiters.forEach((fn) => fn());
      for (const ch of this.channels.values()) if (ch.wanted) ch._join().catch(() => {});
    };
    ws.onmessage = (ev) => this._onMessage(ev.data);
    ws.onclose = () => this._onClose(ws);
    ws.onerror = () => { /* llega onclose */ };
    return p;
  }

  /** Cierra todo (sin reconectar). */
  disconnect() {
    this._closedByUser = true;
    clearInterval(this._hb); clearInterval(this._tokenTimer); clearTimeout(this._reconnectTimer);
    for (const ch of this.channels.values()) ch._reset();
    this.channels.clear();
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('closed')); }
    this.pending.clear();
    try { this.ws?.close(); } catch { /* nada */ }
    this.ws = null;
    this._setStatus('closed');
  }

  channel(topic, { presenceKey = '' } = {}) {
    const full = topic.startsWith('realtime:') ? topic : `realtime:${topic}`;
    let ch = this.channels.get(full);
    if (!ch) { ch = new RealtimeChannel(this, full, presenceKey); this.channels.set(full, ch); }
    return ch;
  }

  _send(msg) {
    if (this.status !== 'open' || !this.ws) return false;
    try { this.ws.send(JSON.stringify(msg)); return true; } catch { return false; }
  }

  /** Manda y espera la respuesta (phx_reply) con el mismo ref. */
  _push(topic, event, payload, joinRef = null) {
    const ref = this._nextRef();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(ref); reject(new Error('timeout')); }, JOIN_TIMEOUT_MS);
      this.pending.set(ref, { resolve, reject, timer });
      if (!this._send({ topic, event, payload, ref, join_ref: joinRef })) {
        clearTimeout(timer); this.pending.delete(ref); reject(new Error('not_connected'));
      }
    });
  }

  _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const { topic, event, payload, ref } = msg;
    if (event === 'phx_reply' && ref && this.pending.has(ref)) {
      const p = this.pending.get(ref);
      this.pending.delete(ref);
      clearTimeout(p.timer);
      if (payload?.status === 'ok') p.resolve(payload.response || {});
      else p.reject(Object.assign(new Error(payload?.response?.reason || 'error'), { response: payload?.response }));
      return;
    }
    const ch = this.channels.get(topic);
    if (ch) ch._onMessage(event, payload);
  }

  _onClose(ws) {
    if (ws !== this.ws) return;
    clearInterval(this._hb); clearInterval(this._tokenTimer);
    this.ws = null;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('closed')); }
    this.pending.clear();
    for (const ch of this.channels.values()) ch._reset();
    this._setStatus('closed');
    if (!this._closedByUser) this._scheduleReconnect();
  }

  _scheduleReconnect() {
    clearTimeout(this._reconnectTimer);
    const wait = BACKOFF_MS[Math.min(this._retry, BACKOFF_MS.length - 1)];
    this._retry += 1;
    this._reconnectTimer = setTimeout(() => { if (!this._closedByUser) { this.ws = null; this.connect(); } }, wait);
  }

  _startHeartbeat() {
    clearInterval(this._hb);
    this._hb = setInterval(() => {
      this._push('phoenix', 'heartbeat', {}).catch(() => { try { this.ws?.close(); } catch { /* nada */ } });
    }, HEARTBEAT_MS);
  }

  _startTokenRefresh() {
    clearInterval(this._tokenTimer);
    if (!this.getToken) return;
    this._tokenTimer = setInterval(async () => {
      let token;
      try { token = await this.getToken(); } catch { return; }
      for (const ch of this.channels.values()) if (ch.joined) this._send({ topic: ch.topic, event: 'access_token', payload: { access_token: token }, ref: this._nextRef() });
    }, TOKEN_REFRESH_MS);
  }
}

export class RealtimeChannel {
  constructor(client, topic, presenceKey) {
    this.client = client;
    this.topic = topic;
    this.presenceKey = presenceKey;
    this.handlers = new Map();   // evento de broadcast → Set(fn)
    this.presence = {};          // clave → [metas]
    this._presenceFns = new Set();
    this._joinFns = new Set();
    this.joined = false;
    this.wanted = false;
    this._joinRef = null;
    this._tracked = null;
  }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return () => this.handlers.get(event)?.delete(fn);
  }

  onPresence(fn) { this._presenceFns.add(fn); return () => this._presenceFns.delete(fn); }
  /** Cada vez que el canal queda unido (también tras una reconexión: momento de pedir lo que falte). */
  onJoin(fn) { this._joinFns.add(fn); return () => this._joinFns.delete(fn); }

  async subscribe() {
    this.wanted = true;
    await this.client.connect();
    if (!this.joined) await this._join();
    return this;
  }

  async _join() {
    let token = null;
    if (this.client.getToken) { try { token = await this.client.getToken(); } catch { token = null; } }
    this._joinRef = this.client._nextRef();
    const payload = {
      config: { broadcast: { ack: false, self: false }, presence: { key: this.presenceKey || '' }, postgres_changes: [], private: true },
      ...(token ? { access_token: token } : {}),
    };
    await this.client._push(this.topic, 'phx_join', payload, this._joinRef);
    this.joined = true;
    if (this._tracked) this._sendTrack(this._tracked);
    this._joinFns.forEach((fn) => { try { fn(); } catch { /* nada */ } });
  }

  /** Presencia propia (se repite sola al volver a unirse). */
  track(meta = {}) {
    this._tracked = meta;
    if (this.joined) this._sendTrack(meta);
  }

  _sendTrack(meta) {
    this.client._send({ topic: this.topic, event: 'presence', payload: { type: 'presence', event: 'track', payload: meta }, ref: this.client._nextRef(), join_ref: this._joinRef });
  }

  unsubscribe() {
    this.wanted = false;
    if (this.joined) this.client._send({ topic: this.topic, event: 'phx_leave', payload: {}, ref: this.client._nextRef(), join_ref: this._joinRef });
    this._reset();
    this.client.channels.delete(this.topic);
  }

  _reset() { this.joined = false; this.presence = {}; }

  _onMessage(event, payload) {
    if (event === 'broadcast') {
      const fns = this.handlers.get(payload?.event);
      if (fns) fns.forEach((fn) => { try { fn(payload.payload, payload); } catch (e) { console.warn('[Realtime]', e); } });
      return;
    }
    if (event === 'presence_state') { this.presence = normPresence(payload); this._emitPresence(); return; }
    if (event === 'presence_diff') {
      const next = { ...this.presence };
      for (const [k, v] of Object.entries(payload?.leaves || {})) {
        const leaving = new Set((v.metas || []).map((m) => m.phx_ref));
        next[k] = (next[k] || []).filter((m) => !leaving.has(m.phx_ref));
        if (!next[k].length) delete next[k];
      }
      for (const [k, v] of Object.entries(payload?.joins || {})) next[k] = [...(next[k] || []), ...(v.metas || [])];
      this.presence = next;
      this._emitPresence();
      return;
    }
    if (event === 'phx_error' || event === 'phx_close') {
      this.joined = false;
      if (this.wanted && this.client.status === 'open') setTimeout(() => { if (this.wanted && !this.joined) this._join().catch(() => {}); }, 1000);
    }
  }

  _emitPresence() { this._presenceFns.forEach((fn) => { try { fn(this.presence); } catch { /* nada */ } }); }
}

function normPresence(state) {
  const out = {};
  for (const [k, v] of Object.entries(state || {})) out[k] = [...(v.metas || [])];
  return out;
}
