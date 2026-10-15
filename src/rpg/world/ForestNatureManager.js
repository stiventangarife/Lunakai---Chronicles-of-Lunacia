// ForestNatureManager.js - Comprehensive Stylized Nature across all 9 Forest Macro-Zones
// Zones: [2,2], [3,2], [4,2], [2,3], [3,3], [4,3], [2,4], [3,4], [4,4]
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';

// Simple deterministic pseudo-random generator
function createRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ==============================================================================
// 1. ZONE [3, 3] (VALLE DEL DOJO) - HANDCRAFTED LAYOUTS (Preserved 100%)
// ==============================================================================
const DOJO_BUSHES_3_3 = [
  // Dojo Pagoda Porch & Foundation Walls (x: -10.5, z: -15.5)
  { x: -13.8, y: 0.0, z: -10.8, scale: 0.95, rotationY: 0.5, type: 'flowers' },
  { x: -7.2,  y: 0.0, z: -10.8, scale: 1.05, rotationY: 2.1, type: 'flowers' },
  { x: -15.5, y: 0.0, z: -15.0, scale: 1.15, rotationY: 1.2, type: 'flowers' },
  { x: -5.5,  y: 0.0, z: -15.0, scale: 0.90, rotationY: 3.7, type: 'flowers' },
  { x: -10.5, y: 0.0, z: -21.2, scale: 1.25, rotationY: 1.6, type: 'flowers' },

  // Master Paladill Training Area Surroundings (x: -14.5, z: -8.5)
  { x: -17.5, y: 0.0, z: -7.2,  scale: 0.85, rotationY: 0.9, type: 'flowers' },

  // South-West Sanctuary Ruins & Column Bases
  { x: -21.8, y: 0.0, z: -6.2,  scale: 1.10, rotationY: 1.7, type: 'flowers' },
  { x: -24.2, y: 0.0, z: -3.8,  scale: 0.95, rotationY: 0.4, type: 'flowers' },
  { x: -17.5, y: 0.0, z: -3.8,  scale: 1.00, rotationY: 3.1, type: 'flowers' },
  { x: -19.5, y: 0.0, z: -0.8,  scale: 0.85, rotationY: 2.0, type: 'flowers' },

  // North Giant Monolith Backdrop
  { x: -14.2, y: 0.0, z: -24.0, scale: 1.25, rotationY: 0.7, type: 'flowers' },
  { x: -8.8,  y: 0.0, z: -24.5, scale: 1.15, rotationY: 2.8, type: 'flowers' },

  // West Riverbank
  { x: 3.2,   y: 0.0, z: -4.5,  scale: 1.05, rotationY: 1.5, type: 'flowers' },
  { x: 3.6,   y: 0.0, z: 3.8,   scale: 0.90, rotationY: 0.3, type: 'flowers' },
  { x: 2.8,   y: 0.0, z: -11.5, scale: 1.15, rotationY: 2.6, type: 'flowers' },

  // East Riverbank
  { x: 13.6,  y: 0.0, z: -4.0,  scale: 1.10, rotationY: 3.4, type: 'flowers' },
  { x: 14.0,  y: 0.0, z: 4.5,   scale: 0.95, rotationY: 1.1, type: 'flowers' },
  { x: 13.2,  y: 0.0, z: -11.0, scale: 1.20, rotationY: 0.6, type: 'flowers' },

  // North-West Bamboo Grove Margins
  { x: -16.5, y: 0.0, z: -28.5, scale: 1.15, rotationY: 1.9, type: 'flowers' },
  { x: -7.5,  y: 0.0, z: -29.0, scale: 1.05, rotationY: 4.0, type: 'flowers' },

  // Framing Japanese Red Autumn Maples
  { x: -22.8, y: 0.0, z: -13.2, scale: 0.95, rotationY: 2.2, type: 'flowers' },
  { x: 19.8,  y: 0.0, z: -12.2, scale: 1.00, rotationY: 1.4, type: 'flowers' },
  { x: 18.8,  y: 0.0, z: 18.8,  scale: 1.10, rotationY: 0.8, type: 'flowers' },
  { x: -17.2, y: 0.0, z: 23.2,  scale: 1.05, rotationY: 3.3, type: 'flowers' },

  // --- Handcrafted Bush_Common (Verde Bosque) Clusters ---
  // Cluster 1: -32.1, 4.6 (West Meadow / Pond approach)
  { x: -32.1, y: 0.0, z: 4.6,  scale: 1.15, rotationY: 0.8, type: 'common' },
  { x: -31.3, y: 0.0, z: 5.3,  scale: 0.95, rotationY: 2.3, type: 'common' },
  { x: -32.8, y: 0.0, z: 4.0,  scale: 1.05, rotationY: 4.1, type: 'common' },

  // Cluster 2: -27.2, -6.7 (South-West Sanctuary ruins margin)
  { x: -27.2, y: 0.0, z: -6.7, scale: 1.20, rotationY: 1.4, type: 'common' },
  { x: -26.5, y: 0.0, z: -7.4, scale: 0.92, rotationY: 3.2, type: 'common' },
  { x: -27.9, y: 0.0, z: -6.1, scale: 1.08, rotationY: 5.0, type: 'common' },

  // Cluster 3: -36.3, -8.3 (Far South-West Wild Glade)
  { x: -36.3, y: 0.0, z: -8.3, scale: 1.10, rotationY: 0.5, type: 'common' },
  { x: -35.6, y: 0.0, z: -7.7, scale: 0.95, rotationY: 2.7, type: 'common' },
  { x: -37.0, y: 0.0, z: -8.9, scale: 1.15, rotationY: 4.3, type: 'common' },

  // Cluster 4: -15.8, 6.4 (South-Central Meadow)
  { x: -15.8, y: 0.0, z: 6.4,  scale: 1.15, rotationY: 1.9, type: 'common' },
  { x: -16.5, y: 0.0, z: 7.1,  scale: 0.90, rotationY: 3.8, type: 'common' },
  { x: -15.1, y: 0.0, z: 5.8,  scale: 1.05, rotationY: 0.2, type: 'common' },

  // Cluster 5: -5.0, -7.2 (South of Dojo Pagoda / Training Area)
  { x: -5.0,  y: 0.0, z: -7.2, scale: 1.10, rotationY: 2.5, type: 'common' },
  { x: -4.3,  y: 0.0, z: -6.5, scale: 0.95, rotationY: 4.6, type: 'common' },
  { x: -5.7,  y: 0.0, z: -7.9, scale: 1.15, rotationY: 1.1, type: 'common' },

  // --- North-East Glade & Monolith Surroundings (NE Macro-Zone [3, 3]) ---
  { x: 28.2,  y: 0.0, z: -20.5, scale: 1.10, rotationY: 1.2, type: 'common' },
  { x: 23.5,  y: 0.0, z: -24.2, scale: 1.05, rotationY: 2.8, type: 'flowers' },
  { x: 27.5,  y: 0.0, z: -23.5, scale: 0.95, rotationY: 4.1, type: 'common' },
  { x: 21.5,  y: 0.0, z: -17.5, scale: 1.00, rotationY: 0.7, type: 'flowers' },
  { x: 22.8,  y: 0.0, z: -16.2, scale: 1.15, rotationY: 2.3, type: 'common' },
  { x: 30.5,  y: 0.0, z: -16.0, scale: 1.05, rotationY: 3.5, type: 'common' },
  { x: 32.0,  y: 0.0, z: -17.5, scale: 0.90, rotationY: 1.9, type: 'flowers' },

  // --- South-East Meadow & Large Rock Surroundings (SE [31.5, 32.2] Macro-Zone [3, 3]) ---
  { x: 29.0,  y: 0.0, z: 30.5,  scale: 1.15, rotationY: 1.1, type: 'common' },
  { x: 33.8,  y: 0.0, z: 34.0,  scale: 1.05, rotationY: 3.4, type: 'flowers' },
  { x: 34.5,  y: 0.0, z: 30.2,  scale: 0.95, rotationY: 4.8, type: 'common' },
  { x: 28.2,  y: 0.0, z: 34.2,  scale: 1.10, rotationY: 2.2, type: 'flowers' },
  { x: 32.0,  y: 0.0, z: 28.5,  scale: 1.00, rotationY: 0.5, type: 'common' }
];

