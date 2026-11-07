// ResolutionScale.js — Resolución a la que se dibuja el juego (Hito 143).
//
// Densidad de píxeles = tope de pantalla (DPR, como mucho 1,5) × escala del jugador (Opciones › Escala de resolución)
//                       × escala automática (0,8–1, solo con «Resolución dinámica» activada).
//
// · Única fuente: renderer.setPixelRatio, renderer.setSize y cada EffectComposer registrado (addComposer). Antes,
//   Opciones solo cambiaba el renderer: el posprocesado seguía dibujando la escena a la resolución completa y luego la
//   copiaba reducida (no ahorraba GPU y además emborronaba).
// · Escala automática (frame): ventanas de 1,5 s en el mundo y en combate (con la pestaña visible). Baja un 10 % si los
//   fotogramas tardan más de 18 ms de media Y la GPU es la que va justa (tiempo de GPU del dibujo > 12,5 ms y bastante
//   mayor que la CPU del dibujo); sube un 10 % cuando la GPU va holgada (< 8,5 ms) tres ventanas seguidas. Sin
//   medición de GPU (Firefox, Safari): baja con fotogramas lentos y prueba a subir tras ~10 s buenos; si al subir vuelve
//   a ir lento, espera el doble antes de volver a probar. Entre dos cambios pasan al menos 3 s (cada cambio rehace los
//   búferes de dibujo). Nunca baja de 0,8 ni sube por encima de lo que eligió el jugador.
// Consola: lkResolution.status()

import { gpuTimer } from './GpuTimer.js';

const MAX_DPR = 1.5;      // mismo tope que SceneManager
const MIN_AUTO = 0.8;
const STEP = 0.1;
const WIN_MS = 1500;
const COOLDOWN_MS = 3000;
const SLOW_MS = 18;       // media de un fotograma por encima de esto: no llega a ~55 fps
const GPU_HIGH = 12.5;
const GPU_LOW = 8.5;

