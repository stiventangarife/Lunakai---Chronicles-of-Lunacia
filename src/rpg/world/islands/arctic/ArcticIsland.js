import * as THREE from 'three';
import { SimplexNoise, createSeededRandom } from '../../demo_scena/MathUtils.js';
import { fbm2D } from '../../demo_scena/grassShader.js';
import { GrandIslandZone, loadGLTF } from '../GrandIslandZone.js';
import { smooth } from '../kit/IslandTerrainData.js';
import { crystalMaterial, islandRockMaterial } from '../kit/IslandMaterials.js';
import { toonifyGroup } from '../kit/IslandArtLayer.js';
import { IslandParticles } from '../kit/IslandParticles.js';
import { ARCTIC_SITES, nearArcticSite } from './ArcticSites.js';
import { ArcticLandmarks } from './ArcticLandmarks.js';
import { ArcticIce, iceWalkHeight } from './ArcticIce.js';
import { ArcticTreeLOD } from './ArcticTreeLOD.js';

/**
 * Isla del Ártico (Hito 23) — "Los Cuernos de la Escarcha Eterna".
 * Read from the Forest silhouette: five knife-edged glacial horns (the central one the
 * tallest) with ice shelves at their feet.
 *
 *  - North: ring of horns (40–62 m, not walkable) forming the backdrop; the main horn is the
 *    island's focal point, seen from everywhere.
 *  - Centre: U-shaped glacial valley running north → south, frozen river in its floor.
 *  - Frozen permafrost lake by the Boreal Cooking Camp; stepped ice shelves on the south coast
 *    and drifting icebergs.
 *  - POIs (NPCs keep their quest positions): Valley of Eternal Frost (ice totems between the
 *    horns), Pomodoro's Greenhouse (green oasis under a glass dome), Boreal Cooking Camp.
 *  - Ice crystals & permafrost: the Arctic pack rocks (16–24 tris) stretched into shards with
 *    a glowing ice material, clustered at the foot of boulders.
 *
 * Mejora del bioma (plan del Ártico): frosty straw grass (no green), cold-blue shadows and a
 * cyan haze with low mist banks, translucent ice blocks with icicles, translucent lake / rivers
 * with frozen fish (walkable ice), frosted flagstones, ore veins instead of the ice shards
 * (visual only), Pomodoro's house + campfire + frost farm, Chef Boreal's market stall, the
 * Glacial Hermit's cabin + frozen pond and the Altar de Atia in place of the frost totems
 * (see ArcticSites / ArcticLandmarks / ArcticIce).
 */
const N1 = new SimplexNoise(9131);
const N2 = new SimplexNoise(4471);

const PEAKS = [
  { x: 0, z: -126, H: 62, R: 36 },
  { x: -50, z: -112, H: 46, R: 27 },
  { x: 46, z: -116, H: 44, R: 26 },
  { x: -90, z: -86, H: 34, R: 24 },
  { x: 88, z: -88, H: 32, R: 22 },
  { x: -116, z: -44, H: 22, R: 20 },
  { x: 114, z: -40, H: 20, R: 20 }
];
const LAKE = { x: -24, z: -38, r: 14, level: 3.45 };
const FROST_VALLEY = { x: -60, z: -76, r: 13 };
const GREENHOUSE = { x: 8, z: 29, r: 9 };
const CAMP = { x: -7, z: -22 };
const POND = ARCTIC_SITES.hermit.pond;

function valleyX(z) { return 16 * Math.sin(z * 0.012) - 6; }

function arcticHeight(x, z) {
  const r = Math.hypot(x, z);
  const n = N1.fbm(x * 0.012, z * 0.012, 3, 0.5, 2.0);
  // Glacial U-valley: flat floor, rounded walls rising to snowy hills
  const dv = Math.abs(x - valleyX(z));
  const floor = 4.6 + Math.max(0, -z) * 0.03;
  const wall = smooth(16, 58, dv) * (11 + 5 * n);
  let h = floor + wall + n * 1.2;
  // Knife-edged horns in the north
  for (const p of PEAKS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.R) {
      const t = 1 - d / p.R;
      const ridge = Math.abs(N2.noise2D(x * 0.05, z * 0.05));
      h = Math.max(h, floor + p.H * Math.pow(t, 1.35) * (0.82 + 0.25 * ridge) + wall * (1 - t));
    }
  }
  // Frost valley clearing between the horns
  const df = Math.hypot(x - FROST_VALLEY.x, z - FROST_VALLEY.z);
  if (df < FROST_VALLEY.r + 10) h = h + (10.5 - h) * smooth(FROST_VALLEY.r + 10, FROST_VALLEY.r, df);
  // Frozen river channel along the valley centre
  const carve = 0.7 * (1 - smooth(2.6, 5.5, dv)) * smooth(-112, -96, z) * (1 - smooth(118, 132, z));
  h -= carve;
  // Permafrost lake basin
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < LAKE.r + 8) {
    const bowl = LAKE.level - 1.4 * (1 - Math.pow(Math.min(1, dl / LAKE.r), 2));
    h = h + (Math.min(h, bowl + (dl > LAKE.r ? (dl - LAKE.r) * 0.35 + 0.3 : 0)) - h) * smooth(LAKE.r + 8, LAKE.r - 2, dl);
  }
  // Hermit's frozen pond (east edge of the frost valley)
  const dp = Math.hypot(x - POND.x, z - POND.z);
  if (dp < POND.r + 6) {
    const bowl = POND.level - POND.depth * (1 - Math.pow(Math.min(1, dp / POND.r), 2));
    h = h + (Math.min(h, bowl + (dp > POND.r ? (dp - POND.r) * 0.35 + 0.3 : 0)) - h) * smooth(POND.r + 6, POND.r - 1, dp);
  }
  // Flat terraces for the greenhouse and the camp
  const dg = Math.hypot(x - GREENHOUSE.x, z - GREENHOUSE.z);
  if (dg < 16) h = h + (5.4 - h) * smooth(16, 9, dg);
  // Stepped ice shelves on the south coast
  if (z > 60) {
    const shelf = r < 118 ? null : (r < 127 ? 3.3 : (r < 135 ? 2.2 : 1.3));
    if (shelf !== null) {
      const k = smooth(60, 85, z) * smooth(112, 120, r);
      h = h + (Math.min(h, shelf + n * 0.15) - h) * k;
    }
  }
  // Ocean falloff (horns keep their cliffs: they end at ~140 m)
  if (r > 136) {
    const c = smooth(136, 160, r);
    h = h * (1 - c) + -2.5 * c;
  }
  return h;
}

