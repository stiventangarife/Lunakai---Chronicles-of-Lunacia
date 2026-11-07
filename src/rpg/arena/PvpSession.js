// PvpSession.js — Una partida de la Arena PvP en el cliente (fase P2).
// Plan: docs/PLAN_ARENA_PVP.md (sección 13). Une el motor de combate (el mismo en los dos jugadores) con el servidor:
//
//   · Mis órdenes: el motor las comprueba y aplica; luego van al servidor (pvp_act) con su número. Un fin de turno
//     lleva la huella del estado y el bando que juega después.
//   · Las del rival (y los fines de turno forzados por tiempo): llegan por Realtime («action») o, si se pierde
//     alguna, se piden al servidor desde la última aplicada (pvp_match). Se aplican en orden, una a una.
//   · Huellas: al aplicar el fin de turno del rival se confirma su huella (pvp_ack); si no coincide, el servidor
//     abre una disputa. Una orden del rival que mi motor no acepta → disputa (pvp_dispute).
//   · Tiempo: si el rival agota su turno (45 s + 5), se pide el fin forzado (pvp_timeout). Al tercero seguido, pierde.
//   · Final: cuando el motor termina, se informa (pvp_report). El resultado oficial llega por el aviso «status».
//   · Reconexión: al volver a unirse al canal se piden las órdenes que falten. Si el servidor rechaza una orden mía
//     (estado distinto), el motor se rehace desde cero con las órdenes guardadas (resync).
//   · Presencia: se sabe si el rival está conectado (aviso «rival desconectado»; el reloj del turno hace el resto).
//
// El motor es cualquier objeto con: apply(order) → Promise<huella> (lanza si la orden es ilegal), hash(), turnSide
// ('A'|'B'), over, result { winnerSide: 'A'|'B'|'draw', reason }. HeadlessCombat lo cumple, y el combate del juego
// también (rpg/arena/PvpBattle.js, fase P3).
//
// Eventos (onEvent): { type: 'applied', seq, side, order } · 'turn' { side, mine, deadline } · 'opponent' { online }
//   · 'finished' { match } · 'disputed' { match } · 'rejected' { error } · 'resync' · 'error' { error }

import { pvpService as defaultService } from '../../net/PvpService.js';

const CLAIM_MARGIN_MS = 1500; // margen extra antes de pedir el fin forzado (relojes que no van a la par)
export const winnerSide = (w) => (w === 'player' ? 'A' : w === 'enemy' ? 'B' : 'draw');
const other = (s) => (s === 'A' ? 'B' : 'A');

export class PvpSession {
  /**
   * @param {object} p
   *   match         partida tal como la da el servidor (_pvp_match_out: id, side, seed, map, A, B, …)
   *   createEngine  (match, { resync }) => motor nuevo desde el principio de la partida (con resync puede devolver una promesa)
   *   service       PvpService (por defecto el del juego)
   *   onEvent       (evento) => void
   */
  constructor({ match, createEngine, service = defaultService, onEvent = null }) {
    this.match = match;
    this.id = match.id;
    this.side = match.side;
    this.createEngine = createEngine;
    this.service = service;
    this.onEvent = onEvent;
    this.engine = createEngine(match);
    this.seq = 0;                 // siguiente orden que falta por aplicar (= la siguiente que se mandará)
    this.turnDeadline = match.turnDeadline ? new Date(match.turnDeadline).getTime() : null;
    this.status = match.status || 'active';
    this.turnSecs = match.turnSecs || 45;   // duración del turno y margen del servidor (pvp_settings)
    this.graceSecs = match.graceSecs ?? 5;
    this.opponentOnline = null;
    this._chain = Promise.resolve();
    this._claimedSeq = -1;
    this._reported = false;
    this._timer = null;
    this.channel = null;
  }

  _emit(type, data = {}) { try { this.onEvent?.({ type, ...data }); } catch (e) { console.warn('[PvP]', e); } }
  /** Todo lo que toca el motor pasa en fila: nunca dos órdenes a la vez. */
  _queue(fn) { const p = this._chain.then(fn, fn); this._chain = p.catch(() => {}); return p; }

  get myTurn() { return !this.engine.over && this.engine.turnSide === this.side && this.status === 'active'; }

