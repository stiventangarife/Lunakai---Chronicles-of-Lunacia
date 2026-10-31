// WanderingMonsters.js - Overworld Chimera Monsters with AI Patrol, Alert ! & Procedural Biome Packs
import * as THREE from 'three';
import { ISLAND_MONSTER_LAYOUT, patrolAround } from './world/islands/IslandWorldLayout.js';
import { cloneGLTF, evictGLTF, cachedModelPaths } from '../render/ModelCache.js';
import { generatePackForBiome, ENEMY_ARCHETYPES } from './world/BiomeEnemyCatalog.js';
import { applyToonOutline } from './stylized/ToonOutline.js';
import { createQuestBeaconArrow3D } from './world/ZoneTransitionManager.js';
import { createEnemyNameplate, createEnemyAlertSprite } from './ui/EnemyNameplate.js';
import * as i18n from '../i18n/i18n.js';
import { MobRespawnDirector } from './world/MobRespawnDirector.js';
import { RESPAWN_CONFIG } from './world/islands/MobSpawnPools.js';
import { spawnPuff } from './PuffEffect.js';
import { access } from '../ui/AccessPrefs.js';

// Hito 94: tamaño en el mundo abierto. El Sapidae del jugador mide ~2,3 m en el mundo (PlayerEntity lo normaliza a 2,8 m
// contando las piezas ocultas), y los enemigos usan la misma escala que en combate, así que los grandes se veían bajitos.
// Alto mínimo en el mundo de los enemigos que deben verse más altos que el Sapidae (en «alturas de Sapidae»). Solo
// agranda: si el modelo ya es así de alto con su escala, no cambia. Los multiplicadores propios (jefe ×1,15, misiones)
// se conservan.
const SAPIDAE_WORLD_HEIGHT = 2.3;

// 30-oct (memoria de GPU): los monstruos salen de la caché de GLB compartida con el combate (ModelCache). Antes cada
// monstruo cargaba su propia copia con un GLTFLoader nuevo: cada uno subía sus 3 texturas de 1024 (~16 MB; el hombre lobo
// 2048) y el combate subía otra copia del mismo modelo. Las copias comparten texturas, geometría y materiales, así que al
// quitar un monstruo solo se libera lo suyo (aro, placas, contorno, materiales teñidos). Al cambiar de isla se sacan de la
// caché las criaturas que ya no usa nadie (también las que trajo el combate).
const CREATURE_MODEL_RE = /\/assets\/models\/(slime|wolf|treant|dryad|bear|werewolf)[^/]*\.glb$/i;
const WORLD_MIN_HEIGHT = {
  'dryad-fighter': 1.25,
  'dryad-range': 1.2,
  'dryad-mage': 1.15,
  'bear-mom': 1.15,
  'bear-dad': 1.4,
  'werewolf-boss': 1.5,
  'treant-flower': 1.0,
  'wolf-alpha': 0.75,
  'wolf-aquatic-alpha': 0.75
};
const _modelHeight = new Map(); // ruta del GLB → alto a escala 1
function worldScaleFor(mType, modelPath, mesh, configScale) {
  const k = WORLD_MIN_HEIGHT[mType];
  if (!k) return configScale;
  let h = _modelHeight.get(modelPath);
  if (h === undefined) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    h = Number.isFinite(box.max.y) ? box.max.y - Math.min(0, box.min.y) : 0;
    _modelHeight.set(modelPath, h);
  }
  if (!(h > 0)) return configScale;
  const arch = Object.values(ENEMY_ARCHETYPES).find((a) => a && a.type === mType);
  const extra = arch?.baseScale ? Math.max(1, configScale / arch.baseScale) : 1; // jefe ×1,15, misiones…
  return Math.max(configScale, (SAPIDAE_WORLD_HEIGHT * k / h) * extra);
}

export class WanderingMonsters {
  constructor(scene, collisionSystem, audioSystem) {
    this.scene = scene;
    this.collisions = collisionSystem;
    this.audio = audioSystem;
    this.om = null; // Reference to OverworldManager for bridge heights and world context

    this.monsters = [];
    this._loadingPaths = new Map(); // ruta → copias en carga (no se sacan de la caché mientras tanto)
    this.defeatedIds = new Set();
    this.questManager = null;
    this.onEncounterCallback = null;
    this.isEncounterTriggered = false;
    this.isCombatEnabled = false;

    // Hito 106: respawn de mobs (reloj propio + puntos aleatorios por isla; ver MobRespawnDirector.js)
    this.respawn = new MobRespawnDirector();
    this.respawn.registerHandler('pack', (e) => this._respawnPack(e));
    this.respawn.registerHandler('boss', (e) => this._respawnPack(e));
    this.respawn.registerHandler('fixed', (e) => this._respawnFixed(e));
    this._islandKey = null;
    this._mapDef = null;
    this._seq = 0;
  }

  async init() {
    // Tutorial Slime will only spawn when the player progresses in the tutorial
  }

  /**
   * Spawns the fixed tutorial slime in the Dojo garden.
   * Only called during Quest First Steps when Paladill asks the player to clear the corruption.
   */
  async spawnTutorialSlime() {
    if (this.defeatedIds.has('slime_garden_1')) return null;
    const existing = this.monsters.find(m => m.id === 'slime_garden_1');
    if (existing) return existing;

    this.isCombatEnabled = true;
    const slime = await this.spawnMonster({
      id: 'slime_garden_1',
      name: i18n.t('enemies.arch.slime.name'),
      badge: 'chimera',
      tier: 1,
      modelType: 'slime',
      x: -4.0,
      z: 2.0,
      scale: 1.05,
      tintColor: null,
      biome: 'forest',
      packData: null, // Tutorial uses Level 1 fixed tutorial config
      patrolPoints: [
        new THREE.Vector3(-4.0, 0, 2.0),
        new THREE.Vector3(-1.5, 0, -1.0),
        new THREE.Vector3(-2.0, 0, 6.0),
        new THREE.Vector3(-6.0, 0, 4.0)
      ],
      detectionRadius: 7.0,
      encounterRadius: 1.85,
      patrolSpeed: 1.8,
      chaseSpeed: 4.8
    });

    if (slime && slime.group && !slime.questArrow) {
      const arrow = createQuestBeaconArrow3D(1.85);
      slime.group.add(arrow);
      slime.questArrow = arrow;
    }

    return slime;
  }

  /**
   * Cleans up all procedural monsters from the scene when changing zones.
   * Keeps the tutorial slime if present in Dojo.
   */
  clearProceduralMonsters() {
    const toRemove = this.monsters.filter(m => m.id !== 'slime_garden_1');
    toRemove.forEach(m => this._disposeMonster(m));
    this.monsters = this.monsters.filter(m => m.id === 'slime_garden_1');
    this.isEncounterTriggered = false;
  }

