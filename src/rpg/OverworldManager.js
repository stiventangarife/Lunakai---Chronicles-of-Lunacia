// OverworldManager.js - Master Coordinator for the Overworld RPG Scene (Dojo of Lunacia)
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { PlayerEntity } from './PlayerEntity.js';
import { OverworldCamera } from './OverworldCamera.js';
import { CameraOcclusion } from './CameraOcclusion.js';
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
import { MAP_REGISTRY } from './world/MapRegistry.js';
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
import { TutorialDirector } from './tutorial/TutorialDirector.js';
import { SquadHUD } from './ui/SquadHUD.js';
import { SquadModal } from './ui/SquadModal.js';
import { MinimapHUD } from './ui/MinimapHUD.js';
import { portraitService } from '../tactics/CharacterPortraitService.js';
import { SAPIDAE_CLASSES } from './SaveSlotManager.js';
import { QuestInteractablesManager } from './world/QuestInteractablesManager.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { OverworldLODManager } from './world/OverworldLODManager.js';
import { EnvironmentSystem } from './world/EnvironmentSystem.js';
import { DemoScenaZone22 } from './world/demo_scena/DemoScenaZone22.js';
import { DemoScenaDebugUI } from './world/demo_scena/DemoScenaDebugUI.js';
import { SavannaZone } from './world/savanna/SavannaZone.js';
import { createGrandIslands, getActiveGrandIsland, GRAND_ISLAND_ZONES } from './world/islands/GrandIslands.js';
import { canonicalZoneId, FERRY_DOCKS, mergedBattleAnchor } from './world/islands/IslandWorldLayout.js';
import { PALADILL_SPOT } from './world/ForestVillageLayout.js';
import * as i18n from '../i18n/i18n.js';
import { waitForLoads, holdLoads, trackLoad } from '../render/LoadGate.js';
import { perfMark } from '../debug/PerfProbe.js';

/**
 * The 80 m terrains of the demo 1.0.0 grid (9 macro-zones) are retired: every zone is now one of the
 * 5 islands. Their builders stay in the codebase but are not created; StylizedEnvironment only provides
 * the base lights and fog that EnvironmentSystem expects.
 */
