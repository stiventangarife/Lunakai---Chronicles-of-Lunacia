// Biomes.js - Stage Environments, Skybox Themes, Lighting & Tile Layouts
import * as THREE from 'three';
import * as i18n from '../i18n/i18n.js';

export const BIOMES = {
  training_dojo: {
    id: 'training_dojo',
    name: i18n.t('levels.place.trainingDojo'),
    description: i18n.t('levels.biome.training_dojo.description'),
    tileTheme: 'wood_dojo', // wood center + grass borders
    skybox: {
      topColor: new THREE.Color(0x0284c7),
      midColor: new THREE.Color(0x38bdf8),
      horizonColor: new THREE.Color(0xbae6fd),
      cloudSeaColor: new THREE.Color(0xf0fdf4),
      sunPosition: new THREE.Vector3(18, 30, 14),
      sunColor: new THREE.Color(0xfffbeb)
    },
    lighting: {
      sunColor: 0xfff7ed,
      sunIntensity: 2.6,
      hemiSky: 0x7dd3fc,
      hemiGround: 0x854d0e, // warm wood reflection
      hemiIntensity: 0.75,
      rimColor: 0xffedd5,
      rimIntensity: 1.1
    },
    fog: {
      color: 0xc2e2fa,
      near: 55,
      far: 240
    },
    obstacleType: 'wood_post'
  },

  lunacia_plains: {
    id: 'lunacia_plains',
    name: i18n.t('levels.place.runicValley'),
    description: i18n.t('levels.biome.lunacia_plains.description'),
    tileTheme: 'plains_cobble', // grass with cobblestone crossing
    skybox: {
      topColor: new THREE.Color(0x0369a1),
      midColor: new THREE.Color(0x0ea5e9),
      horizonColor: new THREE.Color(0x7dd3fc),
      cloudSeaColor: new THREE.Color(0xe0f2fe),
      sunPosition: new THREE.Vector3(16, 28, 14),
      sunColor: new THREE.Color(0xffedd5)
    },
    lighting: {
      sunColor: 0xfff6ea,
      sunIntensity: 2.8,
      hemiSky: 0x70b4ff,
      hemiGround: 0x425e36, // lush meadow bounce
      hemiIntensity: 0.75,
      rimColor: 0xa5d8ff,
      rimIntensity: 1.25
    },
    fog: {
      color: 0xc2e2fa,
      near: 55,
      far: 240
    },
    obstacleType: 'pillar_rock'
  },

  frozen_peaks: {
    id: 'frozen_peaks',
    name: i18n.t('levels.place.glacier'),
    description: i18n.t('levels.biome.frozen_peaks.description'),
    tileTheme: 'ice_rock', // ice tiles + slate rock borders
    skybox: {
      topColor: new THREE.Color(0x075985),
      midColor: new THREE.Color(0x0284c7),
      horizonColor: new THREE.Color(0xa5f3fc),
      cloudSeaColor: new THREE.Color(0xf0fdfa),
      sunPosition: new THREE.Vector3(25, 18, 10),
      sunColor: new THREE.Color(0xe0f2fe)
    },
    lighting: {
      sunColor: 0xf0f9ff,
      sunIntensity: 3.0,
      hemiSky: 0x38bdf8,
      hemiGround: 0x0369a1, // deep cold blue bounce
      hemiIntensity: 0.85,
      rimColor: 0x67e8f9,
      rimIntensity: 1.4
    },
    fog: {
      color: 0xbae6fd,
      near: 50,
      far: 220
    },
    obstacleType: 'ice_crystal'
  },

  mystic_grove: {
    id: 'mystic_grove',
    name: i18n.t('levels.place.mysticGrove'),
    description: i18n.t('levels.biome.mystic_grove.description'),
    tileTheme: 'grass_water',
    skybox: {
      topColor: new THREE.Color(0x065f46),
      midColor: new THREE.Color(0x059669),
      horizonColor: new THREE.Color(0x6ee7b7),
      cloudSeaColor: new THREE.Color(0xecfdf5),
      sunPosition: new THREE.Vector3(18, 28, 12),
      sunColor: new THREE.Color(0xfef08a)
    },
    lighting: {
      sunColor: 0xfef9c3,
      sunIntensity: 2.7,
      hemiSky: 0x34d399,
      hemiGround: 0x064e3b,
      hemiIntensity: 0.8,
      rimColor: 0xa7f3d0,
      rimIntensity: 1.2
    },
    fog: {
      color: 0xa7f3d0,
      near: 50,
      far: 230
    },
    obstacleType: 'wood_post'
  },

  canyon_rock: {
    id: 'canyon_rock',
    name: i18n.t('levels.place.rockyCanyon'),
    description: i18n.t('levels.biome.canyon_rock.description'),
    tileTheme: 'dirt_rock',
    skybox: {
      topColor: new THREE.Color(0x78350f),
      midColor: new THREE.Color(0xd97706),
      horizonColor: new THREE.Color(0xfde68a),
      cloudSeaColor: new THREE.Color(0xffedd5),
      sunPosition: new THREE.Vector3(22, 22, 16),
      sunColor: new THREE.Color(0xfef3c7)
    },
    lighting: {
      sunColor: 0xffedd5,
      sunIntensity: 2.9,
      hemiSky: 0xfbbf24,
      hemiGround: 0x713f12,
      hemiIntensity: 0.8,
      rimColor: 0xfcd34d,
      rimIntensity: 1.3
    },
    fog: {
      color: 0xfde68a,
      near: 55,
      far: 230
    },
    obstacleType: 'pillar_rock'
  },

  boss_arena: {
    id: 'boss_arena',
    name: i18n.t('levels.place.ceremonialThrone'),
    description: i18n.t('levels.biome.boss_arena.description'),
    tileTheme: 'rock_cobble_runic',
    skybox: {
      topColor: new THREE.Color(0x1e1b4b),
      midColor: new THREE.Color(0x4338ca),
      horizonColor: new THREE.Color(0xa855f7),
      cloudSeaColor: new THREE.Color(0xf3e8ff),
      sunPosition: new THREE.Vector3(15, 26, 12),
      sunColor: new THREE.Color(0xfef08a)
    },
    lighting: {
      sunColor: 0xffedd5,
      sunIntensity: 3.1,
      hemiSky: 0x818cf8,
      hemiGround: 0x312e81,
      hemiIntensity: 0.85,
      rimColor: 0xc084fc,
      rimIntensity: 1.5
    },
    fog: {
      color: 0xddd6fe,
      near: 45,
      far: 210
    },
    obstacleType: 'pillar_rock'
  }
};
