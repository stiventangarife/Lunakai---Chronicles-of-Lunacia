// MapRegistry.js - Master 3x3 World Grid (9 Macro-Zones, 5 Biomes & 2x2 Sub-Quadrants)
import { MERGED_ZONES, MERGED_NPC_POSITIONS, mergedZonesOf, createFerryNpcDef } from './islands/IslandWorldLayout.js';
import { OCHI_SPOT, FORGE_USE_SPOT, PALADILL_SPOT, SCROLL_KEEPER_SPOT, villagePoint } from './ForestVillageLayout.js';
import * as i18n from '../../i18n/i18n.js';

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
  dungeon: '#f5c542'    // Gold (Genesis)
};

export const BIOME_LABELS = {
  arctic: 'Arctic',
  savannah: 'Savannah',
  forest: 'Forest',
  mystic: 'Mystic',
  dungeon: 'Genesis'
};

/**
 * 5 Grand Islands layout:
 * - Top (Row 0, Col 1): Arctic Island (Cyan) [Norte]
 * - Left (Row 1, Col 0): Mystic Island (Blue/Indigo) [Oeste]
 * - Center (Row 1, Col 1): Forest Island (Green) [Centro - Demo Activa]
 * - Right (Row 1, Col 2): Savannah Island (Yellow) [Este]
 * - Bottom (Row 2, Col 1): Dungeon Island (Red) [Sur]
 */
export const ISLANDS_LAYOUT = [
  [null, 'island_arctic', null],
  ['island_mystic', 'island_forest', 'island_savannah'],
  [null, 'island_dungeon', null]
];

