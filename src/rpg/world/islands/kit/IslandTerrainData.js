import * as THREE from 'three';
import { GenshinTerrainData } from '../../demo_scena/genshin/GenshinTerrainData.js';

/**
 * IslandTerrainData — Same baked GPU data as the Forest (GenshinTerrainData), but every
 * biome decision comes from an island profile instead of the Forest river / dojo rules:
 *
 *   heightTex (R16F)  terrain height
 *   maskTex  (RGBA8)  R = grass density · G = path factor · B = flowers · A = wetness
 *   roadTex  (RGBA16F) R = signed distance to the nearest path centre line (m)
 *                      G,B = path tangent (x, z) · A = path half width (0 = no path nearby)
 *
 * Paths are plain polylines ([[x, z], ...] + width) authored per island, sampled with a
 * Catmull-Rom spline so they read as organic trails. The Forest files are not modified:
 * this class only overrides _bake() of the shared base.
 */
let PENDING_PROFILE = null;

export class IslandTerrainData extends GenshinTerrainData {
  /**
   * @param {object} terrain  { size, segments, geometry (rotated PlaneGeometry), waterLevel? }
   * @param {object} profile  { paths: [{ points: [[x,z],...], width }], mask(ctx) → { grass, flowers, wet } }
   */
  constructor(terrain, profile) {
    PENDING_PROFILE = profile || {};
    if (terrain.waterLevel === undefined) terrain.waterLevel = 0.45;
    super(terrain);
    PENDING_PROFILE = null;
  }

  _bake() {
    const profile = PENDING_PROFILE || {};
    this.profile = profile;
    this.paths = (profile.paths || []).map((p) => this._samplePath(p));

    const geo = this.terrain.geometry;
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const res = this.res;
    const N = res * res;
    const heights = new Uint16Array(N);
    const mask = new Uint8Array(N * 4);
    this.heightsF = new Float32Array(N);
    const road = new Uint16Array(N * 4);
    const toHalf = THREE.DataUtils.toHalfFloat;
    const far = toHalf(99.0), farNeg = toHalf(-99.0), zero = toHalf(0.0);
    const signedFar = Boolean(profile.pathFrameSignedFar || (profile.terrain && profile.terrain.pathFrameSignedFar));

    const ctx = { x: 0, z: 0, y: 0, ny: 1, road: 0, pathDist: 99, data: this };
    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const vi = i * res + j;
        const x = pos.getX(vi);
        const z = pos.getZ(vi);
        const y = pos.getY(vi);
        heights[vi] = toHalf(y);
        this.heightsF[vi] = y;
        if (y < this.minHeight) this.minHeight = y;
        if (y > this.maxHeight) this.maxHeight = y;

        // Nearest path sample → signed distance + tangent + half width
        const near = this._nearestPath(x, z);
        let rf = 0.0;
        road[vi * 4 + 0] = far; road[vi * 4 + 1] = zero; road[vi * 4 + 2] = zero; road[vi * 4 + 3] = zero;
        if (near) {
          const halfW = near.width * 0.5;
          rf = 1.0 - smooth(halfW * 0.6, halfW + 1.6, near.dist);
          if (near.dist < halfW + 8.0) {
            road[vi * 4 + 0] = toHalf(near.signed);
            road[vi * 4 + 1] = toHalf(near.tx);
            road[vi * 4 + 2] = toHalf(near.tz);
            road[vi * 4 + 3] = toHalf(halfW);
          } else if (signedFar && near.signed < 0) {
            // Keep the sign outside the band: linear filtering between −(halfW+8) and +99 used to
            // cross 0 at the band edge and drew a thin stair-stepped "path" line on that side.
            road[vi * 4 + 0] = farNeg;
          }
        }

        ctx.x = x; ctx.z = z; ctx.y = y;
        ctx.ny = nor ? nor.getY(vi) : 1.0;
        ctx.road = rf;
        ctx.pathDist = near ? near.dist : 99;
        const m = profile.mask ? profile.mask(ctx) : { grass: 1, flowers: 0, wet: 0 };
        let grass = (m.grass === undefined ? 1 : m.grass) * smooth(0.42, 0.14, rf);
        mask[vi * 4 + 0] = Math.round(clamp01(grass) * 255);
        mask[vi * 4 + 1] = Math.round(clamp01(rf) * 255);
        mask[vi * 4 + 2] = Math.round(clamp01((m.flowers || 0) * (grass > 0.05 ? 1 : 0)) * 255);
        mask[vi * 4 + 3] = Math.round(clamp01(m.wet || 0) * 255);
      }
    }

    const mk = (data, format, type) => {
      const t = new THREE.DataTexture(data, res, res, format, type);
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.generateMipmaps = false;
      t.needsUpdate = true;
      return t;
    };
    this.heightTex = mk(heights, THREE.RedFormat, THREE.HalfFloatType);
    this.maskTex = mk(mask, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.roadFrameTex = mk(road, THREE.RGBAFormat, THREE.HalfFloatType);
    this.maskData = mask;
  }

  _samplePath(p) {
    const pts = p.points.map(([x, z]) => new THREE.Vector2(x, z));
    const curve = pts.length > 2 ? new THREE.SplineCurve(pts) : new THREE.LineCurve(pts[0], pts[1]);
    const len = curve.getLength();
    const n = Math.max(8, Math.ceil(len / 1.5));
    const samples = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const c = curve.getPointAt(t);
      const tg = curve.getTangentAt(t);
      samples.push({ x: c.x, z: c.y, tx: tg.x, tz: tg.y });
    }
    // Coarse bounds for cheap rejection
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    samples.forEach((s) => { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minZ = Math.min(minZ, s.z); maxZ = Math.max(maxZ, s.z); });
    const pad = (p.width || 4) * 0.5 + 10;
    return { samples, width: p.width || 4, minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
  }

  _nearestPath(x, z) {
    let best = null;
    let bestD2 = Infinity;
    for (const p of this.paths) {
      if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
      const s = p.samples;
      for (let k = 0; k < s.length; k++) {
        const dx = x - s[k].x, dz = z - s[k].z;
        const d2 = dx * dx + dz * dz;
        // Compare by distance minus half width so wide roads win over narrow trails
        const score = d2;
        if (score < bestD2) { bestD2 = score; best = { s: s[k], width: p.width }; }
      }
    }
    if (!best) return null;
    const { s } = best;
    const signed = s.tx * (z - s.z) - s.tz * (x - s.x);
    return { dist: Math.sqrt(bestD2), signed, tx: s.tx, tz: s.tz, width: best.width };
  }

  /** CPU path factor (0..1) used by prop scattering to keep trails clear. */
  pathFactorAt(x, z) {
    return this.sampleMask(x, z, 1);
  }

  /** Not used on islands (paths are baked in _bake). */
  bakeRoadFrame() {
    return this.roadFrameTex;
  }
}

function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
/** CPU smoothstep that supports reversed edges (JS only — never in GLSL). */
export function smooth(e0, e1, x) {
  if (e0 > e1) return 1.0 - smooth(e1, e0, x);
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
