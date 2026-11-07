#!/usr/bin/env node
// bot-test.mjs — Pruebas del cerebro de los bots de la Arena (src/tactics/sim/PvpBot.js). Plan: docs/PLAN_BOTS_ARENA.md, R0.
// Uso: node tools/pvp/bot-test.mjs [partidas por pareja de niveles=120] [--seed n]
//
//   1) Legalidad y final: en todos los mapas de la Arena, con equipos al azar, el bot solo manda órdenes que el motor
//      acepta y la partida siempre termina (≤ 25 rondas).
//   2) Determinismo: la misma partida dos veces da las mismas órdenes y la misma huella final.
//   3) Fuerza: cada nivel contra el anterior (y contra el jugador automático sencillo de las pruebas), cambiando de
//      bando con la misma semilla, para que el bando y el mapa no cuenten.
//   4) Tiempo: lo que tarda en decidir un turno (la Edge Function tiene ~2 s de CPU por llamada).

globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
import fs from 'node:fs';
const root = new URL('../../src/tactics/', import.meta.url);
const { HeadlessCombat } = await import(new URL('sim/HeadlessCombat.js', root));
const { mulberry32 } = await import(new URL('sim/SeededRandom.js', root));
const { PART_CARDS_LIST } = await import(new URL('data/PartCards.js', root));
const { getBattleMap } = await import(new URL('maps/BattleMaps.js', root));
const { playBotTurn, botRng } = await import(new URL('sim/PvpBot.js', root));
const { botTurn } = await import('./bot.mjs');

const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a))) || 120;
const SEED = args.includes('--seed') ? Number(args[args.indexOf('--seed') + 1]) || 0 : 0;

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { fails++; console.log(`  ✗ ${m}`); };

// Mapas: los de la última migración de la Arena (como balance.mjs)
const migDir = new URL('../../supabase/migrations/', import.meta.url);
let MAPS = null;
for (const f of fs.readdirSync(migDir).filter((x) => /arena/.test(x)).sort()) {
  const m = fs.readFileSync(new URL(f, migDir), 'utf8').match(/'maps', jsonb_build_array\(([^)]*)\)/);
  if (m) MAPS = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}
MAPS = (MAPS || ['forest_maple_glade']).filter((id) => getBattleMap(id));

// Equipos al azar como los de los jugadores (misma forma que balance.mjs)
const SAPS = ['crafter', 'shepard', 'lunalogist', 'stargazer'];
const CLASSES = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile'];
const PARTS = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
const byClassPart = {};
for (const c of PART_CARDS_LIST) {
  const m = /^part_([a-z]+)_([a-z]+)_/.exec(c.id);
  if (m) (byClassPart[`${m[1]}:${m[2]}`] ||= []).push(c.id);
}
const rnd = mulberry32(0xB0751 + SEED * 101);
const pickOf = (list) => list[Math.floor(rnd() * list.length)];
function randomTeam(i) {
  const cls = pickOf(CLASSES);
  const cards = PARTS.map((p) => pickOf(byClassPart[`${cls}:${p}`] || byClassPart[`${cls}:mouth`]));
  return { name: `T${i}`, sapidaeClass: pickOf(SAPS), axie: { axieId: String(i), name: `Ax${i}`, class: cls, cards } };
}

const timing = { turns: 0, total: 0, max: 0 };
const illegal = [];

/** Juega una partida entera. players: { A: 'novice'|'normal'|'strong'|'simple', B: … }. */
async function play(match, players, salt = 0) {
  const e = HeadlessCombat.fromMatch(match, 'A').start();
  const rngs = { A: botRng(match.seed, 1 + salt), B: botRng(match.seed, 2 + salt) };
  const simple = { A: mulberry32(match.seed ^ 0x51), B: mulberry32(match.seed ^ 0x52) };
  const orders = [];
  let guard = 0;
  while (!e.over && guard++ < 600) {
    const side = e.turnSide;
    const who = players[side];
    const before = e.log.length;
    if (who === 'simple') {
      await botTurn(e, simple[side]);
    } else {
      const t = performance.now();
      await playBotTurn(e, { level: who, rng: rngs[side], onError: (err) => illegal.push(`${match.map}: ${err?.code || err?.message}`) });
      const dt = performance.now() - t;
      timing.turns++; timing.total += dt; timing.max = Math.max(timing.max, dt);
    }
    orders.push(...e.log.slice(before).map((o) => JSON.stringify(o)));
  }
  return { e, orders, guard };
}

const t0 = Date.now();

