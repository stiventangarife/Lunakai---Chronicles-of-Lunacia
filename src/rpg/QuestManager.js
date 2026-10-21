// QuestManager.js - Centralized Quest System for Lunacia Adventures
import { ForgeService } from './ForgeService.js';
import { isMaterial } from './LootService.js';
import { canonicalZoneKey, MERGED_ZONES, FERRY_DOCKS, ISLAND_NAMES, mergedBattleAnchor } from './world/islands/IslandWorldLayout.js';
export class QuestManager {
  constructor(equipmentManager = null, audioSystem = null) {
    this.equipmentManager = equipmentManager;
    this.audio = audioSystem;
    this.listeners = [];
    this.trackedQuestId = null;

    // Master Quests Database (10 Main Linear Quests + 10 Side Quests)
    this.quests = {
      // ==========================================
      // 10 MISIONES PRINCIPALES (CAMPAÑA LINEAL)
      // ==========================================
      quest_slime_purification: {
        id: 'quest_slime_purification',
        title: 'El aprendiz del Dojo',
        category: 'Principal',
        order: 1,
        giver: {
          name: 'Maestro Paladill',
          title: 'Mentor del Dojo',
          avatar: './assets/portraits/paladill.png',
          model: 'paladill'
        },
        zoneCoords: [2, 2],
        lore: 'Las quimeras han llegado hasta el Dojo. El Maestro Paladill entrena a su nuevo aprendiz: combate, equipo, la Forja, el vínculo con su Axie y las runas.',
        npcQuote: 'Tú y tu Axie sois mi primera línea. ¡Ahora te toca a ti!',
        objective: {
          summary: 'Completa el entrenamiento del Maestro Paladill en el Dojo.',
          steps: [
            { id: 'defend_dojo', desc: 'Defiende el Dojo de las quimeras', done: false },
            { id: 'equip_sword', desc: 'Equipa la Espada de madera [I]', done: false },
            { id: 'duel_paladill', desc: 'Entrena con el Maestro Paladill', done: false },
            { id: 'evolve_sword', desc: 'Mejora tu espada en la Forja', done: false },
            { id: 'bond_axie', desc: 'Fortalece el vínculo con tu Axie', done: false },
            { id: 'equip_runes', desc: 'Equipa una runa y un charm [U]', done: false },
            { id: 'graduate', desc: 'Habla con Paladill para graduarte', done: false }
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
        title: 'Prove Your Ferocity',
        category: 'Principal',
        order: 2,
        giver: {
          name: 'Bing',
          title: 'Cheerful Savannah Pup',
          avatar: './assets/portraits/bing.png',
          model: 'bing'
        },
        zoneCoords: [3, 2],
        lore: 'Leaving the Dojo through the east gate towards the Eastern Savannah [3, 2], a cheerful Beast pup named Bing is cornered by fierce Chimeras that want his precious ice-cream cones. If you prove your courage and fight alongside him, his toy ball, his healing treats and his rallying barks will join your squad.',
        npcQuote: 'Woof! Careful, adventurer! Those beasts have razor-sharp claws and they want my ice cream! Fight with me and I\'ll keep everyone\'s spirits, and health, high!',
        objective: {
          summary: 'Travel to the eastern macro-zone [3, 2], help Bing repel the savannah monsters, and recruit him into your tactical squad.',
          steps: [
            { id: 'find_bing', desc: 'Locate Bing in the Eastern Savannah [3, 2]', done: false },
            { id: 'defend_bing', desc: 'Fight and purify the Chimeras surrounding him', done: false },
            { id: 'recruit_bing', desc: 'Talk to Bing and add his cheer to your squad [E]', done: false }
          ]
        },
        rewards: {
          gold: 200,
          exp: 150,
          recruits: ['bing'],
          items: [
            { id: 'composite_bow', name: 'Arco compuesto', slot: 'weapon', rarity: 'common', icon: './assets/equippable/composite_bow.webp', desc: 'Madera y cola de quimera: ligero y preciso.', stats: { damage: 7, initiative: 3 } }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_hostile_sands: {
        id: 'quest_hostile_sands',
        title: 'Hostile Sands',
        category: 'Principal',
        order: 3,
        giver: {
          name: 'Desert Sentinel',
          title: 'Savannah Dunes Watcher',
          avatar: './assets/portraits/kibo.png',
          model: 'kibo',
          zoneCoords: [3, 2]
        },
        zoneCoords: [3, 2],
        lore: 'The Savannah dunes blaze under a scorching sun. Bing warns that desert chimeras are faster and more aggressive. Cross the eastern border into [3, 2] and make contact with the Sentinel.',
        npcQuote: 'Welcome to the scorching sands of Lunacia! Sluggishness is punished with death here. Chimeras lurk in every dune.',
        objective: {
          summary: 'Advance into the Eastern Savannah at [3, 2], speak with the Sentinel, and secure the border outpost.',
          steps: [
            { id: 'cross_to_savannah', desc: 'Cross the portal into the Savannah at [3, 2]', done: false, zoneCoords: [3, 2] },
            { id: 'talk_sentinel', desc: 'Report to the Desert Sentinel [E]', done: false, zoneCoords: [3, 2] }
          ]
        },
        rewards: {
          gold: 250,
          exp: 200,
          items: [
            { id: 'beast_helmet', name: 'Yelmo bestial', slot: 'hat', rarity: 'common', icon: './assets/equippable/beast_helmet.webp', desc: 'Casco de cuero y hueso. El primer sombrero de todo aventurero.', stats: { hp: 15 } }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_hunt_beaked_chimera: {
        id: 'quest_hunt_beaked_chimera',
        title: 'Hunt of the Beaked Chimera',
        category: 'Principal',
        order: 4,
        giver: {
          name: 'Desert Sentinel',
          title: 'Dune Watcher',
          avatar: './assets/portraits/kibo.png',
          model: 'kibo',
          zoneCoords: [3, 2]
        },
        zoneCoords: [3, 2],
        lore: 'A flock of Beaked Chimeras led by an alpha male has cut off oasis supplies. To advance to the frozen north, we must first thin the beaked pack ruling the Savannah Island [3, 2].',
        npcQuote: 'If we want to advance to the frozen north, we must first decimate the beaked pack dominating the Savannah Island in [3, 2].',
        objective: {
          summary: 'Hunt the Beaked Chimera pack on Savannah Island [3, 2], and defeat their leader in tactical combat.',
          steps: [
            { id: 'reach_wastes', desc: 'Explore the Savannah canyon plateau [3, 2]', done: false, zoneCoords: [3, 2] },
            { id: 'defeat_beaked_alpha', desc: 'Purify the Beaked Chimera pack', done: false, zoneCoords: [3, 2] },
            { id: 'report_hunt', desc: 'Inform the Sentinel of the savannah\'s pacification [3, 2] [E]', done: false, zoneCoords: [3, 2] }
          ]
        },
        rewards: {
          gold: 300,
          exp: 250,
          items: [
            { id: 'wooden_buckler', name: 'Rodela de roble', slot: 'shield', rarity: 'common', icon: './assets/equippable/wooden_buckler.webp', desc: 'Escudo pequeño de roble con remaches de cobre.', stats: { hp: 18, shield: 15 } }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_frozen_seed: {
        id: 'quest_frozen_seed',
        title: 'The Frozen Seed',
        category: 'Principal',
        order: 5,
        giver: {
          name: 'Pomodoro',
          title: 'Leaf-Shell Guardian of Atia',
          avatar: './assets/portraits/pomodoro.png',
          model: 'pomodoro'
        },
        zoneCoords: [2, 1],
        lore: 'The northern arctic mountains endure a relentless blizzard. In the Glacial Peaks [2, 1], noble Pomodoro, a Bug cook who shelters under autumn leaves, fights alone with his trusty frying pan to protect a sacred sprout of the Atia Tree from Glacial Chimeras.',
        npcQuote: 'By the leaves of Atia! My sprout won\'t endure much more cold if those beasts keep attacking! Help me drive them out!',
        objective: {
          summary: 'Ascend to the Glacial Peaks at [2, 1], defeat the frozen creatures, and recruit Pomodoro as your squad\'s shield protector.',
          steps: [
            { id: 'reach_arctic', desc: 'Locate and speak with Pomodoro in the Glacial Peaks [2, 1]', done: false, zoneCoords: [2, 1] },
            { id: 'defend_pomodoro', desc: 'Defeat the Ice Chimeras in tactical combat', done: false, zoneCoords: [2, 1] },
            { id: 'recruit_pomodoro', desc: 'Speak with Pomodoro and add him to your team [E]', done: false, zoneCoords: [2, 1] }
          ]
        },
        rewards: {
          gold: 350,
          exp: 300,
          recruits: ['pomodoro'],
          items: [
            { id: 'mat_wool', name: 'Lana', qty: 3, kind: 'material', rarity: 'rare', desc: 'Abriga y acolcha. Va en armaduras, sombreros y empuñaduras.' },
            { id: 'mat_wood', name: 'Madera', qty: 3, kind: 'material', rarity: 'rare', desc: 'Tronco recio y fácil de trabajar. Lo pide cualquier evolución a Raro.' }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_blizzard_core: {
        id: 'quest_blizzard_core',
        title: 'Core of the Blizzard',
        category: 'Principal',
        order: 6,
        giver: {
          name: 'Pomodoro',
          title: 'Leaf-Shell Ally',
          avatar: './assets/portraits/pomodoro.png',
          model: 'pomodoro'
        },
        zoneCoords: [1, 1],
        lore: 'The blizzard ravaging the north is unnatural: an Armored Polar Golem in the Frost Valley [1, 1] fuels an ice vortex blocking passage to the arcane sanctuaries in the west.',
        npcQuote: 'I feel the ice vibrations through my leaves. If we destroy the Golem core in the Frost Valley [1, 1], the storm will cease and we can cross into the Astral Nebula [1, 2].',
        objective: {
          summary: 'Advance into the Valley of Eternal Frost at [1, 1], defeat the Armored Polar Golem, and dispel the blizzard barrier.',
          steps: [
            { id: 'reach_peaks', desc: 'Advance to the Valley of Eternal Frost [1, 1]', done: false, zoneCoords: [1, 1] },
            { id: 'defeat_golem', desc: 'Defeat the Armored Polar Golem in tactical combat', done: false, zoneCoords: [1, 1] }
          ]
        },
        rewards: {
          gold: 400,
          exp: 350,
          items: [
            { id: 'mat_wool', name: 'Lana', qty: 4, kind: 'material', rarity: 'rare', desc: 'Abriga y acolcha. Va en armaduras, sombreros y empuñaduras.' },
            { id: 'mat_frost_crystal', name: 'Cristal de escarcha', qty: 1, kind: 'material', rarity: 'mystic', desc: 'Guarda el frío dentro. Lo pide la evolución a Místico.' }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_astral_void_echoes: {
        id: 'quest_astral_void_echoes',
        title: 'Echoes of the Astral Void',
        category: 'Principal',
        order: 7,
        giver: {
          name: 'Astral Sage',
          title: 'Guardian of Ley Lines',
          avatar: './assets/portraits/sapidae-f-c.png',
          model: 'sapidae-f-c',
          zoneCoords: [1, 2]
        },
        zoneCoords: [1, 2],
        lore: 'As the blizzard ceases, gates to the Mystic biome open at [1, 2]. The Astral Sage indicates cosmic energies are desynchronized and urges you to consult the Astral Oracle.',
        npcQuote: 'The fabric of reality is fraying in the Astral Nebula [1, 2]. Seek the Cosmic Oracle before corruption consumes Lunacia\'s ether.',
        objective: {
          summary: 'Cross into the Astral Nebula at [1, 2] and speak with the Astral Oracle of Lunacia at [1, 3].',
          steps: [
            { id: 'enter_mystic', desc: 'Enter the Astral Nebula [1, 2]', done: false, zoneCoords: [1, 2] },
            { id: 'talk_oracle', desc: 'Meet with the Astral Oracle in the Sanctuary [1, 3] [E]', done: false, zoneCoords: [1, 3] }
          ]
        },
        rewards: {
          gold: 450,
          exp: 400,
          items: [
            { id: 'mat_druid_flower', name: 'Flor de druida', qty: 3, kind: 'material', rarity: 'epic', desc: 'Flor encantada que nunca se marchita.' },
            { id: 'mat_moon_flower', name: 'Flor lunar', qty: 2, kind: 'material', rarity: 'epic', desc: 'Solo abre de noche. Sus pétalos guardan un poco de luz de luna.' }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_forbidden_resonance: {
        id: 'quest_forbidden_resonance',
        title: 'The Forbidden Resonance',
        category: 'Principal',
        order: 8,
        giver: {
          name: 'Astral Oracle',
          title: 'Voice of the Constellations',
          avatar: './assets/portraits/sapidae-f-d.png',
          model: 'sapidae-f-d',
          zoneCoords: [1, 3]
        },
        zoneCoords: [1, 3],
        lore: 'In the Astral Void Sanctuary [1, 3], an Arcane Sapidae Chimera has awakened, releasing dark pulses that poison subterranean continental roots.',
        npcQuote: 'The void resonance intensifies! If that celestial beast completes its ritual, Lunacia will collapse. Use the synergy of your three heroes to purify it.',
        objective: {
          summary: 'Descend to [1, 3] in the Mystic realm, face the Arcane Sapidae Chimera, and neutralize its void pulse.',
          steps: [
            { id: 'reach_sanctuary', desc: 'Reach the Void Sanctuary [1, 3]', done: false, zoneCoords: [1, 3] },
            { id: 'defeat_sapidae', desc: 'Defeat the Arcane Sapidae Chimera in combat', done: false, zoneCoords: [1, 3] },
            { id: 'purify_resonance', desc: 'Inform the Oracle of the distortion\'s end [E]', done: false, zoneCoords: [1, 3] }
          ]
        },
        rewards: {
          gold: 500,
          exp: 450,
          items: [
            { id: 'mat_druid_staff', name: 'Bastón de druida', qty: 3, kind: 'material', rarity: 'epic', desc: 'Bastón tallado por las dríadas; conduce la magia del bosque.' },
            { id: 'mat_astral_dust', name: 'Polvo astral', qty: 1, kind: 'material', rarity: 'mystic', desc: 'Restos de estrellas caídas. Despierta la magia del equipo.' }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_sulfur_threshold: {
        id: 'quest_sulfur_threshold',
        title: 'The Genesis Threshold',
        category: 'Principal',
        order: 9,
        giver: {
          name: 'Kotaro',
          title: 'Threshold Guardian',
          avatar: './assets/portraits/kotaro.png',
          model: 'kotaro',
          zoneCoords: [2, 3]
        },
        zoneCoords: [2, 3],
        lore: 'At the Sanctuary Gate of Genesis [2, 3], Kotaro guards the seal of the Royal Gardens, the forbidden sanctuary reserved for the elite of trainers.',
        npcQuote: 'The time for the final pilgrimage has arrived. Cross the Sanctuary Gate of Genesis in [2, 3] and speak with Kotaro after overcoming the Genesis Wardens.',
        objective: {
          summary: 'March to the Royal Gardens of Genesis at [2, 3], defeat the ancient sanctuary wardens, and earn access to the Sanctum of Origin.',
          steps: [
            { id: 'reach_threshold', desc: 'Advance to the Sanctuary Gate of Genesis [2, 3]', done: false, zoneCoords: [2, 3] },
            { id: 'defeat_sulfur_guards', desc: 'Defeat the Genesis Wardens in combat', done: false, zoneCoords: [2, 3] }
          ]
        },
        rewards: {
          gold: 600,
          exp: 500,
          items: [
            { id: 'crimson_crypt_key', name: 'Crimson Crypt Key', slot: 'quest', rarity: 'mystic', icon: './assets/materials/misions/crimson_crypt_key.webp', desc: 'Key forged in elemental magma. Unlocks the arcane seal of the final Crypt Catacombs.', stats: {} }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_primeval_purification: {
        id: 'quest_primeval_purification',
        title: 'The Primeval Purification',
        category: 'Principal',
        order: 10,
        giver: {
          name: 'Spirit of Atia',
          title: 'Soul of the Great Tree',
          avatar: './assets/portraits/statue_atia.png',
          model: 'statue_atia',
          zoneCoords: [3, 3]
        },
        zoneCoords: [3, 3],
        lore: 'Deep within the Sanctum of Origin [3, 3] sleeps the Chimera Overlord, the source of all Lunacia\'s corruption. This is the definitive final battle for the world\'s fate.',
        npcQuote: '{heroName}, Bing, Pomodoro... your hearts beat in unison with the Atia Tree. Enter the Sanctum of Origin and restore peace once and for all.',
        objective: {
          summary: 'Enter the Sanctum of Origin [3, 3] with your complete squad, defeat the Overlord in tactical combat, and save Lunacia.',
          steps: [
            { id: 'enter_catacombs', desc: 'Enter the Sanctum of Origin [3, 3]', done: false, zoneCoords: [3, 3] },
            { id: 'defeat_crypt_lord', desc: 'Defeat the Chimera Overlord in combat', done: false, zoneCoords: [3, 3] },
            { id: 'restore_lunacia', desc: 'Consecrate victory alongside the Spirit of Atia [E]', done: false, zoneCoords: [3, 3] }
          ]
        },
        rewards: {
          gold: 1000,
          exp: 1000,
          items: [
            { id: 'mat_amber_atia', name: 'Ámbar de Atia', qty: 3, kind: 'material', rarity: 'mystic', desc: 'Savia del Gran Árbol endurecida durante siglos. El corazón de toda pieza Mística.' },
            { id: 'mat_lunar_shard', name: 'Esquirla lunar', qty: 1, kind: 'material', rarity: 'mystic', desc: 'Fragmento de la luna de Lunacia. Necesario para evolucionar a Místico.' }
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
        title: 'Cartographer of the 9 Regions',
        category: 'Secundaria',
        giver: {
          name: 'Xia',
          title: 'Imperial Explorer of Lunacia',
          avatar: './assets/portraits/xia.png',
          model: 'xia'
        },
        zoneCoords: [2, 2],
        bubbleQuote: 'Hey, traveler! Got a map handy?',
        lore: 'The continent of Lunacia is structured in a 9 macro-zone grid (3x3 quadrants). Each biome (Forest, Savannah, Arctic, Mystic, and Genesis) holds unique dangers and secrets.',
        npcQuote: 'A true duelist never travels blind! Learn to read the stars and the World Map [M] to recognize each of the 9 regions.',
        objective: {
          summary: 'Open the World Map with [M] and cross into a new biome to record the geography of Lunacia.',
          steps: [
            { id: 'open_map', desc: 'Consult the World Map by pressing [M]', done: false },
            { id: 'visit_biomes', desc: 'Travel to a different biome (Savannah, Arctic, Mystic, or Genesis)', done: false }
          ]
        },
        rewards: {
          gold: 150,
          exp: 80,
          items: [
            { id: 'traveler_cloak', name: 'Capa de viajero', slot: 'body', rarity: 'common', icon: './assets/equippable/traveler_cloak.webp', desc: 'Capa gruesa y cómoda para los caminos de Lunacia.', stats: { hp: 25 } }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_lost_mail: {
        id: 'quest_lost_mail',
        title: 'The Lost Mail',
        category: 'Secundaria',
        giver: {
          name: 'Lunacian Postman',
          title: 'Royal Messenger',
          avatar: './assets/portraits/sapidae-m-a.png',
          model: 'sapidae-m-a'
        },
        zoneCoords: [2, 2],
        bubbleQuote: 'Please help me! My letters scattered across the meadow!',
        lore: 'The loyal postman was ambushed by lesser chimeras while crossing Dojo Valley in [2, 2]. Sealed noble letters scattered everywhere.',
        npcQuote: 'If I don\'t deliver this mail, I\'ll lose my official cap! Please, purify the prowlers and recover the lost bags.',
        objective: {
          summary: 'Help the postman in [2, 2] recover the scattered mailbags.',
          steps: [
            { id: 'talk_postman', desc: 'Speak with the Lunacian Postman in the Dojo [2, 2]', done: false },
            { id: 'find_mail', desc: 'Defeat the chimeras and secure the mailbag', done: false },
            { id: 'return_mail', desc: 'Return the letters to the Postman [E]', done: false }
          ]
        },
        rewards: {
          gold: 120,
          exp: 70,
          items: [
            { id: 'heavy_boots', name: 'Botas pesadas', slot: 'boots', rarity: 'common', icon: './assets/equippable/heavy_boots.webp', desc: 'Suela gruesa para no resbalar en el barro.', stats: { hp: 12, initiative: 2 } }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_forest_elixir: {
        id: 'quest_forest_elixir',
        title: 'Elixir for the Forest',
        category: 'Secundaria',
        giver: {
          name: 'Herbalist Rosalba',
          title: 'Flower Alchemist',
          avatar: './assets/portraits/sapidae-f-a.png',
          model: 'sapidae-f-a'
        },
        zoneCoords: [2, 2],
        bubbleQuote: 'Psst! I\'m looking for fresh sprouts from the Sacred Atia Tree...',
        lore: 'Rosalba brews healing concoctions to treat those wounded by chimera incursions. She needs to harvest Luminous Moss in the Dojo forest [2, 2].',
        npcQuote: 'The moss growing near the water neutralizes toxins. Bring me a sample and I\'ll brew a revitalizing nectar for you.',
        objective: {
          summary: 'Gather Luminous Moss in [2, 2] and deliver it to Herbalist Rosalba.',
          steps: [
            { id: 'talk_herbalist', desc: 'Talk to Rosalba in the Dojo forest [2, 2]', done: false },
            { id: 'gather_moss', desc: 'Harvest Luminous Moss near the stream', done: false },
            { id: 'deliver_moss', desc: 'Deliver the moss to Rosalba [E]', done: false }
          ]
        },
        rewards: {
          gold: 140,
          exp: 85,
          items: [
            { id: 'dew_flask', name: 'Healing Dew Flask', slot: 'consumable', rarity: 'rare', icon: './assets/consumable/healing_dew_flask.webp', desc: 'Medicinal flask with moss extract and healing dew crafted by Rosalba. Instantly restores 100 HP to the selected hero.', stats: {} }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_nomad_steel: {
        id: 'quest_nomad_steel',
        title: 'Nomad Steel',
        category: 'Secundaria',
        giver: {
          name: 'Blacksmith Baruk',
          title: 'Canyon Forger',
          avatar: './assets/portraits/sapidae-m-b.png',
          model: 'sapidae-m-b'
        },
        zoneCoords: [3, 2],
        bubbleQuote: 'By fire and hammer! Looking to forge true savannah steel?',
        lore: 'The heat of the Savannah Canyon [3, 2] tempers metal like nowhere else on the continent. Baruk seeks to test the strength of his alloys at his canyon forge.',
        npcQuote: 'Bring me a carapace fragment from an Armored Chimera of the savannah, and I\'ll forge an unbreakable blade for your squad.',
        objective: {
          summary: 'Gather hardened ore in [3, 2] and collaborate with Baruk at his canyon forge.',
          steps: [
            { id: 'talk_blacksmith', desc: 'Speak with Blacksmith Baruk in [3, 2]', done: false },
            { id: 'gather_ores', desc: 'Defeat an Armored Chimera and extract ore fragments', done: false },
            { id: 'deliver_ores', desc: 'Bring the ores to Baruk\'s forge [E]', done: false }
          ]
        },
        rewards: {
          gold: 200,
          exp: 120,
          items: [
            { id: 'mat_copper', name: 'Cobre del cañón', qty: 5, kind: 'material', rarity: 'common', desc: 'Metal blando que se trabaja en frío. La base de casi todo el equipo Común.' },
            { id: 'mat_wolf_tooth', name: 'Diente de lobo', qty: 3, kind: 'material', rarity: 'rare', desc: 'Afilado como una cuchilla: refuerza filos y puntas.' }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_keen_eye_trial: {
        id: 'quest_keen_eye_trial',
        title: 'Trial of the Keen Eye',
        category: 'Secundaria',
        giver: {
          name: 'Hunter Zarek',
          title: 'Savannah Marksman',
          avatar: './assets/portraits/sapidae-m-c.png',
          model: 'sapidae-m-c'
        },
        zoneCoords: [3, 2],
        bubbleQuote: 'Hey, duelist! Think your aim rivals the desert wind?',
        lore: 'In the Savannah Island [3, 2], dust devils hinder any shot. Zarek challenges travelers to shoot down chimeras at range in tactical combat.',
        npcQuote: 'If your sight isn\'t faster than the blazing sun, chimeras will surround you before you draw your bowstring. Show me your accuracy!',
        objective: {
          summary: 'Pass Zarek\'s tactical shooting trial in [3, 2] by eliminating enemies at range.',
          steps: [
            { id: 'talk_hunter', desc: 'Accept Zarek\'s trial at the oasis [3, 2]', done: false },
            { id: 'win_hunt_battle', desc: 'Triumph in tactical combat across the desert', done: false },
            { id: 'report_hunt', desc: 'Prove your victory to Zarek [E]', done: false }
          ]
        },
        rewards: {
          gold: 220,
          exp: 140,
          items: [
            { id: 'mushroom_staff', name: 'Bastón de hongo', slot: 'weapon', rarity: 'common', icon: './assets/equippable/mushroom_staff.webp', desc: 'Un bastón coronado por un hongo que brilla un poco.', stats: { hp: 20, damage: 6 } }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_blizzard_stew: {
        id: 'quest_blizzard_stew',
        title: 'Blizzard Stew',
        category: 'Secundaria',
        giver: {
          name: 'Boreal Chef',
          title: 'Snow Cook',
          avatar: './assets/portraits/sapidae-m-d.png',
          model: 'sapidae-m-d'
        },
        zoneCoords: [2, 1],
        bubbleQuote: 'Brrr! Even my cauldron freezes over on these ice floes!',
        lore: 'In the Glacial Peaks of Lunacia [2, 1], the Boreal Chef attempts to cook a legendary stew capable of keeping explorers warm.',
        npcQuote: 'I only need two things: pure meltwater ice and blue frost mushrooms. Bring them and I\'ll share my culinary potion with you!',
        objective: {
          summary: 'Gather polar ingredients in [2, 1] and assist the Boreal Chef with his cauldron.',
          steps: [
            { id: 'talk_chef', desc: 'Speak with the Boreal Chef in [2, 1]', done: false },
            { id: 'gather_frost_mushrooms', desc: 'Gather polar mushrooms in the snow', done: false },
            { id: 'deliver_soup', desc: 'Taste the Chef\'s steaming stew [E]', done: false }
          ]
        },
        rewards: {
          gold: 260,
          exp: 180,
          items: [
            { id: 'mat_wood', name: 'Madera', qty: 4, kind: 'material', rarity: 'rare', desc: 'Tronco recio y fácil de trabajar. Lo pide cualquier evolución a Raro.' },
            { id: 'mat_wool', name: 'Lana', qty: 2, kind: 'material', rarity: 'rare', desc: 'Abriga y acolcha. Va en armaduras, sombreros y empuñaduras.' }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_dark_frost_totems: {
        id: 'quest_dark_frost_totems',
        title: 'Dark Frost Totems',
        category: 'Secundaria',
        giver: {
          name: 'Glacial Hermit',
          title: 'Shaman of Sacred Ice',
          avatar: './assets/portraits/sapidae-m-e.png',
          model: 'sapidae-m-e'
        },
        zoneCoords: [1, 1],
        bubbleQuote: 'Dark frost poisons the wind! We must purify the totems!',
        lore: 'In the Valley of Eternal Frost [1, 1], totems corrupted by abyssal energy are freezing the spiritual heart of arctic beasts.',
        npcQuote: 'Ice must be pure, not pitch black like tar. Shatter the abyss\'s hold on this quadrant\'s frozen monoliths.',
        objective: {
          summary: 'Destroy the corrupted totems in [1, 1] and restore polar equilibrium.',
          steps: [
            { id: 'talk_hermit', desc: 'Speak with the Glacial Hermit in [1, 1]', done: false },
            { id: 'purify_totems', desc: 'Defeat the dark frost guardians', done: false },
            { id: 'report_hermit', desc: 'Receive the Hermit\'s blessing [E]', done: false }
          ]
        },
        rewards: {
          gold: 280,
          exp: 200,
          items: [
            { id: 'mat_wool', name: 'Lana', qty: 3, kind: 'material', rarity: 'rare', desc: 'Abriga y acolcha. Va en armaduras, sombreros y empuñaduras.' },
            { id: 'mat_frost_crystal', name: 'Cristal de escarcha', qty: 1, kind: 'material', rarity: 'mystic', desc: 'Guarda el frío dentro. Lo pide la evolución a Místico.' }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_fallen_stardust: {
        id: 'quest_fallen_stardust',
        title: 'Fallen Stardust',
        category: 'Secundaria',
        giver: {
          name: 'Astral Astrologer',
          title: 'Sky Reader',
          avatar: './assets/portraits/sapidae-f-b.png',
          model: 'sapidae-f-b'
        },
        zoneCoords: [1, 2],
        bubbleQuote: 'The constellations resonated when you crossed the rift!',
        lore: 'In the Astral Nebula [1, 2], meteorites saturated with cosmic light crashed during the last full moon. Their fragments glow with arcane radiance.',
        npcQuote: 'Those star fragments carry the primordial spark of Lunacia. Seek them among the floating mists and I\'ll unveil their secrets.',
        objective: {
          summary: 'Gather star fragments in [1, 2] for the Astral Astrologer.',
          steps: [
            { id: 'talk_astrologer', desc: 'Speak with the Astral Astrologer in [1, 2]', done: false },
            { id: 'gather_stardust', desc: 'Recover luminescent fragments in the nebula', done: false },
            { id: 'deliver_stardust', desc: 'Deliver the fragments to the Astrologer [E]', done: false }
          ]
        },
        rewards: {
          gold: 320,
          exp: 240,
          items: [
            { id: 'mat_moon_flower', name: 'Flor lunar', qty: 3, kind: 'material', rarity: 'epic', desc: 'Solo abre de noche. Sus pétalos guardan un poco de luz de luna.' },
            { id: 'mat_astral_dust', name: 'Polvo astral', qty: 1, kind: 'material', rarity: 'mystic', desc: 'Restos de estrellas caídas. Despierta la magia del equipo.' }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_shadow_mirror: {
        id: 'quest_shadow_mirror',
        title: 'Mirror of Shadows',
        category: 'Secundaria',
        giver: {
          name: 'Spiritual Shaman',
          title: 'Guardian of the Astral Threshold',
          avatar: './assets/portraits/sapidae-f-e.png',
          model: 'sapidae-f-e'
        },
        zoneCoords: [1, 3],
        bubbleQuote: 'Careful traveler! In this mist, your own shadow will hunt you...',
        lore: 'In the Astral Void Sanctuary [1, 3], mystic mist casts spectral projections that deceive and trap those who dare look upon the reflection.',
        npcQuote: 'Only those with tempered spirits can dispel the illusion of the dark mirror. Face your phantom echo and break free of its hold.',
        objective: {
          summary: 'Venture into [1, 3] and dispel the spectral illusion corrupting travelers\' minds.',
          steps: [
            { id: 'talk_shaman', desc: 'Speak with the Spiritual Shaman in [1, 3]', done: false },
            { id: 'defeat_shadow', desc: 'Defeat the illusory shadow in tactical combat', done: false },
            { id: 'report_shaman', desc: 'Purify the mirror alongside the Shaman [E]', done: false }
          ]
        },
        rewards: {
          gold: 360,
          exp: 280,
          items: [
            { id: 'mat_druid_branch', name: 'Rama de druida', qty: 3, kind: 'material', rarity: 'epic', desc: 'Rama viva que todavía brota. Da forma a las piezas Épicas.' },
            { id: 'mat_druid_staff', name: 'Bastón de druida', qty: 2, kind: 'material', rarity: 'epic', desc: 'Bastón tallado por las dríadas; conduce la magia del bosque.' }
          ]
        },
        status: 'available',
        rewardClaimed: false
      },

      quest_forgotten_miner_relic: {
        id: 'quest_forgotten_miner_relic',
        title: 'Tripp\'s Relic',
        category: 'Secundaria',
        giver: {
          name: 'Tripp',
          title: 'Miner Warrior',
          avatar: './assets/portraits/tripp.png',
          model: 'tripp'
        },
        zoneCoords: [2, 3],
        bubbleQuote: 'A hundred years wandering these ancient gardens searching for my beloved golden pickaxe...!',
        lore: 'In the Royal Gardens of Genesis [2, 3], Tripp, a veteran miner and warrior, seeks the relic he lost in the pink crystal quarry.',
        npcQuote: 'That pickaxe forged from Atia gold is my life\'s legacy! The Genesis wardens dragged it into their crystal nest. Recover it, I beg you!',
        objective: {
          summary: 'Explore the Royal Gardens of Genesis [2, 3], recover the golden pickaxe from the crystal nest, and grant Tripp peace.',
          steps: [
            { id: 'talk_miner', desc: 'Speak with Tripp in [2, 3]', done: false },
            { id: 'find_golden_pickaxe', desc: 'Defeat the crystal warden and recover the pickaxe', done: false },
            { id: 'return_relic', desc: 'Return the relic to Tripp [E]', done: false }
          ]
        },
        rewards: {
          gold: 500,
          exp: 350,
          items: [
            { id: 'mat_amber_atia', name: 'Ámbar de Atia', qty: 2, kind: 'material', rarity: 'mystic', desc: 'Savia del Gran Árbol endurecida durante siglos. El corazón de toda pieza Mística.' },
            { id: 'mat_lunar_shard', name: 'Esquirla lunar', qty: 1, kind: 'material', rarity: 'mystic', desc: 'Fragmento de la luna de Lunacia. Necesario para evolucionar a Místico.' }
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

  getHeroName() {
    if (this.equipmentManager && this.equipmentManager.heroesBase) {
      const activeId = (this.equipmentManager.unlockedHeroes && this.equipmentManager.unlockedHeroes[0]) || 'kotaro';
      return this.equipmentManager.heroesBase[activeId]?.name || 'Hero';
    }
    return 'Hero';
  }

  _formatText(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/{heroName}/g, this.getHeroName());
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

  setTrackedQuest(questId) {
    if (this.trackedQuestId === questId) {
      this.trackedQuestId = null; // Toggle off to default auto-track
    } else if (this.quests[questId]) {
      this.trackedQuestId = questId;
    }
    this._notify();
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
            targetName = 'Slime Chimera';
          } else {
            const paladillNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'paladill') : null;
            if (paladillNpc) {
              targetWorldPos = { x: paladillNpc.position.x, z: paladillNpc.position.z };
            } else {
              targetWorldPos = { x: -90.3, z: 63.3 };
            }
            targetName = 'Master Paladill';
          }
        } else if (quest.id === 'quest_hunt_beaked_chimera') {
          if (pendingStep && pendingStep.id === 'report_hunt') {
            const sentinelNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'sentinel') : null;
            targetWorldPos = sentinelNpc ? { x: sentinelNpc.position.x, z: sentinelNpc.position.z } : { x: 62.0, z: -28.5 };
            targetName = 'Desert Sentinel';
          } else {
            targetWorldPos = { x: -40.0, z: -8.0 };
            targetName = 'Alpha Beaked Chimera';
          }
        } else if (quest.id === 'quest_nomad_steel') {
          if (pendingStep && pendingStep.id === 'gather_ores') {
            targetWorldPos = { x: 64.0, z: 32.0 };
            targetName = 'Armored Chimera';
          } else {
            const barukNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'blacksmith') : null;
            targetWorldPos = barukNpc ? { x: barukNpc.position.x, z: barukNpc.position.z } : { x: 44.5, z: 49.5 };
            targetName = 'Blacksmith Baruk';
          }
        } else if (quest.id === 'quest_blizzard_core') {
          targetWorldPos = mergedBattleAnchor('1_1') || { x: -64.0, z: -72.0 };
          targetName = 'Armored Polar Golem';
        } else if (quest.id === 'quest_frozen_seed') {
          const pomoNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'pomodoro_npc' || n.id === 'pomodoro') : null;
          targetWorldPos = pomoNpc ? { x: pomoNpc.position.x, z: pomoNpc.position.z } : { x: 5.8, z: 23.2 };
          targetName = 'Pomodoro';
        } else if (quest.id === 'quest_forbidden_resonance') {
          if (pendingStep && pendingStep.id === 'defeat_sapidae') {
            targetWorldPos = mergedBattleAnchor('1_3') || { x: -80.0, z: 16.0 };
            targetName = 'Arcane Chimera Pack';
          } else {
            const oracleNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'oracle') : null;
            targetWorldPos = oracleNpc ? { x: oracleNpc.position.x, z: oracleNpc.position.z } : { x: 34.0, z: -36.0 };
            targetName = 'Astral Oracle';
          }
        } else if (quest.id === 'quest_astral_void_echoes') {
          if (pendingStep && pendingStep.id === 'talk_oracle') {
            const oracleNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'oracle') : null;
            targetWorldPos = oracleNpc ? { x: oracleNpc.position.x, z: oracleNpc.position.z } : { x: 34.0, z: -36.0 };
            targetName = 'Astral Oracle';
          } else {
            const sageNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'polar_sage') : null;
            targetWorldPos = sageNpc ? { x: sageNpc.position.x, z: sageNpc.position.z } : { x: -8.3, z: 17.3 };
            targetName = 'Astral Sage';
          }
        } else if (quest.id === 'quest_primeval_purification') {
          if (pendingStep && (pendingStep.id === 'enter_catacombs' || pendingStep.id === 'defeat_crypt_lord')) {
            targetWorldPos = mergedBattleAnchor('3_3') || { x: 0.0, z: 104.0 };
            targetName = 'Crypt Overlord';
          } else {
            const atiaNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'atia_spirit') : null;
            targetWorldPos = atiaNpc ? { x: atiaNpc.position.x, z: atiaNpc.position.z } : { x: 0.0, z: -13.0 };
            targetName = 'Spirit of Atia';
          }
        } else if (quest.id === 'quest_forest_elixir' && pendingStep && pendingStep.id === 'gather_moss') {
          targetWorldPos = { x: 11.0, z: -6.5 };
          targetName = 'Luminous Moss Sprout';
        } else if (quest.id === 'quest_blizzard_stew' && pendingStep && pendingStep.id === 'gather_frost_mushrooms') {
          targetWorldPos = { x: -16.0, z: 12.0 };
          targetName = 'Polar Mushroom';
        } else if (quest.id === 'quest_fallen_stardust' && pendingStep && pendingStep.id === 'gather_stardust') {
          targetWorldPos = { x: -14.0, z: -12.0 };
          targetName = 'Luminescent Stardust';
        } else if (quest.id === 'quest_dark_frost_totems' && pendingStep && pendingStep.id === 'purify_totems') {
          targetWorldPos = mergedBattleAnchor('1_1') || { x: -64.0, z: -72.0 };
          targetName = 'Dark Frost Guardians';
        } else if (quest.id === 'quest_world_cartographer') {
          if (pendingStep && pendingStep.id === 'visit_biomes') {
            targetWorldPos = { x: 43.0, z: 132.2 };
            targetName = '⛵ Pomodoro (Barquero)';
          } else {
            const xiaNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'cartographer') : null;
            targetWorldPos = xiaNpc ? { x: xiaNpc.position.x, z: xiaNpc.position.z } : { x: 8.4, z: 46.7 };
            targetName = 'Xia (Cartógrafa)';
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
        directionText: `🎯 In target zone! [${tarGx}, ${tarGy}]`
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
        targetName: '⛵ Pomodoro (Barquero)',
        directionText: `⛵ Habla con Pomodoro en la playa ➔ ${islandName}`
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
      NORTH: 'North [▲]',
      SOUTH: 'South [▼]',
      EAST: 'East [►]',
      WEST: 'West [◄]'
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
      targetName: `Exit ${dirLabel}`,
      directionText: `🧭 Next exit: ${dirLabel} ➔ Toward [${tarGx}, ${tarGy}]`
    };
  }

  getActiveHUDTrackerText() {
    const q = this.getTrackedQuest();
    if (q) {
      const prefix = q.category === 'Principal' ? '⭐' : '🗺️';
      if (q.status === 'ready_to_turn_in') {
        return `${prefix} ${q.title}: Objectives completed! Talk to ${q.giver.name} [E]`;
      }
      const pendingStep = q.objective.steps.find(s => !s.done);
      if (pendingStep) {
        return `${prefix} ${q.title}: ${this._formatText(pendingStep.desc)}`;
      }
      return `${prefix} ${q.title}: Explore coordinates [${q.zoneCoords ? q.zoneCoords.join(', ') : '?'}]`;
    }

    return 'Explore the 9 macro-zones of Lunacia [M]';
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
      quests: questsData
    };
  }

  loadSaveData(saveData, heroLevel = 1) {
    if (saveData && saveData.quests) {
      if (saveData.trackedQuestId !== undefined) {
        this.trackedQuestId = saveData.trackedQuestId;
      }
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

