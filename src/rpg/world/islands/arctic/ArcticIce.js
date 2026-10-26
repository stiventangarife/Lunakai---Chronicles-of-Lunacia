import * as THREE from 'three';
import { mergeVertices } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { createSeededRandom } from '../../demo_scena/MathUtils.js';
import { GLSL_NOISE } from '../../demo_scena/genshin/GenshinArtDirection.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';
import { crystalMaterial, crystalPrismGeometry, islandRockMaterial } from '../kit/IslandMaterials.js';
import { bakeParts } from './ArcticLandmarks.js';

/**
 * ArcticIce — the frozen dressing of the Arctic improvement plan:
 *   - translucent ice blocks (replace part of the big boulders + new ones), with icicles;
 *   - ore veins (rock base + glowing crystals) where the ice shards used to be — visual only;
 *   - fish frozen under the translucent lake / pond ice, frosted flagstones and frost spikes
 *     along the shores;
 *   - low drifting mist banks (cold cyan) over the valley floor;
 *   - iceWalkHeight(): the walkable height over frozen water (lakes, pond, rivers).
 */

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Faceted ice chunk (welded, jittered, then flat-shaded), base at y = 0, ~1 m wide. */
function iceChunkGeometry(kind, rng) {
  let g;
  if (kind === 0) g = new THREE.IcosahedronGeometry(0.6, 0);
  else if (kind === 1) g = new THREE.DodecahedronGeometry(0.6, 0);
  else g = new THREE.BoxGeometry(1.0, 1.0, 0.9, 1, 2, 1);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.82 + rng() * 0.36;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * (0.85 + rng() * 0.3), p.getZ(i) * (0.82 + rng() * 0.36));
  }
  if (kind === 0) g.scale(1.1, 0.95, 0.95);
  if (kind === 1) g.scale(1.0, 1.25, 0.85);
  if (kind === 2) g.scale(1.15, 0.9, 1.0);
  g = g.toNonIndexed();
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const sz = new THREE.Vector3(); bb.getSize(sz);
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  g.scale(1 / Math.max(sz.x, sz.z), 1 / Math.max(sz.x, sz.z), 1 / Math.max(sz.x, sz.z));
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

function instanced(geo, mat, list, name, shadows = false) {
  if (!list.length) return null;
  const inst = new THREE.InstancedMesh(geo, mat, list.length);
  inst.name = name;
  list.forEach((m, i) => inst.setMatrixAt(i, m));
  inst.instanceMatrix.needsUpdate = true;
  inst.computeBoundingSphere();
  inst.castShadow = shadows;
  inst.receiveShadow = shadows;
  return inst;
}

export class ArcticIce {
  /**
   * ctx = { height(x,z) terrain, time:{value}, lakes:[{x,z,r,level,depth}], shoreRings:[{x,z,r}],
   *         iceSpots:[{x,z,s,rot}], newIceSpots:[...], oreSpots:[{x,z,base}], fishPonds:[{x,z,r,level,depth,count}],
   *         flagstones:[[x,z,s,rot]], mist:[{x,z,w,h}] }
   */
  constructor(zone, ctx) {
    this.zone = zone;
    this.ctx = ctx;
    this.height = ctx.height;
    this.root = new THREE.Group();
    this.root.name = 'ArcticIce';
    zone.group.add(this.root);
    this.rng = createSeededRandom(7717);
    const time = ctx.time;
    this.iceMat = crystalMaterial({ color: 0xa6e2f6, glow: 0x3a9fe0, glowIntensity: 0.26, rim: 0xe8fbff, opacity: 0.74, timeUniform: time, name: 'ArcticIceBlock' });
    this.icicleMat = crystalMaterial({ color: 0xd6f4ff, glow: 0x5fc0ff, glowIntensity: 0.35, rim: 0xffffff, opacity: 0.82, timeUniform: time, name: 'ArcticIcicle' });
    this._buildIceBlocks();
    this._buildOres();
    this._buildFrozenFish();
    this._buildShores();
    this._buildMist();
  }

