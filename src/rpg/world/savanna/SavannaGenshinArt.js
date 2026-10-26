import * as THREE from 'three';
import { fbm2D } from '../demo_scena/grassShader.js';
import { createSeededRandom } from '../demo_scena/MathUtils.js';
import { stylizeFoliageMaterial, restyleMeshes } from '../demo_scena/genshin/GenshinMaterials.js';
import { IslandArtLayer, toonifyGroup } from '../islands/kit/IslandArtLayer.js';
import { IslandWaterBody } from '../islands/kit/IslandWater.js';
import { islandRockMaterial } from '../islands/kit/IslandMaterials.js';
import { smooth } from '../islands/kit/IslandTerrainData.js';
import { applyGenshinOcean } from '../demo_scena/genshin/GenshinWater.js';
import { SavannaGenshinLandmarks } from './SavannaGenshinLandmarks.js';
import { SavannaGenshinOasis } from './SavannaGenshinOasis.js';
import { SavannaGenshinNature } from './SavannaGenshinNature.js';

/**
 * SavannaGenshinArt (Hito 23) — "La Meseta del Sol Naciente".
 * Same art direction as the Forest (painterly sky, haze, soft grass, brush-stroke trees,
 * Genshin water, post FX) with a hot late-afternoon savanna mood:
 *   - golden swaying grass on the mesa, sandy clearings and beaches
 *   - soft sandstone strata on the cliffs (terracotta / ochre / cream)
 *   - patchy red-clay trails linking the ramps, the oasis and the 3 landmarks
 *   - summit oasis level with the plateau (turquoise lagoon, reeds, palms)
 *   - umbrella acacias, palms and dry trees; loose sea-stack mesas crowned with acacias
 *   - ochre-peach dust haze
 */
const SUN = new THREE.Vector3(120, 54, -64).normalize();
const OASIS = { x: 14, z: -12 };

