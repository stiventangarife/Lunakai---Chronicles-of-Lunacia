import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';
import { IslandParticles } from '../kit/IslandParticles.js';
import { ARCTIC_SITES } from './ArcticSites.js';
import { placeIslandProps } from '../kit/IslandProps.js';

/**
 * ArcticLandmarks — the places of the Arctic improvement plan. Hito 56: GLB models (islands/kit/IslandProps.js)
 * where there were primitive buildings; the small pieces are still stylised primitives:
 *   1. Casa de Pomodoro : house.glb (the Forest house) + totem.glb at the entrance, stone lamp, campfire with fish.
 *   2. Granja helada    : 4 fenced plots with frost crops, cold frames and a scarecrow.
 *   3. Tienda del Chef Boreal : shop.glb (the Forest shop) + flag.glb, campfire with a pot and a lantern.
 *   4. Casa del Ermitaño : house.glb + campfire with log seats at the edge of the frost valley.
 *   5. Valle de la Escarcha Eterna : totem_ice.glb where the frost chimeras patrol (no more primitive altar).
 *   6. Altar de Atia    : altar_atia.glb in a new clearing beside the path from the beach, with snow sparkles.
 *   7. Entrada          : flag.glb beside the path at the boat arrival.
 * The Boreal Cooking Camp house (house.glb + flag.glb) is built by ArcticIsland.
 * Primitive pieces are one vertex-coloured merged mesh (+ one glow mesh), so each costs 1–2 draws.
 */
const C = {
  log: 0x9a6a42, logDark: 0x6e4a2c, wood: 0x8a5a36, woodDark: 0x5a3a22, plank: 0xb48552,
  snow: 0xf6faff, snowShade: 0xd8e6f6, stone: 0xa3afc0, stoneDark: 0x77849a, frost: 0xd2e2f2,
  glow: 0xffc46a, ember: 0xff7a2a, iceGlow: 0x8fe4ff, spirit: 0xa8f5dc,
  clothR: 0xc8433a, clothW: 0xf3eee2, clothB: 0x3f78b8, rope: 0xc9a46a, straw: 0xd9b866,
  soil: 0x5e4636, soilDark: 0x463428, cabbage: 0xa9cbe0, cabbageB: 0xb6a8e2, kale: 0x8fb6cc,
  carrot: 0xf08a3a, berry: 0x5a7fe0, apple: 0xd8473a, pear: 0xe8c64a, orange: 0xf29a38,
  fish: 0x7f9fc2, fishBack: 0x4f6f96, fishBelly: 0xe6eef6, fishGold: 0xf0a040, pot: 0x3a3f48, stew: 0xd9824a
};

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getSoftToonRamp(), ...opts });
}

/** Bakes [geometry, color] parts into one vertex-coloured geometry. */
export function bakeParts(parts) {
  const geos = parts.map(([g, color]) => {
    let geo = g.index ? g.toNonIndexed() : g;
    if (geo.attributes.normal === undefined) geo.computeVertexNormals();
    const keep = new THREE.BufferGeometry();
    keep.setAttribute('position', geo.attributes.position);
    keep.setAttribute('normal', geo.attributes.normal);
    const n = geo.attributes.position.count;
    const col = new THREE.Color(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    keep.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return keep;
  });
  const merged = mergeGeometries(geos, false);
  merged.computeBoundingSphere();
  return merged;
}

const box = (w, h, d, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const cyl = (rt, rb, h, seg, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); return g; };
const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1, d = 0) => { const g = new THREE.IcosahedronGeometry(r, d); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
/** Cylinder from point a to point b (sticks, rails, beams). */
function rod(r, a, b, seg = 5) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyQuaternion(q);
  g.translate(va.x, va.y, va.z);
  return g;
}

