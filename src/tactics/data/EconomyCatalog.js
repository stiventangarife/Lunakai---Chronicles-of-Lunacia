// EconomyCatalog.js — Economía de la demo: materiales, Forja (crear y evolucionar) y Tienda. Solo datos.
// Lo leen ItemDatabase, la Forja (rpg/ForgeService.js), la Tienda, la recolección y el botín de los combates.
//
//  · Rareza (la del Excel «Items» del 20-oct): Común · Raro · Épico · Místico. Un material muestra su rareza y su isla;
//    `tier` solo ordena y pone precio (Común 1 … Místico 4; la esquirla lunar es el catalizador, tier 0).
//  · Forja «Crear»: las 7 piezas Comunes (una por línea) con materiales Comunes (Bosque y Sabana).
//  · Forja «Evolucionar»: Común → Raro (1 min) → Épico (2 min) → Místico (3 min). Cada salto se paga con SLP,
//    materiales de la rareza de destino, esquirlas lunares (solo al Místico) y 0,5 bAXS. Tiempos cortos a propósito:
//    es una demo y el calificador tiene que poder ver todo el bucle en poco tiempo.
//  · El equipo Raro, Épico y Místico solo se consigue evolucionando (ni misiones, ni combates, ni Tienda).
//  · Tienda: pociones, comida, materiales Comunes y equipo Común.
import * as i18n from '../../i18n/i18n.js';

