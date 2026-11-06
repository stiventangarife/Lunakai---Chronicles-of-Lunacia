// test-teams.js — Equipos y partidas de prueba de la Arena PvP (fase P0). Lo usan sim-test.mjs (Node) y parity.html.
// Cada partida k: un mapa sin jefe, una semilla, un desempate y dos equipos Sapidae + Axie con cartas reales.

import { getBattleMap, BATTLE_MAPS } from '../../src/tactics/maps/BattleMaps.js';
import { SPELLS_DB } from '../../src/tactics/data/SpellsDB.js';

const ids = Object.keys(SPELLS_DB);
export const SAPIDAE = ['crafter', 'shepard', 'lunalogist', 'stargazer'];
const PREFIX = { crafter: 'craft_', shepard: 'shepard_', lunalogist: 'lunalogist_', stargazer: 'stargazer_' };
const CLASSES = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile'];

/** Equipo de prueba: Sapidae de una clase + Axie con 6 cartas de partes de su clase (nivel 10: todo desbloqueado). */
function team(side, cls, axieClass, spawnA, spawnB, k) {
  const sap = ids.filter((id) => id.startsWith(PREFIX[cls]));
  const parts = ids.filter((id) => id.startsWith(`part_${axieClass}_`));
  const pick6 = Array.from({ length: 6 }, (_, i) => parts[(k * 7 + i * 13) % parts.length]);
  const team = side === 'A' ? 'player' : 'enemy';
  return [
    { id: `${side}_sapidae`, name: `Sapidae ${side}`, type: 'sapidae', team, x: spawnA.x, z: spawnA.z, maxHP: 278, maxPA: 6, maxPM: 3,
      initiative: 127, sapidaeClass: cls, isSapidae: true, spellIds: sap, bonusDamage: 6 },
    { id: `${side}_axie`, name: `Axie ${side}`, type: 'axie', team, x: spawnB.x, z: spawnB.z, maxHP: 318, maxPA: 6, maxPM: 3,
      initiative: 120 + (k % 3), axieClass: axieClass[0].toUpperCase() + axieClass.slice(1), spellIds: [...new Set(pick6)], bonusDamage: 4 },
  ];
}

export function setupFor(k) {
  const maps = Object.keys(BATTLE_MAPS).filter((id) => !BATTLE_MAPS[id].boss);
  const mapId = maps[k % maps.length];
  const m = getBattleMap(mapId);
  const P = m.spawns.player, E = m.spawns.enemy;
  return {
    mapId,
    seed: (0x9E3779B1 * (k + 1)) >>> 0,
    tieBreak: k % 2 ? 'enemy' : 'player',
    maxRounds: 25,
    units: [
      ...team('A', SAPIDAE[k % 4], CLASSES[k % 6], P[0], P[1 % P.length], k),
      ...team('B', SAPIDAE[(k + 1) % 4], CLASSES[(k + 2) % 6], E[0], E[1 % E.length], k + 3),
    ],
  };
}

