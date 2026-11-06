// PvpHud.js — Arena PvP en pantalla (fase P3): presentación del rival, barra del combate y pantalla final.
// Plan: docs/PLAN_ARENA_PVP.md, sección 14.
//
//   showMatchIntro(match)  «¡Rival encontrado!»: los dos equipos, sus puntos y el tablero (unos segundos o un clic).
//   new PvpHud({ battle, onSurrender, onBack })
//     · barra superior: de quién es el turno, reloj del turno (hora del servidor), ronda, rival conectado o no y
//       «Rendirse» (con confirmación);
//     · avisos cortos (sincronizando, jugada rechazada…);
//     · pantalla final con el resultado oficial: puntos de temporada, SLP y «Volver al Koliseo».
// Todo el texto del rival (nombres) pasa por esc().

import { asset, esc, curIcon, classIcon, reducedMotion } from './lk.js';
import * as i18n from '../i18n/i18n.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const mapName = (map) => (map ? (i18n.lang() === 'es' ? map.nameEs || map.name : map.name) : '');
const sapName = (cls) => {
  const k = `heroes.class.${cls}.name`;
  const t = i18n.t(k);
  return t && t !== k ? t : cls;
};
const signed = (n) => (n > 0 ? `+${n}` : String(n));

function teamCard(snap, side, mine) {
  const s = snap || {};
  const ax = s.axie || {};
  return `<div class="lk-pvpi__team ${mine ? 'lk-is-me' : ''}">
    <small>${esc(mine ? i18n.t('koliseo.board.you') : side)}</small>
    <b class="lk-pvpi__name">${esc(s.name || '?')}</b>
    <span class="lk-pvpi__line">${esc(i18n.t('arena.sapidae', { cls: sapName(s.sapidaeClass || 'crafter') }))}</span>
    <span class="lk-pvpi__line">${ax.class ? classIcon(ax.class) : ''}${esc(ax.name || 'Axie')}</span>
  </div>`;
}

/**
 * Presentación de la partida. Se cierra sola a los `ms` (o con un clic). Devuelve una promesa.
 * @param {object} match  partida (_pvp_match_out)
 * @param {object} map    mapa de BattleMaps
 */
export function showMatchIntro(match, map, { ms = 3200 } = {}) {
  return new Promise((resolve) => {
    document.getElementById('lk-pvp-intro')?.remove();
    const me = match.side === 'B' ? 'B' : 'A';
    const foe = me === 'A' ? 'B' : 'A';
    const el = document.createElement('div');
    el.id = 'lk-pvp-intro';
    el.className = 'lk-ui lk-pvpi';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'assertive');
    el.innerHTML = `
      <div class="lk-pvpi__card">
        <h3 class="lk-pvpi__title"><img class="lk-ai" src="${I('swords')}" alt="">${esc(i18n.t('arena.found'))}</h3>
        <div class="lk-pvpi__teams">
          ${teamCard(match[me], me, true)}
          <span class="lk-pvpi__vs" aria-hidden="true">${esc(i18n.t('arena.vsShort'))}</span>
          ${teamCard(match[foe], foe, false)}
        </div>
        <p class="lk-pvpi__map"><small>${esc(i18n.t('arena.mapLabel'))}</small> ${esc(mapName(map))}</p>
        <p class="lk-pvpi__prep"><span class="lk-kol__spin" aria-hidden="true"></span>${esc(i18n.t('arena.preparing'))}</p>
      </div>`;
    document.body.appendChild(el);
    if (!reducedMotion()) { void el.offsetWidth; el.classList.add('lk-is-in'); } else el.classList.add('lk-is-in');
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      el.classList.remove('lk-is-in');
      setTimeout(() => el.remove(), 260);
      resolve();
    };
    const t = setTimeout(close, ms);
    el.addEventListener('click', close);
  });
}

export class PvpHud {
  constructor({ battle, onSurrender = null, onBack = null }) {
    this.battle = battle;
    this.onSurrender = onSurrender;
    this.onBack = onBack;
    this.turn = null;           // { side, mine, deadline }
    this.online = null;
    this._timer = null;
    this._toastTimer = null;
    this.el = null;
  }

