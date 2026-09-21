// DojoNatureManager.js - Integrates Stylized Nature MegaKit assets into Zone [3, 3] (Dojo of Lunacia)
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';

// Handcrafted layout for Bush_Common_Flowers in Zone [3, 3]
const BUSH_COMMON_FLOWERS_LAYOUT = [
  // 1. Dojo Pagoda Porch & Foundation Walls (x: -10.5, z: -15.5)
  { x: -13.8, y: 0.0, z: -10.8, scale: 0.95, rotationY: 0.5 },
  { x: -7.2,  y: 0.0, z: -10.8, scale: 1.05, rotationY: 2.1 },
  { x: -15.5, y: 0.0, z: -15.0, scale: 1.15, rotationY: 1.2 },
  { x: -5.5,  y: 0.0, z: -15.0, scale: 0.90, rotationY: 3.7 },
  { x: -10.5, y: 0.0, z: -21.2, scale: 1.25, rotationY: 1.6 },

  // 2. Master Paladill Training Area Surroundings (x: -14.5, z: -8.5)
  { x: -17.5, y: 0.0, z: -7.2,  scale: 0.85, rotationY: 0.9 },

  // 3. South-West Sanctuary Ruins & Column Bases ([-20.5, -3.0], [-22.2, -4.5], [-18.8, -2.0])
  { x: -21.8, y: 0.0, z: -6.2,  scale: 1.10, rotationY: 1.7 },
  { x: -24.2, y: 0.0, z: -3.8,  scale: 0.95, rotationY: 0.4 },
  { x: -17.5, y: 0.0, z: -3.8,  scale: 1.00, rotationY: 3.1 },
  { x: -19.5, y: 0.0, z: -0.8,  scale: 0.85, rotationY: 2.0 },

  // 4. North Giant Monolith Backdrop ([-11.5, -25.5])
  { x: -14.2, y: 0.0, z: -24.0, scale: 1.25, rotationY: 0.7 },
  { x: -8.8,  y: 0.0, z: -24.5, scale: 1.15, rotationY: 2.8 },

  // 5. West Riverbank (overlooking water and stones)
  { x: 3.2,   y: 0.0, z: -4.5,  scale: 1.05, rotationY: 1.5 },
  { x: 3.6,   y: 0.0, z: 3.8,   scale: 0.90, rotationY: 0.3 },
  { x: 2.8,   y: 0.0, z: -11.5, scale: 1.15, rotationY: 2.6 },

  // 6. East Riverbank (opposite shore near stepping stones)
  { x: 13.6,  y: 0.0, z: -4.0,  scale: 1.10, rotationY: 3.4 },
  { x: 14.0,  y: 0.0, z: 4.5,   scale: 0.95, rotationY: 1.1 },
  { x: 13.2,  y: 0.0, z: -11.0, scale: 1.20, rotationY: 0.6 },

  // 7. North-West Bamboo Grove Margins ([-12.0, -31.5])
  { x: -16.5, y: 0.0, z: -28.5, scale: 1.15, rotationY: 1.9 },
  { x: -7.5,  y: 0.0, z: -29.0, scale: 1.05, rotationY: 4.0 },

  // 8. Framing Japanese Red Autumn Maples
  { x: -22.8, y: 0.0, z: -13.2, scale: 0.95, rotationY: 2.2 },
  { x: 19.8,  y: 0.0, z: -12.2, scale: 1.00, rotationY: 1.4 },
  { x: 18.8,  y: 0.0, z: 18.8,  scale: 1.10, rotationY: 0.8 },
  { x: -17.2, y: 0.0, z: 23.2,  scale: 1.05, rotationY: 3.3 },

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
  { x: -5.7,  y: 0.0, z: -7.9, scale: 1.15, rotationY: 1.1, type: 'common' }
];

