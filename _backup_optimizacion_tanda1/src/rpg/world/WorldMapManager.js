// WorldMapManager.js - Master coordinator for 5x5 World Grid, 5 Biomes, Dofus Portals & World Map UI
import { GRAND_ISLAND_ZONES, GRAND_ISLAND_TRAVEL } from './islands/GrandIslands.js';
import { canonicalZoneId, mergedZonesOf, FERRY_DOCKS } from './islands/IslandWorldLayout.js';
import * as THREE from 'three';
import { MAP_REGISTRY, getZoneByCoord, ISLANDS_REGISTRY } from './MapRegistry.js';
import { BiomeThemeManager, BIOMES } from './BiomeThemeManager.js';
import { ZoneTransitionManager } from './ZoneTransitionManager.js';
import { WorldMapModal } from './WorldMapModal.js';

export class WorldMapManager {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.scene = overworldManager.scene;
    this.audio = overworldManager.audio;

    this.currentMapId = 'zone_2_2';
    this.currentMapDef = MAP_REGISTRY.zone_2_2 || MAP_REGISTRY.forest_valley;

    this.visitedZones = new Set(['zone_2_2', 'forest_valley']);
    this.currentSubQuadrant = 'SE';

    this.biomeManager = null;
    this.transitionManager = null;
    this.currentExternalBiome = null;
    this.worldMapModal = new WorldMapModal(this);
  }

  async init(stylizedEnv, decorationManager = null, skybox = null, particleManager = null, initialMapId = 'zone_2_2', visitedZonesList = null, playerPosOverride = null) {
    this.decorationManager = decorationManager;
    this.skybox = skybox;
    this.particleManager = particleManager;
    this.biomeManager = new BiomeThemeManager(this.scene, stylizedEnv, decorationManager, skybox, particleManager);
    this.transitionManager = new ZoneTransitionManager(this.scene, this.audio, this.om);
    if (!this.worldMapModal) {
      this.worldMapModal = new WorldMapModal(this);
    }

    if (visitedZonesList && Array.isArray(visitedZonesList)) {
      this.visitedZones = new Set(visitedZonesList);
    }

    // Setup portal trigger listener
    this.transitionManager.onTransitionStart = () => {
      this.om.state = 'TRANSITION';
      if (this.om.playerController) {
        this.om.playerController.setEnabled(false);
      }
    };

    this.transitionManager.onPortalTrigger = async (portal) => {
      await this.changeMap(portal.targetMap, portal.targetPortal);
    };

    this.transitionManager.onTransitionEnd = () => {
      this.om.state = 'EXPLORING';
      if (this.om.playerController) {
        this.om.playerController.setEnabled(true);
      }
    };

    // Load initial map based on saved adventure slot or default Dojo
    await this.loadMap(initialMapId || 'zone_2_2', playerPosOverride);
  }

  async changeMap(targetMapId, targetPortalDirection) {
    // The corner zones of the demo 1.0.0 grid were merged into the islands
    targetMapId = canonicalZoneId(targetMapId);
    console.log(`[WorldMapManager] Changing map from ${this.currentMapId} -> ${targetMapId} (entering at ${targetPortalDirection})`);
    const targetMap = MAP_REGISTRY[targetMapId];
    if (!targetMap) {
      console.error(`[WorldMapManager] Target map not found: ${targetMapId}`);
      return;
    }

    const prevBiome = this.currentMapDef ? this.currentMapDef.biome : null;

    // Smart Biome Lifecycle Management:
    // Keep at most 1 external non-forest biome in memory to guarantee RAM stays around ~1.0 GB.
    // Entering Forest [2, 2] preserves the last external biome for instant zero-stutter return.
    // Entering a new, distinct external biome safely unloads the previous external biome.
    if (targetMap.biome !== 'forest') {
      if (this.currentExternalBiome && this.currentExternalBiome !== targetMap.biome) {
        if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.unloadBiome === 'function') {
          console.log(`[WorldMapManager] ♻️ Unloading previous biome '${this.currentExternalBiome}' to free RAM/VRAM before loading '${targetMap.biome}'`);
          this.om.biomeDecorationManager.unloadBiome(this.currentExternalBiome, this.om.renderer);
        }
      }
      this.currentExternalBiome = targetMap.biome;
    }

    // Unload secondary ponds not needed in destination biome
    if (typeof this.om.unloadSecondaryPonds === 'function') {
      this.om.unloadSecondaryPonds(targetMap.biome);
    }

    this.currentMapId = targetMap.id || targetMapId;
    this.currentMapDef = targetMap;
    this.visitedZones.add(this.currentMapId);
    mergedZonesOf(`${targetMap.gx}_${targetMap.gy}`).forEach((k) => this.visitedZones.add(`zone_${k}`));

    // 0. Ensure target biome 3D decorations and secondary ponds are loaded on-demand behind transition curtain
    // Hito 23: grand islands replace the legacy 80 m biome decorations
    const grandKey = GRAND_ISLAND_ZONES[targetMap.id] || null;
    if (grandKey && this.om.grandIslands && this.om.grandIslands[grandKey]) {
      await this.om.grandIslands[grandKey].init();
    } else if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.ensureBiomeLoaded === 'function') {
      await this.om.biomeDecorationManager.ensureBiomeLoaded(targetMap.biome, targetMap.gx, targetMap.gy);
    }
    // Legacy 80 m ponds belong to the retired demo terrains: never built on the islands
    const isIslandMap = Boolean(grandKey) || targetMap.id === 'zone_2_2' || targetMap.id === 'zone_3_2';
    if (!isIslandMap && typeof this.om.ensureZonePonds === 'function') {
      await this.om.ensureZonePonds(targetMap.id, targetMap.gx, targetMap.gy);
    }

    // 1. Apply Biome visual themes and atmospheric lighting
    const biome = this.biomeManager.applyBiome(targetMap.biome, 1.5, targetMap.gx, targetMap.gy);
    if (this.om.audio && typeof this.om.audio.playBiomeMusic === 'function') {
      this.om.audio.playBiomeMusic(targetMap.biome);
    }
    if (!grandKey && this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.setZone === 'function') {
      this.om.biomeDecorationManager.setZone(targetMap.gx, targetMap.gy);
    }

    // 2. Cardinal portal arrows retired: islands are reached with Pomodoro the ferryman
    this.transitionManager.setPortals({});

    // 3. Position Player at entry spawn
    const isDojo = Boolean(targetMap.hasDojo || targetMap.id === 'zone_2_2' || (targetMap.gx === 2 && targetMap.gy === 2));
    const isSavanna = Boolean(targetMap.id === 'zone_3_2' || targetMap.biome === 'savannah');
    const isGrand = isSavanna || Boolean(grandKey);
    this._updateZone22Visuals(isDojo, isGrand);
    this._updateSavannaVisuals(isSavanna);
    this._updateGrandIslandVisuals(grandKey);

    // Rearrange procedurally generated forest trees & layout for this macro-zone
    if (!isDojo && !isGrand && this.om.stylizedEnv && this.om.stylizedEnv.setZone) {
      this.om.stylizedEnv.setZone(targetMap.gx, targetMap.gy, this.om.collisions);
    }

    let spawn = targetMap.defaultSpawn;
    if (targetPortalDirection && targetMap.portals[targetPortalDirection]) {
      const portalDef = targetMap.portals[targetPortalDirection];
      spawn = portalDef.spawnOffset || portalDef.position;
    }

    if (this.om.player) {
      let spawnY = spawn.y || 0;
      if (typeof this.om.getGroundHeight === 'function') {
        spawnY = this.om.getGroundHeight(spawn.x, spawn.z);
      } else if (isDojo && this.om.demoScenaZone && typeof this.om.demoScenaZone.getHeight === 'function') {
        spawnY = this.om.demoScenaZone.getHeight(spawn.x, spawn.z);
      }
      this.om.player.teleport(spawn.x, spawnY, spawn.z, spawn.yaw);
      // Reset velocity
      if (this.om.player.velocity) {
        this.om.player.velocity.set(0, 0, 0);
      }
    }

    // 4. Update Camera to focus on newly placed player immediately without panning
    if (this.om.cameraController && this.om.player) {
      this.om.cameraController.setFollowTarget(this.om.player, true);
    }

    // 5. Update NPC for this zone
    if (this.om.npcManager) {
      await this._updateZoneNPCs(targetMap);
    }

    // 6. Update Monsters for this zone
    if (this.om.monsters) {
      await this._updateZoneMonsters(targetMap);
    }

    // 6b. Update Quest Interactables (Gathering nodes & plant guardians) for this zone
    if (this.om.questInteractables) {
      this.om.questInteractables.loadForZone(`${targetMap.gx}_${targetMap.gy}`);
    }

    // 7. Update HUD zone indicator
    this._updateHUDZoneInfo(targetMap, biome);

    // 7b. Update Dojo Sanctuary Rocks, Ivy & River (River extends along central column gx = 2)
    const isZone2_3 = (targetMap.id === 'zone_2_3' || (targetMap.gx === 2 && targetMap.gy === 3));
    const isZone3_1 = (targetMap.id === 'zone_3_1' || (targetMap.gx === 3 && targetMap.gy === 1));
    const isZone1_1 = (targetMap.id === 'zone_1_1' || (targetMap.gx === 1 && targetMap.gy === 1));
    const isZone1_2 = (targetMap.id === 'zone_1_2' || (targetMap.gx === 1 && targetMap.gy === 2));
    const isRiverZone = (targetMap.gx === 2 && targetMap.gy >= 1 && targetMap.gy <= 3 && !isDojo);

    if (isDojo || isGrand) {
      if (this.om.dojoRockSanctuary && typeof this.om.dojoRockSanctuary.setVisible === 'function') {
        this.om.dojoRockSanctuary.setVisible(false);
      }
      if (this.om.stylizedRiver && typeof this.om.stylizedRiver.setVisible === 'function') {
        this.om.stylizedRiver.setVisible(false);
      }
      if (this.om.dojoBambooGrove && typeof this.om.dojoBambooGrove.setVisible === 'function') {
        this.om.dojoBambooGrove.setVisible(false);
      }
      if (this.om.dojoBuilding && typeof this.om.dojoBuilding.setVisible === 'function') {
        this.om.dojoBuilding.setVisible(false);
      }
      if (this.om.forestNatureManager && typeof this.om.forestNatureManager.setVisible === 'function') {
        this.om.forestNatureManager.setVisible(false);
      } else if (this.om.dojoNatureManager && typeof this.om.dojoNatureManager.setVisible === 'function') {
        this.om.dojoNatureManager.setVisible(false);
      }
      if (this.om.dojoPond && typeof this.om.dojoPond.setVisible === 'function') {
        this.om.dojoPond.setVisible(false);
      }
      if (this.om.westPond && typeof this.om.westPond.setVisible === 'function') {
        this.om.westPond.setVisible(false);
      }
      if (this.om.savannahOasis && typeof this.om.savannahOasis.setVisible === 'function') {
        this.om.savannahOasis.setVisible(false);
      }
      if (this.om.arcticFrozenLake && typeof this.om.arcticFrozenLake.setVisible === 'function') {
        this.om.arcticFrozenLake.setVisible(false);
      }
      if (this.om.arcticFrozenLake2 && typeof this.om.arcticFrozenLake2.setVisible === 'function') {
        this.om.arcticFrozenLake2.setVisible(false);
      }
      if (this.om.mysticPond && typeof this.om.mysticPond.setVisible === 'function') {
        this.om.mysticPond.setVisible(false);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setRiverActive === 'function') {
        this.om.stylizedEnv.setRiverActive(false);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setPondActive === 'function') {
        this.om.stylizedEnv.setPondActive(false);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setPond2Active === 'function') {
        this.om.stylizedEnv.setPond2Active(false);
      }
    } else {
      if (this.om.dojoRockSanctuary) {
        if (typeof this.om.dojoRockSanctuary.setZone === 'function') {
          this.om.dojoRockSanctuary.setZone(targetMap.gx, targetMap.gy, this.om.collisions);
        } else {
          this.om.dojoRockSanctuary.setVisible(false);
        }
      }
      if (this.om.stylizedRiver) {
        if (typeof this.om.stylizedRiver.setZone === 'function') {
          this.om.stylizedRiver.setZone(targetMap.id, targetMap.gx, targetMap.gy);
        } else {
          this.om.stylizedRiver.setVisible(isRiverZone);
        }
      }
      if (this.om.dojoBambooGrove) {
        this.om.dojoBambooGrove.setVisible(false);
      }
      if (this.om.dojoBuilding) {
        this.om.dojoBuilding.setVisible(false);
      }
      if (this.om.forestNatureManager) {
        this.om.forestNatureManager.setZone(targetMap.gx, targetMap.gy, this.om.collisions);
      } else if (this.om.dojoNatureManager) {
        this.om.dojoNatureManager.setVisible(false);
      }
      if (this.om.dojoPond) {
        this.om.dojoPond.setVisible(false);
      }
      if (this.om.westPond) {
        this.om.westPond.setVisible(isZone2_3);
      }
      if (this.om.savannahOasis) {
        this.om.savannahOasis.setVisible(isZone3_1);
      }
      if (this.om.arcticFrozenLake) {
        this.om.arcticFrozenLake.setVisible(isZone1_1);
      }
      if (this.om.arcticFrozenLake2) {
        this.om.arcticFrozenLake2.setVisible(isZone1_1);
      }
      if (this.om.mysticPond) {
        this.om.mysticPond.setVisible(isZone1_2);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setRiverActive === 'function') {
        this.om.stylizedEnv.setRiverActive(isRiverZone);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setPondActive === 'function') {
        if (isZone2_3) {
          this.om.stylizedEnv.setPondActive(true, { x: -16.0, z: 14.0 }, { x: 6.2, y: 4.6 });
        } else if (isZone3_1) {
          this.om.stylizedEnv.setPondActive(true, { x: 0.0, z: 0.0 }, { x: 7.2, y: 5.4 });
        } else if (isZone1_1) {
          this.om.stylizedEnv.setPondActive(true, { x: -22.9, z: 2.3 }, { x: 6.2, y: 4.6 });
        } else if (isZone1_2) {
          this.om.stylizedEnv.setPondActive(true, { x: -16.0, z: 14.0 }, { x: 5.8, y: 4.4 });
        } else {
          this.om.stylizedEnv.setPondActive(false);
        }
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setPond2Active === 'function') {
        if (isZone1_1) {
          this.om.stylizedEnv.setPond2Active(true, { x: 3.7, z: -26.1 }, { x: 6.2, y: 4.6 });
        } else {
          this.om.stylizedEnv.setPond2Active(false);
        }
      }
    }

    // 8. Advance Quest Objectives connected to zone transitions
    this._updateQuestProgressForZone(targetMap);

    // 9. Display Zone Discovery Banner
    this.transitionManager.showZoneBanner(targetMap.name, biome.badge);

    // 10. Update open World Map modal if active
    if (this.worldMapModal && this.worldMapModal.isOpen) {
      this.worldMapModal.renderGrid();
    }

    if (this.om.renderer && this.om.renderer.info) {
      const heapMB = (typeof performance !== 'undefined' && performance.memory)
        ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB`
        : 'N/A';
      console.log(`[Memory Monitor] 📍 Zone: ${targetMap.id} (${targetMap.biome}) | 🖼️ GPU Textures: ${this.om.renderer.info.memory.textures} | 📐 Geometries: ${this.om.renderer.info.memory.geometries} | 🧠 Heap: ${heapMB}`);
    }

    await this._warmupShaders(this.om.renderer, this.om.scene, this.om.camera);

    if (typeof this.onMapChanged === 'function') {
      this.onMapChanged(targetMap);
    }
  }

  async loadMap(mapId, spawnOverride = null) {
    mapId = canonicalZoneId(mapId);
    const mapDef = MAP_REGISTRY[mapId] || MAP_REGISTRY.zone_2_2 || MAP_REGISTRY.forest_valley;
    const prevBiome = this.currentMapDef ? this.currentMapDef.biome : null;

    // Smart Biome Lifecycle Management:
    // Keep at most 1 external non-forest biome in memory to guarantee RAM stays around ~1.0 GB.
    // Entering Forest [2, 2] preserves the last external biome for instant zero-stutter return.
    // Entering a new, distinct external biome safely unloads the previous external biome.
    if (mapDef.biome !== 'forest') {
      if (this.currentExternalBiome && this.currentExternalBiome !== mapDef.biome) {
        if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.unloadBiome === 'function') {
          console.log(`[WorldMapManager] ♻️ Unloading previous biome '${this.currentExternalBiome}' to free RAM/VRAM before loading '${mapDef.biome}'`);
          this.om.biomeDecorationManager.unloadBiome(this.currentExternalBiome, this.om.renderer);
        }
      }
      this.currentExternalBiome = mapDef.biome;
    }

    // Unload secondary ponds not needed in destination biome
    if (typeof this.om.unloadSecondaryPonds === 'function') {
      this.om.unloadSecondaryPonds(mapDef.biome);
    }

    this.currentMapId = mapDef.id;
    this.currentMapDef = mapDef;
    this.visitedZones.add(this.currentMapId);
    mergedZonesOf(`${mapDef.gx}_${mapDef.gy}`).forEach((k) => this.visitedZones.add(`zone_${k}`));

    // 0. Ensure target biome 3D decorations and secondary ponds are loaded on-demand
    // Hito 23: grand islands replace the legacy 80 m biome decorations
    const grandKey = GRAND_ISLAND_ZONES[mapDef.id] || null;
    if (grandKey && this.om.grandIslands && this.om.grandIslands[grandKey]) {
      await this.om.grandIslands[grandKey].init();
    } else if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.ensureBiomeLoaded === 'function') {
      await this.om.biomeDecorationManager.ensureBiomeLoaded(mapDef.biome, mapDef.gx, mapDef.gy);
    }
    const isIslandMap = Boolean(grandKey) || mapDef.id === 'zone_2_2' || mapDef.id === 'zone_3_2';
    if (!isIslandMap && typeof this.om.ensureZonePonds === 'function') {
      await this.om.ensureZonePonds(mapDef.id, mapDef.gx, mapDef.gy);
    }

    const biome = this.biomeManager.applyBiome(mapDef.biome, 1.5, mapDef.gx, mapDef.gy);
    if (this.om.audio && typeof this.om.audio.playBiomeMusic === 'function') {
      this.om.audio.playBiomeMusic(mapDef.biome);
    }
    if (!grandKey && this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.setZone === 'function') {
      this.om.biomeDecorationManager.setZone(mapDef.gx, mapDef.gy);
    }
    this.transitionManager.setPortals({});

    const isDojo = Boolean(mapDef.hasDojo || mapDef.id === 'zone_2_2' || (mapDef.gx === 2 && mapDef.gy === 2));
    const isSavanna = Boolean(mapDef.id === 'zone_3_2' || mapDef.biome === 'savannah');
    const isGrand = isSavanna || Boolean(grandKey);
    this._updateZone22Visuals(isDojo, isGrand);
    this._updateSavannaVisuals(isSavanna);
    this._updateGrandIslandVisuals(grandKey);

    // Rearrange procedurally generated forest trees & layout for this macro-zone
    if (!isDojo && !isGrand && this.om.stylizedEnv && this.om.stylizedEnv.setZone) {
      this.om.stylizedEnv.setZone(mapDef.gx, mapDef.gy, this.om.collisions);
    }
    await this._updateZoneNPCs(mapDef);
    await this._updateZoneMonsters(mapDef);
    this._updateHUDZoneInfo(mapDef, biome);
    this.transitionManager.showZoneBanner(mapDef.name, biome.badge);

    // Update Dojo Sanctuary Rocks, Ivy & River (River extends along central column gx = 2)
    const isZone2_3 = (mapDef.id === 'zone_2_3' || (mapDef.gx === 2 && mapDef.gy === 3));
    const isZone3_1 = (mapDef.id === 'zone_3_1' || (mapDef.gx === 3 && mapDef.gy === 1));
    const isZone1_1 = (mapDef.id === 'zone_1_1' || (mapDef.gx === 1 && mapDef.gy === 1));
    const isZone1_2 = (mapDef.id === 'zone_1_2' || (mapDef.gx === 1 && mapDef.gy === 2));
    const isRiverZone = (mapDef.gx === 2 && mapDef.gy >= 1 && mapDef.gy <= 3 && !isDojo);

    if (isDojo || isGrand) {
      if (this.om.dojoRockSanctuary && typeof this.om.dojoRockSanctuary.setVisible === 'function') {
        this.om.dojoRockSanctuary.setVisible(false);
      }
      if (this.om.stylizedRiver && typeof this.om.stylizedRiver.setVisible === 'function') {
        this.om.stylizedRiver.setVisible(false);
      }
      if (this.om.dojoBambooGrove && typeof this.om.dojoBambooGrove.setVisible === 'function') {
        this.om.dojoBambooGrove.setVisible(false);
      }
      if (this.om.dojoBuilding && typeof this.om.dojoBuilding.setVisible === 'function') {
        this.om.dojoBuilding.setVisible(false);
      }
      if (this.om.forestNatureManager && typeof this.om.forestNatureManager.setVisible === 'function') {
        this.om.forestNatureManager.setVisible(false);
      } else if (this.om.dojoNatureManager && typeof this.om.dojoNatureManager.setVisible === 'function') {
        this.om.dojoNatureManager.setVisible(false);
      }
      if (this.om.dojoPond && typeof this.om.dojoPond.setVisible === 'function') {
        this.om.dojoPond.setVisible(false);
      }
      if (this.om.westPond && typeof this.om.westPond.setVisible === 'function') {
        this.om.westPond.setVisible(false);
      }
      if (this.om.savannahOasis && typeof this.om.savannahOasis.setVisible === 'function') {
        this.om.savannahOasis.setVisible(false);
      }
      if (this.om.arcticFrozenLake && typeof this.om.arcticFrozenLake.setVisible === 'function') {
        this.om.arcticFrozenLake.setVisible(false);
      }
      if (this.om.arcticFrozenLake2 && typeof this.om.arcticFrozenLake2.setVisible === 'function') {
        this.om.arcticFrozenLake2.setVisible(false);
      }
      if (this.om.mysticPond && typeof this.om.mysticPond.setVisible === 'function') {
        this.om.mysticPond.setVisible(false);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setRiverActive === 'function') {
        this.om.stylizedEnv.setRiverActive(false);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setPondActive === 'function') {
        this.om.stylizedEnv.setPondActive(false);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setPond2Active === 'function') {
        this.om.stylizedEnv.setPond2Active(false);
      }
    } else {
      if (this.om.dojoRockSanctuary) {
        if (typeof this.om.dojoRockSanctuary.setZone === 'function') {
          this.om.dojoRockSanctuary.setZone(mapDef.gx, mapDef.gy, this.om.collisions);
        } else {
          this.om.dojoRockSanctuary.setVisible(false);
        }
      }
      if (this.om.stylizedRiver) {
        if (typeof this.om.stylizedRiver.setZone === 'function') {
          this.om.stylizedRiver.setZone(mapDef.id, mapDef.gx, mapDef.gy);
        } else {
          this.om.stylizedRiver.setVisible(isRiverZone);
        }
      }
      if (this.om.dojoBambooGrove) {
        this.om.dojoBambooGrove.setVisible(false);
      }
      if (this.om.dojoBuilding) {
        this.om.dojoBuilding.setVisible(false);
      }
      if (this.om.forestNatureManager) {
        this.om.forestNatureManager.setZone(mapDef.gx, mapDef.gy, this.om.collisions);
      } else if (this.om.dojoNatureManager) {
        this.om.dojoNatureManager.setVisible(false);
      }
      if (this.om.dojoPond) {
        this.om.dojoPond.setVisible(false);
      }
      if (this.om.westPond) {
        this.om.westPond.setVisible(isZone2_3);
      }
      if (this.om.savannahOasis) {
        this.om.savannahOasis.setVisible(isZone3_1);
      }
      if (this.om.arcticFrozenLake) {
        this.om.arcticFrozenLake.setVisible(isZone1_1);
      }
      if (this.om.arcticFrozenLake2) {
        this.om.arcticFrozenLake2.setVisible(isZone1_1);
      }
      if (this.om.mysticPond) {
        this.om.mysticPond.setVisible(isZone1_2);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setRiverActive === 'function') {
        this.om.stylizedEnv.setRiverActive(isRiverZone);
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setPondActive === 'function') {
        if (isZone2_3) {
          this.om.stylizedEnv.setPondActive(true, { x: 29.4, z: -16.2 }, { x: 4.1, y: 3.0 });
        } else if (isZone3_1) {
          this.om.stylizedEnv.setPondActive(true, { x: 0.0, z: 0.0 }, { x: 7.2, y: 5.4 });
        } else if (isZone1_1) {
          this.om.stylizedEnv.setPondActive(true, { x: -22.9, z: 2.3 }, { x: 6.2, y: 4.6 });
        } else if (isZone1_2) {
          this.om.stylizedEnv.setPondActive(true, { x: -16.0, z: 14.0 }, { x: 5.8, y: 4.4 });
        } else {
          this.om.stylizedEnv.setPondActive(false);
        }
      }
      if (this.om.stylizedEnv && typeof this.om.stylizedEnv.setPond2Active === 'function') {
        if (isZone1_1) {
          this.om.stylizedEnv.setPond2Active(true, { x: 3.7, z: -26.1 }, { x: 6.2, y: 4.6 });
        } else {
          this.om.stylizedEnv.setPond2Active(false);
        }
      }
    }

    if (spawnOverride && this.om.player) {
      let spawnY = spawnOverride.y || 0;
      if (isDojo && this.om.demoScenaZone && typeof this.om.demoScenaZone.getHeight === 'function') {
        spawnY = this.om.demoScenaZone.getHeight(spawnOverride.x, spawnOverride.z);
      }
      this.om.player.teleport(spawnOverride.x, spawnY, spawnOverride.z, spawnOverride.yaw ?? Math.PI);
      if (this.om.cameraController) {
        this.om.cameraController.setFollowTarget(this.om.player, true);
      }
    } else if (this.om.player) {
      const defSpawn = mapDef.defaultSpawn || { x: 0, z: 2 };
      let spawnY = defSpawn.y || 0;
      if (isDojo && this.om.demoScenaZone && typeof this.om.demoScenaZone.getHeight === 'function') {
        spawnY = this.om.demoScenaZone.getHeight(defSpawn.x, defSpawn.z);
      }
      this.om.player.teleport(defSpawn.x, spawnY, defSpawn.z, defSpawn.yaw ?? Math.PI);
      if (this.om.cameraController) {
        this.om.cameraController.setFollowTarget(this.om.player, true);
      }
    }

    await this._warmupShaders(this.om.renderer, this.om.scene, this.om.camera);

    this._updateQuestProgressForZone(mapDef);

    if (typeof this.onMapChanged === 'function') {
      this.onMapChanged(mapDef);
    }
  }

  _updateQuestProgressForZone(targetMap) {
    if (!this.om || !this.om.questManager || !targetMap) return;
    const qm = this.om.questManager;

    // Cartographer side quest: visit biomes outside forest
    if (targetMap.biome && targetMap.biome !== 'forest') {
      qm.advanceStep('quest_world_cartographer', 'visit_biomes', true);
    }

    // Main story location steps in 3x3 layout & Grand Islands
    if (targetMap.gx === 3 && targetMap.gy === 2) {
      qm.advanceStep('quest_hostile_sands', 'cross_to_savannah', true);
      qm.advanceStep('quest_hunt_beaked_chimera', 'reach_wastes', true);
    }
    if (targetMap.gx === 3 && targetMap.gy === 1) {
      qm.advanceStep('quest_hunt_beaked_chimera', 'reach_wastes', true);
    }
    if (targetMap.gx === 2 && targetMap.gy === 1) {
      qm.advanceStep('quest_blizzard_core', 'reach_peaks', true);
    }
    if (targetMap.biome === 'mystic' || (targetMap.gx === 1 && targetMap.gy === 2)) {
      qm.advanceStep('quest_astral_void_echoes', 'enter_mystic', true);
    }
    if (targetMap.gx === 1 && targetMap.gy === 3) {
      qm.advanceStep('quest_forbidden_resonance', 'reach_sanctuary', true);
    }
    if (targetMap.gx === 2 && targetMap.gy === 3) {
      qm.advanceStep('quest_sulfur_threshold', 'reach_threshold', true);
    }
    if (targetMap.gx === 3 && targetMap.gy === 3) {
      qm.advanceStep('quest_primeval_purification', 'enter_catacombs', true);
    }

    // Retired corner zones now live inside their island: reaching the island reaches them
    const merged = mergedZonesOf(`${targetMap.gx}_${targetMap.gy}`);
    if (merged.includes('3_1')) qm.advanceStep('quest_hunt_beaked_chimera', 'reach_wastes', true);
    if (merged.includes('1_1')) qm.advanceStep('quest_blizzard_core', 'reach_peaks', true);
    if (merged.includes('1_3')) qm.advanceStep('quest_forbidden_resonance', 'reach_sanctuary', true);
    if (merged.includes('3_3')) qm.advanceStep('quest_primeval_purification', 'enter_catacombs', true);
  }

  exportSaveData() {
    return {
      mapId: this.currentMapId,
      name: this.currentMapDef?.name || 'Valle del Dojo',
      coords: [this.currentMapDef?.gx ?? 3, this.currentMapDef?.gy ?? 3],
      playerPos: this.om.player ? {
        x: this.om.player.position.x,
        y: this.om.player.position.y,
        z: this.om.player.position.z,
        yaw: this.om.player.yaw || 0
      } : null,
      visitedZones: Array.from(this.visitedZones)
    };
  }

  setSubQuadrant(subQ) {
    this.currentSubQuadrant = subQ;
    const biome = this.biomeManager ? this.biomeManager.currentBiomeDef : null;
    this._updateHUDZoneInfo(this.currentMapDef, biome);
    if (this.worldMapModal && this.worldMapModal.isOpen) {
      this.worldMapModal.highlightSubQuadrant(subQ);
    }
  }

  _updateHUDZoneInfo(mapDef, biome) {
    const zoneBadgeEl = document.getElementById('overworld-zone-coord-badge');
    if (zoneBadgeEl) {
      const sunColor = (biome && biome.lighting && biome.lighting.sunColor) ? '#' + biome.lighting.sunColor.toString(16) : '#22c55e';
      const subQ = this.currentSubQuadrant || 'SE';
      zoneBadgeEl.innerHTML = `
        <span class="hud-biome-dot" style="background:${sunColor}"></span>
        <span class="hud-zone-name">${mapDef.regionTitle}</span>
        <span class="hud-zone-coord">[${mapDef.gx ?? 3}, ${mapDef.gy ?? 3}]</span>
        <span class="hud-subq-badge">${subQ}</span>
      `;
    }
  }

  async _updateZoneNPCs(mapDef) {
    if (this.om.npcManager && typeof this.om.npcManager.loadZoneNPCs === 'function') {
      await this.om.npcManager.loadZoneNPCs(mapDef);
    }
    if (this.om.collisions) {
      this.om.collisions.removeCirclesByTag('npc');
      this.om.collisions.removeCirclesByTag('npc_paladill');
      (mapDef.npcs || []).forEach(def => {
        // Skip recruited heroes who have joined permanently and disappeared from the zone
        if (def.heroId && this.om.equipmentManager && this.om.equipmentManager.isHeroUnlocked(def.heroId)) {
          return;
        }
        const isFox = def.model && def.model.includes('fox');
        const isPaladill = def.model && def.model.includes('paladill');
        const colRadius = def.collisionRadius !== undefined 
          ? def.collisionRadius 
          : (isFox ? 0.45 : (isPaladill ? 1.2 : 0.75));
        this.om.collisions.addCircle(def.position.x, def.position.z, colRadius, 'npc_' + def.id);
      });
    }
  }

  async _updateZoneMonsters(mapDef) {
    if (this.om.monsters && typeof this.om.monsters.spawnZoneMonsters === 'function') {
      await this.om.monsters.spawnZoneMonsters(mapDef);
    }
  }

  toggleWorldMap() {
    if (document.body.classList.contains('state-combat') || 
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      this.closeWorldMap();
      return;
    }
    if (this.worldMapModal) {
      this.worldMapModal.toggle();
      if (this.worldMapModal.isOpen && this.om.questManager) {
        this.om.questManager.advanceStep('quest_world_cartographer', 'open_map', true);
      }
    }
  }

  openWorldMap() {
    if (document.body.classList.contains('state-combat') || 
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      return;
    }
    if (this.worldMapModal) {
      this.worldMapModal.open();
      if (this.om.questManager) {
        this.om.questManager.advanceStep('quest_world_cartographer', 'open_map', true);
      }
    }
  }

  closeWorldMap() {
    if (this.worldMapModal) {
      this.worldMapModal.close();
    }
  }

  update(dt) {
    if (this.transitionManager && this.om.player) {
      this.transitionManager.update(dt, this.om.player.position);
    }
  }

  _updateZone22Visuals(isZone22, isSavanna = false) {
    if (this.om.demoScenaZone) {
      this.om.demoScenaZone.setActive(isZone22);
    }
    if (this.om.demoScenaDebugUI) {
      this.om.demoScenaDebugUI.setVisible(isZone22);
    }
    if (isZone22) {
      if (this.om.savannaZone) {
        this.om.savannaZone.setActive(false);
      }
      if (ISLANDS_REGISTRY.island_forest) ISLANDS_REGISTRY.island_forest.isCurrent = true;
      if (ISLANDS_REGISTRY.island_savannah) ISLANDS_REGISTRY.island_savannah.isCurrent = false;

      if (this.om.collisions) {
        if (typeof this.om.collisions.setBounds === 'function') {
          this.om.collisions.setBounds(-160, 160, -160, 160);
        }
        if (typeof this.om.collisions.removeCirclesByTag === 'function') {
          this.om.collisions.removeCirclesByTag('forest_tree');
          this.om.collisions.removeCirclesByTag('dojo_rock');
          this.om.collisions.removeCirclesByTag('dojo_river');
          this.om.collisions.removeCirclesByTag('river_bank');
          this.om.collisions.removeCirclesByTag('river_waterfall');
          this.om.collisions.removeCirclesByTag('river_chasm');
          this.om.collisions.removeCirclesByTag('dojo_pond');
          this.om.collisions.removeCirclesByTag('forest_nature_');
          this.om.collisions.removeCirclesByTag('npc_paladill');
        }
        if (typeof this.om.collisions.removeBoxesByTag === 'function') {
          this.om.collisions.removeBoxesByTag('river_bridge');
          this.om.collisions.removeBoxesByTag('dojo_pagoda');
        }
      }
      if (this.om.stylizedEnv) {
        if (typeof this.om.stylizedEnv.setVisible === 'function') {
          this.om.stylizedEnv.setVisible(false);
        }
        if (this.om.stylizedEnv.group) {
          this.om.stylizedEnv.group.visible = false;
        }
      }
      if (this.om.magicalSkybox && typeof this.om.magicalSkybox.setVisible === 'function') {
        this.om.magicalSkybox.setVisible(false);
      }
      if (this.om.zoneParticleManager && typeof this.om.zoneParticleManager.setVisible === 'function') {
        this.om.zoneParticleManager.setVisible(false);
      }
      if (this.om.dojoRockSanctuary && typeof this.om.dojoRockSanctuary.setVisible === 'function') {
        this.om.dojoRockSanctuary.setVisible(false);
      }
      if (this.om.stylizedRiver && typeof this.om.stylizedRiver.setVisible === 'function') {
        this.om.stylizedRiver.setVisible(false);
      }
      if (this.om.dojoBambooGrove && typeof this.om.dojoBambooGrove.setVisible === 'function') {
        this.om.dojoBambooGrove.setVisible(false);
      }
      if (this.om.dojoBuilding && typeof this.om.dojoBuilding.setVisible === 'function') {
        this.om.dojoBuilding.setVisible(false);
      }
      if (this.om.forestNatureManager && typeof this.om.forestNatureManager.setVisible === 'function') {
        this.om.forestNatureManager.setVisible(false);
      } else if (this.om.dojoNatureManager && typeof this.om.dojoNatureManager.setVisible === 'function') {
        this.om.dojoNatureManager.setVisible(false);
      }
      if (this.om.dojoPond && typeof this.om.dojoPond.setVisible === 'function') {
        this.om.dojoPond.setVisible(false);
      }
      if (this.om.westPond && typeof this.om.westPond.setVisible === 'function') {
        this.om.westPond.setVisible(false);
      }
      if (this.om.savannahOasis && typeof this.om.savannahOasis.setVisible === 'function') {
        this.om.savannahOasis.setVisible(false);
      }
      if (this.om.arcticFrozenLake && typeof this.om.arcticFrozenLake.setVisible === 'function') {
        this.om.arcticFrozenLake.setVisible(false);
      }
      if (this.om.arcticFrozenLake2 && typeof this.om.arcticFrozenLake2.setVisible === 'function') {
        this.om.arcticFrozenLake2.setVisible(false);
      }
      if (this.om.mysticPond && typeof this.om.mysticPond.setVisible === 'function') {
        this.om.mysticPond.setVisible(false);
      }
      if (this.om.environmentSystem) {
        if (this.om.environmentSystem.sunLight) this.om.environmentSystem.sunLight.visible = false;
        if (this.om.environmentSystem.hemiLight) this.om.environmentSystem.hemiLight.visible = false;
      }
      if (this.om.stylizedEnv && this.om.stylizedEnv.sunLight) {
        this.om.stylizedEnv.sunLight.visible = false;
      }
      if (this.om.scene) {
        this.om.scene.background = null;
      }
    } else if (!isSavanna) {
      if (this.om.collisions && typeof this.om.collisions.setBounds === 'function') {
        this.om.collisions.setBounds(-38.5, 38.5, -38.5, 38.5);
      }
      if (this.om.environmentSystem) {
        if (this.om.environmentSystem.sunLight) this.om.environmentSystem.sunLight.visible = true;
        if (this.om.environmentSystem.hemiLight) this.om.environmentSystem.hemiLight.visible = true;
        if (typeof this.om.environmentSystem.setPreset === 'function') {
          this.om.environmentSystem.setPreset(this.om.environmentSystem.currentPresetId || 'dojo_day');
        }
      }
      if (this.om.stylizedEnv) {
        if (typeof this.om.stylizedEnv.setVisible === 'function') {
          this.om.stylizedEnv.setVisible(true);
        }
        if (this.om.stylizedEnv.group) {
          this.om.stylizedEnv.group.visible = true;
        }
        if (this.om.stylizedEnv.sunLight) {
          this.om.stylizedEnv.sunLight.visible = true;
        }
      }
      if (this.om.magicalSkybox && typeof this.om.magicalSkybox.setVisible === 'function') {
        this.om.magicalSkybox.setVisible(true);
      }
      if (this.om.zoneParticleManager && typeof this.om.zoneParticleManager.setVisible === 'function') {
        this.om.zoneParticleManager.setVisible(true);
      }
    }
  }

  _updateSavannaVisuals(isSavanna) {
    if (this.om.savannaZone) {
      this.om.savannaZone.setActive(isSavanna);
    }
    if (isSavanna) {
      if (this.om.demoScenaZone) {
        this.om.demoScenaZone.setActive(false);
      }
      if (this.om.demoScenaDebugUI) {
        this.om.demoScenaDebugUI.setVisible(false);
      }
      if (ISLANDS_REGISTRY.island_forest) ISLANDS_REGISTRY.island_forest.isCurrent = false;
      if (ISLANDS_REGISTRY.island_savannah) ISLANDS_REGISTRY.island_savannah.isCurrent = true;

      if (this.om.collisions) {
        if (typeof this.om.collisions.setBounds === 'function') {
          this.om.collisions.setBounds(-160, 160, -160, 160);
        }
        if (typeof this.om.collisions.removeCirclesByTag === 'function') {
          this.om.collisions.removeCirclesByTag('forest_tree');
          this.om.collisions.removeCirclesByTag('dojo_rock');
          this.om.collisions.removeCirclesByTag('dojo_river');
          this.om.collisions.removeCirclesByTag('river_bank');
          this.om.collisions.removeCirclesByTag('river_waterfall');
          this.om.collisions.removeCirclesByTag('river_chasm');
          this.om.collisions.removeCirclesByTag('dojo_pond');
          this.om.collisions.removeCirclesByTag('forest_nature_');
          this.om.collisions.removeCirclesByTag('npc_paladill');
          this.om.collisions.removeCirclesByTag('savannah_');
        }
        if (typeof this.om.collisions.removeBoxesByTag === 'function') {
          this.om.collisions.removeBoxesByTag('river_bridge');
          this.om.collisions.removeBoxesByTag('dojo_pagoda');
        }
      }
      if (this.om.stylizedEnv) {
        if (typeof this.om.stylizedEnv.setVisible === 'function') {
          this.om.stylizedEnv.setVisible(false);
        }
        if (this.om.stylizedEnv.group) {
          this.om.stylizedEnv.group.visible = false;
        }
        if (this.om.stylizedEnv.sunLight) {
          this.om.stylizedEnv.sunLight.visible = false;
        }
      }
      if (this.om.dojoRockSanctuary && typeof this.om.dojoRockSanctuary.setVisible === 'function') {
        this.om.dojoRockSanctuary.setVisible(false);
      }
      if (this.om.stylizedRiver && typeof this.om.stylizedRiver.setVisible === 'function') {
        this.om.stylizedRiver.setVisible(false);
      }
      if (this.om.dojoBambooGrove && typeof this.om.dojoBambooGrove.setVisible === 'function') {
        this.om.dojoBambooGrove.setVisible(false);
      }
      if (this.om.dojoBuilding && typeof this.om.dojoBuilding.setVisible === 'function') {
        this.om.dojoBuilding.setVisible(false);
      }
      if (this.om.forestNatureManager && typeof this.om.forestNatureManager.setVisible === 'function') {
        this.om.forestNatureManager.setVisible(false);
      } else if (this.om.dojoNatureManager && typeof this.om.dojoNatureManager.setVisible === 'function') {
        this.om.dojoNatureManager.setVisible(false);
      }
      if (this.om.dojoPond && typeof this.om.dojoPond.setVisible === 'function') {
        this.om.dojoPond.setVisible(false);
      }
      if (this.om.westPond && typeof this.om.westPond.setVisible === 'function') {
        this.om.westPond.setVisible(false);
      }
      if (this.om.savannahOasis && typeof this.om.savannahOasis.setVisible === 'function') {
        this.om.savannahOasis.setVisible(false);
      }
      if (this.om.arcticFrozenLake && typeof this.om.arcticFrozenLake.setVisible === 'function') {
        this.om.arcticFrozenLake.setVisible(false);
      }
      if (this.om.arcticFrozenLake2 && typeof this.om.arcticFrozenLake2.setVisible === 'function') {
        this.om.arcticFrozenLake2.setVisible(false);
      }
      if (this.om.mysticPond && typeof this.om.mysticPond.setVisible === 'function') {
        this.om.mysticPond.setVisible(false);
      }
      if (this.om.environmentSystem) {
        if (this.om.environmentSystem.sunLight) this.om.environmentSystem.sunLight.visible = false;
        if (this.om.environmentSystem.hemiLight) this.om.environmentSystem.hemiLight.visible = false;
      }
      if (this.om.biomeDecorationManager && this.om.biomeDecorationManager.savannahGroup) {
        this.om.biomeDecorationManager.savannahGroup.visible = false;
      }
      if (this.om.magicalSkybox && typeof this.om.magicalSkybox.setVisible === 'function') {
        this.om.magicalSkybox.setVisible(false);
      }
      if (this.om.zoneParticleManager && typeof this.om.zoneParticleManager.setVisible === 'function') {
        this.om.zoneParticleManager.setVisible(false);
      }
      if (this.om.scene) {
        this.om.scene.background = null;
      }
    } else {
      if (this.om.savannaZone) {
        this.om.savannaZone.setActive(false);
      }
    }
  }

  /** Hito 23: activates one grand island (Arctic / Mystic / Dungeon) and hides the legacy 80 m world. */
  _updateGrandIslandVisuals(activeKey) {
    const islands = this.om.grandIslands || {};
    Object.entries(islands).forEach(([k, z]) => {
      if (z && k !== activeKey && z.isActive) z.setActive(false);
      const reg = ISLANDS_REGISTRY[`island_${k}`];
      if (reg) reg.isCurrent = (k === activeKey);
    });
    if (!activeKey || !islands[activeKey]) return;
    if (this.om.savannaZone) this.om.savannaZone.setActive(false);
    if (this.om.demoScenaZone) this.om.demoScenaZone.setActive(false);
    if (this.om.demoScenaDebugUI) this.om.demoScenaDebugUI.setVisible(false);
    if (ISLANDS_REGISTRY.island_forest) ISLANDS_REGISTRY.island_forest.isCurrent = false;
    if (ISLANDS_REGISTRY.island_savannah) ISLANDS_REGISTRY.island_savannah.isCurrent = false;
    const om = this.om;
    if (om.collisions) {
      if (typeof om.collisions.setBounds === 'function') om.collisions.setBounds(-160, 160, -160, 160);
      if (typeof om.collisions.removeCirclesByTag === 'function') {
        ['forest_tree', 'dojo_rock', 'dojo_river', 'river_bank', 'river_waterfall', 'river_chasm', 'dojo_pond', 'forest_nature_', 'npc_paladill', 'savannah_']
          .forEach((t) => om.collisions.removeCirclesByTag(t));
      }
      if (typeof om.collisions.removeBoxesByTag === 'function') {
        om.collisions.removeBoxesByTag('river_bridge');
        om.collisions.removeBoxesByTag('dojo_pagoda');
      }
    }
    if (om.stylizedEnv) {
      if (typeof om.stylizedEnv.setVisible === 'function') om.stylizedEnv.setVisible(false);
      if (om.stylizedEnv.group) om.stylizedEnv.group.visible = false;
      if (om.stylizedEnv.sunLight) om.stylizedEnv.sunLight.visible = false;
    }
    ['dojoRockSanctuary', 'stylizedRiver', 'dojoBambooGrove', 'dojoBuilding', 'forestNatureManager', 'dojoNatureManager',
      'dojoPond', 'westPond', 'savannahOasis', 'arcticFrozenLake', 'arcticFrozenLake2', 'mysticPond', 'magicalSkybox', 'zoneParticleManager']
      .forEach((k) => { if (om[k] && typeof om[k].setVisible === 'function') om[k].setVisible(false); });
    if (om.environmentSystem) {
      if (om.environmentSystem.sunLight) om.environmentSystem.sunLight.visible = false;
      if (om.environmentSystem.hemiLight) om.environmentSystem.hemiLight.visible = false;
    }
    const bdm = om.biomeDecorationManager;
    if (bdm) ['savannahGroup', 'arcticGroup', 'mysticGroup', 'dungeonGroup'].forEach((g) => { if (bdm[g]) bdm[g].visible = false; });
    if (om.scene) om.scene.background = null;
    islands[activeKey].setActive(true);
  }

  async travelToIsland(islandId) {
    const grand = GRAND_ISLAND_TRAVEL[islandId];
    if (grand) {
      console.log(`[WorldMapManager] ⛵ Viajando a ${islandId}...`);
      await this.changeMap(grand.zone);
      if (this.om.player) {
        const sp = grand.spawn;
        const y = this.om.getGroundHeight ? this.om.getGroundHeight(sp.x, sp.z) : 2;
        this.om.player.teleport(sp.x, y, sp.z, sp.yaw);
        if (this.om.player.velocity) this.om.player.velocity.set(0, 0, 0);
      }
      return;
    }
    console.log(`[WorldMapManager] ⛵ Viajando a ${islandId}...`);
    if (islandId === 'island_savannah') {
      await this.changeMap('zone_3_2');
      if (this.om.player) {
        const dock = FERRY_DOCKS.zone_3_2.arrive;
        const spawnX = dock.x;
        const spawnZ = dock.z;
        const spawnY = (this.om.savannaZone && typeof this.om.savannaZone.getHeight === 'function')
          ? this.om.savannaZone.getHeight(spawnX, spawnZ)
          : 25.5;
        this.om.player.teleport(spawnX, spawnY, spawnZ, dock.yaw);
        if (this.om.player.velocity) this.om.player.velocity.set(0, 0, 0);
      }
    } else if (islandId === 'island_forest') {
      await this.changeMap('zone_2_2');
      if (this.om.player) {
        const dock = FERRY_DOCKS.zone_2_2.arrive;
        const spawnX = dock.x;
        const spawnZ = dock.z;
        const spawnY = (this.om.demoScenaZone && typeof this.om.demoScenaZone.getHeight === 'function')
          ? this.om.demoScenaZone.getHeight(spawnX, spawnZ)
          : 4.5;
        this.om.player.teleport(spawnX, spawnY, spawnZ, dock.yaw);
        if (this.om.player.velocity) this.om.player.velocity.set(0, 0, 0);
      }
    }
  }

  async _warmupShaders(renderer, scene, camera) {
    if (!renderer || !scene || !camera) return;
    try {
      // 1. Asynchronously compile all scene shaders via KHR_parallel_shader_compile.
      // This delegates shader compilation to GPU driver worker threads without blocking the CPU event loop.
      if (typeof renderer.compileAsync === 'function') {
        await renderer.compileAsync(scene, camera);
      } else if (typeof renderer.compile === 'function') {
        renderer.compile(scene, camera);
      }
      console.log('[WorldMapManager] 🚀 Non-blocking Shader compilation complete (0ms CPU stall)');
    } catch (e) {
      console.warn('[WorldMapManager] Shader warmup error (safely skipped):', e);
    }
  }
}