/* ───────────────────────── Materiales ───────────────────────── */
export const MATERIAL_RARITY_NAME = { common: i18n.t('items.rarity.common'), rare: i18n.t('items.rarity.rare'), epic: i18n.t('items.rarity.epic'), mystic: i18n.t('items.rarity.mystic') };
export const MATERIALS = {
  // Comunes · Bosque y Sabana
  mat_copper:        { id: 'mat_copper',        name: 'Cobre del cañón',  rarity: 'common', tier: 1, biome: 'savannah', icon: './assets/materials/ore_copper.webp', glyph: 'ingot',  source: 'Minar las vetas de la Isla de la Sabana',           description: 'Metal blando que se trabaja en frío. La base de casi todo el equipo Común.' },
  mat_slime_goo:     { id: 'mat_slime_goo',     name: 'Baba de slime',    rarity: 'common', tier: 1, biome: 'forest',   icon: './assets/materials/slime.webp', glyph: 'slime',  source: 'Slimes del Bosque y la Sabana',                     description: 'Pegajosa y elástica: une piezas y sella costuras.' },
  mat_chimera_tail:  { id: 'mat_chimera_tail',  name: 'Cola de quimera',  rarity: 'common', tier: 1, biome: 'savannah', icon: './assets/materials/tail_chimera.webp', glyph: 'tail',   source: 'Lobos acuáticos de la Sabana',                      description: 'Tira de cuero flexible para correas, cuerdas y empuñaduras.' },
  // Raros
  mat_wood:          { id: 'mat_wood',          name: 'Madera',           rarity: 'rare',   tier: 2, biome: 'forest',   icon: './assets/materials/wood.webp', glyph: 'log',    source: 'Talar árboles (Bosque y Ártico) · Slimes Caballero del Ártico', description: 'Tronco recio y fácil de trabajar. Lo pide cualquier evolución a Raro.' },
  mat_wolf_tooth:    { id: 'mat_wolf_tooth',    name: 'Diente de lobo',   rarity: 'rare',   tier: 2, biome: 'savannah', icon: './assets/materials/wolf_fang.webp', glyph: 'fang',   source: 'Lobos acuáticos de la Sabana',                      description: 'Afilado como una cuchilla: refuerza filos y puntas.' },
  mat_wool:          { id: 'mat_wool',          name: 'Lana',             rarity: 'rare',   tier: 2, biome: 'arctic',   icon: './assets/materials/wool_sheep.webp', glyph: 'wool',   source: 'Lobos grises y alfa del Ártico',                    description: 'Abriga y acolcha. Va en armaduras, sombreros y empuñaduras.' },
  // Épicos · Mística
  mat_moon_flower:   { id: 'mat_moon_flower',   name: 'Flor lunar',       rarity: 'epic',   tier: 3, biome: 'mystic',   icon: './assets/materials/moon_flower.webp', glyph: 'flower', source: 'Recolectar flores en la Isla Mística',              description: 'Solo abre de noche. Sus pétalos guardan un poco de luz de luna.' },
  mat_druid_branch:  { id: 'mat_druid_branch',  name: 'Rama de druida',   rarity: 'epic',   tier: 3, biome: 'mystic',   icon: './assets/materials/druid_branch.webp', glyph: 'branch', source: 'Dríadas de la Isla Mística',                        description: 'Rama viva que todavía brota. Da forma a las piezas Épicas.' },
  mat_druid_staff:   { id: 'mat_druid_staff',   name: 'Bastón de druida', rarity: 'epic',   tier: 3, biome: 'mystic',   icon: './assets/materials/druid_staff.webp', glyph: 'staff',  source: 'Dríadas de la Isla Mística',                        description: 'Bastón tallado por las dríadas; conduce la magia del bosque.' },
  mat_druid_flower:  { id: 'mat_druid_flower',  name: 'Flor de druida',   rarity: 'epic',   tier: 3, biome: 'mystic',   icon: './assets/materials/druid_flower.webp', glyph: 'flower', source: 'Dríadas de la Isla Mística',                        description: 'Flor encantada que nunca se marchita.' },
  // Místicos
  mat_frost_crystal: { id: 'mat_frost_crystal', name: 'Cristal de escarcha', rarity: 'mystic', tier: 4, biome: 'arctic', icon: './assets/materials/crystal_frost.webp', glyph: 'crystal', source: 'Tala en el Ártico (raro)',                         description: 'Guarda el frío dentro. Lo pide la evolución a Místico.' },
  mat_astral_dust:   { id: 'mat_astral_dust',   name: 'Polvo astral',     rarity: 'mystic', tier: 4, biome: 'mystic',   icon: './assets/materials/astral_dust.webp', glyph: 'dust',   source: 'Recolectar flores en Mística (raro)',               description: 'Restos de estrellas caídas. Despierta la magia del equipo.' },
  mat_amber_atia:    { id: 'mat_amber_atia',    name: 'Ámbar de Atia',    rarity: 'mystic', tier: 4, biome: 'dungeon',  icon: './assets/materials/atia_amber.webp', glyph: 'resin',  source: 'Osos, slimes de Génesis y su jefe',                 description: 'Savia del Gran Árbol endurecida durante siglos. El corazón de toda pieza Mística.' },
  // Catalizador de evolución
  mat_lunar_shard:   { id: 'mat_lunar_shard',   name: 'Esquirla lunar',   rarity: 'mystic', tier: 0, biome: 'any',      icon: './assets/materials/lunar_shard.webp', glyph: 'shard',  source: 'Minería en la Sabana (rara) y la Tienda',           description: 'Fragmento de la luna de Lunacia. Necesario para evolucionar a Místico.' },
};
i18n.applyText(MATERIALS, 'items', ['name', 'source', 'description']);

/* ───────────────────────── Forja · Crear (Común) ─────────────────────────
   Las 7 piezas Comunes, una por línea de evolución. Son las únicas que se pueden crear, comprar o ganar. */
