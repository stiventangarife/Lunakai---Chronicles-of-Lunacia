#!/usr/bin/env node
// map-fairness.mjs — Justicia de los mapas de la Arena PvP (fase P5). Plan: docs/PLAN_ARENA_PVP.md, sección 16.
// Uso: node tools/pvp/map-fairness.mjs [partidas por mapa=96] [--maps id1,id2] [--seed n] [--json salida.json]
//
// Para cada mapa (los de la Arena y los candidatos) compara los dos bandos desde sus salidas reales de la Arena
// (PvpRoster.pvpSpawns: Sapidae y Axie; en un mapa simétrico, las del bando B son las del A giradas):
//   1. Medidas del tablero:
//      · acercamiento: casillas a pie hasta la salida rival más cercana;
//      · territorio: casillas a las que el bando llega antes que el rival (a pie, desde sus dos salidas);
//      · movilidad: casillas alcanzables con 3 PM desde sus salidas;
//      · cobertura: casillas de su territorio pegadas a un obstáculo;
//      · exposición: casillas de su territorio que el rival ve desde sus salidas (línea de visión, alcance ≤ 6);
//      · bordes: lados de sus salidas sin casilla (empujones contra el borde).
//   2. Partidas simuladas: el motor sin gráficos con un jugador automático sencillo (ataca lo que puede, si no se
//      acerca) y los MISMOS equipos en los dos bandos (o el equipo X en A contra Y en B y luego al revés), con el
//      desempate repartido a medias. Si el mapa es justo, A y B ganan lo mismo.
// Veredicto por mapa: «justo» si la diferencia de victorias está dentro del ruido (±2 errores típicos y ≤ 10 puntos)
// y ninguna medida difiere más de un 25 %; si no, «revisar».

globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
const root = new URL('../../src/tactics/', import.meta.url);
const { BATTLE_MAPS, getBattleMap } = await import(new URL('maps/BattleMaps.js', root));
const { cellWalkable, cellExists } = await import(new URL('maps/BattleMapLayout.js', root));
const { GridRules } = await import(new URL('GridRules.js', root));
const { HeadlessCombat } = await import(new URL('sim/HeadlessCombat.js', root));
const { mulberry32 } = await import(new URL('sim/SeededRandom.js', root));
const { pvpSpawns } = await import(new URL('sim/PvpRoster.js', root));
const { SPELLS_DB } = await import(new URL('data/SpellsDB.js', root));
const { botTurn } = await import('./bot.mjs');

const args = process.argv.slice(2);
const GAMES = Number(args.find((a) => /^\d+$/.test(a))) || 96;
const onlyMaps = (args[args.indexOf('--maps') + 1] && args.includes('--maps')) ? args[args.indexOf('--maps') + 1].split(',') : null;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const SEED = args.includes('--seed') ? Number(args[args.indexOf('--seed') + 1]) || 0 : 0; // otra tanda de partidas
const maps = onlyMaps || Object.keys(BATTLE_MAPS).filter((id) => !BATTLE_MAPS[id].boss);

// ---------------------------------------------------------------------- 1. medidas del tablero
const K = (c) => `${c.x},${c.z}`;
function bfsMulti(map, starts) {
  const dist = new Map(starts.map((s) => [K(s), 0]));
  const q = [...starts];
  while (q.length) {
    const c = q.shift();
    const d = dist.get(K(c));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.x + dx, z = c.z + dz;
      if (x < 0 || z < 0 || x >= map.width || z >= map.height || !cellWalkable(map.cells[x][z])) continue;
      if (dist.has(`${x},${z}`)) continue;
      dist.set(`${x},${z}`, d + 1);
      q.push({ x, z });
    }
  }
  return dist;
}

function boardMetrics(map) {
  const grid = new GridRules();
  grid.loadLayout(map);
  const S = pvpSpawns(map);
  const D = { A: bfsMulti(map, S.A), B: bfsMulti(map, S.B) };
  const out = {};
  const obstacleAt = (x, z) => grid.getTile(x, z)?.obstacle;
  for (const side of ['A', 'B']) {
    const foe = side === 'A' ? 'B' : 'A';
    const approach = Math.min(...S[side].map((s) => Math.min(...S[foe].map((f) => bfsMulti(map, [s]).get(K(f)) ?? 99))));
    let territory = 0, cover = 0, exposed = 0;
    for (const [k, d] of D[side]) {
      const other = D[foe].get(k) ?? Infinity;
      if (!(d < other)) continue;
      territory++;
      const [x, z] = k.split(',').map(Number);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => obstacleAt(x + dx, z + dz))) cover++;
      if (S[foe].some((f) => Math.abs(f.x - x) + Math.abs(f.z - z) <= 6 && grid.hasLineOfSight(f, { x, z }))) exposed++;
    }
    const mobility = S[side].reduce((t, s) => t + grid.getReachableCells(s.x, s.z, 3).length, 0);
    const edges = S[side].reduce((t, s) => t + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => {
      const x = s.x + dx, z = s.z + dz;
      return x < 0 || z < 0 || x >= map.width || z >= map.height || !cellExists(map.cells[x][z]);
    }).length, 0);
    out[side] = { approach, territory, mobility, cover, exposed, edges };
  }
  return out;
}

