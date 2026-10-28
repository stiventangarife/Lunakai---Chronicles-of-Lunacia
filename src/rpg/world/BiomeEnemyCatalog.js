// BiomeEnemyCatalog.js - Enemy Archetypes, Stats & Procedural Pack Generator with Monotonic Biome Hierarchy
import * as i18n from '../../i18n/i18n.js';

export const BIOME_TIER_CONFIG = {
  forest: {
    tier: 1,
    name: i18n.t('enemies.tierForest'),
    hpMultiplier: 1.0,
    damageBonus: 0,
    shieldBonus: 20,
    expMultiplier: 1.0
  },
  savannah: {
    tier: 2,
    name: i18n.t('enemies.tierSavannah'),
    hpMultiplier: 1.35,
    damageBonus: 18,
    shieldBonus: 40,
    expMultiplier: 1.6
  },
  arctic: {
    tier: 3,
    name: i18n.t('enemies.tierArctic'),
    hpMultiplier: 2.1,
    damageBonus: 36,
    shieldBonus: 75,
    expMultiplier: 2.4
  },
  mystic: {
    tier: 4,
    name: i18n.t('enemies.tierMystic'),
    hpMultiplier: 2.6,   // Fase 5 (equilibrio): antes 3.0 / +55 / +110
    damageBonus: 45,
    shieldBonus: 95,
    expMultiplier: 3.3
  },
  dungeon: {
    tier: 5,
    name: i18n.t('enemies.tierGenesis'),
    hpMultiplier: 3.3,   // Fase 5 (equilibrio): antes 4.2 / +80 / +160 (salto de ×5 desde el Ártico)
    damageBonus: 60,
    shieldBonus: 125,
    expMultiplier: 4.5
  }
};

