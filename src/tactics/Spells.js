import * as THREE from 'three';
import { VFXManager } from './VFXManager.js';

export const SPELLS_DB = {
  kotaro_slash: {
    id: 'kotaro_slash',
    name: 'Fierce Slash',
    icon: './assets/skills/heroes/shinji/1.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    description: 'Devastating melee slash. Deals 65-80 blunt physical damage.',
    baseMinDamage: 65,
    baseMaxDamage: 80,
    sound: 'melee'
  },
  kotaro_push: {
    id: 'kotaro_push',
    name: 'Repelling Charge',
    icon: './assets/skills/heroes/shinji/2.png',
    paCost: 2,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 2,
    description: 'Charge that deals 25-35 damage and pushes the target 2 tiles causing collision.',
    baseMinDamage: 25,
    baseMaxDamage: 35,
    sound: 'push'
  },
  kotaro_jump: {
    id: 'kotaro_jump',
    name: 'Tactical Leap',
    icon: './assets/skills/heroes/shinji/3.png',
    paCost: 3,
    minRange: 2,
    maxRange: 3,
    requiresLoS: false,
    isLinear: false,
    targetType: 'empty',
    areaType: 'cross1',
    description: 'Leap over any obstacle to an empty tile. Grants +40 Shield and deals 25 damage to adjacent enemies upon landing.',
    shieldAmount: 40,
    baseMinDamage: 22,
    baseMaxDamage: 28,
    sound: 'explosion'
  },
  bird_cupid: {
    id: 'bird_cupid',
    name: 'Cupid Arrow',
    icon: './assets/skills/heroes/early-bird/1.png',
    paCost: 3,
    minRange: 1,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    description: 'Accurate aerial ranged shot (1-4 Range) dealing 70-85 piercing aerial damage.',
    baseMinDamage: 70,
    baseMaxDamage: 85,
    sound: 'bow'
  },
  bird_owl: {
    id: 'bird_owl',
    name: 'Owl Gaze',
    icon: './assets/skills/heroes/early-bird/2.png',
    paCost: 2,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    buffSelfPM: 1,
    description: 'Swift attack with piercing gaze (1-3 Range) dealing 35-45 damage and hastening the hero (+1 MP).',
    baseMinDamage: 35,
    baseMaxDamage: 45,
    sound: 'bow'
  },
  bird_aerial_jump: {
    id: 'bird_aerial_jump',
    name: 'Aerial Leap',
    icon: './assets/skills/heroes/early-bird/3.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: false,
    isLinear: false,
    targetType: 'empty',
    areaType: 'cross1',
    shieldAmount: 30,
    description: 'Unfurls wings and glides over any obstacle (2-4 Range). Grants +30 Shield and deals 25 damage in a cross upon landing.',
    baseMinDamage: 22,
    baseMaxDamage: 28,
    sound: 'explosion'
  },
  plant_cactus: {
    id: 'plant_cactus',
    name: 'Cactus Strike',
    icon: './assets/skills/heroes/big-yak/1.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    description: 'Spiky blunt strike dealing 65-80 physical damage that shreds enemy armor.',
    baseMinDamage: 65,
    baseMaxDamage: 80,
    sound: 'melee'
  },
  plant_drain: {
    id: 'plant_drain',
    name: 'Zigzag Bite',
    icon: './assets/skills/heroes/big-yak/2.png',
    paCost: 2,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    drainHeal: 35,
    description: 'Drains vital energy from the opponent (1-2 Range), dealing 40-50 damage and restoring 35 HP to the hero.',
    baseMinDamage: 40,
    baseMaxDamage: 50,
    sound: 'melee'
  },
  plant_shield: {
    id: 'plant_shield',
    name: 'Bidens Carapace',
    icon: './assets/skills/heroes/big-yak/3.png',
    paCost: 2,
    minRange: 0,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 90,
    description: 'Deploys a dense carapace of thorns granting a massive +90 shield protection to an ally or self.',
    sound: 'buff'
  },
  bing_explosive: {
    id: 'bing_explosive',
    name: 'Explosive Arrow',
    icon: './assets/skills/heroes/bing/1.png',
    paCost: 4,
    minRange: 3,
    maxRange: 6,
    requiresLoS: true,
    isLinear: false,
    targetType: 'all',
    areaType: 'cross1',
    description: 'Fires a blazing arrow detonating in a cross (5 tiles), dealing 45-55 fire damage to all affected.',
    baseMinDamage: 45,
    baseMaxDamage: 55,
    sound: 'explosion'
  },
  bing_retreat: {
    id: 'bing_retreat',
    name: 'Knockback Arrow',
    icon: './assets/skills/heroes/bing/2.png',
    paCost: 3,
    minRange: 1,
    maxRange: 4,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 3,
    description: 'Linear shot dealing 35 damage and knocking back 3 tiles. Devastating for pushing threats away or slamming them into rocks.',
    baseMinDamage: 32,
    baseMaxDamage: 38,
    sound: 'push'
  },
  bing_slow: {
    id: 'bing_slow',
    name: 'Slowing Arrow',
    icon: './assets/skills/heroes/bing/3.png',
    paCost: 3,
    minRange: 2,
    maxRange: 5,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    debuffPM: 1,
    description: 'Freezing arrow dealing 30 damage and inflicting -1 MP on the target on their next turn.',
    baseMinDamage: 28,
    baseMaxDamage: 34,
    sound: 'bow'
  },
  pomodoro_heal: {
    id: 'pomodoro_heal',
    name: 'Word of Healing',
    icon: './assets/skills/heroes/pomodoro/1.png',
    paCost: 3,
    minRange: 0,
    maxRange: 5,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    description: 'Channels celestial dew of Lunacia to restore 55-70 HP to an ally or self.',
    baseMinHeal: 55,
    baseMaxHeal: 70,
    sound: 'heal'
  },
  pomodoro_stim: {
    id: 'pomodoro_stim',
    name: 'Runic Stim',
    icon: './assets/skills/heroes/pomodoro/2.png',
    paCost: 2,
    minRange: 0,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    buffPA: 2,
    description: 'Injects ancestral runic energy. Grants +2 AP on the next turn to an ally or self.',
    sound: 'buff'
  },
  pomodoro_bramble: {
    id: 'pomodoro_bramble',
    name: 'Entangling Bramble',
    icon: './assets/skills/heroes/pomodoro/3.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    debuffPM: 2,
    description: 'Thorny vines sprout from the ground. Deals 25 earth damage and roots the enemy, inflicting -2 MP.',
    baseMinDamage: 22,
    baseMaxDamage: 28,
    sound: 'melee'
  },
  chimera_bite: {
    id: 'chimera_bite',
    name: 'Fierce Bite',
    icon: './assets/skills/mobs/slime/slime-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 35,
    baseMaxDamage: 45,
    sound: 'melee'
  },
  chimera_bellow: {
    id: 'chimera_bellow',
    name: 'Seismic Roar',
    icon: './assets/skills/mobs/werewolf-boss/werewolf-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 25,
    baseMaxDamage: 32,
    sound: 'push'
  },
  chimera_spit: {
    id: 'chimera_spit',
    name: 'Acid Spit',
    icon: './assets/skills/mobs/slime-attack/aqua-slime-atk-02-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'bow'
  },
  chimera_heal: {
    id: 'chimera_heal',
    name: 'Regenerative Howl',
    icon: './assets/skills/mobs/slime-support/aqua-slime-boss-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    baseMinHeal: 40,
    baseMaxHeal: 55,
    sound: 'heal'
  },
  chimera_frost_nova: {
    id: 'chimera_frost_nova',
    name: 'Puffy\'s Glacial Nova',
    icon: './assets/skills/mobs/treant-flower/flowering-treant-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 35,
    baseMaxDamage: 45,
    sound: 'ice'
  },
  kibo_cataclysm: {
    id: 'kibo_cataclysm',
    name: 'Chimera Cataclysm',
    icon: './assets/skills/mobs/werewolf-boss/tool-chimerafragilebeing-02-00.png',
    paCost: 5,
    minRange: 2,
    maxRange: 5,
    requiresLoS: false,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 55,
    baseMaxDamage: 75,
    sound: 'explosion'
  },

  // ==========================================
  // --- HABILIDADES ESPECÍFICAS DE ENEMIGOS ---
  // ==========================================

  // --- 1. Slime Común ---
  slime_strike: {
    id: 'slime_strike',
    name: 'Viscous Strike',
    icon: './assets/skills/mobs/slime/slime-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'melee',
    description: 'Heavy bludgeon with dense gelatinous mass.'
  },
  slime_barrier: {
    id: 'slime_barrier',
    name: 'Gelatinous Shield',
    icon: './assets/skills/mobs/slime/aqua-slime-def-01-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 30,
    sound: 'buff',
    description: 'Creates a protective film granting +30 shield.'
  },

  // --- 2. Slime Attack ---
  slime_attack_spit: {
    id: 'slime_attack_spit',
    name: 'Acid Shot',
    icon: './assets/skills/mobs/slime-attack/aqua-slime-atk-02-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'bow',
    description: 'Corrosive projectile fired from a distance.'
  },
  slime_attack_goo: {
    id: 'slime_attack_goo',
    name: 'Debilitating Slime',
    icon: './assets/skills/mobs/slime-attack/tool-chimeraapplygoonweak-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 26,
    baseMaxDamage: 34,
    sound: 'melee',
    description: 'Viscous splatter that damages and slightly stuns.'
  },

  // --- 3. Slime Defense ---
  slime_defense_slam: {
    id: 'slime_defense_slam',
    name: 'Liquid Rock Charge',
    icon: './assets/skills/mobs/slime-defense/aqua-slime-boss-04-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'push',
    description: 'Battering ram strike that pushes the target 1 tile.'
  },
  slime_defense_barrier: {
    id: 'slime_defense_barrier',
    name: 'Viscous Carapace',
    icon: './assets/skills/mobs/slime-defense/aqua-slime-def-03-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 45,
    sound: 'buff',
    description: 'Solidifies the body granting +45 shield.'
  },

  // --- 4. Slime Support ---
  slime_support_pinch: {
    id: 'slime_support_pinch',
    name: 'Slime Pinch',
    icon: './assets/skills/mobs/slime-support/aqua-slime-atk-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 22,
    baseMaxDamage: 30,
    sound: 'melee',
    description: 'Attack with gelatinous pseudopod.'
  },
  slime_support_heal: {
    id: 'slime_support_heal',
    name: 'Regenerative Mist',
    icon: './assets/skills/mobs/slime-support/aqua-slime-boss-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    baseMinHeal: 40,
    baseMaxHeal: 55,
    sound: 'heal',
    description: 'Watery balm that restores health to an ally.'
  },

  // --- 5. Slime Forest A (Sabana) ---
  slime_forest_a_swipe: {
    id: 'slime_forest_a_swipe',
    name: 'Floral Swipe',
    icon: './assets/skills/mobs/slime-forest-a/forest-slime-flower-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'melee',
    description: 'Botanical slash with flower thorns.'
  },
  slime_forest_a_spit: {
    id: 'slime_forest_a_spit',
    name: 'Acid Pollen',
    icon: './assets/skills/mobs/slime-forest-a/forest-slime-flower-03-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'bow',
    description: 'Ranged blast of irritating pollen.'
  },
  slime_forest_a_thorn: {
    id: 'slime_forest_a_thorn',
    name: 'Thorny Sprout',
    icon: './assets/skills/mobs/slime-forest-a/forest-slime-flower-04-00.png',
    paCost: 2,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 22,
    baseMaxDamage: 30,
    sound: 'bow',
    description: 'Rapid barrage of plant spikes.'
  },

  // --- 6. Wolf Aquatic (Sabana) ---
  wolf_aquatic_bite: {
    id: 'wolf_aquatic_bite',
    name: 'Aquatic Bite',
    icon: './assets/skills/mobs/wolf-aquatic/aqua-wolf-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 38,
    baseMaxDamage: 50,
    sound: 'melee',
    description: 'Lunging bite infused with ocean currents.'
  },

  // --- 7. Wolf Aquatic Alpha (Sabana) ---
  wolf_aquatic_alpha_splash: {
    id: 'wolf_aquatic_alpha_splash',
    name: 'Tidal Bite',
    icon: './assets/skills/mobs/wolf-aquatic-alpha/tool-chimerasplash-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 44,
    baseMaxDamage: 56,
    sound: 'melee',
    description: 'Torrential bite that batters the enemy.'
  },
  wolf_aquatic_alpha_roar: {
    id: 'wolf_aquatic_alpha_roar',
    name: 'Ancestral Roar',
    icon: './assets/skills/mobs/wolf-aquatic-alpha/tool-chimeraelderprotection-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 28,
    baseMaxDamage: 36,
    sound: 'push',
    description: 'Bellow that repels the enemy 1 tile.'
  },

  // --- 8. Wolf Gray (Ártico) ---
  wolf_gray_bite: {
    id: 'wolf_gray_bite',
    name: 'Frost Bite',
    icon: './assets/skills/mobs/wolf-gray/gray-wolf-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 40,
    baseMaxDamage: 52,
    sound: 'melee',
    description: 'Chilling jaws that freeze the target.'
  },
  wolf_gray_slash: {
    id: 'wolf_gray_slash',
    name: 'Glacial Claw',
    icon: './assets/skills/mobs/wolf-gray/alpha-wolf-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 36,
    baseMaxDamage: 46,
    sound: 'melee',
    description: 'Razor ice claws delivering a swift rend.'
  },

  // --- 9. Wolf Alpha (Ártico) ---
  wolf_alpha_bite: {
    id: 'wolf_alpha_bite',
    name: 'Savage Bite',
    icon: './assets/skills/mobs/wolf-alpha/tool-chimerabloodybite-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 48,
    baseMaxDamage: 62,
    sound: 'melee',
    description: 'Alpha leader rend dealing severe damage.'
  },
  wolf_alpha_roar: {
    id: 'wolf_alpha_roar',
    name: 'Polar Howl',
    icon: './assets/skills/mobs/wolf-gray/alpha-wolf-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'push',
    description: 'Intimidating howl that knocks back the victim.'
  },
  wolf_alpha_nova: {
    id: 'wolf_alpha_nova',
    name: 'Blizzard Fury',
    icon: './assets/skills/mobs/wolf-gray/werewolf-04-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 36,
    baseMaxDamage: 48,
    sound: 'ice',
    description: 'Chilling gale punishing in a cross (5 tiles).'
  },

  // --- 10. Treant Flower (Ártico) ---
  treant_flower_slam: {
    id: 'treant_flower_slam',
    name: 'Frozen Root Strike',
    icon: './assets/skills/mobs/treant-flower/flowering-treant-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 42,
    baseMaxDamage: 54,
    sound: 'melee',
    description: 'Crushing blow from frost-covered roots.'
  },
  treant_flower_nova: {
    id: 'treant_flower_nova',
    name: 'Glacial Spores',
    icon: './assets/skills/mobs/treant-flower/flowering-treant-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 34,
    baseMaxDamage: 45,
    sound: 'ice',
    description: 'Botanical ice blast in a cross.'
  },

  // --- 11. Treant Fighter ---
  treant_fighter_punch: {
    id: 'treant_fighter_punch',
    name: 'Oak Fist',
    icon: './assets/skills/mobs/treant-fighter/treant-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 45,
    baseMaxDamage: 58,
    sound: 'melee',
    description: 'Devastating punch with solid hardwood knuckles.'
  },
  treant_fighter_bash: {
    id: 'treant_fighter_bash',
    name: 'Sylvan Bash',
    icon: './assets/skills/mobs/treant-fighter/treant-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'push',
    description: 'Heavy blow that knocks the enemy back 1 tile.'
  },
  treant_fighter_bark: {
    id: 'treant_fighter_bark',
    name: 'Thick Bark',
    icon: './assets/skills/mobs/treant-fighter/tool-chimerathickbark-02-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 55,
    sound: 'buff',
    description: 'Hardens plant skin granting +55 shield.'
  },

  // --- 12. Dryad Fighter (Místico) ---
  dryad_fighter_blade: {
    id: 'dryad_fighter_blade',
    name: 'Sylvan Blade',
    icon: './assets/skills/mobs/dryad-fighter/dryad-fighter-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 42,
    baseMaxDamage: 55,
    sound: 'melee',
    description: 'Magical thrust infused with ancient sap.'
  },
  dryad_fighter_dance: {
    id: 'dryad_fighter_dance',
    name: 'Thorn Dance',
    icon: './assets/skills/mobs/dryad-fighter/dryad-fighter-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'push',
    description: 'Agile spin with thorns that pushes the target 1 tile.'
  },
  dryad_fighter_slash: {
    id: 'dryad_fighter_slash',
    name: 'Astral Slash',
    icon: './assets/skills/mobs/dryad-fighter/dryad-fighter-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 38,
    baseMaxDamage: 50,
    sound: 'melee',
    description: 'Luminous slash tearing with stellar energy.'
  },

  // --- 13. Dryad Mage (Místico) ---
  dryad_mage_spark: {
    id: 'dryad_mage_spark',
    name: 'Astral Spark',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-01-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 35,
    baseMaxDamage: 46,
    sound: 'bow',
    description: 'Guided burst of stardust from a distance.'
  },
  dryad_mage_heal: {
    id: 'dryad_mage_heal',
    name: 'Elven Dew',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    baseMinHeal: 45,
    baseMaxHeal: 60,
    sound: 'heal',
    description: 'Restorative essence healing an ally\'s wounds.'
  },
  dryad_mage_burst: {
    id: 'dryad_mage_burst',
    name: 'Cosmic Channeling',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 34,
    baseMaxDamage: 45,
    sound: 'ice',
    description: 'Violet energy detonation in a cross area.'
  },

  // --- 14. Dryad Range (Místico) ---
  dryad_range_arrow: {
    id: 'dryad_range_arrow',
    name: 'Vine Arrow',
    icon: './assets/skills/mobs/dryad-range/dryad-ranger-02-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 36,
    baseMaxDamage: 48,
    sound: 'bow',
    description: 'Precise botanical shaft fired with sylvan bow.'
  },
  dryad_range_snipe: {
    id: 'dryad_range_snipe',
    name: 'Piercing Shot',
    icon: './assets/skills/mobs/dryad-range/dryad-ranger-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 38,
    baseMaxDamage: 50,
    sound: 'bow',
    description: 'Focused high-range shot with armor penetration.'
  },
  dryad_range_root: {
    id: 'dryad_range_root',
    name: 'Restraining Bramble',
    icon: './assets/skills/mobs/dryad-range/flowering-treant-01-00.png',
    paCost: 2,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 24,
    baseMaxDamage: 32,
    sound: 'melee',
    description: 'Thorn whip punishing at close quarters.'
  },

  // --- 15. Slime Forest B (Mazmorra) ---
  slime_forest_b_slam: {
    id: 'slime_forest_b_slam',
    name: 'Cavern Slam',
    icon: './assets/skills/mobs/slime-forest-b/forest-slime-fighter-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 40,
    baseMaxDamage: 52,
    sound: 'melee',
    description: 'Heavy strike of hardened dark slime.'
  },
  slime_forest_b_spit: {
    id: 'slime_forest_b_spit',
    name: 'Volcanic Bile',
    icon: './assets/skills/mobs/slime-forest-b/forest-slime-fighter-03-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 34,
    baseMaxDamage: 45,
    sound: 'bow',
    description: 'Stream of toxic fluids and subterranean magma.'
  },
  slime_forest_b_heavy: {
    id: 'slime_forest_b_heavy',
    name: 'Seismic Charge',
    icon: './assets/skills/mobs/slime-forest-b/forest-slime-fighter-04-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'push',
    description: 'Brutal charge that knocks back 1 tile.'
  },

  // --- 16. Slime Fusion (Mazmorra) ---
  slime_fusion_burst: {
    id: 'slime_fusion_burst',
    name: 'Magma Fusion',
    icon: './assets/skills/mobs/slime-fusion/aqua-slime-boss-05-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 40,
    baseMaxDamage: 54,
    sound: 'explosion',
    description: 'Fiery explosion from fusing viscous cores.'
  },

  // --- 17. Werewolf Boss (Mazmorra Boss) ---
  werewolf_boss_bite: {
    id: 'werewolf_boss_bite',
    name: 'Lupine Rend',
    icon: './assets/skills/mobs/werewolf-boss/werewolf-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 58,
    baseMaxDamage: 75,
    sound: 'melee',
    description: 'Colossal bite of supreme lycanthrope.'
  },
  werewolf_boss_roar: {
    id: 'werewolf_boss_roar',
    name: 'Terrifying Howl',
    icon: './assets/skills/mobs/werewolf-boss/werewolf-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 2,
    baseMinDamage: 38,
    baseMaxDamage: 50,
    sound: 'push',
    description: 'Devastating sonic wave repelling 2 tiles.'
  },
  werewolf_boss_cataclysm: {
    id: 'werewolf_boss_cataclysm',
    name: 'Beast Cataclysm',
    icon: './assets/skills/mobs/werewolf-boss/tool-chimerafragilebeing-02-00.png',
    paCost: 5,
    minRange: 2,
    maxRange: 5,
    requiresLoS: false,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 60,
    baseMaxDamage: 80,
    sound: 'explosion',
    description: 'Unleashes dark eclipse power in a massive cataclysm.'
  },

  // --- 18. Bear Mom (Mazmorra) ---
  bear_mom_strike: {
    id: 'bear_mom_strike',
    name: 'Ladle Strike',
    icon: './assets/skills/mobs/bear-mom/tool-chimeraladdlestrike-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 52,
    baseMaxDamage: 68,
    sound: 'melee',
    description: 'Relentless bludgeoning with a war ladle.'
  },
  bear_mom_roar: {
    id: 'bear_mom_roar',
    name: 'Maternal Fury',
    icon: './assets/skills/mobs/bear-mom/mommy-bear-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 36,
    baseMaxDamage: 48,
    sound: 'push',
    description: 'Protective roar stunning and pushing 1 tile.'
  },
  bear_mom_slam: {
    id: 'bear_mom_slam',
    name: 'Sylvan Claw',
    icon: './assets/skills/mobs/bear-mom/treant-fighter-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 48,
    baseMaxDamage: 62,
    sound: 'melee',
    description: 'Claw swipe that shakes the ground.'
  },

  // --- 19. Bear Dad (Mazmorra Boss) ---
  bear_dad_claw: {
    id: 'bear_dad_claw',
    name: 'Colossal Claw',
    icon: './assets/skills/mobs/bear-dad/daddy-bear-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 58,
    baseMaxDamage: 75,
    sound: 'melee',
    description: 'Devastating giant bear swipe crushing prey.'
  },
  bear_dad_roar: {
    id: 'bear_dad_roar',
    name: 'Earthquake Roar',
    icon: './assets/skills/mobs/bear-dad/daddy-bear-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 40,
    baseMaxDamage: 52,
    sound: 'push',
    description: 'Colossal bellow knocking back 1 tile causing a tremor.'
  },
  bear_dad_shield: {
    id: 'bear_dad_shield',
    name: 'Paternal Protection',
    icon: './assets/skills/mobs/bear-dad/tool-chimerapapaprotection-02-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 70,
    sound: 'buff',
    description: 'Deploys a protective barrier granting +70 shield.'
  },
  bear_dad_slam: {
    id: 'bear_dad_slam',
    name: 'Titanic Bash',
    icon: './assets/skills/mobs/bear-dad/daddy-bear-04-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 52,
    baseMaxDamage: 68,
    sound: 'melee',
    description: 'Unleashes full weight into a crushing blow.'
  }
};

