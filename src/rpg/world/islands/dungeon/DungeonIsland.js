import * as THREE from 'three';
import { SimplexNoise, createSeededRandom } from '../../demo_scena/MathUtils.js';
import { fbm2D } from '../../demo_scena/grassShader.js';
import { GrandIslandZone, loadGLTF } from '../GrandIslandZone.js';
import { smooth } from '../kit/IslandTerrainData.js';
import { crystalMaterial, crystalPrismGeometry, islandRockMaterial } from '../kit/IslandMaterials.js';
import { toonifyGroup } from '../kit/IslandArtLayer.js';
import { IslandWaterBody } from '../kit/IslandWater.js';

/**
 * Isla de la Mazmorra (Hito 23) — "La Caldera de la Luna Rota": a volcanic MOON.
 * Craters are the main landform of the whole map, in three sizes and two kinds:
 *   - large (34–42 m): Lunar Crypt crater (NPCs on its floor) and the Fortress crater with
 *     a resurgent central peak crowned by the Fortress of Shadows
 *   - medium (9–20 m) around the walkable areas, trails skirt or cross their rims
 *   - small (2–6 m) impact pocks everywhere, like marks on the ground
 *   - lunar craters: silver regolith floor, cold lunar crystals, some hold still water
 *     reflecting the moon; volcanic craters: glowing lava with cooling crust, steam & embers
 * The stratovolcano (scenery, north, facing the Forest) feeds lava rivers; Magma Caldera
 * platform with stone bridges on its flank. Sky: ash clouds, ember sunset, a huge cratered moon.
 */
const N1 = new SimplexNoise(3313);
const VOLCANO = { x: 0, z: -112, R: 62, H: 50, crater: 11 };
const SECONDARY = { x: -94, z: -58, R: 28, H: 22, crater: 5 };
const DOME = { x: 94, z: -50, R: 22, H: 13 };
const CALDERA = { x: -22, z: -64, r: 9, level: 15.5 };
const CRYPT = { x: 0, z: 8, R: 40, D: 2.2, rim: 3.0, type: 'lunar', big: true };
const FORTRESS = { x: 10, z: 92, R: 34, D: 3.2, rim: 2.8, type: 'lunar', big: true, peak: { h: 12, r: 12 } };

const PATHS = [
  { points: [[136, 22], [104, 24], [74, 18], [46, 10], [24, 6]], width: 4.2 },
  { points: [[0, -12], [-6, -30], [-13, -46], [-19, -57]], width: 3.6 },
  { points: [[16, 30], [18, 50], [14, 68], [11, 80]], width: 4.0 },
  { points: [[46, 10], [64, -12], [80, -32]], width: 3.0 }
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

// Lava rivers: from the volcano rim down its flank (one passes under the Magma Caldera)
const LAVA_RIVERS = [
  [[-4, -86], [-10, -76], [-15, -66], [-17, -56], [-26, -44], [-38, -38]],
  [[8, -84], [16, -72], [26, -62], [40, -54], [56, -48]]
];

/** Deterministic crater field. */
const CRATERS = (() => {
  const rng = createSeededRandom(19690720);
  const list = [CRYPT, FORTRESS];
  const ok = (x, z, R) => {
    const r = Math.hypot(x, z);
    if (r + R > 128) return false;
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < VOLCANO.R + R * 0.5) return false;
    if (Math.hypot(x - SECONDARY.x, z - SECONDARY.z) < SECONDARY.R + R) return false;
    if (Math.hypot(x - DOME.x, z - DOME.z) < DOME.R + R) return false;
    if (Math.hypot(x - CALDERA.x, z - CALDERA.z) < CALDERA.r + R + 4) return false;
    for (const c of list) if (Math.hypot(x - c.x, z - c.z) < (c.R + R) * (c.big ? 0.95 : 0.75)) return false;
    return true;
  };
  let tries = 0;
  // Medium craters
  while (list.filter((c) => !c.big && c.R > 8).length < 14 && tries++ < 3000) {
    const a = rng() * Math.PI * 2, rr = 20 + rng() * 105, R = 9 + rng() * 11;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!ok(x, z, R) || pathDist(x, z) < R * 0.55) continue;
    const roll = rng();
    list.push({ x, z, R, D: R * (0.16 + rng() * 0.06), rim: R * 0.13, type: roll < 0.4 ? 'volcanic' : (roll < 0.58 ? 'pool' : 'lunar') });
  }
  // Small impact pocks (trails may cross them: they are shallow)
  tries = 0;
  let small = 0;
  while (small < 80 && tries++ < 4000) {
    const a = rng() * Math.PI * 2, rr = 10 + rng() * 120, R = 2 + rng() * 4;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (Math.hypot(x, z) + R > 132) continue;
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < VOLCANO.R * 0.8) continue;
    let inside = false;
    for (const c of list) if (!c.small && Math.hypot(x - c.x, z - c.z) < c.R + R) { inside = c.big ? Math.hypot(x - c.x, z - c.z) > c.R * 0.75 : true; if (inside) break; }
    if (inside) continue;
    list.push({ x, z, R, D: R * 0.3, rim: R * 0.17, type: 'lunar', small: true });
    small++;
  }
  return list;
})();

