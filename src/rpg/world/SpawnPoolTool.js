// SpawnPoolTool.js — Herramienta de DESARROLLO (Hito 106, respawn de mobs). No se usa en el juego normal.
//
// Genera el «pool» de puntos de aparición de mobs de la isla donde está el jugador: puntos repartidos por toda
// la isla, validados contra el terreno real y las colisiones, y conectados por tierra con el muelle de llegada.
// Se ejecuta UNA vez por isla desde la consola (F12):
//
//   lkDebug.spawnPool()                      genera, dibuja pilares de revisión y escribe el resultado en la consola
//   lkDebug.spawnPool({ shoreMargin: 45 })   más lejos del agua (cualquier opción de abajo se puede cambiar así)
//   lkDebug.spawnPool({ avoid: [{ x: 10, z: -20, r: 40 }] })   zonas extra a evitar
//   lkDebug.spawnPool({ markers: false })    sin pilares
//   lkDebug.spawnPool({ clear: true })       quita los pilares
//   copy(__lkSpawnPool.text)                 copia el bloque para pegarlo en IslandWorldLayout.js
//
// Criterios de un punto:
//   · tierra SECA: sin agua en el punto y con un margen sin agua alrededor (shoreMargin), ni orilla del mapa;
//     el agua poco profunda es caminable en el juego, por eso no basta con isPointBlocked;
//   · sin colliders (radio 2,2 m) y pendiente local ≤ 22°;
//   · lejos de NPC, muelles, edificios (cajas de colisión) y zonas a evitar de cada isla;
//   · alcanzable andando desde el muelle de llegada. La conectividad usa un criterio más suelto que el punto
//     (rampas de hasta la pendiente máxima de la isla), para llegar a las mesetas altas.
// Solo lee el mundo: no modifica colisiones, mobs ni guardados. Los pilares son una malla instanciada que se
// retira con { clear: true }.

import * as THREE from 'three';
import { FERRY_DOCKS } from './islands/IslandWorldLayout.js';
import { VILLAGE, VILLAGE_STREET } from './ForestVillageLayout.js';

const MARKERS_NAME = 'SpawnPoolMarkers';
const GRAND_ISLAND_KEYS = new Set(['2_1', '1_2', '2_3']); // Ártico, Mística, Genesis (mar a 0,45 m)

// Ajustes por isla (se pisan con las opciones de la llamada)
const PRESETS = {
  '2_2': { shoreMargin: 22, structClear: 16 },                                             // Bosque: río y mar
  '3_2': { shoreMargin: 32, structClear: 16 },                                             // Sabana: nada en la costa baja
  '2_1': { shoreMargin: 45, npcClear: 30, structClear: 24, avoid: [{ x: 0, z: 0, r: 40 }] }, // Ártico: sin orilla ni pueblo del centro
  '1_2': { shoreMargin: 24, npcClear: 30, structClear: 24, avoid: [{ x: 3.5, z: -45.5, r: 48 }] }, // Mística: lago, Gran Árbol y Observatorio
  '2_3': { shoreMargin: 40, npcClear: 24, structClear: 20 }                                // Genesis: sin orilla
};

function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function clearSpawnPoolMarkers(om) {
  const scene = om?.scene;
  if (!scene) return;
  for (const child of [...scene.children]) {
    if (child.name !== MARKERS_NAME) continue;
    scene.remove(child);
    child.geometry?.dispose();
    child.material?.dispose();
    child.dispose?.();
  }
}

