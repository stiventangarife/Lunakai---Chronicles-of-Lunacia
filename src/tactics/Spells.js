import { unitUnlockLevel, isLockedFor } from './combat/SkillUnlocks.js'; // Hito 98
import * as THREE from 'three';
import { VFXManager } from './VFXManager.js';
import { CombatEvents } from './combat/CombatEvents.js';
import { SpellPresentation } from './combat/SpellPresentation.js';
import { registerTutorialHooks } from './combat/TutorialCombatHooks.js';
import { StatusSystem } from './combat/StatusSystem.js';
import { BattlefieldObjects } from './combat/BattlefieldObjects.js';
import { EffectResolver } from './combat/EffectResolver.js';
import { elementalMultiplier } from './combat/Elements.js';
import { UltimateSystem } from './combat/UltimateSystem.js';
import { RuneCharmSystem } from './combat/RuneCharmEffects.js';
import { GolemSystem } from './combat/GolemSystem.js';
import { PART_SPELLS } from './data/PartCards.js';
import { STARTER_SPELLS } from './data/StarterCards.js';
import { COLLECTION_SPELLS } from './data/CollectionCards.js';
import { onVariantRegistered } from './data/VariantCards.js';
import { applyEnemySpellEffects } from './data/EnemySpellEffects.js';
import * as i18n from '../i18n/i18n.js';

