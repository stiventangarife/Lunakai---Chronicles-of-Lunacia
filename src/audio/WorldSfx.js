// WorldSfx.js — Sonidos del mundo abierto (Hito 87, fase 2 del plan de sonido).
//
//   · Pasos según el suelo: hierba, tierra, arena, madera (puentes y muelle), piedra, nieve, hielo y agua.
//     Los dispara FootstepEffectsManager con cada zancada (a la vez que la huella), uno de cada dos en el Sapidae
//     y uno de cada tres en el Axie (más agudos y bajos).
//   · Voz de pitidos de los NPC (estilo Animal Crossing): cada personaje tiene su tono y timbre; las vocales
//     cambian el «color» del pitido. La llama DialogSystem mientras escribe.
//   · Criaturas: slimes (saltos, «¡boing!» al verte), quimeras (gruñido de vez en cuando, grito al detectarte),
//     el Axie compañero (gorjeo alegre al acariciarlo, darle de comer o traer el botín; «¿mm?» si te quedas quieto).
//   · Recolección: hachazos, pico contra roca, arrancar flor, árbol y roca al terminar, y toda la pesca
//     (lanzar, corcho, mordisquitos, picada, carrete, captura, «¡perfecto!» y pez que se escapa).
//
// Cada sonido intenta primero la grabación (SfxBank, assets/sounds/sfx/…) y, si no está, lo sintetiza.
// Salen por el bus de efectos (volumen «Efectos» de Opciones). Consola: lunakaiWorldSfx.test('pasos') …

import { SfxBank } from './SfxBank.js';
import { canonicalZoneId } from '../rpg/world/islands/IslandWorldLayout.js';

const ISLAND_BY_ZONE = { zone_2_2: 'forest', zone_3_2: 'savanna', zone_2_1: 'arctic', zone_1_2: 'mystic', zone_2_3: 'genesis' };
const BASE_SURFACE = { forest: 'grass', savanna: 'dirt', arctic: 'snow', mystic: 'grass', genesis: 'grass' };
const SEA_LEVEL = 0.45;
/** Ajuste de volumen de cada grabación de pasos para que todos los suelos suenen parecido (medido sin graves). */
const STEP_FILE_GAIN = { grass: 1, dirt: 1, water: 1, snow: 0.88, wood: 0.8, ice: 0.77, sand: 0.63, stone: 1.3 };

