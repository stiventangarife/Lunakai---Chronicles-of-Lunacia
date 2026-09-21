// ItemDatabase.js - Catalog of Equipable Items, Stats, Rarities and Drop Tables
export const ITEMS_DB = {
  // ==========================================
  // --- 1. WEAPONS (Armas: Espadas, Arcos, Varas, Báculos, Orbes) ---
  // ==========================================
  wood_sword: {
    id: 'wood_sword',
    name: 'Lunacia Knight Sword',
    slot: 'weapon',
    icon: './assets/equippable/wood_sword.png',
    rarity: 'rare',
    tier: 1,
    stats: { damage: 16, initiative: 4 },
    description: 'Blade forged from Lunacia bamboo wood. Grants +16 base damage and +4 initiative.'
  },
  iron_sword: {
    id: 'iron_sword',
    name: 'Feral Iron Sword',
    slot: 'weapon',
    icon: './assets/equippable/iron_sword.png',
    rarity: 'rare',
    tier: 2,
    stats: { damage: 22, initiative: 5 },
    description: 'Heavy sword forged to withstand the ferocious claws of chimeras. +22 Damage and +5 Initiative.'
  },
  wooden_bow: {
    id: 'wooden_bow',
    name: 'Short Hunting Bow',
    slot: 'weapon',
    icon: './assets/equippable/composite_bow.png',
    rarity: 'common',
    tier: 1,
    stats: { damage: 14, initiative: 6 },
    description: 'Flexible handcrafted bow made of Lunacia pine wood. Grants +14 damage and +6 initiative.'
  },
  bird_longbow: {
    id: 'bird_longbow',
    name: 'Falcon Bow of Lunacia',
    slot: 'weapon',
    icon: './assets/equippable/bird_longbow.png',
    rarity: 'epic',
    tier: 3,
    stats: { damage: 28, initiative: 8 },
    description: 'Composite bow crafted with sacred feathers for Bird Axies. Grants +28 damage and +8 initiative.'
  },
  plant_wand: {
    id: 'plant_wand',
    name: 'Lunacia Dew Wand',
    slot: 'weapon',
    icon: './assets/equippable/plant_wand.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 45, damage: 15, pa: 1 },
    description: 'Ancient botanical channeler for Plant Axies. Grants +45 HP, +15 damage and +1 max AP.'
  },
  frost_staff: {
    id: 'frost_staff',
    name: 'Glacial Frost Staff',
    slot: 'weapon',
    icon: './assets/equippable/frost_staff.png',
    rarity: 'epic',
    tier: 3,
    stats: { hp: 55, damage: 26, pa: 1 },
    description: 'Staff crowned with perennial ice from the polar peaks. +55 HP, +26 Damage and +1 max AP.'
  },
  frost_blade: {
    id: 'frost_blade',
    name: 'Glacial Frost Sword',
    slot: 'weapon', 
    icon: './assets/equippable/frost_blade.png',
    rarity: 'epic',
    tier: 3,
    stats: { damage: 32, pa: 1, initiative: 6 },
    description: 'Crystalline edge forged in the coldest peaks of Lunacia. Grants +32 damage, +1 AP and +6 initiative.'
  },
  mystic_orb: {
    id: 'mystic_orb',
    name: 'Staff of Arcane Power',
    slot: 'weapon',
    icon: './assets/equippable/mystic_orb.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 70, damage: 28, pa: 1 },
    description: 'Magical relic channeling the primordial energy of nature. Grants +70 HP, +28 damage and +1 AP.'
  },
  feather_dagger: {
    id: 'feather_dagger',
    name: 'Sylvan Feather Dagger',
    slot: 'weapon',
    icon: './assets/equippable/feather_dagger.png',
    rarity: 'rare',
    tier: 2,
    stats: { damage: 14, initiative: 3 },
    description: 'Forged with steel-hard feathers. Grants +14 ranged damage and +3 initiative.'
  },
  obsidian_dagger: {
    id: 'obsidian_dagger',
    name: 'Piercing Obsidian Dagger',
    slot: 'weapon',
    icon: './assets/equippable/obsidian_dagger.png',
    rarity: 'rare',
    tier: 2,
    stats: { damage: 16, initiative: 2 },
    description: 'Black blade sharpened in the heat of the canyon. Grants +16 damage and +2 initiative.'
  },
  star_prism: {
    id: 'star_prism',
    name: 'Prism Star Shard',
    slot: 'weapon',
    icon: './assets/equippable/star_prism.png',
    rarity: 'epic',
    tier: 4,
    stats: { damage: 22, initiative: 4 },
    description: 'Shining celestial crystal. Grants +22 blunt damage and +4 initiative.'
  },
  crimson_crypt_key: {
    id: 'crimson_crypt_key',
    name: 'Crimson Crypt Key',
    slot: 'quest',
    category: 'quest',
    icon: '🗝️',
    rarity: 'legendary',
    tier: 5,
    stats: {},
    description: 'Key forged in elemental magma. Unlocks the arcane seal of the final Crypt Catacombs.'
  },
  relic_sword: {
    id: 'relic_sword',
    name: 'Ancestral Relic Sword',
    slot: 'weapon',
    icon: './assets/equippable/relic_sword.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 40, damage: 26, initiative: 6 },
    description: 'Ancient blade imbued with old Lunacia magic. +26 Damage, +40 HP and +6 Initiative.'
  },
  dragon_blade: {
    id: 'dragon_blade',
    name: 'Underworld Dragon Blade',
    slot: 'weapon',
    icon: './assets/equippable/dragon_blade.png',
    rarity: 'legendary',
    tier: 5,
    stats: { damage: 36, pa: 1, initiative: 8 },
    description: 'Legendary weapon forged from fiery dragon fangs. +36 Damage, +1 AP and +8 Initiative.'
  },

  // ==========================================
  // --- 2. HATS & TALISMANS (Sombreros, Yelmos, Amuletos) ---
  // ==========================================
  straw_hat: {
    id: 'straw_hat',
    name: 'Novice Wooden Hat',
    slot: 'hat',
    icon: './assets/equippable/straw_hat.png',
    rarity: 'common',
    tier: 1,
    stats: { hp: 30 },
    description: 'Light handcrafted hat for training under the sun. Grants +30 HP.'
  },
  apprentice_hat: {
    id: 'apprentice_hat',
    name: 'Magic Apprentice Hat',
    slot: 'hat',
    icon: './assets/equippable/apprentice_hat.png',
    rarity: 'common',
    tier: 1,
    stats: { hp: 35, pa: 1 },
    description: 'Woven cap imbued with Lunacia mana pollen. Grants +35 HP and +1 max AP.'
  },
  feather_hood: {
    id: 'feather_hood',
    name: 'Cooper Helm',
    slot: 'hat',
    icon: './assets/equippable/feather_hood.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 45, initiative: 6 },
    description: 'Handcrafted helm. Grants +45 HP and +6 initiative.'
  },
  beast_helmet: {
    id: 'beast_helmet',
    name: 'Pumpkin Helm',
    slot: 'hat',
    icon: './assets/equippable/beast_helmet.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 60, shield: 25 },
    description: 'Imposing helmet carved from a rotten pumpkin. Grants +60 HP and +25 starting shield.'
  },
  mystic_amulet: {
    id: 'mystic_amulet',
    name: 'Mystic Tiara of Lunacia',
    slot: 'hat',
    icon: './assets/equippable/mystic_amulet.png',
    rarity: 'rare',
    tier: 3,
    stats: { hp: 60, shield: 30, initiative: 6 },
    description: 'Tiara etched with runes that soothe spirits. +60 HP, +30 Shield and +6 Initiative.'
  },
  arcane_ring: {
    id: 'arcane_ring',
    name: 'Astral Energy Crown',
    slot: 'hat',
    icon: './assets/equippable/arcane_ring.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 65, pa: 1, initiative: 8 },
    description: 'Glittering crown that expands energy reserves. +65 HP, +1 AP and +8 Initiative.'
  },
  ember_ring: {
    id: 'ember_ring',
    name: 'Fiery Embers Hat',
    slot: 'hat',
    icon: './assets/equippable/ember_ring.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 70, damage: 15, initiative: 6 },
    description: 'Blazing hat crafted from the heart essence of the subterranean volcano. +70 HP, +15 Damage and +6 Initiative.'
  },
  crown_of_lunacia: {
    id: 'crown_of_lunacia',
    name: 'Lunacia Champion Helm',
    slot: 'hat',
    icon: './assets/equippable/crown_of_lunacia.png',
    rarity: 'legendary',
    tier: 5,
    stats: { hp: 120, shield: 50, initiative: 15 },
    description: 'Sacred emblem awarded to the savior of Lunacia after defeating the Primeval Chimera. +120 HP, +50 Shield and +15 Initiative.'
  },
  legendary_relic: {
    id: 'legendary_relic',
    name: 'Primeval Relic of Kibo',
    slot: 'hat',
    icon: './assets/equippable/legendary_relic.png',
    rarity: 'legendary',
    tier: 5,
    stats: { hp: 110, shield: 45, damage: 16, initiative: 10 },
    description: 'Runic urn brimming with the original power of Lunacia monsters. +110 HP, +45 Shield, +16 Damage and +10 Init.'
  },
  nomad_turban: {
    id: 'nomad_turban',
    name: 'Bronze Helm',
    slot: 'hat',
    icon: './assets/equippable/nomad_turban.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 30, initiative: 2 },
    description: 'Protects against storms and little else. Grants +30 HP and +2 initiative.'
  },
  precision_scope: {
    id: 'precision_scope',
    name: 'Iron Helm',
    slot: 'hat',
    icon: './assets/equippable/precision_scope.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 50, initiative: 6 },
    description: 'Protects from hungry wolves. Grants +50 HP and +6 initiative.'
  },
  fury_ring: {
    id: 'fury_ring',
    name: 'Volcanic Fury Fiery Hat',
    slot: 'hat',
    icon: './assets/equippable/fury_ring.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 130, initiative: 8 },
    description: 'Imbued with the immortal heat of the dungeon. Grants +130 HP and +8 initiative.'
  },
  ring_of_destiny: {
    id: 'ring_of_destiny',
    name: 'Thread of Destiny Mask',
    slot: 'hat',
    icon: './assets/equippable/ring_of_destiny.png',
    rarity: 'legendary',
    tier: 5,
    stats: { hp: 140 },
    description: 'A living stellar mask. Grants +140 HP and allows starting each battle with tactical advantage.'
  },
  champion_crown: {
    id: 'champion_crown',
    name: 'Diamond Crown',
    slot: 'hat',
    icon: './assets/equippable/champion_crown.png',
    rarity: 'legendary',
    tier: 5,
    stats: { hp: 250, initiative: 15 },
    description: 'The sacred circlet bestowed by the Great Atia Tree. Grants +250 HP, +15 initiative, and everlasting glory.'
  },
  atia_crown: {
    id: 'atia_crown',
    name: 'Crown of the Atia Tree',
    slot: 'hat',
    icon: './assets/equippable/atia_crown.png',
    rarity: 'legendary',
    tier: 5,
    stats: { hp: 200, damage: 25, initiative: 10 },
    description: 'A supreme Lunacia artifact. Grants +200 HP, +25 damage and +10 initiative to its bearer.'
  },
  desert_turban: {
    id: 'desert_turban',
    name: 'Arid Wind Turban',
    slot: 'hat',
    icon: './assets/equippable/desert_turban.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 60, initiative: 4 },
    description: 'Nomadic fabric protecting against sandstorms. Grants +60 HP and +4 initiative.'
  },

  // ==========================================
  // --- 3. SHIELDS (Escudos y Broqueles) ---
  // ==========================================
  wooden_buckler: {
    id: 'wooden_buckler',
    name: 'Reinforced Oak Buckler',
    slot: 'shield',
    icon: './assets/equippable/wooden_buckler.png',
    rarity: 'common',
    tier: 1,
    stats: { hp: 35, shield: 30 },
    description: 'Circular shield of heavy wood with iron rivets. Grants +35 HP and +30 starting shield.'
  },
  wood_shield: {
    id: 'wood_shield',
    name: 'Feral Wooden Shield',
    slot: 'shield',
    icon: './assets/equippable/wood_shield.png',
    rarity: 'common',
    tier: 1,
    stats: { hp: 40, shield: 35 },
    description: 'Shield carved from ancient oak bark. Grants +40 HP and +35 starting shield.'
  },
  iron_shield: {
    id: 'iron_shield',
    name: 'Reinforced Bronze Shield',
    slot: 'shield',
    icon: './assets/equippable/iron_shield.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 60, shield: 50 },
    description: 'Solid bronze plate that deflects frontal impacts from beasts. +60 HP and +50 Shield.'
  },
  aegis_shield: {
    id: 'aegis_shield',
    name: 'Reinforced Iron Shield',
    slot: 'shield',
    icon: './assets/equippable/aegis_shield.png',
    rarity: 'epic',
    tier: 3,
    stats: { hp: 80, shield: 65 },
    description: 'Relic forged with unique iron. Grants +80 HP and +65 starting shield.'
  },
  reinforced_leather_shield: {
    id: 'reinforced_leather_shield',
    name: 'Stone Shield',
    slot: 'shield',
    icon: './assets/equippable/reinforced_leather_shield.png',
    rarity: 'rare',
    tier: 2,
    stats: { shield: 45, hp: 25 },
    description: 'Tanned with stones, it might protect you if you can move. Grants +45 Starting Shield and +25 HP.'
  },
  obsidian_shield: {
    id: 'obsidian_shield',
    name: 'Molten Obsidian Bulwark',
    slot: 'shield',
    icon: './assets/equippable/obsidian_shield.png',
    rarity: 'legendary',
    tier: 5,
    stats: { hp: 80, shield: 140 },
    description: 'Heavy shield tempered in pure lava. Grants +140 Starting Shield and +80 HP.'
  },
  thermal_pot: {
    id: 'thermal_pot',
    name: 'Fortifying Thermal Pot',
    slot: 'shield',
    icon: './assets/equippable/thermal_pot.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 40, shield: 60 },
    description: 'Circular shield with the aroma of hot broth. Provides +60 Starting Shield and +40 HP.'
  },
  arctic_buckler: {
    id: 'arctic_buckler',
    name: 'Reflective Arctic Buckler',
    slot: 'shield',
    icon: './assets/equippable/arctic_buckler.png',
    rarity: 'rare',
    tier: 3,
    stats: { hp: 35, shield: 70 },
    description: 'Reflects polar light protecting against frontal blows. Grants +70 Shield and +35 HP.'
  },
  frost_amulet: {
    id: 'frost_amulet',
    name: 'Shield of Eternal Ice Amulet',
    slot: 'shield',
    icon: './assets/equippable/frost_amulet.png',
    rarity: 'epic',
    tier: 3,
    stats: { hp: 50, shield: 80 },
    description: 'A pure crystal condensing protective frost. Grants +80 Starting Shield and +50 HP.'
  },


  // ==========================================
  // --- 4. BODY ARMORS (Petos, Capas, Armaduras) ---
  // ==========================================
  traveler_cloak: {
    id: 'traveler_cloak',
    name: 'Highlands Traveler Cloak',
    slot: 'body',
    icon: './assets/equippable/traveler_cloak.png',
    rarity: 'common',
    tier: 1,
    stats: { hp: 45, initiative: 4 },
    description: 'Warm attire to withstand the arctic wind. Grants +45 HP and +4 initiative.'
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'Cured Leather Chestpiece',
    slot: 'body',
    icon: './assets/equippable/leather_armor.png',
    rarity: 'common',
    tier: 1,
    stats: { hp: 55, shield: 20 },
    description: 'Hardened leather chestpiece protecting the torso without compromising mobility. +55 HP and +20 Shield.'
  },
  golden_mail: {
    id: 'golden_mail',
    name: 'Golden Scale Hauberk',
    slot: 'body',
    icon: './assets/equippable/bronze_armor.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 80, shield: 25 },
    description: 'Cuirass forged from golden chimera scales. Grants +80 max HP and +25 shield.'
  },
  iron_armor: {
    id: 'iron_armor',
    name: 'Iron Plate Armor',
    slot: 'body',
    icon: './assets/equippable/iron_armor.png',
    rarity: 'rare',
    tier: 3,
    stats: { hp: 100, shield: 40 },
    description: 'Heavy campaign armor protecting against crushing blows. +100 HP and +40 Shield.'
  },
  chitin_armor: {
    id: 'chitin_armor',
    name: 'Arcane Chitin Carapace',
    slot: 'body',
    icon: './assets/equippable/chitin_armor.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 120, shield: 50, initiative: 6 },
    description: 'Natural carapace reinforced by mystic energy from sage trees. +120 HP, +50 Shield and +6 Init.'
  },
  obsidian_plate: {
    id: 'obsidian_plate',
    name: 'Obsidian Plate Armor',
    slot: 'body',
    icon: './assets/equippable/obsidian_plate.png',
    rarity: 'legendary',
    tier: 5,
    stats: { hp: 165, shield: 80 },
    description: 'Polished black plates forged in dungeon depths. +165 HP and +80 Shield.'
  },
  dew_flask: {
    id: 'dew_flask',
    name: 'Healing Dew Flask',
    category: 'consumable',
    slot: 'consumable',
    icon: './assets/equippable/dew_flask.png',
    rarity: 'rare',
    tier: 2,
    stats: {},
    effect: { heal: 100 },
    description: 'Medicinal flask with moss extract and healing dew crafted by Rosalba. Instantly restores 100 HP to the selected hero.'
  },
  sacred_leaf_brooch: {
    id: 'sacred_leaf_brooch',
    name: 'Sacred Leaf Brooch',
    slot: 'body',
    icon: './assets/equippable/sacred_leaf_brooch.png',
    rarity: 'epic',
    tier: 3,
    stats: { hp: 100 },
    description: 'Brooch blessed by Pomodoro\'s flowers. Grants +100 HP and boosts your defenses.'
  },
  concentration_talisman: {
    id: 'concentration_talisman',
    name: 'Ancestral Concentration Talisman',
    slot: 'body',
    icon: './assets/equippable/concentration_talisman.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 110 },
    description: 'Grants absolute mental clarity. Grants +110 HP.'
  },
  astral_robe: {
    id: 'astral_robe',
    name: 'Seer\'s Astral Robe',
    slot: 'body',
    icon: './assets/equippable/astral_robe.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 120, damage: 10, initiative: 5 },
    description: 'Woven with filaments of cosmic nebula. Grants +120 HP, +10 arcane damage and +5 initiative.'
  },
  titan_mail: {
    id: 'titan_mail',
    name: 'Titan Mail',
    slot: 'body',
    icon: './assets/equippable/titan_mail.png',
    rarity: 'epic',
    tier: 4,
    stats: { hp: 140, shield: 60 },
    description: 'Heavy titanium armor providing massive protection. +140 HP and +60 Shield.'
  },


  // ==========================================
  // --- 5. BOOTS (Grebas y Botas) ---
  // ==========================================
  leather_boots: {
    id: 'leather_boots',
    name: 'Cured Leather Greaves',
    slot: 'boots',
    icon: './assets/equippable/leather_boots.png',
    rarity: 'common',
    tier: 1,
    stats: { hp: 25, initiative: 5 },
    description: 'Flexible boots facilitating quick movement. Grants +25 HP and +5 initiative.'
  },
  traveler_boots: {
    id: 'traveler_boots',
    name: 'Light Messenger Boots',
    slot: 'boots',
    icon: './assets/equippable/traveler_boots.png',
    rarity: 'common',
    tier: 1,
    stats: { hp: 30, initiative: 4 },
    description: 'Reinforced boots for long journeys. Grants +30 HP and +4 initiative.'
  },
  swift_boots: {
    id: 'swift_boots',
    name: 'Agile Hunter Boots',
    slot: 'boots',
    icon: './assets/equippable/swift_boots.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 35, pm: 1, initiative: 7 },
    description: 'Aerodynamic footwear favored by scouts. +35 HP, +1 permanent MP and +7 Initiative.'
  },
  heavy_boots: {
    id: 'heavy_boots',
    name: 'Heavy Pumpkin Boots',
    slot: 'boots',
    icon: './assets/equippable/heavy_boots.png',
    rarity: 'rare',
    tier: 2,
    stats: { hp: 65, shield: 25 },
    description: 'Slightly damp footwear offering great stability. +65 HP and +25 Shield.'
  },
  wind_boots: {
    id: 'wind_boots',
    name: 'Swift Wind Boots',
    slot: 'boots',
    icon: './assets/equippable/wind_boots.png',
    rarity: 'epic',
    tier: 3,
    stats: { pm: 1, hp: 45, initiative: 10 },
    description: 'Footwear blessed with the Lunacia breeze. Grants +1 permanent MP, +45 HP and +10 initiative.'
  },
  dragon_boots: {
    id: 'dragon_boots',
    name: 'Draconic Stride Boots',
    slot: 'boots',
    icon: './assets/equippable/dragon_boots.png',
    rarity: 'legendary',
    tier: 5,
    stats: { pm: 1, hp: 70, initiative: 14, shield: 30 },
    description: 'Mystic footwear granting supernatural speed. +1 MP, +70 HP, +14 Initiative and +30 Shield.'
  },

  // ==========================================
  // --- 6. CONSUMABLES (Pociones, Elixires y Tónicos) ---
  // ==========================================
  potion_health_small: {
    id: 'potion_health_small',
    name: 'Lesser Health Potion',
    category: 'consumable',
    slot: 'consumable',
    icon: '🧪',
    rarity: 'common',
    tier: 1,
    stats: {},
    effect: { heal: 60 },
    description: 'Brew distilled with Lunacia forest nectar. Instantly restores 60 HP to the selected hero.'
  },
  potion_health_large: {
    id: 'potion_health_large',
    name: 'Greater Health Elixir',
    category: 'consumable',
    slot: 'consumable',
    icon: '🧪',
    rarity: 'rare',
    tier: 3,
    stats: {},
    effect: { heal: 150 },
    description: 'Sacred elixir concentrated with Atia flowers. Instantly restores 150 HP.'
  },
  potion_energy: {
    id: 'potion_energy',
    name: 'Lunar Vigor Tonic',
    category: 'consumable',
    slot: 'consumable',
    icon: '⚡',
    rarity: 'rare',
    tier: 2,
    stats: {},
    effect: { pa: 1, pm: 1 },
    description: 'Effervescent brew activating cosmic energy. Grants temporary vigor (+1 AP and +1 MP).'
  },
  potion_shield: {
    id: 'potion_shield',
    name: 'Protective Bark Nectar',
    category: 'consumable',
    slot: 'consumable',
    icon: '🛡️',
    rarity: 'uncommon',
    tier: 2,
    stats: {},
    effect: { shield: 80 },
    description: 'Viscous nectar hardening skin like ancient bark. Grants 80 protective Shield.'
  },

  // ==========================================
  // --- 7. QUEST ITEMS (Objetos Clave de Misión) ---
  // ==========================================
  postman_letters: {
    id: 'postman_letters',
    name: 'Messenger\'s Letters',
    category: 'quest',
    slot: 'quest',
    icon: '📜',
    rarity: 'rare',
    tier: 1,
    stats: {},
    description: 'Sealed royal mail satchel that fell in the plains during the chimera ambush.'
  },
  golden_pickaxe: {
    id: 'golden_pickaxe',
    name: 'Tripp\'s Golden Pickaxe',
    category: 'quest',
    slot: 'quest',
    icon: '⛏️',
    rarity: 'epic',
    tier: 4,
    stats: {},
    description: 'The legendary pickaxe forged in Atia gold rescued from the fiery fortress galleries.'
  },
  luminous_moss: {
    id: 'luminous_moss',
    name: 'Luminous Forest Moss',
    category: 'quest',
    slot: 'quest',
    icon: '🌿',
    rarity: 'common',
    tier: 1,
    stats: {},
    description: 'Glow-in-the-dark plant sprout required by Rosalba to purify her elixirs.'
  },
  hardened_ore: {
    id: 'hardened_ore',
    name: 'Hardened Savanna Ore',
    category: 'quest',
    slot: 'quest',
    icon: '🪨',
    rarity: 'rare',
    tier: 2,
    stats: {},
    description: 'Armored chimera carapace mineral fragment delivered to Baruk to temper nomad steel.'
  },
  frost_mushrooms: {
    id: 'frost_mushrooms',
    name: 'Boreal Frost Mushrooms',
    category: 'quest',
    slot: 'quest',
    icon: '🍄',
    rarity: 'common',
    tier: 2,
    stats: {},
    description: 'Bluish mushrooms gathered in the snow for the Boreal Chef\'s restorative broth.'
  },
  fallen_stardust: {
    id: 'fallen_stardust',
    name: 'Fallen Stardust',
    category: 'quest',
    slot: 'quest',
    icon: '🌠',
    rarity: 'epic',
    tier: 3,
    stats: {},
    description: 'Luminescent stardust the Astral Astrologer studies to decipher constellations.'
  },
  crimson_crypt_key: {
    id: 'crimson_crypt_key',
    name: 'Crimson Crypt Key',
    category: 'quest',
    slot: 'quest',
    icon: './assets/equippable/crimson_crypt_key.png',
    rarity: 'legendary',
    tier: 5,
    stats: {},
    description: 'Key forged in elemental magma. Unlocks the arcane seal of the final Crypt Catacombs.'
  }
};

