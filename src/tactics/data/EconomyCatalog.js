// EconomyCatalog.js — PROPUESTA de economía para la Tienda y la Forja (pantallas 24 y 25 del sistema de diseño).
// Solo datos (los leen ItemDatabase y la Forja · rpg/ForgeService.js). Ajusta números aquí y la interfaz los leerá tal cual.
//
//  · Moneda: el oro que ya existe (EquipmentManager.getGold()).
//  · Materiales: uno o varios por bioma; el tier del material es el de su isla (Bosque 1 … Génesis 5).
//  · Forja «Crear»: objetos Tier 0 con materiales del Bosque (el primer equipo que fabrica el jugador).
//  · Forja «Evolucionar»: cada pieza sube a la siguiente de su línea (EVOLUTION_LINES) pagando SLP,
//    materiales del tier de destino, esquirlas lunares y 0,5 bAXS de comisión. Tarda unas horas
//    (acelerables ×2 / ×4 con bAXS). Mientras se forja, el héroe sigue usando la versión actual.
//  · Tienda: vende recursos, comida, pociones y equipo Tier 0; compra lo mismo (ni equipo Tier 1–3 ni objetos de misión).

/* ───────────────────────── Materiales ───────────────────────── */
export const MATERIALS = {
  // Bosque · Tier 1
  mat_bamboo:        { id: 'mat_bamboo',        name: 'Caña de bambú',       tier: 1, biome: 'forest',   glyph: 'bamboo',  source: 'Talar bambú en el Valle del Dojō',          description: 'Ligera y flexible. Base de casi todo el equipo inicial.' },
  mat_fiber:         { id: 'mat_fiber',         name: 'Fibra de liana',      tier: 1, biome: 'forest',   glyph: 'fiber',   source: 'Slimes del Bosque',                         description: 'Se trenza en cuerdas, correas y telas sencillas.' },
  mat_resin:         { id: 'mat_resin',         name: 'Resina de Atia',      tier: 1, biome: 'forest',   glyph: 'resin',   source: 'Árboles junto al Gran Árbol de Atia',       description: 'Sella y endurece la madera. Brilla un poco de noche.' },
  // Sabana · Tier 2
  mat_hide:          { id: 'mat_hide',          name: 'Cuero de la sabana',  tier: 2, biome: 'savannah', glyph: 'hide',    source: 'Quimeras de la Sabana',                     description: 'Curtido al sol del cañón; resistente y flexible.' },
  mat_copper:        { id: 'mat_copper',        name: 'Cobre del cañón',     tier: 2, biome: 'savannah', glyph: 'ingot',   source: 'Vetas del Cañón Solar',                     description: 'Metal blando que se trabaja en frío.' },
  // Ártico · Tier 3
  mat_glacier_iron:  { id: 'mat_glacier_iron',  name: 'Hierro glaciar',      tier: 3, biome: 'arctic',   glyph: 'ingot',   source: 'Minas de los Picos Glaciares',              description: 'Hierro templado en hielo eterno: no se mella.' },
  mat_frost_crystal: { id: 'mat_frost_crystal', name: 'Cristal de escarcha', tier: 3, biome: 'arctic',   glyph: 'crystal', source: 'Quimeras de hielo',                         description: 'Guarda el frío dentro; refuerza escudos y bastones.' },
  // Mística · Tier 4
  mat_astral_dust:   { id: 'mat_astral_dust',   name: 'Polvo astral',        tier: 4, biome: 'mystic',   glyph: 'dust',    source: 'Santuario Cósmico',                         description: 'Restos de estrellas caídas. Despierta la magia del equipo.' },
  mat_moon_silk:     { id: 'mat_moon_silk',     name: 'Seda lunar',          tier: 4, biome: 'mystic',   glyph: 'spool',   source: 'Tejedoras del Vacío Astral',                description: 'Tela que pesa menos que el aire.' },
  // Génesis · Tier 5
  mat_obsidian_core: { id: 'mat_obsidian_core', name: 'Núcleo de obsidiana', tier: 5, biome: 'dungeon',  glyph: 'gem',     source: 'Guardianes de los Jardines del Origen',     description: 'Corazón de roca volcánica, aún caliente.' },
  mat_origin_essence:{ id: 'mat_origin_essence',name: 'Esencia del origen',  tier: 5, biome: 'dungeon',  glyph: 'flame',   source: 'Jefes de Génesis',                          description: 'La materia de la que nació Lunacia.' },
  // Catalizador de evolución (todas las islas)
  mat_lunar_shard:   { id: 'mat_lunar_shard',   name: 'Esquirla lunar',      tier: 0, biome: 'any',      glyph: 'shard',   source: 'Jefes, cofres y la tienda',                 description: 'Fragmento de la luna de Lunacia. Necesario para evolucionar equipo de Tier 2 en adelante.' },
};

