import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';
import { createSeededRandom } from '../../demo_scena/MathUtils.js';
import { mergeStaticByMaterial } from '../../../../render/StaticMerge.js';
import { placeIslandProps } from '../kit/IslandProps.js';

/**
 * MysticLandmarks — places of the Mystic improvement plan. Hito 57: GLB models (islands/kit/IslandProps.js)
 * for the house, the islet statue and a decorative statue; the rest are stylised primitives:
 *   1. Observatorio Astral : slate tower in two bodies with cornices, outer spiral stair, glowing
 *                            windows, amethyst dome with a brass telescope, armillary sphere
 *                            with turning rings and two rune lanterns (replaces the old tower).
 *   2. Casa del astrólogo  : house.glb (the Forest house) + a small amethyst crystal garden.
 *   3. Islote del estanque : mossy islet in the centre of the luminous swamp with a glowing
 *                            weeping willow (hanging strands) and statue_mystic in front of it
 *                            (was a primitive rune pillar), facing the Spiritual Shaman.
 *   4. Estatua             : statue_mystic at the Observatory door.
 * Each solid landmark is one vertex-coloured merged mesh (+ one glow mesh).
 */
export const MYSTIC_SITES = {
  observatory: { x: 42, z: -38, yaw: -0.74, r: 5.0 },
  house: { x: 50, z: -26, yaw: -0.93 },
  islet: { x: -64, z: 62, r: 5.2, top: 3.7 },
  pillar: { x: -61.6, z: 59.8, yaw: 2.3 },
  oracle: { x: 3.5, z: -45.5, rotation: -0.22 }
};

const C = {
  slate: 0x5c5f88, slateDark: 0x40426a, stoneLight: 0x8a86b0, trim: 0xd9b25a, brass: 0xd9a84a,
  wood: 0x4a3a5a, woodLight: 0x6a5478, plaster: 0xd9cff0, roof: 0x6a4fb8, roofDark: 0x4f3a92,
  door: 0x2e2448, glowWarm: 0xffc6e8, glowGold: 0xffd98a, glowCyan: 0x8ff6ff, glowViolet: 0xc9a0ff,
  moss: 0x2f8f7a, mossLight: 0x55c9a0, bark: 0x4a3f5e, willowLeaf: 0x2f7f8f, rune: 0x9fe8ff
};

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getSoftToonRamp(), ...opts });
}

/** [geometry, color] parts → one vertex-coloured geometry (position, normal, color). */
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

const box = (w, h, d, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const cyl = (rt, rb, h, seg, x = 0, y = 0, z = 0) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); return g; };
const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1, d = 1) => { const g = new THREE.IcosahedronGeometry(r, d); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
function rod(r, a, b, seg = 6) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()));
  g.translate(va.x, va.y, va.z);
  return g;
}
/** 4-pointed star (flat diamond pair) for finials and decorations. */
function star(r, x, y, z) {
  const a = new THREE.OctahedronGeometry(r, 0);
  a.scale(1, 1, 0.35);
  a.translate(x, y, z);
  return a;
}

