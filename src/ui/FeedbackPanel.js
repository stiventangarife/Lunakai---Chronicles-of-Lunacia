// FeedbackPanel.js — Ventana «Envíanos tu opinión» (Hito 121).
// Dos usos: el botón del HUD (open) y la invitación del final del tutorial (invite), que primero pregunta
// «¿Te está gustando Lunakai?» y, si el jugador acepta, pasa al formulario en la misma ventana.
// Estados: ask → form → sending → done (y form con error, que conserva el texto).
// API: open({ source }), invite() → Promise<'sent'|'dismissed'>, close(), isOpen, onOpen, onClose.

import { feedbackService, FEEDBACK_MIN, FEEDBACK_MAX } from '../net/FeedbackService.js';
import { asset, esc, sprite } from './lk.js';
import * as i18n from '../i18n/i18n.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);

export class FeedbackPanel {
  constructor({ audio = null } = {}) {
    this.audio = audio;
    this.isOpen = false;
    this.state = 'form';
    this.source = 'hud';
    this.onOpen = null;
    this.onClose = null;
    this._resolve = null;
    this._sent = false;
    this._prevFocus = null;
    this._onKey = (e) => this._key(e);
    this._createDOM();
  }

  // ------------------------------------------------------------ DOM
  _createDOM() {
    document.getElementById('lk-feedback')?.remove();
    const m = document.createElement('div');
    m.id = 'lk-feedback';
    m.className = 'lk-ui lk-backdrop lk-fb-layer hidden';
    m.innerHTML = `
      <div class="lk-panel-modal-window lk-fb" role="dialog" aria-modal="true" aria-labelledby="lk-fb-title">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I('chat')}" alt=""></span>
          <h3 id="lk-fb-title"><small data-ref="kicker"></small><span data-ref="title"></span></h3>
          <button type="button" class="lk-btn-close-x" data-act="close" aria-label="${esc(i18n.t('feedback.close'))}">${sprite('i-close')}</button>
        </div>
        <div class="lk-fb__body">
          <section class="lk-fb__ask" data-ref="ask" hidden>
            <p class="lk-fb__lead">${esc(i18n.t('feedback.ask.text'))}</p>
            <div class="lk-fb__foot">
              <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="later">${esc(i18n.t('feedback.ask.no'))}</button>
              <button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="accept"><span class="lk-b-ico"><img class="lk-ai" src="${I('chat')}" alt=""></span>${esc(i18n.t('feedback.ask.yes'))}</button>
            </div>
          </section>

          <section class="lk-fb__form" data-ref="form">
            <p class="lk-fb__lead">${esc(i18n.t('feedback.lead'))}</p>
            <label class="lk-fb__label" for="lk-fb-text">${esc(i18n.t('feedback.label'))}</label>
            <textarea id="lk-fb-text" class="lk-fb__text" data-ref="text" rows="6" maxlength="${FEEDBACK_MAX}" spellcheck="true" placeholder="${esc(i18n.t('feedback.placeholder'))}"></textarea>
            <div class="lk-fb__meta">
              <span class="lk-fb__who" data-ref="who"></span>
              <span class="lk-fb__count" data-ref="count" aria-live="polite"></span>
            </div>
            <p class="lk-fb__err" data-ref="err" role="alert" hidden></p>
            <div class="lk-fb__foot">
              <span class="lk-fb__hint">${esc(i18n.t('feedback.hint'))}</span>
              <button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="send"><span class="lk-b-ico"><img class="lk-ai" src="${I('mail')}" alt=""></span><span data-ref="sendLabel">${esc(i18n.t('feedback.send'))}</span></button>
            </div>
          </section>

          <section class="lk-fb__done" data-ref="done" hidden>
            <span class="lk-fb__seal"><img class="lk-ai" src="${I('tick')}" alt=""></span>
            <h4>${esc(i18n.t('feedback.doneTitle'))}</h4>
            <p>${esc(i18n.t('feedback.doneText'))}</p>
            <div class="lk-fb__foot lk-fb__foot--center">
              <button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="close"><span class="lk-b-ico"><img class="lk-ai" src="${I('tick')}" alt=""></span>${esc(i18n.t('feedback.close'))}</button>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(m);
    this.el = m;
    this.$ = (r) => m.querySelector(`[data-ref="${r}"]`);

    m.addEventListener('click', (e) => {
      if (e.target === m) { if (this.state !== 'sending') this.close(); return; }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') this.close();
      else if (act === 'later') this.close();
      else if (act === 'accept') this._setState('form');
      else if (act === 'send') this._send();
    });
    // Que los clics dentro de la ventana no lleguen al juego ni cuenten como «clic fuera» de otras ventanas
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    const ta = this.$('text');
    ta.addEventListener('input', () => { this._hideError(); this._updateCount(); });
  }

  // ------------------------------------------------------------ abrir y cerrar
  /** Formulario directo (botón del HUD). */
  open({ source = 'hud' } = {}) {
    this._show(source, 'form');
  }

  /** Invitación del final del tutorial. Se resuelve al cerrarse: 'sent' si llegó a enviar, 'dismissed' si no. */
  invite() {
    return new Promise((resolve) => {
      if (this.isOpen) this.close();
      this._resolve = resolve;
      this._show('tutorial_end', 'ask');
    });
  }

  _show(source, state) {
    this.source = source;
    this._sent = false;
    if (!this.isOpen) {
      this.isOpen = true;
      this._prevFocus = document.activeElement;
      this.el.classList.remove('hidden');
      void this.el.offsetWidth;
      this.el.classList.add('lk-is-open');
      window.addEventListener('keydown', this._onKey, true);
      try { this.audio?.playBuff?.(); } catch (_) { /* nada */ }
    }
    this._setState(state);
    this.onOpen?.();
  }

  /** force: cerrar aunque esté enviando (p. ej. empieza un combate); el envío sigue en segundo plano. */
  close({ force = false } = {}) {
    if (!this.isOpen || (this.state === 'sending' && !force)) return;
    this.isOpen = false;
    this.el.classList.remove('lk-is-open');
    this.el.classList.add('hidden');
    window.removeEventListener('keydown', this._onKey, true);
    try { this._prevFocus?.focus?.({ preventScroll: true }); } catch (_) { /* nada */ }
    this._prevFocus = null;
    // Tras enviar se vacía el texto; si se cierra sin enviar, se conserva para la próxima vez
    if (this._sent) this.$('text').value = '';
    const res = this._resolve;
    this._resolve = null;
    res?.(this._sent ? 'sent' : 'dismissed');
    this.onClose?.();
  }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  // ------------------------------------------------------------ estados
  _setState(state) {
    this.state = state;
    const ask = state === 'ask';
    const done = state === 'done';
    this.$('ask').hidden = !ask;
    this.$('form').hidden = ask || done;
    this.$('done').hidden = !done;
    this.$('kicker').textContent = i18n.t(ask ? 'feedback.ask.kicker' : 'feedback.kicker');
    this.$('title').textContent = i18n.t(ask ? 'feedback.ask.title' : 'feedback.title');
    const sending = state === 'sending';
    const ta = this.$('text');
    ta.readOnly = sending;
    this.el.querySelector('[data-act="send"]').classList.toggle('lk-is-busy', sending);
    this.$('sendLabel').textContent = i18n.t(sending ? 'feedback.sending' : 'feedback.send');
    this.el.querySelector('.lk-fb').setAttribute('aria-busy', sending ? 'true' : 'false');
    if (state === 'form') {
      this._renderWho();
      this._updateCount();
      this._focus(ta);
    } else if (ask) {
      this._focus(this.el.querySelector('[data-act="accept"]'));
    } else if (done) {
      this._focus(this.el.querySelector('.lk-fb__done [data-act="close"]'));
    }
  }

  /** La capa entra con una transición de visibility: en el primer fotograma sigue oculta y focus() no hace nada. */
  _focus(el, tries = 0) {
    if (!el || !this.isOpen) return;
    try { el.focus({ preventScroll: true }); } catch (_) { /* nada */ }
    if (document.activeElement !== el && tries < 6) setTimeout(() => this._focus(el, tries + 1), 50);
  }

  _renderWho() {
    const s = feedbackService.sender();
    let who = i18n.t('feedback.asGuest');
    if (s.kind === 'skymavis') who = s.name ? i18n.t('feedback.asSkyName', { name: s.name }) : i18n.t('feedback.asSky');
    else if (s.kind === 'email') who = s.name ? i18n.t('feedback.asEmailName', { name: s.name }) : i18n.t('feedback.asEmail');
    this.$('who').textContent = i18n.t('feedback.as', { who });
  }

  _updateCount() {
    const n = this.$('text').value.trim().length;
    const c = this.$('count');
    c.textContent = i18n.t('feedback.count', { n: i18n.num(n), max: i18n.num(FEEDBACK_MAX) });
    c.classList.toggle('lk-is-warn', n > FEEDBACK_MAX * 0.9);
    const btn = this.el.querySelector('[data-act="send"]');
    const ok = n >= FEEDBACK_MIN && this.state !== 'sending';
    btn.disabled = !ok;
    btn.setAttribute('aria-disabled', ok ? 'false' : 'true');
  }

  _showError(text) {
    const e = this.$('err');
    e.textContent = text;
    e.hidden = false;
  }

  _hideError() { this.$('err').hidden = true; }

  // ------------------------------------------------------------ envío
  async _send() {
    if (this.state === 'sending') return;
    const text = this.$('text').value.trim();
    if (text.length < FEEDBACK_MIN) { this._showError(i18n.t('feedback.err.tooShort', { n: FEEDBACK_MIN })); return; }
    this._hideError();
    this._setState('sending');
    this._updateCount();
    try {
      await feedbackService.send({ message: text, source: this.source });
      this._sent = true;
      if (!this.isOpen) { this.$('text').value = ''; this.state = 'form'; return; } // se cerró a la fuerza mientras se enviaba
      try { this.audio?.playConfirm?.(); } catch (_) { /* nada */ }
      this._setState('done');
    } catch (err) {
      console.warn('[Feedback] envío', err);
      if (!this.isOpen) { this.state = 'form'; return; }
      this._setState('form');
      this._showError(this._errorText(err));
    }
  }

  _errorText(err) {
    switch (err?.code) {
      case 'too_short': return i18n.t('feedback.err.tooShort', { n: FEEDBACK_MIN });
      case 'too_long': return i18n.t('feedback.err.tooLong', { n: i18n.num(FEEDBACK_MAX) });
      case 'rate_limited': return i18n.t('feedback.err.rateLimited');
      case 'network': return i18n.t('feedback.err.network');
      default: return i18n.t('feedback.err.unavailable');
    }
  }

  // ------------------------------------------------------------ teclado
  _key(e) {
    if (!this.isOpen) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.close();
      return;
    }
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && (e.ctrlKey || e.metaKey) && this.state === 'form') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this._send();
      return;
    }
    // Fuera del área de texto, ninguna tecla llega al juego (atajos, movimiento, guía del tutorial).
    // Tab, Intro y Espacio siguen funcionando sobre los botones de la ventana.
    if (!/^(TEXTAREA|INPUT)$/.test(e.target?.tagName || '')) {
      e.stopImmediatePropagation();
      if (!['Tab', 'Enter', 'NumpadEnter', 'Space'].includes(e.code)) e.preventDefault();
    }
  }
}
