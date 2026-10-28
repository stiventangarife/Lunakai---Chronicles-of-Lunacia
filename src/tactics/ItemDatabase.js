// ItemDatabase.js — Objetos de la demo (Excel «Items» del 20-oct): equipo, consumibles, comida y objetos de misión.
// Los materiales están en data/EconomyCatalog.MATERIALS (bolsa de la Forja).
//
// Equipo: 7 líneas × 4 rarezas. Las piezas Comunes (Tier 0) están en EconomyCatalog.TIER0_ITEMS y se añaden aquí abajo;
// las Raras (T1), Épicas (T2) y Místicas (T3) solo se consiguen evolucionando en la Forja.
// Curva de estadísticas: Raro ×1,25 · Épico ×1,5 · Místico ×2 sobre la Común de su línea; el bastón Místico da +1 PA
// y las botas Místicas +1 PM. Iconos: assets/equippable/<id>.webp.
import { TIER0_ITEMS } from './data/EconomyCatalog.js';
import * as i18n from '../i18n/i18n.js';
export const ITEMS_DB = {
  // ==========================================
  // --- 1. EQUIPO (Raro · Épico · Místico) ---
  // ==========================================
  straw_hat: {
    id: 'straw_hat', name: 'Sombrero de paja', slot: 'hat', line: 'hat',
    icon: './assets/equippable/straw_hat.webp',
    rarity: 'rare', tier: 1,
    stats: { hp: 19 },
    description: 'Paja trenzada con lana del Ártico. Fresco y resistente.'
  },
  arcane_ring: { // Hito 92: era un aro; ahora es el casco de bronce (pieza hat_bronze del modelo). El id se conserva por las partidas guardadas.
    id: 'arcane_ring', name: 'Casco de bronce', slot: 'hat', line: 'hat',
    icon: './assets/equippable/arcane_ring.webp',
    rarity: 'epic', tier: 2,
    stats: { hp: 22 },
    description: 'Casco de bronce con forma de jabalí, templado con savia de druida.'
  },
  crown_of_lunacia: {
    id: 'crown_of_lunacia', name: 'Corona de Lunacia', slot: 'hat', line: 'hat',
    icon: './assets/equippable/crown_of_lunacia.webp',
    rarity: 'mystic', tier: 3,
    stats: { hp: 30 },
    description: 'La corona de los campeones de Lunacia, con ámbar del Gran Árbol.'
  },
  chitin_armor: {
    id: 'chitin_armor', name: 'Coraza de quitina', slot: 'body', line: 'body',
    icon: './assets/equippable/chitin_armor.webp',
    rarity: 'rare', tier: 1,
    stats: { hp: 31 },
    description: 'Placas ligeras forradas de lana.'
  },
  bronze_armor: {
    id: 'bronze_armor', name: 'Armadura de bronce', slot: 'body', line: 'body',
    icon: './assets/equippable/bronze_armor.webp',
    rarity: 'epic', tier: 2,
    stats: { hp: 38 },
    description: 'Bronce templado con savia de druida.'
  },
  obsidian_plate: {
    id: 'obsidian_plate', name: 'Placas de obsidiana', slot: 'body', line: 'body',
    icon: './assets/equippable/obsidian_plate.webp',
    rarity: 'mystic', tier: 3,
    stats: { hp: 50 },
    description: 'Obsidiana y ámbar: la armadura más dura de Lunacia.'
  },
  reinforced_leather_shield: {
    id: 'reinforced_leather_shield', name: 'Escudo de cuero reforzado', slot: 'shield', line: 'shield',
    icon: './assets/equippable/reinforced_leather_shield.webp',
    rarity: 'rare', tier: 1,
    stats: { hp: 22, shield: 19 },
    description: 'Cuero tenso sobre madera, con remaches de diente de lobo.'
  },
  iron_shield: {
    id: 'iron_shield', name: 'Escudo de hierro', slot: 'shield', line: 'shield',
    icon: './assets/equippable/iron_shield.webp',
    rarity: 'epic', tier: 2,
    stats: { hp: 27, shield: 22 },
    description: 'Hierro forjado con ramas de druida.'
  },
  steel_shield: {
    id: 'steel_shield', name: 'Escudo de acero', slot: 'shield', line: 'shield',
    icon: './assets/equippable/steel_shield.webp',
    rarity: 'mystic', tier: 3,
    stats: { hp: 36, shield: 30 },
    description: 'Acero con vetas de ámbar: casi nada lo atraviesa.'
  },
  traveler_boots: {
    id: 'traveler_boots', name: 'Botas de mensajero', slot: 'boots', line: 'boots',
    icon: './assets/equippable/traveler_boots.webp',
    rarity: 'rare', tier: 1,
    stats: { hp: 15, initiative: 2 },
    description: 'Ligeras y forradas de lana.'
  },
  wind_boots: {
    id: 'wind_boots', name: 'Botas del viento', slot: 'boots', line: 'boots',
    icon: './assets/equippable/wind_boots.webp',
    rarity: 'epic', tier: 2,
    stats: { hp: 18, initiative: 3 },
    description: 'Bordadas con flores lunares: los pasos no pesan.'
  },
  dragon_boots: {
    id: 'dragon_boots', name: 'Botas dracónicas', slot: 'boots', line: 'boots',
    icon: './assets/equippable/dragon_boots.webp',
    rarity: 'mystic', tier: 3,
    stats: { hp: 24, initiative: 4, pm: 1 },
    description: 'Escamas y ámbar. Permiten moverse más lejos (+1 PM).'
  },
  iron_sword: {
    id: 'iron_sword', name: 'Espada de hierro', slot: 'weapon', line: 'sword',
    icon: './assets/equippable/iron_sword.webp',
    rarity: 'rare', tier: 1,
    stats: { damage: 10, initiative: 2 },
    description: 'Filo de hierro reforzado con dientes de lobo.'
  },
  fish_sword: {
    id: 'fish_sword', name: 'Espada del pez', slot: 'weapon', line: 'sword',
    icon: './assets/equippable/fish_sword.webp',
    rarity: 'epic', tier: 2,
    stats: { damage: 12, initiative: 3 },
    description: 'Hoja curva y flexible como una aleta.'
  },
  chimera_sword: {
    id: 'chimera_sword', name: 'Espada de quimera', slot: 'weapon', line: 'sword',
    icon: './assets/equippable/chimera_sword.webp',
    rarity: 'mystic', tier: 3,
    stats: { damage: 16, initiative: 4 },
    description: 'Forjada con ámbar de Atia: corta como una garra de quimera.'
  },
  bone_bow: {
    id: 'bone_bow', name: 'Arco de hueso', slot: 'weapon', line: 'bow',
    icon: './assets/equippable/bone_bow.webp',
    rarity: 'rare', tier: 1,
    stats: { damage: 9, initiative: 4 },
    description: 'Hueso pulido y cuerda de lana trenzada.'
  },
  plant_bow: {
    id: 'plant_bow', name: 'Arco de planta', slot: 'weapon', line: 'bow',
    icon: './assets/equippable/plant_bow.webp',
    rarity: 'epic', tier: 2,
    stats: { damage: 10, initiative: 4 },
    description: 'Una rama de druida que sigue viva.'
  },
  bird_bow: {
    id: 'bird_bow', name: 'Arco de pájaro', slot: 'weapon', line: 'bow',
    icon: './assets/equippable/bird_bow.webp',
    rarity: 'mystic', tier: 3,
    stats: { damage: 14, initiative: 6 },
    description: 'Ligero como una pluma; dispara más rápido que nadie.'
  },
  plant_staff: {
    id: 'plant_staff', name: 'Bastón de planta', slot: 'weapon', line: 'staff',
    icon: './assets/equippable/plant_staff.webp',
    rarity: 'rare', tier: 1,
    stats: { hp: 25, damage: 8 },
    description: 'Raíces trenzadas que guardan rocío.'
  },
  ice_staff: {
    id: 'ice_staff', name: 'Bastón de hielo', slot: 'weapon', line: 'staff',
    icon: './assets/equippable/ice_staff.webp',
    rarity: 'epic', tier: 2,
    stats: { hp: 30, damage: 9 },
    description: 'Un cristal helado corona la vara.'
  },
  key_staff: {
    id: 'key_staff', name: 'Bastón de la llave', slot: 'weapon', line: 'staff',
    icon: './assets/equippable/key_staff.webp',
    rarity: 'mystic', tier: 3,
    stats: { hp: 40, damage: 12, pa: 1 },
    description: 'Abre la magia del Origen. Da +1 PA.'
  },

  // ==========================================
  // --- 2. CONSUMIBLES ---
  // ==========================================
  potion_health_small: {
    id: 'potion_health_small',
    name: 'Lesser Health Potion',
    category: 'consumable',
    slot: 'consumable',
    icon: './assets/consumable/lesser_health_potion.webp',
    rarity: 'common',
    tier: 1,
    stats: {},
    effect: { heal: 60 },
    description: 'Brew distilled with Lunacia forest nectar. Instantly restores 60 HP to the selected hero.'
  },
  dew_flask: {
    id: 'dew_flask',
    name: 'Healing Dew Flask',
    category: 'consumable',
    slot: 'consumable',
    icon: './assets/consumable/healing_dew_flask.webp',
    rarity: 'rare',
    tier: 2,
    stats: {},
    effect: { heal: 100 },
    description: 'Medicinal flask with moss extract and healing dew crafted by Ema. Instantly restores 100 HP to the selected hero.'
  },
  potion_health_large: {
    id: 'potion_health_large',
    name: 'Greater Health Elixir',
    category: 'consumable',
    slot: 'consumable',
    icon: './assets/consumable/greater_health_elixir.webp',
    rarity: 'epic',
    tier: 3,
    stats: {},
    effect: { heal: 150 },
    description: 'Sacred elixir concentrated with Atia flowers. Instantly restores 150 HP.'
  },

  // ==========================================
  // --- 3. COMIDA (vínculo con el Axie: Axie Care) ---
  // ==========================================
  food_berry: {
    id: 'food_berry',
    name: 'Mandarina lunar',
    category: 'food',
    slot: 'consumable',
    icon: './assets/consumable/mandarin.webp',
    rarity: 'common',
    tier: 1,
    stats: {},
    effect: { bond: 3 },
    description: 'Mandarina dulce que brilla bajo la luna de Lunacia. A tu Axie le encanta: +3 % de vínculo.'
  },
  food_rice_cake: {
    id: 'food_rice_cake',
    name: 'Pastelito de arroz del dojo',
    category: 'food',
    slot: 'consumable',
    icon: './assets/consumable/rice.webp',
    rarity: 'rare',
    tier: 2,
    stats: {},
    effect: { bond: 5 },
    description: 'Receta casera del Valle del Dojo, todavía tibia. +5 % de vínculo con tu Axie.'
  },
  // ==========================================
  // --- BOLSAS DE RUNA Y DE CHARM (Hito 54: se crean en la Forja y se abren desde la Mochila) ---
  // ==========================================
  rune_bag: {
    id: 'rune_bag',
    name: 'Bolsa de runa',
    category: 'bag',
    slot: 'consumable',
    icon: './assets/consumable/bag_rune.webp', // Hito 74
    rarity: 'epic',
    tier: 2,
    stats: {},
    effect: { openBag: 'runes' },
    description: 'Ábrela en la Mochila: dentro hay una runa de clase al azar (Acuático, Bestia, Pájaro, Bicho, Planta o Reptil).'
  },
  charm_bag: {
    id: 'charm_bag',
    name: 'Bolsa de charm',
    category: 'bag',
    slot: 'consumable',
    icon: './assets/consumable/bag_charms.webp', // Hito 74
    rarity: 'rare',
    tier: 1,
    stats: {},
    effect: { openBag: 'charms' },
    description: 'Ábrela en la Mochila: dentro hay un charm de clase al azar (Acuático, Bestia, Pájaro, Bicho, Planta o Reptil).'
  },
  food_feast: {
    id: 'food_feast',
    name: 'Festín de Lunacia',
    category: 'food',
    slot: 'consumable',
    icon: './assets/consumable/feast.webp',
    rarity: 'epic',
    tier: 3,
    stats: {},
    effect: { bond: 8 },
    description: 'Banquete de frutas, néctar y arroz dorado para ocasiones especiales. +8 % de vínculo con tu Axie.'
  },
  food_fruit: {
    id: 'food_fruit',
    name: 'Frutas del bosque',
    category: 'food',
    slot: 'consumable',
    icon: './assets/consumable/fruits.webp',
    rarity: 'common',
    tier: 1,
    stats: {},
    effect: { bond: 3 },
    description: 'Frutas que guardan los slimes. +3 % de vínculo con tu Axie.'
  },
  food_fish: {
    id: 'food_fish',
    name: 'Pescado de río',
    category: 'food',
    slot: 'consumable',
    icon: './assets/consumable/fish.webp',
    rarity: 'common',
    tier: 1,
    stats: {},
    effect: { bond: 4 },
    description: 'Recién pescado en el río del Bosque. +4 % de vínculo con tu Axie.'
  },
  food_koi: {
    id: 'food_koi',
    name: 'Koi dorado',
    category: 'food',
    slot: 'consumable',
    icon: './assets/consumable/fish_koi.webp',
    rarity: 'mystic',
    tier: 1,
    stats: {},
    effect: { bond: 10 },
    description: 'Un pez que brilla como una moneda. A tu Axie le encanta: +10 % de vínculo.'
  },

  // ==========================================
  // --- 4. OBJETOS DE MISIÓN ---
  // ==========================================
  luminous_moss: {
    id: 'luminous_moss',
    name: 'Luminous Forest Moss',
    category: 'quest',
    slot: 'quest',
    icon: './assets/materials/misions/luminous_forest_moss.webp',
    rarity: 'common',
    tier: 1,
    stats: {},
    description: 'Glow-in-the-dark plant sprout required by Ema to purify her elixirs.'
  },
  frost_mushrooms: {
    id: 'frost_mushrooms',
    name: 'Boreal Frost Mushrooms',
    category: 'quest',
    slot: 'quest',
    icon: './assets/materials/misions/boreal_frost_mushrooms.webp',
    rarity: 'common',
    tier: 2,
    stats: {},
    description: 'Bluish mushrooms gathered in the snow for the Boreal Chef\'s restorative broth.'
  },
  postman_letters: {
    id: 'postman_letters',
    name: 'Messenger\'s Letters',
    category: 'quest',
    slot: 'quest',
    icon: './assets/materials/misions/messenger_letters.webp',
    rarity: 'rare',
    tier: 1,
    stats: {},
    description: 'Sealed royal mail satchel that fell in the plains during the chimera ambush.'
  },
  hardened_ore: {
    id: 'hardened_ore',
    name: 'Hardened Savanna Ore',
    category: 'quest',
    slot: 'quest',
    icon: './assets/materials/misions/hardened_savanna_ore.webp',
    rarity: 'rare',
    tier: 2,
    stats: {},
    description: 'Armored chimera carapace mineral fragment delivered to Baruk to temper nomad steel.'
  },
  golden_pickaxe: {
    id: 'golden_pickaxe',
    name: 'Tripp\'s Golden Pickaxe',
    category: 'quest',
    slot: 'quest',
    icon: './assets/materials/misions/tripp_golden_pickaxe.webp',
    rarity: 'epic',
    tier: 4,
    stats: {},
    description: 'The legendary pickaxe forged in Atia gold rescued from the fiery fortress galleries.'
  },
  fallen_stardust: {
    id: 'fallen_stardust',
    name: 'Fallen Stardust',
    category: 'quest',
    slot: 'quest',
    icon: './assets/materials/misions/fallen_stardust.webp',
    rarity: 'epic',
    tier: 3,
    stats: {},
    description: 'Luminescent stardust the Astral Astrologer studies to decipher constellations.'
  },
  crimson_crypt_key: {
    id: 'crimson_crypt_key',
    name: 'Crimson Crypt Key',
    slot: 'quest',
    category: 'quest',
    icon: './assets/materials/misions/crimson_crypt_key.webp',
    rarity: 'mystic',
    tier: 5,
    stats: {},
    description: 'Key forged in elemental magma. Unlocks the arcane seal of the final Crypt Catacombs.'
  }
};
i18n.applyText(ITEMS_DB, 'items', ['name', 'description']);

