// EquipmentManager.js - Party Inventory, 5-Slot Equipment Management and Stat Calculation
import { ITEMS_DB } from './ItemDatabase.js';
import { getHeroSpells, SAPIDAE_CLASSES } from '../rpg/SaveSlotManager.js';
import { portraitService } from './CharacterPortraitService.js';
import { STARTER_DECKS } from './data/StarterCards.js';

export class EquipmentManager {
  constructor() {
    this.heroesBase = {
      sapidae: {
        id: 'sapidae',
        isSapidae: true,
        modelType: 'sapidae-f-a',
        name: 'Ema',
        class: 'Constructor Táctico',
        archetype: 'Sapidae Adventurer (Líder)',
        avatar: '👩‍🌾',
        baseHP: 360,
        basePA: 6,
        basePM: 3,
        baseInitiative: 90,
        baseShield: 0,
        baseDamage: 0
      },
      sapidae_hero: {
        id: 'sapidae_hero',
        isSapidae: true,
        modelType: 'sapidae-f-a',
        name: 'Ema',
        class: 'Constructor Táctico',
        archetype: 'Sapidae Adventurer (Líder)',
        avatar: '👩‍🌾',
        baseHP: 360,
        basePA: 6,
        basePM: 3,
        baseInitiative: 90,
        baseShield: 0,
        baseDamage: 0
      },
      kotaro: {
        id: 'kotaro',
        axieId: '10455',
        genes: '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c',
        modelType: 'axie',
        name: 'Shinji',
        class: 'Beast',
        archetype: 'Beast Lunakai (Melee Duelist)',
        avatar: '🦁',
        baseHP: 340,
        basePA: 6,
        basePM: 3,
        baseInitiative: 85,
        baseShield: 0,
        baseDamage: 0
      },
      bing: {
        id: 'bing',
        name: 'Bing',
        class: 'Beast', // Axie inicial de Origins (Puppy · Toy Ball · Cone Shell · Shiba)
        archetype: 'Beast Lunakai (Morale Support)',
        avatar: '🐶',
        baseHP: 240,
        basePA: 6,
        basePM: 4,
        baseInitiative: 110,
        baseShield: 0,
        baseDamage: 0
      },
      pomodoro: {
        id: 'pomodoro',
        name: 'Pomodoro',
        class: 'Bug', // Axie inicial de Origins (Passion · Leaf Bug · Platypus · Lost Dream · Village Hero)
        archetype: 'Bug Lunakai (Shield Guardian)',
        avatar: '🍳',
        baseHP: 260,
        basePA: 6,
        basePM: 3,
        baseInitiative: 75,
        baseShield: 0,
        baseDamage: 0
      }
    };

    // Sapidae protagonist and companion Axie (Kotaro / Shinji) are active by default
    this.unlockedHeroes = ['sapidae', 'kotaro'];
    // Escuadrón elegido en el panel Escuadrón (tecla K): ['sapidae', principal, apoyo, apoyo]; null = todos los axies desbloqueados
    this.squad = null;

    // 5 equipment slots per hero: weapon, hat, shield, body, boots
    this.equipped = {
      sapidae: { weapon: null, hat: null, shield: null, body: null, boots: null },
      kotaro: { weapon: null, hat: null, shield: null, body: null, boots: null },
      bing: { weapon: null, hat: null, shield: null, body: null, boots: null },
      pomodoro: { weapon: null, hat: null, shield: null, body: null, boots: null }
    };

    // Backpack inventory: starter supplies (consumables)
    this.inventory = ['potion_health_small', 'potion_health_small', 'potion_energy'];
    this.gold = 0;

    this.heroProgression = {
      sapidae: {
        level: 1,
        currentExp: 0,
        unspentStatPoints: 0,
        unspentSkillPoints: 0,
        allocatedStats: {
          vitality: 0,
          ferocity: 0,
          agility: 0,
          essence: 0
        },
        skillLevels: {
          sapidae_strike: 1,
          sapidae_buff: 1,
          sapidae_special: 1
        }
      },
      kotaro: {
        level: 1,
        currentExp: 0,
        unspentStatPoints: 0,
        unspentSkillPoints: 0,
        allocatedStats: {
          vitality: 0, // +1 HP Max
          ferocity: 0, // +1.5 Melee Damage & Collision
          agility: 0,  // +1.2 Ranged Damage & +0.5% Crit
          essence: 0   // +1.2 Nature Damage & +2% Heal/Shield
        },
        skillLevels: {
          kotaro_slash: 1,
          kotaro_push: 1,
          kotaro_jump: 1
        }
      },
      bing: {
        level: 1,
        currentExp: 0,
        unspentStatPoints: 0,
        unspentSkillPoints: 0,
        allocatedStats: {
          vitality: 0,
          ferocity: 0,
          agility: 0,
          essence: 0
        },
        skillLevels: Object.fromEntries(STARTER_DECKS.bing.map((id) => [id, 1]))
      },
      pomodoro: {
        level: 1,
        currentExp: 0,
        unspentStatPoints: 0,
        unspentSkillPoints: 0,
        allocatedStats: {
          vitality: 0,
          ferocity: 0,
          agility: 0,
          essence: 0
        },
        skillLevels: Object.fromEntries(STARTER_DECKS.pomodoro.map((id) => [id, 1]))
      }
    };

    // Campaign progression (10 Levels)
    this.unlockedLevels = [1];
    this.completedLevels = [];
    this.selectedLevelId = 1;

    // Listeners for squad / equipment / progression updates
    this._listeners = [];
    this.heroesCurrentHP = {};
  }

