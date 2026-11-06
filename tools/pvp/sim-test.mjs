#!/usr/bin/env node
// sim-test.mjs — Pruebas del motor de combate sin gráficos (Arena PvP, fase P0).
// Uso: node tools/pvp/sim-test.mjs [partidas=40] [repeticiones=100]
//
// 1. Determinismo: cada partida (mapa, semilla y equipos distintos, órdenes elegidas al azar entre las legales) se
//    repite N veces desde su registro y debe dar SIEMPRE las mismas huellas y el mismo resultado.
// 2. Misma partida jugada dos veces = registros idénticos; otra semilla = otra partida.
// 3. El árbitro detecta una huella cambiada (desincronización) y una orden ilegal.
// 4. Arena (P3): equipos igualados desde la instantánea; la misma partida vista desde A y desde B da las mismas huellas.
// 5. Cobertura: cuántas cartas distintas, gólems, empujes, muertes y finales por rondas se han visto.
// Sale con código 1 si algo falla.

globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };

const root = new URL('../../src/tactics/', import.meta.url);
const { replay, playRandom } = await import(new URL('sim/CombatReplay.js', root));
const { setupFor } = await import('./test-teams.js');

const GAMES = Number(process.argv[2]) || 40;
const REPEATS = Number(process.argv[3]) || 100;

let fails = 0;
const fail = (msg) => { fails++; console.log('  ✗', msg); };
const ok = (msg) => console.log('  ✓', msg);

const seen = { spells: new Set(), golems: 0, results: {}, rounds: 0, orders: 0 };
const t0 = Date.now();

console.log(`\n1) Determinismo: ${GAMES} partidas × ${REPEATS} repeticiones`);
const records = [];
for (let k = 0; k < GAMES; k++) {
  const setup = setupFor(k);
  const { record, combat } = await playRandom(setup, { pickSeed: 1000 + k });
  records.push(record);
  seen.orders += record.orders.length;
  for (const o of record.orders) if (o.t === 'cast') seen.spells.add(o.spell);
  seen.golems += combat.sm.golems.golems.length;
  const key = record.result ? `${record.result.reason}:${record.result.winner}` : 'sin_final';
  seen.results[key] = (seen.results[key] || 0) + 1;
  if (record.result?.reason === 'rounds') seen.rounds++;
  let bad = 0;
  for (let r = 0; r < REPEATS; r++) {
    const rep = await replay(record);
    if (!rep.ok || JSON.stringify(rep.result) !== JSON.stringify(record.result)) { bad++; if (bad === 1) fail(`partida ${k} (${setup.mapId}): la repetición ${r} se separa en la orden ${rep.divergeAt} ${rep.error ? JSON.stringify(rep.error) : ''}`); }
  }
  if (!bad && k < 6) ok(`partida ${k} · ${setup.mapId} · ${record.orders.length} órdenes · ${key} en la ronda ${record.result?.round} · huella final ${record.orders.at(-1)?.h}`);
}
if (!fails) ok(`todas iguales (${GAMES * REPEATS} repeticiones, ${seen.orders} órdenes por pasada)`);

console.log('\n2) Misma partida dos veces / otra semilla');
{
  const s = setupFor(3);
  const a = await playRandom(s, { pickSeed: 42 }), b = await playRandom(s, { pickSeed: 42 });
  JSON.stringify(a.record) === JSON.stringify(b.record) ? ok('mismos registros') : fail('dos partidas iguales dieron registros distintos');
  const c = await playRandom({ ...s, seed: s.seed + 1 }, { pickSeed: 42 });
  JSON.stringify(a.record.orders) !== JSON.stringify(c.record.orders) ? ok('otra semilla, otra partida') : fail('la semilla no cambia nada');
}

console.log('\n3) Árbitro: desincronización y órdenes ilegales');
{
  const rec = JSON.parse(JSON.stringify(records[0]));
  const i = Math.floor(rec.orders.length / 2);
  rec.orders[i].h = 'deadbeef';
  const r = await replay(rec);
  r.divergeAt === i ? ok(`huella cambiada detectada en la orden ${i}`) : fail(`desincronización no detectada (divergeAt ${r.divergeAt})`);

  const rec2 = JSON.parse(JSON.stringify(records[0]));
  const j = rec2.orders.findIndex((o) => o.t === 'move');
  if (j >= 0) {
    rec2.orders[j] = { ...rec2.orders[j], x: 99, z: 99 };
    const r2 = await replay(rec2);
    r2.error?.code === 'bad_move' ? ok(`movimiento imposible rechazado (orden ${j})`) : fail(`movimiento imposible aceptado: ${JSON.stringify(r2.error)}`);
  }
  const rec3 = JSON.parse(JSON.stringify(records[0]));
  rec3.orders[0] = { ...rec3.orders[0], unit: rec3.orders[0].unit.startsWith('A') ? 'B_axie' : 'A_axie' };
  const r3 = await replay(rec3);
  r3.error?.code === 'not_your_turn' ? ok('orden fuera de turno rechazada') : fail(`orden fuera de turno aceptada: ${JSON.stringify(r3.error)}`);
  const rec4 = JSON.parse(JSON.stringify(records[0]));
  const c = rec4.orders.findIndex((o) => o.t === 'cast');
  if (c >= 0) {
    rec4.orders[c] = { ...rec4.orders[c], spell: 'werewolf_boss_cataclysm' };
    const r4 = await replay(rec4);
    r4.error?.code === 'no_spell' ? ok('carta ajena rechazada') : fail(`carta ajena aceptada: ${JSON.stringify(r4.error)}`);
  }
}

