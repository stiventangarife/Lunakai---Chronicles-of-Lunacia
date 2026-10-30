// HatHairFit.js — Pelo y cabeza bajo los cascos de Ema / Kai (Hito 92).
//
// Los cascos del modelo (Kai_hat_beast, Ema_hat_straw…) van sobre la cabeza tal cual, y el pelo los atraviesa. Aquí se
// hace una copia de la malla del pelo (o de la cabeza) con los vértices que quedan por fuera del casco empujados hacia
// dentro: lo que está bajo el casco se «aplasta» y lo que sale por debajo (coletas, melena, trenzas) queda igual.
//
// Cómo:
//   1. Desde el centro de la cabeza se lanzan 72×36 rayos (todas las direcciones) contra el casco: la distancia a su
//      cara interior en cada dirección. Se ignoran los choques más cerca que la piel (tapas interiores del casco) y se
//      rellenan los huecos del casco (si en esa columna el casco sigue más abajo, el hueco cuenta como casco).
//   2. Cada vértice que, en su dirección, está más lejos que el casco × k se acerca al centro hasta quedar dentro.
// Todo en el espacio de enlace del esqueleto (las piezas comparten esqueleto y matriz de enlace), así la animación lo
// mueve igual que antes. Las mallas resultantes se guardan: cada combinación (pelo/cabeza × casco) se calcula una vez
// (~30–80 ms) y se comparte entre todas las copias del modelo. La geometría original no se toca.
import * as THREE from '../../vendor/three.module.js';

const NA = 72; // direcciones alrededor (acimut)
const NP = 36; // direcciones de arriba abajo (polar)
const MIN_HIT = 0.25; // choques más cerca del centro que esto no son el casco (tapas internas)

// 29-oct (Hito 103): las cachés caras (rayos contra el casco y la piel) van por la HUELLA del contenido de la geometría,
// no por el objeto. El Sapidae se carga en tres sitios (mundo, visor de la Mochila y estudio de retratos), cada uno con
// sus propias geometrías: con cachés por objeto, rayMap se repetía tres veces en la carga (~650 ms medidos en DevTools).
const _maps = new Map(); // huella del casco + huella de la cabeza → mapa de distancias
const _fits = new WeakMap(); // geometría de origen → Map(clave → geometría ajustada) (barato: por objeto)
const _centers = new Map(); // huella de la cabeza de referencia → [x, y, z]
const _skins = new Map(); // huella de la cabeza de referencia → distancia a la piel en cada dirección
const _prints = new WeakMap(); // geometría → huella

/** Huella del contenido de una geometría: nº de vértices e índices y 48 vértices de muestra. */
function geoPrint(geo) {
  let k = _prints.get(geo);
  if (k) return k;
  const p = geo.attributes.position, n = p.count, idx = geo.index ? geo.index.count : 0;
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(n / 48));
  for (let i = 0; i < n; i += step) {
    for (const v of [p.getX(i), p.getY(i), p.getZ(i)]) h = Math.imul(h ^ (Math.round(v * 1e4) | 0), 16777619);
  }
  k = `${n}|${idx}|${(h >>> 0).toString(36)}`;
  _prints.set(geo, k);
  return k;
}

const posArray = (geo) => {
  const p = geo.attributes.position;
  if (!p.isInterleavedBufferAttribute && !p.normalized && p.array instanceof Float32Array && p.itemSize === 3) return p.array;
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { out[i * 3] = p.getX(i); out[i * 3 + 1] = p.getY(i); out[i * 3 + 2] = p.getZ(i); }
  return out;
};

/** Geometría original de una pieza (la que tenía antes de ajustarla a un casco). */
export function baseGeometry(mesh) {
  return mesh.geometry?.userData?.lkHatBase || mesh.geometry;
}

/** Centro de la cabeza (centro de su caja). */
export function headCenter(headGeo) {
  const hk = geoPrint(headGeo);
  let c = _centers.get(hk);
  if (!c) {
    const P = posArray(headGeo), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) { const v = P[i + a]; if (v < min[a]) min[a] = v; if (v > max[a]) max[a] = v; }
    c = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    _centers.set(hk, c);
  }
  return c;
}

/** Distancia del centro a la malla en cada dirección (−1 si no hay choque más allá de tmin). */
function rayMap(geos, c, tminMap, tminK) {
  const T = new Float32Array(NA * NP).fill(-1);
  const sets = geos.map((g) => ({ P: posArray(g), I: g.index ? g.index.array : null, n: g.index ? g.index.count : g.attributes.position.count }));
  for (let ip = 0; ip < NP; ip++) {
    const phi = ((ip + 0.5) / NP) * Math.PI;
    for (let ia = 0; ia < NA; ia++) {
      const th = ((ia + 0.5) / NA) * Math.PI * 2;
      const dx = Math.sin(phi) * Math.cos(th), dy = Math.cos(phi), dz = Math.sin(phi) * Math.sin(th);
      const tmin = tminMap ? Math.max(MIN_HIT, tminMap[ip * NA + ia] * tminK) : 1e-4;
      let best = Infinity;
      for (const { P, I, n } of sets) {
        for (let t = 0; t < n; t += 3) {
          const a = (I ? I[t] : t) * 3, b = (I ? I[t + 1] : t + 1) * 3, cc = (I ? I[t + 2] : t + 2) * 3;
          const sx = c[0] - P[a], sy = c[1] - P[a + 1], sz = c[2] - P[a + 2];
          const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
          const e2x = P[cc] - P[a], e2y = P[cc + 1] - P[a + 1], e2z = P[cc + 2] - P[a + 2];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          if (det > -1e-9 && det < 1e-9) continue;
          const inv = 1 / det;
          const u = (sx * px + sy * py + sz * pz) * inv;
          if (u < 0 || u > 1) continue;
          const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
          const v = (dx * qx + dy * qy + dz * qz) * inv;
          if (v < 0 || u + v > 1) continue;
          const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (tt > tmin && tt < best) best = tt;
        }
      }
      T[ip * NA + ia] = best === Infinity ? -1 : best;
    }
  }
  return T;
}

