// SlotIsland.js — Hito 133/134 · Terreno 3D bajo el personaje del selector de aventura.
//
// Hito 134: un trozo de TABLERO DE COMBATE flotante (5 × 4 casillas cuadradas) en lugar de una isla redonda:
//   · losas como las de BattleArena (casilla al 96,5 %, damero claro/oscuro, losas de acento y lateral de color) con
//     los colores exactos de la arena del bioma (ARENA_THEMES[bioma].tiles), fusionadas en UNA malla con colores por
//     vértice (una llamada de dibujo; el contorno toon marca cada casilla);
//   · debajo, un bloque recto de tierra y roca que se oscurece hacia abajo (terrain.soil / cliffShadow de la arena);
//   · props del propio juego (assets/<bioma>/*.glb, 16–215 triángulos, sin texturas) en las casillas de las esquinas,
//     recoloreados por nombre de material; cristales y monolitos hechos aquí.
// Mismo sombreado toon y contorno que los personajes. Coste: ~2 000 triángulos y ninguna textura.
// API: const isle = await buildSlotIsland(biome, { gradientMap }); scene.add(isle.root); … isle.dispose();
//   biome: forest · savannah · arctic · mystic · genesis. La superficie queda en y = TOP_Y (los pies del personaje).

import * as THREE from 'three';
import { cloneGLTF } from '../../render/ModelCache.js';
import { applyToonOutline } from '../stylized/ToonOutline.js';
import { ARENA_THEMES } from '../../tactics/arena/BattleArenaThemes.js';
import { mergeGeometries } from '../../../vendor/utils/BufferGeometryUtils.js';

export const TOP_Y = 0.08;
const T = 0.46;            // lado de una casilla
const COLS = 5, ROWS = 4;  // tablero de 5 × 4 (los personajes en las columnas centrales)
const SLAB = 0.1;          // grosor de una losa
const W = COLS * T, D = ROWS * T;
const cx = (c) => (c - (COLS - 1) / 2) * T;
const cz = (r) => (r - (ROWS - 1) / 2) * T;

/** Colores de los materiales de los props (por nombre del material del GLB), por bioma. */
const PROP_MATS = {
  forest: { grass: 0x5ca628, dirt: 0x9a7050, leafsGreen: 0x38b44a, woodBark: 0x7a5236, colorRed: 0xe8545a, stone: 0xa79f90, _defaultMat: 0xf2ead8 },
  savannah: { grass: 0xd89236, dirt: 0xc79e61, leafsGreen: 0xdf6637, woodBark: 0x6b4630, colorRed: 0xe8545a, stone: 0xc9a77a, _defaultMat: 0xf2e2c4 },
  arctic: { grass: 0xcfd2c4, dirt: 0x77849a, leafsGreen: 0xa9cbe0, woodBark: 0x5e4636, colorRed: 0xb6a8e2, stone: 0xa3afc0, _defaultMat: 0xf6faff },
  mystic: { grass: 0x2f8f7a, dirt: 0x4a5a6a, leafsGreen: 0x6fd0b0, woodBark: 0x3f4566, colorRed: 0xff9ec4, stone: 0x6a6f96, _defaultMat: 0xf6eaff },
  genesis: { grass: 0x2a3060, dirt: 0x232a52, leafsGreen: 0x3d3672, woodBark: 0x1d2246, colorRed: 0x9fe8ff, stone: 0x4a4a8a, _defaultMat: 0xd8ccff },
};

/**
 * Props por bioma: [archivo, columna, fila, alto deseado, giro, colores propios]. Van en las casillas de las columnas
 * de los lados (0 y 4); los personajes ocupan las centrales.
 */
const PROPS = {
  forest: [
    ['dungeon/tree_oak.glb', 0, 0, 0.86, 0.4],
    ['dungeon/tree_default.glb', 4, 0, 0.7, 1.9],
    ['dungeon/plant_bushDetailed.glb', 4, 2, 0.24, 0.7],
    ['dungeon/flower_redA.glb', 0, 2, 0.17, 0.2],
    ['dungeon/flower_redA.glb', 0, 3, 0.14, 1.3],
    ['dungeon/rock_smallA.glb', 4, 3, 0.11, 0.9],
  ],
  savannah: [
    ['savannah/tree_plateau.glb', 0, 0, 0.9, 0.6],
    ['savannah/cactus_tall.glb', 4, 0, 0.48, 0.3, { leafsGreen: 0x6f9a3a }],
    ['savannah/cactus_short.glb', 4, 2, 0.28, 1.1, { leafsGreen: 0x7aa844 }],
    ['savannah/rock_smallB.glb', 0, 2, 0.11, 0.5],
    ['savannah/rock_smallB.glb', 4, 3, 0.09, 2.2],
  ],
  arctic: [
    ['crystals', 0, 0, 0.51, 0.2, { color: 0xbfe6ff, glow: 0x7fc8ff }],
    ['crystals', 4, 0, 0.31, 1.4, { color: 0xd6efff, glow: 0x9fd6ff }],
    ['arctic/plant_bushDetailed.glb', 4, 2, 0.22, 0.3],
    ['arctic/stone_smallA.glb', 0, 2, 0.14, 0.8],
    ['arctic/stone_smallA.glb', 0, 3, 0.1, 2.0],
  ],
  mystic: [
    ['crystals', 0, 0, 0.54, 0.4, { color: 0xb7a2ea, glow: 0xa98ee0 }],
    ['crystals', 4, 0, 0.34, 1.7, { color: 0xc9b8ff, glow: 0xd18cff }],
    ['mystic/mushroom_redGroup.glb', 4, 2, 0.24, 0.9],
    ['mystic/mushroom_redTall.glb', 0, 2, 0.26, 0.2],
    ['mystic/flower_redB.glb', 0, 3, 0.15, 1.1],
  ],
  genesis: [
    ['obelisk', 0, 0, 0.64, 0.25],
    ['obelisk', 4, 0, 0.43, -0.3],
    ['crystals', 4, 2, 0.28, 0.9, { color: 0x6dffc8, glow: 0x6dffc8 }],
    ['dungeon/rock_smallA.glb', 0, 2, 0.11, 0.6],
  ],
};