/* ───────────────────────── Forja · Crear (Tier 0) ─────────────────────────
   `art` reutiliza el dibujo del T1 de su línea hasta que haya arte propio. */
export const TIER0_ITEMS = {
  t0_practice_sword: { id: 't0_practice_sword', name: 'Espada de práctica',  slot: 'weapon', rarity: 'common', tier: 0, stats: { damage: 8, initiative: 2 },  art: 'wood_sword',     description: 'Bambú atado con fibra. Sirve para aprender a pelear.' },
  t0_reed_bow:       { id: 't0_reed_bow',       name: 'Arco de caña',        slot: 'weapon', rarity: 'common', tier: 0, stats: { damage: 7, initiative: 3 },  art: 'wooden_bow',     description: 'Caña curvada y una cuerda de liana.' },
  t0_branch_wand:    { id: 't0_branch_wand',    name: 'Varita de rama',      slot: 'weapon', rarity: 'common', tier: 0, stats: { hp: 20, damage: 6 },         art: 'plant_wand',     description: 'Una rama con una gota de resina de Atia en la punta.' },
  t0_leaf_hat:       { id: 't0_leaf_hat',       name: 'Gorro de hojas',      slot: 'hat',    rarity: 'common', tier: 0, stats: { hp: 15 },                    art: 'straw_hat',      description: 'Hojas cosidas que dan sombra y poco más.' },
  t0_plank_shield:   { id: 't0_plank_shield',   name: 'Escudo de tablas',    slot: 'shield', rarity: 'common', tier: 0, stats: { hp: 18, shield: 15 },        art: 'wooden_buckler', description: 'Tablas de bambú selladas con resina.' },
  t0_linen_tunic:    { id: 't0_linen_tunic',    name: 'Túnica de lino',      slot: 'body',   rarity: 'common', tier: 0, stats: { hp: 25 },                    art: 'traveler_cloak', description: 'Tejida con fibra de liana. Cómoda para viajar.' },
  t0_rope_sandals:   { id: 't0_rope_sandals',   name: 'Sandalias de cuerda', slot: 'boots',  rarity: 'common', tier: 0, stats: { hp: 12, initiative: 2 },     art: 'traveler_boots', description: 'Suela de corteza y cuerdas de liana.' },
};

/** Recetas de la forja: materiales + oro → objeto T0. */
export const CRAFT_RECIPES = [
  { id: 'r_practice_sword', result: 't0_practice_sword', gold: 20, mats: { mat_bamboo: 3, mat_fiber: 1 } },
  { id: 'r_reed_bow',       result: 't0_reed_bow',       gold: 20, mats: { mat_bamboo: 2, mat_fiber: 2 } },
  { id: 'r_branch_wand',    result: 't0_branch_wand',    gold: 25, mats: { mat_bamboo: 2, mat_resin: 2 } },
  { id: 'r_leaf_hat',       result: 't0_leaf_hat',       gold: 15, mats: { mat_fiber: 3 } },
  { id: 'r_plank_shield',   result: 't0_plank_shield',   gold: 20, mats: { mat_bamboo: 3, mat_resin: 1 } },
  { id: 'r_linen_tunic',    result: 't0_linen_tunic',    gold: 20, mats: { mat_fiber: 4 } },
  { id: 'r_rope_sandals',   result: 't0_rope_sandals',   gold: 15, mats: { mat_fiber: 2, mat_bamboo: 1 } },
];

/* ───────────────────────── Forja · Evolucionar ─────────────────────────
   El equipo tiene 4 niveles: Tier 0 Común · Tier 1 Raro · Tier 2 Épico · Tier 3 Místico (ItemDatabase.TIER_RARITY).
   Cada línea va de menor a mayor tier y termina en Tier 3; una pieza evoluciona a la siguiente de su línea.
   Si a una línea le falta un tier, el salto es directo (p. ej. T1 → T3). Las piezas T3 que no están en ninguna
   línea (antiguos T4/T5, p. ej. Dragon Blade) ya están en lo más alto. */
