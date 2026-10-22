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
import { clone as cloneSkinned } from '../../vendor/utils/SkeletonUtils.js';

const CACHE = new Map();

/** Promesa del GLTF original (no modificar su escena: clonarla con cloneGLTF). */
export function loadGLTFCached(path) {
  let p = CACHE.get(path);
  if (!p) {
    p = new GLTFLoader().loadAsync(path);
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
