import * as THREE from 'three';
import { GLTFLoader } from '../../../../vendor/GLTFLoader.js';
import { WaterManager } from './WaterManager.js';
import { getSoftToonRamp } from './genshin/GenshinMaterials.js';

/**
 * Wooden footbridge over the river rapids of the Forest island. It joins the end of the
 * Elder-Tree path (west bank) with the Shrine road (east bank).
 *
 * The model is the "SmallBridge" mesh of assets/environment/bridge.glb (the file also holds a flag,
 * a gate and a lamp, which are not used). One module is about 7 m long once scaled to a 4 m wide
 * deck, so 4 modules are chained along a gentle arch, with the model's own proportions. Only the
 * lower ends of the posts are lengthened so that every post reaches below the water surface.
 *
 * Gameplay:
 *   - getDeckHeight(x, z) → walkable deck height (profile sampled on the deck once it is built,
 *     gap-free across the module joints), or null off the bridge;
 *   - two side rails (collision segments) are added while the Forest is active.
 */
export const FOREST_BRIDGE = {
  a: { x: 17.3, z: 27.0 },   // west bank, end of the Elder-Tree path
  b: { x: 53.4, z: 22.0 },   // east bank, on the Shrine road
  width: 4.0,                // deck width (m)
  modules: 4,
  arch: 0.6,                 // extra rise at mid-span (m)
  endLift: 0.22              // deck ends sit slightly above the bank (grass never pokes through)
};

/**
 * Puente del pueblo (Hito 66): donde el camino de los Riscos cruza el río bajo el Gran Árbol, ahora que el río ya
 * no se puede vadear ahí. Mismo modelo y montaje que el de los rápidos.
 */
export const FOREST_BRIDGE_VILLAGE = {
  a: { x: 2.2, z: -29.2 },   // orilla oeste, al pie del Gran Árbol
  b: { x: 30.6, z: -21.9 },  // orilla este, inicio del camino del Santuario
  width: 4.0,
  modules: 4,
  arch: 0.7,
  endLift: 0.22
};

/**
 * Muelle de la playa (Hito 79): mismo modelo, de la arena hacia el mar, junto a la tienda de pescado del barquero. Tablero a
 * altura fija (`level`), sin arco, y un tope al final (`endCap`) para no caerse al mar. Desde aquí se pesca.
 */
export const FOREST_PIER = {
  a: { x: 42.7, z: 138.2 },  // Hito 82d: entrada en la arena, a unos 6 m de Kawa (43, 132,2)
  b: { x: 52.6, z: 153.2 },  // punta, 18 m mar adentro (dirección marcada por el usuario, ~57° desde +x)
  width: 4.0,
  modules: 2,
  arch: 0,
  endLift: 0.22,
  level: 0.8,                // Hito 82c: tablero bajo, a ras de la arena de la orilla de Kawa (el mar está a 0,45)
  endCap: true
};

const RAIL_TAG = 'forest_bridge_rail';

export class ForestBridge {
  /**
   * @param {object} zone  DemoScenaZone22
   * @param {object} [cfg]  extremos y medidas (FOREST_BRIDGE o FOREST_BRIDGE_VILLAGE)
   * @param {{name?:string, railTag?:string}} [opts]
   */
  constructor(zone, cfg = FOREST_BRIDGE, opts = {}) {
    this.zone = zone;
    this.cfg = cfg;
    this.railTag = opts.railTag || RAIL_TAG;
    this.group = new THREE.Group();
    this.group.name = opts.name || 'ForestBridge';
    zone.group.add(this.group);
    this.meshes = [];
    this.ready = false;
    this.active = false;

    const { a, b, width } = this.cfg;
    this.dir = new THREE.Vector2(b.x - a.x, b.z - a.z);
    this.length = this.dir.length();
    this.dir.normalize();
    this.normal = new THREE.Vector2(-this.dir.y, this.dir.x);
    this.halfWalk = width * 0.42;

    this._ray = new THREE.Raycaster();
    this._down = new THREE.Vector3(0, -1, 0);
    this._origin = new THREE.Vector3();

    this.loading = this._build().catch((err) => {
      console.warn('[ForestBridge] bridge.glb could not be built:', err);
    });
  }

