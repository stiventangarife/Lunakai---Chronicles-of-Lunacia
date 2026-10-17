// StarterCards.js — Las 6 cartas originales de Bing y Pomodoro, Axies iniciales oficiales de Axie Infinity: Origins.
//
// Fuente: API oficial de Sky Mavis (/origins/v2/community/cards). Los Axies iniciales usan las versiones «α» de sus cartas
// (stage 0), con efectos propios. Las partes se confirmaron con sus modelos 3D (texturas T_Char_Axies_Bing / _Pomodoro):
//   · Bing (Beast en Origins): Puppy (ojos, orejas y boca), Toy Ball (cuerno), Cone Shell (espalda), Shiba (cola).
//   · Pomodoro (Bug en Origins): Passion (ojos), Leaf Bug (orejas y cola), Platypus (boca), Lost Dream (cuerno), Village Hero (espalda).
//
// Traducción a Lunakai (mismas reglas que las 235 cartas de partes):
//   coste 0 → 1 PA · coste 1 → 2 PA · coste 2 → 3 PA · daño ±10 % del ATK original · Rage → Potenciado +20 % (2 turnos) ·
//   Bulwark → Protegido −20 % de daño recibido (2 turnos) · Cocoon, robar cartas, Ethereal y Purify no existen en el motor.

import { withDisplayFields } from './PartCards.js';

const D = (v, extra = {}) => ({ type: 'damage', min: Math.round(v * 0.9), max: Math.round(v * 1.1), ...extra });
const RAGE = (target = 'allAllies') => ({ type: 'status', status: 'empowered', value: 20, duration: 2, ...(target ? { target } : {}) });
const BULWARK = (target) => ({ type: 'status', status: 'guarded', value: 20, duration: 2, ...(target ? { target } : {}) });

const card = (hero, part, o) => ({
  id: `starter_${hero}_${part}`, isPartCard: true, isStarterCard: true, hero, part,
  requiresLoS: o.targetType === 'enemy', isLinear: false, areaType: 'single', ...o,
});

