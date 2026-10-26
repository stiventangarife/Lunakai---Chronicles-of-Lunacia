// ModelCache.js — Caché de modelos GLB compartida por el mundo abierto y el combate.
//
// Cada GLB se descarga y analiza UNA vez por sesión. Quien lo usa recibe un clon (con su
// esqueleto, vía SkeletonUtils), así que el original en caché nunca se modifica ni se muestra.
// Los clones comparten texturas y, salvo que se pida lo contrario, geometrías.
//
// Por qué importa además de ahorrar descargas: el teñido de texturas del Sapidae
// (SapidaeModularController) guarda su resultado por imagen. Si el jugador del mundo abierto y el
// Sapidae del combate salen del mismo GLB en caché, comparten imágenes y el combate reutiliza el
// teñido ya hecho (≈1–3 s menos en el primer combate).

import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { DRACOLoader } from '../../vendor/DRACOLoader.js';
import { clone as cloneSkinned } from '../../vendor/utils/SkeletonUtils.js';

const CACHE = new Map();
// Un solo lector para todos los GLB. Draco descomprime la geometría de los modelos que la traen comprimida;
// a los demás no les afecta (el decodificador solo se descarga la primera vez que hace falta).
const draco = new DRACOLoader();
/** El mismo decodificador Draco para los lectores que no pasan por la caché (p. ej. NPCManager). */
export const DRACO_LOADER = draco;
draco.setDecoderPath('./vendor/draco/'); // relativa a index.html
const LOADER = new GLTFLoader();
LOADER.setDRACOLoader(draco);

/** Promesa del GLTF original (no modificar su escena: clonarla con cloneGLTF). */
export function loadGLTFCached(path) {
  let p = CACHE.get(path);
  if (!p) {
    p = LOADER.loadAsync(path);
    p.catch(() => CACHE.delete(path)); // un fallo no queda en caché
    CACHE.set(path, p);
  }
  return p;
}

/**
 * Devuelve { scene, animations, ownedGeometries } con una copia del modelo.
 * @param {string} path
 * @param {{ cloneGeometry?: boolean }} [opts] cloneGeometry: cada copia lleva su propia geometría
 *   (necesario si quien la usa modifica atributos, como el Sapidae con sus cuernos y colores).
 */
export async function cloneGLTF(path, { cloneGeometry = false } = {}) {
  const source = await loadGLTFCached(path);
  const scene = cloneSkinned(source.scene);
  const ownedGeometries = [];
  if (cloneGeometry) {
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const g = child.geometry.clone();
        // BufferGeometry.clone() comparte el objeto userData con el original (por referencia): cada copia
        // necesita el suyo, porque el controlador del Sapidae marca ahí estados como «cuernos plegados».
        // Los arrays que contiene (normales y posiciones originales) solo se leen: se pueden compartir.
        g.userData = { ...child.geometry.userData };
        child.geometry = g;
        ownedGeometries.push(g);
      }
    });
  }
  return { scene, animations: source.animations || [], ownedGeometries };
}

/**
 * Saca un GLB de la caché y libera su memoria de GPU (geometrías, materiales y texturas, que los clones comparten).
 * Solo debe llamarlo quien sepa que ya no queda ningún clon de ese modelo en la escena (p. ej. el pueblo del
 * Bosque al salir de la isla). La próxima vez que se pida, se vuelve a cargar (del caché HTTP, rápido).
 */
export async function evictGLTF(path) {
  const p = CACHE.get(path);
  if (!p) return;
  CACHE.delete(path);
  let gltf;
  try { gltf = await p; } catch { return; }
  const seen = new Set();
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if (!m || seen.has(m)) return;
      seen.add(m);
      Object.values(m).forEach((v) => {
        if (v && v.isTexture && !seen.has(v)) {
          seen.add(v);
          const img = v.source?.data;
          v.dispose();
          if (img && typeof img.close === 'function') img.close(); // ImageBitmap: suelta también la memoria del navegador
        }
      });
      m.dispose();
    });
  });
}