/** Números pseudoaleatorios estables por bioma (el terreno de una zona siempre es el mismo). */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function toon(color, gradientMap, extra = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
}

/** Caja con color por vértice: cara de arriba `top`, el resto `side` (como _slabGeometry de BattleArena). */
function coloredBox(w, h, d, x, y, z, top, side) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  const nrm = geo.attributes.normal;
  const col = new Float32Array(nrm.count * 3);
  for (let i = 0; i < nrm.count; i++) {
    const c = nrm.getY(i) > 0.5 ? top : side;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** Tablero: losas en damero con los colores de la arena del bioma, fusionadas en una sola malla. */
function buildBoard(theme, gradientMap, rand) {
  const tt = theme.tiles;
  const [light, dark] = tt.floor;
  const side = new THREE.Color(tt.side);
  const accent = tt.accent ? new THREE.Color(tt.accent.color) : null;
  const geos = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = new THREE.Color((c + r) % 2 ? dark : light);
      if (accent && rand() < tt.accent.chance) color.lerp(accent, 0.55);
      color.offsetHSL((rand() - 0.5) * 0.01, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.035);
      // Las losas del borde quedan algo más bajas, a mano (el tablero no parece un bloque perfecto)
      const edge = c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
      const drop = edge ? rand() * 0.025 : 0;
      geos.push(coloredBox(T * 0.965, SLAB, T * 0.965, cx(c), TOP_Y - SLAB / 2 - drop, cz(r), color, side));
    }
  }
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, toon(0xffffff, gradientMap, { vertexColors: true }));
  mesh.name = 'slotIsland_board';
  return mesh;
}

/** Tronco de pirámide de base rectangular (w × d arriba, k veces abajo), con degradado de `top` a `bottom`. */
function frustum(w, d, h, k, y, top, ox = 0, oz = 0, bottom = top) {
  const geo = new THREE.CylinderGeometry(Math.SQRT1_2 * k, Math.SQRT1_2, h, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(w, 1, d);
  geo.translate(0, y - h / 2, 0);
  // La base de abajo se desplaza un poco (roca irregular); la de arriba queda alineada con el tablero
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < y - h / 2) p.setXYZ(i, p.getX(i) + ox, p.getY(i), p.getZ(i) + oz);
  geo.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(top).lerp(bottom, THREE.MathUtils.clamp((y - p.getY(i)) / h, 0, 1));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** Bloque bajo el tablero: franja de tierra y roca maciza que se estrecha hacia abajo (terreno flotante). */
function buildBlock(theme, gradientMap, rand) {
  const tr = theme.terrain;
  const soil = new THREE.Color(tr.soil), shade = new THREE.Color(tr.cliffShadow);
  // Roca oscura: tierra y sombra del acantilado de la arena, cada vez más oscura hacia abajo
  // Los colores de three.js trabajan en espacio lineal: ×0,3 lineal ≈ ×0,58 en pantalla
  const rockTop = soil.clone().lerp(shade, 0.3).multiplyScalar(0.3);
  const rockLow = shade.clone().lerp(soil, 0.2).multiplyScalar(0.07);
  // Bloque recto como los mapas tácticos: franja de tierra y roca con un leve estrechamiento y degradado hacia abajo
  let y = TOP_Y - SLAB - 0.004;
  const geos = [];
  geos.push(frustum(W - 0.02, D - 0.02, 0.17, 0.985, y, soil.clone().multiplyScalar(0.8), 0, 0, soil.clone().multiplyScalar(0.45)));  // tierra
  y -= 0.17;
  geos.push(frustum((W - 0.02) * 0.985, (D - 0.02) * 0.985, 0.3, 0.94, y, rockTop, 0, 0, rockLow));       // roca
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  // Sin iluminación: la luz de relleno de la escena aclaraba las caras que miran hacia abajo y la roca se veía pálida;
  // con colores planos (y el contorno toon) encaja con el sombreado por bandas
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  mesh.name = 'slotIsland_block';
  // Dos cubitos sueltos que flotan bajo el bloque
  const bits = [[-W * 0.36, -0.68, 0.3, 0.085], [W * 0.3, -0.8, 0.2, 0.06]].map(([x, dy, z, s]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), toon(tr.cliffShadow, gradientMap, { flatShading: true }));
    m.position.set(x, TOP_Y + dy, z);
    m.rotation.set(rand() * 0.6, rand() * 3, rand() * 0.6);
    return m;
  });
  return [mesh, ...bits];
}

