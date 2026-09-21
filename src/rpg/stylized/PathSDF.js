import * as THREE from 'three';
import { getRiverCenter } from './StylizedRiver.js';

export const SDF_RANGE_METERS = 6;
export const GROUND_SIZE = 80;

// Felzenszwalb & Huttenlocher 1D squared-distance transform
function edt1d(f, n, out) {
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    out[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

// Exact squared euclidean distance to the nearest seed (inside[i] = 1) pixel
function edt2d(inside, w, h) {
  const INF = 1e12;
  const d = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = inside[i] ? 0 : INF;

  const line = new Float64Array(Math.max(w, h));
  const out = new Float64Array(Math.max(w, h));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) line[x] = d[y * w + x];
    edt1d(line, w, out);
    for (let x = 0; x < w; x++) d[y * w + x] = out[x];
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) line[y] = d[y * w + x];
    edt1d(line, h, out);
    for (let y = 0; y < h; y++) d[y * w + x] = out[y];
  }
  return d;
}

export class PathSDF {
  constructor() {
    this.texture = null;
    this.width = 0;
    this.height = 0;
    this.distanceGrid = null; // Stored meters on CPU for logical lookups
  }

  build(pathMaskTexture) {
    const image = pathMaskTexture.image;
    const w = image.width || 512;
    const h = image.height || 512;
    this.width = w;
    this.height = h;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, w, h).data;

    const dirt = new Uint8Array(w * h);
    const grass = new Uint8Array(w * h);

    for (let y = 0; y < h; y++) {
      const worldZ = (0.5 - (y / (h - 1))) * GROUND_SIZE;
      const { x: rx } = getRiverCenter(worldZ);

      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const worldX = ((x / (w - 1)) - 0.5) * GROUND_SIZE;
        const distToRiver = Math.abs(worldX - rx);

        let on = pixels[i * 4] >= 128;

        // Clear road anywhere inside or along the river corridor
        if (Math.abs(worldZ) > 1.5) {
          // Away from the bridge crossing: completely clear any road within 3.2m of river centerline
          if (distToRiver < 3.2) {
            on = false;
          }
        } else {
          // Inside the water channel of the stone crossing:
          // Keep water channel clear (slabs are 3D rock meshes)
          if (distToRiver < 2.0) {
            on = false;
          }
          // Paved approach to the stone crossing on West and East banks
          if ((worldX >= 3.2 && worldX <= 5.85) || (worldX >= 11.55 && worldX <= 14.2)) {
            if (Math.abs(worldZ) < 1.15) {
              on = true;
            }
          }
        }

        dirt[i] = on ? 1 : 0;
        grass[i] = on ? 0 : 1;
      }
    }

    const toDirt = edt2d(dirt, w, h);
    const toGrass = edt2d(grass, w, h);

    const metersPerTexel = GROUND_SIZE / w;
    const data = new Uint8Array(w * h);
    this.distanceGrid = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        // Signed: distance out to the road on grass, negated inward on dirt.
        const meters = (dirt[i] ? -Math.sqrt(toGrass[i]) : Math.sqrt(toDirt[i])) * metersPerTexel;
        this.distanceGrid[i] = meters;

        const normalized = Math.max(-SDF_RANGE_METERS, Math.min(SDF_RANGE_METERS, meters)) /
          (2 * SDF_RANGE_METERS) + 0.5;

        // Write rows reversed so DataTexture matches default flipY image mapping
        data[(h - 1 - y) * w + x] = Math.round(normalized * 255);
      }
    }

    const texture = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    this.texture = texture;
    console.log(`[PathSDF] Built signed distance field texture (${w}x${h})`);
    return texture;
  }

  // Sample CPU-side distance at world coordinates
  getDistanceAt(worldX, worldZ) {
    if (!this.distanceGrid) return 10.0;
    // Map world XZ (-20..20) to texture coordinates (0..w-1, 0..h-1)
    const u = (worldX / GROUND_SIZE) + 0.5;
    const v = 0.5 - (worldZ / GROUND_SIZE);
    const px = Math.floor(Math.max(0, Math.min(1, u)) * (this.width - 1));
    const py = Math.floor(Math.max(0, Math.min(1, v)) * (this.height - 1));
    return this.distanceGrid[py * this.width + px];
  }
}