// Handcrafted layout for Mushroom_Common clusters in Zone [3, 3]
const MUSHROOM_COMMON_LAYOUT = [
  // 1. Base of Tree Trunks
  { x: -20.8, y: 0.0, z: -13.8, scale: 1.15, rotationY: 0.4 },  // Red Maple 1
  { x: 19.2,  y: 0.0, z: -14.2, scale: 1.10, rotationY: 2.8 },  // Red Maple 3
  { x: 21.2,  y: 0.0, z: 16.8,  scale: 1.05, rotationY: 1.9 },  // Red Maple 4
  { x: -17.8, y: 0.0, z: 22.8,  scale: 1.10, rotationY: 3.2 },  // Red Maple 5
  { x: -28.8, y: 0.0, z: -22.4, scale: 1.20, rotationY: 0.9 },  // Green Tree NW
  { x: -31.2, y: 0.0, z: -11.5, scale: 1.05, rotationY: 2.1 },  // Green Tree W
  { x: 25.8,  y: 0.0, z: -24.0, scale: 1.10, rotationY: 4.0 },  // Green Tree NE
  { x: 27.8,  y: 0.0, z: 8.2,   scale: 1.15, rotationY: 1.5 },  // Green Tree E
  { x: -28.8, y: 0.0, z: 25.8,  scale: 1.10, rotationY: 0.6 },  // Green Tree SW
  { x: 17.2,  y: 0.0, z: 27.8,  scale: 1.05, rotationY: 2.7 },  // Green Tree SE

  // 2. Base of Rocks & Column Ruins
  { x: -21.2, y: 0.0, z: -4.8,  scale: 1.20, rotationY: 1.6 },  // SW Boulder
  { x: -19.8, y: 0.0, z: -1.2,  scale: 1.00, rotationY: 2.7 },  // SW Pillar base (clear of path)
  { x: -12.8, y: 0.0, z: -24.8, scale: 1.25, rotationY: 0.8 },  // North Giant Monolith
  { x: 12.2,  y: 0.0, z: -6.8,  scale: 1.05, rotationY: 3.5 },  // NE Sentinel Pillar
  { x: 15.2,  y: 0.0, z: -9.2,  scale: 1.15, rotationY: 1.1 },  // NE Boulder
  { x: -5.8,  y: 0.0, z: -11.2, scale: 0.95, rotationY: 0.5 },  // Central Boulder

  // 3. Around Dojo Temple Foundation
  { x: -13.5, y: 0.0, z: -16.8, scale: 1.15, rotationY: 0.7 },  // West wooden wall
  { x: -7.5,  y: 0.0, z: -16.8, scale: 1.05, rotationY: 2.3 },  // East wooden wall
  { x: -11.8, y: 0.0, z: -20.8, scale: 1.25, rotationY: 1.4 },  // Back terrace shadow
  { x: -9.2,  y: 0.0, z: -20.6, scale: 1.00, rotationY: 3.8 },  // Back terrace shadow

  // 4. Riverbank & Bamboo Shaded Margins
  { x: 3.8,   y: 0.0, z: -2.5,  scale: 0.95, rotationY: 1.8 },  // Riverbank near stones
  { x: -13.5, y: 0.0, z: -28.2, scale: 1.10, rotationY: 2.4 }   // Bamboo grove edge
];