export class SpellManager {
  constructor(gridManager, sceneManager, audio, combatText, game = null) {
    this.gridManager = gridManager;
    this.sceneManager = sceneManager;
    this.audio = audio;
    this.combatText = combatText;
    this.game = game;
    this.vfx = new VFXManager(this.sceneManager.scene, this.gridManager);
  }

  getSpell(spellId) {
    return SPELLS_DB[spellId] || null;
  }

  getValidTargetCells(caster, spell) {
    const validCells = [];
    const fromX = caster.gridX;
    const fromZ = caster.gridZ;

    for (let x = 0; x < this.gridManager.width; x++) {
      for (let z = 0; z < this.gridManager.height; z++) {
        const dist = Math.abs(x - fromX) + Math.abs(z - fromZ);
        if (dist < spell.minRange || dist > spell.maxRange) continue;

        if (spell.isLinear && (x !== fromX && z !== fromZ)) continue;

        if (spell.requiresLoS && !this.gridManager.hasLineOfSight({ x: fromX, z: fromZ }, { x, z })) {
          continue;
        }

        const tile = this.gridManager.getTile(x, z);

        if (spell.targetType === 'empty') {
          if (!tile.walkable || tile.obstacle || tile.unit) continue;
        } else if (spell.targetType === 'enemy') {
          if (tile.unit && tile.unit.team === caster.team && dist > 0) continue;
        } else if (spell.targetType === 'ally') {
          if (tile.unit && tile.unit.team !== caster.team) continue;
        }

        validCells.push({ x, z });
      }
    }
    return validCells;
  }

