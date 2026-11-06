#!/usr/bin/env node
// arbiter-test.mjs — Pruebas del árbitro de la Arena PvP (fase P4): tactics/sim/PvpArbiter.js.
// Uso: node tools/pvp/arbiter-test.mjs [partidas=12]
// Partidas al azar en el motor sin gráficos, guardadas como las guarda el servidor (seq, bando, orden, huella del que
// termina el turno, huella del que la confirma). Después se estropean a propósito (orden ilegal, fuera de turno,
// huella falsa, confirmación falsa, informe falso, disputa sin motivo, fin de turno forzado mal puesto) y el árbitro
// debe dar como perdedor a quien hizo trampa; las partidas limpias deben dar el mismo final que el motor.
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
const root = new URL('../../src/tactics/', import.meta.url);
const { HeadlessCombat, unitSide } = await import(new URL('sim/HeadlessCombat.js', root));
const { arbitrate } = await import(new URL('sim/PvpArbiter.js', root));
const { mulberry32 } = await import(new URL('sim/SeededRandom.js', root));
const { SPELLS_DB } = await import(new URL('data/SpellsDB.js', root));

const N = Number(process.argv[2]) || 12;
let fails = 0;
const check = (ok, msg) => { if (!ok) fails++; if (!ok || process.env.VERBOSE) console.log(`  ${ok ? '✓' : '✗'} ${msg}`); return ok; };
const MAPS = ['forest_maple_glade', 'savannah_canyon', 'arctic_glacier_pass', 'mystic_glow_swamp', 'genesis_royal_garden', 'forest_river_ford'];
const CLS = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile'];
const SAPS = ['crafter', 'shepard', 'lunalogist', 'stargazer'];
const ids = Object.keys(SPELLS_DB);
const snap = (k, name) => {
  const cls = CLS[k % 6];
  const parts = ids.filter((id) => id.startsWith(`part_${cls}_`));
  return { name, sapidaeClass: SAPS[k % 4], axie: { axieId: String(k), name: `Ax${k}`, class: cls, cards: Array.from({ length: 6 }, (_, i) => parts[(k * 5 + i * 11) % parts.length]) } };
};
const other = (s) => (s === 'A' ? 'B' : 'A');
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Partida jugada como la vería el servidor. stopAt: corta a mitad (partida sin final). */
async function play(k, { stopAt = Infinity } = {}) {
  const match = { id: `m${k}`, seed: (0x1B873593 * (k + 5)) >>> 0, map: MAPS[k % 6], tieBreak: k % 2 ? 'B' : 'A', maxRounds: 25,
    A: snap(k, 'Ana'), B: snap(k + 3, 'Bea'), status: 'ended', reports: {}, dispute: null };
  const e = HeadlessCombat.fromMatch(match, 'A').start();
  const pick = mulberry32(77 + k);
  const actions = [];
  while (!e.over && actions.length < stopAt) {
    const side = e.turnSide;
    const legal = e.legalOrders();
    const casts = legal.filter((o) => o.t === 'cast'), moves = legal.filter((o) => o.t === 'move'), r = pick();
    const timeout = r < 0.03;
    const o = timeout ? { t: 'timeout', side } : casts.length && r < 0.6 ? casts[Math.floor(pick() * casts.length)]
      : moves.length && r < 0.85 ? moves[Math.floor(pick() * moves.length)] : legal.find((x) => x.t === 'end');
    const h = await e.apply(timeout ? { t: 'timeout' } : o);
    const ended = o.t === 'end' || timeout;
    actions.push({ seq: actions.length, side: timeout ? 'S' : side, ord: o, hash: ended ? h : null, ackHash: ended ? h : null });
  }
  if (e.over) {
    const w = e.result.winnerSide === 'draw' ? '' : e.result.winnerSide;
    match.reports = { A: { winner: w, reason: e.result.reason, hash: e.hash() }, B: { winner: w, reason: e.result.reason, hash: e.hash() } };
  }
  return { match, actions, engine: e };
}