// possibleDrops (20-oct): materiales y comida que suelta cada monstruo (ids de MATERIALS van a la bolsa de la Forja).
// Slimes: baba y frutas · lobos acuáticos: cola de quimera y diente · lobos grises y alfa: lana · treant: madera ·
// dríadas: rama, bastón y flor de druida · osos, slimes de Génesis y su jefe: ámbar de Atia.
export const ENEMY_ARCHETYPES = {
  // --- 1. BOSQUE (Forest - Tier 1) ---
  // Modelos: slime, slime-attack, slime-defese, slime-support
  slime: {
    id: 'slime',
    name: 'slime',
    type: 'slime',
    role: 'melee_brawler',
    baseScale: 1.05,
    tintColor: null,
    baseStats: { maxHP: 130, maxPA: 5, maxPM: 3, initiative: 50, initialShield: 15, bonusDamage: 0 },
    spellIds: ['slime_strike', 'slime_barrier'],
    expValue: 60,
    possibleDrops: ['mat_slime_goo', 'food_fruit']
  },
  slime_attack: {
    id: 'slime_attack',
    name: 'slime-attack',
    type: 'slime-attack',
    role: 'ranged_piercer',
    baseScale: 1.05,
    tintColor: null,
    baseStats: { maxHP: 120, maxPA: 6, maxPM: 3, initiative: 65, initialShield: 10, bonusDamage: 5 },
    spellIds: ['slime_attack_spit', 'slime_attack_goo'],
    expValue: 65,
    possibleDrops: ['mat_slime_goo', 'food_fruit']
  },
  slime_defese: {
    id: 'slime_defese',
    name: 'slime-defese',
    type: 'slime-defese',
    role: 'tank_guardian',
    baseScale: 1.12,
    tintColor: null,
    baseStats: { maxHP: 165, maxPA: 5, maxPM: 2, initiative: 45, initialShield: 35, bonusDamage: 0 },
    spellIds: ['slime_defense_slam', 'slime_defense_barrier'],
    expValue: 70,
    possibleDrops: ['mat_slime_goo', 'food_fruit']
  },
  slime_support: {
    id: 'slime_support',
    name: 'slime-support',
    type: 'slime-support',
    role: 'support_healer',
    baseScale: 1.05,
    tintColor: null,
    baseStats: { maxHP: 115, maxPA: 6, maxPM: 3, initiative: 55, initialShield: 20, bonusDamage: 0 },
    spellIds: ['slime_support_pinch', 'slime_support_heal'],
    expValue: 65,
    possibleDrops: ['mat_slime_goo', 'food_fruit']
  },

  // --- 2. SABANA (Savannah - Tier 2) ---
  // Modelos: slime-forest-a, wolf-aquatic, wolf-aquatic-alpha
  slime_forest_a: {
    id: 'slime_forest_a',
    name: 'slime-forest-a',
    type: 'slime-forest-a',
    role: 'skirmisher',
    baseScale: 1.08,
    tintColor: null,
    baseStats: { maxHP: 170, maxPA: 5, maxPM: 4, initiative: 65, initialShield: 20, bonusDamage: 0 },
    spellIds: ['slime_forest_a_swipe', 'slime_forest_a_spit', 'slime_forest_a_thorn'],
    expValue: 90,
    possibleDrops: ['mat_slime_goo', 'food_fruit']
  },
  wolf_aquatic: {
    id: 'wolf_aquatic',
    name: 'wolf-aquatic',
    type: 'wolf-aquatic',
    role: 'pack_hunter',
    baseScale: 1.2,
    tintColor: null,
    baseStats: { maxHP: 195, maxPA: 5, maxPM: 4, initiative: 75, initialShield: 25, bonusDamage: 5 },
    spellIds: ['wolf_aquatic_bite'],
    expValue: 100,
    possibleDrops: ['mat_chimera_tail', 'mat_wolf_tooth']
  },
  wolf_aquatic_alpha: {
    id: 'wolf_aquatic_alpha',
    name: 'wolf-aquatic-alpha',
    type: 'wolf-aquatic-alpha',
    role: 'apex_hunter',
    baseScale: 1.60,
    tintColor: null,
    baseStats: { maxHP: 240, maxPA: 6, maxPM: 4, initiative: 80, initialShield: 40, bonusDamage: 10 },
    spellIds: ['wolf_aquatic_alpha_splash', 'wolf_aquatic_alpha_roar'],
    expValue: 125,
    possibleDrops: ['mat_chimera_tail', 'mat_wolf_tooth']
  },

  // --- 3. ÁRTICO (Arctic - Tier 3) ---
  // Modelos: wolf-gray, wolf-alpha, treant-flower (Slime Knight / Slime Caballero desde el Hito 94; el id sigue siendo treant_flower)
  wolf_gray: {
    id: 'wolf_gray',
    name: 'wolf-gray',
    type: 'wolf-gray',
    role: 'frost_brawler',
    baseScale: 1.2,
    tintColor: null,
    baseStats: { maxHP: 210, maxPA: 5, maxPM: 4, initiative: 70, initialShield: 35, bonusDamage: 0 },
    spellIds: ['wolf_gray_bite', 'wolf_gray_slash'],
    expValue: 130,
    possibleDrops: ['mat_wool']
  },
  wolf_alpha: {
    id: 'wolf_alpha',
    name: 'wolf-alpha',
    type: 'wolf-alpha',
    role: 'frost_leader',
    baseScale: 1.65,
    tintColor: null,
    baseStats: { maxHP: 270, maxPA: 6, maxPM: 4, initiative: 85, initialShield: 50, bonusDamage: 10 },
    spellIds: ['wolf_alpha_bite', 'wolf_alpha_roar', 'wolf_alpha_nova'],
    expValue: 160,
    possibleDrops: ['mat_wool']
  },
  treant_flower: {
    id: 'treant_flower',
    name: 'treant-flower',
    type: 'treant-flower',
    role: 'cryo_tank',
    baseScale: 1.25,
    tintColor: 0x7dd3fc,
    baseStats: { maxHP: 310, maxPA: 5, maxPM: 2, initiative: 45, initialShield: 70, bonusDamage: 0 },
    spellIds: ['treant_flower_slam', 'treant_flower_nova'],
    expValue: 165,
    possibleDrops: ['mat_wood']
  },

  // --- 4. MÍSTICO (Mystic - Tier 4) ---
  // Modelos: dryad-fighter, dryad-mage, dryad-range
  dryad_fighter: {
    id: 'dryad_fighter',
    name: 'dryad-fighter',
    type: 'dryad-fighter',
    role: 'arcane_bruiser',
    baseScale: 1.50,
    tintColor: null,
    baseStats: { maxHP: 250, maxPA: 6, maxPM: 3, initiative: 65, initialShield: 45, bonusDamage: 5 },
    spellIds: ['dryad_fighter_blade', 'dryad_fighter_dance', 'dryad_fighter_slash'],
    expValue: 160,
    possibleDrops: ['mat_druid_branch', 'mat_druid_flower']
  },
  dryad_mage: {
    id: 'dryad_mage',
    name: 'dryad-mage',
    type: 'dryad-mage',
    role: 'astral_channeler',
    baseScale: 1.50,
    tintColor: null,
    baseStats: { maxHP: 230, maxPA: 6, maxPM: 3, initiative: 70, initialShield: 40, bonusDamage: 10 },
    spellIds: ['dryad_mage_spark', 'dryad_mage_heal', 'dryad_mage_burst'],
    expValue: 165,
    possibleDrops: ['mat_druid_staff', 'mat_druid_flower']
  },
  dryad_range: {
    id: 'dryad_range',
    name: 'dryad-range',
    type: 'dryad-range',
    role: 'void_sniper',
    baseScale: 1.50,
    tintColor: null,
    baseStats: { maxHP: 220, maxPA: 6, maxPM: 4, initiative: 75, initialShield: 35, bonusDamage: 10 },
    spellIds: ['dryad_range_arrow', 'dryad_range_snipe', 'dryad_range_root'],
    expValue: 160,
    possibleDrops: ['mat_druid_branch', 'mat_druid_staff']
  },

  // --- 5. MAZMORRA (Dungeon - Tier 5) ---
  // Modelos Comunes: slime-forest-b, slime-fusion
  // Modelos Boss: werewolf-boss, bear-mom, bear-dad
  slime_forest_b: {
    id: 'slime_forest_b',
    name: 'slime-forest-b',
    type: 'slime-forest-b',
    role: 'cavern_skirmisher',
    baseScale: 1.30,
    tintColor: null,
    baseStats: { maxHP: 270, maxPA: 6, maxPM: 3, initiative: 60, initialShield: 45, bonusDamage: 0 },
    spellIds: ['slime_forest_b_slam', 'slime_forest_b_spit', 'slime_forest_b_heavy'],
    expValue: 175,
    possibleDrops: ['mat_amber_atia']
  },
  slime_fusion: {
    id: 'slime_fusion',
    name: 'slime-fusion',
    type: 'slime-fusion',
    role: 'magma_amalgam',
    baseScale: 1.2,
    tintColor: null,
    baseStats: { maxHP: 310, maxPA: 6, maxPM: 3, initiative: 65, initialShield: 55, bonusDamage: 10 },
    spellIds: ['slime_fusion_burst', 'slime_defense_slam'],
    expValue: 195,
    possibleDrops: ['mat_amber_atia']
  },
  werewolf_boss: {
    id: 'werewolf_boss',
    name: 'werewolf-boss',
    type: 'werewolf-boss',
    role: 'apex_boss',
    baseScale: 2.10,
    tintColor: null,
    baseStats: { maxHP: 450, maxPA: 7, maxPM: 4, initiative: 85, initialShield: 110, bonusDamage: 25 },
    spellIds: ['werewolf_boss_bite', 'werewolf_boss_roar', 'werewolf_boss_cataclysm'],
    expValue: 350,
    possibleDrops: ['mat_amber_atia']
  },
  bear_mom: {
    id: 'bear_mom',
    name: 'bear-mom',
    type: 'bear-mom',
    role: 'guardian_matriarch',
    baseScale: 1.85,
    tintColor: null,
    baseStats: { maxHP: 400, maxPA: 6, maxPM: 3, initiative: 60, initialShield: 95, bonusDamage: 15 },
    spellIds: ['bear_mom_strike', 'bear_mom_roar', 'bear_mom_slam'],
    expValue: 280,
    possibleDrops: ['mat_amber_atia']
  },
  bear_dad: {
    id: 'bear_dad',
    name: 'bear-dad',
    type: 'bear-dad',
    role: 'colossal_juggernaut',
    baseScale: 2.05,
    tintColor: null,
    baseStats: { maxHP: 420, maxPA: 6, maxPM: 3, initiative: 65, initialShield: 90, bonusDamage: 20 },
    spellIds: ['bear_dad_claw', 'bear_dad_roar', 'bear_dad_shield'],
    expValue: 290,
    possibleDrops: ['mat_amber_atia']
  },

  // --- Retrocompatibilidad con nombres antiguos ---
  get slime_forest() { return this.slime; },
  get slime_basic() { return this.slime; },
  get fox_forest() { return this.slime_attack; },
  get buba_forest() { return this.slime_defese; },
  get slime_attack_savannah() { return this.slime_forest_a; },
  get slime_savannah() { return this.slime_forest_a; },
  get buba_savannah() { return this.wolf_aquatic_alpha; },
  get puffy_arctic() { return this.wolf_alpha; },
  get slime_arctic() { return this.wolf_gray; },
  get kibo_arctic() { return this.treant_flower; },
  get puffy_mystic() { return this.dryad_mage; },
  get slime_mystic() { return this.dryad_range; },
  get sapidae_mystic() { return this.dryad_fighter; },
  get slime_dungeon() { return this.slime_forest_b; },
  get buba_dungeon() { return this.slime_fusion; },
  get kibo_dungeon() { return this.bear_dad; },
  get sapidae_dungeon() { return this.werewolf_boss; }
};
// Nombres visibles en el idioma activo (enemies.arch.<id>.name). `name` solo se muestra (placa, combate, minimapa):
// el modelo, la IA y el botín usan `type` / `id`.
i18n.applyText(ENEMY_ARCHETYPES, 'enemies.arch', ['name']);

