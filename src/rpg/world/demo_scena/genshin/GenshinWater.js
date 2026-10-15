import * as THREE from 'three';
import { GENSHIN_PALETTE, SUN_DIRECTION, GLSL_NOISE } from './GenshinArtDirection.js';
import { WaterManager } from '../WaterManager.js';

/**
 * GenshinWater — Natural, shimmering, translucent river.
 *
 *  - Real depth per vertex (water height − baked terrain height) drives colour AND opacity:
 *    crystal-clear turquoise shallows that reveal the river bed, deep teal in the channel.
 *  - Flow-aligned normal ripples (two scrolling noise layers) + faster flow in the rapids.
 *  - Fresnel sky reflection, sharp anime sun glints and twinkling sparkles.
 *  - Soft white foam: bank contact foam, stretched flow streaks and white water in the rapids.
 *  - Painterly caustic shimmer in shallow water.
 *
 * Drop-in replacement: it keeps the uniforms WaterManager.update()/setters already write
 * (uTime, uFoamIntensity, uToonSpecEnabled), so no other system needs to change.
 */
export function applyGenshinRiver(waterManager, terrain) {
  const river = waterManager.group.getObjectByName('ContinuousRiverMesh');
  if (!river) return null;

  // Bake depth per vertex
  const pos = river.geometry.attributes.position;
  const depth = new Float32Array(pos.count);
  const edge = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ground = terrain.getHeight(x, z);
    depth[i] = Math.max(0, y - ground);
    const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(z);
    edge[i] = THREE.MathUtils.clamp(1.0 - Math.abs(x - riverCenterX) / Math.max(riverHalfWidth, 0.001), 0, 1);
  }
  river.geometry.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
  river.geometry.setAttribute('aCenter', new THREE.BufferAttribute(edge, 1));

  const mat = createGenshinRiverMaterial();
  const old = river.material;
  river.material = mat;
  river.renderOrder = 2;
  waterManager.waterMaterialUpper = mat;
  waterManager.waterMaterialLower = mat;
  waterManager.genshinLegacyRiverMaterial = old;
  return mat;
}