/** Deterministic boulder spots (shared by rocks, crystals and permafrost slabs). */
function boulderSpots() {
  const rng = createSeededRandom(5311);
  const spots = [];
  for (let i = 0; i < 400 && spots.length < 70; i++) {
    const a = rng() * Math.PI * 2;
    const rr = 15 + rng() * 118;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const h = arcticHeight(x, z);
    if (h < 2.0) continue;
    const dv = Math.abs(x - valleyX(z));
    if (dv < 7) continue;                                        // keep the river clear
    if (Math.hypot(x - GREENHOUSE.x, z - GREENHOUSE.z) < 16) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3) continue;
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < 10) continue;
    spots.push({ x, z, s: 1.8 + rng() * 3.6, rot: rng() * Math.PI * 2 });
  }
  // Drop the boulders on the new places and the one blocking the path to the Altar de Atia
  return spots.filter((p) => !nearArcticSite(p.x, p.z, p.s * 0.5 + 0.5) && pathDist(p.x, p.z) > p.s * 0.5 + 1.5);
}

const PATHS = [
  { points: [[5, 132], [3, 104], [1, 74], [3, 48], [6, 30]], width: 4.2 },
  { points: [[5, 22], [-1, 5], [-5, -12], [-7, -19]], width: 3.6 },
  { points: [[-10, -27], [-26, -52], [-42, -64], [-56, -72]], width: 3.2 },
  { points: [[-12, -23], [-22, -24], [-34, -30]], width: 2.8 }
];

function pathDist(x, z) {
  let best = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.points.length - 1; i++) {
    const [ax, az] = p.points[i], [bx, bz] = p.points[i + 1];
    const abx = bx - ax, abz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz)));
    best = Math.min(best, Math.hypot(x - ax - abx * t, z - az - abz * t));
  }
  return best;
}

