// check-maps.mjs - Validador de los mapas de combate (Hito 35).
// Uso:  node tools/battle-maps/check-maps.mjs        (desde axie-tactics-web/)
// Comprueba cada mapa de src/tactics/maps/BattleMaps.js y sale con código 1 si alguno falla.

import { BATTLE_MAPS, getBattleMap, getBattleMapsForBiome, pickBattleMap } from '../../src/tactics/maps/BattleMaps.js';
import { CELL, cellWalkable } from '../../src/tactics/maps/BattleMapLayout.js';

const LIMITS = {
  minSpawns: 4,          // Sapidae + 3 Axies / hasta 4 enemigos
  minWalkable: 55,
  maxWalkable: 160,
  minObstacles: 3,
  maxObstacles: 16,
  minFrontDistance: 5,   // distancia mínima (Manhattan) entre una salida del jugador y una del enemigo
  maxFrontDistance: 11,  // distancia entre el Sapidae y el líder enemigo
};

let failures = 0;
const rows = [];

function bfs(map, start, limit = Infinity) {
  const seen = new Set([`${start.x},${start.z}`]);
  const q = [start];
  const dist = new Map([[`${start.x},${start.z}`, 0]]);
  while (q.length) {
    const c = q.shift();
    if (dist.get(`${c.x},${c.z}`) >= limit) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.x + dx, z = c.z + dz;
      if (x < 0 || z < 0 || x >= map.width || z >= map.height) continue;
      if (!cellWalkable(map.cells[x][z])) continue;
      const k = `${x},${z}`;
      if (seen.has(k)) continue;
      seen.add(k);
      dist.set(k, dist.get(`${c.x},${c.z}`) + 1);
      q.push({ x, z });
    }
  }
  return dist;
}

for (const id of Object.keys(BATTLE_MAPS)) {
  const errs = [];
  let map;
  try {
    map = getBattleMap(id);
  } catch (e) {
    errs.push(e.message);
  }
  if (map) {
    const { player, enemy } = map.spawns;
    if (player.length < LIMITS.minSpawns) errs.push(`solo ${player.length} salidas P`);
    if (enemy.length < LIMITS.minSpawns) errs.push(`solo ${enemy.length} salidas E`);
    if (map.walkableCount < LIMITS.minWalkable || map.walkableCount > LIMITS.maxWalkable) errs.push(`${map.walkableCount} casillas transitables (rango ${LIMITS.minWalkable}–${LIMITS.maxWalkable})`);
    if (map.obstacles.length < LIMITS.minObstacles || map.obstacles.length > LIMITS.maxObstacles) errs.push(`${map.obstacles.length} obstáculos`);
    // Conectividad: todas las casillas transitables alcanzables desde la primera salida del jugador
    const dist = bfs(map, player[0]);
    let unreachable = 0;
    for (let x = 0; x < map.width; x++) for (let z = 0; z < map.height; z++) {
      if (cellWalkable(map.cells[x][z]) && !dist.has(`${x},${z}`)) unreachable++;
    }
    if (unreachable) errs.push(`${unreachable} casillas transitables aisladas`);
    for (const e of enemy) if (!dist.has(`${e.x},${e.z}`)) errs.push(`salida E (${e.x},${e.z}) inalcanzable`);
    // Distancias de frente
    let minFront = Infinity;
    for (const p of player) for (const e of enemy) minFront = Math.min(minFront, Math.abs(p.x - e.x) + Math.abs(p.z - e.z));
    const lead = Math.abs(player[0].x - enemy[0].x) + Math.abs(player[0].z - enemy[0].z);
    const walk = dist.get(`${enemy[0].x},${enemy[0].z}`);
    if (minFront < LIMITS.minFrontDistance) errs.push(`frente demasiado cerca (${minFront})`);
    // Como la IA (TacticalAI, distancia caminando): desde cada salida E, 3 PM por turno, llega a cualquier casilla
    let stuck = 0;
    for (let hx = 0; hx < map.width; hx++) for (let hz = 0; hz < map.height; hz++) {
      if (!cellWalkable(map.cells[hx][hz])) continue;
      const W = bfs(map, { x: hx, z: hz });
      for (const e of enemy) {
        let p = { ...e };
        for (let t = 0; t < 14 && (W.get(`${p.x},${p.z}`) ?? 99) > 1; t++) {
          let best = null, bd = W.get(`${p.x},${p.z}`) ?? 999;
          for (const [k, c] of bfs(map, p, 3)) {
            if (c === 0 || k === `${hx},${hz}`) continue;
            if ((W.get(k) ?? 999) < bd) { bd = W.get(k); best = k; }
          }
          if (!best) break;
          const [x, z] = best.split(',').map(Number);
          p = { x, z };
        }
        if ((W.get(`${p.x},${p.z}`) ?? 99) > 1) stuck++;
      }
    }
    if (stuck) errs.push(`la IA se atasca en ${stuck} recorridos`);
    if (lead > LIMITS.maxFrontDistance) errs.push(`líderes demasiado lejos (${lead})`);
    rows.push({
      id, size: `${map.width}×${map.height}`, walk: map.walkableCount, obst: map.obstacles.length,
      water: map.cells.flat().filter((c) => c === CELL.WATER).length,
      P: player.length, E: enemy.length, front: minFront, leaders: lead, path: walk, boss: map.boss ? '👑' : '',
    });
  }
  if (errs.length) {
    failures++;
    console.log(`✗ ${id}: ${errs.join(' · ')}`);
  }
}

console.table(rows);

// Selección: 3 mapas por bioma, uno de jefe, y nunca el mismo dos veces seguidas
for (const biome of ['forest', 'savannah', 'arctic', 'mystic', 'genesis']) {
  const ids = getBattleMapsForBiome(biome);
  const bosses = ids.filter((id) => BATTLE_MAPS[id].boss);
  if (ids.length !== 3) { failures++; console.log(`✗ ${biome}: ${ids.length} mapas (se esperaban 3)`); }
  if (bosses.length !== 1) { failures++; console.log(`✗ ${biome}: ${bosses.length} mapas de jefe (se esperaba 1)`); }
}
const overworld = { forest: 'forest', savannah: 'savannah', arctic: 'arctic', mystic: 'mystic', dungeon: 'genesis' };
for (const [ow, arena] of Object.entries(overworld)) {
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const m = pickBattleMap(ow);
    if (m.biome !== arena) { failures++; console.log(`✗ ${ow} eligió ${m.id}`); break; }
    if (m.id === prev) { failures++; console.log(`✗ ${ow} repitió ${m.id}`); break; }
    prev = m.id;
    seen.add(m.id);
  }
  if (seen.size !== 3) { failures++; console.log(`✗ ${ow}: solo salieron ${seen.size} mapas`); }
  const boss = pickBattleMap(ow, { isBoss: true });
  if (!boss.boss) { failures++; console.log(`✗ ${ow}: el jefe no usa su mapa fijo`); }
}

if (failures) {
  console.log(`\n${failures} problema(s).`);
  process.exit(1);
}
console.log('\n✓ 15 mapas válidos · selección aleatoria sin repetir · jefes en su mapa fijo');
