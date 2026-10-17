import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { createSeededRandom } from '../../demo_scena/MathUtils.js';
import { GLSL_NOISE } from '../../demo_scena/genshin/GenshinArtDirection.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';
import { IslandParticles } from '../kit/IslandParticles.js';

/**
 * MysticLife — living / glowing dressing of the Mystic improvement plan (all GPU-animated):
 *   - luminescent butterflies (flight + wing flap in the vertex shader, 1 draw call);
 *   - luminous mushrooms, flowers and bushes of the Mystic pack (assets/mystic);
 *   - magical glowing fish swimming in the luminous swamp + fireflies over it;
 *   - glowing vines hanging from the Arcane Tree + magic fireflies rising to the sky;
 *   - small magical pebbles along the sea shore (some faintly emissive);
 *   - animated foam along the whole coastline, where the island meets the sea.
 */
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export class MysticLife {
  /**
   * ctx = { height, time, freeSpot(x,z,clear), pathDist, tree:{x,z}, swamp:{x,z,r,level}, islet:{x,z,r},
   *         treeSpots:[{x,z}], crystalSpots:[{x,z}], seaLevel, coastAvoid:[[x,z,r]] }
   */
  constructor(zone, ctx) {
    this.zone = zone;
    this.ctx = ctx;
    this.height = ctx.height;
    this.time = ctx.time;
    this.root = new THREE.Group();
    this.root.name = 'MysticLife';
    zone.group.add(this.root);
    this._buildButterflies();
    this._buildSwampFish();
    this._buildSwampFireflies();
    this._buildCoast();
  }

  // ------------------------------------------------------------------ Butterflies
  _buildButterflies() {
    const rng = createSeededRandom(9393);
    const n = 64;
    const spots = [];
    let guard = 0;
    while (spots.length < n && guard++ < 2000) {
      let x, z;
      if (spots.length < 14) {        // a few dancing around the Arcane Tree
        const a = rng() * Math.PI * 2, r = 14 + rng() * 12;
        x = this.ctx.tree.x + Math.cos(a) * r; z = this.ctx.tree.z + Math.sin(a) * r;
      } else {
        const a = rng() * Math.PI * 2, r = 12 + rng() * 112;
        x = Math.cos(a) * r; z = Math.sin(a) * r;
      }
      if (!this.ctx.freeSpot(x, z, 2)) continue;
      spots.push([x, z]);
    }
    // Two wings (quads hinged on the body axis = local Z), uv for the procedural wing shape
    const pos = [], uv = [], side = [], idx = [];
    for (const s of [-1, 1]) {
      const b = pos.length / 3;
      pos.push(0, 0, -0.18, s * 0.42, 0, -0.18, s * 0.42, 0, 0.22, 0, 0, 0.22);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      side.push(s, s, s, s);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const base = new THREE.BufferGeometry();
    base.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    base.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    base.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    base.setIndex(idx);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    for (const k of ['position', 'uv', 'aSide']) geo.setAttribute(k, base.attributes[k]);
    const centre = new Float32Array(n * 4);
    const params = new Float32Array(n * 4);
    const color = new Float32Array(n * 3);
    const pal = [0x7ff6ff, 0xff8ae0, 0xc9a0ff, 0x9fffd0, 0xffd27a];
    const c = new THREE.Color();
    spots.forEach(([x, z], i) => {
      centre.set([x, this.height(x, z), z, rng() * 100], i * 4);
      params.set([2.0 + rng() * 3.5, 0.35 + rng() * 0.4, 0.9 + rng() * 1.3, 0.8 + rng() * 0.5], i * 4);   // radius, speed, height, scale
      c.set(pal[i % pal.length]);
      color.set([c.r, c.g, c.b], i * 3);
    });
    geo.setAttribute('aCentre', new THREE.InstancedBufferAttribute(centre, 4));
    geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3));
    geo.instanceCount = spots.length;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsLib.fog, uTime: this.time },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        attribute float aSide;
        attribute vec4 aCentre;
        attribute vec4 aParams;
        attribute vec3 aColor;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vCol;
        void main() {
          float t = uTime * aParams.y + aCentre.w;
          vec3 c = aCentre.xyz + vec3(cos(t) * aParams.x, aParams.z + sin(t * 2.3) * 0.35 + sin(t * 5.1) * 0.12, sin(t * 1.3) * aParams.x * 0.7);
          // Heading from the path derivative
          vec2 vel = vec2(-sin(t) * aParams.x, cos(t * 1.3) * 1.3 * aParams.x * 0.7);
          float yaw = atan(vel.x, vel.y);
          float flap = sin(uTime * 13.0 + aCentre.w * 7.0) * 0.85 + 0.25;
          vec3 p = position * aParams.w;
          float span = abs(p.x);
          p = vec3(aSide * span * cos(flap), span * sin(flap), p.z);
          float cy = cos(yaw), sy = sin(yaw);
          p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
          vUv = uv;
          vCol = aColor;
          vec4 mvPosition = viewMatrix * vec4(c + p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        varying vec2 vUv;
        varying vec3 vCol;
        void main() {
          // Two rounded lobes (fore + hind wing), bright rim, soft inner glow
          vec2 a = (vUv - vec2(0.55, 0.68)) / vec2(0.48, 0.34);
          vec2 b = (vUv - vec2(0.45, 0.25)) / vec2(0.36, 0.26);
          float d = min(dot(a, a), dot(b, b));
          if (d > 1.0) discard;
          float rim = smoothstep(0.55, 1.0, d);
          vec3 col = vCol * (0.7 + 1.6 * rim);
          gl_FragColor = vec4(col, 0.85 * (0.45 + 0.55 * rim));
          #include <fog_fragment>
        }`
    });
    mat.name = 'MysticButterflies';
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'MysticButterflies';
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    this.root.add(mesh);
  }

  // ------------------------------------------------------------------ Luminescent vegetation (Mystic pack)
  /**
   * Mushrooms, flowers and bushes of assets/mystic, made luminous: the caps / petals glow
   * (emissive, pulsing slowly), the stems stay pale, the bushes get a soft inner glow.
   * Clusters around the trees, the crystal clusters and the roots of the Arcane Tree.
   */
  async buildGlowVegetation(loadGLTF) {
    const load = async (name) => {
      const gl = await loadGLTF(`./assets/mystic/${name}.glb`);
      if (!gl) return null;
      gl.scene.updateMatrixWorld(true);
      const parts = [];
      gl.scene.traverse((o) => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        const mname = ((o.material && o.material.name) || '').toLowerCase();
        parts.push({ geo, glow: mname.includes('red') });          // colorRed = cap / petals
      });
      return parts;
    };
    const models = {};
    for (const n of ['mushroom_red', 'mushroom_redTall', 'mushroom_redGroup', 'flower_redA', 'flower_redB', 'plant_bush', 'plant_bushDetailed', 'plant_bushSmall']) models[n] = await load(n);

    const rng = createSeededRandom(4848);
    const capPal = [0x5ff0ff, 0xff7ad8, 0xb88cff, 0x7dffb8, 0xffc06a];
    const petalPal = [0xff9ae0, 0x8ff6ff, 0xd8b0ff, 0xffffff];
    const bushPal = [0x3fbf9a, 0x2fb3c4, 0x9f7ae8, 0x55d1ab];
    const lists = {};
    const push = (name, x, z, s, col) => {
      if (!models[name]) return;
      (lists[name] = lists[name] || []).push({ x, z, s, rot: rng() * Math.PI * 2, col });
    };
    const centres = [];
    this.ctx.treeSpots.forEach((t, i) => { if (i % 2 === 0) centres.push([t.x, t.z, 1.8]); });
    this.ctx.crystalSpots.forEach((c) => centres.push([c.x, c.z, 3.0]));
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.2; centres.push([this.ctx.tree.x + Math.cos(a) * 12.5, this.ctx.tree.z + Math.sin(a) * 12.5, 1.5]); }
    const ok = (x, z) => this.ctx.pathDist(x, z) > 2.4 && Math.hypot(x - this.ctx.swamp.x, z - this.ctx.swamp.z) > this.ctx.swamp.r + 1;
    const mush = ['mushroom_red', 'mushroom_redTall', 'mushroom_redGroup'];
    const flowers = ['flower_redA', 'flower_redB'];
    const bushes = ['plant_bush', 'plant_bushDetailed', 'plant_bushSmall'];
    for (const [cx, cz, off] of centres) {
      const a0 = rng() * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * off, z0 = cz + Math.sin(a0) * off;
      if (!ok(x0, z0)) continue;
      const hue = capPal[Math.floor(rng() * capPal.length)];
      const k = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < k; i++) {
        const x = x0 + (rng() - 0.5) * 1.6, z = z0 + (rng() - 0.5) * 1.6;
        const name = mush[i === 0 ? 2 : Math.floor(rng() * 2)];
        push(name, x, z, (i === 0 ? 6.5 : 4.5) + rng() * 2.5, new THREE.Color(hue).offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.1));
      }
      const nf = 2 + Math.floor(rng() * 3);
      const pet = petalPal[Math.floor(rng() * petalPal.length)];
      for (let i = 0; i < nf; i++) {
        const a = rng() * Math.PI * 2, d = 1.2 + rng() * 1.6;
        const x = x0 + Math.cos(a) * d, z = z0 + Math.sin(a) * d;
        if (ok(x, z)) push(flowers[Math.floor(rng() * 2)], x, z, 2.6 + rng() * 1.2, new THREE.Color(pet));
      }
      if (rng() < 0.7) {
        const a = rng() * Math.PI * 2, d = 1.8 + rng() * 1.4;
        const x = x0 + Math.cos(a) * d, z = z0 + Math.sin(a) * d;
        if (ok(x, z)) push(bushes[Math.floor(rng() * 3)], x, z, 3.2 + rng() * 1.6, new THREE.Color(bushPal[Math.floor(rng() * bushPal.length)]));
      }
    }

    const time = this.time;
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    glowMat.name = 'MysticGlowVegetationEmissive';
    glowMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n uniform float uTime;\n varying float vPulse;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vPulse = 0.8 + 0.25 * sin(uTime * 1.6 + instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 0.7);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n varying float vPulse;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vPulse * 1.25;');
    };
    glowMat.customProgramCacheKey = () => 'mystic-glow-vegetation';
    const stemMat = new THREE.MeshToonMaterial({ color: 0xe6dcff, gradientMap: getSoftToonRamp(), emissive: 0x3a2a6a, emissiveIntensity: 0.45 });
    stemMat.name = 'MysticGlowVegetationStem';
    const flowerStemMat = new THREE.MeshToonMaterial({ color: 0x2f8f7a, gradientMap: getSoftToonRamp(), emissive: 0x0f3a32, emissiveIntensity: 0.5 });
    flowerStemMat.name = 'MysticGlowFlowerStem';
    const bushMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getSoftToonRamp() });
    bushMat.name = 'MysticGlowBush';
    bushMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * 0.42;`);
    };
    bushMat.customProgramCacheKey = () => 'mystic-glow-bush';

    let count = 0;
    for (const [name, list] of Object.entries(lists)) {
      const parts = models[name];
      parts.forEach((part, pi) => {
        const isBush = name.startsWith('plant_');
        const mat = isBush ? bushMat : (part.glow ? glowMat : (name.startsWith('flower') ? flowerStemMat : stemMat));
        const inst = new THREE.InstancedMesh(part.geo, mat, list.length);
        list.forEach((it, i) => {
          _q.setFromEuler(_e.set((rng() - 0.5) * 0.2, it.rot, (rng() - 0.5) * 0.2));
          _m4.compose(_p.set(it.x, this.height(it.x, it.z) - 0.04, it.z), _q, _s.set(it.s, it.s * (0.9 + 0.2 * ((i * 7) % 5) / 5), it.s));
          inst.setMatrixAt(i, _m4);
          if (part.glow || isBush) inst.setColorAt(i, it.col);
        });
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        inst.computeBoundingSphere();
        inst.name = `MysticGlow_${name}_${pi}`;
        inst.castShadow = !part.glow;
        inst.receiveShadow = true;
        this.root.add(inst);
      });
      count += list.length;
    }
    this.vegetationCount = count;
  }

  // ------------------------------------------------------------------ Swamp: magical fish + fireflies
  _buildSwampFish() {
    const S = this.ctx.swamp, I = this.ctx.islet;
    const rng = createSeededRandom(7171);
    const n = 26;
    // Fish body along +X (head) with a tail; aTail marks the tail vertices (they wiggle)
    const body = new THREE.IcosahedronGeometry(1, 1);
    body.scale(0.32, 0.12, 0.09);
    const tail = new THREE.ConeGeometry(0.12, 0.22, 4);
    tail.rotateZ(Math.PI / 2);
    tail.scale(1, 1, 0.3);
    tail.translate(-0.4, 0, 0);
    const parts = [body.toNonIndexed(), tail.toNonIndexed()];
    const geoBase = mergeGeometries(parts.map((g, k) => {
      const o = new THREE.BufferGeometry();
      o.setAttribute('position', g.attributes.position);
      o.setAttribute('aTail', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(k), 1));
      return o;
    }), false);
    const geo = new THREE.InstancedBufferGeometry();
    for (const k of ['position', 'aTail']) geo.setAttribute(k, geoBase.attributes[k]);
    const params = new Float32Array(n * 4);
    const params2 = new Float32Array(n * 4);
    const color = new Float32Array(n * 3);
    const pal = [0x6ff8ff, 0xff8ad8, 0xffd27a, 0xb89cff, 0x8affc8];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = I.r + 2.5 + rng() * (S.r - I.r - 6);
      params.set([S.x, S.z, r, rng() * Math.PI * 2], i * 4);
      // speed (signed), depth below the surface, wobble, scale
      params2.set([(0.12 + rng() * 0.2) * (rng() < 0.5 ? -1 : 1), 0.22 + rng() * 0.25, 1 + rng() * 3, 0.9 + rng() * 0.8], i * 4);
      c.set(pal[i % pal.length]);
      color.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('aP', new THREE.InstancedBufferAttribute(params, 4));
    geo.setAttribute('aQ', new THREE.InstancedBufferAttribute(params2, 4));
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3));
    geo.instanceCount = n;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsLib.fog, uTime: this.time, uLevel: { value: S.level } },
      fog: true,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        attribute float aTail;
        attribute vec4 aP;
        attribute vec4 aQ;
        attribute vec3 aColor;
        uniform float uTime, uLevel;
        varying vec3 vCol;
        varying float vTail;
        void main() {
          float ang = aP.w + uTime * aQ.x;
          float r = aP.z + sin(uTime * 0.3 + aQ.z) * 1.2;
          vec3 c = vec3(aP.x + cos(ang) * r, uLevel - aQ.y, aP.y + sin(ang) * r);
          // Tangent heading (direction of travel)
          vec2 dir = normalize(vec2(-sin(ang), cos(ang)) * sign(aQ.x));
          vec3 p = position * aQ.w;
          p.z += aTail * sin(uTime * 9.0 + aQ.z * 3.0) * 0.08 * (-position.x * 3.0);
          float yaw = atan(-dir.y, dir.x);
          float cy = cos(yaw), sy = sin(yaw);
          p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
          vCol = aColor;
          vTail = aTail;
          vec4 mvPosition = viewMatrix * vec4(c + p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        varying vec3 vCol;
        varying float vTail;
        void main() {
          gl_FragColor = vec4(vCol * (1.5 - 0.5 * vTail), 1.0);
          #include <fog_fragment>
        }`
    });
    mat.toneMapped = false;
    mat.name = 'MysticSwampFish';
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'MysticSwampFish';
    mesh.frustumCulled = false;
    this.root.add(mesh);
  }

  _buildSwampFireflies() {
    const S = this.ctx.swamp;
    const ff = new IslandParticles(this.root, { mode: 'spores', seed: 3131, count: 220, velocity: [0.08, 0.12, 0.05], size: 3.4, colorA: 0xb8ffe8, colorB: 0xfff0a0, intensity: 1.9, opacity: 0.9, sway: 1.2, box: [S.r * 1.9, 6, S.r * 1.9] });
    const centre = new THREE.Vector3(S.x, S.level + 2.2, S.z);
    this.zone.updatables.push((dt) => ff.update(dt, centre));
  }

  // ------------------------------------------------------------------ Coast: foam + magical pebbles
  _coastRadius(a) {
    const sea = this.ctx.seaLevel;
    let lo = 100, hi = 175;
    const ca = Math.cos(a), sa = Math.sin(a);
    // March outward to the first crossing, then bisect
    let r = lo;
    while (r < hi && this.height(ca * r, sa * r) > sea) r += 1.0;
    lo = r - 1.0; hi = r;
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (this.height(ca * m, sa * m) > sea) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  _buildCoast() {
    const N = 720;
    const radii = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) radii[i] = this._coastRadius((i / N) * Math.PI * 2);
    // Light smoothing of the contour (no jitter in the strip)
    const sm = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) {
      let s = 0;
      for (let k = -2; k <= 2; k++) s += radii[(i + k + N) % N];
      sm[i] = s / 5;
    }
    sm[N] = sm[0];
    // Foam strip: from 0.8 m inland (hidden by the beach) to 4 m out to sea
    const pos = [], uvs = [], idx = [];
    const y = this.ctx.seaLevel + 0.18;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const r0 = sm[i] - 0.8, r1 = sm[i] + 4.0;
      pos.push(ca * r0, y, sa * r0, ca * r1, y, sa * r1);
      const u = (i / N) * N * 0.9;
      uvs.push(u, 0, u, 1);
      if (i < N) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsLib.fog, uTime: this.time, uColor: { value: new THREE.Color(0xeef0ff) }, uTint: { value: new THREE.Color(0xb9a8ff) } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        varying vec2 vUv;
        varying vec3 vW;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime;
        uniform vec3 uColor, uTint;
        varying vec2 vUv;
        varying vec3 vW;
        ${GLSL_NOISE}
        void main() {
          float v = (vUv.y * 4.8 - 0.8);                     // metres from the waterline (≈)
          float n = gNoise(vW.xz * 0.35 + uTime * 0.05);
          float n2 = gNoise(vW.xz * 1.3 - uTime * 0.12);
          // Swash: the contact foam runs up and back
          float swash = 0.35 + 0.35 * sin(uTime * 0.9 + vUv.x * 0.15 + n * 3.0);
          float contact = 1.0 - smoothstep(swash * 0.6, swash * 0.6 + 0.7, v);
          // Foam lines rolling in toward the shore
          float waves = smoothstep(0.82, 0.96, fract(v * 0.35 + uTime * 0.22 + n * 0.6));
          waves *= 1.0 - smoothstep(1.5, 3.8, v);
          float lace = smoothstep(0.35, 0.65, n2);
          float a = max(contact * (0.55 + 0.45 * lace), waves * lace * 0.75);
          a *= smoothstep(-0.8, -0.2, v);
          if (a < 0.01) discard;
          vec3 col = mix(uTint, uColor, 0.65 + 0.35 * lace);
          gl_FragColor = vec4(col, a * 0.85);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`
    });
    mat.name = 'MysticShoreFoam';
    const foam = new THREE.Mesh(geo, mat);
    foam.name = 'MysticShoreFoam';
    foam.renderOrder = 2;
    this.root.add(foam);

    // Magical pebbles on the beach band (inland side of the waterline)
    const rng = createSeededRandom(2626);
    const plain = [], glow = [], glowCol = [];
    const pal = [0x7ff6ff, 0xc9a0ff, 0xff9ad8, 0x9fffd0];
    const c = new THREE.Color();
    for (let t = 0; t < 2600 && plain.length + glow.length < 900; t++) {
      const i = Math.floor(rng() * N);
      const a = (i / N) * Math.PI * 2 + (rng() - 0.5) * (Math.PI * 2 / N);
      const r = sm[i] - 0.3 - rng() * 5.5;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = this.height(x, z);
      if (h < this.ctx.seaLevel + 0.05 || h > this.ctx.seaLevel + 3.5) continue;
      if (this.ctx.coastAvoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      const s = 0.08 + rng() * 0.16;
      _q.setFromEuler(_e.set((rng() - 0.5) * 0.4, rng() * 6.28, (rng() - 0.5) * 0.4));
      _m4.compose(_p.set(x, h - s * 0.25, z), _q, _s.set(s * (1 + rng() * 0.6), s * 0.55, s));
      if (rng() < 0.2) {
        glow.push(_m4.clone());
        c.set(pal[Math.floor(rng() * pal.length)]).multiplyScalar(0.8 + rng() * 0.5);
        glowCol.push(c.clone());
      } else plain.push(_m4.clone());
    }
    const pebble = new THREE.IcosahedronGeometry(1, 0);
    const plainMat = new THREE.MeshToonMaterial({ color: 0x8a84b8, gradientMap: getSoftToonRamp() });
    plainMat.name = 'MysticPebbles';
    const pm = new THREE.InstancedMesh(pebble, plainMat, plain.length);
    plain.forEach((m, i) => pm.setMatrixAt(i, m));
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    glowMat.name = 'MysticGlowPebbles';
    const gm = new THREE.InstancedMesh(pebble, glowMat, glow.length);
    glow.forEach((m, i) => { gm.setMatrixAt(i, m); gm.setColorAt(i, glowCol[i]); });
    [pm, gm].forEach((m) => { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); this.root.add(m); });
    if (gm.instanceColor) gm.instanceColor.needsUpdate = true;
    pm.name = 'MysticPebbles';
    gm.name = 'MysticGlowPebbles';
    pm.receiveShadow = true;
    this.pebbleCount = plain.length + glow.length;
  }
}