  getAoECells(targetCell, spell) {
    const cells = [{ x: targetCell.x, z: targetCell.z }];
    if (spell.areaType === 'cross1') {
      const offsets = [
        { dx: 1, dz: 0 },
        { dx: -1, dz: 0 },
        { dx: 0, dz: 1 },
        { dx: 0, dz: -1 }
      ];
      offsets.forEach(off => {
        const nx = targetCell.x + off.dx;
        const nz = targetCell.z + off.dz;
        if (this.gridManager.isValidCoord(nx, nz)) {
          cells.push({ x: nx, z: nz });
        }
      });
    }
    return cells;
  }

  async castSpell(caster, spell, targetCell) {
    if (caster.currentPA < spell.paCost) return false;

    caster.currentPA -= spell.paCost;
    caster.updateHUD();

    const worldCasterPos = this.gridManager.gridToWorld(caster.gridX, caster.gridZ);
    this.combatText.spawn(worldCasterPos, '-' + spell.paCost + ' PA', 'pa');

    const targetWorldPos = this.gridManager.gridToWorld(targetCell.x, targetCell.z);
    const dirX = targetWorldPos.x - worldCasterPos.x;
    const dirZ = targetWorldPos.z - worldCasterPos.z;
    if (caster.mesh && (dirX !== 0 || dirZ !== 0)) {
      caster.mesh.rotation.y = Math.atan2(dirX, dirZ);
    }

    this._playSpellSound(spell.sound);

    if (spell.targetType === 'empty') {
      await this._executeJump(caster, spell, targetCell);
      return true;
    }

    if (typeof caster.playAttackAnimation === 'function') {
      caster.playAttackAnimation();
    } else if (caster.attackClip) {
      caster.attackClip.reset().fadeIn(0.08).play();
      setTimeout(() => {
        if (caster.idleClip) caster.idleClip.reset().fadeIn(0.15).play();
        if (caster.attackClip) caster.attackClip.fadeOut(0.15);
      }, 350);
    }

    // 1. Ranged spells spawn juicy 3D projectiles traveling with parabolic arcs & trails
    const dist = Math.abs(targetCell.x - caster.gridX) + Math.abs(targetCell.z - caster.gridZ);
    const isRanged = dist > 1 || spell.maxRange > 1 || spell.id.includes('bow') || spell.id.includes('cupid') || spell.id.includes('owl') || spell.id.includes('spit') || spell.id.includes('explosive') || spell.id.includes('slow') || spell.id.includes('heal') || spell.id.includes('stim') || spell.id.includes('bramble') || spell.id.includes('bellow') || (spell.targetType === 'ally' && spell.maxRange > 0);

    if (isRanged) {
      await this._spawnProjectile(worldCasterPos, targetWorldPos, spell);
    }

    // 2. Spawn 3D Impact VFX: ground shockwave ring + particle spark burst + tile decal
    this._spawnImpactVFX(targetWorldPos, spell);

    const affectedCells = this.getAoECells(targetCell, spell);

    // 3. Trigger skill-specific 3D VFX (Slash arcs, heal beams, ice spikes, firebursts, sonic rings)
    const sid = spell.id;
    const isMeleeHit = sid === 'kotaro_slash' || sid === 'chimera_bite' || sid === 'plant_cactus' ||
      spell.sound === 'melee' || sid.includes('bite') || sid.includes('slash') || sid.includes('strike') ||
      sid.includes('claw') || sid.includes('slam') || sid.includes('punch') || sid.includes('swipe') ||
      sid.includes('goo') || sid.includes('root') || sid.includes('bash');

    const isBellowHit = sid === 'kotaro_push' || sid === 'chimera_bellow' || sid === 'bird_owl' ||
      spell.sound === 'push' || sid.includes('bellow') || sid.includes('roar') || sid.includes('dance');

    if (isMeleeHit) {
      const slashColor = sid === 'plant_cactus' ? 0x22c55e : (sid === 'kotaro_slash' ? 0xfbbf24 : 0xef4444);
      this.vfx.playMeleeSlash(worldCasterPos, targetWorldPos, slashColor);
    } else if (isBellowHit) {
      this.vfx.playSonicBellow(worldCasterPos, targetWorldPos);
    } else if (sid === 'plant_drain' || sid === 'pomodoro_bramble' || sid.includes('thorn')) {
      this.vfx.playEarthBramble(targetWorldPos);
    } else if (sid === 'plant_shield' || sid === 'pomodoro_heal' || sid === 'chimera_heal' || spell.sound === 'heal' || spell.baseMinHeal || spell.shieldAmount) {
      this.vfx.playHealPillar(targetWorldPos);
    } else if (sid === 'bing_explosive' || spell.sound === 'explosion' || sid.includes('cataclysm') || sid.includes('burst')) {
      this.vfx.playFireDetonation(targetWorldPos, affectedCells);
    } else if (sid === 'bing_slow' || spell.sound === 'ice' || sid.includes('frost') || sid.includes('nova')) {
      this.vfx.playIceSpikes(targetWorldPos);
    }

    for (const cell of affectedCells) {
      const tile = this.gridManager.getTile(cell.x, cell.z);
      if (!tile) continue;

      const targetUnit = tile.unit;

      if (spell.baseMinHeal && targetUnit) {
        const mult = this._getSpellMultiplier(caster, spell);
        let healAmt = Math.floor((spell.baseMinHeal + Math.random() * (spell.baseMaxHeal - spell.baseMinHeal + 1)) * mult);
        if (caster && caster.supportPower) {
          healAmt = Math.round(healAmt * (1 + caster.supportPower / 100));
        }
        const actual = targetUnit.heal(healAmt);
        const wPos = this.gridManager.gridToWorld(targetUnit.gridX, targetUnit.gridZ);
        this.combatText.spawn(wPos, '+' + actual + ' HP', 'heal');
      }

      if (spell.buffPA && targetUnit) {
        targetUnit.buffs.push({ type: 'bonusPA', value: spell.buffPA, duration: 1 });
        const wPos = this.gridManager.gridToWorld(targetUnit.gridX, targetUnit.gridZ);
        this.combatText.spawn(wPos, '+' + spell.buffPA + ' PA', 'buff');
      }

      if (spell.shieldAmount && targetUnit && spell.targetType === 'ally') {
        const mult = this._getSpellMultiplier(caster, spell);
        let sAmt = Math.round(spell.shieldAmount * mult);
        if (caster && caster.supportPower) {
          sAmt = Math.round(sAmt * (1 + caster.supportPower / 100));
        }
        targetUnit.shield = (targetUnit.shield || 0) + sAmt;
        targetUnit.updateHUD();
        const wPos = this.gridManager.gridToWorld(targetUnit.gridX, targetUnit.gridZ);
        this.combatText.spawn(wPos, '🛡️ +' + sAmt, 'shield');
      }

      if (spell.baseMinDamage && targetUnit) {
        const mult = this._getSpellMultiplier(caster, spell);
        let dmg = Math.floor((spell.baseMinDamage + Math.random() * (spell.baseMaxDamage - spell.baseMinDamage + 1)) * mult);
        if (caster) {
          if ((spell.id.startsWith('kotaro_') || spell.id.startsWith('plant_')) && caster.bonusMeleeDamage) {
            dmg += Math.round(caster.bonusMeleeDamage);
          } else if ((spell.id.startsWith('bing_') || spell.id.startsWith('bird_')) && caster.bonusRangedDamage) {
            dmg += Math.round(caster.bonusRangedDamage);
          } else if (spell.id.startsWith('pomodoro_') && caster.bonusMagicDamage) {
            dmg += Math.round(caster.bonusMagicDamage);
          } else if (caster.bonusDamage) {
            dmg += caster.bonusDamage;
          }
        }

        // Check if tutorial is currently active
        const isTutorial = Boolean(this.game && this.game.tutorialManager && this.game.tutorialManager.isActive);

        // In tutorial, critical hits are disabled to prevent accidental one-shots of tutorial enemies
        const critChance = 0.20 + ((caster.critRate || 0) / 100);
        const isCrit = !isTutorial && (Math.random() < critChance);
        if (isCrit) {
          dmg = Math.round(dmg * 1.5);
        }

        // In tutorial step_attack_2, Quimera Guardián must NEVER die on the first attack (must take its turn and attack Kotaro)
        if (isTutorial && targetUnit.id === 'quimera_guard' && this.game.tutorialManager.getCurrentStepId() === 'step_attack_2') {
          dmg = Math.min(dmg, Math.max(1, targetUnit.currentHP - 25));
        }

        const initialShield = targetUnit.shield || 0;
        const actual = targetUnit.takeDamage(dmg);
        const shieldAbsorbed = Math.max(0, initialShield - (targetUnit.shield || 0));
        const wPos = this.gridManager.gridToWorld(targetUnit.gridX, targetUnit.gridZ);

        if (shieldAbsorbed > 0 && actual === 0) {
          this.combatText.spawn(wPos, '🛡️ -' + shieldAbsorbed, 'shield');
          this.sceneManager.shake(0.12);
        } else if (shieldAbsorbed > 0 && actual > 0) {
          this.combatText.spawn(wPos, '🛡️ -' + shieldAbsorbed + '  -' + actual, 'damage');
          this.sceneManager.shake(0.18);
        } else if (isCrit) {
          this.combatText.spawn(wPos, 'CRITICAL! -' + actual, 'crit');
          this.sceneManager.shake(0.32);
        } else {
          this.combatText.spawn(wPos, '-' + actual, 'damage');
          this.sceneManager.shake(0.14);
        }

        if (spell.debuffPM) {
          targetUnit.buffs.push({ type: 'minusPM', value: spell.debuffPM, duration: 1 });
          this.combatText.spawn(wPos, '-' + spell.debuffPM + ' PM', 'pm');
        }

        if (spell.drainHeal && caster && !caster.isDead) {
          const multD = this._getSpellMultiplier(caster, spell);
          const healVal = Math.round(spell.drainHeal * multD);
          const actualHeal = caster.heal(healVal);
          const casterPos = this.gridManager.gridToWorld(caster.gridX, caster.gridZ);
          this.combatText.spawn(casterPos, '+' + actualHeal + ' HP', 'heal');
        }

        if (spell.buffSelfPM && caster && !caster.isDead) {
          caster.currentPM = Math.min(caster.maxPM + 1, caster.currentPM + spell.buffSelfPM);
          caster.updateHUD();
          const casterPos = this.gridManager.gridToWorld(caster.gridX, caster.gridZ);
          this.combatText.spawn(casterPos, '+' + spell.buffSelfPM + ' PM', 'buff');
        }

        if (spell.pushDistance && !targetUnit.isDead) {
          await this._executePushback(caster, targetUnit, spell.pushDistance);
        }
      }
    }

    return true;
  }