  /** Conecta el canal de la partida, se pone al día y empieza a vigilar el tiempo. */
  async start() {
    const uid = await this.service.uid().catch(() => null);
    this.channel = this.service.realtime.channel(`pvp:${this.id}`, { presenceKey: uid || this.side });
    this.channel.on('action', (a) => this._queue(() => this._onRemote(a)));
    this.channel.on('status', (s) => this._queue(() => this._onStatus(s)));
    this.channel.onJoin(() => this._queue(() => this._sync()));
    this.channel.onPresence((state) => this._onPresence(state));
    this.channel.track({ side: this.side });
    try { await this.channel.subscribe(); } catch { /* sin Realtime: se juega preguntando */ }
    await this._queue(() => this._sync());
    this._timer = setInterval(() => this._tick(), 1000);
    return this;
  }

  close() {
    clearInterval(this._timer);
    this._timer = null;
    try { this.channel?.unsubscribe(); } catch { /* nada */ }
  }

  // ---------------------------------------------- mis órdenes

  /** Mi orden ({ t: 'move'|'cast'|'end', unit, x, z, spell }). Resuelve con la huella; lanza si no vale. */
  act(order) {
    return this._queue(async () => {
      if (!this.myTurn) throw Object.assign(new Error('not_your_turn'), { code: 'not_your_turn' });
      const seq = this.seq;
      const hash = await this.engine.apply(order);   // lanza IllegalOrder sin tocar el estado si no vale
      this.seq = seq + 1;
      const end = order.t === 'end';
      const next = this.engine.over ? this.side : this.engine.turnSide;
      let res;
      try {
        res = await this.service.act(this.id, seq, order, end ? hash : null, end ? next : null);
      } catch (err) {
        // Sin respuesta: puede que llegara. Se mira en el servidor qué hay guardado.
        await this._resync('send_failed');
        throw err;
      }
      if (!res?.ok) {
        if (res?.error === 'bad_seq' && res.nextSeq === seq + 1) return hash; // ya estaba guardada (reintento)
        this._emit('rejected', { error: res?.error, order });
        await this._resync(res?.error || 'rejected');
        throw Object.assign(new Error(res?.error || 'rejected'), { code: res?.error });
      }
      if (res.turnDeadline) this.turnDeadline = new Date(res.turnDeadline).getTime();
      this._emit('applied', { seq, side: this.side, order, hash });
      if (end) this._emitTurn();
      await this._maybeReport();
      return hash;
    });
  }

  /** Rendirse (derrota en el acto). */
  async surrender() {
    const res = await this.service.surrender(this.id);
    if (res?.match) await this._queue(() => this._onStatus(res.match));
    return res;
  }

  // ---------------------------------------------- órdenes que llegan

  async _onRemote(a) {
    if (a.seq < this.seq) return;                     // ya aplicada (la mía de vuelta, o repetida)
    if (a.seq > this.seq) { await this._sync(); return; } // falta alguna: se piden al servidor
    await this._applyRemote(a);
  }

  async _applyRemote(a) {
    let hash;
    try {
      hash = await this.engine.apply(a.ord);
    } catch (err) {
      // Mi motor no acepta la orden del rival: disputa (la decide el árbitro)
      this._emit('error', { error: err?.code || 'illegal', seq: a.seq });
      const res = await this.service.dispute(this.id, `illegal:${err?.code || 'order'}`, a.seq).catch(() => null);
      this.status = 'disputed';
      this._emit('disputed', { match: res?.match || null, seq: a.seq });
      return;
    }
    this.seq = a.seq + 1;
    this._emit('applied', { seq: a.seq, side: a.side, order: a.ord, hash });
    const ended = a.ord.t === 'end' || a.ord.t === 'timeout';
    if (ended) {
      if (a.at) this.turnDeadline = new Date(a.at).getTime() + this.turnSecs * 1000;
      // Confirmo la huella de un fin de turno ajeno (el del rival, o el forzado de mi propio turno)
      const confirm = a.ord.t === 'end' ? a.side !== this.side : a.ord.side === this.side;
      if (confirm && a.hash) {
        const res = await this.service.ack(this.id, a.seq, hash).catch(() => null);
        if (res?.disputed) { this.status = 'disputed'; this._emit('disputed', { seq: a.seq, hash, theirs: a.hash }); }
      }
      this._emitTurn();
    }
    await this._maybeReport();
  }

