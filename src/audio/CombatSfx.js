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
// Consola: lkDebug.sfx('combate') · lunakaiCombatSfx.test('golpes' | 'efectos' | 'skills' | 'sapidae' | 'enemigos' | 'estados' | 'ultimates').
//
// Fase 3 (sonido de las cartas de Axie, pack assets/sounds/sfx/skills/): cada carta suena con la clase del Axie que la
// lanza y su tipo de ataque (SkillSfxMap), sincronizada con su VFX:
//   · spell:cast    → si la carta tiene sonido cargado, se anota el lanzamiento y se calla el sonido antiguo;
//   · spell:windup  → a distancia (projectile/throw/cast): sale el ataque y empieza el vuelo; cuerpo a cuerpo
//                     (bite/gore/slash/smash): el ataque se programa para que su golpe caiga en el impacto del VFX (ti);
//   · spell:impact  → se corta el vuelo y suena el impacto (_hit) en las cartas de daño;
//   · unit:damaged  → no repite el golpe de clase (ya sonó); el crítico y el golpe sordo de los pesados siguen.
// Si una carta no tiene sonido (o aún no ha cargado), todo sigue como antes (síntesis y sonidos de siempre).
//
// Fase 4 (lo que el pack no trae): el Sapidae suena con el timbre de una clase de Axie afín más una firma sintetizada
// por clase (_layer: arcilla, llamada, campana, roca, estrella, luna); los gólems con summon_on/summon_off y su firma;
// las 3 Ultimates con un guion sobre su VFX (_ultCue: subida, viaje, golpe en ti, capas sintetizadas); los estados,
// curas, escudos, limpiezas, críticos, contraataques, PA y runas con los sonidos de estado del pack (SkillSfxMap).
// Todo lo que no esté cargado aún sigue con su síntesis de siempre y se carga para la próxima vez.
//
// Hito 108 (enemigos): sus habilidades suenan igual que las del Sapidae (ENEMY_SFX): timbre de una clase de Axie afín a
// la criatura, firma de criatura (gruñido, rugido, aullido, baba, hielo, terremoto) y un golpe genérico del pack
// (liquid_hit, sharp_edged_hit, tackle, fuzzy_hit, laser_hit) que refuerza el impacto.

import { skillSfx, effectKeys, ultimateKeys, STATUS_SFX, STATUS_TICK_SFX, EVENT_SFX, GOLEM_SFX, ULTIMATE_SFX, SOUND_CLASSES } from './SkillSfxMap.js';
import { SkillSfxBank } from './SkillSfxBank.js';

