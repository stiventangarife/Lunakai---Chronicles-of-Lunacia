// Unit.js - Combatant Entity (Axie Heroes & Chimera Monsters)
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { axieMixerService } from '../rpg/AxieMixerService.js';
import { applyToonOutline } from '../rpg/stylized/ToonOutline.js';

export class Unit {
  constructor(config, gridManager, sceneManager, audio) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.archetype = config.archetype || null;
    this.type = config.type;
    this.team = config.team;
    this.gridManager = gridManager;
    this.sceneManager = sceneManager;
    this.audio = audio;

    this.maxHP = config.maxHP || 300;
    this.currentHP = this.maxHP;
    this.shield = config.initialShield || 0;
    this.bonusDamage = config.bonusDamage || 0;
    this.bonusMeleeDamage = config.bonusMeleeDamage || 0;
    this.bonusRangedDamage = config.bonusRangedDamage || 0;
    this.bonusMagicDamage = config.bonusMagicDamage || 0;
    this.collisionBonus = config.collisionBonus || 0;
    this.critRate = config.critRate || 0;
    this.supportPower = config.supportPower || 0;
    this.skillLevels = config.skillLevels || {};
    this.maxPA = config.maxPA || 6;
    this.currentPA = this.maxPA;
    this.maxPM = config.maxPM || 3;
    this.currentPM = this.maxPM;
    this.initiative = config.initiative || 100;

    this.spellIds = config.spellIds || [];
    this.buffs = [];

    this.gridX = config.x || 0;
    this.gridZ = config.z || 0;

    this.group = new THREE.Group();
    this.mesh = null;
    this.mixer = null;
    this.actions = {};
    this.idleClip = null;
    this.runClip = null;
    this.attackClip = null;

    this.isDead = false;
    this.isMoving = false;
    this.isActiveTurn = false;

    this._flashTimeouts = [];
    this._shakeInterval = null;

    this.ringMesh = null;
    this.activeRuneMesh = null;

    this.hudSprite = null;
    this.hudCanvas = null;
    this.hudCtx = null;

    this._createTacticalRings();
    this._createOverheadHUD();

    this.sceneManager.scene.add(this.group);
    this.updateWorldPosition();

