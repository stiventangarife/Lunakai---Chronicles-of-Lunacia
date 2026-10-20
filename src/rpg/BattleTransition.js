// BattleTransition.js — Transición de entrada y salida del combate (Crónica Celeste)
// Mismo lenguaje que la transición de cierre (CombatBanner · .lk-cine): bandas de cine con filo, velo,
// emblema y título en la tipografía de marca. Al entrar, el acento es rojo de quimera y, mientras se monta
// el tablero (onBlackout), la pantalla queda cubierta por el cielo nocturno con una barra de carga y un
// consejo de combate. Al volver, un fundido nocturno con «Volviendo a Lunacia».
//
// API sin cambios: playEncounter(onBlackout, onComplete, info?) y playReturn(onBlackout, onComplete).
// `info` (opcional): { title, subtitle } — p. ej. { subtitle: 'Slime Espina ×3 · Valle del Dojō' }.

const SWORDS = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8l26 26M8 12l4-4"/><path d="M52 8L26 34M56 12l-4-4"/><path d="M30 38l-6 6M34 38l6 6"/><path d="M20 40l-8 8 4 4 8-8M44 40l8 8-4 4-8-8"/><path d="M38 30l4 4M26 30l-4 4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3a9 9 0 1 0 6 15.7A7.5 7.5 0 1 1 15 3z" fill="currentColor"/></svg>';

// Consejos de combate (mecánicas reales del juego)
const TIPS = [
  'Cada carta gasta PA. Si te sobran al final del turno, guarda una defensa para el turno enemigo.',
  'Pasa el cursor sobre una unidad para ver su vida, sus PA, PM y estados sin abrir nada.',
  'Las teclas 1–6 lanzan las habilidades del héroe activo; Espacio pasa el turno.',
  'El Vínculo Supremo se carga con el combate: úsalo cuando el enemigo esté junto a tu axie principal.',
  'Atacar por la espalda o el flanco hace más daño; mira hacia dónde apuntan las quimeras.',
  'Si tu escuadrón cae, el vínculo con tu axie principal baja. Cúralo en el campamento antes de volver.',
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.classList.contains('lk-reduce-motion');

export class BattleTransition {
  constructor(audioSystem) {
    this.audio = audioSystem;
    this.isTransitioning = false;
    this._tip = Math.floor(Math.random() * TIPS.length);
    this._createDOM();
  }

  _createDOM() {
    let el = document.getElementById('battle-transition-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'battle-transition-overlay';
      document.body.appendChild(el);
    }
    el.className = 'lk-ui lk-cine lk-btl hidden';
    el.setAttribute('aria-live', 'assertive');
    this.overlayEl = el;
  }

  _encounterHTML(title, subtitle, tip) {
    const sparks = Array.from({ length: 18 }, (_, k) => {
      const a = (k / 18) * 360 + (k % 2 ? 6 : -6);
      return `<i style="--a:${a.toFixed(0)}deg;--l:${(70 + (k % 3) * 26)}px;--d:${(0.12 + (k % 4) * 0.03).toFixed(2)}s"></i>`;
    }).join('');
    return `<div class="lk-btl__night" aria-hidden="true"><div class="lk-vista lk-vista--night"><div class="lk-mt lk-mt1"></div><div class="lk-mt lk-mt2"></div><div class="lk-haze"></div><div class="lk-mt lk-mt3"></div></div></div>
      <div class="lk-cine__veil"></div><i class="lk-btl__flash" aria-hidden="true"></i>
      <i class="lk-cine__bar lk-cine__bar--top"></i><i class="lk-cine__bar lk-cine__bar--bot"></i>
      <div class="lk-cine__core"><span class="lk-cine__ring"></span><span class="lk-btl__sparks" aria-hidden="true">${sparks}</span>
        <span class="lk-cine__emblem lk-btl__emblem">${SWORDS}</span>
        <div class="lk-cine__title" data-text="${esc(title)}">${esc(title)}</div><div class="lk-cine__line"><i></i></div>
        ${subtitle ? `<div class="lk-cine__sub">${esc(subtitle)}</div>` : ''}</div>
      <div class="lk-btl__load" role="status">
        <div class="lk-tip-card"><span class="lk-label">Consejo de combate</span><p>${esc(tip)}</p></div>
        <div class="lk-btl__bar"><span class="lk-moon-spin" aria-hidden="true">${MOON}</span><span>Preparando el campo de batalla…</span><i class="lk-btl__trk"><i></i></i></div>
      </div>`;
  }

  /**
   * Transición de encuentro.
   * @param {Function} onBlackout - se llama con la pantalla ya cubierta, para montar el combate.
   * @param {Function} onComplete - al terminar.
   * @param {{title?:string, subtitle?:string}} [info]
   */
  async playEncounter(onBlackout = null, onComplete = null, info = {}) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const fast = reduced();

    if (this.audio && typeof this.audio.playImpact === 'function') this.audio.playImpact();
    else if (this.audio && typeof this.audio.playCollision === 'function') this.audio.playCollision();
    if (this.audio && typeof this.audio.stopMusic === 'function') this.audio.stopMusic(600);

    this._tip = (this._tip + 1) % TIPS.length;
    const el = this.overlayEl;
    el.className = 'lk-ui lk-cine lk-btl lk-btl--in';
    el.innerHTML = this._encounterHTML(info.title || '¡COMBATE!', info.subtitle || '', TIPS[this._tip]);
    void el.offsetWidth;
    el.classList.add('lk-is-play');

    // Título y bandas (≈1,1 s); la noche termina de cubrir la escena justo antes del cambio
    await wait(fast ? 350 : 1150);
    el.classList.add('lk-is-cover');
    await wait(fast ? 50 : 250);

    // Mientras se monta el tablero, se ve la barra de carga (solo si tarda)
    const slow = setTimeout(() => el.classList.add('lk-is-loading'), 450);
    try { if (typeof onBlackout === 'function') await onBlackout(); }
    finally { clearTimeout(slow); }
    el.classList.add('lk-is-ready');
    await wait(fast ? 50 : 300);

    // Se abre el telón sobre el tablero
    el.classList.add('lk-is-out');
    await wait(fast ? 80 : 600);
    this._reset();
    if (typeof onComplete === 'function') onComplete();
  }

  /** Vuelta del combate al mundo abierto: fundido nocturno breve. */
  async playReturn(onBlackout = null, onComplete = null) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const fast = reduced();
    const el = this.overlayEl;
    el.className = 'lk-ui lk-cine lk-btl lk-btl--back';
    el.innerHTML = `<div class="lk-btl__night" aria-hidden="true"><div class="lk-vista lk-vista--night"><div class="lk-mt lk-mt1"></div><div class="lk-mt lk-mt2"></div><div class="lk-haze"></div><div class="lk-mt lk-mt3"></div></div></div>
      <div class="lk-btl__back" role="status"><span class="lk-moon-spin" aria-hidden="true">${MOON}</span><span>Volviendo a Lunacia…</span></div>`;
    void el.offsetWidth;
    el.classList.add('lk-is-play', 'lk-is-cover');
    await wait(fast ? 80 : 500);

    if (typeof onBlackout === 'function') await onBlackout();
    await wait(fast ? 50 : 300);

    el.classList.add('lk-is-out');
    await wait(fast ? 80 : 600);
    this._reset();
    if (typeof onComplete === 'function') onComplete();
  }

  _reset() {
    this.overlayEl.className = 'lk-ui lk-cine lk-btl hidden';
    this.overlayEl.innerHTML = '';
    this.isTransitioning = false;
  }
}
