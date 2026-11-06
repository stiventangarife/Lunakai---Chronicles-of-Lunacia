// PvpBattle.js — Una partida de la Arena PvP dentro del combate del juego (fase P3).
// Plan: docs/PLAN_ARENA_PVP.md, sección 14.
//
// Es el «motor» que PvpSession necesita (apply, hash, turnSide, over, result) hecho con el combate de siempre: las
// mismas unidades con modelo, el mismo SpellManager con sus efectos y el mismo TurnManager. Las órdenes (mías o del
// rival) se comprueban y aplican con applyOrder (tactics/sim/HeadlessCombat.js), igual que en el motor sin gráficos,
// así que la huella de cada fin de turno es la misma en los dos jugadores y en el árbitro.
//
//   · Equipos: tactics/sim/PvpRoster.js (igualados, cada uno se ve abajo; el bando B mira desde el otro lado).
//   · Azar: semilla de la partida (mulberry32), nunca Math.random. Sin runas, charms, Ultimate ni IA.
//   · Mis jugadas: main.js llama a localOrder / endTurn (clic, botón «Pasar turno», Espacio). Van por la sesión.
//   · Las del rival llegan por la sesión y se animan igual que las mías.
//   · Al volver a una partida (recarga) las órdenes ya jugadas se aplican sin animaciones (gridManager.fastForward).
//   · Final: el combate decide en local (eliminación o rondas) y lo informa; el resultado oficial (puntos, SLP) llega
//     del servidor y se muestra en la pantalla de la Arena (ui/PvpHud.js).

import { PvpSession } from './PvpSession.js';
import { pvpService as defaultService } from '../../net/PvpService.js';
import { pvpCombatSetup, winnerByHealth } from '../../tactics/sim/PvpRoster.js';
import { applyOrder, IllegalOrder } from '../../tactics/sim/HeadlessCombat.js';
import { stateHash } from '../../tactics/sim/StateHash.js';
import { mulberry32 } from '../../tactics/sim/SeededRandom.js';
import { getBattleMap } from '../../tactics/maps/BattleMaps.js';
import { PvpHud } from '../../ui/PvpHud.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import * as i18n from '../../i18n/i18n.js';

export class PvpBattle {
  /**
   * @param {object} p
   *   game     instancia de main.js (turnManager, spellManager, gridManager, units…)
   *   match    partida del servidor (_pvp_match_out)
   *   service  PvpService
   *   onLeave  () => void · el jugador cierra la pantalla final (vuelta al mundo abierto)
   */
  constructor({ game, match, service = defaultService, onLeave = null }) {
    this.game = game;
    this.match = match;
    this.service = service;
    this.onLeave = onLeave;
    this.side = match.side === 'B' ? 'B' : 'A';
    this.setup = pvpCombatSetup(match, this.side);
    this.map = getBattleMap(this.setup.mapId);
    this.result = null;          // final local: { winner, winnerSide, reason }
    this.official = null;        // partida terminada según el servidor
    this.applied = 0;            // órdenes aplicadas en este combate
    this.ffUntil = 0;            // órdenes que se aplican sin animación (puesta al día)
    this.session = null;
    this.hud = null;
    this._busy = false;
    this._ready = false;
    this._rebuild = null;
    this._disposed = false;
    this._origRound = null;
    this._portraits = new Map(); // id del Sapidae → retrato (null mientras se hace)
  }

  get tm() { return this.game.turnManager; }
  get sm() { return this.game.spellManager; }
  get mine() { return this.setup.units.filter((u) => u.pvpSide === this.side); }
  get rivalName() { return this.match[this.side === 'A' ? 'B' : 'A']?.name || '?'; }

  // ------------------------------------------------------------------ montaje (main.js)

  /** Configuración del combate para main._startBattle (id 'kol_arena': vuelve al Koliseo al terminar). */
  levelConfig() {
    return {
      id: 'kol_arena',
      pvp: this,
      battleMapId: this.map.id,
      biome: this.map.biome,
      title: i18n.t('arena.battleTitle'),
      biomeName: i18n.lang() === 'es' ? (this.map.nameEs || this.map.name) : this.map.name,
      heroPositions: [],
      enemies: [],
      noPersistentHP: true,
    };
  }

