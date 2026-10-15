import * as THREE from 'three';

/**
 * GenshinArtDirection.js — Single source of truth for the "Golden Hour Mondstadt/Liyue"
 * art direction of Island 1 (Forest). Every Genshin-style module reads its palette,
 * sun direction and quality settings from here so the whole scene stays coherent.
 *
 * All colors are authored in sRGB hex and converted to linear by THREE.Color.
 */

// Low, warm golden-hour sun (≈ 24° elevation) coming from the east-north-east of the valley.
// Same azimuth family as the legacy 'sunset' preset so existing shadows/landmarks still read well.
export const SUN_OFFSET = new THREE.Vector3(118, 68, -92);
export const SUN_DIRECTION = SUN_OFFSET.clone().normalize();

export const GENSHIN_PALETTE = {
  // Lighting
  sunColor: 0xffd7a0,          // Warm honey sunlight
  sunIntensity: 2.5,
  skyFill: 0xb9d6f2,           // Cool blue sky bounce in shadows (Genshin "blue shadows")
  groundFill: 0x6f8a3c,        // Warm green ground bounce
  hemiIntensity: 1.3,
  ambientColor: 0xffe6c7,
  ambientIntensity: 0.38,

  // Atmosphere
  fogColor: 0xf3d4b0,          // Warm peach haze near the horizon
  fogNear: 120,
  fogFar: 680,
  skyZenith: 0x3f86d6,         // Clean anime azure
  skyMid: 0x80bbee,
  skyHorizon: 0xffdcae,        // Peach / cream horizon (sun side)
  skyHorizonAway: 0xb9d5f0,    // Lavender-blue horizon (away from sun)
  sunDisk: 0xfff6dc,
  sunHalo: 0xffc779,
  cloudLit: 0xfff7ea,
  cloudShadow: 0xb4bfdf,       // Lilac cloud shadows
  cloudRim: 0xffd49a,

  // Distant landscape
  mountainNear: 0x5f8f86,
  mountainFar: 0x8fb1cf,
  mountainSnow: 0xf4f1ec,
  mountainGrass: 0x7aa457,

  // Ground & grass (shared by terrain + blades so the field reads as one continuous carpet)
  grassDeep: 0x2f6b2a,
  grassMid: 0x5ea83a,
  grassLight: 0x9fd25a,
  grassSun: 0xd5ec7c,          // Sun-kissed tips
  grassDry: 0xb7b65a,
  soil: 0x8a6a45,
  path: 0xcdb48a,

  // Water
  waterShallow: 0x7fe3df,
  waterMid: 0x2fb3c4,
  waterDeep: 0x1a6d93,
  waterFoam: 0xf4fdff,

  // Rocks
  rockLight: 0xa79f90,
  rockShadow: 0x6f7486,
  moss: 0x6f9a3a
};

export const GENSHIN_QUALITY = {
  // Grass field (camera-following tiles)
  grassTileSize: 10,
  grassTilesPerSide: 11,       // 11x11 tiles ≈ 110m field around the player
  grassNearRadius: 26,         // Tiles closer than this use the dense LOD
  grassTuftsNear: 900,
  grassTuftsFar: 340,
  flowersPerTile: 46,
  postFX: true,
  godRays: true
};

/** Detects a weak GPU / software renderer and scales budgets down. */
export function resolveQuality(renderer) {
  const q = { ...GENSHIN_QUALITY };
  try {
    const gl = renderer && renderer.getContext ? renderer.getContext() : null;
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftware = /swiftshader|llvmpipe|software/i.test(name);
    const isMobile = /Mali|Adreno|PowerVR|Apple GPU/i.test(name) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
    if (isSoftware || isMobile) {
      q.grassTilesPerSide = 9;
      q.grassTuftsNear = 520;
      q.grassTuftsFar = 180;
      q.flowersPerTile = 26;
      q.godRays = false;
    }
  } catch (_) { /* ignore */ }
  return q;
}

/** Shared GLSL helpers (hash / value noise / fbm) used by several Genshin shaders. */
export const GLSL_NOISE = /* glsl */ `
  float gHash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float gNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = gHash12(i);
    float b = gHash12(i + vec2(1.0, 0.0));
    float c = gHash12(i + vec2(0.0, 1.0));
    float d = gHash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float gFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * gNoise(p);
      p = r * p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }
  float gFbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * gNoise(p);
      p = r * p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }
`;

/**
 * GLSL function returning the painterly ground/grass base color at a world XZ position.
 * Used by BOTH the terrain shader and the grass blades so that blades melt into the ground.
 */
export function getGroundColorGLSL() {
  const c = (hex) => {
    const col = new THREE.Color(hex);
    return `vec3(${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)})`;
  };
  return /* glsl */ `
  vec3 genshinMeadowColor(vec2 xz, float height01) {
    // Large soft patches (macro variation) + medium brush-stroke variation.
    float macro = gFbm3(xz * 0.018);
    float medium = gFbm3(xz * 0.075 + 4.7);
    float sunny = smoothstep(0.38, 0.78, macro);
    vec3 deep  = ${c(GENSHIN_PALETTE.grassDeep)};
    vec3 mid   = ${c(GENSHIN_PALETTE.grassMid)};
    vec3 light = ${c(GENSHIN_PALETTE.grassLight)};
    vec3 dry   = ${c(GENSHIN_PALETTE.grassDry)};
    vec3 col = mix(mid, light, sunny * 0.75);
    col = mix(col, deep, (1.0 - smoothstep(0.15, 0.55, medium)) * 0.35);
    col = mix(col, dry, smoothstep(0.66, 0.86, medium) * 0.28);
    col = mix(col, light, clamp(height01, 0.0, 1.0) * 0.18);
    return col;
  }
  `;
}

/**
 * Golden-hour lighting preset applied to the Demo_Scena LightingManager
 * (registered as LightingManager.applyPreset('genshin_golden')).
 */
export function applyGenshinGoldenHour(lm) {
  const P = GENSHIN_PALETTE;
  lm.dirLight.color.setHex(P.sunColor);
  lm.dirLight.intensity = P.sunIntensity;
  lm._lightOffset.copy(SUN_DIRECTION).multiplyScalar(150);
  lm.dirLight.position.copy(lm._lightOffset);
  lm.dirLight.target.position.set(0, 0, 0);
  lm.hemiLight.color.setHex(P.skyFill);
  lm.hemiLight.groundColor.setHex(P.groundFill);
  lm.hemiLight.intensity = P.hemiIntensity;
  lm.ambientLight.color.setHex(P.ambientColor);
  lm.ambientLight.intensity = P.ambientIntensity;
  lm.dirLight.shadow.radius = 3; // softer painterly penumbra (PCFSoft)
  return {
    fogColor: P.fogColor,
    fogNear: P.fogNear,
    fogFar: P.fogFar,
    skyTop: P.skyZenith,
    skyBottom: P.skyHorizon
  };
}
