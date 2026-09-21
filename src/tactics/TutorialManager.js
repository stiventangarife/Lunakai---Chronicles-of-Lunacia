import * as THREE from 'three';

// TutorialManager.js - Guided Tutorial State Machine with Strict Action Restrictions
export class TutorialManager {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.currentStep = 0;
    this.arrowGroup = null;
    this.arrowBaseY = 1.4;

    this.steps = [
      {
        id: 'step_intro',
        title: 'Welcome to the Lunacia Dojo!',
        text: 'Learn the tactical fundamentals of Axie Infinity. You have <b>Movement Points (MP)</b> and <b>Action Points (AP)</b>.',
        btnText: 'Start Training',
        targetType: 'dialog'
      },
      {
        id: 'step_move_1',
        title: 'Step 1: Tactical Movement',
        text: 'You have <b>3 MP</b>. Advance 2 tiles by clicking on the highlighted tile <b>(4, 5)</b> to approach the first Chimera.',
        allowedCell: { x: 4, z: 5 },
        targetType: 'cell'
      },
      {
        id: 'step_select_spell_1',
        title: 'Step 2: Ability Selection',
        text: 'You have <b>6 AP</b>. Click on your first ability <b>[1] Sword of Lunacia</b> (Cost: 3 AP) in the bottom hotbar.',
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_attack_1',
        title: 'Step 3: Eliminate the First Enemy',
        text: 'Strike! Click on the <b>Scout Chimera</b> at tile <b>(4, 6)</b>. It will fall in a single hit.',
        allowedCell: { x: 4, z: 6 },
        targetType: 'cell'
      },
      {
        id: 'step_move_2',
        title: 'Step 4: Use Remaining Movement',
        text: 'Your turn is still active! You have <b>1 MP</b> left (your remaining tile) and <b>3 AP</b>. Move by clicking on <b>(4, 6)</b> to reach the second Chimera.',
        allowedCell: { x: 4, z: 6 },
        targetType: 'cell'
      },
      {
        id: 'step_select_spell_2',
        title: 'Step 5: Prepare Second Attack',
        text: 'You still have <b>3 AP</b>, enough for another attack. Select <b>[1] Sword of Lunacia</b> again.',
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_attack_2',
        title: 'Step 6: Strike the Guardian Chimera',
        text: 'Attack the <b>Guardian Chimera</b> at <b>(4, 7)</b>. This enemy is tough and will survive this initial strike.',
        allowedCell: { x: 4, z: 7 },
        targetType: 'cell'
      },
      {
        id: 'step_end_turn',
        title: 'Step 7: End Your Turn',
        text: 'You have spent all your AP and MP. Click the golden <b>END TURN [Space]</b> button to pass the turn.',
        targetType: 'end_turn'
      },
      {
        id: 'step_enemy_turn',
        title: "Guardian Chimera's Turn",
        text: 'Watch as the Guardian Chimera takes its turn and counters Kotaro with its Fierce Bite...',
        targetType: 'waiting'
      },
      {
        id: 'step_finish_select',
        title: 'Step 8: Final Blow!',
        text: 'Your turn again! You recovered all 6 AP and 3 MP. Select <b>[1] Sword of Lunacia</b> from your hotbar.',
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_finish_attack',
        title: 'Step 9: Victory in Lunacia!',
        text: 'Deliver the finishing blow! Click on the <b>Guardian Chimera</b> at <b>(4, 7)</b> to finish the battle.',
        allowedCell: { x: 4, z: 7 },
        targetType: 'cell'
      }
    ];

