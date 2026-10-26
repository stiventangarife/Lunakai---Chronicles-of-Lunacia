// OverworldCollisions.js - 2D Spatial Collision System for Overworld Exploration
//
// Colisiones planas en el suelo: círculos (troncos, rocas, NPC), cajas (edificios) y segmentos (vallas, muros).
// Hito 66 — rejilla espacial: cada colisión se apunta en las celdas de 8 m que toca; una consulta solo mira las
// celdas alrededor del punto, así el coste no crece con el número de colisiones de la isla. La rejilla se rehace
// sola (una vez) tras cualquier alta o baja. Las listas `circles`, `boxes` y `segments` siguen existiendo igual.
// Consola: lkColliders.show(true|false) (también lkDebug.colliders) dibuja las colisiones en el suelo (amarillo círculos, azul cajas, rojo
// segmentos); lkColliders.info() da el recuento.
import * as THREE from 'three';

const CELL = 8;              // tamaño de celda (m)
const INV = 1 / CELL;
const OFF = 2048;            // desplaza los índices a positivos para la clave numérica
const key = (ix, iz) => (ix + OFF) * 4096 + (iz + OFF);

// Hito 70 · deslizamiento (collide-and-slide, como el CharacterController de Unity)
const SLIDE_ITERS = 3;       // contactos resueltos por paso (un rincón = dos paredes)
const TOI_STEPS = 7;         // búsqueda binaria del punto de contacto (paso/128)
const SKIN = 0.015;          // separación que se deja con la superficie (m), evita rozar y quedarse
const FRICTION_EXP = 0.6;    // velocidad al deslizar = sen(ángulo)^0.6 → 45°: 81 %, 20°: 53 %, 90° (paralelo): 100 %
const HEAD_ON = 0.17;        // sen(≈10°): más de frente que esto contra una pared → se detiene sin temblar
const ROUND_SPEED = 0.45;    // contra un tronco o roca de frente: se desvía con este 45 % de la velocidad
const CORNER_MIN = 0.35;     // normales que casi se anulan (hueco más estrecho que el personaje) → se detiene
const PROBE_R = 0.7;         // radio del tanteo para la normal del agua y de las paredes (m)
const PROBE_DIR = Array.from({ length: 24 }, (_, i) => (i % 2 ? Math.sin : Math.cos)(Math.floor(i / 2) * Math.PI / 6));
const OPEN_ANG = [10, 20, 35].map((d) => [Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)]);
const GRAD_H = 1.0;          // paso (m) para la normal del agua y de las paredes (gradiente de la tabla)

export class OverworldCollisions {
  constructor() {
    this._circles = []; // { x, z, radius, tag }
    this._boxes = [];   // { minX, maxX, minZ, maxZ, tag }
    this._segments = []; // { x1, z1, x2, z2, thickness, tag }

    // World Exploration Boundaries (80x80 macro-zone ground with safe margin by default)
    this.bounds = {
      minX: -38.5,
      maxX: 38.5,
      minZ: -38.5,
      maxZ: 38.5
    };

    this._grid = new Map();   // clave de celda → { c:[], b:[], s:[] }
    this._dirty = true;
    this._stamp = 0;
    this._candC = []; this._candB = []; this._candS = [];
    this._out = new THREE.Vector3();
    this._n = { x: 0, z: 0, len: 0, round: false };
    this._steerMem = new WeakMap(); // por quien se mueve (su vector de posición): lado al rodear un tronco
    this._debug = null;
    this._water = null;       // WaterDepthMask de la isla activa (agua honda = no se pasa)
    this._waterMax = 0.5;
    this._waterLim = 0.5; this._slopeLim = 35;
    this._slope = null;       // IslandTerrainMask (pendiente): paredes que no se suben caminando (Hito 69)
    this._slopeMax = 35;

    this._registerDebug();
  }