export function createSavannaProfile(zone) {
  const terrain = zone.terrain;
  return {
    id: 'savanna',
    light: {
      sunDir: SUN,
      sunColor: 0xffcf8f,
      sunIntensity: 2.7,
      skyFill: 0xbcd2ec,
      groundFill: 0xa8803e,
      hemiIntensity: 1.25,
      ambientColor: 0xffe2bd,
      ambientIntensity: 0.4
    },
    fog: { color: 0xe8cfa6, density: 0.0027 },
    exposure: 1.05,
    bloom: { strength: 0.42, radius: 0.55, threshold: 0.92 },
    postFX: { warm: [1.08, 1.0, 0.86], cool: [0.9, 0.96, 1.06], saturation: 1.12, vignette: 0.22 },
    sky: {
      zenith: 0x3a7fd0, mid: 0x86bde8, horizon: 0xffd29a, horizonAway: 0xc9d8ea,
      sunDisk: 0xfff1d0, sunHalo: 0xffb867, cloudLit: 0xfff3e0, cloudShadow: 0xc7b9d6,
      cloudRim: 0xffcf8a, haze: 0xf0d4a8, cloudCoverage: 0.52
    },
    mountains: {
      sunColor: 0xffcf8f, haze: 0xf0d4a8, hazeAway: 0xc9d8ea,
      rockNear: 0xb07b52, rockFar: 0xc6a58a, snow: 0xf6eadb, grass: 0xb59a4c
    },
    sea: {
      reuseExisting: true,
      sunColor: 0xffcf8f, shallow: 0x5fd8cf, mid: 0x2aa6bf, deep: 0x1d6698, foam: 0xf6fbf6,
      skyZenith: 0x3a7fd0, skyHorizon: 0xffd29a
    },
    // Trails: ramps up the mesa → oasis → the three landmarks (Bing camp, Sun altar, Forge)
    paths: [
      { points: [[-142, 50], [-120, 42], [-82, 26], [-52, 14], [-35, 8], [-18, 2], [0, -3]], width: 4.4 },
      { points: [[104, -120], [90, -108], [62, -77], [32, -44], [22, -28]], width: 4.2 },
      { points: [[-2, -7], [-14, -20], [-25, -31], [-30, -38]], width: 3.2 },
      { points: [[27, -18], [44, -24], [60, -28], [70, -31]], width: 3.4 },
      { points: [[9, 4], [20, 20], [34, 38], [44, 48]], width: 3.4 }
    ],
    mask: ({ x, z, y, ny }) => {
      let g = 1.0;
      g *= smooth(0.76, 0.9, ny);                  // sandstone terrace walls stay bare
      g *= smooth(2.6, 4.2, y);                     // sandy beaches
      const od = Math.hypot(x - OASIS.x, z - OASIS.z);
      g *= smooth(terrain.oasisPoolRadius - 0.4, terrain.oasisPoolRadius + 3.2, od);   // wet sandy shore
      const n = fbm2D(x * 0.03 + 3.0, z * 0.03 - 9.0);
      g *= 0.35 + 0.65 * smooth(0.24, 0.5, n);      // sandy clearings / dune patches
      const fl = smooth(0.58, 0.74, fbm2D(x * 0.02 + 5.0, z * 0.02 + 1.0)) * g * 0.45;
      const wet = od < terrain.oasisPoolRadius + 3.5 ? smooth(terrain.oasisPoolRadius + 3.5, terrain.oasisPoolRadius - 0.5, od) : 0;
      return { grass: g, flowers: fl, wet };
    },
    terrain: {
      ground: { deep: 0x9c7e2c, mid: 0xc6a443, light: 0xe0c662, dry: 0xd9b678, dryAmount: 0.38 },
      soil: 0xc59a62,
      heightRange: [4, 26],
      cliffSlope: [0.74, 0.9],
      path: { tint: [1.04, 0.96, 0.9], dust: [1.12, 1.06, 0.98], desat: 0.08, ruts: 0.6 },
      uniforms: {
        uSand: { value: new THREE.Color(0xe9cf98) },
        uBeach: { value: new THREE.Color(0xf1d49c) },
        uStrataA: { value: new THREE.Color(0xa9502a) },
        uStrataB: { value: new THREE.Color(0xd2823d) },
        uStrataC: { value: new THREE.Color(0xe9b673) },
        uOasisC: { value: new THREE.Vector2(OASIS.x, OASIS.z) },
        uOasisLush: { value: new THREE.Color(0x7fae3e) }
      },
      surfaceGLSL: /* glsl */ `
        vec3 islandSurface(vec3 wp, vec3 nW, vec4 gm, vec3 meadow, float brush) {
          float rip = sin(dot(wp.xz, vec2(0.8, 0.5)) * 1.3 + gNoise(wp.xz * 0.2) * 4.0) * 0.5 + 0.5;
          vec3 sand = uSand * (0.9 + 0.15 * brush) * (0.95 + 0.07 * rip);
          vec3 col = meadow;
          col = mix(col, sand, (1.0 - smoothstep(0.08, 0.5, gm.r)) * 0.88);
          float beach = 1.0 - smoothstep(2.4, 3.8, wp.y);
          float bPatch = gFbm3(wp.xz * 0.09);
          vec3 beachC = uBeach * (0.9 + 0.12 * rip) * mix(vec3(0.94, 0.9, 0.84), vec3(1.04, 1.02, 0.98), bPatch);
          beachC = mix(beachC * vec3(0.78, 0.76, 0.72), beachC, smoothstep(0.9, 1.8, wp.y));   // damp sand by the water
          col = mix(col, beachC, beach);
          // Lush green ring around the oasis (water feeds the grass), warm damp sand at the shore
          float od = length(wp.xz - uOasisC);
          float lush = (1.0 - smoothstep(13.0, 26.0, od + (gNoise(wp.xz * 0.15) - 0.5) * 6.0)) * gm.r;
          col = mix(col, uOasisLush * (0.85 + 0.25 * brush), lush * 0.75);
          col = mix(col, uSand * vec3(0.82, 0.76, 0.64), gm.a * 0.7);
          return col;
        }`,
      cliffGLSL: /* glsl */ `
        vec3 islandCliff(vec3 wp, vec3 nW, float brush) {
          float n = gNoise(wp.xz * 0.08 + wp.y * 0.05);
          float band = fract(wp.y * 0.22 + n * 0.7 + sin(wp.x * 0.03 + wp.z * 0.02) * 0.25);
          vec3 c = mix(uStrataA, uStrataB, smoothstep(0.05, 0.35, band));
          c = mix(c, uStrataC, smoothstep(0.5, 0.75, band));
          c = mix(c, uStrataA * 0.86, smoothstep(0.86, 0.97, band));
          float st = gNoise(vec2((wp.x + wp.z) * 0.6, wp.y * 0.08));
          c *= 0.88 + 0.2 * st;
          c = mix(c, uStrataC * 1.06, smoothstep(0.2, 0.5, nW.y) * 0.3);
          return c * (0.88 + 0.16 * brush);
        }`
    },
    grass: {
      ground: { deep: 0x9c7e2c, mid: 0xc6a443, light: 0xe0c662, dry: 0xd9b678, dryAmount: 0.38 },
      flowers: [0xff9a3a, 0xfff4e0, 0xb98cff, 0xff5a4a],
      sunTint: 0xfff0a0,
      backlight: 0xffe08a,
      heightScale: 1.55,
      windStrength: 0.3
    },
    treeCfg: {
      seed: 20231,
      // Axie Infinity savanna palette: lime, yellow-green, orange and coral-red crowns on pale
      // baobab-like trunks; bright green palms.
      palettes: {
        acacia: [0xa8cf3a, 0x96c23a, 0xbcd648],
        acaciaGold: [0xdccb3c, 0xd2bd34, 0xe6d24a],
        acaciaOrange: [0xf2a142, 0xea9038, 0xf5b04e],
        acaciaRed: [0xf26b52, 0xea5d4a, 0xf47e60],
        palm: [0x7cc03a, 0x8fcf45, 0x6db535],
        deadwood: [0xffffff]
      },
      trunks: {
        acacia: { bark: 'normal', tone: [2.3, 3.6, 5.6] },
        acaciaGold: { bark: 'normal', tone: [2.3, 3.6, 5.6] },
        acaciaOrange: { bark: 'normal', tone: [2.4, 3.4, 5.0] },
        acaciaRed: { bark: 'normal', tone: [2.3, 3.2, 4.8] },
        palm: { bark: 'normal', tone: [2.2, 3.0, 4.2] },
        deadwood: { bark: 'pine', tone: [1.35, 1.22, 1.08] }
      }
    },
    trees: () => savannaTrees(zone)
  };
}

