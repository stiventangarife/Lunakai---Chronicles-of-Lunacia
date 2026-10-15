import { createArcticIsland, ARCTIC_SPAWN } from './arctic/ArcticIsland.js';
import { createMysticIsland, MYSTIC_SPAWN } from './mystic/MysticIsland.js';
import { createDungeonIsland, DUNGEON_SPAWN } from './dungeon/DungeonIsland.js';

/**
 * GrandIslands (Hito 23) — registry of the new 480 m islands built with the shared Genshin kit.
 * zone id → island key, plus the arrival point used by "⛵ Viajar a ..." in the world map.
 * Islands are created empty and only built (init) the first time the player travels there.
 */
export const GRAND_ISLAND_ZONES = {
  zone_2_1: 'arctic',
  zone_1_2: 'mystic',
  zone_2_3: 'dungeon'
};

export const GRAND_ISLAND_TRAVEL = {
  island_arctic: { zone: 'zone_2_1', key: 'arctic', spawn: ARCTIC_SPAWN },
  island_mystic: { zone: 'zone_1_2', key: 'mystic', spawn: MYSTIC_SPAWN },
  island_dungeon: { zone: 'zone_2_3', key: 'dungeon', spawn: DUNGEON_SPAWN }
};

export function createGrandIslands(om) {
  return {
    arctic: createArcticIsland(om),
    mystic: createMysticIsland(om),
    dungeon: createDungeonIsland(om)
  };
}

export function getActiveGrandIsland(om) {
  const list = om && om.grandIslands ? Object.values(om.grandIslands) : [];
  for (const z of list) if (z && z.isActive && z.isLoaded) return z;
  return null;
}
