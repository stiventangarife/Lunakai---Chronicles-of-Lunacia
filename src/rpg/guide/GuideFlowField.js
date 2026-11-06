// GuideFlowField.js — Hito 136 · «Mapa de rumbo» para la guía de misiones.
//
// Calcula, desde el objetivo hacia afuera, la distancia CAMINANDO a cada casilla de la isla (Dijkstra sobre una rejilla).
// Lo que se puede pisar lo dice el propio sistema de colisiones (OverworldCollisions.isPointBlocked: troncos, rocas,
// NPC, edificios, vallas, agua honda, paredes empinadas y borde de la isla), así que el camino rodea lo mismo que
// rodea el jugador, sin datos nuevos ni mapas hechos a mano.
//   · Con el mapa hecho, el camino desde CUALQUIER sitio es «bajar» hacia la casilla vecina más cercana al objetivo:
//     si el jugador se desvía o vuelve atrás no hay que recalcular nada.
//   · Se calcula por partes (presupuesto de ms por fotograma) y solo hasta un poco más allá del jugador
//     (MARGIN); si el jugador sale de lo calculado, el cálculo continúa donde se quedó.
//   · La prueba «¿se puede pisar?» de cada casilla se guarda y sirve para todos los objetivos de la isla; se rehace
//     solo si cambian las colisiones (OverworldCollisions.version), los límites o termina de calcularse el agua/pendiente.
//   · Memoria: unas pocas tablas planas (≈ 10 bytes por casilla: 46 000 casillas en una isla de 320 m ≈ 0,5 MB) que se
//     reutilizan entre objetivos e islas.
// API: f.setTarget(x, z) · f.step(px, pz, ms) · f.costAt(x, z) · f.trace(px, pz, maxLen) · f.state · f.stats

const MAX_CELLS_SIDE = 220;   // la celda crece en islas grandes (320 m → 1,45 m)
const MIN_CELL = 1.0;
const CLEAR_R = 0.5;          // holgura del personaje al decidir si una casilla se pisa (el jugador usa ~0,55–0,65 y desliza)
const LOS_R = 0.4;            // holgura al comprobar línea libre para suavizar el camino
const MARGIN = 40;            // m de camino calculados más allá del jugador (para que deambular no cueste nada)
const SEED_R = [4, 8];        // radio (m) para buscar casillas libres alrededor de un objetivo tapado (un NPC tiene colisión)
const MOVE_RECALC = 3;        // si el objetivo se mueve más de esto (m), se recalcula
const SQ2 = Math.SQRT2;
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];

export class GuideFlowField {
  /** @param {import('../OverworldCollisions.js').OverworldCollisions} collisions */
  constructor(collisions) {
    this.col = collisions;
    this.state = 'idle';      // idle | computing | ready | unreachable
    this.tx = 0; this.tz = 0; this.hasTarget = false;
    this.cap = 0;
    this._sig = '';
    this.stats = { cells: 0, cell: 0, expanded: 0, ms: 0, frames: 0, tests: 0 };
  }

  // ── Rejilla ────────────────────────────────────────────────────────────────
  _signature() {
    const c = this.col, b = c.bounds;
    return `${c.version || 0}|${b.minX},${b.maxX},${b.minZ},${b.maxZ}|${c._water ? (c._water.ready ? 1 : 0) : '-'}|${c._slope ? (c._slope.ready ? 1 : 0) : '-'}`;
  }

  _setupGrid() {
    const b = this.col.bounds;
    const ext = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    this.cell = Math.max(MIN_CELL, ext / MAX_CELLS_SIDE);
    this.x0 = b.minX; this.z0 = b.minZ;
    this.nx = Math.max(1, Math.ceil((b.maxX - b.minX) / this.cell));
    this.nz = Math.max(1, Math.ceil((b.maxZ - b.minZ) / this.cell));
    const N = this.nx * this.nz;
    if (!this.blk || this.blk.length < N) {
      // Se reservan una vez (y solo crecen): la isla más grande marca el tamaño
      this.blk = new Uint8Array(N);      // 0 sin probar · 1 libre · 2 bloqueada
      this.dist = new Float32Array(N);
      this.flag = new Uint8Array(N);     // bit 1 cerrada · bit 2 semilla (zona del objetivo)
      this.cap = Math.max(1024, N >> 1);
      this.hIdx = new Int32Array(this.cap);
      this.hKey = new Float32Array(this.cap);
    } else {
      this.blk.fill(0, 0, N);
    }
    this.N = N;
    this.stats.cells = N; this.stats.cell = this.cell;
  }

  _blocked(i) {
    let v = this.blk[i];
    if (!v) {
      const ix = i % this.nx, iz = (i / this.nx) | 0;
      v = this.col.isPointBlocked(this.x0 + (ix + 0.5) * this.cell, this.z0 + (iz + 0.5) * this.cell, CLEAR_R) ? 2 : 1;
      this.blk[i] = v;
      this.stats.tests++;
    }
    return v === 2;
  }

