// vfx-modules.js — Lista y carga de los módulos de efectos (mod-<clase>-<parte>.js).
//
// Los módulos son scripts clásicos (IIFE) que leen window.VFX y window.VFX.lib, igual que en el laboratorio original:
// por eso se cargan con <script> en orden y no con import. vfx-lib.js va siempre primero.
//
//   window.VFX = createVfxCore(THREE, {...});
//   await loadVfxModules(new URL('./', import.meta.url).href);            // todos (laboratorio)
//   await loadVfxModules(base, ['pajaro-boca', 'bestia-cola']);           // solo los que hacen falta (juego)

/** Orden de registro del laboratorio: clase por clase, cuernos → boca → orejas → ojos → espalda → cola. */
export const VFX_MODULES = [
  'bestia-cuernos', 'bestia-boca', 'bestia-orejas', 'bestia-ojos', 'bestia-espalda', 'bestia-cola',
  'planta-cuernos', 'planta-boca', 'planta-orejas', 'planta-ojos', 'planta-espalda', 'planta-cola',
  'acuatico-cuernos', 'acuatico-boca', 'acuatico-orejas', 'acuatico-ojos', 'acuatico-espalda', 'acuatico-cola',
  'pajaro-cuernos', 'pajaro-boca', 'pajaro-orejas', 'pajaro-ojos', 'pajaro-espalda', 'pajaro-cola',
  'bicho-cuernos', 'bicho-boca', 'bicho-orejas', 'bicho-ojos', 'bicho-espalda', 'bicho-cola',
  'reptil-cuernos', 'reptil-boca', 'reptil-orejas', 'reptil-ojos', 'reptil-espalda', 'reptil-cola',
  // Sapidae (domadores) y habilidades de dúo Sapidae + Axie (ultimates)
  'sapidae-forjacubiles', 'sapidae-susurrador', 'sapidae-lunalogista', 'sapidae-astromante',
  'duo-embestida', 'duo-gaia', 'duo-maelstrom',
  // cartas α propias de los Axies iniciales (las demás usan el efecto de su carta base)
  'starter-bing', 'starter-pomodoro',
  // efectos básicos reutilizables (fábricas VFX.basic.*) y las 61 habilidades de enemigos que los usan
  'basicos-cuerpo', 'basicos-distancia', 'basicos-apoyo', 'enemigos',
];

/** Módulos que necesitan otros cargados antes (se añaden solos al pedirlos). */
export const VFX_MODULE_DEPS = {
  enemigos: ['basicos-cuerpo', 'basicos-distancia', 'basicos-apoyo'],
};

const loaded = new Map(); // url → Promise

/** Carga un script clásico una sola vez (las llamadas repetidas comparten la misma promesa). */
export function loadScript(url) {
  if (loaded.has(url)) return loaded.get(url);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = false; // respeta el orden de inserción
    s.onload = () => resolve(url);
    s.onerror = () => { loaded.delete(url); reject(new Error(`[vfx] No se pudo cargar ${url}`)); };
    document.head.appendChild(s);
  });
  loaded.set(url, p);
  return p;
}

/**
 * Carga vfx-lib.js y los módulos pedidos (por defecto todos). `base` = URL de la carpeta src/vfx/ con barra final.
 * Requiere window.VFX ya creado con createVfxCore.
 */
export async function loadVfxModules(base, names = VFX_MODULES) {
  if (typeof window === 'undefined' || !window.VFX) throw new Error('[vfx] Crea window.VFX antes de cargar los módulos');
  await loadScript(`${base}vfx-lib.js`);
  const want = new Set(names);
  for (const n of names) for (const d of VFX_MODULE_DEPS[n] || []) want.add(d);
  const ordered = VFX_MODULES.filter((n) => want.has(n));
  await Promise.all(ordered.map((n) => loadScript(`${base}modules/mod-${n}.js`)));
  return ordered;
}
