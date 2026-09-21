// MagicalSkybox.js - Dynamic Procedural Fantasy Celestial Sky Dome for Lunacia
import * as THREE from 'three';

export class MagicalSkybox {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.transitionTime = 0;
    this.transitionDuration = 1.5;
    this.isTransitioning = false;

    // Palette Definitions per Biome
    this.biomeThemes = {
      forest: {
        topColor: new THREE.Color(0x0c4a6e),      // Deep Sapphire Zenith
        midColor: new THREE.Color(0x38bdf8),      // Vibrant Cyan Anime Sky
        horizonColor: new THREE.Color(0xcbe5ff),  // Matches forest atmospheric fog
        voidColor: new THREE.Color(0x274e13),     // Earthy green-brown floor
        sunPosition: new THREE.Vector3(18, 16, 10),
        sunColor: new THREE.Color(0xfff1cf),     // Warm radiant daylight
        sunSize: 1.0,
        coronaIntensity: 0.45,
        coronaExponent: 12.0,
        starDensity: 0.08,                        // Subtle daylight fairy sparkles
        starBrightness: 0.5,
        cloudColor: new THREE.Color(0xffffff),
        cloudDensity: 0.42,
        cloudSpeed: 1.0,
        auroraIntensity: 0.0,
        auroraColorA: new THREE.Color(0x22c55e),
        auroraColorB: new THREE.Color(0x38bdf8)
      },
      savannah: {
        topColor: new THREE.Color(0x312e81),      // Twilight Indigo Zenith
        midColor: new THREE.Color(0xf97316),      // Fiery Golden Amber
        horizonColor: new THREE.Color(0xfef3c7),  // Warm golden sand haze
        voidColor: new THREE.Color(0x78350f),     // Desert earth
        sunPosition: new THREE.Vector3(16, 18, 9),
        sunColor: new THREE.Color(0xffedd5),     // Intense desert solar flare
        sunSize: 1.6,
        coronaIntensity: 0.85,
        coronaExponent: 7.0,
        starDensity: 0.05,
        starBrightness: 0.4,
        cloudColor: new THREE.Color(0xfef08a),    // Sun-baked golden clouds
        cloudDensity: 0.22,
        cloudSpeed: 1.4,
        auroraIntensity: 0.0,
        auroraColorA: new THREE.Color(0xf59e0b),
        auroraColorB: new THREE.Color(0xd97706)
      },
      arctic: {
        topColor: new THREE.Color(0x0f172a),      // Deep Crystalline Polar Void
        midColor: new THREE.Color(0x0284c7),      // Ice Glacial Blue
        horizonColor: new THREE.Color(0xdbeafe),  // Crystalline frost mist
        voidColor: new THREE.Color(0x1e293b),     // Glacial bedrock
        sunPosition: new THREE.Vector3(14, 18, 12),
        sunColor: new THREE.Color(0xe0f2fe),     // Pale cool silver-white sun
        sunSize: 0.9,
        coronaIntensity: 0.50,
        coronaExponent: 14.0,
        starDensity: 0.45,                        // High-altitude crisp winter stars
        starBrightness: 0.9,
        cloudColor: new THREE.Color(0xf1f5f9),    // Pale cirrus clouds
        cloudDensity: 0.30,
        cloudSpeed: 0.7,
        auroraIntensity: 0.75,                    // Shimmering Northern Lights (Aurora Borealis)
        auroraColorA: new THREE.Color(0x10b981),  // Emerald polar ribbon
        auroraColorB: new THREE.Color(0x06b6d4)   // Cyan astral curtain
      },
      mystic: {
        topColor: new THREE.Color(0x0a0614),      // Deep Astral Void Violet
        midColor: new THREE.Color(0x701a75),      // Dreamlike Radiant Orchid
        horizonColor: new THREE.Color(0x13273b),  // Matches mystic teal-slate fog
        voidColor: new THREE.Color(0x090514),     // Cosmic ground void
        sunPosition: new THREE.Vector3(14, 17, 10),
        sunColor: new THREE.Color(0xfbcfe8),     // Ethereal lavender moon
        sunSize: 1.3,
        coronaIntensity: 0.70,
        coronaExponent: 8.0,
        starDensity: 0.85,                        // Dense celestial starfield and stardust
        starBrightness: 1.2,
        cloudColor: new THREE.Color(0xd946ef),    // Iridescent nebula wisps
        cloudDensity: 0.48,
        cloudSpeed: 0.8,
        auroraIntensity: 0.90,                    // Cosmic astral auroras
        auroraColorA: new THREE.Color(0xec4899),  // Pink nebula wave
        auroraColorB: new THREE.Color(0x8b5cf6)   // Mystic violet ripple
      },
      dungeon: {
        topColor: new THREE.Color(0x060408),      // Pitch Obsidian Void
        midColor: new THREE.Color(0x271138),      // Ominous Muted Sulfur-Crimson
        horizonColor: new THREE.Color(0x181220),  // Deep catacomb ash fog
        voidColor: new THREE.Color(0x040205),     // Abyssal ground void
        sunPosition: new THREE.Vector3(12, 16, 9),
        sunColor: new THREE.Color(0xd8b4fe),     // Pale ghostly lunar eclipse
        sunSize: 0.8,
        coronaIntensity: 0.35,
        coronaExponent: 16.0,
        starDensity: 0.20,                        // Faint cursed embers in the void
        starBrightness: 0.6,
        cloudColor: new THREE.Color(0x1f162b),    // Heavy dark smog clouds
        cloudDensity: 0.60,
        cloudSpeed: 0.5,
        auroraIntensity: 0.35,                    // Eerie sulfur spectral glow
        auroraColorA: new THREE.Color(0x7e22ce),  // Dark purple rift
        auroraColorB: new THREE.Color(0xb91c1c)   // Smoldering blood-red undertone
      }
    };

