// PlayerEntity.js - Dynamic Hero Entity for Overworld Exploration
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { applyToonOutline } from './stylized/ToonOutline.js';
import { axieMixerService } from './AxieMixerService.js';

export class PlayerEntity {
  constructor(config = {}) {
    this.heroId = config.heroId || 'kotaro';
    const isBeast = this.heroId === 'kotaro' || config.heroKey === 'beast_rage' || config.axieId === '10455' || config.axieId === '11968787';
    this.name = (config.name && config.name !== 'Kotaro') ? config.name : (isBeast ? 'Shinji' : (config.name || 'Hero'));
    this.axieId = config.axieId ? String(config.axieId) : (isBeast ? '10455' : null);
    if (this.axieId === '11968787') this.axieId = '10455';

    const OLD_BEAST_GENES_PREFIX = '0x10001c0e090020c0';
    const NEW_BEAST_GENES = '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c';
    if (isBeast && (!config.genes || config.genes.startsWith(OLD_BEAST_GENES_PREFIX))) {
      this.genes = NEW_BEAST_GENES;
    } else {
      this.genes = config.genes || null;
    }

    this.heroClass = config.heroClass || 'Beast Duelist';
    this.title = config.title || 'Dojo Aspirant';
    this.archetype = config.archetype || 'Beast Lunakai (Melee Duelist)';
    this.avatar = config.avatar || '⚔️';
    this.modelType = (this.axieId || isBeast) ? 'axie' : (config.modelType || this.heroId);
    this.scale = config.scale || (this.modelType === 'axie' ? 0.88 : 1.05);

    this.group = new THREE.Group();
    this.group.name = 'PlayerHero_' + this.heroId;

    this.mesh = null;
    this.axie = null;
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.currentAnim = 'idle';

    this.position = new THREE.Vector3(config.x || 0, config.y || 0, config.z || 0);
    this.group.position.copy(this.position);

    this.yaw = config.yaw || 0; // facing angle in radians
    this.targetYaw = this.yaw;
    this.turnSpeed = 14.0;

    this.radius = 0.65; // collision cylinder radius
    this.isSaluting = false;

    this._createUnderFeetAura();
    this._createQuestNavArrow();
  }