export const ISLANDS_REGISTRY = {
  island_forest: {
    id: 'island_forest',
    position: 'center',
    direction: 'CENTRO',
    name: i18n.t('places.islandForest'),
    tagline: i18n.t('places.forestTagline'),
    biome: 'forest',
    color: '#22c55e',
    accentColor: '#4ade80',
    gridPos: { row: 1, col: 1 },
    zoneId: 'zone_2_2',
    isCurrent: true,
    status: 'active',
    levelRange: 'Nivel 1',
    icon: '◆',
    description: i18n.t('places.forestDesc'),
    landmarks: [
      { id: 'dojo', name: i18n.t('places.forestDojo'), icon: '◆', coords: villagePoint('dojo'), desc: i18n.t('places.forestDojoDesc') },
      { id: 'shop', name: i18n.t('places.forestShop'), icon: '◆', coords: { x: OCHI_SPOT.x, z: OCHI_SPOT.z }, desc: i18n.t('places.forestShopDesc') },
      { id: 'forge', name: i18n.t('places.forestForge'), icon: '◆', coords: { x: FORGE_USE_SPOT.x, z: FORGE_USE_SPOT.z }, desc: i18n.t('places.forestForgeDesc') },
      { id: 'village', name: i18n.t('places.forestVillage'), icon: '◆', coords: villagePoint('house_4'), desc: i18n.t('places.forestVillageDesc') },
      { id: 'elder_tree', name: i18n.t('places.forestElderTree'), icon: '◆', coords: { x: -8.0, z: -25.0 }, desc: i18n.t('places.forestElderTreeDesc') },
      { id: 'ancient_shrine', name: i18n.t('places.forestShrine'), icon: '◆', coords: { x: 115.0, z: 65.0 }, desc: i18n.t('places.forestShrineDesc') }
    ]
  },
  island_savannah: {
    id: 'island_savannah',
    position: 'right',
    direction: 'DERECHA (ESTE)',
    name: i18n.t('places.islandSavannah'),
    tagline: i18n.t('places.savannahTagline'),
    biome: 'savannah',
    color: '#FAC651',
    accentColor: '#fde047',
    gridPos: { row: 1, col: 2 },
    zoneId: 'zone_3_2',
    isCurrent: false,
    status: 'active',
    levelRange: 'Nivel 1 - 3',
    icon: '◆',
    description: i18n.t('places.savannahDesc'),
    landmarks: [
      { id: 'desert_sun', name: i18n.t('places.savannahAltar'), icon: '◆', coords: { x: 68.0, z: -30.0 }, desc: i18n.t('places.savannahAltarDesc') },
      { id: 'bing_post', name: i18n.t('places.savannahBingCamp'), icon: '◆', coords: { x: -28.0, z: -35.0 }, desc: i18n.t('places.savannahBingCampDesc') },
      { id: 'blacksmith', name: i18n.t('places.savannahForge'), icon: '◆', coords: { x: 42.0, z: 48.0 }, desc: i18n.t('places.savannahForgeDesc') }
    ]
  },
  island_arctic: {
    id: 'island_arctic',
    position: 'top',
    direction: 'ARRIBA (NORTE)',
    name: i18n.t('places.islandArctic'),
    tagline: i18n.t('places.arcticTagline'),
    biome: 'arctic',
    color: '#38bdf8',
    accentColor: '#7dd3fc',
    gridPos: { row: 0, col: 1 },
    zoneId: 'zone_2_1',
    isCurrent: false,
    status: 'active',
    levelRange: 'Nivel 4 - 6',
    icon: '◆',
    description: i18n.t('places.arcticDesc'),
    landmarks: [
      { id: 'frost_valley', name: i18n.t('places.arcticFrostValley'), icon: '◆', desc: i18n.t('places.arcticFrostValleyDesc') },
      { id: 'pomodoro_post', name: i18n.t('places.arcticGreenhouse'), icon: '◆', desc: i18n.t('places.arcticGreenhouseDesc') },
      { id: 'boreal_chef', name: i18n.t('places.arcticCookCamp'), icon: '◆', desc: i18n.t('places.arcticCookCampDesc') }
    ]
  },
  island_mystic: {
    id: 'island_mystic',
    position: 'left',
    direction: 'IZQUIERDA (OESTE)',
    name: i18n.t('places.islandMystic'),
    tagline: i18n.t('places.mysticTagline'),
    biome: 'mystic',
    color: '#F27BA0', // rosa (antes índigo, que ahora es de Genesis)
    accentColor: '#FFB3CA',
    gridPos: { row: 1, col: 0 },
    zoneId: 'zone_1_2',
    isCurrent: false,
    status: 'active',
    levelRange: 'Nivel 7 - 9',
    icon: '◆',
    description: i18n.t('places.mysticDesc'),
    landmarks: [
      { id: 'astral_void', name: i18n.t('places.mysticVoid'), icon: '◆', desc: i18n.t('places.mysticVoidDesc') },
      { id: 'astral_nebula', name: i18n.t('places.mysticNebula'), icon: '◆', desc: i18n.t('places.mysticNebulaDesc') },
      { id: 'oracle_tower', name: i18n.t('places.mysticObservatory'), icon: '◆', desc: i18n.t('places.mysticObservatoryDesc') }
    ]
  },
  island_dungeon: {
    id: 'island_dungeon',
    position: 'bottom',
    direction: 'ABAJO (SUR)',
    name: i18n.t('places.islandGenesis'),
    tagline: i18n.t('places.genesisTagline'),
    biome: 'dungeon',
    color: '#6366f1', // índigo (el color que antes tenía la Isla Mística)
    accentColor: '#818cf8',
    gridPos: { row: 2, col: 1 },
    zoneId: 'zone_2_3',
    isCurrent: false,
    status: 'active',
    levelRange: 'Nivel > 10',
    icon: '◆',
    description: i18n.t('places.genesisDesc'),
    landmarks: [
      { id: 'dungeon_threshold', name: i18n.t('places.genesisGate'), icon: '◆', desc: i18n.t('places.genesisGateDesc') },
      { id: 'crypt_catacombs', name: i18n.t('places.genesisGarden'), icon: '◆', desc: i18n.t('places.genesisGardenDesc') },
      { id: 'boss_altar', name: i18n.t('places.genesisSanctum'), icon: '◆', desc: i18n.t('places.genesisSanctumDesc') }
    ]
  }
};

