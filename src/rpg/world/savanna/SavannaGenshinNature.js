import * as THREE from 'three';
import { mergeGeometries } from '../../../../vendor/utils/BufferGeometryUtils.js';
import { createSeededRandom } from '../demo_scena/MathUtils.js';
import { getSoftToonRamp } from '../demo_scena/genshin/GenshinMaterials.js';
import { islandRockMaterial } from '../islands/kit/IslandMaterials.js';
import { IslandParticles } from '../islands/kit/IslandParticles.js';
import { SAVANNA_LANDMARKS } from './SavannaGenshinLandmarks.js';

/**
 * SavannaGenshinNature — terrain dressing for the Savanna, built from primitives:
 *   - reddish eroded rock mounds beside the trails (break the flat mesa line)
 *   - dry ochre shrubs + orange / red wildflower clumps near the oasis and at tree bases
 *   - a faint golden haze band on the horizon and slow golden dust / pollen motes
 */
const OASIS = { x: 14, z: -12 };

function colored(g, color) {
  const geo = g.index ? g.toNonIndexed() : g;
  const n = geo.attributes.position.count;
  const c = new THREE.Color(color);
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

/** Eroded rock: displaced icosphere, flattened, with a few horizontal "strata" steps. */
function rockGeometry(seed, flat) {
  const rng = createSeededRandom(seed);
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  const off = [rng() * 10, rng() * 10, rng() * 10];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 2.1 + off[0]) * Math.cos(z * 1.7 + off[1]) * 0.18 + Math.sin(y * 3.3 + off[2]) * 0.08;
    let k = 1 + n;
    let ny = y * flat;
    ny = Math.round(ny * 4) / 4 * 0.35 + ny * 0.65;          // terraced erosion steps
    p.setXYZ(i, x * k, Math.max(ny * k, -0.15), z * k);
  }
  g.translate(0, 0.15, 0);
  g.computeVertexNormals();
  return g;
}

export class SavannaGenshinNature {
  constructor(art) {
    this.art = art;
    this.zone = art.zone;
    this.root = new THREE.Group();
    this.root.name = 'SavannaGenshinNature';
    art.layer.root.add(this.root);
    this.colliders = [];

    this._buildRocks();
    this._buildFlora();
    this._buildHaze();
    this._buildPollen();
  }

  /** True when (x, z) is a good spot: mesa ground, off trails, away from landmarks, NPCs and pinnacles. */
  _free(x, z, rad, opts = {}) {
    const t = this.zone.terrain;
    const data = this.art.layer.data;
    if (Math.hypot(x, z) > 132) return false;
    if (t.getHeight(x, z) < (opts.minY ?? 3.0)) return false;
    if (t.getNormal(x, z).y < 0.88) return false;
    if (data.sampleMask(x, z, 1) > 0.05) return false;
    const L = SAVANNA_LANDMARKS;
    const avoid = [
      [L.camp.house.x, L.camp.house.z, 8], [-24.2, -33.2, 3], [L.altar.x, L.altar.z, 8], [L.forge.x, L.forge.z, 7],
      [L.forge.house.x, L.forge.house.z, 5], [58.5, -24.0, 3], [42.39, 48.73, 3], [2.5, -10, 3], [-30.24, -37.24, 3],
      [-133, 42, 5], [-126, 42, 4]
    ];
    if (!opts.allowOasis) avoid.push([OASIS.x, OASIS.z, 21]);
    for (const [ax, az, ar] of avoid) if (Math.hypot(x - ax, z - az) < ar + rad) return false;
    for (const [hx, hz, hr] of (this.art._colliders || [])) if (Math.hypot(x - hx, z - hz) < hr + rad + 0.8) return false;
    for (const [cx, cz, cr] of this.colliders) if (Math.hypot(x - cx, z - cz) < cr + rad + 0.4) return false;
    return true;
  }