/**
 * Glowing vines (lianas) hanging from the Arcane Tree canopy, swaying in the wind (same look as
 * the swamp willow strands, no beads) + magic fireflies rising from the ground to the sky.
 * Called from the profile build hook (the tree meshes exist by then).
 */
export function buildArcaneTreeVines(layer, zone, ctx) {
  const trees = layer.trees;
  if (!trees) return;
  const foliage = trees.meshes.find((m) => /^IslandTreeFoliage_arcane_/.test(m.name || ''));
  if (!foliage) return;
  const inst = new THREE.Matrix4();
  foliage.getMatrixAt(0, inst);
  const geo = foliage.geometry;
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const p = geo.attributes.position;
  const rng = createSeededRandom(1414);
  const yLo = bb.min.y + (bb.max.y - bb.min.y) * 0.03, yHi = bb.min.y + (bb.max.y - bb.min.y) * 0.42;
  const picks = [];
  const v = new THREE.Vector3();
  for (let t = 0; t < 9000 && picks.length < 150; t++) {
    const i = Math.floor(rng() * p.count);
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    if (v.y < yLo || v.y > yHi) continue;
    if (Math.hypot(v.x, v.z) < 5) continue;
    v.applyMatrix4(inst);
    if (picks.some((q) => q.distanceTo(v) < 1.3)) continue;
    picks.push(v.clone());
  }
  // Thin tapered strand, top at y = 0, hanging down to y = -1 (scaled by the vine length)
  const strand = new THREE.CylinderGeometry(0.07, 0.035, 1, 3, 8, true);
  strand.translate(0, -0.5, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  mat.name = 'MysticArcaneVines';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = ctx.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n uniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float k = -position.y;                              // 0 at the canopy, 1 at the tip
          float len = length(instanceMatrix[1].xyz);          // vine length (m)
          float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.53;
          // Wind: slow sway + a smaller gust ripple travelling down the vine (in local units)
          float sway = sin(uTime * 0.9 + ph) * 0.09 + sin(uTime * 2.3 + ph * 1.7 - k * 3.0) * 0.025;
          float sway2 = cos(uTime * 0.7 + ph * 1.3) * 0.07;
          transformed.x += sway * k * k * len;
          transformed.z += sway2 * k * k * len;
        }`);
  };
  mat.customProgramCacheKey = () => 'mystic-arcane-vine';
  const pal = [0x8ff6ff, 0x9fffe0, 0xd8b0ff, 0xff9ad8];
  const mesh = new THREE.InstancedMesh(strand, mat, picks.length);
  const c = new THREE.Color();
  picks.forEach((q, i) => {
    const len = 4 + rng() * 10;
    _m4.compose(q.clone().add(new THREE.Vector3(0, 0.3, 0)), _q.identity(), _s.set(1, len, 1));
    mesh.setMatrixAt(i, _m4);
    mesh.setColorAt(i, c.set(pal[i % pal.length]).multiplyScalar(0.4 + rng() * 0.3));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = 'MysticArcaneVines';
  layer.root.add(mesh);
  // Magic fireflies rising from the ground around the tree up past the canopy
  const base = ctx.height(ctx.tree.x, ctx.tree.z);
  const rise = new IslandParticles(layer.root, { mode: 'spores', seed: 5757, count: 280, velocity: [0.0, 1.5, 0.0], size: 3.4, colorA: 0xfff0a0, colorB: 0x9ff6ff, intensity: 2.0, opacity: 0.95, sway: 1.1, box: [44, 58, 44] });
  const centre = new THREE.Vector3(ctx.tree.x, base, ctx.tree.z);
  layer.updatables.push((dt) => rise.update(dt, centre));
  zone.arcaneVineCount = picks.length;
}