// Handcrafted layout for Mushroom_Laetiporus (shelf/bracket tree fungi) in Zone [3, 3]
const MUSHROOM_LAETIPORUS_LAYOUT = [
  // 1. Shelf Fungi Clinging to Tree Bases
  { x: -22.2, y: 0.0, z: -14.9, scale: 0.90, rotationY: 2.1 },  // Red Maple 1
  { x: 17.8,  y: 0.0, z: -13.0, scale: 0.85, rotationY: 0.8 },  // Red Maple 3
  { x: 20.0,  y: 0.0, z: 18.2,  scale: 0.95, rotationY: 3.4 },  // Red Maple 4
  { x: -19.2, y: 0.0, z: 21.4,  scale: 0.80, rotationY: 1.3 },  // Red Maple 5
  { x: -30.2, y: 0.0, z: -23.5, scale: 0.95, rotationY: 1.8 },  // Green Tree NW
  { x: -32.6, y: 0.0, z: -10.5, scale: 0.90, rotationY: 2.9 },  // Green Tree W
  { x: 27.1,  y: 0.0, z: -25.0, scale: 0.85, rotationY: 0.5 },  // Green Tree NE
  { x: 29.1,  y: 0.0, z: 7.0,   scale: 0.85, rotationY: 4.1 },  // Green Tree E
  { x: 16.0,  y: 0.0, z: 29.0,  scale: 0.90, rotationY: 3.8 },  // Green Tree SE

  // 2. Shelf Fungi on Dojo Foundation & Wooden Pillars
  { x: -15.2, y: 0.0, z: -13.8, scale: 0.85, rotationY: 1.1 },  // SW foundation corner
  { x: -5.8,  y: 0.0, z: -13.8, scale: 0.85, rotationY: 2.6 },  // SE foundation corner
  { x: -10.5, y: 0.0, z: -20.2, scale: 1.00, rotationY: 0.0 },  // North back foundation

  // 3. Shelf Fungi on Ancient Mossy Rocks
  { x: -23.0, y: 0.0, z: -3.5,  scale: 0.95, rotationY: 1.8 },  // SW Column rock face
  { x: -10.2, y: 0.0, z: -25.0, scale: 1.05, rotationY: 3.1 },  // North Giant Monolith face
  { x: 14.2,  y: 0.0, z: -7.5,  scale: 0.85, rotationY: 0.7 },  // East river rock
  { x: -4.5,  y: 0.0, z: -11.2, scale: 0.80, rotationY: 2.4 }   // Central rock
];

// Deterministic linear congruential generator for reproducible scattering
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Generates petal positions scattered across the terrain, clustered around flowering bushes
function generatePetalPositions() {
  const rng = seededRandom(54321);
  const petals1 = [];
  const petals2 = [];

  const addPetal = (x, z, scaleMin = 0.70, scaleMax = 1.25) => {
    // Avoid pond basin in Zone [3, 3] (center x: -30.3, z: 12.0)
    const dxPond = x - (-30.3);
    const dzPond = z - 12.0;
    if (dxPond * dxPond + dzPond * dzPond < 18.0) return;

    // Avoid river water channel
    const rx = 8.5 + 1.8 * Math.sin(z * 0.09) + 0.8 * Math.cos(z * 0.21);
    if (Math.abs(x - rx) < 2.3) return;

    const scale = scaleMin + rng() * (scaleMax - scaleMin);
    const rotY = rng() * Math.PI * 2;
    const y = 0.003 + rng() * 0.003;
    const item = { x, y, z, scale, rotY };

    if (rng() > 0.5) {
      petals1.push(item);
    } else {
      petals2.push(item);
    }
  };

  // 1. Clustered densely near Bushes (User preference: "de preferencia cerca de los arbusto")
  BUSH_COMMON_FLOWERS_LAYOUT.forEach((bush) => {
    const count = 5 + Math.floor(rng() * 4); // 5 to 8 petals around each bush
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 0.50 + rng() * 1.55; // 0.50m to 2.05m around bush base
      addPetal(bush.x + Math.cos(angle) * dist, bush.z + Math.sin(angle) * dist);
    }
  });

  // 2. Around Japanese Red Autumn Maples & Big Trees
  const treeSpots = [
    { x: -22.8, z: -13.2, count: 9, r: 3.5 }, // Red Maple 1
    { x: 19.8,  z: -12.2, count: 9, r: 3.5 }, // Red Maple 3
    { x: 18.8,  z: 18.8,  count: 9, r: 3.5 }, // Red Maple 4
    { x: -17.2, z: 23.2,  count: 9, r: 3.5 }, // Red Maple 5
    { x: -28.8, z: -22.4, count: 5, r: 3.0 },
    { x: -31.2, z: -11.5, count: 5, r: 3.0 },
    { x: 25.8,  z: -24.0, count: 5, r: 3.0 },
    { x: 27.8,  z: 8.2,   count: 5, r: 3.0 },
    { x: -28.8, z: 25.8,  count: 5, r: 3.0 },
    { x: 17.2,  z: 27.8,  count: 5, r: 3.0 }
  ];
  treeSpots.forEach(t => {
    for (let i = 0; i < t.count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 0.8 + rng() * (t.r - 0.8);
      addPetal(t.x + Math.cos(angle) * dist, t.z + Math.sin(angle) * dist);
    }
  });

  // 3. Scattered along Pagoda Forecourt & Garden Borders
  const gardenSpots = [
    { x: -10.5, z: -9.0,  count: 6, r: 2.2 },
    { x: -14.0, z: -13.5, count: 5, r: 2.0 },
    { x: -7.0,  z: -13.5, count: 5, r: 2.0 },
    { x: -20.5, z: -3.0,  count: 6, r: 2.5 },
    { x: -18.5, z: -7.5,  count: 6, r: 2.5 },
    { x: 4.5,   z: -8.0,  count: 5, r: 2.5 },
    { x: 4.2,   z: 1.5,   count: 5, r: 2.5 },
    { x: 12.5,  z: -8.0,  count: 5, r: 2.5 },
    { x: 12.8,  z: 1.5,   count: 5, r: 2.5 },
    // Grassy open ground
    { x: -5.0,  z: 5.0,   count: 4, r: 2.0 },
    { x: -12.0, z: 8.0,   count: 4, r: 2.0 },
    { x: 5.0,   z: 15.0,  count: 4, r: 2.0 },
    { x: -10.0, z: 18.0,  count: 4, r: 2.0 }
  ];
  gardenSpots.forEach(g => {
    for (let i = 0; i < g.count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 0.5 + rng() * (g.r - 0.5);
      addPetal(g.x + Math.cos(angle) * dist, g.z + Math.sin(angle) * dist);
    }
  });

  return { petals1, petals2 };
}

function distToSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

// Checks if a coordinate is on any stone path, cobblestone road, or pagoda stone terrace
function isOnStonePath(x, z) {
  // 1. Central North-South cobblestone road (|x| < 2.5, z from -12 to 30)
  if (Math.abs(x) < 2.5 && z >= -12.0 && z <= 30.0) return true;

  // 2. East road leading to river bridge crossing
  if (x >= -1.0 && x <= 8.5 && Math.abs(z) < 2.2) return true;

  // 3. West road to Master Paladill ([-14.5, -8.5])
  if (distToSegment(x, z, 0.0, -1.0, -14.5, -8.5) < 2.5) return true;

  // 4. Road from Paladill to SW Sanctuary ruins ([-20.5, -3.0])
  if (distToSegment(x, z, -14.5, -8.5, -20.5, -3.0) < 2.5) return true;

  // 5. Branch to Dojo Pagoda entrance
  if (distToSegment(x, z, 0.0, -10.0, -10.5, -11.0) < 2.5) return true;

  // 6. Pagoda stone terrace and wooden courtyard foundation
  if (x >= -16.5 && x <= -4.5 && z >= -22.5 && z <= -8.0) return true;

  return false;
}

// Generates pebble positions strictly on the grass, completely clear of stone paths
function generatePebblePositions() {
  const rng = seededRandom(98765);
  const pebbles = [];

  const tryAdd = (x, z, scaleMin = 0.20, scaleMax = 0.38) => {
    // 1. Strictly avoid any stone path or stone terrace
    if (isOnStonePath(x, z)) return;

    // 2. Avoid pond basin in Zone [3, 3] (center x: -30.3, z: 12.0)
    const dxPond = x - (-30.3);
    const dzPond = z - 12.0;
    if (dxPond * dxPond + dzPond * dzPond < 20.0) return;

    // 3. Avoid river water channel
    const rx = 8.5 + 1.8 * Math.sin(z * 0.09) + 0.8 * Math.cos(z * 0.21);
    if (Math.abs(x - rx) < 2.5) return;

    // 4. Bound within the 80x80m zone terrain
    if (Math.abs(x) > 37.0 || Math.abs(z) > 37.0) return;

    const scale = scaleMin + rng() * (scaleMax - scaleMin);
    const rotY = rng() * Math.PI * 2;
    const rotX = (rng() - 0.5) * 0.15;
    const rotZ = (rng() - 0.5) * 0.15;
    const typeIdx = Math.floor(rng() * 5); // 0 to 4 (Pebble_Round_1..5)
    pebbles.push({ x, y: 0.002, z, scale, rotX, rotY, rotZ, typeIdx });
  };

  // Grass meadows and clearings across Zone [3, 3]:
  const GRASS_ZONES = [
    // South-West lush grass meadow (clear of the road)
    { cx: -7.5,  cz: 8.0,   count: 8,  r: 3.5 },
    { cx: -13.0, cz: 16.0,  count: 10, r: 4.5 },
    { cx: -22.0, cz: 9.0,   count: 10, r: 4.5 },
    { cx: -18.0, cz: 22.0,  count: 8,  r: 4.0 },
    { cx: -26.0, cz: 24.0,  count: 8,  r: 4.0 },
    { cx: -7.0,  cz: 23.0,  count: 7,  r: 3.5 },

    // South-East grass meadow (between central road and river)
    { cx: 4.5,   cz: 8.0,   count: 8,  r: 2.2 },
    { cx: 5.0,   cz: 16.0,  count: 9,  r: 2.5 },
    { cx: 4.5,   cz: 24.0,  count: 8,  r: 2.2 },

    // East grass meadow (east of river)
    { cx: 16.0,  cz: 6.0,   count: 8,  r: 4.0 },
    { cx: 20.0,  cz: 14.0,  count: 10, r: 4.5 },
    { cx: 16.0,  cz: 22.0,  count: 8,  r: 4.0 },
    { cx: 24.0,  cz: 18.0,  count: 8,  r: 4.5 },

    // North-East grass meadow (forest edge)
    { cx: 16.0,  cz: -14.0, count: 9,  r: 4.0 },
    { cx: 22.0,  cz: -18.0, count: 10, r: 4.5 },
    { cx: 24.0,  cz: -8.0,  count: 8,  r: 4.0 },
    { cx: 15.0,  cz: -25.0, count: 7,  r: 3.5 },

    // North-West grass terrain (outside Pagoda terrace & pond)
    { cx: -24.0, cz: -18.0, count: 8,  r: 4.0 },
    { cx: -28.0, cz: -10.0, count: 8,  r: 3.5 },
    { cx: -18.0, cz: -26.0, count: 6,  r: 3.0 },
    { cx: -6.0,  cz: -26.0, count: 6,  r: 3.0 }
  ];

  GRASS_ZONES.forEach(zone => {
    for (let i = 0; i < zone.count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * zone.r;
      tryAdd(
        zone.cx + Math.cos(angle) * dist,
        zone.cz + Math.sin(angle) * dist
      );
    }
  });

  return pebbles;
}

