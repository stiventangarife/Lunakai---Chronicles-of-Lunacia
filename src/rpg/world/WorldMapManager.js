// WorldMapManager.js - Master coordinator for 5x5 World Grid, 5 Biomes, Dofus Portals & World Map UI
import * as THREE from 'three';
import { MAP_REGISTRY, getZoneByCoord } from './MapRegistry.js';
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
    this.worldMapModal = new WorldMapModal(this);
  }

  init(stylizedEnv, decorationManager = null, skybox = null, particleManager = null, initialMapId = 'zone_2_2', visitedZonesList = null, playerPosOverride = null) {
    this.decorationManager = decorationManager;
    this.skybox = skybox;
    this.particleManager = particleManager;
    this.biomeManager = new BiomeThemeManager(this.scene, stylizedEnv, decorationManager, skybox, particleManager);
    this.transitionManager = new ZoneTransitionManager(this.scene, this.audio);
    if (!this.worldMapModal) {
      this.worldMapModal = new WorldMapModal(this);
    }

    if (visitedZonesList && Array.isArray(visitedZonesList)) {
      this.visitedZones = new Set(visitedZonesList);
    }

    // Setup portal trigger listener
    this.transitionManager.onTransitionStart = () => {
      if (this.om.playerController) {
        this.om.playerController.setEnabled(false);
      }
    };

    this.transitionManager.onPortalTrigger = async (portal) => {
      await this.changeMap(portal.targetMap, portal.targetPortal);
    };

    this.transitionManager.onTransitionEnd = () => {
      if (this.om.playerController && this.om.state === 'EXPLORING') {
        this.om.playerController.setEnabled(true);
      }
    };

    // Load initial map based on saved adventure slot or default Dojo
    this.loadMap(initialMapId || 'zone_2_2', playerPosOverride);
  }

  async changeMap(targetMapId, targetPortalDirection) {
    console.log(`[WorldMapManager] Changing map from ${this.currentMapId} -> ${targetMapId} (entering at ${targetPortalDirection})`);
    const targetMap = MAP_REGISTRY[targetMapId];
    if (!targetMap) {
      console.error(`[WorldMapManager] Target map not found: ${targetMapId}`);
      return;
    }

    const prevBiome = this.currentMapDef ? this.currentMapDef.biome : null;

    // Unload previous biome if switching to a different biome (freeing VRAM / JS Heap)
    if (prevBiome && prevBiome !== targetMap.biome && prevBiome !== 'forest') {
      if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.unloadBiome === 'function') {
        this.om.biomeDecorationManager.unloadBiome(prevBiome, this.om.renderer);
      }
    }

    this.currentMapId = targetMap.id || targetMapId;
    this.currentMapDef = targetMap;
    this.visitedZones.add(this.currentMapId);

    // 0. Ensure target biome 3D decorations and secondary ponds are loaded on-demand behind transition curtain
    if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.ensureBiomeLoaded === 'function') {
      await this.om.biomeDecorationManager.ensureBiomeLoaded(targetMap.biome, targetMap.gx, targetMap.gy);
    }
    if (typeof this.om.ensureZonePonds === 'function') {
      await this.om.ensureZonePonds(targetMap.id, targetMap.gx, targetMap.gy);
    }

    // 1. Apply Biome visual themes and atmospheric lighting
    const biome = this.biomeManager.applyBiome(targetMap.biome, 1.5, targetMap.gx, targetMap.gy);
    if (this.om.audio && typeof this.om.audio.playBiomeMusic === 'function') {
      this.om.audio.playBiomeMusic(targetMap.biome);
    }
    if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.setZone === 'function') {
      this.om.biomeDecorationManager.setZone(targetMap.gx, targetMap.gy);
    }

    // 2. Set Active Portals in ZoneTransitionManager
    this.transitionManager.setPortals(targetMap.portals);

    // Rearrange procedurally generated forest trees & layout for this macro-zone
    if (this.om.stylizedEnv && this.om.stylizedEnv.setZone) {
      this.om.stylizedEnv.setZone(targetMap.gx, targetMap.gy, this.om.collisions);
    }

    // 3. Position Player at entry spawn
    let spawn = targetMap.defaultSpawn;
    if (targetPortalDirection && targetMap.portals[targetPortalDirection]) {
      const portalDef = targetMap.portals[targetPortalDirection];
      spawn = portalDef.spawnOffset || portalDef.position;
    }

    if (this.om.player) {
      this.om.player.teleport(spawn.x, spawn.y || 0, spawn.z, spawn.yaw);
      // Reset velocity
      if (this.om.player.velocity) {
        this.om.player.velocity.set(0, 0, 0);
      }
    }

    // 4. Update Camera to focus on newly placed player
    if (this.om.cameraController && this.om.player) {
      this.om.cameraController.setFollowTarget(this.om.player);
      this.om.cameraController.update(0.016);
    }

    // 5. Update NPC for this zone
    if (this.om.npcManager) {
      await this._updateZoneNPCs(targetMap);
    }

    // 6. Update Monsters for this zone
    if (this.om.monsters) {
      this._updateZoneMonsters(targetMap);
    }

    // 6b. Update Quest Interactables (Gathering nodes & plant guardians) for this zone
    if (this.om.questInteractables) {
      this.om.questInteractables.loadForZone(`${targetMap.gx}_${targetMap.gy}`);
    }

    // 7. Update HUD zone indicator
    this._updateHUDZoneInfo(targetMap, biome);

    // 7b. Update Dojo Sanctuary Rocks, Ivy & River (River extends along central column gx = 2)
    const isDojo = (targetMap.hasDojo || targetMap.id === 'zone_2_2' || (targetMap.gx === 2 && targetMap.gy === 2));
    const isZone2_3 = (targetMap.id === 'zone_2_3' || (targetMap.gx === 2 && targetMap.gy === 3));
    const isZone3_1 = (targetMap.id === 'zone_3_1' || (targetMap.gx === 3 && targetMap.gy === 1));
    const isZone1_1 = (targetMap.id === 'zone_1_1' || (targetMap.gx === 1 && targetMap.gy === 1));
    const isZone1_2 = (targetMap.id === 'zone_1_2' || (targetMap.gx === 1 && targetMap.gy === 2));
    const isRiverZone = (targetMap.gx === 2 && targetMap.gy >= 1 && targetMap.gy <= 3);
    if (this.om.dojoRockSanctuary) {
      if (typeof this.om.dojoRockSanctuary.setZone === 'function') {
        this.om.dojoRockSanctuary.setZone(targetMap.gx, targetMap.gy, this.om.collisions);
      } else {
        this.om.dojoRockSanctuary.setVisible(isDojo);
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
      this.om.dojoBambooGrove.setVisible(isDojo);
    }
    if (this.om.dojoBuilding) {
      this.om.dojoBuilding.setVisible(isDojo);
    }
    if (this.om.forestNatureManager) {
      this.om.forestNatureManager.setZone(targetMap.gx, targetMap.gy, this.om.collisions);
    } else if (this.om.dojoNatureManager) {
      this.om.dojoNatureManager.setVisible(isDojo);
    }
    if (this.om.dojoPond) {
      this.om.dojoPond.setVisible(isDojo);
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
      if (isDojo) {
        this.om.stylizedEnv.setPondActive(true, { x: -30.3, z: 12.0 }, { x: 4.1, y: 3.0 });
      } else if (isZone2_3) {
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

    // 8. Advance Quest Objectives connected to zone transitions
    if (this.om.questManager) {
      // Cartographer side quest: visit biomes outside forest
      if (targetMap.biome !== 'forest') {
        this.om.questManager.advanceStep('quest_world_cartographer', 'visit_biomes', true);
      }
      // Main story location steps in 3x3 layout
      if (targetMap.gx === 3 && targetMap.gy === 2) {
        this.om.questManager.advanceStep('quest_hostile_sands', 'cross_to_savannah', true);
      }
      if (targetMap.gx === 3 && targetMap.gy === 1) {
        this.om.questManager.advanceStep('quest_hunt_beaked_chimera', 'reach_wastes', true);
      }
      if (targetMap.gx === 2 && targetMap.gy === 1) {
        this.om.questManager.advanceStep('quest_blizzard_core', 'reach_peaks', true);
      }
      if (targetMap.biome === 'mystic' || (targetMap.gx === 1 && targetMap.gy === 2)) {
        this.om.questManager.advanceStep('quest_astral_void_echoes', 'enter_mystic', true);
      }
      if (targetMap.gx === 1 && targetMap.gy === 3) {
        this.om.questManager.advanceStep('quest_forbidden_resonance', 'reach_sanctuary', true);
      }
      if (targetMap.gx === 2 && targetMap.gy === 3) {
        this.om.questManager.advanceStep('quest_sulfur_threshold', 'reach_threshold', true);
      }
      if (targetMap.gx === 3 && targetMap.gy === 3) {
        this.om.questManager.advanceStep('quest_primeval_purification', 'enter_catacombs', true);
      }
    }

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

    if (typeof this.onMapChanged === 'function') {
      this.onMapChanged(targetMap);
    }
  }

  loadMap(mapId, spawnOverride = null) {
    const mapDef = MAP_REGISTRY[mapId] || MAP_REGISTRY.zone_2_2 || MAP_REGISTRY.forest_valley;
    const prevBiome = this.currentMapDef ? this.currentMapDef.biome : null;

    // Unload previous biome if switching to a different biome (freeing VRAM / JS Heap)
    if (prevBiome && prevBiome !== mapDef.biome && prevBiome !== 'forest') {
      if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.unloadBiome === 'function') {
        this.om.biomeDecorationManager.unloadBiome(prevBiome, this.om.renderer);
      }
    }

    this.currentMapId = mapDef.id;
    this.currentMapDef = mapDef;
    this.visitedZones.add(this.currentMapId);

    // 0. Ensure target biome 3D decorations and secondary ponds are loaded on-demand
    if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.ensureBiomeLoaded === 'function') {
      this.om.biomeDecorationManager.ensureBiomeLoaded(mapDef.biome, mapDef.gx, mapDef.gy);
    }
    if (typeof this.om.ensureZonePonds === 'function') {
      this.om.ensureZonePonds(mapDef.id, mapDef.gx, mapDef.gy);
    }

    const biome = this.biomeManager.applyBiome(mapDef.biome, 1.5, mapDef.gx, mapDef.gy);
    if (this.om.audio && typeof this.om.audio.playBiomeMusic === 'function') {
      this.om.audio.playBiomeMusic(mapDef.biome);
    }
    if (this.om.biomeDecorationManager && typeof this.om.biomeDecorationManager.setZone === 'function') {
      this.om.biomeDecorationManager.setZone(mapDef.gx, mapDef.gy);
    }
    this.transitionManager.setPortals(mapDef.portals);

    // Rearrange procedurally generated forest trees & layout for this macro-zone
    if (this.om.stylizedEnv && this.om.stylizedEnv.setZone) {
      this.om.stylizedEnv.setZone(mapDef.gx, mapDef.gy, this.om.collisions);
    }
    this._updateZoneNPCs(mapDef);
    this._updateZoneMonsters(mapDef);
    this._updateHUDZoneInfo(mapDef, biome);
    this.transitionManager.showZoneBanner(mapDef.name, biome.badge);

    // Update Dojo Sanctuary Rocks, Ivy & River (River extends along central column gx = 2)
    const isDojo = (mapDef.hasDojo || mapDef.id === 'zone_2_2' || (mapDef.gx === 2 && mapDef.gy === 2));
    const isZone2_3 = (mapDef.id === 'zone_2_3' || (mapDef.gx === 2 && mapDef.gy === 3));
    const isZone3_1 = (mapDef.id === 'zone_3_1' || (mapDef.gx === 3 && mapDef.gy === 1));
    const isZone1_1 = (mapDef.id === 'zone_1_1' || (mapDef.gx === 1 && mapDef.gy === 1));
    const isZone1_2 = (mapDef.id === 'zone_1_2' || (mapDef.gx === 1 && mapDef.gy === 2));
    const isRiverZone = (mapDef.gx === 2 && mapDef.gy >= 1 && mapDef.gy <= 3);
    if (this.om.dojoRockSanctuary) {
      if (typeof this.om.dojoRockSanctuary.setZone === 'function') {
        this.om.dojoRockSanctuary.setZone(mapDef.gx, mapDef.gy, this.om.collisions);
      } else {
        this.om.dojoRockSanctuary.setVisible(isDojo);
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
      this.om.dojoBambooGrove.setVisible(isDojo);
    }
    if (this.om.dojoBuilding) {
      this.om.dojoBuilding.setVisible(isDojo);
    }
    if (this.om.forestNatureManager) {
      this.om.forestNatureManager.setZone(mapDef.gx, mapDef.gy, this.om.collisions);
    } else if (this.om.dojoNatureManager) {
      this.om.dojoNatureManager.setVisible(isDojo);
    }
    if (this.om.dojoPond) {
      this.om.dojoPond.setVisible(isDojo);
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
      if (isDojo) {
        this.om.stylizedEnv.setPondActive(true, { x: -30.3, z: 12.0 }, { x: 4.1, y: 3.0 });
      } else if (isZone2_3) {
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

    if (spawnOverride && this.om.player) {
      this.om.player.teleport(spawnOverride.x, spawnOverride.y || 0, spawnOverride.z, spawnOverride.yaw ?? Math.PI);
      if (this.om.cameraController) {
        this.om.cameraController.setFollowTarget(this.om.player);
        this.om.cameraController.update(0.016);
      }
    } else if (mapDef.defaultSpawn && this.om.player && mapId !== 'zone_2_2') {
      this.om.player.teleport(mapDef.defaultSpawn.x, mapDef.defaultSpawn.y || 0, mapDef.defaultSpawn.z, mapDef.defaultSpawn.yaw ?? Math.PI);
      if (this.om.cameraController) {
        this.om.cameraController.setFollowTarget(this.om.player);
        this.om.cameraController.update(0.016);
      }
    }

    if (typeof this.onMapChanged === 'function') {
      this.onMapChanged(mapDef);
    }
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

  _updateZoneMonsters(mapDef) {
    if (this.om.monsters && typeof this.om.monsters.spawnZoneMonsters === 'function') {
      this.om.monsters.spawnZoneMonsters(mapDef);
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
}