// Biome-specific spawn tables with weighted distributions
export const BIOME_SPAWN_POOLS = {
  forest: [
    { archetypeId: 'slime', weight: 35 },
    { archetypeId: 'slime_attack', weight: 25 },
    { archetypeId: 'slime_defese', weight: 20 },
    { archetypeId: 'slime_support', weight: 20 }
  ],
  savannah: [
    { archetypeId: 'slime_forest_a', weight: 35 },
    { archetypeId: 'wolf_aquatic', weight: 40 },
    { archetypeId: 'wolf_aquatic_alpha', weight: 25 }
  ],
  arctic: [
    { archetypeId: 'wolf_gray', weight: 40 },
    { archetypeId: 'wolf_alpha', weight: 35 },
    { archetypeId: 'treant_flower', weight: 25 }
  ],
  mystic: [
    { archetypeId: 'dryad_fighter', weight: 35 },
    { archetypeId: 'dryad_mage', weight: 35 },
    { archetypeId: 'dryad_range', weight: 30 }
  ],
  dungeon: [
    { archetypeId: 'slime_forest_b', weight: 40 },
    { archetypeId: 'slime_fusion', weight: 30 },
    { archetypeId: 'bear_mom', weight: 15 },
    { archetypeId: 'bear_dad', weight: 15 }
  ]
};

