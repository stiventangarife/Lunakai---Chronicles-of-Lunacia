import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';
import { createSeededRandom } from '../../demo_scena/MathUtils.js';
import { crystalMaterial, crystalPrismGeometry } from '../kit/IslandMaterials.js';
import { IslandParticles } from '../kit/IslandParticles.js';

/**
 * GenesisLandmarks — the places of Genesis ("Los Jardines Reales del Origen"), built with
 * stylised primitives (placeholders until the final assets are chosen):
 *   1. Puerta del Santuario : monumental gate on the east avenue (lavender pillars, gold lintel,
 *                             crest, shimmering aurora veil you walk through), flanking walls,
 *                             braziers and a processional row of obelisks. Kotaro guards it.
 *   2. Jardín Real          : central plaza with a turquoise horned totem, a campfire, six
 *                             abstract monuments on pedestals and a pink crystal cluster.
 *   3. Cantera de cristal   : pink crystal quarry (Tripp's camp) with mining frames and a cart.
 *   4. Santuario del Origen : southern terrace with a ring of ancient columns (some broken),
 *                             fallen drums, a great arch with an aurora veil, the stepped
 *                             Throne of Origin and blue-violet braziers; the Spirit of Atia
 *                             stands in its centre.
 * One merged vertex-coloured mesh (+ one glow mesh) per landmark.
 */
export const GENESIS_SITES = {
  gate: { x: 112, z: 20, yaw: Math.PI / 2 },
  plaza: { x: 0, z: 0, half: 30 },
  quarry: { x: -60, z: -60, r: 12 },
  sanctuary: { x: 0, z: 92, r: 26, floor: 8.6 },
  npcs: {
    kotaro: { x: 104, z: 13, rotation: 1.24 },
    tripp: { x: -50, z: -50, rotation: 0.785 },
    atia: { x: 0, z: 92, rotation: Math.PI }
  }
};

const C = {
  lav: 0x9d92d8, lavLight: 0xc4b8f2, lavDark: 0x6a6098, marble: 0xe8e2f4, marbleShade: 0xc8bfe0,
  gold: 0xf2c45a, goldDark: 0xc8962e, teal: 0x2fb8b8, tealLight: 0x5fd8d0, tealDark: 0x1f7f8a,
  pink: 0xf2a6c8, orange: 0xff9a3a, wood: 0x8a6a4a, woodDark: 0x5e4630, ember: 0xff8a2a,
  glowGold: 0xffd98a, glowViolet: 0xc9a0ff, glowCyan: 0x8ff6ff, glowPink: 0xffa6e0, stone: 0x4f4a72
};

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getSoftToonRamp(), ...opts });
}

export function bakeParts(parts) {
  const geos = parts.map(([g, color]) => {
    const geo = g.index ? g.toNonIndexed() : g;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', geo.attributes.position);
    out.setAttribute('normal', geo.attributes.normal);
    const n = geo.attributes.position.count;
    const col = new THREE.Color(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    out.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return out;
  });
  const merged = mergeGeometries(geos, false);
  merged.computeBoundingSphere();
  return merged;
}

export const box = (w, h, d, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
export const cyl = (rt, rb, h, seg, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); return g; };
export const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1, d = 1) => { const g = new THREE.IcosahedronGeometry(r, d); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
export function rod(r, a, b, seg = 6) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()));
  g.translate(va.x, va.y, va.z);
  return g;
}

