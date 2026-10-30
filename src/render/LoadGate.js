// LoadGate.js — Cargas del mundo abierto que deben terminar DETRÁS del telón de carga (29-oct).
//
// Problema: varias piezas de una isla se cargaban «sueltas» (sin await): el pueblo del Bosque, los edificios y
// estatuas GLB de las islas (placeIslandProps), las texturas de tierra de los caminos y las máscaras de agua y
// pendiente. El telón se abría con solo el terreno y, 0,5–3 s después, todo eso entraba de golpe en la escena
// (texturas a la GPU, shaders compilados en vivo, recorridos de la escena): los tirones al empezar la partida y
// al llegar a una isla.
//
// Uso:
//   trackLoad(promesa, 'nombre')   quien lanza una carga diferida la apunta aquí (devuelve la misma promesa)
//   await waitForLoads(ms)         changeMap / init la esperan antes del precalentado (con tope: nunca se cuelga)
//   const release = holdLoads()    mientras el telón está cerrado los cálculos por trozos usan trozos más grandes
//   sliceBudget(4)                 → 4 ms jugando, 24 ms con el telón cerrado (terminan antes)

const pending = new Set();
let holds = 0;

/** Apunta una carga diferida. Devuelve la misma promesa (no cambia su resultado ni sus errores). */
export function trackLoad(promise, label = '') {
  if (!promise || typeof promise.then !== 'function') return promise;
  const entry = { p: promise, label, t0: performance.now() };
  pending.add(entry);
  const done = () => pending.delete(entry);
  promise.then(done, done);
  return promise;
}

/**
 * Espera a que terminen las cargas apuntadas (también las que se apunten mientras se espera: el pueblo, al
 * terminar, puede lanzar otras). Con tope: si algo tarda más (red lenta, un GLB que falla), sigue y lo avisa.
 * @returns {Promise<number>} ms esperados
 */
export async function waitForLoads(timeoutMs = 8000) {
  const t0 = performance.now();
  while (pending.size) {
    const left = timeoutMs - (performance.now() - t0);
    if (left <= 0) {
      console.warn('[LoadGate] Tope de espera alcanzado; siguen cargando:', [...pending].map((e) => e.label || '?').join(', '));
      break;
    }
    let timer = null;
    await Promise.race([
      Promise.allSettled([...pending].map((e) => e.p)),
      new Promise((r) => { timer = setTimeout(r, left); }),
    ]);
    clearTimeout(timer);
  }
  return Math.round(performance.now() - t0);
}

/** Cargas pendientes (diagnóstico). */
export function pendingLoads() { return [...pending].map((e) => ({ label: e.label, ms: Math.round(performance.now() - e.t0) })); }

/**
 * Marca «telón cerrado» hasta llamar a la función devuelta. Se suelta sola a los 30 s por seguridad (si una carga
 * falla a mitad, el juego no se queda con trozos grandes para siempre).
 */
export function holdLoads() {
  holds++;
  let released = false;
  const release = () => { if (released) return; released = true; holds = Math.max(0, holds - 1); clearTimeout(t); };
  const t = setTimeout(release, 30000);
  return release;
}

/** Presupuesto por trozo de los cálculos repartidos: más grande con el telón cerrado. */
export function sliceBudget(normalMs) { return holds > 0 ? Math.max(normalMs, 24) : normalMs; }

if (typeof window !== 'undefined') window.lkLoads = { pending: pendingLoads };
