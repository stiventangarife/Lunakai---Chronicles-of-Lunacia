// IslandPropColliders.js — Colisiones de los objetos de una isla a partir de sus mallas (Hito 69).
//
// Recorre las mallas visibles de la isla y, para las que cumplen una regla (por nombre), calcula un círculo que se
// ajusta a su base: los vértices del primer tramo de altura (tronco, base de la roca), su centro y el radio que
// cubre el 80 % de ellos. Sirve para mallas sueltas y para cada instancia de una InstancedMesh (las instancias
// con escala 0, retiradas, no cuentan). Se calcula una vez, al cargar la isla.
import * as THREE from 'three';

/**
 * @param {THREE.Object3D} root  grupo de la isla
 * @param {Array<{test:RegExp, kind:string, band?:number, rMin?:number, rMax?:number, minH?:number}>} rules
 *        band = altura (m) de la franja de la base; rMin/rMax = límites del radio; minH = altura mínima del objeto
 * @param {{islandR?:number, skip?:(x:number,z:number,r:number,kind:string)=>boolean}} [opts]
 * @returns {Array<[number, number, number, string]>} [x, z, radio, tipo]
 */
export function buildPropColliders(root, rules, opts = {}) {
  const islandR = opts.islandR ?? 150;
  const out = [];
  if (!root) return out;
  root.updateMatrixWorld(true);
  const m = new THREE.Matrix4(), im = new THREE.Matrix4(), v = new THREE.Vector3();
  // visible dentro de la isla (el grupo raíz puede estar oculto mientras la isla no está activa)
  const visible = (o) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };

  const circle = (mesh, i, band) => {
    const pos = mesh.geometry?.attributes?.position;
    if (!pos) return null;
    if (mesh.isInstancedMesh) { mesh.getMatrixAt(i, im); m.multiplyMatrices(mesh.matrixWorld, im); } else m.copy(mesh.matrixWorld);
    const step = Math.max(1, Math.floor(pos.count / 500));
    const P = [];
    let mn = Infinity, mx = -Infinity;
    for (let k = 0; k < pos.count; k += step) {
      v.fromBufferAttribute(pos, k).applyMatrix4(m);
      P.push(v.x, v.y, v.z);
      if (v.y < mn) mn = v.y;
      if (v.y > mx) mx = v.y;
    }
    if (!(mx - mn > 0.05)) return null; // instancia retirada (escala 0)
    const top = mn + Math.min(band, Math.max(0.4, (mx - mn) * 0.35));
    let cx = 0, cz = 0, n = 0;
    for (let k = 0; k < P.length; k += 3) if (P[k + 1] <= top) { cx += P[k]; cz += P[k + 2]; n++; }
    if (!n) return null;
    cx /= n; cz /= n;
    const d = [];
    for (let k = 0; k < P.length; k += 3) if (P[k + 1] <= top) d.push(Math.hypot(P[k] - cx, P[k + 2] - cz));
    d.sort((a, b) => a - b);
    return { x: cx, z: cz, r: d[Math.floor(d.length * 0.8)] || 0, h: mx - mn };
  };

  root.traverse((o) => {
    if (!o.isMesh || !visible(o)) return;
    const name = o.name || '';
    const rule = rules.find((r) => r.test.test(name));
    if (!rule) return;
    const count = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < count; i++) {
      const c = circle(o, i, rule.band ?? 1.2);
      if (!c || Math.hypot(c.x, c.z) > islandR) continue;
      if (rule.minH && c.h < rule.minH) continue;
      const r = Math.min(rule.rMax ?? 99, Math.max(rule.rMin ?? 0.3, c.r));
      if (opts.skip && opts.skip(c.x, c.z, r, rule.kind)) continue;
      out.push([c.x, c.z, r, rule.kind]);
    }
  });
  return out;
}

/**
 * Hito 72d · huella exacta de objetos grandes e irregulares (cristales inclinados, cúmulos): el corte de la malla
 * entre el suelo y la altura del personaje, como polígono convexo. Se usa como contorno de segmentos, así ningún
 * extremo del objeto queda fuera de la colisión (un círculo no se ajusta a un prisma inclinado).
 * Recorre los triángulos: cada arista se recorta a la franja [suelo + lo, suelo + hi] y sus extremos entran en la huella.
 * @param {THREE.Object3D} root
 * @param {Array<{test:RegExp, kind:string, minH?:number}>} rules
 * @param {{height:(x:number,z:number)=>number, lo?:number, hi?:number, islandR?:number, pad?:number}} opts
 * @returns {Array<{kind:string, pts:Array<[number, number]>}>}
 */