  mount() {
    document.getElementById('lk-pvp-hud')?.remove();
    const el = document.createElement('div');
    el.id = 'lk-pvp-hud';
    el.className = 'lk-ui lk-pvp';
    el.innerHTML = `
      <div class="lk-pvp__bar" role="status" aria-live="polite">
        <span class="lk-pvp__turn"><b data-ref="turn"></b><small data-ref="round"></small></span>
        <span class="lk-pvp__clock" data-ref="clock" aria-label=""></span>
        <span class="lk-pvp__rival" data-ref="rival"><i class="lk-pvp__dot" aria-hidden="true"></i><span>${esc(this.battle.rivalName)}</span></span>
        <span class="lk-pvp__give">
          <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="surrender">${esc(i18n.t('arena.hud.surrender'))}</button>
          <span class="lk-pvp__confirm hidden" data-ref="confirm">
            <small>${esc(i18n.t('arena.hud.surrenderAsk'))}</small>
            <button type="button" class="lk-btn lk-btn-danger-red lk-btn--sm" data-act="surrender-yes">${esc(i18n.t('arena.hud.surrenderYes'))}</button>
            <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="surrender-no">${esc(i18n.t('arena.hud.keepFighting'))}</button>
          </span>
        </span>
      </div>
      <div class="lk-pvp__toast" data-ref="toast" role="status" aria-live="polite"></div>
      <div class="lk-pvp__wait hidden" data-ref="wait"><span class="lk-kol__spin" aria-hidden="true"></span>${esc(i18n.t('arena.hud.waiting'))}</div>`;
    document.body.appendChild(el);
    this.el = el;
    this.$ = (r) => el.querySelector(`[data-ref="${r}"]`);
    el.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'surrender') this._confirm(true);
      else if (act === 'surrender-no') this._confirm(false);
      else if (act === 'surrender-yes') { this.el.querySelector('.lk-pvp__give')?.remove(); this.onSurrender?.(); }
    });
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this._timer = setInterval(() => this._paintClock(), 250);
    this.update();
  }

  _confirm(on) {
    const c = this.$('confirm');
    if (!c) return;
    c.classList.toggle('hidden', !on);
    this.el.querySelector('[data-act="surrender"]')?.classList.toggle('hidden', on);
  }

  /** Turno nuevo según la sesión ({ side, mine, deadline }). */
  setTurn(t) { this.turn = t; this.update(); }

  setOpponent(online) {
    const first = this.online === null;
    this.online = online;
    this.$('rival')?.classList.toggle('lk-is-off', !online);
    if (!first || !online) this.toast(i18n.t(online ? 'arena.hud.online' : 'arena.hud.offline', { name: this.battle.rivalName }), online ? 'good' : 'warn');
  }

  update() {
    if (!this.el) return;
    const b = this.battle;
    const side = b.turnSide;
    const mine = side && side === b.side;
    const turn = this.$('turn');
    if (b.over) turn.textContent = '';
    else turn.textContent = mine ? i18n.t('arena.hud.yourTurn') : i18n.t('arena.hud.rivalTurn', { name: b.rivalName });
    this.el.classList.toggle('lk-is-mine', Boolean(mine) && !b.over);
    this.$('round').textContent = i18n.t('arena.hud.round', { n: Math.min(b.tm.round || 1, b.setup.maxRounds), max: b.setup.maxRounds });
    this._paintClock();
  }

  _paintClock() {
    const clock = this.$?.('clock');
    if (!clock) return;
    const b = this.battle, s = b.session;
    if (!s?.turnDeadline || b.over) { clock.textContent = ''; clock.className = 'lk-pvp__clock'; return; }
    const left = Math.max(0, Math.ceil((s.turnDeadline - b.service.serverNow()) / 1000));
    const txt = i18n.t('arena.hud.secs', { n: left });
    if (clock.textContent !== txt) { clock.textContent = txt; clock.setAttribute('aria-label', txt); }
    clock.className = `lk-pvp__clock ${left <= 5 ? 'lk-is-critical' : left <= 10 ? 'lk-is-low' : ''}`;
  }

  setWaiting(on) { this.$?.('wait')?.classList.toggle('hidden', !on); }

  toast(text, kind = 'info') {
    const t = this.$?.('toast');
    if (!t) return;
    t.textContent = text;
    t.className = `lk-pvp__toast lk-is-on lk-is-${kind}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('lk-is-on'), 3200);
  }

  /** Pantalla final con el resultado oficial. m = partida del servidor + mySide. */
  showEnd(m, { replace = false } = {}) {
    if (!this.el || (this.endEl && !replace)) return;
    if (this.endEl) { this.endEl.remove(); this.endEl = null; }
    this.setWaiting(false);
    this.el.querySelector('.lk-pvp__bar')?.classList.add('hidden');
    const me = m.mySide;
    let outcome;
    if (m.status === 'disputed') outcome = 'review';
    else if (m.status === 'aborted') outcome = 'aborted';
    else outcome = !m.winner ? 'draw' : m.winner === me ? 'win' : 'loss';
    const title = i18n.t(`arena.end.${outcome}`);
    const reasonKey = `arena.end.reason.${m.reason}`;
    const reason = m.reason && i18n.t(reasonKey) !== reasonKey ? i18n.t(reasonKey) : '';
    // Fase P4: lo que decidió el árbitro (sin detalles: quién falló, no cómo)
    const v = m.verdict;
    const verdict = v?.culprit ? i18n.t(v.culprit === me ? 'arena.end.verdict.you' : 'arena.end.verdict.rival')
      : v?.result === 'void' ? i18n.t('arena.end.verdict.void') : '';
    const delta = Number(m.deltas?.[me] ?? 0);
    const slp = Number(m.slp?.[me] ?? 0);
    let rows = '';
    if (outcome === 'review') {
      rows = `<p class="lk-pvpe__text">${esc(i18n.t('arena.end.reviewText'))}</p>`;
    } else if (outcome !== 'aborted') {
      const pts = m.rated === false
        ? `<span class="lk-pvpe__muted">${esc(i18n.t('arena.end.unrated', { n: 3 }))}</span>`
        : `<b class="lk-pvpe__delta ${delta >= 0 ? 'lk-is-up' : 'lk-is-down'}">${esc(signed(delta))}</b>`;
      const reward = slp > 0
        ? `<b class="lk-pvpe__slp"><img src="${curIcon('slp')}" alt="SLP">+${slp}</b>`
        : outcome === 'win' ? `<span class="lk-pvpe__muted">${esc(i18n.t('arena.end.noSlp'))}</span>` : '';
      rows = `<dl class="lk-pvpe__rows">
          <div><dt>${esc(i18n.t('arena.end.points'))}</dt><dd>${pts}</dd></div>
          ${reward ? `<div><dt>${esc(i18n.t('arena.end.slp'))}</dt><dd>${reward}</dd></div>` : ''}
        </dl>`;
    }
    const box = document.createElement('div');
    box.className = `lk-backdrop lk-pvpe lk-is-${outcome}`;
    box.innerHTML = `
      <div class="lk-panel-modal-window lk-pvpe__win" role="dialog" aria-modal="true" aria-labelledby="lk-pvpe-title">
        <h3 id="lk-pvpe-title" class="lk-pvpe__title">${esc(title)}</h3>
        ${reason ? `<p class="lk-pvpe__reason">${esc(reason)}</p>` : ''}
        ${verdict ? `<p class="lk-pvpe__text">${esc(verdict)}</p>` : ''}
        <p class="lk-pvpe__vs">${esc(i18n.t('arena.vs', { name: this.battle.rivalName }))}</p>
        ${rows}
        <button type="button" class="lk-btn lk-btn-primary-gold" data-act="back"><span class="lk-b-ico"><img class="lk-ai" src="${I('tournament')}" alt=""></span>${esc(i18n.t('arena.end.back'))}</button>
      </div>`;
    // Fuera de la barra (que lleva transform): la capa fija ocupa toda la pantalla
    document.body.appendChild(box);
    this.endEl = box;
    box.addEventListener('click', (e) => { if (e.target.closest('[data-act="back"]')) this.onBack?.(); });
    box.addEventListener('pointerdown', (e) => e.stopPropagation());
    void box.offsetWidth;
    box.classList.add('lk-is-open');
    box.querySelector('[data-act="back"]')?.focus?.();
  }

  destroy() {
    clearInterval(this._timer);
    clearTimeout(this._toastTimer);
    this._timer = null;
    this.endEl?.remove();
    this.endEl = null;
    this.el?.remove();
    this.el = null;
    this.$ = () => null;
  }
}
