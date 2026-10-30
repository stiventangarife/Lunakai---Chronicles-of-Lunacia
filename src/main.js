// main.js - Core Orchestrator for Axie Tactics 3D with Biomes, Equipment & Guided Tutorial
// Debe ser la primera importación: cuenta la memoria de GPU desde el primer contexto WebGL (lkDebug.gpu)
import { installGpuProbe } from './debug/GpuProbe.js';
import { unlockLevelOf, newlyUnlocked } from './tactics/combat/SkillUnlocks.js'; // Hito 98
import * as THREE from 'three';
import './ui/AccessPrefs.js'; // Hito 85: preferencias de accesibilidad aplicadas antes de crear la interfaz
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
import * as i18n from './i18n/i18n.js';
// Nombre visible de cada hueco de equipo del campamento (los ids weapon/hat/… no cambian)
const SLOT_LABEL = { weapon: i18n.t('system.slotWeapon'), hat: i18n.t('system.slotHat'), shield: i18n.t('system.slotShield'), body: i18n.t('system.slotBody'), boots: i18n.t('system.slotBoots') };
import { accountManager } from './net/AccountManager.js';
import { EconomyService } from './net/EconomyService.js';
import { MarketService } from './net/MarketService.js';
import { ForgeService } from './rpg/ForgeService.js';
import { SaveStatusChip } from './net/SaveStatusChip.js';
import { installCombatDebug } from './tactics/combat/CombatDebug.js';
import { CombatTelemetry } from './tactics/combat/CombatTelemetry.js';
import { VfxBridge } from './vfx/VfxBridge.js';
import { installTestArena } from './tactics/combat/TestArena.js';
import { installVfxTour } from './tactics/combat/VfxTour.js';
import { installPerfProbe, perfMark } from './debug/PerfProbe.js';
import { installAssetAudit } from './debug/AssetAudit.js';
import { installKtx2 } from './render/Ktx2.js';
import { installShadowMapGC } from './render/ShadowMapGC.js';
import { warmupRender } from './render/RenderWarmup.js';
import { installProgramKeepAlive } from './render/ProgramKeepAlive.js';
import { BondService } from './rpg/BondService.js';
import { RuneCharmService } from './rpg/RuneCharmService.js';
import { ULTIMATE_SLOT } from './ui/UltimateButton.js';
import { attachAxieCare } from './ui/AxieCarePanel.js';
import { attachRunesCharms } from './ui/RunesCharmsPanel.js';
import { attachForge } from './ui/ForgePanel.js';
import { attachGathering } from './ui/GatheringHUD.js';
import { attachShop } from './ui/ShopPanel.js';
import { ForestVillage } from './rpg/world/ForestVillage.js';
import { rollLoot, grantLoot, lootView, isLootId } from './rpg/LootService.js';
import { curIcon } from './ui/lk.js';
import { RUNE_CHARM_DROP } from './tactics/data/EconomyCatalog.js';
import { loadRuneCharmArt, runeCharmArt } from './ui/RuneCharmArt.js';
import { AxiePartsResolver } from './rpg/AxiePartsResolver.js';
import { STARTER_DECKS } from './tactics/data/StarterCards.js';
import { CollectionVFX } from './tactics/combat/CollectionVFX.js';
import { installBackgroundFrames } from './render/BackgroundFrames.js';
installBackgroundFrames(); // Hito 82: el combate sigue con el juego minimizado

/**
 * Tutorial (19-oct): las cartas de partes del Axie con un ataque que alcance a 1 casilla en la ranura [1],
 * porque el paso 6 pide usar la [1] contra la Quimera Guardián. null si no tiene ninguno.
 */
