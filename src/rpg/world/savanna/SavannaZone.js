import * as THREE from 'three';
import { SavannaAssetManager } from './SavannaAssetManager.js';
import { SavannaTerrain } from './SavannaTerrain.js';
import { SavannaWaterManager } from './SavannaWaterManager.js';
import { SavannaVegetationManager } from './SavannaVegetationManager.js';
import { SavannaPropsManager } from './SavannaPropsManager.js';
import { SavannaLandmarksManager } from './SavannaLandmarksManager.js';
import { SavannaDistantIslands } from './SavannaDistantIslands.js';
import { SavannaParticles } from './SavannaParticles.js';
import { LightingManager } from '../demo_scena/LightingManager.js';
import { AtmosphereManager } from '../demo_scena/AtmosphereManager.js';
import { FootstepEffectsManager } from '../demo_scena/FootstepEffectsManager.js';
import { SavannaGenshinArt } from './SavannaGenshinArt.js';
import { mergeStaticByMaterial } from '../../../render/StaticMerge.js';
import { buildPropColliders } from '../islands/kit/IslandPropColliders.js';
import { IslandTerrainMask } from '../islands/kit/IslandTerrainMask.js';

// Hito 69 · colisiones de la Sabana
const SAV_TAG = 'savisle_';
const SAV_RULES = [
  { test: /^IslandTreeTrunk_palm/, kind: 'palm', band: 0.8, rMin: 0.3, rMax: 0.7 },
  { test: /^IslandTreeTrunk_acacia/, kind: 'acacia', band: 0.8, rMin: 0.35, rMax: 1.0 },
  { test: /^IslandTreeTrunk_dead/, kind: 'dead', band: 0.8, rMin: 0.35, rMax: 1.0 },
  { test: /Cactus/, kind: 'cactus', band: 1.0, rMin: 0.4, rMax: 1.0 },
  { test: /^SavannaRockMounds/, kind: 'mound', band: 1.2, rMin: 0.5, rMax: 2.5, minH: 0.7 },
  { test: /^SavannaPinnacles/, kind: 'pinnacle', band: 1.2, rMin: 0.6, rMax: 4.0 },
];
export const SAV_SLOPE_MAX = 35;   // grados: las paredes de las mesetas (~50°) no se suben; las rampas (13–22°) sí
export const SAV_WADE_MAX = 0.5;   // agua hasta la rodilla
// Rampas que suben a la meseta (oeste y noreste). Junto a ellas las paredes se suavizan (Hito 69b):
//  · tramo bajo (camino por debajo de RAMP_LOW_FLOOR): los laterales del primer escalón se pisan enteros;
//  · tramo alto: se puede subir por el lateral hasta cierta altura sobre el camino, que crece al acercarse a la
//    meseta (≈2 m al pie, ≈4 m a media rampa, ≈6 m arriba; al final la pared queda libre del todo).
const SAV_RAMPS = [
  { a: [-120, 42], b: [-35, 8] },
  { a: [90, -108], b: [30, -42] },
];
const RAMP_HALF = 18;          // anchura (m) a cada lado del eje en la que se aplica
const RAMP_LOW_FLOOR = 8.5;    // altura del camino por debajo de la cual es el tramo bajo
const RAMP_LOW_TOP = 15.5;     // altura máxima del primer escalón
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const RAMP_SOFT_K = 12;        // grados por metro de exceso (borde suave del límite)
const rampClimb = (floor) => 2 + 0.55 * (floor - 10.4); // metros que se pueden subir sobre el camino

/**
 * SavannaZone.js - Master Coordinator for Isla de la Sabana (Macro-Zone [3, 2] / Savannah Grand Island)
 * Criteria:
 * - Identical footprint: 480m x 480m (radius ~160m).
 * - Stepped Mesa Geography: High plateau rising from the sea with layered canyon strata cliffs
 *   and gentle walkable ascending ramps up to a colossal summit (Y ~26m).
 * - Panoramic vista: From the high plateau, the silhouettes of Forest, Arctic, and Lunar/Volcano islands
 *   are clearly visible across the ocean horizon.
 * - Summit Oasis (Hito 23): turquoise lagoon level with the plateau (no recessed basin), with palms,
 *   reeds, and swimming fishes.
 * - Hito 23: Genshin art direction layer (SavannaGenshinArt) shared with the other islands.
 * - Golden Savannah Palette: Terracotta, ochre, sandstone, and warm golden grass V3.
 * - Desert Atmospheric Particles: Swirling golden sand drafts, dust eddies, and aerodynamic wind gusts
 *   instead of falling forest leaves.
 * - 3 Key Landmarks:
 *   1. Desierto del Sol Naciente (Sandstone Sun Altar facing sunrise)
 *   2. Campamento de Bing (Nomad outpost & archery lookouts over the oasis)
 *   3. Fragua Nómada de Baruk (Great canyon smithy with glowing anvil & forge)
 * - Maximum Optimization: THREE.InstancedMesh, Frustum Culling, 0-shadow overhead for silhouettes.
 * - Deterministic Mulberry32 RNG (props and vegetation never shift).
 */