  async _build() {
    const gltf = await new GLTFLoader().loadAsync('./assets/environment/bridge.glb');
    gltf.scene.updateMatrixWorld(true);
    let src = null;
    gltf.scene.traverse((o) => { if (o.isMesh && o.name === 'SmallBridge') src = o; });
    if (!src) throw new Error('SmallBridge mesh not found');

    // 1. Bake the authored transform, then align the bridge length with +X (principal axis in XZ)
    const geo = src.geometry.clone().applyMatrix4(src.matrixWorld);
    const p = geo.attributes.position;
    let mx = 0, mz = 0;
    for (let i = 0; i < p.count; i++) { mx += p.getX(i); mz += p.getZ(i); }
    mx /= p.count; mz /= p.count;
    let sxx = 0, szz = 0, sxz = 0;
    for (let i = 0; i < p.count; i++) {
      const dx = p.getX(i) - mx, dz = p.getZ(i) - mz;
      sxx += dx * dx; szz += dz * dz; sxz += dx * dz;
    }
    const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);
    geo.translate(-mx, 0, -mz);
    geo.rotateY(ang);
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const len0 = bb.max.x - bb.min.x;
    const wid0 = bb.max.z - bb.min.z;
    const zMid = (bb.min.z + bb.max.z) * 0.5;

    // Deck top at the two ends (central band, first/last 6 % of the length)
    let yEnd = -Infinity;
    for (let i = 0; i < p.count; i++) {
      const u = (p.getX(i) - bb.min.x) / len0;
      if ((u < 0.06 || u > 0.94) && Math.abs(p.getZ(i) - zMid) < wid0 * 0.18) yEnd = Math.max(yEnd, p.getY(i));
    }
    if (!Number.isFinite(yEnd)) yEnd = bb.min.y + (bb.max.y - bb.min.y) * 0.69;
    // Module origin: start of the deck, centred across, deck-end height at y = 0
    geo.translate(-bb.min.x, -yEnd, -zMid);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const postDepth = yEnd - bb.min.y; // how far the posts hang below the deck ends (model units)

    // 2. Soft toon wood (same light ramp as the Forest trees); keeps the painted plank texture
    const srcMat = src.material;
    const mat = new THREE.MeshToonMaterial({
      color: new THREE.Color(0xffffff),
      map: srcMat.map || null,
      gradientMap: getSoftToonRamp(),
      side: THREE.DoubleSide
    });
    if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.name = 'ForestBridgeWood';

    // 3. Chain the modules along the arch (uniform scale: the model keeps its proportions)
    const { a, b, width, modules, arch, endLift } = this.cfg;
    const terrain = this.zone.terrain;
    const yA = this.cfg.level ?? terrain.getHeight(a.x, a.z) + endLift;
    const yB = this.cfg.level ?? terrain.getHeight(b.x, b.z) + endLift;
    this.deckY = (t) => yA + (yB - yA) * t + arch * 4 * t * (1 - t);
    const kz = width / wid0;
    const ky = kz;
    const postCut = -0.85 * postDepth; // only the bottom rings of the posts lie this low (model units)

    const yaw = Math.atan2(-this.dir.y, this.dir.x);
    const segH = this.length / modules;
    for (let i = 0; i < modules; i++) {
      const t0 = i / modules, t1 = (i + 1) / modules;
      const y0 = this.deckY(t0), y1 = this.deckY(t1);
      const pitch = Math.atan2(y1 - y0, segH);
      // Lengthen the post ends of this module so they dip 0.4 m into the water
      const zA = a.z + (b.z - a.z) * t0, zB = a.z + (b.z - a.z) * t1;
      const waterMin = Math.min(WaterManager.getRiverWaterHeight(zA), WaterManager.getRiverWaterHeight(zB));
      const extraWorld = Math.max(0, Math.max(y0, y1) + 0.75 * arch - (waterMin - 0.4) - postDepth * ky);
      let mGeo = geo;
      if (extraWorld > 0.01) {
        mGeo = geo.clone();
        const mp = mGeo.attributes.position;
        const extra = extraWorld / ky;
        for (let k = 0; k < mp.count; k++) if (mp.getY(k) < postCut) mp.setY(k, mp.getY(k) - extra);
        mGeo.computeBoundingSphere();
      }
      const mesh = new THREE.Mesh(mGeo, mat);
      mesh.name = `${this.group.name}_${i}`;
      mesh.position.set(a.x + this.dir.x * segH * i, y0, a.z + this.dir.y * segH * i);
      mesh.rotation.set(0, yaw, pitch, 'YZX');
      mesh.scale.set(Math.hypot(segH, y1 - y0) / len0, ky, kz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.meshes.push(mesh);
    }
    this.group.updateMatrixWorld(true);
    this._sampleProfile();
    this.ready = true;
    if (this.active) this._addRails();
  }