/** Small fish along local +X (head at +X), centred at the origin. */
function fishParts(len = 0.5, body = C.fish, back = C.fishBack) {
  const parts = [];
  parts.push([ball(1, 0, 0, 0, len * 0.5, len * 0.2, len * 0.13, 1), body]);
  parts.push([ball(1, 0.02 * len, len * 0.06, 0, len * 0.4, len * 0.12, len * 0.1, 1), back]);
  parts.push([ball(1, 0, -len * 0.07, 0, len * 0.36, len * 0.1, len * 0.1, 1), C.fishBelly]);
  const tail = new THREE.ConeGeometry(len * 0.17, len * 0.3, 4);
  tail.rotateZ(-Math.PI / 2); // punta hacia el cuerpo, aleta abierta hacia atrás
  tail.scale(1, 1, 0.35);
  tail.translate(-len * 0.58, 0, 0);
  parts.push([tail, back]);
  return parts;
}
const transformParts = (parts, m4) => parts.map(([g, c]) => [g.applyMatrix4(m4), c]);

/** Snowy stone lamp (toro-like) with a warm lantern. */
function lampParts() {
  const parts = [
    [box(0.95, 0.25, 0.95, 0, 0.12, 0), C.stoneDark],
    [cyl(0.2, 0.27, 1.15, 8, 0, 0.82, 0), C.stone],
    [box(0.78, 0.14, 0.78, 0, 1.47, 0), C.stoneDark],
    [box(0.64, 0.08, 0.64, 0, 2.06, 0), C.stoneDark]
  ];
  const cap = new THREE.ConeGeometry(0.66, 0.46, 4, 1);
  cap.rotateY(Math.PI / 4);
  cap.translate(0, 2.33, 0);
  parts.push([cap, C.stoneDark]);
  const capSnow = new THREE.ConeGeometry(0.6, 0.36, 4, 1);
  capSnow.rotateY(Math.PI / 4);
  capSnow.translate(0, 2.44, 0);
  parts.push([capSnow, C.snow]);
  parts.push([box(0.7, 0.06, 0.7, 0, 1.56, 0), C.snow]);
  for (const [px, pz] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) parts.push([box(0.09, 0.5, 0.09, px, 1.79, pz), C.stone]);
  const glow = [[box(0.48, 0.46, 0.48, 0, 1.79, 0), C.glow]];
  return { parts, glow };
}

/** Campfire: stone ring + crossed logs (+ fish on sticks / a pot on a tripod). */
function campfireParts(opts = {}) {
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    parts.push([ball(0.22, Math.cos(a) * 0.78, 0.08, Math.sin(a) * 0.78, 1.2, 0.7, 1.0, 0), i % 2 ? C.stone : C.stoneDark]);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts.push([rod(0.08, [Math.cos(a) * 0.55, 0.05, Math.sin(a) * 0.55], [Math.cos(a) * -0.1, 0.4, Math.sin(a) * -0.1], 5), i % 2 ? C.log : C.logDark]);
  }
  parts.push([cyl(0.5, 0.55, 0.06, 10, 0, 0.03, 0), 0x2a2420]);   // ash bed
  if (opts.fish) {
    // Sticks driven into the snow, leaning over the fire, each with a fish
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.25;
      const base = [Math.cos(a) * 1.15, -0.05, Math.sin(a) * 1.15];
      const tip = [Math.cos(a) * 0.32, 1.25, Math.sin(a) * 0.32];
      parts.push([rod(0.025, base, tip, 4), C.woodDark]);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(base[0] * 0.4 + tip[0] * 0.6, base[1] * 0.4 + tip[1] * 0.6 + 0.02, base[2] * 0.4 + tip[2] * 0.6),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, -1.15)),
        new THREE.Vector3(1, 1, 1));
      parts.push(...transformParts(fishParts(0.42, i % 2 ? C.fish : C.fishGold, C.fishBack), m));
    }
    // A log to sit on
    parts.push([rod(0.2, [-1.9, 0.18, -0.6], [-1.6, 0.18, 0.9], 8), C.log]);
  }
  if (opts.pot) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      parts.push([rod(0.035, [Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95], [0, 1.75, 0], 4), C.woodDark]);
    }
    parts.push([rod(0.012, [0, 1.75, 0], [0, 1.25, 0], 3), 0x2a2a2a]);
    parts.push([ball(0.42, 0, 0.98, 0, 1.0, 0.75, 1.0, 1), C.pot]);
    parts.push([new THREE.TorusGeometry(0.36, 0.04, 4, 14).rotateX(Math.PI / 2).translate(0, 1.22, 0), C.pot]);
    parts.push([cyl(0.33, 0.33, 0.04, 12, 0, 1.2, 0), C.stew]);
    parts.push([rod(0.03, [0.1, 1.15, 0], [0.55, 1.75, 0.2], 4), C.wood]);           // ladle
    parts.push([rod(0.2, [-1.9, 0.18, 0.7], [-1.7, 0.18, -0.8], 8), C.log]);
    parts.push([box(0.5, 0.5, 0.5, 1.6, 0.25, -1.1, 0.4), C.plank]);                     // crate of stock
  }
  return parts;
}