const pct = (arr, p) => { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

class ResolutionScaleImpl {
  constructor() {
    this.renderer = null;
    this.composers = new Set();
    this.user = 1;
    this.auto = 1;
    this.autoEnabled = true;
    this.applied = 0;
    this._win = null;
    this._offGpu = null;
    this._lastChange = 0;
    this._slowWins = 0;
    this._goodWins = 0;
    this._upWait = 7;          // ventanas buenas antes de probar a subir sin medición de GPU (~10 s)
    this._probeUntil = 0;
    this.log = [];
  }

  attach(renderer) {
    if (!renderer || this.renderer === renderer) return;
    this.renderer = renderer;
    gpuTimer.attach(renderer);
    this._syncGpu();
    this.apply(true);
  }

  /** Registra un EffectComposer que dibuja con este renderer (se le aplica la misma densidad de píxeles). */
  addComposer(c) {
    if (!c) return;
    this.composers.add(c);
    if (this.applied && typeof c.setPixelRatio === 'function' && c._pixelRatio !== this.applied) c.setPixelRatio(this.applied);
  }

  removeComposer(c) { this.composers.delete(c); }

  /** Escala elegida por el jugador, en % (Opciones). */
  setUser(pct100) {
    const v = Math.max(0.3, Math.min(1, (Number(pct100) || 100) / 100));
    if (v === this.user) return;
    this.user = v;
    this.apply();
  }

  setAutoEnabled(on) {
    on = on !== false;
    if (on === this.autoEnabled) return;
    this.autoEnabled = on;
    if (!on) { this.auto = 1; this._win = null; this._slowWins = this._goodWins = 0; }
    this._syncGpu();
    this.apply();
  }

  pixelRatio() {
    return Math.min(window.devicePixelRatio || 1, MAX_DPR) * this.user * this.auto;
  }

  apply(force = false) {
    const r = this.renderer;
    if (!r) return;
    const pr = Math.round(this.pixelRatio() * 1000) / 1000;
    if (!force && Math.abs(pr - this.applied) < 1e-4) return;
    this.applied = pr;
    r.setPixelRatio(pr);
    r.setSize(window.innerWidth, window.innerHeight);
    this.composers.forEach((c) => { try { if (typeof c.setPixelRatio === 'function') c.setPixelRatio(pr); } catch (_) { /* nada */ } });
  }

  _syncGpu() {
    if (this.autoEnabled && !this._offGpu) this._offGpu = gpuTimer.onSample((ms) => { if (this._win) this._win.gpu.push(ms); });
    else if (!this.autoEnabled && this._offGpu) { this._offGpu(); this._offGpu = null; }
  }

  /**
   * Una vez por fotograma, desde el bucle del juego. dtMs: tiempo desde el fotograma anterior · active: mundo o combate
   * a la vista (sin carga, cinemática ni pestaña oculta) · cpuDrawMs: CPU que tardó el dibujo de este fotograma.
   */
  frame(dtMs, active, cpuDrawMs) {
    if (!this.autoEnabled || !this.renderer) return;
    if (!active || document.hidden) { this._win = null; this._slowWins = this._goodWins = 0; return; }
    const t = performance.now();
    const w = this._win || (this._win = { t0: t, dts: [], gpu: [], cpu: [] });
    if (dtMs > 0 && dtMs < 100) { w.dts.push(dtMs); w.cpu.push(cpuDrawMs || 0); } // un tirón suelto (carga, GC) no cuenta
    if (t - w.t0 < WIN_MS) return;
    this._win = null;
    if (w.dts.length < 20) return;

    const mean = w.dts.reduce((a, b) => a + b, 0) / w.dts.length;
    const slow = mean > SLOW_MS;
    const timer = gpuTimer.available && w.gpu.length >= 10;
    const gpu75 = timer ? pct(w.gpu, 0.75) : null;
    const cpu75 = pct(w.cpu, 0.75) || 0;
    const gpuBound = timer ? (gpu75 > GPU_HIGH && gpu75 > cpu75 * 1.25) : true;
    const roomy = timer ? gpu75 < GPU_LOW : !slow;
    if (slow && gpuBound) { this._slowWins++; this._goodWins = 0; }
    else if (!slow && roomy) { this._goodWins++; this._slowWins = 0; }
    else { this._slowWins = 0; this._goodWins = 0; }
    this._last = { mediaMs: Math.round(mean * 10) / 10, gpuP75: gpu75 == null ? null : Math.round(gpu75 * 10) / 10, cpuDibujoP75: Math.round(cpu75 * 10) / 10 };

    if (t - this._lastChange < COOLDOWN_MS) return;
    if (this._slowWins >= 2 && this.auto > MIN_AUTO + 1e-3) {
      if (!timer && t < this._probeUntil) this._upWait = Math.min(40, this._upWait * 2); // subir no funcionó: esperar más
      this._change(Math.max(MIN_AUTO, this.auto - STEP), 'baja', t);
    } else if (this.auto < 1 - 1e-3 && this._goodWins >= (timer ? 3 : this._upWait)) {
      if (!timer) this._probeUntil = t + 6000;
      this._change(Math.min(1, this.auto + STEP), 'sube', t);
    }
  }

  _change(v, why, t) {
    this.auto = Math.round(v * 10) / 10;
    this._lastChange = t;
    this._slowWins = this._goodWins = 0;
    this.apply();
    this.log.push({ s: Math.round(t / 100) / 10, escala: this.auto, cambio: why, ...this._last });
    if (this.log.length > 40) this.log.shift();
  }

  status() {
    const r = this.renderer;
    return {
      dinamica: this.autoEnabled, escalaJugador: this.user, escalaAuto: this.auto, densidadPixeles: this.applied,
      lienzo: r ? `${r.domElement.width}×${r.domElement.height}` : null, medicionGPU: gpuTimer.available,
      ultimaVentana: this._last || null, cambios: this.log.slice(-10),
    };
  }
}

export const resolutionScale = new ResolutionScaleImpl();
if (typeof window !== 'undefined') window.lkResolution = resolutionScale;
