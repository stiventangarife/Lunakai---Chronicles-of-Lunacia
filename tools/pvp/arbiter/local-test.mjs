#!/usr/bin/env node
// local-test.mjs — Árbitro de la Arena PvP (fase P4) de punta a punta, sin la nube.
//
// 1. Crea partidas reales en PostgreSQL con las funciones del juego (pvp_enqueue, pvp_act, pvp_ack, pvp_timeout,
//    pvp_report, pvp_dispute) jugadas por dos «clientes» con el motor sin gráficos (cada uno desde su bando), y en
//    algunas un jugador hace trampa.
// 2. Ejecuta la Edge Function supabase/functions/pvp-arbiter/index.ts en Node (sin Deno: un Deno mínimo de prueba)
//    contra tools/pvp/local/fake-supabase.cjs con la clave de servicio de prueba.
// 3. Comprueba en la base de datos el resultado oficial de cada partida.
//
// Requisitos: PostgreSQL con las migraciones de la Arena (+ tools/pvp/local/realtime-setup.sql y players-p3.sql),
// fake-supabase en marcha con SERVICE_KEY=service-test, y `node tools/pvp/arbiter/build.mjs` hecho.
// Uso: PGARGS="-h /tmp/pg -p 5499 -U postgres" DB=p1 node --experimental-strip-types tools/pvp/arbiter/local-test.mjs
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../../../', import.meta.url);
const { HeadlessCombat } = await import(new URL('src/tactics/sim/HeadlessCombat.js', ROOT));
const { mulberry32 } = await import(new URL('src/tactics/sim/SeededRandom.js', ROOT));
const PG = [...(process.env.PGARGS || '-h /tmp/pg -p 5499 -U postgres').split(' '), '-d', process.env.DB || 'p1', '-At', '-v', 'ON_ERROR_STOP=1'];
const psql = (q) => execFileSync(process.env.PSQL || 'psql', [...PG, '-c', q]).toString().trim().split('\n').pop();
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
const as = (uid, q) => JSON.parse(psql(`select set_config('request.jwt.claim.sub', ${lit(uid)}, false); select (${q})::text`) || 'null');
const U = (i) => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, '0')}`;
const other = (s) => (s === 'A' ? 'B' : 'A');
let fails = 0;
const check = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

psql(`update public.pvp_matches set status = 'aborted' where status in ('active','ended','disputed'); delete from public.pvp_queue;`);

/** Empareja a dos jugadores de prueba y devuelve sus dos clientes (motor desde su bando). */
function pair(i, j) {
  as(U(i), 'public.pvp_enqueue(1::smallint)');
  psql(`update public.pvp_queue set joined_at = now() - interval '2 minutes'`);
  const r = as(U(j), 'public.pvp_enqueue(1::smallint)');
  if (r.status !== 'matched') throw new Error(`sin partida: ${JSON.stringify(r)}`);
  const m = r.match;
  const mi = as(U(i), `public.pvp_match(${lit(m.id)}::uuid, 0)`).match;
  const cl = { [m.side]: { uid: U(j), e: HeadlessCombat.fromMatch(m, m.side).start() }, [mi.side]: { uid: U(i), e: HeadlessCombat.fromMatch(mi, mi.side).start() } };
  return { id: m.id, cl, seq: 0 };
}

/**
 * Juega órdenes legales al azar hasta el final (o hasta `stop` órdenes), como lo harían los dos clientes:
 * orden → los dos motores; fin de turno → huella + siguiente bando; el rival confirma la huella.
 * `cheat(g, side, order, hash)` puede devolver otra orden / huella para hacer trampa.
 */
function play(g, { stop = Infinity, pickSeed = 1, cheat = null } = {}) {
  const pick = mulberry32(pickSeed);
  return (async () => {
    while (g.seq < stop) {
      const anyE = g.cl.A.e;
      if (anyE.over) break;
      const side = anyE.turnSide;
      const me = g.cl[side], them = g.cl[other(side)];
      const legal = me.e.legalOrders();
      const casts = legal.filter((o) => o.t === 'cast'), moves = legal.filter((o) => o.t === 'move'), r = pick();
      let o = casts.length && r < 0.6 ? casts[Math.floor(pick() * casts.length)] : moves.length && r < 0.85 ? moves[Math.floor(pick() * moves.length)] : legal.find((x) => x.t === 'end');
      const hash = await me.e.apply(o);
      let sendHash = o.t === 'end' ? hash : null;
      if (cheat) { const c = cheat(g, side, o, sendHash); if (c) { o = c.order || o; sendHash = c.hash ?? sendHash; if (c.stop) { as(me.uid, `public.pvp_act(${lit(g.id)}::uuid, ${g.seq}, ${lit(JSON.stringify(o))}::jsonb, ${sendHash ? lit(sendHash) : 'null'}, ${o.t === 'end' ? lit(me.e.over ? side : me.e.turnSide) : 'null'})`); g.seq++; return c.stop; } } }
      const res = as(me.uid, `public.pvp_act(${lit(g.id)}::uuid, ${g.seq}, ${lit(JSON.stringify(o))}::jsonb, ${sendHash ? lit(sendHash) : 'null'}, ${o.t === 'end' ? lit(me.e.over ? side : me.e.turnSide) : 'null'})`);
      if (!res.ok) throw new Error(`pvp_act: ${JSON.stringify(res)} ${JSON.stringify(o)}`);
      const h2 = await them.e.apply(o);
      const ack = o.t === 'end' ? as(them.uid, `public.pvp_ack(${lit(g.id)}::uuid, ${g.seq}, ${lit(h2)})`) : null;
      g.seq++;
      if (ack?.disputed) return 'disputed'; // la huella del que terminó no es la del rival: el servidor abre la disputa
    }
    return null;
  })();
}
const report = (g, side) => { const e = g.cl[side].e; const w = e.result.winnerSide; return as(g.cl[side].uid, `public.pvp_report(${lit(g.id)}::uuid, ${lit(w)}, ${lit(e.result.reason)}, ${lit(e.hash())})`); };
const row = (id) => JSON.parse(psql(`select to_jsonb(m) - 'a_snapshot' - 'b_snapshot' from public.pvp_matches m where id = ${lit(id)}`));

console.log('\n1) Preparar partidas en el servidor');
const cases = [];
{ // a) honesta, solo informa uno (el otro cierra el juego)
  const g = pair(21, 22); await play(g, { pickSeed: 11 }); report(g, 'A');
  psql(`update public.pvp_matches set ended_at = now() - interval '3 minutes' where id = ${lit(g.id)}`);
  cases.push({ name: 'un solo informe (honesto)', g, expect: (m) => m.status === 'finished' && (m.winner || 'draw') === g.cl.A.e.result.winnerSide && m.reason === g.cl.A.e.result.reason });
}
{ // b) B manda un movimiento imposible; A abre la disputa
  const g = pair(23, 24);
  const bad = await play(g, { pickSeed: 12, cheat: (gg, side, o) => (side === 'B' && gg.seq > 8 && o.t === 'move' ? { order: { ...o, x: 99, z: 99 }, stop: 'B' } : null) });
  as(g.cl.A.uid, `public.pvp_dispute(${lit(g.id)}::uuid, 'illegal:bad_move', ${g.seq - 1})`);
  cases.push({ name: 'movimiento imposible de B', g, expect: (m) => m.status === 'finished' && m.winner === 'A' && m.reason === 'arbiter' && m.arbiter?.culprit === 'B' && m.arbiter?.fault === 'illegal', bad });
}
{ // c) A miente con la huella de su fin de turno; B la confirma con la de verdad → disputa por huella
  const g = pair(25, 26);
  await play(g, { pickSeed: 13, cheat: (gg, side, o, h) => (side === 'A' && gg.seq > 10 && o.t === 'end' ? { hash: 'deadbeef' } : null), stop: 40 });
  cases.push({ name: 'huella falsa de A', g, expect: (m) => m.status === 'finished' && m.winner === 'B' && m.arbiter?.culprit === 'A' && m.arbiter?.fault === 'hash' });
}
{ // d) A abre una disputa sin motivo a mitad de partida
  const g = pair(27, 28); await play(g, { pickSeed: 14, stop: 25 });
  as(g.cl.A.uid, `public.pvp_dispute(${lit(g.id)}::uuid, 'illegal:order', ${g.seq - 1})`);
  cases.push({ name: 'disputa sin motivo de A', g, expect: (m) => m.status === 'finished' && m.winner === 'B' && m.arbiter?.fault === 'false_dispute' });
}
{ // e) los dos informan, B miente sobre el ganador → manda la repetición
  const g = pair(29, 30); await play(g, { pickSeed: 15 });
  const e = g.cl.A.e; const truth = e.result.winnerSide;
  report(g, 'A');
  as(g.cl.B.uid, `public.pvp_report(${lit(g.id)}::uuid, ${lit(truth === 'A' ? 'B' : 'A')}, ${lit(e.result.reason)}, ${lit(e.hash())})`);
  cases.push({ name: 'informe falso de B (los dos informan)', g, expect: (m) => m.status === 'finished' && (m.winner || 'draw') === truth && (m.arbiter?.liars || []).includes('B') });
}
{ // f) B informa de una victoria a mitad de partida y deja de jugar
  const g = pair(31, 32); await play(g, { pickSeed: 16, stop: 30 });
  as(g.cl.B.uid, `public.pvp_report(${lit(g.id)}::uuid, 'B', 'elimination', '12345678')`);
  psql(`update public.pvp_matches set ended_at = now() - interval '3 minutes' where id = ${lit(g.id)}`);
  cases.push({ name: 'final inventado por B', g, expect: (m) => m.status === 'finished' && m.winner === 'A' && m.arbiter?.fault === 'false_report' });
}
for (const c of cases) console.log(`  · ${c.name}: partida ${c.g.id.slice(0, 8)} · ${c.g.seq} órdenes · ${row(c.g.id).status}`);

console.log('\n2) Árbitro (Edge Function en Node)');
process.env.PVP_ARBITER_KEY = 'arbiter-test-key';
const env = { SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:8200', SUPABASE_SERVICE_ROLE_KEY: process.env.SERVICE_KEY || 'service-test', PVP_ARBITER_KEY: 'arbiter-test-key' };
let handler = null;
globalThis.Deno = {
  env: { get: (k) => env[k] ?? process.env[k] },
  serve: (h) => { handler = h; },
  readTextFile: (u) => fs.promises.readFile(fileURLToPath(u), 'utf8'),
};
await import(new URL('supabase/functions/pvp-arbiter/index.ts', ROOT));
const call = async (key) => { const r = await handler(new Request('http://x/pvp-arbiter', { method: 'POST', headers: key ? { 'x-arbiter-key': key } : {} })); return { status: r.status, body: await r.json() }; };
const denied = await call('otra-clave');
check(denied.status === 403, `sin la clave compartida: ${denied.status}`);
const denied2 = await call(null);
check(denied2.status === 403, `sin cabecera: ${denied2.status}`);
const t0 = Date.now();
let total = [];
for (let i = 0; i < 4; i++) {
  const r = await call('arbiter-test-key');
  if (!r.body.ok) { check(false, `llamada ${i}: ${JSON.stringify(r.body).slice(0, 200)}`); break; }
  total = total.concat(r.body.matches);
  if (!r.body.matches.length) break;
  console.log(`  · llamada ${i + 1}: ${r.body.matches.length} partidas en ${r.body.ms} ms (motor ${r.body.engine})`);
}
console.log(`  · ${total.length} veredictos en ${Date.now() - t0} ms`);

console.log('\n3) Resultado oficial');
for (const c of cases) {
  const m = row(c.g.id);
  check(c.expect(m), `${c.name}: ${m.status} · gana ${m.winner || 'empate'} (${m.reason}) · culpable ${m.arbiter?.culprit || '-'} (${m.arbiter?.fault || '-'}) · puntos ${JSON.stringify(m.deltas)}`);
}
{ // Un veredicto ya aplicado no se aplica dos veces; uno con órdenes de menos se rechaza
  const id = cases[0].g.id;
  const again = JSON.parse(psql(`set role service_role; select public.pvp_arbiter_verdict(${lit(id)}::uuid, '{"result":"win","winner":"A","reason":"arbiter"}'::jsonb, 0)::text`));
  check(again.already === true, `veredicto repetido: no cambia nada (${again.status})`);
  let blocked = false;
  try { psql(`set role authenticated; select public.pvp_arbiter_pending(5)`); } catch { blocked = true; }
  check(blocked, 'un jugador no puede pedir la lista del árbitro');
}
console.log(fails ? `\n✗ ${fails} fallos` : '\n✓ todo correcto');
process.exit(fails ? 1 : 0);
