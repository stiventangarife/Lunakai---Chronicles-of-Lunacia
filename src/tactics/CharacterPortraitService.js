// CharacterPortraitService.js - Real-Time 3D Model Snapshot Service for Axie Portraits
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { sapidaeModularController } from '../rpg/SapidaeModularController.js';

export const PRE_RENDERED_PORTRAITS = [
  'bear-dad',
  'bear-mom',
  'dryad-fighter',
  'dryad-mage',
  'dryad-range',
  'slime',
  'slime-attack',
  'slime-defese',
  'slime-forest-a',
  'slime-forest-b',
  'slime-fusion',
  'slime-support',
  'treant-flower',
  'werewolf-boss',
  'wolf-alpha',
  'wolf-aquatic',
  'wolf-aquatic-alpha',
  'wolf-gray',
  'shinji',
  'kotaro',
  'bird-early',
  'plant-yak',
  'bing',
  'pomodoro',
  'paladill',
  'kibo',
  'xia',
  'sapidae-m-a',
  'sapidae-m-b',
  'sapidae-m-c',
  'sapidae-m-d',
  'sapidae-m-e',
  'sapidae-f-a',
  'sapidae-f-b',
  'sapidae-f-c',
  'sapidae-f-d',
  'sapidae-f-e',
  'tripp',
  'statue_atia'
];

export class CharacterPortraitService {
  constructor() {
    this.cache = new Map(); // id -> dataURL
    this.pending = new Map(); // id -> Promise<dataURL>
    this.listeners = []; // callbacks: (id, dataUrl) => void

    this.width = 192;
    this.height = 192;

    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.wrapper = null;
    this.loader = new GLTFLoader();

    this._initialized = false;

    // Pre-populate cache with static pre-rendered portraits for instant synchronous display
    this._initStaticPortraits();
  }

