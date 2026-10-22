import * as THREE from 'three';
import { mergeGeometries } from '../../../../vendor/utils/BufferGeometryUtils.js';
import { createSeededRandom } from '../demo_scena/MathUtils.js';
import { getSoftToonRamp } from '../demo_scena/genshin/GenshinMaterials.js';

/**
 * SavannaGenshinOasis — richer summit oasis (Hunter Zarek's spot), built from primitives:
 *   - shore plants: cattails, papyrus clumps and water lilies with flowers on the water
 *   - animated foam that laps against the real shoreline (contour sampled from the terrain)
 *   - stylised fish (orange / gold / silver) swimming under the surface
 * Replaces the legacy stick reeds and cone fish shadows of SavannaWaterManager.
 */
const OASIS = { x: 14, z: -12 };

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getSoftToonRamp(), ...opts });
}

function colored(g, color) {
  const geo = g.index ? g.toNonIndexed() : g;
  const n = geo.attributes.position.count;
  const c = new THREE.Color(color);
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

export class SavannaGenshinOasis {
  constructor(art) {
    this.art = art;
    this.zone = art.zone;
    const t = this.zone.terrain;
    this.level = t.oasisWaterLevel;
    this.root = new THREE.Group();
    this.root.name = 'SavannaGenshinOasis';
    art.layer.root.add(this.root);
    this.time = 0;

    this._sampleShore();
    this._hideLegacy();
    this._buildFoam();
    this._buildPlants();
    this._buildFish();
  }

  /** Shoreline radius every 2.8° around the oasis centre (where the ground rises above the water). */
  _sampleShore() {
    const t = this.zone.terrain;
    const N = 128;
    this.shore = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      let r = 2;
      while (r < 24 && t.getHeight(OASIS.x + Math.cos(a) * r, OASIS.z + Math.sin(a) * r) < this.level) r += 0.1;
      this.shore[i] = r;
    }
  }

  shoreAt(a) {
    const N = this.shore.length;
    const f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * N;
    const i = Math.floor(f) % N, j = (i + 1) % N;
    return this.shore[i] + (this.shore[j] - this.shore[i]) * (f - Math.floor(f));
  }

  _hideLegacy() {
    const wm = this.zone.waterManager;
    if (!wm) return;
    if (wm.reedsGroup) this.art._hide(wm.reedsGroup);
    (wm.fishes || []).forEach((f) => this.art._hide(f.mesh));
  }

  // ---- Shore foam: a strip along the contour, lapping in and out ----
  _buildFoam() {
    const N = 192, inner = 1.6, outer = 0.35;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = this.shoreAt(a);
      const cx = Math.cos(a), cz = Math.sin(a);
      pos.push(OASIS.x + cx * (r - inner), this.level + 0.025, OASIS.z + cz * (r - inner));
      pos.push(OASIS.x + cx * (r + outer), this.level + 0.025, OASIS.z + cz * (r + outer));
      uv.push(i / N, 0, i / N, 1);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const bandStart = inner / (inner + outer);
    this.foamUniforms = { uTime: { value: 0 }, uShore: { value: bandStart } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.foamUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uShore;
        varying vec2 vUv;
        float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
        float n1(float x) { float i = floor(x), f = fract(x); return mix(h(i), h(i + 1.0), f * f * (3.0 - 2.0 * f)); }
        void main() {
          float along = vUv.x * 160.0;
          // Two lapping waves running toward the shore (v → 1) and sliding back
          float lap = 0.5 + 0.5 * sin(uTime * 1.3 + n1(along * 0.35) * 3.0);
          float edge = uShore - 0.36 + lap * 0.2;   // foam line rides 0.3–0.7 m inside the waterline
          float line = 1.0 - smoothstep(0.05, 0.16, abs(vUv.y - edge));
          float wash = smoothstep(edge - 0.32, edge, vUv.y) * (1.0 - smoothstep(edge, edge + 0.04, vUv.y));
          float lace = n1(along * 1.7 + uTime * 0.6) * n1(along * 0.6 - uTime * 0.4 + vUv.y * 9.0);
          float second = 1.0 - smoothstep(0.02, 0.09, abs(vUv.y - (edge - 0.24 - 0.06 * sin(uTime * 1.3 + 1.7))));
          float a = clamp(line + wash * (0.25 + lace) * 0.6 + second * 0.5 * (0.4 + lace), 0.0, 1.0);
          a *= smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(uShore + 0.12, 1.0, vUv.y));
          gl_FragColor = vec4(vec3(0.97, 1.0, 0.98), a);
        }`
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'SavannaOasisFoam';
    mesh.renderOrder = 2;
    this.root.add(mesh);
  }

  // ---- Plants: cattails + papyrus on the shore, lilies on the water ----
  _buildPlants() {
    const t = this.zone.terrain;
    const rng = createSeededRandom(77331);
    const mat = toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide });

    // Cattail clump: 5 thin leaves + 3 stems with brown heads
    const cat = [];
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.ConeGeometry(0.05, 1.3 + (i % 3) * 0.25, 3);
      leaf.translate(0, 0.65, 0); leaf.rotateZ((i - 2) * 0.13); leaf.rotateY(i * 1.3);
      cat.push(colored(leaf, i % 2 ? 0x6f9c3a : 0x88b24a));
    }
    for (let i = 0; i < 3; i++) {
      const sx = (i - 1) * 0.12, h = 1.5 + i * 0.18;
      cat.push(colored(new THREE.CylinderGeometry(0.018, 0.022, h, 4).translate(sx, h / 2, (i % 2) * 0.08), 0x7d9a3e));
      cat.push(colored(new THREE.CapsuleGeometry(0.055, 0.28, 2, 6).translate(sx, h + 0.06, (i % 2) * 0.08), 0x7a4a26));
    }
    const catGeo = mergeGeometries(cat, false);

    // Papyrus clump: stems with a drooping umbrella of fronds
    const pap = [];
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.3, lean = 0.12, h = 1.9 + (i % 2) * 0.4;
      const ox = Math.sin(a) * lean * h, oz = Math.cos(a) * lean * h;
      pap.push(colored(new THREE.CylinderGeometry(0.02, 0.03, h, 4).translate(0, h / 2, 0).rotateX(Math.cos(a) * lean).rotateZ(-Math.sin(a) * lean), 0x6d9a3a));
      // Firework-like umbrella of thin fronds at the top of each stem
      for (let k = 0; k < 11; k++) {
        const fr = new THREE.ConeGeometry(0.022, 0.5, 3);
        fr.translate(0, 0.25, 0);
        fr.rotateZ(0.95 + (k % 3) * 0.18);
        fr.rotateY((k / 11) * Math.PI * 2 + a);
        fr.translate(ox, h, oz);
        pap.push(colored(fr, k % 2 ? 0x9cc04a : 0xb5cf5a));
      }
    }
    const papGeo = mergeGeometries(pap, false);

    const catM = [], papM = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < 70; i++) {
      const a = rng() * Math.PI * 2;
      const r = this.shoreAt(a) + (rng() - 0.65) * 1.4;
      const x = OASIS.x + Math.cos(a) * r, z = OASIS.z + Math.sin(a) * r;
      const y = Math.max(t.getHeight(x, z), this.level - 0.25);
      const k = 0.8 + rng() * 0.5;
      e.set((rng() - 0.5) * 0.12, rng() * Math.PI * 2, (rng() - 0.5) * 0.12);
      m4.compose(p.set(x, y - 0.05, z), q.setFromEuler(e), s.set(k, k * (0.9 + rng() * 0.3), k));
      (i % 3 === 0 ? papM : catM).push(m4.clone());
    }
    const mk = (geo, list, name) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((mm, i) => im.setMatrixAt(i, mm));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = true;
      im.receiveShadow = true;
      im.name = name;
      this.root.add(im);
    };
    mk(catGeo, catM, 'SavannaOasisCattails');
    mk(papGeo, papM, 'SavannaOasisPapyrus');

    // Water lilies: notched pads + a few pink/white flowers (drawn after the transparent water)
    const pad = new THREE.CircleGeometry(0.42, 14, 0.35, Math.PI * 2 - 0.7);
    pad.rotateX(-Math.PI / 2);
    const padGeo = colored(pad, 0x5f9e3c);
    const flw = [];
    for (let i = 0; i < 6; i++) {
      const petal = new THREE.ConeGeometry(0.07, 0.24, 4);
      petal.rotateZ(Math.PI / 2 - 0.5); petal.translate(0.1, 0.07, 0); petal.rotateY((i / 6) * Math.PI * 2);
      flw.push(colored(petal, i % 2 ? 0xffb3c8 : 0xfff2f6));
    }
    flw.push(colored(new THREE.SphereGeometry(0.05, 6, 4).translate(0, 0.09, 0), 0xffd24a));
    const flowerGeo = mergeGeometries(flw, false);
    const lilyMat = toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide, transparent: true });
    lilyMat.forceSinglePass = true; // opaco (opacidad 1): una pasada en lugar de dos, mismo aspecto
    const padM = [], flM = [];
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2;
      const r = this.shoreAt(a) * (0.45 + rng() * 0.42);
      const x = OASIS.x + Math.cos(a) * r, z = OASIS.z + Math.sin(a) * r;
      const k = 0.7 + rng() * 0.7;
      m4.compose(p.set(x, this.level + 0.03, z), q.setFromEuler(e.set(0, rng() * Math.PI * 2, 0)), s.set(k, 1, k));
      padM.push(m4.clone());
      if (rng() < 0.4) { m4.compose(p.set(x + 0.08, this.level + 0.04, z), q, s.set(k * 1.1, k * 1.1, k * 1.1)); flM.push(m4.clone()); }
    }
    const mkW = (geo, list, name) => {
      const im = new THREE.InstancedMesh(geo, lilyMat, list.length);
      list.forEach((mm, i) => im.setMatrixAt(i, mm));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.renderOrder = 2;
      im.name = name;
      this.root.add(im);
    };
    mkW(padGeo, padM, 'SavannaOasisLilyPads');
    if (flM.length) mkW(flowerGeo, flM, 'SavannaOasisLilyFlowers');
  }

  // ---- Fish: 12 stylised fish wandering under the surface ----
  _buildFish() {
    const body = new THREE.SphereGeometry(0.13, 10, 6);
    body.scale(0.85, 0.75, 2.4);
    const tail = new THREE.ConeGeometry(0.14, 0.26, 4);
    tail.rotateX(Math.PI / 2); tail.scale(0.25, 1.0, 1.0); tail.translate(0, 0, -0.38); // punta hacia el cuerpo, aleta abierta hacia atrás (19-oct)
    const fin = new THREE.ConeGeometry(0.06, 0.16, 3);
    fin.translate(0, 0.1, 0.02);
    const geo = mergeGeometries([body.toNonIndexed(), tail.toNonIndexed(), fin.toNonIndexed()], false);
    // Fish are drawn after the transparent water, with a water tint, so they read as submerged
    const mat = toon(0xffffff, { transparent: true, opacity: 0.85 });
    const palette = [0xff8a3a, 0xffb347, 0xf6f0e6, 0xff6a3a, 0xe8c070, 0xc9d2d8];
    const tint = new THREE.Color(0x2fb7b0);
    const count = 12;
    this.fish = new THREE.InstancedMesh(geo, mat, count);
    this.fish.name = 'SavannaOasisFish';
    this.fish.renderOrder = 2;
    this.fish.frustumCulled = false;
    const rng = createSeededRandom(90517);
    this.fishData = [];
    for (let i = 0; i < count; i++) {
      const c = new THREE.Color(palette[i % palette.length]).lerp(tint, 0.3);
      this.fish.setColorAt(i, c);
      this.fishData.push({ phase: rng() * Math.PI * 2, speed: (0.18 + rng() * 0.16) * (rng() < 0.5 ? 1 : -1), rf: 0.3 + rng() * 0.4, wob: rng() * 10, depth: 0.12 + rng() * 0.12, k: 0.8 + rng() * 0.5 });
    }
    this.fish.instanceColor.needsUpdate = true;
    this.root.add(this.fish);
    this._m4 = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this._updateFish(0);
  }

  _fishPos(d, t, out) {
    const a = d.phase + t * d.speed;
    const r = this.shoreAt(a) * (d.rf + 0.12 * Math.sin(t * 0.37 + d.wob));
    out.set(OASIS.x + Math.cos(a) * r, this.level - d.depth, OASIS.z + Math.sin(a) * r);
    return out;
  }

  _updateFish(t) {
    const p2 = new THREE.Vector3();
    this.fishData.forEach((d, i) => {
      this._fishPos(d, t, this._p);
      this._fishPos(d, t + 0.1, p2);
      const yaw = Math.atan2(p2.x - this._p.x, p2.z - this._p.z) + Math.sin(t * 9 + d.wob) * 0.18;
      this._e.set(0, yaw, 0);
      this._m4.compose(this._p, this._q.setFromEuler(this._e), this._s.setScalar(d.k));
      this.fish.setMatrixAt(i, this._m4);
    });
    this.fish.instanceMatrix.needsUpdate = true;
  }

  update(delta) {
    this.time += delta;
    this.foamUniforms.uTime.value = this.time;
    this._updateFish(this.time);
  }
}
