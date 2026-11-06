// NewBadges.js — Hito 130 · Avisos de «Nuevo» en los botones del HUD (Escuadrón, Koliseo, Códice…).
//
// Un único gestor para todos los avisos, con el mismo comportamiento:
//   · punto (algo nuevo sin número) o número (cuántas cosas nuevas hay, «9+» a partir de 10);
//   · el texto del aviso se añade al aria-label y al title del botón (no depende solo del color);
//   · late 3 veces al aparecer o al subir el número y luego queda fijo; si se encienden varios a la vez,
//     solo late el de más prioridad (los demás aparecen quietos);
//   · el estado (visto / no visto) lo decide quien llama: el gestor solo pinta.
//
// API: newBadges.set(id, { on, count?, hint?, prio? }) · newBadges.refresh() (repinta tras reconstruir el HUD).
//   id: id del botón · count > 0 pinta un número; si no, un punto · hint: texto ya traducido · prio: mayor = más importante.

const PING_CLASS = 'lk-nb--ping';

class NewBadgeRegistry {
  constructor() {
    this.items = new Map(); // id → { on, count, hint, prio }
    this._pending = new Set(); // ids que deben latir (se resuelve en el siguiente microtask)
    this._queued = false;
  }

  set(id, { on = false, count = 0, hint = '', prio = 0 } = {}) {
    const prev = this.items.get(id);
    const n = on ? Math.max(0, Math.floor(Number(count) || 0)) : 0;
    const next = { on: Boolean(on), count: n, hint: on ? String(hint || '') : '', prio };
    this.items.set(id, next);
    const grew = next.on && (!prev?.on || next.count > (prev?.count || 0));
    if (grew) this._pending.add(id);
    this._paint(id, next);
    if (grew && !this._queued) { this._queued = true; queueMicrotask(() => this._flushPings()); }
  }

  /** Vuelve a pintar todos los avisos (por ejemplo, si el HUD se ha reconstruido). Sin latido. */
  refresh() { for (const [id, it] of this.items) this._paint(id, it); }

  _paint(id, it) {
    const btn = document.getElementById(id);
    if (!btn) return;
    // Textos originales del botón (se guardan una vez por elemento: si el HUD se reconstruye, se vuelven a leer)
    if (btn.__lkNbBase === undefined) btn.__lkNbBase = { label: btn.getAttribute('aria-label') || '', title: btn.getAttribute('title') || '' };
    const base = btn.__lkNbBase;
    let el = btn.querySelector(':scope > .lk-nb');
    if (!it.on) {
      el?.remove();
      btn.classList.remove('lk-has-new');
      if (base.label) btn.setAttribute('aria-label', base.label); else btn.removeAttribute('aria-label');
      if (base.title) btn.setAttribute('title', base.title); else btn.removeAttribute('title');
      return;
    }
    if (!el) {
      el = document.createElement('span');
      el.setAttribute('aria-hidden', 'true');
      el.addEventListener('animationend', () => el.classList.remove(PING_CLASS));
      btn.appendChild(el);
    }
    el.className = `lk-nb ${it.count ? 'lk-nb--count' : 'lk-nb--dot'}${el.classList.contains(PING_CLASS) ? ` ${PING_CLASS}` : ''}`;
    el.textContent = it.count ? (it.count > 9 ? '9+' : String(it.count)) : '';
    btn.classList.add('lk-has-new');
    if (it.hint) {
      btn.setAttribute('aria-label', base.label ? `${base.label} · ${it.hint}` : it.hint);
      btn.setAttribute('title', base.title ? `${base.title}\n${it.hint}` : it.hint);
    }
  }

  /** De los avisos que acaban de encenderse, solo late el de más prioridad. */
  _flushPings() {
    this._queued = false;
    let best = null;
    for (const id of this._pending) {
      const it = this.items.get(id);
      if (it?.on && (!best || it.prio > this.items.get(best).prio)) best = id;
    }
    this._pending.clear();
    const el = best && document.getElementById(best)?.querySelector(':scope > .lk-nb');
    if (!el) return;
    el.classList.remove(PING_CLASS);
    void el.offsetWidth; // reinicia la animación
    el.classList.add(PING_CLASS);
  }
}

export const newBadges = new NewBadgeRegistry();