export class SavannaZone {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.scene = overworldManager.scene;
    this.renderer = overworldManager.renderer;

    this.group = new THREE.Group();
    this.group.name = 'SavannaZone';
    this.scene.add(this.group);

    this.isLoaded = false;
    this.isActive = false;

    this.assetManager = new SavannaAssetManager();
    this.terrain = null;
    this.waterManager = null;
    this.vegetationManager = null;
    this.propsManager = null;
    this.landmarksManager = null;
    this.distantIslands = null;
    this.particleManager = null;
    this.footstepManager = null;
    this.lightingManager = null;
    this.atmosphereManager = null;
    // Hito 23: Genshin-style art direction (window.savannaGenshinArt.setEnabled(false) shows the legacy look)
    this.useGenshinArt = true;
    this.genshinArt = null;
  }

  async init(onProgress = null) {
    if (this.isLoaded) return;

    console.log('[SavannaZone] 🏜️ Inicializando Isla de la Sabana (480m x 480m)...');

    // 1. Cargar catálogo de modelos (palmeras, rocas sabana, acacias, árboles secos)
    // Con el arte Genshin, las palmeras y árboles GLTF antiguos no se ven (IslandTrees ocupa sus posiciones)
    // y las texturas sueltas del catálogo y las briznas estilizadas no las usa nadie: no se cargan.
    // Si hicieran falta (aspecto antiguo), SavannaPropsManager.ensureLegacyTrees() los carga.
    const legacyKeys = ['palm_1', 'palm_2', 'palm_3', 'palm_4', 'palm_5', 'tree_palm_bend', 'tree_palm_tall',
      'tree_plateau', 'tree_plateau_fall', 'tree_twisted_1', 'tree_twisted_2', 'tree_twisted_3', 'tree_twisted_4', 'tree_twisted_5',
      'tree_dead_1', 'tree_dead_2', 'tree_dead_3', 'tree_dead_4', 'tree_dead_5',
      'stylized_grass_blades', 'rocks_desert_diffuse', 'rocks_diffuse', 'leaves_texture', 'leaves_twisted', 'bark_twisted', 'bark_dead', 'sand_path', 'wind_noise'];
    await this.assetManager.loadAll(onProgress, { deferKeys: this.useGenshinArt ? legacyKeys : [] });

    // 2. Terreno de Meseta Alta Escalonada con shaders de estratos de cañón
    this.terrain = new SavannaTerrain(this.group, this.assetManager);

    // 3. Oasis turquesa en la meseta y océano circundante
    this.waterManager = new SavannaWaterManager(this.group, this.terrain, this.assetManager);

    // 4. Césped dorado de Sabana V3 (45,000 briznas instanciadas en GPU)
    // Con el arte Genshin la hierba dorada antigua (45.000 matas) queda oculta: no se construye
    this.vegetationManager = new SavannaVegetationManager(this.group, this.terrain, this.assetManager, { deferGrass: this.useGenshinArt });

    // 5. Props instanciados (palmeras de oasis, acacias, rocas de sabana y desierto)
    this.propsManager = new SavannaPropsManager(this.group, this.terrain, this.assetManager, { deferLegacyTrees: this.useGenshinArt });

    // 6. Los 3 Puntos de Interés / Landmarks de la Sabana
    this.landmarksManager = new SavannaLandmarksManager(this.group, this.terrain, this.assetManager);

    // 7. Siluetas de las otras islas en el horizonte marino (Bosque al Oeste, Ártico al Norte, Volcán al Sur)
    this.distantIslands = new SavannaDistantIslands(this.group);
    // Decorado fijo: una malla por material (misma imagen, muchas menos llamadas de dibujo)
    mergeStaticByMaterial(this.distantIslands.group, { name: 'SavannaHorizonMerged' });

    // 8. Partículas de viento y ráfagas de arena (reemplazando hojas de bosque)
    this.particleManager = new SavannaParticles(this.group, this.terrain);

    // 8b. Huellas y polvo al caminar sobre la arena y tierra de la meseta
    this.footstepManager = new FootstepEffectsManager(this.group, this.terrain, (x, z) => this.getHeight(x, z), // huellas sobre puentes y hielo
      (x, z) => (this.terrainMask ? this.terrainMask.depthAt(x, z) : null)); // ondas en el mar y el oasis (Hito 69)

    // 9. Iluminación y Atmósfera Solar de Sabana
    this.lightingManager = new LightingManager(this.scene);
    this.atmosphereManager = new AtmosphereManager(this.scene, this.renderer);

    const presetData = this.lightingManager.applyPreset('savanna');
    if (presetData) {
      this.atmosphereManager.applyPresetAtmosphere(presetData);
      if (this.distantIslands && presetData.fogColor !== undefined) {
        this.distantIslands.setHorizonColor(presetData.fogColor);
      }
    }

    // 10. Hito 23: Genshin art direction layer
    if (this.useGenshinArt) {
      try {
        this.genshinArt = new SavannaGenshinArt(this);
        this.genshinArt.setActive(this.isActive);
      } catch (err) {
        console.error('[SavannaZone] Genshin art layer failed, keeping legacy visuals:', err);
        this.genshinArt = null;
        try { this.vegetationManager && this.vegetationManager.ensureGrass && this.vegetationManager.ensureGrass(); } catch (e) { console.warn(e); }
        try { this.propsManager && this.propsManager.ensureLegacyTrees && await this.propsManager.ensureLegacyTrees(); } catch (e) { console.warn(e); }
      }
    }

    this.isLoaded = true;
    console.log('[SavannaZone] ✨ Isla de la Sabana completamente inicializada.');
    this._buildCollisionData();
  }

  /**
   * Hito 69: troncos, cactus y rocas con colisión; paredes de las mesetas que no se suben; mar hasta la rodilla y
   * oasis somero que se cruza entero (con ondas). Se calcula una vez al cargar; se da de alta al activar la isla.
   */
  _buildCollisionData() {
    const ocean = this.group.getObjectByName('SavannaOceanMesh');
    const oceanY = ocean ? ocean.getWorldPosition(new THREE.Vector3()).y : 0.45;
    const oasis = this.group.getObjectByName('SavannaOasisWaterMesh'); // solo la lámina de agua (sin espuma ni peces)
    let shallow = null;
    if (oasis) {
      oasis.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(oasis);
      const ray = new THREE.Raycaster(); const down = new THREE.Vector3(0, -1, 0); const o = new THREE.Vector3();
      shallow = (x, z) => {
        if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z) return null;
        o.set(x, box.max.y + 20, z); ray.set(o, down);
        const hit = ray.intersectObject(oasis, false)[0];
        return hit ? hit.point.y : null;
      };
    }
    this.terrainMask = new IslandTerrainMask({ minX: -160, minZ: -160, size: 320, cell: 1 }, {
      height: (x, z) => this.terrain.getHeight(x, z),
      waterSurface: (x, z) => (Math.hypot(x, z) > 95 ? oceanY : null),
      shallow,
      shallowMax: 0.3, // oasis somero: el agua no pasa de media pierna
      adjust: (m) => this._softenRampWalls(m),
      smoothSlope: true,         // borde de las paredes sin picos de 1 m (el personaje se enganchaba)
      slopeLimit: SAV_SLOPE_MAX, // sin motas de pared sueltas
    });
    const t0 = performance.now();
    this.terrainMask.bake().then(() => {
      if (this.terrainMask.ready) console.log(`[SavannaZone] Pendientes y agua listas (${(performance.now() - t0).toFixed(0)} ms repartidos)`);
    });
    this._syncCollisions(this.isActive);
  }

  /** Paredes junto a las rampas: se quitan o se dejan subir en parte (ver SAV_RAMPS). Una vez, al terminar el cálculo. */
  _softenRampWalls(m) {
    const { n, cell, minX, minZ, H, slope } = m;
    let freed = 0;
    for (const { a, b } of SAV_RAMPS) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      // altura del camino cada metro: lo más bajo del corte transversal cerca del eje
      const floor = [];
      for (let s = 0; s <= Math.ceil(L); s++) {
        const cx = a[0] + ux * s, cz = a[1] + uz * s;
        let mn = Infinity;
        for (let o = -6; o <= 6; o += 0.5) mn = Math.min(mn, this.terrain.getHeight(cx - uz * o, cz + ux * o));
        floor.push(mn);
      }
      const x0 = Math.min(a[0], b[0]) - RAMP_HALF, x1 = Math.max(a[0], b[0]) + RAMP_HALF;
      const z0 = Math.min(a[1], b[1]) - RAMP_HALF, z1 = Math.max(a[1], b[1]) + RAMP_HALF;
      const i0 = Math.max(0, Math.floor((x0 - minX) / cell)), i1 = Math.min(n - 1, Math.ceil((x1 - minX) / cell));
      const j0 = Math.max(0, Math.floor((z0 - minZ) / cell)), j1 = Math.min(n - 1, Math.ceil((z1 - minZ) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * n + i;
        if (slope[k] <= SAV_SLOPE_MAX) continue;
        const x = minX + i * cell, z = minZ + j * cell;
        const s = (x - a[0]) * ux + (z - a[1]) * uz, side = Math.abs(-(x - a[0]) * uz + (z - a[1]) * ux);
        if (s < -4 || s > L + 4 || side > RAMP_HALF) continue;
        const f = floor[Math.max(0, Math.min(floor.length - 1, Math.round(s)))];
        // Exceso de altura sobre lo que se deja subir. En vez de marcar casillas sueltas (borde en escalera de 1 m,
        // donde el personaje se enganchaba), la pendiente pasa a depender del exceso: el límite de 35° queda en una
        // curva de nivel suave y su gradiente apunta hacia el camino, así el deslizamiento sigue el borde.
        // Altura hasta la que se deja subir: el primer escalón entero en el tramo bajo y, en el alto, «camino +
        // rampClimb». Entre los dos se mezcla con suavidad (sin un quiebro de pared atravesado en la rampa).
        const limitH = lerp(RAMP_LOW_TOP, f + rampClimb(f), smooth(RAMP_LOW_FLOOR - 1, RAMP_LOW_FLOOR + 2, f));
        const v = Math.max(0, SAV_SLOPE_MAX + RAMP_SOFT_K * (H[k] - limitH));
        // Al borde de la zona (lados y extremos) el cambio se funde con la pendiente original: sin crestas
        const w = smooth(RAMP_HALF, RAMP_HALF - 5, side) * smooth(-4, 2, s) * smooth(L + 4, L - 2, s);
        if (v < slope[k] && w > 0) {
          const nv = slope[k] + (v - slope[k]) * w;
          if (nv <= SAV_SLOPE_MAX) freed++;
          slope[k] = nv;
        }
      }
    }
    console.log(`[SavannaZone] Rampas: ${freed} m² de pared que ahora se pisan`);
  }

  /**
   * Círculos de los objetos. Se calculan la primera vez que la isla está visible (la capa de arte oculta sus mallas
   * mientras la isla no está activa, y así se ignoran las piezas antiguas que el arte deja ocultas).
   */
  _buildPropColliders() {
    const hoodoos = (this.genshinArt && this.genshinArt._colliders) || [];
    const t0 = performance.now();
    try {
      this._colliders = buildPropColliders(this.group, SAV_RULES, {
        // las agujas que ya tienen su colisión (hoodoos del arte Genshin) no se repiten
        skip: (x, z, r, kind) => kind === 'pinnacle' && hoodoos.some(([hx, hz, hr]) => Math.hypot(hx - x, hz - z) < hr + 0.3),
      });
    } catch (e) { console.warn('[SavannaZone] colisiones', e); this._colliders = []; }
    console.log(`[SavannaZone] ${this._colliders.length} colisiones de objetos (${(performance.now() - t0).toFixed(0)} ms)`);
  }

  _syncCollisions(active) {
    const col = this.om && this.om.collisions;
    if (!col || typeof col.addCircle !== 'function') return;
    col.removeCirclesByTag(SAV_TAG);
    if (active && !this._colliders && this.group.visible) this._buildPropColliders();
    if (active && this._colliders) this._colliders.forEach(([x, z, r, kind], i) => col.addCircle(x, z, r, `${SAV_TAG}${kind}_${i}`));
    if (typeof col.setWaterMask === 'function') {
      if (active && this.terrainMask) { col.setWaterMask(this.terrainMask, SAV_WADE_MAX); col.setSlopeMask?.(this.terrainMask, SAV_SLOPE_MAX); }
      else if (!active) {
        // cada máscara por separado: la isla siguiente puede haber puesto ya la suya
        if (col._water === this.terrainMask) col.setWaterMask(null);
        if (col._slope === this.terrainMask) col.setSlopeMask?.(null);
      }
    }
  }

  getHeight(x, z) {
    if (!this.terrain) return 0;
    const h = this.terrain.getHeight(x, z);
    // oasis somero (Hito 69): el personaje camina con el agua a la rodilla, sin hundirse
    return this.terrainMask ? this.terrainMask.walkHeight(x, z, h) : h;
  }

  getNormal(x, z) {
    if (!this.terrain) return new THREE.Vector3(0, 1, 0);
    return this.terrain.getNormal(x, z);
  }

  update(delta, playerPos) {
    if (!this.isActive || !this.isLoaded) return;

    if (this.terrain && typeof this.terrain.update === 'function') {
      this.terrain.update(delta);
    }
    if (this.waterManager && typeof this.waterManager.update === 'function') {
      this.waterManager.update(delta);
    }
    if (this.vegetationManager && typeof this.vegetationManager.update === 'function') {
      const companionPos = (this.om && this.om.player && this.om.player.companionGroup) ? this.om.player.companionGroup.position : null;
      this.vegetationManager.update(delta, playerPos, companionPos);
    }
    if (this.propsManager && typeof this.propsManager.update === 'function') {
      this.propsManager.update(delta, playerPos);
    }
    if (this.landmarksManager && typeof this.landmarksManager.update === 'function') {
      this.landmarksManager.update(delta);
    }
    if (this.particleManager && typeof this.particleManager.update === 'function') {
      this.particleManager.update(delta);
    }
    if (this.footstepManager && typeof this.footstepManager.update === 'function') {
      this.footstepManager.update(delta, this.om?.player);
    }
    if (this.lightingManager && playerPos && typeof this.lightingManager.updateLightTarget === 'function') {
      this.lightingManager.updateLightTarget(playerPos);
    }
    if (this.atmosphereManager && playerPos && typeof this.atmosphereManager.update === 'function') {
      this.atmosphereManager.update(delta, playerPos);
    }
    if (this.genshinArt) {
      this.genshinArt.update(delta, playerPos);
    }
  }

  setLightingPreset(presetKey) {
    if (this.lightingManager) {
      const presetData = this.lightingManager.applyPreset(presetKey);
      if (presetData) {
        if (this.atmosphereManager) {
          this.atmosphereManager.applyPresetAtmosphere(presetData);
        }
        if (this.distantIslands && presetData.fogColor !== undefined) {
          this.distantIslands.setHorizonColor(presetData.fogColor);
        }
      }
    }
  }

  setActive(active) {
    this.isActive = active;
    this.group.visible = active;
    // tras activar la capa de arte (sus mallas pasan a visibles en este mismo setActive)
    if (this.isLoaded) { if (active) setTimeout(() => { if (this.isActive) this._syncCollisions(true); }, 0); else this._syncCollisions(false); }

    if (this.terrain && this.terrain.mesh) {
      this.terrain.mesh.visible = active;
    }
    if (this.waterManager && typeof this.waterManager.setVisible === 'function') {
      this.waterManager.setVisible(active);
    }
    if (this.vegetationManager && typeof this.vegetationManager.setVisible === 'function') {
      this.vegetationManager.setVisible(active);
    }
    if (this.propsManager && typeof this.propsManager.setVisible === 'function') {
      this.propsManager.setVisible(active);
    }
    if (this.landmarksManager && typeof this.landmarksManager.setVisible === 'function') {
      this.landmarksManager.setVisible(active);
    }
    if (this.distantIslands && typeof this.distantIslands.setVisible === 'function') {
      this.distantIslands.setVisible(active);
    }
    if (this.particleManager && typeof this.particleManager.setVisible === 'function') {
      this.particleManager.setVisible(active);
    }
    if (this.footstepManager && typeof this.footstepManager.setVisible === 'function') {
      this.footstepManager.setVisible(active);
    }
    if (this.lightingManager && typeof this.lightingManager.setVisible === 'function') {
      this.lightingManager.setVisible(active);
    }
    if (this.atmosphereManager && typeof this.atmosphereManager.setVisible === 'function') {
      this.atmosphereManager.setVisible(active);
    }

    if (active) {
      this.setLightingPreset('savanna');
      if (this.renderer) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.18;
      }
    }

    // Hito 23: Genshin art layer last (overrides lighting, haze, exposure; keeps replaced legacy pieces hidden)
    if (this.genshinArt) {
      this.genshinArt.setActive(active);
    }
  }
}