function craterDelta(c, x, z) {
  const d = Math.hypot(x - c.x, z - c.z);
  const t = d / c.R;
  if (t > 2.2) return 0;
  let delta;
  if (t < 1) {
    delta = -c.D * (1 - t * t) + c.rim * smooth(0.7, 1.0, t);
    if (c.peak) delta += c.peak.h * Math.pow(Math.max(0, 1 - d / c.peak.r), 1.4);
  } else {
    delta = c.rim * Math.exp(-(t - 1) * 3.5);
  }
  return delta;
}

function dungeonHeight(x, z) {
  const r = Math.hypot(x, z);
  const n = N1.fbm(x * 0.012, z * 0.012, 3, 0.5, 2.0);
  let h = 5.0 + n * 2.6 + fbm2D(x * 0.06, z * 0.06) * 0.8;
  // Stratovolcano (scenery) with its summit crater
  const dv = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
  if (dv < VOLCANO.R) {
    const t = 1 - dv / VOLCANO.R;
    let cone = VOLCANO.H * Math.pow(t, 1.55) * (0.92 + 0.12 * N1.noise2D(x * 0.08, z * 0.08));
    if (dv < VOLCANO.crater) cone -= 9 * (1 - Math.pow(dv / VOLCANO.crater, 2));
    h += cone;
  }
  const ds = Math.hypot(x - SECONDARY.x, z - SECONDARY.z);
  if (ds < SECONDARY.R) {
    let cone = SECONDARY.H * Math.pow(1 - ds / SECONDARY.R, 1.5);
    if (ds < SECONDARY.crater) cone -= 4 * (1 - Math.pow(ds / SECONDARY.crater, 2));
    h += cone;
  }
  const dd = Math.hypot(x - DOME.x, z - DOME.z);
  if (dd < DOME.R) h += DOME.H * Math.sqrt(Math.max(0, 1 - Math.pow(dd / DOME.R, 2)));
  // Magma Caldera platform on the volcano flank
  const dc = Math.hypot(x - CALDERA.x, z - CALDERA.z);
  if (dc < CALDERA.r + 8) h = h + (CALDERA.level - h) * smooth(CALDERA.r + 8, CALDERA.r, dc);
  // Crater field
  for (const c of CRATERS) {
    if (Math.abs(x - c.x) > c.R * 2.2 || Math.abs(z - c.z) > c.R * 2.2) continue;
    h += craterDelta(c, x, z);
  }
  // Lava river channels
  for (const pts of LAVA_RIVERS) {
    const d = segDist(x, z, pts);
    if (d < 5) h -= 1.1 * (1 - smooth(1.6, 4.6, d));
  }
  if (r > 136) {
    const c = smooth(136, 160, r);
    h = h * (1 - c) + -2.5 * c;
  }
  return h;
}

function heatAt(x, z) {
  let heat = 0;
  for (const c of CRATERS) if (c.type === 'volcanic') heat = Math.max(heat, smooth(c.R * 1.8, c.R * 0.9, Math.hypot(x - c.x, z - c.z)));
  for (const pts of LAVA_RIVERS) heat = Math.max(heat, smooth(10, 3, segDist(x, z, pts)));
  heat = Math.max(heat, smooth(VOLCANO.R * 0.9, VOLCANO.R * 0.35, Math.hypot(x - VOLCANO.x, z - VOLCANO.z)) * 0.8);
  heat = Math.max(heat, smooth(DOME.R * 1.4, DOME.R * 0.6, Math.hypot(x - DOME.x, z - DOME.z)));
  return heat;
}

