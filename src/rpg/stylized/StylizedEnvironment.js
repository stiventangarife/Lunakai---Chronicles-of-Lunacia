// StylizedEnvironment.js - Coordinator for the complete Stylized Meadow Scene
import * as THREE from 'three';
import { PathSDF } from './PathSDF.js';
import { StylizedGround } from './StylizedGround.js';
import { StylizedGrass } from './StylizedGrass.js';
import { StylizedFlowers } from './StylizedFlowers.js';
import { StylizedTrees } from './StylizedTrees.js';
import { StylizedGroundFoliage } from './StylizedGroundFoliage.js';
import { StylizedTreeVines } from './StylizedTreeVines.js';

export class StylizedEnvironment {
  constructor(scene, customConfig = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.config = {
      sunPosition: [18, 18, 10],
      sunColor: '#fffae8',
      sunIntensity: 3.2,
      density: 18000,
      scale: 0.28,
      heightVariation: 0.44,
      windStrength: 0.25,
      windSpeed: 2.70,
      windAngle: 45.0,
      gustScale: 0.50,
      turbulence: 0.42,
      flutter: 0.28,
      treeSway: 3.00,
      flowerDensity: 380,
      flowerScale: 0.80,
      pathEdgeWidth: 0.65,
      roadOffset: 0.75,
      grassAO: 0.22,
      ...customConfig
    };

    this.pathSdfGenerator = new PathSDF();
    this.ground = null;
    this.grass = null;
    this.flowers = null;
    this.trees = null;
    this.groundFoliage = null;
    this.treeVines = null;
    this.skyMesh = null;
    this.sunLight = null;
  }

  async init() {
    console.log('[StylizedEnvironment] Loading textures and building stylized scene...');
    const texLoader = new THREE.TextureLoader();

    // 1. Load all textures in parallel
    const [
      grassColor, grassNormal, grassRoughness,
      noiseMap, dirtColor, dirtNormal, dirtRoughness,
      dirtAO, dirtHeight, dirtMetallic,
      pathMask, flowersColor, flowersAlpha, skyTex
    ] = await Promise.all([
      texLoader.loadAsync('./assets/stylized/grass_texture/forest_ground_1k.png'),
      texLoader.loadAsync('./assets/stylized/grass_texture/forest_ground_normal_1k.png'),
      texLoader.loadAsync('./assets/stylized/grass_texture/forest_ground_roughness_1k.png'),
      texLoader.loadAsync('./assets/stylized/perlin.webp'),
      texLoader.loadAsync('./assets/stylized/ground_texture/ground_07_4k/ground_07__basecolor_1k.webp'),
      texLoader.loadAsync('./assets/stylized/ground_texture/ground_07_4k/ground_07__normal_gl_1k.webp'),
      texLoader.loadAsync('./assets/stylized/ground_texture/ground_07_4k/ground_07__roughness_1k.webp'),
      texLoader.loadAsync('./assets/stylized/ground_texture/ground_07_4k/ground_07__ambientocclusion_1k.webp'),
      texLoader.loadAsync('./assets/stylized/ground_texture/ground_07_4k/ground_07__height_1k.webp'),
      texLoader.loadAsync('./assets/stylized/ground_texture/ground_07_4k/ground_07__metallic_1k.webp'),
      texLoader.loadAsync('./assets/stylized/path.webp'),
      texLoader.loadAsync('./assets/stylized/flowers-color.png'),
      texLoader.loadAsync('./assets/stylized/flowers-alpha.png'),
      texLoader.loadAsync('./assets/stylized/skybox/sky_88_2k.png')
    ]);

    // Setup proper color spaces for textures
    grassColor.colorSpace = THREE.SRGBColorSpace;
    dirtColor.colorSpace = THREE.SRGBColorSpace;
    flowersColor.colorSpace = THREE.SRGBColorSpace;
    skyTex.colorSpace = THREE.SRGBColorSpace;

    // 2. Generate Signed Distance Field (SDF) from path mask
    const pathSdfTex = this.pathSdfGenerator.build(pathMask);

    // 3. Setup Sun Lighting & Sky Dome
    this._setupLighting(skyTex);

    // 4. Build Ground
    const groundTextures = {
      grassColor, grassNormal, grassRoughness,
      dirtColor, dirtNormal, dirtRoughness,
      dirtAO, dirtHeight, dirtMetallic,
      pathSdf: pathSdfTex,
      noiseMap
    };
    this.ground = new StylizedGround(groundTextures, {
      grassAO: this.config.grassAO,
      pathEdgeWidth: this.config.pathEdgeWidth,
      roadOffset: this.config.roadOffset
    });
    this.group.add(this.ground.mesh);

    // 5. Build Instanced Grass (5000 blades)
    const grassTextures = {
      groundColorMap: grassColor,
      noiseMap,
      pathSdf: pathSdfTex,
      dirtHeight
    };
    this.grass = new StylizedGrass(grassTextures, {
      density: this.config.density,
      scale: this.config.scale,
      heightVariation: this.config.heightVariation,
      windStrength: this.config.windStrength,
      windSpeed: this.config.windSpeed,
      windAngle: this.config.windAngle,
      gustScale: this.config.gustScale,
      turbulence: this.config.turbulence,
      flutter: this.config.flutter,
      grassAO: this.config.grassAO,
      pathEdgeWidth: this.config.pathEdgeWidth,
      roadOffset: this.config.roadOffset
    });
    console.log('[DIAG] Cargando Grass...');
    const grassMesh = await this.grass.load();
    this.group.add(grassMesh);
    console.log('[DIAG] Grass OK');

    // 6. Build Instanced Flowers (280 clusters)
    const flowerTextures = {
      colorMap: flowersColor,
      alphaMap: flowersAlpha,
      noiseMap,
      pathSdf: pathSdfTex,
      dirtHeight
    };
    this.flowers = new StylizedFlowers(flowerTextures, {
      density: this.config.flowerDensity,
      scale: this.config.flowerScale,
      windStrength: this.config.windStrength,
      windSpeed: this.config.windSpeed,
      windAngle: this.config.windAngle,
      gustScale: this.config.gustScale,
      turbulence: this.config.turbulence,
      flutter: this.config.flutter,
      grassAO: this.config.grassAO,
      pathEdgeWidth: this.config.pathEdgeWidth,
      roadOffset: this.config.roadOffset
    });
    console.log('[DIAG] Cargando Flowers...');
    const flowersMesh = await this.flowers.load();
    this.group.add(flowersMesh);
    console.log('[DIAG] Flowers OK');

    // 7. Build 4 Trees at Corners
    const treeTextures = { noiseMap };
    this.trees = new StylizedTrees(treeTextures, {
      windStrength: this.config.windStrength,
      windSpeed: this.config.windSpeed,
      windAngle: this.config.windAngle,
      gustScale: this.config.gustScale,
      turbulence: this.config.turbulence,
      flutter: this.config.flutter,
      treeSway: this.config.treeSway
    });
    console.log('[DIAG] Cargando Trees...');
    const treesGroup = await this.trees.load();
    this.group.add(treesGroup);
    console.log('[DIAG] Trees OK');

    // 8. Build Ground Foliage (lush leafy shoots around trees & in open meadow)
    this.groundFoliage = new StylizedGroundFoliage({
      windStrength: this.config.windStrength,
      windSpeed: this.config.windSpeed
    });
    console.log('[DIAG] Cargando GroundFoliage...');
    const foliageGroup = await this.groundFoliage.load();
    this.group.add(foliageGroup);
    console.log('[DIAG] GroundFoliage OK');

    // 9. Build Tree Vines (cascading ivy & hanging foliage on tree trunks)
    this.treeVines = new StylizedTreeVines({
      windStrength: this.config.windStrength,
      windSpeed: this.config.windSpeed
    });
    console.log('[DIAG] Cargando TreeVines...');
    const vinesGroup = await this.treeVines.load();
    this.group.add(vinesGroup);
    console.log('[DIAG] TreeVines OK');

    console.log('[StylizedEnvironment] Initialized successfully with grass, flowers, trees, ground foliage, tree vines and SDF ground!');
  }