  addListener(callback) {
    if (typeof callback === 'function' && !this._listeners.includes(callback)) {
      this._listeners.push(callback);
    }
  }

  onChange(callback) {
    this.addListener(callback);
  }

  removeListener(callback) {
    this._listeners = this._listeners.filter(cb => cb !== callback);
  }

  _notifyChange() {
    this._listeners.forEach(cb => {
      try {
        cb(this);
      } catch (err) {
        console.error('[EquipmentManager] Listener error:', err);
      }
    });
  }

  getCurrentHP(heroId) {
    const stats = this.getCalculatedStats(heroId);
    if (!stats) return 0;
    if (this.heroesCurrentHP[heroId] !== undefined) {
      return Math.max(0, Math.min(stats.maxHP, this.heroesCurrentHP[heroId]));
    }
    return stats.maxHP;
  }

  setCurrentHP(heroId, hp) {
    const stats = this.getCalculatedStats(heroId);
    if (!stats) return;
    this.heroesCurrentHP[heroId] = Math.max(0, Math.min(stats.maxHP, hp));
    this._notifyChange();
  }

  setHeroAxie(heroId = 'kotaro', { axieId, genes, name, archetype } = {}) {
    if (!this.heroesBase[heroId]) return;
    const hero = this.heroesBase[heroId];
    if (axieId !== undefined) hero.axieId = String(axieId);
    if (genes !== undefined) hero.genes = genes;
    if (name !== undefined) hero.name = name;
    if (archetype !== undefined) hero.archetype = archetype;
    hero.modelType = 'axie';
    this._notifyChange();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('heroAxieChanged', {
        detail: { heroId, axieId: hero.axieId, genes: hero.genes, name: hero.name, archetype: hero.archetype }
      }));
    }
  }

  applySlotData(slotData) {
    this.squad = Array.isArray(slotData?.squad) ? [...slotData.squad] : null;
    if (!slotData || !slotData.hero) return;

    const h = slotData.hero;
    const heroId = 'kotaro';
    const base = this.heroesBase[heroId];
    if (base) {
      const isBeast = h.heroKey === 'beast_rage' || h.heroKey === 'beast_shinji' || h.axieId === '11968787' || h.axieId === '10455' || (h.id === 'kotaro' && (!h.heroKey || h.heroKey === 'beast_rage'));
      if (isBeast) {
        base.name = 'Shinji';
        base.heroKey = 'beast_rage';
        base.axieId = '10455';
        base.genes = '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c';
        base.modelType = 'axie';
      } else {
        base.name = h.name || base.name;
        base.heroKey = h.heroKey || base.heroKey || 'beast_rage';
        base.axieId = String(h.axieId || '10455');
        base.genes = h.genes || base.genes;
        base.modelType = h.modelType || 'axie';
      }
      base.class = h.class || base.class;
      base.archetype = h.archetype || base.archetype;
      base.avatar = h.avatar || base.avatar;
      base.spellIds = h.spellIds || getHeroSpells(base.heroKey || base.axieId);
      if (h.baseHP) base.baseHP = h.baseHP;
      if (h.basePA) base.basePA = h.basePA;
      if (h.basePM) base.basePM = h.basePM;
      if (h.baseInitiative) base.baseInitiative = h.baseInitiative;
    }

    // Update Sapidae protagonist identity from slot data
    if (this.heroesBase.sapidae) {
      if (slotData.playerName) this.heroesBase.sapidae.name = slotData.playerName;
      if (slotData.sapidaeModel) this.heroesBase.sapidae.modelType = slotData.sapidaeModel;
      this.heroesBase.sapidae.customization = slotData.customization ? JSON.parse(JSON.stringify(slotData.customization)) : null;
      const sapidaeClassKey = slotData.sapidaeClass || 'crafter';
      this.heroesBase.sapidae.sapidaeClassKey = sapidaeClassKey;
      if (SAPIDAE_CLASSES[sapidaeClassKey]) {
        const cDef = SAPIDAE_CLASSES[sapidaeClassKey];
        this.heroesBase.sapidae.class = cDef.name;
        this.heroesBase.sapidae.classIcon = cDef.icon;
        this.heroesBase.sapidae.archetype = `${cDef.name} (Líder)`;
        this.heroesBase.sapidae.baseHP = cDef.maxHP;
        this.heroesBase.sapidae.basePA = cDef.maxPA;
        this.heroesBase.sapidae.basePM = cDef.maxPM;
        this.heroesBase.sapidae.baseInitiative = cDef.initiative || 90;
        this.heroesBase.sapidae.spellIds = [...cDef.spells];
      }
    }

    if (slotData.inventory) {
      this.inventory = [...slotData.inventory];
    }
    if (typeof slotData.gold === 'number') {
      this.gold = Math.max(0, slotData.gold);
    }
    if (slotData.equipped) {
      this.equipped = JSON.parse(JSON.stringify(slotData.equipped));
    }
    if (!this.equipped.sapidae) {
      this.equipped.sapidae = { weapon: null, hat: null, shield: null, body: null, boots: null };
    }

    let heroesList = [];
    if (slotData.unlockedHeroes && Array.isArray(slotData.unlockedHeroes)) {
      heroesList = slotData.unlockedHeroes;
    } else {
      // Legacy fallback
      if (slotData.level >= 5) {
        heroesList = ['kotaro', 'bing', 'pomodoro'];
      } else if (slotData.level >= 3) {
        heroesList = ['kotaro', 'bing'];
      } else {
        heroesList = ['kotaro'];
      }
    }
    // Sapidae is always the squad leader at index 0
    this.unlockedHeroes = ['sapidae', ...Array.from(new Set(heroesList.filter(h => h !== 'sapidae')))];

    if (slotData.progression) {
      if (slotData.progression.kotaro || slotData.progression.sapidae) {
        for (const hId of Object.keys(this.heroProgression)) {
          if (slotData.progression[hId]) {
            this.heroProgression[hId] = JSON.parse(JSON.stringify(slotData.progression[hId]));
          }
        }
      } else if (this.heroProgression[heroId]) {
        this.heroProgression[heroId] = JSON.parse(JSON.stringify(slotData.progression));
      }
    }
    if (!this.heroProgression.sapidae) {
      this.heroProgression.sapidae = {
        level: slotData.level || 1,
        currentExp: 0,
        unspentStatPoints: 0,
        unspentSkillPoints: 0,
        allocatedStats: { vitality: 0, ferocity: 0, agility: 0, essence: 0 },
        skillLevels: {}
      };
    }

    // Ensure skillLevels contains active hero spells
    if (this.heroProgression && this.heroProgression[heroId]) {
      const prog = this.heroProgression[heroId];
      if (!prog.skillLevels) prog.skillLevels = {};
      const spells = base?.spellIds || getHeroSpells(base?.heroKey || base?.axieId);
      spells.forEach(sId => {
        if (prog.skillLevels[sId] === undefined) prog.skillLevels[sId] = 1;
      });
    }

    this.restoreAllPartyHP();
    this._notifyChange();
    this._updateSapidaePortrait();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('heroAxieChanged', {
        detail: { heroId, axieId: base.axieId, genes: base.genes, name: base.name, archetype: base.archetype, spellIds: base.spellIds }
      }));
    }
  }

  addGold(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return this.gold || 0;
    this.gold = Math.max(0, (this.gold || 0) + Math.round(amount));
    this._notifyChange();
    return this.gold;
  }

  getGold() {
    return this.gold || 0;
  }

  exportSlotData() {
    const heroId = 'kotaro';
    const base = this.heroesBase[heroId];
    return {
      hero: {
        id: heroId,
        heroKey: base.heroKey || 'beast_rage',
        axieId: base.axieId,
        name: base.name,
        class: base.class,
        archetype: base.archetype,
        avatar: base.avatar,
        genes: base.genes,
        spellIds: base.spellIds || getHeroSpells(base.heroKey || base.axieId),
        baseHP: base.baseHP,
        basePA: base.basePA,
        basePM: base.basePM,
        baseInitiative: base.baseInitiative
      },
      gold: this.gold || 0,
      inventory: [...this.inventory],
      equipped: JSON.parse(JSON.stringify(this.equipped)),
      unlockedHeroes: Array.from(new Set(this.unlockedHeroes || ['kotaro'])),
      squad: Array.isArray(this.squad) ? [...this.squad] : null,
      progression: JSON.parse(JSON.stringify(this.heroProgression))
    };
  }

  restoreAllPartyHP() {
    this.unlockedHeroes.forEach(id => {
      const stats = this.getCalculatedStats(id);
      if (stats) {
        this.heroesCurrentHP[id] = stats.maxHP;
      }
    });
    this._notifyChange();
  }

  /**
   * Escuadrón activo: siempre 4 puestos ['sapidae', principal, apoyo, apoyo] (null = puesto libre).
   * Sin elección guardada, entran los axies desbloqueados en su orden (máximo 3), como antes.
   */
  getSquad() {
    const owned = (this.unlockedHeroes || []).filter((id) => id !== 'sapidae' && this.heroesBase[id]);
    let axies = Array.isArray(this.squad)
      ? this.squad.slice(1).map((id) => (id && owned.includes(id) ? id : null))
      : owned.slice(0, 3);
    while (axies.length < 3) axies.push(null);
    axies = axies.slice(0, 3);
    // El compañero principal nunca queda vacío
    if (!axies[0]) {
      const k = axies.findIndex(Boolean);
      if (k > 0) { axies[0] = axies[k]; axies[k] = null; } else if (owned.length) axies[0] = owned.find((id) => !axies.includes(id)) || owned[0];
    }
    return ['sapidae', ...axies];
  }

  /** Guarda el escuadrón elegido. slots = ['sapidae', principal, apoyo, apoyo]. */
  setSquad(slots = []) {
    const owned = (this.unlockedHeroes || []).filter((id) => id !== 'sapidae' && this.heroesBase[id]);
    const seen = new Set();
    const axies = [1, 2, 3].map((i) => {
      const id = slots[i];
      if (!id || !owned.includes(id) || seen.has(id)) return null;
      seen.add(id);
      return id;
    });
    this.squad = ['sapidae', ...axies];
    this.squad = this.getSquad();
    this._notifyChange();
    return this.squad;
  }

  /** Reparto de XP del combate: Sapidae 100 %, axie principal 80 %, axies de apoyo 60 %. */
  getExpShare(heroId, mainHeroId = null) {
    if (heroId === 'sapidae' || heroId === 'sapidae_hero' || this.heroesBase[heroId]?.isSapidae) return 1;
    const main = mainHeroId || (typeof this.getSquad === 'function' ? this.getSquad()[1] : null);
    return heroId === main ? 0.8 : 0.6;
  }

  /** Axies del escuadrón que entran en combate, en orden (principal primero). */
  getCombatHeroIds() {
    return this.getSquad().slice(1).filter(Boolean);
  }

  unlockHero(heroId) {
    if (!this.unlockedHeroes.includes(heroId)) {
      this.unlockedHeroes.push(heroId);
      // Un axie nuevo ocupa el primer puesto libre del escuadrón, si lo hay
      if (Array.isArray(this.squad) && heroId !== 'sapidae') {
        const free = this.squad.indexOf(null, 1);
        if (free > 0) this.squad[free] = heroId;
      }
      this._notifyChange();
    }
  }

  isHeroUnlocked(heroId) {
    return this.unlockedHeroes.includes(heroId);
  }

  unlockLevel(lvl) {
    if (!this.unlockedLevels.includes(lvl)) {
      this.unlockedLevels.push(lvl);
    }
  }

  completeLevel(lvl) {
    if (!this.completedLevels.includes(lvl)) {
      this.completedLevels.push(lvl);
    }
    if (lvl < 10) {
      this.unlockLevel(lvl + 1);
      this.selectedLevelId = lvl + 1;
    }
  }

  isLevelUnlocked(lvl) {
    return this.unlockedLevels.includes(lvl);
  }

  isLevelCompleted(lvl) {
    return this.completedLevels.includes(lvl);
  }

  addItemsToInventory(itemIds) {
    itemIds.forEach(id => {
      if (ITEMS_DB[id]) {
        this.inventory.push(id);
      }
    });
  }

  equipItem(heroId, slot, itemId) {
    if (!this.equipped[heroId] || !ITEMS_DB[itemId]) return false;

    const item = ITEMS_DB[itemId];
    if (item.slot !== slot) return false;

    // If already something equipped in that slot, return it to inventory
    const currentEquippedId = this.equipped[heroId][slot];
    if (currentEquippedId) {
      this.inventory.push(currentEquippedId);
    }

    // Remove new item from inventory and assign
    const invIndex = this.inventory.indexOf(itemId);
    if (invIndex !== -1) {
      this.inventory.splice(invIndex, 1);
    }

    this.equipped[heroId][slot] = itemId;
    this._notifyChange();
    if (heroId === 'sapidae' || this.heroesBase[heroId]?.isSapidae) {
      this._updateSapidaePortrait();
    }
    return true;
  }

  unequipItem(heroId, slot) {
    if (!this.equipped[heroId]) return false;
    const currentId = this.equipped[heroId][slot];
    if (!currentId) return false;

    this.inventory.push(currentId);
    this.equipped[heroId][slot] = null;
    this._notifyChange();
    if (heroId === 'sapidae' || this.heroesBase[heroId]?.isSapidae) {
      this._updateSapidaePortrait();
    }
    return true;
  }

  _updateSapidaePortrait() {
    try {
      const base = this.heroesBase?.sapidae;
      if (!base) return;
      const modelId = base.modelType || 'sapidae-f-a';
      const custom = base.customization || this.playerEntity?.customization || null;
      const equipped = this.equipped?.sapidae || null;
      portraitService.getSapidaeCustomPortrait(modelId, custom, equipped, {
        fullBody: true,
        zoomFactor: 1.10,
        yaw: -0.18,
        pitch: 0.03
      });
    } catch (e) {
      console.warn('[EquipmentManager] Could not update Sapidae portrait:', e);
    }
  }

  getEquipped(heroId) {
    return this.equipped[heroId] || null;
  }

  getItem(itemId) {
    return ITEMS_DB[itemId] || null;
  }

  getCalculatedStats(heroId) {
    const base = this.heroesBase[heroId];
    if (!base) return null;
    const prog = this.getProgression(heroId);
    const alloc = prog.allocatedStats || {};

    // Automatic level-up bonuses: +2 HP MAX and +3 Initiative MAX per level gained
    const levelBonusHP = Math.max(0, (prog.level - 1) * 2);
    const levelBonusInit = Math.max(0, (prog.level - 1) * 3);

    // Allocated attribute bonuses:
    // 1. Vitality: +1 HP Max per point
    const allocHP = (alloc.vitality || 0) * 1;
    // 2. Ferocity: +1.5 Melee damage per point & +1.0 Collision damage
    const allocMeleeDamage = Math.round(((alloc.ferocity || 0) * 1.5) * 10) / 10;
    const collisionBonus = (alloc.ferocity || 0) * 1.0;
    // 3. Agility: +1.2 Ranged damage per point & +0.5% Crit Rate
    const allocRangedDamage = Math.round(((alloc.agility || 0) * 1.2) * 10) / 10;
    const critBonus = Math.floor((alloc.agility || 0) * 0.5);
    // 4. Essence: +1.2 Nature/Magic damage per point & +2% Support/Heal Power
    const allocMagicDamage = Math.round(((alloc.essence || 0) * 1.2) * 10) / 10;
    const supportBonus = (alloc.essence || 0) * 2;

    const stats = {
      maxHP: base.baseHP + levelBonusHP + allocHP,
      maxPA: base.basePA,
      maxPM: base.basePM,
      initiative: base.baseInitiative + levelBonusInit,
      bonusDamage: base.baseDamage || 0,
      bonusMeleeDamage: allocMeleeDamage + (base.baseDamage || 0),
      bonusRangedDamage: allocRangedDamage + (base.baseDamage || 0),
      bonusMagicDamage: allocMagicDamage + (base.baseDamage || 0),
      collisionBonus: collisionBonus,
      initialShield: base.baseShield || 0,
      critRate: 20 + critBonus, // in % (base 20% + agility bonus)
      supportPower: supportBonus, // in % (essence bonus)
      levelBonuses: {
        hp: levelBonusHP,
        initiative: levelBonusInit
      },
      allocated: {
        vitality: allocHP,
        ferocity: allocMeleeDamage,
        agility: allocRangedDamage,
        essence: allocMagicDamage,
        critRate: critBonus,
        supportPower: supportBonus,
        collisionBonus: collisionBonus,
        points: {
          vitality: alloc.vitality || 0,
          ferocity: alloc.ferocity || 0,
          agility: alloc.agility || 0,
          essence: alloc.essence || 0
        }
      },
      gear: {
        hp: 0,
        pa: 0,
        pm: 0,
        initiative: 0,
        damage: 0,
        shield: 0
      }
    };

    const slots = this.equipped[heroId] || {};
    Object.values(slots).forEach(itemId => {
      if (!itemId) return;
      const item = ITEMS_DB[itemId];
      if (!item || !item.stats) return;

      if (item.stats.hp) { stats.maxHP += item.stats.hp; stats.gear.hp += item.stats.hp; }
      if (item.stats.pa) { stats.maxPA += item.stats.pa; stats.gear.pa += item.stats.pa; }
      if (item.stats.pm) { stats.maxPM += item.stats.pm; stats.gear.pm += item.stats.pm; }
      if (item.stats.initiative) { stats.initiative += item.stats.initiative; stats.gear.initiative += item.stats.initiative; }
      if (item.stats.damage) {
        stats.bonusDamage += item.stats.damage;
        stats.bonusMeleeDamage += item.stats.damage;
        stats.bonusRangedDamage += item.stats.damage;
        stats.bonusMagicDamage += item.stats.damage;
        stats.gear.damage += item.stats.damage;
      }
      if (item.stats.shield) { stats.initialShield += item.stats.shield; stats.gear.shield += item.stats.shield; }
    });

    return stats;
  }

  // --- EXP & LEVELING PROGRESSION METHODS ---

  getRequiredExp(level) {
    // Dynamic exponential progression curve:
    // Level 1 -> 2: 100 EXP
    // Level 2 -> 3: 180 EXP
    // Level 3 -> 4: 280 EXP
    // Level 4 -> 5: 400 EXP
    // Level 5 -> 6: 540 EXP ...
    return Math.floor(100 * Math.pow(level, 1.35));
  }

  getProgression(heroId) {
    if (!this.heroProgression[heroId]) {
      this.heroProgression[heroId] = {
        level: 1,
        currentExp: 0,
        unspentStatPoints: 0,
        unspentSkillPoints: 0,
        allocatedStats: { vitality: 0, ferocity: 0, agility: 0, essence: 0 },
        skillLevels: {}
      };
    }
    return this.heroProgression[heroId];
  }

  addExpToHero(heroId, expAmount) {
    const prog = this.getProgression(heroId);
    let levelsGained = 0;
    prog.currentExp += Math.max(0, Math.floor(expAmount));

    let required = this.getRequiredExp(prog.level);
    while (prog.currentExp >= required && prog.level < 20) {
      prog.currentExp -= required;
      prog.level += 1;
      levelsGained += 1;
      prog.unspentStatPoints += 3;
      prog.unspentSkillPoints += 1;
      required = this.getRequiredExp(prog.level);
    }

    this._notifyChange();

    return {
      heroId,
      levelsGained,
      currentLevel: prog.level,
      currentExp: prog.currentExp,
      requiredExp: required,
      unspentStatPoints: prog.unspentStatPoints,
      unspentSkillPoints: prog.unspentSkillPoints
    };
  }

  addExpToSquad(mainHeroId, baseExp, participatingHeroIds = null) {
    const results = {};
    if (!baseExp || baseExp <= 0) return results;

    // Only heroes in the active participating squad (Sapidae + 3 axies = max 4) receive EXP
    let squad;
    if (Array.isArray(participatingHeroIds) && participatingHeroIds.length > 0) {
      squad = participatingHeroIds.slice(0, 4);
    } else if (typeof this.getSquad === 'function') {
      squad = this.getSquad().filter(Boolean);
    } else if (this.unlockedHeroes && this.unlockedHeroes.length > 0) {
      squad = this.unlockedHeroes.slice(0, 4);
    } else {
      squad = ['kotaro'];
    }

    squad.forEach(heroId => {
      const earnedExp = Math.floor(baseExp * this.getExpShare(heroId, mainHeroId));
      results[heroId] = this.addExpToHero(heroId, earnedExp);
    });

    return results;
  }

  allocateStatPoint(heroId, statKey) {
    const prog = this.getProgression(heroId);
    if (!prog || prog.unspentStatPoints <= 0) return false;
    if (prog.allocatedStats[statKey] === undefined) return false;

    prog.unspentStatPoints -= 1;
    prog.allocatedStats[statKey] += 1;
    this._notifyChange();
    return true;
  }

  getSkillUpgradeCost(heroId, spellId) {
    const currentLvl = this.getSkillLevel(heroId, spellId);
    if (currentLvl >= 5) return null;
    return currentLvl; // Nv 1->2: 1 pt, Nv 2->3: 2 pts, Nv 3->4: 3 pts, Nv 4->5: 4 pts
  }

  upgradeSkill(heroId, spellId) {
    const prog = this.getProgression(heroId);
    if (!prog) return false;

    const currentLvl = prog.skillLevels[spellId] || 1;
    if (currentLvl >= 5) return false; // Max level 5

    const cost = currentLvl; // Nv 1->2: 1 pt, Nv 2->3: 2 pts, Nv 3->4: 3 pts, Nv 4->5: 4 pts
    if (prog.unspentSkillPoints < cost) return false;

    prog.unspentSkillPoints -= cost;
    prog.skillLevels[spellId] = currentLvl + 1;
    this._notifyChange();
    return true;
  }

  getSkillLevel(heroId, spellId) {
    const prog = this.getProgression(heroId);
    return (prog && prog.skillLevels && prog.skillLevels[spellId]) || 1;
  }
}
