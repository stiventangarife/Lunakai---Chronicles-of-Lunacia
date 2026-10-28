// EnvironmentSystem.js - Centralized Environment Coordinator for Overworld Visuals, Lighting, Atmosphere, Shadows, Presets & Post-Processing
import * as THREE from 'three';
import { LightingManager } from './demo_scena/LightingManager.js';
import { EffectComposer } from '../../../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../../../vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../../vendor/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../../vendor/postprocessing/OutputPass.js';

export const ENVIRONMENT_PRESETS = {
  // Primary Preset: Handcrafted for Macro-Zone [2, 2] (Dojo Valley / Forest of Lunacia)
  dojo_day: {
    id: 'dojo_day',
    name: 'Dojo Valley - Radiant Daylight',
    sun: {
      color: 0xfff2d6,            // Warm golden sunlight
      intensity: 2.95,            // Balanced to prevent terrain blowout while giving rich specular highlights
      offset: [22.0, 26.0, 14.0], // Oblique ~52° directional angle for dramatic, readable tree & building shadows
      shadow: {
        mapSize: 2048,
        boxSize: 24.0,            // 48x48m frustum focused around camera target (~43 texels/meter)
        near: 0.5,
        far: 90.0,
        bias: -0.00012,
        normalBias: 0.035
      }
    },
    hemi: {
      sky: 0xbedaf5,              // Desaturated anime sky blue (slightly cool fill in shadows)
      ground: 0x445f32,           // Rich warm moss-green bounce from grass/soil
      intensity: 0.92             // Produces "warm sunlight + cool blue/green shadows" without dark black areas
    },
    fog: {
      color: 0xcde4f7,            // Atmospheric sky-blue haze harmonizing with skybox horizon
      density: 0.0030             // Clear up close (96%+ at 20m), gentle depth falloff in far background
    },
    sky: {
      topColor: 0x18608d,         // Soft, slightly desaturated fantasy anime zenith
      midColor: 0x4ebce8,         // Vibrant anime sky transition
      horizonColor: 0xcde4f7,     // Seamless blend with atmospheric fog
      voidColor: 0x2a441e,        // Earthy green ground void
      sunPosition: [22.0, 26.0, 14.0],
      sunColor: 0xfff6e0,
      sunSize: 1.15,
      coronaIntensity: 0.48,
      coronaExponent: 10.0,
      starDensity: 0.04,
      cloudColor: 0xffffff,
      cloudDensity: 0.38,
      cloudSpeed: 0.9
    },
    exposure: 1.06,
    bloom: {
      enabled: true,
      strength: 0.20,             // Subtle, ethereal glow on emissive items
      radius: 0.30,
      threshold: 0.85             // High threshold: ignores regular ground/grass; illuminates lanterns, torch flames, water glints
    },
    water: {
      shallowColor: '#3cd4f0',
      deepColor: '#1466a3',
      foamColor: '#eafcff'
    }
  },

  forest_day: {
    id: 'forest_day',
    name: 'Forest of Lunacia - Deep Canopy Day',
    sun: {
      color: 0xfffae8,
      intensity: 2.90,
      offset: [18.0, 24.0, 10.0],
      shadow: {
        mapSize: 2048,
        boxSize: 24.0,
        near: 0.5,
        far: 85.0,
        bias: -0.00012,
        normalBias: 0.035
      }
    },
    hemi: {
      sky: 0xc5e2f7,
      ground: 0x3d5e2d,
      intensity: 0.95
    },
    fog: {
      color: 0xd0e8fa,
      density: 0.0032
    },
    sky: {
      topColor: 0x0c4a6e,
      midColor: 0x38bdf8,
      horizonColor: 0xcbe5ff,
      voidColor: 0x274e13,
      sunPosition: [18.0, 24.0, 10.0],
      sunColor: 0xfff1cf,
      sunSize: 1.0,
      coronaIntensity: 0.45,
      coronaExponent: 12.0,
      starDensity: 0.06,
      cloudColor: 0xffffff,
      cloudDensity: 0.42,
      cloudSpeed: 1.0
    },
    exposure: 1.05,
    bloom: {
      enabled: true,
      strength: 0.18,
      radius: 0.28,
      threshold: 0.86
    },
    water: {
      shallowColor: '#38d1ee',
      deepColor: '#14649c',
      foamColor: '#eafcff'
    }
  },

  sunset: {
    id: 'sunset',
    name: 'Lunacia - Warm Amber Twilight',
    sun: {
      color: 0xffa04d,
      intensity: 3.30,
      offset: [24.0, 8.5, 14.0],
      shadow: {
        mapSize: 2048,
        boxSize: 26.0,
        near: 0.5,
        far: 90.0,
        bias: -0.00015,
        normalBias: 0.040
      }
    },
    hemi: {
      sky: 0xfdbfa1,
      ground: 0x54361e,
      intensity: 0.88
    },
    fog: {
      color: 0xfcd3b0,
      density: 0.0038
    },
    sky: {
      topColor: 0x1e2640,
      midColor: 0xfb923c,
      horizonColor: 0xfcd3b0,
      voidColor: 0x2d1f14,
      sunPosition: [24.0, 8.5, 14.0],
      sunColor: 0xffedd5,
      sunSize: 1.35,
      coronaIntensity: 0.65,
      coronaExponent: 8.0,
      starDensity: 0.06,
      cloudColor: 0xfed7aa,
      cloudDensity: 0.35,
      cloudSpeed: 0.8
    },
    exposure: 1.15,
    bloom: {
      enabled: true,
      strength: 0.80,
      radius: 0.42,
      threshold: 0.82
    },
    water: {
      shallowColor: '#f97316',
      deepColor: '#7c2d12',
      foamColor: '#ffedd5'
    }
  },

  night: {
    id: 'night',
    name: 'Lunacia - Mystical Moonlit Night',
    sun: {
      color: 0x7eb0db,            // Cool silvery-blue lunar directional light
      intensity: 0.95,
      offset: [16.0, 24.0, 10.0],
      shadow: {
        mapSize: 2048,
        boxSize: 24.0,
        near: 0.5,
        far: 85.0,
        bias: -0.00012,
        normalBias: 0.035
      }
    },
    hemi: {
      sky: 0x182638,              // Deep midnight blue
      ground: 0x0f1810,           // Dark moss
      intensity: 0.68
    },
    fog: {
      color: 0x0f1a26,
      density: 0.0045
    },
    sky: {
      topColor: 0x070e17,
      midColor: 0x152233,
      horizonColor: 0x0f1a26,
      voidColor: 0x06090c,
      sunPosition: [16.0, 24.0, 10.0],
      sunColor: 0xdbeafe,
      sunSize: 0.95,
      coronaIntensity: 0.55,
      coronaExponent: 10.0,
      starDensity: 0.55,
      cloudColor: 0x1e293b,
      cloudDensity: 0.30,
      cloudSpeed: 0.6
    },
    exposure: 1.02,
    bloom: {
      enabled: true,
      strength: 0.35,             // Stronger bloom on lanterns and glowing torches at night
      radius: 0.40,
      threshold: 0.78
    },
    water: {
      shallowColor: '#1e3a5f',
      deepColor: '#091526',
      foamColor: '#93c5fd'
    }
  }
};

