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
import { OverworldManager } from './rpg/OverworldManager.js';
import { portraitService } from './tactics/CharacterPortraitService.js';
import { StartScreenUI } from './rpg/ui/StartScreenUI.js';
import { saveSlotManager, getHeroSpells, SAPIDAE_CLASSES } from './rpg/SaveSlotManager.js';

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
    this._setupTurnCallbacks();

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

    this.overworldManager.onExitToTitle = () => {
      this._returnToTitleScreen();
    };

    this._setupAutoSave();
    this._isLoadingAdventure = false;
    this._animate();
  }

  async _onStartAdventure(slotData, isNewGame = false) {
    this._isLoadingAdventure = true;
    try {
      this.audio.init();

      // 1. Apply slot data to EquipmentManager (hero, inventory, equipped, progression, unlockedHeroes)
      this.equipmentManager.applySlotData(slotData);

      // 2. Start Overworld (run prologue only if it's a new adventure)
      const withPrologue = isNewGame;
      await this._startOverworld(withPrologue, slotData);
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
      sapidaeModel: p?.sapidaeModel || activeSlot?.sapidaeModel || 'sapidae-f-a',
      customization: p?.customization || activeSlot?.customization,
      sapidaePortrait: currentPortrait,
      unlockedHeroes: exported.unlockedHeroes || ['kotaro'],
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

    if (isVictory) {
      await this.overworldManager.resumeAfterVictory();
      this._saveCurrentProgress();
    } else {
      await this.overworldManager.resumeAfterDefeat();
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

  async _startBattle(levelOrConfig) {
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
    const biome = BIOMES[config.biome] || BIOMES.lunacia_plains;
    this.sceneManager.applyBiome(biome);
    this.gridManager.setupBiome(config.biome, config.obstacles);

    // Reset camera to default tactical framing at the start of each combat
    this.sceneManager.resetCamera();
    this.sceneManager.updateCameraPosition(0.016, 1.0);

    // Hero Spells Map
    const HERO_SPELLS = {
      kotaro: ['kotaro_slash', 'kotaro_push', 'kotaro_jump'],
      bing: ['bing_explosive', 'bing_retreat', 'bing_slow'],
      pomodoro: ['pomodoro_heal', 'pomodoro_stim', 'pomodoro_bramble']
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
      maxHP: sapidaeClassDef.maxHP,
      maxPA: sapidaeClassDef.maxPA,
      maxPM: sapidaeClassDef.maxPM,
      initiative: sapidaeClassDef.initiative || 90,
      bonusDamage: 0,
      initialShield: 0,
      critRate: 15,
      supportPower: 25,
      skillLevels: {},
      spellIds: sapidaeClassDef.spells,
      scale: 1.05,
      isSapidae: true,
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
        maxPA: stats.maxPA,
        maxPM: stats.maxPM,
        initiative: 85, // Companion acts right alongside Sapidae
        bonusDamage: stats.bonusDamage,
        bonusMeleeDamage: stats.bonusMeleeDamage || 0,
        bonusRangedDamage: stats.bonusRangedDamage || 0,
        bonusMagicDamage: stats.bonusMagicDamage || 0,
        collisionBonus: stats.collisionBonus || 0,
        initialShield: stats.initialShield,
        critRate: stats.critRate || 0,
        supportPower: stats.supportPower || 0,
        skillLevels: prog ? prog.skillLevels : {},
        spellIds: (heroId === 'kotaro' ? (baseInfo.spellIds || getHeroSpells(baseInfo.heroKey || baseInfo.axieId)) : HERO_SPELLS[heroId]) || ['kotaro_slash'],
        scale: isAxie ? 0.88 : heroMeta.scale
      }, this.gridManager, this.sceneManager, this.audio));
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
        spellIds: e.spellIds
      }, this.gridManager, this.sceneManager, this.audio));
    });

    await Promise.all(this.units.map(u => u.loadModel()));

    // Automatically request 3D portraits for all units participating in this battle without touching their live mesh
    this.units.forEach(u => {
      const portraitKey = (u.config && u.config.axieId) ? u.config.axieId : (u.type || u.id);
      if (!portraitService.hasPortrait(portraitKey)) {
        portraitService.getPortrait(portraitKey);
      }
    });

    this.turnManager.setUnits(this.units);

    if (config.isTutorial) {
      this.turnManager.startCombat();
      this.tutorialManager.startTutorial();
    } else {
      this.tutorialManager.completeTutorial();
      this.turnManager.startCombat();
    }
  }

  _setupTurnCallbacks() {
    this.turnManager.onTurnChange = (activeUnit, queue, round) => {
      this.activeUnit = activeUnit;
      this._clearSpellSelection();
      this._updateTimelineUI(queue);
      this._updateHUD(activeUnit);
      this._showTurnBanner(activeUnit);

      document.getElementById('round-number').textContent = round;

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
      // 1. Brief pause for last enemy's finisher impact sound and camera shake
      await new Promise(r => setTimeout(r, 450));

      const config = this.activeBattleConfig || LEVELS_CONFIG[this.currentLevel] || LEVELS_CONFIG[1];

      // Mark level as completed and unlock next level if campaign level
      if (typeof this.currentLevel === 'number') {
        this.equipmentManager.completeLevel(this.currentLevel);
      }

      // 2. Show Dramatic Cinematic Victory Banner (darkened screen + letterbox + big stylized title)
      const banner = document.getElementById('cinematic-banner');
      const emblem = document.getElementById('cinematic-emblem');
      const title = document.getElementById('cinematic-title');
      const subtitle = document.getElementById('cinematic-subtitle');

      banner.className = 'cinematic-banner-container victory';
      emblem.textContent = '🏆';
      title.textContent = 'VICTORY!';
      subtitle.textContent = `${config.title} has been cleared!`;

      banner.classList.remove('hidden');
      this.audio.playVictoryFanfare();
      if (this.audio && typeof this.audio.playVictoryMusic === 'function') {
        this.audio.playVictoryMusic();
      }

      // 3. Display victory banner smoothly for 1.2 seconds
      await new Promise(r => setTimeout(r, 1200));

      // 4. Smoothly fade out the cinematic title card & restore camera
      banner.classList.add('fade-out');
      this.sceneManager.restoreCamera();
      await new Promise(r => setTimeout(r, 350));
      banner.classList.add('hidden');
      banner.classList.remove('fade-out');

      // 5. Reveal the streamlined victory modal
      const modal = document.getElementById('gameover-modal');
      document.getElementById('modal-icon').textContent = '🏆';
      document.getElementById('modal-title').textContent = 'VICTORY IN COMBAT!';
      document.getElementById('modal-desc').textContent = 'You have defeated the creatures of Lunacia. Your squad gains experience and loot.';

      if (config.isTutorial) {
        this.tutorialManager.completeTutorial();
      }

      // Handle Hero recruits
      const recruitsSection = document.getElementById('recruits-section');
      if (config.rewardRecruits && config.rewardRecruits.length > 0) {
        recruitsSection.classList.remove('hidden');
        config.rewardRecruits.forEach(heroId => {
          this.equipmentManager.unlockHero(heroId);
        });

        const recruitsGrid = recruitsSection.querySelector('.recruits-grid');
        if (recruitsGrid) {
          recruitsGrid.innerHTML = config.rewardRecruits.map(heroId => {
            const h = this.equipmentManager.heroesBase[heroId];
            const { url, portraitKey } = this._getHeroPortrait(heroId, h);
            if (!url) {
              portraitService.getPortrait(portraitKey).then(resolvedUrl => {
                if (resolvedUrl) {
                  const img = document.getElementById(`recruit-avatar-img-${heroId}`);
                  if (img) {
                    img.src = resolvedUrl;
                    img.style.display = 'block';
                    const fb = document.getElementById(`recruit-avatar-fallback-${heroId}`);
                    if (fb) fb.style.display = 'none';
                  }
                }
              }).catch(() => {});
            }
            const avatarHtml = url
              ? `<img id="recruit-avatar-img-${heroId}" src="${url}" alt="${h ? h.name : heroId}">`
              : `<img id="recruit-avatar-img-${heroId}" src="" alt="${h ? h.name : heroId}" style="display:none;"><span id="recruit-avatar-fallback-${heroId}">${h ? h.avatar : '👥'}</span>`;
            return `
              <div class="recruit-card">
                <div class="recruit-avatar">${avatarHtml}</div>
                <div class="recruit-info">
                  <span class="recruit-name">${h ? h.name : heroId}</span>
                  <span class="recruit-archetype">${h ? h.archetype : 'Aliado de Lunacia'}</span>
                </div>
              </div>
            `;
          }).join('');
        }
      } else {
        recruitsSection.classList.add('hidden');
      }

      // Award Squad EXP
      const expSection = document.getElementById('exp-section');
      const expGrid = document.getElementById('exp-grid');
      const baseExp = config.rewardExp || (60 + (typeof this.currentLevel === 'number' ? this.currentLevel : 1) * 30);
      const activeHero = this.selectedHeroId || 'kotaro';
      const participatingHeroIds = this.units
        .filter(u => u.team === 'player')
        .map(u => u.id);
      const expResults = this.equipmentManager.addExpToSquad(activeHero, baseExp, participatingHeroIds);

      if (expSection && expGrid) {
        expSection.classList.remove('hidden');
        expGrid.innerHTML = Object.entries(expResults).map(([hId, res]) => {
          const h = this.equipmentManager.heroesBase[hId];
          const isMain = (hId === activeHero);
          const earned = isMain ? baseExp : Math.floor(baseExp * 0.6);
          const pct = Math.min(100, Math.round((res.currentExp / res.requiredExp) * 100));
          const levelUpHTML = res.levelsGained > 0
            ? `<div class="exp-levelup-badge">🎉 REACHED LEVEL ${res.currentLevel}! (+${res.levelsGained * 3} Stats, +${res.levelsGained} Skills)</div>`
            : '';

          const { url, portraitKey } = this._getHeroPortrait(hId, h);
          if (!url) {
            portraitService.getPortrait(portraitKey).then(resolvedUrl => {
              if (resolvedUrl) {
                const imgEl = document.getElementById(`exp-avatar-img-${hId}`);
                if (imgEl) {
                  imgEl.src = resolvedUrl;
                  imgEl.style.display = 'block';
                  const fallback = document.getElementById(`exp-avatar-fallback-${hId}`);
                  if (fallback) fallback.style.display = 'none';
                }
              }
            }).catch(() => {});
          }

          const avatarContent = url
            ? `<img id="exp-avatar-img-${hId}" src="${url}" alt="${h ? h.name : hId}">`
            : `<img id="exp-avatar-img-${hId}" src="" alt="${h ? h.name : hId}" style="display:none;"><span id="exp-avatar-fallback-${hId}" class="exp-avatar-fallback">${h ? h.avatar : '⚔️'}</span>`;

          return `
            <div class="exp-hero-card ${isMain ? 'active-hero' : ''}">
              <div id="exp-avatar-container-${hId}" class="exp-hero-avatar">${avatarContent}</div>
              <div class="exp-hero-body">
                <div class="exp-hero-row">
                  <span class="exp-hero-name">${h ? h.name : hId} ${isMain ? '<span class="exp-leader-tag">LEADER (100% EXP)</span>' : '<span class="exp-ally-tag">SQUAD (60% EXP)</span>'}</span>
                  <span class="exp-gained-val">+${earned} EXP</span>
                </div>
                <div class="exp-bar-track">
                  <div class="exp-bar-fill" style="width: ${pct}%;"></div>
                </div>
                <div class="exp-bar-legend">
                  <span>Lv. ${res.currentLevel}</span>
                  <span>${res.currentExp} / ${res.requiredExp} EXP</span>
                </div>
                ${levelUpHTML}
              </div>
            </div>
          `;
        }).join('');
      }

      // Handle Loot Drops
      if (config.rewardItems && config.rewardItems.length > 0) {
        this.equipmentManager.addItemsToInventory(config.rewardItems);
        this._renderLootGrid(config.rewardItems);
      } else {
        document.getElementById('loot-section').classList.add('hidden');
      }

      // Hide legacy / linear buttons not needed in Overworld
      const nextBtn = document.getElementById('btn-next-level');
      if (nextBtn) nextBtn.classList.add('hidden');
      const campBtn = document.getElementById('btn-goto-camp');
      if (campBtn) campBtn.classList.add('hidden');
      const restartBtn = document.getElementById('btn-restart');
      if (restartBtn) restartBtn.classList.add('hidden');

      // Prominent Return to Overworld Button
      const returnOverworldBtn = document.getElementById('btn-return-overworld');
      if (returnOverworldBtn) {
        returnOverworldBtn.textContent = '🌿 Continue Exploration';
        returnOverworldBtn.classList.remove('hidden');
      }

      this.lastBattleOutcome = 'VICTORY';
      modal.classList.remove('hidden');
    };

    this.turnManager.onDefeat = async () => {
      this.sceneManager.shake(0.5);
      await new Promise(r => setTimeout(r, 800));

      // Show Dramatic Cinematic Defeat Banner
      const banner = document.getElementById('cinematic-banner');
      const emblem = document.getElementById('cinematic-emblem');
      const title = document.getElementById('cinematic-title');
      const subtitle = document.getElementById('cinematic-subtitle');

      banner.className = 'cinematic-banner-container defeat';
      emblem.textContent = '💀';
      title.textContent = 'DEFEAT';
      subtitle.textContent = 'Your heroes have fallen in Lunacia';

      banner.classList.remove('hidden');
      this.audio.playDefeat();
      if (this.audio && typeof this.audio.playDefeatMusic === 'function') {
        this.audio.playDefeatMusic();
      }

      await new Promise(r => setTimeout(r, 2200));

      banner.classList.add('fade-out');
      this.sceneManager.restoreCamera();
      await new Promise(r => setTimeout(r, 500));
      banner.classList.add('hidden');
      banner.classList.remove('fade-out');

      const modal = document.getElementById('gameover-modal');
      document.getElementById('modal-icon').textContent = '💀';
      document.getElementById('modal-title').textContent = 'DEFEAT IN LUNACIA';
      document.getElementById('modal-desc').textContent = 'Your heroes have fallen. Return to the dojo to recover.';
      document.getElementById('recruits-section').classList.add('hidden');
      document.getElementById('loot-section').classList.add('hidden');
      const expSec = document.getElementById('exp-section');
      if (expSec) expSec.classList.add('hidden');

      const nextBtn = document.getElementById('btn-next-level');
      if (nextBtn) nextBtn.classList.add('hidden');
      const campBtn = document.getElementById('btn-goto-camp');
      if (campBtn) campBtn.classList.add('hidden');

      const returnOverworldBtn = document.getElementById('btn-return-overworld');
      if (returnOverworldBtn) {
        returnOverworldBtn.textContent = '🌿 Respawn at Dojo';
        returnOverworldBtn.classList.remove('hidden');
      }

      const restartBtn = document.getElementById('btn-restart');
      if (restartBtn) {
        restartBtn.classList.add('hidden');
      }

      this.lastBattleOutcome = 'DEFEAT';
      modal.classList.remove('hidden');
    };
  }

  _renderLootGrid(itemIds) {
    const container = document.getElementById('loot-grid');
    container.innerHTML = '';
    document.getElementById('loot-section').classList.remove('hidden');

    itemIds.forEach(id => {
      const item = ITEMS_DB[id];
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
          <img class="item-icon" src="${item.icon}" alt="">
          <span class="item-name">${item.name}</span>
        </div>
        <span class="item-slot-tag">${item.slot} (${item.rarity})</span>
        <div class="item-stats-badges">${statBadges}</div>
      `;
      container.appendChild(card);
    });
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
      if (unit.type === 'bing') avatar = '🏹';
      else if (unit.type === 'pomodoro') avatar = '🌱';
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
      if (unit.type === 'bing') { archetype = 'Bird Axie (Ranged Marksman)'; avatar = '🏹'; }
      else if (unit.type === 'pomodoro') { archetype = 'Plant Axie (Healer & Control)'; avatar = '🌱'; }
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
        const spell = this.spellManager.getSpell(spellId);
        if (!spell) {
          console.warn(`[AxieTacticsGame] Spell '${spellId}' not found for unit '${unit.name}', skipping slot ${i}`);
          slot.style.display = 'none';
          continue;
        }
        slot.style.display = 'flex';
        slot.querySelector('.pa-cost-badge').textContent = (spell.paCost ?? 0) + ' AP';
        const iconEl = slot.querySelector('.spell-icon');
        if (spell.icon && (spell.icon.includes('/') || spell.icon.endsWith('.png') || spell.icon.endsWith('.webp'))) {
          iconEl.innerHTML = `<img src="${spell.icon}" alt="${spell.name || 'Habilidad'}" class="spell-img-icon">`;
        } else {
          iconEl.textContent = spell.icon || '⚔️';
        }
        slot.querySelector('.range-badge').textContent = (spell.minRange === spell.maxRange ? spell.minRange : spell.minRange + '-' + spell.maxRange) + ' RNG';

        if (unit.currentPA < (spell.paCost ?? 0) || unit.team !== 'player' || this.activeUnit !== unit) {
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

    const spell = this.spellManager.getSpell(spellId);
    if (!spell || this.activeUnit.currentPA < spell.paCost) return;

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

        const aoe = this.spellManager.getAoECells(cell, this.selectedSpell);
        this.gridManager.highlightAoE(aoe);
        this.gridManager.highlightHover(cell.x, cell.z, 0xffd700);

        if (tile && tile.unit) {
          this._showForecast(tile.unit, this.selectedSpell);
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

  _showForecast(targetUnit, spell) {
    if (!targetUnit || targetUnit.isDead) {
      this._hideForecast();
      return;
    }
    const el = document.getElementById('combat-forecast');
    document.getElementById('forecast-target-name').textContent = targetUnit.name || 'Enemigo';
    const curHP = (typeof targetUnit.currentHP === 'number' && !isNaN(targetUnit.currentHP)) ? targetUnit.currentHP : 0;
    const maxHP = (typeof targetUnit.maxHP === 'number' && !isNaN(targetUnit.maxHP)) ? targetUnit.maxHP : 1;
    document.getElementById('forecast-target-hp').textContent = curHP + ' / ' + maxHP + ' HP';

    const dmgVal = document.getElementById('forecast-damage-val');
    if (spell.baseMinDamage) {
      let bMin = spell.baseMinDamage;
      let bMax = spell.baseMaxDamage;
      if (this.activeUnit.bonusDamage) {
        bMin += this.activeUnit.bonusDamage;
        bMax += this.activeUnit.bonusDamage;
      }
      dmgVal.textContent = bMin + ' - ' + bMax;
    } else if (spell.baseMinHeal) {
      dmgVal.textContent = '+' + spell.baseMinHeal + ' - ' + spell.baseMaxHeal + ' (Cura)';
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
  }

  _showSpellTooltip(index, e) {
    if (!this.activeUnit) return;
    const spellId = this.activeUnit.spellIds[index];
    if (!spellId) return;
    const spell = this.spellManager.getSpell(spellId);
    if (!spell) return;

    const tt = document.getElementById('spell-tooltip');
    document.getElementById('tt-title').textContent = spell.name;
    document.getElementById('tt-pa').textContent = spell.paCost + ' AP';
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

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    if (this.gameState === 'INTRO' || this.gameState === 'OVERWORLD' || (this.gameState === 'LOADING' && this.overworldManager && this.overworldManager.isReadyToRender)) {
      this.overworldManager.update(dt, time);
      this.overworldManager.render(time, dt);
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
