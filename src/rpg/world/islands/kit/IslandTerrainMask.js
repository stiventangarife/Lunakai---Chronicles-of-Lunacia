// IslandTerrainMask.js — Pendiente y profundidad del agua de una isla, precalculadas en una cuadrícula (Hito 69).
//
// Una sola pasada de alturas (1 m) da dos cosas:
//   · pendiente (grados): las paredes de más de N° no se suben caminando (OverworldCollisions.setSlopeMask);
//   · profundidad del agua (m): se camina hasta la rodilla y salen ondas (setWaterMask, FootstepEffectsManager).
// Zonas «someras» (p. ej. un oasis que se cruza entero): su profundidad se limita a `shallowMax` y `walkHeight`
// devuelve el suelo elevado hasta esa profundidad, para que el personaje no se hunda.
// El cálculo se reparte en trozos de pocos ms (sin tirones). Mientras no termina, nada se bloquea (como antes).
const LAND = -10;

export class IslandTerrainMask {
  /**
   * @param {{minX:number, minZ:number, size:number, cell?:number}} area
   * @param {{height:(x:number,z:number)=>number, waterSurface:(x:number,z:number)=>number|null,
   *          shallow?:(x:number,z:number)=>number|null, shallowMax?:number, adjust?:(mask:IslandTerrainMask)=>void}} fns
   *   waterSurface → altura del agua en (x, z) o null si no hay; shallow → altura del agua de una zona somera o null
   */
  constructor({ minX, minZ, size, cell = 1 }, fns) {
    this.minX = minX; this.minZ = minZ; this.cell = cell;
    this.n = Math.ceil(size / cell) + 1;
    const N = this.n * this.n;
    this.H = new Float32Array(N);
    this.depth = new Float32Array(N).fill(LAND);
    this.slope = new Float32Array(N);
    this.shallowSurf = new Float32Array(N).fill(NaN);
    this.fns = fns;
    this.shallowMax = fns.shallowMax ?? 0.45;
    this.ready = false;
    this._token = 0;
  }

  bake(budgetMs = 4) {
    const token = ++this._token;
    this.ready = false;
    const { n, cell, minX, minZ, H, depth, slope, shallowSurf, fns } = this;
    const N = n * n;
    let k = 0, phase = 0;
    return new Promise((resolve) => {
      const step = () => {
        if (token !== this._token) return resolve();
        const t0 = performance.now();
        while (phase < 2) {
          if (phase === 0) {
            const x = minX + (k % n) * cell, z = minZ + ((k / n) | 0) * cell;
            H[k] = fns.height(x, z);
          } else {
            const i = k % n, j = (k / n) | 0, x = minX + i * cell, z = minZ + j * cell;
            const hx0 = H[j * n + Math.max(0, i - 1)], hx1 = H[j * n + Math.min(n - 1, i + 1)];
            const hz0 = H[Math.max(0, j - 1) * n + i], hz1 = H[Math.min(n - 1, j + 1) * n + i];
            const gx = (hx1 - hx0) / (2 * cell), gz = (hz1 - hz0) / (2 * cell);
            slope[k] = Math.atan(Math.hypot(gx, gz)) * 57.29578;
            let d = LAND;
            const ws = fns.waterSurface(x, z);
            if (ws !== null && ws !== undefined) d = ws - H[k];
            const ss = fns.shallow ? fns.shallow(x, z) : null;
            if (ss !== null && ss !== undefined) {
              shallowSurf[k] = ss;
              d = Math.min(Math.max(d, ss - H[k]), this.shallowMax);
              if (ss - H[k] > 0.02) slope[k] = 0; // el fondo bajo el agua no cuenta como pared (la orilla seca sí)
            }
            depth[k] = d;
          }
          k++;
          if (k >= N) { k = 0; phase++; continue; }
          if ((k & 255) === 0 && performance.now() - t0 > budgetMs) break;
        }
        if (phase >= 2) {
          // ajustes propios de la isla (p. ej. paredes que sí se pueden subir junto a una rampa)
          try { fns.adjust?.(this); } catch (e) { console.warn('[IslandTerrainMask] ajuste', e); }
          if (fns.smoothSlope) this._blurSlope();
          if (fns.slopeLimit) this._despeckle(fns.slopeLimit);
          this.ready = true; resolve(); return;
        }
        setTimeout(step, 0);
      };
      step();
    });
  }

  /** Suaviza la pendiente (media 3×3): el borde del límite queda sin picos ni entrantes de una casilla. */
  _blurSlope() {
    const { n, slope } = this;
    const src = slope.slice();
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      if (this.depth[k] > 0.03 && Number.isNaN(this.shallowSurf[k])) continue; // bajo el agua no importa
      let sum = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) sum += src[k + dj * n + di];
      slope[k] = sum / 9;
    }
  }

  /**
   * Quita «motas» de pared: casillas por encima del límite con menos de 3 vecinas también por encima (crestas de
   * 1 m o puntos sueltos que rozan el límite). No son paredes de verdad y enganchaban al personaje.
   */
  _despeckle(limit) {
    const { n, slope } = this;
    const out = [];
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = j * n + i;
      if (slope[k] <= limit) continue;
      let c = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && slope[k + dj * n + di] > limit) c++;
      if (c < 3) out.push(k);
    }
    for (const k of out) slope[k] = limit;
    this.despeckled = out.length;
  }

  cancel() { this._token++; }

  _bilinear(arr, x, z, outside) {
    const fx = (x - this.minX) / this.cell, fz = (z - this.minZ) / this.cell;
    const i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= this.n - 1 || j >= this.n - 1) return outside;
    const tx = fx - i, tz = fz - j, n = this.n, k = j * n + i;
    return (arr[k] * (1 - tx) + arr[k + 1] * tx) * (1 - tz) + (arr[k + n] * (1 - tx) + arr[k + n + 1] * tx) * tz;
  }

  /** Profundidad del agua (m, ≤ 0 seco) o null si aún no está calculada. */
  depthAt(x, z) { return this.ready ? this._bilinear(this.depth, x, z, LAND) : null; }

  /** Pendiente del terreno (grados) o null si aún no está calculada. */
  slopeAt(x, z) { return this.ready ? this._bilinear(this.slope, x, z, 0) : null; }

  /**
   * Altura para caminar: el suelo, salvo en una zona somera, donde no baja de (agua − shallowMax).
   * @param {number} ground  altura del terreno en (x, z)
   */
  walkHeight(x, z, ground) {
    if (!this.ready) return ground;
    const i = Math.round((x - this.minX) / this.cell), j = Math.round((z - this.minZ) / this.cell);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return ground;
    const ss = this.shallowSurf[j * this.n + i];
    return Number.isNaN(ss) ? ground : Math.max(ground, ss - this.shallowMax);
  }
}