  // ---- Reddish rock mounds 3–7 m off the trails ----
  _buildRocks() {
    const rng = createSeededRandom(60613);
    const shapes = [rockGeometry(11, 0.62), rockGeometry(23, 0.5), rockGeometry(37, 0.78)];
    const mat = islandRockMaterial(null, {
      base: 0xc9784a, shadow: 0x7a5a6e, top: 0xe2a46a, topAmount: 0.45, strata: 0.9,
      strataColors: [0x9e4a2a, 0xc56e3e, 0xe0a26a], streaks: 0.7
    });
    const lists = shapes.map(() => []);
    const paths = (this.art.profile && this.art.profile.paths) || [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let groups = 0;
    for (const path of paths) {
      const pts = path.points;
      for (let i = 0; i < pts.length - 1 && groups < 30; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const dx = (bx - ax) / len, dz = (bz - az) / len;
        for (let d = 5; d < len - 3 && groups < 30; d += 9 + rng() * 5) {
          let side = rng() < 0.5 ? -1 : 1;
          const off = 3 + rng() * 4 + path.width * 0.5;
          const n = 2 + Math.floor(rng() * 3);
          const bigR = 0.9 + rng() * 1.2;
          let cx = ax + dx * d - dz * off * side, cz = az + dz * d + dx * off * side;
          if (!this._free(cx, cz, bigR)) {
            side = -side;                                    // try the other side of the trail
            cx = ax + dx * d - dz * off * side; cz = az + dz * d + dx * off * side;
            if (!this._free(cx, cz, bigR)) continue;
          }
          groups++;
          for (let k = 0; k < n; k++) {
            const r = k === 0 ? bigR : bigR * (0.35 + rng() * 0.4);
            const ang = rng() * Math.PI * 2;
            const x = cx + (k === 0 ? 0 : Math.cos(ang) * (bigR + r) * 0.8), z = cz + (k === 0 ? 0 : Math.sin(ang) * (bigR + r) * 0.8);
            const y = this.zone.terrain.getHeight(x, z) - r * 0.18;
            e.set((rng() - 0.5) * 0.2, rng() * Math.PI * 2, (rng() - 0.5) * 0.2);
            m4.compose(p.set(x, y, z), q.setFromEuler(e), s.set(r * (0.9 + rng() * 0.4), r * (0.8 + rng() * 0.7), r * (0.9 + rng() * 0.4)));
            lists[Math.floor(rng() * shapes.length)].push(m4.clone());
          }
          if (bigR > 1.3) this.colliders.push([cx, cz, bigR * 0.95]);
        }
      }
    }
    shapes.forEach((g, k) => {
      if (!lists[k].length) return;
      const im = new THREE.InstancedMesh(g, mat, lists[k].length);
      lists[k].forEach((mm, i) => im.setMatrixAt(i, mm));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = true;
      im.receiveShadow = true;
      im.name = 'SavannaRockMounds_' + k;
      this.root.add(im);
    });
    this.rockGroups = groups;
  }

  // ---- Dry shrubs + orange / red wildflowers ----
  _buildFlora() {
    const rng = createSeededRandom(41177);
    const mat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: getSoftToonRamp(), side: THREE.DoubleSide });