function freeSpot(x, z, clear = 4) {
  if (pathDist(x, z) < clear) return false;
  if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < VOLCANO.R * 0.75) return false;
  if (heatAt(x, z) > 0.4) return false;
  if (Math.hypot(x - CRYPT.x, z - CRYPT.z) < 22) return false;          // NPC area on the crypt floor
  if (Math.hypot(x - FORTRESS.x, z - FORTRESS.z) < 14) return false;
  if (Math.hypot(x - 15, z - 3) < 7) return false;                      // wandering chimera route
  return dungeonHeight(x, z) > 2.2;
}

function dungeonProfile() {
  const sun = new THREE.Vector3(-120, 58, -40).normalize();
  const moon = new THREE.Vector3(0.28, 0.46, 0.86).normalize();
  return {
    id: 'dungeon',
    light: { sunDir: sun, sunColor: 0xffa070, sunIntensity: 1.95, skyFill: 0x8a7ab0, groundFill: 0x7a3a2a, hemiIntensity: 1.35, ambientColor: 0xd8b8c8, ambientIntensity: 0.46 },
    fog: { color: 0x7d5e6e, density: 0.003 },
    horizonHaze: 0.45,
    exposure: 1.06,
    bloom: { strength: 0.72, radius: 0.6, threshold: 0.78 },
    postFX: { warm: [1.1, 0.98, 0.9], cool: [0.9, 0.92, 1.1], saturation: 1.1, vignette: 0.3, godRays: 0.55 },
    sky: {
      zenith: 0x2a1f3f, mid: 0x5a3a6a, horizon: 0xff7a4a, horizonAway: 0x6a4a7a, sunDisk: 0xffe0b0, sunHalo: 0xff8a4a,
      cloudLit: 0xffb08a, cloudShadow: 0x4a3550, cloudRim: 0xffa060, haze: 0x8a6a7a, cloudCoverage: 0.68,
      stars: 0.55, starColor: 0xffeedd, moonDir: moon, moonSize: 0.16, moonColor: 0xf2ece4, moonGlow: 0xff9a6a
    },
    mountains: { sunColor: 0xffa070, haze: 0x8a6a7a, hazeAway: 0x6a4a7a, rockNear: 0x3a3040, rockFar: 0x6a5a6a, snow: 0xb8a8b0, grass: 0x5a3a3a },
    sea: { sunColor: 0xffa070, shallow: 0x3a6a78, mid: 0x253f5a, deep: 0x1a2238, foam: 0xd8d0d8, skyZenith: 0x2a1f3f, skyHorizon: 0xff7a4a },
    paths: PATHS,
    mask: ({ x, z, y, ny }) => {
      const heat = heatAt(x, z);
      let g = smooth(0.74, 0.88, ny) * smooth(2.6, 3.8, y) * (1 - smooth(0.05, 0.3, heat));
      g *= smooth(0.62, 0.74, fbm2D(x * 0.04 + 11.0, z * 0.04 - 2.0));          // sparse ashy tufts
      const fl = g * 0.35 * smooth(0.6, 0.75, fbm2D(x * 0.03 - 4.0, z * 0.03));
      return { grass: g, flowers: fl, wet: heat };
    },
    terrain: {
      ground: { deep: 0x3a2a34, mid: 0x5a3e48, light: 0x7a5a62, dry: 0x6e625e, dryAmount: 0.45 },
      soil: 0x55505c,
      heightRange: [2, 18],
      cliffSlope: [0.6, 0.76],
      path: { tint: [0.6, 0.57, 0.62], dust: [1.25, 1.2, 1.2], desat: 0.88, ruts: 0.3 },
      uniforms: {
        uRegolith: { value: new THREE.Color(0xa59fa6) },
        uRegolithDark: { value: new THREE.Color(0x67616c) },
        uBasalt: { value: new THREE.Color(0x3c3540) },
        uMagma: { value: new THREE.Color(0xff6a1a) },
        uBlackSand: { value: new THREE.Color(0x4a4450) }
      },
      surfaceGLSL: /* glsl */ `
        vec3 islandSurface(vec3 wp, vec3 nW, vec4 gm, vec3 meadow, float brush) {
          // Silver lunar regolith with darker maria-like patches and tiny impact speckles
          float maria = smoothstep(0.45, 0.7, gFbm3(wp.xz * 0.02 + 5.0));
          vec3 reg = mix(uRegolith, uRegolithDark, maria * 0.8) * (0.9 + 0.14 * brush);
          float speck = step(0.93, gHash12(floor(wp.xz * 3.0))) * 0.12;
          reg *= 1.0 - speck;
          vec3 col = mix(reg, meadow, smoothstep(0.15, 0.6, gm.r));
          // Volcanic heat: dark basalt crust with glowing cracks
          float heat = gm.a;
          float cracks = 1.0 - smoothstep(0.0, 0.045, abs(gNoise(wp.xz * 0.35) - 0.5));
          float pulse = 0.75 + 0.25 * sin(uTime * 1.6 + wp.x * 0.2 + wp.z * 0.15);
          col = mix(col, uBasalt * (0.85 + 0.25 * brush), smoothstep(0.05, 0.6, heat));
          col += uMagma * cracks * smoothstep(0.35, 0.95, heat) * 1.6 * pulse;
          // Black sand beaches
          col = mix(col, uBlackSand * (0.9 + 0.15 * brush), (1.0 - smoothstep(2.2, 3.4, wp.y)) * smoothstep(118.0, 134.0, length(wp.xz)));
          return col;
        }`,
      cliffGLSL: /* glsl */ `
        vec3 islandCliff(vec3 wp, vec3 nW, float brush) {
          // Columnar basalt: vertical facets + ashy ledges
          float cols = abs(fract(atan(nW.z, nW.x + 1e-4) * 3.0 + gNoise(wp.xz * 0.2) * 0.5) - 0.5);
          vec3 c = mix(uBasalt, uRegolithDark * 0.7, smoothstep(0.1, 0.45, cols));
          c *= 0.85 + 0.25 * gNoise(vec2((wp.x + wp.z) * 0.6, wp.y * 0.1));
          c = mix(c, uRegolith * 0.8, smoothstep(0.35, 0.6, nW.y) * 0.6);
          return c;
        }`
    },
    grass: {
      ground: { deep: 0x3a2a34, mid: 0x5a3e48, light: 0x7a5a62, dry: 0x6e625e, dryAmount: 0.45 },
      flowers: [0x9fe8ff, 0xffffff, 0xff9a6a, 0xc9b8ff],
      flowerGlow: 0.5,
      sunTint: 0xc8a090, backlight: 0xff9a5a, shadowTint: [0.9, 0.86, 1.1], heightScale: 0.7, windStrength: 0.2
    },
    treeCfg: {
      seed: 3131,
      palettes: { charred: [0xffffff] },
      trunks: { charred: { bark: 'pine', tone: [0.38, 0.32, 0.34] } }
    },
    trees: () => dungeonTrees(),
    water: dungeonWater(),
    particles: [
      { mode: 'embers', count: 320, velocity: [0.15, 0.7, 0.05], size: 3.0, colorA: 0xff8a2a, colorB: 0xffd06a, intensity: 2.2, opacity: 0.9, sway: 0.6, box: [50, 16, 50] },
      { mode: 'sand', count: 380, velocity: [0.3, -0.45, 0.15], size: 3.6, colorA: 0x8a8088, colorB: 0x5a5058, opacity: 0.55, sway: 0.8, box: [50, 18, 50], additive: false }
    ]
  };
}

