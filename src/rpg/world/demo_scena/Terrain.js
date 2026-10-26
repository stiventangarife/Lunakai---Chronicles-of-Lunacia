import * as THREE from 'three';
import { SimplexNoise, smoothstep } from './MathUtils.js';
import { WaterManager } from './WaterManager.js';
import { createHandPaintedGrassTexture, createHandPaintedSoilTexture } from './grassTexture.js';
import { getGrassV3GroundShaderDefs } from './grassShader.js';

export class Terrain {
  constructor(arg1, arg2, arg3) {
    if (arg1 && typeof arg1.add === 'function') {
      this.parentGroup = arg1;
      this.roadManager = arg2;
      this.assetManager = arg3;
    } else {
      this.parentGroup = null;
      this.roadManager = arg1;
      this.assetManager = arg2;
    }

    this.noise = new SimplexNoise(4242);
    this.detailNoise = new SimplexNoise(8888);

    this.size = 480;            // 480m x 480m
    this.segments = 256;        // Subdivisión de la malla
    this.waterLevel = 1.0;      // Nivel de agua base

    this.grassType = 'stylized_v3';
    this.v3GrassTexture = null;
    this.v3ParamsCache = {};
    this.time = 0.0;

    this.mesh = null;
    this.geometry = null;
    this.material = null;

    this.createTerrain();
  }

