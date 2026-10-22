import * as THREE from 'three';
import { createSeededRandom } from '../demo_scena/MathUtils.js';

/**
 * SavannaPropsManager.js - High performance instanced props for Savannah Island:
 * 1. Oasis Palms: Cluster of 22 real 3D palm trees (PalmTree_1 to 5) around the plateau oasis basin.
 * 2. Golden Acacias & Desert Trees: Twisted and common trees with warm golden/ochre canopies and dead desert trees.
 * 3. Desert Rocks: Rock_sabana1-5 models, plus cliff columns textured with Rocks_Desert_Diffuse.png.
 * 4. Desert shrubs, dry ferns, and instanced pebbles along trails.
 * 5. Strict deterministic placement using Mulberry32 (never shifts between reloads).
 * 6. High performance GPU InstancedMesh rendering (0 unnecessary draw calls).
 */

/** Height of cactus_forge3D in model units, and how much its base is sunk into the sand (model units). */
const CACTUS_MODEL_HEIGHT = 0.8;
const CACTUS_SINK = -0.03;

export class SavannaPropsManager {
  /**
   * @param {{ deferLegacyTrees?: boolean }} [opts] con el arte Genshin las palmeras y árboles GLTF antiguos
   *   no se ven (IslandTrees los sustituye en las mismas posiciones): no se construyen. Sus posiciones
   *   (pendingPalms / pendingTrees) se generan igual. ensureLegacyTrees() los construye si hacen falta.
   */
  constructor(parentGroup, terrain, assetManager, opts = {}) {
    this.deferLegacyTrees = !!opts.deferLegacyTrees;
    this.parentGroup = parentGroup;
    this.terrain = terrain;
    this.assetManager = assetManager;

    this.group = new THREE.Group();
    this.group.name = 'SavannaPropsGroup';
    if (this.parentGroup) {
      this.parentGroup.add(this.group);
    }

    this.rng = createSeededRandom(654321);

    this.pendingPalms = [];
    this.pendingTrees = [];
    this.pendingRocks = [];
    this.pendingCacti = [];
    this.pendingVegetation = [];
    this.pendingPebbles = [];

    this.instancedMeshes = [];

    this.populateAllProps();
    this.buildAllInstancedMeshes();
  }

  random() {
    return this.rng();
  }

  populateAllProps() {
    this.spawnOasisPalms();
    this.spawnPlateauPalms();
    this.spawnPlateauAcacias();
    this.spawnTerraceAndRidgeTrees();
    this.spawnSavannaRocks();
    this.spawnSavannaCacti();
    this.spawnDesertVegetation();
    this.spawnTrailPebbles();
  }

  // =========================================================================
  // 1. OASIS PALM TREES (Alrededor de la cuenca del oasis en la meseta)
  // =========================================================================
  spawnOasisPalms() {
    const palmKeys = ['palm_1', 'palm_2', 'palm_3', 'palm_4', 'palm_5', 'tree_palm_bend', 'tree_palm_tall'];
    const oasisCenter = { x: 14.0, z: -12.0 };
    const palmCount = 26;

    for (let i = 0; i < palmCount; i++) {
      // Ring around the oasis pool (radius 14.2m to 21.5m)
      const angle = (i / palmCount) * Math.PI * 2 + (this.random() - 0.5) * 0.35;
      const dist = 14.2 + this.random() * 6.8;
      const x = oasisCenter.x + Math.cos(angle) * dist;
      const z = oasisCenter.y + Math.sin(angle) * dist;
      const y = this.terrain.getHeight(x, z);

      // Select model
      const key = palmKeys[Math.floor(this.random() * palmKeys.length)];

      // Scale between 1.15 and 1.70
      const s = 1.15 + this.random() * 0.55;

      // Lean gently outward or toward water
      const leanAngle = (this.random() - 0.5) * 0.24;
      const leanDir = angle + (this.random() - 0.5) * 0.8;

      const rot = new THREE.Euler(
        Math.sin(leanDir) * leanAngle,
        this.random() * Math.PI * 2,
        Math.cos(leanDir) * leanAngle
      );

      this.pendingPalms.push({
        key,
        pos: new THREE.Vector3(x, y, z),
        rot,
        scale: new THREE.Vector3(s, s, s)
      });
    }
  }

