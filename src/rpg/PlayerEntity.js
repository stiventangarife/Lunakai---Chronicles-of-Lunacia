// PlayerEntity.js - Sapidae Humanoid Hero with Faithful Companion Axie for MMO Exploration
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { applyToonOutline } from './stylized/ToonOutline.js';
import { axieMixerService } from './AxieMixerService.js';
import { sapidaeModularController } from './SapidaeModularController.js';
import { spawnPuff } from './PuffEffect.js';

export class PlayerEntity {
  constructor(config = {}) {
    this.om = config.om || null;
    this.heroId = config.heroId || 'kotaro';
    this.isSapidae = true;
    this.sapidaeModel = config.sapidaeModel || 'sapidae-m-a';
    this.equipped = config.equipped || (config.equippedHeroes ? config.equippedHeroes.kotaro : null) || {};

    // Companion Axie identity
    const isBeast = this.heroId === 'kotaro' || config.heroKey === 'beast_rage' || config.axieId === '10455' || config.axieId === '11968787';
    this.companionName = (config.name && config.name !== 'Kotaro') ? config.name : (isBeast ? 'Shinji' : (config.name || 'Hero'));
    this.companionAxieId = config.axieId ? String(config.axieId) : (isBeast ? '10455' : '10455');
    if (this.companionAxieId === '11968787') this.companionAxieId = '10455';
    this.axieId = this.companionAxieId;

    const OLD_BEAST_GENES_PREFIX = '0x10001c0e090020c0';
    const NEW_BEAST_GENES = '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c';
    if (isBeast && (!config.genes || config.genes.startsWith(OLD_BEAST_GENES_PREFIX))) {
      this.companionGenes = NEW_BEAST_GENES;
    } else {
      this.companionGenes = config.genes || null;
    }
    this.genes = this.companionGenes;

    // Sapidae Player Identity (Humanoid Adventurer)
    this.name = config.playerName || 'Sapidae Adventurer';
    this.heroClass = 'Sapidae Adventurer';
    this.title = config.title || 'Axie Tamer & Explorer';
    this.archetype = `Sapidae Explorer (Companion: ${this.companionName})`;
    this.avatar = this.sapidaeModel.includes('f') ? '👩‍🌾' : '🧑‍🌾';
    this.modelType = 'sapidae';
    this.scale = config.scale || 1.0;

    this.customization = config.customization || {
      hair: 'original',
      hairStyle: 'braids',
      eyes: 'original',
      eyeShape: 'round',
      suitColor: 'original',
      shirt: 'original',
      pants: 'original',
      horns: 'none',
      hasHat: false
    };
    this.equipped = Object.assign({}, config.equipped || {});
    this.sapidaeClass = config.sapidaeClass || 'crafter';

    // Companion living follower behavior state
    this.companionState = 'idle';
    this.companionVel = new THREE.Vector3(0, 0, 0);
    this.companionIdleTimer = 0;
    this.companionHopTimer = 0;
    this.companionTargetDist = 2.45;

    // Game feel & procedural dynamics for Sapidae
    this.baseMeshY = 0;
    this.walkCycle = 0;
    this.leanPitch = 0;
    this.leanRoll = 0;

    // Game feel & procedural dynamics for Axie Companion
    this.companionBaseScale = 0.95 * this.scale;
    this.companionWalkCycle = 0;
    this.companionPitch = 0;
    this.companionBank = 0;

    this.group = new THREE.Group();
    this.group.name = 'PlayerHero_Sapidae_' + this.sapidaeModel;

    this.mesh = null;
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.currentAnim = 'idle';

    // Companion Axie (trailed companion in the MMO)
    this.companionGroup = null;
    this.companionMesh = null;
    this.companionAxie = null;
    this.companionAnim = 'idle';
    this.companionYaw = 0;

    this.position = new THREE.Vector3(config.x || 0, config.y || 0, config.z || 0);
    this.group.position.copy(this.position);

    this.yaw = config.yaw || 0;
    this.targetYaw = this.yaw;
    this.turnSpeed = 14.0;

    this.radius = 0.65;
    this.isSaluting = false;

    this._createUnderFeetAura();
    this._createQuestNavArrow();
  }

  get rotation() {
    return {
      x: this.leanPitch || 0,
      y: this.yaw || 0,
      z: this.leanRoll || 0
    };
  }