export const STARTER_CARDS_LIST = [
  // ------------------------------------------------------------------ Bing
  card('bing', 'eyes', {
    name: 'Puppy', officialName: 'Puppy α', class: 'beast', paCost: 1, minRange: 0, maxRange: 3, targetType: 'ally',
    effects: [{ type: 'heal', amount: 5 }, RAGE(null)],
    description: 'Cura 5 HP a un aliado y le da +20 % de daño (2 turnos).',
    adaptation: '+1 Rage → Potenciado +20 % (2 turnos).',
    art: './assets/cards/starter/bing-eyes.webp', // ilustración oficial de la carta α de Bing
  }),
  card('bing', 'ears', {
    name: 'Puppy', officialName: 'Puppy α', class: 'beast', paCost: 2, minRange: 1, maxRange: 2, targetType: 'enemy',
    effects: [D(50), { type: 'heal', amount: 12, target: 'allAllies' }],
    description: '45–55 de daño. Cura 12 HP a todos los aliados (25 % del ATK).',
    art: './assets/cards/starter/bing-ears.webp', // ilustración oficial de la carta α de Bing
  }),
  card('bing', 'mouth', {
    name: 'Puppy', officialName: 'Puppy α', class: 'beast', paCost: 2, minRange: 1, maxRange: 1, targetType: 'enemy',
    effects: [D(55), RAGE()],
    description: '50–61 de daño. +20 % de daño a todos los aliados (2 turnos).',
    adaptation: '+1 Rage a los aliados → Potenciado +20 % (2 turnos).',
    art: './assets/cards/starter/bing-mouth.webp', // ilustración oficial de la carta α de Bing
  }),
  card('bing', 'horn', {
    name: 'Toy Ball', officialName: 'Toy Ball α', class: 'beast', paCost: 2, minRange: 1, maxRange: 3, targetType: 'enemy',
    effects: [D(50), { type: 'status', status: 'taunt', duration: 2, target: 'self' }],
    description: '45–55 de daño. Aplica Provocación al lanzador (2 turnos).',
    adaptation: 'En Origins apunta solo al enemigo con menos vida; aquí eliges el objetivo.',
    art: './assets/cards/starter/bing-horn.webp', // ilustración oficial de la carta α de Bing
  }),
  card('bing', 'back', {
    name: 'Cone Shell', officialName: 'Cone Shell α', class: 'plant', paCost: 2, minRange: 0, maxRange: 3, targetType: 'ally',
    effects: [{ type: 'heal', amount: 60 }],
    description: 'Cura 60 HP a un aliado.',
    art: './assets/cards/starter/bing-back.webp', // ilustración oficial de la carta α de Bing
  }),
  card('bing', 'tail', {
    name: 'Shiba', officialName: 'Shiba α', class: 'beast', paCost: 3, minRange: 1, maxRange: 2, targetType: 'enemy',
    effects: [D(130), RAGE()],
    description: '117–143 de daño. +20 % de daño a todos los aliados (2 turnos).',
    adaptation: '+1 Rage a los aliados → Potenciado +20 % (2 turnos).',
    art: './assets/cards/starter/bing-tail.webp', // ilustración oficial de la carta α de Bing
  }),

  // ------------------------------------------------------------------ Pomodoro
  card('pomodoro', 'eyes', {
    name: 'Passion', officialName: 'Passion α', class: 'bird', paCost: 1, minRange: 0, maxRange: 3, targetType: 'ally',
    effects: [{ type: 'heal', amount: 5 }, { type: 'cleanse', count: 3 }],
    description: 'Cura 5 HP a un aliado y le quita hasta 3 perjuicios.',
    art: './assets/cards/starter/pomodoro-eyes.webp', // ilustración oficial de la carta α de Pomodoro
  }),
  card('pomodoro', 'ears', {
    name: 'Leaf Bug', officialName: 'Leaf Bug α', class: 'bug', paCost: 2, minRange: 0, maxRange: 3, targetType: 'ally',
    effects: [{ type: 'shield', amount: 60 }, BULWARK()],
    description: '+60 de escudo a un aliado y −20 % de daño recibido (2 turnos).',
    adaptation: 'Bulwark → Protegido −20 % (2 turnos); Cocoon no existe en el motor.',
    art: './assets/cards/starter/pomodoro-ears.webp', // ilustración oficial de la carta α de Pomodoro
  }),
  card('pomodoro', 'mouth', {
    name: 'Platypus', officialName: 'Platypus α', class: 'beast', paCost: 2, minRange: 0, maxRange: 0, targetType: 'self',
    effects: [{ type: 'shield', amount: 20, target: 'allAllies' }],
    description: '+20 de escudo a todos los aliados.',
    art: './assets/cards/starter/pomodoro-mouth.webp', // ilustración oficial de la carta α de Pomodoro
  }),
  card('pomodoro', 'horn', {
    name: 'Lost Dream', officialName: 'Lost Dream α', class: 'mech', iconClass: 'bug', paCost: 2, minRange: 0, maxRange: 0, targetType: 'self',
    effects: [{ type: 'shield', amount: 50, target: 'self' }, BULWARK('self'), { type: 'shield', amount: 20, target: 'allAllies' }],
    description: '+50 de escudo y −20 % de daño recibido (2 turnos) al lanzador. +20 de escudo a todos los aliados.',
    adaptation: 'Ethereal/Banish no existen: el escudo de 20 «al desterrarse» se da al lanzarla. Sin robo de carta.',
    art: './assets/cards/starter/pomodoro-horn.webp', // ilustración oficial de la carta α de Pomodoro
  }),
  card('pomodoro', 'back', {
    name: 'Village Hero', officialName: 'Village Hero α', class: 'mech', iconClass: 'bug', paCost: 2, minRange: 1, maxRange: 1, targetType: 'enemy',
    effects: [D(50, { bonus: [{ perAllyShielded: 10, cap: 40 }] })],
    description: '45–55 de daño (+10 por cada aliado con escudo, máx. +40).',
    adaptation: '«+10 ATK cada vez que da escudo a otro aliado» → +10 por aliado con escudo al golpear.',
    art: './assets/cards/starter/pomodoro-back.webp', // ilustración oficial de la carta α de Pomodoro
  }),
  card('pomodoro', 'tail', {
    name: 'Leaf Bug', officialName: 'Leaf Bug α', class: 'bug', paCost: 2, minRange: 0, maxRange: 3, targetType: 'ally',
    effects: [{ type: 'shield', amount: 60 }, BULWARK()],
    description: '+60 de escudo a un aliado y −20 % de daño recibido (2 turnos).',
    adaptation: 'Bulwark → Protegido −20 % (2 turnos); Cocoon no existe en el motor.',
    art: './assets/cards/starter/pomodoro-tail.webp', // ilustración oficial de la carta α de Pomodoro
  }),
];

/** Mazo de cada Axie inicial, en el orden de las 6 ranuras del HUD (ojos, orejas, boca, cuerno, espalda, cola). */
export const STARTER_DECKS = {
  bing: ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'].map((p) => `starter_bing_${p}`),
  pomodoro: ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'].map((p) => `starter_pomodoro_${p}`),
};

export const STARTER_SPELLS = Object.fromEntries(STARTER_CARDS_LIST.map((c) => [c.id, withDisplayFields(c)]));
