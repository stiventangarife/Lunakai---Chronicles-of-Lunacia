import * as THREE from 'three';

// TutorialManager.js - Guided Duo Tactical Tutorial (Sapidae Protagonist + Companion Axie)
export class TutorialManager {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.currentStep = 0;
    this.arrowGroup = null;
    this.arrowBaseY = 1.45;

    this.steps = [
      {
        id: 'step_intro',
        title: '¡Combate Táctico en Pareja!',
        text: '¡En Lunacia luchas como un <b>Sapidae</b> junto a tu <b>Axie Compañero</b>!<br>Tienes <b>Puntos de Movimiento (PM)</b> para posicionarte en la cuadrícula y <b>Puntos de Acción (PA)</b> para desatar tus habilidades.<br>¡Coordinen sus turnos para purificar el Dojo!',
        btnText: '¡Comenzar Batalla!',
        targetType: 'dialog'
      },
      {
        id: 'step_move_1',
        title: 'Paso 1: Mueve a tu Sapidae',
        text: '¡Tu <b>Sapidae</b> lidera la ofensiva! Haz clic en la casilla dorada señalada por la flecha en <b>(4, 5)</b> para avanzar gastando 2 PM y encarar a la Quimera.',
        allowedCell: { x: 4, z: 5 },
        targetType: 'cell'
      },
      {
        id: 'step_select_spell_1',
        title: 'Paso 2: Prepara el Ataque del Sapidae',
        text: '¡Excelente posición! Ahora selecciona la <b>Habilidad de Clase [1]</b> de tu Sapidae en la barra inferior (costo en PA).',
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_attack_1',
        title: 'Paso 3: ¡Ataca y Purifica a la Primera Quimera!',
        text: '¡Rango de ataque listo! Haz clic directamente sobre la <b>Quimera Slime</b> en <b>(4, 6)</b> para que tu Sapidae aseste un golpe contundente y la derrote.',
        allowedCell: { x: 4, z: 6 },
        targetType: 'cell'
      },
      {
        id: 'step_end_turn',
        title: 'Paso 4: Finaliza el Turno de tu Sapidae',
        text: '¡Primera quimera derrotada con éxito! Ahora cede la iniciativa a tu compañero presionando <b>[Espacio]</b> o el botón <b>FIN DEL TURNO</b>.',
        targetType: 'end_turn'
      },
      {
        id: 'step_move_2',
        title: 'Paso 5: Posiciona a tu Axie Compañero',
        text: '¡Es el turno de tu <b>Axie Compañero</b>! Haz clic en la casilla dorada en <b>(4, 6)</b> para avanzar y encarar a la <b>Quimera Guardián</b>.',
        allowedCell: { x: 4, z: 6 },
        allowedCells: [{ x: 4, z: 6 }, { x: 3, z: 6 }, { x: 3, z: 7 }],
        targetType: 'cell'
      },
      {
        id: 'step_select_spell_2',
        title: 'Paso 6: Selecciona el Ataque de tu Axie',
        text: '¡En posición de ataque! Ahora selecciona la habilidad <b>[1]</b> de tu Axie en la barra inferior.',
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_attack_2',
        title: 'Paso 7: ¡Ataca a la Quimera Guardián con tu Axie!',
        text: '¡Usa el ataque de tu Axie sobre la <b>Quimera Guardián</b> en <b>(4, 7)</b> para debilitar su defensa!',
        allowedCell: { x: 4, z: 7 },
        targetType: 'cell'
      },
      {
        id: 'step_battle_flow',
        title: '¡Victoria al Alcance!',
        text: '¡Excelente trabajo en equipo! Ambos luchan en sincronía. Ahora derrota por completo a la Quimera Guardián combinando libremente los turnos de tu Sapidae y tu Axie.',
        btnText: '¡A la Carga! ⚔️',
        targetType: 'free_action'
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
        const step = this.steps[this.currentStep];
        if (step && step.id === 'step_intro') {
          if (this.game) {
            this.game.activeUnit = (this.game.turnManager && this.game.turnManager.getActiveUnit()) || this.game.units?.[0];
            if (this.game.activeUnit) {
              if (this.game.activeUnit.currentPM === 0) {
                this.game.activeUnit.startTurn();
              }
              this.game._updateHUD(this.game.activeUnit);
            }
          }
          this.advanceStep();
          if (this.game && this.game.turnManager && this.game.turnManager.currentIndex === -1) {
            this.game.turnManager.startCombat();
          }
        } else if (step && (step.id === 'step_battle_flow' || step.targetType === 'free_action')) {
          if (this.overlay) {
            this.overlay.classList.add('hidden');
          }
        } else {
          this.advanceStep();
        }
      });
    }
  }

  _createTargetArrow() {
    this.arrowGroup = new THREE.Group();
    this.arrowGroup.name = 'tutorial_target_arrow';
    this.arrowGroup.visible = false;

    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xff9900,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.5
    });

    // 1. Cone pointing down
    const coneGeo = new THREE.ConeGeometry(0.32, 0.6, 16);
    const cone = new THREE.Mesh(coneGeo, arrowMat);
    cone.rotation.x = Math.PI;
    cone.position.y = 0.3;
    cone.castShadow = true;
    this.arrowGroup.add(cone);

    // 2. Shaft / stem cylinder
    const stemGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.45, 16);
    const stem = new THREE.Mesh(stemGeo, arrowMat);
    stem.position.y = 0.75;
    stem.castShadow = true;
    this.arrowGroup.add(stem);

    // 3. Ground ring marker
    const ringGeo = new THREE.RingGeometry(0.36, 0.52, 32);
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

    const bounce = Math.sin(time * 5.0) * 0.22;
    this.arrowGroup.position.y = this.arrowBaseY + bounce;
    this.arrowGroup.rotation.y = time * 1.5;

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
      this.game.activeUnit = (this.game.turnManager && this.game.turnManager.getActiveUnit()) || this.game.units?.[0];
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
      this.currentStep = this.steps.length - 1;
    }
    this._renderStep();
  }

  setStepById(id) {
    if (!this.isActive) return;
    const idx = this.steps.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.currentStep = idx;
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

    if (this.game) {
      if (!this.game.activeUnit) {
        this.game.activeUnit = (this.game.turnManager && this.game.turnManager.getActiveUnit()) || this.game.units?.[0];
      }
      if (this.game.activeUnit) {
        this.game._updateHUD(this.game.activeUnit);
      }
    }

    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      if (this.titleEl) this.titleEl.textContent = step.title;
      let text = step.text;
      const heroFirstSpellId = this.game?.activeUnit?.spellIds?.[0];
      const spell = heroFirstSpellId ? this.game?.spellManager?.getSpell(heroFirstSpellId) : null;
      if (spell && text.includes('Habilidad de Clase [1]')) {
        text = text.replace('Habilidad de Clase [1]', `<b>[1] ${spell.name}</b>`);
      }
      if (this.textEl) this.textEl.innerHTML = text;

      if (step.id === 'step_intro') {
        this.btnNext.classList.remove('hidden');
        this.btnNext.textContent = step.btnText || '¡Comenzar Batalla!';
      } else if (step.id === 'step_battle_flow' || step.targetType === 'free_action') {
        this.btnNext.classList.remove('hidden');
        this.btnNext.textContent = step.btnText || '¡A la Carga! ⚔️';
      } else {
        this.btnNext.classList.add('hidden');
      }
    }

    // Refresh movement and attack highlights
    if (this.game) {
      this.game._refreshMovementHighlights();
      if ((step.id === 'step_attack_1' || step.id === 'step_attack_2') && step.allowedCell) {
        this.game.gridManager.highlightSpellRange([step.allowedCell]);
        this.showArrowAt(step.allowedCell.x, step.allowedCell.z);
      } else if ((step.id === 'step_move_1' || step.id === 'step_move_2') && step.allowedCell) {
        this.showArrowAt(step.allowedCell.x, step.allowedCell.z);
      } else {
        this.hideArrow();
      }
    }

    // Highlight bottom bar UI elements
    const slot0 = document.getElementById('spell-slot-0');
    const btnEnd = document.getElementById('btn-end-turn');

    [slot0, btnEnd].forEach(el => el && el.classList.remove('tut-highlight'));

    if ((step.id === 'step_select_spell_1' || step.id === 'step_select_spell_2') && slot0) {
      slot0.classList.add('tut-highlight');
    } else if (step.id === 'step_end_turn' && btnEnd) {
      btnEnd.classList.add('tut-highlight');
    }
  }

  isCellAllowed(x, z) {
    if (!this.isActive) return true;
    const step = this.steps[this.currentStep];
    if (!step) return true;
    if (step.targetType === 'free_action' || step.id === 'step_battle_flow') return true;

    if (step.allowedCells && Array.isArray(step.allowedCells)) {
      return step.allowedCells.some(c => c.x === x && c.z === z);
    }
    if (step.allowedCell) {
      return x === step.allowedCell.x && z === step.allowedCell.z;
    }
    return false;
  }

  isSpellAllowed(spellIndex) {
    if (!this.isActive) return true;
    const step = this.steps[this.currentStep];
    if (!step) return true;
    if (step.targetType === 'free_action' || step.id === 'step_battle_flow') return true;

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
    if (step.targetType === 'free_action' || step.id === 'step_battle_flow') return true;
    return step.id === 'step_end_turn';
  }

  completeTutorial() {
    this.isActive = false;
    this.hideArrow();
    const slot0 = document.getElementById('spell-slot-0');
    const btnEnd = document.getElementById('btn-end-turn');
    [slot0, btnEnd].forEach(el => el && el.classList.remove('tut-highlight'));
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }
}