// ---------------------------------------------------------------------- 2. partidas simuladas
const ids = Object.keys(SPELLS_DB);
const CLS = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile'];
const SAPS = ['crafter', 'shepard', 'lunalogist', 'stargazer'];
function team(k) {
  const cls = CLS[k % 6];
  const parts = ids.filter((id) => id.startsWith(`part_${cls}_`));
  return { name: `T${k}`, sapidaeClass: SAPS[k % 4], axie: { axieId: String(k), name: `Ax${k}`, class: cls, cards: Array.from({ length: 6 }, (_, i) => parts[(k * 7 + i * 5) % parts.length]) } };
}

async function simulate(mapId, games) {
  let a = 0, b = 0, d = 0, rounds = 0, firstWins = 0;
  for (let g = 0; g < games; g++) {
    // Parejas de equipos: g par → X en A e Y en B; g impar → al revés (misma semilla); cada 4, equipos iguales
    const pair = Math.floor(g / 2);
    const x = team(pair * 3 + 1), y = (pair % 4 === 0) ? x : team(pair * 5 + 2);
    const swap = g % 2 === 1;
    const match = { seed: (0x9E3779B1 * (pair + 1 + SEED * 100003) ^ mapId.length * 7919) >>> 0, map: mapId, tieBreak: Math.floor(g / 2) % 2 ? 'B' : 'A', maxRounds: 25,
      A: swap ? y : x, B: swap ? x : y };
    const e = HeadlessCombat.fromMatch(match, 'A').start();
    const firstSide = e.turnSide;
    const pick = mulberry32(1000 + g + SEED * 7777);
    let guard = 0;
    while (!e.over && guard++ < 400) await botTurn(e, pick);
    const w = e.result?.winnerSide || 'draw';
    if (w === 'A') a++; else if (w === 'B') b++; else d++;
    if (w === firstSide) firstWins++;
    rounds += e.round;
  }
  return { a, b, d, games, rounds: rounds / games, firstWins };
}

// ---------------------------------------------------------------------- informe
const asym = (x, y) => (Math.max(x, y) === 0 ? 0 : Math.abs(x - y) / Math.max(x, y));
const results = [];
const t0 = Date.now();
console.log(`\nJusticia de los mapas de la Arena · ${GAMES} partidas simuladas por mapa\n`);
console.log('mapa                     acerc.  territorio  movilidad  cobertura  exposición  bordes │ A–B–emp.    A−B   empieza   rondas  veredicto');
for (const id of maps) {
  const map = getBattleMap(id);
  if (!map) { console.log(`${id}: no existe`); continue; }
  const m = boardMetrics(map);
  const sim = await simulate(id, GAMES);
  const decided = sim.a + sim.b;
  const diff = decided ? (sim.a - sim.b) / decided : 0;              // ventaja de A (−1 … 1)
  const se = decided ? 1 / Math.sqrt(decided) : 1;                    // error típico aproximado de diff
  const worst = Math.max(asym(m.A.territory, m.B.territory), asym(m.A.mobility, m.B.mobility), asym(m.A.cover + 1, m.B.cover + 1),
    asym(m.A.exposed + 1, m.B.exposed + 1), asym(m.A.approach, m.B.approach));
  const fairSim = Math.abs(diff) <= Math.max(2 * se, 0.04) && Math.abs(diff) <= 0.10;
  const fair = fairSim && worst <= 0.25;
  const pair = (k) => `${String(m.A[k]).padStart(2)}/${String(m.B[k]).padEnd(2)}`;
  console.log(`${id.padEnd(24)} ${pair('approach').padStart(6)}  ${pair('territory').padStart(10)}  ${pair('mobility').padStart(9)}  ${pair('cover').padStart(9)}  ${pair('exposed').padStart(10)}  ${pair('edges').padStart(6)} │ ${`${sim.a}–${sim.b}–${sim.d}`.padEnd(10)} ${(diff >= 0 ? '+' : '') + (diff * 100).toFixed(0).padStart(3)}%  ${String(Math.round(100 * sim.firstWins / Math.max(1, sim.games))).padStart(3)}%   ${sim.rounds.toFixed(1).padStart(5)}  ${fair ? '✓ justo' : `✗ revisar${fairSim ? ' (tablero)' : ''}`}`);
  results.push({ id, metrics: m, sim, diff, se, worst, fair, fairSim, pvp: Boolean(BATTLE_MAPS[id].pvp) });
}
const fairList = results.filter((r) => r.fair).map((r) => r.id);
console.log(`\n${fairList.length}/${results.length} justos: ${fairList.join(', ') || '—'} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log('A−B: ventaja de victorias del bando A (salidas P) sobre el B (salidas E). Empieza: % de partidas que gana quien juega primero.');
if (jsonOut) {
  const fs = await import('node:fs');
  fs.writeFileSync(jsonOut, JSON.stringify({ games: GAMES, results }, null, 2));
}