/** Aurora veil: vertical plane with drifting curtains of light (additive, double-sided). */
function veilMaterial(time, colA = 0x8ff6ff, colB = 0xd8a8ff) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uA: { value: new THREE.Color(colA) }, uB: { value: new THREE.Color(colB) } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uA, uB;
      varying vec2 vUv;
      void main() {
        float x = vUv.x * 6.0;
        float c1 = sin(x * 1.7 + uTime * 0.6 + sin(vUv.y * 3.0 + uTime * 0.3) * 1.5) * 0.5 + 0.5;
        float c2 = sin(x * 3.1 - uTime * 0.9 + vUv.y * 2.0) * 0.5 + 0.5;
        float curtain = pow(c1, 3.0) * 0.8 + pow(c2, 6.0) * 0.5;
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float vert = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        vec3 col = mix(uA, uB, vUv.y + 0.2 * sin(uTime * 0.4 + x));
        float a = (0.12 + curtain * 0.55) * edge * vert;
        gl_FragColor = vec4(col * a, a);
      }`
  });
  m.name = 'GenesisAuroraVeil';
  return m;
}

export class GenesisLandmarks {
  /** ctx = { height(x,z), time:{value} } */
  constructor(zone, ctx) {
    this.zone = zone;
    this.height = ctx.height;
    this.time = ctx.time;
    this.root = new THREE.Group();
    this.root.name = 'GenesisLandmarks';
    zone.group.add(this.root);
    this.solidMat = toon(0xffffff, { vertexColors: true });
    this.solidMat.name = 'GenesisLandmarkToon';
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.glowMat.color.setScalar(1.35);
    this.glowMat.name = 'GenesisLandmarkGlow';
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false, transparent: true, opacity: 0.92 });
    this.violetFlameMat = new THREE.MeshBasicMaterial({ color: 0xb48cff, toneMapped: false, transparent: true, opacity: 0.9 });
    this.flames = [];
    this.lights = [];
    this.spinners = [];
    this.rng = createSeededRandom(7007);

    this._buildGate();
    this._buildPlaza();
    this._buildQuarry();
    this._buildSanctuary();
    zone.updatables.push(() => this.update());
  }

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
    if (parts && parts.length) {
      const solid = new THREE.Mesh(bakeParts(parts), this.solidMat);
      solid.castShadow = true;
      solid.receiveShadow = true;
      g.add(solid);
    }
    if (glow && glow.length) g.add(new THREE.Mesh(bakeParts(glow), this.glowMat));
    this.root.add(g);
    return g;
  }

  _toWorld(x, z, yaw, lx, lz) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [x + lx * c + lz * s, z - lx * s + lz * c];
  }

  _flame(g, x, y, z, opts = {}) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(opts.r ?? 0.32, opts.h ?? 0.8, 7), opts.violet ? this.violetFlameMat : this.flameMat);
    f.position.set(x, y + (opts.h ?? 0.8) / 2, z);
    g.add(f);
    this.flames.push(f);
  }

  /** Layered lavender pillar shaft (stacked slightly offset drums) for the gate. */
  _layeredShaft(parts, x, z, h, r) {
    const n = Math.round(h / 0.9);
    for (let i = 0; i < n; i++) {
      const y = 0.45 + i * (h / n);
      const rr = r * (0.92 + ((i * 37) % 7) * 0.025);
      parts.push([cyl(rr, rr * 1.04, h / n * 0.96, 10, x + ((i % 2) - 0.5) * 0.06, y, z), i % 2 ? C.lav : C.lavLight]);
    }
  }

  // 1. Puerta del Santuario (front = local +Z, facing the arriving player in the east)
  _buildGate() {
    const G = GENESIS_SITES.gate;
    const parts = [], glow = [];
    const H = 9.0, R = 1.05, X = 5.2;
    for (const s of [-1, 1]) {
      const x = s * X;
      parts.push([box(2.8, 1.0, 2.8, x, 0.3, 0), C.lavDark]);
      parts.push([box(2.4, 0.4, 2.4, x, 1.0, 0), C.gold]);
      this._layeredShaft(parts, x, 0, H, R);
      for (const y of [3.2, 6.4]) parts.push([new THREE.TorusGeometry(R * 1.02, 0.09, 5, 20).rotateX(Math.PI / 2).translate(x, y, 0), C.gold]);
      parts.push([box(2.6, 0.7, 2.6, x, H + 1.0, 0), C.marble]);
      parts.push([box(2.9, 0.25, 2.9, x, H + 1.45, 0), C.goldDark]);
      glow.push([ball(0.45, x, H + 2.1, 0, 1, 1, 1, 1), C.glowGold]);
      // Flanking wall + end obelisk
      parts.push([box(6.2, 3.2, 1.2, s * (X + 4.4), 1.6, -0.2), C.lavDark]);
      parts.push([box(6.4, 0.3, 1.4, s * (X + 4.4), 3.3, -0.2), C.gold]);
      for (let k = 0; k < 3; k++) glow.push([box(0.5, 1.2, 0.08, s * (X + 2.6 + k * 1.8), 1.8, 0.42), C.glowViolet]);
      parts.push([cyl(0.5, 0.75, 5.5, 4, s * (X + 8.0), 2.75, -0.2).rotateY(Math.PI / 4), C.lav]);
      glow.push([new THREE.OctahedronGeometry(0.35, 0).translate(s * (X + 8.0), 5.8, -0.2), C.glowCyan]);
    }
    // Lintel + gold crest + emblem
    parts.push([box(2 * X + 3.2, 1.3, 2.4, 0, H + 2.4, 0), C.marble]);
    parts.push([box(2 * X + 3.6, 0.3, 2.6, 0, H + 3.15, 0), C.gold]);
    parts.push([new THREE.TorusGeometry(2.6, 0.22, 6, 24, Math.PI).translate(0, H + 3.2, 0), C.gold]);
    glow.push([new THREE.OctahedronGeometry(0.9, 0).scale(1, 1.4, 0.35).translate(0, H + 4.4, 0.05), C.glowGold]);
    for (const s of [-1, 1]) glow.push([new THREE.OctahedronGeometry(0.4, 0).scale(1, 1.4, 0.35).translate(s * 2.0, H + 3.9, 0.05), C.glowCyan]);
    // Braziers in front
    for (const s of [-1, 1]) {
      parts.push([cyl(0.3, 0.45, 1.4, 8, s * 3.4, 0.7, 3.4), C.lavDark]);
      parts.push([cyl(0.75, 0.4, 0.45, 10, s * 3.4, 1.6, 3.4), C.gold]);
    }
    const g = this._place(parts, glow, G.x, G.z, G.yaw, 'Genesis_SanctuaryGate', 6.0, 0.1);
    for (const s of [-1, 1]) this._flame(g, s * 3.4, 1.75, 3.4, { r: 0.38, h: 0.9 });
    // Aurora veil between the pillars (walk through it)
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(2 * X - 2.1, H + 0.8), veilMaterial(this.time));
    veil.position.set(0, (H + 0.8) / 2 + 0.6, 0);
    veil.renderOrder = 3;
    g.add(veil);
    const light = new THREE.PointLight(0xffc890, 5, 18, 2);
    light.position.set(0, 3, 4.5);
    g.add(light);
    this.lights.push({ light, base: 5 });
    for (const [lx, lz, r] of [[-X, 0, 1.6], [X, 0, 1.6], [-3.4, 3.4, 0.7], [3.4, 3.4, 0.7]]) { const [wx, wz] = this._toWorld(G.x, G.z, G.yaw, lx, lz); this.zone.addCollider(wx, wz, r); }
    for (const s of [-1, 1]) for (let k = 0; k <= 4; k++) { const [wx, wz] = this._toWorld(G.x, G.z, G.yaw, s * (X + 1.8 + k * 1.6), -0.2); this.zone.addCollider(wx, wz, 0.8); }
    // Processional obelisks along the avenue (west of the gate)
    const obs = [], obsGlow = [];
    for (let i = 0; i < 4; i++) {
      for (const s of [-1, 1]) {
        const lx = s * 5.5, lz = -8 - i * 9;
        obs.push([box(1.1, 0.4, 1.1, lx, 0.2, lz), C.lavDark]);
        obs.push([cyl(0.32, 0.55, 3.6, 4, lx, 2.2, lz).rotateY(0), C.lav]);
        obsGlow.push([new THREE.OctahedronGeometry(0.26, 0).translate(lx, 4.3, lz), i % 2 ? C.glowCyan : C.glowViolet]);
        const [wx, wz] = this._toWorld(G.x, G.z, G.yaw, lx, lz);
        this.zone.addCollider(wx, wz, 0.7);
      }
    }
    const og = new THREE.Group();
    og.position.set(G.x, 0, G.z);
    og.rotation.y = G.yaw;
    og.name = 'Genesis_ProcessionObelisks';
    // Obelisks follow the ground individually: bake per obelisk height via a vertex offset
    const solid = bakeParts(obs);
    const glowG = bakeParts(obsGlow);
    const fixY = (geo) => {
      const p = geo.attributes.position;
      const c = Math.cos(G.yaw), s = Math.sin(G.yaw);
      for (let i = 0; i < p.count; i++) {
        const lx = Math.round(p.getX(i) / 5.5) * 5.5, lz = Math.round((p.getZ(i) + 8) / 9) * 9 - 8;
        const wx = G.x + lx * c + lz * s, wz = G.z - lx * s + lz * c;
        p.setY(i, p.getY(i) + this.height(wx, wz) - 0.08);
      }
      geo.computeBoundingSphere();
    };
    fixY(solid); fixY(glowG);
    const sm = new THREE.Mesh(solid, this.solidMat); sm.castShadow = true; sm.receiveShadow = true;
    og.add(sm, new THREE.Mesh(glowG, this.glowMat));
    this.root.add(og);
  }

  // 2. Jardín Real: totem + campfire + six abstract monuments on pedestals + crystal cluster
  _buildPlaza() {
    const P = GENESIS_SITES.plaza;
    // Totem (abstract horned guardian pillar, turquoise)
    const t = [], tg = [];
    t.push([box(2.6, 0.5, 2.6, 0, 0.25, 0), C.lavDark]);
    t.push([box(2.1, 1.7, 2.1, 0, 1.35, 0), C.tealDark]);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      for (let k = 0; k < 3; k++) {
        const tri = new THREE.ConeGeometry(0.28, 0.5, 3);
        tri.rotateZ(k % 2 ? Math.PI : 0);
        tri.translate(-0.6 + k * 0.6, 1.35, 1.07);
        tri.rotateY(a);
        t.push([tri, C.gold]);
      }
    }
    t.push([box(1.8, 1.6, 1.8, 0, 3.0, 0), C.teal]);
    t.push([box(1.95, 0.18, 1.95, 0, 3.85, 0), C.gold]);
    t.push([ball(1, 0, 4.75, 0, 1.15, 0.85, 1.0, 1), C.tealLight]);
    for (const s of [-1, 1]) {
      t.push([rod(0.16, [s * 0.7, 5.2, 0], [s * 1.25, 6.1, -0.1], 6), C.tealLight]);
      t.push([rod(0.11, [s * 1.25, 6.1, -0.1], [s * 1.05, 6.8, -0.2], 6), C.tealLight]);
      tg.push([ball(0.16, s * 0.42, 4.85, 0.82, 1, 1, 0.5, 1), C.glowCyan]);
    }
    tg.push([ball(0.55, 0, 6.15, 0, 1, 1, 1, 1), 0xffa04a]);
    this._place(t, tg, P.x, P.z, 0.2, 'Genesis_RoyalTotem', 1.4, 0.05);
    this.zone.addCollider(P.x, P.z, 1.6);
    // Campfire
    const fx = P.x + 7, fz = P.z + 5;
    const f = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; f.push([ball(0.24, Math.cos(a) * 0.85, 0.08, Math.sin(a) * 0.85, 1.2, 0.7, 1, 0), i % 2 ? C.lav : C.lavDark]); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; f.push([rod(0.09, [Math.cos(a) * 0.6, 0.05, Math.sin(a) * 0.6], [Math.cos(a) * -0.1, 0.45, Math.sin(a) * -0.1], 5), i % 2 ? C.wood : C.woodDark]); }
    f.push([rod(0.22, [-2.0, 0.2, -0.7], [-1.7, 0.2, 1.0], 8), C.wood]);
    f.push([rod(0.22, [1.2, 0.2, 1.9], [2.4, 0.2, 0.9], 8), C.woodDark]);
    const fg = this._place(f, null, fx, fz, 0.3, 'Genesis_PlazaCampfire', 1.0, 0.02);
    this._flame(fg, 0, 0.1, 0, { r: 0.4, h: 1.0 });
    this._flame(fg, 0.05, 0.0, 0.04, { r: 0.24, h: 0.7 });
    const fl = new THREE.PointLight(0xffa04a, 6, 16, 2);
    fl.position.set(0, 1.5, 0);
    fg.add(fl);
    this.lights.push({ light: fl, base: 6 });
    this.zone.addCollider(fx, fz, 1.0);
    const smoke = new IslandParticles(this.root, { mode: 'sand', count: 40, seed: 77, velocity: [0.1, 1.0, 0.05], size: 8, colorA: 0xc8c0e8, colorB: 0x9a90c8, opacity: 0.28, sway: 0.25, box: [3, 9, 3], additive: false });
    const sc = new THREE.Vector3(fx, fg.position.y + 3.4, fz);
    this.zone.updatables.push((dt) => smoke.update(dt, sc));
    // Six monuments around the plaza (abstract sculptures on stepped pedestals)
    const pastel = [C.pink, C.lavLight, C.tealLight, C.gold, C.marble, 0xffb88a];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = P.x + Math.cos(a) * 17, z = P.z + Math.sin(a) * 17;
      const m = [], mg = [];
      m.push([box(3.2, 0.5, 3.2, 0, 0.25, 0), C.lavDark]);
      m.push([box(2.5, 0.6, 2.5, 0, 0.8, 0), C.marbleShade]);
      m.push([box(1.8, 1.5, 1.8, 0, 1.85, 0), C.marble]);
      m.push([box(2.05, 0.2, 2.05, 0, 2.7, 0), C.gold]);
      const col = pastel[i];
      const y0 = 2.8;
      switch (i) {
        case 0:   // ringed orb
          mg.push([ball(0.8, 0, y0 + 1.3, 0, 1, 1, 1, 2), C.glowGold]);
          m.push([new THREE.TorusGeometry(1.25, 0.08, 6, 32).rotateX(1.2).translate(0, y0 + 1.3, 0), C.gold]);
          m.push([new THREE.TorusGeometry(1.45, 0.06, 6, 32).rotateZ(0.7).translate(0, y0 + 1.3, 0), C.goldDark]);
          m.push([cyl(0.12, 0.2, 0.6, 8, 0, y0 + 0.3, 0), C.gold]);
          break;
        case 1:   // crystal cluster (pink)
          for (let k = 0; k < 6; k++) {
            const p = crystalPrismGeometry(0.22 + (k === 0 ? 0.12 : 0), 0.9 + (k === 0 ? 1.0 : 0.3 * (k % 3)), 6);
            p.rotateZ((k === 0 ? 0 : 0.45) * ((k % 2) ? 1 : -1));
            p.rotateY(k * 1.05);
            p.translate(0, y0, 0);
            mg.push([p, C.glowPink]);
          }
          break;
        case 2:   // crescent
          m.push([new THREE.TorusGeometry(1.1, 0.32, 10, 28, Math.PI * 1.3).rotateZ(-0.6).translate(0, y0 + 1.5, 0), col]);
          mg.push([new THREE.OctahedronGeometry(0.3, 0).translate(0.3, y0 + 1.4, 0), C.glowCyan]);
          break;
        case 3:   // cairn of rounded stones
          m.push([ball(0.85, 0, y0 + 0.55, 0, 1, 0.65, 1, 1), C.pink]);
          m.push([ball(0.65, 0.1, y0 + 1.35, 0, 1, 0.7, 1, 1), C.tealLight]);
          m.push([ball(0.45, -0.05, y0 + 2.0, 0, 1, 0.75, 1, 1), C.lavLight]);
          mg.push([ball(0.18, 0, y0 + 2.45, 0, 1, 1, 1, 1), C.glowGold]);
          break;
        case 4:   // four-pointed star
          mg.push([new THREE.OctahedronGeometry(0.9, 0).scale(0.6, 1.5, 0.6).translate(0, y0 + 1.6, 0), C.glowGold]);
          m.push([new THREE.TorusGeometry(0.95, 0.07, 5, 28).translate(0, y0 + 1.6, 0), C.gold]);
          break;
        default:  // spiral of tilted cubes
          for (let k = 0; k < 5; k++) {
            const b = box(0.9 - k * 0.12, 0.45, 0.9 - k * 0.12, 0, y0 + 0.3 + k * 0.5, 0, k * 0.35);
            m.push([b, k % 2 ? col : C.marble]);
          }
          mg.push([new THREE.OctahedronGeometry(0.22, 0).translate(0, y0 + 2.9, 0), C.glowViolet]);
      }
      this._place(m, mg, x, z, -a + Math.PI / 2, `Genesis_Monument_${i}`, 1.8, 0.08);
      this.zone.addCollider(x, z, 1.9);
    }
    // Pink crystal cluster near the totem + glowing rune circle on the ground
    const cg = [];
    for (let k = 0; k < 7; k++) {
      const p = crystalPrismGeometry(0.2 + (k === 0 ? 0.1 : 0), 0.7 + (k === 0 ? 0.7 : 0.25 * (k % 3)), 6);
      p.rotateZ((k === 0 ? 0 : 0.5) * ((k % 2) ? 1 : -1));
      p.rotateY(k * 0.9);
      cg.push([p, C.glowPink]);
    }
    const cbase = [[ball(0.7, 0, 0.1, 0, 1.2, 0.5, 1, 0), C.lavDark]];
    this._place(cbase, cg, P.x - 6.5, P.z + 5.5, 0, 'Genesis_PlazaCrystal', 0.6, 0.05);
    this.zone.addCollider(P.x - 6.5, P.z + 5.5, 0.9);
    const ring = [[new THREE.TorusGeometry(10.5, 0.06, 4, 72).rotateX(Math.PI / 2).translate(0, 0.06, 0), C.glowGold],
      [new THREE.TorusGeometry(10.0, 0.035, 4, 72).rotateX(Math.PI / 2).translate(0, 0.06, 0), C.glowViolet]];
    const rg = this._place(null, ring, P.x, P.z, 0, 'Genesis_PlazaRunes', 0.1, 0);
    rg.position.y = this.height(P.x, P.z);
  }

  // 3. Pink crystal quarry (Tripp's camp)
  _buildQuarry() {
    const Q = GENESIS_SITES.quarry;
    const rng = this.rng;
    const pinkMat = crystalMaterial({ color: 0xffa6d8, glow: 0xff5ab8, glowIntensity: 0.7, rim: 0xffe0f4, opacity: 0.85, timeUniform: this.time, name: 'GenesisPinkCrystal' });
    const prism = crystalPrismGeometry(1, 3.0);
    prism.scale(1, 1 / 4.7, 1);
    const list = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let c = 0; c < 9; c++) {
      const a = (c / 9) * Math.PI * 2 + rng() * 0.4, d = Q.r * (0.55 + rng() * 0.45);
      const cx = Q.x + Math.cos(a) * d, cz = Q.z + Math.sin(a) * d;
      if (Math.hypot(cx - GENESIS_SITES.npcs.tripp.x, cz - GENESIS_SITES.npcs.tripp.z) < 4) continue;
      const big = 0.6 + rng() * 0.8;
      for (let i = 0; i < 4 + Math.floor(rng() * 3); i++) {
        const aa = rng() * Math.PI * 2, dd = i === 0 ? 0 : big * (0.6 + rng());
        const x = cx + Math.cos(aa) * dd, z = cz + Math.sin(aa) * dd;
        const r = big * (i === 0 ? 0.9 : 0.35 + rng() * 0.4), h = (i === 0 ? 4 + rng() * 3 : 1.5 + rng() * 2.5) * big;
        q.setFromEuler(new THREE.Euler(i ? Math.sin(aa) * 0.45 : 0.05, rng() * 6.28, i ? -Math.cos(aa) * 0.45 : 0.05));
        m4.compose(new THREE.Vector3(x, this.height(x, z) - 0.3, z), q, new THREE.Vector3(r, h, r));
        list.push(m4.clone());
      }
      this.zone.addCollider(cx, cz, big * 1.3);
    }
    const inst = new THREE.InstancedMesh(prism, pinkMat, list.length);
    list.forEach((mm, i) => inst.setMatrixAt(i, mm));
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    inst.name = 'GenesisQuarryCrystals';
    this.root.add(inst);
    // Mining frame, cart and pick rack next to Tripp
    const T = GENESIS_SITES.npcs.tripp;
    const p = [], gl = [];
    for (const s of [-1, 1]) p.push([rod(0.14, [s * 1.4, 0, -2.6], [s * 1.3, 3.0, -2.6], 6), C.wood]);
    p.push([rod(0.14, [-1.6, 3.0, -2.6], [1.6, 3.0, -2.6], 6), C.woodDark]);
    p.push([rod(0.03, [0.6, 3.0, -2.6], [0.6, 2.4, -2.6], 3), C.woodDark]);
    gl.push([new THREE.OctahedronGeometry(0.2, 0).scale(1, 1.3, 1).translate(0.6, 2.2, -2.6), C.glowGold]);
    p.push([box(1.6, 0.8, 1.0, 2.6, 0.75, -0.6), C.woodDark]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push([new THREE.TorusGeometry(0.22, 0.06, 5, 10).rotateY(Math.PI / 2).translate(2.6 + sx * 0.55, 0.25, -0.6 + sz * 0.52), C.stone]);
    for (let i = 0; i < 5; i++) gl.push([new THREE.OctahedronGeometry(0.2, 0).scale(1, 1.6, 1).translate(2.2 + i * 0.2, 1.3, -0.6 + (i % 2) * 0.2), C.glowPink]);
    p.push([rod(0.06, [-2.4, 0, 0.4], [-2.4, 1.6, 0.4], 5), C.wood]);
    p.push([rod(0.06, [-2.4, 1.5, 0.1], [-2.4, 1.5, 0.8], 5), C.stone]);
    this._place(p, gl, T.x, T.z, T.rotation, 'Genesis_QuarryCamp', 2.0, 0.05);
    for (const [lx, lz, r] of [[2.6, -0.6, 0.9], [-1.4, -2.6, 0.4], [1.4, -2.6, 0.4]]) { const [wx, wz] = this._toWorld(T.x, T.z, T.rotation, lx, lz); this.zone.addCollider(wx, wz, r); }
  }

  // 4. Santuario del Origen (front = local +Z faces north toward the player: yaw = π)
  _buildSanctuary() {
    const S = GENESIS_SITES.sanctuary;
    const yaw = Math.PI;
    const rng = this.rng;
    const parts = [], glow = [];
    // Inlaid floor: marble ring + gold & rune circles (thin, the Spirit of Atia stands on it)
    parts.push([cyl(13.5, 13.7, 0.12, 40, 0, 0.02, 0), C.marbleShade]);
    parts.push([cyl(7.0, 7.0, 0.14, 40, 0, 0.04, 0), C.marble]);
    glow.push([new THREE.TorusGeometry(6.6, 0.06, 4, 64).rotateX(Math.PI / 2).translate(0, 0.13, 0), C.glowGold]);
    glow.push([new THREE.TorusGeometry(4.2, 0.05, 4, 64).rotateX(Math.PI / 2).translate(0, 0.13, 0), C.glowCyan]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      glow.push([box(0.12, 0.04, 1.3, Math.sin(a) * 5.4, 0.13, Math.cos(a) * 5.4, a), C.glowViolet]);
    }
    // Column ring (some broken, with fallen drums)
    const nCol = 10;
    const colPos = [];
    for (let i = 0; i < nCol; i++) {
      const a = (i / nCol) * Math.PI * 2 + Math.PI / nCol;
      if (Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) > 0) continue;       // opening to the north (local +Z)
      const x = Math.sin(a) * 12.5, z = Math.cos(a) * 12.5;
      const broken = i % 4 === 1;
      const h = broken ? 2.5 + rng() * 1.5 : 7.5;
      parts.push([box(1.7, 0.5, 1.7, x, 0.25, z), C.marbleShade]);
      parts.push([cyl(0.62, 0.7, h, 12, x, 0.5 + h / 2, z), C.marble]);
      for (const y of [1.4, h - 0.5]) if (y < h) parts.push([new THREE.TorusGeometry(0.66, 0.05, 4, 16).rotateX(Math.PI / 2).translate(x, 0.5 + y, z), C.gold]);
      if (!broken) {
        parts.push([box(1.6, 0.45, 1.6, x, 0.5 + h + 0.22, z), C.marbleShade]);
        glow.push([new THREE.OctahedronGeometry(0.22, 0).translate(x, 0.5 + h + 0.75, z), C.glowCyan]);
      } else {
        // fallen drums nearby
        for (let k = 0; k < 2; k++) {
          const dx = x + (rng() - 0.5) * 3.2, dz = z + (rng() - 0.5) * 3.2;
          parts.push([cyl(0.6, 0.6, 1.1, 12, 0, 0, 0).rotateZ(Math.PI / 2).rotateY(rng() * 3).translate(dx, 0.6, dz), C.marbleShade]);
        }
      }
      colPos.push([x, z, broken, h]);
    }
    // Architrave segments between adjacent intact columns
    for (let i = 0; i < colPos.length - 1; i++) {
      const [x1, z1, b1, h1] = colPos[i], [x2, z2, b2] = colPos[i + 1];
      if (b1 || b2 || Math.hypot(x2 - x1, z2 - z1) > 9) continue;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, len = Math.hypot(x2 - x1, z2 - z1);
      parts.push([box(len + 1.4, 0.7, 1.2, mx, 0.5 + h1 + 0.8, mz, Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2), C.marble]);
      parts.push([box(len + 1.5, 0.15, 1.3, mx, 0.5 + h1 + 1.2, mz, Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2), C.gold]);
    }
    // Great arch at the back (local −Z) + stepped Throne of Origin
    for (const s of [-1, 1]) {
      parts.push([box(2.4, 0.8, 2.4, s * 6.2, 0.4, -17), C.lavDark]);
      this._layeredShaft(parts, s * 6.2, -17, 11, 1.1);
      parts.push([box(2.6, 0.6, 2.6, s * 6.2, 11.9, -17), C.marble]);
    }
    parts.push([new THREE.TorusGeometry(6.2, 0.75, 8, 32, Math.PI).translate(0, 12.2, -17), C.marble]);
    parts.push([new THREE.TorusGeometry(6.2, 0.2, 6, 32, Math.PI).translate(0, 12.2, -16.25), C.gold]);
    glow.push([new THREE.OctahedronGeometry(1.0, 0).scale(1, 1.5, 0.35).translate(0, 19.2, -17), C.glowGold]);
    for (let i = 0; i < 3; i++) parts.push([box(9 - i * 2.2, 0.55, 4.2 - i * 0.9, 0, 0.28 + i * 0.55, -21.5 - i * 0.4), i % 2 ? C.marble : C.marbleShade]);
    parts.push([box(2.4, 1.2, 1.6, 0, 2.25, -22.6), C.marble]);
    parts.push([box(2.6, 3.6, 0.5, 0, 3.9, -23.4), C.lavLight]);
    parts.push([new THREE.TorusGeometry(1.3, 0.12, 6, 24, Math.PI).translate(0, 5.7, -23.1), C.gold]);
    glow.push([ball(0.45, 0, 6.3, -23.1, 1, 1, 1, 1), C.glowGold]);
    // Braziers (violet flames) at the four diagonals
    const braziers = [[-9, 9], [9, 9], [-9, -9], [9, -9]];
    for (const [bx, bz] of braziers) {
      parts.push([cyl(0.25, 0.4, 1.4, 8, bx, 0.7, bz), C.lavDark]);
      parts.push([cyl(0.7, 0.4, 0.4, 10, bx, 1.6, bz), C.gold]);
    }
    const sy = S.floor;
    const g = this._place(parts, glow, S.x, S.z, yaw, 'Genesis_SanctuaryOfOrigin', 14, 0.0);
    g.position.y = sy;
    for (const [bx, bz] of braziers) this._flame(g, bx, 1.75, bz, { violet: true, r: 0.36, h: 0.85 });
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 11.5), veilMaterial(this.time, 0xffd98a, 0xc9a0ff));
    veil.position.set(0, 6.4, -17);
    veil.renderOrder = 3;
    g.add(veil);
    const light = new THREE.PointLight(0xb8a0ff, 7, 24, 2);
    light.position.set(0, 4, 0);
    g.add(light);
    this.lights.push({ light, base: 7 });
    const sparkle = new IslandParticles(this.root, { mode: 'sparkle', count: 160, velocity: [0.03, 0.18, 0.03], size: 3.0, colorA: 0xffe6a8, colorB: 0xc9a0ff, intensity: 1.4, opacity: 0.85, sway: 0.6, box: [26, 10, 26] });
    const spc = new THREE.Vector3(S.x, sy + 3, S.z);
    this.zone.updatables.push((dt) => sparkle.update(dt, spc));
    // Colliders: columns, arch pillars, throne, braziers
    for (const [x, z] of colPos) { const [wx, wz] = this._toWorld(S.x, S.z, yaw, x, z); this.zone.addCollider(wx, wz, 0.95); }
    for (const [lx, lz, r] of [[-6.2, -17, 1.5], [6.2, -17, 1.5], [0, -22.5, 4.0], [-3, -21.5, 1.6], [3, -21.5, 1.6], ...braziers.map(([bx, bz]) => [bx, bz, 0.7])]) {
      const [wx, wz] = this._toWorld(S.x, S.z, yaw, lx, lz);
      this.zone.addCollider(wx, wz, r);
    }
  }

  update() {
    const t = this.time.value;
    this.flames.forEach((f, i) => { f.scale.set(1, 0.85 + Math.sin(t * 9 + i * 1.7) * 0.1 + Math.sin(t * 15.3 + i) * 0.06, 1); });
    this.lights.forEach(({ light, base }, i) => { light.intensity = base * (0.9 + Math.sin(t * 5 + i) * 0.06 + Math.sin(t * 13.1 + i * 2.3) * 0.04); });
  }
}
