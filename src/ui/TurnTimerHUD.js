// TurnTimerHUD.js — Reloj del turno del jugador en el combate (reglas en tactics/combat/TurnTimer.js).
//
// Se engancha a main.js (attachTurnTimer(game), después de _setupTurnCallbacks):
//   · empieza en cada turno de una unidad del jugador (no en el tutorial, la arena de pruebas ni los turnos perdidos);
//   · cuenta como «actuar» moverse o lanzar una carta (castigo de −10 s si a los 10 s no ha hecho nada);
//   · al llegar a 0 pasa el turno como si se pulsara Espacio, esperando a que termine la animación en curso;
//   · sigue corriendo aunque la pestaña esté en segundo plano.
// Se dibuja en el botón «Pasar turno»: barra que se vacía, segundos y notas (aviso de inactividad, −10 s, +X s). Consola: lunakaiTurnTimer, lkDebug.timer(false|true).

import { TurnTimer } from '../tactics/combat/TurnTimer.js';
import * as i18n from '../i18n/i18n.js';

const R = 15.5;
const CIRC = 2 * Math.PI * R;

export function attachTurnTimer(game) {
  if (!game || game.turnTimer) return game?.turnTimer || null;
  const tm = game.turnManager;
  const sm = game.spellManager;
  const timer = new TurnTimer();
  game.turnTimer = timer;
  if (typeof window !== 'undefined') window.lunakaiTurnTimer = timer;

  // ── Vista: el reloj vive en el botón «Pasar turno» (es la acción que dispara al llegar a 0).
  //    · Barra que se vacía en el borde inferior del botón y «21 s · Espacio» en la segunda línea.
  //    · ≤ 10 s ámbar, ≤ 5 s carmesí con halo (sin animación si se pide menos movimiento).
  //    · Aviso ANTES del castigo por inactividad, y los +/− segundos en una nota sobre el botón.
  let btn = null, timeEl = null, barEl = null, noteEl = null;
  function ensureEl() {
    const b = document.getElementById('btn-end-turn');
    if (!b) return null;
    if (b === btn && timeEl?.isConnected) return btn;
    btn = b;
    const small = btn.querySelector('small');
    if (small && !small.querySelector('.lk-et-time')) small.innerHTML = `<span class="lk-et-time" aria-hidden="true"></span><span class="lk-et-sep" aria-hidden="true"> · </span>${i18n.t('combatUi.keySpace')}`;
    if (!btn.querySelector('.lk-et-bar')) btn.insertAdjacentHTML('beforeend', '<span class="lk-et-bar" aria-hidden="true"><i></i></span><span class="lk-et-note" role="status" aria-live="polite"></span>');
    timeEl = btn.querySelector('.lk-et-time');
    barEl = btn.querySelector('.lk-et-bar > i');
    noteEl = btn.querySelector('.lk-et-note');
    return btn;
  }
  const RULES = i18n.t('combatUi.timerRules');
  let lastSec = -1;
  function paint() {
    if (!ensureEl()) return;
    const rem = Math.max(0, timer.remaining || 0);
    const secs = Math.ceil(rem);
    if (secs !== lastSec) {
      lastSec = secs;
      timeEl.textContent = i18n.t('combatUi.secs', { n: secs });
      btn.setAttribute('aria-label', i18n.t('combatUi.endTurnLeft', { n: secs }));
    }
    const frac = timer.duration ? Math.max(0, Math.min(1, rem / timer.duration)) : 0;
    barEl.style.transform = `scaleX(${frac})`;
    btn.classList.toggle('lk-is-low', rem <= 10 && rem > 5);
    btn.classList.toggle('lk-is-critical', rem <= 5);
    // Aviso previo al castigo: los 5 s anteriores al límite de inactividad
    const c = timer.config, idleLeft = c.idleLimit - (timer.elapsed || 0);
    if (timer.running && !timer.acted && !timer.penalized && idleLeft <= 5 && idleLeft > 0) {
      note(i18n.t('combatUi.idleWarn', { n: Math.ceil(idleLeft), p: c.idlePenalty }), 'warn', 0);
    } else if (noteEl?.dataset.kind === 'warn') hideNote();
  }
  let noteTimer = null;
  function note(text, kind, ms = 1800) {
    if (!ensureEl()) return;
    if (noteEl.textContent !== text) noteEl.textContent = text;
    noteEl.dataset.kind = kind;
    noteEl.className = `lk-et-note lk-is-${kind} lk-is-on`;
    clearTimeout(noteTimer);
    if (ms) noteTimer = setTimeout(hideNote, ms);
  }
  function hideNote() { if (noteEl) { noteEl.classList.remove('lk-is-on'); delete noteEl.dataset.kind; } }
  const pop = (text, kind) => note(text, kind === 'bad' ? 'bad' : 'good');
  const show = (on) => {
    if (!ensureEl()) return;
    btn.classList.toggle('lk-has-timer', on);
    btn.title = on ? RULES : '';
    if (!on) { btn.classList.remove('lk-is-low', 'lk-is-critical', 'lk-is-penalized'); btn.setAttribute('aria-label', i18n.t('combatUi.endTurnAria')); if (noteEl?.dataset.kind === 'warn') hideNote(); lastSec = -1; }
  };
  // Compatibilidad con el código que ocultaba el medallón (`el.hidden = true`)
  const el = { set hidden(v) { if (v) show(false); }, classList: { add() {}, remove() {} } };

  timer.on('start', ({ duration }) => {
    show(true); btn?.classList.remove('lk-is-penalized'); paint();
    if (duration > timer.config.base) pop(i18n.t('combatUi.reserve', { n: duration - timer.config.base }), 'good');
  });
  timer.on('penalty', ({ amount }) => {
    pop(i18n.t('combatUi.idlePenalty', { n: amount }), 'bad');
    btn?.classList.add('lk-is-penalized');
    game.audio?.playCollision?.();
    paint();
  });
  timer.on('finish', ({ leftover, nextDuration, expired }) => {
    if (!expired && nextDuration > timer.config.base) pop(i18n.t('combatUi.carryOver', { n: nextDuration - timer.config.base }), 'good');
    else if (expired) pop(i18n.t('combatUi.timeUp'), 'bad');
  });

  // ── ¿Hay reloj en este combate?
  const timerAllowed = () => {
    const cfg = game.activeBattleConfig || {};
    return timer.enabled && game.gameState === 'BATTLE' && !cfg.isTutorial && !cfg.isTestArena && !game.tutorialManager?.isActive;
  };

  // ── Acciones del jugador: moverse o lanzar una carta
  let casting = 0;
  if (sm && typeof sm.castSpell === 'function') {
    const origCast = sm.castSpell.bind(sm);
    sm.castSpell = async (caster, ...rest) => {
      if (timer.running && caster === timer.unit) timer.markActed();
      casting++;
      try { return await origCast(caster, ...rest); } finally { casting--; }
    };
  }
  let pmAtStart = null;

  // ── Cambio de turno: cerrar el anterior y empezar el del jugador
  if (tm) {
    const origStart = tm.startCombat.bind(tm);
    tm.startCombat = (...a) => { timer.resetCombat(); if (el) el.hidden = true; return origStart(...a); };
    const origChange = tm.onTurnChange;
    tm.onTurnChange = (unit, queue, round, meta = {}) => {
      if (timer.running) timer.finish();
      const r = origChange ? origChange(unit, queue, round, meta) : undefined;
      if (unit && unit.team === 'player' && !meta.skipped && timerAllowed()) {
        pmAtStart = unit.currentPM;
        timer.start(unit);
      } else if (el) {
        el.hidden = true;
      }
      return r;
    };
  }

  // ── Reloj: tiempo real (performance.now). Sigue corriendo con la pestaña en segundo plano: lo mueve un
  // intervalo (el navegador no lo detiene, solo lo espacia) y al volver a la pestaña se pone al día al momento.
  let last = performance.now();
  const step = () => {
    const now = performance.now();
    const dt = Math.max(0, (now - last) / 1000);
    last = now;
    if (!timer.running) return;
    const u = timer.unit;
    const over = !tm || tm.isCombatOver || game.gameState !== 'BATTLE' || !u || u.isDead || tm.getActiveUnit() !== u;
    if (over) {
      timer.stop();
      if (el) el.hidden = true;
      return;
    }
    if (tm.turnEnding || tm.isSkippingTurn) return;
    if (u.isMoving || (pmAtStart != null && u.currentPM < pmAtStart)) timer.markActed();
    const busy = Boolean(u.isMoving || casting > 0);
    if (timer.tick(dt, { busy })) {
      try { game._clearSpellSelection?.(); game._hideForecast?.(); } catch { /* la UI nunca corta el turno */ }
      tm.endCurrentTurn();
    }
    if (!document.hidden) paint();
  };
  setInterval(step, 100);
  document.addEventListener?.('visibilitychange', () => { step(); if (timer.running) paint(); });
  // Barra suave mientras la pestaña está visible
  const frame = () => { if (timer.running && !document.hidden) paint(); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);

  return timer;
}