  /** Samples the deck top every 0.1 m along the bridge (gaps at the module joints are bridged). */
  _sampleProfile() {
    const step = 0.1;
    const n = Math.ceil(this.length / step) + 1;
    const prof = new Float32Array(n).fill(NaN);
    this._ray.far = 120;
    for (let i = 0; i < n; i++) {
      const u = Math.min(this.length, i * step);
      let best = -Infinity;
      for (const v of [-0.6, 0, 0.6]) {
        this._origin.set(this.cfg.a.x + this.dir.x * u + this.normal.x * v, 60, this.cfg.a.z + this.dir.y * u + this.normal.y * v);
        this._ray.set(this._origin, this._down);
        const hit = this._ray.intersectObjects(this.meshes, false)[0];
        if (hit) best = Math.max(best, hit.point.y);
      }
      if (Number.isFinite(best)) prof[i] = best;
    }
    // Fill misses (joints, ends) by linear interpolation between valid neighbours
    let last = -1;
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(prof[i])) continue;
      if (last < 0) for (let k = 0; k < i; k++) prof[k] = prof[i];
      else for (let k = last + 1; k < i; k++) prof[k] = prof[last] + (prof[i] - prof[last]) * ((k - last) / (i - last));
      last = i;
    }
    if (last < 0) for (let k = 0; k < n; k++) prof[k] = this.deckY(k / (n - 1));
    else for (let k = last + 1; k < n; k++) prof[k] = prof[last];
    this.profile = prof;
    this.profileStep = step;
  }

  /** Walkable deck height at (x, z), or null when (x, z) is not on the bridge. */
  getDeckHeight(x, z) {
    if (!this.ready || !this.profile) return null;
    const dx = x - this.cfg.a.x, dz = z - this.cfg.a.z;
    const u = dx * this.dir.x + dz * this.dir.y;
    if (u < -0.3 || u > this.length + 0.3) return null;
    const v = dx * this.normal.x + dz * this.normal.y;
    if (Math.abs(v) > this.halfWalk) return null;
    const f = Math.min(this.profile.length - 1, Math.max(0, u / this.profileStep));
    const i = Math.floor(f), j = Math.min(this.profile.length - 1, i + 1);
    return this.profile[i] + (this.profile[j] - this.profile[i]) * (f - i);
  }

  _addRails() {
    const col = this.zone.om && this.zone.om.collisions;
    if (!col || typeof col.addSegment !== 'function') return;
    this._removeRails();
    const { a, b, width } = this.cfg;
    const off = width * 0.5 - 0.15;
    for (const s of [-1, 1]) {
      const ox = this.normal.x * off * s, oz = this.normal.y * off * s;
      // Rails stop 1.2 m short of each end so the bridge is entered straight from the path
      const e0 = 1.2, e1 = this.length - 1.2;
      col.addSegment(a.x + this.dir.x * e0 + ox, a.z + this.dir.y * e0 + oz,
        a.x + this.dir.x * (this.cfg.endCap ? this.length : e1) + ox, a.z + this.dir.y * (this.cfg.endCap ? this.length : e1) + oz, 0.25, this.railTag);
    }
    if (this.cfg.endCap) { // muelle: tope en la punta
      const ex = a.x + this.dir.x * (this.length - 0.2), ez = a.z + this.dir.y * (this.length - 0.2);
      col.addSegment(ex - this.normal.x * off, ez - this.normal.y * off, ex + this.normal.x * off, ez + this.normal.y * off, 0.25, this.railTag);
    }
  }

  _removeRails() {
    const col = this.zone.om && this.zone.om.collisions;
    if (!col || !Array.isArray(col.segments)) return;
    const tag = this.railTag;
    col.segments = col.segments.filter((sg) => sg.tag !== tag);
  }

  setActive(active) {
    this.active = active;
    if (!this.ready) return;
    if (active) this._addRails();
    else this._removeRails();
  }
}
