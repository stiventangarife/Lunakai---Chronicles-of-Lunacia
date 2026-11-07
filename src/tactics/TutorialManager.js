import * as THREE from 'three';
import * as i18n from '../i18n/i18n.js';

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
        title: i18n.t('tutorialCombat.step.intro.title'),
        text: i18n.t('tutorialCombat.step.intro.text'),
        concepts: [
          { k: 'pm', label: i18n.t('tutorialCombat.concept.mp'), text: i18n.t('tutorialCombat.concept.mpText') },
          { k: 'pa', label: i18n.t('tutorialCombat.concept.ap'), text: i18n.t('tutorialCombat.concept.apText') },
        ],
        btnText: i18n.t('tutorialCombat.startBattle'),
        targetType: 'dialog'
      },
      {
        id: 'step_move_1',
        kicker: i18n.t('tutorialCombat.kickerSapidae'),
        title: i18n.t('tutorialCombat.step.move1.title'),
        text: i18n.t('tutorialCombat.step.move1.text'),
        allowedCell: { x: 4, z: 5 },
        targetType: 'cell'
      },
      {
        id: 'step_select_spell_1',
        kicker: i18n.t('tutorialCombat.kickerSapidae'),
        title: i18n.t('tutorialCombat.step.selectSpell1.title'),
        text: i18n.t('tutorialCombat.step.selectSpell1.text', { skill: i18n.t('tutorialCombat.classSkillSlot') }),
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_attack_1',
        kicker: i18n.t('tutorialCombat.kickerSapidae'),
        title: i18n.t('tutorialCombat.step.attack1.title'),
        text: i18n.t('tutorialCombat.step.attack1.text'),
        allowedCell: { x: 4, z: 6 },
        targetType: 'cell'
      },
      {
        id: 'step_end_turn',
        kicker: i18n.t('tutorialCombat.kickerSapidae'),
        title: i18n.t('tutorialCombat.step.endTurn.title'),
        text: i18n.t('tutorialCombat.step.endTurn.text'),
        targetType: 'end_turn'
      },
      {
        // Turno del Slime: Paladill avisa y la barra de turnos se ilumina (el paso avanza solo al volver tu turno)
        id: 'step_enemy_1',
        kicker: i18n.t('tutorialCombat.kickerPaladill'),
        title: i18n.t('tutorialCombat.step.enemy1.title'),
        text: i18n.t('tutorialCombat.step.enemy1.text'),
        highlightTimeline: true,
        targetType: 'enemy_turn'
      },
      {
        // La casilla se calcula con la posición real del Slime tras su turno (_resolveCells)
        id: 'step_move_2',
        kicker: i18n.t('tutorialCombat.kickerAxie'),
        title: i18n.t('tutorialCombat.step.move2.title'),
        text: i18n.t('tutorialCombat.step.move2.text'),
        allowedCell: { x: 3, z: 6 },
        targetType: 'cell'
      },
      {
        id: 'step_select_spell_2',
        kicker: i18n.t('tutorialCombat.kickerAxie'),
        title: i18n.t('tutorialCombat.step.selectSpell2.title'),
        text: i18n.t('tutorialCombat.step.selectSpell2.text'),
        allowedSpellIndex: 0,
        targetType: 'spell_slot'
      },
      {
        id: 'step_attack_2',
        kicker: i18n.t('tutorialCombat.kickerAxie'),
        title: i18n.t('tutorialCombat.step.attack2.title'),
        text: i18n.t('tutorialCombat.step.attack2.text'),
        allowedCell: { x: 4, z: 6 },
        targetType: 'cell'
      },
      {
        id: 'step_end_turn',
        kicker: i18n.t('tutorialCombat.kickerAxie'),
        title: i18n.t('tutorialCombat.step.endTurn2.title'),
        text: i18n.t('tutorialCombat.step.endTurn2.text'),
        targetType: 'end_turn'
      },
      {
        id: 'step_enemy_2',
        kicker: i18n.t('tutorialCombat.kickerRival'),
        title: i18n.t('tutorialCombat.step.enemy2.title'),
        text: i18n.t('tutorialCombat.step.enemy2.text'),
        targetType: 'enemy_turn'
      },
      {
        id: 'step_battle_flow',
        title: i18n.t('tutorialCombat.step.battleFlow.title'),
        text: i18n.t('tutorialCombat.step.battleFlow.text'),
        btnText: i18n.t('tutorialCombat.charge'),
        targetType: 'free_action'
      }
    ];

    this.dojoSteps = this.steps;
    this.dynamic = null; // duelo y prueba de la Ultimate: pasos que se calculan según el turno (startDynamic)
    this._initOverlay();
  }

  // ================================================================ guía dinámica (duelo · Ultimate)
  /**
   * Duelo con Paladill y prueba de la Ultimate (22-oct): pasos calculados en cada momento según quién
   * juega, en lugar de una lista fija. Usan los mismos ganchos que el combate guiado (casillas, cartas,
   * Pasar turno), así que lo que no toca queda bloqueado igual.
   *  · duel: el primer turno de cada aliado va guiado (acercarse si hace falta → carta → Paladill →
   *    Pasar turno); después, libre.
   *  · ult: tu Sapidae lanza la Ultimate (botón → objetivo); tu Axie pasa turno; tras la Ultimate, libre.
   */
  startDynamic(kind) {
    this._freeDismissed = false;
    this.dynamic = { kind, guided: new Set(), cur: null, lastUnit: null, freeShown: false };
    this.isActive = true;
    this.currentStep = 0;
    this._setDynStep();
    this._renderStep();
  }

  _setDynStep() {
    const D = this.dynamic;
    const step = this._dynStep();
    this.steps = [step];
    // Libre: la tarjeta se ve unos segundos y la guía termina (todo vuelve a estar permitido)
    if (step.targetType === 'free_action' && !D.freeAt) {
      D.freeAt = performance.now();
      setTimeout(() => { if (this.dynamic === D) this.completeTutorial(); }, 4000);
    }
  }

  _dynEnemy() {
    const g = this.game;
    return (g?.units || []).find((u) => u.team === 'enemy' && !u.isDead) || null;
  }

  _dynStep() {
    const D = this.dynamic, g = this.game;
    const tm = g?.turnManager;
    const a = (tm && tm.getActiveUnit && tm.getActiveUnit()) || g?.activeUnit;
    const free = { id: 'step_battle_flow', targetType: 'free_action', title: i18n.t('tutorialCombat.free.title'), text: D.kind === 'ult' ? i18n.t('tutorialCombat.free.ultText') : i18n.t('tutorialCombat.free.duelText'), btnText: i18n.t('tutorialCombat.charge') };
    if (!a) return { id: 'step_wait', targetType: 'waiting', title: i18n.t('tutorialCombat.wait.title'), text: '' };
    if (a.team !== 'player') return { id: 'step_wait', targetType: 'waiting', kicker: i18n.t('tutorialCombat.kickerRival'), title: i18n.t('tutorialCombat.rivalTurn.title', { name: a.name }), text: i18n.t('tutorialCombat.rivalTurn.text') };
    if (!D.cur || D.cur.unit !== a) D.cur = { unit: a, moved: false, cast: false };
    const C = D.cur;
    const endStep = (title, text) => ({ id: 'step_end_turn', targetType: 'end_turn', kicker: a.name, title, text });
    const slotsWhere = (fn) => (a.spellIds || []).map((sid, i) => {
      const sp = sid && g.spellManager?.getSpell(sid, a);
      return sp && g.spellManager._canPay(a, sp) && fn(sp) ? i : -1;
    }).filter((i) => i >= 0);

    if (D.kind === 'ult') {
      const ult = g.spellManager?.ultimates;
      if (!ult || ult.used) return free;
      const isSap = a === ult.sapidae || a.id === 'sapidae';
      if (!isSap) return endStep(i18n.t('tutorialCombat.passTurn'), i18n.t('tutorialCombat.ultPassText'));
      if (g.selectedSpell && g.selectedSpell.isUltimate) {
        const cells = g.validSpellCells || [];
        const foes = cells.filter((c) => g.gridManager.getTile(c.x, c.z)?.unit?.team === 'enemy');
        if (foes.length) return { id: 'step_attack_1', targetType: 'cell', kicker: i18n.t('tutorialCombat.kickerDuo'), title: i18n.t('tutorialCombat.pickTarget.title'), text: i18n.t('tutorialCombat.pickTarget.text'), allowedCell: foes[0], allowedCells: foes };
        // Ultimates sin objetivo enemigo (p. ej. Égida de Gaia, sobre tu propia casilla): cualquier casilla válida
        if (cells.length) return { id: 'step_attack_1', targetType: 'cell', kicker: i18n.t('tutorialCombat.kickerDuo'), title: i18n.t('tutorialCombat.castUlt.title'), text: i18n.t('tutorialCombat.castUlt.cellText'), allowedCell: cells[0], allowedCells: cells };
        return free; // ningún objetivo al alcance: no se bloquea el combate
      }
      if (ult.canCast && ult.canCast(a)) return { id: 'step_ult', targetType: 'ult', allowUlt: true, kicker: i18n.t('tutorialCombat.kickerDuo'), title: i18n.t('tutorialCombat.castUlt.title'), text: i18n.t('tutorialCombat.castUlt.btnText') };
      return free; // no se puede lanzar (caso raro): no se bloquea el combate
    }

    // duel: libre cuando todos tus aliados han hecho su primer turno guiado (o desde la ronda 2)
    const allies = (g.units || []).filter((u) => u.team === 'player' && !u.isDead);
    if ((tm?.round || 1) > 1 || allies.every((u) => D.guided.has(u))) return free;
    if (D.guided.has(a)) return { id: 'step_wait', targetType: 'waiting', kicker: a.name, title: i18n.t('tutorialCombat.turnDone'), text: '' };
    const foe = this._dynEnemy();
    if (!foe) return free;
    const fc = { x: foe.gridX, z: foe.gridZ };
    if (C.cast) return endStep(i18n.t('tutorialCombat.passTurn'), i18n.t('tutorialCombat.passDoneText'));
    if (g.selectedSpell && !g.selectedSpell.isUltimate) {
      if ((g.validSpellCells || []).some((c) => c.x === fc.x && c.z === fc.z)) return { id: 'step_attack_1', targetType: 'cell', kicker: a.name, title: i18n.t('tutorialCombat.attackFoe.title', { name: foe.name }), text: i18n.t('tutorialCombat.attackFoe.text'), allowedCell: fc };
    }
    const hits = (sp) => (g.spellManager.getValidTargetCells(a, sp) || []).some((c) => c.x === fc.x && c.z === fc.z);
    const usable = slotsWhere(hits);
    if (usable.length) return { id: 'step_select_spell_1', targetType: 'spell_slot', kicker: a.name, title: i18n.t('tutorialCombat.pickCard.title'), text: i18n.t('tutorialCombat.pickCard.text'), allowedSpellIndexes: usable, allowedSpellIndex: usable[0] };
    if (!C.moved && a.currentPM > 0) {
      const cells = (g.gridManager.getReachableCells(a.gridX, a.gridZ, a.currentPM, a) || []).filter((c) => !g.gridManager.getTile(c.x, c.z)?.unit);
      // El Axie se mueve con total libertad: sus cartas pueden pedir distancia (AL 2) y la casilla más cercana a
      // Paladill no siempre sirve. Todas las casillas alcanzables quedan marcadas y permitidas, y puede seguir
      // moviéndose mientras le queden PM (el Sapidae mantiene la casilla guiada).
      const isSap = a.id === 'sapidae' || a === g.spellManager?.ultimates?.sapidae;
      if (!isSap && cells.length) {
        return { id: 'step_move_1', freeMove: true, targetType: 'cell', kicker: a.name, title: i18n.t('tutorialCombat.moveFree.title'), text: i18n.t('tutorialCombat.moveFree.text', { name: foe.name }), allowedCells: cells.map((c) => ({ x: c.x, z: c.z })) };
      }
      let best = null, bd = Infinity;
      for (const c of cells) { const d = Math.abs(c.x - fc.x) + Math.abs(c.z - fc.z); if (d < bd) { bd = d; best = c; } }
      if (best) return { id: 'step_move_1', targetType: 'cell', kicker: a.name, title: i18n.t('tutorialCombat.approach.title', { name: foe.name }), text: i18n.t('tutorialCombat.approach.text'), allowedCell: { x: best.x, z: best.z } };
    }
    // Pegado a Paladill pero sin carta que alcance (AL mínimo 2): «lejos» no sería cierto
    const adjacent = Math.abs(a.gridX - fc.x) + Math.abs(a.gridZ - fc.z) <= 1;
    return endStep(i18n.t('tutorialCombat.passTurn'), i18n.t(adjacent ? 'tutorialCombat.noReachText' : 'tutorialCombat.farText', { name: foe.name }));
  }

  /** Avanza la guía dinámica según lo que acaba de hacer el jugador y recalcula el paso. */
  _dynAdvance() {
    const D = this.dynamic;
    const step = this.steps[this.currentStep];
    if (D.cur && step) {
      // Movimiento libre del Axie: mientras le queden PM puede seguir moviéndose; solo se da por movido al agotarlos
      if (step.id === 'step_move_1') D.cur.moved = !(step.freeMove && D.cur.unit.currentPM > 0);
      else if (step.id === 'step_attack_1') D.cur.cast = true;
      else if (step.id === 'step_end_turn') D.guided.add(D.cur.unit);
    }
    this.currentStep = 0;
    this._setDynStep();
    this._renderStep();
  }

  /** ¿Se puede usar la Ultimate ahora? (combate guiado: solo si el paso lo pide) */
  isUltAllowed() {
    if (!this.isActive) return true;
    const step = this.steps[this.currentStep];
    if (!step) return true;
    if (step.targetType === 'free_action' || step.id === 'step_battle_flow') return true;
    return Boolean(step.allowUlt);
  }

  /** Recuerda dónde pulsar cuando se intenta otra cosa: la franja se sacude y dice, con amabilidad, qué toca. */
  nudge() {
    if (!this.isActive || !this.overlay) return;
    this.overlay.classList.remove('lk-ctut--nudge'); void this.overlay.offsetWidth; this.overlay.classList.add('lk-ctut--nudge');
    const step = this.steps[this.currentStep];
    const el = this.overlay.querySelector('[data-ref="nudge"]');
    if (!step || !el) return;
    const key = step.targetType === 'spell_slot' ? 'card'
      : step.targetType === 'end_turn' ? 'endTurn'
      : step.targetType === 'ult' ? 'ult'
      : step.targetType === 'enemy_turn' || step.targetType === 'waiting' ? 'wait'
      : step.targetType === 'cell' ? (/attack/.test(step.id) ? 'target' : 'move') : null;
    if (!key) return;
    el.textContent = i18n.t(`tutorialCombat.nudge.${key}`);
    el.classList.add('lk-is-on');
    clearTimeout(this._nudgeTimer);
    this._nudgeTimer = setTimeout(() => el.classList.remove('lk-is-on'), 2600);
  }

  /**
   * Cambio de turno en el combate guiado (main.js, antes de pintar): un paso de «turno enemigo» se muestra mientras
   * juega la quimera y, al volver el turno al jugador, la guía pasa al siguiente paso.
   */
  onTurnStart(unit) {
    if (!this.isActive || this.dynamic || !unit) return;
    const step = this.steps[this.currentStep];
    if (!step || step.targetType !== 'enemy_turn') return;
    if (unit.team === 'player') this.advanceStep();
    else this._renderStep();
  }

  /** Casillas del guion que dependen de dónde está el Slime ahora (empujones, su propio turno). */
  _resolveCells(step) {
    const g = this.game;
    if (!g || !step || this.dynamic) return true;
    if (step.id !== 'step_attack_1' && step.id !== 'step_move_2' && step.id !== 'step_attack_2') return true;
    const scout = (g.units || []).find((u) => u.id === 'quimera_scout' && !u.isDead);
    if (!scout) return false;
    const sc = { x: scout.gridX, z: scout.gridZ };
    if (step.id !== 'step_move_2') { step.allowedCell = sc; return true; }
    const a = g.activeUnit;
    if (!a || a.team !== 'player') return true;
    const gm = g.gridManager;
    const sm = g.spellManager;
    // Hito 139: la casilla depende de la carta de la ranura [1] (la que pide el paso siguiente). Con un ataque
    // cuerpo a cuerpo, al lado del Slime como siempre; con uno a distancia, una casilla desde la que le llegue
    // (mismas reglas que SpellRules.getValidTargetCells: AL mínimo y máximo, línea recta y línea de visión).
    const sp = a.spellIds?.[0] ? sm?.getSpell(a.spellIds[0], a) : null;
    const minR = sp ? (sp.minRange ?? 1) : 1;
    const maxR = sp ? ((a.statuses?.length || sm?.battleMods?.range) ? sm.getEffectiveMaxRange(a, sp) : (sp.maxRange ?? 1)) : 1;
    const dist = (c) => Math.abs(c.x - sc.x) + Math.abs(c.z - sc.z);
    const hitsFrom = (c) => {
      const d = dist(c);
      if (d < minR || d > maxR) return false;
      if (sp?.isLinear && c.x !== sc.x && c.z !== sc.z) return false;
      return !sp?.requiresLoS || gm.hasLineOfSight(c, sc);
    };
    const free = (c) => !gm.getTile(c.x, c.z)?.unit;
    const reach = (gm.getReachableCells(a.gridX, a.gridZ, a.currentPM, a) || []).filter(free);
    const ranged = minR > 1;
    // Cuerpo a cuerpo: como siempre, pegado al Slime (aunque la carta llegue también a 2)
    const goodFrom = ranged ? hitsFrom : (c) => dist(c) === 1;
    const spots = reach.filter(goodFrom);
    step.title = i18n.t(ranged ? 'tutorialCombat.step.move2Range.title' : 'tutorialCombat.step.move2.title');
    step.text = i18n.t(ranged ? 'tutorialCombat.step.move2Range.text' : 'tutorialCombat.step.move2.text');
    // Ya le llega desde donde está: no hace falta moverse
    if (goodFrom({ x: a.gridX, z: a.gridZ })) { step.allowedCell = { x: a.gridX, z: a.gridZ }; step._skip = true; return true; }
    step._skip = false;
    const walk = (c) => Math.abs(c.x - a.gridX) + Math.abs(c.z - a.gridZ);
    const pick = (!ranged && spots.find((c) => c.x === 3 && c.z === 6))
      || spots.sort((p, q) => walk(p) - walk(q))[0];
    if (pick) { step.allowedCell = { x: pick.x, z: pick.z }; delete step.allowedCells; return true; }
    // Ninguna casilla a tiro al alcance: que se mueva libremente (todas las alcanzables valen)
    step.allowedCell = null;
    step.allowedCells = reach.map((c) => ({ x: c.x, z: c.z }));
    return true;
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
            <p class="lk-ctut__nudge" data-ref="nudge" role="status"></p>
          </div>
          <button id="tut-btn-next" type="button" class="lk-btn lk-btn-primary-gold lk-ctut__go"><span data-ref="goTxt">${i18n.t('tutorialCombat.start')}</span><small>${i18n.t('tutorialCombat.enterKey')}</small></button>
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
          // Cerrada una vez, la tarjeta «¡Buen trabajo!» ya no vuelve en los turnos siguientes
          this._freeDismissed = true;
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

    // 4. (Sin PointLight: mostrar/ocultar una luz cambia el número de luces y recompila todos los
    //    shaders del combate. El brillo lo dan los materiales básicos y el bloom.)
    this.arrowLight = null;

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
    // Altura: casilla vacía → justo encima del suelo; con unidad → un poco por encima de su cabeza (alto medido
    // del modelo, el mismo del clic). Antes 1,45 fijo: quedaba muy alta en las casillas y sobre unidades pequeñas.
    const g = this.game;
    const unit = (g.units || []).find((u) => u && !u.isDead && u.gridX === cellX && u.gridZ === cellZ);
    let top = 0;
    if (unit && unit.group) {
      try { top = unit.group.position.y + (g._unitPickShape ? g._unitPickShape(unit).h : 1.2); } catch { top = 1.2; }
    }
    this.arrowBaseY = unit ? top + 0.3 : 0.4;
    this.arrowGroup.position.set(worldPos.x, this.arrowBaseY, worldPos.z);
    this.arrowGroup.visible = true;
  }

  hideArrow() {
    if (this.arrowGroup) {
      this.arrowGroup.visible = false;
    }
  }

  update(time) {
    if (this.isActive && this.dynamic) {
      const g = this.game;
      if (!g || g.gameState !== 'BATTLE' || g.turnManager?.isCombatOver) { this.completeTutorial(); return; }
      const a = g.turnManager?.getActiveUnit?.() || null;
      // cambio de turno, o la carta seleccionada cambió: se recalcula el paso
      const sig = `${a ? a.id || a.name : '-'}|${g.selectedSpell ? g.selectedSpell.id : '-'}|${a ? a.gridX + ',' + a.gridZ : ''}`;
      if (sig !== this.dynamic.lastSig) { this.dynamic.lastSig = sig; this.currentStep = 0; this._setDynStep(); this._renderStep(); }
    }
    if (!this.isActive || !this.arrowGroup || !this.arrowGroup.visible) return;

    const bounce = Math.sin(time * 5.0) * 0.22;
    this.arrowGroup.position.y = this.arrowBaseY + bounce;
    this.arrowGroup.rotation.y = time * 1.5;

    if (this.groundRing) {
      const pulse = 1.0 + Math.sin(time * 6.0) * 0.12;
      this.groundRing.scale.set(pulse, pulse, 1.0);
      // el aro va pegado al suelo aunque la flecha suba y baje (antes flotaba con ella)
      this.groundRing.position.y = 0.035 - this.arrowGroup.position.y;
    }
  }

  startTutorial() {
    this._freeDismissed = false;
    this.dynamic = null;
    this.steps = this.dojoSteps;
    this._timelineLit = null;
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
    if (this.dynamic) { this._dynAdvance(); return; }
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
    let step = this.steps[this.currentStep];
    if (!step) return;
    // Casillas que siguen al Slime; si ya no está (caso raro), el combate queda libre
    if (!this._resolveCells(step)) {
      const free = this.steps.findIndex((s) => s.id === 'step_battle_flow');
      if (free >= 0 && free !== this.currentStep) { this.currentStep = free; step = this.steps[free]; }
    } else if (step._skip && step.id === 'step_move_2') {
      // El Axie ya tiene al Slime a tiro (a su lado o a distancia, Hito 139): directo a elegir la carta
      this.currentStep++;
      step = this.steps[this.currentStep];
    }
    if (step.highlightTimeline && this._timelineLit !== step) {
      this._timelineLit = step;
      const tl = document.getElementById('initiative-timeline');
      if (tl) {
        tl.classList.remove('lk-tut-timeline'); void tl.offsetWidth; tl.classList.add('lk-tut-timeline');
        clearTimeout(this._timelineTimer);
        this._timelineTimer = setTimeout(() => tl.classList.remove('lk-tut-timeline'), 2000);
      }
    }
    const nudgeEl = this.overlay && this.overlay.querySelector('[data-ref="nudge"]');
    if (nudgeEl) nudgeEl.classList.remove('lk-is-on');
    // Combate libre con la tarjeta ya cerrada: cada inicio de turno volvía a llamar aquí y la reabría
    if (this._freeDismissed && (step.targetType === 'free_action' || step.id === 'step_battle_flow')) {
      if (this.overlay) this.overlay.classList.add('hidden');
      this._markUi(step);
      return;
    }

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
      if (this.dynamic) {
        // Duelo / prueba de la Ultimate: sin «Paso X de Y» (los pasos dependen del turno)
        if (phases) phases.innerHTML = '';
        if (badge) badge.textContent = `${this.dynamic.kind === 'ult' ? i18n.t('tutorialCombat.badge.ultTrial') : i18n.t('tutorialCombat.badge.duel')}${step.kicker ? ` · ${step.kicker}` : ''}`;
      } else {
        if (phases) phases.innerHTML = step.targetType === 'dialog' ? '' : actionSteps.map((s, i) => `<i class="${step.targetType === 'free_action' || i < idx ? 'lk-is-full' : i === idx ? 'lk-is-half' : ''}"></i>`).join('');
        if (badge) badge.textContent = step.targetType === 'dialog' ? i18n.t('tutorialCombat.badge.intro') : step.targetType === 'free_action' ? i18n.t('tutorialCombat.badge.done') : `${i18n.t('tutorialCombat.badge.step', { n: idx + 1, total: actionSteps.length })}${step.kicker ? ` · ${step.kicker}` : ''}`;
      }
      const concepts = this.overlay.querySelector('[data-ref="concepts"]');
      if (concepts) concepts.innerHTML = (step.concepts || []).map((c) => `<span class="lk-ctut__concept lk-ctut__concept--${c.k}"><i aria-hidden="true"></i><b>${c.label}</b>${c.text}</span>`).join('');
      // Cada paso nuevo entra con una transición corta (sin rebotes)
      this.overlay.classList.remove('lk-ctut--in'); void this.overlay.offsetWidth; this.overlay.classList.add('lk-ctut--in');
      if (this.titleEl) this.titleEl.textContent = step.title;
      let text = step.text;
      const heroFirstSpellId = this.game?.activeUnit?.spellIds?.[0];
      const spell = heroFirstSpellId ? this.game?.spellManager?.getSpell(heroFirstSpellId) : null;
      const classSlot = i18n.t('tutorialCombat.classSkillSlot');
      if (spell && text.includes(classSlot)) {
        text = text.replace(classSlot, `[1] ${spell.name}`);
      }
      if (this.textEl) this.textEl.innerHTML = text;

      const goTxt = this.btnNext.querySelector('[data-ref="goTxt"]');
      const setGo = (t) => { if (goTxt) goTxt.textContent = t; else this.btnNext.textContent = t; };
      if (step.id === 'step_intro') {
        this.btnNext.classList.remove('hidden');
        setGo(step.btnText || i18n.t('tutorialCombat.startBattle'));
        setTimeout(() => this.btnNext?.focus({ preventScroll: true }), 50);
      } else if (step.id === 'step_battle_flow' || step.targetType === 'free_action') {
        this.btnNext.classList.remove('hidden');
        setGo(step.btnText || i18n.t('tutorialCombat.charge'));
      } else {
        this.btnNext.classList.add('hidden');
      }
    }

    // Refresh movement and attack highlights
    if (this.game) {
      this.game._refreshMovementHighlights();
      if ((step.id === 'step_attack_1' || step.id === 'step_attack_2') && step.allowedCell) {
        this.game.gridManager.highlightSpellTargets([step.allowedCell]);
        this.showArrowAt(step.allowedCell.x, step.allowedCell.z);
      } else if ((step.id === 'step_move_1' || step.id === 'step_move_2') && step.allowedCell) {
        this.showArrowAt(step.allowedCell.x, step.allowedCell.z);
      } else {
        this.hideArrow();
      }
    }

    // Barra de abajo: se ilumina lo que toca y el resto queda apagado (y bloqueado)
    this._markUi(step);
  }

  _clearUiMarks() {
    document.querySelectorAll('.tut-highlight, .tut-dim, .lk-tut-blink').forEach((el) => el.classList.remove('tut-highlight', 'tut-dim', 'lk-tut-blink'));
  }

  _markUi(step) {
    this._clearUiMarks();
    if (!this.isActive || !step) return;
    const free = step.targetType === 'free_action' || step.id === 'step_battle_flow';
    if (free) return;
    const slots = [...document.querySelectorAll('[id^="spell-slot-"]')].filter((el) => /^spell-slot-\d+$/.test(el.id));
    const allowed = Array.isArray(step.allowedSpellIndexes) ? step.allowedSpellIndexes : (step.allowedSpellIndex !== undefined && step.targetType === 'spell_slot' ? [step.allowedSpellIndex] : []);
    slots.forEach((el) => {
      const i = Number(el.id.slice(11));
      if (step.targetType === 'spell_slot' && allowed.includes(i)) el.classList.add('tut-highlight');
      else el.classList.add('tut-dim');
    });
    const ult = document.getElementById('spell-slot-ult');
    if (ult) ult.classList.add(step.allowUlt ? 'tut-highlight' : 'tut-dim');
    const btnEnd = document.getElementById('btn-end-turn');
    // «Pasar turno» conserva su forma: solo parpadea cuando toca pulsarlo (lk-tut-blink, lunakai-tutorial.css)
    if (btnEnd) btnEnd.classList.add(step.id === 'step_end_turn' ? 'lk-tut-blink' : 'tut-dim');
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

    if (Array.isArray(step.allowedSpellIndexes)) return step.allowedSpellIndexes.includes(spellIndex);
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
    this._freeDismissed = false;
    this.isActive = false;
    this.dynamic = null;
    this.steps = this.dojoSteps;
    this._clearUiMarks();
    this.hideArrow();
    const slot0 = document.getElementById('spell-slot-0');
    const btnEnd = document.getElementById('btn-end-turn');
    [slot0, btnEnd].forEach(el => el && el.classList.remove('tut-highlight', 'lk-tut-blink'));
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }
}
