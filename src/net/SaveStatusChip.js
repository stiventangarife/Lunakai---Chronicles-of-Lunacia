// SaveStatusChip.js — Indicador discreto del guardado en la nube (solo con cuenta).
// "Guardado en la nube" · "Guardando…" · "Sin conexión: se reintentará" · "No se pudo guardar · Reintentar"

import { toast } from '../ui/lk.js';

const TEXT = {
  saving: 'Guardando…',
  saved: 'Guardado en la nube',
  offline: 'Sin conexión · se reintentará',
  error: 'No se pudo guardar',
};

export class SaveStatusChip {
  constructor(accountManager) {
    this.account = accountManager;
    this.el = document.createElement('div');
    this.el.className = 'lk-ui lk-save-chip';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    this.el.hidden = true;
    this.el.innerHTML = '<span class="lk-save-chip__dot"></span><span class="lk-save-chip__txt"></span><button type="button" class="lk-save-chip__retry" hidden>Reintentar</button>';
    document.body.appendChild(this.el);
    this._txt = this.el.querySelector('.lk-save-chip__txt');
    this._btn = this.el.querySelector('.lk-save-chip__retry');
    this._btn.addEventListener('click', () => {
      this._btn.disabled = true;
      this.account.cloud.retryNow().finally(() => { this._btn.disabled = false; });
    });
    this._hideT = null;
    this.visibleInGame = false;

    this.account.cloud.onStatus((status, cloud) => {
      if (status === 'conflict') { if (cloud.lastNotice) toast(cloud.lastNotice); return; }
      this.render(status);
    });
  }

  /** El indicador solo se muestra durante la partida (no en la pantalla de inicio). */
  setInGame(on) {
    this.visibleInGame = on;
    this.render(this.account.cloud.status);
  }

  render(status) {
    const show = this.visibleInGame && this.account.mode === 'account' && status !== 'idle';
    clearTimeout(this._hideT);
    if (!show) { this.el.hidden = true; return; }
    this.el.hidden = false;
    this.el.dataset.state = status;
    this._txt.textContent = TEXT[status] || '';
    this._btn.hidden = !(status === 'error' || status === 'offline');
    // "Guardado" se muestra un momento y se atenúa; los errores se quedan hasta resolverse.
    this.el.classList.remove('lk-is-quiet');
    if (status === 'saved') this._hideT = setTimeout(() => this.el.classList.add('lk-is-quiet'), 2500);
  }
}
