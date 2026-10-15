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
    await this.assetManager.loadAll(onProgress);

    // 2. Terreno de Meseta Alta Escalonada con shaders de estratos de cañón
    this.terrain = new SavannaTerrain(this.group, this.assetManager);

    // 3. Oasis turquesa en la meseta y océano circundante
    this.waterManager = new SavannaWaterManager(this.group, this.terrain, this.assetManager);

    // 4. Césped dorado de Sabana V3 (45,000 briznas instanciadas en GPU)
    this.vegetationManager = new SavannaVegetationManager(this.group, this.terrain, this.assetManager);

    // 5. Props instanciados (palmeras de oasis, acacias, rocas de sabana y desierto)
    this.propsManager = new SavannaPropsManager(this.group, this.terrain, this.assetManager);

    // 6. Los 3 Puntos de Interés / Landmarks de la Sabana
    this.landmarksManager = new SavannaLandmarksManager(this.group, this.terrain, this.assetManager);

    // 7. Siluetas de las otras islas en el horizonte marino (Bosque al Oeste, Ártico al Norte, Volcán al Sur)
    this.distantIslands = new SavannaDistantIslands(this.group);

    // 8. Partículas de viento y ráfagas de arena (reemplazando hojas de bosque)
    this.particleManager = new SavannaParticles(this.group, this.terrain);

    // 8b. Huellas y polvo al caminar sobre la arena y tierra de la meseta
    this.footstepManager = new FootstepEffectsManager(this.group, this.terrain);

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
      }
    }

    this.isLoaded = true;
    console.log('[SavannaZone] ✨ Isla de la Sabana completamente inicializada.');
  }

  getHeight(x, z) {
    if (!this.terrain) return 0;
    return this.terrain.getHeight(x, z);
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
