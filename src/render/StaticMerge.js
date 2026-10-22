// StaticMerge.js — Combina mallas estáticas que comparten material en una sola malla por material.
//
// Pensado para decorados lejanos (el horizonte con las islas vecinas): son decenas de mallas sueltas
// que nunca se mueven ni cambian, y cada una cuesta una llamada de dibujo y un recorrido de la escena.
// La imagen no cambia: cada vértice queda en la misma posición del mundo, con su normal y sus colores,
// y se dibuja con el mismo material (mismo objeto: quien ajuste sus uniforms sigue funcionando).
//
// No se combinan (se dejan como están): mallas instanciadas o con esqueleto, transparentes (el orden de
// dibujo de cada pieza importa), con varios materiales, con morph targets, con transformación espejo, o
// con renderOrder / onBeforeRender propios.

import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _n3 = new THREE.Matrix3();
const _v = new THREE.Vector3();

function visibleUpTo(o, root) {
  for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false;
  return true;
}

function bakeGeometry(src, matrix) {
  const g = src.clone();
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    pos.setXYZ(i, _v.x, _v.y, _v.z);
  }
  const nor = g.attributes.normal;
  if (nor) {
    // Igual que los shaders del horizonte (modelMatrix * normal, luego normalize): se usa la parte 3×3
    // de la transformación tal cual, no su inversa traspuesta.
    _n3.setFromMatrix4(matrix);
    for (let i = 0; i < nor.count; i++) {
      _v.fromBufferAttribute(nor, i).applyMatrix3(_n3).normalize();
      nor.setXYZ(i, _v.x, _v.y, _v.z);
    }
  }
  return g;
}

/**
 * @param {THREE.Object3D} root  raíz del decorado (su propia transformación se conserva)
 * @param {{ removeHidden?: boolean, name?: string, skip?: (o: THREE.Mesh) => boolean }} [opts]
 *   removeHidden: las piezas ocultas bajo `root` se quitan (solo si nadie las vuelve a mostrar).
 *   skip: (malla) => true para dejar esa malla como está (p. ej. piezas animadas).
 * @returns {{ before: number, after: number }} mallas antes y después
 */
export function mergeStaticByMaterial(root, { removeHidden = false, name = 'Merged', skip = null } = {}) {
  if (!root) return { before: 0, after: 0 };
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  let before = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    before++;
    if (!visibleUpTo(o, root)) { if (removeHidden) remove.push(o); return; }
    if (skip && skip(o)) return; // piezas que alguien mueve o consulta después: se dejan sueltas
    if (o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.material) return;
    const mat = o.material;
    const geo = o.geometry;
    if (mat.transparent || o.renderOrder !== 0 || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    // Los grupos de la geometría (tapas de cilindros, etc.) solo cuentan con varios materiales; con uno solo three
    // dibuja la malla entera, así que se pueden combinar igual.
    if (!geo || !geo.attributes.position || Object.keys(geo.morphAttributes || {}).length) return;
    _m.multiplyMatrices(inv, o.matrixWorld);
    if (_m.determinant() <= 0) return; // espejo: invertiría el sentido de las caras
    const attrs = Object.keys(geo.attributes).sort().join(',');
    const key = `${mat.uuid}|${attrs}|${geo.index ? 'i' : 'n'}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) { b = { mat, cast: o.castShadow, receive: o.receiveShadow, items: [] }; buckets.set(key, b); }
    b.items.push({ o, matrix: _m.clone() });
  });

  let after = before - remove.length;
  for (const b of buckets.values()) {
    if (b.items.length < 2) continue;
    const geos = b.items.map(({ o, matrix }) => bakeGeometry(o.geometry, matrix));
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue; // atributos incompatibles: se dejan como estaban
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.name = `${name}_${b.mat.name || b.mat.type}`;
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.matrixAutoUpdate = false; // geometría ya en el espacio de `root`
    root.add(mesh);
    mesh.updateMatrix();
    b.items.forEach(({ o }) => remove.push(o));
    after = after - b.items.length + 1;
  }
  remove.forEach((o) => { if (o.parent) o.parent.remove(o); });
  // Grupos que se quedaron vacíos
  const empty = [];
  root.traverse((o) => { if (o !== root && !o.isMesh && o.children.length === 0 && o.type === 'Group') empty.push(o); });
  empty.forEach((o) => o.parent && o.parent.remove(o));
  return { before, after };
}
