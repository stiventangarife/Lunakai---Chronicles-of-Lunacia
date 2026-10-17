// CollectionCards.js — Partes de colección especial (skins del gen) y cartas de colección Japan / Xmas.
//
// Cada parte de colección es una «skin» de una parte base: mismo gen (clase-parte-variante) con otro valor de skin.
// Sky Mavis: «these body parts function just like their original counterparts during battles» → la carta de colección
// tiene el MISMO efecto que la carta base; cambia el nombre, la ilustración y el VFX (combat/CollectionVFX.js).
//
// Solo Japan y Xmas tienen carta de colección propia. El resto de colecciones (Mystic, Summer, Nightmare, Shiny, Bionic)
// usan la carta base con su VFX de colección.
//
// Tabla obtenida del marketplace de Sky Mavis (campo specialGenes + genes decodificados, 23.510 Axies).

import { findPartCard, withDisplayFields } from './PartCards.js';
import { PART_VARIANTS } from './PartVariants.js';

/** Valor de skin del gen → colección. */
export const COLLECTION_SKINS = {
  1: 'mystic', 2: 'bionic', 3: 'japan', 4: 'xmas', 5: 'xmas',
  6: 'summer', 7: 'summer', 8: 'summer', 12: 'nightmare', 13: 'shiny',
};

export const COLLECTION_LABELS = {
  mystic: 'Mystic', bionic: 'Bionic', japan: 'Japan', xmas: 'Xmas', summer: 'Summer', nightmare: 'Nightmare', shiny: 'Shiny',
};

/** Partes con carta de colección: 'clase-parte-variante-sSkin' → nombre de la parte de colección. */
export const COLLECTION_PARTS = {
  // Japan (skin 3)
  'aquatic-eyes-02-s3': 'Yen', 'aquatic-mouth-10-s3': 'Geisha', 'aquatic-tail-02-s3': 'Koinobori',
  'beast-back-08-s3': 'Hamaya', 'beast-horn-04-s3': 'Kendama', 'beast-horn-08-s3': 'Umaibo',
  'bird-back-04-s3': 'Origami', 'bird-ears-12-s3': 'Karimata', 'bird-tail-10-s3': 'Omatsuri',
  'bug-ears-12-s3': 'Mon', 'bug-mouth-08-s3': 'Kawaii', 'bug-tail-06-s3': 'Maki',
  'plant-back-04-s3': 'Yakitori', 'plant-ears-08-s3': 'Maiko', 'plant-horn-04-s3': 'Yorishiro',
  'reptile-eyes-08-s3': 'Dokuganryu', 'reptile-eyes-10-s3': 'Kabuki', 'reptile-mouth-10-s3': 'Dango',
  // Xmas 2018 (skin 4)
  'beast-ears-06-s4': 'Merry Lamb', 'beast-eyes-04-s4': 'Snowflakes', 'bird-horn-12-s4': 'Spruce Spear',
  'bug-back-04-s4': 'Candy Canes', 'plant-mouth-04-s4': 'Rudolph', 'reptile-tail-08-s4': 'December Surprise',
  // Xmas 2019 (skin 5)
  'bird-eyes-04-s5': 'Icy Gaze', 'plant-ears-10-s5': 'Pinecones', 'plant-horn-10-s5': 'Santas Gift',
  'reptile-back-08-s5': 'Frozen Bucket', 'reptile-mouth-10-s5': 'Tiny Carrot', 'reptile-tail-06-s5': 'Fir Trunk',
};

/**
 * Ilustraciones de colección disponibles en assets/cards/collection/<clave>.webp (p. ej. 'beast-horn-04-s3').
 * Mientras una no esté, la carta usa la ilustración de su carta base con el marco de su colección.
 */
export const COLLECTION_ART = new Set(Object.keys(COLLECTION_PARTS)); // las 30 ilustraciones Japan y Xmas están en assets/cards/collection

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const COLLECTION_CARDS_LIST = Object.entries(COLLECTION_PARTS).map(([key, name]) => {
  const [cls, part, variant, s] = key.split('-');
  const skin = Number(s.slice(1));
  const collection = COLLECTION_SKINS[skin];
  const base = findPartCard(cls, part, PART_VARIANTS[`${cls}-${part}-${variant}`]);
  if (!base) throw new Error(`[CollectionCards] Sin carta base para ${key}`);
  return {
    ...base,
    id: `col_${collection}_${cls}_${part}_${slug(name)}`,
    name, officialName: name,
    baseCardId: base.id, baseName: base.name,
    collection, collectionKey: key,
    art: COLLECTION_ART.has(key) ? `./assets/cards/collection/${key}.webp` : base.art,
    artKey: COLLECTION_ART.has(key) ? undefined : `collection/${key}`,
    adaptation: `Carta de colección ${COLLECTION_LABELS[collection]}: mismo efecto que ${base.name}.` + (base.adaptation ? ` ${base.adaptation}` : ''),
  };
});

const BY_KEY = new Map(COLLECTION_CARDS_LIST.map((c) => [c.collectionKey, c]));

/** Colección de una parte decodificada ({ skin }) o null. */
export function collectionOf(skin) {
  return COLLECTION_SKINS[Number(skin)] || null;
}

/** Carta de colección para una parte (o null si esa parte no tiene carta de colección). */
export function collectionCardFor(cls, part, variant, skin) {
  return BY_KEY.get(`${String(cls).toLowerCase()}-${part}-${String(variant).padStart(2, '0')}-s${Number(skin)}`) || null;
}

export const COLLECTION_CARDS = Object.fromEntries(COLLECTION_CARDS_LIST.map((c) => [c.id, c]));

/** Hechizos listos para SPELLS_DB. */
export const COLLECTION_SPELLS = Object.fromEntries(COLLECTION_CARDS_LIST.map((c) => [c.id, withDisplayFields(c)]));
