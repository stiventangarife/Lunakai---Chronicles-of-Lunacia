// BackgroundFrames.js — Hito 82: el combate sigue aunque el juego esté minimizado o en otra pestaña.
//
// Con la pestaña oculta el navegador deja de llamar a requestAnimationFrame: el bucle del juego, el movimiento de las
// unidades, los empujones y los efectos se quedaban congelados, mientras los turnos enemigos (que esperan con
// setTimeout) seguían a medias. Aquí requestAnimationFrame pasa a usar setTimeout mientras la pestaña está oculta
// (el navegador lo espacia a ~1 vez por segundo) y, al ocultarse, los fotogramas ya pedidos se disparan por esa vía.
// Las animaciones calculan su avance con el tiempo real, así que terminan aunque lleguen pocos fotogramas.
// Con la pestaña visible todo va como siempre (requestAnimationFrame nativo).

const pending = new Map(); // id → { cb, native: id nativo | null, timer: id de setTimeout | null }
let seq = 0;
let installed = false;

export function installBackgroundFrames() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCAF = window.cancelAnimationFrame.bind(window);
  const viaTimer = (id, entry) => { entry.timer = setTimeout(() => { pending.delete(id); entry.cb(performance.now()); }, 16); };
  window.requestAnimationFrame = (cb) => {
    const id = ++seq;
    const entry = { cb, native: null, timer: null };
    pending.set(id, entry);
    if (document.hidden) viaTimer(id, entry);
    else entry.native = nativeRAF((t) => { pending.delete(id); cb(t); });
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    const e = pending.get(id);
    if (!e) return;
    pending.delete(id);
    if (e.native != null) nativeCAF(e.native);
    if (e.timer != null) clearTimeout(e.timer);
  };
  // Al ocultarse: lo ya pedido con requestAnimationFrame nativo no llegaría nunca → se pasa a setTimeout
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    for (const [id, e] of pending) {
      if (e.native == null) continue;
      nativeCAF(e.native); e.native = null;
      viaTimer(id, e);
    }
  });
}
