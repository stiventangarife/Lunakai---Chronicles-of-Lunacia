// QuestInteractablesManager.js - Manages interactive quest gathering and encounter nodes in the Overworld
import * as THREE from 'three';

export class QuestInteractablesManager {
  constructor(scene, questManager, audioSystem, overworldManager) {
    this.scene = scene;
    this.questManager = questManager;
    this.audio = audioSystem;
    this.overworldManager = overworldManager;

    this.nodes = [];
    this.currentZoneKey = null;
    this.nearbyNode = null;
    this.interactionPromptEl = null;

    // Track gathered counts during the session
    this.gatheredCounts = {
      blizzard_mushrooms: new Set(),
      fallen_stardust: new Set()
    };

    this._createPromptDOM();
  }

  _createPromptDOM() {
    let el = document.getElementById('npc-interaction-prompt');
    this.interactionPromptEl = el;
  }

  /**
   * Spawns quest-specific interactables for the current zone if the respective quests are active.
   * @param {string} zoneKey - e.g. '2_2', '2_1', '1_2'
   */
  loadForZone(zoneKey) {
    this.clear();
    this.currentZoneKey = zoneKey;

    if (!this.questManager) return;

    // 1. Zone [2, 2] - Forest Elixir: Glowing Moss Plant near the stream
    if (zoneKey === '2_2') {
      const q = this.questManager.getQuest('quest_forest_elixir');
      const stepGather = q?.objective?.steps?.find(s => s.id === 'gather_moss');
      if (q && q.status === 'active' && stepGather && !stepGather.done) {
        this._spawnLuminousPlantNode({ x: 17.5, y: 0, z: -7.5 });
      }
    }

    // 2. Zone [2, 1] - Blizzard Stew: 3 Polar Mushrooms in the snow
    if (zoneKey === '2_1') {
      const q = this.questManager.getQuest('quest_blizzard_stew');
      const stepGather = q?.objective?.steps?.find(s => s.id === 'gather_frost_mushrooms');
      if (q && q.status === 'active' && stepGather && !stepGather.done) {
        const spots = [
          { id: 'mush_1', x: -16.0, z: 12.0 },
          { id: 'mush_2', x: 14.0, z: -10.0 },
          { id: 'mush_3', x: 22.0, z: 15.0 }
        ];
        spots.forEach(sp => {
          if (!this.gatheredCounts.blizzard_mushrooms.has(sp.id)) {
            this._spawnMushroomNode(sp);
          }
        });
      }
    }

    // 3. Zone [1, 2] - Fallen Stardust: 3 Shimmering Star Fragments in the Mystic nebulas
    if (zoneKey === '1_2') {
      const q = this.questManager.getQuest('quest_fallen_stardust');
      const stepGather = q?.objective?.steps?.find(s => s.id === 'gather_stardust');
      if (q && q.status === 'active' && stepGather && !stepGather.done) {
        const spots = [
          { id: 'star_1', x: -14.0, z: -12.0 },
          { id: 'star_2', x: 12.0, z: 15.0 },
          { id: 'star_3', x: 24.0, z: -6.0 }
        ];
        spots.forEach(sp => {
          if (!this.gatheredCounts.fallen_stardust.has(sp.id)) {
            this._spawnStardustNode(sp);
          }
        });
      }
    }
  }

  // --- NODE BUILDERS ---

