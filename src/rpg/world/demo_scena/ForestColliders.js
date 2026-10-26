// ForestColliders.js — Colisiones de la Isla del Bosque (Hito 66).
//
// Se calculan una vez, cuando la isla termina de cargar, a partir de lo que ya está colocado:
//   · árboles (PropsManager.pendingTrees): un círculo en el tronco, no en la copa;
//   · rocas medianas y columnas de roca (PropsManager.instancedRockMeshes): un círculo que se ajusta a la base de
//     cada pieza (los vértices del primer metro y pico, sin contar las puntas);
//   · el Gran Árbol Ancestral (tronco) y las rocas-monolito del santuario que tocan el suelo.
// Arbustos, helechos, setas, flores y piedrecitas no tienen colisión (decisión del usuario).
// DemoScenaZone22.setActive() las da de alta al entrar y de baja al salir (etiqueta TAG).
import * as THREE from 'three';

export const FOREST_COLLIDER_TAG = 'forestisle_';

const ISLAND_R = 150;          // fuera de este radio solo hay decorado lejano
const BROAD_TRUNK = 0.85 * 0.7; // radio de la base del tronco de los árboles de hoja (m por unidad de escala) — sin las raíces
const PINE_TRUNK = 0.38;        // radio del tronco de los pinos (m por unidad de escala)
const ELDER = { x: -7.6, z: -25.2, r: 4.2 }; // tronco del Gran Árbol Ancestral (medido sobre el modelo)

/** @returns {Array<[number, number, number, string]>} [x, z, radio, tipo] */
export function buildForestColliders(zone) {
  const out = [];
  const pm = zone && zone.propsManager;
  if (!pm) return out;

  // 1. Árboles. Con el arte Genshin se leen de sus instancias (posición y escala finales); los que el pueblo retiró
  //    (radio negativo, ver ForestVillage._clearVegetation) no cuentan. Sin él, de la lista de PropsManager.
  const buckets = zone.genshinArt?.trees?.lodBuckets;
  if (Array.isArray(buckets) && buckets.length) {
    const e = new Float32Array(16);
    for (const Bk of buckets) {
      const pine = (Bk.parts || []).some((pt) => /conifer/.test(pt?.lod0?.name || pt?.name || ''));
      for (let i = 0; i < Bk.n; i++) {
        if (!(Bk.radii[i] > 0)) continue;
        for (let k = 0; k < 16; k++) e[k] = Bk.matrices[i * 16 + k];
        const x = e[12], z = e[14];
        if (Math.hypot(x, z) > ISLAND_R) continue;
        const sc = Math.hypot(e[0], e[1], e[2]);
        out.push([x, z, pine ? Math.max(0.35, PINE_TRUNK * sc) : Math.max(0.5, BROAD_TRUNK * sc), pine ? 'pine' : 'tree']);
      }
    }
  } else {
    for (const t of pm.pendingTrees || []) {
      if (!t || !t.pos || Math.hypot(t.pos.x, t.pos.z) > ISLAND_R) continue;
      const s = t.scale ? t.scale.x : 1;
      const pine = String(t.key || '').includes('pine');
      const r = pine ? Math.max(0.35, PINE_TRUNK * s * 0.95) : Math.max(0.5, BROAD_TRUNK * s * 1.05);
      out.push([t.pos.x, t.pos.z, r, pine ? 'pine' : 'tree']);
    }
  }

  // 2. Rocas: base de cada instancia
  const m = new THREE.Matrix4(), im = new THREE.Matrix4(), v = new THREE.Vector3();
  const rocks = [];
  for (const mesh of pm.instancedRockMeshes || []) {
    if (!mesh || !mesh.isInstancedMesh || !mesh.geometry?.attributes?.position) continue;
    mesh.updateWorldMatrix(true, false);
    const pos = mesh.geometry.attributes.position;
    const stride = Math.max(1, Math.floor(pos.count / 600));
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, im);
      m.multiplyMatrices(mesh.matrixWorld, im);
      const pts = [];
      let minY = Infinity, maxY = -Infinity;
      for (let k = 0; k < pos.count; k += stride) {
        v.fromBufferAttribute(pos, k).applyMatrix4(m);
        pts.push(v.x, v.y, v.z);
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }
      const band = minY + Math.min(1.6, Math.max(0.5, (maxY - minY) * 0.35));
      let cx = 0, cz = 0, n = 0;
      for (let k = 0; k < pts.length; k += 3) if (pts[k + 1] <= band) { cx += pts[k]; cz += pts[k + 2]; n++; }
      if (!n) continue;
      cx /= n; cz /= n;
      if (Math.hypot(cx, cz) > ISLAND_R) continue;
      const d = [];
      for (let k = 0; k < pts.length; k += 3) if (pts[k + 1] <= band) d.push(Math.hypot(pts[k] - cx, pts[k + 2] - cz));
      d.sort((a, b) => a - b);
      const r = d[Math.floor(d.length * 0.8)] || 0;
      if (r < 0.35) continue; // piedrecitas
      rocks.push([cx, cz, r]);
    }
  }
  // Las columnas se forman con varias piezas: se quita la pieza que queda dentro de otra
  rocks.sort((a, b) => b[2] - a[2]);
  for (const r of rocks) {
    if (out.some((o) => o[3] === 'rock' && Math.hypot(o[0] - r[0], o[1] - r[1]) + r[2] <= o[2] + 0.2)) continue;
    out.push([r[0], r[1], r[2], 'rock']);
  }

  // 3. Gran Árbol Ancestral
  out.push([ELDER.x, ELDER.z, ELDER.r, 'elder']);

  // 4. Monolitos del santuario que tocan el suelo (el que flota no)
  const lm = zone.landmarksManager;
  for (const f of (lm && lm.floatingRocks) || []) {
    const holder = f && (f.holder || f.group || f.mesh);
    if (!holder) continue;
    const b = new THREE.Box3();
    holder.traverse((o) => { if (o.isMesh) b.expandByObject(o); }); // solo la roca (sin luz ni partículas)
    if (b.isEmpty()) continue;
    const ground = zone.getHeight ? zone.getHeight(holder.position.x, holder.position.z) : 0;
    if (b.min.y - ground > 2.0) continue;
    out.push([holder.position.x, holder.position.z, Math.max(0.8, (b.max.x - b.min.x) * 0.4), 'monolith']);
  }
  return out;
}
