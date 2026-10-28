import * as THREE from 'three';
import { SimplexNoise, createSeededRandom } from '../../demo_scena/MathUtils.js';
import { fbm2D } from '../../demo_scena/grassShader.js';
import { GrandIslandZone, loadGLTF } from '../GrandIslandZone.js';
import { smooth } from '../kit/IslandTerrainData.js';
import { crystalMaterial, crystalPrismGeometry, islandRockMaterial } from '../kit/IslandMaterials.js';
import { toonifyGroup } from '../kit/IslandArtLayer.js';
import { IslandParticles } from '../kit/IslandParticles.js';
import { IslandWaterBody } from '../kit/IslandWater.js';
import { MysticLandmarks, MYSTIC_SITES } from './MysticLandmarks.js';
import { MysticLife, buildArcaneTreeVines } from './MysticLife.js';
import { mergeStaticByMaterial } from '../../../../render/StaticMerge.js';

// Hito 72 · colisiones de Mística. Sin colisión (se pisan): guijarros, enredaderas, flores, arbustos, setas (también
// las rojas altas), cortinas del sauce e islas flotantes. Los arcos de raíces ya tienen colisión en sus pies.
// Hito 72b: el pantano solo se baja y se sube por la entrada del noreste (la rampa suave junto a la nebulosa); el
// resto del borde (la pared de las terrazas, r ≈ 29–31,5 m) no se cruza en ningún sentido.
const SWAMP_FENCE = { r0: 28.8, r1: 31.6, gateAngle: -69 * Math.PI / 180, gateHalfWidth: 3.5 };
function fenceSwamp(m) {
  const { n, cell, minX, minZ, slope } = m;
  const S = SWAMP, F = SWAMP_FENCE;
  const i0 = Math.max(0, Math.floor((S.x - F.r1 - 1 - minX) / cell)), i1 = Math.min(n - 1, Math.ceil((S.x + F.r1 + 1 - minX) / cell));
  const j0 = Math.max(0, Math.floor((S.z - F.r1 - 1 - minZ) / cell)), j1 = Math.min(n - 1, Math.ceil((S.z + F.r1 + 1 - minZ) / cell));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = minX + i * cell, z = minZ + j * cell;
    const dx = x - S.x, dz = z - S.z, r = Math.hypot(dx, dz);
    if (r < F.r0 || r > F.r1) continue;
    let da = Math.atan2(dz, dx) - F.gateAngle;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) * r < F.gateHalfWidth) continue; // la entrada
    slope[j * n + i] = 60;
  }
}

// Hito 94: la ladera de la costa (r ≥ 134 m, donde el terreno baja al mar) se puede bajar entera. Llega a 35–39°, justo
// por encima del límite, y dejaba una pared invisible de ~6 m sobre la hierba antes del agua (junto a la balsa del
// barquero, al este, y en otros tramos). Lo de más de 41° seguiría sin subirse.
const COAST_OPEN = { r: 134, maxSlope: 41, cap: 33 };
function openCoast(m) {
  const { n, cell, minX, minZ, slope } = m;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = minX + i * cell, z = minZ + j * cell;
    if (x * x + z * z < COAST_OPEN.r * COAST_OPEN.r) continue;
    const k = j * n + i;
    if (slope[k] <= COAST_OPEN.maxSlope) slope[k] = Math.min(slope[k], COAST_OPEN.cap);
  }
}

const MYSTIC_PROP_RULES = [
  { test: /^IslandTreeTrunk_broad/, kind: 'tree', band: 0.8, rMin: 0.4, rMax: 0.9 },
  { test: /^mystic_Rock/, kind: 'rock', band: 1.2, rMin: 0.4, rMax: 3, minH: 0.7 },
  // (agujas, cúmulos y rocas de cristal: huella exacta en hullRules, Hito 72d)
  { test: /^output_unwrapped/, kind: 'deco', band: 1.0, rMin: 0.4, rMax: 3, minH: 0.7 },
];

