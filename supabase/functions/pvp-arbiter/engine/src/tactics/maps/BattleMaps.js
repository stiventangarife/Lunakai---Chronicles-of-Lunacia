// BattleMaps.js - Los 15 mapas de combate (3 por bioma) y su selección (Hito 35), y las 6 versiones espejo de la
// Arena PvP (fase P5).
// Datos puros: la leyenda de las casillas está en BattleMapLayout.js.
//
// · Combates normales: uno de los 3 mapas del bioma al azar, sin repetir el último de ese bioma.
// · Jefes: siempre el mapa marcado con `boss: true` de su bioma.
// · Tutorial y niveles antiguos de la campaña: NO usan estos mapas (siguen en el 10×10 de siempre).

import { parseBattleMap } from './BattleMapLayout.js';

/** Bioma del overworld → id del tema de escenario (BattleArenaThemes.js). */
export const OVERWORLD_TO_ARENA_BIOME = {
  forest: 'forest',
  savannah: 'savannah',
  savanna: 'savannah',
  arctic: 'arctic',
  mystic: 'mystic',
  dungeon: 'genesis',
  genesis: 'genesis',
};

export const BATTLE_MAPS = {
  // ─────────────────────────────── 🌲 BOSQUE ───────────────────────────────
  forest_maple_glade: {
    id: 'forest_maple_glade',
    biome: 'forest',
    name: 'Maple Glade',
    nameEs: 'Claro de Arces',
    layout: [
      '##..EE..##',
      '#...EE...#',
      '.......R..',
      '....,,....',
      '.R..,,....',
      '....,,..R.',
      '....,,....',
      '..R.......',
      '#...PP...#',
      '##..PP..##',
    ],
    seed: 3501,
  },
  forest_river_ford: {
    id: 'forest_river_ford',
    biome: 'forest',
    name: 'River Ford',
    nameEs: 'Vado del Río',
    layout: [
      '#....ww....#',
      '..P..ww..E..',
      '.....==..R..',
      '.P...ww...E.',
      '..R..ww.....',
      '.P...ww...E.',
      '.....==..R..',
      '..P..ww..E..',
      '#....ww....#',
    ],
    seed: 3502,
  },
  forest_great_roots: {
    id: 'forest_great_roots',
    biome: 'forest',
    name: 'Roots of the Great Tree',
    nameEs: 'Raíces del Gran Árbol',
    boss: true,
    layout: [
      '###.EEE.###',
      '##...E...##',
      '#.........#',
      '...R...R...',
      '...........',
      '.,...C...,.',
      '...........',
      '...R...R...',
      '#.........#',
      '##...P...##',
      '###.PPP.###',
    ],
    seed: 3503,
  },

  // ─────────────────────────────── 🏜️ SABANA ───────────────────────────────
  savannah_golden_mesa: {
    id: 'savannah_golden_mesa',
    biome: 'savannah',
    name: 'Golden Mesa',
    nameEs: 'Meseta Dorada',
    boss: true,
    layout: [
      '##.......R.##',
      '#.P...,,.E..#',
      '..P.R.,,.C.E.',
      '....C.,,....E',
      '.P....,,.R...',
      '..P...,,..E..',
      '#....C......#',
      '##..R....,.##',
    ],
    seed: 3511,
  },
  savannah_oasis: {
    id: 'savannah_oasis',
    biome: 'savannah',
    name: 'Hidden Oasis',
    nameEs: 'Oasis Escondido',
    layout: [
      '###.....###',
      '##..E.E..##',
      '#....E.C.E#',
      '..R........',
      '....www....',
      '..,wwwww,..',
      '....www....',
      '........R..',
      '#..C.P....#',
      '##..P.P..##',
      '###..P..###',
    ],
    seed: 3512,
  },
  savannah_canyon: {
    id: 'savannah_canyon',
    biome: 'savannah',
    name: 'Sandstone Canyon',
    nameEs: 'Cañón de Arenisca',
    layout: [
      '######..EE..E.',
      '####.....C...E',
      '###..R....,..#',
      '#..,....R...##',
      '#...C....,.###',
      'P......R..####',
      '.P..P.P.######',
    ],
    terrainRise: 3.8, // paredes del cañón: el terreno fuera del tablero sube como acantilado
    seed: 3513,
  },

  // ─────────────────────────────── ❄️ ÁRTICO ───────────────────────────────
  arctic_frozen_lake: {
    id: 'arctic_frozen_lake',
    biome: 'arctic',
    name: 'Frozen Lake',
    nameEs: 'Lago Helado',
    boss: true,
    layout: [
      '##..EE..##',
      '#...EE...#',
      '..C....R..',
      '...,,,,...',
      '.R.,,C,...',
      '...,C,,.R.',
      '...,,,,...',
      '..R....C..',
      '#...PP...#',
      '##..PP..##',
    ],
    seed: 3521,
  },
  arctic_glacier_pass: {
    id: 'arctic_glacier_pass',
    biome: 'arctic',
    name: 'Glacier Pass',
    nameEs: 'Paso Glaciar',
    layout: [
      '#.E.E.#',
      '...E...',
      '.E.C...',
      '.......',
      '..~~.R.',
      '.......',
      'C..,..C',
      '.R.....',
      '...~~..',
      '.......',
      '..P.P..',
      '#.P.P.#',
    ],
    terrainRise: 2.6, // paredes de hielo a ambos lados del paso
    seed: 3522,
  },
  arctic_boreal_camp: {
    id: 'arctic_boreal_camp',
    biome: 'arctic',
    name: 'Boreal Camp',
    nameEs: 'Campamento Boreal',
    layout: [
      '####.EE.####',
      '####E..E####',
      '####.R..####',
      '.....,,..R..',
      '.....CC.....',
      '..R..,,.....',
      '####..R.####',
      '####....####',
      '####P..P####',
      '####.PP.####',
    ],
    seed: 3523,
  },

  // ─────────────────────────────── 🔮 MÍSTICA ───────────────────────────────
  mystic_glow_swamp: {
    id: 'mystic_glow_swamp',
    biome: 'mystic',
    name: 'Glowing Swamp',
    nameEs: 'Pantano Luminoso',
    layout: [
      '##..EEE..##',
      '#....E....#',
      '..ww...C...',
      '.www....ww.',
      '.....,..ww.',
      '.C..www..R.',
      '.ww.,......',
      '.ww...C.ww.',
      '....R....w.',
      '#....P....#',
      '##..PPP..##',
    ],
    seed: 3531,
  },
  mystic_crystal_isles: {
    id: 'mystic_crystal_isles',
    biome: 'mystic',
    name: 'Crystal Isles',
    nameEs: 'Islas de Cristal',
    layout: [
      '##.E.E.E.##',
      '#....E....#',
      '#..C...C..#',
      '~~~~=~=~~~~',
      '~~...~...~~',
      '~~.C.~.T.~~',
      '~~...~...~~',
      '~~~~=~=~~~~',
      '#.........#',
      '#..P.P.P..#',
      '##...P...##',
    ],
    floating: true, // las islas flotan: el vacío deja ver el mar de nubes
    seed: 3532,
  },
  mystic_arcane_circle: {
    id: 'mystic_arcane_circle',
    biome: 'mystic',
    name: 'Arcane Circle',
    nameEs: 'Círculo Arcano',
    boss: true,
    layout: [
      '###.EEE.###',
      '##...E...##',
      '#.C.....C.#',
      '....,,,....',
      '.C.,...,.C.',
      '...,.R.,...',
      '.C.,...,.C.',
      '....,,,....',
      '#.C.....C.#',
      '##...P...##',
      '###.PPP.###',
    ],
    seed: 3533,
  },

  // ─────────────────────────────── ✨ GENESIS ───────────────────────────────
  genesis_royal_garden: {
    id: 'genesis_royal_garden',
    biome: 'genesis',
    name: 'Royal Garden',
    nameEs: 'Jardín Real',
    layout: [
      '#....EE....#',
      '..T..EE..T..',
      '....,,,,....',
      '.C..,..,..C.',
      '....,..,....',
      ',,,,,RR,,,,,',
      ',,,,,RR,,,,,',
      '....,..,....',
      '.C..,..,..C.',
      '....,,,,....',
      '..T..PP..T..',
      '#....PP....#',
    ],
    seed: 3541,
  },
  genesis_sanctum_gate: {
    id: 'genesis_sanctum_gate',
    biome: 'genesis',
    name: 'Sanctum Gate',
    nameEs: 'Puerta del Santuario',
    layout: [
      '##.E.E.##',
      '#..E.E..#',
      '.C.....C.',
      '...,,,...',
      '.C.,.,.C.',
      '...,R,...',
      '.C.,.,.C.',
      '...,,,...',
      '.C.....C.',
      '#..P.P..#',
      '##.P.P.##',
    ],
    seed: 3542,
  },
  genesis_sanctum_origin: {
    id: 'genesis_sanctum_origin',
    biome: 'genesis',
    name: 'Sanctum of Origin',
    nameEs: 'Santuario del Origen',
    boss: true,
    layout: [
      '####.EEE.####',
      '##....E....##',
      '#..C.....C..#',
      '#...........#',
      '..C..,,,..C..',
      '....,...,....',
      '....,.R.,....',
      '....,...,....',
      '..C..,,,..C..',
      '#..C.....C..#',
      '##....P....##',
      '####.PPP.####',
    ],
    seed: 3543,
  },
  // ─────────────────────── ⚔️ ARENA PvP (fase P5): versiones espejo ───────────────────────
  // Simétricas con un giro de media vuelta (180°): los dos bandos tienen el mismo tablero, cada uno desde su lado.
  // Salen de la mitad de un bando del mapa original (tools/pvp/mirror-map.mjs) y solo se usan en la Arena
  // (`pvp: true`: fuera de la selección por bioma). Lista de la Arena y medidas: docs/PLAN_ARENA_PVP.md, sección 16.
  pvp_savannah_oasis: {
    id: 'pvp_savannah_oasis',
    biome: 'savannah',
    name: 'Hidden Oasis (Arena)',
    nameEs: 'Oasis Escondido (Arena)',
    pvp: true,
    mirrorOf: 'savannah_oasis',
    layout: [
      '###..E..###',
      '##..E.E..##',
      '#....E.C..#',
      '..R........',
      '....www....',
      '..,wwwww,..',
      '....www....',
      '........R..',
      '#..C.P....#',
      '##..P.P..##',
      '###..P..###',
    ],
    seed: 3612,
  },
  pvp_savannah_canyon: {
    id: 'pvp_savannah_canyon',
    biome: 'savannah',
    name: 'Sandstone Canyon (Arena)',
    nameEs: 'Cañón de Arenisca (Arena)',
    pvp: true,
    mirrorOf: 'savannah_canyon',
    layout: [
      '######.E.E..E.',
      '####..R......E',
      '###.,....C...#',
      '##...R..R...##',
      '#...C....,.###',
      'P......R..####',
      '.P..P.P.######',
    ],
    terrainRise: 3.8,
    seed: 3613,
  },
  pvp_arctic_glacier_pass: {
    id: 'pvp_arctic_glacier_pass',
    biome: 'arctic',
    name: 'Glacier Pass (Arena)',
    nameEs: 'Paso Glaciar (Arena)',
    pvp: true,
    mirrorOf: 'arctic_glacier_pass',
    layout: [
      '#.E.E.#',
      '..E.E..',
      '.......',
      '..~~...',
      '.....R.',
      'C..,..C',
      'C..,..C',
      '.R.....',
      '...~~..',
      '.......',
      '..P.P..',
      '#.P.P.#',
    ],
    terrainRise: 2.6,
    seed: 3622,
  },
  pvp_arctic_boreal_camp: {
    id: 'pvp_arctic_boreal_camp',
    biome: 'arctic',
    name: 'Boreal Camp (Arena)',
    nameEs: 'Campamento Boreal (Arena)',
    pvp: true,
    mirrorOf: 'arctic_boreal_camp',
    layout: [
      '####.EE.####',
      '####E..E####',
      '####.R..####',
      '.....,,..R..',
      '.....CC.....',
      '.....CC.....',
      '..R..,,.....',
      '####..R.####',
      '####P..P####',
      '####.PP.####',
    ],
    seed: 3623,
  },
  pvp_mystic_glow_swamp: {
    id: 'pvp_mystic_glow_swamp',
    biome: 'mystic',
    name: 'Glowing Swamp (Arena)',
    nameEs: 'Pantano Luminoso (Arena)',
    pvp: true,
    mirrorOf: 'mystic_glow_swamp',
    layout: [
      '##..EEE..##',
      '#....E....#',
      '..ww...C...',
      '.www....ww.',
      '.....,..ww.',
      '.C..www..C.',
      '.ww..,.....',
      '.ww....www.',
      '...C...ww..',
      '#....P....#',
      '##..PPP..##',
    ],
    seed: 3631,
  },
  pvp_mystic_crystal_isles: {
    id: 'pvp_mystic_crystal_isles',
    biome: 'mystic',
    name: 'Crystal Isles (Arena)',
    nameEs: 'Islas de Cristal (Arena)',
    pvp: true,
    mirrorOf: 'mystic_crystal_isles',
    layout: [
      '##.E.E.E.##',
      '#....E....#',
      '#..C...C..#',
      '~~~~=~=~~~~',
      '~~...~...~~',
      '~~.C.~.C.~~',
      '~~...~...~~',
      '~~~~=~=~~~~',
      '#..C...C..#',
      '#....P....#',
      '##.P.P.P.##',
    ],
    floating: true,
    seed: 3632,
  },
};