console.log('\n3b) Fin de turno forzado (timeout) y bando del turno');
{
  const { HeadlessCombat } = await import(new URL('sim/HeadlessCombat.js', root));
  const c = new HeadlessCombat(setupFor(2)).start();
  const before = c.activeUnit.id, side0 = c.turnSide;
  await c.apply({ t: 'timeout' });
  const after = c.activeUnit.id;
  before !== after && ['A', 'B'].includes(c.turnSide) ? ok(`timeout pasa el turno (${before} → ${after}, bando ${side0} → ${c.turnSide})`) : fail('timeout no pasa el turno');
  const rec = (await playRandom(setupFor(2), { pickSeed: 9 })).record;
  const withTimeout = { ...rec, orders: [{ t: 'timeout' }, ...rec.orders.slice(0, 0)] };
  const r = await replay(withTimeout);
  r.error ? fail(`registro con timeout: ${JSON.stringify(r.error)}`) : ok('un registro con timeout se repite');
}

console.log('\n4) Partidas de la Arena: equipos igualados y las dos perspectivas (P3)');
{
  const { HeadlessCombat } = await import(new URL('sim/HeadlessCombat.js', root));
  const { pvpCombatSetup } = await import(new URL('sim/PvpRoster.js', root));
  const { variantId } = await import(new URL('data/VariantCards.js', root));
  const { SPELLS_DB } = await import(new URL('data/SpellsDB.js', root));
  const { mulberry32 } = await import(new URL('sim/SeededRandom.js', root));
  const MAPS = ['forest_maple_glade', 'forest_river_ford', 'savannah_oasis', 'savannah_canyon'];
  const CLS = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile'];
  const SAPS = ['crafter', 'shepard', 'lunalogist', 'stargazer'];
  const allIds = Object.keys(SPELLS_DB);
  const snap = (k, name) => {
    const cls = CLS[k % CLS.length];
    const parts = allIds.filter((id) => id.startsWith(`part_${cls}_`));
    const cards = Array.from({ length: 6 }, (_, i) => parts[(k * 5 + i * 11) % parts.length]);
    const base = cards[0];
    const v = { id: variantId(base, 'Prueba Mística', 2), baseId: base, name: 'Prueba Mística', stage: 2, collection: 'mystic' };
    cards[0] = v.id;
    return { name, sapidaeClass: SAPS[k % 4], sapidaeModel: 'sapidae-m-a', customization: { hair: 'original', hasHat: false, evil: { x: 1 } },
      axie: { axieId: String(1000 + k), name: `Axie ${k}`, class: cls[0].toUpperCase() + cls.slice(1), cards, variants: [v], collections: ['mystic'] } };
  };
  let games = 0, orders = 0, bad = 0;
  for (let k = 0; k < 16; k++) {
    // k % 4 === 0: los dos jugadores llevan lo mismo (empate de iniciativa → decide el desempate del servidor)
    const match = { id: `m${k}`, seed: (0x85EBCA6B * (k + 7)) >>> 0, map: MAPS[k % MAPS.length], tieBreak: k % 2 ? 'B' : 'A', maxRounds: 25,
      A: snap(k, 'Ana'), B: snap(k % 4 === 0 ? k : k + 3, 'Bea') };
    const ea = HeadlessCombat.fromMatch(match, 'A').start(), eb = HeadlessCombat.fromMatch(match, 'B').start();
    if (ea.hash() !== eb.hash() || ea.turnSide !== eb.turnSide) { bad++; fail(`partida ${k}: las dos perspectivas empiezan distinto`); continue; }
    if (k % 4 === 0 && ea.turnSide !== match.tieBreak) { bad++; fail(`partida ${k}: con empate de iniciativa empieza ${ea.turnSide} y no ${match.tieBreak}`); }
    const pick = mulberry32(500 + k);
    let n = 0;
    while (!ea.over && n++ < 2000) {
      const legal = ea.legalOrders();
      const casts = legal.filter((o) => o.t === 'cast'), moves = legal.filter((o) => o.t === 'move'), r = pick();
      const order = r < 0.03 ? { t: 'timeout' } : casts.length && r < 0.6 ? casts[Math.floor(pick() * casts.length)]
        : moves.length && r < 0.85 ? moves[Math.floor(pick() * moves.length)] : legal.find((o) => o.t === 'end');
      const ha = await ea.apply(order);
      let hb;
      try { hb = await eb.apply(order); } catch (e) { hb = `ilegal:${e.code}`; }
      orders++;
      if (ha !== hb || ea.turnSide !== eb.turnSide) { bad++; fail(`partida ${k}: la perspectiva B se separa en la orden ${n} (${JSON.stringify(order)})`); break; }
    }
    if (ea.result?.winnerSide !== eb.result?.winnerSide || ea.result?.reason !== eb.result?.reason) { bad++; fail(`partida ${k}: resultados distintos ${JSON.stringify(ea.result)} / ${JSON.stringify(eb.result)}`); }
    games++;
  }
  if (!bad) ok(`${games} partidas, ${orders} órdenes: huellas, turnos y ganador idénticos vistos desde A y desde B`);
  const s = pvpCombatSetup({ seed: 1, map: MAPS[0], tieBreak: 'A', A: snap(1, 'Ana'), B: snap(2, 'Bea') }, 'B');
  const ax = s.units.find((u) => u.id === 'A_axie');
  const sapB = s.units.find((u) => u.id === 'B_sapidae');
  ax.team === 'enemy' && sapB.team === 'player' ? ok('el bando B se ve abajo (sus unidades son «player»)') : fail('perspectiva B mal montada');
  ax.spellIds[0].startsWith('var_') ? ok('variante de nivel 2 del rival registrada') : fail('variante del rival no registrada');
  !('evil' in (sapB.customization || {})) ? ok('personalización limpiada (solo valores simples)') : fail('la personalización deja pasar objetos');
  const fake = pvpCombatSetup({ seed: 1, map: MAPS[0], tieBreak: 'A', A: snap(1, 'Ana'),
    B: { ...snap(2, 'Bea'), axie: { ...snap(2, 'Bea').axie, cards: ['kotaro_slash', 'werewolf_boss_cataclysm', 'var_x_y'], variants: [{ id: 'part_beast_x', baseId: 'nope', name: 'x' }] } } }, 'A');
  const fb = fake.units.find((u) => u.id === 'B_axie');
  !fb.spellIds.includes('werewolf_boss_cataclysm') && !fb.spellIds.includes('var_x_y') ? ok('cartas que no son de partes rechazadas') : fail(`cartas ajenas aceptadas: ${fb.spellIds}`);
}