/**
 * Isla Mística (Hito 23) — "El Árbol Arcano de Lunacia".
 * Read from the Forest silhouette: a colossal tree with buttress roots and four canopy domes,
 * escorted by three curved spires — here they are giant AMETHYST crystal spires.
 *
 *  - Árbol Arcano on a mossy hill north of the centre (scenery, ~45 m); its roots arch over
 *    the trail like natural gates; floating islets drift near the canopy.
 *  - Every large rock is translucent purple crystal: amethyst monolith clusters and crystal
 *    boulders (StylisedRockCollection shapes with the crystal material). Small stones stay
 *    mossy slate so the crystal reads.
 *  - Luminous turquoise swamp with moss terraces in the south-west; the Lunacia Nebula fissure
 *    (stardust rising from a glowing crack) beside it.
 *  - POIs (NPCs keep their quest positions): Astral Void Sanctuary (floating rune monoliths by
 *    the Astral Sage), Oracle Observatory (tower by the Astrologer), Lunacia Nebula.
 *  - Late dusk: violet / magenta sky with the first stars, jade-lavender haze, fireflies.
 *
 * Mejora del bioma (plan de la Mística): Oracle by the Arcane Tree, Observatorio Astral rebuilt
 * + astrologer's cottage, glowing willow on an islet in the swamp with an ancient rune pillar,
 * magical fish and fireflies, luminescent butterflies, luminous mushrooms / flowers / bushes (Mystic pack), emissive channel on the
 * crystals + point lights at the three great spires, two-tone grass (jade + soft violet), shore
 * foam, magical pebbles and glowing vines with rising fireflies on the Arcane Tree
 * (see MysticLandmarks / MysticLife).
 */
const N1 = new SimplexNoise(7711);
const TREE = { x: 0, z: -64 };
const SWAMP = { x: -64, z: 62, r: 30, level: 3.0 };
const NEBULA = { x: -30, z: 34 };
const SANCTUARY = { x: -22, z: 26 };
const OBSERVATORY = { x: 42, z: -38 };
const ISLET = MYSTIC_SITES.islet;
const SPIRES = [
  { x: -76, z: -22, r: 7.5, h: 46, lean: [0.12, -0.05] },
  { x: 72, z: 36, r: 6.5, h: 40, lean: [-0.08, 0.1] },
  { x: 120, z: -74, r: 7.0, h: 52, lean: [0.06, 0.12] }
];

function mysticHeight(x, z) {
  const r = Math.hypot(x, z);
  const n = N1.fbm(x * 0.011, z * 0.011, 3, 0.5, 2.0);
  let h = 6.0 + n * 4.5 + fbm2D(x * 0.05, z * 0.05) * 1.2;
  // Mossy hill crowned by the Arcane Tree
  const dt = Math.hypot(x - TREE.x, z - TREE.z);
  h += 13 * smooth(58, 16, dt);
  // Luminous swamp lowland with moss terraces
  const ds = Math.hypot(x - SWAMP.x, z - SWAMP.z);
  if (ds < SWAMP.r + 18) {
    const terr = Math.round((h - 2.6) / 1.2) * 1.2 + 2.6;         // stepped moss terraces
    const bowl = SWAMP.level - 0.8 * (1 - Math.pow(Math.min(1, ds / SWAMP.r), 2)) + Math.max(0, ds - SWAMP.r) * 0.0;
    const k = smooth(SWAMP.r + 18, SWAMP.r - 4, ds);
    const inner = ds < SWAMP.r ? bowl : Math.min(terr, h);
    h = h * (1 - k) + inner * k;
    // Mossy islet in the centre (the glowing willow stands on it)
    const di = Math.hypot(x - ISLET.x, z - ISLET.z);
    if (di < ISLET.r + 1.5) {
      const top = ISLET.top - 0.9 * Math.pow(Math.min(1, di / ISLET.r), 2);
      h = h + (Math.max(h, top) - h) * smooth(ISLET.r + 1.5, ISLET.r - 1.0, di);
    }
  }
  // Nebula fissure: la zanja (2,6 m) se quitó en el Hito 72c; el polvo de estrellas y la luz de la nebulosa siguen
  // Flat pads for the sanctuary and the observatory
  const dsa = Math.hypot(x - SANCTUARY.x, z - SANCTUARY.z);
  if (dsa < 14) h = h + (6.4 - h) * smooth(14, 8, dsa);
  const dob = Math.hypot(x - OBSERVATORY.x, z - OBSERVATORY.z);
  if (dob < 12) h = h + (9.0 - h) * smooth(12, 6, dob);
  if (r > 136) {
    const c = smooth(136, 160, r);
    h = h * (1 - c) + -2.5 * c;
  }
  return h;
}

