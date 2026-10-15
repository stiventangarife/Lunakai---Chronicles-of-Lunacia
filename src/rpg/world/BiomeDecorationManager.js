// BiomeDecorationManager.js - Biome-specific 3D prop placement, rendering & collisions
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import { TorchFlameGPU } from './TorchFlameGPU.js';

// Procedural Obsidian Lava Rock material with glowing pulsating magma cracks and specular rim
function createObsidianLavaRockMaterial(timeUniformArray = null, baseHex = 0x16131c, lavaHex = 0xff4500, coreHex = 0xffd000) {
  const baseC = new THREE.Color(baseHex);
  const lavaC = new THREE.Color(lavaHex);
  const coreC = new THREE.Color(coreHex);

  const mat = new THREE.MeshStandardMaterial({
    color: baseHex,
    roughness: 0.32,
    metalness: 0.18
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0.0 };
    if (timeUniformArray) {
      timeUniformArray.push(shader.uniforms.uTime);
    }

    shader.vertexShader = `
      varying vec3 vRockWorldPos;
      varying vec3 vRockWorldNormal;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vRockWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vRockWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      `
    );

    shader.fragmentShader = `
      uniform float uTime;
      varying vec3 vRockWorldPos;
      varying vec3 vRockWorldNormal;
      ${shader.fragmentShader}
    `.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Procedural lava crack network in 3D world space
      vec3 p = vRockWorldPos * 1.75;
      float vein1 = abs(sin(p.x * 2.2 + cos(p.y * 3.1 + p.z * 1.7) * 1.5));
      float vein2 = abs(cos(p.z * 2.5 + sin(p.x * 2.8 + p.y * 1.4) * 1.5));
      float crackPattern = min(vein1, vein2);

      // Incandescent fissure mask
      float crackMask = 1.0 - smoothstep(0.04, 0.17, crackPattern);

      if (crackMask > 0.01) {
        float pulse = sin(uTime * 2.5 + vRockWorldPos.x * 1.5 + vRockWorldPos.z * 1.2) * 0.25 + 0.85;
        vec3 magma = mix(
          vec3(${lavaC.r.toFixed(3)}, ${lavaC.g.toFixed(3)}, ${lavaC.b.toFixed(3)}),
          vec3(${coreC.r.toFixed(3)}, ${coreC.g.toFixed(3)}, ${coreC.b.toFixed(3)}),
          smoothstep(0.45, 0.95, crackMask)
        ) * pulse * 1.65;
        diffuseColor.rgb = mix(diffuseColor.rgb, magma, crackMask);
      }

      // Specular obsidian Fresnel sheen
      vec3 viewDir = normalize(cameraPosition - vRockWorldPos);
      float fresnel = pow(1.0 - max(dot(viewDir, vRockWorldNormal), 0.0), 3.0);
      diffuseColor.rgb += vec3(0.35, 0.18, 0.25) * fresnel * 0.45;
      `
    );
  };

  return mat;
}

// Procedural snow cap material generator with normal-oriented snow accumulation
function createSnowCapMaterial(baseColor, roughness = 0.85, snowThreshold = 0.25) {
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: roughness,
    metalness: 0.0
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec3 vSnowWorldNormal;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vSnowWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      `
    );

    shader.fragmentShader = `
      varying vec3 vSnowWorldNormal;
      ${shader.fragmentShader}
    `.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      float snowAmount = smoothstep(${snowThreshold.toFixed(2)}, 0.75, vSnowWorldNormal.y);
      vec3 snowCol = vec3(0.953, 0.953, 0.965); // #F3F3F6
      diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, snowAmount * 0.95);
      `
    );
  };

  return mat;
}

// Procedural Arctic Pine needles with Teal / Verde-azulado tint and fluffy snow top
function createArcticPineMaterial(baseColor = 0x226b63, roughness = 0.82) {
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: roughness,
    metalness: 0.0,
    alphaTest: 0.22,
    side: THREE.DoubleSide
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec3 vSnowWorldNormal;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vSnowWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      `
    );

    shader.fragmentShader = `
      varying vec3 vSnowWorldNormal;
      ${shader.fragmentShader}
    `.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Blend foliage toward cold teal / verde-azulado
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.40, 0.36), 0.50);
      // Fluffy snow accumulation on upward branch needles
      float snowAmount = smoothstep(0.18, 0.65, vSnowWorldNormal.y);
      vec3 snowCol = vec3(0.960, 0.965, 0.985);
      diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, snowAmount * 0.94);
      `
    );
  };

  return mat;
}

// Procedural Glacial Ice material for shiny, translucent azure ice boulders & monoliths
function createGlacialIceMaterial(baseColor = 0x58c4e8) {
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.12,   // High gloss / wet shiny ice reflection
    metalness: 0.12,   // Specular sheen
    transparent: true,
    opacity: 0.92      // Translucent glacial depth
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec3 vIceWorldNormal;
      varying vec3 vIceWorldPos;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vIceWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vIceWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      `
    );

    shader.fragmentShader = `
      varying vec3 vIceWorldNormal;
      varying vec3 vIceWorldPos;
      ${shader.fragmentShader}
    `.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Depth gradient from deep cyan-blue core to bright crystalline surface
      vec3 deepIce = vec3(0.08, 0.42, 0.68);
      vec3 lightIce = vec3(0.58, 0.88, 0.98);
      float heightGradient = clamp((vIceWorldPos.y + 0.5) / 3.5, 0.0, 1.0);
      vec3 iceBase = mix(deepIce, lightIce, heightGradient);

      // Specular Fresnel / rim highlight for crystalline ice edges
      vec3 viewDir = normalize(cameraPosition - vIceWorldPos);
      float fresnel = pow(1.0 - max(dot(viewDir, vIceWorldNormal), 0.0), 2.2);
      vec3 rimGlow = vec3(0.70, 0.92, 1.0) * fresnel * 0.55;

      diffuseColor.rgb = iceBase + rimGlow;

      // Subtle frost / snow cap on top ledges
      float frostAmount = smoothstep(0.42, 0.82, vIceWorldNormal.y);
      vec3 frostCol = vec3(0.955, 0.975, 1.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, frostCol, frostAmount * 0.80);
      `
    );
  };

  return mat;
}

// Procedural Magical Crystal material for shiny, translucent amethyst / pink crystal monoliths & clusters
function createMagicalCrystalMaterial(deepHex = 0x581c87, lightHex = 0xf472b6, rimHex = 0xe879f9) {
  const deepC = new THREE.Color(deepHex);
  const lightC = new THREE.Color(lightHex);
  const rimC = new THREE.Color(rimHex);

  const mat = new THREE.MeshStandardMaterial({
    color: lightHex,
    roughness: 0.12,   // High gloss / wet shiny crystal reflection
    metalness: 0.18,   // Specular crystalline sheen
    transparent: true,
    opacity: 0.90      // Translucent crystal depth
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec3 vCrystalWorldNormal;
      varying vec3 vCrystalWorldPos;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vCrystalWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vCrystalWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      `
    );

    shader.fragmentShader = `
      varying vec3 vCrystalWorldNormal;
      varying vec3 vCrystalWorldPos;
      ${shader.fragmentShader}
    `.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Depth gradient from deep amethyst / violet core to bright rose / fuchsia surface
      vec3 deepCrystal = vec3(${deepC.r.toFixed(3)}, ${deepC.g.toFixed(3)}, ${deepC.b.toFixed(3)});
      vec3 lightCrystal = vec3(${lightC.r.toFixed(3)}, ${lightC.g.toFixed(3)}, ${lightC.b.toFixed(3)});
      float heightGradient = clamp((vCrystalWorldPos.y + 0.5) / 3.5, 0.0, 1.0);
      vec3 crystalBase = mix(deepCrystal, lightCrystal, heightGradient);

      // Specular Fresnel / rim highlight for radiant crystal edges
      vec3 viewDir = normalize(cameraPosition - vCrystalWorldPos);
      float fresnel = pow(1.0 - max(dot(viewDir, vCrystalWorldNormal), 0.0), 2.2);
      vec3 rimGlow = vec3(${rimC.r.toFixed(3)}, ${rimC.g.toFixed(3)}, ${rimC.b.toFixed(3)}) * fresnel * 0.75;

      diffuseColor.rgb = crystalBase + rimGlow;

      // Subtle stardust / iridescent gleam on top facets
      float starGleam = smoothstep(0.42, 0.85, vCrystalWorldNormal.y);
      vec3 starCol = vec3(0.98, 0.90, 1.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, starCol, starGleam * 0.40);
      `
    );
  };

  return mat;
}

// Procedural Arctic Column stone material with snow accumulation on upward capital & fluting ledges
function createArcticColumnMaterial(baseColor = 0x8292a2) {
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.90,
    metalness: 0.04
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec3 vColWorldNormal;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vColWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      `
    );

    shader.fragmentShader = `
      varying vec3 vColWorldNormal;
      ${shader.fragmentShader}
    `.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Frost stone with cool slate-blue ambient tint in shadows
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.48, 0.58, 0.68), 0.22);
      // Realistic snow dusting on fluted ledges, capital and upward faces
      float snowAmount = smoothstep(0.32, 0.72, vColWorldNormal.y);
      vec3 snowCol = vec3(0.955, 0.965, 0.985);
      diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, snowAmount * 0.92);
      `
    );
  };

  return mat;
}

// Procedural flat ivy leaf cluster geometry for stone columns & ruins
function createStoneIvyClusterGeometry() {
  const positions = [
    0.00, 0.00, 0.000,   0.00, 0.06, 0.006,  -0.045, 0.02, 0.001,
    -0.085, 0.07, 0.002, -0.035, 0.10, 0.003, 0.00, 0.14, 0.006,
    0.035, 0.10, 0.003,  0.085, 0.07, 0.002,  0.045, 0.02, 0.001
  ];
  const indices = [
    0, 2, 1,  0, 1, 8,  2, 3, 1,  3, 4, 1,
    4, 5, 1,  1, 5, 6,  1, 6, 7,  1, 7, 8
  ];

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}


// --- Biome Asset Lists for Memory Management ---
const SAVANNAH_ASSETS = [
  './assets/savannah/cactus_tall.glb',
  './assets/savannah/cactus_short.glb',
  './assets/savannah/rock_smallA.glb',
  './assets/savannah/rock_smallB.glb',
  './assets/savannah/rock_smallFlatA.glb',
  './assets/savannah/stone_smallA.glb',
  './assets/nature/TwistedTree_1.gltf',
  './assets/nature/TwistedTree_2.gltf',
  './assets/nature/TwistedTree_3.gltf',
  './assets/nature/TwistedTree_4.gltf',
  './assets/nature/TwistedTree_5.gltf',
  './assets/nature/palms/PalmTree_1.glb',
  './assets/nature/palms/PalmTree_2.glb',
  './assets/nature/palms/PalmTree_3.glb',
  './assets/nature/palms/PalmTree_4.glb',
  './assets/nature/palms/PalmTree_5.glb',
  './assets/nature/rocks/Rock_sabana1.glb',
  './assets/nature/rocks/Rock_sabana2.glb',
  './assets/nature/rocks/Rock_sabana3.glb',
  './assets/nature/rocks/Rock_sabana4.glb',
  './assets/nature/rocks/Rock_sabana5.glb',
  './assets/nature/Bush_Common.gltf',
  './assets/nature/Plant_1_Big.gltf',
  './assets/nature/Fern_1.gltf',
  './assets/nature/Grass_Common_Short.gltf',
  './assets/nature/Flower_3_Group.gltf',
  './assets/environment/column.glb',
  './assets/environment/column2.glb',
  './assets/environment/jarra_sabana.glb',
  './assets/environment/jarra_sabana2.glb',
  './assets/environment/jarra_sabana3.glb',
  './assets/environment/jarra_sabana4.glb',
  './assets/environment/linter_sabana.glb',
  './assets/environment/chest.glb',
  './assets/environment/blacksmith.glb'
];

const ARCTIC_ASSETS = [
  './assets/arctic/plant_bush.glb',
  './assets/arctic/plant_bushDetailed.glb',
  './assets/arctic/plant_bushSmall.glb',
  './assets/arctic/rock_smallA.glb',
  './assets/arctic/rock_smallB.glb',
  './assets/arctic/rock_smallFlatA.glb',
  './assets/arctic/stone_smallA.glb',
  './assets/nature/Pine_1.gltf',
  './assets/nature/Pine_2.gltf',
  './assets/nature/Pine_3.gltf',
  './assets/nature/Pine_4.gltf',
  './assets/nature/Pine_5.gltf',
  './assets/nature/Bush_Common.gltf',
  './assets/nature/Bush_Common_Flowers.gltf',
  './assets/nature/Flower_4_Group.gltf',
  './assets/nature/Flower_3_Group.gltf',
  './assets/nature/Flower_3_Single.gltf',
  './assets/nature/Rock_Medium_1.gltf',
  './assets/nature/Rock_Medium_2.gltf',
  './assets/nature/Rock_Medium_3.gltf',
  './assets/nature/rocks/Rock_sabana1.glb',
  './assets/nature/rocks/Rock_sabana3.glb',
  './assets/environment/snowman_artic.glb',
  './assets/environment/market_artic.glb',
  './assets/environment/house_artic.glb',
  './assets/environment/column.glb',
  './assets/environment/column2.glb',
  './assets/nature/Fern_1.gltf',
  './assets/nature/Plant_1_Big.gltf',
  './assets/nature/Grass_Common_Short.gltf'
];

const MYSTIC_ASSETS = [
  './assets/mystic/plant_bush.glb',
  './assets/mystic/plant_bushDetailed.glb',
  './assets/mystic/plant_bushSmall.glb',
  './assets/mystic/rock_smallA.glb',
  './assets/mystic/rock_smallB.glb',
  './assets/mystic/rock_smallFlatA.glb',
  './assets/mystic/stone_smallA.glb',
  './assets/mystic/flower_redA.glb',
  './assets/mystic/flower_redB.glb',
  './assets/mystic/mushroom_red.glb',
  './assets/mystic/mushroom_redGroup.glb',
  './assets/mystic/mushroom_redTall.glb',
  './assets/nature/TwistedTree_1.gltf',
  './assets/nature/TwistedTree_2.gltf',
  './assets/nature/TwistedTree_3.gltf',
  './assets/nature/TwistedTree_4.gltf',
  './assets/nature/TwistedTree_5.gltf',
  './assets/nature/Rock_Medium_1.gltf',
  './assets/nature/Rock_Medium_2.gltf',
  './assets/nature/Rock_Medium_3.gltf',
  './assets/nature/rocks/Rock_sabana1.glb',
  './assets/nature/rocks/Rock_sabana3.glb',
  './assets/environment/linter_asia.glb',
  './assets/environment/column.glb',
  './assets/environment/column2.glb',
  './assets/nature/Flower_4_Group.gltf',
  './assets/nature/Flower_3_Group.gltf',
  './assets/nature/Flower_3_Single.gltf',
  './assets/nature/Fern_1.gltf',
  './assets/nature/Plant_1_Big.gltf',
  './assets/nature/Bush_Common_Flowers.gltf',
  './assets/nature/Grass_Common_Short.gltf'
];

const DUNGEON_ASSETS = [
  './assets/dungeon/plant_bush.glb',
  './assets/dungeon/plant_bushDetailed.glb',
  './assets/dungeon/plant_bushSmall.glb',
  './assets/dungeon/rock_smallA.glb',
  './assets/dungeon/rock_smallB.glb',
  './assets/dungeon/rock_smallFlatA.glb',
  './assets/dungeon/stone_smallA.glb',
  './assets/dungeon/flower_redA.glb',
  './assets/dungeon/flower_redB.glb',
  './assets/dungeon/tree_oak.glb',
  './assets/nature/TwistedTree_1.gltf',
  './assets/nature/TwistedTree_2.gltf',
  './assets/nature/TwistedTree_3.gltf',
  './assets/nature/TwistedTree_4.gltf',
  './assets/nature/TwistedTree_5.gltf',
  './assets/nature/Rock_Medium_1.gltf',
  './assets/nature/Rock_Medium_2.gltf',
  './assets/nature/Rock_Medium_3.gltf',
  './assets/nature/rocks/Rock_sabana1.glb',
  './assets/nature/rocks/Rock_sabana3.glb',
  './assets/nature/rocks/Rock_sabana5.glb',
  './assets/environment/alt_bones.glb',
  './assets/environment/lapida.glb',
  './assets/environment/ancient_archway.glb',
  './assets/environment/torch_1.glb',
  './assets/environment/column.glb',
  './assets/environment/column2.glb',
  './assets/nature/Bush_Common_Flowers.gltf',
  './assets/nature/Flower_3_Group.gltf',
  './assets/nature/Flower_4_Group.gltf',
  './assets/nature/Flower_3_Single.gltf',
  './assets/nature/Fern_1.gltf',
  './assets/nature/Plant_1_Big.gltf',
  './assets/nature/Grass_Common_Short.gltf',
  './assets/mystic/mushroom_red.glb',
  './assets/mystic/mushroom_redGroup.glb',
  './assets/mystic/mushroom_redTall.glb'
];

// --- Flyweight Material Caches (Prevents compiling 300+ duplicate shaders & leaking VRAM) ---
const leafMatCache = new Map();
let sharedTwistedBarkMat = null;
const savannahRockMatCache = new Map();
const bushCommonMatCache = new Map();
const plantMatCache = new Map();
const grassTuftMatCache = new Map();
let sharedPalmMat = null;

function disposeTextureDeep(tex) {
  if (!tex || !tex.isTexture) return;
  tex.dispose();
  if (tex.image) {
    if (typeof tex.image.close === 'function') {
      try { tex.image.close(); } catch (_) {}
    }
    tex.image = null;
  }
  if (tex.source) {
    if (tex.source.data && typeof tex.source.data.close === 'function') {
      try { tex.source.data.close(); } catch (_) {}
    }
    tex.source.data = null;
  }
}

function disposeMaterialDeep(mat) {
  if (!mat) return;
  for (const key of Object.keys(mat)) {
    const val = mat[key];
    if (val && val.isTexture) {
      disposeTextureDeep(val);
    }
  }
  mat.dispose();
}

function clearSharedMaterialCaches() {
  leafMatCache.forEach(m => disposeMaterialDeep(m));
  leafMatCache.clear();

  if (sharedTwistedBarkMat) {
    disposeMaterialDeep(sharedTwistedBarkMat);
    sharedTwistedBarkMat = null;
  }

  savannahRockMatCache.forEach(m => disposeMaterialDeep(m));
  savannahRockMatCache.clear();

  bushCommonMatCache.forEach(m => disposeMaterialDeep(m));
  bushCommonMatCache.clear();

  plantMatCache.forEach(m => disposeMaterialDeep(m));
  plantMatCache.clear();

  grassTuftMatCache.forEach(m => disposeMaterialDeep(m));
  grassTuftMatCache.clear();

  if (sharedPalmMat) {
    disposeMaterialDeep(sharedPalmMat);
    sharedPalmMat = null;
  }
}

// --- Modular 3D Preparation Helpers ---
function prepareModel(gltf, defaultMat, customMatMap = null) {
  const root = gltf.scene.clone();
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (customMatMap && child.material && customMatMap[child.material.name]) {
        child.material = customMatMap[child.material.name];
      } else if (defaultMat) {
        child.material = defaultMat;
      }
    }
  });
  return root;
}

function preparePalm(gltf) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        if (!sharedPalmMat) {
          sharedPalmMat = child.material.clone();
          sharedPalmMat.roughness = 0.85;
        }
        child.material = sharedPalmMat;
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareTwistedTree(gltf, leafColorHex) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const mat = child.material;
      if (mat) {
        const matName = (mat.name || '').toLowerCase();
        if (matName.includes('leaf') || matName.includes('leaves')) {
          if (!leafMatCache.has(leafColorHex)) {
            const leafMat = mat.clone();
            leafMat.side = THREE.DoubleSide;
            leafMat.alphaTest = 0.45;
            leafMat.transparent = true;
            leafMat.roughness = 0.75;
            leafMat.customProgramCacheKey = () => 'twisted_leaf_' + leafColorHex;
            leafMat.onBeforeCompile = (shader) => {
              shader.uniforms.uLeafTint = { value: new THREE.Color(leafColorHex) };
              shader.fragmentShader = `
                uniform vec3 uLeafTint;
                ${shader.fragmentShader}
              `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                float leafLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
                diffuseColor.rgb = uLeafTint * (leafLum * 0.55 + 0.65);
                `
              );
            };
            leafMatCache.set(leafColorHex, leafMat);
          }
          child.material = leafMatCache.get(leafColorHex);
        } else if (matName.includes('bark')) {
          if (!sharedTwistedBarkMat) {
            sharedTwistedBarkMat = mat.clone();
            sharedTwistedBarkMat.roughness = 0.88;
            sharedTwistedBarkMat.metalness = 0.05;
          }
          child.material = sharedTwistedBarkMat;
        }
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareSavannahRock(gltf, sandstoneHex = 0xD48E55) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        if (!savannahRockMatCache.has(sandstoneHex)) {
          const mat = child.material.clone();
          mat.roughness = 0.90;
          mat.metalness = 0.02;
          mat.customProgramCacheKey = () => 'savannah_rock_' + sandstoneHex;
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uSandstoneTint = { value: new THREE.Color(sandstoneHex) };
            shader.fragmentShader = `
              uniform vec3 uSandstoneTint;
              ${shader.fragmentShader}
            `.replace(
              '#include <color_fragment>',
              `
              #include <color_fragment>
              float rockLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
              diffuseColor.rgb = uSandstoneTint * (rockLum * 0.70 + 0.40);
              `
            );
          };
          savannahRockMatCache.set(sandstoneHex, mat);
        }
        child.material = savannahRockMatCache.get(sandstoneHex);
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareBushCommon(gltf, tintColorHex = 0x3D5224) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        if (!bushCommonMatCache.has(tintColorHex)) {
          const mat = child.material.clone();
          mat.side = THREE.DoubleSide;
          mat.alphaTest = 0.45;
          mat.transparent = true;
          mat.roughness = 0.80;
          mat.customProgramCacheKey = () => 'bush_common_' + tintColorHex;
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uBushTint = { value: new THREE.Color(tintColorHex) };
            shader.fragmentShader = `
              uniform vec3 uBushTint;
              ${shader.fragmentShader}
            `.replace(
              '#include <color_fragment>',
              `
              #include <color_fragment>
              float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
              diffuseColor.rgb = uBushTint * (lum * 0.65 + 0.45);
              `
            );
          };
          bushCommonMatCache.set(tintColorHex, mat);
        }
        child.material = bushCommonMatCache.get(tintColorHex);
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function preparePlant(gltf, tintColorHex = null) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        const key = String(tintColorHex);
        if (!plantMatCache.has(key)) {
          const mat = child.material.clone();
          mat.side = THREE.DoubleSide;
          mat.alphaTest = 0.45;
          mat.transparent = true;
          mat.roughness = 0.78;
          if (tintColorHex !== null) {
            mat.customProgramCacheKey = () => 'plant_tint_' + tintColorHex;
            mat.onBeforeCompile = (shader) => {
              shader.uniforms.uPlantTint = { value: new THREE.Color(tintColorHex) };
              shader.fragmentShader = `
                uniform vec3 uPlantTint;
                ${shader.fragmentShader}
              `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
                diffuseColor.rgb = uPlantTint * (lum * 0.60 + 0.50);
                `
              );
            };
          }
          plantMatCache.set(key, mat);
        }
        child.material = plantMatCache.get(key);
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareGrassTuft(gltf, grassTint = 0xC8A048) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = true;
      if (child.material) {
        if (!grassTuftMatCache.has(grassTint)) {
          const mat = child.material.clone();
          mat.side = THREE.DoubleSide;
          mat.alphaTest = 0.45;
          mat.transparent = true;
          mat.roughness = 0.85;
          mat.customProgramCacheKey = () => 'grass_tuft_' + grassTint;
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uGrassTint = { value: new THREE.Color(grassTint) };
            shader.fragmentShader = `
              uniform vec3 uGrassTint;
              ${shader.fragmentShader}
            `.replace(
              '#include <color_fragment>',
              `
              #include <color_fragment>
              float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
              diffuseColor.rgb = uGrassTint * (lum * 0.55 + 0.55);
              `
            );
          };
          grassTuftMatCache.set(grassTint, mat);
        }
        child.material = grassTuftMatCache.get(grassTint);
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareFlowerGroup(gltf) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = true;
      if (child.material) {
        const mat = child.material.clone();
        mat.side = THREE.DoubleSide;
        mat.alphaTest = 0.45;
        mat.transparent = true;
        mat.roughness = 0.75;
        child.material = mat;
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareColumn(gltf) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = 0.88;
        child.material.metalness = 0.05;
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareArcticPine(gltf, needlesMat, trunkMat) {
  const root = gltf.scene.clone(true);
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const matName = (child.material && child.material.name) ? child.material.name : '';
      if (matName.includes('Leaves') || matName.includes('Leaf') || (child.name || '').toLowerCase().includes('leaf')) {
        child.material = needlesMat;
      } else {
        child.material = trunkMat;
      }
    }
  });
  return root;
}

function prepareIceRock(gltf, glacialIceMat, customScale = 1.0) {
  const root = gltf.scene.clone(true);
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = glacialIceMat;
    }
  });
  if (customScale !== 1.0) {
    root.scale.multiplyScalar(customScale);
  }
  return root;
}

function prepareArcticColumn(gltf, isRuined = false) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const arcticColumnStoneMat = createArcticColumnMaterial(0x7e8f9e);

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = arcticColumnStoneMat;
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);

  const h = size.y;
  const rx = size.x * 0.5;
  const rz = size.z * 0.5;
  const shaftRadius = (rx + rz) * 0.44;

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf6f8fc,
    roughness: 0.88,
    metalness: 0.02
  });

  const snowGroup = new THREE.Group();
  snowGroup.name = 'arctic_snow_mounds';

  if (!isRuined) {
    const mainMoundGeom = new THREE.SphereGeometry(rx * 0.92, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const mainMound = new THREE.Mesh(mainMoundGeom, snowMat);
    mainMound.scale.set(1.0, 0.42, 1.0);
    mainMound.position.set(0, h - 0.003, 0);
    mainMound.castShadow = true;
    snowGroup.add(mainMound);

    const moundOffsets = [
      { x:  rx * 0.35, z:  rz * 0.25, s: 0.55, sy: 0.48 },
      { x: -rx * 0.38, z: -rz * 0.20, s: 0.60, sy: 0.45 },
      { x:  rx * 0.10, z: -rz * 0.42, s: 0.50, sy: 0.40 },
      { x: -rx * 0.22, z:  rz * 0.38, s: 0.45, sy: 0.38 }
    ];
    moundOffsets.forEach(mo => {
      const subMound = new THREE.Mesh(mainMoundGeom, snowMat);
      subMound.scale.set(mo.s, mo.s * mo.sy, mo.s);
      subMound.position.set(mo.x, h - 0.002, mo.z);
      subMound.castShadow = true;
      snowGroup.add(subMound);
    });

    const rimGeom = new THREE.CylinderGeometry(rx * 0.96, rx * 1.02, h * 0.035, 16);
    const rimMesh = new THREE.Mesh(rimGeom, snowMat);
    rimMesh.position.set(0, h - h * 0.015, 0);
    snowGroup.add(rimMesh);
  } else {
    const ruinedMoundGeom = new THREE.SphereGeometry(rx * 0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const mainMound = new THREE.Mesh(ruinedMoundGeom, snowMat);
    mainMound.scale.set(0.90, 0.38, 0.85);
    mainMound.position.set(rx * 0.12, h - 0.008, rz * 0.08);
    mainMound.castShadow = true;
    snowGroup.add(mainMound);

    const subMound1 = new THREE.Mesh(ruinedMoundGeom, snowMat);
    subMound1.scale.set(0.55, 0.25, 0.55);
    subMound1.position.set(-rx * 0.28, h - 0.022, rz * 0.15);
    snowGroup.add(subMound1);

    const subMound2 = new THREE.Mesh(ruinedMoundGeom, snowMat);
    subMound2.scale.set(0.48, 0.22, 0.48);
    subMound2.position.set(rx * 0.08, h - 0.018, -rz * 0.30);
    snowGroup.add(subMound2);
  }

  const baseMoundGeom = new THREE.SphereGeometry(rx * 0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const baseMound1 = new THREE.Mesh(baseMoundGeom, snowMat);
  baseMound1.scale.set(1.1, 0.30, 0.9);
  baseMound1.position.set(rx * 0.72, 0, rz * 0.35);
  snowGroup.add(baseMound1);

  const baseMound2 = new THREE.Mesh(baseMoundGeom, snowMat);
  baseMound2.scale.set(0.9, 0.26, 1.1);
  baseMound2.position.set(-rx * 0.65, 0, -rz * 0.50);
  snowGroup.add(baseMound2);

  wrapper.add(snowGroup);

  const arcticIvyMat = new THREE.MeshStandardMaterial({
    color: 0x4aa8e8,
    roughness: 0.62,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const arcticIvyCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.58,
    metalness: 0.08,
    side: THREE.DoubleSide
  });
  const ivyStemMat = new THREE.MeshStandardMaterial({
    color: 0x225c8a,
    roughness: 0.75,
    metalness: 0.02
  });

  const ivyGroup = new THREE.Group();
  ivyGroup.name = 'arctic_bluish_ivy';
  const ivyGeom = createStoneIvyClusterGeometry();

  const totalSteps = 16;
  const topT = isRuined ? 0.78 : 0.88;
  const vinePoints = [];

  for (let i = 0; i <= totalSteps; i++) {
    const t = (i / totalSteps) * topT;
    const angle = t * Math.PI * 3.8 + (isRuined ? 1.2 : 0.4);
    const y = t * h + 0.01;
    const rad = shaftRadius * (1.0 + Math.sin(t * Math.PI * 6.0) * 0.06) + 0.003;
    const vx = Math.cos(angle) * rad;
    const vz = Math.sin(angle) * rad;
    vinePoints.push(new THREE.Vector3(vx, y, vz));

    if (i > 0 && i < totalSteps) {
      const ivyMesh = new THREE.Mesh(ivyGeom, (i % 2 === 0) ? arcticIvyMat : arcticIvyCyanMat);
      ivyMesh.position.set(vx, y, vz);
      const leafScale = 0.22 + (Math.sin(i * 1.7) * 0.06);
      ivyMesh.scale.setScalar(leafScale);
      ivyMesh.rotation.set(
        (Math.random() - 0.5) * 0.4,
        -angle - Math.PI / 2 + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      ivyMesh.castShadow = true;
      ivyGroup.add(ivyMesh);

      if (i % 3 === 0) {
        const sideAngle = angle + 0.45;
        const sx = Math.cos(sideAngle) * (rad + 0.001);
        const sz = Math.sin(sideAngle) * (rad + 0.001);
        const branchLeaf = new THREE.Mesh(ivyGeom, (i % 4 === 0) ? arcticIvyCyanMat : arcticIvyMat);
        branchLeaf.position.set(sx, y - 0.012, sz);
        branchLeaf.scale.setScalar(leafScale * 0.82);
        branchLeaf.rotation.set(0.1, -sideAngle - Math.PI / 2, -0.15);
        ivyGroup.add(branchLeaf);
      }
    }
  }

  if (vinePoints.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(vinePoints);
    const tubeGeom = new THREE.TubeGeometry(curve, 28, 0.0035, 6, false);
    const tubeMesh = new THREE.Mesh(tubeGeom, ivyStemMat);
    tubeMesh.castShadow = true;
    ivyGroup.add(tubeMesh);
  }

  for (let b = 0; b < 3; b++) {
    const bAngle = b * 2.1 + 0.8;
    const bRad = rx * 0.85;
    const bx = Math.cos(bAngle) * bRad;
    const bz = Math.sin(bAngle) * bRad;
    const baseLeaf = new THREE.Mesh(ivyGeom, arcticIvyMat);
    baseLeaf.position.set(bx, 0.01, bz);
    baseLeaf.scale.setScalar(0.28);
    baseLeaf.rotation.set(-1.1, -bAngle, 0.2);
    ivyGroup.add(baseLeaf);
  }

  const dropAngle = isRuined ? 2.4 : 1.1;
  const dropRad = rx * 0.88;
  const dx = Math.cos(dropAngle) * dropRad;
  const dz = Math.sin(dropAngle) * dropRad;
  const dropLeaf = new THREE.Mesh(ivyGeom, arcticIvyCyanMat);
  dropLeaf.position.set(dx, h * (isRuined ? 0.80 : 0.95), dz);
  dropLeaf.scale.setScalar(0.26);
  dropLeaf.rotation.set(2.8, -dropAngle, 0);
  ivyGroup.add(dropLeaf);

  wrapper.add(ivyGroup);
  return wrapper;
}

function prepareEnvProp(gltf, targetHeight = null) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const rawHeight = Math.max(0.001, box.max.y - box.min.y);
  const s = (targetHeight !== null) ? (targetHeight / rawHeight) : 1.0;

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        if (!child.material.roughnessMap) {
          child.material.roughness = 0.85;
        }
      }
    }
  });

  const wrapper = new THREE.Group();
  root.scale.set(s, s, s);
  root.position.x = -center.x * s;
  root.position.z = -center.z * s;
  root.position.y = -box.min.y * s;
  wrapper.add(root);
  return wrapper;
}

function prepareSnowman(gltf, targetHeight = 1.35) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const rawHeight = Math.max(0.001, box.max.y - box.min.y);
  const s = (targetHeight !== null) ? (targetHeight / rawHeight) : 1.0;

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = Math.max(0.68, child.material.roughness || 0.75);
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.name = 'arctic_snowman';
  root.scale.set(s, s, s);
  root.position.x = -center.x * s;
  root.position.z = -center.z * s;
  root.position.y = -box.min.y * s;
  wrapper.add(root);
  return wrapper;
}

function prepareMarket(gltf, targetHeight = 3.2) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const rawHeight = Math.max(0.001, box.max.y - box.min.y);
  const s = (targetHeight !== null) ? (targetHeight / rawHeight) : 1.0;

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = Math.max(0.70, child.material.roughness || 0.80);
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.name = 'arctic_market';
  root.scale.set(s, s, s);
  root.position.x = -center.x * s;
  root.position.z = -center.z * s;
  root.position.y = -box.min.y * s;
  wrapper.add(root);
  return wrapper;
}

function prepareHouse(gltf, targetHeight = 6.2) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const rawHeight = Math.max(0.001, box.max.y - box.min.y);
  const s = (targetHeight !== null) ? (targetHeight / rawHeight) : 1.0;

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = Math.max(0.65, child.material.roughness || 0.75);
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.name = 'arctic_house';
  root.scale.set(s, s, s);
  root.position.x = -center.x * s;
  root.position.z = -center.z * s;
  root.position.y = -box.min.y * s;
  wrapper.add(root);
  return wrapper;
}

function prepareMushroom(gltf, stemMat, capMat) {
  const root = gltf.scene.clone();
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const matName = (child.material && child.material.name) ? child.material.name.toLowerCase() : '';
      if (matName.includes('beige') || matName.includes('stem')) {
        child.material = stemMat;
      } else {
        child.material = capMat;
      }
    }
  });
  return root;
}

function prepareMagicalCrystal(gltf, magicalCrystalMat, customScale = 1.0) {
  const root = gltf.scene.clone(true);
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = magicalCrystalMat;
    }
  });
  if (customScale !== 1.0) {
    root.scale.multiplyScalar(customScale);
  }
  return root;
}

function prepareMysticColumn(gltf, isRuined = false) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const mysticColStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4a4358,
    roughness: 0.86,
    metalness: 0.06
  });

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = mysticColStoneMat;
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);

  const h = size.y;
  const rx = size.x * 0.5;
  const rz = size.z * 0.5;
  const shaftRadius = (rx + rz) * 0.44;

  const ivyGroup = new THREE.Group();
  ivyGroup.name = 'mystic_creeping_ivy';

  const mysticIvyMat = new THREE.MeshStandardMaterial({
    color: 0xdb2777,
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const mysticIvyVioletMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const ivyStemMat = new THREE.MeshStandardMaterial({
    color: 0x4a154b,
    roughness: 0.80,
    metalness: 0.02
  });

  const ivyGeom = createStoneIvyClusterGeometry();
  const totalSteps = 16;
  const topT = isRuined ? 0.78 : 0.88;
  const vinePoints = [];

  for (let i = 0; i <= totalSteps; i++) {
    const t = (i / totalSteps) * topT;
    const angle = t * Math.PI * 3.8 + (isRuined ? 1.2 : 0.4);
    const y = t * h;
    const rad = shaftRadius * (1.0 + Math.sin(t * Math.PI * 6.0) * 0.06) + 0.003;
    const vx = Math.cos(angle) * rad;
    const vz = Math.sin(angle) * rad;
    vinePoints.push(new THREE.Vector3(vx, y, vz));

    if (i > 0 && i < totalSteps) {
      const ivyMesh = new THREE.Mesh(ivyGeom, (i % 2 === 0) ? mysticIvyMat : mysticIvyVioletMat);
      ivyMesh.position.set(vx, y, vz);
      const leafScale = 0.22 + (Math.sin(i * 1.7) * 0.06);
      ivyMesh.scale.setScalar(leafScale);
      ivyMesh.rotation.set(
        (Math.random() - 0.5) * 0.4,
        -angle - Math.PI / 2 + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      ivyMesh.castShadow = true;
      ivyGroup.add(ivyMesh);

      if (i % 3 === 0) {
        const sideAngle = angle + 0.45;
        const sx = Math.cos(sideAngle) * (rad + 0.001);
        const sz = Math.sin(sideAngle) * (rad + 0.001);
        const branchLeaf = new THREE.Mesh(ivyGeom, (i % 4 === 0) ? mysticIvyVioletMat : mysticIvyMat);
        branchLeaf.position.set(sx, y - 0.012, sz);
        branchLeaf.scale.setScalar(leafScale * 0.82);
        branchLeaf.rotation.set(0.1, -sideAngle - Math.PI / 2, -0.15);
        ivyGroup.add(branchLeaf);
      }
    }
  }

  if (vinePoints.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(vinePoints);
    const tubeGeom = new THREE.TubeGeometry(curve, 28, 0.0035, 6, false);
    const tubeMesh = new THREE.Mesh(tubeGeom, ivyStemMat);
    tubeMesh.castShadow = true;
    ivyGroup.add(tubeMesh);
  }

  for (let b = 0; b < 3; b++) {
    const bAngle = b * 2.1 + 0.8;
    const bRad = rx * 0.85;
    const bx = Math.cos(bAngle) * bRad;
    const bz = Math.sin(bAngle) * bRad;
    const baseLeaf = new THREE.Mesh(ivyGeom, mysticIvyMat);
    baseLeaf.position.set(bx, 0.01, bz);
    baseLeaf.scale.setScalar(0.28);
    baseLeaf.rotation.set(-1.1, -bAngle, 0.2);
    ivyGroup.add(baseLeaf);
  }

  const dropAngle = isRuined ? 2.4 : 1.1;
  const dropRad = rx * 0.88;
  const dx = Math.cos(dropAngle) * dropRad;
  const dz = Math.sin(dropAngle) * dropRad;
  const dropLeaf = new THREE.Mesh(ivyGeom, mysticIvyVioletMat);
  dropLeaf.position.set(dx, h * (isRuined ? 0.80 : 0.95), dz);
  dropLeaf.scale.setScalar(0.26);
  dropLeaf.rotation.set(2.8, -dropAngle, 0);
  ivyGroup.add(dropLeaf);

  wrapper.add(ivyGroup);
  return wrapper;
}

function prepareDungeonMushroom(gltf, stemMat, capMat) {
  const root = gltf.scene.clone();
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const matName = (child.material && child.material.name) ? child.material.name.toLowerCase() : '';
      if (matName.includes('beige') || matName.includes('stem')) {
        child.material = stemMat;
      } else {
        child.material = capMat;
      }
    }
  });
  return root;
}

function prepareDungeonProp(gltf, targetHeight = 1.2) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const rawHeight = Math.max(0.001, box.max.y - box.min.y);
  const s = (targetHeight !== null) ? (targetHeight / rawHeight) : 1.0;

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = 0.85;
      }
    }
  });

  const wrapper = new THREE.Group();
  root.scale.set(s, s, s);
  root.position.x = -center.x * s;
  root.position.z = -center.z * s;
  root.position.y = -box.min.y * s;
  wrapper.add(root);
  return wrapper;
}

function prepareDungeonColumn(gltf, dungeonBasaltMat, isRuined = false) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = dungeonBasaltMat;
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareDungeonTorch(torchGltf, targetHeight = 1.85) {
  const root = torchGltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const rawHeight = Math.max(0.001, box.max.y - box.min.y);
  const s = (targetHeight !== null) ? (targetHeight / rawHeight) : 1.0;

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = 0.82;
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.name = 'dungeon_torch';
  root.scale.set(s, s, s);
  root.position.x = -center.x * s;
  root.position.z = -center.z * s;
  root.position.y = -box.min.y * s;
  wrapper.add(root);

  const flame = new TorchFlameGPU({ scale: 0.85 });
  flame.group.position.set(0, targetHeight * 0.94, 0);
  wrapper.add(flame.group);

  return { mesh: wrapper, flame };
}

function prepareAshTwistedTree(gltf, ashColorHex = 0x475569, deadWoodMat) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const mat = child.material;
      if (mat) {
        const matName = (mat.name || '').toLowerCase();
        if (matName.includes('leaf') || matName.includes('leaves')) {
          const leafMat = mat.clone();
          leafMat.side = THREE.DoubleSide;
          leafMat.alphaTest = 0.45;
          leafMat.transparent = true;
          leafMat.roughness = 0.85;
          leafMat.customProgramCacheKey = () => 'ash_leaf_' + ashColorHex;
          leafMat.onBeforeCompile = (shader) => {
            shader.uniforms.uLeafTint = { value: new THREE.Color(ashColorHex) };
            shader.fragmentShader = `
              uniform vec3 uLeafTint;
              ${shader.fragmentShader}
            `.replace(
              '#include <color_fragment>',
              `
              #include <color_fragment>
              float leafLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
              diffuseColor.rgb = uLeafTint * (leafLum * 0.60 + 0.40);
              `
            );
          };
          child.material = leafMat;
        } else {
          child.material = deadWoodMat;
        }
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareLeaflessTwistedTree(gltf, deadWoodMat) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.traverse((child) => {
    if (child.isMesh) {
      const name = (child.name || '').toLowerCase();
      const matName = (child.material && child.material.name) ? child.material.name.toLowerCase() : '';
      if (name.includes('leaf') || name.includes('leaves') || matName.includes('leaf') || matName.includes('leaves')) {
        child.visible = false;
      } else {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = deadWoodMat;
      }
    }
  });

  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  wrapper.add(root);
  return wrapper;
}

function prepareDeadTree(gltf, deadWoodMat) {
  const root = gltf.scene.clone();
  root.traverse((child) => {
    if (child.isMesh) {
      const name = (child.name || '').toLowerCase();
      const matName = (child.material && child.material.name) ? child.material.name.toLowerCase() : '';
      if (name.includes('leaf') || name.includes('green') || matName.includes('leaf') || matName.includes('green')) {
        child.visible = false;
      } else {
        child.material = deadWoodMat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }
  });
  return root;
}

function prepareObsidianLavaRock(gltf, obsidianLavaMat, customScale = 1.0) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = obsidianLavaMat;
    }
  });
  const wrapper = new THREE.Group();
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  if (customScale !== 1.0) {
    wrapper.scale.setScalar(customScale);
  }
  wrapper.add(root);
  return wrapper;
}

export class BiomeDecorationManager {
  constructor(scene, collisions, renderer = null) {
    this.scene = scene;
    this.collisions = collisions;
    this.renderer = renderer;
    this.currentBiome = 'forest';
    this.currentGx = 2;
    this.currentGy = 2;

    this.savannahGroup = new THREE.Group();
    this.savannahGroup.name = 'biome_decorations_savannah';
    this.savannahGroup.visible = false;
    this.scene.add(this.savannahGroup);

    this.savannahGroup_3_1 = new THREE.Group();
    this.savannahGroup_3_1.name = 'biome_decorations_savannah_3_1';
    this.savannahGroup.add(this.savannahGroup_3_1);

    this.savannahGroup_3_2 = new THREE.Group();
    this.savannahGroup_3_2.name = 'biome_decorations_savannah_3_2';
    this.savannahGroup.add(this.savannahGroup_3_2);

    this.arcticGroup = new THREE.Group();
    this.arcticGroup.name = 'biome_decorations_arctic';
    this.arcticGroup.visible = false;
    this.scene.add(this.arcticGroup);

    this.arcticGroup_2_1 = new THREE.Group();
    this.arcticGroup_2_1.name = 'biome_decorations_arctic_2_1';
    this.arcticGroup.add(this.arcticGroup_2_1);

    this.arcticGroup_1_1 = new THREE.Group();
    this.arcticGroup_1_1.name = 'biome_decorations_arctic_1_1';
    this.arcticGroup.add(this.arcticGroup_1_1);

    this.mysticGroup = new THREE.Group();
    this.mysticGroup.name = 'biome_decorations_mystic';
    this.mysticGroup.visible = false;
    this.scene.add(this.mysticGroup);

    this.mysticGroup_1_2 = new THREE.Group();
    this.mysticGroup_1_2.name = 'biome_decorations_mystic_1_2';
    this.mysticGroup.add(this.mysticGroup_1_2);

    this.mysticGroup_1_3 = new THREE.Group();
    this.mysticGroup_1_3.name = 'biome_decorations_mystic_1_3';
    this.mysticGroup.add(this.mysticGroup_1_3);

    this.dungeonGroup = new THREE.Group();
    this.dungeonGroup.name = 'biome_decorations_dungeon';
    this.dungeonGroup.visible = false;
    this.scene.add(this.dungeonGroup);

    this.dungeonGroup_2_3 = new THREE.Group();
    this.dungeonGroup_2_3.name = 'biome_decorations_dungeon_2_3';
    this.dungeonGroup.add(this.dungeonGroup_2_3);

    this.dungeonGroup_3_3 = new THREE.Group();
    this.dungeonGroup_3_3.name = 'biome_decorations_dungeon_3_3';
    this.dungeonGroup.add(this.dungeonGroup_3_3);

    this.models = {};
    this.arcticModels = {};
    this.mysticModels = {};
    this.dungeonModels = {};
    this.tallCactusPositions = [];
    this.savannahTrees_3_1 = [];
    this.savannahTrees_3_2 = [];
    this.savannahRocks_3_1 = [];
    this.savannahRocks_3_2 = [];
    this.savannahColumns_3_2 = [];
    this.sentinelOutpostCollisions_3_2 = [];
    this.blacksmithCollisions_3_1 = [];
    this.tallCactusPositions_3_1 = [];
    this.tallCactusPositions_3_2 = [];
    this.arcticTrees_2_1 = [];
    this.arcticIceRocks_2_1 = [];
    this.arcticTrees_1_1 = [];
    this.arcticIceRocks_1_1 = [];
    this.arcticColumns_2_1 = [];
    this.arcticColumns_1_1 = [];
    this.arcticSnowmen_2_1 = [];
    this.arcticSnowmen_1_1 = [];
    this.arcticMarketCollisions_2_1 = [];
    this.arcticRockPositions = [];
    this.mysticTrees_1_2 = [];
    this.mysticCrystals_1_2 = [];
    this.mysticLinters_1_2 = [];
    this.mysticTrees_1_3 = [];
    this.mysticCrystals_1_3 = [];
    this.mysticLinters_1_3 = [];
    this.mysticColumns_1_3 = [];
    this.mysticCollisionPositions = [];
    this.dungeonTrees_2_3 = [];
    this.dungeonRocks_2_3 = [];
    this.dungeonGraveyard_2_3 = [];
    this.dungeonTorches_2_3 = [];
    this.activeDungeonTorches_2_3 = [];
    this.dungeonTrees_3_3 = [];
    this.dungeonRocks_3_3 = [];
    this.dungeonGraveyard_3_3 = [];
    this.dungeonTorches_3_3 = [];
    this.dungeonArchway_3_3 = [];
    this.dungeonColumns_3_3 = [];
    this.activeDungeonTorches_3_3 = [];
    this.dungeonLavaMaterials = [];
    this.dungeonCollisionPositions = [];

    // Lazy-loading and memory management infrastructure
    this.loader = new GLTFLoader();
    this.gltfCache = new Map();
    this.loadedBiomes = new Set();
    this.loadingPromises = new Map();
    this.isLoaded = false;
  }

  async init() {
    console.log('[BiomeDecorationManager] Initialized with on-demand (Lazy Loading) architecture.');
    this.isLoaded = true;
    if (this.currentBiome && this.currentBiome !== 'forest') {
      await this.ensureBiomeLoaded(this.currentBiome, this.currentGx, this.currentGy);
    }
  }

  async _loadGLTF(path) {
    if (this.gltfCache.has(path)) {
      return this.gltfCache.get(path);
    }
    const gltf = await this.loader.loadAsync(path);
    this.gltfCache.set(path, gltf);
    return gltf;
  }

  _deepDisposeObject(obj) {
    if (!obj) return;
    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    const disposedTextures = new Set();

    obj.traverse((child) => {
      // 1. Dispose geometry safely
      if (child.geometry && !disposedGeometries.has(child.geometry)) {
        disposedGeometries.add(child.geometry);
        child.geometry.dispose();
      }

      // 2. Dispose materials and their textures (closing ImageBitmaps)
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!mat || disposedMaterials.has(mat)) return;
          disposedMaterials.add(mat);

          const texKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'emissiveMap', 'bumpMap', 'displacementMap', 'envMap', 'lightMap'];
          for (const key of texKeys) {
            const val = mat[key];
            if (val && val.isTexture && !disposedTextures.has(val)) {
              disposedTextures.add(val);
              disposeTextureDeep(val);
            }
          }

          for (const key of Object.keys(mat)) {
            const val = mat[key];
            if (val && val.isTexture && !disposedTextures.has(val)) {
              disposedTextures.add(val);
              disposeTextureDeep(val);
            }
          }

          if (mat.uniforms) {
            for (const uKey of Object.keys(mat.uniforms)) {
              const uVal = mat.uniforms[uKey]?.value;
              if (uVal && uVal.isTexture && !disposedTextures.has(uVal)) {
                disposedTextures.add(uVal);
                disposeTextureDeep(uVal);
              }
            }
          }

          mat.dispose();
        });
      }
    });
  }

  unloadBiome(biomeId, renderer = null) {
    if (!biomeId || biomeId === 'forest' || !this.loadedBiomes.has(biomeId)) {
      return;
    }

    console.log(`[BiomeDecorationManager] ♻️ Unloading and disposing biome '${biomeId}' to free RAM/VRAM...`);

    let targetGroup = null;
    let subGroup1 = null;
    let subGroup2 = null;
    let assetList = null;

    if (biomeId === 'savannah') {
      targetGroup = this.savannahGroup;
      subGroup1 = this.savannahGroup_3_1;
      subGroup2 = this.savannahGroup_3_2;
      assetList = SAVANNAH_ASSETS;
      this.models = {};
      this.savannahTrees_3_1 = [];
      this.savannahTrees_3_2 = [];
      this.savannahRocks_3_1 = [];
      this.savannahRocks_3_2 = [];
      this.savannahColumns_3_2 = [];
      this.sentinelOutpostCollisions_3_2 = [];
      this.blacksmithCollisions_3_1 = [];
      this.tallCactusPositions_3_1 = [];
      this.tallCactusPositions_3_2 = [];
    } else if (biomeId === 'arctic') {
      targetGroup = this.arcticGroup;
      subGroup1 = this.arcticGroup_2_1;
      subGroup2 = this.arcticGroup_1_1;
      assetList = ARCTIC_ASSETS;
      this.arcticModels = {};
      this.arcticTrees_2_1 = [];
      this.arcticIceRocks_2_1 = [];
      this.arcticTrees_1_1 = [];
      this.arcticIceRocks_1_1 = [];
      this.arcticColumns_2_1 = [];
      this.arcticColumns_1_1 = [];
      this.arcticSnowmen_2_1 = [];
      this.arcticSnowmen_1_1 = [];
      this.arcticMarketCollisions_2_1 = [];
      this.arcticRockPositions = [];
    } else if (biomeId === 'mystic') {
      targetGroup = this.mysticGroup;
      subGroup1 = this.mysticGroup_1_2;
      subGroup2 = this.mysticGroup_1_3;
      assetList = MYSTIC_ASSETS;
      this.mysticModels = {};
      this.mysticTrees_1_2 = [];
      this.mysticCrystals_1_2 = [];
      this.mysticLinters_1_2 = [];
      this.mysticTrees_1_3 = [];
      this.mysticCrystals_1_3 = [];
      this.mysticLinters_1_3 = [];
      this.mysticColumns_1_3 = [];
      this.mysticCollisionPositions = [];
    } else if (biomeId === 'dungeon') {
      targetGroup = this.dungeonGroup;
      subGroup1 = this.dungeonGroup_2_3;
      subGroup2 = this.dungeonGroup_3_3;
      assetList = DUNGEON_ASSETS;
      this.dungeonModels = {};
      this.dungeonTrees_2_3 = [];
      this.dungeonRocks_2_3 = [];
      this.dungeonGraveyard_2_3 = [];
      this.dungeonTorches_2_3 = [];
      if (this.activeDungeonTorches_2_3) {
        this.activeDungeonTorches_2_3.forEach(t => t.dispose && t.dispose());
      }
      this.activeDungeonTorches_2_3 = [];
      this.dungeonTrees_3_3 = [];
      this.dungeonRocks_3_3 = [];
      this.dungeonGraveyard_3_3 = [];
      this.dungeonTorches_3_3 = [];
      this.dungeonArchway_3_3 = [];
      this.dungeonColumns_3_3 = [];
      if (this.activeDungeonTorches_3_3) {
        this.activeDungeonTorches_3_3.forEach(t => t.dispose && t.dispose());
      }
      this.activeDungeonTorches_3_3 = [];
      this.dungeonLavaMaterials = [];
      this.dungeonCollisionPositions = [];
    }

    // 1. Deep dispose all scene instances and children
    if (targetGroup) {
      targetGroup.visible = false;
      this._deepDisposeObject(targetGroup);
      if (subGroup1) subGroup1.clear();
      if (subGroup2) subGroup2.clear();
    }

    // 2. Dispose and remove cached GLTF scenes from memory
    if (assetList && Array.isArray(assetList)) {
      for (const assetPath of assetList) {
        if (this.gltfCache.has(assetPath)) {
          const gltf = this.gltfCache.get(assetPath);
          if (gltf && gltf.scene) {
            this._deepDisposeObject(gltf.scene);
          }
          this.gltfCache.delete(assetPath);
        }
      }
    }

    // 3. Clear material caches
    clearSharedMaterialCaches();

    // 4. Purge WebGLRenderer cached render lists & states
    const activeRenderer = renderer || this.renderer;
    if (activeRenderer) {
      if (activeRenderer.renderLists && typeof activeRenderer.renderLists.dispose === 'function') {
        activeRenderer.renderLists.dispose();
      }
      if (activeRenderer.renderStates && typeof activeRenderer.renderStates.dispose === 'function') {
        activeRenderer.renderStates.dispose();
      }
    }

    // 5. Remove biome from loaded set
    this.loadedBiomes.delete(biomeId);
    console.log(`[BiomeDecorationManager] Biome '${biomeId}' successfully unloaded and freed.`);
  }

  async ensureBiomeLoaded(biomeId, gx = null, gy = null) {
    if (!biomeId || biomeId === 'forest') return;
    if (gx !== null) this.currentGx = gx;
    if (gy !== null) this.currentGy = gy;

    if (this.loadedBiomes.has(biomeId)) {
      return;
    }

    if (this.loadingPromises.has(biomeId)) {
      await this.loadingPromises.get(biomeId);
      return;
    }

    let loadPromise = null;
    if (biomeId === 'savannah') {
      // Bioma de sabana anterior desactivado en favor de la nueva Isla de la Sabana (SavannaZone)
      this.loadedBiomes.add('savannah');
      return;
    } else if (biomeId === 'arctic') {
      loadPromise = this._loadArctic();
    } else if (biomeId === 'mystic') {
      loadPromise = this._loadMystic();
    } else if (biomeId === 'dungeon') {
      loadPromise = this._loadDungeon();
    }

    if (loadPromise) {
      this.loadingPromises.set(biomeId, loadPromise);
      try {
        await loadPromise;
        this.loadedBiomes.add(biomeId);
        console.log(`[BiomeDecorationManager] Biome '${biomeId}' loaded and instantiated successfully on-demand.`);
      } catch (err) {
        console.error(`[BiomeDecorationManager] Failed to load biome '${biomeId}':`, err);
      } finally {
        this.loadingPromises.delete(biomeId);
      }
    }

    if (this.currentBiome === biomeId) {
      this.setBiome(biomeId, this.currentGx, this.currentGy);
    }
  }

  async _loadSavannah() {
    console.log('[BiomeDecorationManager] Lazy loading Savannah assets...');
    const [
      cactusTallGltf,
      cactusShortGltf,
      rockSmallAGltf,
      rockSmallBGltf,
      rockSmallFlatAGltf,
      stoneSmallAGltf,
      twistedTree1Gltf,
      twistedTree2Gltf,
      twistedTree3Gltf,
      twistedTree4Gltf,
      twistedTree5Gltf,
      palmTree1Gltf,
      palmTree2Gltf,
      palmTree3Gltf,
      palmTree4Gltf,
      palmTree5Gltf,
      rockSabana1Gltf,
      rockSabana2Gltf,
      rockSabana3Gltf,
      rockSabana4Gltf,
      rockSabana5Gltf,
      bushCommonGltf,
      plant1BigGltf,
      fern1Gltf,
      grassShortGltf,
      flower3GroupGltf,
      columnGltf,
      column2Gltf,
      jarraSabana1Gltf,
      jarraSabana2Gltf,
      jarraSabana3Gltf,
      jarraSabana4Gltf,
      linterSabanaGltf,
      chestGltf,
      blacksmithGltf
    ] = await Promise.all([
      this._loadGLTF('./assets/savannah/cactus_tall.glb'),
      this._loadGLTF('./assets/savannah/cactus_short.glb'),
      this._loadGLTF('./assets/savannah/rock_smallA.glb'),
      this._loadGLTF('./assets/savannah/rock_smallB.glb'),
      this._loadGLTF('./assets/savannah/rock_smallFlatA.glb'),
      this._loadGLTF('./assets/savannah/stone_smallA.glb'),
      this._loadGLTF('./assets/nature/TwistedTree_1.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_2.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_3.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_4.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_5.gltf'),
      this._loadGLTF('./assets/nature/palms/PalmTree_1.glb'),
      this._loadGLTF('./assets/nature/palms/PalmTree_2.glb'),
      this._loadGLTF('./assets/nature/palms/PalmTree_3.glb'),
      this._loadGLTF('./assets/nature/palms/PalmTree_4.glb'),
      this._loadGLTF('./assets/nature/palms/PalmTree_5.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana1.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana2.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana3.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana4.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana5.glb'),
      this._loadGLTF('./assets/nature/Bush_Common.gltf'),
      this._loadGLTF('./assets/nature/Plant_1_Big.gltf'),
      this._loadGLTF('./assets/nature/Fern_1.gltf'),
      this._loadGLTF('./assets/nature/Grass_Common_Short.gltf'),
      this._loadGLTF('./assets/nature/Flower_3_Group.gltf'),
      this._loadGLTF('./assets/environment/column.glb'),
      this._loadGLTF('./assets/environment/column2.glb'),
      this._loadGLTF('./assets/environment/jarra_sabana.glb'),
      this._loadGLTF('./assets/environment/jarra_sabana2.glb'),
      this._loadGLTF('./assets/environment/jarra_sabana3.glb'),
      this._loadGLTF('./assets/environment/jarra_sabana4.glb'),
      this._loadGLTF('./assets/environment/linter_sabana.glb'),
      this._loadGLTF('./assets/environment/chest.glb'),
      this._loadGLTF('./assets/environment/blacksmith.glb')
    ]);

    const cactusMat = new THREE.MeshStandardMaterial({
      color: 0xDA7635,
      roughness: 0.80,
      metalness: 0.05
    });

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9e8a75,
      roughness: 0.90,
      metalness: 0.0
    });

    const rockFlatMat = new THREE.MeshStandardMaterial({
      color: 0xa8947d,
      roughness: 0.92,
      metalness: 0.0
    });

    const LEAF_ORANGE = 0xDF6226;
    const LEAF_YELLOW = 0xBFA832;

    this.models = {
      cactusTall: () => prepareModel(cactusTallGltf, cactusMat),
      cactusShort: () => prepareModel(cactusShortGltf, cactusMat),
      rockA: () => prepareModel(rockSmallAGltf, rockMat),
      rockB: () => prepareModel(rockSmallBGltf, rockMat),
      rockFlat: () => prepareModel(rockSmallFlatAGltf, rockFlatMat),
      stoneA: () => prepareModel(stoneSmallAGltf, rockMat),
      palm1: () => preparePalm(palmTree1Gltf),
      palm2: () => preparePalm(palmTree2Gltf),
      palm3: () => preparePalm(palmTree3Gltf),
      palm4: () => preparePalm(palmTree4Gltf),
      palm5: () => preparePalm(palmTree5Gltf),
      twisted1: (color = LEAF_ORANGE) => prepareTwistedTree(twistedTree1Gltf, color),
      twisted2: (color = LEAF_YELLOW) => prepareTwistedTree(twistedTree2Gltf, color),
      twisted3: (color = LEAF_ORANGE) => prepareTwistedTree(twistedTree3Gltf, color),
      twisted4: (color = LEAF_YELLOW) => prepareTwistedTree(twistedTree4Gltf, color),
      twisted5: (color = LEAF_ORANGE) => prepareTwistedTree(twistedTree5Gltf, color),
      rockSabana1: (color = 0xD48E55) => prepareSavannahRock(rockSabana1Gltf, color),
      rockSabana2: (color = 0xCE854E) => prepareSavannahRock(rockSabana2Gltf, color),
      rockSabana3: (color = 0xDE965B) => prepareSavannahRock(rockSabana3Gltf, color),
      rockSabana4: (color = 0xC8804A) => prepareSavannahRock(rockSabana4Gltf, color),
      rockSabana5: (color = 0xD89258) => prepareSavannahRock(rockSabana5Gltf, color),
      bushCommon: (color = 0x3D5224) => prepareBushCommon(bushCommonGltf, color),
      plant1Big: () => preparePlant(plant1BigGltf),
      fern1: () => preparePlant(fern1Gltf),
      grassTuft: (color = 0xC8A048) => prepareGrassTuft(grassShortGltf, color),
      flowerGroup: () => prepareFlowerGroup(flower3GroupGltf),
      column: () => prepareColumn(columnGltf),
      column2: () => prepareColumn(column2Gltf),
      jarraSabana1: () => prepareEnvProp(jarraSabana1Gltf, 0.65),
      jarraSabana2: () => prepareEnvProp(jarraSabana2Gltf, 1.10),
      jarraSabana3: () => prepareEnvProp(jarraSabana3Gltf, 1.05),
      jarraSabana4: () => prepareEnvProp(jarraSabana4Gltf, 0.58),
      linterSabana: () => prepareEnvProp(linterSabanaGltf, 1.45),
      chest: () => prepareEnvProp(chestGltf, 1.25),
      blacksmith: (targetHeight = 3.2) => prepareEnvProp(blacksmithGltf, targetHeight)
    };

    this._buildSavannahDecorations();
  }

  async _loadArctic() {
    console.log('[BiomeDecorationManager] Lazy loading Arctic assets...');
    const [
      bushGltf,
      bushDetailedGltf,
      bushSmallGltf,
      arcticRockAGltf,
      arcticRockBGltf,
      arcticRockFlatGltf,
      arcticStoneAGltf,
      pine1Gltf,
      pine2Gltf,
      pine3Gltf,
      pine4Gltf,
      pine5Gltf,
      bushCommonGltf,
      bushCommonFlowersGltf,
      flower4GroupGltf,
      flower3GroupGltf,
      flower3SingleGltf,
      rockMedium1Gltf,
      rockMedium2Gltf,
      rockMedium3Gltf,
      rockSabana1Gltf,
      rockSabana3Gltf,
      snowmanGltf,
      marketArticGltf,
      houseArticGltf,
      columnGltf,
      column2Gltf,
      fern1Gltf,
      plant1BigGltf,
      grassShortGltf
    ] = await Promise.all([
      this._loadGLTF('./assets/arctic/plant_bush.glb'),
      this._loadGLTF('./assets/arctic/plant_bushDetailed.glb'),
      this._loadGLTF('./assets/arctic/plant_bushSmall.glb'),
      this._loadGLTF('./assets/arctic/rock_smallA.glb'),
      this._loadGLTF('./assets/arctic/rock_smallB.glb'),
      this._loadGLTF('./assets/arctic/rock_smallFlatA.glb'),
      this._loadGLTF('./assets/arctic/stone_smallA.glb'),
      this._loadGLTF('./assets/nature/Pine_1.gltf'),
      this._loadGLTF('./assets/nature/Pine_2.gltf'),
      this._loadGLTF('./assets/nature/Pine_3.gltf'),
      this._loadGLTF('./assets/nature/Pine_4.gltf'),
      this._loadGLTF('./assets/nature/Pine_5.gltf'),
      this._loadGLTF('./assets/nature/Bush_Common.gltf'),
      this._loadGLTF('./assets/nature/Bush_Common_Flowers.gltf'),
      this._loadGLTF('./assets/nature/Flower_4_Group.gltf'),
      this._loadGLTF('./assets/nature/Flower_3_Group.gltf'),
      this._loadGLTF('./assets/nature/Flower_3_Single.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_1.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_2.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_3.gltf'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana1.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana3.glb'),
      this._loadGLTF('./assets/environment/snowman_artic.glb'),
      this._loadGLTF('./assets/environment/market_artic.glb'),
      this._loadGLTF('./assets/environment/house_artic.glb'),
      this._loadGLTF('./assets/environment/column.glb'),
      this._loadGLTF('./assets/environment/column2.glb'),
      this._loadGLTF('./assets/nature/Fern_1.gltf'),
      this._loadGLTF('./assets/nature/Plant_1_Big.gltf'),
      this._loadGLTF('./assets/nature/Grass_Common_Short.gltf')
    ]);

    const arcticPineNeedlesMat = createArcticPineMaterial(0x226b63, 0.82);
    const arcticTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x3e322a,
      roughness: 0.90,
      metalness: 0.0
    });
    const glacialIceMat = createGlacialIceMaterial(0x58c4e8);
    const arcticBushMat = createSnowCapMaterial(0x1f5446, 0.82, 0.20);
    const arcticBushFlowersMat = createSnowCapMaterial(0x245e4e, 0.80, 0.22);
    const frostFlowerMatBlue = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.65,
      metalness: 0.05
    });
    const frostFlowerMatWhite = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.60,
      metalness: 0.05
    });
    const frostFlowerMatIce = new THREE.MeshStandardMaterial({
      color: 0xc7d2fe,
      roughness: 0.62,
      metalness: 0.05
    });
    const arcticFernMat = createSnowCapMaterial(0x1d5248, 0.80, 0.24);
    const arcticPlantMat = createSnowCapMaterial(0x256455, 0.82, 0.22);

    this.arcticModels = {
      pine1: () => prepareArcticPine(pine1Gltf, arcticPineNeedlesMat, arcticTrunkMat),
      pine2: () => prepareArcticPine(pine2Gltf, arcticPineNeedlesMat, arcticTrunkMat),
      pine3: () => prepareArcticPine(pine3Gltf, arcticPineNeedlesMat, arcticTrunkMat),
      pine4: () => prepareArcticPine(pine4Gltf, arcticPineNeedlesMat, arcticTrunkMat),
      pine5: () => prepareArcticPine(pine5Gltf, arcticPineNeedlesMat, arcticTrunkMat),
      iceRockA: () => prepareIceRock(arcticRockAGltf, glacialIceMat),
      iceRockB: () => prepareIceRock(arcticRockBGltf, glacialIceMat),
      iceRockFlat: () => prepareIceRock(arcticRockFlatGltf, glacialIceMat),
      iceStoneA: () => prepareIceRock(arcticStoneAGltf, glacialIceMat),
      iceMedium1: () => prepareIceRock(rockMedium1Gltf, glacialIceMat, 1.8),
      iceMedium2: () => prepareIceRock(rockMedium2Gltf, glacialIceMat, 1.8),
      iceMedium3: () => prepareIceRock(rockMedium3Gltf, glacialIceMat, 1.8),
      iceSabana1: () => prepareIceRock(rockSabana1Gltf, glacialIceMat, 0.85),
      iceSabana3: () => prepareIceRock(rockSabana3Gltf, glacialIceMat, 0.85),
      bush: () => prepareModel(bushGltf, arcticBushMat),
      bushDetailed: () => prepareModel(bushDetailedGltf, arcticBushMat),
      bushSmall: () => prepareModel(bushSmallGltf, arcticBushMat),
      bushCommonSnow: () => prepareModel(bushCommonGltf, arcticBushMat),
      bushFlowersSnow: () => prepareModel(bushCommonFlowersGltf, arcticBushFlowersMat),
      frostFlower3Group: () => prepareModel(flower3GroupGltf, frostFlowerMatBlue),
      frostFlower4Group: () => prepareModel(flower4GroupGltf, frostFlowerMatWhite),
      frostFlower3Single: () => prepareModel(flower3SingleGltf, frostFlowerMatIce),
      frostFern: () => prepareModel(fern1Gltf, arcticFernMat),
      frostPlantBig: () => prepareModel(plant1BigGltf, arcticPlantMat),
      frostGrassTuft: () => prepareGrassTuft(grassShortGltf, 0x93c5fd),
      column: () => prepareArcticColumn(columnGltf, false),
      columnRuined: () => prepareArcticColumn(column2Gltf, true),
      snowman: (height = 1.35) => prepareSnowman(snowmanGltf, height),
      market: (targetHeight = 3.2) => prepareMarket(marketArticGltf, targetHeight),
      house: (targetHeight = 6.2) => prepareHouse(houseArticGltf, targetHeight)
    };

    this._buildArcticDecorations();
  }

  async _loadMystic() {
    console.log('[BiomeDecorationManager] Lazy loading Mystic assets...');
    const [
      mysticBushGltf,
      mysticBushDetailedGltf,
      mysticBushSmallGltf,
      mysticRockAGltf,
      mysticRockBGltf,
      mysticRockFlatGltf,
      mysticStoneAGltf,
      flowerAGltf,
      flowerBGltf,
      mushroomSingleGltf,
      mushroomGroupGltf,
      mushroomTallGltf,
      twistedTree1Gltf,
      twistedTree2Gltf,
      twistedTree3Gltf,
      twistedTree4Gltf,
      twistedTree5Gltf,
      rockMedium1Gltf,
      rockMedium2Gltf,
      rockMedium3Gltf,
      rockSabana1Gltf,
      rockSabana3Gltf,
      linterAsiaGltf,
      columnGltf,
      column2Gltf,
      flower4GroupGltf,
      flower3GroupGltf,
      flower3SingleGltf,
      fern1Gltf,
      plant1BigGltf,
      bushCommonFlowersGltf,
      grassShortGltf
    ] = await Promise.all([
      this._loadGLTF('./assets/mystic/plant_bush.glb'),
      this._loadGLTF('./assets/mystic/plant_bushDetailed.glb'),
      this._loadGLTF('./assets/mystic/plant_bushSmall.glb'),
      this._loadGLTF('./assets/mystic/rock_smallA.glb'),
      this._loadGLTF('./assets/mystic/rock_smallB.glb'),
      this._loadGLTF('./assets/mystic/rock_smallFlatA.glb'),
      this._loadGLTF('./assets/mystic/stone_smallA.glb'),
      this._loadGLTF('./assets/mystic/flower_redA.glb'),
      this._loadGLTF('./assets/mystic/flower_redB.glb'),
      this._loadGLTF('./assets/mystic/mushroom_red.glb'),
      this._loadGLTF('./assets/mystic/mushroom_redGroup.glb'),
      this._loadGLTF('./assets/mystic/mushroom_redTall.glb'),
      this._loadGLTF('./assets/nature/TwistedTree_1.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_2.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_3.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_4.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_5.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_1.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_2.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_3.gltf'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana1.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana3.glb'),
      this._loadGLTF('./assets/environment/linter_asia.glb'),
      this._loadGLTF('./assets/environment/column.glb'),
      this._loadGLTF('./assets/environment/column2.glb'),
      this._loadGLTF('./assets/nature/Flower_4_Group.gltf'),
      this._loadGLTF('./assets/nature/Flower_3_Group.gltf'),
      this._loadGLTF('./assets/nature/Flower_3_Single.gltf'),
      this._loadGLTF('./assets/nature/Fern_1.gltf'),
      this._loadGLTF('./assets/nature/Plant_1_Big.gltf'),
      this._loadGLTF('./assets/nature/Bush_Common_Flowers.gltf'),
      this._loadGLTF('./assets/nature/Grass_Common_Short.gltf')
    ]);

    const mysticBushMat = new THREE.MeshStandardMaterial({
      color: 0xFD9DA9,
      roughness: 0.82,
      metalness: 0.0
    });
    const mysticRockMat = new THREE.MeshStandardMaterial({
      color: 0x3b4a54,
      roughness: 0.90,
      metalness: 0.0
    });
    const mysticRockFlatMat = new THREE.MeshStandardMaterial({
      color: 0x475561,
      roughness: 0.92,
      metalness: 0.0
    });
    const mysticFlowerMat = new THREE.MeshStandardMaterial({
      color: 0xFDADB4,
      roughness: 0.75,
      metalness: 0.0
    });
    const mysticMushroomCapMat = new THREE.MeshStandardMaterial({
      color: 0xD4595D,
      roughness: 0.70,
      metalness: 0.05
    });
    const mysticMushroomStemMat = new THREE.MeshStandardMaterial({
      color: 0xf1e4e8,
      roughness: 0.85,
      metalness: 0.0
    });
    const magicalCrystalMat = createMagicalCrystalMaterial(0x581c87, 0xf472b6, 0xe879f9);

    this.mysticModels = {
      treeOrange1: () => prepareTwistedTree(twistedTree1Gltf, 0xFA7E1E),
      treeOrange2: () => prepareTwistedTree(twistedTree2Gltf, 0xF97316),
      treeOrange3: () => prepareTwistedTree(twistedTree3Gltf, 0xEA580C),
      treeOrange4: () => prepareTwistedTree(twistedTree4Gltf, 0xFA7E1E),
      treeOrange5: () => prepareTwistedTree(twistedTree5Gltf, 0xFB923C),

      treeSakura1: () => prepareTwistedTree(twistedTree1Gltf, 0xF472B6),
      treeSakura2: () => prepareTwistedTree(twistedTree2Gltf, 0xFB7185),
      treeSakura3: () => prepareTwistedTree(twistedTree3Gltf, 0xEC4899),
      treeSakura4: () => prepareTwistedTree(twistedTree4Gltf, 0xF472B6),
      treeSakura5: () => prepareTwistedTree(twistedTree5Gltf, 0xF9A8D4),

      crystalA: () => prepareMagicalCrystal(mysticRockAGltf, magicalCrystalMat, 1.0),
      crystalB: () => prepareMagicalCrystal(mysticRockBGltf, magicalCrystalMat, 1.0),
      crystalFlat: () => prepareMagicalCrystal(mysticRockFlatGltf, magicalCrystalMat, 1.0),
      crystalStoneA: () => prepareMagicalCrystal(mysticStoneAGltf, magicalCrystalMat, 1.0),
      crystalMedium1: () => prepareMagicalCrystal(rockMedium1Gltf, magicalCrystalMat, 1.8),
      crystalMedium2: () => prepareMagicalCrystal(rockMedium2Gltf, magicalCrystalMat, 1.8),
      crystalMedium3: () => prepareMagicalCrystal(rockMedium3Gltf, magicalCrystalMat, 1.8),
      crystalSabana1: () => prepareMagicalCrystal(rockSabana1Gltf, magicalCrystalMat, 0.85),
      crystalSabana3: () => prepareMagicalCrystal(rockSabana3Gltf, magicalCrystalMat, 0.85),

      linterAsia: () => prepareEnvProp(linterAsiaGltf, 1.45),
      columnMystic: () => prepareMysticColumn(columnGltf, false),
      columnMysticRuined: () => prepareMysticColumn(column2Gltf, true),

      bush: () => prepareModel(mysticBushGltf, mysticBushMat),
      bushDetailed: () => prepareModel(mysticBushDetailedGltf, mysticBushMat),
      bushSmall: () => prepareModel(mysticBushSmallGltf, mysticBushMat),
      rockA: () => prepareModel(mysticRockAGltf, mysticRockMat),
      rockB: () => prepareModel(mysticRockBGltf, mysticRockMat),
      rockFlat: () => prepareModel(mysticRockFlatGltf, mysticRockFlatMat),
      stoneA: () => prepareModel(mysticStoneAGltf, mysticRockMat),
      flowerA: () => prepareModel(flowerAGltf, mysticFlowerMat),
      flowerB: () => prepareModel(flowerBGltf, mysticFlowerMat),
      mushroomSingle: () => prepareMushroom(mushroomSingleGltf, mysticMushroomStemMat, mysticMushroomCapMat),
      mushroomGroup: () => prepareMushroom(mushroomGroupGltf, mysticMushroomStemMat, mysticMushroomCapMat),
      mushroomTall: () => prepareMushroom(mushroomTallGltf, mysticMushroomStemMat, mysticMushroomCapMat),

      flower4Group: () => prepareFlowerGroup(flower4GroupGltf),
      flower3Group: () => prepareFlowerGroup(flower3GroupGltf),
      flower3Single: () => prepareModel(flower3SingleGltf, mysticFlowerMat),
      fern1: () => preparePlant(fern1Gltf, 0xc084fc),
      plant1Big: () => preparePlant(plant1BigGltf, 0xe879f9),
      bushCommonFlowers: () => prepareModel(bushCommonFlowersGltf, mysticBushMat),
      grassShort: () => prepareGrassTuft(grassShortGltf, 0xf472b6)
    };

    this._buildMysticDecorations();
  }

  async _loadDungeon() {
    console.log('[BiomeDecorationManager] Lazy loading Dungeon assets...');
    const [
      dungeonBushGltf,
      dungeonBushDetailedGltf,
      dungeonBushSmallGltf,
      dungeonRockAGltf,
      dungeonRockBGltf,
      dungeonRockFlatGltf,
      dungeonStoneAGltf,
      dungeonFlowerAGltf,
      dungeonFlowerBGltf,
      dungeonTreeOakGltf,
      twistedTree1Gltf,
      twistedTree2Gltf,
      twistedTree3Gltf,
      twistedTree4Gltf,
      twistedTree5Gltf,
      rockMedium1Gltf,
      rockMedium2Gltf,
      rockMedium3Gltf,
      rockSabana1Gltf,
      rockSabana3Gltf,
      rockSabana5Gltf,
      altBonesGltf,
      lapidaGltf,
      ancientArchwayGltf,
      torch1Gltf,
      columnGltf,
      column2Gltf,
      bushCommonFlowersGltf,
      flower3GroupGltf,
      flower4GroupGltf,
      flower3SingleGltf,
      fern1Gltf,
      plant1BigGltf,
      grassShortGltf,
      mushroomSingleGltf,
      mushroomGroupGltf,
      mushroomTallGltf
    ] = await Promise.all([
      this._loadGLTF('./assets/dungeon/plant_bush.glb'),
      this._loadGLTF('./assets/dungeon/plant_bushDetailed.glb'),
      this._loadGLTF('./assets/dungeon/plant_bushSmall.glb'),
      this._loadGLTF('./assets/dungeon/rock_smallA.glb'),
      this._loadGLTF('./assets/dungeon/rock_smallB.glb'),
      this._loadGLTF('./assets/dungeon/rock_smallFlatA.glb'),
      this._loadGLTF('./assets/dungeon/stone_smallA.glb'),
      this._loadGLTF('./assets/dungeon/flower_redA.glb'),
      this._loadGLTF('./assets/dungeon/flower_redB.glb'),
      this._loadGLTF('./assets/dungeon/tree_oak.glb'),
      this._loadGLTF('./assets/nature/TwistedTree_1.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_2.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_3.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_4.gltf'),
      this._loadGLTF('./assets/nature/TwistedTree_5.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_1.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_2.gltf'),
      this._loadGLTF('./assets/nature/Rock_Medium_3.gltf'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana1.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana3.glb'),
      this._loadGLTF('./assets/nature/rocks/Rock_sabana5.glb'),
      this._loadGLTF('./assets/environment/alt_bones.glb'),
      this._loadGLTF('./assets/environment/lapida.glb'),
      this._loadGLTF('./assets/environment/ancient_archway.glb'),
      this._loadGLTF('./assets/environment/torch_1.glb'),
      this._loadGLTF('./assets/environment/column.glb'),
      this._loadGLTF('./assets/environment/column2.glb'),
      this._loadGLTF('./assets/nature/Bush_Common_Flowers.gltf'),
      this._loadGLTF('./assets/nature/Flower_3_Group.gltf'),
      this._loadGLTF('./assets/nature/Flower_4_Group.gltf'),
      this._loadGLTF('./assets/nature/Flower_3_Single.gltf'),
      this._loadGLTF('./assets/nature/Fern_1.gltf'),
      this._loadGLTF('./assets/nature/Plant_1_Big.gltf'),
      this._loadGLTF('./assets/nature/Grass_Common_Short.gltf'),
      this._loadGLTF('./assets/mystic/mushroom_red.glb'),
      this._loadGLTF('./assets/mystic/mushroom_redGroup.glb'),
      this._loadGLTF('./assets/mystic/mushroom_redTall.glb')
    ]);

    const witheredBushMat = new THREE.MeshStandardMaterial({
      color: 0x352832,
      roughness: 0.90,
      metalness: 0.0
    });
    const fireFlowerMatRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.70,
      metalness: 0.05
    });
    const fireFlowerMatAmber = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.72,
      metalness: 0.05
    });
    const deadWoodMat = new THREE.MeshStandardMaterial({
      color: 0x18141e,
      roughness: 0.94,
      metalness: 0.02
    });
    const dungeonBasaltMat = new THREE.MeshStandardMaterial({
      color: 0x221d28,
      roughness: 0.88,
      metalness: 0.05
    });
    const dungeonMushroomCapMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.68,
      metalness: 0.04
    });
    const dungeonMushroomStemMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.88,
      metalness: 0.0
    });
    const obsidianLavaMat = createObsidianLavaRockMaterial(this.dungeonLavaMaterials, 0x16131c, 0xff4500, 0xffcc00);

    this.dungeonModels = {
      treeAsh1: () => prepareAshTwistedTree(twistedTree1Gltf, 0x475569, deadWoodMat),
      treeAsh2: () => prepareAshTwistedTree(twistedTree2Gltf, 0x334155, deadWoodMat),
      treeAsh3: () => prepareAshTwistedTree(twistedTree3Gltf, 0x64748b, deadWoodMat),
      treeAsh4: () => prepareAshTwistedTree(twistedTree4Gltf, 0x374151, deadWoodMat),
      treeAsh5: () => prepareAshTwistedTree(twistedTree5Gltf, 0x4b5563, deadWoodMat),

      treeDeadTwisted1: () => prepareLeaflessTwistedTree(twistedTree1Gltf, deadWoodMat),
      treeDeadTwisted2: () => prepareLeaflessTwistedTree(twistedTree2Gltf, deadWoodMat),
      treeDeadTwisted3: () => prepareLeaflessTwistedTree(twistedTree3Gltf, deadWoodMat),
      treeDeadTwisted4: () => prepareLeaflessTwistedTree(twistedTree4Gltf, deadWoodMat),
      treeDeadTwisted5: () => prepareLeaflessTwistedTree(twistedTree5Gltf, deadWoodMat),
      treeOakDead: () => prepareDeadTree(dungeonTreeOakGltf, deadWoodMat),

      rockA: () => prepareObsidianLavaRock(dungeonRockAGltf, obsidianLavaMat, 1.0),
      rockB: () => prepareObsidianLavaRock(dungeonRockBGltf, obsidianLavaMat, 1.0),
      rockFlat: () => prepareObsidianLavaRock(dungeonRockFlatGltf, obsidianLavaMat, 1.0),
      stoneA: () => prepareObsidianLavaRock(dungeonStoneAGltf, obsidianLavaMat, 1.0),
      rockMedium1: () => prepareObsidianLavaRock(rockMedium1Gltf, obsidianLavaMat, 1.8),
      rockMedium2: () => prepareObsidianLavaRock(rockMedium2Gltf, obsidianLavaMat, 1.8),
      rockMedium3: () => prepareObsidianLavaRock(rockMedium3Gltf, obsidianLavaMat, 1.8),
      rockSabana1: () => prepareObsidianLavaRock(rockSabana1Gltf, obsidianLavaMat, 0.9),
      rockSabana3: () => prepareObsidianLavaRock(rockSabana3Gltf, obsidianLavaMat, 0.9),
      rockSabana5: () => prepareObsidianLavaRock(rockSabana5Gltf, obsidianLavaMat, 0.9),

      lapida: (targetHeight = 2.1) => prepareDungeonProp(lapidaGltf, targetHeight),
      altBones: (targetHeight = 2.4) => prepareDungeonProp(altBonesGltf, targetHeight),
      ancientArchway: () => prepareDungeonProp(ancientArchwayGltf, 6.8),
      torch: () => prepareDungeonTorch(torch1Gltf, 1.85),
      column: () => prepareDungeonColumn(columnGltf, dungeonBasaltMat, false),
      columnRuined: () => prepareDungeonColumn(column2Gltf, dungeonBasaltMat, true),

      bush: () => prepareModel(dungeonBushGltf, witheredBushMat),
      bushDetailed: () => prepareModel(dungeonBushDetailedGltf, witheredBushMat),
      bushSmall: () => prepareModel(dungeonBushSmallGltf, witheredBushMat),
      bushCommonFlowers: () => prepareModel(bushCommonFlowersGltf, witheredBushMat),
      flowerA: () => prepareModel(dungeonFlowerAGltf, fireFlowerMatRed),
      flowerB: () => prepareModel(dungeonFlowerBGltf, fireFlowerMatAmber),
      flower3Group: () => prepareFlowerGroup(flower3GroupGltf),
      flower4Group: () => prepareFlowerGroup(flower4GroupGltf),
      flower3Single: () => prepareModel(flower3SingleGltf, fireFlowerMatRed),
      fern1: () => preparePlant(fern1Gltf, 0x4a2a35),
      plant1Big: () => preparePlant(plant1BigGltf, 0x3d2733),
      grassShort: () => prepareGrassTuft(grassShortGltf, 0x3a2833),

      mushroomSingle: () => prepareDungeonMushroom(mushroomSingleGltf, dungeonMushroomStemMat, dungeonMushroomCapMat),
      mushroomGroup: () => prepareDungeonMushroom(mushroomGroupGltf, dungeonMushroomStemMat, dungeonMushroomCapMat),
      mushroomTall: () => prepareDungeonMushroom(mushroomTallGltf, dungeonMushroomStemMat, dungeonMushroomCapMat)
    };

    this._buildDungeonDecorations();
  }
  _buildSavannahDecorations() {
    this._buildSavannahDecorations_3_2();
    this._buildSavannahDecorations_3_1();
  }

  _buildSavannahDecorations_3_2() {
    const LEAF_ORANGE = 0xDF6226;
    const LEAF_YELLOW = 0xBFA832;

    // 1. Trees & Palms for zone 3_2 (Savannah Oasis / Dunes - NPCs: Bing at [-13.1, 20.3], Sentinel at [24.0, -18.5])
    const trees = [
      // NW Quadrant
      { model: this.models.twisted1(LEAF_ORANGE), x: -24, z: -22, scale: 0.58, rotY: 0.8, radius: 1.0 },
      { model: this.models.palm1(), x: -18, z: -26, scale: 2.1, rotY: 0.5, radius: 0.8 },
      { model: this.models.palm2(), x: -27, z: -12, scale: 2.3, rotY: 1.8, radius: 0.8 },
      { model: this.models.twisted2(LEAF_YELLOW), x: -12, z: -16, scale: 0.52, rotY: 2.1, radius: 1.0 },

      // NE Quadrant (keeping distance from Sentinel at [24.0, -18.5])
      { model: this.models.twisted3(LEAF_YELLOW), x: 15, z: -25, scale: 0.60, rotY: 1.4, radius: 1.0 },
      { model: this.models.palm3(), x: 21, z: -28, scale: 2.0, rotY: 2.4, radius: 0.8 },
      { model: this.models.palm4(), x: 28, z: -10, scale: 2.2, rotY: 1.1, radius: 0.8 },
      { model: this.models.twisted4(LEAF_ORANGE), x: 12, z: -13, scale: 0.54, rotY: 3.2, radius: 1.0 },

      // SW Quadrant (keeping distance from Bing at [-13.1, 20.3])
      { model: this.models.twisted5(LEAF_ORANGE), x: -24, z: 25, scale: 0.62, rotY: 0.4, radius: 1.0 },
      { model: this.models.palm5(), x: -27, z: 15, scale: 2.4, rotY: 3.5, radius: 0.8 },
      { model: this.models.twisted1(LEAF_YELLOW), x: -18, z: 28, scale: 0.55, rotY: 1.9, radius: 1.0 },
      { model: this.models.palm1(), x: -8, z: 26, scale: 1.9, rotY: 0.7, radius: 0.8 },

      // SE Quadrant
      { model: this.models.twisted2(LEAF_YELLOW), x: 22, z: 22, scale: 0.58, rotY: 2.7, radius: 1.0 },
      { model: this.models.palm2(), x: 27, z: 14, scale: 2.2, rotY: 1.6, radius: 0.8 },
      { model: this.models.twisted3(LEAF_ORANGE), x: 16, z: 26, scale: 0.52, rotY: 0.9, radius: 1.0 },
      { model: this.models.palm3(), x: 28, z: 26, scale: 2.0, rotY: 2.9, radius: 0.8 }
    ];

    this.savannahTrees_3_2 = [];
    trees.forEach((t) => {
      const obj = t.model;
      obj.position.set(t.x, 0, t.z);
      obj.rotation.y = t.rotY;
      obj.scale.setScalar(t.scale);
      this.savannahGroup_3_2.add(obj);
      this.savannahTrees_3_2.push({ x: t.x, z: t.z, radius: t.radius });
    });

    // 2. Tall Cacti (#DA7635)
    this.tallCactusPositions_3_2 = [
      // NW
      { x: -15, z: -18, scale: 2.6, rotY: 0.4 },
      { x: -26, z: -10, scale: 2.3, rotY: 2.1 },
      { x: -10, z: -28, scale: 2.5, rotY: 1.5 },
      // NE
      { x: 16, z: -16, scale: 2.5, rotY: 0.2 },
      { x: 25, z: -28, scale: 2.4, rotY: 3.1 },
      { x: 30, z: -11, scale: 2.3, rotY: 1.4 },
      // SW
      { x: -28, z: 22, scale: 2.6, rotY: 0.7 },
      { x: -32, z: 14, scale: 2.4, rotY: 0.5 },
      // SE
      { x: 17, z: 18, scale: 2.5, rotY: 2.3 },
      { x: 26, z: 12, scale: 2.4, rotY: 1.6 },
      { x: 22, z: 29, scale: 2.3, rotY: 0.3 }
    ];

    this.tallCactusPositions_3_2.forEach((c) => {
      const model = this.models.cactusTall();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.savannahGroup_3_2.add(model);
    });

    // 3. Short Cacti (#DA7635)
    const shortCacti = [
      { x: -17, z: -19, scale: 2.0, rotY: 1.2 },
      { x: -31, z: -22, scale: 2.1, rotY: 2.9 },
      { x: 18, z: -15, scale: 1.9, rotY: 1.9 },
      { x: 27, z: -26, scale: 2.0, rotY: 0.6 },
      { x: -30, z: 24, scale: 1.9, rotY: 3.3 },
      { x: 15, z: 20, scale: 2.0, rotY: 0.9 },
      { x: 31, z: 24, scale: 2.1, rotY: 1.7 }
    ];

    shortCacti.forEach((c) => {
      const model = this.models.cactusShort();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.savannahGroup_3_2.add(model);
    });

    // 4. Rocks & Stones
    const rocks = [
      { type: 'stoneA', x: -19, z: -16, scale: 2.2, rotY: 0.3 },
      { type: 'rockFlat', x: -22, z: -26, scale: 2.4, rotY: 1.1 },
      { type: 'rockA', x: -14, z: -11, scale: 1.9, rotY: 2.4 },
      { type: 'stoneA', x: 19, z: -20, scale: 2.1, rotY: 1.5 },
      { type: 'rockFlat', x: 22, z: -12, scale: 2.2, rotY: 0.4 },
      { type: 'rockB', x: 25, z: -8, scale: 1.6, rotY: 0.7 },
      { type: 'stoneA', x: -20, z: 22, scale: 2.0, rotY: 0.9 },
      { type: 'rockFlat', x: -22, z: 28, scale: 2.0, rotY: 1.3 },
      { type: 'stoneA', x: 20, z: 15, scale: 2.1, rotY: 2.7 },
      { type: 'rockFlat', x: 14, z: 26, scale: 2.3, rotY: 0.8 },
      { type: 'rockA', x: 28, z: 20, scale: 1.9, rotY: 1.6 }
    ];

    this.savannahRocks_3_2 = [];
    const rockRadiusMap_3_2 = { rockFlat: 1.1, rockA: 1.0, rockB: 0.9, stoneA: 0.75 };
    rocks.forEach((r) => {
      const model = this.models[r.type]();
      model.position.set(r.x, 0, r.z);
      model.rotation.y = r.rotY;
      model.scale.setScalar(r.scale);
      this.savannahGroup_3_2.add(model);
      const rad = (rockRadiusMap_3_2[r.type] || 0.8) * r.scale;
      this.savannahRocks_3_2.push({ x: r.x, z: r.z, radius: rad });
    });

    // 5. Desert Sandstone Boulders ("arenisca tipo desierto") Rock_sabana1..5
    const sandstoneRocks = [
      // Centerpiece Landmark Formation in Macro-Zone 3_2 (Large, imposing sandstone spire & companion rocks)
      { model: this.models.rockSabana3(0xD88E52), x: 2.0, z: 0.0, scale: 5.8, rotY: 0.7, radius: 3.4 },
      { model: this.models.rockSabana5(0xCE824A), x: 4.2, z: -1.4, scale: 3.4, rotY: 2.1, radius: 2.2 },
      { model: this.models.rockSabana1(0xD48E55), x: -0.6, z: 1.4, scale: 2.4, rotY: 1.2, radius: 1.6 },

      // NW Quadrant
      { model: this.models.rockSabana1(0xD48E55), x: -20, z: -18, scale: 2.6, rotY: 0.8, radius: 1.8 },
      { model: this.models.rockSabana2(0xCE854E), x: -28, z: -25, scale: 2.9, rotY: 2.3, radius: 2.0 },
      // NE Quadrant (away from Sentinel at [24.0, -18.5] and Palm at [28, -10])
      { model: this.models.rockSabana3(0xDE965B), x: 22, z: -24, scale: 2.8, rotY: 1.5, radius: 1.9 },
      { model: this.models.rockSabana4(0xC8804A), x: 20.5, z: -4.0, scale: 2.5, rotY: 3.1, radius: 1.7 },
      // SW Quadrant (away from Bing at [-13.1, 20.3])
      { model: this.models.rockSabana5(0xD89258), x: -25, z: 22, scale: 3.0, rotY: 0.5, radius: 2.1 },
      { model: this.models.rockSabana1(0xD48E55), x: -20, z: 12, scale: 2.4, rotY: 1.9, radius: 1.6 },
      // SE Quadrant
      { model: this.models.rockSabana2(0xCE854E), x: 18, z: 24, scale: 2.7, rotY: 2.8, radius: 1.9 },
      { model: this.models.rockSabana3(0xDE965B), x: 25, z: 18, scale: 2.6, rotY: 0.4, radius: 1.8 },
      { model: this.models.rockSabana4(0xC8804A), x: 22, z: 29, scale: 2.8, rotY: 1.2, radius: 1.9 },

      // --- Imposing Desert Canyon Formations (4 Canyon Wall Mounds at Perimeter Corners) ---
      // 1. NE Canyon Wall (at 31.3, -30.3)
      { model: this.models.rockSabana3(0xD88E52), x: 31.3, z: -30.3, scale: 6.0, rotY: 0.8, radius: 3.6 },
      { model: this.models.rockSabana5(0xCE824A), x: 33.5, z: -28.5, scale: 4.4, rotY: 2.3, radius: 3.0 },
      { model: this.models.rockSabana1(0xD48E55), x: 29.2, z: -32.2, scale: 3.5, rotY: 1.1, radius: 2.4 },
      { model: this.models.rockSabana4(0xC8804A), x: 33.0, z: -32.8, scale: 2.8, rotY: 2.9, radius: 1.9 },

      // 2. SE Canyon Wall (at 32.0, 33.2)
      { model: this.models.rockSabana5(0xD89258), x: 32.0, z: 33.2, scale: 6.2, rotY: 1.7, radius: 3.8 },
      { model: this.models.rockSabana3(0xDE965B), x: 29.8, z: 34.8, scale: 4.5, rotY: 0.4, radius: 3.0 },
      { model: this.models.rockSabana2(0xCE854E), x: 34.0, z: 31.2, scale: 3.6, rotY: 2.6, radius: 2.5 },
      { model: this.models.rockSabana1(0xD48E55), x: 29.4, z: 31.6, scale: 2.9, rotY: 1.4, radius: 2.0 },

      // 3. SW Canyon Wall (at -32.7, 31.6)
      { model: this.models.rockSabana3(0xD88E52), x: -32.7, z: 31.6, scale: 6.2, rotY: 2.8, radius: 3.8 },
      { model: this.models.rockSabana4(0xC8804A), x: -30.8, z: 33.8, scale: 4.2, rotY: 1.2, radius: 2.8 },
      { model: this.models.rockSabana5(0xCE824A), x: -34.5, z: 29.5, scale: 3.6, rotY: 0.5, radius: 2.5 },
      { model: this.models.rockSabana2(0xCE854E), x: -30.2, z: 29.8, scale: 3.0, rotY: 2.1, radius: 2.1 },

      // 4. NW Canyon Wall (at -29.1, -33.0)
      { model: this.models.rockSabana5(0xD89258), x: -29.1, z: -33.0, scale: 6.0, rotY: 0.3, radius: 3.6 },
      { model: this.models.rockSabana3(0xDE965B), x: -31.4, z: -31.2, scale: 4.4, rotY: 1.9, radius: 3.0 },
      { model: this.models.rockSabana1(0xD48E55), x: -26.8, z: -34.5, scale: 3.5, rotY: 2.7, radius: 2.4 },
      { model: this.models.rockSabana4(0xC8804A), x: -27.2, z: -31.0, scale: 2.9, rotY: 0.9, radius: 2.0 }
    ];

    sandstoneRocks.forEach((sr) => {
      const obj = sr.model;
      obj.position.set(sr.x, 0, sr.z);
      obj.rotation.y = sr.rotY;
      obj.scale.setScalar(sr.scale);
      this.savannahGroup_3_2.add(obj);
      this.savannahRocks_3_2.push({ x: sr.x, z: sr.z, radius: sr.radius });
    });

    // 6. Centerpiece Oasis Flora (Surrounding the central sandstone monolith with bushes, flowers and grass)
    const centerpieceFlora = [
      // Bushes ("verdoso oscuro sabana" #3D5224 / #455A28)
      { model: this.models.bushCommon(0x3D5224), x: 3.6, z: 1.6, scale: 0.75, rotY: 0.4 },
      { model: this.models.bushCommon(0x455A28), x: -0.8, z: -1.6, scale: 0.70, rotY: 1.8 },
      { model: this.models.bushCommon(0x3D5224), x: 5.3, z: 0.5, scale: 0.65, rotY: 2.9 },
      { model: this.models.bushCommon(0x425726), x: 0.6, z: 2.8, scale: 0.72, rotY: 3.6 },

      // Big stylized plants
      { model: this.models.plant1Big(), x: 4.6, z: -2.3, scale: 0.85, rotY: 1.1 },
      { model: this.models.plant1Big(), x: -1.6, z: 0.7, scale: 0.80, rotY: 2.5 },
      { model: this.models.plant1Big(), x: 1.4, z: -2.4, scale: 0.75, rotY: 0.3 },

      // Ferns in rock crevices
      { model: this.models.fern1(), x: 3.0, z: -2.8, scale: 0.78, rotY: 1.7 },
      { model: this.models.fern1(), x: -1.2, z: -1.0, scale: 0.72, rotY: 3.1 },
      { model: this.models.fern1(), x: 3.0, z: 2.8, scale: 0.80, rotY: 0.8 },

      // Flower groups
      { model: this.models.flowerGroup(), x: 1.6, z: 2.4, scale: 0.80, rotY: 0.5 },
      { model: this.models.flowerGroup(), x: 4.2, z: -0.3, scale: 0.72, rotY: 2.2 },
      { model: this.models.flowerGroup(), x: -1.4, z: 2.0, scale: 0.75, rotY: 1.4 },
      { model: this.models.flowerGroup(), x: 0.4, z: -2.0, scale: 0.70, rotY: 2.8 },

      // Golden straw grass tufts
      { model: this.models.grassTuft(0xC8A048), x: -0.1, z: 1.6, scale: 0.90, rotY: 0.6 },
      { model: this.models.grassTuft(0xD2AA4E), x: 3.6, z: 2.4, scale: 0.85, rotY: 2.0 },
      { model: this.models.grassTuft(0xC8A048), x: 5.4, z: -1.4, scale: 0.92, rotY: 1.3 },
      { model: this.models.grassTuft(0xBFA042), x: -2.0, z: -0.4, scale: 0.85, rotY: 3.4 },
      { model: this.models.grassTuft(0xC8A048), x: 2.4, z: -3.2, scale: 0.90, rotY: 0.9 },
      { model: this.models.grassTuft(0xD2AA4E), x: -0.8, z: 2.8, scale: 0.80, rotY: 2.4 }
    ];

    centerpieceFlora.forEach((f) => {
      const obj = f.model;
      obj.position.set(f.x, 0, f.z);
      obj.rotation.y = f.rotY;
      obj.scale.setScalar(f.scale);
      this.savannahGroup_3_2.add(obj);
    });

    // 7. General Savannah Density (Bush_Common, Plant_1_Big, Fern_1, Grass, Flowers) scattered across the entire terrain
    const vegetation_3_2 = [
      // North & Far North Plains
      { model: this.models.grassTuft(0xC8A048), x: -26, z: -26, scale: 0.85, rotY: 0.5 },
      { model: this.models.bushCommon(0x3D5224), x: -21, z: -25, scale: 0.55, rotY: 1.2 },
      { model: this.models.flowerGroup(), x: -16, z: -27, scale: 0.70, rotY: 2.3 },
      { model: this.models.grassTuft(0xD2AA4E), x: -11, z: -25, scale: 0.90, rotY: 0.9 },
      { model: this.models.plant1Big(), x: -6, z: -26, scale: 0.65, rotY: 1.8 },
      { model: this.models.fern1(), x: -1, z: -24, scale: 0.60, rotY: 3.1 },
      { model: this.models.grassTuft(0xC8A048), x: 4, z: -26, scale: 0.85, rotY: 0.4 },
      { model: this.models.bushCommon(0x455A28), x: 9, z: -25, scale: 0.52, rotY: 2.5 },
      { model: this.models.flowerGroup(), x: 14, z: -27, scale: 0.75, rotY: 1.1 },
      { model: this.models.grassTuft(0xD2AA4E), x: 19, z: -25, scale: 0.88, rotY: 2.7 },
      { model: this.models.plant1Big(), x: 23, z: -26, scale: 0.62, rotY: 0.8 },
      { model: this.models.fern1(), x: 27, z: -25, scale: 0.58, rotY: 1.6 },

      // Upper Plains (z ~ -18 to -12)
      { model: this.models.plant1Big(), x: -27, z: -17, scale: 0.68, rotY: 2.1 },
      { model: this.models.grassTuft(0xC8A048), x: -22, z: -15, scale: 0.85, rotY: 0.7 },
      { model: this.models.bushCommon(0x3D5224), x: -17, z: -18, scale: 0.58, rotY: 1.5 },
      { model: this.models.flowerGroup(), x: -12, z: -15, scale: 0.72, rotY: 3.0 },
      { model: this.models.fern1(), x: -7, z: -17, scale: 0.60, rotY: 0.3 },
      { model: this.models.grassTuft(0xD2AA4E), x: -2, z: -15, scale: 0.92, rotY: 2.2 },
      { model: this.models.bushCommon(0x455A28), x: 3, z: -17, scale: 0.55, rotY: 1.9 },
      { model: this.models.plant1Big(), x: 8, z: -15, scale: 0.70, rotY: 0.5 },
      { model: this.models.grassTuft(0xC8A048), x: 13, z: -18, scale: 0.82, rotY: 2.8 },
      { model: this.models.flowerGroup(), x: 18, z: -15, scale: 0.70, rotY: 1.4 },
      { model: this.models.fern1(), x: 28, z: -15, scale: 0.65, rotY: 2.6 },

      // Upper-Mid Transition (z ~ -11 to -7)
      { model: this.models.grassTuft(0xD2AA4E), x: -26, z: -10, scale: 0.88, rotY: 1.1 },
      { model: this.models.bushCommon(0x3D5224), x: -20, z: -8, scale: 0.52, rotY: 0.8 },
      { model: this.models.plant1Big(), x: -15, z: -10, scale: 0.65, rotY: 2.4 },
      { model: this.models.fern1(), x: -10, z: -8, scale: 0.58, rotY: 3.3 },
      { model: this.models.flowerGroup(), x: -5, z: -10, scale: 0.75, rotY: 0.6 },
      { model: this.models.grassTuft(0xC8A048), x: 0, z: -8, scale: 0.85, rotY: 1.7 },
      { model: this.models.plant1Big(), x: 6, z: -9, scale: 0.60, rotY: 2.9 },
      { model: this.models.bushCommon(0x455A28), x: 11, z: -8, scale: 0.55, rotY: 0.4 },
      { model: this.models.grassTuft(0xD2AA4E), x: 16, z: -10, scale: 0.90, rotY: 2.1 },
      { model: this.models.fern1(), x: 21, z: -8, scale: 0.62, rotY: 1.3 },
      { model: this.models.flowerGroup(), x: 26, z: -9, scale: 0.68, rotY: 3.5 },

      // Middle Horizon / Flanks (z ~ -5 to +5)
      { model: this.models.grassTuft(0xC8A048), x: -28, z: -3, scale: 0.90, rotY: 0.5 },
      { model: this.models.flowerGroup(), x: -23, z: -2, scale: 0.72, rotY: 1.9 },
      { model: this.models.bushCommon(0x3D5224), x: -18, z: -4, scale: 0.55, rotY: 2.7 },
      { model: this.models.plant1Big(), x: -13, z: -2, scale: 0.68, rotY: 0.9 },
      { model: this.models.fern1(), x: -8, z: -4, scale: 0.60, rotY: 1.6 },
      { model: this.models.grassTuft(0xD2AA4E), x: -6, z: 2, scale: 0.85, rotY: 3.2 },
      { model: this.models.bushCommon(0x455A28), x: -11, z: 4, scale: 0.52, rotY: 0.7 },
      { model: this.models.plant1Big(), x: -16, z: 2, scale: 0.65, rotY: 2.2 },
      { model: this.models.flowerGroup(), x: -21, z: 4, scale: 0.70, rotY: 1.4 },
      { model: this.models.grassTuft(0xC8A048), x: -26, z: 2, scale: 0.88, rotY: 2.8 },
      { model: this.models.fern1(), x: 9, z: -3, scale: 0.62, rotY: 0.4 },
      { model: this.models.grassTuft(0xD2AA4E), x: 14, z: -2, scale: 0.92, rotY: 2.5 },
      { model: this.models.flowerGroup(), x: 19, z: -4, scale: 0.75, rotY: 1.1 },
      { model: this.models.bushCommon(0x3D5224), x: 24, z: -2, scale: 0.58, rotY: 3.0 },
      { model: this.models.plant1Big(), x: 28, z: -4, scale: 0.65, rotY: 0.8 },
      { model: this.models.grassTuft(0xC8A048), x: 8, z: 3, scale: 0.85, rotY: 1.8 },
      { model: this.models.bushCommon(0x455A28), x: 13, z: 2, scale: 0.55, rotY: 0.3 },
      { model: this.models.plant1Big(), x: 18, z: 4, scale: 0.70, rotY: 2.6 },
      { model: this.models.flowerGroup(), x: 23, z: 2, scale: 0.68, rotY: 1.5 },
      { model: this.models.fern1(), x: 27, z: 4, scale: 0.60, rotY: 3.2 },

      // Lower-Mid Transition (z ~ 7 to 12)
      { model: this.models.plant1Big(), x: -27, z: 8, scale: 0.65, rotY: 1.0 },
      { model: this.models.grassTuft(0xC8A048), x: -22, z: 9, scale: 0.90, rotY: 2.4 },
      { model: this.models.fern1(), x: -17, z: 7, scale: 0.58, rotY: 0.6 },
      { model: this.models.bushCommon(0x3D5224), x: -12, z: 9, scale: 0.52, rotY: 3.1 },
      { model: this.models.flowerGroup(), x: -7, z: 8, scale: 0.72, rotY: 1.7 },
      { model: this.models.grassTuft(0xD2AA4E), x: -2, z: 9, scale: 0.85, rotY: 0.2 },
      { model: this.models.plant1Big(), x: 3, z: 8, scale: 0.62, rotY: 2.0 },
      { model: this.models.flowerGroup(), x: 8, z: 9, scale: 0.70, rotY: 0.8 },
      { model: this.models.bushCommon(0x455A28), x: 13, z: 8, scale: 0.55, rotY: 2.9 },
      { model: this.models.grassTuft(0xC8A048), x: 18, z: 9, scale: 0.92, rotY: 1.3 },
      { model: this.models.fern1(), x: 22, z: 8, scale: 0.60, rotY: 3.4 },
      { model: this.models.plant1Big(), x: 27, z: 9, scale: 0.68, rotY: 0.5 },

      // Lower Plains (z ~ 14 to 19, leaving Bing buffer clear)
      { model: this.models.grassTuft(0xD2AA4E), x: -26, z: 15, scale: 0.88, rotY: 1.9 },
      { model: this.models.bushCommon(0x3D5224), x: -21, z: 14, scale: 0.55, rotY: 0.4 },
      { model: this.models.flowerGroup(), x: -16, z: 15, scale: 0.75, rotY: 2.8 },
      { model: this.models.fern1(), x: -7, z: 14, scale: 0.58, rotY: 1.2 },
      { model: this.models.grassTuft(0xC8A048), x: -2, z: 15, scale: 0.85, rotY: 3.0 },
      { model: this.models.plant1Big(), x: 3, z: 15, scale: 0.65, rotY: 0.7 },
      { model: this.models.bushCommon(0x455A28), x: 8, z: 14, scale: 0.52, rotY: 2.3 },
      { model: this.models.grassTuft(0xD2AA4E), x: 13, z: 15, scale: 0.90, rotY: 1.6 },
      { model: this.models.flowerGroup(), x: 17, z: 14, scale: 0.72, rotY: 0.9 },
      { model: this.models.fern1(), x: 22, z: 15, scale: 0.60, rotY: 2.7 },
      { model: this.models.plant1Big(), x: 26, z: 14, scale: 0.68, rotY: 3.3 },

      // Far South Plains (z ~ 21 to 28)
      { model: this.models.plant1Big(), x: -27, z: 22, scale: 0.65, rotY: 0.5 },
      { model: this.models.grassTuft(0xC8A048), x: -22, z: 23, scale: 0.92, rotY: 2.1 },
      { model: this.models.fern1(), x: -18, z: 22, scale: 0.58, rotY: 1.4 },
      { model: this.models.bushCommon(0x3D5224), x: -8, z: 22, scale: 0.52, rotY: 0.8 },
      { model: this.models.flowerGroup(), x: -3, z: 23, scale: 0.75, rotY: 2.9 },
      { model: this.models.grassTuft(0xD2AA4E), x: 2, z: 22, scale: 0.88, rotY: 1.1 },
      { model: this.models.plant1Big(), x: 7, z: 23, scale: 0.65, rotY: 3.4 },
      { model: this.models.fern1(), x: 12, z: 22, scale: 0.60, rotY: 0.3 },
      { model: this.models.bushCommon(0x455A28), x: 16, z: 23, scale: 0.55, rotY: 2.0 },
      { model: this.models.grassTuft(0xC8A048), x: 21, z: 22, scale: 0.90, rotY: 1.5 },
      { model: this.models.flowerGroup(), x: 25, z: 23, scale: 0.70, rotY: 0.6 },
      { model: this.models.plant1Big(), x: 28, z: 22, scale: 0.68, rotY: 2.7 },
      { model: this.models.grassTuft(0xD2AA4E), x: -26, z: 27, scale: 0.85, rotY: 1.3 },
      { model: this.models.bushCommon(0x3D5224), x: -21, z: 26, scale: 0.55, rotY: 3.0 },
      { model: this.models.flowerGroup(), x: -16, z: 27, scale: 0.72, rotY: 0.7 },
      { model: this.models.fern1(), x: -10, z: 26, scale: 0.60, rotY: 2.5 },
      { model: this.models.grassTuft(0xC8A048), x: -5, z: 27, scale: 0.90, rotY: 1.8 },
      { model: this.models.plant1Big(), x: 0, z: 26, scale: 0.65, rotY: 0.2 },
      { model: this.models.bushCommon(0x455A28), x: 5, z: 27, scale: 0.52, rotY: 2.6 },
      { model: this.models.flowerGroup(), x: 10, z: 26, scale: 0.75, rotY: 1.4 },
      { model: this.models.grassTuft(0xD2AA4E), x: 15, z: 27, scale: 0.88, rotY: 3.2 },
      { model: this.models.fern1(), x: 20, z: 26, scale: 0.58, rotY: 0.9 },
      { model: this.models.plant1Big(), x: 24, z: 27, scale: 0.68, rotY: 2.2 },
      { model: this.models.grassTuft(0xC8A048), x: 28, z: 26, scale: 0.90, rotY: 1.7 }
    ];

    vegetation_3_2.forEach((v) => {
      const obj = v.model;
      obj.position.set(v.x, 0, v.z);
      obj.rotation.y = v.rotY;
      obj.scale.setScalar(v.scale);
      this.savannahGroup_3_2.add(obj);
    });

    // 8. Ancient Desert Ruins Colonnade at [-18.7, 23.4] (column.glb and column2.glb)
    const columns_3_2 = [
      // Flanking Column 1 (column.glb)
      { model: this.models.column(), x: -21.2, z: 22.3, scale: 10.5, rotY: 0.4, radius: 0.95 },
      // Center Column (column2.glb) in the middle, exactly at [-18.7, 23.4]
      { model: this.models.column2(), x: -18.7, z: 23.4, scale: 13.5, rotY: 2.8, radius: 0.95 },
      // Flanking Column 2 (column.glb)
      { model: this.models.column(), x: -16.2, z: 24.5, scale: 10.5, rotY: -3.1, radius: 0.95 }
    ];

    this.savannahColumns_3_2 = [];
    columns_3_2.forEach((col) => {
      const obj = col.model;
      obj.position.set(col.x, 0, col.z);
      obj.rotation.y = col.rotY;
      obj.scale.setScalar(col.scale);
      this.savannahGroup_3_2.add(obj);
      this.savannahColumns_3_2.push({ x: col.x, z: col.z, radius: col.radius });
    });

    // 9. Sentinel Outpost Camp props (dispersed jars, enlarged supply chest)
    this.sentinelOutpostCollisions_3_2 = [];

    // Dispersed Desert Pottery Jars around the outpost
    const jars = [
      { model: this.models.jarraSabana1(), x: 21.6, z: -22.1, rotY: 0.8, radius: 0.40 },  // West of chest
      { model: this.models.jarraSabana3(), x: 25.2, z: -21.2, rotY: 2.4, radius: 0.45 }, // Central-east outpost
      { model: this.models.jarraSabana2(), x: 27.0, z: -23.4, rotY: 1.2, radius: 0.50 }, // South-east perimeter
      { model: this.models.jarraSabana4(), x: 28.1, z: -22.2, rotY: 3.7, radius: 0.35 }  // Far east perimeter
    ];
    jars.forEach((j) => {
      j.model.position.set(j.x, 0, j.z);
      j.model.rotation.y = j.rotY;
      this.savannahGroup_3_2.add(j.model);
      this.sentinelOutpostCollisions_3_2.push({ x: j.x, z: j.z, radius: j.radius });
    });

    // Supply Chest at 23.0, -21.4 (scale enlarged to 1.25m)
    const chest = this.models.chest();
    chest.position.set(23.0, 0, -21.4);
    chest.rotation.y = 0.35;
    this.savannahGroup_3_2.add(chest);
    this.sentinelOutpostCollisions_3_2.push({ x: 23.0, z: -21.4, radius: 0.90 });
  }

  _buildSavannahDecorations_3_1() {
    const LEAF_ORANGE = 0xDF6226;
    const LEAF_YELLOW = 0xBFA832;

    // 1. Trees & Palms for zone 3_1 (Savannah Canyon - NPCs: Blacksmith at [3, 2], Hunter at [-4, 1])
    // Central area [-8..8, -8..8] is kept clear for NPCs!
    const trees = [
      // NW Quadrant
      { model: this.models.twisted4(LEAF_YELLOW), x: -22, z: -20, scale: 0.58, rotY: 1.2, radius: 1.0 },
      { model: this.models.palm4(), x: -16, z: -26, scale: 2.2, rotY: 1.4, radius: 0.8 },
      { model: this.models.palm5(), x: -26, z: -10, scale: 2.0, rotY: 2.8, radius: 0.8 },
      { model: this.models.twisted5(LEAF_ORANGE), x: -12, z: -16, scale: 0.54, rotY: 0.6, radius: 1.0 },

      // NE Quadrant
      { model: this.models.twisted1(LEAF_ORANGE), x: 20, z: -20, scale: 0.62, rotY: 2.5, radius: 1.0 },
      { model: this.models.palm1(), x: 26, z: -14, scale: 2.3, rotY: 0.9, radius: 0.8 },
      { model: this.models.twisted2(LEAF_YELLOW), x: 14, z: -26, scale: 0.52, rotY: 3.1, radius: 1.0 },
      { model: this.models.palm2(), x: 26, z: -26, scale: 2.1, rotY: 3.3, radius: 0.8 },

      // SW Quadrant
      { model: this.models.twisted3(LEAF_ORANGE), x: -24, z: 20, scale: 0.55, rotY: 0.8, radius: 1.0 },
      { model: this.models.palm3(), x: -18, z: 26, scale: 2.4, rotY: 1.1, radius: 0.8 },
      { model: this.models.twisted4(LEAF_YELLOW), x: -26, z: 12, scale: 0.60, rotY: 2.2, radius: 1.0 },
      { model: this.models.palm4(), x: -12, z: 23, scale: 1.9, rotY: 2.0, radius: 0.8 },

      // SE Quadrant
      { model: this.models.twisted5(LEAF_YELLOW), x: 22, z: 18, scale: 0.56, rotY: 1.7, radius: 1.0 },
      { model: this.models.palm5(), x: 16, z: 24, scale: 2.2, rotY: 0.4, radius: 0.8 },
      { model: this.models.twisted1(LEAF_ORANGE), x: 25, z: 26, scale: 0.58, rotY: 0.3, radius: 1.0 },
      { model: this.models.palm1(), x: 28, z: 12, scale: 2.0, rotY: 2.7, radius: 0.8 }
    ];

    this.savannahTrees_3_1 = [];
    trees.forEach((t) => {
      const obj = t.model;
      obj.position.set(t.x, 0, t.z);
      obj.rotation.y = t.rotY;
      obj.scale.setScalar(t.scale);
      this.savannahGroup_3_1.add(obj);
      this.savannahTrees_3_1.push({ x: t.x, z: t.z, radius: t.radius });
    });

    // 2. Tall Cacti
    this.tallCactusPositions_3_1 = [
      { x: -14, z: -28, scale: 2.5, rotY: 2.4 },
      { x: -30, z: -26, scale: 2.4, rotY: 2.8 },
      { x: 25, z: -10, scale: 2.4, rotY: 1.1 },
      { x: 18, z: -15, scale: 2.3, rotY: 0.5 },
      { x: -28, z: 26, scale: 2.5, rotY: 1.8 },
      { x: -15, z: 28, scale: 2.3, rotY: 0.4 },
      { x: 28, z: 20, scale: 2.5, rotY: 2.1 },
      { x: 19, z: 28, scale: 2.4, rotY: 1.3 }
    ];

    this.tallCactusPositions_3_1.forEach((c) => {
      const model = this.models.cactusTall();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.savannahGroup_3_1.add(model);
    });

    // 3. Short Cacti
    const shortCacti = [
      { x: -20, z: -16, scale: 1.9, rotY: 0.7 },
      { x: -28, z: -18, scale: 2.0, rotY: 2.2 },
      { x: 22, z: -16, scale: 1.8, rotY: 1.5 },
      { x: 17, z: -22, scale: 2.0, rotY: 3.0 },
      { x: -20, z: 16, scale: 1.9, rotY: 0.9 },
      { x: 24, z: 12, scale: 2.0, rotY: 2.6 },
      { x: 20, z: 22, scale: 1.8, rotY: 1.1 }
    ];

    shortCacti.forEach((c) => {
      const model = this.models.cactusShort();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.savannahGroup_3_1.add(model);
    });

    // 4. Rocks & Stones
    const rocks = [
      { type: 'stoneA', x: -25, z: -15, scale: 2.3, rotY: 0.8 },
      { type: 'rockFlat', x: -18, z: -22, scale: 2.2, rotY: 1.4 },
      { type: 'rockA', x: -28, z: -22, scale: 1.9, rotY: 2.9 },
      { type: 'stoneA', x: 24, z: -18, scale: 2.2, rotY: 3.1 },
      { type: 'rockFlat', x: 18, z: -20, scale: 2.1, rotY: 0.5 },
      { type: 'rockB', x: 27, z: -22, scale: 1.7, rotY: 1.9 },
      { type: 'stoneA', x: -22, z: 25, scale: 2.1, rotY: 1.7 },
      { type: 'rockFlat', x: -26, z: 16, scale: 2.3, rotY: 0.4 },
      { type: 'stoneA', x: 26, z: 22, scale: 2.2, rotY: 2.4 },
      { type: 'rockFlat', x: 20, z: 26, scale: 2.0, rotY: 1.2 },
      { type: 'rockA', x: 27, z: 16, scale: 1.8, rotY: 0.9 }
    ];

    this.savannahRocks_3_1 = [];
    const rockRadiusMap_3_1 = { rockFlat: 1.1, rockA: 1.0, rockB: 0.9, stoneA: 0.75 };
    rocks.forEach((r) => {
      const model = this.models[r.type]();
      model.position.set(r.x, 0, r.z);
      model.rotation.y = r.rotY;
      model.scale.setScalar(r.scale);
      this.savannahGroup_3_1.add(model);
      const rad = (rockRadiusMap_3_1[r.type] || 0.8) * r.scale;
      this.savannahRocks_3_1.push({ x: r.x, z: r.z, radius: rad });
    });

    // 5. Desert Sandstone Boulders ("arenisca tipo desierto") Rock_sabana1..5
    const sandstoneRocks = [
      // NW Quadrant
      { model: this.models.rockSabana4(0xC8804A), x: -25, z: -22, scale: 2.9, rotY: 1.1, radius: 2.0 },
      { model: this.models.rockSabana5(0xD89258), x: -18, z: -14, scale: 2.5, rotY: 2.6, radius: 1.7 },
      // NE Quadrant
      { model: this.models.rockSabana1(0xD48E55), x: 18, z: -22, scale: 2.8, rotY: 0.7, radius: 1.9 },
      { model: this.models.rockSabana2(0xCE854E), x: 26, z: -18, scale: 3.0, rotY: 2.1, radius: 2.1 },
      // SW Quadrant
      { model: this.models.rockSabana3(0xDE965B), x: -22, z: 24, scale: 2.7, rotY: 3.2, radius: 1.9 },
      { model: this.models.rockSabana4(0xC8804A), x: -28, z: 15, scale: 2.6, rotY: 0.9, radius: 1.8 },
      // SE Quadrant
      { model: this.models.rockSabana5(0xD89258), x: 20, z: 22, scale: 2.8, rotY: 1.6, radius: 1.9 },
      { model: this.models.rockSabana1(0xD48E55), x: 27, z: 24, scale: 2.7, rotY: 2.4, radius: 1.9 },
      { model: this.models.rockSabana2(0xCE854E), x: 15, z: 28, scale: 2.5, rotY: 0.3, radius: 1.7 },

      // --- Imposing Desert Canyon Formations (4 Canyon Wall Mounds at Perimeter Corners) ---
      // 1. NE Canyon Wall (at 31.3, -30.3)
      { model: this.models.rockSabana3(0xD88E52), x: 31.3, z: -30.3, scale: 6.0, rotY: 0.8, radius: 3.6 },
      { model: this.models.rockSabana5(0xCE824A), x: 33.5, z: -28.5, scale: 4.4, rotY: 2.3, radius: 3.0 },
      { model: this.models.rockSabana1(0xD48E55), x: 29.2, z: -32.2, scale: 3.5, rotY: 1.1, radius: 2.4 },
      { model: this.models.rockSabana4(0xC8804A), x: 33.0, z: -32.8, scale: 2.8, rotY: 2.9, radius: 1.9 },

      // 2. SE Canyon Wall (at 32.0, 33.2)
      { model: this.models.rockSabana5(0xD89258), x: 32.0, z: 33.2, scale: 6.2, rotY: 1.7, radius: 3.8 },
      { model: this.models.rockSabana3(0xDE965B), x: 29.8, z: 34.8, scale: 4.5, rotY: 0.4, radius: 3.0 },
      { model: this.models.rockSabana2(0xCE854E), x: 34.0, z: 31.2, scale: 3.6, rotY: 2.6, radius: 2.5 },
      { model: this.models.rockSabana1(0xD48E55), x: 29.4, z: 31.6, scale: 2.9, rotY: 1.4, radius: 2.0 },

      // 3. SW Canyon Wall (at -32.7, 31.6)
      { model: this.models.rockSabana3(0xD88E52), x: -32.7, z: 31.6, scale: 6.2, rotY: 2.8, radius: 3.8 },
      { model: this.models.rockSabana4(0xC8804A), x: -30.8, z: 33.8, scale: 4.2, rotY: 1.2, radius: 2.8 },
      { model: this.models.rockSabana5(0xCE824A), x: -34.5, z: 29.5, scale: 3.6, rotY: 0.5, radius: 2.5 },
      { model: this.models.rockSabana2(0xCE854E), x: -30.2, z: 29.8, scale: 3.0, rotY: 2.1, radius: 2.1 },

      // 4. NW Canyon Wall (at -29.1, -33.0)
      { model: this.models.rockSabana5(0xD89258), x: -29.1, z: -33.0, scale: 6.0, rotY: 0.3, radius: 3.6 },
      { model: this.models.rockSabana3(0xDE965B), x: -31.4, z: -31.2, scale: 4.4, rotY: 1.9, radius: 3.0 },
      { model: this.models.rockSabana1(0xD48E55), x: -26.8, z: -34.5, scale: 3.5, rotY: 2.7, radius: 2.4 },
      { model: this.models.rockSabana4(0xC8804A), x: -27.2, z: -31.0, scale: 2.9, rotY: 0.9, radius: 2.0 }
    ];

    sandstoneRocks.forEach((sr) => {
      const obj = sr.model;
      obj.position.set(sr.x, 0, sr.z);
      obj.rotation.y = sr.rotY;
      obj.scale.setScalar(sr.scale);
      this.savannahGroup_3_1.add(obj);
      this.savannahRocks_3_1.push({ x: sr.x, z: sr.z, radius: sr.radius });
    });

    // 6. General Savannah Density for zone 3_1 (Bush_Common, Plant_1_Big, Fern_1, Grass, Flowers)
    // Central NPC areas kept clear (Blacksmith at [3, 2], Hunter at [-4, 1], Chef Oleic at [-12, 12])
    const vegetation_3_1 = [
      // North & Far North Plains
      { model: this.models.grassTuft(0xC8A048), x: -25, z: -27, scale: 0.85, rotY: 0.8 },
      { model: this.models.bushCommon(0x3D5224), x: -20, z: -25, scale: 0.55, rotY: 1.4 },
      { model: this.models.flowerGroup(), x: -15, z: -27, scale: 0.72, rotY: 2.1 },
      { model: this.models.grassTuft(0xD2AA4E), x: -10, z: -26, scale: 0.90, rotY: 3.0 },
      { model: this.models.plant1Big(), x: -5, z: -25, scale: 0.65, rotY: 0.5 },
      { model: this.models.fern1(), x: 0, z: -27, scale: 0.60, rotY: 1.7 },
      { model: this.models.grassTuft(0xC8A048), x: 5, z: -25, scale: 0.88, rotY: 2.4 },
      { model: this.models.bushCommon(0x455A28), x: 10, z: -27, scale: 0.52, rotY: 0.9 },
      { model: this.models.flowerGroup(), x: 15, z: -25, scale: 0.75, rotY: 3.2 },
      { model: this.models.grassTuft(0xD2AA4E), x: 20, z: -27, scale: 0.90, rotY: 1.3 },
      { model: this.models.plant1Big(), x: 24, z: -25, scale: 0.62, rotY: 2.6 },
      { model: this.models.fern1(), x: 28, z: -27, scale: 0.58, rotY: 0.4 },

      // Upper Plains (z ~ -20 to -14)
      { model: this.models.plant1Big(), x: -27, z: -19, scale: 0.68, rotY: 1.2 },
      { model: this.models.grassTuft(0xC8A048), x: -22, z: -16, scale: 0.90, rotY: 2.5 },
      { model: this.models.bushCommon(0x3D5224), x: -17, z: -18, scale: 0.58, rotY: 0.7 },
      { model: this.models.flowerGroup(), x: -12, z: -15, scale: 0.70, rotY: 1.9 },
      { model: this.models.fern1(), x: -7, z: -18, scale: 0.60, rotY: 3.3 },
      { model: this.models.grassTuft(0xD2AA4E), x: -2, z: -16, scale: 0.88, rotY: 0.3 },
      { model: this.models.bushCommon(0x455A28), x: 3, z: -17, scale: 0.55, rotY: 2.2 },
      { model: this.models.plant1Big(), x: 8, z: -15, scale: 0.70, rotY: 1.1 },
      { model: this.models.grassTuft(0xC8A048), x: 13, z: -18, scale: 0.85, rotY: 2.8 },
      { model: this.models.flowerGroup(), x: 18, z: -16, scale: 0.72, rotY: 0.5 },
      { model: this.models.fern1(), x: 23, z: -17, scale: 0.62, rotY: 1.6 },
      { model: this.models.plant1Big(), x: 27, z: -15, scale: 0.68, rotY: 3.0 },

      // Upper-Mid Transition (z ~ -12 to -7)
      { model: this.models.grassTuft(0xD2AA4E), x: -26, z: -10, scale: 0.88, rotY: 2.0 },
      { model: this.models.bushCommon(0x3D5224), x: -21, z: -8, scale: 0.52, rotY: 0.4 },
      { model: this.models.plant1Big(), x: -16, z: -11, scale: 0.65, rotY: 1.8 },
      { model: this.models.fern1(), x: -11, z: -9, scale: 0.58, rotY: 2.7 },
      { model: this.models.flowerGroup(), x: -6, z: -10, scale: 0.75, rotY: 1.3 },
      { model: this.models.grassTuft(0xC8A048), x: -1, z: -8, scale: 0.85, rotY: 3.1 },
      { model: this.models.plant1Big(), x: 5, z: -10, scale: 0.62, rotY: 0.6 },
      { model: this.models.bushCommon(0x455A28), x: 11, z: -8, scale: 0.55, rotY: 2.3 },
      { model: this.models.grassTuft(0xD2AA4E), x: 16, z: -11, scale: 0.90, rotY: 1.0 },
      { model: this.models.fern1(), x: 21, z: -9, scale: 0.60, rotY: 3.4 },
      { model: this.models.flowerGroup(), x: 26, z: -10, scale: 0.70, rotY: 0.8 },

      // Middle Flanks (avoiding central NPC hub [-6..6, -2..4])
      { model: this.models.grassTuft(0xC8A048), x: -28, z: -3, scale: 0.90, rotY: 1.5 },
      { model: this.models.flowerGroup(), x: -23, z: -2, scale: 0.72, rotY: 2.9 },
      { model: this.models.bushCommon(0x3D5224), x: -18, z: -4, scale: 0.55, rotY: 0.3 },
      { model: this.models.plant1Big(), x: -13, z: -2, scale: 0.68, rotY: 2.4 },
      { model: this.models.fern1(), x: -9, z: -4, scale: 0.60, rotY: 1.0 },
      { model: this.models.grassTuft(0xD2AA4E), x: -8, z: 4, scale: 0.85, rotY: 3.2 },
      { model: this.models.plant1Big(), x: -17, z: 2, scale: 0.65, rotY: 0.7 },
      { model: this.models.flowerGroup(), x: -22, z: 4, scale: 0.70, rotY: 1.8 },
      { model: this.models.grassTuft(0xC8A048), x: -27, z: 2, scale: 0.88, rotY: 2.5 },
      { model: this.models.fern1(), x: 9, z: -3, scale: 0.62, rotY: 1.2 },
      { model: this.models.grassTuft(0xD2AA4E), x: 14, z: -2, scale: 0.92, rotY: 0.5 },
      { model: this.models.flowerGroup(), x: 19, z: -4, scale: 0.75, rotY: 2.7 },
      { model: this.models.bushCommon(0x3D5224), x: 24, z: -2, scale: 0.58, rotY: 1.4 },
      { model: this.models.plant1Big(), x: 28, z: -4, scale: 0.65, rotY: 3.1 },
      { model: this.models.grassTuft(0xC8A048), x: 9, z: 3, scale: 0.85, rotY: 0.9 },
      { model: this.models.bushCommon(0x455A28), x: 14, z: 2, scale: 0.55, rotY: 2.1 },
      { model: this.models.plant1Big(), x: 19, z: 4, scale: 0.70, rotY: 1.6 },
      { model: this.models.flowerGroup(), x: 24, z: 2, scale: 0.68, rotY: 3.3 },
      { model: this.models.fern1(), x: 28, z: 4, scale: 0.60, rotY: 0.4 },

      // Lower-Mid Transition (z ~ 7 to 12, avoiding Chef Oleic at [-12, 12])
      { model: this.models.plant1Big(), x: -27, z: 8, scale: 0.65, rotY: 2.3 },
      { model: this.models.grassTuft(0xC8A048), x: -22, z: 9, scale: 0.90, rotY: 0.6 },
      { model: this.models.fern1(), x: -17, z: 8, scale: 0.58, rotY: 1.7 },
      { model: this.models.grassTuft(0xD2AA4E), x: -6, z: 9, scale: 0.85, rotY: 2.8 },
      { model: this.models.plant1Big(), x: -1, z: 8, scale: 0.62, rotY: 0.4 },
      { model: this.models.flowerGroup(), x: 4, z: 9, scale: 0.70, rotY: 2.0 },
      { model: this.models.bushCommon(0x455A28), x: 9, z: 8, scale: 0.55, rotY: 1.5 },
      { model: this.models.grassTuft(0xC8A048), x: 14, z: 9, scale: 0.92, rotY: 3.0 },
      { model: this.models.flowerGroup(), x: 19, z: 8, scale: 0.72, rotY: 0.8 },
      { model: this.models.fern1(), x: 23, z: 9, scale: 0.60, rotY: 2.5 },
      { model: this.models.plant1Big(), x: 28, z: 8, scale: 0.68, rotY: 1.3 },

      // Lower Plains (z ~ 14 to 19)
      { model: this.models.grassTuft(0xD2AA4E), x: -26, z: 15, scale: 0.88, rotY: 0.7 },
      { model: this.models.bushCommon(0x3D5224), x: -21, z: 14, scale: 0.55, rotY: 2.2 },
      { model: this.models.flowerGroup(), x: -16, z: 16, scale: 0.75, rotY: 1.1 },
      { model: this.models.fern1(), x: -7, z: 15, scale: 0.58, rotY: 3.4 },
      { model: this.models.grassTuft(0xC8A048), x: -2, z: 14, scale: 0.85, rotY: 0.9 },
      { model: this.models.plant1Big(), x: 3, z: 16, scale: 0.65, rotY: 2.5 },
      { model: this.models.bushCommon(0x455A28), x: 8, z: 14, scale: 0.52, rotY: 1.8 },
      { model: this.models.grassTuft(0xD2AA4E), x: 13, z: 16, scale: 0.90, rotY: 0.3 },
      { model: this.models.flowerGroup(), x: 17, z: 14, scale: 0.72, rotY: 2.9 },
      { model: this.models.fern1(), x: 22, z: 16, scale: 0.60, rotY: 1.4 },
      { model: this.models.plant1Big(), x: 26, z: 14, scale: 0.68, rotY: 3.2 },

      // Far South Plains (z ~ 21 to 28)
      { model: this.models.plant1Big(), x: -27, z: 22, scale: 0.65, rotY: 1.9 },
      { model: this.models.grassTuft(0xC8A048), x: -22, z: 24, scale: 0.92, rotY: 0.5 },
      { model: this.models.fern1(), x: -17, z: 22, scale: 0.58, rotY: 2.6 },
      { model: this.models.bushCommon(0x3D5224), x: -12, z: 24, scale: 0.52, rotY: 1.3 },
      { model: this.models.flowerGroup(), x: -6, z: 22, scale: 0.75, rotY: 3.1 },
      { model: this.models.grassTuft(0xD2AA4E), x: -1, z: 24, scale: 0.88, rotY: 0.8 },
      { model: this.models.plant1Big(), x: 5, z: 22, scale: 0.65, rotY: 2.0 },
      { model: this.models.fern1(), x: 10, z: 24, scale: 0.60, rotY: 1.5 },
      { model: this.models.bushCommon(0x455A28), x: 15, z: 22, scale: 0.55, rotY: 3.3 },
      { model: this.models.grassTuft(0xC8A048), x: 20, z: 24, scale: 0.90, rotY: 0.2 },
      { model: this.models.flowerGroup(), x: 25, z: 22, scale: 0.70, rotY: 2.4 },
      { model: this.models.plant1Big(), x: 28, z: 24, scale: 0.68, rotY: 1.7 },
      { model: this.models.grassTuft(0xD2AA4E), x: -26, z: 27, scale: 0.85, rotY: 3.0 },
      { model: this.models.bushCommon(0x3D5224), x: -21, z: 26, scale: 0.55, rotY: 1.1 },
      { model: this.models.flowerGroup(), x: -15, z: 27, scale: 0.72, rotY: 2.7 },
      { model: this.models.fern1(), x: -9, z: 26, scale: 0.60, rotY: 0.4 },
      { model: this.models.grassTuft(0xC8A048), x: -4, z: 27, scale: 0.90, rotY: 1.9 },
      { model: this.models.plant1Big(), x: 1, z: 26, scale: 0.65, rotY: 3.5 },
      { model: this.models.bushCommon(0x455A28), x: 6, z: 27, scale: 0.52, rotY: 0.9 },
      { model: this.models.flowerGroup(), x: 11, z: 26, scale: 0.75, rotY: 2.2 },
      { model: this.models.grassTuft(0xD2AA4E), x: 16, z: 27, scale: 0.88, rotY: 1.6 },
      { model: this.models.fern1(), x: 21, z: 26, scale: 0.58, rotY: 3.1 },
      { model: this.models.plant1Big(), x: 25, z: 27, scale: 0.68, rotY: 0.7 },
      { model: this.models.grassTuft(0xC8A048), x: 28, z: 26, scale: 0.90, rotY: 2.3 }
    ];

    vegetation_3_1.forEach((v) => {
      const obj = v.model;
      obj.position.set(v.x, 0, v.z);
      obj.rotation.y = v.rotY;
      obj.scale.setScalar(v.scale);
      this.savannahGroup_3_1.add(obj);
    });

    // 7. Nomad Blacksmith Forge at [-0.1, -22.3]
    this.blacksmithCollisions_3_1 = [];
    const blacksmith = this.models.blacksmith(3.2);
    blacksmith.position.set(-0.1, 0, -22.3);
    blacksmith.rotation.y = 0;
    this.savannahGroup_3_1.add(blacksmith);
    this.blacksmithCollisions_3_1.push({ x: -0.1, z: -22.3, radius: 1.8 });

    // 8. Canyon Rock Enclosure around Blacksmith Forge (Horseshoe cove following red marker)
    const forgeCanyonRocks = [
      // --- North Back Wall (behind the forge) ---
      { model: this.models.rockSabana3(0xDE965B), x: -0.2, z: -27.2, scale: 5.5, rotY: 0.4, radius: 3.4 }, // High central peak
      { model: this.models.rockSabana5(0xD89258), x: -3.8, z: -26.8, scale: 4.8, rotY: 1.8, radius: 3.0 },
      { model: this.models.rockSabana1(0xD48E55), x:  3.5, z: -26.7, scale: 4.9, rotY: 2.7, radius: 3.1 },
      { model: this.models.rockSabana1(0xD48E55), x: -5.8, z: -27.5, scale: 3.6, rotY: 3.1, radius: 2.3 },
      { model: this.models.rockSabana3(0xDE965B), x:  5.6, z: -27.3, scale: 3.7, rotY: 1.9, radius: 2.3 },
      { model: this.models.rockSabana4(0xC8804A), x: -7.5, z: -26.2, scale: 4.5, rotY: 1.1, radius: 2.8 }, // NW bend
      { model: this.models.rockSabana2(0xCE854E), x:  7.2, z: -26.0, scale: 4.6, rotY: 0.8, radius: 2.9 }, // NE bend

      // --- West Flank (left side curving forward toward player) ---
      { model: this.models.rockSabana2(0xCE854E), x: -7.8, z: -23.5, scale: 4.6, rotY: 2.3, radius: 2.9 },
      { model: this.models.rockSabana4(0xC8804A), x: -9.2, z: -22.0, scale: 3.2, rotY: 0.6, radius: 2.0 }, // Outer support
      { model: this.models.rockSabana3(0xD88E52), x: -7.2, z: -20.8, scale: 4.2, rotY: 0.9, radius: 2.6 },
      { model: this.models.rockSabana5(0xCE824A), x: -6.0, z: -18.2, scale: 3.6, rotY: 1.6, radius: 2.3 }, // Forward tip

      // --- East Flank (right side curving forward toward player) ---
      { model: this.models.rockSabana5(0xD89258), x:  7.9, z: -23.2, scale: 4.5, rotY: 1.4, radius: 2.8 },
      { model: this.models.rockSabana2(0xCE854E), x:  9.3, z: -21.8, scale: 3.3, rotY: 2.0, radius: 2.1 }, // Outer support
      { model: this.models.rockSabana1(0xD48E55), x:  7.4, z: -20.5, scale: 4.1, rotY: 2.5, radius: 2.6 },
      { model: this.models.rockSabana4(0xC8804A), x:  6.2, z: -18.0, scale: 3.5, rotY: 0.3, radius: 2.2 }  // Forward tip
    ];

    forgeCanyonRocks.forEach((rock) => {
      const obj = rock.model;
      obj.position.set(rock.x, 0, rock.z);
      obj.rotation.y = rock.rotY;
      obj.scale.setScalar(rock.scale);
      this.savannahGroup_3_1.add(obj);
      this.blacksmithCollisions_3_1.push({ x: rock.x, z: rock.z, radius: rock.radius });
    });
  }

  _buildArcticDecorations() {
    this._buildArcticDecorations_2_1();
    this._buildArcticDecorations_1_1();
  }

  _buildArcticDecorations_2_1() {
    // =========================================================================
    // ZONE [2, 1] - PICOS GLACIARES DE LUNACIA (Pomodoro at [5.8, 23.2], Chef Boreal at [-7.0, -22.1])
    // Portals: South to Forest [2, 2] at (0, 38), West to Arctic [1, 1] at (-38, 0)
    // =========================================================================

    // 1. Teal / Verde-Azulado Snowy Pines
    const pines21 = [
      // NW Quadrant
      { type: 'pine1', x: -18, z: -24, scale: 2.1, rotY: 0.8, radius: 1.1 },
      { type: 'pine3', x: -26, z: -20, scale: 2.3, rotY: 2.3, radius: 1.2 },
      { type: 'pine2', x: -22, z: -14, scale: 1.8, rotY: 1.1, radius: 1.0 },
      { type: 'pine5', x: -31, z: -28, scale: 2.5, rotY: 3.4, radius: 1.3 },

      // NE Quadrant
      { type: 'pine2', x: 16, z: -20, scale: 2.0, rotY: 1.5, radius: 1.1 },
      { type: 'pine4', x: 25, z: -24, scale: 2.3, rotY: 2.8, radius: 1.2 },
      { type: 'pine1', x: 22, z: -12, scale: 1.9, rotY: 0.4, radius: 1.0 },
      { type: 'pine3', x: 11, z: -15, scale: 2.1, rotY: 2.1, radius: 1.2 },
      { type: 'pine5', x: 29, z: -18, scale: 2.4, rotY: 3.2, radius: 1.3 },
      { type: 'pine1', x: 8.5, z: -6.5, scale: 2.2, rotY: 0.9, radius: 1.1 },

      // SW Quadrant (Leaving West Portal corridor at x: -38 open)
      { type: 'pine3', x: -22, z: 22, scale: 2.1, rotY: 1.7, radius: 1.2 },
      { type: 'pine1', x: -28, z: 16, scale: 1.9, rotY: 0.3, radius: 1.1 },
      { type: 'pine4', x: -16, z: 28, scale: 2.3, rotY: 2.6, radius: 1.2 },
      { type: 'pine2', x: -30, z: 26, scale: 2.0, rotY: 1.0, radius: 1.1 },

      // SE Quadrant (Leaving South Portal corridor at z: 38 open)
      { type: 'pine2', x: 18, z: 22, scale: 2.0, rotY: 0.9, radius: 1.1 },
      { type: 'pine5', x: 27, z: 26, scale: 2.4, rotY: 2.2, radius: 1.3 },
      { type: 'pine1', x: 25, z: 14, scale: 1.8, rotY: 3.1, radius: 1.0 },
      { type: 'pine3', x: 15, z: 29, scale: 2.2, rotY: 1.4, radius: 1.2 }
    ];

    this.arcticTrees_2_1 = [];
    pines21.forEach((p) => {
      const model = this.arcticModels[p.type]();
      model.position.set(p.x, 0, p.z);
      model.rotation.y = p.rotY;
      model.scale.setScalar(p.scale);
      this.arcticGroup_2_1.add(model);
      this.arcticTrees_2_1.push({ x: p.x, z: p.z, radius: p.radius });
    });

    // 2. Glacial Ice Boulders (Glossy, translucent azure ice with specular sheen)
    const iceRocks21 = [
      // NW Quadrant
      { type: 'iceMedium1', x: -15, z: -16, scale: 2.2, rotY: 0.4, radius: 3.3 },
      { type: 'iceRockA', x: -24, z: -28, scale: 3.3, rotY: 1.8, radius: 3.2 },
      { type: 'iceRockFlat', x: -28, z: -12, scale: 3.5, rotY: 2.2, radius: 3.5 },
      { type: 'iceSabana1', x: -20, z: -22, scale: 3.0, rotY: 0.9, radius: 2.0 },

      // NE Quadrant
      { type: 'iceMedium2', x: 20, z: -16, scale: 2.3, rotY: 2.7, radius: 3.4 },
      { type: 'iceRockB', x: 28, z: -26, scale: 3.2, rotY: 1.2, radius: 2.8 },
      { type: 'iceStoneA', x: 14, z: -22, scale: 2.9, rotY: 0.8, radius: 2.0 },
      { type: 'iceSabana3', x: 26, z: -10, scale: 3.2, rotY: 2.5, radius: 2.1 },
      // Near Pomodoro Botanical Glade (5.8, 23.2)
      { type: 'iceRockFlat', x: 4.2, z: 24.8, scale: 2.6, rotY: 0.7, radius: 2.4 },

      // SW Quadrant
      { type: 'iceMedium3', x: -18, z: 16, scale: 2.2, rotY: 1.1, radius: 3.3 },
      { type: 'iceRockB', x: -26, z: 24, scale: 3.1, rotY: 2.3, radius: 2.7 },
      { type: 'iceRockFlat', x: -22, z: 30, scale: 3.5, rotY: 1.9, radius: 3.5 },
      { type: 'iceStoneA', x: -12, z: 26, scale: 2.7, rotY: 0.5, radius: 1.9 },
      // Chef Boreal camp backdrop
      { type: 'iceStoneA', x: -9.8, z: -22.8, scale: 2.5, rotY: 1.2, radius: 1.8 },

      // SE Quadrant
      { type: 'iceMedium1', x: 18, z: 16, scale: 2.2, rotY: 1.9, radius: 3.3 },
      { type: 'iceRockA', x: 28, z: 20, scale: 3.4, rotY: 0.4, radius: 3.3 },
      { type: 'iceRockFlat', x: 22, z: 28, scale: 3.5, rotY: 1.3, radius: 3.5 },
      { type: 'iceStoneA', x: 30, z: 12, scale: 2.8, rotY: 2.8, radius: 2.0 }
    ];

    this.arcticIceRocks_2_1 = [];
    iceRocks21.forEach((r) => {
      const model = this.arcticModels[r.type]();
      model.position.set(r.x, 0, r.z);
      model.rotation.y = r.rotY;
      model.scale.setScalar(r.scale);
      this.arcticGroup_2_1.add(model);
      this.arcticIceRocks_2_1.push({ x: r.x, z: r.z, radius: r.radius });
    });

    // 3. Snow-Dusted Bushes (Adapted from forest + arctic bushes)
    const bushes21 = [
      // NW
      { type: 'bushCommonSnow', x: -17, z: -22, scale: 1.3, rotY: 0.4 },
      { type: 'bushFlowersSnow', x: -23, z: -17, scale: 1.2, rotY: 1.5 },
      { type: 'bushDetailed', x: -14, z: -13, scale: 3.3, rotY: 0.8 },
      { type: 'bushSmall', x: -27, z: -23, scale: 2.8, rotY: 2.6 },

      // Around Pomodoro (5.8, 23.2)
      { type: 'bushFlowersSnow', x: 3.8, z: 21.8, scale: 1.2, rotY: 1.1 },
      { type: 'bushCommonSnow', x: 7.6, z: 24.5, scale: 1.3, rotY: 2.4 },
      { type: 'bushDetailed', x: 14, z: -17, scale: 3.4, rotY: 0.7 },
      { type: 'bushSmall', x: 20, z: -21, scale: 2.7, rotY: 3.1 },
      { type: 'bush', x: 27, z: -15, scale: 3.0, rotY: 1.9 },

      // SW Quadrant
      { type: 'bushCommonSnow', x: -16, z: 19, scale: 1.25, rotY: 0.9 },
      { type: 'bushFlowersSnow', x: -22, z: 25, scale: 1.15, rotY: 2.0 },
      { type: 'bushDetailed', x: -16, z: 29, scale: 3.3, rotY: 1.4 },
      { type: 'bushSmall', x: -24, z: 14, scale: 2.8, rotY: 0.3 },
      { type: 'bush', x: -20, z: 27, scale: 3.1, rotY: 2.7 },
      // Chef Boreal camp clearing (-7.0, -22.1)
      { type: 'bushCommonSnow', x: -9.5, z: -20.5, scale: 1.25, rotY: 0.9 },
      { type: 'bushFlowersSnow', x: -4.8, z: -23.5, scale: 1.15, rotY: 2.0 },

      // SE
      { type: 'bushCommonSnow', x: 16, z: 19, scale: 1.3, rotY: 1.2 },
      { type: 'bushFlowersSnow', x: 23, z: 24, scale: 1.2, rotY: 2.8 },
      { type: 'bushDetailed', x: 26, z: 16, scale: 3.4, rotY: 0.5 },
      { type: 'bushSmall', x: 19, z: 27, scale: 2.8, rotY: 1.8 },

      // --- User Requested Specific Coordinate Spots ---
      // Spot 1: (1.2, -22.3)
      { type: 'bushFlowersSnow', x: 1.2, z: -22.3, scale: 1.25, rotY: 1.1 },
      { type: 'bushSmall', x: 0.3, z: -23.0, scale: 2.7, rotY: 2.4 },
      // Spot 2: (12.9, -10.4)
      { type: 'bushCommonSnow', x: 12.9, z: -10.4, scale: 1.3, rotY: 0.8 },
      { type: 'bushFlowersSnow', x: 13.8, z: -11.2, scale: 1.15, rotY: 2.5 },
      // Spot 3: (31.8, -16.2)
      { type: 'bushDetailed', x: 31.8, z: -16.2, scale: 3.3, rotY: 0.4 },
      { type: 'bushSmall', x: 30.7, z: -17.0, scale: 2.8, rotY: 1.9 },
      // Spot 4: (23.1, -31.7)
      { type: 'bushCommonSnow', x: 23.1, z: -31.7, scale: 1.3, rotY: 1.5 },
      { type: 'bushFlowersSnow', x: 24.2, z: -32.5, scale: 1.2, rotY: 2.8 },
      // Spot 5: (30.5, 26.8)
      { type: 'bushDetailed', x: 30.5, z: 26.8, scale: 3.4, rotY: 0.7 },
      { type: 'bushFlowersSnow', x: 29.5, z: 26.0, scale: 1.2, rotY: 1.6 },
      // Spot 6: (16.3, 34.5)
      { type: 'bushCommonSnow', x: 16.3, z: 34.5, scale: 1.25, rotY: 0.9 },
      { type: 'bushSmall', x: 17.2, z: 33.7, scale: 2.7, rotY: 3.1 },
      // Spot 7: (-6.6, 27.7)
      { type: 'bushCommonSnow', x: -6.6, z: 27.7, scale: 1.3, rotY: 1.4 },
      { type: 'bushFlowersSnow', x: -5.7, z: 28.5, scale: 1.2, rotY: 2.2 },

      // --- Terrain Spread (Enriching open clearings across the biome) ---
      { type: 'bushCommonSnow', x: -12.5, z: -4.5, scale: 1.2, rotY: 0.6 },
      { type: 'bushFlowersSnow', x: -16.0, z: 3.5, scale: 1.25, rotY: 2.1 },
      { type: 'bushSmall', x: -22.5, z: 6.0, scale: 2.8, rotY: 1.3 },
      { type: 'bushFlowersSnow', x: -4.5, z: -12.5, scale: 1.2, rotY: 0.5 },
      { type: 'bushCommonSnow', x: -1.5, z: -6.5, scale: 1.25, rotY: 2.7 },
      { type: 'bushDetailed', x: -3.2, z: 12.5, scale: 3.2, rotY: 1.8 },
      { type: 'bushFlowersSnow', x: 3.5, z: 12.0, scale: 1.2, rotY: 0.4 },
      { type: 'bushCommonSnow', x: 17.5, z: -6.0, scale: 1.3, rotY: 1.1 },
      { type: 'bushSmall', x: 8.2, z: -18.5, scale: 2.6, rotY: 2.9 },
      { type: 'bushCommonSnow', x: 32.5, z: 2.5, scale: 1.25, rotY: 0.7 },
      { type: 'bushSmall', x: 28.0, z: 9.5, scale: 2.8, rotY: 2.0 },
      { type: 'bushCommonSnow', x: -11.5, z: 33.5, scale: 1.3, rotY: 1.7 },
      { type: 'bushSmall', x: -25.5, z: 31.0, scale: 2.7, rotY: 0.5 },
      { type: 'bushFlowersSnow', x: 22.5, z: 33.0, scale: 1.2, rotY: 2.6 },
      { type: 'bushCommonSnow', x: 11.5, z: 27.5, scale: 1.25, rotY: 1.2 },

      // Additional Small Vegetation Scatter across [2, 1]
      // Along Riverbank slopes (snowy margins)
      { type: 'bushSmall', x: 5.2, z: -15.2, scale: 2.5, rotY: 1.1 },
      { type: 'bushFlowersSnow', x: 12.8, z: -13.0, scale: 1.2, rotY: 2.4 },
      { type: 'bushCommonSnow', x: 5.5, z: -5.8, scale: 1.25, rotY: 0.7 },
      { type: 'bushSmall', x: 12.2, z: -2.8, scale: 2.6, rotY: 1.8 },
      { type: 'bushFlowersSnow', x: 5.6, z: 6.2, scale: 1.15, rotY: 3.0 },
      { type: 'bushSmall', x: 12.5, z: 9.2, scale: 2.7, rotY: 0.4 },
      { type: 'bushCommonSnow', x: 5.2, z: 14.8, scale: 1.2, rotY: 2.2 },

      // Ancient Columns surroundings in [2, 1]
      { type: 'bushSmall', x: -14.8, z: -17.2, scale: 2.6, rotY: 0.8 },
      { type: 'bushFlowersSnow', x: -12.0, z: -23.8, scale: 1.15, rotY: 2.1 },
      { type: 'bushSmall', x: 23.2, z: -8.8, scale: 2.5, rotY: 1.5 },
      { type: 'bushCommonSnow', x: 21.0, z: 17.8, scale: 1.25, rotY: 2.9 },
      { type: 'bushSmall', x: -18.2, z: 10.8, scale: 2.6, rotY: 1.2 },

      // Clearings and open fields
      { type: 'bushFlowersSnow', x: -8.5, z: -15.0, scale: 1.2, rotY: 0.5 },
      { type: 'bushSmall', x: -21.0, z: -18.0, scale: 2.6, rotY: 2.7 },
      { type: 'bushCommonSnow', x: -28.5, z: -14.5, scale: 1.25, rotY: 1.6 },
      { type: 'bushSmall', x: 15.5, z: -24.5, scale: 2.7, rotY: 0.9 },
      { type: 'bushFlowersSnow', x: 23.5, z: -13.5, scale: 1.2, rotY: 3.3 },
      { type: 'bushCommonSnow', x: -8.5, z: 7.5, scale: 1.25, rotY: 1.4 },
      { type: 'bushSmall', x: -15.5, z: 19.5, scale: 2.6, rotY: 2.0 },
      { type: 'bushFlowersSnow', x: -25.5, z: 17.5, scale: 1.2, rotY: 0.6 },
      { type: 'bushCommonSnow', x: 14.5, z: 9.5, scale: 1.25, rotY: 2.8 },
      { type: 'bushSmall', x: 24.5, z: 6.5, scale: 2.5, rotY: 1.7 },
      { type: 'bushFlowersSnow', x: 25.5, z: 25.5, scale: 1.2, rotY: 0.3 }
    ];

    bushes21.forEach((b) => {
      const model = this.arcticModels[b.type]();
      model.position.set(b.x, 0, b.z);
      model.rotation.y = b.rotY;
      model.scale.setScalar(b.scale);
      this.arcticGroup_2_1.add(model);
    });

    // 4. Dense Frost Flowers & Arctic Flora
    const flowers21 = [
      // Pomodoro Sacred Botanical Glade (5.8, 23.2)
      { type: 'frostFlower3Group', x: 4.5, z: 22.0, scale: 1.4, rotY: 0.5 },
      { type: 'frostFlower4Group', x: 7.2, z: 22.6, scale: 1.3, rotY: 1.8 },
      { type: 'frostFlower3Single', x: 4.8, z: 24.2, scale: 1.5, rotY: 2.2 },
      { type: 'frostFern', x: 6.8, z: 24.0, scale: 1.4, rotY: 0.9 },
      { type: 'frostPlantBig', x: 3.6, z: 23.5, scale: 1.3, rotY: 1.4 },

      // Chef Boreal camp clearing (-7.0, -22.1)
      { type: 'frostFlower3Group', x: -8.8, z: -23.5, scale: 1.3, rotY: 1.2 },
      { type: 'frostFlower4Group', x: -5.2, z: -20.8, scale: 1.4, rotY: 2.7 },
      { type: 'frostFlower3Single', x: -8.5, z: -20.6, scale: 1.5, rotY: 0.6 },
      { type: 'frostFern', x: -5.5, z: -23.4, scale: 1.3, rotY: 2.0 },

      // Glades & ice boulder edges
      { type: 'frostFlower3Group', x: -14, z: -14, scale: 1.4, rotY: 0.8 },
      { type: 'frostFlower4Group', x: -19, z: -26, scale: 1.3, rotY: 2.5 },
      { type: 'frostFern', x: -21, z: -11, scale: 1.4, rotY: 1.3 },
      { type: 'frostFlower3Single', x: -25, z: -18, scale: 1.5, rotY: 3.0 },

      { type: 'frostFlower3Group', x: 17, z: -13, scale: 1.4, rotY: 1.7 },
      { type: 'frostFlower4Group', x: 22, z: -18, scale: 1.3, rotY: 0.4 },
      { type: 'frostFern', x: 12, z: -18, scale: 1.4, rotY: 2.2 },
      { type: 'frostPlantBig', x: 26, z: -22, scale: 1.3, rotY: 0.9 },

      { type: 'frostFlower3Group', x: -15, z: 14, scale: 1.4, rotY: 2.1 },
      { type: 'frostFlower4Group', x: -24, z: 22, scale: 1.3, rotY: 0.8 },
      { type: 'frostFern', x: -19, z: 25, scale: 1.4, rotY: 1.5 },
      { type: 'frostFlower3Single', x: -27, z: 12, scale: 1.5, rotY: 2.8 },

      { type: 'frostFlower3Group', x: 15, z: 14, scale: 1.4, rotY: 0.6 },
      { type: 'frostFlower4Group', x: 25, z: 18, scale: 1.3, rotY: 1.9 },
      { type: 'frostFern', x: 20, z: 25, scale: 1.4, rotY: 3.2 },
      { type: 'frostPlantBig', x: 17, z: 26, scale: 1.3, rotY: 1.1 },

      // --- User Requested Specific Coordinate Spots ---
      // Spot 1: (1.2, -22.3)
      { type: 'frostFlower3Group', x: 2.0, z: -21.8, scale: 1.4, rotY: 0.8 },
      { type: 'frostFlower4Group', x: 0.6, z: -21.6, scale: 1.3, rotY: 1.9 },
      { type: 'frostFern', x: 1.7, z: -23.0, scale: 1.4, rotY: 2.7 },
      { type: 'frostPlantBig', x: -0.3, z: -22.0, scale: 1.3, rotY: 0.5 },

      // Spot 2: (12.9, -10.4)
      { type: 'frostFlower4Group', x: 12.1, z: -9.8, scale: 1.35, rotY: 1.4 },
      { type: 'frostFlower3Group', x: 13.5, z: -9.5, scale: 1.4, rotY: 2.8 },
      { type: 'frostFern', x: 12.2, z: -11.1, scale: 1.4, rotY: 0.7 },
      { type: 'frostPlantBig', x: 14.2, z: -10.2, scale: 1.3, rotY: 3.1 },

      // Spot 3: (31.8, -16.2)
      { type: 'frostFlower3Group', x: 32.5, z: -15.5, scale: 1.4, rotY: 1.2 },
      { type: 'frostFlower4Group', x: 31.1, z: -15.2, scale: 1.3, rotY: 2.3 },
      { type: 'frostFern', x: 32.7, z: -16.9, scale: 1.4, rotY: 0.4 },
      { type: 'frostFlower3Single', x: 30.3, z: -16.0, scale: 1.5, rotY: 1.8 },

      // Spot 4: (23.1, -31.7)
      { type: 'frostPlantBig', x: 22.2, z: -31.0, scale: 1.3, rotY: 0.9 },
      { type: 'frostFlower3Group', x: 23.8, z: -30.8, scale: 1.4, rotY: 2.1 },
      { type: 'frostFern', x: 22.0, z: -32.4, scale: 1.4, rotY: 1.5 },
      { type: 'frostFlower4Group', x: 24.5, z: -31.2, scale: 1.35, rotY: 3.3 },

      // Spot 5: (30.5, 26.8)
      { type: 'frostFlower4Group', x: 31.4, z: 27.5, scale: 1.35, rotY: 1.1 },
      { type: 'frostFlower3Group', x: 29.8, z: 27.6, scale: 1.4, rotY: 2.5 },
      { type: 'frostFern', x: 31.2, z: 25.8, scale: 1.4, rotY: 0.6 },
      { type: 'frostPlantBig', x: 32.2, z: 26.5, scale: 1.3, rotY: 1.7 },

      // Spot 6: (16.3, 34.5)
      { type: 'frostFlower3Group', x: 15.5, z: 34.0, scale: 1.4, rotY: 1.3 },
      { type: 'frostFlower4Group', x: 16.8, z: 35.2, scale: 1.3, rotY: 2.9 },
      { type: 'frostFern', x: 15.2, z: 35.1, scale: 1.4, rotY: 0.8 },
      { type: 'frostFlower3Single', x: 17.5, z: 35.0, scale: 1.5, rotY: 2.2 },

      // Spot 7: (-6.6, 27.7)
      { type: 'frostFlower4Group', x: -7.4, z: 27.0, scale: 1.35, rotY: 0.7 },
      { type: 'frostFlower3Group', x: -5.9, z: 26.8, scale: 1.4, rotY: 1.9 },
      { type: 'frostFern', x: -7.2, z: 28.6, scale: 1.4, rotY: 2.6 },
      { type: 'frostPlantBig', x: -6.0, z: 29.2, scale: 1.3, rotY: 1.2 },

      // --- Terrain Spread (Across whole terrain) ---
      { type: 'frostFlower3Group', x: -12.5, z: -4.5, scale: 1.4, rotY: 1.5 },
      { type: 'frostFern', x: -13.6, z: -5.2, scale: 1.4, rotY: 0.9 },
      { type: 'frostFlower4Group', x: -16.2, z: 4.2, scale: 1.3, rotY: 2.4 },
      { type: 'frostPlantBig', x: -15.2, z: 2.8, scale: 1.3, rotY: 0.6 },
      { type: 'frostFlower3Group', x: -22.5, z: 6.8, scale: 1.4, rotY: 3.1 },
      { type: 'frostFern', x: -23.4, z: 5.5, scale: 1.4, rotY: 1.2 },
      { type: 'frostFlower4Group', x: -4.2, z: -12.0, scale: 1.3, rotY: 0.8 },
      { type: 'frostFern', x: -5.1, z: -13.2, scale: 1.4, rotY: 2.0 },
      { type: 'frostFlower3Group', x: -1.2, z: -6.0, scale: 1.4, rotY: 1.7 },
      { type: 'frostFern', x: -2.0, z: -7.2, scale: 1.4, rotY: 3.0 },
      { type: 'frostFlower3Group', x: -3.5, z: 13.2, scale: 1.4, rotY: 2.2 },
      { type: 'frostFlower4Group', x: -2.6, z: 11.8, scale: 1.3, rotY: 0.5 },
      { type: 'frostPlantBig', x: 3.8, z: 12.8, scale: 1.3, rotY: 1.9 },
      { type: 'frostFern', x: 2.7, z: 11.4, scale: 1.4, rotY: 2.8 },
      { type: 'frostFlower3Group', x: 17.8, z: -5.5, scale: 1.4, rotY: 0.4 },
      { type: 'frostFern', x: 16.9, z: -6.7, scale: 1.4, rotY: 1.8 },
      { type: 'frostFlower4Group', x: 8.5, z: -18.0, scale: 1.3, rotY: 2.5 },
      { type: 'frostFlower3Single', x: 7.7, z: -19.2, scale: 1.5, rotY: 1.1 },
      { type: 'frostFlower3Group', x: 20.8, z: -27.2, scale: 1.4, rotY: 3.2 },
      { type: 'frostPlantBig', x: 21.6, z: -28.2, scale: 1.3, rotY: 0.8 },
      { type: 'frostFern', x: 19.8, z: -26.8, scale: 1.4, rotY: 1.6 },
      { type: 'frostFlower4Group', x: -31.5, z: -16.2, scale: 1.3, rotY: 2.1 },
      { type: 'frostFern', x: -32.4, z: -17.0, scale: 1.4, rotY: 0.7 },
      { type: 'frostFlower3Group', x: -33.2, z: 18.5, scale: 1.4, rotY: 1.4 },
      { type: 'frostPlantBig', x: -32.0, z: 17.5, scale: 1.3, rotY: 2.7 },
      { type: 'frostFlower4Group', x: 32.8, z: 3.0, scale: 1.3, rotY: 0.9 },
      { type: 'frostFern', x: 31.8, z: 1.8, scale: 1.4, rotY: 2.3 },
      { type: 'frostFlower3Group', x: 28.2, z: 10.0, scale: 1.4, rotY: 3.0 },
      { type: 'frostPlantBig', x: 27.4, z: 8.8, scale: 1.3, rotY: 1.1 },
      { type: 'frostFlower3Group', x: -11.8, z: 33.8, scale: 1.4, rotY: 0.5 },
      { type: 'frostFern', x: -10.9, z: 32.8, scale: 1.4, rotY: 1.9 },
      { type: 'frostFlower4Group', x: -25.2, z: 31.5, scale: 1.3, rotY: 2.8 },
      { type: 'frostPlantBig', x: -26.1, z: 30.2, scale: 1.3, rotY: 0.3 },
      { type: 'frostFlower3Group', x: 22.8, z: 33.5, scale: 1.4, rotY: 1.6 },
      { type: 'frostFern', x: 21.9, z: 32.4, scale: 1.4, rotY: 2.9 },
      { type: 'frostFlower4Group', x: 11.8, z: 27.8, scale: 1.3, rotY: 0.7 },
      { type: 'frostFern', x: 10.9, z: 26.9, scale: 1.4, rotY: 2.1 },

      // Additional Small Vegetation Enrichment across [2, 1]
      // 1. Pomodoro Sacred Glade and surrounding riverbank
      { type: 'frostFlower3Group', x: 3.5, z: 20.2, scale: 1.4, rotY: 1.2 },
      { type: 'frostFlower4Group', x: 8.2, z: 21.0, scale: 1.35, rotY: 2.7 },
      { type: 'frostGrassTuft', x: 6.8, z: 20.5, scale: 1.3, rotY: 0.5 },
      { type: 'frostFern', x: 2.5, z: 24.2, scale: 1.4, rotY: 1.9 },
      { type: 'frostGrassTuft', x: 5.0, z: 25.8, scale: 1.3, rotY: 3.1 },
      { type: 'frostFlower3Single', x: 8.5, z: 23.5, scale: 1.5, rotY: 0.8 },

      // 2. Chef Boreal Camp and Market outskirts
      { type: 'frostFlower3Group', x: -4.2, z: -25.5, scale: 1.4, rotY: 1.7 },
      { type: 'frostFern', x: -8.8, z: -25.8, scale: 1.4, rotY: 0.4 },
      { type: 'frostGrassTuft', x: -5.0, z: -21.2, scale: 1.3, rotY: 2.3 },
      { type: 'frostPlantBig', x: -10.5, z: -22.5, scale: 1.3, rotY: 1.1 },
      { type: 'frostFlower3Single', x: -3.5, z: -23.5, scale: 1.5, rotY: 2.9 },
      { type: 'frostGrassTuft', x: -8.0, z: -19.5, scale: 1.25, rotY: 0.6 },

      // 3. Fluvial Riverbank Borders (Lush icy floral shoreline)
      { type: 'frostFlower4Group', x: 5.5, z: -14.2, scale: 1.3, rotY: 2.0 },
      { type: 'frostGrassTuft', x: 6.2, z: -16.5, scale: 1.3, rotY: 0.9 },
      { type: 'frostFlower3Group', x: 12.2, z: -14.0, scale: 1.4, rotY: 3.3 },
      { type: 'frostFern', x: 13.0, z: -11.5, scale: 1.4, rotY: 1.4 },
      { type: 'frostFlower3Single', x: 5.8, z: -7.2, scale: 1.5, rotY: 0.7 },
      { type: 'frostGrassTuft', x: 11.5, z: -4.5, scale: 1.3, rotY: 2.6 },
      { type: 'frostFlower4Group', x: 6.0, z: 4.8, scale: 1.35, rotY: 1.8 },
      { type: 'frostFern', x: 12.0, z: 7.2, scale: 1.4, rotY: 0.3 },
      { type: 'frostGrassTuft', x: 5.8, z: 12.5, scale: 1.3, rotY: 2.5 },
      { type: 'frostFlower3Group', x: 12.2, z: 15.0, scale: 1.4, rotY: 1.1 },

      // 4. Ancient Columns Flora Accents in [2, 1]
      { type: 'frostFlower3Group', x: -16.8, z: -19.5, scale: 1.4, rotY: 0.9 },
      { type: 'frostFern', x: -14.2, z: -21.5, scale: 1.4, rotY: 2.2 },
      { type: 'frostGrassTuft', x: -12.2, z: -23.2, scale: 1.3, rotY: 1.6 },
      { type: 'frostFlower4Group', x: 22.0, z: -7.2, scale: 1.35, rotY: 3.0 },
      { type: 'frostFlower3Single', x: 25.2, z: -7.8, scale: 1.5, rotY: 0.5 },
      { type: 'frostGrassTuft', x: 26.8, z: -5.8, scale: 1.3, rotY: 2.1 },
      { type: 'frostFern', x: 19.8, z: 19.2, scale: 1.4, rotY: 1.3 },
      { type: 'frostFlower3Group', x: 24.2, z: 22.5, scale: 1.4, rotY: 0.6 },
      { type: 'frostGrassTuft', x: -18.8, z: 13.2, scale: 1.3, rotY: 2.8 },
      { type: 'frostFlower4Group', x: -20.2, z: 11.2, scale: 1.35, rotY: 1.5 },

      // 5. Broad Meadow Scatter
      { type: 'frostGrassTuft', x: -7.2, z: -16.2, scale: 1.3, rotY: 0.8 },
      { type: 'frostFlower3Group', x: -10.2, z: -17.5, scale: 1.4, rotY: 2.4 },
      { type: 'frostFern', x: -20.5, z: -19.5, scale: 1.4, rotY: 1.7 },
      { type: 'frostFlower4Group', x: -26.5, z: -15.5, scale: 1.3, rotY: 0.2 },
      { type: 'frostGrassTuft', x: 16.5, z: -23.5, scale: 1.3, rotY: 1.9 },
      { type: 'frostFlower3Single', x: 22.5, z: -15.5, scale: 1.5, rotY: 3.2 },
      { type: 'frostPlantBig', x: 27.5, z: -7.5, scale: 1.3, rotY: 0.4 },
      { type: 'frostGrassTuft', x: -7.5, z: 9.5, scale: 1.3, rotY: 2.7 },
      { type: 'frostFlower3Group', x: -13.5, z: 16.5, scale: 1.4, rotY: 1.0 },
      { type: 'frostFern', x: -20.5, z: 10.5, scale: 1.4, rotY: 2.5 },
      { type: 'frostGrassTuft', x: -27.5, z: 7.5, scale: 1.3, rotY: 0.3 },
      { type: 'frostFlower4Group', x: 13.5, z: 8.5, scale: 1.35, rotY: 1.6 },
      { type: 'frostFlower3Single', x: 19.5, z: 7.5, scale: 1.5, rotY: 2.8 },
      { type: 'frostGrassTuft', x: 25.5, z: 5.5, scale: 1.3, rotY: 0.7 },
      { type: 'frostFlower3Group', x: 15.5, z: 23.5, scale: 1.4, rotY: 2.2 },
      { type: 'frostGrassTuft', x: 23.5, z: 25.5, scale: 1.3, rotY: 1.4 },
      { type: 'frostFern', x: 27.5, z: 15.5, scale: 1.4, rotY: 3.0 }
    ];

    flowers21.forEach((f) => {
      const model = this.arcticModels[f.type]();
      model.position.set(f.x, 0, f.z);
      model.rotation.y = f.rotY;
      model.scale.setScalar(f.scale);
      this.arcticGroup_2_1.add(model);
    });

    // 5. Ancient Glacial Stone Columns with Snow Mounds & Bluish Ivy (column.glb & column2.glb)
    const columns21 = [
      // NW Highland Ridge (Overlooking glacial valley)
      { type: 'column', x: -16.0, z: -18.5, scale: 10.5, rotY: 0.8, radius: 0.95 },
      { type: 'columnRuined', x: -13.0, z: -22.5, scale: 13.5, rotY: 2.1, radius: 0.95 },

      // NE Frost Colonnade (Framing alpine vista)
      { type: 'column', x: 21.5, z: -8.5, scale: 10.5, rotY: -0.6, radius: 0.95 },
      { type: 'columnRuined', x: 26.0, z: -6.5, scale: 13.5, rotY: 1.5, radius: 0.95 },

      // SE Forgotten Sanctuary Edge
      { type: 'columnRuined', x: 20.5, z: 18.5, scale: 13.0, rotY: 3.0, radius: 0.95 },
      { type: 'column', x: 25.0, z: 21.5, scale: 10.5, rotY: 0.4, radius: 0.95 },

      // SW Valley Ancient Ruin
      { type: 'columnRuined', x: -19.5, z: 12.0, scale: 13.0, rotY: 1.8, radius: 0.95 }
    ];

    this.arcticColumns_2_1 = [];
    columns21.forEach((c) => {
      const model = this.arcticModels[c.type]();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.arcticGroup_2_1.add(model);
      this.arcticColumns_2_1.push({ x: c.x, z: c.z, radius: c.radius });
    });

    // 6. Arctic Snowmen (snowman_artic.glb)
    const snowmen21 = [
      // Camp Chef Boreal (Friendly snowman near camp clearing)
      { x: -9.5, z: -20.5, height: 1.35, rotY: 0.6, radius: 0.60 },
      // Pomodoro Botanical Glade (Snowman looking toward the riverbank)
      { x: 3.2, z: 21.0, height: 1.25, rotY: 2.1, radius: 0.55 },
      // NE Highland Overlook
      { x: 18.5, z: -11.5, height: 1.40, rotY: -0.8, radius: 0.60 },
      // East Bank river crossing path
      { x: 12.5, z: 4.5, height: 1.30, rotY: 1.4, radius: 0.55 },
      // SW Snow clearing
      { x: -14.5, z: 8.5, height: 1.35, rotY: 0.3, radius: 0.60 }
    ];

    this.arcticSnowmen_2_1 = [];
    snowmen21.forEach((s) => {
      const model = this.arcticModels.snowman(s.height);
      model.position.set(s.x, 0, s.z);
      model.rotation.y = s.rotY;
      this.arcticGroup_2_1.add(model);
      this.arcticSnowmen_2_1.push({ x: s.x, z: s.z, radius: s.radius });
    });

    // 7. Arctic Market Stall at [-6.6, -25.7] (market_artic.glb)
    const market = this.arcticModels.market(3.2);
    market.position.set(-6.6, 0, -25.7);
    market.rotation.y = 0.08;
    this.arcticGroup_2_1.add(market);
    this.arcticMarketCollisions_2_1 = [
      { x: -6.6, z: -25.7, radius: 1.45 }
    ];
  }

  _buildArcticDecorations_1_1() {
    // =========================================================================
    // ZONE [1, 1] - VALLE DE ESCARCHA ETERNA (Ermitaño Glacial at [-2, -4])
    // Portals: East to Arctic [2, 1] at (38, 0), South to Mystic [1, 2] at (0, 38)
    // =========================================================================

    // 1. Towering Ancient Frost Pines (Teal / Verde-Azulado + Snow Top)
    const pines11 = [
      // Ancient pines framing Ermitaño Glacial at [-2, -4]
      { type: 'pine1', x: -7, z: -7, scale: 2.5, rotY: 1.1, radius: 1.3 },
      { type: 'pine3', x: 3.5, z: -8.5, scale: 2.4, rotY: 2.5, radius: 1.2 },
      { type: 'pine5', x: -1.5, z: -12.5, scale: 2.2, rotY: 0.5, radius: 1.2 },

      // NW Alpine Mountain Ridge
      { type: 'pine4', x: -20, z: -22, scale: 2.5, rotY: 0.4, radius: 1.3 },
      { type: 'pine2', x: -28, z: -16, scale: 2.2, rotY: 1.9, radius: 1.2 },
      { type: 'pine5', x: -16, z: -28, scale: 2.6, rotY: 3.1, radius: 1.4 },
      { type: 'pine1', x: -27, z: -28, scale: 2.3, rotY: 1.2, radius: 1.2 },
      { type: 'pine3', x: -12, z: -20, scale: 1.9, rotY: 2.7, radius: 1.1 },

      // NE Mountain Flank (Leaving East Portal at x: 38 corridor open)
      { type: 'pine3', x: 18, z: -22, scale: 2.3, rotY: 2.4, radius: 1.2 },
      { type: 'pine1', x: 26, z: -18, scale: 2.1, rotY: 0.8, radius: 1.1 },
      { type: 'pine5', x: 22, z: -28, scale: 2.5, rotY: 1.5, radius: 1.3 },
      { type: 'pine2', x: 14, z: -16, scale: 1.8, rotY: 3.3, radius: 1.0 },

      // SW Mountain Flank
      { type: 'pine2', x: -24, z: 20, scale: 2.2, rotY: 1.2, radius: 1.2 },
      { type: 'pine4', x: -18, z: 26, scale: 2.4, rotY: 0.6, radius: 1.3 },
      { type: 'pine1', x: -28, z: 28, scale: 2.1, rotY: 2.1, radius: 1.1 },
      { type: 'pine3', x: -14, z: 18, scale: 1.9, rotY: 3.5, radius: 1.1 },

      // SE Foothills (Leaving South Portal corridor at z: 38 open)
      { type: 'pine5', x: 24, z: 22, scale: 2.5, rotY: 0.7, radius: 1.3 },
      { type: 'pine2', x: 20, z: 28, scale: 2.1, rotY: 2.9, radius: 1.1 },
      { type: 'pine3', x: 28, z: 16, scale: 2.0, rotY: 1.6, radius: 1.1 }
    ];

    this.arcticTrees_1_1 = [];
    pines11.forEach((p) => {
      const model = this.arcticModels[p.type]();
      model.position.set(p.x, 0, p.z);
      model.rotation.y = p.rotY;
      model.scale.setScalar(p.scale);
      this.arcticGroup_1_1.add(model);
      this.arcticTrees_1_1.push({ x: p.x, z: p.z, radius: p.radius });
    });

    // 2. Glacial Ice Monoliths & Boulders (Translucent azure ice with specular shine)
    const iceRocks11 = [
      // Glacial Monolith Ring around Ermitaño Glacial [-2, -4]
      { type: 'iceMedium3', x: -5.5, z: -2.5, scale: 2.4, rotY: 0.8, radius: 3.5 },
      { type: 'iceMedium1', x: 2.8, z: -3.2, scale: 2.2, rotY: 2.2, radius: 3.3 },
      { type: 'iceRockA', x: -1.8, z: -8.5, scale: 3.6, rotY: 1.4, radius: 3.4 },
      { type: 'iceSabana1', x: 4.6, z: -0.8, scale: 3.3, rotY: 0.5, radius: 2.2 },

      // NW Mountain Ridge
      { type: 'iceMedium2', x: -17, z: -15, scale: 2.3, rotY: 1.7, radius: 3.4 },
      { type: 'iceRockB', x: -26, z: -22, scale: 3.2, rotY: 0.6, radius: 2.9 },
      { type: 'iceRockFlat', x: -22, z: -29, scale: 3.6, rotY: 2.8, radius: 3.6 },
      { type: 'iceSabana3', x: -30, z: -12, scale: 3.2, rotY: 1.1, radius: 2.1 },

      // NE Frozen Ledges
      { type: 'iceMedium1', x: 19, z: -15, scale: 2.2, rotY: 2.1, radius: 3.3 },
      { type: 'iceRockA', x: 27, z: -24, scale: 3.4, rotY: 0.3, radius: 3.2 },
      { type: 'iceStoneA', x: 15, z: -24, scale: 2.9, rotY: 1.9, radius: 2.0 },
      { type: 'iceRockFlat', x: 23, z: -10, scale: 3.5, rotY: 2.4, radius: 3.5 },

      // SW Crevasse Edge
      { type: 'iceMedium3', x: -17, z: 15, scale: 2.3, rotY: 0.9, radius: 3.4 },
      { type: 'iceSabana1', x: -26, z: 22, scale: 3.1, rotY: 2.5, radius: 2.1 },
      { type: 'iceRockB', x: -21, z: 29, scale: 3.3, rotY: 1.2, radius: 3.0 },
      { type: 'iceStoneA', x: -12, z: 25, scale: 2.8, rotY: 0.4, radius: 1.9 },

      // SE Boundary
      { type: 'iceMedium2', x: 18, z: 15, scale: 2.2, rotY: 1.6, radius: 3.3 },
      { type: 'iceRockFlat', x: 25, z: 25, scale: 3.5, rotY: 0.7, radius: 3.5 },
      { type: 'iceRockA', x: 27, z: 11, scale: 3.3, rotY: 2.9, radius: 3.1 },
      { type: 'iceSabana3', x: 21, z: 29, scale: 3.2, rotY: 1.4, radius: 2.1 }
    ];

    this.arcticIceRocks_1_1 = [];
    iceRocks11.forEach((r) => {
      const model = this.arcticModels[r.type]();
      model.position.set(r.x, 0, r.z);
      model.rotation.y = r.rotY;
      model.scale.setScalar(r.scale);
      this.arcticGroup_1_1.add(model);
      this.arcticIceRocks_1_1.push({ x: r.x, z: r.z, radius: r.radius });
    });

    // 3. Snow-Covered Bushes
    const bushes11 = [
      // Shaman Surroundings
      { type: 'bushFlowersSnow', x: -4.5, z: -6.2, scale: 1.25, rotY: 1.0 },
      { type: 'bushCommonSnow', x: 1.5, z: -5.5, scale: 1.3, rotY: 2.1 },
      { type: 'bushDetailed', x: -0.5, z: -2.0, scale: 3.3, rotY: 0.4 },

      // NW
      { type: 'bushCommonSnow', x: -15, z: -24, scale: 1.3, rotY: 0.5 },
      { type: 'bushFlowersSnow', x: -24, z: -18, scale: 1.2, rotY: 1.8 },
      { type: 'bushDetailed', x: -19, z: -11, scale: 3.4, rotY: 2.6 },
      { type: 'bushSmall', x: -28, z: -25, scale: 2.8, rotY: 0.9 },

      // NE
      { type: 'bushCommonSnow', x: 16, z: -19, scale: 1.3, rotY: 1.4 },
      { type: 'bushFlowersSnow', x: 23, z: -14, scale: 1.2, rotY: 2.7 },
      { type: 'bushDetailed', x: 20, z: -25, scale: 3.4, rotY: 0.8 },
      { type: 'bushSmall', x: 27, z: -21, scale: 2.8, rotY: 3.2 },

      // SW
      { type: 'bushCommonSnow', x: -16, z: 21, scale: 1.3, rotY: 1.1 },
      { type: 'bushFlowersSnow', x: -23, z: 16, scale: 1.2, rotY: 2.4 },
      { type: 'bushDetailed', x: -19, z: 27, scale: 3.4, rotY: 0.6 },
      { type: 'bushSmall', x: -27, z: 24, scale: 2.8, rotY: 1.9 },

      // SE
      { type: 'bushCommonSnow', x: 17, z: 18, scale: 1.3, rotY: 0.7 },
      { type: 'bushFlowersSnow', x: 24, z: 25, scale: 1.2, rotY: 2.0 },
      { type: 'bushDetailed', x: 21, z: 26, scale: 3.4, rotY: 1.3 },
      { type: 'bushSmall', x: 26, z: 18, scale: 2.8, rotY: 3.5 },

      // Additional Terrain Spread for [1, 1]
      { type: 'bushCommonSnow', x: -10.5, z: -11.0, scale: 1.25, rotY: 1.2 },
      { type: 'bushFlowersSnow', x: 10.5, z: -8.5, scale: 1.2, rotY: 2.1 },
      { type: 'bushCommonSnow', x: -8.0, z: 12.0, scale: 1.3, rotY: 0.5 },
      { type: 'bushFlowersSnow', x: 8.5, z: 10.5, scale: 1.2, rotY: 1.8 },
      { type: 'bushSmall', x: 0.0, z: 18.0, scale: 2.7, rotY: 2.5 },
      { type: 'bushCommonSnow', x: -2.0, z: -16.0, scale: 1.25, rotY: 0.9 },

      // Additional Small Bush Vegetation Scatter across [1, 1]
      // 1. Surrounding Frozen Lake 1 (-22.9, 2.3) rocky border
      { type: 'bushFlowersSnow', x: -22.0, z: 7.8, scale: 1.2, rotY: 1.3 },
      { type: 'bushSmall', x: -24.8, z: 7.2, scale: 2.6, rotY: 2.7 },
      { type: 'bushCommonSnow', x: -22.2, z: -3.2, scale: 1.25, rotY: 0.8 },
      { type: 'bushSmall', x: -16.2, z: 1.8, scale: 2.5, rotY: 3.1 },
      { type: 'bushFlowersSnow', x: -16.8, z: -1.0, scale: 1.15, rotY: 1.6 },

      // 2. Surrounding Frozen Lake 2 (3.7, -26.1) rocky border
      { type: 'bushSmall', x: 3.2, z: -20.2, scale: 2.6, rotY: 1.9 },
      { type: 'bushFlowersSnow', x: 6.2, z: -20.8, scale: 1.2, rotY: 0.6 },
      { type: 'bushCommonSnow', x: 3.8, z: -32.0, scale: 1.25, rotY: 2.4 },
      { type: 'bushSmall', x: 10.8, z: -25.5, scale: 2.5, rotY: 1.2 },
      { type: 'bushFlowersSnow', x: -3.2, z: -26.0, scale: 1.15, rotY: 2.8 },

      // 3. Cabin (-31.3, -5.0) nature accents (Ermitaño at [-31.6, 5.1] kept clear and visible)
      { type: 'bushFlowersSnow', x: -28.2, z: -7.2, scale: 1.2, rotY: 2.1 },
      { type: 'bushSmall', x: -28.5, z: -3.2, scale: 2.6, rotY: 0.9 },
      { type: 'bushCommonSnow', x: -34.2, z: -4.8, scale: 1.25, rotY: 3.3 },

      // 4. Ancient Columns surroundings in [1, 1]
      { type: 'bushSmall', x: -12.5, z: -6.0, scale: 2.5, rotY: 1.8 },
      { type: 'bushFlowersSnow', x: -9.8, z: -8.2, scale: 1.15, rotY: 0.5 },
      { type: 'bushSmall', x: 6.2, z: -5.5, scale: 2.5, rotY: 2.2 },
      { type: 'bushCommonSnow', x: 8.8, z: -7.5, scale: 1.25, rotY: 1.1 },

      // 5. Valley Floor and Forest Meadows
      { type: 'bushSmall', x: -4.5, z: 0.8, scale: 2.6, rotY: 0.4 },
      { type: 'bushFlowersSnow', x: 2.8, z: 1.2, scale: 1.2, rotY: 2.6 },
      { type: 'bushCommonSnow', x: 4.8, z: -4.2, scale: 1.25, rotY: 1.7 },
      { type: 'bushSmall', x: 8.2, z: -12.2, scale: 2.7, rotY: 3.0 },
      { type: 'bushFlowersSnow', x: 14.5, z: -6.2, scale: 1.2, rotY: 0.8 },
      { type: 'bushCommonSnow', x: -6.2, z: 8.2, scale: 1.25, rotY: 2.3 },
      { type: 'bushSmall', x: 6.8, z: 7.2, scale: 2.6, rotY: 1.4 },
      { type: 'bushFlowersSnow', x: 12.8, z: 15.2, scale: 1.2, rotY: 3.2 },
      { type: 'bushCommonSnow', x: -14.2, z: 14.2, scale: 1.25, rotY: 0.9 }
    ];

    bushes11.forEach((b) => {
      const model = this.arcticModels[b.type]();
      model.position.set(b.x, 0, b.z);
      model.rotation.y = b.rotY;
      model.scale.setScalar(b.scale);
      this.arcticGroup_1_1.add(model);
    });

    // 4. Dense Frost Flowers & Arctic Nature
    const flowers11 = [
      // Shaman Glacial Shrine Sanctuary
      { type: 'frostFlower3Group', x: -3.8, z: -3.2, scale: 1.5, rotY: 0.4 },
      { type: 'frostFlower4Group', x: -0.8, z: -5.2, scale: 1.4, rotY: 1.6 },
      { type: 'frostFlower3Single', x: -3.2, z: -5.0, scale: 1.6, rotY: 2.3 },
      { type: 'frostFern', x: 1.2, z: -2.8, scale: 1.5, rotY: 0.8 },
      { type: 'frostPlantBig', x: -5.0, z: -4.5, scale: 1.4, rotY: 2.9 },
      { type: 'frostFlower3Group', x: 0.5, z: -4.5, scale: 1.4, rotY: 1.1 },

      // Valley Floor & Mountain Ridge Glades
      { type: 'frostFlower3Group', x: -14, z: -16, scale: 1.4, rotY: 0.7 },
      { type: 'frostFlower4Group', x: -22, z: -24, scale: 1.3, rotY: 2.1 },
      { type: 'frostFern', x: -18, z: -18, scale: 1.4, rotY: 1.4 },
      { type: 'frostFlower3Single', x: -26, z: -14, scale: 1.5, rotY: 3.2 },

      { type: 'frostFlower3Group', x: 15, z: -14, scale: 1.4, rotY: 1.5 },
      { type: 'frostFlower4Group', x: 24, z: -21, scale: 1.3, rotY: 0.5 },
      { type: 'frostFern', x: 19, z: -18, scale: 1.4, rotY: 2.8 },
      { type: 'frostPlantBig', x: 25, z: -12, scale: 1.3, rotY: 1.2 },

      { type: 'frostFlower3Group', x: -14, z: 15, scale: 1.4, rotY: 2.0 },
      { type: 'frostFlower4Group', x: -22, z: 24, scale: 1.3, rotY: 0.9 },
      { type: 'frostFern', x: -17, z: 23, scale: 1.4, rotY: 1.7 },
      { type: 'frostFlower3Single', x: -25, z: 17, scale: 1.5, rotY: 3.1 },

      { type: 'frostFlower3Group', x: 15, z: 13, scale: 1.4, rotY: 0.8 },
      { type: 'frostFlower4Group', x: 23, z: 21, scale: 1.3, rotY: 1.7 },
      { type: 'frostFern', x: 18, z: 25, scale: 1.4, rotY: 2.5 },
      { type: 'frostPlantBig', x: 26, z: 14, scale: 1.3, rotY: 0.3 },

      // Additional Terrain Spread for [1, 1]
      { type: 'frostFlower3Group', x: -10.0, z: -10.5, scale: 1.4, rotY: 0.8 },
      { type: 'frostFern', x: -11.2, z: -11.8, scale: 1.4, rotY: 2.2 },
      { type: 'frostFlower4Group', x: 10.8, z: -8.0, scale: 1.3, rotY: 1.5 },
      { type: 'frostPlantBig', x: 11.5, z: -9.2, scale: 1.3, rotY: 3.0 },
      { type: 'frostFlower3Group', x: -7.5, z: 12.5, scale: 1.4, rotY: 1.1 },
      { type: 'frostFern', x: -8.6, z: 11.4, scale: 1.4, rotY: 2.6 },
      { type: 'frostFlower4Group', x: 9.0, z: 11.0, scale: 1.3, rotY: 0.4 },
      { type: 'frostFlower3Single', x: 8.2, z: 9.8, scale: 1.5, rotY: 1.9 },
      { type: 'frostFlower3Group', x: 0.5, z: 18.5, scale: 1.4, rotY: 2.7 },
      { type: 'frostFern', x: -0.8, z: 17.5, scale: 1.4, rotY: 0.6 },
      { type: 'frostFlower4Group', x: -1.5, z: -15.5, scale: 1.3, rotY: 1.3 },
      { type: 'frostPlantBig', x: -2.8, z: -16.8, scale: 1.3, rotY: 2.8 },

      // Additional Small Vegetation Scatter across [1, 1]
      // 1. Rocky perimeter of Frozen Lake 1 (-22.9, 2.3)
      { type: 'frostFlower3Group', x: -22.5, z: 7.5, scale: 1.4, rotY: 0.8 },
      { type: 'frostFlower4Group', x: -25.2, z: 6.8, scale: 1.35, rotY: 2.1 },
      { type: 'frostGrassTuft', x: -19.8, z: 7.2, scale: 1.3, rotY: 1.5 },
      { type: 'frostFern', x: -23.0, z: -2.8, scale: 1.4, rotY: 3.0 },
      { type: 'frostFlower3Single', x: -26.2, z: -2.2, scale: 1.5, rotY: 0.4 },
      { type: 'frostGrassTuft', x: -19.5, z: -3.5, scale: 1.25, rotY: 2.6 },
      { type: 'frostFlower4Group', x: -16.0, z: 1.2, scale: 1.35, rotY: 1.7 },
      { type: 'frostFern', x: -16.5, z: 3.2, scale: 1.4, rotY: 0.9 },

      // 2. Rocky perimeter of Frozen Lake 2 (3.7, -26.1)
      { type: 'frostFlower3Group', x: 3.5, z: -20.5, scale: 1.4, rotY: 1.4 },
      { type: 'frostFlower4Group', x: 6.5, z: -20.2, scale: 1.35, rotY: 2.8 },
      { type: 'frostGrassTuft', x: 0.8, z: -21.0, scale: 1.3, rotY: 0.6 },
      { type: 'frostFern', x: 3.2, z: -31.8, scale: 1.4, rotY: 2.0 },
      { type: 'frostFlower3Single', x: 6.0, z: -31.5, scale: 1.5, rotY: 3.3 },
      { type: 'frostGrassTuft', x: 1.2, z: -31.2, scale: 1.25, rotY: 1.2 },
      { type: 'frostFlower4Group', x: 10.5, z: -25.2, scale: 1.35, rotY: 0.5 },
      { type: 'frostFern', x: 10.8, z: -27.2, scale: 1.4, rotY: 2.4 },
      { type: 'frostGrassTuft', x: -3.5, z: -25.2, scale: 1.3, rotY: 1.8 },
      { type: 'frostFlower3Group', x: -3.8, z: -27.0, scale: 1.4, rotY: 0.3 },

      // 3. Cabin (-31.3, -5.0) flora (Ermitaño at [-31.6, 5.1] kept clear and visible without obstructing plants)
      { type: 'frostFlower3Group', x: -28.2, z: -6.0, scale: 1.4, rotY: 2.2 },
      { type: 'frostGrassTuft', x: -28.5, z: -4.2, scale: 1.3, rotY: 0.7 },
      { type: 'frostFern', x: -33.8, z: -3.5, scale: 1.4, rotY: 1.9 },
      { type: 'frostFlower4Group', x: -34.0, z: -6.5, scale: 1.3, rotY: 3.1 },
      { type: 'frostPlantBig', x: -30.0, z: -8.2, scale: 1.3, rotY: 0.5 },

      // 4. Ancient Columns accents in [1, 1]
      { type: 'frostFlower3Group', x: -11.8, z: -8.2, scale: 1.4, rotY: 1.8 },
      { type: 'frostFern', x: -9.8, z: -6.2, scale: 1.4, rotY: 0.4 },
      { type: 'frostGrassTuft', x: -12.5, z: -7.5, scale: 1.3, rotY: 2.7 },
      { type: 'frostFlower4Group', x: 6.8, z: -7.8, scale: 1.35, rotY: 3.2 },
      { type: 'frostFlower3Single', x: 8.5, z: -5.2, scale: 1.5, rotY: 1.1 },
      { type: 'frostGrassTuft', x: 8.2, z: -7.5, scale: 1.3, rotY: 0.6 },

      // 5. Valley Meadows and snowy paths
      { type: 'frostGrassTuft', x: -5.2, z: -0.5, scale: 1.3, rotY: 0.9 },
      { type: 'frostFlower3Group', x: -3.2, z: 2.5, scale: 1.4, rotY: 2.3 },
      { type: 'frostFern', x: 1.8, z: 0.5, scale: 1.4, rotY: 1.5 },
      { type: 'frostFlower4Group', x: 3.5, z: -3.8, scale: 1.35, rotY: 0.2 },
      { type: 'frostGrassTuft', x: 5.2, z: 1.8, scale: 1.3, rotY: 2.8 },
      { type: 'frostFlower3Single', x: -0.8, z: 4.5, scale: 1.5, rotY: 1.7 },
      { type: 'frostFlower3Group', x: 7.8, z: -12.5, scale: 1.4, rotY: 3.1 },
      { type: 'frostGrassTuft', x: 12.5, z: -17.5, scale: 1.3, rotY: 0.8 },
      { type: 'frostFern', x: 16.5, z: -11.5, scale: 1.4, rotY: 2.5 },
      { type: 'frostFlower4Group', x: 22.5, z: -7.5, scale: 1.35, rotY: 1.4 },
      { type: 'frostPlantBig', x: 25.5, z: -13.5, scale: 1.3, rotY: 0.6 },
      { type: 'frostGrassTuft', x: 5.8, z: 8.5, scale: 1.3, rotY: 2.0 },
      { type: 'frostFlower3Group', x: 10.5, z: 15.5, scale: 1.4, rotY: 0.5 },
      { type: 'frostFern', x: 15.2, z: 8.5, scale: 1.4, rotY: 1.9 },
      { type: 'frostFlower4Group', x: 14.5, z: 21.5, scale: 1.35, rotY: 3.0 },
      { type: 'frostGrassTuft', x: 21.8, z: 9.5, scale: 1.3, rotY: 1.1 },
      { type: 'frostFlower3Single', x: 24.5, z: 17.5, scale: 1.5, rotY: 2.6 },
      { type: 'frostGrassTuft', x: -9.5, z: -15.5, scale: 1.3, rotY: 0.4 },
      { type: 'frostFlower3Group', x: -14.5, z: -11.5, scale: 1.4, rotY: 2.1 },
      { type: 'frostFern', x: -17.5, z: -7.5, scale: 1.4, rotY: 1.3 },
      { type: 'frostGrassTuft', x: -15.5, z: -21.5, scale: 1.3, rotY: 2.7 },
      { type: 'frostFlower4Group', x: -7.8, z: 17.5, scale: 1.35, rotY: 0.8 },
      { type: 'frostFern', x: -12.5, z: 21.5, scale: 1.4, rotY: 2.4 },
      { type: 'frostGrassTuft', x: -15.2, z: 9.5, scale: 1.3, rotY: 1.6 },
      { type: 'frostFlower3Group', x: -20.5, z: 17.5, scale: 1.4, rotY: 3.3 }
    ];

    flowers11.forEach((f) => {
      const model = this.arcticModels[f.type]();
      model.position.set(f.x, 0, f.z);
      model.rotation.y = f.rotY;
      model.scale.setScalar(f.scale);
      this.arcticGroup_1_1.add(model);
    });

    // 5. Ancient Glacial Stone Columns with Snow Mounds & Bluish Ivy in [1, 1]
    const columns11 = [
      { type: 'column', x: -11.0, z: -7.0, scale: 10.5, rotY: 1.0, radius: 0.95 },
      { type: 'columnRuined', x: 7.5, z: -6.5, scale: 13.5, rotY: 2.4, radius: 0.95 }
    ];

    this.arcticColumns_1_1 = [];
    columns11.forEach((c) => {
      const model = this.arcticModels[c.type]();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.arcticGroup_1_1.add(model);
      this.arcticColumns_1_1.push({ x: c.x, z: c.z, radius: c.radius });
    });

    // 6. Arctic Snowmen (snowman_artic.glb)
    const snowmen11 = [
      // Shaman Glacial Shrine (Companion beside the shrine)
      { x: 1.8, z: -2.8, height: 1.35, rotY: -1.2, radius: 0.60 },
      // NW Alpine Ridge among the pines
      { x: -15.5, z: -14.0, height: 1.40, rotY: 0.5, radius: 0.60 },
      // NE Mountain Trail
      { x: 16.5, z: -10.5, height: 1.25, rotY: 2.3, radius: 0.55 },
      // SW Forest clearing
      { x: -8.5, z: 15.0, height: 1.30, rotY: 1.1, radius: 0.55 },
      // SE Meadow
      { x: 11.5, z: 16.0, height: 1.35, rotY: -0.4, radius: 0.60 }
    ];

    this.arcticSnowmen_1_1 = [];
    snowmen11.forEach((s) => {
      const model = this.arcticModels.snowman(s.height);
      model.position.set(s.x, 0, s.z);
      model.rotation.y = s.rotY;
      this.arcticGroup_1_1.add(model);
      this.arcticSnowmen_1_1.push({ x: s.x, z: s.z, radius: s.radius });
    });

    // 7. Arctic House at [-31.3, -5.0] (house_artic.glb)
    const house = this.arcticModels.house(10.2);
    house.position.set(-31.3, 0, -5.0);
    house.rotation.y = 0.55; // Oriented towards southeast overlooking the frozen lake
    this.arcticGroup_1_1.add(house);
    this.arcticHouseCollisions_1_1 = [
      { x: -31.3, z: -5.0, radius: 3.0 }
    ];
  }

  _buildMysticDecorations() {
    this._buildMysticDecorations_1_2();
    this._buildMysticDecorations_1_3();
  }

  _buildMysticDecorations_1_2() {
    // Macro-Zone [1, 2]: Claro Astral de Lunacia (NPCs: Polar Sage at [-8.3, 0, 17.3], Astrologer at [29.8, 0, -24.7], Mystic Pond at [-16, 14])
    // 1. Vibrant Orange & Sakura Pink Twisted Trees (TwistedTree_1..5)
    const trees12 = [
      // NW Quadrant
      { type: 'treeOrange1', x: -18, z: -14, scale: 0.58, rotY: 0.8, radius: 1.05 },
      { type: 'treeSakura2', x: -26, z: -20, scale: 0.55, rotY: 1.5, radius: 1.05 },
      { type: 'treeOrange3', x: -28, z: -10, scale: 0.52, rotY: 2.2, radius: 1.00 },
      { type: 'treeSakura4', x: -14, z: -28, scale: 0.56, rotY: 0.4, radius: 1.05 },
      { type: 'treeOrange5', x: -24, z: -30, scale: 0.60, rotY: 3.1, radius: 1.10 },
      { type: 'treeSakura1', x: -10, z: -18, scale: 0.50, rotY: 1.9, radius: 0.95 },
      // NE Quadrant
      { type: 'treeSakura2', x: 18, z: -16, scale: 0.58, rotY: 1.2, radius: 1.05 },
      { type: 'treeOrange3', x: 26, z: -22, scale: 0.60, rotY: 2.5, radius: 1.10 },
      { type: 'treeSakura4', x: 14, z: -28, scale: 0.54, rotY: 0.7, radius: 1.00 },
      { type: 'treeOrange5', x: 28, z: -10, scale: 0.56, rotY: 3.0, radius: 1.05 },
      { type: 'treeSakura1', x: 22, z: -30, scale: 0.58, rotY: 1.8, radius: 1.05 },
      { type: 'treeOrange2', x: 10, z: -18, scale: 0.50, rotY: 0.3, radius: 0.95 },
      // SE Quadrant
      { type: 'treeOrange3', x: 18, z: 16, scale: 0.58, rotY: 2.1, radius: 1.05 },
      { type: 'treeSakura4', x: 26, z: 20, scale: 0.60, rotY: 0.9, radius: 1.10 },
      { type: 'treeOrange5', x: 14, z: 28, scale: 0.54, rotY: 2.8, radius: 1.00 },
      { type: 'treeSakura1', x: 28, z: 12, scale: 0.56, rotY: 1.4, radius: 1.05 },
      { type: 'treeOrange2', x: 22, z: 30, scale: 0.58, rotY: 0.5, radius: 1.05 },
      { type: 'treeSakura3', x: 10, z: 18, scale: 0.50, rotY: 2.4, radius: 0.95 },
      // SW Quadrant (Framing the Astral Pond at [-16, 14])
      { type: 'treeSakura4', x: -29.5, z: 25.0, scale: 0.60, rotY: 1.7, radius: 1.10 },
      { type: 'treeOrange5', x: -28, z: 8, scale: 0.56, rotY: 0.6, radius: 1.05 },
      { type: 'treeSakura1', x: -8, z: 24, scale: 0.52, rotY: 2.9, radius: 1.00 },
      { type: 'treeOrange2', x: -19.5, z: 29.5, scale: 0.58, rotY: 1.1, radius: 1.05 },
      { type: 'treeSakura3', x: -7, z: 10, scale: 0.50, rotY: 2.3, radius: 0.95 }
    ];

    this.mysticTrees_1_2 = [];
    trees12.forEach((t) => {
      const model = this.mysticModels[t.type]();
      model.position.set(t.x, 0, t.z);
      model.rotation.y = t.rotY;
      model.scale.setScalar(t.scale);
      this.mysticGroup_1_2.add(model);
      this.mysticTrees_1_2.push({ x: t.x, z: t.z, radius: t.radius });
    });

    // 2. Translucent Shiny Magical Crystals (Amethyst & Rose Quartz glow)
    const crystals12 = [
      // Outer accent crystals moved into the background groves, leaving the Astral Pond completely open and visible
      { type: 'crystalFlat', x: -16.0, z: 5.5, scale: 1.8, rotY: 0.5, radius: 1.9 }, // Low flat crystal north of pond
      { type: 'crystalStoneA', x: -25.5, z: 10.0, scale: 1.9, rotY: 2.3, radius: 1.4 }, // Tucked into west tree line
      { type: 'crystalSabana1', x: -26.5, z: 18.0, scale: 2.0, rotY: 1.7, radius: 1.4 }, // West perimeter
      { type: 'crystalMedium3', x: -23.5, z: 26.5, scale: 2.2, rotY: 2.8, radius: 3.3 }, // Outer SW grove
      { type: 'crystalMedium2', x: -27.5, z: 22.0, scale: 2.2, rotY: 0.7, radius: 3.3 }, // Outer SW corner
      { type: 'crystalSabana3', x: -29.0, z: 15.0, scale: 2.2, rotY: 2.0, radius: 1.5 }, // Far west edge
      { type: 'crystalA', x: -21.5, z: 5.0, scale: 2.0, rotY: 0.8, radius: 1.9 }, // NW background grove
      { type: 'crystalB', x: -6.5, z: 8.5, scale: 1.8, rotY: 1.4, radius: 1.6 }, // NE clearing edge
      // NW Formations
      { type: 'crystalA', x: -16, z: -12, scale: 3.2, rotY: 0.5, radius: 3.0 },
      { type: 'crystalMedium2', x: -23, z: -15, scale: 2.8, rotY: 1.8, radius: 4.0 },
      { type: 'crystalFlat', x: -25, z: -26, scale: 3.3, rotY: 1.2, radius: 3.3 },
      { type: 'crystalB', x: -12, z: -22, scale: 2.9, rotY: 2.7, radius: 2.6 },
      { type: 'crystalSabana3', x: -29, z: -18, scale: 2.7, rotY: 0.9, radius: 1.8 },
      // NE Formations
      { type: 'crystalB', x: 16, z: -13, scale: 3.1, rotY: 2.4, radius: 2.8 },
      { type: 'crystalMedium1', x: 24, z: -14, scale: 2.8, rotY: 0.8, radius: 4.0 },
      { type: 'crystalFlat', x: 26, z: -26, scale: 3.4, rotY: 1.9, radius: 3.4 },
      { type: 'crystalA', x: 13, z: -22, scale: 2.9, rotY: 3.1, radius: 2.7 },
      { type: 'crystalSabana1', x: 29, z: -18, scale: 2.7, rotY: 1.3, radius: 1.8 },
      // SE Formations
      { type: 'crystalA', x: 16, z: 14, scale: 3.1, rotY: 1.1, radius: 2.9 },
      { type: 'crystalMedium3', x: 24, z: 15, scale: 2.8, rotY: 2.6, radius: 4.0 },
      { type: 'crystalFlat', x: 26, z: 26, scale: 3.3, rotY: 0.4, radius: 3.3 },
      { type: 'crystalB', x: 13, z: 22, scale: 2.9, rotY: 1.7, radius: 2.6 },
      { type: 'crystalStoneA', x: 29, z: 18, scale: 2.7, rotY: 2.9, radius: 1.9 },
      // SW Outskirts
      { type: 'crystalMedium1', x: -25, z: 30, scale: 2.6, rotY: 0.3, radius: 3.8 }
    ];

    this.mysticCrystals_1_2 = [];
    crystals12.forEach((c) => {
      const model = this.mysticModels[c.type]();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.mysticGroup_1_2.add(model);
      this.mysticCrystals_1_2.push({ x: c.x, z: c.z, radius: c.radius });
    });

    // 3. Asian Stone Lanterns (linter_asia.glb)
    const linters12 = [
      // Central clearing frame
      { x: -4.5, z: -1.0, scale: 1.45, rotY: 0.4, radius: 0.65 },
      { x: 5.2, z: -1.0, scale: 1.45, rotY: -0.4, radius: 0.65 },
      // North portal path
      { x: -3.0, z: -26.0, scale: 1.45, rotY: 0.0, radius: 0.65 },
      { x: 3.0, z: -26.0, scale: 1.45, rotY: 0.0, radius: 0.65 },
      // South portal path
      { x: -3.0, z: 26.0, scale: 1.45, rotY: 3.14, radius: 0.65 },
      { x: 3.0, z: 26.0, scale: 1.45, rotY: 3.14, radius: 0.65 },
      // East portal path
      { x: 26.0, z: -3.0, scale: 1.45, rotY: -1.57, radius: 0.65 },
      { x: 26.0, z: 3.0, scale: 1.45, rotY: 1.57, radius: 0.65 },
      // Beside Astral Pond (framing outer banks without obstructing water)
      { x: -8.5, z: 11.5, scale: 1.45, rotY: 1.2, radius: 0.65 },
      { x: -23.5, z: 16.5, scale: 1.45, rotY: -1.2, radius: 0.65 }
    ];

    this.mysticLinters_1_2 = [];
    linters12.forEach((l) => {
      const model = this.mysticModels.linterAsia();
      model.position.set(l.x, 0, l.z);
      model.rotation.y = l.rotY;
      model.scale.setScalar(l.scale);
      this.mysticGroup_1_2.add(model);
      this.mysticLinters_1_2.push({ x: l.x, z: l.z, radius: l.radius });
    });

    // 4. Ultra-dense Small Flora Carpet (covering all empty grass patches)
    const flora12 = [
      // Astral Pond Shoreline & Surrounding Garden (open viewing corridor from south and east)
      { type: 'flower4Group', x: -16.0, z: 7.2, scale: 1.3, rotY: 0.8 },
      { type: 'flower3Group', x: -13.5, z: 8.5, scale: 1.25, rotY: 1.9 },
      { type: 'fern1', x: -18.5, z: 8.2, scale: 1.3, rotY: 2.5 },
      { type: 'plant1Big', x: -23.0, z: 11.5, scale: 1.1, rotY: 0.4 },
      { type: 'grassShort', x: -23.5, z: 13.0, scale: 1.2, rotY: 1.1 },
      { type: 'flower3Single', x: -23.0, z: 15.5, scale: 1.3, rotY: 2.8 },
      { type: 'fern1', x: -22.5, z: 19.5, scale: 1.2, rotY: 0.7 },
      { type: 'bushCommonFlowers', x: -19.5, z: 22.0, scale: 1.2, rotY: 2.2 },
      { type: 'flower4Group', x: -16.0, z: 22.5, scale: 1.2, rotY: 1.5 },
      { type: 'flower3Group', x: -13.5, z: 22.0, scale: 1.2, rotY: 3.0 },
      { type: 'grassShort', x: -10.5, z: 20.5, scale: 1.2, rotY: 0.3 },
      { type: 'flower3Single', x: -7.5, z: 15.0, scale: 1.3, rotY: 1.7 },
      { type: 'plant1Big', x: -7.5, z: 12.0, scale: 1.1, rotY: 2.4 },
      { type: 'fern1', x: -9.5, z: 9.5, scale: 1.2, rotY: 0.9 },
      { type: 'mushroomGroup', x: -14.2, z: 6.8, scale: 2.8, rotY: 1.4 },
      { type: 'mushroomTall', x: -15.0, z: 6.2, scale: 2.8, rotY: 0.5 },
      { type: 'mushroomSingle', x: -17.5, z: 6.5, scale: 2.4, rotY: 2.1 },

      // NW Quadrant Density
      { type: 'bushDetailed', x: -15, z: -16, scale: 3.3, rotY: 0.4 },
      { type: 'bushSmall', x: -22, z: -12, scale: 2.7, rotY: 1.1 },
      { type: 'bush', x: -12, z: -24, scale: 3.0, rotY: 2.2 },
      { type: 'bushDetailed', x: -27, z: -25, scale: 3.4, rotY: 1.8 },
      { type: 'bushSmall', x: -20, z: -11, scale: 2.6, rotY: 0.7 },
      { type: 'flower4Group', x: -17, z: -18, scale: 1.4, rotY: 1.0 },
      { type: 'flower3Group', x: -24, z: -18, scale: 1.35, rotY: 2.7 },
      { type: 'fern1', x: -20, z: -24, scale: 1.4, rotY: 0.5 },
      { type: 'plant1Big', x: -27, z: -14, scale: 1.3, rotY: 1.8 },
      { type: 'grassShort', x: -13, z: -15, scale: 1.4, rotY: 2.9 },
      { type: 'grassShort', x: -25, z: -28, scale: 1.4, rotY: 0.6 },
      { type: 'flower3Single', x: -11, z: -27, scale: 1.5, rotY: 1.4 },
      { type: 'mushroomGroup', x: -21, z: -22, scale: 3.3, rotY: 0.5 },
      { type: 'mushroomTall', x: -20, z: -22.8, scale: 3.4, rotY: 1.2 },
      { type: 'mushroomSingle', x: -22.2, z: -21.4, scale: 2.8, rotY: 2.5 },
      { type: 'mushroomGroup', x: -27, z: -15, scale: 3.0, rotY: 1.8 },
      { type: 'flowerA', x: -15.5, z: -11.5, scale: 2.2, rotY: 0.4 },
      { type: 'flowerB', x: -16.5, z: -12.5, scale: 2.0, rotY: 1.2 },
      { type: 'flowerA', x: -22.5, z: -14.5, scale: 2.1, rotY: 2.5 },
      { type: 'flowerB', x: -25.5, z: -25.5, scale: 2.0, rotY: 0.8 },

      // NE Quadrant Density
      { type: 'bushDetailed', x: 17, z: -15, scale: 3.3, rotY: 2.3 },
      { type: 'bushSmall', x: 25, z: -11, scale: 2.7, rotY: 0.9 },
      { type: 'bush', x: 13, z: -24, scale: 3.0, rotY: 1.7 },
      { type: 'bushDetailed', x: 27, z: -24, scale: 3.4, rotY: 3.1 },
      { type: 'bushSmall', x: 20, z: -10, scale: 2.6, rotY: 1.4 },
      { type: 'flower4Group', x: 16, z: -18, scale: 1.4, rotY: 0.7 },
      { type: 'flower3Group', x: 23, z: -19, scale: 1.35, rotY: 2.2 },
      { type: 'fern1', x: 19, z: -25, scale: 1.4, rotY: 1.5 },
      { type: 'plant1Big', x: 26, z: -15, scale: 1.3, rotY: 3.0 },
      { type: 'grassShort', x: 12, z: -15, scale: 1.4, rotY: 0.8 },
      { type: 'grassShort', x: 24, z: -28, scale: 1.4, rotY: 2.1 },
      { type: 'flower3Single', x: 15, z: -27, scale: 1.5, rotY: 1.9 },
      { type: 'mushroomGroup', x: 21, z: -21, scale: 3.3, rotY: 1.2 },
      { type: 'mushroomTall', x: 22.2, z: -21.7, scale: 3.4, rotY: 2.7 },
      { type: 'mushroomSingle', x: 20.1, z: -20.4, scale: 2.8, rotY: 0.8 },
      { type: 'mushroomGroup', x: 25, z: -14, scale: 3.0, rotY: 2.4 },
      { type: 'flowerA', x: 16.5, z: -12.5, scale: 2.0, rotY: 0.9 },
      { type: 'flowerB', x: 23.5, z: -13.5, scale: 2.1, rotY: 2.1 },
      { type: 'flowerA', x: 26.5, z: -25.5, scale: 2.2, rotY: 1.5 },
      { type: 'flowerB', x: 12.5, z: -21.5, scale: 2.0, rotY: 3.0 },

      // SE Quadrant Density
      { type: 'bushDetailed', x: 17, z: 17, scale: 3.3, rotY: 0.6 },
      { type: 'bushSmall', x: 25, z: 11, scale: 2.7, rotY: 2.0 },
      { type: 'bush', x: 13, z: 25, scale: 3.0, rotY: 1.5 },
      { type: 'bushDetailed', x: 27, z: 24, scale: 3.4, rotY: 0.9 },
      { type: 'bushSmall', x: 21, z: 10, scale: 2.6, rotY: 2.8 },
      { type: 'flower4Group', x: 16, z: 19, scale: 1.4, rotY: 1.3 },
      { type: 'flower3Group', x: 23, z: 19, scale: 1.35, rotY: 0.4 },
      { type: 'fern1', x: 19, z: 25, scale: 1.4, rotY: 2.6 },
      { type: 'plant1Big', x: 26, z: 13, scale: 1.3, rotY: 1.1 },
      { type: 'grassShort', x: 12, z: 15, scale: 1.4, rotY: 3.2 },
      { type: 'grassShort', x: 24, z: 28, scale: 1.4, rotY: 1.7 },
      { type: 'flower3Single', x: 15, z: 27, scale: 1.5, rotY: 0.5 },
      { type: 'mushroomGroup', x: 21, z: 22, scale: 3.4, rotY: 3.0 },
      { type: 'mushroomTall', x: 22.1, z: 22.7, scale: 3.4, rotY: 1.4 },
      { type: 'mushroomSingle', x: 20.2, z: 21.5, scale: 2.8, rotY: 0.5 },
      { type: 'mushroomGroup', x: 26, z: 14, scale: 3.0, rotY: 1.5 },
      { type: 'flowerA', x: 16.5, z: 13.5, scale: 2.0, rotY: 0.6 },
      { type: 'flowerB', x: 23.5, z: 14.5, scale: 2.1, rotY: 2.3 },
      { type: 'flowerA', x: 26.5, z: 25.5, scale: 2.2, rotY: 1.7 },
      { type: 'flowerB', x: 12.5, z: 21.5, scale: 2.0, rotY: 2.8 },

      // SW Outer Quadrant Density (away from pond)
      { type: 'bushDetailed', x: -27, z: 26, scale: 3.3, rotY: 1.9 },
      { type: 'bushSmall', x: -26, z: 7, scale: 2.7, rotY: 2.5 },
      { type: 'flower4Group', x: -25, z: 22, scale: 1.4, rotY: 0.8 },
      { type: 'flower3Group', x: -28, z: 25, scale: 1.35, rotY: 2.3 },
      { type: 'fern1', x: -23, z: 29, scale: 1.4, rotY: 1.2 },
      { type: 'grassShort', x: -27, z: 29, scale: 1.4, rotY: 3.0 },
      { type: 'grassShort', x: -6, z: 26, scale: 1.4, rotY: 0.9 },
      { type: 'flower3Single', x: -29, z: 12, scale: 1.5, rotY: 1.6 },
      { type: 'mushroomGroup', x: -24, z: 27, scale: 3.2, rotY: 2.1 },
      { type: 'mushroomTall', x: -25, z: 28, scale: 3.3, rotY: 0.9 },
      { type: 'mushroomSingle', x: -23, z: 26, scale: 2.8, rotY: 1.7 }
    ];

    flora12.forEach((f) => {
      const model = this.mysticModels[f.type]();
      model.position.set(f.x, 0, f.z);
      model.rotation.y = f.rotY;
      model.scale.setScalar(f.scale);
      this.mysticGroup_1_2.add(model);
    });
  }

  _buildMysticDecorations_1_3() {
    // Macro-Zone [1, 3]: Santuario Prohibido (NPCs: Oracle at [13.6, 0, -24.2], Shaman at [35.3, 0, 5.9])
    // 1. Ancient Mystic Stone Colonnade with Magenta / Violet Creeping Ivy
    const columns13 = [
      // Inner temple sanctum colonnade framing the ritual altar
      { type: 'columnMystic', x: -6.5, z: -6.5, scale: 1.25, rotY: 0.5, radius: 0.95 },
      { type: 'columnMystic', x: 6.5, z: -6.5, scale: 1.25, rotY: 2.1, radius: 0.95 },
      { type: 'columnMystic', x: -6.5, z: 6.5, scale: 1.25, rotY: 1.2, radius: 0.95 },
      { type: 'columnMystic', x: 6.5, z: 6.5, scale: 1.25, rotY: 2.8, radius: 0.95 },
      // Outer colonnade peristyle & ruined pillars
      { type: 'columnMysticRuined', x: -12.5, z: -10.5, scale: 1.20, rotY: 0.8, radius: 0.95 },
      { type: 'columnMysticRuined', x: 12.5, z: -10.5, scale: 1.20, rotY: 2.4, radius: 0.95 },
      { type: 'columnMysticRuined', x: -12.5, z: 10.5, scale: 1.20, rotY: 1.6, radius: 0.95 },
      { type: 'columnMysticRuined', x: 12.5, z: 10.5, scale: 1.20, rotY: 3.1, radius: 0.95 },
      { type: 'columnMystic', x: -16.5, z: 0.0, scale: 1.25, rotY: 1.0, radius: 0.95 },
      { type: 'columnMysticRuined', x: 16.5, z: 0.0, scale: 1.20, rotY: 2.0, radius: 0.95 }
    ];

    this.mysticColumns_1_3 = [];
    columns13.forEach((c) => {
      const model = this.mysticModels[c.type]();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.mysticGroup_1_3.add(model);
      this.mysticColumns_1_3.push({ x: c.x, z: c.z, radius: c.radius });
    });

    // 2. Massive Radiant Crystal Spires & Geological Monoliths
    const crystals13 = [
      { type: 'crystalA', x: -18, z: -18, scale: 3.5, rotY: 0.7, radius: 3.3 },
      { type: 'crystalMedium1', x: 18, z: -18, scale: 3.2, rotY: 2.2, radius: 4.5 },
      { type: 'crystalB', x: -18, z: 18, scale: 3.4, rotY: 1.5, radius: 3.0 },
      { type: 'crystalMedium2', x: 18, z: 18, scale: 3.3, rotY: 3.0, radius: 4.6 },
      { type: 'crystalSabana1', x: -24, z: -8, scale: 3.0, rotY: 1.1, radius: 2.0 },
      { type: 'crystalSabana3', x: 24, z: -8, scale: 3.0, rotY: 2.6, radius: 2.0 },
      { type: 'crystalMedium3', x: -24, z: 8, scale: 3.1, rotY: 0.4, radius: 4.4 },
      { type: 'crystalFlat', x: 24, z: 8, scale: 3.2, rotY: 1.9, radius: 3.2 },
      { type: 'crystalA', x: -8, z: -22, scale: 3.0, rotY: 2.8, radius: 2.8 },
      { type: 'crystalB', x: 8, z: -22, scale: 3.0, rotY: 0.3, radius: 2.7 },
      { type: 'crystalMedium1', x: -8, z: 22, scale: 3.1, rotY: 1.7, radius: 4.4 },
      { type: 'crystalMedium2', x: 8, z: 22, scale: 3.1, rotY: 2.5, radius: 4.4 }
    ];

    this.mysticCrystals_1_3 = [];
    crystals13.forEach((c) => {
      const model = this.mysticModels[c.type]();
      model.position.set(c.x, 0, c.z);
      model.rotation.y = c.rotY;
      model.scale.setScalar(c.scale);
      this.mysticGroup_1_3.add(model);
      this.mysticCrystals_1_3.push({ x: c.x, z: c.z, radius: c.radius });
    });

    // 3. Ancient Orange & Sakura Pink Twisted Trees guarding the Sanctuary Perimeter
    const trees13 = [
      // NW Grove
      { type: 'treeOrange1', x: -22, z: -22, scale: 0.60, rotY: 0.9, radius: 1.10 },
      { type: 'treeSakura2', x: -28, z: -16, scale: 0.58, rotY: 2.1, radius: 1.05 },
      { type: 'treeOrange3', x: -16, z: -28, scale: 0.55, rotY: 1.3, radius: 1.00 },
      { type: 'treeSakura4', x: -28, z: -26, scale: 0.62, rotY: 3.0, radius: 1.15 },
      // NE Grove
      { type: 'treeSakura5', x: 22, z: -22, scale: 0.60, rotY: 1.8, radius: 1.10 },
      { type: 'treeOrange1', x: 28, z: -16, scale: 0.58, rotY: 0.5, radius: 1.05 },
      { type: 'treeSakura2', x: 16, z: -28, scale: 0.55, rotY: 2.7, radius: 1.00 },
      { type: 'treeOrange3', x: 28, z: -26, scale: 0.62, rotY: 1.1, radius: 1.15 },
      // SW Grove
      { type: 'treeOrange4', x: -22, z: 22, scale: 0.60, rotY: 2.4, radius: 1.10 },
      { type: 'treeSakura5', x: -28, z: 16, scale: 0.58, rotY: 0.8, radius: 1.05 },
      { type: 'treeOrange1', x: -16, z: 28, scale: 0.55, rotY: 3.2, radius: 1.00 },
      { type: 'treeSakura2', x: -28, z: 26, scale: 0.62, rotY: 1.6, radius: 1.15 },
      // SE Grove
      { type: 'treeSakura3', x: 22, z: 22, scale: 0.60, rotY: 0.3, radius: 1.10 },
      { type: 'treeOrange4', x: 28, z: 16, scale: 0.58, rotY: 1.9, radius: 1.05 },
      { type: 'treeSakura5', x: 16, z: 28, scale: 0.55, rotY: 2.8, radius: 1.00 },
      { type: 'treeOrange1', x: 28, z: 26, scale: 0.62, rotY: 0.7, radius: 1.15 }
    ];

    this.mysticTrees_1_3 = [];
    trees13.forEach((t) => {
      const model = this.mysticModels[t.type]();
      model.position.set(t.x, 0, t.z);
      model.rotation.y = t.rotY;
      model.scale.setScalar(t.scale);
      this.mysticGroup_1_3.add(model);
      this.mysticTrees_1_3.push({ x: t.x, z: t.z, radius: t.radius });
    });

    // 4. Asian Processional Lanterns (linter_asia.glb)
    const linters13 = [
      // North entrance processional way
      { x: -3.0, z: -16.0, scale: 1.45, rotY: 0.0, radius: 0.65 },
      { x: 3.0, z: -16.0, scale: 1.45, rotY: 0.0, radius: 0.65 },
      // South sanctum processional way
      { x: -3.0, z: 16.0, scale: 1.45, rotY: 3.14, radius: 0.65 },
      { x: 3.0, z: 16.0, scale: 1.45, rotY: 3.14, radius: 0.65 },
      // East gate path
      { x: 16.0, z: -3.0, scale: 1.45, rotY: -1.57, radius: 0.65 },
      { x: 16.0, z: 3.0, scale: 1.45, rotY: 1.57, radius: 0.65 },
      // West outer shrine
      { x: -16.0, z: -3.0, scale: 1.45, rotY: 1.57, radius: 0.65 },
      { x: -16.0, z: 3.0, scale: 1.45, rotY: -1.57, radius: 0.65 }
    ];

    this.mysticLinters_1_3 = [];
    linters13.forEach((l) => {
      const model = this.mysticModels.linterAsia();
      model.position.set(l.x, 0, l.z);
      model.rotation.y = l.rotY;
      model.scale.setScalar(l.scale);
      this.mysticGroup_1_3.add(model);
      this.mysticLinters_1_3.push({ x: l.x, z: l.z, radius: l.radius });
    });

    // 5. Dense Mystical Flora, Fairy Rings and Floral Carpets
    const flora13 = [
      // Colonnade Perimeter Accents
      { type: 'flower4Group', x: -6.5, z: -4.8, scale: 1.35, rotY: 0.5 },
      { type: 'flower3Group', x: 6.5, z: -4.8, scale: 1.35, rotY: 2.1 },
      { type: 'fern1', x: -6.5, z: 4.8, scale: 1.4, rotY: 1.2 },
      { type: 'plant1Big', x: 6.5, z: 4.8, scale: 1.3, rotY: 2.8 },
      { type: 'grassShort', x: -12.5, z: -8.8, scale: 1.4, rotY: 0.9 },
      { type: 'grassShort', x: 12.5, z: -8.8, scale: 1.4, rotY: 2.3 },
      { type: 'flower3Single', x: -12.5, z: 8.8, scale: 1.5, rotY: 1.7 },
      { type: 'flower3Single', x: 12.5, z: 8.8, scale: 1.5, rotY: 3.1 },
      { type: 'bushCommonFlowers', x: -16.5, z: 2.2, scale: 1.35, rotY: 0.4 },
      { type: 'bushCommonFlowers', x: 16.5, z: 2.2, scale: 1.35, rotY: 2.6 },

      // Mushroom Fairy Rings & Groves
      { type: 'mushroomGroup', x: -14, z: -16, scale: 3.4, rotY: 0.8 },
      { type: 'mushroomTall', x: -13.2, z: -16.8, scale: 3.4, rotY: 1.9 },
      { type: 'mushroomSingle', x: -15.1, z: -15.4, scale: 2.8, rotY: 2.7 },
      { type: 'mushroomGroup', x: 14, z: -16, scale: 3.4, rotY: 2.2 },
      { type: 'mushroomTall', x: 14.8, z: -16.8, scale: 3.4, rotY: 0.7 },
      { type: 'mushroomSingle', x: 13.2, z: -15.4, scale: 2.8, rotY: 1.5 },
      { type: 'mushroomGroup', x: -14, z: 16, scale: 3.4, rotY: 1.4 },
      { type: 'mushroomTall', x: -13.2, z: 16.8, scale: 3.4, rotY: 2.9 },
      { type: 'mushroomSingle', x: -15.1, z: 15.4, scale: 2.8, rotY: 0.3 },
      { type: 'mushroomGroup', x: 14, z: 16, scale: 3.4, rotY: 3.1 },
      { type: 'mushroomTall', x: 14.8, z: 16.8, scale: 3.4, rotY: 1.6 },
      { type: 'mushroomSingle', x: 13.2, z: 15.4, scale: 2.8, rotY: 2.4 },

      // NW Quadrant Floral Fill
      { type: 'bushDetailed', x: -20, z: -15, scale: 3.3, rotY: 0.6 },
      { type: 'bushSmall', x: -25, z: -12, scale: 2.7, rotY: 1.4 },
      { type: 'bush', x: -16, z: -24, scale: 3.0, rotY: 2.0 },
      { type: 'bushDetailed', x: -26, z: -22, scale: 3.4, rotY: 1.1 },
      { type: 'flower4Group', x: -21, z: -18, scale: 1.4, rotY: 1.2 },
      { type: 'flower3Group', x: -25, z: -17, scale: 1.35, rotY: 2.8 },
      { type: 'fern1', x: -18, z: -25, scale: 1.4, rotY: 0.7 },
      { type: 'plant1Big', x: -27, z: -13, scale: 1.3, rotY: 1.9 },
      { type: 'grassShort', x: -14, z: -14, scale: 1.4, rotY: 3.1 },
      { type: 'grassShort', x: -24, z: -27, scale: 1.4, rotY: 0.8 },
      { type: 'flowerA', x: -17.5, z: -17.5, scale: 2.1, rotY: 0.5 },
      { type: 'flowerB', x: -18.5, z: -18.5, scale: 2.0, rotY: 1.3 },

      // NE Quadrant Floral Fill
      { type: 'bushDetailed', x: 20, z: -15, scale: 3.3, rotY: 2.1 },
      { type: 'bushSmall', x: 25, z: -12, scale: 2.7, rotY: 0.7 },
      { type: 'bush', x: 16, z: -24, scale: 3.0, rotY: 1.8 },
      { type: 'bushDetailed', x: 26, z: -22, scale: 3.4, rotY: 3.0 },
      { type: 'flower4Group', x: 21, z: -18, scale: 1.4, rotY: 0.9 },
      { type: 'flower3Group', x: 25, z: -17, scale: 1.35, rotY: 2.4 },
      { type: 'fern1', x: 18, z: -25, scale: 1.4, rotY: 1.6 },
      { type: 'plant1Big', x: 27, z: -13, scale: 1.3, rotY: 0.3 },
      { type: 'grassShort', x: 14, z: -14, scale: 1.4, rotY: 1.0 },
      { type: 'grassShort', x: 24, z: -27, scale: 1.4, rotY: 2.3 },
      { type: 'flowerA', x: 17.5, z: -17.5, scale: 2.1, rotY: 2.1 },
      { type: 'flowerB', x: 18.5, z: -18.5, scale: 2.0, rotY: 0.4 },

      // SW Quadrant Floral Fill
      { type: 'bushDetailed', x: -20, z: 15, scale: 3.3, rotY: 1.0 },
      { type: 'bushSmall', x: -25, z: 12, scale: 2.7, rotY: 2.5 },
      { type: 'bush', x: -16, z: 24, scale: 3.0, rotY: 0.8 },
      { type: 'bushDetailed', x: -26, z: 22, scale: 3.4, rotY: 1.9 },
      { type: 'flower4Group', x: -21, z: 18, scale: 1.4, rotY: 1.5 },
      { type: 'flower3Group', x: -25, z: 17, scale: 1.35, rotY: 0.3 },
      { type: 'fern1', x: -18, z: 25, scale: 1.4, rotY: 2.7 },
      { type: 'plant1Big', x: -27, z: 13, scale: 1.3, rotY: 1.4 },
      { type: 'grassShort', x: -14, z: 14, scale: 1.4, rotY: 0.5 },
      { type: 'grassShort', x: -24, z: 27, scale: 1.4, rotY: 2.8 },
      { type: 'flowerA', x: -17.5, z: 17.5, scale: 2.1, rotY: 1.0 },
      { type: 'flowerB', x: -18.5, z: 18.5, scale: 2.0, rotY: 2.8 },

      // SE Quadrant Floral Fill
      { type: 'bushDetailed', x: 20, z: 15, scale: 3.3, rotY: 0.4 },
      { type: 'bushSmall', x: 25, z: 12, scale: 2.7, rotY: 1.7 },
      { type: 'bush', x: 16, z: 24, scale: 3.0, rotY: 1.2 },
      { type: 'bushDetailed', x: 26, z: 22, scale: 3.4, rotY: 0.6 },
      { type: 'flower4Group', x: 21, z: 18, scale: 1.4, rotY: 2.0 },
      { type: 'flower3Group', x: 25, z: 17, scale: 1.35, rotY: 0.7 },
      { type: 'fern1', x: 18, z: 25, scale: 1.4, rotY: 3.1 },
      { type: 'plant1Big', x: 27, z: 13, scale: 1.3, rotY: 2.2 },
      { type: 'grassShort', x: 14, z: 14, scale: 1.4, rotY: 1.9 },
      { type: 'grassShort', x: 24, z: 27, scale: 1.4, rotY: 0.4 },
      { type: 'flowerA', x: 17.5, z: 17.5, scale: 2.1, rotY: 2.5 },
      { type: 'flowerB', x: 18.5, z: 18.5, scale: 2.0, rotY: 1.1 }
    ];

    flora13.forEach((f) => {
      const model = this.mysticModels[f.type]();
      model.position.set(f.x, 0, f.z);
      model.rotation.y = f.rotY;
      model.scale.setScalar(f.scale);
      this.mysticGroup_1_3.add(model);
    });
  }

  _buildDungeonDecorations() {
    this._buildDungeonDecorations_2_3();
    this._buildDungeonDecorations_3_3();
  }

  _buildDungeonDecorations_2_3() {
    // 1. Ash foliage & Leafless twisted dead trees for zone 2_3
    // NPCs: Kotaro at [0, 0, -4], Tripp at [-3, 0, 1] - keep center cleared!
    const trees23 = [
      // NE Quadrant (Ash Groves)
      { type: 'treeAsh1', x: 16, z: -16, scale: 0.62, rotY: 0.8, radius: 1.15 },
      { type: 'treeAsh2', x: 23, z: -14, scale: 0.58, rotY: 2.1, radius: 1.10 },
      { type: 'treeAsh3', x: 28, z: -18, scale: 0.64, rotY: 1.4, radius: 1.20 },
      { type: 'treeDeadTwisted1', x: 20, z: -18, scale: 0.60, rotY: 0.5, radius: 1.10 },
      { type: 'treeAsh4', x: 18, z: -25, scale: 0.56, rotY: 2.8, radius: 1.05 },
      { type: 'treeAsh5', x: 25, z: -24, scale: 0.65, rotY: 0.3, radius: 1.20 },
      { type: 'treeDeadTwisted2', x: 27, z: -12, scale: 0.58, rotY: 1.7, radius: 1.10 },
      { type: 'treeAsh1', x: 30, z: -28, scale: 0.66, rotY: 1.9, radius: 1.25 },
      { type: 'treeOakDead', x: 14, z: -28, scale: 3.2, rotY: 0.9, radius: 1.20 },

      // SE Quadrant (Volcanic Foothills) - trees cleared to sides away from rockA at (18, 13)
      { type: 'treeAsh2', x: 12.0, z: 18.0, scale: 0.60, rotY: 1.2, radius: 1.15 },
      { type: 'treeAsh3', x: 25.5, z: 12.0, scale: 0.58, rotY: 2.5, radius: 1.10 },
      { type: 'treeAsh4', x: 28, z: 18, scale: 0.64, rotY: 0.7, radius: 1.20 },
      { type: 'treeDeadTwisted3', x: 21.0, z: 24.5, scale: 0.60, rotY: 3.1, radius: 1.10 },
      { type: 'treeAsh5', x: 17, z: 26, scale: 0.56, rotY: 1.6, radius: 1.05 },
      { type: 'treeAsh1', x: 24, z: 25, scale: 0.65, rotY: 2.2, radius: 1.20 },
      { type: 'treeDeadTwisted4', x: 26, z: 12, scale: 0.58, rotY: 0.4, radius: 1.10 },
      { type: 'treeAsh2', x: 30, z: 27, scale: 0.66, rotY: 1.1, radius: 1.25 },
      { type: 'treeOakDead', x: 13, z: 27, scale: 3.3, rotY: 2.4, radius: 1.20 },

      // NW Quadrant (Graveyard Boundaries)
      { type: 'treeDeadTwisted5', x: -25, z: -14, scale: 0.64, rotY: 1.5, radius: 1.20 },
      { type: 'treeDeadTwisted1', x: -17, z: -27, scale: 0.60, rotY: 2.7, radius: 1.15 },
      { type: 'treeOakDead', x: -30, z: -18, scale: 3.4, rotY: 0.6, radius: 1.25 },
      { type: 'treeDeadTwisted2', x: -23, z: -29, scale: 0.62, rotY: 1.8, radius: 1.15 },
      { type: 'treeDeadTwisted3', x: -29, z: -27, scale: 0.65, rotY: 3.0, radius: 1.20 },
      { type: 'treeAsh3', x: -18, z: -22, scale: 0.56, rotY: 0.4, radius: 1.10 },
      { type: 'treeAsh4', x: -26, z: -12, scale: 0.58, rotY: 2.3, radius: 1.10 },

      // SW Quadrant (Lava Lake Rim Outer Buffer)
      { type: 'treeDeadTwisted4', x: -26, z: 26, scale: 0.64, rotY: 0.8, radius: 1.20 },
      { type: 'treeDeadTwisted5', x: -28, z: 8, scale: 0.62, rotY: 2.0, radius: 1.15 },
      { type: 'treeOakDead', x: -8, z: 24, scale: 3.2, rotY: 1.4, radius: 1.20 },
      { type: 'treeDeadTwisted1', x: -26, z: 18, scale: 0.58, rotY: 2.9, radius: 1.10 },
      { type: 'treeAsh5', x: -24, z: 28, scale: 0.65, rotY: 1.1, radius: 1.20 },
      { type: 'treeAsh1', x: -9, z: 27, scale: 0.55, rotY: 0.5, radius: 1.05 }
    ];

    this.dungeonTrees_2_3 = [];
    trees23.forEach((t) => {
      const model = this.dungeonModels[t.type]();
      model.position.set(t.x, 0, t.z);
      model.rotation.y = t.rotY;
      model.scale.setScalar(t.scale);
      this.dungeonGroup_2_3.add(model);
      this.dungeonTrees_2_3.push({ x: t.x, z: t.z, radius: t.radius });
    });

    // 2. Graveyard: Tombstones (lapida.glb) and Skeletal Skull Altars (alt_bones.glb) in NW Quadrant
    // Reduced tombstone count and substantially increased scale for skull altars
    const tombstones23 = [
      { x: -20.0, z: -17.0, scale: 1.30, rotY: 0.25 },
      { x: -26.5, z: -18.0, scale: 1.35, rotY: -0.30 },
      { x: -21.0, z: -26.0, scale: 1.35, rotY: 0.50 },
      { x: -27.5, z: -27.0, scale: 1.25, rotY: -0.45 }
    ];

    const altBones23 = [
      { x: -23.5, z: -20.5, scale: 1.45, rotY: 0.5 },
      { x: -18.0, z: -22.5, scale: 1.40, rotY: 2.3 },
      { x: -26.5, z: -23.5, scale: 1.50, rotY: 3.1 },
      { x: -22.5, z: -29.0, scale: 1.40, rotY: 1.4 }
    ];

    this.dungeonGraveyard_2_3 = [];
    tombstones23.forEach((g) => {
      const model = this.dungeonModels.lapida();
      model.position.set(g.x, 0, g.z);
      model.rotation.y = g.rotY;
      model.scale.setScalar(g.scale);
      this.dungeonGroup_2_3.add(model);
      this.dungeonGraveyard_2_3.push({ x: g.x, z: g.z, radius: 0.90 });
    });

    altBones23.forEach((b) => {
      const model = this.dungeonModels.altBones();
      model.position.set(b.x, 0, b.z);
      model.rotation.y = b.rotY;
      model.scale.setScalar(b.scale);
      this.dungeonGroup_2_3.add(model);
      this.dungeonGraveyard_2_3.push({ x: b.x, z: b.z, radius: 1.20 });
    });

    // 3. Obsidian Rocks with glowing pulsating lava veins
    const rocks23 = [
      // Lava Pond Rim Formations (SW: around [-16.0, 14.0]) - opened up east rim so pond is fully visible
      { type: 'rockA', x: -16.0, z: 21.2, scale: 3.2, rotY: 1.1, radius: 3.0 },
      { type: 'rockMedium1', x: -22.0, z: 17.5, scale: 3.3, rotY: 0.6, radius: 4.6 },
      { type: 'rockFlat', x: -9.5, z: 8.5, scale: 3.0, rotY: 1.8, radius: 3.0 },
      { type: 'rockSabana1', x: -22.5, z: 9.0, scale: 3.2, rotY: 0.3, radius: 2.1 },
      { type: 'rockMedium2', x: -16.0, z: 6.8, scale: 3.6, rotY: 2.8, radius: 5.0 },
      { type: 'stoneA', x: -24.5, z: 14.0, scale: 3.0, rotY: 1.5, radius: 2.1 },

      // NE Quadrant Lava Obsidian Outcrops
      { type: 'rockA', x: 18, z: -12, scale: 2.4, rotY: 2.3, radius: 2.3 },
      { type: 'rockFlat', x: 24, z: -16, scale: 3.0, rotY: 0.8, radius: 3.0 },
      { type: 'rockMedium1', x: 20, z: -28, scale: 3.2, rotY: 1.5, radius: 4.5 },
      { type: 'rockB', x: 27, z: -26, scale: 3.0, rotY: 2.7, radius: 2.7 },
      { type: 'stoneA', x: 15, z: -20, scale: 2.6, rotY: 0.4, radius: 1.8 },
      { type: 'rockSabana5', x: 30, z: -12, scale: 3.0, rotY: 1.9, radius: 2.0 },

      // SE Quadrant Lava Obsidian Outcrops (Rock 1 reduced to 2.1 and cleared from trees)
      { type: 'rockA', x: 18, z: 13, scale: 2.1, rotY: 0.5, radius: 2.0 },
      { type: 'rockFlat', x: 25, z: 16, scale: 2.6, rotY: 1.7, radius: 2.6 },
      { type: 'rockMedium2', x: 20, z: 28, scale: 3.2, rotY: 3.0, radius: 4.5 },
      { type: 'rockB', x: 27, z: 23, scale: 3.0, rotY: 1.2, radius: 2.7 },
      { type: 'stoneA', x: 15, z: 22, scale: 2.6, rotY: 2.5, radius: 1.8 },
      { type: 'rockSabana1', x: 31, z: 14, scale: 3.0, rotY: 0.7, radius: 2.0 },

      // NW Quadrant Outcrops (Rock 2 reduced to 1.9 and lowered in Y to eliminate floating)
      { type: 'rockMedium3', x: -14, y: -0.80, z: -12, scale: 1.9, rotY: 1.3, radius: 2.8 },
      { type: 'rockFlat', x: -28, y: -0.40, z: -12, scale: 2.8, rotY: 2.6, radius: 2.8 }
    ];

    this.dungeonRocks_2_3 = [];
    rocks23.forEach((r) => {
      const model = this.dungeonModels[r.type]();
      model.position.set(r.x, r.y !== undefined ? r.y : 0, r.z);
      model.rotation.y = r.rotY;
      model.scale.setScalar(r.scale);
      this.dungeonGroup_2_3.add(model);
      this.dungeonRocks_2_3.push({ x: r.x, z: r.z, radius: r.radius });
    });

    // 4. Real-time GPU Fire Torches (torch_1.glb with TorchFlameGPU)
    const torches23 = [
      // Graveyard Sentinels
      { x: -15.5, z: -14.5, rotY: 0.4 },
      { x: -28.5, z: -14.5, rotY: 1.2 },
      { x: -15.5, z: -29.0, rotY: 2.1 },
      { x: -28.5, z: -29.0, rotY: 2.9 },
      // Lava Pond Perimeter
      { x: -10.5, z: 8.5, rotY: 1.57 },
      { x: -23.0, z: 14.0, rotY: -1.57 },
      { x: -16.0, z: 21.8, rotY: 3.14 },
      { x: -16.0, z: 6.2, rotY: 0.0 },
      // Path Intersections
      { x: -3.0, z: -16.0, rotY: 0.0 },
      { x: 3.0, z: -16.0, rotY: 0.0 },
      { x: -3.0, z: 16.0, rotY: 3.14 },
      { x: 3.0, z: 16.0, rotY: 3.14 },
      { x: 14.0, z: -12.0, rotY: -1.2 },
      { x: 23.0, z: -20.0, rotY: 0.8 },
      { x: 14.0, z: 12.0, rotY: 1.2 },
      { x: 23.0, z: 20.0, rotY: 2.4 }
    ];

    this.dungeonTorches_2_3 = [];
    this.activeDungeonTorches_2_3 = [];
    torches23.forEach((tch) => {
      const torchData = this.dungeonModels.torch();
      torchData.mesh.position.set(tch.x, 0, tch.z);
      torchData.mesh.rotation.y = tch.rotY;
      this.dungeonGroup_2_3.add(torchData.mesh);
      this.activeDungeonTorches_2_3.push(torchData.flame);
      this.dungeonTorches_2_3.push({ x: tch.x, z: tch.z, radius: 0.45 });
    });

    // 5. Dense Withered Undergrowth, Glowing Embers & Crimson Fire Flowers (Eliminates empty grass)
    const flora23 = [
      // Around Lava Lake
      { type: 'flowerA', x: -12.0, z: 16.0, scale: 2.2, rotY: 0.6 },
      { type: 'flowerB', x: -13.5, z: 18.0, scale: 2.0, rotY: 1.4 },
      { type: 'flower3Group', x: -18.0, z: 19.5, scale: 1.4, rotY: 2.1 },
      { type: 'flower4Group', x: -20.5, z: 16.0, scale: 1.4, rotY: 0.3 },
      { type: 'flower3Single', x: -14.0, z: 8.5, scale: 1.5, rotY: 1.8 },
      { type: 'fern1', x: -18.5, z: 8.0, scale: 1.4, rotY: 2.7 },
      { type: 'bush', x: -22.0, z: 11.0, scale: 3.2, rotY: 0.9 },
      { type: 'bushDetailed', x: -10.5, z: 12.0, scale: 3.2, rotY: 1.7 },
      { type: 'grassShort', x: -15.0, z: 22.0, scale: 1.4, rotY: 0.2 },
      { type: 'grassShort', x: -11.0, z: 15.0, scale: 1.4, rotY: 2.5 },
      { type: 'mushroomGroup', x: -23.0, z: 15.0, scale: 3.2, rotY: 1.1 },
      { type: 'mushroomTall', x: -23.8, z: 15.8, scale: 3.2, rotY: 2.3 },

      // Around Graveyard NW
      { type: 'fern1', x: -17.0, z: -15.0, scale: 1.4, rotY: 0.8 },
      { type: 'fern1', x: -21.0, z: -17.0, scale: 1.35, rotY: 2.4 },
      { type: 'bushSmall', x: -24.0, z: -16.0, scale: 2.7, rotY: 1.2 },
      { type: 'bushDetailed', x: -27.0, z: -19.0, scale: 3.2, rotY: 0.5 },
      { type: 'flowerA', x: -19.5, z: -21.5, scale: 2.1, rotY: 1.6 },
      { type: 'flowerB', x: -23.0, z: -22.0, scale: 2.0, rotY: 3.0 },
      { type: 'flower3Group', x: -26.0, z: -23.0, scale: 1.4, rotY: 0.9 },
      { type: 'bush', x: -18.0, z: -26.0, scale: 3.0, rotY: 2.1 },
      { type: 'bushDetailed', x: -22.0, z: -27.0, scale: 3.3, rotY: 1.4 },
      { type: 'grassShort', x: -25.0, z: -28.0, scale: 1.4, rotY: 0.7 },
      { type: 'grassShort', x: -20.0, z: -29.0, scale: 1.4, rotY: 2.8 },
      { type: 'mushroomGroup', x: -28.0, z: -25.0, scale: 3.2, rotY: 1.9 },
      { type: 'mushroomSingle', x: -27.2, z: -25.6, scale: 2.8, rotY: 0.4 },

      // NE Quadrant Floral Fill
      { type: 'bushDetailed', x: 19, z: -14, scale: 3.3, rotY: 2.1 },
      { type: 'bushSmall', x: 25, z: -12, scale: 2.7, rotY: 0.7 },
      { type: 'bush', x: 16, z: -23, scale: 3.0, rotY: 1.8 },
      { type: 'bushDetailed', x: 26, z: -22, scale: 3.4, rotY: 3.0 },
      { type: 'flower4Group', x: 21, z: -18, scale: 1.4, rotY: 0.9 },
      { type: 'flower3Group', x: 25, z: -17, scale: 1.35, rotY: 2.4 },
      { type: 'flower3Single', x: 17, z: -18, scale: 1.5, rotY: 1.3 },
      { type: 'fern1', x: 18, z: -25, scale: 1.4, rotY: 1.6 },
      { type: 'plant1Big', x: 27, z: -13, scale: 1.3, rotY: 0.3 },
      { type: 'grassShort', x: 14, z: -14, scale: 1.4, rotY: 1.0 },
      { type: 'grassShort', x: 24, z: -27, scale: 1.4, rotY: 2.3 },
      { type: 'flowerA', x: 17.5, z: -17.5, scale: 2.1, rotY: 2.1 },
      { type: 'flowerB', x: 18.5, z: -18.5, scale: 2.0, rotY: 0.4 },
      { type: 'mushroomGroup', x: 22, z: -24, scale: 3.3, rotY: 1.7 },
      { type: 'mushroomTall', x: 22.8, z: -24.7, scale: 3.3, rotY: 0.3 },

      // SE Quadrant Floral Fill
      { type: 'bushDetailed', x: 19, z: 15, scale: 3.3, rotY: 0.4 },
      { type: 'bushSmall', x: 25, z: 12, scale: 2.7, rotY: 1.7 },
      { type: 'bush', x: 16, z: 24, scale: 3.0, rotY: 1.2 },
      { type: 'bushDetailed', x: 26, z: 22, scale: 3.4, rotY: 0.6 },
      { type: 'flower4Group', x: 21, z: 18, scale: 1.4, rotY: 2.0 },
      { type: 'flower3Group', x: 25, z: 17, scale: 1.35, rotY: 0.7 },
      { type: 'flower3Single', x: 17, z: 18, scale: 1.5, rotY: 2.6 },
      { type: 'fern1', x: 18, z: 25, scale: 1.4, rotY: 3.1 },
      { type: 'plant1Big', x: 27, z: 13, scale: 1.3, rotY: 2.2 },
      { type: 'grassShort', x: 14, z: 14, scale: 1.4, rotY: 1.9 },
      { type: 'grassShort', x: 24, z: 27, scale: 1.4, rotY: 0.4 },
      { type: 'flowerA', x: 17.5, z: 17.5, scale: 2.1, rotY: 2.5 },
      { type: 'flowerB', x: 18.5, z: 18.5, scale: 2.0, rotY: 1.1 },
      { type: 'mushroomGroup', x: 22, z: 24, scale: 3.3, rotY: 2.5 },
      { type: 'mushroomTall', x: 22.8, z: 24.7, scale: 3.3, rotY: 1.1 }
    ];

    flora23.forEach((f) => {
      const model = this.dungeonModels[f.type]();
      model.position.set(f.x, 0, f.z);
      model.rotation.y = f.rotY;
      model.scale.setScalar(f.scale);
      this.dungeonGroup_2_3.add(model);
    });
  }

  _buildDungeonDecorations_3_3() {
    // 1. Grand Ancient Archway (ancient_archway.glb) at entrance to Spirit of Atia
    // Atia Spirit is at [0, 0, -5]. Grand Archway stands majestically at [0, 0, 4.0]
    const archwayModel = this.dungeonModels.ancientArchway();
    archwayModel.position.set(0, 0, 4.0);
    archwayModel.rotation.y = 0; // Aligned along Z-axis for ceremonial passage
    this.dungeonGroup_3_3.add(archwayModel);

    // Archway pillar collision circles (leave central gateway open!)
    this.dungeonArchway_3_3 = [
      { x: -2.8, z: 4.0, radius: 1.1 },
      { x: 2.8, z: 4.0, radius: 1.1 }
    ];

    // 2. Colonnade Processional of Basalt Columns along ceremonial avenue
    const columns33 = [
      // West Colonnade
      { type: 'column', x: -4.5, z: 9.0, scale: 1.0, rotY: 0.2, radius: 0.95 },
      { type: 'columnRuined', x: -4.5, z: 0.0, scale: 1.0, rotY: 1.1, radius: 0.95 },
      { type: 'column', x: -4.5, z: -5.0, scale: 1.0, rotY: 0.5, radius: 0.95 },
      // East Colonnade
      { type: 'column', x: 4.5, z: 9.0, scale: 1.0, rotY: 2.1, radius: 0.95 },
      { type: 'columnRuined', x: 4.5, z: 0.0, scale: 1.0, rotY: 2.8, radius: 0.95 },
      { type: 'column', x: 4.5, z: -5.0, scale: 1.0, rotY: 1.7, radius: 0.95 }
    ];

    this.dungeonColumns_3_3 = [];
    columns33.forEach((col) => {
      const model = this.dungeonModels[col.type]();
      model.position.set(col.x, 0, col.z);
      model.rotation.y = col.rotY;
      model.scale.setScalar(col.scale);
      this.dungeonGroup_3_3.add(model);
      this.dungeonColumns_3_3.push({ x: col.x, z: col.z, radius: col.radius });
    });

    // 3. Real-time GPU Torches flaking Archway and Colonnade
    const torches33 = [
      // Grand Archway Great Torches
      { x: -3.4, z: 4.0, rotY: 0.0 },
      { x: 3.4, z: 4.0, rotY: 0.0 },
      // Colonnade Processional Pathway
      { x: -3.8, z: 9.0, rotY: 0.3 },
      { x: 3.8, z: 9.0, rotY: -0.3 },
      { x: -3.8, z: 0.0, rotY: 0.3 },
      { x: 3.8, z: 0.0, rotY: -0.3 },
      { x: -3.8, z: -5.0, rotY: 0.3 },
      { x: 3.8, z: -5.0, rotY: -0.3 },
      // Lateral Crypt Shrines
      { x: -14.0, z: -14.0, rotY: 0.8 },
      { x: -27.0, z: -26.0, rotY: 1.4 },
      { x: 14.0, z: -14.0, rotY: -0.8 },
      { x: 27.0, z: -26.0, rotY: -1.4 },
      // South Gate Access
      { x: -3.0, z: 16.0, rotY: 3.14 },
      { x: 3.0, z: 16.0, rotY: 3.14 }
    ];

    this.dungeonTorches_3_3 = [];
    this.activeDungeonTorches_3_3 = [];
    torches33.forEach((tch) => {
      const torchData = this.dungeonModels.torch();
      torchData.mesh.position.set(tch.x, 0, tch.z);
      torchData.mesh.rotation.y = tch.rotY;
      this.dungeonGroup_3_3.add(torchData.mesh);
      this.activeDungeonTorches_3_3.push(torchData.flame);
      this.dungeonTorches_3_3.push({ x: tch.x, z: tch.z, radius: 0.45 });
    });

    // 4. Ancestral Crypts: Tombstones & Bones in Lateral Wings (East & West)
    // Reduced tombstone count and substantially increased scale for skull altars
    const tombstones33 = [
      // West Crypt Wing
      { x: -20.0, z: -15.0, scale: 1.25, rotY: 0.35 },
      { x: -26.0, z: -23.0, scale: 1.30, rotY: -0.40 },
      // East Crypt Wing
      { x: 20.0, z: -15.0, scale: 1.25, rotY: -0.35 },
      { x: 26.0, z: -23.0, scale: 1.30, rotY: 0.40 }
    ];

    const altBones33 = [
      // West Crypt Bones (Large Skull Altars)
      { x: -23.0, z: -17.0, scale: 1.45, rotY: 0.7 },
      { x: -25.0, z: -21.0, scale: 1.40, rotY: 2.8 },
      // East Crypt Bones (Large Skull Altars)
      { x: 23.0, z: -17.0, scale: 1.45, rotY: -0.7 },
      { x: 25.0, z: -21.0, scale: 1.40, rotY: -2.8 }
    ];

    this.dungeonGraveyard_3_3 = [];
    tombstones33.forEach((g) => {
      const model = this.dungeonModels.lapida();
      model.position.set(g.x, 0, g.z);
      model.rotation.y = g.rotY;
      model.scale.setScalar(g.scale);
      this.dungeonGroup_3_3.add(model);
      this.dungeonGraveyard_3_3.push({ x: g.x, z: g.z, radius: 0.90 });
    });

    altBones33.forEach((b) => {
      const model = this.dungeonModels.altBones();
      model.position.set(b.x, 0, b.z);
      model.rotation.y = b.rotY;
      model.scale.setScalar(b.scale);
      this.dungeonGroup_3_3.add(model);
      this.dungeonGraveyard_3_3.push({ x: b.x, z: b.z, radius: 1.20 });
    });

    // 5. Ash Foliage Trees & Leafless Dead Twisted Trees for Zone 3_3
    const trees33 = [
      // West Sanctuary Enclosure
      { type: 'treeAsh1', x: -18, z: -10, scale: 0.62, rotY: 0.8, radius: 1.15 },
      { type: 'treeDeadTwisted1', x: -25, z: -18, scale: 0.65, rotY: 2.1, radius: 1.20 },
      { type: 'treeOakDead', x: -30, z: -25, scale: 3.4, rotY: 1.3, radius: 1.25 },
      { type: 'treeAsh2', x: -17, z: -26, scale: 0.58, rotY: 3.0, radius: 1.10 },
      { type: 'treeDeadTwisted2', x: -28, z: -10, scale: 0.62, rotY: 0.5, radius: 1.15 },

      // East Sanctuary Enclosure
      { type: 'treeAsh3', x: 18, z: -10, scale: 0.62, rotY: 1.8, radius: 1.15 },
      { type: 'treeDeadTwisted3', x: 25, z: -18, scale: 0.65, rotY: 0.5, radius: 1.20 },
      { type: 'treeOakDead', x: 30, z: -25, scale: 3.4, rotY: 2.7, radius: 1.25 },
      { type: 'treeAsh4', x: 17, z: -26, scale: 0.58, rotY: 1.1, radius: 1.10 },
      { type: 'treeDeadTwisted4', x: 28, z: -10, scale: 0.62, rotY: 2.4, radius: 1.15 },

      // SW Sector
      { type: 'treeAsh5', x: -20, z: 20, scale: 0.62, rotY: 2.4, radius: 1.15 },
      { type: 'treeDeadTwisted5', x: -27, z: 15, scale: 0.60, rotY: 0.8, radius: 1.10 },
      { type: 'treeOakDead', x: -16, z: 27, scale: 3.2, rotY: 3.2, radius: 1.20 },
      { type: 'treeAsh1', x: -28, z: 26, scale: 0.64, rotY: 1.6, radius: 1.20 },

      // SE Sector
      { type: 'treeAsh2', x: 20, z: 20, scale: 0.62, rotY: 0.3, radius: 1.15 },
      { type: 'treeDeadTwisted1', x: 27, z: 15, scale: 0.60, rotY: 1.9, radius: 1.10 },
      { type: 'treeOakDead', x: 16, z: 27, scale: 3.2, rotY: 2.8, radius: 1.20 },
      { type: 'treeAsh3', x: 28, z: 26, scale: 0.64, rotY: 0.7, radius: 1.20 }
    ];

    this.dungeonTrees_3_3 = [];
    trees33.forEach((t) => {
      const model = this.dungeonModels[t.type]();
      model.position.set(t.x, 0, t.z);
      model.rotation.y = t.rotY;
      model.scale.setScalar(t.scale);
      this.dungeonGroup_3_3.add(model);
      this.dungeonTrees_3_3.push({ x: t.x, z: t.z, radius: t.radius });
    });

    // 6. Giant Obsidian Monoliths with Pulsating Lava Veins in 3_3
    const rocks33 = [
      // Lateral Shrines
      { type: 'rockA', x: -16.0, z: -18.0, scale: 3.4, rotY: 1.4, radius: 3.2 },
      { type: 'rockFlat', x: -22.0, z: -26.0, scale: 3.5, rotY: 2.1, radius: 3.5 },
      { type: 'rockSabana1', x: -28.0, z: -12.0, scale: 3.3, rotY: 0.8, radius: 2.2 },
      { type: 'rockA', x: 16.0, z: -18.0, scale: 3.4, rotY: 2.2, radius: 3.2 },
      { type: 'rockFlat', x: 22.0, z: -26.0, scale: 3.5, rotY: 0.9, radius: 3.5 },
      { type: 'rockSabana3', x: 28.0, z: -12.0, scale: 3.3, rotY: 2.7, radius: 2.2 },
      // South Guard Formations
      { type: 'rockMedium3', x: -18.0, y: -0.65, z: 18.0, scale: 2.8, rotY: 1.7, radius: 4.0 },
      { type: 'rockB', x: -26.0, z: 22.0, scale: 3.2, rotY: 2.9, radius: 2.9 },
      { type: 'rockMedium1', x: 18.0, z: 18.0, scale: 3.5, rotY: 0.4, radius: 4.8 },
      { type: 'rockB', x: 26.0, z: 22.0, scale: 3.2, rotY: 1.5, radius: 2.9 }
    ];

    this.dungeonRocks_3_3 = [];
    rocks33.forEach((r) => {
      const model = this.dungeonModels[r.type]();
      model.position.set(r.x, r.y !== undefined ? r.y : 0, r.z);
      model.rotation.y = r.rotY;
      model.scale.setScalar(r.scale);
      this.dungeonGroup_3_3.add(model);
      this.dungeonRocks_3_3.push({ x: r.x, z: r.z, radius: r.radius });
    });

    // 7. Dense Undergrowth & Fiery Flora across zone 3_3 (Eliminates empty grass)
    const flora33 = [
      // Colonnade perimeter accents
      { type: 'flower4Group', x: -6.0, z: 9.0, scale: 1.4, rotY: 0.4 },
      { type: 'flower3Group', x: 6.0, z: 9.0, scale: 1.4, rotY: 2.3 },
      { type: 'fern1', x: -6.0, z: 0.0, scale: 1.4, rotY: 1.1 },
      { type: 'plant1Big', x: 6.0, z: 0.0, scale: 1.3, rotY: 2.7 },
      { type: 'flower3Single', x: -6.0, z: -5.0, scale: 1.5, rotY: 0.7 },
      { type: 'flower3Single', x: 6.0, z: -5.0, scale: 1.5, rotY: 3.1 },
      { type: 'bushCommonFlowers', x: -1.8, z: 12.0, scale: 1.35, rotY: 0.5 },
      { type: 'bushCommonFlowers', x: 1.8, z: 12.0, scale: 1.35, rotY: 2.7 },

      // Lateral Crypt Undergrowth
      { type: 'fern1', x: -16.0, z: -13.0, scale: 1.4, rotY: 0.9 },
      { type: 'fern1', x: 16.0, z: -13.0, scale: 1.4, rotY: 2.1 },
      { type: 'bushDetailed', x: -21.0, z: -17.0, scale: 3.3, rotY: 1.4 },
      { type: 'bushDetailed', x: 21.0, z: -17.0, scale: 3.3, rotY: 0.8 },
      { type: 'flowerA', x: -24.0, z: -21.0, scale: 2.1, rotY: 2.5 },
      { type: 'flowerA', x: 24.0, z: -21.0, scale: 2.1, rotY: 0.7 },
      { type: 'flowerB', x: -19.0, z: -25.0, scale: 2.0, rotY: 1.3 },
      { type: 'flowerB', x: 19.0, z: -25.0, scale: 2.0, rotY: 3.0 },
      { type: 'flower4Group', x: -26.0, z: -25.0, scale: 1.4, rotY: 0.6 },
      { type: 'flower4Group', x: 26.0, z: -25.0, scale: 1.4, rotY: 2.4 },
      { type: 'mushroomGroup', x: -27.0, z: -15.0, scale: 3.3, rotY: 1.8 },
      { type: 'mushroomGroup', x: 27.0, z: -15.0, scale: 3.3, rotY: 0.4 },
      { type: 'mushroomTall', x: -27.8, z: -15.7, scale: 3.3, rotY: 2.9 },
      { type: 'mushroomTall', x: 27.8, z: -15.7, scale: 3.3, rotY: 1.5 },

      // South Sector Undergrowth
      { type: 'bushDetailed', x: -19.0, z: 16.0, scale: 3.3, rotY: 1.0 },
      { type: 'bushDetailed', x: 19.0, z: 16.0, scale: 3.3, rotY: 2.2 },
      { type: 'bushSmall', x: -25.0, z: 13.0, scale: 2.7, rotY: 0.6 },
      { type: 'bushSmall', x: 25.0, z: 13.0, scale: 2.7, rotY: 2.8 },
      { type: 'bush', x: -15.0, z: 25.0, scale: 3.0, rotY: 1.9 },
      { type: 'bush', x: 15.0, z: 25.0, scale: 3.0, rotY: 0.3 },
      { type: 'flower3Group', x: -22.0, z: 23.0, scale: 1.4, rotY: 1.5 },
      { type: 'flower3Group', x: 22.0, z: 23.0, scale: 1.4, rotY: 0.8 },
      { type: 'grassShort', x: -14.0, z: 14.0, scale: 1.4, rotY: 0.5 },
      { type: 'grassShort', x: 14.0, z: 14.0, scale: 1.4, rotY: 2.6 },
      { type: 'grassShort', x: -24.0, z: 27.0, scale: 1.4, rotY: 1.8 },
      { type: 'grassShort', x: 24.0, z: 27.0, scale: 1.4, rotY: 3.2 },
      { type: 'mushroomGroup', x: -21.0, z: 26.0, scale: 3.3, rotY: 0.7 },
      { type: 'mushroomGroup', x: 21.0, z: 26.0, scale: 3.3, rotY: 2.3 }
    ];

    flora33.forEach((f) => {
      const model = this.dungeonModels[f.type]();
      model.position.set(f.x, 0, f.z);
      model.rotation.y = f.rotY;
      model.scale.setScalar(f.scale);
      this.dungeonGroup_3_3.add(model);
    });
  }

  setZone(gx, gy) {
    this.currentGx = gx;
    this.currentGy = gy;
    if (this.currentBiome !== 'forest' && this.loadedBiomes.has(this.currentBiome)) {
      this.setBiome(this.currentBiome, gx, gy);
    }
  }

  setBiome(biomeId, gx = null, gy = null) {
    this.currentBiome = biomeId;
    if (gx !== null) this.currentGx = gx;
    if (gy !== null) this.currentGy = gy;

    if (this.collisions) {
      this.collisions.removeCirclesByTag('savannah_cactus');
      this.collisions.removeCirclesByTag('savannah_tree');
      this.collisions.removeCirclesByTag('savannah_rock');
      this.collisions.removeCirclesByTag('savannah_column');
      this.collisions.removeCirclesByTag('savannah_outpost');
      this.collisions.removeCirclesByTag('savannah_blacksmith');
      this.collisions.removeCirclesByTag('arctic_rock');
      this.collisions.removeCirclesByTag('arctic_tree');
      this.collisions.removeCirclesByTag('arctic_column');
      this.collisions.removeCirclesByTag('arctic_snowman');
      this.collisions.removeCirclesByTag('arctic_market');
      this.collisions.removeCirclesByTag('arctic_house');
      this.collisions.removeCirclesByTag('mystic_tree');
      this.collisions.removeCirclesByTag('mystic_crystal');
      this.collisions.removeCirclesByTag('mystic_linter');
      this.collisions.removeCirclesByTag('mystic_column');
      this.collisions.removeCirclesByTag('mystic_prop');
      this.collisions.removeCirclesByTag('dungeon_tree');
      this.collisions.removeCirclesByTag('dungeon_rock');
      this.collisions.removeCirclesByTag('dungeon_torch');
      this.collisions.removeCirclesByTag('dungeon_grave');
      this.collisions.removeCirclesByTag('dungeon_archway');
      this.collisions.removeCirclesByTag('dungeon_column');
      this.collisions.removeCirclesByTag('dungeon_prop');
    }

    this.savannahGroup.visible = false; // Macro-zonas anteriores desactivadas en favor de SavannaZone
    this.arcticGroup.visible = (biomeId === 'arctic' && this.loadedBiomes.has('arctic'));
    this.mysticGroup.visible = (biomeId === 'mystic' && this.loadedBiomes.has('mystic'));
    this.dungeonGroup.visible = (biomeId === 'dungeon' && this.loadedBiomes.has('dungeon'));

    if (biomeId === 'dungeon' && this.loadedBiomes.has('dungeon')) {
      const is23 = (this.currentGx === 2 && this.currentGy === 3);
      if (this.dungeonGroup_2_3) this.dungeonGroup_2_3.visible = is23;
      if (this.dungeonGroup_3_3) this.dungeonGroup_3_3.visible = !is23;

      if (this.collisions) {
        const treeList = is23 ? this.dungeonTrees_2_3 : this.dungeonTrees_3_3;
        if (treeList) {
          treeList.forEach((t, idx) => {
            this.collisions.addCircle(t.x, t.z, t.radius || 1.15, 'dungeon_tree_' + idx);
          });
        }
        const rockList = is23 ? this.dungeonRocks_2_3 : this.dungeonRocks_3_3;
        if (rockList) {
          rockList.forEach((r, idx) => {
            this.collisions.addCircle(r.x, r.z, r.radius || 1.20, 'dungeon_rock_' + idx);
          });
        }
        const torchList = is23 ? this.dungeonTorches_2_3 : this.dungeonTorches_3_3;
        if (torchList) {
          torchList.forEach((tch, idx) => {
            this.collisions.addCircle(tch.x, tch.z, tch.radius || 0.45, 'dungeon_torch_' + idx);
          });
        }
        const graveList = is23 ? this.dungeonGraveyard_2_3 : this.dungeonGraveyard_3_3;
        if (graveList) {
          graveList.forEach((g, idx) => {
            this.collisions.addCircle(g.x, g.z, g.radius || 0.72, 'dungeon_grave_' + idx);
          });
        }
        if (!is23 && this.dungeonArchway_3_3) {
          this.dungeonArchway_3_3.forEach((a, idx) => {
            this.collisions.addCircle(a.x, a.z, a.radius || 1.1, 'dungeon_archway_' + idx);
          });
        }
        if (!is23 && this.dungeonColumns_3_3) {
          this.dungeonColumns_3_3.forEach((col, idx) => {
            this.collisions.addCircle(col.x, col.z, col.radius || 0.95, 'dungeon_column_' + idx);
          });
        }
      }
    } else if (biomeId === 'mystic' && this.loadedBiomes.has('mystic')) {
      const is12 = (this.currentGx === 1 && this.currentGy === 2);
      if (this.mysticGroup_1_2) this.mysticGroup_1_2.visible = is12;
      if (this.mysticGroup_1_3) this.mysticGroup_1_3.visible = !is12;

      if (this.collisions) {
        const treeList = is12 ? this.mysticTrees_1_2 : this.mysticTrees_1_3;
        if (treeList) {
          treeList.forEach((t, idx) => {
            this.collisions.addCircle(t.x, t.z, t.radius || 1.05, 'mystic_tree_' + idx);
          });
        }
        const crystalList = is12 ? this.mysticCrystals_1_2 : this.mysticCrystals_1_3;
        if (crystalList) {
          crystalList.forEach((c, idx) => {
            this.collisions.addCircle(c.x, c.z, c.radius || 1.15, 'mystic_crystal_' + idx);
          });
        }
        const linterList = is12 ? this.mysticLinters_1_2 : this.mysticLinters_1_3;
        if (linterList) {
          linterList.forEach((l, idx) => {
            this.collisions.addCircle(l.x, l.z, l.radius || 0.65, 'mystic_linter_' + idx);
          });
        }
        if (!is12 && this.mysticColumns_1_3) {
          this.mysticColumns_1_3.forEach((col, idx) => {
            this.collisions.addCircle(col.x, col.z, col.radius || 0.95, 'mystic_column_' + idx);
          });
        }
      }
    } else if (biomeId === 'arctic' && this.loadedBiomes.has('arctic')) {
      const is21 = (this.currentGx === 2 && this.currentGy === 1);
      if (this.arcticGroup_2_1) this.arcticGroup_2_1.visible = is21;
      if (this.arcticGroup_1_1) this.arcticGroup_1_1.visible = !is21;

      if (this.collisions) {
        const treeList = is21 ? this.arcticTrees_2_1 : this.arcticTrees_1_1;
        if (treeList) {
          treeList.forEach((t, idx) => {
            this.collisions.addCircle(t.x, t.z, t.radius || 0.9, 'arctic_tree_' + idx);
          });
        }
        const rockList = is21 ? this.arcticIceRocks_2_1 : this.arcticIceRocks_1_1;
        if (rockList) {
          rockList.forEach((r, idx) => {
            this.collisions.addCircle(r.x, r.z, r.radius || 1.1, 'arctic_rock_' + idx);
          });
        }
        const colList = is21 ? this.arcticColumns_2_1 : this.arcticColumns_1_1;
        if (colList) {
          colList.forEach((c, idx) => {
            this.collisions.addCircle(c.x, c.z, c.radius || 0.95, 'arctic_column_' + idx);
          });
        }
        const snowmanList = is21 ? this.arcticSnowmen_2_1 : this.arcticSnowmen_1_1;
        if (snowmanList) {
          snowmanList.forEach((s, idx) => {
            this.collisions.addCircle(s.x, s.z, s.radius || 0.60, 'arctic_snowman_' + idx);
          });
        }
        if (is21 && this.arcticMarketCollisions_2_1) {
          this.arcticMarketCollisions_2_1.forEach((m, idx) => {
            this.collisions.addCircle(m.x, m.z, m.radius || 1.45, 'arctic_market_' + idx);
          });
        }
        if (!is21 && this.arcticHouseCollisions_1_1) {
          this.arcticHouseCollisions_1_1.forEach((h, idx) => {
            this.collisions.addCircle(h.x, h.z, h.radius || 3.0, 'arctic_house_' + idx);
          });
        }
      }
    } else if (biomeId === 'savannah') {
      // Las macro-zonas anteriores de la sabana (3_1 y 3_2) han sido desactivadas en favor de SavannaZone (Gran Isla de la Sabana).
      if (this.savannahGroup) this.savannahGroup.visible = false;
      if (this.savannahGroup_3_1) this.savannahGroup_3_1.visible = false;
      if (this.savannahGroup_3_2) this.savannahGroup_3_2.visible = false;
    }
  }

  update(dt) {
    if (this.dungeonLavaMaterials && this.dungeonLavaMaterials.length > 0) {
      for (let i = 0; i < this.dungeonLavaMaterials.length; i++) {
        this.dungeonLavaMaterials[i].value += dt;
      }
    }

    if (this.currentBiome === 'dungeon' && this.loadedBiomes.has('dungeon')) {
      const is23 = (this.currentGx === 2 && this.currentGy === 3);
      const activeTorches = is23 ? this.activeDungeonTorches_2_3 : this.activeDungeonTorches_3_3;
      if (activeTorches && activeTorches.length > 0) {
        for (let i = 0; i < activeTorches.length; i++) {
          activeTorches[i].update(dt);
        }
      }
    }
  }
}