const _parsed = new Map();
/** Mapa ya interpretado (con casillas, obstáculos y salidas). Se cachea. */
export function getBattleMap(id) {
  const def = BATTLE_MAPS[id];
  if (!def) return null;
  if (!_parsed.has(id)) _parsed.set(id, { ...def, ...parseBattleMap(def) });
  return _parsed.get(id);
}

/** Mapas del bioma para los combates normales (las versiones espejo de la Arena, `pvp: true`, no entran). */
export function getBattleMapsForBiome(arenaBiome) {
  return Object.values(BATTLE_MAPS).filter((m) => m.biome === arenaBiome && !m.pvp).map((m) => m.id);
}

const _lastPick = {};
let _forcedMapId = null;

/** Consola: lkDebug.map('savannah_oasis') fuerza ese mapa en los siguientes combates; lkDebug.map(null) lo quita. */
export function forceBattleMap(id) {
  _forcedMapId = id && BATTLE_MAPS[id] ? id : null;
  return _forcedMapId;
}
export function getForcedBattleMap() { return _forcedMapId; }

/**
 * Elige el mapa de un combate.
 * @param {string} overworldBiome  forest · savannah · arctic · mystic · dungeon
 * @param {{ isBoss?: boolean, rng?: () => number }} opts
 */
export function pickBattleMap(overworldBiome, opts = {}) {
  if (_forcedMapId) return getBattleMap(_forcedMapId);
  const biome = OVERWORLD_TO_ARENA_BIOME[overworldBiome] || 'forest';
  const ids = getBattleMapsForBiome(biome);
  if (!ids.length) return null;
  if (opts.isBoss) {
    const bossId = ids.find((id) => BATTLE_MAPS[id].boss) || ids[0];
    return getBattleMap(bossId);
  }
  const rng = opts.rng || Math.random;
  // Sin repetir el último mapa de este bioma
  const pool = ids.length > 1 && _lastPick[biome] ? ids.filter((id) => id !== _lastPick[biome]) : ids;
  const id = pool[Math.floor(rng() * pool.length) % pool.length];
  _lastPick[biome] = id;
  return getBattleMap(id);
}