const PATHS = [
  { points: [[134, 8], [104, 6], [72, 0], [48, -10], [36, -26]], width: 4.2 },
  { points: [[48, -10], [22, -1], [2, 8], [-10, 16], [-20, 23]], width: 3.8 },
  { points: [[2, 8], [-1, -14], [-2, -34], [0, -44]], width: 3.6 },
  { points: [[-22, 28], [-30, 40], [-44, 50], [-52, 56]], width: 3.2 }
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

function freeSpot(x, z, clear = 5) {
  if (pathDist(x, z) < clear) return false;
  if (Math.hypot(x - TREE.x, z - TREE.z) < 16) return false;
  if (Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r + 2) return false;
  if (Math.hypot(x - SANCTUARY.x, z - SANCTUARY.z) < 14) return false;
  if (Math.hypot(x - OBSERVATORY.x, z - OBSERVATORY.z) < 12) return false;
  if (Math.hypot(x - NEBULA.x, z - NEBULA.z) < 12) return false;
  if (Math.hypot(x - 5, z - 7) < 9) return false;        // wandering chimera route
  return mysticHeight(x, z) > 2.5;
}

function mysticProfile(zone) {
  const sun = new THREE.Vector3(-110, 30, 70).normalize();
  return {
    id: 'mystic',
    light: { sunDir: sun, sunColor: 0xffb4c8, sunIntensity: 1.95, skyFill: 0x8f86e6, groundFill: 0x2f6f66, hemiIntensity: 1.45, ambientColor: 0xc9b8ff, ambientIntensity: 0.48 },
    fog: { color: 0xa898dc, density: 0.003 },
    horizonHaze: 0.42,
    exposure: 1.02,
    bloom: { strength: 0.62, radius: 0.6, threshold: 0.82 },
    postFX: { warm: [1.06, 0.98, 1.0], cool: [0.9, 0.94, 1.12], saturation: 1.14, vignette: 0.26, godRays: 0.5 },
    sky: {
      zenith: 0x272a6e, mid: 0x6a5bb5, horizon: 0xff9ec4, horizonAway: 0x7a7fd0, sunDisk: 0xffe6f0, sunHalo: 0xff9fd0,
      cloudLit: 0xffd6ec, cloudShadow: 0x6c5ba8, cloudRim: 0xffb3d9, haze: 0xb9a8e6, cloudCoverage: 0.5, stars: 0.9, starColor: 0xfff2ff
    },
    mountains: { sunColor: 0xffb4c8, haze: 0xb9a8e6, hazeAway: 0x7a7fd0, rockNear: 0x5a4f8f, rockFar: 0x8a7fc4, snow: 0xe6dcff, grass: 0x3f8f80 },
    sea: { sunColor: 0xffb4c8, shallow: 0x4fc7d0, mid: 0x3a6fb8, deep: 0x2a2f7a, foam: 0xe8f0ff, skyZenith: 0x272a6e, skyHorizon: 0xff9ec4 },
    paths: PATHS,
    mask: ({ x, z, y, ny }) => {
      let g = smooth(0.66, 0.82, ny) * smooth(2.4, 3.6, y);
      g *= 0.4 + 0.6 * smooth(0.3, 0.55, fbm2D(x * 0.04 - 3.0, z * 0.04 + 8.0));
      const ds = Math.hypot(x - SWAMP.x, z - SWAMP.z);
      g *= smooth(SWAMP.r - 1, SWAMP.r + 3, ds);
      const fl = (0.35 + 0.65 * smooth(0.55, 0.72, fbm2D(x * 0.025 + 1.0, z * 0.025 - 6.0))) * g * 0.75;
      const wet = ds < SWAMP.r + 5 ? smooth(SWAMP.r + 5, SWAMP.r - 1, ds) : 0;
      return { grass: g, flowers: fl, wet };
    },
    terrain: {
      // Two-tone meadow: jade (current) + soft violet patches
      ground: { deep: 0x1f5a4f, mid: 0x2f8f7a, light: 0x6fd0b0, dry: 0xa98ee0, dryAmount: 0.85 },
      soil: 0x4a5a6a,
      heightRange: [3, 22],
      cliffSlope: [0.56, 0.72],
      path: { tint: [0.78, 0.82, 1.02], dust: [1.1, 1.1, 1.2], desat: 0.82, ruts: 0.0 },
      uniforms: {
        uSlateA: { value: new THREE.Color(0x3f4566) },
        uSlateB: { value: new THREE.Color(0x6a6f96) },
        uMossM: { value: new THREE.Color(0x2f8f7a) },
        uRune: { value: new THREE.Color(0x9fe8ff) },
        uSwampC: { value: new THREE.Vector2(SWAMP.x, SWAMP.z) }
      },
      surfaceGLSL: /* glsl */ `
        vec3 islandSurface(vec3 wp, vec3 nW, vec4 gm, vec3 meadow, float brush) {
          // Deep moss carpet + dark wet moss toward the swamp; faint glowing lichen specks
          vec3 col = meadow;
          col = mix(col, uMossM * 0.55, (1.0 - smoothstep(0.1, 0.5, gm.r)) * 0.6);
          col = mix(col, col * vec3(0.6, 0.78, 0.82), gm.a * 0.8);
          float lichen = step(0.992, gHash12(floor(wp.xz * 5.0))) * (1.0 - gm.a);
          col += uRune * lichen * 0.6;
          return col;
        }`,
      cliffGLSL: /* glsl */ `
        vec3 islandCliff(vec3 wp, vec3 nW, float brush) {
          float n = gNoise(wp.xz * 0.14 + wp.y * 0.1);
          vec3 c = mix(uSlateA, uSlateB, smoothstep(0.3, 0.75, n));
          c = mix(c, uMossM * 0.8, smoothstep(0.25, 0.55, nW.y + (n - 0.5) * 0.4) * 0.8);
          // Glowing rune veins in the slate
          float vein = 1.0 - smoothstep(0.0, 0.03, abs(gNoise(vec2(wp.x + wp.z, wp.y) * 0.3) - 0.5));
          return c + uRune * vein * 0.35;
        }`
    },
    grass: {
      ground: { deep: 0x1f5a4f, mid: 0x2f8f7a, light: 0x6fd0b0, dry: 0xa98ee0, dryAmount: 0.85 },
      flowers: [0x9ff0ff, 0xe8b8ff, 0xffffff, 0xff9ad8],
      flowerGlow: 0.8,
      sunTint: 0xc8fff0, backlight: 0xffb8e8, shadowTint: [0.86, 0.88, 1.18], heightScale: 1.1, windStrength: 0.18, flowerCut: 38
    },
    treeCfg: {
      seed: 9191,
      foliageGlow: 0.16,
      palettes: {
        jade: [0x3fbf9a, 0x2fa88a, 0x55d1ab],
        teal: [0x2fb3c4, 0x3bc6d0, 0x29a0b8],
        lavender: [0xb28cff, 0x9f7ae8, 0xc7a5ff],
        arcane: [0x6fe0c0]
      },
      trunks: {
        jade: { bark: 'twisted', tone: [0.7, 0.66, 0.8] },
        teal: { bark: 'twisted', tone: [0.66, 0.66, 0.82] },
        lavender: { bark: 'normal', tone: [0.78, 0.68, 0.9] },
        arcane: { bark: 'twisted', tone: [0.85, 0.8, 0.95] }
      }
    },
    trees: () => mysticTrees(),
    // Glowing vines + rising magic fireflies on the Arcane Tree (needs the built tree meshes)
    build: (layer) => buildArcaneTreeVines(layer, zone, { time: zone.mysticTime, height: mysticHeight, tree: TREE }),
    water: [
      { shape: 'disc', center: [SWAMP.x, SWAMP.z], radius: SWAMP.r + 3, level: SWAMP.level, mode: 0, name: 'MysticLuminousSwamp',
        colors: { shallow: 0x2fb8b0, deep: 0x0c3f5a, foam: 0xc8f6ee, glow: 0x40ffd0 }, glow: 0.14, opacity: 0.6, depthRange: 0.7, foamAmount: 0.25 },
      // (Hito 72c: sin la cinta brillante de la grieta: la zanja ya no existe)
    ],
    particles: [
      { mode: 'spores', count: 420, velocity: [0.05, 0.25, 0.05], size: 3.6, colorA: 0x9fffe0, colorB: 0xe0b0ff, intensity: 1.7, opacity: 0.85, sway: 0.9, box: [50, 14, 50] }
    ]
  };
}

function mysticTrees() {
  const rng = createSeededRandom(4040);
  const out = [{ kind: 'arcane', family: 'arcane', pos: new THREE.Vector3(TREE.x, mysticHeight(TREE.x, TREE.z) - 1.0, TREE.z), rotY: 0.4, s: 1.0, sy: 1.0 }];
  const fams = ['jade', 'jade', 'teal', 'lavender'];
  for (let g = 0; g < 22; g++) {
    const a = rng() * Math.PI * 2;
    const rr = 20 + rng() * 108;
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
    const fam = fams[Math.floor(rng() * fams.length)];
    const n = 3 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() - 0.5) * 18, z = cz + (rng() - 0.5) * 18;
      if (!freeSpot(x, z, 5)) continue;
      const s = 0.95 + rng() * 0.45;
      out.push({ kind: 'broad', family: fam, pos: new THREE.Vector3(x, mysticHeight(x, z) - 0.2, z), s, sy: s * (0.9 + rng() * 0.2) });
    }
  }
  return out;
}

