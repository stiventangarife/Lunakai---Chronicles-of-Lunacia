import * as THREE from 'three';
import { GLSL_NOISE } from '../../demo_scena/genshin/GenshinArtDirection.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';

/**
 * IslandMaterials — Biome versions of the Forest's painterly rock material plus the
 * translucent crystal material used by the Arctic ice shards and the Mystic amethyst
 * monoliths. Geometry / UVs of the source assets are never touched.
 */

const WORLD_VARYINGS_VERTEX = /* glsl */ `
  {
    vec3 nW = objectNormal;
    #ifdef USE_INSTANCING
      nW = mat3(instanceMatrix) * nW;
    #endif
    vINormalW = normalize(mat3(modelMatrix) * nW);
    vec4 pW = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      pW = instanceMatrix * pW;
    #endif
    vIWorld = (modelMatrix * pW).xyz;
  }
`;

/**
 * Weathered biome stone. opts:
 *  base, shadow      stone tones (hex)
 *  top, topAmount    what grows / settles on upward faces (moss, snow, sand, ash)
 *  streaks           vertical weathering intensity
 *  strata            0..1 horizontal sedimentary bands (savanna sandstone)
 *  strataColors      [hex, hex, hex] band palette
 *  veins, veinColor  glowing cracks (volcanic) — emissive
 *  avgLum            average luminance of the source texture (detail normalisation)
 */
export function islandRockMaterial(src, opts = {}) {
  const m = new THREE.MeshToonMaterial({
    map: src && src.map ? src.map : null,
    normalMap: src && src.normalMap ? src.normalMap : null,
    gradientMap: getSoftToonRamp(),
    color: 0xffffff,
    side: src ? src.side : THREE.FrontSide
  });
  m.name = ((src && src.name) || 'rock') + '_island';
  const u = {
    uIBase: { value: new THREE.Color(opts.base ?? 0xa79f90) },
    uIShadow: { value: new THREE.Color(opts.shadow ?? 0x6f7486) },
    uITop: { value: new THREE.Color(opts.top ?? 0x6f9a3a) },
    uITopAmount: { value: opts.topAmount ?? 0.0 },
    uIStreaks: { value: opts.streaks ?? 1.0 },
    uIStrata: { value: opts.strata ?? 0.0 },
    uIStrataA: { value: new THREE.Color((opts.strataColors || [])[0] ?? 0xb5652f) },
    uIStrataB: { value: new THREE.Color((opts.strataColors || [])[1] ?? 0xd9964a) },
    uIStrataC: { value: new THREE.Color((opts.strataColors || [])[2] ?? 0xedc479) },
    uIVeins: { value: opts.veins ?? 0.0 },
    uIVeinColor: { value: new THREE.Color(opts.veinColor ?? 0xff6a1a) },
    uIAvgLum: { value: opts.avgLum ?? (src && src.map ? 0.22 : 1.0) },
    uITime: opts.timeUniform || { value: 0 }
  };
  m.userData.islandUniforms = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vINormalW;
        varying vec3 vIWorld;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        ${WORLD_VARYINGS_VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uIBase, uIShadow, uITop, uIStrataA, uIStrataB, uIStrataC, uIVeinColor;
        uniform float uITopAmount, uIStreaks, uIStrata, uIVeins, uIAvgLum, uITime;
        varying vec3 vINormalW;
        varying vec3 vIWorld;
        ${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 nW = normalize(vINormalW);
          float n = gFbm3(vIWorld.xz * 0.9 + vIWorld.y * 0.3);
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float detail = clamp(lum / max(uIAvgLum, 0.02), 0.4, 1.8);
          vec3 base = uIBase;
          if (uIStrata > 0.001) {
            float band = fract(vIWorld.y * 0.42 + n * 0.35 + sin(vIWorld.x * 0.05) * 0.2);
            vec3 strata = mix(uIStrataA, uIStrataB, smoothstep(0.1, 0.45, band));
            strata = mix(strata, uIStrataC, smoothstep(0.55, 0.85, band));
            base = mix(base, strata, uIStrata);
          }
          diffuseColor.rgb = base * mix(0.78, 1.1, n) * mix(1.0, detail, 0.65);
          float streak = gNoise(vec2(vIWorld.x * 2.5 + vIWorld.z * 2.5, vIWorld.y * 0.35));
          diffuseColor.rgb *= 1.0 + (streak - 0.5) * 0.28 * uIStreaks;
          float topMask = smoothstep(0.55, 0.88, nW.y + (n - 0.5) * 0.5) * uITopAmount;
          diffuseColor.rgb = mix(diffuseColor.rgb, uITop * (0.85 + 0.3 * n), topMask * 0.92);
          float under = 1.0 - smoothstep(-0.6, 0.1, nW.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uIShadow * 1.4, under * 0.35);
        }`);
    if ((opts.veins ?? 0) > 0) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float vn = gNoise(vIWorld.xz * 0.7 + vIWorld.y * 0.9);
          float vein = 1.0 - smoothstep(0.0, 0.045, abs(vn - 0.5));
          float pulse = 0.75 + 0.25 * sin(uITime * 1.7 + vIWorld.x * 0.3);
          float low = 1.0 - smoothstep(0.0, 0.6, normalize(vINormalW).y);
          totalEmissiveRadiance += uIVeinColor * vein * uIVeins * pulse * (0.4 + 0.6 * low);
        }`);
    }
  };
  m.customProgramCacheKey = () => `island-rock-${(opts.veins ?? 0) > 0 ? 'veins' : 'plain'}`;
  return m;
}

