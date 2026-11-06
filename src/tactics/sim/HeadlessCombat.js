// HeadlessCombat.js — Motor de combate sin gráficos (Arena PvP, fase P0).
// Plan: docs/PLAN_ARENA_PVP.md, sección 5. Base del árbitro (Edge Function), de las repeticiones y de las pruebas.
//
// Usa las MISMAS reglas que el juego: SpellRules (habilidades, estados, zonas, gólems), GridRules (tablero, caminos,
// visión), TurnManager en modo simulación (sin esperas) y LogicUnit (combat/UnitRules.js, compartido con Unit). Nada
// de three.js, DOM ni tiempo real: con la misma configuración, la misma semilla y las mismas órdenes, el resultado y la
// huella del estado son idénticos en el navegador, en Node y en Deno.
//
// Bandos: A = 'player' y B = 'enemy' en las reglas (los nombres de siempre); cada cliente decide qué bando ve abajo.
//
// Órdenes (las mismas que viajan por la red):
//   { t: 'move', unit, x, z }          camino canónico de getReachableCells (el mismo que elige el juego al hacer clic)
//   { t: 'cast', unit, spell, x, z }   carta de la unidad sobre una casilla válida (getValidTargetCells)
//   { t: 'end', unit }                 fin del turno
//   { t: 'timeout' }                   fin de turno forzado por el servidor (el jugador del turno se pasó de tiempo)
// apply() comprueba que la orden es legal (turno, unidad, PM, PA, objetivo) antes de ejecutarla: es lo que hace el árbitro.

import { GridRules } from '../GridRules.js';
import { SpellRules } from '../SpellRules.js';
import { TurnManager } from '../TurnManager.js';
import { LogicUnit } from '../LogicUnit.js';
import { getBattleMap } from '../maps/BattleMaps.js';
import { mulberry32 } from './SeededRandom.js';
import { stateHash, stateView } from './StateHash.js';
import { pvpCombatSetup, sideHealth, winnerByHealth } from './PvpRoster.js';

export const SIDES = { A: 'player', B: 'enemy' };
/** Bando de la Arena de un equipo de las reglas (sin perspectiva: A = 'player'). */
export const sideOf = (team) => (team === 'player' ? 'A' : 'B');
/** Bando de una unidad: el fijo de la Arena (pvpSide) o, fuera de ella, el de su equipo. */
export const unitSide = (u) => u?.pvpSide || sideOf(u?.team);
export const DEFAULT_MAX_ROUNDS = 25;

export class IllegalOrder extends Error {
  constructor(code, order) {
    super(`orden ilegal: ${code}`);
    this.code = code;
    this.order = order;
  }
}

/** Casilla alcanzable por `u` con su camino (el mismo que elige el juego al hacer clic) o null. */
export function legalMove(grid, u, x, z) {
  if (!(u.currentPM > 0)) return null;
  const reach = grid.getReachableCells(u.gridX, u.gridZ, u.currentPM, u);
  return reach.find((c) => c.x === x && c.z === z) || null;
}

/**
 * Comprueba y aplica una orden sobre unas reglas cualesquiera: las del motor sin gráficos o las del combate del juego
 * (rpg/arena/PvpBattle.js). Lanza IllegalOrder sin tocar nada si no vale. Con el combate del juego, las animaciones
 * se esperan; el TurnManager con sim = false termina sus pasos diferidos en tm.settled().
 */
export async function applyOrder({ tm, sm, grid }, order) {
  if (!order || typeof order !== 'object') throw new IllegalOrder('unknown_order', order);
  if (tm.isCombatOver) throw new IllegalOrder('combat_over', order);
  if (order.t === 'timeout') {
    // Lo anota el servidor cuando vence el tiempo del turno: termina el turno de la unidad activa, sea cual sea
    await tm.endCurrentTurn();
    await tm.settled?.();
    return;
  }
  const u = tm.getActiveUnit();
  if (!u || u.id !== order.unit) throw new IllegalOrder('not_your_turn', order);
  if (u.isMoving || tm.turnEnding || tm.isSkippingTurn) throw new IllegalOrder('busy', order);

  if (order.t === 'move') {
    const cell = legalMove(grid, u, order.x, order.z);
    if (!cell) throw new IllegalOrder('bad_move', order);
    await u.moveAlongPath(cell.path);
  } else if (order.t === 'cast') {
    if (!u.spellIds.includes(order.spell)) throw new IllegalOrder('no_spell', order);
    const spell = sm.getSpell(order.spell, u);
    if (!spell || !sm._canPay(u, spell)) throw new IllegalOrder('cannot_pay', order);
    const valid = sm.getValidTargetCells(u, spell);
    if (!valid.some((c) => c.x === order.x && c.z === order.z)) throw new IllegalOrder('bad_target', order);
    await sm.castSpell(u, spell, { x: order.x, z: order.z });
    tm.checkCombatEnd();
  } else if (order.t === 'end') {
    await tm.endCurrentTurn();
    await tm.settled?.();
  } else {
    throw new IllegalOrder('unknown_order', order);
  }
}

export class HeadlessCombat {
  /**
   * @param {object} setup
   *   mapId       id de BattleMaps (null = 10×10 de siempre)
   *   units       configuraciones de unidad (id, team 'player'|'enemy', x, z, maxHP, spellIds, …), como las de main
   *   seed        semilla de 32 bits de la partida
   *   tieBreak    bando que empieza con empate de iniciativa ('player' | 'enemy')
   *   maxRounds   límite de rondas (gana quien tenga más vida en %; si empatan, empate)
   *   battleMods  modificadores del combate ({ range, firstRoundPM }) como en el Koliseo
   */
  constructor({ mapId = null, units = [], seed = 1, tieBreak = 'player', maxRounds = DEFAULT_MAX_ROUNDS, battleMods = null } = {}) {
    this.setup = { mapId, units, seed: seed >>> 0, tieBreak, maxRounds, battleMods };
    // { winner: 'player'|'enemy'|null, winnerSide: 'A'|'B'|'draw', reason: 'elimination'|'rounds'|'surrender', round, hp }
    this.result = null;
    this.log = [];           // órdenes aplicadas, en orden (CombatRecorder)
    this._build();
  }

