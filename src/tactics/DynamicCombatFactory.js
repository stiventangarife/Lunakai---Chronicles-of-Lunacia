import { BIOMES } from './Biomes.js';
import * as i18n from '../i18n/i18n.js';
import { ITEMS_DB, TIER_DROPS, ROLE_DROPS } from './ItemDatabase.js';
import { MATERIALS } from './data/EconomyCatalog.js';
import { ENEMY_ARCHETYPES } from '../rpg/world/BiomeEnemyCatalog.js';

// Botín: objetos (ITEMS_DB) o materiales de la Forja (MATERIALS).
const isLoot = (id) => Boolean(ITEMS_DB[id] || MATERIALS[id]);
import { pickBattleMap } from './maps/BattleMaps.js';
import { facingTowards } from './maps/BattleMapLayout.js';

// Hito 35: combates que siempre usan el mapa de jefe de su bioma (además de las manadas con líder 👑)
const BOSS_ENCOUNTER_IDS = new Set(['mob_polar_golem', 'mob_oracle_chimera']);
const BOSS_ROLES = new Set(['apex_boss', 'armored_titan']);

export class DynamicCombatFactory {
  /**
   * Maps an overworld biome identifier to a tactical combat biome
   */
  static getTacticalBiome(biome) {
    const BIOME_MAP = {
      forest: 'lunacia_plains',
      arctic: 'frozen_peaks',
      savannah: 'canyon_rock',
      mystic: 'mystic_grove',
      dungeon: 'boss_arena'
    };
    return BIOME_MAP[biome] || 'lunacia_plains';
  }

  /** Hito 35: ¿es un jefe? Manada con líder fijo (👑), rol de jefe o combate de misión de jefe. */
  static isBossEncounter(encounterData, pack, members) {
    if (pack && pack.isBoss) return true;
    if (encounterData && BOSS_ENCOUNTER_IDS.has(encounterData.monsterId)) return true;
    if (encounterData && typeof encounterData.monsterId === 'string' && encounterData.monsterId.startsWith('mob_boss_')) return true;
    return (members || []).some((m) => BOSS_ROLES.has(m.role));
  }

