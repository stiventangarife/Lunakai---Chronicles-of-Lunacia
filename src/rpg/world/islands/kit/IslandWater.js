import * as THREE from 'three';
import { GLSL_NOISE } from '../../demo_scena/genshin/GenshinArtDirection.js';
import { GenshinTerrainData } from '../../demo_scena/genshin/GenshinTerrainData.js';
import { applyGenshinOcean } from '../../demo_scena/genshin/GenshinWater.js';

/**
 * IslandWater — Open sea (the Forest's Genshin ocean shader, re-coloured per island) plus
 * flat "water bodies" that read their depth from the baked terrain height texture:
 *   mode 0  water  (oasis, swamp, crater pools)  depth tint, fresnel sky, sun glitter, shore foam
 *   mode 1  ice    (frozen lake)                 translucent cracked ice, frost rim, sky sheen
 *   mode 2  lava   (lava rivers, magma craters)  glowing flow, cooling crust plates (bloom)
 */
export function createIslandOcean(parent, sea) {
  const geo = new THREE.PlaneGeometry(6000, 6000, 80, 80);
  geo.rotateX(-Math.PI / 2);
  const stub = { oceanMesh: new THREE.Mesh(geo, new THREE.MeshBasicMaterial()), oceanMaterial: null };
  const mat = applyGenshinOcean(stub);
  const u = mat.uniforms;
  u.uSunDir.value.copy(sea.sunDir).normalize();
  u.uSunColor.value.set(sea.sunColor);
  u.uShallow.value.set(sea.shallow);
  u.uMid.value.set(sea.mid);
  u.uDeep.value.set(sea.deep);
  u.uFoam.value.set(sea.foam);
  u.uSkyZenith.value.set(sea.skyZenith);
  u.uSkyHorizon.value.set(sea.skyHorizon);
  const mesh = stub.oceanMesh;
  mesh.position.set(0, sea.level ?? 0.45, 0);
  mesh.name = 'IslandOceanMesh';
  mesh.frustumCulled = false;
  parent.add(mesh);
  return { mesh, material: mat };
}

