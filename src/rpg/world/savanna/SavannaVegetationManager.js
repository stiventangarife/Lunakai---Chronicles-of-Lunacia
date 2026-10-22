import * as THREE from 'three';
import { createClumpGeometry } from '../demo_scena/grassGeometry.js';
import { createHandPaintedGrassTexture } from '../demo_scena/grassTexture.js';
import { createGrassV3Material, fbm2D } from '../demo_scena/grassShader.js';
import { createSeededRandom } from '../demo_scena/MathUtils.js';

/**
 * SavannaVegetationManager.js - Golden Savannah Grass V3:
 * - 45,000 instanced blades with BotW hybrid clump geometry.
 * - Golden Savannah / Desert palette (warm straw, sunlit wheat tips, terracotta clay root).
 * - GPU wind wave animation traveling across the high mesa.
 * - Dynamic trample deformation for player and companion Axie.
 * - Spatial grid chunk partitioning (8x8) with native Frustum Culling.
 * - 100% deterministic placement using Mulberry32 RNG (never shifts between reloads).
 */
export class SavannaVegetationManager {
  /**
   * @param {object} [options]
   * @param {boolean} [options.deferGrass=false] no construir las 45.000 matas al crear el gestor (la capa
   *   Genshin las oculta). Se construyen con ensureGrass() si se vuelve al aspecto antiguo.
   */
  constructor(parentGroup, terrain, assetManager, options = {}) {
    this.parentGroup = parentGroup;
    this.terrain = terrain;
    this.assetManager = assetManager;

    this.group = new THREE.Group();
    this.group.name = 'SavannaVegetationGroup';
    if (this.parentGroup) {
      this.parentGroup.add(this.group);
    }

    this.v3GrassChunks = [];
    this.v3GrassMaterial = null;
    this.v3GrassUniforms = null;
    this.v3GrassTexture = null;
    this.v3ClumpGeo = null;
    this.v3GrassCount = 45000;
    this.rng = createSeededRandom(88127);

    if (!options.deferGrass) this.initSavannaGrass();
  }

  /** Construye la hierba si se difirió (vuelta al aspecto antiguo de la Sabana). */
  ensureGrass() {
    if (!this.v3GrassUniforms) {
      this.rng = createSeededRandom(88127); // mismas posiciones que si se hubiera construido al inicio
      this.initSavannaGrass();
    }
    return this.group;
  }

  random() {
    return this.rng();
  }

  initSavannaGrass() {
    // 1. BotW Hybrid Clump Geometry
    this.v3ClumpGeo = createClumpGeometry({
      bladeWidth: 0.16,
      bladeHeight: 1.05,
      baseCardWidth: 0.28,
      baseCardHeight: 0.46,
      bladeTilt: 0.26,
      bladeTaper: 0.85,
      rootRadius: 0.05,
      segments: 4
    });

    // 2. Texture & Material with Savannah Palette
    this.v3GrassTexture = createHandPaintedGrassTexture(null, 1024);

    const { material, uniforms } = createGrassV3Material(null, this.v3GrassTexture, {
      baseColor: '#4a2912',          // Terracotta clay root
      midColor: '#d89f38',           // Golden savannah straw
      tipColor: '#fae075',           // Sunlit wheat tips
      sunGrassColor: '#e6b142',      // Golden amber on hilltops
      wetGrassColor: '#7a8228',      // Olive tone near oasis shore
      dryGrassColor: '#c48f32',      // Toasted dry grass
      soilHumusColor: '#422410',     // Humus clay
      soilClayColor: '#994c25',      // Red canyon clay
      soilDryColor: '#dfbd82',       // Desert sand
      windHighlightColor: '#fff3a8', // Glistening sun highlight on wind waves
      backlightColor: '#ffd76e',     // Warm sunset backlighting
      clearingColor: '#c79234',
      dirtCenterColor: '#e2bf88',
      dirtEdgeColor: '#a66a36',
      heightScale: 0.88,
      widthScale: 1.05,
      windStrength: 0.35
    });

    this.v3GrassMaterial = material;
    this.v3GrassUniforms = uniforms;

    // 3. Build Spatial Grid Chunks (8x8 cells)
    this.buildSavannaChunks();
  }