const LEGACY_DEMO_WORLD = false;

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
    this.cameraController.om = this;
    // Hito 74: la cámara no se mete dentro de casas, rocas ni laderas; lo fino (árboles) se transparenta
    this.cameraController.occlusion = new CameraOcclusion(this);
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
    this.squadModal = this.equipmentManager ? new SquadModal(this.equipmentManager, this.audio) : null;
    this.questManager = new QuestManager(this.equipmentManager, this.audio);
    this.monsters.questManager = this.questManager;
    this.questInteractables = new QuestInteractablesManager(this.scene, this.questManager, this.audio, this);
    this.questBookModal = new QuestBookModal(this.questManager, this.audio);
    this.tutorialManager = new TutorialDirector(this); // Hito 48: tutorial nuevo (cinemática + 7 fases)
    this.lodManager = new OverworldLODManager(this);
    window.overworldLODManager = this.lodManager;
    this.environmentSystem = null;
    this.demoScenaZone = new DemoScenaZone22(this);
    this.demoScenaDebugUI = null;
    this.savannaZone = new SavannaZone(this);
    // Hito 23: Arctic / Mystic / Dungeon grand islands (built lazily on first visit)
    this.grandIslands = createGrandIslands(this);

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
    this._wireSquadModal();

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
        this._syncWorldEquipment(); // Hito 96: el mismo camino que la Forja (Sapidae y arma del Axie compañero)
        if (this.equipmentManager && typeof this.equipmentManager._updateSapidaePortrait === 'function') {
          this.equipmentManager._updateSapidaePortrait();
        }
        if (slot === 'weapon' && itemId === 'wood_sword') {
          if (this.tutorialManager && typeof this.tutorialManager.onSwordEquipped === 'function') {
            this.tutorialManager.onSwordEquipped();
          }
          if (this.questManager) {
            this.questManager.advanceStep('quest_slime_purification', 'equip_sword', true);
          }
          if (this.questDescEl) {
            this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
          }
        }
      };
      this.inventoryModal.onItemUnequipped = (heroId, slot) => {
        this._syncWorldEquipment();
        if (this.equipmentManager && typeof this.equipmentManager._updateSapidaePortrait === 'function') {
          this.equipmentManager._updateSapidaePortrait();
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
      // Hito 74: en Genesis, al aceptar la misión de Kotaro o hablar con Tripp aparece su combate (sin salir de la isla)
      const cm = this.worldMapManager?.currentMapDef;
      if (cm && cm.gx === 2 && cm.gy === 3 && this.state !== 'COMBAT' && this.monsters?.isCombatEnabled && typeof this.monsters.ensureGenesisQuestMonsters === 'function') {
        clearTimeout(this._genesisMobTimer);
        this._genesisMobTimer = setTimeout(() => { this.monsters.ensureGenesisQuestMonsters().catch(() => {}); }, 300);
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
    if (!this.squadModal && equipmentManager) {
      this.squadModal = new SquadModal(equipmentManager, this.audio);
      this._wireSquadModal();
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
      // Crónica Celeste: rótulo de presentación en el tercio inferior izquierdo. No tapa al héroe (que saluda en el centro),
      // muestra su clase y su compañero, y una hebra dorada indica cuándo empieza la exploración por sí sola.
      el.className = 'lk-ui lk-intro hidden';
      el.innerHTML = `
        <div class="lk-intro__scrim" aria-hidden="true"></div>
        <div class="lk-intro__card" role="status">
          <span class="lk-intro__kicker"><i></i>${i18n.t('overworld.introKicker')}</span>
          <h2 id="intro-hero-name" class="lk-intro__name">Lunakai</h2>
          <div class="lk-intro__line" aria-hidden="true"><i></i></div>
          <div class="lk-intro__meta">
            <span class="lk-intro__chip">
              <span class="lk-intro__cls"><img id="intro-hero-class-ico" src="./assets/classes/class_forjacubiles.webp" alt=""></span>
              <span class="lk-intro__txt"><small id="intro-hero-role">Sapidae · ${i18n.t('overworld.levelShort', { n: 1 })}</small><b id="intro-hero-class">${SAPIDAE_CLASSES.crafter.name}</b></span>
            </span>
            <span class="lk-intro__chip">
              <span class="lk-intro__med" id="intro-hero-avatar"></span>
              <span class="lk-intro__txt"><small>${i18n.t('overworld.companion')}</small><b id="intro-hero-companion">Shinji</b></span>
            </span>
          </div>
          <div class="lk-intro__go"><span class="lk-intro__prog" aria-hidden="true"><i></i></span><span class="lk-intro__hint"><kbd>${i18n.t('overworld.keySpace')}</kbd> ${i18n.t('overworld.startExploring')}</span></div>
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
      el.className = 'lk-ui lk-ow-hud hidden';
      // HUD de exploración (Crónica Celeste · pantalla 20): vive en los bordes y sin cajas.
      // Se conservan los ids que leen OverworldManager, WorldMapManager y el tutorial.
      const I = (n) => `./assets/ui/icons/${n}.png`;
      const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3a9 9 0 1 0 6 15.7A7.5 7.5 0 1 1 15 3z" fill="currentColor"/></svg>';
      const circ = (id, icon, label, key) => `<button id="${id}" class="lk-btn-circle-icon" aria-label="${label}" title="${label} [${key}]"><img class="lk-ai" src="${I(icon)}" alt=""><span class="lk-key">${key}</span></button>`;
      el.innerHTML = `
        <div class="lk-ow-left">
          <div class="lk-minimap-slot" id="lk-minimap-slot"></div>
          <div class="lk-quest-widget" id="lk-quest-widget">
            <header>
              <span class="lk-ico">${MOON}</span>
              <b><small id="hud-quest-cat">${i18n.t('overworld.questCat')}</small><span id="hud-quest-title">Lunacia</span></b>
              <button type="button" class="lk-min-btn" id="hud-quest-toggle" aria-label="${i18n.t('overworld.collapseQuest')}" aria-expanded="true">–</button>
            </header>
            <div class="lk-qbody">
              <div id="hud-quest-obj" class="lk-obj"></div>
              <div id="overworld-quest-desc" class="lk-ow-src" hidden>${i18n.t('story.talkToPaladillDojo')}</div>
              <div id="overworld-quest-navigator" class="lk-ow-nav hidden">
                <span id="hud-nav-compass-arrow" class="lk-ow-nav__arrow">◆</span>
                <span id="hud-nav-direction-text" class="lk-ow-nav__txt">${i18n.t('overworld.plottingRoute')}</span>
              </div>
              <div id="overworld-zone-coord-badge" class="lk-ow-zone">
                <span class="hud-biome-dot" style="background:#22c55e"></span>
                <span class="hud-zone-name">${i18n.t('places.zone22Title')}</span>
                <span class="hud-zone-coord">[3, 3]</span>
                <span id="hud-subq-tag" class="hud-subq-badge">SE</span>
              </div>
            </div>
          </div>
        </div>

        <div class="lk-ow-menu">
          ${circ('btn-open-inventory', 'inventory', i18n.t('overworld.menuBackpack'), 'I')}
          ${circ('btn-open-squad', 'team', i18n.t('overworld.menuSquad'), 'K')}
          ${circ('btn-open-quest-book', 'mission', i18n.t('overworld.menuChronicle'), 'J')}
          ${circ('btn-open-world-map', 'map', i18n.t('overworld.menuMap'), 'M')}
          ${circ('btn-open-options', 'setting', i18n.t('overworld.menuOptions'), 'Esc')}
        </div>

        <div class="lk-ow-bottom" id="lk-ow-bottom"></div>

        <div class="lk-ow-keys">
          <span><kbd>WASD</kbd> ${i18n.t('overworld.keyMove')}</span><span><kbd>E</kbd> ${i18n.t('overworld.keyTalk')}</span><span><kbd>${i18n.t('overworld.keySpace')}</kbd> ${i18n.t('overworld.keyContinue')}</span><span><kbd>Q</kbd><kbd>R</kbd> ${i18n.t('overworld.keyRotate')}</span><span><kbd>${i18n.t('overworld.keyWheel')}</kbd> ${i18n.t('overworld.keyZoom')}</span>
          <span id="hud-player-coord-display" class="lk-ow-coord" hidden></span>
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
            this._showFeatureLockedFeedback(this.tutorialManager.lockMessage?.('worldMap') || i18n.t('overworld.lockMap'));
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
            this._showFeatureLockedFeedback(i18n.t('overworld.lockBackpack'));
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
            this._showFeatureLockedFeedback(i18n.t('overworld.lockChronicle'));
            return;
          }
          if (this.questBookModal) this.questBookModal.toggle();
        });
      }

      const trackerEl = el.querySelector('#lk-quest-widget');
      if (trackerEl) {
        trackerEl.style.cursor = 'pointer';
        trackerEl.title = i18n.t('overworld.openChronicle');
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

      const squadBtn = document.getElementById('btn-open-squad');
      if (squadBtn) {
        squadBtn.addEventListener('click', () => {
          if (this.isCombatActive()) return;
          if (this.tutorialManager && (this.tutorialManager.isCutsceneActive || this.tutorialManager.isOverlayActive)) return;
          if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('squad')) {
            this._showFeatureLockedFeedback(i18n.t('overworld.lockSquad'));
            return;
          }
          if (this.inventoryModal && this.inventoryModal.isOpen) {
            this.inventoryModal.close();
            if (this.inventoryModal.isOpen) return;
          }
          if (this.squadModal) this.squadModal.toggle();
        });
      }

      // Plegar / desplegar la misión del HUD (se recuerda en este navegador)
      const qWidget = document.getElementById('lk-quest-widget');
      const qToggle = document.getElementById('hud-quest-toggle');
      if (qWidget && qToggle) {
        let collapsed = false;
        try { collapsed = localStorage.getItem('axie_lk_hud_quest_collapsed') === '1'; } catch (_) { /* sin almacenamiento */ }
        const applyCollapse = () => {
          qWidget.classList.toggle('lk-is-collapsed', collapsed);
          qToggle.textContent = collapsed ? '+' : '–';
          qToggle.setAttribute('aria-expanded', String(!collapsed));
          qToggle.setAttribute('aria-label', collapsed ? i18n.t('overworld.expandQuest') : i18n.t('overworld.collapseQuest'));
        };
        applyCollapse();
        qToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          collapsed = !collapsed;
          try { localStorage.setItem('axie_lk_hud_quest_collapsed', collapsed ? '1' : '0'); } catch (_) { /* nada */ }
          applyCollapse();
        });
      }

      // El texto de la misión que escriben los gestores ("⭐ Título: paso") se reparte en título y objetivo
      const srcEl = document.getElementById('overworld-quest-desc');
      if (srcEl) {
        const syncQuest = () => {
          const raw = (srcEl.textContent || '').trim();
          const q = this.questManager && typeof this.questManager.getTrackedQuest === 'function' ? this.questManager.getTrackedQuest() : null;
          const titleEl = document.getElementById('hud-quest-title');
          const catEl = document.getElementById('hud-quest-cat');
          const objEl = document.getElementById('hud-quest-obj');
          let step = raw.replace(/^[^\p{L}\p{N}\[(]+/u, '');
          if (q && q.title && step.startsWith(q.title)) step = step.slice(q.title.length).replace(/^\s*:\s*/, '');
          if (titleEl) titleEl.textContent = q ? q.title : 'Lunacia';
          if (catEl) catEl.textContent = q ? (q.category === 'Principal' ? i18n.t('overworld.catMain') : i18n.t('overworld.catSide')) : i18n.t('overworld.catExplore');
          if (objEl) objEl.textContent = step || raw;
          // Seguimiento desactivado (Hito 63): el panel deja solo la línea de la zona
          const off = !!(this.questManager && typeof this.questManager.isTrackingOff === 'function' && this.questManager.isTrackingOff());
          const head = document.querySelector('#lk-quest-widget > header');
          if (head) head.style.display = off ? 'none' : '';
          if (objEl) objEl.style.display = off ? 'none' : '';
        };
        syncQuest();
        new MutationObserver(syncQuest).observe(srcEl, { childList: true, characterData: true, subtree: true });
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

    let pinEl = document.getElementById('hud-3d-quest-pin');
    if (!pinEl) {
      pinEl = document.createElement('div');
      pinEl.id = 'hud-3d-quest-pin';
      pinEl.className = 'hud-3d-quest-pin hidden';
      pinEl.innerHTML = `
        <span class="hud-quest-pin-icon">◆</span>
        <span id="hud-quest-pin-title" class="hud-quest-pin-title">${i18n.t('overworld.pinTarget')}</span>
        <span id="hud-quest-pin-dist" class="hud-quest-pin-dist">0m</span>
      `;
      document.body.appendChild(pinEl);
    }
    this.questPinEl = pinEl;

    if (!this.squadHUD) {
      this.squadHUD = new SquadHUD(el, this.equipmentManager, this.inventoryModal);
    }
    if (!this.minimapHUD) {
      this.minimapHUD = new MinimapHUD(this);
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
    this._showBannerMessage(i18n.t('overworld.featureLocked'), msg);
  }

  // Escuadrón (tecla K) ⇄ mochila (tecla I): cada panel abre el otro y el HUD del escuadrón se refresca al cambiarlo
  _wireSquadModal() {
    if (!this.squadModal) return;
    this.squadModal.onChange = () => {
      this._syncCompanionToSquad(true); // nuevo Axie principal: humo y cambio de compañero (19-oct)
      if (this.squadHUD) this.squadHUD.render();
      if (this.inventoryModal && this.inventoryModal.isOpen) this.inventoryModal._renderAll();
      if (typeof window !== 'undefined' && window.__AXIE_TACTICS_APP__?._saveCurrentProgress) window.__AXIE_TACTICS_APP__._saveCurrentProgress();
    };
    this.squadModal.onOpenInventory = (heroId) => { if (this.inventoryModal) this.inventoryModal.open(heroId); };
    if (this.inventoryModal) {
      this.inventoryModal.onOpenSquad = () => {
        this.inventoryModal.close();
        if (!this.inventoryModal.isOpen) this.squadModal.open();
      };
    }
  }

  /**
   * El Axie compañero del mundo abierto sigue al principal del escuadrón (squad[1]).
   * animate: el anterior desaparece en una nubecita de humo y aparece el nuevo (PlayerEntity.swapCompanion).
   */
  /**
   * Hito 96: el modelo del mundo (equipo del Sapidae y arma del Axie compañero) sigue al inventario venga de donde
   * venga el cambio: Mochila, Forja (al evolucionar la pieza se quita y al recogerla vuelve evolucionada), Tienda…
   * Escucha `EquipmentManager` y solo toca el modelo si cambió algo (el aviso también salta con la vida o el oro).
   */
  _syncWorldEquipment(force = false) {
    const em = this.equipmentManager;
    if (!em || !this.player) return;
    const eq = em.equipped?.sapidae || em.equipped?.kotaro || {};
    const key = JSON.stringify(Object.keys(eq).sort().map((k) => [k, eq[k] || null]));
    if (force || key !== this._worldEquipKey) {
      this._worldEquipKey = key;
      if (typeof this.player.applyEquipment === 'function') this.player.applyEquipment(eq);
    }
    this._refreshCompanionWeapon(); // ya compara con el arma que lleva
  }

  _watchEquipment() {
    const em = this.equipmentManager;
    if (!em || typeof em.addListener !== 'function') return;
    if (!this._onEquipChange) this._onEquipChange = () => this._syncWorldEquipment();
    em.addListener(this._onEquipChange); // no se duplica: addListener comprueba la referencia
  }

  /** El arma del Axie compañero es la que tenga equipada ese Axie en el inventario (Hito 52). */
  _refreshCompanionWeapon() {
    const em = this.equipmentManager;
    if (!em || !this.player || typeof this.player.setCompanionWeapon !== 'function') return;
    let w = null;
    try { w = em.getEquipped(this._companionHeroId)?.weapon || null; } catch (_) { w = null; }
    if (w === this.player.companionWeaponItem) return;
    this.player.setCompanionWeapon(w);
  }

  _syncCompanionToSquad(animate = true) {
    const em = this.equipmentManager;
    if (!em || !this.player || typeof em.getSquad !== 'function') return;
    const main = em.getSquad()[1] || 'kotaro';
    if (main === this._companionHeroId) { this._refreshCompanionWeapon(); return; }
    const base = em.heroesBase?.[main];
    if (!base) return;
    this._companionHeroId = main;
    // Bing y Pomodoro no tienen ID de Axie: se usa su modelo GLB (misma proporción que en combate)
    const GLB = { bing: 1.05 / 0.88, pomodoro: 1.0 / 0.88 };
    this.player.swapCompanion({
      axieId: base.axieId || null,
      genes: base.genes || null,
      name: base.name,
      modelFile: base.axieId || base.genes ? null : main,
      modelScale: GLB[main] || 1,
    }, { animate });
    // El arma del nuevo compañero: se guarda ya y se pone cuando termine de cargar su modelo
    let w = null;
    try { w = em.getEquipped(main)?.weapon || null; } catch (_) { w = null; }
    this.player.companionWeaponItem = w;
  }

  isAnyModalOpen() {
    if (this.isLoadingZone) return true;
    if (this.worldMapManager?.transitionManager?.isTransitioning) return true;
    const curtain = document.getElementById('zone-transition-curtain');
    if (curtain && (!curtain.classList.contains('hidden') || curtain.classList.contains('active'))) return true;

    if (this.inventoryModal && this.inventoryModal.isOpen) return true;
    if (this.squadModal && this.squadModal.isOpen) return true;
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
      '#dialog-box-overlay:not(.hidden), ' +
      '#start-screen-overlay:not(.hidden), ' +
      '#hero-select-modal:not(.hidden), ' +
      '.hero-select-modal:not(.hidden), ' +
      '#confirm-delete-modal:not(.hidden), ' +
      '#ferry-travel-modal:not(.hidden)'
    );
    return Boolean(activeModal);
  }

  _setupInput() {
    window.addEventListener('keydown', (e) => {
      // 0. Si el usuario está escribiendo en cualquier input o textarea, NO interceptar ninguna tecla (ej. nombre de personaje)
      const activeTag = document.activeElement?.tagName;
      const targetTag = e.target?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target?.isContentEditable) {
        if (e.code === 'Escape' && document.activeElement?.blur) {
          document.activeElement.blur();
        }
        return;
      }

      // Si la pantalla de inicio o el creador de personajes está abierto, no procesar atajos del Overworld
      const isStartOrCreatorOpen = document.querySelector(
        '#start-screen-overlay:not(.hidden), #hero-select-modal:not(.hidden), .hero-select-modal:not(.hidden), #confirm-delete-modal:not(.hidden)'
      );
      if (isStartOrCreatorOpen) {
        return;
      }

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
        if (this.squadModal && this.squadModal.isOpen) {
          this.squadModal.close();
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
          this._showFeatureLockedFeedback(i18n.t('overworld.lockBackpack'));
          e.preventDefault();
          return;
        }
        if (this.inventoryModal) {
          this.inventoryModal.toggle();
          e.preventDefault();
          return;
        }
      }

      if (e.code === 'KeyK') {
        if (inCombat) {
          e.preventDefault();
          return;
        }
        if (this.tutorialManager && !this.tutorialManager.isFeatureUnlocked('squad')) {
          this._showFeatureLockedFeedback(i18n.t('overworld.lockSquad'));
          e.preventDefault();
          return;
        }
        if (this.squadModal) {
          if (this.inventoryModal && this.inventoryModal.isOpen) {
            this.inventoryModal.close();
            if (this.inventoryModal.isOpen) { e.preventDefault(); return; }
          }
          this.squadModal.toggle();
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
          this._showFeatureLockedFeedback(i18n.t('overworld.lockChronicle'));
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
          this._showFeatureLockedFeedback(i18n.t('overworld.lockMap'));
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
    // 29-oct: mientras dura la carga (telón cerrado) los cálculos repartidos van en trozos grandes (LoadGate)
    const release = holdLoads();
    try {
      return await this._initImpl(heroConfig, slotData);
    } finally {
      release();
    }
  }

  async _initImpl(heroConfig = {}, slotData = null) {
    // 1. Build Stylized Meadow Environment (Grass, Flowers, Cobblestone SDF Path, Trees, Wind)
    if (!this.stylizedEnv) {
      console.log('[DIAG] Iniciando StylizedEnvironment...');
      this.stylizedEnv = new StylizedEnvironment(this.scene, { lightingOnly: !LEGACY_DEMO_WORLD });
      await this.stylizedEnv.init();
      console.log('[DIAG] StylizedEnvironment OK');

      // 1b. Build Magical Skybox and Zone Environmental Particles (legacy demo world only)
      if (LEGACY_DEMO_WORLD) {
        this.magicalSkybox = new MagicalSkybox(this.scene);
        this.zoneParticleManager = new ZoneParticleManager(this.scene);
      }

      // World boundaries (80x80 continuous ground with safe margin)
      this.collisions.bounds = {
        minX: -38.5,
        maxX: 38.5,
        minZ: -38.5,
        maxZ: 38.5
      };

      // Procedural trees handled in StylizedTrees setZone

      // 1c. Build Dojo Sanctuary Rock Formations & Column Ruins with Cascading Ivy [Zone 3, 3]
      if (LEGACY_DEMO_WORLD && !this.dojoRockSanctuary) {
        console.log('[DIAG] Iniciando DojoRockSanctuary...');
        this.dojoRockSanctuary = new DojoRockSanctuary(this.scene, this.collisions);
        await this.dojoRockSanctuary.init();
        console.log('[DIAG] DojoRockSanctuary OK');
      }

      // 1d. Build Dojo Stylized River, Stepping Stones & Swimming Fish [Zone 3, 3]
      if (LEGACY_DEMO_WORLD && !this.stylizedRiver) {
        console.log('[DIAG] Iniciando StylizedRiver...');
        this.stylizedRiver = new StylizedRiver(this.scene, this.collisions);
        await this.stylizedRiver.init();
        console.log('[DIAG] StylizedRiver OK');
      }

      // 1e. Build Dojo Bamboo Groves with GPU Wind Animation [Zone 3, 3]
      if (LEGACY_DEMO_WORLD && !this.dojoBambooGrove) {
        console.log('[DIAG] Iniciando DojoBambooGrove...');
        this.dojoBambooGrove = new DojoBambooGrove(this.scene, this.collisions);
        await this.dojoBambooGrove.init();
        console.log('[DIAG] DojoBambooGrove OK');
      }

      // 1f. Build Dojo Pagoda Temple Sanctuary [Zone 3, 3]
      if (LEGACY_DEMO_WORLD && !this.dojoBuilding) {
        console.log('[DIAG] Iniciando DojoBuilding...');
        this.dojoBuilding = new DojoBuilding(this.scene, this.collisions);
        await this.dojoBuilding.init();
        console.log('[DIAG] DojoBuilding OK');
      }

      // 1g. Build Forest Nature Elements (Stylized Nature MegaKit) [Zone 3, 3 and all Forest zones]
      if (LEGACY_DEMO_WORLD && !this.forestNatureManager) {
        console.log('[DIAG] Iniciando ForestNatureManager...');
        this.forestNatureManager = new ForestNatureManager(this.scene, this.collisions);
        this.dojoNatureManager = this.forestNatureManager;
        await this.forestNatureManager.init();
        console.log('[DIAG] ForestNatureManager OK');
      }

      // 1h. Build Dojo Stylized Pond with Pebble Border [Zone 3, 3]
      if (LEGACY_DEMO_WORLD && !this.dojoPond) {
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

    // Clean up previous hero model and companion if switching heroes or slots
    // (Hito 50: también se liberan su controlador —escuchadores de teclado— y su memoria de GPU;
    // antes cada partida cargada dejaba al jugador anterior entero en memoria)
    if (this.playerController) {
      this.playerController.dispose?.();
      this.playerController = null;
    }
    if (this.player) {
      if (this.player.companionGroup && this.player.companionGroup.parent) {
        this.scene.remove(this.player.companionGroup);
      }
      if (this.player.group && this.player.group.parent) {
        this.scene.remove(this.player.group);
      }
      this.player.dispose?.();
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

    // Saves made in a retired corner zone resume on its island, at the ferry dock
    const canonicalInitialId = canonicalZoneId(initialMapId);
    if (canonicalInitialId !== initialMapId) {
      initialMapId = canonicalInitialId;
      const dock = FERRY_DOCKS[initialMapId] && FERRY_DOCKS[initialMapId].arrive;
      if (dock) {
        spawnX = dock.x;
        spawnZ = dock.z;
        spawnYaw = dock.yaw;
      }
    }

    // 2. Initialize Sapidae Hero Entity with Companion Axie
    this.player = new PlayerEntity({
      om: this,
      heroId: heroConfig.id || 'kotaro',
      isSapidae: true,
      sapidaeModel: slotData?.sapidaeModel || heroConfig.sapidaeModel || 'sapidae-f-a',
      playerName: slotData?.playerName || heroConfig.playerName || 'Lunara',
      sapidaeClass: slotData?.sapidaeClass || heroConfig.sapidaeClass || 'crafter',
      customization: slotData?.customization || heroConfig.customization || null,
      equipped: this.equipmentManager ? (this.equipmentManager.equipped.kotaro || {}) : {},
      axieId: heroConfig.axieId || '10455',
      genes: heroConfig.genes || null,
      name: (heroConfig.name && heroConfig.name !== 'Kotaro') ? heroConfig.name : 'Shinji',
      heroClass: i18n.t('misc.sapidaeAdventurer'),
      archetype: i18n.t('misc.sapidaeExplorer', { name: heroConfig.name || 'Shinji' }),
      avatar: '',
      scale: 1.0,
      x: spawnX,
      y: spawnY,
      z: spawnZ,
      yaw: spawnYaw
    });

    console.log('[DIAG] Cargando modelo del jugador Sapidae y compañero Axie...');
    await this.player.loadModel(this.renderer);
    // El compañero que sigue al Sapidae es el Axie principal del escuadrón (al cargar, sin animación)
    this._companionHeroId = 'kotaro';
    this._syncCompanionToSquad(false);
    this._syncWorldEquipment(true);
    this._watchEquipment();
    this.scene.add(this.player.group);
    if (this.player.companionGroup && !this.player.companionGroup.parent) {
      this.scene.add(this.player.companionGroup);
    }
    console.log('[DIAG] Modelo jugador Sapidae OK');

    // Link player entity with equipmentManager and pre-render live portrait
    if (this.equipmentManager) {
      this.equipmentManager.playerEntity = this.player;
      if (this.equipmentManager.heroesBase && this.equipmentManager.heroesBase.sapidae) {
        this.equipmentManager.heroesBase.sapidae.customization = this.player.customization;
        this.equipmentManager.heroesBase.sapidae.modelType = this.player.sapidaeModel || 'sapidae-f-a';
        this.equipmentManager.heroesBase.sapidae.sapidaeClassKey = this.player.sapidaeClass || 'crafter';
        const cDef = SAPIDAE_CLASSES[this.player.sapidaeClass || 'crafter'];
        if (cDef) {
          this.equipmentManager.heroesBase.sapidae.class = cDef.name;
          this.equipmentManager.heroesBase.sapidae.classIcon = cDef.icon;
        }
      }
      if (typeof this.equipmentManager._updateSapidaePortrait === 'function') {
        this.equipmentManager._updateSapidaePortrait();
      }
    }

    // Dialog context with dynamic hero details: {heroName} = the Sapidae, {axieName} = main Axie of the squad
    this.dialogSystem.setHeroContext(this.player);
    this.dialogSystem.axieNameFn = () => {
      const em = this.equipmentManager;
      const id = em && typeof em.getSquad === 'function' ? em.getSquad()[1] : null;
      return (id && em.heroesBase && em.heroesBase[id] && em.heroesBase[id].name) || null;
    };

    // Real-time dynamic Axie model swapper
    // (Hito 50: se registra una sola vez. Antes se añadía uno nuevo en cada partida cargada y todos
    // recargaban el modelo del jugador a la vez: N cargas → N modelos y Axies en memoria)
    if (this._heroAxieListenerOn) { /* ya registrado */ } else window.addEventListener('heroAxieChanged', this._heroAxieListenerOn = async (e) => {
      const detail = e.detail;
      if (!this.player || !detail) return;
      if (this.player.heroId === detail.heroId || (!detail.heroId && this.player.heroId === 'kotaro')) {
        this.player.axieId = String(detail.axieId);
        if (detail.genes) this.player.genes = detail.genes;
        if (detail.name) this.player.name = detail.name;
        if (detail.archetype) this.player.archetype = detail.archetype;
        this.player.modelType = 'axie';
        if (this.player.mesh) {
          // Hito 50: el modelo que se sustituye se libera (geometrías clonadas propias y su animador);
          // antes se quedaba en la memoria de la GPU en cada partida cargada
          const old = this.player.mesh;
          this.player.group.remove(old);
          try {
            if (this.player.mixer) { this.player.mixer.stopAllAction(); this.player.mixer.uncacheRoot(old); }
            old.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose(); });
          } catch (_) { /* nada */ }
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
    this.playerController.setEnabled(false);
    this.cameraController.setFollowTarget(this.player, true);

    // 4. Initialize NPCs
    console.log('[DIAG] Iniciando NPCManager...');
    const initialMapDef = MAP_REGISTRY[initialMapId] || MAP_REGISTRY.zone_2_2;
    await this.npcManager.init(initialMapDef);
    console.log('[DIAG] NPCManager OK');
    if (initialMapId === 'zone_2_2') {
      this.collisions.addCircle(PALADILL_SPOT.x, PALADILL_SPOT.z, 1.2, 'npc_paladill');
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
    // Hito 50: se crea una sola vez. Antes, cada partida cargada creaba otro gestor y el anterior dejaba
    // sus grupos en la escena (y sus modelos y texturas en memoria): la memoria crecía con cada carga.
    if (!this.biomeDecorationManager) {
      this.biomeDecorationManager = new BiomeDecorationManager(this.scene, this.collisions, this.renderer);
    }
    await this.biomeDecorationManager.init();
    console.log('[DIAG] BiomeDecorationManager OK');

    // 7b. Isla del Bosque (DemoScenaZone22). Si la partida empieza en otra isla (Sabana o una de las
    //     grandes islas) no se construye ahora: se construye al viajar a ella (ensureForestBuilt), como
    //     la Sabana. Ahorra varios segundos de carga y su memoria cuando no se va a ver.
    const startsElsewhere = initialMapId === 'zone_3_2' || Boolean(GRAND_ISLAND_ZONES[initialMapId]);
    if (!startsElsewhere) {
      console.log('[DIAG] Iniciando DemoScenaZone22...');
      await this.ensureForestBuilt();
      console.log('[DIAG] DemoScenaZone22 OK');
    }

    // 7c. SavannaZone (Isla de la Sabana): ya no se construye al arrancar. Se construye la primera vez
    //     que se viaja a ella (WorldMapManager._ensureSavannaBuilt), como el Ártico, la Mística y Genesis.
    //     Ahorra ~1,4 s de carga, sus shaders y su memoria cuando la partida empieza en otra isla.

    // 8. Initialize Continuous Map & Biome System with loaded zone
    await this.worldMapManager.init(
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
        this._showBannerMessage(i18n.t('overworld.trainingBarrier'), reason, isPinned);
        if (this.audio && typeof this.audio.playCollision === 'function') {
          this.audio.playCollision();
        }
      };
      this.worldMapManager.transitionManager.onPortalUnblocked = () => {
        this._hideBannerMessage();
      };
    }

    // Initialize 3-Tier LOD & Culling for Overworld Scene
    if (this.lodManager) {
      this.lodManager.scanScene();
      this.worldMapManager.onMapChanged = () => {
        if (this.lodManager) {
          this.lodManager.scanScene();
        }
      };
    }

    // Initialize Centralized Environment System (Lighting, Atmosphere, Shadows, Presets & Post-Processing)
    if (!this.environmentSystem) {
      this.environmentSystem = new EnvironmentSystem(this);
      this.environmentSystem.init();
      window.environmentSystem = this.environmentSystem;
    }

    // Si estamos en la macro-zona [2, 2], reaplicar sus visuales, niebla cálida y luces dedicadas
    if (this.demoScenaZone && this.demoScenaZone.isActive && this.worldMap) {
      this.worldMap._updateZone22Visuals(true);
    }

    // Visor 3D de la mochila: se prepara detrás de la pantalla de carga (antes, la primera apertura
    // creaba su contexto WebGL, cargaba el modelo y compilaba: tirón de ~200–570 ms). Tope de 1,5 s
    // para no alargar la carga si la red va lenta (si no termina, sigue en segundo plano).
    if (this.inventoryModal && typeof this.inventoryModal.prewarmModel === 'function') {
      // 29-oct: se apunta como carga diferida: waitForLoads (tope 8 s) la espera con el resto detrás del telón
      trackLoad(this.inventoryModal.prewarmModel(), 'visor de la mochila');
    }

    // 29-oct: el pueblo del Bosque, los edificios GLB de la isla, las texturas de los caminos y las máscaras de
    // agua y pendiente se cargaban en diferido y entraban 1–3 s DESPUÉS de abrir el telón (tirones al empezar).
    // Se esperan aquí (tope 8 s) para que el precalentado los incluya.
    perfMark('carga: esperando cargas diferidas');
    const waited = await waitForLoads(8000);
    perfMark('carga: cargas diferidas listas');
    if (waited > 50) console.log(`[OverworldManager] Cargas diferidas esperadas antes de abrir el telón: ${waited} ms`);
    this.environmentSystem?.markShadowCastersDirty?.();

    // Precalentado final: ahora sí existen el composer, las luces definitivas, la forja y los nodos
    // de recolección. El de loadMap() se hizo antes de todo eso y sus programas no coinciden.
    if (this.worldMapManager && typeof this.worldMapManager._warmupShaders === 'function') {
      await this.worldMapManager._warmupShaders(this.renderer, this.scene, this.camera);
    }

    console.log('[OverworldManager] Initialized successfully with stylized assets, EnvironmentSystem and continuous map system!');
    this.isReadyToRender = true;
  }

  startPrologue() {
    this.state = 'CINEMATIC';
    if (this.onStateChange) this.onStateChange('INTRO');
    this.playerController.setEnabled(false);

    // Hide gameplay HUD during cinematic flight
    if (this.overworldHudEl) this.overworldHudEl.classList.add('hidden');
    if (this.squadHUD && this.squadHUD.container) this.squadHUD.container.classList.add('hidden');
    if (this.minimapHUD) this.minimapHUD.hide();
    const tutBanner = document.getElementById('overworld-tutorial-banner');
    if (tutBanner) tutBanner.classList.add('hidden');

    // Hito 48: cinemática del prólogo (papel y teatro de sombras) y, después, el tutorial en el Dojo
    if (this.tutorialManager && typeof this.tutorialManager.playOpening === 'function') {
      this.tutorialManager.playOpening();
      return;
    }
    this.flythrough.start(() => {
      this._presentHero();
    });
    if (this.audio && typeof this.audio.playCinematicMusic === 'function') {
      this.audio.playCinematicMusic();
    }
  }

  /** Hito 48: combate del tutorial con su configuración (defensa del Dojo, duelo con Paladill, prueba de la Ultimate). */
  startTutorialBattle(id, levelConfig) {
    if (this.state === 'TRANSITION' || this.state === 'COMBAT') return;
    this._handleMonsterEncounter({ id, biome: 'forest', packData: null, levelConfig, name: levelConfig?.title || '' });
  }

  _presentHero() {
    this.state = 'HERO_PRESENTATION';

    // Keep gameplay HUD hidden while presenting hero card
    if (this.overworldHudEl) this.overworldHudEl.classList.add('hidden');
    if (this.squadHUD && this.squadHUD.container) this.squadHUD.container.classList.add('hidden');
    if (this.minimapHUD) this.minimapHUD.hide();
    const tutBanner = document.getElementById('overworld-tutorial-banner');
    if (tutBanner) tutBanner.classList.add('hidden');

    // Position camera facing the hero nicely in the Dojo courtyard
    this.cameraController.distance = 15.0;
    this.cameraController.pitchAngle = 0.70;
    this.cameraController.currentAngle = Math.PI * 0.18;

    // Show Hero Presentation Card safely
    const INTRO_MS = 4200; // tiempo para leerlo; Espacio, E, Enter o clic lo cierran antes
    const nameEl = document.getElementById('intro-hero-name');
    if (nameEl && this.player) nameEl.textContent = this.player.name;
    const sapKey = this.player?.sapidaeClass || 'crafter';
    const cDef = SAPIDAE_CLASSES[sapKey] || SAPIDAE_CLASSES.crafter;
    const lvl = this.equipmentManager?.getProgression?.('sapidae')?.level || 1;
    const role = String(cDef?.archetype || '').match(/\(([^)]+)\)/)?.[1] || '';
    const classEl = document.getElementById('intro-hero-class');
    if (classEl) classEl.textContent = cDef?.name || 'Sapidae';
    const roleEl = document.getElementById('intro-hero-role');
    if (roleEl) roleEl.textContent = `${i18n.t('overworld.levelShort', { n: lvl })}${role ? ' · ' + role : ''}`;
    const clsIco = document.getElementById('intro-hero-class-ico');
    if (clsIco && cDef?.icon) clsIco.src = cDef.icon;
    const compEl = document.getElementById('intro-hero-companion');
    if (compEl && this.player) compEl.textContent = this.player.companionName || 'Shinji';

    // Medallón del compañero (retrato del axie)
    const avatarEl = document.getElementById('intro-hero-avatar');
    if (avatarEl && this.player) {
      const portraitKey = this.player.axieId || (this.player.heroId === 'kotaro' ? 'shinji' : this.player.heroId);
      const setImg = (src) => { if (src && avatarEl) avatarEl.innerHTML = `<img src="${src}" alt="">`; };
      avatarEl.innerHTML = '';
      const snap = portraitService.getPortraitSync(portraitKey) || portraitService.getPortraitSync(this.player.heroId);
      if (snap) setImg(snap);
      else portraitService.getPortrait(portraitKey).then(setImg).catch(() => {});
    }
    if (this.heroIntroCardEl) this.heroIntroCardEl.style.setProperty('--intro-ms', `${INTRO_MS}ms`);

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
        }, 350);
      } else {
        this.startFreeExploration();
      }
    };

    this._dismissHeroPresentation = dismissHeroPresentation;
    this._heroDismissTimer = setTimeout(dismissHeroPresentation, INTRO_MS);
  }

  startFreeExploration(slotData = null) {
    this.state = 'EXPLORING';
    if (this.onStateChange) this.onStateChange('OVERWORLD');
    this.playerController.setEnabled(true);
    if (this.overworldHudEl) this.overworldHudEl.classList.remove('hidden');
    if (this.squadHUD && this.squadHUD.container) {
      this.squadHUD.container.classList.remove('hidden');
    }
    if (this.minimapHUD) {
      this.minimapHUD.show();
    }

    // El tutorial sabe si está terminado (loadSaveData): lo retoma en su paso o lo deja todo abierto
    if (this.tutorialManager) {
      this.tutorialManager.start(false);
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

  /** Rótulo de la transición de combate: «Slime Espina ×3 · Valle del Dojō». */
  _encounterInfo(monster) {
    const raw = String(monster?.name || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s*\(x(\d+)\)\s*$/i, ' ×$1').trim();
    const foe = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : i18n.t('overworld.wildChimeras');
    const place = this.worldMapManager?.currentMapDef?.name || '';
    return { subtitle: place ? `${foe} · ${place}` : foe };
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

    if (this.player) {
      if (this.player.group) this.player.group.visible = false;
      if (this.player.companionGroup) this.player.companionGroup.visible = false;
    }

    this.currentBattlingMonsterId = monster.id;
    this.transition.playEncounter(
      async () => {
        // Blackout hook: hide Overworld UI and trigger battle in main
        this.overworldHudEl.classList.add('hidden');
        if (this.minimapHUD) this.minimapHUD.hide();
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
          // Packs of a retired corner zone keep that zone's key for quest progress
          const zoneKey = monster.logicalZone || (curMap ? `${curMap.gx}_${curMap.gy}` : '3_3');
          this.currentBattlingZoneKey = zoneKey;
          await this.onStartBattle({
            level: 1,
            monsterId: monster.id,
            packData: monster.packData || null,
            biome: monster.biome || curMap?.biome || 'forest',
            zoneKey: zoneKey,
            zoneCoords: monster.logicalZone ? monster.logicalZone.split('_').map(Number) : (curMap ? [curMap.gx, curMap.gy] : [3, 3]),
            isTutorial: monster.id === 'slime_garden_1',
            levelConfig: monster.levelConfig || null
          });
        }
      },
      () => {
        console.log('[OverworldManager] Tactical battle initialized.');
      },
      this._encounterInfo(monster)
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

    // Hito 106: los mobs de misión reaparecen. Solo dan su recompensa y su aviso de misión mientras la misión está
    // activa y su paso pendiente (se calcula ANTES de avanzar la misión, porque el aviso se muestra después).
    const questStepPending = (qid, sid) => {
      const q = this.questManager?.getQuest(qid);
      if (!q || (q.status !== 'active' && q.status !== 'ready_to_turn_in')) return false;
      const st = q.objective?.steps?.find((x) => x.id === sid);
      return Boolean(st && !st.done);
    };
    const nomadPending = questStepPending('quest_nomad_steel', 'gather_ores');
    const blizzardPending = this.questManager?.getQuest('quest_blizzard_core')?.status !== 'completed';

    // 1. Return fade transition back to Overworld
    await this.transition.playReturn(
      () => {
        // Place player exactly where they encountered the monster (slightly stepped back)
        if (this.player) {
          if (this.player.group) this.player.group.visible = true;
          if (this.player.companionGroup) this.player.companionGroup.visible = true;
          if (this.savedPlayerPosition) {
            this.player.teleport(this.savedPlayerPosition.x, this.savedPlayerPosition.y, this.savedPlayerPosition.z);
          }
          if (this.cameraController) {
            this.cameraController.setFollowTarget(this.player, true);
          }
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
        if (monsterId && this.demoScenaZone && this.demoScenaZone.slimeCreaturesManager) {
          this.demoScenaZone.slimeCreaturesManager.despawnSlime(monsterId);
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
              this.questInteractables.refreshQuestNodes('2_2'); // solo objetos de misión (Hito 64)
            }
          }
          if (monsterId === 'mob_armored_chimera') {
            this.questManager.advanceStep('quest_nomad_steel', 'gather_ores', true);
            if (nomadPending && this.equipmentManager && typeof this.equipmentManager.addItemToInventory === 'function') {
              this.equipmentManager.addItemToInventory('hardened_ore');
            }
          }
          if (monsterId === 'mob_shadow_mirror' || (key === '1_3' && this.questManager.getQuest('quest_shadow_mirror')?.status === 'active')) {
            this.questManager.advanceStep('quest_shadow_mirror', 'defeat_shadow', true);
          }

          // Main quest battles in 3x3 Grid
          if (monsterId === 'mob_beaked_chimera' || monsterId?.includes('beaked') || (key === '3_1' && monsterId === 'mob_beaked_chimera') || (key === '3_2' && monsterId?.includes('beaked'))) {
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
          if (monsterId === 'mob_oracle_chimera' || key === '1_3') {
            this.questManager.advanceStep('quest_forbidden_resonance', 'reach_sanctuary', true);
            this.questManager.advanceStep('quest_forbidden_resonance', 'defeat_sapidae', true);
          }
          // Hito 74: solo el combate de los Guardianes de Genesis cuenta para Kotaro (antes cualquiera de la isla)
          if (monsterId === 'mob_genesis_guardians') {
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
          // Hito 74: el pico de Tripp lo tiene el Guardián de Cristal de la cantera (antes cualquier combate de la isla)
          if (monsterId === 'mob_crystal_guardian') this.questManager.advanceStep('quest_forgotten_miner_relic', 'find_golden_pickaxe', true);
        }

        if (this.questDescEl) {
          this.questDescEl.textContent = this.questManager ? this.questManager.getActiveHUDTrackerText() : '';
        }
        this.currentBattlingMonsterId = null;
        // Hito 48: el tutorial sigue con su siguiente paso
        if (this.tutorialManager && typeof this.tutorialManager.onBattleReturn === 'function') {
          this.tutorialManager.onBattleReturn(battlingMonsterId, true);
        }
        this.player?.releaseHiddenFace?.(); // memoria: las expresiones del combate vuelven a salir de la GPU

        this.overworldHudEl.classList.remove('hidden');
        if (this.squadHUD) {
          this.squadHUD.render();
        }
        if (this.minimapHUD) {
          this.minimapHUD.show();
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

        if (String(battlingMonsterId || '').startsWith('tut_')) {
          // tutorial: lo cuenta el Maestro Paladill
        } else if (battlingMonsterId === 'slime_garden_1') {
          this._showBannerMessage(i18n.t('story.chimeraPurified'), i18n.t('story.chimeraPurifiedDesc'));
        } else if (battlingMonsterId === 'mob_bing_ambush' || (battlingZoneKey === '3_2' && qBing?.status === 'active' && defendBingDone && !recruitBingDone)) {
          this._showBannerMessage(i18n.t('story.victoryBing'), i18n.t('story.victoryBingDesc'));
        } else if (battlingMonsterId === 'mob_postman_bandits') {
          this._showBannerMessage(i18n.t('story.mailbagRecovered'), i18n.t('story.mailbagRecoveredDesc'));
        } else if (battlingMonsterId === 'mob_rosalba_plant_guardian') {
          this._showBannerMessage(i18n.t('story.mossObtained'), i18n.t('story.mossObtainedDesc'));
        } else if (battlingMonsterId === 'mob_armored_chimera' && nomadPending) {
          this._showBannerMessage(i18n.t('story.carapaceObtained'), i18n.t('story.carapaceObtainedDesc'));
        } else if (battlingMonsterId === 'mob_shadow_mirror') {
          this._showBannerMessage(i18n.t('story.shadowDispelled'), i18n.t('story.shadowDispelledDesc'));
        } else if (battlingMonsterId === 'mob_pomodoro_battle' || (battlingZoneKey === '2_1' && qPomo?.status === 'active' && defendPomoDone && !recruitPomoDone)) {
          this._showBannerMessage(i18n.t('story.victoryPomodoro'), i18n.t('story.victoryPomodoroDesc'));
        } else if ((battlingMonsterId === 'mob_polar_golem' || battlingZoneKey === '1_1') && blizzardPending) {
          this._showBannerMessage(i18n.t('story.blizzardDispelled'), i18n.t('story.blizzardDispelledDesc'));
        } else if (battlingMonsterId === 'mob_oracle_chimera') {
          this._showBannerMessage(i18n.t('story.resonanceNeutralized'), i18n.t('story.resonanceNeutralizedDesc'));
        } else {
          this._showBannerMessage(i18n.t('overworld.victory'), i18n.t('overworld.victoryDesc'));
        }
      }
    );
  }

  async resumeAfterDefeat() {
    const battlingMonsterId = this.currentBattlingMonsterId;
    // Hito 48: en el tutorial se vuelve junto al Maestro Paladill (sin cambiar de zona)
    if (String(battlingMonsterId || '').startsWith('tut_')) {
      await this.transition.playReturn(() => {
        if (this.player) {
          if (this.player.group) this.player.group.visible = true;
          if (this.player.companionGroup) this.player.companionGroup.visible = true;
          if (this.savedPlayerPosition) this.player.teleport(this.savedPlayerPosition.x, this.savedPlayerPosition.y, this.savedPlayerPosition.z);
          this.cameraController?.setFollowTarget(this.player, true);
        }
        this.currentBattlingMonsterId = null;
        if (this.monsters) this.monsters.isEncounterTriggered = false;
        this.overworldHudEl.classList.remove('hidden');
        this.squadHUD?.render();
        this.minimapHUD?.show();
        this.state = 'EXPLORING';
        if (this.onStateChange) this.onStateChange('OVERWORLD');
        this.playerController?.setEnabled(true);
        this.audio?.playBiomeMusic?.(this.worldMapManager?.currentMapDef?.biome || 'forest');
        this.tutorialManager?.onBattleReturn?.(battlingMonsterId, false);
        this.player?.releaseHiddenFace?.();
      }, () => {});
      return;
    }
    // Return fade transition back to Overworld (safe Dojo sanctuary spawn)
    await this.transition.playReturn(
      async () => {
        // Teleport player back safely to the central peaceful Dojo sanctuary [3, 3]
        if (this.worldMapManager) {
          await this.worldMapManager.changeMap('zone_2_2');
        } else if (this.player) {
          this.player.teleport(0, 0, 2, Math.PI);
        }

        if (this.player) {
          if (this.player.group) this.player.group.visible = true;
          if (this.player.companionGroup) this.player.companionGroup.visible = true;
        }

        this.currentBattlingMonsterId = null;
        if (this.monsters) {
          this.monsters.isEncounterTriggered = false;
        }
        if (this.demoScenaZone && this.demoScenaZone.slimeCreaturesManager) {
          this.demoScenaZone.slimeCreaturesManager.resetCombatEncounter();
        }
        this.player?.releaseHiddenFace?.();

        this.overworldHudEl.classList.remove('hidden');
        if (this.squadHUD) {
          this.squadHUD.render();
        }
        if (this.minimapHUD) {
          this.minimapHUD.show();
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
        this._showBannerMessage(i18n.t('overworld.dojoRest'), i18n.t('overworld.dojoRestDesc'));
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

    const isComplete = title.includes('COMPLETADA') || title.includes('PURIFICADA') || title.includes('VICTORIA') || title.includes('COMPLETED') || title.includes('PURIFIED') || title.includes('VICTORY') || title === i18n.t('overworld.victory');
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

  /** Construye la Isla del Bosque si aún no existe (una sola vez aunque lleguen dos llamadas). */
  ensureForestBuilt() {
    if (this.demoScenaZone.isLoaded) return Promise.resolve();
    if (!this._forestInitPromise) {
      this._forestInitPromise = this.demoScenaZone.init().then(() => {
        if (!this.demoScenaDebugUI) this.demoScenaDebugUI = new DemoScenaDebugUI(this);
      });
      // Si falla, no se reintenta: DemoScenaZone22.init() no es seguro de repetir a medias (duplicaría
      // terreno y luces). Los viajes al Bosque fallarán con el mismo error en vez de corromper la escena.
    }
    return this._forestInitPromise;
  }

  getGroundHeight(x, z) {
    const grand = getActiveGrandIsland(this);
    if (grand) {
      return grand.getHeight(x, z);
    }
    if (this.savannaZone && this.savannaZone.isActive && typeof this.savannaZone.getHeight === 'function') {
      return this.savannaZone.getHeight(x, z);
    }
    if (this.demoScenaZone && this.demoScenaZone.isActive && typeof this.demoScenaZone.getHeight === 'function') {
      return this.demoScenaZone.getHeight(x, z);
    }
    if (this.stylizedRiver && this.stylizedRiver.group && this.stylizedRiver.group.visible && typeof this.stylizedRiver.getBridgeHeight === 'function') {
      return this.stylizedRiver.getBridgeHeight(x, z);
    }
    if (this.terrain && typeof this.terrain.getHeight === 'function') {
      return this.terrain.getHeight(x, z);
    }
    return 0.0;
  }

  update(dt, time) {
    if (this.demoScenaZone && this.demoScenaZone.isActive) {
      this.demoScenaZone.update(dt, this.player?.position);
      if (this.demoScenaDebugUI) {
        this.demoScenaDebugUI.update();
      }
    } else if (this.savannaZone && this.savannaZone.isActive) {
      this.savannaZone.update(dt, this.player?.position);
    } else if (getActiveGrandIsland(this)) {
      getActiveGrandIsland(this).update(dt, this.player?.position);
    } else {
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
      } else if (this.dojoNatureManager && this.dojoNatureManager.group && this.dojoNatureManager.group.visible) {
        this.dojoNatureManager.update(dt);
      }
      if (this.magicalSkybox) {
        this.magicalSkybox.update(dt, this.camera);
      }
      if (this.zoneParticleManager && this.state !== 'COMBAT') {
        const pPos = (this.player && this.player.position) ? this.player.position : null;
        this.zoneParticleManager.update(dt, pPos, this.camera);
      }
    }
    if (this.environmentSystem && !this.demoScenaZone?.isActive && !this.savannaZone?.isActive && !getActiveGrandIsland(this)) {
      this.environmentSystem.update(dt);
    }
    if (this.lodManager) {
      this.lodManager.update(this.camera, this.player?.position, dt);
    }

    // Live Player Coordinate HUD display
    // (solo se escribe en el DOM si el texto cambia: cada escritura recalcula estilos)
    if (!this._coordEl || !this._coordEl.isConnected) { this._coordEl = document.getElementById('hud-player-coord-display'); this._coordTxt = null; }
    if (this._coordEl && this.player && this.player.position) {
      const txt = `X ${this.player.position.x.toFixed(1)} · Z ${this.player.position.z.toFixed(1)}`;
      if (txt !== this._coordTxt) { this._coordEl.textContent = txt; this._coordTxt = txt; }
    }

    // Update real-time minimap radar HUD
    if (this.minimapHUD && this.state !== 'COMBAT' && this.state !== 'CINEMATIC') {
      const npcs = this.zoneTransitionManager?.zoneNPCs || [];
      const playerYaw = this.player?.yaw ?? this.player?.targetYaw ?? this.player?.rotation?.y ?? 0;
      this.minimapHUD.update(
        dt,
        this.player?.position,
        playerYaw,
        npcs,
        this.questTargetPos
      );
    }

    if (this.state === 'CINEMATIC') {
      this.flythrough.update(dt);
    } else if ((this.state === 'HERO_PRESENTATION' || this.state === 'EXPLORING' || this.state === 'DIALOG') && this.playerController && this.player) {
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
      if (this.dojoPond && this.dojoPond.group && this.dojoPond.group.visible) this.dojoPond.update(dt);
      if (this.westPond && this.westPond.group && this.westPond.group.visible) this.westPond.update(dt);
      if (this.arcticFrozenLake && this.arcticFrozenLake.group && this.arcticFrozenLake.group.visible) this.arcticFrozenLake.update(dt);
      if (this.arcticFrozenLake2 && this.arcticFrozenLake2.group && this.arcticFrozenLake2.group.visible) this.arcticFrozenLake2.update(dt);
      if (this.mysticPond && this.mysticPond.group && this.mysticPond.group.visible) this.mysticPond.update(dt);
      if (this.dojoNatureManager && this.dojoNatureManager.group && this.dojoNatureManager.group.visible) this.dojoNatureManager.update(dt);
      if (this.biomeDecorationManager && typeof this.biomeDecorationManager.update === 'function') {
        this.biomeDecorationManager.update(dt);
      }
    } else {
      if (this.npcManager) {
        this.npcManager.hideAllOverlays();
      }
      this._updateQuestNavigation(dt, time);
      if (this.dojoPond && this.dojoPond.group && this.dojoPond.group.visible) this.dojoPond.update(dt);
      if (this.westPond && this.westPond.group && this.westPond.group.visible) this.westPond.update(dt);
      if (this.arcticFrozenLake && this.arcticFrozenLake.group && this.arcticFrozenLake.group.visible) this.arcticFrozenLake.update(dt);
      if (this.arcticFrozenLake2 && this.arcticFrozenLake2.group && this.arcticFrozenLake2.group.visible) this.arcticFrozenLake2.update(dt);
      if (this.mysticPond && this.mysticPond.group && this.mysticPond.group.visible) this.mysticPond.update(dt);
      if (this.dojoNatureManager && this.dojoNatureManager.group && this.dojoNatureManager.group.visible) this.dojoNatureManager.update(dt);
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
      if (this.questPinEl) {
        this.questPinEl.classList.add('hidden');
      }
      return;
    }

    // Live tracking of roaming tutorial slime or Maestro Paladill if active
    let hasAttachedMobArrow = false;
    if (nav && nav.quest && nav.isCurrentZone) {
      // Tutorial (Hito 48/50): el director dice adónde hay que ir (árbol de la Forja, yunque, Paladill…).
      // Si el paso no tiene un sitio al que caminar (Mochila, vínculo, runas), no hay flecha.
      const tutDir = nav.quest.id === 'quest_slime_purification' ? window.lunakaiTutorial?.director : null;
      const tutOn = Boolean(tutDir && tutDir.isActive && !tutDir.done);
      if (tutOn) {
        const t = tutDir.navTarget?.();
        if (t) { nav.targetWorldPos = { x: t.x, z: t.z }; nav.targetName = t.name || nav.targetName; }
        else nav.targetWorldPos = null;
      } else if (nav.quest.id === 'quest_slime_purification') {
        const isSlimeStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('derrotar') || i18n.en(nav.stepDesc).toLowerCase().includes('slime')));
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
            nav.targetWorldPos = { x: PALADILL_SPOT.x, z: PALADILL_SPOT.z };
          }
        }
      } else if (nav.quest.id === 'quest_hunt_beaked_chimera') {
        const reachStep = nav.quest.objective?.steps?.find(s => s.id === 'reach_wastes');
        if (reachStep && !reachStep.done && this.worldMapManager?.currentMapId === 'zone_3_2') {
          this.questManager.advanceStep('quest_hunt_beaked_chimera', 'reach_wastes', true);
          if (this.questDescEl) {
            this.questDescEl.textContent = this.questManager.getActiveHUDTrackerText();
          }
        }
        const isReportStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('inform') || i18n.en(nav.stepDesc).toLowerCase().includes('centinela') || i18n.en(nav.stepDesc).toLowerCase().includes('sentinel') || i18n.en(nav.stepDesc).toLowerCase().includes('report')));
        if (!isReportStep) {
          const beakedMob = this.monsters?.monsters?.find(m => m.id === 'mob_beaked_chimera');
          if (beakedMob && beakedMob.group) {
            nav.targetWorldPos = { x: beakedMob.group.position.x, z: beakedMob.group.position.z };
            nav.targetName = i18n.t('enemies.alphaBeakedChimera');
            if (beakedMob.questArrow) {
              hasAttachedMobArrow = true;
            }
          } else {
            nav.targetWorldPos = { x: -40.0, z: -8.0 };
            nav.targetName = i18n.t('enemies.alphaBeakedChimera');
          }
        }
      } else if (nav.quest.id === 'quest_nomad_steel') {
        const isOreStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('mineral') || i18n.en(nav.stepDesc).toLowerCase().includes('ore') || i18n.en(nav.stepDesc).toLowerCase().includes('chimera') || i18n.en(nav.stepDesc).toLowerCase().includes('quimera') || i18n.en(nav.stepDesc).toLowerCase().includes('armored') || i18n.en(nav.stepDesc).toLowerCase().includes('acorazada')));
        if (isOreStep) {
          const armoredMob = this.monsters?.monsters?.find(m => m.id === 'mob_armored_chimera');
          if (armoredMob && armoredMob.group) {
            nav.targetWorldPos = { x: armoredMob.group.position.x, z: armoredMob.group.position.z };
            nav.targetName = i18n.t('enemies.armoredChimera');
            if (armoredMob.questArrow) {
              hasAttachedMobArrow = true;
            }
          }
        }
      } else if (nav.quest.id === 'quest_blizzard_core') {
        const isGolemStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('golem') || i18n.en(nav.stepDesc).toLowerCase().includes('gólem') || i18n.en(nav.stepDesc).toLowerCase().includes('defeat') || i18n.en(nav.stepDesc).toLowerCase().includes('derrotar')));
        if (isGolemStep) {
          const golemPack = this.monsters?.monsters?.find(m => m.logicalZone === '1_1');
          nav.targetWorldPos = golemPack && golemPack.group
            ? { x: golemPack.group.position.x, z: golemPack.group.position.z }
            : (mergedBattleAnchor('1_1') || { x: 18.0, z: -8.0 });
          nav.targetName = i18n.t('enemies.armoredPolarGolem');
        }
      } else if (nav.quest.id === 'quest_frozen_seed') {
        const pomoNpc = this.npcManager?.npcs?.find(n => n.id === 'pomodoro_npc' || n.id === 'pomodoro');
        if (pomoNpc && pomoNpc.group) {
          nav.targetWorldPos = { x: pomoNpc.group.position.x, z: pomoNpc.group.position.z };
          nav.targetName = 'Pomodoro';
        }
      } else if (nav.quest.id === 'quest_forbidden_resonance') {
        const isDefeatStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('defeat') || i18n.en(nav.stepDesc).toLowerCase().includes('derrotar') || i18n.en(nav.stepDesc).toLowerCase().includes('sapidae') || i18n.en(nav.stepDesc).toLowerCase().includes('quimera') || i18n.en(nav.stepDesc).toLowerCase().includes('chimera')));
        if (isDefeatStep) {
          const arcanePack = this.monsters?.monsters?.find(m => m.logicalZone === '1_3');
          nav.targetWorldPos = arcanePack && arcanePack.group
            ? { x: arcanePack.group.position.x, z: arcanePack.group.position.z }
            : (mergedBattleAnchor('1_3') || { x: -80.0, z: 16.0 });
          nav.targetName = i18n.t('enemies.arcaneChimeraPack');
        } else {
          const oracleNpc = this.npcManager?.npcs?.find(n => n.id === 'oracle');
          if (oracleNpc && oracleNpc.group) {
            nav.targetWorldPos = { x: oracleNpc.group.position.x, z: oracleNpc.group.position.z };
            nav.targetName = i18n.t('story.astralOracle');
          } else {
            nav.targetWorldPos = { x: 34.0, z: -36.0 };
            nav.targetName = i18n.t('story.astralOracle');
          }
        }
      } else if (nav.quest.id === 'quest_astral_void_echoes') {
        const isOracleStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('oracle') || i18n.en(nav.stepDesc).toLowerCase().includes('oráculo') || i18n.en(nav.stepDesc).toLowerCase().includes('oraculo') || i18n.en(nav.stepDesc).toLowerCase().includes('sanctuary') || i18n.en(nav.stepDesc).toLowerCase().includes('santurario')));
        if (isOracleStep) {
          const oracleNpc = this.npcManager?.npcs?.find(n => n.id === 'oracle');
          if (oracleNpc && oracleNpc.group) {
            nav.targetWorldPos = { x: oracleNpc.group.position.x, z: oracleNpc.group.position.z };
            nav.targetName = i18n.t('story.astralOracle');
          } else {
            nav.targetWorldPos = { x: 34.0, z: -36.0 };
            nav.targetName = i18n.t('story.astralOracle');
          }
        }
      } else if (nav.quest.id === 'quest_forest_elixir') {
        const isGatherStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('moss') || i18n.en(nav.stepDesc).toLowerCase().includes('musgo') || i18n.en(nav.stepDesc).toLowerCase().includes('gather') || i18n.en(nav.stepDesc).toLowerCase().includes('harvest') || i18n.en(nav.stepDesc).toLowerCase().includes('recolectar')));
        if (isGatherStep) {
          const mossNode = this.questInteractables?.nodes?.find(n => n.id === 'luminous_moss_plant');
          if (mossNode && mossNode.group) {
            nav.targetWorldPos = { x: mossNode.group.position.x, z: mossNode.group.position.z };
            nav.targetName = i18n.t('story.mossSproutName');
          }
        }
      } else if (nav.quest.id === 'quest_blizzard_stew') {
        const isGatherStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('mushroom') || i18n.en(nav.stepDesc).toLowerCase().includes('seta') || i18n.en(nav.stepDesc).toLowerCase().includes('hongo') || i18n.en(nav.stepDesc).toLowerCase().includes('gather')));
        if (isGatherStep) {
          const mushNodes = this.questInteractables?.nodes?.filter(n => n.type === 'gathering_mushroom');
          if (mushNodes && mushNodes.length > 0) {
            let closest = mushNodes[0];
            let minDist = Infinity;
            const px = this.player?.position?.x || 0;
            const pz = this.player?.position?.z || 0;
            mushNodes.forEach(m => {
              const d = Math.hypot(m.group.position.x - px, m.group.position.z - pz);
              if (d < minDist) { minDist = d; closest = m; }
            });
            nav.targetWorldPos = { x: closest.group.position.x, z: closest.group.position.z };
            nav.targetName = closest.promptText || i18n.t('story.polarMushroom');
          }
        }
      } else if (nav.quest.id === 'quest_fallen_stardust') {
        const isGatherStep = Boolean(nav.stepDesc && (i18n.en(nav.stepDesc).toLowerCase().includes('stardust') || i18n.en(nav.stepDesc).toLowerCase().includes('fragment') || i18n.en(nav.stepDesc).toLowerCase().includes('gather')));
        if (isGatherStep) {
          const starNodes = this.questInteractables?.nodes?.filter(n => n.type === 'gathering_stardust');
          if (starNodes && starNodes.length > 0) {
            let closest = starNodes[0];
            let minDist = Infinity;
            const px = this.player?.position?.x || 0;
            const pz = this.player?.position?.z || 0;
            starNodes.forEach(s => {
              const d = Math.hypot(s.group.position.x - px, s.group.position.z - pz);
              if (d < minDist) { minDist = d; closest = s; }
            });
            nav.targetWorldPos = { x: closest.group.position.x, z: closest.group.position.z };
            nav.targetName = closest.promptText || i18n.t('story.luminescentStardust');
          }
        }
      }
    }

    // Battle steps of a retired corner zone: point at its pack on the island
    const MERGED_BATTLE_STEPS = {
      quest_primeval_purification: 'defeat_crypt_lord',
      quest_dark_frost_totems: 'purify_totems',
      quest_blizzard_core: 'defeat_golem',
      quest_forbidden_resonance: 'defeat_sapidae'
    };
    if (nav && nav.isCurrentZone && nav.logicalZone && nav.quest && MERGED_BATTLE_STEPS[nav.quest.id]) {
      const step = nav.quest.objective && nav.quest.objective.steps ? nav.quest.objective.steps.find(s => !s.done) : null;
      if (step && step.id === MERGED_BATTLE_STEPS[nav.quest.id]) {
        const pack = this.monsters?.monsters?.find(m => m.logicalZone === nav.logicalZone);
        if (pack && pack.group) {
          nav.targetWorldPos = { x: pack.group.position.x, z: pack.group.position.z };
          nav.targetName = pack.name || nav.targetName;
        }
      }
    }

    // 1. 3D Floating Guidance Compass on player
    if (this.player.setNavTarget) {
      this.player.setNavTarget(nav.targetWorldPos, true);
    }

    // 2. 3D exit portal highlight (if navigating across zones)
    if (this.worldMapManager?.transitionManager) {
      this.worldMapManager.transitionManager.setHighlightedPortal(nav.portalDirection);
    }

    // 3. 3D Quest Arrow floating directly above objective (or ferryman if travel needed)
    let targetX = nav.targetWorldPos?.x ?? 0;
    let targetZ = nav.targetWorldPos?.z ?? 0;
    let targetY = 0;
    const hasLocalTarget = Boolean(nav.targetWorldPos && !hasAttachedMobArrow);

    if (hasLocalTarget) {
      // Check if target corresponds to an active NPC (e.g. Master Paladill, Xia, Ferry Pomodoro, etc.)
      const targetNpc = this.npcManager?.npcs?.find(n => {
        if (!n.group || !n.group.visible) return false;
        const d = Math.hypot(n.group.position.x - targetX, n.group.position.z - targetZ);
        return d < 3.2;
      });

      if (targetNpc && targetNpc.group) {
        targetX = targetNpc.group.position.x;
        targetZ = targetNpc.group.position.z;
        // Position directly above the NPC's head / straw hat
        const headOffset = targetNpc.bubbleHeight ? (targetNpc.bubbleHeight + 0.5) : 4.2;
        targetY = targetNpc.group.position.y + headOffset;
      } else {
        const groundH = (this.demoScenaZone && typeof this.demoScenaZone.getHeight === 'function')
          ? this.demoScenaZone.getHeight(targetX, targetZ)
          : (this.terrain ? this.terrain.getHeight(targetX, targetZ) : 0);
        targetY = groundH + 3.0;
      }

      if (!this.questTargetArrow) {
        this.questTargetArrow = createQuestBeaconArrow3D(0);
        this.scene.add(this.questTargetArrow);
      }
      this.questTargetArrow.visible = true;
      this.questTargetArrow.position.set(targetX, targetY, targetZ);
      if (typeof this.questTargetArrow.updateAnimation === 'function') {
        this.questTargetArrow.updateAnimation(dt);
      }
    } else {
      if (this.questTargetArrow) {
        this.questTargetArrow.visible = false;
      }
    }

    // 4. Screen-Space 3D Quest Pin Beacon with dynamic distance
    if (this.questPinEl) {
      if (hasLocalTarget && this.camera && this.player && !this.isCombatActive()) {
        const playerPos = this.player.position;
        const dist = Math.hypot(targetX - playerPos.x, targetZ - playerPos.z);

        // Hide pin when player is close to target (< 5.0m) as requested
        if (dist < 5.0) {
          this.questPinEl.classList.add('hidden');
        } else {
          // Project target world position to screen (slightly above the 3D arrow)
          const pinWorldPos = new THREE.Vector3(targetX, targetY + 1.2, targetZ);
          const proj = pinWorldPos.project(this.camera);

          // Only display when NPC is in front of camera and inside screen view (no border clamping)
          const inFront = proj.z > -1.0 && proj.z < 1.0;
          const insideScreen = proj.x >= -0.95 && proj.x <= 0.95 && proj.y >= -0.92 && proj.y <= 0.92;

          if (!inFront || !insideScreen) {
            this.questPinEl.classList.add('hidden');
          } else {
            const screenX = (proj.x * 0.5 + 0.5) * window.innerWidth;
            const screenY = (-proj.y * 0.5 + 0.5) * window.innerHeight;

            const titleEl = document.getElementById('hud-quest-pin-title');
            const distEl = document.getElementById('hud-quest-pin-dist');
            const iconEl = this.questPinEl.querySelector('.hud-quest-pin-icon');

            if (titleEl) titleEl.textContent = nav.targetName || i18n.t('overworld.pinObjective');
            if (distEl) distEl.textContent = `${Math.round(dist)}m`;
            if (iconEl) iconEl.textContent = nav.isCurrentZone ? '◆' : '➔';

            this.questPinEl.style.left = `${screenX}px`;
            this.questPinEl.style.top = `${screenY}px`;
            this.questPinEl.classList.remove('hidden');
          }
        }
      } else {
        this.questPinEl.classList.add('hidden');
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
          this.navCompassArrowEl.textContent = '◆';
        } else {
          const dirSymbols = {
            NORTH: '▲',
            SOUTH: '▼',
            EAST: '►',
            WEST: '◄'
          };
          this.navCompassArrowEl.textContent = dirSymbols[nav.portalDirection] || '◆';
        }
      }
    }
  }

  unloadSecondaryPonds(activeBiome = null) {
    if (activeBiome !== 'dungeon' && this.westPond) {
      console.log('[OverworldManager] ♻️ Disposing Dungeon Lava Pond to free VRAM/RAM...');
      this.westPond.dispose();
      this.westPond = null;
    }
    if (activeBiome !== 'arctic') {
      if (this.arcticFrozenLake) {
        console.log('[OverworldManager] ♻️ Disposing Arctic Frozen Lake 1 to free VRAM/RAM...');
        this.arcticFrozenLake.dispose();
        this.arcticFrozenLake = null;
      }
      if (this.arcticFrozenLake2) {
        console.log('[OverworldManager] ♻️ Disposing Arctic Frozen Lake 2 to free VRAM/RAM...');
        this.arcticFrozenLake2.dispose();
        this.arcticFrozenLake2 = null;
      }
    }
    if (activeBiome !== 'mystic' && this.mysticPond) {
      console.log('[OverworldManager] ♻️ Disposing Mystic Astral Pond to free VRAM/RAM...');
      this.mysticPond.dispose();
      this.mysticPond = null;
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
      }
      this.westPond.setVisible(true);
    } else if (this.westPond) {
      this.westPond.setVisible(false);
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
      }
      this.arcticFrozenLake.setVisible(true);

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
      }
      this.arcticFrozenLake2.setVisible(true);
    } else {
      if (this.arcticFrozenLake) this.arcticFrozenLake.setVisible(false);
      if (this.arcticFrozenLake2) this.arcticFrozenLake2.setVisible(false);
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
      }
      this.mysticPond.setVisible(true);
    } else if (this.mysticPond) {
      this.mysticPond.setVisible(false);
    }
  }

  render(time, dt) {
    // 29-oct: durante un cambio de isla (WorldMapManager.changeMap, con el telón de carga cerrado) el mundo no se dibuja.
    // Antes el bucle seguía dibujando detrás del telón: cada pieza nueva de la isla compilaba su shader de forma
    // síncrona al entrar en escena y el precalentado (compilación en paralelo) tenía que competir con él. Medido en el
    // viaje Bosque → Sabana: 35 compilaciones bloqueantes, 14,3 s, y el viaje entero duraba ~17 s.
    // El precalentado dibuja su propio fotograma completo (WorldMapManager._renderFullWarmFrame).
    if (this._renderSuspended > 0 && this.hasRenderedFrame) {
      const cbs = this._onNextFrameCallbacks;
      if (cbs && cbs.length) { this._onNextFrameCallbacks = []; cbs.forEach((fn) => { try { fn(); } catch (err) { console.error('[OverworldManager] Frame callback error:', err); } }); }
      return;
    }
    // Con un panel a pantalla completa abierto (Mochila, Forja, Tienda, Escuadrón, Diario, Mapa)
    // el mundo queda oscurecido detrás: se dibuja 1 de cada 4 fotogramas en lugar de todos.
    // El canvas conserva la última imagen, así que no se nota y la GPU queda libre para el panel.
    if (this._panelCheckIn > 0) {
      this._panelCheckIn--;
    } else {
      this._panelCheckIn = 10; // comprobar el DOM solo cada 10 fotogramas
      // Solo cuentan los paneles que se ven de verdad: algunos (p. ej. la pantalla de fin de combate)
      // conservan la clase lk-is-open estando ocultos. getClientRects() sale vacío si el elemento o
      // alguno de sus padres tiene display:none.
      let covering = false;
      for (const el of document.querySelectorAll('.lk-backdrop.lk-is-open, #world-map-modal:not(.hidden)')) {
        if (!el.classList.contains('hidden') && el.getClientRects().length > 0) { covering = true; break; }
      }
      this._panelCovering = covering;
    }
    if (this._panelCovering && this.hasRenderedFrame && !(this._onNextFrameCallbacks && this._onNextFrameCallbacks.length)) {
      // Si el canvas cambió de tamaño (ventana, control de resolución) su contenido se borró:
      // hay que dibujar ya para no dejarlo vacío.
      const cv = this.renderer && this.renderer.domElement;
      const sizeKey = cv ? cv.width * 100000 + cv.height : 0;
      const resized = sizeKey !== this._panelSizeKey;
      this._panelSizeKey = sizeKey;
      this._panelSkip = resized ? 0 : ((this._panelSkip || 0) + 1) % 4;
      if (this._panelSkip !== 0) return;
    }
    if (this.environmentSystem) {
      this.environmentSystem.render(time, dt);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.renderedFrameCount = (this.renderedFrameCount || 0) + 1;
    this.hasRenderedFrame = true;

    if (this._onNextFrameCallbacks && this._onNextFrameCallbacks.length > 0) {
      const callbacks = this._onNextFrameCallbacks;
      this._onNextFrameCallbacks = [];
      for (let i = 0; i < callbacks.length; i++) {
        try {
          callbacks[i]();
        } catch (err) {
          console.error('[OverworldManager] Frame callback error:', err);
        }
      }
    }
  }

  waitForNextRenderFrame(count = 2, timeoutMs = 2500) {
    return new Promise((resolve) => {
      let remaining = count;
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, timeoutMs);

      const onFrame = () => {
        if (settled) return;
        remaining--;
        if (remaining <= 0) {
          settled = true;
          clearTimeout(timer);
          resolve();
        } else {
          this._onNextFrameCallbacks = this._onNextFrameCallbacks || [];
          this._onNextFrameCallbacks.push(onFrame);
        }
      };

      this._onNextFrameCallbacks = this._onNextFrameCallbacks || [];
      this._onNextFrameCallbacks.push(onFrame);
    });
  }
}
