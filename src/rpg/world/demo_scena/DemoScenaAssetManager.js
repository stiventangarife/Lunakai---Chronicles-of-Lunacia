import * as THREE from 'three';
import { GLTFLoader } from '../../../../vendor/GLTFLoader.js';

/**
 * Gestor centralizado de carga de assets GLB y GLTF de naturaleza estilizada
 * (estilo Genshin Impact / JRPG fantasy) para Demo_Scena en Macro-Zona [2, 2].
 */
export class DemoScenaAssetManager {
  constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);

    this.models = new Map();
    this.textures = new Map();

    this.onProgressCallback = null;
    this.onErrorCallback = null;
    this.isLoaded = false;

    this.setupLoadingManager();
  }

  setupLoadingManager() {
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      if (this.onProgressCallback) {
        this.onProgressCallback(itemsLoaded, itemsTotal, url);
      }
    };

    this.loadingManager.onError = (url) => {
      console.warn(`[DemoScenaAssetManager] Error al cargar asset: ${url}`);
    };
  }

  /**
   * @param {Function} onProgress
   * @param {{ deferKeys?: Iterable<string> }} [opts] modelos que no se cargan ahora (p. ej. los árboles
   *   GLTF antiguos cuando el arte Genshin los sustituye). Se cargan después con loadModels(keys).
   */
  async loadAll(onProgress, opts = {}) {
    if (this.isLoaded) return;
    this.onProgressCallback = onProgress;
    const defer = new Set(opts.deferKeys || []);

    // Catálogo de modelos de naturaleza estilizada de alta calidad
    const modelDefinitions = [
      // 1. Árboles Frondosos Estilizados (Common Trees)
      { key: 'tree_common_1', url: './assets/nature/CommonTree_1.gltf' },
      { key: 'tree_common_2', url: './assets/nature/CommonTree_2.gltf' },
      { key: 'tree_common_3', url: './assets/nature/CommonTree_3.gltf' },
      { key: 'tree_common_4', url: './assets/nature/CommonTree_4.gltf' },
      { key: 'tree_common_5', url: './assets/nature/CommonTree_5.gltf' },

      // 2. Árboles Retorcidos de Fantasía (Twisted Trees)
      { key: 'tree_twisted_1', url: './assets/nature/TwistedTree_1.gltf' },
      { key: 'tree_twisted_2', url: './assets/nature/TwistedTree_2.gltf' },
      { key: 'tree_twisted_3', url: './assets/nature/TwistedTree_3.gltf' },
      { key: 'tree_twisted_4', url: './assets/nature/TwistedTree_4.gltf' },
      { key: 'tree_twisted_5', url: './assets/nature/TwistedTree_5.gltf' },

      // 3. Pinos Estilizados (Pines)
      { key: 'tree_pine_1', url: './assets/nature/Pine_1.gltf' },
      { key: 'tree_pine_2', url: './assets/nature/Pine_2.gltf' },
      { key: 'tree_pine_3', url: './assets/nature/Pine_3.gltf' },
      { key: 'tree_pine_4', url: './assets/nature/Pine_4.gltf' },
      { key: 'tree_pine_5', url: './assets/nature/Pine_5.gltf' },

      // 4. Vegetación y Césped de Naturaleza
      { key: 'grass_common_tall', url: './assets/nature/Grass_Common_Tall.gltf' },
      { key: 'grass_wispy_tall', url: './assets/nature/Grass_Wispy_Tall.gltf' },
      { key: 'fern_1', url: './assets/nature/Fern_1.gltf' },
      { key: 'bush_common', url: './assets/nature/Bush_Common.gltf' },
      { key: 'bush_flowers', url: './assets/nature/Bush_Common_Flowers.gltf' },
      { key: 'plant_1', url: './assets/nature/Plant_1.gltf' },
      { key: 'plant_7', url: './assets/nature/Plant_7.gltf' },
      { key: 'flower_group_3', url: './assets/nature/Flower_3_Group.gltf' },
      { key: 'flower_group_4', url: './assets/nature/Flower_4_Group.gltf' },
      { key: 'clover_1', url: './assets/nature/Clover_1.gltf' },
      { key: 'mushroom_common', url: './assets/nature/Mushroom_Common.gltf' },

      // 5. Rocas y Guijarros Estilizados Texturizados
      { key: 'rock_med_1', url: './assets/nature/Rock_Medium_1.gltf' },
      { key: 'rock_med_2', url: './assets/nature/Rock_Medium_2.gltf' },
      { key: 'rock_med_3', url: './assets/nature/Rock_Medium_3.gltf' },
      { key: 'pebble_1', url: './assets/nature/Pebble_Round_1.gltf' },
      { key: 'pebble_2', url: './assets/nature/Pebble_Round_2.gltf' },
      { key: 'pebble_3', url: './assets/nature/Pebble_Round_3.gltf' },
      { key: 'rock_col_1', url: './assets/rocks/StylisedRockCollection1.glb' },
      { key: 'rock_col_2', url: './assets/rocks/StylisedRockCollection2.glb' },
      { key: 'rock_col_3', url: './assets/rocks/StylisedRockCollection3.glb' },
      { key: 'rock_col_4', url: './assets/rocks/StylisedRockCollection4.glb' },

      // 6. Landmarks
      //{ key: 'ancient_archway', url: './assets/environment/ancient_archway.glb' },
      //{ key: 'column_1', url: './assets/environment/column.glb' },
      //{ key: 'statue_atia', url: './assets/models/statue_atia.glb' },
      { key: 'stylized_dojo', url: './assets/models/stylized_dojo.glb' },

      // 7. Assets Estilizados Genshin (Flores, Briznas y Árboles Anime)
      { key: 'stylized_flowers', url: './assets/stylized/flowers.glb' },
      { key: 'stylized_grass_blades', url: './assets/stylized/grass-blades-up.glb' },
      { key: 'stylized_tree_trunk', url: './assets/stylized/tree-tronk-transformed.glb' },
      { key: 'stylized_tree_leaves', url: './assets/stylized/tree-leaves-mesh.glb' },

      // 8. Slimes Auténticos del Juego (Chimera Slimes)
      { key: 'slime', url: './assets/models/slime.glb' },
      { key: 'slime-support', url: './assets/models/slime-support.glb' },
      { key: 'slime-attack', url: './assets/models/slime-attack.glb' },
      { key: 'slime-defese', url: './assets/models/slime-defese.glb' }
    ];

    // Texturas
    const textureDefinitions = [
      { key: 'grass_texture', url: './assets/nature/Grass.png' },
      { key: 'leaves_texture', url: './assets/nature/Leaves.png' },
      { key: 'flowers_texture', url: './assets/nature/Flowers.png' },
      { key: 'grass_diffuse', url: './assets/stylized/grass_texture/grass_05_basecolor_1k.webp' },
      { key: 'forest_ground', url: './assets/stylized/grass_texture/forest_ground_1k.png' },
      { key: 'ground_path', url: './assets/stylized/ground_texture/ground_07_4k/ground_07__basecolor_1k.webp' },
      { key: 'path_diffuse', url: './assets/stylized/path.webp' },
      { key: 'wind_noise', url: './assets/stylized/perlin.webp' },
      { key: 'flowers_color', url: './assets/stylized/flowers-color.png' },
      { key: 'flowers_alpha', url: './assets/stylized/flowers-alpha.png' },
      { key: 'tree_leaves_alpha', url: './assets/stylized/leaves-alpha-map.png' }
    ];

    // Cargar modelos concurrentemente y preparar materiales
    this._deferredModels = new Map(modelDefinitions.filter((d) => defer.has(d.key)).map((d) => [d.key, d]));
    const modelPromises = modelDefinitions.filter((d) => !defer.has(d.key)).map((def) => this._loadModel(def));

    const texturePromises = textureDefinitions.map(async (def) => {
      try {
        const tex = await this.textureLoader.loadAsync(def.url);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        this.textures.set(def.key, tex);
      } catch (err) {
        console.warn(`[DemoScenaAssetManager] No se pudo cargar textura ${def.key}:`, err);
      }
    });

    await Promise.all([...modelPromises, ...texturePromises]);
    this.isLoaded = true;
    console.log('[DemoScenaAssetManager] Todos los assets del mapa Demo_Scena cargados con éxito.');
  }

  /** Carga (una vez) modelos que se difirieron en loadAll. */
  loadModels(keys) {
    if (!this._modelLoads) this._modelLoads = new Map();
    return Promise.all([...keys].map((key) => {
      if (this.models.has(key)) return Promise.resolve();
      let p = this._modelLoads.get(key);
      if (!p) {
        const def = this._deferredModels && this._deferredModels.get(key);
        p = def ? this._loadModel(def) : Promise.resolve();
        this._modelLoads.set(key, p);
      }
      return p;
    }));
  }

  async _loadModel(def) {
      try {
        const gltf = await this.gltfLoader.loadAsync(def.url);
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Configurar materiales para hojas y vegetación estilizadas tipo Genshin (doble cara, matte suave sin brillos plásticos)
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat) => {
                const name = (mat.name || '').toLowerCase();
                if (name.includes('leaves') || name.includes('grass') || name.includes('flower') || name.includes('foliage')) {
                  mat.side = THREE.DoubleSide;
                  mat.alphaTest = 0.22;
                  mat.transparent = false;
                  mat.depthWrite = true;
                  mat.roughness = 0.88; // Acabado suave y aterciopelado anime, sin reflejos brillantes plásticos
                  mat.metalness = 0.0;
                } else if (name.includes('bark') || name.includes('wood') || name.includes('trunk')) {
                  mat.roughness = 0.92; // Corteza terrosa mate sin reflejos
                  mat.metalness = 0.0;
                }
              });
            }
          }
        });
        this.models.set(def.key, gltf);
      } catch (err) {
        console.warn(`[DemoScenaAssetManager] No se pudo cargar modelo ${def.key}:`, err);
      }
  }

  getModel(key) {
    return this.models.get(key) || null;
  }

  cloneModel(key) {
    const gltf = this.models.get(key);
    if (!gltf || !gltf.scene) return null;
    return gltf.scene.clone(true);
  }

  cloneSubMesh(key, subMeshName) {
    const gltf = this.models.get(key);
    if (!gltf || !gltf.scene) return null;

    let targetNode = null;
    if (subMeshName) {
      gltf.scene.traverse((child) => {
        if (!targetNode && (child.name === subMeshName || (child.isMesh && child.name.toLowerCase().includes(subMeshName.toLowerCase())))) {
          targetNode = child;
        }
      });
    }

    if (!targetNode) {
      gltf.scene.traverse((child) => {
        if (!targetNode && child.isMesh) {
          targetNode = child;
        }
      });
    }

    if (!targetNode) return null;

    const cloned = targetNode.clone(true);
    cloned.position.set(0, 0, 0);
    cloned.rotation.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);

    const wrapper = new THREE.Group();
    wrapper.add(cloned);
    return wrapper;
  }

  getTexture(key) {
    return this.textures.get(key) || null;
  }
}
