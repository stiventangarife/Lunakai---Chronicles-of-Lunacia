// PvpArbiter.js — El árbitro de la Arena PvP (fase P4). Plan: docs/PLAN_ARENA_PVP.md, sección 15.
//
// Repite en el motor sin gráficos las órdenes que el servidor guardó de una partida y decide el resultado oficial.
// Lo usa la Edge Function `pvp-arbiter` (Deno) con las partidas en disputa y las que terminaron con un solo informe;
// en Node lo prueban tools/pvp/sim-test.mjs y tools/pvp/arbiter-test.mjs. Puro: sin red, sin tiempo, sin azar propio.
//
// Qué comprueba, orden a orden (el servidor solo comprobó turno declarado, número, tiempo y forma):
//   · que la orden la manda el bando al que le toca según el motor (el servidor se fía del «siguiente bando» que
//     declara el cliente al terminar su turno);
//   · que es legal (unidad activa, PM con el camino del juego, carta propia, PA, objetivo válido);
//   · que la huella que mandó quien terminó el turno (y la que confirmó el rival) es la del motor.
// Decisión:
//   1. Hay un culpable (la primera orden fuera de turno o ilegal, o la primera huella falsa): pierde ('arbiter').
//   2. Sin culpable y la partida termina en el motor: vale ese final (eliminación o rondas), digan lo que digan los
//      informes; un informe que no coincide marca a su autor.
//   3. Sin culpable y sin final: si alguien informó de un final que no existe, pierde él; si alguien abrió una disputa
//      sin motivo (las órdenes del rival eran legales y las huellas cuadran), pierde quien la abrió; si no, se anula.

import { HeadlessCombat, IllegalOrder } from './HeadlessCombat.js';

export const ARBITER_VERSION = 1;
const other = (s) => (s === 'A' ? 'B' : s === 'B' ? 'A' : null);

/**
 * @param {object} match    partida (seed, map, tieBreak, maxRounds, A, B, status, reports, dispute)
 * @param {Array} actions   órdenes guardadas: { seq, side 'A'|'B'|'S', ord, hash, ackHash }
 * @param {object} [opts]   maxOrders: tope de seguridad
 * @returns {Promise<object>} veredicto: { v, result 'win'|'draw'|'void', winner, reason, culprit, fault, seq, replay }
 */
export async function arbitrate(match, actions, { maxOrders = 5000 } = {}) {
  const list = [...(actions || [])].sort((a, b) => a.seq - b.seq);
  let engine;
  try {
    engine = HeadlessCombat.fromMatch(match, 'A').start();
  } catch (err) {
    return verdict({ result: 'void', fault: 'setup', detail: String(err?.message || err).slice(0, 120) }, null, 0);
  }
  let culprit = null, fault = null, faultSeq = null, detail = null;
  const blame = (side, why, seq, info = null) => {
    if (culprit || !side) return;
    culprit = side; fault = why; faultSeq = seq; detail = info;
  };

  let applied = 0;
  for (let i = 0; i < list.length && i < maxOrders; i++) {
    const a = list[i];
    if (a.seq !== i) { blame(null); detail = `hueco en la orden ${i}`; break; } // el servidor numera sin huecos
    const ord = a.ord || {};
    const isTimeout = ord.t === 'timeout';
    // Quién «firma» la huella: el que termina el turno; en un fin forzado, el que lo pidió (el rival del que lo perdió)
    const author = isTimeout ? other(ord.side) : a.side;
    const acker = isTimeout ? ord.side : other(a.side);
    if (engine.over) { blame(isTimeout ? author : a.side, 'after_end', a.seq); break; }
    const turn = engine.turnSide;
    if (isTimeout) {
      if (ord.side !== turn) { blame(author, 'bad_timeout', a.seq, { turn }); break; }
    } else if (a.side !== turn) {
      blame(a.side, 'out_of_turn', a.seq, { turn });
      break;
    }
    let hash;
    try {
      hash = await engine.apply(isTimeout ? { t: 'timeout' } : ord);
    } catch (err) {
      blame(a.side, 'illegal', a.seq, { code: err instanceof IllegalOrder ? err.code : 'error' });
      break;
    }
    applied++;
    if (a.hash && a.hash !== hash) blame(author, 'hash', a.seq, { sent: a.hash, engine: hash });
    if (a.ackHash && a.ackHash !== hash) blame(acker, 'ack', a.seq, { sent: a.ackHash, engine: hash });
    if (culprit) break; // tras una huella falsa la partida se paró: lo que venga después no cuenta
  }

  const reports = match.reports || {};
  if (!culprit && engine.over) {
    const r = engine.result;
    const fin = { result: r.winnerSide === 'draw' ? 'draw' : 'win', winner: r.winnerSide === 'draw' ? null : r.winnerSide, reason: r.reason };
    // Informes que no coinciden con el final del motor (solo se anotan: manda el motor)
    const liars = ['A', 'B'].filter((s) => reports[s] && ((reports[s].winner || null) !== (fin.winner || null) || reports[s].hash !== engine.hash()));
    return verdict({ ...fin, liars }, engine, applied);
  }
  if (!culprit) {
    // Sin final en el motor: ¿alguien informó de un final que no existe?
    const reporters = ['A', 'B'].filter((s) => reports[s]);
    if (reporters.length === 1) blame(reporters[0], 'false_report', null);
    else if (reporters.length === 2) return verdict({ result: 'void', fault: 'both_reported' }, engine, applied);
    else if (match.status === 'disputed' && match.dispute?.kind === 'client' && ['A', 'B'].includes(match.dispute.by)) {
      blame(match.dispute.by, 'false_dispute', match.dispute.seq ?? null);
    }
  }
  if (culprit) return verdict({ result: 'win', winner: other(culprit), reason: 'arbiter', culprit, fault, seq: faultSeq, detail }, engine, applied);
  return verdict({ result: 'void', fault: fault || 'no_evidence', detail }, engine, applied);
}

function verdict(v, engine, applied) {
  return {
    v: ARBITER_VERSION,
    result: v.result,
    winner: v.winner ?? null,
    reason: v.reason ?? (v.result === 'void' ? 'void' : null),
    culprit: v.culprit ?? null,
    fault: v.fault ?? null,
    seq: v.seq ?? null,
    detail: v.detail ?? null,
    liars: v.liars?.length ? v.liars : undefined,
    replay: engine ? {
      applied,
      over: engine.over,
      round: engine.round,
      hash: engine.hash(),
      turnSide: engine.over ? null : engine.turnSide,
      result: engine.result ? { winnerSide: engine.result.winnerSide, reason: engine.result.reason } : null,
    } : null,
  };
}

