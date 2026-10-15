import * as THREE from 'three';
import { GENSHIN_PALETTE, GLSL_NOISE } from './GenshinArtDirection.js';

/**
 * GenshinMaterials — Converts the existing GLTF props (rocks, pebbles, bushes, ferns) and the
 * characters to the soft cel-shaded look, WITHOUT touching their geometry, UVs or textures.
 *
 *  - Rocks: warm weathered stone, cool lilac shadows, moss that grows on the upward-facing
 *    surfaces (world-space, noise-broken), darker damp base.
 *  - Bushes / ferns / small plants: soft toon ramp so they match the new trees.
 *  - Characters (Sapidae + NPCs): smoother 2-tone ramp, warm rim light and a brown-tinted
 *    outline instead of pure black (anime / Genshin character rendering).
 */

let _softRamp = null;
export function getSoftToonRamp() {
  if (_softRamp) return _softRamp;
  const data = new Uint8Array([88, 132, 228, 255]);
  _softRamp = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  _softRamp.minFilter = THREE.LinearFilter;
  _softRamp.magFilter = THREE.LinearFilter;
  _softRamp.generateMipmaps = false;
  _softRamp.needsUpdate = true;
  return _softRamp;
}

const WORLD_NORMAL_VERTEX = /* glsl */ `
  {
    vec3 nW = objectNormal;
    #ifdef USE_INSTANCING
      nW = mat3(instanceMatrix) * nW;
    #endif
    vGNormalW = normalize(mat3(modelMatrix) * nW);
    vec4 pW = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      pW = instanceMatrix * pW;
    #endif
    vGWorld = (modelMatrix * pW).xyz;
  }
`;

function toToon(src, extra = {}) {
  const m = new THREE.MeshToonMaterial({
    map: src.map || null,
    normalMap: src.normalMap || null,
    normalScale: src.normalScale ? src.normalScale.clone() : new THREE.Vector2(1, 1),
    color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
    alphaTest: src.alphaTest || 0,
    transparent: !!src.transparent && !src.alphaTest,
    side: src.side,
    vertexColors: !!src.vertexColors,
    gradientMap: getSoftToonRamp(),
    ...extra
  });
  m.name = (src.name || 'mat') + '_genshin';
  m.userData.genshinSource = src;
  return m;
}

/** Weathered stone with moss on top. */
export function stylizeRockMaterial(src, mossAmount = 1.0) {
  const m = toToon(src);
  m.color.setRGB(1, 1, 1);
  const mossCol = new THREE.Color(GENSHIN_PALETTE.moss);
  const shadowCol = new THREE.Color(GENSHIN_PALETTE.rockShadow);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uMoss = { value: mossCol };
    shader.uniforms.uMossAmount = { value: mossAmount };
    shader.uniforms.uRockShadow = { value: shadowCol };
    shader.uniforms.uRockBase = { value: new THREE.Color(GENSHIN_PALETTE.rockLight) };
    shader.uniforms.uAvgLum = { value: 0.22 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vGNormalW;
        varying vec3 vGWorld;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        ${WORLD_NORMAL_VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uMoss, uRockShadow, uRockBase;
        uniform float uMossAmount, uAvgLum;
        varying vec3 vGNormalW;
        varying vec3 vGWorld;
        ${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 nW = normalize(vGNormalW);
          float n = gFbm3(vGWorld.xz * 0.9 + vGWorld.y * 0.3);
          float mossMask = smoothstep(0.62, 0.9, nW.y + (n - 0.5) * 0.5) * uMossAmount;
          // Painterly stone: the (dark) GLTF texture only provides relative detail; the base
          // tone is a warm light grey with soft value variation.
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float detail = clamp(lum / max(uAvgLum, 0.02), 0.4, 1.8);
          diffuseColor.rgb = uRockBase * mix(0.78, 1.1, n) * mix(1.0, detail, 0.65);
          // Vertical weathering streaks
          float streak = gNoise(vec2(vGWorld.x * 2.5 + vGWorld.z * 2.5, vGWorld.y * 0.35));
          diffuseColor.rgb *= 0.9 + 0.14 * streak;
          diffuseColor.rgb = mix(diffuseColor.rgb, uMoss * (0.8 + 0.4 * n), mossMask * 0.9);
          // Darker damp base + cooler underside
          float under = 1.0 - smoothstep(-0.6, 0.1, nW.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uRockShadow * 1.4, under * 0.35);
        }`);
  };
  m.customProgramCacheKey = () => 'genshin-rock-' + mossAmount.toFixed(2);
  return m;
}

/** Soft toon foliage for GLTF bushes / ferns / flowers / mushrooms. */
export function stylizeFoliageMaterial(src) {
  const m = toToon(src);
  const name = (src.name || '').toLowerCase();
  if (name.includes('leaves') || name.includes('leaf') || name.includes('grass') || name.includes('fern') || name.includes('bush')) {
    m.side = THREE.DoubleSide;
    m.color.multiplyScalar(1.12);
  }
  return m;
}

/** Applies a stylize fn to every material of an InstancedMesh / Mesh list. */
export function restyleMeshes(meshes, fn) {
  for (const mesh of meshes) {
    if (!mesh || !mesh.material) continue;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((mat) => fn(mat));
    } else {
      mesh.material = fn(mesh.material);
    }
  }
}

/**
 * Soft anime rendering for characters (keeps their textures & design):
 * smoother ramp, warm rim light, brown-tinted thin outline.
 */
export function applyGenshinCharacterStyle(root, outline = null) {
  if (!root) return;
  const ramp = getSoftToonRamp();
  root.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat.isMeshToonMaterial || mat.userData.genshinCharacter) return;
      mat.userData.genshinCharacter = true;
      mat.gradientMap = ramp;
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          {
            // Warm rim light (anime edge glow) — view-space normal is available as 'normal'
            float rim = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
            rim = smoothstep(0.55, 0.95, rim);
            outgoingLight += diffuseColor.rgb * vec3(1.0, 0.86, 0.66) * rim * 0.35;
          }
          #include <opaque_fragment>`);
      };
      mat.customProgramCacheKey = () => 'genshin-character-v1';
      mat.needsUpdate = true;
    });
  });
  if (outline) {
    try {
      if (typeof outline.setColor === 'function') outline.setColor(0x3a2522);
      if (typeof outline.setThickness === 'function') outline.setThickness(0.010);
    } catch (_) { /* optional */ }
  }
}