export const SPELLS_DB = {
  // ===================================================================================
  // SAPIDAE — 24 habilidades (Hito 95: rediseño según el lore de la arcilla espiritual).
  // Cada clase tiene 1 ataque (ranura 1, la usa el tutorial), su gólem (ranura 2) y 4 habilidades de apoyo, control
  // o terreno. Los Axies llevan el frente; el Sapidae «guía el combate sin dirigirlo».
  // Los campos baseMinDamage/baseMinHeal/shieldAmount/pushDistance que aparecen aquí son SOLO para la interfaz
  // (tooltips y pronóstico); el combate usa `effects`. Gólems: combat/GolemSystem.js.
  // ===================================================================================

  // --- Alfarero de Gólems (crafter): Gólem Centinela, defensa y bloqueo
  craft_clay_fist: {
    id: 'craft_clay_fist', name: 'Puño de Arcilla', icon: './assets/skills/heroes/crafter/1.webp',
    paCost: 3, minRange: 1, maxRange: 2, requiresLoS: true, isLinear: true,
    targetType: 'enemy', areaType: 'single', sound: 'melee',
    baseMinDamage: 42, baseMaxDamage: 55, pushDistance: 1,
    effects: [
      { type: 'damage', min: 42, max: 55 },
      { type: 'push', distance: 1 },
    ],
    description: 'Puñetazo de arcilla reforzada con piedra: 42-55 de daño y empuja al enemigo 1 casilla (daño de colisión si choca).'
  },
  craft_sentinel_golem: {
    id: 'craft_sentinel_golem', name: 'Centinela de Vasija', icon: './assets/skills/heroes/crafter/2.webp',
    paCost: 4, minRange: 1, maxRange: 2, requiresLoS: true, isLinear: false,
    targetType: 'empty', areaType: 'single', sound: 'push',
    castsPerTurn: 1, isGolemSummon: true,
    effects: [
      { type: 'summonGolem', kind: 'sentinel' },
    ],
    description: 'Moldea un Gólem Centinela con el 70 % de tu vida máxima. Provoca a los enemigos que tiene al lado y tus aliados a su lado reciben −25 % de daño. Al romperse, da +30 de escudo a esos aliados. Uno a la vez.'
  },
  craft_stone_veins: {
    id: 'craft_stone_veins', name: 'Vetas de Piedra', icon: './assets/skills/heroes/crafter/3.webp',
    paCost: 2, minRange: 1, maxRange: 3, requiresLoS: true, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'buff',
    shieldAmount: 60,
    effects: [
      { type: 'heal', amount: 80, if: { targetIsGolem: true } },
      { type: 'shield', amount: 60, if: { targetNotGolem: true } },
      { type: 'status', status: 'unmovable', duration: 1, if: { targetNotGolem: true, targetNotCaster: true } },
      // En uno mismo dura 2: su turno actual cuenta como el primero
      { type: 'status', status: 'unmovable', duration: 2, if: { targetIsCaster: true } },
    ],
    description: 'Refuerza a un aliado con vetas minerales: +60 de escudo y Arraigado (no puede ser empujado). Sobre tu gólem, lo repara +80 de vida.'
  },
  craft_clay_wall: {
    id: 'craft_clay_wall', name: 'Muralla de Arcilla', icon: './assets/skills/heroes/crafter/4.webp',
    paCost: 2, minRange: 1, maxRange: 3, requiresLoS: false, isLinear: false,
    targetType: 'empty', areaType: 'single', sound: 'push',
    shieldAmount: 30,
    effects: [
      { type: 'summon', model: 'wood_post', rounds: 2, kind: 'barricade' },
      { type: 'shield', amount: 30, target: 'self' },
    ],
    description: 'Levanta un muro de arcilla indestructible que bloquea el paso y la visión durante 2 rondas. +30 de escudo al lanzador.'
  },
  craft_carry_wounded: {
    id: 'craft_carry_wounded', name: 'Llevar al Herido', icon: './assets/skills/heroes/crafter/5.webp',
    paCost: 3, minRange: 1, maxRange: 5, requiresLoS: false, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'heal',
    allyFilter: 'otherLiving',
    baseMinHeal: 30, baseMaxHeal: 40,
    effects: [
      { type: 'heal', min: 30, max: 40 },
      { type: 'golemFetch' },
    ],
    description: 'Tu gólem trae a un aliado a una casilla a su lado y le cura 30-40. Sin gólem, lo trae junto a ti.'
  },
  craft_fortify: {
    id: 'craft_fortify', name: 'Fortificar', icon: './assets/skills/heroes/crafter/6.webp',
    paCost: 2, minRange: 1, maxRange: 6, requiresLoS: false, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'buff',
    allyFilter: 'golem', castsPerTurn: 1,
    shieldAmount: 100,
    effects: [
      { type: 'shield', amount: 100 },
      { type: 'status', status: 'reflect', value: 20, duration: 2 },
    ],
    description: 'Tu gólem se endurece: +100 de escudo y Espinas (devuelve 20 de daño a quien lo golpee cuerpo a cuerpo) durante 2 rondas. 1 vez por turno.'
  },

  // --- Comandante de Sombrero (shepard): órdenes, repetidor y posición
  shepard_hat_headbutt: {
    id: 'shepard_hat_headbutt', name: 'Cabezazo del Sombrero', icon: './assets/skills/heroes/shepard/1.webp',
    paCost: 3, minRange: 1, maxRange: 2, requiresLoS: true, isLinear: true,
    targetType: 'enemy', areaType: 'single', sound: 'melee',
    baseMinDamage: 40, baseMaxDamage: 52,
    effects: [
      { type: 'damage', min: 40, max: 52 },
      { type: 'resource', pa: -1, when: 'nextTurn' },
    ],
    description: 'Embestida con el sombrero de arcilla: 40-52 de daño y −1 PA en el próximo turno del enemigo.'
  },
  shepard_hat_golem: {
    id: 'shepard_hat_golem', name: 'Gólem Sombrero', icon: './assets/skills/heroes/shepard/2.webp',
    paCost: 4, minRange: 1, maxRange: 2, requiresLoS: true, isLinear: false,
    targetType: 'empty', areaType: 'single', sound: 'buff',
    castsPerTurn: 1, isGolemSummon: true,
    effects: [
      { type: 'summonGolem', kind: 'hat' },
    ],
    description: 'Moldea un Gólem Sombrero con el 45 % de tu vida máxima. Repite tus órdenes: Traducir el Aviso, Orden Compartida y Retirada Guiada llegan a cualquier aliado a 2 casillas del gólem. Al final de tu turno da +1 PM a los aliados que tiene al lado. Al romperse, +1 PA a esos aliados.'
  },
  shepard_translate_warning: {
    id: 'shepard_translate_warning', name: 'Traducir el Aviso', icon: './assets/skills/heroes/shepard/3.webp',
    paCost: 2, minRange: 1, maxRange: 4, requiresLoS: true, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'buff',
    allyFilter: 'living', relay: true, castsPerTurn: 1,
    effects: [
      { type: 'resource', pm: 2, when: 'auto' },
    ],
    description: 'Traduces el aviso de Lunacia: el aliado gana +2 PM en su turno. Llega también por tu Gólem Sombrero. 1 vez por turno.'
  },
  shepard_shared_order: {
    id: 'shepard_shared_order', name: 'Orden Compartida', icon: './assets/skills/heroes/shepard/4.webp',
    paCost: 3, minRange: 1, maxRange: 4, requiresLoS: true, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'buff',
    allyFilter: 'companion', relay: true, castsPerTurn: 1,
    effects: [
      { type: 'resource', pa: 1, when: 'auto' },
      { type: 'status', status: 'empowered', value: 15, duration: 1 },
    ],
    description: 'Tu Axie recibe la orden a tiempo: +1 PA y +15 % de daño en su turno. Llega también por tu Gólem Sombrero. 1 vez por turno.'
  },
  shepard_guided_retreat: {
    id: 'shepard_guided_retreat', name: 'Retirada Guiada', icon: './assets/skills/heroes/shepard/5.webp',
    paCost: 2, minRange: 1, maxRange: 4, requiresLoS: true, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'buff',
    allyFilter: 'living', relay: true,
    shieldAmount: 30,
    effects: [
      { type: 'shield', amount: 30 },
      { type: 'retreat', distance: 2 },
    ],
    description: 'Guías a un aliado lejos del suelo que se hunde: +30 de escudo y se aleja 2 casillas del enemigo más cercano. Llega también por tu Gólem Sombrero.'
  },
  shepard_relief: {
    id: 'shepard_relief', name: 'Relevo', icon: './assets/skills/heroes/shepard/6.webp',
    paCost: 2, minRange: 1, maxRange: 4, requiresLoS: true, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'buff',
    allyFilter: 'notSelf',
    shieldAmount: 25,
    effects: [
      { type: 'shield', amount: 25 },
      { type: 'shield', amount: 25, target: 'self' },
      { type: 'swap' },
    ],
    description: 'Intercambias la posición con un aliado o con tu gólem. Los dos ganan +25 de escudo.'
  },

  // --- Guardián de Campanas (lunalogist): Wind Bells, curación y purificación
  lunalogist_alarm_toll: {
    id: 'lunalogist_alarm_toll', name: 'Tañido de Alarma', icon: './assets/skills/heroes/lunalogist/1.webp',
    paCost: 3, minRange: 1, maxRange: 3, requiresLoS: true, isLinear: false,
    targetType: 'enemy', areaType: 'single', sound: 'bow',
    baseMinDamage: 35, baseMaxDamage: 45,
    effects: [
      { type: 'damage', min: 35, max: 45 },
      { type: 'status', status: 'fragile', value: 25, duration: 1 },
    ],
    description: 'La campana delata la corrupción: 35-45 de daño y Frágil (+25 % de daño recibido) hasta el final de su próximo turno.'
  },
  lunalogist_bell_golem: {
    id: 'lunalogist_bell_golem', name: 'Gólem Campanario', icon: './assets/skills/heroes/lunalogist/2.webp',
    paCost: 4, minRange: 1, maxRange: 2, requiresLoS: true, isLinear: false,
    targetType: 'empty', areaType: 'single', sound: 'heal',
    castsPerTurn: 1, isGolemSummon: true,
    effects: [
      { type: 'summonGolem', kind: 'bell' },
    ],
    description: 'Moldea un Gólem Campanario con el 45 % de tu vida máxima, que lleva una Wind Bell. Al final de tu turno suena: aliados a 2 casillas o menos +20 de vida y pierden un estado negativo; enemigos a esa distancia quedan Frágiles. Al romperse, su último tañido cura 40 en radio 2.'
  },
  lunalogist_mourning_tone: {
    id: 'lunalogist_mourning_tone', name: 'Tono de Duelo', icon: './assets/skills/heroes/lunalogist/3.webp',
    paCost: 2, minRange: 1, maxRange: 3, requiresLoS: true, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'heal',
    baseMinHeal: 40, baseMaxHeal: 55,
    effects: [
      { type: 'heal', min: 40, max: 55 },
      { type: 'cleanse', only: ['poison', 'bleed', 'burn'] },
    ],
    description: 'El tono grave de la campana: cura 40-55 y quita veneno, sangrado y quemadura.'
  },
  lunalogist_warning_whisper: {
    id: 'lunalogist_warning_whisper', name: 'Susurro de Advertencia', icon: './assets/skills/heroes/lunalogist/4.webp',
    paCost: 2, minRange: 1, maxRange: 4, requiresLoS: true, isLinear: false,
    targetType: 'ally', areaType: 'single', sound: 'buff',
    allyFilter: 'living',
    shieldAmount: 35,
    effects: [
      { type: 'shield', amount: 35 },
      { type: 'ward', apply: 'weak', applyValue: 20, applyDuration: 1, duration: 2 },
    ],
    description: 'El viento avisa del golpe: +35 de escudo y Guarda (el próximo enemigo que golpee al aliado queda Debilitado, −20 % de daño, 1 turno).'
  },
  lunalogist_purify: {
    id: 'lunalogist_purify', name: 'Purificar', icon: './assets/skills/heroes/lunalogist/5.webp',
    paCost: 3, minRange: 1, maxRange: 3, requiresLoS: true, isLinear: false,
    targetType: 'enemy', areaType: 'single', sound: 'heal',
    baseMinDamage: 30, baseMaxDamage: 40,
    effects: [
      { type: 'damage', min: 30, max: 40 },
      { type: 'dispel' },
    ],
    description: 'Limpia la corrupción del enemigo: 30-40 de daño y le quita todos sus efectos positivos.'
  },
  lunalogist_blood_moon: {
    id: 'lunalogist_blood_moon', name: 'Resonancia de la Luna de Sangre', icon: './assets/skills/heroes/lunalogist/6.webp',
    paCost: 4, minRange: 0, maxRange: 0, requiresLoS: false, isLinear: false,
    targetType: 'self', areaType: 'allAllies', sound: 'heal',
    effects: [
      { type: 'status', status: 'regen', value: 20, duration: 2, target: 'allAllies' },
      { type: 'status', status: 'immune', duration: 1, target: 'allAllies' },
    ],
    description: 'Las campanas suenan con una resonancia extraña: todos tus aliados regeneran 20 de vida al empezar su turno durante 2 turnos y quedan Inmunes (aturdir, dormir y miedo) 1 turno.'
  },

  // --- Rastreador Gogo (stargazer): petrasentido, tierra estable y control
  stargazer_yielding_ground: {
    id: 'stargazer_yielding_ground', name: 'Suelo que Cede', icon: './assets/skills/heroes/stargazer/1.webp',
    paCost: 3, minRange: 1, maxRange: 3, requiresLoS: true, isLinear: false,
    targetType: 'enemy', areaType: 'single', sound: 'push',
    baseMinDamage: 40, baseMaxDamage: 52,
    effects: [
      { type: 'damage', min: 40, max: 52 },
      { type: 'resource', pm: -1, when: 'nextTurn' },
    ],
    description: 'Tu petrasentido abre el suelo bajo el enemigo: 40-52 de daño y −1 PM en su próximo turno.'
  },
  stargazer_shell_golem: {
    id: 'stargazer_shell_golem', name: 'Gólem Caparazón', icon: './assets/skills/heroes/stargazer/2.webp',
    paCost: 4, minRange: 1, maxRange: 2, requiresLoS: true, isLinear: false,
    targetType: 'empty', areaType: 'single', sound: 'buff',
    castsPerTurn: 1, isGolemSummon: true,
    effects: [
      { type: 'summonGolem', kind: 'shell' },
    ],
    description: 'Moldea un Gólem Caparazón con el 50 % de tu vida máxima, cubierto de caracoles Gogo. Su casilla y las de alrededor son tierra estable: los aliados que empiezan su turno allí ganan +1 PM y Arraigado, y pierden quemadura y veneno. Al romperse, los caracoles dejan tierra estable en 3×3 durante 2 rondas.'
  },
  stargazer_petrasense: {
    id: 'stargazer_petrasense', name: 'Petrasentido', icon: './assets/skills/heroes/stargazer/3.webp',
    paCost: 2, minRange: 1, maxRange: 6, requiresLoS: false, isLinear: false,
    targetType: 'enemy', areaType: 'single', sound: 'buff',
    effects: [
      { type: 'status', status: 'fragile', value: 25, duration: 2 },
      { type: 'status', status: 'rangeDown', value: 1, duration: 2 },
    ],
    description: 'Sientes al enemigo a través del suelo, sin necesidad de verlo: Frágil (+25 % de daño recibido) y −1 de alcance durante 2 turnos.'
  },
  stargazer_shell_march: {
    id: 'stargazer_shell_march', name: 'Marcha del Caparazón', icon: './assets/skills/heroes/stargazer/4.webp',
    paCost: 2, minRange: 1, maxRange: 3, requiresLoS: false, isLinear: false,
    targetType: 'empty', areaType: 'single', sound: 'buff',
    rangeFrom: 'golem', castsPerTurn: 1,
    effects: [
      { type: 'golemMove', trailRounds: 2 },
    ],
    description: 'Tu gólem avanza hasta 3 casillas desde donde está. Por donde pasa queda tierra estable durante 2 rondas. 1 vez por turno.'
  },
  stargazer_corrupt_rift: {
    id: 'stargazer_corrupt_rift', name: 'Grieta Corrupta', icon: './assets/skills/heroes/stargazer/5.webp',
    paCost: 2, minRange: 1, maxRange: 4, requiresLoS: true, isLinear: false,
    targetType: 'any', areaType: 'box2x2', sound: 'buff',
    effects: [
      { type: 'zone', rounds: 2, kind: 'corrupt_rift', ally: {}, enemy: { pm: -2 } },
    ],
    description: 'Zona de 2×2 durante 2 rondas: los enemigos que empiezan su turno dentro pierden 2 PM.'
  },
  stargazer_dawn_spiral: {
    id: 'stargazer_dawn_spiral', name: 'Espiral del Alba', icon: './assets/skills/heroes/stargazer/6.webp',
    paCost: 4, minRange: 1, maxRange: 3, requiresLoS: true, isLinear: false,
    targetType: 'any', areaType: 'box3x3', sound: 'heal',
    selective: true,
    baseMinDamage: 45, baseMaxDamage: 58,
    effects: [
      { type: 'damage', min: 45, max: 58, target: 'enemiesInArea' },
      { type: 'heal', amount: 25, target: 'alliesInArea' },
      { type: 'cleanse', only: ['burn', 'poison'], target: 'alliesInArea' },
    ],
    description: 'Los caracoles Gogo trazan una espiral en área 3×3: 45-58 de daño solo a los enemigos; los aliados ganan +25 de vida y pierden quemadura y veneno.'
  },

  kotaro_slash: {
    id: 'kotaro_slash',
    name: 'Fierce Slash',
    part: 'eyes',
    partIcon: './assets/parts/beast-eyes.png',
    icon: './assets/skills/heroes/shinji/1.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    description: 'Devastating melee slash. Deals 65-80 blunt physical damage.',
    baseMinDamage: 65,
    baseMaxDamage: 80,
    sound: 'melee'
  },
  kotaro_push: {
    id: 'kotaro_push',
    name: 'Repelling Charge',
    part: 'ears',
    partIcon: './assets/parts/beast-ears.png',
    icon: './assets/skills/heroes/shinji/2.png',
    paCost: 2,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 2,
    description: 'Charge that deals 25-35 damage and pushes the target 2 tiles causing collision.',
    baseMinDamage: 25,
    baseMaxDamage: 35,
    sound: 'push'
  },
  kotaro_jump: {
    id: 'kotaro_jump',
    name: 'Tactical Leap',
    part: 'mouth',
    partIcon: './assets/parts/beast-mouth.png',
    icon: './assets/skills/heroes/shinji/3.png',
    paCost: 3,
    minRange: 2,
    maxRange: 3,
    requiresLoS: false,
    isLinear: false,
    targetType: 'empty',
    areaType: 'cross1',
    description: 'Leap over any obstacle to an empty tile. Grants +40 Shield and deals 25 damage to adjacent enemies upon landing.',
    shieldAmount: 40,
    baseMinDamage: 22,
    baseMaxDamage: 28,
    sound: 'explosion'
  },
  kotaro_bite: {
    id: 'kotaro_bite',
    name: 'Mordisco Bestial',
    part: 'horn',
    partIcon: './assets/parts/beast-horn.png',
    icon: './assets/skills/heroes/shinji/4.png',
    paCost: 2,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    description: 'Mordisco feroz a quemarropa que inflige 45-58 de daño físico directo y desgarra la defensa enemiga.',
    baseMinDamage: 45,
    baseMaxDamage: 58,
    sound: 'melee'
  },
  kotaro_roar: {
    id: 'kotaro_roar',
    name: 'Rugido Territorial',
    part: 'back',
    partIcon: './assets/parts/beast-back.png',
    icon: './assets/skills/heroes/shinji/5.png',
    paCost: 2,
    minRange: 0,
    maxRange: 2,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'cross1',
    buffTargetPM: 1,
    shieldAmount: 25,
    description: 'Rugido salvaje que infunde bravura a la manada: otorga +1 PM y +25 de Escudo protector a los aliados cercanos.',
    sound: 'buff'
  },
  kotaro_frenzy: {
    id: 'kotaro_frenzy',
    name: 'Furia Lunar',
    part: 'tail',
    partIcon: './assets/parts/beast-tail.png',
    icon: './assets/skills/heroes/shinji/6.png',
    paCost: 4,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    description: 'Desata el instinto depredador de la Bestia: asesta un golpe devastador de 85-110 de daño letal.',
    baseMinDamage: 85,
    baseMaxDamage: 110,
    sound: 'melee'
  },
  bird_cupid: {
    id: 'bird_cupid',
    name: 'Cupid Arrow',
    part: 'eyes',
    partIcon: './assets/parts/beast-eyes.png',
    icon: './assets/skills/heroes/early-bird/1.png',
    paCost: 3,
    minRange: 1,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    description: 'Accurate aerial ranged shot (1-4 Range) dealing 70-85 piercing aerial damage.',
    baseMinDamage: 70,
    baseMaxDamage: 85,
    sound: 'bow'
  },
  bird_owl: {
    id: 'bird_owl',
    name: 'Owl Gaze',
    part: 'ears',
    partIcon: './assets/parts/beast-ears.png',
    icon: './assets/skills/heroes/early-bird/2.png',
    paCost: 2,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    buffSelfPM: 1,
    description: 'Swift attack with piercing gaze (1-3 Range) dealing 35-45 damage and hastening the hero (+1 MP).',
    baseMinDamage: 35,
    baseMaxDamage: 45,
    sound: 'bow'
  },
  bird_aerial_jump: {
    id: 'bird_aerial_jump',
    name: 'Aerial Leap',
    part: 'mouth',
    partIcon: './assets/parts/beast-mouth.png',
    icon: './assets/skills/heroes/early-bird/3.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: false,
    isLinear: false,
    targetType: 'empty',
    areaType: 'cross1',
    shieldAmount: 30,
    description: 'Unfurls wings and glides over any obstacle (2-4 Range). Grants +30 Shield and deals 25 damage in a cross upon landing.',
    baseMinDamage: 22,
    baseMaxDamage: 28,
    sound: 'explosion'
  },
  bird_feather_barrage: {
    id: 'bird_feather_barrage',
    name: 'Lluvia de Plumas',
    part: 'horn',
    partIcon: './assets/parts/beast-horn.png',
    icon: './assets/skills/heroes/early-bird/4.png',
    paCost: 3,
    minRange: 2,
    maxRange: 5,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    description: 'Lanza una ráfaga de plumas celestiales que causa 42-55 de daño a todos los enemigos en el área.',
    baseMinDamage: 42,
    baseMaxDamage: 55,
    sound: 'bow'
  },
  bird_tailwind: {
    id: 'bird_tailwind',
    name: 'Viento de Cola',
    part: 'back',
    partIcon: './assets/parts/beast-back.png',
    icon: './assets/skills/heroes/early-bird/5.png',
    paCost: 2,
    minRange: 1,
    maxRange: 3,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    buffTargetPM: 2,
    shieldAmount: 20,
    description: 'Invoca corrientes ascendentes favorables que otorgan +2 PM inmediatos y +20 de Escudo a un aliado.',
    sound: 'buff'
  },
  bird_sky_dive: {
    id: 'bird_sky_dive',
    name: 'Picado Celestial',
    part: 'tail',
    partIcon: './assets/parts/beast-tail.png',
    icon: './assets/skills/heroes/early-bird/6.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    debuffPA: 1,
    description: 'Picado a velocidad terminal desde las alturas que inflige 80-105 de daño masivo y aturde al objetivo (-1 PA).',
    baseMinDamage: 80,
    baseMaxDamage: 105,
    sound: 'melee'
  },
  plant_cactus: {
    id: 'plant_cactus',
    name: 'Cactus Strike',
    part: 'eyes',
    partIcon: './assets/parts/beast-eyes.png',
    icon: './assets/skills/heroes/big-yak/1.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    description: 'Spiky blunt strike dealing 65-80 physical damage that shreds enemy armor.',
    baseMinDamage: 65,
    baseMaxDamage: 80,
    sound: 'melee'
  },
  plant_drain: {
    id: 'plant_drain',
    name: 'Zigzag Bite',
    part: 'ears',
    partIcon: './assets/parts/beast-ears.png',
    icon: './assets/skills/heroes/big-yak/2.png',
    paCost: 2,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    drainHeal: 35,
    description: 'Drains vital energy from the opponent (1-2 Range), dealing 40-50 damage and restoring 35 HP to the hero.',
    baseMinDamage: 40,
    baseMaxDamage: 50,
    sound: 'melee'
  },
  plant_shield: {
    id: 'plant_shield',
    name: 'Bidens Carapace',
    part: 'mouth',
    partIcon: './assets/parts/beast-mouth.png',
    icon: './assets/skills/heroes/big-yak/3.png',
    paCost: 2,
    minRange: 0,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 90,
    description: 'Deploys a dense carapace of thorns granting a massive +90 shield protection to an ally or self.',
    sound: 'buff'
  },
  plant_bramble_trap: {
    id: 'plant_bramble_trap',
    name: 'Trampa de Espinas',
    part: 'horn',
    partIcon: './assets/parts/beast-horn.png',
    icon: './assets/skills/heroes/big-yak/4.png',
    paCost: 2,
    minRange: 1,
    maxRange: 3,
    requiresLoS: false,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    debuffPM: 2,
    baseMinDamage: 30,
    baseMaxDamage: 40,
    description: 'Siembra raíces espinosas que apresan al objetivo causando 30-40 de daño y reduciendo -2 PM.',
    sound: 'push'
  },
  plant_photosynthesis: {
    id: 'plant_photosynthesis',
    name: 'Fotosíntesis',
    part: 'back',
    partIcon: './assets/parts/beast-back.png',
    icon: './assets/skills/heroes/big-yak/5.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    healAmount: 55,
    shieldAmount: 30,
    description: 'Absorbe la luz de Lunacia restaurando 55 HP de inmediato y envolviendo al coloso en +30 de Escudo protector.',
    sound: 'buff'
  },
  plant_seed_burst: {
    id: 'plant_seed_burst',
    name: 'Estallido de Semillas',
    part: 'tail',
    partIcon: './assets/parts/beast-tail.png',
    icon: './assets/skills/heroes/big-yak/6.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    description: 'Detona semillas explosivas orgánicas que causan 50-65 de daño en cruz a todos los enemigos adyacentes.',
    baseMinDamage: 50,
    baseMaxDamage: 65,
    sound: 'explosion'
  },
  bing_explosive: {
    id: 'bing_explosive',
    name: 'Explosive Arrow',
    icon: './assets/skills/heroes/bing/1.png',
    paCost: 4,
    minRange: 3,
    maxRange: 6,
    requiresLoS: true,
    isLinear: false,
    targetType: 'all',
    areaType: 'cross1',
    description: 'Fires a blazing arrow detonating in a cross (5 tiles), dealing 45-55 fire damage to all affected.',
    baseMinDamage: 45,
    baseMaxDamage: 55,
    sound: 'explosion'
  },
  bing_retreat: {
    id: 'bing_retreat',
    name: 'Knockback Arrow',
    icon: './assets/skills/heroes/bing/2.png',
    paCost: 3,
    minRange: 1,
    maxRange: 4,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 3,
    description: 'Linear shot dealing 35 damage and knocking back 3 tiles. Devastating for pushing threats away or slamming them into rocks.',
    baseMinDamage: 32,
    baseMaxDamage: 38,
    sound: 'push'
  },
  bing_slow: {
    id: 'bing_slow',
    name: 'Slowing Arrow',
    icon: './assets/skills/heroes/bing/3.png',
    paCost: 3,
    minRange: 2,
    maxRange: 5,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    debuffPM: 1,
    description: 'Freezing arrow dealing 30 damage and inflicting -1 MP on the target on their next turn.',
    baseMinDamage: 28,
    baseMaxDamage: 34,
    sound: 'bow'
  },
  pomodoro_heal: {
    id: 'pomodoro_heal',
    name: 'Word of Healing',
    icon: './assets/skills/heroes/pomodoro/1.png',
    paCost: 3,
    minRange: 0,
    maxRange: 5,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    description: 'Channels celestial dew of Lunacia to restore 55-70 HP to an ally or self.',
    baseMinHeal: 55,
    baseMaxHeal: 70,
    sound: 'heal'
  },
  pomodoro_stim: {
    id: 'pomodoro_stim',
    name: 'Runic Stim',
    icon: './assets/skills/heroes/pomodoro/2.png',
    paCost: 2,
    minRange: 0,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    buffPA: 2,
    description: 'Injects ancestral runic energy. Grants +2 AP on the next turn to an ally or self.',
    sound: 'buff'
  },
  pomodoro_bramble: {
    id: 'pomodoro_bramble',
    name: 'Entangling Bramble',
    icon: './assets/skills/heroes/pomodoro/3.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    debuffPM: 2,
    description: 'Thorny vines sprout from the ground. Deals 25 earth damage and roots the enemy, inflicting -2 MP.',
    baseMinDamage: 22,
    baseMaxDamage: 28,
    sound: 'melee'
  },
  chimera_bite: {
    id: 'chimera_bite',
    name: 'Fierce Bite',
    icon: './assets/skills/mobs/slime/slime-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 35,
    baseMaxDamage: 45,
    sound: 'melee'
  },
  chimera_bellow: {
    id: 'chimera_bellow',
    name: 'Seismic Roar',
    icon: './assets/skills/mobs/werewolf-boss/werewolf-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 25,
    baseMaxDamage: 32,
    sound: 'push'
  },
  chimera_spit: {
    id: 'chimera_spit',
    name: 'Acid Spit',
    icon: './assets/skills/mobs/slime-attack/aqua-slime-atk-02-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'bow'
  },
  chimera_heal: {
    id: 'chimera_heal',
    name: 'Regenerative Howl',
    icon: './assets/skills/mobs/slime-support/aqua-slime-boss-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    baseMinHeal: 40,
    baseMaxHeal: 55,
    sound: 'heal'
  },
  chimera_frost_nova: {
    id: 'chimera_frost_nova',
    name: 'Puffy\'s Glacial Nova',
    icon: './assets/skills/mobs/treant-flower/flowering-treant-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 35,
    baseMaxDamage: 45,
    sound: 'ice'
  },
  kibo_cataclysm: {
    id: 'kibo_cataclysm',
    name: 'Chimera Cataclysm',
    icon: './assets/skills/mobs/werewolf-boss/tool-chimerafragilebeing-02-00.png',
    paCost: 5,
    minRange: 2,
    maxRange: 5,
    requiresLoS: false,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 55,
    baseMaxDamage: 75,
    sound: 'explosion'
  },

  // ==========================================
  // --- HABILIDADES ESPECÍFICAS DE ENEMIGOS ---
  // ==========================================

  // --- 1. Slime Común ---
  slime_strike: {
    id: 'slime_strike',
    name: 'Viscous Strike',
    icon: './assets/skills/mobs/slime/slime-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'melee',
    description: 'Heavy bludgeon with dense gelatinous mass.'
  },
  slime_barrier: {
    id: 'slime_barrier',
    name: 'Gelatinous Shield',
    icon: './assets/skills/mobs/slime/aqua-slime-def-01-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 30,
    sound: 'buff',
    description: 'Creates a protective film granting +30 shield.'
  },

  // --- 2. Slime Attack ---
  slime_attack_spit: {
    id: 'slime_attack_spit',
    name: 'Acid Shot',
    icon: './assets/skills/mobs/slime-attack/aqua-slime-atk-02-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'bow',
    description: 'Corrosive projectile fired from a distance.'
  },
  slime_attack_goo: {
    id: 'slime_attack_goo',
    name: 'Debilitating Slime',
    icon: './assets/skills/mobs/slime-attack/tool-chimeraapplygoonweak-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 26,
    baseMaxDamage: 34,
    sound: 'melee',
    description: 'Viscous splatter that damages and slightly stuns.'
  },

  // --- 3. Slime Defense ---
  slime_defense_slam: {
    id: 'slime_defense_slam',
    name: 'Liquid Rock Charge',
    icon: './assets/skills/mobs/slime-defense/aqua-slime-boss-04-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'push',
    description: 'Battering ram strike that pushes the target 1 tile.'
  },
  slime_defense_barrier: {
    id: 'slime_defense_barrier',
    name: 'Viscous Carapace',
    icon: './assets/skills/mobs/slime-defense/aqua-slime-def-03-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 45,
    sound: 'buff',
    description: 'Solidifies the body granting +45 shield.'
  },

  // --- 4. Slime Support ---
  slime_support_pinch: {
    id: 'slime_support_pinch',
    name: 'Slime Pinch',
    icon: './assets/skills/mobs/slime-support/aqua-slime-atk-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 22,
    baseMaxDamage: 30,
    sound: 'melee',
    description: 'Attack with gelatinous pseudopod.'
  },
  slime_support_heal: {
    id: 'slime_support_heal',
    name: 'Regenerative Mist',
    icon: './assets/skills/mobs/slime-support/aqua-slime-boss-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    baseMinHeal: 40,
    baseMaxHeal: 55,
    sound: 'heal',
    description: 'Watery balm that restores health to an ally.'
  },

  // --- 5. Slime Forest A (Sabana) ---
  slime_forest_a_swipe: {
    id: 'slime_forest_a_swipe',
    name: 'Floral Swipe',
    icon: './assets/skills/mobs/slime-forest-a/forest-slime-flower-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'melee',
    description: 'Botanical slash with flower thorns.'
  },
  slime_forest_a_spit: {
    id: 'slime_forest_a_spit',
    name: 'Acid Pollen',
    icon: './assets/skills/mobs/slime-forest-a/forest-slime-flower-03-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'bow',
    description: 'Ranged blast of irritating pollen.'
  },
  slime_forest_a_thorn: {
    id: 'slime_forest_a_thorn',
    name: 'Thorny Sprout',
    icon: './assets/skills/mobs/slime-forest-a/forest-slime-flower-04-00.png',
    paCost: 2,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 22,
    baseMaxDamage: 30,
    sound: 'bow',
    description: 'Rapid barrage of plant spikes.'
  },

  // --- 6. Wolf Aquatic (Sabana) ---
  wolf_aquatic_bite: {
    id: 'wolf_aquatic_bite',
    name: 'Aquatic Bite',
    icon: './assets/skills/mobs/wolf-aquatic/aqua-wolf-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 38,
    baseMaxDamage: 50,
    sound: 'melee',
    description: 'Lunging bite infused with ocean currents.'
  },

  // --- 7. Wolf Aquatic Alpha (Sabana) ---
  wolf_aquatic_alpha_splash: {
    id: 'wolf_aquatic_alpha_splash',
    name: 'Tidal Bite',
    icon: './assets/skills/mobs/wolf-aquatic-alpha/tool-chimerasplash-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 44,
    baseMaxDamage: 56,
    sound: 'melee',
    description: 'Torrential bite that batters the enemy.'
  },
  wolf_aquatic_alpha_roar: {
    id: 'wolf_aquatic_alpha_roar',
    name: 'Ancestral Roar',
    icon: './assets/skills/mobs/wolf-aquatic-alpha/tool-chimeraelderprotection-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 28,
    baseMaxDamage: 36,
    sound: 'push',
    description: 'Bellow that repels the enemy 1 tile.'
  },

  // --- 8. Wolf Gray (Ártico) ---
  wolf_gray_bite: {
    id: 'wolf_gray_bite',
    name: 'Frost Bite',
    icon: './assets/skills/mobs/wolf-gray/gray-wolf-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 40,
    baseMaxDamage: 52,
    sound: 'melee',
    description: 'Chilling jaws that freeze the target.'
  },
  wolf_gray_slash: {
    id: 'wolf_gray_slash',
    name: 'Glacial Claw',
    icon: './assets/skills/mobs/wolf-gray/alpha-wolf-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 36,
    baseMaxDamage: 46,
    sound: 'melee',
    description: 'Razor ice claws delivering a swift rend.'
  },

  // --- 9. Wolf Alpha (Ártico) ---
  wolf_alpha_bite: {
    id: 'wolf_alpha_bite',
    name: 'Savage Bite',
    icon: './assets/skills/mobs/wolf-alpha/tool-chimerabloodybite-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 48,
    baseMaxDamage: 62,
    sound: 'melee',
    description: 'Alpha leader rend dealing severe damage.'
  },
  wolf_alpha_roar: {
    id: 'wolf_alpha_roar',
    name: 'Polar Howl',
    icon: './assets/skills/mobs/wolf-gray/alpha-wolf-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'push',
    description: 'Intimidating howl that knocks back the victim.'
  },
  wolf_alpha_nova: {
    id: 'wolf_alpha_nova',
    name: 'Blizzard Fury',
    icon: './assets/skills/mobs/wolf-gray/werewolf-04-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 36,
    baseMaxDamage: 48,
    sound: 'ice',
    description: 'Chilling gale punishing in a cross (5 tiles).'
  },

  // --- 10. Slime Knight / Slime Caballero (Ártico; Hito 94, id interno treant_flower) ---
  treant_flower_slam: {
    id: 'treant_flower_slam',
    name: 'Frosted Mace Smash',
    icon: './assets/skills/mobs/treant-flower/flowering-treant-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 42,
    baseMaxDamage: 54,
    sound: 'melee',
    description: 'Crushing blow with its frost-covered mushroom mace.'
  },
  treant_flower_nova: {
    id: 'treant_flower_nova',
    name: 'Icy Spore Shower',
    icon: './assets/skills/mobs/treant-flower/flowering-treant-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 34,
    baseMaxDamage: 45,
    sound: 'ice',
    description: 'Shakes its mushroom maces, releasing icy spores in a cross.'
  },

  // --- 11. Treant Fighter ---
  treant_fighter_punch: {
    id: 'treant_fighter_punch',
    name: 'Oak Fist',
    icon: './assets/skills/mobs/treant-fighter/treant-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 45,
    baseMaxDamage: 58,
    sound: 'melee',
    description: 'Devastating punch with solid hardwood knuckles.'
  },
  treant_fighter_bash: {
    id: 'treant_fighter_bash',
    name: 'Sylvan Bash',
    icon: './assets/skills/mobs/treant-fighter/treant-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'push',
    description: 'Heavy blow that knocks the enemy back 1 tile.'
  },
  treant_fighter_bark: {
    id: 'treant_fighter_bark',
    name: 'Thick Bark',
    icon: './assets/skills/mobs/treant-fighter/tool-chimerathickbark-02-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 55,
    sound: 'buff',
    description: 'Hardens plant skin granting +55 shield.'
  },

  // --- 12. Dryad Fighter (Místico) ---
  dryad_fighter_blade: {
    id: 'dryad_fighter_blade',
    name: 'Sylvan Blade',
    icon: './assets/skills/mobs/dryad-fighter/dryad-fighter-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 42,
    baseMaxDamage: 55,
    sound: 'melee',
    description: 'Magical thrust infused with ancient sap.'
  },
  dryad_fighter_dance: {
    id: 'dryad_fighter_dance',
    name: 'Thorn Dance',
    icon: './assets/skills/mobs/dryad-fighter/dryad-fighter-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 28,
    baseMaxDamage: 38,
    sound: 'push',
    description: 'Agile spin with thorns that pushes the target 1 tile.'
  },
  dryad_fighter_slash: {
    id: 'dryad_fighter_slash',
    name: 'Astral Slash',
    icon: './assets/skills/mobs/dryad-fighter/dryad-fighter-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 38,
    baseMaxDamage: 50,
    sound: 'melee',
    description: 'Luminous slash tearing with stellar energy.'
  },

  // --- 13. Dryad Mage (Místico) ---
  dryad_mage_spark: {
    id: 'dryad_mage_spark',
    name: 'Astral Spark',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-01-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 35,
    baseMaxDamage: 46,
    sound: 'bow',
    description: 'Guided burst of stardust from a distance.'
  },
  dryad_mage_heal: {
    id: 'dryad_mage_heal',
    name: 'Elven Dew',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    baseMinHeal: 45,
    baseMaxHeal: 60,
    sound: 'heal',
    description: 'Restorative essence healing an ally\'s wounds.'
  },
  dryad_mage_burst: {
    id: 'dryad_mage_burst',
    name: 'Cosmic Channeling',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 34,
    baseMaxDamage: 45,
    sound: 'ice',
    description: 'Violet energy detonation in a cross area.'
  },

  // --- 14. Dryad Range (Místico) ---
  dryad_range_arrow: {
    id: 'dryad_range_arrow',
    name: 'Vine Arrow',
    icon: './assets/skills/mobs/dryad-range/dryad-ranger-02-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 36,
    baseMaxDamage: 48,
    sound: 'bow',
    description: 'Precise botanical shaft fired with sylvan bow.'
  },
  dryad_range_snipe: {
    id: 'dryad_range_snipe',
    name: 'Piercing Shot',
    icon: './assets/skills/mobs/dryad-range/dryad-ranger-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 38,
    baseMaxDamage: 50,
    sound: 'bow',
    description: 'Focused high-range shot with armor penetration.'
  },
  dryad_range_root: {
    id: 'dryad_range_root',
    name: 'Restraining Bramble',
    icon: './assets/skills/mobs/dryad-range/flowering-treant-01-00.png',
    paCost: 2,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 24,
    baseMaxDamage: 32,
    sound: 'melee',
    description: 'Thorn whip punishing at close quarters.'
  },

  // --- 15. Slime Forest B (Mazmorra) ---
  slime_forest_b_slam: {
    id: 'slime_forest_b_slam',
    name: 'Cavern Slam',
    icon: './assets/skills/mobs/slime-forest-b/forest-slime-fighter-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 40,
    baseMaxDamage: 52,
    sound: 'melee',
    description: 'Heavy strike of hardened dark slime.'
  },
  slime_forest_b_spit: {
    id: 'slime_forest_b_spit',
    name: 'Volcanic Bile',
    icon: './assets/skills/mobs/slime-forest-b/forest-slime-fighter-03-00.png',
    paCost: 3,
    minRange: 2,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 34,
    baseMaxDamage: 45,
    sound: 'bow',
    description: 'Stream of toxic fluids and subterranean magma.'
  },
  slime_forest_b_heavy: {
    id: 'slime_forest_b_heavy',
    name: 'Seismic Charge',
    icon: './assets/skills/mobs/slime-forest-b/forest-slime-fighter-04-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 32,
    baseMaxDamage: 42,
    sound: 'push',
    description: 'Brutal charge that knocks back 1 tile.'
  },

  // --- 16. Slime Fusion (Mazmorra) ---
  slime_fusion_burst: {
    id: 'slime_fusion_burst',
    name: 'Magma Fusion',
    icon: './assets/skills/mobs/slime-fusion/aqua-slime-boss-05-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 40,
    baseMaxDamage: 54,
    sound: 'explosion',
    description: 'Fiery explosion from fusing viscous cores.'
  },

  // --- 17. Werewolf Boss (Mazmorra Boss) ---
  werewolf_boss_bite: {
    id: 'werewolf_boss_bite',
    name: 'Lupine Rend',
    icon: './assets/skills/mobs/werewolf-boss/werewolf-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 58,
    baseMaxDamage: 75,
    sound: 'melee',
    description: 'Colossal bite of supreme lycanthrope.'
  },
  werewolf_boss_roar: {
    id: 'werewolf_boss_roar',
    name: 'Terrifying Howl',
    icon: './assets/skills/mobs/werewolf-boss/werewolf-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 2,
    baseMinDamage: 38,
    baseMaxDamage: 50,
    sound: 'push',
    description: 'Devastating sonic wave repelling 2 tiles.'
  },
  werewolf_boss_cataclysm: {
    id: 'werewolf_boss_cataclysm',
    name: 'Beast Cataclysm',
    icon: './assets/skills/mobs/werewolf-boss/tool-chimerafragilebeing-02-00.png',
    paCost: 5,
    minRange: 2,
    maxRange: 5,
    requiresLoS: false,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'cross1',
    baseMinDamage: 60,
    baseMaxDamage: 80,
    sound: 'explosion',
    description: 'Unleashes dark eclipse power in a massive cataclysm.'
  },

  // --- 18. Bear Mom (Mazmorra) ---
  bear_mom_strike: {
    id: 'bear_mom_strike',
    name: 'Ladle Strike',
    icon: './assets/skills/mobs/bear-mom/tool-chimeraladdlestrike-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 52,
    baseMaxDamage: 68,
    sound: 'melee',
    description: 'Relentless bludgeoning with a war ladle.'
  },
  bear_mom_roar: {
    id: 'bear_mom_roar',
    name: 'Maternal Fury',
    icon: './assets/skills/mobs/bear-mom/mommy-bear-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 36,
    baseMaxDamage: 48,
    sound: 'push',
    description: 'Protective roar stunning and pushing 1 tile.'
  },
  bear_mom_slam: {
    id: 'bear_mom_slam',
    name: 'Sylvan Claw',
    icon: './assets/skills/mobs/bear-mom/treant-fighter-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 48,
    baseMaxDamage: 62,
    sound: 'melee',
    description: 'Claw swipe that shakes the ground.'
  },

  // --- 19. Bear Dad (Mazmorra Boss) ---
  bear_dad_claw: {
    id: 'bear_dad_claw',
    name: 'Colossal Claw',
    icon: './assets/skills/mobs/bear-dad/daddy-bear-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 58,
    baseMaxDamage: 75,
    sound: 'melee',
    description: 'Devastating giant bear swipe crushing prey.'
  },
  bear_dad_roar: {
    id: 'bear_dad_roar',
    name: 'Earthquake Roar',
    icon: './assets/skills/mobs/bear-dad/daddy-bear-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: true,
    targetType: 'enemy',
    areaType: 'single',
    pushDistance: 1,
    baseMinDamage: 40,
    baseMaxDamage: 52,
    sound: 'push',
    description: 'Colossal bellow knocking back 1 tile causing a tremor.'
  },
  bear_dad_shield: {
    id: 'bear_dad_shield',
    name: 'Paternal Protection',
    icon: './assets/skills/mobs/bear-dad/tool-chimerapapaprotection-02-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 70,
    sound: 'buff',
    description: 'Deploys a protective barrier granting +70 shield.'
  },
  bear_dad_slam: {
    id: 'bear_dad_slam',
    name: 'Titanic Bash',
    icon: './assets/skills/mobs/bear-dad/daddy-bear-04-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 52,
    baseMaxDamage: 68,
    sound: 'melee',
    description: 'Unleashes full weight into a crushing blow.'
  },

  // === ALIASES FOR LEGACY / ENCOUNTER TEMPLATES ===
  wolf_alpha_howl: {
    id: 'wolf_alpha_howl',
    name: 'Aullido Alfa',
    icon: './assets/skills/mobs/wolf-alpha/alpha-wolf-03-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'self',
    areaType: 'single',
    buffTargetPA: 1,
    buffTargetPM: 1,
    sound: 'buff',
    description: 'Aullido intimidante que otorga +1 PA y +1 PM.'
  },
  dryad_mage_orb: {
    id: 'dryad_mage_orb',
    name: 'Orbe Arcano',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-01-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 4,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 38,
    baseMaxDamage: 52,
    sound: 'explosion',
    description: 'Proyectil mágico concentrado que inflige 38-52 de daño arcano a distancia.'
  },
  dryad_mage_blast: {
    id: 'dryad_mage_blast',
    name: 'Ráfaga de la Espesura',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-03-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 50,
    baseMaxDamage: 68,
    sound: 'explosion',
    description: 'Descarga devastadora de energía que inflige 50-68 de daño.'
  },
  dryad_mage_barrier: {
    id: 'dryad_mage_barrier',
    name: 'Barrera Silvestre',
    icon: './assets/skills/mobs/dryad-mage/dryad-mage-02-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'ally',
    areaType: 'single',
    shieldAmount: 45,
    sound: 'buff',
    description: 'Crea un escudo de corteza que otorga +45 de Escudo.'
  },
  treant_spore: {
    id: 'treant_spore',
    name: 'Esporas Tóxicas',
    icon: './assets/skills/mobs/treant-flower/flowering-treant-02-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 3,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 30,
    baseMaxDamage: 44,
    sound: 'explosion',
    description: 'Nube de esporas venenosas que infligen 30-44 de daño.'
  },
  treant_entangle: {
    id: 'treant_entangle',
    name: 'Enredo de Raíces',
    icon: './assets/skills/mobs/treant-flower/flowering-treant-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 35,
    baseMaxDamage: 48,
    sound: 'melee',
    description: 'Lanza raíces que atrapan al enemigo infligiendo 35-48 de daño.'
  },
  werewolf_crush: {
    id: 'werewolf_crush',
    name: 'Aplastamiento Feral',
    icon: './assets/skills/mobs/werewolf-boss/werewolf-01-00.png',
    paCost: 4,
    minRange: 1,
    maxRange: 1,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 55,
    baseMaxDamage: 75,
    sound: 'melee',
    description: 'Golpe demoledor cuerpo a cuerpo con 55-75 de daño.'
  },
  werewolf_slam: {
    id: 'werewolf_slam',
    name: 'Embate de Hielo',
    icon: './assets/skills/mobs/werewolf-boss/werewolf-03-00.png',
    paCost: 3,
    minRange: 1,
    maxRange: 2,
    requiresLoS: true,
    isLinear: false,
    targetType: 'enemy',
    areaType: 'single',
    baseMinDamage: 42,
    baseMaxDamage: 58,
    sound: 'melee',
    description: 'Embate brutal que inflige 42-58 de daño glacial.'
  },
  werewolf_roar: {
    id: 'werewolf_roar',
    name: 'Rugido Cataclísmico',
    icon: './assets/skills/mobs/werewolf-boss/tool-chimerafragilebeing-02-00.png',
    paCost: 2,
    minRange: 0,
    maxRange: 0,
    requiresLoS: false,
    isLinear: false,
    targetType: 'self',
    areaType: 'single',
    shieldAmount: 50,
    buffTargetPA: 1,
    sound: 'buff',
    description: 'Rugido ensordecedor que otorga +50 de Escudo y +1 PA.'
  }
};
// Nombres y descripciones en el idioma activo (i18n/*/spells.js, claves spells.<id>.name / .description)
i18n.applyText(SPELLS_DB, 'spells', ['name', 'description']);