    // Current State
    this.currentBiomeId = 'forest';
    const initialTheme = this.biomeThemes.forest;

    // Working Colors & Floats for dynamic lerp
    this.currentTop = initialTheme.topColor.clone();
    this.currentMid = initialTheme.midColor.clone();
    this.currentHorizon = initialTheme.horizonColor.clone();
    this.currentVoid = initialTheme.voidColor.clone();
    this.currentSunColor = initialTheme.sunColor.clone();
    this.currentSunPos = initialTheme.sunPosition.clone();
    this.currentCloudColor = initialTheme.cloudColor.clone();
    this.currentAuroraA = initialTheme.auroraColorA.clone();
    this.currentAuroraB = initialTheme.auroraColorB.clone();

    this.currentSunSize = initialTheme.sunSize;
    this.currentCorona = initialTheme.coronaIntensity;
    this.currentCoronaExp = initialTheme.coronaExponent;
    this.currentStarDensity = initialTheme.starDensity;
    this.currentStarBrightness = initialTheme.starBrightness;
    this.currentCloudDensity = initialTheme.cloudDensity;
    this.currentCloudSpeed = initialTheme.cloudSpeed;
    this.currentAurora = initialTheme.auroraIntensity;

    // Transition Source & Target
    this.srcTheme = initialTheme;
    this.dstTheme = initialTheme;