function arcticProfile(zone) {
  const sun = new THREE.Vector3(92, 52, 108).normalize();
  return {
    id: 'arctic',
    // Slightly warm sun, cold blue fill: shadows on the snow read blue and give it volume
    light: { sunDir: sun, sunColor: 0xffe0c0, sunIntensity: 2.4, skyFill: 0x9cc2f0, groundFill: 0x7f9ed0, hemiIntensity: 1.4, ambientColor: 0xb8d0ff, ambientIntensity: 0.36 },
    fog: { color: 0xc6e2ee, density: 0.003 },     // cold cyan haze
    horizonHaze: 0.42,
    exposure: 0.96,
    bloom: { strength: 0.45, radius: 0.55, threshold: 0.9 },
    postFX: { warm: [1.04, 1.0, 0.96], cool: [0.84, 0.95, 1.14], saturation: 1.06, vignette: 0.2 },
    sky: {
      zenith: 0x4f86c9, mid: 0x9cc3e6, horizon: 0xffd6c2, horizonAway: 0xbfd3ee, sunDisk: 0xfff4e6, sunHalo: 0xffc6a0,
      cloudLit: 0xffffff, cloudShadow: 0xb3c0dc, cloudRim: 0xffd2b8, haze: 0xdbe9f6, cloudCoverage: 0.55,
      aurora: 0.32, auroraA: 0x6dffd0, auroraB: 0x8ab4ff
    },
    mountains: { sunColor: 0xffd9b8, haze: 0xd6e6f5, hazeAway: 0xbfd3ee, rockNear: 0x7d93ad, rockFar: 0xa8bdd6, snow: 0xffffff, grass: 0xcfd2c4 },
    sea: { sunColor: 0xffd9b8, shallow: 0x6fd3e0, mid: 0x2f8fb8, deep: 0x1b4f86, foam: 0xffffff, skyZenith: 0x4f86c9, skyHorizon: 0xffd6c2 },
    paths: PATHS,
    mask: ({ x, z, y, ny }) => {
      // Alpine grass only on the sheltered valley floor & the greenhouse; snow elsewhere
      const dv = Math.abs(x - valleyX(z));
      let g = (1 - smooth(10.5, 13.5, y)) * smooth(0.82, 0.92, ny);
      g *= smooth(0.5, 0.66, fbm2D(x * 0.035 + 7.0, z * 0.035 - 3.0));     // scattered alpine patches only
      g *= smooth(2.8, 5.0, dv);                                 // frozen river banks stay white
      g *= smooth(LAKE.r + 1, LAKE.r + 5, Math.hypot(x - LAKE.x, z - LAKE.z));
      g *= smooth(POND.r + 0.5, POND.r + 3, Math.hypot(x - POND.x, z - POND.z));
      if (nearArcticSite(x, z, -0.8)) g = 0;                       // floors of the new places
      g *= 1 - smooth(60, 80, z) * smooth(108, 118, Math.hypot(x, z));   // ice shelves
      const dg = Math.hypot(x - GREENHOUSE.x, z - GREENHOUSE.z);
      if (dg < GREENHOUSE.r) g = 1.0;
      const fl = (dg < GREENHOUSE.r ? 0.9 : 0.25 * smooth(0.6, 0.75, fbm2D(x * 0.03, z * 0.03 + 4.0))) * g;
      return { grass: g, flowers: fl, wet: 0 };
    },
    terrain: {
      // Frost-bleached tundra: pale straw, dry stems, bluish-white tips (no green)
      ground: { deep: 0x8d97a6, mid: 0xbdb594, light: 0xe4dfc8, dry: 0xdce6f0, dryAmount: 0.45 },
      soil: 0x8d8f98,
      heightRange: [4, 30],
      cliffSlope: [0.56, 0.72],
      pathFrameSignedFar: true,   // no stray line along the outer edge of the path band
      path: { tint: [1.12, 1.16, 1.26], dust: [1.25, 1.27, 1.3], desat: 0.9, ruts: 0.5 },
      uniforms: {
        uSnow: { value: new THREE.Color(0xeef4fb) },
        uSnowShade: { value: new THREE.Color(0xc5d6ee) },
        uIceShelf: { value: new THREE.Color(0xbfe6f2) },
        uRockA: { value: new THREE.Color(0x6f7d92) },
        uRockB: { value: new THREE.Color(0x9aa8ba) },
        uValleyPhase: { value: 0 }
      },
      surfaceGLSL: /* glsl */ `
        vec3 islandSurface(vec3 wp, vec3 nW, vec4 gm, vec3 meadow, float brush) {
          // Soft snow: wind-sculpted drifts, cool shading in the hollows, sparkle
          float drift = gFbm3(wp.xz * 0.045 + 2.0);
          float sastrugi = sin(dot(wp.xz, vec2(0.55, 0.83)) * 0.9 + gNoise(wp.xz * 0.12) * 5.0) * 0.5 + 0.5;
          vec3 snow = mix(uSnowShade, uSnow, smoothstep(0.25, 0.75, drift) * 0.7 + 0.3) * (0.97 + 0.05 * sastrugi);
          float sparkle = step(0.985, gHash12(floor(wp.xz * 9.0))) * 0.35;
          snow += vec3(sparkle);
          vec3 col = mix(snow, meadow, smoothstep(0.12, 0.55, gm.r));
          // Ice shelves on the south coast: cracked translucent blue plates
          float shelf = smoothstep(60.0, 80.0, wp.z) * smoothstep(114.0, 122.0, length(wp.xz)) * (1.0 - smoothstep(3.6, 4.4, wp.y));
          float cracks = 1.0 - smoothstep(0.0, 0.05, abs(gNoise(wp.xz * 0.25) - 0.5));
          vec3 ice = uIceShelf * (0.9 + 0.15 * brush);
          ice = mix(ice, vec3(0.97, 0.99, 1.0), cracks * 0.6);
          col = mix(col, ice, shelf * 0.85);
          return col;
        }`,
      cliffGLSL: /* glsl */ `
        vec3 islandCliff(vec3 wp, vec3 nW, float brush) {
          float n = gNoise(wp.xz * 0.12 + wp.y * 0.08);
          vec3 rock = mix(uRockA, uRockB, smoothstep(0.3, 0.75, n));
          float streak = gNoise(vec2((wp.x + wp.z) * 0.5, wp.y * 0.06));
          rock *= 0.85 + 0.25 * streak;
          // Snow caught on ledges and the upper horns
          float ledge = smoothstep(0.12, 0.42, nW.y + (n - 0.5) * 0.35);
          float alt = smoothstep(14.0, 40.0, wp.y + (n - 0.5) * 8.0);
          // Blue-white snow couloirs streaking down the horns
          float couloir = smoothstep(0.55, 0.8, gNoise(vec2((wp.x - wp.z) * 0.18, wp.y * 0.02)));
          vec3 snowC = mix(uSnowShade, uSnow, 0.55 + 0.45 * smoothstep(0.2, 0.8, nW.y));
          return mix(rock, snowC, clamp(ledge * 0.9 + alt * 0.5 + couloir * 0.45, 0.0, 0.95));
        }`
    },
    grass: {
      ground: { deep: 0x8d97a6, mid: 0xbdb594, light: 0xe4dfc8, dry: 0xdce6f0, dryAmount: 0.45 },
      flowers: [0xffffff, 0xe8f4ff, 0xbfe2ff, 0xa6ccf6],
      sunTint: 0xfff2dc, backlight: 0xeaf4ff, shadowTint: [0.76, 0.86, 1.2], heightScale: 0.8, windStrength: 0.26
    },
    treeCfg: {
      seed: 7101,
      snow: 0.5,
      palettes: {
        fir: [0x2f6a5a, 0x2a5f55, 0x3b7766, 0x356e60],
        frostdead: [0xffffff],
        // Variety (Axie arctic reference): turquoise firs and round snowy mint-teal trees
        firteal: [0x46c8b4, 0x55d6c0, 0x3cb4bf, 0x66dcc8],
        frostbroad: [0x6ccfa6, 0x7edcb4, 0x5cc2a8, 0x90e4c2]
      },
      trunks: {
        fir: { bark: 'pine', tone: [0.72, 0.68, 0.76] },
        frostdead: { bark: 'pine', tone: [1.2, 1.18, 1.25] },
        firteal: { bark: 'pine', tone: [0.85, 0.72, 0.7] },
        frostbroad: { bark: 'normal', tone: [0.95, 0.85, 0.8] }
      }
    },
    trees: () => arcticTrees(),
    // Fade LOD for the trees: full tree near the camera, dithered cross-fade to a low-poly proxy
    build: (layer) => {
      if (!layer.trees) return;
      const lod = new ArcticTreeLOD(layer.trees, {
        camera: () => zone.om && zone.om.camera,
        // referencia = jugador; si la cámara está lejos de él (recorridos, cinemáticas), la cámara
        focus: () => {
          const p = zone.om && zone.om.player && zone.om.player.position;
          const c = zone.om && zone.om.camera && zone.om.camera.position;
          if (!p) return null;
          if (c && Math.hypot(c.x - p.x, c.z - p.z) > 25) return c;
          return p;
        },
        snow: 0.5,
      });
      zone.treeLOD = lod;
      lod.update(true);
      layer.updatables.push(() => lod.update());
    },
    water: [
      { shape: 'disc', center: [LAKE.x, LAKE.z], radius: LAKE.r + 4, level: LAKE.level, mode: 1, name: 'ArcticFrozenLake',
        colors: { shallow: 0xcdeff7, deep: 0x5fb0d8, foam: 0xf6fbff }, opacity: 0.42 },
      { shape: 'disc', center: [POND.x, POND.z], radius: POND.r + 3, level: POND.level, mode: 1, name: 'ArcticHermitPond',
        colors: { shallow: 0xd3f1f8, deep: 0x6fbade, foam: 0xf6fbff }, opacity: 0.45 },
      { shape: 'ribbon', points: riverPoints(-104, -46), width: 6.2, level: (t) => riverLevel(-104, -46, t), mode: 1, name: 'ArcticFrozenRiverN',
        colors: { shallow: 0xd3f1f8, deep: 0x7cc3e0, foam: 0xf6fbff }, opacity: 0.7 },
      { shape: 'ribbon', points: riverPoints(-30, 128), width: 6.2, level: (t) => riverLevel(-30, 128, t), mode: 1, name: 'ArcticFrozenRiverS',
        colors: { shallow: 0xd3f1f8, deep: 0x7cc3e0, foam: 0xf6fbff }, opacity: 0.7 }
    ],
    particles: [
      { mode: 'snow', count: 900, velocity: [0.45, -1.2, 0.2], size: 5.0, colorA: 0xffffff, colorB: 0xdfefff, opacity: 0.85, sway: 0.7, box: [60, 22, 60], additive: false },
      { mode: 'sparkle', count: 180, velocity: [0.1, 0.06, 0.12], size: 2.2, colorA: 0xbfefff, colorB: 0xffffff, intensity: 1.5, opacity: 0.9, sway: 0.4, box: [40, 8, 40] }
    ]
  };
}