    this._initOverlay();
  }

  _initOverlay() {
    this.overlay = document.getElementById('tutorial-overlay');
    this.titleEl = document.getElementById('tut-title');
    this.textEl = document.getElementById('tut-text');
    this.btnNext = document.getElementById('tut-btn-next');

    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        if (this.steps[this.currentStep] && this.steps[this.currentStep].id === 'step_intro') {
          this.advanceStep();
          // Officially start the battle and Kotaro's turn now!
          if (this.game && this.game.turnManager) {
            this.game.turnManager.startCombat();
          }
        }
      });
    }
  }

  _createTargetArrow() {
    this.arrowGroup = new THREE.Group();
    this.arrowGroup.name = 'tutorial_target_arrow';
    this.arrowGroup.visible = false;

    // Glowing golden material
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xff9900,
      emissiveIntensity: 0.7,
      roughness: 0.25,
      metalness: 0.5
    });

    // 1. Cone pointing down
    const coneGeo = new THREE.ConeGeometry(0.32, 0.6, 16);
    const cone = new THREE.Mesh(coneGeo, arrowMat);
    cone.rotation.x = Math.PI; // point downwards
    cone.position.y = 0.3;
    cone.castShadow = true;
    this.arrowGroup.add(cone);

    // 2. Shaft / stem cylinder above the cone
    const stemGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.45, 16);
    const stem = new THREE.Mesh(stemGeo, arrowMat);
    stem.position.y = 0.75;
    stem.castShadow = true;
    this.arrowGroup.add(stem);

    // 3. Ground ring marker
    const ringGeo = new THREE.RingGeometry(0.36, 0.48, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.groundRing = new THREE.Mesh(ringGeo, ringMat);
    this.groundRing.rotation.x = -Math.PI / 2;
    this.groundRing.position.y = 0.035;
    this.arrowGroup.add(this.groundRing);

    // 4. Warm PointLight
    this.arrowLight = new THREE.PointLight(0xffd700, 1.8, 3.5);
    this.arrowLight.position.y = 0.75;
    this.arrowGroup.add(this.arrowLight);

    if (this.game && this.game.sceneManager && this.game.sceneManager.scene) {
      this.game.sceneManager.scene.add(this.arrowGroup);
    }
  }

  showArrowAt(cellX, cellZ) {
    if (!this.arrowGroup) {
      this._createTargetArrow();
    }
    if (this.game && this.game.sceneManager && this.game.sceneManager.scene) {
      if (this.arrowGroup.parent !== this.game.sceneManager.scene) {
        this.game.sceneManager.scene.add(this.arrowGroup);
      }
    }
    const worldPos = this.game.gridManager.gridToWorld(cellX, cellZ);
    this.arrowBaseY = 1.45;
    this.arrowGroup.position.set(worldPos.x, this.arrowBaseY, worldPos.z);
    this.arrowGroup.visible = true;
  }

  hideArrow() {
    if (this.arrowGroup) {
      this.arrowGroup.visible = false;
    }
  }

  update(time) {
    if (!this.isActive || !this.arrowGroup || !this.arrowGroup.visible) return;

    // Smooth sinusoidal bobbing up and down
    const bounce = Math.sin(time * 5.0) * 0.22;
    this.arrowGroup.position.y = this.arrowBaseY + bounce;

    // Gentle rotation
    this.arrowGroup.rotation.y = time * 1.5;

    // Pulse ground ring scale
    if (this.groundRing) {
      const pulse = 1.0 + Math.sin(time * 6.0) * 0.12;
      this.groundRing.scale.set(pulse, pulse, 1.0);
    }
  }

  startTutorial() {
    this.isActive = true;
    this.currentStep = 0;
    this.hideArrow();
    if (this.game) {
      this.game.activeUnit = null;
      this.game.reachableCells = [];
      if (this.game.gridManager) {
        this.game.gridManager.clearHighlights();
      }
    }
    this._renderStep();
  }

  advanceStep() {
    if (!this.isActive) return;
    this.currentStep++;
    if (this.currentStep >= this.steps.length) {
      this.completeTutorial();
    } else {
      this._renderStep();
    }
  }

  getCurrentStepId() {
    if (!this.isActive) return null;
    const step = this.steps[this.currentStep];
    return step ? step.id : null;
  }

  _renderStep() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      if (this.titleEl) this.titleEl.textContent = step.title;
      let text = step.text;
      const heroFirstSpellId = this.game?.activeUnit?.spellIds?.[0];
      const spell = heroFirstSpellId ? this.game?.spellManager?.getSpell(heroFirstSpellId) : null;
      if (spell && (text.includes('Sword of Lunacia') || text.includes('Espada de Lunacia'))) {
        text = text.replace(/Sword of Lunacia|Espada de Lunacia/g, spell.name);
      }
      if (this.textEl) this.textEl.innerHTML = text;

      if (step.id === 'step_intro') {
        this.btnNext.classList.remove('hidden');
        this.btnNext.textContent = step.btnText;
      } else {
        this.btnNext.classList.add('hidden');
      }
    }

    // Refresh grid highlights based on allowed action
    if (this.game) {
      this.game._refreshMovementHighlights();
      if ((step.id === 'step_attack_1' || step.id === 'step_attack_2' || step.id === 'step_finish_attack') && step.allowedCell) {
        this.game.gridManager.highlightSpellRange([step.allowedCell]);
      }
    }

    // Show 3D bouncing arrow above designated movement target
    if (step && (step.id === 'step_move_1' || step.id === 'step_move_2') && step.allowedCell) {
      this.showArrowAt(step.allowedCell.x, step.allowedCell.z);
    } else {
      this.hideArrow();
    }

    // Highlight bottom bar UI elements
    const slot0 = document.getElementById('spell-slot-0');
    const slot1 = document.getElementById('spell-slot-1');
    const btnEnd = document.getElementById('btn-end-turn');

    [slot0, slot1, btnEnd].forEach(el => el && el.classList.remove('tut-highlight'));

    if ((step.id === 'step_select_spell_1' || step.id === 'step_select_spell_2' || step.id === 'step_finish_select') && slot0) {
      slot0.classList.add('tut-highlight');
    } else if (step.id === 'step_end_turn' && btnEnd) {
      btnEnd.classList.add('tut-highlight');
    }
  }

  isCellAllowed(x, z) {
    if (!this.isActive) return true;
    const step = this.steps[this.currentStep];
    if (!step) return true;

    if (step.allowedCell) {
      return x === step.allowedCell.x && z === step.allowedCell.z;
    }
    return false;
  }

  isSpellAllowed(spellIndex) {
    if (!this.isActive) return true;
    const step = this.steps[this.currentStep];
    if (!step) return true;

    if (step.allowedSpellIndex !== undefined) {
      return spellIndex === step.allowedSpellIndex;
    }
    return false;
  }

  isSpellSelectionStep() {
    if (!this.isActive) return false;
    const step = this.steps[this.currentStep];
    return step && step.targetType === 'spell_slot';
  }

  isEndTurnAllowed() {
    if (!this.isActive) return true;
    const step = this.steps[this.currentStep];
    if (!step) return true;
    return step.id === 'step_end_turn';
  }

  completeTutorial() {
    this.isActive = false;
    this.hideArrow();
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }
}