async function buildMystic(zone) {
  const g = zone.group;
  const time = { value: 0 };
  zone.updatables.push((dt) => { time.value += dt; });
  const amethyst = crystalMaterial({ color: 0xb98cff, glow: 0x7a3cff, glowIntensity: 0.6, rim: 0xf0d8ff, core: 0xffd8ff, opacity: 0.74, timeUniform: time, name: 'MysticAmethyst' });
  const amethystDeep = crystalMaterial({ color: 0x9a6cf0, glow: 0x5a2ad8, glowIntensity: 0.5, rim: 0xe6c8ff, opacity: 0.8, timeUniform: time, name: 'MysticAmethystDeep' });
  zone.mysticTime = time;
  addCrystalEmissiveChannel(amethyst, time, 0xe2b8ff, 0x8ff0ff);
  addCrystalEmissiveChannel(amethystDeep, time, 0xc79cff, 0x9fe8ff);
  const rng = createSeededRandom(7070);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();

  // 1. Giant amethyst spires (the three curved spires of the silhouette)
  // Unit-height prism (body + tip = 1) so scale (r, h, r) gives exact sizes
  const prism = crystalPrismGeometry(1, 3.0);
  prism.scale(1, 1 / (3.0 + 1.7), 1);
  prism.computeBoundingSphere();
  const spireList = [];
  for (const s of SPIRES) {
    const y = mysticHeight(s.x, s.z) - 2;
    spireList.push({ x: s.x, y, z: s.z, r: s.r, h: s.h, ex: s.lean[0], ez: s.lean[1] });
    for (let i = 0; i < 6; i++) {
      const a = rng() * Math.PI * 2, d = s.r * (0.9 + rng() * 0.8);
      spireList.push({ x: s.x + Math.cos(a) * d, y: y + 0.5, z: s.z + Math.sin(a) * d, r: s.r * (0.25 + rng() * 0.3), h: s.h * (0.2 + rng() * 0.35), ex: Math.cos(a) * 0.35, ez: Math.sin(a) * 0.35 });
    }
    // (Hito 72d: colisión con la huella exacta del cristal: def.collision.hullRules)
  }
  const spires = new THREE.InstancedMesh(prism, amethyst, spireList.length);
  spireList.forEach((s, i) => {
    q.setFromEuler(new THREE.Euler(s.ez, rng() * 6.28, -s.ex));
    // prism unit: radius 1, body height 1 + tip → scale XZ by r, Y by h
    m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.r, s.h, s.r));
    spires.setMatrixAt(i, m4);
  });
  spires.instanceMatrix.needsUpdate = true;
  spires.computeBoundingSphere();
  spires.name = 'MysticAmethystSpires';
  g.add(spires);

  // 2. Amethyst monolith clusters (the island's "big rocks")
  const clusterList = [];
  for (let c = 0; c < 26; c++) {
    let x, z, tries = 0;
    do { const a = rng() * Math.PI * 2, rr = 18 + rng() * 112; x = Math.cos(a) * rr; z = Math.sin(a) * rr; tries++; } while (!freeSpot(x, z, 6) && tries < 20);
    if (tries >= 20) continue;
    const y = mysticHeight(x, z) - 0.3;
    const big = 0.7 + rng() * 1.1;
    const n = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, d = i === 0 ? 0 : big * (0.8 + rng() * 1.2);
      const rad = big * (i === 0 ? 1 : 0.35 + rng() * 0.45);
      const hh = (i === 0 ? 6 + rng() * 6 : 2 + rng() * 4) * big;
      clusterList.push({ x: x + Math.cos(a) * d, y, z: z + Math.sin(a) * d, r: rad, h: hh, ex: i ? Math.cos(a) * 0.4 : (rng() - 0.5) * 0.2, ez: i ? Math.sin(a) * 0.4 : (rng() - 0.5) * 0.2 });
    }
    // (Hito 72d: colisión con la huella exacta del cúmulo: def.collision.hullRules)
  }
  const clusters = new THREE.InstancedMesh(prism, amethystDeep, clusterList.length);
  clusterList.forEach((s, i) => {
    q.setFromEuler(new THREE.Euler(s.ez, rng() * 6.28, -s.ex));
    m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.r, s.h, s.r));
    clusters.setMatrixAt(i, m4);
  });
  clusters.instanceMatrix.needsUpdate = true;
  clusters.computeBoundingSphere();
  clusters.name = 'MysticAmethystClusters';
  g.add(clusters);

  // 3. Crystal boulders (stylised rock shapes in amethyst)
  for (const n of [1, 2, 3, 4]) {
    const gl = await loadGLTF(`./assets/rocks/StylisedRockCollection${n}.glb`);
    if (!gl) continue;
    gl.scene.updateMatrixWorld(true);
    const srcs = [];
    gl.scene.traverse((o) => { if (o.isMesh) srcs.push(o); });
    for (const src of srcs) {
      const geo = src.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(src.getWorldQuaternion(new THREE.Quaternion())));
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      const size = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z, (bb.max.y - bb.min.y) * 1.25);
      const list = [];
      for (let i = 0; i < 4; i++) {
        let x, z, tries = 0;
        do { const a = rng() * Math.PI * 2, rr = 15 + rng() * 115; x = Math.cos(a) * rr; z = Math.sin(a) * rr; tries++; } while (!freeSpot(x, z, 5) && tries < 20);
        if (tries >= 20) continue;
        const s = (2.2 + rng() * 3.2) / size;
        q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.3, rng() * 6.28, (rng() - 0.5) * 0.3));
        m4.compose(new THREE.Vector3(x, mysticHeight(x, z) - 0.4, z), q, new THREE.Vector3(s, s, s));
        list.push(m4.clone());
        // (Hito 72d: colisión con la huella exacta de la roca de cristal: def.collision.hullRules)
      }
      if (!list.length) continue;
      const inst = new THREE.InstancedMesh(geo, amethyst, list.length);
      list.forEach((mm, i) => inst.setMatrixAt(i, mm));
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      inst.name = 'MysticCrystalBoulders';
      g.add(inst);
    }
  }

  // 4. Small mossy slate stones (only small rocks stay stone)
  zone.def.rocks = [{
    url: './assets/mystic/rock_smallA.glb', count: 60, seed: 81,
    place: (r) => { for (let t = 0; t < 10; t++) { const a = r() * 6.28, rr = 12 + r() * 120; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (freeSpot(x, z, 3)) return { x, z, s: 0.6 + r() * 1.2, sink: 0.2 }; } return null; }
  }, {
    url: './assets/mystic/stone_smallA.glb', count: 50, seed: 82,
    place: (r) => { for (let t = 0; t < 10; t++) { const a = r() * 6.28, rr = 12 + r() * 120; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (freeSpot(x, z, 3)) return { x, z, s: 0.5 + r() * 0.9, sink: 0.2 }; } return null; }
  }];

  // 5. Root arches of the Arcane Tree over the hill trail (natural gates)
  const rootMat = new THREE.MeshToonMaterial({ color: 0x6a5a7a });
  for (let i = 0; i < 3; i++) {
    const z = -24 - i * 7;
    const x = -1.5 + i * 0.3;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.2 + i * 0.4, 0.55 - i * 0.08, 6, 18, Math.PI), rootMat);
    arch.position.set(x, mysticHeight(x, z) - 0.6, z);
    arch.rotation.y = 0.15 * (i - 1);
    arch.castShadow = true;
    arch.receiveShadow = true;
    arch.name = 'MysticRootArch';
    g.add(arch);
    zone.addCollider(x - (4.2 + i * 0.4), z, 0.8);
    zone.addCollider(x + (4.2 + i * 0.4), z, 0.8);
  }
  zone.addCollider(TREE.x, TREE.z, 9);

  // 6. Floating islets near the canopy
  const isletMat = islandRockMaterial(null, { base: 0x9a90c8, top: 0x3fbf9a, topAmount: 1.0, shadow: 0xb0a0e8 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.4;
    const rr = 26 + rng() * 22;
    const islet = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2 + rng() * 2.5, 4 + rng() * 3, 7, 1), isletMat);
    cone.rotation.x = Math.PI;
    islet.add(cone);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.5, 9), isletMat);
    top.position.y = 2.2;
    islet.add(top);
    const cr = new THREE.Mesh(prism, amethyst);
    cr.scale.set(0.5, 3.0, 0.5);
    cr.position.y = 2.4;
    islet.add(cr);
    // Cono y plataforma comparten material y se mueven juntos: una sola malla por islote (el cristal,
    // translúcido, se queda aparte para que se siga ordenando con el resto de transparencias).
    mergeStaticByMaterial(islet, { name: 'MysticFloatingIsletRock' });
    const bx = TREE.x + Math.cos(a) * rr, bz = TREE.z + Math.sin(a) * rr, by = 26 + rng() * 14;
    islet.position.set(bx, by, bz);
    islet.name = 'MysticFloatingIslet';
    g.add(islet);
    const ph = rng() * 6.28;
    zone.updatables.push(() => { islet.position.y = by + Math.sin(time.value * 0.5 + ph) * 0.8; islet.rotation.y = time.value * 0.05 + ph; });
  }

  // 7. POI — Astral Void Sanctuary: circle of floating rune monoliths around a star altar
  const runeMat = crystalMaterial({ color: 0xc9b4ff, glow: 0x8a6cff, glowIntensity: 0.75, rim: 0xffffff, opacity: 0.86, timeUniform: time, name: 'MysticRuneMonolith' });
  const slab = new THREE.BoxGeometry(1.4, 4.2, 0.5);
  const sy = mysticHeight(SANCTUARY.x, SANCTUARY.z);
  const monoliths = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(slab, runeMat);
    m.name = 'MysticSanctuaryMonolith';
    g.add(m);
    monoliths.push(m);
  }
  const altar = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.7, 8), islandRockMaterial(null, { base: 0x6a6f96, shadow: 0x3f4566 }));
  altar.position.set(SANCTUARY.x, sy + 0.2, SANCTUARY.z);
  g.add(altar);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), crystalMaterial({ color: 0xfff0ff, glow: 0xd8b8ff, glowIntensity: 1.6, rim: 0xffffff, opacity: 0.9, timeUniform: time }));
  g.add(star);
  const starLight = new THREE.PointLight(0xc8a8ff, 7, 20, 2);
  starLight.position.set(SANCTUARY.x, sy + 3, SANCTUARY.z);
  g.add(starLight);
  zone.addCollider(SANCTUARY.x, SANCTUARY.z, 2.6);
  // Hito 72c: los monolitos ya no giran alrededor del altar; cada uno flota en su sitio (solo sube y baja) y tiene
  // colisión (la losa mide 1,4 × 0,5 m y su base queda a ~1 m del suelo: el personaje choca con ella)
  monoliths.forEach((m, i) => {
    const a = (i / 6) * Math.PI * 2;
    m.position.set(SANCTUARY.x + Math.cos(a) * 7.5, sy + 3.2, SANCTUARY.z + Math.sin(a) * 7.5);
    m.rotation.y = -a + Math.PI / 2;
    zone.addCollider(m.position.x, m.position.z, 0.8);
  });
  zone.updatables.push(() => {
    const t = time.value;
    monoliths.forEach((m, i) => { m.position.y = sy + 3.2 + Math.sin(t * 0.8 + i) * 0.35; });
    star.position.set(SANCTUARY.x, sy + 2.6 + Math.sin(t * 1.2) * 0.2, SANCTUARY.z);
    star.rotation.y = t * 0.6;
  });

  // 8. POI — Observatorio Astral: rebuilt with primitives in MysticLandmarks (replaces the old tower)

  // 9. Nebula stardust rising from the fissure
  const ny = mysticHeight(NEBULA.x, NEBULA.z);
  const dust = new IslandParticles(g, { mode: 'spores', count: 160, velocity: [0.0, 0.9, 0.0], size: 4.0, colorA: 0xe2c4ff, colorB: 0x9fe8ff, intensity: 2.0, opacity: 0.9, sway: 0.35, box: [8, 12, 14] });
  const dustCentre = new THREE.Vector3(NEBULA.x, ny + 3, NEBULA.z);
  zone.updatables.push((dt) => dust.update(dt, dustCentre));
  const nebLight = new THREE.PointLight(0xb08cff, 6, 18, 2);
  nebLight.position.set(NEBULA.x, ny + 1.5, NEBULA.z);
  g.add(nebLight);

  // 10. Glowing mushrooms (Mystic pack) in the damp hollows
  const mush = await loadGLTF('./assets/mystic/mushroom_redGroup.glb');
  if (mush) {
    const srcs = [];
    mush.scene.traverse((o) => { if (o.isMesh) srcs.push(o); });
    const spots = [];
    for (let i = 0; i < 40; i++) {
      const a = rng() * 6.28, rr = SWAMP.r + 2 + rng() * 30;
      const x = SWAMP.x + Math.cos(a) * rr * 0.9, z = SWAMP.z + Math.sin(a) * rr * 0.9;
      if (!freeSpot(x, z, 2.5) || Math.hypot(x, z) > 130) continue;
      spots.push({ x, z, s: 1.6 + rng() * 1.6, r: rng() * 6.28 });
    }
    srcs.forEach((src) => {
      const mat = new THREE.MeshToonMaterial({ color: 0x7ff0ff, emissive: 0x2fa8ff, emissiveIntensity: 0.55 });
      if (/stem|white|base/i.test((src.material && src.material.name) || '')) { mat.color.set(0xe8e0ff); mat.emissive.set(0x40306a); mat.emissiveIntensity = 0.3; }
      const inst = new THREE.InstancedMesh(src.geometry, mat, spots.length);
      spots.forEach((p, i) => {
        m4.compose(new THREE.Vector3(p.x, mysticHeight(p.x, p.z) - 0.05, p.z), q.setFromEuler(new THREE.Euler(0, p.r, 0)), new THREE.Vector3(p.s, p.s, p.s));
        inst.setMatrixAt(i, m4);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      inst.name = 'MysticGlowMushrooms';
      g.add(inst);
    });
  }
  // --- Mejora del bioma: places (primitives) + living / glowing dressing
  new MysticLandmarks(zone, { height: mysticHeight, time, amethyst });
  const treeSpots = mysticTrees().filter((t) => t.kind === 'broad').map((t) => ({ x: t.pos.x, z: t.pos.z }));
  const crystalSpots = [];
  for (let i = 0; i < clusterList.length; i += 4) crystalSpots.push({ x: clusterList[i].x, z: clusterList[i].z });
  const life = new MysticLife(zone, {
    height: mysticHeight, time, freeSpot, pathDist, tree: TREE, swamp: SWAMP, islet: ISLET,
    treeSpots, crystalSpots, seaLevel: 0.45,
    coastAvoid: [[136, 14, 4], [128, 8, 4]]
  });
  await life.buildGlowVegetation(loadGLTF);
  // Point lights at the base of the three great spires (tint the ground and the nearby rocks)
  const spireLightCol = [0xb48cff, 0x9fe8ff, 0xd29cff];
  SPIRES.forEach((s, i) => {
    const l = new THREE.PointLight(spireLightCol[i], 14, 30, 1.6);
    const a = Math.atan2(-s.z, -s.x);   // on the side facing the island centre
    l.position.set(s.x + Math.cos(a) * (s.r * 1.6), mysticHeight(s.x, s.z) + 2.5, s.z + Math.sin(a) * (s.r * 1.6));
    l.name = 'MysticSpireLight';
    g.add(l);
  });
  void toonifyGroup; void IslandWaterBody;
}

/**
 * Emissive channel for the Mystic crystals: slow pulsing inner veins + a brighter glowing base
 * (Mystic-only patch on top of the shared crystal material; own program key).
 */
function addCrystalEmissiveChannel(mat, time, veinHex, baseHex) {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  const vein = new THREE.Color(veinHex), base = new THREE.Color(baseHex);
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(mat, shader, renderer);
    shader.uniforms.uMVein = { value: vein };
    shader.uniforms.uMBase = { value: base };
    shader.uniforms.uMTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying float vMWorldY;
        varying vec3 vMWorld;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        {
          vec4 wpM = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wpM = instanceMatrix * wpM;
          #endif
          wpM = modelMatrix * wpM;
          vMWorld = wpM.xyz;
          vec4 baseM = vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_INSTANCING
            baseM = instanceMatrix * baseM;
          #endif
          baseM = modelMatrix * baseM;
          vMWorldY = wpM.y - baseM.y;
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uMVein, uMBase;
        uniform float uMTime;
        varying float vMWorldY;
        varying vec3 vMWorld;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // Inner veins: thin bands drifting upward, pulsing slowly
          float band = sin(vMWorld.y * 1.6 - uMTime * 0.9 + sin(vMWorld.x * 0.7 + vMWorld.z * 0.5) * 2.0);
          float veins = smoothstep(0.86, 0.99, band);
          float pulse = 0.65 + 0.35 * sin(uMTime * 1.4 + vMWorld.x * 0.11 + vMWorld.z * 0.09);
          totalEmissiveRadiance += uMVein * veins * 0.55 * pulse;
          // Glowing base where the crystal meets the ground
          float baseGlow = 1.0 - smoothstep(0.0, 1.6, vMWorldY);
          totalEmissiveRadiance += uMBase * baseGlow * 0.45 * pulse;
        }`);
  };
  mat.customProgramCacheKey = () => `${prevKey()}|mystic-emissive`;
}

export function createMysticIsland(om) {
  return new GrandIslandZone(om, {
    id: 'mystic',
    label: 'Isla Mística',
    seed: 1201,
    height: mysticHeight,
    rocks: [],
    rockStyle: { base: 0x6a6f96, shadow: 0x3f4566, top: 0x2f8f7a, topAmount: 1.0, streaks: 0.7 },
    build: buildMystic,
    profile: (zone) => mysticProfile(zone),
    // Hito 72: mar hasta la rodilla; el pantano luminoso se cruza entero con el agua a media pierna (hasta el islote
    // del sauce); pendientes de más de 35° (borde del observatorio) no se suben; la ladera de la costa sí (Hito 94)
    collision: {
      propRules: MYSTIC_PROP_RULES, slopeMax: 35, wadeMax: 0.5,
      // Hito 72d: los cristales (agujas, cúmulos y rocas de cristal) con su huella exacta: ningún extremo se atraviesa
      hullRules: [
        { test: /^MysticAmethystSpires/, kind: 'spire' },
        { test: /^MysticAmethystClusters/, kind: 'amethyst', minH: 0.4 },
        { test: /^MysticCrystalBoulders/, kind: 'boulder', minH: 0.4 },
      ],
      shallow: (x, z) => (Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r + 3 ? SWAMP.level : null),
      shallowMax: 0.3,
      adjust: (m) => { fenceSwamp(m); openCoast(m); },
    }
  });
}

export const MYSTIC_SPAWN = { x: 128, z: 8, yaw: Math.PI / 2 };