  _createUnderFeetAura() {
    // Soft glowing hero rune ring at the player's feet
    const ringGeo = new THREE.RingGeometry(0.55, 0.72, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.auraMesh = new THREE.Mesh(ringGeo, ringMat);
    this.auraMesh.position.y = 0.04;
    this.group.add(this.auraMesh);

    // Subtle soft shadow blob
    const shadowGeo = new THREE.CircleGeometry(0.6, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050f1a,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.group.add(shadowMesh);
  }

  _createQuestNavArrow() {
    this.navArrowGroup = new THREE.Group();
    this.navArrowGroup.position.y = 0.08;
    this.navArrowGroup.visible = false;

    // Stylized chevron / arrow pointing along +Z in 3D world space
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 1.7);       // Arrow tip pointing outward
    arrowShape.lineTo(0.45, 1.1);   // Right wing tip
    arrowShape.lineTo(0.22, 1.22);  // Right notch
    arrowShape.lineTo(0.14, 0.85);  // Right base
    arrowShape.lineTo(-0.14, 0.85); // Left base
    arrowShape.lineTo(-0.22, 1.22); // Left notch
    arrowShape.lineTo(-0.45, 1.1);  // Left wing tip
    arrowShape.closePath();

    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    arrowGeo.rotateX(Math.PI / 2); // Correct orientation along +Z

    this.navArrowMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24, // Bright gold
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.navArrowMesh = new THREE.Mesh(arrowGeo, this.navArrowMat);
    this.navArrowMesh.renderOrder = 20;
    this.navArrowGroup.add(this.navArrowMesh);

    // Inner glowing core pulse chevron
    const innerShape = new THREE.Shape();
    innerShape.moveTo(0, 1.58);
    innerShape.lineTo(0.3, 1.16);
    innerShape.lineTo(0.1, 1.22);
    innerShape.lineTo(0.06, 0.95);
    innerShape.lineTo(-0.06, 0.95);
    innerShape.lineTo(-0.1, 1.22);
    innerShape.lineTo(-0.3, 1.16);
    innerShape.closePath();

    const innerGeo = new THREE.ShapeGeometry(innerShape);
    innerGeo.rotateX(Math.PI / 2);
    this.navInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, // White core
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.navInnerMesh = new THREE.Mesh(innerGeo, this.navInnerMat);
    this.navInnerMesh.position.y = 0.005;
    this.navInnerMesh.renderOrder = 21;
    this.navArrowGroup.add(this.navInnerMesh);

    // Subtle guide arc
    const ringGeo = new THREE.RingGeometry(0.85, 0.96, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.navRingMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    this.navRingMesh.position.y = 0.002;
    this.navRingMesh.renderOrder = 19;
    this.navArrowGroup.add(this.navRingMesh);

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
    if (this.modelType === 'axie' || this.axieId) {
      try {
        const res = await axieMixerService.loadAxieHero({
          axieId: this.axieId || '10455',
          genes: this.genes,
          renderer: renderer,
          scale: this.scale || 0.88,
          heroId: this.heroId || 'kotaro'
        });

        this.axie = res.axie;
        this.mesh = res.wrapper;
        this.mesh.position.set(0, 0, 0);
        this.group.add(this.mesh);

        // Apply Inverted Hull Toon Style Outline
        this.toonOutline = applyToonOutline(this.mesh, {
          thickness: 0.022,
          color: 0x15161e,
          mode: 'view'
        });

        this.currentAnim = 'idle';
        console.log(`[PlayerEntity] Loaded 3D Axie character for hero: ${this.name} (#${this.axieId || '10455'})`);
        return;
      } catch (err) {
        console.error(`[PlayerEntity] Failed to load Axie model for ${this.heroId}, falling back to GLTF:`, err);
      }
    }

    const loader = new GLTFLoader();
    let fallbackModel = this.heroId || this.modelType || 'kotaro';
    if (fallbackModel === 'axie' || fallbackModel === 'shinji') fallbackModel = 'kotaro';
    let modelPath = `./assets/models/${fallbackModel}.glb`;

    try {
      const gltf = await loader.loadAsync(modelPath);
      this.mesh = gltf.scene;

      let s = this.scale;
      if (fallbackModel === 'kotaro') s = 0.95;
      else if (this.modelType === 'fox') s = 0.018;
      else if (this.modelType === 'buba') s = 1.15;
      else if (this.modelType === 'kibo') s = 1.35;
      else if (this.modelType === 'puffy') s = 1.3;

      this.mesh.scale.set(s, s, s);

      this.mesh.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.6;
            child.material.metalness = 0.15;
          }
        }
      });

      this.group.add(this.mesh);

      // Apply Inverted Hull Toon Style Outline
      this.toonOutline = applyToonOutline(this.mesh, {
        thickness: 0.022,
        color: 0x15161e,
        mode: 'view'
      });