// Notable landmarks in the 3x3 world matching the user capture
const LANDMARKS = {
  // Row 1 (gy = 1)
  '1_1': { name: i18n.t('places.zone11'), title: i18n.t('places.zone11Title') },
  '2_1': { name: i18n.t('places.zone21'), title: i18n.t('places.zone21Title') },
  '3_1': { name: i18n.t('places.zone31'), title: i18n.t('places.zone31Title') },

  // Row 2 (gy = 2)
  '1_2': { name: i18n.t('places.zone12'), title: i18n.t('places.zone12Title') },
  '2_2': { name: i18n.t('places.zone22'), title: i18n.t('places.zone22Title'), hasDojo: true },
  '3_2': { name: i18n.t('places.zone32'), title: i18n.t('places.zone32Title') },

  // Row 3 (gy = 3)
  '1_3': { name: i18n.t('places.zone13'), title: i18n.t('places.zone13Title') },
  '2_3': { name: i18n.t('places.zone23'), title: i18n.t('places.zone23Title') },
  '3_3': { name: i18n.t('places.zone33'), title: i18n.t('places.zone33'), isBoss: true }
};

function generateZoneName(gx, gy, biome) {
  const key = `${gx}_${gy}`;
  if (LANDMARKS[key]) return LANDMARKS[key].name;

  const prefixes = {
    arctic: ['Glacier', 'Plateau', 'Tundra', 'Snowdrift', 'Ridge'],
    savannah: ['Steppe', 'Desert', 'Wasteland', 'Plateau', 'Canyon'],
    forest: ['Grove', 'Meadow', 'Valley', 'Thicket', 'Path'],
    mystic: ['Rift', 'Sanctuary', 'Nebula', 'Abyss', 'Vortex'],
    dungeon: ['Gardens', 'Sanctum', 'Terrace', 'Grove', 'Court']
  };
  const suffixes = {
    arctic: ['of Frost', 'of Ice', 'Snowy', 'Boreal', 'Frozen'],
    savannah: ['of Sand', 'Arid', 'of the Sun', 'of Dust', 'Steppic'],
    forest: ['Green', 'of Lunacia', 'of Wind', 'Blooming', 'Ancestral'],
    mystic: ['Astral', 'of the Void', 'of Shadows', 'Arcane', 'Cosmic'],
    dungeon: ['of Genesis', 'of Origin', 'Royal', 'Ancient', 'Ethereal']
  };

  const pList = prefixes[biome] || prefixes.forest;
  const sList = suffixes[biome] || suffixes.forest;
  const p = pList[(gx * 3 + gy * 7) % pList.length];
  const s = sList[(gx * 5 + gy * 11) % sList.length];
  return `${p} ${s} [${gx}, ${gy}]`;
}

