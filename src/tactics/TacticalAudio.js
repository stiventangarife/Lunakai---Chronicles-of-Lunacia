// TacticalAudio.js - Procedural Web Audio Synthesizer for Axie Tactics with Integrated MusicManager
import { MusicManager } from '../audio/MusicManager.js';
import { AmbienceManager } from '../audio/AmbienceManager.js';
import { WorldSfx } from '../audio/WorldSfx.js';
import { CombatSfx } from '../audio/CombatSfx.js';

export class TacticalAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.initialized = false;
    this.music = new MusicManager();
    // Hito 86: bus de ambiente (volumen «Ambiente» de Opciones), independiente del de efectos
    this.ambGain = null;
    this._ambVol = 0.6;
    // Hito 91 (mezcla): el bus de efectos tenía una base de 0,25 y los efectos quedaban ~20 dB por debajo de la música
    // (los golpes del combate casi no se oían). Base nueva 0,6 (+7,6 dB) con un compresor suave para que muchos
    // sonidos juntos no saturen. _sfxVol = General × Efectos (Opciones).
    this.SFX_BASE = 0.6;
    this._sfxVol = 0.8;
    this.sfxComp = null;
    this.ambience = new AmbienceManager(this);
    // Hito 87: pasos por suelo, voz de pitidos, criaturas y recolección (grabaciones opcionales con síntesis de respaldo)
    this.world = new WorldSfx(this);
    // Hito 88: combate por clase y peso del golpe (lo instala SpellPresentation en el bus de eventos)
    this.combat = new CombatSfx(this);
  }

  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this._sfxVol * this.SFX_BASE, this.ctx.currentTime);
    // Compresor suave del bus de efectos (solo actúa en los picos: varios golpes y efectos a la vez)
    this.sfxComp = this.ctx.createDynamicsCompressor();
    this.sfxComp.threshold.value = -14; this.sfxComp.knee.value = 8; this.sfxComp.ratio.value = 4;
    this.sfxComp.attack.value = 0.004; this.sfxComp.release.value = 0.18;
    this.masterGain.connect(this.sfxComp);
    this.sfxComp.connect(this.ctx.destination);
    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.setValueAtTime(this.isMuted ? 0 : this._ambVol, this.ctx.currentTime);
    this.ambGain.connect(this.ctx.destination);
    this.initialized = true;
    this.ambience.start();
  }

  /** Hito 91: volumen del bus de efectos (0–1, ya multiplicado por el general). Lo llama SettingsModal. */
  setSfxVolume(v) {
    this._sfxVol = Math.max(0, Math.min(1, Number(v) || 0));
    if (this.masterGain && this.ctx && !this.isMuted) this.masterGain.gain.setTargetAtTime(this._sfxVol * this.SFX_BASE, this.ctx.currentTime, 0.03);
  }

  /** Volumen del bus de ambiente (0–1, ya multiplicado por el general). Lo llama SettingsModal. */
  setAmbientVolume(v) {
    this._ambVol = Math.max(0, Math.min(1, Number(v) || 0));
    if (this.ambGain && this.ctx && !this.isMuted) this.ambGain.gain.setTargetAtTime(this._ambVol, this.ctx.currentTime, 0.08);
  }

  playMusic(trackKey, options) {
    if (this.music) this.music.playTrack(trackKey, options);
  }

  playBiomeMusic(biomeName) {
    if (this.music) this.music.playBiome(biomeName);
  }

  playCinematicMusic() {
    if (this.music) this.music.playCinematic();
  }

  playBattleMusic(isFinalBoss = false) {
    if (this.music) this.music.playBattle(isFinalBoss);
  }

  playVictoryMusic() {
    if (this.music) this.music.playVictory();
  }

  playDefeatMusic() {
    if (this.music) this.music.playDefeat();
  }

  stopMusic(fadeDuration = 800) {
    if (this.music) this.music.stop(fadeDuration);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this._sfxVol * this.SFX_BASE, this.ctx.currentTime);
    }
    if (this.ambGain && this.ctx) this.ambGain.gain.setTargetAtTime(this.isMuted ? 0 : this._ambVol, this.ctx.currentTime, 0.05);
    if (this.music) {
      this.music.setMuted(this.isMuted);
    }
    return this.isMuted;
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this._sfxVol * this.SFX_BASE, this.ctx.currentTime);
    }
    if (this.ambGain && this.ctx) this.ambGain.gain.setTargetAtTime(this.isMuted ? 0 : this._ambVol, this.ctx.currentTime, 0.05);
    if (this.music) {
      this.music.setMuted(this.isMuted);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ── Hito 86: sonidos de interfaz que el juego ya llamaba y no existían ─────────────────────────
  // (playClick en Opciones, playSelect/playConfirm en el inicio y la creación, playImpact en la transición a
  // combate, playSfx en el telón de carga). Sintetizados: sin archivos.

  /** Nota con envolvente: tipo de onda, frecuencia inicial → final, duración, volumen y retardo. */
  _tone(type, f0, f1, dur, vol, delay = 0, filter = 0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (filter) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; osc.connect(f); node = f; }
    node.connect(g); g.connect(this.masterGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  /** Campanita: fundamental + parciales inarmónicos con caída exponencial. */
  _bell(freq, dur, vol, delay = 0) {
    this._tone('sine', freq, freq, dur, vol, delay);
    this._tone('sine', freq * 2.76, freq * 2.76, dur * 0.55, vol * 0.35, delay);
    this._tone('sine', freq * 5.4, freq * 5.4, dur * 0.3, vol * 0.12, delay);
  }

  /** Clic suave de botón o pestaña (madera clara). */
  playClick() {
    this._tone('triangle', 1900, 1200, 0.045, 0.07);
    this._tone('sine', 420, 300, 0.05, 0.05);
  }

  /** Elegir una opción: dos notas que suben. */
  playSelect() {
    this._tone('triangle', 660, 660, 0.07, 0.08);
    this._tone('triangle', 990, 990, 0.09, 0.08, 0.055);
  }

  /** Confirmar: acorde de campanitas (mi–sol#–si). */
  playConfirm() {
    this._bell(659.25, 0.45, 0.07);
    this._bell(830.61, 0.45, 0.06, 0.05);
    this._bell(987.77, 0.6, 0.06, 0.1);
  }

  /** Golpe de la transición a combate: barrido de aire + golpe grave. */
  playImpact() {
    if (!this.initialized || this.isMuted) return;
    this._playNoise(0.35, 0.18, 2200);
    this._tone('sine', 120, 38, 0.55, 0.42, 0.05);
    this._tone('triangle', 240, 60, 0.25, 0.18, 0.05);
  }

  /** Sonidos por nombre (telón de carga y futuros usos). Un nombre desconocido suena como un clic. */
  playSfx(name) {
    switch (name) {
      case 'menu_confirm': return this.playConfirm();
      case 'menu_select': return this.playSelect();
      case 'menu_open': this._tone('sine', 520, 780, 0.12, 0.06); return this._tone('triangle', 780, 1040, 0.1, 0.04, 0.04);
      case 'menu_close': this._tone('sine', 780, 520, 0.12, 0.06); return this._tone('triangle', 520, 390, 0.1, 0.04, 0.04);
      case 'error': this._tone('square', 220, 200, 0.09, 0.05, 0, 1400); return this._tone('square', 196, 180, 0.12, 0.05, 0.1, 1400);
      case 'coin': this._bell(1568, 0.25, 0.06); return this._bell(2093, 0.3, 0.05, 0.07);
      case 'impact': return this.playImpact();
      default: return this.playClick();
    }
  }

  playHover() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.04);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playTileSelect() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playStep() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /** Paso en agua poco profunda (Hito 66): chapoteo de ruido filtrado, más grave cuanto más honda (depth01 0–1). */
  playWaterStep(depth01 = 0.5) {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    if (!this._splashBuf) {
      const len = Math.floor(this.ctx.sampleRate * 0.22);
      this._splashBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._splashBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this._splashBuf;
    src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1500 - depth01 * 600, t);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.18);
    bp.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16 + depth01 * 0.08, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(bp); bp.connect(gain); gain.connect(this.masterGain);
    src.start(t);
    src.stop(t + 0.22);
  }

  playAttackMelee() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Whoosh + impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);

    // Noise crack
    this._playNoise(0.12, 0.2, 800);
  }

  playHit() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playShootBow() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.12);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  playExplosion() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.45);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);

    this._playNoise(0.35, 0.3, 400);
  }

  playHeal() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const start = t + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  }

  playPushback() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Gust of air
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.22);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCollision() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Deep heavy wall impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.28);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.32);

    this._playNoise(0.2, 0.25, 300);
  }

  playBuff() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.25);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  playTurnStart(isPlayer = true) {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const baseFreq = isPlayer ? 880 : 350;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.25);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  playVictory() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const start = t + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  playDefeat() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = [440, 415.3, 392, 349.2];
    notes.forEach((freq, idx) => {
      const start = t + idx * 0.18;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  playHitStopBass() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    
    // Deep Sub-Bass Impact Boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(24, t + 0.35);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.4);

    // Initial heavy shock thump
    this._playNoise(0.18, 0.35, 300);
  }

  playDisintegrationBurst() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Ascending magical shimmer
    const chords = [523.25, 659.25, 783.99, 1046.5];
    chords.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + i * 0.08 + 0.6);
      gain.gain.setValueAtTime(0.15, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.7);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.7);
    });

    // Dissolving air whoosh
    this._playNoise(0.6, 0.25, 1200);
  }

  playVictoryFanfare() {
    if (!this.initialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Triumphant orchestral brass fanfare (C-E-G-C-E-G progression)
    const notes = [
      { f: 523.25, d: 0.18, time: 0 },       // C5
      { f: 659.25, d: 0.18, time: 0.15 },    // E5
      { f: 783.99, d: 0.22, time: 0.30 },    // G5
      { f: 1046.50, d: 0.55, time: 0.48 },   // C6 (Climax sustained)
      { f: 1318.51, d: 0.85, time: 0.75 }    // E6 (Final resolve)
    ];

    notes.forEach(n => {
      const start = t + n.time;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, start);

      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

      // Warm low-pass filter to sound like rich brass
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, start);
      filter.frequency.exponentialRampToValueAtTime(800, start + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + n.d);
    });
  }

  _playNoise(duration, volume, filterFreq) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }
}
