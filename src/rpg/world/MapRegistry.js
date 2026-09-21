// MapRegistry.js - Master 3x3 World Grid (9 Macro-Zones, 5 Biomes & 2x2 Sub-Quadrants)

/**
 * Biome distribution strictly matching the user's 3x3 diagram:
 * - Row 1 (gy = 1): [1, 1] Arctic (Blue) | [2, 1] Arctic (Blue) | [3, 1] Savannah (Yellow)
 * - Row 2 (gy = 2): [1, 2] Mystic (Pink) | [2, 2] Forest / Dojo (Green) | [3, 2] Savannah (Yellow)
 * - Row 3 (gy = 3): [1, 3] Mystic (Pink) | [2, 3] Dungeon (Red) | [3, 3] Dungeon (Red)
 * Total = 1 Forest + 2 Arctic + 2 Savannah + 2 Mystic + 2 Dungeon = 9 macro-zones
 */
export function getBiomeForCoord(gx, gy) {
  // Center 1x1: Forest & Dojo
  if (gx === 2 && gy === 2) return 'forest';
  // Top row: Arctic
  if (gy === 1 && (gx === 1 || gx === 2)) return 'arctic';
  // Right column: Savannah
  if (gx === 3 && (gy === 1 || gy === 2)) return 'savannah';
  // Left column: Mystic
  if (gx === 1 && (gy === 2 || gy === 3)) return 'mystic';
  // Bottom row: Dungeon
  if ((gy === 3 && gx === 2) || (gx === 3 && gy === 3)) return 'dungeon';
  return 'forest';
}

export const BIOME_COLORS = {
  arctic: '#38bdf8',    // Blue
  savannah: '#FAC651',  // Yellow Desert (#FAC651)
  forest: '#22c55e',    // Green
  mystic: '#a855f7',    // Purple / Pink
  dungeon: '#ef4444'    // Red
};

export const BIOME_LABELS = {
  arctic: '❄️ Arctic',
  savannah: '🏜️ Savannah',
  forest: '🌲 Forest',
  mystic: '🔮 Mystic',
  dungeon: '🏰 Dungeon'
};

// Notable landmarks in the 3x3 world matching the user capture
const LANDMARKS = {
  // Row 1 (gy = 1)
  '1_1': { name: 'Eternal Frost Valley', title: 'Frost Valley' },
  '2_1': { name: 'Glacial Peaks of Lunacia', title: 'Glacial Peaks' },
  '3_1': { name: 'Arid Wastes of Atia', title: 'Arid Wastes' },

  // Row 2 (gy = 2)
  '1_2': { name: 'Astral Nebula of Lunacia', title: 'Astral Nebula' },
  '2_2': { name: 'Dojo Valley of Lunacia', title: 'Dojo Valley', hasDojo: true },
  '3_2': { name: 'Desert of the Rising Sun', title: 'Sun Desert' },

  // Row 3 (gy = 3)
  '1_3': { name: 'Sanctuary of the Astral Void', title: 'Astral Sanctuary' },
  '2_3': { name: 'Igneous Stronghold Threshold', title: 'Dungeon Threshold' },
  '3_3': { name: 'Catacombs of the Deep Crypt', title: 'Crypt Catacombs', isBoss: true }
};

function generateZoneName(gx, gy, biome) {
  const key = `${gx}_${gy}`;
  if (LANDMARKS[key]) return LANDMARKS[key].name;

  const prefixes = {
    arctic: ['Glacier', 'Plateau', 'Tundra', 'Snowdrift', 'Ridge'],
    savannah: ['Steppe', 'Desert', 'Wasteland', 'Plateau', 'Canyon'],
    forest: ['Grove', 'Meadow', 'Valley', 'Thicket', 'Path'],
    mystic: ['Rift', 'Sanctuary', 'Nebula', 'Abyss', 'Vortex'],
    dungeon: ['Catacombs', 'Hall', 'Gallery', 'Vault', 'Pit']
  };
  const suffixes = {
    arctic: ['of Frost', 'of Ice', 'Snowy', 'Boreal', 'Frozen'],
    savannah: ['of Sand', 'Arid', 'of the Sun', 'of Dust', 'Steppic'],
    forest: ['Green', 'of Lunacia', 'of Wind', 'Blooming', 'Ancestral'],
    mystic: ['Astral', 'of the Void', 'of Shadows', 'Arcane', 'Cosmic'],
    dungeon: ['of Fire', 'of Oblivion', 'of Ash', 'Corrupt', 'of the Crypt']
  };

  const pList = prefixes[biome] || prefixes.forest;
  const sList = suffixes[biome] || suffixes.forest;
  const p = pList[(gx * 3 + gy * 7) % pList.length];
  const s = sList[(gx * 5 + gy * 11) % sList.length];
  return `${p} ${s} [${gx}, ${gy}]`;
}

