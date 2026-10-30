import * as THREE from 'three';
import { DemoScenaAssetManager } from './DemoScenaAssetManager.js';
import { RoadManager } from './RoadManager.js';
import { Terrain } from './Terrain.js';
import { WaterManager } from './WaterManager.js';
import { VegetationManager } from './VegetationManager.js';
import { PropsManager } from './PropsManager.js';
import { LandmarksManager } from './LandmarksManager.js';
import { ParticleSystemManager } from './ParticleSystemManager.js';
import { LightingManager } from './LightingManager.js';
import { AtmosphereManager } from './AtmosphereManager.js';
import { SlimeCreaturesManager } from './SlimeCreaturesManager.js';
import { DistantIsland } from './DistantIsland.js';
import { FootstepEffectsManager } from './FootstepEffectsManager.js';
import { GenshinForestArt } from './genshin/GenshinForestArt.js';
import { ForestBridge, FOREST_BRIDGE_VILLAGE, FOREST_PIER } from './ForestBridge.js';
import { RiverFords } from './RiverFords.js';
import { mergeStaticByMaterial } from '../../../render/StaticMerge.js';
import { trackLoad } from '../../../render/LoadGate.js';
import { buildForestColliders, FOREST_COLLIDER_TAG } from './ForestColliders.js';
import { WaterDepthMask } from '../WaterDepthMask.js';
import { SeagullFlocks } from '../Seagulls.js'; // Hito 94: gaviotas en el horizonte

/** Se camina por el agua mientras cubra hasta la rodilla (m). Más honda, el personaje no pasa (Hito 66). */
export const WADE_MAX_DEPTH = 0.5;

/**
 * DemoScenaZone22 - Master Coordinator for Macro-Zone [2, 2] (Dojo / Valle de Lunacia)
 * Integra fielmente el mapa 480m x 480m de Demo_Scena:
 * - Terreno procedural con shaders Genshin Impact (multi-green ramp, micro/macro noise tiling)
 * - Red de caminos Catmull-Rom con blending orgánico
 * - Río continuo con 4 capas de oleaje, espuma de orilla y destellos especulares
 * - Mar abierto circundante y 3 islas distantes en el horizonte marino (Norte, Este, Oeste)
 * - 55,000 briznas de hierba anime instanciadas con shader de viento en GPU y flores 3D
 * - >260 árboles (common, twisted, pine), rocas, arbustos, helechos y setas
 * - Gran Árbol Ancestral sagrado con luz mística
 * - Santuario de Atia con 3 monolitos flotantes animados con levitación mágica y partículas
 * - Dojō Secreto de alta fidelidad
 * - Sistema completo de partículas (hojas de pradera, remolinos de otoño en bosque,
 *   ráfagas aerodinámicas de viento, esporas mágicas, luciérnagas titilantes, sakura del dojo)
 * - Iluminación y domo atmosférico preset 'sunset' (Atardecer cálido)
 */
export class DemoScenaZone22 {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.scene = overworldManager.scene;
    this.renderer = overworldManager.renderer;

    this.group = new THREE.Group();
    this.group.name = 'DemoScenaZone22';
    this.scene.add(this.group);

    this.isLoaded = false;
    this.isActive = false;

    this.assetManager = new DemoScenaAssetManager();
    this.roadManager = null;
    this.terrain = null;
    this.waterManager = null;
    this.vegetationManager = null;
    this.propsManager = null;
    this.landmarksManager = null;
    this.distantIslands = null;
    this.particleManager = null;
    this.slimeCreaturesManager = null;
    this.lightingManager = null;
    this.atmosphereManager = null;
    this.footstepManager = null;