  _initStaticPortraits() {
    PRE_RENDERED_PORTRAITS.forEach(name => {
      const url = `./assets/portraits/${name}.png`;
      this.cache.set(name, url);
      this.cache.set(name.replace(/-/g, '_'), url);
    });

    // Register starter hero aliases for instant synchronous lookup by axieId and heroKey
    const heroAliases = {
      // Beast Starter (Shinji / Axie #10455)
      '10455': './assets/portraits/shinji.png',
      '11968787': './assets/portraits/shinji.png',
      shinji: './assets/portraits/shinji.png',
      'shinji-beast': './assets/portraits/shinji.png',
      beast_rage: './assets/portraits/shinji.png',
      'beast-rage': './assets/portraits/shinji.png',
      rage_5_evo: './assets/portraits/shinji.png',
      'rage-5-evo': './assets/portraits/shinji.png',

      // Bird Starter (Early Bird)
      '3797905': './assets/portraits/bird-early.png',
      bird_early: './assets/portraits/bird-early.png',
      'bird-early': './assets/portraits/bird-early.png',
      early_bird: './assets/portraits/bird-early.png',
      'early-bird': './assets/portraits/bird-early.png',

      // Plant Starter (Big Yak)
      '10830416': './assets/portraits/plant-yak.png',
      plant_yak: './assets/portraits/plant-yak.png',
      'plant-yak': './assets/portraits/plant-yak.png',
      big_yak: './assets/portraits/plant-yak.png',
      'big-yak': './assets/portraits/plant-yak.png',

      // Master Paladill
      paladill: './assets/portraits/paladill.png',
      'maestro paladill': './assets/portraits/paladill.png',
      'maestro_paladill': './assets/portraits/paladill.png',
      'mentor del dojo': './assets/portraits/paladill.png',

      // Atia Spirit & Holy Statue
      statue_atia: './assets/portraits/statue_atia.png',
      'statue-atia': './assets/portraits/statue_atia.png',
      atia_spirit: './assets/portraits/statue_atia.png',
      'espíritu de atia': './assets/portraits/statue_atia.png',
      'espiritu de atia': './assets/portraits/statue_atia.png',
      'estatua de atia': './assets/portraits/statue_atia.png',
      'estatua sagrada de atia': './assets/portraits/statue_atia.png',
      'alma del gran árbol': './assets/portraits/statue_atia.png',
      'alma del gran arbol': './assets/portraits/statue_atia.png',

      // Recruits
      bing: './assets/portraits/bing.png',
      bing_npc: './assets/portraits/bing.png',
      pomodoro: './assets/portraits/pomodoro.png',
      pomodoro_npc: './assets/portraits/pomodoro.png',
      kotaro: './assets/portraits/kotaro.png',
      sulfur_guard: './assets/portraits/kotaro.png'
    };

    Object.entries(heroAliases).forEach(([alias, url]) => {
      this.cache.set(alias, url);
      this.cache.set(alias.toLowerCase().trim(), url);
    });

    // Register campaign level enemy ID aliases for instant mapping
    const levelAliases = {
      quimera_scout: 'slime',
      quimera_guard: 'slime-defese',
      quimera_pup1: 'slime-support',
      quimera_pup2: 'slime-attack',
      quimera_pup3: 'slime',
      quimera_frost1: 'wolf-alpha',
      quimera_frost2: 'wolf-gray',
      quimera_frost3: 'treant-flower',
      scout_a: 'slime-attack',
      scout_b: 'slime-attack',
      larva_a: 'slime',
      larva_b: 'slime-defese',
      boss_puffy: 'wolf-alpha',
      guard_frost_a: 'treant-flower',
      guard_frost_b: 'wolf-gray',
      quimera_tank: 'dryad-fighter',
      quimera_healer1: 'dryad-mage',
      quimera_healer2: 'dryad-range',
      quimera_goliath1: 'wolf-aquatic-alpha',
      quimera_goliath2: 'wolf-aquatic',
      quimera_dunas: 'slime-forest-a',
      quimera_frost_brawler: 'wolf-alpha',
      quimera_frost_shaman: 'treant-flower',
      quimera_frost_stalker1: 'wolf-gray',
      quimera_frost_stalker2: 'wolf-gray',
      commander_brawler: 'bear-dad',
      commander_sniper: 'slime-fusion',
      commander_shaman: 'bear-mom',
      boss_werewolf: 'werewolf-boss',
      boss_guard_l: 'bear-mom',
      boss_guard_r: 'bear-dad'
    };

    Object.entries(levelAliases).forEach(([alias, target]) => {
      const url = `./assets/portraits/${target}.png`;
      this.cache.set(alias, url);
    });
  }