/** Scarecrow (front = local +Z). */
function scarecrowParts() {
  return [
    [cyl(0.06, 0.07, 2.4, 5, 0, 1.2, 0), C.woodDark],
    [rod(0.05, [-0.9, 1.75, 0], [0.9, 1.75, 0], 5), C.woodDark],
    [cyl(0.32, 0.45, 0.95, 8, 0, 1.45, 0), C.clothB],
    [rod(0.12, [-0.85, 1.75, 0], [0.85, 1.75, 0], 6), C.clothB],
    [ball(0.13, -0.95, 1.72, 0, 1, 1, 1, 0), C.straw],
    [ball(0.13, 0.95, 1.72, 0, 1, 1, 1, 0), C.straw],
    [ball(0.27, 0, 2.25, 0, 1, 1.05, 1, 1), C.straw],
    [new THREE.TorusGeometry(0.22, 0.07, 5, 12).rotateX(Math.PI / 2).translate(0, 1.98, 0), C.clothR],
    [cyl(0.42, 0.42, 0.05, 12, 0, 2.47, 0), C.woodDark],
    [cyl(0.15, 0.22, 0.35, 10, 0, 2.66, 0), C.woodDark],
    [cyl(0.4, 0.4, 0.04, 12, 0, 2.51, 0), C.snow],
    [box(0.07, 0.07, 0.04, -0.09, 2.3, 0.25), 0x222222],
    [box(0.07, 0.07, 0.04, 0.09, 2.3, 0.25), 0x222222]
  ];
}

