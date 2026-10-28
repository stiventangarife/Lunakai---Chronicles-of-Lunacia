// CombatSfx.js — Sonido del combate por clase y peso del golpe (Hito 88, fase 3 del plan de sonido).
//
// Escucha el bus CombatEvents (lo instala SpellPresentation, así «solo lógica» también lo apaga) y suena:
//   · ataque que sale: barrido de aire ligero o pesado según el coste en PA (1 ligero · 2 medio · 3+ pesado);
//   · golpe que llega: por la CLASE de quien golpea (bestia, planta, acuático, pájaro, bicho, reptil; el Sapidae y las
//     clases sin sonido propio, impacto mágico) y por su PESO (volumen, grave y un golpe sordo en los pesados);
//   · crítico (remate con brillo), escudo que para el golpe, escudo que se rompe, escudo nuevo;
//   · curación, potenciar, debilitar, aturdir o dormir, veneno, sangrado o quemadura por turno;
//   · unidad que cae (enemiga o aliada), Ultimate lista y Ultimate lanzada, aterrizaje de los saltos;
//   · reloj del turno en los últimos 5 s y latido suave mientras un aliado está por debajo del 25 % de vida;
//   · pasos al moverse por el tablero, con el suelo de la isla del combate (tus grabaciones de pasos).
// Cada sonido intenta primero la grabación (SfxBank, assets/sounds/sfx/combat/…) y si no, lo sintetiza.
// Consola: lkDebug.sfx('combate') · lunakaiCombatSfx.test('golpes' | 'efectos').

const rnd = (a, b) => a + Math.random() * (b - a);
const CLASSES = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile'];
const CLASS_ALIAS = { aqua: 'aquatic', mech: 'bug', dusk: 'reptile', dawn: 'bird' };
const BATTLE_SURFACE = { forest: 'grass', savanna: 'dirt', arctic: 'snow', mystic: 'grass', genesis: 'stone' };

/** Peso del golpe: 1 ligero, 2 medio, 3 pesado (Ultimate = 3). */
export function hitWeight(spell) {
  if (!spell) return 1;
  if (spell.isUltimate || spell.ultimate) return 3;
  const pa = Number(spell.paCost) || 1;
  return pa >= 3 ? 3 : pa >= 2 ? 2 : 1;
}

/** Clase de sonido de quien golpea: una de CLASSES o 'magic' (Sapidae, cartas sin clase). */
export function hitClass(unit) {
  if (!unit) return 'magic';
  if (unit.isSapidae || unit.config?.isSapidae) return 'magic';
  const c = String(unit.axieClass || unit.config?.axieClass || '').toLowerCase();
  const k = CLASS_ALIAS[c] || c;
  return CLASSES.includes(k) ? k : 'beast';
}

export class CombatSfx {
  constructor(audio) {
    this.audio = audio;
    this._last = new Map();      // evento → momento (para no amontonar el mismo sonido)
    this._beat = null;           // latido
    this._lastTick = -1;
    if (typeof window !== 'undefined') window.lunakaiCombatSfx = this;
  }

  get ctx() { return this.audio?.ctx || null; }
  get ok() { return Boolean(this.audio?.initialized && this.ctx && !this.audio.isMuted); }
  get bank() { return this.audio.world?.bank || null; }
  get bus() { return this.audio.masterGain; }

  /** true si el mismo evento sonó hace menos de `gap` s (evita capas repetidas en golpes de área). */
  _busy(key, gap) {
    const t = this.ctx.currentTime, l = this._last.get(key) || -1;
    if (t - l < gap) return true;
    this._last.set(key, t);
    return false;
  }

  _file(family, o = {}) { return Boolean(this.bank?.play(family, o)); }

  // ---------------------------------------------------------------- piezas de síntesis (ruido y tonos)
  _noise() {
    if (this._nb) return this._nb;
    const ctx = this.ctx, n = ctx.sampleRate;
    const b = ctx.createBuffer(1, n, n), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (this._nb = b);
  }

  /** Salida al bus de efectos. Hito 91 (mezcla): ×1,1 (antes ×0,8): los golpes quedaban bajo la música del combate. */
  _out(vol) { const g = this.ctx.createGain(); g.gain.value = vol * 1.1; g.connect(this.bus); return g; }

