// StylizedGround.js - 3-Layer Blend Ground with Path SDF and Displacement
import * as THREE from 'three';
import { GROUND_SIZE, SDF_RANGE_METERS } from './PathSDF.js';

export class StylizedGround {
  constructor(textures, config = {}) {
    this.textures = textures;
    this.config = {
      pathDepth: 0.25,
      dirtBump: 0.15,
      grassAO: 0.79,
      pathEdgeWidth: 0.65,
      roadOffset: 0.75, // Updated to match user config screenshot
      textureRepeat: 16.0,
      ...config
    };

    this.mesh = this._createMesh();
  }

  _createMesh() {
    const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 256, 256);
    geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    // Setup texture wrapping & filtering
    const {
      grassColor, grassNormal, grassRoughness,
      dirtColor, dirtNormal, dirtRoughness,
      dirtAO, dirtHeight, dirtMetallic,
      pathSdf, noiseMap
    } = this.textures;

    if (grassColor) grassColor.colorSpace = THREE.SRGBColorSpace;
    if (dirtColor) dirtColor.colorSpace = THREE.SRGBColorSpace;

    [grassColor, grassNormal, grassRoughness, dirtColor, dirtNormal, dirtRoughness, dirtAO, dirtHeight, dirtMetallic].forEach(tex => {
      if (tex) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      }
    });
    if (noiseMap) {
      noiseMap.wrapS = noiseMap.wrapT = THREE.RepeatWrapping;
    }

    const uniforms = {
      uPathSdf: { value: pathSdf },
      uNoiseMap: { value: noiseMap },
      uDirtHeight: { value: dirtHeight },
      uGrassColor: { value: grassColor },
      uGrassNormal: { value: grassNormal },
      uGrassRoughness: { value: grassRoughness },
      uDirtColor: { value: dirtColor },
      uDirtNormal: { value: dirtNormal },
      uDirtRoughness: { value: dirtRoughness },
      uDirtAO: { value: dirtAO },
      uDirtMetallic: { value: dirtMetallic },
      uPathDepth: { value: this.config.pathDepth },
      uDirtBump: { value: this.config.dirtBump },
      uGrassAO: { value: this.config.grassAO },
      uPathEdgeWidth: { value: this.config.pathEdgeWidth },
      uRoadOffset: { value: this.config.roadOffset },
      uTextureRepeat: { value: this.config.textureRepeat },
      uSdfRange: { value: SDF_RANGE_METERS },
      uGroundColorOverride: { value: new THREE.Color(0xFAC651) },
      uGroundColorSecondary: { value: new THREE.Color(0xD89236) },
      uUseGroundOverride: { value: 0.0 },
      uPathColorOverride: { value: new THREE.Color(0xC4BE72) },
      uUsePathOverride: { value: 0.0 },
      uRiverActive: { value: 1.0 },
      uPondActive: { value: 1.0 },
      uRoadActive: { value: 1.0 },
      uPondCenter: { value: new THREE.Vector2(-30.3, 12.0) },
      uPondRadii: { value: new THREE.Vector2(4.1, 3.0) },
      uPond2Active: { value: 0.0 },
      uPond2Center: { value: new THREE.Vector2(3.7, -26.1) },
      uPond2Radii: { value: new THREE.Vector2(6.2, 4.6) }
    };
    this.uniforms = uniforms;

    const material = new THREE.MeshStandardMaterial({
      normalMap: grassNormal,
      roughness: 0.85,
      metalness: 0.05
    });

    material.onBeforeCompile = (shader) => {
      // Pass all uniforms
      Object.assign(shader.uniforms, uniforms);

      // Vertex shader modifications
      shader.vertexShader = `
        uniform sampler2D uPathSdf;
        uniform sampler2D uNoiseMap;
        uniform sampler2D uDirtHeight;
        uniform float uPathDepth;
        uniform float uDirtBump;
        uniform float uPathEdgeWidth;
        uniform float uRoadOffset;
        uniform float uTextureRepeat;
        uniform float uSdfRange;
        uniform float uRiverActive;
        uniform float uPondActive;
        uniform float uRoadActive;
        uniform vec2 uPondCenter;
        uniform vec2 uPondRadii;
        uniform float uPond2Active;
        uniform vec2 uPond2Center;
        uniform vec2 uPond2Radii;
        varying vec2 vGroundUv;
        varying vec3 vGroundWorldPos;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vGroundWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vGroundUv = uv;

        // Path SDF height displacement
        float signedMeters = texture2D(uPathSdf, uv).r * (2.0 * uSdfRange) - uSdfRange;
        float edgeNoise = texture2D(uNoiseMap, uv * 6.0).r;
        float noiseBreakup = (edgeNoise - 0.5) * 0.5;
        float dirtH = texture2D(uDirtHeight, uv * uTextureRepeat).r;
        float heightBias = (dirtH - 0.5) * 0.4;
        float adjustedMeters = signedMeters + noiseBreakup + heightBias;

        float roadWeight = 1.0 - smoothstep(uRoadOffset - 0.15, uRoadOffset + 0.15, adjustedMeters);
        float grassWeight = smoothstep(uRoadOffset + uPathEdgeWidth * 0.4, uRoadOffset + uPathEdgeWidth, adjustedMeters);
        float coverWeight = 1.0 - grassWeight;

        // Keep cobblestone road & path depression out of the river corridor
        float rz = vGroundWorldPos.z;
        float rx = 8.5 + 1.8 * sin(rz * 0.09) + 0.8 * cos(rz * 0.21);
        float distToRiver = abs(vGroundWorldPos.x - rx);

        // Away from the stone crossing (|rz| > 1.5): fade road completely away 3.4m from river center
        // At the stone crossing (|rz| <= 1.5): clear road inside the water channel (1.7m)
        float riverRoadMask = (abs(rz) > 1.5)
          ? smoothstep(2.30, 3.40, distToRiver)
          : smoothstep(1.65, 2.30, distToRiver);

        coverWeight *= riverRoadMask * uRoadActive;
        roadWeight *= riverRoadMask * uRoadActive;

        float dirtBumpAmount = (dirtH - 0.5) * uDirtBump * roadWeight;
        float pathDepression = coverWeight * uPathDepth;
        float verticalOffset = dirtBumpAmount - pathDepression;

        // River Canyon Trench depression (Deepened so riverbed stays comfortably beneath water ribbon y = -0.725)
        float canyonDip = (1.0 - smoothstep(1.85, 2.65, distToRiver)) * 1.28 * uRiverActive;
        verticalOffset -= canyonDip;

        // Dynamic Pond Basin Trench depression
        vec2 pDiff = vGroundWorldPos.xz - uPondCenter;
        float pDistH = (pDiff.x * 0.7071 - pDiff.y * 0.7071) / max(0.1, uPondRadii.x);
        float pDistV = (pDiff.x * 0.7071 + pDiff.y * 0.7071) / max(0.1, uPondRadii.y);
        float distToPondNorm = length(vec2(pDistH, pDistV));
        float pondDip = (1.0 - smoothstep(0.85, 1.15, distToPondNorm)) * 0.78 * uPondActive;
        verticalOffset -= pondDip;

        // Dynamic Pond 2 Basin Trench depression
        vec2 pDiff2 = vGroundWorldPos.xz - uPond2Center;
        float pDistH2 = (pDiff2.x * 0.7071 - pDiff2.y * 0.7071) / max(0.1, uPond2Radii.x);
        float pDistV2 = (pDiff2.x * 0.7071 + pDiff2.y * 0.7071) / max(0.1, uPond2Radii.y);
        float distToPondNorm2 = length(vec2(pDistH2, pDistV2));
        float pondDip2 = (1.0 - smoothstep(0.85, 1.15, distToPondNorm2)) * 0.78 * uPond2Active;
        verticalOffset -= pondDip2;

        // Gentle desert sand dune undulation (only when road is disabled as in savannah)
        // Fade dune wave to 0 within 6m of zone edges so cardinal portals are not buried
        // AND completely clear of the river canyon so water is never covered by terrain
        float edgeFadeX = smoothstep(0.0, 6.0, 32.0 - abs(vGroundWorldPos.x));
        float edgeFadeZ = smoothstep(0.0, 6.0, 32.0 - abs(vGroundWorldPos.z));
        float edgeFade = edgeFadeX * edgeFadeZ;
        float riverClearDune = mix(1.0, smoothstep(2.0, 3.8, distToRiver), uRiverActive);
        float duneWave = (sin(vGroundWorldPos.x * 0.12) * cos(vGroundWorldPos.z * 0.10) * 0.22 + (edgeNoise - 0.5) * 0.10);
        verticalOffset += duneWave * (1.0 - roadWeight) * (1.0 - uRoadActive) * edgeFade * riverClearDune;

        // Since geometry was rotated -PI/2 around X, Y is the normal in local coordinates
        transformed.y += verticalOffset;
        `
      );

      // Fragment shader modifications
      shader.fragmentShader = `
        uniform sampler2D uPathSdf;
        uniform sampler2D uNoiseMap;
        uniform sampler2D uDirtHeight;
        uniform sampler2D uGrassColor;
        uniform sampler2D uGrassNormal;
        uniform sampler2D uGrassRoughness;
        uniform sampler2D uDirtColor;
        uniform sampler2D uDirtNormal;
        uniform sampler2D uDirtRoughness;
        uniform sampler2D uDirtAO;
        uniform sampler2D uDirtMetallic;
        uniform float uPathDepth;
        uniform float uGrassAO;
        uniform float uPathEdgeWidth;
        uniform float uRoadOffset;
        uniform float uTextureRepeat;
        uniform float uSdfRange;
        uniform vec3 uGroundColorOverride;
        uniform vec3 uGroundColorSecondary;
        uniform float uUseGroundOverride;
        uniform vec3 uPathColorOverride;
        uniform float uUsePathOverride;
        uniform float uRiverActive;
        uniform float uPondActive;
        uniform float uRoadActive;
        uniform vec2 uPondCenter;
        uniform vec2 uPondRadii;
        uniform float uPond2Active;
        uniform vec2 uPond2Center;
        uniform vec2 uPond2Radii;
        varying vec2 vGroundUv;
        varying vec3 vGroundWorldPos;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        vec2 tiledUV = vGroundUv * uTextureRepeat;

        float signedMeters = texture2D(uPathSdf, vGroundUv).r * (2.0 * uSdfRange) - uSdfRange;
        float edgeNoise = texture2D(uNoiseMap, vGroundUv * 6.0).r;
        float noiseBreakup = (edgeNoise - 0.5) * 0.5;
        float dirtH = texture2D(uDirtHeight, tiledUV).r;
        float heightBias = (dirtH - 0.5) * 0.4;
        float adjustedMeters = signedMeters + noiseBreakup + heightBias;

        float roadWeight = 1.0 - smoothstep(uRoadOffset - 0.15, uRoadOffset + 0.15, adjustedMeters);
        float grassWeight = smoothstep(uRoadOffset + uPathEdgeWidth * 0.4, uRoadOffset + uPathEdgeWidth, adjustedMeters);

        // Keep cobblestone road texture out of the river corridor
        float rz = vGroundWorldPos.z;
        float rx = 8.5 + 1.8 * sin(rz * 0.09) + 0.8 * cos(rz * 0.21);
        float distToRiver = abs(vGroundWorldPos.x - rx);

        // Away from the stone crossing (|rz| > 1.5): fade road completely away 3.4m from river center
        // At the stone crossing (|rz| <= 1.5): clear road inside the water channel (1.7m)
        float riverRoadMask = (abs(rz) > 1.5)
          ? smoothstep(2.30, 3.40, distToRiver)
          : smoothstep(1.65, 2.30, distToRiver);

        roadWeight *= riverRoadMask * uRoadActive;
        float coverWeight = (1.0 - grassWeight) * riverRoadMask * uRoadActive;
        grassWeight = mix(1.0, grassWeight, riverRoadMask * uRoadActive);
        float soilWeight = clamp(1.0 - roadWeight - grassWeight, 0.0, 1.0) * uRoadActive;

        vec3 grassRGB = texture2D(uGrassColor, tiledUV).rgb;
        vec3 roadRGBTex = texture2D(uDirtColor, tiledUV).rgb;

        // Path color override (e.g. soft sandy-lime for forest biome)
        float roadLum = dot(roadRGBTex, vec3(0.299, 0.587, 0.114));
        float pathNoise = texture2D(uNoiseMap, vGroundUv * 4.0 + vec2(0.17, 0.53)).r;
        vec3 pathOverride = uPathColorOverride * (roadLum * 0.25 + pathNoise * 0.08 + 0.78);
        vec3 roadRGB = mix(roadRGBTex, pathOverride, uUsePathOverride);

        // Biome ground override (Savannah, Arctic, Forest, etc.)
        float grassLum = dot(grassRGB, vec3(0.299, 0.587, 0.114));
        vec3 overrideGround = uGroundColorOverride * (grassLum * 0.22 + 0.88);

        // Savannah: Two-tone stylized sand dunes with hand-painted micro-relief & specks
        bool isSavannah = (uGroundColorOverride.r > 0.80 && uGroundColorOverride.g > 0.60 && uGroundColorOverride.b < 0.45);
        if (isSavannah) {
          // 1. Organic macro dune waves (combining two warm desert sand colors)
          float duneNoise = texture2D(uNoiseMap, vGroundUv * 2.8).r;
          float duneSweep = sin(vGroundWorldPos.x * 0.16 + vGroundWorldPos.z * 0.12 + duneNoise * 3.2) * 0.5 + 0.5;
          float duneFactor = smoothstep(0.12, 0.88, duneNoise * 0.60 + duneSweep * 0.40);

          vec3 sandBase = uGroundColorOverride;           // Warm golden sunlit sand (#FAC651)
          vec3 sandShade = uGroundColorSecondary;        // Rich warm amber / terracotta shaded dune (#D89236)
          vec3 twoToneSand = mix(sandShade, sandBase, duneFactor);

          // 2. Micro-relief & hand-painted stylized details from grassRGB (preserving brushstrokes and little ground sprigs from texture)
          float normLum = clamp((grassLum - 0.28) / 0.52, 0.0, 1.0);
          // Dark micro-tufts in texture become desert pebbles & dried sprig accents
          vec3 desertSpecks = vec3(0.55, 0.35, 0.14);
          vec3 texturedSand = mix(desertSpecks, twoToneSand, smoothstep(0.08, 0.30, grassLum));

          // Apply dune crest highlights & hollow shading relief — stronger contrast than before
          overrideGround = texturedSand * (normLum * 0.60 + 0.70);
        }

        vec3 finalGrassZone = mix(grassRGB, overrideGround, uUseGroundOverride);

        // Procedural mossy trampled soil color
        float soilNoise = texture2D(uNoiseMap, vGroundUv * 9.0 + vec2(0.31, 0.77)).r;
        float mossNoise = texture2D(uNoiseMap, vGroundUv * 3.5 + vec2(0.63, 0.19)).r;
        vec3 earthRGB = mix(vec3(0.604, 0.439, 0.314), vec3(0.490, 0.357, 0.255), soilNoise);
        vec3 desertSoil = mix(vec3(0.78, 0.62, 0.38), vec3(0.68, 0.52, 0.30), soilNoise);
        vec3 arcticSoil = mix(vec3(0.72, 0.75, 0.80), vec3(0.86, 0.88, 0.92), soilNoise);
        vec3 mysticSoil = mix(vec3(0.18, 0.35, 0.42), vec3(0.24, 0.45, 0.52), soilNoise);
        vec3 dungeonSoil = mix(vec3(0.14, 0.11, 0.16), vec3(0.20, 0.15, 0.22), soilNoise);
        // Forest biome with override: mossy vibrant-green soil for path transition zones
        vec3 forestOverrideSoil = mix(vec3(0.42, 0.58, 0.18), vec3(0.34, 0.50, 0.14), soilNoise);
        vec3 biomeSoil = desertSoil;
        if (dot(uGroundColorOverride, vec3(0.333)) > 0.85) {
          biomeSoil = arcticSoil;
        } else if (uGroundColorOverride.b > 0.40 && uGroundColorOverride.r < 0.25) {
          biomeSoil = mysticSoil;
        } else if (dot(uGroundColorOverride, vec3(0.333)) < 0.25) {
          biomeSoil = dungeonSoil;
        } else if (uGroundColorOverride.g > uGroundColorOverride.r * 1.15 && uGroundColorOverride.b < 0.35) {
          // Lime-green override (forest biome): use vibrant green soil
          biomeSoil = forestOverrideSoil;
        }
        vec3 forestSoil = mix(earthRGB, vec3(0.380, 0.640, 0.160), mossNoise * 0.80);
        vec3 soilRGB = mix(forestSoil, biomeSoil, uUseGroundOverride) * ((dirtH - 0.5) * 0.35 + 1.0);

        vec3 blendedColor = finalGrassZone * grassWeight + soilRGB * soilWeight + roadRGB * roadWeight;

        // Pond basin soil darkening (wet aquatic bed under water)
        vec2 pDiffFrag = vGroundWorldPos.xz - uPondCenter;
        float pDistHFrag = (pDiffFrag.x * 0.7071 - pDiffFrag.y * 0.7071) / max(0.1, uPondRadii.x);
        float pDistVFrag = (pDiffFrag.x * 0.7071 + pDiffFrag.y * 0.7071) / max(0.1, uPondRadii.y);
        float distToPondFrag = length(vec2(pDistHFrag, pDistVFrag));
        if (distToPondFrag < 1.12 && uPondActive > 0.5) {
          float pondBedWeight = 1.0 - smoothstep(0.78, 1.10, distToPondFrag);
          vec3 wetSiltColor = mix(vec3(0.24, 0.28, 0.22), vec3(0.18, 0.22, 0.19), soilNoise);
          blendedColor = mix(blendedColor, wetSiltColor, pondBedWeight * 0.92);
        }

        // Riverbed aquatic bed darkening under water
        if (uRiverActive > 0.5) {
          float riverBedWeight = 1.0 - smoothstep(1.35, 2.15, distToRiver);
          if (riverBedWeight > 0.0) {
            vec3 riverBedColor = mix(vec3(0.18, 0.26, 0.30), vec3(0.12, 0.18, 0.22), soilNoise);
            blendedColor = mix(blendedColor, riverBedColor, clamp(riverBedWeight * 0.90, 0.0, 1.0));
          }
        }

        float dirtAOSample = texture2D(uDirtAO, tiledUV).r;
        float aoFactor = mix(1.0, dirtAOSample, roadWeight);
        float grassOcclusion = mix(1.0 - uGrassAO * 0.35, 1.0, coverWeight);

        diffuseColor.rgb = blendedColor * aoFactor * grassOcclusion;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `
        float grassR = texture2D(uGrassRoughness, tiledUV).r;
        float roadR = texture2D(uDirtRoughness, tiledUV).r;
        float roughnessFactor = grassR * grassWeight + 0.95 * soilWeight + roadR * roadWeight;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <metalnessmap_fragment>',
        `
        float dirtMetal = texture2D(uDirtMetallic, tiledUV).r;
        float metalnessFactor = dirtMetal * roadWeight;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        #if defined( USE_NORMALMAP_TANGENTSPACE )
          vec3 grassN = texture2D(uGrassNormal, tiledUV).xyz * 2.0 - 1.0;
          vec3 roadN = texture2D(uDirtNormal, tiledUV).xyz * 2.0 - 1.0;
          vec3 mapN = mix(roadN, grassN, grassWeight);

          if (isSavannah) {
            float ripple = sin(vGroundWorldPos.x * 2.4 + vGroundWorldPos.z * 1.8 + texture2D(uNoiseMap, vGroundUv * 6.0).r * 2.5) * 0.32;
            mapN.x += ripple;
            mapN.xy *= 0.85;
          } else {
            mapN.xy *= 0.60;
          }
          normal = normalize( tbn * mapN );
        #endif
        `
      );
    };

    const groundGroup = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    groundGroup.add(mesh);

    // Elevated floating island cliff skirt beneath the meadow (continuous 4-sided closed perimeter)
    const cliffMesh = this._createCliffSkirt(this.textures, uniforms);
    groundGroup.add(cliffMesh);

    return groundGroup;
  }

  _createCliffSkirt(textures, uniforms) {
    const {
      dirtColor, dirtNormal, dirtRoughness,
      grassColor, noiseMap
    } = textures;

    const wallHeight = 18.0;
    const half = GROUND_SIZE / 2; // 40.0
    const taper = 2.0;
    const bottomHalf = half - taper; // 38.0
    const yTop = 0.02;
    const yBottom = -wallHeight;
    const uvFrequency = 0.25; // 1 tile every 4.0 meters (strictly uniform, zero stretching!)

    const segX = 20; // 20 segments along 80m wall (4m per segment)
    const segY = 6;  // 6 segments along 18m height (3m per segment)

    // 4 corners at top:
    // 0: NW (-half, -half)
    // 1: NE (+half, -half)
    // 2: SE (+half, +half)
    // 3: SW (-half, +half)
    const cornersTop = [
      new THREE.Vector3(-half, yTop, -half), // NW
      new THREE.Vector3(half, yTop, -half),  // NE
      new THREE.Vector3(half, yTop, half),   // SE
      new THREE.Vector3(-half, yTop, half)   // SW
    ];

    const cornersBottom = [
      new THREE.Vector3(-bottomHalf, yBottom, -bottomHalf), // NW
      new THREE.Vector3(bottomHalf, yBottom, -bottomHalf),  // NE
      new THREE.Vector3(bottomHalf, yBottom, bottomHalf),   // SE
      new THREE.Vector3(-bottomHalf, yBottom, bottomHalf)   // SW
    ];

    const positions = [];
    const uvs = [];
    const indices = [];

    // Build each of the 4 walls:
    // Wall 0: North (NW -> NE, faces -Z)
    // Wall 1: East  (NE -> SE, faces +X)
    // Wall 2: South (SE -> SW, faces +Z)
    // Wall 3: West  (SW -> NW, faces -X)
    for (let w = 0; w < 4; w++) {
      const nextW = (w + 1) % 4;
      const topStart = cornersTop[w];
      const topEnd = cornersTop[nextW];
      const botStart = cornersBottom[w];
      const botEnd = cornersBottom[nextW];

      const vertexOffset = positions.length / 3;

      for (let j = 0; j <= segY; j++) {
        const vRatio = j / segY; // 0 at bottom, 1 at top
        const y = THREE.MathUtils.lerp(yBottom, yTop, vRatio);
        const v = (y - yBottom) * uvFrequency;

        for (let i = 0; i <= segX; i++) {
          const uRatio = i / segX; // 0 at start, 1 at end
          const topP = new THREE.Vector3().lerpVectors(topStart, topEnd, uRatio);
          const botP = new THREE.Vector3().lerpVectors(botStart, botEnd, uRatio);
          const p = new THREE.Vector3().lerpVectors(botP, topP, vRatio);

          positions.push(p.x, p.y, p.z);
          const u = (uRatio * GROUND_SIZE) * uvFrequency;
          uvs.push(u, v);
        }
      }

      // Indices for this wall
      const rowVerts = segX + 1;
      for (let j = 0; j < segY; j++) {
        for (let i = 0; i < segX; i++) {
          const bl = vertexOffset + j * rowVerts + i;
          const br = vertexOffset + j * rowVerts + i + 1;
          const tl = vertexOffset + (j + 1) * rowVerts + i;
          const tr = vertexOffset + (j + 1) * rowVerts + i + 1;

          // Correct outward winding so normal points outward into world
          indices.push(bl, tl, br);
          indices.push(tl, tr, br);
        }
      }
    }

    const cliffGeo = new THREE.BufferGeometry();
    cliffGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    cliffGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    cliffGeo.setIndex(indices);
    cliffGeo.computeVertexNormals();

    const cliffUniforms = {
      uGrassColor: { value: grassColor },
      uNoiseMap: { value: noiseMap },
      uGroundColorOverride: uniforms.uGroundColorOverride,
      uUseGroundOverride: uniforms.uUseGroundOverride,
      uWallHeight: { value: wallHeight }
    };
    this.cliffUniforms = cliffUniforms;

    const cliffMat = new THREE.MeshStandardMaterial({
      map: dirtColor,
      normalMap: dirtNormal,
      roughnessMap: dirtRoughness,
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    cliffMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, cliffUniforms);

      shader.vertexShader = `
        varying vec3 vCliffWorldPos;
        varying vec2 vCliffUv;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vCliffWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vCliffUv = uv;
        `
      );

      shader.fragmentShader = `
        uniform sampler2D uGrassColor;
        uniform sampler2D uNoiseMap;
        uniform vec3 uGroundColorOverride;
        uniform float uUseGroundOverride;
        uniform float uWallHeight;
        varying vec3 vCliffWorldPos;
        varying vec2 vCliffUv;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>

        // 1. Natural grass overhang at the top rim (blends meadow grass into rock over top 0.8m)
        float noiseVal = texture2D(uNoiseMap, vCliffUv * 0.35).r;
        float overhangThreshold = -0.75 + (noiseVal - 0.5) * 0.45;
        float grassOverhang = smoothstep(overhangThreshold, 0.02, vCliffWorldPos.y);

        vec3 topGrassColor = texture2D(uGrassColor, vCliffUv * 2.0).rgb;
        topGrassColor = mix(topGrassColor, uGroundColorOverride * 0.9, uUseGroundOverride);

        // 2. Subtle geological sedimentary strata banding
        float strata = sin(vCliffWorldPos.y * 1.5 + noiseVal * 2.5) * 0.07;
        vec3 rockDiffuse = diffuseColor.rgb * (1.0 + strata);

        // 3. Biome-specific cliff tinting
        vec3 desertCliff = mix(rockDiffuse, vec3(0.82, 0.58, 0.34), 0.55);
        vec3 arcticCliff = mix(rockDiffuse, vec3(0.70, 0.74, 0.80), 0.50);
        vec3 mysticCliff = mix(rockDiffuse, vec3(0.35, 0.32, 0.48), 0.60);
        vec3 dungeonCliff = mix(rockDiffuse, vec3(0.24, 0.18, 0.22), 0.65);
        vec3 forestCliff = mix(rockDiffuse, vec3(0.32, 0.45, 0.18), 0.45);
        vec3 biomeCliff = desertCliff;
        if (dot(uGroundColorOverride, vec3(0.333)) > 0.85) {
          biomeCliff = arcticCliff;
        } else if (uGroundColorOverride.b > 0.40 && uGroundColorOverride.r < 0.25) {
          biomeCliff = mysticCliff;
        } else if (dot(uGroundColorOverride, vec3(0.333)) < 0.25) {
          biomeCliff = dungeonCliff;
        } else if (uGroundColorOverride.g > uGroundColorOverride.r * 1.15 && uGroundColorOverride.b < 0.35) {
          biomeCliff = forestCliff;
        }
        rockDiffuse = mix(rockDiffuse, biomeCliff, uUseGroundOverride);

        // 4. Blend rock with top grass overhang
        vec3 finalCliffColor = mix(rockDiffuse, topGrassColor, grassOverhang);

        // 5. Atmospheric depth gradient (darkens smoothly towards abyss at base of island)
        float depthGradient = smoothstep(-uWallHeight, -1.5, vCliffWorldPos.y);
        finalCliffColor *= mix(0.40, 1.0, depthGradient);

        // 6. Minimum ambient baseline to ensure shadowed cliff faces remain clearly visible
        finalCliffColor = max(finalCliffColor, rockDiffuse * 0.35);

        diffuseColor.rgb = finalCliffColor;
        `
      );
    };

    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.receiveShadow = true;
    cliffMesh.castShadow = true;
    this.cliffMesh = cliffMesh;
    this.cliffMat = cliffMat;

    return cliffMesh;
  }

  setGroundColorOverride(colorHex, enabled = true, secondaryColorHex = null) {
    if (!this.uniforms) return;
    if (colorHex) {
      this.uniforms.uGroundColorOverride.value.set(colorHex);
      if (this.cliffUniforms) {
        this.cliffUniforms.uGroundColorOverride.value.set(colorHex);
      }
    }
    if (secondaryColorHex && this.uniforms.uGroundColorSecondary) {
      this.uniforms.uGroundColorSecondary.value.set(secondaryColorHex);
    }
    this.uniforms.uUseGroundOverride.value = enabled ? 1.0 : 0.0;
    if (this.cliffUniforms) {
      this.cliffUniforms.uUseGroundOverride.value = enabled ? 1.0 : 0.0;
    }
  }

  setPathColorOverride(colorHex, enabled = true) {
    if (!this.uniforms) return;
    if (colorHex) {
      this.uniforms.uPathColorOverride.value.set(colorHex);
    }
    this.uniforms.uUsePathOverride.value = enabled ? 1.0 : 0.0;
  }

  setGrassAO(ao) {
    if (this.uniforms && this.uniforms.uGrassAO) {
      this.uniforms.uGrassAO.value = ao;
    }
  }

  updateParameters(params) {
    if (!this.uniforms) return;
    if (params.pathDepth !== undefined) this.uniforms.uPathDepth.value = params.pathDepth;
    if (params.dirtBump !== undefined) this.uniforms.uDirtBump.value = params.dirtBump;
    if (params.grassAO !== undefined) this.uniforms.uGrassAO.value = params.grassAO;
    if (params.pathEdgeWidth !== undefined) this.uniforms.uPathEdgeWidth.value = params.pathEdgeWidth;
    if (params.roadOffset !== undefined) this.uniforms.uRoadOffset.value = params.roadOffset;
  }

  setRiverActive(active) {
    if (this.uniforms && this.uniforms.uRiverActive) {
      this.uniforms.uRiverActive.value = active ? 1.0 : 0.0;
    }
  }

  setPondActive(active, center = null, radii = null) {
    if (this.uniforms && this.uniforms.uPondActive) {
      this.uniforms.uPondActive.value = active ? 1.0 : 0.0;
    }
    if (center && this.uniforms && this.uniforms.uPondCenter) {
      this.uniforms.uPondCenter.value.set(center.x, center.z);
    }
    if (radii && this.uniforms && this.uniforms.uPondRadii) {
      this.uniforms.uPondRadii.value.set(radii.x, radii.y);
    }
  }

  setPond2Active(active, center = null, radii = null) {
    if (this.uniforms && this.uniforms.uPond2Active) {
      this.uniforms.uPond2Active.value = active ? 1.0 : 0.0;
    }
    if (center && this.uniforms && this.uniforms.uPond2Center) {
      this.uniforms.uPond2Center.value.set(center.x, center.z);
    }
    if (radii && this.uniforms && this.uniforms.uPond2Radii) {
      this.uniforms.uPond2Radii.value.set(radii.x, radii.y);
    }
  }

  setRoadActive(active) {
    if (this.uniforms && this.uniforms.uRoadActive) {
      this.uniforms.uRoadActive.value = active ? 1.0 : 0.0;
    }
  }
}
