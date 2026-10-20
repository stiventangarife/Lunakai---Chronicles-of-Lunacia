import * as THREE from 'three';
import { GLTFLoader } from '../../../../vendor/GLTFLoader.js';
import { LightingManager } from '../demo_scena/LightingManager.js';
import { FootstepEffectsManager } from '../demo_scena/FootstepEffectsManager.js';
import { DistantIsland } from '../demo_scena/DistantIsland.js';
import { SavannaDistantIslands } from '../savanna/SavannaDistantIslands.js';
import { createSeededRandom } from '../demo_scena/MathUtils.js';
import { IslandArtLayer } from './kit/IslandArtLayer.js';

/**
 * GrandIslandZone (Hito 23) — Base for the three new 480 m islands (Arctic, Mystic, Dungeon).
 * Same footprint and coordinate convention as the Forest / Savanna (island centred on 0,0,
 * coast at ~144 m, sea level 0.45 m). Everything visual comes from the shared Genshin
 * IslandArtLayer; this class owns geometry, gameplay plumbing and lifecycle:
 *
 *   terrain      PlaneGeometry 480 m / 256 segs displaced by def.height(x, z)
 *   lights       own LightingManager (hidden while inactive)
 *   props        GLTF rocks (instanced per mesh) + island set pieces from the definition
 *   collisions   circles added on activation, removed on deactivation (tag grandisle_<id>_)
 *   horizon      silhouettes of the other islands at their true relative positions
 *
 * The zone is created lazily the first time the player travels there (keeps startup RAM low).
 */
const ISLAND_CENTRES = {
  forest: new THREE.Vector3(0, 0, 0),
  arctic: new THREE.Vector3(40, 0, -1550),
  savanna: new THREE.Vector3(1550, 0, 40),
  mystic: new THREE.Vector3(-1550, 0, -60),
  dungeon: new THREE.Vector3(60, 0, 1550)
};

const _gltfCache = new Map();
const _loader = new GLTFLoader();
export function loadGLTF(url) {
  if (!_gltfCache.has(url)) {
    _gltfCache.set(url, new Promise((resolve) => {
      _loader.load(url, (g) => resolve(g), undefined, () => { console.warn('[GrandIslandZone] missing asset', url); resolve(null); });
    }));
  }
  return _gltfCache.get(url);
}

export class IslandHeightTerrain {
  constructor(parent, heightFn, opts = {}) {
    this.size = 480;
    this.segments = opts.segments || 256;
    this.heightFn = heightFn;
    this.waterLevel = 0.45;
    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);
    const p = this.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightFn(p.getX(i), p.getZ(i)));
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
    this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({ color: 0x888888 }));
    this.mesh.name = opts.name || 'IslandTerrainMesh';
    this.mesh.receiveShadow = true;
    parent.add(this.mesh);
  }
  getHeight(x, z) { return this.heightFn(x, z); }
  getNormal(x, z) {
    const e = 0.5;
    const n = new THREE.Vector3(this.heightFn(x - e, z) - this.heightFn(x + e, z), 2 * e, this.heightFn(x, z - e) - this.heightFn(x, z + e));
    return n.normalize();
  }
}

export class GrandIslandZone {
  /**
   * def = {
   *   id, label, height(x, z), profile(zone) → IslandArtLayer profile,
   *   rocks: [{ url, count, place(rng, zone) → {x, z, s, sy, rot} | null }],
   *   rockStyle: islandRockMaterial opts,
   *   build(zone) → async set pieces (landmarks, crystals…) — may push collisions with zone.addCollider()
   * }
   */
  constructor(om, def) {
    this.om = om;
    this.def = def;
    this.id = def.id;
    this.scene = om.scene;
    this.renderer = om.renderer;
    this.group = new THREE.Group();
    this.group.name = `GrandIsland_${def.id}`;
    this.group.visible = false;
    this.scene.add(this.group);
    this.isLoaded = false;
    this.isActive = false;
    this._loading = null;
    this.colliders = [];
    this.updatables = [];
    this.rng = createSeededRandom(def.seed || 2323);
  }

  /** Idempotent async init (safe to call from several places). */
  init() {
    if (this.isLoaded) return Promise.resolve();
    if (!this._loading) this._loading = this._init();
    return this._loading;
  }

  async _init() {
    const t0 = performance.now();
    console.log(`[GrandIslandZone] 🏝️ Construyendo ${this.def.label}...`);
    this.terrain = new IslandHeightTerrain(this.group, this.def.height, { name: `${this.id}_Terrain` });
    this.lightingManager = new LightingManager(this.scene);
    this.lightingManager.setVisible(false);
    this.footstepManager = new FootstepEffectsManager(this.group, this.terrain, (x, z) => this.getHeight(x, z)); // huellas sobre puentes y hielo

    // Set pieces & props first (trees / crystals may depend on them), then the art layer
    if (typeof this.def.build === 'function') await this.def.build(this);
    await this._buildRocks();
    this._buildHorizon();

    this.art = new IslandArtLayer({
      om: this.om,
      renderer: this.renderer,
      root: this.group,
      terrain: this.terrain,
      lightingManager: this.lightingManager
    }, this.def.profile(this));
    if (this.horizonMaterials) this.horizonMaterials.forEach((m) => this._tintHorizon(m));

    this.isLoaded = true;
    this.setActive(this.isActive);
    console.log(`[GrandIslandZone] ✨ ${this.def.label} lista en ${Math.round(performance.now() - t0)} ms`);
  }