function riverPoints(z0, z1) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const z = z0 + (z1 - z0) * (i / 16);
    pts.push([valleyX(z), z]);
  }
  return pts;
}
function riverLevel(z0, z1, t) {
  const z = z0 + (z1 - z0) * t;
  const x = valleyX(z);
  // Ice surface sits just below the banks (carved 0.7 m)
  return arcticHeight(x + 4.5, z) - 0.35;
}

function arcticTrees() {
  const rng = createSeededRandom(8181);
  const out = [];
  const tryPlace = (x, z, s, family = 'fir', kind = 'conifer') => {
    const y = arcticHeight(x, z);
    if (y < 2.5 || y > 26) return;
    if (pathDist(x, z) < 4.5) return;
    if (Math.abs(x - valleyX(z)) < 7) return;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3) return;
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < 9) return;
    if (Math.hypot(x - FROST_VALLEY.x, z - FROST_VALLEY.z) < FROST_VALLEY.r) return;
    if (nearArcticSite(x, z, 1.5)) return;
    out.push({ kind, family, pos: new THREE.Vector3(x, y - 0.2, z), s, sy: s * (0.9 + rng() * 0.25) });
  };
  // Valley-wall forests (clustered groves)
  for (let g = 0; g < 16; g++) {
    const a = rng() * Math.PI * 2;
    const rr = 25 + rng() * 95;
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
    const n = 5 + Math.floor(rng() * 7);
    for (let i = 0; i < n; i++) tryPlace(cx + (rng() - 0.5) * 22, cz + (rng() - 0.5) * 22, 0.75 + rng() * 0.45);
  }
  // Ring of pines sheltering the greenhouse
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rng() * 0.2;
    const rr = GREENHOUSE.r + 5 + rng() * 3;
    tryPlace(GREENHOUSE.x + Math.cos(a) * rr, GREENHOUSE.z + Math.sin(a) * rr, 0.8 + rng() * 0.3);
  }
  // A few frost-bleached dead trees by the lake
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    tryPlace(LAKE.x + Math.cos(a) * (LAKE.r + 5), LAKE.z + Math.sin(a) * (LAKE.r + 5), 1.0, 'frostdead', 'dead');
  }
  return out.concat(arcticVarietyTrees(out));
}

