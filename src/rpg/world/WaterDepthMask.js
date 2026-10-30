// WaterDepthMask.js — Profundidad del agua precalculada en una cuadrícula (Hito 66).
//
// Para saber si el personaje puede caminar por el agua (hasta la rodilla) y para los efectos al vadear, sin evaluar
// el terreno (ruido) en cada consulta. La cuadrícula guarda «superficie del agua − suelo» en metros (negativo =
// tierra seca); depthAt() interpola entre las 4 celdas vecinas, así el borde no sale en escalones.
// El cálculo se reparte en trozos de pocos milisegundos (bake), para no dar tirones al cargar la isla. Mientras no
// termina, depthAt() devuelve null y nadie se bloquea (como antes).
import { sliceBudget } from '../../render/LoadGate.js';

const LAND = -10;

export class WaterDepthMask {
  /**
   * @param {{minX:number, minZ:number, size:number, cell?:number}} area  cuadrado que cubre la isla
   */
  constructor({ minX, minZ, size, cell = 1 }) {
    this.minX = minX; this.minZ = minZ; this.cell = cell;
    this.n = Math.ceil(size / cell) + 1;
    this.data = new Float32Array(this.n * this.n).fill(LAND);
    this.ready = false;
    this._token = 0;
  }

  /**
   * Calcula la cuadrícula por trozos.
   * @param {(x:number, z:number) => number|null} depthFn  profundidad en (x, z), o null si ahí no hay agua posible
   * @param {number} budgetMs  tiempo máximo por trozo
   * @returns {Promise<void>}
   */
  bake(depthFn, budgetMs = 4) {
    const token = ++this._token;
    this.ready = false;
    const { n, cell, minX, minZ, data } = this;
    let k = 0;
    return new Promise((resolve) => {
      const step = () => {
        if (token !== this._token) return resolve();
        const t0 = performance.now();
        while (k < n * n) {
          const i = k % n, j = (k / n) | 0;
          const d = depthFn(minX + i * cell, minZ + j * cell);
          data[k] = (d === null || !Number.isFinite(d)) ? LAND : d;
          k++;
          if ((k & 255) === 0 && performance.now() - t0 > sliceBudget(budgetMs)) break; // con el telón cerrado, trozos más grandes
        }
        if (k >= n * n) { this.ready = true; resolve(); return; }
        setTimeout(step, 0);
      };
      step();
    });
  }

  cancel() { this._token++; }

  /** Profundidad del agua en (x, z) en metros (≤ 0 = seco), o null si aún no está calculada. */
  depthAt(x, z) {
    if (!this.ready) return null;
    const fx = (x - this.minX) / this.cell, fz = (z - this.minZ) / this.cell;
    const i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= this.n - 1 || j >= this.n - 1) return LAND;
    const tx = fx - i, tz = fz - j, n = this.n, d = this.data, k = j * n + i;
    const a = d[k], b = d[k + 1], c = d[k + n], e = d[k + n + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz;
  }
}