  /**
   * Generates a complete tactical encounter config from overworld encounter data
   * @param {Object} encounterData - { packData, biome, monsterId, isTutorial, zoneKey, zoneCoords }
   * @param {Object} equipmentManager - EquipmentManager instance to check unlocked heroes
   * @param {Object} questManager - QuestManager instance to check active quest allies
   */
  static createEncounter(encounterData, equipmentManager = null, questManager = null) {
    const pack = encounterData.packData;
    const biome = encounterData.biome || 'forest';
    const tacticalBiome = this.getTacticalBiome(biome);
    const biomeDef = BIOMES[tacticalBiome] || BIOMES.lunacia_plains;

    // 1. Determine active heroes from squad / equipmentManager
    const unlockedHeroes = (equipmentManager && equipmentManager.unlockedHeroes)
      ? equipmentManager.unlockedHeroes
      : ['kotaro'];

    // Up to 3 active heroes: the squad chosen in the Escuadrón panel (main companion first).
    // Fallback (no squad API): kotaro primary, plus unlocked allies, as before.
    const activeHeroIds = (equipmentManager && typeof equipmentManager.getCombatHeroIds === 'function')
      ? equipmentManager.getCombatHeroIds().slice(0, 3)
      : [];
    if (!activeHeroIds.length) {
      activeHeroIds.push('kotaro');
      if (unlockedHeroes.includes('bing') && !activeHeroIds.includes('bing')) {
        activeHeroIds.push('bing');
      }
      if (unlockedHeroes.includes('pomodoro') && !activeHeroIds.includes('pomodoro')) {
        activeHeroIds.push('pomodoro');
      }
    }

    // Temporary quest allies in specific macro zones:
    const zoneKey = encounterData.zoneKey
      || (encounterData.zoneCoords ? `${encounterData.zoneCoords[0]}_${encounterData.zoneCoords[1]}` : null)
      || (typeof window !== 'undefined' && window.overworldManager?.worldMapManager?.currentMapDef
          ? `${window.overworldManager.worldMapManager.currentMapDef.gx}_${window.overworldManager.worldMapManager.currentMapDef.gy}`
          : null);
    const qm = questManager || (typeof window !== 'undefined' ? window.overworldManager?.questManager : null);

    // Bing fights alongside the player in macro-zone [3, 2] once the player accepts his mission (find_bing step done)
    // or during the direct surprise ambush battle (encounterData.monsterId === 'mob_bing_ambush')
    if (!activeHeroIds.includes('bing') && activeHeroIds.length < 3 && qm) {
      const qBing = qm.getQuest('quest_prove_ferocity');
      const hasFoundBing = qBing?.objective?.steps?.find(s => s.id === 'find_bing')?.done;
      if ((zoneKey === '3_2' || encounterData.monsterId === 'mob_bing_ambush') && qBing && qBing.status === 'active' && (hasFoundBing || encounterData.monsterId === 'mob_bing_ambush')) {
        activeHeroIds.push('bing');
      }
    }

    // Pomodoro fights alongside the player in macro-zone [2, 1] once the player speaks with him (reach_arctic step done)
    if (!activeHeroIds.includes('pomodoro') && activeHeroIds.length < 3 && qm) {
      const qPomo = qm.getQuest('quest_frozen_seed');
      const hasReachedArctic = qPomo?.objective?.steps?.find(s => s.id === 'reach_arctic')?.done;
      if ((zoneKey === '2_1' || encounterData.monsterId === 'mob_pomodoro_battle') && qPomo && qPomo.status === 'active' && hasReachedArctic) {
        activeHeroIds.push('pomodoro');
      }
    }

    // Hero starting formation on 10x10 tactical grid (Z = 2..3, X = 3..5)
    const heroPositions = [];
    if (activeHeroIds.length === 1) {
      heroPositions.push({ id: activeHeroIds[0], x: 4, z: 2 });
    } else if (activeHeroIds.length === 2) {
      heroPositions.push({ id: activeHeroIds[0], x: 3, z: 2 });
      heroPositions.push({ id: activeHeroIds[1], x: 5, z: 2 });
    } else {
      heroPositions.push({ id: activeHeroIds[0], x: 4, z: 2 });
      heroPositions.push({ id: activeHeroIds[1], x: 2, z: 3 });
      heroPositions.push({ id: activeHeroIds[2], x: 6, z: 3 });
    }

    // 2. Position enemies on grid (Enemy side: Z = 6..8)
    const enemyFormations = {
      1: [{ x: 4, z: 7 }],
      2: [{ x: 3, z: 7 }, { x: 5, z: 7 }],
      3: [{ x: 4, z: 7 }, { x: 2, z: 8 }, { x: 6, z: 8 }]
    };

    let members = (pack && pack.members && pack.members.length > 0)
      ? pack.members
      : null;

    if (!members) {
      if (encounterData.monsterId === 'mob_bing_ambush') {
        members = [
          { id: 'chimera_bing_1', name: i18n.t('enemies.swiftChimera'), type: 'wolf-aquatic', scale: 1.2, tintColor: null, maxHP: 180, maxPA: 5, maxPM: 4, initiative: 70, initialShield: 20, spellIds: ['wolf_aquatic_bite'], expValue: 80, role: 'pack_hunter' },
          { id: 'chimera_bing_2', name: i18n.t('enemies.spikedChimera'), type: 'slime-forest-a', scale: 1.1, tintColor: null, maxHP: 160, maxPA: 5, maxPM: 3, initiative: 60, initialShield: 25, spellIds: ['slime_forest_a_swipe', 'slime_forest_a_thorn'], expValue: 75, role: 'skirmisher' }
        ];
      } else if (encounterData.monsterId === 'mob_postman_bandits') {
        members = [
          { id: 'bandit_post_1', name: i18n.t('enemies.mailRaider'), type: 'slime-attack', scale: 1.1, tintColor: 0x9333ea, maxHP: 130, maxPA: 6, maxPM: 3, initiative: 60, initialShield: 15, spellIds: ['slime_attack_spit', 'slime_attack_goo'], expValue: 65, role: 'ranged_piercer' },
          { id: 'bandit_post_2', name: i18n.t('enemies.satchelThief'), type: 'slime', scale: 1.15, tintColor: 0x6b21a8, maxHP: 150, maxPA: 5, maxPM: 3, initiative: 50, initialShield: 20, spellIds: ['slime_strike', 'slime_barrier'], expValue: 65, role: 'melee_brawler' }
        ];
      } else if (encounterData.monsterId === 'mob_rosalba_plant_guardian') {
        members = [
          { id: 'guardian_plant_1', name: i18n.t('enemies.mossGuardian'), type: 'slime-forest-a', scale: 1.25, tintColor: 0x15803d, maxHP: 190, maxPA: 5, maxPM: 3, initiative: 65, initialShield: 35, spellIds: ['slime_forest_a_swipe', 'slime_forest_a_thorn', 'slime_forest_a_spit'], expValue: 95, role: 'skirmisher' }
        ];
      } else if (encounterData.monsterId === 'mob_armored_chimera') {
        members = [
          { id: 'armored_chimera_1', name: i18n.t('enemies.armoredChimera'), type: 'wolf-aquatic-alpha', scale: 1.65, tintColor: 0x78716c, maxHP: 280, maxPA: 6, maxPM: 3, initiative: 70, initialShield: 80, bonusDamage: 8, spellIds: ['wolf_aquatic_alpha_splash', 'wolf_aquatic_alpha_roar'], expValue: 150, role: 'apex_hunter' }
        ];
      } else if (encounterData.monsterId === 'mob_beaked_chimera') {
        members = [
          // sub-jefe (19-oct): antes era 'bird-early' (un Axie sin modelo de enemigo → primitiva) con habilidades antiguas sin VFX;
          // ahora es el alfa de la manada de lobos acuáticos, en ámbar, y más fuerte que la Armored Chimera
          { id: 'beaked_alpha_1', name: i18n.t('enemies.alphaBeakedChimera'), type: 'wolf-aquatic-alpha', scale: 1.7, tintColor: 0xf59e0b, maxHP: 330, maxPA: 7, maxPM: 4, initiative: 85, initialShield: 70, bonusDamage: 10, spellIds: ['wolf_aquatic_alpha_splash', 'wolf_aquatic_alpha_roar'], expValue: 180, role: 'apex_hunter' },
          { id: 'beaked_flock_2', name: i18n.t('enemies.wingedBeakedChimera'), type: 'wolf-aquatic', scale: 1.25, tintColor: null, maxHP: 160, maxPA: 5, maxPM: 4, initiative: 70, initialShield: 20, bonusDamage: 3, spellIds: ['wolf_aquatic_bite', 'chimera_bite'], expValue: 70, role: 'pack_hunter' }
        ];
      } else if (encounterData.monsterId === 'mob_shadow_mirror') {
        members = [
          { id: 'shadow_mirror_1', name: i18n.t('enemies.illusoryShadow'), type: 'dryad-fighter', scale: 1.55, tintColor: 0x3b0764, maxHP: 260, maxPA: 6, maxPM: 3, initiative: 75, initialShield: 60, bonusDamage: 10, spellIds: ['dryad_fighter_blade', 'dryad_fighter_dance', 'dryad_fighter_slash'], expValue: 160, role: 'arcane_bruiser' }
        ];
      } else if (encounterData.monsterId === 'mob_pomodoro_battle') {
        members = [
          { id: 'frost_chimera_1', name: i18n.t('enemies.glacialChimera'), type: 'wolf-alpha', scale: 1.35, tintColor: 0x38bdf8, maxHP: 210, maxPA: 5, maxPM: 3, initiative: 65, initialShield: 35, spellIds: ['wolf_alpha_bite', 'wolf_alpha_roar'], expValue: 110, role: 'pack_hunter' },
          { id: 'frost_chimera_2', name: i18n.t('enemies.polarStalker'), type: 'wolf-gray', scale: 1.25, tintColor: 0x93c5fd, maxHP: 180, maxPA: 5, maxPM: 4, initiative: 70, initialShield: 25, spellIds: ['wolf_gray_slash'], expValue: 90, role: 'skirmisher' }
        ];
      } else if (encounterData.monsterId === 'mob_oracle_chimera') {
        members = [
          { id: 'arcane_sapidae_1', name: i18n.t('enemies.arcaneSapidaeChimera'), type: 'dryad-mage', scale: 1.55, tintColor: 0x7e22ce, maxHP: 310, maxPA: 6, maxPM: 4, initiative: 80, initialShield: 70, bonusDamage: 12, spellIds: ['dryad_mage_spark', 'dryad_mage_heal', 'dryad_mage_burst'], expValue: 200, role: 'arcane_sorcerer' },
          { id: 'void_sprout_2', name: i18n.t('enemies.voidSpectre'), type: 'treant-flower', scale: 1.25, tintColor: 0x6b21a8, maxHP: 190, maxPA: 5, maxPM: 3, initiative: 65, initialShield: 30, bonusDamage: 6, spellIds: ['treant_flower_slam', 'treant_flower_nova'], expValue: 100, role: 'void_minion' }
        ];
      } else if (encounterData.monsterId === 'mob_polar_golem') {
        members = [
          { id: 'polar_golem_1', name: i18n.t('enemies.armoredPolarGolem'), type: 'werewolf-boss', scale: 1.65, tintColor: 0x0284c7, maxHP: 360, maxPA: 6, maxPM: 3, initiative: 60, initialShield: 110, bonusDamage: 14, spellIds: ['werewolf_boss_bite', 'werewolf_boss_roar', 'werewolf_boss_cataclysm'], expValue: 240, role: 'armored_titan' }
        ];
      } else {
        members = [{
          id: encounterData.monsterId || 'mob_default',
          name: i18n.t('enemies.arch.slime.name'),
          type: 'slime',
          scale: 1.05,
          tintColor: null,
          maxHP: 60,
          maxPA: 4,
          maxPM: 3,
          initiative: 50,
          spellIds: ['chimera_bite'],
          expValue: 50,
          possibleDrops: ['mat_slime_goo']
        }];
      }
    }

    // Fase 5 (equilibrio): los encuentros fijos de misión de las primeras islas se ganaban en 1–2 rondas
    // con el 90–100 % de vida (partidas reales del 17-oct). Más vida, escudo y daño solo para esos.
    const FIXED_ENCOUNTER_TUNING = {
      mob_bing_ambush: { hp: 1.3, shield: 10, damage: 6 },
      mob_postman_bandits: { hp: 1.3, shield: 10, damage: 6 },
      mob_rosalba_plant_guardian: { hp: 1.35, shield: 10, damage: 6 },
      mob_beaked_chimera: { hp: 1.25, shield: 10, damage: 5 },
      mob_pomodoro_battle: { hp: 1.3, shield: 10, damage: 6 },
      mob_oracle_chimera: { hp: 1.25, shield: 10, damage: 5 },
    };
    const tune = !pack && FIXED_ENCOUNTER_TUNING[encounterData.monsterId];
    if (tune) {
      members = members.map((m) => ({
        ...m,
        maxHP: Math.round(m.maxHP * tune.hp),
        initialShield: (m.initialShield || 0) + tune.shield,
        bonusDamage: (m.bonusDamage || 0) + tune.damage,
      }));
    }

    // Hito 35: mapa del bioma (3 por bioma al azar; los jefes, el suyo fijo). Si no hay mapa, el 10×10 de siempre.
    const battleMap = pickBattleMap(biome, { isBoss: this.isBossEncounter(encounterData, pack, members) });
    let sapidaePosition = null;
    if (battleMap) {
      const { player, enemy } = battleMap.spawns;
      sapidaePosition = { ...player[0], facing: facingTowards(player[0], enemy) };
      heroPositions.forEach((hp, i) => {
        const c = player[(i + 1) % player.length];
        hp.x = c.x;
        hp.z = c.z;
        hp.facing = facingTowards(c, enemy);
      });
    }
    const formation = battleMap
      ? battleMap.spawns.enemy.map((c) => ({ x: c.x, z: c.z, facing: facingTowards(c, battleMap.spawns.player) }))
      : (enemyFormations[members.length] || enemyFormations[1]);

    const enemies = members.map((m, idx) => {
      const pos = formation[idx] || { x: 3 + idx * 2, z: 7 };
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        x: pos.x,
        z: pos.z,
        maxHP: m.maxHP,
        maxPA: m.maxPA,
        maxPM: m.maxPM,
        initiative: m.initiative,
        initialShield: m.initialShield || 0,
        bonusDamage: m.bonusDamage || 0,
        scale: m.scale,
        tintColor: m.tintColor,
        spellIds: m.spellIds,
        ...(pos.facing !== undefined ? { facing: pos.facing } : {})
      };
    });