/**
 * Extra trees for colour variety (own seed: the original trees above keep their places).
 * Turquoise fir groves, round snowy mint-teal trees and a few more frost-bleached dead trees,
 * kept clear of paths, places, rocks / ice blocks, NPCs, patrols, quest nodes and the ferry.
 */
function arcticVarietyTrees(existing) {
  const rng = createSeededRandom(8282);
  const out = [];
  const rocks = boulderSpots();
  rocks.push(...newIceSpots(rocks));   // new ice blocks too
  const avoid = [[5, 120, 8], [14.3, 136.2, 7], [-16, 12, 3], [11.5, -9.5, 3], [22, 15, 3],
    [56, 0, 9], [-72, 24, 9], [40, 64, 9], [56, -56, 9], [-64, -72, 9], [CAMP.x, CAMP.z, 10]];
  const free = (x, z, r) => {
    const y = arcticHeight(x, z);
    if (y < 2.5 || y > 24) return false;
    if (pathDist(x, z) < 4.5) return false;
    if (Math.abs(x - valleyX(z)) < 7.5) return false;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3) return false;
    if (Math.hypot(x - FROST_VALLEY.x, z - FROST_VALLEY.z) < FROST_VALLEY.r + 2) return false;
    if (Math.hypot(x - GREENHOUSE.x, z - GREENHOUSE.z) < GREENHOUSE.r + 3) return false;
    if (nearArcticSite(x, z, 2)) return false;
    for (const [ax, az, ar] of avoid) if (Math.hypot(x - ax, z - az) < ar) return false;
    for (const s of rocks) if (Math.hypot(x - s.x, z - s.z) < s.s * 0.6 + 1.5) return false;
    for (const t of existing) if (Math.hypot(x - t.pos.x, z - t.pos.z) < r) return false;
    for (const t of out) if (Math.hypot(x - t.pos.x, z - t.pos.z) < r) return false;
    return true;
  };
  const add = (x, z, s, family, kind, r) => {
    if (!free(x, z, r)) return;
    out.push({ kind, family, pos: new THREE.Vector3(x, arcticHeight(x, z) - 0.2, z), s, sy: s * (0.9 + rng() * 0.25) });
  };
  // Turquoise fir groves
  for (let g = 0; g < 12; g++) {
    const a = rng() * Math.PI * 2, rr = 26 + rng() * 92;
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
    const n = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) add(cx + (rng() - 0.5) * 18, cz + (rng() - 0.5) * 18, 0.75 + rng() * 0.45, 'firteal', 'conifer', 3.2);
  }
  // Round snowy trees in small clumps (meadows of the valley walls)
  for (let g = 0; g < 12; g++) {
    const a = rng() * Math.PI * 2, rr = 22 + rng() * 95;
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) add(cx + (rng() - 0.5) * 12, cz + (rng() - 0.5) * 12, 0.7 + rng() * 0.35, 'frostbroad', 'broad', 4.0);
  }
  // Accents around the places: round trees by the greenhouse, Pomodoro's house and the cabins
  for (const [x, z] of [[24, 8], [25, 20], [-3, 46], [24, 52], [4, -38], [2, -46], [-28, -64], [-41, -82], [-26, -76]]) {
    add(x + (rng() - 0.5) * 2, z + (rng() - 0.5) * 2, 0.75 + rng() * 0.25, rng() < 0.5 ? 'frostbroad' : 'firteal', rng() < 0.5 ? 'broad' : 'conifer', 3.0);
  }
  // More frost-bleached dead trees scattered on the snowfields
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2, rr = 30 + rng() * 90;
    add(Math.cos(a) * rr, Math.sin(a) * rr, 0.9 + rng() * 0.3, 'frostdead', 'dead', 4.0);
  }
  return out;
}

/** New translucent ice blocks (validated: off paths, places, river, lake, NPCs and patrols). */
function newIceSpots(existing) {
  const rng = createSeededRandom(3131);
  const out = [];
  const avoid = [[5, 120, 9], [14.3, 136.2, 7], [-16, 12, 3], [11.5, -9.5, 3], [22, 15, 3],
    [56, 0, 10], [-72, 24, 10], [40, 64, 10], [56, -56, 10], [-64, -72, 10], [CAMP.x, CAMP.z, 12]];
  const ok = (x, z, s) => {
    const h = arcticHeight(x, z);
    if (h < 2.2 || h > 16) return false;
    if (pathDist(x, z) < 4 + s * 0.5) return false;
    if (Math.abs(x - valleyX(z)) < 6 + s * 0.5) return false;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2 + s * 0.5) return false;
    if (Math.hypot(x - GREENHOUSE.x, z - GREENHOUSE.z) < 17) return false;
    if (nearArcticSite(x, z, s * 0.6 + 1)) return false;
    for (const [ax, az, r] of avoid) if (Math.hypot(x - ax, z - az) < r + s * 0.5) return false;
    for (const o of [...existing, ...out]) if (Math.hypot(x - o.x, z - o.z) < (o.s + s) * 0.6 + 2.5) return false;
    return true;
  };
  // Lake shore, river banks, south ice shelves, foot of the horns
  const cands = [];
  for (let i = 0; i < 10; i++) { const a = rng() * Math.PI * 2; cands.push([LAKE.x + Math.cos(a) * (LAKE.r + 5 + rng() * 5), LAKE.z + Math.sin(a) * (LAKE.r + 5 + rng() * 5)]); }
  for (let i = 0; i < 16; i++) { const z = -90 + rng() * 190; const side = rng() < 0.5 ? -1 : 1; cands.push([valleyX(z) + side * (9 + rng() * 6), z]); }
  for (let i = 0; i < 10; i++) { const a = 0.35 + rng() * 2.4; const r = 98 + rng() * 16; cands.push([Math.cos(a) * r, Math.sin(a) * r]); }
  for (const p of PEAKS) { const a = Math.PI * 0.5 + (rng() - 0.5) * 1.6; cands.push([p.x + Math.cos(a) * (p.R + 3), p.z + Math.sin(a) * (p.R + 3)]); }
  for (const [x, z] of cands) {
    if (out.length >= 14) break;
    const s = 2.4 + rng() * 2.2;
    if (ok(x, z, s)) out.push({ x, z, s, rot: rng() * Math.PI * 2, icicles: true });
  }
  return out;
}