export function getDifficultyTier(biome) {
  const cfg = BIOME_TIER_CONFIG[biome];
  return cfg ? cfg.tier : 1;
}

function getRandomArchetype(biome) {
  const pool = BIOME_SPAWN_POOLS[biome] || BIOME_SPAWN_POOLS.forest;
  const totalWeight = pool.reduce((acc, p) => acc + p.weight, 0);
  let r = Math.random() * totalWeight;

  for (const entry of pool) {
    if (r < entry.weight) {
      return ENEMY_ARCHETYPES[entry.archetypeId] || ENEMY_ARCHETYPES.slime_forest;
    }
    r -= entry.weight;
  }
  return ENEMY_ARCHETYPES.slime_forest;
}

export function generatePackForBiome(biome, [gx, gy], forcedLeaderArchetypeId = null) {
  const tierConfig = BIOME_TIER_CONFIG[biome] || BIOME_TIER_CONFIG.forest;
  const tier = tierConfig.tier;

  const roll = Math.random();
  let packSize = 1;
  let packType = 'SOLO';
  if (roll > 0.80) {
    packSize = 3;
    packType = 'TRIO';
  } else if (roll > 0.45) {
    packSize = 2;
    packType = 'DUO';
  }

  const leaderArchetype = (forcedLeaderArchetypeId && ENEMY_ARCHETYPES[forcedLeaderArchetypeId])
    ? ENEMY_ARCHETYPES[forcedLeaderArchetypeId]
    : getRandomArchetype(biome);
  const members = [];

  for (let i = 0; i < packSize; i++) {
    const arch = (i === 0) ? leaderArchetype : getRandomArchetype(biome);

    const scaledHP = Math.round(arch.baseStats.maxHP * tierConfig.hpMultiplier);
    const scaledShield = Math.round((arch.baseStats.initialShield || 0) + tierConfig.shieldBonus);
    const bonusDamage = (arch.baseStats.bonusDamage || 0) + tierConfig.damageBonus;
    const scaledInitiative = Math.round(arch.baseStats.initiative + (tier - 1) * 3);
    const scaledExp = Math.round(arch.expValue * tierConfig.expMultiplier);

    members.push({
      id: `mob_${arch.id}_${i}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
      name: (i === 0) ? arch.name : `${arch.name} ${i + 1}`,
      archetypeId: arch.id,
      role: arch.role,
      type: arch.type,
      scale: arch.baseScale,
      tintColor: arch.tintColor,
      maxHP: scaledHP,
      maxPA: arch.baseStats.maxPA,
      maxPM: arch.baseStats.maxPM,
      initiative: scaledInitiative,
      initialShield: scaledShield,
      bonusDamage: bonusDamage,
      spellIds: [...arch.spellIds],
      expValue: scaledExp,
      possibleDrops: [...arch.possibleDrops]
    });
  }

  let packTitle = leaderArchetype.name;
  if (packSize === 2) {
    packTitle = i18n.t('enemies.packDuo', { name: leaderArchetype.name });
  } else if (packSize === 3) {
    packTitle = i18n.t('enemies.packOf', { name: leaderArchetype.name });
  }

  return {
    packId: `pack_${gx}_${gy}_${Date.now().toString(36)}`,
    packTitle,
    packType,
    packSize,
    tier,
    tierName: tierConfig.name,
    biome,
    leader: members[0],
    members
  };
}
