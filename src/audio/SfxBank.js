// SfxBank.js — Efectos grabados opcionales (Hito 87). Si el archivo existe, suena; si no, el que llama sintetiza.
//
// Carpeta: assets/sounds/sfx/<familia>_<n>.mp3 (p. ej. steps/step_grass_1.mp3 … _4). La lista y los nombres están en
// docs/AUDIO_ARCHIVOS_A_CONSEGUIR.md. Para no llenar la consola de 404 mientras no haya grabaciones:
//   1. se pide una sola vez assets/sounds/sfx/CREDITOS.txt (el archivo de créditos que acompaña a las grabaciones);
//   2. si no existe, no se pide nada más en toda la sesión: todo suena sintetizado;
//   3. si existe, cada familia se carga la primera vez que se usa (sus variantes; las que falten se ignoran).
//
// play(familia, opts) devuelve true si sonó una grabación; false para que el que llama use su versión sintetizada.

const SFX_DIR = './assets/sounds/sfx/';
const PROBE = 'CREDITOS.txt';

/** Variantes de cada familia (las de la lista de archivos a conseguir). */
export const SFX_FAMILIES = {
  // pasos
  'steps/step_grass': 4, 'steps/step_dirt': 4, 'steps/step_wood': 4, 'steps/step_stone': 4, 'steps/step_sand': 4,
  'steps/step_snow': 4, 'steps/step_ice': 3, 'steps/step_water': 3,
  // criaturas
  'creatures/axie_happy': 3, 'creatures/axie_curious': 2, 'creatures/slime_boing': 3, 'creatures/slime_squish': 1,
  'creatures/chimera_growl': 3, 'creatures/chimera_alert': 1,
  // recolección y mundo
  'world/fishing_cast': 1, 'world/fishing_bobber': 1, 'world/fishing_bite': 1, 'world/fishing_reel': 1, 'world/fish_catch': 1,
  // combate (Hito 88)
  'combat/hit_beast': 3, 'combat/hit_plant': 3, 'combat/hit_aquatic': 3, 'combat/hit_bird': 3, 'combat/hit_bug': 3,
  'combat/hit_reptile': 3, 'combat/hit_magic': 3, 'combat/whoosh_light': 3, 'combat/whoosh_heavy': 2, 'combat/crit': 2,
  'combat/block_shield': 3, 'combat/shield_break': 1, 'combat/heal': 2, 'combat/buff': 1, 'combat/debuff': 1,
  'combat/poison_tick': 1, 'combat/stun': 1, 'combat/faint_enemy': 2, 'combat/faint_ally': 1, 'combat/ult_charge': 1,
  'combat/ult_impact': 1, 'combat/turn_timer_tick': 1, 'combat/heartbeat': 1, 'steps/land_soft': 2,
  'creatures/axie_attack': 3, 'creatures/axie_hurt': 2,
  'world/chop_wood': 3, 'world/tree_fall': 1, 'world/mine_rock': 3, 'world/rock_break': 1, 'world/pick_flower': 2,
};

export class SfxBank {
  constructor(audio) {
    this.audio = audio;
    this.enabled = null;          // null: sin comprobar · true/false tras pedir CREDITOS.txt
    this._probe = null;
    this.families = new Map();    // familia → { state: 'loading'|'ok'|'missing', bufs: [] }
    this._last = new Map();       // familia → última variante (para no repetir)
  }

  get ctx() { return this.audio?.ctx || null; }

  _checkFolder() {
    if (this._probe || typeof fetch !== 'function') return;
    this._probe = fetch(SFX_DIR + PROBE, { method: 'GET', cache: 'no-cache' })
      .then((r) => { this.enabled = r.ok; })
      .catch(() => { this.enabled = false; });
  }

  _load(family) {
    const n = SFX_FAMILIES[family] || 1;
    const entry = { state: 'loading', bufs: [] };
    this.families.set(family, entry);
    const urls = n === 1 ? [`${SFX_DIR}${family}.mp3`] : Array.from({ length: n }, (_, i) => `${SFX_DIR}${family}_${i + 1}.mp3`);
    Promise.all(urls.map((u) => fetch(u)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((ab) => (ab ? this.ctx.decodeAudioData(ab) : null))
      .catch(() => null)))
      .then((bufs) => { entry.bufs = bufs.filter(Boolean); entry.state = entry.bufs.length ? 'ok' : 'missing'; });
  }

  /** ¿Hay grabación lista? (si no, la pide y devuelve false: esta vez se sintetiza). */
  has(family) {
    if (!this.ctx) return false;
    if (this.enabled === null) { this._checkFolder(); return false; }
    if (!this.enabled) return false;
    const e = this.families.get(family);
    if (!e) { this._load(family); return false; }
    return e.state === 'ok';
  }

  /**
   * Toca una variante al azar (sin repetir la anterior), con un poco de cambio de tono.
   * @param {string} family  'steps/step_grass'
   * @param {{vol?:number, rate?:number, jitter?:number, pan?:number, delay?:number, dest?:AudioNode}} o
   * @returns {boolean} true si sonó una grabación
   */
  play(family, o = {}) {
    if (!this.has(family)) return false;
    const ctx = this.ctx, e = this.families.get(family);
    let i = Math.floor(Math.random() * e.bufs.length);
    if (e.bufs.length > 1 && i === this._last.get(family)) i = (i + 1) % e.bufs.length;
    this._last.set(family, i);
    const src = ctx.createBufferSource();
    src.buffer = e.bufs[i];
    const j = o.jitter ?? 0.06;
    src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * j);
    const g = ctx.createGain();
    g.gain.value = o.vol ?? 1;
    let tail = g;
    if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); tail = p; }
    src.connect(g);
    tail.connect(o.dest || this.audio.masterGain);
    src.start(ctx.currentTime + (o.delay || 0));
    return true;
  }

  status() {
    return {
      carpeta: this.enabled === null ? 'sin comprobar' : this.enabled ? 'sí (CREDITOS.txt encontrado)' : 'no (todo sintetizado)',
      familias: [...this.families].map(([k, v]) => `${k}: ${v.state === 'ok' ? `${v.bufs.length} archivo(s)` : v.state}`),
    };
  }
}
