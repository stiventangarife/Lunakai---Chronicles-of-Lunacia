// ArenaFlow.js — La Arena PvP desde el Koliseo (fase P3). Plan: docs/PLAN_ARENA_PVP.md, sección 14.
//
//   Pestaña «Arena PvP» → search() → cola (pvp_enqueue con latido + aviso «matched» por Realtime) → rival →
//   «¡Rival encontrado!» (ui/PvpHud.showMatchIntro) → combate del juego con PvpBattle (id 'kol_arena') → pantalla final →
//   vuelta al mundo en el mismo sitio (OverworldManager._returnFromKoliseo) → onReturn() → pestaña de la Arena.
//
// · Solo con cuenta (Sky Mavis): la clasificación, los puntos y el SLP son del servidor.
// · La búsqueda dura mientras la ventana del Koliseo está abierta: al cerrarla se sale de la cola (así nunca llega un
//   rival en mitad de otro combate o de un diálogo).
// · Partida a medias (recarga, corte): la pestaña ofrece «Volver a la partida»; el combate se pone al día solo.

import { pvpService as defaultService } from '../../net/PvpService.js';
import { accountManager } from '../../net/AccountManager.js';
import { isCloudConfigured } from '../../net/config.js';
import { EconomyService } from '../../net/EconomyService.js';
import { saveSlotManager } from '../SaveSlotManager.js';
import { getBattleMap } from '../../tactics/maps/BattleMaps.js';
import { PvpBattle } from './PvpBattle.js';
import { showMatchIntro } from '../../ui/PvpHud.js';
import * as i18n from '../../i18n/i18n.js';

const ERR_KEY = {
  no_cards: 'arena.err.no_cards', bad_cards: 'arena.err.no_cards', no_axie: 'arena.err.no_axie', no_save: 'arena.err.no_save',
  network: 'arena.err.network', server_unavailable: 'arena.err.network', not_authenticated: 'arena.err.session', session_expired: 'arena.err.session',
};

export class ArenaFlow {
  constructor(om, { service = defaultService } = {}) {
    this.om = om;
    this.service = service;
    this.me = null;          // pvp_me
    this.meError = null;
    this.search = null;      // { status, waited, window, since } mientras se busca
    this.flash = null;       // { text, kind } · resultado de la última partida
    this._stop = null;
    this._busy = false;
    this._last = null;
    this._loadReq = 0;
  }

  get panel() { return this.om?.koliseoPanel || null; }
  get game() { return (typeof window !== 'undefined' && (window.__AXIE_TACTICS_APP__ || window.game)) || null; }
  /** La Arena necesita servidor y cuenta. */
  get available() { return isCloudConfigured() && accountManager.mode === 'account'; }
  get searching() { return Boolean(this._stop); }

  _repaint() { if (this.panel?.isOpen && this.panel.tab === 'arena') this.panel.renderArena(); }

  /** Lo mío (puntos, puesto, partida abierta…). */
  async loadMe() {
    if (!this.available) { this.me = null; this._repaint(); return null; }
    const req = ++this._loadReq;
    try {
      const res = await this.service.me();
      if (req !== this._loadReq) return this.me;
      if (res?.ok === false) throw Object.assign(new Error(res.error), { code: res.error });
      this.me = res;
      this.meError = null;
    } catch (err) {
      if (req !== this._loadReq) return this.me;
      console.warn('[Arena] pvp_me', err);
      this.meError = err?.code || 'error';
    }
    this._repaint();
    return this.me;
  }

  /** «Buscar rival». */
  async startSearch() {
    if (this._stop || this._busy || !this.available) return;
    this._busy = true;
    this.flash = null;
    this.search = { status: 'queued', waited: 0, window: null, since: Date.now() };
    this._repaint();
    // El servidor lee la instantánea de la partida guardada: primero, la última copia en la nube
    try { this.game?._saveCurrentProgress?.(); } catch { /* nada */ }
    try { await accountManager.cloud?.flush?.(); } catch { /* el servidor usa la copia que tenga */ }
    this._busy = false;
    if (!this.search) return; // canceló mientras se guardaba
    const slot = saveSlotManager.activeSlotId || 1;
    this._stop = this.service.startQueue({
      slot,
      onStatus: (st) => this._onQueue(st),
      onMatched: (match) => this._onMatched(match),
    });
  }

  /** «Cancelar» (o se cerró la ventana del Koliseo). */
  cancel() {
    const stop = this._stop;
    this._stop = null;
    this.search = null;
    this._busy = false;
    if (stop) stop(true);
    this.service.releaseRealtime?.();
    this._repaint();
  }

  _onQueue(st) {
    if (!this._stop) return;
    if (st.status === 'error') {
      this._stop = null;
      this.search = null;
      const key = ERR_KEY[st.error];
      this.flash = { text: key ? i18n.t(key) : i18n.t('arena.err.generic', { code: st.error || '?' }), kind: 'bad' };
      this._repaint();
      return;
    }
    this.search = { ...this.search, status: st.status, waited: st.waited ?? this.search?.waited ?? 0, window: st.window ?? this.search?.window ?? null };
    this._repaint();
  }

  async _onMatched(match) {
    this._stop = null;
    this.search = null;
    if (!match) return;
    if (match.status === 'disputed' || match.status === 'finished' || match.status === 'aborted') { await this.loadMe(); return; }
    this.panel?.close();
    try { await showMatchIntro(match, getBattleMap(match.map)); } catch { /* la presentación nunca bloquea */ }
    this._launch(match);
  }

  /** «Volver a la partida» (partida abierta tras recargar). */
  resume() {
    const m = this.me?.match;
    if (!m || (m.status !== 'active' && m.status !== 'ended')) return;
    this.panel?.close();
    this._launch(m);
  }

  _launch(match) {
    const game = this.game;
    if (!game || !this.om) return;
    let battle;
    try {
      battle = new PvpBattle({ game, match, service: this.service, onLeave: (official) => { this._last = official; } });
    } catch (err) {
      console.warn('[Arena] partida', err);
      this.flash = { text: i18n.t('arena.err.load'), kind: 'bad' };
      this.om.toggleKoliseo?.('arena');
      return;
    }
    const cfg = battle.levelConfig();
    this.om._handleMonsterEncounter({ id: 'kol_arena', biome: cfg.biome, packData: null, levelConfig: cfg, name: cfg.title });
  }

  /** OverworldManager: de vuelta en el mundo abierto tras una partida. */
  async onReturn() {
    const m = this._last;
    this._last = null;
    if (m) {
      const me = m.mySide;
      const delta = Number(m.deltas?.[me] ?? 0);
      const d = delta > 0 ? `+${delta}` : String(delta);
      if (m.status === 'disputed') this.flash = { text: i18n.t('arena.flash.review'), kind: 'warn' };
      else if (m.status === 'aborted') this.flash = { text: i18n.t('arena.flash.void'), kind: 'warn' };
      else if (m.status === 'finished') {
        this.flash = !m.winner ? { text: i18n.t('arena.flash.draw'), kind: 'warn' }
          : m.winner === me ? { text: i18n.t('arena.flash.win', { delta: d }), kind: 'good' }
            : { text: i18n.t('arena.flash.loss', { delta: d }), kind: 'bad' };
      }
      if (Number(m.slp?.[me]) > 0) EconomyService.sync?.().catch?.(() => null); // SLP de la victoria en la cartera
    }
    setTimeout(() => this.om?.toggleKoliseo?.('arena'), 250);
  }
}
