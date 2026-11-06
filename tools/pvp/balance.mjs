#!/usr/bin/env node
// balance.mjs — Equilibrio de la Arena PvP (fase P6). Plan: docs/PLAN_ARENA_PVP.md, sección 17.
// Uso: node tools/pvp/balance.mjs [partidas=4000] [--seed n] [--json salida.json]
//
// Partidas en el motor sin gráficos con el jugador automático de las pruebas (tools/pvp/bot.mjs), en los mapas de la
// lista del servidor y con equipos al azar como los de los jugadores: clase de Sapidae, clase del Axie y 6 cartas de
// partes de su clase (una por parte: ojos, orejas, boca, cuerno, espalda, cola). Cada pareja de equipos juega dos
// veces con la misma semilla cambiando de bando, así el bando y el mapa no cuentan.
// Informe: victorias por clase de Sapidae, por clase de Axie y por combinación; quién juega primero; rondas y
// finales por límite de rondas; cartas más y menos ganadoras (con un mínimo de partidas).
// Ojo: el jugador automático es sencillo (no planea, no usa bien los gólems ni las zonas). Sirve para ver diferencias
// grandes; el equilibrio fino sale de las partidas reales (pvp_stats en el servidor).

globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
import fs from 'node:fs';
const root = new URL('../../src/tactics/', import.meta.url);
const { HeadlessCombat } = await import(new URL('sim/HeadlessCombat.js', root));
const { mulberry32 } = await import(new URL('sim/SeededRandom.js', root));
const { PART_CARDS_LIST } = await import(new URL('data/PartCards.js', root));
const { getBattleMap } = await import(new URL('maps/BattleMaps.js', root));
const { botTurn } = await import('./bot.mjs');

const args = process.argv.slice(2);
const GAMES = Number(args.find((a) => /^\d+$/.test(a))) || 4000;
const SEED = args.includes('--seed') ? Number(args[args.indexOf('--seed') + 1]) || 0 : 0;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

// Mapas: los de la última migración de la Arena
const migDir = new URL('../../supabase/migrations/', import.meta.url);
let MAPS = null;
for (const f of fs.readdirSync(migDir).filter((x) => /arena/.test(x)).sort()) {
  const m = fs.readFileSync(new URL(f, migDir), 'utf8').match(/'maps', jsonb_build_array\(([^)]*)\)/);
  if (m) MAPS = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}
MAPS = (MAPS || ['forest_maple_glade']).filter((id) => getBattleMap(id));

const SAPS = ['crafter', 'shepard', 'lunalogist', 'stargazer'];
const CLASSES = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile'];
const PARTS = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
const byClassPart = {};
for (const c of PART_CARDS_LIST) {
  const m = /^part_([a-z]+)_([a-z]+)_/.exec(c.id);
  if (!m) continue;
  (byClassPart[`${m[1]}:${m[2]}`] ||= []).push(c.id);
}

const rnd = mulberry32(0xBA1A + SEED * 101);
const pickOf = (list) => list[Math.floor(rnd() * list.length)];
function randomTeam(i) {
  const cls = pickOf(CLASSES);
  const cards = PARTS.map((p) => pickOf(byClassPart[`${cls}:${p}`] || byClassPart[`${cls}:mouth`]));
  return { name: `T${i}`, sapidaeClass: pickOf(SAPS), axie: { axieId: String(i), name: `Ax${i}`, class: cls, cards } };
}

const stat = () => ({ w: 0, l: 0, d: 0 });
const add = (m, k, r) => { const s = (m[k] ||= stat()); s[r]++; };
const bySap = {}, byAx = {}, byCombo = {}, byCard = {}, byMatchup = {};
let firstWins = 0, decided = 0, roundsSum = 0, roundEnds = 0, draws = 0, games = 0;
const t0 = Date.now();

for (let g = 0; g < GAMES; g += 2) {
  const X = randomTeam(g), Y = randomTeam(g + 1);
  const map = MAPS[(g / 2) % MAPS.length];
  const seed = (Math.imul(0x9E3779B1, g + 1 + SEED * 100003) >>> 0);
  for (const swap of [false, true]) {
    const A = swap ? Y : X, B = swap ? X : Y;
    const match = { seed, map, tieBreak: (g / 2) % 2 ? 'B' : 'A', maxRounds: 25, A, B };
    const e = HeadlessCombat.fromMatch(match, 'A').start();
    const first = e.turnSide;
    const pick = mulberry32(5000 + g + (swap ? 1 : 0) + SEED * 7777);
    let guard = 0;
    while (!e.over && guard++ < 400) await botTurn(e, pick);
    const w = e.result?.winnerSide || 'draw';
    games++;
    roundsSum += e.round;
    if (e.result?.reason === 'rounds') roundEnds++;
    const teams = { A, B };
    for (const side of ['A', 'B']) {
      const t = teams[side];
      const r = w === 'draw' ? 'd' : w === side ? 'w' : 'l';
      add(bySap, t.sapidaeClass, r);
      add(byAx, t.axie.class, r);
      add(byCombo, `${t.sapidaeClass} + ${t.axie.class}`, r);
      for (const c of new Set(t.axie.cards)) add(byCard, c, r);
      const o = teams[side === 'A' ? 'B' : 'A'];
      if (t.sapidaeClass !== o.sapidaeClass) add(byMatchup, `${t.sapidaeClass} vs ${o.sapidaeClass}`, r);
    }
    if (w === 'draw') draws++;
    else { decided++; if (w === first) firstWins++; }
  }
}

const rate = (s) => (s.w + s.l ? s.w / (s.w + s.l) : 0.5);
const n = (s) => s.w + s.l + s.d;
const pct = (x) => `${(x * 100).toFixed(1)} %`;
const table = (title, m, { min = 1, top = Infinity, sort = true } = {}) => {
  let rows = Object.entries(m).filter(([, s]) => n(s) >= min);
  if (sort) rows.sort((a, b) => rate(b[1]) - rate(a[1]));
  if (top < Infinity) rows = [...rows.slice(0, top), ...(rows.length > top * 2 ? [['…', null]] : []), ...rows.slice(Math.max(top, rows.length - top))];
  console.log(`\n${title}`);
  for (const [k, s] of rows) {
    if (!s) { console.log('  …'); continue; }
    const r = rate(s), se = Math.sqrt(0.25 / Math.max(1, s.w + s.l));
    const flag = Math.abs(r - 0.5) > Math.max(0.06, 2 * se) ? (r > 0.5 ? '  ▲ fuerte' : '  ▼ débil') : '';
    console.log(`  ${k.padEnd(34)} ${pct(r).padStart(8)}  (${s.w}–${s.l}–${s.d})${flag}`);
  }
};

console.log(`\nEquilibrio de la Arena · ${games} partidas · mapas: ${MAPS.join(', ')}`);
console.log(`Gana quien juega primero: ${pct(firstWins / Math.max(1, decided))} · empates: ${pct(draws / games)} · final por rondas: ${pct(roundEnds / games)} · rondas de media: ${(roundsSum / games).toFixed(1)}`);
table('Clase del Sapidae', bySap);
table('Clase del Axie', byAx);
table('Sapidae contra Sapidae', byMatchup, { min: 50 });
table('Combinaciones (Sapidae + Axie)', byCombo, { min: 60, top: 6 });
table('Cartas de partes (mín. 60 partidas)', byCard, { min: 60, top: 8 });
console.log(`\n${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ games, seed: SEED, maps: MAPS, bySap, byAx, byCombo, byCard, byMatchup, firstWins, decided, draws, roundEnds }, null, 2));