const DOJO_MUSHROOMS_COMMON_3_3 = [
  { x: -20.8, y: 0.0, z: -13.8, scale: 1.15, rotationY: 0.4 },
  { x: 19.2,  y: 0.0, z: -14.2, scale: 1.10, rotationY: 2.8 },
  { x: 21.2,  y: 0.0, z: 16.8,  scale: 1.05, rotationY: 1.9 },
  { x: -17.8, y: 0.0, z: 22.8,  scale: 1.10, rotationY: 3.2 },
  { x: -28.8, y: 0.0, z: -22.4, scale: 1.20, rotationY: 0.9 },
  { x: -31.2, y: 0.0, z: -11.5, scale: 1.05, rotationY: 2.1 },
  { x: 25.8,  y: 0.0, z: -24.0, scale: 1.10, rotationY: 4.0 },
  { x: 27.8,  y: 0.0, z: 8.2,   scale: 1.15, rotationY: 1.5 },
  { x: -28.8, y: 0.0, z: 25.8,  scale: 1.10, rotationY: 0.6 },
  { x: 17.2,  y: 0.0, z: 27.8,  scale: 1.05, rotationY: 2.7 },
  // NE Large Rock & Pine Base
  { x: 24.2,  y: 0.0, z: -20.2, scale: 1.20, rotationY: 1.1 },
  { x: 26.8,  y: 0.0, z: -22.8, scale: 1.10, rotationY: 2.9 },
  { x: 27.2,  y: 0.0, z: -19.8, scale: 1.05, rotationY: 0.4 },
  { x: 30.8,  y: 0.0, z: -15.5, scale: 1.15, rotationY: 2.3 },
  // SE Large Rock & Meadow Base (31.5, 32.2)
  { x: 30.2,  y: 0.0, z: 31.0,  scale: 1.20, rotationY: 1.4 },
  { x: 32.8,  y: 0.0, z: 33.5,  scale: 1.10, rotationY: 3.1 },
  { x: 33.2,  y: 0.0, z: 31.2,  scale: 1.05, rotationY: 0.7 },
  { x: 29.5,  y: 0.0, z: 33.8,  scale: 1.15, rotationY: 2.5 }
];

const DOJO_MUSHROOMS_LAETIPORUS_3_3 = [
  { x: -21.9, y: 0.35, z: -14.1, scale: 1.15, rotationY: 1.1 },
  { x: 18.2,  y: 0.35, z: -13.6, scale: 1.10, rotationY: 3.5 },
  { x: 20.2,  y: 0.35, z: 17.6,  scale: 1.20, rotationY: 2.4 },
  { x: -18.6, y: 0.35, z: 21.6,  scale: 1.05, rotationY: 0.8 },
  { x: -29.6, y: 0.40, z: -22.8, scale: 1.25, rotationY: 1.6 },
  { x: -31.8, y: 0.35, z: -10.8, scale: 1.10, rotationY: 2.9 },
  { x: 26.6,  y: 0.40, z: -24.6, scale: 1.15, rotationY: 4.4 },
  { x: 28.6,  y: 0.35, z: 7.4,   scale: 1.05, rotationY: 1.8 },
  { x: -29.4, y: 0.35, z: 26.6,  scale: 1.10, rotationY: 0.9 },
  { x: 16.4,  y: 0.35, z: 28.4,  scale: 1.20, rotationY: 3.3 },
  // NE Large Rock Crevices & Tree base
  { x: 24.0,  y: 0.35, z: -21.0, scale: 1.15, rotationY: 1.8 },
  { x: 26.2,  y: 0.40, z: -22.5, scale: 1.25, rotationY: 3.7 },
  { x: 21.0,  y: 0.35, z: -15.2, scale: 1.10, rotationY: 2.1 },
  { x: 28.5,  y: 0.35, z: -20.0, scale: 1.10, rotationY: 0.9 },
  // SE Large Rock Crevices (31.5, 32.2)
  { x: 30.0,  y: 0.35, z: 31.8,  scale: 1.20, rotationY: 2.0 },
  { x: 32.2,  y: 0.40, z: 33.2,  scale: 1.25, rotationY: 4.1 },
  { x: 33.5,  y: 0.35, z: 31.8,  scale: 1.10, rotationY: 0.8 }
];

const DOJO_PLANTS_3_3 = [
  // North-East Meadow & Large Rock Surroundings (NE Macro-Zone [3, 3])
  { x: 23.2, y: 0.0, z: -19.5, scale: 1.10, rotationY: 0.8, type: 'fern' },
  { x: 27.8, y: 0.0, z: -21.0, scale: 1.00, rotationY: 2.1, type: 'fern' },
  { x: 25.0, y: 0.0, z: -23.8, scale: 1.15, rotationY: 4.0, type: 'fern' },
  { x: 29.5, y: 0.0, z: -19.0, scale: 1.05, rotationY: 1.5, type: 'fern' },
  { x: 22.0, y: 0.0, z: -18.0, scale: 1.10, rotationY: 3.2, type: 'flower3' },
  { x: 24.5, y: 0.0, z: -16.5, scale: 0.95, rotationY: 0.4, type: 'flower4' },
  { x: 28.5, y: 0.0, z: -22.5, scale: 1.05, rotationY: 2.7, type: 'flower3' },
  { x: 31.0, y: 0.0, z: -18.2, scale: 1.00, rotationY: 1.9, type: 'flower4' },
  { x: 26.5, y: 0.0, z: -15.5, scale: 0.90, rotationY: 4.5, type: 'flower3' },
  { x: 33.0, y: 0.0, z: -20.5, scale: 1.10, rotationY: 0.9, type: 'flower4' },

  // South-East Meadow & Large Rock Surroundings (SE [31.5, 32.2] Macro-Zone [3, 3])
  { x: 29.8, y: 0.0, z: 31.2,  scale: 1.10, rotationY: 1.2, type: 'fern' },
  { x: 33.0, y: 0.0, z: 33.8,  scale: 1.05, rotationY: 2.9, type: 'fern' },
  { x: 31.2, y: 0.0, z: 34.5,  scale: 1.15, rotationY: 4.3, type: 'fern' },
  { x: 34.0, y: 0.0, z: 32.5,  scale: 0.95, rotationY: 0.6, type: 'fern' },
  { x: 28.5, y: 0.0, z: 32.0,  scale: 1.10, rotationY: 3.5, type: 'flower3' },
  { x: 31.0, y: 0.0, z: 29.5,  scale: 1.00, rotationY: 1.8, type: 'flower4' },
  { x: 34.5, y: 0.0, z: 33.5,  scale: 1.05, rotationY: 2.4, type: 'flower3' },
  { x: 30.5, y: 0.0, z: 35.0,  scale: 0.95, rotationY: 4.0, type: 'flower4' }
];

function generateDojoPetals3_3() {
  const rng = createRng(3033);
  const petals1 = [];
  const petals2 = [];

  const addPetal = (x, z, scale = 1.0) => {
    const isRoad = (Math.abs(x) < 2.8 && z > -12 && z < 28) || (Math.abs(z) < 2.5 && x > -28 && x < 28);
    const inRiver = (x > 2.0 && x < 15.0);
    const inPond = Math.hypot(x - (-30.3), z - 12.0) < 5.0;
    if (isRoad || inRiver || inPond) return;

    const rotY = rng() * Math.PI * 2;
    const finalScale = scale * (0.8 + rng() * 0.4);
    const item = { x, y: 0.003, z, rotY, scale: finalScale };
    if (rng() > 0.5) petals1.push(item);
    else petals2.push(item);
  };

  DOJO_BUSHES_3_3.forEach(b => {
    for (let i = 0; i < 5; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 0.9 + rng() * 1.8;
      addPetal(b.x + Math.cos(angle) * dist, b.z + Math.sin(angle) * dist, 0.95);
    }
  });

  const MEADOW_CENTERS = [
    { cx: -8.0, cz: 8.0, count: 18, r: 5.0 },
    { cx: -18.0, cz: 14.0, count: 20, r: 6.0 },
    { cx: 5.0, cz: 10.0, count: 16, r: 4.5 },
    { cx: 18.0, cz: 8.0, count: 18, r: 6.0 },
    { cx: 20.0, cz: -14.0, count: 20, r: 6.0 },
    { cx: -22.0, cz: -18.0, count: 16, r: 5.0 }
  ];

  MEADOW_CENTERS.forEach(m => {
    for (let i = 0; i < m.count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * m.r;
      addPetal(m.cx + Math.cos(angle) * dist, m.cz + Math.sin(angle) * dist, 0.85);
    }
  });

  return { petals1, petals2 };
}

