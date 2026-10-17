import * as THREE from 'three';
import { SimplexNoise, createSeededRandom } from '../../demo_scena/MathUtils.js';
import { fbm2D } from '../../demo_scena/grassShader.js';
import { GrandIslandZone } from '../GrandIslandZone.js';
import { smooth } from '../kit/IslandTerrainData.js';
import { GenesisLandmarks, GENESIS_SITES } from './GenesisLandmarks.js';
import { GenesisNature } from './GenesisNature.js';
import { ISLAND_MONSTER_LAYOUT, patrolAround } from '../IslandWorldLayout.js';

/**
 * Isla Genesis (rediseño del bioma "Mazmorra") — "Los Jardines Reales del Origen".
 * The royal gardens of the continent: a majestic, ancient and exclusive sanctuary reserved
 * for the elite of Axie trainers. Crossing its gate feels like entering a forbidden shrine.
 *
 *  - Ground: night-blue / indigo earth with diagonal violet and teal brush streaks; wide
 *    golden sand paths drawn as square rings and straight avenues (Axie Genesis map).
 *  - Puerta del Santuario (east, where the ferry lands) with an aurora veil; Kotaro guards it.
 *  - Jardín Real (centre): turquoise horned totem, campfire, six abstract monuments.
 *  - Bosque Ancestral (north): round teal and orange trees, bleached dead trees, hollow logs.
 *  - Columnas de Lavanda: clusters of layered lavender stone pillars (west, SW, SE, NE).
 *  - Cantera de cristal rosa (north-west): Tripp's camp.
 *  - Santuario del Origen (south terrace): ancient column ring, great arch, Throne of Origin,
 *    the Spirit of Atia in its centre (final battle).
 *  - Sky: mystic indigo / teal dusk with ethereal auroras and stars; air dense with magic
 *    (golden motes, violet wisps). Golden beaches and a turquoise sea with foam.
 * Gameplay anchors kept: ferry dock + arrival, Kotaro / Tripp / Atia, 4 patrol packs.
 * Internal ids stay 'dungeon' / zone_2_3 (only the visible name changes).
 */
const N1 = new SimplexNoise(5511);
const SANCT = GENESIS_SITES.sanctuary;
const QUARRY = GENESIS_SITES.quarry;
const GATE = GENESIS_SITES.gate;
const HALF = GENESIS_SITES.plaza.half;

/** Dense square loop (the path spline follows the square, corners only slightly rounded). */
function squareLoop(cx, cz, half, step = 4) {
  const pts = [];
  const corners = [[-half, -half], [half, -half], [half, half], [-half, half]];
  for (let c = 0; c < 4; c++) {
    const [ax, az] = corners[c], [bx, bz] = corners[(c + 1) % 4];
    const n = Math.round((2 * half) / step);
    for (let i = 0; i < n; i++) pts.push([cx + ax + (bx - ax) * (i / n), cz + az + (bz - az) * (i / n)]);
  }
  pts.push(pts[0]);
  return pts;
}

const PATHS = [
  // Royal square ring around the plaza
  { points: squareLoop(0, 0, HALF), width: 5.2 },
  // East avenue: ferry → Sanctuary Gate → plaza
  { points: [[136, 22], [112, 20], [84, 14], [58, 8], [HALF, 4]], width: 5.4 },
  // North avenue into the Ancestral Grove
  { points: [[0, -HALF], [0, -62], [-6, -92]], width: 4.6 },
  // West avenue to the lavender columns
  { points: [[-HALF, 0], [-60, -4], [-92, -6]], width: 4.6 },
  // South avenue up to the Sanctuary of Origin + its square ring
  { points: [[0, HALF], [0, 56], [0, 75]], width: 5.0 },
  { points: squareLoop(0, 92, 17, 3.4), width: 4.2 },
  // North-west branch to the pink crystal quarry
  { points: [[-HALF, -HALF], [-46, -46], [-52, -52]], width: 4.0 }
];

function segDist(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const abx = bx - ax, abz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz)));
    best = Math.min(best, Math.hypot(x - ax - abx * t, z - az - abz * t));
  }
  return best;
}
function pathDist(x, z) { return Math.min(...PATHS.map((p) => segDist(x, z, p.points))); }