/** Converts the deterministic SavannaPropsManager tree list into Genshin archetypes. */
function savannaTrees(zone) {
  const props = zone.propsManager;
  const out = [];
  if (!props) return out;
  const rng = createSeededRandom(5150);
  for (const p of props.pendingPalms || []) {
    const s = (p.scale ? p.scale.x : 1.4) * 0.72;
    out.push({ kind: 'palm', family: 'palm', pos: p.pos.clone(), rotY: p.rot ? p.rot.y : 0, s, sy: s });
  }
  for (const t of props.pendingTrees || []) {
    const key = String(t.key || '');
    const s = t.scale ? t.scale.x : 1.2;
    if (key.includes('dead')) {
      out.push({ kind: 'dead', family: 'deadwood', pos: t.pos.clone(), rotY: t.rot ? t.rot.y : 0, s: s * 0.95, sy: s * 0.95 });
    } else {
      const roll = rng();
      const family = roll < 0.45 ? 'acacia' : (roll < 0.7 ? 'acaciaGold' : (roll < 0.88 ? 'acaciaOrange' : 'acaciaRed'));
      out.push({ kind: 'acacia', family, pos: t.pos.clone(), rotY: t.rot ? t.rot.y : 0, s: s * 1.05, sy: s * 0.95 });
    }
  }
  // Acacias crowning the loose sea-stack mesas
  for (const st of SEA_STACKS) {
    out.push({ kind: 'acacia', family: 'acacia', pos: new THREE.Vector3(st.x + st.r * 0.15, st.h - 1.0, st.z - st.r * 0.1), rotY: st.rot, s: 1.5, sy: 1.35 });
  }
  return out;
}