    // Dry shrub: twiggy fan of thin branches with a few dry leaf tufts
    const sh = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + i * 0.4, tilt = 0.45 + (i % 3) * 0.15, h = 0.7 + (i % 4) * 0.12;
      sh.push(colored(new THREE.CylinderGeometry(0.012, 0.03, h, 3).translate(0, h / 2, 0).rotateZ(tilt).rotateY(a), 0x8a5a32));
      const tuft = new THREE.IcosahedronGeometry(0.12, 0);
      tuft.translate(Math.sin(tilt) * h * 0.95, Math.cos(tilt) * h * 0.95, 0).rotateY(a);
      sh.push(colored(tuft, i % 2 ? 0xc4923e : 0xa9783a));
    }
    const shrubGeo = mergeGeometries(sh, false);

    // Wildflower clump: 6 stems with star flowers (colour per instance via base white petals)
    const fl = [];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1, rr = 0.12 + (i % 3) * 0.1, h = 0.3 + (i % 3) * 0.12;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      fl.push(colored(new THREE.CylinderGeometry(0.01, 0.012, h, 3).translate(x, h / 2, z), 0x6d8a32));
      for (let k = 0; k < 5; k++) {
        const pt = new THREE.ConeGeometry(0.035, 0.11, 3);
        pt.rotateZ(Math.PI / 2); pt.translate(0.055, 0, 0); pt.rotateY((k / 5) * Math.PI * 2);
        pt.translate(x, h + 0.01, z);
        fl.push(colored(pt, 0xffffff));
      }
      fl.push(colored(new THREE.SphereGeometry(0.025, 5, 3).translate(x, h + 0.03, z), 0x5a3418));
    }
    const flowerGeo = mergeGeometries(fl, false);

    const pm = this.zone.propsManager;
    const treeBases = (pm && pm.pendingTrees ? pm.pendingTrees : []).map((tr) => [tr.pos.x, tr.pos.z]);
    const t = this.zone.terrain;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();

    const shrubs = [];
    let tries = 0;
    while (shrubs.length < 70 && tries++ < 1200) {
      let x, z;
      if (rng() < 0.55 && treeBases.length) {
        const [bx, bz] = treeBases[Math.floor(rng() * treeBases.length)];
        const a = rng() * Math.PI * 2, r = 2.0 + rng() * 2.5;
        x = bx + Math.cos(a) * r; z = bz + Math.sin(a) * r;
      } else {
        const a = rng() * Math.PI * 2, r = 15 + rng() * 110;
        x = Math.cos(a) * r; z = Math.sin(a) * r;
      }
      if (!this._free(x, z, 0.6)) continue;
      const k = 0.8 + rng() * 0.8;
      m4.compose(p.set(x, t.getHeight(x, z) - 0.05, z), q.setFromEuler(e.set(0, rng() * Math.PI * 2, 0)), s.set(k, k * (0.8 + rng() * 0.5), k));
      shrubs.push(m4.clone());
    }

    const flowers = [], flowerCols = [];
    const palette = [0xff8a2a, 0xff5a3a, 0xf2a03a, 0xe8423a, 0xffb050];
    tries = 0;
    while (flowers.length < 150 && tries++ < 2500) {
      let x, z;
      const roll = rng();
      if (roll < 0.45) {                                    // around the oasis (outside the shore plants)
        const a = rng() * Math.PI * 2, r = 14 + rng() * 9;
        x = OASIS.x + Math.cos(a) * r; z = OASIS.z + Math.sin(a) * r;
      } else if (treeBases.length) {                        // at the foot of the trees
        const [bx, bz] = treeBases[Math.floor(rng() * treeBases.length)];
        const a = rng() * Math.PI * 2, r = 1.2 + rng() * 3.0;
        x = bx + Math.cos(a) * r; z = bz + Math.sin(a) * r;
      } else continue;
      if (!this._free(x, z, 0.3, { allowOasis: true })) continue;
      if (Math.hypot(x - OASIS.x, z - OASIS.z) < 13.5) continue;
      const k = 0.9 + rng() * 0.7;
      m4.compose(p.set(x, t.getHeight(x, z) - 0.02, z), q.setFromEuler(e.set(0, rng() * Math.PI * 2, 0)), s.set(k, k, k));
      flowers.push(m4.clone());
      flowerCols.push(new THREE.Color(palette[Math.floor(rng() * palette.length)]));
    }

    const mk = (geo, list, name, cols) => {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((mm, i) => im.setMatrixAt(i, mm));
      if (cols) { cols.forEach((c, i) => im.setColorAt(i, c)); im.instanceColor.needsUpdate = true; }
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = name.includes('Shrub');
      im.receiveShadow = true;
      im.name = name;
      this.root.add(im);
      return im;
    };
    mk(shrubGeo, shrubs, 'SavannaDryShrubs');
    mk(flowerGeo, flowers, 'SavannaWildflowers', flowerCols);
    this.shrubCount = shrubs.length;
    this.flowerCount = flowers.length;
  }

  // ---- Faint golden haze band hugging the horizon (does not change the island fog) ----
  _buildHaze() {
    const geo = new THREE.CylinderGeometry(900, 900, 120, 48, 1, true);
    geo.translate(0, 40, 0);
    this.hazeUniforms = { uColor: { value: new THREE.Color(0xf6c983) }, uCenter: { value: new THREE.Vector3() } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.hazeUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      fog: false,
      vertexShader: /* glsl */ `
        varying float vH;
        void main() { vH = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vH;
        void main() {
          // Densest just above the sea line, fading out upward
          float a = (1.0 - smoothstep(-6.0, 70.0, vH)) * smoothstep(-20.0, -4.0, vH);
          gl_FragColor = vec4(uColor, a * 0.32);
        }`
    });
    this.haze = new THREE.Mesh(geo, mat);
    this.haze.name = 'SavannaGoldenHaze';
    this.haze.frustumCulled = false;
    this.haze.renderOrder = -1;
    this.root.add(this.haze);
  }

  // ---- Slow golden dust / pollen motes around the player ----
  _buildPollen() {
    this.pollen = new IslandParticles(this.root, {
      mode: 'sparkle', count: 260, seed: 7717, velocity: [0.18, 0.05, 0.12], size: 2.6,
      colorA: 0xffd88a, colorB: 0xfff3d0, intensity: 1.1, opacity: 0.75, sway: 0.8, box: [56, 12, 56]
    });
  }

  update(delta, playerPos) {
    if (this.pollen) this.pollen.update(delta, playerPos);
    if (this.haze && playerPos) this.haze.position.set(playerPos.x, 0, playerPos.z);
  }
}
