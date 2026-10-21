import * as THREE from 'three';

// TutorialManager.js - Guided Duo Tactical Tutorial (Sapidae Protagonist + Companion Axie)
export class TutorialManager {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.currentStep = 0;
    this.arrowGroup = null;
    this.arrowBaseY = 1.45;

    // Textos (20-oct): cortos, en segunda persona y sin coordenadas: la casilla la marca la flecha dorada.
    // `kicker` = para quién es el paso (Sapidae / Axie); `hint` = cómo hacerlo con teclado o ratón.
    this.steps = [
      {
        id: 'step_intro',
        title: 'Combate táctico en pareja',
        text: 'Luchas como <b>Sapidae</b> junto a tu <b>Axie compañero</b>. Cada uno tiene su turno.',
        concepts: [
          { k: 'pm', label: 'PM', text: 'Puntos de Movimiento: una casilla por PM.' },
          { k: 'pa', label: 'PA', text: 'Puntos de Acción: lo que cuestan tus cartas.' },
        ],
        btnText: 'Comenzar batalla',
        targetType: 'dialog'
      },
      {
        id: 'step_move_1',
        kicker: 'Turno de tu Sapidae',
        title: 'Muévete hacia la quimera',
        text: 'Haz clic en la <b>casilla dorada</b> que marca la flecha. Gastarás 2 PM.',
        allowedCell: { x: 4, z: 5 },
        targetType: 'cell'
      },
      {
        id: 'step_select_spell_1',
        kicker: 'Turno de tu Sapidae',
        title: 'Elige tu primera carta',
        text: 'Pulsa la carta <b>Habilidad de Clase [1]</b> en la barra de abajo, o la tecla <kbd>1</kbd>.',
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_attack_1',
        kicker: 'Turno de tu Sapidae',
        title: 'Ataca a la Quimera Slime',
        text: 'Haz clic sobre la quimera marcada para lanzar la carta.',
        allowedCell: { x: 4, z: 6 },
        targetType: 'cell'
      },
      {
        id: 'step_end_turn',
        kicker: 'Turno de tu Sapidae',
        title: 'Pasa el turno a tu Axie',
        text: 'Pulsa <b>Pasar turno</b> o la tecla <kbd>Espacio</kbd>.',
        targetType: 'end_turn'
      },
      {
        id: 'step_move_2',
        kicker: 'Turno de tu Axie',
        title: 'Acerca a tu Axie',
        text: 'Haz clic en la <b>casilla dorada</b> para ponerlo frente a la Quimera Guardián.',
        allowedCell: { x: 4, z: 6 },
        allowedCells: [{ x: 4, z: 6 }, { x: 3, z: 6 }, { x: 3, z: 7 }],
        targetType: 'cell'
      },
      {
        id: 'step_select_spell_2',
        kicker: 'Turno de tu Axie',
        title: 'Elige la carta de tu Axie',
        text: 'Pulsa su carta <b>[1]</b> en la barra de abajo, o la tecla <kbd>1</kbd>.',
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_attack_2',
        kicker: 'Turno de tu Axie',
        title: 'Ataca a la Quimera Guardián',
        text: 'Haz clic sobre ella para debilitar su defensa.',
        allowedCell: { x: 4, z: 7 },
        targetType: 'cell'
      },
      {
        id: 'step_battle_flow',
        title: '¡Buen trabajo en equipo!',
        text: 'Ya sabes lo básico. Termina con la Quimera Guardián alternando los turnos de tu Sapidae y tu Axie, como prefieras.',
        btnText: '¡A la carga!',
        targetType: 'free_action'
      }
    ];