// Loose mesas standing in the sea around the island (match the stepped silhouette seen from the Forest)
const SEA_STACKS = [
  { x: 168, z: -92, r: 17, h: 30, rot: 0.4 },
  { x: -176, z: -70, r: 13, h: 24, rot: 1.6 },
  { x: -120, z: 150, r: 19, h: 34, rot: 2.6 },
  { x: 150, z: 128, r: 11, h: 20, rot: 3.9 }
];

export class SavannaGenshinArt {
  constructor(zone) {
    this.zone = zone;
    this.enabled = true;
    this._hidden = [];
    const profile = createSavannaProfile(zone);
    this.profile = profile;
    this.layer = new IslandArtLayer({
      om: zone.om,
      renderer: zone.renderer,
      root: zone.group,
      terrain: zone.terrain,
      lightingManager: zone.lightingManager
    }, profile);
    const root = this.layer.root;

    // Summit oasis: Genshin lagoon at the terrain's oasis water level
    this.oasis = new IslandWaterBody(root, {
      data: this.layer.data, shape: 'disc', center: [OASIS.x, OASIS.z], radius: zone.terrain.oasisPoolRadius * 1.35 + 0.5,
      level: zone.terrain.oasisWaterLevel, mode: 0, name: 'SavannaGenshinOasis',
      colors: { shallow: 0x3fd2c4, deep: 0x0d6f86, foam: 0xf0fff8 },
      sunDir: this.layer.sunDir, sky: { zenith: profile.sky.zenith, horizon: profile.sky.horizon }, opacity: 0.94, depthRange: 0.9, foamAmount: 0.45
    });
    this.layer.waterBodies.push(this.oasis);

    // Open sea: the Forest's Genshin ocean shader on the Savanna ocean mesh
    const wm = zone.waterManager;
    if (wm && wm.oceanMesh) {
      const mat = applyGenshinOcean(wm);
      const S = profile.sea;
      mat.uniforms.uSunDir.value.copy(this.layer.sunDir);
      mat.uniforms.uSunColor.value.set(S.sunColor);
      mat.uniforms.uShallow.value.set(S.shallow);
      mat.uniforms.uMid.value.set(S.mid);
      mat.uniforms.uDeep.value.set(S.deep);
      mat.uniforms.uFoam.value.set(S.foam);
      mat.uniforms.uSkyZenith.value.set(S.skyZenith);
      mat.uniforms.uSkyHorizon.value.set(S.skyHorizon);
      this._oceanMat = mat;
      this.layer.updatables.push((dt) => { mat.uniforms.uTime.value += dt; });
      if (wm.oasisMesh) this._hide(wm.oasisMesh);
    }

    this._buildSeaStacks(root);
    this._buildHoodoos(root);
    this._restyleProps();

    // Savanna improvement plan (primitives, to be swapped for final assets later):
    // landmarks (GLB since Hito 55: Bing house + totem + lamps, Atia altar, Baruk house, surf board, canoe), richer oasis,
    // rock mounds by the trails, desert flora, golden horizon haze and pollen.
    try {
      this.landmarks = new SavannaGenshinLandmarks(this);
      this.oasisPlus = new SavannaGenshinOasis(this);
      this.nature = new SavannaGenshinNature(this);
      this._colliders.push(...this.landmarks.colliders, ...this.nature.colliders);
      this.layer.updatables.push((dt, pp) => {
        this.landmarks.update(dt);
        this.oasisPlus.update(dt);
        this.nature.update(dt, pp);
      });
    } catch (err) {
      console.error('[SavannaGenshinArt] Savanna improvements failed:', err);
    }
    if (zone.landmarksManager && zone.landmarksManager.group) toonifyGroup(zone.landmarksManager.group, { brighten: 1.05 });
    if (zone.vegetationManager && zone.vegetationManager.group) this._hide(zone.vegetationManager.group);
    if (zone.atmosphereManager && zone.atmosphereManager.skyDome) this._hide(zone.atmosphereManager.skyDome);
    if (zone.distantIslands && zone.distantIslands.setHorizonColor) zone.distantIslands.setHorizonColor(profile.fog.color);

    window.savannaGenshinArt = this;
    console.log('[SavannaGenshinArt] ✨ Isla de la Sabana — dirección de arte Genshin lista.');
  }