// Master Overworld NPCs distribution for Main & Secondary Quests (3x3 Grid)
export const ZONE_NPCS = {
  // Center Dojo [2, 2]: Paladill (Main 1), Xia (Side 1), Postman (Side 2), Ema (Side 3)
  '2_2': [
    { id: 'paladill', type: 'mentor', position: { x: PALADILL_SPOT.x, y: 0, z: PALADILL_SPOT.z }, rotation: PALADILL_SPOT.rotation, name: i18n.t('npcDefs.paladillName'), model: 'paladill.glb', scale: 2.80, collisionRadius: 1.3, auraRadius: 1.8, title: i18n.t('npcDefs.paladillTitle'), avatar: 'paladill' },
    { id: 'cartographer', type: 'quest_giver', questId: 'quest_world_cartographer', position: { x: -97.3, y: 0, z: 21.3 }, name: 'Xia', model: 'xia.glb', scale: 2.70, collisionRadius: 1.1, auraRadius: 1.6, rotation: 1.2, title: i18n.t('npcDefs.xiaTitle'), bubbleQuote: i18n.t('npcDefs.xiaQuote'), avatar: 'xia' },
    { id: 'postman', type: 'quest_giver', questId: 'quest_lost_mail', position: { x: -2.1, y: 0, z: 10.8 }, rotation: (24.0 * Math.PI) / 180, name: i18n.t('npcDefs.postmanName'), model: 'sapidae-m-a.glb', scale: 2.80, collisionRadius: 1.1, auraRadius: 1.6, title: i18n.t('npcDefs.postmanTitle'), bubbleQuote: i18n.t('npcDefs.postmanQuote'), avatar: 'sapidae-m-a' },
    // Mercader del Valle: al hablar con él abre la Tienda (ShopPanel · SHOPS.dojo_valley). Delante de la tienda del pueblo (ForestVillageLayout)
    // Guardián de los Pergaminos (Hito 51): junto a la Forja; explica cómo funciona y la abre (NPCManager · 'forge_keeper')
    { id: 'scroll_keeper', type: 'forge_keeper', position: { x: SCROLL_KEEPER_SPOT.x, y: 0, z: SCROLL_KEEPER_SPOT.z }, rotation: SCROLL_KEEPER_SPOT.rotation, name: i18n.t('npcDefs.scrollKeeperName'), model: 'scroll_keeper.glb', scale: 2.6, matte: true, collisionRadius: 1.2, title: i18n.t('npcDefs.scrollKeeperTitle'), bubbleQuote: i18n.t('npcDefs.scrollKeeperQuote'), avatar: './assets/portraits/scroll_keeper.png' },
    { id: 'merchant_ochi', type: 'merchant', shopId: 'dojo_valley', position: { x: OCHI_SPOT.x, y: 0, z: OCHI_SPOT.z }, rotation: OCHI_SPOT.rotation, name: i18n.t('npcDefs.ochiName'), model: 'sapidae-m-d.glb', scale: 2.80, collisionRadius: 1.1, auraRadius: 1.6, title: i18n.t('npcDefs.ochiTitle'), bubbleQuote: i18n.t('npcDefs.ochiQuote'), avatar: 'sapidae-m-d' },
    { id: 'herbalist', type: 'quest_giver', questId: 'quest_forest_elixir', position: { x: -15.9, y: 0, z: -30.1 }, rotation: (-15 * Math.PI) / 180, name: 'Ema', model: 'sapidae-f-a.glb', scale: 2.80, collisionRadius: 1.1, auraRadius: 1.6, title: i18n.t('npcDefs.rosalbaTitle'), bubbleQuote: i18n.t('npcDefs.rosalbaQuote'), avatar: 'sapidae-f-a' }
  ],
  // East Savannah Island [3, 2]: Bing (Main 2 Recruit), Sentinel (Main 3 & 4), Blacksmith Baruk (Side 4), Hunter Zarek (Side 5)
  '3_2': [
    { id: 'bing_npc', type: 'recruit', heroId: 'bing', questId: 'quest_prove_ferocity', position: { x: -30.24, y: 0, z: -37.24 }, rotation: Math.PI / 4, name: 'Bing', model: 'bing.glb', title: i18n.t('npcDefs.bingTitle'), bubbleQuote: i18n.t('npcDefs.bingQuote'), avatar: 'bing' },
    { id: 'sentinel', type: 'quest_giver', questId: 'quest_hostile_sands', position: { x: 58.5, y: 0, z: -24.0 }, rotation: -1.8, name: i18n.t('npcDefs.sentinelName'), model: 'kibo.glb', title: i18n.t('npcDefs.sentinelTitle'), bubbleQuote: i18n.t('npcDefs.sentinelQuote'), avatar: 'kibo' },
    { id: 'blacksmith', type: 'quest_giver', questId: 'quest_nomad_steel', position: { x: 42.39, y: 0, z: 48.73 }, rotation: -2.356, name: i18n.t('npcDefs.barukName'), model: 'sapidae-m-b.glb', title: i18n.t('npcDefs.barukTitle'), bubbleQuote: i18n.t('npcDefs.barukQuote'), avatar: 'sapidae-m-b' },
    { id: 'hunter', type: 'quest_giver', questId: 'quest_keen_eye_trial', position: { x: 2.5, y: 0, z: -10.0 }, rotation: (80 * Math.PI) / 180, name: i18n.t('npcDefs.zarekName'), model: 'sapidae-m-c.glb', title: i18n.t('npcDefs.zarekTitle'), bubbleQuote: i18n.t('npcDefs.zarekQuote'), avatar: 'sapidae-m-c' }
  ],
  // Previous North-East Savannah [3, 1] consolidated into Savannah Island [3, 2]
  '3_1': [],
  // North Arctic [2, 1]: Pomodoro (Main 5 Recruit & Main 6), Chef Boreal (Side 6)
  '2_1': [
    { id: 'pomodoro_npc', type: 'recruit', heroId: 'pomodoro', questId: 'quest_frozen_seed', position: { x: 8.0, y: 0, z: 18.6 }, rotation: -0.5, name: 'Pomodoro', model: 'pomodoro.glb', title: i18n.t('npcDefs.pomodoroTitle'), bubbleQuote: i18n.t('npcDefs.pomodoroQuote'), avatar: 'pomodoro' },
    { id: 'chef', type: 'quest_giver', questId: 'quest_blizzard_stew', position: { x: -5.4, y: 0, z: -39.0 }, rotation: -0.3, name: i18n.t('npcDefs.chefName'), model: 'sapidae-m-d.glb', title: i18n.t('npcDefs.chefTitle'), bubbleQuote: i18n.t('npcDefs.chefQuote'), avatar: 'sapidae-m-d' }
  ],
  // North-West Arctic [1, 1]: Glacial Hermit (Side 7)
  '1_1': [
    { id: 'hermit', type: 'quest_giver', questId: 'quest_dark_frost_totems', position: { x: -31.6, y: 0, z: 5.1 }, rotation: 1.85, name: i18n.t('npcDefs.hermitName'), model: 'sapidae-m-e.glb', title: i18n.t('npcDefs.hermitTitle'), bubbleQuote: i18n.t('npcDefs.hermitQuote'), avatar: 'sapidae-m-e' }
  ],
  // West Mystic [1, 2]: Polar Sage (Main 7), Astrologer (Side 8)
  '1_2': [
    { id: 'polar_sage', type: 'quest_giver', questId: 'quest_astral_void_echoes', position: { x: -8.3, y: 0, z: 17.3 }, rotation: -2.0, name: i18n.t('npcDefs.sageName'), model: 'sapidae-f-c.glb', title: i18n.t('npcDefs.sageTitle'), bubbleQuote: i18n.t('npcDefs.sageQuote'), avatar: 'sapidae-f-c' },
    { id: 'astrologer', type: 'quest_giver', questId: 'quest_fallen_stardust', position: { x: 29.8, y: 0, z: -24.7 }, rotation: ((0.6 * Math.PI) / 180), name: i18n.t('npcDefs.astrologerName'), model: 'sapidae-f-b.glb', title: i18n.t('npcDefs.astrologerTitle'), bubbleQuote: i18n.t('npcDefs.astrologerQuote'), avatar: 'sapidae-f-b' }
  ],
  // South-West Mystic [1, 3]: Oracle (Main 8), Spiritual Shaman (Side 9)
  '1_3': [
    { id: 'oracle', type: 'quest_giver', questId: 'quest_forbidden_resonance', position: { x: 13.6, y: 0, z: -24.2 }, rotation: -0.5, name: i18n.t('npcDefs.oracleName'), model: 'sapidae-f-d.glb', title: i18n.t('npcDefs.oracleTitle'), bubbleQuote: i18n.t('npcDefs.oracleQuote'), avatar: 'sapidae-f-d' },
    { id: 'shaman', type: 'quest_giver', questId: 'quest_shadow_mirror', position: { x: 35.3, y: 0, z: 5.9 }, rotation: -1.7, name: i18n.t('npcDefs.shamanName'), model: 'sapidae-f-e.glb', title: i18n.t('npcDefs.shamanTitle'), bubbleQuote: i18n.t('npcDefs.shamanQuote'), avatar: 'sapidae-f-e' }
  ],
  // South Genesis [2, 3]: Kotaro (Main 9), Tripp (Side 10)
  '2_3': [
    { id: 'sulfur_guard', type: 'quest_giver', questId: 'quest_sulfur_threshold', position: { x: 15.0, y: 0, z: 4.2 }, rotation: Math.PI / 2, name: 'Kotaro', model: 'kotaro.glb', title: i18n.t('npcDefs.kotaroTitle'), bubbleQuote: i18n.t('npcDefs.kotaroQuote'), avatar: './assets/portraits/kotaro.png' },
    { id: 'miner', type: 'quest_giver', questId: 'quest_forgotten_miner_relic', position: { x: -50, y: 0, z: -50 }, rotation: 0.785, name: 'Tripp', model: 'tripp.glb', title: i18n.t('npcDefs.trippTitle'), bubbleQuote: i18n.t('npcDefs.trippQuote'), avatar: 'tripp' }
  ],
  // South-East Genesis [3, 3]: Spirit of Atia (Main 10 Final Boss)
  '3_3': [
    {
      id: 'atia_spirit',
      type: 'quest_giver',
      questId: 'quest_primeval_purification',
      position: { x: 0, y: 0, z: -5 },
      rotation: 0,
      name: i18n.t('npcDefs.atiaName'),
      model: 'atias.glb',        // Hito 58: nueva estatua (antes statue_atia.glb); retrato sin cambios
      isStatue: true,
      matte: true,               // luz horneada en la textura (sin mapa de metal/rugosidad)
      scale: 10.2,               // ~10 m de alto: la base ocupa el primer círculo del suelo (radio 4,2 m)
      collisionRadius: 3.9,
      interactRadius: 7.0,       // se habla con ella desde el borde del círculo
      calloutRadius: 11,
      bubbleHeight: 11,
      lightColor: 0x9ff4dc,      // Atia Flame (GenesisLandmarks): luz turquesa-dorada delante del pecho
      lightOffset: [0, 5.0, 3.6],
      title: i18n.t('npcDefs.atiaTitle'),
      bubbleQuote: i18n.t('npcDefs.atiaQuote'),
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
    // Islands: host the NPCs of the retired corner zones (relocated onto the island terrain)
    // and Pomodoro the ferryman on the beach (replaces the cardinal portal arrows).
    if (!MERGED_ZONES[`${gx}_${gy}`]) {
      mergedZonesOf(`${gx}_${gy}`).forEach((mk) => {
        (ZONE_NPCS[mk] || []).forEach((npc) => {
          const def = { ...npc, mergedFrom: mk };
          const p = MERGED_NPC_POSITIONS[npc.id];
          if (p) {
            def.position = { x: p.x, y: 0, z: p.z };
            if (p.rotation !== undefined) def.rotation = p.rotation;
          }
          npcs.push(def);
        });
      });
      const ferryDef = createFerryNpcDef(id);
      if (ferryDef) npcs.push(ferryDef);
    }
    const monsters = [];

    // Dojo Center [2, 2]: Tutorial Chimera Slime
    if (gx === 2 && gy === 2) {
      monsters.push({ id: 'chimera_slime_1', type: 'slime', name: i18n.t('enemies.corruptSlimeChimera'), waypoints: [[14, 0, 2], [17, 0, -2], [16, 0, 5], [13, 0, 4]] });
    } else if (gx === 2) {
      // River corridor zones (gx = 2): keep wandering chimeras on East bank (x >= 13)
      if (biome === 'dungeon') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: i18n.t('enemies.genesisWardenChimera'), waypoints: [[14, 0, 3], [17, 0, -2], [16, 0, 7], [13, 0, 4]] });
      } else if (biome === 'arctic') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: i18n.t('enemies.iceChimera'), waypoints: [[14, 0, -4], [18, 0, -8], [16, 0, -11], [13, 0, -6]] });
      } else {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: i18n.t('enemies.forestChimera'), waypoints: [[14, 0, 2], [17, 0, -3], [16, 0, 5], [13, 0, 3]] });
      }
    } else {
      // Wandering Chimeras by Biome
      if (biome === 'dungeon') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: i18n.t('enemies.genesisWardenChimera'), waypoints: [[7, 0, 3], [10, 0, -2], [8, 0, 7], [4, 0, 4]] });
      } else if (biome === 'arctic') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: i18n.t('enemies.iceChimera'), waypoints: [[6, 0, -4], [10, 0, -8], [5, 0, -11], [2, 0, -6]] });
      } else if (biome === 'savannah') {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: i18n.t('enemies.sandChimera'), waypoints: [[-6, 0, 4], [-11, 0, 2], [-8, 0, -5], [-4, 0, -2]] });
      } else if (biome === 'mystic') {
        const mobName = (gx === 1 && gy === 3) ? i18n.t('enemies.arcaneSapidaeChimera') : i18n.t('enemies.astralVoidChimera');
        const mobType = (gx === 1 && gy === 3) ? 'sapidae' : 'slime';
        monsters.push({ id: `mob_${gx}_${gy}`, type: mobType, name: mobName, waypoints: [[5, 0, 5], [9, 0, 9], [3, 0, 11], [-1, 0, 7]] });
      } else {
        monsters.push({ id: `mob_${gx}_${gy}`, type: 'slime', name: i18n.t('enemies.forestChimera'), waypoints: [[7, 0, 2], [10, 0, -3], [8, 0, 5], [5, 0, 3]] });
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
      monsters,
      mergedInto: MERGED_ZONES[`${gx}_${gy}`] ? `zone_${MERGED_ZONES[`${gx}_${gy}`]}` : null
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

