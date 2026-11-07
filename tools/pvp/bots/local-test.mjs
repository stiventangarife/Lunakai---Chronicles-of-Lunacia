#!/usr/bin/env node
// local-test.mjs — Rivales bot de la Arena de punta a punta contra PostgreSQL (fase R1). Plan: docs/PLAN_BOTS_ARENA.md.
//
// Un «jugador» (motor sin gráficos, como el cliente) busca rival con las funciones reales del servidor; el bot juega con
// src/tactics/sim/PvpBotRunner.js llamando a pvp_bot_call, como hará la Edge Function `pvp-bot`.
//
// Requisitos: PostgreSQL con todas las migraciones (+ tools/pvp/local/realtime-setup.sql y players-p3.sql) y los bots
// (tools/pvp/bots/bots.sql). Uso: PGARGS="-h /tmp/pg -p 5499 -U postgres" DB=p1 node tools/pvp/bots/local-test.mjs
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
import { execFileSync } from 'node:child_process';

const ROOT = new URL('../../../', import.meta.url);
const { HeadlessCombat } = await import(new URL('src/tactics/sim/HeadlessCombat.js', ROOT));
const { mulberry32 } = await import(new URL('src/tactics/sim/SeededRandom.js', ROOT));
const { playBotTurn, botRng } = await import(new URL('src/tactics/sim/PvpBot.js', ROOT));
const { runBotMatch } = await import(new URL('src/tactics/sim/PvpBotRunner.js', ROOT));

