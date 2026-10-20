// TurnTimer.js — Tiempo por turno del jugador en combate (reglas, sin DOM).
//
// Reglas:
//   · Cada turno de una unidad del jugador empieza con el tiempo de la «reserva» (30 s al empezar el combate).
//   · Si el jugador termina antes, lo que le sobra se suma a los 30 s del siguiente turno, hasta un máximo de 45 s:
//       siguiente = min(45, 30 + sobrante).   Si se le acaba el tiempo, el siguiente vuelve a 30 s.
//   · Castigo: si a los 10 s del turno todavía no ha hecho nada (moverse o lanzar una carta), pierde 10 s (una vez por turno).
//   · Al llegar a 0 el turno pasa solo (si hay una animación en curso, se espera a que termine).
// La reserva es del jugador, compartida por todas sus unidades. Los turnos enemigos y los turnos perdidos (aturdido,
// dormido) no tienen tiempo. Quien lo use (TurnTimerHUD) llama a start/tick/finish y escucha los eventos.
//
// Eventos (on(nombre, fn)): 'start' {unit, duration} · 'tick' {remaining, duration} · 'penalty' {amount, remaining}
//                           'expire' {unit} · 'finish' {unit, leftover, nextDuration, expired}

export const TURN_TIMER_DEFAULTS = { base: 30, max: 45, idleLimit: 10, idlePenalty: 10 };

export class TurnTimer {
  constructor(config = {}) {
    this.config = { ...TURN_TIMER_DEFAULTS, ...config };
    this.enabled = true;
    this._handlers = {};
    this.resetCombat();
  }

  on(evt, fn) { (this._handlers[evt] ||= []).push(fn); return () => { this._handlers[evt] = this._handlers[evt].filter((f) => f !== fn); }; }
  _emit(evt, payload) { for (const fn of this._handlers[evt] || []) { try { fn(payload); } catch (e) { console.warn('[TurnTimer]', evt, e); } } }

  /** Al empezar un combate: la reserva vuelve al tiempo base. */
  resetCombat() {
    this.bank = this.config.base;
    this.stop();
  }

  /** Empieza el turno de una unidad del jugador con el tiempo de la reserva. */
  start(unit) {
    this.unit = unit;
    this.duration = this.bank;
    this.remaining = this.duration;
    this.elapsed = 0;
    this.acted = false;
    this.penalized = false;
    this.expired = false;
    this.running = true;
    this._emit('start', { unit, duration: this.duration });
  }

  /** El jugador ha actuado (se movió o lanzó una carta): ya no hay castigo por inactividad este turno. */
  markActed() { if (this.running) this.acted = true; }

  /**
   * Avanza el reloj dt segundos. busy = hay una animación en curso (no se corta el turno a mitad).
   * Devuelve true si el tiempo se ha agotado y el turno debe pasar ahora.
   */
  tick(dt, { busy = false } = {}) {
    if (!this.running || !this.enabled || this.expired) return false;
    this.elapsed += dt;
    this.remaining = Math.max(0, this.remaining - dt);
    if (!this.acted && !this.penalized && this.elapsed >= this.config.idleLimit) {
      this.penalized = true;
      this.remaining = Math.max(0, this.remaining - this.config.idlePenalty);
      this._emit('penalty', { amount: this.config.idlePenalty, remaining: this.remaining });
    }
    this._emit('tick', { remaining: this.remaining, duration: this.duration });
    if (this.remaining <= 0 && !busy) {
      this.expired = true;
      this._emit('expire', { unit: this.unit });
      return true;
    }
    return false;
  }

  /** Fin del turno (lo pase el jugador o el reloj): calcula la reserva del siguiente turno. */
  finish() {
    if (!this.running) return null;
    const leftover = this.expired ? 0 : Math.max(0, this.remaining);
    this.bank = Math.min(this.config.max, this.config.base + Math.round(leftover));
    const out = { unit: this.unit, leftover: Math.round(leftover), nextDuration: this.bank, expired: this.expired };
    this.stop();
    this._emit('finish', out);
    return out;
  }

  stop() {
    this.running = false;
    this.unit = null;
  }
}