const t0 = Date.now();
const stats = { clean: 0, cheats: 0 };
for (let k = 0; k < N; k++) {
  const g = await play(k);
  const res = g.engine.result;
  // 1. Partida limpia (los dos informes, o solo uno): el final del motor
  for (const reps of [g.match.reports, { A: g.match.reports.A }]) {
    const v = await arbitrate({ ...g.match, reports: reps }, g.actions);
    check(v.result === (res.winnerSide === 'draw' ? 'draw' : 'win') && (v.winner || 'draw') === res.winnerSide && v.reason === res.reason && !v.culprit,
      `partida ${k}: limpia → ${v.result} ${v.winner} (${v.reason})`);
    stats.clean++;
  }
  // 2. Informe con otro ganador: manda el motor y se anota al mentiroso
  {
    const reps = clone(g.match.reports); reps.B.winner = res.winnerSide === 'A' ? 'B' : 'A';
    const v = await arbitrate({ ...g.match, reports: reps, status: 'disputed', dispute: { kind: 'report' } }, g.actions);
    check((v.winner || 'draw') === res.winnerSide && v.liars?.includes('B'), `partida ${k}: informe falso de B → manda el motor, B anotado`);
  }
  const n = g.actions.length;
  const ends = g.actions.filter((a) => a.ord.t === 'end');
  const mid = ends[Math.floor(ends.length / 2)];
  // 3. Huella falsa de quien termina el turno
  if (mid) {
    const acts = clone(g.actions); acts[mid.seq].hash = 'deadbeef';
    const v = await arbitrate({ ...g.match, status: 'disputed', dispute: { kind: 'hash' } }, acts);
    check(v.culprit === mid.side && v.fault === 'hash' && v.winner === other(mid.side), `partida ${k}: huella falsa de ${mid.side} → pierde ${v.culprit} (${v.fault})`);
    stats.cheats++;
  }
  // 4. Confirmación falsa del rival
  if (mid) {
    const acts = clone(g.actions); acts[mid.seq].ackHash = '0badf00d';
    const v = await arbitrate({ ...g.match, status: 'disputed', dispute: { kind: 'hash' } }, acts);
    check(v.culprit === other(mid.side) && v.fault === 'ack', `partida ${k}: confirmación falsa de ${other(mid.side)} → pierde ${v.culprit} (${v.fault})`);
    stats.cheats++;
  }
  // 5. Movimiento imposible
  const mv = g.actions.find((a) => a.ord.t === 'move' && a.seq > 5);
  if (mv) {
    const acts = clone(g.actions); acts[mv.seq].ord = { ...mv.ord, x: 99, z: 99 };
    const v = await arbitrate({ ...g.match, status: 'disputed', dispute: { kind: 'client', by: other(mv.side) } }, acts.slice(0, mv.seq + 1));
    check(v.culprit === mv.side && v.fault === 'illegal', `partida ${k}: movimiento imposible de ${mv.side} → pierde ${v.culprit} (${v.fault} ${v.detail?.code})`);
    stats.cheats++;
  }
  // 6. Carta que no es suya
  const cs = g.actions.find((a) => a.ord.t === 'cast' && a.seq > 3);
  if (cs) {
    const acts = clone(g.actions); acts[cs.seq].ord = { ...cs.ord, spell: 'werewolf_boss_cataclysm' };
    const v = await arbitrate({ ...g.match, status: 'disputed', dispute: { kind: 'client', by: other(cs.side) } }, acts.slice(0, cs.seq + 1));
    check(v.culprit === cs.side && v.fault === 'illegal', `partida ${k}: carta ajena de ${cs.side} → pierde ${v.culprit}`);
    stats.cheats++;
  }
  // 7. Fuera de turno: el rival juega en lugar del que tenía el turno (el servidor se fió de su «siguiente bando»)
  const ot = g.actions.find((a) => a.ord.t === 'move' && a.seq > 2);
  if (ot) {
    const acts = clone(g.actions); acts[ot.seq].side = other(ot.side);
    const v = await arbitrate({ ...g.match, status: 'disputed', dispute: { kind: 'client', by: ot.side } }, acts.slice(0, ot.seq + 1));
    check(v.culprit === other(ot.side) && v.fault === 'out_of_turn', `partida ${k}: ${other(ot.side)} juega fuera de turno → pierde ${v.culprit} (${v.fault})`);
    stats.cheats++;
  }
  // 8. Informe de un final que no existe (partida cortada a mitad, un solo informe)
  {
    const cut = g.actions.slice(0, Math.floor(n / 2));
    const v = await arbitrate({ ...g.match, status: 'ended', reports: { B: { winner: 'B', reason: 'elimination', hash: '12345678' } } }, cut);
    check(v.culprit === 'B' && v.fault === 'false_report' && v.winner === 'A', `partida ${k}: B informa de un final que no existe → pierde ${v.culprit}`);
    stats.cheats++;
  }
  // 9. Disputa sin motivo (todas las órdenes eran legales y las huellas cuadran)
  {
    const cut = g.actions.slice(0, Math.floor(n / 3));
    const v = await arbitrate({ ...g.match, status: 'disputed', reports: {}, dispute: { kind: 'client', by: 'A', seq: cut.length - 1 } }, cut);
    check(v.culprit === 'A' && v.fault === 'false_dispute', `partida ${k}: A abre una disputa sin motivo → pierde ${v.culprit}`);
    stats.cheats++;
  }
  // 10. Fin de turno forzado del bando equivocado
  const to = g.actions.find((a) => a.ord.t === 'timeout');
  if (to) {
    const acts = clone(g.actions); acts[to.seq].ord = { t: 'timeout', side: other(to.ord.side) };
    const v = await arbitrate({ ...g.match, status: 'disputed', dispute: { kind: 'hash' } }, acts.slice(0, to.seq + 1));
    check(v.culprit === to.ord.side && v.fault === 'bad_timeout', `partida ${k}: fin forzado pedido por quien tenía el turno → pierde ${v.culprit}`);
    stats.cheats++;
  }
  // 11. Órdenes después del final
  if (g.engine.over) {
    const acts = clone(g.actions); const last = acts.at(-1);
    acts.push({ seq: n, side: last.side === 'S' ? 'A' : last.side, ord: { t: 'end', unit: 'A_axie' }, hash: null, ackHash: null });
    const v = await arbitrate({ ...g.match, status: 'disputed', dispute: { kind: 'report' } }, acts);
    check(Boolean(v.culprit) && v.fault === 'after_end', `partida ${k}: orden tras el final → pierde ${v.culprit}`);
  }
  // 12. Sin pruebas contra nadie (dos informes de un final que no existe): se anula
  {
    const cut = g.actions.slice(0, 10);
    const v = await arbitrate({ ...g.match, status: 'disputed', reports: g.match.reports, dispute: { kind: 'report' } }, cut);
    check(v.result === 'void', `partida ${k}: sin final y los dos informan → anulada (${v.result})`);
  }
  // 13. Mismo veredicto siempre
  const a = JSON.stringify(await arbitrate(g.match, g.actions)), b = JSON.stringify(await arbitrate(clone(g.match), clone(g.actions)));
  check(a === b, `partida ${k}: veredicto determinista`);
  if (k < 4) console.log(`  · partida ${k} · ${g.match.map} · ${n} órdenes · ${res.reason}:${res.winnerSide} → árbitro de acuerdo; trampas detectadas`);
}
console.log(`\n${fails ? `✗ ${fails} fallos` : '✓ todo correcto'} · ${N} partidas · ${stats.clean} arbitrajes limpios · ${stats.cheats} trampas · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(fails ? 1 : 0);