function dungeonWater() {
  const out = [];
  CRATERS.forEach((c, i) => {
    if (c.small || c.big) return;
    const floor = dungeonHeight(c.x, c.z);
    if (c.type === 'volcanic') {
      out.push({ shape: 'disc', center: [c.x, c.z], radius: c.R * 0.8, level: floor + c.D * 0.45, mode: 2, flowSpeed: 0.2, name: `DungeonLavaCrater_${i}`,
        colors: { shallow: 0xff7a1a, deep: 0xffc040, crust: 0x2a1416, glow: 0xffd070 } });
    } else if (c.type === 'pool') {
      out.push({ shape: 'disc', center: [c.x, c.z], radius: c.R * 0.8, level: floor + c.D * 0.5, mode: 0, name: `DungeonMoonPool_${i}`,
        colors: { shallow: 0x6a8fb0, deep: 0x1a2a48, foam: 0xd8e4f0, glow: 0x6a8aff }, glow: 0.15, opacity: 0.92, depthRange: 1.2, foamAmount: 0.25 });
    }
  });
  // Lava rivers in their channels + the volcano's summit lava lake
  LAVA_RIVERS.forEach((pts, i) => {
    out.push({ shape: 'ribbon', points: pts, width: 4.6, mode: 2, flowSpeed: 1.2, name: `DungeonLavaRiver_${i}`,
      level: (t) => { const k = Math.min(pts.length - 1.001, t * (pts.length - 1)); const a = pts[Math.floor(k)], b = pts[Math.floor(k) + 1]; const f = k - Math.floor(k);
        const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f; return dungeonHeight(x, z) + 0.45; },
      colors: { shallow: 0xff7a1a, deep: 0xffc040, crust: 0x2a1416, glow: 0xffd070 } });
  });
  out.push({ shape: 'disc', center: [VOLCANO.x, VOLCANO.z], radius: VOLCANO.crater * 0.95, level: dungeonHeight(VOLCANO.x, VOLCANO.z) + 3.5, mode: 2, flowSpeed: 0.3,
    name: 'DungeonSummitLava', colors: { shallow: 0xff7a1a, deep: 0xffd060, crust: 0x2a1416, glow: 0xffd070 } });
  return out;
}

