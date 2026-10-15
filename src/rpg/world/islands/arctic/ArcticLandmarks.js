import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';
import { IslandParticles } from '../kit/IslandParticles.js';
import { ARCTIC_SITES } from './ArcticSites.js';

/**
 * ArcticLandmarks — the places of the Arctic improvement plan, built with stylised primitives
 * (placeholders until the final assets are chosen; same recipe as the Savanna landmarks):
 *   1. Casa de Pomodoro : log cabin with a snowy roof, stone lamp, campfire with fish on sticks.
 *   2. Granja helada    : 4 fenced plots with frost crops, cold frames and a scarecrow.
 *   3. Puesto de Chef Boreal : market stall (awning, fruit crates, hanging fish) + campfire with a pot.
 *   4. Cabaña del Ermitaño   : cabin + campfire at the edge of the frost valley.
 *   5. Altar de Atia    : frosted stone dais with the statue of Atia and blue-flame braziers
 *                         (replaces the frost totems, at their centre).
 * Every landmark is one vertex-coloured merged mesh (+ one glow mesh), so each costs 1–2 draws.
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
  tail.rotateZ(Math.PI / 2);
  tail.scale(1, 1, 0.35);
  tail.translate(-len * 0.58, 0, 0);
  parts.push([tail, back]);
  return parts;
}
const transformParts = (parts, m4) => parts.map(([g, c]) => [g.applyMatrix4(m4), c]);

/** Log cabin with a snowy gable roof (front = local +Z). */
function cabinParts(w, d, h, opts = {}) {
  const parts = [];
  const glow = [];
  parts.push([box(w - 0.2, h, d - 0.2, 0, h / 2, 0), C.logDark]);
  // Stacked logs on the four walls, crossing at the corners
  const n = Math.round(h / 0.32);
  for (let i = 0; i < n; i++) {
    const y = 0.16 + i * (h - 0.16) / (n - 1);
    const tone = i % 2 ? C.log : C.wood;
    parts.push([rod(0.17, [-w / 2 - 0.25, y, d / 2], [w / 2 + 0.25, y, d / 2], 6), tone]);
    parts.push([rod(0.17, [-w / 2 - 0.25, y, -d / 2], [w / 2 + 0.25, y, -d / 2], 6), tone]);
    parts.push([rod(0.17, [w / 2, y + 0.08, -d / 2 - 0.25], [w / 2, y + 0.08, d / 2 + 0.25], 6), tone]);
    parts.push([rod(0.17, [-w / 2, y + 0.08, -d / 2 - 0.25], [-w / 2, y + 0.08, d / 2 + 0.25], 6), tone]);
  }
  // Stone foundation
  parts.push([box(w + 0.5, 0.35, d + 0.5, 0, 0.0, 0), C.stoneDark]);
  // Gable roof (ridge along X), snow layer on top, gable ends filled with planks
  const a = opts.pitch ?? 0.62;
  const half = d / 2 + 0.7;
  const L = half / Math.cos(a);
  const rise = half * Math.tan(a);
  for (const s of [1, -1]) {
    const slab = box(w + 1.2, 0.2, L, 0, 0, 0);
    slab.rotateX(s * a);
    slab.translate(0, h + rise / 2 + 0.05, s * half / 2);
    parts.push([slab, C.woodDark]);
    const snow = box(w + 1.3, 0.16, L + 0.06, 0, 0, 0);
    snow.rotateX(s * a);
    snow.translate(0, h + rise / 2 + 0.22, s * half / 2);
    parts.push([snow, C.snow]);
    // Snow lip hanging over the eaves
    parts.push([rod(0.12, [-w / 2 - 0.62, h - 0.02 + 0.1, s * (half - 0.05)], [w / 2 + 0.62, h - 0.02 + 0.1, s * (half - 0.05)], 6), C.snowShade]);
  }
  const tri = new THREE.Shape();
  tri.moveTo(-d / 2 - 0.05, 0); tri.lineTo(d / 2 + 0.05, 0); tri.lineTo(0, (d / 2) * Math.tan(a) + 0.1); tri.closePath();
  for (const s of [1, -1]) {
    const gable = new THREE.ExtrudeGeometry(tri, { depth: 0.18, bevelEnabled: false });
    gable.rotateY(Math.PI / 2);
    gable.translate(s * (w / 2) - 0.09, h, 0);
    parts.push([gable, C.plank]);
  }
  // Chimney (stone) through the roof
  const chx = opts.chimneyX ?? (w / 2 - 0.9);
  parts.push([box(0.8, h + rise + 1.0, 0.8, chx, (h + rise + 1.0) / 2, -d / 4), C.stone]);
  parts.push([box(0.95, 0.18, 0.95, chx, h + rise + 1.05, -d / 4), C.stoneDark]);
  parts.push([box(0.9, 0.12, 0.9, chx, h + rise + 1.2, -d / 4), C.snow]);
  // Door, frame, step and porch posts
  parts.push([box(1.1, 2.0, 0.14, 0, 1.05, d / 2 + 0.18), C.woodDark]);
  parts.push([box(1.4, 0.16, 0.22, 0, 2.12, d / 2 + 0.2), C.plank]);
  parts.push([box(0.08, 0.08, 0.08, 0.38, 1.05, d / 2 + 0.28), C.glow]);
  parts.push([box(2.2, 0.16, 1.0, 0, 0.08, d / 2 + 0.7), C.plank]);
  // Windows (glowing) with snowy sills
  const glowWin = [];
  for (const sx of [-1, 1]) {
    glowWin.push([box(0.75, 0.7, 0.08, sx * (w / 2 - 1.0), 1.5, d / 2 + 0.2), C.glow]);
    parts.push([box(0.95, 0.1, 0.24, sx * (w / 2 - 1.0), 1.1, d / 2 + 0.24), C.snow]);
    parts.push([box(0.08, 0.7, 0.1, sx * (w / 2 - 1.0), 1.5, d / 2 + 0.24), C.woodDark]);
    glowWin.push([box(0.08, 0.7, 0.75, sx * (w / 2 + 0.19), 1.5, 0.2), C.glow]);
  }
  glow.push(...glowWin);
  // Snow drifts piled against the walls
  for (const [sx, sz, r] of [[-w / 2 - 0.3, d / 2 - 0.4, 0.7], [w / 2 + 0.35, -d / 2 + 0.5, 0.8], [-w / 2 - 0.2, -d / 2 + 0.2, 0.6], [w / 2 + 0.2, d / 2 + 0.1, 0.5]]) {
    parts.push([ball(r, sx, 0.05, sz, 1.3, 0.45, 1.0, 1), C.snow]);
  }
  // Firewood stack by the side wall
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    parts.push([rod(0.12, [-w / 2 - 0.55, 0.14 + row * 0.23, -0.9 + col * 0.26 + (row % 2) * 0.12], [-w / 2 - 0.55, 0.14 + row * 0.23, -0.9 + col * 0.26 + (row % 2) * 0.12].map((v, k) => (k === 0 ? v - 0.9 : v)), 6), i % 2 ? C.log : C.wood]);
  }
  return { parts, glow };
}

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