    // 3. Generate obstacles suitable for the biome (los mapas de bioma traen los suyos)
    const obstacles = battleMap ? [] : this._generateObstacles(tacticalBiome, heroPositions, enemies);

    // 4. Calculate total EXP & Gold
    const totalExp = members.reduce((sum, m) => sum + (m.expValue || 50), 0);
    const tier = pack ? pack.tier : 1;
    const rewardGold = 25 * tier + members.length * 15;

    // 5. Intelligent Loot Generation scaled by Difficulty Tier and Mob Archetype
    const rewardItems = [];
    
    // Pool of mob-specific drops from defeated pack members (archetype drops + role drops)
    const mobDrops = [];
    members.forEach(m => {
      // Encuentros fijos de misión: sin lista propia, sueltan lo mismo que su modelo (lobo, dríada, treant…)
      const drops = Array.isArray(m.possibleDrops) ? m.possibleDrops
        : (ENEMY_ARCHETYPES[String(m.type || '').replace(/-/g, '_')]?.possibleDrops || null);
      if (drops) {
        drops.forEach(d => {
          if (isLoot(d) && !mobDrops.includes(d)) mobDrops.push(d);
        });
      }
      if (m.role && ROLE_DROPS[m.role]) {
        ROLE_DROPS[m.role].forEach(d => {
          if (isLoot(d) && !mobDrops.includes(d)) mobDrops.push(d);
        });
      }
    });

