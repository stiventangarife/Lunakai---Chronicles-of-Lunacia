import * as THREE from 'three';
import { GENSHIN_PALETTE, SUN_DIRECTION } from './GenshinArtDirection.js';
import { createSeededRandom, SimplexNoise } from '../MathUtils.js';

/**
 * GenshinMountains — Majestic, soft-hued distant landscape with natural haze.
 *
 *  Layer A (far ring, 2.3–2.9 km): continuous snowy ranges (Dragonspine/Mondstadt mood),
 *          heavily veiled by warm aerial perspective.
 *  Layer B (mid sectors, 0.85–1.25 km): Liyue-style karst pillars rising from the sea,
 *          grouped in the diagonal sectors so the four cardinal sister islands stay visible.
 *
 * Everything uses one lightweight custom shader (half-lambert + snow/grass/rock by slope +
 * height mist + distance haze). No shadows, no fog uniforms → 3 draw calls total.
 */
export class GenshinMountains {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.name = 'GenshinMountains';
    parent.add(this.group);

    this.noise = new SimplexNoise(5150);
    this.rng = createSeededRandom(424242);

    const P = GENSHIN_PALETTE;
    this.uniforms = {
      uSunDir: { value: SUN_DIRECTION.clone() },
      uSunColor: { value: new THREE.Color(P.sunColor) },
      uHaze: { value: new THREE.Color(P.fogColor) },
      uHazeAway: { value: new THREE.Color(P.skyHorizonAway) },
      uRockNear: { value: new THREE.Color(P.mountainNear) },
      uRockFar: { value: new THREE.Color(P.mountainFar) },
      uSnow: { value: new THREE.Color(P.mountainSnow) },
      uGrass: { value: new THREE.Color(P.mountainGrass) },
      uCenter: { value: new THREE.Vector3() }
    };

