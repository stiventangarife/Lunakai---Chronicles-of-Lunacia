// SaveSlotManager.js - Manages 3 persistent adventure save slots in localStorage
export const HERO_ROSTER = [
  {
    heroKey: 'beast_rage',
    axieId: '10455',
    name: 'Shinji',
    class: 'Beast',
    archetype: 'Beast Lunakai (Melee Duelist)',
    avatar: '🦁',
    icon: '⚔️',
    description: 'Specialist in close-quarters combat and devastating critical damage. Leads with sharp claws and indomitable determination.',
    baseHP: 340,
    basePA: 6,
    basePM: 3,
    baseInitiative: 85,
    genes: '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c',
    image: './assets/portraits/shinji.png',
    spellIds: ['kotaro_slash', 'kotaro_push', 'kotaro_jump'],
    skills: [
      { name: 'Fierce Strike', cost: '3 AP', desc: 'Melee attack dealing 65-80 damage.', icon: './assets/skills/heroes/shinji/1.png' },
      { name: 'Knockback Rush', cost: '2 AP', desc: 'Pushes the target 2 tiles causing collision.', icon: './assets/skills/heroes/shinji/2.png' },
      { name: 'Tactical Jump', cost: '3 AP', desc: 'Jumps over obstacles and lands on distant tiles.', icon: './assets/skills/heroes/shinji/3.png' }
    ]
  },
  {
    heroKey: 'bird_early',
    axieId: '3797905',
    name: 'Early Bird',
    class: 'Bird',
    archetype: 'Bird Lunakai (Swift Marksman)',
    avatar: '🦅',
    icon: '🏹',
    description: 'Agile and swift like the wind. Masters rapid movement with 4 MP and 115 initiative, striking with accurate Cupid arrows.',
    baseHP: 290,
    basePA: 6,
    basePM: 4,
    baseInitiative: 115,
    genes: '0x10000000000001000241c0e0820800000001000020408202000100082820820a000100081040800a000100142040400400010008106183040001000818418204',
    image: './assets/portraits/bird-early.png',
    spellIds: ['bird_cupid', 'bird_owl', 'bird_aerial_jump'],
    skills: [
      { name: "Cupid's Arrow", cost: '3 AP', desc: 'Accurate aerial ranged shot (1-4 Range) dealing 70-85 damage.', icon: './assets/skills/heroes/early-bird/1.png' },
      { name: 'Owl Gaze', cost: '2 AP', desc: 'Swift attack dealing 35-45 damage and granting +1 MP to the shooter.', icon: './assets/skills/heroes/early-bird/2.png' },
      { name: 'Aerial Jump', cost: '3 AP', desc: 'Flies nimbly over obstacles (2-4 Range), +30 shield and 25 damage in cross shape.', icon: './assets/skills/heroes/early-bird/3.png' }
    ]
  },
  {
    heroKey: 'plant_yak',
    axieId: '10830416',
    name: 'Big Yak',
    class: 'Plant',
    archetype: 'Plant Lunakai (Guardian Tank)',
    avatar: '🌱',
    icon: '🛡️',
    description: 'Colossus of nature with a massive pool of 380 HP and cactus plating. Absorbs enemy punishment and regenerates vitality.',
    baseHP: 380,
    basePA: 6,
    basePM: 3,
    baseInitiative: 70,
    genes: '0x1800000000000100600180e0820800000001000c286085080001000c106085080001000c286082080001000c2800830a0001000c18614104000100141060c502',
    image: './assets/portraits/plant-yak.png',
    spellIds: ['plant_cactus', 'plant_drain', 'plant_shield'],
    skills: [
      { name: 'Cactus Strike', cost: '3 AP', desc: 'Spiky heavy attack dealing 65-80 damage.', icon: './assets/skills/heroes/big-yak/1.png' },
      { name: 'Zigzag Bite', cost: '2 AP', desc: 'Drains energy from target dealing 40-50 damage and healing 35 HP.', icon: './assets/skills/heroes/big-yak/2.png' },
      { name: 'Bidens Shell', cost: '2 AP', desc: 'Grants 90 protective shield to an ally or self.', icon: './assets/skills/heroes/big-yak/3.png' }
    ]
  }
];

