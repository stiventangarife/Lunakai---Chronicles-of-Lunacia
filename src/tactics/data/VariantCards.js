// VariantCards.js — Cartas de partes con nombre de colección y/o de nivel 2 (19-oct).
//
// Sky Mavis da a cada parte su nombre real («Deadly Pogona», «Dark Kiss») y marca las partes evolucionadas
// con «-2» al final del id («back-snail-shell-2»). La carta de combate sale de la parte base (mismo gen):
//   · Parte de colección (Mystic, Nightmare, Summer, Shiny…): la carta lleva el nombre de la parte de colección
//     y su colección; mismo efecto que la carta base (Sky Mavis: «function just like their original counterparts»).
//   · Parte de nivel 2: la carta es la misma con su efecto un STAGE2_BONUS mayor (daño, curación y escudo).
// Las variantes se crean al resolver el Axie (AxiePartsResolver) y se guardan con la ranura para recrearlas al cargar.

import { PART_CARDS, withDisplayFields } from './PartCards.js';
import { COLLECTION_CARDS, COLLECTION_LABELS } from './CollectionCards.js';

/** +20 % de daño, curación y escudo en las partes de nivel 2. */
export const STAGE2_BONUS = 0.2;

export const VARIANT_CARDS = {};
export const VARIANT_SPELLS = {};
const listeners = new Set();

/** fn(id, spell) por cada variante registrada (también las ya existentes). Spells.js la usa para SPELLS_DB. */
export function onVariantRegistered(fn) {
  listeners.add(fn);
  for (const [id, s] of Object.entries(VARIANT_SPELLS)) fn(id, s);
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function variantId(baseId, name, stage = 1) {
  return `var_${baseId}_${slug(name)}${stage >= 2 ? '_lv2' : ''}`;
}

/** Nivel de una parte de Sky Mavis: el campo stage si llega; si no, el «-2» final de su id. */
export function partStage(apiPart) {
  if (!apiPart) return 1;
  if (Number(apiPart.stage) >= 2) return 2;
  return /-2$/.test(String(apiPart.id || '')) ? 2 : 1;
}

function scaleEffect(e, k) {
  if (k === 1) return { ...e };
  const r = (v) => (typeof v === 'number' ? Math.round(v * k) : v);
  if (e.type === 'damage') return { ...e, min: r(e.min), max: r(e.max) };
  if (e.type === 'heal' || e.type === 'shield') return { ...e, amount: r(e.amount) };
  return { ...e };
}

/**
 * Crea (una vez) la variante de una carta. def = { id, baseId, name, collection, stage }.
 * Devuelve la carta o null si la carta base no existe.
 */
export function registerVariantCard(def) {
  if (!def?.id) return null;
  if (VARIANT_CARDS[def.id]) return VARIANT_CARDS[def.id];
  const base = PART_CARDS[def.baseId] || COLLECTION_CARDS[def.baseId];
  if (!base) return null;
  const stage = def.stage >= 2 ? 2 : 1;
  const k = stage >= 2 ? 1 + STAGE2_BONUS : 1;
  const collection = def.collection || base.collection || null;
  const notes = [];
  if (collection && def.name && def.name !== base.name) notes.push(`Parte ${COLLECTION_LABELS[collection] || collection}: mismo efecto que ${base.baseName || base.name}.`);
  if (stage >= 2) notes.push(`Nivel 2: +${Math.round(STAGE2_BONUS * 100)} % de daño, curación y escudo.`);
  const card = {
    ...base,
    id: def.id,
    name: def.name || base.name,
    officialName: def.name || base.officialName || base.name,
    baseCardId: base.baseCardId || base.id,
    baseName: base.baseName || base.name,
    collection,
    stage,
    effects: (base.effects || []).map((e) => scaleEffect(e, k)),
    description: notes.length ? `${base.description || ''} ${notes.join(' ')}`.trim() : base.description,
  };
  VARIANT_CARDS[def.id] = card;
  const spell = withDisplayFields(card);
  VARIANT_SPELLS[def.id] = spell;
  listeners.forEach((fn) => { try { fn(def.id, spell); } catch { /* nada */ } });
  return card;
}

/** Carta (de partes, de colección o variante) por id. */
export function anyPartCard(id) {
  return PART_CARDS[id] || COLLECTION_CARDS[id] || VARIANT_CARDS[id] || null;
}
