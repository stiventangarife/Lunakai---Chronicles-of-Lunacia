import * as THREE from 'three';
import { GLTFLoader } from '../../../../vendor/GLTFLoader.js';
import { applyToonOutline } from '../../stylized/ToonOutline.js';
import { generatePackForBiome } from '../BiomeEnemyCatalog.js';

/**
 * Tabla de modelos oficiales de Chimera Slimes en el juego.
 * Mapea IDs de modelos permitidos (Aqua, Support, Attack y Defense).
 */
const MODEL_MAPPING = {
  'slime': './assets/models/slime.glb',
  'slime-support': './assets/models/slime-support.glb',
  'slime-attack': './assets/models/slime-attack.glb',
  'slime-defese': './assets/models/slime-defese.glb',
  'slime_basic': './assets/models/slime_basic.glb',
  'slime_attack': './assets/models/slime_attack.glb',

  // Alias semánticos
  'hydro': 'slime',
  'dendro': 'slime-support',
  'forest': 'slime-support',
  'anemo': 'slime-attack',
  'defense': 'slime-defese',
  'support': 'slime-support'
};

/**
 * Gestor de Criaturas Vivas del Mundo: Slimes Auténticos del Juego con Lógica de Combate.
 * - Cantidad reducida y estratégica (3 slimes distribuidos en río, pradera y sendero del dojo).
 * - Detección del jugador con alerta roja ('!').
 * - Persecución activa con saltos de squash & stretch.
 * - Inicio de batalla táctica al entrar en contacto (encounterRadius) vía OverworldManager.
 * - Desaparición tras la victoria del combate.
 */
export class SlimeCreaturesManager {
  constructor(scene, terrain, assetManager = null, overworldManager = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.assetManager = assetManager;
    this.om = overworldManager;

    this.group = new THREE.Group();
    this.group.name = 'DemoScena_Slimes';
    this.scene.add(this.group);

    this.slimes = [];
    this.defeatedIds = new Set();
    this.time = 0;
    this.isLoaded = false;
    this.isEncounterTriggered = false;
    this._isInitializing = false;

    this.gltfLoader = new GLTFLoader();
    this.cachedGLTFs = new Map();

    // Iniciar carga inmediatamente
    this._initPromise = this.init();
  }

