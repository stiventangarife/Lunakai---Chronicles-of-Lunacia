// QuestManager.js - Centralized Quest System for Lunacia Adventures
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
        title: 'Atia Slime Purification',
        category: 'Principal',
        order: 1,
        giver: {
          name: 'Master Paladill',
          title: 'Dojo Mentor',
          avatar: './assets/portraits/paladill.png',
          model: 'paladill'
        },
        zoneCoords: [2, 2],
        lore: 'For millennia, Lunacia flourished under the mystic light of the Atia Tree. But the shadows of the Abyss have corrupted local wildlife into dangerous Chimeras. A Slime Chimera slipped through the mist and prowls the eastern garden, threatening the sanctuary peace.',
        npcQuote: 'As a Dojo apprentice, your duty is to protect this sanctuary! Cross the wooden bridge to the east garden, face the Slime Chimera, and purify its corrupted core.',
        objective: {
          summary: 'Head to the east garden by crossing the wooden bridge, purify the Slime Chimera in tactical combat, and return to Master Paladill to report your victory.',
          steps: [
            { id: 'talk_paladill', desc: 'Talk to Master Paladill in the Dojo [2, 2]', done: false },
            { id: 'defeat_slime', desc: 'Defeat the Slime Chimera in the east garden', done: false },
            { id: 'report_victory', desc: 'Report your victory to Paladill and receive your sword', done: false },
            { id: 'equip_sword', desc: 'Open your Inventory [I] and equip the Sword to {heroName}', done: false },
            { id: 'open_doors', desc: 'Talk to Paladill to unlock the Dojo doors [E]', done: false }
          ]
        },
        rewards: {
          gold: 150,
          exp: 100,
          items: [
            {
              id: 'wood_sword',
              name: 'Dojo Wooden Sword',
              slot: 'weapon',
              rarity: 'common',
              icon: './assets/equippable/wood_sword.png',
              desc: 'Training sword blessed by Master Paladill. Grants +8 blunt damage to your melee attacks.',
              stats: { damage: 8 }
            }
          ]
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
          title: 'Solitary Winged Archer',
          avatar: './assets/portraits/bing.png',
          model: 'bing'
        },
        zoneCoords: [3, 2],
        lore: 'Leaving the Dojo through the east gate towards the Eastern Savannah [3, 2], a winged archer named Bing is cornered by fierce Chimeras. If you prove your courage and fight alongside him, he will join your squad.',
        npcQuote: 'Careful adventurer! Those beasts have razor-sharp claws! If you fight with me, we can decimate their ranks and unite our forces for good.',
        objective: {
          summary: 'Travel to the eastern macro-zone [3, 2], help Bing repel the savannah monsters, and recruit him into your tactical squad.',
          steps: [
            { id: 'find_bing', desc: 'Locate Bing in the Eastern Savannah [3, 2]', done: false },
            { id: 'defend_bing', desc: 'Fight and purify the Chimeras surrounding him', done: false },
            { id: 'recruit_bing', desc: 'Talk to Bing and add his bow to your squad [E]', done: false }
          ]
        },
        rewards: {
          gold: 200,
          exp: 150,
          recruits: ['bing'],
          items: [
            {
              id: 'feather_dagger',
              name: 'Wild Feather Dagger',
              slot: 'weapon',
              rarity: 'rare',
              icon: './assets/equippable/feather_dagger.png',
              desc: 'Forged with Bing\'s steel-sharp feathers. Grants +14 ranged damage and +3 initiative.',
              stats: { damage: 14, initiative: 3 }
            }
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
            {
              id: 'desert_turban',
              name: 'Arid Wind Turban',
              slot: 'hat',
              rarity: 'rare',
              icon: './assets/equippable/desert_turban.png',
              desc: 'Nomad weave protecting against sandstorms. Grants +60 HP and +4 initiative.',
              stats: { hp: 60, initiative: 4 }
            }
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
        zoneCoords: [3, 1],
        lore: 'A flock of Beaked Chimeras led by an alpha male has cut off oasis supplies. To advance to the frozen north, we must first thin the beaked pack ruling the Arid Wastes in [3, 1].',
        npcQuote: 'If we want to advance to the frozen north, we must first decimate the beaked pack dominating the Arid Wastes in [3, 1].',
        objective: {
          summary: 'Travel to [3, 1], ambush the Beaked Chimera pack, and defeat their leader in tactical combat.',
          steps: [
            { id: 'reach_wastes', desc: 'Travel to the Arid Wastes [3, 1]', done: false, zoneCoords: [3, 1] },
            { id: 'defeat_beaked_alpha', desc: 'Purify the Beaked Chimera pack', done: false, zoneCoords: [3, 1] },
            { id: 'report_hunt', desc: 'Inform the Sentinel of the savannah\'s pacification [3, 2] [E]', done: false, zoneCoords: [3, 2] }
          ]
        },
        rewards: {
          gold: 300,
          exp: 250,
          items: [
            {
              id: 'reinforced_leather_shield',
              name: 'Reinforced Leather Shield',
              slot: 'shield',
              rarity: 'rare',
              icon: './assets/equippable/reinforced_leather_shield.png',
              desc: 'Tanned from desert chimera hides. Provides +45 Starting Shield and +25 HP.',
              stats: { shield: 45, hp: 25 }
            }
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
          title: 'Botanical Guardian of Atia',
          avatar: './assets/portraits/pomodoro.png',
          model: 'pomodoro'
        },
        zoneCoords: [2, 1],
        lore: 'The northern arctic mountains endure a relentless blizzard. In the Glacial Peaks [2, 1], noble Pomodoro fights alone to protect a sacred sprout of the Atia Tree from Glacial Chimeras.',
        npcQuote: 'By the roots of life! My sprouts won\'t endure much more cold if those beasts keep attacking! Help me drive them out!',
        objective: {
          summary: 'Ascend to the Glacial Peaks at [2, 1], defeat the frozen creatures, and recruit Pomodoro as your squad\'s healing protector.',
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
            {
              id: 'sacred_leaf_brooch',
              name: 'Sacred Leaf Brooch',
              slot: 'body',
              rarity: 'epic',
              icon: './assets/equippable/sacred_leaf_brooch.png',
              desc: 'Brooch blessed by Pomodoro\'s flowers. Grants +100 HP and strengthens defenses.',
              stats: { hp: 100 }
            }
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
          title: 'Botanical Ally',
          avatar: './assets/portraits/pomodoro.png',
          model: 'pomodoro'
        },
        zoneCoords: [1, 1],
        lore: 'The blizzard ravaging the north is unnatural: an Armored Polar Golem in the Frost Valley [1, 1] fuels an ice vortex blocking passage to the arcane sanctuaries in the west.',
        npcQuote: 'I feel the ice vibrations in my roots. If we destroy the Golem core in the Frost Valley [1, 1], the storm will cease and we can cross into the Astral Nebula [1, 2].',
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
            {
              id: 'frost_amulet',
              name: 'Amulet of Eternal Ice',
              slot: 'shield',
              rarity: 'epic',
              icon: './assets/equippable/frost_amulet.png',
              desc: 'A pure crystal condensing protective frost. Grants +80 Starting Shield and +50 HP.',
              stats: { shield: 80, hp: 50 }
            }
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
            {
              id: 'astral_robe',
              name: 'Seer Astral Robe',
              slot: 'body',
              rarity: 'epic',
              icon: './assets/equippable/astral_robe.png',
              desc: 'Woven from cosmic nebula filaments. Grants +120 HP, +10 arcane damage, and +5 initiative.',
              stats: { hp: 120, damage: 10, initiative: 5 }
            }
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
            {
              id: 'ring_of_destiny',
              name: 'Thread of Fate Ring',
              slot: 'hat',
              rarity: 'legendary',
              icon: './assets/equippable/ring_of_destiny.png',
              desc: 'A ring of living star silver. Grants +140 HP and allows starting every battle with tactical advantage.',
              stats: { hp: 140 }
            }
          ]
        },
        status: 'locked',
        rewardClaimed: false
      },

      quest_sulfur_threshold: {
        id: 'quest_sulfur_threshold',
        title: 'The Brimstone Threshold',
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
        lore: 'At the Fortress Threshold [2, 3], Kotaro guards the seal leading to the final crypt.',
        npcQuote: 'The time for the final descent has arrived. Head to the fiery gates in [2, 3] and speak with Kotaro after overcoming the Brimstone Guardians.',
        objective: {
          summary: 'March to the Fiery Fortress at [2, 3], defeat the armored dungeon guardians, and gain access to the final pit.',
          steps: [
            { id: 'reach_threshold', desc: 'Advance to the Fortress Threshold [2, 3]', done: false, zoneCoords: [2, 3] },
            { id: 'defeat_sulfur_guards', desc: 'Defeat the Fiery Guardians in combat', done: false, zoneCoords: [2, 3] }
          ]
        },
        rewards: {
          gold: 600,
          exp: 500,
          items: [
            {
              id: 'crimson_crypt_key',
              name: 'Crimson Crypt Key',
              slot: 'quest',
              category: 'quest',
              rarity: 'legendary',
              icon: './assets/equippable/crimson_crypt_key.png',
              desc: 'Key forged in elemental magma. Unlocks the arcane seal to the final Crypt Catacombs.',
              stats: {}
            }
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
        lore: 'Deep within the Crypt Catacombs [3, 3] sleeps the Chimera Overlord, the source of all Lunacia\'s corruption. This is the definitive final battle for the world\'s fate.',
        npcQuote: '{heroName}, Bing, Pomodoro... your hearts beat in unison with the Atia Tree. Enter the ceremonial pit and restore peace once and for all.',
        objective: {
          summary: 'Enter the Crypt Catacombs [3, 3] with your complete squad, defeat the Overlord in tactical combat, and save Lunacia.',
          steps: [
            { id: 'enter_catacombs', desc: 'Descend into the Deep Catacombs [3, 3]', done: false, zoneCoords: [3, 3] },
            { id: 'defeat_crypt_lord', desc: 'Defeat the Crypt Overlord in combat', done: false, zoneCoords: [3, 3] },
            { id: 'restore_lunacia', desc: 'Consecrate victory alongside the Spirit of Atia [E]', done: false, zoneCoords: [3, 3] }
          ]
        },
        rewards: {
          gold: 1000,
          exp: 1000,
          items: [
            {
              id: 'champion_crown',
              name: 'Crown of the Champion of Lunacia',
              slot: 'hat',
              rarity: 'legendary',
              icon: './assets/equippable/champion_crown.png',
              desc: 'The sacred circlet bestowed by the Great Atia Tree. Grants +250 HP, +15 initiative, and everlasting glory.',
              stats: { hp: 250, initiative: 15 }
            }
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
        lore: 'The continent of Lunacia is structured in a 9 macro-zone grid (3x3 quadrants). Each biome (Forest, Savannah, Arctic, Mystic, and Dungeon) holds unique dangers and secrets.',
        npcQuote: 'A true duelist never travels blind! Learn to read the stars and the World Map [M] to recognize each of the 9 regions.',
        objective: {
          summary: 'Open the World Map with [M] and cross into a new biome to record the geography of Lunacia.',
          steps: [
            { id: 'open_map', desc: 'Consult the World Map by pressing [M]', done: false },
            { id: 'visit_biomes', desc: 'Travel to a different biome (Savannah, Arctic, Mystic, or Dungeon)', done: false }
          ]
        },
        rewards: {
          gold: 150,
          exp: 80,
          items: [
            {
              id: 'feather_hood',
              name: 'Sacred Feather Hood',
              slot: 'hat',
              rarity: 'rare',
              icon: './assets/equippable/feather_hood.png',
              desc: 'Hood woven with blessed feathers. Grants +40 HP and +5 initiative.',
              stats: { hp: 40, initiative: 5 }
            }
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
            {
              id: 'traveler_boots',
              name: 'Light Courier Boots',
              slot: 'boots',
              rarity: 'common',
              icon: './assets/equippable/traveler_boots.png',
              desc: 'Reinforced boots for long journeys. Grants +30 HP and +4 initiative.',
              stats: { hp: 30, initiative: 4 }
            }
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
            {
              id: 'dew_flask',
              name: 'Healing Dew Flask',
              slot: 'consumable',
              category: 'consumable',
              rarity: 'rare',
              icon: './assets/equippable/dew_flask.png',
              desc: 'Medicinal flask containing moss extract and healing dew brewed by Rosalba. Instantly restores 100 HP to the selected hero.',
              effect: { heal: 100 }
            }
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
        zoneCoords: [3, 1],
        bubbleQuote: 'By fire and hammer! Looking to forge true savannah steel?',
        lore: 'The heat of the Arid Wastes [3, 1] tempers metal like nowhere else on the continent. Baruk seeks to test the strength of his alloys.',
        npcQuote: 'Bring me a carapace fragment from an Armored Chimera of the savannah, and I\'ll forge an unbreakable blade for your squad.',
        objective: {
          summary: 'Gather hardened ore in [3, 1] and collaborate with Baruk at his nomadic forge.',
          steps: [
            { id: 'talk_blacksmith', desc: 'Speak with Blacksmith Baruk in [3, 1]', done: false },
            { id: 'gather_ores', desc: 'Defeat an Armored Chimera and extract ore fragments', done: false },
            { id: 'deliver_ores', desc: 'Bring the ores to Baruk\'s forge [E]', done: false }
          ]
        },
        rewards: {
          gold: 200,
          exp: 120,
          items: [
            {
              id: 'obsidian_dagger',
              name: 'Piercing Obsidian Dagger',
              slot: 'weapon',
              rarity: 'rare',
              icon: './assets/equippable/obsidian_dagger.png',
              desc: 'Black blade sharpened in canyon heat. Grants +16 damage and +2 initiative.',
              stats: { damage: 16, initiative: 2 }
            }
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
        zoneCoords: [3, 1],
        bubbleQuote: 'Hey, duelist! Think your aim rivals the desert wind?',
        lore: 'In the Arid Wastes [3, 1], dust devils hinder any shot. Zarek challenges travelers to shoot down chimeras at range in tactical combat.',
        npcQuote: 'If your sight isn\'t faster than the blazing sun, chimeras will surround you before you draw your bowstring. Show me your accuracy!',
        objective: {
          summary: 'Pass Zarek\'s tactical shooting trial in [3, 1] by eliminating enemies at range.',
          steps: [
            { id: 'talk_hunter', desc: 'Accept Zarek\'s trial in [3, 1]', done: false },
            { id: 'win_hunt_battle', desc: 'Triumph in tactical combat across the desert', done: false },
            { id: 'report_hunt', desc: 'Prove your victory to Zarek [E]', done: false }
          ]
        },
        rewards: {
          gold: 220,
          exp: 140,
          items: [
            {
              id: 'precision_scope',
              name: 'Lunacian Precision Scope',
              slot: 'hat',
              rarity: 'rare',
              icon: './assets/equippable/precision_scope.png',
              desc: 'Polished crystal lens for accurate shots. Grants +50 HP and +6 initiative.',
              stats: { hp: 50, initiative: 6 }
            }
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
            {
              id: 'thermal_pot',
              name: 'Fortifying Thermal Cauldron',
              slot: 'shield',
              rarity: 'rare',
              icon: './assets/equippable/thermal_pot.png',
              desc: 'Round shield with the aroma of hot stew. Provides +60 Starting Shield and +40 HP.',
              stats: { shield: 60, hp: 40 }
            }
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
            {
              id: 'arctic_buckler',
              name: 'Mirroring Arctic Buckler',
              slot: 'shield',
              rarity: 'rare',
              icon: './assets/equippable/arctic_buckler.png',
              desc: 'Reflects polar light, shielding against frontal strikes. Grants +70 Shield and +35 HP.',
              stats: { shield: 70, hp: 35 }
            }
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
            {
              id: 'star_prism',
              name: 'Prism Star Fragment',
              slot: 'weapon',
              rarity: 'epic',
              icon: './assets/equippable/star_prism.png',
              desc: 'Gleaming celestial crystal. Grants +22 blunt damage and +4 initiative.',
              stats: { damage: 22, initiative: 4 }
            }
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
            {
              id: 'concentration_talisman',
              name: 'Ancestral Focus Talisman',
              slot: 'body',
              rarity: 'epic',
              icon: './assets/equippable/concentration_talisman.png',
              desc: 'Grants absolute mental clarity. Bestows +110 HP.',
              stats: { hp: 110 }
            }
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
        bubbleQuote: 'A hundred years wandering amid fire searching for my beloved golden pickaxe...!',
        lore: 'At the Fiery Fortress Threshold [2, 3], Tripp, a veteran miner and warrior, seeks the relic he lost in the gallery depths.',
        npcQuote: 'That pickaxe forged from Atia gold is my life\'s legacy! Fiery chimeras dragged it into their magma nest. Recover it, I beg you!',
        objective: {
          summary: 'Explore the Fortress Threshold [2, 3], recover the golden pickaxe from the blazing nest, and grant Tripp peace.',
          steps: [
            { id: 'talk_miner', desc: 'Speak with Tripp in [2, 3]', done: false },
            { id: 'find_golden_pickaxe', desc: 'Defeat the fiery guard and recover the pickaxe', done: false },
            { id: 'return_relic', desc: 'Return the relic to Tripp [E]', done: false }
          ]
        },
        rewards: {
          gold: 500,
          exp: 350,
          items: [
            {
              id: 'fury_ring',
              name: 'Volcanic Fury Fiery Ring',
              slot: 'hat',
              rarity: 'epic',
              icon: './assets/equippable/fury_ring.png',
              desc: 'Imbued with the undying heat of the dungeon. Grants +130 HP and +8 initiative.',
              stats: { hp: 130, initiative: 8 }
            }
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

    // Strict linearity: Steps can ONLY advance if the quest is actively underway
    if (quest.status !== 'active') return;

    // Extra safeguard for main quests: Previous chapter must be completed
    if (quest.category === 'Principal' && !this.isMainQuestUnlocked(questId)) return;

    const step = quest.objective.steps.find(s => s.id === stepId);
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
    } else if (questId === 'quest_slime_purification') {
      const defeatStep = quest.objective.steps.find(s => s.id === 'defeat_slime');
      if (defeatStep && defeatStep.done && quest.status !== 'completed') {
        quest.status = 'ready_to_turn_in';
      }
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

    const isCurrentZone = (curGx === tarGx && curGy === tarGy);
    const distanceZones = Math.abs(tarGx - curGx) + Math.abs(tarGy - curGy);

    if (isCurrentZone) {
      let targetWorldPos = null;
      let targetName = quest.title;

      if (currentMapDef) {
        if (quest.id === 'quest_slime_purification') {
          if (!pendingStep || pendingStep.id === 'defeat_slime') {
            targetWorldPos = { x: 8.0, z: 2.0 };
            targetName = 'Slime Chimera';
          } else {
            const paladillNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'paladill') : null;
            if (paladillNpc) {
              targetWorldPos = { x: paladillNpc.position.x, z: paladillNpc.position.z };
            } else {
              targetWorldPos = { x: -14.5, z: -8.5 };
            }
            targetName = 'Master Paladill';
          }
        } else if (quest.id === 'quest_blizzard_core') {
          targetWorldPos = { x: 18.0, z: -8.0 };
          targetName = 'Armored Polar Golem';
        } else if (quest.id === 'quest_frozen_seed') {
          const pomoNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'pomodoro_npc' || n.id === 'pomodoro') : null;
          targetWorldPos = pomoNpc ? { x: pomoNpc.position.x, z: pomoNpc.position.z } : { x: 5.8, z: 23.2 };
          targetName = 'Pomodoro';
        } else if (pendingStep && (pendingStep.id === 'talk_oracle' || pendingStep.id === 'purify_resonance' || pendingStep.desc.toLowerCase().includes('oráculo') || pendingStep.desc.toLowerCase().includes('oraculo') || pendingStep.desc.toLowerCase().includes('oracle')) || quest.id === 'quest_forbidden_resonance') {
          const oracleNpc = currentMapDef.npcs ? currentMapDef.npcs.find(n => n.id === 'oracle') : null;
          targetWorldPos = oracleNpc ? { x: oracleNpc.position.x, z: oracleNpc.position.z } : { x: 13.6, z: -24.2 };
          targetName = 'Astral Oracle';
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
        targetWorldPos,
        targetName,
        directionText: `🎯 In target zone! [${tarGx}, ${tarGy}]`
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

