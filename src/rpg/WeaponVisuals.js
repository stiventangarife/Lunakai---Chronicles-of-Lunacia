// WeaponVisuals.js — Qué modelo 3D lleva cada arma equipada y cómo se coge (Hito 52, 23-oct).
//
// · Los modelos son los de la librería del mixer (assets/axie/weapons/v2/<Familia>/<familia>-l<N>.glb): espada,
//   arco y bastón, cinco niveles cada uno. Cada línea de objetos usa cuatro niveles, uno por Tier (0–3).
// · Axie: la librería coloca el arma sola en el hueso de su mano (equipWeapon('sword-l2')) y trae animaciones
//   del arma (Sword.Idle, Bow.Run, Staff.Attack…). Aquí solo se elige la variante y el prefijo de animación.
// · Sapidae: no tiene ese sistema; el arma se cuelga del hueso Weapon_R con un agarre calibrado sobre su esqueleto
//   (el mango por el hueco del puño y las tres familias hacia delante, casi horizontales).
// · En la escena del GLB el mango está en el origen; espada y bastón apuntan a +Z (la guarda a lo largo de Y) y el
//   arco tiene el largo en X y el lomo hacia +Y.
// · Las armas que no están en la tabla (recompensas sueltas, dagas…) siguen con el arma hecha con primitivas.

import * as THREE from '../../vendor/three.module.js';
import { cloneGLTF } from '../render/ModelCache.js';

const V2 = './assets/axie/weapons/v2';

/** Objeto → familia del mixer y nivel del modelo. */
export const WEAPON_VISUALS = {
  // Espadas: niveles 1, 2, 4 y 5
  wood_sword: { family: 'Sword', level: 1 },
  iron_sword: { family: 'Sword', level: 2 },
  fish_sword: { family: 'Sword', level: 4 },
  chimera_sword: { family: 'Sword', level: 5 },
  // Arcos: niveles 1–4
  composite_bow: { family: 'Bow', level: 1 },
  bone_bow: { family: 'Bow', level: 2 },
  plant_bow: { family: 'Bow', level: 3 },
  bird_bow: { family: 'Bow', level: 4 },
  // Bastones: niveles 1–4
  mushroom_staff: { family: 'Staff', level: 1 },
  plant_staff: { family: 'Staff', level: 2 },
  ice_staff: { family: 'Staff', level: 3 },
  key_staff: { family: 'Staff', level: 4 }
};

/** { family, level, variant: 'sword-l2', url } o null si el objeto no tiene modelo del mixer. */
export function weaponVisual(itemId) {
  const v = itemId ? WEAPON_VISUALS[itemId] : null;
  if (!v) return null;
  const variant = `${v.family.toLowerCase()}-l${v.level}`;
  return { ...v, variant, url: `${V2}/${v.family}/${variant}.glb` };
}

/**
 * Agarre en el Sapidae, en ejes del hueso Weapon_R en reposo: +Y adelante, −Z arriba, −X hacia fuera (+X hacia el
 * cuerpo). El puño cerrado deja un hueco a lo largo de Y (del meñique, −Y, al índice y el pulgar, +Y) con el centro en
 * FIST_R: el mango pasa por ahí y el arma sale por el lado del pulgar, hacia delante.
 * Las tres familias van igual (pedido del 23-oct): por delante, casi horizontal y algo hacia dentro. Solo cambia la
 * inclinación hacia arriba, lo justo para que ninguna punta toque el suelo al correr (medido en el juego).
 * axis: eje del modelo que va a lo largo del arma; dir: hacia dónde apunta en el hueso. sideAxis/side: qué eje del
 * modelo se alinea con qué dirección (la guarda de la espada, el lomo del arco: hacia arriba). length: largo del arma
 * en unidades del modelo del Sapidae (mide ~2,24 de alto). grip: fracción del largo desde el origen del modelo hasta el
 * centro del mango (un número, o uno por nivel del modelo).
 */
const FIST_R = [-0.035, 0, 0.02];
const UP_R = [-0.252, 0.011, -0.968];
export const SAPIDAE_GRIP = {
  // Espada: ~6° arriba. El mango está entre el pomo y la guarda (mitad a un 10–18 % del largo según el modelo)
  Sword: { hand: 'R', axis: [0, 0, 1], dir: [0.146, 0.981, -0.128], sideAxis: [0, 1, 0], side: UP_R, offset: FIST_R, length: 0.72, grip: { 1: 0.15, 2: 0.14, 4: 0.18, 5: 0.1 } },
  // Bastón: ~25° arriba (es largo y la cabeza es grande); la mano en la parte baja del palo
  Staff: { hand: 'R', axis: [0, 0, 1], dir: [0.044, 0.889, -0.455], sideAxis: [0, 1, 0], side: UP_R, offset: FIST_R, length: 1.16, grip: 0.2 },
  // Arco: horizontal, cogido por el centro
  Bow: { hand: 'R', axis: [1, 0, 0], dir: [0.172, 0.985, -0.034], sideAxis: [0, 1, 0], side: UP_R, offset: FIST_R, length: 0.68, grip: 0 }
};

/** Mano del Sapidae que coge el arma de esta familia ('R' | 'L'). */
export function gripHand(family) { return SAPIDAE_GRIP[family]?.hand || 'R'; }