// Fase 4: las 235 cartas de partes de Axie forman parte del catálogo de hechizos (ids part_<clase>_<parte>_<nombre>)
Object.assign(SPELLS_DB, PART_SPELLS, STARTER_SPELLS, COLLECTION_SPELLS);
// Cartas variantes (parte de colección con su nombre, partes de nivel 2): se añaden al resolver cada Axie
onVariantRegistered((id, spell) => { SPELLS_DB[id] = spell; });
applyEnemySpellEffects(SPELLS_DB); // Fase 5: los enemigos usan estados (veneno, provocación, sangrado…)

/**
 * Hito 97 · recarga y usos por turno / por objetivo de las habilidades del Sapidae y de los enemigos fuertes.
 * cooldown: turnos propios sin poder usarla tras lanzarla · initialCooldown: espera al empezar el combate ·
 * castsPerTurn / castsPerTarget: usos por turno / sobre la misma unidad. (Cartas de Axie: reglas en PartCards.js.)
 */
export const SPELL_USE_LIMITS = {
  // Alfarero de Gólems
  craft_sentinel_golem: { cooldown: 3 },
  craft_stone_veins: { castsPerTarget: 1 },
  craft_clay_wall: { cooldown: 2 },
  craft_carry_wounded: { cooldown: 2 },
  craft_fortify: { cooldown: 2 },
  // Comandante de Sombrero
  shepard_hat_golem: { cooldown: 3 },
  shepard_translate_warning: { cooldown: 1 },
  shepard_shared_order: { cooldown: 1 },
  shepard_guided_retreat: { castsPerTarget: 1 },
  shepard_relief: { cooldown: 2 },
  // Guardián de Campanas
  lunalogist_bell_golem: { cooldown: 3 },
  lunalogist_mourning_tone: { castsPerTarget: 1 },
  lunalogist_warning_whisper: { castsPerTarget: 1 },
  lunalogist_purify: { cooldown: 1 },
  lunalogist_blood_moon: { cooldown: 4, initialCooldown: 1 },
  // Rastreador Gogo
  stargazer_shell_golem: { cooldown: 3 },
  stargazer_petrasense: { cooldown: 1, castsPerTarget: 1 },
  stargazer_corrupt_rift: { cooldown: 2 },
  stargazer_dawn_spiral: { cooldown: 2 },
  // Enemigos: solo sus golpes fuertes, áreas, provocaciones, curas y barreras (los ataques básicos, sin recarga)
  werewolf_boss_cataclysm: { cooldown: 3, initialCooldown: 1 },
  werewolf_boss_roar: { cooldown: 2 },
  werewolf_crush: { cooldown: 2 },
  werewolf_roar: { cooldown: 2 },
  bear_mom_slam: { cooldown: 2 },
  bear_mom_roar: { cooldown: 2 },
  bear_dad_slam: { cooldown: 2 },
  bear_dad_roar: { cooldown: 2 },
  bear_dad_shield: { cooldown: 2 },
  dryad_mage_blast: { cooldown: 2 },
  dryad_mage_burst: { cooldown: 2 },
  dryad_mage_heal: { cooldown: 2 },
  dryad_mage_barrier: { cooldown: 2 },
  dryad_range_root: { cooldown: 2 },
  wolf_alpha_nova: { cooldown: 2 },
  wolf_alpha_roar: { cooldown: 2 },
  wolf_alpha_howl: { cooldown: 2 },
  wolf_aquatic_alpha_roar: { cooldown: 2 },
  chimera_frost_nova: { cooldown: 2 },
  chimera_bellow: { cooldown: 2 },
  chimera_heal: { cooldown: 2 },
  treant_flower_nova: { cooldown: 2 },
  slime_fusion_burst: { cooldown: 2 },
  slime_barrier: { cooldown: 2 },
  slime_defense_barrier: { cooldown: 2 },
  slime_support_heal: { cooldown: 2 },
};
for (const [id, lim] of Object.entries(SPELL_USE_LIMITS)) if (SPELLS_DB[id]) Object.assign(SPELLS_DB[id], lim);