export async function runSpawnPoolTool(om, opts = {}) {
  if (!om) { console.warn('[spawnPool] OverworldManager no disponible.'); return null; }
  if (opts.clear) { clearSpawnPoolMarkers(om); console.log('[spawnPool] pilares retirados.'); return null; }
  if (om.state !== 'EXPLORING') { console.warn('[spawnPool] Úsalo en el mundo abierto, sin diálogos ni combate (estado actual: ' + om.state + ').'); return null; }

  const def = om.worldMapManager?.currentMapDef;
  const gx = def?.gx ?? 2, gy = def?.gy ?? 2;
  const key = `${gx}_${gy}`;
  const zoneId = `zone_${key}`;
  const col = om.collisions;
  if (!col || typeof col.isPointBlocked !== 'function') { console.warn('[spawnPool] Sin sistema de colisiones.'); return null; }

  const o = {
    cell: 5,            // lado de la rejilla de alcanzabilidad (m)
    half: 240,          // semilado de la isla (480 m)
    spacing: 18,        // distancia mínima entre puntos del pool (m)
    max: 60,            // puntos máximos
    mobRadius: 1.2,     // radio del mob para los recorridos entre casillas
    clearRadius: 2.2,   // margen libre alrededor de cada punto
    maxSlopeDeg: 22,    // pendiente máxima de un punto de aparición
    stepMax: 2.6,       // desnivel máximo entre dos muestras de 2 m al recorrer (descarta acantilados)
    minY: GRAND_ISLAND_KEYS.has(key) ? 0.9 : -Infinity,
    shoreMargin: 24,    // m sin agua alrededor del punto
    npcClear: 18,
    dockClear: 30,
    structClear: 16,    // distancia mínima a edificios (cajas de colisión)
    villageClear: 42,   // solo Bosque: desde cualquier edificio del pueblo
    streetClear: 32,    // solo Bosque: desde la calle
    avoid: [],
    markers: true,
    seed: hashString(key),
    ...(PRESETS[key] || {}),
    ...opts
  };

  const H = (x, z) => om.getGroundHeight(x, z);
  const depthAt = (x, z) => (typeof col.waterDepthAt === 'function' ? col.waterDepthAt(x, z) : null);
  const slopeDeg = (x, z) => {
    const d = 1.5;
    const gxs = (H(x + d, z) - H(x - d, z)) / (2 * d);
    const gzs = (H(x, z + d) - H(x, z - d)) / (2 * d);
    return Math.atan(Math.hypot(gxs, gzs)) * 180 / Math.PI;
  };
  const b = col.bounds;
  const wet = (x, z) => {
    if (b && (x < b.minX + 6 || x > b.maxX - 6 || z < b.minZ + 6 || z > b.maxZ - 6)) return true; // orilla del mapa
    const d = depthAt(x, z);
    if (d !== null && d > 0.02) return true;
    const h = H(x, z);
    return !Number.isFinite(h) || h < o.minY;
  };

  // Aviso si no hay máscara de agua (entonces solo vale minY)
  let maskNull = 0, maskTotal = 0;
  for (let i = 0; i < 20; i++) { maskTotal++; if (depthAt(-o.half + (2 * o.half * i) / 19, 0) === null) maskNull++; }
  if (maskNull === maskTotal) console.warn('[spawnPool] Esta isla no tiene máscara de agua activa: el agua poco profunda no se puede detectar. Usa { minY: ... } para marcar el nivel del mar.');

  // 1) Punto de aparición válido (estricto)
  const pointOk = (x, z) => {
    const h = H(x, z);
    if (!Number.isFinite(h) || h < o.minY) return false;
    if (col.isPointBlocked(x, z, o.clearRadius)) return false;
    return slopeDeg(x, z) <= o.maxSlopeDeg;
  };
  // 2) Margen sin agua alrededor (dos anillos de 12 muestras)
  const shoreOk = (x, z) => {
    if (wet(x, z)) return false;
    for (const f of [0.5, 1]) {
      const R = o.shoreMargin * f;
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        if (wet(x + Math.cos(ang) * R, z + Math.sin(ang) * R)) return false;
      }
    }
    return true;
  };
  // 3) Casilla transitable para la conectividad (suelta: llega a las mesetas por rampas)
  const walk = (x, z) => Number.isFinite(H(x, z)) && !col.isPointBlocked(x, z, o.mobRadius);
  const edgeOk = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.ceil(len / 2));
    let hp = H(x0, z0);
    for (let k = 1; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n;
      if (col.isPointBlocked(x, z, o.mobRadius)) return false;
      const h = H(x, z);
      if (!Number.isFinite(h) || Math.abs(h - hp) > o.stepMax) return false;
      hp = h;
    }
    return true;
  };

  // Rejilla: 0 = sin evaluar, 1 = transitable, 2 = no
  const N = Math.floor(2 * o.half / o.cell) + 1;
  const toW = (i) => -o.half + i * o.cell;
  const st = new Uint8Array(N * N);
  const idx = (i, j) => j * N + i;
  const cellOk = (i, j) => {
    if (i < 0 || j < 0 || i >= N || j >= N) return false;
    const k = idx(i, j);
    if (st[k] === 0) st[k] = walk(toW(i), toW(j)) ? 1 : 2;
    return st[k] === 1;
  };

  let t0 = performance.now();
  const yieldIfNeeded = async () => {
    if (performance.now() - t0 > 12) { await new Promise((r) => setTimeout(r, 0)); t0 = performance.now(); }
  };

  // Punto de partida: el muelle de llegada de la isla (o el jugador)
  const dock = FERRY_DOCKS[zoneId];
  const start = dock ? { x: dock.arrive.x, z: dock.arrive.z } : { x: om.player.position.x, z: om.player.position.z };
  const si0 = Math.round((start.x + o.half) / o.cell), sj0 = Math.round((start.z + o.half) / o.cell);
  let si = -1, sj = -1;
  search: for (let r = 0; r <= 14; r++) {
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (cellOk(si0 + di, sj0 + dj)) { si = si0 + di; sj = sj0 + dj; break search; }
    }
  }
  if (si < 0) { console.warn('[spawnPool] No encuentro terreno transitable junto al muelle de llegada. Prueba desde otro sitio de la isla.'); return null; }

  // Relleno por tierra (8 vecinos)
  const seen = new Uint8Array(N * N);
  const queue = [idx(si, sj)];
  seen[queue[0]] = 1;
  const reach = [];
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let qh = 0; qh < queue.length; qh++) {
    const k = queue[qh];
    const i = k % N, j = (k / N) | 0;
    reach.push(k);
    for (const [di, dj] of nb) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const nk = idx(ni, nj);
      if (seen[nk]) continue;
      if (!cellOk(ni, nj)) continue;
      if (!edgeOk(toW(i), toW(j), toW(ni), toW(nj))) continue;
      seen[nk] = 1;
      queue.push(nk);
    }
    await yieldIfNeeded();
  }

  // Zonas de exclusión
  const ex = [];
  for (const npc of om.npcManager?.npcs || []) {
    const p = npc.group?.position;
    if (p) ex.push({ x: p.x, z: p.z, r: o.npcClear });
  }
  if (dock) {
    ex.push({ x: dock.npc.x, z: dock.npc.z, r: o.dockClear });
    ex.push({ x: dock.arrive.x, z: dock.arrive.z, r: o.dockClear });
  }
  if (key === '2_2') {
    for (const v of VILLAGE) ex.push({ x: v.x, z: v.z, r: v.model === 'lamp' ? 22 : o.villageClear });
    for (const p of VILLAGE_STREET.points) ex.push({ x: p.x, z: p.z, r: o.streetClear });
  }
  for (const a of o.avoid || []) ex.push({ x: a.x, z: a.z, r: a.r });
  const boxes = col.boxes || [];
  const nearBox = (x, z) => {
    for (const bx of boxes) {
      const dx = Math.max(bx.minX - x, 0, x - bx.maxX), dz = Math.max(bx.minZ - z, 0, z - bx.maxZ);
      if (dx * dx + dz * dz < o.structClear * o.structClear) return true;
    }
    return false;
  };
  const excluded = (x, z) => ex.some((e) => Math.hypot(x - e.x, z - e.z) < e.r) || nearBox(x, z);

  // Muestreo por «dardos» con semilla fija: puntos separados ≥ spacing, repartidos por toda la zona alcanzable
  const rng = mulberry32(o.seed);
  const order = reach.slice();
  for (let n = order.length - 1; n > 0; n--) { const m = Math.floor(rng() * (n + 1)); [order[n], order[m]] = [order[m], order[n]]; }
  const why = { estricto: 0, agua: 0, exclusion: 0, separacion: 0 };
  const pts = [];
  for (const k of order) {
    if (pts.length >= o.max) break;
    const ci = toW(k % N), cj = toW((k / N) | 0);
    let x = ci + (rng() - 0.5) * o.cell * 0.8, z = cj + (rng() - 0.5) * o.cell * 0.8;
    if (!pointOk(x, z)) { x = ci; z = cj; }
    x = Math.round(x); z = Math.round(z);
    if (!pointOk(x, z)) { why.estricto++; continue; }
    if (excluded(x, z)) { why.exclusion++; continue; }
    if (pts.some((p) => Math.hypot(p.x - x, p.z - z) < o.spacing)) { why.separacion++; continue; }
    if (!shoreOk(x, z)) { why.agua++; continue; }
    pts.push({ x, z });
    await yieldIfNeeded();
  }
  pts.sort((a, b2) => a.z - b2.z || a.x - b2.x);

  // Resumen: reparto por sectores 3×3 y alturas
  const third = (2 * o.half) / 3;
  const sectors = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (const p of pts) {
    const sx = Math.min(2, Math.max(0, Math.floor((p.x + o.half) / third)));
    const sz = Math.min(2, Math.max(0, Math.floor((p.z + o.half) / third)));
    sectors[sz][sx]++;
  }
  const hs = pts.map((p) => H(p.x, p.z)).sort((a, b2) => a - b2);

  const body = pts.map((p) => `{ x: ${p.x}, z: ${p.z} }`);
  const lines = [];
  for (let i = 0; i < body.length; i += 5) lines.push('    ' + body.slice(i, i + 5).join(', '));
  const text = `  '${key}': [\n${lines.join(',\n')}\n  ],`;

  window.__lkSpawnPool = { key, points: pts, text, sectors, descartes: why };

  console.log(`[spawnPool] Isla ${key}: ${pts.length} puntos · casillas alcanzables ${reach.length} de ${N * N} · margen de agua ${o.shoreMargin} m.`);
  console.log('[spawnPool] Descartados por: ', why);
  console.log('[spawnPool] Reparto (filas = norte→sur en Z, columnas = oeste→este en X):');
  console.table(sectors);
  if (hs.length) console.log(`[spawnPool] Alturas: mín ${hs[0].toFixed(1)} · mediana ${hs[hs.length >> 1].toFixed(1)} · máx ${hs[hs.length - 1].toFixed(1)} m`);
  console.log('[spawnPool] Copia el bloque con  copy(__lkSpawnPool.text)  y pásamelo:\n' + text);

  if (o.markers && pts.length) {
    clearSpawnPoolMarkers(om);
    const geo = new THREE.CylinderGeometry(0.35, 0.35, 7, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
    const mesh = new THREE.InstancedMesh(geo, mat, pts.length);
    mesh.name = MARKERS_NAME;
    mesh.frustumCulled = false;
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    pts.forEach((p, i) => {
      m4.makeTranslation(p.x, H(p.x, p.z) + 3.5, p.z);
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, c.setHSL((i * 0.137) % 1, 0.9, 0.55));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    om.scene.add(mesh);
    console.log('[spawnPool] Pilares de colores dibujados. Retíralos con lkDebug.spawnPool({ clear: true }).');
  }
  return window.__lkSpawnPool;
}
