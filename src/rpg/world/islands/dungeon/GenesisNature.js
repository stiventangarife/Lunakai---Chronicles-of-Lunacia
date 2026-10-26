import * as THREE from 'three';
import { createSeededRandom } from '../../demo_scena/MathUtils.js';
import { GLSL_NOISE } from '../../demo_scena/genshin/GenshinArtDirection.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';
import { bakeParts, cyl, ball, rod } from './GenesisLandmarks.js';

/**
 * GenesisNature — the natural dressing of Genesis (primitives, baked into a few draw calls):
 *   - lavender layered stone pillars (stacked, slightly offset lumpy drums with a wider cap),
 *     in clusters + single small stacks, with colliders;
 *   - hollow fallen logs, stumps and twig piles of the Ancestral Grove;
 *   - small lavender stones;
 *   - animated foam along the whole coastline.
 */
const LAV = [0x8f86c8, 0x9d92d8, 0xb3a6ea, 0xc4b8f2];
const LAV_DARK = 0x5f5694;
const CAP = 0xd2c4fa;
const WOOD = 0xc8b49a, WOOD_DARK = 0x8a7458, WOOD_IN = 0x5a4632;

/** One lumpy drum (squashed cylinder with radial wobble). */
function drum(r, h, seed, segs = 11) {
  const g = new THREE.CylinderGeometry(r, r * 1.06, h, segs, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.08 * Math.sin(a * 3 + seed) + 0.05 * Math.sin(a * 5 + seed * 2.3);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export class GenesisNature {
  /** ctx = { height, time, freeSpot(x,z,clear), seaLevel, clusters:[[x,z,n,spread]], avoid:[[x,z,r]] } */
  constructor(zone, ctx) {
    this.zone = zone;
    this.ctx = ctx;
    this.height = ctx.height;
    this.root = new THREE.Group();
    this.root.name = 'GenesisNature';
    zone.group.add(this.root);
    this.mat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: getSoftToonRamp() });
    this.mat.name = 'GenesisNatureToon';
    this.rng = createSeededRandom(31337);
    this.pillarCount = 0;
    this._placed = [];
    this._buildPillars();
    this._buildGroveProps();
    this._buildCoastFoam();
  }

  _ok(x, z, clear) {
    if (!this.ctx.freeSpot(x, z, clear)) return false;
    for (const [ax, az, ar] of this.ctx.avoid) if (Math.hypot(x - ax, z - az) < ar + clear) return false;
    return true;
  }

  _addMesh(parts, name, shadows = true) {
    if (!parts.length) return;
    const mesh = new THREE.Mesh(bakeParts(parts), this.mat);
    mesh.name = name;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    this.root.add(mesh);
  }

  // ---------------------------------------------------------------- Lavender layered pillars
  _pillar(parts, x, z, H, R, seed) {
    const rng = createSeededRandom(seed);
    const y0 = this.height(x, z) - 0.3;
    let y = y0;
    const n = Math.max(2, Math.round(H / 1.1));
    let ox = 0, oz = 0;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = R * (1.0 - 0.28 * t) * (0.85 + rng() * 0.3);
      const h = (H / n) * (0.8 + rng() * 0.4);
      ox += (rng() - 0.5) * 0.25 * R; oz += (rng() - 0.5) * 0.25 * R;
      const d = drum(r, h, seed + i);
      d.translate(x + ox, y + h / 2, z + oz);
      parts.push([d, i === 0 ? LAV_DARK : LAV[Math.floor(rng() * LAV.length)]]);
      // thin darker seam between layers
      const seam = drum(r * 0.94, 0.12, seed + i + 50);
      seam.translate(x + ox, y + h - 0.02, z + oz);
      parts.push([seam, LAV_DARK]);
      y += h;
    }
    // Wider mushroom-like cap with a pale top
    const cr = R * (0.95 + rng() * 0.35);
    const cap = drum(cr, 0.8, seed + 99, 12);
    cap.translate(x + ox, y + 0.4, z + oz);
    parts.push([cap, LAV[2]]);
    const top = ball(1, x + ox, y + 0.85, z + oz, cr * 0.95, 0.35, cr * 0.95, 1);
    parts.push([top, CAP]);
    return y;
  }

  _buildPillars() {
    const rng = this.rng;
    const parts = [];
    for (const [cx, cz, n, spread] of this.ctx.clusters) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * spread;
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        const tall = rng() < 0.45;
        const H = tall ? 6 + rng() * 6 : 2 + rng() * 3;
        const R = tall ? 1.4 + rng() * 0.8 : 1.0 + rng() * 0.9;
        if (!this._ok(x, z, R + 1.0)) continue;
        if (this._placed && this._placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + R + 0.8)) continue;
        (this._placed = this._placed || []).push([x, z, R]);
        this._pillar(parts, x, z, H, R, Math.floor(rng() * 1e6));
        this.zone.addCollider(x, z, R * 1.05);
        this.pillarCount++;
        // satellite small stones
        for (let k = 0; k < 2; k++) {
          const aa = rng() * Math.PI * 2, dd = R + 0.8 + rng() * 1.2;
          const sx = x + Math.cos(aa) * dd, sz = z + Math.sin(aa) * dd;
          const s = 0.3 + rng() * 0.45;
          parts.push([ball(1, sx, this.height(sx, sz) + s * 0.2, sz, s * 1.2, s * 0.75, s, 0), LAV[Math.floor(rng() * 4)]]);
        }
        if (this.pillarCount >= 90) break;
      }
    }
    // Small single stacks + loose stones across the island
    for (let i = 0; i < 260; i++) {
      const a = rng() * Math.PI * 2, rr = 18 + rng() * 108;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (!this._ok(x, z, 1.5)) continue;
      if (rng() < 0.25) {
        const R = 0.6 + rng() * 0.5;
        if (this._placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + R + 0.6)) continue;
        this._placed.push([x, z, R]);
        this._pillar(parts, x, z, 1.2 + rng() * 1.6, R, Math.floor(rng() * 1e6));
      } else {
        const s = 0.25 + rng() * 0.45;
        parts.push([ball(1, x, this.height(x, z) + s * 0.15, z, s * 1.3, s * 0.7, s, 0), LAV[Math.floor(rng() * 4)]]);
      }
    }
    this._addMesh(parts, 'GenesisLavenderPillars');
  }

  // ---------------------------------------------------------------- Grove: logs, stumps, twigs
  _buildGroveProps() {
    const rng = this.rng;
    const parts = [];
    const spots = this.ctx.groveSpots;
    let logs = 0, stumps = 0, twigs = 0;
    for (const [cx, cz, spread, count] of spots) {
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * spread;
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (!this._ok(x, z, 1.4)) continue;
        if (this._placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 1.6)) continue;
        const kind = rng();
        const y = this.height(x, z);
        if (kind < 0.4) {
          // Hollow fallen log (open tube with a dark heartwood disc at each end)
          const len = 2.2 + rng() * 2.2, r = 0.32 + rng() * 0.18, rot = rng() * Math.PI;
          const tube = new THREE.CylinderGeometry(r, r * 1.05, len, 10, 1, true);
          tube.rotateZ(Math.PI / 2); tube.rotateY(rot); tube.translate(x, y + r * 0.85, z);
          parts.push([tube, WOOD]);
          for (const s of [-1, 1]) {
            const ring = new THREE.RingGeometry(r * 0.55, r, 10);
            ring.rotateY(Math.PI / 2 * s); ring.rotateY(rot);
            const ex = x + Math.cos(rot) * (len / 2) * s, ez = z - Math.sin(rot) * (len / 2) * s;
            ring.translate(ex, y + r * 0.85, ez);
            parts.push([ring, WOOD_DARK]);
            const inner = new THREE.CircleGeometry(r * 0.55, 10);
            inner.rotateY(Math.PI / 2 * s); inner.rotateY(rot);
            inner.translate(x + Math.cos(rot) * (len / 2 - 0.15) * s, y + r * 0.85, z - Math.sin(rot) * (len / 2 - 0.15) * s);
            parts.push([inner, WOOD_IN]);
          }
          // small branch stubs
          parts.push([rod(0.06, [x, y + r * 1.6, z], [x + Math.cos(rot + 1.2) * 0.4, y + r * 1.6 + 0.45, z - Math.sin(rot + 1.2) * 0.4], 4), WOOD_DARK]);
          // Hito 73: colisión a lo largo de todo el tronco (antes un círculo en el centro: los extremos se atravesaban)
          const nLog = Math.max(2, Math.ceil(len / (r * 1.6)));
          for (let k = 0; k <= nLog; k++) {
            const t = (k / nLog - 0.5) * (len - r * 0.6);
            this.zone.addCollider(x + Math.cos(rot) * t, z - Math.sin(rot) * t, r + 0.08);
          }
          logs++;
        } else if (kind < 0.65) {
          // Stump with rings and roots
          const r = 0.45 + rng() * 0.3, h = 0.5 + rng() * 0.5;
          parts.push([cyl(r, r * 1.2, h, 10, x, y + h / 2 - 0.05, z), WOOD]);
          parts.push([cyl(r * 0.96, r * 0.96, 0.04, 10, x, y + h, z), 0xe4d4b8]);
          parts.push([new THREE.TorusGeometry(r * 0.55, 0.025, 3, 12).rotateX(Math.PI / 2).translate(x, y + h + 0.03, z), WOOD_DARK]);
          for (let k = 0; k < 4; k++) {
            const aa = (k / 4) * Math.PI * 2 + rng();
            parts.push([rod(0.1, [x + Math.cos(aa) * r * 0.8, y + 0.15, z + Math.sin(aa) * r * 0.8], [x + Math.cos(aa) * (r + 0.55), y - 0.05, z + Math.sin(aa) * (r + 0.55)], 5), WOOD]);
          }
          this.zone.addCollider(x, z, r + 0.2);
          stumps++;
        } else {
          // Twig pile
          for (let k = 0; k < 4 + Math.floor(rng() * 3); k++) {
            const aa = rng() * Math.PI, l = 0.5 + rng() * 0.9;
            const tx = x + (rng() - 0.5) * 0.8, tz = z + (rng() - 0.5) * 0.8;
            parts.push([rod(0.035, [tx - Math.cos(aa) * l / 2, y + 0.04, tz - Math.sin(aa) * l / 2], [tx + Math.cos(aa) * l / 2, y + 0.07, tz + Math.sin(aa) * l / 2], 3), k % 2 ? WOOD : WOOD_DARK]);
          }
          twigs++;
        }
      }
    }
    this._addMesh(parts, 'GenesisGroveProps');
    this.groveCounts = { logs, stumps, twigs };
  }

  // ---------------------------------------------------------------- Coast foam
  _coastRadius(a) {
    const sea = this.ctx.seaLevel;
    const ca = Math.cos(a), sa = Math.sin(a);
    let r = 110;
    while (r < 175 && this.height(ca * r, sa * r) > sea) r += 1.0;
    let lo = r - 1.0, hi = r;
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (this.height(ca * m, sa * m) > sea) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  _buildCoastFoam() {
    const N = 720;
    const radii = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) radii[i] = this._coastRadius((i / N) * Math.PI * 2);
    const pos = [], uvs = [], idx = [];
    const y = this.ctx.seaLevel + 0.18;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const rr = (radii[(i + N - 1) % N] + radii[i] * 2 + radii[(i + 1) % N]) / 4;
      const ca = Math.cos(a), sa = Math.sin(a);
      pos.push(ca * (rr - 0.8), y, sa * (rr - 0.8), ca * (rr + 4.5), y, sa * (rr + 4.5));
      uvs.push(i * 0.9, 0, i * 0.9, 1);
      if (i < N) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsLib.fog, uTime: this.ctx.time, uColor: { value: new THREE.Color(0xf4fbff) }, uTint: { value: new THREE.Color(0x9ff0f0) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        varying vec2 vUv; varying vec3 vW;
        void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime; uniform vec3 uColor, uTint; varying vec2 vUv; varying vec3 vW;
        ${GLSL_NOISE}
        void main() {
          float v = vUv.y * 5.3 - 0.8;
          float n = gNoise(vW.xz * 0.35 + uTime * 0.05);
          float n2 = gNoise(vW.xz * 1.3 - uTime * 0.12);
          float swash = 0.35 + 0.35 * sin(uTime * 0.9 + vUv.x * 0.15 + n * 3.0);
          float contact = 1.0 - smoothstep(swash * 0.6, swash * 0.6 + 0.7, v);
          float waves = smoothstep(0.82, 0.96, fract(v * 0.35 + uTime * 0.22 + n * 0.6)) * (1.0 - smoothstep(1.5, 4.2, v));
          float lace = smoothstep(0.35, 0.65, n2);
          float a = max(contact * (0.55 + 0.45 * lace), waves * lace * 0.75) * smoothstep(-0.8, -0.2, v);
          if (a < 0.01) discard;
          gl_FragColor = vec4(mix(uTint, uColor, 0.6 + 0.4 * lace), a * 0.85);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`
    });
    mat.name = 'GenesisShoreFoam';
    const foam = new THREE.Mesh(geo, mat);
    foam.name = 'GenesisShoreFoam';
    foam.renderOrder = 2;
    this.root.add(foam);
  }
}
