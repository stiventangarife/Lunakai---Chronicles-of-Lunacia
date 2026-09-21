// StylizedGrass.js - 5000 Instanced Grass Blades with GPU Wind & Path SDF Clearing
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import { GROUND_SIZE } from './PathSDF.js';

export class StylizedGrass {
  constructor(textures, config = {}) {
    this.textures = textures;
    this.config = {
      density: 12000,
      scale: 0.50,
      heightVariation: 0.44,
      heightNoiseScale: 0.15,
      rootColor: '#6aa14f',
      tipColor: '#a1cc33',
      rootColorB: '#74a022',
      tipColorB: '#e8e84f',
      colorVariation: 0.5,
      colorPatchScale: 0.7,
      macroVariation: 0.48,
      macroScale: 0.115,
      grassAO: 0.79,
      windStrength: 0.25,
      windSpeed: 2.70,
      windAngle: 45.0, // degrees
      gustScale: 0.50,
      turbulence: 0.42,
      flutter: 0.28,
      pathEdgeWidth: 0.65,
      roadOffset: 0.75,
      pathDepth: 0.25,
      translucency: 1.0,
      fresnel: 1.0,
      ...config
    };

    this.mesh = null;
    this.uniforms = null;
    this.bladeHeight = 0.6;
  }

  async load() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('./assets/stylized/grass-blades-up.glb');
    
    let baseGeometry = null;
    gltf.scene.traverse((o) => {
      if (!baseGeometry && o.isMesh) {
        baseGeometry = o.geometry;
      }
    });

    if (!baseGeometry) {
      throw new Error('[StylizedGrass] Could not find geometry in grass-blades-up.glb');
    }

    baseGeometry.computeBoundingBox();
    const box = baseGeometry.boundingBox;
    this.bladeHeight = box.max.y - box.min.y;