/** Racimo de cristales (hielo del Ártico, amatista Mística, aurora de Genesis): conos low-poly con brillo propio. */
function buildCrystals(height, opts, gradientMap, rand) {
  const g = new THREE.Group();
  const mat = toon(opts.color, gradientMap, { flatShading: true, emissive: new THREE.Color(opts.glow), emissiveIntensity: 0.35 });
  for (let i = 0; i < 3; i++) {
    const h = height * (i === 0 ? 1 : 0.5 + rand() * 0.3);
    const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.2, h, 5, 1), mat);
    c.position.set((i - 1) * h * 0.22, h / 2, (rand() - 0.5) * 0.12);
    c.rotation.z = (i - 1) * 0.28;
    g.add(c);
  }
  return g;
}

/** Monolito de Genesis: piedra índigo con una franja de runas que brilla. */
function buildObelisk(height, gradientMap) {
  const g = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.BoxGeometry(height * 0.24, height, height * 0.2), toon(0x3d3672, gradientMap, { flatShading: true }));
  stone.position.y = height / 2;
  const rune = new THREE.Mesh(new THREE.BoxGeometry(height * 0.06, height * 0.62, height * 0.205), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }));
  rune.position.y = height * 0.52;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(height * 0.17, height * 0.18, 4, 1), toon(0x4a4a8a, gradientMap, { flatShading: true }));
  cap.position.y = height + height * 0.09;
  cap.rotation.y = Math.PI / 4;
  g.add(stone, rune, cap);
  return g;
}

async function buildProp([file, col, row, height, rotY, extra = {}], mats, gradientMap, rand) {
  let obj;
  if (file === 'crystals') obj = buildCrystals(height, extra, gradientMap, rand);
  else if (file === 'obelisk') obj = buildObelisk(height, gradientMap);
  else {
    const gltf = await cloneGLTF(`./assets/${file}`, { cloneGeometry: false });
    obj = gltf.scene;
    obj.traverse((o) => { if (o.isMesh) o.userData.lkSharedGeo = true; }); // geometría de la caché: no se libera aquí
    // Materiales propios (los originales de la caché no se tocan), recoloreados con la paleta del bioma
    const cache = new Map();
    obj.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const fix = (m) => {
        if (cache.has(m)) return cache.get(m);
        const hex = extra[m.name] ?? mats[m.name] ?? (m.color ? m.color.getHex() : 0xffffff);
        const t = toon(hex, gradientMap, { flatShading: true });
        cache.set(m, t);
        return t;
      };
      o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
    });
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const h = Math.max(0.01, box.max.y - box.min.y);
    const s = height / h;
    obj.scale.setScalar(s);
    obj.position.y = -box.min.y * s;
  }
  const holder = new THREE.Group();
  holder.add(obj);
  holder.position.set(cx(col), TOP_Y, cz(row));
  holder.rotation.y = rotY;
  return holder;
}

/**
 * Construye el terreno de un bioma. Resuelve { root, dispose }. Los GLB de props salen de ModelCache (se descargan una vez).
 */
export async function buildSlotIsland(biome, { gradientMap = null } = {}) {
  const key = ARENA_THEMES[biome] && PROP_MATS[biome] ? biome : 'forest';
  const theme = ARENA_THEMES[key];
  const rand = rng([...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const root = new THREE.Group();
  root.name = `slotIsland_${key}`;
  root.add(buildBoard(theme, gradientMap, rand), ...buildBlock(theme, gradientMap, rand));
  const props = await Promise.all((PROPS[key] || []).map((p) => buildProp(p, PROP_MATS[key], gradientMap, rand).catch((err) => {
    console.warn('[SlotIsland] Prop no cargado:', p[0], err);
    return null;
  })));
  props.forEach((p) => p && root.add(p));
  const outline = applyToonOutline(root, { thickness: 0.012, color: 0x15161e, mode: 'view' });
  return {
    root,
    biome: key,
    dispose() {
      try { outline?.dispose(); } catch (_) { /* opcional */ }
      root.traverse((o) => {
        if (!o.isMesh) return;
        // Las geometrías de los GLB son de la caché (compartidas): solo se liberan las creadas aquí
        if (!o.userData.lkSharedGeo) o.geometry?.dispose?.();
        for (const m of [].concat(o.material || [])) m?.dispose?.();
      });
      root.removeFromParent();
    },
  };
}