const PG = [...(process.env.PGARGS || '-h /tmp/pg -p 5499 -U postgres').split(' '), '-d', process.env.DB || 'p1', '-At', '-v', 'ON_ERROR_STOP=1'];
const psql = (q) => execFileSync(process.env.PSQL || 'psql', [...PG, '-c', q]).toString().trim().split('\n').pop();
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
const as = (uid, q) => JSON.parse(psql(`select set_config('request.jwt.claim.sub', ${lit(uid)}, false); select (${q})::text`) || 'null');
const botCall = (bot) => async (fn, args) => JSON.parse(psql(`select public.pvp_bot_call(${lit(bot)}::uuid, ${lit(fn)}, ${lit(JSON.stringify(args))}::jsonb)::text`) || 'null');
const U = (i) => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, '0')}`;
const isBot = (uid) => psql(`select public._pvp_is_bot(${lit(uid)}::uuid)`) === 't';
let fails = 0;
const check = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };
const noSleep = async () => {};

function reset() {
  psql(`update public.pvp_matches set status = 'aborted' where status in ('active','ended','disputed'); delete from public.pvp_queue; delete from public.pvp_bot_locks;`);
}
/** El jugador entra en la cola y «espera» `secs` segundos. Con ready (por defecto), su cliente monta el combate y
 *  pide la partida (pvp_match), como PvpBattle.onBattleReady: desde ese momento el bot puede jugar. */
function queueFor(uid, secs, { ready = true } = {}) {
  let r = as(uid, 'public.pvp_enqueue(1::smallint)');
  if (r.status !== 'matched') { // si no había un humano esperando
    psql(`update public.pvp_queue set joined_at = now() - make_interval(secs => ${secs}) where user_id = ${lit(uid)}`);
    r = as(uid, 'public.pvp_enqueue(1::smallint)');
  }
  if (ready && r.match?.id) as(uid, `public.pvp_match(${lit(r.match.id)}::uuid, 0)`);
  return r;
}
/** En la prueba cada llamada a psql tarda: el plazo del turno se alarga para simular a dos jugadores a tiempo. */
const fresh = (id) => psql(`update public.pvp_matches set turn_deadline = now() + interval '45 seconds', last_action_at = now() where id = ${lit(id)} and status = 'active' and turn_deadline is not null`);
const turnOf = (id) => psql(`select coalesce(turn_side, '-') from public.pvp_matches where id = ${lit(id)}`);
/** Lo que haría la Edge Function con todas las partidas pendientes. */
async function botPass(opts = {}) {
  const list = JSON.parse(psql('select public.pvp_bot_pending(20)::text'));
  const results = [];
  for (const p of list) {
    if (psql(`select public.pvp_bot_claim(${lit(p.match)}::uuid)`) !== 't') continue;
    try {
      results.push(await runBotMatch({ call: botCall(p.bot), match: p.match, level: p.level, points: p.points, sleep: noSleep, ...opts }));
    } finally { psql(`select public.pvp_bot_release(${lit(p.match)}::uuid)`); }
  }
  return results;
}

/** Cliente del jugador humano (como PvpSession, sin pantalla): aplica todo lo del servidor, confirma huellas, juega. */
async function humanClient(uid, matchId, { level = 'normal', cheat = null } = {}) {
  const res = as(uid, `public.pvp_match(${lit(matchId)}::uuid, 0)`);
  const m = res.match, side = m.side;
  const e = HeadlessCombat.fromMatch(m, side).start();
  let seq = 0;
  for (const a of res.actions) {
    const h = await e.apply(a.ord);
    const confirm = a.ord.t === 'end' ? a.side !== side : a.ord.t === 'timeout' && a.ord.side === side;
    if (confirm && a.hash) { const ack = as(uid, `public.pvp_ack(${lit(matchId)}::uuid, ${a.seq}, ${lit(h)})`); if (ack.disputed) return { disputed: true, m }; }
    seq++;
  }
  if (e.over && (m.status === 'active' || m.status === 'ended')) {
    // Como el cliente (_maybeReport): al ver el final, informa (el servidor ignora un informe repetido del mismo bando)
    const w = e.result.winnerSide || 'draw';
    as(uid, `public.pvp_report(${lit(matchId)}::uuid, ${lit(w)}, ${lit(e.result.reason === 'rounds' ? 'rounds' : 'elimination')}, ${lit(e.hash())})`);
  }
  if (e.over || m.status !== 'active') return { e, m, side, seq };
  if (e.turnSide !== side) return { e, m, side, seq, waiting: true };
  const plan = HeadlessCombat.fromMatch(m, side).start();
  for (const o of e.log) await plan.apply(o);
  const orders = await playBotTurn(plan, { level, rng: botRng(m.seed ^ 0x77, seq) });
  for (let o of orders) {
    if (cheat) o = cheat(o, e) || o;
    let hash;
    try { hash = await e.apply(o); } catch { hash = '00000000'; } // orden ilegal a propósito: el motor local no la acepta
    const end = o.t === 'end';
    const r = as(uid, `public.pvp_act(${lit(matchId)}::uuid, ${seq}, ${lit(JSON.stringify(o))}::jsonb, ${end ? lit(hash) : 'null'}, ${end ? lit(e.over ? side : e.turnSide) : 'null'})`);
    if (!r.ok) return { e, m, side, seq, error: r.error };
    seq++;
    if (cheat) return { e, m, side, seq, cheated: true };
  }
  if (e.over) {
    const w = e.result.winnerSide || 'draw';
    as(uid, `public.pvp_report(${lit(matchId)}::uuid, ${lit(w)}, ${lit(e.result.reason === 'rounds' ? 'rounds' : 'elimination')}, ${lit(e.hash())})`);
  }
  return { e, m, side, seq };
}

/** Partida entera humano contra bot. */
async function playToEnd(uid, matchId, { level = 'normal', maxLoops = 200 } = {}) {
  let lastSeq = -1, still = 0, why = '';
  for (let i = 0; i < maxLoops; i++) {
    const st = psql(`select status from public.pvp_matches where id = ${lit(matchId)}`);
    if (st === 'finished' || st === 'aborted' || st === 'disputed') return st;
    fresh(matchId);
    const h = await humanClient(uid, matchId, { level });
    if (h.error) return `error:${h.error}`;
    fresh(matchId);
    const b = await botPass();
    why = b.map((x) => x.stop).filter(Boolean).join(',');
    const seq = Number(psql(`select next_seq from public.pvp_matches where id = ${lit(matchId)}`));
    still = seq === lastSeq ? still + 1 : 0;
    lastSeq = seq;
    if (still >= 4) return `atascada en ${seq} (${st}; bot: ${why || '-'})`;
  }
  return 'loop';
}
const row = (id) => JSON.parse(psql(`select (to_jsonb(m) - 'a_snapshot' - 'b_snapshot')::text from public.pvp_matches m where id = ${lit(id)}`));

// ------------------------------------------------------------------------------------------------
console.log('\n0) Sin la Edge Function configurada no hay bots');
reset();
psql(`delete from public.pvp_bot_config`);
{
  const r = queueFor(U(21), 30);
  check(r.status === 'queued', `a los 30 s sigue en la cola: los bots no entran sin pvp_bot_config (${r.status})`);
  as(U(21), 'public.pvp_leave_queue()');
}
// Configuración de prueba (sin pg_net el aviso no sale; la prueba hace de Edge Function)
psql(`insert into public.pvp_bot_config (id, url, key) values (true, 'http://localhost/pvp-bot', 'test') on conflict (id) do nothing`);

console.log('\n1) Emparejar');
reset();
{
  const r1 = queueFor(U(21), 3);
  check(r1.status === 'queued', `a los 3 s sigue en la cola (${r1.status})`);
  const r2 = queueFor(U(21), 11);
  check(r2.status === 'matched', `a los 11 s juega contra un bot (${r2.status})`);
  const m = r2.match;
  const rival = m.side === 'A' ? 'B' : 'A';
  const mrow = row(m.id);
  check(isBot(mrow[rival === 'A' ? 'a_user' : 'b_user']), 'el rival es una cuenta de bot');
  check(m.rivalPresence === false, 'rivalPresence = false para el jugador (sin aviso de «rival desconectado»)');
  check(m[rival]?.name && m[rival]?.axie?.cards?.length === 6 && /^0x/.test(m[rival]?.axie?.genes || ''), `instantánea del bot completa: ${m[rival]?.name} con ${m[rival]?.axie?.name}`);
  const pts = Number(psql(`select points from public.pvp_ratings r join public.pvp_matches x on x.id = ${lit(m.id)} and r.season = x.season and r.user_id = case when x.a_user = ${lit(U(21))}::uuid then x.b_user else x.a_user end`));
  check(pts >= 850 && pts <= 1300, `el bot empieza la temporada con sus puntos de base (${pts})`);
  globalThis.M1 = m.id;

  // Dos humanos esperando: se emparejan entre ellos aunque lleven más de 10 s (el humano siempre gana)
  as(U(22), 'public.pvp_enqueue(1::smallint)');
  psql(`update public.pvp_queue set joined_at = now() - interval '30 seconds'`);
  const r3 = queueFor(U(23), 30);
  const other = r3.match ? row(r3.match.id) : null;
  check(r3.status === 'matched' && other && !isBot(other.a_user) && !isBot(other.b_user), 'dos humanos que esperan juegan entre ellos, no contra bots');
  check(r3.match?.rivalPresence === true, 'rivalPresence = true contra un humano');
  psql(`update public.pvp_matches set status = 'aborted' where id = ${lit(r3.match.id)}`);

  // Un bot en partida no se da a otro jugador
  const r4 = queueFor(U(24), 11);
  const bot1 = mrow[rival === 'A' ? 'a_user' : 'b_user'];
  const r4row = row(r4.match.id);
  check(r4.status === 'matched' && r4row.a_user !== bot1 && r4row.b_user !== bot1, 'un bot ocupado no se empareja con otro jugador');
  psql(`update public.pvp_matches set status = 'aborted' where id = ${lit(r4.match.id)}`);

  // Justo después de jugar contra un bot, el siguiente rival es otro bot (si hay otro libre)
  const r5 = queueFor(U(24), 11);
  const r5row = row(r5.match.id);
  const prev = [r4row.a_user, r4row.b_user].find((x) => x !== U(24));
  const next = [r5row.a_user, r5row.b_user].find((x) => x !== U(24));
  check(r5.status === 'matched' && next !== prev, 'la siguiente partida es contra otro bot (no repite el rival de hace un momento)');
  psql(`update public.pvp_matches set status = 'aborted' where id = ${lit(r5.match.id)}`);
}

console.log('\n2) Partida completa humano contra bot');
{
  const id = globalThis.M1;
  const before = JSON.parse(psql(`select json_object_agg(user_id, points)::text from public.pvp_ratings r join public.pvp_matches x on x.id = ${lit(id)} and r.season = x.season and r.user_id in (x.a_user, x.b_user)`));
  const st = await playToEnd(U(21), id);
  const f = row(id);
  check(st === 'finished', `la partida termina (${st}, motivo ${f.reason}, ganador ${f.winner ?? 'empate'}, ${f.next_seq} órdenes)`);
  check(f.reports?.A && f.reports?.B && f.reports.A.hash === f.reports.B.hash, 'los dos informan el mismo final con la misma huella');
  check(!f.dispute, 'sin disputas: el bot y el jugador ven la misma partida turno a turno');
  const acks = psql(`select count(*) filter (where hash is not null and ack_hash = hash) || '/' || count(*) filter (where hash is not null) from public.pvp_actions where match_id = ${lit(id)}`);
  check(acks.split('/')[0] === acks.split('/')[1], `todas las huellas de fin de turno confirmadas por el rival (${acks})`);
  const after = JSON.parse(psql(`select json_object_agg(user_id, points)::text from public.pvp_ratings r join public.pvp_matches x on x.id = ${lit(id)} and r.season = x.season and r.user_id in (x.a_user, x.b_user)`));
  const changed = Object.keys(after).every((k) => after[k] !== before[k]);
  check(f.rated && changed, `puntos para los dos (${JSON.stringify(f.deltas)}), SLP ${JSON.stringify(f.slp)}`);
  const board = as(U(21), 'public.pvp_board()');
  const names = board.rows.map((r) => r.name);
  check(board.rows.length >= 2 && board.rows.every((r) => !('bot' in r)), `la clasificación muestra al bot como un jugador más (${names.join(', ')})`);
  const stats = JSON.parse(psql('select public.pvp_stats(30)::text'));
  const humans = Number(psql(`select count(*) from public.pvp_matches x where x.status = 'finished' and x.created_at > now() - interval '30 days' and not public._pvp_is_bot(x.a_user) and not public._pvp_is_bot(x.b_user)`));
  check(stats.finished === humans && stats.botMatches >= 1, `pvp_stats solo cuenta partidas entre personas (${stats.finished} = ${humans}; con bot aparte: ${stats.botMatches})`);
}

console.log('\n2b) El bot espera a que el jugador tenga el combate en pantalla');
{
  // El caso que se veía: empieza el bot (se repite el emparejamiento hasta que le toque empezar a él)
  let r, tries = 0;
  do {
    reset();
    r = queueFor(U(27), 11, { ready: false }); // presentación «VS» y carga del combate
  } while (HeadlessCombat.fromMatch(r.match, r.match.side).start().turnSide === r.match.side && ++tries < 12);
  const id = r.match.id;
  const b1 = await botPass();
  check(b1.length && b1.every((x) => x.stop === 'waiting_ready' && !x.played && !x.timeout), `mientras carga, el bot no juega ni reclama tiempo (${b1.map((x) => x.stop).join(',')})`);
  check(Number(psql(`select next_seq from public.pvp_matches where id = ${lit(id)}`)) === 0, 'ninguna orden todavía');
  const botView = JSON.parse(psql(`select public.pvp_bot_call(case when a_user = ${lit(U(27))}::uuid then b_user else a_user end, 'match', jsonb_build_object('match', id))::text from public.pvp_matches where id = ${lit(id)}`));
  check(botView.match && botView.match.rivalReadyAt === null, 'el bot ve rivalReadyAt = null');
  // El jugador tardó en cargar: al turno en curso le quedan 5 s
  psql(`update public.pvp_matches set turn_deadline = now() + interval '5 seconds' where id = ${lit(id)}`);
  const seen = as(U(27), `public.pvp_match(${lit(id)}::uuid, 0)`);
  const left = (new Date(seen.match.turnDeadline) - new Date(seen.match.now)) / 1000;
  check(psql(`select count(*) from public.pvp_bot_ready where match_id = ${lit(id)}`) === '1', 'al montar el combate, el servidor lo anota (pvp_bot_ready)');
  check(left > 40, `y el turno en curso vuelve a tener su tiempo completo (${left.toFixed(0)} s)`);
  as(U(27), `public.pvp_match(${lit(id)}::uuid, 0)`);
  check(psql(`select count(*) from public.pvp_bot_ready where match_id = ${lit(id)}`) === '1', 'pedir la partida otra vez no cambia nada');
  const human = r.match.side;
  const startsBot = HeadlessCombat.fromMatch(r.match, human).start().turnSide !== human;
  let waited = 0;
  const b2 = await botPass({ sleep: async (ms) => { waited = Math.max(waited, ms); } });
  check(b2.every((x) => x.stop !== 'waiting_ready'), 'ya listo: el bot sigue');
  if (startsBot) {
    check(b2.some((x) => x.played > 0), `empieza el bot: juega (${b2.map((x) => x.played).join(',')} órdenes)`);
    check(waited >= 3000, `su primera acción, como pronto unos segundos después de que el jugador vea el tablero (${waited} ms)`);
  } else check(b2.every((x) => !x.played), 'empieza el jugador: el bot espera su turno');
  // Tope: si el jugador nunca termina de cargar (cerró el juego), el bot acaba jugando
  reset();
  const r2 = queueFor(U(28), 11, { ready: false });
  psql(`update public.pvp_matches set created_at = now() - interval '2 minutes' where id = ${lit(r2.match.id)}`);
  const b3 = await botPass();
  check(b3.every((x) => x.stop !== 'waiting_ready'), 'si el jugador no carga en 90 s, el bot deja de esperar');
}

console.log('\n3) Tiempo agotado del jugador');
{
  reset();
  const r = queueFor(U(25), 11);
  const id = r.match.id;
  // Hasta que le toque al jugador (sin que juegue): si empieza el bot, juega el bot
  const human = r.match.side;
  let guard = 0;
  while (turnOf(id) !== human && guard++ < 6) {
    if (turnOf(id) === '-') {
      // nadie ha jugado aún: si empieza el jugador, no juega; si empieza el bot, que juegue
      const e = HeadlessCombat.fromMatch(r.match, human).start();
      if (e.turnSide === human) break;
    }
    fresh(id); await botPass();
  }
  // Le toca al jugador y no juega: tiempo vencido
  const tb = row(id);
  psql(`update public.pvp_matches set turn_deadline = now() - interval '1 minute' where id = ${lit(id)}`);
  const before = Number(psql(`select next_seq from public.pvp_matches where id = ${lit(id)}`));
  const res = await botPass();
  const acts = JSON.parse(psql(`select json_agg(ord order by seq)::text from public.pvp_actions where match_id = ${lit(id)} and seq >= ${before}`) || '[]') || [];
  check(res.some((x) => x.timeout) && acts[0]?.t === 'timeout', `el bot pide el fin forzado del turno del jugador (turno de ${tb.turn_side})`);
  check(acts.length > 1, `y luego juega su turno (${acts.length - 1} órdenes)`);
}

console.log('\n4) Orden ilegal del jugador');
{
  reset();
  const r = queueFor(U(26), 11);
  const id = r.match.id;
  fresh(id); await botPass();
  let h = await humanClient(U(26), id, { cheat: (o) => (o.t === 'move' || o.t === 'cast' ? { ...o, t: 'move', x: 0, z: 0 } : { t: 'move', unit: o.unit, x: 0, z: 0 }) });
  let guard = 0;
  while (!h.cheated && guard++ < 5) { await botPass(); h = await humanClient(U(26), id, { cheat: (o) => ({ t: 'move', unit: o.unit, x: 0, z: 0 }) }); }
  await botPass();
  const f = row(id);
  check(f.status === 'disputed', `el bot no acepta la orden ilegal y abre la disputa (estado ${f.status})`);
}

console.log('\n5) Llamadas del bot solo para bots');
{
  const r = psql(`select public.pvp_bot_call(${lit(U(21))}::uuid, 'match', '{}'::jsonb)::text`);
  check(JSON.parse(r).error === 'not_a_bot', 'pvp_bot_call rechaza a un usuario que no es bot');
  const g = psql(`select has_function_privilege('authenticated', 'public.pvp_bot_call(uuid, text, jsonb)', 'execute')::text`);
  check(g === 'false', 'un jugador con sesión no puede llamar a pvp_bot_call');
  const g2 = psql(`select has_function_privilege('service_role', 'public.pvp_bot_call(uuid, text, jsonb)', 'execute')::text`);
  check(g2 === 'true', 'la clave de servicio (Edge Function) sí');
}

console.log('\n6) Varias partidas seguidas (jugadores de distinta fuerza)');
{
  let finished = 0, disputes = 0, total = 0, botWins = 0;
  for (let k = 0; k < Number(process.env.GAMES || 4); k++) {
    reset();
    const uid = U(27 + k);
    const r = queueFor(uid, 11);
    if (r.status !== 'matched') continue;
    total++;
    const st = await playToEnd(uid, r.match.id, { level: ['novice', 'normal', 'strong'][k % 3] });
    const f = row(r.match.id);
    if (st === 'finished') finished++;
    else console.log(`    · partida ${k}: ${st} ${JSON.stringify(row(r.match.id).dispute || '')}`);
    if (f.dispute) disputes++;
    const botSide = isBot(f.a_user) ? 'A' : 'B';
    if (f.winner === botSide) botWins++;
  }
  check(finished === total && disputes === 0, `${finished}/${total} partidas terminadas sin disputas (el bot ganó ${botWins})`);
}

console.log('\n7) Sin cambios para las partidas entre personas');
{
  reset();
  // Al repetir la prueba sus puntos se van separando; igualados, se emparejan al instante como dos jugadores parejos
  psql(`update public.pvp_ratings set points = 1000 where user_id in (${lit(U(38))}, ${lit(U(39))})`);
  as(U(38), 'public.pvp_enqueue(1::smallint)');
  const r = as(U(39), 'public.pvp_enqueue(1::smallint)');
  const id = r.match?.id;
  let st = r.status, guard = 0;
  while (id && guard++ < 300) {
    st = psql(`select status from public.pvp_matches where id = ${lit(id)}`);
    if (st !== 'active' && st !== 'ended') break;
    fresh(id);
    await humanClient(U(38), id, { level: 'normal' });
    fresh(id);
    await humanClient(U(39), id, { level: 'strong' });
  }
  const f = id ? row(id) : {};
  // Regla antiabuso de siempre: el mismo par solo puntúa 3 partidas al día (al repetir la prueba, la 4.ª no puntúa)
  const pairToday = Number(psql(`select count(*) from public.pvp_matches x where x.status = 'finished' and x.rated and x.id <> ${lit(id)} and public._pvp_day(x.ended_at) = public._pvp_day(now()) and ((x.a_user = ${lit(U(38))} and x.b_user = ${lit(U(39))}) or (x.a_user = ${lit(U(39))} and x.b_user = ${lit(U(38))}))`));
  check(r.status === 'matched' && st === 'finished' && f.rated === (pairToday < 3) && !f.dispute, `dos personas: emparejadas al instante, partida terminada, puntos según la regla diaria (${f.reason}, ${JSON.stringify(f.deltas)})`);
  const pend = JSON.parse(psql('select public.pvp_bot_pending(50)::text'));
  check(!pend.some((p) => p.match === id), 'la Edge Function de los bots no toca partidas entre personas');
}

reset();
console.log(fails ? `\n✗ ${fails} fallos` : '\n✓ todo correcto');
process.exit(fails ? 1 : 0);