// Master Overworld NPCs distribution for Main & Secondary Quests (3x3 Grid)
export const ZONE_NPCS = {
  // Center Dojo [2, 2]: Paladill (Main 1), Xia (Side 1), Postman (Side 2), Rosalba (Side 3)
  '2_2': [
    { id: 'paladill', type: 'mentor', position: { x: -14.5, y: 0, z: -8.5 }, name: 'Master Paladill', model: 'paladill.glb', collisionRadius: 1.2, auraRadius: 1.4, title: '🥋 Dojo Mentor', avatar: './assets/portraits/paladill.png' },
    { id: 'cartographer', type: 'quest_giver', questId: 'quest_world_cartographer', position: { x: -21.2, y: 0, z: 16.4 }, name: 'Xia', model: 'xia.glb', scale: 1.45, collisionRadius: 0.75, auraRadius: 1.15, rotation: 1.2, title: '🗺️ Imperial Explorer', bubbleQuote: 'Hey, traveler! Got a map handy?', avatar: 'xia' },
    { id: 'postman', type: 'quest_giver', questId: 'quest_lost_mail', position: { x: 15.4, y: 0, z: 26.0 }, rotation: (24.0 * Math.PI) / 180, name: 'Postman', model: 'sapidae-m-a.glb', title: '📬 Royal Messenger', bubbleQuote: 'Please help me! My letters scattered across the meadow!', avatar: 'sapidae-m-a' },
    { id: 'herbalist', type: 'quest_giver', questId: 'quest_forest_elixir', position: { x: 27.7, y: 0, z: -17.7 }, rotation: (-15 * Math.PI) / 180, name: 'Rosalba', model: 'sapidae-f-a.glb', title: '🌿 Flower Alchemist', bubbleQuote: 'Psst! Looking for fresh sprouts from the Sacred Atia Tree...', avatar: 'sapidae-f-a' }
  ],
  // East Savannah [3, 2]: Bing (Main 2 Recruit), Sentinel (Main 3 & 4)
  '3_2': [
    { id: 'bing_npc', type: 'recruit', heroId: 'bing', questId: 'quest_prove_ferocity', position: { x: -13.1, y: 0, z: 20.3 }, rotation: (90 * Math.PI) / 180, name: 'Bing', model: 'bing.glb', title: '🏹 Winged Archer', bubbleQuote: 'Over here! Help me drive off these chimeras!', avatar: './assets/portraits/bing.png' },
    { id: 'sentinel', type: 'quest_giver', questId: 'quest_hostile_sands', position: { x: 24.0, y: 0, z: -18.5 }, name: 'Desert Sentinel', model: 'kibo.glb', title: '🏜️ Dune Watcher', bubbleQuote: 'Beware the scorching sun and the desert chimeras!', avatar: 'kibo' }
  ],
  // North-East Savannah [3, 1]: Blacksmith Baruk (Side 4), Hunter Zarek (Side 5)
  '3_1': [
    { id: 'blacksmith', type: 'quest_giver', questId: 'quest_nomad_steel', position: { x: 2.7, y: 0, z: -19.5 }, name: 'Blacksmith Baruk', model: 'sapidae-m-b.glb', title: '🔨 Canyon Smith', bubbleQuote: 'By fire and hammer! Looking to forge true savannah steel?', avatar: 'sapidae-m-b' },
    { id: 'hunter', type: 'quest_giver', questId: 'quest_keen_eye_trial', position: { x: -10.3, y: 0, z: -12.2 }, name: 'Hunter Zarek', model: 'sapidae-m-c.glb', title: '🏹 Savannah Marksman', bubbleQuote: 'Hey, duelist! Think your aim rivals the desert wind?', avatar: 'sapidae-m-c' }
  ],
  // North Arctic [2, 1]: Pomodoro (Main 5 Recruit & Main 6), Chef Boreal (Side 6)
  '2_1': [
    { id: 'pomodoro_npc', type: 'recruit', heroId: 'pomodoro', questId: 'quest_frozen_seed', position: { x: 5.8, y: 0, z: 23.2 }, name: 'Pomodoro', model: 'pomodoro.glb', title: '🌿 Botanical Guardian', bubbleQuote: 'My roots are freezing! Help me against these ice chimeras!', avatar: './assets/portraits/pomodoro.png' },
    { id: 'chef', type: 'quest_giver', questId: 'quest_blizzard_stew', position: { x: -7.0, y: 0, z: -22.1 }, name: 'Chef Boreal', model: 'sapidae-m-d.glb', title: '🍲 Snow Cook', bubbleQuote: 'Brrr! Even my cauldron freezes among these ice floes!', avatar: 'sapidae-m-d' }
  ],
  // North-West Arctic [1, 1]: Glacial Hermit (Side 7)
  '1_1': [
    { id: 'hermit', type: 'quest_giver', questId: 'quest_dark_frost_totems', position: { x: -31.6, y: 0, z: 5.1 }, rotation: 1.85, name: 'Glacial Hermit', model: 'sapidae-m-e.glb', title: '❄️ Shaman of Sacred Ice', bubbleQuote: 'Dark frost taints the wind! The totems must be cleansed!', avatar: 'sapidae-m-e' }
  ],
  // West Mystic [1, 2]: Polar Sage (Main 7), Astrologer (Side 8)
  '1_2': [
    { id: 'polar_sage', type: 'quest_giver', questId: 'quest_astral_void_echoes', position: { x: -8.3, y: 0, z: 17.3 }, rotation: -2.0, name: 'Astral Sage', model: 'sapidae-f-c.glb', title: '🧙‍♂️ Custodian of Ley Lines', bubbleQuote: 'The constellations tremble before the encroaching void...', avatar: 'sapidae-f-c' },
    { id: 'astrologer', type: 'quest_giver', questId: 'quest_fallen_stardust', position: { x: 29.8, y: 0, z: -24.7 }, rotation: ((0.6 * Math.PI) / 180), name: 'Astral Astrologer', model: 'sapidae-f-b.glb', title: '🌠 Sky Reader', bubbleQuote: 'The constellations resonated when you crossed the rift!', avatar: 'sapidae-f-b' }
  ],
  // South-West Mystic [1, 3]: Oracle (Main 8), Spiritual Shaman (Side 9)
  '1_3': [
    { id: 'oracle', type: 'quest_giver', questId: 'quest_forbidden_resonance', position: { x: 13.6, y: 0, z: -24.2 }, rotation: -0.5, name: 'Astral Oracle', model: 'sapidae-f-d.glb', title: '🔮 Voice of the Constellations', bubbleQuote: 'The bell of destiny has begun to toll across Lunacia.', avatar: 'sapidae-f-d' },
    { id: 'shaman', type: 'quest_giver', questId: 'quest_shadow_mirror', position: { x: 35.3, y: 0, z: 5.9 }, rotation: -1.7, name: 'Spiritual Shaman', model: 'sapidae-f-e.glb', title: '🔮 Astral Threshold Guardian', bubbleQuote: 'Careful traveler! In this mist, your own shadow will hunt you...', avatar: 'sapidae-f-e' }
  ],
  // South Dungeon [2, 3]: Kotaro (Main 9), Tripp (Side 10)
  '2_3': [
    { id: 'sulfur_guard', type: 'quest_giver', questId: 'quest_sulfur_threshold', position: { x: 0, y: 0, z: -4 }, name: 'Kotaro', model: 'kotaro.glb', title: '🔥 Threshold Guardian', bubbleQuote: 'Only those who master tactical art can shatter the seal!', avatar: './assets/portraits/kotaro.png' },
    { id: 'miner', type: 'quest_giver', questId: 'quest_forgotten_miner_relic', position: { x: -3, y: 0, z: 1 }, name: 'Tripp', model: 'tripp.glb', title: '⛏️ Miner Warrior', bubbleQuote: 'A hundred years wandering through fire searching for my beloved golden pickaxe...!', avatar: 'tripp' }
  ],
  // South-East Dungeon [3, 3]: Spirit of Atia (Main 10 Final Boss)
  '3_3': [
    {
      id: 'atia_spirit',
      type: 'quest_giver',
      questId: 'quest_primeval_purification',
      position: { x: 0, y: 0, z: -5 },
      rotation: 0,
      name: 'Spirit of Atia',
      model: 'statue_atia.glb',
      isStatue: true,
      scale: 2.8,
      collisionRadius: 0.95,
      bubbleHeight: 3.5,
      title: '✨ Soul of the Great Tree',
      bubbleQuote: '{heroName}... Bing... Pomodoro... The fate of Lunacia rests upon you.',
      avatar: './assets/portraits/statue_atia.png'
    }
  ]
};