export class SpellManager {
  constructor(gridManager, sceneManager, audio, combatText, game = null) {
    this.gridManager = gridManager;
    this.sceneManager = sceneManager;
    this.audio = audio;
    this.combatText = combatText;
    this.game = game;
    this.vfx = new VFXManager(this.sceneManager.scene, this.gridManager);

    // Bus de eventos: la lógica anuncia, la presentación (VFX, sonido, textos) escucha.
    this.events = new CombatEvents();
    this.presentation = new SpellPresentation({
      sceneManager: this.sceneManager,
      gridManager: this.gridManager,
      audio: this.audio,
      combatText: this.combatText,
      vfx: this.vfx,
    }).install(this.events);

    // Azar de las reglas (daño, curas, críticos). Separado del azar de los VFX para que los
    // efectos visuales nunca cambien el resultado de un combate; se puede sembrar para pruebas.
    this.rng = () => Math.random();

    // Ganchos de reglas (tutorial, y más adelante runas/charms)
    this.hooks = { critAllowed: [], adjustDamage: [] };
    registerTutorialHooks(this);

    // Fase 1: estados alterados, objetos temporales del tablero y efectos descritos como datos
    this.statuses = new StatusSystem({ events: this.events, gridManager: this.gridManager });
    this.field = new BattlefieldObjects({ gridManager: this.gridManager, events: this.events });
    this.effects = new EffectResolver(this);
    // Fase 3: Duo Ultimates (vínculo al 100 %, 6 PA, ronda ≥ 2, un uso)
    this.ultimates = new UltimateSystem(this);
    // Runas y charms de los Axies del jugador (RuneCharmEffects.js): estadísticas, cartas modificadas y ganchos de reglas
    this.runeCharms = new RuneCharmSystem(this);
    // Hito 95: gólems de arcilla espiritual del Sapidae (sin turno propio; pulso al final del turno de su dueño)
    this.golems = new GolemSystem(this);
    this.field.onStableGround = (unit, owner) => this.golems.applyStableGround(unit, owner);
    // Triángulo elemental (±15 %). Se puede apagar para pruebas: sm.elementalEnabled = false
    this.elementalEnabled = true;
  }

