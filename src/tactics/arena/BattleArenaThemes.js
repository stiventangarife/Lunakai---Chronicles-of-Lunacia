// BattleArenaThemes.js - Dirección de arte de los escenarios de combate por bioma (Hito 35).
// Las paletas salen de los perfiles reales de cada isla (GenshinArtDirection, SavannaGenshinArt,
// ArcticIsland, MysticIsland y DungeonIsland/Genesis) para que el combate se vea como la isla
// donde empezó. Solo datos: BattleArena.js los convierte en geometría.
import * as THREE from 'three';

const NATURE = './assets/nature/';

/** Configuración de IslandTrees (mismos colores y cortezas que en la isla). */
const FOREST_TREES = {
  seed: 35001,
  palettes: {
    green: [0x6fae3c, 0x5c9e36, 0x86bf45],
    orange: [0xf08a2a, 0xf39b35, 0xe8792a],
    red: [0xd8452e, 0xc93a2c, 0xe25a34],
    gold: [0xf3bd3c, 0xeeb02f, 0xf6c950],
    conifer: [0x3f7d4f, 0x37724a, 0x4a8a58],
  },
};

const SAVANNA_TREES = {
  seed: 35002,
  palettes: {
    acacia: [0xa8cf3a, 0x96c23a, 0xbcd648],
    acaciaGold: [0xdccb3c, 0xd2bd34, 0xe6d24a],
    acaciaOrange: [0xf2a142, 0xea9038, 0xf5b04e],
    acaciaRed: [0xf26b52, 0xea5d4a, 0xf47e60],
    palm: [0x7cc03a, 0x8fcf45, 0x6db535],
    deadwood: [0xffffff],
  },
  trunks: {
    acacia: { bark: 'normal', tone: [2.3, 3.6, 5.6] },
    acaciaGold: { bark: 'normal', tone: [2.3, 3.6, 5.6] },
    acaciaOrange: { bark: 'normal', tone: [2.4, 3.4, 5.0] },
    acaciaRed: { bark: 'normal', tone: [2.3, 3.2, 4.8] },
    palm: { bark: 'normal', tone: [2.2, 3.0, 4.2] },
    deadwood: { bark: 'pine', tone: [1.35, 1.22, 1.08] },
  },
};

const ARCTIC_TREES = {
  seed: 35003,
  snow: 0.5,
  palettes: {
    fir: [0x2f6a5a, 0x2a5f55, 0x3b7766, 0x356e60],
    frostdead: [0xffffff],
    firteal: [0x46c8b4, 0x55d6c0, 0x3cb4bf, 0x66dcc8],
    frostbroad: [0x6ccfa6, 0x7edcb4, 0x5cc2a8, 0x90e4c2],
  },
  trunks: {
    fir: { bark: 'pine', tone: [0.72, 0.68, 0.76] },
    frostdead: { bark: 'pine', tone: [1.2, 1.18, 1.25] },
    firteal: { bark: 'pine', tone: [0.85, 0.72, 0.7] },
    frostbroad: { bark: 'normal', tone: [0.95, 0.85, 0.8] },
  },
};

const MYSTIC_TREES = {
  seed: 35004,
  foliageGlow: 0.16,
  palettes: {
    jade: [0x3fbf9a, 0x2fa88a, 0x55d1ab],
    teal: [0x2fb3c4, 0x3bc6d0, 0x29a0b8],
    lavender: [0xb28cff, 0x9f7ae8, 0xc7a5ff],
  },
  trunks: {
    jade: { bark: 'twisted', tone: [0.7, 0.66, 0.8] },
    teal: { bark: 'twisted', tone: [0.66, 0.66, 0.82] },
    lavender: { bark: 'normal', tone: [0.78, 0.68, 0.9] },
  },
};

const GENESIS_TREES = {
  seed: 35005,
  foliageGlow: 0.06,
  palettes: {
    teal: [0x3fc8c0, 0x2fb3b8, 0x55d6c8, 0x45bcc8],
    orange: [0xffa63a, 0xff8f22, 0xffbc5a, 0xffae40],
    bleached: [0xffffff],
  },
  trunks: {
    teal: { bark: 'normal', tone: [0.9, 0.78, 0.72] },
    orange: { bark: 'normal', tone: [0.95, 0.8, 0.7] },
    bleached: { bark: 'pine', tone: [2.1, 1.95, 1.8] },
  },
};