  _getSpellMultiplier(caster, spell) {
    if (!caster || typeof caster.getSkillLevel !== 'function') return 1.0;
    const level = caster.getSkillLevel(spell.id);
    // Level 1: 100%, Level 2: 120%, Level 3: 140%, Level 4: 160%, Level 5: 185%
    const multipliers = [1.0, 1.0, 1.20, 1.40, 1.60, 1.85];
    return multipliers[Math.min(5, Math.max(1, level))];
  }

  async _executeJump(caster, spell, targetCell) {
    const oldTile = this.gridManager.getTile(caster.gridX, caster.gridZ);
    if (oldTile && oldTile.unit === caster) oldTile.unit = null;

    const newTile = this.gridManager.getTile(targetCell.x, targetCell.z);
    if (newTile) {
      if (newTile.unit && newTile.unit !== caster) return false;
      newTile.unit = caster;
    }

    await caster._hopToCell(targetCell.x, targetCell.z, 0.45);
    caster.gridX = targetCell.x;
    caster.gridZ = targetCell.z;
    caster.updateHUD();

    const targetWorldPos = this.gridManager.gridToWorld(targetCell.x, targetCell.z);
    this._spawnImpactVFX(targetWorldPos, { id: 'jump_landing' });

    if (spell.shieldAmount) {
      const mult = this._getSpellMultiplier(caster, spell);
      let shieldAmt = Math.round(spell.shieldAmount * mult);
      if (caster && caster.supportPower) {
        shieldAmt = Math.round(shieldAmt * (1 + caster.supportPower / 100));
      }
      caster.addShield(shieldAmt);
      this.combatText.spawn(targetWorldPos, '+' + shieldAmt + ' SHIELD', 'shield');
    }

    const adjacent = [
      { x: targetCell.x + 1, z: targetCell.z },
      { x: targetCell.x - 1, z: targetCell.z },
      { x: targetCell.x, z: targetCell.z + 1 },
      { x: targetCell.x, z: targetCell.z - 1 }
    ];

    adjacent.forEach(adj => {
      const tile = this.gridManager.getTile(adj.x, adj.z);
      if (tile && tile.unit && tile.unit.team !== caster.team) {
        const mult = this._getSpellMultiplier(caster, spell);
        let dmg = Math.floor((spell.baseMinDamage + Math.random() * (spell.baseMaxDamage - spell.baseMinDamage + 1)) * mult);
        if (caster) {
          if (caster.bonusMeleeDamage) dmg += Math.round(caster.bonusMeleeDamage);
          else if (caster.bonusDamage) dmg += caster.bonusDamage;
        }
        const actual = tile.unit.takeDamage(dmg);
        const wPos = this.gridManager.gridToWorld(tile.unit.gridX, tile.unit.gridZ);
        this.combatText.spawn(wPos, '-' + actual, 'damage');
      }
    });

    this.sceneManager.shake(0.24);
  }

