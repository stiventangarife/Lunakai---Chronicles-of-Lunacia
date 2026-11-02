// SkillSfxBank.js — Sonidos de las habilidades (fase 3 del plan de audio de skills).
//
// Lee assets/sounds/sfx/skills/manifest.json (lo genera tools/audio/build_skill_sfx.py) y carga los MP3 por clave lógica
// («beast_bite_attack»), resolviendo los alias del manifiesto (varias claves → un archivo).
// Rendimiento:
//   · el manifiesto se pide una sola vez; si falta, todo sigue sintetizado sin más peticiones (sin 404 en la consola);
//   · nada se carga hasta que se pide: prepare(claves) al empezar el combate (detrás del velo) y load() perezoso si
//     falta algo; como mucho MAX_PARALLEL descargas a la vez para no competir con texturas y modelos;
//   · decodeAudioData decodifica fuera del hilo principal; lo único que se hace aquí es buscar el pico del golpe una vez
//     por archivo (para alinear los cuerpo a cuerpo con el impacto del VFX);
//   · tope de memoria: MAX_MB de búferes decodificados; se sueltan los menos usados que no estén en el combate en curso.
// Consola: lunakaiCombatSfx.skills.status()

import { v as withVersion } from '../render/AssetVersion.js'; // Hito 109: versión en la ruta
const DIR = './assets/sounds/sfx/skills/';
const MAX_PARALLEL = 4;
const MAX_MB = 32;            // ~ 3 Axies con sus cartas + estados + Ultimate caben de sobra (~12–20 MB)

export class SkillSfxBank {
  constructor(audio) {
    this.audio = audio;
    this.manifest = null;           // null: sin pedir · false: no hay · objeto: listo
    this._mPromise = null;
    this.entries = new Map();       // clave canónica → { state: 'loading'|'ok'|'missing', buf, peak, used, p }
    this._queue = [];
    this._active = 0;
    this._pinned = new Set();       // claves del combate actual (no se sueltan)
    this._tick = 0;
  }

  get ctx() { return this.audio?.ctx || null; }

  /** Pide el manifiesto (una vez). */
  loadManifest() {
    if (this._mPromise) return this._mPromise;
    if (typeof fetch !== 'function') { this.manifest = false; return (this._mPromise = Promise.resolve(false)); }
    this._mPromise = fetch(DIR + 'manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { this.manifest = m && m.sounds ? m : false; return this.manifest; })
      .catch(() => { this.manifest = false; return false; });
    return this._mPromise;
  }

  /** Clave canónica (con alias resuelto) o null si el manifiesto no la tiene. */
  key(k) {
    const m = this.manifest;
    if (!m || !k) return null;
    const c = m.aliases?.[k] || k;
    return m.sounds[c] ? c : null;
  }

  /** ¿Está decodificada y lista para sonar ya? */
  ready(k) {
    const c = this.key(k);
    const e = c && this.entries.get(c);
    return Boolean(e && e.state === 'ok');
  }

  /** Pico del golpe (s desde el principio del archivo). */
  peakOf(k) { const e = this.entries.get(this.key(k)); return e?.peak || 0; }

  /** Carga (si hace falta) estas claves. Devuelve una promesa que se cumple cuando terminan (bien o mal). */
  load(keys) {
    return this.loadManifest().then((m) => {
      if (!m) return 0;
      const ps = [];
      for (const k of new Set((keys || []).filter(Boolean))) {
        const c = this.key(k);
        if (!c) continue;
        let e = this.entries.get(c);
        if (!e) {
          e = { state: 'loading', buf: null, peak: 0, used: 0, p: null };
          this.entries.set(c, e);
          e.p = new Promise((res) => this._queue.push({ c, e, res }));
          this._pump();
        }
        ps.push(e.p);
      }
      return Promise.all(ps).then(() => ps.length);
    });
  }

  /** Claves del combate que empieza: se cargan y no se sueltan mientras dure. */
  prepare(keys) {
    this._pinned = new Set((keys || []).map((k) => this.key(k) || k));
    return this.load(keys);
  }

  _pump() {
    while (this._active < MAX_PARALLEL && this._queue.length) {
      const job = this._queue.shift();
      this._active++;
      this._fetch(job).finally(() => { this._active--; job.res(); this._pump(); });
    }
  }

  async _fetch({ c, e }) {
    try {
      const file = this.manifest.sounds[c].file;
      const r = await fetch(withVersion(DIR + file)); // Hito 109: versión en la ruta
      if (!r.ok) throw new Error(r.status);
      const ab = await r.arrayBuffer();
      const ctx = await this._waitCtx();
      e.buf = await ctx.decodeAudioData(ab);
      e.peak = peakTime(e.buf);   // arranque del golpe
      e.state = 'ok';
      this._trim();
    } catch {
      e.state = 'missing';
    }
  }

  /** El contexto de audio solo existe tras el primer clic: si aún no está, espera sin bloquear nada. */
  _waitCtx() {
    if (this.ctx) return Promise.resolve(this.ctx);
    return new Promise((res) => {
      const t = setInterval(() => { if (this.ctx) { clearInterval(t); res(this.ctx); } }, 250);
    });
  }

  _trim() {
    const size = (e) => e.buf.length * e.buf.numberOfChannels * 4;
    const ok = [...this.entries].filter(([, e]) => e.state === 'ok');
    let total = ok.reduce((s, [, e]) => s + size(e), 0);
    if (total <= MAX_MB * 1e6) return;
    for (const [c, e] of ok.filter(([k]) => !this._pinned.has(k)).sort((a, b) => a[1].used - b[1].used)) {
      if (total <= MAX_MB * 1e6) break;
      total -= size(e);
      this.entries.delete(c);
    }
  }

  /**
   * Toca una clave. o = { when (s del contexto), offset (s dentro del archivo), vol, rate, jitter, dest }.
   * Devuelve { src, gain } (para cortar el sonido de vuelo) o null si no está lista.
   */
  play(k, o = {}) {
    const ctx = this.ctx, c = this.key(k), e = c && this.entries.get(c);
    if (!ctx || !e || e.state !== 'ok') return null;
    e.used = ++this._tick;
    const src = ctx.createBufferSource();
    src.buffer = e.buf;
    const j = o.jitter ?? 0.03;
    src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * j);
    const g = ctx.createGain();
    g.gain.value = o.vol ?? 1;
    src.connect(g);
    g.connect(o.dest || this.audio.masterGain);
    const when = Math.max(ctx.currentTime, o.when || 0);
    const off = Math.max(0, Math.min(o.offset || 0, e.buf.duration - 0.01));
    src.start(when, off);
    src.onended = () => { try { g.disconnect(); } catch { /* ya desconectado */ } };
    return { src, gain: g, when };
  }