export function createGenshinRiverMaterial() {
  const P = GENSHIN_PALETTE;
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: {
      ...THREE.UniformsLib.fog,
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIRECTION.clone() },
      uSunColor: { value: new THREE.Color(P.sunColor) },
      uShallow: { value: new THREE.Color(P.waterShallow) },
      uMid: { value: new THREE.Color(P.waterMid) },
      uDeep: { value: new THREE.Color(P.waterDeep) },
      uFoam: { value: new THREE.Color(P.waterFoam) },
      uBed: { value: new THREE.Color(0xc9b98a) },
      uSkyZenith: { value: new THREE.Color(P.skyZenith) },
      uSkyHorizon: { value: new THREE.Color(P.skyHorizon) },
      uFoamIntensity: { value: 1.0 },
      uToonSpecEnabled: { value: 1.0 }
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      attribute float aDepth;
      attribute float aCenter;
      uniform float uTime;
      varying vec3 vWorld;
      varying float vDepth;
      varying float vCenter;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.6 + uTime * 1.6 + p.z * 0.25) * 0.025 + cos(p.z * 0.45 - uTime * 2.1) * 0.025;
        p.y += w * smoothstep(0.1, 0.8, aDepth);
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        vDepth = aDepth;
        vCenter = aCenter;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime, uFoamIntensity, uToonSpecEnabled;
      uniform vec3 uSunDir, uSunColor, uShallow, uMid, uDeep, uFoam, uBed, uSkyZenith, uSkyHorizon;
      varying vec3 vWorld;
      varying float vDepth;
      varying float vCenter;
      ${GLSL_NOISE}

      void main() {
        // Flow runs toward +Z (spring in the north → bay in the south). Rapids around z∈[14,36].
        float rapids = smoothstep(10.0, 18.0, vWorld.z) * (1.0 - smoothstep(32.0, 40.0, vWorld.z));
        float speed = mix(1.1, 3.2, rapids);
        vec2 p = vWorld.xz;
        vec2 f1 = vec2(p.x * 0.55, p.y * 0.22 - uTime * speed * 0.55);
        vec2 f2 = vec2(p.x * 1.3 + 3.1, p.y * 0.6 - uTime * speed * 0.9);

        // Ripple normal from noise gradients (finite differences)
        float e = 0.08;
        float h0 = gNoise(f1) * 0.6 + gNoise(f2) * 0.4;
        float hx = gNoise(f1 + vec2(e, 0.0)) * 0.6 + gNoise(f2 + vec2(e, 0.0)) * 0.4;
        float hz = gNoise(f1 + vec2(0.0, e)) * 0.6 + gNoise(f2 + vec2(0.0, e)) * 0.4;
        float strength = mix(0.55, 1.4, rapids);
        vec3 N = normalize(vec3((h0 - hx) * strength * 4.0, 1.0, (h0 - hz) * strength * 4.0));
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 L = normalize(uSunDir);

        // ---- Body colour & translucency by real depth ----
        float d = vDepth;
        vec3 body = mix(uShallow, uMid, smoothstep(0.05, 0.75, d));
        body = mix(body, uDeep, smoothstep(0.75, 1.8, d));
        // River bed showing through the shallows (warm sand / pebbles)
        float bedVis = 1.0 - smoothstep(0.0, 0.55, d);
        body = mix(body, uBed * 1.05, bedVis * 0.45);

        // Painterly caustics in the shallows
        vec2 cp = p * 0.9 + vec2(0.0, -uTime * 0.6);
        float c1 = abs(gNoise(cp) - 0.5);
        float c2 = abs(gNoise(cp * 1.7 + 5.0) - 0.5);
        float caustic = (1.0 - smoothstep(0.0, 0.07, min(c1, c2))) * (1.0 - smoothstep(0.15, 0.9, d));
        body += vec3(0.9, 1.0, 0.95) * caustic * 0.28;

        // Diffuse sun on the surface (very soft) + sky fresnel reflection
        float ndl = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = body * (0.72 + 0.38 * ndl) * mix(vec3(1.0), uSunColor, 0.25);
        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0) + 1e-4, 4.0);
        vec3 R = reflect(-V, N);
        vec3 skyRef = mix(mix(uSkyHorizon, uSkyZenith, 0.55), uSkyZenith, smoothstep(0.0, 0.6, R.y));
        col = mix(col, skyRef, clamp(fres * 0.6 + 0.04, 0.0, 0.6));

        // ---- Sun glint + sparkles ----
        if (uToonSpecEnabled > 0.5) {
          float spec = pow(clamp(dot(R, L), 0.0, 1.0) + 1e-4, 220.0);
          col += uSunColor * smoothstep(0.25, 0.6, spec) * 2.2;
          // twinkling sparkles on ripple crests
          vec2 sc = floor(p * 3.0);
          float tw = gHash12(sc + floor(uTime * 6.0));
          float crest = smoothstep(0.62, 0.8, h0);
          float sparkle = step(0.965, tw) * crest * pow(clamp(dot(R, L), 0.0, 1.0) + 1e-4, 12.0);
          col += vec3(1.0, 0.97, 0.88) * sparkle * 3.0;
        }

        // ---- Foam ----
        float bankFoam = 1.0 - smoothstep(0.02, 0.22 + gNoise(p * 1.4 + uTime * 0.4) * 0.12, d);
        float streakN = gNoise(vec2(p.x * 1.6, p.y * 0.12 - uTime * speed * 0.7));
        float streaks = smoothstep(0.72, 0.86, streakN) * mix(0.25, 0.9, rapids) * smoothstep(0.1, 0.5, d);
        float white = rapids * smoothstep(0.45, 0.75, gNoise(vec2(p.x * 0.9, p.y * 0.5 - uTime * 3.5)));
        float foam = clamp((bankFoam * 0.85 + streaks + white * 0.85) * uFoamIntensity, 0.0, 1.0);
        // soft painterly foam edge
        foam = smoothstep(0.15, 0.65, foam);
        col = mix(col, uFoam * (0.9 + 0.2 * ndl), foam * 0.92);

        // ---- Alpha: clear shallows → opaque channel, foam always visible ----
        float alpha = mix(0.38, 0.93, smoothstep(0.0, 1.1, d));
        alpha = max(alpha, foam * 0.95);
        alpha = max(alpha, fres * 0.75);
        // fade the very thin edge so no hard line appears against the bank
        alpha *= smoothstep(0.0, 0.05, d) * 0.8 + 0.2 * smoothstep(0.0, 0.02, d);

        col = max(col, vec3(0.0));
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `
  });
}

/**
 * Genshin open sea around the island: turquoise shallows → sapphire depths, soft rolling
 * normals, fresnel sky reflection, a glittering sun path and a single soft surf ribbon.
 * Keeps the legacy uniforms (uTime) and the island cut-out radius (136.5 m).
 */
export function applyGenshinOcean(waterManager) {
  if (!waterManager || !waterManager.oceanMesh) return null;
  const P = GENSHIN_PALETTE;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: {
      ...THREE.UniformsLib.fog,
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIRECTION.clone() },
      uSunColor: { value: new THREE.Color(P.sunColor) },
      uShallow: { value: new THREE.Color(0x58d6d2) },
      uMid: { value: new THREE.Color(0x2a9fbe) },
      uDeep: { value: new THREE.Color(0x1d5f9a) },
      uFoam: { value: new THREE.Color(P.waterFoam) },
      uSkyZenith: { value: new THREE.Color(P.skyZenith) },
      uSkyHorizon: { value: new THREE.Color(P.skyHorizon) }
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      uniform float uTime;
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float d = length(wp.xz);
        float calm = smoothstep(136.5, 160.0, d);
        wp.y += (sin(wp.x * 0.03 + uTime * 0.9) * 0.08 + cos(wp.z * 0.035 - uTime * 0.7) * 0.07) * calm;
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec3 uSunDir, uSunColor, uShallow, uMid, uDeep, uFoam, uSkyZenith, uSkyHorizon;
      varying vec3 vWorld;
      ${GLSL_NOISE}
      void main() {
        float d = length(vWorld.xz);
        if (d < 136.5) discard;
        vec2 p = vWorld.xz;
        // Soft rolling normals (two scales)
        vec2 a = p * 0.045 + vec2(uTime * 0.05, uTime * 0.03);
        vec2 b = p * 0.17 - vec2(uTime * 0.11, -uTime * 0.07);
        float e = 0.15;
        float h = gNoise(a) * 0.7 + gNoise(b) * 0.3;
        float hx = gNoise(a + vec2(e, 0.0)) * 0.7 + gNoise(b + vec2(e, 0.0)) * 0.3;
        float hz = gNoise(a + vec2(0.0, e)) * 0.7 + gNoise(b + vec2(0.0, e)) * 0.3;
        vec3 N = normalize(vec3((h - hx) * 2.2, 1.0, (h - hz) * 2.2));
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 L = normalize(uSunDir);

        // Depth colour by distance from the shore (shallow lagoon ring → open sea)
        float shelf = smoothstep(138.0, 175.0, d + (gNoise(p * 0.03) - 0.5) * 18.0);
        vec3 col = mix(uShallow, uMid, shelf);
        col = mix(col, uDeep, smoothstep(175.0, 420.0, d));
        col *= 0.9 + 0.2 * h;

        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0) + 1e-4, 5.0);
        vec3 R = reflect(-V, N);
        vec3 sky = mix(mix(uSkyHorizon, uSkyZenith, 0.6), uSkyZenith, smoothstep(0.0, 0.5, R.y));
        col = mix(col, sky, clamp(0.06 + fres * 0.55, 0.0, 0.55));

        // Sun glitter path
        float spec = pow(clamp(dot(R, L), 0.0, 1.0) + 1e-4, 160.0);
        col += uSunColor * smoothstep(0.2, 0.55, spec) * 1.8;
        float glint = step(0.97, gHash12(floor(p * 2.0) + floor(uTime * 5.0))) * pow(clamp(dot(R, L), 0.0, 1.0) + 1e-4, 18.0);
        col += vec3(1.0, 0.95, 0.85) * glint * 2.2;

        // One soft surf ribbon + gentle swash at the beach
        float coastN = (gNoise(vec2(atan(vWorld.z, vWorld.x + 1e-5) * 12.0, uTime * 0.2)) - 0.5) * 3.0;
        float r = d - 137.0 + coastN;
        float swash = 1.0 - smoothstep(0.0, 2.6 + sin(uTime * 1.3) * 0.8, r);
        float roll = sin(uTime * 1.6 - r * 0.55) * 0.5 + 0.5;
        float ribbon = smoothstep(0.82, 0.95, roll) * (1.0 - smoothstep(4.0, 16.0, r));
        float lace = smoothstep(0.45, 0.7, gNoise(p * 0.9 + uTime * 0.3));
        float foam = clamp(swash * 0.9 + ribbon * lace * 0.8, 0.0, 1.0);
        col = mix(col, uFoam, foam);

        float alpha = mix(0.55, 0.95, smoothstep(137.0, 150.0, d));
        alpha = max(alpha, foam);
        alpha *= smoothstep(136.5, 138.5, d);
        gl_FragColor = vec4(max(col, vec3(0.0)), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `
  });
  waterManager.genshinLegacyOceanMaterial = waterManager.oceanMaterial;
  waterManager.oceanMesh.material = mat;
  waterManager.oceanMaterial = mat;
  return mat;
}