  /** Configuraciones de las 4 unidades (copias: Unit las guarda). */
  unitConfigs() { return this.setup.units.map((c) => ({ ...c, partCollections: { ...(c.partCollections || {}) } })); }

  /** Reglas de la partida, justo antes de startCombat (también al rehacer el combate). */
  prepareRules() {
    const { tm, sm } = this;
    sm.rng = mulberry32(this.setup.seed);
    sm.battleMods = { range: 0, firstRoundPM: 0 };
    tm.tieBreak = this.setup.tieBreak;
    tm.endRule = null;
    tm.alternateTeams = true;
    // Límite de rondas: exactamente como HeadlessCombat (al empezar la ronda maxRounds + 1 se decide por vida)
    if (!this._origRound) this._origRound = tm.onRoundStart;
    const orig = this._origRound;
    tm.onRoundStart = (round) => {
      if (round > this.setup.maxRounds && !tm.isCombatOver) {
        tm.isCombatOver = true;
        this._finishLocal(winnerByHealth(tm.units), 'rounds');
        return;
      }
      orig?.(round);
    };
    this.game.sceneManager.flipSide = this.side === 'B';
    document.body.classList.add('state-pvp');
  }

  /** main.js: el combate está montado y el primer turno ya empezó. */
  async onBattleReady() {
    if (this._rebuild) { const r = this._rebuild; this._rebuild = null; r(this); return; }
    if (this._ready) return;
    this._ready = true;
    this.hud = new PvpHud({
      battle: this,
      onSurrender: () => this.surrender(),
      onBack: () => this.leave(),
    });
    this.hud.mount();
    this.session = new PvpSession({
      match: this.match,
      service: this.service,
      createEngine: (m, opts) => (opts?.resync ? this._rebuildBattle() : this),
      onEvent: (e) => this._onSessionEvent(e),
    });
    this.catchUpTo(this.match.nextSeq || 0);
    try {
      await this.session.start();
    } catch (err) {
      console.warn('[Arena] no se pudo conectar la partida', err);
      this.hud?.toast(i18n.t('arena.err.load'), 'bad');
    }
  }

  // ------------------------------------------------------------------ motor (PvpSession)

  get turnSide() { const u = this.tm.getActiveUnit(); return u ? u.pvpSide : null; }
  get over() { return Boolean(this.result) || this.tm.isCombatOver; }

  hash() {
    return stateHash({ turnManager: this.tm, spellManager: this.sm, units: this.game.units });
  }

  /** Las próximas órdenes hasta la n − 1 se aplican sin animación (la última sí se ve). */
  catchUpTo(n) { this.ffUntil = Math.max(this.ffUntil, Number(n) || 0); }

  async apply(order) {
    if (this.over) throw new IllegalOrder('combat_over', order);
    const ff = this.applied < this.ffUntil - 1;
    if (ff) this._fastForward(true);
    try {
      await applyOrder({ tm: this.tm, sm: this.sm, grid: this.game.gridManager }, order);
    } finally {
      if (ff) this._fastForward(false);
    }
    this.applied++;
    this._afterOrder(ff);
    return this.hash();
  }

  _fastForward(on) {
    const g = this.game;
    g.gridManager.fastForward = on;
    this.tm.sim = on;
    this.sm.headless = on;
    if (on) {
      this._ffMuted = g.audio?.isMuted;
      if (!this._ffMuted) g.audio?.setMuted?.(true);
    } else {
      if (!this._ffMuted) g.audio?.setMuted?.(false);
      g.combatText?.clear?.();
      for (const u of g.units) { if (!u.isDead) u.updateHUD?.(); }
    }
  }

  _afterOrder(ff) {
    if (ff || this._disposed) return;
    const g = this.game;
    try {
      g.activeUnit = this.tm.getActiveUnit();
      g._updateHUD?.(g.activeUnit);
      g._updateTimelineUI?.(this.tm.queue);
      if (!this.over && g.activeUnit?.team === 'player' && !g.activeUnit.isMoving) g._refreshMovementHighlights?.();
      else g.gridManager.clearHighlights();
    } catch (e) { console.warn('[Arena] HUD', e); }
    this.hud?.update();
  }