export const EVOLUTION_LINES = {
  sword:      ['t0_practice_sword', 'wood_sword', 'iron_sword', 'frost_blade'],
  bow:        ['t0_reed_bow', 'wooden_bow', 'bird_longbow'],
  staff:      ['t0_branch_wand', 'plant_wand', 'frost_staff'],
  dagger:     ['feather_dagger', 'star_prism'],
  hood:       ['t0_leaf_hat', 'straw_hat', 'feather_hood', 'mystic_amulet'],
  arcane_hat: ['apprentice_hat', 'precision_scope', 'ember_ring'],
  shield:     ['t0_plank_shield', 'wood_shield', 'iron_shield', 'aegis_shield'],
  buckler:    ['wooden_buckler', 'reinforced_leather_shield', 'arctic_buckler'],
  armor:      ['t0_linen_tunic', 'leather_armor', 'golden_mail', 'iron_armor'],
  robe:       ['traveler_cloak', 'sacred_leaf_brooch'],
  boots:      ['t0_rope_sandals', 'traveler_boots', 'swift_boots', 'wind_boots'],
  heavy_boots:['leather_boots', 'heavy_boots'],
};

/** Coste de subir AL tier indicado (el del objeto resultante).
 *  La evolución SIEMPRE se paga con SLP (Smooth Love Potion), la moneda de evolución, más materiales,
 *  esquirlas lunares y una comisión fija en bAXS. `hours` = tiempo hasta que la pieza está lista. */
export const EVOLUTION_COST = {
  1: { slp: 50,   hours: 1,  mats: { mat_bamboo: 2, mat_resin: 2 },                shards: 0 },
  2: { slp: 150,  hours: 4,  mats: { mat_hide: 3, mat_copper: 2 },                 shards: 1 },
  3: { slp: 400,  hours: 8,  mats: { mat_glacier_iron: 3, mat_frost_crystal: 2 },  shards: 2 },
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
export const MATERIAL_PRICE = { 0: 250, 1: 6, 2: 14, 3: 30, 4: 65, 5: 140 }; // tier 0 = esquirla lunar
export const CONSUMABLE_PRICE = {
  food_berry: 12, food_rice_cake: 30, food_feast: 75,
  potion_health_small: 25, potion_shield: 45, potion_energy: 60, potion_health_large: 90, dew_flask: 55,
};
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
  const ratio = item.id in MATERIALS ? SELL_RATIO_MATERIAL : SELL_RATIO;
  return Math.max(1, Math.floor(buyPrice(item) * ratio));
}

/* ───────────────────────── Existencias de cada tienda ─────────────────────────
   `stock` = unidades al día (null = ilimitado). Se renuevan cada `restockHours`. */
export const SHOPS = {
  dojo_valley: {
    id: 'dojo_valley', name: 'Mercader Ochi', place: 'Valle del Dojō', island: 'island_forest', restockHours: 6,
    // Solo vende (y solo compra) equipo Tier 0; el equipo Tier 1–3 se consigue en combate y en la forja.
    maxGearTier: 0,
    stock: [
      { id: 'mat_bamboo', stock: null }, { id: 'mat_fiber', stock: null }, { id: 'mat_resin', stock: 20 },
      { id: 'mat_hide', stock: 8 }, { id: 'mat_lunar_shard', stock: 1 },
      { id: 'food_berry', stock: null }, { id: 'food_rice_cake', stock: 10 }, { id: 'food_feast', stock: 2 },
      { id: 'potion_health_small', stock: null }, { id: 'potion_shield', stock: 5 }, { id: 'potion_energy', stock: 3 },
      { id: 't0_practice_sword', stock: 2 }, { id: 't0_reed_bow', stock: 2 }, { id: 't0_branch_wand', stock: 2 },
      { id: 't0_leaf_hat', stock: 2 }, { id: 't0_plank_shield', stock: 2 }, { id: 't0_linen_tunic', stock: 2 }, { id: 't0_rope_sandals', stock: 2 },
    ],
  },
};