// Build 3x3 Macro-Zones Registry (Coordinates 1..3)
export const MAP_REGISTRY = {};
export const WORLD_GRID_MATRIX = [];

for (let gy = 1; gy <= 3; gy++) {
  const row = [];
  for (let gx = 1; gx <= 3; gx++) {
    const id = `zone_${gx}_${gy}`;
    const biome = getBiomeForCoord(gx, gy);
    const landmark = LANDMARKS[`${gx}_${gy}`] || {};
    const name = landmark.name || generateZoneName(gx, gy, biome);
    const regionTitle = landmark.title || name;

    // Portals with adjacent macro-zones (within 3x3 grid)
    const portals = {};

    // NORTH Portal
    if (gy > 1) {
      portals.NORTH = {
        direction: 'NORTH',
        label: generateZoneName(gx, gy - 1, getBiomeForCoord(gx, gy - 1)),
        hint: 'North [▲]',
        targetMap: `zone_${gx}_${gy - 1}`,
        targetPortal: 'SOUTH',
        position: { x: 0, y: 0, z: -38.0 },
        spawnOffset: { x: 0, y: 0, z: -32.5, yaw: 0 },
        triggerRadius: 2.5,
        arrowHeading: 0
      };
    }

    // SOUTH Portal
    if (gy < 3) {
      portals.SOUTH = {
        direction: 'SOUTH',
        label: generateZoneName(gx, gy + 1, getBiomeForCoord(gx, gy + 1)),
        hint: 'South [▼]',
        targetMap: `zone_${gx}_${gy + 1}`,
        targetPortal: 'NORTH',
        position: { x: 0, y: 0, z: 38.0 },
        spawnOffset: { x: 0, y: 0, z: 32.5, yaw: Math.PI },
        triggerRadius: 2.5,
        arrowHeading: Math.PI
      };
    }

    // WEST Portal (Outwards towards -X)
    if (gx > 1) {
      portals.WEST = {
        direction: 'WEST',
        label: generateZoneName(gx - 1, gy, getBiomeForCoord(gx - 1, gy)),
        hint: 'West [◄]',
        targetMap: `zone_${gx - 1}_${gy}`,
        targetPortal: 'EAST',
        position: { x: -38.0, y: 0, z: 0 },
        spawnOffset: { x: -32.5, y: 0, z: 0, yaw: Math.PI / 2 },
        triggerRadius: 2.5,
        arrowHeading: Math.PI / 2
      };
    }

    // EAST Portal (Outwards towards +X)
    if (gx < 3) {
      portals.EAST = {
        direction: 'EAST',
        label: generateZoneName(gx + 1, gy, getBiomeForCoord(gx + 1, gy)),
        hint: 'East [►]',
        targetMap: `zone_${gx + 1}_${gy}`,
        targetPortal: 'WEST',
        position: { x: 38.0, y: 0, z: 0 },
        spawnOffset: { x: 32.5, y: 0, z: 0, yaw: -Math.PI / 2 },
        triggerRadius: 2.5,
        arrowHeading: -Math.PI / 2
      };
    }

    // 2x2 Sub-quadrants definition (each 40m x 40m quadrant in the 80m x 80m macro-zone)
    const subQuadrants = {
      NW: { coord: [0, 0], label: 'Northwest (NW)', offset: { x: -20, z: -20 } },
      NE: { coord: [1, 0], label: 'Northeast (NE)', offset: { x: 20, z: -20 } },
      SW: { coord: [0, 1], label: 'Southwest (SW)', offset: { x: -20, z: 20 } },
      SE: { coord: [1, 1], label: 'Southeast (SE)', offset: { x: 20, z: 20 } }
    };

    // Default Spawns & NPCs
    let defaultSpawn = { x: 0, y: 0, z: 2, yaw: Math.PI };
    const npcs = (ZONE_NPCS[`${gx}_${gy}`] || []).map(npc => ({ ...npc }));
    const monsters = [];

    // Dojo Center [2, 2]: Tutorial Chimera Slime
    if (gx === 2 && gy === 2) {
      monsters.push({ id: 'chimera_slime_1', type: 'slime', name: 'Corrupt Slime Chimera', waypoints: [[14, 0, 2], [17, 0, -2], [16, 0, 5], [13, 0, 4]] });
    } else if (gx === 2) {
      // River corridor zones (gx = 2): keep wandering chimeras on East bank (x >= 13)
      if (biome === 'dungeon') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: 'Igneous Dungeon Chimera', waypoints: [[14, 0, 3], [17, 0, -2], [16, 0, 7], [13, 0, 4]] });
      } else if (biome === 'arctic') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: 'Ice Chimera', waypoints: [[14, 0, -4], [18, 0, -8], [16, 0, -11], [13, 0, -6]] });
      } else {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: 'Forest Chimera', waypoints: [[14, 0, 2], [17, 0, -3], [16, 0, 5], [13, 0, 3]] });
      }
    } else {
      // Wandering Chimeras by Biome
      if (biome === 'dungeon') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: 'Igneous Dungeon Chimera', waypoints: [[7, 0, 3], [10, 0, -2], [8, 0, 7], [4, 0, 4]] });
      } else if (biome === 'arctic') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: 'Ice Chimera', waypoints: [[6, 0, -4], [10, 0, -8], [5, 0, -11], [2, 0, -6]] });
      } else if (biome === 'savannah') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: 'Sand Chimera', waypoints: [[-6, 0, 4], [-11, 0, 2], [-8, 0, -5], [-4, 0, -2]] });
      } else if (biome === 'mystic') {
        const mobName = (gx === 1 && gy === 3) ? 'Arcane Sapidae Chimera' : 'Astral Void Chimera';
        const mobType = (gx === 1 && gy === 3) ? 'sapidae' : 'slime';
        monsters.push({ id: `mob_${gx}_${gy}`, type: mobType, name: mobName, waypoints: [[5, 0, 5], [9, 0, 9], [3, 0, 11], [-1, 0, 7]] });
      } else {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: 'Forest Chimera', waypoints: [[7, 0, 2], [10, 0, -3], [8, 0, 5], [5, 0, 3]] });
      }
    }

    const zoneDef = {
      id,
      gx,
      gy,
      gridCoord: [gx, gy],
      biome,
      name,
      regionTitle,
      bounds: { minX: -38.5, maxX: 38.5, minZ: -38.5, maxZ: 38.5 },
      defaultSpawn,
      portals,
      subQuadrants,
      npcs,
      monsters
    };

    MAP_REGISTRY[id] = zoneDef;
    row.push(zoneDef);
  }
  WORLD_GRID_MATRIX.push(row);
}

// Backwards-compatibility and named aliases
MAP_REGISTRY.forest_valley = MAP_REGISTRY.zone_2_2;
MAP_REGISTRY.savannah_wastes = MAP_REGISTRY.zone_3_2;
MAP_REGISTRY.arctic_peaks = MAP_REGISTRY.zone_2_1;
MAP_REGISTRY.mystic_abyss = MAP_REGISTRY.zone_1_2;
MAP_REGISTRY.dungeon_core = MAP_REGISTRY.zone_3_3;

export function getZoneByCoord(gx, gy) {
  return MAP_REGISTRY[`zone_${gx}_${gy}`] || MAP_REGISTRY.zone_2_2;
}

export function isValidCoord(gx, gy) {
  return gx >= 1 && gx <= 3 && gy >= 1 && gy <= 3;
}

export function getSubQuadrant(x, z) {
  if (x < 0) {
    return z < 0 ? 'NW' : 'SW';
  } else {
    return z < 0 ? 'NE' : 'SE';
  }
}