// ------------------------------------------------------------------------------------------------ 1 y 2
console.log('\n1) Legalidad y final (todos los mapas de la Arena, 3 niveles)');
{
  let games = 0, notOver = 0, tooLong = 0;
  for (let k = 0; k < Math.max(21, MAPS.length * 3); k++) {
    const lv = ['novice', 'normal', 'strong'][k % 3];
    const match = { seed: (Math.imul(0x9E3779B1, k + 7 + SEED) >>> 0), map: MAPS[k % MAPS.length], tieBreak: k % 2 ? 'B' : 'A', maxRounds: 25, A: randomTeam(k * 2), B: randomTeam(k * 2 + 1) };
    const { e } = await play(match, { A: lv, B: ['strong', 'novice', 'normal'][k % 3] });
    games++;
    if (!e.over) notOver++;
    if (e.round > 26) tooLong++;
  }
  illegal.length ? fail(`órdenes rechazadas por el motor: ${illegal.length} (${illegal.slice(0, 3).join(' · ')})`) : ok(`${games} partidas en ${MAPS.length} mapas: ninguna orden rechazada`);
  notOver || tooLong ? fail(`partidas sin terminar: ${notOver}, más de 25 rondas: ${tooLong}`) : ok('todas terminan dentro del límite de rondas');
}

console.log('\n2) Determinismo');
{
  let same = 0, total = 0;
  for (let k = 0; k < 10; k++) {
    const match = { seed: (Math.imul(0x85EBCA6B, k + 1 + SEED) >>> 0), map: MAPS[k % MAPS.length], tieBreak: 'A', maxRounds: 25, A: randomTeam(900 + k), B: randomTeam(950 + k) };
    const lv = { A: ['novice', 'normal', 'strong'][k % 3], B: 'strong' };
    const a = await play(match, lv), b = await play(match, lv);
    total++;
    if (a.orders.join('|') === b.orders.join('|') && a.e.hash() === b.e.hash()) same++;
  }
  same === total ? ok(`${total} partidas repetidas: mismas órdenes y misma huella final`) : fail(`solo ${same}/${total} partidas idénticas al repetirlas`);
}

// ------------------------------------------------------------------------------------------------ 3
console.log('\n3) Fuerza (cada pareja juega con la misma semilla desde los dos bandos)');
const pairs = [['normal', 'novice', 0.65], ['strong', 'normal', 0.52], ['novice', 'simple', 0.40], ['strong', 'simple', 0.80]];
const results = {};
for (const [hi, lo, target] of pairs) {
  let w = 0, l = 0, d = 0, aWins = 0, decided = 0;
  for (let g = 0; g < N; g++) {
    const X = randomTeam(2000 + g * 2), Y = randomTeam(2001 + g * 2);
    const map = MAPS[g % MAPS.length];
    const seed = (Math.imul(0x9E3779B1, g + 1 + SEED * 100003) >>> 0);
    for (const swap of [false, true]) {
      const match = { seed, map, tieBreak: g % 2 ? 'B' : 'A', maxRounds: 25, A: swap ? Y : X, B: swap ? X : Y };
      const hiSide = swap ? 'B' : 'A';
      const { e } = await play(match, { [hiSide]: hi, [hiSide === 'A' ? 'B' : 'A']: lo }, g);
      const ws = e.result?.winnerSide || 'draw';
      if (ws === 'draw') d++; else { decided++; if (ws === 'A') aWins++; if (ws === hiSide) w++; else l++; }
    }
  }
  const rate = (w + d / 2) / (w + l + d);
  results[`${hi}-${lo}`] = { w, l, d, rate };
  const line = `${hi} contra ${lo}: ${(rate * 100).toFixed(1)} % (${w}-${l}-${d}) · gana el bando A ${(100 * aWins / Math.max(1, decided)).toFixed(1)} %`;
  // Con pocas partidas el azar pesa (±4–5 puntos con 120): solo cuenta como fallo con ≥ 200 partidas por pareja
  if (rate >= target) ok(`${line} (objetivo ≥ ${Math.round(target * 100)} %)`);
  else if (N < 200) console.log(`  ⚠ ${line} (objetivo ≥ ${Math.round(target * 100)} %; muestra pequeña: repetir con 300)`);
  else fail(`${line} (objetivo ≥ ${Math.round(target * 100)} %)`);
}

// ------------------------------------------------------------------------------------------------ 4
console.log('\n4) Tiempo de decisión por turno de unidad');
{
  const avg = timing.total / Math.max(1, timing.turns);
  const line = `${timing.turns} turnos · media ${avg.toFixed(1)} ms · máximo ${timing.max.toFixed(0)} ms`;
  timing.max <= 300 ? ok(`${line} (objetivo ≤ 300 ms)`) : fail(`${line} (objetivo ≤ 300 ms)`);
}

console.log(`\ntiempo total: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(fails ? `\n✗ ${fails} fallos` : '\n✓ todo correcto');
process.exit(fails ? 1 : 0);