  /** Conecta el ciclo de turnos con estados y objetos temporales. */
  bindTurnManager(tm) {
    this.turnManager = tm;
    tm.onCombatStart = () => {
      this.field.reset();
      this.golems.reset();
      this.presentation.clearZoneDecals?.(); // Hito 95: marcas de zona del combate anterior
      this.ultimates.used = false;
      for (const u of tm.units || []) { u.statuses = []; this.resetCooldowns(u); }
      this.runeCharms.onCombatStart(tm.units || []);
    };
    tm.onRoundStart = (round) => {
      this.field.onRoundStart(round);
      this.runeCharms.onRoundStart(round);
    };
    tm.onUnitTurnStart = (unit) => {
      unit._castsThisTurn = {}; // Fase 5: usos por turno (castsPerTurn)
      unit._castsOnTarget = {}; // Hito 97: usos por objetivo y turno (castsPerTarget)
      unit._turnNo = (unit._turnNo || 0) + 1; // Hito 97: turnos propios (recargas)
      this._announceReady(unit);
      this.syncOccupancy(); // Fase 5: cada casilla apunta a la unidad viva que está de verdad en ella
      this.field.onTurnStart(unit);
      this.golems.onUnitTurnStart(unit); // Hito 95: tierra estable del Gólem Caparazón
      this.runeCharms.turnStartPre(unit);
      const result = this.statuses.onTurnStart(unit);
      this.runeCharms.turnStartPost(unit, result);
      return result;
    };
    tm.onUnitTurnEnd = (unit) => {
      this.runeCharms.turnEnd(unit); // antes de que caduquen estados y escudos
      this.statuses.onTurnEnd(unit);
      // Escudos de habilidades: caducan al final del turno del receptor en la ronda siguiente a recibirlos
      if (unit.shieldExpiresRound != null && this.field.round >= unit.shieldExpiresRound) {
        unit.shield = 0;
        unit.shieldExpiresRound = null;
        unit.updateHUD?.();
      }
      this.golems.onOwnerTurnEnd(unit); // Hito 95: pulso de su gólem
    };
  }

  _shieldExpiry() { return (this.field?.round || 1) + 1; }

  /**
   * Da escudo a una unidad. El escudo dura hasta el final del turno del receptor en la ronda
   * siguiente: así un escudo propio protege durante los turnos enemigos y uno dado a un aliado
   * no se pierde antes de que le ataquen.
   */
  _grantShield(unit, amount) {
    unit.shield = (unit.shield || 0) + amount;
    unit.shieldExpiresRound = this._shieldExpiry();
    return amount;
  }

  /** Unidad activa del turno (null fuera de combate o en pruebas sin TurnManager). */
  _activeUnit() {
    return this.turnManager?.getActiveUnit?.() || null;
  }

  /**
   * Hito 95 · casilla desde la que se mide el alcance: la del lanzador o, con spell.rangeFrom === 'golem', la de su
   * gólem (Marcha del Caparazón). Sin gólem en pie, la carta no tiene casillas.
   */
  _castOrigin(caster, spell) {
    if (spell?.rangeFrom === 'golem') {
      const g = this.golems.golemOf(caster);
      return g ? { x: g.gridX, z: g.gridZ } : null;
    }
    return { x: caster.gridX, z: caster.gridZ };
  }

  /**
   * Hito 95 · ¿sirve esta unidad como objetivo aliado de la carta?
   *   allyFilter: 'companion' (Axie: ni Sapidae ni gólem ni el lanzador) · 'living' (cualquier aliado salvo gólems) ·
   *               'otherLiving' (como 'living', sin el lanzador) ·
   *               'golem' (solo el gólem del lanzador) · 'notSelf' (cualquier aliado salvo el lanzador) · sin filtro: cualquiera.
   */
  _allyMatches(caster, spell, u) {
    if (!u || u.isDead || u.team !== caster.team) return false;
    switch (spell.allyFilter) {
      case 'companion': return u !== caster && u.type !== 'sapidae' && !u.isGolem;
      case 'living': return !u.isGolem;
      case 'otherLiving': return u !== caster && !u.isGolem;
      case 'golem': return Boolean(u.isGolem) && u.owner === caster;
      case 'notSelf': return u !== caster;
      default: return true;
    }
  }

  /** Provocación: estado Provocación o Centinela de Vasija al lado del atacante (Hito 95). */
  isTauntingFor(unit, attacker) {
    if (!unit || unit.isDead) return false;
    if (unit.statuses?.length && this.statuses.has(unit, 'taunt')) return true;
    return this.golems.tauntsAgainst(unit, attacker);
  }

  /** ¿El hechizo hace daño? (campos antiguos o lista de efectos) */
  isDamageSpell(spell) {
    if (!spell) return false;
    if (spell.baseMinDamage) return true;
    return Array.isArray(spell.effects) && spell.effects.some((e) => e.type === 'damage');
  }

  /** Alcance máximo efectivo: los estados de alcance solo afectan a hechizos de alcance > 1. */
  getEffectiveMaxRange(caster, spell) {
    const base = spell.maxRange;
    if (base <= 1 || spell.fixedRange) return base;
    const mod = this.statuses.mod(caster, 'range');
    return Math.max(spell.minRange, 1, base + mod);
  }

  /** Alias usado por Unit.dieCinematic para el remate cinemático del último enemigo. */
  get vfxManager() { return this.vfx; }

  /**
   * Hechizo por id. Con `unit`, devuelve la carta tal como la lanza esa unidad: si un charm la modifica
   * (daño, alcance, coste…), su copia (mismo id). Sin unidad, la carta base del catálogo.
   */
  getSpell(spellId, unit = null) {
    if (!spellId) return null;
    const base = SPELLS_DB[spellId] || SPELLS_DB.chimera_bite || null;
    return unit ? this.runeCharms.spellFor(unit, base) : base;
  }

  /** Coste en PA que pagará la unidad por la carta (descuentos de charms y runas incluidos). */
  getSpellCost(caster, spell) {
    if (!spell) return 0;
    return this.runeCharms.costOf(caster, this.runeCharms.spellFor(caster, spell));
  }

  /**
   * Hito 65 · alcance para DIBUJAR (estilo Dofus): todas las casillas a tiro, haya o no unidades.
   *   range   → a tiro (distancia, línea recta si la pide, casilla usable y con línea de visión)
   *   blocked → dentro de la distancia pero sin línea de visión (tapadas por un obstáculo)
   * No decide nada: dónde se puede lanzar lo sigue diciendo getValidTargetCells (mismas reglas + unidad).
   */
  getRangeCells(caster, spell) {
    const out = { range: [], blocked: [] };
    if (!caster || !spell) return out;
    if (spell.isUltimate && !this.ultimates.canCast(caster)) return out;
    if (this.isDamageSpell(spell) && caster.statuses?.length && this.statuses.isFeared(caster)) return out;
    if (this.castBlockReason(caster, spell)) return out; // usos del turno agotados o en recarga (Hito 97)
    const origin = this._castOrigin(caster, spell);
    if (!origin) return out;
    const fromX = origin.x, fromZ = origin.z;
    if (spell.targetType === 'self') { out.range.push({ x: fromX, z: fromZ }); return out; }
    const maxRange = caster.statuses?.length ? this.getEffectiveMaxRange(caster, spell) : spell.maxRange;
    for (let x = 0; x < this.gridManager.width; x++) {
      for (let z = 0; z < this.gridManager.height; z++) {
        const dist = Math.abs(x - fromX) + Math.abs(z - fromZ);
        if (dist < spell.minRange || dist > maxRange) continue;
        if (spell.isLinear && (x !== fromX && z !== fromZ)) continue;
        const tile = this.gridManager.getTile(x, z);
        if (!tile || tile.obstacle || tile.baseWalkable === false) continue;
        if (spell.requiresLoS && !this.gridManager.hasLineOfSight({ x: fromX, z: fromZ }, { x, z })) out.blocked.push({ x, z });
        else out.range.push({ x, z });
      }
    }
    // Hito 95 · Gólem Sombrero: las órdenes llegan también a las casillas cercanas al gólem
    if (spell.relay) {
      for (const c of this.golems.relayCells(caster)) {
        const tile = this.gridManager.getTile(c.x, c.z);
        if (!tile || tile.obstacle || tile.baseWalkable === false) continue;
        out.blocked = out.blocked.filter((b) => b.x !== c.x || b.z !== c.z);
        if (!out.range.some((r) => r.x === c.x && r.z === c.z)) out.range.push(c);
      }
    }
    return out;
  }

