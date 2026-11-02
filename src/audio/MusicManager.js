// MusicManager.js - Dynamic Music Orchestrator with Biome Transitions, Crossfades & Autoplay Resilience
import { v as withVersion } from '../render/AssetVersion.js'; // Hito 109: versión en la ruta

export const MUSIC_TRACKS = {
  CINEMATICA: './assets/sounds/CINEMATICA.mp3',
  PROLOGO: './assets/sounds/PROLOGO.mp3', // Hito 68: pieza a medida de la cinemática del prólogo
  FOREST: './assets/sounds/FOREST THEME.mp3',
  SAVANNA: './assets/sounds/SAVANNA THEME.mp3',
  ARCTIC: './assets/sounds/ARCTIC THEME.mp3',
  MYSTIC: './assets/sounds/MYSTIC THEME.mp3',
  MAZMORRA: './assets/sounds/MAZMORRA THEME.mp3',
  BATTLE: './assets/sounds/BATTLE_THEME.mp3',
  BATTLE_BOSS: './assets/sounds/BATTLE_BOSS.mp3',
  VICTORY: './assets/sounds/VICTORY_THEME.mp3',
  DEFEAT: './assets/sounds/DEFEAT_THEME.mp3'
};

/**
 * Hito 91 (mezcla): sonoridad medida de cada pista (LUFS integrados, ffmpeg ebur128) y nivel común al que se igualan.
 * Las pistas venían a niveles muy distintos: el combate (−13,5) y la victoria (−12,2) sonaban 6–8 dB más fuertes que
 * los temas de las islas (−18,6 a −20,9) y tapaban los efectos. Cada pista se baja hasta MUSIC_TARGET_LUFS (nunca se
 * sube: el volumen de un <audio> no pasa de 1). Si se cambia un archivo, volver a medirlo y actualizar su valor.
 */
export const MUSIC_TARGET_LUFS = -20.5;
export const TRACK_LUFS = {
  CINEMATICA: -21.0, PROLOGO: -21.5, FOREST: -18.7, SAVANNA: -18.6, ARCTIC: -20.9, MYSTIC: -20.8, MAZMORRA: -20.1,
  BATTLE: -13.5, BATTLE_BOSS: -15.0, VICTORY: -12.2, DEFEAT: -15.8,
};
export function trackGain(key) {
  const l = TRACK_LUFS[key];
  return Number.isFinite(l) ? Math.min(1, Math.pow(10, (MUSIC_TARGET_LUFS - l) / 20)) : 1;
}

export const BIOME_TO_TRACK = {
  forest: 'FOREST',
  training_dojo: 'FOREST',
  lunacia_plains: 'FOREST',
  savannah: 'SAVANNA',
  canyon_rock: 'SAVANNA',
  arctic: 'ARCTIC',
  frozen_peaks: 'ARCTIC',
  mystic: 'MYSTIC',
  mystic_grove: 'MYSTIC',
  dungeon: 'MAZMORRA',
  boss_arena: 'MAZMORRA'
};

export class MusicManager {
  constructor() {
    this.audioCache = new Map();
    this.currentKey = null;
    this.currentAudio = null;
    this.isMuted = false;
    this.masterVolume = 0.50; // Balanced against SFX
    this.currentVolumeMultiplier = 1.0;
    this.pendingTrack = null;
    this._fadeInterval = null;
    this._userUnlocked = false;

    this._setupAutoplayUnlock();
  }

  _setupAutoplayUnlock() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this._userUnlocked = true;
      if (this.pendingTrack) {
        const { trackKey, options } = this.pendingTrack;
        this.pendingTrack = null;
        this.playTrack(trackKey, options);
      }
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('click', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
    window.addEventListener('click', unlockHandler, { passive: true });
  }

  _getOrCreateAudio(trackKey) {
    if (!MUSIC_TRACKS[trackKey]) {
      console.warn(`[MusicManager] Unknown track key: ${trackKey}`);
      return null;
    }

    if (!this.audioCache.has(trackKey)) {
      const audio = new Audio(withVersion(MUSIC_TRACKS[trackKey]));
      audio.preload = 'auto';
      this.audioCache.set(trackKey, audio);
    }
    return this.audioCache.get(trackKey);
  }

  /**
   * Resolves an overworld biome name/identifier to its corresponding theme track key.
   */
  resolveBiomeTrack(biome) {
    if (!biome) return 'FOREST';
    const b = String(biome).toLowerCase().trim();
    if (BIOME_TO_TRACK[b]) return BIOME_TO_TRACK[b];

    if (b.includes('savann') || b.includes('desert') || b.includes('canyon')) return 'SAVANNA';
    if (b.includes('arctic') || b.includes('frost') || b.includes('ice') || b.includes('snow') || b.includes('glacier')) return 'ARCTIC';
    if (b.includes('mystic') || b.includes('astral') || b.includes('grove')) return 'MYSTIC';
    if (b.includes('dungeon') || b.includes('mazmorra') || b.includes('cripta') || b.includes('crypt') || b.includes('boss_arena')) return 'MAZMORRA';
    return 'FOREST';
  }

