// NPCManager.js - Master Paladill & Dynamic Overworld NPCs with Speech Bubbles & Quests
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { applyToonOutline } from './stylized/ToonOutline.js';
import { portraitService } from '../tactics/CharacterPortraitService.js';
import { FerryTravelUI } from './ui/FerryTravelUI.js';

export class NPCManager {
  constructor(scene, dialogSystem, audioSystem) {
    this.scene = scene;
    this.dialogSystem = dialogSystem;
    this.audio = audioSystem;
    this.camera = null;

    this.npcs = [];
    this.nearbyNPC = null;
    this.nearbyBubbleNPC = null;
    this.interactionPromptEl = null;
    this.speechBubbleEl = null;
    this.modelCache = {};
    this.gltfLoader = new GLTFLoader();

    this.questState = {
      talkedToPaladill: false,
      slimeDefeated: false,
      rewardGiven: false,
      doorsUnlocked: false
    };

    this.collisions = null;
    this.questManager = null;
    this.equipmentManager = null;
    this.onPaladillInitialTalkComplete = null;
    this.onPaladillRewardDelivered = null;
    this.onPaladillGraduationComplete = null;
    this.onQuestCompleted = null;

    this._createPromptDOM();
    this._createSpeechBubbleDOM();
  }

  _createPromptDOM() {
    let el = document.getElementById('npc-interaction-prompt');
    if (!el) {
      el = document.createElement('div');
      el.id = 'npc-interaction-prompt';
      // Crónica Celeste: opción de interacción (píldora marfil con la tecla)
      el.className = 'lk-ui lk-interact-prompt hidden';
      el.innerHTML = `
        <span class="lk-ip__key">E</span>
        <span id="prompt-npc-action" class="lk-ip__text">Talk to Master Paladill</span>
      `;
      document.body.appendChild(el);
    }
    this.interactionPromptEl = el;
  }

  _createSpeechBubbleDOM() {
    let el = document.getElementById('npc-speech-bubble');
    if (!el) {
      el = document.createElement('div');
      el.id = 'npc-speech-bubble';
      // Crónica Celeste: papel marfil con placa de nombre (como el panel de diálogo) y marca de estado en rombo
      el.className = 'lk-ui lk-npc-bubble hidden';
      el.innerHTML = `
        <div class="lk-npc-bubble__plate"><i></i><b id="npc-bubble-speaker">NPC</b></div>
        <span id="npc-bubble-badge" class="lk-npc-mark" data-mark="talk" aria-hidden="true"></span>
        <p id="npc-bubble-text" class="lk-npc-bubble__text">Hello, traveler!</p>
      `;
      document.body.appendChild(el);
    }
    this.speechBubbleEl = el;
  }

  async init(currentMapDef = null) {
    const isDojo = currentMapDef ? Boolean(currentMapDef.id === 'zone_2_2' || (currentMapDef.gx === 2 && currentMapDef.gy === 2) || currentMapDef.hasDojo) : true;
    await this._spawnMasterPaladill(isDojo);
    if (currentMapDef) {
      await this.loadZoneNPCs(currentMapDef);
    }
  }

  async _spawnMasterPaladill(initialVisible = true) {
    const existing = this.npcs.find(n => n.id === 'paladill');
    if (existing) {
      existing.group.visible = Boolean(initialVisible);
      return existing;
    }

    const paladillGroup = new THREE.Group();
    let px = -90.3;
    let py = 0.0;
    let pz = 63.3;
    if (this.overworldManager && typeof this.overworldManager.getGroundHeight === 'function') {
      py = this.overworldManager.getGroundHeight(px, pz);
    }
    paladillGroup.position.set(px, py, pz);
    paladillGroup.rotation.y = Math.PI;
    paladillGroup.visible = Boolean(initialVisible);


    // Model loading
    let mixer = null;
    let idleAction = null;
    const actions = {};

    try {
      const gltf = await this.gltfLoader.loadAsync('./assets/models/paladill.glb');
      const model = gltf.scene;

      model.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      rawBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      // Scaled to match player character current height (2.80m)
      const targetHeight = 2.80;
      const s = maxDim > 0 ? (targetHeight / maxDim) : 1.0;
      model.scale.set(s, s, s);
      model.updateMatrixWorld(true);

      const scaledBox = new THREE.Box3().setFromObject(model);
      model.position.y = Math.max(0, -scaledBox.min.y);
      model.rotation.y = 0;

      model.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      paladillGroup.add(model);

      // Apply Inverted Hull Toon Outline
      applyToonOutline(model, {
        thickness: 0.012,
        color: 0x15161e,
        mode: 'view'
      });

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(clip => {
          actions[clip.name] = mixer.clipAction(clip);
        });
        idleAction = actions['Idle'] || actions['idle'] || actions['sword.idle'] || (gltf.animations[0] && actions[gltf.animations[0].name]);
        if (idleAction) idleAction.play();
      }
    } catch (e) {
      console.warn('[NPCManager] Fallback for paladill.glb:', e);
      const fallbackGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
      const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      fallbackMesh.position.y = 0.9;
      paladillGroup.add(fallbackMesh);
    }

    this.scene.add(paladillGroup);

    const npc = {
      id: 'paladill',
      name: 'Master Paladill',
      title: 'Dojo Mentor',
      avatar: './assets/portraits/paladill.png',
      bubbleQuote: 'The discipline of the dojo forges the spirit!',
      bubbleHeight: 4.2,
      group: paladillGroup,
      mixer: mixer,
      actions: actions,
      idleAction: idleAction,
      auraMesh: null,
      radius: 1.4,
      interactRadius: 4.0,
      calloutRadius: 7.5,
      zoneId: 'zone_2_2',
      defaultRotation: Math.PI,
      onInteract: () => this._handlePaladillInteraction()
    };

