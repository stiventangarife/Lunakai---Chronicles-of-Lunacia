// main.js - Core Orchestrator for Axie Tactics 3D with Biomes, Equipment & Guided Tutorial
import * as THREE from 'three';
if (typeof window !== 'undefined') window.THREE = THREE;
import { TacticalAudio } from './tactics/TacticalAudio.js';
import { SceneManager } from './tactics/SceneManager.js';
import { GridManager } from './tactics/GridManager.js';
import { FloatingCombatText } from './tactics/FloatingCombatText.js';
import { Unit } from './tactics/Unit.js';
import { SpellManager, SPELLS_DB } from './tactics/Spells.js';
import { TurnManager } from './tactics/TurnManager.js';
import { TacticalAI } from './tactics/TacticalAI.js';
import { BIOMES } from './tactics/Biomes.js';
import { ITEMS_DB, LEVEL_DROPS } from './tactics/ItemDatabase.js';
import { EquipmentManager } from './tactics/EquipmentManager.js';
import { TutorialManager } from './tactics/TutorialManager.js';
import { LEVELS_CONFIG } from './tactics/LevelsDatabase.js';
import { DynamicCombatFactory } from './tactics/DynamicCombatFactory.js';
import { BATTLE_MAPS, getBattleMap, forceBattleMap, getForcedBattleMap } from './tactics/maps/BattleMaps.js';
import { BattleArena } from './tactics/arena/BattleArena.js';
import { obstacleTypesFor } from './tactics/arena/BattleArenaThemes.js';
import { OCC_SETTINGS } from './tactics/arena/ArenaOcclusionDither.js';
import { OverworldManager } from './rpg/OverworldManager.js';
import { portraitService } from './tactics/CharacterPortraitService.js';
import { StartScreenUI } from './rpg/ui/StartScreenUI.js';
import { saveSlotManager, getHeroSpells, SAPIDAE_CLASSES } from './rpg/SaveSlotManager.js';
import { CombatEndScreen, expPct } from './rpg/ui/CombatEndScreen.js';
import { CombatBanner } from './rpg/ui/CombatBanner.js';
import { initLoadingScreen } from './ui/LoadingScreen.js';
import { initCombatHUDMarkup, attachCombatHUD } from './ui/CombatHUD.js';
import { attachTurnTimer } from './ui/TurnTimerHUD.js';
import { accountManager } from './net/AccountManager.js';
import { SaveStatusChip } from './net/SaveStatusChip.js';
import { installCombatDebug } from './tactics/combat/CombatDebug.js';
import { CombatTelemetry } from './tactics/combat/CombatTelemetry.js';
import { VfxBridge } from './vfx/VfxBridge.js';
import { installTestArena } from './tactics/combat/TestArena.js';
import { BondService } from './rpg/BondService.js';
import { RuneCharmService } from './rpg/RuneCharmService.js';
import { ULTIMATE_SLOT } from './ui/UltimateButton.js';
import { attachAxieCare } from './ui/AxieCarePanel.js';
import { attachRunesCharms } from './ui/RunesCharmsPanel.js';
import { attachForge } from './ui/ForgePanel.js';
import { attachShop } from './ui/ShopPanel.js';
import { AxiePartsResolver } from './rpg/AxiePartsResolver.js';
import { STARTER_DECKS } from './tactics/data/StarterCards.js';
import { CollectionVFX } from './tactics/combat/CollectionVFX.js';

/**
 * Tutorial (19-oct): las cartas de partes del Axie con un ataque que alcance a 1 casilla en la ranura [1],
 * porque el paso 6 pide usar la [1] contra la Quimera Guardián. null si no tiene ninguno.
 */
function tutorialCardOrder(ids) {
  if (!Array.isArray(ids) || !ids.length) return null;
  const sp = (id) => SPELLS_DB[id];
  const melee = (s) => s && s.targetType === 'enemy' && (s.effects || []).some((e) => e.type === 'damage')
    && (s.minRange ?? 1) <= 1 && (s.maxRange ?? 1) >= 1 && (s.paCost ?? 0) <= 6;
  const options = ids.filter((id) => melee(sp(id)));
  if (!options.length) return null;
  const first = options.find((id) => (sp(id).maxRange || 1) >= 2) || options[0];
  return [first, ...ids.filter((id) => id !== first)];
}
import { renderForecast, clearForecast } from './ui/ForecastPanel.js';
import { axieMixerService } from './rpg/AxieMixerService.js';
import { AXIE_GENES_DECODER } from '@jaatster/threejs-axie-mixer3d-public';

// Pantalla de carga entre zonas con el sistema de diseño (debe ir antes de crear ZoneTransitionManager)
initLoadingScreen();
// HUD de combate con el sistema de diseño (marcado antes de que el juego enganche sus eventos)
initCombatHUDMarkup();


/** Regeneración de vida en el mundo abierto (vida persistente, 18-oct). */
const OVERWORLD_HP_REGEN = { amount: 10, everySec: 5 };

class AxieTacticsGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.textLayer = document.getElementById('combat-text-layer');

    this.audio = new TacticalAudio();
    this.sceneManager = new SceneManager(this.container);
    this.gridManager = new GridManager(this.sceneManager.scene);
    this.combatText = new FloatingCombatText(this.sceneManager.camera, this.textLayer);
    this.spellManager = new SpellManager(this.gridManager, this.sceneManager, this.audio, this.combatText, this);
    this.turnManager = new TurnManager(this.sceneManager, this.audio);
    this.spellManager.bindTurnManager(this.turnManager); // estados alterados y objetos temporales
    // VFX de las partes de colección especial (Japan, Xmas, Mystic, Summer, Nightmare, Shiny, Bionic)
    this.collectionVFX = new CollectionVFX(this.sceneManager.scene).install(this.spellManager.events);
    this.ai = new TacticalAI(this.gridManager, this.spellManager, this.turnManager);

    this.equipmentManager = new EquipmentManager();
    this.tutorialManager = new TutorialManager(this);

    // Overworld RPG Scene Orchestrator
    this.gameState = 'INTRO'; // 'INTRO', 'OVERWORLD', 'BATTLE', 'CAMP'
    this.overworldManager = new OverworldManager(
      this.sceneManager.renderer,
      this.audio,
      async (encounterData) => {
        await this._onOverworldBattleEncounter(encounterData);
      },
      this.equipmentManager
    );
    this.inventoryModal = this.overworldManager.inventoryModal;
    this.questManager = this.overworldManager.questManager;
    this.questBookModal = this.overworldManager.questBookModal;
    this.overworldManager.onStateChange = (newState) => {
      if (this.gameState === 'BATTLE') return;
      this.gameState = newState;
    };
    window.overworldManager = this.overworldManager;
    // Fase 4: las 6 cartas de cada Axie salen de sus partes reales (caché → API → genes; si no, hechizos de siempre)
    this.partsResolver = new AxiePartsResolver({
      fetchAxie: (id) => axieMixerService.fetchAxieData(id),
      decodeGenes: (genes) => AXIE_GENES_DECODER.decode(genes),
      slots: saveSlotManager,
    });
    window.lunakaiParts = this.partsResolver;
    this.axieCare = attachAxieCare(this); // Axie Care: clic en el compañero → acariciar / dar de comer; +0,5 % cada 500 m
    this.runesCharms = attachRunesCharms(this); // Tecla U: Mochila › Runas y charms (mejoran las habilidades de cada Axie)
    this.forge = attachForge(this); // Forja del Valle del Dojō: yunque en el patio (E) → crear Tier 0 y evolucionar equipo
    this.shop = attachShop(this); // Tienda: el Mercader Ochi (patio del Dojō) la abre al hablar con él
    window.__AXIE_TACTICS_APP__ = this;

    this.currentLevel = 1; // 1 = Tutorial (Training Dojo), 2 = Lunacia Plains 3v3
    this.selectedHeroId = 'kotaro';

    this.units = [];
    this.activeUnit = null;

    this.selectedSpell = null;
    this.selectedSpellIndex = -1;
    this.hoverCell = null;
    this.reachableCells = [];
    this.validSpellCells = [];

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.planeIntersect = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.clock = new THREE.Clock();

    this._initUI();
    this._initInput();
    attachCombatHUD(this);
    // Fase 5: cartas con usos por turno agotados (castsPerTurn) → deshabilitadas en las 6 ranuras
    {
      const baseUpdate = this._updateHUD.bind(this);
      this._updateHUD = (unit) => {
        const r = baseUpdate(unit);
        try {
          const u = unit || this.activeUnit;
          (u?.spellIds || []).slice(0, 6).forEach((id, i) => {
            const slot = document.getElementById(`spell-slot-${i}`);
            const s = this.spellManager.getSpell(id, u);
            const spent = Boolean(s && this.spellManager.castLimitReached(u, s));
            if (!slot) return;
            if (spent) slot.classList.add('disabled');
            slot.toggleAttribute('data-spent', spent);
            if (spent) slot.title = 'Ya la usaste este turno (1 vez por turno)';
            else if (slot.title === 'Ya la usaste este turno (1 vez por turno)') slot.removeAttribute('title');
          });
        } catch { /* la interfaz nunca rompe el combate */ }
        return r;
      };
    }
    this._setupTurnCallbacks();
    attachTurnTimer(this); // Reloj del turno del jugador: 30 s, sobrante al siguiente (máx. 45 s), −10 s si no actúa en 10 s
    this.combatBanner = new CombatBanner();
    this.endScreen = new CombatEndScreen({ resolvePortrait: (key) => portraitService.getPortrait(key) });

    // Re-render combat timeline and active HUD when asynchronous 3D portraits finish generating
    portraitService.addListener(() => {
      if (this.gameState === 'BATTLE' && this.turnManager && this.turnManager.queue) {
        this._updateTimelineUI(this.turnManager.queue);
        if (this.activeUnit) {
          this._updateHUD(this.activeUnit);
        }
      }
    });

    this._showBattleHUD(false);

    // Initialize Start Screen UI & Save Slots Manager
    this.startScreen = new StartScreenUI({
      audio: this.audio,
      onStartAdventure: async (slotData, isNewGame) => {
        await this._onStartAdventure(slotData, isNewGame);
      }
    });
    window.startScreenUI = this.startScreen;
    // Indicador de guardado en la nube (solo con cuenta y durante la partida)
    this.saveStatusChip = new SaveStatusChip(accountManager);

    this.overworldManager.onExitToTitle = () => {
      this._returnToTitleScreen();
    };

    this._setupAutoSave();
    installCombatDebug(this);
    // Fase 5: registro de equilibrio de tus partidas (lkDebug.balance(), balanceFights(), balanceExport())
    try { this.telemetry = new CombatTelemetry(this).install(this.spellManager.events, this.turnManager); CombatTelemetry.extendDebug(); } catch (e) { console.warn('[telemetría]', e); }
    // Fase 6: efectos del motor de VFX (src/vfx) en las cartas de los Axies jugables (lkDebug.vfx())
    try { this.vfxBridge = new VfxBridge(this).install(this.spellManager.events, this.turnManager); this.vfxBridge.extendDebug(); } catch (e) { console.warn('[vfx]', e); }
    // Arena de pruebas de habilidades: lkDebug.arena(), lkDebug.probar('id', distancia)
    try { installTestArena(this); } catch (e) { console.warn('[pruebas]', e); }
    // Hito 35: mapas de combate por bioma — lkDebug.map('savannah_oasis') fuerza un mapa, lkDebug.map(null) vuelve al azar
    try { this._installBattleMapDebug(); } catch (e) { console.warn('[mapas]', e); }
    // Hito 37: dither fading — el escenario se disuelve donde tapa a una unidad o a la casilla bajo el ratón
    this.sceneManager.occlusionProvider = () => this._occlusionPoints();
    this._isLoadingAdventure = false;
    this._animate();
  }

  async _onStartAdventure(slotData, isNewGame = false) {
    this._isLoadingAdventure = true;
    try {
      this.audio.init();

      // 1. Apply slot data to EquipmentManager (hero, inventory, equipped, progression, unlockedHeroes)
      this.equipmentManager.applySlotData(slotData);
      // Vínculo: −5 % por día sin jugar desde la última partida y empieza a contar el tiempo de juego
      try { this.axieCare?.service?.startSession(); } catch (e) { console.warn('[AxieCare] startSession', e); }

      // 2. Start Overworld (run prologue only if it's a new adventure)
      const withPrologue = isNewGame;
      await this._startOverworld(withPrologue, slotData);
      if (this.saveStatusChip) this.saveStatusChip.setInGame(true);
    } finally {
      this._isLoadingAdventure = false;
    }
  }

  _returnToTitleScreen() {
    if (this.gameState === 'OVERWORLD') {
      this._saveCurrentProgress();
    }
    if (this.audio && typeof this.audio.stopMusic === 'function') {
      this.audio.stopMusic(800);
    }
    if (this.overworldManager && this.overworldManager.overworldHudEl) {
      this.overworldManager.overworldHudEl.classList.add('hidden');
    }
    const introCard = document.getElementById('hero-presentation-card');
    if (introCard) introCard.classList.add('hidden');

    this._showBattleHUD(false);
    if (this.saveStatusChip) this.saveStatusChip.setInGame(false);
    // Al volver al título se sube ya lo pendiente (para que otro dispositivo vea lo último)
    if (accountManager.mode === 'account') accountManager.cloud.flush().catch(() => null);
    this.startScreen.show();
  }

  _saveCurrentProgress() {
    if (this._isLoadingAdventure) return;
    if (!saveSlotManager.getActiveSlot()) return;
    if (this.gameState !== 'OVERWORLD' && this.gameState !== 'TRANSITION') return;
    const exported = this.equipmentManager.exportSlotData();
    const p = this.overworldManager?.player;
    const wmm = this.overworldManager?.worldMapManager;
    const qm = this.overworldManager?.questManager;
    const tm = this.overworldManager?.tutorialManager;

    const currentMapDef = wmm?.currentMapDef;
    const mapId = wmm?.currentMapId || 'zone_2_2';
    const zoneName = currentMapDef?.name || 'Valle del Dojo';
    const gx = currentMapDef?.gx !== undefined ? currentMapDef.gx : 2;
    const gy = currentMapDef?.gy !== undefined ? currentMapDef.gy : 2;

    const activeSlot = saveSlotManager.getActiveSlot();
    let currentPortrait = activeSlot?.sapidaePortrait || null;
    if (this.overworldManager?.player?.mesh && portraitService) {
      try {
        const dynSnap = portraitService.captureModel('active_player_slot', this.overworldManager.player.mesh, {
          fullBody: true,
          isHumanoid: true,
          zoomFactor: 0.98,
          yaw: -0.15,
          pitch: 0.02
        });
        if (dynSnap) {
          currentPortrait = dynSnap;
        }
      } catch (_) {}
    }

    saveSlotManager.updateActiveSlot({
      level: this.equipmentManager.heroProgression?.kotaro?.level || 1,
      currentExp: this.equipmentManager.heroProgression?.kotaro?.currentExp || 0,
      gold: exported.gold || 0,
      inventory: exported.inventory,
      equipped: exported.equipped,
      progression: exported.progression,
      currentHP: exported.currentHP,
      sapidaeModel: p?.sapidaeModel || activeSlot?.sapidaeModel || 'sapidae-f-a',
      customization: p?.customization || activeSlot?.customization,
      sapidaePortrait: currentPortrait,
      unlockedHeroes: exported.unlockedHeroes || ['kotaro'],
      squad: exported.squad,
      zone: {
        mapId: mapId,
        name: zoneName,
        coords: [gx, gy],
        playerPos: p ? {
          x: p.position.x,
          y: p.position.y,
          z: p.position.z,
          yaw: p.yaw || 0
        } : null,
        visitedZones: wmm ? Array.from(wmm.visitedZones) : ['zone_2_2']
      },
      questProgress: qm ? qm.exportSaveData() : null,
      tutorialProgress: tm ? tm.exportSaveData() : null
    });

    // Perfil de la cuenta: recordar que el jugador ya terminó la introducción
    const tp = tm ? tm.exportSaveData() : null;
    if (tp && tp.isActive === false) accountManager.markIntroCompleted();
  }

  _setupAutoSave() {
    // 1. Equipment & Squad changes
    if (this.equipmentManager && typeof this.equipmentManager.addListener === 'function') {
      this.equipmentManager.addListener(() => {
        if (this.gameState !== 'BATTLE') {
          this._saveCurrentProgress();
        }
      });
    }

    // 2. Quest changes (objectives, steps, turn-in)
    if (this.overworldManager?.questManager && typeof this.overworldManager.questManager.addListener === 'function') {
      this.overworldManager.questManager.addListener(() => {
        if (this.gameState !== 'BATTLE') {
          this._saveCurrentProgress();
        }
      });
    }

    // 3. Map transitions (entering new zone / biome)
    if (this.overworldManager?.worldMapManager) {
      this.overworldManager.worldMapManager.onMapChanged = () => {
        if (this.gameState !== 'BATTLE') {
          this._saveCurrentProgress();
        }
      };
    }

    // 4. Periodic auto-save every 15 seconds during exploration
    setInterval(() => {
      if (this.gameState === 'OVERWORLD') {
        this._saveCurrentProgress();
      }
    }, 15000);

    // 5. Browser close / reload save
    window.addEventListener('beforeunload', () => {
      this._saveCurrentProgress();
    });
  }

  _initUI() {
    document.getElementById('btn-end-turn').addEventListener('click', () => {
      this.audio.init();
      if (this.tutorialManager.isActive && !this.tutorialManager.isEndTurnAllowed()) {
        this.audio.playCollision();
        return;
      }
      if (this.activeUnit && this.activeUnit.team === 'player' && !this.activeUnit.isMoving) {
        if (this.tutorialManager.isActive && this.tutorialManager.getCurrentStepId() === 'step_end_turn') {
          this.tutorialManager.advanceStep();
        }
        this.turnManager.endCurrentTurn();
      }
    });

    document.getElementById('btn-cam-left').addEventListener('click', () => {
      this.audio.init();
      this.sceneManager.rotateLeft();
    });
    document.getElementById('btn-cam-right').addEventListener('click', () => {
      this.audio.init();
      this.sceneManager.rotateRight();
    });
    document.getElementById('btn-cam-reset').addEventListener('click', () => {
      this.audio.init();
      const focusPos = this.activeUnit ? this.gridManager.gridToWorld(this.activeUnit.gridX, this.activeUnit.gridZ) : null;
      this.sceneManager.resetCamera(focusPos);
    });

    const btnMute = document.getElementById('btn-mute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        if (this.audio && typeof this.audio.toggleMute === 'function') {
          const isMuted = this.audio.toggleMute();
          btnMute.textContent = isMuted ? '🔇' : '🔊';
          btnMute.title = isMuted ? 'Unmute Music and Sound' : 'Mute Music and Sound';
          const ovSoundBtn = document.getElementById('btn-toggle-sound');
          if (ovSoundBtn) ovSoundBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
        }
      });
    }

    const helpModal = document.getElementById('help-modal');
    document.getElementById('btn-help').addEventListener('click', () => {
      this.audio.init();
      helpModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-help').addEventListener('click', () => {
      helpModal.classList.add('hidden');
    });
    document.getElementById('btn-ok-help').addEventListener('click', () => {
      helpModal.classList.add('hidden');
    });

    // Victory modal action buttons
    document.getElementById('btn-restart').addEventListener('click', () => {
      document.getElementById('gameover-modal').classList.add('hidden');
      // Reintentar: el combate vuelve a empezar con la vida que se tenía al entrar
      if (this._battleStartHP && this.equipmentManager) {
        Object.entries(this._battleStartHP).forEach(([id, hp]) => this.equipmentManager.setCurrentHP(id, hp, { silent: true }));
      }
      this.gameState = 'BATTLE';
      this._showBattleHUD(true);
      this._startBattle(this.activeBattleConfig || this.currentLevel);
    });

    const btnReturnOverworld = document.getElementById('btn-return-overworld');
    if (btnReturnOverworld) {
      btnReturnOverworld.addEventListener('click', async () => {
        document.getElementById('gameover-modal').classList.add('hidden');
        const isVictory = (this.lastBattleOutcome !== 'DEFEAT');
        await this._returnToOverworld(isVictory);
      });
    }

    const btnNextLevel = document.getElementById('btn-next-level');
    if (btnNextLevel) {
      btnNextLevel.addEventListener('click', () => {
        document.getElementById('gameover-modal').classList.add('hidden');
        this.gameState = 'BATTLE';
        this._showBattleHUD(true);
        const nextLevel = Math.min(10, this.currentLevel + 1);
        this._startBattle(nextLevel);
      });
    }

    document.getElementById('btn-goto-camp').addEventListener('click', () => {
      document.getElementById('gameover-modal').classList.add('hidden');
      this.gameState = 'CAMP';
      this._openEquipmentScreen();
    });

    // Camp Return to Overworld button
    const btnCampToOverworld = document.getElementById('btn-camp-to-overworld');
    if (btnCampToOverworld) {
      btnCampToOverworld.addEventListener('click', () => {
        document.getElementById('equipment-screen').classList.add('hidden');
        this._returnToOverworld();
      });
    }

    // Camp Start Selected Battle button
    const btnStartBattle = document.getElementById('btn-start-battle');
    if (btnStartBattle) {
      btnStartBattle.addEventListener('click', () => {
        document.getElementById('equipment-screen').classList.add('hidden');
        this.gameState = 'BATTLE';
        this._showBattleHUD(true);
        this._startBattle(this.equipmentManager.selectedLevelId);
      });
    }

    // Camp Navigation Tabs (Equipment vs 10-Level Map)
    const tabEquipment = document.getElementById('tab-btn-equipment');
    const tabMap = document.getElementById('tab-btn-map');
    const viewEquipment = document.getElementById('camp-view-equipment');
    const viewMap = document.getElementById('camp-view-map');

    if (tabEquipment && tabMap) {
      tabEquipment.addEventListener('click', () => {
        this.audio.init();
        tabEquipment.classList.add('active');
        tabMap.classList.remove('active');
        if (viewEquipment) viewEquipment.classList.remove('hidden');
        if (viewMap) viewMap.classList.add('hidden');
      });

      tabMap.addEventListener('click', () => {
        this.audio.init();
        tabMap.classList.add('active');
        tabEquipment.classList.remove('active');
        if (viewMap) viewMap.classList.remove('hidden');
        if (viewEquipment) viewEquipment.classList.add('hidden');
        this._renderCampMissionMap();
      });
    }

    // Spell hotbar slots
    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById('spell-slot-' + i);
      slot.addEventListener('click', () => {
        if (this.gameState !== 'BATTLE') return;
        this.audio.init();
        this._toggleSpellSelect(i);
      });

      slot.addEventListener('mouseenter', (e) => {
        if (this.gameState !== 'BATTLE') return;
        this._showSpellTooltip(i, e);
      });
      slot.addEventListener('mouseleave', () => {
        this._hideSpellTooltip();
      });
    }
  }

  _initInput() {
    window.addEventListener('mousemove', (e) => {
      if (this.gameState !== 'BATTLE') return;
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this._handleHover();
    });

    this.container.addEventListener('click', (e) => {
      if (this.gameState !== 'BATTLE') return;
      this.audio.init();
      if (e.button === 0) {
        this._handleGridClick();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.gameState !== 'BATTLE') return;
      this.audio.init();
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.tutorialManager.isActive && !this.tutorialManager.isEndTurnAllowed()) {
          this.audio.playCollision();
          return;
        }
        if (this.activeUnit && this.activeUnit.team === 'player' && !this.activeUnit.isMoving) {
          if (this.tutorialManager.isActive && this.tutorialManager.getCurrentStepId() === 'step_end_turn') {
            this.tutorialManager.advanceStep();
          }
          this.turnManager.endCurrentTurn();
        }
      } else if (e.code === 'KeyQ') {
        this.sceneManager.rotateLeft();
      } else if (e.code === 'KeyE') {
        this.sceneManager.rotateRight();
      } else if (e.code === 'KeyR') {
        const focusPos = this.activeUnit ? this.gridManager.gridToWorld(this.activeUnit.gridX, this.activeUnit.gridZ) : null;
        this.sceneManager.resetCamera(focusPos);
      } else if (e.code === 'Digit1') {
        this._toggleSpellSelect(0);
      } else if (e.code === 'Digit2') {
        this._toggleSpellSelect(1);
      } else if (e.code === 'Digit3') {
        this._toggleSpellSelect(2);
      } else if (e.code === 'Escape') {
        this._clearSpellSelection();
      }
    });
  }

  _showBattleHUD(show) {
    document.body.classList.toggle('state-combat', Boolean(show));
    if (show || document.body.classList.contains('state-combat-ended')) {
      document.body.classList.remove('state-combat-ended');
      ['lk-cb-log', 'lk-cb-enemy'].forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = ''; });
    }
    const header = document.querySelector('.battle-header');
    const hud = document.querySelector('.tactical-hud');
    const camControls = document.querySelector('.camera-controls');
    const forecast = document.getElementById('combat-forecast');
    const tutOverlay = document.getElementById('tutorial-overlay');

    if (header) header.classList.toggle('hidden', !show);
    if (hud) hud.classList.toggle('hidden', !show);
    if (camControls) camControls.classList.toggle('hidden', !show);
    if (forecast && !show) forecast.classList.add('hidden');
    if (tutOverlay && !show) tutOverlay.classList.add('hidden');

    const overworldTutBanner = document.getElementById('overworld-tutorial-banner');
    if (overworldTutBanner && show) {
      overworldTutBanner.classList.add('hidden');
    }

    // Forcefully close and hide overworld modals and HUDs in combat
    if (show) {
      if (this.inventoryModal && typeof this.inventoryModal.close === 'function') {
        this.inventoryModal.close();
      }
      if (this.questBookModal && typeof this.questBookModal.close === 'function') {
        this.questBookModal.close();
      }
      if (this.overworldManager) {
        this.overworldManager.state = 'COMBAT';
        if (this.overworldManager.inventoryModal && typeof this.overworldManager.inventoryModal.close === 'function') {
          this.overworldManager.inventoryModal.close();
        }
        if (this.overworldManager.questBookModal && typeof this.overworldManager.questBookModal.close === 'function') {
          this.overworldManager.questBookModal.close();
        }
        if (this.overworldManager.worldMapManager && typeof this.overworldManager.worldMapManager.closeWorldMap === 'function') {
          this.overworldManager.worldMapManager.closeWorldMap();
        }
        if (this.overworldManager.overworldHudEl) {
          this.overworldManager.overworldHudEl.classList.add('hidden');
        }
        if (this.overworldManager.squadHUD && this.overworldManager.squadHUD.container) {
          this.overworldManager.squadHUD.container.classList.add('hidden');
        }
      }
    }
  }

  async _startOverworld(withPrologue = true, slotData = null) {
    this.gameState = 'LOADING';
    this._showBattleHUD(false);

    // Initial loading screen: "Loading Biome..."
    const curtain = document.getElementById('zone-transition-curtain');
    if (curtain) {
      const badgeEl = document.getElementById('zone-loading-badge');
      const titleEl = document.getElementById('zone-loading-title');
      const subtitleEl = document.getElementById('zone-loading-subtitle');
      const iconEl = document.getElementById('zone-loading-icon');
      const hintEl = document.getElementById('zone-loading-hint');
      if (badgeEl) badgeEl.textContent = 'LUNAKAI';
      if (titleEl) titleEl.textContent = 'Loading Biome...';
      const initialMap = slotData?.currentZone || 'zone_2_2';
      if (subtitleEl) subtitleEl.textContent = initialMap === 'zone_2_2' ? 'Dojo Valley [2, 2]' : initialMap;
      if (iconEl) iconEl.textContent = '';
      if (hintEl) hintEl.textContent = 'Preparing 3D environment and textures...';
      curtain.classList.remove('hidden');
      curtain.classList.add('active');
    }

    if (this.overworldManager) {
      this.overworldManager.isLoadingZone = true;
      if (this.overworldManager.playerController) {
        this.overworldManager.playerController.setEnabled(false);
      }
    }

    // Get active hero config from equipmentManager (flexible for dynamic user-owned Axies)
    const activeHero = this.equipmentManager.heroesBase[this.selectedHeroId] || this.equipmentManager.heroesBase['kotaro'];
    await this.overworldManager.init(activeHero, slotData);

    // Ensure player controls are kept disabled while loading screen is active
    if (this.overworldManager.playerController) {
      this.overworldManager.playerController.setEnabled(false);
    }

    this.gameState = withPrologue ? 'INTRO' : 'OVERWORLD';

    if (withPrologue) {
      this.overworldManager.startPrologue();
    } else {
      this.overworldManager.startFreeExploration(slotData);
      // Keep player controls disabled during the fade-out
      if (this.overworldManager.playerController) {
        this.overworldManager.playerController.setEnabled(false);
      }
    }

    // Wait until the first useful frame is fully drawn and stabilized by Three.js
    if (typeof this.overworldManager.waitForNextRenderFrame === 'function') {
      await this.overworldManager.waitForNextRenderFrame(2);
    } else {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    // Clean exit transition: Smooth fade out once first useful frame is drawn
    if (this.overworldManager.worldMapManager?.transitionManager) {
      await this.overworldManager.worldMapManager.transitionManager.hideLoading(500);
    } else if (curtain) {
      curtain.classList.remove('active');
      await new Promise((r) => setTimeout(r, 500));
      curtain.classList.add('hidden');
    }

    if (this.overworldManager) {
      this.overworldManager.isLoadingZone = false;
    }

    // Hand control to the player ONLY when the world is completely drawn and responsive in real time
    if (!withPrologue && this.overworldManager.state === 'EXPLORING' && this.overworldManager.playerController) {
      this.overworldManager.playerController.setEnabled(true);
    }
  }

  async _onOverworldBattleEncounter(encounterData) {
    this.gameState = 'BATTLE';
    this._showBattleHUD(true);
    const overworldTutBanner = document.getElementById('overworld-tutorial-banner');
    if (overworldTutBanner) overworldTutBanner.classList.add('hidden');

    if (this.overworldManager) {
      this.overworldManager.state = 'COMBAT';
      if (this.overworldManager.inventoryModal && typeof this.overworldManager.inventoryModal.close === 'function') {
        this.overworldManager.inventoryModal.close();
      }
      if (this.overworldManager.questBookModal && typeof this.overworldManager.questBookModal.close === 'function') {
        this.overworldManager.questBookModal.close();
      }
      if (this.overworldManager.settingsModal && typeof this.overworldManager.settingsModal.close === 'function') {
        this.overworldManager.settingsModal.close();
      }
      if (this.overworldManager.worldMapManager && typeof this.overworldManager.worldMapManager.closeWorldMap === 'function') {
        this.overworldManager.worldMapManager.closeWorldMap();
      }
      if (this.overworldManager.overworldHudEl) {
        this.overworldManager.overworldHudEl.classList.add('hidden');
      }
      if (this.overworldManager.squadHUD && this.overworldManager.squadHUD.container) {
        this.overworldManager.squadHUD.container.classList.add('hidden');
      }
      if (this.overworldManager.dialogSystem) {
        if (typeof this.overworldManager.dialogSystem.forceClose === 'function') {
          this.overworldManager.dialogSystem.forceClose(false);
        } else if (typeof this.overworldManager.dialogSystem.close === 'function') {
          this.overworldManager.dialogSystem.close();
        }
      }
      const dialogOverlay = document.getElementById('dialog-box-overlay');
      if (dialogOverlay) dialogOverlay.classList.add('hidden');
    }

    if (encounterData && encounterData.isTutorial) {
      await this._startBattle(1);
    } else if (encounterData && (encounterData.packData || encounterData.monsterId || encounterData.biome)) {
      const dynamicConfig = DynamicCombatFactory.createEncounter(encounterData, this.equipmentManager, this.questManager);
      await this._startBattle(dynamicConfig);
    } else {
      await this._startBattle(encounterData?.level || 1);
    }
  }

  async _returnToOverworld(isVictory = true) {
    this.gameState = 'OVERWORLD';
    document.body.classList.remove('state-combat');
    this._showBattleHUD(false);

    // Clean up combat units from tactical scene
    this.units.forEach(u => {
      if (u.group) this.sceneManager.scene.remove(u.group);
      const tile = this.gridManager.getTile(u.gridX, u.gridZ);
      if (tile && tile.unit === u) tile.unit = null;
    });
    this.units = [];
    this.activeUnit = null;
    this.combatText.clear();
    this.gridManager.clearObstacles();
    this.gridManager.clearHighlights();
    // Hito 35: libera el escenario del mapa de bioma (se construye de nuevo en el siguiente combate)
    if (this.sceneManager.arena) this.sceneManager.setArena(null);

    if (isVictory) {
      await this.overworldManager.resumeAfterVictory();
      this._saveCurrentProgress();
    } else {
      await this.overworldManager.resumeAfterDefeat();
      this._saveCurrentProgress(); // la vida tras la derrota (1 para quien cayó) queda guardada
    }

    if (this.overworldManager) {
      this.overworldManager.state = 'EXPLORING';
      if (this.overworldManager.overworldHudEl) {
        this.overworldManager.overworldHudEl.classList.remove('hidden');
      }
      if (this.overworldManager.squadHUD && this.overworldManager.squadHUD.container) {
        this.overworldManager.squadHUD.container.classList.remove('hidden');
      }
    }
  }

  /** Resuelve (y guarda en la partida) las cartas de partes de los Axies del escuadrón. Nunca bloquea más de ~4 s. */
  async _resolvePartCards(timeoutMs = 4000) {
    const em = this.equipmentManager;
    if (!this.partsResolver || !em?.heroesBase) return;
    const ids = typeof em.getSquad === 'function' ? em.getSquad() : Object.keys(em.heroesBase);
    const heroes = ids.map((id) => em.heroesBase[id]).filter((h) => h && (h.axieId || h.genes));
    if (!heroes.length) return;
    // Nivel/AXP de Sky Mavis para la pantalla de victoria (en segundo plano; queda en caché)
    heroes.forEach((h) => { if (h.axieId) axieMixerService.fetchAxieData(String(h.axieId)).catch(() => null); });
    const work = Promise.all(heroes.map((h) => this.partsResolver.resolve(h).catch(() => null)));
    await Promise.race([work, new Promise((r) => setTimeout(r, timeoutMs))]);
  }

  /** Hito 37: puntos que el escenario no debe tapar durante el combate. */
  _occlusionPoints() {
    if (this.gameState !== 'BATTLE') return [];
    const S = OCC_SETTINGS;
    const pts = [];
    for (const u of this.units) {
      if (!u || u.isDead || !u.group) continue;
      const sc = Math.max(1, (u.config?.scale || 1) * 0.9);
      const r = (u === this.activeUnit ? S.activeRadius : S.radius) * sc;
      pts.push({ key: `u:${u.id}`, x: u.group.position.x, y: u.group.position.y + S.height * sc, z: u.group.position.z, r });
    }
    if (this.hoverCell && this.gridManager.isValidCoord(this.hoverCell.x, this.hoverCell.z)) {
      const p = this.gridManager.gridToWorld(this.hoverCell.x, this.hoverCell.z);
      pts.push({ key: 'hover', x: p.x, y: 0.35, z: p.z, r: S.hoverRadius });
    }
    return pts;
  }

  /** Hito 35: consola de los mapas de combate (lkDebug.map / lkDebug.maps). */
  _installBattleMapDebug() {
    const d = (window.lkDebug ||= {});
    d.map = (id) => {
      if (id === undefined) {
        console.log(`[mapas] Mapa forzado: ${getForcedBattleMap() || 'ninguno (azar por bioma)'}`);
        return getForcedBattleMap();
      }
      if (id !== null && !BATTLE_MAPS[id]) {
        console.warn(`[mapas] No existe "${id}". Usa lkDebug.maps() para ver la lista.`);
        return null;
      }
      const r = forceBattleMap(id);
      console.log(r ? `[mapas] Los siguientes combates del mundo abierto usarán ${r}.` : '[mapas] Vuelve la elección al azar por bioma.');
      return r;
    };
    // Hito 37: lkDebug.dither(false|true) apaga / enciende el dither fading; lkDebug.dither({ radius: 1.1 }) ajusta radios
    d.dither = (v) => {
      if (typeof v === 'boolean') OCC_SETTINGS.enabled = v;
      else if (v && typeof v === 'object') Object.assign(OCC_SETTINGS, v);
      console.log('[dither]', { ...OCC_SETTINGS });
      return { ...OCC_SETTINGS };
    };
    d.maps = () => {
      console.table(Object.values(BATTLE_MAPS).map((m) => {
        const p = getBattleMap(m.id);
        return { id: m.id, bioma: m.biome, nombre: m.nameEs, tamaño: `${p.width}×${p.height}`, casillas: p.walkableCount, jefes: m.boss ? '👑' : '' };
      }));
    };
  }

  async _startBattle(levelOrConfig) {
    const lvlCfg = (levelOrConfig && typeof levelOrConfig === 'object') ? levelOrConfig : LEVELS_CONFIG[levelOrConfig];
    // Cartas de partes del escuadrón (también en el tutorial, para que el Axie use las suyas)
    try { await this._resolvePartCards(); } catch (e) { console.warn('[Lunakai] Cartas de partes:', e); }
    this.gameState = 'BATTLE';
    this._showBattleHUD(true);
    document.body.classList.add('state-combat');
    if (this.overworldManager) {
      this.overworldManager.state = 'COMBAT';
      if (this.overworldManager.inventoryModal && typeof this.overworldManager.inventoryModal.close === 'function') {
        this.overworldManager.inventoryModal.close();
      }
      if (this.overworldManager.questBookModal && typeof this.overworldManager.questBookModal.close === 'function') {
        this.overworldManager.questBookModal.close();
      }
      if (this.overworldManager.settingsModal && typeof this.overworldManager.settingsModal.close === 'function') {
        this.overworldManager.settingsModal.close();
      }
      if (this.overworldManager.worldMapManager && typeof this.overworldManager.worldMapManager.closeWorldMap === 'function') {
        this.overworldManager.worldMapManager.closeWorldMap();
      }
      if (this.overworldManager.overworldHudEl) {
        this.overworldManager.overworldHudEl.classList.add('hidden');
      }
      if (this.overworldManager.squadHUD && this.overworldManager.squadHUD.container) {
        this.overworldManager.squadHUD.container.classList.add('hidden');
      }
      if (this.overworldManager._heroDismissTimer) {
        clearTimeout(this.overworldManager._heroDismissTimer);
        this.overworldManager._heroDismissTimer = null;
      }
      if (this.overworldManager.flythrough) {
        this.overworldManager.flythrough.isActive = false;
        this.overworldManager.flythrough.onCompleteCallback = null;
      }
      if (this.overworldManager.npcManager) {
        this.overworldManager.npcManager.hideAllOverlays();
      }
    }

    let config;
    if (typeof levelOrConfig === 'object' && levelOrConfig !== null) {
      config = levelOrConfig;
      this.currentLevel = config.id || 1;
    } else {
      this.currentLevel = levelOrConfig || 1;
      config = LEVELS_CONFIG[this.currentLevel] || LEVELS_CONFIG[1];
    }
    this.activeBattleConfig = config;
    this.equipmentManager.selectedLevelId = this.currentLevel;
    this._updateActiveMissionBar();

    // Start tactical battle music (Boss theme if final boss, Battle theme otherwise)
    const isFinalBoss = Boolean(
      config?.isFinalBoss ||
      config?.id === 10 ||
      (typeof config?.badgeText === 'string' && config.badgeText.includes('BOSS FINAL')) ||
      (this.overworldManager?.currentBattlingZoneKey === '3_3') ||
      (this.overworldManager?.worldMapManager?.currentMapDef?.gx === 3 &&
       this.overworldManager?.worldMapManager?.currentMapDef?.gy === 3) ||
      (config?.enemies && config.enemies.some(e => e.id === 'boss_werewolf' || e.type === 'werewolf-boss'))
    );
    if (this.audio && typeof this.audio.playBattleMusic === 'function') {
      this.audio.playBattleMusic(isFinalBoss);
    }

    // Clean up existing units
    this.units.forEach(u => {
      if (u.group) this.sceneManager.scene.remove(u.group);
      const tile = this.gridManager.getTile(u.gridX, u.gridZ);
      if (tile && tile.unit === u) tile.unit = null;
    });
    this.units = [];
    this.activeUnit = null;
    this.selectedSpell = null;
    this.combatText.clear();
    this.gridManager.clearHighlights();

    // Apply Biome & Obstacles cleanly without duplicates
    // Hito 35: los combates del mundo abierto usan un mapa del bioma (forma, tamaño y escenario propios);
    // el tutorial, la campaña antigua y la arena de pruebas siguen en el 10×10 de siempre.
    const battleMap = config.battleMapId ? getBattleMap(config.battleMapId) : null;
    if (battleMap) {
      this.gridManager.loadLayout(battleMap, obstacleTypesFor(battleMap.biome));
      let arena = null;
      try {
        arena = await BattleArena.build(battleMap);
      } catch (e) {
        console.warn('[Hito 35] No se pudo construir el escenario del mapa', battleMap.id, e);
      }
      this.sceneManager.setArena(arena);
      this.sceneManager.applyBiome(arena ? arena.theme.biome : (BIOMES[config.biome] || BIOMES.lunacia_plains));
    } else {
      this.sceneManager.setArena(null);
      const biome = BIOMES[config.biome] || BIOMES.lunacia_plains;
      this.sceneManager.applyBiome(biome);
      this.gridManager.setupBiome(config.biome, config.obstacles);
    }

    // Reset camera to default tactical framing at the start of each combat
    this.sceneManager.resetCamera();
    this.sceneManager.updateCameraPosition(0.016, 1.0);

    // Hero Spells Map
    const HERO_SPELLS = {
      kotaro: ['kotaro_slash', 'kotaro_push', 'kotaro_jump'],
      bing: STARTER_DECKS.bing, // las 6 cartas originales de Origins (tactics/data/StarterCards.js)
      pomodoro: STARTER_DECKS.pomodoro
    };

    // Hero Base Scales & Types
    const HERO_CONFIGS = {
      kotaro: { type: 'kotaro', scale: 1.0 },
      bing: { type: 'bing', scale: 1.05 },
      pomodoro: { type: 'pomodoro', scale: 1.0 }
    };

    // 1. Setup Sapidae Hero Combat Unit (The Protagonist & Squad Leader!)
    const activeSlot = saveSlotManager.getActiveSlot();
    const sapidaeClassKey = (activeSlot && activeSlot.sapidaeClass) || 'crafter';
    const sapidaeClassDef = SAPIDAE_CLASSES[sapidaeClassKey] || SAPIDAE_CLASSES.crafter;
    const sapidaeModel = (activeSlot && activeSlot.sapidaeModel) || 'sapidae-m-a';
    const sapidaePlayerName = (activeSlot && activeSlot.playerName) || 'Sapidae Adventurer';
    const sapidaeCustomization = (activeSlot && activeSlot.customization) || null;

    // Estadísticas reales del Sapidae (clase + nivel + atributos + equipo de la mochila), igual que los axies
    const sapStats = this.equipmentManager ? this.equipmentManager.getCalculatedStats('sapidae') : null;
    const sapProg = this.equipmentManager ? this.equipmentManager.getProgression('sapidae') : null;

    // Vida persistente (18-oct): los héroes entran con la vida del mundo abierto (salvo tutorial y arena de pruebas)
    const usePersistentHP = !config.isTutorial && !config.isTestArena;
    this._battleUsesPersistentHP = usePersistentHP;
    this._battleStartHP = usePersistentHP && this.equipmentManager
      ? Object.fromEntries(['sapidae', ...(config.heroPositions || []).map((h) => h.id)].map((id) => [id, this.equipmentManager.getCurrentHP(id)]))
      : null;
    const startHP = (heroId) => (this._battleStartHP ? this._battleStartHP[heroId] : undefined);

    // Primary player position on grid
    const primaryHeroPos = config.sapidaePosition || (config.heroPositions && config.heroPositions[0]) || { x: 3, z: 2 };

    this.units.push(new Unit({
      id: 'sapidae_hero',
      name: sapidaePlayerName,
      archetype: sapidaeClassDef.archetype,
      type: 'sapidae',
      modelType: sapidaeModel,
      team: 'player',
      x: primaryHeroPos.x,
      z: primaryHeroPos.z,
      maxHP: sapStats ? sapStats.maxHP : sapidaeClassDef.maxHP,
      currentHP: startHP('sapidae'),
      maxPA: sapStats ? sapStats.maxPA : sapidaeClassDef.maxPA,
      maxPM: sapStats ? sapStats.maxPM : sapidaeClassDef.maxPM,
      initiative: sapStats ? sapStats.initiative : (sapidaeClassDef.initiative || 90),
      bonusDamage: sapStats ? sapStats.bonusDamage : 0,
      bonusMeleeDamage: sapStats ? (sapStats.bonusMeleeDamage || 0) : 0,
      bonusRangedDamage: sapStats ? (sapStats.bonusRangedDamage || 0) : 0,
      bonusMagicDamage: sapStats ? (sapStats.bonusMagicDamage || 0) : 0,
      collisionBonus: sapStats ? (sapStats.collisionBonus || 0) : 0,
      initialShield: sapStats ? sapStats.initialShield : 0,
      critRate: sapStats ? (sapStats.critRate || 20) : 20,
      supportPower: sapStats ? (sapStats.supportPower ?? 25) : 25,
      skillLevels: sapProg ? (sapProg.skillLevels || {}) : {},
      spellIds: sapidaeClassDef.spells,
      scale: 1.05,
      isSapidae: true,
      ...(primaryHeroPos.facing !== undefined ? { initialFacing: primaryHeroPos.facing } : {}),
      customization: sapidaeCustomization,
      equipped: this.equipmentManager ? (this.equipmentManager.equipped.sapidae || this.equipmentManager.equipped.kotaro || {}) : {},
      sapidaeClass: sapidaeClassKey
    }, this.gridManager, this.sceneManager, this.audio));

    // 2. Setup Companion Axie & allies adjacent to the Sapidae
    const candidateOffsets = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 1, dz: 1 },
      { dx: -1, dz: 1 },
      { dx: 0, dz: -1 }
    ];

    config.heroPositions.forEach((hp) => {
      const heroId = hp.id;
      const baseInfo = this.equipmentManager.heroesBase[heroId] || {};
      const stats = this.equipmentManager.getCalculatedStats(heroId);
      const prog = this.equipmentManager.getProgression(heroId);
      const heroMeta = HERO_CONFIGS[heroId] || { type: heroId, scale: 1.0 };
      const isAxie = baseInfo.modelType === 'axie' || Boolean(baseInfo.axieId);

      let spawnX = hp.x;
      let spawnZ = hp.z;

      // Prevent companion from overlapping the Sapidae
      if (spawnX === primaryHeroPos.x && spawnZ === primaryHeroPos.z) {
        for (const off of candidateOffsets) {
          const cx = primaryHeroPos.x + off.dx;
          const cz = primaryHeroPos.z + off.dz;
          if (cx >= 0 && cx < this.gridManager.width && cz >= 0 && cz < this.gridManager.height) {
            const tile = this.gridManager.getTile(cx, cz);
            const occupied = this.units.some(u => u.gridX === cx && u.gridZ === cz) ||
                             (config.enemies && config.enemies.some(e => e.x === cx && e.z === cz)) ||
                             (config.obstacles && config.obstacles.some(o => o.x === cx && o.z === cz));
            if (tile && tile.walkable && !tile.obstacle && !occupied) {
              spawnX = cx;
              spawnZ = cz;
              break;
            }
          }
        }
      }

      this.units.push(new Unit({
        id: heroId,
        name: baseInfo.name,
        archetype: baseInfo.archetype,
        type: isAxie ? 'axie' : heroMeta.type,
        modelType: baseInfo.modelType || (isAxie ? 'axie' : heroMeta.type),
        axieId: baseInfo.axieId || null,
        genes: baseInfo.genes || null,
        team: 'player',
        x: spawnX,
        z: spawnZ,
        maxHP: stats.maxHP,
        currentHP: startHP(heroId),
        maxPA: stats.maxPA,
        maxPM: stats.maxPM,
        // Iniciativa real (clase + nivel + equipo). En el tutorial se fija a 85 para que el Axie actúe justo tras el Sapidae.
        initiative: config.isTutorial ? 85 : (stats.initiative || 85),
        axieClass: baseInfo.class || null,
        bonusDamage: stats.bonusDamage,
        bonusMeleeDamage: stats.bonusMeleeDamage || 0,
        bonusRangedDamage: stats.bonusRangedDamage || 0,
        bonusMagicDamage: stats.bonusMagicDamage || 0,
        collisionBonus: stats.collisionBonus || 0,
        initialShield: stats.initialShield,
        critRate: stats.critRate || 0,
        supportPower: stats.supportPower || 0,
        skillLevels: prog ? prog.skillLevels : {},
        // Cartas de partes reales (Fase 4). En el tutorial también, con un ataque cuerpo a cuerpo en la ranura [1]
        // (el paso 6 pide la [1]); si el Axie no tiene ninguno, usa los hechizos de siempre.
        spellIds: (isAxie && (config.isTutorial ? tutorialCardOrder(this.partsResolver?.idsFor(baseInfo)) : this.partsResolver?.idsFor(baseInfo))) || (heroId === 'kotaro' ? (baseInfo.spellIds || getHeroSpells(baseInfo.heroKey || baseInfo.axieId)) : HERO_SPELLS[heroId]) || ['kotaro_slash'],
        scale: isAxie ? 0.88 : heroMeta.scale,
        ...(hp.facing !== undefined ? { initialFacing: hp.facing } : {})
      }, this.gridManager, this.sceneManager, this.audio));
      // Partes de colección especial del Axie → VFX propio al lanzar esas cartas (combat/CollectionVFX.js)
      if (isAxie && this.partsResolver) this.units[this.units.length - 1].partCollections = this.partsResolver.collectionsFor(baseInfo);
    });

    // Setup Enemies
    config.enemies.forEach(e => {
      this.units.push(new Unit({
        id: e.id,
        name: e.name,
        type: e.type,
        team: 'enemy',
        x: e.x,
        z: e.z,
        maxHP: e.maxHP,
        maxPA: e.maxPA,
        maxPM: e.maxPM,
        initiative: e.initiative,
        initialShield: e.initialShield || 0,
        bonusDamage: e.bonusDamage || 0,
        scale: e.scale,
        tintColor: e.tintColor || null,
        axieClass: e.axieClass || null, // clase elemental opcional del enemigo (triángulo ±15 %)
        spellIds: e.spellIds,
        ...(e.facing !== undefined ? { initialFacing: e.facing } : {})
      }, this.gridManager, this.sceneManager, this.audio));
    });

    // Runas y charms de los Axies (RuneCharmEffects): vida, iniciativa, PM, escudo inicial y cartas modificadas.
    // Antes de fijar el orden de turnos (la iniciativa cuenta). El tutorial no las aplica: su guion es fijo.
    this.spellManager.runeCharms.setupCombat(this.units, {
      loadoutOf: (heroId) => RuneCharmService.get(heroId),
      enabled: !config.isTutorial,
    });

    await Promise.all(this.units.map(u => u.loadModel()));

    // Automatically request 3D portraits for all units participating in this battle without touching their live mesh
    this.units.forEach(u => {
      const portraitKey = (u.config && u.config.axieId) ? u.config.axieId : (u.type || u.id);
      if (!portraitService.hasPortrait(portraitKey)) {
        portraitService.getPortrait(portraitKey);
      }
    });

    // Turnos alternados jugador/enemigo según la iniciativa; el tutorial mantiene el orden de siempre (Sapidae y luego Axie)
    this.turnManager.alternateTeams = !config.isTutorial;
    this.turnManager.setUnits(this.units);

    // Duo Ultimate: la decide la clase del Axie principal (squad[1]); exige vínculo al 100 % al entrar
    const squadForUlt = typeof this.equipmentManager.getSquad === 'function' ? this.equipmentManager.getSquad() : [];
    const mainHeroId = squadForUlt[1] || null;
    this.spellManager.ultimates.setupCombat({
      units: this.units,
      mainHeroId,
      bond: mainHeroId ? BondService.get(mainHeroId) : 0,
      isTutorial: Boolean(config.isTutorial),
    });

    if (config.isTutorial) {
      this.turnManager.startCombat();
      this.tutorialManager.startTutorial();
    } else {
      this.tutorialManager.completeTutorial();
      this.turnManager.startCombat();
    }
  }

  _setupTurnCallbacks() {
    this.turnManager.onTurnChange = (activeUnit, queue, round, meta = {}) => {
      this.activeUnit = activeUnit;
      this._clearSpellSelection();
      this._updateTimelineUI(queue);
      this._updateHUD(activeUnit);
      this._showTurnBanner(activeUnit);

      document.getElementById('round-number').textContent = round;

      // Aturdido o dormido: el TurnManager pasa el turno solo; no hay IA ni casillas de movimiento
      if (meta.skipped) {
        this.gridManager.clearHighlights();
        return;
      }

      if (activeUnit.team === 'player') {
        if (this.tutorialManager.isActive) {
          this.tutorialManager._renderStep();
        }
        this._refreshMovementHighlights();
      } else {
        this.gridManager.clearHighlights();
        this.ai.executeTurn(activeUnit);
      }
    };

    this.turnManager.onVictory = async () => {
      this._writeBackSquadHP();
      this._cleanCombatUIForEnd();
      // 1. Brief pause for last enemy's finisher impact sound and camera shake
      await new Promise(r => setTimeout(r, 450));

      const config = this.activeBattleConfig || LEVELS_CONFIG[this.currentLevel] || LEVELS_CONFIG[1];

      // Mark level as completed and unlock next level if campaign level
      if (typeof this.currentLevel === 'number') {
        this.equipmentManager.completeLevel(this.currentLevel);
      }

      // 2. Transición de cierre (Lunakai UI): bandas de cine, luna y «VICTORIA»
      this.audio.playVictoryFanfare();
      if (this.audio && typeof this.audio.playVictoryMusic === 'function') {
        this.audio.playVictoryMusic();
      }
      await this.combatBanner.play('victory', { subtitle: [config.title, config.biomeName].filter(Boolean).join(' · ') });

      // 3. El título se disuelve mientras la cámara vuelve y entra el panel
      this.sceneManager.restoreCamera();
      await this.combatBanner.hide();

      // 5. Pantalla de victoria (Lunakai UI · etapa 3)
      if (config.isTutorial) {
        this.tutorialManager.completeTutorial();
      }

      // Nuevos aliados
      const recruits = [];
      if (config.rewardRecruits && config.rewardRecruits.length > 0) {
        config.rewardRecruits.forEach(heroId => {
          this.equipmentManager.unlockHero(heroId);
          const h = this.equipmentManager.heroesBase[heroId];
          const { url, portraitKey } = this._getHeroPortrait(heroId, h);
          recruits.push({ name: h ? h.name : heroId, sub: h ? h.archetype : 'Aliado de Lunacia', cls: this._heroClassKey(h), portraitUrl: url, portraitKey });
        });
      }

      // Experiencia del escuadrón (se guarda el estado previo para pintar lo ganado)
      const baseExp = config.rewardExp || (60 + (typeof this.currentLevel === 'number' ? this.currentLevel : 1) * 30);
      // El principal del escuadrón gana el 100 %; el Sapidae y los apoyos, el 60 %.
      // La unidad del Sapidae en combate se llama 'sapidae_hero', pero su progreso vive en 'sapidae'.
      const squadIds = typeof this.equipmentManager.getSquad === 'function' ? this.equipmentManager.getSquad() : [];
      const activeHero = squadIds[1] || this.selectedHeroId || 'kotaro';
      const participatingHeroIds = [...new Set(this.units
        .filter(u => u.team === 'player')
        .map(u => (u.id === 'sapidae_hero' ? 'sapidae' : u.id)))];
      const before = {};
      participatingHeroIds.forEach(hId => {
        const prog = this.equipmentManager.getProgression(hId);
        before[hId] = { level: prog.level, exp: prog.currentExp, req: this.equipmentManager.getRequiredExp(prog.level) };
      });
      const expResults = this.equipmentManager.addExpToSquad(activeHero, baseExp, participatingHeroIds);
      const squad = Object.entries(expResults).map(([hId, res]) => {
        const h = this.equipmentManager.heroesBase[hId];
        const b = before[hId];
        const isMain = (hId === activeHero);
        const { url, portraitKey } = this._getHeroPortrait(hId, h);
        return {
          id: hId,
          name: h ? h.name : hId,
          sub: this._heroSubtitle(h),
          isMain,
          isSapidae: Boolean(h && h.isSapidae),
          cls: this._heroClassKey(h),
          level: res.currentLevel,
          levelsGained: res.levelsGained,
          gain: Math.floor(baseExp * this.equipmentManager.getExpShare(hId, activeHero)),
          basePct: res.levelsGained > 0 || !b ? 0 : expPct(b.exp, b.req),
          afterPct: expPct(res.currentExp, res.requiredExp),
          portraitUrl: url,
          portraitKey
        };
      });

      // Botín
      const lootIds = (config.rewardItems || []).filter(id => ITEMS_DB[id]);
      // Axie Care: cada victoria da comida para el compañero (una baya; a veces un pastelito)
      if (!config.isTutorial) {
        if (ITEMS_DB.food_berry) lootIds.push('food_berry');
        if (ITEMS_DB.food_rice_cake && Math.random() < 0.25) lootIds.push('food_rice_cake');
      }
      if (lootIds.length > 0) {
        this.equipmentManager.addItemsToInventory(lootIds);
      }

      // Valoración y resumen con datos reales del combate
      const allies = this.units.filter(u => u.team === 'player');
      const foes = this.units.filter(u => u.team === 'enemy');
      const rounds = this.turnManager.round || 1;
      const alliesKO = allies.filter(u => u.isDead).length;
      const hpNow = allies.reduce((t, u) => t + Math.max(0, u.currentHP || 0), 0);
      const hpMax = allies.reduce((t, u) => t + (u.maxHP || 0), 0);

      this.endScreen.showVictory({
        subtitle: [config.title, config.biomeName, `${rounds} ${rounds === 1 ? 'ronda' : 'rondas'}`].filter(Boolean).join(' · '),
        moons: [
          { label: 'Victoria', on: true },
          { label: 'Ningún aliado K.O.', on: alliesKO === 0 },
          { label: 'En 3 rondas o menos', on: rounds <= 3 }
        ],
        squad,
        recruits,
        loot: lootIds.map(id => ITEMS_DB[id]),
        summary: [
          ['Rondas', String(rounds)],
          ['Enemigos derrotados', String(foes.filter(u => u.isDead).length)],
          ['Aliados K.O.', String(alliesKO)],
          ['Vida del escuadrón', `${hpMax > 0 ? Math.round((hpNow / hpMax) * 100) : 0}%`]
        ]
      });

      this.lastBattleOutcome = 'VICTORY';
    };

    this.turnManager.onDefeat = async () => {
      this._writeBackSquadHP();
      this._cleanCombatUIForEnd();
      this.sceneManager.shake(0.5);
      await new Promise(r => setTimeout(r, 800));

      // Transición de cierre (Lunakai UI): el tablero pierde el color, la luna se agrieta y «DERROTA»
      this.audio.playDefeat();
      if (this.audio && typeof this.audio.playDefeatMusic === 'function') {
        this.audio.playDefeatMusic();
      }
      await this.combatBanner.play('defeat', { subtitle: 'Tus héroes han caído en Lunacia' });
      this.sceneManager.restoreCamera();
      await this.combatBanner.hide();

      // Pantalla de derrota (Lunakai UI · etapa 3)
      const config = this.activeBattleConfig || LEVELS_CONFIG[this.currentLevel] || LEVELS_CONFIG[1];
      const squadIds = typeof this.equipmentManager.getSquad === 'function' ? this.equipmentManager.getSquad() : [];
      const activeHero = squadIds[1] || this.selectedHeroId || 'kotaro';
      const allies = this.units.filter(u => u.team === 'player');
      const foesAlive = this.units.filter(u => u.team === 'enemy' && !u.isDead);
      const squad = allies.map(u => {
        const hid = u.id === 'sapidae_hero' ? 'sapidae' : u.id;
        const h = this.equipmentManager.heroesBase[hid];
        const prog = this.equipmentManager.getProgression(hid);
        const { url, portraitKey } = this._getHeroPortrait(hid, h);
        return {
          id: hid,
          name: h ? h.name : (u.name || u.id),
          sub: this._heroSubtitle(h),
          isMain: u.id === activeHero,
          isSapidae: Boolean(h && h.isSapidae),
          cls: this._heroClassKey(h),
          level: prog.level,
          levelsGained: 0,
          gain: 0,
          basePct: expPct(prog.currentExp, this.equipmentManager.getRequiredExp(prog.level)),
          afterPct: 0,
          portraitUrl: url,
          portraitKey
        };
      });

      // Consejos a partir del estado real del escuadrón
      const hints = [];
      allies.forEach(u => {
        const h = this.equipmentManager.heroesBase[u.id];
        const prog = this.equipmentManager.getProgression(u.id);
        const name = h ? h.name : u.id;
        if (prog.unspentStatPoints > 0) {
          hints.push({ icon: 'upgrade', html: `<b>${name} tiene ${prog.unspentStatPoints} ${prog.unspentStatPoints === 1 ? 'punto' : 'puntos'} de estadística sin asignar.</b> Repártelos en la Mochila <b>I</b> antes de volver.` });
        }
      });
      allies.forEach(u => {
        const eq = this.equipmentManager.equipped ? this.equipmentManager.equipped[u.id] : null;
        if (!eq) return;
        const empty = Object.values(eq).filter(v => !v).length;
        if (empty > 0) {
          const h = this.equipmentManager.heroesBase[u.id];
          hints.push({ icon: 'equipable', html: `<b>${h ? h.name : u.id} tiene ${empty} ${empty === 1 ? 'ranura' : 'ranuras'} de equipo ${empty === 1 ? 'vacía' : 'vacías'}.</b> Equípale objetos desde la Mochila <b>I</b>.` });
        }
      });
      if (foesAlive.length > 0) {
        const names = [...new Set(foesAlive.map(u => u.name))].join(', ');
        hints.push({ icon: 'swords', html: `<b>${foesAlive.length === 1 ? 'Sigue en pie' : `Siguen en pie ${foesAlive.length} enemigos`}:</b> ${names}. Gana experiencia en combates más sencillos y vuelve con más nivel.` });
      }

      let endSubtitle = 'El escuadrón se repliega al dojo';
      if (foesAlive.length === 1) {
        endSubtitle += ` · ${foesAlive[0].name} sobrevive con ${Math.max(0, Math.round(foesAlive[0].currentHP || 0))} de vida`;
      } else if (foesAlive.length > 1) {
        endSubtitle += ` · ${foesAlive.length} enemigos siguen en pie`;
      }

      this.endScreen.showDefeat({
        subtitle: endSubtitle,
        squad,
        lostLoot: (config.rewardItems || []).filter(id => ITEMS_DB[id]).map(id => ITEMS_DB[id]),
        hints: hints.slice(0, 4)
      });

      this.lastBattleOutcome = 'DEFEAT';
    };
  }

  /**
   * Fin del combate (18-oct): antes del cartel de VICTORIA / DERROTA se retira toda la UI del combate
   * (cabecera, barra de hechizos y turnos, Ultimate, registro, previsión, tooltips, marcas del tablero,
   * barras de vida sobre las unidades y textos flotantes). Reintentar o el siguiente nivel la vuelven a mostrar.
   */
  _cleanCombatUIForEnd() {
    try {
      this._clearSpellSelection?.();
      this._hideForecast?.();
      this.gridManager.clearHighlights();
      this.hoverCell = null;
      this.combatText?.clear?.();
      document.getElementById('turn-banner')?.classList.add('hidden');
      (this.units || []).forEach((u) => { if (u.hudSprite) u.hudSprite.visible = false; });
      this._showBattleHUD(false);
      // Se mantiene el modo combate (el HUD del mundo abierto sigue oculto) y se ocultan el registro y el aviso de turno
      document.body.classList.add('state-combat', 'state-combat-ended');
      ['lk-cb-log', 'lk-cb-enemy'].forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    } catch (e) { console.warn('[Lunakai] Limpiar UI de combate', e); }
  }

  /**
   * Vida persistente (18-oct): al terminar el combate se guarda la vida que le queda a cada héroe.
   * Quien cayó vuelve al mundo abierto con 1 de vida (tras una derrota, el escuadrón despierta en el dojo).
   */
  _writeBackSquadHP() {
    if (!this._battleUsesPersistentHP || !this.equipmentManager) return;
    this.units.filter((u) => u.team === 'player').forEach((u) => {
      const heroId = u.id === 'sapidae_hero' ? 'sapidae' : u.id;
      // La vida extra de runas y charms solo existe en combate: se descuenta al volver al mundo abierto
      const hp = (u.isDead || !(u.currentHP > 0)) ? 1 : Math.max(1, u.currentHP - (u._rcHpDelta || 0));
      this.equipmentManager.setCurrentHP(heroId, hp, { silent: true });
    });
    this._battleUsesPersistentHP = false;
  }

  /** Clave de clase del héroe para el color del retrato (beast, plant, bird…). */
  _heroClassKey(h) {
    const c = (h && h.class ? String(h.class) : '').toLowerCase();
    return ['beast', 'plant', 'aquatic', 'bird', 'reptile', 'bug', 'mech', 'dawn', 'dusk'].includes(c) ? c : null;
  }

  /** Subtítulo del héroe en las pantallas de fin de combate. */
  _heroSubtitle(h) {
    if (!h) return 'Aliado de Lunacia';
    if (h.isSapidae) return `Sapidae · ${h.class || 'Líder'}`;
    return [h.axieId ? `#${h.axieId}` : null, h.class].filter(Boolean).join(' · ');
  }

  _openEquipmentScreen() {
    const screen = document.getElementById('equipment-screen');
    screen.classList.remove('hidden');
    this._updateActiveMissionBar();
    this._renderCampRoster();
    this._renderCampHeroDetails(this.selectedHeroId);
    this._renderCampInventory();
    this._renderCampMissionMap();
  }

  _getHeroPortrait(heroId, heroBase = null) {
    const h = heroBase || (this.equipmentManager?.heroesBase ? this.equipmentManager.heroesBase[heroId] : null);
    const portraitKey = h?.axieId || h?.heroKey || heroId;
    let url = h?.image || portraitService.getPortraitSync(portraitKey) || portraitService.getPortraitSync(heroId);
    if (!url && h?.name) {
      const cleanDash = h.name.toLowerCase().replace(/\s+/g, '-');
      const cleanUnder = h.name.toLowerCase().replace(/\s+/g, '_');
      url = portraitService.getPortraitSync(cleanDash) || portraitService.getPortraitSync(cleanUnder);
    }
    if (!url && heroId === (this.selectedHeroId || 'kotaro') && this.overworldManager?.player?.axieId) {
      url = portraitService.getPortraitSync(this.overworldManager.player.axieId);
    }
    return { url, portraitKey, hero: h };
  }

  _renderCampRoster() {
    const container = document.getElementById('hero-roster-list');
    container.innerHTML = '';

    if (!this.equipmentManager.isHeroUnlocked(this.selectedHeroId)) {
      this.selectedHeroId = (this.equipmentManager.unlockedHeroes && this.equipmentManager.unlockedHeroes[0]) || 'kotaro';
    }

    const heroIds = this.equipmentManager.unlockedHeroes && this.equipmentManager.unlockedHeroes.length > 0
      ? this.equipmentManager.unlockedHeroes
      : ['kotaro'];

    heroIds.forEach(id => {
      const base = this.equipmentManager.heroesBase[id];
      if (!base) return;

      const card = document.createElement('div');
      card.className = 'roster-card' + (this.selectedHeroId === id ? ' active' : '');

      const { url } = this._getHeroPortrait(id, base);
      const avatarContent = url 
        ? `<img src="${url}" alt="${base.name}">` 
        : base.avatar;

      card.innerHTML = `
        <div class="roster-avatar">${avatarContent}</div>
        <div>
          <div class="roster-name">${base.name}</div>
          <div class="roster-role">${base.archetype}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.audio.init();
        this.selectedHeroId = id;
        this._renderCampRoster();
        this._renderCampHeroDetails(id);
      });

      container.appendChild(card);
    });
  }

  _renderCampHeroDetails(heroId) {
    const base = this.equipmentManager.heroesBase[heroId];
    const { url } = this._getHeroPortrait(heroId, base);
    const eqAvatarEl = document.getElementById('eq-hero-avatar');
    if (url) {
      eqAvatarEl.innerHTML = `<img src="${url}" alt="${base.name}">`;
    } else {
      eqAvatarEl.textContent = base.avatar;
    }
    document.getElementById('eq-hero-name').textContent = base.name;
    document.getElementById('eq-hero-archetype').textContent = base.archetype;

    const stats = this.equipmentManager.getCalculatedStats(heroId);
    document.getElementById('stat-hp').textContent = stats.maxHP;
    document.getElementById('stat-pa').textContent = stats.maxPA;
    document.getElementById('stat-pm').textContent = stats.maxPM;
    document.getElementById('stat-damage').textContent = '+' + stats.bonusDamage;
    document.getElementById('stat-shield').textContent = '+' + stats.initialShield;
    document.getElementById('stat-init').textContent = stats.initiative;

    // Render 5 equipment slots
    const slots = ['weapon', 'hat', 'shield', 'body', 'boots'];
    const equipped = this.equipmentManager.getEquipped(heroId);

    slots.forEach(slot => {
      const box = document.getElementById('slot-' + slot);
      const parentBox = box.closest('.slot-box');
      const itemId = equipped ? equipped[slot] : null;

      if (itemId && ITEMS_DB[itemId]) {
        const item = ITEMS_DB[itemId];
        parentBox.classList.add('has-item');
        box.innerHTML = `
          <div class="slot-equipped-item">
            <span>${item.icon}</span>
            <span class="slot-item-title">${item.name}</span>
            <span class="slot-unequip-hint">(Unequip)</span>
          </div>
        `;
        box.onclick = () => {
          this.audio.playStep();
          this.equipmentManager.unequipItem(heroId, slot);
          this._renderCampHeroDetails(heroId);
          this._renderCampInventory();
        };
      } else {
        parentBox.classList.remove('has-item');
        box.innerHTML = `<span class="slot-empty">+ Equip ${slot}</span>`;
        box.onclick = null;
      }
    });
  }

  _renderCampInventory() {
    const container = document.getElementById('inventory-grid');
    container.innerHTML = '';
    const inv = this.equipmentManager.inventory;
    document.getElementById('inv-count').textContent = inv.length + ' items';

    if (inv.length === 0) {
      container.innerHTML = '<div style="color: #64748b; font-size: 12px; padding: 12px;">Backpack is empty. All items are equipped.</div>';
      return;
    }

    inv.forEach(itemId => {
      const item = ITEMS_DB[itemId];
      if (!item) return;

      const card = document.createElement('div');
      card.className = 'item-card rarity-' + item.rarity;

      let statBadges = '';
      if (item.stats.damage) statBadges += `<span class="stat-badge">+${item.stats.damage} Damage</span>`;
      if (item.stats.hp) statBadges += `<span class="stat-badge">+${item.stats.hp} HP</span>`;
      if (item.stats.pm) statBadges += `<span class="stat-badge">+${item.stats.pm} MP</span>`;
      if (item.stats.pa) statBadges += `<span class="stat-badge">+${item.stats.pa} AP</span>`;
      if (item.stats.shield) statBadges += `<span class="stat-badge">+${item.stats.shield} Shield</span>`;
      if (item.stats.initiative) statBadges += `<span class="stat-badge">+${item.stats.initiative} Init</span>`;

      card.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${item.icon}</span>
          <span class="item-name">${item.name}</span>
        </div>
        <span class="item-slot-tag">${item.slot} • Click to equip on ${this.equipmentManager.heroesBase[this.selectedHeroId].name}</span>
        <div class="item-stats-badges">${statBadges}</div>
      `;

      card.addEventListener('click', () => {
        this.audio.playBuff();
        this.equipmentManager.equipItem(this.selectedHeroId, item.slot, item.id);
        this._renderCampHeroDetails(this.selectedHeroId);
        this._renderCampInventory();
      });

      container.appendChild(card);
    });
  }

  _updateActiveMissionBar() {
    const cfg = this.activeBattleConfig || LEVELS_CONFIG[this.equipmentManager.selectedLevelId];
    const barTitle = document.getElementById('active-mission-title');
    if (barTitle && cfg) {
      barTitle.textContent = cfg.title ? `${cfg.title}` : `Level ${this.equipmentManager.selectedLevelId}`;
    }
  }

  _renderCampMissionMap() {
    const container = document.getElementById('campaign-nodes-grid');
    if (!container) return;
    container.innerHTML = '';

    const progressCount = document.getElementById('map-progress-count');
    if (progressCount) {
      progressCount.textContent = `${this.equipmentManager.completedLevels.length} / 10 Missions`;
    }

    for (let lvl = 1; lvl <= 10; lvl++) {
      const cfg = LEVELS_CONFIG[lvl];
      if (!cfg) continue;

      const isCompleted = this.equipmentManager.isLevelCompleted(lvl);
      const isUnlocked = this.equipmentManager.isLevelUnlocked(lvl);
      const isSelected = this.equipmentManager.selectedLevelId === lvl;

      const card = document.createElement('div');
      let statusClass = 'locked';
      let statusLabel = '🔒 Locked';
      let statusBadgeClass = 'status-locked';

      if (isCompleted) {
        statusClass = 'completed';
        statusLabel = '✓ Cleared';
        statusBadgeClass = 'status-completed';
      } else if (isUnlocked) {
        statusClass = 'unlocked';
        statusLabel = '⚔️ Available';
        statusBadgeClass = 'status-unlocked';
      }

      if (isSelected) {
        statusClass += ' active';
        statusLabel = '★ Target';
        statusBadgeClass = 'status-active';
      }

      card.className = `mission-node-card ${statusClass}`;

      // Enemies preview badges
      const enemiesHTML = cfg.enemies.map(e => `<span class="node-enemy-pill">${e.name} (${e.maxHP} HP)</span>`).join('');

      // Rewards text
      let rewardsText = '';
      if (cfg.rewardRecruits && cfg.rewardRecruits.length > 0) {
        const recruitsNames = cfg.rewardRecruits.map(r => this.equipmentManager.heroesBase[r] ? this.equipmentManager.heroesBase[r].name : r).join(', ');
        rewardsText += `✨ Hero: ${recruitsNames} `;
      }
      if (cfg.rewardItems && cfg.rewardItems.length > 0) {
        rewardsText += `🎁 ${cfg.rewardItems.length} Items`;
      }
      if (!rewardsText) {
        rewardsText = '🏆 Glory in Lunacia';
      }

      // Button
      let btnHTML = '';
      if (isSelected) {
        btnHTML = `<button class="node-select-btn btn-selected">★ Selected Mission</button>`;
      } else if (isUnlocked) {
        btnHTML = `<button class="node-select-btn btn-choose">Select Mission</button>`;
      } else {
        btnHTML = `<button class="node-select-btn btn-locked" disabled>🔒 Locked</button>`;
      }

      card.innerHTML = `
        <div class="node-header">
          <span class="node-lvl-tag">Level ${lvl}</span>
          <span class="node-status-badge ${statusBadgeClass}">${statusLabel}</span>
        </div>
        <div class="node-title-group">
          <h4 class="node-title">${cfg.biomeIcon} ${cfg.title}</h4>
          <span class="node-subtitle">${cfg.subtitle}</span>
        </div>
        <div class="node-biome-tag">
          <span>${cfg.biomeIcon} ${cfg.biomeName}</span>
        </div>
        <div class="node-meta-row">
          <span class="node-matchup">${cfg.badgeText}</span>
        </div>
        <div class="node-enemies-row">
          ${enemiesHTML}
        </div>
        <div class="node-rewards-row">
          <span class="node-rewards-label">REWARD:</span>
          <span>${rewardsText}</span>
        </div>
        ${btnHTML}
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.audio.playStep();
          this.equipmentManager.selectedLevelId = lvl;
          this._updateActiveMissionBar();
          this._renderCampMissionMap();
        });
      }

      container.appendChild(card);
    }
  }

  _updateTimelineUI(queue) {
    const container = document.getElementById('initiative-timeline');
    container.innerHTML = '';

    queue.forEach(unit => {
      if (unit.isDead) return;
      const card = document.createElement('div');
      card.className = 'timeline-card team-' + unit.team + (unit === this.activeUnit ? ' active-turn' : '');

      let avatar = '⚔️';
      if (unit.type === 'bing') avatar = '🐶';
      else if (unit.type === 'pomodoro') avatar = '🍳';
      else if (unit.type.includes('werewolf') || unit.type.includes('wolf')) avatar = '🐺';
      else if (unit.type.includes('bear')) avatar = '🐻';
      else if (unit.type.includes('dryad')) avatar = '🧚';
      else if (unit.type.includes('treant')) avatar = '🌲';
      else if (unit.type.includes('slime')) avatar = '🟢';
      else if (unit.type.includes('brawler') || unit.type === 'buba') avatar = '🥊';
      else if (unit.type.includes('stalker') || unit.type === 'fox') avatar = '🦊';
      else if (unit.type === 'sapidae') avatar = unit.modelType?.includes('f') ? '👩‍🌾' : '🧑‍🌾';
      else if (unit.type.includes('shaman')) avatar = '🔮';

      const portraitKey = (unit.config && unit.config.axieId) ? unit.config.axieId : (unit.modelType || unit.type || unit.id);
      const portraitUrl = portraitService.getPortraitSync(portraitKey) || 
                          portraitService.getPortraitSync(unit.type) || 
                          portraitService.getPortraitSync(unit.id) || 
                          (unit.team === 'player' ? (portraitService.getPortraitSync('shinji') || portraitService.getPortraitSync('kotaro')) : null);
      if (!portraitUrl) {
        portraitService.getPortrait(portraitKey);
      }

      const hpPercent = Math.max(0, Math.min(100, (unit.currentHP / unit.maxHP) * 100));

      const avatarContent = portraitUrl
        ? `<img class="timeline-avatar-img" src="${portraitUrl}" alt="${unit.name}">`
        : `<span class="timeline-avatar-fallback">${avatar}</span>`;

      card.innerHTML = 
        '<span class="card-avatar">' + avatarContent + '</span>' +
        '<div class="card-info">' +
          '<span class="card-name">' + unit.name + '</span>' +
          '<div class="card-hp-bar">' +
            '<div class="card-hp-fill" style="width: ' + hpPercent + '%;"></div>' +
          '</div>' +
        '</div>';
      container.appendChild(card);
    });
  }

  _updateHUD(unit) {
    if (!unit) return;
    document.getElementById('unit-name').textContent = unit.name;
    let archetype = unit.archetype || (unit.config && unit.config.archetype);
    let avatar = '⚔️';
    if (!archetype) {
      if (unit.type === 'bing') { archetype = 'Beast Axie (Morale Support)'; avatar = '🐶'; }
      else if (unit.type === 'pomodoro') { archetype = 'Bug Axie (Shield Guardian)'; avatar = '🍳'; }
      else if (unit.type === 'werewolf-boss' || unit.type.includes('werewolf')) { archetype = 'Supreme Chimera Boss'; avatar = '🐺'; }
      else if (unit.type.includes('bear')) { archetype = 'Colossal Bear Chimera'; avatar = '🐻'; }
      else if (unit.type.includes('wolf')) { archetype = 'Hunter Wolf Chimera'; avatar = '🐺'; }
      else if (unit.type.includes('dryad')) { archetype = 'Arcane Mystic Dryad'; avatar = '🧚'; }
      else if (unit.type.includes('treant')) { archetype = 'Ancient Botanical Treant'; avatar = '🌲'; }
      else if (unit.type.includes('slime')) { archetype = 'Slime Chimera'; avatar = '🟢'; }
      else if (unit.type.includes('brawler') || unit.type === 'buba') { archetype = 'Assault Beast'; avatar = '🥊'; }
      else if (unit.type === 'sapidae') { archetype = unit.archetype || 'Sapidae Adventurer'; avatar = unit.modelType?.includes('f') ? '👩‍🌾' : '🧑‍🌾'; }
      else if (unit.type.includes('shaman')) { archetype = 'Botanical Shaman'; avatar = '🔮'; }
      else { archetype = 'Beast Axie (Melee Duelist)'; }
    }

    document.getElementById('unit-archetype').textContent = archetype;
    const avatarEl = document.getElementById('unit-avatar');
    const portraitKey = (unit.config && unit.config.axieId) ? unit.config.axieId : (unit.modelType || unit.type || unit.id);
    const portraitUrl = portraitService.getPortraitSync(portraitKey) || 
                        portraitService.getPortraitSync(unit.type) || 
                        portraitService.getPortraitSync(unit.id) || 
                        (unit.team === 'player' ? (portraitService.getPortraitSync('shinji') || portraitService.getPortraitSync('kotaro')) : null);
    if (portraitUrl) {
      avatarEl.innerHTML = `<img class="tactical-hud-avatar-img" src="${portraitUrl}" alt="${unit.name}">`;
    } else {
      avatarEl.textContent = avatar;
    }

    const safeHP = (typeof unit.currentHP === 'number' && !isNaN(unit.currentHP)) ? Math.max(0, unit.currentHP) : 0;
    const safeMaxHP = (typeof unit.maxHP === 'number' && !isNaN(unit.maxHP) && unit.maxHP > 0) ? unit.maxHP : 1;
    const hpPercent = Math.max(0, Math.min(100, (safeHP / safeMaxHP) * 100));
    document.getElementById('hud-hp-fill').style.width = hpPercent + '%';
    document.getElementById('hud-hp-text').textContent = safeHP + ' / ' + safeMaxHP;

    document.getElementById('hud-pa-count').textContent = unit.currentPA + ' / ' + unit.maxPA;
    document.getElementById('hud-pm-count').textContent = unit.currentPM + ' / ' + unit.maxPM;

    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById('spell-slot-' + i);
      const spellId = unit.spellIds[i];
      if (spellId) {
        const spell = this.spellManager.getSpell(spellId, unit);
        if (!spell) {
          console.warn(`[AxieTacticsGame] Spell '${spellId}' not found for unit '${unit.name}', skipping slot ${i}`);
          slot.style.display = 'none';
          continue;
        }
        slot.style.display = 'flex';
        slot.querySelector('.pa-cost-badge').textContent = this.spellManager.getSpellCost(unit, spell) + ' AP';
        const iconEl = slot.querySelector('.spell-icon');
        if (spell.icon && (spell.icon.includes('/') || spell.icon.endsWith('.png') || spell.icon.endsWith('.webp'))) {
          iconEl.innerHTML = `<img src="${spell.icon}" alt="${spell.name || 'Habilidad'}" class="spell-img-icon">`;
        } else {
          iconEl.textContent = spell.icon || '⚔️';
        }
        slot.querySelector('.range-badge').textContent = (spell.minRange === spell.maxRange ? spell.minRange : spell.minRange + '-' + spell.maxRange) + ' RNG';

        if (unit.currentPA < this.spellManager.getSpellCost(unit, spell) || unit.team !== 'player' || this.activeUnit !== unit) {
          slot.classList.add('disabled');
        } else {
          slot.classList.remove('disabled');
        }
      } else {
        slot.style.display = 'none';
      }
    }
  }

  _showTurnBanner(unit) {
    const banner = document.getElementById('turn-banner');
    const title = document.getElementById('banner-title');
    const subtitle = document.getElementById('banner-subtitle');

    if (unit.team === 'player') {
      banner.className = 'turn-banner turn-player';
      subtitle.textContent = 'START OF';
      title.textContent = unit.name.toUpperCase() + "'S TURN";
    } else {
      banner.className = 'turn-banner turn-enemy';
      subtitle.textContent = 'ENEMY TURN';
      title.textContent = unit.name.toUpperCase();
    }

    banner.classList.remove('hidden');
    setTimeout(() => {
      banner.classList.add('hidden');
    }, 1500);
  }

  _refreshMovementHighlights() {
    if (this.selectedSpell) return;
    this.gridManager.clearHighlights();
    if (!this.activeUnit && this.turnManager) {
      this.activeUnit = this.turnManager.getActiveUnit() || this.units?.[0];
    }
    if (!this.activeUnit || this.activeUnit.team !== 'player') return;

    if (this.tutorialManager.isActive) {
      const step = this.tutorialManager.steps[this.tutorialManager.currentStep];
      if (!step || step.id === 'step_intro' || step.targetType === 'dialog' || step.targetType === 'waiting') {
        this.reachableCells = [];
        this.gridManager.clearHighlights();
        return;
      }
      if (step.id === 'step_move_1' || step.id === 'step_move_2') {
        if (this.activeUnit.currentPM > 0) {
          this.reachableCells = this.gridManager.getReachableCells(
            this.activeUnit.gridX,
            this.activeUnit.gridZ,
            this.activeUnit.currentPM,
            this.activeUnit
          );
          // Highlight ALL theoretical reachable cells in blue
          this.gridManager.highlightReachable(this.reachableCells);
          // Highlight designated target cell with golden halo and 3D bouncing arrow
          if (step.allowedCell) {
            this.gridManager.highlightHover(step.allowedCell.x, step.allowedCell.z, 0xffd700);
            if (this.tutorialManager.showArrowAt) {
              this.tutorialManager.showArrowAt(step.allowedCell.x, step.allowedCell.z);
            }
          }
        } else {
          this.reachableCells = [];
          if (this.tutorialManager.hideArrow) this.tutorialManager.hideArrow();
        }
        return;
      }
      // Any other tutorial step (spell select, attack, end turn): no movement highlights
      this.reachableCells = [];
      this.gridManager.clearHighlights();
      if (this.tutorialManager.hideArrow) this.tutorialManager.hideArrow();
      return;
    }

    if (this.activeUnit.currentPM > 0) {
      this.reachableCells = this.gridManager.getReachableCells(
        this.activeUnit.gridX,
        this.activeUnit.gridZ,
        this.activeUnit.currentPM,
        this.activeUnit
      );
      this.gridManager.highlightReachable(this.reachableCells);
    } else {
      this.reachableCells = [];
    }
  }

  _toggleSpellSelect(index) {
    if (!this.activeUnit || this.activeUnit.team !== 'player' || this.activeUnit.isMoving) return;

    if (this.tutorialManager.isActive && !this.tutorialManager.isSpellAllowed(index)) {
      this.audio.playCollision();
      return;
    }

    const spellId = this.activeUnit.spellIds[index];
    if (!spellId) return;

    const spell = this.spellManager.getSpell(spellId, this.activeUnit);
    if (!spell || !this.spellManager._canPay(this.activeUnit, spell)) return; // PA (con descuentos de charms) y usos por turno

    if (this.selectedSpellIndex === index) {
      this._clearSpellSelection();
    } else {
      this.selectedSpellIndex = index;
      this.selectedSpell = spell;

      for (let i = 0; i < 3; i++) {
        document.getElementById('spell-slot-' + i).classList.toggle('active', i === index);
      }

      this.validSpellCells = this.spellManager.getValidTargetCells(this.activeUnit, spell);
      this.gridManager.clearHighlights();
      this.gridManager.highlightSpellRange(this.validSpellCells);

      if (this.tutorialManager.isActive && this.tutorialManager.isSpellSelectionStep()) {
        this.tutorialManager.advanceStep();
      }
    }
  }

  /** Selecciona (o deselecciona) la Duo Ultimate (botón del medallón del HUD, tecla 7; índice ULTIMATE_SLOT). */
  _toggleUltimateSelect() {
    if (this.gameState !== 'BATTLE') return;
    if (!this.activeUnit || this.activeUnit.team !== 'player' || this.activeUnit.isMoving) return;
    const ult = this.spellManager.ultimates;
    const spell = ult.spell;
    if (!spell || !ult.canCast(this.activeUnit)) {
      this.audio.playCollision();
      return;
    }
    if (this.selectedSpellIndex === ULTIMATE_SLOT && this.selectedSpell?.isUltimate) {
      this._clearSpellSelection();
      return;
    }
    this.selectedSpellIndex = ULTIMATE_SLOT;
    this.selectedSpell = spell;
    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById('spell-slot-' + i);
      if (slot) slot.classList.remove('active');
    }
    this.validSpellCells = this.spellManager.getValidTargetCells(this.activeUnit, spell);
    this.gridManager.clearHighlights();
    this.gridManager.highlightSpellRange(this.validSpellCells);
    this._updateHUD(this.activeUnit);
  }

  _clearSpellSelection() {
    this.selectedSpell = null;
    this.selectedSpellIndex = -1;
    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById('spell-slot-' + i);
      if (slot) slot.classList.remove('active');
    }
    this._hideForecast();
    this._refreshMovementHighlights();
  }

  _handleHover() {
    if (this.turnManager?.isCombatOver) { this.hoverCell = null; return; } // fin del combate: el tablero ya no responde
    if (!this.activeUnit || this.activeUnit.isMoving) {
      this._hideForecast();
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
    const planeHit = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.planeIntersect, planeHit);

    const cell = this.gridManager.worldToGrid(planeHit.x, planeHit.z);
    this.hoverCell = cell;

    if (!cell) {
      this._hideForecast();
      return;
    }

    const tile = this.gridManager.getTile(cell.x, cell.z);

    if (this.selectedSpell) {
      const isValid = this.validSpellCells.some(c => c.x === cell.x && c.z === cell.z);
      if (isValid) {
        this.gridManager.clearHighlights();
        this.gridManager.highlightSpellRange(this.validSpellCells);

        const aoe = this.spellManager.getAoECells(cell, this.selectedSpell, this.activeUnit);
        this.gridManager.highlightAoE(aoe);
        this.gridManager.highlightHover(cell.x, cell.z, 0xffd700);

        // Unidad bajo el cursor o, en áreas, la primera unidad alcanzada
        const fcUnit = (tile && tile.unit && !tile.unit.isDead) ? tile.unit
          : aoe.map((c) => this.gridManager.getTile(c.x, c.z)?.unit).find((u) => u && !u.isDead);
        if (fcUnit) {
          this._showForecast(fcUnit, this.selectedSpell, cell);
        } else {
          this._hideForecast();
        }
      } else {
        this._hideForecast();
      }
    } else {
      this._hideForecast();
      const reachable = this.reachableCells.find(c => c.x === cell.x && c.z === cell.z);
      if (reachable) {
        this.gridManager.clearHighlights();
        this.gridManager.highlightReachable(this.reachableCells);
        this.gridManager.highlightPath(reachable.path);
        this.gridManager.highlightHover(cell.x, cell.z, 0x00f3ff);

        if (this.tutorialManager.isActive) {
          const step = this.tutorialManager.steps[this.tutorialManager.currentStep];
          if (step && (step.id === 'step_move_1' || step.id === 'step_move_2') && step.allowedCell) {
            this.gridManager.highlightHover(step.allowedCell.x, step.allowedCell.z, 0xffd700);
          }
        }
      }
    }
  }

  async _handleGridClick() {
    if (!this.activeUnit && this.turnManager) {
      this.activeUnit = this.turnManager.getActiveUnit() || this.units?.[0];
    }
    if (!this.activeUnit || this.activeUnit.team !== 'player' || this.activeUnit.isMoving) return;
    if (this.turnManager?.turnEnding) return; // Fase 5: el turno ya se está pasando, no se admiten más órdenes

    if (!this.hoverCell && this.sceneManager && this.mouse) {
      this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
      const planeHit = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.planeIntersect, planeHit);
      this.hoverCell = this.gridManager.worldToGrid(planeHit.x, planeHit.z);
    }
    if (!this.hoverCell) return;

    const cell = this.hoverCell;

    if (this.selectedSpell) {
      if (this.tutorialManager.isActive && !this.tutorialManager.isCellAllowed(cell.x, cell.z)) {
        this.audio.playCollision();
        return;
      }

      const isValid = this.validSpellCells.some(c => c.x === cell.x && c.z === cell.z) ||
                      (this.tutorialManager.isActive && this.tutorialManager.isCellAllowed(cell.x, cell.z));
      if (isValid) {
        const spell = this.selectedSpell;
        await this.spellManager.castSpell(this.activeUnit, spell, cell);

        this._updateHUD(this.activeUnit);
        this._updateTimelineUI(this.turnManager.queue);

        if (this.tutorialManager.isActive) {
          this.tutorialManager.advanceStep();
        }

        if (this.turnManager.checkCombatEnd()) return;

        this._clearSpellSelection();
      }
    } else {
      if (this.tutorialManager.isActive && !this.tutorialManager.isCellAllowed(cell.x, cell.z)) {
        this.audio.playCollision();
        return;
      }

      // Safeguard: Cannot move or stop on an occupied tile (ally or enemy)
      const targetTile = this.gridManager.getTile(cell.x, cell.z);
      if (targetTile && targetTile.unit && targetTile.unit !== this.activeUnit) {
        this.audio.playCollision();
        return;
      }

      if ((!this.reachableCells || this.reachableCells.length === 0) && this.activeUnit.currentPM > 0) {
        this.reachableCells = this.gridManager.getReachableCells(
          this.activeUnit.gridX,
          this.activeUnit.gridZ,
          this.activeUnit.currentPM,
          this.activeUnit
        );
      }

      const reachable = this.reachableCells.find(c => c.x === cell.x && c.z === cell.z);
      if (reachable && reachable.path) {
        await this.activeUnit.moveAlongPath(reachable.path);

        this._updateHUD(this.activeUnit);

        if (this.tutorialManager.isActive) {
          this.tutorialManager.advanceStep();
        }

        this._refreshMovementHighlights();
      }
    }
  }

  _showForecast(targetUnit, spell, cell = null) {
    if (!targetUnit || targetUnit.isDead) {
      this._hideForecast();
      return;
    }
    const el = document.getElementById('combat-forecast');
    document.getElementById('forecast-target-name').textContent = targetUnit.name || 'Enemigo';
    const curHP = (typeof targetUnit.currentHP === 'number' && !isNaN(targetUnit.currentHP)) ? targetUnit.currentHP : 0;
    const maxHP = (typeof targetUnit.maxHP === 'number' && !isNaN(targetUnit.maxHP)) ? targetUnit.maxHP : 1;
    document.getElementById('forecast-target-hp').textContent = curHP + ' / ' + maxHP + ' HP';

    // Fase 5: pronóstico exacto (triángulo, estados, escudo, barrera, bonus de la carta, área) — ui/ForecastPanel.js
    try {
      renderForecast(this, targetUnit, spell, cell);
    } catch (err) {
      console.warn('[Forecast]', err);
      const dmgVal = document.getElementById('forecast-damage-val');
      if (dmgVal && spell.baseMinDamage) dmgVal.textContent = spell.baseMinDamage + ' - ' + spell.baseMaxDamage;
    }

    const pushRow = document.getElementById('forecast-push-row');
    const collAlert = document.getElementById('forecast-collision-alert');

    if (spell.pushDistance) {
      pushRow.classList.remove('hidden');
      document.getElementById('forecast-push-val').textContent = spell.pushDistance + ' casillas';

      const dx = Math.sign(targetUnit.gridX - this.activeUnit.gridX);
      const dz = Math.sign(targetUnit.gridZ - this.activeUnit.gridZ);
      let willCollide = false;

      for (let s = 1; s <= spell.pushDistance; s++) {
        const tx = targetUnit.gridX + dx * s;
        const tz = targetUnit.gridZ + dz * s;
        if (!this.gridManager.isValidCoord(tx, tz)) { willCollide = true; break; }
        const t = this.gridManager.getTile(tx, tz);
        if (!t.walkable || t.obstacle || t.unit) { willCollide = true; break; }
      }

      if (willCollide) {
        collAlert.classList.remove('hidden');
      } else {
        collAlert.classList.add('hidden');
      }
    } else {
      pushRow.classList.add('hidden');
      collAlert.classList.add('hidden');
    }

    el.classList.remove('hidden');
  }

  _hideForecast() {
    document.getElementById('combat-forecast').classList.add('hidden');
    clearForecast();
  }

  _showSpellTooltip(index, e) {
    if (!this.activeUnit) return;
    const spellId = this.activeUnit.spellIds[index];
    if (!spellId) return;
    const spell = this.spellManager.getSpell(spellId, this.activeUnit);
    if (!spell) return;

    const tt = document.getElementById('spell-tooltip');
    document.getElementById('tt-title').textContent = spell.name;
    document.getElementById('tt-pa').textContent = this.spellManager.getSpellCost(this.activeUnit, spell) + ' AP';
    document.getElementById('tt-range').textContent = '🎯 Range: ' + spell.minRange + '-' + spell.maxRange;
    document.getElementById('tt-los').textContent = '👁️ Line of Sight: ' + (spell.requiresLoS ? 'Yes' : 'No');
    document.getElementById('tt-area').textContent = '📐 Area: ' + (spell.areaType === 'cross1' ? 'Cross (1 tile)' : 'Single Tile');
    document.getElementById('tt-desc').textContent = spell.description;

    const rect = e.target.getBoundingClientRect();
    tt.style.left = (rect.left - 40) + 'px';
    tt.classList.remove('hidden');
  }

  _hideSpellTooltip() {
    document.getElementById('spell-tooltip').classList.add('hidden');
  }

  /** Vida persistente (18-oct): en el mundo abierto, +10 de vida cada 5 s a quien le falte. */
  _tickOverworldRegen(dt) {
    const om = this.overworldManager;
    const em = this.equipmentManager;
    if (!om || !em || typeof em.regenPartyHP !== 'function' || om.state !== 'EXPLORING') return;
    this._regenTimer = (this._regenTimer || 0) + dt;
    if (this._regenTimer < OVERWORLD_HP_REGEN.everySec) return;
    this._regenTimer = 0;
    const healed = em.regenPartyHP(OVERWORLD_HP_REGEN.amount);
    if (healed && om.squadHUD && typeof om.squadHUD.render === 'function') om.squadHUD.render();
    // Guardar la vida regenerada sin guardar cada 5 s: como mucho cada 30 s y al terminar de curarse
    this._regenSaveTimer = (this._regenSaveTimer || 0) + OVERWORLD_HP_REGEN.everySec;
    if (healed) this._regenDirty = true;
    if (this._regenDirty && (!healed || this._regenSaveTimer >= 30)) {
      this._regenDirty = false;
      this._regenSaveTimer = 0;
      this._saveCurrentProgress();
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    if (this.gameState === 'INTRO' || this.gameState === 'OVERWORLD' || (this.gameState === 'LOADING' && this.overworldManager && this.overworldManager.isReadyToRender)) {
      this.overworldManager.update(dt, time);
      this.overworldManager.render(time, dt);
      if (this.gameState === 'OVERWORLD') this._tickOverworldRegen(dt);
    } else if (this.gameState === 'BATTLE') {
      this.units.forEach(u => u.update(dt, time));
      this.combatText.update(dt);
      if (this.tutorialManager) {
        this.tutorialManager.update(time);
      }
      this.sceneManager.render(time, dt);
    } else if (this.gameState === 'CAMP') {
      this.sceneManager.render(time, dt);
    }
  }
}

function initGame() {
  if (!window.tacticsGame) {
    window.tacticsGame = new AxieTacticsGame();
    window.game = window.tacticsGame;
    console.log('Axie Tactics 3D Engine with Biomes & Equipment initialized successfully!');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