function generateDojoPebbles3_3() {
  const rng = createRng(3034);
  const pebbles = [];

  const tryAdd = (x, z) => {
    const isRoad = (Math.abs(x) < 3.2 && z > -14 && z < 32) || (Math.abs(z) < 3.0 && x > -32 && x < 32);
    const inRiver = (x > 1.5 && x < 15.5);
    const inPond = Math.hypot(x - (-30.3), z - 12.0) < 5.2;
    if (isRoad || inRiver || inPond) return;

    const scale = 0.45 + rng() * 0.45;
    const rotX = (rng() - 0.5) * 0.15;
    const rotY = rng() * Math.PI * 2;
    const rotZ = (rng() - 0.5) * 0.15;
    const typeIdx = Math.floor(rng() * 5);
    pebbles.push({ x, y: 0.002, z, scale, rotX, rotY, rotZ, typeIdx });
  };

  const GRASS_ZONES = [
    { cx: -7.5, cz: 8.0, count: 8, r: 3.5 },
    { cx: -13.0, cz: 16.0, count: 10, r: 4.5 },
    { cx: -22.0, cz: 9.0, count: 10, r: 4.5 },
    { cx: -18.0, cz: 22.0, count: 8, r: 4.0 },
    { cx: -26.0, cz: 24.0, count: 8, r: 4.0 },
    { cx: 4.5, cz: 8.0, count: 8, r: 2.2 },
    { cx: 5.0, cz: 16.0, count: 9, r: 2.5 },
    { cx: 16.0, cz: 6.0, count: 8, r: 4.0 },
    { cx: 20.0, cz: 14.0, count: 10, r: 4.5 },
    { cx: 16.0, cz: -14.0, count: 9, r: 4.0 },
    { cx: 22.0, cz: -18.0, count: 10, r: 4.5 }
  ];

  GRASS_ZONES.forEach(zone => {
    for (let i = 0; i < zone.count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * zone.r;
      tryAdd(zone.cx + Math.cos(angle) * dist, zone.cz + Math.sin(angle) * dist);
    }
  });

  return pebbles;
}

// ==============================================================================
// 2. PROCEDURAL / CURATED LAYOUT BUILDERS FOR THE OTHER 8 FOREST ZONES
// ==============================================================================
export class ForestNatureManager {
  constructor(scene, collisions = null) {
    this.scene = scene;
    this.collisions = collisions;

    this.group = new THREE.Group();
    this.group.name = 'forest_nature_master_group';
    this.group.visible = false;
    this.scene.add(this.group);

    this.zoneGroups = {};
    this.zoneCollisions = {};
    this.currentZoneKey = null;

    this.uniforms = {
      uTime: { value: 0.0 }
    };

    // Cached model scenes and geometries
    this.cachedModels = {};
    this.cachedGeometries = {};
    this.cachedMaterials = {};

    this.isLoaded = false;
  }

  async init() {
    console.log('[ForestNatureManager] Loading Stylized Nature MegaKit assets...');
    const loader = new GLTFLoader();

    try {
      const [
        bushFlGltf, bushCommGltf,
        shroomCommGltf, shroomLaetGltf,
        pine1Gltf, pine2Gltf, pine3Gltf,
        rock1Gltf, rock2Gltf, rock3Gltf,
        fl3Gltf, fl4Gltf, fernGltf,
        pet1Gltf, pet2Gltf,
        peb1Gltf, peb2Gltf, peb3Gltf, peb4Gltf, peb5Gltf,
        pebSq1Gltf, pebSq2Gltf
      ] = await Promise.all([
        loader.loadAsync('./assets/nature/Bush_Common_Flowers.gltf'),
        loader.loadAsync('./assets/nature/Bush_Common.gltf'),
        loader.loadAsync('./assets/nature/Mushroom_Common.gltf'),
        loader.loadAsync('./assets/nature/Mushroom_Laetiporus.gltf'),
        loader.loadAsync('./assets/nature/Pine_1.gltf'),
        loader.loadAsync('./assets/nature/Pine_2.gltf'),
        loader.loadAsync('./assets/nature/Pine_3.gltf'),
        loader.loadAsync('./assets/nature/Rock_Medium_1.gltf'),
        loader.loadAsync('./assets/nature/Rock_Medium_2.gltf'),
        loader.loadAsync('./assets/nature/Rock_Medium_3.gltf'),
        loader.loadAsync('./assets/nature/Flower_3_Group.gltf'),
        loader.loadAsync('./assets/nature/Flower_4_Group.gltf'),
        loader.loadAsync('./assets/nature/Fern_1.gltf'),
        loader.loadAsync('./assets/nature/Petal_1.gltf'),
        loader.loadAsync('./assets/nature/Petal_2.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_1.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_2.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_3.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_4.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_5.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Square_1.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Square_2.gltf')
      ]);

      // Cache raw models
      this.cachedModels.bush_flowers = bushFlGltf.scene || bushFlGltf.scenes[0];
      this.cachedModels.bush_common = bushCommGltf.scene || bushCommGltf.scenes[0];
      this.cachedModels.shroom_common = shroomCommGltf.scene || shroomCommGltf.scenes[0];
      this.cachedModels.shroom_laetiporus = shroomLaetGltf.scene || shroomLaetGltf.scenes[0];
      this.cachedModels.pine1 = pine1Gltf.scene || pine1Gltf.scenes[0];
      this.cachedModels.pine2 = pine2Gltf.scene || pine2Gltf.scenes[0];
      this.cachedModels.pine3 = pine3Gltf.scene || pine3Gltf.scenes[0];
      this.cachedModels.rock1 = rock1Gltf.scene || rock1Gltf.scenes[0];
      this.cachedModels.rock2 = rock2Gltf.scene || rock2Gltf.scenes[0];
      this.cachedModels.rock3 = rock3Gltf.scene || rock3Gltf.scenes[0];
      this.cachedModels.fl3 = fl3Gltf.scene || fl3Gltf.scenes[0];
      this.cachedModels.fl4 = fl4Gltf.scene || fl4Gltf.scenes[0];
      this.cachedModels.fern = fernGltf.scene || fernGltf.scenes[0];

      // Setup foliage wind sway & materials
      this._setupFoliageMaterials(this.cachedModels.bush_flowers, 0.06);
      this._setupFoliageMaterials(this.cachedModels.bush_common, 0.05);
      this._setupFoliageMaterials(this.cachedModels.pine1, 0.03);
      this._setupFoliageMaterials(this.cachedModels.pine2, 0.03);
      this._setupFoliageMaterials(this.cachedModels.pine3, 0.03);
      this._setupFoliageMaterials(this.cachedModels.fl3, 0.07);
      this._setupFoliageMaterials(this.cachedModels.fl4, 0.07);
      this._setupFoliageMaterials(this.cachedModels.fern, 0.05);

      this._setupGenericMaterials(this.cachedModels.shroom_common);
      this._setupGenericMaterials(this.cachedModels.shroom_laetiporus);
      this._setupGenericMaterials(this.cachedModels.rock1);
      this._setupGenericMaterials(this.cachedModels.rock2);
      this._setupGenericMaterials(this.cachedModels.rock3);

      // Extract Petals & Pebbles for instancing
      this.cachedGeometries.petal1 = this._extractGeometry(pet1Gltf.scene || pet1Gltf.scenes[0]);
      this.cachedGeometries.petal2 = this._extractGeometry(pet2Gltf.scene || pet2Gltf.scenes[0]);
      this.cachedMaterials.petal = this._extractMaterial(pet1Gltf.scene || pet1Gltf.scenes[0]);
      if (this.cachedMaterials.petal) {
        this.cachedMaterials.petal.side = THREE.DoubleSide;
        this.cachedMaterials.petal.alphaTest = 0.22;
        this.cachedMaterials.petal.depthWrite = true;
        this.cachedMaterials.petal.roughness = 0.78;
        this.cachedMaterials.petal.metalness = 0.0;
        if (this.cachedMaterials.petal.map) {
          this.cachedMaterials.petal.map.colorSpace = THREE.SRGBColorSpace;
          this.cachedMaterials.petal.map.flipY = false;
        }
      }

      this.cachedGeometries.pebbles = [
        peb1Gltf, peb2Gltf, peb3Gltf, peb4Gltf, peb5Gltf, pebSq1Gltf, pebSq2Gltf
      ].map(g => this._extractGeometry(g.scene || g.scenes[0]));

      this.cachedMaterials.pebble = this._extractMaterial(peb1Gltf.scene || peb1Gltf.scenes[0]);
      if (this.cachedMaterials.pebble) {
        this.cachedMaterials.pebble.roughness = 0.85;
        this.cachedMaterials.pebble.metalness = 0.02;
        if (this.cachedMaterials.pebble.map) {
          this.cachedMaterials.pebble.map.colorSpace = THREE.SRGBColorSpace;
          this.cachedMaterials.pebble.map.flipY = false;
        }
      }

      // Build each of the 9 forest zone groups!
      this._buildZone3_3(); // Dojo Center
      this._buildZone2_2(); // Flower Glade NW
      this._buildZone3_2(); // North River Pine Ridge
      this._buildZone4_2(); // Sentinel Hills NE
      this._buildZone2_3(); // Postman Meadow West
      this._buildZone4_3(); // Bing's Wild Woods East
      this._buildZone2_4(); // Twilight Woods SW
      this._buildZone3_4(); // South River Pine Ridge
      this._buildZone4_4(); // Guardian Crossroads SE

      this.isLoaded = true;
      console.log('[ForestNatureManager] Initialized successfully for all 9 forest zones!');
    } catch (err) {
      console.error('[ForestNatureManager] Failed to load nature assets:', err);
    }
  }

