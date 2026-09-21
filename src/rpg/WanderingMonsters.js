// WanderingMonsters.js - Overworld Chimera Monsters with AI Patrol, Alert ! & Procedural Biome Packs
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { generatePackForBiome } from './world/BiomeEnemyCatalog.js';
import { applyToonOutline } from './stylized/ToonOutline.js';
import { createQuestBeaconArrow3D } from './world/ZoneTransitionManager.js';

export class WanderingMonsters {
  constructor(scene, collisionSystem, audioSystem) {
    this.scene = scene;
    this.collisions = collisionSystem;
    this.audio = audioSystem;
    this.om = null; // Reference to OverworldManager for bridge heights and world context

    this.monsters = [];
    this.defeatedIds = new Set();
    this.questManager = null;
    this.onEncounterCallback = null;
    this.isEncounterTriggered = false;
    this.isCombatEnabled = false;
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
      name: 'slime',
      badge: '👾',
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
    toRemove.forEach(m => {
      if (m.toonOutline && typeof m.toonOutline.dispose === 'function') {
        m.toonOutline.dispose();
      }
      if (m.mixer) {
        m.mixer.stopAllAction();
        if (typeof m.mixer.uncacheRoot === 'function') {
          m.mixer.uncacheRoot(m.group);
        }
      }
      if (m.group) {
        this.scene.remove(m.group);
        m.group.traverse(child => {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              for (const k of Object.keys(mat)) {
                const val = mat[k];
                if (val && val.isTexture) {
                  val.dispose();
                  if (val.image && typeof val.image.close === 'function') {
                    try { val.image.close(); } catch (_) {}
                  }
                  val.image = null;
                  if (val.source) val.source.data = null;
                }
              }
              mat.dispose();
            });
          }
        });
        m.group.clear();
      }
    });
    this.monsters = this.monsters.filter(m => m.id === 'slime_garden_1');
    this.isEncounterTriggered = false;
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

    // DOJO SANCTUARY RULE: Dojo [2, 2] is a peaceful sanctuary.
    if ((gx === 2 && gy === 2) || mapDef.hasDojo) {
      console.log('[WanderingMonsters] Zone is the Dojo Sanctuary. Procedural spawns disabled.');
      return;
    }

    this.isCombatEnabled = true;

    // Spawn 1 or 2 wandering monster encounters per zone
    const packCount = Math.random() < 0.6 ? 1 : 2;
    const spawnPresets = this._getSafeSpawnPresets(gx, gy, mapDef.biome || 'forest');

    for (let i = 0; i < packCount; i++) {
      let forcedLeader = null;
      if (gx === 1 && gy === 3 && i === 0) forcedLeader = 'dryad_fighter';
      else if (gx === 2 && gy === 1 && i === 0) forcedLeader = 'wolf_alpha';
      else if (gx === 2 && gy === 3 && i === 0) forcedLeader = 'bear_mom';
      else if (gx === 3 && gy === 3 && i === 0) forcedLeader = 'werewolf_boss';

      const pack = generatePackForBiome(mapDef.biome || 'forest', [gx, gy], forcedLeader);
      const preset = spawnPresets[i] || spawnPresets[0];
      const leader = pack.leader;

      let displayName = leader.name;
      let badge = '👾';
      if (forcedLeader) {
        badge = '👑';
      } else if (pack.packSize > 1) {
        displayName = `${pack.packTitle} (x${pack.packSize})`;
        badge = '🐺';
      }

      await this.spawnMonster({
        id: `mob_${pack.packId}_${i}`,
        name: displayName,
        badge,
        tier: pack.tier,
        modelType: leader.type,
        x: preset.x,
        z: preset.z,
        scale: leader.scale,
        tintColor: leader.tintColor,
        packData: pack,
        biome: mapDef.biome || 'forest',
        patrolPoints: preset.patrol,
        detectionRadius: 7.5,
        encounterRadius: 1.85,
        patrolSpeed: 1.8,
        chaseSpeed: 4.8
      });
    }

    // Special Quest Encounters for Sabana / Yermos Áridos in [3, 1]
    if (gx === 3 && gy === 1) {
      const qm = this.questManager || (typeof window !== 'undefined' ? window.overworldManager?.questManager : null);
      
      // 1. Armored Chimera for "Nomad Steel" (Herrero Baruk)
      const qNomad = qm?.getQuest('quest_nomad_steel');
      const stepOre = qNomad?.objective?.steps?.find(s => s.id === 'gather_ores');
      if (qNomad && qNomad.status === 'active' && stepOre && !stepOre.done) {
        const mobArmored = await this.spawnMonster({
          id: 'mob_armored_chimera',
          name: '🛡️ Armored Chimera (Quest)',
          badge: '🛡️',
          tier: 2,
          modelType: 'wolf-aquatic-alpha',
          x: 16.0,
          z: 8.0,
          scale: 1.65,
          tintColor: 0x78716c,
          biome: 'savannah',
          patrolPoints: [
            new THREE.Vector3(16, 0, 8),
            new THREE.Vector3(22, 0, 14),
            new THREE.Vector3(14, 0, 18),
            new THREE.Vector3(8, 0, 10)
          ],
          detectionRadius: 8.5,
          encounterRadius: 2.2,
          patrolSpeed: 1.6,
          chaseSpeed: 4.5
        });
        if (mobArmored && mobArmored.group && !mobArmored.questArrow) {
          const arrow = createQuestBeaconArrow3D(2.1);
          mobArmored.group.add(arrow);
          mobArmored.questArrow = arrow;
        }
      }

      // 2. Beaked Alpha Chimera for "The Hunt for the Beaked Chimera" (Centinela)
      const qBeaked = qm?.getQuest('quest_hunt_beaked_chimera');
      const stepAlpha = qBeaked?.objective?.steps?.find(s => s.id === 'defeat_beaked_alpha');
      if (qBeaked && qBeaked.status === 'active' && stepAlpha && !stepAlpha.done) {
        const mobBeaked = await this.spawnMonster({
          id: 'mob_beaked_chimera',
          name: '🦅 Alpha Beaked Chimera (Quest)',
          badge: '🦅',
          tier: 2,
          modelType: 'bird-early',
          x: -14.0,
          z: -10.0,
          scale: 1.55,
          tintColor: 0xf59e0b,
          biome: 'savannah',
          patrolPoints: [
            new THREE.Vector3(-14, 0, -10),
            new THREE.Vector3(-20, 0, -6),
            new THREE.Vector3(-16, 0, -18),
            new THREE.Vector3(-8, 0, -14)
          ],
          detectionRadius: 8.5,
          encounterRadius: 2.2,
          patrolSpeed: 1.7,
          chaseSpeed: 4.6
        });
        if (mobBeaked && mobBeaked.group && !mobBeaked.questArrow) {
          const arrow = createQuestBeaconArrow3D(2.0);
          mobBeaked.group.add(arrow);
          mobBeaked.questArrow = arrow;
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
    const leader = pack.leader;
    const presets = this._getSafeSpawnPresets(gx, gy, biome);
    const preset = presets[0];

    await this.spawnMonster({
      id: `mob_boss_${zoneKey}_${Date.now().toString(36)}`,
      name: `${pack.packTitle}`,
      badge: '👑',
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
    const mobRadius = Math.max(0.65, (config.scale || 1.0) * 0.60);
    const safeSpawn = this._sanitizePoint(config.x, config.z, mobRadius);
    const group = new THREE.Group();
    group.position.set(safeSpawn.x, 0, safeSpawn.z);

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

    // Alert Exclamation Sprite (hidden by default)
    const alertCanvas = document.createElement('canvas');
    alertCanvas.width = 256;
    alertCanvas.height = 256;
    const ctx = alertCanvas.getContext('2d');
    
    // Subtle outer shadow
    ctx.shadowColor = 'rgba(220, 38, 38, 0.55)';
    ctx.shadowBlur = 12;

    // Vibrant red gradient circle
    const grad = ctx.createLinearGradient(0, 24, 0, 232);
    grad.addColorStop(0, '#f87171');
    grad.addColorStop(1, '#dc2626');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 102, 0, Math.PI * 2);
    ctx.fill();

    // Crisp white border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Bold exclamation mark
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 146px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 128, 124);

    const alertTex = new THREE.CanvasTexture(alertCanvas);
    const alertMat = new THREE.SpriteMaterial({ map: alertTex, transparent: true });
    const alertSprite = new THREE.Sprite(alertMat);
    alertSprite.scale.set(0, 0, 1);

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
    alertSprite.position.set(0, overheadY + 0.88, 0);
    group.add(alertSprite);

    // Overhead Nameplate
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 340;
    nameCanvas.height = 68;
    const nCtx = nameCanvas.getContext('2d');
    nCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    nCtx.roundRect(8, 8, 324, 52, 12);
    nCtx.fill();
    nCtx.strokeStyle = config.packData?.packSize > 1 ? '#f59e0b' : '#a855f7';
    nCtx.lineWidth = 3;
    nCtx.roundRect(8, 8, 324, 52, 12);
    nCtx.stroke();

    nCtx.fillStyle = '#f3e8ff';
    nCtx.font = 'bold 20px sans-serif';
    nCtx.textAlign = 'center';
    const badge = config.badge || '👾';
    const tierText = config.tier ? ` · Nv.${config.tier}` : '';
    nCtx.fillText(`${badge} ${config.name}${tierText}`, 170, 41);

    const nameTex = new THREE.CanvasTexture(nameCanvas);
    const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true });
    const nameSprite = new THREE.Sprite(nameMat);
    nameSprite.scale.set(2.4, 0.52, 1);
    nameSprite.position.set(0, overheadY, 0);
    group.add(nameSprite);

    let mesh = null;
    let mixer = null;
    let actions = {};

    try {
      const loader = new GLTFLoader();
      let modelPath = `./assets/models/${mType}.glb`;
      if (mType === 'sapidae' || mType === 'sapidae-f-a') {
        modelPath = './assets/models/dryad-fighter.glb';
      }

      const gltf = await loader.loadAsync(modelPath);
      mesh = gltf.scene;
      const modelScale = config.scale || 1.0;
      mesh.scale.set(modelScale, modelScale, modelScale);

      mesh.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (config.tintColor && c.material) {
            c.material = c.material.clone();
            c.material.color.setHex(config.tintColor);
          }
        }
      });
      group.add(mesh);

      // Apply Inverted Hull Toon Style Outline
      const toonOutline = applyToonOutline(mesh, {
        thickness: 0.022,
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
      group: group,
      mesh: mesh,
      toonOutline: mesh?.userData?.toonOutline || null,
      mixer: mixer,
      actions: actions,
      currentAnim: 'idle',
      auraMesh: auraMesh,
      alertSprite: alertSprite,
      nameSprite: nameSprite,
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
      yaw: 0
    };

    this.monsters.push(monster);
    return monster;
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

    // 3. Dynamic bridge elevation
    if (this.om && this.om.stylizedRiver && this.om.stylizedRiver.group.visible && typeof this.om.stylizedRiver.getBridgeHeight === 'function') {
      const targetY = this.om.stylizedRiver.getBridgeHeight(newPos.x, newPos.z);
      m.group.position.y += (targetY - m.group.position.y) * Math.min(1.0, 15.0 * dt);
    }

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

  update(dt, time, playerPos) {
    if (this.isEncounterTriggered) return;

    this.monsters.forEach(m => {
      if (m.mixer) m.mixer.update(dt);

      if (!playerPos) return;

      const dx = playerPos.x - m.group.position.x;
      const dz = playerPos.z - m.group.position.z;
      const distToPlayer = Math.hypot(dx, dz);

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
            if (this.audio && typeof this.audio.playCollision === 'function') {
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

      // Procedural vertical bounce for models without embedded skeletal animation
      if (!m.mixer && m.mesh) {
        if (m.state === 'PATROL' || m.state === 'CHASE') {
          m.mesh.position.y = Math.abs(Math.sin(time * 8.0)) * 0.16;
        } else {
          m.mesh.position.y = Math.sin(time * 3.0) * 0.04;
        }
      }

      // 3D overhead beacon arrow tracking
      if (m.questArrow && typeof m.questArrow.updateAnimation === 'function') {
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
    const targetScale = 0.85;
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
    if (monster.toonOutline) {
      monster.toonOutline.dispose();
    }

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

    // Remove group from scene
    this.scene.remove(monster.group);
    this.isEncounterTriggered = false;
  }
}
