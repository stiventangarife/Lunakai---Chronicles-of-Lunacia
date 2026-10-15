// LevelsDatabase.js - Catalog of all 10 Campaign Levels in Axie Tactics: Lunacia Chronicles

export const LEVELS_CONFIG = {
  1: {
    id: 1,
    title: 'Lunacia Dojo',
    subtitle: 'Combat Tutorial',
    badgeText: '1 vs 2 Tutorial',
    biome: 'training_dojo',
    biomeName: 'Training Dojo',
    biomeIcon: '🥋',
    heroIds: ['kotaro'],
    sapidaePosition: { x: 4, z: 3 },
    heroPositions: [{ id: 'kotaro', x: 3, z: 4 }],
    enemies: [
      {
        id: 'quimera_scout',
        name: 'slime',
        type: 'slime',
        x: 4,
        z: 6,
        maxHP: 50,
        maxPA: 4,
        maxPM: 2,
        initiative: 40,
        scale: 1.05,
        spellIds: ['chimera_bite']
      },
      {
        id: 'quimera_guard',
        name: 'slime-defese',
        type: 'slime-defese',
        x: 4,
        z: 7,
        maxHP: 95,
        maxPA: 4,
        maxPM: 2,
        initiative: 35,
        scale: 1.15,
        spellIds: ['chimera_bite']
      }
    ],
    obstacles: [
      { x: 2, z: 6, type: 'wood_post' },
      { x: 6, z: 6, type: 'wood_post' }
    ],
    rewardRecruits: [],
    rewardItems: [],
    rewardGold: 50,
    isTutorial: true
  },

  2: {
    id: 2,
    title: 'Runic Valley Plains',
    subtitle: 'First Duo Challenge',
    badgeText: '2 vs 3 Weak',
    biome: 'lunacia_plains',
    biomeName: 'Runic Valley of Lunacia',
    biomeIcon: '🌿',
    heroIds: ['kotaro', 'bing'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 3 },
      { id: 'bing', x: 1, z: 4 }
    ],
    enemies: [
      {
        id: 'quimera_pup1',
        name: 'slime-support',
        type: 'slime-support',
        x: 7,
        z: 5,
        maxHP: 105,
        maxPA: 5,
        maxPM: 3,
        initiative: 60,
        scale: 1.05,
        spellIds: ['chimera_bite', 'chimera_heal']
      },
      {
        id: 'quimera_pup2',
        name: 'slime-attack',
        type: 'slime-attack',
        x: 8,
        z: 4,
        maxHP: 90,
        maxPA: 5,
        maxPM: 3,
        initiative: 70,
        scale: 1.05,
        spellIds: ['chimera_spit', 'chimera_bite']
      },
      {
        id: 'quimera_pup3',
        name: 'slime',
        type: 'slime',
        x: 6, z: 6,
        maxHP: 95,
        maxPA: 4,
        maxPM: 2,
        initiative: 50,
        scale: 1.05,
        spellIds: ['chimera_bite']
      }
    ],
    obstacles: [
      { x: 5, z: 4, type: 'pillar_rock' },
      { x: 4, z: 6, type: 'pillar_rock' }
    ],
    rewardRecruits: ['pomodoro'],
    rewardItems: ['bird_longbow', 'feather_hood', 'aegis_shield'],
    isTutorial: false
  },

  3: {
    id: 3,
    title: 'Glacial Peaks',
    subtitle: 'The Hero Trio',
    badgeText: '3 vs 3 Squad',
    biome: 'frozen_peaks',
    biomeName: 'Glacier of Lunacia',
    biomeIcon: '❄️',
    heroIds: ['kotaro', 'bing', 'pomodoro'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 2 },
      { id: 'bing', x: 1, z: 4 },
      { id: 'pomodoro', x: 3, z: 1 }
    ],
    enemies: [
      {
        id: 'quimera_frost1',
        name: 'wolf-alpha',
        type: 'wolf-alpha',
        x: 7,
        z: 6,
        maxHP: 220,
        maxPA: 6,
        maxPM: 4,
        initiative: 80,
        scale: 1.3,
        spellIds: ['chimera_bite', 'chimera_bellow']
      },
      {
        id: 'quimera_frost2',
        name: 'wolf-gray',
        type: 'wolf-gray',
        x: 8,
        z: 4,
        maxHP: 180,
        maxPA: 6,
        maxPM: 4,
        initiative: 75,
        scale: 1.2,
        spellIds: ['chimera_bite']
      },
      {
        id: 'quimera_frost3',
        name: 'treant-flower',
        type: 'treant-flower',
        x: 6,
        z: 7,
        maxHP: 240,
        maxPA: 5,
        maxPM: 2,
        initiative: 55,
        scale: 1.25,
        tintColor: 0x7dd3fc,
        spellIds: ['chimera_bite', 'chimera_frost_nova']
      }
    ],
    obstacles: [
      { x: 4, z: 4, type: 'ice_crystal' },
      { x: 5, z: 5, type: 'ice_crystal' }
    ],
    rewardRecruits: [],
    rewardItems: ['plant_wand', 'traveler_cloak'],
    isTutorial: false
  },

  4: {
    id: 4,
    title: 'Stone Runic Pass',
    subtitle: 'Chimera Swarm',
    badgeText: '3 vs 4 Horde',
    biome: 'lunacia_plains',
    biomeName: 'Runic Valley of Lunacia',
    biomeIcon: '🌿',
    heroIds: ['kotaro', 'bing', 'pomodoro'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 2 },
      { id: 'bing', x: 1, z: 3 },
      { id: 'pomodoro', x: 2, z: 1 }
    ],
    enemies: [
      {
        id: 'scout_a',
        name: 'slime-attack',
        type: 'slime-attack',
        x: 6,
        z: 5,
        maxHP: 130,
        maxPA: 5,
        maxPM: 3,
        initiative: 75,
        scale: 1.05,
        spellIds: ['chimera_spit', 'chimera_bite']
      },
      {
        id: 'scout_b',
        name: 'slime-attack',
        type: 'slime-attack',
        x: 7,
        z: 3,
        maxHP: 130,
        maxPA: 5,
        maxPM: 3,
        initiative: 70,
        scale: 1.05,
        spellIds: ['chimera_spit', 'chimera_bite']
      },
      {
        id: 'larva_a',
        name: 'slime',
        type: 'slime',
        x: 8,
        z: 6,
        maxHP: 140,
        maxPA: 5,
        maxPM: 3,
        initiative: 55,
        scale: 1.05,
        spellIds: ['chimera_bite']
      },
      {
        id: 'larva_b',
        name: 'slime-defese',
        type: 'slime-defese',
        x: 7,
        z: 7,
        maxHP: 160,
        maxPA: 4,
        maxPM: 2,
        initiative: 50,
        scale: 1.12,
        spellIds: ['chimera_bite']
      }
    ],
    obstacles: [
      { x: 4, z: 3, type: 'pillar_rock' },
      { x: 5, z: 6, type: 'pillar_rock' }
    ],
    rewardRecruits: [],
    rewardItems: ['heavy_boots', 'golden_mail'],
    isTutorial: false
  },

  5: {
    id: 5,
    title: 'Deep Glacier: Puffy\'s Nest',
    subtitle: 'First Glacial Mini-Boss',
    badgeText: 'MINI-BOSS',
    biome: 'frozen_peaks',
    biomeName: 'Glacier of Lunacia',
    biomeIcon: '❄️',
    heroIds: ['kotaro', 'bing', 'pomodoro'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 2 },
      { id: 'bing', x: 1, z: 4 },
      { id: 'pomodoro', x: 3, z: 1 }
    ],
    enemies: [
      {
        id: 'boss_puffy',
        name: 'wolf-alpha',
        type: 'wolf-alpha',
        x: 7,
        z: 5,
        maxHP: 420,
        maxPA: 6,
        maxPM: 4,
        initiative: 90,
        scale: 1.65,
        spellIds: ['chimera_frost_nova', 'chimera_bite', 'chimera_bellow']
      },
      {
        id: 'guard_frost_a',
        name: 'treant-flower',
        type: 'treant-flower',
        x: 6,
        z: 7,
        maxHP: 260,
        maxPA: 5,
        maxPM: 2,
        initiative: 55,
        scale: 1.25,
        tintColor: 0x7dd3fc,
        spellIds: ['chimera_bite', 'chimera_frost_nova']
      },
      {
        id: 'guard_frost_b',
        name: 'wolf-gray',
        type: 'wolf-gray',
        x: 8,
        z: 3,
        maxHP: 200,
        maxPA: 6,
        maxPM: 4,
        initiative: 80,
        scale: 1.2,
        spellIds: ['chimera_bite']
      }
    ],
    obstacles: [
      { x: 4, z: 5, type: 'ice_crystal' },
      { x: 5, z: 3, type: 'ice_crystal' }
    ],
    rewardRecruits: [],
    rewardItems: ['frost_blade', 'titan_mail'],
    isTutorial: false
  },

  6: {
    id: 6,
    title: 'Ancient Mystic Forest',
    subtitle: 'Tactical Priority: Healers',
    badgeText: '3 vs 3 Support',
    biome: 'mystic_grove',
    biomeName: 'Grove of the Sages',
    biomeIcon: '🌲',
    heroIds: ['kotaro', 'bing', 'pomodoro'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 2 },
      { id: 'bing', x: 1, z: 4 },
      { id: 'pomodoro', x: 3, z: 1 }
    ],
    enemies: [
      {
        id: 'quimera_tank',
        name: 'dryad-fighter',
        type: 'dryad-fighter',
        x: 5,
        z: 5,
        maxHP: 350,
        maxPA: 6,
        maxPM: 3,
        initiative: 70,
        scale: 1.50,
        spellIds: ['chimera_bite', 'chimera_bellow']
      },
      {
        id: 'quimera_healer1',
        name: 'dryad-mage',
        type: 'dryad-mage',
        x: 8,
        z: 6,
        maxHP: 230,
        maxPA: 6,
        maxPM: 3,
        initiative: 65,
        scale: 1.50,
        spellIds: ['chimera_heal', 'chimera_spit']
      },
      {
        id: 'quimera_healer2',
        name: 'dryad-range',
        type: 'dryad-range',
        x: 8,
        z: 3,
        maxHP: 220,
        maxPA: 6,
        maxPM: 4,
        initiative: 75,
        scale: 1.50,
        spellIds: ['chimera_spit', 'chimera_bite']
      }
    ],
    obstacles: [
      { x: 4, z: 3, type: 'wood_post' },
      { x: 4, z: 6, type: 'wood_post' }
    ],
    rewardRecruits: [],
    rewardItems: ['mystic_orb', 'feather_hood'],
    isTutorial: false
  },

  7: {
    id: 7,
    title: 'Shattered Rock Canyon',
    subtitle: 'The Might of the Colossi',
    badgeText: '3 vs 3 Savanna',
    biome: 'canyon_rock',
    biomeName: 'Rocky Canyon of Lunacia',
    biomeIcon: '🏔️',
    heroIds: ['kotaro', 'bing', 'pomodoro'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 3 },
      { id: 'bing', x: 1, z: 2 },
      { id: 'pomodoro', x: 2, z: 5 }
    ],
    enemies: [
      {
        id: 'quimera_goliath1',
        name: 'wolf-aquatic-alpha',
        type: 'wolf-aquatic-alpha',
        x: 7,
        z: 3,
        maxHP: 360,
        maxPA: 6,
        maxPM: 4,
        initiative: 85,
        scale: 1.60,
        spellIds: ['chimera_bite', 'chimera_bellow']
      },
      {
        id: 'quimera_goliath2',
        name: 'wolf-aquatic',
        type: 'wolf-aquatic',
        x: 7,
        z: 6,
        maxHP: 310,
        maxPA: 6,
        maxPM: 4,
        initiative: 80,
        scale: 1.25,
        spellIds: ['chimera_bite']
      },
      {
        id: 'quimera_dunas',
        name: 'slime-forest-a',
        type: 'slime-forest-a',
        x: 8,
        z: 4,
        maxHP: 240,
        maxPA: 5,
        maxPM: 4,
        initiative: 70,
        scale: 1.1,
        spellIds: ['chimera_bite', 'chimera_spit']
      }
    ],
    obstacles: [
      { x: 5, z: 4, type: 'pillar_rock' },
      { x: 5, z: 5, type: 'pillar_rock' }
    ],
    rewardRecruits: [],
    rewardItems: ['aegis_shield', 'heavy_boots'],
    isTutorial: false
  },

  8: {
    id: 8,
    title: 'Frozen Lake Crossing',
    subtitle: 'Fury of the Polar Wind',
    badgeText: '3 vs 4 Mixed',
    biome: 'frozen_peaks',
    biomeName: 'Glacier of Lunacia',
    biomeIcon: '❄️',
    heroIds: ['kotaro', 'bing', 'pomodoro'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 2 },
      { id: 'bing', x: 1, z: 4 },
      { id: 'pomodoro', x: 3, z: 1 }
    ],
    enemies: [
      {
        id: 'quimera_frost_brawler',
        name: 'wolf-alpha',
        type: 'wolf-alpha',
        x: 6,
        z: 6,
        maxHP: 280,
        maxPA: 6,
        maxPM: 4,
        initiative: 80,
        scale: 1.65,
        spellIds: ['chimera_bite', 'chimera_bellow']
      },
      {
        id: 'quimera_frost_shaman',
        name: 'treant-flower',
        type: 'treant-flower',
        x: 8,
        z: 7,
        maxHP: 260,
        maxPA: 5,
        maxPM: 2,
        initiative: 55,
        scale: 1.25,
        tintColor: 0x7dd3fc,
        spellIds: ['chimera_bite', 'chimera_frost_nova']
      },
      {
        id: 'quimera_frost_stalker1',
        name: 'wolf-gray',
        type: 'wolf-gray',
        x: 7,
        z: 3,
        maxHP: 200,
        maxPA: 6,
        maxPM: 4,
        initiative: 85,
        scale: 1.2,
        spellIds: ['chimera_bite']
      },
      {
        id: 'quimera_frost_stalker2',
        name: 'wolf-gray',
        type: 'wolf-gray',
        x: 8,
        z: 4,
        maxHP: 200,
        maxPA: 6,
        maxPM: 4,
        initiative: 80,
        scale: 1.2,
        spellIds: ['chimera_bite']
      }
    ],
    obstacles: [
      { x: 4, z: 4, type: 'ice_crystal' },
      { x: 5, z: 5, type: 'ice_crystal' },
      { x: 6, z: 3, type: 'ice_crystal' }
    ],
    rewardRecruits: [],
    rewardItems: ['dragon_boots', 'golden_mail'],
    isTutorial: false
  },

  9: {
    id: 9,
    title: 'Crimson Fortress Threshold',
    subtitle: 'Elite Dungeon Guard',
    badgeText: '3 vs 3 Dungeon',
    biome: 'boss_arena',
    biomeName: 'Fiery Catacombs',
    biomeIcon: '🏰',
    heroIds: ['kotaro', 'bing', 'pomodoro'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 2 },
      { id: 'bing', x: 1, z: 4 },
      { id: 'pomodoro', x: 3, z: 1 }
    ],
    enemies: [
      {
        id: 'commander_brawler',
        name: 'bear-dad',
        type: 'bear-dad',
        x: 6,
        z: 5,
        maxHP: 420,
        maxPA: 6,
        maxPM: 3,
        initiative: 85,
        scale: 2.05,
        spellIds: ['chimera_bite', 'chimera_bellow']
      },
      {
        id: 'commander_sniper',
        name: 'slime-fusion',
        type: 'slime-fusion',
        x: 8,
        z: 3,
        maxHP: 310,
        maxPA: 6,
        maxPM: 3,
        initiative: 75,
        scale: 1.2,
        spellIds: ['chimera_spit', 'chimera_bellow']
      },
      {
        id: 'commander_shaman',
        name: 'bear-mom',
        type: 'bear-mom',
        x: 8,
        z: 7,
        maxHP: 400,
        maxPA: 6,
        maxPM: 3,
        initiative: 70,
        scale: 1.85,
        spellIds: ['chimera_bite', 'chimera_bellow']
      }
    ],
    obstacles: [
      { x: 4, z: 3, type: 'pillar_rock' },
      { x: 5, z: 6, type: 'pillar_rock' }
    ],
    rewardRecruits: [],
    rewardItems: ['traveler_cloak', 'titan_mail'],
    isTutorial: false
  },

  10: {
    id: 10,
    title: 'Throne of the Supreme Chimera',
    subtitle: 'Final Duel for Lunacia',
    badgeText: 'FINAL BOSS',
    biome: 'boss_arena',
    biomeName: 'Ceremonial Throne of Lunacia',
    biomeIcon: '👑',
    heroIds: ['kotaro', 'bing', 'pomodoro'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 3 },
      { id: 'bing', x: 1, z: 2 },
      { id: 'pomodoro', x: 1, z: 5 }
    ],
    enemies: [
      {
        id: 'boss_werewolf',
        name: 'werewolf-boss',
        type: 'werewolf-boss',
        x: 7,
        z: 4,
        maxHP: 850,
        maxPA: 8,
        maxPM: 4,
        initiative: 95,
        scale: 2.10,
        spellIds: ['kibo_cataclysm', 'chimera_bellow', 'chimera_bite']
      },
      {
        id: 'boss_guard_l',
        name: 'bear-mom',
        type: 'bear-mom',
        x: 6,
        z: 2,
        maxHP: 380,
        maxPA: 6,
        maxPM: 3,
        initiative: 70,
        scale: 1.85,
        spellIds: ['chimera_bite', 'chimera_bellow']
      },
      {
        id: 'boss_guard_r',
        name: 'bear-dad',
        type: 'bear-dad',
        x: 6,
        z: 6,
        maxHP: 410,
        maxPA: 6,
        maxPM: 3,
        initiative: 75,
        scale: 2.05,
        spellIds: ['chimera_bite', 'chimera_bellow']
      }
    ],
    obstacles: [
      { x: 4, z: 2, type: 'pillar_rock' },
      { x: 4, z: 6, type: 'pillar_rock' },
      { x: 5, z: 4, type: 'pillar_rock' }
    ],
    rewardRecruits: [],
    rewardItems: ['crown_of_lunacia'],
    isTutorial: false,
    isFinalBoss: true
  }
};