  /**
   * 30-oct: quita un monstruo de la escena y libera SOLO lo suyo. El modelo es una copia de la caché (ModelCache):
   * sus texturas, geometrías y materiales son compartidos con los demás monstruos del mismo tipo y con el combate.
   */
  _disposeMonster(m) {
    if (!m || m._disposed) return;
    m._disposed = true;
    if (m.toonOutline && typeof m.toonOutline.dispose === 'function') m.toonOutline.dispose();
    if (m.mixer) {
      m.mixer.stopAllAction();
      if (m.mesh) m.mixer.uncacheRoot(m.mesh);
    }
    if (!m.group) return;
    if (m.group.parent) m.group.parent.remove(m.group);
    const shared = new Set();
    if (m.modelPath && m.mesh) m.mesh.traverse((o) => shared.add(o)); // copia de la caché: no se toca
    const owned = new Set(m.ownMaterials || []);
    m.group.traverse((child) => {
      if (shared.has(child)) return;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        for (const mat of [].concat(child.material)) {
          if (!mat || owned.has(mat)) continue;
          for (const k of Object.keys(mat)) {
            const val = mat[k];
            if (val && val.isTexture) val.dispose();
          }
          mat.dispose();
        }
      }
    });
    // Materiales teñidos: clones propios, pero sus texturas son las del modelo en caché
    for (const mat of owned) mat.dispose();
    if (m.mesh && m.modelPath) {
      // Esqueletos de esta copia: cada uno tiene su textura de huesos
      const skels = new Set();
      m.mesh.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) skels.add(o.skeleton); });
      skels.forEach((sk) => sk.dispose());
    }
    m.group.clear();
  }

  /** Saca de la caché las criaturas que no usa ningún monstruo vivo (tras cambiar de isla; no hay combate en curso). */
  _evictUnusedCreatureModels() {
    const inUse = new Set(this.monsters.map((m) => m.modelPath).filter(Boolean));
    for (const path of cachedModelPaths()) {
      if (CREATURE_MODEL_RE.test(path) && !inUse.has(path) && !this._loadingPaths.has(path)) evictGLTF(path);
    }
  }

  /**
   * Sanitizes a 2D coordinate against the spatial collision system.
   * If the coordinate is blocked by water (river, lake, pond) or rocks/obstacles,
   * searches radially outward to find the nearest clear and walkable ground.
   */
  _sanitizePoint(x, z, radius = 0.65) {
    if (!this.collisions || typeof this.collisions.isPointBlocked !== 'function') {
      return { x, z };
    }
    if (!this.collisions.isPointBlocked(x, z, radius)) {
      return { x, z };
    }

    const radii = [1.5, 2.8, 4.2, 6.0, 8.5];
    const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];

    for (const r of radii) {
      for (const a of angles) {
        const candX = x + Math.cos(a) * r;
        const candZ = z + Math.sin(a) * r;
        if (!this.collisions.isPointBlocked(candX, candZ, radius)) {
          return { x: candX, z: candZ };
        }
      }
    }
    return { x, z };
  }

  /**
   * Generates collision-free, biome-curated patrol presets tailored to each zone's topology.
   * In river corridor zones (gx = 2), routes are strictly segregated on the East or West bank
   * to ensure no mob ever attempts to traverse the riverbed or its canyon banks.
   */
  _getSafeSpawnPresets(gx, gy, biome) {
    // 0. Islands (480 m terrains): anchors validated against the real island ground
    const islandLayout = ISLAND_MONSTER_LAYOUT[`${gx}_${gy}`];
    if (islandLayout) {
      return islandLayout.packs.map((a) => ({
        x: a.x, z: a.z,
        patrol: patrolAround(a).map((p) => new THREE.Vector3(p.x, 0, p.z))
      }));
    }

    // 1. River Corridor Zones (gx === 2): River flows vertically at x ~ 7.0..11.5
    // Segregate patrols strictly: Pack 0 on East bank (x >= 16), Pack 1 on West bank (x <= -15).
    if (gx === 2) {
      return [
        {
          x: 20, z: 8,
          patrol: [
            new THREE.Vector3(20, 0, 8),
            new THREE.Vector3(25, 0, 15),
            new THREE.Vector3(21, 0, 23),
            new THREE.Vector3(16, 0, 16)
          ]
        },
        {
          x: -18, z: -8,
          patrol: [
            new THREE.Vector3(-18, 0, -8),
            new THREE.Vector3(-24, 0, -15),
            new THREE.Vector3(-20, 0, -23),
            new THREE.Vector3(-14, 0, -16)
          ]
        }
      ];
    }

    // 2. Savannah 3_1 (Canyon / Oasis at center 0,0 / Forge at 0,-22)
    if (gx === 3 && gy === 1) {
      return [
        {
          x: 18, z: 12,
          patrol: [
            new THREE.Vector3(18, 0, 12),
            new THREE.Vector3(24, 0, 18),
            new THREE.Vector3(18, 0, 24),
            new THREE.Vector3(12, 0, 18)
          ]
        },
        {
          x: -18, z: -8,
          patrol: [
            new THREE.Vector3(-18, 0, -8),
            new THREE.Vector3(-24, 0, -14),
            new THREE.Vector3(-18, 0, -18),
            new THREE.Vector3(-12, 0, -12)
          ]
        }
      ];
    }

    // 3. Savannah 3_2 (Eastern Savannah / Central Monolith Spire at 2,0)
    if (gx === 3 && gy === 2) {
      return [
        {
          x: 18, z: -14,
          patrol: [
            new THREE.Vector3(18, 0, -14),
            new THREE.Vector3(24, 0, -8),
            new THREE.Vector3(18, 0, -2),
            new THREE.Vector3(12, 0, -8)
          ]
        },
        {
          x: -18, z: 12,
          patrol: [
            new THREE.Vector3(-18, 0, 12),
            new THREE.Vector3(-24, 0, 18),
            new THREE.Vector3(-18, 0, 24),
            new THREE.Vector3(-12, 0, 18)
          ]
        }
      ];
    }

    // 4. Arctic 1_1 (Glacial Valley / Frozen Lakes at -22.9, 2.3 and 3.7, -26.1)
    if (gx === 1 && gy === 1) {
      return [
        {
          x: 18, z: -8,
          patrol: [
            new THREE.Vector3(18, 0, -8),
            new THREE.Vector3(24, 0, -4),
            new THREE.Vector3(20, 0, 2),
            new THREE.Vector3(14, 0, -2)
          ]
        },
        {
          x: 16, z: 18,
          patrol: [
            new THREE.Vector3(16, 0, 18),
            new THREE.Vector3(22, 0, 24),
            new THREE.Vector3(16, 0, 28),
            new THREE.Vector3(10, 0, 22)
          ]
        }
      ];
    }

    // 5. Mystic 1_2 (Astral Pond at -16, 14)
    if (gx === 1 && gy === 2) {
      return [
        {
          x: 18, z: -10,
          patrol: [
            new THREE.Vector3(18, 0, -10),
            new THREE.Vector3(24, 0, -4),
            new THREE.Vector3(18, 0, 2),
            new THREE.Vector3(12, 0, -4)
          ]
        },
        {
          x: 18, z: 14,
          patrol: [
            new THREE.Vector3(18, 0, 14),
            new THREE.Vector3(24, 0, 20),
            new THREE.Vector3(18, 0, 26),
            new THREE.Vector3(12, 0, 20)
          ]
        }
      ];
    }

    // 6. Mystic 1_3 (Sanctuary)
    if (gx === 1 && gy === 3) {
      return [
        {
          x: 16, z: 10,
          patrol: [
            new THREE.Vector3(16, 0, 10),
            new THREE.Vector3(22, 0, 16),
            new THREE.Vector3(16, 0, 22),
            new THREE.Vector3(10, 0, 16)
          ]
        },
        {
          x: -16, z: -10,
          patrol: [
            new THREE.Vector3(-16, 0, -10),
            new THREE.Vector3(-22, 0, -16),
            new THREE.Vector3(-16, 0, -22),
            new THREE.Vector3(-10, 0, -16)
          ]
        }
      ];
    }

    // 7. Dungeon 3_3 (Boss Crypt)
    if (gx === 3 && gy === 3) {
      return [
        {
          x: 16, z: 8,
          patrol: [
            new THREE.Vector3(16, 0, 8),
            new THREE.Vector3(22, 0, 14),
            new THREE.Vector3(18, 0, 20),
            new THREE.Vector3(12, 0, 14)
          ]
        },
        {
          x: -16, z: -8,
          patrol: [
            new THREE.Vector3(-16, 0, -8),
            new THREE.Vector3(-22, 0, -14),
            new THREE.Vector3(-18, 0, -20),
            new THREE.Vector3(-12, 0, -14)
          ]
        }
      ];
    }

    // Default general presets
    return [
      {
        x: 16, z: 12,
        patrol: [
          new THREE.Vector3(16, 0, 12),
          new THREE.Vector3(22, 0, 16),
          new THREE.Vector3(18, 0, 22),
          new THREE.Vector3(12, 0, 18)
        ]
      },
      {
        x: -16, z: -12,
        patrol: [
          new THREE.Vector3(-16, 0, -12),
          new THREE.Vector3(-22, 0, -16),
          new THREE.Vector3(-18, 0, -22),
          new THREE.Vector3(-12, 0, -18)
        ]
      }
    ];
  }

  /**
   * Spawns roaming monster packs for the specified macro-zone based on its biome.
   * DOJO SANCTUARY RULE: Macro-zone [2, 2] is a peaceful sanctuary; procedural mobs never spawn there.
   * @param {Object} mapDef - Map definition from MapRegistry (gx, gy, biome, etc.)
   */
  async spawnZoneMonsters(mapDef) {
    // 1. Clear previous zone's procedural mobs
    this.clearProceduralMonsters();

    const gx = mapDef.gx ?? 2;
    const gy = mapDef.gy ?? 2;
    const islandKey = `${gx}_${gy}`;
    const biome = mapDef.biome || 'forest';

    // Hito 106: isla activa del respawn (vacía la cola de la isla anterior)
    this._islandKey = islandKey;
    this._mapDef = mapDef;
    this.respawn.setIsland(islandKey);

    // DOJO SANCTUARY RULE: Dojo [2, 2] is a peaceful sanctuary.
    if ((gx === 2 && gy === 2) || mapDef.hasDojo) {
      console.log('[WanderingMonsters] Zone is the Dojo Sanctuary. Procedural spawns disabled.');
      // Hito 106: los slimes del Bosque viven en SlimeCreaturesManager; al volver a la isla se reponen los que faltan
      // (detrás del telón: este método lo espera changeMap)
      try { await this.om?.demoScenaZone?.slimeCreaturesManager?.refillToPopulation?.(); } catch (e) { console.warn('[WanderingMonsters] Reponer slimes:', e); }
      this._evictUnusedCreatureModels();
      return;
    }

    this.isCombatEnabled = true;
    const islandLayout = ISLAND_MONSTER_LAYOUT[islandKey] || null;
    const hasPool = this.respawn.hasPool(islandKey);

    // Hito 106: la población objetivo se reparte por TODA la isla (pool de puntos validados). Una isla sin pool
    // conserva el comportamiento anterior (1–2 manadas en las anclas de siempre, sin respawn).
    let spots;
    if (hasPool) {
      spots = this.respawn.pickMany(islandKey, RESPAWN_CONFIG.population, { player: this._playerXZ(), mobs: [] });
    } else {
      const presets = this._getSafeSpawnPresets(gx, gy, biome);
      spots = presets.slice(0, Math.random() < 0.6 ? 1 : 2);
    }

    for (let i = 0; i < spots.length; i++) {
      let forcedLeader = null;
      if (gx === 1 && gy === 3 && i === 0) forcedLeader = 'dryad_fighter';
      else if (gx === 2 && gy === 1 && i === 0) forcedLeader = 'wolf_alpha';
      else if (gx === 2 && gy === 3 && i === 0) forcedLeader = 'bear_mom';
      else if (gx === 3 && gy === 3 && i === 0) forcedLeader = 'werewolf_boss';

      const pack = generatePackForBiome(biome, [gx, gy], forcedLeader);
      if (forcedLeader) pack.isBoss = true; // Hito 35: los jefes (👑) combaten siempre en el mapa de jefe del bioma
      await this._spawnPackMonster(pack, spots[i], {
        biome,
        forced: Boolean(forcedLeader),
        respawn: hasPool ? (forcedLeader ? { kind: 'boss', forcedLeader } : { kind: 'pack' }) : null
      });
    }

    // Retired corner zone merged into this island: its pack keeps the old zone key for quests.
    // Hito 106: reaparece donde estaba, con retardo largo.
    if (islandLayout && islandLayout.merged) {
      const mg = islandLayout.merged;
      const [lgx, lgy] = mg.logicalZone.split('_').map(Number);
      await this._spawnFixed(() => {
        const pack = generatePackForBiome(mg.biome, [lgx, lgy], mg.forcedLeader || null);
        if (mg.forcedLeader) pack.isBoss = true; // Hito 35: mapa de jefe
        const leader = pack.leader;
        let displayName = leader.name;
        let badge = 'chimera';
        if (mg.forcedLeader) {
          badge = 'boss';
        } else if (pack.packSize > 1) {
          displayName = `${pack.packTitle} (x${pack.packSize})`;
          badge = 'alpha';
        }
        return {
          cfg: {
            id: `mob_${pack.packId}_${mg.logicalZone}`,
            name: displayName,
            badge,
            tier: pack.tier,
            modelType: leader.type,
            x: mg.anchor.x,
            z: mg.anchor.z,
            scale: leader.scale,
            tintColor: leader.tintColor,
            packData: pack,
            biome: mg.biome,
            logicalZone: mg.logicalZone,
            patrolPoints: patrolAround(mg.anchor).map((p) => new THREE.Vector3(p.x, 0, p.z)),
            detectionRadius: 7.5,
            encounterRadius: 1.85,
            patrolSpeed: 1.8,
            chaseSpeed: 4.8
          }
        };
      });
    }

    // Special Quest Encounters for Sabana / Yermos Áridos (old [3, 1], now part of the Savanna island)
    const questMobSpots = islandLayout && islandLayout.questMobs ? islandLayout.questMobs : null;
    // Hito 74: combates de las misiones de Genesis (Kotaro y Tripp)
    if (gx === 2 && gy === 3) await this.ensureGenesisQuestMonsters();
    if ((gx === 3 && gy === 1) || (questMobSpots && questMobSpots.mob_armored_chimera)) {
      const spotOf = (id, fx, fz, legacyPatrol) => {
        const a = questMobSpots && questMobSpots[id];
        if (!a) return { x: fx, z: fz, patrol: legacyPatrol };
        return { x: a.x, z: a.z, patrol: patrolAround(a).map((p) => new THREE.Vector3(p.x, 0, p.z)) };
      };

      // Hito 106: los mobs de misión de la Sabana están siempre; la flecha solo se ve con su misión activa y el paso
      // pendiente (lo decide update), y las recompensas de misión solo se dan en ese caso (OverworldManager).
      // 1. Armored Chimera for "Nomad Steel" (Herrero Baruk)
      await this._spawnFixed(() => {
        const armoredSpot = spotOf('mob_armored_chimera', 16.0, 8.0, [
          new THREE.Vector3(16, 0, 8),
          new THREE.Vector3(22, 0, 14),
          new THREE.Vector3(14, 0, 18),
          new THREE.Vector3(8, 0, 10)
        ]);
        return {
          cfg: {
            id: 'mob_armored_chimera',
            name: `${i18n.t('enemies.questMob', { name: i18n.t('enemies.armoredChimera') })}`,
            badge: 'armored',
            tier: 2,
            modelType: 'wolf-aquatic-alpha',
            x: armoredSpot.x,
            z: armoredSpot.z,
            scale: 1.65,
            tintColor: 0x78716c,
            biome: 'savannah',
            logicalZone: '3_1',
            patrolPoints: armoredSpot.patrol,
            detectionRadius: 8.5,
            encounterRadius: 2.2,
            patrolSpeed: 1.6,
            chaseSpeed: 4.5
          },
          arrow: { size: 2.1, questId: 'quest_nomad_steel', stepId: 'gather_ores' }
        };
      });

      // 2. Beaked Alpha Chimera for "The Hunt for the Beaked Chimera" (Centinela)
      await this._spawnFixed(() => {
        const beakedSpot = spotOf('mob_beaked_chimera', -14.0, -10.0, [
          new THREE.Vector3(-14, 0, -10),
          new THREE.Vector3(-20, 0, -6),
          new THREE.Vector3(-16, 0, -18),
          new THREE.Vector3(-8, 0, -14)
        ]);
        return {
          cfg: {
            id: 'mob_beaked_chimera',
            name: `${i18n.t('enemies.questMob', { name: i18n.t('enemies.alphaBeakedChimera') })}`,
            badge: 'beaked',
            tier: 2,
            // 'bird-early' is an Axie hero (no overworld .glb): it fell back to a sphere half sunk in the ground.
            // The overworld marker uses the pack's winged member model, tinted amber.
            modelType: 'wolf-aquatic',
            x: beakedSpot.x,
            z: beakedSpot.z,
            scale: 1.55,
            tintColor: 0xf59e0b,
            biome: 'savannah',
            logicalZone: '3_1',
            patrolPoints: beakedSpot.patrol,
            detectionRadius: 8.5,
            encounterRadius: 2.2,
            patrolSpeed: 1.7,
            chaseSpeed: 4.6
          },
          arrow: { size: 2.0, questId: 'quest_hunt_beaked_chimera', stepId: 'defeat_beaked_alpha' }
        };
      });
    }
    // Criaturas de la isla anterior (y del último combate) que ya no usa nadie
    this._evictUnusedCreatureModels();
  }

  /**
   * Hito 74 · Genesis: cada misión tiene su propio combate, marcado con flecha, y solo aparece mientras hace falta.
   *  · Guardianes de Genesis (Kotaro): en la avenida del este, con «El Umbral de Genesis» activa.
   *  · Guardián de Cristal (Tripp): en la cantera rosa, tras hablar con Tripp y hasta recuperar el pico.
   * Se puede llamar en cualquier momento (al entrar en la isla o al aceptar la misión): no duplica.
   */
  async ensureGenesisQuestMonsters() {
    const qm = this.questManager || (typeof window !== 'undefined' ? window.overworldManager?.questManager : null);
    if (!qm) return;
    const spots = ISLAND_MONSTER_LAYOUT['2_3']?.questMobs || {};
    const stepOf = (qid, sid) => qm.getQuest(qid)?.objective?.steps?.find((s) => s.id === sid);
    // Hito 106: además de mientras hacen falta, siguen en la isla con la misión ya completada (como élites sin recompensa)
    const needGuards = (() => { const q = qm.getQuest('quest_sulfur_threshold'); const s = stepOf('quest_sulfur_threshold', 'defeat_sulfur_guards'); return q && (q.status === 'completed' || (q.status === 'active' && s && !s.done)); })();
    const needCrystal = (() => { const q = qm.getQuest('quest_forgotten_miner_relic'); const t = stepOf('quest_forgotten_miner_relic', 'talk_miner'); const s = stepOf('quest_forgotten_miner_relic', 'find_golden_pickaxe'); return q && (q.status === 'completed' || (q.status === 'active' && t?.done && s && !s.done)); })();
    const spawnQuestPack = (id, spot, leaderId, minSize, nameKey, badge, tint, questId, stepId) => {
      if (!spot || this.monsters.some((m) => m.id === id)) return null;
      return this._spawnFixed(() => {
        let pack = generatePackForBiome('dungeon', [2, 3], leaderId);
        for (let k = 0; k < 6 && pack.packSize < minSize; k++) pack = generatePackForBiome('dungeon', [2, 3], leaderId);
        pack.isBoss = true;
        const leader = pack.leader;
        return {
          cfg: {
            id,
            name: `${i18n.t('enemies.questMob', { name: i18n.t(nameKey) })}`,
            badge,
            tier: pack.tier,
            modelType: leader.type,
            x: spot.x,
            z: spot.z,
            scale: (leader.scale || 1) * 1.15,
            tintColor: tint,
            packData: pack,
            biome: 'dungeon',
            patrolPoints: patrolAround(spot).map((p) => new THREE.Vector3(p.x, 0, p.z)),
            detectionRadius: 8.0,
            encounterRadius: 2.1,
            patrolSpeed: 1.5,
            chaseSpeed: 4.4
          },
          arrow: { size: 2.2, questId, stepId }
        };
      });
    };
    if (needGuards) await spawnQuestPack('mob_genesis_guardians', spots.mob_genesis_guardians, 'bear_dad', 2, 'enemies.genesisGuardians', 'guardians', 0xc4b5fd, 'quest_sulfur_threshold', 'defeat_sulfur_guards');
    if (needCrystal) await spawnQuestPack('mob_crystal_guardian', spots.mob_crystal_guardian, 'bear_mom', 1, 'enemies.crystalGuardian', 'crystal', 0xf9a8d4, 'quest_forgotten_miner_relic', 'find_golden_pickaxe');
  }

  async ensureSavannahQuestMonsters() {
    const qm = this.questManager || (typeof window !== 'undefined' ? window.overworldManager?.questManager : null);
    const qBeaked = qm?.getQuest('quest_hunt_beaked_chimera');
    const stepAlpha = qBeaked?.objective?.steps?.find(s => s.id === 'defeat_beaked_alpha');
    if (qBeaked?.status !== 'completed' && (!stepAlpha || !stepAlpha.done)) {
      if (!this.monsters.some(m => m.id === 'mob_beaked_chimera')) {
        const mobBeaked = await this.spawnMonster({
          id: 'mob_beaked_chimera',
          name: `${i18n.t('enemies.questMob', { name: i18n.t('enemies.alphaBeakedChimera') })}`,
          badge: 'beaked',
          tier: 2,
          modelType: 'wolf-aquatic',
          x: -40.0,
          z: -8.0,
          scale: 1.55,
          tintColor: 0xf59e0b,
          biome: 'savannah',
          logicalZone: '3_1',
          patrolPoints: patrolAround({ x: -40.0, z: -8.0 }).map((p) => new THREE.Vector3(p.x, 0, p.z)),
          detectionRadius: 8.5,
          encounterRadius: 2.2,
          patrolSpeed: 1.7,
          chaseSpeed: 4.6
        });
        if (mobBeaked && mobBeaked.group && !mobBeaked.questArrow) {
          const arrow = createQuestBeaconArrow3D(2.0);
          mobBeaked.group.add(arrow);
          mobBeaked.questArrow = arrow;
          mobBeaked.questArrowFor = { questId: 'quest_hunt_beaked_chimera', stepId: 'defeat_beaked_alpha' };
        }
      }
    }
  }

  /**
   * Ensures a specific boss monster is actively roaming in the given zone.
   * If not already present, it immediately spawns it.
   */
  async ensureZoneBossEncounter(zoneKey, forcedArchetypeId = 'dryad_fighter') {
    if (this.monsters.some(m => m.packData?.leader?.archetypeId === forcedArchetypeId || m.modelType === forcedArchetypeId || m.modelType === 'dryad-fighter')) {
      return;
    }

    const [gxStr, gyStr] = zoneKey.split('_');
    const gx = parseInt(gxStr, 10) || 1;
    const gy = parseInt(gyStr, 10) || 4;
    const biome = (gx === 1 && gy === 4) ? 'mystic' : (gy === 1 ? 'arctic' : (gy === 5 ? 'dungeon' : 'forest'));

    const pack = generatePackForBiome(biome, [gx, gy], forcedArchetypeId);
    pack.isBoss = true; // Hito 35: mapa de jefe
    const leader = pack.leader;
    const presets = this._getSafeSpawnPresets(gx, gy, biome);
    const preset = presets[0];

    await this.spawnMonster({
      id: `mob_boss_${zoneKey}_${Date.now().toString(36)}`,
      name: `${pack.packTitle}`,
      badge: 'boss',
      tier: pack.tier,
      modelType: leader.type,
      x: preset.x,
      z: preset.z,
      scale: leader.scale,
      tintColor: leader.tintColor,
      packData: pack,
      biome: biome,
      patrolPoints: preset.patrol,
      detectionRadius: 7.5,
      encounterRadius: 2.1,
      patrolSpeed: 1.8,
      chaseSpeed: 4.8
    });
  }

  async spawnMonster(config) {
    let mobRadius = Math.max(0.65, (config.scale || 1.0) * 0.60);
    const safeSpawn = this._sanitizePoint(config.x, config.z, mobRadius);
    const group = new THREE.Group();
    // Spawn on the island ground (it used to start at y = 0, under the terrain, until it moved)
    const spawnGroundY = (this.om && typeof this.om.getGroundHeight === 'function')
      ? this.om.getGroundHeight(safeSpawn.x, safeSpawn.z)
      : 0;
    group.position.set(safeSpawn.x, Number.isFinite(spawnGroundY) ? spawnGroundY : 0, safeSpawn.z);

    // Chimera dark corruption aura at feet
    const auraGeo = new THREE.RingGeometry(0.65, 0.95, 24);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: config.packData?.packSize > 1 ? 0xf59e0b : 0x9333ea,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.position.y = 0.03;
    const auraScale = Math.max(1.0, (config.scale || 1.0) * 0.75);
    auraMesh.scale.set(auraScale, auraScale, 1.0);
    group.add(auraMesh);

    // Rombo «!» de alerta (Crónica Celeste), oculto hasta que el enemigo te detecta
    const alertSprite = createEnemyAlertSprite();

    // Normalize model type
    let mType = config.modelType || 'slime';
    if (mType === 'slime_basic' || mType === 'slime_forest') mType = 'slime';
    else if (mType === 'slime_attack') mType = 'slime-attack';
    else if (mType === 'slime_defese') mType = 'slime-defese';
    else if (mType === 'slime_support') mType = 'slime-support';
    else if (mType === 'slime_forest_a') mType = 'slime-forest-a';
    else if (mType === 'slime_forest_b') mType = 'slime-forest-b';
    else if (mType === 'slime_fusion') mType = 'slime-fusion';
    else if (mType === 'wolf_aquatic') mType = 'wolf-aquatic';
    else if (mType === 'wolf_aquatic_alpha') mType = 'wolf-aquatic-alpha';
    else if (mType === 'wolf_gray') mType = 'wolf-gray';
    else if (mType === 'wolf_alpha') mType = 'wolf-alpha';
    else if (mType === 'treant_flower') mType = 'treant-flower';
    else if (mType === 'dryad_fighter') mType = 'dryad-fighter';
    else if (mType === 'dryad_mage') mType = 'dryad-mage';
    else if (mType === 'dryad_range') mType = 'dryad-range';
    else if (mType === 'werewolf_boss') mType = 'werewolf-boss';
    else if (mType === 'bear_mom') mType = 'bear-mom';
    else if (mType === 'bear_dad') mType = 'bear-dad';

    // Height offset based on model size
    let overheadY = 1.75;
    if (mType === 'slime-forest-b') overheadY = 1.85;
    else if (mType.startsWith('slime')) overheadY = 1.55;
    else if (mType === 'wolf-alpha' || mType === 'wolf-aquatic-alpha') overheadY = 2.15;
    else if (mType.startsWith('wolf-')) overheadY = 1.85;
    else if (mType.startsWith('dryad-')) overheadY = 2.25;
    else if (mType === 'treant-flower') overheadY = 1.95;
    else if (mType === 'werewolf-boss' || mType.startsWith('bear-')) overheadY = 2.85;
    else if (mType === 'fox') overheadY = 1.1;
    else if (mType === 'kibo') overheadY = 2.4;

    // Alert badge positioned cleanly ABOVE the overhead nameplate (nameplate is at overheadY with height 0.52)
    alertSprite.position.set(0, overheadY + 0.78, 0);
    group.add(alertSprite);

    // Placa de nombre (Crónica Celeste): aparece al acercarse y pasa a rojo cuando el enemigo te detecta
    const nameplate = createEnemyNameplate(config);
    const nameSprite = nameplate.sprite;
    nameSprite.position.set(0, overheadY, 0);
    group.add(nameSprite);

    let mesh = null;
    let mixer = null;
    let actions = {};
    let cachedPath = null;      // ruta en ModelCache si el modelo es una copia de la caché
    const ownMaterials = [];    // materiales creados para este monstruo (teñidos)

    try {
      let modelPath = `./assets/models/${mType}.glb`;
      if (mType === 'sapidae' || mType === 'sapidae-f-a') {
        modelPath = './assets/models/dryad-fighter.glb';
      }

      // Copia de la caché compartida con el combate (antes: un GLTFLoader nuevo y una copia propia por monstruo)
      this._loadingPaths.set(modelPath, (this._loadingPaths.get(modelPath) || 0) + 1);
      let gltf;
      try { gltf = await cloneGLTF(modelPath); } finally {
        const n = (this._loadingPaths.get(modelPath) || 1) - 1;
        if (n > 0) this._loadingPaths.set(modelPath, n); else this._loadingPaths.delete(modelPath);
      }
      mesh = gltf.scene;
      cachedPath = modelPath;
      const modelScale = worldScaleFor(mType, modelPath, mesh, config.scale || 1.0);
      mesh.scale.set(modelScale, modelScale, modelScale);
      // Hito 94: si se agrandó para el mundo, el aro, el radio de choque y la placa de nombre crecen con él
      const grow = modelScale / (config.scale || 1.0);
      if (grow > 1.001) {
        auraMesh.scale.set(auraScale * grow, auraScale * grow, 1.0);
        mobRadius = Math.max(mobRadius, Math.min(mobRadius * grow, 1.6));
        mesh.updateMatrixWorld(true);
        const top = new THREE.Box3().setFromObject(mesh).max.y;
        if (Number.isFinite(top) && top + 0.45 > overheadY) {
          overheadY = top + 0.45;
          nameSprite.position.y = overheadY;
          alertSprite.position.y = overheadY + 0.78;
        }
      }

      mesh.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (config.tintColor && c.material) {
            c.material = c.material.clone(); // propio: el original es compartido
            c.material.color.setHex(config.tintColor);
            ownMaterials.push(c.material);
          }
        }
      });
      group.add(mesh);

      // Apply Inverted Hull Toon Style Outline
      const toonOutline = applyToonOutline(mesh, {
        thickness: 0.012,
        color: 0x15161e,
        mode: 'view'
      });

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(mesh);
        gltf.animations.forEach(clip => {
          const lName = clip.name.toLowerCase();
          const action = mixer.clipAction(clip);
          actions[lName] = action;
          if (lName.includes('idle')) actions['idle'] = action;
          if (lName.includes('run')) actions['run'] = action;
          if (lName.includes('attack')) actions['attack'] = action;
        });

        if (!actions['idle']) actions['idle'] = mixer.clipAction(gltf.animations[0]);
        if (!actions['run']) actions['run'] = gltf.animations.length > 1 ? mixer.clipAction(gltf.animations[1]) : actions['idle'];

        actions['idle'].play();
      }
    } catch (err) {
      console.warn(`[WanderingMonsters] Could not load model ${config.modelType}:`, err);
      const geo = new THREE.SphereGeometry(0.7, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: config.tintColor || 0x9333ea });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.7;
      group.add(mesh);
    }

    this.scene.add(group);

    const monster = {
      id: config.id,
      name: config.name,
      packData: config.packData || null,
      biome: config.biome || null,
      logicalZone: config.logicalZone || null,
      group: group,
      mesh: mesh,
      modelPath: cachedPath,
      ownMaterials,
      toonOutline: mesh?.userData?.toonOutline || null,
      mixer: mixer,
      actions: actions,
      currentAnim: 'idle',
      auraMesh: auraMesh,
      alertSprite: alertSprite,
      nameSprite: nameSprite,
      nameplate: nameplate,
      state: 'PATROL', // PATROL, ALERT_PAUSE, CHASE, ENCOUNTER
      patrolPoints: (config.patrolPoints || [group.position.clone()]).map(wp => {
        const sp = this._sanitizePoint(wp.x, wp.z, mobRadius);
        return new THREE.Vector3(sp.x, 0, sp.z);
      }),
      currentPatrolIdx: 0,
      mobRadius: mobRadius,
      stuckTimer: 0,
      detectionRadius: config.detectionRadius,
      encounterRadius: config.encounterRadius,
      patrolSpeed: config.patrolSpeed,
      chaseSpeed: config.chaseSpeed,
      alertTimer: 0,
      yaw: 0,
      respawnSpec: config.respawn || null // Hito 106: cómo reaparece al morir (null = no reaparece)
    };

    // Hito 106: si mientras cargaba el modelo se cambió de isla, este mob ya no pertenece a ninguna: se retira
    if (config.epoch !== undefined && config.epoch !== this.respawn.epoch) {
      this._disposeMonster(monster);
      return null;
    }

    this.monsters.push(monster);
    return monster;
  }

  // ───────────────────────── Hito 106 · respawn de mobs ─────────────────────────

  _playerXZ() {
    const p = this.om?.player?.position;
    return p ? { x: p.x, z: p.z } : null;
  }

  _respawnCtx() {
    return {
      player: this._playerXZ(),
      mobs: this.monsters.filter((m) => !m._disposed && m.group).map((m) => ({ x: m.group.position.x, z: m.group.position.z }))
    };
  }

  /** Ruta del GLB de un tipo de modelo (misma normalización que spawnMonster). */
  _modelPathOf(type) {
    let t = String(type || 'slime');
    if (t === 'slime_basic' || t === 'slime_forest') t = 'slime';
    return `./assets/models/${t.replace(/_/g, '-')}.glb`;
  }

  /**
   * Manada nueva cuyo líder ya está en la caché de modelos (se descargó y se subió a la GPU en esta isla): así un
   * respawn no estrena modelo ni texturas en mitad del juego. Si tras varios intentos no hay ninguna, acepta cualquiera.
   */
  _warmPack(biome, zone, forced) {
    let pack = generatePackForBiome(biome, zone, forced);
    if (forced) return pack;
    const warm = new Set(cachedModelPaths());
    for (let k = 0; k < 6 && !warm.has(this._modelPathOf(pack.leader.type)); k++) pack = generatePackForBiome(biome, zone, null);
    return pack;
  }

  /** Crea el mob de una manada en un punto del pool (o ancla con `patrol`). */
  async _spawnPackMonster(pack, spot, { biome, forced = false, respawn = null, popIn = false } = {}) {
    const leader = pack.leader;
    let displayName = leader.name;
    let badge = 'chimera';
    if (forced) {
      badge = 'boss';
    } else if (pack.packSize > 1) {
      displayName = `${pack.packTitle} (x${pack.packSize})`;
      badge = 'alpha';
    }
    const patrol = spot.patrol || patrolAround(spot).map((p) => new THREE.Vector3(p.x, 0, p.z));
    const mob = await this.spawnMonster({
      id: `mob_${pack.packId}_${++this._seq}`,
      name: displayName,
      badge,
      tier: pack.tier,
      modelType: leader.type,
      x: spot.x,
      z: spot.z,
      scale: leader.scale,
      tintColor: leader.tintColor,
      packData: pack,
      biome,
      patrolPoints: patrol,
      detectionRadius: 7.5,
      encounterRadius: 1.85,
      patrolSpeed: 1.8,
      chaseSpeed: 4.8,
      epoch: this.respawn.epoch,
      respawn
    });
    this._afterSpawn(mob, popIn);
    return mob;
  }

  /**
   * Mob con puesto fijo (manada fusionada, mobs de misión): `make()` devuelve { cfg, arrow? } y se puede volver a
   * llamar para reaparecer. Devuelve el mob, null (ya existe) o 'retry' (jugador demasiado cerca).
   */
  async _spawnFixed(make, { popIn = false, avoidPlayer = false } = {}) {
    const { cfg, arrow } = make();
    if (this.monsters.some((m) => m.id === cfg.id)) return null;
    if (avoidPlayer) {
      const p = this._playerXZ();
      if (p && Math.hypot(cfg.x - p.x, cfg.z - p.z) < RESPAWN_CONFIG.minPlayerDist) return 'retry';
    }
    const mob = await this.spawnMonster({ ...cfg, epoch: this.respawn.epoch, respawn: { kind: 'fixed', make } });
    if (mob && arrow && mob.group && !mob.questArrow) {
      const a = createQuestBeaconArrow3D(arrow.size);
      mob.group.add(a);
      mob.questArrow = a;
      mob.questArrowFor = { questId: arrow.questId, stepId: arrow.stepId };
    }
    this._afterSpawn(mob, popIn);
    return mob;
  }

  /** Tras crear un mob: avisa a las sombras y, si reaparece a la vista del juego, nube de humo y aparición con rebote. */
  _afterSpawn(m, popIn) {
    if (!m || !m.group) return;
    this.om?.environmentSystem?.markShadowCastersDirty?.();
    if (!popIn || access.reduceMotion) return;
    m._pop = 0;
    m.group.scale.setScalar(0.01);
    spawnPuff(this.scene, m.group.position.clone(), {
      count: 10,
      radius: 0.9 + (m.mobRadius || 0.65) * 0.5,
      duration: 0.6,
      color: 0xe6e1f5
    });
  }

  /** Handler 'pack' / 'boss': una manada nueva en un punto aleatorio del pool de la isla. */
  async _respawnPack(entry) {
    const key = this._islandKey;
    if (!key || key !== entry.island || !this._mapDef) return 'drop';
    const isFree = (m) => m.respawnSpec && (m.respawnSpec.kind === 'pack' || m.respawnSpec.kind === 'boss');
    if (this.monsters.filter(isFree).length >= RESPAWN_CONFIG.population) return 'drop'; // ya está completa
    const spot = this.respawn.pick(key, this._respawnCtx());
    if (!spot) return 'retry';
    const [gx, gy] = key.split('_').map(Number);
    const spec = entry.payload || { kind: 'pack' };
    const forced = spec.kind === 'boss' ? spec.forcedLeader : null;
    const biome = this._mapDef.biome || 'forest';
    const pack = this._warmPack(biome, [gx, gy], forced);
    if (forced) pack.isBoss = true;
    const mob = await this._spawnPackMonster(pack, spot, {
      biome,
      forced: Boolean(forced),
      respawn: forced ? { kind: 'boss', forcedLeader: forced } : { kind: 'pack' },
      popIn: true
    });
    return mob ? 'ok' : 'retry';
  }

  /** Handler 'fixed': el mob de puesto fijo vuelve a su sitio (si el jugador no está encima). */
  async _respawnFixed(entry) {
    if (!this._islandKey || entry.island !== this._islandKey) return 'drop';
    const spec = entry.payload;
    if (!spec || typeof spec.make !== 'function') return 'drop';
    const r = await this._spawnFixed(spec.make, { popIn: true, avoidPlayer: true });
    return r === 'retry' ? 'retry' : 'ok';
  }

  setAnimation(monster, name) {
    if (!monster.mixer || monster.currentAnim === name) return;
    const nextAction = monster.actions[name] || monster.actions['idle'];
    if (!nextAction) return;

    if (monster.actions[monster.currentAnim]) {
      monster.actions[monster.currentAnim].fadeOut(0.2);
    }
    nextAction.reset().fadeIn(0.2).play();
    monster.currentAnim = name;
  }

  /**
   * Casts sensorial whiskers around a target movement vector.
   * If the forward direction is obstructed by water (river, lake, pond) or rocks/obstacles,
   * probes lateral angles to steer the monster smoothly around the impediment.
   */
  _getSteeredDirection(mob, targetDirX, targetDirZ, moveStep, mobRadius) {
    if (!this.collisions || typeof this.collisions.isPointBlocked !== 'function') {
      return { dirX: targetDirX, dirZ: targetDirZ };
    }

    const pos = mob.group.position;
    // Lookahead distance (1.2m to 2.2m ahead)
    const lookahead = Math.max(1.2, moveStep * 4.0, mobRadius * 1.8);

    // Direct forward probe
    const probeX = pos.x + targetDirX * lookahead;
    const probeZ = pos.z + targetDirZ * lookahead;
    if (!this.collisions.isPointBlocked(probeX, probeZ, mobRadius)) {
      return { dirX: targetDirX, dirZ: targetDirZ };
    }

    // Forward path is blocked! Cast whiskers to the sides to find the clearest bypass
    const baseAngle = Math.atan2(targetDirX, targetDirZ);
    const whiskerAngles = [
      0.60, -0.60,   // ~35° left and right
      1.10, -1.10,   // ~63° left and right
      1.57, -1.57,   // ~90° perpendicular left and right
      2.10, -2.10    // ~120° sharp turn away
    ];

    for (const offset of whiskerAngles) {
      const angle = baseAngle + offset;
      const candX = Math.sin(angle);
      const candZ = Math.cos(angle);
      const candProbeX = pos.x + candX * lookahead;
      const candProbeZ = pos.z + candZ * lookahead;

      if (!this.collisions.isPointBlocked(candProbeX, candProbeZ, mobRadius)) {
        return { dirX: candX, dirZ: candZ };
      }
    }

    return { dirX: targetDirX, dirZ: targetDirZ };
  }

  /**
   * Moves the monster by evaluating steering, spatial collision sliding,
   * river bridge elevation, and stuck detection.
   */
  _moveMonsterWithCollision(m, targetDirX, targetDirZ, speed, dt, time) {
    const moveStep = speed * dt;
    if (moveStep <= 0) return;

    const mobRadius = m.mobRadius || Math.max(0.65, (m.scale || 1.0) * 0.60);
    const oldX = m.group.position.x;
    const oldZ = m.group.position.z;

    // 1. Sensorial obstacle avoidance steering
    const steered = this._getSteeredDirection(m, targetDirX, targetDirZ, moveStep, mobRadius);
    const delta = new THREE.Vector3(steered.dirX * moveStep, 0, steered.dirZ * moveStep);

    // 2. Physical collision resolution (OverworldCollisions: circles, boxes, segments, bounds)
    let newPos;
    if (this.collisions && typeof this.collisions.resolveMovement === 'function') {
      newPos = this.collisions.resolveMovement(m.group.position, delta, mobRadius);
    } else {
      newPos = new THREE.Vector3(oldX + delta.x, m.group.position.y, oldZ + delta.z);
    }

    m.group.position.x = newPos.x;
    m.group.position.z = newPos.z;

    // 3. Dynamic bridge & terrain elevation
    const targetY = (this.om && typeof this.om.getGroundHeight === 'function')
      ? this.om.getGroundHeight(newPos.x, newPos.z)
      : 0.0;
    m.group.position.y += (targetY - m.group.position.y) * Math.min(1.0, 15.0 * dt);

    // 4. Smooth rotation towards movement direction
    const moveDist = Math.hypot(steered.dirX, steered.dirZ);
    if (moveDist > 1e-4) {
      const targetAngle = Math.atan2(steered.dirX, steered.dirZ);
      const rotSpeed = (m.state === 'CHASE' ? 9.0 : 6.0) * dt;
      this._rotateTowards(m, targetAngle, rotSpeed);
    }

    // 5. Stuck detection: measure actual distance traveled
    const actualDist = Math.hypot(newPos.x - oldX, newPos.z - oldZ);
    if (actualDist < moveStep * 0.20) {
      m.stuckTimer = (m.stuckTimer || 0) + dt;
      if (m.state === 'PATROL' && m.stuckTimer > 1.2) {
        // Advance to next waypoint because current waypoint is blocked or unreachable
        m.currentPatrolIdx = (m.currentPatrolIdx + 1) % m.patrolPoints.length;
        m.stuckTimer = 0;
      }
    } else {
      m.stuckTimer = Math.max(0, (m.stuckTimer || 0) - dt * 2.0);
    }
  }

  update(frameDt, time, playerPos) {
    // Hito 106: reloj del respawn. Solo corre mientras se explora (en combate no se llama a update) y solo
    // atiende mobs con el mundo en calma: sin encuentro, sin viaje en curso.
    this.respawn.tick(frameDt, !this.isEncounterTriggered && this.om?.state === 'EXPLORING' && !this.om?._renderSuspended);

    if (this.isEncounterTriggered) return;

    const farFreeze = RESPAWN_CONFIG.farFreezeDist;
    const nearUpdate = RESPAWN_CONFIG.nearUpdateDist;

    this.monsters.forEach(m => {
      let dt = frameDt;

      // Hito 106: aparición (escala 0 → 1 con ligero rebote)
      if (m._pop !== undefined) {
        m._pop += frameDt / 0.45;
        const k = Math.min(1, m._pop);
        const e = 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
        m.group.scale.setScalar(k >= 1 ? 1 : Math.max(0.01, e));
        if (k >= 1) m._pop = undefined;
      }

      let dx = 0;
      let dz = 0;
      let distToPlayer = 999;
      if (playerPos) {
        dx = playerPos.x - m.group.position.x;
        dz = playerPos.z - m.group.position.z;
        distToPlayer = Math.hypot(dx, dz);
        // Hito 106 (rendimiento): un mob que patrulla lejos del jugador se queda quieto (sin animación ni IA);
        // los de misión siguen activos para que su flecha-baliza responda. A media distancia, un fotograma de cada dos.
        if (m.state === 'PATROL' && !m.questArrow && distToPlayer > farFreeze) return;
        m._lodThrottled = distToPlayer > nearUpdate;
      }

      if (m.mixer) {
        if (m._lodThrottled) {
          m._lodSkip = !m._lodSkip;
          m._accumDt = (m._accumDt || 0) + dt;
          if (!m._lodSkip) {
            m.mixer.update(m._accumDt);
            m._accumDt = 0;
          }
        } else {
          if (m._accumDt) {
            m.mixer.update(dt + m._accumDt);
            m._accumDt = 0;
          } else {
            m.mixer.update(dt);
          }
        }
      }

      if (!playerPos) return;

      // Hito 106: IA a medio ritmo a media distancia (con el tiempo acumulado, así no cambia la velocidad)
      if (m._lodThrottled && m.state === 'PATROL') {
        m._aiAcc = (m._aiAcc || 0) + frameDt;
        if (m._lodSkip) return;
        dt = m._aiAcc;
        m._aiAcc = 0;
      } else if (m._aiAcc) {
        dt += m._aiAcc;
        m._aiAcc = 0;
      }

      // State Machine
      switch (m.state) {
        case 'PATROL': {
          this.setAnimation(m, 'run');

          // Check if player entered detection radius
          if (distToPlayer <= m.detectionRadius) {
            m.state = 'ALERT_PAUSE';
            m.alertTimer = 0.5;
            this.setAnimation(m, 'idle');

            // Trigger visual "!" alert popup with sound
            this._popAlert(m);
            // Hito 87: grito de la quimera (o «¡boing!» del slime) desde donde está
            if (this.audio?.world?.creature) {
              this.audio.world.creature(/slime/i.test(`${m.id} ${m.name}`) ? 'slime' : 'chimera', 'alert', { x: m.group.position.x, z: m.group.position.z, maxD: 40 });
            } else if (this.audio && typeof this.audio.playCollision === 'function') {
              this.audio.playCollision();
            }
            break;
          }

          // Move along patrol waypoints
          const targetWp = m.patrolPoints[m.currentPatrolIdx];
          const wx = targetWp.x - m.group.position.x;
          const wz = targetWp.z - m.group.position.z;
          const distToWp = Math.hypot(wx, wz);

          if (distToWp < 0.8) {
            m.currentPatrolIdx = (m.currentPatrolIdx + 1) % m.patrolPoints.length;
            m.stuckTimer = 0;
          } else {
            const dirX = wx / distToWp;
            const dirZ = wz / distToWp;
            this._moveMonsterWithCollision(m, dirX, dirZ, m.patrolSpeed, dt, time);
          }
          break;
        }

        case 'ALERT_PAUSE': {
          m.alertTimer -= dt;
          // Turn to face player during pause
          const faceAngle = Math.atan2(dx, dz);
          this._rotateTowards(m, faceAngle, 10.0 * dt);

          if (distToPlayer <= m.encounterRadius) {
            m.state = 'ENCOUNTER';
            this.isEncounterTriggered = true;
            this.setAnimation(m, 'attack');
            if (this.onEncounterCallback) {
              this.onEncounterCallback(m);
            }
            break;
          }

          if (m.alertTimer <= 0) {
            m.state = 'CHASE';
          }
          break;
        }

        case 'CHASE': {
          this.setAnimation(m, 'run');

          // Check encounter collision
          if (distToPlayer <= m.encounterRadius) {
            m.state = 'ENCOUNTER';
            this.isEncounterTriggered = true;
            this.setAnimation(m, 'attack');
            if (this.onEncounterCallback) {
              this.onEncounterCallback(m);
            }
            break;
          }

          // Move towards player
          const dirX = dx / distToPlayer;
          const dirZ = dz / distToPlayer;
          this._moveMonsterWithCollision(m, dirX, dirZ, m.chaseSpeed, dt, time);

          // If player somehow escapes far away or mob is stuck against impassable barrier (e.g. river/rock)
          if (distToPlayer > m.detectionRadius * 1.8 || (m.stuckTimer && m.stuckTimer > 2.5)) {
            m.state = 'PATROL';
            m.alertSprite.scale.set(0, 0, 1);
            m.stuckTimer = 0;
          }
          break;
        }
      }

      // Placa: visible según la distancia y en rojo mientras el enemigo te persigue
      if (m.nameplate) {
        m.nameplate.setAlert(m.state === 'ALERT_PAUSE' || m.state === 'CHASE' || m.state === 'ENCOUNTER');
        m.nameplate.updateDistance(distToPlayer, m.detectionRadius, dt);
      }

      // Procedural vertical bounce for models without embedded skeletal animation
      if (!m.mixer && m.mesh) {
        if (m.state === 'PATROL' || m.state === 'CHASE') {
          m.mesh.position.y = Math.abs(Math.sin(time * 8.0)) * 0.16;
        } else {
          m.mesh.position.y = Math.sin(time * 3.0) * 0.04;
        }
      }

      // 3D overhead beacon arrow tracking
      if (m.questArrow && m.questArrowFor) {
        // Hito 64: la flecha solo se ve con su misión aceptada y el paso pendiente (antes salía sin aceptarla)
        const qa = this.questManager || (typeof window !== 'undefined' ? window.overworldManager?.questManager : null);
        const q = qa?.getQuest?.(m.questArrowFor.questId);
        const st = q?.objective?.steps?.find((x) => x.id === m.questArrowFor.stepId);
        m.questArrow.visible = !!(q && q.status === 'active' && (!st || !st.done));
      }
      if (m.questArrow && m.questArrow.visible !== false && typeof m.questArrow.updateAnimation === 'function') {
        m.questArrow.updateAnimation(dt);
      }
    });
  }

  _rotateTowards(monster, targetAngle, maxDelta) {
    if (!monster.mesh) return;
    let diff = targetAngle - monster.yaw;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    monster.yaw += diff * Math.min(1.0, maxDelta);
    monster.mesh.rotation.y = monster.yaw;
  }

  _popAlert(monster) {
    const sprite = monster.alertSprite;
    const targetScale = 0.72;
    let progress = 0;
    const animatePop = () => {
      progress += 0.07;
      if (progress < 1.0) {
        // Smooth ease-out back curve with gentle elastic pop
        const p = progress - 1.0;
        const overshoot = 1.0 + 2.7 * Math.pow(p, 3) + 1.7 * Math.pow(p, 2);
        const s = Math.max(0, overshoot * targetScale);
        sprite.scale.set(s, s, 1);
        requestAnimationFrame(animatePop);
      } else {
        sprite.scale.set(targetScale, targetScale, 1);
      }
    };
    animatePop();
  }

  /**
   * Despawns and permanently eliminates the defeated monster with a dissolution particle effect.
   * @param {string} monsterId 
   */
  despawnMonster(monsterId) {
    const idx = this.monsters.findIndex(m => m.id === monsterId);
    if (idx === -1) return;

    const monster = this.monsters[idx];
    this.monsters.splice(idx, 1);
    this.defeatedIds.add(monsterId);
    // Hito 106: programa su reaparición (manadas normales al azar por la isla; jefes y mobs de misión donde estaban)
    if (monster.respawnSpec) this.respawn.schedule(monster.respawnSpec.kind, monster.respawnSpec);

    // Particle dissolution animation
    const origin = monster.group.position.clone();
    const particleCount = 36;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = origin.x + (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 1] = origin.y + 0.5 + Math.random() * 0.8;
      positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.8;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        1.2 + Math.random() * 2.5,
        (Math.random() - 0.5) * 2.5
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xc084fc,
      size: 0.28,
      transparent: true,
      opacity: 1.0
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);

    // Fade out monster mesh
    let fadeElapsed = 0;
    const fadeTimer = setInterval(() => {
      fadeElapsed += 0.04;
      const posAttr = geo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3] += velocities[i].x * 0.04;
        posAttr.array[i * 3 + 1] += velocities[i].y * 0.04;
        posAttr.array[i * 3 + 2] += velocities[i].z * 0.04;
      }
      posAttr.needsUpdate = true;
      mat.opacity = Math.max(0, 1.0 - fadeElapsed / 1.2);

      if (fadeElapsed >= 1.2) {
        clearInterval(fadeTimer);
        this.scene.remove(particles);
        geo.dispose();
        mat.dispose();
      }
    }, 40);

    // Remove group from scene (30-oct: y libera lo suyo; antes se quedaba en la GPU sin dispose)
    this._disposeMonster(monster);
    this.isEncounterTriggered = false;
  }
}