// Piezas Comunes (Tier 0): las que se crean en la Forja, se compran en la Tienda o se ganan en misiones y combates.
Object.values(TIER0_ITEMS).forEach((t) => {
  if (!ITEMS_DB[t.id]) ITEMS_DB[t.id] = { ...t, icon: t.icon || './assets/ui/icons/build.png' };
});

// El equipo tiene 4 niveles y la rareza va ligada al nivel: Tier 0 Común · Tier 1 Raro · Tier 2 Épico · Tier 3 Místico.
// Las piezas que en el catálogo figuran como T4 o T5 cuentan como Tier 3 (Místico).
export const MAX_TIER = 3;
export const TIER_RARITY = { 0: 'common', 1: 'rare', 2: 'epic', 3: 'mystic' };
export const EQUIP_SLOTS = ['weapon', 'hat', 'shield', 'body', 'boots'];
Object.values(ITEMS_DB).forEach((it) => {
  if (!EQUIP_SLOTS.includes(it.slot)) return;
  it.tier = Math.max(0, Math.min(MAX_TIER, it.tier ?? 1));
  it.rarity = TIER_RARITY[it.tier];
});

// Botín de los combates según la isla (regla del 20-oct): Común en el Bosque y la Sabana · Raro en el Ártico ·
// Épico en Mística · Místico en Génesis. Cada monstruo suelta sus materiales (BiomeEnemyCatalog.possibleDrops);
// este es el botín general de cada isla (tier de dificultad: 1 Bosque · 2 Sabana · 3 Ártico · 4 Mística · 5 Génesis).
// El equipo que cae en combate es solo Común (Bosque y Sabana). Ids de MATERIALS van a la bolsa de la Forja.
const COMMON_GEAR = Object.keys(TIER0_ITEMS);
export const TIER_DROPS = {
  1: [...COMMON_GEAR, 'mat_slime_goo', 'food_fruit'],
  2: [...COMMON_GEAR, 'mat_slime_goo', 'mat_chimera_tail'],
  3: ['mat_wool', 'mat_wood'],
  4: ['mat_druid_branch', 'mat_druid_staff', 'mat_druid_flower'],
  5: ['mat_amber_atia'],
};

// Ya no hay botín por rol (daba equipo de cualquier rareza en cualquier isla).
export const ROLE_DROPS = {};

export const LEVEL_DROPS = {
  level_1_tutorial: ['wood_sword'],
  level_2_plains: ['composite_bow', 'beast_helmet', 'wooden_buckler'],
};
