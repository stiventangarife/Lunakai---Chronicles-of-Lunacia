// PvpBotRunner.js — El «jugador» de un bot de la Arena: hace con una partida lo mismo que el cliente de una persona
// (rpg/arena/PvpSession.js), pero sin pantalla. Plan: docs/PLAN_BOTS_ARENA.md (fases R1–R2).
//
// Lo usa la Edge Function `pvp-bot` (Deno) y las pruebas locales (Node). No sabe nada de la red: recibe `call(fn, args)`,
// que llama a pvp_bot_call(bot, fn, args) en el servidor (match, act, ack, timeout, report, dispute).
//
// Una pasada (runBotMatch) por partida:
//   1. Pide la partida y todas sus órdenes, y rehace el estado con el motor sin gráficos desde el bando del bot.
//      Una orden del rival que el motor no acepta → disputa (como el cliente).
//   2. Confirma (ack) la huella de los fines de turno del rival y la del tiempo agotado del propio bot que aún no
//      haya confirmado (las posteriores a su última orden).
//   3. Si la partida terminó en el motor y el bot no lo ha informado → pvp_report (mismo ganador, motivo y huella).
//      Si el rival aún no tiene el combate en pantalla (rivalReadyAt = null: está viendo la presentación o cargando),
//      no hace nada más: el servidor avisa cuando lo tenga (migración 20261114000000_arena_bots_ready.sql). Tope:
//      READY_WAIT_MS desde que se creó la partida (por si cerró el juego). Su primera acción llega como pronto
//      READY_SETTLE_MS después, para que el jugador vea el tablero antes.
//   4. Si le toca al bot → decide con PvpBot y manda las órdenes una a una, con pausas «humanas» (pensar 2–8 s, entre
//      acciones 0,6–1,2 s), siempre dentro del tiempo del turno. Sigue mientras le toque (sus dos unidades).
//   5. Si le toca al rival y se le acabó el tiempo (+ margen) → pide el fin forzado (pvp_timeout).
// Si el servidor rechaza algo (otra llamada se adelantó, el estado cambió), se para: el siguiente aviso lo retoma.

import { HeadlessCombat } from './HeadlessCombat.js';
import { playBotTurn, botRng, levelForPoints } from './PvpBot.js';

const READY_WAIT_MS = 90_000;  // como mucho, lo que se espera a que el rival cargue el combate
const READY_SETTLE_MS = 4000;  // primera acción del bot: no antes de esto tras tener el rival el combate en pantalla
const CLAIM_MARGIN_MS = 1500; // el mismo margen que el cliente antes de reclamar el tiempo del rival

/** Pausas «humanas» por nivel (ms). El azar de las pausas no cambia ninguna orden. */
const PACE = {
  novice: { think: [3500, 9000], step: [800, 1500] },
  normal: { think: [2500, 7000], step: [650, 1200] },
  strong: { think: [2000, 5500], step: [600, 1000] },
};

const between = (r, [a, b]) => a + Math.floor(r() * (b - a));

/**
 * @param {object} p
 *   call     async (fn, args) => respuesta de pvp_bot_call
 *   match    id de la partida
 *   level    'novice' | 'normal' | 'strong' | null (null = según `points`)
 *   points   puntos del bot (para el nivel)
 *   sleep    async (ms) => void   (en pruebas, sin esperar)
 *   now      () => ms del reloj   (para no pasarse del tiempo del turno)
 *   log      (texto) => void
 *   paceRng  () => 0..1 para las pausas (por defecto Math.random: no afecta a las reglas)
 *   maxTurnMs tope de lo que puede durar el turno del bot (por defecto el del servidor − 8 s)
 * @returns {Promise<{ played: number, acked: number, reported: boolean, timeout: boolean, stop?: string }>}
 */