/** Isla grande activa (igual que GrandIslands.getActiveGrandIsland, sin importar las islas). */
function activeGrandIsland(om) {
  for (const z of Object.values(om?.grandIslands || {})) if (z && z.isActive && z.isLoaded) return z;
  return null;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Formantes aproximados de cada vocal (Hz): dan el «color» del pitido. */
const VOWELS = { a: [800, 1250], e: [480, 1900], i: [310, 2300], o: [520, 920], u: [340, 800] };
const ACCENTED = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u' };

/** Voces especiales (por nombre en minúsculas, también parcial). El resto sale de un número fijo por nombre. */
const VOICE_PRESETS = [
  { re: /paladill|mentor/, base: 118, wave: 'sawtooth', q: 6, vol: 1.0 },
  { re: /atia|estatua|statue|esp[ií]ritu|spirit|alma|soul/, base: 300, wave: 'sine', q: 3, vol: 0.9, shimmer: true },
  { re: /bing/, base: 255, wave: 'square', q: 7, vol: 0.7 },
  { re: /pomodoro/, base: 330, wave: 'triangle', q: 6, vol: 1.0 },
  { re: /kappa/, base: 210, wave: 'triangle', q: 5, vol: 1.0 },
  { re: /kawa|barquero|ferry/, base: 150, wave: 'sawtooth', q: 5, vol: 0.85 },
  { re: /chef/, base: 175, wave: 'square', q: 6, vol: 0.65 },
  { re: /ermita|hermit/, base: 135, wave: 'triangle', q: 4, vol: 1.0 },
];

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export class WorldSfx {
  constructor(audio) {
    this.audio = audio;
    this.bank = new SfxBank(audio);
    this._noise = null;
    this._stride = { player: 0, axie: 0 };
    this._lastStep = { player: 0, axie: 0 };
    this._voiceLast = 0;
    this._voiceCache = new Map();
    this._idle = { x: 0, z: 0, t: 0, next: rnd(25, 45) };
    this._growl = { t: rnd(5, 10) };
    this._slimeLast = 0;
    this.debug = { lastSurface: null, steps: 0 };
    if (typeof window !== 'undefined') window.lunakaiWorldSfx = this;
  }

  get ctx() { return this.audio?.ctx || null; }
  get ok() { return Boolean(this.audio?.initialized && this.ctx && !this.audio.isMuted); }
  get bus() { return this.audio.masterGain; }

  // ---------------------------------------------------------------- piezas de síntesis
  _noiseBuf() {
    if (this._noise) return this._noise;
    const ctx = this.ctx, n = ctx.sampleRate;
    const b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (this._noise = b);
  }

  /** Salida con volumen y paneo. */
  _out(vol, pan = 0) {
    const ctx = this.ctx, g = ctx.createGain();
    g.gain.value = vol;
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(this.bus); }
    else g.connect(this.bus);
    return g;
  }

  /** Ráfaga de ruido filtrado con caída exponencial. */
  _burst(dest, t, { type = 'bandpass', f = 1000, f1 = null, q = 1, a = 0.004, d = 0.06, v = 0.1 } = {}) {
    const ctx = this.ctx, s = ctx.createBufferSource();
    s.buffer = this._noiseBuf();
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    s.connect(flt); flt.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.8); s.stop(t + a + d + 0.03);
  }

  /** Tono con barrido de frecuencia y caída. */
  _tone(dest, t, { wave = 'sine', f = 440, f1 = null, a = 0.004, d = 0.1, v = 0.1, curve = 'exp' } = {}) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (f1) { if (curve === 'lin') o.frequency.linearRampToValueAtTime(f1, t + a + d); else o.frequency.exponentialRampToValueAtTime(f1, t + a + d); }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + d + 0.03);
    return o;
  }

  /** Posición en el mundo → { vol, pan } con el oyente del ambiente (jugador y cámara). */
  spatial(x, z, maxD = 24) {
    const amb = this.audio.ambience, L = amb?.listener;
    if (!L) return { vol: 1, pan: 0, d: 0 };
    const d = Math.hypot(x - L.x, z - L.z);
    const k = clamp01(1 - d / maxD);
    return { vol: k * k, pan: amb._panTo ? amb._panTo(x, z) * 0.8 : 0, d };
  }

  // ---------------------------------------------------------------- pasos
  /** Suelo bajo (x, z): agua, puente, camino, playa o el de la isla. */
  surfaceAt(e) {
    const om = typeof window !== 'undefined' ? window.overworldManager : null;
    const zoneId = om?.worldMapManager?.currentMapId;
    const island = ISLAND_BY_ZONE[canonicalZoneId(zoneId)] || ISLAND_BY_ZONE[zoneId] || 'forest';
    // Primero lo que se pisa por encima del terreno (un puente sobre el río no es agua)
    if (e.elevated && e.rise > 0.08) return island === 'arctic' && e.rise < 1.2 ? 'ice' : 'wood';
    if (e.depth > 0.03) return 'water';
    const zone = om ? (activeGrandIsland(om) || (om.savannaZone?.isActive && om.savannaZone) || (om.demoScenaZone?.isActive && om.demoScenaZone)) : null;
    try {
      if (zone?.roadManager?.getRoadFactor && zone.roadManager.getRoadFactor(e.x, e.z) > 0.55) return 'dirt';
      const data = zone?.art?.data;
      if (data?._nearestPath) {
        const near = data._nearestPath(e.x, e.z);
        if (near && near.dist < near.width * 0.5) return island === 'genesis' ? 'stone' : island === 'arctic' ? 'snow' : 'dirt';
      }
    } catch (_) { /* sin datos de caminos */ }
    if (Number.isFinite(e.y) && e.y < SEA_LEVEL + 0.8) return island === 'arctic' ? 'snow' : 'sand';
    if (island === 'genesis' && Math.hypot(e.x, e.z) < 16) return 'stone';   // plaza del Jardín Real
    return BASE_SURFACE[island] || 'grass';
  }

  /** Zancada de FootstepEffectsManager: { who: 'player'|'axie', x, z, y, run, depth, elevated, rise }. */
  onStride(e) {
    if (!this.ok) return;
    const who = e.who === 'axie' ? 'axie' : 'player';
    const every = who === 'axie' ? 3 : 2;
    if ((this._stride[who] = (this._stride[who] + 1) % every) !== 0) return;
    const now = this.ctx.currentTime;
    if (now - this._lastStep[who] < (who === 'axie' ? 0.2 : 0.18)) return;
    this._lastStep[who] = now;
    const surface = this.surfaceAt(e);
    this.debug.lastSurface = surface; this.debug.steps++;
    let pan = 0;
    if (who === 'axie') pan = this.spatial(e.x, e.z, 30).pan * 0.6;
    this.footstep(surface, { axie: who === 'axie', run: e.run !== false, depth: e.depth || 0, pan });
  }

  /** Un paso. surface: grass · dirt · sand · wood · stone · snow · ice · water. */
  footstep(surface, { axie = false, run = true, depth = 0, pan = 0 } = {}) {
    if (!this.ok) return;
    const vol = (run ? 1 : 0.75) * (axie ? 0.5 : 1);
    const rate = axie ? 1.35 : 1;
    if (this.bank.play(`steps/step_${surface}`, { vol: vol * 0.2 * (STEP_FILE_GAIN[surface] ?? 1), rate, pan })) return;   // grabaciones a −1 dBFS: ~−26 dB de pico, como el resto de efectos suaves
    if (surface === 'water') { this.audio.playWaterStep?.(Math.min(1, depth / 0.5)); return; }
    const t = this.ctx.currentTime, o = this._out(vol, pan), p = rate * rnd(0.92, 1.08);
    switch (surface) {
      case 'grass': {
        // Antes: dos ráfagas fijas y un tono grave (siempre igual: sonaba robótico). Ahora: un golpe sordo de ruido
        // (sin tono) y 4–7 roces cortos de hierba, cada uno con su tono, duración y momento al azar.
        this._burst(o, t, { type: 'lowpass', f: rnd(600, 900), q: 0.6, a: 0.008, d: rnd(0.05, 0.08), v: 0.14 });
        const n = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
          const k = i / n;
          this._burst(o, t + rnd(0, 0.1) * (0.4 + k), { f: rnd(1600, 4200) * p, q: rnd(0.6, 1.4), a: rnd(0.002, 0.007), d: rnd(0.015, 0.045), v: rnd(0.04, 0.11) * (1 - k * 0.5) });
        }
        break;
      }
      case 'dirt':
        this._burst(o, t, { f: 950 * p, q: 1.1, d: 0.06, v: 0.14 });
        for (let i = 0; i < 3; i++) this._burst(o, t + rnd(0, 0.04), { type: 'highpass', f: 2600, q: 0.7, a: 0.002, d: 0.012, v: 0.05 });
        this._tone(o, t, { f: 115 * p, f1: 70, d: 0.05, v: 0.10 });
        break;
      case 'sand':
        this._burst(o, t, { type: 'lowpass', f: 1700 * p, q: 0.5, a: 0.016, d: 0.12, v: 0.10 });
        this._tone(o, t, { f: 90 * p, f1: 60, d: 0.05, v: 0.05 });
        break;
      case 'wood':
        this._tone(o, t, { f: 190 * p, f1: 125, d: 0.09, v: 0.20 });
        this._tone(o, t, { wave: 'triangle', f: 420 * p, f1: 300, d: 0.05, v: 0.05 });
        this._burst(o, t, { f: 1200 * p, q: 3, d: 0.04, v: 0.08 });
        break;
      case 'stone':
        this._burst(o, t, { type: 'highpass', f: 1800, q: 0.7, a: 0.002, d: 0.035, v: 0.10 });
        this._tone(o, t, { f: 720 * p, f1: 620, d: 0.04, v: 0.025 });
        this._tone(o, t, { f: 120 * p, f1: 80, d: 0.04, v: 0.07 });
        break;
      case 'snow':
        for (let i = 0; i < 5; i++) this._burst(o, t + i * rnd(0.018, 0.026), { f: rnd(1200, 2600) * p, q: 2, a: 0.003, d: 0.02, v: 0.07 });
        this._burst(o, t, { type: 'lowpass', f: 520, q: 0.7, a: 0.01, d: 0.09, v: 0.06 });
        break;
      case 'ice':
        this._burst(o, t, { type: 'highpass', f: 3000, q: 0.7, a: 0.002, d: 0.02, v: 0.10 });
        this._tone(o, t, { f: 2200 * p, d: 0.12, v: 0.018 });
        this._tone(o, t, { f: 110 * p, f1: 75, d: 0.04, v: 0.06 });
        break;
      default:
        this._burst(o, t, { f: 1500 * p, d: 0.05, v: 0.08 });
    }
  }

  // ---------------------------------------------------------------- voz de pitidos de los NPC
  voiceFor(speaker = '') {
    const key = String(speaker || '').toLowerCase().trim();
    if (this._voiceCache.has(key)) return this._voiceCache.get(key);
    const pre = VOICE_PRESETS.find((p) => p.re.test(key));
    const h = hashStr(key || 'npc');
    const v = pre ? { ...pre } : {
      base: 150 + (h % 230),                                     // 150–380 Hz
      wave: ['triangle', 'square', 'sawtooth', 'triangle'][(h >>> 8) % 4],
      q: 4 + ((h >>> 12) % 4), vol: 1,
    };
    v.vol = (v.vol ?? 1) * (v.wave === 'square' ? 0.7 : v.wave === 'sawtooth' ? 0.8 : 1);
    this._voiceCache.set(key, v);
    return v;
  }

  /**
   * Un pitido por cada letra que escribe el diálogo (se salta signos y espacios, y no más de uno cada 55 ms).
   * @returns {boolean} si sonó
   */
  voiceBlip(speaker, ch) {
    if (!this.ok || !ch) return false;
    const low = ch.toLowerCase(), c = ACCENTED[low] || low;
    if (!/[a-zñ0-9]/.test(c)) return false;
    const t = this.ctx.currentTime;
    if (t - this._voiceLast < 0.055) return false;
    this._voiceLast = t;
    const v = this.voiceFor(speaker);
    const vowel = VOWELS[c];
    const [f1, f2] = vowel || VOWELS[['a', 'e', 'i', 'o', 'u'][c.charCodeAt(0) % 5]];
    const pitch = v.base * (vowel ? 1 : 0.94) * (1 + ((c.charCodeAt(0) * 7) % 11 - 5) * 0.012) * rnd(0.97, 1.03);
    const ctx = this.ctx, dur = vowel ? 0.06 : 0.04;
    const o = ctx.createOscillator(); o.type = v.wave; o.frequency.setValueAtTime(pitch, t);
    o.frequency.linearRampToValueAtTime(pitch * (vowel ? 1.04 : 0.97), t + dur);
    const out = this._out(0.11 * v.vol * (vowel ? 1 : 0.6));
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(out);
    for (const [f, k] of [[f1, 1], [f2, 0.6]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = v.q;
      const g = ctx.createGain(); g.gain.value = k * 2.2;
      o.connect(bp); bp.connect(g); g.connect(env);
    }
    const dry = ctx.createGain(); dry.gain.value = 0.25; o.connect(dry); dry.connect(env);
    o.start(t); o.stop(t + dur + 0.02);
    if (v.shimmer) this._tone(out, t, { f: pitch * 3, d: 0.18, v: 0.05 });
    return true;
  }

  // ---------------------------------------------------------------- criaturas
  /** kind: 'slime' | 'chimera' · ev: 'land' | 'alert' | 'growl'. Con x, z suena desde su posición. */
  creature(kind, ev, { x = null, z = null, maxD = 26 } = {}) {
    if (!this.ok) return;
    let vol = 1, pan = 0;
    if (x !== null) { const s = this.spatial(x, z, maxD); vol = s.vol; pan = s.pan; if (vol < 0.02) return; }
    const t = this.ctx.currentTime;
    if (kind === 'slime') {
      if (ev === 'land') {
        if (t - this._slimeLast < 0.3) return;   // muchos slimes juntos: no más de uno cada 0,3 s
        this._slimeLast = t;
        if (this.bank.play('creatures/slime_boing', { vol: vol * 0.5, pan })) return;
        const o = this._out(vol * 0.9, pan), p = rnd(0.9, 1.15);
        const w = this._tone(o, t, { f: 170 * p, f1: 360 * p, a: 0.006, d: 0.09, v: 0.10 });
        w.frequency.exponentialRampToValueAtTime(240 * p, t + 0.16);
        this._burst(o, t, { type: 'lowpass', f: 420, q: 1, a: 0.004, d: 0.07, v: 0.08 });
      } else if (ev === 'alert') {
        if (this.bank.play('creatures/slime_boing', { vol: vol * 0.7, rate: 1.25, pan })) return;
        const o = this._out(vol, pan);
        this._tone(o, t, { f: 300, f1: 900, d: 0.11, v: 0.12 });
        this._tone(o, t + 0.13, { f: 420, f1: 1150, d: 0.12, v: 0.10 });
      }
      return;
    }
    // quimeras
    if (ev === 'alert') {
      if (this.bank.play('creatures/chimera_alert', { vol: vol * 0.7, pan })) return;
      const o = this._out(vol, pan), bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 2.5; bp.connect(o);
      const s = this._tone(bp, t, { wave: 'sawtooth', f: 420, f1: 980, a: 0.01, d: 0.16, v: 0.35 });
      const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 28; lg.gain.value = 60;
      lfo.connect(lg); lg.connect(s.frequency); lfo.start(t); lfo.stop(t + 0.2);
    } else if (ev === 'growl') {
      if (this.bank.play('creatures/chimera_growl', { vol: vol * 0.6, pan })) return;
      const o = this._out(vol, pan), lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 2; lp.connect(o);
      const f = rnd(85, 120), dur = rnd(0.5, 0.8);
      const s = this._tone(lp, t, { wave: 'sawtooth', f, f1: f * 0.8, a: 0.12, d: dur, v: 0.28, curve: 'lin' });
      // ronroneo: modulación de amplitud a ~24 Hz
      const am = this.ctx.createOscillator(), ag = this.ctx.createGain(); am.frequency.value = rnd(20, 28); ag.gain.value = f * 0.25;
      am.connect(ag); ag.connect(s.frequency); am.start(t); am.stop(t + dur + 0.2);
    }
  }

  /** Axie compañero: 'happy' (caricia, comida, botín) · 'curious' (te quedas quieto un rato). */
  axie(ev) {
    if (!this.ok) return;
    const om = typeof window !== 'undefined' ? window.overworldManager : null;
    const id = String(om?.player?.companionAxieId || om?.player?.companionName || 'axie');
    const pf = 0.85 + (hashStr(id) % 40) / 100;                 // cada Axie con su tono (0,85–1,25)
    const cp = om?.player?.companionGroup?.position;
    const pan = cp ? this.spatial(cp.x, cp.z, 30).pan * 0.6 : 0;
    const t = this.ctx.currentTime;
    if (ev === 'happy') {
      if (this.bank.play('creatures/axie_happy', { vol: 0.6, rate: pf, pan })) return;
      const o = this._out(0.9, pan);
      [[600, 900], [700, 1100], [900, 1350]].forEach(([a, b], i) => this._tone(o, t + i * 0.085, { wave: 'triangle', f: a * pf, f1: b * pf, a: 0.008, d: 0.07, v: 0.12 }));
    } else if (ev === 'curious') {
      if (this.bank.play('creatures/axie_curious', { vol: 0.5, rate: pf, pan })) return;
      const o = this._out(0.8, pan), lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(o);
      this._tone(lp, t, { wave: 'triangle', f: 300 * pf, f1: 440 * pf, a: 0.04, d: 0.24, v: 0.14 });
    }
  }

  // ---------------------------------------------------------------- recolección y pesca
  /** ev: chop · mine · pluck · treeFall · rockBreak · cast · bobber · nibble · bite · reel · catch · perfect · escape · miss */
  gather(ev, o = {}) {
    if (!this.ok) return;
    const t = this.ctx.currentTime, b = this.bank;
    const out = (v) => this._out(v, o.pan || 0);
    switch (ev) {
      case 'chop': {
        if (b.play('world/chop_wood', { vol: 0.7 })) return;
        const d = out(1);
        this._burst(d, t, { f: 600, q: 2, d: 0.06, v: 0.25 });
        this._tone(d, t, { f: 150, f1: 90, d: 0.08, v: 0.2 });
        this._burst(d, t, { type: 'highpass', f: 2000, q: 0.7, a: 0.002, d: 0.025, v: 0.1 });
        return;
      }
      case 'mine': {
        if (b.play('world/mine_rock', { vol: 0.7 })) return;
        const d = out(1);
        this._tone(d, t, { f: 1800 * rnd(0.95, 1.05), d: 0.18, v: 0.08 });
        this._tone(d, t, { f: 2700 * rnd(0.95, 1.05), d: 0.12, v: 0.05 });
        this._burst(d, t, { type: 'highpass', f: 2500, q: 0.7, a: 0.002, d: 0.03, v: 0.15 });
        this._tone(d, t, { f: 130, f1: 80, d: 0.05, v: 0.12 });
        return;
      }
      case 'pluck': {
        if (b.play('world/pick_flower', { vol: 0.7 })) return;
        const d = out(1);
        this._burst(d, t, { f: 1200, f1: 3000, q: 1.2, a: 0.01, d: 0.08, v: 0.1 });
        this._tone(d, t + 0.07, { f: 500, f1: 900, d: 0.03, v: 0.08 });
        return;
      }
      case 'treeFall': {
        if (b.play('world/tree_fall', { vol: 0.7 })) return;
        const d = out(1);
        for (let i = 0; i < 6; i++) this._burst(d, t + i * rnd(0.05, 0.09), { f: rnd(500, 1400), q: 3, a: 0.002, d: 0.03, v: 0.12 });
        this._burst(d, t + 0.1, { f: 320, f1: 150, q: 8, a: 0.05, d: 0.7, v: 0.12 });
        this._tone(d, t + 0.9, { f: 80, f1: 45, d: 0.25, v: 0.25 });
        this._burst(d, t + 0.9, { type: 'lowpass', f: 600, a: 0.005, d: 0.3, v: 0.15 });
        return;
      }
      case 'rockBreak': {
        if (b.play('world/rock_break', { vol: 0.7 })) return;
        const d = out(1);
        this._burst(d, t, { type: 'lowpass', f: 1200, a: 0.003, d: 0.4, v: 0.25 });
        for (let i = 0; i < 5; i++) this._burst(d, t + rnd(0.03, 0.3), { type: 'highpass', f: 2200, a: 0.002, d: 0.025, v: 0.07 });
        return;
      }
      case 'cast': {
        if (b.play('world/fishing_cast', { vol: 0.6 })) return;
        const d = out(1), s = this.ctx.createBufferSource(), bp = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        s.buffer = this._noiseBuf(); bp.type = 'bandpass'; bp.Q.value = 2.5;
        bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2200, t + 0.2); bp.frequency.exponentialRampToValueAtTime(700, t + 0.45);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        s.connect(bp); bp.connect(g); g.connect(d); s.start(t); s.stop(t + 0.5);
        return;
      }
      case 'bobber': {
        if (b.play('world/fishing_bobber', { vol: 0.6 })) return;
        const d = out(1);
        this._tone(d, t, { f: 520, f1: 150, d: 0.07, v: 0.16 });
        this._burst(d, t, { type: 'lowpass', f: 1500, a: 0.003, d: 0.05, v: 0.08 });
        return;
      }
      case 'nibble': {
        const d = out(1);
        this._tone(d, t, { f: 700, f1: 300, d: 0.035, v: 0.07 });
        return;
      }
      case 'bite': {
        if (b.play('world/fishing_bite', { vol: 0.7 })) return;
        const d = out(1);
        this._burst(d, t, { f: 1200, f1: 500, q: 1.2, a: 0.005, d: 0.3, v: 0.22 });
        this._tone(d, t, { f: 380, f1: 110, d: 0.12, v: 0.2 });
        this._tone(d, t + 0.02, { wave: 'triangle', f: 980, f1: 760, d: 0.08, v: 0.06 });
        return;
      }
      case 'reel': {
        if (b.play('world/fishing_reel', { vol: 0.5 })) return;
        const d = out(1), n = Math.round((o.dur || 0.8) * 18);
        for (let i = 0; i < n; i++) this._tone(d, t + i / 18, { wave: 'square', f: 2900 + (i % 2) * 300, a: 0.001, d: 0.006, v: 0.025 });
        return;
      }
      case 'catch': {
        if (!b.play('world/fish_catch', { vol: 0.6 })) {
          const d = out(1);
          for (let i = 0; i < 3; i++) this._burst(d, t + i * 0.12, { f: 900, f1: 400, q: 1, a: 0.004, d: 0.08, v: 0.12 });
        }
        const j = out(1);
        [659.25, 830.61, 987.77].forEach((f, i) => this._tone(j, t + 0.25 + i * 0.09, { f, d: 0.35, v: 0.07 }));
        return;
      }
      case 'perfect': {
        const d = out(1);
        [1318.5, 1568, 1975.5, 2637].forEach((f, i) => this._tone(d, t + i * 0.06, { f, d: 0.3, v: 0.05 }));
        return;
      }
      case 'miss': {
        const d = out(1);
        this._tone(d, t, { wave: 'triangle', f: 520, f1: 380, d: 0.15, v: 0.08 });
        return;
      }
      case 'escape': {
        const d = out(1);
        this._tone(d, t, { f: 520, f1: 150, d: 0.07, v: 0.14 });
        this._burst(d, t, { f: 1100, f1: 500, q: 1, a: 0.004, d: 0.2, v: 0.12 });
        this._tone(d, t + 0.15, { wave: 'triangle', f: 480, f1: 220, d: 0.45, v: 0.07 });
        return;
      }
      default:
    }
  }

  // ---------------------------------------------------------------- bucle (lo llama AmbienceManager 10 veces por segundo)
  tick(dt, om, mode) {
    if (!this.ok || mode !== 'world' || !om?.player) return;
    // Axie curioso: si el jugador lleva un rato quieto (no en diálogos ni menús)
    const p = om.player.position, I = this._idle;
    if (Math.hypot(p.x - I.x, p.z - I.z) > 0.3 || om.dialogSystem?.isActive || om.isAnyModalOpen?.()) { I.x = p.x; I.z = p.z; I.t = 0; }
    else if ((I.t += dt) > I.next) { I.t = 0; I.next = rnd(25, 45); if (om.player.companionGroup) this.axie('curious'); }
    // Quimeras del mundo: la más cercana que patrulla gruñe de vez en cuando
    if ((this._growl.t -= dt) <= 0) {
      this._growl.t = rnd(7, 15);
      const list = om.monsters?.monsters || [];
      let best = null, bd = 22;
      for (const m of list) {
        if (m.state !== 'PATROL' || !m.group?.visible) continue;
        const d = Math.hypot(m.group.position.x - p.x, m.group.position.z - p.z);
        if (d < bd) { bd = d; best = m; }
      }
      if (best) {
        const slime = /slime/i.test(`${best.id} ${best.name}`);
        this.creature(slime ? 'slime' : 'chimera', slime ? 'land' : 'growl', { x: best.group.position.x, z: best.group.position.z });
      }
    }
  }

  /** Consola: lunakaiWorldSfx.test('pasos' | 'voz' | 'criaturas' | 'pesca' | 'recoleccion'). */
  test(what = 'pasos') {
    const seq = [];
    if (what === 'pasos') ['grass', 'dirt', 'sand', 'wood', 'stone', 'snow', 'ice', 'water'].forEach((s) => { for (let i = 0; i < 4; i++) seq.push(() => this.footstep(s, { depth: 0.3 })); seq.push(null); });
    if (what === 'voz') ['Paladill', 'Bing', 'Pomodoro', 'Estatua de Atia', 'Aldeano'].forEach((n) => { [...'Hola, aventurero. ¿Qué tal?'].forEach((c) => seq.push(() => { this._voiceLast = 0; this.voiceBlip(n, c); })); seq.push(null, null); });
    if (what === 'criaturas') seq.push(() => this.creature('slime', 'land'), null, () => this.creature('slime', 'alert'), null, null, () => this.creature('chimera', 'growl'), null, null, () => this.creature('chimera', 'alert'), null, () => this.axie('happy'), null, () => this.axie('curious'));
    if (what === 'pesca') ['cast', null, 'bobber', null, 'nibble', null, 'bite', null, 'reel', null, 'perfect', null, 'catch', null, null, 'escape'].forEach((e) => seq.push(e ? () => this.gather(e) : null));
    if (what === 'recoleccion') ['chop', null, 'chop', null, 'treeFall', null, null, 'mine', null, 'mine', null, 'rockBreak', null, null, 'pluck'].forEach((e) => seq.push(e ? () => this.gather(e) : null));
    seq.forEach((fn, i) => fn && setTimeout(fn, i * (what === 'voz' ? 70 : 260)));
    return seq.length;
  }

  status() { return { ...this.bank.status(), ultimoSuelo: this.debug.lastSurface, pasos: this.debug.steps }; }
}