  getValidTargetCells(caster, spell) {
    const validCells = [];
    const origin = this._castOrigin(caster, spell);
    if (!origin) return validCells; // Hito 95: carta que se lanza desde el gólem y no hay gólem
    const fromX = origin.x;
    const fromZ = origin.z;
    const isDamage = this.isDamageSpell(spell);

    // Ultimate: solo si se cumplen todas sus condiciones
    if (spell.isUltimate && !this.ultimates.canCast(caster)) return validCells;

    // Miedo: no puede usar hechizos de daño
    if (isDamage && caster.statuses?.length && this.statuses.isFeared(caster)) return validCells;
    // Usos por turno agotados o en recarga (Hito 97)
    if (this.castBlockReason(caster, spell)) return validCells;
    const maxRange = caster.statuses?.length ? this.getEffectiveMaxRange(caster, spell) : spell.maxRange;

    for (let x = 0; x < this.gridManager.width; x++) {
      for (let z = 0; z < this.gridManager.height; z++) {
        const dist = Math.abs(x - fromX) + Math.abs(z - fromZ);
        if (dist < spell.minRange || dist > maxRange) continue;

        if (spell.isLinear && (x !== fromX && z !== fromZ)) continue;

        if (spell.requiresLoS && !this.gridManager.hasLineOfSight({ x: fromX, z: fromZ }, { x, z })) {
          continue;
        }

        const tile = this.gridManager.getTile(x, z);
        // Casillas inutilizables: fuera del tablero, con obstáculo (roca, árbol, barricada…) o con agua.
        // Ninguna habilidad se puede lanzar sobre ellas (sí se puede ver y disparar por encima del agua).
        if (!tile || tile.obstacle || tile.baseWalkable === false) continue;

        if (spell.targetType === 'empty') {
          if (!tile || !tile.walkable || tile.obstacle || tile.unit) continue;
        } else if (spell.targetType === 'self') {
          if (x !== fromX || z !== fromZ) continue;
        } else if (spell.targetType === 'enemy') {
          // Fuego amigo (18-oct): un ataque se puede lanzar sobre cualquier unidad (también un aliado), salvo uno mismo
          if (!tile || !tile.unit || tile.unit === caster) continue;
        } else if (spell.targetType === 'ally') {
          // Hito 95: filtros de aliado ('companion', 'living', 'golem', 'notSelf'), ver _allyMatches
          if (!tile || !this._allyMatches(caster, spell, tile.unit)) continue;
        }
        // Hito 97: usos por objetivo y turno agotados sobre esa unidad
        if (spell.castsPerTarget && tile?.unit && this.targetLimitReached(caster, spell, tile.unit)) continue;

        validCells.push({ x, z });
      }
    }

    // Hito 95 · Gólem Sombrero: las órdenes (spell.relay) llegan a los aliados cercanos al gólem, estén donde estén
    if (spell.relay && spell.targetType === 'ally') {
      for (const c of this.golems.relayCells(caster)) {
        const u = this.gridManager.getTile(c.x, c.z)?.unit;
        if (!this._allyMatches(caster, spell, u)) continue;
        if (spell.castsPerTarget && this.targetLimitReached(caster, spell, u)) continue;
        if (!validCells.some((v) => v.x === c.x && v.z === c.z)) validCells.push(c);
      }
    }

    // Provocación: si un enemigo provocador está al alcance, los hechizos de daño solo pueden apuntarle a él
    // (Hito 95: también el Centinela de Vasija para los enemigos que tiene al lado)
    if (isDamage && spell.targetType === 'enemy') {
      const taunting = validCells.filter((c) => {
        const u = this.gridManager.getTile(c.x, c.z)?.unit;
        return u && u.team !== caster.team && this.isTauntingFor(u, caster);
      });
      if (taunting.length) return taunting;
    }
    return validCells;
  }

