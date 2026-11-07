#!/usr/bin/env node
// function-test.mjs — La Edge Function supabase/functions/pvp-bot/index.ts en Node, contra PostgreSQL (fase R2).
// Plan: docs/PLAN_BOTS_ARENA.md.
//
// Un Deno mínimo de prueba (env, serve) y un fetch que lleva /rest/v1/rpc/<fn> a PostgreSQL con el rol service_role
// (como hace Supabase con la clave de servicio). Un «jugador» juega con las funciones reales; la función juega al bot.
//
// Requisitos: PostgreSQL con las migraciones (incluida 20261113000000_arena_bots.sql), tools/pvp/local/realtime-setup.sql,
// tools/pvp/local/players-p3.sql y tools/pvp/bots/bots.sql; y `node tools/pvp/bots/build.mjs` hecho.
// Uso: PGARGS="-h /tmp/pg -p 5499 -U postgres" DB=p1 node --experimental-strip-types tools/pvp/bots/function-test.mjs [--real]
//      --real: además, un turno del bot con las pausas de verdad (tarda ~10–40 s)
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
import { execFile, execFileSync } from 'node:child_process';

const ROOT = new URL('../../../', import.meta.url);
const { HeadlessCombat } = await import(new URL('src/tactics/sim/HeadlessCombat.js', ROOT));
const { playBotTurn, botRng } = await import(new URL('src/tactics/sim/PvpBot.js', ROOT));