  async init() {
    if (this.isLoaded) return;
    if (this._isInitializing) return this._initPromise;
    this._isInitializing = true;

    // Reducción estratégica a 3 slimes con identidades, niveles y roles tácticos únicos (alejados del río)
    const slimeConfigs = [
      // 1. Aqua Chimera Slime (En la pradera suroeste, lejos del río)
      {
        id: 'slime_ds_aqua',
        name: 'Aqua Slime',
        tier: 1,
        modelType: 'slime',
        archetypeId: 'slime',
        x: -35.0,
        z: -55.0,
        scale: 1.75,
        jumpInterval: 2.2,
        chaseJumpInterval: 1.15,
        detectionRadius: 8.5,
        encounterRadius: 2.6,
        jumpHeight: 1.6
      },

      // 2. Support Chimera Slime (En la meseta noroeste de flores)
      {
        id: 'slime_ds_support',
        name: 'Support Slime',
        tier: 1,
        modelType: 'slime-support',
        archetypeId: 'slime_support',
        x: -75.0,
        z: -20.0,
        scale: 1.65,
        jumpInterval: 2.4,
        chaseJumpInterval: 1.25,
        detectionRadius: 8.5,
        encounterRadius: 2.6,
        jumpHeight: 1.5
      },

      // 3. Attack Chimera Slime (En la colina del sendero al Dojō)
      {
        id: 'slime_ds_attack',
        name: 'Attack Slime',
        tier: 2,
        modelType: 'slime-attack',
        archetypeId: 'slime_attack',
        x: -60.0,
        z: 45.0,
        scale: 1.85,
        jumpInterval: 2.0,
        chaseJumpInterval: 1.05,
        detectionRadius: 9.0,
        encounterRadius: 2.6,
        jumpHeight: 1.7
      }
    ];

    for (const cfg of slimeConfigs) {
      if (this.defeatedIds.has(cfg.id)) continue;

      try {
        const gltf = await this._getOrLoadGLTF(cfg.modelType);
        if (!gltf) continue;

        // Generar paquete de combate procedural equilibrado
        let packData = null;
        try {
          packData = generatePackForBiome('forest', [2, 2], cfg.archetypeId);
        } catch (e) {
          console.warn('[SlimeCreaturesManager] Usando pack fallback para combate:', e);
        }

        const { root, model, mixer, actions, alertSprite, nameSprite } = this._createSlimeInstance(gltf, cfg, packData);
        const groundH = this.terrain ? this.terrain.getHeight(cfg.x, cfg.z) : 0;
        root.position.set(cfg.x, groundH, cfg.z);

        this.group.add(root);

        this.slimes.push({
          id: cfg.id,
          name: cfg.name,
          tier: cfg.tier,
          archetypeId: cfg.archetypeId,
          group: root,
          model: model,
          mixer: mixer,
          actions: actions,
          alertSprite: alertSprite,
          nameSprite: nameSprite,
          alertPopped: false,
          packData: packData,
          baseX: cfg.x,
          baseZ: cfg.z,
          currentX: cfg.x,
          currentZ: cfg.z,
          targetX: cfg.x + (Math.random() - 0.5) * 8.0,
          targetZ: cfg.z + (Math.random() - 0.5) * 8.0,
          baseScale: cfg.scale,
          modelType: cfg.modelType,
          jumpInterval: cfg.jumpInterval,
          normalJumpInterval: cfg.jumpInterval,
          chaseJumpInterval: cfg.chaseJumpInterval,
          jumpTimer: Math.random() * cfg.jumpInterval,
          isJumping: false,
          jumpProgress: 0,
          jumpDuration: 0.85,
          startX: cfg.x,
          startZ: cfg.z,
          jumpHeight: cfg.jumpHeight,
          detectionRadius: cfg.detectionRadius,
          encounterRadius: cfg.encounterRadius,
          state: 'PATROL', // 'PATROL', 'ALERT_PAUSE', 'CHASE', 'ENCOUNTER'
          alertTimer: 0
        });
      } catch (err) {
        console.warn(`[SlimeCreaturesManager] Error al instanciar slime ${cfg.modelType}:`, err);
      }
    }

    this.isLoaded = true;
    this._isInitializing = false;
    console.log(`[SlimeCreaturesManager] ✨ ${this.slimes.length} Slimes tácticos con lógica de combate instanciados en el mapa.`);
  }

  async _getOrLoadGLTF(modelKey) {
    let resolvedKey = modelKey;
    if (MODEL_MAPPING[resolvedKey] && !MODEL_MAPPING[resolvedKey].endsWith('.glb')) {
      resolvedKey = MODEL_MAPPING[resolvedKey];
    }

    // 1. Precarga de DemoScenaAssetManager
    if (this.assetManager && typeof this.assetManager.getModel === 'function') {
      const gltf = this.assetManager.getModel(resolvedKey);
      if (gltf) return gltf;
    }

    // 2. Caché local
    if (this.cachedGLTFs.has(resolvedKey)) {
      return this.cachedGLTFs.get(resolvedKey);
    }

    // 3. Carga directa con GLTFLoader
    const path = MODEL_MAPPING[resolvedKey] || `./assets/models/${resolvedKey}.glb`;
    try {
      const gltf = await this.gltfLoader.loadAsync(path);
      this.cachedGLTFs.set(resolvedKey, gltf);
      return gltf;
    } catch (err) {
      console.warn(`[SlimeCreaturesManager] Error al cargar modelo '${resolvedKey}' (${path}):`, err);
      if (resolvedKey !== 'slime') {
        return this._getOrLoadGLTF('slime');
      }
      return null;
    }
  }