export function buildPropHulls(root, rules, opts) {
  const out = [];
  if (!root || !opts || !opts.height) return out;
  const lo = opts.lo ?? -0.2, hi = opts.hi ?? 1.8, islandR = opts.islandR ?? 150, pad = opts.pad ?? 0.05;
  root.updateMatrixWorld(true);
  const m = new THREE.Matrix4(), im = new THREE.Matrix4();
  const visible = (o) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };
  const W = [];   // vértices en mundo (reutilizado)
  root.traverse((o) => {
    if (!o.isMesh || !visible(o)) return;
    const rule = rules.find((r) => r.test.test(o.name || ''));
    if (!rule) return;
    const pos = o.geometry?.attributes?.position;
    if (!pos) return;
    const idx = o.geometry.index;
    const count = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < count; i++) {
      if (o.isInstancedMesh) { o.getMatrixAt(i, im); m.multiplyMatrices(o.matrixWorld, im); } else m.copy(o.matrixWorld);
      W.length = 0;
      let mn = Infinity, mx = -Infinity, cx = 0, cz = 0;
      const v = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(m);
        W.push(v.x, v.y, v.z);
        if (v.y < mn) mn = v.y; if (v.y > mx) mx = v.y;
        cx += v.x; cz += v.z;
      }
      if (!(mx - mn > 0.05)) continue;                       // instancia retirada
      if (rule.minH && mx - mn < rule.minH) continue;
      cx /= pos.count; cz /= pos.count;
      if (Math.hypot(cx, cz) > islandR) continue;
      const g = opts.height(cx, cz);
      const y0 = g + lo, y1 = g + hi;
      const P = [];
      const edge = (a, b) => {
        const ya = W[a * 3 + 1], yb = W[b * 3 + 1];
        const ymin = Math.min(ya, yb), ymax = Math.max(ya, yb);
        if (ymax < y0 || ymin > y1) return;
        const lerpAt = (y) => {
          const t = Math.abs(yb - ya) < 1e-6 ? 0 : (y - ya) / (yb - ya);
          P.push([W[a * 3] + (W[b * 3] - W[a * 3]) * t, W[a * 3 + 2] + (W[b * 3 + 2] - W[a * 3 + 2]) * t]);
        };
        lerpAt(Math.max(ymin, y0));
        lerpAt(Math.min(ymax, y1));
      };
      const tri = idx ? idx.count / 3 : pos.count / 3;
      for (let t = 0; t < tri; t++) {
        const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        edge(a, b); edge(b, c); edge(c, a);
      }
      if (P.length < 3) continue;
      const H = convexHull(P);
      if (H.length < 3) continue;
      // un pelín hacia fuera (pad) desde el centro del polígono
      let hx = 0, hz = 0; H.forEach((p) => { hx += p[0]; hz += p[1]; }); hx /= H.length; hz /= H.length;
      out.push({ kind: rule.kind, pts: H.map(([x, z]) => { const d = Math.hypot(x - hx, z - hz) || 1; return [x + (x - hx) / d * pad, z + (z - hz) / d * pad]; }) });
    }
  });
  return out;
}

/** Envolvente convexa (cadena monótona), en orden antihorario, sin puntos casi repetidos. */
export function convexHull(points) {
  const P = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of P) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-9) lower.pop(); lower.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-9) upper.pop(); upper.push(p); }
  upper.pop(); lower.pop();
  const H = lower.concat(upper);
  // quitar vértices a menos de 0,25 m del anterior (contorno más simple)
  const S = [];
  for (const p of H) if (!S.length || Math.hypot(p[0] - S[S.length - 1][0], p[1] - S[S.length - 1][1]) > 0.25) S.push(p);
  if (S.length > 2 && Math.hypot(S[0][0] - S[S.length - 1][0], S[0][1] - S[S.length - 1][1]) < 0.25) S.pop();
  return S;
}