export class EnvironmentSystem {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.scene = overworldManager.scene;
    this.camera = overworldManager.camera;
    this.renderer = overworldManager.renderer;

    this.currentPresetId = 'dojo_day';
    this.currentPreset = ENVIRONMENT_PRESETS.dojo_day;

    this.sunLight = null;
    this.hemiLight = null;
    this.sunTarget = new THREE.Object3D();
    this.sunTarget.name = 'EnvironmentSunTarget';
    this.scene.add(this.sunTarget);

    // Post-processing pipeline
    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.outputPass = null;
    this.isPostProcessingActive = true;

    // Contact tracking
    this.activeLookAt = new THREE.Vector3(0, 0, 0);
    this._onResizeBound = this.onResize.bind(this);
  }

  init() {
    console.log('[EnvironmentSystem] Initializing Visual Polish Coordinator & Presets...');

    // 1. Color Management & Tone Mapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.currentPreset.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Locate or create Sun & Hemisphere Lights
    this._findOrCreateLights();

    // 3. Setup Post-Processing (EffectComposer with subtle bloom & color grading)
    this.initPostProcessing();

    // 4. Apply Default Preset (Dojo Day)
    this.setPreset('dojo_day');

    // 5. Window resize listener
    window.addEventListener('resize', this._onResizeBound);
    console.log('[EnvironmentSystem] Initialized successfully with DOJO_DAY preset.');
  }

  _findOrCreateLights() {
    // Check if stylizedEnv already created lights
    this.scene.traverse((obj) => {
      if (!this.sunLight && obj.isDirectionalLight) {
        this.sunLight = obj;
      }
      if (!this.hemiLight && obj.isHemisphereLight) {
        this.hemiLight = obj;
      }
    });

    // Create Directional Sun if missing
    if (!this.sunLight) {
      this.sunLight = new THREE.DirectionalLight(0xfff2d6, 2.95);
      this.sunLight.name = 'EnvironmentSunLight';
      this.sunLight.castShadow = true;
      this.scene.add(this.sunLight);
    }

    // Configure high-fidelity soft shadow map on sun light
    this.sunLight.castShadow = true;
    this.sunLight.target = this.sunTarget;
    const shadow = this.sunLight.shadow;
    const sConf = this.currentPreset.sun.shadow;
    shadow.mapSize.width = sConf.mapSize;
    shadow.mapSize.height = sConf.mapSize;
    shadow.camera.near = sConf.near;
    shadow.camera.far = sConf.far;
    shadow.camera.left = -sConf.boxSize;
    shadow.camera.right = sConf.boxSize;
    shadow.camera.top = sConf.boxSize;
    shadow.camera.bottom = -sConf.boxSize;
    shadow.bias = sConf.bias;
    shadow.normalBias = sConf.normalBias;

    // Create Hemisphere Light if missing
    if (!this.hemiLight) {
      this.hemiLight = new THREE.HemisphereLight(0xbedaf5, 0x445f32, 0.92);
      this.hemiLight.name = 'EnvironmentHemiLight';
      this.hemiLight.position.set(0, 50, 0);
      this.scene.add(this.hemiLight);
    }
  }

  initPostProcessing() {
    try {
      this.composer = new EffectComposer(this.renderer);

      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      const width = window.innerWidth;
      const height = window.innerHeight;
      const bConf = this.currentPreset.bloom;

      // Rendimiento (23-oct): el brillo se calcula a media resolución (~1–1,5 ms menos de tarjeta gráfica).
      // Es un halo difuso: a media resolución apenas cambia. setSize se adapta antes de añadir el pase,
      // porque el composer lo llama al añadirlo y en cada cambio de tamaño de la ventana.
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.max(1, Math.round(width / 2)), Math.max(1, Math.round(height / 2))),
        bConf.strength,
        bConf.radius,
        bConf.threshold
      );
      const bloomSetSize = this.bloomPass.setSize.bind(this.bloomPass);
      this.bloomPass.setSize = (w, h) => bloomSetSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
      this.composer.addPass(this.bloomPass);

      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);

      this.isPostProcessingActive = true;
      console.log('[EnvironmentSystem] Post-processing EffectComposer pipeline attached successfully.');
    } catch (err) {
      console.warn('[EnvironmentSystem] Failed to initialize EffectComposer, falling back to standard WebGL renderer:', err);
      this.isPostProcessingActive = false;
      this.composer = null;
    }
  }

  setBloomEnabled(enabled) {
    if (this.bloomPass) {
      this.bloomPass.enabled = enabled;
    }
  }

  setBloomStrength(strength) {
    if (this.bloomPass) {
      this.bloomPass.strength = strength;
    }
  }

  setPreset(presetId) {
    const preset = ENVIRONMENT_PRESETS[presetId] || ENVIRONMENT_PRESETS.dojo_day;
    this.currentPresetId = preset.id;
    this.currentPreset = preset;

    // Si la macro-zona [2, 2] de Demo_Scena está activa, respetar su iluminación y niebla dedicadas
    if (this.om && this.om.demoScenaZone && this.om.demoScenaZone.isActive) {
      if (this.sunLight) this.sunLight.visible = false;
      if (this.hemiLight) this.hemiLight.visible = false;
      if (this.scene) this.scene.background = null;
      if (this.bloomPass) {
        this.bloomPass.enabled = true;
        this.bloomPass.strength = 0.80;
        this.bloomPass.radius = 0.42;
        this.bloomPass.threshold = 0.82;
      }
      return preset;
    }

    console.log(`[EnvironmentSystem] 🎨 Applying preset: ${preset.name} (${preset.id})`);

    // 1. Sun Directional Light
    if (this.sunLight) {
      this.sunLight.color.set(preset.sun.color);
      this.sunLight.intensity = preset.sun.intensity;
      const shadow = this.sunLight.shadow;
      const sConf = preset.sun.shadow;
      shadow.bias = sConf.bias;
      shadow.normalBias = sConf.normalBias;
      shadow.camera.left = -sConf.boxSize;
      shadow.camera.right = sConf.boxSize;
      shadow.camera.top = sConf.boxSize;
      shadow.camera.bottom = -sConf.boxSize;
      shadow.camera.updateProjectionMatrix();
    }

    // 2. Hemisphere Light
    if (this.hemiLight) {
      this.hemiLight.color.set(preset.hemi.sky);
      this.hemiLight.groundColor.set(preset.hemi.ground);
      this.hemiLight.intensity = preset.hemi.intensity;
    }

    // 3. Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(preset.fog.color, preset.fog.density);

    // 4. Tone Mapping Exposure
    if (this.renderer) {
      this.renderer.toneMappingExposure = preset.exposure;
    }

    // 5. Skybox Coordination (MagicalSkybox)
    if (this.om.magicalSkybox) {
      this._applySkyboxTheme(preset.sky);
    }

    // 6. Post-Processing Bloom adjustments
    if (this.bloomPass && preset.bloom) {
      this.bloomPass.enabled = preset.bloom.enabled;
      this.bloomPass.strength = preset.bloom.strength;
      this.bloomPass.radius = preset.bloom.radius;
      this.bloomPass.threshold = preset.bloom.threshold;
    }

    // 7. Water Shaders Coordination (River & Ponds)
    this._syncWater(preset);

    // 8. Grass Backlight Direction
    if (this.om.stylizedEnv && this.om.stylizedEnv.grass && this.om.stylizedEnv.grass.uniforms) {
      const u = this.om.stylizedEnv.grass.uniforms;
      if (u.uSunPosition) {
        u.uSunPosition.value.set(...preset.sun.offset).normalize();
      }
    }

    return preset;
  }

  _applySkyboxTheme(skyDef) {
    const sky = this.om.magicalSkybox;
    if (!sky) return;

    // Direct uniform injection for immediate responsive visual transition
    if (sky.uniforms) {
      const u = sky.uniforms;
      if (u.uTopColor) u.uTopColor.value.set(skyDef.topColor);
      if (u.uMidColor) u.uMidColor.value.set(skyDef.midColor);
      if (u.uHorizonColor) u.uHorizonColor.value.set(skyDef.horizonColor);
      if (u.uVoidColor) u.uVoidColor.value.set(skyDef.voidColor);
      if (u.uSunColor) u.uSunColor.value.set(skyDef.sunColor);
      if (u.uSunPosition) u.uSunPosition.value.set(...skyDef.sunPosition).normalize();
      if (u.uCloudColor) u.uCloudColor.value.set(skyDef.cloudColor);
      if (u.uSunSize) u.uSunSize.value = skyDef.sunSize;
      if (u.uCoronaIntensity) u.uCoronaIntensity.value = skyDef.coronaIntensity;
      if (u.uCoronaExponent) u.uCoronaExponent.value = skyDef.coronaExponent;
      if (u.uCloudDensity) u.uCloudDensity.value = skyDef.cloudDensity;
      if (u.uCloudSpeed) u.uCloudSpeed.value = skyDef.cloudSpeed;
      if (u.uStarDensity) u.uStarDensity.value = skyDef.starDensity;
    }

    // Harmonize scene background color with horizon fog
    if (this.scene) {
      if (!this.scene.background || !this.scene.background.isColor) {
        this.scene.background = new THREE.Color();
      }
      this.scene.background.set(skyDef.horizonColor);
    }
  }

  _syncWater(preset) {
    const sunDir = new THREE.Vector3(...preset.sun.offset).normalize();

    // StylizedRiver
    if (this.om.stylizedRiver && this.om.stylizedRiver.waterUniforms) {
      const u = this.om.stylizedRiver.waterUniforms;
      if (u.uSunDir) u.uSunDir.value.copy(sunDir);
      if (preset.water) {
        if (u.uShallowColor) u.uShallowColor.value.set(preset.water.shallowColor);
        if (u.uDeepColor) u.uDeepColor.value.set(preset.water.deepColor);
        if (u.uFoamColor) u.uFoamColor.value.set(preset.water.foamColor);
      }
    }

    // DojoPond
    if (this.om.dojoPond && this.om.dojoPond.waterUniforms) {
      const u = this.om.dojoPond.waterUniforms;
      if (u.uSunDir) u.uSunDir.value.copy(sunDir);
      if (preset.water) {
        if (u.uShallowColor) u.uShallowColor.value.set(preset.water.shallowColor);
        if (u.uDeepColor) u.uDeepColor.value.set(preset.water.deepColor);
      }
    }
  }

  update(dt) {
    if (this.om && this.om.demoScenaZone && this.om.demoScenaZone.isActive) {
      if (this.sunLight && this.sunLight.visible) this.sunLight.visible = false;
      if (this.hemiLight && this.hemiLight.visible) this.hemiLight.visible = false;
      return;
    }

    // Dynamic Shadow Tracking:
    // Move the directional light target and position smoothly with the player / camera lookAt.
    // This guarantees that the 2048x2048 shadow frustum is always centered precisely around the active
    // screen view, preventing shadow clipping and maximizing shadow resolution at all times.
    const lookAtTarget = (this.om.cameraController && this.om.cameraController.currentLookAt)
      || (this.om.player && this.om.player.position)
      || null;

    if (lookAtTarget) {
      this.activeLookAt.lerp(lookAtTarget, 0.1);
      this.sunTarget.position.copy(this.activeLookAt);
      this.sunTarget.updateMatrixWorld();

      if (this.sunLight) {
        const off = this.currentPreset.sun.offset;
        this.sunLight.position.set(
          this.activeLookAt.x + off[0],
          this.activeLookAt.y + off[1],
          this.activeLookAt.z + off[2]
        );
      }
    }
  }

  render(time, dt) {
    // Rendimiento (23-oct):
    // · Las sombras se recalculan uno de cada dos fotogramas (el sol apenas se mueve; la sombra de quien
    //   camina se actualiza 30 veces por segundo). Solo aquí, en el mundo abierto: el combate no cambia.
    // · Cada ~2 s se quita la sombra de la vegetación pequeña y las farolas (ver _trimSmallShadows).
    // · Hito 83: el sol de las islas (LightingManager) solo se mueve en los fotogramas con recálculo,
    //   para que el mapa de sombras y la matriz con que se lee sean siempre de la misma posición.
    if ((this._trimTick = ((this._trimTick || 0) + 1) % 120) === 1) {
      this._trimSmallShadows();
      this._prepareShadowCasters();
    }
    const sm = this.renderer.shadowMap;
    const auto = sm.autoUpdate;
    let shadowFrame = true;
    if (sm.enabled && auto) {
      sm.autoUpdate = false;
      this._shadowTick = ((this._shadowTick || 0) + 1) % 2;
      shadowFrame = this._shadowTick === 0 || LightingManager.debug.everyFrame || LightingManager.wantsShadowRefresh();
      if (shadowFrame) sm.needsUpdate = true;
    }
    if (shadowFrame) LightingManager.commitShadowTargets();
    try {
      if (this.isPostProcessingActive && this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } finally {
      sm.autoUpdate = auto;
    }
  }

  /**
   * Helechos, setas, flores, plantas pequeñas, guijarros y farolas no proyectan sombra: son cientos de miles de
   * triángulos más en el mapa de sombras para manchas que apenas se ven. Árboles, arbustos, rocas, edificios y
   * personajes la siguen proyectando. Se repasa cada ~2 s porque la vegetación se crea al cargar cada isla.
   */
  /**
   * Hito 83: los objetos fijos del mundo (rocas, puentes, troncos, casas…) meten en el mapa de sombras su
   * cara delantera. Por defecto three mete la trasera (shadowSide = BackSide para materiales FrontSide), y
   * en las caras casi paralelas al sol bajo esa cara queda a la misma profundidad que la delantera: salían
   * rayas (acné) en las rocas y el puente. El bias negativo de LightingManager evita el acné en las caras
   * iluminadas. Solo cambia qué cara se dibuja en el pase de sombras: no recompila nada ni cuesta más.
   * Se salta a los personajes (mallas con esqueleto), a los materiales de dos caras y a los que ya eligen
   * su shadowSide. Se repasa cada ~2 s, como _trimSmallShadows. lkDebug.shadows({ frontFaces:false }) lo deshace.
   */
  _prepareShadowCasters() {
    const on = LightingManager.debug.frontFaces !== false && !LightingManager.debug.legacy;
    if (!on && !this._frontShadowMats) return;
    const set = this._frontShadowMats || (this._frontShadowMats = new Set());
    if (!on) {
      for (const m of set) { if (m.shadowSide === THREE.FrontSide) m.shadowSide = null; }
      set.clear();
      return;
    }
    this.scene.traverse((o) => {
      if (!o.isMesh || !o.castShadow || o.isSkinnedMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m || set.has(m) || m.side !== THREE.FrontSide || m.shadowSide != null) continue;
        m.shadowSide = THREE.FrontSide;
        set.add(m);
      }
    });
  }

  _trimSmallShadows() {
    const SMALL = /^(InstancedAnimeFlower_|InstancedVeg_(fern|mushroom|plant|flower)|InstancedPebbles_|Fern_\d|ForestVillage_lamp)/i;
    this.scene.traverse((o) => {
      if (o.castShadow && o.isMesh && SMALL.test(o.name || '')) o.castShadow = false;
    });
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  dispose() {
    window.removeEventListener('resize', this._onResizeBound);
    if (this.composer) {
      this.composer.reset();
    }
  }
}
