// ArenaOcclusionDither.js - "Dither fading" del escenario de combate (Hito 37).
//
// Todo lo que el escenario pone entre la cámara y algo importante del combate se disuelve con un
// tramado de pantalla (IGN, el mismo del Fade LOD del Ártico):
//   · cada unidad viva (a la altura del pecho), con un radio algo mayor para la unidad activa;
//   · la casilla bajo el ratón.
// Se calcula por píxel: un cilindro invisible entre la cámara y cada punto. Funciona desde cualquier
// ángulo y con cualquier malla del escenario (árboles, rocas, cactus, cristales, pilares, paredes).
//   · Lo que está SOBRE el tablero (obstáculos) nunca baja de un 35 % visible: sigue leyéndose que bloquea.
//   · La decoración de alrededor puede bajar hasta un 8 %.
// Las sombras no cambian (el material de profundidad no se toca). Solo se usa en BattleArena: el mundo
// abierto no se ve afectado. Consola: lkDebug.dither(false|true), lkDebug.dither({ radius: 1.1 }).
import * as THREE from 'three';

export const OCC_MAX_POINTS = 12;

/** Uniformes compartidos por todos los materiales parcheados (también los de las plantillas en caché). */
export const OCC = {
  uOccPts: { value: Array.from({ length: OCC_MAX_POINTS }, () => new THREE.Vector4(0, -999, 0, 0)) },
  uOccStr: { value: new Float32Array(OCC_MAX_POINTS) },
  uOccCount: { value: 0 },
  uOccOn: { value: 1.0 },
  uOccBoardMin: { value: new THREE.Vector2(-8, -8) },
  uOccBoardSize: { value: new THREE.Vector2(16, 16) },
  uOccBoardMask: { value: null },
  uOccObstacleVis: { value: 0.35 },
  uOccDecorVis: { value: 0.08 },
};

export const OCC_SETTINGS = { enabled: true, radius: 0.95, activeRadius: 1.25, hoverRadius: 0.85, height: 0.7, fadeSpeed: 9 };

// Máscara del tablero: 1 en las casillas que existen (lo que hay encima es "del tablero" → mínimo 35 %)
let _maskTex = null;
export function setOcclusionBoard(map, halfW, halfD, tileSize) {
  const data = new Uint8Array(map.width * map.height);
  for (let x = 0; x < map.width; x++) for (let z = 0; z < map.height; z++) {
    const k = map.cells[x][z];
    data[z * map.width + x] = (k !== 'none' && k !== 'chasm') ? 255 : 0;
  }
  if (_maskTex) _maskTex.dispose();
  _maskTex = new THREE.DataTexture(data, map.width, map.height, THREE.RedFormat);
  _maskTex.unpackAlignment = 1; // anchos impares (7, 9, 11, 13…)
  _maskTex.magFilter = THREE.NearestFilter;
  _maskTex.minFilter = THREE.NearestFilter;
  _maskTex.needsUpdate = true;
  OCC.uOccBoardMask.value = _maskTex;
  OCC.uOccBoardMin.value.set(-halfW, -halfD);
  OCC.uOccBoardSize.value.set(halfW * 2, halfD * 2);
  void tileSize;
}

const VERT_DECL = /* glsl */ `
  varying vec3 vOccW;`;
const VERT_BODY = /* glsl */ `
  {
    vec4 occW = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      occW = instanceMatrix * occW;
    #endif
    vOccW = (modelMatrix * occW).xyz;
  }`;
const FRAG_DECL = /* glsl */ `
  varying vec3 vOccW;
  uniform vec4 uOccPts[${OCC_MAX_POINTS}];
  uniform float uOccStr[${OCC_MAX_POINTS}];
  uniform int uOccCount;
  uniform float uOccOn, uOccObstacleVis, uOccDecorVis;
  uniform vec2 uOccBoardMin, uOccBoardSize;
  uniform sampler2D uOccBoardMask;`;