  _createUnderFeetAura() {
    // Ground circle removed per user request (prevents slope clipping)
    // Keep subtle soft shadow disc
    const shadowGeo = new THREE.CircleGeometry(0.55, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050f1a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.group.add(shadowMesh);
  }

  _createQuestNavArrow() {
    // Floating 3D Navigation Guide at waist height (1.35m) - zero ground clipping on slopes
    this.navArrowGroup = new THREE.Group();
    this.navArrowGroup.position.y = 1.35;
    this.navArrowGroup.visible = false;

    // Glowing golden guidance material
    const navMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xff9900,
      emissiveIntensity: 1.25,
      roughness: 0.2,
      metalness: 0.7
    });

    // 3D forward-pointing faceted pointer crystal
    const crystalGeo = new THREE.ConeGeometry(0.20, 0.55, 4);
    crystalGeo.rotateX(Math.PI / 2);
    crystalGeo.rotateZ(Math.PI / 4);
    this.navCrystalMesh = new THREE.Mesh(crystalGeo, navMat);
    this.navCrystalMesh.position.set(0, 0, 1.35);
    this.navArrowGroup.add(this.navCrystalMesh);


    // Warm golden directional point light
    const navLight = new THREE.PointLight(0xffb700, 1.8, 4.0);
    navLight.position.set(0, 0, 1.35);
    this.navArrowGroup.add(navLight);

    this.group.add(this.navArrowGroup);

