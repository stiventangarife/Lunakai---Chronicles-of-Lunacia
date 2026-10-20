// BattleArena.js - Escenario de combate de un mapa de bioma (Hito 35).
//
// Construye, para un mapa de src/tactics/maps/BattleMaps.js y el tema de su bioma:
//   · el tablero: losas instanciadas (suelo, sendero, puente), agua animada y obstáculos de arte;
//   · el terreno que lo rodea: una isla con la forma del tablero, montículos, paredes (cañón / glaciar),
//     grietas y acantilados que caen al mar de nubes;
//   · la decoración del bioma con el MISMO arte de las islas: árboles IslandTrees (acacias, palmeras,
//     abetos nevados, sauces místicos…), rocas de las islas con su material, vegetación GLTF, cactus,
//     hongos, cristales y pilares lavanda;
//   · partículas ambientales (IslandParticles) y la paleta de cielo, luz y niebla de la isla.
//
// Reglas: posiciones deterministas (Mulberry32 con la semilla del mapa), sin luces puntuales nuevas,
// los obstáculos del tablero son solo arte (la lógica la pone GridManager.loadLayout).
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import { mergeGeometries } from '../../../vendor/utils/BufferGeometryUtils.js';
import { TILE_SIZE } from '../GridManager.js';
import { CELL, cellExists } from '../maps/BattleMapLayout.js';
import { ARENA_THEMES } from './BattleArenaThemes.js';
import { IslandTrees } from '../../rpg/world/islands/kit/IslandTrees.js';
import { islandRockMaterial, crystalMaterial, crystalPrismGeometry } from '../../rpg/world/islands/kit/IslandMaterials.js';
import { IslandParticles } from '../../rpg/world/islands/kit/IslandParticles.js';
import { getSoftToonRamp, stylizeFoliageMaterial } from '../../rpg/world/demo_scena/genshin/GenshinMaterials.js';
import { SUN_DIRECTION } from '../../rpg/world/demo_scena/genshin/GenshinArtDirection.js';
import { SimplexNoise, createSeededRandom } from '../../rpg/world/demo_scena/MathUtils.js';
import { patchArenaGroup, setOcclusionBoard, updateOcclusionPoints, clearOcclusionPoints } from './ArenaOcclusionDither.js';

const T = TILE_SIZE;
const TILE_TOP = 0.0;
const TILE_THICK = 0.25;
const GROUND_Y = -0.26;       // el terreno pasa justo bajo las losas
const WATER_Y = -0.15;
const WATER_BED = -0.85;
const STEP = 0.4;             // resolución del terreno (divide la casilla de 1,6 m)
const MARGIN = 8.0;           // terreno alrededor del tablero (m, múltiplo de STEP)

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ─────────────────────────────────────── Recursos compartidos ───────────────────────────────────────
// Las plantillas GLTF (geometría ya horneada + material de bioma) se cachean entre combates; las mallas
// instanciadas de cada escenario sí se liberan en dispose().
const _gltfCache = new Map();
const _loader = new GLTFLoader();
const GLTF_TIMEOUT_MS = 8000;
function loadGLTF(url) {
  if (!_gltfCache.has(url)) {
    _gltfCache.set(url, new Promise((resolve) => {
      // Una descarga atascada nunca debe dejar el combate esperando: a los 8 s se sigue sin esa pieza
      const timer = setTimeout(() => {
        console.warn('[BattleArena] el asset tarda demasiado, se omite en este combate:', url);
        _gltfCache.delete(url);
        resolve(null);
      }, GLTF_TIMEOUT_MS);
      _loader.load(url, (g) => { clearTimeout(timer); resolve(g); }, undefined, () => {
        clearTimeout(timer);
        console.warn('[BattleArena] falta el asset', url);
        resolve(null);
      });
    }));
  }
  return _gltfCache.get(url);
}

const _templates = new Map();
/**
 * Plantilla de un GLTF: partes { geo, mat } con la transformación del nodo horneada, base en y = 0
 * y centrada en XZ. kind: 'rock' (material de roca de la isla), 'plant' / 'prop' (toon de las islas).
 */
async function loadTemplate(url, kind, opts = {}) {
  const list = await loadTemplates(url, kind, opts);
  return list ? list[0] : null;
}

/**
 * Como loadTemplate, pero las rocas se separan por malla: las colecciones (StylisedRockCollection)
 * traen varias rocas en fila dentro del mismo GLTF y cada una debe ser una pieza distinta.
 */
async function loadTemplates(url, kind, opts = {}) {
  const key = `${url}|${kind}|${JSON.stringify(opts)}`;
  if (_templates.has(key)) return _templates.get(key);
  const p = (async () => {
    const gltf = await loadGLTF(url);
    if (!gltf) return null;
    gltf.scene.updateMatrixWorld(true);
    const meshes = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      geo.computeBoundingBox();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      meshes.push({ geo, src: mats[0] });
    });
    if (!meshes.length) return null;
    const groups = kind === 'rock' ? meshes.map((m) => [m]) : [meshes];
    return groups.map((g) => buildTemplate(g, kind, opts));
  })();
  _templates.set(key, p);
  return p;
}

function buildTemplate(parts, kind, opts) {
  {
    const box = new THREE.Box3();
    parts.forEach(({ geo }) => box.union(geo.boundingBox));
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const out = parts.map(({ geo, src }) => {
      geo.translate(-cx, -box.min.y, -cz);
      geo.computeBoundingSphere();
      let mat;
      if (kind === 'rock') mat = islandRockMaterial(src, opts.style || {});
      else {
        mat = stylizeFoliageMaterial(src);
        if (opts.tint !== undefined) mat.color.multiply(new THREE.Color(opts.tint)).multiplyScalar(1.15);
        if (opts.glow) {
          mat.emissive = mat.color.clone();
          mat.emissiveMap = mat.map || null;
          mat.emissiveIntensity = opts.glow;
        }
        if (src.alphaTest) mat.alphaTest = src.alphaTest;
      }
      return { geo, mat };
    });
    const size = new THREE.Vector3().subVectors(box.max, box.min);
    return { parts: out, size };
  }
}

// Corteza compartida entre escenarios (IslandTrees la cargaría de nuevo en cada instancia).
const _sharedBark = {};
class ArenaTrees extends IslandTrees {}
Object.defineProperty(ArenaTrees.prototype, '_barkTex', {
  get() { return _sharedBark; },
  set() { /* compartida */ },
  configurable: true,
});

