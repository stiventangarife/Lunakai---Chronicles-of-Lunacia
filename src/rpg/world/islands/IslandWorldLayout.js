/**
 * IslandWorldLayout — world layout of the 5 islands after the 3×3 demo grid was retired.
 *
 * - The four corner macro-zones of the demo 1.0.0 grid (80 m terrains) no longer exist as places:
 *   their content (NPCs, quest battles) now lives inside the neighbouring island.
 * - Travel between islands is done by talking to Pomodoro the ferryman on each island's beach
 *   (the cardinal portal arrows are gone).
 * - Monster patrol anchors were validated against the real island terrains
 *   (above sea level, slope < 0.42, no water / lava, no rock colliders, ≥ 12 m from NPCs).
 *
 * This module has no imports so it can be used by MapRegistry, QuestManager and the managers alike.
 */

/** Retired corner zone → island that now hosts its content. */
export const MERGED_ZONES = {
  '1_1': '2_1', // Valle de la Escarcha Eterna → Isla del Ártico
  '3_1': '3_2', // Yermos Áridos → Isla de la Sabana
  '1_3': '1_2', // Santuario del Vacío Astral → Isla Mística
  '3_3': '2_3'  // Catacumbas de la Cripta → Isla de la Mazmorra
};

/** '1_1' → '2_1'; island keys are returned unchanged. */
export function canonicalZoneKey(key) {
  return MERGED_ZONES[key] || key;
}

/** 'zone_1_1' → 'zone_2_1'; any other id is returned unchanged. */
export function canonicalZoneId(id) {
  if (typeof id !== 'string') return id;
  const m = /^zone_(\d)_(\d)$/.exec(id);
  if (!m) return id;
  return `zone_${canonicalZoneKey(`${m[1]}_${m[2]}`)}`;
}

/** Island key → retired zone keys merged into it. */
export function mergedZonesOf(islandKey) {
  return Object.keys(MERGED_ZONES).filter((k) => MERGED_ZONES[k] === islandKey);
}

/** NPCs of the retired zones, relocated to a validated spot on their host island. */
export const MERGED_NPC_POSITIONS = {
  hermit: { x: -39.2, z: -70.4, rotation: -0.98 },     // Ártico · cabaña junto al Valle de la Escarcha Eterna
  oracle: { x: 34.0, z: -36.0, rotation: -2.3 },       // Mística · Observatorio del Oráculo
  shaman: { x: -40.0, z: 40.0, rotation: 2.4 },        // Mística · orilla del pantano luminoso
  atia_spirit: { x: 0.0, z: -13.0, rotation: 0 }       // Mazmorra · puerta de la Cripta Lunar
};

/** Island display names used by the ferry and the quest compass. */
export const ISLAND_NAMES = {
  '2_2': 'Isla del Bosque',
  '3_2': 'Isla de la Sabana',
  '2_1': 'Isla del Ártico',
  '1_2': 'Isla Mística',
  '2_3': 'Isla de la Mazmorra'
};

/** Island key → ISLANDS_REGISTRY id. */
export const ISLAND_IDS = {
  '2_2': 'island_forest',
  '3_2': 'island_savannah',
  '2_1': 'island_arctic',
  '1_2': 'island_mystic',
  '2_3': 'island_dungeon'
};

/**
 * Ferry docks: where Pomodoro the ferryman stands on each beach and where the player lands
 * when arriving by boat. Arctic, Mystic and Dungeon keep their original arrival points.
 */
export const FERRY_DOCKS = {
  zone_2_2: { npc: { x: 43.0, z: 132.2 }, arrive: { x: 40.0, z: 126.0, yaw: Math.atan2(-40.0, -126.0) } },
  zone_3_2: { npc: { x: -133.0, z: 42.0 }, arrive: { x: -126.0, z: 42.0, yaw: Math.atan2(126.0, -42.0) } },
  zone_2_1: { npc: { x: 14.3, z: 136.2 }, arrive: { x: 5, z: 120, yaw: Math.PI } },
  zone_1_2: { npc: { x: 136.0, z: 14.0 }, arrive: { x: 128, z: 8, yaw: Math.PI / 2 } },
  zone_2_3: { npc: { x: 136.0, z: 18.0 }, arrive: { x: 130, z: 22, yaw: -Math.PI / 2 } }
};

export const FERRY_NPC_ID = 'ferry_pomodoro';

/** NPC definition of the ferryman for one island zone id (or null). */
export function createFerryNpcDef(zoneId) {
  const dock = FERRY_DOCKS[zoneId];
  if (!dock) return null;
  const { x, z } = dock.npc;
  return {
    id: FERRY_NPC_ID,
    type: 'ferry',
    position: { x, y: 0, z },
    rotation: Math.atan2(-x, -z),
    name: 'Pomodoro',
    model: 'pomodoro.glb',
    title: '⛵ Barquero de Lunacia',
    bubbleQuote: '¡Todos a bordo! ¿A qué isla navegamos hoy?',
    avatar: 'pomodoro',
    collisionRadius: 0.75
  };
}

/** Patrol loop around a validated anchor (same footprint used by the terrain validation). */
const PATROL_OFFSETS = [[0, 0], [5, 3], [2, 8], [-4, 5]];
export function patrolAround(anchor) {
  return PATROL_OFFSETS.map(([dx, dz]) => ({ x: anchor.x + dx, z: anchor.z + dz }));
}

/**
 * Wandering-monster layout per island.
 * - packs: validated anchors for the island's own packs (1–2 spawn, at a random pair of anchors).
 * - merged: the pack that represents the retired corner zone (keeps its logical zone for quests).
 * - questMobs: fixed quest encounters that used to live in a retired zone.
 */
export const ISLAND_MONSTER_LAYOUT = {
  '3_2': {
    packs: [{ x: 24, z: 8 }, { x: -56, z: -64 }, { x: 16, z: 72 }, { x: -48, z: 40 }],
    merged: { logicalZone: '3_1', biome: 'savannah', anchor: { x: 96, z: -64 } },
    questMobs: {
      mob_armored_chimera: { x: 64, z: 32 },
      mob_beaked_chimera: { x: -40, z: -8 }
    }
  },
  '2_1': {
    packs: [{ x: 56, z: 0 }, { x: -72, z: 24 }, { x: 40, z: 64 }, { x: 56, z: -56 }],
    merged: { logicalZone: '1_1', biome: 'arctic', anchor: { x: -64, z: -72 } }
  },
  '1_2': {
    packs: [{ x: 64, z: 8 }, { x: -48, z: -16 }, { x: 40, z: 72 }, { x: -88, z: -48 }],
    merged: { logicalZone: '1_3', biome: 'mystic', anchor: { x: -80, z: 16 }, forcedLeader: 'dryad_fighter' }
  },
  '2_3': {
    packs: [{ x: -96, z: 0 }, { x: 72, z: -24 }, { x: -40, z: 48 }, { x: 48, z: 88 }],
    merged: { logicalZone: '3_3', biome: 'dungeon', anchor: { x: 0, z: 104 }, forcedLeader: 'werewolf_boss' }
  }
};

/** Where the quest compass points for battles of a retired zone (its merged pack anchor). */
export function mergedBattleAnchor(logicalZone) {
  const host = MERGED_ZONES[logicalZone];
  const lay = host ? ISLAND_MONSTER_LAYOUT[host] : null;
  return lay && lay.merged ? { x: lay.merged.anchor.x, z: lay.merged.anchor.z } : null;
}
