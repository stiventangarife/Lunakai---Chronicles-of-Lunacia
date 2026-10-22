import * as THREE from 'three';
import { GLTFLoader } from '../../../../vendor/GLTFLoader.js';

/**
 * SavannaAssetManager - Centralized loader for Savannah Island 3D models and textures.
 * High fidelity, optimized caching:
 * - Palm trees (Oasis)
 * - Savannah cliff rocks (Rock_sabana 1-5 & desert diffuse textures)
 * - Acacia, twisted, and dead desert trees
 * - Desert shrubs, pebbles, and grasses
 */
export class SavannaAssetManager {
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
      console.warn(`[SavannaAssetManager] Warning loading asset: ${url}`);
    };
  }

  /**
   * @param {Function} onProgress
   * @param {{ deferKeys?: Iterable<string> }} [opts] modelos y texturas que no se cargan ahora
   *   (p. ej. palmeras y árboles GLTF antiguos que el arte Genshin sustituye). loadModels(keys) los carga.
   */
  async loadAll(onProgress, opts = {}) {
    if (this.isLoaded) return;
    this.onProgressCallback = onProgress;
    const defer = new Set(opts.deferKeys || []);

    const modelDefinitions = [
      // 1. Palms for the Oasis and Plateau Groves (Replacing pines with authentic palms)
      { key: 'palm_1', url: './assets/nature/palms/PalmTree_1.glb' },
      { key: 'palm_2', url: './assets/nature/palms/PalmTree_2.glb' },
      { key: 'palm_3', url: './assets/nature/palms/PalmTree_3.glb' },
      { key: 'palm_4', url: './assets/nature/palms/PalmTree_4.glb' },
      { key: 'palm_5', url: './assets/nature/palms/PalmTree_5.glb' },
      { key: 'tree_palm_bend', url: './assets/savannah/tree_palmBend.glb' },
      { key: 'tree_palm_tall', url: './assets/savannah/tree_palmDetailedTall.glb' },

      // 2. Savannah Specialized Rocks (Replacing forest rocks with authentic savannah rocks)
      { key: 'rock_savanna_1', url: './assets/nature/rocks/Rock_sabana1.glb' },
      { key: 'rock_savanna_2', url: './assets/nature/rocks/Rock_sabana2.glb' },
      { key: 'rock_savanna_3', url: './assets/nature/rocks/Rock_sabana3.glb' },
      { key: 'rock_savanna_4', url: './assets/nature/rocks/Rock_sabana4.glb' },
      { key: 'rock_savanna_5', url: './assets/nature/rocks/Rock_sabana5.glb' },
      { key: 'rock_small_a', url: './assets/savannah/rock_smallA.glb' },
      { key: 'rock_small_b', url: './assets/savannah/rock_smallB.glb' },
      { key: 'rock_small_flat_a', url: './assets/savannah/rock_smallFlatA.glb' },
      { key: 'stone_small_a', url: './assets/savannah/stone_smallA.glb' },

      // 3. Savannah cactus (stylised barrel / prickly-pear cactus with flower, 2.2k tris, 1 material)
      { key: 'cactus_forge3d', url: './assets/savannah/cactus_forge3D.glb' },

      // 4. Flat-topped Acacia & Desert Twisted Trees
      { key: 'tree_plateau', url: './assets/savannah/tree_plateau.glb' },
      { key: 'tree_plateau_fall', url: './assets/savannah/tree_plateau_fall.glb' },
      { key: 'tree_twisted_1', url: './assets/nature/TwistedTree_1.gltf' },
      { key: 'tree_twisted_2', url: './assets/nature/TwistedTree_2.gltf' },
      { key: 'tree_twisted_3', url: './assets/nature/TwistedTree_3.gltf' },
      { key: 'tree_twisted_4', url: './assets/nature/TwistedTree_4.gltf' },
      { key: 'tree_twisted_5', url: './assets/nature/TwistedTree_5.gltf' },

      // 5. Dead Desert Trees
      { key: 'tree_dead_1', url: './assets/nature/DeadTree_1.gltf' },
      { key: 'tree_dead_2', url: './assets/nature/DeadTree_2.gltf' },
      { key: 'tree_dead_3', url: './assets/nature/DeadTree_3.gltf' },
      { key: 'tree_dead_4', url: './assets/nature/DeadTree_4.gltf' },
      { key: 'tree_dead_5', url: './assets/nature/DeadTree_5.gltf' },

      // 6. Shrubbery and Flora
      { key: 'bush_common', url: './assets/nature/Bush_Common.gltf' },
      { key: 'bush_flowers', url: './assets/nature/Bush_Common_Flowers.gltf' },
      { key: 'grass_wispy_tall', url: './assets/nature/Grass_Wispy_Tall.gltf' },
      { key: 'plant_1', url: './assets/nature/Plant_1.gltf' },
      { key: 'plant_7', url: './assets/nature/Plant_7.gltf' },
      { key: 'fern_1', url: './assets/nature/Fern_1.gltf' },
      { key: 'pebble_1', url: './assets/nature/Pebble_Round_1.gltf' },
      { key: 'pebble_2', url: './assets/nature/Pebble_Round_2.gltf' },
      { key: 'pebble_3', url: './assets/nature/Pebble_Round_3.gltf' },

      // 7. Stylized Grass Blades Up (Anime Genshin Grass)
      { key: 'stylized_grass_blades', url: './assets/stylized/grass-blades-up.glb' }
    ];

    const textureDefinitions = [
      { key: 'rocks_desert_diffuse', url: './assets/nature/Rocks_Desert_Diffuse.png' },
      { key: 'rocks_diffuse', url: './assets/nature/Rocks_Diffuse.png' },
      { key: 'leaves_texture', url: './assets/nature/Leaves.png' },
      { key: 'leaves_twisted', url: './assets/nature/Leaves_TwistedTree.png' },
      { key: 'bark_twisted', url: './assets/nature/Bark_TwistedTree.png' },
      { key: 'bark_dead', url: './assets/nature/Bark_DeadTree.png' },
      { key: 'sand_path', url: './assets/stylized/ground_texture/ground_07_4k/ground_07__basecolor_1k.webp' },
      { key: 'wind_noise', url: './assets/stylized/perlin.webp' }
    ];

    const loadModel = (def) => {
      return new Promise((resolve) => {
        this.gltfLoader.load(
          def.url,
          (gltf) => {
            this.models.set(def.key, gltf);
            resolve();
          },
          undefined,
          (err) => {
            console.warn(`[SavannaAssetManager] Optional model ${def.key} failed:`, err);
            resolve(); // Don't block whole scene if one model fails
          }
        );
      });
    };

    const loadTexture = (def) => {
      return new Promise((resolve) => {
        this.textureLoader.load(
          def.url,
          (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            this.textures.set(def.key, tex);
            resolve();
          },
          undefined,
          (err) => {
            console.warn(`[SavannaAssetManager] Optional texture ${def.key} failed:`, err);
            resolve();
          }
        );
      });
    };

    this._deferred = new Map([...modelDefinitions, ...textureDefinitions].filter((d) => defer.has(d.key)).map((d) => [d.key, d]));
    this._loadModelFn = loadModel;
    this._loadTextureFn = loadTexture;
    this._textureKeys = new Set(textureDefinitions.map((d) => d.key));
    const modelPromises = modelDefinitions.filter((d) => !defer.has(d.key)).map(loadModel);
    const texturePromises = textureDefinitions.filter((d) => !defer.has(d.key)).map(loadTexture);

    await Promise.all([...modelPromises, ...texturePromises]);
    this.isLoaded = true;
    console.log(`[SavannaAssetManager] ✨ Loaded ${this.models.size} models and ${this.textures.size} textures.`);
  }

  getModel(key) {
    const gltf = this.models.get(key);
    if (!gltf) return null;
    return gltf.scene ? gltf.scene.clone() : null;
  }

  /** Carga (una vez) modelos o texturas que se difirieron en loadAll. */
  loadModels(keys) {
    if (!this._lazy) this._lazy = new Map();
    return Promise.all([...keys].map((key) => {
      if (this.models.has(key) || this.textures.has(key)) return Promise.resolve();
      let p = this._lazy.get(key);
      if (!p) {
        const def = this._deferred && this._deferred.get(key);
        p = !def ? Promise.resolve() : (this._textureKeys.has(key) ? this._loadTextureFn(def) : this._loadModelFn(def));
        this._lazy.set(key, p);
      }
      return p;
    }));
  }

  getRawModel(key) {
    return this.models.get(key);
  }

  getTexture(key) {
    return this.textures.get(key) || null;
  }
}
