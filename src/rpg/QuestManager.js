// QuestManager.js - Centralized Quest System for Lunacia Adventures
import { ForgeService } from './ForgeService.js';
import * as i18n from '../i18n/i18n.js';
import { isMaterial } from './LootService.js';
import { canonicalZoneKey, MERGED_ZONES, FERRY_DOCKS, ISLAND_NAMES, mergedBattleAnchor, ISLAND_MONSTER_LAYOUT } from './world/islands/IslandWorldLayout.js';

/** Hito 74: posición actual de un monstruo de misión (si está en el mapa) o su sitio fijo en la isla. */
function questMobPos(id, islandKey) {
  const mob = typeof window !== 'undefined' ? window.overworldManager?.monsters?.monsters?.find((m) => m.id === id) : null;
  if (mob && mob.group) return { x: mob.group.position.x, z: mob.group.position.z };
  const a = ISLAND_MONSTER_LAYOUT[islandKey]?.questMobs?.[id];
  return a ? { x: a.x, z: a.z } : null;
}
export class QuestManager {
  constructor(equipmentManager = null, audioSystem = null) {
    this.equipmentManager = equipmentManager;
    this.audio = audioSystem;
    this.listeners = [];
    this.trackedQuestId = null;
    // Seguimiento desactivado por el jugador (Libro de misiones): sin misión seguida, sin flecha ni marcador.
    this.trackingOff = false;

    // Master Quests Database (10 Main Linear Quests + 10 Side Quests)
    this.quests = {
      // ==========================================
      // 10 MISIONES PRINCIPALES (CAMPAÑA LINEAL)
      // ==========================================
      quest_slime_purification: {
        id: 'quest_slime_purification',
        title: i18n.t('quests.dojoApprentice.title'),
        category: 'Principal',
        order: 1,
        giver: {
          name: i18n.t('quests.npc.paladill'),
          title: i18n.t('quests.dojoApprentice.giverTitle'),
          avatar: './assets/portraits/paladill.png',
          model: 'paladill'
        },
        zoneCoords: [2, 2],
        lore: i18n.t('quests.dojoApprentice.lore'),
        npcQuote: i18n.t('quests.dojoApprentice.quote'),
        objective: {
          summary: i18n.t('quests.dojoApprentice.summary'),
          steps: [
            { id: 'defend_dojo', desc: i18n.t('quests.dojoApprentice.step.defendDojo'), done: false },
            { id: 'equip_sword', desc: i18n.t('quests.dojoApprentice.step.equipSword'), done: false },
            { id: 'duel_paladill', desc: i18n.t('quests.dojoApprentice.step.duelPaladill'), done: false },
            { id: 'evolve_sword', desc: i18n.t('quests.dojoApprentice.step.evolveSword'), done: false },
            { id: 'bond_axie', desc: i18n.t('quests.dojoApprentice.step.bondAxie'), done: false },
            { id: 'equip_runes', desc: i18n.t('quests.dojoApprentice.step.equipRunes'), done: false },
            { id: 'graduate', desc: i18n.t('quests.dojoApprentice.step.graduate'), done: false }
          ]
        },
        rewards: {
          gold: 0,
          exp: 100,
          items: []
        },
        status: 'active',
        rewardClaimed: false
      },

      quest_prove_ferocity: {
        id: 'quest_prove_ferocity',
        title: i18n.t('quests.proveFerocity.title'),
        category: 'Principal',
        order: 2,
        giver: {
          name: 'Bing',
          title: i18n.t('quests.proveFerocity.giverTitle'),
          avatar: './assets/portraits/bing.png',
          model: 'bing'
        },
        zoneCoords: [3, 2],
        lore: i18n.t('quests.proveFerocity.lore'),
        npcQuote: i18n.t('quests.proveFerocity.quote'),
        objective: {
          summary: i18n.t('quests.proveFerocity.summary'),
          steps: [
            { id: 'find_bing', desc: i18n.t('quests.proveFerocity.step.findBing'), done: false },
            { id: 'defend_bing', desc: i18n.t('quests.proveFerocity.step.defendBing'), done: false },
            { id: 'recruit_bing', desc: i18n.t('quests.proveFerocity.step.recruitBing'), done: false }
          ]
        },
        rewards: {
          gold: 200,
          exp: 150,
          recruits: ['bing'],
          items: [
            { id: 'composite_bow', name: i18n.t('items.composite_bow.name'), slot: 'weapon', rarity: 'common', icon: './assets/equippable/composite_bow.webp', desc: i18n.t('items.composite_bow.description'), stats: { damage: 7, initiative: 3 } }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_hostile_sands: {
        id: 'quest_hostile_sands',
        title: i18n.t('quests.hostileSands.title'),
        category: 'Principal',
        order: 3,
        giver: {
          name: i18n.t('quests.npc.desertSentinel'),
          title: i18n.t('quests.hostileSands.giverTitle'),
          avatar: './assets/portraits/kibo.png',
          model: 'kibo',
          zoneCoords: [3, 2]
        },
        zoneCoords: [3, 2],
        lore: i18n.t('quests.hostileSands.lore'),
        npcQuote: i18n.t('quests.hostileSands.quote'),
        objective: {
          summary: i18n.t('quests.hostileSands.summary'),
          steps: [
            { id: 'cross_to_savannah', desc: i18n.t('quests.hostileSands.step.crossToSavannah'), done: false, zoneCoords: [3, 2] },
            { id: 'talk_sentinel', desc: i18n.t('quests.hostileSands.step.talkSentinel'), done: false, zoneCoords: [3, 2] }
          ]
        },
        rewards: {
          gold: 250,
          exp: 200,
          items: [
            { id: 'beast_helmet', name: i18n.t('items.beast_helmet.name'), slot: 'hat', rarity: 'common', icon: './assets/equippable/beast_helmet.webp', desc: i18n.t('items.beast_helmet.description'), stats: { hp: 15 } }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_hunt_beaked_chimera: {
        id: 'quest_hunt_beaked_chimera',
        title: i18n.t('quests.huntBeakedChimera.title'),
        category: 'Principal',
        order: 4,
        giver: {
          name: i18n.t('quests.npc.desertSentinel'),
          title: i18n.t('quests.huntBeakedChimera.giverTitle'),
          avatar: './assets/portraits/kibo.png',
          model: 'kibo',
          zoneCoords: [3, 2]
        },
        zoneCoords: [3, 2],
        lore: i18n.t('quests.huntBeakedChimera.lore'),
        npcQuote: i18n.t('quests.huntBeakedChimera.quote'),
        objective: {
          summary: i18n.t('quests.huntBeakedChimera.summary'),
          steps: [
            { id: 'reach_wastes', desc: i18n.t('quests.huntBeakedChimera.step.reachWastes'), done: false, zoneCoords: [3, 2] },
            { id: 'defeat_beaked_alpha', desc: i18n.t('quests.huntBeakedChimera.step.defeatBeakedAlpha'), done: false, zoneCoords: [3, 2] },
            { id: 'report_hunt', desc: i18n.t('quests.huntBeakedChimera.step.reportHunt'), done: false, zoneCoords: [3, 2] }
          ]
        },
        rewards: {
          gold: 300,
          exp: 250,
          items: [
            { id: 'wooden_buckler', name: i18n.t('items.wooden_buckler.name'), slot: 'shield', rarity: 'common', icon: './assets/equippable/wooden_buckler.webp', desc: i18n.t('items.wooden_buckler.description'), stats: { hp: 18, shield: 15 } }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_frozen_seed: {
        id: 'quest_frozen_seed',
        title: i18n.t('quests.frozenSeed.title'),
        category: 'Principal',
        order: 5,
        giver: {
          name: 'Pomodoro',
          title: i18n.t('quests.frozenSeed.giverTitle'),
          avatar: './assets/portraits/pomodoro.png',
          model: 'pomodoro'
        },
        zoneCoords: [2, 1],
        lore: i18n.t('quests.frozenSeed.lore'),
        npcQuote: i18n.t('quests.frozenSeed.quote'),
        objective: {
          summary: i18n.t('quests.frozenSeed.summary'),
          steps: [
            { id: 'reach_arctic', desc: i18n.t('quests.frozenSeed.step.reachArctic'), done: false, zoneCoords: [2, 1] },
            { id: 'defend_pomodoro', desc: i18n.t('quests.frozenSeed.step.defendPomodoro'), done: false, zoneCoords: [2, 1] },
            { id: 'recruit_pomodoro', desc: i18n.t('quests.frozenSeed.step.recruitPomodoro'), done: false, zoneCoords: [2, 1] }
          ]
        },
        rewards: {
          gold: 350,
          exp: 300,
          recruits: ['pomodoro'],
          items: [
            { id: 'mat_wool', name: i18n.t('items.mat_wool.name'), qty: 3, kind: 'material', rarity: 'rare', desc: i18n.t('items.mat_wool.description') },
            { id: 'mat_wood', name: i18n.t('items.mat_wood.name'), qty: 3, kind: 'material', rarity: 'rare', desc: i18n.t('items.mat_wood.description') }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_blizzard_core: {
        id: 'quest_blizzard_core',
        title: i18n.t('quests.blizzardCore.title'),
        category: 'Principal',
        order: 6,
        giver: {
          name: 'Pomodoro',
          title: i18n.t('quests.blizzardCore.giverTitle'),
          avatar: './assets/portraits/pomodoro.png',
          model: 'pomodoro'
        },
        zoneCoords: [1, 1],
        lore: i18n.t('quests.blizzardCore.lore'),
        npcQuote: i18n.t('quests.blizzardCore.quote'),
        objective: {
          summary: i18n.t('quests.blizzardCore.summary'),
          steps: [
            { id: 'reach_peaks', desc: i18n.t('quests.blizzardCore.step.reachPeaks'), done: false, zoneCoords: [1, 1] },
            { id: 'defeat_golem', desc: i18n.t('quests.blizzardCore.step.defeatGolem'), done: false, zoneCoords: [1, 1] }
          ]
        },
        rewards: {
          gold: 400,
          exp: 350,
          items: [
            { id: 'mat_wool', name: i18n.t('items.mat_wool.name'), qty: 4, kind: 'material', rarity: 'rare', desc: i18n.t('items.mat_wool.description') },
            { id: 'mat_frost_crystal', name: i18n.t('items.mat_frost_crystal.name'), qty: 1, kind: 'material', rarity: 'mystic', desc: i18n.t('items.mat_frost_crystal.description') }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_astral_void_echoes: {
        id: 'quest_astral_void_echoes',
        title: i18n.t('quests.astralVoidEchoes.title'),
        category: 'Principal',
        order: 7,
        giver: {
          name: i18n.t('quests.npc.astralSage'),
          title: i18n.t('quests.astralVoidEchoes.giverTitle'),
          avatar: './assets/portraits/sapidae-f-c.png',
          model: 'sapidae-f-c',
          zoneCoords: [1, 2]
        },
        zoneCoords: [1, 2],
        lore: i18n.t('quests.astralVoidEchoes.lore'),
        npcQuote: i18n.t('quests.astralVoidEchoes.quote'),
        objective: {
          summary: i18n.t('quests.astralVoidEchoes.summary'),
          steps: [
            { id: 'enter_mystic', desc: i18n.t('quests.astralVoidEchoes.step.enterMystic'), done: false, zoneCoords: [1, 2] },
            { id: 'talk_oracle', desc: i18n.t('quests.astralVoidEchoes.step.talkOracle'), done: false, zoneCoords: [1, 3] }
          ]
        },
        rewards: {
          gold: 450,
          exp: 400,
          items: [
            { id: 'mat_druid_flower', name: i18n.t('items.mat_druid_flower.name'), qty: 3, kind: 'material', rarity: 'epic', desc: i18n.t('items.mat_druid_flower.description') },
            { id: 'mat_moon_flower', name: i18n.t('items.mat_moon_flower.name'), qty: 2, kind: 'material', rarity: 'epic', desc: i18n.t('items.mat_moon_flower.description') }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_forbidden_resonance: {
        id: 'quest_forbidden_resonance',
        title: i18n.t('quests.forbiddenResonance.title'),
        category: 'Principal',
        order: 8,
        giver: {
          name: i18n.t('quests.npc.astralOracle'),
          title: i18n.t('quests.forbiddenResonance.giverTitle'),
          avatar: './assets/portraits/sapidae-f-d.png',
          model: 'sapidae-f-d',
          zoneCoords: [1, 3]
        },
        zoneCoords: [1, 3],
        lore: i18n.t('quests.forbiddenResonance.lore'),
        npcQuote: i18n.t('quests.forbiddenResonance.quote'),
        objective: {
          summary: i18n.t('quests.forbiddenResonance.summary'),
          steps: [
            { id: 'reach_sanctuary', desc: i18n.t('quests.forbiddenResonance.step.reachSanctuary'), done: false, zoneCoords: [1, 3] },
            { id: 'defeat_sapidae', desc: i18n.t('quests.forbiddenResonance.step.defeatSapidae'), done: false, zoneCoords: [1, 3] },
            { id: 'purify_resonance', desc: i18n.t('quests.forbiddenResonance.step.purifyResonance'), done: false, zoneCoords: [1, 3] }
          ]
        },
        rewards: {
          gold: 500,
          exp: 450,
          items: [
            { id: 'mat_druid_staff', name: i18n.t('items.mat_druid_staff.name'), qty: 3, kind: 'material', rarity: 'epic', desc: i18n.t('items.mat_druid_staff.description') },
            { id: 'mat_astral_dust', name: i18n.t('items.mat_astral_dust.name'), qty: 1, kind: 'material', rarity: 'mystic', desc: i18n.t('items.mat_astral_dust.description') }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_sulfur_threshold: {
        id: 'quest_sulfur_threshold',
        title: i18n.t('quests.genesisThreshold.title'),
        category: 'Principal',
        order: 9,
        giver: {
          name: 'Kotaro',
          title: i18n.t('quests.genesisThreshold.giverTitle'),
          avatar: './assets/portraits/kotaro.png',
          model: 'kotaro',
          zoneCoords: [2, 3]
        },
        zoneCoords: [2, 3],
        lore: i18n.t('quests.genesisThreshold.lore'),
        npcQuote: i18n.t('quests.genesisThreshold.quote'),
        objective: {
          summary: i18n.t('quests.genesisThreshold.summary'),
          steps: [
            { id: 'reach_threshold', desc: i18n.t('quests.genesisThreshold.step.reachThreshold'), done: false, zoneCoords: [2, 3] },
            { id: 'defeat_sulfur_guards', desc: i18n.t('quests.genesisThreshold.step.defeatSulfurGuards'), done: false, zoneCoords: [2, 3] }
          ]
        },
        rewards: {
          gold: 600,
          exp: 500,
          items: [
            { id: 'crimson_crypt_key', name: i18n.t('items.crimson_crypt_key.name'), slot: 'quest', rarity: 'mystic', icon: './assets/materials/misions/crimson_crypt_key.webp', desc: i18n.t('items.crimson_crypt_key.description'), stats: {} }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_primeval_purification: {
        id: 'quest_primeval_purification',
        title: i18n.t('quests.primevalPurification.title'),
        category: 'Principal',
        order: 10,
        giver: {
          name: i18n.t('quests.npc.spiritOfAtia'),
          title: i18n.t('quests.primevalPurification.giverTitle'),
          avatar: './assets/portraits/statue_atia.png',
          model: 'statue_atia',
          zoneCoords: [3, 3]
        },
        zoneCoords: [3, 3],
        lore: i18n.t('quests.primevalPurification.lore'),
        npcQuote: i18n.t('quests.primevalPurification.quote'),
        objective: {
          summary: i18n.t('quests.primevalPurification.summary'),
          steps: [
            { id: 'enter_catacombs', desc: i18n.t('quests.primevalPurification.step.enterCatacombs'), done: false, zoneCoords: [3, 3] },
            { id: 'defeat_crypt_lord', desc: i18n.t('quests.primevalPurification.step.defeatCryptLord'), done: false, zoneCoords: [3, 3] },
            { id: 'restore_lunacia', desc: i18n.t('quests.primevalPurification.step.restoreLunacia'), done: false, zoneCoords: [3, 3] }
          ]
        },
        rewards: {
          gold: 1000,
          exp: 1000,
          items: [
            { id: 'mat_amber_atia', name: i18n.t('items.mat_amber_atia.name'), qty: 3, kind: 'material', rarity: 'mystic', desc: i18n.t('items.mat_amber_atia.description') },
            { id: 'mat_lunar_shard', name: i18n.t('items.mat_lunar_shard.name'), qty: 1, kind: 'material', rarity: 'mystic', desc: i18n.t('items.mat_lunar_shard.description') }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      // ==========================================
      // 10 MISIONES SECUNDARIAS (MUNDO ABIERTO)
      // ==========================================
      quest_world_cartographer: {
        id: 'quest_world_cartographer',
        title: i18n.t('quests.worldCartographer.title'),
        category: 'Secundaria',
        giver: {
          name: 'Xia',
          title: i18n.t('quests.worldCartographer.giverTitle'),
          avatar: './assets/portraits/xia.png',
          model: 'xia'
        },
        zoneCoords: [2, 2],
        bubbleQuote: i18n.t('quests.worldCartographer.bubble'),
        lore: i18n.t('quests.worldCartographer.lore'),
        npcQuote: i18n.t('quests.worldCartographer.quote'),
        objective: {
          summary: i18n.t('quests.worldCartographer.summary'),
          steps: [
            { id: 'open_map', desc: i18n.t('quests.worldCartographer.step.openMap'), done: false },
            { id: 'visit_biomes', desc: i18n.t('quests.worldCartographer.step.visitBiomes'), done: false }
          ]
        },
        rewards: {
          gold: 150,
          exp: 80,
          items: [
            { id: 'traveler_cloak', name: i18n.t('items.traveler_cloak.name'), slot: 'body', rarity: 'common', icon: './assets/equippable/traveler_cloak.webp', desc: i18n.t('items.traveler_cloak.description'), stats: { hp: 25 } }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_lost_mail: {
        id: 'quest_lost_mail',
        title: i18n.t('quests.lostMail.title'),
        category: 'Secundaria',
        giver: {
          name: i18n.t('quests.npc.postman'),
          title: i18n.t('quests.lostMail.giverTitle'),
          avatar: './assets/portraits/sapidae-m-a.png',
          model: 'sapidae-m-a'
        },
        zoneCoords: [2, 2],
        bubbleQuote: i18n.t('quests.lostMail.bubble'),
        lore: i18n.t('quests.lostMail.lore'),
        npcQuote: i18n.t('quests.lostMail.quote'),
        objective: {
          summary: i18n.t('quests.lostMail.summary'),
          steps: [
            { id: 'talk_postman', desc: i18n.t('quests.lostMail.step.talkPostman'), done: false },
            { id: 'find_mail', desc: i18n.t('quests.lostMail.step.findMail'), done: false },
            { id: 'return_mail', desc: i18n.t('quests.lostMail.step.returnMail'), done: false }
          ]
        },
        rewards: {
          gold: 120,
          exp: 70,
          items: [
            { id: 'heavy_boots', name: i18n.t('items.heavy_boots.name'), slot: 'boots', rarity: 'common', icon: './assets/equippable/heavy_boots.webp', desc: i18n.t('items.heavy_boots.description'), stats: { hp: 12, initiative: 2 } }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_forest_elixir: {
        id: 'quest_forest_elixir',
        title: i18n.t('quests.forestElixir.title'),
        category: 'Secundaria',
        giver: {
          name: i18n.t('quests.npc.herbalistRosalba'),
          title: i18n.t('quests.forestElixir.giverTitle'),
          avatar: './assets/portraits/sapidae-f-a.png',
          model: 'sapidae-f-a'
        },
        zoneCoords: [2, 2],
        bubbleQuote: i18n.t('quests.forestElixir.bubble'),
        lore: i18n.t('quests.forestElixir.lore'),
        npcQuote: i18n.t('quests.forestElixir.quote'),
        objective: {
          summary: i18n.t('quests.forestElixir.summary'),
          steps: [
            { id: 'talk_herbalist', desc: i18n.t('quests.forestElixir.step.talkHerbalist'), done: false },
            { id: 'gather_moss', desc: i18n.t('quests.forestElixir.step.gatherMoss'), done: false },
            { id: 'deliver_moss', desc: i18n.t('quests.forestElixir.step.deliverMoss'), done: false }
          ]
        },
        rewards: {
          gold: 140,
          exp: 85,
          items: [
            { id: 'dew_flask', name: i18n.t('items.dew_flask.name'), slot: 'consumable', rarity: 'rare', icon: './assets/consumable/healing_dew_flask.webp', desc: i18n.t('items.dew_flask.description'), stats: {} }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_nomad_steel: {
        id: 'quest_nomad_steel',
        title: i18n.t('quests.nomadSteel.title'),
        category: 'Secundaria',
        giver: {
          name: i18n.t('quests.npc.blacksmithBaruk'),
          title: i18n.t('quests.nomadSteel.giverTitle'),
          avatar: './assets/portraits/sapidae-m-b.png',
          model: 'sapidae-m-b'
        },
        zoneCoords: [3, 2],
        bubbleQuote: i18n.t('quests.nomadSteel.bubble'),
        lore: i18n.t('quests.nomadSteel.lore'),
        npcQuote: i18n.t('quests.nomadSteel.quote'),
        objective: {
          summary: i18n.t('quests.nomadSteel.summary'),
          steps: [
            { id: 'talk_blacksmith', desc: i18n.t('quests.nomadSteel.step.talkBlacksmith'), done: false },
            { id: 'gather_ores', desc: i18n.t('quests.nomadSteel.step.gatherOres'), done: false },
            { id: 'deliver_ores', desc: i18n.t('quests.nomadSteel.step.deliverOres'), done: false }
          ]
        },
        rewards: {
          gold: 200,
          exp: 120,
          items: [
            { id: 'mat_copper', name: i18n.t('items.mat_copper.name'), qty: 5, kind: 'material', rarity: 'common', desc: i18n.t('items.mat_copper.description') },
            { id: 'mat_wolf_tooth', name: i18n.t('items.mat_wolf_tooth.name'), qty: 3, kind: 'material', rarity: 'rare', desc: i18n.t('items.mat_wolf_tooth.description') }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_keen_eye_trial: {
        id: 'quest_keen_eye_trial',
        title: i18n.t('quests.keenEyeTrial.title'),
        category: 'Secundaria',
        giver: {
          name: i18n.t('quests.npc.hunterZarek'),
          title: i18n.t('quests.keenEyeTrial.giverTitle'),
          avatar: './assets/portraits/sapidae-m-c.png',
          model: 'sapidae-m-c'
        },
        zoneCoords: [3, 2],
        bubbleQuote: i18n.t('quests.keenEyeTrial.bubble'),
        lore: i18n.t('quests.keenEyeTrial.lore'),
        npcQuote: i18n.t('quests.keenEyeTrial.quote'),
        objective: {
          summary: i18n.t('quests.keenEyeTrial.summary'),
          steps: [
            { id: 'talk_hunter', desc: i18n.t('quests.keenEyeTrial.step.talkHunter'), done: false },
            { id: 'win_hunt_battle', desc: i18n.t('quests.keenEyeTrial.step.winHuntBattle'), done: false },
            { id: 'report_hunt', desc: i18n.t('quests.keenEyeTrial.step.reportHunt'), done: false }
          ]
        },
        rewards: {
          gold: 220,
          exp: 140,
          items: [
            { id: 'mushroom_staff', name: i18n.t('items.mushroom_staff.name'), slot: 'weapon', rarity: 'common', icon: './assets/equippable/mushroom_staff.webp', desc: i18n.t('items.mushroom_staff.description'), stats: { hp: 20, damage: 6 } }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_blizzard_stew: {
        id: 'quest_blizzard_stew',
        title: i18n.t('quests.blizzardStew.title'),
        category: 'Secundaria',
        giver: {
          name: i18n.t('quests.npc.chefBoreal'),
          title: i18n.t('quests.blizzardStew.giverTitle'),
          avatar: './assets/portraits/sapidae-m-d.png',
          model: 'sapidae-m-d'
        },
        zoneCoords: [2, 1],
        bubbleQuote: i18n.t('quests.blizzardStew.bubble'),
        lore: i18n.t('quests.blizzardStew.lore'),
        npcQuote: i18n.t('quests.blizzardStew.quote'),
        objective: {
          summary: i18n.t('quests.blizzardStew.summary'),
          steps: [
            { id: 'talk_chef', desc: i18n.t('quests.blizzardStew.step.talkChef'), done: false },
            { id: 'gather_frost_mushrooms', desc: i18n.t('quests.blizzardStew.step.gatherFrostMushrooms'), done: false },
            { id: 'deliver_soup', desc: i18n.t('quests.blizzardStew.step.deliverSoup'), done: false }
          ]
        },
        rewards: {
          gold: 260,
          exp: 180,
          items: [
            { id: 'mat_wood', name: i18n.t('items.mat_wood.name'), qty: 4, kind: 'material', rarity: 'rare', desc: i18n.t('items.mat_wood.description') },
            { id: 'mat_wool', name: i18n.t('items.mat_wool.name'), qty: 2, kind: 'material', rarity: 'rare', desc: i18n.t('items.mat_wool.description') }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_dark_frost_totems: {
        id: 'quest_dark_frost_totems',
        title: i18n.t('quests.darkFrostTotems.title'),
        category: 'Secundaria',
        giver: {
          name: i18n.t('quests.npc.glacialHermit'),
          title: i18n.t('quests.darkFrostTotems.giverTitle'),
          avatar: './assets/portraits/sapidae-m-e.png',
          model: 'sapidae-m-e'
        },
        zoneCoords: [1, 1],
        bubbleQuote: i18n.t('quests.darkFrostTotems.bubble'),
        lore: i18n.t('quests.darkFrostTotems.lore'),
        npcQuote: i18n.t('quests.darkFrostTotems.quote'),
        objective: {
          summary: i18n.t('quests.darkFrostTotems.summary'),
          steps: [
            { id: 'talk_hermit', desc: i18n.t('quests.darkFrostTotems.step.talkHermit'), done: false },
            { id: 'purify_totems', desc: i18n.t('quests.darkFrostTotems.step.purifyTotems'), done: false },
            { id: 'report_hermit', desc: i18n.t('quests.darkFrostTotems.step.reportHermit'), done: false }
          ]
        },
        rewards: {
          gold: 280,
          exp: 200,
          items: [
            { id: 'mat_wool', name: i18n.t('items.mat_wool.name'), qty: 3, kind: 'material', rarity: 'rare', desc: i18n.t('items.mat_wool.description') },
            { id: 'mat_frost_crystal', name: i18n.t('items.mat_frost_crystal.name'), qty: 1, kind: 'material', rarity: 'mystic', desc: i18n.t('items.mat_frost_crystal.description') }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_fallen_stardust: {
        id: 'quest_fallen_stardust',
        title: i18n.t('quests.fallenStardust.title'),
        category: 'Secundaria',
        giver: {
          name: i18n.t('quests.npc.astralAstrologer'),
          title: i18n.t('quests.fallenStardust.giverTitle'),
          avatar: './assets/portraits/sapidae-f-b.png',
          model: 'sapidae-f-b'
        },
        zoneCoords: [1, 2],
        bubbleQuote: i18n.t('quests.fallenStardust.bubble'),
        lore: i18n.t('quests.fallenStardust.lore'),
        npcQuote: i18n.t('quests.fallenStardust.quote'),
        objective: {
          summary: i18n.t('quests.fallenStardust.summary'),
          steps: [
            { id: 'talk_astrologer', desc: i18n.t('quests.fallenStardust.step.talkAstrologer'), done: false },
            { id: 'gather_stardust', desc: i18n.t('quests.fallenStardust.step.gatherStardust'), done: false },
            { id: 'deliver_stardust', desc: i18n.t('quests.fallenStardust.step.deliverStardust'), done: false }
          ]
        },
        rewards: {
          gold: 320,
          exp: 240,
          items: [
            { id: 'mat_moon_flower', name: i18n.t('items.mat_moon_flower.name'), qty: 3, kind: 'material', rarity: 'epic', desc: i18n.t('items.mat_moon_flower.description') },
            { id: 'mat_astral_dust', name: i18n.t('items.mat_astral_dust.name'), qty: 1, kind: 'material', rarity: 'mystic', desc: i18n.t('items.mat_astral_dust.description') }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_shadow_mirror: {
        id: 'quest_shadow_mirror',
        title: i18n.t('quests.shadowMirror.title'),
        category: 'Secundaria',
        giver: {
          name: i18n.t('quests.npc.spiritualShaman'),
          title: i18n.t('quests.shadowMirror.giverTitle'),
          avatar: './assets/portraits/sapidae-f-e.png',
          model: 'sapidae-f-e'
        },
        zoneCoords: [1, 3],
        bubbleQuote: i18n.t('quests.shadowMirror.bubble'),
        lore: i18n.t('quests.shadowMirror.lore'),
        npcQuote: i18n.t('quests.shadowMirror.quote'),
        objective: {
          summary: i18n.t('quests.shadowMirror.summary'),
          steps: [
            { id: 'talk_shaman', desc: i18n.t('quests.shadowMirror.step.talkShaman'), done: false },
            { id: 'defeat_shadow', desc: i18n.t('quests.shadowMirror.step.defeatShadow'), done: false },
            { id: 'report_shaman', desc: i18n.t('quests.shadowMirror.step.reportShaman'), done: false }
          ]
        },
        rewards: {
          gold: 360,
          exp: 280,
          items: [
            { id: 'mat_druid_branch', name: i18n.t('items.mat_druid_branch.name'), qty: 3, kind: 'material', rarity: 'epic', desc: i18n.t('items.mat_druid_branch.description') },
            { id: 'mat_druid_staff', name: i18n.t('items.mat_druid_staff.name'), qty: 2, kind: 'material', rarity: 'epic', desc: i18n.t('items.mat_druid_staff.description') }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_forgotten_miner_relic: {
        id: 'quest_forgotten_miner_relic',
        title: i18n.t('quests.trippRelic.title'),
        category: 'Secundaria',
        giver: {
          name: 'Tripp',
          title: i18n.t('quests.trippRelic.giverTitle'),
          avatar: './assets/portraits/tripp.png',
          model: 'tripp'
        },
        zoneCoords: [2, 3],
        bubbleQuote: i18n.t('quests.trippRelic.bubble'),
        lore: i18n.t('quests.trippRelic.lore'),
        npcQuote: i18n.t('quests.trippRelic.quote'),
        objective: {
          summary: i18n.t('quests.trippRelic.summary'),
          steps: [
            { id: 'talk_miner', desc: i18n.t('quests.trippRelic.step.talkMiner'), done: false },
            { id: 'find_golden_pickaxe', desc: i18n.t('quests.trippRelic.step.findGoldenPickaxe'), done: false },
            { id: 'return_relic', desc: i18n.t('quests.trippRelic.step.returnRelic'), done: false }
          ]
        },
        rewards: {
          gold: 500,
          exp: 350,
          items: [
            { id: 'mat_amber_atia', name: i18n.t('items.mat_amber_atia.name'), qty: 2, kind: 'material', rarity: 'mystic', desc: i18n.t('items.mat_amber_atia.description') },
            { id: 'mat_lunar_shard', name: i18n.t('items.mat_lunar_shard.name'), qty: 1, kind: 'material', rarity: 'mystic', desc: i18n.t('items.mat_lunar_shard.description') }
          ]
        },
        status: 'available',
        rewardClaimed: false
      }
    };
  }

  setEquipmentManager(em) {
    this.equipmentManager = em;
  }

  onQuestUpdated(fn) {
    this.listeners.push(fn);
  }

  _notify() {
    this.listeners.forEach(fn => {
      try { fn(this); } catch (e) { console.error(e); }
    });
  }

  getAllQuests() {
    return Object.values(this.quests);
  }

  getActiveQuests() {
    return Object.values(this.quests).filter(q => q.status === 'active' || q.status === 'ready_to_turn_in');
  }

  getCompletedQuests() {
    return Object.values(this.quests).filter(q => q.status === 'completed');
  }

  /** {heroName}: the player's Sapidae (same name the dialogs use). */
  getHeroName() {
    const ds = this.dialogSystem || (typeof window !== 'undefined' && window.overworldManager && window.overworldManager.dialogSystem);
    if (ds && ds.activeHero && ds.activeHero.name) return ds.activeHero.name;
    const p = typeof window !== 'undefined' && window.overworldManager && window.overworldManager.player;
    return (p && p.name) || i18n.t('quests.heroFallback');
  }

  /** {axieName}: main Axie of the squad (slot 1). */
  getAxieName() {
    const em = this.equipmentManager;
    const id = em && typeof em.getSquad === 'function' ? em.getSquad()[1] : null;
    return (id && em.heroesBase && em.heroesBase[id] && em.heroesBase[id].name) || i18n.t('quests.axieFallback');
  }

  _formatText(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/{heroName}/g, this.getHeroName()).replace(/{axieName}/g, this.getAxieName());
  }

  getQuest(questId) {
    const q = this.quests[questId];
    if (!q) return null;
    return {
      ...q,
      npcQuote: this._formatText(q.npcQuote),
      objective: {
        ...q.objective,
        summary: this._formatText(q.objective?.summary),
        steps: (q.objective?.steps || []).map(s => ({
          ...s,
          desc: this._formatText(s.desc)
        }))
      }
    };
  }

  isStepCompleted(questId, stepId) {
    const q = this.quests[questId];
    if (!q || !q.objective || !q.objective.steps) return false;
    const step = q.objective.steps.find(s => s.id === stepId);
    return Boolean(step && step.done);
  }

  isMainQuestUnlocked(questId) {
    const quest = this.quests[questId];
    if (!quest || quest.category !== 'Principal') return true;
    if (quest.order === 1) return true;
    const prevQuest = Object.values(this.quests).find(
      q => q.category === 'Principal' && q.order === quest.order - 1
    );
    return prevQuest ? prevQuest.status === 'completed' : false;
  }

  activateQuest(questId) {
    const quest = this.quests[questId];
    if (!quest || quest.status === 'completed' || quest.status === 'ready_to_turn_in') return;

    if (quest.category === 'Principal' && !this.isMainQuestUnlocked(questId)) {
      console.warn(`[QuestManager] Cannot activate main quest "${quest.title}" (${questId}) because previous main quest is not completed.`);
      return;
    }

    quest.status = 'active';
    this._notify();
  }

  advanceStep(questId, stepId, status = true) {
    const quest = this.quests[questId];
    if (!quest) return;

    // Strict linearity: Steps can ONLY advance if the quest is actively underway or ready to turn in
    if (quest.status !== 'active' && quest.status !== 'ready_to_turn_in') return;

    // Extra safeguard for main quests: Previous chapter must be completed
    if (quest.category === 'Principal' && !this.isMainQuestUnlocked(questId)) return;

    const step = quest.objective.steps.find(s => s.id === stepId || (stepId === 'defeat_slimes' && s.id === 'defeat_slime'));
    if (step) {
      step.done = status;
    }

    // Automatic quest item rewards during step progress
    if (status && this.equipmentManager && Array.isArray(this.equipmentManager.inventory)) {
      const stepItemMap = {
        'quest_lost_mail:find_mail': 'postman_letters',
        'quest_forest_elixir:gather_moss': 'luminous_moss',
        'quest_nomad_steel:gather_ores': 'hardened_ore',
        'quest_blizzard_stew:gather_frost_mushrooms': 'frost_mushrooms',
        'quest_fallen_stardust:gather_stardust': 'fallen_stardust',
        'quest_forgotten_miner_relic:find_golden_pickaxe': 'golden_pickaxe'
      };
      const key = `${questId}:${stepId}`;
      const qItem = stepItemMap[key];
      if (qItem && !this.equipmentManager.inventory.includes(qItem)) {
        this.equipmentManager.inventory.push(qItem);
      }
    }

    // Auto-update status when all steps are completed
    const allStepsDone = quest.objective.steps.every(s => s.done);
    if (allStepsDone && quest.status !== 'completed') {
      if (questId === 'quest_blizzard_core') {
        this.completeQuest(questId);
        return;
      }
      quest.status = 'ready_to_turn_in';
    }

    this._notify();
  }

  claimRewards(questId) {
    const quest = this.quests[questId];
    if (!quest || quest.rewardClaimed) return null;

    quest.rewardClaimed = true;

    const deliveredRewards = {
      gold: quest.rewards.gold || 0,
      exp: quest.rewards.exp || 0,
      items: [],
      recruits: quest.rewards.recruits || []
    };

    if (this.equipmentManager && quest.rewards.gold && quest.rewards.gold > 0) {
      this.equipmentManager.addGold(quest.rewards.gold);
    }

    if (this.equipmentManager && quest.rewards.items && quest.rewards.items.length > 0) {
      quest.rewards.items.forEach(rewardItem => {
        // Materiales (20-oct): van a la bolsa de la Forja con su cantidad
        if (isMaterial(rewardItem.id)) {
          ForgeService.addMats(rewardItem.id, rewardItem.qty || 1, false);
          deliveredRewards.items.push(rewardItem);
          return;
        }
        const isEquipped = Object.values(this.equipmentManager.equipped || {}).some(
          heroSlots => heroSlots && Object.values(heroSlots).includes(rewardItem.id)
        );
        const inInventory = (this.equipmentManager.inventory || []).includes(rewardItem.id);
        if (!inInventory && !isEquipped) {
          this.equipmentManager.inventory.push(rewardItem.id);
        }
        deliveredRewards.items.push(rewardItem);
      });
    }

    if (this.equipmentManager && quest.rewards.recruits && quest.rewards.recruits.length > 0) {
      quest.rewards.recruits.forEach(recruitId => {
        this.equipmentManager.unlockHero(recruitId);
      });
    }

    if (this.equipmentManager && quest.rewards.exp && quest.rewards.exp > 0) {
      const activeHero = (this.equipmentManager.unlockedHeroes && this.equipmentManager.unlockedHeroes[0]) || 'kotaro';
      this.equipmentManager.addExpToSquad(activeHero, quest.rewards.exp);
    }

    this._notify();
    return deliveredRewards;
  }

  completeQuest(questId) {
    const quest = this.quests[questId];
    if (!quest) return null;

    if (quest.status === 'completed') {
      return { success: false, reason: 'already_completed' };
    }

    if (quest.status === 'locked') {
      console.warn(`[QuestManager] Cannot complete locked quest: ${questId}`);
      return { success: false, reason: 'quest_locked' };
    }

    if (quest.category === 'Principal' && !this.isMainQuestUnlocked(questId)) {
      console.warn(`[QuestManager] Cannot complete main quest ${questId} without finishing previous chapter.`);
      return { success: false, reason: 'prerequisite_not_completed' };
    }

    quest.status = 'completed';

    // Mark all steps done
    quest.objective.steps.forEach(s => s.done = true);

    // Deliver rewards
    let deliveredRewards = null;
    if (!quest.rewardClaimed) {
      deliveredRewards = this.claimRewards(questId);
    } else {
      deliveredRewards = {
        gold: 0,
        exp: 0,
        items: [],
        recruits: []
      };
    }

    // Remove temporary quest items when quest is completed and turned in
    if (this.equipmentManager && Array.isArray(this.equipmentManager.inventory)) {
      const questItemToRemove = {
        quest_lost_mail: 'postman_letters',
        quest_forest_elixir: 'luminous_moss',
        quest_nomad_steel: 'hardened_ore',
        quest_blizzard_stew: 'frost_mushrooms',
        quest_fallen_stardust: 'fallen_stardust',
        quest_forgotten_miner_relic: 'golden_pickaxe'
      }[questId];
      if (questItemToRemove) {
        const idx = this.equipmentManager.inventory.indexOf(questItemToRemove);
        if (idx !== -1) this.equipmentManager.inventory.splice(idx, 1);
      }
    }

    // LINEAR PROGRESSION: Auto-unlock next main story quest!
    const nextMainQuestMap = {
      quest_slime_purification: 'quest_prove_ferocity',
      quest_prove_ferocity: 'quest_hostile_sands',
      quest_hostile_sands: 'quest_hunt_beaked_chimera',
      quest_hunt_beaked_chimera: 'quest_frozen_seed',
      quest_frozen_seed: 'quest_blizzard_core',
      quest_blizzard_core: 'quest_astral_void_echoes',
      quest_astral_void_echoes: 'quest_forbidden_resonance',
      quest_forbidden_resonance: 'quest_sulfur_threshold',
      quest_sulfur_threshold: 'quest_primeval_purification'
    };

    const nextQuestId = nextMainQuestMap[questId];
    if (nextQuestId && this.quests[nextQuestId]) {
      this.quests[nextQuestId].status = 'active';
      this.trackedQuestId = nextQuestId;
      this.trackingOff = false; // un nuevo capítulo vuelve a activar el seguimiento
      console.log(`[QuestManager] Main quest unlocked and tracked: ${this.quests[nextQuestId].title}`);
    }

    if (this.audio && typeof this.audio.playVictoryFanfare === 'function') {
      this.audio.playVictoryFanfare();
    }

    this._notify();

    return {
      success: true,
      quest,
      rewards: deliveredRewards
    };
  }

  getTrackedQuest() {
    if (this.trackingOff) return null;
    if (this.trackedQuestId) {
      const q = this.quests[this.trackedQuestId];
      if (q && (q.status === 'active' || q.status === 'ready_to_turn_in')) {
        return q;
      }
    }

    const mainQuestIds = [
      'quest_slime_purification',
      'quest_prove_ferocity',
      'quest_hostile_sands',
      'quest_hunt_beaked_chimera',
      'quest_frozen_seed',
      'quest_blizzard_core',
      'quest_astral_void_echoes',
      'quest_forbidden_resonance',
      'quest_sulfur_threshold',
      'quest_primeval_purification'
    ];

    for (const qId of mainQuestIds) {
      const q = this.quests[qId];
      if (q && (q.status === 'active' || q.status === 'ready_to_turn_in')) {
        return q;
      }
    }

    // Secondary fallback
    const activeSide = Object.values(this.quests).find(
      q => q.category === 'Secundaria' && (q.status === 'active' || q.status === 'ready_to_turn_in')
    );
    if (activeSide) return activeSide;

    return null;
  }

  /** Libro de misiones: «Seguir» elige la misión; pulsar «Siguiendo» en la misión seguida desactiva el seguimiento. */
  setTrackedQuest(questId) {
    if (!this.trackingOff && this.getTrackedQuest()?.id === questId) {
      if (!this.canDisableTracking()) return;
      this.trackingOff = true;
      this.trackedQuestId = null;
    } else if (this.quests[questId]) {
      this.trackingOff = false;
      this.trackedQuestId = questId;
    }
    this._notify();
  }

  isTrackingOff() { return this.trackingOff; }

  /** Durante el tutorial del Dojo el seguimiento no se puede desactivar (guía al jugador). */
  canDisableTracking() {
    const tut = this.quests.quest_slime_purification;
    return !(tut && tut.status !== 'completed');
  }

  getNavigationTarget(curGx, curGy, playerPos = { x: 0, z: 0 }, currentMapDef = null) {
    const quest = this.getTrackedQuest();
    if (!quest) return null;

    let tarGx = quest.zoneCoords ? quest.zoneCoords[0] : 3;
    let tarGy = quest.zoneCoords ? quest.zoneCoords[1] : 3;

    if (quest.status === 'ready_to_turn_in' && quest.giver && quest.giver.zoneCoords) {
      tarGx = quest.giver.zoneCoords[0];
      tarGy = quest.giver.zoneCoords[1];
    }

    const pendingStep = quest.objective.steps ? quest.objective.steps.find(s => !s.done) : null;
    if (pendingStep && pendingStep.zoneCoords) {
      tarGx = pendingStep.zoneCoords[0];
      tarGy = pendingStep.zoneCoords[1];
    }

    // Retired corner zones live inside their island: compare islands, not grid cells
    const logicalTarKey = `${tarGx}_${tarGy}`;
    const curIslandKey = canonicalZoneKey(`${curGx}_${curGy}`);
    const tarIslandKey = canonicalZoneKey(logicalTarKey);
    const isCurrentZone = curIslandKey === tarIslandKey;
    const distanceZones = isCurrentZone ? 0 : Math.abs(tarGx - curGx) + Math.abs(tarGy - curGy);

    if (isCurrentZone) {
      let targetWorldPos = null;
      let targetName = quest.title;

      if (currentMapDef) {
        const tutNav = quest.id === 'quest_slime_purification' && typeof window !== 'undefined' ? window.lunakaiTutorial?.director?.navTarget?.() : null;
        if (tutNav) {
          targetWorldPos = { x: tutNav.x, z: tutNav.z };
          targetName = tutNav.name;
        } else if (quest.id === 'quest_slime_purification') {
          if (!pendingStep || pendingStep.id === 'defeat_slime') {
            targetWorldPos = { x: -4.0, z: 2.0 };
            targetName = i18n.t('enemies.arch.slime.name');
          } else {
            const paladillNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'paladill') : null;
            if (paladillNpc) {
              targetWorldPos = { x: paladillNpc.position.x, z: paladillNpc.position.z };
            } else {
              targetWorldPos = { x: -90.3, z: 63.3 };
            }
            targetName = i18n.t('quests.npc.paladill');
          }
        } else if (quest.id === 'quest_hunt_beaked_chimera') {
          if (pendingStep && pendingStep.id === 'report_hunt') {
            const sentinelNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'sentinel') : null;
            targetWorldPos = sentinelNpc ? { x: sentinelNpc.position.x, z: sentinelNpc.position.z } : { x: 62.0, z: -28.5 };
            targetName = i18n.t('quests.npc.desertSentinel');
          } else {
            targetWorldPos = { x: -40.0, z: -8.0 };
            targetName = i18n.t('enemies.alphaBeakedChimera');
          }
        } else if (quest.id === 'quest_nomad_steel') {
          if (pendingStep && pendingStep.id === 'gather_ores') {
            targetWorldPos = { x: 64.0, z: 32.0 };
            targetName = i18n.t('enemies.armoredChimera');
          } else {
            const barukNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'blacksmith') : null;
            targetWorldPos = barukNpc ? { x: barukNpc.position.x, z: barukNpc.position.z } : { x: 44.5, z: 49.5 };
            targetName = i18n.t('quests.npc.blacksmithBaruk');
          }
        } else if (quest.id === 'quest_blizzard_core') {
          targetWorldPos = mergedBattleAnchor('1_1') || { x: -64.0, z: -72.0 };
          targetName = i18n.t('enemies.armoredPolarGolem');
        } else if (quest.id === 'quest_frozen_seed') {
          const pomoNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'pomodoro_npc' || n.id === 'pomodoro') : null;
          targetWorldPos = pomoNpc ? { x: pomoNpc.position.x, z: pomoNpc.position.z } : { x: 5.8, z: 23.2 };
          targetName = 'Pomodoro';
        } else if (quest.id === 'quest_forbidden_resonance') {
          if (pendingStep && pendingStep.id === 'defeat_sapidae') {
            targetWorldPos = mergedBattleAnchor('1_3') || { x: -80.0, z: 16.0 };
            targetName = i18n.t('enemies.arcaneChimeraPack');
          } else {
            const oracleNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'oracle') : null;
            targetWorldPos = oracleNpc ? { x: oracleNpc.position.x, z: oracleNpc.position.z } : { x: 34.0, z: -36.0 };
            targetName = i18n.t('quests.npc.astralOracle');
          }
        } else if (quest.id === 'quest_astral_void_echoes') {
          if (pendingStep && pendingStep.id === 'talk_oracle') {
            const oracleNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'oracle') : null;
            targetWorldPos = oracleNpc ? { x: oracleNpc.position.x, z: oracleNpc.position.z } : { x: 34.0, z: -36.0 };
            targetName = i18n.t('quests.npc.astralOracle');
          } else {
            const sageNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'polar_sage') : null;
            targetWorldPos = sageNpc ? { x: sageNpc.position.x, z: sageNpc.position.z } : { x: -8.3, z: 17.3 };
            targetName = i18n.t('quests.npc.astralSage');
          }
        } else if (quest.id === 'quest_primeval_purification') {
          if (pendingStep && (pendingStep.id === 'enter_catacombs' || pendingStep.id === 'defeat_crypt_lord')) {
            targetWorldPos = mergedBattleAnchor('3_3') || { x: 0.0, z: 104.0 };
            targetName = i18n.t('enemies.cryptOverlord');
          } else {
            const atiaNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'atia_spirit') : null;
            targetWorldPos = atiaNpc ? { x: atiaNpc.position.x, z: atiaNpc.position.z } : { x: 0.0, z: 92.0 }; // centro del Santuario del Origen
            targetName = i18n.t('quests.npc.spiritOfAtia');
          }
        } else if (quest.id === 'quest_sulfur_threshold') {
          // Hito 74: primero los Guardianes de Genesis (avenida del este); después, de vuelta con Kotaro
          if (pendingStep && (pendingStep.id === 'defeat_sulfur_guards' || pendingStep.id === 'reach_threshold')) {
            targetWorldPos = questMobPos('mob_genesis_guardians', '2_3') || { x: 62.0, z: 26.0 };
            targetName = i18n.t('enemies.genesisGuardians');
          } else {
            const kotaroNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'sulfur_guard') : null;
            targetWorldPos = kotaroNpc ? { x: kotaroNpc.position.x, z: kotaroNpc.position.z } : { x: 15.0, z: 4.2 };
            targetName = 'Kotaro';
          }
        } else if (quest.id === 'quest_forgotten_miner_relic') {
          // Hito 74: hablar con Tripp → Guardián de Cristal en la cantera → devolver el pico a Tripp
          if (pendingStep && pendingStep.id === 'find_golden_pickaxe') {
            targetWorldPos = questMobPos('mob_crystal_guardian', '2_3') || { x: -58.0, z: -72.0 };
            targetName = i18n.t('enemies.crystalGuardian');
          } else {
            const trippNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'miner') : null;
            targetWorldPos = trippNpc ? { x: trippNpc.position.x, z: trippNpc.position.z } : { x: -50.0, z: -50.0 };
            targetName = 'Tripp';
          }
        } else if (quest.id === 'quest_forest_elixir' && pendingStep && pendingStep.id === 'gather_moss') {
          targetWorldPos = { x: 11.0, z: -6.5 };
          targetName = i18n.t('quests.nav.mossSprout');
        } else if (quest.id === 'quest_blizzard_stew' && pendingStep && pendingStep.id === 'gather_frost_mushrooms') {
          targetWorldPos = { x: -16.0, z: 12.0 };
          targetName = i18n.t('quests.nav.polarMushroom');
        } else if (quest.id === 'quest_fallen_stardust' && pendingStep && pendingStep.id === 'gather_stardust') {
          targetWorldPos = { x: -14.0, z: -12.0 };
          targetName = i18n.t('quests.nav.stardust');
        } else if (quest.id === 'quest_dark_frost_totems' && pendingStep && pendingStep.id === 'purify_totems') {
          targetWorldPos = mergedBattleAnchor('1_1') || { x: -64.0, z: -72.0 };
          targetName = i18n.t('enemies.darkFrostGuardians');
        } else if (quest.id === 'quest_world_cartographer') {
          if (pendingStep && pendingStep.id === 'visit_biomes') {
            targetWorldPos = { x: 43.0, z: 132.2 };
            targetName = i18n.t('quests.nav.kawaFerryman');
          } else {
            const xiaNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'cartographer') : null;
            targetWorldPos = xiaNpc ? { x: xiaNpc.position.x, z: xiaNpc.position.z } : { x: -97.3, z: 21.3 };
            targetName = i18n.t('quests.nav.xiaCartographer');
          }
        } else if (currentMapDef.npcs) {
          const matchNpc = currentMapDef.npcs.find(n => n.questId === quest.id || n.id === quest.giver?.id || (quest.giver?.id && n.id?.startsWith(quest.giver.id)));
          if (matchNpc) {
            targetWorldPos = { x: matchNpc.position.x, z: matchNpc.position.z };
            targetName = matchNpc.name || quest.giver?.name;
          }
        }
      }

      if (!targetWorldPos) {
        targetWorldPos = { x: 0, z: 0 };
      }

      return {
        quest,
        tarGx,
        tarGy,
        title: quest.title,
        stepDesc: pendingStep ? pendingStep.desc : quest.objective.summary,
        isCurrentZone: true,
        distanceZones: 0,
        portalDirection: null,
        logicalZone: MERGED_ZONES[logicalTarKey] ? logicalTarKey : null,
        targetWorldPos,
        targetName,
        directionText: i18n.t('quests.nav.inTargetZone', { x: tarGx, y: tarGy })
      };
    }

    // Another island: the way there is Pomodoro the ferryman on this island's beach
    const curDock = FERRY_DOCKS[`zone_${curIslandKey}`];
    if (curDock) {
      const islandName = ISLAND_NAMES[tarIslandKey] || `[${tarGx}, ${tarGy}]`;
      return {
        quest,
        tarGx,
        tarGy,
        title: quest.title,
        stepDesc: pendingStep ? pendingStep.desc : quest.objective.summary,
        isCurrentZone: false,
        distanceZones,
        portalDirection: null,
        targetWorldPos: { x: curDock.npc.x, z: curDock.npc.z },
        targetName: i18n.t('quests.nav.kawaFerryman'),
        directionText: i18n.t('quests.nav.talkToFerryman', { island: islandName })
      };
    }

    // Calculate grid delta
    const deltaX = tarGx - curGx;
    const deltaY = tarGy - curGy;

    let portalDirection = null;
    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      if (deltaX > 0) portalDirection = 'EAST';
      else if (deltaX < 0) portalDirection = 'WEST';
      else if (deltaY > 0) portalDirection = 'SOUTH';
      else if (deltaY < 0) portalDirection = 'NORTH';
    } else {
      if (deltaY > 0) portalDirection = 'SOUTH';
      else if (deltaY < 0) portalDirection = 'NORTH';
      else if (deltaX > 0) portalDirection = 'EAST';
      else if (deltaX < 0) portalDirection = 'WEST';
    }

    const PORTAL_POSITIONS = {
      NORTH: { x: 0, z: -38.0 },
      SOUTH: { x: 0, z: 38.0 },
      WEST: { x: -38.0, z: 0 },
      EAST: { x: 38.0, z: 0 }
    };

    const targetWorldPos = PORTAL_POSITIONS[portalDirection] || { x: 0, z: 0 };
    const dirNames = {
      NORTH: i18n.t('quests.nav.dirNorth'),
      SOUTH: i18n.t('quests.nav.dirSouth'),
      EAST: i18n.t('quests.nav.dirEast'),
      WEST: i18n.t('quests.nav.dirWest')
    };
    const dirLabel = dirNames[portalDirection] || portalDirection;

    return {
      quest,
      tarGx,
      tarGy,
      title: quest.title,
      stepDesc: pendingStep ? pendingStep.desc : quest.objective.summary,
      isCurrentZone: false,
      distanceZones,
      portalDirection,
      targetWorldPos,
      targetName: i18n.t('quests.nav.exit', { dir: dirLabel }),
      directionText: i18n.t('quests.nav.nextExit', { dir: dirLabel, x: tarGx, y: tarGy })
    };
  }

  getActiveHUDTrackerText() {
    const q = this.getTrackedQuest();
    if (q) {
      const prefix = q.category === 'Principal' ? '★' : '◆';
      if (q.status === 'ready_to_turn_in') {
        return `${prefix} ${q.title}: ${i18n.t('quests.hud.readyToTurnIn', { name: q.giver.name })}`;
      }
      const pendingStep = q.objective.steps.find(s => !s.done);
      if (pendingStep) {
        return `${prefix} ${q.title}: ${this._formatText(pendingStep.desc)}`;
      }
      return `${prefix} ${q.title}: ${i18n.t('quests.hud.exploreCoords', { coords: q.zoneCoords ? q.zoneCoords.join(', ') : '?' })}`;
    }

    return i18n.t('quests.hud.exploreLunacia');
  }

  exportSaveData() {
    const questsData = {};
    for (const [id, q] of Object.entries(this.quests)) {
      questsData[id] = {
        status: q.status,
        rewardClaimed: Boolean(q.rewardClaimed),
        steps: (q.objective?.steps || []).map(s => ({ id: s.id, done: Boolean(s.done) }))
      };
    }
    return {
      trackedQuestId: this.trackedQuestId,
      trackingOff: this.trackingOff,
      quests: questsData
    };
  }

  loadSaveData(saveData, heroLevel = 1) {
    if (saveData && saveData.quests) {
      if (saveData.trackedQuestId !== undefined) {
        this.trackedQuestId = saveData.trackedQuestId;
      }
      this.trackingOff = Boolean(saveData.trackingOff); // partidas antiguas: seguimiento activado
      for (const [id, savedQ] of Object.entries(saveData.quests)) {
        const q = this.quests[id];
        if (q) {
          if (savedQ.status) q.status = savedQ.status;
          if (savedQ.rewardClaimed !== undefined) q.rewardClaimed = Boolean(savedQ.rewardClaimed);
          if (Array.isArray(savedQ.steps) && q.objective && Array.isArray(q.objective.steps)) {
            savedQ.steps.forEach(savedStep => {
              const step = q.objective.steps.find(s => s.id === savedStep.id);
              if (step) step.done = Boolean(savedStep.done);
            });
          }
        }
      }
      this._notify();
      return;
    }

    // Defensive migration for legacy saves that lacked questProgress
    if (heroLevel > 1) {
      const completedMainQuests = [];
      if (heroLevel >= 2) completedMainQuests.push('quest_slime_purification');
      if (heroLevel >= 3) completedMainQuests.push('quest_prove_ferocity');
      if (heroLevel >= 4) completedMainQuests.push('quest_hostile_sands');
      if (heroLevel >= 5) completedMainQuests.push('quest_hunt_beaked_chimera');
      if (heroLevel >= 6) completedMainQuests.push('quest_frozen_seed');
      if (heroLevel >= 7) completedMainQuests.push('quest_blizzard_core');
      if (heroLevel >= 8) completedMainQuests.push('quest_astral_void_echoes');
      if (heroLevel >= 9) completedMainQuests.push('quest_forbidden_resonance');

      completedMainQuests.forEach(qId => {
        const q = this.quests[qId];
        if (q) {
          q.status = 'completed';
          q.rewardClaimed = true;
          if (q.objective?.steps) {
            q.objective.steps.forEach(s => { s.done = true; });
          }
        }
      });

      if (heroLevel >= 9) {
        if (this.quests.quest_sulfur_threshold) {
          this.quests.quest_sulfur_threshold.status = 'active';
          this.trackedQuestId = 'quest_sulfur_threshold';
        }
      } else if (heroLevel >= 8) {
        if (this.quests.quest_forbidden_resonance) {
          this.quests.quest_forbidden_resonance.status = 'active';
          this.trackedQuestId = 'quest_forbidden_resonance';
        }
      } else if (heroLevel >= 7) {
        if (this.quests.quest_astral_void_echoes) {
          this.quests.quest_astral_void_echoes.status = 'active';
          this.trackedQuestId = 'quest_astral_void_echoes';
        }
      } else if (heroLevel >= 6) {
        if (this.quests.quest_blizzard_core) {
          this.quests.quest_blizzard_core.status = 'active';
          this.trackedQuestId = 'quest_blizzard_core';
        }
      } else if (heroLevel >= 5) {
        if (this.quests.quest_frozen_seed) {
          this.quests.quest_frozen_seed.status = 'active';
          this.trackedQuestId = 'quest_frozen_seed';
        }
      } else if (heroLevel >= 4) {
        if (this.quests.quest_hunt_beaked_chimera) {
          this.quests.quest_hunt_beaked_chimera.status = 'active';
          this.trackedQuestId = 'quest_hunt_beaked_chimera';
        }
      } else if (heroLevel >= 3) {
        if (this.quests.quest_hostile_sands) {
          this.quests.quest_hostile_sands.status = 'active';
          this.trackedQuestId = 'quest_hostile_sands';
        }
      } else if (heroLevel >= 2) {
        if (this.quests.quest_prove_ferocity) {
          this.quests.quest_prove_ferocity.status = 'active';
          this.trackedQuestId = 'quest_prove_ferocity';
        }
      }
      this._notify();
    }
  }
}