function genesisHeight(x, z) {
  const r = Math.hypot(x, z);
  const n = N1.fbm(x * 0.011, z * 0.011, 3, 0.5, 2.0);
  let h = 4.6 + n * 1.5 + fbm2D(x * 0.05, z * 0.05) * 0.45;
  // Ancestral Grove: gentle rolling hills in the north
  h += 1.8 * smooth(-40, -80, z) * (0.5 + 0.5 * N1.noise2D(x * 0.025, z * 0.025));
  // Royal plaza: flat lawn
  const sq = Math.max(Math.abs(x), Math.abs(z));
  h = h + (4.8 - h) * smooth(HALF + 10, HALF + 2, sq);
  // Sanctuary of Origin: raised flat terrace reached by the south avenue ramp
  const ds = Math.hypot(x - SANCT.x, z - SANCT.z);
  h = h + (SANCT.floor - h) * smooth(SANCT.r + 12, SANCT.r - 2, ds);
  // Pink crystal quarry: shallow bowl with a rim
  const dq = Math.hypot(x - QUARRY.x, z - QUARRY.z);
  if (dq < QUARRY.r + 8) h += -1.4 * (1 - smooth(QUARRY.r * 0.4, QUARRY.r, dq)) + 0.6 * Math.exp(-Math.pow((dq - QUARRY.r) / 3, 2));
  // Golden beaches, then the sea
  h = h + (1.35 - h) * smooth(112, 126, r);
  h -= smooth(134, 150, r) * 3.85;
  if (r > 150) h = h * (1 - smooth(150, 166, r)) + -2.5 * smooth(150, 166, r);
  return h;
}

/** Patrol points of every monster pack on this island (kept clear of props). */
function patrolPoints() {
  const L = ISLAND_MONSTER_LAYOUT['2_3'];
  const out = [];
  for (const a of L.packs) out.push(...patrolAround(a));
  if (L.merged) out.push(...patrolAround(L.merged.anchor));
  return out;
}

const NPC_SPOTS = [GENESIS_SITES.npcs.kotaro, GENESIS_SITES.npcs.tripp, GENESIS_SITES.npcs.atia];

function freeSpot(x, z, clear = 4) {
  if (pathDist(x, z) < clear) return false;
  if (Math.max(Math.abs(x), Math.abs(z)) < HALF - 3) return false;                // plaza lawn
  if (Math.hypot(x - SANCT.x, z - SANCT.z) < SANCT.r + 4) return false;
  if (Math.hypot(x - GATE.x, z - GATE.z) < 18) return false;
  if (Math.hypot(x - 130, z - 22) < 10 || Math.hypot(x - 136, z - 14) < 8) return false;
  if (Math.hypot(x - QUARRY.x, z - QUARRY.z) < QUARRY.r + 4) return false;
  if (Math.hypot(x, z) > 118) return false;
  for (const p of NPC_SPOTS) if (Math.hypot(x - p.x, z - p.z) < 6) return false;
  return genesisHeight(x, z) > 2.0;
}