  _createSlimeInstance(gltf, cfg, packData) {
    const root = new THREE.Group();
    root.name = `Slime_${cfg.id}`;

    const model = gltf.scene.clone(true);

    // Configuración de materiales y sombras suaves
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          child.material.roughness = 0.35;
          child.material.metalness = 0.03;
        }
      }
    });

    // Asegurar que la base toque el suelo exactamente en Y = 0
    const bbox = new THREE.Box3().setFromObject(model);
    if (Math.abs(bbox.min.y) > 0.01) {
      model.position.y -= bbox.min.y;
    }

    // Aplicar contorno Toon estilizado (Inverted Hull)
    applyToonOutline(model, {
      thickness: 0.015,
      color: 0x15161e,
      mode: 'view'
    });

    root.add(model);

    // Escala inicial proporcional
    const baseScale = cfg.scale || 1.0;
    root.scale.set(baseScale, baseScale, baseScale);

    // Altura del cartel y alerta sobre la cabeza
    const overheadY = 1.65;

    // Sprite de Alerta Exclamación (!)
    const alertSprite = this._createAlertSprite();
    alertSprite.position.set(0, overheadY + 0.95, 0);
    root.add(alertSprite);

    // Sprite de Placa de Nombre con Nivel y Estatus
    const nameSprite = this._createNameplateSprite(cfg.name, cfg.tier, packData);
    nameSprite.position.set(0, overheadY, 0);
    root.add(nameSprite);

    // Animaciones esqueléticas si existen (ej. slime_basic)
    let mixer = null;
    let actions = {};
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => {
        const lName = clip.name.toLowerCase();
        const action = mixer.clipAction(clip);
        actions[lName] = action;
        if (lName.includes('idle')) actions['idle'] = action;
        if (lName.includes('run') || lName.includes('walk') || lName.includes('move')) actions['run'] = action;
      });
      if (!actions['idle']) actions['idle'] = mixer.clipAction(gltf.animations[0]);
      if (actions['idle']) actions['idle'].play();
    }

    return { root, model, mixer, actions, alertSprite, nameSprite };
  }

  _createNameplateSprite(name, tier, packData = null) {
    const canvas = document.createElement('canvas');
    canvas.width = 340;
    canvas.height = 68;
    const ctx = canvas.getContext('2d');

    // Fondo redondeado elegante con transparencia
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.roundRect(8, 8, 324, 52, 12);
    ctx.fill();

    // Borde morado / ámbar si es grupo
    ctx.strokeStyle = (packData && packData.packSize > 1) ? '#f59e0b' : '#a855f7';
    ctx.lineWidth = 3;
    ctx.roundRect(8, 8, 324, 52, 12);
    ctx.stroke();

    // Texto con nivel (sin emojis)
    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    const tierText = tier ? ` · Nv.${tier}` : '';
    const countText = (packData && packData.packSize > 1) ? ` (x${packData.packSize})` : '';
    ctx.fillText(`${name}${countText}${tierText}`, 170, 41);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.52, 1);
    return sprite;
  }

  _createAlertSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.shadowColor = 'rgba(220, 38, 38, 0.65)';
    ctx.shadowBlur = 14;

    const grad = ctx.createLinearGradient(0, 24, 0, 232);
    grad.addColorStop(0, '#f87171');
    grad.addColorStop(1, '#dc2626');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 102, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 146px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 128, 124);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0, 0, 1);
    return sprite;
  }

  _popAlert(s) {
    if (!s.alertSprite || s.alertPopped) return;
    s.alertPopped = true;
    const sprite = s.alertSprite;
    const targetScale = 0.95;
    let progress = 0;
    const animatePop = () => {
      progress += 0.08;
      if (progress < 1.0) {
        const p = progress - 1.0;
        const overshoot = 1.0 + 2.7 * Math.pow(p, 3) + 1.7 * Math.pow(p, 2);
        const sc = Math.max(0, overshoot * targetScale);
        sprite.scale.set(sc, sc, 1);
        requestAnimationFrame(animatePop);
      } else {
        sprite.scale.set(targetScale, targetScale, 1);
      }
    };
    animatePop();
  }

  _hideAlert(s) {
    if (!s.alertSprite || !s.alertPopped) return;
    s.alertPopped = false;
    s.alertSprite.scale.set(0, 0, 1);
  }

  update(delta, playerPos = null) {
    if (!this.group.visible || !this.isLoaded) return;
    this.time += delta;

    // Obtener posición del jugador de OverworldManager si no viene por parámetro
    const pPos = playerPos || (this.om && this.om.player ? this.om.player.position : null);

    for (let i = 0; i < this.slimes.length; i++) {
      const s = this.slimes[i];
      const g = s.group;

      if (s.mixer) {
        s.mixer.update(delta);
      }

      // Calcular distancia en 2D al jugador
      let distToPlayer = 999;
      let dx = 0;
      let dz = 0;
      if (pPos) {
        dx = pPos.x - g.position.x;
        dz = pPos.z - g.position.z;
        distToPlayer = Math.hypot(dx, dz);
      }

      // Comprobar colisión de combate (Encounter)
      if (!this.isEncounterTriggered && distToPlayer <= s.encounterRadius) {
        s.state = 'ENCOUNTER';
        this.isEncounterTriggered = true;
        this._triggerBattle(s);
        return;
      }

      // Máquina de estados de IA de combate
      switch (s.state) {
        case 'PATROL': {
          s.jumpInterval = s.normalJumpInterval;

          // Si el jugador entra en rango de detección, alertar
          if (!this.isEncounterTriggered && distToPlayer <= s.detectionRadius) {
            s.state = 'ALERT_PAUSE';
            s.alertTimer = 0.65;
            this._popAlert(s);
            break;
          }

          // Rutina estándar de salto en reposo
          this._updateHopping(s, delta, i, false, pPos);
          break;
        }

        case 'ALERT_PAUSE': {
          s.alertTimer -= delta;

          // Orientarse hacia el jugador
          if (distToPlayer > 0.01) {
            const faceAngle = Math.atan2(dx, dz);
            g.rotation.y = faceAngle;
          }

          if (s.alertTimer <= 0) {
            s.state = 'CHASE';
          }
          break;
        }

        case 'CHASE': {
          s.jumpInterval = s.chaseJumpInterval;

          // Si el jugador se aleja demasiado, perder interés (de-aggro)
          if (distToPlayer > 18.0) {
            s.state = 'PATROL';
            this._hideAlert(s);
            break;
          }

          // Persecución mediante saltos orientados hacia la posición del jugador
          this._updateHopping(s, delta, i, true, pPos);
          break;
        }
      }
    }
  }

  _updateHopping(s, delta, i, isChasing, playerPos) {
    const g = s.group;
    s.jumpTimer += delta;

    if (!s.isJumping) {
      // En reposo: respiración ondulante orgánica
      const breath = Math.sin(this.time * 3.5 + i) * 0.035;
      g.scale.set(
        s.baseScale * (1.0 + breath),
        s.baseScale * (1.0 - breath * 0.8),
        s.baseScale * (1.0 + breath)
      );

      if (s.jumpTimer >= s.jumpInterval) {
        s.isJumping = true;
        s.jumpProgress = 0;
        s.startX = g.position.x;
        s.startZ = g.position.z;

        if (isChasing && playerPos) {
          // Salto corto y controlado directo hacia el jugador
          const angleToPlayer = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z);
          const hopDist = Math.min(2.8, Math.hypot(playerPos.x - g.position.x, playerPos.z - g.position.z));
          s.targetX = s.startX + Math.sin(angleToPlayer) * hopDist;
          s.targetZ = s.startZ + Math.cos(angleToPlayer) * hopDist;
          g.rotation.y = angleToPlayer;
        } else {
          // Salto de patrulla suave y corto cerca de su territorio base
          const ang = Math.random() * Math.PI * 2;
          const dist = 1.8 + Math.random() * 2.2;
          s.targetX = s.baseX + Math.cos(ang) * dist;
          s.targetZ = s.baseZ + Math.sin(ang) * dist;

          const targetAngle = Math.atan2(s.targetX - s.startX, s.targetZ - s.startZ);
          g.rotation.y = targetAngle;
        }

        if (s.actions && s.actions['run'] && s.actions['idle']) {
          s.actions['idle'].stop();
          s.actions['run'].reset().play();
        }
      }
    } else {
      // En vuelo parabólico con squash & stretch elástico
      s.jumpProgress += delta / s.jumpDuration;

      if (s.jumpProgress >= 1.0) {
        // Aterrizaje
        s.isJumping = false;
        s.jumpTimer = 0;
        g.position.x = s.targetX;
        g.position.z = s.targetZ;
        const groundY = this.terrain ? this.terrain.getHeight(s.targetX, s.targetZ) : 0;
        g.position.y = groundY;

        // Squash elástico de contacto
        g.scale.set(s.baseScale * 1.25, s.baseScale * 0.72, s.baseScale * 1.25);

        if (s.actions && s.actions['run'] && s.actions['idle']) {
          s.actions['run'].stop();
          s.actions['idle'].reset().play();
        }
      } else {
        // En el aire
        const t = s.jumpProgress;
        const currentX = THREE.MathUtils.lerp(s.startX, s.targetX, t);
        const currentZ = THREE.MathUtils.lerp(s.startZ, s.targetZ, t);
        const currentGroundY = this.terrain ? this.terrain.getHeight(currentX, currentZ) : 0;

        const arc = Math.sin(t * Math.PI) * s.jumpHeight;
        g.position.set(currentX, currentGroundY + arc, currentZ);

        if (t < 0.28) {
          g.scale.set(s.baseScale * 0.82, s.baseScale * 1.30, s.baseScale * 0.82);
        } else if (t > 0.75) {
          g.scale.set(s.baseScale * 1.15, s.baseScale * 0.88, s.baseScale * 1.15);
        } else {
          g.scale.set(s.baseScale, s.baseScale, s.baseScale);
        }
      }
    }
  }

  _triggerBattle(s) {
    if (!this.om || typeof this.om._handleMonsterEncounter !== 'function') {
      console.warn('[SlimeCreaturesManager] No se pudo iniciar batalla: OverworldManager no disponible.');
      return;
    }

    if (this.om.state === 'TRANSITION' || this.om.state === 'COMBAT') return;

    console.log(`[SlimeCreaturesManager] ⚔️ ¡Iniciando combate táctico contra ${s.name} (${s.id})!`);

    const monsterObj = {
      id: s.id,
      name: s.name,
      modelType: s.modelType,
      tier: s.tier,
      biome: 'forest',
      packData: s.packData,
      scale: s.baseScale,
      group: s.group
    };

    this.om._handleMonsterEncounter(monsterObj);
  }

  despawnSlime(monsterId) {
    const idx = this.slimes.findIndex(s => s.id === monsterId);
    if (idx !== -1) {
      const s = this.slimes[idx];
      this.defeatedIds.add(s.id);
      this.group.remove(s.group);
      this.slimes.splice(idx, 1);
      console.log(`[SlimeCreaturesManager] Slime derrotado '${monsterId}' eliminado permanentemente del mapa.`);
    }
    this.isEncounterTriggered = false;
  }

  resetCombatEncounter() {
    this.isEncounterTriggered = false;
    for (const s of this.slimes) {
      s.state = 'PATROL';
      this._hideAlert(s);
      s.isJumping = false;
      s.jumpTimer = 0;
    }
  }

  setEnabled(enabled) {
    this.group.visible = enabled;
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  setGlowIntensity(intensity) {
    this.slimes.forEach((s) => {
      if (s.model) {
        s.model.traverse((child) => {
          if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissiveIntensity = intensity;
          }
        });
      }
    });
  }
}