  _build() {
    const { mapId, units, seed, tieBreak, battleMods } = this.setup;
    const grid = new GridRules();
    if (mapId) {
      const map = getBattleMap(mapId);
      if (!map) throw new Error(`mapa desconocido: ${mapId}`);
      grid.loadLayout(map);
    }
    this.grid = grid;
    this.game = { units: [] };
    this.sm = new SpellRules(grid, { game: this.game, headless: true });
    this.sm.rng = mulberry32(seed);
    if (battleMods) this.sm.battleMods = { range: 0, firstRoundPM: 0, ...battleMods };

    const tm = new TurnManager(null, null);
    tm.sim = true;
    tm.tieBreak = tieBreak;
    this.tm = tm;
    this.sm.bindTurnManager(tm);
    // Límite de rondas: al empezar la ronda maxRounds + 1 se decide por vida
    const onRound = tm.onRoundStart;
    tm.onRoundStart = (round) => {
      if (round > this.setup.maxRounds && !tm.isCombatOver) {
        tm.isCombatOver = true;
        this._finish(this._byHealth(), 'rounds');
        return;
      }
      onRound?.(round);
    };
    tm.onVictory = () => this._finish('player', 'elimination');
    tm.onDefeat = () => this._finish('enemy', 'elimination');

    // Unidades en el orden de la configuración (el orden de game.units es parte de las reglas: no cambiarlo)
    for (const cfg of units) this.game.units.push(new LogicUnit({ ...cfg }, grid));
    tm.setUnits(this.game.units);
  }

  /**
   * Motor de una partida de la Arena tal como la da el servidor, visto desde el bando `side` (el árbitro usa 'A').
   * Las dos perspectivas producen las mismas huellas orden a orden (tools/pvp/sim-test.mjs lo comprueba).
   */
  static fromMatch(match, side = 'A') {
    const s = pvpCombatSetup(match, side);
    return new HeadlessCombat({ mapId: s.mapId, units: s.units, seed: s.seed, tieBreak: s.tieBreak, maxRounds: s.maxRounds });
  }

  /** Empieza el combate (primer turno). */
  start() {
    this.tm.startCombat();
    return this;
  }

  get units() { return this.game.units; }
  /** Bando que juega ahora ('A' | 'B'): el que el cliente manda al servidor con su fin de turno (p_next). */
  get turnSide() { const u = this.activeUnit; return u ? unitSide(u) : null; }
  /** Bando de un equipo de las reglas en esta partida ('player' | 'enemy' → 'A' | 'B'). */
  sideOfTeam(team) { const u = this.game.units.find((x) => x.team === team); return u ? unitSide(u) : sideOf(team); }
  get round() { return this.tm.round; }
  get activeUnit() { return this.tm.getActiveUnit(); }
  get over() { return Boolean(this.result) || this.tm.isCombatOver; }
  unit(id) { return this.game.units.find((u) => u.id === id) || null; }

  // ---------------------------------------------- órdenes

  /** Aplica una orden (comprobando que es legal). Devuelve la huella del estado después. */
  async apply(order) {
    if (this.over) throw new IllegalOrder('combat_over', order);
    await applyOrder({ tm: this.tm, sm: this.sm, grid: this.grid }, order);
    this.log.push({ ...order });
    return this.hash();
  }

  /** Rendición del bando `team` (cuenta como derrota). */
  surrender(team) {
    if (this.over) return;
    this.tm.isCombatOver = true;
    this._finish(team === 'player' ? 'enemy' : 'player', 'surrender');
  }

  /** Casilla alcanzable con su camino (el mismo que usa el juego) o null. */
  legalMove(u, x, z) { return legalMove(this.grid, u, x, z); }

  /** Órdenes legales de la unidad activa (para pruebas y para la IA de las pruebas). */
  legalOrders() {
    const u = this.activeUnit;
    if (!u || this.over) return [];
    const out = [];
    if (u.currentPM > 0) {
      for (const c of this.grid.getReachableCells(u.gridX, u.gridZ, u.currentPM, u)) out.push({ t: 'move', unit: u.id, x: c.x, z: c.z });
    }
    for (const id of u.spellIds) {
      const spell = this.sm.getSpell(id, u);
      if (!spell || !this.sm._canPay(u, spell)) continue;
      for (const c of this.sm.getValidTargetCells(u, spell)) out.push({ t: 'cast', unit: u.id, spell: id, x: c.x, z: c.z });
    }
    out.push({ t: 'end', unit: u.id });
    return out;
  }

  // ---------------------------------------------- estado

  hash() { return stateHash({ turnManager: this.tm, spellManager: this.sm, units: this.game.units }); }
  view() { return stateView({ turnManager: this.tm, spellManager: this.sm, units: this.game.units }); }

  /** Vida total en % por bando (sin gólems). */
  healthPct(team) { return sideHealth(this.game.units, team) / 1e6; }

  /** Ganador por vida (misma regla que el combate del juego: PvpRoster.winnerByHealth). */
  _byHealth() { return winnerByHealth(this.game.units); }

  _finish(winner, reason) {
    if (this.result) return;
    this.result = {
      winner, reason, round: this.tm.round,
      winnerSide: winner ? this.sideOfTeam(winner) : 'draw',
      hp: { player: this.healthPct('player'), enemy: this.healthPct('enemy') },
    };
  }
}