  /** PvpSession ha perdido el hilo: combate nuevo desde el principio (las órdenes se aplican sin animación). */
  _rebuildBattle() {
    this.applied = 0;
    this.ffUntil = 0;
    this.result = null;
    return new Promise((resolve) => {
      this._rebuild = resolve;
      this.game._startBattle(this.levelConfig()).catch((err) => { console.warn('[Arena] rehacer el combate', err); resolve(this); });
    });
  }

  /**
   * Retrato del Sapidae de cada bando con SU modelo y SU personalización (el genérico del modelo es el del Sapidae del
   * jugador). Se hace una vez en segundo plano; mientras tanto, null (la inicial) y al estar, se repinta el orden.
   */
  sapidaePortrait(unit) {
    if (!unit?.id) return null;
    if (this._portraits.has(unit.id)) return this._portraits.get(unit.id);
    this._portraits.set(unit.id, null);
    const c = unit.config || {};
    Promise.resolve(portraitService.getSapidaeCustomPortrait?.(c.modelType || 'sapidae-m-a', c.customization || null, null,
      { fullBody: true, zoomFactor: 1.10, yaw: -0.18, pitch: 0.03, aliases: [] }))
      .then((url) => {
        if (this._disposed || !url) return;
        this._portraits.set(unit.id, url);
        try { this.game._updateTimelineUI?.(this.tm.queue); this.game._updateHUD?.(this.game.activeUnit); } catch { /* nada */ }
      })
      .catch(() => { /* sin retrato: la inicial */ });
    return null;
  }

  // ------------------------------------------------------------------ mis jugadas (main.js)

  /** ¿Puedo dar una orden ahora? (mi turno, sin nada en marcha, dentro de plazo) */
  canAct() {
    const s = this.session;
    if (!s || this._busy || this.over || !s.myTurn) return false;
    const u = this.tm.getActiveUnit();
    if (!u || u.team !== 'player' || u.isMoving || this.tm.turnEnding || this.tm.isSkippingTurn) return false;
    return !s.turnDeadline || this.service.serverNow() < s.turnDeadline + (s.graceSecs || 0) * 1000 - 300;
  }

  /** Orden del jugador (move / cast). true si se aplicó. */
  async localOrder(order) {
    if (!this.canAct()) {
      if (this.session && !this.session.myTurn && !this.over) this.hud?.toast(i18n.t('arena.hud.notYourTurn'));
      return false;
    }
    this._busy = true;
    try {
      await this.session.act(order);
      return true;
    } catch (err) {
      const code = err?.code;
      if (code === 'not_your_turn' || err instanceof IllegalOrder) return false;
      this.hud?.toast(i18n.t(code ? 'arena.hud.rejected' : 'arena.hud.sendFailed'), 'warn');
      return false;
    } finally {
      this._busy = false;
    }
  }

  /** «Pasar turno». */
  endTurn() {
    const u = this.tm.getActiveUnit();
    if (!u) return Promise.resolve(false);
    this.game._clearSpellSelection?.();
    this.game._hideForecast?.();
    return this.localOrder({ t: 'end', unit: u.id });
  }

  async surrender() {
    if (!this.session || this.official) return;
    try {
      await this.session.surrender();
    } catch (err) {
      console.warn('[Arena] rendirse', err);
      this.hud?.toast(i18n.t('arena.err.network'), 'bad');
    }
  }

  /** main.js · onTurnChange: sin IA; casillas de movimiento solo en mi turno. */
  onTurnChange(unit) {
    const g = this.game;
    if (this.over) { g.gridManager.clearHighlights(); return; }
    if (unit?.team === 'player') g._refreshMovementHighlights?.();
    else g.gridManager.clearHighlights();
    this.hud?.update();
  }

  /** main.js · onVictory / onDefeat del TurnManager (eliminación). */
  onCombatEnd(winnerTeam) { this._finishLocal(winnerTeam, 'elimination'); }