  buildSavannaChunks() {
    this.rng = createSeededRandom(88127);

    const targetPool = this.v3GrassCount;
    const GRID_SIZE = 8;
    const MIN_COORD = -135.0;
    const MAX_COORD = 135.0;
    const CELL_SIZE = (MAX_COORD - MIN_COORD) / GRID_SIZE;

    const chunkBuckets = new Map();
    const oasisCenter = { x: 14.0, z: -12.0 };
    const maxAttempts = 160000;
    let totalBlades = 0;

    for (let i = 0; i < maxAttempts && totalBlades < targetPool; i++) {
      const ang = this.random() * Math.PI * 2;
      const r = this.random() * 128.0;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;

      // Avoid oasis water pool
      const dxO = x - oasisCenter.x;
      const dzO = z - oasisCenter.y;
      if (Math.hypot(dxO, dzO) < 16.5) continue;

      const groundY = this.terrain.getHeight(x, z);
      if (groundY < 2.5) continue; // Skip beach below sea margin

      // Slope check: only spawn on flat plateau and terraces (skip steep canyon cliffs)
      const normal = this.terrain.getNormal(x, z);
      if (normal.y < 0.74) continue;

      // Agrupación orgánica por manchas
      const noiseVal = fbm2D(x * 0.12, z * 0.12);
      if (noiseVal < 0.24) continue;

      const normWeight = (noiseVal - 0.24) / 0.76;
      if (this.random() > Math.pow(normWeight, 1.2)) continue;

      const edgeTaper = 0.45 + 0.55 * Math.pow(normWeight, 0.55);
      const naturalVar = 0.88 + this.random() * 0.24;
      const scaleY = edgeTaper * naturalVar;
      const scaleXZ = (0.85 + 0.30 * normWeight) * naturalVar;

      const rotX = (this.random() - 0.5) * 0.12;
      const rotY = this.random() * Math.PI * 2;
      const rotZ = (this.random() - 0.5) * 0.12;

      // Assign to spatial bucket
      const gx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((x - MIN_COORD) / CELL_SIZE)));
      const gz = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((z - MIN_COORD) / CELL_SIZE)));
      const key = `${gx}_${gz}`;

      let bucket = chunkBuckets.get(key);
      if (!bucket) {
        bucket = [];
        chunkBuckets.set(key, bucket);
      }

      bucket.push({
        x, y: groundY, z,
        rotX, rotY, rotZ,
        scaleXZ, scaleY,
        normX: normal.x, normY: normal.y, normZ: normal.z
      });
      totalBlades++;
    }

    // Build InstancedMesh per spatial chunk
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    chunkBuckets.forEach((blades, key) => {
      const count = blades.length;
      if (count === 0) return;

      const instMesh = new THREE.InstancedMesh(this.v3ClumpGeo, this.v3GrassMaterial, count);
      instMesh.name = `SavannaGrassChunk_${key}`;
      instMesh.castShadow = false;
      instMesh.receiveShadow = false;

      const aTerrainNormal = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const b = blades[i];
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.set(b.scaleXZ, b.scaleY, b.scaleXZ);

        // Align gently with terrain normal + random spin
        const terrainNorm = new THREE.Vector3(b.normX, b.normY, b.normZ);
        dummy.quaternion.setFromUnitVectors(up, terrainNorm);
        dummy.rotateY(b.rotY);
        dummy.updateMatrix();

        instMesh.setMatrixAt(i, dummy.matrix);

        aTerrainNormal[i * 3 + 0] = b.normX;
        aTerrainNormal[i * 3 + 1] = b.normY;
        aTerrainNormal[i * 3 + 2] = b.normZ;
      }

      instMesh.geometry.setAttribute('aTerrainNormal', new THREE.InstancedBufferAttribute(aTerrainNormal, 3));
      instMesh.instanceMatrix.needsUpdate = true;
      instMesh.computeBoundingSphere();
      instMesh.computeBoundingBox();

      this.group.add(instMesh);
      this.v3GrassChunks.push({ mesh: instMesh, totalCount: count });
    });

    console.log(`[SavannaVegetationManager] 🌾 Initialized ${this.v3GrassChunks.length} chunks with golden savannah grass.`);
  }

  update(delta, playerPos, companionPos) {
    if (this.v3GrassUniforms) {
      this.v3GrassUniforms.uTime.value += delta;

      if (playerPos) {
        this.v3GrassUniforms.uPlayerPos.value.copy(playerPos);
      }
      if (companionPos) {
        this.v3GrassUniforms.uCompanionPos.value.copy(companionPos);
      }
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
