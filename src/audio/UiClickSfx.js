// UiClickSfx.js — Hito 119: clic común para todos los botones de la interfaz, sin dobles sonidos.
//
// · Un solo detector de clics en el documento (fase de burbuja: los manejadores de cada botón ya se ejecutaron).
// · Si ese manejador ya tocó su propio sonido (confirmar, comprar, forjar…), no se repite: cada método play* de
//   TacticalAudio (salvo la música) anota cuándo sonó y el clic común se salta si sonó hace menos de 80 ms.
// · Para dejar un botón (o un bloque entero) sin el clic común: data-sfx="none".
// · Sin sonidos al pasar el ratón (cansan con el uso); los que ya existían se quedan.

const BUTTON = 'button, [role="button"], .lk-btn';
const RECENT_MS = 80;

export function installUiClickSfx(audio) {
  if (!audio || audio.__uiClickSfx || typeof document === 'undefined') return;
  audio.__uiClickSfx = true;
  audio._uiAt = -Infinity;

  // Marca de «ya sonó algo»: se envuelven una vez los métodos de efectos de la instancia (no la música)
  const proto = Object.getPrototypeOf(audio);
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (!/^play/.test(name) || /Music$/.test(name) || typeof proto[name] !== 'function') continue;
    const fn = proto[name];
    audio[name] = function (...args) { audio._uiAt = performance.now(); return fn.apply(audio, args); };
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target instanceof Element ? ev.target.closest(BUTTON) : null;
    if (!el || el.disabled || el.closest('[data-sfx="none"]')) return;
    if (performance.now() - audio._uiAt < RECENT_MS) return;
    audio.playClick?.();
  });
}