  _initRenderer(customW = null, customH = null) {
    const targetW = customW || this.width;
    const targetH = customH || this.height;

    if (this._initialized) {
      if (this.canvas && (this.canvas.width !== targetW || this.canvas.height !== targetH)) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
        this.renderer.setSize(targetW, targetH);
        this.camera.aspect = targetW / targetH;
        this.camera.updateProjectionMatrix();
      }
      return;
    }
    if (typeof document === 'undefined') return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = targetW;
    this.canvas.height = targetH;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power'
    });
    this.renderer.debug.checkShaderErrors = false;
    this.renderer.setSize(targetW, targetH);
    this.renderer.setPixelRatio(1);
    if (THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, targetW / targetH, 0.1, 50);

    // Studio 3-Point Lighting for heroic character portraits
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(3, 4, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.2);
    fillLight.position.set(-3, 2, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    rimLight.position.set(0, 3, -4);
    this.scene.add(rimLight);

    this.wrapper = new THREE.Group();
    this.scene.add(this.wrapper);

    this._initialized = true;
  }

  addListener(callback) {
    if (typeof callback === 'function' && !this.listeners.includes(callback)) {
      this.listeners.push(callback);
    }
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  _notify(id, dataUrl) {
    this.listeners.forEach(cb => {
      try {
        cb(id, dataUrl);
      } catch (err) {
        console.error('[CharacterPortraitService] Listener error:', err);
      }
    });
  }

  _resolvePortraitId(id) {
    if (!id) return 'slime';
    let cleanId = String(id).toLowerCase().trim();
    if (cleanId.includes('/')) {
      cleanId = cleanId.split('/').pop();
    }
    if (cleanId.endsWith('.png') || cleanId.endsWith('.glb')) {
      cleanId = cleanId.replace(/\.(png|glb)$/, '');
    }

    if (this.cache.has(cleanId)) return cleanId;

    if (cleanId === 'shinji' || cleanId === '10455') return 'shinji';
    if (cleanId === 'kotaro' || cleanId === 'sulfur_guard') return 'kotaro';
    if (cleanId === 'bing' || cleanId === 'bing_npc') return 'bing';
    if (cleanId === 'pomodoro' || cleanId === 'pomodoro_npc') return 'pomodoro';
    if (cleanId.includes('atia') || cleanId.includes('statue')) return 'statue_atia';
    if (cleanId === 'paladill' || cleanId.includes('paladill')) return 'paladill';

    // Overworld NPC mappings
    if (cleanId.includes('sentinel') || cleanId.includes('centinela') || cleanId === 'kibo') return 'kibo';
    if (cleanId.includes('cartographer') || cleanId.includes('exploradora') || cleanId === 'xia') return 'xia';
    if (cleanId.includes('miner') || cleanId.includes('tripp')) return 'tripp';

    // Sapidae models and NPC names
    if (cleanId.includes('postman') || cleanId.includes('mensajero') || cleanId.includes('cartero') || cleanId === 'sapidae-m-a' || cleanId === 'sapidae_m_a') return 'sapidae-m-a';
    if (cleanId.includes('herbalist') || cleanId.includes('rosalba') || cleanId === 'sapidae-f-a' || cleanId === 'sapidae_f_a') return 'sapidae-f-a';
    if (cleanId.includes('blacksmith') || cleanId.includes('baruk') || cleanId.includes('herrero') || cleanId === 'sapidae-m-b' || cleanId === 'sapidae_m_b') return 'sapidae-m-b';
    if (cleanId.includes('hunter') || cleanId.includes('zarek') || cleanId.includes('cazador') || cleanId === 'sapidae-m-c' || cleanId === 'sapidae_m_c') return 'sapidae-m-c';
    if (cleanId.includes('chef') || cleanId === 'sapidae-m-d' || cleanId === 'sapidae_m_d') return 'sapidae-m-d';
    if (cleanId.includes('hermit') || cleanId.includes('ermitaño') || cleanId.includes('ermitano') || cleanId === 'sapidae-m-e' || cleanId === 'sapidae_m_e') return 'sapidae-m-e';
    if (cleanId.includes('astrolog') || cleanId === 'sapidae-f-b' || cleanId === 'sapidae_f_b') return 'sapidae-f-b';
    if (cleanId.includes('polar_sage') || cleanId.includes('sabio') || cleanId === 'sapidae-f-c' || cleanId === 'sapidae_f_c') return 'sapidae-f-c';
    if (cleanId.includes('oracle') || cleanId.includes('oráculo') || cleanId.includes('oraculo') || cleanId === 'sapidae-f-d' || cleanId === 'sapidae_f_d') return 'sapidae-f-d';
    if (cleanId.includes('shaman') || cleanId.includes('chamán') || cleanId.includes('chaman') || cleanId === 'sapidae-f-e' || cleanId === 'sapidae_f_e') return 'sapidae-f-e';

    // Normalize hyphenated/underscored chimera model names
    if (cleanId.includes('slime-attack') || cleanId.includes('slime_attack')) return 'slime-attack';
    if (cleanId.includes('slime-defese') || cleanId.includes('slime_defese')) return 'slime-defese';
    if (cleanId.includes('slime-support') || cleanId.includes('slime_support')) return 'slime-support';
    if (cleanId.includes('slime-forest-a') || cleanId.includes('slime_forest_a')) return 'slime-forest-a';
    if (cleanId.includes('slime-forest-b') || cleanId.includes('slime_forest_b')) return 'slime-forest-b';
    if (cleanId.includes('slime-fusion') || cleanId.includes('slime_fusion')) return 'slime-fusion';
    if (cleanId.includes('wolf-aquatic-alpha') || cleanId.includes('wolf_aquatic_alpha')) return 'wolf-aquatic-alpha';
    if (cleanId.includes('wolf-aquatic') || cleanId.includes('wolf_aquatic')) return 'wolf-aquatic';
    if (cleanId.includes('wolf-alpha') || cleanId.includes('wolf_alpha')) return 'wolf-alpha';
    if (cleanId.includes('wolf-gray') || cleanId.includes('wolf_gray')) return 'wolf-gray';
    if (cleanId.includes('treant-flower') || cleanId.includes('treant_flower') || cleanId.includes('treant')) return 'treant-flower';
    if (cleanId.includes('dryad-fighter') || cleanId.includes('dryad_fighter')) return 'dryad-fighter';
    if (cleanId.includes('dryad-mage') || cleanId.includes('dryad_mage')) return 'dryad-mage';
    if (cleanId.includes('dryad-range') || cleanId.includes('dryad_range')) return 'dryad-range';
    if (cleanId.includes('werewolf-boss') || cleanId.includes('werewolf_boss') || cleanId.includes('werewolf')) return 'werewolf-boss';
    if (cleanId.includes('bear-mom') || cleanId.includes('bear_mom')) return 'bear-mom';
    if (cleanId.includes('bear-dad') || cleanId.includes('bear_dad')) return 'bear-dad';
    if (cleanId.includes('slime')) return 'slime';

    // Campaign aliases fallback
    if (cleanId.includes('scout') || cleanId.includes('larva')) return 'slime';
    if (cleanId.includes('guard')) return 'slime-defese';
    if (cleanId.includes('pup1')) return 'slime-support';
    if (cleanId.includes('pup2')) return 'slime-attack';
    if (cleanId.includes('pup3')) return 'slime';
    if (cleanId.includes('brawler')) return 'bear-dad';
    if (cleanId.includes('sniper')) return 'slime-fusion';
    if (cleanId.includes('shaman')) return 'bear-mom';

    return cleanId;
  }

  hasPortrait(id) {
    if (!id) return false;
    if (this.cache.has(id)) return true;
    const resolved = this._resolvePortraitId(id);
    return this.cache.has(resolved) || PRE_RENDERED_PORTRAITS.includes(resolved);
  }

  getPortraitSync(id) {
    if (!id) return null;
    if (this.cache.has(id)) return this.cache.get(id);
    const resolved = this._resolvePortraitId(id);
    if (this.cache.has(resolved)) {
      const url = this.cache.get(resolved);
      this.cache.set(id, url);
      return url;
    }
    if (PRE_RENDERED_PORTRAITS.includes(resolved)) {
      const url = `./assets/portraits/${resolved}.png`;
      this.cache.set(id, url);
      this.cache.set(resolved, url);
      return url;
    }
    return null;
  }

  registerPortrait(id, dataUrl) {
    if (!id || !dataUrl) return;
    this.cache.set(id, dataUrl);
    this._notify(id, dataUrl);
  }

  _resolveModelPath(id) {
    if (!id) return './assets/models/slime.glb';
    const resolved = this._resolvePortraitId(id);
    return `./assets/models/${resolved}.glb`;
  }

  async getPortrait(id, modelScene = null, options = {}) {
    if (!id) return null;

    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    const syncUrl = this.getPortraitSync(id);
    if (syncUrl) {
      return syncUrl;
    }

    if (this.pending.has(id)) {
      return this.pending.get(id);
    }

    const promise = (async () => {
      this._initRenderer();
      if (!this._initialized) return null;

      let model = null;
      // Always load a fresh uncorrupted GLTF model to prevent SkinnedMesh clone destruction
      const modelPath = this._resolveModelPath(id);
      try {
        const gltf = await this.loader.loadAsync(modelPath);
        model = gltf.scene;
      } catch (err) {
        if (modelScene) {
          model = modelScene;
        } else {
          console.warn('[CharacterPortraitService] Could not load model for ' + id + ':', err);
          return null;
        }
      }

      const dataUrl = this.captureModel(id, model, options);
      this.pending.delete(id);
      return dataUrl;
    })();

    this.pending.set(id, promise);
    return promise;
  }

  captureModel(id, model, options = {}) {
    this._initRenderer();
    if (!this._initialized || !model) return null;

    const originalParent = model.parent;
    const originalPos = model.position.clone();
    const originalRot = model.rotation.clone();
    const originalScale = model.scale.clone();
    const originalVisible = model.visible;

    while (this.wrapper.children.length > 0) {
      this.wrapper.remove(this.wrapper.children[0]);
    }

    this.wrapper.add(model);
    model.visible = true;

    if (id === 'fox' || id.includes('stalker')) {
      model.scale.set(0.018, 0.018, 0.018);
    }

    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center model at the pivot of wrapper
    model.position.sub(center);

    // Heroic 3/4 front view rotation (turned ~13 degrees towards camera)
    const yawAngle = options.yaw !== undefined ? options.yaw : -0.22;
    const pitchAngle = options.pitch !== undefined ? options.pitch : 0.05;
    this.wrapper.rotation.set(pitchAngle, yawAngle, 0);

    const maxDim = Math.max(size.x, size.y);
    const fovRad = this.camera.fov * (Math.PI / 180);
    const isHumanoid = id.startsWith('sapidae') || id === 'xia' || id === 'tripp';

    let cameraDist, yTarget;
    if (options.fullBody) {
      // Encuadre de cuerpo entero de pie (desde los cuernos/cabeza hasta los pies)
      const zoomFactor = options.zoomFactor !== undefined ? options.zoomFactor : 1.10;
      cameraDist = (size.y * zoomFactor) / (2 * Math.tan(fovRad / 2));
      yTarget = size.y * (options.yTargetRatio !== undefined ? options.yTargetRatio : 0);
    } else {
      const defaultZoom = (options.isAxie || id.startsWith('axie') || /^\d+$/.test(id))
        ? 0.54
        : (isHumanoid ? 0.52 : 0.68);
      const zoomFactor = options.zoomFactor !== undefined ? options.zoomFactor : defaultZoom;
      cameraDist = (maxDim * zoomFactor) / Math.tan(fovRad / 2);

      const defaultYRatio = isHumanoid ? 0.22 : 0.08;
      yTarget = size.y * (options.yTargetRatio !== undefined ? options.yTargetRatio : defaultYRatio);
    }
    this.camera.position.set(0, yTarget, cameraDist);
    this.camera.lookAt(0, yTarget, 0);

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.canvas.toDataURL('image/png');

    this.cache.set(id, dataUrl);
    if (options.aliases && Array.isArray(options.aliases)) {
      options.aliases.forEach(alias => this.cache.set(alias, dataUrl));
    }
    this._notify(id, dataUrl);
    if (options.aliases && Array.isArray(options.aliases)) {
      options.aliases.forEach(alias => this._notify(alias, dataUrl));
    }

    // Persist to disk via server API if available
    try {
      if (typeof fetch === 'function') {
        fetch('/api/save-portrait', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: id, dataUrl })
        }).catch(() => {});
      }
    } catch (_) {}

    this.wrapper.remove(model);

    // Restore original transforms unconditionally
    model.position.copy(originalPos);
    model.rotation.copy(originalRot);
    model.scale.copy(originalScale);
    model.visible = originalVisible;

    // Restore to original parent if previously attached
    if (originalParent) {
      originalParent.add(model);
    }

    return dataUrl;
  }

  captureAxieHero(id, model, options = {}) {
    return this.captureModel(id, model, Object.assign({
      isAxie: true,
      zoomFactor: 0.54,
      yaw: -0.22,
      pitch: 0.05,
      yTargetRatio: 0.08
    }, options));
  }

  _getSapidaeCacheKey(modelId = 'sapidae-f-a', customization = null, equipped = null, fullBody = true) {
    const typeStr = fullBody ? 'fullbody' : 'bust';
    const cStr = customization ? JSON.stringify(customization) : '';
    const eStr = equipped ? JSON.stringify(equipped) : '';
    return `sapidae_${typeStr}_${modelId}_${cStr}_${eStr}`;
  }

  getSapidaePortraitSync(modelId = 'sapidae-f-a', customization = null, equipped = null, options = {}) {
    const isFullBody = options.fullBody !== undefined ? Boolean(options.fullBody) : true;
    const customKey = this._getSapidaeCacheKey(modelId, customization, equipped, isFullBody);
    if (this.cache.has(customKey)) {
      return this.cache.get(customKey);
    }
    if (this.cache.has('sapidae')) {
      return this.cache.get('sapidae');
    }
    return null;
  }

  async getSapidaeCustomPortrait(modelId = 'sapidae-f-a', customization = null, equipped = null, options = {}) {
    const isFullBody = options.fullBody !== undefined ? Boolean(options.fullBody) : true;
    const customKey = this._getSapidaeCacheKey(modelId, customization, equipped, isFullBody);
    if (this.cache.has(customKey)) {
      return this.cache.get(customKey);
    }
    if (this.pending.has(customKey)) {
      return this.pending.get(customKey);
    }

    const promise = (async () => {
      // Use vertical resolution 240x320 for full body standing, or square 240x240 for bust frame
      if (isFullBody) {
        this._initRenderer(240, 320);
      } else {
        this._initRenderer(240, 240);
      }
      if (!this._initialized) return null;

      const modelPath = `./assets/models/${modelId}.glb`;
      try {
        const gltf = await this.loader.loadAsync(modelPath);
        const model = gltf.scene;

        // Avanzar la animación a pose idle para que esté parada naturalmente
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          const idleClip = gltf.animations.find(c => c.name.toLowerCase().includes('idle')) || gltf.animations[0];
          if (idleClip) {
            mixer.clipAction(idleClip).play();
            mixer.update(0.1);
            model.updateMatrixWorld(true);
          }
        }

        // Aplicar personalización modular de pelo, ojos, traje, cuernos
        if (customization) {
          sapidaeModularController.applyCustomization(model, customization);
        }
        if (equipped) {
          sapidaeModularController.applyEquipment(model, equipped, customization || {});
        }

        const captureOpts = {
          fullBody: isFullBody,
          isHumanoid: true,
          zoomFactor: options.zoomFactor !== undefined ? options.zoomFactor : (isFullBody ? 1.10 : 0.38),
          yTargetRatio: options.yTargetRatio !== undefined ? options.yTargetRatio : (isFullBody ? 0 : 0.30),
          yaw: options.yaw !== undefined ? options.yaw : -0.18,
          pitch: options.pitch !== undefined ? options.pitch : 0.03,
          aliases: ['sapidae', modelId]
        };

        const dataUrl = this.captureModel(customKey, model, captureOpts);

        this.pending.delete(customKey);
        return dataUrl;
      } catch (err) {
        console.warn('[CharacterPortraitService] Could not generate custom Sapidae portrait:', err);
        this.pending.delete(customKey);
        return this.getPortraitSync(modelId) || `./assets/portraits/${modelId}.png`;
      }
    })();

    this.pending.set(customKey, promise);
    return promise;
  }

  preload(characterIds = []) {
    characterIds.forEach(id => {
      if (!this.cache.has(id)) {
        const syncUrl = this.getPortraitSync(id);
        if (!syncUrl) {
          this.getPortrait(id);
        }
      }
    });
  }
}

export const portraitService = new CharacterPortraitService();
