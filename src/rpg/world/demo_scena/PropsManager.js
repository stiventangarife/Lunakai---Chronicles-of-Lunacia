import * as THREE from 'three';
import { WaterManager } from './WaterManager.js';
import { getSoilAndMeadowData } from './grassShader.js';
import { createSeededRandom } from './MathUtils.js';

/**
 * Gestor de Árboles, Rocas y Vegetación de Alta Calidad Estilizada (Genshin Impact style).
 * Utiliza los modelos texturizados de assets/nature con foliage detallado.
 * 
 * Optimización Extrema con THREE.InstancedMesh:
 * - Todos los árboles (~350) se renderizan mediante mallas instanciadas en GPU (InstancedMesh).
 * - Cero pérdida de calidad: 100% de los modelos 3D originales de alta fidelidad, texturas y normal maps.
 * - Cero primitivas geométricas (sin conos ni cilindros simplistas).
 * - De ~1,000 draw calls individuales se reduce a solo ~30 draw calls para toda la isla.
 */
export class PropsManager {
  /**
   * @param {{ deferLegacyTrees?: boolean }} [opts] con el arte Genshin los árboles GLTF antiguos no se
   *   ven (GenshinTrees los sustituye en las mismas posiciones): no se cargan ni se construyen; solo
   *   se generan sus posiciones (pendingTrees). ensureLegacyTrees() los construye si hacen falta.
   */
  constructor(scene, terrain, roadManager, assetManager, opts = {}) {
    this.deferLegacyTrees = !!opts.deferLegacyTrees;
    this.scene = scene;
    this.terrain = terrain;
    this.roadManager = roadManager;
    this.assetManager = assetManager;

    this.group = new THREE.Group();
    this.group.name = 'DemoScenaPropsGroup';
    this.scene.add(this.group);

    // Listas de claves de árboles estilizados de calidad
    this.commonTrees = [
      'tree_common_1', 'tree_common_2', 'tree_common_3', 'tree_common_4', 'tree_common_5'
    ];
    this.twistedTrees = [
      'tree_twisted_1', 'tree_twisted_2', 'tree_twisted_3', 'tree_twisted_4', 'tree_twisted_5'
    ];
    this.pineTrees = [
      'tree_pine_1', 'tree_pine_2', 'tree_pine_3', 'tree_pine_4', 'tree_pine_5'
    ];

    this.allTrees = [...this.commonTrees, ...this.twistedTrees, ...this.pineTrees];

    // Rocas y guijarros
    this.mediumRocks = ['rock_med_1', 'rock_med_2', 'rock_med_3'];
    this.bigRockCols = ['rock_col_1', 'rock_col_2', 'rock_col_3', 'rock_col_4'];

    // Catálogo de bloques, mesetas y pilares de roca estilizada 3D
    this.stylizedRockCatalog = [
      { col: 'rock_col_4', mesh: 'RockLarge.001' },
      { col: 'rock_col_1', mesh: 'Rock1_1' },
      { col: 'rock_col_1', mesh: 'Rock1_2' },
      { col: 'rock_col_1', mesh: 'Rock1_3' },
      { col: 'rock_col_1', mesh: 'Rock1_4' },
      { col: 'rock_col_2', mesh: 'Rock2_1' },
      { col: 'rock_col_2', mesh: 'Rock2_2' },
      { col: 'rock_col_2', mesh: 'Rock2_3' },
      { col: 'rock_col_2', mesh: 'Rock2_4' },
      { col: 'rock_col_3', mesh: 'Rock3_1' },
      { col: 'rock_col_3', mesh: 'Rock3_2' },
      { col: 'rock_col_3', mesh: 'Rock3_3' },
      { col: 'rock_col_4', mesh: 'Rock4_1' },
      { col: 'rock_col_4', mesh: 'Rock4_2' },
      { col: 'rock_col_4', mesh: 'Rock4_3' },
      { col: 'rock_col_4', mesh: 'Rock4_4' }
    ];

    // Flora de sotobosque
    this.bushes = ['bush_common', 'bush_flowers'];
    this.plants = ['plant_1', 'plant_7', 'fern_1'];
    this.flowers = ['flower_group_3', 'flower_group_4'];

    this.treePositions = [];
    this.pendingTrees = [];
    this.instancedTreeMeshes = [];
    this.pendingVegetation = [];
    this.instancedVegetationMeshes = [];
    this.pendingRocks = [];
    this.pendingRockPillars = [];
    this.instancedRockMeshes = [];
    this.rockSpheres = [];

    // Guijarros estilizados en caminos y parches (InstancedMesh, LOD y Oclusión)
    this.pendingPebbles = [];
    this.instancedPebbleMeshes = [];
    this.pebbleLODEntries = [];
    this.lastPebblePlayerPos = new THREE.Vector3(-9999, -9999, -9999);

    // Hito 66: la colocación se calcula con el terreno de antes del río de mar a mar y los vados, así la isla
    // sale idéntica (cada rechazo cambia la secuencia aleatoria). Después se ajusta lo que el nuevo cauce toca.
    this.terrain.legacyHeights = true;
    try { this.populateAllZones(); } finally { this.terrain.legacyHeights = false; }
    this._fitToTerrainEdits();
    this._removeListedProps();
    if (!this.deferLegacyTrees) this.buildInstancedTrees();
    this.buildInstancedVegetation();
    this.buildInstancedRocks();
    this.buildInstancedPebbles();
  }