  _idx(x, z) {
    const ix = Math.floor((x - this.x0) / this.cell), iz = Math.floor((z - this.z0) / this.cell);
    if (ix < 0 || iz < 0 || ix >= this.nx || iz >= this.nz) return -1;
    return iz * this.nx + ix;
  }

  _cx(i) { return this.x0 + ((i % this.nx) + 0.5) * this.cell; }
  _cz(i) { return this.z0 + (((i / this.nx) | 0) + 0.5) * this.cell; }

  // ── Montículo binario (con entradas repetidas: se ignoran las ya cerradas) ──
  _push(i, k) {
    if (this.hn >= this.cap) {
      this.cap *= 2;
      const a = new Int32Array(this.cap); a.set(this.hIdx); this.hIdx = a;
      const b = new Float32Array(this.cap); b.set(this.hKey); this.hKey = b;
    }
    const I = this.hIdx, K = this.hKey;
    let n = this.hn++;
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (K[p] <= k) break;
      I[n] = I[p]; K[n] = K[p]; n = p;
    }
    I[n] = i; K[n] = k;
  }

  _pop() {
    const I = this.hIdx, K = this.hKey;
    const top = I[0];
    const n = --this.hn;
    if (n > 0) {
      const li = I[n], lk = K[n];
      let j = 0;
      for (;;) {
        let c = 2 * j + 1;
        if (c >= n) break;
        if (c + 1 < n && K[c + 1] < K[c]) c++;
        if (K[c] >= lk) break;
        I[j] = I[c]; K[j] = K[c]; j = c;
      }
      I[j] = li; K[j] = lk;
    }
    return top;
  }

  // ── Objetivo ───────────────────────────────────────────────────────────────
  /** Nuevo objetivo. Si es el mismo (o se ha movido poco) y las colisiones no han cambiado, se conserva lo calculado. */
  setTarget(x, z) {
    const sig = this._signature();
    const sameGrid = sig === this._sig;
    if (sameGrid && this.hasTarget && Math.hypot(x - this.tx, z - this.tz) < MOVE_RECALC) return false;
    if (!sameGrid) { this._sig = sig; this._setupGrid(); }
    this.tx = x; this.tz = z; this.hasTarget = true;
    this._restart();
    return true;
  }

  clear() { this.hasTarget = false; this.state = 'idle'; this.hn = 0; }

  _restart() {
    const N = this.N;
    this.dist.fill(Infinity, 0, N);
    this.flag.fill(0, 0, N);
    this.hn = 0;
    this.lastKey = 0;
    this.stats.expanded = 0; this.stats.ms = 0; this.stats.frames = 0; this.stats.tests = 0;
    this._t0 = performance.now();
    this._seeded = false;
    this.state = 'computing';
  }

  /** Semillas: las casillas libres alrededor del objetivo (un NPC o un monstruo tienen su propio círculo de colisión). */
  _seed() {
    this._seeded = true;
    const c = this.cell;
    for (const R of SEED_R) {
      const r = Math.ceil(R / c);
      const ci = Math.floor((this.tx - this.x0) / c), cj = Math.floor((this.tz - this.z0) / c);
      let any = false;
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          const ix = ci + di, iz = cj + dj;
          if (ix < 0 || iz < 0 || ix >= this.nx || iz >= this.nz) continue;
          const i = iz * this.nx + ix;
          const d = Math.hypot(this._cx(i) - this.tx, this._cz(i) - this.tz);
          if (d > R || this._blocked(i)) continue;
          if (d < this.dist[i]) { this.dist[i] = d; this.flag[i] |= 2; this._push(i, d); any = true; }
        }
      }
      if (any) return true;
    }
    return false;
  }

  /**
   * Avanza el cálculo como mucho `budgetMs`. Se para cuando el jugador ya está cubierto con MARGIN metros de sobra
   * (o no queda nada que mirar: entonces, si el jugador no se alcanzó, el objetivo es inalcanzable a pie).
   */
  step(px, pz, budgetMs = 2) {
    if (!this.hasTarget) return this.state;
    if (this._signature() !== this._sig) { this._sig = this._signature(); this._setupGrid(); this._restart(); }
    if (this.state === 'unreachable' && !this.hn) {
      // ¿El jugador ha llegado a una zona ya cerrada (p. ej. tras cruzar en barca)? Si no, sigue inalcanzable.
      if (Number.isFinite(this.costAt(px, pz))) this.state = 'ready';
      return this.state;
    }
    const pc = this.costAt(px, pz);
    if (Number.isFinite(pc) && this.hn && this.lastKey > pc + MARGIN) { this.state = 'ready'; return this.state; }
    if (Number.isFinite(pc) && !this.hn && this._seeded) { this.state = 'ready'; return this.state; }

    const t0 = performance.now();
    if (!this._seeded && !this._seed()) { this.state = 'unreachable'; return this.state; }
    const { dist, flag, nx, nz, cell } = this;
    let n = 0;
    while (this.hn) {
      if ((++n & 31) === 0) {
        if (performance.now() - t0 > budgetMs) break;
        const c = this.costAt(px, pz);
        if (Number.isFinite(c) && this.lastKey > c + MARGIN) break;
      }
      const kd = this.hKey[0];
      const u = this._pop();
      if (flag[u] & 1) continue;
      flag[u] |= 1;
      this.lastKey = kd;
      this.stats.expanded++;
      const ux = u % nx, uz = (u / nx) | 0;
      for (let k = 0; k < 8; k++) {
        const [dx, dz, w] = NB[k];
        const vx = ux + dx, vz = uz + dz;
        if (vx < 0 || vz < 0 || vx >= nx || vz >= nz) continue;
        const v = vz * nx + vx;
        if (flag[v] & 1) continue;
        if (this._blocked(v)) continue;
        // en diagonal no se cortan esquinas
        if (dx && dz && (this._blocked(uz * nx + vx) || this._blocked(vz * nx + ux))) continue;
        const nd = kd + w * cell;
        if (nd < dist[v]) { dist[v] = nd; this._push(v, nd); }
      }
    }
    const ms = performance.now() - t0;
    this.stats.ms += ms; this.stats.frames++;
    const c = this.costAt(px, pz);
    if (Number.isFinite(c) && (!this.hn || this.lastKey > c + MARGIN)) this.state = 'ready';
    else if (!this.hn) this.state = Number.isFinite(c) ? 'ready' : 'unreachable';
    else this.state = 'computing';
    if (this.state !== 'computing' && this._t0) { this.stats.total = Math.round(performance.now() - this._t0); this._t0 = 0; }
    return this.state;
  }

  /** Casilla cerrada desde la que mejor se llega al objetivo desde (x, z): las vecinas (3×3) y, si no hay, 5×5
   *  (el jugador pegado a un tronco o a un rincón). Devuelve [índice, distancia] o [-1, Infinity]. */
  _startCell(x, z) {
    if (!this.hasTarget || !this.N) return [-1, Infinity];
    const c = this.cell;
    const ci = Math.floor((x - this.x0) / c), cj = Math.floor((z - this.z0) / c);
    let best = Infinity, bi = -1;
    for (let r = 1; r <= 2 && bi < 0; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          const ix = ci + di, iz = cj + dj;
          if (ix < 0 || iz < 0 || ix >= this.nx || iz >= this.nz) continue;
          const i = iz * this.nx + ix;
          if (!(this.flag[i] & 1)) continue;
          const d = this.dist[i] + Math.hypot(this._cx(i) - x, this._cz(i) - z);
          if (d < best) { best = d; bi = i; }
        }
      }
    }
    return [bi, best];
  }

  /** Distancia caminando al objetivo desde (x, z) (Infinity si aún no se ha alcanzado). */
  costAt(x, z) { return this._startCell(x, z)[1]; }

  _lineFree(ax, az, bx, bz) {
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(L / 0.5);
    for (let s = 1; s < n; s++) {
      const t = s / n;
      if (this.col.isPointBlocked(ax + (bx - ax) * t, az + (bz - az) * t, LOS_R)) return false;
    }
    return true;
  }

  /**
   * Camino desde (px, pz) hacia el objetivo, como mucho `maxLen` m: se baja por el mapa de casilla en casilla y luego
   * se suaviza (si hay línea libre entre dos puntos, se va recto). Devuelve [{x, z}, …] o null si aún no hay mapa.
   */
  trace(px, pz, maxLen = 20) {
    if (this.state !== 'ready' && this.state !== 'computing') return null;
    const { dist, flag, nx, nz } = this;
    let [cur] = this._startCell(px, pz);
    if (cur < 0) return null;
    const raw = [{ x: px, z: pz }];
    let len = 0, lx = px, lz = pz;
    const limit = maxLen + 6; // algo más largo: el suavizado acorta
    for (let guard = 0; guard < 400 && len < limit; guard++) {
      const x = this._cx(cur), z = this._cz(cur);
      len += Math.hypot(x - lx, z - lz); lx = x; lz = z;
      raw.push({ x, z });
      if (flag[cur] & 2) { // zona del objetivo: se termina en el objetivo si hay línea libre
        if (this._lineFree(x, z, this.tx, this.tz)) raw.push({ x: this.tx, z: this.tz });
        break;
      }
      const ux = cur % nx, uz = (cur / nx) | 0;
      let nxt = -1, nd = dist[cur];
      for (let k = 0; k < 8; k++) {
        const vx = ux + NB[k][0], vz = uz + NB[k][1];
        if (vx < 0 || vz < 0 || vx >= nx || vz >= nz) continue;
        const v = vz * nx + vx;
        if ((flag[v] & 1) && dist[v] < nd) { nd = dist[v]; nxt = v; }
      }
      if (nxt < 0) break;
      cur = nxt;
    }
    // Suavizado («tirar de la cuerda»): desde cada punto, el más lejano visible en línea libre
    const out = [raw[0]];
    let a = 0;
    while (a < raw.length - 1) {
      let b = Math.min(raw.length - 1, a + 12);
      while (b > a + 1 && !this._lineFree(raw[a].x, raw[a].z, raw[b].x, raw[b].z)) b--;
      out.push(raw[b]);
      a = b;
    }
    return out;
  }
}