    const tile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (tile) tile.unit = this;
  }

  getSkillLevel(spellId) {
    return (this.skillLevels && this.skillLevels[spellId]) || 1;
  }

  async loadModel() {
    if (this.config.modelType === 'axie' || this.config.axieId) {
      try {
        const res = await axieMixerService.loadAxieHero({
          axieId: this.config.axieId || '10455',
          genes: this.config.genes,
          renderer: this.sceneManager.renderer,
          scale: this.config.scale || 0.88,
          heroId: this.id
        });

        this.axie = res.axie;
        this.mesh = res.wrapper;
        this.mesh.position.set(0, 0, 0);
        this.baseScale = this.config.scale || 0.88;
        this.group.add(this.mesh);

        // Apply Toon Outline
        this.toonOutline = applyToonOutline(this.mesh, {
          thickness: 0.022,
          color: 0x15161e,
          mode: 'view'
        });

        if (this.config.initialFacing !== undefined) {
          this.mesh.rotation.y = this.config.initialFacing;
        } else {
          this.mesh.rotation.y = this.team === 'player' ? Math.PI / 4 : -3 * Math.PI / 4;
        }

        console.log(`[Unit] Loaded 3D Axie character for unit: ${this.name} (#${this.config.axieId || '10455'})`);
        return true;
      } catch (err) {
        console.error(`[Unit] Failed to load Axie model for ${this.name}, falling back to GLTF:`, err);
      }
    }

    const loader = new GLTFLoader();
    let modelType = this.type;
    // Model name alias resolution
    if (modelType === 'axie' || modelType === 'shinji' || !modelType) {
      modelType = (this.id === 'tripp') ? 'tripp' : 'kotaro';
    }
    if (modelType === 'slime_basic' || modelType === 'slime_forest') modelType = 'slime';
    else if (modelType === 'slime_attack') modelType = 'slime-attack';
    else if (modelType === 'slime_defese') modelType = 'slime-defese';
    else if (modelType === 'slime_support') modelType = 'slime-support';
    else if (modelType === 'slime_forest_a') modelType = 'slime-forest-a';
    else if (modelType === 'slime_forest_b') modelType = 'slime-forest-b';
    else if (modelType === 'slime_fusion') modelType = 'slime-fusion';
    else if (modelType === 'wolf_aquatic') modelType = 'wolf-aquatic';
    else if (modelType === 'wolf_aquatic_alpha') modelType = 'wolf-aquatic-alpha';
    else if (modelType === 'wolf_gray') modelType = 'wolf-gray';
    else if (modelType === 'wolf_alpha') modelType = 'wolf-alpha';
    else if (modelType === 'treant_flower') modelType = 'treant-flower';
    else if (modelType === 'dryad_fighter') modelType = 'dryad-fighter';
    else if (modelType === 'dryad_mage') modelType = 'dryad-mage';
    else if (modelType === 'dryad_range') modelType = 'dryad-range';
    else if (modelType === 'werewolf_boss') modelType = 'werewolf-boss';
    else if (modelType === 'bear_mom') modelType = 'bear-mom';
    else if (modelType === 'bear_dad') modelType = 'bear-dad';

    let modelPath = './assets/models/' + modelType + '.glb';
    if (modelType === 'sapidae' || modelType.startsWith('chimera')) {
      modelPath = './assets/models/dryad-fighter.glb';
    }

    try {
      const gltf = await loader.loadAsync(modelPath);
      this.mesh = gltf.scene;
      
      let scale = this.config.scale;
      if (!scale) {
        if (modelType === 'fox') scale = 0.018;
        else if (modelType === 'werewolf-boss') scale = 2.10;
        else if (modelType === 'bear-dad') scale = 2.05;
        else if (modelType === 'bear-mom') scale = 1.85;
        else if (modelType.startsWith('bear-')) scale = 1.90;
        else if (modelType === 'wolf-alpha') scale = 1.65;
        else if (modelType === 'wolf-aquatic-alpha') scale = 1.60;
        else if (modelType.startsWith('wolf-')) scale = 1.25;
        else if (modelType.startsWith('dryad-')) scale = 1.50;
        else if (modelType === 'treant-flower') scale = 1.25;
        else if (modelType === 'buba') scale = 1.15;
        else if (modelType === 'kibo') scale = 1.35;
        else if (modelType === 'puffy') scale = 1.3;
        else if (modelType === 'slime-forest-b') scale = 1.30;
        else if (modelType === 'slime-defese' || modelType === 'slime-fusion') scale = 1.12;
        else scale = 1.05;
      }
      // Safety guard: only 'fox' should EVER have scale < 0.1
      if (modelType !== 'fox' && scale < 0.1) {
        scale = 1.05;
      }
      this.baseScale = scale;
      this.mesh.scale.set(scale, scale, scale);
      if (this.hudSprite) {
        this.hudSprite.position.y = Math.max(2.3, scale * 1.1 + 0.4);
      }

      if (this.config.tintColor) {
        this.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.material.color.multiplyScalar(0.65).add(new THREE.Color(this.config.tintColor).multiplyScalar(0.45));
          }
        });
      }

      this.mesh.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material = child.material.clone();
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              if (mat) {
                mat.userData = mat.userData || {};
                mat.userData.baseEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
                mat.userData.baseEmissiveIntensity = (mat.emissiveIntensity !== undefined) ? mat.emissiveIntensity : 0.0;
              }
            });
          }
        }
      });

      this.group.add(this.mesh);

      // Apply Inverted Hull Toon Style Outline to GLTF units (squad allies and enemy chimeras)
      this.toonOutline = applyToonOutline(this.mesh, {
        thickness: 0.022,
        color: 0x15161e,
        mode: 'view'
      });

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);
        gltf.animations.forEach(clip => {
          this.actions[clip.name] = this.mixer.clipAction(clip);
        });

        const clipNames = Object.keys(this.actions);
        
        // Prioritized detection: Idle, Run, Walk, Attack, Skill
        const idleName = clipNames.find(n => {
          const ln = n.toLowerCase();
          return ln.endsWith('.idle') || ln === 'idle' || ln.includes('idle') || ln.includes('survey');
        }) || clipNames[0];

        const runName = clipNames.find(n => {
          const ln = n.toLowerCase();
          return ln.endsWith('.run') || ln === 'run' || ln.includes('run') || ln.endsWith('.walk') || ln === 'walk' || ln.includes('walk');
        }) || null;

        const attackName = clipNames.find(n => {
          const ln = n.toLowerCase();
          return ln.includes('attack') || ln.includes('skill');
        }) || runName;

        this.idleClip = this.actions[idleName];
        this.runClip = runName ? this.actions[runName] : null;
        this.attackClip = attackName ? this.actions[attackName] : null;

        // Flag indicating true run animation
        this.hasRunAnimation = Boolean(this.runClip && this.runClip !== this.idleClip);

        if (this.idleClip) {
          this.idleClip.play();
        }
      }

      if (this.config.initialFacing !== undefined) {
        this.mesh.rotation.y = this.config.initialFacing;
      } else {
        this.mesh.rotation.y = this.team === 'player' ? Math.PI / 4 : -3 * Math.PI / 4;
      }

      console.log('Unit ' + this.name + ' (' + this.type + ') loaded successfully.');
      return true;
    } catch (err) {
      console.warn('Failed loading model for ' + this.name + ', using fallback:', err);
      this._createProceduralFallback();
      return true;
    }
  }

  _createProceduralFallback() {
    const geo = new THREE.SphereGeometry(0.65, 16, 16);
    const color = this.team === 'player' ? 0x22c55e : 0xef4444;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    mat.userData = mat.userData || {};
    mat.userData.baseEmissive = new THREE.Color(0x000000);
    mat.userData.baseEmissiveIntensity = 0.0;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.65;
    this.mesh.castShadow = true;
    this.group.add(this.mesh);
  }

  _createTacticalRings() {
    // Soft contact shadow disc for grounded visual presence
    const shadowGeo = new THREE.CircleGeometry(0.55, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x051a08,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.015;
    this.group.add(shadowMesh);

    const ringGeo = new THREE.RingGeometry(0.55, 0.68, 32);
    const ringColor = this.team === 'player' ? 0x00d2ff : 0xff3b30;
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.y = 0.035;
    this.group.add(this.ringMesh);

    const activeGeo = new THREE.RingGeometry(0.72, 0.86, 32);
    const activeMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    this.activeRuneMesh = new THREE.Mesh(activeGeo, activeMat);
    this.activeRuneMesh.rotation.x = -Math.PI / 2;
    this.activeRuneMesh.position.y = 0.04;
    this.activeRuneMesh.visible = false;
    this.group.add(this.activeRuneMesh);
  }

  _createOverheadHUD() {
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = 256;
    this.hudCanvas.height = 128;
    this.hudCtx = this.hudCanvas.getContext('2d');

    const texture = new THREE.CanvasTexture(this.hudCanvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.hudSprite = new THREE.Sprite(spriteMat);
    const hudY = this.baseScale ? Math.max(2.3, this.baseScale * 1.1 + 0.4) : 2.3;
    this.hudSprite.position.set(0, hudY, 0);
    this.hudSprite.scale.set(1.9, 0.95, 1);
    this.group.add(this.hudSprite);

    this.updateHUD();
  }

  updateHUD() {
    if (!this.hudCtx) return;
    const ctx = this.hudCtx;
    const w = 256;
    const h = 128;
    ctx.clearRect(0, 0, w, h);

    if (this.isDead) {
      this.hudSprite.material.map.needsUpdate = true;
      return;
    }

    ctx.fillStyle = 'rgba(12, 19, 31, 0.85)';
    ctx.beginPath();
    ctx.roundRect(16, 16, w - 32, h - 32, 12);
    ctx.fill();

    ctx.strokeStyle = this.isActiveTurn ? '#ffd700' : (this.team === 'player' ? '#00d2ff' : '#ff4d4d');
    ctx.lineWidth = this.isActiveTurn ? 4 : 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, w / 2, 44);

    const barX = 28;
    const barY = 56;
    const barW = w - 56;
    const barH = 16;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();

    const hpRatio = Math.max(0, Math.min(1, this.currentHP / this.maxHP));
    const fillW = barW * hpRatio;
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    if (this.team === 'player') {
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(1, '#34d399');
    } else {
      grad.addColorStop(0, '#ef4444');
      grad.addColorStop(1, '#f87171');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 8);
    ctx.fill();

    if (this.shield > 0) {
      const shieldRatio = Math.min(1, this.shield / this.maxHP);
      const shieldW = barW * shieldRatio;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, shieldW, barH, 8);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 8);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    const hpText = this.shield > 0 ? `${this.currentHP}+${this.shield}🛡️ / ${this.maxHP}` : `${this.currentHP} / ${this.maxHP}`;
    ctx.fillText(hpText, w / 2, barY + 12);

    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('★ ' + this.currentPA + ' PA', w / 2 - 46, 96);

    ctx.fillStyle = '#4ade80';
    ctx.fillText('👟 ' + this.currentPM + ' PM', w / 2 + 46, 96);

    this.hudSprite.material.map.needsUpdate = true;
  }

  setActiveTurn(isActive) {
    this.isActiveTurn = isActive;
    if (this.activeRuneMesh) {
      this.activeRuneMesh.visible = isActive;
    }
    this.updateHUD();
  }

  startTurn() {
    this.clearDamageFlash();
    this.setActiveTurn(true);
    this.currentPA = this.maxPA;
    this.currentPM = this.maxPM;

    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      if (b.type === 'bonusPA') {
        this.currentPA += b.value;
      } else if (b.type === 'minusPM') {
        this.currentPM = Math.max(0, this.currentPM - b.value);
      }
      b.duration--;
      if (b.duration <= 0) {
        this.buffs.splice(i, 1);
      }
    }

    this.updateHUD();
    this.audio.playTurnStart(this.team === 'player');
  }

  endTurn() {
    this.clearDamageFlash();
    this.setActiveTurn(false);
    this.shield = 0;
    this.updateHUD();
  }

  updateWorldPosition() {
    const worldPos = this.gridManager.gridToWorld(this.gridX, this.gridZ);
    this.group.position.set(worldPos.x, 0, worldPos.z);
  }

  async moveAlongPath(path) {
    if (!path || path.length <= 1) return;
    this.isMoving = true;

    // Trigger run animation if available
    if (this.axie && typeof this.axie.playAnimation === 'function') {
      this.axie.playAnimation('Default.Run');
    } else if (this.hasRunAnimation && this.runClip) {
      this.runClip.timeScale = 1.35;
      this.runClip.reset().fadeIn(0.12).play();
      if (this.idleClip) this.idleClip.fadeOut(0.12);
    }

    // 1. Clear origin tile reference immediately
    const originTile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (originTile && originTile.unit === this) originTile.unit = null;

    for (let i = 1; i < path.length; i++) {
      const nextStep = path[i];
      const isFinalStep = (i === path.length - 1);

      // Strict Obstacle Guard: Never step into an obstacle or non-walkable tile
      const stepTile = this.gridManager.getTile(nextStep.x, nextStep.z);
      if (!stepTile || !stepTile.walkable || stepTile.obstacle) {
        console.warn(`[Unit.moveAlongPath] Blocked illegal step onto obstacle/unwalkable cell (${nextStep.x}, ${nextStep.z}) by "${this.name}". Halting movement.`);
        break;
      }

      await this._slideOrHopToCell(nextStep.x, nextStep.z);

      this.gridX = nextStep.x;
      this.gridZ = nextStep.z;
      this.currentPM = Math.max(0, this.currentPM - 1);
      this.updateHUD();

      // Only assign tile.unit if this is the final destination,
      // never overwrite an ally standing on an intermediate pass-through cell!
      if (isFinalStep) {
        const destTile = this.gridManager.getTile(nextStep.x, nextStep.z);
        if (destTile) destTile.unit = this;
      }
    }

    // Ensure final tile has unit registered
    const finalTile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (finalTile) finalTile.unit = this;

    // Return to idle animation
    if (this.axie && typeof this.axie.playAnimation === 'function') {
      this.axie.playAnimation('Default.Idle');
    } else if (this.hasRunAnimation && this.runClip) {
      if (this.idleClip) this.idleClip.reset().fadeIn(0.15).play();
      this.runClip.fadeOut(0.15);
    }

    this.isMoving = false;
  }

  _slideOrHopToCell(targetX, targetZ, duration = 0.38) {
    return new Promise(resolve => {
      const startPos = this.group.position.clone();
      const endPos = this.gridManager.gridToWorld(targetX, targetZ);

      const dirX = endPos.x - startPos.x;
      const dirZ = endPos.z - startPos.z;
      const angle = Math.atan2(dirX, dirZ);
      if (this.mesh) this.mesh.rotation.y = angle;

      this.audio.playStep();

      const startTime = performance.now();
      // If the unit has running animation: hopHeight is 0 (runs naturally along the ground, NO saltitos!)
      // If the unit has no animation (e.g. procedural fallback), use subtle hop (0.2)
      const hopHeight = (this.hasRunAnimation || this.axie) ? 0.0 : 0.2;

      const animate = (now) => {
        const elapsed = (now - startTime) / 1000;
        const t = Math.min(1, elapsed / duration);

        // Smooth cubic ease-in-out for fluid translation
        const smoothT = t * t * (3 - 2 * t);
        const currentX = THREE.MathUtils.lerp(startPos.x, endPos.x, smoothT);
        const currentZ = THREE.MathUtils.lerp(startPos.z, endPos.z, smoothT);
        const currentY = hopHeight > 0 ? Math.sin(t * Math.PI) * hopHeight : 0.0;

        this.group.position.set(currentX, currentY, currentZ);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.group.position.set(endPos.x, 0, endPos.z);
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  _hopToCell(targetX, targetZ, duration = 0.45) {
    return new Promise(resolve => {
      this.isMoving = true;
      const startPos = this.group.position.clone();
      const endPos = this.gridManager.gridToWorld(targetX, targetZ);

      const dirX = endPos.x - startPos.x;
      const dirZ = endPos.z - startPos.z;
      const angle = Math.atan2(dirX, dirZ);
      if (this.mesh) this.mesh.rotation.y = angle;

      if (this.audio) this.audio.playStep();

      // Trigger jump or attack animation
      const activeClip = this.attackClip || this.runClip;
      if (activeClip) {
        if (this.idleClip) this.idleClip.fadeOut(0.08);
        activeClip.reset().fadeIn(0.06).play();
      }

      const startTime = performance.now();
      const peakJumpHeight = 1.85; // Dynamic leap over obstacles

      const animate = (now) => {
        const elapsed = (now - startTime) / 1000;
        const t = Math.min(1, elapsed / duration);

        const smoothT = t * t * (3 - 2 * t);
        const currentX = THREE.MathUtils.lerp(startPos.x, endPos.x, smoothT);
        const currentZ = THREE.MathUtils.lerp(startPos.z, endPos.z, smoothT);
        const currentY = Math.sin(t * Math.PI) * peakJumpHeight;

        this.group.position.set(currentX, currentY, currentZ);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.group.position.set(endPos.x, 0, endPos.z);
          if (activeClip) {
            activeClip.fadeOut(0.12);
            if (this.idleClip) this.idleClip.reset().fadeIn(0.12).play();
          }
          this.isMoving = false;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  jumpToCell(targetX, targetZ, duration = 0.45) {
    return this._hopToCell(targetX, targetZ, duration);
  }

  async pushback(dx, dz, distance) {
    let actualPushed = 0;
    let hitObstacle = false;
    let collidingUnit = null;

    for (let s = 1; s <= distance; s++) {
      const testX = this.gridX + dx;
      const testZ = this.gridZ + dz;

      if (!this.gridManager.isValidCoord(testX, testZ)) {
        hitObstacle = true;
        break;
      }

      const tile = this.gridManager.getTile(testX, testZ);
      if (!tile.walkable || tile.obstacle) {
        hitObstacle = true;
        break;
      }

      if (tile.unit) {
        collidingUnit = tile.unit;
        hitObstacle = true;
        break;
      }

      const oldTile = this.gridManager.getTile(this.gridX, this.gridZ);
      if (oldTile && oldTile.unit === this) oldTile.unit = null;
      tile.unit = this;

      this.gridX = testX;
      this.gridZ = testZ;
      actualPushed++;

      await this._slidePush(testX, testZ, 0.12);
    }

    const remainingTiles = distance - actualPushed;
    return {
      actualPushed,
      hitObstacle,
      remainingTiles,
      collidingUnit
    };
  }

  _slidePush(targetX, targetZ, duration = 0.12) {
    return new Promise(resolve => {
      const startPos = this.group.position.clone();
      const endPos = this.gridManager.gridToWorld(targetX, targetZ);
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = (now - startTime) / 1000;
        const t = Math.min(1, elapsed / duration);
        this.group.position.lerpVectors(startPos, endPos, t);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.group.position.copy(endPos);
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  takeDamage(amount) {
    if (this.isDead) return 0;
    let actualDamage = amount;

    if (this.shield > 0) {
      if (this.shield >= actualDamage) {
        this.shield -= actualDamage;
        actualDamage = 0;
      } else {
        actualDamage -= this.shield;
        this.shield = 0;
      }
    }

    this.currentHP = Math.max(0, this.currentHP - actualDamage);
    this.updateHUD();
    this._flashDamage();

    if (this.currentHP <= 0) {
      const g = window.tacticsGame;
      const isLastEnemy = this.team === 'enemy' && g && g.units.filter(u => u.team === 'enemy' && !u.isDead && u !== this).length === 0;
      if (isLastEnemy) {
        this.dieCinematic(this.sceneManager, this.audio, g.spellManager ? g.spellManager.vfxManager : null);
      } else {
        this.die();
      }
    }

    return actualDamage;
  }

  heal(amount) {
    if (this.isDead) return 0;
    const prev = this.currentHP;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    this.updateHUD();
    return this.currentHP - prev;
  }

  addShield(amount) {
    this.shield += amount;
    this.updateHUD();
  }

  _flashDamage() {
    if (!this.mesh) return;

    // Clear any active flash timeout so rapid overlapping hits don't conflict
    if (this._flashTimeouts && this._flashTimeouts.length > 0) {
      this._flashTimeouts.forEach(t => clearTimeout(t));
      this._flashTimeouts = [];
    } else {
      this._flashTimeouts = [];
    }

    // 1. White-hot emissive flash on all mesh components
    this.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat && mat.emissive) {
            mat.userData = mat.userData || {};
            // Record pristine baseline emissive if not yet recorded
            if (!mat.userData.baseEmissive) {
              mat.userData.baseEmissive = mat.emissive.clone();
              mat.userData.baseEmissiveIntensity = (mat.emissiveIntensity !== undefined) ? mat.emissiveIntensity : 0.0;
            }
            mat.emissive.setHex(0xffffff);
            mat.emissiveIntensity = 1.35;
          }
        });
      }
    });

    const restoreTimeout = setTimeout(() => {
      this.resetEmissive();
    }, 140);
    this._flashTimeouts.push(restoreTimeout);

    // 2. Squash & Stretch Recoil and Micro-shake
    if (this._shakeInterval) {
      clearInterval(this._shakeInterval);
      this._shakeInterval = null;
    }

    const baseScale = this.baseScale || this.config.scale || 1.15;
    this.mesh.scale.set(baseScale * 1.25, baseScale * 0.75, baseScale * 1.25);

    let shakeStep = 0;
    this._shakeInterval = setInterval(() => {
      shakeStep++;
      const ox = (Math.random() - 0.5) * 0.16;
      const oz = (Math.random() - 0.5) * 0.16;
      this.mesh.position.set(ox, 0, oz);

      if (shakeStep >= 6) {
        clearInterval(this._shakeInterval);
        this._shakeInterval = null;
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(baseScale, baseScale, baseScale);
      }
    }, 22);
  }

  clearDamageFlash() {
    if (this._flashTimeouts && this._flashTimeouts.length > 0) {
      this._flashTimeouts.forEach(t => clearTimeout(t));
      this._flashTimeouts = [];
    }
    if (this._shakeInterval) {
      clearInterval(this._shakeInterval);
      this._shakeInterval = null;
      if (this.mesh) {
        const baseScale = this.baseScale || this.config.scale || 1.15;
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(baseScale, baseScale, baseScale);
      }
    }
    this.resetEmissive();
  }

  resetEmissive() {
    if (!this.mesh) return;
    this.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat && mat.emissive) {
            const baseCol = (mat.userData && mat.userData.baseEmissive) ? mat.userData.baseEmissive : new THREE.Color(0x000000);
            const baseInt = (mat.userData && mat.userData.baseEmissiveIntensity !== undefined) ? mat.userData.baseEmissiveIntensity : 0.0;
            mat.emissive.copy(baseCol);
            mat.emissiveIntensity = baseInt;
          }
        });
      }
    });
  }

  die() {
    this.isDead = true;
    this.clearDamageFlash();
    const tile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (tile && tile.unit === this) tile.unit = null;

    return this._playArcadeDeathVFX(false);
  }

  async _playArcadeDeathVFX(isCinematic = false) {
    const scene = this.sceneManager.scene;
    const wPos = this.gridManager.gridToWorld(this.gridX, this.gridZ);

    if (this.ringMesh) this.ringMesh.visible = false;
    if (this.activeRuneMesh) this.activeRuneMesh.visible = false;

    this.deathVFXPhasesHistory = [];
    const setPhase = (phase) => {
      this.deathVFXPhase = phase;
      if (!this.deathVFXPhasesHistory.includes(phase)) {
        this.deathVFXPhasesHistory.push(phase);
      }
    };

    setPhase('blinking');

    // Helper to flash white
    const setWhiteFlash = (active) => {
      if (!this.mesh) return;
      this.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            if (active) {
              mat.userData = mat.userData || {};
              if (!mat.userData.baseEmissive) {
                mat.userData.baseEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
                mat.userData.baseEmissiveIntensity = (mat.emissiveIntensity !== undefined) ? mat.emissiveIntensity : 0.0;
              }
              if (mat.emissive) {
                mat.emissive.setHex(0xffffff);
                mat.emissiveIntensity = 2.8;
              }
            } else {
              if (mat.emissive) {
                const baseCol = (mat.userData && mat.userData.baseEmissive) ? mat.userData.baseEmissive : new THREE.Color(0x000000);
                const baseInt = (mat.userData && mat.userData.baseEmissiveIntensity !== undefined) ? mat.userData.baseEmissiveIntensity : 0.0;
                mat.emissive.copy(baseCol);
                mat.emissiveIntensity = baseInt;
              }
            }
          });
        }
      });
    };

    // 1. Flash 1 (White blink)
    setWhiteFlash(true);
    if (this.audio && this.audio.playHit) this.audio.playHit();
    await new Promise(r => setTimeout(r, 90));
    setWhiteFlash(false);
    await new Promise(r => setTimeout(r, 80));

    // 2. Flash 2 (White blink)
    setWhiteFlash(true);
    await new Promise(r => setTimeout(r, 90));
    setWhiteFlash(false);
    await new Promise(r => setTimeout(r, 70));

    // 3. Third beat: Mesh disappears, replaced by a glowing white sphere
    setPhase('core_sphere');
    if (this.mesh) this.mesh.visible = false;
    if (this.toonOutline) this.toonOutline.setVisible(false);
    if (this.hudSprite) this.hudSprite.visible = false;

    const coreGeo = new THREE.SphereGeometry(isCinematic ? 0.85 : 0.65, 20, 20);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    coreSphere.position.set(wPos.x, 0.85, wPos.z);
    scene.add(coreSphere);

    const flashLight = new THREE.PointLight(0xffffff, isCinematic ? 4.5 : 3.0, 6.0);
    flashLight.position.set(wPos.x, 0.9, wPos.z);
    scene.add(flashLight);

    if (this.audio) this.audio.playDisintegrationBurst();

    // Pulse & expand central sphere with perceptible radiance (180ms)
    const t0 = performance.now();
    await new Promise(resolve => {
      const expand = (now) => {
        const p = Math.min(1.0, (now - t0) / 180);
        const s = 1.0 + Math.sin(p * Math.PI * 0.5) * 0.5;
        coreSphere.scale.set(s, s, s);
        if (p < 1.0) {
          requestAnimationFrame(expand);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(expand);
    });

    scene.remove(coreSphere);
    coreGeo.dispose();
    coreMat.dispose();

    // Shatter into multiple small glowing spheres bursting outward
    setPhase('particles');
    const numParticles = isCinematic ? 26 : 18;
    const particles = [];
    const sphereGeo = new THREE.SphereGeometry(0.14, 12, 12);
    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);

    for (let i = 0; i < numParticles; i++) {
      const pMat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfffbeb : 0xffffff,
        transparent: true,
        opacity: 1.0
      });
      const pMesh = new THREE.Mesh(sphereGeo, pMat);
      pMesh.position.set(wPos.x, 0.85, wPos.z);

      const angle = (i / numParticles) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = (isCinematic ? 4.5 : 3.5) + Math.random() * 3.8;
      const velX = Math.cos(angle) * speed;
      const velZ = Math.sin(angle) * speed;
      const velY = 2.0 + Math.random() * 3.5;

      particlesGroup.add(pMesh);
      particles.push({
        mesh: pMesh,
        mat: pMat,
        vel: new THREE.Vector3(velX, velY, velZ),
        scale: 1.0
      });
    }

    // Animate shattered particles bursting and fading
    const burstStart = performance.now();
    const burstDuration = isCinematic ? 800 : 650;

    await new Promise(resolve => {
      let lastTime = burstStart;
      const updateParticles = (now) => {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const p = Math.min(1.0, (now - burstStart) / burstDuration);

        particles.forEach(pt => {
          pt.mesh.position.x += pt.vel.x * dt;
          pt.mesh.position.y += pt.vel.y * dt;
          pt.mesh.position.z += pt.vel.z * dt;
          pt.vel.y -= 10.5 * dt;

          const lifeAlpha = Math.max(0, 1.0 - p);
          pt.mat.opacity = lifeAlpha;
          const sc = Math.max(0.01, (1.0 - p * 0.75));
          pt.mesh.scale.set(sc, sc, sc);
        });

        flashLight.intensity = Math.max(0, (isCinematic ? 4.5 : 3.0) * (1.0 - p));

        if (p < 1.0) {
          requestAnimationFrame(updateParticles);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(updateParticles);
    });

    scene.remove(particlesGroup);
    scene.remove(flashLight);
    sphereGeo.dispose();
    particles.forEach(pt => pt.mat.dispose());

    this.group.visible = false;
    setPhase('completed');
  }

  async dieCinematic(sceneManager, audio, vfxManager) {
    this.isDead = true;
    this.clearDamageFlash();
    const tile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (tile && tile.unit === this) tile.unit = null;

    const wPos = this.gridManager.gridToWorld(this.gridX, this.gridZ);

    // 1. Hit Stop: Freeze time briefly + Sub-bass rumble
    if (audio) audio.playHitStopBass();
    if (sceneManager) {
      sceneManager.shake(0.65);
      sceneManager.startCinematicZoom(wPos, 13.0, 7.2);
    }

    if (vfxManager) vfxManager.playCinematicFinisher(wPos);

    // Pause for the hit-stop impact feeling (380ms)
    await new Promise(r => setTimeout(r, 380));

    // Play arcade shatter VFX with cinematic scale
    await this._playArcadeDeathVFX(true);
  }

  playAttackAnimation() {
    if (this.axie && typeof this.axie.playAnimation === 'function') {
      try {
        this.axie.playAnimation('Action.AttackCombo');
        setTimeout(() => {
          if (this.axie && !this.isDead && !this.isMoving) {
            this.axie.playAnimation('Default.Idle');
          }
        }, 550);
      } catch (e) {
        console.warn('[Unit] Axie attack anim error:', e);
      }
    } else if (this.attackClip) {
      this.attackClip.reset().fadeIn(0.08).play();
      setTimeout(() => {
        if (this.idleClip) this.idleClip.reset().fadeIn(0.15).play();
        if (this.attackClip) this.attackClip.fadeOut(0.15);
      }, 350);
    }
  }

  update(dt, time) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
    if (this.axie && typeof this.axie.update === 'function') {
      this.axie.update(dt);
    }

    // Procedural organic breathing for static 3D meshes (slimes, wolves, dryads, bears)
    if (!this.mixer && !this.axie && this.mesh && !this.isDead && !this.isMoving) {
      const breath = Math.sin(time * 3.0 + (this.gridX * 2.1 + this.gridZ * 1.3)) * 0.035;
      this.mesh.position.y = Math.max(0, breath);
      if (this.baseScale) {
        const squash = 1.0 + breath * 0.08;
        this.mesh.scale.set(this.baseScale * (2 - squash), this.baseScale * squash, this.baseScale * (2 - squash));
      }
    }

    if (this.activeRuneMesh && this.isActiveTurn) {
      this.activeRuneMesh.rotation.z += dt * 2.0;
      const pulse = 0.95 + Math.sin(time * 5.0) * 0.15;
      this.activeRuneMesh.scale.set(pulse, pulse, pulse);
    }
  }
}