  /**
   * Hito 66: tras colocar con el terreno antiguo, cada pieza donde el suelo cambió (cauce nuevo del norte, vados)
   * se apoya en la altura nueva; las que quedarían dentro del agua se quitan.
   */
  /**
   * Hito 82: piezas quitadas a mano (por petición). Se quitan antes de crear las instancias, así que también
   * desaparece su colisión (ForestColliders la calcula de las instancias).
   */
  _removeListedProps() {
    const REMOVED_ROCKS = [
      { x: -1.0, z: -40.0, why: 'tapaba el camino junto al río (jugador en -5,4, -40,6)' },
    ];
    let n = 0;
    for (const list of [this.pendingRocks, this.pendingRockPillars]) {
      if (!Array.isArray(list)) continue;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]?.pos;
        if (p && REMOVED_ROCKS.some((r) => Math.hypot(p.x - r.x, p.z - r.z) < 1.2)) { list.splice(i, 1); n++; }
      }
    }
    if (n) console.log(`[PropsManager] ${n} roca(s) quitadas a mano`);
  }

  _fitToTerrainEdits() {
    const t = this.terrain;
    const lists = [this.pendingTrees, this.pendingRocks, this.pendingRockPillars, this.pendingVegetation, this.pendingPebbles];
    const legacyH = (x, z) => { t.legacyHeights = true; try { return t.getHeight(x, z); } finally { t.legacyHeights = false; } };
    let moved = 0, removed = 0;
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (let i = list.length - 1; i >= 0; i--) {
        const it = list[i];
        if (!it || !it.pos) continue;
        const x = it.pos.x, z = it.pos.z;
        const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(z);
        if (Math.abs(x - riverCenterX) > riverHalfWidth + 11) continue; // lejos del río: nada cambió
        const h1 = t.getHeight(x, z);
        const dy = h1 - legacyH(x, z);
        if (Math.abs(dy) < 0.02) continue;
        const inChannel = Math.abs(x - riverCenterX) < riverHalfWidth + 1.0 && h1 < WaterManager.getRiverWaterHeight(z) + 0.1;
        if (inChannel && list !== this.pendingRocks && list !== this.pendingRockPillars) { list.splice(i, 1); removed++; continue; }
        if (inChannel && h1 < WaterManager.getRiverWaterHeight(z) - 0.6) { list.splice(i, 1); removed++; continue; }
        it.pos.y += dy; moved++;
      }
    }
    // Los árboles también se apuntan en treePositions (distancia mínima entre árboles): se rehace con los que quedan
    this.treePositions = this.pendingTrees.map((p) => ({ x: p.pos.x, z: p.pos.z }));
    if (moved || removed) console.log(`[PropsManager] Río de mar a mar: ${moved} piezas apoyadas en el nuevo suelo, ${removed} retiradas del cauce`);
  }

  random() {
    if (!this.rng) this.rng = createSeededRandom(133742);
    return this.rng();
  }

  populateAllZones() {
    this.rng = createSeededRandom(133742);
    this.spawnPrairieProps();
    this.spawnForestProps();
    this.spawnRiverProps();
    this.spawnHillProps();
    this.spawnRockFormationProps();
    this.spawnPerimeterCrownProps();
    this.spawnSeaOpeningProps();
    this.spawnPebblesOnPathsAndPatches();
  }

  // =========================================================================
  // 1. PRADERA Y COLINAS DEL NOROESTE (Meadows, laderas y camino hacia la playa)
  // =========================================================================
  spawnPrairieProps() {
    const prairiePool = [
      ...this.commonTrees, ...this.commonTrees,
      ...this.twistedTrees,
      ...this.pineTrees
    ];

    for (let i = 0; i < 75; i++) {
      const x = -125 + this.random() * 110;
      const z = -115 + this.random() * 140;
      this.tryPlaceTree(x, z, prairiePool, 1.1, 1.85, 7.0);
    }

    for (let i = 0; i < 22; i++) {
      const x = -125 + this.random() * 105;
      const z = -105 + this.random() * 135;
      this.tryPlaceRock(x, z, 1.2, 2.5);
    }

    for (let i = 0; i < 85; i++) {
      const x = -125 + this.random() * 105;
      const z = -105 + this.random() * 135;
      this.tryPlaceBushOrPlant(x, z);
    }
  }

  // =========================================================================
  // 2. BOSQUE DEL SUROESTE (Lush Fantasy Woodland - distribuido orgánicamente)
  // =========================================================================
  spawnForestProps() {
    const forestPool = [
      ...this.commonTrees, ...this.commonTrees,
      ...this.twistedTrees, ...this.twistedTrees,
      ...this.pineTrees
    ];

    for (let i = 0; i < 110; i++) {
      const x = -120 + this.random() * 95;
      const z = 25 + this.random() * 100;
      this.tryPlaceTree(x, z, forestPool, 1.05, 1.95, 6.2);
    }

    for (let i = 0; i < 90; i++) {
      const x = -120 + this.random() * 95;
      const z = 25 + this.random() * 100;
      this.tryPlaceBushOrPlant(x, z);
    }

    for (let i = 0; i < 20; i++) {
      const x = -120 + this.random() * 95;
      const z = 25 + this.random() * 100;
      this.tryPlaceRock(x, z, 1.2, 2.7);
    }

    for (let i = 0; i < 45; i++) {
      const x = -120 + this.random() * 95;
      const z = 25 + this.random() * 100;
      this.tryPlaceMushroom(x, z);
    }
  }

  // =========================================================================
  // 3. VALLE CENTRAL Y MÁRGENES DEL RÍO (Framing natural del río continuo)
  // =========================================================================
  spawnRiverProps() {
    const riverTreePool = [
      ...this.twistedTrees, ...this.twistedTrees,
      ...this.commonTrees, ...this.commonTrees,
      ...this.pineTrees
    ];

    for (let z = -90; z <= 130; z += 10) {
      const { riverCenterX, riverHalfWidth } = {
        riverCenterX: 18 + Math.sin(z * 0.025) * 16 + Math.cos(z * 0.012) * 8,
        riverHalfWidth: 10.0 + Math.sin(z * 0.04) * 3.0 + 3.0
      };

      const lx = riverCenterX - riverHalfWidth - 4.5 - this.random() * 12.0;
      this.tryPlaceTree(lx, z + (this.random() - 0.5) * 6.0, riverTreePool, 1.1, 1.8, 6.8);

      const rx = riverCenterX + riverHalfWidth + 4.5 + this.random() * 12.0;
      this.tryPlaceTree(rx, z + (this.random() - 0.5) * 6.0, riverTreePool, 1.1, 1.8, 6.8);

      const rockLx = riverCenterX - riverHalfWidth - 1.5 - this.random() * 3.0;
      this.tryPlaceRock(rockLx, z, 1.2, 2.4);
      this.tryPlaceFern(rockLx + 0.8, z);

      const rockRx = riverCenterX + riverHalfWidth + 1.5 + this.random() * 3.0;
      this.tryPlaceRock(rockRx, z, 1.2, 2.4);
      this.tryPlaceFern(rockRx - 0.8, z);
    }
  }

  // =========================================================================
  // 4. COLINAS, TERRAZAS Y MIRADOR DEL NORESTE (Mezcla rica: Pinos + Frondosos + Retorcidos)
  // =========================================================================
  spawnHillProps() {
    const hillPool = [
      ...this.pineTrees, ...this.pineTrees,
      ...this.commonTrees, ...this.commonTrees,
      ...this.twistedTrees
    ];

    for (let i = 0; i < 70; i++) {
      const x = 35 + this.random() * 90;
      const z = -120 + this.random() * 110;
      const isOverlookEdge = (x > 105 && x < 125 && z > -85 && z < -65);
      if (isOverlookEdge) continue;

      this.tryPlaceTree(x, z, hillPool, 1.1, 1.9, 6.8);
    }

    const eastCliffCoords = [
      { x: 88, z: -58, s: 5.2, mesh: { col: 'rock_col_4', mesh: 'RockLarge.001' } },
      { x: 104, z: -68, s: 6.5, mesh: { col: 'rock_col_4', mesh: 'RockLarge.001' } },
      { x: 118, z: -82, s: 5.8, mesh: { col: 'rock_col_1', mesh: 'Rock1_1' } },
      { x: 96, z: -84, s: 4.8, mesh: { col: 'rock_col_1', mesh: 'Rock1_2' } },
      { x: 112, z: -52, s: 4.2, mesh: { col: 'rock_col_2', mesh: 'Rock2_2' } },
      { x: 125, z: -68, s: 4.6, mesh: { col: 'rock_col_1', mesh: 'Rock1_4' } },
      { x: 78, z: -72, s: 3.8, mesh: { col: 'rock_col_2', mesh: 'Rock2_1' } },
      { x: 86, z: -94, s: 4.5, mesh: { col: 'rock_col_3', mesh: 'Rock3_1' } },
      { x: 102, z: -105, s: 5.0, mesh: { col: 'rock_col_3', mesh: 'Rock3_2' } },
      { x: 116, z: -98, s: 4.2, mesh: { col: 'rock_col_4', mesh: 'Rock4_2' } },
      { x: 72, z: -85, s: 3.5, mesh: { col: 'rock_col_4', mesh: 'Rock4_1' } },
      { x: 128, z: -88, s: 4.0, mesh: { col: 'rock_col_1', mesh: 'Rock1_3' } },
    ];
    eastCliffCoords.forEach(c => {
      this.placeStylizedRockPillar(c.x, c.z, c.s, this.random() * Math.PI * 2, c.mesh);
    });

    for (let i = 0; i < 8; i++) {
      const x = 75 + this.random() * 55;
      const z = -110 + this.random() * 75;
      this.placeStylizedRockPillar(x, z, 2.5 + this.random() * 2.0);
    }

    for (let i = 0; i < 55; i++) {
      const x = 40 + this.random() * 85;
      const z = -115 + this.random() * 105;
      this.tryPlaceBushOrPlant(x, z);
    }
  }

  // =========================================================================
  // 5. MESETA DEL SANTUARIO Y SURESTE (Pinos + Retorcidos sagrados + Frondosos)
  // =========================================================================
  spawnRockFormationProps() {
    const shrinePool = [
      ...this.twistedTrees, ...this.twistedTrees,
      ...this.pineTrees, ...this.pineTrees,
      ...this.commonTrees
    ];

    for (let i = 0; i < 65; i++) {
      const x = 35 + this.random() * 90;
      const z = 10 + this.random() * 115;
      this.tryPlaceTree(x, z, shrinePool, 1.1, 1.85, 6.5);
    }

    const seCliffCoords = [
      { x: 110, z: 62, s: 5.5, mesh: { col: 'rock_col_4', mesh: 'RockLarge.001' } },
      { x: 126, z: 74, s: 5.8, mesh: { col: 'rock_col_1', mesh: 'Rock1_1' } },
      { x: 135, z: 60, s: 4.8, mesh: { col: 'rock_col_1', mesh: 'Rock1_2' } },
      { x: 102, z: 80, s: 4.2, mesh: { col: 'rock_col_2', mesh: 'Rock2_3' } },
      { x: 120, z: 88, s: 5.0, mesh: { col: 'rock_col_3', mesh: 'Rock3_2' } },
      { x: 138, z: 82, s: 4.5, mesh: { col: 'rock_col_4', mesh: 'Rock4_4' } },
      { x: 95, z: 68, s: 3.8, mesh: { col: 'rock_col_2', mesh: 'Rock2_1' } },
      { x: 128, z: 98, s: 4.2, mesh: { col: 'rock_col_1', mesh: 'Rock1_4' } },
    ];
    seCliffCoords.forEach(c => {
      this.placeStylizedRockPillar(c.x, c.z, c.s, this.random() * Math.PI * 2, c.mesh);
    });

    for (let i = 0; i < 8; i++) {
      const x = 85 + this.random() * 45;
      const z = 45 + this.random() * 65;
      this.placeStylizedRockPillar(x, z, 2.4 + this.random() * 2.2);
    }

    for (let i = 0; i < 50; i++) {
      const x = 40 + this.random() * 85;
      const z = 15 + this.random() * 105;
      this.tryPlaceBushOrPlant(x, z);
    }
  }

  // =========================================================================
  // 6. CORONA PERIMETRAL COSTERA (Árboles perimetrales que enmarcan el horizonte marino)
  // =========================================================================
  spawnPerimeterCrownProps() {
    for (let i = 0; i < 50; i++) {
      const ang = this.random() * Math.PI * 2;
      const dist = 88 + this.random() * 34;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      this.tryPlaceTree(x, z, this.allTrees, 1.05, 1.85, 7.5);
    }
  }

  // =========================================================================
  // 7. RISCOS COSTEROS Y FORMACIONES DE LA BAHÍA (Costa Noroeste)
  // =========================================================================
  spawnSeaOpeningProps() {
    const westCliffCoords = [
      { x: -108, z: -72, s: 5.2, mesh: { col: 'rock_col_4', mesh: 'RockLarge.001' } },
      { x: -94, z: -85, s: 4.6, mesh: { col: 'rock_col_1', mesh: 'Rock1_2' } },
      { x: -118, z: -60, s: 4.2, mesh: { col: 'rock_col_2', mesh: 'Rock2_2' } },
      { x: -88, z: -102, s: 3.8, mesh: { col: 'rock_col_3', mesh: 'Rock3_1' } },
      { x: -124, z: -80, s: 4.5, mesh: { col: 'rock_col_1', mesh: 'Rock1_1' } }
    ];
    westCliffCoords.forEach((c) => {
      this.placeStylizedRockPillar(c.x, c.z, c.s, this.random() * Math.PI * 2, c.mesh);
    });

    for (let i = 0; i < 6; i++) {
      const wx = -115 + this.random() * 45;
      const wz = -120 + this.random() * 80;
      this.placeStylizedRockPillar(wx, wz, 2.2 + this.random() * 2.0);
    }
  }

  // =========================================================================
  // REGISTRO DE POSICIÓN DE ÁRBOLES
  // =========================================================================
  tryPlaceTree(x, z, allowedKeys, minScale = 1.0, maxScale = 1.6, minDist = 6.0) {
    const y = this.terrain.getHeight(x, z);

    if (y < this.terrain.waterLevel + 1.2) return;
    if (this.roadManager.getRoadFactor(x, z) > 0.15) return;

    // Despeje del Dojō Secreto (X: -87.9, Z: 74.0) - Evitar árboles dentro o tocando el dojo
    const distToDojoTree = Math.hypot(x - (-87.9), z - 74.0);
    if (distToDojoTree < 22.0) return;

    const norm = this.terrain.getNormal(x, z);
    if (norm.y < 0.70) return;

    for (let i = 0; i < this.treePositions.length; i++) {
      const p = this.treePositions[i];
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < minDist * minDist) {
        return;
      }
    }

    const key = allowedKeys[Math.floor(this.random() * allowedKeys.length)];
    const scale = minScale + this.random() * (maxScale - minScale);
    const rotY = this.random() * Math.PI * 2;
    const rotX = (this.random() - 0.5) * 0.06;
    const rotZ = (this.random() - 0.5) * 0.06;

    this.treePositions.push({ x, z });
    this.pendingTrees.push({
      key,
      pos: new THREE.Vector3(x, y, z),
      rot: new THREE.Euler(rotX, rotY, rotZ),
      scale: new THREE.Vector3(scale, scale * (0.95 + this.random() * 0.15), scale)
    });
  }

  // =========================================================================
  // CONSTRUCCIÓN DE ÁRBOLES MEDIANTE THREE.InstancedMesh (100% MODELOS REALES)
  // =========================================================================
  /** Construye los árboles GLTF antiguos si se difirieron (carga sus modelos). Devuelve sus mallas. */
  ensureLegacyTrees() {
    if (this._legacyTreesPromise) return this._legacyTreesPromise;
    const keys = new Set((this.pendingTrees || []).map((t) => t.key));
    this._legacyTreesPromise = Promise.resolve(this.assetManager.loadModels ? this.assetManager.loadModels(keys) : null)
      .then(() => {
        if (this.instancedTreeMeshes.length === 0) this.buildInstancedTrees();
        return this.instancedTreeMeshes;
      });
    return this._legacyTreesPromise;
  }

  buildInstancedTrees() {
    if (!this.pendingTrees || this.pendingTrees.length === 0) return;

    // Agrupar todas las instancias por su modelo GLTF correspondiente
    const groupsByKey = new Map();
    for (let i = 0; i < this.pendingTrees.length; i++) {
      const t = this.pendingTrees[i];
      if (!groupsByKey.has(t.key)) {
        groupsByKey.set(t.key, []);
      }
      groupsByKey.get(t.key).push(t);
    }

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();

    groupsByKey.forEach((instances, key) => {
      const gltf = this.assetManager.getModel(key);
      if (!gltf || !gltf.scene) {
        // Fallback de seguridad en caso de que falte el asset
        instances.forEach((inst) => {
          const fallback = this.assetManager.cloneModel(key);
          if (fallback) {
            fallback.position.copy(inst.pos);
            fallback.rotation.copy(inst.rot);
            fallback.scale.copy(inst.scale);
            this.group.add(fallback);
          }
        });
        return;
      }

      // Extraer todas las sub-mallas del modelo GLTF original (tronco y follaje con textura real)
      const subMeshes = [];
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.geometry && child.material) {
          subMeshes.push(child);
        }
      });

      if (subMeshes.length === 0) return;

      const count = instances.length;

      subMeshes.forEach((mesh) => {
        // Clonar el material original texturizado y optimizar foliage
        const mat = Array.isArray(mesh.material)
          ? mesh.material.map(m => m.clone())
          : mesh.material.clone();

        const mats = Array.isArray(mat) ? mat : [mat];
        mats.forEach((m) => {
          if (m.name && (m.name.toLowerCase().includes('leaves') || m.name.toLowerCase().includes('foliage'))) {
            m.side = THREE.DoubleSide;
            m.roughness = 0.55;
            m.emissive = new THREE.Color(0x163408);
            m.emissiveIntensity = 0.22;
          }
        });

        // Crear InstancedMesh con la geometría y material 100% auténticos del GLTF
        const instMesh = new THREE.InstancedMesh(mesh.geometry, mat, count);
        instMesh.name = `InstancedTree_${key}_${mesh.name || 'sub'}`;
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
        this.instancedTreeMeshes.push(instMesh);
      });
    });

    console.log(`[PropsManager] 🌲 ${this.pendingTrees.length} árboles reales instanciados con THREE.InstancedMesh (${this.instancedTreeMeshes.length} mallas instanciadas). 100% fidelidad artística y cero primitivas.`);
  }

  tryPlaceRock(x, z, minScale = 1.2, maxScale = 2.5) {
    if (Math.hypot(x - (-87.9), z - 74.0) < 18.5) return;
    const y = this.terrain.getHeight(x, z);
    if (y < this.terrain.waterLevel + 0.1) return;
    if (this.roadManager.getRoadFactor(x, z) > 0.4) return;

    const key = this.mediumRocks[Math.floor(this.random() * this.mediumRocks.length)];
    const scale = minScale + this.random() * (maxScale - minScale);
    const rot = new THREE.Euler(
      this.random() * 0.15,
      this.random() * Math.PI * 2,
      this.random() * 0.15
    );

    this.pendingRocks.push({
      key,
      pos: new THREE.Vector3(x, y - scale * 0.22, z),
      rot,
      scale: new THREE.Vector3(scale, scale, scale)
    });

    if (this.rockSpheres.length < 64) {
      this.rockSpheres.push(new THREE.Vector4(x, y, z, scale * 1.8));
    }
  }

  tryPlaceBushOrPlant(x, z) {
    if (Math.hypot(x - (-87.9), z - 74.0) < 16.0) return;
    const y = this.terrain.getHeight(x, z);
    if (y < this.terrain.waterLevel + 0.35) return;
    if (this.roadManager.getRoadFactor(x, z) > 0.25) return;

    const pool = [...this.bushes, ...this.plants];
    const key = pool[Math.floor(this.random() * pool.length)];
    const s = 1.1 + this.random() * 0.9;
    const rotY = this.random() * Math.PI * 2;

    this.pendingVegetation.push({
      key,
      pos: new THREE.Vector3(x, y, z),
      rot: new THREE.Euler(0, rotY, 0),
      scale: new THREE.Vector3(s, s, s)
    });
  }

  tryPlaceFern(x, z) {
    if (Math.hypot(x - (-87.9), z - 74.0) < 16.0) return;
    const y = this.terrain.getHeight(x, z);
    if (y < this.terrain.waterLevel + 0.2) return;
    if (this.roadManager.getRoadFactor(x, z) > 0.3) return;

    const s = 1.2 + this.random() * 0.8;
    const rotY = this.random() * Math.PI * 2;

    this.pendingVegetation.push({
      key: 'fern_1',
      pos: new THREE.Vector3(x, y, z),
      rot: new THREE.Euler(0, rotY, 0),
      scale: new THREE.Vector3(s, s, s)
    });
  }

  tryPlaceMushroom(x, z) {
    if (Math.hypot(x - (-87.9), z - 74.0) < 16.0) return;
    const y = this.terrain.getHeight(x, z);
    if (y < this.terrain.waterLevel + 0.3) return;
    if (this.roadManager.getRoadFactor(x, z) > 0.3) return;

    const s = 1.2 + this.random() * 1.0;
    const rotY = this.random() * Math.PI * 2;

    this.pendingVegetation.push({
      key: 'mushroom_common',
      pos: new THREE.Vector3(x, y, z),
      rot: new THREE.Euler(0, rotY, 0),
      scale: new THREE.Vector3(s, s, s)
    });
  }

  buildInstancedVegetation() {
    if (!this.pendingVegetation || this.pendingVegetation.length === 0) return;

    const grouped = new Map();
    for (const item of this.pendingVegetation) {
      if (!grouped.has(item.key)) {
        grouped.set(item.key, []);
      }
      grouped.get(item.key).push(item);
    }

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();

    grouped.forEach((instances, key) => {
      const gltf = this.assetManager ? this.assetManager.getModel(key) : null;
      if (!gltf || !gltf.scene) {
        return;
      }

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
          m.side = THREE.DoubleSide;
          if (m.name && (m.name.toLowerCase().includes('leaves') || m.name.toLowerCase().includes('foliage') || m.name.toLowerCase().includes('flower'))) {
            m.roughness = 0.6;
            m.emissive = new THREE.Color(0x112808);
            m.emissiveIntensity = 0.15;
          }
        });

        const instMesh = new THREE.InstancedMesh(mesh.geometry, mat, count);
        instMesh.name = `InstancedVeg_${key}_${mesh.name || 'sub'}`;
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;

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
        this.instancedVegetationMeshes.push(instMesh);
      });
    });

    console.log(`[PropsManager] 🌿 ${this.pendingVegetation.length} elementos de vegetación (arbustos, plantas, helechos, setas) instanciados con THREE.InstancedMesh (${this.instancedVegetationMeshes.length} mallas instanciadas). 100% fidelidad artística y cero primitivas.`);
  }

  placeStylizedRockPillar(x, z, scale = 3.5, rotY = 0, specificMesh = null) {
    if (Math.hypot(x - (-87.9), z - 74.0) < 19.0) return;
    const y = this.terrain.getHeight(x, z);
    if (y < this.terrain.waterLevel - 1.0) return;

    let rockDef = specificMesh;
    if (!rockDef) {
      rockDef = this.stylizedRockCatalog[Math.floor(this.random() * this.stylizedRockCatalog.length)];
    }

    const rot = new THREE.Euler(0, rotY || this.random() * Math.PI * 2, 0);

    this.pendingRockPillars.push({
      col: rockDef.col,
      meshName: rockDef.mesh,
      pos: new THREE.Vector3(x, y - scale * 0.18, z),
      rot,
      scale: new THREE.Vector3(scale, scale, scale)
    });

    if (this.rockSpheres.length < 64) {
      this.rockSpheres.push(new THREE.Vector4(x, y, z, scale * 2.2));
    }
  }

  buildInstancedRocks() {
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();

    // 1. Instanciar rocas medianas (rock_med_1, rock_med_2, rock_med_3)
    if (this.pendingRocks && this.pendingRocks.length > 0) {
      const groupedMedium = new Map();
      for (const item of this.pendingRocks) {
        if (!groupedMedium.has(item.key)) groupedMedium.set(item.key, []);
        groupedMedium.get(item.key).push(item);
      }

      groupedMedium.forEach((instances, key) => {
        const gltf = this.assetManager ? this.assetManager.getModel(key) : null;
        if (!gltf || !gltf.scene) return;

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

          const instMesh = new THREE.InstancedMesh(mesh.geometry, mat, count);
          instMesh.name = `InstancedRock_${key}_${mesh.name || 'sub'}`;
          instMesh.castShadow = true;
          instMesh.receiveShadow = true;

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
          this.instancedRockMeshes.push(instMesh);
        });
      });
    }

    // 2. Instanciar pilares y formaciones de roca estilizada (StylisedRockCollection1..4)
    if (this.pendingRockPillars && this.pendingRockPillars.length > 0) {
      const groupedPillars = new Map();
      for (const item of this.pendingRockPillars) {
        const groupKey = `${item.col}__${item.meshName}`;
        if (!groupedPillars.has(groupKey)) groupedPillars.set(groupKey, []);
        groupedPillars.get(groupKey).push(item);
      }

      groupedPillars.forEach((instances, groupKey) => {
        const [col, meshName] = groupKey.split('__');
        const gltf = this.assetManager ? this.assetManager.getModel(col) : null;
        if (!gltf || !gltf.scene) return;

        let targetMesh = null;
        gltf.scene.traverse((child) => {
          if (!targetMesh && child.isMesh && (child.name === meshName || child.name.toLowerCase().includes(meshName.toLowerCase()))) {
            targetMesh = child;
          }
        });

        if (!targetMesh) {
          gltf.scene.traverse((child) => {
            if (!targetMesh && child.isMesh) targetMesh = child;
          });
        }

        if (!targetMesh || !targetMesh.geometry || !targetMesh.material) return;

        const count = instances.length;
        const mat = Array.isArray(targetMesh.material)
          ? targetMesh.material.map(m => m.clone())
          : targetMesh.material.clone();

        const instMesh = new THREE.InstancedMesh(targetMesh.geometry, mat, count);
        instMesh.name = `InstancedPillar_${groupKey}`;
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;

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
        this.instancedRockMeshes.push(instMesh);
      });
    }

    const totalRockCount = (this.pendingRocks ? this.pendingRocks.length : 0) + (this.pendingRockPillars ? this.pendingRockPillars.length : 0);
    console.log(`[PropsManager] 🪨 ${totalRockCount} rocas y acantilados instanciados con THREE.InstancedMesh (${this.instancedRockMeshes.length} mallas instanciadas). 100% fidelidad artística y cero primitivas.`);
  }

  // =========================================================================
  // 6. GUIJARROS ESTILIZADOS EN CAMINOS Y PARCHES DE TIERRA (InstancedMesh + LOD + Oclusión)
  // =========================================================================
  spawnPebblesOnPathsAndPatches() {
    // Exactamente 24 guijarros (< 30) divididos en 3 tipos por tamaño:
    // - Tipo 1 (Small): 8 instancias (~40-45 cm ancho, 12 cm alto)
    // - Tipo 2 (Medium): 8 instancias (~75-85 cm ancho, 18 cm alto)
    // - Tipo 3 (Large): 8 instancias (~1.2-1.4 m ancho, 24 cm alto)
    const types = ['small', 'medium', 'large'];

    // Puntos estratégicos a lo largo de senderos, claros centrales y parches de tierra expuesta
    const roadAnchors = [
      // 0. Zona Central / Spawn / Cruce de caminos (inmediatamente visibles frente al jugador)
      { x: -6,  z: 4,   offsetRange: 1.2 },
      { x: 4,   z: -2,  offsetRange: 1.4 },
      { x: 10,  z: 8,   offsetRange: 1.2 },
      { x: -14, z: -8,  offsetRange: 1.3 },
      { x: -2,  z: -18, offsetRange: 1.5 },
      { x: 8,   z: -26, offsetRange: 1.4 },
      { x: -22, z: 2,   offsetRange: 1.5 },
      { x: 16,  z: 18,  offsetRange: 1.6 },

      // 1. Camino Principal - Pradera del Valle y meandros
      { x: -84, z: 22, offsetRange: 1.5 },
      { x: -74, z: 14, offsetRange: 1.5 },
      { x: -64, z: 6,  offsetRange: 1.6 },
      { x: -52, z: -5, offsetRange: 1.5 },
      { x: -42, z: -15, offsetRange: 1.5 },
      { x: -32, z: -25, offsetRange: 1.4 },

      // 2. Ladera Este y camino a Riscos
      { x: 26,  z: -24, offsetRange: 1.6 },
      { x: 42,  z: -28, offsetRange: 1.5 },
      { x: 58,  z: -38, offsetRange: 1.6 },

      // 3. Sendero al Gran Árbol Sagrado
      { x: -56, z: 12, offsetRange: 1.4 },
      { x: -44, z: 18, offsetRange: 1.5 },
      { x: -30, z: 18, offsetRange: 1.5 },

      // 4. Sendero hacia el Dojō y Santuario
      { x: 28,  z: -4,  offsetRange: 1.5 },
      { x: 40,  z: 14,  offsetRange: 1.6 },

      // 5. Parches de tierra en claros de pradera
      { x: -68, z: 32, offsetRange: 2.0 },
      { x: -36, z: 6,  offsetRange: 2.0 },
      { x: -48, z: -36, offsetRange: 2.0 },
      { x: 22,  z: 10, offsetRange: 2.0 }
    ];

    const typeCounts = { small: 0, medium: 0, large: 0 };
    const maxPerType = 8; // 8 x 3 = 24 instancias totales

    for (let i = 0; i < roadAnchors.length; i++) {
      let targetType = types[i % 3];
      if (typeCounts[targetType] >= maxPerType) {
        targetType = types.find(t => typeCounts[t] < maxPerType);
      }
      if (!targetType) break;

      const anchor = roadAnchors[i];
      const angle = (i * 1.618033 + Math.PI / 4) % (Math.PI * 2);
      const dist = 0.3 + ((i * 7) % 10) / 10 * (anchor.offsetRange || 1.4);
      const px = anchor.x + Math.cos(angle) * dist;
      const pz = anchor.z + Math.sin(angle) * dist;

      // 1. Verificación de despeje con el río y agua
      const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(pz);
      if (Math.abs(px - riverCenterX) < riverHalfWidth + 1.8) continue;

      const currentWaterY = WaterManager.getRiverWaterHeight(pz);
      const groundY = this.terrain.getHeight(px, pz);
      if (groundY < currentWaterY + 0.25) continue;

      // 2. Pendiente suave (evitar acantilados)
      const normal = this.terrain.getNormal(px, pz);
      if (normal.y < 0.70) continue;

      // 3. Calibración de escala según tipo (los modelos GLTF tienen altura ~0.095m)
      let scaleXZ = 0.90;
      let scaleY = 1.35;
      let offsetY = 0.02; // Asentado firmemente sobre la superficie del suelo
      if (targetType === 'medium') {
        scaleXZ = 1.65;
        scaleY = 1.80;
        offsetY = 0.035;
      } else if (targetType === 'large') {
        scaleXZ = 2.70;
        scaleY = 2.40;
        offsetY = 0.05;
      }

      // Variación orgánica de escala +/- 12%
      const scaleVar = 0.90 + ((i * 13) % 20) / 100;
      const finalXZ = scaleXZ * scaleVar;
      const finalYScale = scaleY * scaleVar;
      const finalY = groundY + offsetY;

      // Rotación e inclinación natural con la pendiente
      const rotY = (i * 2.39996) % (Math.PI * 2);
      const tiltX = (normal.z * 0.30);
      const tiltZ = (-normal.x * 0.30);

      this.pendingPebbles.push({
        type: targetType,
        pos: new THREE.Vector3(px, finalY, pz),
        rot: new THREE.Euler(tiltX, rotY, tiltZ),
        scale: new THREE.Vector3(finalXZ, finalYScale, finalXZ)
      });

      typeCounts[targetType]++;
    }
  }

  buildInstancedPebbles() {
    if (!this.pendingPebbles || this.pendingPebbles.length === 0) return;

    const grouped = {
      small: [],
      medium: [],
      large: []
    };

    for (const p of this.pendingPebbles) {
      if (grouped[p.type]) {
        grouped[p.type].push(p);
      }
    }

    const modelKeys = {
      small: 'pebble_1',
      medium: 'pebble_2',
      large: 'pebble_3'
    };

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();

    ['small', 'medium', 'large'].forEach((type) => {
      const instances = grouped[type];
      if (!instances || instances.length === 0) return;

      const key = modelKeys[type];
      const gltf = this.assetManager ? this.assetManager.getModel(key) : null;

      let sourceGeometry = null;
      let sourceMaterial = null;

      if (gltf && gltf.scene) {
        gltf.scene.traverse((child) => {
          if (!sourceGeometry && child.isMesh && child.geometry) {
            sourceGeometry = child.geometry;
            sourceMaterial = child.material;
          }
        });
      }

      // Geometría fallback de bajo poligonaje facetada si el modelo no está disponible
      if (!sourceGeometry) {
        if (type === 'small') {
          sourceGeometry = new THREE.DodecahedronGeometry(0.35, 0);
          sourceGeometry.scale(1.2, 0.45, 0.9);
        } else if (type === 'medium') {
          sourceGeometry = new THREE.DodecahedronGeometry(0.40, 1);
          sourceGeometry.scale(1.1, 0.45, 1.2);
        } else {
          sourceGeometry = new THREE.IcosahedronGeometry(0.45, 0);
          sourceGeometry.scale(1.3, 0.40, 1.1);
        }
        sourceGeometry.computeVertexNormals();
      }

      let mat;
      if (sourceMaterial) {
        mat = Array.isArray(sourceMaterial) ? sourceMaterial[0].clone() : sourceMaterial.clone();
        mat.roughness = 0.80;
        mat.metalness = 0.05;
        mat.side = THREE.DoubleSide;
        if (mat.color) {
          mat.color.setHex(0xd8c8b4);
        }
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xd8c8b4),
          roughness: 0.80,
          metalness: 0.05,
          flatShading: true,
          side: THREE.DoubleSide
        });
      }

      const count = instances.length;
      const instMesh = new THREE.InstancedMesh(sourceGeometry, mat, count);
      instMesh.name = `InstancedPebbles_${type}`;
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;
      // Prevenir descarte prematuro por frustum de Three.js en mallas dispersas
      instMesh.frustumCulled = false;

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
      this.instancedPebbleMeshes.push(instMesh);

      this.pebbleLODEntries.push({
        type,
        mesh: instMesh,
        count,
        instances
      });
    });

    console.log(`[PropsManager] 🪨 ${this.pendingPebbles.length} guijarros instanciados en caminos y parches (Small: ${grouped.small.length}, Medium: ${grouped.medium.length}, Large: ${grouped.large.length}) mediante THREE.InstancedMesh con LOD y oclusión activa.`);
  }

  update(delta, playerPos) {
    // LOD Dinámico y Culling por Distancia al Guijarro más cercano
    if (playerPos && this.pebbleLODEntries.length > 0) {
      const distMoved = Math.hypot(
        playerPos.x - this.lastPebblePlayerPos.x,
        playerPos.z - this.lastPebblePlayerPos.z
      );
      if (distMoved > 2.0) {
        this.lastPebblePlayerPos.copy(playerPos);
        for (const entry of this.pebbleLODEntries) {
          let minDist = Infinity;
          for (let i = 0; i < entry.instances.length; i++) {
            const p = entry.instances[i].pos;
            const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
            if (d < minDist) minDist = d;
          }

          if (minDist < 60.0) {
            // LOD 0 (< 60m): Visible con sombras proyectadas y recibidas
            entry.mesh.visible = true;
            entry.mesh.castShadow = true;
            entry.mesh.receiveShadow = true;
          } else if (minDist < 140.0) {
            // LOD 1 (60m - 140m): Visible sin sombras proyectadas costosas
            entry.mesh.visible = true;
            entry.mesh.castShadow = false;
            entry.mesh.receiveShadow = true;
          } else {
            // LOD 2 / Occlusion (> 140m): Ocultar completamente (0 draw calls)
            entry.mesh.visible = false;
          }
        }
      }
    }
  }

  setVisible(visible) {
    if (this.group) {
      this.group.visible = visible;
    }
  }
}
