import * as THREE from 'three';
import { GLSL_NOISE } from '../../demo_scena/genshin/GenshinArtDirection.js';
import { GenshinTerrainData } from '../../demo_scena/genshin/GenshinTerrainData.js';
import { makeGroundGLSL } from './IslandGrassField.js';

/**
 * Painterly lit terrain for the islands (MeshStandardMaterial + shader patch), built on the
 * same recipe as the Forest ground so every island reads as part of one art direction:
 *
 *  1. Meadow colour  = the SAME function the grass blades use (blades melt into the ground).
 *  2. Biome surface  = island GLSL hook `islandSurface()` (snow fields, beaches, regolith…).
 *  3. Cliffs         = island GLSL hook `islandCliff()` blended by slope.
 *  4. Patchy paths   = Forest technique: cracked-earth texture set (ground_07) in world space,
 *                      wavy edges, grass islands, ruts and streaks, re-tinted per island.
 *  5. Relief         = texture normal map on the paths + soft cliff noise.
 *
 * profile.terrain = {
 *   ground: { deep, mid, light, dry }, soil, heightRange: [y0, y1],
 *   surfaceGLSL: 'vec3 islandSurface(vec3 wp, vec3 nW, vec4 gm, vec3 meadow, float brush) {...}',
 *   cliffGLSL:   'vec3 islandCliff(vec3 wp, vec3 nW, float brush) {...}',
 *   cliffSlope: [lo, hi], path: { tint:[r,g,b], dust:[r,g,b], desat, islands }, uniforms: {...}
 * }
 */