  /**
   * Casillas afectadas. Áreas: single · cross1 · cross2 · circle1/2/3 (rombo de radio N) ·
   * box2x2 (objetivo + derecha/abajo) · box3x3 · line2/line3 (desde el lanzador en la dirección del objetivo) · allEnemies · allAllies
   */
  getAoECells(targetCell, spell, caster = null) {
    const cells = [{ x: targetCell.x, z: targetCell.z }];
    const area = spell.areaType || 'single';
    const push = (x, z) => {
      if (this.gridManager.isValidCoord(x, z) && !cells.some((c) => c.x === x && c.z === z)) cells.push({ x, z });
    };

    if (area === 'cross1' || area === 'cross2') {
      const r = area === 'cross1' ? 1 : 2;
      for (let d = 1; d <= r; d++) {
        push(targetCell.x + d, targetCell.z);
        push(targetCell.x - d, targetCell.z);
        push(targetCell.x, targetCell.z + d);
        push(targetCell.x, targetCell.z - d);
      }
    } else if (/^circle[123]$/.test(area)) {
      const r = Number(area.slice(6));
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) <= r) push(targetCell.x + dx, targetCell.z + dz);
        }
      }
    } else if (area === 'box2x2') {
      push(targetCell.x + 1, targetCell.z);
      push(targetCell.x, targetCell.z + 1);
      push(targetCell.x + 1, targetCell.z + 1);
    } else if (area === 'box3x3') {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) push(targetCell.x + dx, targetCell.z + dz);
    } else if ((area === 'line2' || area === 'line3') && caster) {
      const n = Number(area.slice(4));
      const dx = Math.sign(targetCell.x - caster.gridX);
      const dz = Math.sign(targetCell.z - caster.gridZ);
      if (dx === 0 || dz === 0) {
        for (let i = 1; i < n; i++) push(targetCell.x + dx * i, targetCell.z + dz * i);
      }
    } else if ((area === 'allEnemies' || area === 'allAllies') && caster) {
      const wantEnemy = area === 'allEnemies';
      for (const u of this.game?.units || []) {
        if (u.isDead) continue;
        if ((u.team !== caster.team) === wantEnemy) push(u.gridX, u.gridZ);
      }
    }
    return cells;
  }

  // ------------------------------------------------------------------ pipeline

  /**
   * Lanza un hechizo: validar → pagar coste → resolver objetivos → aplicar efectos.
   * Cada paso anuncia un evento en this.events; los efectos visuales viven en SpellPresentation.
   * Devuelve false si no se pudo lanzar (sin PA suficientes).
   */
  async castSpell(caster, spell, targetCell) {
    spell = this.runeCharms.spellFor(caster, spell); // carta con los charms de la unidad (si los tiene)
    if (spell.isUltimate && !this.ultimates.canCast(caster)) return false;
    if (!this._canPay(caster, spell)) return false;
    if (spell.castsPerTarget && this.targetLimitReached(caster, spell, this.gridManager.getTile(targetCell.x, targetCell.z)?.unit)) return false;
    const spent = this._payCost(caster, spell);
    this._recordCast(caster, spell, targetCell); // Hito 97: recarga y usos por objetivo

    const ctx = {
      caster,
      spell,
      spent,
      targetCell,
      casterPos: this.gridManager.gridToWorld(caster.gridX, caster.gridZ),
      targetPos: this.gridManager.gridToWorld(targetCell.x, targetCell.z),
    };
    this.runeCharms.onCast(ctx);
    this.events.emit('spell:cast', ctx);

    // Mecánicas especiales de las clases de Sapidae
    if (spell.isBarricade) {
      this._resolveBarricade(ctx);
      return true;
    }
    if (spell.isTranspose && this._resolveTranspose(ctx)) {
      return true;
    }
    if (spell.isPackHowl) {
      this._resolvePackHowl(ctx);
      return true;
    }
    if (spell.targetType === 'empty' && !Array.isArray(spell.effects)) {
      await this._executeJump(caster, spell, targetCell);
      return true;
    }

    // Hechizo normal: animación, proyectil (si es a distancia) e impacto
    this.events.emit('spell:windup', ctx);
    if (ctx.vfx && ctx.vfx.untilImpact) {
      // Fase 6: la carta tiene efecto del motor de VFX; el daño se aplica en su fotograma de impacto
      await ctx.vfx.untilImpact;
    } else if (this._isRangedCast(ctx)) {
      const travel = this.events.emitAsync('spell:projectile', ctx);
      if (travel) await travel;
    }
    ctx.affectedCells = this.getAoECells(targetCell, spell, caster);
    this.events.emit('spell:impact', ctx);

    // Habilidades nuevas: lista de efectos
    if (Array.isArray(spell.effects)) {
      await this.effects.run(ctx);
      this.runeCharms.onResolved(ctx);
      this.events.emit('spell:resolved', ctx);
      return true;
    }

    for (const cell of ctx.affectedCells) {
      const tile = this.gridManager.getTile(cell.x, cell.z);
      if (!tile) continue;
      await this._applyEffects(ctx, tile.unit);
    }

    this.runeCharms.onResolved(ctx);
    this.events.emit('spell:resolved', ctx);
    return true;
  }

  /**
   * Fase 5: reconstruye tile.unit a partir de las posiciones reales de las unidades vivas.
   * Evita que una referencia perdida deje «libre» la casilla de alguien (y que otra unidad termine encima).
   */
  syncOccupancy() {
    const grid = this.gridManager;
    const units = this.game?.units || this.turnManager?.units || [];
    if (!grid || !units.length) return 0;
    let fixed = 0;
    for (let x = 0; x < grid.width; x++) {
      for (let z = 0; z < grid.height; z++) {
        const t = grid.getTile(x, z);
        const u = t?.unit;
        if (u && (u.isDead || u.gridX !== x || u.gridZ !== z)) { t.unit = null; fixed++; }
      }
    }
    for (const u of units) {
      if (u.isDead) continue;
      const t = grid.getTile(u.gridX, u.gridZ);
      if (t && t.unit !== u) { if (!t.unit) fixed++; t.unit = t.unit || u; }
    }
    return fixed;
  }

  /** Fase 5: ¿ha agotado esta carta sus usos del turno? (castsPerTurn; las que dan PA/PM, 1 por turno) */
  castLimitReached(caster, spell) {
    return Boolean(spell?.castsPerTurn) && ((caster?._castsThisTurn?.[spell.id]) || 0) >= spell.castsPerTurn;
  }

  // ------------------------------------------------------------------ Hito 97 · recarga y usos por objetivo
  //
  // · spell.cooldown = N: tras usarla, no se puede en los N turnos siguientes de quien la lanzó (vuelve en el N+1).
  //   Se cuentan los turnos propios (unit._turnNo), también los perdidos por aturdir o dormir, como los estados.
  // · spell.initialCooldown = N: al empezar el combate no se puede hasta el turno N+1 de la unidad.
  // · spell.castsPerTarget = N: usos por turno sobre una misma unidad (el objetivo principal de la carta).
  // · Las recargas duran solo el combate. Runas y charms pueden cambiarla con runeCharms.cooldownOf (si existe).

  /** Recarga de la carta para esta unidad (turnos), con runas y charms. */
  cooldownOf(caster, spell) {
    const base = Math.max(0, Number(spell?.cooldown) || 0);
    const mod = this.runeCharms?.cooldownOf?.(caster, spell, base);
    return Math.max(0, Number.isFinite(mod) ? mod : base);
  }

  /** Turno propio (unit._turnNo) en el que la carta vuelve a estar lista. */
  _readyTurn(caster, spell) {
    const r = caster?._spellReady?.[spell.id];
    if (r != null) return r;
    const init = Math.max(0, Number(spell?.initialCooldown) || 0);
    return init ? init + 1 : 0;
  }

  /** Turnos que faltan para poder usarla (0 = lista). Durante su turno: con recarga 2, «2» justo tras usarla. */
  cooldownLeft(caster, spell) {
    if (!caster || !spell) return 0;
    const ready = this._readyTurn(caster, spell);
    const now = caster._turnNo || 0;
    if (ready <= now) return 0;
    const cap = Math.max(this.cooldownOf(caster, spell), Number(spell.initialCooldown) || 0, 1);
    return Math.min(cap, ready - Math.max(now, 1));
  }

  isOnCooldown(caster, spell) { return this.cooldownLeft(caster, spell) > 0; }

  /** Recargas a cero (inicio de combate, arena de pruebas). */
  resetCooldowns(unit) {
    if (!unit) return;
    unit._turnNo = 0;
    unit._spellReady = {};
    unit._castsThisTurn = {};
    unit._castsOnTarget = {};
    unit._cdAnnounced = {};
  }

  /** ¿Se agotaron los usos de la carta sobre esta unidad en este turno? */
  targetLimitReached(caster, spell, target) {
    if (!spell?.castsPerTarget || !target) return false;
    return ((caster?._castsOnTarget?.[spell.id]?.get?.(target)) || 0) >= spell.castsPerTarget;
  }

  /** Hito 98: nivel del héroe con el que se desbloquea la carta (1 si no es un héroe del jugador). */
  unlockLevel(caster, spell) { return unitUnlockLevel(caster, spell); }
  isLocked(caster, spell) { return isLockedFor(caster, spell); }

  /** Motivo por el que la carta no se puede usar ahora (sin mirar PA ni objetivo): 'locked' | 'spent' | 'cooldown' | null. */
  castBlockReason(caster, spell) {
    if (isLockedFor(caster, spell)) return 'locked'; // Hito 98: aún no desbloqueada por nivel
    if (this.castLimitReached(caster, spell)) return 'spent';
    if (this.isOnCooldown(caster, spell)) return 'cooldown';
    return null;
  }

  /** Una sola respuesta para la interfaz, la IA y el tutorial: ¿se puede lanzar ya (PA, usos, recarga, gólem…)? */
  canCastNow(caster, spell) {
    if (!caster || !spell || caster.isDead) return false;
    spell = this.runeCharms.spellFor(caster, spell);
    if (spell.isUltimate && !this.ultimates.canCast(caster)) return false;
    if (!this._canPay(caster, spell)) return false;
    if (!this._castOrigin(caster, spell)) return false;
    return true;
  }

  _recordCast(caster, spell, targetCell) {
    const cd = this.cooldownOf(caster, spell);
    if (cd > 0) {
      (caster._spellReady ||= {})[spell.id] = (caster._turnNo || 0) + cd + 1;
      if (caster._cdAnnounced) delete caster._cdAnnounced[spell.id];
      this.events.emit('spell:cooldown', { unit: caster, spell, turns: cd });
    }
    if (spell.castsPerTarget && targetCell) {
      const target = this.gridManager.getTile(targetCell.x, targetCell.z)?.unit;
      if (target) {
        const m = ((caster._castsOnTarget ||= {})[spell.id] ||= new Map());
        m.set(target, (m.get(target) || 0) + 1);
      }
    }
  }

  /** Al empezar el turno: avisa de las cartas que vuelven a estar listas (destello en la carta). */
  _announceReady(unit) {
    const ready = unit?._spellReady;
    if (!ready) return;
    for (const [id, turn] of Object.entries(ready)) {
      if (turn === unit._turnNo && !unit._cdAnnounced?.[id]) {
        (unit._cdAnnounced ||= {})[id] = true;
        this.events.emit('spell:ready', { unit, spellId: id });
      }
    }
  }

  _canPay(caster, spell) {
    if (this.castBlockReason(caster, spell)) return false;
    if (spell.paCost === 'X') return caster.currentPA >= 1; // coste X: gasta todos los PA que queden
    return caster.currentPA >= this.runeCharms.costOf(caster, spell);
  }

  /** Paga el coste y devuelve los PA gastados (para cartas de coste X). */
  _payCost(caster, spell) {
    const cost = spell.paCost === 'X' ? caster.currentPA : this.runeCharms.costOf(caster, spell);
    this.runeCharms.onPaid(caster, spell);
    caster.currentPA -= cost;
    if (spell.castsPerTurn) (caster._castsThisTurn ||= {})[spell.id] = ((caster._castsThisTurn[spell.id]) || 0) + 1;
    caster.updateHUD();
    return cost;
  }

  /** ¿El hechizo viaja como proyectil? (heurística histórica por id y alcance) */
  _isRangedCast({ caster, spell, targetCell }) {
    const dist = Math.abs(targetCell.x - caster.gridX) + Math.abs(targetCell.z - caster.gridZ);
    return dist > 1 || spell.maxRange > 1 || spell.id.includes('bow') || spell.id.includes('cupid') || spell.id.includes('owl') || spell.id.includes('spit') || spell.id.includes('explosive') || spell.id.includes('slow') || spell.id.includes('heal') || spell.id.includes('stim') || spell.id.includes('bramble') || spell.id.includes('bellow') || (spell.targetType === 'ally' && spell.maxRange > 0);
  }

  _resolveBarricade({ caster, spell, targetCell }) {
    this.gridManager.setObstacle(targetCell.x, targetCell.z, 'wood_post');
    const pos = this.gridManager.gridToWorld(targetCell.x, targetCell.z);
    this.events.emit('spell:barricade', { caster, spell, cell: targetCell, pos });
    if (spell.shieldAmount && caster) {
      this._grantShield(caster, spell.shieldAmount);
      caster.updateHUD();
      this.events.emit('unit:shielded', { unit: caster, source: caster, spell, amount: spell.shieldAmount });
    }
  }

  /** Intercambia posiciones con la unidad objetivo. Devuelve false si no hay unidad válida. */
  _resolveTranspose({ caster, spell, targetCell }) {
    const tileTarget = this.gridManager.getTile(targetCell.x, targetCell.z);
    const targetUnit = tileTarget ? tileTarget.unit : null;
    if (!targetUnit || targetUnit === caster) return false;

    const tileCaster = this.gridManager.getTile(caster.gridX, caster.gridZ);
    const origCx = caster.gridX;
    const origCz = caster.gridZ;
    const origTx = targetUnit.gridX;
    const origTz = targetUnit.gridZ;

    tileCaster.unit = targetUnit;
    tileTarget.unit = caster;

    caster.gridX = origTx;
    caster.gridZ = origTz;
    targetUnit.gridX = origCx;
    targetUnit.gridZ = origCz;

    caster.updateWorldPosition();
    targetUnit.updateWorldPosition();
    caster.updateHUD();
    targetUnit.updateHUD();

    if (spell.shieldAmount) {
      this._grantShield(caster, spell.shieldAmount);
      this._grantShield(targetUnit, spell.shieldAmount);
    }

    this.events.emit('spell:transpose', {
      caster,
      target: targetUnit,
      spell,
      casterPos: this.gridManager.gridToWorld(caster.gridX, caster.gridZ),
      targetPos: this.gridManager.gridToWorld(targetUnit.gridX, targetUnit.gridZ),
    });
    return true;
  }

  _resolvePackHowl({ caster, spell }) {
    if (this.game && this.game.units) {
      this.game.units.filter(u => u.team === caster.team && !u.isDead).forEach(ally => {
        const d = Math.abs(ally.gridX - caster.gridX) + Math.abs(ally.gridZ - caster.gridZ);
        if (d <= 2) {
          ally.currentPM = Math.min(ally.maxPM + 1, ally.currentPM + 1);
          ally.currentPA = Math.min(ally.maxPA + 1, ally.currentPA + 1);
          ally.updateHUD();
          this.events.emit('unit:resourceGained', { unit: ally, source: caster, spell, pa: 1, pm: 1 });
        }
      });
    }
    this.events.emit('spell:aura', { caster, spell, casterPos: this.gridManager.gridToWorld(caster.gridX, caster.gridZ) });
  }

  /** Aplica todos los efectos del hechizo a una unidad de una casilla afectada (mismo orden que siempre). */
  async _applyEffects(ctx, targetUnit) {
    const { caster, spell } = ctx;

    if (spell.baseMinHeal && targetUnit) {
      const mult = this._getSpellMultiplier(caster, spell);
      let healAmt = Math.floor((spell.baseMinHeal + this.rng() * (spell.baseMaxHeal - spell.baseMinHeal + 1)) * mult);
      if (caster && caster.supportPower) {
        healAmt = Math.round(healAmt * (1 + caster.supportPower / 100));
      }
      this._heal(targetUnit, healAmt, caster, spell);
    }

    if (spell.buffPA && targetUnit) {
      targetUnit.buffs.push({ type: 'bonusPA', value: spell.buffPA, duration: 1 });
      this.events.emit('unit:resourceGained', { unit: targetUnit, source: caster, spell, pa: spell.buffPA });
    }

    if (spell.shieldAmount && targetUnit && spell.targetType === 'ally') {
      const mult = this._getSpellMultiplier(caster, spell);
      let sAmt = Math.round(spell.shieldAmount * mult);
      if (caster && caster.supportPower) {
        sAmt = Math.round(sAmt * (1 + caster.supportPower / 100));
      }
      this._grantShield(targetUnit, sAmt);
      targetUnit.updateHUD();
      this.events.emit('unit:shielded', { unit: targetUnit, source: caster, spell, amount: sAmt });
    }

    if (spell.buffTargetPM && targetUnit) {
      targetUnit.currentPM = Math.min(targetUnit.maxPM + 1, targetUnit.currentPM + spell.buffTargetPM);
      targetUnit.updateHUD();
      this.events.emit('unit:resourceGained', { unit: targetUnit, source: caster, spell, pm: spell.buffTargetPM });
    }

    if (spell.baseMinDamage && targetUnit) {
      const evDist = Math.abs(targetUnit.gridX - caster.gridX) + Math.abs(targetUnit.gridZ - caster.gridZ);
      if (caster && targetUnit !== caster && this.runeCharms.evade(ctx, targetUnit, evDist)) return; // esquiva (runas)
      const { dmg, isCrit } = this._computeDamage(ctx, targetUnit);

      this._dealDamage(ctx, targetUnit, dmg, { isCrit, elemental: ctx.lastElemental || 1 });

      if (spell.debuffPM) {
        targetUnit.buffs.push({ type: 'minusPM', value: spell.debuffPM, duration: 1 });
        this.events.emit('unit:resourceLost', { unit: targetUnit, source: caster, spell, pm: spell.debuffPM });
      }

      if (spell.debuffPA) {
        targetUnit.currentPA = Math.max(0, targetUnit.currentPA - spell.debuffPA);
        targetUnit.updateHUD();
        this.events.emit('unit:resourceLost', { unit: targetUnit, source: caster, spell, pa: spell.debuffPA });
      }

      if (spell.drainHeal && caster && !caster.isDead) {
        const multD = this._getSpellMultiplier(caster, spell);
        const healVal = Math.round(spell.drainHeal * multD);
        this._heal(caster, healVal, caster, spell);
      }

      if (spell.buffSelfPM && caster && !caster.isDead) {
        caster.currentPM = Math.min(caster.maxPM + 1, caster.currentPM + spell.buffSelfPM);
        caster.updateHUD();
        this.events.emit('unit:resourceGained', { unit: caster, source: caster, spell, pm: spell.buffSelfPM });
      }

      if (spell.pushDistance && !targetUnit.isDead) {
        await this._executePushback(caster, targetUnit, spell.pushDistance, spell);
      }
    }
  }

  /** Daño de un hechizo contra un objetivo: tirada, nivel de habilidad, bonus del lanzador, crítico y ganchos. */
  _computeDamage(ctx, targetUnit) {
    const { caster, spell } = ctx;
    const mult = this._getSpellMultiplier(caster, spell);
    let dmg = Math.floor((spell.baseMinDamage + this.rng() * (spell.baseMaxDamage - spell.baseMinDamage + 1)) * mult);
    if (caster) {
      if ((spell.id.startsWith('kotaro_') || spell.id.startsWith('plant_')) && caster.bonusMeleeDamage) {
        dmg += Math.round(caster.bonusMeleeDamage);
      } else if ((spell.id.startsWith('bing_') || spell.id.startsWith('bird_')) && caster.bonusRangedDamage) {
        dmg += Math.round(caster.bonusRangedDamage);
      } else if (spell.id.startsWith('pomodoro_') && caster.bonusMagicDamage) {
        dmg += Math.round(caster.bonusMagicDamage);
      } else if (caster.bonusDamage) {
        dmg += caster.bonusDamage;
      }
    }
    const dist0 = Math.abs(targetUnit.gridX - caster.gridX) + Math.abs(targetUnit.gridZ - caster.gridZ);
    if (caster) dmg += this.runeCharms.flatDamage(caster, spell, dist0); // Shellshock, Red Mirror

    const critAllowed = this.hooks.critAllowed.every((fn) => fn(ctx, targetUnit) !== false);
    const statusCrit = caster.statuses?.length ? this.statuses.mod(caster, 'critPct') : 0; // Gafe, Crítico +
    const critChance = ((caster.critRate > 0 ? caster.critRate : 20) + statusCrit) / 100; // critRate ya incluye el 20 % base
    const isCrit = critAllowed && (this.rng() < critChance);
    if (isCrit) {
      dmg = Math.round(dmg * this.runeCharms.critMultiplier(caster, targetUnit)); // ×1,5 (+ daño crítico de runas)
    }

    const dist = dist0;
    const mods = this._applyDamageModifiers(caster, targetUnit, dmg, dist, ctx);
    dmg = mods.amount;
    ctx.lastElemental = mods.elemental;

    for (const fn of this.hooks.adjustDamage) dmg = fn(ctx, targetUnit, dmg, isCrit);
    return { dmg, isCrit };
  }

  /**
   * Modificadores de daño de fase 1: triángulo elemental (±15 %) y estados
   * (Potenciado/Debilitado del atacante, Frágil/Protegido/Cobertura del defensor).
   * Si no hay ningún modificador el daño no se toca (ni se redondea).
   */
  _applyDamageModifiers(caster, target, dmg, dist = 1, ctx = null) {
    let elemental = 1;
    if (this.elementalEnabled && caster && target) elemental = elementalMultiplier(caster.axieClass, target.axieClass);
    let pct = 0;
    if (caster?.statuses?.length) pct += this.statuses.mod(caster, 'damageDealtPct');
    if (target?.statuses?.length) {
      pct += this.statuses.mod(target, 'damageTakenPct');
      if (dist > 1) pct += this.statuses.mod(target, 'rangedDamageTakenPct');
    }
    pct += this.runeCharms.damagePct(caster, target, dist, ctx); // runas y charms (atacante y defensor)
    if (this.golems) pct += this.golems.damageTakenPct(target);   // Hito 95: aliado al lado de un Centinela de Vasija
    const mult = elemental * (1 + pct / 100);
    if (mult === 1) return { amount: dmg, elemental };
    return { amount: Math.max(0, Math.round(dmg * mult)), elemental };
  }

  /**
   * Aplica daño ya calculado: escudo (con perforación opcional), evento y Espinas.
   * Devuelve el daño real a la vida.
   */
  _dealDamage(ctx, target, dmg, { isCrit = false, elemental = 1, pierceShield = 0, dist = null } = {}) {
    const { caster, spell } = ctx;

    // Lazo Simbiótico: la mitad del daño la recibe la pareja vinculada (si sigue viva)
    if (target.statuses?.length) {
      const link = this.statuses.get(target, 'soulLink');
      const partner = link?.partner;
      if (partner && partner !== target && !partner.isDead && dmg > 1) {
        const shared = Math.floor(dmg / 2);
        dmg -= shared;
        const pShield = partner.shield || 0;
        const pActual = partner.takeDamage(shared);
        this.events.emit('unit:damaged', { unit: partner, source: caster, spell, actual: pActual, shieldAbsorbed: Math.max(0, pShield - (partner.shield || 0)), isCrit: false, linked: true });
      }
    }

    // Desert Protector: un aliado adyacente con la runa recibe el 20 % del golpe
    dmg = this.runeCharms.redirect(ctx, target, dmg);

    // Barrera (Hermit, Snake Jar): anula el golpe hasta su valor
    if (target.statuses?.length && this.statuses.has(target, 'barrier')) dmg = this.statuses.absorbBarrier(target, dmg);

    const initialShield = target.shield || 0;
    const hitDist = dist ?? (caster ? Math.abs(target.gridX - caster.gridX) + Math.abs(target.gridZ - caster.gridZ) : 1);
    pierceShield = Math.max(pierceShield, this.runeCharms.pierce(caster, hitDist)); // Sharp Talon
    let actual;
    if (pierceShield > 0 && initialShield > 0) {
      const pierced = Math.round(dmg * Math.min(1, pierceShield));
      actual = target.takeDamage(dmg - pierced);
      if (!target.isDead && pierced > 0) {
        const keep = target.shield || 0;
        target.shield = 0;
        actual += target.takeDamage(pierced);
        if (!target.isDead) { target.shield = keep; target.updateHUD?.(); }
      }
    } else {
      actual = target.takeDamage(dmg);
    }
    const shieldAbsorbed = Math.max(0, initialShield - (target.shield || 0));
    const payload = { unit: target, source: caster, spell, actual, shieldAbsorbed, isCrit };
    if (elemental !== 1) payload.elemental = elemental;
    this.events.emit('unit:damaged', payload);

    // Reacciones del objetivo: guardas, represalia y reflejo (cartas de partes)
    if (caster && target !== caster && target.statuses?.length) {
      const d0 = dist ?? (Math.abs(target.gridX - caster.gridX) + Math.abs(target.gridZ - caster.gridZ));
      for (const r of this.statuses.onHit(target, caster, { taken: actual + shieldAbsorbed, dist: d0 })) {
        if (r.kind === 'damageAttacker' && r.amount > 0 && !caster.isDead) {
          const back = caster.takeDamage(r.amount);
          this.events.emit('unit:damaged', { unit: caster, source: target, spell: null, actual: back, shieldAbsorbed: 0, isCrit: false, plain: true, reflected: true });
        } else if (r.kind === 'shieldUnit' && r.amount > 0) {
          this._grantShield(r.unit, r.amount);
          r.unit.updateHUD?.();
          this.events.emit('unit:shielded', { unit: r.unit, source: target, spell: null, amount: r.amount });
        }
      }
    }

    // Espinas: devuelve daño plano al atacante cuerpo a cuerpo
    if (caster && target !== caster && target.statuses?.length && !caster.isDead) {
      const thorns = this.statuses.get(target, 'reflect');
      const d = dist ?? (Math.abs(target.gridX - caster.gridX) + Math.abs(target.gridZ - caster.gridZ));
      if (thorns && d <= 1 && thorns.value > 0) {
        const back = caster.takeDamage(thorns.value);
        this.events.emit('unit:damaged', { unit: caster, source: target, spell: null, actual: back, shieldAbsorbed: 0, isCrit: false, plain: true, reflected: true });
      }
    }

    // Runas y charms: robo de vida, estados al golpear, matar, críticos y contraataques
    this.runeCharms.afterHit(ctx, target, { actual, shieldAbsorbed, isCrit, dist: hitDist });
    return actual;
  }

  /** Cura respetando Herida (bloqueo de curación). Devuelve la vida realmente curada. */
  _heal(target, amount, source, spell) {
    if (target.statuses?.length && this.statuses.isHealBlocked(target)) {
      this.events.emit('unit:healBlocked', { unit: target, source, spell });
      return 0;
    }
    {
      const pct = (target.statuses?.length ? this.statuses.mod(target, 'healTakenPct') : 0) + this.runeCharms.healTakenPct(target);
      if (pct) amount = Math.round(amount * (1 + pct / 100));
    }
    const actual = target.heal(amount);
    this.events.emit('unit:healed', { unit: target, source, spell, amount: actual });
    return actual;
  }

  /** Teletransporte instantáneo a una casilla libre. */
  async _teleport(unit, cell, spell = null, { hop = false } = {}) {
    const dest = this.gridManager.getTile(cell.x, cell.z);
    if (!dest || dest.unit || dest.obstacle || dest.walkable === false) return false;
    const from = this.gridManager.getTile(unit.gridX, unit.gridZ);
    if (from && from.unit === unit) from.unit = null;
    dest.unit = unit;
    const pos = this.gridManager.gridToWorld(cell.x, cell.z);
    if (hop && typeof unit._hopToCell === 'function') {
      await unit._hopToCell(cell.x, cell.z, 0.45); // salto animado, como el Salto Astral de siempre
      unit.gridX = cell.x;
      unit.gridZ = cell.z;
      unit.updateHUD?.();
      this.events.emit('spell:landing', { caster: unit, spell, pos });
    } else {
      unit.gridX = cell.x;
      unit.gridZ = cell.z;
      unit.updateWorldPosition?.();
      unit.updateHUD?.();
      this.events.emit('unit:teleported', { unit, spell, pos });
    }
    return true;
  }

  /** Intercambia posiciones de dos unidades (sin efectos extra). */
  _swapUnits(a, b, spell = null) {
    const ta = this.gridManager.getTile(a.gridX, a.gridZ);
    const tb = this.gridManager.getTile(b.gridX, b.gridZ);
    if (!ta || !tb) return false;
    ta.unit = b; tb.unit = a;
    [a.gridX, b.gridX] = [b.gridX, a.gridX];
    [a.gridZ, b.gridZ] = [b.gridZ, a.gridZ];
    a.updateWorldPosition?.(); b.updateWorldPosition?.();
    a.updateHUD?.(); b.updateHUD?.();
    this.events.emit('spell:transpose', {
      caster: a, target: b, spell,
      casterPos: this.gridManager.gridToWorld(a.gridX, a.gridZ),
      targetPos: this.gridManager.gridToWorld(b.gridX, b.gridZ),
    });
    return true;
  }

  /**
   * Bonus plano de daño del lanzador para hechizos con `effects`.
   * spell.damageBonus ('melee' | 'ranged' | 'magic' | 'none') manda; si no, prefijo histórico del id
   * (kotaro_/plant_ cuerpo a cuerpo, bing_/bird_ a distancia, pomodoro_ mágico); Sapidae usa el bonus
   * general como siempre; el resto (cartas de partes) según la distancia al objetivo.
   */
  _flatDamageBonus(caster, spell, dist = 1) {
    if (!caster) return 0;
    const id = spell.id || '';
    let kind = spell.damageBonus;
    if (!kind) {
      if (id.startsWith('kotaro_') || id.startsWith('plant_')) kind = 'melee';
      else if (id.startsWith('bing_') || id.startsWith('bird_')) kind = 'ranged';
      else if (id.startsWith('pomodoro_')) kind = 'magic';
      // Sapidae (19-oct; nombres del Hito 95): Alfarero y Comandante usan Ferocidad (1 casilla) o Agilidad (más lejos); Guardián de Campanas y Rastreador Gogo, Esencia
      else if (/^(lunalogist|stargazer)_/.test(id)) kind = 'magic';
      else if (/^(craft|shepard)_/.test(id)) kind = dist <= 1 ? 'melee' : 'ranged';
      else kind = dist <= 1 ? 'melee' : 'ranged';
    }
    const extra = this.runeCharms ? this.runeCharms.flatDamage(caster, spell, dist) : 0; // Shellshock, Red Mirror
    const pick = { melee: caster.bonusMeleeDamage, ranged: caster.bonusRangedDamage, magic: caster.bonusMagicDamage }[kind];
    if (pick) return Math.round(pick) + extra;
    if (kind === 'none') return extra;
    return (caster.bonusDamage || 0) + extra;
  }

  _getSpellMultiplier(caster, spell) {
    if (!caster || typeof caster.getSkillLevel !== 'function') return 1.0;
    const level = caster.getSkillLevel(spell.id);
    // Level 1: 100%, Level 2: 120%, Level 3: 140%, Level 4: 160%, Level 5: 185%
    const multipliers = [1.0, 1.0, 1.20, 1.40, 1.60, 1.85];
    return multipliers[Math.min(5, Math.max(1, level))];
  }

  async _executeJump(caster, spell, targetCell) {
    const oldTile = this.gridManager.getTile(caster.gridX, caster.gridZ);
    if (oldTile && oldTile.unit === caster) oldTile.unit = null;

    const newTile = this.gridManager.getTile(targetCell.x, targetCell.z);
    if (newTile) {
      if (newTile.unit && newTile.unit !== caster) return false;
      newTile.unit = caster;
    }

    await caster._hopToCell(targetCell.x, targetCell.z, 0.45);
    caster.gridX = targetCell.x;
    caster.gridZ = targetCell.z;
    caster.updateHUD();

    const targetWorldPos = this.gridManager.gridToWorld(targetCell.x, targetCell.z);
    this.events.emit('spell:landing', { caster, spell, pos: targetWorldPos });

    if (spell.shieldAmount) {
      const mult = this._getSpellMultiplier(caster, spell);
      let shieldAmt = Math.round(spell.shieldAmount * mult);
      if (caster && caster.supportPower) {
        shieldAmt = Math.round(shieldAmt * (1 + caster.supportPower / 100));
      }
      caster.addShield(shieldAmt);
      caster.shieldExpiresRound = this._shieldExpiry();
      this.events.emit('unit:shielded', { unit: caster, source: caster, spell, amount: shieldAmt, pos: targetWorldPos, variant: 'jump' });
    }

    const adjacent = [
      { x: targetCell.x + 1, z: targetCell.z },
      { x: targetCell.x - 1, z: targetCell.z },
      { x: targetCell.x, z: targetCell.z + 1 },
      { x: targetCell.x, z: targetCell.z - 1 }
    ];

    adjacent.forEach(adj => {
      const tile = this.gridManager.getTile(adj.x, adj.z);
      if (tile && tile.unit && tile.unit !== caster) { // fuego amigo: el impacto del salto alcanza a cualquiera
        const mult = this._getSpellMultiplier(caster, spell);
        let dmg = Math.floor((spell.baseMinDamage + this.rng() * (spell.baseMaxDamage - spell.baseMinDamage + 1)) * mult);
        if (caster) {
          if (caster.bonusMeleeDamage) dmg += Math.round(caster.bonusMeleeDamage);
          else if (caster.bonusDamage) dmg += caster.bonusDamage;
        }
        const actual = tile.unit.takeDamage(dmg);
        this.events.emit('unit:damaged', { unit: tile.unit, source: caster, spell, actual, shieldAbsorbed: 0, isCrit: false, plain: true });
      }
    });

    this.events.emit('spell:jumpImpact', { caster, spell, pos: targetWorldPos });
  }

  /** collisionDamage: daño fijo por choque (sustituye a 20 por casilla restante); collisionBonus se suma. */
  async _executePushback(caster, targetUnit, distance, spell = null, collisionBonus = 0, collisionDamage = null) {
    if (targetUnit.isGolem || (targetUnit.statuses?.length && this.statuses.has(targetUnit, 'unmovable'))) {
      this.events.emit('unit:unmoved', { unit: targetUnit, source: caster, spell });
      return;
    }
    const dx = Math.sign(targetUnit.gridX - caster.gridX);
    const dz = Math.sign(targetUnit.gridZ - caster.gridZ);
    distance = this.runeCharms.pushDistance(targetUnit, distance); // Pure Skill

    this.events.emit('unit:pushStart', { unit: targetUnit, source: caster, spell });

    const pushResult = await targetUnit.pushback(dx, dz, distance);

    if (pushResult.hitObstacle && pushResult.remainingTiles > 0) {
      // Small 70ms delay: just an instant after attack damage so texts don't overlap while feeling immediate
      await new Promise(r => setTimeout(r, 70));

      const extraCollision = Math.round((caster && caster.collisionBonus) || 0);
      const base = collisionDamage != null ? collisionDamage : pushResult.remainingTiles * 20;
      const collisionDamage_ = base + extraCollision + collisionBonus;

      // Sturdy Fighter: inmune al daño de colisión
      const hitsTarget = !this.runeCharms.collisionImmune(targetUnit);
      this.events.emit('unit:collision', { unit: targetUnit, source: caster, damage: hitsTarget ? collisionDamage_ : 0, first: true });
      if (hitsTarget) targetUnit.takeDamage(collisionDamage_);

      if (pushResult.collidingUnit) {
        const hitsOther = !this.runeCharms.collisionImmune(pushResult.collidingUnit);
        this.events.emit('unit:collision', { unit: pushResult.collidingUnit, source: caster, damage: hitsOther ? collisionDamage_ : 0, first: false });
        if (hitsOther) pushResult.collidingUnit.takeDamage(collisionDamage_);
      }
    }
  }

  // Compatibilidad: estos métodos ahora viven en SpellPresentation.
  _spawnProjectile(fromPos, toPos, spell) { return this.presentation.spawnProjectile(fromPos, toPos, spell); }
  _spawnImpactVFX(worldPos, spell) { return this.presentation.spawnImpactVFX(worldPos, spell); }
  _playSpellSound(soundType) { return this.presentation.playSpellSound(soundType); }
}