/** Mapa de distancias del casco (con la cabeza de referencia para descartar tapas internas y huecos rellenos). */
function hatMap(hatGeos, headRef) {
  const mk = `${hatGeos.map(geoPrint).join('+')}#${geoPrint(headRef)}`;
  let T = _maps.get(mk);
  if (T) return T;
  const c = headCenter(headRef);
  const sk = geoPrint(headRef);
  let H = _skins.get(sk);
  if (!H) {
    H = rayMap([headRef], c, null, 0);
    for (let i = 0; i < H.length; i++) if (H[i] < 0) H[i] = 0;
    _skins.set(sk, H);
  }
  T = rayMap(hatGeos, c, H, 0.9);
  // Huecos del casco: si más abajo en la misma columna hay casco, el hueco cuenta como casco.
  for (let ia = 0; ia < NA; ia++) {
    let rim = -1;
    for (let ip = NP - 1; ip >= 0; ip--) if (T[ip * NA + ia] > 0) { rim = ip; break; }
    let last = -1;
    for (let ip = 0; ip <= rim; ip++) {
      const t = T[ip * NA + ia];
      if (t > 0) { last = t; continue; }
      let next = -1;
      for (let j = ip + 1; j <= rim; j++) { const tj = T[j * NA + ia]; if (tj > 0) { next = tj; break; } }
      T[ip * NA + ia] = last > 0 ? Math.min(last, next) : next;
    }
  }
  _maps.set(mk, T);
  return T;
}

/**
 * Copia de `srcGeo` con los vértices metidos dentro del casco.
 * @param {THREE.BufferGeometry} srcGeo   pelo o cabeza (geometría original)
 * @param {THREE.BufferGeometry[]} hatGeos mallas del casco
 * @param {THREE.BufferGeometry} headRef  cabeza de referencia (original), para el centro y la piel
 * @param {number} k  margen: 0.88 = el pelo queda al 88 % de la distancia del casco
 */
export function fitUnderHat(srcGeo, hatGeos, headRef, k = 0.88) {
  let byKey = _fits.get(srcGeo);
  if (!byKey) {
    byKey = new Map(); _fits.set(srcGeo, byKey);
    // Si se libera la original (combate que termina), se liberan también sus copias ajustadas.
    srcGeo.addEventListener('dispose', () => { byKey.forEach((g) => g.dispose()); byKey.clear(); _fits.delete(srcGeo); });
  }
  const key = `${hatGeos.map((g) => g.uuid).join('+')}|${headRef.uuid}|${k}`;
  const hit = byKey.get(key);
  if (hit) return hit;

  const T = hatMap(hatGeos, headRef), c = headCenter(headRef);
  const src = posArray(srcGeo), out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    const x = src[i] - c[0], y = src[i + 1] - c[1], z = src[i + 2] - c[2];
    const r = Math.hypot(x, y, z) || 1e-6;
    const phi = Math.acos(Math.max(-1, Math.min(1, y / r)));
    let th = Math.atan2(z, x);
    if (th < 0) th += Math.PI * 2;
    const fp = (phi / Math.PI) * NP - 0.5, fa = (th / (Math.PI * 2)) * NA - 0.5;
    const p0 = Math.floor(fp), a0 = Math.floor(fa), wp = fp - p0, wa = fa - a0;
    let ws = 0, ts = 0, tlo = Infinity;
    for (let q = 0; q < 4; q++) {
      const dp = q >> 1, da = q & 1, w = (dp ? wp : 1 - wp) * (da ? wa : 1 - wa);
      const pp = Math.max(0, Math.min(NP - 1, p0 + dp)), aa = (((a0 + da) % NA) + NA) % NA;
      const t = T[pp * NA + aa];
      if (t > 0) { ws += w; ts += w * t; if (t < tlo) tlo = t; }
    }
    // Junto al borde del casco basta con que una dirección vecina lo toque: así no asoman mechones por el borde.
    const s = ws > 0 ? Math.min(r, Math.min(ts / ws, tlo * 1.05) * k) / r : 1;
    out[i] = c[0] + x * s; out[i + 1] = c[1] + y * s; out[i + 2] = c[2] + z * s;
  }

  const geo = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(srcGeo.attributes)) geo.setAttribute(name, name === 'position' ? new THREE.BufferAttribute(out, 3) : attr);
  if (srcGeo.index) geo.setIndex(srcGeo.index);
  srcGeo.groups.forEach((gr) => geo.addGroup(gr.start, gr.count, gr.materialIndex));
  geo.morphAttributes = srcGeo.morphAttributes;
  geo.morphTargetsRelative = srcGeo.morphTargetsRelative;
  geo.name = `${srcGeo.name || 'geo'}:hatFit`;
  geo.userData = { ...srcGeo.userData, lkHatFit: true, lkHatBase: srcGeo }; // la original, para volver a ella
  geo.computeBoundingSphere();
  byKey.set(key, geo);
  return geo;
}