  _burst(dest, t, { type = 'bandpass', f = 1000, f1 = null, q = 1, a = 0.003, d = 0.08, v = 0.2 } = {}) {
    const ctx = this.ctx, s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this._noise(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    s.connect(flt); flt.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.8); s.stop(t + a + d + 0.03);
  }

  _tone(dest, t, { wave = 'sine', f = 440, f1 = null, a = 0.003, d = 0.12, v = 0.2 } = {}) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + d + 0.03);
    return o;
  }

  // ---------------------------------------------------------------- sonidos
  /** Ataque que sale (barrido de aire). Para cartas a distancia, curas y potenciar suena lo de siempre. */
  cast(caster, spell) {
    if (!this.ok || !spell) return false;
    const w = hitWeight(spell);
    const kind = spell.sound || 'melee';
    if (kind === 'heal') { this.heal(true); return true; }
    if (kind === 'buff') { this.buff(); return true; }
    if (kind !== 'melee') return false;                          // arco, empuje, explosión: el sonido de siempre
    const heavy = w >= 3;
    if (!caster?.isSapidae && this._file('creatures/axie_attack', { vol: 0.35, rate: 1 })) { /* grito corto del Axie */ }
    if (this._file(heavy ? 'combat/whoosh_heavy' : 'combat/whoosh_light', { vol: 0.5 + w * 0.1 })) return true;
    const t = this.ctx.currentTime, o = this._out(0.6 + w * 0.15);
    this._burst(o, t, { f: heavy ? 500 : 900, f1: heavy ? 1500 : 2600, q: 1.6, a: heavy ? 0.09 : 0.05, d: heavy ? 0.22 : 0.12, v: 0.22 });
    if (heavy) this._burst(o, t + 0.02, { type: 'lowpass', f: 400, a: 0.08, d: 0.2, v: 0.12 });
    return true;
  }

  /** Golpe que llega: por la clase de quien golpea y el peso de la carta. */
  hit(attacker, spell, { crit = false } = {}) {
    if (!this.ok || this._busy('hit', 0.05)) return;
    const cls = hitClass(attacker), w = hitWeight(spell);
    const vol = [0, 0.75, 0.95, 1.15][w], rate = [0, 1.08, 1, 0.86][w];
    if (!this._file(`combat/hit_${cls}`, { vol: vol * 0.55, rate })) this._hitSynth(cls, w, vol);
    if (w >= 3) { const t = this.ctx.currentTime, o = this._out(0.7); this._tone(o, t, { f: 130, f1: 75, d: 0.16, v: 0.28 }); } // golpe sordo de los pesados (sin subgraves)
    if (crit) this.crit();
  }

  _hitSynth(cls, w, vol) {
    const t = this.ctx.currentTime, o = this._out(vol), p = [0, 1.1, 1, 0.85][w] * rnd(0.94, 1.06);
    switch (cls) {
      case 'beast':     // golpe sordo, carnoso
        this._burst(o, t, { type: 'lowpass', f: 900 * p, q: 0.8, d: 0.09, v: 0.35 });
        this._tone(o, t, { f: 150 * p, f1: 75, d: 0.1, v: 0.3 });
        this._burst(o, t, { f: 2200, q: 1, a: 0.002, d: 0.025, v: 0.08 });
        break;
      case 'plant':     // latigazo vegetal y crujido de madera
        this._burst(o, t, { f: 3200 * p, f1: 900, q: 1.4, a: 0.002, d: 0.07, v: 0.22 });
        this._tone(o, t + 0.01, { wave: 'triangle', f: 520 * p, f1: 380, d: 0.06, v: 0.12 });
        for (let i = 0; i < 3; i++) this._burst(o, t + 0.03 + i * 0.018, { f: rnd(1500, 3000), q: 2, a: 0.002, d: 0.015, v: 0.07 });
        break;
      case 'aquatic':   // salpicadura con golpe
        this._burst(o, t, { f: 1400 * p, f1: 450, q: 0.9, a: 0.004, d: 0.22, v: 0.25 });
        this._tone(o, t, { f: 420 * p, f1: 130, d: 0.08, v: 0.2 });
        this._tone(o, t + 0.05, { f: 600 * p, f1: 1200, d: 0.05, v: 0.06 });
        break;
      case 'bird':      // barrido rápido con toque ligero
        this._burst(o, t - 0.0, { type: 'highpass', f: 1500, f1: 5000, q: 0.8, a: 0.02, d: 0.06, v: 0.12 });
        this._tone(o, t + 0.05, { f: 1250 * p, f1: 800, d: 0.05, v: 0.12 });
        this._burst(o, t + 0.05, { type: 'lowpass', f: 1200, d: 0.05, v: 0.15 });
        break;
      case 'bug':       // chasquido quitinoso
        for (let i = 0; i < 3; i++) this._burst(o, t + i * 0.022, { type: 'highpass', f: rnd(3000, 5000), q: 1, a: 0.001, d: 0.012, v: 0.14 });
        this._burst(o, t, { f: 1100 * p, q: 3, d: 0.05, v: 0.18 });
        this._tone(o, t, { f: 200 * p, f1: 110, d: 0.05, v: 0.15 });
        break;
      case 'reptile':   // mordisco con siseo
        this._burst(o, t, { type: 'highpass', f: 3200, q: 0.7, a: 0.01, d: 0.16, v: 0.1 });
        this._burst(o, t, { type: 'lowpass', f: 1000 * p, d: 0.06, v: 0.3 });
        this._tone(o, t, { f: 180 * p, f1: 90, d: 0.07, v: 0.22 });
        break;
      default:          // mágico (Sapidae)
        this._burst(o, t, { f: 1800 * p, f1: 600, q: 1.2, d: 0.12, v: 0.2 });
        this._tone(o, t, { f: 880 * p, d: 0.25, v: 0.07 });
        this._tone(o, t, { f: 1318 * p, d: 0.2, v: 0.05 });
        this._tone(o, t, { f: 220 * p, f1: 110, d: 0.08, v: 0.18 });
    }
  }

  crit() {
    if (!this.ok) return;
    if (this._file('combat/crit', { vol: 0.6 })) return;
    const t = this.ctx.currentTime + 0.04, o = this._out(1);
    [1568, 2093, 2637].forEach((f, i) => this._tone(o, t + i * 0.035, { f, d: 0.35, v: 0.06 }));
    this._burst(o, t, { type: 'highpass', f: 4000, a: 0.002, d: 0.08, v: 0.06 });
  }

  block() {
    if (!this.ok || this._busy('block', 0.06)) return;
    if (this._file('combat/block_shield', { vol: 0.55 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._tone(o, t, { f: 1900, d: 0.22, v: 0.08 }); this._tone(o, t, { f: 2850, d: 0.14, v: 0.05 });
    this._burst(o, t, { f: 3000, q: 2, a: 0.001, d: 0.03, v: 0.12 });
  }

  shieldBreak() {
    if (!this.ok || this._busy('break', 0.2)) return;
    if (this._file('combat/shield_break', { vol: 0.55 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    for (let i = 0; i < 7; i++) this._tone(o, t + rnd(0, 0.12), { f: rnd(2000, 4200), d: rnd(0.08, 0.2), v: 0.04 });
    this._burst(o, t, { type: 'highpass', f: 2500, a: 0.002, d: 0.2, v: 0.12 });
  }

  shieldUp() {
    if (!this.ok || this._busy('shieldUp', 0.15)) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._tone(o, t, { wave: 'triangle', f: 520, f1: 780, a: 0.02, d: 0.25, v: 0.08 });
    this._tone(o, t + 0.06, { f: 1560, d: 0.3, v: 0.04 });
  }

  heal(fromCast = false) {
    if (!this.ok || this._busy('heal', 0.25)) return;
    if (this._file('combat/heal', { vol: 0.5 })) return;
    if (fromCast) { this.audio.playHeal?.(); return; }
    const t = this.ctx.currentTime, o = this._out(1);
    [523.25, 659.25, 783.99].forEach((f, i) => this._tone(o, t + i * 0.07, { f, d: 0.4, v: 0.05 }));
  }

  buff() {
    if (!this.ok || this._busy('buff', 0.2)) return;
    if (this._file('combat/buff', { vol: 0.5 })) return;
    this.audio.playBuff?.();
  }

  debuff() {
    if (!this.ok || this._busy('debuff', 0.2)) return;
    if (this._file('combat/debuff', { vol: 0.5 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._tone(o, t, { wave: 'triangle', f: 520, f1: 260, a: 0.01, d: 0.35, v: 0.1 });
    this._tone(o, t + 0.05, { wave: 'triangle', f: 490, f1: 245, a: 0.01, d: 0.3, v: 0.06 });
  }

  stun() {
    if (!this.ok || this._busy('stun', 0.3)) return;
    if (this._file('combat/stun', { vol: 0.5 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    for (let i = 0; i < 5; i++) this._tone(o, t + i * 0.09, { f: i % 2 ? 1760 : 2093, d: 0.12, v: 0.05 });
  }

  dot(def) {
    if (!this.ok || this._busy('dot', 0.15)) return;
    if (this._file('combat/poison_tick', { vol: 0.45 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    if (def?.id === 'burn' || /burn|quem/i.test(def?.label || '')) this._burst(o, t, { type: 'highpass', f: 1800, a: 0.01, d: 0.18, v: 0.08 });
    else for (let i = 0; i < 3; i++) this._tone(o, t + i * 0.07, { f: rnd(250, 400), f1: rnd(700, 900), d: 0.05, v: 0.08 });
  }

  /** Unidad que cae: aliada (triste) o enemiga (quejido simpático). */
  faint(unit) {
    if (!this.ok) return;
    const ally = unit?.team === 'player';
    if (this._file(ally ? 'combat/faint_ally' : 'combat/faint_enemy', { vol: 0.55 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    if (ally) { this._tone(o, t, { wave: 'triangle', f: 440, d: 0.3, v: 0.1 }); this._tone(o, t + 0.28, { wave: 'triangle', f: 349.2, f1: 330, d: 0.6, v: 0.1 }); }
    else { this._tone(o, t, { wave: 'triangle', f: 700, f1: 260, a: 0.02, d: 0.45, v: 0.12 }); }
  }

  ultReady() {
    if (!this.ok || this._busy('ultReady', 1)) return;
    if (this._file('combat/ult_charge', { vol: 0.5 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._burst(o, t, { f: 400, f1: 3000, q: 2, a: 0.6, d: 0.3, v: 0.08 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(o, t + 0.3 + i * 0.08, { f, d: 0.5, v: 0.05 }));
  }

  ultImpact() {
    if (!this.ok || this._busy('ultImpact', 1)) return;
    if (this._file('combat/ult_impact', { vol: 0.6 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._tone(o, t, { f: 120, f1: 70, a: 0.005, d: 0.8, v: 0.32 });
    this._burst(o, t, { type: 'lowpass', f: 2000, f1: 300, a: 0.004, d: 0.8, v: 0.3 });
    [261.6, 392, 523.25].forEach((f) => this._tone(o, t, { wave: 'triangle', f, d: 1.2, v: 0.04 }));
  }

  land() {
    if (!this.ok) return;
    if (this._file('steps/land_soft', { vol: 0.5 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._burst(o, t, { type: 'lowpass', f: 700, a: 0.005, d: 0.12, v: 0.25 });
    this._tone(o, t, { f: 140, f1: 80, d: 0.1, v: 0.2 });
  }

  /** Reloj del turno: un tic por segundo en los últimos 5 s. */
  timerTick(remaining) {
    if (!this.ok) return;
    const s = Math.ceil(remaining);
    if (s > 5) { this._lastTick = -1; return; }
    if (s <= 0 || s === this._lastTick) return;
    this._lastTick = s;
    if (this._file('combat/turn_timer_tick', { vol: 0.45, jitter: 0 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._tone(o, t, { wave: 'square', f: s <= 2 ? 1600 : 1200, a: 0.001, d: 0.03, v: 0.05 });
  }

  /** Paso en el tablero, con el suelo de la isla del combate. */
  step(unit) {
    if (!this.ok) return false;
    const island = this.audio.ambience?.island;
    const surface = BATTLE_SURFACE[island] || 'grass';
    if (!this.audio.world?.footstep) return false;
    this.audio.world.footstep(surface, { axie: !unit?.isSapidae, run: false });
    return true;
  }

  /** Latido suave mientras un aliado vivo esté por debajo del 25 % de vida (se revisa con cada golpe y cura). */
  checkHeartbeat(sm) {
    if (!this.ok) return;
    const g = sm?.game || sm || (typeof window !== 'undefined' ? window.game : null);
    const units = g?.units || g?.turnManager?.units || [];
    const low = units.some((u) => u && u.team === 'player' && !u.isDead && u.maxHP > 0 && u.currentHP > 0 && u.currentHP / u.maxHP < 0.25);
    if (low && !this._beat) this._startBeat();
    if (!low && this._beat) this._stopBeat();
  }

  _startBeat() {
    const beat = () => {
      if (!this.ok || (typeof window !== 'undefined' && window.game && window.game.gameState !== 'BATTLE')) { this._stopBeat(); return; }
      if (this._file('combat/heartbeat', { vol: 0.35, jitter: 0 })) return;
      const t = this.ctx.currentTime, o = this._out(1);
      this._tone(o, t, { f: 95, f1: 70, a: 0.01, d: 0.12, v: 0.2 });
      this._tone(o, t + 0.22, { f: 90, f1: 68, a: 0.01, d: 0.14, v: 0.14 });
    };
    beat();
    this._beat = setInterval(beat, 950);
  }

  _stopBeat() { clearInterval(this._beat); this._beat = null; }

  // ---------------------------------------------------------------- eventos del combate
  /** Se suscribe al bus de CombatEvents. Devuelve las funciones para darse de baja. */
  install(events, sm = null) {
    const offs = [];
    const on = (e, fn) => offs.push(events.on(e, (p) => { try { fn(p || {}); } catch (err) { console.warn('[CombatSfx]', e, err); } }));
    on('unit:damaged', ({ unit, source, spell, actual, shieldAbsorbed, isCrit, plain, reflected }) => {
      if (plain && !reflected) return;                                   // daño de estado: lo suena status:tick
      if (shieldAbsorbed > 0 && !(actual > 0)) { this.block(); if (!(unit?.shield > 0)) this.shieldBreak(); }
      else if (actual > 0) {
        this.hit(source, spell, { crit: isCrit });
        if (shieldAbsorbed > 0 && !(unit?.shield > 0)) this.shieldBreak();
        if (unit && !unit.isSapidae && unit.team === 'player') this._file('creatures/axie_hurt', { vol: 0.3 });
      }
      this.checkHeartbeat(sm);
    });
    on('unit:healed', () => { this.heal(false); this.checkHeartbeat(sm); });
    on('unit:shielded', () => this.shieldUp());
    on('status:applied', ({ def }) => {
      if (def?.skipTurn) this.stun();
      else if (def?.kind === 'debuff') this.debuff();
      else this.buff();
    });
    on('status:tick', ({ damage, def }) => { if (damage > 0) this.dot(def); });
    on('ultimate:ready', () => this.ultReady());
    on('ultimate:used', () => this.ultImpact());
    on('spell:landing', () => this.land());
    return offs;
  }

  /** Consola: lunakaiCombatSfx.test('golpes' | 'efectos'). */
  test(what = 'golpes') {
    const seq = [];
    if (what === 'golpes') {
      for (const cls of [...CLASSES, 'magic']) {
        const u = cls === 'magic' ? { isSapidae: true } : { axieClass: cls };
        [1, 2, 3].forEach((pa) => seq.push(() => { this._last.clear(); this.cast(u, { sound: 'melee', paCost: pa }); setTimeout(() => { this._last.clear(); this.hit(u, { paCost: pa }); }, 160); }));
        seq.push(null);
      }
    } else {
      [() => this.crit(), null, () => this.block(), null, () => this.shieldBreak(), null, () => this.shieldUp(), null, () => this.heal(), null,
        () => this.buff(), null, () => this.debuff(), null, () => this.stun(), null, () => this.dot({}), null, () => this.dot({ id: 'burn' }), null,
        () => this.faint({ team: 'enemy' }), null, null, () => this.faint({ team: 'player' }), null, null, () => this.ultReady(), null, null, null,
        () => this.ultImpact(), null, null, null, () => this.land(), null, () => { this._lastTick = -1; this.timerTick(3); }, () => this.timerTick(2), () => this.timerTick(1)]
        .forEach((f) => seq.push(f ? () => { this._last.clear(); f(); } : null));
    }
    seq.forEach((fn, i) => fn && setTimeout(fn, i * 420));
    return seq.length;
  }
}