export function getHeroSpells(heroKeyOrAxieId) {
  if (!heroKeyOrAxieId) return ['kotaro_slash', 'kotaro_push', 'kotaro_jump'];
  const s = String(heroKeyOrAxieId).toLowerCase();
  if (s.includes('bird') || s.includes('pájaro') || s.includes('pajaro') || s === '3797905') {
    return ['bird_cupid', 'bird_owl', 'bird_aerial_jump'];
  }
  if (s.includes('plant') || s.includes('planta') || s === '10830416' || s.includes('yak')) {
    return ['plant_cactus', 'plant_drain', 'plant_shield'];
  }
  return ['kotaro_slash', 'kotaro_push', 'kotaro_jump'];
}

const STORAGE_KEY = 'axie_tactics_adventure_slots_v1';

export class SaveSlotManager {
  constructor() {
    this.slots = { 1: null, 2: null, 3: null };
    this.activeSlotId = null;
    this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.slots) {
          this.slots = Object.assign({ 1: null, 2: null, 3: null }, data.slots);
          this.activeSlotId = data.activeSlotId || null;

          // Auto-migrate legacy slots: update old Beast Axie ID (11968787) or old genes to Axie #10455
          const OLD_BEAST_GENES_PREFIX = '0x10001c0e090020c0';
          const NEW_BEAST_GENES = '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c';
          let migrated = false;

          for (const key of ['1', '2', '3']) {
            const slot = this.slots[key];
            if (slot && slot.hero) {
              const h = slot.hero;
              if (
                h.heroKey === 'beast_rage' ||
                h.heroKey === 'beast_shinji' ||
                h.axieId === '10455' ||
                h.axieId === '11968787' ||
                h.name === 'Kotaro' ||
                h.name === 'Rage 5 Evo' ||
                (h.genes && h.genes.startsWith(OLD_BEAST_GENES_PREFIX)) ||
                (h.id === 'kotaro' && (!h.axieId || h.modelType === 'kotaro'))
              ) {
                h.axieId = '10455';
                h.name = 'Shinji';
                h.genes = NEW_BEAST_GENES;
                h.modelType = 'axie';
                h.image = './assets/portraits/shinji.png';
                migrated = true;
              }

              if (h.heroKey === 'bird_early' || h.axieId === '3797905') {
                if (!h.image || h.image.includes('axieinfinity.com')) {
                  h.image = './assets/portraits/bird-early.png';
                  migrated = true;
                }
              }

              if (h.heroKey === 'plant_yak' || h.axieId === '10830416') {
                if (!h.image || h.image.includes('axieinfinity.com')) {
                  h.image = './assets/portraits/plant-yak.png';
                  migrated = true;
                }
              }
            }
          }
          if (migrated) {
            console.log('[SaveSlotManager] Auto-migrated saved slot(s) to Shinji (#10455)');
            this._saveToStorage();
          }
        }
      }
    } catch (e) {
      console.warn('[SaveSlotManager] Error loading save slots from localStorage:', e);
    }
  }

  _saveToStorage() {
    try {
      const payload = {
        version: 1,
        activeSlotId: this.activeSlotId,
        slots: this.slots,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[SaveSlotManager] Error saving slots to localStorage:', e);
    }
  }

  getSlots() {
    return [
      { id: 1, data: this.slots[1] },
      { id: 2, data: this.slots[2] },
      { id: 3, data: this.slots[3] }
    ];
  }

  getSlot(slotId) {
    return this.slots[slotId] || null;
  }

  getActiveSlot() {
    if (!this.activeSlotId) return null;
    return this.slots[this.activeSlotId] || null;
  }

  setActiveSlotId(slotId) {
    this.activeSlotId = slotId;
    this._saveToStorage();
  }

  createSlot(slotId, heroTemplate) {
    const newSlot = {
      id: slotId,
      createdAt: Date.now(),
      lastSaved: Date.now(),
      hero: {
        id: 'kotaro',
        heroKey: heroTemplate.heroKey,
        axieId: String(heroTemplate.axieId),
        name: heroTemplate.name,
        class: heroTemplate.class,
        archetype: heroTemplate.archetype,
        avatar: heroTemplate.avatar,
        icon: heroTemplate.icon,
        description: heroTemplate.description,
        baseHP: heroTemplate.baseHP,
        basePA: heroTemplate.basePA,
        basePM: heroTemplate.basePM,
        baseInitiative: heroTemplate.baseInitiative,
        genes: heroTemplate.genes,
        image: heroTemplate.image,
        spellIds: heroTemplate.spellIds || getHeroSpells(heroTemplate.heroKey),
        modelType: 'axie',
        scale: 0.88
      },
      level: 1,
      currentExp: 0,
      zone: {
        mapId: 'zone_2_2',
        name: 'Dojo Valley',
        coords: [2, 2],
        playerPos: { x: 0, y: 0, z: 2, yaw: Math.PI },
        visitedZones: ['zone_2_2']
      },
      questProgress: null,
      tutorialProgress: {
        isActive: true,
        currentStep: 'TALK_TO_PALADILL',
        hasOpenedQuestBook: false,
        hasEquippedSword: false,
        unlockedFeatures: { questBook: false, combat: false, inventory: false, worldMap: false }
      },
      unlockedHeroes: ['kotaro'],
      inventory: [],
      gold: 0,
      equipped: {
        kotaro: { weapon: null, hat: null, shield: null, body: null, boots: null },
        bing: { weapon: null, hat: null, shield: null, body: null, boots: null },
        pomodoro: { weapon: null, hat: null, shield: null, body: null, boots: null }
      },
      progression: null
    };

    this.slots[slotId] = newSlot;
    this.activeSlotId = slotId;
    this._saveToStorage();
    console.log(`[SaveSlotManager] Created Slot #${slotId} with hero: ${heroTemplate.name} (#${heroTemplate.axieId})`);
    return newSlot;
  }

  updateActiveSlot(progressData = {}) {
    if (!this.activeSlotId || !this.slots[this.activeSlotId]) return;

    const slot = this.slots[this.activeSlotId];
    slot.lastSaved = Date.now();

    if (progressData.level !== undefined) slot.level = progressData.level;
    if (progressData.currentExp !== undefined) slot.currentExp = progressData.currentExp;
    if (progressData.gold !== undefined) slot.gold = progressData.gold;
    if (progressData.zone) slot.zone = progressData.zone;
    if (progressData.questProgress) slot.questProgress = progressData.questProgress;
    if (progressData.tutorialProgress) slot.tutorialProgress = progressData.tutorialProgress;
    if (progressData.unlockedHeroes) slot.unlockedHeroes = progressData.unlockedHeroes;
    if (progressData.inventory) slot.inventory = progressData.inventory;
    if (progressData.equipped) slot.equipped = progressData.equipped;
    if (progressData.progression) slot.progression = progressData.progression;

    this._saveToStorage();
  }

  deleteSlot(slotId) {
    if (this.slots[slotId]) {
      this.slots[slotId] = null;
      if (this.activeSlotId === slotId) {
        this.activeSlotId = null;
      }
      this._saveToStorage();
      console.log(`[SaveSlotManager] Deleted Slot #${slotId}`);
      return true;
    }
    return false;
  }

  hasAnySave() {
    return !!(this.slots[1] || this.slots[2] || this.slots[3]);
  }
}

export const saveSlotManager = new SaveSlotManager();