/** Frosted flagstones: shore of the lake by the stall, around the hermit's pond, at the doors. */
function arcticFlagstones() {
  const rng = createSeededRandom(4242);
  const out = [];
  const line = (ax, az, bx, bz, step = 1.05, s = 0.9) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push([ax + (bx - ax) * t + (rng() - 0.5) * 0.3, az + (bz - az) * t + (rng() - 0.5) * 0.3, s * (0.85 + rng() * 0.3), rng() * 6.28]);
    }
  };
  const ring = (cx, cz, r, a0, a1, step = 1.1, s = 0.95) => {
    const n = Math.max(2, Math.round(((a1 - a0) * r) / step));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      const rr = r + (rng() - 0.5) * 0.5;
      out.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, s * (0.8 + rng() * 0.4), rng() * 6.28]);
    }
  };
  const S = ARCTIC_SITES;
  line(S.chef.stall.x - 1.6, S.chef.stall.z + 0.2, LAKE.x + LAKE.r + 0.6, S.chef.stall.z + 0.6);     // stall → ice
  ring(LAKE.x, LAKE.z, LAKE.r + 1.3, -0.55, 0.42);                                                   // east shore
  line(S.chef.fire.x + 0.8, S.chef.fire.z - 1.2, S.chef.stall.x - 1.4, S.chef.stall.z + 1.4, 1.0, 0.8);
  ring(POND.x, POND.z, POND.r + 1.0, 0, Math.PI * 2, 1.15, 0.9);                                    // hermit's pond
  line(S.hermit.cabin.x - 2.6, S.hermit.cabin.z, S.hermit.fire.x + 1.3, S.hermit.fire.z + 0.6, 1.0, 0.85);
  line(S.hermit.cabin.x - 1.0, S.hermit.cabin.z - 3.0, POND.x, POND.z + POND.r + 1.4, 1.1, 0.85);
  line(S.pomodoro.house.x - 3.4, S.pomodoro.house.z + 0.2, S.pomodoro.fire.x + 1.4, S.pomodoro.fire.z - 0.4, 1.0, 0.85);
  return out;
}

/** Low mist banks drifting over the valley floor, the lake, the frost valley and the pond. */
function arcticMist() {
  const rng = createSeededRandom(5151);
  const out = [];
  for (let z = -96; z <= 112; z += 13) {
    const x = valleyX(z) + (rng() - 0.5) * 22;
    if (Math.hypot(x - GREENHOUSE.x, z - GREENHOUSE.z) < 13) continue;
    out.push({ x, z: z + (rng() - 0.5) * 6, w: 22 + rng() * 14, h: 3.2 + rng() * 2.0 });
  }
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; out.push({ x: LAKE.x + Math.cos(a) * 8, z: LAKE.z + Math.sin(a) * 8, w: 20 + rng() * 8, h: 2.8 + rng() }); }
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 1.1; out.push({ x: FROST_VALLEY.x + Math.cos(a) * 9, z: FROST_VALLEY.z + Math.sin(a) * 9, w: 18 + rng() * 8, h: 3 + rng() }); }
  out.push({ x: POND.x - 2, z: POND.z + 1, w: 16, h: 2.6 });
  return out;
}