  /** Pide al servidor las órdenes desde la última aplicada y las aplica en orden. */
  async _sync() {
    const res = await this.service.match(this.id, this.seq).catch(() => null);
    if (!res?.ok) return;
    this._absorbMatch(res.match);
    this.engine.catchUpTo?.(res.match?.nextSeq); // el combate del juego aplica sin animación lo ya jugado
    for (const a of res.actions || []) {
      if (a.seq < this.seq) continue;
      if (a.seq > this.seq) break;
      if (a.side === this.side) {
        // Mía (p. ej. tras recargar la página): se aplica sin volver a mandarla
        try { await this.engine.apply(a.ord); } catch { await this._resync('own_order'); return; }
        this.seq = a.seq + 1;
        this._emit('applied', { seq: a.seq, side: a.side, order: a.ord });
      } else {
        await this._applyRemote(a);
      }
      if (this.status === 'disputed') return;
    }
    if (res.match.status !== 'active') await this._onStatus(res.match);
    else this._emitTurn();
  }

  /** El estado local no cuadra con el servidor: motor nuevo y todas las órdenes guardadas desde el principio. */
  async _resync(reason) {
    this._emit('resync', { reason });
    this.engine = await this.createEngine(this.match, { resync: true }); // el combate del juego se rehace (asíncrono)
    this.seq = 0;
    await this._sync();
  }

  _absorbMatch(m) {
    if (!m) return;
    if (m.turnDeadline) this.turnDeadline = new Date(m.turnDeadline).getTime();
    if (m.status) this.status = m.status === 'ended' ? 'active' : m.status; // «ended»: esperando el otro informe
  }

  async _onStatus(s) {
    const st = s.status;
    if (st === 'finished' || st === 'aborted') {
      this.status = st;
      clearInterval(this._timer);
      const res = await this.service.match(this.id, this.seq).catch(() => null);
      this._emit('finished', { match: res?.match || s });
    } else if (st === 'disputed') {
      this.status = 'disputed';
      this._emit('disputed', { match: s });
    }
  }

  async _maybeReport() {
    if (!this.engine.over || this._reported) return;
    this._reported = true;
    const r = this.engine.result || {};
    const res = await this.service.report(this.id, r.winnerSide || winnerSide(r.winner), r.reason === 'rounds' ? 'rounds' : 'elimination', this.engine.hash()).catch(() => null);
    if (res?.match && res.match.status !== 'active' && res.match.status !== 'ended') await this._onStatus(res.match);
  }

  // ---------------------------------------------- tiempo y presencia

  _emitTurn() {
    if (this.engine.over) return;
    const side = this.engine.turnSide;
    this._emit('turn', { side, mine: side === this.side, deadline: this.turnDeadline });
  }

  /** Cada segundo: si el rival agotó su turno, se pide el fin forzado (una vez por turno). */
  _tick() {
    if (this.status !== 'active' || this.engine.over || this.myTurn || !this.turnDeadline) return;
    const late = this.service.serverNow() - this.turnDeadline - this.graceSecs * 1000;
    if (late < CLAIM_MARGIN_MS || this._claimedSeq === this.seq) return;
    this._claimedSeq = this.seq;
    this._queue(() => this._claimTimeout());
  }

  async _claimTimeout() {
    if (this.myTurn || this.engine.over) return;
    const seq = this.seq;
    const lost = this.engine.turnSide;
    const hash = await this.engine.apply({ t: 'timeout' });
    const res = await this.service.timeout(this.id, seq, hash, this.engine.turnSide).catch(() => null);
    if (!res?.ok) { await this._resync(res?.error || 'timeout_failed'); return; }
    this.seq = seq + 1;
    if (res.turnDeadline) this.turnDeadline = new Date(res.turnDeadline).getTime();
    this._emit('applied', { seq, side: 'S', order: { t: 'timeout', side: lost }, hash });
    if (res.abandoned) { await this._onStatus(res.match); return; }
    this._emitTurn();
  }

  _onPresence(state) {
    // Rival sin presencia en el canal (el servidor lo indica con rivalPresence = false, PLAN_BOTS_ARENA): no hay aviso
    // de conexión; el reloj del turno sigue funcionando igual.
    if (this.match?.rivalPresence === false) return;
    const opp = other(this.side);
    const online = Object.values(state || {}).some((metas) => metas.some((m) => m.side === opp));
    if (online === this.opponentOnline) return;
    this.opponentOnline = online;
    this._emit('opponent', { online });
  }
}