  _setupFoliageMaterials(root, swayAmount = 0.05) {
    if (!root) return;
    root.traverse(child => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (!mat) return;
          mat.side = THREE.DoubleSide;
          mat.alphaTest = 0.20;
          mat.depthWrite = true;
          mat.metalness = 0.0;
          mat.roughness = 0.82;

          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
          }

          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.uniforms.uTime;
            shader.vertexShader = `
              uniform float uTime;
              ${shader.vertexShader}
            `.replace(
              '#include <begin_vertex>',
              `
              #include <begin_vertex>
              float swayWeight = max(0.0, position.y) * ${swayAmount.toFixed(3)};
              float swayPhase = uTime * 2.2 + (modelMatrix[3][0] + position.x) * 1.4 + (modelMatrix[3][2] + position.z) * 1.4;
              transformed.x += sin(swayPhase) * swayWeight;
              transformed.z += cos(swayPhase * 0.85) * swayWeight * 0.75;
              `
            );
          };
        });
      }
    });
  }

  _setupGenericMaterials(root) {
    if (!root) return;
    root.traverse(child => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (!mat) return;
          mat.side = THREE.DoubleSide;
          mat.metalness = 0.02;
          mat.roughness = 0.80;
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        });
      }
    });
  }

  _extractGeometry(root) {
    let geom = null;
    if (!root) return null;
    root.traverse(c => {
      if (!geom && c.isMesh && c.geometry) geom = c.geometry.clone();
    });
    return geom;
  }

  _extractMaterial(root) {
    let mat = null;
    if (!root) return null;
    root.traverse(c => {
      if (!mat && c.isMesh && c.material) {
        const m = Array.isArray(c.material) ? c.material[0] : c.material;
        if (m && typeof m.clone === 'function') mat = m.clone();
      }
    });
    return mat;
  }

  _getOrCreateZoneGroup(key) {
    if (!this.zoneGroups[key]) {
      const g = new THREE.Group();
      g.name = `forest_nature_zone_${key}`;
      g.visible = false;
      this.group.add(g);
      this.zoneGroups[key] = g;
      this.zoneCollisions[key] = [];
    }
    return this.zoneGroups[key];
  }

  // --- Helper to spawn cloned prop with optional collision ---
  _addClonedProp(zoneKey, model, x, y, z, scale, rotY, collisionRadius = null) {
    if (!model) return;
    const clone = model.clone(true);
    clone.position.set(x, y, z);
    clone.rotation.y = rotY;
    clone.scale.setScalar(scale);

    const zg = this._getOrCreateZoneGroup(zoneKey);
    zg.add(clone);

    if (collisionRadius && collisionRadius > 0) {
      this.zoneCollisions[zoneKey].push({
        x,
        z,
        radius: collisionRadius,
        tag: `forest_nature_prop_${zoneKey}_${Math.round(x)}_${Math.round(z)}`
      });
    }
  }

  // --- Helper to spawn instanced petals ---
  _addInstancedPetals(zoneKey, petalList) {
    if (!petalList.length || !this.cachedGeometries.petal1 || !this.cachedMaterials.petal) return;
    const dummy = new THREE.Object3D();
    const zg = this._getOrCreateZoneGroup(zoneKey);

    const p1 = petalList.filter((_, i) => i % 2 === 0);
    const p2 = petalList.filter((_, i) => i % 2 === 1);

    const spawnSubset = (geom, list, name) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geom, this.cachedMaterials.petal, list.length);
      mesh.name = name;
      mesh.receiveShadow = true;
      list.forEach((item, idx) => {
        dummy.position.set(item.x, item.y || 0.003, item.z);
        dummy.rotation.set(0, item.rotY, 0);
        dummy.scale.setScalar(item.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      zg.add(mesh);
    };

    spawnSubset(this.cachedGeometries.petal1, p1, `petals1_${zoneKey}`);
    spawnSubset(this.cachedGeometries.petal2, p2, `petals2_${zoneKey}`);
  }

  // --- Helper to spawn instanced pebbles ---
  _addInstancedPebbles(zoneKey, pebbleList) {
    if (!pebbleList.length || !this.cachedGeometries.pebbles || !this.cachedMaterials.pebble) return;
    const dummy = new THREE.Object3D();
    const zg = this._getOrCreateZoneGroup(zoneKey);

    const grouped = [[], [], [], [], []];
    pebbleList.forEach(p => {
      grouped[p.typeIdx % 5].push(p);
    });

    grouped.forEach((list, idx) => {
      const geom = this.cachedGeometries.pebbles[idx % this.cachedGeometries.pebbles.length];
      if (!geom || !list.length) return;

      const mesh = new THREE.InstancedMesh(geom, this.cachedMaterials.pebble, list.length);
      mesh.name = `pebbles_${zoneKey}_${idx}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      list.forEach((item, i) => {
        dummy.position.set(item.x, item.y || 0.002, item.z);
        dummy.rotation.set(item.rotX || 0, item.rotY, item.rotZ || 0);
        dummy.scale.setScalar(item.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      zg.add(mesh);
    });
  }

  // ============================================================================
  // VALLE DEL DOJO (Centro Zen) - Primary Zone [2, 2] in 3x3 layout
  // ============================================================================
  _buildZoneDojo(key) {
    DOJO_BUSHES_3_3.forEach(b => {
      const model = b.type === 'common' ? this.cachedModels.bush_common : this.cachedModels.bush_flowers;
      this._addClonedProp(key, model, b.x, b.y, b.z, b.scale, b.rotationY);
    });

    DOJO_MUSHROOMS_COMMON_3_3.forEach(m => {
      this._addClonedProp(key, this.cachedModels.shroom_common, m.x, m.y, m.z, m.scale, m.rotationY);
    });

    DOJO_MUSHROOMS_LAETIPORUS_3_3.forEach(m => {
      this._addClonedProp(key, this.cachedModels.shroom_laetiporus, m.x, m.y, m.z, m.scale, m.rotationY);
    });

    DOJO_PLANTS_3_3.forEach(p => {
      let model = this.cachedModels.fern;
      if (p.type === 'flower3') model = this.cachedModels.fl3;
      else if (p.type === 'flower4') model = this.cachedModels.fl4;
      this._addClonedProp(key, model, p.x, p.y, p.z, p.scale, p.rotationY);
    });

    // Companion medium mossy rocks in NE glade around large monolith
    this._addClonedProp(key, this.cachedModels.rock2, 28.6, 0.0, -22.2, 1.15, 1.4, 1.2);
    this._addClonedProp(key, this.cachedModels.rock1, 23.2, 0.0, -23.4, 0.95, 2.7, 1.0);

    // Companion medium mossy rocks in SE glade around large monolith [31.5, 32.2]
    this._addClonedProp(key, this.cachedModels.rock3, 34.2, 0.0, 31.0, 1.15, 0.8, 1.2);
    this._addClonedProp(key, this.cachedModels.rock1, 28.8, 0.0, 33.5, 1.05, 2.1, 1.1);

    const { petals1, petals2 } = generateDojoPetals3_3();
    this._addInstancedPetals(key, [...petals1, ...petals2]);

    const pebbles = generateDojoPebbles3_3();
    this._addInstancedPebbles(key, pebbles);
  }

  _buildZone3_3() {
    this._buildZoneDojo('3_3');
  }

  _buildZone2_2() {
    this._buildZoneDojo('2_2');
  }

  // ============================================================================
  // ZONE 3_2: SENDA NORTE DEL BOSQUE (Valle Fluvial de Pinos y Peñascos)
  // River corridor: x in [2.0, 15.0]
  // ============================================================================
  _buildZone3_2() {
    const key = '3_2';
    const rng = createRng(3022);

    // 1. Conifer Pines along both river ridges
    const pineSpots = [
      // West Riverbank Pines
      { x: -5.5, z: -22, s: 1.15, r: 0.8 },
      { x: -4.0, z: -10, s: 1.25, r: 0.85 },
      { x: -5.0, z: 6,   s: 1.10, r: 0.75 },
      { x: -4.5, z: 20,  s: 1.30, r: 0.85 },
      { x: -18.0, z: -15, s: 1.20, r: 0.8 },
      { x: -24.0, z: 12,  s: 1.15, r: 0.75 },

      // East Riverbank Pines
      { x: 20.0, z: -20, s: 1.25, r: 0.85 },
      { x: 21.5, z: -6,  s: 1.10, r: 0.75 },
      { x: 20.5, z: 10,  s: 1.30, r: 0.85 },
      { x: 22.0, z: 24,  s: 1.15, r: 0.8 },
      { x: 28.0, z: -12, s: 1.20, r: 0.8 },
      { x: 27.0, z: 18,  s: 1.10, r: 0.75 }
    ];
    pineSpots.forEach(p => {
      const pModel = rng() > 0.5 ? this.cachedModels.pine1 : (rng() > 0.5 ? this.cachedModels.pine2 : this.cachedModels.pine3);
      this._addClonedProp(key, pModel, p.x, 0, p.z, p.s, rng() * Math.PI * 2, p.r);
    });

    // 2. Large Riverbed & Ridge Rocks
    const rockSpots = [
      { x: 2.2,  z: -16, s: 1.15, r: 1.4 },
      { x: 2.5,  z: 14,  s: 1.20, r: 1.45 },
      { x: 15.2, z: -12, s: 1.10, r: 1.35 },
      { x: 15.5, z: 18,  s: 1.25, r: 1.5 },
      { x: -16.0, z: 22, s: 1.05, r: 1.3 },
      { x: 25.0, z: -22, s: 1.15, r: 1.4 }
    ];
    rockSpots.forEach(r => {
      const rModel = rng() > 0.5 ? this.cachedModels.rock1 : this.cachedModels.rock3;
      this._addClonedProp(key, rModel, r.x, 0, r.z, r.s, rng() * Math.PI * 2, r.r);
    });

    // 3. Shelf Laetiporus mushrooms on pines
    pineSpots.slice(0, 8).forEach(p => {
      this._addClonedProp(key, this.cachedModels.shroom_laetiporus, p.x + 0.6, 0.4, p.z + 0.5, 1.1, rng() * Math.PI * 2);
    });

    // 4. Riverbank bushes
    const bushSpots = [
      { x: -3.2, z: -6 }, { x: -3.5, z: 12 }, { x: 16.5, z: -4 }, { x: 16.0, z: 15 },
      { x: -12.0, z: -18 }, { x: 23.0, z: 4 }
    ];
    bushSpots.forEach(b => {
      this._addClonedProp(key, this.cachedModels.bush_common, b.x, 0, b.z, 1.0, rng() * Math.PI * 2);
    });

    // 5. Riverbank pebbles
    const pebbles = [];
    for (let i = 0; i < 80; i++) {
      const isEast = rng() > 0.5;
      const baseX = isEast ? 16.0 + rng() * 4 : -4.0 - rng() * 4;
      const baseZ = (rng() - 0.5) * 60;
      pebbles.push({
        x: baseX, z: baseZ, scale: 0.45 + rng() * 0.45,
        rotX: (rng() - 0.5) * 0.15, rotY: rng() * Math.PI * 2, rotZ: (rng() - 0.5) * 0.15,
        typeIdx: Math.floor(rng() * 5)
      });
    }
    this._addInstancedPebbles(key, pebbles);
  }

  // ============================================================================
  // ZONE 4_2: COLINAS VERDES DEL CENTINELA (Pinos y Mojones de Piedra)
  // ============================================================================
  _buildZone4_2() {
    const key = '4_2';
    const rng = createRng(4022);

    // 1. Mountain Pines
    const pineSpots = [
      { x: -22, z: -20, s: 1.25, r: 0.85 }, { x: -16, z: -26, s: 1.10, r: 0.75 },
      { x: 18, z: -22, s: 1.30, r: 0.85 }, { x: 26, z: -16, s: 1.15, r: 0.8 },
      { x: -24, z: 18, s: 1.20, r: 0.8 }, { x: -18, z: 24, s: 1.10, r: 0.75 },
      { x: 20, z: 20, s: 1.25, r: 0.85 }, { x: 26, z: 14, s: 1.15, r: 0.8 }
    ];
    pineSpots.forEach(p => {
      const pModel = rng() > 0.5 ? this.cachedModels.pine1 : this.cachedModels.pine2;
      this._addClonedProp(key, pModel, p.x, 0, p.z, p.s, rng() * Math.PI * 2, p.r);
    });

    // 2. High Rock Cairns / Outcrops
    const rockSpots = [
      { x: -14, z: -14, s: 1.25, r: 1.5 },
      { x: -18, z: -12, s: 1.10, r: 1.35 },
      { x: 16, z: -12, s: 1.20, r: 1.45 },
      { x: 14, z: 14, s: 1.30, r: 1.55 },
      { x: 18, z: 16, s: 1.05, r: 1.3 },
      { x: -16, z: 16, s: 1.15, r: 1.4 }
    ];
    rockSpots.forEach(r => {
      const rModel = rng() > 0.5 ? this.cachedModels.rock2 : this.cachedModels.rock3;
      this._addClonedProp(key, rModel, r.x, 0, r.z, r.s, rng() * Math.PI * 2, r.r);
    });

    // 3. Mountain ferns & flowers
    rockSpots.forEach(r => {
      this._addClonedProp(key, this.cachedModels.fern, r.x + (rng() - 0.5) * 3, 0, r.z + (rng() - 0.5) * 3, 0.40, rng() * Math.PI * 2);
    });

    // 4. Flowering bushes
    pineSpots.slice(0, 6).forEach(p => {
      this._addClonedProp(key, this.cachedModels.bush_flowers, p.x + 2.5, 0, p.z + 1.5, 0.95, rng() * Math.PI * 2);
    });

    // 5. Square and round pebbles
    const pebbles = [];
    for (let i = 0; i < 70; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 8 + rng() * 22;
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      if (Math.abs(px) > 3.5 || Math.abs(pz) > 3.5) {
        pebbles.push({
          x: px, z: pz, scale: 0.45 + rng() * 0.4,
          rotX: 0, rotY: rng() * Math.PI * 2, rotZ: 0,
          typeIdx: Math.floor(rng() * 7)
        });
      }
    }
    this._addInstancedPebbles(key, pebbles);
  }

  // ============================================================================
  // ZONE 2_3: PRADERA OCCIDENTAL DE LUNACIA (Pradera de Puffy y Anillos de Setas)
  // ============================================================================
  _buildZone2_3() {
    const key = '2_3';
    const rng = createRng(2033);

    // 1. Fairy Rings of Common Mushrooms
    const ringCenters = [
      { cx: -18, cz: -14, count: 8, r: 3.2 },
      { cx: -22, cz: 16, count: 9, r: 3.5 },
      { cx: 16, cz: -18, count: 8, r: 3.0 },
      { cx: 20, cz: 16, count: 8, r: 3.2 }
    ];
    ringCenters.forEach(ring => {
      for (let i = 0; i < ring.count; i++) {
        const ang = (i / ring.count) * Math.PI * 2 + (rng() - 0.5) * 0.2;
        const d = ring.r + (rng() - 0.5) * 0.5;
        this._addClonedProp(
          key, this.cachedModels.shroom_common,
          ring.cx + Math.cos(ang) * d, 0, ring.cz + Math.sin(ang) * d,
          1.0 + rng() * 0.25, rng() * Math.PI * 2
        );
      }
    });

    // 2. Smooth Meadow Boulders
    const rockSpots = [
      { x: -14, z: -20, s: 1.1, r: 1.35 },
      { x: -24, z: -8, s: 1.0, r: 1.25 },
      { x: 18, z: -10, s: 1.15, r: 1.4 },
      { x: -16, z: 22, s: 1.2, r: 1.45 },
      { x: 22, z: 20, s: 1.05, r: 1.3 }
    ];
    rockSpots.forEach(r => {
      this._addClonedProp(key, this.cachedModels.rock1, r.x, 0, r.z, r.s, rng() * Math.PI * 2, r.r);
    });

    // 3. Flower clusters and gentle bushes
    rockSpots.forEach(r => {
      this._addClonedProp(key, this.cachedModels.fl3, r.x + 2.0, 0, r.z + 1.2, 0.85, rng() * Math.PI * 2);
      this._addClonedProp(key, this.cachedModels.bush_common, r.x - 2.2, 0, r.z - 1.0, 0.95, rng() * Math.PI * 2);
    });

    // 4. Round pebbles sprinkled across meadow
    const pebbles = [];
    for (let i = 0; i < 75; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 6 + rng() * 26;
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      if (Math.hypot(px - 29.4, pz - (-16.2)) < 5.5) continue;
      if (Math.abs(px) > 3.5 || Math.abs(pz) > 3.5) {
        pebbles.push({
          x: px, z: pz, scale: 0.45 + rng() * 0.4,
          rotX: 0, rotY: rng() * Math.PI * 2, rotZ: 0,
          typeIdx: Math.floor(rng() * 5)
        });
      }
    }
    this._addInstancedPebbles(key, pebbles);

    // 5. Ambientación NE Monolito [29.9, -28.0] (Plantas, Arbustos, Hongos)
    // Arbustos
    this._addClonedProp(key, this.cachedModels.bush_common, 27.4, 0, -26.5, 1.15, 1.2);
    this._addClonedProp(key, this.cachedModels.bush_flowers, 32.6, 0, -29.6, 1.10, 3.4);
    this._addClonedProp(key, this.cachedModels.bush_common, 31.8, 0, -26.2, 0.95, 4.8);
    this._addClonedProp(key, this.cachedModels.bush_flowers, 27.6, 0, -29.8, 1.05, 2.1);
    this._addClonedProp(key, this.cachedModels.bush_common, 29.5, 0, -25.0, 1.00, 0.5);
    // Plantas y helechos
    this._addClonedProp(key, this.cachedModels.fern, 28.2, 0, -27.0, 1.10, 1.4);
    this._addClonedProp(key, this.cachedModels.fern, 32.0, 0, -27.8, 1.05, 2.9);
    this._addClonedProp(key, this.cachedModels.fern, 28.8, 0, -30.4, 1.15, 4.2);
    this._addClonedProp(key, this.cachedModels.fl3, 27.0, 0, -28.2, 0.90, 0.8);
    this._addClonedProp(key, this.cachedModels.fl4, 32.4, 0, -26.0, 1.00, 3.1);
    this._addClonedProp(key, this.cachedModels.fl3, 30.6, 0, -25.2, 0.85, 2.5);
    // Hongos
    this._addClonedProp(key, this.cachedModels.shroom_common, 28.5, 0, -26.8, 1.20, 1.1);
    this._addClonedProp(key, this.cachedModels.shroom_common, 31.6, 0, -28.9, 1.10, 2.7);
    this._addClonedProp(key, this.cachedModels.shroom_common, 30.8, 0, -26.0, 1.05, 0.4);
    this._addClonedProp(key, this.cachedModels.shroom_common, 27.6, 0, -28.6, 1.15, 3.8);
    this._addClonedProp(key, this.cachedModels.shroom_laetiporus, 29.4, 0.35, -26.4, 1.15, 1.8);
    this._addClonedProp(key, this.cachedModels.shroom_laetiporus, 31.2, 0.40, -27.4, 1.25, 3.6);

    // 6. Ambientación NW Monolito [-17.0, -30.7] (Plantas, Arbustos, Hongos)
    // Arbustos
    this._addClonedProp(key, this.cachedModels.bush_common, -19.5, 0, -29.2, 1.15, 1.3);
    this._addClonedProp(key, this.cachedModels.bush_flowers, -14.4, 0, -32.2, 1.10, 3.2);
    this._addClonedProp(key, this.cachedModels.bush_common, -15.2, 0, -28.8, 0.95, 4.5);
    this._addClonedProp(key, this.cachedModels.bush_flowers, -18.8, 0, -32.5, 1.05, 2.0);
    this._addClonedProp(key, this.cachedModels.bush_common, -17.2, 0, -27.8, 1.00, 0.7);
    // Plantas y helechos
    this._addClonedProp(key, this.cachedModels.fern, -18.8, 0, -29.8, 1.10, 1.2);
    this._addClonedProp(key, this.cachedModels.fern, -15.0, 0, -30.5, 1.05, 2.8);
    this._addClonedProp(key, this.cachedModels.fern, -16.5, 0, -32.6, 1.15, 4.1);
    this._addClonedProp(key, this.cachedModels.fl3, -19.8, 0, -31.0, 0.90, 0.9);
    this._addClonedProp(key, this.cachedModels.fl4, -14.2, 0, -29.2, 1.00, 3.3);
    this._addClonedProp(key, this.cachedModels.fl3, -16.0, 0, -28.0, 0.85, 2.2);
    // Hongos
    this._addClonedProp(key, this.cachedModels.shroom_common, -18.4, 0, -29.5, 1.20, 1.3);
    this._addClonedProp(key, this.cachedModels.shroom_common, -15.4, 0, -31.5, 1.10, 2.9);
    this._addClonedProp(key, this.cachedModels.shroom_common, -17.5, 0, -28.6, 1.05, 0.5);
    this._addClonedProp(key, this.cachedModels.shroom_common, -19.0, 0, -31.8, 1.15, 3.6);
    this._addClonedProp(key, this.cachedModels.shroom_laetiporus, -16.4, 0.35, -29.2, 1.15, 1.9);
    this._addClonedProp(key, this.cachedModels.shroom_laetiporus, -17.8, 0.40, -31.2, 1.25, 3.5);

    // 7. Ambientación SW [-32.0, 13.0] y [-18.6, 31.3] (Plantas, Arbustos, Hongos)
    // Sector 3A: [-32.0, 13.0]
    this._addClonedProp(key, this.cachedModels.bush_common, -32.0, 0, 13.0, 1.15, 1.0);
    this._addClonedProp(key, this.cachedModels.bush_flowers, -29.8, 0, 14.5, 1.10, 2.8);
    this._addClonedProp(key, this.cachedModels.bush_common, -34.0, 0, 11.6, 1.00, 4.2);
    this._addClonedProp(key, this.cachedModels.bush_flowers, -31.2, 0, 11.0, 1.05, 0.6);
    this._addClonedProp(key, this.cachedModels.fern, -30.8, 0, 13.8, 1.10, 1.5);
    this._addClonedProp(key, this.cachedModels.fern, -33.2, 0, 13.6, 1.05, 3.1);
    this._addClonedProp(key, this.cachedModels.fl3, -30.4, 0, 12.0, 0.90, 0.4);
    this._addClonedProp(key, this.cachedModels.fl4, -32.8, 0, 11.4, 0.95, 2.6);
    this._addClonedProp(key, this.cachedModels.shroom_common, -31.4, 0, 12.6, 1.15, 1.2);
    this._addClonedProp(key, this.cachedModels.shroom_common, -32.6, 0, 13.8, 1.10, 3.0);
    this._addClonedProp(key, this.cachedModels.shroom_common, -30.6, 0, 14.2, 1.05, 0.8);
    this._addClonedProp(key, this.cachedModels.shroom_laetiporus, -32.2, 0.35, 12.0, 1.15, 2.1);

    // Sector 3B: [-18.6, 31.3]
    this._addClonedProp(key, this.cachedModels.bush_common, -18.6, 0, 31.3, 1.15, 1.4);
    this._addClonedProp(key, this.cachedModels.bush_flowers, -16.5, 0, 32.8, 1.10, 3.1);
    this._addClonedProp(key, this.cachedModels.bush_common, -20.6, 0, 29.8, 1.00, 4.5);
    this._addClonedProp(key, this.cachedModels.bush_flowers, -17.0, 0, 29.4, 1.05, 0.9);
    this._addClonedProp(key, this.cachedModels.fern, -19.6, 0, 32.4, 1.10, 1.8);
    this._addClonedProp(key, this.cachedModels.fern, -17.0, 0, 31.0, 1.05, 3.4);
    this._addClonedProp(key, this.cachedModels.fl3, -18.0, 0, 33.0, 0.90, 0.7);
    this._addClonedProp(key, this.cachedModels.fl4, -20.2, 0, 31.0, 0.95, 2.9);
    this._addClonedProp(key, this.cachedModels.shroom_common, -19.2, 0, 31.0, 1.15, 1.5);
    this._addClonedProp(key, this.cachedModels.shroom_common, -17.6, 0, 32.2, 1.10, 3.3);
    this._addClonedProp(key, this.cachedModels.shroom_common, -18.2, 0, 29.8, 1.05, 0.6);
    this._addClonedProp(key, this.cachedModels.shroom_laetiporus, -18.9, 0.35, 31.8, 1.15, 2.3);

    // 8. Arbustos verdes en las 7 coordenadas solicitadas
    const greenBushSpots = [
      { x: 7.5,  z: 32.7, s: 1.12, r: 1.3, cx: 8.2,  cz: 33.3, cs: 0.95, cr: 3.5 },
      { x: -3.9, z: 25.5, s: 1.15, r: 2.4, cx: -4.6, cz: 26.1, cs: 0.92, cr: 0.8 },
      { x: -8.2, z: 9.0,  s: 1.10, r: 4.1, cx: -7.5, cz: 9.6,  cs: 0.98, cr: 1.9 },
      { x: -3.2, z: -6.0, s: 1.14, r: 0.5, cx: -2.6, cz: -5.3, cs: 0.90, cr: 2.8 },
      { x: 6.2,  z: -10.0,s: 1.12, r: 3.1, cx: 6.9,  cz: -10.6,cs: 0.95, cr: 1.4 },
      { x: 5.9,  z: -20.7,s: 1.15, r: 1.8, cx: 5.2,  cz: -21.3,cs: 0.92, cr: 4.2 },
      { x: -6.8, z: -27.6,s: 1.10, r: 2.7, cx: -7.5, cz: -28.2,cs: 0.95, cr: 0.3 }
    ];
    greenBushSpots.forEach(b => {
      this._addClonedProp(key, this.cachedModels.bush_common, b.x, 0, b.z, b.s, b.r);
      this._addClonedProp(key, this.cachedModels.bush_common, b.cx, 0, b.cz, b.cs, b.cr);
    });
  }

  // ============================================================================
  // ZONE 4_3: JARDÍN ORIENTAL DE LAS BESTIAS (Espesura Salvaje de Bing)
  // ============================================================================
  _buildZone4_3() {
    const key = '4_3';
    const rng = createRng(4033);

    // 1. Lush Fern Thickets
    const fernSpots = [
      { x: -16, z: -18 }, { x: -22, z: -12 }, { x: -14, z: -24 },
      { x: 14, z: -16 }, { x: 20, z: -20 }, { x: 24, z: -10 },
      { x: -18, z: 14 }, { x: -22, z: 20 }, { x: -12, z: 22 },
      { x: 16, z: 14 }, { x: 22, z: 18 }, { x: 18, z: 24 }
    ];
    fernSpots.forEach(s => {
      this._addClonedProp(key, this.cachedModels.fern, s.x, 0, s.z, 0.42 + rng() * 0.1, rng() * Math.PI * 2);
    });

    // 2. Large Moss-Covered Boulders
    const rockSpots = [
      { x: -20, z: -16, s: 1.25, r: 1.5 },
      { x: -12, z: -20, s: 1.10, r: 1.35 },
      { x: 18, z: -14, s: 1.30, r: 1.55 },
      { x: -16, z: 18, s: 1.20, r: 1.45 },
      { x: 20, z: 16, s: 1.25, r: 1.5 }
    ];
    rockSpots.forEach(r => {
      const rModel = rng() > 0.5 ? this.cachedModels.rock2 : this.cachedModels.rock3;
      this._addClonedProp(key, rModel, r.x, 0, r.z, r.s, rng() * Math.PI * 2, r.r);
    });

    // 3. Dense wild bushes
    rockSpots.forEach(r => {
      const bModel = rng() > 0.5 ? this.cachedModels.bush_common : this.cachedModels.bush_flowers;
      this._addClonedProp(key, bModel, r.x + (rng() - 0.5) * 3.5, 0, r.z + (rng() - 0.5) * 3.5, 1.0 + rng() * 0.2, rng() * Math.PI * 2);
    });

    // 4. Shelf and common mushrooms
    rockSpots.forEach(r => {
      this._addClonedProp(key, this.cachedModels.shroom_laetiporus, r.x + 1.2, 0.35, r.z + 1.2, 1.1, rng() * Math.PI * 2);
      this._addClonedProp(key, this.cachedModels.shroom_common, r.x - 1.2, 0, r.z - 1.2, 1.05, rng() * Math.PI * 2);
    });

    // 5. Fallen Petals
    const petals = [];
    for (let i = 0; i < 75; i++) {
      const s = fernSpots[i % fernSpots.length];
      petals.push({
        x: s.x + (rng() - 0.5) * 8,
        z: s.z + (rng() - 0.5) * 8,
        rotY: rng() * Math.PI * 2,
        scale: 0.85 + rng() * 0.35
      });
    }
    this._addInstancedPetals(key, petals);

    // 6. Ground Pebbles
    const pebbles = [];
    for (let i = 0; i < 65; i++) {
      const s = fernSpots[i % fernSpots.length];
      pebbles.push({
        x: s.x + (rng() - 0.5) * 7,
        z: s.z + (rng() - 0.5) * 7,
        scale: 0.45 + rng() * 0.4,
        rotX: 0, rotY: rng() * Math.PI * 2, rotZ: 0,
        typeIdx: Math.floor(rng() * 5)
      });
    }
    this._addInstancedPebbles(key, pebbles);
  }

  // ============================================================================
  // ZONE 2_4: BOSQUE SOMBRÍO DEL CREPÚSCULO (Bosque Crepuscular y Fúngico)
  // ============================================================================
  _buildZone2_4() {
    const key = '2_4';
    const rng = createRng(2044);

    // 1. Prolific Mushroom Colonies (Common & Laetiporus)
    const fungalSpots = [
      { x: -16, z: -16 }, { x: -22, z: -20 }, { x: -20, z: -10 },
      { x: 14, z: -18 }, { x: 20, z: -14 }, { x: 24, z: -22 },
      { x: -18, z: 16 }, { x: -22, z: 22 }, { x: -12, z: 20 },
      { x: 16, z: 18 }, { x: 22, z: 14 }, { x: 18, z: 24 }
    ];
    fungalSpots.forEach(s => {
      this._addClonedProp(key, this.cachedModels.shroom_common, s.x, 0, s.z, 1.2, rng() * Math.PI * 2);
      this._addClonedProp(key, this.cachedModels.shroom_common, s.x + 0.8, 0, s.z + 0.6, 0.95, rng() * Math.PI * 2);
      this._addClonedProp(key, this.cachedModels.shroom_laetiporus, s.x - 0.9, 0.35, s.z - 0.7, 1.15, rng() * Math.PI * 2);
    });

    // 2. Dark Mossy Rocks
    const rockSpots = [
      { x: -18, z: -18, s: 1.20, r: 1.45 },
      { x: 16, z: -16, s: 1.25, r: 1.5 },
      { x: -20, z: 18, s: 1.15, r: 1.4 },
      { x: 18, z: 20, s: 1.30, r: 1.55 }
    ];
    rockSpots.forEach(r => {
      const rModel = rng() > 0.5 ? this.cachedModels.rock2 : this.cachedModels.rock3;
      this._addClonedProp(key, rModel, r.x, 0, r.z, r.s, rng() * Math.PI * 2, r.r);
    });

    // 3. Exotic ferns in shadow
    fungalSpots.slice(0, 8).forEach(s => {
      this._addClonedProp(key, this.cachedModels.fern, s.x + 2.0, 0, s.z + 1.5, 0.40, rng() * Math.PI * 2);
    });

    // 4. Shaded bushes
    rockSpots.forEach(r => {
      this._addClonedProp(key, this.cachedModels.bush_common, r.x - 2.5, 0, r.z + 1.5, 0.95, rng() * Math.PI * 2);
    });

    // 5. Twilight Petals
    const petals = [];
    for (let i = 0; i < 80; i++) {
      const s = fungalSpots[i % fungalSpots.length];
      petals.push({
        x: s.x + (rng() - 0.5) * 8,
        z: s.z + (rng() - 0.5) * 8,
        rotY: rng() * Math.PI * 2,
        scale: 0.85 + rng() * 0.35
      });
    }
    this._addInstancedPetals(key, petals);

    // 6. Pebbles
    const pebbles = [];
    for (let i = 0; i < 65; i++) {
      const s = fungalSpots[i % fungalSpots.length];
      pebbles.push({
        x: s.x + (rng() - 0.5) * 7,
        z: s.z + (rng() - 0.5) * 7,
        scale: 0.45 + rng() * 0.4,
        rotX: 0, rotY: rng() * Math.PI * 2, rotZ: 0,
        typeIdx: Math.floor(rng() * 5)
      });
    }
    this._addInstancedPebbles(key, pebbles);
  }

  // ============================================================================
  // ZONE 3_4: SENDA SUR DEL BOSQUE (Riberas de Pinos y Vados del Sur)
  // River corridor: x in [2.0, 15.0]
  // ============================================================================
  _buildZone3_4() {
    const key = '3_4';
    const rng = createRng(3044);

    // 1. South River Pines
    const pineSpots = [
      { x: -5.0, z: -20, s: 1.20, r: 0.8 },
      { x: -4.0, z: -8,  s: 1.30, r: 0.85 },
      { x: -5.5, z: 8,   s: 1.15, r: 0.75 },
      { x: -4.5, z: 22,  s: 1.25, r: 0.85 },
      { x: 20.5, z: -18, s: 1.25, r: 0.85 },
      { x: 21.0, z: -4,  s: 1.10, r: 0.75 },
      { x: 20.0, z: 12,  s: 1.30, r: 0.85 },
      { x: 21.5, z: 24,  s: 1.20, r: 0.8 }
    ];
    pineSpots.forEach(p => {
      const pModel = rng() > 0.5 ? this.cachedModels.pine1 : this.cachedModels.pine3;
      this._addClonedProp(key, pModel, p.x, 0, p.z, p.s, rng() * Math.PI * 2, p.r);
    });

    // 2. Riverbed Outcrops
    const rockSpots = [
      { x: 2.5,  z: -14, s: 1.20, r: 1.45 },
      { x: 2.2,  z: 16,  s: 1.15, r: 1.4 },
      { x: 15.0, z: -10, s: 1.25, r: 1.5 },
      { x: 15.5, z: 14,  s: 1.10, r: 1.35 }
    ];
    rockSpots.forEach(r => {
      this._addClonedProp(key, this.cachedModels.rock1, r.x, 0, r.z, r.s, rng() * Math.PI * 2, r.r);
    });

    // 3. Flowering and common bushes
    pineSpots.slice(0, 6).forEach(p => {
      const bModel = rng() > 0.5 ? this.cachedModels.bush_flowers : this.cachedModels.bush_common;
      this._addClonedProp(key, bModel, p.x + (rng() - 0.5) * 3, 0, p.z + (rng() - 0.5) * 3, 0.95, rng() * Math.PI * 2);
    });

    // 4. Shelf mushrooms on pines
    pineSpots.slice(0, 6).forEach(p => {
      this._addClonedProp(key, this.cachedModels.shroom_laetiporus, p.x + 0.6, 0.4, p.z + 0.4, 1.1, rng() * Math.PI * 2);
    });

    // 5. River pebbles
    const pebbles = [];
    for (let i = 0; i < 75; i++) {
      const isEast = rng() > 0.5;
      const baseX = isEast ? 16.0 + rng() * 4 : -4.0 - rng() * 4;
      const baseZ = (rng() - 0.5) * 60;
      pebbles.push({
        x: baseX, z: baseZ, scale: 0.45 + rng() * 0.45,
        rotX: 0, rotY: rng() * Math.PI * 2, rotZ: 0,
        typeIdx: Math.floor(rng() * 5)
      });
    }
    this._addInstancedPebbles(key, pebbles);
  }

  // ============================================================================
  // ZONE 4_4: ENCRUCIJADA DEL GUARDIÁN (Encrucijada Monumental de Piedra)
  // ============================================================================
  _buildZone4_4() {
    const key = '4_4';
    const rng = createRng(4044);

    // 1. Guardian Monumental Rocks (framing the crossroad)
    const monumentRocks = [
      { x: -8, z: -8, s: 1.25, r: 1.5 },
      { x: 8,  z: -8, s: 1.20, r: 1.45 },
      { x: -8, z: 8,  s: 1.30, r: 1.55 },
      { x: 8,  z: 8,  s: 1.25, r: 1.5 },
      { x: -20, z: -18, s: 1.15, r: 1.4 },
      { x: 20,  z: -18, s: 1.10, r: 1.35 },
      { x: -20, z: 18,  s: 1.20, r: 1.45 },
      { x: 20,  z: 18,  s: 1.15, r: 1.4 }
    ];
    monumentRocks.forEach(r => {
      const rModel = rng() > 0.5 ? this.cachedModels.rock3 : this.cachedModels.rock2;
      this._addClonedProp(key, rModel, r.x, 0, r.z, r.s, rng() * Math.PI * 2, r.r);
    });

    // 2. Corner Sentinel Pines
    const pineSpots = [
      { x: -24, z: -22, s: 1.25, r: 0.85 },
      { x: 24,  z: -22, s: 1.30, r: 0.85 },
      { x: -24, z: 22,  s: 1.20, r: 0.8 },
      { x: 24,  z: 22,  s: 1.25, r: 0.85 }
    ];
    pineSpots.forEach(p => {
      this._addClonedProp(key, this.cachedModels.pine1, p.x, 0, p.z, p.s, rng() * Math.PI * 2, p.r);
    });

    // 3. Flower bushes marking the crossroads
    monumentRocks.slice(0, 4).forEach(m => {
      this._addClonedProp(key, this.cachedModels.bush_flowers, m.x + (rng() - 0.5) * 2.5, 0, m.z + (rng() - 0.5) * 2.5, 1.05, rng() * Math.PI * 2);
    });

    // 4. Petal trails
    const petals = [];
    for (let i = 0; i < 80; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 6 + rng() * 18;
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      if (Math.abs(px) > 3.5 || Math.abs(pz) > 3.5) {
        petals.push({ x: px, z: pz, rotY: rng() * Math.PI * 2, scale: 0.85 + rng() * 0.35 });
      }
    }
    this._addInstancedPetals(key, petals);

    // 5. Pebbles
    const pebbles = [];
    for (let i = 0; i < 70; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 5 + rng() * 20;
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      if (Math.abs(px) > 3.5 || Math.abs(pz) > 3.5) {
        pebbles.push({
          x: px, z: pz, scale: 0.45 + rng() * 0.4,
          rotX: 0, rotY: rng() * Math.PI * 2, rotZ: 0,
          typeIdx: Math.floor(rng() * 7)
        });
      }
    }
    this._addInstancedPebbles(key, pebbles);
  }

  // ============================================================================
  // ZONE ACTIVATION & TRANSITION
  // ============================================================================
  setZone(gx, gy, collisions = null) {
    const zoneKey = `${gx}_${gy}`;
    const hasZone = !!this.zoneGroups[zoneKey];
    const isForest = (gx === 2 && gy === 2);
    const colMgr = collisions || this.collisions;

    if (!isForest || !hasZone) {
      this.group.visible = false;
      this.currentZoneKey = null;
      if (colMgr && typeof colMgr.removeCirclesByTag === 'function') {
        colMgr.removeCirclesByTag('forest_nature_');
      }
      return;
    }

    this.group.visible = true;
    this.currentZoneKey = zoneKey;

    // Toggle visibility for each zone group
    Object.keys(this.zoneGroups).forEach(key => {
      this.zoneGroups[key].visible = (key === zoneKey);
    });

    // Collision management
    if (colMgr && typeof colMgr.removeCirclesByTag === 'function') {
      colMgr.removeCirclesByTag('forest_nature_');
      const list = this.zoneCollisions[zoneKey] || [];
      list.forEach(c => {
        colMgr.addCircle(c.x, c.z, c.radius, c.tag);
      });
    }

    console.log(`[ForestNatureManager] Activated Forest Zone [${gx}, ${gy}] (${zoneKey}) with ${this.zoneCollisions[zoneKey]?.length || 0} nature collisions`);
  }

  setVisible(visible) {
    this.group.visible = visible;
    if (!visible && this.collisions && typeof this.collisions.removeCirclesByTag === 'function') {
      this.collisions.removeCirclesByTag('forest_nature_');
    }
  }

  update(delta) {
    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }
}

// Backward-compatibility alias
export const DojoNatureManager = ForestNatureManager;