function dungeonTrees() {
  const rng = createSeededRandom(6666);
  const out = [];
  for (let i = 0; i < 90 && out.length < 42; i++) {
    const a = rng() * Math.PI * 2, rr = 20 + rng() * 110;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!freeSpot(x, z, 4)) continue;
    const s = 0.85 + rng() * 0.6;
    out.push({ kind: 'dead', family: 'charred', pos: new THREE.Vector3(x, dungeonHeight(x, z) - 0.2, z), s, sy: s });
  }
  return out;
}

async function buildDungeon(zone) {
  const g = zone.group;
  const time = { value: 0 };
  zone.updatables.push((dt) => { time.value += dt; });
  const rng = createSeededRandom(4242);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();

  // 1. Lunar crystals: cold light in the lunar craters (contrast with the magma)
  const lunarMat = crystalMaterial({ color: 0xd8e8ff, glow: 0x8fb8ff, glowIntensity: 0.7, rim: 0xffffff, opacity: 0.85, timeUniform: time, name: 'DungeonLunarCrystal' });
  const prism = crystalPrismGeometry(1, 3.0);
  prism.scale(1, 1 / 4.7, 1);
  const shards = [];
  CRATERS.forEach((c) => {
    if (c.type !== 'lunar' || c.small) return;
    const n = c.big ? 6 : 3;
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2, d = c.R * (c.big ? 0.82 : 0.55) * (0.8 + rng() * 0.25);
      const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (pathDist(x, z) < 3 || (c === CRYPT && Math.hypot(x, z + 2) < 16)) continue;
      const cl = 2 + Math.floor(rng() * 4);
      for (let j = 0; j < cl; j++) {
        const aa = rng() * 6.28, dd = j ? 0.4 + rng() * 0.9 : 0;
        shards.push({ x: x + Math.cos(aa) * dd, z: z + Math.sin(aa) * dd, r: j ? 0.2 + rng() * 0.2 : 0.4 + rng() * 0.25, h: j ? 0.8 + rng() * 1.4 : 2 + rng() * 2.4, ex: Math.cos(aa) * 0.4 * (j ? 1 : 0.3), ez: Math.sin(aa) * 0.4 * (j ? 1 : 0.3) });
      }
    }
  });
  const shardMesh = new THREE.InstancedMesh(prism, lunarMat, shards.length);
  shards.forEach((s, i) => {
    q.setFromEuler(new THREE.Euler(s.ez, rng() * 6.28, -s.ex));
    m4.compose(new THREE.Vector3(s.x, dungeonHeight(s.x, s.z) - 0.15, s.z), q, new THREE.Vector3(s.r, s.h, s.r));
    shardMesh.setMatrixAt(i, m4);
  });
  shardMesh.instanceMatrix.needsUpdate = true;
  shardMesh.computeBoundingSphere();
  shardMesh.name = 'DungeonLunarCrystals';
  g.add(shardMesh);

  // 2. Basalt boulders (dark, ash-topped) + volcanic bombs
  zone.def.rocks = [1, 2, 3, 4].map((nn) => ({
    url: `./assets/rocks/StylisedRockCollection${nn}.glb`, count: 14, seed: 90 + nn,
    place: (r) => { for (let t = 0; t < 12; t++) { const a = r() * 6.28, rr = 15 + r() * 118; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (freeSpot(x, z, 4)) return { x, z, s: 1.2 + r() * 3.4, tilt: 0.3 }; } return null; }
  }));

  // 3. Magma Caldera platform: stone bridges over the lava river + ritual brazier
  const bridgeMat = islandRockMaterial(null, { base: 0x5a525e, shadow: 0x2e2a33, top: 0x8a8490, topAmount: 0.6, veins: 0.6, veinColor: 0xff6a1a, timeUniform: time });
  const river = LAVA_RIVERS[0];
  [[-15, -66], [-17, -56]].forEach(([bx, bz], i) => {
    const y = Math.max(dungeonHeight(bx - 4, bz), dungeonHeight(bx + 4, bz)) + 0.3;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(9, 0.7, 3.2), bridgeMat);
    bridge.position.set(bx, y, bz);
    bridge.rotation.y = i ? 0.3 : -0.15;
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    bridge.name = 'DungeonStoneBridge';
    g.add(bridge);
  });
  void river;
  const cy = dungeonHeight(CALDERA.x, CALDERA.z);
  const brazier = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 1.4, 8), bridgeMat);
  brazier.position.set(CALDERA.x - 3, cy + 0.7, CALDERA.z);
  g.add(brazier);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 7), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
  flame.position.set(CALDERA.x - 3, cy + 2.2, CALDERA.z);
  g.add(flame);
  const calLight = new THREE.PointLight(0xff7a2a, 9, 22, 2);
  calLight.position.set(CALDERA.x - 3, cy + 3, CALDERA.z);
  g.add(calLight);
  zone.addCollider(CALDERA.x - 3, CALDERA.z, 1.4);
  zone.updatables.push(() => { const f = 0.85 + Math.sin(time.value * 8.0) * 0.1; flame.scale.set(1, f, 1); calLight.intensity = 9 * f; });

  // 4. Lunar Crypt: ruined archway + columns + gravestones at the catacomb entrance
  const cryptZ = CRYPT.z - 26;
  const cryY = dungeonHeight(CRYPT.x, cryptZ);
  const place = async (url, x, z, size, rot, collider) => {
    const gl = await loadGLTF(url);
    if (!gl) return null;
    const o = gl.scene.clone(true);
    const bb = new THREE.Box3().setFromObject(o);
    const s = size / Math.max(bb.max.y - bb.min.y, 0.01);
    o.scale.setScalar(s);
    // Centre the model on (x, z) whatever its authored pivot
    const cx = (bb.min.x + bb.max.x) * 0.5 * s, cz = (bb.min.z + bb.max.z) * 0.5 * s;
    const pivot = new THREE.Group();
    o.position.set(-cx, -bb.min.y * s, -cz);
    pivot.add(o);
    pivot.position.set(x, dungeonHeight(x, z) - 0.1, z);
    pivot.rotation.y = rot;
    g.add(pivot);
    toonifyGroup(o, { brighten: 0.9 });
    if (collider) zone.addCollider(x, z, collider);
    return o;
  };
  await place('./assets/environment/ancient_archway.glb', CRYPT.x, cryptZ, 7.5, 0, 0);
  await place('./assets/environment/column.glb', CRYPT.x - 7, cryptZ + 3, 5.5, 0.3, 0.9);
  await place('./assets/environment/column2.glb', CRYPT.x + 7, cryptZ + 3, 4.0, 1.2, 0.9);
  for (let i = 0; i < 5; i++) await place('./assets/environment/lapida.glb', CRYPT.x - 12 + i * 6 + (rng() - 0.5) * 2, cryptZ + 9 + rng() * 3, 1.5, (rng() - 0.5) * 0.6, 0.5);
  await place('./assets/environment/alt_bones.glb', CRYPT.x + 13, cryptZ + 6, 1.6, 2.0, 1.0);
  // Glowing crypt doorway
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.8), new THREE.MeshBasicMaterial({ color: 0x9a7aff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  portal.position.set(CRYPT.x, cryY + 2.4, cryptZ - 0.3);
  portal.name = 'DungeonCryptPortal';
  g.add(portal);
  const cryptLight = new THREE.PointLight(0x9a7aff, 7, 18, 2);
  cryptLight.position.set(CRYPT.x, cryY + 3, cryptZ + 1.5);
  g.add(cryptLight);

  // 5. Fortress of Shadows on the central peak of the southern crater
  const fx = FORTRESS.x, fz = FORTRESS.z;
  const fy = dungeonHeight(fx, fz);
  const dark = islandRockMaterial(null, { base: 0x4a4352, shadow: 0x231e28, top: 0x6a6070, topAmount: 0.4, veins: 0.35, veinColor: 0xff5a2a, timeUniform: time });
  const fort = new THREE.Group();
  const keep = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.4, 14, 8), dark);
  keep.position.y = 7;
  fort.add(keep);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 4.6, 1.4, 8), dark);
  crown.position.y = 14.6;
  fort.add(crown);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.0), dark);
    m.position.set(Math.cos(a) * 5.0, 15.9, Math.sin(a) * 5.0);
    m.rotation.y = -a;
    fort.add(m);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 10, 7), dark);
    tw.position.set(Math.cos(a) * 9, 5, Math.sin(a) * 9);
    fort.add(tw);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.5, 7), dark);
    spire.position.set(Math.cos(a) * 9, 12.2, Math.sin(a) * 9);
    fort.add(spire);
    zone.addCollider(fx + Math.cos(a) * 9, fz + Math.sin(a) * 9, 2.4);
  }
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffa050 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), windowMat);
    w.position.set(Math.cos(a) * 4.75, 9 + (i % 2) * 2.5, Math.sin(a) * 4.75);
    w.lookAt(Math.cos(a) * 10, w.position.y, Math.sin(a) * 10);
    fort.add(w);
  }
  const gate = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4), new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0.6 }));
  gate.position.set(0, 2, 5.45);
  fort.add(gate);
  fort.position.set(fx, fy - 0.4, fz);
  fort.rotation.y = Math.PI;      // gate faces the trail from the crypt (north)
  fort.traverse((o) => { if (o.isMesh && o.material !== windowMat) { o.castShadow = true; o.receiveShadow = true; } });
  fort.name = 'DungeonFortressOfShadows';
  g.add(fort);
  zone.addCollider(fx, fz, 5.6);
  const fortLight = new THREE.PointLight(0xff6a2a, 10, 30, 2);
  fortLight.position.set(fx, fy + 6, fz - 7);
  g.add(fortLight);
  const torch = await loadGLTF('./assets/environment/torch_1.glb');
  if (torch) {
    [[-2.5, 6.5], [2.5, 6.5]].forEach(([ox, oz]) => {
      const t = torch.scene.clone(true);
      const bb = new THREE.Box3().setFromObject(t);
      const s = 2.2 / Math.max(bb.max.y - bb.min.y, 0.01);
      t.scale.setScalar(s);
      const wx = fx - ox, wz = fz - oz;
      t.position.set(wx, dungeonHeight(wx, wz) - bb.min.y * s, wz);
      toonifyGroup(t);
      g.add(t);
    });
  }

  // Volcano & cones are scenery: keep the player on the plains
  zone.addCollider(VOLCANO.x, VOLCANO.z, VOLCANO.R * 0.62);
  zone.addCollider(SECONDARY.x, SECONDARY.z, SECONDARY.R * 0.5);
  zone.addCollider(DOME.x, DOME.z, DOME.R * 0.55);
  void IslandWaterBody;
}

export function createDungeonIsland(om) {
  return new GrandIslandZone(om, {
    id: 'dungeon',
    label: 'Isla de la Mazmorra',
    seed: 2301,
    height: dungeonHeight,
    rocks: [],
    rockStyle: { base: 0x4f4856, shadow: 0x2a2530, top: 0x9a94a2, topAmount: 0.7, streaks: 0.8 },
    build: buildDungeon,
    profile: () => dungeonProfile()
  });
}

export const DUNGEON_SPAWN = { x: 130, z: 22, yaw: -Math.PI / 2 };
