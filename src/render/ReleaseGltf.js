// ReleaseGltf.js — Hito 113 (memoria): devuelve al navegador un GLB que ya no se usa.
//
// Chrome guarda cada imagen de un GLB como ImageBitmap (RGBA decodificada, 4 bytes por píxel: un Sapidae de Ema o Kai
// son ~150 MB) y three.js nunca llama a close(), ni siquiera después de subirla a la GPU: la memoria solo vuelve
// cuando el recolector de basura decide (y el heap de JS no la cuenta, por eso el Administrador de tareas sube con el
// heap plano). Aquí se liberan, a la vez que la GPU, las geometrías, los esqueletos, los materiales y las texturas del GLB.
//
// Uso (solo para un GLB cargado con su propio lector y que nadie más usa; los de ModelCache tienen evictGLTF):
//   const gltf = await loader.loadAsync(url);
//   adoptGltf(gltf);       // ANTES de personalizarlo: apunta qué objetos son del GLB (los materiales y mallas que se
//                          //  añadan después —armas, contornos, materiales «toon»— no se tocan)
//   ... se usa ...
//   releaseGltf(gltf);     // cuando se descarta
//
// No toca las texturas de lienzo (los teñidos del Sapidae): viven en cachés compartidas entre el mundo, el visor y los retratos.

const isBitmapTexture = (t) => !!(t && t.isTexture && typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap);

/** Apunta las geometrías, esqueletos y materiales que trae el GLB tal como se cargó. */
export function adoptGltf(gltf) {
  if (!gltf || gltf.__lkOwned) return gltf;
  const owned = { geometries: new Set(), skeletons: new Set(), materials: new Set() };
  if (gltf.scene) {
    gltf.scene.traverse((o) => {
      if (o.geometry) owned.geometries.add(o.geometry);
      if (o.isSkinnedMesh && o.skeleton) owned.skeletons.add(o.skeleton);
      for (const m of [].concat(o.material || [])) if (m) owned.materials.add(m);
    });
  }
  gltf.__lkOwned = owned;
  return gltf;
}

/**
 * Libera el GLB. Devuelve cuántas piezas liberó ({ geometrias, esqueletos, texturas, fuentes }) o null si ya estaba liberado.
 * Sin adoptGltf() previo solo se cierran las imágenes (no se toca ninguna malla ni material).
 */
export function releaseGltf(gltf) {
  if (!gltf || gltf.__lkReleased) return null;
  gltf.__lkReleased = true;
  const st = { geometrias: 0, esqueletos: 0, texturas: 0, fuentes: 0 };
  const owned = gltf.__lkOwned;
  if (owned) {
    owned.geometries.forEach((g) => { try { g.dispose(); st.geometrias++; } catch (_) { /* opcional */ } });
    owned.skeletons.forEach((s) => { try { s.dispose(); st.esqueletos++; } catch (_) { /* opcional */ } });
    owned.materials.forEach((m) => {
      try {
        for (const k in m) {
          const v = m[k];
          if (isBitmapTexture(v)) { v.dispose(); st.texturas++; }
        }
        m.dispose();
      } catch (_) { /* opcional */ }
    });
  }
  // Las imágenes originales: todas las copias de una textura comparten el mismo ImageBitmap (el de la caché de fuentes del lector)
  const cache = gltf.parser && gltf.parser.sourceCache;
  if (cache) {
    for (const k of Object.keys(cache)) {
      st.fuentes++;
      Promise.resolve(cache[k]).then((t) => {
        const img = t && t.image;
        if (img && typeof img.close === 'function') img.close();
      }).catch(() => { /* la carga falló: no hay nada que cerrar */ });
    }
  }
  return st;
}

/**
 * Libera una COPIA de ModelCache.cloneGLTF (la que usan el mundo, el combate y los dioramas): sus geometrías propias (opción
 * cloneGeometry) y sus esqueletos. NO toca texturas, imágenes ni materiales del original: son de la caché y los comparten todas las
 * copias (se sueltan con evictGLTF cuando ya no queda ninguna).
 * Devuelve { geometrias, esqueletos } o null si ya estaba liberada.
 */
export function releaseClone(clone) {
  if (!clone || clone.__lkReleased) return null;
  clone.__lkReleased = true;
  const st = { geometrias: 0, esqueletos: 0 };
  (clone.ownedGeometries || []).forEach((g) => { try { g.dispose(); st.geometrias++; } catch (_) { /* opcional */ } });
  if (clone.scene) {
    clone.scene.traverse((o) => {
      if (o.isSkinnedMesh && o.skeleton) { try { o.skeleton.dispose(); st.esqueletos++; } catch (_) { /* opcional */ } }
    });
  }
  return st;
}