const EQ = (n) => `./assets/equippable/${n}.webp`;
export const TIER0_ITEMS = {
  beast_helmet:   { id: 'beast_helmet',   name: 'Yelmo bestial',    slot: 'hat',    rarity: 'common', tier: 0, stats: { hp: 15 },                icon: EQ('beast_helmet'),   description: 'Casco de cuero y hueso. El primer sombrero de todo aventurero.' },
  traveler_cloak: { id: 'traveler_cloak', name: 'Capa de viajero',  slot: 'body',   rarity: 'common', tier: 0, stats: { hp: 25 },                icon: EQ('traveler_cloak'), description: 'Capa gruesa y cómoda para los caminos de Lunacia.' },
  wooden_buckler: { id: 'wooden_buckler', name: 'Rodela de roble',  slot: 'shield', rarity: 'common', tier: 0, stats: { hp: 18, shield: 15 },    icon: EQ('wooden_buckler'), description: 'Escudo pequeño de roble con remaches de cobre.' },
  heavy_boots:    { id: 'heavy_boots',    name: 'Botas pesadas',    slot: 'boots',  rarity: 'common', tier: 0, stats: { hp: 12, initiative: 2 }, icon: EQ('heavy_boots'),    description: 'Suela gruesa para no resbalar en el barro.' },
  wood_sword:     { id: 'wood_sword',     name: 'Espada de madera', slot: 'weapon', rarity: 'common', tier: 0, stats: { damage: 8, initiative: 2 }, icon: EQ('wood_sword'),   description: 'La espada de entrenamiento del Maestro Paladill.' },
  composite_bow:  { id: 'composite_bow',  name: 'Arco compuesto',   slot: 'weapon', rarity: 'common', tier: 0, stats: { damage: 7, initiative: 3 }, icon: EQ('composite_bow'), description: 'Madera y cola de quimera: ligero y preciso.' },
  mushroom_staff: { id: 'mushroom_staff', name: 'Bastón de hongo',  slot: 'weapon', rarity: 'common', tier: 0, stats: { hp: 20, damage: 6 },     icon: EQ('mushroom_staff'),   description: 'Un bastón coronado por un hongo que brilla un poco.' },
};
i18n.applyText(TIER0_ITEMS, 'items', ['name', 'description']);

/** Recetas de la forja: materiales Comunes + oro → pieza Común. */
export const CRAFT_RECIPES = [
  { id: 'r_beast_helmet',   result: 'beast_helmet',   gold: 15, mats: { mat_chimera_tail: 2, mat_slime_goo: 1 } },
  { id: 'r_traveler_cloak', result: 'traveler_cloak', gold: 20, mats: { mat_slime_goo: 3, mat_chimera_tail: 1 } },
  { id: 'r_wooden_buckler', result: 'wooden_buckler', gold: 20, mats: { mat_copper: 2, mat_slime_goo: 2 } },
  { id: 'r_heavy_boots',    result: 'heavy_boots',    gold: 15, mats: { mat_chimera_tail: 2, mat_copper: 1 } },
  { id: 'r_wood_sword',     result: 'wood_sword',     gold: 20, mats: { mat_copper: 3, mat_slime_goo: 1 } },
  { id: 'r_composite_bow',  result: 'composite_bow',  gold: 20, mats: { mat_slime_goo: 2, mat_chimera_tail: 2 } },
  { id: 'r_mushroom_staff', result: 'mushroom_staff', gold: 25, mats: { mat_slime_goo: 2, mat_copper: 1, mat_chimera_tail: 1 } },
  // Hito 54: bolsas que se abren en la Mochila y dan una runa o un charm de clase al azar
  // Hito 74: se pagan con SLP (no con oro), además de los materiales
  { id: 'r_rune_bag',       result: 'rune_bag',       slp: 80, mats: { mat_slime_goo: 5, mat_copper: 3, mat_lunar_shard: 1 } },
  { id: 'r_charm_bag',      result: 'charm_bag',      slp: 50, mats: { mat_chimera_tail: 3, mat_lunar_shard: 1 } },
];

/* ───────────────────────── Forja · Evolucionar ─────────────────────────
   4 niveles: Tier 0 Común · Tier 1 Raro · Tier 2 Épico · Tier 3 Místico (ItemDatabase.TIER_RARITY).
   Cada línea va de Común a Místico; una pieza evoluciona a la siguiente de su línea. */
export const EVOLUTION_LINES = {
  hat:    ['beast_helmet', 'straw_hat', 'arcane_ring', 'crown_of_lunacia'],
  armor:  ['traveler_cloak', 'chitin_armor', 'bronze_armor', 'obsidian_plate'],
  shield: ['wooden_buckler', 'reinforced_leather_shield', 'iron_shield', 'steel_shield'],
  boots:  ['heavy_boots', 'traveler_boots', 'wind_boots', 'dragon_boots'],
  sword:  ['wood_sword', 'iron_sword', 'fish_sword', 'chimera_sword'],
  bow:    ['composite_bow', 'bone_bow', 'plant_bow', 'bird_bow'],
  staff:  ['mushroom_staff', 'plant_staff', 'ice_staff', 'key_staff'],
};

/** Coste de subir AL tier indicado (el del objeto resultante): SLP + materiales de esa rareza + esquirlas + 0,5 bAXS.
 *  `hours` = tiempo hasta que la pieza está lista (1, 2 y 3 minutos en la demo). */