function genesisProfile() {
  const sun = new THREE.Vector3(-90, 70, 60).normalize();
  return {
    id: 'dungeon',
    // Cool moon-like key light, indigo fill: warm only at braziers and campfires
    light: { sunDir: sun, sunColor: 0xfff0dc, sunIntensity: 1.85, skyFill: 0x9a98d0, groundFill: 0x3a3a5e, hemiIntensity: 1.2, ambientColor: 0xcfc8ec, ambientIntensity: 0.42 },
    fog: { color: 0x34386e, density: 0.0026 },
    horizonHaze: 0.4,
    exposure: 1.04,
    bloom: { strength: 0.66, radius: 0.62, threshold: 0.8 },
    postFX: { warm: [1.04, 0.98, 1.0], cool: [0.88, 0.94, 1.14], saturation: 1.16, vignette: 0.28, godRays: 0.45 },
    sky: {
      zenith: 0x10163a, mid: 0x2c3480, horizon: 0x5fd0c8, horizonAway: 0x3a2f78, sunDisk: 0xf6f0ff, sunHalo: 0xb8a0ff,
      cloudLit: 0xc8b8ff, cloudShadow: 0x262550, cloudRim: 0x9ff0e0, haze: 0x4a4c90, cloudCoverage: 0.36,
      stars: 1.0, starColor: 0xfff6e0, aurora: 0.85, auroraA: 0x6dffc8, auroraB: 0xd18cff
    },
    mountains: { sunColor: 0xfff0dc, haze: 0x4a4c90, hazeAway: 0x3a2f78, rockNear: 0x4a4a8a, rockFar: 0x7a70c0, snow: 0xd8ccff, grass: 0x2a3060 },
    sea: { sunColor: 0xfff0dc, shallow: 0x3fe0d8, mid: 0x2a90d8, deep: 0x1c3aa0, foam: 0xf0fbff, skyZenith: 0x10163a, skyHorizon: 0x5fd0c8 },
    paths: PATHS,
    mask: ({ x, z, y, ny }) => {
      let g = smooth(0.74, 0.88, ny) * smooth(2.4, 3.4, y);
      g *= 0.25 + 0.75 * smooth(0.5, 0.7, fbm2D(x * 0.035 + 4.0, z * 0.035 - 9.0));   // sparse dark tufts
      g *= 1 - smooth(112, 120, Math.hypot(x, z));                                   // golden beaches
      const fl = g * 0.45 * smooth(0.6, 0.76, fbm2D(x * 0.03 - 2.0, z * 0.03 + 5.0));
      return { grass: g, flowers: fl, wet: 0 };
    },
    terrain: {
      ground: { deep: 0x161a36, mid: 0x1d2246, light: 0x283060, dry: 0x332b62, dryAmount: 0.5 },
      soil: 0x232a52,
      heightRange: [2, 12],
      cliffSlope: [0.6, 0.76],
      pathFrameSignedFar: true,   // no stray lines along the outer edge of the path bands
      path: { tint: [2.35, 1.62, 0.42], dust: [1.25, 1.12, 0.85], desat: 1.0, ruts: 0.0, islands: 0.0 },
      uniforms: {
        uNightA: { value: new THREE.Color(0x1b2142) },
        uNightB: { value: new THREE.Color(0x242a50) },
        uStreakV: { value: new THREE.Color(0x3d3672) },
        uStreakT: { value: new THREE.Color(0x23506a) },
        uSand: { value: new THREE.Color(0xf0c75a) },
        uSandDark: { value: new THREE.Color(0xd8a640) },
        uLavA: { value: new THREE.Color(0x6a6098) },
        uLavB: { value: new THREE.Color(0x9d92d8) }
      },
      surfaceGLSL: /* glsl */ `
        vec3 islandSurface(vec3 wp, vec3 nW, vec4 gm, vec3 meadow, float brush) {
          // Night-blue earth with painterly diagonal brush streaks (violet + teal)
          float n = gFbm3(wp.xz * 0.03);
          vec3 col = mix(uNightA, uNightB, smoothstep(0.3, 0.75, n)) * (0.92 + 0.12 * brush);
          float d = dot(wp.xz, vec2(0.7071, 0.7071));
          float jit = gNoise(wp.xz * 0.15) * 2.0;
          float s1 = smoothstep(0.84, 0.97, sin(d * 1.7 + jit * 3.0) * 0.5 + 0.5) * smoothstep(0.35, 0.7, gNoise(wp.xz * 0.08 + 3.0));
          float s2 = smoothstep(0.9, 0.98, sin(d * 2.9 + jit * 2.0 + 1.3) * 0.5 + 0.5) * smoothstep(0.45, 0.8, gNoise(wp.xz * 0.06 - 7.0));
          col = mix(col, uStreakV, s1 * 0.6);
          col = mix(col, uStreakT, s2 * 0.5);
          col = mix(col, meadow, smoothstep(0.2, 0.7, gm.r) * 0.45);
          // Golden sand beaches with dark speckles
          float beach = smoothstep(114.0, 123.0, length(wp.xz)) * (1.0 - smoothstep(2.2, 3.2, wp.y));
          vec3 sand = mix(uSand, uSandDark, smoothstep(0.4, 0.8, gNoise(wp.xz * 0.4)) * 0.4);
          sand *= 1.0 - step(0.982, gHash12(floor(wp.xz * 2.2))) * 0.45;
          col = mix(col, sand * (0.94 + 0.1 * brush), beach);
          return col;
        }`,
      cliffGLSL: /* glsl */ `
        vec3 islandCliff(vec3 wp, vec3 nW, float brush) {
          // Lavender layered stone (horizontal strata)
          float band = fract(wp.y * 0.9 + gNoise(wp.xz * 0.2) * 0.4);
          vec3 c = mix(uLavA, uLavB, smoothstep(0.2, 0.7, band));
          c *= 0.85 + 0.2 * gNoise(vec2((wp.x + wp.z) * 0.5, wp.y * 0.2));
          return mix(c, uNightB, smoothstep(0.4, 0.7, nW.y) * 0.5);
        }`
    },
    grass: {
      ground: { deep: 0x161a36, mid: 0x1d2246, light: 0x283060, dry: 0x332b62, dryAmount: 0.5 },
      flowers: [0xffd27a, 0x8ff6ff, 0xd8b0ff, 0xff9ad8],
      flowerGlow: 0.85,
      sunTint: 0xb8c0ff, backlight: 0xc9a0ff, shadowTint: [0.86, 0.88, 1.2], heightScale: 0.75, windStrength: 0.2
    },
    treeCfg: {
      seed: 2323,
      snow: 0,
      foliageGlow: 0.06,
      palettes: {
        teal: [0x3fc8c0, 0x2fb3b8, 0x55d6c8, 0x45bcc8],
        orange: [0xffa63a, 0xff8f22, 0xffbc5a, 0xffae40],
        bleached: [0xffffff]
      },
      trunks: {
        teal: { bark: 'normal', tone: [0.9, 0.78, 0.72] },
        orange: { bark: 'normal', tone: [0.95, 0.8, 0.7] },
        bleached: { bark: 'pine', tone: [2.1, 1.95, 1.8] }
      }
    },
    trees: () => genesisTrees(),
    water: [],
    particles: [
      // Air dense with magic: golden motes + violet wisps rising
      { mode: 'sparkle', count: 260, velocity: [0.05, 0.12, 0.04], size: 2.6, colorA: 0xffe6a0, colorB: 0xfff6d8, intensity: 1.5, opacity: 0.9, sway: 0.6, box: [56, 12, 56] },
      { mode: 'spores', count: 220, velocity: [0.04, 0.35, 0.03], size: 3.6, colorA: 0xc9a0ff, colorB: 0x8ff6ff, intensity: 1.5, opacity: 0.75, sway: 1.0, box: [56, 16, 56] }
    ]
  };
}