    this.navTargetWorldPos = null;
    this.navTargetAngle = 0;
    this.currentNavAngle = 0;
  }

  setNavTarget(targetWorldPos, visible = true) {
    if (!targetWorldPos || !visible) {
      this.navTargetWorldPos = null;
      if (this.navArrowGroup) this.navArrowGroup.visible = false;
      return;
    }

    this.navTargetWorldPos = targetWorldPos;
    if (this.navArrowGroup) this.navArrowGroup.visible = true;
  }

  async loadModel(renderer = null) {
    if (renderer) this._renderer = renderer;
    // 1. Load the Sapidae humanoid 3D model
    const loader = new GLTFLoader();
    const sapidaeFile = this.sapidaeModel.endsWith('.glb') ? this.sapidaeModel : `${this.sapidaeModel}.glb`;
    const modelPath = `./assets/models/${sapidaeFile}`;

    try {
      const gltf = await loader.loadAsync(modelPath);
      this.mesh = gltf.scene;

      // Auto-normalize humanoid scale (target height ~1.55m)
      this.mesh.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(this.mesh);
      const size = new THREE.Vector3();
      rawBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      const targetHeight = 2.80 * this.scale;
      const s = maxDim > 0 ? (targetHeight / maxDim) : 1.0;
      this.mesh.scale.set(s, s, s);
      this.mesh.updateMatrixWorld(true);

      // Ground feet precisely at y = 0
      const scaledBox = new THREE.Box3().setFromObject(this.mesh);
      this.baseMeshY = Math.max(0, -scaledBox.min.y);
      this.mesh.position.y = this.baseMeshY;
      this.mesh.position.x = 0;
      this.mesh.position.z = 0;

      // 1. Stylized Cel / Toon Materials matching Axie Mixer
      if (!PlayerEntity.toonGradientMap) {
        const colors = new Uint8Array([ 125, 205, 255 ]);
        PlayerEntity.toonGradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
        PlayerEntity.toonGradientMap.minFilter = THREE.NearestFilter;
        PlayerEntity.toonGradientMap.magFilter = THREE.NearestFilter;
        PlayerEntity.toonGradientMap.generateMipmaps = false;
        PlayerEntity.toonGradientMap.needsUpdate = true;
      }

      this.mesh.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Remove vertex colors to prevent dark blotches/facets on skin mask
          if (child.geometry) {
            if (child.geometry.attributes.color) {
              child.geometry.deleteAttribute('color');
            }
            if (child.geometry.attributes.color_1) {
              child.geometry.deleteAttribute('color_1');
            }
            if (child.geometry.attributes.normal && !child.geometry.userData.origNormals) {
              child.geometry.userData.origNormals = new Float32Array(child.geometry.attributes.normal.array);
            }
            if (child.geometry.attributes.position && !child.geometry.userData.origHornPositions) {
              child.geometry.userData.origHornPositions = new Float32Array(child.geometry.attributes.position.array);
            }
          }

          // Apply Stylized Cel / Toon Material
          const name = (child.name || '').toLowerCase();
          const origMat = Array.isArray(child.material) ? child.material[0] : child.material;

          if (origMat) {
            origMat.vertexColors = false;

            if (name.includes('eye') || name.includes('mouth') || name.includes('cheek')) {
              const decalMat = new THREE.MeshBasicMaterial({
                map: origMat.map,
                color: origMat.color,
                transparent: true,
                opacity: 1.0,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1,
                toneMapped: true
              });
              decalMat.userData = { ...origMat.userData, origMap: origMat.map };
              child.material = decalMat;
            } else {
              const toonMat = new THREE.MeshToonMaterial({
                map: origMat.map,
                color: origMat.color,
                gradientMap: PlayerEntity.toonGradientMap,
                transparent: Boolean(origMat.transparent),
                alphaTest: origMat.alphaTest || 0,
                side: origMat.side || THREE.FrontSide,
                toneMapped: true
              });
              toonMat.userData = { ...origMat.userData, origMap: origMat.map };
              child.material = toonMat;
            }
          }
        }
      });

      this.group.add(this.mesh);

      // Apply Sapidae Customization Material Tinting
      this._applyCustomization();

      // Apply Inverted Hull Toon Outline for anime/stylized aesthetic
      this.toonOutline = applyToonOutline(this.mesh, {
        thickness: 0.012,
        color: 0x15161e,
        mode: 'view',
        filter: (mesh) => {
          const name = (mesh.name || '').toLowerCase();
          if (name.includes('eye') || name.includes('mouth') || name.includes('cheek') || name.includes('decal')) {
            return false;
          }
          return true;
        }
      });

      // Animation Setup
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);

        gltf.animations.forEach(clip => {
          const lowerName = clip.name.toLowerCase();
          const action = this.mixer.clipAction(clip);
          this.actions[lowerName] = action;
        });

        // Exact & priority matching for standard states
        const findAction = (names) => {
          for (const n of names) {
            if (this.actions[n]) return this.actions[n];
          }
          for (const key of Object.keys(this.actions)) {
            for (const n of names) {
              if (key.includes(n)) return this.actions[key];
            }
          }
          return null;
        };

        this.actions['idle'] = findAction(['idle', 'wait', 'stand']) || this.mixer.clipAction(gltf.animations[0]);
        this.actions['run'] = findAction(['run', 'walk', 'move']) || this.actions['idle'];
        this.actions['walk'] = findAction(['walk', 'run']) || this.actions['run'];
        this.actions['attack'] = findAction(['attack', 'hit', 'slash']);
        this.actions['skill'] = findAction(['skill', 'spell', 'cast', 'attack']);
        this.actions['dead'] = findAction(['dead', 'death', 'die']);

        // Start in idle
        if (this.actions['idle']) {
          this.activeAction = this.actions['idle'];
          this.activeAction.play();
          this.currentAnim = 'idle';
        }
      }

      console.log(`[PlayerEntity] Loaded Sapidae model: ${this.sapidaeModel} for player ${this.name}`);
    } catch (err) {
      console.error(`[PlayerEntity] Failed to load Sapidae model ${modelPath}:`, err);
      const geo = new THREE.CylinderGeometry(0.35, 0.35, 1.55, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.position.y = 0.77;
      this.group.add(this.mesh);
    }

    // 2. Load the Companion Axie (following the Sapidae in the MMO)
    await this._loadCompanionAxie(renderer);
  }

  async _loadCompanionAxie(renderer = null) {
    const axieId = this.companionAxieId || '10455';
    try {
      // Axies sin ID ni genes (Bing, Pomodoro): su modelo GLB, con un adaptador de la misma interfaz que el Mixer
      const companionRes = this.companionModelFile
        ? await this._loadCompanionGLB(this.companionModelFile, 0.95 * this.scale * (this.companionModelScale || 1))
        : await axieMixerService.loadAxieHero({
          axieId: axieId,
          genes: this.companionGenes,
          renderer: renderer || this._renderer,
          scale: 0.95 * this.scale, // increased companion size in open world!
          heroId: this.heroId || 'kotaro'
        });

      this.companionAxie = companionRes.axie;
      this.companionMesh = companionRes.wrapper;
      this.companionBaseScale = (this.companionMesh && this.companionMesh.scale) ? this.companionMesh.scale.x : (0.95 * this.scale);

      // Native Axie Mixer outline is already tuned to 0.005 in axieMixerService

      if (!this.companionGroup) {
        this.companionGroup = new THREE.Group();
        this.companionGroup.name = 'CompanionAxie_' + axieId;
      } else {
        while (this.companionGroup.children.length > 0) {
          this.companionGroup.remove(this.companionGroup.children[0]);
        }
      }

      // Initial placement comfortably at the flank beside the Sapidae
      const fwdX = Math.sin(this.yaw);
      const fwdZ = Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);

      this.companionGroup.position.set(
        this.position.x - fwdX * 1.1 + rightX * 2.0,
        this.position.y,
        this.position.z - fwdZ * 1.1 + rightZ * 2.0
      );
      this.companionGroup.add(this.companionMesh);

      if (this.group.parent && !this.companionGroup.parent) {
        this.group.parent.add(this.companionGroup);
      }

      this.companionAnim = 'idle';
      if (this.companionAxie && typeof this.companionAxie.playAnimation === 'function') {
        this.companionAxie.playAnimation('Default.Idle');
      }

      console.log(`[PlayerEntity] Loaded Companion Axie #${axieId} (${this.companionName}) following Sapidae`);
    } catch (err) {
      console.warn('[PlayerEntity] Failed to load 3D companion Axie:', err);
    }
  }

  /** Compañero desde un GLB (Bing, Pomodoro…) con playAnimation('Default.Idle' | 'Default.Run') y update(dt). */
  async _loadCompanionGLB(file, scale) {
    const gltf = await new GLTFLoader().loadAsync(`./assets/models/${file}.glb`);
    const wrapper = new THREE.Group();
    wrapper.add(gltf.scene);
    wrapper.scale.setScalar(scale);
    const mixer = gltf.animations?.length ? new THREE.AnimationMixer(gltf.scene) : null;
    const find = (re) => gltf.animations.find((c) => re.test(c.name.toLowerCase()));
    const clips = mixer ? { idle: find(/idle|survey/) || gltf.animations[0], run: find(/run|walk/) || null } : {};
    let current = null;
    const axie = {
      playAnimation(name) {
        if (!mixer) return;
        const clip = /run/i.test(name) && clips.run ? clips.run : clips.idle;
        const action = mixer.clipAction(clip);
        if (current === action) return;
        if (current) current.fadeOut(0.2);
        action.reset().fadeIn(0.2).play();
        current = action;
      },
      update(dt) { if (mixer) mixer.update(dt); },
    };
    return { axie, wrapper };
  }

  /**
   * Cambia el Axie compañero (19-oct): el que estaba desaparece en una nubecita de humo y aparece el nuevo
   * con otra nubecita y un pequeño salto. hero = { axieId, genes, name, modelFile, modelScale }.
   * Con animate = false el cambio es instantáneo (al cargar la partida).
   */
  async swapCompanion(hero = {}, { animate = true } = {}) {
    if (this._swappingCompanion) { this._pendingCompanion = [hero, { animate }]; return; }
    this._swappingCompanion = true;
    const tween = (ms, fn) => new Promise((res) => {
      const t0 = performance.now();
      const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); fn(k); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
    try {
      const parent = this.companionGroup?.parent || this.group?.parent;
      const pos = this.companionGroup ? this.companionGroup.position.clone() : null;
      const show = animate && parent && pos && this.companionGroup?.visible;
      if (show) {
        spawnPuff(parent, pos);
        await tween(220, (k) => { this.companionSpawnScale = 1 - k; });
      }
      this.companionAxieId = hero.axieId ? String(hero.axieId) : null;
      this.companionGenes = hero.genes || null;
      this.companionName = hero.name || this.companionName;
      this.companionModelFile = hero.axieId || hero.genes ? null : (hero.modelFile || null);
      this.companionModelScale = hero.modelScale || 1;
      if (this.companionAxieId) { this.axieId = this.companionAxieId; this.genes = this.companionGenes; }
      this.archetype = `Sapidae Explorer (Companion: ${this.companionName})`;
      this.companionSpawnScale = show ? 0 : 1;
      await this._loadCompanionAxie(this._renderer);
      if (pos && this.companionGroup) this.companionGroup.position.copy(pos);
      if (show) {
        spawnPuff(parent, pos);
        // Aparece con un saltito: crece pasándose un poco y vuelve a su tamaño
        await tween(340, (k) => { const c = 1.70158; const x = k - 1; this.companionSpawnScale = 1 + (c + 1) * x * x * x + c * x * x; });
      }
    } catch (err) {
      console.warn('[PlayerEntity] No se pudo cambiar el compañero:', err);
    } finally {
      this.companionSpawnScale = 1;
      this._swappingCompanion = false;
      if (this._pendingCompanion) { const [h, o] = this._pendingCompanion; this._pendingCompanion = null; this.swapCompanion(h, o); }
    }
  }

  _applyCustomization() {
    if (!this.mesh) return;
    const custom = Object.assign({ useOriginalTextures: true }, this.customization || {});
    sapidaeModularController.applyCustomization(this.mesh, custom);
    if (this.equipped && Object.keys(this.equipped).length > 0) {
      sapidaeModularController.applyEquipment(this.mesh, this.equipped, custom);
    }
  }

  applyEquipment(equipped = {}) {
    this.equipped = Object.assign({}, equipped);
    if (this.mesh) {
      sapidaeModularController.applyEquipment(this.mesh, this.equipped, this.customization || {});
    }
  }


  setAnimation(name, duration = 0.22) {
    if (this.currentAnim === name) return;

    if (!this.mixer) return;
    const targetAction = this.actions[name.toLowerCase()] || this.actions['idle'];
    if (!targetAction || targetAction === this.activeAction) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(duration);
    }

    targetAction.reset().fadeIn(duration).play();
    this.activeAction = targetAction;
    this.currentAnim = name;
  }

  playSalute() {
    this.isSaluting = true;
    const startY = this.position.y;
    const startTime = performance.now();
    const animateBounce = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed < 0.8) {
        const bounce = Math.sin((elapsed / 0.8) * Math.PI) * 0.35;
        this.group.position.y = startY + bounce;
        if (this.mesh) this.mesh.rotation.y += 0.08;
        requestAnimationFrame(animateBounce);
      } else {
        this.group.position.y = startY;
        if (this.mesh) this.mesh.rotation.y = this.yaw;
        this.isSaluting = false;
      }
    };
    animateBounce();
  }

  teleport(x, y = 0, z, yaw = null) {
    this.position.set(x, y, z);
    this.group.position.copy(this.position);
    if (this.mesh) {
      this.mesh.position.x = 0;
      this.mesh.position.z = 0;
    }
    if (yaw !== null && yaw !== undefined) {
      this.yaw = yaw;
      this.targetYaw = yaw;
      if (this.mesh) {
        this.mesh.rotation.y = yaw;
      }
    }

    if (this.companionGroup) {
      const fwdX = Math.sin(this.yaw);
      const fwdZ = Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);

      this.companionGroup.position.set(
        x - fwdX * 1.1 + rightX * 2.0,
        y,
        z - fwdZ * 1.1 + rightZ * 2.0
      );
      if (this.companionMesh) {
        this.companionMesh.rotation.y = this.yaw;
      }
      this.companionVel.set(0, 0, 0);
      this.companionState = 'idle';
    }
  }

  update(dt, time) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
    if (this.toonOutline && typeof this.toonOutline.syncVisibility === 'function') {
      this.toonOutline.syncVisibility();
    }

    // Smooth yaw rotation towards targetYaw
    let diff = this.targetYaw - this.yaw;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.yaw += diff * Math.min(1.0, this.turnSpeed * dt);

    const isMoving = (this.currentAnim === 'run' || this.currentAnim === 'walk');

    // Procedural Game Feel for Sapidae: gait bobbing, lean into turns, forward pitch
    if (this.mesh && !this.isSaluting) {
      if (isMoving) {
        this.walkCycle = (this.walkCycle || 0) + dt * (this.currentAnim === 'run' ? 14.0 : 8.5);
        const bob = Math.sin(this.walkCycle * 2.0) * (this.currentAnim === 'run' ? 0.045 : 0.022);
        const sway = Math.sin(this.walkCycle) * 0.022;

        const targetPitch = this.currentAnim === 'run' ? 0.075 : 0.03;
        const targetRoll = -Math.max(-0.25, Math.min(0.25, diff * 1.8)) * (this.currentAnim === 'run' ? 0.16 : 0.08);

        this.leanRoll = (this.leanRoll || 0) + (targetRoll + sway - (this.leanRoll || 0)) * Math.min(1.0, 10.0 * dt);
        this.leanPitch = (this.leanPitch || 0) + (targetPitch - (this.leanPitch || 0)) * Math.min(1.0, 10.0 * dt);

        this.mesh.position.y = (this.baseMeshY || 0) + bob;
      } else {
        // Subtle idle breathing
        const idleBreathe = Math.sin(time * 2.2) * 0.006;
        this.mesh.position.y = (this.baseMeshY || 0) + idleBreathe;

        this.leanRoll = (this.leanRoll || 0) * Math.max(0.0, 1.0 - 8.0 * dt);
        this.leanPitch = (this.leanPitch || 0) * Math.max(0.0, 1.0 - 8.0 * dt);
      }

      this.mesh.rotation.set(this.leanPitch, this.yaw, this.leanRoll, 'YXZ');
    }

    this.group.position.copy(this.position);

    // Safeguard local position
    if (this.mesh && (this.mesh.position.x !== 0 || this.mesh.position.z !== 0)) {
      this.mesh.position.x = 0;
      this.mesh.position.z = 0;
    }

    // Pulse aura gently
    if (this.auraMesh) {
      const pulse = 0.65 + Math.sin(time * 3.5) * 0.15;
      this.auraMesh.material.opacity = pulse;
    }

    // Natural Companion Axie Living Follower Physics & Game Feel
    if (this.companionGroup && this.companionMesh) {
      if (this.group.parent && !this.companionGroup.parent) {
        this.group.parent.add(this.companionGroup);
      }

      const playerIsMoving = isMoving;

      // Forward and right unit vectors for player orientation
      const fwdX = Math.sin(this.yaw);
      const fwdZ = Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);

      // Target position:
      // While running/walking, trail behind at the right-rear quarter.
      // When idle, settle comfortably at the right flank.
      let targetX, targetZ;
      if (playerIsMoving) {
        targetX = this.position.x - fwdX * 2.2 + rightX * 1.3;
        targetZ = this.position.z - fwdZ * 2.2 + rightZ * 1.3;
      } else {
        targetX = this.position.x - fwdX * 1.1 + rightX * 2.0;
        targetZ = this.position.z - fwdZ * 1.1 + rightZ * 2.0;
      }

      let targetY = this.position.y;
      if (this.om && typeof this.om.getGroundHeight === 'function') {
        targetY = this.om.getGroundHeight(this.companionGroup.position.x, this.companionGroup.position.z);
      }

      const cdx = targetX - this.companionGroup.position.x;
      const cdz = targetZ - this.companionGroup.position.z;
      const distToTarget = Math.hypot(cdx, cdz);

      const pdx = this.companionGroup.position.x - this.position.x;
      const pdz = this.companionGroup.position.z - this.position.z;
      const distToPlayer = Math.hypot(pdx, pdz);

      // 1. Anti-collision & soft separation push:
      // Enforce a strict minimum distance (2.0m) to guarantee Axie NEVER clips into Sapidae
      const minSeparation = 2.0;
      if (distToPlayer < minSeparation) {
        const pushOut = minSeparation - distToPlayer;
        let pushDirX = rightX;
        let pushDirZ = rightZ;
        if (distToPlayer > 0.05) {
          pushDirX = pdx / distToPlayer;
          pushDirZ = pdz / distToPlayer;
        }
        const pushRate = Math.min(1.0, 7.5 * dt);
        this.companionGroup.position.x += pushDirX * pushOut * pushRate;
        this.companionGroup.position.z += pushDirZ * pushOut * pushRate;
      }

      // 2. Teleport recovery threshold (only for extreme separations like falling off geometry)
      if (distToPlayer > 36.0) {
        this.companionGroup.position.set(targetX, targetY, targetZ);
        this.companionVel.set(0, 0, 0);
        this.companionState = 'idle';
      } else {
        // 3. State Machine (Idle, Walk, Run)
        if (this.companionState === 'idle') {
          if (distToPlayer > 3.2 || (playerIsMoving && distToPlayer > 2.2)) {
            this.companionState = (distToPlayer > 4.5 || playerIsMoving) ? 'run' : 'walk';
          }
        } else if (this.companionState === 'walk') {
          if (!playerIsMoving && (distToTarget < 0.45 || (distToPlayer < 2.5 && distToPlayer >= minSeparation))) {
            this.companionState = 'idle';
          } else if (distToPlayer > 4.0 || playerIsMoving) {
            this.companionState = 'run';
          }
        } else if (this.companionState === 'run') {
          if (!playerIsMoving && distToTarget < 0.50) {
            this.companionState = 'idle';
          } else if (!playerIsMoving && distToPlayer < 2.8) {
            this.companionState = 'walk';
          }
        }

        // 4. Desired velocity, dynamic speed matching, and catch-up acceleration
        const desiredVel = new THREE.Vector3(0, 0, 0);
        if (this.companionState !== 'idle' && distToTarget > 0.20) {
          let speed = 3.6; // Base walk speed
          if (this.companionState === 'run') {
            speed = 7.2; // Base run speed (player runs at 6.8 m/s)
            // Catch-up acceleration when lagging behind
            if (distToPlayer > 3.0) {
              const catchupFactor = Math.min(1.0, (distToPlayer - 3.0) * 0.35);
              speed += catchupFactor * 4.5; // Up to 11.7 m/s to smoothly catch up without teleporting!
            }
          }

          // Smooth arrival braking near target to eliminate overshoot
          if (distToTarget < 0.8) {
            speed *= Math.max(0.35, distToTarget / 0.8);
          }

          let dirX = cdx / distToTarget;
          let dirZ = cdz / distToTarget;

          // Steer around player if path cuts too close to player cylinder
          if (distToPlayer < 2.0 && distToTarget > 0.4) {
            const awayX = (distToPlayer > 0.05) ? (pdx / distToPlayer) : rightX;
            const awayZ = (distToPlayer > 0.05) ? (pdz / distToPlayer) : rightZ;
            dirX = dirX * 0.65 + awayX * 0.35;
            dirZ = dirZ * 0.65 + awayZ * 0.35;
            const dlen = Math.hypot(dirX, dirZ);
            if (dlen > 0.001) {
              dirX /= dlen;
              dirZ /= dlen;
            }
          }

          desiredVel.set(dirX * speed, 0, dirZ * speed);
        }

        const accelRate = this.companionState === 'idle' ? 14.0 : 8.0;
        this.companionVel.lerp(desiredVel, Math.min(1.0, accelRate * dt));
        const currentSpeed = Math.hypot(this.companionVel.x, this.companionVel.z);
        if (this.companionState === 'idle' && currentSpeed < 0.15) {
          this.companionVel.set(0, 0, 0);
        }

        this.companionGroup.position.x += this.companionVel.x * dt;
        this.companionGroup.position.z += this.companionVel.z * dt;
        this.companionGroup.position.y += (targetY - this.companionGroup.position.y) * Math.min(1.0, 16.0 * dt);

        // 5. Smooth steering & rotation towards movement or looking at Sapidae
        let targetCYaw = this.companionYaw || 0;
        if (currentSpeed > 0.25) {
          targetCYaw = Math.atan2(this.companionVel.x, this.companionVel.z);
        } else {
          // Glance towards player when stationary
          const toPx = this.position.x - this.companionGroup.position.x;
          const toPz = this.position.z - this.companionGroup.position.z;
          if (Math.hypot(toPx, toPz) > 0.5) {
            targetCYaw = Math.atan2(toPx, toPz);
          }
        }

        let cDiff = targetCYaw - (this.companionYaw || 0);
        while (cDiff < -Math.PI) cDiff += Math.PI * 2;
        while (cDiff > Math.PI) cDiff -= Math.PI * 2;
        const turnSlerpSpeed = currentSpeed > 0.3 ? 9.5 : 4.5;
        this.companionYaw = (this.companionYaw || 0) + cDiff * Math.min(1.0, turnSlerpSpeed * dt);

        // 6. Game Feel for Axie Companion: bouncy hop gait, squash & stretch, banking into turns
        const curBaseScale = (this.companionBaseScale || (0.95 * this.scale)) * (this.companionSpawnScale ?? 1); // ×0–1 al cambiar de compañero
        if (currentSpeed > 0.20) {
          this.companionWalkCycle = (this.companionWalkCycle || 0) + dt * (currentSpeed * 2.3);
          const hopBounce = Math.abs(Math.sin(this.companionWalkCycle)) * (this.companionState === 'run' ? 0.14 : 0.07);
          const hopSine = Math.sin(this.companionWalkCycle);
          const squash = hopSine * 0.065;

          this.companionMesh.position.y = hopBounce;
          this.companionMesh.scale.set(
            curBaseScale * (1.0 - squash * 0.5),
            curBaseScale * (1.0 + squash),
            curBaseScale * (1.0 - squash * 0.5)
          );

          // Banking / roll into turns
          const targetBank = -Math.max(-0.35, Math.min(0.35, cDiff * 2.0)) * 0.22;
          this.companionBank = (this.companionBank || 0) + (targetBank - (this.companionBank || 0)) * Math.min(1.0, 12.0 * dt);

          // Forward pitch tilt
          const targetPitch = Math.min(0.14, currentSpeed * 0.022);
          this.companionPitch = (this.companionPitch || 0) + (targetPitch - (this.companionPitch || 0)) * Math.min(1.0, 10.0 * dt);

          this.companionMesh.rotation.set(this.companionPitch, this.companionYaw, this.companionBank, 'YXZ');
        } else {
          // Reset banking and pitch smoothly
          this.companionBank = (this.companionBank || 0) * Math.max(0.0, 1.0 - 8.0 * dt);
          this.companionPitch = (this.companionPitch || 0) * Math.max(0.0, 1.0 - 8.0 * dt);
          this.companionMesh.rotation.set(this.companionPitch, this.companionYaw, this.companionBank, 'YXZ');

          // Idle fidgets and breathing
          if (this.companionState === 'idle' && currentSpeed < 0.1) {
            this.companionIdleTimer += dt;
            if (this.companionIdleTimer > 4.5) {
              this.companionIdleTimer = 0;
              if (Math.random() < 0.65) {
                this.companionHopTimer = 0.45;
              }
            }
          } else {
            this.companionIdleTimer = 0;
          }

          if (this.companionHopTimer > 0) {
            this.companionHopTimer -= dt;
            const hopProgress = Math.max(0, 1.0 - (this.companionHopTimer / 0.45));
            const hopOffset = Math.sin(hopProgress * Math.PI) * 0.22;
            const landSquash = Math.sin(hopProgress * Math.PI * 2.0) * 0.08;
            this.companionMesh.position.y = hopOffset;
            this.companionMesh.scale.set(
              curBaseScale * (1.0 + landSquash * 0.5),
              curBaseScale * (1.0 - landSquash),
              curBaseScale * (1.0 + landSquash * 0.5)
            );
          } else {
            const idleBreathe = Math.sin(time * 2.4) * 0.015;
            this.companionMesh.position.y = 0;
            this.companionMesh.scale.set(
              curBaseScale * (1.0 - idleBreathe * 0.5),
              curBaseScale * (1.0 + idleBreathe),
              curBaseScale * (1.0 - idleBreathe * 0.5)
            );
          }
        }

        // 7. Companion animation sync: strictly idle when stationary
        if (this.companionAxie) {
          if (this.companionState !== 'idle' && currentSpeed >= 2.5) {
            if (this.companionAnim !== 'run') {
              this.companionAxie.playAnimation('Default.Run');
              this.companionAnim = 'run';
            }
          } else if (this.companionState !== 'idle' && currentSpeed >= 0.25) {
            if (this.companionAnim !== 'walk' && this.companionAnim !== 'run') {
              this.companionAxie.playAnimation('Default.Run');
              this.companionAnim = 'walk';
            }
          } else {
            if (this.companionAnim !== 'idle') {
              this.companionAxie.playAnimation('Default.Idle');
              this.companionAnim = 'idle';
            }
          }
          if (typeof this.companionAxie.update === 'function') {
            this.companionAxie.update(dt);
          }
        }
      }
    }

    // Update floating 3D navigation guide & guiding wisps
    if (this.navArrowGroup && this.navArrowGroup.visible && this.navTargetWorldPos) {
      const dx = this.navTargetWorldPos.x - this.position.x;
      const dz = this.navTargetWorldPos.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.45) {
        const targetAngle = Math.atan2(dx, dz);

        let diff = targetAngle - this.currentNavAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.currentNavAngle += diff * Math.min(1.0, 14.0 * dt);

        this.navArrowGroup.rotation.y = this.currentNavAngle;

        // Floating vertical oscillation at waist height (1.35m + bob)
        this.navArrowGroup.position.y = 1.35 + Math.sin(time * 3.5) * 0.12;

        const pulse = Math.sin(time * 5.0) * 0.08;
        if (this.navCrystalMesh) {
          this.navCrystalMesh.scale.set(1.0 + pulse, 1.0 + pulse, 1.0 + pulse);
        }
      }
    }
  }

  dispose() {
    if (this.companionGroup && this.companionGroup.parent) {
      this.companionGroup.parent.remove(this.companionGroup);
    }
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