  getHeight(x, z) {
    return this.terrain ? this.terrain.getHeight(x, z) : 0;
  }

  getNormal(x, z) {
    return this.terrain ? this.terrain.getNormal(x, z) : new THREE.Vector3(0, 1, 0);
  }

  addCollider(x, z, radius) {
    this.colliders.push({ x, z, r: radius });
  }

  /** Instanced GLTF rocks restyled with the island stone material. */
  async _buildRocks() {
    const { islandRockMaterial } = await import('./kit/IslandMaterials.js');
    for (const spec of this.def.rocks || []) {
      const gltf = await loadGLTF(spec.url);
      if (!gltf) continue;
      const meshes = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
      if (!meshes.length) continue;
      const rng = createSeededRandom(spec.seed || 77);
      // One placement list per source mesh (each GLTF may hold several rock shapes)
      const lists = meshes.map(() => []);
      let guard = 0;
      for (let i = 0; i < spec.count && guard < spec.count * 8; guard++) {
        const p = spec.place(rng, this);
        if (!p) continue;
        lists[Math.floor(rng() * meshes.length)].push(p);
        i++;
      }
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      meshes.forEach((src, k) => {
        const list = lists[k];
        if (!list.length) return;
        // Bake the node transform so every rock sits at its local origin
        const geo = src.geometry.clone();
        geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(src.getWorldQuaternion(new THREE.Quaternion())));
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        const cx = (bb.min.x + bb.max.x) * 0.5, cz = (bb.min.z + bb.max.z) * 0.5;
        geo.translate(-cx, -bb.min.y, -cz);
        // Normalise by the largest dimension (tall source rocks must not become giant pillars)
        const size = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z, (bb.max.y - bb.min.y) * 1.25, 0.01);
        const mat = islandRockMaterial(src.material, this.def.rockStyle || {});
        const inst = new THREE.InstancedMesh(geo, mat, list.length);
        inst.name = `${this.id}_Rock_${k}`;
        inst.castShadow = true;
        inst.receiveShadow = true;
        list.forEach((p, i) => {
          const s = (p.s || 1) / size;
          const sy = (p.sy || p.s || 1) / size;
          const y = this.getHeight(p.x, p.z) - (p.sink ?? 0.25) * (p.s || 1);
          q.setFromEuler(new THREE.Euler(p.tilt ? (rng() - 0.5) * p.tilt : 0, p.rot ?? rng() * Math.PI * 2, p.tilt ? (rng() - 0.5) * p.tilt : 0));
          m4.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(s, sy, s));
          inst.setMatrixAt(i, m4);
          if ((p.s || 1) > 2.2) this.addCollider(p.x, p.z, (p.s || 1) * 0.42);
        });
        inst.instanceMatrix.needsUpdate = true;
        inst.computeBoundingSphere();
        this.group.add(inst);
      });
    }
  }

  /** Other islands on the horizon at their real relative positions (fog-free silhouettes). */
  _buildHorizon() {
    const me = ISLAND_CENTRES[this.id];
    if (!me) return;
    this.horizon = new THREE.Group();
    this.horizon.name = `${this.id}_Horizon`;
    this.group.add(this.horizon);
    const di = new DistantIsland(this.horizon);
    // DistantIsland children: [arctic, savanna, mystic, volcano]
    const order = ['arctic', 'savanna', 'mystic', 'dungeon'];
    di.group.position.set(-me.x, 0, -me.z);
    di.group.children.forEach((child, i) => { if (order[i] === this.id) child.visible = false; });
    // Forest silhouette (from the Savanna horizon set) at the archipelago centre
    const sdi = new SavannaDistantIslands(this.horizon);
    sdi.group.children.forEach((child, i) => {
      if (i === 0) child.position.set(-me.x, child.position.y, -me.z);
      else child.visible = false;
    });
    this.horizonMaterials = [...(di.materials || []), ...(sdi.materials || [])];
  }

  _tintHorizon(m) {
    const P = this.art && this.art.profile;
    if (!P || !m.uniforms) return;
    if (m.uniforms.uHorizonHazeColor) m.uniforms.uHorizonHazeColor.value.set(P.fog.color);
    if (m.uniforms.uExtraHaze) m.uniforms.uExtraHaze.value = P.horizonHaze ?? 0.3;
    if (m.uniforms.uSunDir) m.uniforms.uSunDir.value.copy(this.art.sunDir);
  }

  update(delta, playerPos) {
    if (!this.isActive || !this.isLoaded) return;
    if (this.lightingManager && playerPos) this.lightingManager.updateLightTarget(playerPos);
    if (this.footstepManager && typeof this.footstepManager.update === 'function') this.footstepManager.update(delta, this.om.player);
    this.updatables.forEach((fn) => fn(delta, playerPos));
    if (this.art) this.art.update(delta, playerPos);
  }

  setActive(active) {
    this.isActive = active;
    this.group.visible = active && this.isLoaded;
    if (!this.isLoaded) return;
    if (this.lightingManager) this.lightingManager.setVisible(active);
    if (this.footstepManager && typeof this.footstepManager.setVisible === 'function') this.footstepManager.setVisible(active);
    const col = this.om.collisions;
    const tag = `grandisle_${this.id}_`;
    if (col) {
      if (typeof col.removeCirclesByTag === 'function') col.removeCirclesByTag(tag);
      if (active && typeof col.addCircle === 'function') this.colliders.forEach((c, i) => col.addCircle(c.x, c.z, c.r, tag + i));
    }
    if (this.art) this.art.setActive(active);
  }
}
