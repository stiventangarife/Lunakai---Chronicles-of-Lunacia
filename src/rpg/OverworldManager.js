// OverworldManager.js - Master Coordinator for the Overworld RPG Scene (Dojo of Lunacia)
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { PlayerEntity } from './PlayerEntity.js';
import { OverworldCamera } from './OverworldCamera.js';
import { PlayerController } from './PlayerController.js';
import { OverworldCollisions } from './OverworldCollisions.js';
import { DialogSystem } from './DialogSystem.js';
import { NPCManager } from './NPCManager.js';
import { WanderingMonsters } from './WanderingMonsters.js';
import { BattleTransition } from './BattleTransition.js';
import { CinematicFlythrough } from './CinematicFlythrough.js';
import { TextureGenerator } from '../tactics/TextureGenerator.js';
import { StylizedEnvironment } from './stylized/StylizedEnvironment.js';
import { WorldMapManager } from './world/WorldMapManager.js';
import { createQuestBeaconArrow3D } from './world/ZoneTransitionManager.js';
import { BiomeDecorationManager } from './world/BiomeDecorationManager.js';
import { MagicalSkybox } from './world/MagicalSkybox.js';
import { ZoneParticleManager } from './world/ZoneParticleManager.js';
import { DojoRockSanctuary } from './world/DojoRockSanctuary.js';
import { DojoBambooGrove } from './world/DojoBambooGrove.js';
import { DojoBuilding } from './world/DojoBuilding.js';
import { ForestNatureManager, DojoNatureManager } from './world/ForestNatureManager.js';
import { StylizedRiver } from './stylized/StylizedRiver.js';
import { StylizedPond } from './stylized/StylizedPond.js';
import { InventoryModal } from './ui/InventoryModal.js';
import { QuestManager } from './QuestManager.js';
import { QuestBookModal } from './ui/QuestBookModal.js';
import { OverworldTutorialManager } from './OverworldTutorialManager.js';
import { SquadHUD } from './ui/SquadHUD.js';
import { portraitService } from '../tactics/CharacterPortraitService.js';
import { QuestInteractablesManager } from './world/QuestInteractablesManager.js';
import { SettingsModal } from './ui/SettingsModal.js';

export class OverworldManager {
  constructor(renderer, audioSystem, onStartBattle, equipmentManager = null) {
    this.renderer = renderer;
    this.audio = audioSystem;
    this.onStartBattle = onStartBattle;
    this.equipmentManager = equipmentManager;

    this.scene = new THREE.Scene();
    this.container = document.getElementById('canvas-container');

    // Subsystems
    this.collisions = new OverworldCollisions();
    this.cameraController = new OverworldCamera(this.container);
    this.camera = this.cameraController.camera;
    this.dialogSystem = new DialogSystem(this.audio);
    this.npcManager = new NPCManager(this.scene, this.dialogSystem, this.audio);
    this.npcManager.collisions = this.collisions;
    this.npcManager.overworldManager = this;
    this.monsters = new WanderingMonsters(this.scene, this.collisions, this.audio);
    this.monsters.om = this;
    this.npcManager.monsters = this.monsters;
    this.transition = new BattleTransition(this.audio);
    this.flythrough = new CinematicFlythrough(this.camera, this.audio);
    this.stylizedEnv = null;
    this.magicalSkybox = null;
    this.zoneParticleManager = null;
    this.dojoRockSanctuary = null;
    this.forestNatureManager = null;
    this.dojoNatureManager = null;
    this.stylizedRiver = null;
    this.dojoPond = null;
    this.westPond = null;
    this.savannahOasis = null;
    this.arcticFrozenLake = null;
    this.arcticFrozenLake2 = null;
    this.mysticPond = null;
    this.worldMapManager = new WorldMapManager(this);
    this.inventoryModal = this.equipmentManager ? new InventoryModal(this.equipmentManager, this.audio) : null;
    this.questManager = new QuestManager(this.equipmentManager, this.audio);
    this.monsters.questManager = this.questManager;
    this.questInteractables = new QuestInteractablesManager(this.scene, this.questManager, this.audio, this);
    this.questBookModal = new QuestBookModal(this.questManager, this.audio);
    this.tutorialManager = new OverworldTutorialManager(this);

    this.settingsModal = new SettingsModal({
      renderer: this.renderer,
      scene: this.scene,
      audio: this.audio,
      onExitToTitle: () => {
        if (typeof this.onExitToTitle === 'function') {
          this.onExitToTitle();
        }
      },
      onSaveProgress: () => {
        if (typeof this.onSaveProgress === 'function') {
          this.onSaveProgress();
        }
      }
    });

    if (this.inventoryModal) {
      this.inventoryModal.tutorialManager = this.tutorialManager;
      this.inventoryModal.questManager = this.questManager;
    }

    // Wire UI blocking check to camera controller so zooming and mouse rotation are disabled when any UI is open
    this.cameraController.setUIBlockCheck(() => this.isAnyModalOpen());

    // Modal interaction hooks for tutorial progression
    if (this.questBookModal) {
      this.questBookModal.onOpen = () => this.tutorialManager.onQuestBookOpened();
      this.questBookModal.onClose = () => {
        this.tutorialManager.onQuestBookClosed();
        if (this.questDescEl) {
          this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
        }
      };
    }
    if (this.inventoryModal) {
      this.inventoryModal.onOpen = () => {
        if (this.tutorialManager) this.tutorialManager.onInventoryOpened();
      };
      this.inventoryModal.onClose = () => {
        this.tutorialManager.onInventoryClosed();
        if (this.questDescEl) {
          this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
        }
      };
      this.inventoryModal.onItemEquipped = (heroId, slot, itemId) => {
        if (heroId === 'kotaro' && slot === 'weapon' && itemId === 'wood_sword') {
          this.tutorialManager.onSwordEquipped();
          if (this.questDescEl) {
            this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
          }
        }
      };
    }

    // Link QuestManager and NPCManager
    this.npcManager.camera = this.camera;
    this.npcManager.questManager = this.questManager;
    this.npcManager.equipmentManager = this.equipmentManager;
    this.npcManager.onPaladillInitialTalkComplete = () => {
      this.tutorialManager.onPaladillInitialTalkComplete();
      if (this.questDescEl) {
        this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
      }
    };
    this.npcManager.onPaladillRewardDelivered = () => {
      this.tutorialManager.onPaladillRewardDelivered();
      if (this.questDescEl) {
        this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
      }
    };
    this.npcManager.onPaladillGraduationComplete = () => {
      if (this.worldMapManager && this.worldMapManager.transitionManager) {
        this.worldMapManager.transitionManager.setPortalsLocked(false);
      }
      this.tutorialManager.onPaladillGraduationComplete();
      if (this.inventoryModal) {
        this.inventoryModal.setTutorialLock(false, null);
      }
      if (this.questDescEl) {
        this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
      }
    };
    this.questManager.onQuestUpdated(() => {
      if (this.questDescEl) {
        this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
      }
    });

    // Player Hero
    this.player = null;
    this.playerController = null;
    this.savedPlayerPosition = new THREE.Vector3(0, 0, 2);

    this.state = 'INIT'; // CINEMATIC, HERO_PRESENTATION, EXPLORING, DIALOG, TRANSITION
    this.currentBattlingMonsterId = null;
    this.particles = [];
    this.currentSubQuadrant = null;

    this._createHeroPresentationDOM();
    this._createOverworldHUDDOM();
    this._setupInput();
  }

  setEquipmentManager(equipmentManager) {
    this.equipmentManager = equipmentManager;
    if (!this.inventoryModal && equipmentManager) {
      this.inventoryModal = new InventoryModal(equipmentManager, this.audio);
      if (this.tutorialManager) {
        this.inventoryModal.onOpen = () => this.tutorialManager.onInventoryOpened();
        this.inventoryModal.onClose = () => this.tutorialManager.onInventoryClosed();
      }
    }
    if (this.questManager) {
      this.questManager.setEquipmentManager(equipmentManager);
    }
    if (this.npcManager) {
      this.npcManager.equipmentManager = equipmentManager;
    }
    if (this.squadHUD) {
      this.squadHUD.setEquipmentManager(equipmentManager);
    }
  }

