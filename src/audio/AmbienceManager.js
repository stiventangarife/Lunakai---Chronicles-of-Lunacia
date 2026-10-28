// AmbienceManager.js — Sonido ambiental sintetizado del mundo abierto y del combate (Hito 86).
//
// Todo con Web Audio, sin archivos: ruido filtrado (viento, agua, fuego), osciladores (cantos, campanas,
// zumbidos) y una reverberación generada. Suena por el bus de ambiente de TacticalAudio (volumen «Ambiente»).
//
//   · Base por isla: viento con ráfagas y capas propias (hojas, cigarras, silbido helado, zumbido etéreo, coro).
//   · Mar: se detecta solo, midiendo el terreno alrededor del jugador (suelo bajo el nivel del mar). Suena hacia
//     el lado donde está el agua y crece al acercarse a la orilla.
//   · Fuentes con posición: río y rápidos del Bosque, hogueras, yunque, campanillas, oasis, pantano, cristales,
//     llama de Atia… Solo existen mientras el jugador está cerca (cuestan 0 lejos).
//   · Sonidos sueltos: pájaros, halcón, crujidos de hielo, búho, campanitas de cristal, gaviotas junto al mar.
//   · Combate: la base de la isla, más baja, bajo la música; sin fuentes ni mar.
//   · Se apaga en la cinemática, la pantalla de inicio y la carga; baja con diálogos y paneles abiertos.
//
// Lee el estado del juego cada 0,1 s (window.game, window.overworldManager): no necesita llamadas desde el bucle.
// Consola: lkDebug.audio() / lunakaiAmbience.status().

import { canonicalZoneId } from '../rpg/world/islands/IslandWorldLayout.js';

const TICK_MS = 100;
const MIX_GAIN = 2.5;
// Grabaciones opcionales en bucle: si el archivo existe, sustituye a la versión sintetizada; si no, suena la sintetizada.
const LOOP_DIR = './assets/sounds/ambience/';
const SEA_FILE = 'sea_waves_loop.mp3';
// Hito 91 (mezcla): ajuste del fondo por isla. El Ártico (viento fuerte) quedaba solo 4 dB bajo la música (−29 LUFS
// frente a −33 del Bosque); se baja 3 dB sin cambiar su carácter de ventisca.
const ISLAND_TRIM = { arctic: 0.7 };
// Mar más suave en todas las islas (pedido del usuario): volumen ×0,5 (−6 dB), olas con menos subida y menos espuma
const SEA_SOFT = 0.28;   // (Hito 87: de 0,5 a 0,28 y sin subgraves: en la orilla molestaba en los oídos)
const SEA_LEVEL = 0.45;           // nivel del mar en las cinco islas (IslandProps, SavannaZone, DemoScenaZone22)
const ISLAND_BY_ZONE = { zone_2_2: 'forest', zone_3_2: 'savanna', zone_2_1: 'arctic', zone_1_2: 'mystic', zone_2_3: 'genesis' };

// Río del Bosque: misma curva que WaterManager.getRiverBounds (de RIVER_Z0 = -152 a RIVER_Z1 = 150)
const riverBounds = (z) => ({
  cx: 18 + Math.sin(z * 0.025) * 16 + Math.cos(z * 0.012) * 8,
  hw: 10.0 + Math.sin(z * 0.04) * 3.0 + 3.0,
});

/**
 * Perfiles por isla.
 *  bed:   capas continuas { kind, level, ... }
 *  shots: sonidos sueltos { fn, every:[min,max] s, w (peso), args }
 *  emit:  fuentes con posición { kind, x, z, r (m), level }
 *  sea:   volumen del mar; gulls: gaviotas cuando el mar está cerca
 */
export const AMBIENCE_PROFILES = {
  forest: {
    bed: [
      { kind: 'wind', level: 0.12, lo: 240, hi: 650, whistle: 0.12, gust: 0.55 },   // brisa suave (antes sonaba a ventisca)
    ],
    shots: [
      { fn: 'songbird', every: [2.5, 7], w: 5 },
      { fn: 'warble', every: [6, 14], w: 2 },
      { fn: 'dove', every: [14, 30], w: 1 },
      { fn: 'woodpecker', every: [25, 50], w: 1 },
    ],
    emit: [
      { kind: 'river', r: 34, level: 0.30, file: 'river_loop.mp3' },                       // a lo largo del cauce (curva del río)
      { kind: 'rapids', x: 35, z: 24, r: 42, level: 0.30, file: 'rapids_loop.mp3' },        // puente de los rápidos
      { kind: 'chimes', x: -33.2, z: -6.0, r: 28, level: 0.16 },   // dojo
      { kind: 'anvil', x: -64.9, z: -8.6, r: 34, level: 0.20 },    // Forja del pueblo
    ],
    sea: 0.34, gulls: true,
  },
  savanna: {
    bed: [
      { kind: 'wind', level: 0.08, lo: 300, hi: 800, whistle: 0.15, gust: 0.5 },   // brisa seca suave (antes tapaba el resto)
    ],
    shots: [
      { fn: 'exotic', every: [5, 12], w: 3 },
      { fn: 'hawk', every: [22, 45], w: 1 },
    ],
    emit: [
      { kind: 'fire', file: 'campfire_loop.mp3', x: -24.2, z: -33.2, r: 24, level: 0.24 },    // hoguera del campamento de Bing
      { kind: 'oasis', x: 14, z: -12, r: 34, level: 0.20 },        // oasis de la meseta
    ],
    sea: 0.34, gulls: true,
  },
  arctic: {
    bed: [
      { kind: 'wind', level: 0.20, lo: 180, hi: 700 },
      { kind: 'whistle', level: 0.05 },
    ],
    shots: [
      { fn: 'iceCreak', every: [8, 20], w: 3 },
      { fn: 'snowbird', every: [10, 24], w: 2 },
      { fn: 'farHowl', every: [45, 90], w: 1 },
    ],
    emit: [
      { kind: 'fire', file: 'campfire_loop.mp3', x: 9.6, z: 16.4, r: 24, level: 0.24 },       // hoguera de Pomodoro
      { kind: 'fire', file: 'campfire_loop.mp3', x: -6.6, z: -35.4, r: 24, level: 0.22 },     // campamento del Chef
      { kind: 'stew', x: -2.4, z: -40.4, r: 12, level: 0.16 },     // estofado del Chef
      { kind: 'fire', file: 'campfire_loop.mp3', x: -38.6, z: -73.0, r: 24, level: 0.22 },    // cabaña del Ermitaño
    ],
    sea: 0.30, gulls: false,
  },
  mystic: {
    bed: [],   // sin fondo continuo: viento, zumbido de acorde y aire brillante quitados a petición del usuario
    shots: [
      { fn: 'crystal', every: [4, 10], w: 3 },
      { fn: 'firefly', every: [1.2, 3.5], w: 4 },
      { fn: 'owl', every: [20, 40], w: 1 },
    ],
    emit: [
      { kind: 'swamp', x: -64, z: 62, r: 46, level: 0.22 },        // pantano luminoso
      { kind: 'hum', x: 42, z: -38, r: 26, level: 0.10, notes: [146.83, 220] },   // Observatorio
    ],
    sea: 0.28, gulls: false,
  },
  genesis: {
    bed: [
      { kind: 'wind', level: 0.09, lo: 240, hi: 650, whistle: 0.12, gust: 0.55 },   // brisa suave como la del Bosque, un poco más baja (coro quitado)
    ],
    shots: [
      { fn: 'garden', every: [4, 9], w: 3 },
      { fn: 'bell', every: [25, 45], w: 1 },
    ],
    emit: [
      { kind: 'flame', x: 0, z: 92, r: 30, level: 0.22 },          // Llama de Atia (Santuario del Origen)
      { kind: 'hum', x: -60, z: -60, r: 24, level: 0.10, notes: [196, 293.66] },  // cantera de cristal
      { kind: 'chimes', x: 0, z: 0, r: 26, level: 0.10 },          // Jardín Real
      { kind: 'hum', x: 112, z: 20, r: 20, level: 0.07, notes: [261.63, 392] },   // velo de la Puerta
    ],
    sea: 0.30, gulls: true,
  },
};

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

