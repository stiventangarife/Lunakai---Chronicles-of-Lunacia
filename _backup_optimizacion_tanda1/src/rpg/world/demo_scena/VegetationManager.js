import * as THREE from 'three';
import { WaterManager } from './WaterManager.js';
import {
  MAX_ROCKS,
  makeBladeGeometry,
  makeBladeMaterial,
  makeFlowerMaterial,
  makeFlowerDepthMaterial,
  makeFlowerCrossGeometry
} from './StylizedBladeMaterial.js';
import { createClumpGeometry } from './grassGeometry.js';
import { createGrassV3Material, evaluateClusterCandidate, getSoilAndMeadowData, fbm2D } from './grassShader.js';
import { createHandPaintedGrassTexture } from './grassTexture.js';
import { createSeededRandom } from './MathUtils.js';

/**
 * Gestor de Vegetación y Césped Estilizado Anime (Genshin Impact & Stylized Field).
 * Renderiza decenas de miles de briznas mediante InstancedMesh con controles
 * dinámicos en tiempo real de altura, anchura, viento, color y densidad.
 * Soporta alternar entre el césped Genshin actual, Stylized Field y el nuevo Césped Estilizado V3.
 */
export class VegetationManager {
  constructor(scene, terrain, roadManager, assetManager) {
    this.scene = scene;
    this.terrain = terrain;
    this.roadManager = roadManager;
    this.assetManager = assetManager;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.time = 0;
    this.windEnabled = true;

    // Tipo de césped activo: 'stylized_v3' | 'stylized' | 'genshin'
    this.grassType = 'stylized_v3';

    // 1. Césped Genshin
    this.grassMesh = null;
    this.grassMaterial = null;

    // 2. Césped Stylized Field
    this.stylizedGrassGroup = null;
    this.stylizedGrassMesh = null; // Alias para compatibilidad
    this.stylizedChunks = [];
    this.stylizedGrassMaterial = null;
    this.stylizedUniforms = null;
    this.bladeGeoLOD0 = null;
    this.bladeGeoLOD1 = null;

    // 3. Césped Estilizado V3 (Cel-Shaded, BotW Hybrid Clump, Colonias y Spatial Grid Chunking)
    this.v3GrassGroup = null;
    this.v3GrassMesh = null;
    this.v3GrassChunks = [];
    this.v3ClumpGeo = null;
    this.v3GrassMaterial = null;
    this.v3GrassUniforms = null;
    this.v3GrassTexture = null;
    this.v3MaxInstances = 75000;
    this.v3GrassCount = 50000;
    this.v3SoilPatchCoverage = 0.84;
    this.v3SoilPatchScale = 0.1;
    this.v3MacroNoiseScale = 0.045;
    this._v3GeneratedCount = 0;
    this.lastV3PlayerPos = new THREE.Vector3(-9999, -9999, -9999);
    this.sunLight = null;
    this.sunPos = new THREE.Vector3();
    this.sunTarget = new THREE.Vector3();

    this.densityMode = 'high';
    this.maxGrassInstances = 55000;
    this.stylizedBladeCount = 60000;
    this.stylizedBladeCapacity = 80000;
    this.bladeOffsets = [];
    this.lastStylizedCenter = new THREE.Vector3(-9999, -9999, -9999);
    this.lastPlayerLODPos = new THREE.Vector3(-9999, -9999, -9999);

    this.flowersGroup = null;
    this.flowerItems = [];
    this.flowerScaleMultiplier = 2.50; // Escala de flores = 2.50x por defecto

    this.stylizedFlowersGroup = null;
    this.flowerMeshA = null;
    this.flowerMeshB = null;
    this.flowerItemsA = [];
    this.flowerItemsB = [];
    this.flowerOffsetsA = []; // Compatibilidad retroactiva
    this.flowerOffsetsB = [];
    this.stylizedFlowerBaseSize = 0.35;
    this.stylizedFlowerUniforms = null;

    if (this.grassType === 'genshin') {
      this.initGrass();
    }
    this.initAnimeFlowers();
    this.initGrassV3();
    if (this.grassType === 'stylized') {
      this.initStylizedGrass();
      this.initStylizedFlowers();
    }
  }