  _spawnLuminousPlantNode(pos) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);

    // Glowing base ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.15, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.05;
    group.add(ringMesh);

    // Botanical plant stem & leaves (Stylized Emerald Flower)
    const stemGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.2, 12);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.6 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.6;
    stem.castShadow = true;
    group.add(stem);

    // Glowing Moss Bulb at the top
    const bulbGeo = new THREE.DodecahedronGeometry(0.48, 1);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.2,
      roughness: 0.3
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 1.25;
    group.add(bulb);

    // Ambient PointLight
    const pLight = new THREE.PointLight(0x34d399, 2.0, 6.0);
    pLight.position.y = 1.3;
    group.add(pLight);

    // Nameplate Sprite
    const sprite = this._createLabelSprite('🌿 Luminous Moss Sprout', '#34d399');
    sprite.position.set(0, 2.1, 0);
    group.add(sprite);

    this.scene.add(group);

    this.nodes.push({
      id: 'luminous_moss_plant',
      type: 'plant_guardian',
      group,
      bulb,
      radius: 2.8,
      promptText: 'Examine Glowing Sprout',
      onInteract: () => {
        // Trigger surprise slime combat guarding the plant!
        if (this.overworldManager && typeof this.overworldManager.triggerDirectQuestBattle === 'function') {
          this.overworldManager.triggerDirectQuestBattle('mob_rosalba_plant_guardian', 'forest');
        }
      }
    });
  }

  _spawnMushroomNode(spot) {
    const group = new THREE.Group();
    group.position.set(spot.x, 0, spot.z);

    // Frost aura base ring
    const ringGeo = new THREE.RingGeometry(0.5, 0.75, 20);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.05;
    group.add(ringMesh);

    // Stylized Polar Mushroom Stem
    const stemGeo = new THREE.CylinderGeometry(0.12, 0.22, 0.7, 10);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.35;
    stem.castShadow = true;
    group.add(stem);

    // Blue Frost Cap
    const capGeo = new THREE.ConeGeometry(0.55, 0.5, 12);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.8,
      roughness: 0.4
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.85;
    group.add(cap);

    // Label Sprite
    const currentCount = this.gatheredCounts.blizzard_mushrooms.size;
    const sprite = this._createLabelSprite(`🍄 Polar Mushroom (${currentCount}/3)`, '#38bdf8');
    sprite.position.set(0, 1.55, 0);
    group.add(sprite);

    this.scene.add(group);

    this.nodes.push({
      id: spot.id,
      type: 'gathering_mushroom',
      group,
      cap,
      labelSprite: sprite,
      radius: 2.5,
      promptText: `Gather Polar Mushroom (${this.gatheredCounts.blizzard_mushrooms.size}/3)`,
      onInteract: () => {
        this.gatheredCounts.blizzard_mushrooms.add(spot.id);
        if (this.audio && typeof this.audio.playItemGet === 'function') {
          this.audio.playItemGet();
        } else if (this.audio && typeof this.audio.playHover === 'function') {
          this.audio.playHover();
        }

        // Remove this node from 3D scene
        this._removeNode(spot.id);

        const count = this.gatheredCounts.blizzard_mushrooms.size;
        // Update labels on other mushroom nodes
        this.nodes.forEach(n => {
          if (n.type === 'gathering_mushroom' && n.labelSprite) {
            n.group.remove(n.labelSprite);
            n.labelSprite.material.dispose();
            n.labelSprite = this._createLabelSprite(`🍄 Polar Mushroom (${count}/3)`, '#38bdf8');
            n.labelSprite.position.set(0, 1.55, 0);
            n.group.add(n.labelSprite);
            n.promptText = `Gather Polar Mushroom (${count}/3)`;
          }
        });

        if (count >= 3) {
          if (this.questManager) {
            this.questManager.advanceStep('quest_blizzard_stew', 'gather_frost_mushrooms', true);
          }
          if (this.overworldManager && typeof this.overworldManager._showBannerMessage === 'function') {
            this.overworldManager._showBannerMessage('🍄 POLAR MUSHROOMS GATHERED (3/3)!', 'Bring the ingredients to Chef Boreal at [2, 1] [E].');
          }
        } else {
          if (this.overworldManager && typeof this.overworldManager._showBannerMessage === 'function') {
            this.overworldManager._showBannerMessage(`🍄 Polar Mushroom Gathered (${count}/3)`, 'Keep searching around the snowy terrain.');
          }
        }
      }
    });
  }

  _spawnStardustNode(spot) {
    const group = new THREE.Group();
    group.position.set(spot.x, 0, spot.z);

    // Cosmic Astral Ring
    const ringGeo = new THREE.RingGeometry(0.55, 0.85, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.05;
    group.add(ringMesh);

    // Floating Stardust Crystal (Octahedron with intense arcane glow)
    const crystalGeo = new THREE.OctahedronGeometry(0.42, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xc084fc,
      emissiveIntensity: 1.4,
      roughness: 0.2
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 0.85;
    group.add(crystal);

    // Purple Astral PointLight
    const pLight = new THREE.PointLight(0xc084fc, 2.2, 5.5);
    pLight.position.y = 0.9;
    group.add(pLight);

    // Label Sprite
    const currentCount = this.gatheredCounts.fallen_stardust.size;
    const sprite = this._createLabelSprite(`✨ Stardust (${currentCount}/3)`, '#c084fc');
    sprite.position.set(0, 1.75, 0);
    group.add(sprite);

    this.scene.add(group);

    this.nodes.push({
      id: spot.id,
      type: 'gathering_stardust',
      group,
      crystal,
      labelSprite: sprite,
      radius: 2.5,
      promptText: `Gather Stardust (${this.gatheredCounts.fallen_stardust.size}/3)`,
      onInteract: () => {
        this.gatheredCounts.fallen_stardust.add(spot.id);
        if (this.audio && typeof this.audio.playItemGet === 'function') {
          this.audio.playItemGet();
        } else if (this.audio && typeof this.audio.playHover === 'function') {
          this.audio.playHover();
        }

        // Remove node
        this._removeNode(spot.id);

        const count = this.gatheredCounts.fallen_stardust.size;
        // Update labels on remaining nodes
        this.nodes.forEach(n => {
          if (n.type === 'gathering_stardust' && n.labelSprite) {
            n.group.remove(n.labelSprite);
            n.labelSprite.material.dispose();
            n.labelSprite = this._createLabelSprite(`✨ Stardust (${count}/3)`, '#c084fc');
            n.labelSprite.position.set(0, 1.75, 0);
            n.group.add(n.labelSprite);
            n.promptText = `Gather Stardust (${count}/3)`;
          }
        });

        if (count >= 3) {
          if (this.questManager) {
            this.questManager.advanceStep('quest_fallen_stardust', 'gather_stardust', true);
          }
          if (this.overworldManager && typeof this.overworldManager._showBannerMessage === 'function') {
            this.overworldManager._showBannerMessage('✨ STARDUST GATHERED (3/3)!', 'Bring the fragments to the Astral Astrologer at [1, 2] [E].');
          }
        } else {
          if (this.overworldManager && typeof this.overworldManager._showBannerMessage === 'function') {
            this.overworldManager._showBannerMessage(`✨ Star Fragment Obtained (${count}/3)`, 'Follow the arcane lights in the nebula.');
          }
        }
      }
    });
  }

  _removeNode(nodeId) {
    const idx = this.nodes.findIndex(n => n.id === nodeId);
    if (idx !== -1) {
      const node = this.nodes[idx];
      this._disposeNodeGroup(node.group);
      this.scene.remove(node.group);
      this.nodes.splice(idx, 1);
      if (this.nearbyNode === node) {
        this.nearbyNode = null;
        this.hidePrompt();
      }
    }
  }

  _createLabelSprite(text, strokeColor = '#38bdf8') {
    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 364, 54, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 190, 42);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.8, 0.55, 1);
    return sprite;
  }

  _disposeNodeGroup(group) {
    if (!group) return;
    group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }

  /**
   * Called on every animation frame to update floating animations and proximity checks.
   */
  update(delta, playerPos) {
    if (!playerPos || this.nodes.length === 0) {
      if (this.nearbyNode) {
        this.nearbyNode = null;
        this.hidePrompt();
      }
      return;
    }

    const time = performance.now() * 0.002;
    let closestNode = null;
    let minDistance = Infinity;

    for (const node of this.nodes) {
      // Gentle bobbing and rotation
      if (node.bulb) {
        node.bulb.rotation.y += delta * 1.5;
        node.bulb.position.y = 1.25 + Math.sin(time * 2) * 0.08;
      }
      if (node.cap) {
        node.cap.rotation.y += delta * 0.8;
      }
      if (node.crystal) {
        node.crystal.rotation.y += delta * 2.0;
        node.crystal.rotation.x += delta * 1.0;
        node.crystal.position.y = 0.85 + Math.sin(time * 3) * 0.12;
      }

      // Proximity
      const dx = playerPos.x - node.group.position.x;
      const dz = playerPos.z - node.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= node.radius && dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    }

    if (closestNode) {
      this.nearbyNode = closestNode;
      this.showPrompt(closestNode.promptText);
    } else if (this.nearbyNode) {
      this.nearbyNode = null;
      this.hidePrompt();
    }
  }

  showPrompt(actionText) {
    if (!this.interactionPromptEl) {
      this.interactionPromptEl = document.getElementById('npc-interaction-prompt');
    }
    if (this.interactionPromptEl) {
      const textEl = document.getElementById('prompt-npc-action');
      if (textEl) textEl.textContent = actionText;
      this.interactionPromptEl.classList.remove('hidden');
    }
  }

  hidePrompt() {
    if (this.interactionPromptEl) {
      this.interactionPromptEl.classList.add('hidden');
    }
  }

  tryInteract() {
    if (this.nearbyNode && typeof this.nearbyNode.onInteract === 'function') {
      this.nearbyNode.onInteract();
      return true;
    }
    return false;
  }

  clear() {
    for (const node of this.nodes) {
      this._disposeNodeGroup(node.group);
      this.scene.remove(node.group);
    }
    this.nodes = [];
    this.nearbyNode = null;
    this.hidePrompt();
  }
}