export class IslandWaterBody {
  /**
   * @param {object} o { data (IslandTerrainData), shape: 'disc'|'ribbon', center:[x,z], radius,
   *   points:[[x,z]...], width, level, mode, colors:{shallow, deep, foam, glow, crust}, glow, flowSpeed,
   *   sunDir, sky:{zenith, horizon}, opacity }
   */
  constructor(parent, o) {
    this.o = o;
    const geo = o.shape === 'ribbon' ? this._ribbonGeometry(o) : this._discGeometry(o);
    const c = (h, d) => new THREE.Color(h ?? d);
    this.uniforms = {
      ...THREE.UniformsLib.fog,
      ...o.data.uniforms(),
      uTime: { value: 0 },
      uMode: { value: o.mode || 0 },
      uLevel: { value: o.level },
      uShallow: { value: c(o.colors && o.colors.shallow, 0x6fe6dc) },
      uDeep: { value: c(o.colors && o.colors.deep, 0x177a8f) },
      uFoam: { value: c(o.colors && o.colors.foam, 0xf4fdff) },
      uGlow: { value: c(o.colors && o.colors.glow, 0x000000) },
      uCrust: { value: c(o.colors && o.colors.crust, 0x2a1416) },
      uGlowAmount: { value: o.glow ?? 0 },
      uFlowSpeed: { value: o.flowSpeed ?? 0.0 },
      uOpacity: { value: o.opacity ?? 0.9 },
      uDepthRange: { value: o.depthRange ?? 2.2 },
      uFoamAmount: { value: o.foamAmount ?? 0.6 },
      uSunDir: { value: (o.sunDir || new THREE.Vector3(0.6, 0.5, -0.5)).clone().normalize() },
      uSkyZenith: { value: c(o.sky && o.sky.zenith, 0x3f86d6) },
      uSkyHorizon: { value: c(o.sky && o.sky.horizon, 0xffdcae) }
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: (o.mode || 0) !== 2,
      depthWrite: (o.mode || 0) === 2,
      fog: true,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        attribute vec2 aFlow;
        varying vec3 vWorld;
        varying vec2 vFlow;
        varying float vBaseY;
        uniform float uTime, uMode;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vBaseY = wp.y;
          if (uMode < 0.5) wp.y += sin(wp.x * 0.5 + uTime * 1.4) * 0.025 + cos(wp.z * 0.45 + uTime * 1.1) * 0.025;
          vWorld = wp.xyz;
          vFlow = aFlow;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime, uMode, uLevel, uGlowAmount, uFlowSpeed, uOpacity, uDepthRange, uFoamAmount;
        uniform vec3 uShallow, uDeep, uFoam, uGlow, uCrust, uSunDir, uSkyZenith, uSkyHorizon;
        varying vec3 vWorld;
        varying vec2 vFlow;
        varying float vBaseY;
        ${GLSL_NOISE}
        ${GenshinTerrainData.glsl()}
        void main() {
          vec2 p = vWorld.xz;
          float ground = terrainHeightAt(p);
          float depth = vBaseY - ground;
          if (depth < -0.05) discard;
          vec3 V = normalize(cameraPosition - vWorld);
          vec3 L = normalize(uSunDir);
          vec3 col;
          float alpha = uOpacity;
          // Flow coordinates (ribbons carry a downstream direction; discs drift slowly)
          vec2 fp = p + vFlow * uTime * uFlowSpeed;

          if (uMode < 0.5) {
            // ---------------- Water ----------------
            vec2 a = fp * 0.35 + vec2(uTime * 0.05, uTime * 0.03);
            vec2 b = fp * 1.1 - vec2(uTime * 0.09, -uTime * 0.07);
            float e = 0.12;
            float h = gNoise(a) * 0.7 + gNoise(b) * 0.3;
            float hx = gNoise(a + vec2(e, 0.0)) * 0.7 + gNoise(b + vec2(e, 0.0)) * 0.3;
            float hz = gNoise(a + vec2(0.0, e)) * 0.7 + gNoise(b + vec2(0.0, e)) * 0.3;
            vec3 N = normalize(vec3((h - hx) * 1.6, 1.0, (h - hz) * 1.6));
            float dt = smoothstep(0.05, uDepthRange, depth);
            col = mix(uShallow, uDeep, dt) * (0.92 + 0.16 * h);
            float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0) + 1e-4, 5.0);
            vec3 R = reflect(-V, N);
            vec3 sky = mix(uSkyHorizon, uSkyZenith, smoothstep(0.0, 0.6, R.y));
            col = mix(col, sky, clamp(0.04 + fres * 0.45, 0.0, 0.45));
            float spec = pow(clamp(dot(R, L), 0.0, 1.0) + 1e-4, 140.0);
            col += vec3(1.0, 0.95, 0.85) * smoothstep(0.25, 0.6, spec) * 1.4;
            // Caustic sparkle in the shallows
            float caus = smoothstep(0.55, 0.8, gNoise(fp * 2.2 + uTime * 0.4)) * (1.0 - dt) * 0.25;
            col += uShallow * caus;
            // Shore foam lace
            float shore = 1.0 - smoothstep(0.0, 0.22 + 0.08 * sin(uTime * 1.5 + p.x), depth);
            float lace = smoothstep(0.4, 0.7, gNoise(p * 2.4 + uTime * 0.25));
            col = mix(col, uFoam, shore * (0.4 + 0.6 * lace) * uFoamAmount);
            col += uGlow * uGlowAmount * (0.6 + 0.4 * gNoise(fp * 0.6 + uTime * 0.2)) * (1.0 - dt * 0.5);
            alpha = mix(0.55, uOpacity, dt);
            alpha = max(alpha, shore * 0.9);
          } else if (uMode < 1.5) {
            // ---------------- Ice ----------------
            float n1 = gNoise(p * 0.45);
            float cells = abs(gNoise(p * 0.9 + 4.0) - 0.5);
            float crack = 1.0 - smoothstep(0.0, 0.035, cells);
            float fine = 1.0 - smoothstep(0.0, 0.02, abs(gNoise(p * 3.1 + 9.0) - 0.5));
            float dt = smoothstep(0.1, 2.0, depth);
            col = mix(uShallow, uDeep, dt * 0.85) * (0.9 + 0.2 * n1);
            // Trapped bubbles
            float bub = step(0.985, gHash12(floor(p * 6.0))) * dt;
            col = mix(col, vec3(0.95, 0.99, 1.0), bub * 0.6);
            col = mix(col, vec3(0.97, 0.99, 1.0), crack * 0.7 + fine * 0.25);
            vec3 N = vec3(0.0, 1.0, 0.0);
            float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0) + 1e-4, 4.0);
            vec3 R = reflect(-V, N);
            vec3 sky = mix(uSkyHorizon, uSkyZenith, smoothstep(0.0, 0.6, R.y));
            col = mix(col, sky, fres * 0.45);
            float spec = pow(clamp(dot(R, L), 0.0, 1.0) + 1e-4, 60.0);
            col += vec3(1.0) * smoothstep(0.3, 0.7, spec) * 0.6;
            // Frost rim at the shore
            float rim = 1.0 - smoothstep(0.0, 0.5, depth);
            col = mix(col, uFoam, rim * 0.85);
            alpha = mix(0.9, uOpacity, dt);
          } else {
            // ---------------- Lava ----------------
            vec2 q = fp * 0.32;
            float flow = gFbm3(q + vec2(uTime * 0.03, -uTime * 0.02));
            float plates = gNoise(fp * 0.55 + uTime * 0.01);
            float cracks = 1.0 - smoothstep(0.0, 0.12, abs(gNoise(fp * 0.9 + 2.0) - 0.5));
            float crust = smoothstep(0.42, 0.62, plates) * (1.0 - cracks * 0.9);
            float heat = 0.55 + 0.45 * flow;
            vec3 hot = mix(uShallow, uDeep, smoothstep(0.35, 0.85, flow));
            col = hot * (1.6 + 1.6 * heat);
            col = mix(col, uCrust * (0.8 + 0.4 * flow), crust * 0.92);
            // Edges against rock cool down and crust over
            float edge = 1.0 - smoothstep(0.0, 0.8, depth);
            col = mix(col, uCrust, edge * 0.7);
            col += uGlow * cracks * (1.0 - edge) * 1.2;
            alpha = 1.0;
          }
          gl_FragColor = vec4(max(col, vec3(0.0)), alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `
    });
    this.material.name = 'IslandWaterBody_' + (o.mode || 0);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = o.name || 'IslandWaterBody';
    this.mesh.renderOrder = 1;
    parent.add(this.mesh);
  }

  _discGeometry(o) {
    const g = new THREE.CircleGeometry(o.radius, 64);
    g.rotateX(-Math.PI / 2);
    g.translate(o.center[0], o.level, o.center[1]);
    g.setAttribute('aFlow', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2).fill(0.1), 2));
    return g;
  }

  _ribbonGeometry(o) {
    const pts = o.points.map(([x, z]) => new THREE.Vector2(x, z));
    const curve = pts.length > 2 ? new THREE.SplineCurve(pts) : new THREE.LineCurve(pts[0], pts[1]);
    const n = Math.max(16, Math.ceil(curve.getLength() / 1.5));
    const pos = [], flow = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const c = curve.getPointAt(t);
      const tg = curve.getTangentAt(t);
      const w = (o.width * 0.5) * (0.85 + 0.15 * Math.sin(t * 17.0));
      const nx = -tg.y, nz = tg.x;
      const y = typeof o.level === 'function' ? o.level(t) : o.level;
      pos.push(c.x + nx * w, y, c.y + nz * w, c.x - nx * w, y, c.y - nz * w);
      flow.push(-tg.x, -tg.y, -tg.x, -tg.y);
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }

  update(delta) { this.uniforms.uTime.value += delta; }
}