  _finishLocal(winnerTeam, reason) {
    if (this.result) return;
    this.result = { winner: winnerTeam, winnerSide: winnerTeam ? this.setup.sideOfTeam(winnerTeam) : 'draw', reason };
    if (this.applied < this.ffUntil - 1) return; // puesta al día: el final ya pasó, lo dirá el servidor
    this._playEndBanner(winnerTeam === 'player' ? 'win' : winnerTeam === 'enemy' ? 'loss' : 'draw');
  }

  async _playEndBanner(outcome) {
    if (this._bannerPlayed) return;
    this._bannerPlayed = true;
    const g = this.game;
    try {
      g._cleanCombatUIForEnd?.();
      this.hud?.setWaiting(true);
      await new Promise((r) => setTimeout(r, 600));
      if (outcome === 'win') { g.audio?.playVictoryFanfare?.(); g.audio?.playVictoryMusic?.(); }
      else if (outcome === 'loss') { g.audio?.playDefeat?.(); g.audio?.playDefeatMusic?.(); }
      // Empate: sin cartel de victoria ni de derrota; la pantalla final lo dice
      if (outcome !== 'draw') {
        await g.combatBanner?.play?.(outcome === 'loss' ? 'defeat' : 'victory', { subtitle: i18n.t('arena.battleTitle') });
        await g.combatBanner?.hide?.();
      }
      g.sceneManager.restoreCamera();
    } catch (e) { console.warn('[Arena] final', e); }
    this._bannerDone = true;
    if (this.official) this.hud?.showEnd(this.official);
  }

  // ------------------------------------------------------------------ sesión

  _onSessionEvent(e) {
    if (this._disposed) return;
    switch (e.type) {
      case 'turn': this.hud?.setTurn(e); break;
      case 'opponent': this.hud?.setOpponent(e.online); break;
      case 'resync': this.hud?.toast(i18n.t('arena.hud.sync'), 'warn'); break;
      case 'rejected': this.hud?.toast(i18n.t('arena.hud.rejected'), 'warn'); break;
      case 'finished': this._onOfficial(e.match); break;
      case 'disputed': this._onOfficial({ ...(e.match || this.match), status: 'disputed' }); break;
      default: break;
    }
  }

  /** Resultado del servidor (terminada, anulada o en revisión). */
  _onOfficial(m) {
    // Una partida en revisión puede recibir después el veredicto del árbitro (fase P4): la pantalla se actualiza
    if (!m || (this.official && (this.official.status !== 'disputed' || m.status === 'disputed'))) return;
    const upgrade = Boolean(this.official);
    this.official = { ...m, mySide: this.side };
    if (upgrade) { this.hud?.showEnd(this.official, { replace: true }); return; }
    const tm = this.tm;
    if (!tm.isCombatOver) tm.isCombatOver = true; // rendición, abandono o revisión: el combate se para aquí
    this.game.gridManager.clearHighlights();
    if (!this._bannerPlayed) {
      const outcome = m.status !== 'finished' ? 'draw' : !m.winner ? 'draw' : m.winner === this.side ? 'win' : 'loss';
      if (m.status === 'finished') this._playEndBanner(outcome);
      else { this._bannerPlayed = true; this._bannerDone = true; this.game._cleanCombatUIForEnd?.(); }
    }
    if (this._bannerDone) this.hud?.showEnd(this.official);
  }

  // ------------------------------------------------------------------ salida

  /** Botón de la pantalla final: vuelta al mundo abierto (y al Koliseo). */
  leave() {
    if (this._left) return;
    this._left = true;
    const win = this.official?.status === 'finished' && this.official.winner === this.side;
    this.onLeave?.(this.official);
    this.game._returnToOverworld?.(win);
  }

  /** main._returnToOverworld: suelta todo lo de la partida. */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.session?.close();
    this.service.releaseRealtime?.();
    this.hud?.destroy();
    this.hud = null;
    const tm = this.tm;
    if (this._origRound) { tm.onRoundStart = this._origRound; this._origRound = null; }
    tm.tieBreak = null;
    tm.sim = false;
    this.sm.headless = false;
    this.sm.rng = () => Math.random();
    this.game.gridManager.fastForward = false;
    this.game.sceneManager.flipSide = false;
    document.body.classList.remove('state-pvp');
  }
}