export class AmbienceManager {
  constructor(audio) {
    this.audio = audio;
    this.ctx = null;
    this.started = false;
    this.island = null;          // isla cuya base suena
    this.mode = 'off';           // 'world' | 'combat' | 'off'
    this.bed = null;             // { island, out, layers[] }
    this.emitters = new Map();   // índice del perfil → fuente viva
    this.sea = null;
    this.seaAmt = 0; this.seaPan = 0; this._seaTick = 0;
    this.next = new Map();       // sonido suelto → momento del próximo (s, reloj del contexto)
    this.listener = { x: 0, z: 0, rx: 1, rz: 0 };
    this.debug = { force: null };
    this.loops = new Map();      // archivo → { state: 'loading'|'ok'|'missing', buf }
    this._dirty = false;
  }

  // ---------------------------------------------------------------- montaje
  start() {
    if (this.started || !this.audio || !this.audio.ctx) return;
    const ctx = this.ctx = this.audio.ctx;
    this.started = true;
    this.out = ctx.createGain();         // volumen de la escena (modo y atenuaciones)
    this.out.gain.value = 0;
    // Ganancia de mezcla: deja el ambiente unos 10 dB bajo la música con «Ambiente» al 60 % (fase 6: ajuste fino)
    this.mix = ctx.createGain();
    this.mix.gain.value = MIX_GAIN;
    this.out.connect(this.mix); this.mix.connect(this.audio.ambGain);
    // Reverberación compartida (sonidos sueltos y fuentes lejanas): respuesta de ruido que decae en 2,4 s
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.4, 2.6);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.55;
    this.reverb.connect(this.wet); this.wet.connect(this.out);
    // Ruidos de base, generados una vez (4 s, en bucle desde un punto al azar)
    this.noise = { white: this._noiseBuf('white'), pink: this._noiseBuf('pink'), brown: this._noiseBuf('brown') };
    this._timer = setInterval(() => { try { this.tick(TICK_MS / 1000); } catch (e) { console.warn('[Ambience]', e); } }, TICK_MS);
    if (typeof window !== 'undefined') window.lunakaiAmbience = this;
  }

  _noiseBuf(color) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * 6), f = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), tail = new Float32Array(f);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0, hpIn = 0, hpPrev = 0;
    for (let j = 0; j < n + f; j++) {
      const i = j < n ? j : -1;
      const w = Math.random() * 2 - 1;
      let v;
      if (color === 'white') v = w * 0.5;
      else if (color === 'pink') { // Paul Kellet
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        v = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else {
        // marrón con los subgraves quitados (paso alto de 1 polo a ~45 Hz): por debajo de eso no se oye, solo
        // presiona los oídos con auriculares (el mar tenía el 17 % de su energía por debajo de 40 Hz)
        last = (last + 0.02 * w) / 1.02;
        const hpOut = 0.9936 * (hpPrev + last - hpIn); hpIn = last; hpPrev = hpOut;
        v = hpOut * 3.5;
      }
      if (i >= 0) d[i] = v; else tail[j - n] = v;
    }
    // Bucle sin bache: el principio se funde (potencia constante) con la continuación del final
    for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * Math.sin(k * Math.PI / 2) + tail[i] * Math.cos(k * Math.PI / 2); }
    return buf;
  }

  _impulse(sec, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  /** Grabación en bucle: devuelve el búfer si ya está cargado; si no, la pide una vez (por sesión) y devuelve null. */
  _loop(name) {
    if (!name || !this.ctx) return null;
    const e = this.loops.get(name);
    if (e) return e.state === 'ok' ? e.buf : null;
    const entry = { state: 'loading', buf: null };
    this.loops.set(name, entry);
    fetch(LOOP_DIR + name)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ab) => this.ctx.decodeAudioData(ab))
      .then((buf) => { entry.state = 'ok'; entry.buf = buf; this._dirty = true; })
      .catch(() => { entry.state = 'missing'; });
    return null;
  }

  _loopSource(buf) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.start(this.ctx.currentTime, Math.random() * Math.max(0, buf.duration - 0.5));
    return s;
  }

  /** Pide de antemano las grabaciones de una isla (para que estén listas al acercarse a cada fuente). */
  _preload(P) {
    for (const L of P.bed || []) if (L.file) this._loop(L.file);
    for (const E of P.emit || []) if (E.file) this._loop(E.file);
    if (P.sea) this._loop(SEA_FILE);
  }

  /** Fuente de ruido en bucle desde un punto al azar. */
  _noise(color, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise[color];
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(this.ctx.currentTime, Math.random() * 5.5);
    return s;
  }

  _filter(type, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }

  _gain(v = 0) { const g = this.ctx.createGain(); g.gain.value = v; return g; }

  _chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }

  _set(param, v, tc = 0.25) { param.setTargetAtTime(v, this.ctx.currentTime, tc); }

  // ---------------------------------------------------------------- estado del juego
  _readState() {
    const g = typeof window !== 'undefined' ? window.game : null;
    const om = typeof window !== 'undefined' ? window.overworldManager : null;
    if (this.debug.force) return { mode: this.debug.force.mode || 'world', island: this.debug.force.island, om };
    if (!g || !om) return { mode: 'off' };
    const zone = om.worldMapManager?.currentMapId;
    const island = ISLAND_BY_ZONE[canonicalZoneId(zone)] || ISLAND_BY_ZONE[zone] || null;
    if (g.gameState === 'BATTLE') return { mode: island ? 'combat' : 'off', island, om };
    const loading = om.isLoadingZone || om.worldMapManager?.transitionManager?.isTransitioning;
    if (g.gameState === 'OVERWORLD' && island && !loading && !['CINEMATIC', 'HERO_PRESENTATION', 'INIT'].includes(om.state)) return { mode: 'world', island, om };
    return { mode: 'off', island, om };
  }

  _duck(om) {
    if (!om) return 1;
    let k = 1;
    if (om.dialogSystem?.isActive) k = Math.min(k, 0.6);
    if (om.settingsModal?.isOpen || om.inventoryModal?.isOpen || om.squadModal?.isOpen || om.questBookModal?.isOpen
      || om.worldMapManager?.worldMapModal?.isOpen) k = Math.min(k, 0.55);
    return k;
  }

  // ---------------------------------------------------------------- bucle (10 veces por segundo)
  tick(dt) {
    if (!this.started) return;
    const a = this.audio;
    const { mode, island, om } = this._readState();
    if (a.isMuted || this.ctx.state !== 'running') { if (this.ctx.state === 'suspended' && mode !== 'off') a.resume?.(); }
    // Volumen de la escena: mundo 1, combate 0,45, apagado 0 (fundidos de ~1 s)
    const target = (mode === 'world' ? 1 : mode === 'combat' ? 0.45 : 0) * this._duck(om);
    this._set(this.out.gain, target, mode === 'off' ? 0.5 : 0.6);
    this.mode = mode;
    if (mode === 'off') {
      if (this.bed && this.out.gain.value < 0.01) this._dropAll();
      return;
    }
    if (this._dirty && this.bed) { this._dirty = false; this.bed.island = null; }   // llegó una grabación: rehacer con ella
    if (!this.bed || this.bed.island !== island) this._switchBed(island);
    const P = AMBIENCE_PROFILES[island];
    this._updateListener(om);
    this._updateBed(dt);
    if (mode === 'world') {
      this._updateEmitters(P, dt);
      this._updateSea(P, om, dt);
    } else {
      this._clearEmitters();
      if (this.sea) this._set(this.sea.g.gain, 0, 0.4);
    }
    this._shots(P, mode === 'combat' ? 0.3 : 1);
    this.audio.world?.tick?.(dt, om, mode);   // Hito 87: Axie curioso y gruñidos de quimeras cercanas
  }

  _updateListener(om) {
    const p = om?.player?.position;
    if (p) { this.listener.x = p.x; this.listener.z = p.z; }
    const cam = om?.camera;
    if (cam && cam.matrixWorld) {
      const e = cam.matrixWorld.elements; // eje X de la cámara (derecha) en el mundo
      const l = Math.hypot(e[0], e[2]) || 1;
      this.listener.rx = e[0] / l; this.listener.rz = e[2] / l;
    }
  }

  /** Paneo (−1 izquierda … 1 derecha) de un punto respecto al jugador y la cámara. */
  _panTo(x, z) {
    const dx = x - this.listener.x, dz = z - this.listener.z, d = Math.hypot(dx, dz);
    if (d < 0.5) return 0;
    return Math.max(-0.85, Math.min(0.85, (dx * this.listener.rx + dz * this.listener.rz) / d));
  }

  // ---------------------------------------------------------------- base de la isla
  _switchBed(island) {
    const old = this.bed;
    if (old) { this._set(old.out.gain, 0, 0.6); setTimeout(() => this._stopLayers(old), 3000); }
    this._clearEmitters();
    if (this.sea) { this._set(this.sea.g.gain, 0, 0.5); const s = this.sea; setTimeout(() => this._stopLayers(s), 2500); this.sea = null; }
    this.next.clear();
    this.seaAmt = 0; this._seaTick = 0;
    this.island = island;
    const P = AMBIENCE_PROFILES[island];
    const out = this._gain(0);
    out.connect(this.out);
    this._set(out.gain, ISLAND_TRIM[island] ?? 1, 0.8);
    const bed = { island, out, layers: [], gust: 0.4, gustT: 0.4, gustTimer: 0, nodes: [] };
    this._preload(P);
    const replaced = new Set();
    for (const L of P.bed) if (L.kind === 'file' && this._loop(L.file)) (L.replaces || []).forEach((k) => replaced.add(k));
    for (const L of P.bed) {
      if (replaced.has(L.kind)) continue;
      if (L.kind === 'file') {
        const buf = this._loop(L.file);
        if (!buf) continue;
        const src = this._loopSource(buf), g = this._gain(L.level);
        this._chain(src, g, out);
        bed.layers.push({ L, srcs: [src], nodes: [g] });
        continue;
      }
      bed.layers.push(this._makeBedLayer(L, out, bed));
    }
    this.bed = bed;
  }

  _makeBedLayer(L, out, bed) {
    const ctx = this.ctx;
    const layer = { L, srcs: [], nodes: [] };
    const reg = (...n) => { layer.nodes.push(...n); return n[n.length - 1]; };
    if (L.kind === 'wind') {
      // Antes: ruido grave y ancho que subía y bajaba despacio, y sonaba a olas lejanas. El viento real se reconoce
      // por sus silbidos: bandas estrechas cuyo tono sube con la ráfaga, y un aleteo rápido e irregular.
      // Ahora: un soplo de fondo suave sin graves (por encima de ~250 Hz) y dos silbidos que se mueven.
      const s = this._noise('pink', 1);
      const hp = this._filter('highpass', 260, 0.7), bp = this._filter('bandpass', L.lo * 1.4, 0.7), g = this._gain(0);
      this._chain(s, hp, bp, g, out);
      layer.srcs.push(s); reg(hp, bp, g);
      const whistles = [0, 1].map((i) => {
        const ws = this._noise('pink', 1), wbp = this._filter('bandpass', L.lo * 2, 7 + i * 4), wg = this._gain(0);
        this._chain(ws, wbp, wg, out); layer.srcs.push(ws); reg(wbp, wg);
        return { wbp, wg, ratio: i ? 1.9 : 1.25, drift: 0 };
      });
      const wAmt = L.whistle ?? 1, gAmt = L.gust ?? 1;   // cuánto silba y cuánto pegan las ráfagas (por isla)
      layer.update = (k0) => {
        const k = k0 * gAmt;
        const flutter = gAmt < 1 ? rnd(0.88, 1.06) : rnd(0.7, 1.15);   // aleteo: cambia cada 0,1 s, suavizado en ~0,12 s
        this._set(bp.frequency, L.lo * 1.4 + (L.hi - L.lo) * k, 0.4);
        this._set(g.gain, L.level * 0.55 * (0.35 + 0.8 * k) * flutter, 0.12);
        for (const w of whistles) {
          w.drift = Math.max(-0.12, Math.min(0.12, w.drift + rnd(-0.03, 0.03)));
          this._set(w.wbp.frequency, (L.lo + (L.hi - L.lo) * k) * w.ratio * (1 + w.drift), 0.25);
          this._set(w.wg.gain, L.level * 2.6 * wAmt * Math.pow(Math.max(0, k - 0.25) / 0.75, 1.4) * flutter, 0.15);
        }
      };
    } else if (L.kind === 'leaves') {
      // Antes: ruido blanco agudo continuo (sonaba a interferencia de televisor). Ahora: roces sueltos de
      // ruido rosa en la banda media (1–3 kHz), más frecuentes con las ráfagas; casi nada con el aire en calma.
      const lp = this._filter('lowpass', 4200, 0.5), g = this._gain(L.level);
      this._chain(lp, g, out); reg(lp, g);
      layer.update = (k, dt) => {
        const rate = 14 * Math.pow(Math.max(0, k - 0.2) / 0.8, 1.6) * dt;   // roces en este tick
        let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
        while (n-- > 0) this.rustle(lp, rnd(0.25, 1));
      };
    } else if (L.kind === 'whistle') {
      const s = this._noise('pink', 1);
      const bp = this._filter('bandpass', 800, 14), g = this._gain(0);
      this._chain(s, bp, g, out);
      layer.srcs.push(s); reg(bp, g);
      layer.update = (k) => { this._set(bp.frequency, 650 + 520 * k, 0.9); this._set(g.gain, L.level * 6 * k * k, 0.7); };
    } else if (L.kind === 'cicada') {
      // Ruido agudo pulsado a ~38 Hz, que sube y baja en tandas de 6–12 s
      const s = this._noise('white', 1);
      const bp = this._filter('bandpass', 5200, 3.5), am = this._gain(0.5), g = this._gain(0);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 38; const depth = this._gain(0.5);
      lfo.connect(depth); depth.connect(am.gain); lfo.start();
      this._chain(s, bp, am, g, out);
      layer.srcs.push(s, lfo); reg(bp, am, g, depth);
      layer.phase = Math.random() * 10; layer.on = false; layer.until = 0;
      layer.update = (k, dt) => {
        layer.until -= dt;
        if (layer.until <= 0) { layer.on = !layer.on; layer.until = layer.on ? rnd(6, 12) : rnd(3, 9); lfo.frequency.setTargetAtTime(rnd(32, 44), ctx.currentTime, 0.5); }
        this._set(g.gain, layer.on ? L.level : 0, layer.on ? 1.2 : 0.9);
      };
    } else if (L.kind === 'drone' || L.kind === 'choir') {
      // Acorde suave con vibrato lento; el coro usa formantes de «ah» y cambia de acorde cada 12–20 s
      const chords = L.kind === 'choir'
        ? [[220, 277.18, 329.63, 493.88], [185, 277.18, 369.99, 440], [146.83, 220, 293.66, 369.99]]
        : [L.notes];
      const lp = this._filter('lowpass', L.kind === 'choir' ? 1300 : 900, 0.5);
      const g = this._gain(0);
      let tail = lp;
      if (L.kind === 'choir') {
        const f1 = this._filter('peaking', 750, 2.5); f1.gain.value = 9;
        const f2 = this._filter('peaking', 1150, 3); f2.gain.value = 6;
        this._chain(lp, f1, f2); tail = f2;
      }
      this._chain(tail, g, out);
      reg(lp, g);
      const voices = [];
      for (let i = 0; i < 4; i++) for (const det of (L.kind === 'choir' ? [-6, 5] : [0])) {
        const o = ctx.createOscillator(); o.type = L.kind === 'choir' ? 'sawtooth' : 'sine';
        o.frequency.value = chords[0][i]; o.detune.value = det;
        const vg = this._gain(L.kind === 'choir' ? 0.07 : 0.22);
        const vib = ctx.createOscillator(); vib.frequency.value = rnd(0.15, 0.4); const vd = this._gain(rnd(3, 7));
        vib.connect(vd); vd.connect(o.detune); vib.start();
        o.connect(vg); vg.connect(lp); o.start();
        voices.push({ o, i }); layer.srcs.push(o, vib); reg(vg, vd);
      }
      layer.chord = 0; layer.until = rnd(12, 20);
      layer.update = (k, dt) => {
        this._set(g.gain, L.level * (0.85 + 0.3 * k), 1.5);
        if (chords.length < 2) return;
        layer.until -= dt;
        if (layer.until <= 0) {
          layer.chord = (layer.chord + 1) % chords.length; layer.until = rnd(12, 20);
          for (const v of voices) v.o.frequency.setTargetAtTime(chords[layer.chord][v.i], ctx.currentTime, 1.6);
        }
      };
    } else if (L.kind === 'air') {
      const s = this._noise('white', 1);
      const bp = this._filter('bandpass', 6500, 1.8), g = this._gain(0);
      this._chain(s, bp, g, out);
      layer.srcs.push(s); reg(bp, g);
      layer.update = (k) => this._set(g.gain, L.level * (0.5 + 0.6 * k), 1.0);
    } else {
      layer.update = () => {};
    }
    return layer;
  }

  _updateBed(dt) {
    const b = this.bed;
    if (!b) return;
    // Ráfagas irregulares (no un vaivén regular, que suena a olas): objetivo nuevo cada 1,5–6 s, subida más
    // rápida que la bajada, y a veces un golpe corto de aire encima.
    b.gustTimer -= dt;
    if (b.gustTimer <= 0) { b.gustT = Math.random() < 0.3 ? rnd(0.7, 1) : rnd(0.05, 0.55); b.gustTimer = rnd(1.5, 6); }
    const rate = b.gustT > b.gust ? 1.4 : 0.5;
    b.gust += (b.gustT - b.gust) * Math.min(1, dt * rate);
    if (Math.random() < dt * 0.15) b.gust = Math.min(1, b.gust + rnd(0.1, 0.25));
    for (const L of b.layers) L.update?.(b.gust, dt);
  }

  _stopLayers(group) {
    for (const L of group.layers || []) {
      for (const s of L.srcs) { try { s.stop(); } catch (_) { /* ya parada */ } try { s.disconnect(); } catch (_) { /* */ } }
      for (const n of L.nodes) { try { n.disconnect(); } catch (_) { /* */ } }
    }
    try { group.out?.disconnect(); } catch (_) { /* */ }
    try { group.g?.disconnect(); } catch (_) { /* */ }
  }

  _dropAll() {
    if (this.bed) { this._stopLayers(this.bed); this.bed = null; }
    this._clearEmitters();
    if (this.sea) { this._stopLayers(this.sea); this.sea = null; }
    this.island = null;
  }

  // ---------------------------------------------------------------- mar (detectado midiendo el terreno)
  _updateSea(P, om, dt) {
    const level = P.sea || 0;
    if (!level || typeof om?.getGroundHeight !== 'function') return;
    if ((this._seaTick -= dt) <= 0) {
      this._seaTick = 0.5;
      let hit = 0, tot = 0, px = 0, pz = 0;
      const { x, z } = this.listener;
      for (const [r, w] of [[10, 1], [24, 0.7], [44, 0.4]]) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + r * 0.01, sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r;
          let h; try { h = om.getGroundHeight(sx, sz); } catch (_) { h = 99; }
          tot += w;
          if (Number.isFinite(h) && h < SEA_LEVEL - 0.3) { hit += w; px += Math.cos(a) * w; pz += Math.sin(a) * w; }
        }
      }
      const amt = clamp01((hit / tot) * 2.2);
      this.seaAmt += (amt - this.seaAmt) * 0.5;
      this.seaPan = hit > 0 ? this._panTo(x + px, z + pz) : 0;
    }
    if (this.seaAmt > 0.02 && !this.sea) this.sea = this._makeSea();
    if (!this.sea) return;
    const S = this.sea;
    S.phase += dt / S.period;
    if (S.phase >= 1) { S.phase -= 1; S.period = rnd(6.5, 10); }
    // Ola: sube en ~40 % del ciclo y rompe; la espuma solo en la cresta
    const sw = S.phase < 0.4 ? S.phase / 0.4 : 1 - (S.phase - 0.4) / 0.6;
    const v = level * this.seaAmt * SEA_SOFT;
    if (S.file) { this._set(S.g.gain, v * 1.6, 0.6); this._set(S.pan.pan, this.seaPan, 0.5); }
    else {
    this._set(S.g.gain, v * (0.6 + 0.4 * sw), 0.6);
    this._set(S.lp.frequency, 360 + 600 * sw * sw, 0.6);
    this._set(S.foam.gain, v * 0.2 * Math.pow(Math.max(0, sw - 0.55) / 0.45, 2), 0.15);
    this._set(S.pan.pan, this.seaPan, 0.5);
    }
    if (P.gulls && this.seaAmt > 0.25) this._maybe('gull', [12, 28], () => this.gull());
  }

  _makeSea() {
    const rec = this._loop(SEA_FILE);
    if (rec) {
      const out = this._gain(1), pan = this.ctx.createStereoPanner(), g = this._gain(0), foam = this._gain(0), lp = this._filter('lowpass', 20000, 0.5);
      const src = this._loopSource(rec), rhp = this._filter('highpass', 80, 0.7);   // también sin subgraves
      this._chain(src, rhp, g, pan, out, this.out);
      return { file: true, out, g, lp, foam, pan, phase: 0, period: 8, layers: [{ srcs: [src], nodes: [rhp, g, pan, foam, lp] }] };
    }
    const out = this._gain(1), pan = this.ctx.createStereoPanner(), g = this._gain(0), foam = this._gain(0);
    // Sin graves profundos (paso alto doble a 120 Hz): el rumor de las olas está en 150–900 Hz; lo de abajo cansa el oído
    const s = this._noise('brown', 1), sh1 = this._filter('highpass', 120, 0.7), sh2 = this._filter('highpass', 120, 0.7), lp = this._filter('lowpass', 600, 0.6);
    const w = this._noise('pink', 1), hp = this._filter('highpass', 900, 0.6), flp = this._filter('lowpass', 4500, 0.5);
    this._chain(s, sh1, sh2, lp, g, pan); this._chain(w, hp, flp, foam, pan); this._chain(pan, out, this.out);
    return { out, g, lp, foam, pan, phase: Math.random(), period: rnd(6.5, 10), layers: [{ srcs: [s, w], nodes: [sh1, sh2, lp, hp, flp, g, foam, pan] }] };
  }

  // ---------------------------------------------------------------- fuentes con posición
  _emitterDistance(E) {
    const { x, z } = this.listener;
    if (E.kind === 'river') {
      if (z < -152 || z > 150) return { d: Infinity };
      let best = Infinity, bx = x, bz = z;
      for (let dz = -30; dz <= 30; dz += 3) {
        const zz = z + dz; if (zz < -152 || zz > 150) continue;
        const b = riverBounds(zz), dx = Math.max(0, Math.abs(x - b.cx) - b.hw);
        const d = Math.hypot(dx, dz);
        if (d < best) { best = d; bx = b.cx; bz = zz; }
      }
      return { d: best, x: bx, z: bz };
    }
    return { d: Math.hypot(x - E.x, z - E.z), x: E.x, z: E.z };
  }

  _updateEmitters(P, dt) {
    (P.emit || []).forEach((E, i) => {
      const { d, x, z } = this._emitterDistance(E);
      let live = this.emitters.get(i);
      if (d < E.r) {
        if (!live) { live = this._makeEmitter(E); this.emitters.set(i, live); }
        const near = clamp01(1 - d / E.r);
        live.near = near * near;
        live.x = x; live.z = z;
        this._set(live.g.gain, E.level * live.near, 0.4);
        this._set(live.pan.pan, this._panTo(x, z) * (0.4 + 0.6 * clamp01(d / 8)), 0.3);
        live.update?.(dt, live.near);
      } else if (live) {
        this._set(live.g.gain, 0, 0.4);
        if (d > E.r * 1.25) { const l = live; setTimeout(() => this._stopLayers(l), 1500); this.emitters.delete(i); }
      }
    });
  }

  _clearEmitters() {
    for (const live of this.emitters.values()) { this._set(live.g.gain, 0, 0.3); const l = live; setTimeout(() => this._stopLayers(l), 1500); }
    this.emitters.clear();
  }

  _makeEmitter(E) {
    const ctx = this.ctx;
    const g = this._gain(0), pan = ctx.createStereoPanner();
    this._chain(g, pan, this.out);
    const send = this._gain(0.25); g.connect(send); send.connect(this.reverb);
    const live = { E, g, pan, near: 0, layers: [{ srcs: [], nodes: [pan, send] }], out: g };
    const L = live.layers[0];
    const add = (src, ...nodes) => { L.srcs.push(src); L.nodes.push(...nodes); this._chain(src, ...nodes, g); };
    const rec = E.file && this._loop(E.file);
    if (rec) { live.file = true; add(this._loopSource(rec), this._gain(1)); return live; }
    if (E.kind === 'river' || E.kind === 'rapids' || E.kind === 'oasis') {
      // Antes: ruido blanco agudo con el volumen saltando 10 veces por segundo (sonaba a estática).
      // Ahora: cuerpo de ruido rosa por debajo de ~1,5 kHz + borboteo hecho de burbujas (tonos cortos que suben).
      const rapids = E.kind === 'rapids', oasis = E.kind === 'oasis';
      const s1 = this._noise('pink', 1);
      // Sin graves (son los que suenan a mar): el cuerpo del agua va de ~350 Hz a 2–3 kHz y manda el borboteo
      const hpw = this._filter('highpass', oasis ? 300 : rapids ? 280 : 380, 0.7);
      const lp = this._filter('lowpass', oasis ? 1400 : rapids ? 3000 : 2400, 0.5);
      const body = this._gain(oasis ? 0.35 : rapids ? 0.75 : 0.4);
      add(s1, hpw, lp, body);
      const bab = this._filter('lowpass', rapids ? 3200 : 2600, 0.5);
      const babG = this._gain(rapids ? 1.0 : 1.1);
      this._chain(bab, babG, g); L.nodes.push(bab, babG);
      const perSec = oasis ? 4 : rapids ? 45 : 26;
      live.update = (dt) => {
        if (oasis) { live.t = (live.t || 0) + dt; this._set(body.gain, 0.4 + 0.25 * Math.sin(live.t * 1.3), 0.5); }
        const rate = perSec * dt * (0.75 + Math.random() * 0.5);
        let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
        while (n-- > 0) this.waterBubble(bab, rapids);
      };
    } else if (E.kind === 'fire' || E.kind === 'flame') {
      const s = this._noise('brown', 1), fhp = this._filter('highpass', 100, 0.7), lp = this._filter('lowpass', 320, 0.7), rum = this._gain(0.8);
      add(s, fhp, lp, rum);   // sin subgraves
      if (E.kind === 'flame') {
        const o = ctx.createOscillator(); o.frequency.value = 220; const og = this._gain(0.06);
        const o2 = ctx.createOscillator(); o2.frequency.value = 330.6; const og2 = this._gain(0.04);
        add(o, og); add(o2, og2); o.start(); o2.start();
      }
      live.update = (dt, near) => { if (Math.random() < 0.55 * near + 0.1) this.crackle(live, rnd(0.4, 1)); if (Math.random() < 0.25) this.crackle(live, rnd(0.2, 0.5)); };
    } else if (E.kind === 'stew') {
      live.update = () => { if (Math.random() < 0.35) this.bubble(live, rnd(0.5, 1)); };
    } else if (E.kind === 'swamp') {
      const s = this._noise('pink', 1), lp = this._filter('lowpass', 500, 0.6), wat = this._gain(0.35);
      add(s, lp, wat);
      live.update = () => { if (Math.random() < 0.05) this.frog(live); if (Math.random() < 0.12) this.bubble(live, rnd(0.3, 0.7)); };
    } else if (E.kind === 'hum') {
      for (const f of E.notes || [146.83, 220]) {
        const o = ctx.createOscillator(); o.frequency.value = f; const o2 = ctx.createOscillator(); o2.frequency.value = f * 1.004;
        const og = this._gain(0.25); add(o, og); const og2 = this._gain(0.25); add(o2, og2); o.start(); o2.start();
      }
    } else if (E.kind === 'chimes') {
      live.update = () => { if (Math.random() < 0.03) this.chimes(live); };
    } else if (E.kind === 'anvil') {
      live.cool = rnd(1, 4);
      live.update = (dt) => { live.cool -= dt; if (live.cool <= 0) { live.cool = rnd(4, 9); const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) this.anvil(live, i * rnd(0.45, 0.6)); } };
    }
    return live;
  }

  // ---------------------------------------------------------------- sonidos sueltos
  _maybe(key, every, fn) {
    const now = this.ctx.currentTime;
    if (!this.next.has(key)) { this.next.set(key, now + rnd(every[0] * 0.3, every[1])); return; }
    if (now < this.next.get(key)) return;
    this.next.set(key, now + rnd(every[0], every[1]));
    fn();
  }

  _shots(P, rate) {
    for (const S of P.shots || []) {
      const every = [S.every[0] / rate, S.every[1] / rate];
      this._maybe(S.fn, every, () => this[S.fn]?.());
    }
  }

  /** Salida de un sonido suelto: paneado al azar (o hacia una fuente), con algo de reverberación. */
  _shotOut(vol, panV = rnd(-0.75, 0.75), wet = 0.35, dest = null) {
    const g = this._gain(vol), p = this.ctx.createStereoPanner();
    p.pan.value = panV;
    g.connect(p);
    if (dest) p.connect(dest);
    else { p.connect(this.out); const s = this._gain(wet); p.connect(s); s.connect(this.reverb); }
    return g;
  }

  _osc(type, f, t, dur, out, env = [0.005, 1, dur]) {
    const o = this.ctx.createOscillator(), g = this._gain(0);
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(env[1], t + env[0]);
    g.gain.exponentialRampToValueAtTime(0.0001, t + env[2]);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  _noiseBurst(t, dur, out, type, freq, q, vol) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise.white;
    const f = this._filter(type, freq, q), g = this._gain(0);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this._chain(s, f, g, out);
    s.start(t, Math.random() * 3); s.stop(t + dur + 0.02);
  }

  /** Pájaro cantor: frase de 3–7 notas con barridos rápidos. */
  songbird() {
    const t0 = this.ctx.currentTime, out = this._shotOut(rnd(0.05, 0.09));
    const n = 3 + Math.floor(Math.random() * 5), base = rnd(2300, 3800);
    let t = t0;
    for (let i = 0; i < n; i++) {
      const dur = rnd(0.04, 0.12), f0 = base * rnd(0.85, 1.25), f1 = f0 * rnd(0.7, 1.45);
      const o = this._osc('sine', f0, t, dur, out, [0.006, 1, dur]);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      t += dur + rnd(0.03, 0.09);
    }
  }

  /** Trino: notas muy cortas alternando dos alturas. */
  warble() {
    const t0 = this.ctx.currentTime, out = this._shotOut(rnd(0.04, 0.07));
    const a = rnd(3000, 3600), b = a * rnd(1.12, 1.22), n = 8 + Math.floor(Math.random() * 7);
    for (let i = 0; i < n; i++) this._osc('sine', i % 2 ? b : a, t0 + i * 0.045, 0.035, out, [0.004, 1, 0.035]);
  }

  /** Paloma: «cu-cuuu-cu» grave y suave. */
  dove() {
    const t0 = this.ctx.currentTime, lp = this._filter('lowpass', 1400, 0.6), out = this._shotOut(0.07, rnd(-0.8, 0.8), 0.5);
    lp.connect(out);
    const notes = [[0, 0.22, 520, 480], [0.32, 0.5, 560, 470], [0.95, 0.25, 500, 470]];
    for (const [d, dur, f0, f1] of notes) { const o = this._osc('sine', f0, t0 + d, dur, lp, [0.08, 1, dur]); o.frequency.exponentialRampToValueAtTime(f1, t0 + d + dur); }
  }

  /** Carpintero: golpes rápidos en la madera, lejos. */
  woodpecker() {
    const t0 = this.ctx.currentTime, out = this._shotOut(0.07, rnd(-0.8, 0.8), 0.6), n = 10 + Math.floor(Math.random() * 7);
    for (let i = 0; i < n; i++) this._noiseBurst(t0 + i * 0.055, 0.02, out, 'bandpass', 1300, 4, 1 - i / (n * 1.4));
  }

  /** Pájaro de la sabana: subidas rápidas con armónicos. */
  exotic() {
    const t0 = this.ctx.currentTime, out = this._shotOut(rnd(0.04, 0.07)), n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const t = t0 + i * rnd(0.14, 0.22); const o = this._osc('triangle', 1500, t, 0.12, out, [0.01, 1, 0.12]); o.frequency.exponentialRampToValueAtTime(rnd(3200, 4200), t + 0.11); }
  }

  /** Halcón lejano: grito largo que baja, con vibrato. */
  hawk() {
    const t = this.ctx.currentTime, lp = this._filter('lowpass', 3200, 0.5), out = this._shotOut(0.045, rnd(-0.8, 0.8), 0.9);
    lp.connect(out);
    const o = this._osc('sine', 2700, t, 1.0, lp, [0.05, 1, 1.0]);
    o.frequency.exponentialRampToValueAtTime(1500, t + 0.95);
    const v = this.ctx.createOscillator(), vd = this._gain(70); v.frequency.value = 7; v.connect(vd); vd.connect(o.frequency); v.start(t); v.stop(t + 1.05);
  }

  /** Crujido del hielo: barrido resonante grave y un chasquido. */
  iceCreak() {
    const t = this.ctx.currentTime, out = this._shotOut(rnd(0.10, 0.16), rnd(-0.8, 0.8), 0.7);
    const s = this.ctx.createBufferSource(); s.buffer = this.noise.white;
    const bp = this._filter('bandpass', 900, 9), g = this._gain(0);
    const dur = rnd(0.6, 1.2);
    bp.frequency.setValueAtTime(rnd(700, 1000), t); bp.frequency.exponentialRampToValueAtTime(rnd(140, 220), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this._chain(s, bp, g, out); s.start(t, Math.random() * 3); s.stop(t + dur + 0.05);
    this._noiseBurst(t + dur * rnd(0.3, 0.7), 0.03, out, 'highpass', 2500, 0.7, 0.6);
  }

  /** Pájaro de invierno: dos notas agudas y tres zumbadas. */
  snowbird() {
    const t = this.ctx.currentTime, lp = this._filter('lowpass', 5000, 0.5), out = this._shotOut(0.05);
    lp.connect(out);
    this._osc('sine', 4100, t, 0.06, lp); this._osc('sine', 3600, t + 0.1, 0.06, lp);
    for (let i = 0; i < 3; i++) this._osc('square', 2700, t + 0.26 + i * 0.13, 0.09, lp, [0.01, 0.35, 0.09]);
  }

  /** Aullido muy lejano (viento en las cumbres). */
  farHowl() {
    const t = this.ctx.currentTime, lp = this._filter('lowpass', 1100, 0.5), out = this._shotOut(0.03, rnd(-0.9, 0.9), 1.0);
    lp.connect(out);
    const o = this._osc('sine', 380, t, 2.6, lp, [0.6, 1, 2.6]);
    o.frequency.linearRampToValueAtTime(620, t + 1.0); o.frequency.linearRampToValueAtTime(460, t + 2.5);
  }

  /** Campanita de cristal con eco largo. */
  crystal() {
    const t = this.ctx.currentTime, out = this._shotOut(rnd(0.03, 0.05), rnd(-0.8, 0.8), 0.9), f = pick(PENTA) * 2;
    this._osc('sine', f, t, 2.4, out, [0.004, 1, 2.4]);
    this._osc('sine', f * 2.76, t, 1.2, out, [0.004, 0.3, 1.2]);
  }

  /** Destello de luciérnaga: un «tin» muy suave. */
  firefly() {
    const t = this.ctx.currentTime, out = this._shotOut(rnd(0.012, 0.025), rnd(-0.9, 0.9), 0.6);
    this._osc('sine', rnd(4200, 6400), t, 0.08, out, [0.003, 1, 0.08]);
  }

  /** Búho: «uu-uu». */
  owl() {
    const t = this.ctx.currentTime, lp = this._filter('lowpass', 900, 0.6), out = this._shotOut(0.06, rnd(-0.8, 0.8), 0.7);
    lp.connect(out);
    for (const d of [0, 0.55]) { const o = this._osc('sine', 390, t + d, 0.38, lp, [0.08, 1, 0.38]); o.frequency.exponentialRampToValueAtTime(345, t + d + 0.36); }
  }

  /** Pájaros del Jardín Real: frase melodiosa (trino + silbidos). */
  garden() {
    if (Math.random() < 0.5) this.warble();
    const t0 = this.ctx.currentTime + 0.3, out = this._shotOut(0.05);
    for (let i = 0; i < 3; i++) { const t = t0 + i * 0.22; const o = this._osc('sine', rnd(1700, 2300), t, 0.18, out, [0.02, 1, 0.18]); o.frequency.exponentialRampToValueAtTime(rnd(2400, 3100), t + 0.16); }
  }

  /** Campana lejana. */
  bell() {
    const t = this.ctx.currentTime, out = this._shotOut(0.035, rnd(-0.6, 0.6), 1.0), f = pick([392, 440, 523.25]);
    this._osc('sine', f, t, 3.5, out, [0.005, 1, 3.5]);
    this._osc('sine', f * 2.4, t, 1.8, out, [0.005, 0.35, 1.8]);
    this._osc('sine', f * 3.9, t, 1.0, out, [0.005, 0.15, 1.0]);
  }

  /** Gaviota: tres graznidos que bajan, hacia el lado del mar. */
  gull() {
    const t0 = this.ctx.currentTime, bp = this._filter('bandpass', 1700, 1.5), out = this._shotOut(0.05, this.seaPan * 0.8, 0.5);
    bp.connect(out);
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.28, o = this._osc('sawtooth', 1500 - i * 80, t, 0.22, bp, [0.02, 1, 0.22]);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.2);
      const v = this.ctx.createOscillator(), vd = this._gain(90); v.frequency.value = 17; v.connect(vd); vd.connect(o.frequency); v.start(t); v.stop(t + 0.25);
    }
  }

  /** Roce de hojas: ráfaga corta de ruido rosa en banda media, con su propio paneo. */
  rustle(dest, v) {
    const ctx = this.ctx, t = ctx.currentTime + Math.random() * 0.1;
    const s = ctx.createBufferSource(); s.buffer = this.noise.pink;
    const bp = this._filter('bandpass', rnd(1100, 2900), rnd(0.8, 1.6)), g = this._gain(0), p = ctx.createStereoPanner();
    p.pan.value = rnd(-0.8, 0.8);
    const a = rnd(0.03, 0.09), dur = a + rnd(0.12, 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this._chain(s, bp, g, p, dest);
    s.start(t, Math.random() * 5.5); s.stop(t + dur + 0.05);
  }

  /** Burbuja de agua: tono corto que sube (así borbotea el agua de verdad: burbujas que resuenan al romper). */
  waterBubble(dest, rapids) {
    const ctx = this.ctx, t = ctx.currentTime + Math.random() * 0.1;
    const f = rapids ? rnd(500, 1900) : rnd(550, 1700), dur = rnd(0.02, rapids ? 0.06 : 0.07);
    const o = ctx.createOscillator(), g = this._gain(0);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rnd(1.5, 2.3), t + dur);
    const v = rnd(0.04, 0.16);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Sonidos de las fuentes (salen por la fuente: su paneo y su volumen por distancia)
  crackle(live, v) {
    const t = this.ctx.currentTime + Math.random() * 0.09;
    this._noiseBurst(t, rnd(0.008, 0.03), live.g, 'highpass', rnd(1500, 4200), 0.8, v);
  }

  bubble(live, v) {
    const t = this.ctx.currentTime + Math.random() * 0.09, f = rnd(220, 380);
    const o = this._osc('sine', f, t, 0.06, live.g, [0.004, v * 0.5, 0.06]);
    o.frequency.exponentialRampToValueAtTime(f * rnd(2.2, 3.2), t + 0.05);
  }

  frog(live) {
    const t0 = this.ctx.currentTime, lp = this._filter('lowpass', 900, 0.8);
    lp.connect(live.g);
    const n = Math.random() < 0.4 ? 2 : 1, f = rnd(120, 180);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.3, o = this._osc('square', f, t, 0.24, lp, [0.02, 0.5, 0.24]);
      o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.22);
      const am = this.ctx.createOscillator(), ad = this._gain(f * 0.4); am.frequency.value = 26; am.connect(ad); ad.connect(o.frequency); am.start(t); am.stop(t + 0.26);
    }
  }

  chimes(live) {
    const t0 = this.ctx.currentTime, n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * rnd(0.12, 0.38), f = pick(PENTA) * 2;
      this._osc('sine', f, t, 1.6, live.g, [0.003, 0.5, 1.6]);
      this._osc('sine', f * 2.76, t, 0.6, live.g, [0.003, 0.15, 0.6]);
    }
  }

  anvil(live, delay) {
    const t = this.ctx.currentTime + delay, f = rnd(820, 880);
    for (const [r, a, d] of [[1, 0.6, 0.9], [2.62, 0.35, 0.6], [4.1, 0.2, 0.4], [5.93, 0.12, 0.25]]) this._osc('sine', f * r, t, d, live.g, [0.002, a, d]);
    this._noiseBurst(t, 0.03, live.g, 'highpass', 3000, 0.7, 0.8);
  }

  // ---------------------------------------------------------------- depuración
  /** Fuerza una isla y un modo (pruebas): force({ island: 'arctic', mode: 'world' }) · force(null). */
  force(f) { this.debug.force = f || null; }

  status() {
    const s = {
      modo: this.mode, isla: this.island, volumen: +(this.out?.gain.value || 0).toFixed(2),
      mar: +this.seaAmt.toFixed(2), fuentes: [...this.emitters.values()].map((l) => `${l.E.kind} ${(l.near * 100) | 0}%`),
      contexto: this.ctx?.state || 'sin iniciar',
      grabaciones: [...this.loops].map(([k, v]) => `${k}: ${v.state === 'ok' ? 'sí' : v.state === 'missing' ? 'no (sintetizado)' : 'cargando'}`).join(' · ') || '—',
    };
    console.table([s]);
    return s;
  }
}