async function buildArctic(zone) {
  const g = zone.group;
  const time = { value: 0 };
  zone.updatables.push((dt) => { time.value += dt; });
  const permafrost = crystalMaterial({ color: 0x9fd8f0, glow: 0x3a8fd8, glowIntensity: 0.32, rim: 0xd8f6ff, opacity: 0.93, timeUniform: time, name: 'ArcticPermafrost' });

  // Boulders: one in three of the big ones becomes a translucent ice block (ArcticIce)
  const allSpots = boulderSpots();
  const spots = [];
  const iceSpots = [];
  let big = 0;
  allSpots.forEach((s) => {
    if (s.s > 3.0 && (big++ % 3) === 1) {
      const nearWater = Math.hypot(s.x - LAKE.x, s.z - LAKE.z) < LAKE.r + 14 || Math.abs(s.x - valleyX(s.z)) < 14;
      iceSpots.push({ ...s, icicles: nearWater || (big % 2 === 0) });
    } else spots.push(s);
  });
  zone.rockSpots = spots;
  let k = 0;
  zone.def.rocks = [1, 2, 3, 4].map((n) => ({
    url: `./assets/rocks/StylisedRockCollection${n}.glb`, count: Math.ceil(spots.length / 4), seed: 40 + n,
    place: () => (k < spots.length ? { ...spots[k++], tilt: 0.25 } : null)
  }));

  const flatGl = await loadGLTF('./assets/arctic/rock_smallFlatA.glb');
  let flatGeo = null;
  if (flatGl) flatGl.scene.traverse((o) => {
    if (o.isMesh && !flatGeo) {
      flatGeo = o.geometry.clone();
      flatGeo.computeBoundingBox();
      const bb = flatGeo.boundingBox; const sz = new THREE.Vector3(); bb.getSize(sz);
      flatGeo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      flatGeo.scale(1 / Math.max(sz.x, sz.z), 1 / sz.y, 1 / Math.max(sz.x, sz.z));
    }
  });
  const rng = createSeededRandom(6060);
  const flats = [];
  const oreSpots = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  // Ore veins (visual only) where the ice-shard clusters used to grow + permafrost slabs
  allSpots.forEach((s) => {
    if (rng() < 0.45) {
      const a = rng() * Math.PI * 2, d = s.s * 0.55 + 0.9;
      const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
      if (pathDist(x, z) > 2.6 && !nearArcticSite(x, z, 1)) oreSpots.push({ x, z, base: 0.55 + rng() * 0.45 });
    }
    if (flatGeo && rng() < 0.45) {
      const a = rng() * Math.PI * 2, d = s.s * 0.7 + 0.8;
      const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
      q.setFromEuler(new THREE.Euler(0, rng() * 6.28, 0));
      const w = 0.9 + rng() * 1.4;
      m4.compose(new THREE.Vector3(x, arcticHeight(x, z) - 0.08, z), q, new THREE.Vector3(w, 0.18, w * (0.6 + rng() * 0.5)));
      flats.push(m4.clone());
    }
  });
  // Ore beds at the base of the horns
  for (const p of PEAKS) for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2;
    oreSpots.push({ x: p.x + Math.cos(a) * p.R * 0.85, z: p.z + Math.sin(a) * p.R * 0.85, base: 0.9 + rng() * 0.4 });
  }
  if (flatGeo && flats.length) {
    const inst = new THREE.InstancedMesh(flatGeo, permafrost, flats.length);
    inst.name = 'ArcticPermafrostSlabs';
    flats.forEach((mm, j) => inst.setMatrixAt(j, mm));
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    g.add(inst);
  }

  // --- POI 1: Valley of Eternal Frost — the frost totems are replaced by the Altar de Atia,
  //     built at their centre (ArcticLandmarks).

  // --- POI 2: Pomodoro's Greenhouse — glass dome over a green garden
  const gy = arcticHeight(GREENHOUSE.x, GREENHOUSE.z);
  const glass = new THREE.MeshStandardMaterial({ color: 0xdff6ff, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, emissive: 0x9fe8ff, emissiveIntensity: 0.06 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(GREENHOUSE.r - 1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  dome.position.set(GREENHOUSE.x, gy, GREENHOUSE.z);
  dome.name = 'PomodoroGreenhouseDome';
  g.add(dome);
  const frameMat = new THREE.MeshToonMaterial({ color: 0x8a6a4a });
  const ribs = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(GREENHOUSE.r - 1.45, 0.07, 4, 24, Math.PI), frameMat);
    rib.rotation.set(0, (i / 8) * Math.PI, 0);
    ribs.add(rib);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(GREENHOUSE.r - 1.45, 0.12, 4, 32), frameMat);
  ring.rotation.x = Math.PI / 2;
  ribs.add(ring);
  ribs.position.set(GREENHOUSE.x, gy, GREENHOUSE.z);
  g.add(ribs);

  // --- POI 3: Boreal Cooking Camp — Arctic house, snowman, campfire with warm light & smoke
  const cy = arcticHeight(CAMP.x, CAMP.z);
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 6), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
  fire.position.set(CAMP.x - 3, cy + 0.45, CAMP.z + 1.5);
  g.add(fire);
  const fireLight = new THREE.PointLight(0xffa04a, 8, 16, 2);
  fireLight.position.set(CAMP.x - 3, cy + 1.6, CAMP.z + 1.5);
  g.add(fireLight);
  zone.updatables.push(() => {
    const f = 0.85 + Math.sin(time.value * 9.0) * 0.08 + Math.sin(time.value * 23.0) * 0.05;
    fireLight.intensity = 8 * f;
    fire.scale.set(1, f * 1.1, 1);
  });
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.22, 0), islandRockMaterial(null, { base: 0x7d8796 }), 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    m4.compose(new THREE.Vector3(CAMP.x - 3 + Math.cos(a) * 0.75, cy + 0.08, CAMP.z + 1.5 + Math.sin(a) * 0.75), q.identity(), new THREE.Vector3(1, 0.7, 1));
    stones.setMatrixAt(i, m4);
  }
  g.add(stones);
  zone.addCollider(CAMP.x - 3, CAMP.z + 1.5, 1.0);
  const smoke = new IslandParticles(g, { mode: 'sand', count: 60, velocity: [0.15, 1.1, 0.05], size: 9, colorA: 0xe8eef6, colorB: 0xcfd8e4, opacity: 0.35, sway: 0.25, box: [3, 10, 3], additive: false });
  const smokeCentre = new THREE.Vector3(CAMP.x - 3, cy + 3.6, CAMP.z + 1.5);
  zone.updatables.push((dt) => smoke.update(dt, smokeCentre));
  const house = await loadGLTF('./assets/environment/house_artic.glb');
  if (house) {
    const h = house.scene.clone(true);
    const bb = new THREE.Box3().setFromObject(h);
    const s = 7.5 / Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    h.scale.setScalar(s);
    h.position.set(CAMP.x - 11, cy - bb.min.y * s, CAMP.z - 4);
    h.rotation.y = 0.9;
    toonifyGroup(h);
    g.add(h);
    zone.addCollider(CAMP.x - 11, CAMP.z - 4, 3.4);
  }
  const snowman = await loadGLTF('./assets/environment/snowman_artic.glb');
  if (snowman) {
    const sm = snowman.scene.clone(true);
    const bb = new THREE.Box3().setFromObject(sm);
    const s = 1.9 / (bb.max.y - bb.min.y);
    sm.scale.setScalar(s);
    sm.position.set(CAMP.x + 4, cy - bb.min.y * s, CAMP.z - 6);
    sm.rotation.y = 2.4;
    toonifyGroup(sm);
    g.add(sm);
    zone.addCollider(CAMP.x + 4, CAMP.z - 6, 0.8);
  }

  // --- Drifting icebergs off the coast
  const bergMat = islandRockMaterial(null, { base: 0xe9f4fb, shadow: 0x8fb8e0, top: 0xffffff, topAmount: 1.0, streaks: 0.4 });
  const bergRng = createSeededRandom(1990);
  for (let i = 0; i < 14; i++) {
    const a = bergRng() * Math.PI * 2;
    const rr = 168 + bergRng() * 120;
    const geo = new THREE.CylinderGeometry(3 + bergRng() * 6, 4 + bergRng() * 7, 3 + bergRng() * 9, 5 + Math.floor(bergRng() * 3), 1);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (0.85 + bergRng() * 0.3), p.getY(v), p.getZ(v) * (0.85 + bergRng() * 0.3));
    geo.computeVertexNormals();
    const berg = new THREE.Mesh(geo, bergMat);
    berg.position.set(Math.cos(a) * rr, 0.6, Math.sin(a) * rr);
    berg.rotation.y = bergRng() * 6.28;
    berg.name = 'ArcticIceberg';
    g.add(berg);
    const ph = bergRng() * 6.28;
    zone.updatables.push(() => { berg.position.y = 0.6 + Math.sin(time.value * 0.6 + ph) * 0.15; });
  }

  // Big horns: colliders so the player cannot climb into them
  for (const p of PEAKS) zone.addCollider(p.x, p.z, p.R * 0.55);

  // --- Mejora del bioma: places (primitives), ice dressing, walkable frozen water
  new ArcticLandmarks(zone, { height: arcticHeight, time });
  const pathClear = (x, z) => pathDist(x, z) > 2.4;
  new ArcticIce(zone, {
    height: arcticHeight,
    time,
    iceSpots,
    newIceSpots: newIceSpots(allSpots),
    oreSpots,
    fishPonds: [{ x: LAKE.x, z: LAKE.z, r: LAKE.r, level: LAKE.level, count: 18 }, { x: POND.x, z: POND.z, r: POND.r, level: POND.level, count: 7 }],
    flagstones: arcticFlagstones(),
    shoreRings: [
      { x: LAKE.x, z: LAKE.z, r: LAKE.r + 0.7, skip: (a) => !pathClear(LAKE.x + Math.cos(a) * (LAKE.r + 0.7), LAKE.z + Math.sin(a) * (LAKE.r + 0.7)) || Math.cos(a) > Math.cos(0.62) },
      { x: POND.x, z: POND.z, r: POND.r + 0.3, skip: (a) => Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.35 }
    ],
    mist: arcticMist()
  });
  const riverLevelAt = (z) => arcticHeight(valleyX(z) + 4.5, z) - 0.35;
  const lakes = [
    { x: LAKE.x, z: LAKE.z, r: LAKE.r + 4, level: LAKE.level },
    { x: POND.x, z: POND.z, r: POND.r + 3, level: POND.level }
  ];
  const rivers = [
    { z0: -104, z1: -46, centreX: valleyX, level: riverLevelAt, half: 2.9 },
    { z0: -30, z1: 128, centreX: valleyX, level: riverLevelAt, half: 2.9 }
  ];
  // Frozen water is walkable: the player, NPCs and monsters stand on the ice surface
  zone.getHeight = (x, z) => iceWalkHeight(x, z, zone.terrain ? zone.terrain.getHeight(x, z) : arcticHeight(x, z), lakes, rivers);
}

export function createArcticIsland(om) {
  const def = {
    id: 'arctic',
    label: 'Isla del Ártico',
    seed: 2101,
    height: arcticHeight,
    rocks: [],
    rockStyle: { base: 0x8c97a8, shadow: 0x6f7fa6, top: 0xf4f8ff, topAmount: 1.0, streaks: 0.9 },
    build: buildArctic,
    profile: (zone) => arcticProfile(zone)
  };
  return new GrandIslandZone(om, def);
}

export const ARCTIC_SPAWN = { x: 5, z: 120, yaw: Math.PI };