  async _executePushback(caster, targetUnit, distance) {
    const dx = Math.sign(targetUnit.gridX - caster.gridX);
    const dz = Math.sign(targetUnit.gridZ - caster.gridZ);

    this.audio.playPushback();

    const pushResult = await targetUnit.pushback(dx, dz, distance);

    if (pushResult.hitObstacle && pushResult.remainingTiles > 0) {
      // Small 70ms delay: just an instant after attack damage so texts don't overlap while feeling immediate
      await new Promise(r => setTimeout(r, 70));

      const extraCollision = Math.round((caster && caster.collisionBonus) || 0);
      const collisionDamage = pushResult.remainingTiles * 20 + extraCollision;
      this.audio.playCollision();
      this.sceneManager.shake(0.35);

      const targetPos = this.gridManager.gridToWorld(targetUnit.gridX, targetUnit.gridZ);
      this._spawnImpactVFX(targetPos, { id: 'collision' });
      this.combatText.spawn(targetPos, '💥 COLLISION! -' + collisionDamage, 'collision');
      targetUnit.takeDamage(collisionDamage);

      if (pushResult.collidingUnit) {
        const collPos = this.gridManager.gridToWorld(pushResult.collidingUnit.gridX, pushResult.collidingUnit.gridZ);
        this._spawnImpactVFX(collPos, { id: 'collision' });
        this.combatText.spawn(collPos, '💥 COLLISION! -' + collisionDamage, 'collision');
        pushResult.collidingUnit.takeDamage(collisionDamage);
      }
    }
  }