  /** Comandos de consola (se vuelven a poner si otro módulo sustituye window.lkDebug). */
  _registerDebug() {
    if (typeof window === 'undefined') return;
    const d = (window.lkDebug ||= {});
    if (d.colliders) return;
    const api = window.lkColliders ||= {};
    d.colliders = api.show = (on = true) => {
      const om = window.game?.overworldManager;
      const col = om?.collisions || this;
      col.setDebug(on, om?.scene, om && typeof om.getGroundHeight === 'function' ? (x, z) => om.getGroundHeight(x, z) : null);
      return on ? col.debugInfo() : 'off';
    };
    d.collidersInfo = api.info = () => (window.game?.overworldManager?.collisions || this).debugInfo();
  }

  // Las listas se pueden sustituir desde fuera (p. ej. `col.segments = col.segments.filter(...)` en ForestBridge,
  // ForestDojo y ForestVillage): al asignarlas, la rejilla se marca para rehacerse.
  get circles() { return this._circles; }
  set circles(v) { this._circles = v || []; this._changed(); }
  get boxes() { return this._boxes; }
  set boxes(v) { this._boxes = v || []; this._changed(); }
  get segments() { return this._segments; }
  set segments(v) { this._segments = v || []; this._changed(); }

  setBounds(minX, maxX, minZ, maxZ) {
    this.bounds.minX = minX;
    this.bounds.maxX = maxX;
    this.bounds.minZ = minZ;
    this.bounds.maxZ = maxZ;
  }

  _changed() {
    this._dirty = true;
    if (this._debug && !this._debug.pending) { this._debug.pending = true; queueMicrotask(() => { if (this._debug) { this._debug.pending = false; this._debugRebuild(); } }); }
  }

  clear() {
    this.circles = [];
    this.boxes = [];
    this.segments = [];
    this._changed();
  }

  addCircle(x, z, radius, tag = 'obstacle') {
    this.circles.push({ x, z, radius, tag });
    this._changed();
  }

  removeCirclesByTag(tagPrefix) {
    this.circles = this.circles.filter(c => !(c.tag && c.tag.startsWith(tagPrefix)));
    this._changed();
  }

  removeCircleAt(x, z, threshold = 2.0) {
    const threshSq = threshold * threshold;
    this.circles = this.circles.filter(c => {
      const dx = c.x - x;
      const dz = c.z - z;
      return (dx * dx + dz * dz) > threshSq;
    });
    this._changed();
  }

  addBox(minX, maxX, minZ, maxZ, tag = 'building') {
    this.boxes.push({ minX, maxX, minZ, maxZ, tag });
    this._changed();
  }

  removeBoxesByTag(tagPrefix) {
    this.boxes = this.boxes.filter(b => !(b.tag && b.tag.startsWith(tagPrefix)));
    this._changed();
  }

  addSegment(x1, z1, x2, z2, thickness = 0.4, tag = 'fence') {
    this.segments.push({ x1, z1, x2, z2, thickness, tag });
    this._changed();
  }

  removeSegmentsByTag(tagPrefix) {
    this.segments = this.segments.filter(s => !(s.tag && s.tag.startsWith(tagPrefix)));
    this._changed();
  }

  // ── Agua ──────────────────────────────────────────────────────────────────
  /** Agua de la isla activa: se camina mientras cubra ≤ maxDepth m (hasta la rodilla); más honda bloquea. null = sin agua. */
  setWaterMask(mask, maxDepth = 0.5) {
    this._water = mask || null;
    this._waterMax = maxDepth; this._waterLim = maxDepth;
  }

  /** Pendiente máxima que se puede subir caminando (grados); null quita el límite. */
  setSlopeMask(mask, maxDeg = 35) {
    this._slope = mask || null;
    this._slopeMax = maxDeg; this._slopeLim = maxDeg;
  }

  /** Profundidad del agua en (x, z) en metros (≤ 0 seco), o null si la isla no tiene máscara (o aún se calcula). */
  waterDepthAt(x, z) {
    return this._water ? this._water.depthAt(x, z) : null;
  }

  // ── Rejilla ────────────────────────────────────────────────────────────────
  _cell(ix, iz) {
    const k = key(ix, iz);
    let c = this._grid.get(k);
    if (!c) { c = { c: [], b: [], s: [] }; this._grid.set(k, c); }
    return c;
  }