/**
 * Translucent faceted crystal (ice / amethyst / lunar quartz):
 * flat-shaded facets, inner core glow, bright fresnel rim along the edges, slight
 * transparency and a slow shimmer. Emissive so bloom catches the brightest edges.
 */
export function crystalMaterial(opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0x8fdcff,
    emissive: opts.glow ?? 0x2b9bff,
    emissiveIntensity: opts.glowIntensity ?? 0.55,
    roughness: 0.18,
    metalness: 0.0,
    flatShading: true,
    transparent: (opts.opacity ?? 0.85) < 1,
    opacity: opts.opacity ?? 0.85,
    depthWrite: true
  });
  m.name = opts.name || 'IslandCrystal';
  const rim = new THREE.Color(opts.rim ?? 0xc8f2ff);
  const core = new THREE.Color(opts.core ?? 0xffffff);
  const time = opts.timeUniform || { value: 0 };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCRim = { value: rim };
    shader.uniforms.uCCore = { value: core };
    shader.uniforms.uCTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vCLocal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vCLocal = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uCRim, uCCore;
        uniform float uCTime;
        varying vec3 vCLocal;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float fr = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0) + 1e-4, 2.2);
          float shimmer = 0.85 + 0.15 * sin(uCTime * 1.3 + vCLocal.y * 3.0 + vCLocal.x * 5.0);
          totalEmissiveRadiance += uCRim * fr * 0.95 * shimmer;
          // Brighter core toward the base of the shard (light trapped inside the ice)
          float coreMask = 1.0 - smoothstep(0.0, 1.2, abs(vCLocal.y - 0.3));
          totalEmissiveRadiance += uCCore * coreMask * 0.08;
        }`);
  };
  m.customProgramCacheKey = () => 'island-crystal-v1';
  return m;
}

/** Hexagonal crystal prism with a pointed tip (≈42 triangles), base at y = 0. */
export function crystalPrismGeometry(radius = 0.5, height = 2.6, sides = 6) {
  const body = new THREE.CylinderGeometry(radius * 0.86, radius, height, sides, 1, false);
  body.translate(0, height / 2, 0);
  const tip = new THREE.ConeGeometry(radius * 0.86, radius * 1.7, sides, 1, true);
  tip.translate(0, height + radius * 0.85, 0);
  const a = body.toNonIndexed();
  const b = tip.toNonIndexed();
  const pos = new Float32Array(a.attributes.position.count * 3 + b.attributes.position.count * 3);
  pos.set(a.attributes.position.array, 0);
  pos.set(b.attributes.position.array, a.attributes.position.array.length);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