    // General tier drops pool appropriate for the biome difficulty
    const tierPool = (TIER_DROPS[tier] || TIER_DROPS[1]).filter(isLoot);

    // Check if encounter contains an apex boss or dangerous elite mob
    const isApex = members.some(m => m.role === 'apex_boss' || (m.name && (i18n.inLang(m.name, 'es').includes('Señor') || i18n.inLang(m.name, 'es').includes('Jefe'))));

    // Base drop probabilities tuned by Difficulty Tier
    // Tier 1 (Forest): 85% drop 1, 40% drop 2
    // Tier 2 (Savannah): 95% drop 1, 50% drop 2, 10% drop 3
    // Tier 3 (Arctic): 100% drop 1, 65% drop 2, 25% drop 3
    // Tier 4 (Mystic): 100% drop 1, 80% drop 2, 35% drop 3
    // Tier 5 (Dungeon): 100% drop 1, 100% drop 2, 60% drop 3
    const tierChances = {
      1: { c1: 0.85, c2: 0.40, c3: 0.00 },
      2: { c1: 0.95, c2: 0.50, c3: 0.10 },
      3: { c1: 1.00, c2: 0.65, c3: 0.25 },
      4: { c1: 1.00, c2: 0.80, c3: 0.35 },
      5: { c1: 1.00, c2: 1.00, c3: 0.60 }
    };
    const chances = tierChances[tier] || tierChances[1];