    this.mesh = this._createSkyMesh();
    this.scene.add(this.mesh);
  }

  _createSkyMesh() {
    const vertexShader = `
      varying vec3 vWorldPosition;
      varying vec3 vLocalDirection;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vLocalDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uVoidColor;

      uniform vec3 uSunPosition;
      uniform vec3 uSunColor;
      uniform float uSunSize;
      uniform float uCoronaIntensity;
      uniform float uCoronaExponent;

      uniform float uStarDensity;
      uniform float uStarBrightness;

      uniform vec3 uCloudColor;
      uniform float uCloudDensity;
      uniform float uCloudSpeed;

      uniform float uAuroraIntensity;
      uniform vec3 uAuroraColorA;
      uniform vec3 uAuroraColorB;

      varying vec3 vWorldPosition;
      varying vec3 vLocalDirection;

      // Hash function for celestial stars
      float hash31(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 dir = vLocalDirection;

        // 1. Atmospheric Vertical Gradient (calibrated for elevated isometric camera)
        float horizonY = -0.32;
        vec3 skyColor;
        if (dir.y >= horizonY) {
          float t = clamp((dir.y - horizonY) / 0.75, 0.0, 1.0);
          float blendUpper = smoothstep(0.18, 0.78, t);
          float blendLower = smoothstep(0.00, 0.28, t);
          vec3 midToTop = mix(uMidColor, uTopColor, blendUpper);
          skyColor = mix(uHorizonColor, midToTop, blendLower);
        } else {
          float tGround = clamp((horizonY - dir.y) / 0.38, 0.0, 1.0);
          skyColor = mix(uHorizonColor, uVoidColor, tGround);
        }

        // 2. Solar/Lunar Celestial Core & Corona
        vec3 sunDir = normalize(uSunPosition);
        float sunDot = max(dot(dir, sunDir), 0.0);
        
        float corona = pow(sunDot, uCoronaExponent) * uCoronaIntensity;
        float sunCore = smoothstep(0.9982 - (uSunSize * 0.0028), 1.0, sunDot) * 2.2;
        float mieScatter = pow(sunDot, 4.0) * 0.28;
        vec3 celestialGlow = uSunColor * (corona + sunCore + mieScatter);

        // 3. Twinkling Stars & Cosmic Motes
        vec3 stars = vec3(0.0);
        if (dir.y > (horizonY + 0.15) && uStarDensity > 0.005) {
          vec3 starCell = floor(dir * 180.0);
          vec3 starFrac = fract(dir * 180.0) - 0.5;
          float h = hash31(starCell);
          if (h > (1.0 - uStarDensity * 0.015)) {
            float dist = length(starFrac);
            float twinkle = 0.55 + 0.45 * sin(uTime * 3.2 + h * 62.83);
            float starLight = smoothstep(0.26, 0.02, dist) * twinkle * uStarBrightness;
            stars = vec3(starLight) * mix(vec3(1.0), uMidColor, 0.35);
          }
        }

        // 4. Aurora Borealis / Mystic Astral Ribbons
        vec3 auroraGlow = vec3(0.0);
        if (uAuroraIntensity > 0.01 && dir.y > (horizonY + 0.18)) {
          float wave1 = sin(dir.x * 6.5 + dir.z * 4.2 + uTime * 0.55) * 0.5 + 0.5;
          float wave2 = sin(dir.x * 11.2 - dir.z * 7.8 + uTime * 0.85) * 0.5 + 0.5;
          float ribbon = pow(wave1 * wave2, 2.2) * smoothstep(horizonY + 0.18, 0.35, dir.y) * smoothstep(0.88, 0.48, dir.y);
          vec3 waveColor = mix(uAuroraColorA, uAuroraColorB, wave1);
          auroraGlow = waveColor * ribbon * uAuroraIntensity;
        }

        // 5. Stylized Fluffy Clouds Layer
        float cloudAlpha = 0.0;
        if (dir.y > (horizonY + 0.10) && uCloudDensity > 0.01) {
          vec2 cUV = dir.xz / (dir.y - horizonY + 0.22) * 0.14 + vec2(uTime * uCloudSpeed * 0.006, uTime * uCloudSpeed * 0.003);
          float n1 = sin(cUV.x * 5.2) * cos(cUV.y * 5.2);
          float n2 = sin(cUV.x * 12.4 + 1.8) * cos(cUV.y * 12.4 + 2.1) * 0.45;
          float cloudShape = (n1 + n2) * 0.5 + 0.5;
          float threshold = 1.0 - (uCloudDensity * 0.58);
          cloudAlpha = smoothstep(threshold, 1.0, cloudShape) * smoothstep(horizonY + 0.10, 0.25, dir.y) * 0.70;
          vec3 cloudLit = mix(uCloudColor * 0.80, uCloudColor * 1.35, sunDot * 0.5 + 0.5);
          skyColor = mix(skyColor, cloudLit, cloudAlpha);
        }

        vec3 finalOutput = skyColor + celestialGlow + stars + auroraGlow;
        gl_FragColor = vec4(finalOutput, 1.0);
      }
    `;

    this.uniforms = {
      uTime: { value: 0 },
      uTopColor: { value: this.currentTop },
      uMidColor: { value: this.currentMid },
      uHorizonColor: { value: this.currentHorizon },
      uVoidColor: { value: this.currentVoid },

      uSunPosition: { value: this.currentSunPos },
      uSunColor: { value: this.currentSunColor },
      uSunSize: { value: this.currentSunSize },
      uCoronaIntensity: { value: this.currentCorona },
      uCoronaExponent: { value: this.currentCoronaExp },

      uStarDensity: { value: this.currentStarDensity },
      uStarBrightness: { value: this.currentStarBrightness },

      uCloudColor: { value: this.currentCloudColor },
      uCloudDensity: { value: this.currentCloudDensity },
      uCloudSpeed: { value: this.currentCloudSpeed },

      uAuroraIntensity: { value: this.currentAurora },
      uAuroraColorA: { value: this.currentAuroraA },
      uAuroraColorB: { value: this.currentAuroraB }
    };

    const skyGeo = new THREE.SphereGeometry(380, 36, 24);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(skyGeo, skyMat);
    mesh.name = 'MagicalSkyboxMesh';
    return mesh;
  }

  setBiome(biomeId, duration = 1.5) {
    const target = this.biomeThemes[biomeId] || this.biomeThemes.forest;
    if (this.currentBiomeId === biomeId && !this.isTransitioning) return;

    this.srcTheme = {
      topColor: this.currentTop.clone(),
      midColor: this.currentMid.clone(),
      horizonColor: this.currentHorizon.clone(),
      voidColor: this.currentVoid.clone(),
      sunColor: this.currentSunColor.clone(),
      sunPosition: this.currentSunPos.clone(),
      cloudColor: this.currentCloudColor.clone(),
      auroraColorA: this.currentAuroraA.clone(),
      auroraColorB: this.currentAuroraB.clone(),
      sunSize: this.currentSunSize,
      coronaIntensity: this.currentCorona,
      coronaExponent: this.currentCoronaExp,
      starDensity: this.currentStarDensity,
      starBrightness: this.currentStarBrightness,
      cloudDensity: this.currentCloudDensity,
      cloudSpeed: this.currentCloudSpeed,
      auroraIntensity: this.currentAurora
    };

    this.dstTheme = target;
    this.currentBiomeId = biomeId;
    this.transitionDuration = duration;
    this.transitionTime = 0;
    this.isTransitioning = true;

    console.log(`[MagicalSkybox] Transitioning celestial sky to: ${biomeId}`);
  }

  update(dt, camera = null) {
    this.time += dt;
    this.uniforms.uTime.value = this.time;

    // Follow camera position so skybox represents an infinite magical dome
    if (camera && this.mesh) {
      this.mesh.position.copy(camera.position);
    }

    // Keep scene background color harmonized with horizon haze
    if (this.scene) {
      if (!this.scene.background || !this.scene.background.isColor) {
        this.scene.background = new THREE.Color();
      }
      this.scene.background.copy(this.currentHorizon);
    }

    // Dynamic Biome Transition Lerp
    if (this.isTransitioning) {
      this.transitionTime += dt;
      const progress = Math.min(1.0, this.transitionTime / this.transitionDuration);
      // Smoothstep interpolation
      const t = progress * progress * (3.0 - 2.0 * progress);

      this.currentTop.copy(this.srcTheme.topColor).lerp(this.dstTheme.topColor, t);
      this.currentMid.copy(this.srcTheme.midColor).lerp(this.dstTheme.midColor, t);
      this.currentHorizon.copy(this.srcTheme.horizonColor).lerp(this.dstTheme.horizonColor, t);
      this.currentVoid.copy(this.srcTheme.voidColor).lerp(this.dstTheme.voidColor, t);
      this.currentSunColor.copy(this.srcTheme.sunColor).lerp(this.dstTheme.sunColor, t);
      this.currentSunPos.copy(this.srcTheme.sunPosition).lerp(this.dstTheme.sunPosition, t);
      this.currentCloudColor.copy(this.srcTheme.cloudColor).lerp(this.dstTheme.cloudColor, t);
      this.currentAuroraA.copy(this.srcTheme.auroraColorA).lerp(this.dstTheme.auroraColorA, t);
      this.currentAuroraB.copy(this.srcTheme.auroraColorB).lerp(this.dstTheme.auroraColorB, t);

      this.currentSunSize = THREE.MathUtils.lerp(this.srcTheme.sunSize, this.dstTheme.sunSize, t);
      this.currentCorona = THREE.MathUtils.lerp(this.srcTheme.coronaIntensity, this.dstTheme.coronaIntensity, t);
      this.currentCoronaExp = THREE.MathUtils.lerp(this.srcTheme.coronaExponent, this.dstTheme.coronaExponent, t);
      this.currentStarDensity = THREE.MathUtils.lerp(this.srcTheme.starDensity, this.dstTheme.starDensity, t);
      this.currentStarBrightness = THREE.MathUtils.lerp(this.srcTheme.starBrightness, this.dstTheme.starBrightness, t);
      this.currentCloudDensity = THREE.MathUtils.lerp(this.srcTheme.cloudDensity, this.dstTheme.cloudDensity, t);
      this.currentCloudSpeed = THREE.MathUtils.lerp(this.srcTheme.cloudSpeed, this.dstTheme.cloudSpeed, t);
      this.currentAurora = THREE.MathUtils.lerp(this.srcTheme.auroraIntensity, this.dstTheme.auroraIntensity, t);

      this.uniforms.uSunSize.value = this.currentSunSize;
      this.uniforms.uCoronaIntensity.value = this.currentCorona;
      this.uniforms.uCoronaExponent.value = this.currentCoronaExp;
      this.uniforms.uStarDensity.value = this.currentStarDensity;
      this.uniforms.uStarBrightness.value = this.currentStarBrightness;
      this.uniforms.uCloudDensity.value = this.currentCloudDensity;
      this.uniforms.uCloudSpeed.value = this.currentCloudSpeed;
      this.uniforms.uAuroraIntensity.value = this.currentAurora;

      if (progress >= 1.0) {
        this.isTransitioning = false;
      }
    }
  }

  destroy() {
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
  }
}