const PG = [...(process.env.PGARGS || '-h /tmp/pg -p 5499 -U postgres').split(' '), '-d', process.env.DB || 'p1', '-At', '-v', 'ON_ERROR_STOP=1'];
const psql = (q) => execFileSync(process.env.PSQL || 'psql', [...PG, '-c', q]).toString().trim().split('\n').pop();
const psqlAsync = (q) => new Promise((res, rej) => execFile(process.env.PSQL || 'psql', [...PG, '-c', q], (e, out, err) => (e ? rej(new Error(err || e.message)) : res(out.trim().split('\n').pop()))));
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
const as = (uid, q) => JSON.parse(psql(`select set_config('request.jwt.claim.sub', ${lit(uid)}, false); select (${q})::text`) || 'null');
const U = (i) => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, '0')}`;
let fails = 0;
const check = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };
const REAL = process.argv.includes('--real');

// ---------------------------------------------------------------- Deno mínimo + Supabase (rpc → PostgreSQL)
const ENV = { SUPABASE_URL: 'http://supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'service-test', PVP_BOT_KEY: 'bot-test-key', PVP_BOT_FAST: '1' };
let handler = null;
globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => { handler = h; } };
const types = {};
async function argTypes(fn) {
  if (!types[fn]) {
    const out = await psqlAsync(`select array_to_json(proargnames)::text || '|' || array_to_json(array(select format_type(t, null) from unnest(proargtypes) t))::text from pg_proc where proname = ${lit(fn)} and pronamespace = 'public'::regnamespace`);
    const [n, t] = out.split('|'); const names = JSON.parse(n || '[]'), tps = JSON.parse(t || '[]');
    types[fn] = Object.fromEntries(names.map((x, i) => [x, tps[i]]));
  }
  return types[fn];
}
const calls = { total: 0, byFn: {} };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const m = String(url).match(/^http:\/\/supabase\.test\/rest\/v1\/rpc\/(\w+)/);
  if (!m) return realFetch(url, init);
  if (init.headers?.apikey !== ENV.SUPABASE_SERVICE_ROLE_KEY) return new Response('{"message":"bad key"}', { status: 401 });
  const fn = m[1]; const args = JSON.parse(init.body || '{}');
  calls.total++; calls.byFn[fn] = (calls.byFn[fn] || 0) + 1;
  if (fn === 'pvp_bot_call') calls.byFn[`call:${args.p_fn}`] = (calls.byFn[`call:${args.p_fn}`] || 0) + 1;
  const t = await argTypes(fn);
  const parts = Object.entries(args).filter(([k]) => t[k]).map(([k, v]) => `${k} => ${v === null ? 'null' : t[k] === 'jsonb' ? lit(JSON.stringify(v)) + '::jsonb' : lit(typeof v === 'object' ? JSON.stringify(v) : v) + '::' + t[k]}`);
  try {
    const out = await psqlAsync(`set role service_role; select to_jsonb(public.${fn}(${parts.join(', ')}))`);
    return new Response(out, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ message: String(e.message).slice(0, 300) }), { status: 400 });
  }
};
const FN = new URL('supabase/functions/pvp-bot/index.ts', ROOT);
await import(FN);
const invoke = async (body = {}, key = ENV.PVP_BOT_KEY) => {
  const res = await handler(new Request('http://fn.test/pvp-bot', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'x-bot-key': key } : {}) }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};

// ---------------------------------------------------------------- el jugador (como el cliente, sin pantalla)
const reset = () => psql(`update public.pvp_matches set status = 'aborted' where status in ('active','ended','disputed'); delete from public.pvp_queue; delete from public.pvp_bot_locks;`);
const fresh = (id) => psql(`update public.pvp_matches set turn_deadline = now() + interval '45 seconds', last_action_at = now() where id = ${lit(id)} and status = 'active' and turn_deadline is not null`);
const row = (id) => JSON.parse(psql(`select (to_jsonb(m) - 'a_snapshot' - 'b_snapshot')::text from public.pvp_matches m where id = ${lit(id)}`));
function queueFor(uid, secs) {
  const first = as(uid, 'public.pvp_enqueue(1::smallint)');
  if (first.status === 'matched') return first;
  psql(`update public.pvp_queue set joined_at = now() - make_interval(secs => ${secs}) where user_id = ${lit(uid)}`);
  return as(uid, 'public.pvp_enqueue(1::smallint)');
}
async function humanTurn(uid, matchId, level = 'normal') {
  const res = as(uid, `public.pvp_match(${lit(matchId)}::uuid, 0)`);
  const m = res.match, side = m.side;
  const e = HeadlessCombat.fromMatch(m, side).start();
  let seq = 0;
  for (const a of res.actions) {
    const h = await e.apply(a.ord);
    const confirm = a.ord.t === 'end' ? a.side !== side : a.ord.t === 'timeout' && a.ord.side === side;
    if (confirm && a.hash) as(uid, `public.pvp_ack(${lit(matchId)}::uuid, ${a.seq}, ${lit(h)})`);
    seq++;
  }
  const report = () => as(uid, `public.pvp_report(${lit(matchId)}::uuid, ${lit(e.result.winnerSide || 'draw')}, ${lit(e.result.reason === 'rounds' ? 'rounds' : 'elimination')}, ${lit(e.hash())})`);
  if (e.over && (m.status === 'active' || m.status === 'ended')) { report(); return 'over'; }
  if (m.status !== 'active') return m.status;
  if (e.turnSide !== side) return 'waiting';
  const plan = HeadlessCombat.fromMatch(m, side).start();
  for (const o of e.log) await plan.apply(o);
  for (const o of await playBotTurn(plan, { level, rng: botRng(m.seed ^ 0x77, seq) })) {
    const hash = await e.apply(o);
    const end = o.t === 'end';
    const r = as(uid, `public.pvp_act(${lit(matchId)}::uuid, ${seq}, ${lit(JSON.stringify(o))}::jsonb, ${end ? lit(hash) : 'null'}, ${end ? lit(e.over ? side : e.turnSide) : 'null'})`);
    if (!r.ok) return `error:${r.error}`;
    seq++;
  }
  if (e.over) { report(); return 'over'; }
  return 'played';
}

// ---------------------------------------------------------------- pruebas
psql(`insert into public.pvp_bot_config (id, url, key) values (true, 'http://fn.test/pvp-bot', ${lit(ENV.PVP_BOT_KEY)}) on conflict (id) do update set url = excluded.url, key = excluded.key`);
psql(`select 1`); // (sin pg_net el aviso de la base de datos no sale: la prueba llama a la función a mano, como haría el aviso)

console.log('\n1) Acceso');
{
  const a = await invoke({}, null);
  check(a.status === 403, `sin clave: 403 (${a.status})`);
  const b = await invoke({}, 'otra-clave');
  check(b.status === 403, `clave equivocada: 403 (${b.status})`);
  const c = await invoke({});
  check(c.status === 200 && c.body.ok && Array.isArray(c.body.matches), `con la clave: 200 y resumen (${c.body.matches?.length ?? '?'} partidas, motor ${c.body.engine})`);
}

console.log('\n2) Partida completa: jugador contra la función');
reset();
{
  const r = queueFor(U(36), 11);
  const id = r.match.id;
  check(r.status === 'matched', 'emparejado con un bot a los 11 s');
  let st = 'active', guard = 0, invocations = 0, botOrders = 0;
  while (guard++ < 120) {
    st = psql(`select status from public.pvp_matches where id = ${lit(id)}`);
    if (st !== 'active' && st !== 'ended') break;
    fresh(id);
    const h = await humanTurn(U(36), id);
    if (h.startsWith('error')) { st = h; break; }
    fresh(id);
    const res = await invoke({ match: id }); // lo que haría el aviso de la base de datos
    invocations++;
    botOrders += (res.body.matches || []).filter((x) => x.match === id).reduce((t, x) => t + (x.played || 0), 0);
  }
  const f = row(id);
  check(st === 'finished' && !f.dispute, `terminada sin disputas (${st}, ${f.reason}, ganador ${f.winner ?? 'empate'}, ${f.next_seq} órdenes, ${botOrders} del bot en ${invocations} llamadas)`);
  check(f.reports?.A?.hash && f.reports.A.hash === f.reports?.B?.hash, 'el bot informó el mismo final que el jugador');
  check(psql(`select count(*) from public.pvp_bot_locks`) === '0', 'no quedan partidas reservadas');
}

console.log('\n3) Dos avisos a la vez para la misma partida');
reset();
{
  const r = queueFor(U(37), 11);
  const id = r.match.id;
  // Hasta que le toque al bot
  for (let i = 0; i < 4; i++) {
    const m = as(U(37), `public.pvp_match(${lit(id)}::uuid, 0)`).match;
    const e = HeadlessCombat.fromMatch(m, m.side).start();
    for (const a of as(U(37), `public.pvp_match(${lit(id)}::uuid, 0)`).actions) await e.apply(a.ord);
    if (e.turnSide !== m.side) break;
    fresh(id); await humanTurn(U(37), id);
  }
  const before = Number(psql(`select next_seq from public.pvp_matches where id = ${lit(id)}`));
  const [a, b] = await Promise.all([invoke({ match: id }), invoke({ match: id })]);
  const played = [a, b].flatMap((x) => x.body.matches || []).filter((x) => x.match === id && (x.played || 0) > 0).length;
  const errors = [a, b].flatMap((x) => x.body.matches || []).filter((x) => x.error || (x.stop && x.stop !== 'disputed')).map((x) => x.error || x.stop);
  const after = row(id);
  check(played === 1, `solo una de las dos llamadas juega el turno (${played})`);
  check(!after.dispute && after.status === 'active' && after.next_seq > before, `la partida sigue bien (${before} → ${after.next_seq} órdenes, ${errors.length ? 'avisos: ' + errors.join(',') : 'sin errores'})`);
}

console.log('\n4) Partida atascada (aviso perdido): la tarea de cada minuto');
reset();
{
  const r = queueFor(U(38), 11);
  const id = r.match.id;
  const tick = psql(`update public.pvp_matches set last_action_at = now() - interval '1 minute' where id = ${lit(id)}; select public.pvp_bot_tick()`);
  check(Number(tick) >= 1, `pvp_bot_tick la ve (${tick}) y avisa a la función`);
  const res = await invoke({}); // aviso sin partida, como el de la tarea
  check((res.body.matches || []).some((x) => x.match === id), 'la función, sin partida en el aviso, recoge las pendientes');
}

if (REAL) {
  console.log('\n5) Un turno del bot con las pausas reales');
  reset();
  ENV.PVP_BOT_FAST = '0';
  // La función lee PVP_BOT_FAST al cargar: se carga otra copia sin el modo rápido
  await import(FN.href + '?real');
  const r = queueFor(U(39), 11);
  const id = r.match.id;
  for (let i = 0; i < 4; i++) {
    const m = as(U(39), `public.pvp_match(${lit(id)}::uuid, 0)`).match;
    const e = HeadlessCombat.fromMatch(m, m.side).start();
    for (const a of as(U(39), `public.pvp_match(${lit(id)}::uuid, 0)`).actions) await e.apply(a.ord);
    if (e.turnSide !== m.side) break;
    fresh(id); await humanTurn(U(39), id);
  }
  fresh(id);
  const t0 = Date.now();
  const res = await invoke({ match: id });
  const ms = Date.now() - t0;
  const mine = (res.body.matches || []).find((x) => x.match === id) || {};
  const gaps = JSON.parse(psql(`select coalesce(json_agg(extract(epoch from at - lag) order by seq), '[]')::text from (select seq, at, lag(at) over (order by seq) lag from public.pvp_actions where match_id = ${lit(id)}) z where lag is not null`));
  check(mine.played > 0 && ms < 40000, `el bot juega ${mine.played} órdenes en ${(ms / 1000).toFixed(1)} s (dentro de los 45 s del turno)`);
  console.log(`    pausas entre órdenes: ${gaps.slice(-mine.played).map((g) => Number(g).toFixed(1)).join(' · ')} s`);
}

reset();
console.log(`\nllamadas al servidor: ${calls.total} · ${JSON.stringify(calls.byFn)}`);
console.log(fails ? `\n✗ ${fails} fallos` : '\n✓ todo correcto');
process.exit(fails ? 1 : 0);