function fragBody(minY) {
  return /* glsl */ `
  if (uOccOn > 0.5 && uOccCount > 0 && vOccW.y > ${minY.toFixed(2)}) {
    float occ = 0.0;
    for (int i = 0; i < ${OCC_MAX_POINTS}; i++) {
      if (i >= uOccCount) break;
      vec3 P = uOccPts[i].xyz;
      float R = uOccPts[i].w;
      vec3 toP = P - cameraPosition;
      float L = length(toP);
      vec3 dir = toP / max(L, 1e-4);
      float t = dot(vOccW - cameraPosition, dir);
      // Solo lo que queda delante del punto (entre la cámara y la unidad)
      if (t < 0.0 || t > L - 0.45) continue;
      float r = length(vOccW - (cameraPosition + dir * t));
      // Cilindro algo más ancho cerca del punto: tapa la silueta entera de la unidad
      float rr = R * mix(0.85, 1.15, clamp(t / max(L, 1e-4), 0.0, 1.0));
      float m = 1.0 - smoothstep(rr * 0.65, rr, r);
      occ = max(occ, m * uOccStr[i]);
    }
    if (occ > 0.001) {
      vec2 buv = (vOccW.xz - uOccBoardMin) / uOccBoardSize;
      float onBoard = (buv.x >= 0.0 && buv.y >= 0.0 && buv.x <= 1.0 && buv.y <= 1.0) ? texture2D(uOccBoardMask, buv).r : 0.0;
      float minVis = mix(uOccDecorVis, uOccObstacleVis, step(0.5, onBoard));
      float vis = mix(1.0, minVis, occ);
      float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      if (ign > vis) discard;
    }
  }`;
}

/**
 * Añade el tramado a un material (una sola vez). minY: altura por debajo de la cual nunca se disuelve
 * (el terreno solo por encima del tablero, para no agujerear el suelo).
 */
export function patchOcclusionDither(material, { minY = -1000 } = {}) {
  if (!material || material.userData.occPatched) return;
  material.userData.occPatched = true;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : () => '';
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    Object.assign(shader.uniforms, OCC);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>${VERT_DECL}`)
      .replace('#include <project_vertex>', `#include <project_vertex>${VERT_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>${FRAG_DECL}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>${fragBody(minY)}`);
  };
  material.customProgramCacheKey = () => `${prevKey()}-occdither-${minY.toFixed(2)}`;
  material.needsUpdate = true;
}

/** Parchea todos los materiales del escenario salvo las losas y el agua. */
export function patchArenaGroup(group) {
  group.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const name = o.name || '';
    if (name.startsWith('ArenaTiles') || name.startsWith('ArenaWater')) return;
    const minY = name === 'ArenaTerrain' ? 0.25 : -1000;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => patchOcclusionDither(m, { minY }));
  });
}

/**
 * Actualiza los puntos que no se deben tapar. points: [{ key, x, y, z, r }]. La intensidad de cada
 * punto entra y sale suavemente (sin parpadeos al mover la cámara, el ratón o una unidad).
 */
const _state = new Map();
export function updateOcclusionPoints(points, dt) {
  OCC.uOccOn.value = OCC_SETTINGS.enabled ? 1.0 : 0.0;
  const k = 1 - Math.exp(-OCC_SETTINGS.fadeSpeed * dt);
  const seen = new Set();
  for (const p of points) {
    seen.add(p.key);
    const s = _state.get(p.key) || { x: p.x, y: p.y, z: p.z, r: p.r, str: 0 };
    s.x = p.x; s.y = p.y; s.z = p.z; s.r += (p.r - s.r) * k;
    s.str += (1 - s.str) * k;
    _state.set(p.key, s);
  }
  for (const [key, s] of _state) {
    if (seen.has(key)) continue;
    s.str += (0 - s.str) * k;
    if (s.str < 0.01) _state.delete(key);
  }
  let i = 0;
  for (const s of _state.values()) {
    if (i >= OCC_MAX_POINTS) break;
    OCC.uOccPts.value[i].set(s.x, s.y, s.z, s.r);
    OCC.uOccStr.value[i] = s.str;
    i++;
  }
  OCC.uOccCount.value = i;
}

export function clearOcclusionPoints() {
  _state.clear();
  OCC.uOccCount.value = 0;
}