// Loot pools categorized by Difficulty Tier (1 to 5)
export const TIER_DROPS = {
  1: [
    'wood_sword', 'wooden_bow', 'straw_hat', 'apprentice_hat',
    'wooden_buckler', 'wood_shield', 'traveler_cloak', 'leather_armor', 'leather_boots'
  ],
  2: [
    'iron_sword', 'wooden_bow', 'plant_wand', 'feather_hood', 'beast_helmet',
    'iron_shield', 'golden_mail', 'swift_boots', 'heavy_boots'
  ],
  3: [
    'bird_longbow', 'frost_blade', 'frost_staff', 'plant_wand',
    'mystic_amulet', 'beast_helmet', 'aegis_shield', 'iron_armor', 'wind_boots', 'heavy_boots'
  ],
  4: [
    'mystic_orb', 'bird_longbow', 'frost_staff',
    'arcane_ring', 'ember_ring', 'aegis_shield', 'chitin_armor', 'wind_boots'
  ],
  5: [
    'crown_of_lunacia', 'legendary_relic',
    'obsidian_shield', 'obsidian_plate', 'dragon_boots'
  ]
};

// Loot pools categorized by Mob Archetype / Role
export const ROLE_DROPS = {
  tank: ['wooden_buckler', 'wood_shield', 'iron_shield', 'aegis_shield', 'obsidian_shield', 'golden_mail', 'iron_armor', 'titan_mail', 'obsidian_plate', 'beast_helmet'],
  bruiser: ['wood_sword', 'iron_sword', 'wooden_buckler', 'iron_shield', 'golden_mail', 'iron_armor', 'beast_helmet', 'heavy_boots'],
  scout_agile: ['leather_boots', 'swift_boots', 'wind_boots', 'dragon_boots', 'traveler_cloak', 'straw_hat', 'feather_hood'],
  skirmisher: ['wood_sword', 'iron_sword', 'leather_boots', 'swift_boots', 'traveler_cloak'],
  ranged_piercer: ['wooden_bow', 'bird_longbow', 'feather_hood', 'swift_boots', 'traveler_cloak'],
  flame_spitter: ['iron_sword', 'ember_ring', 'feather_hood', 'iron_armor'],
  frost_caster: ['frost_staff', 'mystic_amulet', 'wind_boots', 'apprentice_hat'],
  support_healer: ['plant_wand', 'mystic_amulet', 'apprentice_hat', 'mystic_orb'],
  void_skirmisher: ['mystic_orb', 'arcane_ring', 'feather_hood', 'chitin_armor'],
  apex_boss: ['crown_of_lunacia', 'legendary_relic', 'obsidian_plate', 'dragon_boots', 'obsidian_shield'],
  juggernaut: ['obsidian_shield', 'dragon_boots', 'obsidian_plate', 'beast_helmet']
};

export const LEVEL_DROPS = {
  level_1_tutorial: [
    'wood_sword',
    'beast_helmet',
    'wooden_buckler',
    'golden_mail',
    'wind_boots'
  ],
  level_2_plains: [
    'bird_longbow',
    'plant_wand',
    'feather_hood',
    'aegis_shield',
    'traveler_cloak'
  ]
};
