import * as THREE from 'three';
import { WaterManager } from '../WaterManager.js';
import { fbm2D } from '../grassShader.js';

/**
 * GenshinTerrainData — Bakes the island terrain into two GPU textures, reusing the
 * terrain mesh vertices (zero extra height evaluations):
 *
 *   heightTex (R16F): terrain height, bilinear-filtered on the GPU.
 *   maskTex   (RGBA8):
 *      R = grass density   (0 on roads, river beds, shores, cliffs, dojo floor)
 *      G = road / path factor
 *      B = wildflower meadow mask
 *      A = shore wetness (proximity to the river water line)
 *
 * The grass field, the flowers and the terrain colour shader all sample the SAME data,
 * so blades, flowers and ground always agree on where grass grows.
 */
export class GenshinTerrainData {
  constructor(terrain) {
    this.terrain = terrain;
    this.size = terrain.size;                // 480
    this.res = terrain.segments + 1;         // 257
    this.half = this.size * 0.5;
    this.minHeight = Infinity;
    this.maxHeight = -Infinity;
    this._bake();
  }

  _bake() {
    const t = this.terrain;
    const geo = t.geometry;
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const road = geo.attributes.aRoadFactor;
    const res = this.res;
    const N = res * res;

    const heights = new Uint16Array(N);
    const mask = new Uint8Array(N * 4);
    this.heightsF = new Float32Array(N);

    // PlaneGeometry rotated -90° on X: row i → z = -half + i*step, col j → x = -half + j*step
    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const vi = i * res + j;
        const x = pos.getX(vi);
        const z = pos.getZ(vi);
        const y = pos.getY(vi);
        // Texture row 0 must be z = -half (v = 0). Vertex row 0 is already z = -half.
        const ti = i * res + j;
        heights[ti] = THREE.DataUtils.toHalfFloat(y);
        this.heightsF[ti] = y;
        if (y < this.minHeight) this.minHeight = y;
        if (y > this.maxHeight) this.maxHeight = y;

        const ny = nor ? nor.getY(vi) : 1.0;
        const rf = road ? road.getX(vi) : 0.0;

        const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(z);
        // The river only exists from its spring (z = -115) down to the bay
        const distRiver = (z >= -118) ? Math.abs(x - riverCenterX) - riverHalfWidth : 999;
        const waterY = (z >= -115 && distRiver < 14.0) ? WaterManager.getRiverWaterHeight(z) : -99;
        const aboveWater = y - Math.max(waterY, t.waterLevel);

        // --- Grass density ---------------------------------------------------
        let d = 1.0;
        d *= smooth(0.38, 0.12, rf);                          // paths stay clean
        d *= smooth(0.0, 1.6, distRiver);                     // no grass in the river
        d *= smooth(0.05, 0.4, aboveWater);                   // thin wet sandy banks
        d *= smooth(0.56, 0.7, ny);                           // only true cliffs stay bare
        const dojo = Math.hypot(x + 87.9, z - 74.0);
        d *= smooth(14.5, 18.0, dojo);                        // dojo courtyard
        const coast = Math.hypot(x, z);
        d *= smooth(152.0, 141.0, coast);                     // beaches near the sea
        // Natural thinning: little clearings so the meadow breathes
        const n = fbm2D(x * 0.045 + 13.0, z * 0.045 - 7.0);
        d *= 0.72 + 0.28 * smooth(0.18, 0.42, n);

        // --- Flowers -----------------------------------------------------------
        const fm = fbm2D(x * 0.022 - 31.0, z * 0.022 + 8.0);
        const forest = Math.hypot(x + 70, z - 100);
        let flowers = smooth(0.48, 0.66, fm) * d;
        flowers *= 0.35 + 0.65 * smooth(30.0, 55.0, forest);  // fewer flowers under canopy
        flowers = Math.max(flowers, smooth(0.25, 0.08, rf) * smooth(0.04, 0.12, rf) * 0.65 * d); // roadside flowers

        // --- Shore wetness -------------------------------------------------------
        const wet = smooth(1.8, 0.0, distRiver) * smooth(1.0, 0.1, aboveWater);

        mask[ti * 4 + 0] = Math.round(clamp01(d) * 255);
        mask[ti * 4 + 1] = Math.round(clamp01(rf) * 255);
        mask[ti * 4 + 2] = Math.round(clamp01(flowers) * 255);
        mask[ti * 4 + 3] = Math.round(clamp01(wet) * 255);
      }
    }

    this.heightTex = new THREE.DataTexture(heights, res, res, THREE.RedFormat, THREE.HalfFloatType);
    this.heightTex.minFilter = THREE.LinearFilter;
    this.heightTex.magFilter = THREE.LinearFilter;
    this.heightTex.wrapS = this.heightTex.wrapT = THREE.ClampToEdgeWrapping;
    this.heightTex.generateMipmaps = false;
    this.heightTex.needsUpdate = true;

    this.maskTex = new THREE.DataTexture(mask, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.maskTex.minFilter = THREE.LinearFilter;
    this.maskTex.magFilter = THREE.LinearFilter;
    this.maskTex.wrapS = this.maskTex.wrapT = THREE.ClampToEdgeWrapping;
    this.maskTex.generateMipmaps = false;
    this.maskTex.needsUpdate = true;
    this.maskData = mask;
  }

  /**
   * Bakes a "road frame" texture (RGBA16F) used only by the terrain path shader:
   *   R = signed distance to the road centre line (m)   -> wheel ruts, crisp edges
   *   G,B = road tangent (x, z)                          -> streaks aligned with the path
   *   A = 1 inside the baked band (<= 8 m from a road)
   * Uses the exact RoadManager spline curves; only texels near a road are evaluated.
   */
  bakeRoadFrame(roadManager) {
    if (!roadManager) return null;
    const curves = [roadManager.mainCurve, roadManager.forkCurve, roadManager.dojoCurve, roadManager.elderCurve].filter(Boolean);
    const samples = [];
    curves.forEach((curve) => {
      const n = 260;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = curve.getPoint(t);
        const tg = curve.getTangent(t);
        samples.push({ x: p.x, z: p.y, tx: tg.x, tz: tg.y });
      }
    });
    const res = this.res;
    const step = this.size / (res - 1);
    const data = new Uint16Array(res * res * 4);
    const toHalf = THREE.DataUtils.toHalfFloat;
    const far = toHalf(99.0), zero = toHalf(0.0), one = toHalf(1.0);
    const road = this.terrain.geometry.attributes.aRoadFactor;
    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const ti = i * res + j;
        const x = -this.half + j * step;
        const z = -this.half + i * step;
        data[ti * 4 + 0] = far; data[ti * 4 + 1] = zero; data[ti * 4 + 2] = zero; data[ti * 4 + 3] = zero;
        // Cheap reject: no road vertex within 4 texels (~7.5 m)
        if (road && road.getX(ti) <= 0.0) {
          let nearRoad = false;
          for (let di = -4; di <= 4 && !nearRoad; di++) {
            for (let dj = -4; dj <= 4; dj++) {
              const ii = i + di, jj = j + dj;
              if (ii < 0 || jj < 0 || ii >= res || jj >= res) continue;
              if (road.getX(ii * res + jj) > 0.0) { nearRoad = true; break; }
            }
          }
          if (!nearRoad) continue;
        }
        let best = Infinity, bs = null;
        for (let k = 0; k < samples.length; k++) {
          const sp = samples[k];
          const dx = x - sp.x, dz = z - sp.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < best) { best = d2; bs = sp; }
        }
        if (!bs || best > 64.0) continue;
        // Signed distance: cross(T, P - C)
        const signed = bs.tx * (z - bs.z) - bs.tz * (x - bs.x);
        data[ti * 4 + 0] = toHalf(signed);
        data[ti * 4 + 1] = toHalf(bs.tx);
        data[ti * 4 + 2] = toHalf(bs.tz);
        data[ti * 4 + 3] = one;
      }
    }
    const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.roadFrameTex = tex;
    return tex;
  }

  /** CPU lookup of the grass density (used by other systems, e.g. tree scattering). */
  sampleMask(x, z, channel = 0) {
    const fx = THREE.MathUtils.clamp((x + this.half) / this.size, 0, 1) * (this.res - 1);
    const fz = THREE.MathUtils.clamp((z + this.half) / this.size, 0, 1) * (this.res - 1);
    const j = Math.round(fx), i = Math.round(fz);
    return this.maskData[(i * this.res + j) * 4 + channel] / 255;
  }

  /** GLSL uniform block + helpers shared by every shader that reads the baked data. */
  static glsl() {
    return /* glsl */ `
      uniform sampler2D uTerrainHeight;
      uniform sampler2D uTerrainMask;
      uniform float uTerrainSize;
      vec2 terrainUv(vec2 xz) {
        // Half-texel inset so the linear filter interpolates exactly between vertices.
        float res = 257.0;
        vec2 uv = (xz + uTerrainSize * 0.5) / uTerrainSize;
        return (uv * (res - 1.0) + 0.5) / res;
      }
      float terrainHeightAt(vec2 xz) { return texture2D(uTerrainHeight, terrainUv(xz)).r; }
      vec4 terrainMaskAt(vec2 xz) { return texture2D(uTerrainMask, terrainUv(xz)); }
    `;
  }

  uniforms() {
    return {
      uTerrainHeight: { value: this.heightTex },
      uTerrainMask: { value: this.maskTex },
      uTerrainSize: { value: this.size }
    };
  }
}

function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
/** smoothstep that also supports reversed edges on the CPU (JS only — never in GLSL). */
function smooth(e0, e1, x) {
  if (e0 > e1) return 1.0 - smooth(e1, e0, x);
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