  _hide(obj) {
    if (!obj) return;
    this._hidden.push({ obj, visible: obj.visible });
    obj.visible = false;
  }

  _buildSeaStacks(root) {
    const rockMat = islandRockMaterial(null, {
      base: 0xd39a5c, shadow: 0x7d6a8a, top: 0xc6a443, topAmount: 1.0, strata: 0.7,
      strataColors: [0xb5653a, 0xd99a55, 0xedc98c], streaks: 1.2
    });
    const rng = createSeededRandom(808);
    for (const st of SEA_STACKS) {
      const geo = new THREE.CylinderGeometry(st.r * 0.82, st.r * 1.12, st.h + 6, 11, 8, false);
      geo.translate(0, (st.h + 6) * 0.5 - 6, 0);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (y < st.h - 0.5) {
          const a = Math.atan2(z, x);
          const k = 1.0 + Math.sin(y * 0.55) * 0.05 + Math.cos(a * 4.0 + st.rot) * 0.08 + (rng() - 0.5) * 0.05;
          pos.setX(i, x * k);
          pos.setZ(i, z * k);
        }
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, rockMat);
      mesh.position.set(st.x, 0, st.z);
      mesh.rotation.y = st.rot;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = 'SavannaSeaStack';
      root.add(mesh);
    }
  }

  /**
   * Desert pinnacles / fairy chimneys (Axie savanna reference) built from the game's own
   * savanna rocks (assets/nature/rocks/Rock_sabana1-5, 200–700 tris): the tall twin spire
   * (Rock_sabana4) and the clustered columns (5, 3, 1) are stretched vertically into 4–14 m
   * pinnacles; the round one (2) stays as boulders. Their texture is replaced by layered
   * sandstone in the Axie peach / orange palette with darker seams. Instanced per shape.
   */
  _buildHoodoos(root) {
    const rng = createSeededRandom(31415);
    const am = this.zone.assetManager;
    const sandstone = {
      base: 0xe9a466, shadow: 0x8a6a7a, top: 0xf4c486, topAmount: 0.55, strata: 1.0,
      strataColors: [0xb5643a, 0xe39a5c, 0xf4bb80], streaks: 0.8
    };
    // key, min/max height (m), vertical stretch range, role
    const kinds = [
      { key: 'rock_savanna_4', h: [7, 14], st: [1.15, 1.45], pinnacle: true },
      { key: 'rock_savanna_5', h: [6, 11], st: [1.1, 1.35], pinnacle: true },
      { key: 'rock_savanna_3', h: [5, 9], st: [1.15, 1.4], pinnacle: true },
      { key: 'rock_savanna_1', h: [4, 7], st: [1.1, 1.3], pinnacle: true },
      { key: 'rock_savanna_2', h: [1.4, 3.0], st: [0.85, 1.0], pinnacle: false }
    ];
    const shapes = kinds.map((k) => {
      const gltf = am && am.getRawModel ? am.getRawModel(k.key) : null;
      if (!gltf || !gltf.scene) return null;
      gltf.scene.updateMatrixWorld(true);
      let src = null;
      gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
      if (!src) return null;
      const geo = src.geometry.clone();
      geo.applyMatrix4(src.matrixWorld);
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      const sz = new THREE.Vector3(); bb.getSize(sz);
      geo.scale(1 / sz.y, 1 / sz.y, 1 / sz.y);          // unit height
      geo.computeBoundingSphere();
      return { geo, aspect: Math.max(sz.x, sz.z) / sz.y, mat: islandRockMaterial(src.material, sandstone) };
    });

    const terrain = this.zone.terrain;
    const data = this.layer.data;
    const avoid = [[OASIS.x, OASIS.z, 26], [-28, -35, 12], [62, -28.5, 10], [44.5, 49.5, 12], [2.5, -10, 8], [-8, 0, 10], [68, -30, 10], [-26, -30, 8]];
    const free = (x, z, rad) => {
      if (Math.hypot(x, z) > 132) return false;
      const y = terrain.getHeight(x, z);
      if (y < 2.6) return false;
      if (terrain.getNormal(x, z).y < 0.86) return false;
      for (const [ax, az, ar] of avoid) if (Math.hypot(x - ax, z - az) < ar + rad) return false;
      for (let a = 0; a < 6; a++) {
        const px = x + Math.cos(a) * (rad + 1.5), pz = z + Math.sin(a) * (rad + 1.5);
        if (data.sampleMask(px, pz, 1) > 0.04) return false;      // keep trails clear
      }
      return true;
    };
    const lists = kinds.map(() => []);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    this._colliders = [];
    const place = (k, x, z) => {
      const kind = kinds[k], shape = shapes[k];
      if (!shape) return false;
      const h = kind.h[0] + rng() * (kind.h[1] - kind.h[0]);
      const st = kind.st[0] + rng() * (kind.st[1] - kind.st[0]);
      const w = (h / st);                               // horizontal scale (unit-height geometry)
      const rad = shape.aspect * w * 0.5;
      if (!free(x, z, rad)) return false;
      q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.06, rng() * Math.PI * 2, (rng() - 0.5) * 0.06));
      m4.compose(new THREE.Vector3(x, terrain.getHeight(x, z) - 0.3, z), q, new THREE.Vector3(w, h, w));
      lists[k].push(m4.clone());
      if (rad > 0.9) this._colliders.push([x, z, rad * 0.8]);
      return true;
    };
    // Pinnacle groups (1–3 spires, mixed shapes) across the mesa and terraces
    let placed = 0;
    for (let tries = 0; tries < 900 && placed < 30; tries++) {
      const a = rng() * Math.PI * 2, rr = 14 + rng() * 116;
      const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        if (place(Math.floor(rng() * 4), cx + (rng() - 0.5) * 8, cz + (rng() - 0.5) * 8)) placed++;
      }
    }
    // Rounded sandstone boulders
    for (let tries = 0; tries < 600 && lists[4].length < 26; tries++) {
      const a = rng() * Math.PI * 2, rr = 10 + rng() * 122;
      place(4, Math.cos(a) * rr, Math.sin(a) * rr);
    }
    shapes.forEach((shape, k) => {
      if (!shape || !lists[k].length) return;
      const inst = new THREE.InstancedMesh(shape.geo, shape.mat, lists[k].length);
      lists[k].forEach((mm, i) => inst.setMatrixAt(i, mm));
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.name = `SavannaPinnacles_${kinds[k].key}`;
      root.add(inst);
    });
  }

  _syncColliders(active) {
    const col = this.zone.om && this.zone.om.collisions;
    if (!col || !this._colliders) return;
    if (typeof col.removeCirclesByTag === 'function') col.removeCirclesByTag('savgenshin_hoodoo_');
    if (active && typeof col.addCircle === 'function') this._colliders.forEach(([x, z, r], i) => col.addCircle(x, z, r, 'savgenshin_hoodoo_' + i));
  }

  _restyleProps() {
    const pm = this.zone.propsManager;
    if (!pm || !pm.instancedMeshes) return;
    const rockOpts = {
      base: 0xd8a56c, shadow: 0x7d6a8a, top: 0xe9cf98, topAmount: 0.5, strata: 0.75,
      strataColors: [0xb5653a, 0xd99a55, 0xedc98c]
    };
    for (const mesh of pm.instancedMeshes) {
      const n = mesh.name || '';
      if (n.startsWith('SavannaInst_Palm_') || n.startsWith('SavannaInst_Tree_')) {
        this._hide(mesh);
      } else if (n.startsWith('SavannaInst_Rock_') || n.startsWith('SavannaInst_Pebble_')) {
        restyleMeshes([mesh], (m) => islandRockMaterial(m, rockOpts));
        mesh.receiveShadow = true;
      } else if (n.startsWith('SavannaInst_Cactus_') || n.startsWith('SavannaInst_Veg_')) {
        restyleMeshes([mesh], (m) => {
          const t = stylizeFoliageMaterial(m);
          // Dry olive-golden shrubs (the source greens are too dark under the toon ramp)
          if (n.startsWith('SavannaInst_Veg_')) t.color.set(t.map ? 0xc9b25a : 0x9a9a3e);
          return t;
        });
        mesh.receiveShadow = true;
      }
    }
  }

  update(delta, playerPos) {
    if (!this.enabled) return;
    this.layer.update(delta, playerPos);
  }

  setActive(active) {
    // Legacy pieces replaced by the art pass stay hidden every time the zone activates
    if (this.enabled) this._hidden.forEach(({ obj }) => { obj.visible = false; });
    this.layer.setActive(active && this.enabled);
    // Pinnacle colliders (added after WorldMapManager clears the legacy 'savannah_' circles)
    if (active && this.enabled) setTimeout(() => { if (this.zone.isActive) this._syncColliders(true); }, 0);
    else this._syncColliders(false);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    // Al volver al aspecto antiguo, construir la hierba dorada si se difirió
    if (!enabled && this.zone.vegetationManager && typeof this.zone.vegetationManager.ensureGrass === 'function') {
      this.zone.vegetationManager.ensureGrass();
    }
    // Palmeras y árboles antiguos: no se cargaron mientras el arte Genshin estaba activo
    const pm = this.zone.propsManager;
    if (!enabled && pm && pm.deferLegacyTrees && typeof pm.ensureLegacyTrees === 'function' && !this._legacyTreesTracked) {
      this._legacyTreesTracked = true;
      pm.ensureLegacyTrees().then((meshes) => {
        (meshes || []).forEach((m) => { this._hidden.push({ obj: m, visible: true }); m.visible = !this.enabled; });
      }).catch((e) => console.warn('[SavannaGenshinArt] árboles antiguos:', e));
    }
    this._hidden.forEach(({ obj, visible }) => { obj.visible = enabled ? false : visible; });
    this.layer.root.visible = enabled && this.zone.isActive;
    const t = this.zone.terrain;
    if (t && t.mesh) t.mesh.material = enabled ? this.layer.terrainMaterial : this.layer.legacyTerrainMaterial;
    const wm = this.zone.waterManager;
    if (wm && wm.oceanMesh && wm.genshinLegacyOceanMaterial) wm.oceanMesh.material = enabled ? this._oceanMat : wm.genshinLegacyOceanMaterial;
    this.layer.setActive(enabled && this.zone.isActive);
    this._syncColliders(enabled && this.zone.isActive);
    if (!enabled && this.zone.isActive) this.zone.setLightingPreset('savanna');
  }
}
