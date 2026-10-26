// LevelsDatabase.js - Catalog of all 10 Campaign Levels in Axie Tactics: Lunacia Chronicles
import * as i18n from '../i18n/i18n.js';

export const LEVELS_CONFIG = {
  1: {
    id: 1,
    title: i18n.t('levels.dojoDefense.title'),
    subtitle: i18n.t('levels.dojoDefense.subtitle'),
    badgeText: i18n.t('levels.badgeTutorial'),
    biome: 'training_dojo',
    biomeName: i18n.t('levels.place.mapleGlade'),
    biomeIcon: '🥋',
    // Hito 37: el tutorial se juega en el Claro de Arces (10×10, mismas coordenadas que el Dojo:
    // todas las casillas del guion — (4,3), (3,4), (4,5), (4,6), (3,6), (3,7), (4,7) — están libres)
    battleMapId: 'forest_maple_glade',
    heroIds: ['kotaro'],
    sapidaePosition: { x: 4, z: 3 },
    heroPositions: [{ id: 'kotaro', x: 3, z: 4 }],
    enemies: [
      {
        id: 'quimera_scout',
        name: i18n.t('enemies.arch.slime.name'),
        type: 'slime',
        x: 4,
        z: 6,
        maxHP: 36, // Fase 5: < golpe mínimo de la habilidad 1 de las 4 clases de Sapidae (38) → el tutorial siempre la derrota
        maxPA: 4,
        maxPM: 2,
        initiative: 40,
        scale: 1.05,
        spellIds: ['chimera_bite']
      },
      {
        id: 'quimera_guard',
        name: i18n.t('enemies.guardianChimera'),
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
    rewardItems: ['wood_sword'], // Hito 48: la Espada de madera se gana defendiendo el Dojo
    rewardExp: 80,
    isTutorial: true
  },

  // ── Hito 48: combates del tutorial nuevo (TutorialDirector) ──────────────────────────────────────────
  // Duelo de entrenamiento con el Maestro Paladill: termina cuando alguien baja al 30 % de vida.
  tut_duel: {
    id: 'tut_duel',
    title: i18n.t('levels.duel.title'),
    subtitle: i18n.t('levels.duel.subtitle'),
    badgeText: i18n.t('levels.badgeTutorial'),
    biome: 'training_dojo',
    biomeName: i18n.t('levels.place.lunaciaDojo'),
    battleMapId: 'forest_maple_glade',
    heroIds: ['kotaro'],
    sapidaePosition: { x: 4, z: 3 },
    heroPositions: [{ id: 'kotaro', x: 3, z: 4 }],
    enemies: [
      { id: 'paladill_duel', name: i18n.t('npcDefs.paladillName'), type: 'paladill', x: 4, z: 7, maxHP: 240, maxPA: 4, maxPM: 3, initiative: 40, scale: 1.25, spellIds: ['chimera_bite', 'chimera_bellow'] },
    ],
    obstacles: [],
    rewardRecruits: [],
    rewardItems: [],
    rewardExp: 60,
    duel: { threshold: 0.3 },
    noPersistentHP: true,
  },
  // Prueba de la Duo Ultimate: vínculo prestado al 100 % y Ultimate desde la ronda 1.
  tut_ult: {
    id: 'tut_ult',
    title: i18n.t('levels.ult.title'),
    subtitle: i18n.t('levels.ult.subtitle'),
    badgeText: i18n.t('levels.badgeTutorial'),
    biome: 'training_dojo',
    biomeName: i18n.t('levels.place.lunaciaDojo'),
    battleMapId: 'forest_maple_glade',
    heroIds: ['kotaro'],
    sapidaePosition: { x: 4, z: 3 },
    heroPositions: [{ id: 'kotaro', x: 3, z: 4 }],
    enemies: [
      { id: 'tut_slime_a', name: i18n.t('enemies.arch.slime.name'), type: 'slime', x: 4, z: 6, maxHP: 70, maxPA: 3, maxPM: 2, initiative: 30, scale: 1.05, spellIds: ['chimera_bite'] },
      { id: 'tut_slime_b', name: i18n.t('enemies.arch.slime.name'), type: 'slime', x: 5, z: 7, maxHP: 70, maxPA: 3, maxPM: 2, initiative: 28, scale: 1.05, spellIds: ['chimera_bite'] },
      { id: 'tut_slime_c', name: i18n.t('enemies.guardianChimera'), type: 'slime-defese', x: 3, z: 7, maxHP: 90, maxPA: 3, maxPM: 2, initiative: 26, scale: 1.15, spellIds: ['chimera_bite'] },
    ],
    obstacles: [],
    rewardRecruits: [],
    rewardItems: [],
    rewardExp: 60,
    ultimateMinRound: 1,
    noPersistentHP: true,
  },

  2: {
    id: 2,
    title: i18n.t('levels.l2.title'),
    subtitle: i18n.t('levels.l2.subtitle'),
    badgeText: i18n.t('levels.l2.badge'),
    biome: 'lunacia_plains',
    biomeName: i18n.t('levels.place.runicValley'),
    biomeIcon: '🌿',
    heroIds: ['kotaro', 'bing'],
    heroPositions: [
      { id: 'kotaro', x: 2, z: 3 },
      { id: 'bing', x: 1, z: 4 }
    ],
    enemies: [
      {
        id: 'quimera_pup1',
        name: i18n.t('enemies.arch.slime_support.name'),
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
        name: i18n.t('enemies.arch.slime_attack.name'),
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
        name: i18n.t('enemies.arch.slime.name'),
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
    rewardItems: ['composite_bow', 'mat_slime_goo', 'mat_chimera_tail'],
    isTutorial: false
  },

  3: {
    id: 3,
    title: i18n.t('levels.l3.title'),
    subtitle: i18n.t('levels.l3.subtitle'),
    badgeText: i18n.t('levels.l3.badge'),
    biome: 'frozen_peaks',
    biomeName: i18n.t('levels.place.glacier'),
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
        name: i18n.t('enemies.arch.wolf_alpha.name'),
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
        name: i18n.t('enemies.arch.wolf_gray.name'),
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
        name: i18n.t('enemies.arch.treant_flower.name'),
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
    rewardItems: ['mat_wool', 'mat_wood'],
    isTutorial: false
  },

  4: {
    id: 4,
    title: i18n.t('levels.l4.title'),
    subtitle: i18n.t('levels.l4.subtitle'),
    badgeText: i18n.t('levels.l4.badge'),
    biome: 'lunacia_plains',
    biomeName: i18n.t('levels.place.runicValley'),
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
        name: i18n.t('enemies.arch.slime_attack.name'),
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
        name: i18n.t('enemies.arch.slime_attack.name'),
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
        name: i18n.t('enemies.arch.slime.name'),
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
        name: i18n.t('enemies.arch.slime_defese.name'),
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
    rewardItems: ['heavy_boots', 'mat_chimera_tail'],
    isTutorial: false
  },

  5: {
    id: 5,
    title: i18n.t('levels.l5.title'),
    subtitle: i18n.t('levels.l5.subtitle'),
    badgeText: i18n.t('levels.l5.badge'),
    biome: 'frozen_peaks',
    biomeName: i18n.t('levels.place.glacier'),
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
        name: i18n.t('enemies.arch.wolf_alpha.name'),
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
        name: i18n.t('enemies.arch.treant_flower.name'),
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
        name: i18n.t('enemies.arch.wolf_gray.name'),
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
    rewardItems: ['mat_wool', 'mat_wool'],
    isTutorial: false
  },

  6: {
    id: 6,
    title: i18n.t('levels.l6.title'),
    subtitle: i18n.t('levels.l6.subtitle'),
    badgeText: i18n.t('levels.l6.badge'),
    biome: 'mystic_grove',
    biomeName: i18n.t('levels.place.sagesGrove'),
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
        name: i18n.t('enemies.arch.dryad_fighter.name'),
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
        name: i18n.t('enemies.arch.dryad_mage.name'),
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
        name: i18n.t('enemies.arch.dryad_range.name'),
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
    rewardItems: ['mat_druid_branch', 'mat_druid_flower'],
    isTutorial: false
  },

  7: {
    id: 7,
    title: i18n.t('levels.l7.title'),
    subtitle: i18n.t('levels.l7.subtitle'),
    badgeText: i18n.t('levels.l7.badge'),
    biome: 'canyon_rock',
    biomeName: i18n.t('levels.place.rockyCanyon'),
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
        name: i18n.t('enemies.arch.wolf_aquatic_alpha.name'),
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
        name: i18n.t('enemies.arch.wolf_aquatic.name'),
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
        name: i18n.t('enemies.arch.slime_forest_a.name'),
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
    rewardItems: ['wooden_buckler', 'mat_copper'],
    isTutorial: false
  },

  8: {
    id: 8,
    title: i18n.t('levels.l8.title'),
    subtitle: i18n.t('levels.l8.subtitle'),
    badgeText: i18n.t('levels.l8.badge'),
    biome: 'frozen_peaks',
    biomeName: i18n.t('levels.place.glacier'),
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
        name: i18n.t('enemies.arch.wolf_alpha.name'),
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
        name: i18n.t('enemies.arch.treant_flower.name'),
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
        name: i18n.t('enemies.arch.wolf_gray.name'),
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
        name: i18n.t('enemies.arch.wolf_gray.name'),
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
    rewardItems: ['mat_wood', 'mat_wool'],
    isTutorial: false
  },

  9: {
    id: 9,
    title: i18n.t('levels.l9.title'),
    subtitle: i18n.t('levels.l9.subtitle'),
    badgeText: i18n.t('levels.l9.badge'),
    biome: 'boss_arena',
    biomeName: i18n.t('levels.place.fieryCatacombs'),
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
        name: i18n.t('enemies.arch.bear_dad.name'),
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
        name: i18n.t('enemies.arch.slime_fusion.name'),
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
        name: i18n.t('enemies.arch.bear_mom.name'),
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
    rewardItems: ['mat_amber_atia', 'mat_amber_atia'],
    isTutorial: false
  },

  10: {
    id: 10,
    title: i18n.t('levels.l10.title'),
    subtitle: i18n.t('levels.l10.subtitle'),
    badgeText: i18n.t('levels.l10.badge'),
    biome: 'boss_arena',
    biomeName: i18n.t('levels.place.ceremonialThrone'),
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
        name: i18n.t('enemies.arch.werewolf_boss.name'),
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
        name: i18n.t('enemies.arch.bear_mom.name'),
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
        name: i18n.t('enemies.arch.bear_dad.name'),
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
    rewardItems: ['mat_amber_atia', 'mat_lunar_shard'],
    isTutorial: false,
    isFinalBoss: true
  }
};