export class DojoNatureManager {
  constructor(scene, collisions = null) {
    this.scene = scene;
    this.collisions = collisions;

    this.group = new THREE.Group();
    this.group.name = 'dojo_nature_decorations';
    this.group.visible = false;
    this.scene.add(this.group);

    this.uniforms = {
      uTime: { value: 0.0 }
    };

    this.cachedBushModel = null;
    this.cachedCommonShroomModel = null;
    this.cachedLaetiporusModel = null;

    this.bushes = [];
    this.mushroomCommons = [];
    this.mushroomLaetiporus = [];
    this.petalMeshes = [];
    this.pebbleMeshes = [];

    this.isLoaded = false;
  }

  async init() {
    console.log('[DojoNatureManager] Loading Stylized Nature MegaKit assets (Bushes, Mushrooms, Petals & Pebbles)...');
    const loader = new GLTFLoader();

    try {
      const [
        bushGltf, commonShroomGltf, laetiporusGltf,
        petal1Gltf, petal2Gltf,
        peb1Gltf, peb2Gltf, peb3Gltf, peb4Gltf, peb5Gltf
      ] = await Promise.all([
        loader.loadAsync('./assets/nature/Bush_Common_Flowers.gltf'),
        loader.loadAsync('./assets/nature/Mushroom_Common.gltf'),
        loader.loadAsync('./assets/nature/Mushroom_Laetiporus.gltf'),
        loader.loadAsync('./assets/nature/Petal_1.gltf'),
        loader.loadAsync('./assets/nature/Petal_2.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_1.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_2.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_3.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_4.gltf'),
        loader.loadAsync('./assets/nature/Pebble_Round_5.gltf')
      ]);

      const bushRoot = bushGltf.scene || bushGltf.scenes[0];
      const commonShroomRoot = commonShroomGltf.scene || commonShroomGltf.scenes[0];
      const laetiporusRoot = laetiporusGltf.scene || laetiporusGltf.scenes[0];

      // Setup materials with shadows and proper color spaces
      this._setupBushMaterials(bushRoot);
      this._setupMushroomMaterials(commonShroomRoot);
      this._setupMushroomMaterials(laetiporusRoot);

      this.cachedBushModel = bushRoot;
      this.cachedCommonShroomModel = commonShroomRoot;
      this.cachedLaetiporusModel = laetiporusRoot;

      this._buildFlowerBushes();
      this._buildMushroomCommons();
      this._buildMushroomLaetiporus();

      // Extract Petal models & materials
      const petal1Geom = this._extractGeometry(petal1Gltf.scene || petal1Gltf.scenes[0]);
      const petal2Geom = this._extractGeometry(petal2Gltf.scene || petal2Gltf.scenes[0]);
      const petalMat = this._extractMaterial(petal1Gltf.scene || petal1Gltf.scenes[0]);
      if (petalMat) {
        petalMat.side = THREE.DoubleSide;
        petalMat.alphaTest = 0.22;
        petalMat.depthWrite = true;
        petalMat.roughness = 0.78;
        petalMat.metalness = 0.0;
        if (petalMat.map) {
          petalMat.map.colorSpace = THREE.SRGBColorSpace;
          petalMat.map.flipY = false;
          petalMat.map.needsUpdate = true;
        }
      }

      // Extract Pebble models & materials
      const pebbleGeoms = [peb1Gltf, peb2Gltf, peb3Gltf, peb4Gltf, peb5Gltf].map(gltf =>
        this._extractGeometry(gltf.scene || gltf.scenes[0])
      );
      const pebbleMat = this._extractMaterial(peb1Gltf.scene || peb1Gltf.scenes[0]);
      if (pebbleMat) {
        pebbleMat.roughness = 0.85;
        pebbleMat.metalness = 0.02;
        if (pebbleMat.map) {
          pebbleMat.map.colorSpace = THREE.SRGBColorSpace;
          pebbleMat.map.flipY = false;
          pebbleMat.map.needsUpdate = true;
        }
      }

      this._buildPetals(petal1Geom, petal2Geom, petalMat);
      this._buildPebbles(pebbleGeoms, pebbleMat);

      this.isLoaded = true;
      console.log(
        `[DojoNatureManager] Initialized successfully with ${this.bushes.length} Bushes, ` +
        `${this.mushroomCommons.length} Common Mushrooms, ${this.mushroomLaetiporus.length} Laetiporus Mushrooms, ` +
        `Petals and Road/Ground Pebbles!`
      );
    } catch (err) {
      console.error('[DojoNatureManager] Failed to load nature assets:', err);
    }
  }