    this.material = this._createMaterial();
    this._buildFarRanges();
    this._buildKarstPillars();
  }

  _createMaterial(instanced = false) {
    return new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      fog: false,
      vertexShader: /* glsl */ `
        attribute float aLayer;      // 0 = mid karst, 1 = far range
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying float vLayer;
        varying float vHeight;
        void main() {
          vec4 local = vec4(position, 1.0);
          vec3 n = normal;
          #ifdef USE_INSTANCING
            local = instanceMatrix * local;
            n = mat3(instanceMatrix) * n;
          #endif
          vec4 wp = modelMatrix * local;
          vWorld = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * n);
          vLayer = aLayer;
          vHeight = wp.y;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir, uSunColor, uHaze, uHazeAway, uRockNear, uRockFar, uSnow, uGrass, uCenter;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying float vLayer;
        varying float vHeight;
        void main() {
          vec3 N = normalize(vNormalW);
          vec3 L = normalize(uSunDir);
          float ndl = dot(N, L);
          float hl = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
          float cel = smoothstep(0.38, 0.62, hl);           // soft two-tone anime ramp
          float slope = clamp(N.y, 0.0, 1.0);

          vec3 rock = mix(uRockNear, uRockFar, vLayer);
          vec3 base = mix(rock, uGrass, smoothstep(0.55, 0.85, slope) * (1.0 - vLayer) * 0.8);
          float snowLine = mix(150.0, 330.0, vLayer);
          float snow = smoothstep(snowLine, snowLine + 70.0, vHeight + slope * 60.0) * smoothstep(0.35, 0.7, slope + 0.25);
          base = mix(base, uSnow, snow);

          vec3 lit = base * mix(vec3(0.62, 0.68, 0.86), uSunColor * 1.15, cel);

          // Aerial perspective: distance haze + low-altitude mist (valleys glow with warm haze).
          float dist = length(vWorld.xz - uCenter.xz);
          vec2 toPix = normalize(vWorld.xz - uCenter.xz + vec2(1e-4));
          float sunSide = dot(toPix, normalize(uSunDir.xz + vec2(1e-4))) * 0.5 + 0.5;
          vec3 haze = mix(uHazeAway, uHaze, pow(max(sunSide, 1e-4), 1.5));
          float distHaze = mix(0.45, 0.72, vLayer) * smoothstep(600.0, 3000.0, dist) + 0.18;
          float lowMist = 1.0 - smoothstep(0.0, mix(120.0, 260.0, vLayer), vHeight);
          float hazeAmt = clamp(distHaze + lowMist * 0.55, 0.0, 0.94);
          vec3 col = mix(lit, haze, hazeAmt);
          // Rim of light on sun-facing ridges
          col += uSunColor * pow(max(ndl, 1e-4), 6.0) * 0.12 * (1.0 - hazeAmt);

          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    });
  }

  // Ridged noise helper for sharp-but-soft anime ridgelines
  _ridge(x, y, oct = 5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      const n = 1.0 - Math.abs(this.noise.noise2D(x * freq, y * freq));
      sum += n * n * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.05;
    }
    return sum / norm;
  }

  /** Continuous 360° far range: an annulus heightfield in polar coordinates. */
  _buildFarRanges() {
    const segA = 420;          // angular segments
    const segR = 14;           // radial rows
    const rIn = 2250, rOut = 2950;
    const positions = [];
    const layers = [];
    const indices = [];

    for (let i = 0; i <= segA; i++) {
      const a = (i / segA) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Peak envelope along the ring: big massifs + secondary peaks
      const u = (i / segA) * 9.0;
      const env = 0.35 + 0.65 * Math.pow(this._ridge(u * 0.35, 3.1, 4), 1.4);
      for (let j = 0; j <= segR; j++) {
        const t = j / segR;
        const r = rIn + (rOut - rIn) * t;
        // Cross-section bump peaking around t=0.45 so the front slope is visible
        const bump = Math.sin(Math.min(1, t / 0.9) * Math.PI);
        const detail = this._ridge(ca * r * 0.0016 + 11.0, sa * r * 0.0016 - 4.0, 5);
        let h = (80 + env * 560) * bump * (0.55 + 0.6 * detail) - 25;
        if (j === 0 || j === segR) h = -40;
        positions.push(ca * r, h, sa * r);
        layers.push(1.0);
      }
    }
    for (let i = 0; i < segA; i++) {
      for (let j = 0; j < segR; j++) {
        const a = i * (segR + 1) + j;
        const b = (i + 1) * (segR + 1) + j;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aLayer', new THREE.Float32BufferAttribute(layers, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    this.farMesh = new THREE.Mesh(geo, this.material);
    this.farMesh.name = 'GenshinFarRanges';
    this.farMesh.renderOrder = -900;
    this.farMesh.frustumCulled = false; // giant ring — always partially visible
    this.group.add(this.farMesh);
  }

  /** Liyue-style karst pillars (instanced lathe meshes) in the four diagonal sectors. */
  _buildKarstPillars() {
    // Rounded, slightly bulging pillar profile (normalized height 1)
    const pts = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let r = 0.42 * (1.0 - Math.pow(t, 3.2)) + 0.06;
      r *= 1.0 + 0.12 * Math.sin(t * Math.PI * 2.4);
      if (i === steps) r = 0.0;
      pts.push(new THREE.Vector2(Math.max(r, 0.0), t));
    }
    const lathe = new THREE.LatheGeometry(pts, 14);
    // Organic wobble so pillars don't look turned on a lathe
    const pos = lathe.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const w = 1.0 + 0.16 * this.noise.noise2D(x * 3.0 + y * 2.0, z * 3.0 - y);
      pos.setXYZ(i, x * w, y, z * w);
    }
    lathe.computeVertexNormals();
    lathe.setAttribute('aLayer', new THREE.Float32BufferAttribute(new Float32Array(pos.count).fill(0.0), 1));

    const sectors = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const items = [];
    for (const center of sectors) {
      const count = 11 + Math.floor(this.rng() * 5);
      for (let k = 0; k < count; k++) {
        const a = center + (this.rng() - 0.5) * 0.62;
        const r = 860 + this.rng() * 420;
        const h = 120 + Math.pow(this.rng(), 1.5) * 260;
        const w = h * (0.32 + this.rng() * 0.22);
        items.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, h, w, rot: this.rng() * Math.PI * 2 });
      }
    }

    const mesh = new THREE.InstancedMesh(lathe, this._createMaterial(true), items.length);
    mesh.material.uniforms = this.uniforms;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    items.forEach((it, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.rot);
      s.set(it.w, it.h, it.w);
      p.set(it.x, -18, it.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = -890;
    mesh.name = 'GenshinKarstPillars';
    this.karstMesh = mesh;
    this.group.add(mesh);
  }

  update(cameraPos) {
    // The backdrop is parallax-locked to the camera (it is ~kilometres away anyway).
    if (cameraPos) {
      this.group.position.set(cameraPos.x * 0.92, 0, cameraPos.z * 0.92);
      this.uniforms.uCenter.value.set(cameraPos.x, 0, cameraPos.z);
    }
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