  // =========================================================================
  // 1b. PALMERAS EN LA GRAN MESETA Y DUNAS (Sustituyendo pinos del bosque)
  // =========================================================================
  spawnPlateauPalms() {
    const palmKeys = ['palm_1', 'palm_2', 'palm_3', 'palm_4', 'palm_5', 'tree_palm_bend', 'tree_palm_tall'];
    const count = 45;

    for (let i = 0; i < count; i++) {
      const ang = this.random() * Math.PI * 2;
      const r = 22.0 + this.random() * 66.0;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;

      // Avoid inside oasis pool
      const dxOasis = x - 14.0;
      const dzOasis = z - (-12.0);
      if (Math.hypot(dxOasis, dzOasis) < 22.0) continue;

      const y = this.terrain.getHeight(x, z);
      if (y < 20.0) continue; // High summit plateau

      const key = palmKeys[Math.floor(this.random() * palmKeys.length)];
      const s = 1.20 + this.random() * 0.60;

      const leanAngle = (this.random() - 0.5) * 0.18;
      const rot = new THREE.Euler(
        leanAngle,
        this.random() * Math.PI * 2,
        (this.random() - 0.5) * 0.18
      );

      this.pendingPalms.push({
        key,
        pos: new THREE.Vector3(x, y, z),
        rot,
        scale: new THREE.Vector3(s, s, s)
      });
    }
  }

  // =========================================================================
  // 2. ACACIAS Y ÁRBOLES DORADOS EN LA GRAN MESETA SUMMIT
  // =========================================================================
  spawnPlateauAcacias() {
    const treeKeys = [
      'tree_plateau', 'tree_plateau_fall',
      'tree_twisted_1', 'tree_twisted_2', 'tree_twisted_3', 'tree_twisted_4', 'tree_twisted_5',
      'tree_dead_1', 'tree_dead_2', 'tree_dead_3', 'tree_dead_4'
    ];

    const count = 48;
    for (let i = 0; i < count; i++) {
      // Radius on the plateau (between 18m and 88m)
      const ang = this.random() * Math.PI * 2;
      const r = 18.0 + this.random() * 68.0;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;

      // Avoid inside oasis pool
      const dxOasis = x - 14.0;
      const dzOasis = z - (-12.0);
      if (Math.hypot(dxOasis, dzOasis) < 22.0) continue;

      const y = this.terrain.getHeight(x, z);
      if (y < 20.0) continue; // Only high plateau

      const key = treeKeys[Math.floor(this.random() * treeKeys.length)];
      const s = 1.05 + this.random() * 0.55;

      this.pendingTrees.push({
        key,
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(0, this.random() * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s)
      });
    }
  }

  // =========================================================================
  // 3. ÁRBOLES EN TERRAZAS Y RISCOS ESCALONADOS
  // =========================================================================
  spawnTerraceAndRidgeTrees() {
    const deadAndTwisted = [
      'tree_plateau', 'tree_dead_1', 'tree_dead_2', 'tree_dead_3', 'tree_dead_4', 'tree_dead_5',
      'tree_twisted_1', 'tree_twisted_2', 'tree_twisted_3',
      'tree_palm_bend'
    ];

    const count = 38;
    for (let i = 0; i < count; i++) {
      const ang = this.random() * Math.PI * 2;
      const r = 95.0 + this.random() * 45.0; // Intermediate terrace
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = this.terrain.getHeight(x, z);

      if (y < 4.0 || y > 22.0) continue;

      const key = deadAndTwisted[Math.floor(this.random() * deadAndTwisted.length)];
      const s = 0.95 + this.random() * 0.5;

      const targetList = (key === 'tree_palm_bend') ? this.pendingPalms : this.pendingTrees;
      targetList.push({
        key,
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(0, this.random() * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s)
      });
    }
  }