  /** Corta un sonido devuelto por play() con un fundido corto (sin clic). */
  fadeOut(h, at = null, dur = 0.06) {
    const ctx = this.ctx;
    if (!h || !ctx) return;
    const t = Math.max(ctx.currentTime, at ?? ctx.currentTime);
    try {
      h.gain.gain.cancelScheduledValues(t);
      h.gain.gain.setValueAtTime(h.gain.gain.value, t);
      h.gain.gain.linearRampToValueAtTime(0.0001, t + dur);
      h.src.stop(t + dur + 0.02);
    } catch { /* ya terminó */ }
  }

  status() {
    const list = [...this.entries];
    const ok = list.filter(([, e]) => e.state === 'ok');
    const bytes = ok.reduce((s, [, e]) => s + e.buf.length * e.buf.numberOfChannels * 4, 0);
    return {
      manifiesto: this.manifest === null ? 'sin pedir' : this.manifest ? `${Object.keys(this.manifest.sounds).length} sonidos` : 'no encontrado (todo sintetizado)',
      cargados: ok.length, cargando: list.filter(([, e]) => e.state === 'loading').length,
      fallidos: list.filter(([, e]) => e.state === 'missing').map(([c]) => c),
      memoriaMB: +(bytes / 1e6).toFixed(1), delCombate: this._pinned.size,
    };
  }
}

/**
 * Momento del golpe: el primer instante en que la envolvente (ventanas de 5 ms) pasa del 50 % de su máximo, dentro del
 * primer 1,5 s. En estos archivos el golpe es un tramo denso con varios picos; su arranque es lo que el oído toma como
 * «el impacto» (el pico absoluto puede caer 100–200 ms más tarde, en la cola del mordisco o del tajo).
 */
function peakTime(buf) {
  const d = buf.getChannelData(0), sr = buf.sampleRate;
  const hop = Math.max(1, Math.round(sr * 0.005)), end = Math.min(d.length, Math.round(sr * 1.5));
  const env = [];
  let max = 0;
  for (let i = 0; i < end; i += hop) {
    let s = 0;
    const n = Math.min(end, i + hop);
    for (let j = i; j < n; j++) s += d[j] * d[j];
    env.push(s);
    if (s > max) max = s;
  }
  const th = max * 0.25;              // 50 % en amplitud = 25 % en energía
  const k = env.findIndex((v) => v >= th);
  return Math.max(0, k) * hop / sr;
}
