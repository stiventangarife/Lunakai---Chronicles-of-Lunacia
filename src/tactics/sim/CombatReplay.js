// CombatReplay.js — Registro y repetición de un combate (Arena PvP, fase P0).
//
// Un registro es JSON puro: la configuración de la partida (mapa, unidades, semilla, desempate, límite de rondas) y la
// lista de órdenes con la huella del estado tras cada una. Repetirlo en el motor sin gráficos da el resultado oficial
// (árbitro) y detecta en qué orden se separaron dos partidas (desincronización).

import { HeadlessCombat } from './HeadlessCombat.js';

export const RECORD_VERSION = 1;

/** Graba las órdenes de un HeadlessCombat (o de cualquier fuente) con su huella. */
export class CombatRecorder {
  constructor(setup) {
    this.record = { v: RECORD_VERSION, setup: JSON.parse(JSON.stringify(setup)), start: null, orders: [], result: null };
  }

  started(hash) { this.record.start = hash; }

  push(order, hash) { this.record.orders.push({ ...order, h: hash }); }

  finish(result) { this.record.result = result ? { ...result } : null; }

  toJSON() { return this.record; }
}

/**
 * Juega una partida en el motor sin gráficos con un registro de órdenes.
 * Devuelve { ok, result, hashes, divergeAt, error }:
 *   divergeAt  índice de la primera orden cuya huella no coincide con la grabada (o -1 si coinciden todas)
 *   error      orden ilegal ({ index, code }) si la hay: la partida se corta ahí
 */
export async function replay(record, { stopOnDiverge = false } = {}) {
  const combat = new HeadlessCombat(record.setup).start();
  const hashes = [];
  let divergeAt = record.start && record.start !== combat.hash() ? 0 : -1;
  let error = null;
  for (let i = 0; i < record.orders.length; i++) {
    const { h, ...order } = record.orders[i];
    if (combat.over) { error = { index: i, code: 'combat_over' }; break; }
    let hash;
    try {
      hash = await combat.apply(order);
    } catch (e) {
      error = { index: i, code: e.code || 'error', message: e.message };
      break;
    }
    hashes.push(hash);
    if (h && h !== hash && divergeAt < 0) {
      divergeAt = i;
      if (stopOnDiverge) break;
    }
  }
  return { ok: !error && divergeAt < 0, result: combat.result, hashes, divergeAt, error, combat };
}

/**
 * Partida automática para pruebas: en cada paso elige una orden legal con un azar propio (no el de las reglas).
 * Prefiere lanzar cartas y moverse; termina el turno cuando no queda nada o al azar. Devuelve el registro.
 */
export async function playRandom(setup, { pickSeed = 7, maxOrders = 2000 } = {}) {
  const { mulberry32 } = await import('./SeededRandom.js');
  const pick = mulberry32(pickSeed);
  const combat = new HeadlessCombat(setup).start();
  const rec = new CombatRecorder(setup);
  rec.started(combat.hash());
  let n = 0;
  while (!combat.over && n++ < maxOrders) {
    const legal = combat.legalOrders();
    if (!legal.length) break;
    const casts = legal.filter((o) => o.t === 'cast');
    const moves = legal.filter((o) => o.t === 'move');
    const end = legal.find((o) => o.t === 'end');
    const r = pick();
    const order = casts.length && r < 0.6 ? casts[Math.floor(pick() * casts.length)]
      : moves.length && r < 0.85 ? moves[Math.floor(pick() * moves.length)]
        : end;
    const hash = await combat.apply(order);
    rec.push(order, hash);
  }
  rec.finish(combat.result);
  return { record: rec.toJSON(), combat };
}