    this.npcs.push(npc);
  }

  _createNameplateSprite(name, title, strokeColor = '#38bdf8') {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    // Rounded rectangle background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(10, 10, 380, 80, 14);
    ctx.fill();
    ctx.stroke();

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 200, 44);

    // Title subtitle text
    ctx.fillStyle = strokeColor;
    ctx.font = '18px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(title, 200, 72);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.2, 0.8, 1);
    return sprite;
  }

  _disposeNPC(npc) {
    if (!npc) return;
    if (this.collisions) {
      this.collisions.removeCirclesByTag('npc_' + npc.id);
      if (npc.heroId) this.collisions.removeCirclesByTag('npc_' + npc.heroId);
      if (typeof this.collisions.removeCircleAt === 'function' && npc.group) {
        this.collisions.removeCircleAt(npc.group.position.x, npc.group.position.z, 2.0);
      }
    }
    if (npc.mixer) {
      npc.mixer.stopAllAction();
      if (typeof npc.mixer.uncacheRoot === 'function') {
        npc.mixer.uncacheRoot(npc.group);
      }
    }
    if (this.nearbyNPC && this.nearbyNPC.id === npc.id) {
      this.nearbyNPC = null;
      if (this.interactionPromptEl) this.interactionPromptEl.classList.add('hidden');
    }
    if (this.nearbyBubbleNPC && this.nearbyBubbleNPC.id === npc.id) {
      this.nearbyBubbleNPC = null;
      if (this.speechBubbleEl) this.speechBubbleEl.classList.add('hidden');
    }
    if (npc.group) {
      if (npc.group.parent) {
        npc.group.parent.remove(npc.group);
      }
      npc.group.traverse(child => {
        if (child.isMesh || child.isSkinnedMesh || child.isSprite) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => {
              for (const k of Object.keys(m)) {
                const val = m[k];
                if (val && val.isTexture) {
                  val.dispose();
                  if (val.image && typeof val.image.close === 'function') {
                    try { val.image.close(); } catch (_) {}
                  }
                  val.image = null;
                  if (val.source) val.source.data = null;
                }
              }
              m.dispose();
            });
          }
        }
      });
      npc.group.clear();
    }
  }

  async loadZoneNPCs(zoneDef) {
    if (!zoneDef) return;
    const zoneId = zoneDef.id;
    this.currentZoneId = zoneId;
    const isDojo = Boolean(zoneDef.id === 'zone_2_2' || (zoneDef.gx === 2 && zoneDef.gy === 2) || zoneDef.hasDojo);
    const npcsInZone = zoneDef.npcs || [];

    // Preload 3D portraits for all NPCs defined in this zone
    const preloadIds = npcsInZone.map(d => d.avatar || (d.model ? d.model.replace('.glb', '') : d.id)).filter(Boolean);
    if (preloadIds.length > 0 && portraitService && typeof portraitService.preload === 'function') {
      portraitService.preload(preloadIds);
    }

    // 1. Keep Master Paladill (always preserved for Dojo hub) and NPCs that belong to this zone.
    // Dispose all other external zone NPCs to free memory and VRAM.
    const activeNPCs = [];
    for (const npc of this.npcs) {
      if (npc.id === 'paladill') {
        npc.group.visible = isDojo;
        const targetX = -90.3;
        const targetZ = 63.3;
        const targetY = (this.overworldManager && this.overworldManager.demoScenaZone && typeof this.overworldManager.demoScenaZone.getHeight === 'function')
          ? this.overworldManager.demoScenaZone.getHeight(targetX, targetZ)
          : (npc.group.position.y || 0);
        npc.group.position.set(targetX, targetY, targetZ);
        const paladillDef = npcsInZone.find(d => d.id === 'paladill');
        const defaultRot = (paladillDef && paladillDef.rotation !== undefined) ? paladillDef.rotation : Math.PI;
        npc.defaultRotation = defaultRot;
        npc.group.rotation.y = defaultRot;
        if (this.collisions) {
          this.collisions.removeCirclesByTag('npc_paladill');
          if (isDojo) {
            this.collisions.addCircle(targetX, targetZ, 1.2, 'npc_paladill');
          }
        }
        activeNPCs.push(npc);
        continue;
      }

      const belongs = npcsInZone.some(def => def.id === npc.id);
      if (belongs) {
        if (npc.heroId && this.equipmentManager && this.equipmentManager.isHeroUnlocked(npc.heroId)) {
          this._disposeNPC(npc);
        } else {
          npc.group.visible = true;
          activeNPCs.push(npc);
        }
      } else {
        this._disposeNPC(npc);
      }
    }
    this.npcs = activeNPCs;

    // 2. Spawn missing NPCs for this zone
    for (const def of npcsInZone) {
      if (def.id === 'paladill') {
        continue;
      }
      if (def.heroId && this.equipmentManager && this.equipmentManager.isHeroUnlocked(def.heroId)) {
        continue;
      }
      let existing = this.npcs.find(n => n.id === def.id);
      if (existing) {
        existing.group.visible = true;
        const groundY = (this.overworldManager && typeof this.overworldManager.getGroundHeight === 'function')
          ? this.overworldManager.getGroundHeight(def.position.x, def.position.z)
          : (def.position.y || 0);
        existing.group.position.set(def.position.x, groundY, def.position.z);
        if (def.rotation !== undefined) {
          const rotVal = Math.abs(def.rotation) > Math.PI * 2 ? (def.rotation * Math.PI / 180) : def.rotation;
          existing.defaultRotation = rotVal;
          existing.group.rotation.y = rotVal;
        }
        if (this.collisions && (existing.isStatue || existing.isStatic)) {
          this.collisions.removeCirclesByTag('npc_' + existing.id);
          this.collisions.addCircle(def.position.x, def.position.z, existing.radius || 0.95, 'npc_' + existing.id);
        }
        continue;
      }

      await this._spawnGenericNPC(def, zoneId);
    }
  }

  async _spawnGenericNPC(def, zoneId) {
    if (this.currentZoneId && this.currentZoneId !== zoneId) return;

    const group = new THREE.Group();
    const groundY = (this.overworldManager && typeof this.overworldManager.getGroundHeight === 'function')
      ? this.overworldManager.getGroundHeight(def.position.x, def.position.z)
      : (def.position.y || 0);
    group.position.set(def.position.x, groundY, def.position.z);
    const initialRot = def.rotation !== undefined
      ? (Math.abs(def.rotation) > Math.PI * 2 ? (def.rotation * Math.PI / 180) : def.rotation)
      : 0;
    group.rotation.y = initialRot;

    const isStatue = !!(def.isStatue || def.isStatic || def.id === 'atia_spirit' || (def.model && def.model.includes('statue')));
    const isFox = def.model && def.model.includes('fox');

    // Holy spirit radiance light for statues channeling divine presence
    let spiritLight = null;
    if (isStatue) {
      spiritLight = new THREE.PointLight(0x7df9ff, 1.8, 6.0);
      spiritLight.position.set(0, 1.8, 0.4);
      group.add(spiritLight);
    }


    // Load Model or Stylized Mesh
    let mixer = null;
    let idleAction = null;
    const actions = {};
    let scaledBox = null;

    const modelPath = `./assets/models/${def.model || 'fox.glb'}`;
    try {
      const gltf = await this.gltfLoader.loadAsync(modelPath);

      // If zone changed during download, abort and clean up
      if (this.currentZoneId && this.currentZoneId !== zoneId) {
        group.traverse(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach(m => m.dispose());
          }
        });
        group.clear();
        return;
      }

      const model = gltf.scene;

      // Auto-normalize model scale to match player scale (target height 2.80m)
      model.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      rawBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      let s = 1.0;
      if (maxDim > 0) {
        const isSapidae = def.model && def.model.includes('sapidae');
        const defaultHeight = isSapidae ? 2.80 : 2.70;
        const targetHeight = (def.scale && def.scale >= 2.0)
          ? def.scale
          : (def.scale ? def.scale * (2.80 / 1.55) : defaultHeight);
        s = targetHeight / maxDim;
      }
      // Explicit safeguard for fox or very large rigged models
      if (def.model && def.model.includes('fox')) {
        s = Math.min(s, 0.032);
      }
      model.scale.set(s, s, s);
      model.updateMatrixWorld(true);

      // Ground feet at y = 0
      scaledBox = new THREE.Box3().setFromObject(model);
      model.position.y = Math.max(0, -scaledBox.min.y);
      model.rotation.y = 0;

      model.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      group.add(model);

      // Apply Inverted Hull Toon Outline (Stylized cartoon outline)
      applyToonOutline(model, {
        thickness: def.outlineThickness !== undefined ? def.outlineThickness : 0.012,
        color: def.outlineColor !== undefined ? def.outlineColor : 0x15161e,
        mode: 'view'
      });

      if (!isStatue && gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(clip => {
          actions[clip.name] = mixer.clipAction(clip);
        });
        const clipNames = Object.keys(actions);
        const preferredIdleName = clipNames.find(n => n.toLowerCase() === 'sword.idle')
          || clipNames.find(n => n.toLowerCase() === 'hammer.idle')
          || clipNames.find(n => n.toLowerCase() === 'idle')
          || clipNames.find(n => n.toLowerCase().includes('idle'))
          || (gltf.animations[0] && gltf.animations[0].name);
        idleAction = preferredIdleName ? actions[preferredIdleName] : null;
        if (idleAction) idleAction.play();
      }
    } catch (e) {
      console.warn(`[NPCManager] Fallback for ${modelPath}:`, e);
      const fallbackGeo = new THREE.SphereGeometry(0.7, 16, 16);
      const fallbackMat = new THREE.MeshStandardMaterial({ color: (def && def.auraColor) || 0xffd27a });
      const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      fallbackMesh.position.y = 0.7;
      group.add(fallbackMesh);
    }

    if (this.currentZoneId && this.currentZoneId !== zoneId) {
      this._disposeNPC({ group, mixer });
      return;
    }

    this.scene.add(group);

    const npcObj = {
      id: def.id,
      name: def.name,
      title: def.title || 'Inhabitant',
      avatar: def.avatar || def.portrait || (def.heroId ? `./assets/portraits/${def.heroId}.png` : (def.model ? def.model.replace('.glb', '') : def.id)),
      questId: def.questId || null,
      heroId: def.heroId || null,
      bubbleQuote: def.bubbleQuote || null,
      bubbleHeight: def.bubbleHeight ? (def.bubbleHeight >= 3.8 ? def.bubbleHeight : def.bubbleHeight * (2.80 / 1.55)) : (scaledBox ? Math.max(4.0, scaledBox.max.y + 0.95) : 4.0),
      group: group,
      mixer: mixer,
      actions: actions,
      idleAction: idleAction,
      auraMesh: null,
      isStatue: isStatue,
      isStatic: isStatue || !!def.isStatic,
      spiritLight: spiritLight,
      radius: def.collisionRadius !== undefined ? (def.collisionRadius >= 1.2 ? def.collisionRadius : def.collisionRadius * (2.80 / 1.55)) : (isFox ? 0.65 : (isStatue ? 1.5 : 1.15)),
      interactRadius: 4.0,
      calloutRadius: 7.5,
      zoneId: zoneId,
      defaultRotation: initialRot,
      onInteract: () => {
        if (def.type === 'ferry') {
          return this._handleFerryInteraction(npcObj);
        }
        if (def.type === 'merchant') {
          return this._handleMerchantInteraction(npcObj, def.shopId);
        }
        if (def.id === 'sentinel') {
          return this._handleSentinelInteraction(npcObj);
        }
        if (def.id === 'oracle') {
          return this._handleOracleInteraction(npcObj);
        }
        if (def.id === 'polar_sage') {
          return this._handlePolarSageInteraction(npcObj);
        }
        return this._handleGenericNPCInteraction(npcObj);
      }
    };

    this.npcs.push(npcObj);

    if (this.collisions && (isStatue || def.isStatic)) {
      this.collisions.addCircle(def.position.x, def.position.z, npcObj.radius, 'npc_' + def.id);
    }
  }

  /** Pomodoro the ferryman: opens the island selection (replaces the cardinal portal arrows). */
  _handleFerryInteraction(npc) {
    if (this.dialogSystem.isActive) return;
    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }
    const om = this.overworldManager;
    const tm = om && om.worldMapManager ? om.worldMapManager.transitionManager : null;
    if (tm && tm.portalsLocked) {
      this.dialogSystem.startDialogue([{
        speaker: npc.name,
        title: npc.title,
        avatar: npc.avatar,
        text: '¡Todavía no podemos zarpar! El Maestro Paladill quiere que termines tu primer entrenamiento antes de dejar la isla.'
      }]);
      return;
    }
    this.dialogSystem.startDialogue([{
      speaker: npc.name,
      title: npc.title,
      avatar: npc.avatar,
      text: '¡Hola, viajero! Mi barca conoce todas las corrientes de Lunacia. Dime a qué isla quieres ir y zarpamos.'
    }], () => {
      this.hideAllOverlays();
      if (!this.ferryTravelUI) this.ferryTravelUI = new FerryTravelUI(om);
      this.ferryTravelUI.open();
    });
  }

  /** Mercader: un saludo y se abre la Tienda (ui/ShopPanel.js la registra en overworldManager.shopModal). */
  _handleMerchantInteraction(npc, shopId = 'dojo_valley') {
    if (this.dialogSystem.isActive) return;
    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }
    const shop = this.overworldManager?.shopModal;
    this.dialogSystem.startDialogue([{
      speaker: npc.name,
      title: npc.title,
      avatar: npc.avatar,
      text: '¡Bienvenido a mi puesto! Tengo materiales para la forja, comida para tu axie, pociones y algo de equipo. Y si te sobra algo, te lo compro.'
    }], () => {
      this.hideAllOverlays();
      shop?.open(shopId);
    });
  }

  _handleGenericNPCInteraction(npc) {
    if (this.dialogSystem.isActive) return;

    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }

    const quest = npc.questId && this.questManager ? this.questManager.getQuest(npc.questId) : null;

    // 1. RECRUIT NPCs (Bing & Pomodoro)
    if (npc.heroId) {
      const isAlreadyUnlocked = this.equipmentManager && this.equipmentManager.isHeroUnlocked(npc.heroId);

      if (isAlreadyUnlocked) {
        npc.group.visible = false;
        this.hideAllOverlays();
        return;
      }

      if (quest) {
        // LINEARITY CHECK: If recruit's quest is locked or predecessor main quest not completed, block recruitment!
        if (quest.status === 'locked' || (this.questManager && !this.questManager.isMainQuestUnlocked(quest.id))) {
          const lockedText = npc.heroId === 'pomodoro'
            ? 'Brrr! The polar cold and blizzard are relentless. You must first secure the Savannah and complete your deeds alongside the Sentinel before we can face this ice together.'
            : 'Greetings! Master Paladill awaits you at the Dojo. Complete your initial training before fighting in the forest.';
          const dialog = [
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: lockedText
            }
          ];
          this.dialogSystem.startDialogue(dialog);
          return;
        }

        const findStep = quest.objective?.steps?.find(s => s.id === 'find_bing' || s.id === 'reach_arctic');
        const battleStep = quest.objective?.steps?.find(s => s.id === 'defend_bing' || s.id === 'defend_pomodoro');
        const recruitStep = quest.objective?.steps?.find(s => s.id === 'recruit_bing' || s.id === 'recruit_pomodoro');

        // Condition A: Battle in this zone is already won AND intro completed -> Complete recruitment dialogue!
        if (battleStep && battleStep.done && (!findStep || findStep.done)) {
          const heroBadge = npc.heroId === 'bing' ? '🐶 BING HAS JOINED THE SQUAD!' : '🍳 POMODORO HAS JOINED THE SQUAD!';
          const dialog = [
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: `We fought with great courage! Those chimeras stood no chance against our combined tactics.`
            },
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: `As I promised, I officially join your squad. From now on I will travel with you across all of Lunacia.`
            }
          ];

          this.dialogSystem.startDialogue(dialog, () => {
            if (recruitStep) {
              this.questManager.advanceStep(quest.id, recruitStep.id, true);
            }
            this.questManager.completeQuest(quest.id);
            if (this.equipmentManager) {
              this.equipmentManager.unlockHero(npc.heroId);
            }
            // Disappear permanently from this macro zone
            npc.group.visible = false;
            if (this.collisions) {
              this.collisions.removeCirclesByTag('npc_' + npc.id);
              if (npc.heroId) this.collisions.removeCirclesByTag('npc_' + npc.heroId);
              if (typeof this.collisions.removeCircleAt === 'function' && npc.group) {
                this.collisions.removeCircleAt(npc.group.position.x, npc.group.position.z, 2.0);
              }
            }
            this.hideAllOverlays();
            this._showBannerMessage(heroBadge, `${npc.name} will now fight permanently by your side across all regions.`);
          });
          return;
        }

        // Condition B: Already took the mission (findStep done), but battle is NOT yet won -> Re-initiate combat!
        if (findStep && findStep.done) {
          if (npc.heroId === 'bing') {
            const dialog = [
              {
                speaker: npc.name,
                title: npc.title,
                avatar: npc.avatar,
                text: 'The savannah chimeras are back for my ice cream! Cover my flank with your cards, I\'ll bounce my Toy Ball at them and keep everyone\'s spirits up!'
              }
            ];
            this.dialogSystem.startDialogue(dialog, () => {
              if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
                this.overworldManager.triggerDirectQuestBattle('mob_bing_ambush', 'savannah');
              }
            });
            return;
          }

          if (npc.heroId === 'pomodoro') {
            const dialog = [
              {
                speaker: npc.name,
                title: npc.title,
                avatar: npc.avatar,
                text: 'The cold is biting and the ice chimeras are attacking again! Hold the frontline, I\'ll raise my frying pan and shield the whole squad!'
              }
            ];
            this.dialogSystem.startDialogue(dialog, () => {
              if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
                this.overworldManager.triggerDirectQuestBattle('mob_pomodoro_battle', 'arctic');
              }
            });
            return;
          }

          const reminderText = 'The cold is biting! The ice chimeras surround us. Enter combat and I\'ll shield your squad!';
          const dialog = [
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: reminderText
            }
          ];
          this.dialogSystem.startDialogue(dialog);
          return;
        }

        // Condition C: First interaction with this NPC -> Accept mission & launch surprise ambush for Bing / Pomodoro
        if (npc.heroId === 'bing') {
          const dialog = [
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: 'Woof! Reinforcements at last! WATCH OUT BEHIND YOU! A chimera ambush is after my ice cream! Let\'s fight shoulder to shoulder, I\'ll cheer you on!'
            }
          ];
          this.dialogSystem.startDialogue(dialog, () => {
            if (findStep) {
              this.questManager.advanceStep(quest.id, findStep.id, true);
            }
            if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
              this.overworldManager.triggerDirectQuestBattle('mob_bing_ambush', 'savannah');
            }
          });
          return;
        }

        if (npc.heroId === 'pomodoro') {
          const dialog = [
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: 'By the leaves of Atia! WATCH OUT, THEY\'RE ATTACKING! A pack of glacial chimeras surrounds us in the ice! Let\'s join forces, I will shield your squad!'
            }
          ];
          this.dialogSystem.startDialogue(dialog, () => {
            if (findStep) {
              this.questManager.advanceStep(quest.id, findStep.id, true);
            }
            if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
              this.overworldManager.triggerDirectQuestBattle('mob_pomodoro_battle', 'arctic');
            }
          });
          return;
        }
      }
    }

    // 2. QUEST GIVERS (Misiones Secundarias y Principales)
    if (quest) {
      // Linearity Check: If main quest is locked, do not offer/progress
      if (quest.category === 'Principal' && (quest.status === 'locked' || (this.questManager && !this.questManager.isMainQuestUnlocked(quest.id)))) {
        const dialog = [
          {
            speaker: npc.name,
            title: npc.title,
            avatar: npc.avatar,
            text: 'You are not yet ready for this challenge, traveler. Check your Quest Book [J] and complete your current main quest first.'
          }
        ];
        this.dialogSystem.startDialogue(dialog);
        return;
      }

      if (quest.status === 'ready_to_turn_in') {
        // Complete Quest Dialogue
        const dialog = [
          {
            speaker: npc.name,
            title: npc.title,
            avatar: npc.avatar,
            text: `Extraordinary work, {heroName}! You have fulfilled all objectives. Here is your well-deserved reward.`
          }
        ];
        this.dialogSystem.startDialogue(dialog, () => {
          const res = this.questManager.completeQuest(quest.id);
          this._showBannerMessage('🎉 QUEST COMPLETED!', `${quest.title} — Rewards claimed.`);
        });
        return;
      }

      if (quest.status === 'active') {
        // Special case: Quest Lost Mail (Cartero) direct combat re-try or turn in
        if (quest.id === 'quest_lost_mail') {
          const findStep = quest.objective?.steps?.find(s => s.id === 'find_mail');
          if (findStep && !findStep.done) {
            const dialog = [
              {
                speaker: npc.name,
                title: npc.title,
                avatar: npc.avatar,
                text: 'The raiders are still lurking with my bags of royal letters! Please face them once again!'
              }
            ];
            this.dialogSystem.startDialogue(dialog, () => {
              if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
                this.overworldManager.triggerDirectQuestBattle('mob_postman_bandits', 'forest');
              }
            });
            return;
          }
        }

        // Special case: Quest Shadow Mirror (Chamán Espiritual) direct combat re-try or turn in
        if (quest.id === 'quest_shadow_mirror') {
          const defeatStep = quest.objective?.steps?.find(s => s.id === 'defeat_shadow');
          if (defeatStep && !defeatStep.done) {
            const dialog = [
              {
                speaker: npc.name,
                title: npc.title,
                avatar: npc.avatar,
                text: 'The illusory shadow still lurks at the mirror threshold... Would you like to enter combat again?'
              }
            ];
            this.dialogSystem.startDialogue(dialog, () => {
              if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
                this.overworldManager.triggerDirectQuestBattle('mob_shadow_mirror', 'mystic');
              }
            });
            return;
          }
        }

        // In-progress dialogue: Check if the pending step is an interaction step with this NPC!
        const pendingStep = quest.objective.steps.find(s => !s.done);
        if (pendingStep) {
          const isTalkOrReport = pendingStep.id.startsWith('talk_') ||
                                 pendingStep.id.startsWith('report_') ||
                                 pendingStep.id.startsWith('deliver_') ||
                                 pendingStep.id.startsWith('return_') ||
                                 pendingStep.id.startsWith('purify_') ||
                                 pendingStep.id.startsWith('restore_') ||
                                 pendingStep.desc.toLowerCase().includes('hablar') ||
                                 pendingStep.desc.toLowerCase().includes('reportar') ||
                                 pendingStep.desc.toLowerCase().includes('entregar') ||
                                 pendingStep.desc.toLowerCase().includes('devolver') ||
                                 pendingStep.desc.toLowerCase().includes('llevar') ||
                                 pendingStep.desc.toLowerCase().includes('demostrar') ||
                                 pendingStep.desc.toLowerCase().includes('probar') ||
                                 pendingStep.desc.toLowerCase().includes('reunirte') ||
                                 pendingStep.desc.toLowerCase().includes('informar') ||
                                 pendingStep.desc.toLowerCase().includes('consagrar') ||
                                 pendingStep.desc.toLowerCase().includes('talk') ||
                                 pendingStep.desc.toLowerCase().includes('speak') ||
                                 pendingStep.desc.toLowerCase().includes('report') ||
                                 pendingStep.desc.toLowerCase().includes('deliver') ||
                                 pendingStep.desc.toLowerCase().includes('return') ||
                                 pendingStep.desc.toLowerCase().includes('purify') ||
                                 pendingStep.desc.toLowerCase().includes('restore') ||
                                 pendingStep.desc.toLowerCase().includes('bring') ||
                                 pendingStep.desc.toLowerCase().includes('prove') ||
                                 pendingStep.desc.toLowerCase().includes('meet') ||
                                 pendingStep.desc.toLowerCase().includes('consecrate');

          const otherStepsDone = quest.objective.steps.filter(s => s.id !== pendingStep.id).every(s => s.done);

          if (isTalkOrReport && otherStepsDone) {
            let customFinishText = `Excellent work, {heroName}! You have accomplished your task. Here is your reward.`;
            if (quest.id === 'quest_lost_mail') customFinishText = 'My letters! You recovered them all! You saved my job, adventurer! Take this reward for your bravery.';
            else if (quest.id === 'quest_forest_elixir') customFinishText = 'Oh, what pure glow this luminous moss has! I will prepare a revitalizing salve at once. Here, this is for you.';
            else if (quest.id === 'quest_nomad_steel') customFinishText = 'By fire and hammer! This carapace ore is of the highest quality. Take your well-deserved obsidian dagger!';
            else if (quest.id === 'quest_keen_eye_trial') customFinishText = 'I observed your combat in the savannah! Flawless aim and composure. Take this precision sight.';
            else if (quest.id === 'quest_blizzard_stew') customFinishText = 'It smells wonderful! With these 3 polar mushrooms, the stew will keep everyone warm on the glacier. Take this thermal cauldron!';
            else if (quest.id === 'quest_fallen_stardust') customFinishText = 'The cosmic glow of these 3 fragments is wondrous! You have tuned with the stars. Receive this prism.';
            else if (quest.id === 'quest_shadow_mirror') customFinishText = 'You shattered the dark mirror illusion! Your mind and spirit are now incorruptible. Receive this talisman.';

            const dialog = [
              {
                speaker: npc.name,
                title: npc.title,
                avatar: npc.avatar,
                text: customFinishText
              }
            ];
            this.dialogSystem.startDialogue(dialog, () => {
              this.questManager.advanceStep(quest.id, pendingStep.id, true);
              this.questManager.completeQuest(quest.id);
              this._showBannerMessage('🎉 QUEST COMPLETED!', `${quest.title} — Rewards claimed.`);
            });
            return;
          }
        }

        // Specific reminder dialogues with clear location instructions
        let reminderText = null;
        if (quest.id === 'quest_forest_elixir') {
          reminderText = 'Look for the glowing sprout by the stream in this forest [2, 2] to obtain the luminous moss.';
        } else if (quest.id === 'quest_nomad_steel') {
          reminderText = 'The Armored Chimera roams east of the canyon in this savannah [3, 1]. Defeat it and bring me its carapace!';
        } else if (quest.id === 'quest_keen_eye_trial') {
          reminderText = 'Triumph in tactical combat against any group of savannah chimeras in this territory [3, 1].';
        } else if (quest.id === 'quest_blizzard_stew') {
          reminderText = 'Collect the 3 polar mushrooms in the snow of this quadrant [2, 1] and bring them to my cauldron.';
        } else if (quest.id === 'quest_fallen_stardust') {
          reminderText = 'Gather the 3 stardust fragments among the arcane mists of this region [1, 2].';
        }

        const desc = reminderText || (pendingStep ? pendingStep.desc : 'Check your Quest Book [J]');
        const dialog = [
          {
            speaker: npc.name,
            title: npc.title,
            avatar: npc.avatar,
            text: desc
          }
        ];
        this.dialogSystem.startDialogue(dialog);
        return;
      }

      if (quest.status === 'available') {
        // Special Offer Dialogue for Cartero: Direct Combat
        if (quest.id === 'quest_lost_mail') {
          const dialog = [
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: 'Please help me! I was ambushed by lesser chimeras and they stole my sacks of royal mail!'
            },
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: 'Wait a second... WATCH OUT, HERE THEY COME TO RAID US AGAIN!'
            }
          ];
          this.dialogSystem.startDialogue(dialog, () => {
            this.questManager.activateQuest(quest.id);
            this.questManager.advanceStep(quest.id, 'talk_postman', true);
            if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
              this.overworldManager.triggerDirectQuestBattle('mob_postman_bandits', 'forest');
            }
          });
          return;
        }

        // Special Offer Dialogue for Chamán Espiritual: Direct Combat
        if (quest.id === 'quest_shadow_mirror') {
          const dialog = [
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: 'In this mystical fog, your own shadow will hunt you... Only by tempering your spirit will you dispel the illusion of the dark mirror.'
            },
            {
              speaker: npc.name,
              title: npc.title,
              avatar: npc.avatar,
              text: 'Focus your energy! Look how your shadowy reflection crosses the astral threshold into combat!'
            }
          ];
          this.dialogSystem.startDialogue(dialog, () => {
            this.questManager.activateQuest(quest.id);
            this.questManager.advanceStep(quest.id, 'talk_shaman', true);
            if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
              this.overworldManager.triggerDirectQuestBattle('mob_shadow_mirror', 'mystic');
            }
          });
          return;
        }

        // Standard Offer Quest Dialogue
        const dialog = [
          {
            speaker: npc.name,
            title: npc.title,
            avatar: npc.avatar,
            text: quest.npcQuote || `Greetings, {heroName}! I need your help with a matter of vital importance.`
          },
          {
            speaker: npc.name,
            title: npc.title,
            avatar: npc.avatar,
            text: quest.objective.summary
          },
          {
            speaker: npc.name,
            title: npc.title,
            avatar: npc.avatar,
            text: `I have logged this quest in your Quest Book [J]! Best of luck, adventurer.`
          }
        ];
        this.dialogSystem.startDialogue(dialog, () => {
          this.questManager.activateQuest(quest.id);
          // If the quest has a first step of talking to this NPC, mark it done!
          const firstStep = quest.objective?.steps?.[0];
          if (firstStep && (firstStep.id.startsWith('talk_') || firstStep.desc.toLowerCase().includes('hablar') || firstStep.desc.toLowerCase().includes('aceptar') || firstStep.desc.toLowerCase().includes('talk') || firstStep.desc.toLowerCase().includes('accept'))) {
            this.questManager.advanceStep(quest.id, firstStep.id, true);
          }
          if (this.overworldManager && this.overworldManager.questInteractables) {
            const curMap = this.overworldManager.worldMapManager?.currentMapDef;
            const zoneKey = curMap ? `${curMap.gx}_${curMap.gy}` : '2_2';
            this.overworldManager.questInteractables.loadForZone(zoneKey);
          }
          this._showBannerMessage('📜 NEW QUEST!', `${quest.title} logged in your Quest Book.`);
        });
        return;
      }

      if (quest.status === 'completed') {
        const dialog = [
          {
            speaker: npc.name,
            title: npc.title,
            avatar: npc.avatar,
            text: `Thank you again for your invaluable aid, {heroName}! May the light of the Atia Tree illuminate your path.`
          }
        ];
        this.dialogSystem.startDialogue(dialog);
        return;
      }
    }

    // 3. Ambient Dialogue for other inhabitants
    const ambientDialog = [
      {
        speaker: npc.name,
        title: npc.title,
        avatar: npc.avatar,
        text: npc.bubbleQuote || `Greetings! May the wisdom of Atia accompany your journey.`
      }
    ];
    this.dialogSystem.startDialogue(ambientDialog);
  }

  _handleSentinelInteraction(npc) {
    if (this.dialogSystem.isActive) return;

    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }

    const q3 = this.questManager ? this.questManager.getQuest('quest_hostile_sands') : null;
    const q4 = this.questManager ? this.questManager.getQuest('quest_hunt_beaked_chimera') : null;

    // 1. Linearity: Check if Quest #3 is not yet reached
    if (!q3 || q3.status === 'locked' || !this.questManager.isMainQuestUnlocked('quest_hostile_sands')) {
      const dialogue = [
        {
          speaker: 'Desert Sentinel',
          title: 'Dune Watcher',
          avatar: 'kibo',
          text: 'Halt, traveler! The Savannah dunes blaze with danger and ferocious chimeras. You must forge your squad and prove your worth in the Forest before crossing into this territory.'
        }
      ];
      this.dialogSystem.startDialogue(dialogue);
      return;
    }

    // 2. Quest #3 (quest_hostile_sands) is ACTIVE or READY
    if (q3.status === 'active' || q3.status === 'ready_to_turn_in') {
      // Step 1: cross_to_savannah is guaranteed done if player is here talking to sentinel
      const crossStep = q3.objective?.steps?.find(s => s.id === 'cross_to_savannah');
      if (crossStep && !crossStep.done) crossStep.done = true;

      const dialogue = [
        {
          speaker: 'Desert Sentinel',
          title: 'Dune Watcher',
          avatar: 'kibo',
          text: 'Reinforcements from the Lunacia Dojo at last! I see you bring Bing, that cheerful pup, with you. The heat of the Savannah and the dune chimeras are relentless.'
        },
        {
          speaker: 'Desert Sentinel',
          title: 'Dune Watcher',
          avatar: 'kibo',
          text: 'You have secured this border outpost. Take this Arid Wind Turban as a decoration from the nomad guard.'
        },
        {
          speaker: 'Desert Sentinel',
          title: 'Dune Watcher',
          avatar: 'kibo',
          text: 'But we cannot rest: a dangerous pack of Beaked Chimeras led by an alpha male dominates the Arid Wastes in [3, 1], cutting off the route to the frozen north. You must travel to [3, 1] and defeat the alpha male to clear the path to the Arctic!'
        }
      ];

      this.dialogSystem.startDialogue(dialogue, () => {
        this.questManager.advanceStep('quest_hostile_sands', 'talk_sentinel', true);
        this.questManager.completeQuest('quest_hostile_sands');
        // Player is already on Savannah Island, advance reach_wastes so the hunt begins immediately
        this.questManager.advanceStep('quest_hunt_beaked_chimera', 'reach_wastes', true);
        this._showBannerMessage('🎉 QUEST COMPLETED!', 'Hostile Sands — Rewards claimed.');
        if (this.overworldManager) {
          if (this.overworldManager.monsters && typeof this.overworldManager.monsters.ensureSavannahQuestMonsters === 'function') {
            this.overworldManager.monsters.ensureSavannahQuestMonsters();
          }
          if (this.overworldManager.questDescEl) {
            this.overworldManager.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
          }
          if (typeof this.overworldManager._updateQuestNavigation === 'function') {
            this.overworldManager._updateQuestNavigation();
          }
        }
      });
      return;
    }

    // 3. Quest #4 (quest_hunt_beaked_chimera) is ACTIVE or READY
    if (q4 && (q4.status === 'active' || q4.status === 'ready_to_turn_in')) {
      const reachStep = q4.objective?.steps?.find(s => s.id === 'reach_wastes');
      if (reachStep && !reachStep.done) {
        this.questManager.advanceStep('quest_hunt_beaked_chimera', 'reach_wastes', true);
      }

      const alphaStep = q4.objective?.steps?.find(s => s.id === 'defeat_beaked_alpha');
      
      if (!alphaStep || !alphaStep.done) {
        // Battle not won yet -> Sentinel marks and directs player to the Beaked Chimera pack
        const dialogue = [
          {
            speaker: 'Desert Sentinel',
            title: 'Dune Watcher',
            avatar: 'kibo',
            text: 'I have marked the Beaked Chimera territory in the western canyon plateau on your compass! Track down the pack at [-40, -8] and defeat the alpha male in tactical combat!'
          }
        ];
        this.dialogSystem.startDialogue(dialogue, () => {
          if (this.overworldManager) {
            if (this.overworldManager.monsters && typeof this.overworldManager.monsters.ensureSavannahQuestMonsters === 'function') {
              this.overworldManager.monsters.ensureSavannahQuestMonsters();
            }
            if (this.overworldManager.questDescEl) {
              this.overworldManager.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
            }
            if (typeof this.overworldManager._updateQuestNavigation === 'function') {
              this.overworldManager._updateQuestNavigation();
            }
          }
        });
        return;
      } else {
        // Battle is won -> Turn in quest #4!
        const dialogue = [
          {
            speaker: 'Desert Sentinel',
            title: 'Dune Watcher',
            avatar: 'kibo',
            text: 'By the dunes of Lunacia, you have triumphed! I can feel calm returning to the Savannah following the fall of the alpha Beaked Chimera.'
          },
          {
            speaker: 'Desert Sentinel',
            title: 'Dune Watcher',
            avatar: 'kibo',
            text: 'Here is your promised Reinforced Leather Shield. The northern route toward Polar Frost Ridge in [4, 1] is now fully open. March to the snow and seek Pomodoro!'
          }
        ];

        this.dialogSystem.startDialogue(dialogue, () => {
          this.questManager.advanceStep('quest_hunt_beaked_chimera', 'report_hunt', true);
          this.questManager.completeQuest('quest_hunt_beaked_chimera');
          this._showBannerMessage('🎉 QUEST COMPLETED!', 'Hunt of the Beaked Chimera — Rewards claimed.');
          if (this.overworldManager) {
            if (this.overworldManager.questDescEl) {
              this.overworldManager.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
            }
            if (typeof this.overworldManager._updateQuestNavigation === 'function') {
              this.overworldManager._updateQuestNavigation();
            }
          }
        });
        return;
      }
    }

    // 4. Quest #4 already completed -> Post-hunt ambient dialogue
    if (q4 && q4.status === 'completed') {
      const dialogue = [
        {
          speaker: 'Desert Sentinel',
          title: 'Dune Watcher',
          avatar: 'kibo',
          text: 'Caravans cross the Savannah once again thanks to your courage! Pomodoro awaits you at Polar Frost Ridge in [4, 1]. May Atia guide your path!'
        }
      ];
      this.dialogSystem.startDialogue(dialogue);
      return;
    }
  }

  _handleOracleInteraction(npc) {
    if (this.dialogSystem.isActive) return;

    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }

    const q7 = this.questManager ? this.questManager.getQuest('quest_astral_void_echoes') : null;
    const q8 = this.questManager ? this.questManager.getQuest('quest_forbidden_resonance') : null;
    const q9 = this.questManager ? this.questManager.getQuest('quest_sulfur_threshold') : null;

    // 0. Prerequisite recovery: If quest 6 (El Núcleo de la Ventisca) was stuck with golem defeated, auto-resolve
    if (this.questManager) {
      const q6 = this.questManager.getQuest('quest_blizzard_core');
      if (q6 && q6.status !== 'completed') {
        const golemDone = q6.objective?.steps?.find(s => s.id === 'defeat_golem')?.done;
        if (golemDone) {
          const reachStep = q6.objective?.steps?.find(s => s.id === 'reach_peaks');
          if (reachStep) reachStep.done = true;
          this.questManager.completeQuest('quest_blizzard_core');
        }
      }
    }

    // 1. Linearity: Prior main quests (Quests 1..6) not completed yet
    if (!q7 || q7.status === 'locked' || !this.questManager.isMainQuestUnlocked('quest_astral_void_echoes')) {
      const dialogue = [
        {
          speaker: 'Astral Oracle',
          title: 'Voice of the Constellations',
          avatar: 'sapidae-f-d',
          text: 'The constellations are not yet aligned for you, travelers. You must overcome the challenges of the Forest, the Savannah, and the Polar Valley before the veil of the void can be opened.'
        }
      ];
      this.dialogSystem.startDialogue(dialogue);
      return;
    }

    // 2. Quest #7 (quest_astral_void_echoes) is ACTIVE or READY
    if (q7.status === 'active' || q7.status === 'ready_to_turn_in') {
      // Step 1: enter_mystic is guaranteed done since player reached Oracle in mystic sanctuary
      if (this.questManager) {
        this.questManager.advanceStep('quest_astral_void_echoes', 'enter_mystic', true);
      }

      const dialogue = [
        {
          speaker: 'Astral Oracle',
          title: 'Voice of the Constellations',
          avatar: 'sapidae-f-d',
          text: '{heroName}, Bing, Pomodoro! The stars foretold your arrival. The ether of Lunacia trembles under a strange dimensional distortion.'
        },
        {
          speaker: 'Astral Oracle',
          title: 'Voice of the Constellations',
          avatar: 'sapidae-f-d',
          text: 'Take this Seer Astral Robe as a cosmic blessing for your journey across the Nebula.'
        },
        {
          speaker: 'Astral Oracle',
          title: 'Voice of the Constellations',
          avatar: 'sapidae-f-d',
          text: 'WATCH OUT! In this very Void Sanctuary [1, 3], an Arcane Sapidae Chimera has awakened. It channels a dark resonance and lunges toward us! To arms!'
        }
      ];

      this.dialogSystem.startDialogue(dialogue, () => {
        this.questManager.advanceStep('quest_astral_void_echoes', 'talk_oracle', true);
        this.questManager.completeQuest('quest_astral_void_echoes');
        this._showBannerMessage('🎉 QUEST COMPLETED!', 'Echoes of the Astral Void — Rewards claimed.');
        if (this.questManager) {
          this.questManager.advanceStep('quest_forbidden_resonance', 'reach_sanctuary', true);
        }
        // Direct ambush combat against Arcane Chimera!
        if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
          this.overworldManager.triggerDirectQuestBattle('mob_oracle_chimera', 'mystic');
        }
      });
      return;
    }

    // 3. Quest #8 (quest_forbidden_resonance) is ACTIVE or READY
    if (q8 && (q8.status === 'active' || q8.status === 'ready_to_turn_in')) {
      if (this.questManager) {
        this.questManager.advanceStep('quest_forbidden_resonance', 'reach_sanctuary', true);
      }

      const defeatStep = q8.objective?.steps?.find(s => s.id === 'defeat_sapidae');

      if (!defeatStep || !defeatStep.done) {
        // Battle not won yet -> Direct re-try combat!
        const dialogue = [
          {
            speaker: 'Astral Oracle',
            title: 'Voice of the Constellations',
            avatar: 'sapidae-f-d',
            text: 'The void resonance intensifies! The Arcane Sapidae Chimera strikes with distorting bursts. Let us face it at once!'
          }
        ];
        this.dialogSystem.startDialogue(dialogue, () => {
          if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
            this.overworldManager.triggerDirectQuestBattle('mob_oracle_chimera', 'mystic');
          }
        });
        return;
      } else {
        // Battle is won -> Turn in quest #8 and unlock quest #9!
        const dialogue = [
          {
            speaker: 'Astral Oracle',
            title: 'Voice of the Constellations',
            avatar: 'sapidae-f-d',
            text: 'The void resonance has dissipated! Starlight and the ether of Lunacia flow in harmony through this sanctuary once more.'
          },
          {
            speaker: 'Astral Oracle',
            title: 'Voice of the Constellations',
            avatar: 'sapidae-f-d',
            text: 'As a reward from the stars, I grant you the Thread of Fate Ring. It bestows supreme vitality and tactical agility.'
          },
          {
            speaker: 'Astral Oracle',
            title: 'Voice of the Constellations',
            avatar: 'sapidae-f-d',
            text: 'My visions have revealed the primeval origin of this plague: in the south of Lunacia lie the Royal Gardens of Genesis [2, 3], the forbidden sanctuary of the elite. Cross the Sanctuary Gate, defeat its wardens, and unlock the final seal with the Genesis Sanctum Key.'
          }
        ];

        this.dialogSystem.startDialogue(dialogue, () => {
          this.questManager.advanceStep('quest_forbidden_resonance', 'purify_resonance', true);
          this.questManager.completeQuest('quest_forbidden_resonance');
          this._showBannerMessage('🎉 QUEST COMPLETED!', 'The Forbidden Resonance — Rewards claimed.');
        });
        return;
      }
    }

    // 4. Quest #8 completed (Quest #9+ active) -> Ambient cosmic guidance
    if (q8 && q8.status === 'completed') {
      const dialogue = [
        {
          speaker: 'Astral Oracle',
          title: 'Voice of the Constellations',
          avatar: 'sapidae-f-d',
          text: 'The constellations watch over you, {heroName}, Bing, and Pomodoro. Head to the Sanctuary Gate of Genesis in [3, 5]. The fate of the continent rests on your shoulders.'
        }
      ];
      this.dialogSystem.startDialogue(dialogue);
      return;
    }
  }

  _handlePolarSageInteraction(npc) {
    if (this.dialogSystem.isActive) return;

    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }

    const q7 = this.questManager ? this.questManager.getQuest('quest_astral_void_echoes') : null;

    // Linearity check
    if (!q7 || q7.status === 'locked' || !this.questManager.isMainQuestUnlocked('quest_astral_void_echoes')) {
      const dialogue = [
        {
          speaker: 'Polar Sage',
          title: 'Guardian of Ley Lines',
          avatar: 'sapidae-f-c',
          text: 'The constellations tremble before the advance of the void... You must first complete your journey through the Forest and the Arctic before the ley lines permit passage to the Astral Nebula.'
        }
      ];
      this.dialogSystem.startDialogue(dialogue);
      return;
    }

    if (q7.status === 'active') {
      if (this.questManager) {
        this.questManager.advanceStep('quest_astral_void_echoes', 'enter_mystic', true);
      }

      const dialogue = [
        {
          speaker: 'Polar Sage',
          title: 'Guardian of Ley Lines',
          avatar: 'sapidae-f-c',
          text: '{heroName}, Bing, Pomodoro! You have arrived at the threshold of the Astral Nebula [1, 2]. Celestial energies are out of sync and the fabric of reality wears thin.'
        },
        {
          speaker: 'Polar Sage',
          title: 'Guardian of Ley Lines',
          avatar: 'sapidae-f-c',
          text: 'You must travel south to the Astral Void Sanctuary in [1, 4] and meet urgently with the Astral Oracle. Only their cosmic vision can reveal how to restore balance.'
        }
      ];
      this.dialogSystem.startDialogue(dialogue);
      npc.bubbleQuote = 'Seek the Astral Oracle in the Sanctuary [1, 4]!';
      return;
    }

    // Quest 7 completed
    const dialogue = [
      {
        speaker: 'Polar Sage',
        title: 'Guardian of Ley Lines',
        avatar: 'sapidae-f-c',
        text: 'The ley lines in this nebula have begun to heal thanks to your bravery. May the Oracle\'s blessing guide you southward.'
      }
    ];
    this.dialogSystem.startDialogue(dialogue);
  }

  _handlePaladillInteraction() {
    if (this.dialogSystem.isActive) return;

    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }

    const paladill = this.npcs.find(n => n.id === 'paladill');
    if (paladill && paladill.actions && paladill.actions['Greeting']) {
      const greeting = paladill.actions['Greeting'];
      if (paladill.idleAction) paladill.idleAction.fadeOut(0.2);
      greeting.reset().fadeIn(0.2).play();

      setTimeout(() => {
        greeting.fadeOut(0.3);
        if (paladill.idleAction) paladill.idleAction.reset().fadeIn(0.3).play();
      }, 1400);
    }

    // Hito 48: durante el entrenamiento, Paladill habla según el paso del tutorial (TutorialDirector)
    const tut = this.overworldManager?.tutorialManager;
    if (tut && typeof tut.handlePaladill === 'function' && tut.handlePaladill()) return;

    // Synchronize Paladill quest state with QuestManager if available
    if (this.questManager) {
      const q = this.questManager.getQuest('quest_slime_purification');
      if (q) {
        const isDone = (sId) => Boolean(q.objective?.steps?.find(s => s.id === sId)?.done);
        if (isDone('talk_paladill')) this.questState.talkedToPaladill = true;
        if (isDone('defeat_slime') || isDone('defeat_slimes')) this.questState.slimeDefeated = true;
        if (isDone('report_victory') || q.rewardClaimed) this.questState.rewardGiven = true;
        if (isDone('open_doors') || q.status === 'completed') this.questState.doorsUnlocked = true;
      }
    }

    if (!this.questState.talkedToPaladill) {
      // Step 1: Welcome & Mission Assignment
      const dialogue = [
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'May the blessing of Atia be with you, young {heroName}!'
        },
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'For millennia, Lunacia flourished under mystic light. But the Abyss has stirred in the shadows, and its dark energies have corrupted the wildlife, transforming them into dangerous Chimeras.'
        },
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'A Slime Chimera has slipped through the mist and now prowls the eastern garden, just across the stone bridge.'
        },
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'As a Dojo apprentice of the {heroClass} class, your duty is to protect this sanctuary. To begin, check your Quest Book [J]. There you will find the details of your quest!'
        }
      ];

      this.dialogSystem.startDialogue(dialogue, () => {
        this.questState.talkedToPaladill = true;
        if (this.questManager) {
          this.questManager.advanceStep('quest_slime_purification', 'talk_paladill', true);
        }
        if (this.onPaladillInitialTalkComplete) {
          this.onPaladillInitialTalkComplete();
        }
      });
    } else if (!this.questState.slimeDefeated) {
      // Step 2: Reminder during mission
      const dialogue = [
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'Haste, {heroName}! Cross the wooden bridge toward the east garden. The Slime Chimera will strike as soon as you approach its territory. Maintain tactical composure.'
        }
      ];
      this.dialogSystem.startDialogue(dialogue);
    } else if (!this.questState.rewardGiven) {
      // Step 3: Victorious return & Reward Handout (Wood Sword + Gold)
      const dialogue = [
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'A magnificent display of tactical power, {heroName}!'
        },
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'The corrupt core of the Slime Chimera has been purified, and the flow of the Atia Tree nourishes this valley once again.'
        },
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'You have shown the discipline and honor of a true warrior. As a reward, I formally present you with the Dojo Wooden Sword and 150 gold coins.'
        },
        {
          speaker: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          text: 'Open your Inventory by pressing [I] and equip the sword to {heroName} in the weapon slot.'
        }
      ];

      this.dialogSystem.startDialogue(dialogue, () => {
        this.questState.rewardGiven = true;
        if (this.questManager) {
          this.questManager.advanceStep('quest_slime_purification', 'report_victory', true);
          this.questManager.claimRewards('quest_slime_purification');
        }
        if (this.onPaladillRewardDelivered) {
          this.onPaladillRewardDelivered();
        }
      });
    } else if (!this.questState.doorsUnlocked) {
      // Step 4: Check if sword equipped and unlock world doors
      const equippedDict = this.equipmentManager?.equipped || {};
      const anySwordEquipped = Object.values(equippedDict).some(slots => {
        if (!slots) return false;
        return slots.weapon === 'wood_sword' || Object.values(slots).includes('wood_sword');
      });
      const q = this.questManager ? this.questManager.getQuest('quest_slime_purification') : null;
      const stepAlreadyDone = Boolean(q?.objective?.steps?.find(s => s.id === 'equip_sword')?.done) ||
        Boolean(this.questManager && typeof this.questManager.isStepCompleted === 'function' && this.questManager.isStepCompleted('quest_slime_purification', 'equip_sword'));
      const tutorialSwordDone = Boolean(this.tutorialManager && this.tutorialManager.hasEquippedSword);
      const isEquipped = anySwordEquipped || stepAlreadyDone || tutorialSwordDone;

      if (!isEquipped) {
        const dialogue = [
          {
            speaker: 'Master Paladill',
            title: 'Dojo Mentor',
            avatar: './assets/portraits/paladill.png',
            text: 'You haven\'t equipped the Wooden Sword yet! Open your Inventory with [I], click on the sword, and equip it to wield its power.'
          }
        ];
        this.dialogSystem.startDialogue(dialogue);
      } else {
        const dialogue = [
          {
            speaker: 'Master Paladill',
            title: 'Dojo Mentor',
            avatar: './assets/portraits/paladill.png',
            text: 'That sword looks majestic in your hands! I can feel how Atia\'s resonance amplifies every one of your strikes.'
          },
          {
            speaker: 'Master Paladill',
            title: 'Dojo Mentor',
            avatar: './assets/portraits/paladill.png',
            text: 'Your basic training is complete. I have ordered the Dojo gates opened. You now have full access to all 9 macro-zones of Lunacia and your World Map [M].'
          },
          {
            speaker: 'Master Paladill',
            title: 'Dojo Mentor',
            avatar: './assets/portraits/paladill.png',
            text: 'Head east if you seek to test your mettle. Word has it a cheerful Beast pup named Bing needs assistance at the forest border. May Atia guide your path!'
          }
        ];

        this.dialogSystem.startDialogue(dialogue, () => {
          this.questState.doorsUnlocked = true;
          if (this.questManager) {
            this.questManager.advanceStep('quest_slime_purification', 'equip_sword', true);
            this.questManager.advanceStep('quest_slime_purification', 'open_doors', true);
            this.questManager.completeQuest('quest_slime_purification');
          }
          if (this.onPaladillGraduationComplete) {
            this.onPaladillGraduationComplete();
          }
          if (this.onQuestCompleted) {
            this.onQuestCompleted('quest_slime_purification');
          }
        });
      }
    } else {
      // Step 5: Post-graduation ambient advice
      const dialogue = [
        {
          speaker: 'Maestro Paladill',
          title: 'Mentor del Dojo',
          avatar: './assets/portraits/paladill.png',
          text: '¡Que el honor guíe cada movimiento en el tablero de Lunacia, {heroName}!'
        },
        {
          speaker: 'Maestro Paladill',
          title: 'Mentor del Dojo',
          avatar: './assets/portraits/paladill.png',
          text: 'Consulta el mapa [M] y la Crónica [J] en tus viajes por la Sabana, el Ártico, la Isla Mística y Génesis.'
        }
      ];
      this.dialogSystem.startDialogue(dialogue);
    }
  }

  setSlimeDefeated(status = true) {
    this.questState.slimeDefeated = status;
  }

  _showBannerMessage(title, desc) {
    const banner = document.getElementById('turn-banner');
    if (!banner) return;
    const bannerTitle = document.getElementById('banner-title');
    const bannerSub = document.getElementById('banner-subtitle');
    if (bannerTitle) bannerTitle.textContent = title;
    if (bannerSub) bannerSub.textContent = desc;

    // Suppress speech bubble while banner is active so it doesn't collide
    this._isBannerShowing = true;
    if (this.speechBubbleEl) {
      this.speechBubbleEl.classList.add('hidden');
    }

    // Reset and trigger reflow for smooth animation restart
    banner.className = 'turn-banner hidden';
    void banner.offsetWidth; // force reflow

    const isComplete = title.includes('COMPLETADA') || title.includes('PURIFICADA') || title.includes('VICTORIA');
    banner.className = `turn-banner quest-notification ${isComplete ? 'quest-completed' : 'quest-accepted'}`;

    if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
    this._bannerTimeout = setTimeout(() => {
      banner.classList.add('hidden');
      this._isBannerShowing = false;
    }, 3200);
  }

  update(dt, time, playerPos) {
    // 1. Update active animations (LOD Throttled for distant NPCs)
    this.npcs.forEach(npc => {
      if (!npc.group.visible) return;
      if (npc.mixer) {
        if (npc._lodThrottled) {
          npc._lodSkip = !npc._lodSkip;
          npc._accumDt = (npc._accumDt || 0) + dt;
          if (!npc._lodSkip) {
            npc.mixer.update(npc._accumDt);
            npc._accumDt = 0;
          }
        } else {
          if (npc._accumDt) {
            npc.mixer.update(dt + npc._accumDt);
            npc._accumDt = 0;
          } else {
            npc.mixer.update(dt);
          }
        }
      }
    });

    if (!playerPos) return;

    // 2. Check proximity for interaction and speech bubbles
    let closestInteractNPC = null;
    let closestInteractDist = Infinity;
    let closestBubbleNPC = null;
    let closestBubbleDist = Infinity;

    this.npcs.forEach(npc => {
      if (npc.heroId && this.equipmentManager && this.equipmentManager.isHeroUnlocked(npc.heroId)) {
        npc.group.visible = false;
        return;
      }
      if (!npc.group.visible) return;
      const dx = playerPos.x - npc.group.position.x;
      const dz = playerPos.z - npc.group.position.z;
      const dist = Math.hypot(dx, dz);

      // Interaction distance (< 3.4m)
      if (dist < npc.interactRadius && dist < closestInteractDist) {
        closestInteractDist = dist;
        closestInteractNPC = npc;
      }

      // Speech bubble distance (< 6.5m)
      if (npc.bubbleQuote && dist < (npc.calloutRadius || 6.5) && dist < closestBubbleDist) {
        closestBubbleDist = dist;
        closestBubbleNPC = npc;
      }
    });

    this.nearbyNPC = closestInteractNPC;
    this.nearbyBubbleNPC = closestBubbleNPC;

    // 3. Orient NPCs smoothly towards player when nearby, or return to default facing
    this.npcs.forEach(npc => {
      if (!npc.group.visible) return;

      // Spiritual pulse for sacred statues harboring divine presence
      if (npc.spiritLight) {
        npc.spiritLight.intensity = 1.6 + Math.sin(Date.now() * 0.003) * 0.45;
      }

      // Statues and sacred monuments remain firmly stationary without tracking player
      if (npc.isStatue || npc.isStatic) return;

      const isTarget = (this.nearbyNPC && this.nearbyNPC.id === npc.id);
      let desiredAngle;
      if (isTarget) {
        const dx = playerPos.x - npc.group.position.x;
        const dz = playerPos.z - npc.group.position.z;
        desiredAngle = Math.atan2(dx, dz);
      } else {
        desiredAngle = npc.defaultRotation !== undefined ? npc.defaultRotation : 0;
      }
      let diff = desiredAngle - npc.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const turnSpeed = isTarget ? 5.0 : 2.5;
      npc.group.rotation.y += diff * Math.min(1.0, turnSpeed * dt);
    });

    if (this.nearbyNPC && !this.dialogSystem.isActive) {
      this.interactionPromptEl.classList.remove('hidden');
      const actionSpan = document.getElementById('prompt-npc-action');
      if (actionSpan) {
        actionSpan.textContent = `Talk to ${this.nearbyNPC.name}`;
      }
    } else {
      this.interactionPromptEl.classList.add('hidden');
    }

    // 4. 3D Floating Speech Bubble DOM projection
    if (this.nearbyBubbleNPC && !this.dialogSystem.isActive && !this._isBannerShowing && this.camera) {
      const npcPos = this.nearbyBubbleNPC.group.position.clone();
      npcPos.y += (this.nearbyBubbleNPC.bubbleHeight || 3.35);

      const proj = npcPos.project(this.camera);

      // Verify that NPC is in front of camera and within view
      const inFront = proj.z > -1.0 && proj.z < 1.0 && proj.x > -1.5 && proj.x < 1.5 && proj.y > -1.5 && proj.y < 1.5;
      if (inFront) {
        let screenX = (proj.x * 0.5 + 0.5) * window.innerWidth;
        let screenY = (-proj.y * 0.5 + 0.5) * window.innerHeight;

        // Clamp smoothly inside screen viewport
        screenX = Math.max(180, Math.min(window.innerWidth - 180, screenX));
        screenY = Math.max(80, Math.min(window.innerHeight - 80, screenY));

        const bubbleEl = this.speechBubbleEl;
        const speakerEl = document.getElementById('npc-bubble-speaker');
        const textEl = document.getElementById('npc-bubble-text');
        const badgeEl = document.getElementById('npc-bubble-badge');

        // Determine badge, quote, and state dynamically based on quest
        let badgeIcon = '💬';
        bubbleEl.className = 'lk-ui lk-npc-bubble';

        if (this.nearbyBubbleNPC.id === 'sentinel' && this.questManager) {
          const q3 = this.questManager.getQuest('quest_hostile_sands');
          const q4 = this.questManager.getQuest('quest_hunt_beaked_chimera');
          if (!q3 || q3.status === 'locked' || !this.questManager.isMainQuestUnlocked('quest_hostile_sands')) {
            badgeIcon = '💬';
            this.nearbyBubbleNPC.bubbleQuote = 'The scorching sun and chimeras punish the unwary!';
          } else if (q3.status === 'active' || q3.status === 'ready_to_turn_in') {
            badgeIcon = '❓';
            bubbleEl.classList.add('turn-in');
            this.nearbyBubbleNPC.bubbleQuote = 'Border outpost report! Talk to me [E]';
          } else if (q4 && (q4.status === 'active' || q4.status === 'ready_to_turn_in')) {
            const alphaDone = q4.objective?.steps?.find(s => s.id === 'defeat_beaked_alpha')?.done;
            if (alphaDone) {
              badgeIcon = '❓';
              bubbleEl.classList.add('turn-in');
              this.nearbyBubbleNPC.bubbleQuote = 'Great victory! Report back to me for your reward [E]';
            } else {
              badgeIcon = '⚔️';
              this.nearbyBubbleNPC.bubbleQuote = 'The Beaked Chimera lurks in the Wastes of [3, 1]!';
            }
          } else {
            badgeIcon = '💬';
            this.nearbyBubbleNPC.bubbleQuote = 'The Savannah dunes are at peace!';
          }
        } else if (this.nearbyBubbleNPC.id === 'oracle' && this.questManager) {
          const q7 = this.questManager.getQuest('quest_astral_void_echoes');
          const q8 = this.questManager.getQuest('quest_forbidden_resonance');

          if (!q7 || q7.status === 'locked' || !this.questManager.isMainQuestUnlocked('quest_astral_void_echoes')) {
            badgeIcon = '💬';
            this.nearbyBubbleNPC.bubbleQuote = 'The bell of fate has begun to toll across Lunacia.';
          } else if (q7.status === 'active' || q7.status === 'ready_to_turn_in') {
            badgeIcon = '❓';
            bubbleEl.classList.add('turn-in');
            this.nearbyBubbleNPC.bubbleQuote = 'Heroes of Lunacia! Approach the Oracle [E]';
          } else if (q8 && (q8.status === 'active' || q8.status === 'ready_to_turn_in')) {
            const sapidaeDone = q8.objective?.steps?.find(s => s.id === 'defeat_sapidae')?.done;
            if (sapidaeDone) {
              badgeIcon = '❓';
              bubbleEl.classList.add('turn-in');
              this.nearbyBubbleNPC.bubbleQuote = 'The void has been shattered! Come claim your reward [E]';
            } else {
              badgeIcon = '⚔️';
              this.nearbyBubbleNPC.bubbleQuote = 'Purify the Arcane Sapidae Chimera in this sanctuary!';
            }
          } else {
            badgeIcon = '💬';
            this.nearbyBubbleNPC.bubbleQuote = 'May astral light guide your path into the Royal Gardens of Genesis.';
          }
        } else if (this.nearbyBubbleNPC.id === 'polar_sage' && this.questManager) {
          const q7 = this.questManager.getQuest('quest_astral_void_echoes');
          if (!q7 || q7.status === 'locked' || !this.questManager.isMainQuestUnlocked('quest_astral_void_echoes')) {
            badgeIcon = '💬';
            this.nearbyBubbleNPC.bubbleQuote = 'The constellations tremble before the advance of the void...';
          } else if (q7.status === 'active') {
            badgeIcon = '❗';
            this.nearbyBubbleNPC.bubbleQuote = 'The Astral Oracle awaits you at the Sanctuary [1, 4]!';
          } else {
            badgeIcon = '💬';
            this.nearbyBubbleNPC.bubbleQuote = 'The energies of the Nebula flow in harmony.';
          }
        } else if (this.nearbyBubbleNPC.questId && this.questManager) {
          const q = this.questManager.getQuest(this.nearbyBubbleNPC.questId);
          if (q) {
            if (this.nearbyBubbleNPC.heroId) {
              const isUnlocked = this.questManager.isMainQuestUnlocked(q.id) && q.status !== 'locked';
              if (!isUnlocked) {
                badgeIcon = '💬';
                this.nearbyBubbleNPC.bubbleQuote = this.nearbyBubbleNPC.heroId === 'pomodoro'
                  ? 'The polar wind and blizzard are relentless!'
                  : 'Master Paladill awaits you at the Dojo!';
              } else {
                const battleStep = q.objective?.steps?.find(s => s.id === 'defend_bing' || s.id === 'defend_pomodoro');
                const findStep = q.objective?.steps?.find(s => s.id === 'find_bing' || s.id === 'reach_arctic');

                if (battleStep && battleStep.done && (!findStep || findStep.done)) {
                  badgeIcon = '✨';
                  bubbleEl.classList.add('recruit');
                  this.nearbyBubbleNPC.bubbleQuote = 'Victory! Talk to me to join our forces.';
                } else if (findStep && findStep.done) {
                  badgeIcon = '⚔️';
                  this.nearbyBubbleNPC.bubbleQuote = 'Let\'s enter combat against those chimeras!';
                } else {
                  badgeIcon = '❗';
                }
              }
            } else if (q.status === 'ready_to_turn_in') {
              badgeIcon = '❓';
              bubbleEl.classList.add('turn-in');
            } else if (q.status === 'active') {
              const pendingStep = q.objective?.steps?.find(s => !s.done);
              const isTalkOrReport = pendingStep && (
                pendingStep.id.startsWith('talk_') ||
                pendingStep.id.startsWith('report_') ||
                pendingStep.desc.toLowerCase().includes('hablar') ||
                pendingStep.desc.toLowerCase().includes('reportar') ||
                pendingStep.desc.toLowerCase().includes('talk') ||
                pendingStep.desc.toLowerCase().includes('report')
              );
              if (isTalkOrReport) {
                badgeIcon = '❓';
                bubbleEl.classList.add('turn-in');
              } else {
                badgeIcon = '💬';
              }
            } else if (q.status === 'available') {
              badgeIcon = '❗';
            } else if (q.status === 'locked') {
              badgeIcon = '💬';
            }
          }
        }

        if (speakerEl) speakerEl.textContent = this.nearbyBubbleNPC.name;
        if (textEl) {
          const heroName = this.dialogSystem?.activeHero?.name || 'Hero';
          const quote = (this.nearbyBubbleNPC.bubbleQuote || '').replace(/{heroName}/g, heroName);
          textEl.textContent = `"${quote}"`;
        }

        if (badgeEl) {
          // El estado (antes un emoji) se muestra como un rombo: ! misión, ? entregar, espadas combate, ✦ reclutar
          const MARKS = { '❗': ['quest', '!'], '❓': ['turnin', '?'], '⚔️': ['combat', '⚔'], '✨': ['recruit', '✦'] };
          const [mark, glyph] = MARKS[badgeIcon] || ['talk', ''];
          if (badgeEl.dataset.mark !== mark) {
            badgeEl.dataset.mark = mark;
            badgeEl.textContent = glyph;
          }
        }

        bubbleEl.style.left = `${Math.round(screenX)}px`;
        bubbleEl.style.top = `${Math.round(screenY)}px`;
        bubbleEl.classList.remove('hidden');
      } else {
        this.speechBubbleEl.classList.add('hidden');
      }
    } else if (this.speechBubbleEl) {
      this.speechBubbleEl.classList.add('hidden');
    }
  }

  tryInteract() {
    if (this.nearbyNPC && this.nearbyNPC.group && this.nearbyNPC.group.visible && !this.dialogSystem.isActive) {
      this.nearbyNPC.onInteract();
      return true;
    }
    return false;
  }

  interactWithPaladill() {
    return this._handlePaladillInteraction();
  }

  hideAllOverlays() {
    this.nearbyNPC = null;
    this.nearbyBubbleNPC = null;
    if (this.speechBubbleEl) {
      this.speechBubbleEl.classList.add('hidden');
    }
    if (this.interactionPromptEl) {
      this.interactionPromptEl.classList.add('hidden');
    }
  }
}