export const EVOLUTION_COST = {
  1: { slp: 50,  hours: 1 / 60, mats: { mat_wood: 2, mat_wolf_tooth: 1, mat_wool: 1 },                                 shards: 0 },
  2: { slp: 150, hours: 2 / 60, mats: { mat_moon_flower: 2, mat_druid_branch: 1, mat_druid_staff: 1, mat_druid_flower: 1 }, shards: 0 },
  3: { slp: 400, hours: 3 / 60, mats: { mat_amber_atia: 2, mat_frost_crystal: 1, mat_astral_dust: 1 },                  shards: 1 },
};
/** Comisión en bAXS de cada evolución (fija, en todos los tiers). */
export const EVOLUTION_FEE_BAXS = 0.5;
/** Rapidez: multiplicador → coste base en bAXS (T1). ×1 es gratis. */
export const SPEEDUP_BAXS = { 1: 0, 2: 1, 4: 3 };
/** El coste de la rapidez sube con el tier de destino. */
export const SPEEDUP_TIER_MULT = { 1: 1, 2: 1.5, 3: 2 };
/** Yunques: evoluciones que pueden estar en curso a la vez. */
export const FORGE_ANVILS = 2;

/** Coste total de evolucionar a `tier` con rapidez `speed` (1, 2 o 4). */
export function evolutionQuote(tier, speed = 1) {
  const c = EVOLUTION_COST[tier];
  if (!c) return null;
  const speedBaxs = +((SPEEDUP_BAXS[speed] ?? 0) * (SPEEDUP_TIER_MULT[tier] ?? 1)).toFixed(2);
  return { slp: c.slp, mats: c.mats, shards: c.shards, feeBaxs: EVOLUTION_FEE_BAXS, speedBaxs, baxs: +(EVOLUTION_FEE_BAXS + speedBaxs).toFixed(2), hours: c.hours / speed };
}

/** Siguiente pieza de la línea de `itemId`, o null si ya está en lo más alto. */
export function nextEvolution(itemId) {
  for (const line of Object.values(EVOLUTION_LINES)) {
    const i = line.indexOf(itemId);
    if (i >= 0) return line[i + 1] || null;
  }
  return null;
}

/* ───────────────────────── Precios ───────────────────────── */
// Tier 0 a 60 (20-oct): crearlo en la forja (33–49 de oro con los materiales a precio de tienda) sale más barato que
// comprarlo, y venderlo (18) da menos que crearlo, así que no hay bucle de ganancia.
export const PRICE_BY_TIER = { 0: 60, 1: 60, 2: 150, 3: 400 }; // equipo (Tier 0–3)
export const RARITY_MULT = { common: 1, uncommon: 1.2, rare: 1.5, epic: 2, mystic: 3, legendary: 3 };
export const MATERIAL_PRICE = { 0: 250, 1: 6, 2: 14, 3: 30, 4: 65 }; // por tier: Común 1 … Místico 4 · 0 = esquirla lunar
export const CONSUMABLE_PRICE = {
  food_berry: 12, food_fruit: 10, food_fish: 15, food_rice_cake: 30, food_feast: 75, food_koi: 120,
  potion_health_small: 25, dew_flask: 55, potion_health_large: 90,
  rune_bag: 160, charm_bag: 100, // no se venden en la tienda; desde el Hito 110 Ochi tampoco las compra (solo Mercado, AXS)
};
/** Runas y charms: desde el Hito 110 Ochi ya no las compra; solo se intercambian en el Mercado, en AXS. */
export const RUNE_CHARM_SELL = { neutral: 0, common: 0, rare: 0, epic: 0, mystic: 0, secret: 0 };
/* ───────────────────────── Monedas (Hito 110) ─────────────────────────
   Oro: Ochi, Forja T0 y Mercado de recursos · SLP: evolución y bolsas · AXS: Mercado de equipo T1–3, runas y charms
   (se perciben como NFT) · bAXS: tasas de la Forja y, más adelante, premios de arena y reto semanal (no se intercambia). */