/**
 * Copia estática del arma (sin esqueleto: en la mano del Sapidae no se anima por su cuenta, y así no deja texturas
 * de huesos en la GPU). Geometría y material salen de la caché de modelos y se comparten entre copias.
 */
export async function buildStaticWeapon(url) {
  const { scene } = await cloneGLTF(url);
  scene.updateMatrixWorld(true);
  const g = new THREE.Group();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    // Luz pintada en la textura y sin mapa de metal: mate (si no, se ve oscuro). Se hace una vez por material.
    mats.forEach((m) => { if (m && !m.userData.lkMatte) { m.metalness = 0; m.roughness = 0.8; m.userData.lkMatte = true; m.needsUpdate = true; } });
    const mesh = new THREE.Mesh(o.geometry, o.material);
    mesh.applyMatrix4(o.matrixWorld);
    mesh.castShadow = true;
    g.add(mesh);
  });
  g.userData.box = new THREE.Box3().setFromObject(g);
  return g;
}

/** Cuelga `weapon` del hueso con el agarre de su familia. `modelRoot` es la raíz del Sapidae (para la escala); `level`,
 *  el nivel del modelo (el mango no está en el mismo sitio en todos). */
export function mountOnSapidae(bone, modelRoot, weapon, family, level) {
  const G = SAPIDAE_GRIP[family];
  if (!G) return null;
  const grip = typeof G.grip === 'number' ? G.grip : (G.grip?.[level] ?? 0);
  const A = new THREE.Vector3(...G.axis).normalize();
  const size = weapon.userData.box.getSize(new THREE.Vector3());
  const L = Math.abs(A.x) * size.x + Math.abs(A.y) * size.y + Math.abs(A.z) * size.z;
  const D = new THREE.Vector3(...G.dir).normalize();
  const S0 = new THREE.Vector3(...G.sideAxis); S0.sub(A.clone().multiplyScalar(S0.dot(A))).normalize();
  const S1 = new THREE.Vector3(...G.side); S1.sub(D.clone().multiplyScalar(S1.dot(D))).normalize();
  const from = new THREE.Matrix4().makeBasis(A, S0, A.clone().cross(S0));
  const to = new THREE.Matrix4().makeBasis(D, S1, D.clone().cross(S1));
  const holder = new THREE.Group();
  holder.quaternion.setFromRotationMatrix(to.multiply(from.invert()));
  weapon.position.copy(A.multiplyScalar(-grip * L));
  holder.add(weapon);
  // La escala del hueso Weapon_R la cambian las animaciones (en Kai es 0,64 en reposo y 1 sin animar): se compensa
  // en cada fotograma, para que el arma mida siempre lo mismo respecto al Sapidae y quede en la palma.
  const base = G.length / L;
  const offset = new THREE.Vector3(...(G.offset || [0, 0, 0]));
  const boneRatio = () => {
    const e = bone.matrixWorld.elements, r = modelRoot.matrixWorld.elements;
    const b = Math.hypot(e[0], e[1], e[2]), m = Math.hypot(r[0], r[1], r[2]);
    return b > 1e-6 && m > 1e-6 ? b / m : 1;
  };
  const sync = () => {
    const k = 1 / boneRatio();
    holder.scale.setScalar(base * k);
    holder.position.copy(offset).multiplyScalar(k);
  };
  const updateMatrixWorld = holder.updateMatrixWorld;
  holder.updateMatrixWorld = function (force) { sync(); updateMatrixWorld.call(this, true); };
  const updateWorldMatrix = holder.updateWorldMatrix;
  holder.updateWorldMatrix = function (parents, children) {
    if (parents) bone.updateWorldMatrix(true, false);
    sync();
    updateWorldMatrix.call(this, false, children);
  };
  bone.add(holder);
  modelRoot.updateMatrixWorld(true);
  return holder;
}

/** Esqueletos de las armas que la librería del mixer ha colgado en `root` (o en lo que ya soltó). */
function weaponObjects(root) {
  const out = [];
  root?.traverse?.((o) => { if (/^AxieWeapon:/.test(o.name || '')) out.push(o); });
  return out;
}

/**
 * Libera la textura de huesos de las armas del mixer que ya no están en `root`. La librería quita el arma al
 * cambiarla pero no llama a skeleton.dispose(): sin esto queda una textura huérfana en la GPU por cada cambio.
 * Con `all` libera también las que siguen puestas (antes de desechar el Axie).
 */
export function releaseAxieWeaponSkeletons(objs, root, all = false) {
  objs.forEach((o) => {
    let attached = false;
    for (let p = o.parent; p; p = p.parent) if (p === root) { attached = true; break; }
    if (attached && !all) return;
    o.traverse((c) => { if (c.isSkinnedMesh && c.skeleton) c.skeleton.dispose(); });
  });
}

/** Pone (o quita, con null) el arma del mixer a un Axie y libera la anterior. Devuelve lo mismo que equipWeapon. */
export async function equipAxieWeapon(axie, root, variant) {
  if (!axie || typeof axie.equipWeapon !== 'function') return false;
  const before = weaponObjects(root);
  let ok = false;
  try { ok = await axie.equipWeapon(variant || null); } catch (_) { ok = false; }
  releaseAxieWeaponSkeletons(before, root);
  return ok;
}

/** Antes de desechar un Axie: libera los esqueletos de las armas que lleve puestas. */
export function disposeAxieWeapons(root) { releaseAxieWeaponSkeletons(weaponObjects(root), root, true); }