  /**
   * Plays a music track with crossfading and volume management.
   */
  playTrack(trackKey, { loop = true, fadeDuration = 1000, volumeMultiplier = 1.0, startAt = null } = {}) {
    if (!MUSIC_TRACKS[trackKey]) return;

    // If already playing this track smoothly, simply update target volume if needed
    volumeMultiplier *= trackGain(trackKey);   // Hito 91: todas las pistas al mismo nivel
    if (this.currentKey === trackKey && this.currentAudio && !this.currentAudio.paused) {
      this.currentVolumeMultiplier = volumeMultiplier;
      const targetVol = this.isMuted ? 0 : this.masterVolume * this.currentVolumeMultiplier;
      this.currentAudio.volume = targetVol;
      return;
    }

    const nextAudio = this._getOrCreateAudio(trackKey);
    if (!nextAudio) return;

    // Clear any previous crossfade ticker
    if (this._fadeInterval) {
      clearInterval(this._fadeInterval);
      this._fadeInterval = null;
    }

    const prevAudio = this.currentAudio;
    const prevKey = this.currentKey;

    this.currentKey = trackKey;
    this.currentAudio = nextAudio;
    this.currentVolumeMultiplier = volumeMultiplier;

    nextAudio.loop = loop;
    // startAt (Hito 48): empezar la pista en un segundo concreto (el clímax de la cinemática)
    if (startAt !== null && startAt !== undefined) {
      try { nextAudio.currentTime = startAt; } catch { /* aún sin metadatos: empieza desde el principio */ }
    }
    const targetVolume = this.isMuted ? 0 : (this.masterVolume * volumeMultiplier);

    // If no fading desired or volume already muted, switch immediately
    if (fadeDuration <= 0) {
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
      nextAudio.volume = targetVolume;
      const playPromise = nextAudio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          this.pendingTrack = { trackKey, options: { loop, fadeDuration, volumeMultiplier } };
        });
      }
      return;
    }

    // Smooth Crossfade setup
    nextAudio.volume = 0;
    const playPromise = nextAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        this.pendingTrack = { trackKey, options: { loop, fadeDuration, volumeMultiplier } };
      });
    }

    const startTime = performance.now();
    const prevStartVol = prevAudio ? prevAudio.volume : 0;

    this._fadeInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / fadeDuration);

      // Fade out previous audio
      if (prevAudio && !prevAudio.paused) {
        prevAudio.volume = Math.max(0, prevStartVol * (1.0 - progress));
        if (progress >= 1.0) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
      }

      // Fade in new audio
      if (nextAudio) {
        const currentTarget = this.isMuted ? 0 : targetVolume;
        nextAudio.volume = Math.min(1.0, currentTarget * progress);
      }

      if (progress >= 1.0) {
        clearInterval(this._fadeInterval);
        this._fadeInterval = null;
        if (nextAudio) {
          nextAudio.volume = this.isMuted ? 0 : targetVolume;
        }
      }
    }, 30);
  }

  /**
   * Plays the cinematic prologue theme.
   */
  playCinematic() {
    this.playTrack('CINEMATICA', { loop: true, fadeDuration: 800, volumeMultiplier: 0.85 });
  }

  /**
   * Plays the music appropriate for the given overworld biome.
   */
  playBiome(biomeName) {
    const trackKey = this.resolveBiomeTrack(biomeName);
    this.playTrack(trackKey, { loop: true, fadeDuration: 1200, volumeMultiplier: 0.80 });
  }

  /**
   * Plays battle music (either normal encounter or final boss battle).
   */
  playBattle(isFinalBoss = false) {
    const trackKey = isFinalBoss ? 'BATTLE_BOSS' : 'BATTLE';
    this.playTrack(trackKey, { loop: true, fadeDuration: 600, volumeMultiplier: 0.90 });
  }

  /**
   * Plays the victory theme upon winning a tactical battle.
   */
  playVictory() {
    this.playTrack('VICTORY', { loop: true, fadeDuration: 400, volumeMultiplier: 0.95 });
  }

  /**
   * Plays the defeat theme upon losing a tactical battle.
   */
  playDefeat() {
    this.playTrack('DEFEAT', { loop: true, fadeDuration: 500, volumeMultiplier: 0.90 });
  }

  /**
   * Smoothly stops all music.
   */
  stop(fadeDuration = 800) {
    if (!this.currentAudio) {
      this.currentKey = null;
      return;
    }

    if (this._fadeInterval) {
      clearInterval(this._fadeInterval);
      this._fadeInterval = null;
    }

    const audio = this.currentAudio;
    this.currentKey = null;
    this.currentAudio = null;

    if (fadeDuration <= 0) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const startVol = audio.volume;
    const startTime = performance.now();

    const fadeOutInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / fadeDuration);
      audio.volume = Math.max(0, startVol * (1.0 - progress));

      if (progress >= 1.0) {
        clearInterval(fadeOutInterval);
        audio.pause();
        audio.currentTime = 0;
      }
    }, 30);
  }

  /**
   * Updates master music volume (0.0 - 1.0).
   */
  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio && !this.isMuted) {
      this.currentAudio.volume = this.masterVolume * this.currentVolumeMultiplier;
    }
  }

  /**
   * Toggles music mute state.
   */
  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Sets music mute state explicitly.
   */
  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : (this.masterVolume * this.currentVolumeMultiplier);
    }
  }
}