  getHeight(x, z) {
    const distFromCenter = Math.sqrt(x * x + z * z);

    // 1. RUIDO BASE con piso suave para que la pradera nunca se hunda abruptamente
    const baseNoise = this.noise.fbm(x * 0.005, z * 0.005, 3, 0.5, 2.0) * 10;
    const detail = this.detailNoise.noise2D(x * 0.03, z * 0.03) * 0.8;
    let h = 4.0 + baseNoise + detail;

    // En la pradera alta (Z <= 25), suavizar la cuenca para que el terreno base
    // se mantenga suavemente por encima de 2.5m, evitando depresiones de arena y muros artificiales
    if (z <= 25) {
      const minH = 2.5;
      if (h < minH) {
        const diff = minH - h;
        h = h + diff * 0.85;
      }
    }

    // 2. ZONA 4: COLINA MIRADOR (X: 70 a 150, Z: -120 a -20)
    /*const hillCenterX = 110;
    const hillCenterZ = -70;
    const dxHill = (x - hillCenterX) / 45;
    const dzHill = (z - hillCenterZ) / 50;
    const hillDistSq = dxHill * dxHill + dzHill * dzHill;
    if (hillDistSq < 1.0) {
      const hillFactor = Math.cos(Math.sqrt(hillDistSq) * Math.PI * 0.5);
      h += Math.pow(hillFactor, 1.8) * 26.0;
    }*/

    // 3. ZONA 5: FORMACIÓN ROCOSA (X: 110 a 160, Z: 50 a 130)
    /*const rockCenterX = 125;
    const rockCenterZ = 85;
    const dxRock = (x - rockCenterX) / 38;
    const dzRock = (z - rockCenterZ) / 45;
    const rockDistSq = dxRock * dxRock + dzRock * dzRock;
    if (rockDistSq < 1.0) {
      const rockFactor = Math.cos(Math.sqrt(rockDistSq) * Math.PI * 0.5);
      const cragNoise = Math.abs(this.noise.noise2D(x * 0.08, z * 0.08)) * 8.0;
      h += rockFactor * (14.0 + cragNoise);
    }*/

    // 4. ZONA 2: BOSQUE (X: -140 a -20, Z: 40 a 160)
    const forestDx = (x - (-70)) / 60;
    const forestDz = (z - 100) / 60;
    const forestDistSq = forestDx * forestDx + forestDz * forestDz;
    if (forestDistSq < 1.0) {
      const fFactor = (1.0 - Math.sqrt(forestDistSq));
      const fWaves = this.noise.noise2D(x * 0.02, z * 0.02) * 4.5;
      h += fFactor * (3.0 + fWaves);
    }

    // 5. ZONA 3: CAUCE DEL RÍO Y RIBERAS NATURALES (Nace en manantial norte Z: -115)
    const { riverCenterX, riverHalfWidth: rhw0 } = WaterManager.getRiverBounds(z);
    // Estuario norte (Hito 66): el cauce se abre al llegar al mar, igual que el agua
    const riverHalfWidth = (this.legacyHeights || x >= riverCenterX) ? rhw0 : rhw0 * WaterManager.getNorthMouthFactor(z); // solo hacia el oeste
    const distToRiver = Math.abs(x - riverCenterX);

    // Hito 66: el río llega al mar del norte y tiene vados. Con legacyHeights = true se calcula el terreno de antes
    // (PropsManager lo usa al colocar la vegetación, para que la isla salga idéntica; ver PropsManager).
    const ext = !this.legacyHeights;
    const riverZ0 = ext ? WaterManager.RIVER_CARVE_Z0 : WaterManager.RIVER_Z_SPRING;
    if (z >= riverZ0) {
      const riverSourceBlend = ext ? 1.0 : smoothstep(-115.0, -95.0, z);
      const waterY = WaterManager.getRiverWaterHeight(z);

      const bankWidth = 10.0; // Ancho suave y generoso de orilla (10m) para pendiente ultraligera
      const bedDepth = (z <= 16) ? 1.35 : 1.75;
      const riverBedY = waterY - bedDepth;
      const edgeY = waterY + 0.05;

      let riverH = h;
      if (distToRiver <= riverHalfWidth) {
        // DENTRO DEL AGUA: Lecho suave sumergido de riverBedY a edgeY
        const u = distToRiver / riverHalfWidth;
        const curve = u * u * (3.0 - 2.0 * u);
        riverH = riverBedY + (edgeY - riverBedY) * curve;
      } else if (distToRiver < riverHalfWidth + bankWidth) {
        // RIBERA DEL RÍO: Transición suave y continua sin muros ni escalones
        const t = (distToRiver - riverHalfWidth) / bankWidth;
        const smoothT = t * t * (3.0 - 2.0 * t);
        const targetH = Math.max(h, waterY + 0.15);
        riverH = edgeY * (1.0 - smoothT) + targetH * smoothT;
      }

      // Vados: el lecho sube hasta dejar FORD_DEPTH m de agua (solo dentro del cauce)
      if (ext && distToRiver <= riverHalfWidth) {
        const ford = WaterManager.getFordFactor(x, z, this.roadManager);
        if (ford > 0) riverH += (Math.max(riverH, waterY - WaterManager.FORD_DEPTH) - riverH) * ford;
      }

      h = h * (1.0 - riverSourceBlend) + riverH * riverSourceBlend;
    }

    // Aplanado sutil del camino (excluyendo el cauce y la ribera del río)
    if (this.roadManager) {
      const rf = this.roadManager.getRoadFactor(x, z);
      if (rf > 0.05 && (z < riverZ0 || distToRiver > riverHalfWidth + 2.0)) {
        const smoothH = (this.getHeightRaw(x - 2, z) + this.getHeightRaw(x + 2, z)) * 0.5;
        h = h * (1.0 - rf * 0.35) + smoothH * (rf * 0.35);
      }
    }

    // 6. DESVANECIMIENTO NATURAL DE LA COSTA HACIA EL MAR ABIERTO (Horizonte Marino)
    const coastStart = 126.0;
    const coastEnd = 162.0;
    if (distFromCenter > coastStart) {
      const cFactor = smoothstep(coastStart, coastEnd, distFromCenter);
      // El terreno desciende orgánicamente hacia el lecho marino sumergido (-1.8m)
      const seaBed = -1.8;
      h = h * (1.0 - cFactor) + seaBed * cFactor;
    }
    if (distFromCenter >= coastEnd) {
      h = Math.min(h, -1.8);
    }

    return h;
  }

  getHeightRaw(x, z) {
    const baseNoise = this.noise.fbm(x * 0.005, z * 0.005, 2, 0.5, 2.0) * 8;
    let h = 4.0 + baseNoise;
    if (z <= 25 && h < 2.5) {
      h += (2.5 - h) * 0.85;
    }
    return h;
  }

  getNormal(x, z) {
    const eps = 0.5;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);