export class MysticLandmarks {
  /**
   * @param {object} zone  GrandIslandZone
   * @param {object} ctx   { height(x,z), time:{value}, amethyst: Material }
   */
  constructor(zone, ctx) {
    this.zone = zone;
    this.height = ctx.height;
    this.time = ctx.time;
    this.amethyst = ctx.amethyst;
    this.root = new THREE.Group();
    this.root.name = 'MysticLandmarks';
    zone.group.add(this.root);
    this.solidMat = toon(0xffffff, { vertexColors: true });
    this.solidMat.name = 'MysticLandmarkToon';
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.glowMat.color.setScalar(1.35);
    this.glowMat.name = 'MysticLandmarkGlow';
    this.spinners = [];

    this._buildObservatory();
    this._buildHouse();
    this._buildIslet();
    this._buildModels();
    // Partes fijas y opacas (cuerpos de piedra y ventanas que brillan): una malla por material para
    // los cuatro lugares. Los anillos de la esfera armilar giran, así que se quedan sueltos; los
    // cristales translúcidos y las hebras del sauce no se combinan (StaticMerge ya los salta).
    const spinning = new Set(this.spinners.map((s) => s.o));
    mergeStaticByMaterial(this.root, { name: 'MysticLandmarksMerged', skip: (o) => spinning.has(o) });
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

  // 1. Observatorio Astral (front = local +Z)
  _buildObservatory() {
    const O = MYSTIC_SITES.observatory;
    const parts = [];
    const glow = [];
    parts.push([cyl(4.8, 5.1, 0.7, 12, 0, 0.2, 0), C.slateDark]);                  // plinth
    glow.push([new THREE.TorusGeometry(4.55, 0.05, 4, 48).rotateX(Math.PI / 2).translate(0, 0.57, 0), C.glowCyan]);
    parts.push([cyl(3.6, 3.95, 6.2, 14, 0, 3.65, 0), C.slate]);                    // lower body
    parts.push([cyl(4.0, 4.0, 0.3, 14, 0, 6.85, 0), C.trim]);                       // gold band
    parts.push([cyl(4.45, 4.05, 0.55, 14, 0, 7.25, 0), C.stoneLight]);              // cornice
    parts.push([cyl(3.1, 3.3, 3.0, 14, 0, 9.0, 0), C.stoneLight]);                  // upper body
    parts.push([cyl(3.65, 3.4, 0.45, 14, 0, 10.65, 0), C.slateDark]);              // top ring
    parts.push([new THREE.TorusGeometry(3.55, 0.08, 4, 40).rotateX(Math.PI / 2).translate(0, 10.9, 0), C.trim]);
    // Buttresses on the lower body
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      parts.push([box(0.6, 6.0, 0.9, Math.sin(a) * 3.9, 3.6, Math.cos(a) * 3.9, a), C.slateDark]);
    }
    // Upper window band (glowing) + lower slit windows
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      glow.push([box(0.55, 1.1, 0.12, Math.sin(a) * 3.2, 9.1, Math.cos(a) * 3.2, a), i % 2 ? C.glowGold : C.glowViolet]);
      parts.push([box(0.75, 0.12, 0.2, Math.sin(a) * 3.25, 8.5, Math.cos(a) * 3.25, a), C.trim]);
    }
    for (const a of [1.2, 2.6, -1.4, -2.6]) glow.push([box(0.35, 1.3, 0.12, Math.sin(a) * 3.82, 4.6, Math.cos(a) * 3.82, a), C.glowViolet]);
    // Door with a glowing arch + steps
    parts.push([box(1.6, 2.5, 0.3, 0, 1.85, 3.78), C.door]);
    glow.push([new THREE.TorusGeometry(0.85, 0.07, 4, 16, Math.PI).translate(0, 3.1, 3.95), C.glowGold]);
    parts.push([box(0.12, 2.5, 0.2, -0.86, 1.85, 3.9), C.trim]);
    parts.push([box(0.12, 2.5, 0.2, 0.86, 1.85, 3.9), C.trim]);
    for (let i = 0; i < 2; i++) parts.push([box(2.2, 0.2, 0.55, 0, 0.1 + i * 0.2, 4.95 - i * 0.45), C.stoneLight]);
    // Outer spiral stair (decorative, from the left of the door up to the cornice)
    const steps = 18;
    for (let i = 0; i < steps; i++) {
      const a = 0.8 + (i / steps) * Math.PI * 1.35;
      const y = 0.65 + (i / (steps - 1)) * 6.1;
      parts.push([box(1.0, 0.18, 0.55, Math.sin(a) * 4.45, y, Math.cos(a) * 4.45, a), C.stoneLight]);
      if (i % 3 === 0) parts.push([cyl(0.05, 0.05, 0.9, 5, Math.sin(a) * 4.95, y + 0.5, Math.cos(a) * 4.95), C.trim]);
    }
    // Brass telescope poking out of the dome slit + dome ribs
    parts.push([rod(0.32, [0, 11.0, 0.2], [0, 14.1, 3.3], 10), C.brass]);
    parts.push([rod(0.42, [0, 13.8, 3.0], [0, 14.25, 3.45], 10), C.brass]);
    parts.push([rod(0.08, [-0.5, 11.0, 0.2], [0, 12.4, 1.6], 5), C.wood]);
    for (const s of [-1, 1]) parts.push([new THREE.TorusGeometry(3.0, 0.07, 4, 24, Math.PI).rotateY(Math.PI / 2).translate(s * 0.55, 11.0, 0), C.trim]);
    parts.push([star(0.45, 0, 14.4, 0), C.trim]);
    // Rune lanterns flanking the door
    for (const s of [-1, 1]) {
      parts.push([box(0.6, 0.2, 0.6, s * 2.3, 0.1, 5.5), C.slateDark]);
      parts.push([cyl(0.09, 0.12, 2.1, 6, s * 2.3, 1.15, 5.5), C.slateDark]);
      parts.push([cyl(0.36, 0.28, 0.12, 6, s * 2.3, 2.75, 5.5), C.trim]);
      glow.push([new THREE.OctahedronGeometry(0.28, 0).scale(1, 1.4, 1).translate(s * 2.3, 2.4, 5.5), C.glowCyan]);
    }
    // Armillary sphere pedestal (front right); the rings turn (separate meshes)
    const ax = 3.6, az = 5.0;
    parts.push([cyl(0.5, 0.7, 0.35, 8, ax, 0.17, az), C.slateDark]);
    parts.push([cyl(0.18, 0.28, 1.2, 8, ax, 0.95, az), C.stoneLight]);
    parts.push([cyl(0.45, 0.3, 0.18, 8, ax, 1.6, az), C.trim]);
    glow.push([ball(0.32, ax, 2.45, az, 1, 1, 1, 1), C.glowGold]);
    const g = this._place(parts, glow, O.x, O.z, O.yaw, 'Mystic_ObservatorioAstral', O.r, 0.15);
    // Crystal dome (amethyst material, translucent) on top
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.0, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), this.amethyst);
    dome.position.y = 10.95;
    dome.name = 'Mystic_ObservatoryDome';
    g.add(dome);
    const ringMat = toon(C.trim);
    const arm = new THREE.Group();
    arm.position.set(ax, 2.45, az);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62 + i * 0.12, 0.03, 4, 28), ringMat);
      ring.rotation.set(i * 0.9, i * 0.6, 0);
      arm.add(ring);
      this.spinners.push({ o: ring, sx: 0.25 + i * 0.1, sy: 0.4 - i * 0.12 });
    }
    g.add(arm);
    this.zone.addCollider(O.x, O.z, O.r);
    for (const [lx, lz, r] of [[-2.3, 5.5, 0.4], [2.3, 5.5, 0.4], [ax, az, 0.75]]) {
      const [wx, wz] = this._toWorld(O.x, O.z, O.yaw, lx, lz);
      this.zone.addCollider(wx, wz, r);
    }
  }

  // 2. Astrologer's cottage (front = local +Z)
  _buildHouse() {
    // House: GLB (see _buildModels). Crystal garden beside it: stone ring with moss + amethyst points
    const H = MYSTIC_SITES.house;
    const gx = -5.2, gz = 2.6;   // local to the house (front = +Z), clear of the 6.9 m wide house.glb
    const parts = [];
    for (let i = 0; i < 9; i++) {
      const aa = (i / 9) * Math.PI * 2;
      parts.push([ball(0.22, Math.cos(aa) * 1.1, 0.08, Math.sin(aa) * 1.1, 1.2, 0.7, 1, 0), C.slateDark]);
    }
    parts.push([cyl(1.0, 1.05, 0.12, 12, 0, 0.06, 0), C.moss]);
    const [wx, wz] = this._toWorld(H.x, H.z, H.yaw, gx, gz);
    const g = this._place(parts, null, wx, wz, H.yaw, 'Mystic_CrystalGarden', 1.2, 0.05);
    const rng = createSeededRandom(5150);
    const cg = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), this.amethyst);
      const aa = rng() * Math.PI * 2, rr = rng() * 0.7;
      c.position.set(Math.cos(aa) * rr, 0.35 + rng() * 0.2, Math.sin(aa) * rr);
      c.scale.set(0.8, 2.2 + rng() * 1.6, 0.8);
      c.rotation.set((rng() - 0.5) * 0.5, rng() * 3, (rng() - 0.5) * 0.5);
      cg.add(c);
    }
    g.add(cg);
    this.zone.addCollider(wx, wz, 1.2);
  }

  /**
   * GLB pieces (Hito 57), in their own group (they arrive after mergeStaticByMaterial). Colliders are registered
   * now; the models appear when loaded (shared `#islas` cache with the Savanna and the Arctic).
   */
  _buildModels() {
    const S = MYSTIC_SITES;
    const O = S.observatory;
    const [ox, oz] = this._toWorld(O.x, O.z, O.yaw, 3.8, 6.2);   // beside the right lantern of the door
    const list = [
      { model: 'house', ...S.house, name: 'Mystic_AstrologerHouse', smoke: true },
      { model: 'statue_mystic', x: S.pillar.x, z: S.pillar.z, yaw: S.pillar.yaw, name: 'Mystic_IsletStatue' },
      { model: 'statue_mystic', x: ox, z: oz, yaw: O.yaw, name: 'Mystic_ObservatoryStatue' }
    ];
    this.props = new THREE.Group();
    this.props.name = 'MysticProps';
    this.zone.group.add(this.props);
    const res = placeIslandProps(this.props, list, { height: this.height, plinthColor: 0x5c5f88 });
    res.colliders.forEach(([x, z, r]) => this.zone.addCollider(x, z, r));
    this.ready = res.ready;
  }

  // 3. Swamp islet: glowing weeping willow (statue in front: _buildModels)
  _buildIslet() {
    const I = MYSTIC_SITES.islet;
    const rng = createSeededRandom(6262);
    const parts = [];
    const glow = [];
    // Moss mound edge stones (the islet itself is terrain)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rng() * 0.2;
      parts.push([ball(0.4 + rng() * 0.25, Math.cos(a) * (I.r - 0.6), 0.05, Math.sin(a) * (I.r - 0.6), 1.3, 0.6, 1.0, 0), i % 3 ? C.slateDark : C.moss]);
    }
    // Willow trunk: leaning, twisted segments + root flares
    const trunkPts = [[0, -0.2, 0], [0.3, 1.6, 0.1], [0.1, 3.0, -0.2], [0.4, 4.3, 0.1], [0.2, 5.2, 0]];
    for (let i = 0; i < trunkPts.length - 1; i++) parts.push([rod(0.62 - i * 0.12, trunkPts[i], trunkPts[i + 1], 9), C.bark]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push([rod(0.22, [0, 0.9, 0], [Math.cos(a) * 1.5, -0.2, Math.sin(a) * 1.5], 6), C.bark]);
    }
    // Arching boughs
    const tips = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const tip = [Math.cos(a) * 3.2, 6.0 + rng() * 0.6, Math.sin(a) * 3.2];
      parts.push([rod(0.16, [0.2, 4.9, 0], tip, 6), C.bark]);
      tips.push(tip);
    }
    // Crown: rounded, drooping clumps (inner dome, middle ring, lower outer ring)
    parts.push([ball(1, 0.2, 6.9, 0, 2.6, 1.9, 2.6, 1), 0x62bfc0]);
    for (let i = 0; i < 7; i++) {
      const aa = (i / 7) * Math.PI * 2 + 0.2;
      parts.push([ball(1, Math.cos(aa) * 2.5, 6.3 + rng() * 0.3, Math.sin(aa) * 2.5, 1.7, 1.15, 1.7, 1), i % 2 ? 0x4fa9b4 : 0x7486d6]);
    }
    for (let i = 0; i < 10; i++) {
      const aa = (i / 10) * Math.PI * 2 + 0.5;
      parts.push([ball(1, Math.cos(aa) * 3.9, 5.35 + rng() * 0.3, Math.sin(aa) * 3.9, 1.15, 0.85, 1.15, 1), i % 3 ? 0x449cac : 0x8a78d8]);
    }
    void tips;
    const g = this._place(parts, glow, I.x, I.z, 0, 'Mystic_SwampWillow', 0.1, 0.05);
    g.position.y = this.height(I.x, I.z) - 0.05;
    // Hanging glowing strands (one instanced mesh, swaying in the vertex shader)
    const strandGeo = new THREE.CylinderGeometry(0.035, 0.02, 1, 3, 4, true);
    strandGeo.translate(0, -0.5, 0);
    const strandMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    strandMat.name = 'MysticWillowStrands';
    const time = this.time;
    strandMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n uniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          {
            float k = -position.y;   // 0 at the bough, 1 at the tip
            float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 1.3;
            transformed.x += sin(uTime * 1.1 + ph) * 0.18 * k * k;
            transformed.z += cos(uTime * 0.9 + ph) * 0.14 * k * k;
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= 1.0;`);
    };
    strandMat.customProgramCacheKey = () => 'mystic-willow-strand';
    const n = 210;
    const strands = new THREE.InstancedMesh(strandGeo, strandMat, n);
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    const palette = [0x8ff6ff, 0x9fffe0, 0xd8b0ff, 0xff9ad8];
    const top = g.position.y;
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      // Curtains of strands falling from the underside of the drooping crown
      const rr = 2.4 + Math.pow(rng(), 0.6) * 2.9;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const y0 = 6.0 - Math.max(0, rr - 2.4) * 0.38 + rng() * 0.15;
      // Outer strands reach (almost) the water; inner ones are shorter
      const reach = (y0 - 0.45) * (0.45 + 0.55 * Math.min(1, (rr - 2.4) / 2.9));
      const len = Math.max(1.0, reach * (0.6 + rng() * 0.4));
      m4.makeScale(1, len, 1).setPosition(I.x + x, top + y0, I.z + z);
      strands.setMatrixAt(i, m4);
      col.set(palette[i % palette.length]).multiplyScalar(0.4 + rng() * 0.3);
      strands.setColorAt(i, col);
    }
    [strands].forEach((m) => { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); this.root.add(m); });
    strands.name = 'MysticWillowStrands';
    this.zone.addCollider(I.x, I.z, 1.4);

    // In front of the willow, facing the shaman: statue_mystic (GLB, see _buildModels; was a rune pillar)
  }

  update() {
    const t = this.time.value;
    for (const s of this.spinners) {
      s.o.rotation.x += 0.004 * s.sx * 4;
      s.o.rotation.y = t * s.sy;
    }
  }
}
