// MobRespawnDirector.js — Reloj y elección de puntos del respawn de mobs (Hito 106).
//
// Lógica pura: sin three, sin DOM, sin escena. Quien lo usa (WanderingMonsters, SlimeCreaturesManager) registra un
// «handler» por tipo de mob y le avisa cuando uno muere (`schedule`). El director solo decide CUÁNDO (cola con
// retardos aleatorios) y DÓNDE (punto del pool de la isla, lejos del jugador y de otros mobs); crear el mob es cosa
// del handler.
//
// Rendimiento: `tick` suma un número y sale si la cola está vacía; con cola, comprueba como mucho una vez por segundo
// y atiende un solo mob a la vez. El reloj propio solo avanza cuando se llama a `tick` (es decir, mientras se
// explora): durante un combate o un menú los temporizadores se detienen.
import { ISLAND_SPAWN_POOL, RESPAWN_CONFIG as CFG } from './islands/MobSpawnPools.js';

export class MobRespawnDirector {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.t = 0;            // reloj propio (s)
    this.island = null;    // isla activa ('2_2'…)
    this.epoch = 0;        // sube al cambiar de isla: los trabajos en curso de la isla anterior se descartan
    this.queue = [];       // { kind, island, readyAt, payload, busy }
    this.handlers = {};
    this.recent = [];      // últimos índices del pool usados en la isla activa
    this.speed = 1;        // lkDebug.respawn.fast
    this._acc = 0;
  }

  registerHandler(kind, fn) { this.handlers[kind] = fn; }

  hasPool(island) { return Boolean(ISLAND_SPAWN_POOL[island]?.length); }

  /** Cambia de isla: vacía la cola (las islas se reconstruyen al entrar) y descarta los trabajos en curso. */
  setIsland(key) {
    this.island = key;
    this.epoch++;
    this.queue = [];
    this.recent = [];
    this._acc = 0;
  }

  /** Retardo (s) de un tipo de mob en una isla. */
  delayFor(kind, island = this.island) {
    const [a, b] = (kind === 'pack' || kind === 'slime') ? (CFG.delay[island] || [60, 90]) : CFG.uniqueDelay;
    return (a + this.rng() * (b - a)) / (this.speed || 1);
  }

  /** Encola un respawn. kind: 'pack' | 'slime' (normales) · 'boss' | 'fixed' (retardo largo). */
  schedule(kind, payload = null, delay = null, island = this.island) {
    if (!this.hasPool(island) && kind !== 'fixed') return null;
    const d = delay ?? this.delayFor(kind, island);
    const entry = { kind, island, payload, readyAt: this.t + d, busy: false };
    this.queue.push(entry);
    return entry;
  }

  /**
   * Avanza el reloj. `ready` = «ahora es buen momento» (explorando, sin encuentro, sin telón). Atiende como mucho un
   * mob a la vez; el handler devuelve 'retry' para reintentar más tarde, o cualquier otra cosa para darlo por hecho.
   */
  tick(dt, ready) {
    this.t += dt;
    if (!this.queue.length || !ready) return;
    this._acc += dt;
    if (this._acc < CFG.checkEvery) return;
    this._acc = 0;
    if (this.queue.some((e) => e.busy)) return;
    const e = this.queue.find((x) => x.readyAt <= this.t);
    if (!e) return;
    const handler = this.handlers[e.kind];
    if (!handler) { this._remove(e); return; }
    e.busy = true;
    const epoch = this.epoch;
    Promise.resolve()
      .then(() => handler(e))
      .then((res) => {
        if (epoch !== this.epoch) return;
        if (res === 'retry') { e.busy = false; e.readyAt = this.t + CFG.retryDelay; } else this._remove(e);
      })
      .catch((err) => {
        console.warn('[MobRespawn] Falló el respawn:', err);
        if (epoch === this.epoch) this._remove(e);
      });
  }

  _remove(e) { this.queue = this.queue.filter((x) => x !== e); }

  /**
   * Elige un punto del pool de la isla.
   * ctx: { player: {x,z}|null, mobs: [{x,z}] } (mobs vivos).
   * Descarta los puntos cerca del jugador, de otro mob o usados hace poco, y prefiere los más alejados de los demás
   * mobs (así se reparten por toda la isla). Si el pool no da más, relaja la separación entre mobs. null = ninguno.
   */
  pick(island, ctx = {}) {
    const pool = ISLAND_SPAWN_POOL[island];
    if (!pool || !pool.length) return null;
    const player = ctx.player || null;
    const mobs = ctx.mobs || [];
    const recent = island === this.island ? this.recent : [];
    for (const f of [1, 0.65, 0.35, 0]) {
      const minM = CFG.minMobDist * f;
      const minP = CFG.minPlayerDist * (f === 0 ? 0.7 : 1);
      const cands = [];
      let total = 0;
      for (let i = 0; i < pool.length; i++) {
        if (recent.includes(i)) continue;
        const p = pool[i];
        if (player && Math.hypot(p.x - player.x, p.z - player.z) < minP) continue;
        let dm = Infinity;
        for (const m of mobs) { const d = Math.hypot(p.x - m.x, p.z - m.z); if (d < dm) dm = d; }
        if (dm < minM) continue;
        const w = 1 + Math.min(dm === Infinity ? 120 : dm, 120) / 30;
        cands.push({ i, w });
        total += w;
      }
      if (!cands.length) continue;
      let r = this.rng() * total;
      let chosen = cands[cands.length - 1];
      for (const c of cands) { if (r < c.w) { chosen = c; break; } r -= c.w; }
      if (island === this.island) {
        this.recent.push(chosen.i);
        while (this.recent.length > CFG.recentAvoid) this.recent.shift();
      }
      return { x: pool[chosen.i].x, z: pool[chosen.i].z, index: chosen.i };
    }
    return null;
  }

  /** Varios puntos seguidos (entrada a la isla): cada uno cuenta como mob para el siguiente. */
  pickMany(island, n, ctx = {}) {
    const mobs = (ctx.mobs || []).slice();
    const out = [];
    for (let k = 0; k < n; k++) {
      const p = this.pick(island, { player: ctx.player, mobs });
      if (!p) break;
      out.push(p);
      mobs.push(p);
    }
    return out;
  }

  /** Diagnóstico (lkDebug.respawn). */
  status() {
    return {
      isla: this.island,
      reloj: Math.round(this.t),
      velocidad: this.speed,
      cola: this.queue.map((e) => ({ tipo: e.kind, isla: e.island, enSegundos: Math.max(0, Math.round(e.readyAt - this.t)), atendiendo: e.busy }))
    };
  }
}
