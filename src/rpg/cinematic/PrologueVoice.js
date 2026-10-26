// PrologueVoice.js — Voces del narrador en la cinemática del prólogo (Hito 68).
//
// · Archivos: assets/voice/<idioma>/prologue_0N_<nombre>.mp3 (idioma = el configurado). Si un idioma no tiene
//   voces (o falta un archivo), esa línea se queda solo con su subtítulo, como antes.
// · Cada línea suena en su segundo de la cinemática (CUES); si se salta o se busca otro segundo, se ajusta.
// · Volumen igualado en el juego: cada toma se lleva a la misma sonoridad (RMS de las partes con voz, ≈ −18 LUFS),
//   sin tocar los archivos.
// · Mientras habla el narrador la música baja ≈ −10 dB (con rampas suaves) y vuelve al callar.
import * as i18n from '../../i18n/i18n.js';

/** Segundo de la cinemática (desde 0:00) en que empieza cada línea; coincide con la entrada de su subtítulo. */
export const VOICE_CUES = [
  { file: 'prologue_01_stars', at: 0.5 },
  { file: 'prologue_02_moon', at: 10.5 },
  { file: 'prologue_03_frieze', at: 19.5 },
  { file: 'prologue_04_chimeras', at: 30.5 },
  { file: 'prologue_05_crack', at: 39.5 },
  { file: 'prologue_06_resist', at: 47.5 },
  { file: 'prologue_07_shadow', at: 55.3 },
  { file: 'prologue_08_light', at: 60.3 },
  { file: 'prologue_09_resonate', at: 64.2, noDuck: true }, // el grito va con la música a tope (clímax)
];

const TARGET_RMS = 0.17;   // ≈ −18 LUFS para voz hablada (calibrado con las tomas en español)
const DUCK = 0.32;         // −10 dB de música bajo la voz
const DUCK_IN = 0.25, DUCK_OUT = 0.6; // segundos de rampa

export class PrologueVoice {
  constructor(audio) {
    this.audio = audio;           // TacticalAudio (ctx + masterGain) y audio.music (MusicManager)
    this.ctx = null;
    this.out = null;
    this.buffers = new Map();     // file → { buffer, gain }
    this.playing = new Map();     // file → { src, end }
    this.done = new Set();
    this.duck = 1;
    this.lang = i18n.lang();
  }

  /** Carga y decodifica las voces del idioma activo (las que existan). */
  async load() {
    const a = this.audio;
    try { if (a && !a.ctx && typeof a.init === 'function') a.init(); } catch { /* sin audio */ }
    this.ctx = a?.ctx || (typeof AudioContext !== 'undefined' ? new AudioContext() : null);
    if (!this.ctx) return;
    // La voz no pasa por el volumen de efectos (suele estar bajo): sigue el volumen de la música, que es lo que
    // acompaña en la cinemática. Con la música silenciada se oye a 0,75 salvo que los efectos también lo estén.
    this.out = this.ctx.createGain();
    const mm = a?.music;
    this.out.gain.value = mm ? (mm.isMuted ? (a?.isMuted ? 0 : 0.75) : mm.masterVolume) : 0.75;
    this.out.connect(this.ctx.destination);
    await Promise.all(VOICE_CUES.map(async ({ file }) => {
      try {
        const res = await fetch(`./assets/voice/${this.lang}/${file}.mp3`);
        if (!res.ok) return;
        const buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(file, { buffer, gain: PrologueVoice.levelGain(buffer) });
      } catch { /* esa línea queda sin voz */ }
    }));
    if (this.buffers.size) console.log(`[Cinemática] Voces (${this.lang}): ${this.buffers.size}/${VOICE_CUES.length}`);
  }

  /** Ganancia para llevar la toma a TARGET_RMS (solo cuenta las partes con voz, no los silencios). */
  static levelGain(buffer) {
    const d = buffer.getChannelData(0);
    let sum = 0, n = 0;
    const step = Math.max(1, Math.floor(buffer.sampleRate / 8000));
    for (let i = 0; i < d.length; i += step) { const v = Math.abs(d[i]); if (v > 0.02) { sum += v * v; n++; } }
    if (!n) return 1;
    return Math.min(2.5, Math.max(0.4, TARGET_RMS / Math.sqrt(sum / n)));
  }

  get hasVoices() { return this.buffers.size > 0; }

  /** Llamar cada fotograma con el segundo actual de la cinemática. */
  update(t, dt) {
    if (!this.ctx || !this.hasVoices) return;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    for (const cue of VOICE_CUES) {
      const b = this.buffers.get(cue.file);
      if (!b || this.done.has(cue.file)) continue;
      const end = cue.at + b.buffer.duration;
      if (t >= cue.at && t < end - 0.05) this._play(cue.file, b, t - cue.at, !cue.noDuck);
    }
    // ¿alguna voz sonando?
    const now = this.ctx.currentTime;
    let speaking = false;
    for (const [f, p] of this.playing) { if (p.end > now) { if (p.duck) speaking = true; } else this.playing.delete(f); }
    const target = speaking ? DUCK : 1;
    const rate = dt / (speaking ? DUCK_IN : DUCK_OUT);
    this.duck += Math.max(-rate, Math.min(rate, target - this.duck));
    this._applyDuck();
  }

  _play(file, b, offset, duck = true) {
    this.done.add(file);
    const src = this.ctx.createBufferSource();
    src.buffer = b.buffer;
    const g = this.ctx.createGain();
    g.gain.value = b.gain;
    src.connect(g); g.connect(this.out);
    const off = Math.max(0, offset);
    src.start(0, off);
    this.playing.set(file, { src, duck, end: this.ctx.currentTime + b.buffer.duration - off });
  }

  /** Tras un salto de tiempo (seek): las líneas posteriores vuelven a estar pendientes y se corta lo que sonaba. */
  reset(t) {
    this.stopAll();
    for (const cue of VOICE_CUES) if (cue.at >= t) this.done.delete(cue.file);
  }

  stopAll() {
    for (const p of this.playing.values()) { try { p.src.stop(); } catch { /* ya parada */ } }
    this.playing.clear();
  }

  /** Música: misma fórmula que MusicManager, por el factor de agachado. No toca nada durante un fundido entre pistas. */
  _applyDuck(force = false) {
    const mm = this.audio?.music;
    const el = mm?.currentAudio;
    if (!el || (mm._fadeInterval && !force)) return;
    const base = mm.isMuted ? 0 : mm.masterVolume * mm.currentVolumeMultiplier;
    el.volume = Math.max(0, Math.min(1, base * this.duck));
  }

  dispose() {
    this.stopAll();
    this.duck = 1;
    this._applyDuck(true);
    try { this.out?.disconnect(); } catch { /* nada */ }
    this.buffers.clear();
  }
}