export const CURRENCIES = ['gold', 'slp', 'axs', 'baxs'];
/** Monedas con 2 decimales. */
export const DECIMAL_CURRENCIES = ['axs', 'baxs'];
/** Mercado entre jugadores: moneda de cada categoría y precio mínimo por unidad en AXS (sin máximo). */
export const MARKET_CURRENCY = { res: 'gold', gear: 'axs', rc: 'axs' };
export const MARKET_GEAR_MIN_AXS = { 1: 0.5, 2: 1, 3: 3 };
export const MARKET_RC_MIN_AXS = { neutral: 0.2, common: 0.2, rare: 0.5, epic: 1, secret: 1, mystic: 2, legendary: 2 };
/** Bolsas de runa y de charm: solo en el Mercado, en AXS (Ochi ya no las compra). */
export const MARKET_BAG_MIN_AXS = { rune_bag: 0.5, charm_bag: 0.3 };
/** Bono de inicio de cada partida nueva y regalo único a las partidas que ya existían (Hito 110). */
export const STARTER_AXS = 5;
export const LAUNCH_GIFT = { axs: 5, baxs: 15 };
/** Botín de los combates (fuera del tutorial): probabilidad de un charm y de una runa neutros por victoria; ×2 con jefes. */
export const RUNE_CHARM_DROP = { charm: 0.10, rune: 0.05, bossMult: 2 };
export const SELL_RATIO = 0.3;           // el equipo y los consumibles se venden al 30 %
export const SELL_RATIO_MATERIAL = 0.5;  // los materiales, al 50 %
export const BUYBACK_SLOTS = 6;          // lo último vendido se puede recomprar al mismo precio

/** Precio de compra en la tienda. `item` es una entrada de ITEMS_DB, TIER0_ITEMS o MATERIALS. */
export function buyPrice(item) {
  if (!item) return 0;
  if (item.id in MATERIALS) return MATERIAL_PRICE[item.tier] ?? 10;
  if (item.id in CONSUMABLE_PRICE) return CONSUMABLE_PRICE[item.id];
  return Math.round((PRICE_BY_TIER[item.tier ?? 1] ?? 60) * (RARITY_MULT[item.rarity] ?? 1));
}
/** Precio de venta (0 = no se puede vender). */
export function sellPrice(item) {
  if (!item || item.slot === 'quest' || item.category === 'quest') return 0;
  if (item.runeCharm || item.category === 'bag') return 0; // Hito 110: solo en el Mercado (AXS)
  const ratio = item.id in MATERIALS ? SELL_RATIO_MATERIAL : SELL_RATIO;
  return Math.max(1, Math.floor(buyPrice(item) * ratio));
}

/** Tier más alto de equipo que compra alguna tienda (el servidor no acepta vender a Ochi nada por encima). */
export const maxSellGearTier = () => Math.max(...Object.values(SHOPS).map((s) => s.maxGearTier ?? 3));

/* ───────────────────────── Existencias de cada tienda ─────────────────────────
   `stock` = unidades al día (null = ilimitado). Se renuevan cada `restockHours`. */
export const SHOPS = {
  dojo_valley: {
    id: 'dojo_valley', name: i18n.t('items.shop.dojoValley.name'), place: i18n.t('items.shop.dojoValley.place'), island: 'island_forest', restockHours: 6,
    // Solo vende (y solo compra) equipo Común; el Raro, Épico y Místico solo se consigue evolucionando en la Forja.
    maxGearTier: 0,
    stock: [
      { id: 'potion_health_small', stock: null }, { id: 'potion_health_large', stock: 3 },
      { id: 'food_berry', stock: null }, { id: 'food_rice_cake', stock: 10 }, { id: 'food_feast', stock: 2 },
      { id: 'mat_copper', stock: 20 }, { id: 'mat_slime_goo', stock: 20 }, { id: 'mat_chimera_tail', stock: 20 }, { id: 'mat_lunar_shard', stock: 1 },
      { id: 'wood_sword', stock: 2 }, { id: 'composite_bow', stock: 2 }, { id: 'mushroom_staff', stock: 2 },
      { id: 'beast_helmet', stock: 2 }, { id: 'wooden_buckler', stock: 2 }, { id: 'traveler_cloak', stock: 2 }, { id: 'heavy_boots', stock: 2 },
    ],
  },
};
