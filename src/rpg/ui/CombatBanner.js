// CombatBanner.js — Transición de cierre de combate (Crónica Celeste)
// Componente «Transición de cierre» del sistema de diseño (pantalla 14): bandas de cine con filo dorado,
// tablero desenfocado, emblema lunar y título VICTORIA / DERROTA. Se pinta en #cinematic-banner (index.html).
// Uso en main.js:  await banner.play('victory', { subtitle });  …  await banner.hide();

const MOON = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M40 6a26 26 0 1 0 17 45.4A21.5 21.5 0 1 1 40 6z" fill="currentColor"/><path class="lk-cine__crack" d="M27 12l6 13-7 6 8 10-5 13"/></svg>';
const HOLD = { victory: 1700, defeat: 2400 };   // tiempo en pantalla antes de dar paso al panel
const OUT_MS = 450;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.classList.contains('lk-reduce-motion');

export class CombatBanner {
  constructor() {
    this.el = document.getElementById('cinematic-banner');
  }

  _html(kind, subtitle) {
    const title = kind === 'victory' ? 'VICTORIA' : 'DERROTA';
    const motes = Array.from({ length: kind === 'victory' ? 26 : 18 }, (_, k) => {
      const r = (n) => (Math.sin((k + 1) * n) + 1) / 2;
      return `<i style="--x:${(r(12.9) * 100).toFixed(1)}%;--s:${(2 + r(7.3) * 4).toFixed(1)}px;--d:${(0.3 + r(3.1) * 1.1).toFixed(2)}s;--t:${(2 + r(5.7) * 1.6).toFixed(2)}s"></i>`;
    }).join('');
    return `<i class="lk-cine__bar lk-cine__bar--top"></i><i class="lk-cine__bar lk-cine__bar--bot"></i><div class="lk-cine__veil"></div><div class="lk-cine__motes">${motes}</div>
      <div class="lk-cine__core"><span class="lk-cine__rays"></span><span class="lk-cine__ring"></span><span class="lk-cine__emblem">${MOON}</span>
      <div class="lk-cine__title" data-text="${title}">${title}</div><div class="lk-cine__line"><i></i></div><div class="lk-cine__sub">${esc(subtitle)}</div></div>`;
  }

  /** Muestra la transición y se resuelve cuando toca dar paso al panel. */
  async play(kind = 'victory', { subtitle = '' } = {}) {
    if (!this.el) return;
    clearTimeout(this._hideT);
    this.el.className = `lk-ui lk-cine lk-cine-layer lk-cine--${kind}`;
    this.el.innerHTML = this._html(kind, subtitle);
    void this.el.offsetWidth;
    this.el.classList.add('lk-is-play');
    await wait(reduced() ? 900 : HOLD[kind] || 1700);
  }

  /** Disuelve el título (mientras aparece el panel) y oculta la capa. */
  async hide() {
    if (!this.el) return;
    this.el.classList.add('lk-is-out');
    await wait(reduced() ? 50 : OUT_MS);
    this.el.classList.add('hidden');
    this.el.classList.remove('lk-is-play', 'lk-is-out');
    this.el.innerHTML = '';
  }
}