  _spawnProjectile(fromPos, toPos, spell) {
    return new Promise(resolve => {
      const scene = this.sceneManager.scene;
      const group = new THREE.Group();

      let mainColor = 0xffffff;
      let emissiveColor = 0xffffff;
      let particleColor = 0xffffff;
      let lightColor = 0xffffff;
      let geo;

      if (spell.id === 'bird_cupid') {
        mainColor = 0xf43f5e;
        emissiveColor = 0xfb7185;
        particleColor = 0xfecdd3;
        lightColor = 0xf43f5e;
        geo = new THREE.ConeGeometry(0.15, 0.45, 8);
      } else if (spell.id === 'bird_owl') {
        mainColor = 0xa855f7;
        emissiveColor = 0x9333ea;
        particleColor = 0xd8b4fe;
        lightColor = 0xc084fc;
        geo = new THREE.OctahedronGeometry(0.22, 0);
      } else if (spell.id === 'plant_shield') {
        mainColor = 0x22c55e;
        emissiveColor = 0x16a34a;
        particleColor = 0xbbf7d0;
        lightColor = 0x4ade80;
        geo = new THREE.OctahedronGeometry(0.24, 0);
      } else if (spell.id === 'plant_drain') {
        mainColor = 0x15803d;
        emissiveColor = 0x166534;
        particleColor = 0x4ade80;
        lightColor = 0x22c55e;
        geo = new THREE.DodecahedronGeometry(0.22, 0);
      } else if (spell.id === 'bing_explosive') {
        mainColor = 0xff4500;
        emissiveColor = 0xff8800;
        particleColor = 0xffaa00;
        lightColor = 0xff5500;
        geo = new THREE.SphereGeometry(0.25, 16, 16);
      } else if (spell.id === 'bing_slow') {
        mainColor = 0x38bdf8;
        emissiveColor = 0x0284c7;
        particleColor = 0xbae6fd;
        lightColor = 0x0ea5e9;
        geo = new THREE.OctahedronGeometry(0.24, 0);
      } else if (spell.id === 'chimera_spit') {
        mainColor = 0x84cc16;
        emissiveColor = 0x65a30d;
        particleColor = 0xa3e635;
        lightColor = 0x84cc16;
        geo = new THREE.DodecahedronGeometry(0.24, 1);
      } else if (spell.id === 'pomodoro_heal') {
        mainColor = 0x22c55e;
        emissiveColor = 0x16a34a;
        particleColor = 0x86efac;
        lightColor = 0x22c55e;
        geo = new THREE.SphereGeometry(0.22, 16, 16);
      } else if (spell.id === 'pomodoro_stim') {
        mainColor = 0xfacc15;
        emissiveColor = 0xeab308;
        particleColor = 0xfef08a;
        lightColor = 0xfacc15;
        geo = new THREE.OctahedronGeometry(0.22, 0);
      } else if (spell.id === 'pomodoro_bramble') {
        mainColor = 0x15803d;
        emissiveColor = 0x166534;
        particleColor = 0x4ade80;
        lightColor = 0x22c55e;
        geo = new THREE.DodecahedronGeometry(0.22, 0);
      } else {
        mainColor = 0xf59e0b;
        emissiveColor = 0xd97706;
        particleColor = 0xfde68a;
        lightColor = 0xf59e0b;
        geo = new THREE.SphereGeometry(0.22, 16, 16);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: mainColor,
        emissive: emissiveColor,
        emissiveIntensity: 2.2,
        roughness: 0.15
      });
      const projectileMesh = new THREE.Mesh(geo, mat);
      group.add(projectileMesh);

      const pLight = new THREE.PointLight(lightColor, 2.2, 4.2);
      group.add(pLight);

      // Glowing aura shell around projectile
      const glowGeo = new THREE.SphereGeometry(0.34, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: emissiveColor,
        transparent: true,
        opacity: 0.45,
        wireframe: true
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      group.add(glowMesh);

      const startVec = new THREE.Vector3(fromPos.x, fromPos.y + 0.95, fromPos.z);
      const endVec = new THREE.Vector3(toPos.x, toPos.y + 0.85, toPos.z);
      group.position.copy(startVec);
      scene.add(group);

      const dist = startVec.distanceTo(endVec);
      const duration = Math.min(360, Math.max(180, dist * 50));
      const startTime = performance.now();
      const peakY = Math.min(2.5, 0.65 + dist * 0.22);

      const trails = [];

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);

        const currentX = THREE.MathUtils.lerp(startVec.x, endVec.x, progress);
        const currentZ = THREE.MathUtils.lerp(startVec.z, endVec.z, progress);
        const arc = Math.sin(progress * Math.PI) * peakY;
        const currentY = THREE.MathUtils.lerp(startVec.y, endVec.y, progress) + arc;

        group.position.set(currentX, currentY, currentZ);
        group.rotation.x += 0.25;
        group.rotation.y += 0.35;

        // Trailing luminous particle
        if (Math.random() < 0.75 && progress < 0.95) {
          const trailGeo = new THREE.SphereGeometry(0.08, 6, 6);
          const trailMat = new THREE.MeshBasicMaterial({
            color: particleColor,
            transparent: true,
            opacity: 0.85
          });
          const trailMesh = new THREE.Mesh(trailGeo, trailMat);
          trailMesh.position.set(
            currentX + (Math.random() - 0.5) * 0.15,
            currentY + (Math.random() - 0.5) * 0.15,
            currentZ + (Math.random() - 0.5) * 0.15
          );
          scene.add(trailMesh);
          trails.push({ mesh: trailMesh, mat: trailMat, born: performance.now(), life: 180 });
        }

        // Update active trails
        for (let i = trails.length - 1; i >= 0; i--) {
          const t = trails[i];
          const age = now - t.born;
          if (age >= t.life) {
            scene.remove(t.mesh);
            t.mesh.geometry.dispose();
            t.mat.dispose();
            trails.splice(i, 1);
          } else {
            const factor = 1.0 - age / t.life;
            t.mat.opacity = factor * 0.85;
            t.mesh.scale.setScalar(factor);
          }
        }

        if (progress < 1.0) {
          requestAnimationFrame(animate);
        } else {
          scene.remove(group);
          geo.dispose();
          mat.dispose();
          glowGeo.dispose();
          glowMat.dispose();

          trails.forEach(t => {
            scene.remove(t.mesh);
            t.mesh.geometry.dispose();
            t.mat.dispose();
          });

          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  _spawnImpactVFX(worldPos, spell) {
    const scene = this.sceneManager.scene;

    // Determine color palette & decal type
    let fxColor = 0xff5500;
    let decalType = 'scorch';

    if (spell.id === 'bird_cupid') {
      fxColor = 0xf43f5e;
      decalType = 'arcane';
    } else if (spell.id === 'bird_owl') {
      fxColor = 0xa855f7;
      decalType = 'arcane';
    } else if (spell.id === 'plant_cactus' || spell.id === 'plant_drain') {
      fxColor = 0x22c55e;
      decalType = 'nature';
    } else if (spell.id === 'plant_shield') {
      fxColor = 0x4ade80;
      decalType = 'arcane';
    } else if (spell.id === 'bing_explosive') {
      fxColor = 0xff4500;
      decalType = 'scorch';
    } else if (spell.id === 'bing_slow') {
      fxColor = 0x38bdf8;
      decalType = 'ice';
    } else if (spell.id === 'chimera_spit') {
      fxColor = 0x84cc16;
      decalType = 'poison';
    } else if (spell.id === 'pomodoro_bramble') {
      fxColor = 0x22c55e;
      decalType = 'nature';
    } else if (spell.id && (spell.id.includes('heal') || spell.id.includes('stim'))) {
      fxColor = 0x34d399;
      decalType = 'arcane';
    } else {
      fxColor = 0xf59e0b;
      decalType = 'crater';
    }

    // 1. Trigger ground decal
    this.gridManager.spawnImpactDecal(worldPos, decalType);

    // 2. Shockwave expanding ring
    const ringGeo = new THREE.RingGeometry(0.12, 0.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: fxColor,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(worldPos.x, 0.05, worldPos.z);
    scene.add(ringMesh);

    // 3. 3D Spark Particle Explosion (16 sparks)
    const sparks = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.09, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: fxColor, transparent: true, opacity: 1.0 });

    for (let i = 0; i < 16; i++) {
      const pMesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
      pMesh.position.set(worldPos.x, 0.65, worldPos.z);
      scene.add(pMesh);

      const angle = Math.random() * Math.PI * 2;
      const speedHoriz = 2.0 + Math.random() * 3.8;
      const speedVert = 3.5 + Math.random() * 4.5;

      sparks.push({
        mesh: pMesh,
        mat: pMesh.material,
        vx: Math.cos(angle) * speedHoriz,
        vy: speedVert,
        vz: Math.sin(angle) * speedHoriz
      });
    }

    const startTime = performance.now();
    const duration = 380; // ms

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const dt = 0.016;

      // Expand ring
      const scale = 0.4 + progress * 2.8;
      ringMesh.scale.set(scale, scale, 1);
      ringMat.opacity = Math.max(0, (1.0 - progress) * 0.95);

      // Update sparks with gravity
      sparks.forEach(s => {
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        s.vy -= 18.0 * dt;

        s.mat.opacity = Math.max(0, 1.0 - progress);
        s.mesh.scale.setScalar(Math.max(0.1, 1.0 - progress * 0.8));
      });

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(ringMesh);
        ringGeo.dispose();
        ringMat.dispose();

        sparks.forEach(s => {
          scene.remove(s.mesh);
          s.mat.dispose();
        });
        sparkGeo.dispose();
      }
    };

    requestAnimationFrame(animate);
  }

  _playSpellSound(soundType) {
    switch (soundType) {
      case 'melee':
        this.audio.playAttackMelee();
        break;
      case 'push':
        this.audio.playShootBow();
        break;
      case 'bow':
        this.audio.playShootBow();
        break;
      case 'explosion':
        this.audio.playExplosion();
        break;
      case 'heal':
        this.audio.playHeal();
        break;
      case 'buff':
        this.audio.playBuff();
        break;
      default:
        this.audio.playAttackMelee();
    }
  }
}