function genesisTrees() {
  const rng = createSeededRandom(8888);
  const out = [];
  const avoid = patrolPoints();
  const add = (x, z, kind, family, s) => {
    if (!freeSpot(x, z, 4.5)) return;
    if (avoid.some((p) => Math.hypot(x - p.x, z - p.z) < 5)) return;
    if (out.some((t) => Math.hypot(x - t.pos.x, z - t.pos.z) < 4.2)) return;
    out.push({ kind, family, pos: new THREE.Vector3(x, genesisHeight(x, z) - 0.2, z), s, sy: s * (0.9 + rng() * 0.2) });
  };
  // Ancestral Grove (north): dense groves of round teal and orange trees + bleached dead trees
  for (let gI = 0; gI < 14; gI++) {
    const cx = -80 + rng() * 160, cz = -45 - rng() * 65;
    const fam = rng() < 0.5 ? 'teal' : 'orange';
    const n = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() - 0.5) * 16, z = cz + (rng() - 0.5) * 16;
      if (rng() < 0.22) add(x, z, 'dead', 'bleached', 0.8 + rng() * 0.4);
      else add(x, z, 'broad', rng() < 0.75 ? fam : (fam === 'teal' ? 'orange' : 'teal'), 0.85 + rng() * 0.4);
    }
  }
  // Accents around the royal ring (corners) and scattered pairs across the gardens
  for (const [x, z] of [[-40, -40], [40, -40], [-40, 40], [40, 40], [-42, 18], [42, -18], [20, 44], [-20, -44]]) {
    add(x + (rng() - 0.5) * 3, z + (rng() - 0.5) * 3, 'broad', rng() < 0.5 ? 'teal' : 'orange', 0.9 + rng() * 0.3);
    add(x + (rng() - 0.5) * 8, z + (rng() - 0.5) * 8, rng() < 0.5 ? 'dead' : 'broad', rng() < 0.5 ? 'bleached' : 'orange', 0.8 + rng() * 0.3);
  }
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2, rr = 40 + rng() * 70;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (rng() < 0.35) add(x, z, 'dead', 'bleached', 0.75 + rng() * 0.4);
    else add(x, z, 'broad', rng() < 0.5 ? 'teal' : 'orange', 0.8 + rng() * 0.4);
  }
  return out;
}

async function buildGenesis(zone) {
  const time = { value: 0 };
  zone.updatables.push((dt) => { time.value += dt; });
  new GenesisLandmarks(zone, { height: genesisHeight, time });
  const avoid = [
    ...patrolPoints().map((p) => [p.x, p.z, 4]),
    ...NPC_SPOTS.map((p) => [p.x, p.z, 4]),
    [130, 22, 8], [136, 14, 6]
  ];
  new GenesisNature(zone, {
    height: genesisHeight, time, freeSpot, seaLevel: 0.45, avoid,
    // Lavender column fields [x, z, count, spread]
    clusters: [[-82, -10, 7, 15], [-64, 66, 6, 14], [68, 68, 5, 12], [74, -62, 5, 12], [88, 44, 2, 6], [86, -6, 2, 6], [-30, -88, 3, 10], [30, 96, 2, 8]],
    // Ancestral Grove props [x, z, spread, count]
    groveSpots: [[0, -78, 40, 34], [-60, -90, 18, 8], [60, -88, 18, 8], [-40, 36, 14, 6], [40, -36, 14, 6], [44, 40, 14, 6], [-44, -24, 12, 5]]
  });
  zone.genesisReady = true;
}

export function createDungeonIsland(om) {
  return new GrandIslandZone(om, {
    id: 'dungeon',
    label: 'Isla Genesis',
    seed: 2301,
    height: genesisHeight,
    rocks: [],
    rockStyle: { base: 0x9d92d8, shadow: 0x5f5694, top: 0xd2c4fa, topAmount: 0.6, streaks: 0.5 },
    build: buildGenesis,
    profile: () => genesisProfile()
  });
}

export const DUNGEON_SPAWN = { x: 130, z: 22, yaw: -Math.PI / 2 };