  _createHeroPresentationDOM() {
    let el = document.getElementById('hero-presentation-card');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hero-presentation-card';
      el.className = 'hero-intro-card hidden';
      el.innerHTML = `
        <div class="intro-card-inner">
          <div class="intro-avatar-frame" id="intro-hero-avatar">⚔️</div>
          <span class="intro-role-badge">DESIGNATED HERO</span>
          <h2 id="intro-hero-name" class="intro-hero-title">Lunakai Hero</h2>
          <p id="intro-hero-role" class="intro-hero-archetype">
            <span id="intro-hero-class">Hero of Lunacia</span>
          </p>
          <div class="intro-mission-hint">
            Press <kbd>Space</kbd> or <kbd>E</kbd> to begin exploration ➔
          </div>
        </div>
      `;
      el.addEventListener('click', () => {
        if (this._dismissHeroPresentation) {
          this._dismissHeroPresentation();
        }
      });
      document.body.appendChild(el);
    }
    this.heroIntroCardEl = el;
  }

  _createOverworldHUDDOM() {
    let el = document.getElementById('overworld-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'overworld-hud';
      el.className = 'overworld-hud hidden';
      el.innerHTML = `
        <div class="overworld-quest-tracker">
          <div class="quest-header">
            <span class="quest-icon">📜</span>
            <span class="quest-title">MAIN QUEST</span>
          </div>
          <div id="overworld-quest-desc" class="quest-desc">
            Talk to Master Paladill at the Dojo [E]
          </div>
          <!-- Zone Coordinate, Sub-Quadrant & Biome Badge -->
          <div id="overworld-zone-coord-badge" class="hud-zone-badge">
            <span class="hud-biome-dot" style="background:#22c55e"></span>
            <span class="hud-zone-name">Dojo Valley</span>
            <span class="hud-zone-coord">[3, 3]</span>
            <span id="hud-subq-tag" class="hud-subq-badge">SE</span>
          </div>
          <!-- Navigational Direction Indicator & Compass -->
          <div id="overworld-quest-navigator" class="hud-quest-navigator">
            <div class="hud-nav-compass">
              <span id="hud-nav-compass-arrow" class="hud-compass-arrow">🧭</span>
            </div>
            <div class="hud-nav-info">
              <span class="hud-nav-label">TARGET HEADING</span>
              <span id="hud-nav-direction-text" class="hud-nav-direction-text">Calculating route...</span>
            </div>
          </div>
        </div>

        <div class="overworld-controls-guide">
          <div class="guide-item"><kbd>W A S D</kbd> Move</div>
          <div class="guide-item"><kbd>E</kbd> Talk / Interact</div>
          <div class="guide-item"><kbd>Space</kbd> Continue Dialogue</div>
          <div class="guide-item"><kbd>I</kbd> Inventory</div>
          <div class="guide-item"><kbd>J / L</kbd> Quests</div>
          <div class="guide-item"><kbd>M</kbd> World Map</div>
          <div class="guide-item"><kbd>Q / R</kbd> Rotate View</div>
          <div class="guide-item"><kbd>Wheel</kbd> Zoom</div>
          <div class="guide-item" id="hud-player-coord-display" style="color: #67e8f9; font-weight: bold; font-family: monospace;">📍 Pos: X 0.0 | Z 0.0</div>
          <div class="hud-action-buttons-group">
            <button id="btn-open-inventory" class="hud-inv-btn" title="Open Inventory & Equipment [I]">🎒 Inventory [I]</button>
            <button id="btn-open-quest-book" class="hud-quest-btn" title="Open Quest Log [J]">📖 Quests [J]</button>
            <button id="btn-open-world-map" class="hud-map-btn" title="Open World Map [M]">🗺️ View Map [M]</button>
            <button id="btn-open-options" class="hud-options-btn" title="Game Options: Graphics, Audio, and Exit [ESC]">⚙️ Options</button>
          </div>
        </div>
      `;
      document.body.appendChild(el);

      const optionsBtn = document.getElementById('btn-open-options');
      if (optionsBtn) {
        optionsBtn.addEventListener('click', () => {
          if (this.isCombatActive()) return;
          if (this.settingsModal) {
            this.settingsModal.toggle();
          }
        });
      }

      const mapBtn = document.getElementById('btn-open-world-map');
      if (mapBtn) {
        mapBtn.addEventListener('click', () => {
          if (this.isCombatActive()) return;
          if (this.tutorialManager && (this.tutorialManager.isCutsceneActive || this.tutorialManager.isOverlayActive)) return;
          if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('worldMap')) {
            this._showFeatureLockedFeedback('The World Map unlocks after graduating from the Dojo.');
            return;
          }
          if (this.worldMapManager) this.worldMapManager.toggleWorldMap();
        });
      }

      const invBtn = document.getElementById('btn-open-inventory');
      if (invBtn) {
        invBtn.addEventListener('click', () => {
          if (this.isCombatActive()) return;
          if (this.tutorialManager && this.tutorialManager.isCutsceneActive) return;
          if (this.tutorialManager && this.tutorialManager.isOverlayActive && this.tutorialManager.activeOverlayStep !== 'EQUIP_SWORD') return;
          if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('inventory')) {
            this._showFeatureLockedFeedback('Inventory unlocks after your first battle.');
            return;
          }
          if (this.inventoryModal) this.inventoryModal.toggle();
        });
      }

      const questBtn = document.getElementById('btn-open-quest-book');
      if (questBtn) {
        questBtn.addEventListener('click', () => {
          if (this.isCombatActive()) return;
          if (this.tutorialManager && this.tutorialManager.isCutsceneActive) return;
          if (this.tutorialManager && this.tutorialManager.isOverlayActive && this.tutorialManager.activeOverlayStep !== 'OPEN_QUEST_BOOK') return;
          if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('questBook')) {
            this._showFeatureLockedFeedback('Talk to Master Paladill [E] first to receive your quest.');
            return;
          }
          if (this.questBookModal) this.questBookModal.toggle();
        });
      }

      const trackerEl = el.querySelector('.overworld-quest-tracker');
      if (trackerEl) {
        trackerEl.style.cursor = 'pointer';
        trackerEl.title = 'Click to open Quest Log [J]';
        trackerEl.addEventListener('click', () => {
          if (this.isCombatActive()) return;
          if (this.tutorialManager && this.tutorialManager.isCutsceneActive) return;
          if (this.tutorialManager && this.tutorialManager.isOverlayActive && this.tutorialManager.activeOverlayStep !== 'OPEN_QUEST_BOOK') return;
          if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('questBook')) {
            return;
          }
          if (this.questBookModal) this.questBookModal.toggle();
        });
      }

      if (this.tutorialManager) {
        this.tutorialManager._updateHUDButtonsState();
      }
    }
    this.overworldHudEl = el;
    this.questDescEl = document.getElementById('overworld-quest-desc');
    this.questNavigatorEl = document.getElementById('overworld-quest-navigator');
    this.navCompassArrowEl = document.getElementById('hud-nav-compass-arrow');
    this.navDirectionTextEl = document.getElementById('hud-nav-direction-text');

    if (!this.squadHUD) {
      this.squadHUD = new SquadHUD(el, this.equipmentManager, this.inventoryModal);
    }
  }

  isCombatActive() {
    return this.state === 'COMBAT' ||
           document.body.classList.contains('state-combat') ||
           (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE');
  }

  _showFeatureLockedFeedback(msg) {
    if (this.audio && typeof this.audio.playCollision === 'function') {
      this.audio.playCollision();
    }
    this._showBannerMessage('🔒 FEATURE LOCKED', msg);
  }

  isAnyModalOpen() {
    if (this.inventoryModal && this.inventoryModal.isOpen) return true;
    if (this.questBookModal && this.questBookModal.isOpen) return true;
    if (this.settingsModal && this.settingsModal.isOpen) return true;
    if (this.worldMapManager && this.worldMapManager.worldMapModal && this.worldMapManager.worldMapModal.isOpen) return true;
    if (this.dialogSystem && this.dialogSystem.isActive) return true;
    if (this.tutorialManager && (this.tutorialManager.isCutsceneActive || this.tutorialManager.isOverlayActive)) return true;
    if (this.state === 'CINEMATIC' || this.state === 'HERO_PRESENTATION' || this.state === 'TRANSITION' || this.state === 'COMBAT') return true;

    const activeModal = document.querySelector(
      '.quest-book-modal:not(.hidden), ' +
      '.inventory-modal:not(.hidden), ' +
      '.world-map-modal:not(.hidden), ' +
      '#settings-modal:not(.hidden), ' +
      '.settings-modal:not(.hidden), ' +
      '#gameover-modal:not(.hidden), ' +
      '#equipment-screen:not(.hidden), ' +
      '.dialog-overlay:not(.hidden), ' +
      '#dialog-box-overlay:not(.hidden)'
    );
    return Boolean(activeModal);
  }

  _setupInput() {
    window.addEventListener('keydown', (e) => {
      // Prioridad máxima: Escape para cerrar modales y menús abiertos en cualquier momento (incluso durante tutorial)
      if (e.code === 'Escape') {
        if (this.settingsModal && this.settingsModal.isOpen) {
          this.settingsModal.close();
          e.preventDefault();
          return;
        }
        if (this.questBookModal && this.questBookModal.isOpen) {
          this.questBookModal.close();
          e.preventDefault();
          return;
        }
        if (this.inventoryModal && this.inventoryModal.isOpen) {
          this.inventoryModal.close();
          e.preventDefault();
          return;
        }
        if (this.worldMapManager && this.worldMapManager.worldMapModal && this.worldMapManager.worldMapModal.isOpen) {
          this.worldMapManager.closeWorldMap();
          e.preventDefault();
          return;
        }

        // Si no hay modales abiertos y el tutorial o cinemática bloquea entrada, no hacer nada más
        if (this.tutorialManager && (this.tutorialManager.isCutsceneActive || this.tutorialManager.isOverlayActive)) {
          e.preventDefault();
          return;
        }

        const inCombat = this.isCombatActive();
        if (!inCombat && this.state === 'EXPLORING' && this.settingsModal) {
          this.settingsModal.open();
          e.preventDefault();
          return;
        }
        return;
      }

      // Bloquear cualquier input si el tutorial tiene la entrada bloqueada (overlay o cinemática)
      if (this.tutorialManager && this.tutorialManager.isInputLocked(e.code)) {
        e.preventDefault();
        return;
      }

      // Bloquear apertura de mapa, inventario y misiones durante combate
      const inCombat = this.isCombatActive();

      if (e.code === 'KeyI') {
        if (inCombat) {
          e.preventDefault();
          return;
        }
        if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('inventory')) {
          this._showFeatureLockedFeedback('Inventory unlocks after your first battle.');
          e.preventDefault();
          return;
        }
        if (this.inventoryModal) {
          this.inventoryModal.toggle();
          e.preventDefault();
          return;
        }
      }

      if (e.code === 'KeyJ' || e.code === 'KeyL') {
        if (inCombat) {
          e.preventDefault();
          return;
        }
        if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('questBook')) {
          this._showFeatureLockedFeedback('Talk to Master Paladill [E] first to receive your quest.');
          e.preventDefault();
          return;
        }
        if (this.questBookModal) {
          this.questBookModal.toggle();
          e.preventDefault();
          return;
        }
      }

      if (e.code === 'KeyM') {
        if (inCombat) {
          e.preventDefault();
          return;
        }
        if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('worldMap')) {
          this._showFeatureLockedFeedback('The World Map unlocks after graduating from the Dojo.');
          e.preventDefault();
          return;
        }
        if (this.worldMapManager) {
          this.worldMapManager.toggleWorldMap();
          e.preventDefault();
          return;
        }
      }

      if (e.code === 'KeyO') {
        if (!inCombat && this.settingsModal) {
          this.settingsModal.toggle();
          e.preventDefault();
          return;
        }
      }

      if (this.state === 'HERO_PRESENTATION') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
          if (this._dismissHeroPresentation) {
            this._dismissHeroPresentation();
            e.preventDefault();
            return;
          }
        }
      }

      if (this.state === 'EXPLORING') {
        // If dialogue or any modal is open, block exploration key inputs (NPC interact, Q/R camera rotation)
        if (this.isAnyModalOpen()) {
          return;
        }

        if (e.code === 'KeyE') {
          // Check quest gathering/interactables first
          if (this.questInteractables && this.questInteractables.tryInteract()) {
            e.preventDefault();
            return;
          }
          // [E] initiates interaction with nearby NPC
          if (this.npcManager.tryInteract()) {
            e.preventDefault();
          }
        } else if (e.code === 'KeyQ') {
          this.cameraController.rotateLeft();
        } else if (e.code === 'KeyR') {
          this.cameraController.rotateRight();
        }
      }
    });
  }

  async init(heroConfig = {}, slotData = null) {
    // 1. Build Stylized Meadow Environment (Grass, Flowers, Cobblestone SDF Path, Trees, Wind)
    if (!this.stylizedEnv) {
      console.log('[DIAG] Iniciando StylizedEnvironment...');
      this.stylizedEnv = new StylizedEnvironment(this.scene);
      await this.stylizedEnv.init();
      console.log('[DIAG] StylizedEnvironment OK');

      // 1b. Build Magical Skybox and Zone Environmental Particles
      this.magicalSkybox = new MagicalSkybox(this.scene);
      this.zoneParticleManager = new ZoneParticleManager(this.scene);

      // World boundaries (80x80 continuous ground with safe margin)
      this.collisions.bounds = {
        minX: -38.5,
        maxX: 38.5,
        minZ: -38.5,
        maxZ: 38.5
      };

      // Procedural trees handled in StylizedTrees setZone

      // 1c. Build Dojo Sanctuary Rock Formations & Column Ruins with Cascading Ivy [Zone 3, 3]
      if (!this.dojoRockSanctuary) {
        console.log('[DIAG] Iniciando DojoRockSanctuary...');
        this.dojoRockSanctuary = new DojoRockSanctuary(this.scene, this.collisions);
        await this.dojoRockSanctuary.init();
        console.log('[DIAG] DojoRockSanctuary OK');
      }

      // 1d. Build Dojo Stylized River, Stepping Stones & Swimming Fish [Zone 3, 3]
      if (!this.stylizedRiver) {
        console.log('[DIAG] Iniciando StylizedRiver...');
        this.stylizedRiver = new StylizedRiver(this.scene, this.collisions);
        await this.stylizedRiver.init();
        console.log('[DIAG] StylizedRiver OK');
      }

      // 1e. Build Dojo Bamboo Groves with GPU Wind Animation [Zone 3, 3]
      if (!this.dojoBambooGrove) {
        console.log('[DIAG] Iniciando DojoBambooGrove...');
        this.dojoBambooGrove = new DojoBambooGrove(this.scene, this.collisions);
        await this.dojoBambooGrove.init();
        console.log('[DIAG] DojoBambooGrove OK');
      }

      // 1f. Build Dojo Pagoda Temple Sanctuary [Zone 3, 3]
      if (!this.dojoBuilding) {
        console.log('[DIAG] Iniciando DojoBuilding...');
        this.dojoBuilding = new DojoBuilding(this.scene, this.collisions);
        await this.dojoBuilding.init();
        console.log('[DIAG] DojoBuilding OK');
      }

      // 1g. Build Forest Nature Elements (Stylized Nature MegaKit) [Zone 3, 3 and all Forest zones]
      if (!this.forestNatureManager) {
        console.log('[DIAG] Iniciando ForestNatureManager...');
        this.forestNatureManager = new ForestNatureManager(this.scene, this.collisions);
        this.dojoNatureManager = this.forestNatureManager;
        await this.forestNatureManager.init();
        console.log('[DIAG] ForestNatureManager OK');
      }

      // 1h. Build Dojo Stylized Pond with Pebble Border [Zone 3, 3]
      if (!this.dojoPond) {
        console.log('[DIAG] Iniciando Dojo StylizedPond [3, 3]...');
        this.dojoPond = new StylizedPond(this.scene, this.collisions, {
          id: 'dojo_stylized_pond',
          cx: -30.3,
          cz: 12.0,
          radH: 4.1,
          radV: 3.0,
          collisionTag: 'dojo_pond_water',
          collisionTagPrefix: 'dojo_pond',
          zoneName: 'Dojo Valley [3, 3]'
        });
        await this.dojoPond.init();
        console.log('[DIAG] Dojo StylizedPond OK');
      }
      // Note: Secondary ponds (Dungeon Lava Pond, Savannah Oasis, Arctic Frozen Lakes, Mystic Astral Pond)
      // are now lazy-loaded on-demand via ensureZonePonds() when entering their respective zones.
    }

    // Clean up previous hero model if switching heroes or slots
    if (this.player && this.player.group) {
      this.scene.remove(this.player.group);
      this.player = null;
    }

    // Determine initial spawn position and map
    let spawnX = 0;
    let spawnY = 0;
    let spawnZ = 2;
    let spawnYaw = Math.PI;

    let initialMapId = 'zone_2_2';
    let visitedZones = ['zone_2_2'];

    if (slotData && slotData.zone) {
      if (slotData.zone.mapId) initialMapId = slotData.zone.mapId;
      else if (slotData.level >= 5) initialMapId = 'zone_2_1';

      if (slotData.zone.visitedZones && Array.isArray(slotData.zone.visitedZones)) {
        visitedZones = slotData.zone.visitedZones;
      }
      if (slotData.zone.playerPos) {
        spawnX = slotData.zone.playerPos.x ?? 0;
        spawnY = slotData.zone.playerPos.y ?? 0;
        spawnZ = slotData.zone.playerPos.z ?? 2;
        spawnYaw = slotData.zone.playerPos.yaw ?? Math.PI;
      }
    } else if (slotData && slotData.level >= 5) {
      initialMapId = 'zone_2_1';
      visitedZones = ['zone_2_2', 'zone_3_2', 'zone_3_1', 'zone_2_1'];
    }

    // 2. Initialize Hero Entity
    this.player = new PlayerEntity({
      heroId: heroConfig.id || 'kotaro',
      axieId: heroConfig.axieId || (heroConfig.modelType === 'axie' ? '10455' : null),
      genes: heroConfig.genes || null,
      name: (heroConfig.name && heroConfig.name !== 'Kotaro') ? heroConfig.name : 'Shinji',
      heroClass: heroConfig.archetype || 'Bestia Duelista',
      archetype: heroConfig.archetype || 'Axie Bestia (Duelista Melee)',
      avatar: heroConfig.avatar || '⚔️',
      modelType: heroConfig.modelType || (heroConfig.axieId ? 'axie' : (heroConfig.id || 'kotaro')),
      scale: (heroConfig.modelType === 'axie' || heroConfig.axieId) ? 0.88 : (heroConfig.scale || 1.05),
      x: spawnX,
      y: spawnY,
      z: spawnZ,
      yaw: spawnYaw
    });

    console.log('[DIAG] Cargando modelo del jugador...');
    await this.player.loadModel(this.renderer);
    this.scene.add(this.player.group);
    console.log('[DIAG] Modelo jugador OK');

    // Dialog context with dynamic hero details
    this.dialogSystem.setHeroContext(this.player);

    // Real-time dynamic Axie model swapper
    window.addEventListener('heroAxieChanged', async (e) => {
      const detail = e.detail;
      if (!this.player || !detail) return;
      if (this.player.heroId === detail.heroId || (!detail.heroId && this.player.heroId === 'kotaro')) {
        this.player.axieId = String(detail.axieId);
        if (detail.genes) this.player.genes = detail.genes;
        if (detail.name) this.player.name = detail.name;
        if (detail.archetype) this.player.archetype = detail.archetype;
        this.player.modelType = 'axie';
        if (this.player.mesh) {
          this.player.group.remove(this.player.mesh);
          this.player.mesh = null;
        }
        await this.player.loadModel(this.renderer);
        this.dialogSystem.setHeroContext(this.player);
        console.log(`[OverworldManager] Real-time swapped Axie hero model to #${detail.axieId}`);
      }
    });

    window.setPlayerAxie = (axieId, genes = null, name = null) => {
      if (this.equipmentManager) {
        this.equipmentManager.setHeroAxie('kotaro', { axieId, genes, name });
      }
    };

    // 3. Controller and Camera setup
    this.playerController = new PlayerController(
      this.player,
      this.cameraController,
      this.collisions,
      this.audio,
      this
    );
    this.cameraController.setFollowTarget(this.player);

    // 4. Initialize NPCs
    console.log('[DIAG] Iniciando NPCManager...');
    await this.npcManager.init();
    console.log('[DIAG] NPCManager OK');
    if (initialMapId === 'zone_2_2') {
      this.collisions.addCircle(-14.5, -8.5, 1.2, 'npc_paladill');
    }

    // 5. Initialize Wandering Monsters
    console.log('[DIAG] Iniciando WanderingMonsters...');
    await this.monsters.init();
    console.log('[DIAG] WanderingMonsters OK');
    this.monsters.onEncounterCallback = (monster) => {
      this._handleMonsterEncounter(monster);
    };

    // 6. Restore Quest & Tutorial state from saved slot FIRST
    if (this.questManager) {
      this.questManager.loadSaveData(slotData?.questProgress, slotData?.level || 1);
    }
    if (this.tutorialManager) {
      this.tutorialManager.loadSaveData(slotData?.tutorialProgress, slotData?.level || 1);
    }

    // 7. Initialize Biome 3D Decoration Manager (Savannah cacti, desert trees, rocks)
    console.log('[DIAG] Iniciando BiomeDecorationManager...');
    this.biomeDecorationManager = new BiomeDecorationManager(this.scene, this.collisions, this.renderer);
    await this.biomeDecorationManager.init();
    console.log('[DIAG] BiomeDecorationManager OK');

    // 8. Initialize Continuous Map & Biome System with loaded zone
    this.worldMapManager.init(
      this.stylizedEnv,
      this.biomeDecorationManager,
      this.magicalSkybox,
      this.zoneParticleManager,
      initialMapId,
      visitedZones,
      slotData?.zone?.playerPos ? { x: spawnX, y: spawnY, z: spawnZ, yaw: spawnYaw } : null
    );

    if (this.questInteractables) {
      this.questInteractables.loadForZone(initialMapId.replace('zone_', ''));
    }

    if (this.tutorialManager && (!this.tutorialManager.isActive || this.tutorialManager.currentStep === 'COMPLETED')) {
      if (this.worldMapManager.transitionManager) {
        this.worldMapManager.transitionManager.setPortalsLocked(false);
      }
    }

    if (this.worldMapManager.transitionManager) {
      this.worldMapManager.transitionManager.onPortalBlocked = (portal, reason, isPinned = false) => {
        this._showBannerMessage('🚫 BARRERA DE ENTRENAMIENTO', reason, isPinned);
        if (this.audio && typeof this.audio.playCollision === 'function') {
          this.audio.playCollision();
        }
      };
      this.worldMapManager.transitionManager.onPortalUnblocked = () => {
        this._hideBannerMessage();
      };
    }

    console.log('[OverworldManager] Initialized successfully with stylized assets and continuous map system!');
  }

  startPrologue() {
    this.state = 'CINEMATIC';
    if (this.onStateChange) this.onStateChange('INTRO');
    this.playerController.setEnabled(false);

    // Hide gameplay HUD during cinematic flight
    if (this.overworldHudEl) this.overworldHudEl.classList.add('hidden');
    if (this.squadHUD && this.squadHUD.container) this.squadHUD.container.classList.add('hidden');
    const tutBanner = document.getElementById('overworld-tutorial-banner');
    if (tutBanner) tutBanner.classList.add('hidden');

    this.flythrough.start(() => {
      this._presentHero();
    });
    if (this.audio && typeof this.audio.playCinematicMusic === 'function') {
      this.audio.playCinematicMusic();
    }
  }

  _presentHero() {
    this.state = 'HERO_PRESENTATION';

    // Keep gameplay HUD hidden while presenting hero card
    if (this.overworldHudEl) this.overworldHudEl.classList.add('hidden');
    if (this.squadHUD && this.squadHUD.container) this.squadHUD.container.classList.add('hidden');
    const tutBanner = document.getElementById('overworld-tutorial-banner');
    if (tutBanner) tutBanner.classList.add('hidden');

    // Position camera facing the hero nicely in the Dojo courtyard
    this.cameraController.distance = 15.0;
    this.cameraController.pitchAngle = 0.70;
    this.cameraController.currentAngle = Math.PI * 0.18;

    // Show Hero Presentation Card safely
    const nameEl = document.getElementById('intro-hero-name');
    if (nameEl && this.player) nameEl.textContent = this.player.name;
    const roleEl = document.getElementById('intro-hero-role') || document.getElementById('intro-hero-class');
    if (roleEl && this.player) roleEl.textContent = this.player.archetype;
    const classEl = document.getElementById('intro-hero-class');
    if (classEl && this.player) classEl.textContent = this.player.archetype;

    const avatarEl = document.getElementById('intro-hero-avatar');
    if (avatarEl && this.player) {
      const portraitKey = this.player.axieId || (this.player.heroId === 'kotaro' ? 'shinji' : this.player.heroId);
      const snap = portraitService.getPortraitSync(portraitKey) || portraitService.getPortraitSync(this.player.heroId);
      if (snap) {
        avatarEl.innerHTML = `<img src="${snap}" alt="${this.player.name}" style="width: 100%; height: 100%; object-fit: contain; transform: scale(1.15); filter: drop-shadow(0 2px 8px rgba(0,0,0,0.85));">`;
      } else {
        portraitService.getPortrait(portraitKey).then(src => {
          if (src && avatarEl) {
            avatarEl.innerHTML = `<img src="${src}" alt="${this.player.name}" style="width: 100%; height: 100%; object-fit: contain; transform: scale(1.15); filter: drop-shadow(0 2px 8px rgba(0,0,0,0.85));">`;
          }
        });
      }
    }

    if (this.heroIntroCardEl) {
      this.heroIntroCardEl.classList.remove('hidden');
    }

    // Hero performs cheerful salute bounce
    if (this.player && typeof this.player.playSalute === 'function') {
      this.player.playSalute();
    }

    let dismissed = false;
    const dismissHeroPresentation = () => {
      if (dismissed) return;
      dismissed = true;
      if (this._heroDismissTimer) {
        clearTimeout(this._heroDismissTimer);
        this._heroDismissTimer = null;
      }
      if (this.heroIntroCardEl) {
        this.heroIntroCardEl.classList.add('fade-out');
        setTimeout(() => {
          this.heroIntroCardEl.classList.add('hidden');
          this.heroIntroCardEl.classList.remove('fade-out');
          this.startFreeExploration();
        }, 300);
      } else {
        this.startFreeExploration();
      }
    };

    this._dismissHeroPresentation = dismissHeroPresentation;
    this._heroDismissTimer = setTimeout(dismissHeroPresentation, 2800);
  }

  startFreeExploration(slotData = null) {
    this.state = 'EXPLORING';
    if (this.onStateChange) this.onStateChange('OVERWORLD');
    this.playerController.setEnabled(true);
    if (this.overworldHudEl) this.overworldHudEl.classList.remove('hidden');
    if (this.squadHUD && this.squadHUD.container) {
      this.squadHUD.container.classList.remove('hidden');
    }

    const isTutorialCompleted = (slotData && (slotData.level > 1 || !slotData.tutorialProgress?.isActive || slotData.tutorialProgress?.currentStep === 'COMPLETED'))
      || (!this.tutorialManager?.isActive)
      || (this.tutorialManager?.currentStep === 'COMPLETED');

    if (this.tutorialManager) {
      if (isTutorialCompleted) {
        this.tutorialManager.isActive = false;
        this.tutorialManager.currentStep = 'COMPLETED';
        this.tutorialManager.unlockedFeatures = { questBook: true, combat: true, inventory: true, worldMap: true };
        this.tutorialManager.hideBanner();
        this.tutorialManager._updateHUDButtonsState();
        if (this.worldMapManager?.transitionManager) {
          this.worldMapManager.transitionManager.setPortalsLocked(false);
        }
      } else {
        this.tutorialManager.start(false);
      }
    }

    // Refresh HUD quest tracker and zone info
    if (this.questDescEl && this.questManager) {
      this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
    }
    if (this.worldMapManager?.currentMapDef) {
      const biome = this.worldMapManager.biomeManager?.currentBiomeDef;
      this.worldMapManager._updateHUDZoneInfo(this.worldMapManager.currentMapDef, biome);
    }
    if (this.squadHUD) {
      this.squadHUD.render();
    }

    const curBiome = this.worldMapManager?.currentMapDef?.biome || 'forest';
    if (this.audio && typeof this.audio.playBiomeMusic === 'function') {
      this.audio.playBiomeMusic(curBiome);
    }
  }

  _handleMonsterEncounter(monster) {
    if (this.state === 'TRANSITION' || this.state === 'COMBAT') return;
    this.state = 'TRANSITION';
    this.playerController.setEnabled(false);

    // Save exact position of player before entering battle
    this.savedPlayerPosition = this.player.position.clone();

    // Immediately close dialogue and hide overlays if in dialogue
    if (this.dialogSystem) {
      if (typeof this.dialogSystem.forceClose === 'function') {
        this.dialogSystem.forceClose(false);
      } else if (typeof this.dialogSystem.close === 'function') {
        this.dialogSystem.close();
      }
    }
    const dialogBox = document.getElementById('dialog-box-overlay');
    if (dialogBox) dialogBox.classList.add('hidden');

    // Immediately hide tutorial banner and interaction prompts
    if (this.tutorialManager) {
      this.tutorialManager.hideBanner();
    }
    if (this.npcManager) {
      this.npcManager.hideAllOverlays();
    }
    if (this.zoneParticleManager) {
      this.zoneParticleManager.group.visible = false;
    }

    this.currentBattlingMonsterId = monster.id;
    this.transition.playEncounter(
      async () => {
        // Blackout hook: hide Overworld UI and trigger battle in main
        this.overworldHudEl.classList.add('hidden');
        if (this.npcManager) {
          this.npcManager.hideAllOverlays();
        }
        if (this.tutorialManager) {
          this.tutorialManager.hideBanner();
        }
        if (this.zoneParticleManager) {
          this.zoneParticleManager.group.visible = false;
        }
        if (this.onStartBattle) {
          this.state = 'COMBAT';
          const curMap = this.worldMapManager?.currentMapDef;
          const zoneKey = curMap ? `${curMap.gx}_${curMap.gy}` : '3_3';
          this.currentBattlingZoneKey = zoneKey;
          await this.onStartBattle({
            level: 1,
            monsterId: monster.id,
            packData: monster.packData || null,
            biome: monster.biome || curMap?.biome || 'forest',
            zoneKey: zoneKey,
            zoneCoords: curMap ? [curMap.gx, curMap.gy] : [3, 3],
            isTutorial: monster.id === 'slime_garden_1'
          });
        }
      },
      () => {
        console.log('[OverworldManager] Tactical battle initialized.');
      }
    );
  }

  async triggerDirectQuestBattle(customMonsterId, biome = 'forest') {
    const curMap = this.worldMapManager?.currentMapDef;
    const monsterObj = {
      id: customMonsterId,
      biome: biome || curMap?.biome || 'forest',
      packData: null
    };
    await this._handleMonsterEncounter(monsterObj);
  }

  async resumeAfterVictory() {
    const battlingMonsterId = this.currentBattlingMonsterId;
    const curMap = this.worldMapManager ? this.worldMapManager.currentMapDef : null;
    const battlingZoneKey = this.currentBattlingZoneKey || (curMap ? `${curMap.gx}_${curMap.gy}` : '3_3');

    // 1. Return fade transition back to Overworld
    await this.transition.playReturn(
      () => {
        // Place player exactly where they encountered the monster (slightly stepped back)
        if (this.player && this.savedPlayerPosition) {
          this.player.teleport(this.savedPlayerPosition.x, this.savedPlayerPosition.y, this.savedPlayerPosition.z);
        }

        const curBiome = curMap ? curMap.biome : 'forest';
        if (this.audio && typeof this.audio.playBiomeMusic === 'function') {
          this.audio.playBiomeMusic(curBiome);
        }

        // Despawn defeated monster with particle dissolution
        const monsterId = battlingMonsterId;
        if (monsterId && this.monsters) {
          this.monsters.despawnMonster(monsterId);
        }

        const key = battlingZoneKey;

        // Update quest state in Paladill & HUD if it was the tutorial slime
        if (monsterId === 'slime_garden_1' || (key === '3_3' && !battlingMonsterId)) {
          this.npcManager.setSlimeDefeated(true);
          if (this.questManager) {
            this.questManager.advanceStep('quest_slime_purification', 'defeat_slime', true);
          }
          if (this.tutorialManager) {
            this.tutorialManager.onSlimeDefeated();
          }
        }

        // Advance quest battle steps based on active zone and monster encountered
        if (this.questManager) {
          // Direct Quest Encounters
          if (monsterId === 'mob_bing_ambush' || (key === '3_2' && this.questManager.getQuest('quest_prove_ferocity')?.status === 'active')) {
            this.questManager.advanceStep('quest_prove_ferocity', 'defend_bing', true);
          }
          if (monsterId === 'mob_postman_bandits') {
            this.questManager.advanceStep('quest_lost_mail', 'find_mail', true);
          }
          if (monsterId === 'mob_rosalba_plant_guardian') {
            this.questManager.advanceStep('quest_forest_elixir', 'gather_moss', true);
            if (this.questInteractables) {
              this.questInteractables.loadForZone('2_2');
            }
          }
          if (monsterId === 'mob_armored_chimera') {
            this.questManager.advanceStep('quest_nomad_steel', 'gather_ores', true);
            if (this.equipmentManager && typeof this.equipmentManager.addItemToInventory === 'function') {
              this.equipmentManager.addItemToInventory('hardened_ore');
            }
          }
          if (monsterId === 'mob_shadow_mirror' || (key === '1_3' && this.questManager.getQuest('quest_shadow_mirror')?.status === 'active')) {
            this.questManager.advanceStep('quest_shadow_mirror', 'defeat_shadow', true);
          }

          // Main quest battles in 3x3 Grid
          if (monsterId === 'mob_beaked_chimera' || (key === '3_1' && monsterId === 'mob_beaked_chimera')) {
            this.questManager.advanceStep('quest_hunt_beaked_chimera', 'defeat_beaked_alpha', true);
          }
          if (monsterId === 'mob_pomodoro_battle' || (key === '2_1' && monsterId === 'mob_pomodoro_battle')) {
            this.questManager.advanceStep('quest_frozen_seed', 'reach_arctic', true);
            this.questManager.advanceStep('quest_frozen_seed', 'defend_pomodoro', true);
          }
          if (monsterId === 'mob_polar_golem' || key === '1_1') {
            this.questManager.advanceStep('quest_blizzard_core', 'reach_peaks', true);
            this.questManager.advanceStep('quest_blizzard_core', 'defeat_golem', true);
            this.questManager.completeQuest('quest_blizzard_core');
          }
          if (monsterId === 'mob_oracle_chimera' || (key === '1_3' && monsterId === 'mob_oracle_chimera')) {
            this.questManager.advanceStep('quest_forbidden_resonance', 'reach_sanctuary', true);
            this.questManager.advanceStep('quest_forbidden_resonance', 'defeat_sapidae', true);
          }
          if (key === '2_3') {
            this.questManager.advanceStep('quest_sulfur_threshold', 'reach_threshold', true);
            this.questManager.advanceStep('quest_sulfur_threshold', 'defeat_sulfur_guards', true);
          }
          if (key === '3_3') {
            this.questManager.advanceStep('quest_primeval_purification', 'enter_catacombs', true);
            this.questManager.advanceStep('quest_primeval_purification', 'defeat_crypt_lord', true);
          }

          // Secondary quest battles
          if (key === '3_1' || key === '3_2') {
            const qHunter = this.questManager.getQuest('quest_keen_eye_trial');
            if (qHunter && qHunter.status === 'active') {
              this.questManager.advanceStep('quest_keen_eye_trial', 'win_hunt_battle', true);
            }
          }
          if (key === '1_1') this.questManager.advanceStep('quest_dark_frost_totems', 'purify_totems', true);
          if (key === '2_3') this.questManager.advanceStep('quest_forgotten_miner_relic', 'find_golden_pickaxe', true);
        }

        if (this.questDescEl) {
          this.questDescEl.textContent = this.questManager ? this.questManager.getActiveHUDTrackerText() : 'Chimera defeated! Talk to Master Paladill [E]';
        }
        this.currentBattlingMonsterId = null;

        this.overworldHudEl.classList.remove('hidden');
        if (this.squadHUD) {
          this.squadHUD.render();
        }
        if (this.zoneParticleManager) {
          this.zoneParticleManager.group.visible = true;
        }
        this.state = 'EXPLORING';
        if (this.onStateChange) this.onStateChange('OVERWORLD');
        if (this.playerController) this.playerController.setEnabled(true);
      },
      () => {
        const qBing = this.questManager?.getQuest('quest_prove_ferocity');
        const findBingDone = qBing?.objective?.steps?.find(s => s.id === 'find_bing')?.done;
        const defendBingDone = qBing?.objective?.steps?.find(s => s.id === 'defend_bing')?.done;
        const recruitBingDone = qBing?.objective?.steps?.find(s => s.id === 'recruit_bing')?.done;

        const qPomo = this.questManager?.getQuest('quest_frozen_seed');
        const reachPomoDone = qPomo?.objective?.steps?.find(s => s.id === 'reach_arctic')?.done;
        const defendPomoDone = qPomo?.objective?.steps?.find(s => s.id === 'defend_pomodoro')?.done;
        const recruitPomoDone = qPomo?.objective?.steps?.find(s => s.id === 'recruit_pomodoro')?.done;

        if (battlingMonsterId === 'slime_garden_1') {
          this._showBannerMessage('CHIMERA PURIFIED!', 'The garden is safe. Return to Master Paladill.');
        } else if (battlingMonsterId === 'mob_bing_ambush' || (battlingZoneKey === '3_2' && qBing?.status === 'active' && defendBingDone && !recruitBingDone)) {
          this._showBannerMessage('VICTORY WITH BING!', 'Talk to Bing to seal his recruitment into your squad [E].');
        } else if (battlingMonsterId === 'mob_postman_bandits') {
          this._showBannerMessage('MAILBAG RECOVERED!', 'Return it to the Postman at the Dojo [2, 2] [E].');
        } else if (battlingMonsterId === 'mob_rosalba_plant_guardian') {
          this._showBannerMessage('LUMINOUS MOSS OBTAINED!', 'Bring it to Herbalist Rosalba in [2, 2] [E].');
        } else if (battlingMonsterId === 'mob_armored_chimera') {
          this._showBannerMessage('MINERAL CARAPACE OBTAINED!', 'Bring the shards to Baruk the Blacksmith in [3, 1] [E].');
        } else if (battlingMonsterId === 'mob_shadow_mirror') {
          this._showBannerMessage('ILLUSORY SHADOW DISPELLED!', 'Talk to the Spirit Shaman in [1, 3] [E].');
        } else if (battlingMonsterId === 'mob_pomodoro_battle' || (battlingZoneKey === '2_1' && qPomo?.status === 'active' && defendPomoDone && !recruitPomoDone)) {
          this._showBannerMessage('VICTORY WITH POMODORO!', 'Talk to Pomodoro to formalize his recruitment [E].');
        } else if (battlingMonsterId === 'mob_polar_golem' || battlingZoneKey === '1_1') {
          this._showBannerMessage('🎉 BLIZZARD DISPELLED!', 'The Polar Golem has fallen. The path to Astral Nebula [1, 2] is clear.');
        } else if (battlingMonsterId === 'mob_oracle_chimera') {
          this._showBannerMessage('DARK RESONANCE NEUTRALIZED!', 'Talk to the Astral Oracle in [1, 3] to consecrate victory [E].');
        } else {
          this._showBannerMessage('COMBAT VICTORY!', 'The wild creatures have been defeated.');
        }
      }
    );
  }

  async resumeAfterDefeat() {
    // Return fade transition back to Overworld (safe Dojo sanctuary spawn)
    await this.transition.playReturn(
      async () => {
        // Teleport player back safely to the central peaceful Dojo sanctuary [3, 3]
        if (this.worldMapManager) {
          await this.worldMapManager.changeMap('zone_2_2');
        } else if (this.player) {
          this.player.teleport(0, 0, 2, Math.PI);
        }

        this.currentBattlingMonsterId = null;
        if (this.monsters) {
          this.monsters.isEncounterTriggered = false;
        }

        this.overworldHudEl.classList.remove('hidden');
        if (this.squadHUD) {
          this.squadHUD.render();
        }
        if (this.zoneParticleManager) {
          this.zoneParticleManager.group.visible = true;
        }
        this.state = 'EXPLORING';
        if (this.onStateChange) this.onStateChange('OVERWORLD');
        if (this.playerController) {
          this.playerController.setEnabled(true);
        }
      },
      () => {
        this._showBannerMessage('RECOVERY AT THE DOJO', 'Your heroes rest at the dojo. Prepare yourself and return to battle.');
      }
    );
  }

  _showBannerMessage(title, desc, isPinned = false) {
    const banner = document.getElementById('turn-banner');
    if (!banner) return;
    const bannerTitle = document.getElementById('banner-title');
    const bannerSub = document.getElementById('banner-subtitle');
    if (bannerTitle) bannerTitle.textContent = title;
    if (bannerSub) bannerSub.textContent = desc;

    if (this.npcManager) {
      this.npcManager._isBannerShowing = true;
      if (this.npcManager.speechBubbleEl) {
        this.npcManager.speechBubbleEl.classList.add('hidden');
      }
    }

    banner.className = 'turn-banner hidden';
    void banner.offsetWidth;

    const isComplete = title.includes('COMPLETADA') || title.includes('PURIFICADA') || title.includes('VICTORIA');
    banner.className = `turn-banner quest-notification ${isComplete ? 'quest-completed' : 'quest-accepted'}`;

    if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
    if (!isPinned) {
      this._bannerTimeout = setTimeout(() => {
        banner.classList.add('hidden');
        if (this.npcManager) {
          this.npcManager._isBannerShowing = false;
        }
      }, 3200);
    }
  }

  _hideBannerMessage() {
    const banner = document.getElementById('turn-banner');
    if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
    if (banner) banner.classList.add('hidden');
    if (this.npcManager) {
      this.npcManager._isBannerShowing = false;
    }
  }

  update(dt, time) {
    if (this.stylizedEnv) {
      this.stylizedEnv.update(dt);
    }
    if (this.dojoRockSanctuary) {
      this.dojoRockSanctuary.update(dt);
    }
    if (this.stylizedRiver) {
      this.stylizedRiver.update(dt);
    }
    if (this.dojoBambooGrove) {
      this.dojoBambooGrove.update(dt);
    }
    if (this.dojoBuilding) {
      this.dojoBuilding.update(dt);
    }
    if (this.forestNatureManager) {
      this.forestNatureManager.update(dt);
    } else if (this.dojoNatureManager) {
      this.dojoNatureManager.update(dt);
    }
    if (this.dojoPond) {
      this.dojoPond.update(dt);
    }
    if (this.westPond) {
      this.westPond.update(dt);
    }
    if (this.magicalSkybox) {
      this.magicalSkybox.update(dt, this.camera);
    }
    if (this.zoneParticleManager && this.state !== 'COMBAT') {
      const pPos = (this.player && this.player.position) ? this.player.position : null;
      this.zoneParticleManager.update(dt, pPos, this.camera);
    }

    // Live Player Coordinate HUD display
    const coordEl = document.getElementById('hud-player-coord-display');
    if (coordEl && this.player && this.player.position) {
      coordEl.textContent = `📍 Pos: X ${this.player.position.x.toFixed(1)} | Z ${this.player.position.z.toFixed(1)}`;
    }

    if (this.state === 'CINEMATIC') {
      this.flythrough.update(dt);
    } else if (this.state === 'HERO_PRESENTATION' || this.state === 'EXPLORING' || this.state === 'DIALOG') {
      if (this.dialogSystem && this.dialogSystem.isActive) {
        if (this.playerController.enabled) this.playerController.setEnabled(false);
      } else if (this.state === 'EXPLORING') {
        const isModalOpen = this.isAnyModalOpen();
        if (isModalOpen) {
          if (this.playerController.enabled) this.playerController.setEnabled(false);
        } else {
          if (!this.playerController.enabled) this.playerController.setEnabled(true);
        }
      }

      this.playerController.update(dt, time);
      this.player.update(dt, time);
      this.cameraController.update(dt);
      this.npcManager.update(dt, time, this.player.position);
      this.monsters.update(dt, time, this.player.position);
      if (this.questInteractables && this.player && this.player.position) {
        this.questInteractables.update(dt, this.player.position);
      }

      if (this.worldMapManager) {
        if (this.player && this.player.position) {
          const px = this.player.position.x;
          const pz = this.player.position.z;
          const subQ = (px < 0 ? (pz < 0 ? 'NW' : 'SW') : (pz < 0 ? 'NE' : 'SE'));
          if (this.currentSubQuadrant !== subQ) {
            this.currentSubQuadrant = subQ;
            this.worldMapManager.setSubQuadrant(subQ);
          }
        }
        this.worldMapManager.update(dt);
      }

      this._updateQuestNavigation(dt, time);
      if (this.dojoPond) {
        this.dojoPond.update(dt);
      }
      if (this.westPond) {
        this.westPond.update(dt);
      }
      if (this.savannahOasis) {
        this.savannahOasis.update(dt);
      }
      if (this.arcticFrozenLake) {
        this.arcticFrozenLake.update(dt);
      }
      if (this.arcticFrozenLake2) {
        this.arcticFrozenLake2.update(dt);
      }
      if (this.mysticPond) {
        this.mysticPond.update(dt);
      }
      if (this.dojoNatureManager) {
        this.dojoNatureManager.update(dt);
      }
      if (this.biomeDecorationManager && typeof this.biomeDecorationManager.update === 'function') {
        this.biomeDecorationManager.update(dt);
      }
    } else {
      if (this.npcManager) {
        this.npcManager.hideAllOverlays();
      }
      this._updateQuestNavigation(dt, time);
      if (this.dojoPond) {
        this.dojoPond.update(dt);
      }
      if (this.westPond) {
        this.westPond.update(dt);
      }
      if (this.savannahOasis) {
        this.savannahOasis.update(dt);
      }
      if (this.arcticFrozenLake) {
        this.arcticFrozenLake.update(dt);
      }
      if (this.arcticFrozenLake2) {
        this.arcticFrozenLake2.update(dt);
      }
      if (this.mysticPond) {
        this.mysticPond.update(dt);
      }
      if (this.dojoNatureManager) {
        this.dojoNatureManager.update(dt);
      }
      if (this.biomeDecorationManager && typeof this.biomeDecorationManager.update === 'function') {
        this.biomeDecorationManager.update(dt);
      }
    }
  }

  _updateQuestNavigation(dt, time) {
    if (!this.questManager || !this.player) return;

    const curMap = this.worldMapManager?.currentMapDef;
    const curGx = curMap ? curMap.gx : 3;
    const curGy = curMap ? curMap.gy : 3;

    const nav = this.questManager.getNavigationTarget(curGx, curGy, this.player.position, curMap);
    const isNavActive = nav && (this.state === 'EXPLORING' || this.state === 'HERO_PRESENTATION');

    if (!isNavActive) {
      if (this.player.setNavTarget) {
        this.player.setNavTarget(null, false);
      }
      if (this.worldMapManager?.transitionManager) {
        this.worldMapManager.transitionManager.setHighlightedPortal(null);
      }
      if (this.questTargetArrow) {
        this.questTargetArrow.visible = false;
      }
      if (this.questNavigatorEl) {
        this.questNavigatorEl.classList.add('hidden');
      }
      return;
    }

    // Live tracking of roaming tutorial slime or Maestro Paladill if active
    let hasAttachedMobArrow = false;
    if (nav && nav.quest && nav.isCurrentZone) {
      if (nav.quest.id === 'quest_slime_purification') {
        const isSlimeStep = Boolean(nav.stepDesc && (nav.stepDesc.toLowerCase().includes('derrotar') || nav.stepDesc.toLowerCase().includes('slime')));
        if (isSlimeStep) {
          const slime = this.monsters?.monsters?.find(m => m.id === 'slime_garden_1');
          if (slime && slime.group) {
            nav.targetWorldPos = { x: slime.group.position.x, z: slime.group.position.z };
            if (slime.questArrow) {
              hasAttachedMobArrow = true;
            }
          }
        } else {
          const paladill = this.npcManager?.npcs?.find(n => n.id === 'paladill');
          if (paladill && paladill.group) {
            nav.targetWorldPos = { x: paladill.group.position.x, z: paladill.group.position.z };
          } else {
            nav.targetWorldPos = { x: -14.5, z: -8.5 };
          }
        }
      } else if (nav.quest.id === 'quest_hunt_beaked_chimera') {
        const isHuntStep = Boolean(nav.stepDesc && (nav.stepDesc.toLowerCase().includes('purif') || nav.stepDesc.toLowerCase().includes('chimera') || nav.stepDesc.toLowerCase().includes('quimera') || nav.stepDesc.toLowerCase().includes('beaked') || nav.stepDesc.toLowerCase().includes('picuda') || nav.stepDesc.toLowerCase().includes('alpha') || nav.stepDesc.toLowerCase().includes('alfa')));
        if (isHuntStep) {
          const beakedMob = this.monsters?.monsters?.find(m => m.id === 'mob_beaked_chimera');
          if (beakedMob && beakedMob.group) {
            nav.targetWorldPos = { x: beakedMob.group.position.x, z: beakedMob.group.position.z };
            nav.targetName = 'Alpha Beaked Chimera';
            if (beakedMob.questArrow) {
              hasAttachedMobArrow = true;
            }
          }
        }
      } else if (nav.quest.id === 'quest_nomad_steel') {
        const isOreStep = Boolean(nav.stepDesc && (nav.stepDesc.toLowerCase().includes('mineral') || nav.stepDesc.toLowerCase().includes('ore') || nav.stepDesc.toLowerCase().includes('chimera') || nav.stepDesc.toLowerCase().includes('quimera') || nav.stepDesc.toLowerCase().includes('armored') || nav.stepDesc.toLowerCase().includes('acorazada')));
        if (isOreStep) {
          const armoredMob = this.monsters?.monsters?.find(m => m.id === 'mob_armored_chimera');
          if (armoredMob && armoredMob.group) {
            nav.targetWorldPos = { x: armoredMob.group.position.x, z: armoredMob.group.position.z };
            nav.targetName = 'Armored Chimera';
            if (armoredMob.questArrow) {
              hasAttachedMobArrow = true;
            }
          }
        }
      } else if (nav.quest.id === 'quest_blizzard_core') {
        const isGolemStep = Boolean(nav.stepDesc && (nav.stepDesc.toLowerCase().includes('golem') || nav.stepDesc.toLowerCase().includes('gólem') || nav.stepDesc.toLowerCase().includes('defeat') || nav.stepDesc.toLowerCase().includes('derrotar')));
        if (isGolemStep) {
          nav.targetWorldPos = { x: 18.0, z: -8.0 };
          nav.targetName = 'Armored Polar Golem';
        }
      } else if (nav.quest.id === 'quest_frozen_seed') {
        const pomoNpc = this.npcManager?.npcs?.find(n => n.id === 'pomodoro_npc' || n.id === 'pomodoro');
        if (pomoNpc && pomoNpc.group) {
          nav.targetWorldPos = { x: pomoNpc.group.position.x, z: pomoNpc.group.position.z };
          nav.targetName = 'Pomodoro';
        }
      } else if (nav.quest.id === 'quest_astral_void_echoes' || nav.quest.id === 'quest_forbidden_resonance') {
        const isOracleStep = Boolean(nav.stepDesc && (nav.stepDesc.toLowerCase().includes('oracle') || nav.stepDesc.toLowerCase().includes('oráculo') || nav.stepDesc.toLowerCase().includes('oraculo') || nav.stepDesc.toLowerCase().includes('sanctuary') || nav.stepDesc.toLowerCase().includes('santurario')));
        if (isOracleStep || nav.quest.id === 'quest_forbidden_resonance') {
          const oracleNpc = this.npcManager?.npcs?.find(n => n.id === 'oracle');
          if (oracleNpc && oracleNpc.group) {
            nav.targetWorldPos = { x: oracleNpc.group.position.x, z: oracleNpc.group.position.z };
            nav.targetName = 'Astral Oracle';
          } else {
            nav.targetWorldPos = { x: 13.6, z: -24.2 };
            nav.targetName = 'Astral Oracle';
          }
        }
      }
    }

    // 1. 3D ground arrow around player
    if (this.player.setNavTarget) {
      this.player.setNavTarget(nav.targetWorldPos, true);
    }

    // 2. 3D exit portal highlight (if navigating across zones)
    if (this.worldMapManager?.transitionManager) {
      this.worldMapManager.transitionManager.setHighlightedPortal(nav.portalDirection);
    }

    // 3. 3D tutorial arrow above objective in current zone
    if (nav.isCurrentZone && nav.targetWorldPos && !hasAttachedMobArrow) {
      if (!this.questTargetArrow) {
        this.questTargetArrow = createQuestBeaconArrow3D(2.2);
        this.scene.add(this.questTargetArrow);
      }
      this.questTargetArrow.visible = true;
      this.questTargetArrow.position.set(nav.targetWorldPos.x, 0, nav.targetWorldPos.z);
      if (typeof this.questTargetArrow.updateAnimation === 'function') {
        this.questTargetArrow.updateAnimation(dt);
      }
    } else {
      if (this.questTargetArrow) {
        this.questTargetArrow.visible = false;
      }
    }

    // 3. UI HUD compass & label
    if (this.questNavigatorEl) {
      this.questNavigatorEl.classList.remove('hidden');

      if (this.navDirectionTextEl) {
        this.navDirectionTextEl.textContent = nav.directionText;
      }

      if (this.navCompassArrowEl) {
        if (nav.isCurrentZone) {
          this.navCompassArrowEl.textContent = '🎯';
        } else {
          const dirSymbols = {
            NORTH: '▲',
            SOUTH: '▼',
            EAST: '►',
            WEST: '◄'
          };
          this.navCompassArrowEl.textContent = dirSymbols[nav.portalDirection] || '🧭';
        }
      }
    }
  }

  async ensureZonePonds(targetMapId, gx, gy) {
    // 1. Dungeon Lava Pond [Zone 2, 3] at [-16.0, 14.0]
    if (gx === 2 && gy === 3) {
      if (!this.westPond) {
        console.log('[OverworldManager] Lazy-loading Dungeon Lava Pond [2, 3] on-demand...');
        this.westPond = new StylizedPond(this.scene, this.collisions, {
          id: 'zone_2_3_lava_pond',
          cx: -16.0,
          cz: 14.0,
          radH: 6.2,
          radV: 4.6,
          isLava: true,
          waterShallowColor: '#ff5500', // Incandescent molten orange
          waterDeepColor: '#6a0a00',    // Boiling crimson magma
          waterFoamColor: '#ffcc00',    // Glowing crust / golden foam
          basinColor: 0x141018,         // Volcanic basalt basin
          boulderColor: 0x221a24,       // Obsidian rocks
          collisionTag: 'zone_2_3_lava_pond_water',
          collisionTagPrefix: 'zone_2_3_lava_pond',
          zoneName: 'Igneous Stronghold Threshold [2, 3]'
        });
        await this.westPond.init();
        this.westPond.setVisible(true);
      }
    }

    // 2. Savannah Desert Oasis [Zone 3, 1] at [0.0, 0.0]
    if (gx === 3 && gy === 1) {
      if (!this.savannahOasis) {
        console.log('[OverworldManager] Lazy-loading Savannah Desert Oasis [3, 1] on-demand...');
        this.savannahOasis = new StylizedPond(this.scene, this.collisions, {
          id: 'savannah_oasis',
          cx: 0.0,
          cz: 0.0,
          radH: 7.2,
          radV: 5.4,
          isOasis: true,
          waterShallowColor: '#5ce1e6', // Crystal clear tropical cyan / azure
          waterDeepColor: '#1e88e5',    // Luminous sky blue azure
          waterFoamColor: '#f0fdff',    // Crisp foam white
          basinColor: 0xa47c4c,         // Golden wet sand basin
          boulderColor: 0xd48e55,       // Warm sandstone rocks
          collisionTag: 'savannah_oasis_water',
          collisionTagPrefix: 'savannah_oasis',
          zoneName: 'Savannah Oasis [3, 1]'
        });
        await this.savannahOasis.init();
        this.savannahOasis.setVisible(true);
      }
    }

    // 3. Arctic Frozen Lakes [Zone 1, 1]
    if (gx === 1 && gy === 1) {
      if (!this.arcticFrozenLake) {
        console.log('[OverworldManager] Lazy-loading Arctic Frozen Lake 1 [1, 1] on-demand...');
        this.arcticFrozenLake = new StylizedPond(this.scene, this.collisions, {
          id: 'arctic_frozen_lake',
          cx: -22.9,
          cz: 2.3,
          radH: 6.2,
          radV: 4.6,
          isFrozen: true,
          waterShallowColor: '#80e6fb',
          waterDeepColor: '#12609c',
          waterFoamColor: '#ffffff',
          basinColor: 0x364858,
          boulderColor: 0x768c9e,
          collisionTag: 'arctic_frozen_lake_water',
          collisionTagPrefix: 'arctic_frozen_lake',
          zoneName: 'Eternal Frost Valley [1, 1]'
        });
        await this.arcticFrozenLake.init();
        this.arcticFrozenLake.setVisible(true);
      }
      if (!this.arcticFrozenLake2) {
        console.log('[OverworldManager] Lazy-loading Arctic Frozen Lake 2 [1, 1] on-demand...');
        this.arcticFrozenLake2 = new StylizedPond(this.scene, this.collisions, {
          id: 'arctic_frozen_lake_2',
          cx: 3.7,
          cz: -26.1,
          radH: 6.2,
          radV: 4.6,
          isFrozen: true,
          waterShallowColor: '#80e6fb',
          waterDeepColor: '#12609c',
          waterFoamColor: '#ffffff',
          basinColor: 0x364858,
          boulderColor: 0x768c9e,
          collisionTag: 'arctic_frozen_lake_2_water',
          collisionTagPrefix: 'arctic_frozen_lake_2',
          zoneName: 'Eternal Frost Valley [1, 1]'
        });
        await this.arcticFrozenLake2.init();
        this.arcticFrozenLake2.setVisible(true);
      }
    }

    // 4. Mystic Astral Pond [Zone 1, 2] at [-16.0, 14.0]
    if (gx === 1 && gy === 2) {
      if (!this.mysticPond) {
        console.log('[OverworldManager] Lazy-loading Mystic Astral Pond [1, 2] on-demand...');
        this.mysticPond = new StylizedPond(this.scene, this.collisions, {
          id: 'mystic_pond',
          cx: -16.0,
          cz: 14.0,
          radH: 5.8,
          radV: 4.4,
          waterShallowColor: '#f472b6', // Radiant magical rose / pink
          waterDeepColor: '#701a75',    // Deep luminous purple / violet
          waterFoamColor: '#fdf4ff',    // Ethereal stardust white foam
          basinColor: 0x2e1045,         // Deep amethyst basin
          boulderColor: 0xa855f7,       // Mystic purple crystal stone
          collisionTag: 'mystic_pond_water',
          collisionTagPrefix: 'mystic_pond',
          zoneName: 'Astral Glade of Lunacia [1, 2]'
        });
        await this.mysticPond.init();
        this.mysticPond.setVisible(true);
      }
    }
  }

  render(time, dt) {
    this.renderer.render(this.scene, this.camera);
  }
}