    // Pack size bonus: larger packs (trio) give +10% bonus chance on secondary drops
    const sizeBonus = members.length >= 3 ? 0.10 : 0.00;

    let chance1 = chances.c1;
    let chance2 = chances.c2 + sizeBonus;
    let chance3 = chances.c3 + sizeBonus;

    // Apex boss pack guarantees at least 2 high-tier drops, and higher 3rd chance
    if (isApex) {
      chance1 = 1.00;
      chance2 = 1.00;
      chance3 = Math.max(chance3, 0.65);
    }

    const rollSlot = (chance) => {
      if (Math.random() > chance) return;

      // 70% preference for mob archetype drops if available, otherwise fallback to tier pool
      const useMobPool = mobDrops.length > 0 && (!pack || Math.random() < 0.70 || tierPool.length === 0); // encuentros fijos: solo lo suyo (su isla)
      const primaryPool = useMobPool ? mobDrops : tierPool;
      const fallbackPool = useMobPool ? (pack ? tierPool : mobDrops) : mobDrops;

      // Filter out items already dropped in this batch for reward variety
      let candidates = primaryPool.filter(d => !rewardItems.includes(d));
      if (candidates.length === 0 && fallbackPool.length > 0) {
        candidates = fallbackPool.filter(d => !rewardItems.includes(d));
      }
      if (candidates.length === 0) {
        candidates = primaryPool.length > 0 ? primaryPool : tierPool;
      }

      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        if (picked && isLoot(picked)) {
          rewardItems.push(picked);
        }
      }
    };

    // If apex boss, guarantee at least one apex-exclusive role item
    if (isApex && ROLE_DROPS['apex_boss']) {
      const apexCandidates = ROLE_DROPS['apex_boss'].filter(isLoot);
      if (apexCandidates.length > 0) {
        rewardItems.push(apexCandidates[Math.floor(Math.random() * apexCandidates.length)]);
      }
    }

    // Roll remaining loot slots
    if (rewardItems.length < 1) rollSlot(chance1);
    if (rewardItems.length < 2) rollSlot(chance2);
    if (rewardItems.length < 3) rollSlot(chance3);

    const title = pack ? pack.packTitle : i18n.t('levels.feralEncounter');
    const placeName = battleMap ? i18n.pick({ es: battleMap.nameEs, en: battleMap.name }) : biomeDef.name;
    const subtitle = i18n.t('levels.battleIn', { place: placeName, tier });

    return {
      id: pack ? pack.packId : `combat_${Date.now()}`,
      title,
      subtitle,
      badgeText: `${members.length} vs ${heroPositions.length}`,
      biome: tacticalBiome,
      biomeName: placeName,
      battleMapId: battleMap ? battleMap.id : null,
      ...(sapidaePosition ? { sapidaePosition } : {}),
      heroIds: heroPositions.map(h => h.id),
      heroPositions,
      enemies,
      obstacles,
      rewardRecruits: [],
      rewardItems,
      rewardGold,
      rewardExp: totalExp,
      isTutorial: false
    };
  }

  static _generateObstacles(biome, heroPositions, enemies) {
    const obstacleType = BIOMES[biome]?.obstacleType || 'pillar_rock';
    const obstacles = [];

    // Candidate locations in central battlefield (Z = 4..5, X = 1..8)
    const candidateSpots = [
      { x: 2, z: 4 }, { x: 7, z: 4 },
      { x: 3, z: 5 }, { x: 6, z: 5 },
      { x: 1, z: 5 }, { x: 8, z: 5 }
    ];

    // Pick 2 or 3 random non-conflicting obstacle spots
    const count = 2 + Math.floor(Math.random() * 2);
    const shuffled = [...candidateSpots].sort(() => Math.random() - 0.5);

    const occupied = new Set();
    heroPositions.forEach(h => occupied.add(`${h.x},${h.z}`));
    enemies.forEach(e => occupied.add(`${e.x},${e.z}`));

    for (const spot of shuffled) {
      if (obstacles.length >= count) break;
      const key = `${spot.x},${spot.z}`;
      if (!occupied.has(key)) {
        obstacles.push({ x: spot.x, z: spot.z, type: obstacleType });
        occupied.add(key);
      }
    }

    return obstacles;
  }
}