/** Market stall with a striped awning, fruit crates and hanging fish (front = local +Z). */
function stallParts() {
  const parts = [];
  const W = 4.2, D = 2.2, H = 2.7;
  for (const [px, pz] of [[-W / 2, D / 2], [W / 2, D / 2], [-W / 2, -D / 2], [W / 2, -D / 2]]) parts.push([cyl(0.08, 0.1, pz > 0 ? H : H + 0.5, 6, px, (pz > 0 ? H : H + 0.5) / 2, pz), C.wood]);
  // Counter + shelf
  parts.push([box(W - 0.2, 0.95, 0.8, 0, 0.48, D / 2 - 0.3), C.plank]);
  parts.push([box(W, 0.1, 0.95, 0, 0.98, D / 2 - 0.3), C.woodDark]);
  parts.push([box(W - 0.3, 0.08, 0.5, 0, 1.4, -D / 2 + 0.3), C.woodDark]);
  // Striped awning (sloping to the front), snow on its back half
  const nS = 7;
  for (let i = 0; i < nS; i++) {
    const sw = (W + 0.6) / nS;
    const s = box(sw, 0.06, D + 1.0, -W / 2 - 0.3 + sw * (i + 0.5), 0, 0);
    s.rotateX(0.22);
    s.translate(0, H + 0.25, 0.15);
    parts.push([s, i % 2 ? C.clothW : C.clothR]);
  }
  const awnSnow = box(W + 0.5, 0.08, 1.2, 0, 0, -0.5);
  awnSnow.rotateX(0.22);
  awnSnow.translate(0, H + 0.36, 0.15);
  parts.push([awnSnow, C.snow]);
  // Scalloped valance along the front edge
  for (let i = 0; i < 9; i++) parts.push([ball(0.22, -W / 2 - 0.1 + i * ((W + 0.2) / 8), H - 0.05, D / 2 + 0.66, 1, 0.55, 0.25, 0), i % 2 ? C.clothW : C.clothR]);
  // Fruit crates on the counter and on the ground
  const crate = (cx, cy, cz, fruit, n = 6) => {
    parts.push([box(0.8, 0.32, 0.55, cx, cy + 0.16, cz), C.wood]);
    for (let i = 0; i < n; i++) {
      const fx = cx - 0.27 + (i % 3) * 0.27, fz = cz - 0.12 + Math.floor(i / 3) * 0.24;
      parts.push([ball(0.12, fx, cy + 0.36, fz, 1, 1, 1, 1), fruit]);
    }
  };
  crate(-1.35, 1.03, D / 2 - 0.3, C.apple);
  crate(-0.4, 1.03, D / 2 - 0.3, C.pear);
  crate(0.55, 1.03, D / 2 - 0.3, C.orange);
  crate(1.5, 1.03, D / 2 - 0.3, C.berry, 6);
  crate(W / 2 + 0.6, 0, D / 2 + 0.4, C.apple);
  crate(W / 2 + 0.6, 0.34, D / 2 + 0.4, C.berry);
  crate(-W / 2 - 0.65, 0, D / 2 + 0.2, C.orange);
  // Fish laid on ice in a tray on the counter end + hanging from the front beam
  parts.push([rod(0.06, [-W / 2, H - 0.25, D / 2], [W / 2, H - 0.25, D / 2], 6), C.woodDark]);
  for (let i = 0; i < 5; i++) {
    const x = -1.6 + i * 0.8;
    parts.push([rod(0.01, [x, H - 0.25, D / 2], [x, H - 0.62, D / 2], 3), C.rope]);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, H - 0.92, D / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3 * (i % 2 ? 1 : -1), Math.PI / 2)), new THREE.Vector3(1, 1, 1));
    parts.push(...transformParts(fishParts(0.55, i % 2 ? C.fish : C.fishGold), m));
  }
  // Barrel of snow-packed fish by the side
  parts.push([cyl(0.38, 0.34, 0.75, 10, -W / 2 - 0.55, 0.38, -0.5), C.wood]);
  parts.push([cyl(0.35, 0.35, 0.06, 10, -W / 2 - 0.55, 0.77, -0.5), C.snow]);
  // Sign board
  parts.push([box(1.5, 0.45, 0.06, 0, H + 0.95, -D / 2 - 0.05), C.plank]);
  parts.push([rod(0.03, [-0.55, H + 0.6, -D / 2 - 0.05], [-0.55, H + 0.95, -D / 2 - 0.05], 3), C.woodDark]);
  parts.push([rod(0.03, [0.55, H + 0.6, -D / 2 - 0.05], [0.55, H + 0.95, -D / 2 - 0.05], 3), C.woodDark]);
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
    this._buildAltar();
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

  // 1. Pomodoro: log cabin + stone lamp + campfire with fish on sticks (outside the greenhouse)
  _buildPomodoro() {
    const S = ARCTIC_SITES.pomodoro;
    const cp = cabinParts(5.6, 4.4, 2.9, { chimneyX: 1.8 });
    this._place(cp.parts, cp.glow, S.house.x, S.house.z, S.house.yaw, 'Arctic_PomodoroHouse', 3.0, 0.1);
    this.zone.addCollider(S.house.x, S.house.z, 3.1);
    // Planter boxes of frost herbs under the front windows (Pomodoro is a botanist)
    const planters = [];
    for (const sx of [-1, 1]) {
      planters.push([box(1.1, 0.35, 0.35, sx * 1.8, 0.75, 2.62), C.wood]);
      for (let i = 0; i < 4; i++) planters.push([ball(0.13, sx * 1.8 - 0.4 + i * 0.27, 1.0, 2.62, 1, 1.2, 1, 0), i % 2 ? C.cabbage : C.cabbageB]);
    }
    this._place(planters, null, S.house.x, S.house.z, S.house.yaw, 'Arctic_PomodoroPlanters', 3.0, 0.1);
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
    const cx = (F.x0 + F.x1) / 2, cz = (F.z0 + F.z1) / 2;
    const parts = [];
    const glass = [];
    const loc = (x, z) => [x - cx, z - cz];
    const gy = (x, z) => this.height(x, z) - this.baseY;
    this.baseY = this._groundMin(cx, cz, 6.5);
    // Plots: raised soil beds with furrows and crop rows
    F.plots.forEach(([px, pz], k) => {
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
    // Scarecrow between the plots
    const [sx, sz] = loc(F.scarecrow.x, F.scarecrow.z);
    const sy = gy(F.scarecrow.x, F.scarecrow.z);
    scarecrowParts().forEach(([g, c]) => parts.push([g.rotateY(-Math.PI / 2).translate(sx, sy, sz), c]));
    this.zone.addCollider(F.scarecrow.x, F.scarecrow.z, 0.45);
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

  // 3. Chef Boreal: market stall + campfire with a cooking pot on the lake's east shore
  _buildChef() {
    const S = ARCTIC_SITES.chef;
    this._place(stallParts(), null, S.stall.x, S.stall.z, S.stall.yaw, 'Arctic_ChefStall', 2.4, 0.08);
    for (const [lx, lz, r] of [[-1.3, 0.1, 1.5], [1.3, 0.1, 1.5], [2.7, 1.3, 0.6], [-2.75, 1.0, 0.55], [-2.75, -0.5, 0.45]]) {
      const [wx, wz] = this._toWorld(S.stall.x, S.stall.z, S.stall.yaw, lx, lz);
      this.zone.addCollider(wx, wz, r);
    }
    const fire = this._place(campfireParts({ pot: true }), null, S.fire.x, S.fire.z, -0.6, 'Arctic_ChefCampfire', 1.0, 0.02);
    this._fireFx(fire, S.fire.x, S.fire.z, { intensity: 6, range: 14, h: 0.7, r: 0.3 });
    this.zone.addCollider(S.fire.x, S.fire.z, 1.0);
    // Lantern post by the stall
    const lp = lampParts();
    const [lx, lz] = this._toWorld(S.stall.x, S.stall.z, S.stall.yaw, 3.3, -0.9);
    this._place(lp.parts, lp.glow, lx, lz, S.stall.yaw, 'Arctic_ChefLamp', 0.5, 0.02);
    this.zone.addCollider(lx, lz, 0.55);
  }

  // 4. Glacial Hermit: cabin + campfire at the edge of the frost valley (pond: ArcticIce)
  _buildHermit() {
    const S = ARCTIC_SITES.hermit;
    const cp = cabinParts(4.8, 4.0, 2.6, { chimneyX: -1.5, pitch: 0.7 });
    // Hermit's touches: hanging ice-crystal charms and a rune stone by the door
    cp.glow.push([new THREE.OctahedronGeometry(0.16, 0).scale(1, 1.8, 1).translate(-0.9, 2.2, 2.6), C.iceGlow]);
    cp.glow.push([new THREE.OctahedronGeometry(0.16, 0).scale(1, 1.8, 1).translate(0.9, 2.2, 2.6), C.iceGlow]);
    cp.parts.push([rod(0.01, [-0.9, 2.75, 2.6], [-0.9, 2.45, 2.6], 3), C.rope]);
    cp.parts.push([rod(0.01, [0.9, 2.75, 2.6], [0.9, 2.45, 2.6], 3), C.rope]);
    cp.parts.push([ball(0.45, 2.2, 0.3, 2.6, 0.8, 1.4, 0.6, 0), C.stoneDark]);
    cp.glow.push([box(0.06, 0.5, 0.06, 2.2, 0.55, 2.88), C.iceGlow]);
    this._place(cp.parts, cp.glow, S.cabin.x, S.cabin.z, S.cabin.yaw, 'Arctic_HermitCabin', 2.8, 0.1);
    this.zone.addCollider(S.cabin.x, S.cabin.z, 2.9);
    const fire = this._place(campfireParts({ fish: false }), null, S.fire.x, S.fire.z, 1.2, 'Arctic_HermitCampfire', 1.0, 0.02);
    this._fireFx(fire, S.fire.x, S.fire.z, { intensity: 5.5, range: 13 });
    this.zone.addCollider(S.fire.x, S.fire.z, 1.0);
    // Two log seats
    const seats = [[rod(0.2, [-1.6, 0.18, -0.8], [-1.6, 0.18, 0.8], 8), C.log], [rod(0.2, [0.9, 0.18, 1.5], [-0.5, 0.18, 1.8], 8), C.logDark]];
    this._place(seats, null, S.fire.x, S.fire.z, 1.2, 'Arctic_HermitSeats', 1.5, 0.02);
  }

  // 5. Altar de Atia: frosted stone dais, statue of Atia (sprout + halo), blue-flame braziers
  _buildAltar() {
    const A = ARCTIC_SITES.altar;
    const parts = [];
    const glow = [];
    const stA = 0x6f7f98, stB = 0x8796ae;   // grey-blue frosted stone (darker than the snow around it)
    parts.push([cyl(4.35, 4.55, 0.45, 8, 0, 0.22, 0), stA]);
    parts.push([cyl(4.25, 4.35, 0.08, 8, 0, 0.48, 0), C.snowShade]);
    parts.push([cyl(3.3, 3.45, 0.4, 8, 0, 0.66, 0), stB]);
    parts.push([cyl(3.2, 3.3, 0.07, 8, 0, 0.89, 0), C.snow]);
    parts.push([cyl(2.1, 2.2, 0.38, 8, 0, 1.06, 0), stA]);
    parts.push([cyl(2.0, 2.1, 0.06, 8, 0, 1.27, 0), C.snow]);
    // Steps on the front (local +Z)
    for (let i = 0; i < 3; i++) parts.push([box(1.8, 0.2, 0.6, 0, 0.1 + i * 0.22, 4.55 - i * 0.55), i % 2 ? stB : stA]);
    // Pedestal
    parts.push([box(1.5, 0.9, 1.5, 0, 1.7, 0), stB]);
    parts.push([box(1.75, 0.16, 1.75, 0, 2.22, 0), stA]);
    parts.push([box(1.6, 0.06, 1.6, 0, 2.33, 0), C.snow]);
    // Statue of Atia: robed figure holding a sapling, leaf crown (frosted pale stone)
    const statue = 0x9fb0c8;
    const robe = [[0.0, 0], [0.62, 0], [0.58, 0.4], [0.46, 1.1], [0.36, 1.7], [0.3, 2.05], [0.18, 2.2], [0.0, 2.22]].map(([r, y]) => new THREE.Vector2(r, y));
    parts.push([new THREE.LatheGeometry(robe, 10).translate(0, 2.3, 0), statue]);
    parts.push([ball(0.3, 0, 4.74, 0, 1, 1, 1, 1), statue]);
    parts.push([new THREE.CapsuleGeometry(0.11, 0.55, 3, 6).rotateX(Math.PI / 2.4).translate(-0.22, 3.67, 0.3), statue]);
    parts.push([new THREE.CapsuleGeometry(0.11, 0.55, 3, 6).rotateX(Math.PI / 2.4).translate(0.22, 3.67, 0.3), statue]);
    parts.push([cyl(0.04, 0.06, 0.6, 5, 0, 4.07, 0.62), C.woodDark]);
    // Snow resting on the shoulders and head
    parts.push([ball(0.36, 0, 4.36, 0, 1.1, 0.25, 0.8, 1), C.snow]);
    parts.push([ball(0.22, 0, 4.98, 0, 1.1, 0.35, 1.0, 1), C.snow]);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      glow.push([new THREE.OctahedronGeometry(0.14, 0).scale(1, 0.5, 1.6).rotateY(a).translate(Math.sin(a) * 0.14, 4.42, 0.62 + Math.cos(a) * 0.14), C.spirit]);
      parts.push([new THREE.ConeGeometry(0.07, 0.3, 4).translate(Math.sin(a) * 0.24, 5.07, Math.cos(a) * 0.24), C.frost]);
    }
    // Halo + glyph rings (icy blue)
    glow.push([new THREE.TorusGeometry(0.62, 0.05, 6, 24).translate(0, 4.77, -0.32), C.iceGlow]);
    glow.push([new THREE.TorusGeometry(2.75, 0.035, 4, 40).rotateX(Math.PI / 2).translate(0, 0.94, 0), C.iceGlow]);
    glow.push([new THREE.TorusGeometry(3.9, 0.03, 4, 48).rotateX(Math.PI / 2).translate(0, 0.53, 0), 0x5fb8ff]);
    // Four braziers on the corners of the middle tier (blue flames)
    const braziers = [[-2.55, 1.9], [2.55, 1.9], [-2.55, -1.9], [2.55, -1.9]];
    for (const [bx, bz] of braziers) {
      parts.push([cyl(0.16, 0.26, 1.0, 8, bx, 1.35, bz), stA]);
      parts.push([cyl(0.5, 0.3, 0.34, 8, bx, 2.0, bz), stA]);
      parts.push([new THREE.TorusGeometry(0.48, 0.05, 4, 12).rotateX(Math.PI / 2).translate(bx, 2.17, bz), C.snowShade]);
    }
    // Frosted crystal shards on the outer tier (memory of the old totems)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (Math.cos(a) > 0.9) continue;
      glow.push([new THREE.OctahedronGeometry(0.22, 0).scale(0.8, 2.4, 0.8).rotateZ(0.2).translate(Math.sin(a) * 3.85, 0.95, Math.cos(a) * 3.85), C.iceGlow]);
    }
    const g = this._place(parts, glow, A.x, A.z, A.face, 'Arctic_AtiaAltar', 4.2, 0.18);
    this.zone.addCollider(A.x, A.z, 3.7);
    for (const [bx, bz] of braziers) {
      this._fireFx(g, A.x, A.z, { blue: true, ox: bx, oz: bz, oy: 2.05, r: 0.28, h: 0.75, light: false, smoke: false });
    }
    const light = new THREE.PointLight(0x7fd4ff, 3.0, 16, 2);
    light.position.set(0, 2.6, 3.4);
    g.add(light);
    this.lights.push({ light, base: 3.0 });
    // Floating snow-spirit sparkles around the altar
    const mist = new IslandParticles(this.root, { mode: 'sparkle', count: 120, velocity: [0.05, 0.12, 0.05], size: 3.0, colorA: 0xbfefff, colorB: 0xffffff, intensity: 1.2, opacity: 0.8, sway: 0.5, box: [22, 6, 22] });
    const c = new THREE.Vector3(A.x, g.position.y + 3, A.z);
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