    const normal = new THREE.Vector3(hL - hR, 2.0 * eps, hD - hU);
    normal.normalize();
    return normal;
  }

  createTerrain() {
    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);

    const posAttr = this.geometry.attributes.position;
    const count = posAttr.count;

    const roadFactors = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this.getHeight(x, z);
      posAttr.setY(i, y);
      roadFactors[i] = this.roadManager ? this.roadManager.getRoadFactor(x, z) : 0.0;
    }

    this.geometry.setAttribute('aRoadFactor', new THREE.BufferAttribute(roadFactors, 1));
    this.geometry.computeVertexNormals();

    this.material = this.createStylizedMaterial();

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    if (this.parentGroup) {
      this.parentGroup.add(this.mesh);
    }
  }

  createStylizedMaterial() {
    // Obtener texturas provistas
    const grassTex = this.assetManager ? this.assetManager.getTexture('grass_diffuse') : null;
    const pathTex = this.assetManager ? this.assetManager.getTexture('path_diffuse') : null;
    const forestTex = this.assetManager ? this.assetManager.getTexture('forest_ground') : null;

    if (!this.v3GrassTexture) {
      this.v3GrassTexture = createHandPaintedGrassTexture(null, 1024);
    }
    if (!this.v3SoilTexture) {
      this.v3SoilTexture = createHandPaintedSoilTexture(null, 1024);
    }

    const customMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false
    });

    customMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterLevel = { value: this.waterLevel };
      shader.uniforms.uGrassColorLow = { value: new THREE.Color(0x4ca030) };
      shader.uniforms.uGrassColorHigh = { value: new THREE.Color(0x82db45) };
      shader.uniforms.uRockColor = { value: new THREE.Color(0x756e65) };
      shader.uniforms.uSandColor = { value: new THREE.Color(0xd2be8e) };
      shader.uniforms.uPathColor = { value: new THREE.Color(0x8a7250) };

      shader.uniforms.uHasGrassTex = { value: grassTex ? 1.0 : 0.0 };
      shader.uniforms.uGrassTex = { value: grassTex };
      shader.uniforms.uHasPathTex = { value: pathTex ? 1.0 : 0.0 };
      shader.uniforms.uPathTex = { value: pathTex };
      shader.uniforms.uHasForestTex = { value: forestTex ? 1.0 : 0.0 };
      shader.uniforms.uForestTex = { value: forestTex };
      shader.uniforms.uPathOpacity = { value: 0.20 }; // Visibilidad sendero = 20% por defecto

      // Uniforms de Césped Estilizado V3
      shader.uniforms.uGrassV3Active = { value: (this.grassType === 'stylized_v3' ? 1.0 : 0.0) };
      shader.uniforms.uTime = { value: 0.0 };
      shader.uniforms.uV3GrassTex = { value: this.v3GrassTexture };
      shader.uniforms.uV3SoilTex = { value: this.v3SoilTexture };
      shader.uniforms.uGroundTexScale = { value: 0.25 };
      shader.uniforms.uSoilTexScale = { value: 0.15 };
      shader.uniforms.uV3BaseColor = { value: new THREE.Color('#183b1d') };
      shader.uniforms.uV3MidColor = { value: new THREE.Color('#48962c') };
      shader.uniforms.uV3TipColor = { value: new THREE.Color('#a2e742') };
      shader.uniforms.uV3SunGrassColor = { value: new THREE.Color('#5ea832') };
      shader.uniforms.uV3WetGrassColor = { value: new THREE.Color('#1a441e') };
      shader.uniforms.uV3DryGrassColor = { value: new THREE.Color('#788d38') };
      shader.uniforms.uV3SoilHumusColor = { value: new THREE.Color('#382413') };
      shader.uniforms.uV3SoilClayColor = { value: new THREE.Color('#7a522a') };
      shader.uniforms.uV3SoilDryColor = { value: new THREE.Color('#c2a26c') };
      shader.uniforms.uV3MossColor = { value: new THREE.Color('#557329') };
      shader.uniforms.uV3WindHighlightColor = { value: new THREE.Color('#e0f866') };
      shader.uniforms.uV3ClearingGrassColor = { value: new THREE.Color('#5a9e3e') };
      shader.uniforms.uV3DirtCenterColor = { value: new THREE.Color('#d1a872') };
      shader.uniforms.uV3DirtEdgeColor = { value: new THREE.Color('#9b7346') };
      shader.uniforms.uV3SoilPatchCoverage = { value: 0.84 };
      shader.uniforms.uV3SoilPatchScale = { value: 0.1 };
      shader.uniforms.uV3MacroNoiseScale = { value: 0.045 };
      shader.uniforms.uV3WindSpeed = { value: 1.25 };
      shader.uniforms.uV3WindScale = { value: 0.085 };

      this.terrainShader = shader;
      if (this.v3ParamsCache) {
        for (const [key, val] of Object.entries(this.v3ParamsCache)) {
          this.setV3GroundParam(key, val);
        }
      }

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        attribute float aRoadFactor;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying float vRoadFactor;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vRoadFactor = aRoadFactor;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        uniform float uWaterLevel;
        uniform vec3 uGrassColorLow;
        uniform vec3 uGrassColorHigh;
        uniform vec3 uRockColor;
        uniform vec3 uSandColor;
        uniform vec3 uPathColor;
        uniform float uPathOpacity;

        uniform float uHasGrassTex;
        uniform sampler2D uGrassTex;
        uniform float uHasPathTex;
        uniform sampler2D uPathTex;
        uniform float uHasForestTex;
        uniform sampler2D uForestTex;

        uniform float uGrassV3Active;
        ${getGrassV3GroundShaderDefs()}

        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying float vRoadFactor;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        
        // 1. Pendiente de roca (slope)
        float slope = clamp(dot(vWorldNormal, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
        float rockFactor = 1.0 - smoothstep(0.64, 0.86, slope);

        // 2. Micro y Macro Tiling para máxima definición sin repetición de mosaico
        vec2 uvMicro = vWorldPosition.xz * 0.42;
        vec2 uvMacro = vWorldPosition.xz * 0.05;

        vec3 texMicro = vec3(0.5);
        vec3 texMacro = vec3(0.5);
        if (uHasGrassTex > 0.5) {
          texMicro = texture2D(uGrassTex, uvMicro).rgb;
          texMacro = texture2D(uGrassTex, uvMacro).rgb;
        }

        vec3 finalGrass;
        if (uGrassV3Active > 0.5) {
          // Césped Estilizado V3: Gouache multi-escala, strokeLuminance y bordes dentados
          finalGrass = computeGrassV3Ground(vWorldPosition, vWorldNormal, vRoadFactor, uPathOpacity);
        } else {
          vec3 grassDetailTex = mix(texMicro, texMacro, 0.4);

          // 3. Paleta de gradientes de múltiples verdes (Genshin Impact / Mondstadt)
          vec3 colDeepGreen  = vec3(0.16, 0.38, 0.12);
          vec3 colPrairie    = vec3(0.30, 0.64, 0.20);
          vec3 colSunnyLime  = vec3(0.52, 0.82, 0.25);
          vec3 colGoldenWarm = vec3(0.72, 0.88, 0.34);

          float p1 = sin(vWorldPosition.x * 0.07 + vWorldPosition.z * 0.04) * cos(vWorldPosition.z * 0.08) * 0.5 + 0.5;
          float p2 = sin(vWorldPosition.x * 0.18 - vWorldPosition.z * 0.15) * 0.5 + 0.5;
          float p3 = cos(vWorldPosition.x * 0.035 - vWorldPosition.z * 0.045) * 0.5 + 0.5;

          float heightT = clamp((vWorldPosition.y - 1.5) / 28.0, 0.0, 1.0);

          vec3 grassGrad = mix(colDeepGreen, colPrairie, p1);
          grassGrad = mix(grassGrad, colSunnyLime, p2 * 0.65 + heightT * 0.35);
          grassGrad = mix(grassGrad, colGoldenWarm, pow(p3, 2.2) * 0.4);

          finalGrass = grassGrad * (grassDetailTex * 1.55);

          // 4. Suelo de Bosque
          float inForest = 1.0 - smoothstep(15.0, 55.0, distance(vWorldPosition.xz, vec2(-70.0, 105.0)));
          if (uHasForestTex > 0.5 && inForest > 0.05) {
            vec3 forestTexCol = texture2D(uForestTex, uvMicro * 0.85).rgb;
            vec3 forestGreen = mix(colDeepGreen, vec3(0.24, 0.42, 0.16), 0.5);
            vec3 finalForest = forestGreen * (forestTexCol * 1.6);
            finalGrass = mix(finalGrass, finalForest, inForest * 0.75);
          }

          // 4b. Sendero orgánico estilo Genshin Impact
          if (vRoadFactor > 0.005 && uPathOpacity > 0.001) {
            float edgeNoise = sin(vWorldPosition.x * 0.95 + cos(vWorldPosition.z * 0.75) * 2.5) * 0.28
                            + sin(vWorldPosition.z * 1.45) * 0.18
                            + cos(vWorldPosition.x * 2.3 - vWorldPosition.z * 2.1) * 0.10;

            float edgeZone = vRoadFactor * (1.0 - vRoadFactor) * 2.4;
            float organicRoad = clamp(vRoadFactor + edgeNoise * edgeZone, 0.0, 1.0);

            vec3 colCenterEarth = vec3(0.50, 0.39, 0.26);
            vec3 colMidGravel   = vec3(0.66, 0.56, 0.40);
            vec3 colBorderSand  = vec3(0.76, 0.68, 0.48);

            float tCore = smoothstep(0.42, 0.88, organicRoad);
            float tMid  = smoothstep(0.12, 0.58, organicRoad);
            vec3 pathGrad = mix(colBorderSand, colMidGravel, tMid);
            pathGrad = mix(pathGrad, colCenterEarth, tCore);

            vec3 pathTexCol = vec3(0.62);
            if (uHasPathTex > 0.5) {
              vec3 pA = texture2D(uPathTex, vWorldPosition.xz * 0.15).rgb;
              vec3 pB = texture2D(uPathTex, vWorldPosition.xz * 0.45).rgb;
              pathTexCol = mix(pA, pB, 0.35);
            }

            vec3 finalPath = pathGrad * (pathTexCol * 1.4 + 0.05);
            float blendWeight = smoothstep(0.06, 0.72, organicRoad) * uPathOpacity;
            finalGrass = mix(finalGrass, finalPath, blendWeight);
          }
        }

        // 5. Orilla de arena / tierra húmeda
        float waterDistance = vWorldPosition.y - uWaterLevel;
        float shoreFactor = 1.0 - smoothstep(0.0, 1.7, waterDistance);

        // 6. Color de Rocas en laderas empinadas
        vec3 rockBase = uRockColor;
        if (uHasGrassTex > 0.5) {
          rockBase = mix(uRockColor, texMicro * 1.1, 0.35);
        }

        // Mezcla final de capas
        vec3 finalColor = finalGrass;
        finalColor = mix(finalColor, uSandColor, shoreFactor * 0.88);
        finalColor = mix(finalColor, rockBase, rockFactor);

        diffuseColor.rgb = finalColor;`
      );
    };

    return customMaterial;
  }

  setGrassType(type) {
    this.grassType = type;
    if (this.terrainShader && this.terrainShader.uniforms.uGrassV3Active) {
      this.terrainShader.uniforms.uGrassV3Active.value = (type === 'stylized_v3' ? 1.0 : 0.0);
    }
  }

  setPathIntensity(opacity) {
    if (this.terrainShader && this.terrainShader.uniforms.uPathOpacity) {
      this.terrainShader.uniforms.uPathOpacity.value = opacity;
    }
  }

  setV3GroundParam(name, value) {
    if (!this.v3ParamsCache) this.v3ParamsCache = {};
    this.v3ParamsCache[name] = value;
    if (!this.terrainShader || !this.terrainShader.uniforms) return;
    const u = this.terrainShader.uniforms;
    if (u[name]) {
      if (value && value.isColor) {
        u[name].value.copy(value);
      } else if (typeof value === 'string' && u[name].value && u[name].value.isColor) {
        u[name].value.set(value);
      } else {
        u[name].value = value;
      }
    }
  }

  update(delta) {
    this.time += delta;
    if (this.terrainShader && this.terrainShader.uniforms.uTime) {
      this.terrainShader.uniforms.uTime.value = this.time;
    }
  }
}