const STYLISED_ROCKS = [1, 2, 3, 4].map((n) => `./assets/rocks/StylisedRockCollection${n}.glb`);

export const ARENA_THEMES = {
  // ───────────────────────────── 🌲 Bosque: hora dorada de Mondstadt ─────────────────────────────
  forest: {
    id: 'forest',
    biome: {
      id: 'arena_forest',
      name: 'Forest of Lunacia',
      skybox: {
        topColor: new THREE.Color(0x3f86d6), midColor: new THREE.Color(0x80bbee),
        horizonColor: new THREE.Color(0xffdcae), cloudSeaColor: new THREE.Color(0xfff7ea),
        sunPosition: new THREE.Vector3(18, 22, 14), sunColor: new THREE.Color(0xfff6dc),
      },
      lighting: { sunColor: 0xffd7a0, sunIntensity: 2.7, hemiSky: 0xb9d6f2, hemiGround: 0x6f8a3c, hemiIntensity: 0.95, rimColor: 0xffd49a, rimIntensity: 1.05 },
      fog: { color: 0xf3d4b0, near: 60, far: 260 },
    },
    sunPosition: new THREE.Vector3(18, 26, 12),
    cloudColor: 0xfff3e2,
    tiles: {
      floor: [0x7cbd45, 0x6aae3c], path: [0xcdb48a, 0xbea47a], bridge: [0x9a7048, 0x8a6240],
      texture: 'grass', side: 0x6b5236,
      accent: { color: 0x9fcf52, chance: 0.18 }, // claros soleados
    },
    water: { shallow: 0x7fe3df, mid: 0x2fb3c4, deep: 0x1a6d93, foam: 0xf4fdff, opacity: 0.82 },
    terrain: {
      ground: [0x2f6b2a, 0x5ea83a, 0x9fd25a], soil: 0x8a6a45, cliff: 0xa79f90, cliffShadow: 0x6f7486,
      cliffTop: 0x6f9a3a, mound: 0.9, edgeDrop: 13,
    },
    rocks: { urls: [`${NATURE}Rock_Medium_1.gltf`, `${NATURE}Rock_Medium_2.gltf`, `${NATURE}Rock_Medium_3.gltf`], style: { base: 0xa79f90, shadow: 0x6f7486, top: 0x6f9a3a, topAmount: 0.9, streaks: 1.0 } },
    treeCfg: FOREST_TREES,
    obstacles: {
      tree: { make: 'tree', kinds: [['broad', 'orange'], ['broad', 'red'], ['broad', 'green'], ['broad', 'gold']], scale: [0.34, 0.4] },
      rock: { make: 'rock', scale: [1.25, 1.5] },
      special: { make: 'tree', kinds: [['broad', 'red']], scale: [0.95, 0.95], great: true }, // el Gran Árbol del centro
    },
    dressing: {
      trees: [['broad', 'green', 3], ['broad', 'orange', 2], ['broad', 'red', 2], ['broad', 'gold', 1], ['conifer', 'conifer', 2]],
      treeCount: 26, treeScale: [0.44, 0.64],
      rockCount: 16,
      plants: [
        { url: `${NATURE}Bush_Common.gltf`, count: 22, scale: [0.8, 1.25] },
        { url: `${NATURE}Bush_Common_Flowers.gltf`, count: 14, scale: [0.8, 1.15] },
        { url: `${NATURE}Fern_1.gltf`, count: 18, scale: [0.9, 1.3] },
        { url: `${NATURE}Flower_3_Group.gltf`, count: 22, scale: [0.9, 1.3], near: true },
        { url: `${NATURE}Flower_4_Group.gltf`, count: 16, scale: [0.9, 1.2], near: true },
        { url: `${NATURE}Grass_Common_Tall.gltf`, count: 60, scale: [0.7, 1.05], near: true },
        { url: `${NATURE}Mushroom_Common.gltf`, count: 8, scale: [0.9, 1.3] },
      ],
    },
    particles: [
      { mode: 'sparkle', count: 160, velocity: [0.12, 0.06, 0.08], size: 2.6, colorA: 0xffe6a0, colorB: 0xfff6d8, intensity: 1.3, opacity: 0.8, sway: 0.6, box: [36, 9, 36] },
    ],
  },

  // ───────────────────────────── 🏜️ Sabana: meseta dorada y arenisca ─────────────────────────────
  savannah: {
    id: 'savannah',
    biome: {
      id: 'arena_savannah',
      name: 'Savanna of Lunacia',
      skybox: {
        topColor: new THREE.Color(0x3a7fd0), midColor: new THREE.Color(0x86b8e6),
        horizonColor: new THREE.Color(0xffd29a), cloudSeaColor: new THREE.Color(0xfff3e0),
        sunPosition: new THREE.Vector3(20, 24, 12), sunColor: new THREE.Color(0xfff1d0),
      },
      lighting: { sunColor: 0xffcf8f, sunIntensity: 2.9, hemiSky: 0xbcd2ec, hemiGround: 0xa8803e, hemiIntensity: 0.95, rimColor: 0xffe08a, rimIntensity: 1.15 },
      fog: { color: 0xf0d4a8, near: 60, far: 260 },
    },
    sunPosition: new THREE.Vector3(20, 28, 10),
    cloudColor: 0xfff0dc,
    tiles: {
      floor: [0xd8b858, 0xc9a849], path: [0xe9cf98, 0xdcbf86], bridge: [0x9a7048, 0x8a6240],
      texture: 'sand', side: 0xa86b3a,
      accent: { color: 0xc9a24a, chance: 0.2 }, // manchas de hierba seca
    },
    water: { shallow: 0x5fd8cf, mid: 0x2aa6bf, deep: 0x1d6698, foam: 0xf6fbf6, opacity: 0.84 },
    terrain: {
      ground: [0x9c7e2c, 0xc6a443, 0xe0c662], soil: 0xc59a62, cliff: 0xd39a5c, cliffShadow: 0x7d6a8a,
      cliffTop: 0xc6a443, strata: [0xa9502a, 0xd2823d, 0xe9b673], mound: 0.7, edgeDrop: 14,
    },
    rocks: {
      urls: ['./assets/nature/rocks/Rock_sabana1.glb', './assets/nature/rocks/Rock_sabana4.glb'],
      style: { base: 0xd39a5c, shadow: 0x7d6a8a, top: 0xc6a443, topAmount: 1.0, strata: 0.7, strataColors: [0xb5653a, 0xd99a55, 0xedc98c], streaks: 1.2 },
    },
    treeCfg: SAVANNA_TREES,
    obstacles: {
      tree: { make: 'tree', kinds: [['acacia', 'acacia'], ['acacia', 'acaciaGold'], ['acacia', 'acaciaOrange'], ['acacia', 'acaciaRed']], scale: [0.36, 0.42] },
      rock: { make: 'rock', scale: [1.3, 1.6] },
      special: { make: 'gltf', url: './assets/savannah/cactus_forge3D.glb', height: [1.9, 2.4], toon: true },
    },
    dressing: {
      trees: [['acacia', 'acacia', 3], ['acacia', 'acaciaGold', 2], ['acacia', 'acaciaOrange', 2], ['acacia', 'acaciaRed', 1], ['palm', 'palm', 2], ['dead', 'deadwood', 1]],
      treeCount: 20, treeScale: [0.44, 0.64],
      rockCount: 14,
      props: [{ url: './assets/savannah/cactus_forge3D.glb', count: 10, height: [1.6, 2.8] }],
      plants: [
        { url: `${NATURE}Grass_Wispy_Tall.gltf`, count: 70, scale: [0.8, 1.25], tint: 0xe2c86a, near: true },
        { url: `${NATURE}Bush_Common.gltf`, count: 14, scale: [0.7, 1.1], tint: 0xc9a24a },
        { url: `${NATURE}Flower_4_Group.gltf`, count: 14, scale: [0.9, 1.2], tint: 0xffb066, near: true },
      ],
    },
    particles: [
      { mode: 'sand', count: 260, velocity: [0.9, 0.05, 0.3], size: 2.2, colorA: 0xf6dfa8, colorB: 0xe8c98a, opacity: 0.55, sway: 0.4, box: [40, 7, 40], additive: false },
      { mode: 'sparkle', count: 120, velocity: [0.1, 0.08, 0.06], size: 2.4, colorA: 0xffe08a, colorB: 0xfff4d0, intensity: 1.3, opacity: 0.8, sway: 0.6, box: [36, 8, 36] },
    ],
  },

  // ───────────────────────────── ❄️ Ártico: nieve, paja escarchada y hielo ─────────────────────────────
  arctic: {
    id: 'arctic',
    biome: {
      id: 'arena_arctic',
      name: 'Arctic of Lunacia',
      skybox: {
        topColor: new THREE.Color(0x4f86c9), midColor: new THREE.Color(0x9cc3e6),
        horizonColor: new THREE.Color(0xffd6c2), cloudSeaColor: new THREE.Color(0xf4f8ff),
        sunPosition: new THREE.Vector3(22, 18, 10), sunColor: new THREE.Color(0xfff4e6),
      },
      lighting: { sunColor: 0xffe0c0, sunIntensity: 2.05, hemiSky: 0x9cc2f0, hemiGround: 0x6f86b8, hemiIntensity: 0.7, rimColor: 0xeaf4ff, rimIntensity: 1.1 },
      fog: { color: 0xd6e6f5, near: 55, far: 240 },
    },
    sunPosition: new THREE.Vector3(22, 24, 8),
    cloudColor: 0xf4f8ff,
    tiles: {
      floor: [0xd3dfec, 0xbfcfe2], path: [0x8fcde8, 0x7bbfdf], bridge: [0x8a6a50, 0x7a5c44],
      texture: 'snow', side: 0x6f7fa6, pathIce: true,
    },
    water: { shallow: 0x6fd3e0, mid: 0x2f8fb8, deep: 0x1b4f86, foam: 0xffffff, opacity: 0.86 },
    terrain: {
      ground: [0x8d97a6, 0xbdb594, 0xe4dfc8], snow: 0xe3ecf6, snowAmount: 0.45, soil: 0x8d8f98, cliff: 0x7d8aa0, cliffShadow: 0x5a6a94,
      cliffTop: 0xf4f8ff, mound: 0.8, edgeDrop: 13,
    },
    rocks: { urls: STYLISED_ROCKS, style: { base: 0x8c97a8, shadow: 0x6f7fa6, top: 0xf4f8ff, topAmount: 1.0, streaks: 0.9 } },
    treeCfg: ARCTIC_TREES,
    obstacles: {
      tree: { make: 'tree', kinds: [['conifer', 'fir'], ['conifer', 'firteal']], scale: [0.36, 0.42] },
      rock: { make: 'rock', scale: [1.25, 1.5] },
      special: { make: 'crystal', color: 0xcfefff, glow: 0x5fb8ff, rim: 0xe8f8ff, opacity: 0.82, glowIntensity: 0.35, height: [1.5, 2.1], shards: 4 },
    },
    dressing: {
      trees: [['conifer', 'fir', 3], ['conifer', 'firteal', 2], ['broad', 'frostbroad', 2], ['dead', 'frostdead', 1]],
      treeCount: 22, treeScale: [0.44, 0.64],
      rockCount: 16,
      crystals: { count: 10, color: 0xcfefff, glow: 0x5fb8ff, rim: 0xe8f8ff, opacity: 0.82, glowIntensity: 0.35 },
      plants: [
        { url: `${NATURE}Grass_Wispy_Tall.gltf`, count: 40, scale: [0.9, 1.3], tint: 0xdcd6b8, near: true },
        { url: `${NATURE}Bush_Common.gltf`, count: 10, scale: [0.7, 1.0], tint: 0x9fb8c8 },
      ],
    },
    particles: [
      { mode: 'snow', count: 520, velocity: [0.45, -1.2, 0.2], size: 4.2, colorA: 0xffffff, colorB: 0xdfefff, opacity: 0.85, sway: 0.7, box: [40, 16, 40], additive: false },
      { mode: 'sparkle', count: 120, velocity: [0.1, 0.06, 0.12], size: 2.0, colorA: 0xbfefff, colorB: 0xffffff, intensity: 1.5, opacity: 0.9, sway: 0.4, box: [32, 6, 32] },
    ],
  },

  // ───────────────────────────── 🔮 Mística: pantano luminoso y amatista ─────────────────────────────
  mystic: {
    id: 'mystic',
    biome: {
      id: 'arena_mystic',
      name: 'Mystic Isle of Lunacia',
      skybox: {
        topColor: new THREE.Color(0x272a6e), midColor: new THREE.Color(0x6a5bb5),
        horizonColor: new THREE.Color(0xff9ec4), cloudSeaColor: new THREE.Color(0xe6dcff),
        sunPosition: new THREE.Vector3(16, 20, 14), sunColor: new THREE.Color(0xffe6f0),
      },
      lighting: { sunColor: 0xffb4c8, sunIntensity: 2.3, hemiSky: 0x8f86e6, hemiGround: 0x2f6f66, hemiIntensity: 1.25, rimColor: 0xffb8e8, rimIntensity: 1.4 },
      fog: { color: 0xb9a8e6, near: 55, far: 230 },
    },
    sunPosition: new THREE.Vector3(16, 24, 14),
    cloudColor: 0xd9ccff,
    tiles: {
      floor: [0x3f9f88, 0x348f7a], path: [0x7a7fb0, 0x6a6f9e], bridge: [0x6a5a8a, 0x5a4c78],
      texture: 'moss', side: 0x3f4566, pathGlow: 0x9fe8ff,
      accent: { color: 0x8f7fd0, chance: 0.22 }, // losas con hierba violeta, como la hierba en dos tonos de la isla
    },
    water: { shallow: 0x3fb0c0, mid: 0x2f5aa8, deep: 0x22276a, foam: 0xc8f4ff, opacity: 0.9, glow: 0x6fe0ff },
    terrain: {
      ground: [0x1f5a4f, 0x2f8f7a, 0x6fd0b0], dry: 0xa98ee0, soil: 0x4a5a6a, cliff: 0x6a6f96, cliffShadow: 0x3f4566,
      cliffTop: 0x2f8f7a, mound: 0.9, edgeDrop: 15,
    },
    rocks: { urls: STYLISED_ROCKS, style: { base: 0x6a6f96, shadow: 0x3f4566, top: 0x2f8f7a, topAmount: 1.0, streaks: 0.7 } },
    treeCfg: MYSTIC_TREES,
    obstacles: {
      tree: { make: 'tree', kinds: [['broad', 'lavender'], ['broad', 'jade'], ['broad', 'teal']], scale: [0.36, 0.42] },
      rock: { make: 'rock', scale: [1.25, 1.5] },
      special: { make: 'crystal', color: 0xb48cff, glow: 0x8a4dff, rim: 0xf0d8ff, opacity: 0.88, glowIntensity: 0.6, height: [1.7, 2.4], shards: 3 },
    },
    dressing: {
      trees: [['broad', 'jade', 3], ['broad', 'teal', 2], ['broad', 'lavender', 3]],
      treeCount: 20, treeScale: [0.44, 0.64],
      rockCount: 12,
      crystals: { count: 12, color: 0xb48cff, glow: 0x8a4dff, rim: 0xf0d8ff, opacity: 0.88, glowIntensity: 0.6 },
      props: [
        { url: './assets/mystic/mushroom_redTall.glb', count: 6, height: [0.9, 1.5], glow: 0.55 },
        { url: './assets/mystic/mushroom_redGroup.glb', count: 8, height: [0.5, 0.8], glow: 0.55 },
        { url: './assets/mystic/mushroom_red.glb', count: 8, height: [0.4, 0.7], glow: 0.55, near: true },
      ],
      plants: [
        { url: './assets/mystic/flower_redA.glb', count: 14, scale: [1.6, 2.2], glow: 0.4, near: true },
        { url: './assets/mystic/flower_redB.glb', count: 14, scale: [1.6, 2.2], glow: 0.4, near: true },
        { url: './assets/mystic/plant_bushDetailed.glb', count: 12, scale: [1.6, 2.4], tint: 0x6fd0b0 },
        { url: `${NATURE}Fern_1.gltf`, count: 14, scale: [0.9, 1.3], tint: 0x6fd0b0 },
      ],
    },
    particles: [
      { mode: 'spores', count: 260, velocity: [0.05, 0.25, 0.05], size: 3.4, colorA: 0x9fffe0, colorB: 0xe0b0ff, intensity: 1.7, opacity: 0.85, sway: 0.9, box: [34, 10, 34] },
    ],
  },

  // ───────────────────────────── ✨ Genesis: Jardines Reales del Origen ─────────────────────────────
  genesis: {
    id: 'genesis',
    biome: {
      id: 'arena_genesis',
      name: 'Genesis — Royal Gardens',
      skybox: {
        topColor: new THREE.Color(0x10163a), midColor: new THREE.Color(0x2c3480),
        horizonColor: new THREE.Color(0x5fd0c8), cloudSeaColor: new THREE.Color(0x8f86c8),
        sunPosition: new THREE.Vector3(14, 22, 16), sunColor: new THREE.Color(0xf6f0ff),
      },
      lighting: { sunColor: 0xfff0dc, sunIntensity: 2.3, hemiSky: 0x9a98d0, hemiGround: 0x3a3a5e, hemiIntensity: 1.25, rimColor: 0xc9a0ff, rimIntensity: 1.5 },
      fog: { color: 0x4a4c90, near: 55, far: 230 },
    },
    sunPosition: new THREE.Vector3(14, 26, 16),
    cloudColor: 0x8f86c8,
    tiles: {
      floor: [0x3a4a8a, 0x323f7a], path: [0xf2c45a, 0xe0b04a], bridge: [0x8a7458, 0x7a6648],
      texture: 'garden', side: 0x232a52, pathGlow: 0xffd98a,
    },
    water: { shallow: 0x3fe0d8, mid: 0x2a90d8, deep: 0x1c3aa0, foam: 0xf0fbff, opacity: 0.8, glow: 0x8ff6ff },
    terrain: {
      ground: [0x161a36, 0x1d2246, 0x283060], dry: 0x332b62, soil: 0x232a52, cliff: 0x9d92d8, cliffShadow: 0x5f5694,
      cliffTop: 0x3a4a8a, mound: 0.7, edgeDrop: 14,
    },
    rocks: { urls: STYLISED_ROCKS, style: { base: 0x9d92d8, shadow: 0x5f5694, top: 0xd2c4fa, topAmount: 0.6, streaks: 0.5 } },
    treeCfg: GENESIS_TREES,
    obstacles: {
      tree: { make: 'tree', kinds: [['broad', 'teal'], ['broad', 'orange']], scale: [0.36, 0.42] },
      rock: { make: 'pedestal' },
      special: { make: 'pillar', height: [2.2, 3.0] },
    },
    dressing: {
      trees: [['broad', 'teal', 3], ['broad', 'orange', 2], ['dead', 'bleached', 1]],
      treeCount: 18, treeScale: [0.44, 0.64],
      rockCount: 10,
      pillars: { count: 9, height: [2.5, 6.5] },
      crystals: { count: 6, color: 0xf2a6c8, glow: 0xff7ac0, rim: 0xffe0f0, opacity: 0.88, glowIntensity: 0.55 },
      plants: [
        { url: `${NATURE}Flower_3_Group.gltf`, count: 18, scale: [0.9, 1.3], tint: 0xc9a0ff, glow: 0.25, near: true },
        { url: `${NATURE}Bush_Common_Flowers.gltf`, count: 12, scale: [0.8, 1.1], tint: 0x7f8fd8 },
        { url: `${NATURE}Grass_Common_Tall.gltf`, count: 40, scale: [0.9, 1.3], tint: 0x5f6fc0, near: true },
      ],
    },
    particles: [
      { mode: 'sparkle', count: 180, velocity: [0.05, 0.12, 0.04], size: 2.6, colorA: 0xffe6a0, colorB: 0xfff6d8, intensity: 1.5, opacity: 0.9, sway: 0.6, box: [36, 9, 36] },
      { mode: 'spores', count: 140, velocity: [0.04, 0.35, 0.03], size: 3.4, colorA: 0xc9a0ff, colorB: 0x8ff6ff, intensity: 1.5, opacity: 0.75, sway: 1.0, box: [36, 12, 36] },
    ],
  },
};

/** Tipo de obstáculo que guarda GridManager por casilla (solo informativo: el arte lo pone BattleArena). */
export function obstacleTypesFor(themeId) {
  const t = ARENA_THEMES[themeId] || ARENA_THEMES.forest;
  return {
    tree: `arena_${themeId}_tree`,
    rock: `arena_${themeId}_${t.obstacles.rock.make}`,
    special: `arena_${themeId}_${t.obstacles.special.make}`,
  };
}