  // ---------------------------------------------------------------- Ice blocks + icicles
  _buildIceBlocks() {
    const rng = this.rng;
    const geos = [0, 1, 2].map((k) => iceChunkGeometry(k, rng));
    const lists = geos.map(() => []);
    const icicles = [];
    const icicleGeo = new THREE.ConeGeometry(0.5, 1, 5, 1);
    icicleGeo.rotateX(Math.PI);                 // tip down
    icicleGeo.translate(0, -0.5, 0);            // hangs below its anchor
    const all = [...this.ctx.iceSpots, ...this.ctx.newIceSpots];
    all.forEach((s, i) => {
      const k = i % 3;
      const geo = geos[k];
      const w = s.s * 0.95;
      const hgt = s.s * (0.75 + rng() * 0.35);
      const y = this.height(s.x, s.z) - 0.18 * s.s;
      _q.setFromEuler(_e.set((rng() - 0.5) * 0.18, s.rot, (rng() - 0.5) * 0.18));
      _m4.compose(_p.set(s.x, y, s.z), _q, _s.set(w, hgt, w * (0.8 + rng() * 0.3)));
      lists[k].push(_m4.clone());
      // (Hito 71d: colisión con la huella exacta del bloque: def.collision.hullRules)
      // A satellite chunk at the foot of the big ones
      if (s.s > 2.6 && rng() < 0.7) {
        const a = rng() * Math.PI * 2, d = s.s * 0.62;
        const sx = s.x + Math.cos(a) * d, sz = s.z + Math.sin(a) * d;
        const ss = s.s * (0.28 + rng() * 0.15);
        _q.setFromEuler(_e.set((rng() - 0.5) * 0.5, rng() * 6.28, (rng() - 0.5) * 0.5));
        _m4.compose(_p.set(sx, this.height(sx, sz) - 0.12 * ss, sz), _q, _s.set(ss, ss * 0.8, ss));
        lists[(k + 1) % 3].push(_m4.clone());
      }
      // Icicles hanging from the bulge of the block (sampled on the actual geometry)
      if (s.icicles) {
        const pos = geo.attributes.position;
        const n = 4 + Math.floor(rng() * 4);
        for (let j = 0; j < n; j++) {
          const vi = Math.floor(rng() * pos.count);
          const ly = pos.getY(vi);
          if (ly < 0.35 || ly > 0.8) continue;
          _p.set(pos.getX(vi), ly, pos.getZ(vi)).multiply(_s.set(w, hgt, w)).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rot);
          const len = 0.3 + rng() * 0.55;
          _m4.compose(new THREE.Vector3(s.x + _p.x * 0.97, y + _p.y, s.z + _p.z * 0.97), _q.identity(), new THREE.Vector3(0.07 + rng() * 0.05, len, 0.07 + rng() * 0.05));
          icicles.push(_m4.clone());
        }
      }
    });
    geos.forEach((g, k) => { const m = instanced(g, this.iceMat, lists[k], `ArcticIceBlocks_${k}`); if (m) this.root.add(m); });
    const ic = instanced(icicleGeo, this.icicleMat, icicles, 'ArcticIcicles');
    if (ic) this.root.add(ic);
    this.icicleGeo = icicleGeo;
  }

  // ---------------------------------------------------------------- Ore veins (visual only)
  _buildOres() {
    const rng = this.rng;
    const baseGeo = new THREE.DodecahedronGeometry(0.5, 0);
    baseGeo.translate(0, 0.25, 0);
    const baseMat = islandRockMaterial(null, { base: 0x5d6a80, shadow: 0x3e4a66, top: 0xf2f7ff, topAmount: 0.75, streaks: 0.6, veins: 0.9, veinColor: 0x3fd0ff, timeUniform: this.ctx.time });
    baseMat.name = 'ArcticOreRock';
    const prism = crystalPrismGeometry(0.22, 1.0, 6);
    const oreMat = crystalMaterial({ color: 0x6fdcff, glow: 0x1aa8ff, glowIntensity: 1.05, rim: 0xd8fbff, opacity: 0.9, timeUniform: this.ctx.time, name: 'ArcticOreCrystal' });
    const oreMatB = crystalMaterial({ color: 0x8fb4ff, glow: 0x4f6dff, glowIntensity: 1.0, rim: 0xe0e8ff, opacity: 0.9, timeUniform: this.ctx.time, name: 'ArcticOreCrystalB' });
    const bases = [], crA = [], crB = [];
    for (const o of this.ctx.oreSpots) {
      const b = o.base * (0.85 + rng() * 0.4);
      const y = this.height(o.x, o.z) - 0.18 * b;
      const rot = rng() * Math.PI * 2;
      _q.setFromEuler(_e.set((rng() - 0.5) * 0.3, rot, (rng() - 0.5) * 0.3));
      _m4.compose(_p.set(o.x, y, o.z), _q, _s.set(b * 1.5, b * 0.85, b * 1.25));
      bases.push(_m4.clone());
      // A second, smaller lump
      const a2 = rng() * 6.28;
      const x2 = o.x + Math.cos(a2) * b * 0.75, z2 = o.z + Math.sin(a2) * b * 0.75;
      _m4.compose(_p.set(x2, this.height(x2, z2) - 0.12 * b, z2), _q.setFromEuler(_e.set(0.2, rng() * 6.28, -0.15)), _s.set(b * 0.8, b * 0.5, b * 0.7));
      bases.push(_m4.clone());
      // Crystals growing out of the rock, fanning outward
      const n = 3 + Math.floor(rng() * 3);
      const blue = rng() < 0.3;
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2 + rng() * 0.5;
        const lean = 0.25 + rng() * 0.5;
        const d = b * (0.15 + rng() * 0.3);
        const cx = o.x + Math.cos(a) * d, cz = o.z + Math.sin(a) * d;
        const len = b * (0.55 + rng() * 0.75) * (i === 0 ? 1.4 : 1.0);
        const wid = b * (0.45 + rng() * 0.3);
        // Tilt away from the centre: axis perpendicular to the radial direction
        _q.setFromAxisAngle(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), lean);
        _m4.compose(_p.set(cx, y + b * 0.35, cz), _q, _s.set(wid, len, wid));
        (blue ? crB : crA).push(_m4.clone());
      }
      // (Hito 71d: colisión con la huella exacta de la mena: def.collision.hullRules)
    }
    const bm = instanced(baseGeo, baseMat, bases, 'ArcticOreRocks', true);
    if (bm) this.root.add(bm);
    const ca = instanced(prism, oreMat, crA, 'ArcticOreCrystals_0');
    if (ca) this.root.add(ca);
    const cb = instanced(prism, oreMatB, crB, 'ArcticOreCrystals_1');
    if (cb) this.root.add(cb);
  }

  // ---------------------------------------------------------------- Fish frozen under the ice
  _buildFrozenFish() {
    const rng = this.rng;
    const mk = (len, body, back) => {
      const parts = [];
      const ball = (r, x, y, z, sx, sy, sz) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
      parts.push([ball(1, 0, 0, 0, len * 0.5, len * 0.2, len * 0.13), body]);
      parts.push([ball(1, 0.02 * len, len * 0.07, 0, len * 0.4, len * 0.11, len * 0.1), back]);
      const tail = new THREE.ConeGeometry(len * 0.18, len * 0.3, 4);
      tail.rotateZ(-Math.PI / 2); tail.scale(1, 1, 0.35); tail.translate(-len * 0.6, 0, 0); // punta hacia el cuerpo, aleta abierta hacia atrás
      parts.push([tail, back]);
      const fin = new THREE.ConeGeometry(len * 0.08, len * 0.18, 3);
      fin.translate(0, len * 0.2, 0);
      parts.push([fin, back]);
      return bakeParts(parts);
    };
    const geos = [mk(0.7, 0xf08a3a, 0xd0602a), mk(0.6, 0x9fc2e2, 0x4f78a8), mk(0.8, 0xe8c050, 0xc89030)];
    const mat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: getSoftToonRamp() });
    mat.name = 'ArcticFrozenFish';
    const lists = geos.map(() => []);
    for (const pond of this.ctx.fishPonds) {
      for (let i = 0; i < pond.count; i++) {
        const a = rng() * Math.PI * 2;
        const d = Math.sqrt(rng()) * (pond.r - 1.6);
        const x = pond.x + Math.cos(a) * d, z = pond.z + Math.sin(a) * d;
        const bed = this.height(x, z);
        const y = Math.min(pond.level - 0.32, Math.max(bed + 0.22, pond.level - 0.75));
        if (y < bed + 0.12) continue;
        _q.setFromEuler(_e.set((rng() - 0.5) * 0.3, rng() * 6.28, (rng() - 0.5) * 0.25));
        const s = 1.3 + rng() * 0.7;
        _m4.compose(_p.set(x, y, z), _q, _s.set(s, s, s));
        lists[i % 3].push(_m4.clone());
      }
    }
    geos.forEach((g, k) => { const m = instanced(g, mat, lists[k], `ArcticFrozenFish_${k}`); if (m) this.root.add(m); });
  }

  // ---------------------------------------------------------------- Shores: flagstones + frost spikes
  _buildShores() {
    const rng = this.rng;
    // Flat 7-sided slab (modelled flat: instances never squash Y, so the normals stay true)
    let slabGeo = new THREE.CylinderGeometry(0.5, 0.56, 0.2, 7, 1);
    slabGeo.deleteAttribute('uv'); slabGeo.deleteAttribute('normal');
    slabGeo = mergeVertices(slabGeo, 1e-4);
    const sp0 = slabGeo.attributes.position;
    for (let i = 0; i < sp0.count; i++) { const k = 0.85 + rng() * 0.3; sp0.setXYZ(i, sp0.getX(i) * k, sp0.getY(i) + (sp0.getY(i) > 0 ? (rng() - 0.5) * 0.04 : 0), sp0.getZ(i) * k); }
    slabGeo = slabGeo.toNonIndexed();
    slabGeo.computeVertexNormals();
    slabGeo.translate(0, 0.06, 0);
    const slabMat = islandRockMaterial(null, { base: 0xb7c3d3, shadow: 0x8b9bb8, top: 0xf2f7ff, topAmount: 0.55, streaks: 0.25 });
    slabMat.name = 'ArcticFrostFlagstone';
    const slabs = [];
    for (const [x, z, s, rot] of this.ctx.flagstones) {
      _q.setFromEuler(_e.set((rng() - 0.5) * 0.06, rot, (rng() - 0.5) * 0.06));
      _m4.compose(_p.set(x, this.height(x, z) - 0.08, z), _q, _s.set(s, 1, s * (0.7 + rng() * 0.3)));
      slabs.push(_m4.clone());
    }
    const sm = instanced(slabGeo, slabMat, slabs, 'ArcticFlagstones', true);
    if (sm) this.root.add(sm);
    // Frost spikes (frozen spray) in clusters along the shore line
    const spikeGeo = new THREE.ConeGeometry(0.5, 1, 5, 1);
    spikeGeo.translate(0, 0.5, 0);
    const spikes = [];
    for (const ring of this.ctx.shoreRings) {
      const n = Math.round(ring.r * 1.6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rng() * 0.25;
        if (ring.skip && ring.skip(a)) continue;
        const cx = ring.x + Math.cos(a) * ring.r, cz = ring.z + Math.sin(a) * ring.r;
        const k = 2 + Math.floor(rng() * 3);
        for (let j = 0; j < k; j++) {
          const x = cx + (rng() - 0.5) * 0.9, z = cz + (rng() - 0.5) * 0.9;
          const h = 0.25 + rng() * 0.6;
          const lean = 0.15 + rng() * 0.45;
          _q.setFromAxisAngle(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), -lean);   // lean toward the ice
          _m4.compose(_p.set(x, this.height(x, z) - 0.05, z), _q, _s.set(0.12 + rng() * 0.08, h, 0.12 + rng() * 0.08));
          spikes.push(_m4.clone());
        }
      }
    }
    const sp = instanced(spikeGeo, this.icicleMat, spikes, 'ArcticShoreFrostSpikes');
    if (sp) this.root.add(sp);
  }

  // ---------------------------------------------------------------- Low drifting mist banks
  _buildMist() {
    const banks = this.ctx.mist;
    if (!banks.length) return;
    const quad = new THREE.PlaneGeometry(1, 1, 1, 1);
    quad.translate(0, 0.5, 0);
    const offs = new Float32Array(banks.length * 4);
    const size = new Float32Array(banks.length * 2);
    banks.forEach((b, i) => {
      offs[i * 4] = b.x; offs[i * 4 + 1] = this.height(b.x, b.z) - 0.6; offs[i * 4 + 2] = b.z; offs[i * 4 + 3] = (i * 0.618) % 1;
      size[i * 2] = b.w; size[i * 2 + 1] = b.h;
    });
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.setAttribute('position', quad.attributes.position);
    geo.setAttribute('uv', quad.attributes.uv);
    geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(offs, 4));
    geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 2));
    geo.instanceCount = banks.length;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsLib.fog, uTime: this.ctx.time, uColor: { value: new THREE.Color(0xe2f4fa) }, uShade: { value: new THREE.Color(0xb6dbe8) }, uOpacity: { value: 0.55 } },
      transparent: true,
      depthWrite: false,
      fog: true,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        attribute vec4 aOff;
        attribute vec2 aSize;
        uniform float uTime;
        varying vec2 vUv;
        varying float vSeed;
        varying float vNear;
        void main() {
          vec3 c = aOff.xyz;
          c.x += sin(uTime * 0.05 + aOff.w * 6.28) * 3.0;
          c.z += cos(uTime * 0.04 + aOff.w * 9.0) * 2.0;
          vec3 toCam = cameraPosition - c;
          vec2 dir = normalize(toCam.xz + vec2(1e-4));
          vec3 right = vec3(dir.y, 0.0, -dir.x);
          vec3 wp = c + right * (position.x * aSize.x) + vec3(0.0, position.y * aSize.y, 0.0);
          vUv = uv;
          vSeed = aOff.w;
          vNear = smoothstep(5.0, 16.0, length(toCam.xz));
          vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform vec3 uColor, uShade;
        uniform float uOpacity, uTime;
        varying vec2 vUv;
        varying float vSeed;
        varying float vNear;
        ${GLSL_NOISE}
        void main() {
          vec2 p = vUv * vec2(3.0, 1.0) + vec2(uTime * 0.02 + vSeed * 13.0, vSeed * 7.0);
          float n = gFbm3(p * 1.4);
          float side = smoothstep(0.0, 0.32, vUv.x) * smoothstep(1.0, 0.68, vUv.x);
          float vert = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.35, 0.95, vUv.y + (n - 0.5) * 0.35));
          float a = side * vert * smoothstep(0.15, 0.6, n + 0.25) * uOpacity * vNear;
          if (a < 0.003) discard;
          vec3 col = mix(uShade, uColor, smoothstep(0.1, 0.8, vUv.y + n * 0.3));
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`
    });
    mat.name = 'ArcticMistBanks';
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'ArcticMistBanks';
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    this.root.add(mesh);
  }
}

/**
 * Walkable height over frozen water: the ice surface where it is above the ground.
 * lakes: [{x, z, r, level}] (disc radius = water body radius)
 * rivers: [{z0, z1, centreX(z), level(z), half}] (ribbons along the valley)
 */
export function iceWalkHeight(x, z, ground, lakes, rivers) {
  let h = ground;
  for (const L of lakes) {
    const d = Math.hypot(x - L.x, z - L.z);
    if (d < L.r && L.level > h) h = L.level;
  }
  for (const R of rivers) {
    if (z < Math.min(R.z0, R.z1) || z > Math.max(R.z0, R.z1)) continue;
    const dv = Math.abs(x - R.centreX(z));
    if (dv > R.half + 0.6) continue;
    const lvl = R.level(z);
    if (lvl <= h) continue;
    const w = 1 - THREE.MathUtils.smoothstep(dv, R.half - 0.5, R.half + 0.6);
    h = h + (lvl - h) * w;
  }
  return h;
}