  _setupBushMaterials(root) {
    root.traverse((child) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material;
        mat.side = THREE.DoubleSide;
        mat.alphaTest = 0.22;
        mat.depthWrite = true;
        mat.metalness = 0.0;
        mat.roughness = 0.82;

        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.needsUpdate = true;
        }

        // Add organic wind breeze sway to bush foliage and flowers
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = this.uniforms.uTime;

          shader.vertexShader = `
            uniform float uTime;
            ${shader.vertexShader}
          `.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            // Gentle wind sway on upper leaves and flower petals
            float swayWeight = max(0.0, position.y) * 0.06;
            float swayPhase = uTime * 2.1 + (modelMatrix[3][0] + position.x) * 1.5 + (modelMatrix[3][2] + position.z) * 1.5;
            transformed.x += sin(swayPhase) * swayWeight;
            transformed.z += cos(swayPhase * 0.85) * swayWeight * 0.7;
            `
          );
        };
      }
    });
  }

  _setupMushroomMaterials(root) {
    root.traverse((child) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mat = child.material;
        mat.side = THREE.DoubleSide;
        mat.metalness = 0.0;
        mat.roughness = 0.76;

        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.needsUpdate = true;
        }
      }
    });
  }

  _buildFlowerBushes() {
    if (!this.cachedBushModel) return;

    BUSH_COMMON_FLOWERS_LAYOUT.forEach((def, idx) => {
      const bush = this.cachedBushModel.clone(true);
      bush.name = `bush_flower_${idx}`;
      bush.position.set(def.x, def.y, def.z);
      bush.rotation.y = def.rotationY;
      bush.scale.setScalar(def.scale);

      this.group.add(bush);
      this.bushes.push(bush);
    });
  }

  _buildMushroomCommons() {
    if (!this.cachedCommonShroomModel) return;

    MUSHROOM_COMMON_LAYOUT.forEach((def, idx) => {
      const shroom = this.cachedCommonShroomModel.clone(true);
      shroom.name = `mushroom_common_${idx}`;
      shroom.position.set(def.x, def.y, def.z);
      shroom.rotation.y = def.rotationY;
      shroom.scale.setScalar(def.scale);

      this.group.add(shroom);
      this.mushroomCommons.push(shroom);
    });
  }

  _buildMushroomLaetiporus() {
    if (!this.cachedLaetiporusModel) return;

    MUSHROOM_LAETIPORUS_LAYOUT.forEach((def, idx) => {
      const shroom = this.cachedLaetiporusModel.clone(true);
      shroom.name = `mushroom_laetiporus_${idx}`;
      shroom.position.set(def.x, def.y, def.z);
      shroom.rotation.y = def.rotationY;
      shroom.scale.setScalar(def.scale);

      this.group.add(shroom);
      this.mushroomLaetiporus.push(shroom);
    });
  }

  _extractGeometry(root) {
    let geom = null;
    root.traverse(c => {
      if (!geom && c.isMesh && c.geometry) geom = c.geometry.clone();
    });
    return geom;
  }

  _extractMaterial(root) {
    let mat = null;
    root.traverse(c => {
      if (!mat && c.isMesh && c.material) mat = c.material.clone();
    });
    return mat;
  }

  _buildPetals(petal1Geom, petal2Geom, petalMat) {
    if (!petal1Geom || !petal2Geom || !petalMat) return;

    const { petals1, petals2 } = generatePetalPositions();
    const dummy = new THREE.Object3D();

    const buildInstGroup = (geom, list, name) => {
      if (!list.length) return;
      const instMesh = new THREE.InstancedMesh(geom, petalMat, list.length);
      instMesh.name = name;
      instMesh.receiveShadow = true;
      instMesh.castShadow = false;

      list.forEach((item, idx) => {
        dummy.position.set(item.x, item.y, item.z);
        dummy.rotation.set(0, item.rotY, 0);
        dummy.scale.setScalar(item.scale);
        dummy.updateMatrix();
        instMesh.setMatrixAt(idx, dummy.matrix);
      });

      instMesh.instanceMatrix.needsUpdate = true;
      this.group.add(instMesh);
      this.petalMeshes.push(instMesh);
    };

    buildInstGroup(petal1Geom, petals1, 'petals_1_instanced');
    buildInstGroup(petal2Geom, petals2, 'petals_2_instanced');
  }

  _buildPebbles(pebbleGeoms, pebbleMat) {
    if (!pebbleGeoms || !pebbleGeoms.length || !pebbleMat) return;

    const pebbles = generatePebblePositions();
    const grouped = [[], [], [], [], []];
    pebbles.forEach(p => {
      grouped[p.typeIdx % 5].push(p);
    });

    const dummy = new THREE.Object3D();

    grouped.forEach((list, idx) => {
      const geom = pebbleGeoms[idx % pebbleGeoms.length];
      if (!geom || !list.length) return;

      const instMesh = new THREE.InstancedMesh(geom, pebbleMat, list.length);
      instMesh.name = `pebbles_round_${idx + 1}_instanced`;
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;

      list.forEach((item, i) => {
        dummy.position.set(item.x, item.y, item.z);
        dummy.rotation.set(item.rotX, item.rotY, item.rotZ);
        dummy.scale.setScalar(item.scale);
        dummy.updateMatrix();
        instMesh.setMatrixAt(i, dummy.matrix);
      });

      instMesh.instanceMatrix.needsUpdate = true;
      this.group.add(instMesh);
      this.pebbleMeshes.push(instMesh);
    });
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  update(delta) {
    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }
}