    this._initOverlay();
  }

  _initOverlay() {
    this.overlay = document.getElementById('tutorial-overlay');
    if (this.overlay) {
      // Crónica Celeste: tarjeta de guía (presentación y cierre, con el Maestro Paladill) o franja de pista (pasos)
      this.overlay.className = 'tutorial-overlay lk-ui lk-ctut hidden';
      this.overlay.setAttribute('role', 'status');
      this.overlay.setAttribute('aria-live', 'polite');
      this.overlay.innerHTML = `
        <div class="lk-ctut__card">
          <span class="lk-ctut__coach" aria-hidden="true"><img src="./assets/portraits/paladill.png" alt="" onerror="this.src='./assets/paladill_portrait.png'"></span>
          <div class="lk-ctut__body">
            <div class="lk-ctut__head"><span class="lk-ctut__phases" data-ref="phases" aria-hidden="true"></span><span class="lk-ctut__badge" data-ref="badge"></span></div>
            <h3 id="tut-title" class="lk-ctut__title"></h3>
            <p id="tut-text" class="lk-ctut__text"></p>
            <div class="lk-ctut__concepts" data-ref="concepts"></div>
          </div>
          <button id="tut-btn-next" type="button" class="lk-btn lk-btn-primary-gold lk-ctut__go"><span data-ref="goTxt">Comenzar</span><small>Intro</small></button>
        </div>`;
      this.titleEl = this.overlay.querySelector('#tut-title');
      this.textEl = this.overlay.querySelector('#tut-text');
      this.btnNext = this.overlay.querySelector('#tut-btn-next');
      // Intro pulsa el botón de la tarjeta (Espacio queda para «Pasar turno»)
      window.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || !this.isActive || this.overlay.classList.contains('hidden')) return;
        if (this.btnNext && !this.btnNext.classList.contains('hidden') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          e.preventDefault(); this.btnNext.click();
        }
      });
      return this._bindNext();
    }
    this.titleEl = document.getElementById('tut-title');
    this.textEl = document.getElementById('tut-text');
    this.btnNext = document.getElementById('tut-btn-next');
    this._bindNext();
  }

  _bindNext() {
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
      const isCard = step.targetType === 'dialog' || step.targetType === 'free_action';
      this.overlay.classList.toggle('lk-ctut--card', isCard);
      this.overlay.classList.toggle('lk-ctut--hint', !isCard);
      this.overlay.classList.toggle('lk-ctut--done', step.targetType === 'free_action');
      // Progreso en fases lunares: un rombo por paso de acción (sin contar presentación y cierre)
      const actionSteps = this.steps.filter((s) => s.targetType !== 'dialog' && s.targetType !== 'free_action');
      const idx = actionSteps.indexOf(step);
      const phases = this.overlay.querySelector('[data-ref="phases"]');
      const badge = this.overlay.querySelector('[data-ref="badge"]');
      if (phases) phases.innerHTML = step.targetType === 'dialog' ? '' : actionSteps.map((s, i) => `<i class="${step.targetType === 'free_action' || i < idx ? 'lk-is-full' : i === idx ? 'lk-is-half' : ''}"></i>`).join('');
      if (badge) badge.textContent = step.targetType === 'dialog' ? 'Tutorial · Maestro Paladill' : step.targetType === 'free_action' ? 'Tutorial completado' : `Paso ${idx + 1} de ${actionSteps.length}${step.kicker ? ` · ${step.kicker}` : ''}`;
      const concepts = this.overlay.querySelector('[data-ref="concepts"]');
      if (concepts) concepts.innerHTML = (step.concepts || []).map((c) => `<span class="lk-ctut__concept lk-ctut__concept--${c.k}"><i aria-hidden="true"></i><b>${c.label}</b>${c.text}</span>`).join('');
      // Cada paso nuevo entra con una transición corta (sin rebotes)
      this.overlay.classList.remove('lk-ctut--in'); void this.overlay.offsetWidth; this.overlay.classList.add('lk-ctut--in');
      if (this.titleEl) this.titleEl.textContent = step.title;
      let text = step.text;
      const heroFirstSpellId = this.game?.activeUnit?.spellIds?.[0];
      const spell = heroFirstSpellId ? this.game?.spellManager?.getSpell(heroFirstSpellId) : null;
      if (spell && text.includes('Habilidad de Clase [1]')) {
        text = text.replace('Habilidad de Clase [1]', `[1] ${spell.name}`);
      }
      if (this.textEl) this.textEl.innerHTML = text;

      const goTxt = this.btnNext.querySelector('[data-ref="goTxt"]');
      const setGo = (t) => { if (goTxt) goTxt.textContent = t; else this.btnNext.textContent = t; };
      if (step.id === 'step_intro') {
        this.btnNext.classList.remove('hidden');
        setGo(step.btnText || 'Comenzar batalla');
        setTimeout(() => this.btnNext?.focus({ preventScroll: true }), 50);
      } else if (step.id === 'step_battle_flow' || step.targetType === 'free_action') {
        this.btnNext.classList.remove('hidden');
        setGo(step.btnText || '¡A la carga!');
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