// Texturas pintadas de las losas: una por tema y tipo (se cachean).
const _tileTextures = new Map();
function tileTexture(style, kind) {
  const key = `${style}|${kind}`;
  if (_tileTextures.has(key)) return _tileTextures.get(key);
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const rng = createSeededRandom(key.length * 977 + style.charCodeAt(0) * 31 + kind.charCodeAt(0));
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);
  const dab = (x, y, rx, ry, a, l, alpha) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = `rgba(${l},${l},${l},${alpha})`;
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  if (kind === 'bridge') {
    // Tablones de madera con vetas
    for (let i = 0; i < 4; i++) {
      const y0 = (i / 4) * S;
      g.fillStyle = `rgb(${220 + Math.floor(rng() * 30)},${220 + Math.floor(rng() * 30)},${220 + Math.floor(rng() * 30)})`;
      g.fillRect(0, y0 + 3, S, S / 4 - 6);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(150,150,150,${0.25 + rng() * 0.25})`;
        g.lineWidth = 1 + rng() * 2;
        const yy = y0 + 8 + rng() * (S / 4 - 16);
        g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(S * 0.3, yy + (rng() - 0.5) * 6, S * 0.6, yy + (rng() - 0.5) * 6, S, yy); g.stroke();
      }
      g.fillStyle = 'rgba(90,90,90,0.55)';
      g.beginPath(); g.arc(S * 0.12, y0 + S / 8, 5, 0, Math.PI * 2); g.arc(S * 0.88, y0 + S / 8, 5, 0, Math.PI * 2); g.fill();
    }
  } else {
    const n = kind === 'path' ? 70 : 140;
    for (let i = 0; i < n; i++) {
      const x = rng() * S, y = rng() * S;
      const l = 175 + Math.floor(rng() * 80);
      if (style === 'grass' || style === 'moss' || style === 'garden') {
        if (kind === 'path') dab(x, y, 10 + rng() * 16, 6 + rng() * 10, rng() * 3, l, 0.35);
        else {
          // Pinceladas de hierba (trazos cortos hacia arriba)
          g.strokeStyle = `rgba(${l},${l},${l},0.55)`;
          g.lineWidth = 2 + rng() * 2.5;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (rng() - 0.5) * 6, y - 8, x + (rng() - 0.5) * 10, y - 14 - rng() * 8); g.stroke();
        }
      } else if (style === 'sand') {
        if (kind === 'path') dab(x, y, 14 + rng() * 18, 3 + rng() * 4, 0.3 + (rng() - 0.5) * 0.3, l, 0.35);
        else {
          g.strokeStyle = `rgba(${l},${l},${l},0.5)`;
          g.lineWidth = 1.5 + rng() * 2;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 8, y - 10 - rng() * 10); g.stroke();
        }
      } else if (style === 'snow') {
        if (kind === 'path') {
          // Hielo: grietas finas y brillos
          g.strokeStyle = `rgba(255,255,255,${0.35 + rng() * 0.3})`;
          g.lineWidth = 1 + rng() * 1.5;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 50, y + (rng() - 0.5) * 50); g.stroke();
        } else dab(x, y, 10 + rng() * 18, 6 + rng() * 10, rng() * 3, 205 + Math.floor(rng() * 50), 0.4);
      }
    }
    if (style === 'garden' && kind === 'path') {
      // Losa dorada con junta central (caminos dorados de Genesis)
      g.strokeStyle = 'rgba(150,150,150,0.45)';
      g.lineWidth = 3;
      g.strokeRect(S * 0.18, S * 0.18, S * 0.64, S * 0.64);
    }
  }
  // Borde suave de la losa: se leen las casillas sin líneas duras
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(70,70,70,0.32)';
  g.strokeRect(5, 5, S - 10, S - 10);
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.strokeRect(12, 12, S - 24, S - 24);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _tileTextures.set(key, tex);
  return tex;
}

// ─────────────────────────────────────────────── Escenario ───────────────────────────────────────────────
export class BattleArena {
  /** Construye el escenario (carga los GLTF necesarios). */
  static async build(map) {
    const arena = new BattleArena(map);
    try {
      await arena._build();
      patchArenaGroup(arena.group); // Hito 37: dither fading de lo que tape a las unidades
      return arena;
    } catch (e) {
      // Respaldo: si falla el escenario, al menos se dibuja el tablero (losas y agua)
      console.warn('[BattleArena] escenario incompleto, se dibuja solo el tablero', map.id, e);
      arena.dispose();
      const basic = new BattleArena(map);
      basic._buildTiles();
      try { basic._buildWater(); } catch (_) { /* sin agua animada */ }
      try {
        // Los obstáculos del mapa siguen bloqueando: se marcan con rocas simples para que se vean
        basic._addUnderTiles(map.obstacles);
        basic._addBaked(map.obstacles.map((o) => {
          const p = basic.cellCenter(o.x, o.z);
          const g = new THREE.DodecahedronGeometry(0.6, 0);
          g.scale(1, 0.9, 1);
          g.translate(p.x, 0.45, p.z);
          return [g, basic.theme.terrain.cliff];
        }), 'ArenaFallbackObstacles');
      } catch (_) { /* nada más que hacer */ }
      basic.drawCalls = basic.group.children.length;
      patchArenaGroup(basic.group);
      return basic;
    }
  }

  constructor(map) {
    this.map = map;
    this.theme = ARENA_THEMES[map.biome] || ARENA_THEMES.forest;
    this.group = new THREE.Group();
    this.group.name = `BattleArena_${map.id}`;
    this.halfW = (map.width * T) / 2;
    this.halfD = (map.height * T) / 2;
    this.extents = { halfW: this.halfW, halfD: this.halfD };
    this.rng = createSeededRandom(map.seed || 3500);
    this.noise = new SimplexNoise(map.seed || 3500);
    this.time = { value: 0 };
    this._disposables = [];
    this._updatables = [];
    this._occupied = []; // [x, z, r] para no amontonar la decoración
    this._boardCells = [];
    this._chasmCells = [];
    for (let x = 0; x < map.width; x++) for (let z = 0; z < map.height; z++) {
      const k = map.cells[x][z];
      if (cellExists(k)) this._boardCells.push({ x, z, k });
      else if (k === CELL.CHASM) this._chasmCells.push({ x, z });
    }
  }

  // Coordenadas idénticas a GridManager.gridToWorld
  cellCenter(x, z) { return new THREE.Vector3((x + 0.5) * T - this.halfW, 0, (z + 0.5) * T - this.halfD); }
  cellAt(wx, wz) {
    const x = Math.floor((wx + this.halfW) / T), z = Math.floor((wz + this.halfD) / T);
    if (x < 0 || z < 0 || x >= this.map.width || z >= this.map.height) return null;
    return { x, z, k: this.map.cells[x][z] };
  }

  async _build() {
    const t0 = performance.now();
    this._buildTerrain();
    this._buildTiles();
    this._buildWater();
    // Árboles del tablero y de alrededor en un solo IslandTrees
    const trees = [];
    // La decoración nunca debe impedir el combate: si un asset falla, el tablero y el terreno siguen
    try { await this._buildObstacles(trees); } catch (e) { console.warn('[BattleArena] obstáculos', e); }
    try { await this._buildDressing(trees); } catch (e) { console.warn('[BattleArena] decoración', e); }
    if (trees.length) {
      try {
        this.trees = new ArenaTrees(this.group, trees, SUN_DIRECTION, this.theme.treeCfg || {});
        this._updatables.push((dt) => this.trees.update(dt));
        this._setupOcclusionFade();
      } catch (e) { console.warn('[BattleArena] árboles', e); }
    }
    try { this._buildParticles(); } catch (e) { console.warn('[BattleArena] partículas', e); }
    this.buildMs = Math.round(performance.now() - t0);
    let draws = 0;
    this.group.traverse((o) => { if (o.isMesh || o.isPoints) draws++; });
    this.drawCalls = draws;
    console.log(`[BattleArena] ${this.map.id}: ${this.drawCalls} draw calls, ${this.buildMs} ms`);
  }

  // ───────────────────────────────────────── Terreno ─────────────────────────────────────────
  _distToCells(list, wx, wz) {
    let best = Infinity;
    for (const c of list) {
      const x0 = c.x * T - this.halfW, z0 = c.z * T - this.halfD;
      const dx = Math.max(x0 - wx, 0, wx - (x0 + T));
      const dz = Math.max(z0 - wz, 0, wz - (z0 + T));
      const d = Math.hypot(dx, dz);
      if (d < best) best = d;
      if (best === 0) return 0;
    }
    return best;
  }

  _distToRect(wx, wz) {
    const dx = Math.max(-this.halfW - wx, 0, wx - this.halfW);
    const dz = Math.max(-this.halfD - wz, 0, wz - this.halfD);
    return Math.hypot(dx, dz);
  }

  /** Altura del terreno (no del tablero) en un punto del mundo. */
  _terrainHeight(wx, wz) {
    const th = this.theme.terrain;
    const map = this.map;
    const cell = this.cellAt(wx, wz);
    const dBoard = this._distToCells(this._boardCells, wx, wz);
    if (dBoard === 0 && cell) return cell.k === CELL.WATER ? WATER_BED : GROUND_Y;
    const n1 = this.noise.noise2D(wx * 0.11, wz * 0.11) * 0.5 + 0.5;
    const n2 = this.noise.noise2D(wx * 0.37 + 17.0, wz * 0.37 - 4.0) * 0.5 + 0.5;
    let h = GROUND_Y + th.mound * smooth(0.1, 2.6, dBoard) * (0.45 + 0.75 * n1) + (n2 - 0.5) * 0.18 * smooth(0, 1.2, dBoard);
    // Paredes de cañón / glaciar: el terreno natural junto al tablero sube como acantilado
    if (map.terrainRise) {
      const wall = map.terrainRise * smooth(0.12, 1.25, dBoard) * (0.8 + 0.35 * n1) * (1 - smooth(2.0, 7.0, this._distToRect(wx, wz)));
      h = Math.max(h, GROUND_Y + wall);
    }
    // Borde de la isla: forma orgánica que rodea el tablero y cae al mar de nubes
    const islandR = (map.floating ? 2.4 : 4.0) + 2.4 * this.noise.noise2D(wx * 0.06 + 40, wz * 0.06 - 12) * 0.5 + 1.2;
    const e = smooth(-0.8, 0.5, dBoard - islandR);
    const drop = -th.edgeDrop * (0.85 + 0.3 * n2);
    h = lerp(h, drop, e);
    // Grietas / vacío dentro del tablero (y, en mapas flotantes, su prolongación hacia fuera)
    if (this._chasmCells.length) {
      let inChasm = cell && cell.k === CELL.CHASM;
      if (!cell && map.floating) {
        const cx = Math.min(map.width - 1, Math.max(0, Math.floor((wx + this.halfW) / T)));
        const cz = Math.min(map.height - 1, Math.max(0, Math.floor((wz + this.halfD) / T)));
        inChasm = map.cells[cx][cz] === CELL.CHASM;
      }
      if (inChasm) h = lerp(h, drop, smooth(0.0, 0.3, dBoard));
    }
    return h;
  }

  _buildTerrain() {
    const th = this.theme.terrain;
    const x0 = -this.halfW - MARGIN, z0 = -this.halfD - MARGIN;
    const nx = Math.round((this.halfW * 2 + MARGIN * 2) / STEP);
    const nz = Math.round((this.halfD * 2 + MARGIN * 2) / STEP);
    const vx = nx + 1, vz = nz + 1;
    const pos = new Float32Array(vx * vz * 3);
    const heights = new Float32Array(vx * vz);
    for (let j = 0; j < vz; j++) for (let i = 0; i < vx; i++) {
      const x = x0 + i * STEP, z = z0 + j * STEP;
      // Pequeño jitter fuera del tablero para romper la rejilla
      const cell = this.cellAt(x, z);
      const inBoard = cell && cellExists(cell.k);
      const jx = inBoard ? 0 : (this.noise.noise2D(x * 1.7, z * 1.7) * 0.12);
      const jz = inBoard ? 0 : (this.noise.noise2D(z * 1.7 + 9, x * 1.7) * 0.12);
      const h = this._terrainHeight(x, z);
      const k = j * vx + i;
      heights[k] = h;
      pos[k * 3] = x + jx; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z + jz;
    }
    const idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * vx + i, b = a + 1, c = a + vx, d = c + 1;
      // Fuera de la isla (todo el quad muy abajo) no se dibuja
      const lo = th.edgeDrop * 0.8;
      if (heights[a] < -lo && heights[b] < -lo && heights[c] < -lo && heights[d] < -lo) continue;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // Color por vértice: hierba / arena / nieve en lo llano, roca (con estratos) en las paredes
    const nrm = geo.attributes.normal;
    const col = new Float32Array(vx * vz * 3);
    const C = (h) => new THREE.Color(h);
    const g0 = C(th.ground[0]), g1 = C(th.ground[1]), g2 = C(th.ground[2]);
    const dry = th.dry !== undefined ? C(th.dry) : null;
    const snow = th.snow !== undefined ? C(th.snow) : null;
    const soil = C(th.soil), cliff = C(th.cliff), cliffSh = C(th.cliffShadow), cliffTop = C(th.cliffTop);
    const strata = th.strata ? th.strata.map(C) : null;
    const tmp = new THREE.Color();
    for (let k = 0; k < vx * vz; k++) {
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
      const ny = nrm.getY(k);
      const n = this.noise.noise2D(x * 0.18, z * 0.18) * 0.5 + 0.5;
      const m = this.noise.noise2D(x * 0.6 + 3, z * 0.6 - 7) * 0.5 + 0.5;
      // Suelo
      tmp.copy(g1).lerp(g2, smooth(0.35, 0.8, n) * 0.8).lerp(g0, (1 - smooth(0.15, 0.5, m)) * 0.4);
      if (dry) tmp.lerp(dry, smooth(0.6, 0.85, m) * 0.45);
      if (snow) tmp.lerp(snow, (th.snowAmount ?? 0.55) + 0.35 * smooth(0.3, 0.7, n));
      // Bajo el tablero y en la orilla del agua: tierra
      if (y < GROUND_Y + 0.05 && y > WATER_BED - 0.05) tmp.lerp(soil, 0.35);
      // Paredes
      const steep = 1 - smooth(0.45, 0.8, ny);
      if (steep > 0.001) {
        tmp.lerp(cliffTop, 0);
        const rock = cliff.clone();
        if (strata) {
          const band = (y * 0.55 + n * 0.6) % 1;
          const s = strata[0].clone().lerp(strata[1], smooth(0.1, 0.45, (band + 1) % 1)).lerp(strata[2], smooth(0.55, 0.85, (band + 1) % 1));
          rock.lerp(s, 0.75);
        }
        rock.lerp(cliffSh, smooth(-2, -th.edgeDrop, y) * 0.6 + (m - 0.5) * 0.2);
        tmp.lerp(rock, steep);
      }
      col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getSoftToonRamp() });
    mat.name = 'ArenaTerrain';
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'ArenaTerrain';
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.group.add(mesh);
    this._disposables.push(geo, mat);
    this._terrain = { x0, z0, vx, vz, heights };
  }

  /** Altura del terreno muestreada de la malla ya construida (bilineal). */
  groundAt(wx, wz) {
    const t = this._terrain;
    const fi = (wx - t.x0) / STEP, fj = (wz - t.z0) / STEP;
    const i = Math.floor(fi), j = Math.floor(fj);
    if (i < 0 || j < 0 || i >= t.vx - 1 || j >= t.vz - 1) return -50;
    const u = fi - i, v = fj - j;
    const H = (a, b) => t.heights[b * t.vx + a];
    return lerp(lerp(H(i, j), H(i + 1, j), u), lerp(H(i, j + 1), H(i + 1, j + 1), u), v);
  }

  // ───────────────────────────────────────── Tablero ─────────────────────────────────────────
  _slabGeometry(sideHex) {
    const geo = new THREE.BoxGeometry(T * 0.965, TILE_THICK, T * 0.965);
    geo.translate(0, TILE_TOP - TILE_THICK / 2, 0);
    const nrm = geo.attributes.normal;
    const side = new THREE.Color(sideHex);
    const col = new Float32Array(nrm.count * 3);
    for (let i = 0; i < nrm.count; i++) {
      const top = nrm.getY(i) > 0.5;
      const c = top ? new THREE.Color(1, 1, 1) : side;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }

  _buildTiles() {
    const tt = this.theme.tiles;
    const groups = { floor: [], path: [], bridge: [] };
    for (const c of this._boardCells) {
      if (c.k === CELL.WATER) continue;
      const kind = c.k === CELL.PATH ? 'path' : (c.k === CELL.BRIDGE ? 'bridge' : 'floor');
      groups[kind].push(c);
    }
    const geo = this._slabGeometry(tt.side);
    this._disposables.push(geo);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const color = new THREE.Color();
    for (const [kind, list] of Object.entries(groups)) {
      if (!list.length) continue;
      const mat = new THREE.MeshToonMaterial({
        map: tileTexture(tt.texture, kind),
        vertexColors: true,
        gradientMap: getSoftToonRamp(),
      });
      mat.name = `ArenaTile_${kind}`;
      if (kind === 'path' && tt.pathGlow) { mat.emissive = new THREE.Color(tt.pathGlow); mat.emissiveIntensity = 0.12; }
      if (kind === 'path' && tt.pathIce) { mat.emissive = new THREE.Color(0x9fdcff); mat.emissiveIntensity = 0.08; }
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      inst.name = `ArenaTiles_${kind}`;
      inst.receiveShadow = true;
      const [light, dark] = tt[kind];
      list.forEach((c, i) => {
        const p = this.cellCenter(c.x, c.z);
        // Rotación de 90° al azar: la textura no se repite igual en casillas vecinas (salvo el puente)
        q.setFromAxisAngle(yAxis, kind === 'bridge' ? this._bridgeYaw(c) : Math.floor(this.rng() * 4) * Math.PI / 2);
        m4.compose(p, q, new THREE.Vector3(1, 1, 1));
        inst.setMatrixAt(i, m4);
        color.setHex((c.x + c.z) % 2 ? dark : light);
        // Losas de acento (hierba violeta, claros, hierba seca) con ruido suave, no al azar puro
        if (kind === 'floor' && tt.accent) {
          const n = this.noise.noise2D(c.x * 0.45 + 7.3, c.z * 0.45 - 2.1) * 0.5 + 0.5;
          if (n > 1 - tt.accent.chance) color.lerp(new THREE.Color(tt.accent.color), 0.55);
        }
        color.offsetHSL((this.rng() - 0.5) * 0.01, (this.rng() - 0.5) * 0.04, (this.rng() - 0.5) * 0.035);
        inst.setColorAt(i, color);
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      this.group.add(inst);
      this._disposables.push(mat, inst);
    }
  }

  /** Los tablones cruzan el agua: orientación según dónde está el agua vecina. */
  _bridgeYaw(c) {
    const w = (x, z) => this.map.cells[x]?.[z] === CELL.WATER;
    return (w(c.x, c.z - 1) || w(c.x, c.z + 1)) && !(w(c.x - 1, c.z) || w(c.x + 1, c.z)) ? Math.PI / 2 : 0;
  }

  _buildWater() {
    const cells = this._boardCells.filter((c) => c.k === CELL.WATER);
    if (!cells.length) return;
    const W = this.theme.water;
    const isWater = (x, z) => this.map.cells[x]?.[z] === CELL.WATER;
    const SUB = 4;
    const positions = [], foam = [], idx = [];
    for (const c of cells) {
      const base = positions.length / 3;
      const x0 = c.x * T - this.halfW, z0 = c.z * T - this.halfD;
      for (let j = 0; j <= SUB; j++) for (let i = 0; i <= SUB; i++) {
        const u = i / SUB, v = j / SUB;
        positions.push(x0 + u * T, WATER_Y, z0 + v * T);
        // Espuma: distancia al borde con suelo (no con otra casilla de agua)
        let d = 1;
        if (!isWater(c.x - 1, c.z)) d = Math.min(d, u);
        if (!isWater(c.x + 1, c.z)) d = Math.min(d, 1 - u);
        if (!isWater(c.x, c.z - 1)) d = Math.min(d, v);
        if (!isWater(c.x, c.z + 1)) d = Math.min(d, 1 - v);
        foam.push(1 - smooth(0.0, 0.32, d));
      }
      for (let j = 0; j < SUB; j++) for (let i = 0; i < SUB; i++) {
        const a = base + j * (SUB + 1) + i, b = a + 1, cc = a + SUB + 1, d = cc + 1;
        idx.push(a, cc, b, b, cc, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aFoam', new THREE.Float32BufferAttribute(foam, 1));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsLib.fog,
        uTime: this.time,
        uShallow: { value: new THREE.Color(W.shallow) },
        uMid: { value: new THREE.Color(W.mid) },
        uDeep: { value: new THREE.Color(W.deep) },
        uFoam: { value: new THREE.Color(W.foam) },
        uGlow: { value: new THREE.Color(W.glow ?? 0x000000) },
        uOpacity: { value: W.opacity ?? 0.82 },
      },
      transparent: true,
      depthWrite: false,
      fog: true,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        attribute float aFoam;
        varying float vFoam;
        varying vec3 vW;
        void main() {
          vFoam = aFoam;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime, uOpacity;
        uniform vec3 uShallow, uMid, uDeep, uFoam, uGlow;
        varying float vFoam;
        varying vec3 vW;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
        void main() {
          vec2 p = vW.xz;
          float w1 = vn(p * 1.3 + vec2(uTime * 0.25, uTime * 0.12));
          float w2 = vn(p * 2.7 - vec2(uTime * 0.18, -uTime * 0.21));
          float waves = w1 * 0.6 + w2 * 0.4;
          vec3 col = mix(uMid, uShallow, smoothstep(0.35, 0.8, waves));
          col = mix(col, uDeep, (1.0 - smoothstep(0.0, 0.6, vFoam + waves * 0.3)) * 0.35);
          // Brillos cel-shaded en las crestas
          float spark = smoothstep(0.82, 0.9, w1 * w2 * 1.6);
          col += vec3(1.0) * spark * 0.35;
          // Espuma animada en la orilla
          float f = smoothstep(0.35, 0.75, vFoam + (vn(p * 5.0 + uTime * 0.4) - 0.5) * 0.35);
          col = mix(col, uFoam, f * 0.85);
          col += uGlow * 0.18 * (0.6 + 0.4 * sin(uTime * 1.4 + p.x * 0.8 + p.y * 0.6));
          gl_FragColor = vec4(col, mix(uOpacity, 1.0, f * 0.7));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'ArenaWater';
    mesh.renderOrder = 2;
    this.group.add(mesh);
    this._disposables.push(geo, mat);
  }

  // ───────────────────────────────────── Obstáculos del tablero ─────────────────────────────────────
  async _buildObstacles(trees) {
    const obs = this.theme.obstacles;
    const bySlot = { tree: [], rock: [], special: [] };
    for (const o of this.map.obstacles) bySlot[o.slot].push(o);
    // Losa bajo cada obstáculo: el tablero se ve continuo
    const underTiles = this.map.obstacles.map((o) => ({ x: o.x, z: o.z }));
    if (underTiles.length) this._addUnderTiles(underTiles);

    for (const [slot, list] of Object.entries(bySlot)) {
      if (!list.length) continue;
      const spec = obs[slot];
      const places = list.map((o) => {
        const p = this.cellCenter(o.x, o.z);
        this._occupied.push([p.x, p.z, 0.9]);
        return p;
      });
      await this._placeKind(spec, places, trees, { onBoard: true });
    }
  }

  _addUnderTiles(cells) {
    const tt = this.theme.tiles;
    const geo = this._slabGeometry(tt.side);
    const mat = new THREE.MeshToonMaterial({ map: tileTexture(tt.texture, 'floor'), vertexColors: true, gradientMap: getSoftToonRamp() });
    mat.name = 'ArenaTile_under';
    const inst = new THREE.InstancedMesh(geo, mat, cells.length);
    inst.name = 'ArenaTilesUnder';
    const m4 = new THREE.Matrix4();
    const color = new THREE.Color();
    cells.forEach((c, i) => {
      m4.makeTranslation(this.cellCenter(c.x, c.z));
      inst.setMatrixAt(i, m4);
      color.setHex(tt.floor[1]).multiplyScalar(0.88);
      inst.setColorAt(i, color);
    });
    inst.receiveShadow = true;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    this.group.add(inst);
    this._disposables.push(geo, mat, inst);
  }

  /** Coloca un tipo de pieza (árbol, roca, GLTF, cristal, pilar, pedestal) en una lista de puntos. */
  async _placeKind(spec, places, trees, { onBoard = false } = {}) {
    const rng = this.rng;
    const rand = (r) => (Array.isArray(r) ? lerp(r[0], r[1], rng()) : r);
    switch (spec.make) {
      case 'tree': {
        for (const p of places) {
          const [kind, family] = spec.kinds[Math.floor(rng() * spec.kinds.length)];
          const s = rand(spec.scale);
          trees.push({ kind, family, pos: new THREE.Vector3(p.x, onBoard ? TILE_TOP - 0.05 : p.y, p.z), s, sy: s * (0.95 + rng() * 0.12) });
        }
        break;
      }
      case 'rock': {
        const r = this.theme.rocks;
        await this._instanceTemplates(r.urls.map((u) => [u, 'rock', { style: r.style }]), places.map((p) => ({
          p, rotY: rng() * Math.PI * 2, fit: rand(spec.scale), heightFit: onBoard ? 1.25 : null, sink: 0.12,
        })), { cast: true });
        break;
      }
      case 'gltf': {
        await this._instanceTemplates([[spec.url, 'prop', {}]], places.map((p) => ({
          p, rotY: rng() * Math.PI * 2, height: rand(spec.height), sink: 0.05,
        })), { cast: true });
        break;
      }
      case 'crystal':
        this._buildCrystals(places, spec, onBoard);
        break;
      case 'pillar':
        this._buildPillars(places.map((p) => ({ p, H: rand(spec.height), R: onBoard ? 0.55 : 0.75 + rng() * 0.6 })));
        break;
      case 'pedestal':
        this._buildPedestals(places);
        break;
      default:
        break;
    }
  }

  /**
   * Instancia plantillas GLTF. items: { p, rotY, fit? (ancho en m), height? (alto en m), heightFit?, sink }.
   * Cada item usa una de las plantillas (al azar, determinista).
   */
  async _instanceTemplates(specs, items, { cast = true } = {}) {
    if (!items.length) return;
    const tpls = (await Promise.all(specs.map(([u, k, o]) => loadTemplates(u, k, o)))).flat().filter(Boolean);
    if (!tpls.length) return;
    const buckets = tpls.map(() => []);
    for (const it of items) buckets[Math.floor(this.rng() * tpls.length)].push(it);
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    tpls.forEach((tpl, ti) => {
      const list = buckets[ti];
      if (!list.length) return;
      const mats = list.map((it) => {
        let s;
        if (it.height) s = it.height / Math.max(tpl.size.y, 0.01);
        else {
          // Como GrandIslandZone: las rocas altas no se convierten en pilares gigantes
          const w = Math.max(tpl.size.x, tpl.size.z, tpl.size.y * 1.25, 0.01);
          s = (it.fit || 1) / w;
          if (it.heightFit) s = Math.min(s, it.heightFit / Math.max(tpl.size.y, 0.01));
        }
        if (it.scale) s = it.scale;
        q.setFromAxisAngle(yAxis, it.rotY || 0);
        const y = (it.p.y ?? 0) - (it.sink || 0) * s * tpl.size.y;
        return new THREE.Matrix4().compose(new THREE.Vector3(it.p.x, y, it.p.z), q, new THREE.Vector3(s, s * (it.sy || 1), s));
      });
      for (const part of tpl.parts) {
        const inst = new THREE.InstancedMesh(part.geo, part.mat, list.length);
        inst.name = 'ArenaProp';
        inst.castShadow = cast;
        inst.receiveShadow = true;
        mats.forEach((m, i) => inst.setMatrixAt(i, m));
        inst.instanceMatrix.needsUpdate = true;
        inst.computeBoundingSphere();
        this.group.add(inst);
        this._disposables.push(inst); // la geometría y el material de la plantilla son compartidos
      }
    });
  }

  _buildCrystals(places, spec, onBoard) {
    if (!places.length) return;
    const mat = crystalMaterial({ color: spec.color, glow: spec.glow, rim: spec.rim, opacity: spec.opacity, glowIntensity: spec.glowIntensity, timeUniform: this.time });
    const rng = this.rng;
    const geos = [];
    for (const p of places) {
      const n = spec.shards || (2 + Math.floor(rng() * 3));
      const H = Array.isArray(spec.height) ? lerp(spec.height[0], spec.height[1], rng()) : (onBoard ? 1.8 : 0.6 + rng() * 1.4);
      for (let i = 0; i < n; i++) {
        const main = i === 0;
        const h = main ? H : H * (0.35 + rng() * 0.4);
        const r = main ? (onBoard ? 0.4 : 0.22) : (onBoard ? 0.18 : 0.12) + rng() * 0.1;
        const g = crystalPrismGeometry(r, h, 6);
        const a = rng() * Math.PI * 2, d = main ? 0 : (onBoard ? 0.32 : 0.28) + rng() * 0.18;
        g.rotateZ(main ? (rng() - 0.5) * 0.12 : (rng() - 0.5) * 0.7);
        g.rotateY(a);
        g.translate(p.x + Math.cos(a) * d, (p.y ?? 0) - 0.08, p.z + Math.sin(a) * d);
        geos.push(g);
      }
    }
    const geo = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'ArenaCrystals';
    mesh.castShadow = true;
    this.group.add(mesh);
    this._disposables.push(geo, mat);
  }

  /** Pilares lavanda en capas (como en GenesisNature): tambores irregulares y remate de seta. */
  _buildPillars(items) {
    if (!items.length) return;
    const LAV = [0x8f86c8, 0x9d92d8, 0xb3a6ea, 0xc4b8f2], LAV_DARK = 0x5f5694, CAP = 0xd2c4fa;
    const parts = [];
    for (const { p, H, R } of items) {
      const rng = createSeededRandom(Math.floor((p.x * 131 + p.z * 17) * 1000) >>> 0);
      let y = (p.y ?? 0) - 0.15;
      const n = Math.max(2, Math.round(H / 0.75));
      let ox = 0, oz = 0;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const r = R * (1.0 - 0.25 * t) * (0.88 + rng() * 0.24);
        const h = (H / n) * (0.8 + rng() * 0.4);
        ox += (rng() - 0.5) * 0.18 * R; oz += (rng() - 0.5) * 0.18 * R;
        parts.push([this._drum(r, h, i * 7.1 + p.x, p.x + ox, y + h / 2, p.z + oz), i === 0 ? LAV_DARK : LAV[Math.floor(rng() * LAV.length)]]);
        parts.push([this._drum(r * 0.94, 0.07, i * 3.3, p.x + ox, y + h - 0.02, p.z + oz), LAV_DARK]);
        y += h;
      }
      const cr = R * (1.0 + rng() * 0.3);
      parts.push([this._drum(cr, 0.4, 9.9, p.x + ox, y + 0.2, p.z + oz, 12), LAV[2]]);
      const top = new THREE.IcosahedronGeometry(1, 1);
      top.scale(cr * 0.95, 0.22, cr * 0.95);
      top.translate(p.x + ox, y + 0.45, p.z + oz);
      parts.push([top, CAP]);
    }
    this._addBaked(parts, 'ArenaPillars');
  }

  _drum(r, h, seed, x, y, z, segs = 11) {
    const g = new THREE.CylinderGeometry(r, r * 1.06, h, segs, 1);
    const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const px = pp.getX(i), pz = pp.getZ(i);
      const a = Math.atan2(pz, px);
      const k = 1 + 0.08 * Math.sin(a * 3 + seed) + 0.05 * Math.sin(a * 5 + seed * 2.3);
      pp.setX(i, px * k);
      pp.setZ(i, pz * k);
    }
    g.translate(x, y, z);
    return g;
  }

  /** Pedestal del Jardín Real: zócalo escalonado de mármol, monumento abstracto lavanda y remate dorado. */
  _buildPedestals(places) {
    const parts = [];
    const glow = [];
    for (const p of places) {
      const b1 = new THREE.BoxGeometry(1.42, 0.26, 1.42); b1.translate(p.x, 0.13, p.z);
      const b2 = new THREE.BoxGeometry(1.1, 0.22, 1.1); b2.translate(p.x, 0.37, p.z);
      const col = new THREE.CylinderGeometry(0.32, 0.4, 1.25, 8); col.translate(p.x, 1.1, p.z);
      const orb = new THREE.IcosahedronGeometry(0.34, 1); orb.translate(p.x, 2.0, p.z);
      const ring = new THREE.TorusGeometry(0.45, 0.05, 6, 20); ring.rotateX(Math.PI / 2); ring.translate(p.x, 1.78, p.z);
      parts.push([b1, 0xe8e2f4], [b2, 0xc8bfe0], [col, 0x9d92d8], [ring, 0xf2c45a]);
      glow.push([orb, 0xffd98a]);
    }
    this._addBaked(parts, 'ArenaPedestals');
    this._addBaked(glow, 'ArenaPedestalGlow', true);
  }

  _addBaked(parts, name, emissive = false) {
    if (!parts.length) return;
    const geos = parts.map(([g, color]) => {
      const geo = g.index ? g.toNonIndexed() : g;
      geo.computeVertexNormals();
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', geo.attributes.position);
      out.setAttribute('normal', geo.attributes.normal);
      const c = new THREE.Color(color);
      const n = geo.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      out.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      if (geo !== g) g.dispose();
      return out;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    merged.computeBoundingSphere();
    const mat = emissive
      ? new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
      : new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getSoftToonRamp() });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = name;
    mesh.castShadow = !emissive;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this._disposables.push(merged, mat);
  }

  // ─────────────────────────────────────── Decoración del bioma ───────────────────────────────────────
  /**
   * Busca puntos libres del terreno alrededor del tablero.
   * minD/maxD: distancia al tablero (m); spacing: separación con lo ya colocado.
   */
  _scatter(count, { minD = 0.6, maxD = 7.0, spacing = 1.2, minY = -0.8, maxY = 6.0, flatOnly = false } = {}) {
    const out = [];
    const rng = this.rng;
    const W = this.halfW + MARGIN - 0.6, D = this.halfD + MARGIN - 0.6;
    for (let tries = 0; tries < count * 40 && out.length < count; tries++) {
      const x = (rng() * 2 - 1) * W, z = (rng() * 2 - 1) * D;
      const cell = this.cellAt(x, z);
      if (cell && (cellExists(cell.k) || cell.k === CELL.CHASM)) continue;
      const d = this._distToCells(this._boardCells, x, z);
      if (d < minD || d > maxD) continue;
      if (this._chasmCells.length && this._distToCells(this._chasmCells, x, z) < 0.5) continue;
      const y = this.groundAt(x, z);
      if (y < minY || y > maxY) continue;
      if (flatOnly) {
        const e = 0.35;
        const slope = Math.abs(this.groundAt(x + e, z) - this.groundAt(x - e, z)) + Math.abs(this.groundAt(x, z + e) - this.groundAt(x, z - e));
        if (slope > 0.55) continue;
      }
      if (this._occupied.some(([ox, oz, r]) => Math.hypot(ox - x, oz - z) < r + spacing)) continue;
      out.push(new THREE.Vector3(x, y, z));
      this._occupied.push([x, z, spacing * 0.5]);
    }
    return out;
  }

  async _buildDressing(trees) {
    const ds = this.theme.dressing;
    const rng = this.rng;
    // Árboles: lejos del borde del tablero para no tapar a las unidades
    const weights = ds.trees.flatMap(([kind, family, w]) => Array(w).fill([kind, family]));
    const treeSpots = this._scatter(ds.treeCount, { minD: 2.8, maxD: 7.6, spacing: 2.2, flatOnly: true, minY: -0.6 });
    for (const p of treeSpots) {
      const [kind, family] = weights[Math.floor(rng() * weights.length)];
      const s = lerp(ds.treeScale[0], ds.treeScale[1], rng()) * (kind === 'palm' ? 0.8 : 1);
      trees.push({ kind, family, pos: new THREE.Vector3(p.x, p.y - 0.15, p.z), s, sy: s * (0.92 + rng() * 0.16) });
    }
    // Rocas de la isla (grandes en el borde, pequeñas cerca del tablero)
    const rockSpots = this._scatter(ds.rockCount, { minD: 0.4, maxD: 7.0, spacing: 1.1, minY: -1.5, maxY: 8 });
    const r = this.theme.rocks;
    await this._instanceTemplates(r.urls.map((u) => [u, 'rock', { style: r.style }]), rockSpots.map((p) => {
      const d = this._distToCells(this._boardCells, p.x, p.z);
      return { p, rotY: rng() * Math.PI * 2, fit: lerp(0.6, 1.2, rng()) * (d > 3 ? 1.9 : 1.0), sink: 0.22 };
    }));
    // Props GLTF del bioma (cactus, hongos)
    for (const pr of ds.props || []) {
      const spots = this._scatter(pr.count, { minD: pr.near ? 0.25 : 0.8, maxD: 6.5, spacing: 0.9, flatOnly: true });
      await this._instanceTemplates([[pr.url, 'prop', { glow: pr.glow || 0 }]], spots.map((p) => ({
        p, rotY: rng() * Math.PI * 2, height: lerp(pr.height[0], pr.height[1], rng()), sink: 0.04,
      })));
    }
    // Cristales y pilares
    if (ds.crystals) {
      const spots = this._scatter(ds.crystals.count, { minD: 0.6, maxD: 6.5, spacing: 1.0 });
      this._buildCrystals(spots, { ...ds.crystals, shards: 0, height: null }, false);
    }
    if (ds.pillars) {
      const spots = this._scatter(ds.pillars.count, { minD: 1.8, maxD: 7.0, spacing: 2.2, flatOnly: true });
      this._buildPillars(spots.map((p) => ({ p, H: lerp(ds.pillars.height[0], ds.pillars.height[1], rng()), R: 0.7 + rng() * 0.6 })));
    }
    // Vegetación baja (hierba, flores, arbustos): pegada al tablero si es `near`
    for (const pl of ds.plants || []) {
      const spots = this._scatter(pl.count, { minD: pl.near ? 0.12 : 0.5, maxD: pl.near ? 4.5 : 7.0, spacing: pl.near ? 0.35 : 0.7, flatOnly: true });
      await this._instanceTemplates([[pl.url, 'plant', { tint: pl.tint, glow: pl.glow || 0 }]], spots.map((p) => ({
        p, rotY: rng() * Math.PI * 2, scale: lerp(pl.scale[0], pl.scale[1], rng()), sink: 0.02,
      })), { cast: false });
    }
  }

  _buildParticles() {
    const center = new THREE.Vector3(0, 3, 0);
    for (const cfg of this.theme.particles || []) {
      const p = new IslandParticles(this.group, { ...cfg, seed: (this.map.seed || 1) + cfg.count });
      this._updatables.push((dt) => p.update(dt, center));
      this._disposables.push(p.points.geometry, p.material);
    }
  }

  // ─────────────────────────────── Árboles que tapan el tablero ───────────────────────────────
  /**
   * La cámara gira 360°: los árboles de alrededor que quedan entre la cámara y el tablero se disuelven
   * con un tramado de pantalla (como el Fade LOD del Ártico) y reaparecen al girar. Los árboles que son
   * obstáculos del tablero no se tocan. Cada malla instanciada recibe su propio atributo aFade.
   */
  _setupOcclusionFade() {
    const patched = new Set();
    const patch = (m) => {
      if (!m || patched.has(m)) return;
      patched.add(m);
      const prev = m.onBeforeCompile;
      const prevKey = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => '';
      m.onBeforeCompile = (shader, r) => {
        if (prev) prev.call(m, shader, r);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
            attribute float aFade;
            varying float vArenaFade;`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            vArenaFade = aFade;`);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
            varying float vArenaFade;`)
          .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
            if (vArenaFade < 0.995) {
              float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
              if (ign > vArenaFade) discard;
            }`);
      };
      m.customProgramCacheKey = () => prevKey() + '-arenafade';
      m.needsUpdate = true;
    };
    this._fadeItems = [];
    const tmpM = new THREE.Matrix4();
    const tmpP = new THREE.Vector3();
    for (const mesh of this.trees.meshes) {
      // Geometría propia por malla (las arquetipo se comparten entre mallas) para su atributo aFade
      const src = mesh.geometry;
      const geo = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(src.attributes)) geo.setAttribute(name, attr);
      if (src.index) geo.setIndex(src.index);
      geo.boundingSphere = src.boundingSphere;
      const fade = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count).fill(1), 1);
      fade.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aFade', fade);
      mesh.geometry = geo;
      patch(mesh.material);
      const items = [];
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, tmpM);
        tmpP.setFromMatrixPosition(tmpM);
        const cell = this.cellAt(tmpP.x, tmpP.z);
        const onBoard = cell && cellExists(cell.k);
        items.push({ x: tmpP.x, z: tmpP.z, onBoard, f: 1 });
      }
      this._fadeItems.push({ mesh, fade, items, srcGeo: src, geo });
    }
  }

  _updateOcclusionFade(dt, camera, target) {
    if (!this._fadeItems || !camera) return;
    const ox = target ? target.x : 0, oz = target ? target.z : 0;
    let cx = camera.position.x - ox, cz = camera.position.z - oz;
    const len = Math.hypot(cx, cz) || 1;
    cx /= len; cz /= len;
    // Medio ancho del tablero a lo largo de la dirección de la cámara y en perpendicular
    const along = Math.abs(this.halfW * cx) + Math.abs(this.halfD * cz);
    const lateral = Math.abs(this.halfW * cz) + Math.abs(this.halfD * cx);
    const k = 1 - Math.exp(-6 * dt);
    for (const f of this._fadeItems) {
      let dirty = false;
      f.items.forEach((it, i) => {
        if (it.onBoard) return;
        const vx = it.x - ox, vz = it.z - oz;
        const d = vx * cx + vz * cz;                 // hacia la cámara
        const l = Math.abs(vx * cz - vz * cx);       // de lado
        const inFront = smooth(along - 2.5, along + 0.5, d) * (1 - smooth(lateral + 0.5, lateral + 3.5, l));
        // Hito 37: más suave (el tramado por unidad de ArenaOcclusionDither hace el trabajo fino)
        const goal = 1 - inFront * 0.6;
        const nf = it.f + (goal - it.f) * k;
        if (Math.abs(nf - it.f) > 0.002) { it.f = nf; f.fade.setX(i, nf); dirty = true; }
      });
      if (dirty) f.fade.needsUpdate = true;
    }
  }

  // ───────────────────────────────────────── Ciclo de vida ─────────────────────────────────────────
  /** Lo llama SceneManager.setArena al poner este escenario. */
  onActivate() {
    setOcclusionBoard(this.map, this.halfW, this.halfD, T);
    clearOcclusionPoints();
  }

  update(dt, time, camera = null, target = null, occlusionPoints = null) {
    this.time.value += dt;
    for (const fn of this._updatables) fn(dt);
    this._updateOcclusionFade(dt, camera, target);
    updateOcclusionPoints(occlusionPoints || [], dt);
  }

  dispose() {
    for (const d of this._disposables) if (d && d.dispose) d.dispose();
    this._disposables = [];
    if (this.trees) {
      const seen = new Set();
      for (const f of this._fadeItems || []) seen.add(f.srcGeo) && f.srcGeo.dispose();
      this.trees.group.traverse((o) => {
        if (!o.isMesh) return;
        if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
        if (o.material && !seen.has(o.material)) { seen.add(o.material); o.material.dispose(); }
        if (o.dispose) o.dispose();
      });
      for (const t of [this.trees.leafTexture, this.trees.needleTexture, this.trees.barkTexture, this.trees.frondTexture, this.trees.gradientMap]) t?.dispose?.();
      this.trees = null;
    }
    this._updatables = [];
  }
}
