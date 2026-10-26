// AxieBaseStats.js — Estadísticas base de los Axies por clase y rol (19-oct).
//
// · PA y PM son iguales para todos (también los Sapidaes): 6 PA y 3 PM. El equipo puede sumar más.
// · La clase marca la vida y la iniciativa de partida.
// · El rol sale de sus 6 cartas (las de sus partes, las del combate) y ajusta esa vida e iniciativa:
//     Defensor   2+ cartas de escudo                         +40 vida  −10 iniciativa
//     Apoyo      2+ cartas de curación o sobre aliados       +0 vida   +5 iniciativa
//     Tirador    cartas de daño con alcance medio ≥ 2,5      −20 vida  +10 iniciativa
//     Luchador   3+ cartas de daño de corto alcance          +20 vida  +0 iniciativa
//     Equilibrado el resto                                   +0        +0
// Las cifras están aquí para ajustarlas en un solo sitio.

import { PART_SPELLS } from './PartCards.js';
import { STARTER_SPELLS } from './StarterCards.js';
import { COLLECTION_SPELLS } from './CollectionCards.js';
import { VARIANT_SPELLS } from './VariantCards.js';
import * as i18n from '../../i18n/i18n.js';

export const BASE_PA = 6;
export const BASE_PM = 3;

export const CLASS_BASE = {
  beast:   { hp: 300, initiative: 95,  label: i18n.t('heroes.axieClass.beast') },
  bird:    { hp: 260, initiative: 115, label: i18n.t('heroes.axieClass.bird') },
  plant:   { hp: 340, initiative: 80,  label: i18n.t('heroes.axieClass.plant') },
  aquatic: { hp: 280, initiative: 105, label: i18n.t('heroes.axieClass.aquatic') },
  reptile: { hp: 320, initiative: 85,  label: i18n.t('heroes.axieClass.reptile') },
  bug:     { hp: 290, initiative: 95,  label: i18n.t('heroes.axieClass.bug') },
  mech:    { hp: 310, initiative: 90,  label: i18n.t('heroes.axieClass.mech') },
  dawn:    { hp: 290, initiative: 100, label: i18n.t('heroes.axieClass.dawn') },
  dusk:    { hp: 290, initiative: 100, label: i18n.t('heroes.axieClass.dusk') },
};
const DEFAULT_CLASS = { hp: 300, initiative: 95, label: 'Axie' };

export const ROLES = {
  guardian: { label: i18n.t('heroes.role.guardian'),    hp: 40,  initiative: -10 },
  support:  { label: i18n.t('heroes.role.support'),       hp: 0,   initiative: 5 },
  marksman: { label: i18n.t('heroes.role.marksman'),     hp: -20, initiative: 10 },
  striker:  { label: i18n.t('heroes.role.striker'),    hp: 20,  initiative: 0 },
  balanced: { label: i18n.t('heroes.role.balanced'), hp: 0,   initiative: 0 },
};

const CARDS = { ...PART_SPELLS, ...STARTER_SPELLS, ...COLLECTION_SPELLS };
const has = (c, type) => (c.effects || []).some((e) => e.type === type);

/** Rol a partir de los ids de sus cartas (los que no son cartas de partes se ignoran). */
export function roleFromCards(cardIds = []) {
  const cards = (cardIds || []).map((id) => CARDS[id] || VARIANT_SPELLS[id]).filter(Boolean);
  if (!cards.length) return 'balanced';
  const shields = cards.filter((c) => has(c, 'shield')).length;
  const supports = cards.filter((c) => has(c, 'heal') || c.targetType === 'ally').length;
  const attacks = cards.filter((c) => has(c, 'damage'));
  const avgRange = attacks.length ? attacks.reduce((t, c) => t + (c.maxRange || 1), 0) / attacks.length : 0;
  if (shields >= 2) return 'guardian';
  if (supports >= 2) return 'support';
  if (attacks.length >= 2 && avgRange >= 2.5) return 'marksman';
  if (attacks.length >= 3) return 'striker';
  return 'balanced';
}

/** { baseHP, baseInitiative, basePA, basePM, role, roleLabel, classLabel } de un Axie. */
export function axieBaseStats(axieClass, cardIds = []) {
  const cls = CLASS_BASE[String(axieClass || '').toLowerCase()] || DEFAULT_CLASS;
  const role = roleFromCards(cardIds);
  const r = ROLES[role];
  return {
    baseHP: cls.hp + r.hp,
    baseInitiative: cls.initiative + r.initiative,
    basePA: BASE_PA,
    basePM: BASE_PM,
    role,
    roleLabel: r.label,
    classLabel: cls.label,
  };
}