export async function runBotMatch({ call, match: matchId, level = null, points = 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = () => Date.now(), log = () => {}, paceRng = Math.random, maxTurnMs = null }) {
  const out = { played: 0, acked: 0, reported: false, timeout: false };
  const lvl = level || levelForPoints(points);
  const pace = PACE[lvl] || PACE.normal;

  // 1. Partida y órdenes
  const res = await call('match', { match: matchId, from: 0 });
  if (!res?.ok) return { ...out, stop: res?.error || 'no_match' };
  const m = res.match;
  const side = m.side;
  const actions = res.actions || [];
  const skew = m.now ? new Date(m.now).getTime() - now() : 0;     // reloj del servidor
  const serverNow = () => now() + skew;

  const e = HeadlessCombat.fromMatch(m, side).start();
  let seq = 0;
  let lastOwn = -1;
  const toAck = [];
  for (const a of actions) {
    if (a.seq !== seq) return { ...out, stop: 'gap' };
    let hash;
    try {
      hash = await e.apply(a.ord);
    } catch (err) {
      if (a.side !== side) {
        log(`orden ilegal del rival en ${a.seq}: ${err?.code || err?.message}`);
        await call('dispute', { match: matchId, reason: `illegal:${err?.code || 'order'}`, seq: a.seq });
        return { ...out, stop: 'disputed' };
      }
      return { ...out, stop: 'own_order_rejected' };
    }
    if (a.side === side) lastOwn = a.seq;
    const confirm = a.ord.t === 'end' ? a.side !== side : a.ord.t === 'timeout' && a.ord.side === side;
    if (confirm && a.hash) toAck.push({ seq: a.seq, hash });
    seq++;
  }

  // 2. Huellas pendientes (las posteriores a la última orden del bot: las anteriores ya se confirmaron)
  for (const k of toAck.filter((x) => x.seq > lastOwn)) {
    const r = await call('ack', { match: matchId, seq: k.seq, hash: k.hash });
    if (r?.ok) out.acked++;
    if (r?.disputed) return { ...out, stop: 'disputed' };
  }

  // 3. Final
  const report = async () => {
    if (out.reported) return; // (pvp_bot_pending ya no devuelve partidas que el bot ha informado)
    const r = e.result || {};
    const w = r.winnerSide || 'draw';
    const rr = await call('report', { match: matchId, winner: w, reason: r.reason === 'rounds' ? 'rounds' : 'elimination', hash: e.hash() });
    out.reported = Boolean(rr?.ok);
  };
  if (e.over) { if (m.status === 'active' || m.status === 'ended') await report(); return out; }
  if (m.status !== 'active') return out;

  // 3b. ¿El rival tiene ya el combate en pantalla? (undefined = servidor sin esa información: como antes)
  const readyAt = m.rivalReadyAt ? new Date(m.rivalReadyAt).getTime() : null;
  if (m.rivalReadyAt === null && !actions.some((a) => a.side !== side)) {
    const age = m.createdAt ? serverNow() - new Date(m.createdAt).getTime() : Infinity;
    if (age < READY_WAIT_MS) return { ...out, stop: 'waiting_ready' };
  }

  // 4. Turno del bot
  const turnSecs = Number(m.turnSecs) || 45;
  let budget = maxTurnMs ?? Math.max(5000, (turnSecs - 8) * 1000);
  if (e.turnSide === side) {
    const start = now();
    // Nunca más allá del plazo del servidor (con margen)
    const dl = m.turnDeadline ? new Date(m.turnDeadline).getTime() : null;
    if (dl) budget = Math.max(3000, Math.min(budget, dl - serverNow() - 3000));
    let settle = readyAt ? readyAt + READY_SETTLE_MS - serverNow() : 0; // solo la primera vez
    const rng = botRng(m.seed, seq); // mismas jugadas para la misma partida y el mismo momento
    // Plan: el bot decide sobre una copia; se mandan las órdenes de una en una sobre el motor «de verdad»
    while (!e.over && e.turnSide === side) {
      const plan = HeadlessCombat.fromMatch(m, side).start();
      for (const o of e.log) await plan.apply(o); // copia exacta del estado (el registro del motor tiene todas las órdenes)
      const orders = await playBotTurn(plan, { level: lvl, rng });
      if (!orders.length) break;
      // Pensar antes de la primera acción de cada unidad (sin pasarse del tiempo del turno)
      const left = budget - (now() - start);
      // A veces (1 de cada 8) se lo piensa más, como una persona; nunca hasta pasarse del tiempo del turno
      const think = between(paceRng, pace.think) + (paceRng() < 0.125 ? between(paceRng, [4000, 10000]) : 0);
      await sleep(Math.max(300, settle, Math.min(think, left - orders.length * pace.step[0] - 1500)));
      settle = 0;
      for (const o of orders) {
        const hash = await e.apply(o);
        const end = o.t === 'end';
        const next = e.over ? side : e.turnSide;
        const r = await call('act', { match: matchId, seq, order: o, hash: end ? hash : null, next: end ? next : null });
        if (!r?.ok) {
          if (r?.error === 'bad_seq' && r.nextSeq === seq + 1) { seq++; continue; } // ya estaba guardada (reintento)
          log(`orden rechazada (${r?.error}) en ${seq}`);
          return { ...out, stop: r?.error || 'rejected' };
        }
        seq++;
        out.played++;
        if (e.over) break;
        if (!end) await sleep(Math.min(between(paceRng, pace.step), Math.max(200, budget - (now() - start) - 1000)));
      }
      if (e.over) { await report(); return out; }
    }
    return out;
  }

  // 5. Turno del rival: ¿se le acabó el tiempo?
  const deadline = m.turnDeadline ? new Date(m.turnDeadline).getTime() : null;
  const grace = (Number(m.graceSecs) || 5) * 1000;
  if (deadline && serverNow() > deadline + grace + CLAIM_MARGIN_MS) {
    const hash = await e.apply({ t: 'timeout' });
    const r = await call('timeout', { match: matchId, seq, hash, next: e.turnSide });
    out.timeout = Boolean(r?.ok);
    if (r?.ok && !r.abandoned) {
      // Ahora puede tocarle al bot: otra pasada (el aviso de la base de datos también llega)
      const again = await runBotMatch({ call, match: matchId, level, points, sleep, now, log, paceRng, maxTurnMs });
      return { ...again, timeout: true, acked: out.acked + again.acked };
    }
  }
  return out;
}