  // =========================================================================
  // 4. ROCAS DE SABANA Y CAÑÓN (Rock_sabana 1-5, rock_smallA/B, rock_smallFlatA, stone_smallA)
  // =========================================================================
  spawnSavannaRocks() {
    const rockKeys = [
      'rock_savanna_1', 'rock_savanna_2', 'rock_savanna_3', 'rock_savanna_4', 'rock_savanna_5',
      'rock_small_a', 'rock_small_b', 'rock_small_flat_a', 'stone_small_a'
    ];

    // Clifftop sentinels & ridge formations
    const count = 80;
    for (let i = 0; i < count; i++) {
      const ang = this.random() * Math.PI * 2;
      // Along terrace edges (R ~ 88-110m and R ~ 125-145m)
      const isPlateauEdge = this.random() < 0.6;
      const r = isPlateauEdge ? (85.0 + this.random() * 25.0) : (120.0 + this.random() * 25.0);

      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = this.terrain.getHeight(x, z);
      if (y < 1.0) continue; // Skip submerged seabed

      const key = rockKeys[Math.floor(this.random() * rockKeys.length)];
      const s = 1.3 + this.random() * 1.6;

      this.pendingRocks.push({
        key,
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(
          (this.random() - 0.5) * 0.2,
          this.random() * Math.PI * 2,
          (this.random() - 0.5) * 0.2
        ),
        scale: new THREE.Vector3(s, s * (0.85 + this.random() * 0.4), s)
      });
    }

    // Oasis rim boulders
    const oasisCenter = { x: 14.0, z: -12.0 };
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + this.random() * 0.3;
      const dist = 16.0 + this.random() * 5.0;
      const x = oasisCenter.x + Math.cos(angle) * dist;
      const z = oasisCenter.y + Math.sin(angle) * dist;
      const y = this.terrain.getHeight(x, z);

      const key = rockKeys[Math.floor(this.random() * rockKeys.length)];
      const s = 1.0 + this.random() * 1.0;

      this.pendingRocks.push({
        key,
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(0, this.random() * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s)
      });
    }
  }

  // =========================================================================
  // 4b. CACTUS DE SABANA (modelo estilizado cactus_forge3D; mismas posiciones que los anteriores)
  // =========================================================================
  spawnSavannaCacti() {
    const cactusKeys = ['cactus_tall', 'cactus_short'];
    const count = 40;

    for (let i = 0; i < count; i++) {
      const ang = this.random() * Math.PI * 2;
      const r = 20.0 + this.random() * 105.0;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;

      // Avoid inside oasis pool
      const dxOasis = x - 14.0;
      const dzOasis = z - (-12.0);
      if (Math.hypot(dxOasis, dzOasis) < 22.0) continue;

      const y = this.terrain.getHeight(x, z);
      if (y < 3.0) continue; // Above beach

      // Same random draws as before (tall / short size class) so every other prop keeps its place
      const sizeClass = cactusKeys[Math.floor(this.random() * cactusKeys.length)];
      const sizeRnd = this.random();
      // cactus_forge3D: 0.8 units tall → tall class 2.2–3.0 m, short class 1.5–2.1 m (reads above the tall grass)
      const h = (sizeClass === 'cactus_tall') ? (2.2 + sizeRnd * 0.8) : (1.5 + sizeRnd * 0.6);
      const s = h / CACTUS_MODEL_HEIGHT;

      this.pendingCacti.push({
        key: 'cactus_forge3d',
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(0, this.random() * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s)
      });
    }
  }

  // =========================================================================
  // 5. VEGETACIÓN DE DESIERTO (Arbustos, Helechos secos y Plantas)
  // =========================================================================
  spawnDesertVegetation() {
    const vegKeys = ['bush_common', 'grass_wispy_tall', 'plant_7', 'fern_1'];
    const count = 90;

    for (let i = 0; i < count; i++) {
      const ang = this.random() * Math.PI * 2;
      const r = 10.0 + this.random() * 105.0;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = this.terrain.getHeight(x, z);

      if (y < 1.5) continue;

      const key = vegKeys[Math.floor(this.random() * vegKeys.length)];
      const s = 0.8 + this.random() * 0.6;

      this.pendingVegetation.push({
        key,
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(0, this.random() * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s)
      });
    }
  }

  // =========================================================================
  // 6. GUIJARROS ESTILIZADOS EN SENDEROS
  // =========================================================================
  spawnTrailPebbles() {
    const pebbleKeys = ['pebble_1', 'pebble_2', 'pebble_3'];
    const count = 50;

    for (let i = 0; i < count; i++) {
      const ang = this.random() * Math.PI * 2;
      const r = 15.0 + this.random() * 95.0;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = this.terrain.getHeight(x, z);

      if (y < 2.0) continue;

      const key = pebbleKeys[Math.floor(this.random() * pebbleKeys.length)];
      const s = 0.5 + this.random() * 0.7;

      this.pendingPebbles.push({
        key,
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(0, this.random() * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s)
      });
    }
  }

  // =========================================================================
  // CONSTRUCCIÓN DE TODAS LAS MALLAS INSTANCIADAS (THREE.InstancedMesh)
  // =========================================================================
  buildAllInstancedMeshes() {
    if (!this.deferLegacyTrees) {
      this._instantiateGroup(this.pendingPalms, 'Palm', false);
      this._instantiateGroup(this.pendingTrees, 'Tree', true); // Tint tree foliage to golden savannah
    }
    this._instantiateGroup(this.pendingRocks, 'Rock', false);
    this._instantiateGroup(this.pendingCacti, 'Cactus', false);
    this._instantiateGroup(this.pendingVegetation, 'Veg', true);
    this._instantiateGroup(this.pendingPebbles, 'Pebble', false);
  }

  /** Construye las palmeras y árboles antiguos si se difirieron (carga antes sus modelos). */
  ensureLegacyTrees() {
    if (this._legacyTreesPromise) return this._legacyTreesPromise;
    const keys = new Set([...this.pendingPalms, ...this.pendingTrees].map((t) => t.key));
    const before = this.instancedMeshes.length;
    this._legacyTreesPromise = Promise.resolve(this.assetManager.loadModels ? this.assetManager.loadModels(keys) : null)
      .then(() => {
        if (this.deferLegacyTrees && !this._legacyBuilt) {
          this._legacyBuilt = true;
          this._instantiateGroup(this.pendingPalms, 'Palm', false);
          this._instantiateGroup(this.pendingTrees, 'Tree', true);
        }
        return this.instancedMeshes.slice(before);
      });
    return this._legacyTreesPromise;
  }

  _instantiateGroup(items, tag, tintWarmFoliage = false) {
    if (!items || items.length === 0) return;

    // Group items by model key
    const groups = new Map();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!groups.has(item.key)) {
        groups.set(item.key, []);
      }
      groups.get(item.key).push(item);
    }

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();

    groups.forEach((instances, key) => {
      const gltf = this.assetManager.getRawModel(key);
      if (!gltf || !gltf.scene) {
        // Fallback: direct clone if raw model missing
        instances.forEach((inst) => {
          const m = this.assetManager.getModel(key);
          if (m) {
            m.position.copy(inst.pos);
            m.rotation.copy(inst.rot);
            m.scale.copy(inst.scale);
            this.group.add(m);
          }
        });
        return;
      }

      // Collect meshes
      const subMeshes = [];
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.geometry && child.material) {
          subMeshes.push(child);
        }
      });

      if (subMeshes.length === 0) return;

      const count = instances.length;

      subMeshes.forEach((mesh) => {
        const mat = Array.isArray(mesh.material)
          ? mesh.material.map(m => m.clone())
          : mesh.material.clone();

        const mats = Array.isArray(mat) ? mat : [mat];
        mats.forEach((m) => {
          if (tintWarmFoliage && m.name && (m.name.toLowerCase().includes('leaves') || m.name.toLowerCase().includes('foliage') || m.name.toLowerCase().includes('bush'))) {
            // Tint leaves to rich golden acacia / savannah amber
            m.side = THREE.DoubleSide;
            if (m.color) {
              m.color.setHex(0xd49b39); // Golden acacia yellow-ochre
            }
            m.roughness = 0.60;
          }
        });

        let geo = mesh.geometry;
        if (key === 'cactus_forge3d') {
          // Model pivot is at its centre: put the base on the ground (cloned once, shared by all instances)
          geo = geo.clone();
          geo.computeBoundingBox();
          const bb = geo.boundingBox;
          geo.translate(-(bb.min.x + bb.max.x) * 0.5, -bb.min.y + CACTUS_SINK, -(bb.min.z + bb.max.z) * 0.5);
          geo.computeBoundingSphere();
        }
        const instMesh = new THREE.InstancedMesh(geo, mat, count);
        instMesh.name = `SavannaInst_${tag}_${key}_${mesh.name || 'sub'}`;
        instMesh.castShadow = true;
        instMesh.receiveShadow = false;

        for (let i = 0; i < count; i++) {
          const inst = instances[i];
          quaternion.setFromEuler(inst.rot);
          matrix.compose(inst.pos, quaternion, inst.scale);
          instMesh.setMatrixAt(i, matrix);
        }

        instMesh.instanceMatrix.needsUpdate = true;
        instMesh.computeBoundingSphere();
        instMesh.computeBoundingBox();

        this.group.add(instMesh);
        this.instancedMeshes.push(instMesh);
      });
    });
  }

  update(delta, playerPos) {
    // Props are static instanced meshes; frustum culling handles optimization
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