    this.mesh = this._createInstancedMesh(baseGeometry);
    return this.mesh;
  }

  _createInstancedMesh(baseGeometry) {
    const count = this.config.density;
    const geometry = baseGeometry.clone();

    // 1. Generate deterministic pseudo-random instance positions & yaw
    const aOrigin = new Float32Array(count * 2);
    const aFacing = new Float32Array(count * 2);
    const dummy = new THREE.Object3D();

    const instancedMesh = new THREE.InstancedMesh(geometry, null, count);
    instancedMesh.receiveShadow = true;
    instancedMesh.frustumCulled = false;

    // Golden ratio quasi-random distribution over GROUND_SIZE (40x40)
    for (let i = 0; i < count; i++) {
      const u1 = (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
      const u2 = (Math.cos(i * 37.719 + 11.23) * 24634.6345) % 1;
      const u3 = (Math.sin(i * 53.123 + 99.12) * 12345.6789) % 1;

      const x = ((u1 < 0 ? u1 + 1 : u1) - 0.5) * (GROUND_SIZE - 1.0);
      const z = ((u2 < 0 ? u2 + 1 : u2) - 0.5) * (GROUND_SIZE - 1.0);
      const yaw = (u3 < 0 ? u3 + 1 : u3) * Math.PI * 2;

      aOrigin[i * 2 + 0] = x;
      aOrigin[i * 2 + 1] = z;
      aFacing[i * 2 + 0] = Math.cos(yaw);
      aFacing[i * 2 + 1] = Math.sin(yaw);

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(this.config.scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(aOrigin, 2));
    geometry.setAttribute('aFacing', new THREE.InstancedBufferAttribute(aFacing, 2));

    // 2. Build Grass PBR Shader Material
    const { groundColorMap, noiseMap, pathSdf, dirtHeight } = this.textures;

    this.uniforms = {
      uTime: { value: 0 },
      uBladeHeight: { value: this.bladeHeight },
      uBladeScale: { value: this.config.scale },
      uHeightVariation: { value: this.config.heightVariation },
      uHeightNoiseScale: { value: this.config.heightNoiseScale },
      uRootColor: { value: new THREE.Color(this.config.rootColor) },
      uTipColor: { value: new THREE.Color(this.config.tipColor) },
      uRootColorB: { value: new THREE.Color(this.config.rootColorB) },
      uTipColorB: { value: new THREE.Color(this.config.tipColorB) },
      uColorVariation: { value: this.config.colorVariation },
      uColorPatchScale: { value: this.config.colorPatchScale },
      uMacroVariation: { value: this.config.macroVariation },
      uMacroScale: { value: this.config.macroScale },
      uGrassAO: { value: this.config.grassAO },
      uWindStrength: { value: this.config.windStrength },
      uWindSpeed: { value: this.config.windSpeed },
      uWindAngle: { value: (this.config.windAngle * Math.PI) / 180.0 },
      uGustScale: { value: this.config.gustScale },
      uTurbulence: { value: this.config.turbulence },
      uFlutter: { value: this.config.flutter },
      uPathEdgeWidth: { value: this.config.pathEdgeWidth },
      uRoadOffset: { value: this.config.roadOffset },
      uPathDepth: { value: this.config.pathDepth },
      uTranslucencyEnabled: { value: this.config.translucency },
      uFresnelEnabled: { value: this.config.fresnel },
      uSunPosition: { value: new THREE.Vector3(18, 16, 10).normalize() },
      uGroundColorMap: { value: groundColorMap },
      uNoiseMap: { value: noiseMap },
      uPathSdf: { value: pathSdf },
      uDirtHeight: { value: dirtHeight },
      uRiverActive: { value: 1.0 },
      uPondActive: { value: 1.0 },
      uRoadActive: { value: 1.0 },
      uPondCenter: { value: new THREE.Vector2(-30.3, 12.0) },
      uPondRadii: { value: new THREE.Vector2(4.1, 3.0) },
      uPond2Active: { value: 0.0 },
      uPond2Center: { value: new THREE.Vector2(3.7, -26.1) },
      uPond2Radii: { value: new THREE.Vector2(6.2, 4.6) }
    };

    const material = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = `
        attribute vec2 aOrigin;
        attribute vec2 aFacing;
        uniform float uTime;
        uniform float uBladeHeight;
        uniform float uBladeScale;
        uniform float uWindStrength;
        uniform float uWindSpeed;
        uniform float uWindAngle;
        uniform float uGustScale;
        uniform float uTurbulence;
        uniform float uFlutter;
        uniform float uPathEdgeWidth;
        uniform float uRoadOffset;
        uniform float uPathDepth;
        uniform float uHeightNoiseScale;
        uniform float uHeightVariation;
        uniform sampler2D uNoiseMap;
        uniform sampler2D uPathSdf;
        uniform sampler2D uDirtHeight;
        uniform float uRiverActive;
        uniform float uPondActive;
        uniform float uRoadActive;
        uniform vec2 uPondCenter;
        uniform vec2 uPondRadii;
        uniform float uPond2Active;
        uniform vec2 uPond2Center;
        uniform vec2 uPond2Radii;

        varying float vHeightAlongBlade;
        varying vec2 vGrassWorldXZ;
        varying float vInstanceIndex;
        varying vec3 vGrassWorldPos;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>

        vGrassWorldXZ = aOrigin;
        vInstanceIndex = float(gl_InstanceID);

        float scaledBladeHeight = uBladeHeight * uBladeScale;
        float heightAlongBlade = clamp(position.y / scaledBladeHeight, 0.0, 1.0);
        vHeightAlongBlade = heightAlongBlade;

        // 1. Wind Travelling Gust Front
        float bladeSeed = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
        float bladePhase = bladeSeed * 6.28318;
        float ampVar = 0.65 + fract(sin(float(gl_InstanceID) * 78.233 + 7.0) * 43758.5453) * 0.7;

        float wobble = sin(uTime * uWindSpeed * 0.6 + bladePhase) * uTurbulence * 0.4;
        float angle = uWindAngle + wobble;
        vec2 windDir = vec2(cos(angle), sin(angle));
        vec2 perpDir = vec2(-windDir.y, windDir.x);

        float along = dot(aOrigin, windDir);
        float noiseJitter = (texture2D(uNoiseMap, aOrigin * 0.03).r - 0.5) * 2.0;
        float gustPhase = along * uGustScale - uTime * uWindSpeed * 0.6 + noiseJitter * 1.5;
        float gust = pow(sin(gustPhase) * 0.5 + 0.5, 1.6);

        float chopPhase = along * (uGustScale * 2.7) - uTime * uWindSpeed * 1.3 + bladePhase;
        float chop = sin(chopPhase) * 0.5 + 0.5;

        float intensity = (0.25 + gust * 0.85 + chop * 0.18) * ampVar;
        float phi = clamp(uWindStrength * intensity * 3.0, 0.0, 1.6);

        // 2. Cantilever Circular Arc Bend
        float t = heightAlongBlade;
        float shaped = pow(t, 1.5);
        float a = phi * shaped;
        float safePhi = max(phi, 0.001);
        float R = scaledBladeHeight / safePhi;
        float uBend = R * (1.0 - cos(a));
        float dv = R * sin(a) - position.y;

        // 3. Tip Flutter
        float flutterMask = smoothstep(0.55, 1.0, t);
        float flutterPhase = uTime * 10.0 + bladePhase * 3.0 + along * 0.8;
        float flutterAmt = sin(flutterPhase) * uFlutter * 0.08 * flutterMask;

        vec2 horiz = windDir * uBend + perpDir * flutterAmt;
        float cosY = aFacing.x;
        float sinY = aFacing.y;
        vec3 localWindOffset = vec3(
          horiz.x * cosY - horiz.y * sinY,
          dv,
          horiz.x * sinY + horiz.y * cosY
        );

        // 4. Path Edge Culling & Shrink via SDF
        vec2 planeUV = vec2(aOrigin.x / 40.0 + 0.5, 0.5 - aOrigin.y / 40.0);
        float signedMeters = texture2D(uPathSdf, planeUV).r * 8.0 - 4.0;
        float edgeNoise = texture2D(uNoiseMap, planeUV * 6.0).r;
        float noiseBreakup = (edgeNoise - 0.5) * 0.5;
        float dirtH = texture2D(uDirtHeight, planeUV * 8.0).r;
        float adjustedMeters = signedMeters + noiseBreakup + (dirtH - 0.5) * 0.4;

        float grassWeight = smoothstep(uRoadOffset + uPathEdgeWidth * 0.4, uRoadOffset + uPathEdgeWidth, adjustedMeters);
        grassWeight = mix(1.0, grassWeight, uRoadActive);
        float coverWeight = (1.0 - grassWeight) * uRoadActive;

        float surviveRoll = fract(sin(float(gl_InstanceID) * 43.123 + 41.3) * 43758.5453);
        float alive = step(surviveRoll, grassWeight);
        float edgeScale = alive * smoothstep(0.0, 0.85, grassWeight);

        // 4b. Clear grass inside the river canyon
        float rz = aOrigin.y;
        float rx = 8.5 + 1.8 * sin(rz * 0.09) + 0.8 * cos(rz * 0.21);
        float distToRiver = abs(aOrigin.x - rx);
        float riverClear = mix(1.0, smoothstep(1.85, 2.45, distToRiver), uRiverActive);
        edgeScale *= riverClear;

        // 4c. Clear grass inside the active pond
        vec2 pOffset = aOrigin - uPondCenter;
        float pGrassH = (pOffset.x * 0.7071 - pOffset.y * 0.7071) / max(0.1, uPondRadii.x);
        float pGrassV = (pOffset.x * 0.7071 + pOffset.y * 0.7071) / max(0.1, uPondRadii.y);
        float distToPond = length(vec2(pGrassH, pGrassV));
        float pondClear = mix(1.0, smoothstep(0.85, 1.25, distToPond), uPondActive);
        edgeScale *= pondClear;

        // 4d. Clear grass inside the active secondary pond
        vec2 pOffset2 = aOrigin - uPond2Center;
        float pGrassH2 = (pOffset2.x * 0.7071 - pOffset2.y * 0.7071) / max(0.1, uPond2Radii.x);
        float pGrassV2 = (pOffset2.x * 0.7071 + pOffset2.y * 0.7071) / max(0.1, uPond2Radii.y);
        float distToPond2 = length(vec2(pGrassH2, pGrassV2));
        float pondClear2 = mix(1.0, smoothstep(0.85, 1.25, distToPond2), uPond2Active);
        edgeScale *= pondClear2;

        float pathSink = coverWeight * uPathDepth;

        // 5. Per-Clump Height Noise
        float hNoise = (texture2D(uNoiseMap, (aOrigin + vec2(53.0, 17.0)) * uHeightNoiseScale).r - 0.5) * 2.0;
        float heightFactor = clamp(1.0 + hNoise * uHeightVariation, 0.2, 1.8);

        vec3 swayed = position + localWindOffset;
        transformed = vec3(
          swayed.x * edgeScale,
          swayed.y * heightFactor * edgeScale - pathSink,
          swayed.z * edgeScale
        );

        vGrassWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader = `
        uniform vec3 uRootColor;
        uniform vec3 uTipColor;
        uniform vec3 uRootColorB;
        uniform vec3 uTipColorB;
        uniform float uColorVariation;
        uniform float uColorPatchScale;
        uniform float uMacroVariation;
        uniform float uMacroScale;
        uniform float uGrassAO;
        uniform float uTranslucencyEnabled;
        uniform float uFresnelEnabled;
        uniform vec3 uSunPosition;
        uniform sampler2D uGroundColorMap;
        uniform sampler2D uNoiseMap;

        varying float vHeightAlongBlade;
        varying vec2 vGrassWorldXZ;
        varying float vInstanceIndex;
        varying vec3 vGrassWorldPos;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        float gradT = pow(vHeightAlongBlade, 1.4);
        vec3 gradA = mix(uRootColor, uTipColor, gradT);
        vec3 gradB = mix(uRootColorB, uTipColorB, gradT);

        // Clump color variation patch
        float patchNoise = texture2D(uNoiseMap, vGrassWorldXZ * uColorPatchScale * 0.1).r;
        float patchBlend = clamp(patchNoise * uColorVariation, 0.0, 1.0);
        vec3 baseColor = mix(gradA, gradB, patchBlend);

        // Ground texture projection tint (soft subtle modulation so grass remains luminous)
        vec2 groundUV = (vGrassWorldXZ / 40.0 + 0.5) * 8.0;
        vec3 groundTint = texture2D(uGroundColorMap, groundUV).rgb;
        float projStrength = 0.18 * mix(1.0, 0.4, gradT);
        vec3 tinted = mix(baseColor, baseColor * groundTint, projStrength);

        // Brightness jitter
        float bSeed = fract(sin(vInstanceIndex * 13.37) * 43758.5453);
        float brightness = mix(0.85, 1.15, bSeed);

        // Macro field-wide illumination variation
        float macroNoise = texture2D(uNoiseMap, (vGrassWorldXZ + vec2(137.0, 91.0)) * uMacroScale * 0.05).r;
        float macroFactor = 1.0 + (macroNoise - 0.5) * 2.0 * uMacroVariation;

        // Ground contact ambient occlusion
        float aoFactor = mix(1.0 - uGrassAO, 1.0, smoothstep(0.05, 0.6, vHeightAlongBlade));

        diffuseColor.rgb = tinted * brightness * macroFactor * aoFactor;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>

        // Translucency & Fresnel Rim Emissive
        vec3 skyNormalWorld = vec3(0.0, 1.0, 0.0);
        vec3 sunDir = normalize(uSunPosition);
        vec3 viewDir = normalize(cameraPosition - vGrassWorldPos);

        // Back-scattering Translucency
        vec3 transLightDir = normalize(sunDir + skyNormalWorld * 0.5);
        float backLight = pow(max(dot(viewDir, -transLightDir), 0.0), 3.0);
        float thicknessMask = pow(vHeightAlongBlade, 1.5);
        vec3 translucencyColor = vec3(0.812, 0.878, 0.416); // #cfe06a
        vec3 translucency = translucencyColor * backLight * thicknessMask * 1.2 * uTranslucencyEnabled;

        // Fresnel Rim
        float fresnel = pow(max(1.0 - dot(skyNormalWorld, viewDir), 0.0), 4.0);
        vec3 fresnelColor = vec3(0.918, 0.949, 0.753); // #eaf2c0
        vec3 fresnelRim = fresnelColor * fresnel * 0.25 * uFresnelEnabled;

        totalEmissiveRadiance += translucency + fresnelRim;
        `
      );
    };

    instancedMesh.material = material;
    return instancedMesh;
  }

  setDensityFactor(factor) {
    if (this.mesh) {
      const clamped = Math.max(0.0, Math.min(1.0, factor));
      this.mesh.count = Math.floor(this.config.density * clamped);
    }
  }

  setScale(scale) {
    this.config.scale = scale;
    if (this.uniforms && this.uniforms.uBladeScale) {
      this.uniforms.uBladeScale.value = scale;
    }
    if (this.mesh) {
      const dummy = new THREE.Object3D();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const sc = new THREE.Vector3();
      for (let i = 0; i < this.config.density; i++) {
        this.mesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(pos, quat, sc);
        dummy.position.copy(pos);
        dummy.quaternion.copy(quat);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        this.mesh.setMatrixAt(i, dummy.matrix);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  setGrassAO(ao) {
    this.config.grassAO = ao;
    if (this.uniforms && this.uniforms.uGrassAO) {
      this.uniforms.uGrassAO.value = ao;
    }
  }

  update(delta) {
    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }

  updateParameters(params) {
    if (!this.uniforms) return;
    if (params.windStrength !== undefined) this.uniforms.uWindStrength.value = params.windStrength;
    if (params.windSpeed !== undefined) this.uniforms.uWindSpeed.value = params.windSpeed;
    if (params.windAngle !== undefined) this.uniforms.uWindAngle.value = (params.windAngle * Math.PI) / 180.0;
    if (params.gustScale !== undefined) this.uniforms.uGustScale.value = params.gustScale;
    if (params.turbulence !== undefined) this.uniforms.uTurbulence.value = params.turbulence;
    if (params.flutter !== undefined) this.uniforms.uFlutter.value = params.flutter;
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