      // Animation Setup
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);

        gltf.animations.forEach(clip => {
          const lowerName = clip.name.toLowerCase();
          const action = this.mixer.clipAction(clip);
          this.actions[lowerName] = action;

          if (!this.actions['idle'] && (lowerName.includes('idle') || lowerName.includes('wait') || lowerName.includes('stand'))) {
            this.actions['idle'] = action;
          }
          if (!this.actions['run'] && (lowerName.includes('run') || lowerName.includes('walk') || lowerName.includes('move'))) {
            this.actions['run'] = action;
          }
          if (!this.actions['attack'] && (lowerName.includes('attack') || lowerName.includes('action') || lowerName.includes('hit'))) {
            this.actions['attack'] = action;
          }
        });

        // Fallbacks if named clips weren't matched
        if (!this.actions['idle'] && gltf.animations[0]) {
          this.actions['idle'] = this.mixer.clipAction(gltf.animations[0]);
        }
        if (!this.actions['run'] && gltf.animations.length > 1) {
          this.actions['run'] = this.mixer.clipAction(gltf.animations[1]);
        } else if (!this.actions['run'] && this.actions['idle']) {
          this.actions['run'] = this.actions['idle'];
        }

        // Start in idle
        if (this.actions['idle']) {
          this.activeAction = this.actions['idle'];
          this.activeAction.play();
          this.currentAnim = 'idle';
        }
      }

      console.log(`[PlayerEntity] Loaded model for hero: ${this.name} (${this.heroId})`);
    } catch (err) {
      console.error(`[PlayerEntity] Failed to load model for ${this.heroId}:`, err);
      // Create a friendly fallback stylized placeholder mesh
      const geo = new THREE.SphereGeometry(0.7, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.position.y = 0.7;
      this.group.add(this.mesh);
    }
  }

  setAnimation(name, duration = 0.25) {
    if (this.currentAnim === name) return;

    if (this.axie && typeof this.axie.playAnimation === 'function') {
      const lower = name.toLowerCase();
      if (lower === 'idle' || lower === 'stand') {
        this.axie.playAnimation('Default.Idle');
      } else if (lower === 'run' || lower === 'move') {
        this.axie.playAnimation('Default.Run');
      } else if (lower === 'walk') {
        this.axie.playAnimation('Default.Walk');
      } else if (lower === 'attack') {
        this.axie.playAnimation('Action.AttackCombo');
      } else {
        this.axie.playAnimation(name);
      }
      this.currentAnim = name;
      return;
    }

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
    // Cheerful bounce presentation
    const startY = this.position.y;
    const startTime = performance.now();
    const animateBounce = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed < 0.8) {
        const bounce = Math.sin((elapsed / 0.8) * Math.PI) * 0.45;
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
  }

  update(dt, time) {
    if (this.axie && typeof this.axie.update === 'function') {
      this.axie.update(dt);
    } else if (this.mixer) {
      this.mixer.update(dt);
    }

    // Smooth yaw rotation towards targetYaw
    let diff = this.targetYaw - this.yaw;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.yaw += diff * Math.min(1.0, this.turnSpeed * dt);

    if (this.mesh && !this.isSaluting) {
      this.mesh.rotation.y = this.yaw;
    }

    this.group.position.copy(this.position);

    // Safeguard: mesh must always be at local (0, 0) of the hero group
    if (this.mesh && (this.mesh.position.x !== 0 || this.mesh.position.z !== 0)) {
      this.mesh.position.x = 0;
      this.mesh.position.z = 0;
    }

    // Pulse aura gently
    if (this.auraMesh) {
      const pulse = 0.65 + Math.sin(time * 3.5) * 0.15;
      this.auraMesh.material.opacity = pulse;
    }

    // Update ground navigation arrow
    if (this.navArrowGroup && this.navArrowGroup.visible && this.navTargetWorldPos) {
      const dx = this.navTargetWorldPos.x - this.position.x;
      const dz = this.navTargetWorldPos.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.35) {
        const targetAngle = Math.atan2(dx, dz);

        let diff = targetAngle - this.currentNavAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.currentNavAngle += diff * Math.min(1.0, 14.0 * dt);

        this.navArrowGroup.rotation.y = this.currentNavAngle;

        const arrowPulse = Math.sin(time * 5.0) * 0.08;
        this.navArrowGroup.scale.set(1.0 + arrowPulse, 1.0, 1.0 + arrowPulse);
        if (this.navArrowMat) {
          this.navArrowMat.opacity = 0.75 + arrowPulse * 1.5;
        }
      }
    }
  }
}