export function createIslandTerrainMaterial(data, profile) {
  const T = profile.terrain;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0.0 });
  mat.name = 'IslandTerrainMaterial';

  const uniforms = {
    ...data.uniforms(),
    uRoadFrame: { value: data.roadFrameTex },
    uSoil: { value: new THREE.Color(T.soil ?? 0x8a6a45) },
    uPathTint: { value: new THREE.Vector3(...(T.path && T.path.tint ? T.path.tint : [1, 1, 1])) },
    uPathDust: { value: new THREE.Vector3(...(T.path && T.path.dust ? T.path.dust : [1.1, 1.08, 1.03])) },
    uPathDesat: { value: T.path && T.path.desat !== undefined ? T.path.desat : 0.14 },
    uPathIslands: { value: T.path && T.path.islands !== undefined ? T.path.islands : 1.0 },
    uRutAmount: { value: T.path && T.path.ruts !== undefined ? T.path.ruts : 1.0 },
    uDirtCol: { value: null },
    uDirtNrm: { value: null },
    uDirtHgt: { value: null },
    uDirtReady: { value: 0.0 },
    uTime: { value: 0 },
    ...(T.uniforms || {})
  };
  loadDirtTextures(uniforms);
  const extraDecl = Object.keys(T.uniforms || {}).map((k) => {
    const v = T.uniforms[k].value;
    const type = v && v.isColor ? 'vec3' : (v && v.isVector3 ? 'vec3' : (v && v.isVector2 ? 'vec2' : (v && v.isTexture ? 'sampler2D' : 'float')));
    return `uniform ${type} ${k};`;
  }).join('\n');
  const [h0, h1] = T.heightRange || [2, 20];
  const [c0, c1] = T.cliffSlope || [0.5, 0.66];

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vIWorldPos;
        varying vec3 vIWorldNormal;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vIWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vIWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vIWorldPos;
        varying vec3 vIWorldNormal;
        uniform sampler2D uRoadFrame, uDirtCol, uDirtNrm, uDirtHgt;
        uniform vec3 uSoil, uPathTint, uPathDust;
        uniform float uPathDesat, uPathIslands, uRutAmount, uDirtReady, uTime;
        ${extraDecl}
        ${GLSL_NOISE}
        ${GenshinTerrainData.glsl()}
        ${makeGroundGLSL(T.ground)}
        ${T.surfaceGLSL || 'vec3 islandSurface(vec3 wp, vec3 nW, vec4 gm, vec3 meadow, float brush) { return meadow; }'}
        ${T.cliffGLSL || 'vec3 islandCliff(vec3 wp, vec3 nW, float brush) { return vec3(0.6, 0.58, 0.55) * (0.8 + 0.3 * brush); }'}

        vec4 iDirtSample(vec2 xz, out vec2 tilt) {
          vec2 uvA = xz * 0.25;
          vec2 uvB = vec2(0.8 * xz.x + 0.6 * xz.y, -0.6 * xz.x + 0.8 * xz.y) * 0.21 + vec2(0.37, 0.71);
          float wB = smoothstep(0.35, 0.65, gNoise(xz * 0.07 + 3.3));
          vec3 cA = texture2D(uDirtCol, uvA).rgb;
          vec3 cB = texture2D(uDirtCol, uvB).rgb;
          float hA = texture2D(uDirtHgt, uvA).r;
          float hB = texture2D(uDirtHgt, uvB).r;
          vec2 nA = texture2D(uDirtNrm, uvA).rg * 2.0 - 1.0;
          vec2 nB = texture2D(uDirtNrm, uvB).rg * 2.0 - 1.0;
          vec2 tB = nB.x * vec2(0.8, 0.6) + nB.y * vec2(-0.6, 0.8);
          tilt = mix(nA, tB, wB);
          return vec4(mix(cA, cB, wB), mix(hA, hB, wB));
        }
        float iRut(float a, float u) {
          float wob = (gNoise(vec2(u * 0.12, 3.1)) - 0.5) * 0.4;
          float on = smoothstep(0.38, 0.62, gNoise(vec2(u * 0.07, 8.0)));
          return (1.0 - smoothstep(0.1, 0.38, abs(a - (0.8 + wob)))) * on;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 iPathTilt = vec2(0.0);
        float iPathMask = 0.0;
        {
          vec3 wp = vIWorldPos;
          vec3 nW = normalize(vIWorldNormal);
          vec2 gxz = wp.xz;
          vec4 gm = terrainMaskAt(gxz);
          float brush = gFbm3(gxz * 0.35);
          float h01 = clamp((wp.y - (${h0.toFixed(2)})) / (${(h1 - h0).toFixed(2)}), 0.0, 1.0);
          vec3 meadow = genshinMeadowColor(gxz, h01) * (0.84 + 0.12 * brush);
          meadow = mix(meadow, mix(uSoil, meadow, 0.55), (1.0 - smoothstep(0.15, 0.6, gm.r)) * 0.35);
          vec3 g = islandSurface(wp, nW, gm, meadow, brush);
          vec3 gBase = g;

          // ---- Patchy paths (baked frame: R signed dist, GB tangent, A half width) ----
          vec4 rfr = texture2D(uRoadFrame, terrainUv(gxz));
          if (rfr.a > 0.05) {
            vec2 T = normalize(rfr.gb + vec2(1e-4, 0.0));
            vec2 Nn = vec2(-T.y, T.x);
            float a = abs(rfr.r);
            float sg = rfr.r >= 0.0 ? 1.0 : -1.0;
            float u = dot(gxz, T);
            float v = dot(gxz, Nn);
            float halfW = rfr.a * (0.78 + 0.46 * gNoise(vec2(u * 0.045, 5.3))) + 0.1;
            vec2 tTilt;
            vec4 ds = iDirtSample(gxz, tTilt);
            vec3 dc = mix(vec3(0.62, 0.45, 0.32), ds.rgb, uDirtReady);
            float hgt = mix(0.75, ds.a, uDirtReady);
            tTilt *= uDirtReady;
            float edgeN = (gNoise(gxz * 0.15 + 1.7) - 0.5) * 2.0 + (gNoise(gxz * 0.55) - 0.5) * 0.7;
            float eA = a + edgeN * min(1.0, halfW * 0.45) + (0.68 - hgt) * 1.1;
            float core = 1.0 - smoothstep(halfW - 0.18, halfW + 0.18, eA);
            float isl = gNoise(gxz * 0.19 + 9.7) * 0.75 + gNoise(gxz * 0.62 - 3.3) * 0.25;
            float islTh = 0.69 - 0.13 * smoothstep(0.2, 1.0, a / halfW) + (1.0 - uPathIslands) * 0.5;
            float island = smoothstep(islTh - 0.025, islTh + 0.025, isl + (0.68 - hgt) * 0.3);
            float bare = 1.0 - gm.r;
            float satN = gNoise(gxz * 0.36 + 4.1) * 0.75 + gNoise(gxz * 1.3 + 0.4) * 0.25;
            float satTh = 0.64 - 0.08 * bare;
            float sat = smoothstep(satTh, satTh + 0.06, satN + (hgt - 0.68) * 0.5) * (1.0 - smoothstep(halfW + 0.4, halfW + 3.0, a)) * uPathIslands;
            float dirt = max(core * (1.0 - island), sat);
            iPathMask = dirt;
            if (dirt > 0.001) {
              float tone = gNoise(gxz * 0.11 + 2.0) * 0.7 + gNoise(gxz * 0.37 - 6.0) * 0.3;
              vec3 dirtC = dc * mix(vec3(0.8, 0.76, 0.74), vec3(1.14, 1.1, 1.04), tone);
              dirtC = mix(dirtC, dirtC * uPathDust + vec3(0.02), (1.0 - smoothstep(0.0, halfW * 0.65, a)) * 0.35);
              dirtC *= 0.78 + 0.3 * smoothstep(0.3, 0.88, hgt);
              // Ruts only on wide roads (narrow trails would read as rails)
              float rut = iRut(a, u) * uRutAmount * smoothstep(1.6, 2.4, halfW);
              dirtC *= 1.0 - rut * 0.3;
              dirtC *= 0.92 + 0.16 * gNoise(vec2(u * 0.3, v * 5.0));
              float crackG = smoothstep(0.02, 0.1, ds.g - ds.r) * uDirtReady;
              float edgeK = smoothstep(0.35, 0.85, a / halfW);
              dirtC = mix(dirtC, dirtC * 0.72, crackG * (1.0 - edgeK));
              dirtC = mix(dirtC, gBase * 0.9, crackG * edgeK * 0.85);
              // Island re-tint (warm clay, packed snow-earth, mossy slate, ash…)
              dirtC = mix(vec3(dot(dirtC, vec3(0.3, 0.55, 0.15))), dirtC, 1.0 - uPathDesat) * uPathTint;
              float inner = core * (1.0 - island);
              dirtC *= 0.84 + 0.16 * smoothstep(0.25, 0.95, max(inner, sat));
              float e = 0.08;
              float dR = (iRut(a + e, u) * uRutAmount * smoothstep(1.6, 2.4, halfW) - rut) / e;
              iPathTilt = (tTilt * 0.55 + Nn * sg * dR * 0.32) * dirt;
              g = mix(g, dirtC, dirt);
            }
          }

          // ---- Cliffs ----
          float slope = nW.y;
          vec3 cliff = islandCliff(wp, nW, brush);
          float rock = 1.0 - smoothstep(${c0.toFixed(3)}, ${c1.toFixed(3)}, slope + (brush - 0.5) * 0.08);
          g = mix(g, cliff, rock);
          iPathMask *= 1.0 - rock;
          diffuseColor.rgb = g;
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (iPathMask > 0.001) {
          vec3 nWp = normalize(vIWorldNormal + vec3(iPathTilt.x, 0.0, iPathTilt.y));
          normal = normalize((viewMatrix * vec4(nWp, 0.0)).xyz);
        }`);
  };
  mat.customProgramCacheKey = () => 'island-terrain-' + (profile.id || 'x');
  mat.userData.islandUniforms = uniforms;
  return mat;
}

/** Cracked-earth texture set shared by every island path (same assets as the Forest). */
let _dirtSet = null;
function loadDirtTextures(u) {
  const placeholder = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  placeholder.needsUpdate = true;
  u.uDirtCol.value = u.uDirtNrm.value = u.uDirtHgt.value = placeholder;
  const apply = () => {
    u.uDirtCol.value = _dirtSet.col;
    u.uDirtNrm.value = _dirtSet.nrm;
    u.uDirtHgt.value = _dirtSet.hgt;
    u.uDirtReady.value = 1.0;
  };
  if (_dirtSet && _dirtSet.ready) { apply(); return; }
  if (!_dirtSet) {
    _dirtSet = { ready: false, waiters: [] };
    const base = './assets/stylized/ground_texture/ground_07_4k/ground_07__';
    const loader = new THREE.TextureLoader();
    const specs = [['col', 'basecolor_1k.webp', true], ['nrm', 'normal_gl_1k.webp', false], ['hgt', 'height_1k.webp', false]];
    let pending = specs.length;
    specs.forEach(([key, file, srgb]) => {
      loader.load(base + file, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
        _dirtSet[key] = tex;
        if (--pending === 0) { _dirtSet.ready = true; _dirtSet.waiters.forEach((fn) => fn()); _dirtSet.waiters = []; }
      }, undefined, () => console.warn('[IslandTerrainMaterial] dirt texture failed:', file));
    });
  }
  _dirtSet.waiters.push(apply);
}