    // Genshin Impact art-direction layer (Hito 22). Set to false to restore the legacy look.
    this.useGenshinArt = true;
    this.genshinArt = null;
    // Wooden footbridge over the river rapids (Elder-Tree path ↔ Shrine road)
    this.bridge = null;
    this.pier = null;
  }

  async init(onProgress = null) {
    if (this.isLoaded) return;

    console.log('[DemoScenaZone22] 🌸 Inicializando mapa Demo_Scena para macro-zona [2, 2]...');

    // 1. Cargar catálogo completo de modelos y texturas
    // Con el arte Genshin, los árboles GLTF antiguos no se ven (GenshinTrees ocupa sus posiciones):
    // no se cargan (≈235 MB de texturas menos). Si hicieran falta, PropsManager.ensureLegacyTrees().
    // tree_twisted_1 sí se carga: es el modelo del Gran Árbol Ancestral (LandmarksManager), que se ve.
    const legacyTreeKeys = ['common', 'twisted', 'pine'].flatMap((k) => [1, 2, 3, 4, 5].map((i) => `tree_${k}_${i}`))
      .filter((k) => k !== 'tree_twisted_1');
    await this.assetManager.loadAll(onProgress, { deferKeys: this.useGenshinArt ? legacyTreeKeys : [] });

    // 2. Sistema de caminos splines
    this.roadManager = new RoadManager();

    // 3. Terreno 480m x 480m con shaders toon Genshin
    this.terrain = new Terrain(this.group, this.roadManager, this.assetManager);

    // 4. Río continuo con animaciones de agua y espuma
    this.waterManager = new WaterManager(this.group, this.terrain, this.assetManager);

    // 5. 55k briznas de hierba con viento GPU y flores 3D
    // Con el arte Genshin activo la hierba V3 antigua queda oculta: no se construye (≈2,3 s menos de carga)
    this.vegetationManager = new VegetationManager(this.group, this.terrain, this.roadManager, this.assetManager, { deferLegacyGrass: this.useGenshinArt });

    // 6. >260 props de naturaleza estilizada (árboles, pinos, rocas, arbustos, etc.)
    this.propsManager = new PropsManager(this.group, this.terrain, this.roadManager, this.assetManager, { deferLegacyTrees: this.useGenshinArt });

    // 7. Landmarks (Árbol Vital, Santuario Atia, 3 Rocas Levitantes, Dojō Secreto)
    this.landmarksManager = new LandmarksManager(this.group, this.terrain, this.assetManager);

    // 7b. 3 Islas Distantes en el horizonte marino (Norte, Este, Oeste)
    this.distantIslands = new DistantIsland(this.group);
    // Decorado fijo: una malla por material (misma imagen, muchas menos llamadas de dibujo)
    mergeStaticByMaterial(this.distantIslands.group, { name: 'ForestHorizonMerged' });
    // Hito 94: gaviotas planeando sobre el mar, lejos de la costa (una sola malla instanciada; se ocultan con la zona)
    try { this.seagulls = new SeagullFlocks(this.group, { seed: 22, ring: [150, 210], height: [18, 32] }); } catch (e) { console.warn('[Gaviotas]', e); }

    // 8. Partículas atmosféricas y mágicas
    this.particleManager = new ParticleSystemManager(this.group, this.terrain);

    // 8b. Sistema de Game Feel para huellas y polvo al caminar (Sapidae & Axie)
    this.footstepManager = new FootstepEffectsManager(this.group, this.terrain, (x, z) => this.getHeight(x, z), // huellas sobre puentes y hielo
      (x, z) => (this.waterMask ? this.waterMask.depthAt(x, z) : null)); // ondas en el agua poco profunda (Hito 66)

    // 8c. Slimes auténticos del juego con combate táctico y comportamiento saltarín
    this.slimeCreaturesManager = new SlimeCreaturesManager(this.group, this.terrain, this.assetManager, this.om);
    await this.slimeCreaturesManager.init();

    // 9. Iluminación y Atmósfera dedicada (Preset Sunset)
    // Bosque: caja de sombras de ±80 m estabilizada (plan de optimización, punto B1)
    this.lightingManager = new LightingManager(this.scene, { shadowExtent: 80, snapShadows: true });
    this.atmosphereManager = new AtmosphereManager(this.scene, this.renderer);

    // 10. Genshin-style art pass (sky, mountains, grass, trees, river, rocks, post FX)
    if (this.useGenshinArt) {
      try {
        this.genshinArt = new GenshinForestArt(this);
      } catch (err) {
        console.error('[DemoScenaZone22] Genshin art pass failed, falling back to legacy visuals:', err);
        this.genshinArt = null;
        // el aspecto antiguo necesita su hierba (no se construyó al crear el gestor)
        try { this.vegetationManager && this.vegetationManager.ensureLegacyGrass && this.vegetationManager.ensureLegacyGrass(); } catch (e) { console.warn(e); }
        // y sus árboles GLTF (se difirieron)
        try { this.propsManager && this.propsManager.ensureLegacyTrees && await this.propsManager.ensureLegacyTrees(); } catch (e) { console.warn(e); }
      }
    }

    // 10b. Footbridge over the rapids joining the two paths
    this.bridge = new ForestBridge(this);
    // 10c. Puente del pueblo y piedras de los vados (Hito 66: el río ya no se cruza a pie salvo en los vados)
    this.bridgeVillage = new ForestBridge(this, FOREST_BRIDGE_VILLAGE, { name: 'ForestBridgeVillage', railTag: 'forest_bridge_village_rail' });
    // 10d. Muelle de la playa, junto al barquero (Hito 79: punto de pesca en alto)
    this.pier = new ForestBridge(this, FOREST_PIER, { name: 'ForestPier', railTag: 'forest_pier_rail' });
    try { this.riverFords = new RiverFords(this); } catch (e) { console.warn('[DemoScenaZone22] vados', e); }
    await Promise.all([this.bridge.loading, this.bridgeVillage.loading, this.pier.loading]);

    const presetData = this.lightingManager.applyPreset(this.genshinArt ? 'genshin_golden' : 'sunset');
    if (presetData) {
      this.atmosphereManager.applyPresetAtmosphere(presetData);
      if (this.distantIslands && presetData.fogColor !== undefined) {
        this.distantIslands.setHorizonColor(presetData.fogColor);
      }
    }

    this.isLoaded = true;
    console.log('[DemoScenaZone22] ✨ Mapa Demo_Scena cargado e instanciado al 100%');
    if (this.isActive) this.refreshForestColliders();
    this._bakeWaterMask();
  }

  /**
   * Profundidad del agua (mar y río) en una cuadrícula de 1 m, calculada por trozos tras la carga (Hito 66).
   * La usan las colisiones (agua honda = no se pasa) y las huellas (ondas al vadear).
   */
  _bakeWaterMask() {
    if (!this.waterMask) this.waterMask = new WaterDepthMask({ minX: -160, minZ: -160, size: 320, cell: 1 });
    const t0 = performance.now();
    trackLoad(this.waterMask.bake((x, z) => this.getWaterDepthRaw(x, z)), 'agua del Bosque').then(() => {
      if (this.waterMask.ready) console.log(`[DemoScenaZone22] Agua: profundidades listas (${(performance.now() - t0).toFixed(0)} ms repartidos)`);
    });
    if (this.isActive) this.om?.collisions?.setWaterMask?.(this.waterMask, WADE_MAX_DEPTH);
  }

  /** Superficie del agua − suelo en (x, z), evaluando el terreno; null donde no puede haber agua. */
  getWaterDepthRaw(x, z) {
    const r = Math.hypot(x, z);
    let surf = -Infinity;
    if (r > 105) surf = this.waterManager?.oceanMesh ? this.waterManager.oceanMesh.position.y : 0.45;
    const b = WaterManager.getRiverBounds(z);
    if (z >= WaterManager.RIVER_Z0 && Math.abs(x - b.riverCenterX) <= b.riverHalfWidth * 1.4 * WaterManager.getNorthMouthFactor(z) + 1) surf = Math.max(surf, WaterManager.getRiverWaterHeight(z));
    if (surf === -Infinity) return null;
    return surf - this.getHeight(x, z);
  }

  /**
   * Colisiones de troncos, rocas y monumentos de la isla (Hito 66, ver ForestColliders.js). Se recalculan aquí y
   * cuando el pueblo retira árboles o rocas de sus claros; solo se dan de alta mientras la isla está activa.
   */
  refreshForestColliders() {
    if (!this.isLoaded) return;
    try { this._forestColliders = buildForestColliders(this); } catch (e) { console.warn('[DemoScenaZone22] colisiones', e); this._forestColliders = []; }
    this._syncForestColliders(this.isActive);
  }

  _syncForestColliders(active) {
    const col = this.om && this.om.collisions;
    if (!col || typeof col.addCircle !== 'function') return;
    col.removeCirclesByTag(FOREST_COLLIDER_TAG);
    if (!active || !this._forestColliders) return;
    this._forestColliders.forEach(([x, z, r, kind], i) => col.addCircle(x, z, r, `${FOREST_COLLIDER_TAG}${kind}_${i}`));
  }

  getHeight(x, z) {
    if (!this.terrain) return 0;
    const h = this.terrain.getHeight(x, z);
    for (const br of [this.bridge, this.bridgeVillage, this.pier]) {
      if (!br) continue;
      const deck = br.getDeckHeight(x, z);
      if (deck !== null && deck > h) return deck;
    }
    return h;
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
      this.particleManager.update(delta, this.om && this.om.camera);
    }
    if (this.footstepManager && typeof this.footstepManager.update === 'function') {
      this.footstepManager.update(delta, this.om?.player);
    }
    if (this.slimeCreaturesManager && typeof this.slimeCreaturesManager.update === 'function') {
      this.slimeCreaturesManager.update(delta, playerPos);
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
    this.seagulls?.update(delta);
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
    if (this.isLoaded) {
      if (active && !this._forestColliders) this.refreshForestColliders();
      else this._syncForestColliders(active);
    }
    const col = this.om && this.om.collisions;
    if (col && typeof col.setWaterMask === 'function') {
      if (active && this.waterMask) col.setWaterMask(this.waterMask, WADE_MAX_DEPTH);
      else if (!active && col._water === this.waterMask) col.setWaterMask(null);
    }

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
    if (this.slimeCreaturesManager && typeof this.slimeCreaturesManager.setVisible === 'function') {
      this.slimeCreaturesManager.setVisible(active);
    }
    if (this.lightingManager && typeof this.lightingManager.setVisible === 'function') {
      this.lightingManager.setVisible(active);
    }
    if (this.atmosphereManager && typeof this.atmosphereManager.setVisible === 'function') {
      this.atmosphereManager.setVisible(active);
    }

    if (this.genshinArt) {
      this.genshinArt.setActive(active);
    }
    if (this.bridge) {
      this.bridge.setActive(active);
    }
    if (this.bridgeVillage) this.bridgeVillage.setActive(active);
    if (this.pier) this.pier.setActive(active);
    if (this.riverFords) this.riverFords.setActive(active);

    if (active) {
      this.setLightingPreset(this.lightingManager?.currentPreset || (this.genshinArt ? 'genshin_golden' : 'sunset'));
      if (this.renderer) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
      }
    }
  }
}