  _setupLighting(skyTex) {
    // Soft atmospheric sky fog
    this.scene.fog = new THREE.Fog(0xcbe5ff, 50, 150);

    // Note: Static skyMesh retired in favor of dynamic procedural MagicalSkybox
    this.skyMesh = null;

    // Hemisphere Ambient Light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x4a5d3f, 1.2);
    hemiLight.position.set(0, 50, 0);
    this.group.add(hemiLight);

    // Directional Sun Light
    const sunPos = this.config.sunPosition;
    const sun = new THREE.DirectionalLight(new THREE.Color(this.config.sunColor), this.config.sunIntensity);
    sun.position.set(sunPos[0], sunPos[1], sunPos[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.bias = -0.0001;
    sun.shadow.normalBias = 0.04;
    this.sunLight = sun;
    this.group.add(sun);
  }

  update(delta) {
    // Slow sky rotation
    if (this.skyMesh) {
      this.skyMesh.rotation.y += delta * 0.01;
    }

    // Synchronized wind animation
    if (this.grass) this.grass.update(delta);
    if (this.flowers) this.flowers.update(delta);
    if (this.trees) this.trees.update(delta);
    if (this.groundFoliage) this.groundFoliage.update(delta);
    if (this.treeVines) this.treeVines.update(delta);
  }

  getPathDistance(worldX, worldZ) {
    return this.pathSdfGenerator.getDistanceAt(worldX, worldZ);
  }

  
  setZone(gx, gy, collisionsManager) {
    if (this.trees && this.trees.setZone) {
      this.trees.setZone(gx, gy, collisionsManager);
    }
    if (this.groundFoliage && this.groundFoliage.setZone) {
      this.groundFoliage.setZone(gx, gy);
    }
    if (this.treeVines && this.treeVines.setZone) {
      this.treeVines.setZone(gx, gy);
    }
  }
  setRiverActive(active) {
    if (this.ground && typeof this.ground.setRiverActive === 'function') {
      this.ground.setRiverActive(active);
    }
    if (this.grass && typeof this.grass.setRiverActive === 'function') {
      this.grass.setRiverActive(active);
    }
  }
  setPondActive(active, center = null, radii = null) {
    if (this.ground && typeof this.ground.setPondActive === 'function') {
      this.ground.setPondActive(active, center, radii);
    }
    if (this.grass && typeof this.grass.setPondActive === 'function') {
      this.grass.setPondActive(active, center, radii);
    }
    if (this.flowers && typeof this.flowers.setPondActive === 'function') {
      this.flowers.setPondActive(active, center, radii);
    }
  }
  setPond2Active(active, center = null, radii = null) {
    if (this.ground && typeof this.ground.setPond2Active === 'function') {
      this.ground.setPond2Active(active, center, radii);
    }
    if (this.grass && typeof this.grass.setPond2Active === 'function') {
      this.grass.setPond2Active(active, center, radii);
    }
    if (this.flowers && typeof this.flowers.setPond2Active === 'function') {
      this.flowers.setPond2Active(active, center, radii);
    }
  }
  setRoadActive(active) {
    if (this.ground && typeof this.ground.setRoadActive === 'function') {
      this.ground.setRoadActive(active);
    }
    if (this.grass && typeof this.grass.setRoadActive === 'function') {
      this.grass.setRoadActive(active);
    }
  }
}