  _insert(list, field, minX, maxX, minZ, maxZ, obj) {
    const x0 = Math.floor(minX * INV), x1 = Math.floor(maxX * INV);
    const z0 = Math.floor(minZ * INV), z1 = Math.floor(maxZ * INV);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) this._cell(ix, iz)[field].push(obj);
  }

  _rebuild() {
    this._grid.clear();
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i]; c._i = i; c._q = 0;
      this._insert(null, 'c', c.x - c.radius, c.x + c.radius, c.z - c.radius, c.z + c.radius, c);
    }
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i]; b._i = i; b._q = 0;
      this._insert(null, 'b', b.minX, b.maxX, b.minZ, b.maxZ, b);
    }
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i]; s._i = i; s._q = 0;
      const t = s.thickness;
      this._insert(null, 's', Math.min(s.x1, s.x2) - t, Math.max(s.x1, s.x2) + t, Math.min(s.z1, s.z2) - t, Math.max(s.z1, s.z2) + t, s);
    }
    this._dirty = false;
    this._registerDebug();
  }

  /** Llena _candC/_candB/_candS con las colisiones de las celdas que tocan el cuadrado (px±r, pz±r), sin repetir y en el orden original. */
  _gather(px, pz, r) {
    if (this._dirty) this._rebuild();
    const cc = this._candC, cb = this._candB, cs = this._candS;
    cc.length = 0; cb.length = 0; cs.length = 0;
    const q = ++this._stamp;
    const x0 = Math.floor((px - r) * INV), x1 = Math.floor((px + r) * INV);
    const z0 = Math.floor((pz - r) * INV), z1 = Math.floor((pz + r) * INV);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const cell = this._grid.get(key(ix, iz));
        if (!cell) continue;
        for (let i = 0; i < cell.c.length; i++) { const o = cell.c[i]; if (o._q !== q) { o._q = q; cc.push(o); } }
        for (let i = 0; i < cell.b.length; i++) { const o = cell.b[i]; if (o._q !== q) { o._q = q; cb.push(o); } }
        for (let i = 0; i < cell.s.length; i++) { const o = cell.s[i]; if (o._q !== q) { o._q = q; cs.push(o); } }
      }
    }
    const byIdx = (a, b) => a._i - b._i;
    if (cc.length > 1) cc.sort(byIdx);
    if (cb.length > 1) cb.sort(byIdx);
    if (cs.length > 1) cs.sort(byIdx);
  }

  isPointBlocked(px, pz, radius = 0.5) {
    // 1. Check world boundaries
    if (px - radius < this.bounds.minX || px + radius > this.bounds.maxX ||
        pz - radius < this.bounds.minZ || pz + radius > this.bounds.maxZ) {
      return true;
    }

    // 1b. Agua más honda que la rodilla
    if (this._water) {
      const d = this._water.depthAt(px, pz);
      if (d !== null && d > (this._waterLim ?? this._waterMax)) return true;
    }
    // 1c. Pared demasiado empinada (mesetas)
    if (this._slope) {
      const sl = this._slope.slopeAt(px, pz);
      if (sl !== null && sl > (this._slopeLim ?? this._slopeMax)) return true;
    }

    this._gather(px, pz, radius);

    // 2. Check Circles
    const circles = this._candC;
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      const dx = px - c.x;
      const dz = pz - c.z;
      const distSq = dx * dx + dz * dz;
      const minDist = radius + c.radius;
      if (distSq < minDist * minDist) {
        return true;
      }
    }

    // 3. Check Boxes (AABB expanded by radius)
    const boxes = this._candB;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (px + radius > b.minX && px - radius < b.maxX &&
          pz + radius > b.minZ && pz - radius < b.maxZ) {
        return true;
      }
    }

    // 4. Check Segments
    const segments = this._candS;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const dist = this._pointToSegmentDist(px, pz, s.x1, s.z1, s.x2, s.z2);
      if (dist < radius + s.thickness) {
        return true;
      }
    }

    return false;
  }

  _pointToSegmentDist(px, pz, x1, z1, x2, z2) {
    const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projZ = z1 + t * (z2 - z1);
    return Math.hypot(px - projX, pz - projZ);
  }

  /**
   * Resolves player movement from oldPos by delta, allowing smooth sliding along obstacles and walls.
   * Devuelve un vector reutilizado: quien llama copia x/z enseguida (no guardarlo).
   * @param {THREE.Vector3} oldPos
   * @param {THREE.Vector3} delta
   * @param {number} radius
   * @returns {THREE.Vector3} resolved new position
   */
  resolveMovement(oldPos, delta, radius = 0.55) {
    // Si ya se está en agua honda o en una pared (p. ej. tras aparecer ahí), el agua y la pendiente no bloquean
    // este paso: así siempre se puede salir
    // (solo hacia donde no esté más hondo ni más empinado que el punto de partida)
    this._waterLim = this._waterMax; this._slopeLim = this._slopeMax;
    if (this._water || this._slope) {
      const d = this._water ? this._water.depthAt(oldPos.x, oldPos.z) : null;
      const sl = this._slope ? this._slope.slopeAt(oldPos.x, oldPos.z) : null;
      if (d !== null && d > this._waterMax) this._waterLim = d; // sin ir a más hondo (paso a paso no se avanza mar adentro)
      if (sl !== null && sl > this._slopeMax) this._slopeLim = sl; // ni a más pendiente
    }
    try { return this._resolveMovement(oldPos, delta, radius); } finally { this._waterLim = this._waterMax; this._slopeLim = this._slopeMax; }
  }

  /**
   * Hito 70 · deslizar en vez de atascarse. Si el destino está libre, se va directo (como antes). Si no:
   *  1. se busca el punto de contacto a lo largo del paso (búsqueda binaria);
   *  2. se calcula la normal de lo que se toca (círculo, caja, segmento, borde, agua honda o pared empinada);
   *  3. del resto del paso se quita la parte que va contra la superficie y se conserva la paralela, con fricción
   *     según el ángulo; de frente contra una pared se detiene, contra un tronco o roca se desvía hacia su lado;
   *  4. se repite hasta SLIDE_ITERS veces (rincones). Nunca acaba dentro de algo: si no hay paso libre, se queda.
   */
  _resolveMovement(oldPos, delta, radius) {
    const out = this._out;
    const dx0 = delta.x, dz0 = delta.z;
    const len0 = Math.hypot(dx0, dz0);
    if (len0 < 1e-7) return out.set(oldPos.x, oldPos.y, oldPos.z);
    if (!this.isPointBlocked(oldPos.x + dx0, oldPos.z + dz0, radius)) return out.set(oldPos.x + dx0, oldPos.y, oldPos.z + dz0);
    // Ya dentro de algo (p. ej. una colisión nueva justo encima): empujar hacia fuera como antes
    if (this.isPointBlocked(oldPos.x, oldPos.z, radius)) return this._pushOut(oldPos, delta, radius);

    const ux = dx0 / len0, uz = dz0 / len0;   // dirección que pide el jugador
    let px = oldPos.x, pz = oldPos.z, rx = dx0, rz = dz0;
    const n = this._n;
    const seen = this._seen || (this._seen = []);
    seen.length = 0;
    for (let it = 0; it < SLIDE_ITERS; it++) {
      const rl = Math.hypot(rx, rz);
      if (rl < 1e-5) break;
      if (!this.isPointBlocked(px + rx, pz + rz, radius)) { px += rx; pz += rz; break; }
      // 1. Punto de contacto
      let lo = 0, hi = 1;
      for (let k = 0; k < TOI_STEPS; k++) {
        const m = (lo + hi) * 0.5;
        if (this.isPointBlocked(px + rx * m, pz + rz * m, radius)) hi = m; else lo = m;
      }
      const cx = px + rx * lo, cz = pz + rz * lo;          // libre, pegado a la superficie
      const bx = px + rx * hi, bz = pz + rz * hi;          // ya bloqueado
      // 2. Normal
      if (!this._contactNormal(bx, bz, radius, n)) { px = cx; pz = cz; break; }
      if (n.len < CORNER_MIN) { px = cx; pz = cz; break; }  // hueco estrecho / rincón cerrado
      const nx = n.x, nz = n.z;
      // 3. Deslizar el resto: se quita la parte que va contra cada superficie tocada (una tras otra, como el
      //    CharacterController); si al final sigue metiéndose en alguna (ahora o antes en este paso), es un rincón
      const left = 1 - lo;
      let sx = rx * left, sz = rz * left;
      const L = n.list;
      for (let pass = 0; pass < 2; pass++) {
        for (let k = 0; k < L.length; k += 2) {
          const d = sx * L[k] + sz * L[k + 1];
          if (d < 0) { sx -= L[k] * d; sz -= L[k + 1] * d; }
        }
      }
      for (let k = 0; k < L.length; k += 2) seen.push(L[k], L[k + 1]);
      // nunca hacia atrás respecto a lo que pide el jugador (en un rincón eso sería rebotar de un lado a otro)
      let crease = sx * ux + sz * uz < -1e-5;
      for (let k = 0; k < seen.length && !crease; k += 2) if (sx * seen[k] + sz * seen[k + 1] < -1e-4) crease = true;
      const tl = Math.hypot(sx, sz);
      const keep = tl / (rl * left);                       // ≈ sen del ángulo con la superficie
      if (crease || keep < HEAD_ON) {
        if (n.round && !crease) {
          // de frente contra un tronco o roca: rodearlo por el lado al que ya se inclina (o a la derecha)
          const nu = nx * ux + nz * uz, lx = nx - ux * nu, lz = nz - uz * nu; // hacia dónde se sale ya del centro
          let side = (-nz * lx + nx * lz) >= 0 ? 1 : -1;
          // mismo lado que hace un momento (entre dos troncos juntos no se alterna izquierda/derecha)
          const now = performance.now(), mem = this._steerMem.get(oldPos);
          if (mem && now - mem.t < 400) side = mem.side;
          if (mem) { mem.side = side; mem.t = now; } else this._steerMem.set(oldPos, { side, t: now });
          const sp = rl * left * ROUND_SPEED;
          sx = -nz * side * sp; sz = nx * side * sp;
        } else { px = cx; pz = cz; break; }               // de frente contra una pared, o rincón: se detiene limpio
      } else {
        const k = Math.min(1 / keep, Math.pow(keep, FRICTION_EXP) / keep); // fricción: algo más que la proyección
        sx *= k; sz *= k;
      }
      // pequeña separación para no volver a tocar la misma superficie en el siguiente paso
      sx += nx * SKIN; sz += nz * SKIN;
      // Bordes de agua y paredes (tabla de 1 m): el borde tiene pequeños quiebros. Si el deslizamiento choca
      // enseguida, se abre un poco hacia fuera (10°, 20°, 35°) y se toma el primero libre que siga avanzando.
      if (!n.round && this.isPointBlocked(cx + sx, cz + sz, radius)) {
        const sl = Math.hypot(sx, sz);
        let done = false;
        for (let a = 0; a < OPEN_ANG.length; a++) {
          const co = OPEN_ANG[a][0], si = OPEN_ANG[a][1];
          const qx = (sx / sl) * co + nx * si, qz = (sz / sl) * co + nz * si, ql = Math.hypot(qx, qz);
          const ox = qx / ql * sl, oz = qz / ql * sl;
          if (ox * ux + oz * uz > 0 && !this.isPointBlocked(cx + ox, cz + oz, radius)) { px = cx + ox; pz = cz + oz; done = true; break; }
        }
        if (done) { rx = 0; rz = 0; break; }
      }
      px = cx; pz = cz; rx = sx; rz = sz;
    }
    // Seguridad: nunca terminar dentro de algo ni más lejos de lo pedido
    if (Math.hypot(px - oldPos.x, pz - oldPos.z) > len0 * 1.05 + SKIN * 2 || this.isPointBlocked(px, pz, radius)) {
      return out.set(oldPos.x, oldPos.y, oldPos.z);
    }
    return out.set(px, oldPos.y, pz);
  }

  /**
   * Normal (hacia fuera, unitaria en n.x/n.z) de todo lo que bloquea el punto (x, z). n.len = longitud de la suma
   * de normales / número de contactos (≈1 una superficie, ≈0 dos enfrentadas); n.round = solo círculos.
   */
  /** ¿Bloquean el agua honda o la pendiente el punto? (sin mirar objetos) */
  _maskBlocked(x, z) {
    if (this._water) { const d = this._water.depthAt(x, z); if (d !== null && d > (this._waterLim ?? this._waterMax)) return true; }
    if (this._slope) { const sl = this._slope.slopeAt(x, z); if (sl !== null && sl > (this._slopeLim ?? this._slopeMax)) return true; }
    return false;
  }

  _contactNormal(x, z, radius, n) {
    let sx = 0, sz = 0, cnt = 0, round = true;
    const list = n.list || (n.list = []);
    list.length = 0;
    const add = (ax, az, isRound) => {
      const l = Math.hypot(ax, az);
      if (l < 1e-8) return;
      sx += ax / l; sz += az / l; cnt++;
      if (list.length < 16) list.push(ax / l, az / l);
      if (!isRound) round = false;
    };
    const B = this.bounds;
    if (x - radius < B.minX) add(1, 0, false);
    if (x + radius > B.maxX) add(-1, 0, false);
    if (z - radius < B.minZ) add(0, 1, false);
    if (z + radius > B.maxZ) add(0, -1, false);
    // Agua honda y paredes: la normal se busca tanteando alrededor (12 direcciones a PROBE_R): apunta hacia donde
    // está libre. Más fiable que el gradiente en bordes en escalera o crestas finas de la tabla.
    if (this._maskBlocked(x, z)) {
      let ax = 0, az = 0;
      for (let i = 0; i < 12; i++) {
        const c = PROBE_DIR[2 * i], s2 = PROBE_DIR[2 * i + 1];
        if (!this._maskBlocked(x + c * PROBE_R, z + s2 * PROBE_R)) { ax += c; az += s2; }
      }
      if (ax * ax + az * az > 1e-6) add(ax, az, false);
      else {
        // rodeado: gradiente como último recurso
        const h = GRAD_H; let gx = 0, gz = 0;
        if (this._water) { gx -= this._water.depthAt(x + h, z) - this._water.depthAt(x - h, z); gz -= this._water.depthAt(x, z + h) - this._water.depthAt(x, z - h); }
        if (this._slope) { gx -= this._slope.slopeAt(x + h, z) - this._slope.slopeAt(x - h, z); gz -= this._slope.slopeAt(x, z + h) - this._slope.slopeAt(x, z - h); }
        add(gx, gz, false);
      }
    }
    const m = 0.05; // tolerancia: lo que está a punto de tocar también cuenta
    this._gather(x, z, radius + m);
    const cc = this._candC;
    for (let i = 0; i < cc.length; i++) {
      const c = cc[i]; const dx = x - c.x, dz = z - c.z; const r = radius + c.radius + m;
      if (dx * dx + dz * dz < r * r) add(dx, dz, true);
    }
    const cb = this._candB;
    for (let i = 0; i < cb.length; i++) {
      const b = cb[i];
      if (x + radius + m > b.minX && x - radius - m < b.maxX && z + radius + m > b.minZ && z - radius - m < b.maxZ) {
        const qx = Math.max(b.minX, Math.min(b.maxX, x)), qz = Math.max(b.minZ, Math.min(b.maxZ, z));
        if (qx === x && qz === z) {
          // centro dentro de la caja: por el lado más cercano
          const l = x - b.minX, r = b.maxX - x, d = z - b.minZ, u = b.maxZ - z, mn = Math.min(l, r, d, u);
          add(mn === l ? -1 : mn === r ? 1 : 0, mn === d ? -1 : mn === u ? 1 : 0, false);
        } else add(x - qx, z - qz, false);
      }
    }
    const cs = this._candS;
    for (let i = 0; i < cs.length; i++) {
      const s = cs[i];
      const l2 = (s.x2 - s.x1) ** 2 + (s.z2 - s.z1) ** 2;
      let t = l2 > 0 ? ((x - s.x1) * (s.x2 - s.x1) + (z - s.z1) * (s.z2 - s.z1)) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      const qx = s.x1 + t * (s.x2 - s.x1), qz = s.z1 + t * (s.z2 - s.z1);
      const r = radius + s.thickness + m;
      if ((x - qx) ** 2 + (z - qz) ** 2 < r * r) add(x - qx, z - qz, false);
    }
    if (!cnt) return false;
    const L = Math.hypot(sx, sz);
    n.len = L / cnt; n.round = round;
    if (L < 1e-6) { n.x = 0; n.z = 0; n.len = 0; return true; }
    n.x = sx / L; n.z = sz / L;
    return true;
  }

  /** Empuje hacia fuera (método anterior): solo si ya se empieza dentro de una colisión. */
  _pushOut(oldPos, delta, radius) {
    const out = this._out;
    const candidateX = oldPos.x + delta.x;
    const candidateZ = oldPos.z + delta.z;

    // Direct unobstructed move test
    if (!this.isPointBlocked(candidateX, candidateZ, radius)) {
      return out.set(candidateX, oldPos.y, candidateZ);
    }

    // Continuous iterative repulsion / slide resolution
    // Allows the player to glide smoothly along curved surfaces (rocks, trees, riverbanks) and box walls
    let curX = candidateX;
    let curZ = candidateZ;
    const iterations = 3;
    const maxAllowedDist = Math.max(0.1, Math.hypot(delta.x, delta.z) * 1.35 + 0.05);

    // Colisiones cercanas (un resultado más lejos que maxAllowedDist se descarta igualmente abajo)
    this._gather(oldPos.x, oldPos.z, radius + maxAllowedDist + 1.0);
    const circles = this._candC.slice(), boxes = this._candB.slice(), segments = this._candS.slice();

    for (let iter = 0; iter < iterations; iter++) {
      // 1. Repel from circles
      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        const dx = curX - c.x;
        const dz = curZ - c.z;
        const distSq = dx * dx + dz * dz;
        const minDist = radius + c.radius;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist > 1e-4) {
            const overlap = minDist - dist;
            curX += (dx / dist) * overlap;
            curZ += (dz / dist) * overlap;
          } else {
            curX += minDist;
          }
        }
      }

      // 2. Repel from boxes
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        const minX = b.minX - radius;
        const maxX = b.maxX + radius;
        const minZ = b.minZ - radius;
        const maxZ = b.maxZ + radius;
        if (curX > minX && curX < maxX && curZ > minZ && curZ < maxZ) {
          const pushLeft = curX - minX;
          const pushRight = maxX - curX;
          const pushBottom = curZ - minZ;
          const pushTop = maxZ - curZ;
          const minPush = Math.min(pushLeft, pushRight, pushBottom, pushTop);
          if (minPush === pushLeft) curX = minX;
          else if (minPush === pushRight) curX = maxX;
          else if (minPush === pushBottom) curZ = minZ;
          else curZ = maxZ;
        }
      }

      // 3. Repel from segments
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        const l2 = (s.x2 - s.x1) * (s.x2 - s.x1) + (s.z2 - s.z1) * (s.z2 - s.z1);
        if (l2 > 0) {
          let t = ((curX - s.x1) * (s.x2 - s.x1) + (curZ - s.z1) * (s.z2 - s.z1)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = s.x1 + t * (s.x2 - s.x1);
          const projZ = s.z1 + t * (s.z2 - s.z1);
          const dx = curX - projX;
          const dz = curZ - projZ;
          const distSq = dx * dx + dz * dz;
          const minDist = radius + s.thickness;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            if (dist > 1e-4) {
              const overlap = minDist - dist;
              curX += (dx / dist) * overlap;
              curZ += (dz / dist) * overlap;
            }
          }
        }
      }

      // 4. Clamp within world boundaries
      curX = Math.max(this.bounds.minX + radius, Math.min(this.bounds.maxX - radius, curX));
      curZ = Math.max(this.bounds.minZ + radius, Math.min(this.bounds.maxZ - radius, curZ));
    }

    // Check if continuous slide reached an unblocked position
    const travelDist = Math.hypot(curX - oldPos.x, curZ - oldPos.z);
    if (travelDist <= maxAllowedDist && !this.isPointBlocked(curX, curZ, radius * 0.95)) {
      return out.set(curX, oldPos.y, curZ);
    }

    // Fallback: Try sliding along X only
    const slideXBlocked = this.isPointBlocked(candidateX, oldPos.z, radius);
    // Fallback: Try sliding along Z only
    const slideZBlocked = this.isPointBlocked(oldPos.x, candidateZ, radius);

    if (!slideXBlocked && slideZBlocked) {
      return out.set(candidateX, oldPos.y, oldPos.z);
    }
    if (!slideZBlocked && slideXBlocked) {
      return out.set(oldPos.x, oldPos.y, candidateZ);
    }

    // If both slide axes are partially clear, choose the one with greater delta component
    if (!slideXBlocked && !slideZBlocked) {
      if (Math.abs(delta.x) > Math.abs(delta.z)) {
        return out.set(candidateX, oldPos.y, oldPos.z);
      } else {
        return out.set(oldPos.x, oldPos.y, candidateZ);
      }
    }

    // Fully blocked, stay in place
    return out.set(oldPos.x, oldPos.y, oldPos.z);
  }

  // ── Depuración (solo consola) ─────────────────────────────────────────────
  debugInfo() {
    if (this._dirty) this._rebuild();
    const tags = {};
    const add = (t, k) => { const n = (k + ':' + String(t || '?').replace(/[_\d]+$/, '')); tags[n] = (tags[n] || 0) + 1; };
    this.circles.forEach((c) => add(c.tag, 'c')); this.boxes.forEach((b) => add(b.tag, 'b')); this.segments.forEach((s) => add(s.tag, 's'));
    return { circles: this.circles.length, boxes: this.boxes.length, segments: this.segments.length, cells: this._grid.size, tags };
  }

  setDebug(on, scene, heightFn) {
    if (this._debug) {
      this._debug.scene.remove(this._debug.lines);
      this._debug.lines.geometry.dispose(); this._debug.lines.material.dispose();
      this._debug = null;
    }
    if (!on || !scene) return;
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.9, toneMapped: false });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 9999; lines.frustumCulled = false; lines.name = 'ColliderDebug';
    scene.add(lines);
    this._debug = { scene, lines, h: heightFn || (() => 0) };
    this._debugRebuild();
  }

  _debugRebuild() {
    const d = this._debug; if (!d) return;
    const P = [], C = [];
    const H = (x, z) => { const y = d.h(x, z); return (Number.isFinite(y) ? y : 0) + 0.15; };
    const seg = (x1, z1, x2, z2, col) => { P.push(x1, H(x1, z1), z1, x2, H(x2, z2), z2); C.push(col[0], col[1], col[2], col[0], col[1], col[2]); };
    const Y = [1, 0.85, 0.1], B = [0.2, 0.6, 1], R = [1, 0.2, 0.2];
    for (const c of this.circles) {
      const n = c.radius > 2 ? 24 : 12;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        seg(c.x + Math.cos(a0) * c.radius, c.z + Math.sin(a0) * c.radius, c.x + Math.cos(a1) * c.radius, c.z + Math.sin(a1) * c.radius, Y);
      }
    }
    for (const b of this.boxes) {
      seg(b.minX, b.minZ, b.maxX, b.minZ, B); seg(b.maxX, b.minZ, b.maxX, b.maxZ, B);
      seg(b.maxX, b.maxZ, b.minX, b.maxZ, B); seg(b.minX, b.maxZ, b.minX, b.minZ, B);
    }
    for (const s of this.segments) seg(s.x1, s.z1, s.x2, s.z2, R);
    const g = d.lines.geometry;
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.computeBoundingSphere();
  }
}