  initGrass() {
    let bladeGeo = null;
    const grassGltf = this.assetManager ? this.assetManager.getModel('grass_common_tall') : null;
    if (grassGltf && grassGltf.scene) {
      grassGltf.scene.traverse((child) => {
        if (child.isMesh && !bladeGeo) {
          bladeGeo = child.geometry.clone();
          bladeGeo.scale(1.1, 1.25, 1.1);
        }
      });
    }

    if (!bladeGeo) {
      bladeGeo = this.createGrassBladeGeometry();
    }

    const grassTex = this.assetManager ? this.assetManager.getTexture('grass_texture') : null;
    const windTex = this.assetManager ? this.assetManager.getTexture('wind_noise') : null;

    // Material estilizado con animación de viento global, toon lighting y brillo de crestas
    this.grassMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: true,
      uniforms: {
        ...THREE.UniformsLib.fog,
        uTime: { value: 0 },
        uWindStrength: { value: 0.42 },
        uWindSpeed: { value: 1.0 },
        uGrassHeight: { value: 0.40 }, // Altura césped = 0.40x por defecto
        uGrassWidth: { value: 1.0 },
        uGrassTex: { value: grassTex },
        uHasGrassTex: { value: grassTex ? 1.0 : 0.0 },
        uWindTex: { value: windTex },
        uHasWindTex: { value: windTex ? 1.0 : 0.0 },
        uBaseColor: { value: new THREE.Color(0x277a16) },   // Verde esmeralda profundo anime
        uTipColor: { value: new THREE.Color(0xb5fa3c) },    // Verde lima brillante Genshin
        uCrestIntensity: { value: 0.35 }
      },
      vertexShader: `
        #include <common>
        #include <fog_pars_vertex>
        uniform float uTime;
        uniform float uWindStrength;
        uniform float uWindSpeed;
        uniform float uGrassHeight;
        uniform float uGrassWidth;
        uniform sampler2D uWindTex;
        uniform float uHasWindTex;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vWindWave;

        void main() {
          vUv = uv;
          vec3 transformedPos = position;

          // Modificar altura y anchura en tiempo real
          transformedPos.x *= uGrassWidth;
          transformedPos.z *= uGrassWidth;
          transformedPos.y *= uGrassHeight;

          vec4 worldInstance = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vWorldPos = worldInstance.xyz;

          // Anclaje absoluto en la raíz (position.y <= 0) y oscilación suave hacia la punta
          float h = clamp(transformedPos.y / (1.5 * max(uGrassHeight, 0.2)), 0.0, 1.0);
          float heightFactor = h * h;

          float wTime = uTime * uWindSpeed;

          // 1. Onda de viento global guiada por mapa de ruido (Perlin wind waves)
          float windSample = 0.0;
          if (uHasWindTex > 0.5) {
            vec2 windUv = worldInstance.xz * 0.012 + vec2(wTime * 0.07, wTime * 0.04);
            windSample = texture2D(uWindTex, windUv).r * 2.0 - 1.0;
          } else {
            windSample = sin(wTime * 2.4 + worldInstance.x * 0.18 + worldInstance.z * 0.14) * 0.55;
          }

          // 2. Micro-brisa local oscilatoria
          float microBreeze = sin(wTime * 4.2 + worldInstance.x * 0.4 + worldInstance.z * 0.3) * 0.3;
          float totalWind = (windSample * 0.75 + microBreeze * 0.25) * uWindStrength * heightFactor;

          vWindWave = windSample;

          transformedPos.x += totalWind * 0.95;
          transformedPos.z += totalWind * 0.65;
          transformedPos.y -= abs(totalWind) * 0.22 * heightFactor;

          vNormal = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(transformedPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <common>
        #include <fog_pars_fragment>
        uniform sampler2D uGrassTex;
        uniform float uHasGrassTex;
        uniform vec3 uBaseColor;
        uniform vec3 uTipColor;
        uniform float uCrestIntensity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vWindWave;

        void main() {
          vec4 texColor = vec4(1.0);
          if (uHasGrassTex > 0.5) {
            texColor = texture2D(uGrassTex, vUv);
            if (texColor.a < 0.25) discard;
          }

          // Gradiente bicolor anime (raíz oscura / puntas luminosas)
          vec3 grad = mix(uBaseColor, uTipColor, clamp(vUv.y * 1.15, 0.0, 1.0));
          vec3 finalColor = grad * texColor.rgb;

          // Iluminación Toon escalonada suave (estilo Genshin Impact)
          vec3 sunDir = normalize(vec3(0.5, 0.8, 0.4));
          float NdotL = dot(vNormal, sunDir);
          float toonLight = smoothstep(0.0, 0.4, NdotL) * 0.32 + 0.68;
          finalColor *= toonLight;

          // Resplandor de cresta cuando la ráfaga de viento peina la hierba
          float crest = max(0.0, vWindWave) * vUv.y * uCrestIntensity;
          finalColor += vec3(0.18, 0.25, 0.08) * crest;

          gl_FragColor = vec4(finalColor, 1.0);
          #include <fog_fragment>
        }
      `
    });

    this.grassMesh = new THREE.InstancedMesh(bladeGeo, this.grassMaterial, this.maxGrassInstances);
    this.grassMesh.receiveShadow = true;
    this.grassMesh.frustumCulled = false;
    this.grassMesh.visible = (this.grassType === 'genshin');
    this.group.add(this.grassMesh);

    this.populateGrass();
  }

  initGrassV3() {
    if (this.v3GrassGroup) return;

    this.v3GrassGroup = new THREE.Group();
    this.v3GrassGroup.name = 'GrassV3_Group';
    this.v3GrassGroup.visible = (this.grassType === 'stylized_v3');
    this.group.add(this.v3GrassGroup);

    // Compatibilidad retroactiva total con referencias a v3GrassMesh
    this.v3GrassMesh = this.v3GrassGroup;
    Object.defineProperty(this.v3GrassGroup, 'count', {
      get: () => this.v3GrassCount,
      set: (val) => {
        this.v3GrassCount = val;
        this.updateV3ChunksActiveCount(val);
      },
      configurable: true
    });
    this.v3GrassGroup.instanceMatrix = { needsUpdate: false };
    this.v3GrassGroup.computeBoundingSphere = () => {};
    this.v3GrassGroup.computeBoundingBox = () => {};

    // 1. Geometría híbrida BotW (4 tarjetas base volumétricas + briznas aguja)
    this.v3ClumpGeo = createClumpGeometry({
      bladeWidth: 0.16,
      bladeHeight: 1.10,
      baseCardWidth: 0.28,
      baseCardHeight: 0.48,
      bladeTilt: 0.24,
      bladeTaper: 0.85,
      rootRadius: 0.05,
      segments: 4
    });

    Object.defineProperty(this.v3GrassGroup, 'geometry', {
      get: () => this.v3ClumpGeo,
      configurable: true
    });

    // 2. Textura Seamless Gouache procedural de suelo y Shaders estilo BotW
    if (!this.v3GrassTexture) {
      this.v3GrassTexture = createHandPaintedGrassTexture(null, 1024);
    }

    const { material, uniforms } = createGrassV3Material(null, this.v3GrassTexture, {
      baseColor: '#183b1d',
      midColor: '#48962c',
      tipColor: '#a2e742',
      sunGrassColor: '#5ea832',
      wetGrassColor: '#1a441e',
      dryGrassColor: '#788d38',
      soilHumusColor: '#382413',
      soilClayColor: '#7a522a',
      soilDryColor: '#c2a26c',
      windHighlightColor: '#e0f866',
      backlightColor: '#ebfa75',
      clearingColor: '#5a9e3e',
      dirtCenterColor: '#d1a872',
      dirtEdgeColor: '#9b7346',
      heightScale: 0.85,
      widthScale: 1.00,
      windStrength: 0.30
    });

    this.v3GrassMaterial = material;
    this.v3GrassUniforms = uniforms;

    // 3. Generar particionado espacial en chunks con Frustum Culling
    this.rebuildV3Colonies({ targetCount: this.v3GrassCount });

    console.log(`[VegetationManager] 🌱 Césped Estilizado V3 inicializado con particionado en chunks espaciales y Frustum Culling activo.`);
  }

  random() {
    if (!this.rng) this.rng = createSeededRandom(77005);
    return this.rng();
  }

  rebuildV3Colonies(options = {}) {
    this.rng = createSeededRandom(77005);
    const {
      clusterScale = 0.15,
      islandCoverage = 0.95,
      minClusterWeight = 0.28,
      roadsideBoostFactor = 0.25,
      targetCount = this.v3GrassCount || 50000
    } = options;

    if (!this.v3GrassGroup) return 0;

    // Limpiar chunks previos y liberar memoria GPU
    if (this.v3GrassChunks && this.v3GrassChunks.length > 0) {
      for (const chunk of this.v3GrassChunks) {
        if (chunk.mesh) {
          this.v3GrassGroup.remove(chunk.mesh);
          if (chunk.mesh.geometry) chunk.mesh.geometry.dispose();
        }
      }
    }
    this.v3GrassChunks = [];

    this.v3GrassCount = Math.min(this.v3MaxInstances, Math.max(100, Math.floor(targetCount)));
    const targetPool = Math.max(this.v3GrassCount, Math.min(this.v3MaxInstances, Math.round(this.v3GrassCount * 1.25)));

    // Cuadrícula espacial (8x8 celdas de ~33.5m que cubren [-134, 134])
    const GRID_SIZE = 8;
    const MIN_COORD = -134.0;
    const MAX_COORD = 134.0;
    const CELL_SIZE = (MAX_COORD - MIN_COORD) / GRID_SIZE;

    const chunkBuckets = new Map();
    const maxAttempts = Math.max(180000, targetPool * 4.5);
    let generatedCount = 0;

    for (let attempt = 0; attempt < maxAttempts && generatedCount < targetPool; attempt++) {
      // Cobertura orgánica de pradera sobre la isla (radio ~126m)
      const angle = this.random() * Math.PI * 2;
      const radius = Math.sqrt(this.random()) * 126.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Despeje del río y bahía costera
      const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(z);
      const distToRiver = Math.abs(x - riverCenterX);
      if (distToRiver < riverHalfWidth + 1.2) continue;

      // Despeje del Dojō Secreto (X: -87.9, Z: 74.0) - Evitar hierba dentro del edificio
      const distToDojoGrass = Math.hypot(x - (-87.9), z - 74.0);
      if (distToDojoGrass < 16.5) continue;

      // Nivel de agua y suelo
      const currentWaterY = WaterManager.getRiverWaterHeight(z);
      const groundY = this.terrain.getHeight(x, z);
      if (groundY < currentWaterY + 0.25) continue;

      // Inclinación del terreno (evitar acantilados rocosos)
      const normal = this.terrain.getNormal(x, z);
      if (normal.y < 0.72) continue;

      // Bioma MMO: caminos y parches de tierra expuesta
      const roadFactor = this.roadManager ? this.roadManager.getRoadFactor(x, z) : 0.0;
      const patchScale = this.v3SoilPatchScale !== undefined ? this.v3SoilPatchScale : 0.1;
      const patchCov = this.v3SoilPatchCoverage !== undefined ? this.v3SoilPatchCoverage : 0.84;
      const soilData = getSoilAndMeadowData(x, z, this.roadManager, patchScale, patchCov);
      if (!soilData.canSpawnGrass) continue;

      // Agrupación por islas/colonias: FBM noise + roadside boost
      const noiseVal = fbm2D(x * clusterScale, z * clusterScale);
      let roadsideBoost = 0.0;
      if (roadFactor > 0.02 && roadFactor < 0.38) {
        roadsideBoost = Math.sin(((roadFactor - 0.02) / 0.36) * Math.PI) * roadsideBoostFactor;
      }
      let weight = (noiseVal - (1.0 - islandCoverage)) / islandCoverage + roadsideBoost;
      if (roadFactor > 0.15) {
        weight *= Math.max(0.0, 1.0 - (roadFactor - 0.15) / 0.25);
      }
      weight = Math.max(0.0, Math.min(1.0, weight));

      // Filtro anti-solitarios y rechazo ponderado
      if (weight < minClusterWeight) continue;
      const normWeight = (weight - minClusterWeight) / (1.0 - minClusterWeight);
      if (this.random() > Math.pow(normWeight, 1.25)) continue;

      // Escalado progresivo en bordes (edgeTaper)
      const edgeTaper = 0.42 + 0.58 * Math.pow(normWeight, 0.55);
      const finalY = groundY + soilData.depressionOffset;

      const naturalVar = 0.88 + this.random() * 0.24;
      const scaleY = edgeTaper * naturalVar;
      const scaleXZ = (0.80 + 0.35 * normWeight) * naturalVar;

      const rotX = (this.random() - 0.5) * 0.12;
      const rotY = this.random() * Math.PI * 2;
      const rotZ = (this.random() - 0.5) * 0.12;

      // Asignar al bucket de cuadrícula espacial correspondiente
      const gx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((x - MIN_COORD) / CELL_SIZE)));
      const gz = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((z - MIN_COORD) / CELL_SIZE)));
      const key = `${gx}_${gz}`;

      let bucket = chunkBuckets.get(key);
      if (!bucket) {
        bucket = [];
        chunkBuckets.set(key, bucket);
      }

      bucket.push({
        x, y: finalY, z,
        rotX, rotY, rotZ,
        scaleXZ, scaleY,
        normX: normal.x, normY: normal.y, normZ: normal.z
      });

      generatedCount++;
    }

    this._v3GeneratedCount = generatedCount;

    // Crear un InstancedMesh por cada celda poblada con Frustum Culling automático
    const dummy = new THREE.Object3D();
    const pt = new THREE.Vector3();

    for (const [key, items] of chunkBuckets.entries()) {
      if (!items.length) continue;

      const chunkGeo = this.v3ClumpGeo.clone();
      const terrainNormals = new Float32Array(items.length * 3);
      const chunkMesh = new THREE.InstancedMesh(chunkGeo, this.v3GrassMaterial, items.length);
      chunkMesh.name = `GrassV3_Chunk_${key}`;
      chunkMesh.receiveShadow = true;
      chunkMesh.castShadow = false;
      chunkMesh.frustumCulled = true;

      const box = new THREE.Box3();

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
        dummy.scale.set(it.scaleXZ, it.scaleY, it.scaleXZ);
        dummy.updateMatrix();
        chunkMesh.setMatrixAt(i, dummy.matrix);

        terrainNormals[i * 3] = it.normX;
        terrainNormals[i * 3 + 1] = it.normY;
        terrainNormals[i * 3 + 2] = it.normZ;

        pt.set(it.x, it.y, it.z);
        box.expandByPoint(pt);
      }

      // Márgenes para altura de las briznas BotW (~1.5m) y curvatura al viento
      box.min.x -= 0.8;
      box.min.z -= 0.8;
      box.max.x += 0.8;
      box.max.z += 0.8;
      box.max.y += 2.2;

      chunkGeo.setAttribute('aTerrainNormal', new THREE.InstancedBufferAttribute(terrainNormals, 3));
      chunkMesh.instanceMatrix.needsUpdate = true;

      // Bounding Box y Bounding Sphere exactos para Three.js Frustum Culling
      chunkGeo.boundingBox = box;
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      chunkGeo.boundingSphere = sphere;

      this.v3GrassGroup.add(chunkMesh);

      this.v3GrassChunks.push({
        key,
        mesh: chunkMesh,
        totalCount: items.length,
        box,
        sphere
      });
    }

    // Ajustar conteo activo según targetCount
    this.updateV3ChunksActiveCount(this.v3GrassCount);

    console.log(`[VegetationManager] 🌿 Chunks V3 construidos: ${this.v3GrassChunks.length} celdas espaciales activas con frustum culling (~${this.v3GrassCount} matas en campo).`);
    return this.v3GrassCount;
  }

  updateV3ChunksActiveCount(targetCount) {
    if (!this.v3GrassChunks || !this.v3GrassChunks.length) return 0;
    const totalGen = this._v3GeneratedCount || 1;
    const ratio = Math.min(1.0, Math.max(0.01, targetCount / totalGen));
    let totalActive = 0;

    for (const chunk of this.v3GrassChunks) {
      if (chunk.mesh) {
        const count = Math.max(0, Math.min(chunk.totalCount, Math.round(chunk.totalCount * ratio)));
        chunk.mesh.count = count;
        chunk.mesh.visible = count > 0;
        chunk.mesh.instanceMatrix.needsUpdate = true;
        totalActive += count;
      }
    }
    return totalActive;
  }

  setV3Params(params = {}) {
    if (params.count !== undefined) {
      const targetCount = Math.min(this.v3MaxInstances, Math.max(100, Math.floor(params.count)));
      this.v3GrassCount = targetCount;
      if (targetCount > (this._v3GeneratedCount || 0)) {
        this.rebuildV3Colonies({ targetCount });
      } else {
        this.updateV3ChunksActiveCount(targetCount);
      }
    }
    if (params.height !== undefined && this.v3GrassUniforms) {
      this.v3GrassUniforms.uHeightScale.value = params.height;
    }
    if ((params.width !== undefined || params.widthScale !== undefined) && this.v3GrassUniforms && this.v3GrassUniforms.uWidthScale) {
      this.v3GrassUniforms.uWidthScale.value = (params.width !== undefined ? params.width : params.widthScale);
    }
    if (params.windStrength !== undefined && this.v3GrassUniforms) {
      this.v3GrassUniforms.uWindStrength.value = params.windStrength;
    }
    if (params.windSpeed !== undefined && this.v3GrassUniforms) {
      this.v3GrassUniforms.uWindSpeed.value = params.windSpeed;
      if (this.terrain && this.terrain.setV3GroundParam) {
        this.terrain.setV3GroundParam('uV3WindSpeed', params.windSpeed);
      }
    }
    if (params.windScale !== undefined && this.v3GrassUniforms) {
      this.v3GrassUniforms.uWindScale.value = params.windScale;
      if (this.terrain && this.terrain.setV3GroundParam) {
        this.terrain.setV3GroundParam('uV3WindScale', params.windScale);
      }
    }
    if (params.celSteps !== undefined && this.v3GrassUniforms) {
      this.v3GrassUniforms.uCelSteps.value = params.celSteps;
    }
    if (params.normalUpBlend !== undefined && this.v3GrassUniforms) {
      this.v3GrassUniforms.uNormalUpBlend.value = params.normalUpBlend;
    }
    if (params.gradientCurve !== undefined && this.v3GrassUniforms) {
      this.v3GrassUniforms.uGradientCurve.value = params.gradientCurve;
    }
    if (params.backlightStrength !== undefined && this.v3GrassUniforms && this.v3GrassUniforms.uBacklightStrength) {
      this.v3GrassUniforms.uBacklightStrength.value = params.backlightStrength;
    }
    if (params.halfLambertBias !== undefined && this.v3GrassUniforms && this.v3GrassUniforms.uHalfLambertBias) {
      this.v3GrassUniforms.uHalfLambertBias.value = params.halfLambertBias;
    }
    if (params.groundTexScale !== undefined && this.terrain) {
      if (this.terrain.setV3GroundParam) {
        this.terrain.setV3GroundParam('uGroundTexScale', params.groundTexScale);
      }
    }
    if (params.soilPatchCoverage !== undefined) {
      this.v3SoilPatchCoverage = params.soilPatchCoverage;
      if (this.terrain && this.terrain.setV3GroundParam) {
        this.terrain.setV3GroundParam('uV3SoilPatchCoverage', params.soilPatchCoverage);
      }
    }
    if (params.soilPatchScale !== undefined) {
      this.v3SoilPatchScale = params.soilPatchScale;
      if (this.terrain && this.terrain.setV3GroundParam) {
        this.terrain.setV3GroundParam('uV3SoilPatchScale', params.soilPatchScale);
      }
    }
    if (params.macroNoiseScale !== undefined) {
      this.v3MacroNoiseScale = params.macroNoiseScale;
      if (this.terrain && this.terrain.setV3GroundParam) {
        this.terrain.setV3GroundParam('uV3MacroNoiseScale', params.macroNoiseScale);
      }
    }

    if (params.soilTexScale !== undefined && this.terrain) {
      if (this.terrain.setV3GroundParam) {
        this.terrain.setV3GroundParam('uSoilTexScale', params.soilTexScale);
      }
    }

    if (params.trampleStrength !== undefined && this.v3GrassUniforms && this.v3GrassUniforms.uTrampleStrength) {
      this.v3GrassUniforms.uTrampleStrength.value = params.trampleStrength;
    }
    if (params.playerRadius !== undefined && this.v3GrassUniforms && this.v3GrassUniforms.uPlayerRadius) {
      this.v3GrassUniforms.uPlayerRadius.value = params.playerRadius;
    }
    if (params.companionRadius !== undefined && this.v3GrassUniforms && this.v3GrassUniforms.uCompanionRadius) {
      this.v3GrassUniforms.uCompanionRadius.value = params.companionRadius;
    }

    // Colores sincronizados entre Césped 3D y Terreno Gouache
    const colorProps = [
      { key: 'baseColor', uGrass: 'uBaseColor', uTerrain: 'uV3BaseColor' },
      { key: 'midColor', uGrass: 'uMidColor', uTerrain: 'uV3MidColor' },
      { key: 'tipColor', uGrass: 'uTipColor', uTerrain: 'uV3TipColor' },
      { key: 'sunGrassColor', uGrass: 'uSunGrassColor', uTerrain: 'uV3SunGrassColor' },
      { key: 'wetGrassColor', uGrass: 'uWetGrassColor', uTerrain: 'uV3WetGrassColor' },
      { key: 'dryGrassColor', uGrass: 'uDryGrassColor', uTerrain: 'uV3DryGrassColor' },
      { key: 'mossColor', uGrass: 'uMossColor', uTerrain: 'uV3MossColor' },
      { key: 'soilHumusColor', uGrass: 'uSoilHumusColor', uTerrain: 'uV3SoilHumusColor' },
      { key: 'soilClayColor', uGrass: 'uSoilClayColor', uTerrain: 'uV3SoilClayColor' },
      { key: 'soilDryColor', uGrass: 'uSoilDryColor', uTerrain: 'uV3SoilDryColor' },
      { key: 'windHighlightColor', uGrass: 'uWindHighlightColor', uTerrain: 'uV3WindHighlightColor' },
      { key: 'backlightColor', uGrass: 'uBacklightColor', uTerrain: 'uV3WindHighlightColor' },
      { key: 'clearingColor', uGrass: 'uClearingGrassColor', uTerrain: 'uV3ClearingGrassColor' },
      { key: 'dirtCenterColor', uGrass: 'uDirtCenterColor', uTerrain: 'uV3DirtCenterColor' },
      { key: 'dirtEdgeColor', uGrass: 'uDirtEdgeColor', uTerrain: 'uV3DirtEdgeColor' },
    ];
    for (const cp of colorProps) {
      if (params[cp.key] !== undefined) {
        if (this.v3GrassUniforms && this.v3GrassUniforms[cp.uGrass]) {
          this.v3GrassUniforms[cp.uGrass].value.set(params[cp.key]);
        }
        if (this.terrain && this.terrain.setV3GroundParam) {
          this.terrain.setV3GroundParam(cp.uTerrain, params[cp.key]);
        }
      }
    }
  }

  applyV3Preset(name) {
    const presets = {
      botw: {
        baseColor: '#183b1d',
        midColor: '#48962c',
        tipColor: '#a2e742',
        sunGrassColor: '#5ea832',
        wetGrassColor: '#1a441e',
        dryGrassColor: '#788d38',
        mossColor: '#557329',
        soilHumusColor: '#382413',
        soilClayColor: '#7a522a',
        soilDryColor: '#c2a26c',
        windHighlightColor: '#e0f866',
        clearingColor: '#5a9e3e',
        dirtCenterColor: '#d1a872',
        dirtEdgeColor: '#9b7346'
      },
      mondstadt: {
        baseColor: '#234f27',
        midColor: '#478c38',
        tipColor: '#9be04d',
        sunGrassColor: '#6bb834',
        wetGrassColor: '#1f4222',
        dryGrassColor: '#7a9642',
        mossColor: '#5a782e',
        soilHumusColor: '#3a2717',
        soilClayColor: '#7f5933',
        soilDryColor: '#cbb07a',
        windHighlightColor: '#ccf975',
        clearingColor: '#5a9e3e',
        dirtCenterColor: '#d1a872',
        dirtEdgeColor: '#9b7346'
      },
      autumn: {
        baseColor: '#3d2b0e',
        midColor: '#8a681c',
        tipColor: '#d9a72b',
        sunGrassColor: '#e0b83b',
        wetGrassColor: '#422c10',
        dryGrassColor: '#b08a32',
        mossColor: '#725a20',
        soilHumusColor: '#3d2512',
        soilClayColor: '#8c5828',
        soilDryColor: '#d4ab75',
        windHighlightColor: '#ffd868',
        clearingColor: '#966d21',
        dirtCenterColor: '#80562e',
        dirtEdgeColor: '#573719'
      },
      sakura: {
        baseColor: '#2b3324',
        midColor: '#4f7a55',
        tipColor: '#f2a0b8',
        sunGrassColor: '#f7bed0',
        wetGrassColor: '#2b3a2f',
        dryGrassColor: '#a89478',
        mossColor: '#4f6640',
        soilHumusColor: '#352424',
        soilClayColor: '#8a625b',
        soilDryColor: '#d6bcb5',
        windHighlightColor: '#ffe0eb',
        clearingColor: '#688e60',
        dirtCenterColor: '#d6b89c',
        dirtEdgeColor: '#99735a'
      },
      mystic: {
        baseColor: '#102e3b',
        midColor: '#257482',
        tipColor: '#5ce1e6',
        sunGrassColor: '#4bf4d8',
        wetGrassColor: '#0f2930',
        dryGrassColor: '#488c94',
        mossColor: '#2b5c5e',
        soilHumusColor: '#1a1d2e',
        soilClayColor: '#394668',
        soilDryColor: '#7f93b8',
        windHighlightColor: '#b4f8ff',
        clearingColor: '#2f8796',
        dirtCenterColor: '#756891',
        dirtEdgeColor: '#443c5e'
      },
      savannah: {
        baseColor: '#303014',
        midColor: '#7a7a2e',
        tipColor: '#c7bd48',
        sunGrassColor: '#e0c058',
        wetGrassColor: '#40381e',
        dryGrassColor: '#b59c47',
        mossColor: '#70682b',
        soilHumusColor: '#422e17',
        soilClayColor: '#966e3a',
        soilDryColor: '#d9be85',
        windHighlightColor: '#f2ea7e',
        clearingColor: '#858032',
        dirtCenterColor: '#bf995e',
        dirtEdgeColor: '#8c6b38'
      }
    };
    const p = presets[name];
    if (p) {
      this.setV3Params(p);
    }
  }

  initStylizedGrass() {
    // Geometrías para niveles de LOD:
    // LOD 0: 3 segmentos (7 vértices por brizna) con curvatura suave
    // LOD 1 y LOD 2: 1 segmento (3 vértices = un solo triángulo por brizna)
    this.bladeGeoLOD0 = makeBladeGeometry(3);
    this.bladeGeoLOD1 = makeBladeGeometry(1);

    this.stylizedGrassGroup = new THREE.Group();
    this.stylizedGrassGroup.visible = (this.grassType === 'stylized');
    this.group.add(this.stylizedGrassGroup);
    this.stylizedGrassMesh = this.stylizedGrassGroup;

    this.stylizedUniforms = {
      uTime: { value: 0 },
      uWindStrength: { value: 0.12 },
      uWindSpeed: { value: 1.3 },
      uWindFreq: { value: 0.45 },
      uWindTurb: { value: 0.05 },
      uWindLean: { value: 0.06 },
      uWindDir: { value: new THREE.Vector2(Math.cos(243 * Math.PI / 180), Math.sin(243 * Math.PI / 180)) },

      // Paleta estilizada anime inspirada en las referencias (Genshin / Spring Lush)
      uGrassBottom: { value: new THREE.Color("#3d7216") },
      uGrassTop: { value: new THREE.Color("#7bb822") },
      uBrightness: { value: 0.85 },
      uGradStart: { value: 0.15 },
      uGradEnd: { value: 1.0 },
      uGradPower: { value: 1.6 },

      uPatchLush: { value: new THREE.Color("#4fa01e") },
      uPatchDry: { value: new THREE.Color("#98ca2e") }, // Parches verdosos luminosos
      uPatchStrength: { value: 0.36 }, // Fuerza de parches visible pero suave y armónica
      uPatchScale: { value: 0.09 },
      uPatchBias: { value: 1.5 },

      uShadowStrength: { value: 0.60 },
      uShadowSamples: { value: 4 },
      uShadowSampleY: { value: 0.40 },
      uShadowRadius: { value: 0.30 },

      uDirtColor: { value: new THREE.Color("#baa179") },
      uDirtScale: { value: 0.40 },
      uDirtCoverage: { value: 0.16 },
      uDirtSoftness: { value: 0.06 },
      uDirtWarp: { value: 0.20 },
      uDirtCut: { value: 1.0 },
      uDirtBlend: { value: 0.80 },

      uRocks: { value: Array.from({ length: MAX_ROCKS }, () => new THREE.Vector4()) },
      uRockCount: { value: 0 },
      uRockRadiusMul: { value: 1.0 },
      uRockFalloff: { value: 0.35 },
      uRockFlatten: { value: 0.20 },
      uRockBend: { value: 0.80 },

      // Ángulo de sol idéntico al proyecto original para transluminiscencia dorada
      uSunDir: { value: new THREE.Vector3(-55.0, 21.5, -11.5).normalize() },
      uSunColor: { value: new THREE.Color(1, 1, 1).multiplyScalar(3.0) },
      uTransColor: { value: new THREE.Color("#c1e54d") },
      uTransStrength: { value: 2.5 },
      uTransPower: { value: 3.0 },
      uTransTip: { value: 0.6 },
      uTransShadow: { value: 1.0 },

      uDebugChannel: { value: 0 },
      uWindFixLocal: { value: 1 },

      uBladeWidthScale: { value: 0.110 / 0.06 },
      uBladeLengthScale: { value: 0.50 / 0.22 }
    };

    this.stylizedGrassMaterial = makeBladeMaterial(this.stylizedUniforms);
    this.stylizedGrassMaterial.transparent = false;
    this.stylizedGrassMaterial.depthWrite = true;

    // Inicializar la grilla de chunks cubriendo todo el mapa con niveles de LOD
    this.initStylizedChunks();

    // Actualizar visibilidad inicial de LOD
    this.updateStylizedChunksLOD(0, 0);
  }

  initStylizedChunks() {
    this.rng = createSeededRandom(77001);
    this.stylizedChunks = [];
    const chunkSize = 34.0;
    const maxPointsPerChunk = 750;
    const dummy = new THREE.Object3D();

    const minW = 0.055;
    const maxW = 0.065;
    const minL = 0.16;
    const maxL = 0.26;
    const tiltMax = 0.16;

    for (let gx = -136; gx <= 136; gx += chunkSize) {
      for (let gz = -136; gz <= 136; gz += chunkSize) {
        const centerDist = Math.hypot(gx, gz);
        if (centerDist > 165.0) continue;

        const pts = [];
        const attempts = maxPointsPerChunk * 2.2;

        for (let i = 0; i < attempts && pts.length < maxPointsPerChunk; i++) {
          const x = gx + (this.random() - 0.5) * chunkSize;
          const z = gz + (this.random() - 0.5) * chunkSize;

          const distOrigin = Math.hypot(x, z);
          if (distOrigin > 156.0) continue;

          // 1. Despeje del río y bahía costera
          const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(z);
          const distToRiver = Math.abs(x - riverCenterX);
          if (distToRiver < riverHalfWidth * 0.95) continue;

          // 2. Nivel de agua y mar
          const currentWaterY = WaterManager.getRiverWaterHeight(z);
          const y = this.terrain.getHeight(x, z);
          if (y < currentWaterY + 0.20) continue;

          // 3. Senderos / caminos: desgaste natural imperfecto (media_1791657797649.png)
          let bladeScaleFactor = 1.0;
          const roadFactor = this.roadManager ? this.roadManager.getRoadFactor(x, z) : 0;
          if (roadFactor > 0.85) continue; // Pleno centro pisoteado sin briznas
          if (roadFactor > 0.18) {
            // Probabilidad orgánica decreciente en la zona de desgaste
            const surviveProb = Math.pow(1.0 - roadFactor, 2.0);
            if (this.random() > surviveProb) continue;
            // Briznas más cortas en los márgenes y huellas del sendero
            bladeScaleFactor = THREE.MathUtils.lerp(0.9, 0.45, roadFactor);
          }

          // 4. Pendiente / rocas
          const norm = this.terrain.getNormal(x, z);
          if (norm.y < 0.65) continue;

          const rx = (this.random() - 0.5) * 2 * tiltMax;
          const ry = this.random() * Math.PI * 2;
          const rz = (this.random() - 0.5) * tiltMax * 0.5;
          const sx = (minW + this.random() * (maxW - minW)) * bladeScaleFactor;
          const sy = (minL + this.random() * (maxL - minL)) * bladeScaleFactor;

          pts.push({ x, y, z, rx, ry, rz, sx, sy });
        }

        if (pts.length < 20) continue;

        const meshLOD0 = new THREE.InstancedMesh(this.bladeGeoLOD0, this.stylizedGrassMaterial, pts.length);
        const meshLOD1 = new THREE.InstancedMesh(this.bladeGeoLOD1, this.stylizedGrassMaterial, pts.length);
        const countLOD2 = Math.ceil(pts.length * 0.5);
        const meshLOD2 = new THREE.InstancedMesh(this.bladeGeoLOD1, this.stylizedGrassMaterial, countLOD2);

        meshLOD0.castShadow = false;
        meshLOD0.receiveShadow = true;
        meshLOD0.frustumCulled = false;

        meshLOD1.castShadow = false;
        meshLOD1.receiveShadow = true;
        meshLOD1.frustumCulled = false;

        meshLOD2.castShadow = false;
        meshLOD2.receiveShadow = true;
        meshLOD2.frustumCulled = false;

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(p.rx, p.ry, p.rz);
          dummy.scale.set(p.sx, p.sy, 1.0);
          dummy.updateMatrix();
          meshLOD0.setMatrixAt(i, dummy.matrix);
          meshLOD1.setMatrixAt(i, dummy.matrix);
        }
        meshLOD0.instanceMatrix.needsUpdate = true;
        meshLOD1.instanceMatrix.needsUpdate = true;

        let i2 = 0;
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(p.rx, p.ry, p.rz);
          dummy.scale.set(p.sx * 1.35, p.sy * 1.15, 1.0);
          dummy.updateMatrix();
          meshLOD2.setMatrixAt(i2, dummy.matrix);
          i2++;
        }
        meshLOD2.count = i2;
        meshLOD2.instanceMatrix.needsUpdate = true;

        this.stylizedGrassGroup.add(meshLOD0);
        this.stylizedGrassGroup.add(meshLOD1);
        this.stylizedGrassGroup.add(meshLOD2);

        this.stylizedChunks.push({
          cx: gx,
          cz: gz,
          capacity: pts.length,
          totalPoints: pts.length,
          totalPointsLOD2: i2,
          meshLOD0,
          meshLOD1,
          meshLOD2,
          pts
        });
      }
    }

    // Mantener los puntos balanceados sin forzar sobre-asignación masiva
  }

  updateStylizedChunksLOD(px, pz) {
    if (!this.stylizedChunks || !this.stylizedChunks.length) return;
    for (let i = 0; i < this.stylizedChunks.length; i++) {
      const c = this.stylizedChunks[i];
      const dist = Math.hypot(c.cx - px, c.cz - pz);
      if (dist < 34.0) {
        // LOD 0: Primer plano (7 vértices, alta curvatura y detalle)
        c.meshLOD0.visible = true;
        c.meshLOD1.visible = false;
        c.meshLOD2.visible = false;
      } else if (dist < 75.0) {
        // LOD 1: Media distancia (3 vértices, 57% menos polígonos)
        c.meshLOD0.visible = false;
        c.meshLOD1.visible = true;
        c.meshLOD2.visible = false;
      } else if (dist < 165.0) {
        // LOD 2: Fondo y colinas lejanas (3 vértices, densidad al 50% con escala optimizada)
        c.meshLOD0.visible = false;
        c.meshLOD1.visible = false;
        c.meshLOD2.visible = true;
      } else {
        // Culling más allá del horizonte jugable
        c.meshLOD0.visible = false;
        c.meshLOD1.visible = false;
        c.meshLOD2.visible = false;
      }
    }
  }

  updateStylizedFieldPosition(cx, cz) {
    this.updateStylizedChunksLOD(cx, cz);
    this.updateStylizedFlowersPosition(cx, cz);
  }

  initStylizedFlowers() {
    this.stylizedFlowersGroup = new THREE.Group();
    this.stylizedFlowersGroup.visible = (this.grassType === 'stylized');
    this.group.add(this.stylizedFlowersGroup);

    // Geometría en cruz con soporte nativo de LOD por vértice
    const geo = makeFlowerCrossGeometry();

    // Uniforms de flores compartidos con la paleta de stylized-components
    this.stylizedFlowerUniforms = {
      uColorR: { value: new THREE.Color("#b084c7") },
      uColorG: { value: new THREE.Color("#cbb36a") },
      uColorB: { value: new THREE.Color("#9287ff") },
      uColorStem: { value: new THREE.Color("#648029") },
      uGrassColor: { value: new THREE.Color("#4f7c13") },
      uBrightness: { value: 1.0 },
      uTime: { value: 0 },
      uWindStrength: { value: 0.15 },
      uWindSpeed: { value: 0.8 },
      uWindFreq: { value: 0.3 },
      uWindTurb: { value: 0.2 },
      uWindLean: { value: 0.25 },
      uWindDir: { value: new THREE.Vector2(Math.cos(243 * Math.PI / 180), Math.sin(243 * Math.PI / 180)) },
      uBendAmp: { value: 0.12 },
      uBendFreq: { value: 3.0 },
      uFlDirtMax: { value: 0.20 },
      uDirtColor: this.stylizedUniforms.uDirtColor,
      uDirtScale: this.stylizedUniforms.uDirtScale,
      uDirtCoverage: this.stylizedUniforms.uDirtCoverage,
      uDirtSoftness: this.stylizedUniforms.uDirtSoftness,
      uDirtWarp: this.stylizedUniforms.uDirtWarp
    };

    const texA = {
      uFlowerMask: { value: this.assetManager ? this.assetManager.getTexture('flowerA_mask') : null },
      uFlowerRGB: { value: this.assetManager ? this.assetManager.getTexture('flowerA_rgb') : null },
      uFlowerGradient: { value: this.assetManager ? this.assetManager.getTexture('flowerA_grad') : null }
    };

    const texB = {
      uFlowerMask: { value: this.assetManager ? this.assetManager.getTexture('flowerB_mask') : null },
      uFlowerRGB: { value: this.assetManager ? this.assetManager.getTexture('flowerB_rgb') : null },
      uFlowerGradient: { value: this.assetManager ? this.assetManager.getTexture('flowerB_grad') : null }
    };

    const uniformsA = Object.assign({}, texA, this.stylizedFlowerUniforms);
    const uniformsB = Object.assign({}, texB, this.stylizedFlowerUniforms);

    // Cantidad moderada y elegante repartida por todo el mapa (220 de cada flor)
    const countA = 220;
    const countB = 220;

    this.flowerMeshA = new THREE.InstancedMesh(geo, makeFlowerMaterial(uniformsA), countA);
    this.flowerMeshA.customDepthMaterial = makeFlowerDepthMaterial(uniformsA);
    this.flowerMeshA.castShadow = true;
    this.flowerMeshA.receiveShadow = true;
    this.flowerMeshA.frustumCulled = false;

    this.flowerMeshB = new THREE.InstancedMesh(geo, makeFlowerMaterial(uniformsB), countB);
    this.flowerMeshB.customDepthMaterial = makeFlowerDepthMaterial(uniformsB);
    this.flowerMeshB.castShadow = true;
    this.flowerMeshB.receiveShadow = true;
    this.flowerMeshB.frustumCulled = false;

    this.stylizedFlowersGroup.add(this.flowerMeshA);
    this.stylizedFlowersGroup.add(this.flowerMeshB);

    this.flowerItemsA = [];
    this.flowerItemsB = [];

    // Sembrar flores de forma estática en todo el mapa
    this.populateStylizedFlowers(countA, countB);
  }

  populateStylizedFlowers(countA, countB) {
    this.rng = createSeededRandom(77002);
    const dummy = new THREE.Object3D();
    const radius = 145.0;

    const generatePoints = (targetCount, targetArray, mesh) => {
      let placed = 0;
      const attempts = targetCount * 6;

      for (let i = 0; i < attempts && placed < targetCount; i++) {
        const ang = this.random() * Math.PI * 2;
        const r = Math.sqrt(this.random()) * radius;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;

        // 1. Río y bahía costera
        const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(z);
        const distToRiver = Math.abs(x - riverCenterX);
        if (distToRiver < riverHalfWidth * 0.95) continue;

        // 2. Agua y mar
        const currentWaterY = WaterManager.getRiverWaterHeight(z);
        const y = this.terrain.getHeight(x, z);
        if (y < currentWaterY + 0.35) continue;

        // 3. Senderos
        const roadFactor = this.roadManager ? this.roadManager.getRoadFactor(x, z) : 0;
        if (roadFactor > 0.18) continue;

        // 4. Pendiente suave
        const norm = this.terrain.getNormal(x, z);
        if (norm.y < 0.75) continue;

        const ry = this.random() * Math.PI * 2;
        const s = this.stylizedFlowerBaseSize * (0.85 + this.random() * 0.35);

        dummy.position.set(x, y - 0.02, z);
        dummy.rotation.set(0, ry, 0);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();

        mesh.setMatrixAt(placed, dummy.matrix);

        targetArray.push({
          x, y: y - 0.02, z,
          ry,
          baseScale: s
        });

        placed++;
      }

      mesh.count = placed;
      mesh.instanceMatrix.needsUpdate = true;
    };

    generatePoints(countA, this.flowerItemsA, this.flowerMeshA);
    generatePoints(countB, this.flowerItemsB, this.flowerMeshB);
  }

  setStylizedFlowerSize(val) {
    if (!this.flowerItemsA || !this.flowerItemsB) return;
    const dummy = new THREE.Object3D();
    const multiplier = val / 0.30;

    for (let i = 0; i < this.flowerItemsA.length; i++) {
      const it = this.flowerItemsA[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.ry, 0);
      dummy.scale.setScalar(it.baseScale * multiplier);
      dummy.updateMatrix();
      this.flowerMeshA.setMatrixAt(i, dummy.matrix);
    }
    this.flowerMeshA.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.flowerItemsB.length; i++) {
      const it = this.flowerItemsB[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.ry, 0);
      dummy.scale.setScalar(it.baseScale * multiplier);
      dummy.updateMatrix();
      this.flowerMeshB.setMatrixAt(i, dummy.matrix);
    }
    this.flowerMeshB.instanceMatrix.needsUpdate = true;
  }

  updateStylizedFlowersPosition(cx, cz) {
    // Las flores permanecen fijas en todo el mapa; su LOD y culling se procesa en GPU
  }

  initAnimeFlowers() {
    this.rng = createSeededRandom(77003);
    this.flowersGroup = new THREE.Group();
    this.flowersGroup.visible = (this.grassType === 'genshin');
    this.group.add(this.flowersGroup);

    const flowerKeys = ['flower_group_3', 'flower_group_4'];
    const targetCount = 150; // Cantidad moderada y elegante para no saturar el paisaje
    let placed = 0;
    const radius = 135;

    const pendingAnimeFlowers = [];

    for (let i = 0; i < targetCount * 3 && placed < targetCount; i++) {
      const ang = this.random() * Math.PI * 2;
      const r = Math.sqrt(this.random()) * radius;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;

      // Descartar dentro del lecho del río o sumergido bajo el agua
      const riverCenterX = 18 + Math.sin(z * 0.025) * 16 + Math.cos(z * 0.012) * 8;
      const riverHalfWidth = 10.0 + Math.sin(z * 0.04) * 3.0 + 3.0;
      const distToRiver = Math.abs(x - riverCenterX);
      if (distToRiver < riverHalfWidth * 0.95) continue; // Fuera del río

      const currentWaterY = z <= 16 ? 2.0 : (z >= 34 ? 0.45 : 2.0 - ((z - 16) / 18) * 1.55);
      const y = this.terrain.getHeight(x, z);
      if (y < currentWaterY + 0.35) continue; // Nunca bajo el agua

      const roadFactor = this.roadManager ? this.roadManager.getRoadFactor(x, z) : 0;
      if (roadFactor > 0.12) continue; // Fuera del camino

      // Despeje del Dojō Secreto (X: -87.9, Z: 74.0) - Evitar flores dentro del edificio
      if (Math.hypot(x - (-87.9), z - 74.0) < 17.0) continue;

      const norm = this.terrain.getNormal(x, z);
      if (norm.y < 0.78) continue; // Pendientes suaves

      const key = flowerKeys[Math.floor(this.random() * flowerKeys.length)];
      const s = 0.28 + this.random() * 0.14;
      const baseScale = new THREE.Vector3(s, s * (0.95 + this.random() * 0.1), s);

      const rot = new THREE.Euler(
        (this.random() - 0.5) * 0.08,
        this.random() * Math.PI * 2,
        (this.random() - 0.5) * 0.08
      );

      pendingAnimeFlowers.push({
        key,
        pos: new THREE.Vector3(x, y - 0.04, z),
        rot,
        baseScale
      });
      placed++;
    }

    // Instanciar en GPU mediante THREE.InstancedMesh
    this.instancedAnimeFlowerEntries = [];
    const grouped = new Map();
    for (const item of pendingAnimeFlowers) {
      if (!grouped.has(item.key)) grouped.set(item.key, []);
      grouped.get(item.key).push(item);
    }

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();

    grouped.forEach((instances, key) => {
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

        const mats = Array.isArray(mat) ? mat : [mat];
        mats.forEach((m) => {
          m.side = THREE.DoubleSide;
        });

        const instMesh = new THREE.InstancedMesh(mesh.geometry, mat, count);
        instMesh.name = `InstancedAnimeFlower_${key}_${mesh.name || 'sub'}`;
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;

        for (let i = 0; i < count; i++) {
          const item = instances[i];
          quaternion.setFromEuler(item.rot);
          const scaled = item.baseScale.clone().multiplyScalar(this.flowerScaleMultiplier);
          matrix.compose(item.pos, quaternion, scaled);
          instMesh.setMatrixAt(i, matrix);
        }

        instMesh.instanceMatrix.needsUpdate = true;
        instMesh.computeBoundingSphere();
        instMesh.computeBoundingBox();

        this.flowersGroup.add(instMesh);
        this.instancedAnimeFlowerEntries.push({ instMesh, instances });
      });
    });

    console.log(`[VegetationManager] 🌸 ${pendingAnimeFlowers.length} flores anime 3D instanciadas con THREE.InstancedMesh (${this.instancedAnimeFlowerEntries.length} mallas instanciadas).`);
  }

  createGrassBladeGeometry() {
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const indices = [];

    const planes = [0, Math.PI / 3, (2 * Math.PI) / 3];
    const width = 0.35;
    const height = 1.35;

    let vertOffset = 0;
    for (let p = 0; p < planes.length; p++) {
      const angle = planes[p];
      const cos = Math.cos(angle) * width * 0.5;
      const sin = Math.sin(angle) * width * 0.5;

      positions.push(-cos, 0.0, -sin);
      uvs.push(0.0, 0.0);

      positions.push(cos, 0.0, sin);
      uvs.push(1.0, 0.0);

      positions.push(cos * 0.25, height, sin * 0.25);
      uvs.push(0.8, 1.0);

      positions.push(-cos * 0.25, height, -sin * 0.25);
      uvs.push(0.2, 1.0);

      indices.push(vertOffset, vertOffset + 1, vertOffset + 2);
      indices.push(vertOffset, vertOffset + 2, vertOffset + 3);

      vertOffset += 4;
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }

  populateGrass() {
    this.rng = createSeededRandom(77004);
    const dummy = new THREE.Object3D();
    let instanceIdx = 0;
    const radius = 155;
    const attempts = this.maxGrassInstances * 1.6;

    for (let i = 0; i < attempts && instanceIdx < this.maxGrassInstances; i++) {
      const ang = this.random() * Math.PI * 2;
      const r = Math.sqrt(this.random()) * radius;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;

      // Descartar dentro del lecho del río para mantener el agua cristalina sin briznas sumergidas
      const riverCenterX = 18 + Math.sin(z * 0.025) * 16 + Math.cos(z * 0.012) * 8;
      const riverHalfWidth = 10.0 + Math.sin(z * 0.04) * 3.0 + 3.0;
      const distToRiver = Math.abs(x - riverCenterX);
      if (distToRiver < riverHalfWidth * 0.90) continue; // Despeje total del cauce del río

      const currentWaterY = z <= 16 ? 2.0 : (z >= 34 ? 0.45 : 2.0 - ((z - 16) / 18) * 1.55);
      const y = this.terrain.getHeight(x, z);

      if (y < currentWaterY + 0.25) continue; // Nunca sumergido en agua

      const roadFactor = this.roadManager.getRoadFactor(x, z);
      if (roadFactor > 0.45) continue;

      // Despeje del Dojō Secreto (X: -87.9, Z: 74.0)
      if (Math.hypot(x - (-87.9), z - 74.0) < 16.5) continue;

      const norm = this.terrain.getNormal(x, z);
      if (norm.y < 0.65) continue;

      const scale = 0.95 + this.random() * 0.9;
      dummy.position.set(x, y, z);
      dummy.rotation.set(
        (this.random() - 0.5) * 0.15,
        this.random() * Math.PI * 2,
        (this.random() - 0.5) * 0.15
      );
      dummy.scale.set(scale, scale * (0.9 + this.random() * 0.35), scale);
      dummy.updateMatrix();

      this.grassMesh.setMatrixAt(instanceIdx, dummy.matrix);
      instanceIdx++;
    }

    this.grassMesh.count = instanceIdx;
    this.grassMesh.instanceMatrix.needsUpdate = true;
  }

  // --- Métodos de Personalización en Tiempo Real ---

  setHeight(scale) {
    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uGrassHeight.value = scale;
    }
  }

  setWidth(scale) {
    if (this.grassMaterial && this.grassMaterial.uniforms && this.grassMaterial.uniforms.uGrassWidth) {
      this.grassMaterial.uniforms.uGrassWidth.value = scale;
    }
  }

  setWindStrength(val) {
    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uWindStrength.value = val;
    }
  }

  setWindSpeed(val) {
    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uWindSpeed.value = val;
    }
  }

  setV3Height(scale) {
    if (this.v3GrassUniforms && this.v3GrassUniforms.uHeightScale) {
      this.v3GrassUniforms.uHeightScale.value = scale;
    }
  }

  setColorPreset(presetName) {
    if (!this.grassMaterial) return;
    const uBase = this.grassMaterial.uniforms.uBaseColor.value;
    const uTip = this.grassMaterial.uniforms.uTipColor.value;

    if (presetName === 'genshin') {
      uBase.setHex(0x388e22); // Verde esmeralda vivo
      uTip.setHex(0xa7eb45);  // Verde lima brillante
    } else if (presetName === 'autumn') {
      uBase.setHex(0x9a6a24); // Tono ocre dorado
      uTip.setHex(0xf3c754);  // Trigo dorado cálido
    } else if (presetName === 'mystic') {
      uBase.setHex(0x1a6d75); // Verde azulado místico
      uTip.setHex(0x6eeed4);  // Menta / cian resplandeciente
    } else if (presetName === 'spring') {
      uBase.setHex(0x28843e); // Verde trébol fresco
      uTip.setHex(0xd4f85e);  // Amarillo verdoso primaveral
    }
  }

  setDensity(level) {
    this.densityMode = level;
    if (level === 'low') {
      this.grassMesh.count = Math.floor(this.maxGrassInstances * 0.32);
    } else if (level === 'medium') {
      this.grassMesh.count = Math.floor(this.maxGrassInstances * 0.65);
    } else {
      this.grassMesh.count = this.maxGrassInstances;
    }
    this.grassMesh.instanceMatrix.needsUpdate = true;
  }

  setFlowersEnabled(enabled) {
    if (this.flowersGroup) {
      this.flowersGroup.visible = enabled;
    }
  }

  toggleFlowers() {
    if (this.flowersGroup) {
      this.flowersGroup.visible = !this.flowersGroup.visible;
      return this.flowersGroup.visible;
    }
    return false;
  }

  setFlowerScale(multiplier) {
    this.flowerScaleMultiplier = multiplier;
    if (this.instancedAnimeFlowerEntries) {
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      for (const entry of this.instancedAnimeFlowerEntries) {
        const { instMesh, instances } = entry;
        for (let i = 0; i < instances.length; i++) {
          const item = instances[i];
          quaternion.setFromEuler(item.rot);
          const scaled = item.baseScale.clone().multiplyScalar(multiplier);
          matrix.compose(item.pos, quaternion, scaled);
          instMesh.setMatrixAt(i, matrix);
        }
        instMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  setGlobalWindWave(enabled) {
    if (this.grassMaterial) {
      const windTex = this.assetManager ? this.assetManager.getTexture('wind_noise') : null;
      this.grassMaterial.uniforms.uHasWindTex.value = (enabled && windTex) ? 1.0 : 0.0;
    }
  }

  setCrestIntensity(val) {
    if (this.grassMaterial && this.grassMaterial.uniforms.uCrestIntensity) {
      this.grassMaterial.uniforms.uCrestIntensity.value = val;
    }
  }

  setGrassType(type) {
    this.grassType = type;
    if (type === 'stylized_v3') {
      if (!this.v3GrassMesh) {
        this.initGrassV3();
      }
      if (this.v3GrassMesh) this.v3GrassMesh.visible = true;
      if (this.grassMesh) this.grassMesh.visible = false;
      if (this.flowersGroup) this.flowersGroup.visible = true;
      if (this.stylizedGrassGroup) this.stylizedGrassGroup.visible = false;
      if (this.stylizedFlowersGroup) this.stylizedFlowersGroup.visible = false;
      if (this.terrain && this.terrain.setGrassType) this.terrain.setGrassType('stylized_v3');
    } else if (type === 'stylized') {
      if (!this.stylizedGrassGroup) {
        this.initStylizedGrass();
        this.initStylizedFlowers();
      }
      if (this.v3GrassMesh) this.v3GrassMesh.visible = false;
      if (this.grassMesh) this.grassMesh.visible = false;
      if (this.flowersGroup) this.flowersGroup.visible = false;
      if (this.stylizedGrassGroup) this.stylizedGrassGroup.visible = true;
      if (this.stylizedFlowersGroup) this.stylizedFlowersGroup.visible = true;
      if (this.terrain && this.terrain.setGrassType) this.terrain.setGrassType('stylized');
    } else {
      if (!this.grassMesh) {
        this.initGrass();
      }
      if (this.v3GrassMesh) this.v3GrassMesh.visible = false;
      if (this.grassMesh) this.grassMesh.visible = true;
      if (this.flowersGroup) this.flowersGroup.visible = true;
      if (this.stylizedGrassGroup) this.stylizedGrassGroup.visible = false;
      if (this.stylizedFlowersGroup) this.stylizedFlowersGroup.visible = false;
      if (this.terrain && this.terrain.setGrassType) this.terrain.setGrassType('genshin');
    }
  }

  setVisible(visible) {
    if (this.group) {
      this.group.visible = visible;
    }
  }

  registerRocksForTrampling(rockSpheres) {
    if (!this.stylizedUniforms || !rockSpheres) return;
    const slots = this.stylizedUniforms.uRocks.value;
    const n = Math.min(rockSpheres.length, MAX_ROCKS);
    for (let i = 0; i < n; i++) {
      slots[i].copy(rockSpheres[i]);
    }
    this.stylizedUniforms.uRockCount.value = n;
  }

  setStylizedBladeWidth(width) {
    // 0.06m es el ancho nominal (escala = 1.0)
    const factor = width / 0.06;
    if (this.stylizedUniforms && this.stylizedUniforms.uBladeWidthScale) {
      this.stylizedUniforms.uBladeWidthScale.value = factor;
    }
  }

  setStylizedBladeLength(length) {
    // 0.22m es la longitud nominal (escala = 1.0)
    const factor = length / 0.22;
    if (this.stylizedUniforms && this.stylizedUniforms.uBladeLengthScale) {
      this.stylizedUniforms.uBladeLengthScale.value = factor;
    }
  }

  setStylizedBladeTilt(tiltMax) {
    if (!this.stylizedChunks || !this.stylizedChunks.length) return;
    const dummy = new THREE.Object3D();
    for (let c of this.stylizedChunks) {
      for (let i = 0; i < c.pts.length; i++) {
        const p = c.pts[i];
        p.rx = (this.random() - 0.5) * 2 * tiltMax;
        p.rz = (this.random() - 0.5) * tiltMax * 0.5;
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rx, p.ry, p.rz);
        dummy.scale.set(p.sx, p.sy, 1.0);
        dummy.updateMatrix();
        c.meshLOD0.setMatrixAt(i, dummy.matrix);
        c.meshLOD1.setMatrixAt(i, dummy.matrix);
      }
      c.meshLOD0.instanceMatrix.needsUpdate = true;
      c.meshLOD1.instanceMatrix.needsUpdate = true;
    }
  }

  ensureChunkCapacity(chunk, targetCapacity) {
    this.rng = createSeededRandom(77006);
    if (chunk.pts.length >= targetCapacity) return;

    const minW = 0.055;
    const maxW = 0.065;
    const minL = 0.16;
    const maxL = 0.26;
    const tiltMax = 0.16;
    const chunkSize = 34.0;
    const gx = chunk.cx;
    const gz = chunk.cz;

    const needed = targetCapacity - chunk.pts.length;
    const attempts = needed * 3.5;
    for (let i = 0; i < attempts && chunk.pts.length < targetCapacity; i++) {
      const x = gx + (this.random() - 0.5) * chunkSize;
      const z = gz + (this.random() - 0.5) * chunkSize;

      const distOrigin = Math.hypot(x, z);
      if (distOrigin > 156.0) continue;

      // 1. Despeje del río y bahía costera
      const { riverCenterX, riverHalfWidth } = WaterManager.getRiverBounds(z);
      const distToRiver = Math.abs(x - riverCenterX);
      if (distToRiver < riverHalfWidth * 0.95) continue;

      // 2. Nivel de agua y mar
      const currentWaterY = WaterManager.getRiverWaterHeight(z);
      const y = this.terrain.getHeight(x, z);
      if (y < currentWaterY + 0.20) continue;

      // 3. Senderos / caminos
      const roadFactor = this.roadManager ? this.roadManager.getRoadFactor(x, z) : 0;
      if (roadFactor > 0.28) continue;

      const norm = this.terrain.getNormal(x, z);
      if (norm.y < 0.65) continue;

      const rx = (this.random() - 0.5) * 2 * tiltMax;
      const ry = this.random() * Math.PI * 2;
      const rz = (this.random() - 0.5) * tiltMax * 0.5;
      const sx = minW + this.random() * (maxW - minW);
      const sy = minL + this.random() * (maxL - minL);

      chunk.pts.push({ x, y, z, rx, ry, rz, sx, sy });
    }

    if (chunk.pts.length > chunk.capacity) {
      const newCapacity = chunk.pts.length + 500;
      chunk.capacity = newCapacity;

      this.stylizedGrassGroup.remove(chunk.meshLOD0);
      this.stylizedGrassGroup.remove(chunk.meshLOD1);
      this.stylizedGrassGroup.remove(chunk.meshLOD2);

      const newLOD0 = new THREE.InstancedMesh(this.bladeGeoLOD0, this.stylizedGrassMaterial, newCapacity);
      const newLOD1 = new THREE.InstancedMesh(this.bladeGeoLOD1, this.stylizedGrassMaterial, newCapacity);
      const newLOD2 = new THREE.InstancedMesh(this.bladeGeoLOD1, this.stylizedGrassMaterial, Math.ceil(newCapacity * 0.5));

      newLOD0.castShadow = false;
      newLOD0.receiveShadow = true;
      newLOD0.frustumCulled = false;

      newLOD1.castShadow = false;
      newLOD1.receiveShadow = true;
      newLOD1.frustumCulled = false;

      newLOD2.castShadow = false;
      newLOD2.receiveShadow = true;
      newLOD2.frustumCulled = false;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < chunk.pts.length; i++) {
        const p = chunk.pts[i];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rx, p.ry, p.rz);
        dummy.scale.set(p.sx, p.sy, 1.0);
        dummy.updateMatrix();
        newLOD0.setMatrixAt(i, dummy.matrix);
        newLOD1.setMatrixAt(i, dummy.matrix);
      }
      newLOD0.instanceMatrix.needsUpdate = true;
      newLOD1.instanceMatrix.needsUpdate = true;

      let i2 = 0;
      for (let i = 0; i < chunk.pts.length; i += 2) {
        const p = chunk.pts[i];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rx, p.ry, p.rz);
        dummy.scale.set(p.sx * 1.35, p.sy * 1.15, 1.0);
        dummy.updateMatrix();
        newLOD2.setMatrixAt(i2, dummy.matrix);
        i2++;
      }
      newLOD2.instanceMatrix.needsUpdate = true;

      newLOD0.visible = chunk.meshLOD0.visible;
      newLOD1.visible = chunk.meshLOD1.visible;
      newLOD2.visible = chunk.meshLOD2.visible;

      chunk.meshLOD0 = newLOD0;
      chunk.meshLOD1 = newLOD1;
      chunk.meshLOD2 = newLOD2;
      chunk.totalPoints = chunk.pts.length;
      chunk.totalPointsLOD2 = i2;

      this.stylizedGrassGroup.add(newLOD0);
      this.stylizedGrassGroup.add(newLOD1);
      this.stylizedGrassGroup.add(newLOD2);
    }
  }

  setStylizedBladeCount(newCount) {
    const targetCount = Math.max(1000, Math.min(100000, Math.round(newCount)));
    this.stylizedBladeCount = targetCount;
    if (!this.stylizedChunks || !this.stylizedChunks.length) return;

    const countPerChunk = Math.max(10, Math.round(targetCount / this.stylizedChunks.length));

    for (let i = 0; i < this.stylizedChunks.length; i++) {
      const c = this.stylizedChunks[i];
      if (countPerChunk > c.pts.length) {
        this.ensureChunkCapacity(c, countPerChunk);
      }

      const n = Math.min(c.pts.length, countPerChunk);
      c.meshLOD0.count = n;
      c.meshLOD1.count = n;
      c.meshLOD2.count = Math.min(c.totalPointsLOD2, Math.ceil(n * 0.5));
      c.meshLOD0.instanceMatrix.needsUpdate = true;
      c.meshLOD1.instanceMatrix.needsUpdate = true;
      c.meshLOD2.instanceMatrix.needsUpdate = true;
    }
  }

  update(delta, playerPos, companionPos = null) {
    this.time += delta;

    // 1. Actualizar césped Genshin solo si está activo
    if (this.grassType === 'genshin' && this.grassMaterial && this.windEnabled) {
      this.grassMaterial.uniforms.uTime.value = this.time;
    }

    // 2. Actualizar césped Stylized-Components y Flores solo cuando esté activo
    if (this.grassType === 'stylized' && this.stylizedUniforms && this.windEnabled) {
      this.stylizedUniforms.uTime.value = (this.stylizedUniforms.uTime.value + delta) % 3600;
      if (this.stylizedFlowerUniforms) {
        this.stylizedFlowerUniforms.uTime.value = this.stylizedUniforms.uTime.value;
      }

      // Actualizar niveles concéntricos de LOD según la posición del jugador
      if (playerPos) {
        const distMoved = Math.hypot(playerPos.x - this.lastPlayerLODPos.x, playerPos.z - this.lastPlayerLODPos.z);
        if (distMoved > 2.0) {
          this.lastPlayerLODPos.copy(playerPos);
          this.updateStylizedChunksLOD(playerPos.x, playerPos.z);
          this.updateStylizedFlowersPosition(playerPos.x, playerPos.z);
        }
      }

      // Sincronizar sol direccional para translucidez (subsurface backlight)
      if (!this.sunLight && this.scene) {
        this.scene.traverse((o) => {
          if (!this.sunLight && o.isDirectionalLight) {
            this.sunLight = o;
          }
        });
      }
      if (this.sunLight) {
        this.sunLight.getWorldPosition(this.sunPos);
        this.sunLight.target.getWorldPosition(this.sunTarget);
        this.stylizedUniforms.uSunDir.value.subVectors(this.sunPos, this.sunTarget).normalize();
        this.stylizedUniforms.uSunColor.value.copy(this.sunLight.color).multiplyScalar(this.sunLight.intensity);
      }
    }

    // 3. Actualizar Césped Estilizado V3
    if (this.grassType === 'stylized_v3' && this.v3GrassUniforms && this.windEnabled) {
      this.v3GrassUniforms.uTime.value = (this.v3GrassUniforms.uTime.value + delta) % 3600;

      // Sincronizar coordenadas para deformación interactiva de hierba (Sapidae & Axie)
      if (playerPos && this.v3GrassUniforms.uPlayerPos) {
        this.v3GrassUniforms.uPlayerPos.value.copy(playerPos);
      }
      if (companionPos && this.v3GrassUniforms.uCompanionPos) {
        this.v3GrassUniforms.uCompanionPos.value.copy(companionPos);
      }

      // Culling de chunks por distancia exterior (más allá de 145m el shader descarta las briznas)
      if (playerPos && this.v3GrassChunks && this.v3GrassChunks.length > 0) {
        const distMoved = Math.hypot(playerPos.x - this.lastV3PlayerPos.x, playerPos.z - this.lastV3PlayerPos.z);
        if (distMoved > 3.0) {
          this.lastV3PlayerPos.copy(playerPos);
          for (const chunk of this.v3GrassChunks) {
            if (chunk.mesh) {
              const d = chunk.sphere.distanceToPoint(playerPos);
              chunk.mesh.visible = (d < 145.0) && (chunk.mesh.count > 0);
            }
          }
        }
      }

      if (!this.sunLight && this.scene) {
        this.scene.traverse((o) => {
          if (!this.sunLight && o.isDirectionalLight) {
            this.sunLight = o;
          }
        });
      }
      if (this.sunLight) {
        this.sunLight.getWorldPosition(this.sunPos);
        this.sunLight.target.getWorldPosition(this.sunTarget);
        this.v3GrassUniforms.uSunDirection.value.subVectors(this.sunPos, this.sunTarget).normalize();
        this.v3GrassUniforms.uSunColor.value.copy(this.sunLight.color).multiplyScalar(this.sunLight.intensity);
      }
    }
  }
}