console.log('\n4b) Mapas de la Arena (fase P5): los de la lista del servidor existen, son simétricos y las salidas también');
{
  const fs = await import('node:fs');
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const files = fs.readdirSync(dir).filter((f) => /arena/.test(f)).sort();
  let list = null;
  for (const f of files) {
    const m = fs.readFileSync(new URL(f, dir), 'utf8').match(/'maps', jsonb_build_array\(([^)]*)\)/);
    if (m) list = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  }
  const { getBattleMap } = await import(new URL('maps/BattleMaps.js', root));
  const { pvpSpawns } = await import(new URL('sim/PvpRoster.js', root));
  if (!list) fail('no se encontró la lista de mapas del servidor');
  else {
    const bad = list.filter((id) => {
      const m = getBattleMap(id);
      if (!m || m.boss) return true;
      const L = m.layout, rot = L.map((r) => [...r].reverse().join('')).reverse().map((r) => r.replace(/[PE]/g, (c) => (c === 'P' ? 'E' : 'P')));
      return rot.join('|') !== L.join('|') || !pvpSpawns(m).symmetric;
    });
    bad.length ? fail(`mapas de la Arena que no valen: ${bad.join(', ')}`) : ok(`${list.length} mapas en la lista del servidor (${files.at(-1)}): todos simétricos, con salidas giradas`);
  }
}

console.log('\n5) Cobertura');
console.log(`  cartas distintas lanzadas: ${seen.spells.size} · gólems invocados: ${seen.golems} · finales por rondas: ${seen.rounds}`);
console.log(`  resultados: ${JSON.stringify(seen.results)}`);
console.log(`  tiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);

console.log(fails ? `\n✗ ${fails} fallos` : '\n✓ todo correcto');
process.exit(fails ? 1 : 0);