function tutorialCardOrder(ids) {
  if (!Array.isArray(ids) || !ids.length) return null;
  const sp = (id) => SPELLS_DB[id];
  const melee = (s) => s && s.targetType === 'enemy' && (s.effects || []).some((e) => e.type === 'damage')
    && (s.minRange ?? 1) <= 1 && (s.maxRange ?? 1) >= 1 && (s.paCost ?? 0) <= 6;
  // Hito 98: a nivel 1 solo ojos, orejas y boca están desbloqueadas: la carta de la ranura [1] sale de ellas
  const options = ids.filter((id) => melee(sp(id)) && unlockLevelOf(sp(id)) <= 1);
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
    // Los shaders de efectos que se crean y destruyen en cada lanzamiento no se borran (ver ProgramKeepAlive.js)
    installProgramKeepAlive(this.sceneManager.renderer);
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
    EconomyService.bind({ equipmentManager: this.equipmentManager, forge: ForgeService }); // Hito 76: monedas en el servidor (con cuenta)
    MarketService.bind({ game: this, equipmentManager: this.equipmentManager }); // Hito 77: Mercado entre jugadores
    this.forge = attachForge(this); // Forja del Valle del Dojō: yunque en el patio (E) → crear Tier 0 y evolucionar equipo
    this.gathering = attachGathering(this); // Recolección: pesca y tala (Axie), minería y plantas (Sapidae); el botín va a la bolsa de la Forja
    this.shop = attachShop(this); // Tienda: el Mercader Ochi (patio del Dojō) la abre al hablar con él
    try { this.forestVillage = new ForestVillage(this.overworldManager); } catch (e) { console.warn('[ForestVillage]', e); } // Hito 51: pueblo del Bosque (dojo, tienda, Forja, casas…)
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
    this.spellRangeCells = { range: [], blocked: [] }; // Hito 65: alcance dibujado (estilo Dofus)

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
            // Hito 98: carta aún bloqueada por el nivel del héroe (candado y «Nv. N»)
            const lockLv = s && this.spellManager.isLocked?.(u, s) ? this.spellManager.unlockLevel(u, s) : 0;
            // Hito 97: turnos de recarga que faltan (número grande sobre la carta)
            const cd = s && !lockLv ? this.spellManager.cooldownLeft(u, s) : 0;
            // Hito 95: cartas que necesitan el gólem en pie (Fortificar, Marcha del Caparazón)
            const noGolem = Boolean(s && (s.rangeFrom === 'golem' || s.allyFilter === 'golem') && !this.spellManager.golems?.golemOf(u));
            if (!slot) return;
            if (spent || cd || noGolem || lockLv) slot.classList.add('disabled');
            if (lockLv) slot.setAttribute('data-locked', String(lockLv)); else slot.removeAttribute('data-locked');
            let lockEl = slot.querySelector('.lk-lock-badge');
            if (lockLv && !lockEl) { lockEl = document.createElement('span'); lockEl.className = 'lk-lock-badge'; lockEl.setAttribute('aria-hidden', 'true'); slot.appendChild(lockEl); }
            if (lockEl) lockEl.innerHTML = lockLv ? `<svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v8A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10H7Zm2 0h6V7a3 3 0 0 0-6 0v3Z" fill="currentColor"/></svg><b>${i18n.t('game.levelShortN', { n: lockLv })}</b>` : '';
            slot.toggleAttribute('data-spent', spent);
            slot.toggleAttribute('data-no-golem', noGolem);
            if (cd) slot.setAttribute('data-cd', String(cd)); else slot.removeAttribute('data-cd');
            let cdEl = slot.querySelector('.lk-cd-badge');
            if (cd && !cdEl) { cdEl = document.createElement('span'); cdEl.className = 'lk-cd-badge'; cdEl.setAttribute('aria-hidden', 'true'); slot.appendChild(cdEl); }
            if (cdEl) cdEl.textContent = cd ? String(cd) : '';
            const cdTxt = (n) => i18n.t(n === 1 ? 'game.spellCooldown1' : 'game.spellCooldownN', { n });
            const why = lockLv ? i18n.t('game.spellLocked', { n: lockLv }) : cd ? cdTxt(cd) : spent ? i18n.t('game.spellSpent') : noGolem ? i18n.t('golems.needsGolem') : null;
            if (why) slot.title = why;
            else if (slot.title && (slot.title === i18n.t('game.spellSpent') || slot.title === i18n.t('golems.needsGolem') || slot.dataset.cdTitle === slot.title)) slot.removeAttribute('title');
            if (cd || lockLv) slot.dataset.cdTitle = why; else delete slot.dataset.cdTitle;
          });
        } catch { /* la interfaz nunca rompe el combate */ }
        return r;
      };
    }
    this._setupTurnCallbacks();
    attachTurnTimer(this); // Reloj del turno del jugador: 30 s, sobrante al siguiente (máx. 45 s), −10 s si no actúa en 10 s
    this.combatBanner = new CombatBanner();
    this.endScreen = new CombatEndScreen({ resolvePortrait: (key) => this._requestPortrait(key) }); // Hito 94: también Axies por ID

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
    try { installVfxTour(this); } catch (e) { console.warn('[recorrido]', e); } // Hito 102: lkDebug.vfxRecorrido()
    // Perfilador de rendimiento: lkDebug.perf.start() / stop() / hud() / scene()
    try { installPerfProbe(this); } catch (e) { console.warn('[perf]', e); }
    // Diagnóstico de texturas (KTX2) y props (triángulos): lkDebug.assets.audit() / export()
    try { installAssetAudit(this); } catch (e) { console.warn('[assets]', e); }
    // Texturas KTX2 (docs/PLAN_KTX2.md): un solo lector para todos los GLTFLoader del juego
    try { installKtx2(this.sceneManager.renderer); } catch (e) { console.warn('[KTX2]', e); }
    // Memoria de la tarjeta gráfica que reserva el juego: lkDebug.gpu() / mark() / diff() / export()
    try { installGpuProbe(this); } catch (e) { console.warn('[gpu]', e); }
    // 30-oct: suelta los mapas de sombra (32 MB cada uno) de las luces que llevan un rato sin dibujarse: lkDebug.shadowGC()
    try { installShadowMapGC(this.sceneManager.renderer); } catch (e) { console.warn('[sombras]', e); }
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
      // Hito 76: con cuenta, el saldo (oro, SLP y bAXS) es el del servidor
      EconomyService.sync().then(() => this.shop?.showInbox?.()).catch(() => null); // Hito 77: avisos del Mercado
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
    const zoneName = currentMapDef?.name || i18n.t('places.zone22Title');
    const gx = currentMapDef?.gx !== undefined ? currentMapDef.gx : 2;
    const gy = currentMapDef?.gy !== undefined ? currentMapDef.gy : 2;

    const activeSlot = saveSlotManager.getActiveSlot();
    let currentPortrait = activeSlot?.sapidaePortrait || null;
    // El retrato solo se vuelve a capturar si cambió la apariencia (modelo, personalización o
    // equipo) o si aún no hay. Capturarlo usa un segundo contexto WebGL y codifica una imagen de
    // forma síncrona: hacerlo en CADA autoguardado (cada 15 s y con cada misión) daba tirones.
    //
    // 29-oct: (1) la clave ya no lleva el uuid de la malla (cambia en cada carga: el primer autoguardado de CADA sesión
    // rehacía el retrato aunque nada hubiera cambiado) y se guarda en la ranura (sapidaePortraitKey). (2) El retrato se
    // hace en segundo plano (captureModelAsync): antes compilaba los shaders del Sapidae en el contexto de retratos de
    // forma síncrona y congelaba el juego ~10 s justo después de entrar. Mientras tanto se guarda con el retrato anterior.
    let appearanceKey = '';
    try {
      appearanceKey = JSON.stringify([p?.sapidaeModel || activeSlot?.sapidaeModel || '', p?.customization || activeSlot?.customization || null, exported.equipped || null]);
    } catch (_) { appearanceKey = String(Math.random()); }
    const slotId = saveSlotManager.activeSlotId;
    this._portraitKeys = this._portraitKeys || {};
    const knownKey = this._portraitKeys[slotId] ?? activeSlot?.sapidaePortraitKey ?? null;
    const needPortrait = !currentPortrait || appearanceKey !== knownKey;
    if (needPortrait && this.overworldManager?.player?.mesh && portraitService) {
      this._portraitKeys[slotId] = appearanceKey;
      // 29-oct: se espera a que el jugador termine de cambiarse (equipar varias piezas seguidas = un solo retrato)
      clearTimeout(this._portraitTimer);
      this._portraitTimer = setTimeout(() => {
      if (saveSlotManager.activeSlotId !== slotId || this._portraitKeys[slotId] !== appearanceKey) return;
      const mesh = this.overworldManager?.player?.mesh;
      if (!mesh) { delete this._portraitKeys[slotId]; return; }
      const opts = { fullBody: true, isHumanoid: true, zoomFactor: 0.98, yaw: -0.15, pitch: 0.02 };
      const job = typeof portraitService.captureModelAsync === 'function'
        ? portraitService.captureModelAsync('active_player_slot', mesh, opts)
        : Promise.resolve().then(() => portraitService.captureModel('active_player_slot', mesh, opts));
      job.then((snap) => {
        if (!snap) { if (this._portraitKeys[slotId] === appearanceKey) delete this._portraitKeys[slotId]; return; }
        // Solo si sigue siendo la misma partida y la misma apariencia (si cambió, ya hay otro retrato en camino)
        if (saveSlotManager.activeSlotId !== slotId || this._portraitKeys[slotId] !== appearanceKey) return;
        saveSlotManager.updateActiveSlot({ sapidaePortrait: snap, sapidaePortraitKey: appearanceKey });
      }).catch(() => { if (this._portraitKeys[slotId] === appearanceKey) delete this._portraitKeys[slotId]; });
      }, 2000);
    }
    const portraitKey = needPortrait ? (activeSlot?.sapidaePortraitKey || null) : appearanceKey;

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
      sapidaePortraitKey: portraitKey,
      unlockedHeroes: exported.unlockedHeroes || ['kotaro'],
      squad: exported.squad,
      accountAxies: exported.accountAxies,
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
        this.tutorialManager.nudge?.();
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
          btnMute.title = isMuted ? i18n.t('game.unmuteAll') : i18n.t('game.muteAll');
          const ovSoundBtn = document.getElementById('btn-toggle-sound');
          if (ovSoundBtn) ovSoundBtn.textContent = isMuted ? i18n.t('game.hudMuted') : i18n.t('game.hudSound');
        }
      });
    }

    // Reglas y controles (ventana del sistema de diseño): entra con la transición de .lk-backdrop; Esc, ✕, «Entendido» o el fondo la cierran
    const helpModal = document.getElementById('help-modal');
    const openHelp = () => { helpModal.classList.remove('hidden'); void helpModal.offsetWidth; helpModal.classList.add('lk-is-open'); setTimeout(() => document.getElementById('btn-ok-help')?.focus({ preventScroll: true }), 50); };
    const closeHelp = () => { helpModal.classList.remove('lk-is-open'); helpModal.classList.add('hidden'); document.getElementById('btn-help')?.focus({ preventScroll: true }); };
    document.getElementById('btn-help').addEventListener('click', () => {
      this.audio.init();
      openHelp();
    });
    document.getElementById('btn-close-help').addEventListener('click', closeHelp);
    // Menú de opciones también en el tablero (botón ⚙ del HUD o Esc sin carta elegida)
    document.getElementById('btn-options')?.addEventListener('click', () => { this.audio.init(); this.overworldManager?.settingsModal?.open(); });
    document.getElementById('btn-ok-help').addEventListener('click', closeHelp);
    helpModal.addEventListener('pointerdown', (e) => { if (e.target === helpModal) closeHelp(); });
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || helpModal.classList.contains('hidden')) return;
      e.preventDefault(); e.stopImmediatePropagation(); closeHelp();
    }, true);

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
      // El ratón puede mandar varios eventos por fotograma (más aún al arrastrar la cámara): la casilla
      // bajo el cursor se calcula como mucho una vez por fotograma, con la última posición, al principio
      // del fotograma de combate (_animate), antes de dibujar: sin retraso respecto a antes.
      this._hoverDirty = true;
    });

    this.container.addEventListener('click', (e) => {
      if (this.gameState !== 'BATTLE') return;
      this.audio.init();
      if (e.button === 0) {
        // Un clic sin movimiento previo (toque en pantalla táctil, o ratón que no se movió desde el
        // último fotograma) debe apuntar a la casilla donde se hizo el clic, no a la última del cursor.
        const mx = (e.clientX / window.innerWidth) * 2 - 1;
        const my = -(e.clientY / window.innerHeight) * 2 + 1;
        if (Math.abs(mx - this.mouse.x) > 1e-6 || Math.abs(my - this.mouse.y) > 1e-6) {
          this.mouse.x = mx; this.mouse.y = my; this._hoverDirty = true;
        }
        this._handleGridClick();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.gameState !== 'BATTLE') return;
      // Con el menú de opciones o las reglas abiertos, el tablero no recibe teclas (Espacio no pasa el turno)
      const opts = this.overworldManager?.settingsModal;
      if (opts?.isOpen || !document.getElementById('help-modal')?.classList.contains('hidden')) return;
      if (e.defaultPrevented) return; // otra capa ya gestionó la tecla (p. ej. Esc cerró el menú)
      this.audio.init();
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.tutorialManager.isActive && !this.tutorialManager.isEndTurnAllowed()) {
          this.audio.playCollision();
          this.tutorialManager.nudge?.();
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
        // Esc: primero cancela la carta elegida; sin carta, abre el menú de opciones
        if (this.selectedSpell || this.selectedSpellIndex >= 0) this._clearSpellSelection();
        else if (opts) { e.preventDefault(); opts.open(); }
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
      if (titleEl) titleEl.textContent = i18n.t('game.loadingBiome');
      const initialMap = slotData?.currentZone || 'zone_2_2';
      if (subtitleEl) subtitleEl.textContent = initialMap === 'zone_2_2' ? `${i18n.t('places.zone22Title')} [2, 2]` : initialMap;
      if (iconEl) iconEl.textContent = '';
      if (hintEl) hintEl.textContent = i18n.t('game.loadingHint');
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
    perfMark('carga: inicio (telón cerrado)');
    await this.overworldManager.init(activeHero, slotData);
    perfMark('carga: init terminado');

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
      perfMark('telón: empieza a abrirse');
      await this.overworldManager.worldMapManager.transitionManager.hideLoading(500);
      perfMark('telón: abierto');
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

    // Efectos de las cartas del escuadrón: se preparan en segundo plano mientras se explora, para que
    // el primer combate no tenga que hacerlo (≈2–5 s menos tras el velo)
    this._scheduleBackgroundCombatWarmup();
  }

  /** Cartas que llevarán al combate el Sapidae y los Axies del escuadrón (misma lógica que _startBattle). */
  _squadSpellIds() {
    const slot = saveSlotManager.getActiveSlot();
    const classDef = SAPIDAE_CLASSES[(slot && slot.sapidaeClass) || 'crafter'] || SAPIDAE_CLASSES.crafter;
    const ids = [...(classDef.spells || [])];
    const HERO_SPELLS = { kotaro: ['kotaro_slash', 'kotaro_push', 'kotaro_jump'], bing: STARTER_DECKS.bing, pomodoro: STARTER_DECKS.pomodoro };
    const em = this.equipmentManager;
    const squad = (em && typeof em.getSquad === 'function') ? em.getSquad().filter(Boolean) : [];
    for (const heroId of squad) {
      const base = (em.heroesBase && em.heroesBase[heroId]) || {};
      const isAxie = base.modelType === 'axie' || Boolean(base.axieId);
      const own = (isAxie && this.partsResolver?.idsFor(base))
        || (heroId === 'kotaro' ? (base.spellIds || getHeroSpells(base.heroKey || base.axieId)) : (HERO_SPELLS[heroId] || base.spellIds))
        || [];
      ids.push(...own);
    }
    return ids;
  }

  /** Lanza (una vez por partida cargada) la preparación en segundo plano de los VFX del escuadrón. */
  _scheduleBackgroundCombatWarmup() {
    if (!this.vfxBridge || typeof this.vfxBridge.prepareInBackground !== 'function') return;
    const token = (this._bgWarmToken = (this._bgWarmToken || 0) + 1);
    const start = async () => {
      if (token !== this._bgWarmToken) return; // se cargó otra partida
      // esperar a estar explorando (no durante la cinemática, cargas o combates)
      if (this.gameState !== 'OVERWORLD' || this.overworldManager?.state !== 'EXPLORING') { setTimeout(start, 3000); return; }
      try {
        try { await this._resolvePartCards(); } catch (_) { /* sin red: cartas por defecto */ }
        const t0 = performance.now();
        perfMark('VFX segundo plano: inicio');
        const n = await this.vfxBridge.prepareInBackground([{ spellIds: this._squadSpellIds() }]);
        perfMark('VFX segundo plano: fin');
        if (n) console.log(`[vfx] ${n} efectos del escuadrón preparados en segundo plano (${Math.round(performance.now() - t0)} ms)`);
      } catch (e) {
        console.warn('[vfx] preparación en segundo plano omitida', e);
      }
    };
    setTimeout(start, 4000);
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

    if (encounterData && encounterData.levelConfig) {
      // Hito 48: combates del tutorial con su propia configuración (TutorialDirector)
      await this._startBattle(encounterData.levelConfig);
    } else if (encounterData && encounterData.isTutorial) {
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
      if (typeof u.dispose === 'function') u.dispose(); // libera su memoria de GPU propia
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
      (typeof config?.badgeText === 'string' && (config.badgeText.includes('BOSS FINAL') || config.badgeText === i18n.t('levels.l10.badge'))) ||
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
      if (typeof u.dispose === 'function') u.dispose(); // libera su memoria de GPU propia
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
    const sapidaePlayerName = (activeSlot && activeSlot.playerName) || i18n.t('game.archSapidae');
    const sapidaeCustomization = (activeSlot && activeSlot.customization) || null;

    // Estadísticas reales del Sapidae (clase + nivel + atributos + equipo de la mochila), igual que los axies
    const sapStats = this.equipmentManager ? this.equipmentManager.getCalculatedStats('sapidae') : null;
    const sapProg = this.equipmentManager ? this.equipmentManager.getProgression('sapidae') : null;

    // Vida persistente (18-oct): los héroes entran con la vida del mundo abierto (salvo tutorial y arena de pruebas)
    const usePersistentHP = !config.isTutorial && !config.isTestArena && !config.noPersistentHP;
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
      heroLevel: sapProg?.level || 1, // Hito 98: habilidades que se desbloquean por nivel
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
        equipped: this.equipmentManager ? (this.equipmentManager.getEquipped(heroId) || {}) : {}, // arma visible del Axie (Hito 52)
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
        heroLevel: prog?.level || 1, // Hito 98: cuernos a nivel 3, espalda a 7, cola a 10
        // Cartas de partes reales (Fase 4). En el tutorial también, con un ataque cuerpo a cuerpo en la ranura [1]
        // (el paso 6 pide la [1]); si el Axie no tiene ninguno, usa los hechizos de siempre.
        spellIds: (isAxie && (config.isTutorial ? tutorialCardOrder(this.partsResolver?.idsFor(baseInfo)) : this.partsResolver?.idsFor(baseInfo))) || (heroId === 'kotaro' ? (baseInfo.spellIds || getHeroSpells(baseInfo.heroKey || baseInfo.axieId)) : (HERO_SPELLS[heroId] || baseInfo.spellIds)) || ['kotaro_slash'],
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
        this._requestPortrait(portraitKey);
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
      minRound: config.ultimateMinRound ?? null,
    });

    // Hito 48: duelo de entrenamiento — termina cuando alguien baja al umbral de vida (nadie gana ni pierde)
    this.lastDuelOutcome = null;
    this.turnManager.endRule = config.duel ? (units) => {
      const th = config.duel.threshold ?? 0.3;
      const low = (u) => u.isDead || (u.currentHP || 0) <= (u.maxHP || 1) * th;
      if (units.some((u) => u.team === 'enemy' && low(u))) return 'yield';
      if (units.some((u) => u.team === 'player' && low(u))) return 'stop';
      return null;
    } : null;

    // Precalentado del combate ANTES de abrir el velo: efectos de las cartas, shaders de toda la
    // escena (arena, unidades, VFX) con el render target del composer y texturas en la GPU.
    // Antes esto ocurría con el velo ya abierto y daba el tirón del primer turno.
    await this._prewarmBattle();

    if (config.isTutorial) {
      this.turnManager.startCombat();
      this.tutorialManager.startTutorial();
    } else {
      this.tutorialManager.completeTutorial();
      // Duelo con Paladill y prueba de la Ultimate: guiados paso a paso (TutorialManager.startDynamic). Antes de
      // empezar el combate, para que el reloj de turno no arranque en el primer turno guiado.
      if (config.tutorialKind === 'duel' || config.tutorialKind === 'ult') this.tutorialManager.startDynamic(config.tutorialKind);
      this.turnManager.startCombat();
    }
  }

  /**
   * Deja el combate listo para dibujarse sin compilar nada: prepara los VFX de las cartas de las
   * unidades (el VfxBridge reutiliza esta preparación al empezar el combate) y compila la escena.
   * Tiene un tope de tiempo para que un fallo de red o de carga nunca bloquee la entrada.
   */
  async _prewarmBattle() {
    const t0 = performance.now();
    const cap = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
    try {
      if (this.vfxBridge && this.vfxBridge.enabled) {
        this.vfxBridge._prewarm = this.vfxBridge.prepare(this.units).catch((e) => console.warn('[vfx] prepare', e));
        // prepare() va en cola detrás de la preparación de la Ultimate (evento ultimate:ready), así que
        // esta espera cubre las dos. Tope de 8 s: antes era 4 s y la Ultimate (~3 s la primera vez)
        // agotaba el tope y terminaba de compilarse ya con el velo abierto.
        await cap(this.vfxBridge._prewarm, 8000);
      }
      const sm = this.sceneManager;
      // Tope de 6 s (antes 3): el velo sigue cerrado y lo que no se termine aquí se compila ya en el combate
      const res = await cap(warmupRender(sm.renderer, sm.scene, sm.camera, { target: sm.composer ? sm.composer.readBuffer : null, deadline: performance.now() + 6000 }), 6000);
      // Un fotograma detrás del velo con TODO el escenario a la vista: three solo sube la geometría a la
      // GPU (y compila los shaders de la pasada de sombras) la primera vez que dibuja cada malla, y antes
      // eso pasaba al girar o alejar la cámara por primera vez (fotogramas de 60–160 ms).
      const t1 = performance.now();
      const flipped = [];
      sm.scene.traverse((o) => { if (o.frustumCulled && (o.isMesh || o.isPoints || o.isLine)) { o.frustumCulled = false; flipped.push(o); } });
      try {
        if (sm.composer) sm.composer.render(); else sm.renderer.render(sm.scene, sm.camera);
      } finally {
        for (const o of flipped) o.frustumCulled = true;
      }
      if (res) console.log(`[combate] Precalentado: ${res.programs} programas nuevos, ${res.textures} texturas, fotograma completo ${Math.round(performance.now() - t1)} ms, total ${Math.round(performance.now() - t0)} ms`);
    } catch (e) {
      console.warn('[combate] precalentado omitido', e);
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
      if (config.duel) this.lastDuelOutcome = this.turnManager.endReason || 'yield';

      // Mark level as completed and unlock next level if campaign level
      if (typeof this.currentLevel === 'number') {
        this.equipmentManager.completeLevel(this.currentLevel);
      }

      // 2. Transición de cierre (Lunakai UI): bandas de cine, luna y «VICTORIA»
      this.audio.playVictoryFanfare();
      if (this.audio && typeof this.audio.playVictoryMusic === 'function') {
        this.audio.playVictoryMusic();
      }
      const duelSub = config.duel ? (this.lastDuelOutcome === 'yield' ? i18n.t('game.duelYield') : i18n.t('game.trainingOver')) : null;
      await this.combatBanner.play('victory', { subtitle: duelSub || [config.title, config.biomeName].filter(Boolean).join(' · ') });

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
          recruits.push({ name: h ? h.name : heroId, sub: h ? h.archetype : i18n.t('game.allyOfLunacia'), cls: this._heroClassKey(h), portraitUrl: url, portraitKey });
        });
      }

      // Experiencia del escuadrón (se guarda el estado previo para pintar lo ganado)
      const baseExp = config.rewardExp || (60 + (typeof this.currentLevel === 'number' ? this.currentLevel : 1) * 30);
      // El principal del escuadrón gana el 100 %; el Sapidae y los apoyos, el 60 %.
      // La unidad del Sapidae en combate se llama 'sapidae_hero', pero su progreso vive en 'sapidae'.
      const squadIds = typeof this.equipmentManager.getSquad === 'function' ? this.equipmentManager.getSquad() : [];
      const activeHero = squadIds[1] || this.selectedHeroId || 'kotaro';
      const participatingHeroIds = [...new Set(this.units
        .filter(u => u.team === 'player' && !u.isGolem) // Hito 95: los gólems no son héroes
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
          // Hito 98: habilidades desbloqueadas con los niveles de este combate
          unlocked: (() => {
            if (!b || !(res.levelsGained > 0)) return [];
            const u = this.units.find((x) => x.id === (hId === 'sapidae' ? 'sapidae_hero' : hId));
            const isSap = Boolean(h?.isSapidae || hId === 'sapidae');
            const ids = isSap ? (SAPIDAE_CLASSES[this.equipmentManager.heroesBase?.sapidae?.sapidaeClassKey]?.spells || u?.spellIds) : u?.spellIds;
            return newlyUnlocked(ids, (id) => this.spellManager.getSpell(id), b.level, res.currentLevel, isSap)
              .map((x) => ({ name: x.spell.name, part: isSap ? null : x.spell.part, level: x.level }));
          })(),
          gain: Math.floor(baseExp * this.equipmentManager.getExpShare(hId, activeHero)),
          basePct: res.levelsGained > 0 || !b ? 0 : expPct(b.exp, b.req),
          afterPct: expPct(res.currentExp, res.requiredExp),
          portraitUrl: url,
          portraitKey
        };
      });

      // Botín: objetos a la mochila y materiales (1–2 por cada uno que cae) a la bolsa de la Forja
      const lootIds = (config.rewardItems || []).filter(isLootId);
      // Axie Care: cada victoria da comida para el compañero (una baya; a veces un pastelito)
      if (!config.isTutorial && !config.tutorialKind) {
        if (ITEMS_DB.food_berry) lootIds.push('food_berry');
        if (ITEMS_DB.food_rice_cake && Math.random() < 0.25) lootIds.push('food_rice_cake');
      }
      const loot = rollLoot(lootIds);
      if (lootIds.length > 0) {
        grantLoot(this.equipmentManager, loot);
      }
      // Runas y charms neutros (Hito 54): un charm (10 %) y una runa (5 %) por victoria, el doble contra jefes
      const rcLoot = [];
      if (!config.isTutorial && !config.tutorialKind) {
        const boss = Boolean(config.isBoss) || DynamicCombatFactory.isBossEncounter(null, null, config.enemies || []);
        const mult = boss ? RUNE_CHARM_DROP.bossMult : 1;
        [['charms', RUNE_CHARM_DROP.charm], ['runes', RUNE_CHARM_DROP.rune]].forEach(([kind, p]) => {
          if (Math.random() >= p * mult) return;
          const x = RuneCharmService.rollNeutral(kind);
          if (x && RuneCharmService.add(kind, x.id, 1)) rcLoot.push({ kind, x });
        });
        if (rcLoot.length) await loadRuneCharmArt();
      }
      // Hito 74: un poco de oro por cada victoria contra quimeras (20–45). Ni el tutorial ni los duelos de entrenamiento.
      let goldView = [];
      if (!config.isTutorial && !config.tutorialKind && !config.duel) {
        // Hito 76: con cuenta, la cantidad la decide el servidor; sin conexión queda pendiente y se cobra al volver
        let gold = null, pending = false, local = !EconomyService.active;
        if (!local) {
          const res = await EconomyService.battleGold();
          if (res.ok) gold = res.amount; else { pending = res.error === 'pending'; local = res.error === 'unavailable'; }
        }
        if (local) { // invitado, o funciones sin desplegar
          gold = 20 + Math.floor(Math.random() * 26);
          this.equipmentManager.addGold(gold);
        }
        if (gold != null) goldView = [{ id: 'gold', name: i18n.t('game.goldLoot', { n: gold }), rarity: 'common', icon: curIcon('gold'), slot: i18n.t('game.goldSlot'), stats: {}, description: i18n.t('game.goldLootDesc') }];
        else if (pending) goldView = [{ id: 'gold', name: i18n.t('game.goldPending'), rarity: 'common', icon: curIcon('gold'), slot: i18n.t('game.goldSlot'), stats: {}, description: i18n.t('game.goldPendingDesc') }];
      }
      const RC_RAR = (r) => (['rare', 'epic', 'mystic'].includes(r) ? r : 'common');
      const rcView = rcLoot.map(({ kind, x }) => ({ id: `${kind}:${x.id}`, name: x.name, rarity: RC_RAR(x.rarity), icon: runeCharmArt(kind, x.id) || `./assets/ui/icons/${kind === 'runes' ? 'rune' : 'charm'}.png`, slot: kind === 'runes' ? i18n.t('game.rune') : i18n.t('game.charm'), stats: {}, description: `${i18n.t(kind === 'runes' ? 'game.runeNeutralDesc' : 'game.charmNeutralDesc')} ${x.desc || ''}` }));

      // Valoración y resumen con datos reales del combate
      const allies = this.units.filter(u => u.team === 'player' && !u.isGolem);
      const foes = this.units.filter(u => u.team === 'enemy');
      const rounds = this.turnManager.round || 1;
      const alliesKO = allies.filter(u => u.isDead).length;
      const hpNow = allies.reduce((t, u) => t + Math.max(0, u.currentHP || 0), 0);
      const hpMax = allies.reduce((t, u) => t + (u.maxHP || 0), 0);

      this.endScreen.showVictory({
        subtitle: [config.duel ? (this.lastDuelOutcome === 'yield' ? i18n.t('game.duelYieldShort') : i18n.t('game.trainingEnded')) : config.title, config.biomeName, i18n.t(rounds === 1 ? 'game.roundOne' : 'game.roundMany', { n: rounds })].filter(Boolean).join(' · '),
        moons: [
          { label: i18n.t('game.moonVictory'), on: true },
          { label: i18n.t('game.moonNoKO'), on: alliesKO === 0 },
          { label: i18n.t('game.moonFast'), on: rounds <= 3 }
        ],
        squad,
        recruits,
        loot: [...goldView, ...lootView(loot), ...rcView],
        summary: [
          [i18n.t('game.sumRounds'), String(rounds)],
          [i18n.t('game.sumFoesDefeated'), String(foes.filter(u => u.isDead).length)],
          [i18n.t('game.sumAlliesKO'), String(alliesKO)],
          [i18n.t('game.sumSquadHP'), `${hpMax > 0 ? Math.round((hpNow / hpMax) * 100) : 0}%`]
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
      await this.combatBanner.play('defeat', { subtitle: i18n.t('game.defeatSub') });
      this.sceneManager.restoreCamera();
      await this.combatBanner.hide();

      // Pantalla de derrota (Lunakai UI · etapa 3)
      const config = this.activeBattleConfig || LEVELS_CONFIG[this.currentLevel] || LEVELS_CONFIG[1];
      const squadIds = typeof this.equipmentManager.getSquad === 'function' ? this.equipmentManager.getSquad() : [];
      const activeHero = squadIds[1] || this.selectedHeroId || 'kotaro';
      const allies = this.units.filter(u => u.team === 'player' && !u.isGolem);
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
          hints.push({ icon: 'upgrade', html: i18n.t(prog.unspentStatPoints === 1 ? 'game.hintStatOne' : 'game.hintStatMany', { name, n: prog.unspentStatPoints }) });
        }
      });
      allies.forEach(u => {
        const eq = this.equipmentManager.equipped ? this.equipmentManager.equipped[u.id] : null;
        if (!eq) return;
        const empty = Object.values(eq).filter(v => !v).length;
        if (empty > 0) {
          const h = this.equipmentManager.heroesBase[u.id];
          hints.push({ icon: 'equipable', html: i18n.t(empty === 1 ? 'game.hintSlotOne' : 'game.hintSlotMany', { name: h ? h.name : u.id, n: empty }) });
        }
      });
      if (foesAlive.length > 0) {
        const names = [...new Set(foesAlive.map(u => u.name))].join(', ');
        hints.push({ icon: 'swords', html: i18n.t(foesAlive.length === 1 ? 'game.hintFoeOne' : 'game.hintFoeMany', { n: foesAlive.length, names }) });
      }

      let endSubtitle = i18n.t('game.defeatRetreat');
      if (foesAlive.length === 1) {
        endSubtitle += ` · ${i18n.t('game.defeatFoeSurvives', { name: foesAlive[0].name, hp: Math.max(0, Math.round(foesAlive[0].currentHP || 0)) })}`;
      } else if (foesAlive.length > 1) {
        endSubtitle += ` · ${i18n.t('game.defeatFoesStanding', { n: foesAlive.length })}`;
      }

      this.endScreen.showDefeat({
        subtitle: endSubtitle,
        squad,
        lostLoot: lootView(rollLoot((config.rewardItems || []).filter(isLootId), () => 1)),
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
    this.units.filter((u) => u.team === 'player' && !u.isGolem).forEach((u) => {
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
    if (!h) return i18n.t('game.allyOfLunacia');
    if (h.isSapidae) return `Sapidae · ${h.class || i18n.t('game.leader')}`;
    const ck = this._heroClassKey(h);
    const CLS = { beast: 'combatHud.clsBeast', plant: 'combatHud.clsPlant', aquatic: 'combatHud.clsAquatic', bird: 'combatHud.clsBird', reptile: 'combatHud.clsReptile', bug: 'combatHud.clsBug' };
    return [h.axieId ? `#${h.axieId}` : null, CLS[ck] ? i18n.t(CLS[ck]) : h.class].filter(Boolean).join(' · ');
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

  /**
   * Hito 94: pide un retrato que falta. Un Axie con ID no tiene GLB propio: se fotografía con el mezclador
   * (ensureAxiePortrait, con sus genes); lo demás (Sapidae, enemigos, héroes de la demo) sigue con getPortrait.
   */
  _requestPortrait(key) {
    if (!key) return Promise.resolve(null);
    const id = String(key);
    if (/^\d+$/.test(id)) {
      const hit = Object.entries(this.equipmentManager?.heroesBase || {}).find(([, x]) => x && String(x.axieId) === id);
      return portraitService.ensureAxiePortrait(id, { genes: hit?.[1]?.genes || null, heroId: hit?.[0] || null });
    }
    return portraitService.getPortrait(key);
  }

  _getHeroPortrait(heroId, heroBase = null) {
    const h = heroBase || (this.equipmentManager?.heroesBase ? this.equipmentManager.heroesBase[heroId] : null);
    const portraitKey = h?.axieId ? String(h.axieId) : (h?.heroKey || heroId);
    // Un Axie por ID: su foto 3D si ya está; si no, su imagen (si la hay) y el panel pide la foto con _requestPortrait
    let url = (h?.axieId && portraitService.getPortraitSync(portraitKey)) || h?.image || portraitService.getPortraitSync(portraitKey) || portraitService.getPortraitSync(heroId);
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
            <span class="slot-unequip-hint">${i18n.t('game.unequip')}</span>
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
        box.innerHTML = `<span class="slot-empty">${i18n.t('game.equipSlot', { slot: SLOT_LABEL[slot] || slot })}</span>`;
        box.onclick = null;
      }
    });
  }

  _renderCampInventory() {
    const container = document.getElementById('inventory-grid');
    container.innerHTML = '';
    const inv = this.equipmentManager.inventory;
    document.getElementById('inv-count').textContent = i18n.t('game.itemCount', { n: inv.length });

    if (inv.length === 0) {
      container.innerHTML = `<div style="color: #64748b; font-size: 12px; padding: 12px;">${i18n.t('game.backpackEmpty')}</div>`;
      return;
    }

    inv.forEach(itemId => {
      const item = ITEMS_DB[itemId];
      if (!item) return;

      const card = document.createElement('div');
      card.className = 'item-card rarity-' + item.rarity;

      let statBadges = '';
      if (item.stats.damage) statBadges += `<span class="stat-badge">${i18n.t('game.statDamage', { n: item.stats.damage })}</span>`;
      if (item.stats.hp) statBadges += `<span class="stat-badge">${i18n.t('game.statHP', { n: item.stats.hp })}</span>`;
      if (item.stats.pm) statBadges += `<span class="stat-badge">${i18n.t('game.statMP', { n: item.stats.pm })}</span>`;
      if (item.stats.pa) statBadges += `<span class="stat-badge">${i18n.t('game.statAP', { n: item.stats.pa })}</span>`;
      if (item.stats.shield) statBadges += `<span class="stat-badge">${i18n.t('game.statShield', { n: item.stats.shield })}</span>`;
      if (item.stats.initiative) statBadges += `<span class="stat-badge">${i18n.t('game.statInit', { n: item.stats.initiative })}</span>`;

      card.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${item.icon}</span>
          <span class="item-name">${item.name}</span>
        </div>
        <span class="item-slot-tag">${SLOT_LABEL[item.slot] || item.slot} • ${i18n.t('game.clickToEquip', { name: this.equipmentManager.heroesBase[this.selectedHeroId].name })}</span>
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
      barTitle.textContent = cfg.title ? `${cfg.title}` : i18n.t('game.levelN', { n: this.equipmentManager.selectedLevelId });
    }
  }

  _renderCampMissionMap() {
    const container = document.getElementById('campaign-nodes-grid');
    if (!container) return;
    container.innerHTML = '';

    const progressCount = document.getElementById('map-progress-count');
    if (progressCount) {
      progressCount.textContent = i18n.t('game.missionsProgress', { n: this.equipmentManager.completedLevels.length });
    }

    for (let lvl = 1; lvl <= 10; lvl++) {
      const cfg = LEVELS_CONFIG[lvl];
      if (!cfg) continue;

      const isCompleted = this.equipmentManager.isLevelCompleted(lvl);
      const isUnlocked = this.equipmentManager.isLevelUnlocked(lvl);
      const isSelected = this.equipmentManager.selectedLevelId === lvl;

      const card = document.createElement('div');
      let statusClass = 'locked';
      let statusLabel = i18n.t('game.statusLocked');
      let statusBadgeClass = 'status-locked';

      if (isCompleted) {
        statusClass = 'completed';
        statusLabel = i18n.t('game.statusCleared');
        statusBadgeClass = 'status-completed';
      } else if (isUnlocked) {
        statusClass = 'unlocked';
        statusLabel = i18n.t('game.statusAvailable');
        statusBadgeClass = 'status-unlocked';
      }

      if (isSelected) {
        statusClass += ' active';
        statusLabel = i18n.t('game.statusTarget');
        statusBadgeClass = 'status-active';
      }

      card.className = `mission-node-card ${statusClass}`;

      // Enemies preview badges
      const enemiesHTML = cfg.enemies.map(e => `<span class="node-enemy-pill">${i18n.t('game.enemyHp', { name: e.name, hp: e.maxHP })}</span>`).join('');

      // Rewards text
      let rewardsText = '';
      if (cfg.rewardRecruits && cfg.rewardRecruits.length > 0) {
        const recruitsNames = cfg.rewardRecruits.map(r => this.equipmentManager.heroesBase[r] ? this.equipmentManager.heroesBase[r].name : r).join(', ');
        rewardsText += i18n.t('game.rewardHero', { names: recruitsNames }) + ' ';
      }
      if (cfg.rewardItems && cfg.rewardItems.length > 0) {
        rewardsText += i18n.t('game.rewardItems', { n: cfg.rewardItems.length });
      }
      if (!rewardsText) {
        rewardsText = i18n.t('game.rewardGlory');
      }

      // Button
      let btnHTML = '';
      if (isSelected) {
        btnHTML = `<button class="node-select-btn btn-selected">${i18n.t('game.selectedMission')}</button>`;
      } else if (isUnlocked) {
        btnHTML = `<button class="node-select-btn btn-choose">${i18n.t('game.selectMission')}</button>`;
      } else {
        btnHTML = `<button class="node-select-btn btn-locked" disabled>${i18n.t('game.statusLocked')}</button>`;
      }

      card.innerHTML = `
        <div class="node-header">
          <span class="node-lvl-tag">${i18n.t('game.levelN', { n: lvl })}</span>
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
          <span class="node-rewards-label">${i18n.t('game.reward')}</span>
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

      const avatar = ''; // Hito 75: sin emojis; sin retrato se muestra la inicial

      const portraitKey = (unit.config && unit.config.axieId) ? unit.config.axieId : (unit.modelType || unit.type || unit.id);
      const portraitUrl = portraitService.getPortraitSync(portraitKey) || 
                          portraitService.getPortraitSync(unit.type) || 
                          portraitService.getPortraitSync(unit.id) || 
                          (unit.team === 'player' ? (portraitService.getPortraitSync('shinji') || portraitService.getPortraitSync('kotaro')) : null);
      if (!portraitUrl) {
        this._requestPortrait(portraitKey);
      }

      const hpPercent = Math.max(0, Math.min(100, (unit.currentHP / unit.maxHP) * 100));

      const avatarContent = portraitUrl
        ? `<img class="timeline-avatar-img" src="${portraitUrl}" alt="${unit.name}">`
        : `<span class="timeline-avatar-fallback">${avatar || String(unit.name || '?').charAt(0).toUpperCase()}</span>`;

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
    let avatar = '';
    if (!archetype) {
      if (unit.type === 'bing') { archetype = i18n.t('game.archBing'); avatar = ''; }
      else if (unit.type === 'pomodoro') { archetype = i18n.t('game.archPomodoro'); avatar = ''; }
      else if (unit.type === 'werewolf-boss' || unit.type.includes('werewolf')) { archetype = i18n.t('game.archWerewolfBoss'); avatar = ''; }
      else if (unit.type.includes('bear')) { archetype = i18n.t('game.archBear'); avatar = ''; }
      else if (unit.type.includes('wolf')) { archetype = i18n.t('game.archWolf'); avatar = ''; }
      else if (unit.type.includes('dryad')) { archetype = i18n.t('game.archDryad'); avatar = ''; }
      else if (unit.type.includes('treant')) { archetype = i18n.t('game.archTreant'); avatar = ''; }
      else if (unit.type.includes('slime')) { archetype = i18n.t('game.archSlime'); avatar = ''; }
      else if (unit.type.includes('brawler') || unit.type === 'buba') { archetype = i18n.t('game.archBrawler'); avatar = ''; }
      else if (unit.type === 'sapidae') { archetype = unit.archetype || i18n.t('game.archSapidae'); avatar = ''; }
      else if (unit.type.includes('shaman')) { archetype = i18n.t('game.archShaman'); avatar = ''; }
      else { archetype = i18n.t('game.archDefault'); }
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
      avatarEl.textContent = avatar || String(unit.name || '?').charAt(0).toUpperCase();
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
        slot.querySelector('.pa-cost-badge').textContent = i18n.t('game.apCost', { n: this.spellManager.getSpellCost(unit, spell) });
        const iconEl = slot.querySelector('.spell-icon');
        if (spell.icon && (spell.icon.includes('/') || spell.icon.endsWith('.png') || spell.icon.endsWith('.webp'))) {
          iconEl.innerHTML = `<img src="${spell.icon}" alt="${spell.name || i18n.t('game.skill')}" class="spell-img-icon">`;
        } else {
          if (spell.icon) iconEl.textContent = spell.icon; else iconEl.innerHTML = '<img src="./assets/ui/icons/swords.png" alt="" class="spell-img-icon">';
        }
        slot.querySelector('.range-badge').textContent = i18n.t('game.rangeBadge', { r: (spell.minRange === spell.maxRange ? spell.minRange : spell.minRange + '-' + spell.maxRange) });

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
      subtitle.textContent = i18n.t('game.turnStart');
      title.textContent = i18n.t('game.turnTitle', { name: unit.name.toUpperCase() });
    } else {
      banner.className = 'turn-banner turn-enemy';
      subtitle.textContent = i18n.t('game.enemyTurn');
      title.textContent = unit.name.toUpperCase();
    }

    banner.classList.remove('hidden');
    setTimeout(() => {
      banner.classList.add('hidden');
    }, 1500);
  }

  /** Casillas alcanzables que el paso del tutorial permite (combate guiado). */
  _tutorialAllowedReach() {
    const tm = this.tutorialManager;
    if (!tm?.isActive) return this.reachableCells || [];
    return (this.reachableCells || []).filter((c) => tm.isCellAllowed(c.x, c.z));
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
          // Solo las casillas que pide el paso (antes se pintaban todas las alcanzables en azul y parecía
          // que se podía ir a cualquiera)
          this.gridManager.highlightReachable(this._tutorialAllowedReach());
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
      this.tutorialManager.nudge?.();
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
      this.spellRangeCells = this.spellManager.getRangeCells(this.activeUnit, spell);
      this.gridManager.clearHighlights();
      this._paintSpellCells();

      if (this.tutorialManager.isActive && this.tutorialManager.isSpellSelectionStep()) {
        this.tutorialManager.advanceStep();
      }
    }
  }

  /** Selecciona (o deselecciona) la Duo Ultimate (botón del medallón del HUD, tecla 7; índice ULTIMATE_SLOT). */
  _toggleUltimateSelect() {
    if (this.gameState !== 'BATTLE') return;
    if (!this.activeUnit || this.activeUnit.team !== 'player' || this.activeUnit.isMoving) return;
    if (this.tutorialManager.isActive && !this.tutorialManager.isUltAllowed()) {
      this.audio.playCollision();
      this.tutorialManager.nudge?.();
      return;
    }
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
    this.spellRangeCells = this.spellManager.getRangeCells(this.activeUnit, spell);
    this.gridManager.clearHighlights();
    this._paintSpellCells();
    this._updateHUD(this.activeUnit);
  }

  /** Alcance de la habilidad elegida: sin visión (apagado), a tiro (rojo) y objetivos válidos (rojo intenso, pulso). */
  _paintSpellCells() {
    const gm = this.gridManager, r = this.spellRangeCells || { range: [], blocked: [] };
    gm.highlightSpellBlocked(r.blocked);
    gm.highlightSpellRange(r.range);
    gm.highlightSpellTargets(this.validSpellCells);
  }

  _clearSpellSelection() {
    this.spellRangeCells = { range: [], blocked: [] };
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
      this._hoverMemo = null;
      return;
    }

    // Misma casilla y nada cambió desde el último repintado (unidad, carta, casillas alcanzables y
    // ningún otro código tocó los resaltados): el tablero ya está como debe, no se rehace.
    const gm = this.gridManager;
    const tutStep = this.tutorialManager?.isActive ? this.tutorialManager.currentStep : -1;
    const memo = this._hoverMemo;
    if (memo && memo.x === cell.x && memo.z === cell.z && memo.unit === this.activeUnit && memo.spell === this.selectedSpell
      && memo.reach === this.reachableCells && memo.valid === this.validSpellCells && memo.tut === tutStep
      && memo.ver === gm.highlightVersion) {
      return;
    }

    const tile = this.gridManager.getTile(cell.x, cell.z);
    this._paintHover(cell, tile);
    this._hoverMemo = { x: cell.x, z: cell.z, unit: this.activeUnit, spell: this.selectedSpell, reach: this.reachableCells,
      valid: this.validSpellCells, tut: tutStep, ver: gm.highlightVersion };
  }

  /** Resaltados y previsión de la casilla bajo el cursor (lo que antes hacía _handleHover en cada evento). */
  _paintHover(cell, tile) {
    if (this.selectedSpell) {
      const isValid = this.validSpellCells.some(c => c.x === cell.x && c.z === cell.z);
      if (isValid) {
        this.gridManager.clearHighlights();
        this._paintSpellCells();

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
        // fuera de un objetivo: se quitan el área y el cursor de la casilla anterior, queda el alcance
        this.gridManager.clearHighlights();
        this._paintSpellCells();
      }
    } else {
      this._hideForecast();
      const reachable = this.reachableCells.find(c => c.x === cell.x && c.z === cell.z);
      const tutBlocked = this.tutorialManager.isActive && reachable && !this.tutorialManager.isCellAllowed(cell.x, cell.z);
      if (reachable && !tutBlocked) {
        this.gridManager.clearHighlights();
        this.gridManager.highlightReachable(this._tutorialAllowedReach());
        this.gridManager.highlightPath(reachable.path);
        this.gridManager.highlightHover(cell.x, cell.z, 0x39e75f); // casilla elegida para moverse: verde (Hito 65)

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
    // La casilla bajo el cursor se calcula una vez por fotograma: si el clic llega antes (ratón movido y
    // pulsado en el mismo fotograma), se calcula ya con la posición actual
    if (this._hoverDirty) { this._hoverDirty = false; this._handleHover(); }
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
        this.tutorialManager.nudge?.();
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
        this.tutorialManager.nudge?.();
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
    document.getElementById('forecast-target-name').textContent = targetUnit.name || i18n.t('game.enemy');
    const curHP = (typeof targetUnit.currentHP === 'number' && !isNaN(targetUnit.currentHP)) ? targetUnit.currentHP : 0;
    const maxHP = (typeof targetUnit.maxHP === 'number' && !isNaN(targetUnit.maxHP)) ? targetUnit.maxHP : 1;
    document.getElementById('forecast-target-hp').textContent = i18n.t('game.hpOf', { cur: curHP, max: maxHP });

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
      document.getElementById('forecast-push-val').textContent = i18n.t('game.pushTiles', { n: spell.pushDistance });

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
    document.getElementById('tt-pa').textContent = i18n.t('game.apCost', { n: this.spellManager.getSpellCost(this.activeUnit, spell) });
    document.getElementById('tt-range').textContent = i18n.t('game.ttRange', { r: spell.minRange + '-' + spell.maxRange });
    document.getElementById('tt-los').textContent = i18n.t('game.ttLos', { v: spell.requiresLoS ? i18n.t('game.yes') : i18n.t('game.no') });
    document.getElementById('tt-area').textContent = i18n.t('game.ttArea', { v: spell.areaType === 'cross1' ? i18n.t('game.areaCross') : i18n.t('game.areaSingle') });
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

    // Hito 82: con el juego minimizado llegan ~1 fotograma por segundo; en combate se usa el tiempo real (hasta 2 s)
    // para que los efectos, golpes y turnos enemigos sigan avanzando. En el mundo abierto, igual que siempre.
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, document.hidden && this.gameState === 'BATTLE' ? 2 : 0.1);
    const time = this.clock.getElapsedTime();

    if (this.gameState === 'INTRO' || this.gameState === 'OVERWORLD' || (this.gameState === 'LOADING' && this.overworldManager && this.overworldManager.isReadyToRender)) {
      this.overworldManager.update(dt, time);
      this.overworldManager.render(time, dt);
      if (this.gameState === 'OVERWORLD') this._tickOverworldRegen(dt);
    } else if (this.gameState === 'BATTLE') {
      if (this._hoverDirty) { this._hoverDirty = false; this._handleHover(); }
      // Hito 89: durante la pausa de impacto las unidades no avanzan (dt 0); cámara, efectos y textos sí
      const udt = this.sceneManager.unitDt ? this.sceneManager.unitDt(dt) : dt;
      this.units.forEach(u => u.update(udt, time));
      this.combatText.update(dt);
      this.gridManager.tickHighlights(time);
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