/** Niveles de los sonidos de habilidades en el bus de efectos (medidos frente a la síntesis, Hito 91). */
// Fase 5 (mezcla final), medido en Chromium con el bus real (General 100, Música 75, Efectos 80, compresor) y la música
// del combate con su nivel de Opciones (BATTLE y BATTLE_BOSS: −24 LUFS de mediana momentánea, −22,4 el 10 % más fuerte):
//   · cartas de 2 PA → ~−21 LUFS momentáneos máximos (+3 dB sobre la música: el golpe se oye sin taparla);
//   · Sapidae y enemigos (3–5 PA) → −18 a −21 · estados, curas y escudos → ~−24 (al nivel de la música, son tonales);
//   · Ultimates → ~−16, con la música atenuada 6 dB mientras dura su guion (_duckMusic).
// Antes (fases 3 y 4) las cartas quedaban a −26, 2 dB por debajo de la música: se perdían bajo ella.
const SKILL_MIX = { attack: 0.44, hit: 0.44, fly: 0.35, support: 0.35 };
// Fase 4: estados, curas, escudos y otros momentos con sonido del pack (archivos a −20 LUFS), y Ultimates.
// Medido en Chromium (bus real): estados ~−28 LUFS momentáneos (bajo las cartas, −26); Ultimates ~−19 (el momento más
// fuerte del combate; pico ~−4 dBTP, el compresor del bus lo sujeta); Sapidae con su firma ~−23 a −26.
const FX_MIX = { status: 0.35, tick: 0.19, event: 0.35, crit: 0.38, minor: 0.2, ult: 0.34 };
/** Ganancia de las firmas sintetizadas (_layer) y de las capas de la Ultimate, al mismo nivel que los archivos. */
const LAYER_GAIN = 1.6;
const ULT_SYNTH_GAIN = 1.4;
/** Atenuación de la música durante una Ultimate: −6 dB, entra en 0,25 s y sale en 0,8 s tras el impacto. */
const ULT_DUCK = { depth: 0.5, attack: 0.25, release: 0.8 };
/** Eventos que siempre se precargan con el combate (salen en casi todos). */
const COMMON_KEYS = ['critical', 'shield', 'shield_break', 'heal', 'cure', 'buff', 'debuff', 'counter', 'power_gain', 'silent', 'doubt', 'hit_normal', 'normal_hit'];
/** Firmas que suenan en el impacto (lo que pasa en el suelo); el resto, al lanzar. */
const LAYER_AT_IMPACT = new Set(['clay', 'rumble', 'slime', 'frost', 'quake']);
const SKILL_W_VOL = [0, 0.85, 1, 1.12];      // por peso de la carta (1, 2, 3+ PA)
const SKILL_W_RATE = [0, 1.03, 1, 0.95];

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
    this.skills = new SkillSfxBank(audio);   // fase 3: sonidos de las cartas
    this._sk = null;             // lanzamiento en curso con sonido de carta
    this._ultAxie = null;        // Axie del dúo (para el color de la Ultimate)
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
    if (this._skillCast(caster, spell)) return true;             // fase 3: la carta suena en windup / impact
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

  // ---------------------------------------------------------------- fase 3: sonido de las cartas
  /** Precarga los sonidos de las cartas de estas unidades (al empezar el combate, detrás del velo). */
  prepareSkills(units, spellManager) {
    const keys = [];
    for (const u of units || []) {
      if (!u || u.isGolem) continue;
      for (const sid of u.spellIds || []) {
        const spell = spellManager?.getSpell?.(sid, u);
        const s = skillSfx(spell, u);
        if (s) keys.push(s.attack, s.fly, s.hit, s.extra);
        keys.push(...effectKeys(spell));                       // fase 4: estados, curas, escudos… de sus efectos
      }
    }
    // fase 4: Ultimate del dúo (si la hay) y eventos comunes
    const ult = spellManager?.ultimates;
    if (ult?.spell) keys.push(...ultimateKeys(ult.spell.id, this._classOf(ult.axie)));
    keys.push(...COMMON_KEYS);
    return this.skills.prepare(keys.filter(Boolean));
  }

  // ---------------------------------------------------------------- fase 5: recorrido y diagnóstico
  /** Carga lo que puede sonar al lanzar este hechizo (recorrido de VFX: cada carta suena ya con su sonido). */
  loadFor(spell, caster = null) {
    if (!spell) return Promise.resolve(0);
    const keys = [...effectKeys(spell)];
    if (spell.isUltimate) keys.push(...ultimateKeys(spell.id, this._classOf(this._ultAxie || caster)));
    const s = skillSfx(spell, caster);
    if (s) keys.push(s.attack, s.fly, s.hit, s.extra);
    if (/^golem_/.test(spell.id || '')) keys.push(EVENT_SFX.summon, EVENT_SFX.unsummon);
    return this.skills.load(keys.filter(Boolean));
  }

  /** Qué suena con este hechizo, en una línea (panel del recorrido y lkDebug.sfx('skill', id)). */
  describe(spell, caster = null) {
    if (!spell) return '—';
    if (spell.isUltimate && ULTIMATE_SFX[spell.id]) return `Ultimate · guion propio (${this._classOf(this._ultAxie || caster)})`;
    const g = /^golem_(pulse|break)_(\w+)/.exec(spell.id || '');
    if (g) return `gólem · ${g[1] === 'break' ? 'summon_off' : 'pulso'} + ${GOLEM_SFX[g[2]]?.layer || '—'}`;
    const k = this._spellNoWindup(spell) ? null : skillSfx(spell, caster);
    if (!k) return 'sonido de siempre (sintetizado)';
    return [`${k.cls} · ${k.anim}`, k.fly && 'vuelo', k.hit && 'impacto', k.layer && `firma ${k.layer}`, k.extra, k.role === 'support' && 'apoyo']
      .filter(Boolean).join(' + ');
  }

  /**
   * Recorrido de VFX: los enemigos, las Ultimates y los gólems solo reproducen su efecto (sin pasar por el combate).
   * Espera a que el efecto arranque en el puente de VFX y suena igual que en combate, con su ti.
   */
  previewWhenPlaying(kind, id, bridge, caster = null) {
    if (!this.ok) return;
    const t0 = performance.now();
    const poll = () => {
      const ab = bridge?.current?.ab;
      if (!ab && performance.now() - t0 < 4000) { setTimeout(poll, 16); return; }
      const ti = ab?.ti || 0.6;
      if (kind === 'golem') {
        const [, ev, g] = /^golem_(pulse|break)_(\w+)/.exec(id) || [];
        setTimeout(() => this.golem(ev === 'break' ? 'break' : 'pulse', g), ti * 1000);
        return;
      }
      const spell = kind === 'ultimate' ? { id, isUltimate: true, paCost: 2 } : { id, paCost: 3 };
      const c = caster || { team: 'enemy' };
      if (!this._skillCast(c, spell)) return;
      this._skillWindup({ caster: c, spell, vfx: { untilImpact: true, ti } });
      setTimeout(() => { this._skillImpact({ caster: c, spell }); this._endSkill(); }, ti * 1000);
    };
    poll();
  }

  _spellNoWindup(spell) {
    return Boolean(spell.isBarricade || spell.isTranspose || spell.isPackHowl || (spell.targetType === 'empty' && !Array.isArray(spell.effects)));
  }

  /** spell:cast. true si la carta tiene su sonido listo (y entonces el sonido antiguo no suena). */
  _skillCast(caster, spell) {
    this._endSkill();
    const ult = spell?.isUltimate && ULTIMATE_SFX[spell.id];
    if (ult) {            // fase 4: guion de la Ultimate (las capas sintetizadas suenan aunque falten archivos)
      const axie = this._ultAxie || (typeof window !== 'undefined' ? window.game?.spellManager?.ultimates?.axie : null);
      const cls = this._classOf(axie);
      this.skills.load(ultimateKeys(spell.id, cls));
      this._sk = { ult, cls, caster, id: spell.id, w: 3, melee: true, role: 'attack', impacted: false, hitDone: true };
      return true;
    }
    // Saltos, barricadas, transposiciones y aullidos de manada no pasan por spell:windup: sonido de siempre
    if (!spell || this._spellNoWindup(spell)) return false;
    const s = skillSfx(spell, caster);
    if (!s) return false;
    if (!this.skills.ready(s.attack)) { this.skills.load([s.attack, s.fly, s.hit, s.extra]); return false; }   // la próxima vez
    this._sk = { ...s, flyKey: s.fly, fly: null, caster, id: spell.id, w: hitWeight(spell), impacted: false, hitDone: false };
    return true;
  }

  /** spell:windup: sale el ataque. ti = segundos hasta el impacto del VFX (0 si no hay VFX: el impacto es inmediato). */
  _skillWindup({ caster, spell, vfx }) {
    const sk = this._sk;
    if (!sk || !this.ok || caster !== sk.caster || spell?.id !== sk.id) return;
    const ctx = this.ctx, now = ctx.currentTime, bank = this.skills;
    const ti = vfx && vfx.untilImpact ? Math.max(0, Number(vfx.ti) || 0) : 0;
    if (sk.ult) { this._ultCue(sk, ti || sk.ult.ti); return; }
    // fase 4: firma sintetizada del Sapidae (en el impacto si es algo del suelo; si no, al lanzar)
    if (sk.layer) this._layer(sk.layer, now + (LAYER_AT_IMPACT.has(sk.layer) ? ti : 0.02), 0.7);
    const vol = SKILL_W_VOL[sk.w] * (sk.role === 'support' ? SKILL_MIX.support : SKILL_MIX.attack);
    const rate = SKILL_W_RATE[sk.w];
    if (sk.melee) {
      // el golpe del archivo (su pico) cae en ti; si ti es menor que la entrada del archivo, se empieza más adelante en él
      const lead = ti - bank.peakOf(sk.attack) / rate;
      const h = bank.play(sk.attack, { when: now + Math.max(0, lead), offset: Math.max(0, -lead) * rate, vol, rate });
      // enemigos: golpe genérico del pack que refuerza el impacto (en ti, alineado por su arranque)
      if (sk.extra) bank.play(sk.extra, { when: now + ti, offset: Math.min(0.1, Math.max(0, bank.peakOf(sk.extra) - 0.008)), vol: SKILL_MIX.hit * 0.6 });
      // criatura o golpe que cruza el tablero antes de llegar (Foxy, Jaguar, Risky Fish…): vuelo hasta el ataque
      if (h && sk.flyKey && lead > 0.3) {
        const f = bank.play(sk.flyKey, { when: now + 0.04, vol: SKILL_MIX.fly * SKILL_W_VOL[sk.w], rate });
        bank.fadeOut(f, h.when + 0.08, 0.08);
      }
    } else {
      bank.play(sk.attack, { vol, rate });
      // vuelo: desde que sale el disparo hasta el impacto (lo corta spell:impact; si el VFX no da ti, igual)
      if (sk.flyKey && (ti === 0 || ti > 0.3)) sk.fly = bank.play(sk.flyKey, { when: now + 0.1, vol: SKILL_MIX.fly * SKILL_W_VOL[sk.w], rate });
    }
  }

  /** spell:impact: corta el vuelo y suena el impacto (cartas de daño a distancia o mágicas). */
  _skillImpact({ caster, spell }) {
    const sk = this._sk;
    if (!sk || caster !== sk.caster || spell?.id !== sk.id || sk.impacted) return;
    sk.impacted = true;
    if (sk.fly && !sk.melee) { this.skills.fadeOut(sk.fly, null, 0.06); sk.fly = null; }
    if (!this.ok || sk.melee || sk.role !== 'attack' || !sk.hit) return;
    // el impacto del archivo (su pico, tras unos ms de subida) cae justo en el impacto del VFX
    const off = Math.min(0.15, Math.max(0, this.skills.peakOf(sk.hit) - 0.012));
    sk.hitDone = Boolean(this.skills.play(sk.hit, { offset: off, vol: SKILL_W_VOL[sk.w] * SKILL_MIX.hit, rate: SKILL_W_RATE[sk.w] }));
    if (sk.extra) this.skills.play(sk.extra, { offset: Math.min(0.1, Math.max(0, this.skills.peakOf(sk.extra) - 0.008)), vol: SKILL_MIX.hit * 0.6 });
  }

  /** ¿El golpe de este daño ya lo dio la carta? (para no repetir el golpe de clase). */
  _skillHandledHit(source, spell) {
    const sk = this._sk;
    return Boolean(sk && spell && spell.id === sk.id && source === sk.caster && (sk.melee || sk.hitDone));
  }

  _endSkill() {
    if (this._sk?.fly) this.skills.fadeOut(this._sk.fly, null, 0.06);
    this._sk = null;
  }

  // ---------------------------------------------------------------- fase 4: estados, gólems, firmas y Ultimates
  /** Toca un sonido del pack si ya está cargado; si no, lo pide para la próxima vez y devuelve false (síntesis). */
  _pack(key, vol, o = {}) {
    if (!this.ok || !key) return false;
    if (this.skills.ready(key)) return Boolean(this.skills.play(key, { vol, ...o }));
    this.skills.load([key]);
    return false;
  }

  _classOf(unit) {
    const c = String(unit?.axieClass || unit?.config?.axieClass || '').toLowerCase();
    const k = c === 'aqua' ? 'aquatic' : c;
    return SOUND_CLASSES.includes(k) ? k : 'beast';
  }

  /** Estado aplicado: su sonido del pack; si no lo hay (o no ha cargado), el sintetizado de siempre. */
  statusApplied(id, def) {
    if (!this.ok) return;
    const k = STATUS_SFX[id];
    if (k !== null && !this._busy('status', 0.12)) {
      const key = k || (def?.kind === 'debuff' ? EVENT_SFX.debuff : EVENT_SFX.buff);
      if (this._pack(key, FX_MIX.status)) return;
    }
    if (def?.skipTurn) this.stun();
    else if (def?.kind === 'debuff') this.debuff();
    else this.buff();
  }

  /** Esquiva (runas): barrido de aire corto y ligero. */
  evade() {
    if (!this.ok || this._busy('evade', 0.2)) return;
    const t = this.ctx.currentTime, o = this._out(0.8);
    this._burst(o, t, { f: 1400, f1: 4200, q: 1.4, a: 0.03, d: 0.12, v: 0.16 });
    this._tone(o, t + 0.05, { f: 1760, f1: 2350, d: 0.08, v: 0.03 });
  }

  /** Gólems: invocación (summon_on), rotura (summon_off), retirada (más bajo) y pulso de fin de turno, con su firma. */
  golem(ev, kind) {
    if (!this.ok || this._busy(`golem_${ev}`, 0.3)) return;
    const g = GOLEM_SFX[kind] || GOLEM_SFX.sentinel, t = this.ctx.currentTime;
    if (ev === 'summon') { this._pack(EVENT_SFX.summon, FX_MIX.event); this._layer(g.layer, t + 0.05); }
    else if (ev === 'break') { this._pack(EVENT_SFX.unsummon, FX_MIX.event); this._layer(g.layer, t, 0.8); }
    else if (ev === 'retire') this._pack(EVENT_SFX.unsummon, FX_MIX.minor);
    else if (ev === 'pulse') this._layer(g.layer, t, 0.7);
  }

  /** Ruido largo (en bucle) para subidas y truenos de más de 1 s. */
  _noiseLong(dest, t, { type = 'bandpass', f = 800, f1 = null, q = 1, a = 0.01, d = 1, v = 0.1 } = {}) {
    const ctx = this.ctx, s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this._noise(); s.loop = true; flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    s.connect(flt); flt.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.05);
  }

  /** Campana inarmónica (parciales de campana de bronce). */
  _bell(dest, t, f0, v, len = 1.3) {
    [[1, 1, 1], [2, 0.45, 0.75], [2.76, 0.5, 0.6], [5.4, 0.22, 0.35], [8.93, 0.1, 0.2]]
      .forEach(([r, amp, dec]) => this._tone(dest, t, { f: f0 * r, a: 0.002, d: len * dec, v: v * amp }));
    this._burst(dest, t, { f: Math.min(9000, f0 * 4), q: 3, a: 0.001, d: 0.012, v: v * 0.6 });
  }

  /**
   * Firmas sintetizadas (Sapidae, gólems y Ultimates). v = volumen relativo.
   * clay: golpe de barro y terrones · call: silbato de orden · bell: Wind Bell · moon: campana grave de la Luna de Sangre
   * rumble: la piedra que retumba · star: chispas del alba · chord: acorde de cúpula · thunder: relámpago
   */
  _layer(kind, t, v = 1) {
    if (!this.ok || !kind) return;
    t = Math.max(this.ctx.currentTime, t);
    const o = this._out(v * LAYER_GAIN);
    switch (kind) {
      case 'clay':
        this._tone(o, t, { f: 150, f1: 62, a: 0.004, d: 0.2, v: 0.32 });
        this._burst(o, t, { type: 'lowpass', f: 900, f1: 220, a: 0.004, d: 0.16, v: 0.24 });
        for (let i = 0; i < 5; i++) this._burst(o, t + 0.05 + i * rnd(0.025, 0.05), { f: rnd(900, 2200), q: 2.5, a: 0.002, d: 0.025, v: 0.07 });
        break;
      case 'call':
        this._tone(o, t, { wave: 'triangle', f: 1175, a: 0.012, d: 0.09, v: 0.08 });
        this._tone(o, t + 0.11, { wave: 'triangle', f: 1760, f1: 1740, a: 0.012, d: 0.16, v: 0.08 });
        this._burst(o, t, { type: 'highpass', f: 3500, a: 0.01, d: 0.22, v: 0.025 });
        break;
      case 'bell': this._bell(o, t, 1046.5, 0.07); break;
      case 'moon':
        this._bell(o, t, 392, 0.08, 1.8);
        this._tone(o, t, { f: 98, a: 0.25, d: 1.3, v: 0.09 });
        break;
      case 'rumble':
        this._noiseLong(o, t, { type: 'lowpass', f: 260, f1: 90, q: 0.7, a: 0.06, d: 0.5, v: 0.3 });
        this._tone(o, t, { f: 72, f1: 52, a: 0.05, d: 0.45, v: 0.12 });
        for (let i = 0; i < 3; i++) this._burst(o, t + 0.08 + i * rnd(0.05, 0.1), { f: rnd(1200, 2600), q: 3, a: 0.002, d: 0.02, v: 0.05 });
        break;
      case 'star':
        [1568, 2093, 2637, 3136].forEach((f, i) => this._tone(o, t + i * 0.05, { f, d: 0.35, v: 0.04 }));
        this._burst(o, t, { type: 'highpass', f: 5000, a: 0.05, d: 0.3, v: 0.03 });
        break;
      case 'chord':
        [261.6, 329.6, 392, 523.25].forEach((f, i) => this._tone(o, t + i * 0.03, { wave: 'triangle', f, a: 0.08, d: 1.5, v: 0.045 }));
        break;
      case 'thunder':
        this._burst(o, t, { type: 'highpass', f: 2500, a: 0.002, d: 0.12, v: 0.22 });
        this._noiseLong(o, t + 0.02, { type: 'lowpass', f: 500, f1: 80, q: 0.6, a: 0.01, d: 1.1, v: 0.28 });
        break;
      case 'growl': {        // gruñido corto de criatura (dos sierras graves desafinadas por un filtro que se cierra)
        const ctx = this.ctx, f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(750, t); f.frequency.exponentialRampToValueAtTime(380, t + 0.35);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
        f.connect(g); g.connect(o);
        [92, 95.5].forEach((hz) => { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.setValueAtTime(hz, t); s.frequency.linearRampToValueAtTime(hz * 0.85, t + 0.35); s.connect(f); s.start(t); s.stop(t + 0.42); });
        this._burst(o, t, { f: 450, q: 1, a: 0.03, d: 0.3, v: 0.05 });
        break;
      }
      case 'roar': {         // rugido: más largo, el filtro se abre y se cierra (la boca)
        const ctx = this.ctx, f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'lowpass'; f.Q.value = 3; f.frequency.setValueAtTime(300, t);
        f.frequency.exponentialRampToValueAtTime(1300, t + 0.25); f.frequency.exponentialRampToValueAtTime(380, t + 0.9);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        f.connect(g); g.connect(o);
        [70, 72.5, 106].forEach((hz) => { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.setValueAtTime(hz, t); s.frequency.linearRampToValueAtTime(hz * 0.88, t + 0.9); s.connect(f); s.start(t); s.stop(t + 1); });
        this._noiseLong(o, t, { f: 650, f1: 300, q: 0.9, a: 0.08, d: 0.85, v: 0.07 });
        break;
      }
      case 'howl': {         // aullido: tono que sube, se sostiene con vibrato y cae
        const ctx = this.ctx, s = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
        s.type = 'triangle'; s.frequency.setValueAtTime(330, t); s.frequency.exponentialRampToValueAtTime(560, t + 0.35);
        s.frequency.setValueAtTime(560, t + 0.75); s.frequency.exponentialRampToValueAtTime(400, t + 1.25);
        lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg); lg.connect(s.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.2); g.gain.setValueAtTime(0.06, t + 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
        s.connect(g); g.connect(o); s.start(t); lfo.start(t); s.stop(t + 1.35); lfo.stop(t + 1.35);
        this._noiseLong(o, t, { type: 'highpass', f: 1800, q: 0.7, a: 0.2, d: 1, v: 0.012 });
        break;
      }
      case 'slime':          // boing viscoso y chapoteo
        this._tone(o, t, { f: 520, f1: 170, a: 0.004, d: 0.18, v: 0.12 });
        this._burst(o, t, { type: 'lowpass', f: 1400, f1: 400, q: 1.5, a: 0.003, d: 0.14, v: 0.12 });
        for (let i = 0; i < 3; i++) this._tone(o, t + 0.06 + i * rnd(0.03, 0.06), { f: rnd(500, 900), f1: rnd(1100, 1600), d: 0.04, v: 0.04 });
        break;
      case 'frost':          // cristales de hielo y crujido
        [2637, 3520, 4186].forEach((hz, i) => this._tone(o, t + i * 0.035, { f: hz, d: 0.4, v: 0.035 }));
        for (let i = 0; i < 4; i++) this._burst(o, t + rnd(0, 0.15), { type: 'highpass', f: rnd(3500, 6000), q: 1, a: 0.001, d: 0.02, v: 0.06 });
        this._burst(o, t, { type: 'highpass', f: 5000, a: 0.02, d: 0.35, v: 0.03 });
        break;
      case 'quake':          // terremoto: retumbo y golpe grave
        this._layer('rumble', t, 1);
        this._tone(o, t, { f: 90, f1: 55, a: 0.01, d: 0.7, v: 0.22 });
        this._noiseLong(o, t, { type: 'lowpass', f: 900, f1: 120, q: 0.6, a: 0.005, d: 0.8, v: 0.18 });
        break;
      default: break;
    }
  }

  /**
   * Atenúa la música (un <audio>, MusicManager) durante `hold` segundos y la devuelve a su nivel de Opciones.
   * Se calcula siempre desde masterVolume × currentVolumeMultiplier, así que un cambio de pista o de volumen a mitad
   * no deja la música baja. Pasos de 30 ms (sin saltos audibles); otra atenuación en curso se reemplaza.
   */
  _duckMusic(hold) {
    const m = this.audio?.music;
    if (!m || typeof window === 'undefined') return;
    clearInterval(this._duckTimer);
    const level = () => (m.isMuted ? 0 : m.masterVolume * m.currentVolumeMultiplier);
    const t0 = performance.now(), { depth, attack, release } = ULT_DUCK;
    this._duckTimer = setInterval(() => {
      const a = m.currentAudio, t = (performance.now() - t0) / 1000;
      if (!a) return;
      let k;
      if (t < attack) k = 1 - (1 - depth) * (t / attack);
      else if (t < attack + hold) k = depth;
      else if (t < attack + hold + release) k = depth + (1 - depth) * ((t - attack - hold) / release);
      else { a.volume = Math.min(1, level()); clearInterval(this._duckTimer); this._duckTimer = null; return; }
      a.volume = Math.min(1, level() * k);
    }, 30);
  }

  /**
   * Guion de una Ultimate sobre su VFX: subida desde el lanzamiento, sonidos de la fase central, golpes que caen en el
   * impacto (ti) y capas sintetizadas. Lo que no esté cargado se salta: las capas sintetizadas sostienen el conjunto.
   */
  _ultCue(sk, ti) {
    const u = sk.ult, bank = this.skills, now = this.ctx.currentTime, V = FX_MIX.ult;
    const fill = (k) => k.replace('{c}', sk.cls);
    const at = now + ti;
    u.rise.forEach((k) => bank.play(fill(k), { vol: V * 0.8 }));
    u.travel.forEach(({ key, at: a, vol = 1 }) => {
      if (a >= ti) return;
      const h = bank.play(fill(key), { when: now + a, vol: V * 0.75 * vol });
      bank.fadeOut(h, at + 0.04, 0.08);
    });
    u.strike.forEach((k) => {
      const lead = ti - bank.peakOf(fill(k));
      bank.play(fill(k), { when: now + Math.max(0, lead), offset: Math.max(0, -lead), vol: V });
    });
    u.impact.forEach((k) => bank.play(fill(k), { when: at, offset: Math.min(0.15, Math.max(0, bank.peakOf(fill(k)) - 0.012)), vol: V * 0.85 }));
    const o = this._out(ULT_SYNTH_GAIN);
    this._duckMusic(ti + ULT_DUCK.release * 0.5);      // fase 5: la música baja mientras dura la Ultimate
    for (const s of u.synth) {
      if (s === 'riser') {      // subida de tensión hasta el impacto
        this._noiseLong(o, now, { f: 300, f1: 3200, q: 1.6, a: Math.max(0.2, ti - 0.05), d: 0.12, v: 0.09 });
        this._tone(o, now, { f: 110, f1: 220, a: Math.max(0.2, ti - 0.05), d: 0.1, v: 0.05 });
      } else if (s === 'boom') this.ultImpact(at, ULT_SYNTH_GAIN);
      else if (s === 'thunder') this._layer('thunder', at - 0.12, 0.9);
      else this._layer(s, s === 'rumble' ? now + 0.3 : at, 0.9);
    }
    if (u.synth.includes('rumble')) this._layer('rumble', at, 1);
  }

  /** Golpe que llega: por la clase de quien golpea y el peso de la carta. */
  hit(attacker, spell, { crit = false } = {}) {
    if (!this.ok || this._busy('hit', 0.05)) return;
    const cls = hitClass(attacker), w = hitWeight(spell);
    const vol = [0, 0.75, 0.95, 1.15][w], rate = [0, 1.08, 1, 0.86][w];
    if (this._skillHandledHit(attacker, spell)) { /* fase 3: el golpe ya sonó con la carta */ }
    // Hito 108: cualquier golpe sin sonido propio (habilidades nuevas, empujes, hechizos de prueba) usa los golpes
    // genéricos del pack, al mismo nivel que las cartas; si no han cargado, el sintetizado por clase de siempre
    else if (this._pack(Math.random() < 0.5 ? 'hit_normal' : 'normal_hit', SKILL_MIX.hit * 3.1 * SKILL_W_VOL[w], { rate })) { /* golpe genérico */ }
    else if (!this._file(`combat/hit_${cls}`, { vol: vol * 0.55, rate })) this._hitSynth(cls, w, vol);
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
    if (this._pack(EVENT_SFX.crit, FX_MIX.crit, { when: this.ctx.currentTime + 0.03 })) return;
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
    if (this._pack(EVENT_SFX.shieldBreak, FX_MIX.event)) return;
    if (this._file('combat/shield_break', { vol: 0.55 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    for (let i = 0; i < 7; i++) this._tone(o, t + rnd(0, 0.12), { f: rnd(2000, 4200), d: rnd(0.08, 0.2), v: 0.04 });
    this._burst(o, t, { type: 'highpass', f: 2500, a: 0.002, d: 0.2, v: 0.12 });
  }

  shieldUp() {
    if (!this.ok || this._busy('shieldUp', 0.15)) return;
    if (this._pack(EVENT_SFX.shield, FX_MIX.event)) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._tone(o, t, { wave: 'triangle', f: 520, f1: 780, a: 0.02, d: 0.25, v: 0.08 });
    this._tone(o, t + 0.06, { f: 1560, d: 0.3, v: 0.04 });
  }

  heal(fromCast = false, { amount = 0, drain = false } = {}) {
    if (!this.ok || this._busy('heal', 0.25)) return;
    if (!fromCast && this._pack(drain ? EVENT_SFX.drain : amount >= 45 ? EVENT_SFX.bigHeal : EVENT_SFX.heal, FX_MIX.event)) return;
    if (this._file('combat/heal', { vol: 0.5 })) return;
    if (fromCast) { this.audio.playHeal?.(); return; }
    const t = this.ctx.currentTime, o = this._out(1);
    [523.25, 659.25, 783.99].forEach((f, i) => this._tone(o, t + i * 0.07, { f, d: 0.4, v: 0.05 }));
  }

  buff() {
    if (!this.ok || this._busy('buff', 0.2)) return;
    if (this._pack(EVENT_SFX.buff, FX_MIX.status)) return;
    if (this._file('combat/buff', { vol: 0.5 })) return;
    this.audio.playBuff?.();
  }

  debuff() {
    if (!this.ok || this._busy('debuff', 0.2)) return;
    if (this._pack(EVENT_SFX.debuff, FX_MIX.status)) return;
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

  dot(def, id = null) {
    if (!this.ok || this._busy('dot', 0.15)) return;
    if (STATUS_TICK_SFX[id] && this._pack(STATUS_TICK_SFX[id], FX_MIX.tick)) return;
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
    if (this._pack(EVENT_SFX.ultReady, FX_MIX.event)) return;
    if (this._file('combat/ult_charge', { vol: 0.5 })) return;
    const t = this.ctx.currentTime, o = this._out(1);
    this._burst(o, t, { f: 400, f1: 3000, q: 2, a: 0.6, d: 0.3, v: 0.08 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(o, t + 0.3 + i * 0.08, { f, d: 0.5, v: 0.05 }));
  }

  /** Golpe enorme con cola (t = momento; por defecto ya). Fase 4: lo programa el guion de la Ultimate en su impacto. */
  ultImpact(t = null, gain = 1) {
    if (!this.ok) return;
    if (t == null && this._busy('ultImpact', 1)) return;
    if (t == null && this._file('combat/ult_impact', { vol: 0.6 })) return;
    t = t ?? this.ctx.currentTime;
    const o = this._out(gain);
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
        // fase 4: el daño devuelto (reflejo, espinas, represalia) suena a contraataque
        if (reflected && !this._busy('counter', 0.2) && this._pack(EVENT_SFX.counter, FX_MIX.event)) { /* contraataque */ }
        else this.hit(source, spell, { crit: isCrit });
        if (shieldAbsorbed > 0 && !(unit?.shield > 0)) this.shieldBreak();
        if (unit && !unit.isSapidae && unit.team === 'player') this._file('creatures/axie_hurt', { vol: 0.3 });
      }
      this.checkHeartbeat(sm);
    });
    on('unit:healed', ({ unit, source, spell, amount }) => {
      const drain = unit && unit === source && (spell?.effects || []).some((e) => e.type === 'drain');
      this.heal(false, { amount, drain });
      this.checkHeartbeat(sm);
    });
    on('unit:shielded', () => this.shieldUp());
    on('status:applied', ({ status, def }) => this.statusApplied(status, def));
    on('status:tick', ({ damage, def, status }) => { if (damage > 0) this.dot(def, status); });
    // fase 4: limpieza, disipar, barrera que para un golpe, inmunidad, esquiva, PA, runas y gólems
    on('status:expired', ({ reason }) => {
      const k = reason === 'cleansed' ? EVENT_SFX.cleansed : reason === 'dispelled' ? EVENT_SFX.dispelled : reason === 'blocked' ? EVENT_SFX.barrierPop : null;
      if (k && !this._busy(`exp_${reason}`, 0.3)) this._pack(k, FX_MIX.event);
    });
    on('status:resisted', () => { if (!this._busy('resisted', 0.3)) this._pack(EVENT_SFX.resisted, FX_MIX.minor); });
    on('unit:evaded', () => this.evade());
    on('unit:resourceGained', ({ pa }) => { if (pa > 0 && !this._busy('paGain', 0.4)) this._pack(EVENT_SFX.paGain, FX_MIX.minor); });
    on('unit:resourceLost', ({ pa }) => { if (pa > 0 && !this._busy('paLoss', 0.4)) this._pack(EVENT_SFX.paLoss, FX_MIX.minor); });
    on('runeCharm:proc', () => { if (!this._busy('rune', 0.5)) this._pack(EVENT_SFX.runeProc, FX_MIX.minor); });
    on('golem:summoned', ({ golem, kind }) => this.golem('summon', kind || golem?.golemKind));
    on('golem:broken', ({ golem, kind }) => this.golem('break', kind || golem?.golemKind));
    on('golem:retired', ({ golem }) => this.golem('retire', golem?.golemKind));
    on('golem:pulse', ({ golem, kind }) => this.golem('pulse', kind || golem?.golemKind));
    on('ultimate:ready', ({ spell, axie }) => {
      this._ultAxie = axie || null;
      if (spell) this.skills.load(ultimateKeys(spell.id, this._classOf(axie)));
      this.ultReady();
    });
    // ultimate:used llega en el mismo instante que spell:cast: el sonido lo lleva el guion (_ultCue) en su impacto
    on('spell:landing', () => this.land());
    // Fase 3: cartas de Axie sincronizadas con su VFX
    on('spell:windup', (ctx) => this._skillWindup(ctx));
    on('spell:impact', (ctx) => this._skillImpact(ctx));
    on('spell:resolved', () => this._endSkill());
    return offs;
  }

  /** Consola: lunakaiCombatSfx.test('golpes' | 'efectos'). */
  test(what = 'golpes') {
    const seq = [];
    if (what === 'sapidae' || what === 'enemigos' || what === 'estados' || what === 'ultimates') {   // fase 4 · Hito 108
      const play = (list, gap) => list.forEach((fn, i) => setTimeout(() => { this._last.clear(); fn(); }, i * gap));
      if (what === 'sapidae' || what === 'enemigos') {
        const ids = what === 'sapidae'
          ? ['craft_clay_fist', 'craft_sentinel_golem', 'shepard_hat_headbutt', 'shepard_shared_order', 'lunalogist_alarm_toll',
            'lunalogist_purify', 'lunalogist_blood_moon', 'stargazer_yielding_ground', 'stargazer_corrupt_rift', 'stargazer_dawn_spiral']
          : ['slime_strike', 'slime_attack_spit', 'slime_forest_a_swipe', 'wolf_gray_bite', 'wolf_alpha_roar', 'wolf_alpha_howl',
            'werewolf_boss_cataclysm', 'treant_fighter_punch', 'dryad_range_arrow', 'dryad_mage_spark', 'bear_dad_claw', 'chimera_frost_nova'];
        const sp = ids.map((id) => skillSfx({ id }, { isSapidae: true }));
        this.skills.load(sp.flatMap((s) => [s.attack, s.fly, s.hit, s.extra])).then(() => play(sp.map((s, i) => () => {
          console.log(`[CombatSfx] ${ids[i]}`);
          const c = what === 'sapidae' ? { isSapidae: true } : { team: 'enemy' };
          if (this._skillCast(c, { id: ids[i], paCost: 3 })) {
            this._skillWindup({ caster: c, spell: { id: ids[i] }, vfx: { untilImpact: true, ti: 0.45 } });
            setTimeout(() => { this._skillImpact({ caster: c, spell: { id: ids[i] } }); this._endSkill(); }, 450);
          }
        }), 1700));
        return ids.length;
      }
      if (what === 'estados') {
        const ids = Object.keys(STATUS_SFX).filter((k) => STATUS_SFX[k]);
        this.skills.load(ids.map((k) => STATUS_SFX[k])).then(() => play(ids.map((id) => () => { console.log(`[CombatSfx] ${id}`); this.statusApplied(id, {}); }), 1500));
        return ids.length;
      }
      const ids = Object.keys(ULTIMATE_SFX), cls = { duo_destructiva: 'beast', duo_gaia: 'plant', duo_maelstrom: 'aquatic' };
      this.skills.load(ids.flatMap((id) => ultimateKeys(id, cls[id]))).then(() => play(ids.map((id) => () => {
        console.log(`[CombatSfx] ${id}`);
        this._ultCue({ ult: ULTIMATE_SFX[id], cls: cls[id] }, ULTIMATE_SFX[id].ti);
      }), 4000));
      return ids.length;
    }
    if (what === 'skills') {         // fase 3: las 7 animaciones de cada clase (ataque, vuelo e impacto), como en combate
      const classes = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile', 'mech', 'dawn', 'dusk'];
      const anims = ['bite', 'gore', 'slash', 'smash', 'cast', 'projectile', 'throw'];
      const keys = [];
      for (const c of classes) for (const a of anims) {
        keys.push(`${c}_${a}_attack`);
        if (a === 'projectile' || a === 'throw') keys.push(`${c}_${a}_fly`, `${c}_${a}_hit`);
        if (a === 'cast') keys.push(`${c}_cast_hit`);
      }
      this.skills.load(keys).then(() => {
        let t = 0;
        for (const c of classes) for (const a of anims) {
          const melee = ['bite', 'gore', 'slash', 'smash'].includes(a);
          setTimeout(() => {
            if (!this.ok) return;
            console.log(`[CombatSfx] ${c} · ${a}`);
            const now = this.ctx.currentTime, ti = 0.7;
            if (melee) { const lead = ti - this.skills.peakOf(`${c}_${a}_attack`); this.skills.play(`${c}_${a}_attack`, { when: now + Math.max(0, lead), offset: Math.max(0, -lead), vol: SKILL_MIX.attack }); return; }
            this.skills.play(`${c}_${a}_attack`, { vol: SKILL_MIX.attack });
            const f = a !== 'cast' ? this.skills.play(`${c}_${a}_fly`, { when: now + 0.1, vol: SKILL_MIX.fly }) : null;
            this.skills.fadeOut(f, now + ti, 0.06);
            this.skills.play(`${c}_${a}_hit`, { when: now + ti, vol: SKILL_MIX.hit });
          }, t);
          t += 1600;
        }
      });
      return classes.length * anims.length;
    }
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