export class ArcticLandmarks {
  /**
   * @param {object} zone   GrandIslandZone (group, updatables, addCollider)
   * @param {object} ctx    { height(x,z), time:{value} }
   */
  constructor(zone, ctx) {
    this.zone = zone;
    this.height = ctx.height;
    this.time = ctx.time;
    this.root = new THREE.Group();
    this.root.name = 'ArcticLandmarks';
    zone.group.add(this.root);
    this.flames = [];
    this.lights = [];
    this.solidMat = toon(0xffffff, { vertexColors: true });
    this.solidMat.name = 'ArcticLandmarkToon';
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.glowMat.color.setScalar(1.35);
    this.glowMat.name = 'ArcticLandmarkGlow';
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false, transparent: true, opacity: 0.92 });
    this.blueFlameMat = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, toneMapped: false, transparent: true, opacity: 0.9 });

    this._buildPomodoro();
    this._buildFarm();
    this._buildChef();
    this._buildHermit();
    this._buildModels();
    this._buildAtiaSparkles();
    zone.updatables.push((dt) => this.update(dt));
  }

  /** Lowest ground under a footprint (no floating corners on gentle slopes). */
  _groundMin(x, z, r) {
    let y = this.height(x, z);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      y = Math.min(y, this.height(x + Math.cos(a) * r, z + Math.sin(a) * r));
    }
    return y;
  }

  _place(parts, glow, x, z, yaw, name, footR = 0.5, sink = 0.05) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, this._groundMin(x, z, footR) - sink, z);
    g.rotation.y = yaw;
    const solid = new THREE.Mesh(bakeParts(parts), this.solidMat);
    solid.castShadow = true;
    solid.receiveShadow = true;
    g.add(solid);
    if (glow && glow.length) g.add(new THREE.Mesh(bakeParts(glow), this.glowMat));
    this.root.add(g);
    return g;
  }

  _toWorld(x, z, yaw, lx, lz) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [x + lx * c + lz * s, z - lx * s + lz * c];
  }

  /** Flames + warm light + smoke column for a campfire group. */
  _fireFx(g, x, z, opts = {}) {
    const mat = opts.blue ? this.blueFlameMat : this.flameMat;
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(opts.r ?? 0.36, opts.h ?? 0.95, 7), mat);
    f1.position.set(opts.ox ?? 0, (opts.oy ?? 0) + (opts.h ?? 0.95) / 2 + 0.12, opts.oz ?? 0);
    g.add(f1);
    this.flames.push(f1);
    const f2 = new THREE.Mesh(new THREE.ConeGeometry((opts.r ?? 0.36) * 0.6, (opts.h ?? 0.95) * 0.7, 6), new THREE.MeshBasicMaterial({ color: opts.blue ? 0xe8fbff : 0xffe08a, toneMapped: false }));
    f2.position.copy(f1.position).add(new THREE.Vector3(0.05, -0.12, 0.04));
    g.add(f2);
    this.flames.push(f2);
    if (opts.light !== false) {
      const light = new THREE.PointLight(opts.blue ? 0x7fd4ff : 0xffa04a, opts.intensity ?? 6, opts.range ?? 14, 2);
      light.position.set(opts.lx ?? 0, (opts.ly ?? 1.4), opts.lz ?? 0);
      g.add(light);
      this.lights.push({ light, base: opts.intensity ?? 6 });
    }
    if (opts.smoke !== false) {
      const smoke = new IslandParticles(this.root, { mode: 'sand', count: 40, seed: Math.round(Math.abs(x * 31 + z * 17)) + 7, velocity: [0.12, 1.0, 0.05], size: 8, colorA: 0xe8eef6, colorB: 0xcfd8e4, opacity: 0.32, sway: 0.25, box: [3, 9, 3], additive: false });
      const c = new THREE.Vector3(x, g.position.y + 3.4, z);
      this.zone.updatables.push((dt) => smoke.update(dt, c));
    }
  }

  // 1. Pomodoro: stone lamp + campfire with fish on sticks (outside the greenhouse); house and totem in _buildModels
  _buildPomodoro() {
    const S = ARCTIC_SITES.pomodoro;
    // House and totem: GLB (see _buildModels)
    const lp = lampParts();
    this._place(lp.parts, lp.glow, S.lamp.x, S.lamp.z, S.house.yaw, 'Arctic_PomodoroLamp', 0.5, 0.02);
    this.zone.addCollider(S.lamp.x, S.lamp.z, 0.55);
    const fire = this._place(campfireParts({ fish: true }), null, S.fire.x, S.fire.z, 0.3, 'Arctic_PomodoroCampfire', 1.0, 0.02);
    this._fireFx(fire, S.fire.x, S.fire.z, { intensity: 6, range: 15 });
    this.zone.addCollider(S.fire.x, S.fire.z, 1.0);
  }

  // 2. Frost farm: fenced plots with frost crops, two cold frames and a scarecrow
  _buildFarm() {
    const F = ARCTIC_SITES.farm;
    const GH = F.greenhouse;   // Hito 71b: dentro del invernadero (sin valla: la cúpula ya la cierra)
    const cx = GH ? GH.x : (F.x0 + F.x1) / 2, cz = GH ? GH.z : (F.z0 + F.z1) / 2;
    const h2 = GH ? GH.step / 2 : 0;
    const plots = GH ? [[cx - h2, cz - h2], [cx + h2, cz - h2], [cx - h2, cz + h2], [cx + h2, cz + h2]] : F.plots;
    const scare = GH ? { x: cx, z: cz } : F.scarecrow;
    const parts = [];
    const glass = [];
    const loc = (x, z) => [x - cx, z - cz];
    const gy = (x, z) => this.height(x, z) - this.baseY;
    this.baseY = this._groundMin(cx, cz, 6.5);
    // Plots: raised soil beds with furrows and crop rows
    plots.forEach(([px, pz], k) => {
      const [lx, lz] = loc(px, pz);
      const y0 = gy(px, pz);
      parts.push([box(4.6, 0.3, 4.6, lx, y0 + 0.05, lz), C.soilDark]);
      for (const s of [-1, 1]) {
        parts.push([box(4.8, 0.22, 0.16, lx, y0 + 0.12, lz + s * 2.36), C.wood]);
        parts.push([box(0.16, 0.22, 4.8, lx + s * 2.36, y0 + 0.12, lz), C.wood]);
      }
      if (k === 3) {
        // Cold frames: two wooden boxes with sloped glass lids over seedlings
        for (const s of [-1, 1]) {
          const fx = lx + s * 1.1;
          parts.push([box(1.8, 0.45, 3.8, fx, y0 + 0.42, lz), C.plank]);
          for (let i = 0; i < 6; i++) parts.push([ball(0.12, fx - 0.4 + (i % 2) * 0.8, y0 + 0.62, lz - 1.3 + Math.floor(i / 2) * 1.3, 1, 0.8, 1, 0), C.kale]);
          const lid = box(1.75, 0.04, 3.75, 0, 0, 0);
          lid.rotateZ(s * -0.14);
          lid.translate(fx, y0 + 0.78, lz);
          glass.push(lid);
          parts.push([box(1.85, 0.06, 0.08, fx, y0 + 0.72, lz - 1.9), C.woodDark]);
          parts.push([box(1.85, 0.06, 0.08, fx, y0 + 0.72, lz + 1.9), C.woodDark]);
        }
        return;
      }
      for (let r = 0; r < 4; r++) {
        const rz = lz - 1.65 + r * 1.1;
        parts.push([box(4.2, 0.16, 0.42, lx, y0 + 0.24, rz), C.soil]);
        for (let i = 0; i < 5; i++) {
          const x = lx - 1.7 + i * 0.85;
          if (k === 0) {            // frost cabbages
            parts.push([ball(0.26, x, y0 + 0.45, rz, 1, 0.75, 1, 1), (i + r) % 3 ? C.cabbage : C.cabbageB]);
            parts.push([ball(0.15, x, y0 + 0.58, rz, 1, 0.8, 1, 0), C.frost]);
          } else if (k === 1) {     // snow carrots: orange shoulders + pale leaf tufts
            parts.push([cyl(0.07, 0.09, 0.12, 6, x, y0 + 0.36, rz), C.carrot]);
            for (let t = 0; t < 3; t++) parts.push([new THREE.ConeGeometry(0.05, 0.42, 4).rotateZ((t - 1) * 0.35).translate(x + (t - 1) * 0.06, y0 + 0.6, rz), C.kale]);
          } else {                  // frost berries: small bushes with blue berries
            parts.push([ball(0.24, x, y0 + 0.5, rz, 1, 0.85, 1, 1), C.kale]);
            for (let b = 0; b < 3; b++) parts.push([ball(0.06, x + (b - 1) * 0.12, y0 + 0.66, rz + 0.17, 1, 1, 1, 0), C.berry]);
          }
        }
      }
    });
    if (!GH) {
      // Fence with snow-capped posts (opening on the west side, toward the path)
      const posts = [];
      const edge = (ax, az, bx, bz) => {
        const len = Math.hypot(bx - ax, bz - az);
        const n = Math.max(1, Math.round(len / 1.55));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          posts.push([x, z]);
        }
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n;
          const xa = ax + (bx - ax) * t0, za = az + (bz - az) * t0, xb = ax + (bx - ax) * t1, zb = az + (bz - az) * t1;
          const [la, ma] = loc(xa, za), [lb, mb] = loc(xb, zb);
          for (const h of [0.45, 0.85]) parts.push([rod(0.05, [la, gy(xa, za) + h, ma], [lb, gy(xb, zb) + h, mb], 4), C.wood]);
          parts.push([rod(0.05, [la, gy(xa, za) + 0.92, ma], [lb, gy(xb, zb) + 0.92, mb], 4), C.snow]);
        }
      };
      edge(F.x0, F.z0, F.x1, F.z0);
      edge(F.x1, F.z0, F.x1, F.z1);
      edge(F.x1, F.z1, F.x0, F.z1);
      edge(F.x0, F.z1, F.x0, F.gate.z1);
      edge(F.x0, F.gate.z0, F.x0, F.z0);
      const seen = new Set();
      for (const [x, z] of posts) {
        const key = `${x.toFixed(2)},${z.toFixed(2)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const [lx, lz] = loc(x, z);
        const y = gy(x, z);
        parts.push([box(0.16, 1.15, 0.16, lx, y + 0.5, lz), C.woodDark]);
        parts.push([box(0.2, 0.1, 0.2, lx, y + 1.12, lz), C.snow]);
        this.zone.addCollider(x, z, 0.35);
      }
      // Colliders between posts so the fence cannot be crossed (the gate stays open)
      const fill = (ax, az, bx, bz) => {
        const len = Math.hypot(bx - ax, bz - az);
        const n = Math.max(1, Math.round(len / 0.75));
        for (let i = 1; i < n; i++) this.zone.addCollider(ax + (bx - ax) * (i / n), az + (bz - az) * (i / n), 0.32);
      };
      fill(F.x0, F.z0, F.x1, F.z0); fill(F.x1, F.z0, F.x1, F.z1); fill(F.x1, F.z1, F.x0, F.z1);
      fill(F.x0, F.z1, F.x0, F.gate.z1); fill(F.x0, F.gate.z0, F.x0, F.z0);
      // Gate posts with a little arch sign + tool rack / sack by the entrance
      const [gx, gz0] = loc(F.x0, F.gate.z0), [, gz1] = loc(F.x0, F.gate.z1);
      const gyy = gy(F.x0, (F.gate.z0 + F.gate.z1) / 2);
      parts.push([rod(0.06, [gx, gyy + 1.15, gz0], [gx, gyy + 1.15, gz1], 4), C.woodDark]);
      parts.push([box(0.08, 0.38, 1.2, gx - 0.05, gyy + 1.48, (gz0 + gz1) / 2), C.plank]);
      parts.push([box(0.1, 0.06, 1.25, gx - 0.05, gyy + 1.7, (gz0 + gz1) / 2), C.snow]);
    }
    // Scarecrow between the plots
    const [sx, sz] = loc(scare.x, scare.z);
    const sy = gy(scare.x, scare.z);
    scarecrowParts().forEach(([g, c]) => parts.push([g.rotateY(-Math.PI / 2).translate(sx, sy, sz), c]));
    if (!GH) this.zone.addCollider(scare.x, scare.z, 0.45);
    const g = this._place(parts, null, cx, cz, 0, 'Arctic_FrostFarm', 0.1, 0);
    g.position.y = this.baseY;
    if (glass.length) {
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xdff6ff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false, emissive: 0x9fe8ff, emissiveIntensity: 0.08 });
      glassMat.name = 'ArcticColdFrameGlass';
      const gm = new THREE.Mesh(mergeGeometries(glass.map((x) => x.toNonIndexed()), false), glassMat);
      gm.renderOrder = 2;
      g.add(gm);
    }
  }

  // 3. Chef Boreal: campfire with a cooking pot + lantern on the lake's east shore; shop and flag in _buildModels
  _buildChef() {
    const S = ARCTIC_SITES.chef;
    // Shop and flag: GLB (see _buildModels)
    const fire = this._place(campfireParts({ pot: true }), null, S.fire.x, S.fire.z, -0.6, 'Arctic_ChefCampfire', 1.0, 0.02);
    this._fireFx(fire, S.fire.x, S.fire.z, { intensity: 6, range: 14, h: 0.7, r: 0.3 });
    this.zone.addCollider(S.fire.x, S.fire.z, 1.0);
    // Lantern post at the front corner of the shop
    const lp = lampParts();
    const [lx, lz] = this._toWorld(S.shop.x, S.shop.z, S.shop.yaw, 4.4, 4.6);
    this._place(lp.parts, lp.glow, lx, lz, S.shop.yaw, 'Arctic_ChefLamp', 0.5, 0.02);
    this.zone.addCollider(lx, lz, 0.55);
  }

  // 4. Glacial Hermit: campfire + log seats at the edge of the frost valley (pond: ArcticIce); house in _buildModels
  _buildHermit() {
    const S = ARCTIC_SITES.hermit;
    // House: GLB (see _buildModels)
    const fire = this._place(campfireParts({ fish: false }), null, S.fire.x, S.fire.z, 1.2, 'Arctic_HermitCampfire', 1.0, 0.02);
    this._fireFx(fire, S.fire.x, S.fire.z, { intensity: 5.5, range: 13 });
    this.zone.addCollider(S.fire.x, S.fire.z, 1.0);
    // Two log seats
    const seats = [[rod(0.2, [-1.6, 0.18, -0.8], [-1.6, 0.18, 0.8], 8), C.log], [rod(0.2, [0.9, 0.18, 1.5], [-0.5, 0.18, 1.8], 8), C.logDark]];
    this._place(seats, null, S.fire.x, S.fire.z, 1.2, 'Arctic_HermitSeats', 1.5, 0.02);
  }

  /** GLB pieces (Hito 56). Colliders are registered now; the models appear when loaded (shared `#islas` cache). */
  _buildModels() {
    const S = ARCTIC_SITES;
    const [tx, tz] = this._toWorld(S.pomodoro.house.x, S.pomodoro.house.z, S.pomodoro.house.yaw, -4.2, 4.2);
    const [fx, fz] = this._toWorld(S.chef.shop.x, S.chef.shop.z, S.chef.shop.yaw, -4.6, 3.6);
    const list = [
      { model: 'house', ...S.pomodoro.house, name: 'Arctic_PomodoroHouse' },
      { model: 'totem', x: tx, z: tz, yaw: S.pomodoro.house.yaw, name: 'Arctic_PomodoroTotem' },
      { model: 'shop', ...S.chef.shop, name: 'Arctic_ChefShop' },
      { model: 'flag', x: fx, z: fz, yaw: S.chef.shop.yaw, name: 'Arctic_ChefFlag' },
      { model: 'house', ...S.hermit.cabin, name: 'Arctic_HermitHouse' },
      { model: 'totem_ice', x: S.altar.x, z: S.altar.z, yaw: S.altar.face, name: 'Arctic_FrostTotem' },
      { model: 'altar', ...S.atia, name: 'Arctic_AtiaAltar' },
      { model: 'flag', ...S.entranceFlag, name: 'Arctic_EntranceFlag' }
    ];
    const props = placeIslandProps(this.root, list, { height: this.height, plinthColor: 0x8a93a3 });
    props.colliders.forEach(([x, z, r]) => this.zone.addCollider(x, z, r));
    this.ready = props.ready;
  }

  /** Floating snow-spirit sparkles around the Altar de Atia (no light: the altar texture carries its own). */
  _buildAtiaSparkles() {
    const A = ARCTIC_SITES.atia;
    const mist = new IslandParticles(this.root, { mode: 'sparkle', count: 120, velocity: [0.05, 0.12, 0.05], size: 3.0, colorA: 0xbfefff, colorB: 0xffffff, intensity: 1.2, opacity: 0.8, sway: 0.5, box: [22, 6, 22] });
    const c = new THREE.Vector3(A.x, this.height(A.x, A.z) + 3, A.z);
    this.zone.updatables.push((dt) => mist.update(dt, c));
  }

  update() {
    const t = this.time.value;
    this.flames.forEach((f, i) => {
      const k = 0.85 + Math.sin(t * 9 + i * 1.7) * 0.1 + Math.sin(t * 15.3 + i) * 0.06;
      f.scale.set(1, k, 1);
    });
    this.lights.forEach(({ light, base }, i) => {
      light.intensity = base * (0.88 + Math.sin(t * 5 + i) * 0.08 + Math.sin(t * 13.1 + i * 2.3) * 0.05);
    });
  }
}
