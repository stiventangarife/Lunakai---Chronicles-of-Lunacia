import { playerSapidaeModel } from './SapidaeModels.js';
import * as i18n from '../i18n/i18n.js';
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
    spellIds: ['kotaro_slash', 'kotaro_push', 'kotaro_jump', 'kotaro_bite', 'kotaro_roar', 'kotaro_frenzy'],
    skills: [
      { id: 'kotaro_slash', name: 'Fierce Strike', part: 'eyes', partName: 'Eyes', cost: '3 AP', range: '1', type: 'Cuerpo a Cuerpo', desc: 'Devastador zarpazo marcial. Inflige 65-80 de daño físico.', icon: './assets/skills/heroes/shinji/1.png' },
      { id: 'kotaro_push', name: 'Knockback Rush', part: 'ears', partName: 'Ears', cost: '2 AP', range: '1', type: 'Empuje / Colisión', desc: 'Carga con embestida que inflige 25-35 de daño y empuja al enemigo 2 casillas.', icon: './assets/skills/heroes/shinji/2.png' },
      { id: 'kotaro_jump', name: 'Tactical Jump', part: 'mouth', partName: 'Mouth', cost: '3 AP', range: '2-3', type: 'Salto / Escudo', desc: 'Salta sobre cualquier obstáculo ganando +40 de Escudo y causando 25 de daño al caer.', icon: './assets/skills/heroes/shinji/3.png' },
      { id: 'kotaro_bite', name: 'Mordisco Bestial', part: 'horn', partName: 'Horn', cost: '2 AP', range: '1', type: 'Ataque / Sangrado', desc: 'Mordisco feroz a quemarropa que inflige 45-58 de daño y reduce el ataque del objetivo.', icon: './assets/skills/heroes/shinji/4.png' },
      { id: 'kotaro_roar', name: 'Rugido Territorial', part: 'back', partName: 'Back', cost: '2 AP', range: 'Aura (2)', type: 'Aura / Potenciador', desc: 'Rugido salvaje que infunde bravura a los aliados: otorga +1 PM y +15% de Daño durante 1 turno.', icon: './assets/skills/heroes/shinji/5.png' },
      { id: 'kotaro_frenzy', name: 'Furia Lunar', part: 'tail', partName: 'Tail', cost: '4 AP', range: '1', type: 'Golpe Crítico', desc: 'Ataque frenético definitivo que asesta 85-110 de daño letal con 50% de probabilidad de crítico.', icon: './assets/skills/heroes/shinji/6.png' }
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
    description: 'Agile and swift like the wind. Masters rapid movement with 115 initiative, striking with accurate Cupid arrows.',
    baseHP: 290,
    basePA: 6,
    basePM: 3,
    baseInitiative: 115,
    genes: '0x10000000000001000241c0e0820800000001000020408202000100082820820a000100081040800a000100142040400400010008106183040001000818418204',
    image: './assets/portraits/bird-early.png',
    spellIds: ['bird_cupid', 'bird_owl', 'bird_aerial_jump', 'bird_feather_barrage', 'bird_tailwind', 'bird_sky_dive'],
    skills: [
      { id: 'bird_cupid', name: "Cupid's Arrow", part: 'eyes', partName: 'Eyes', cost: '3 AP', range: '1-4', type: 'A Distancia', desc: 'Disparo aéreo perforante de largo alcance (1-4 casillas) que inflige 70-85 de daño certero.', icon: './assets/skills/heroes/early-bird/1.png' },
      { id: 'bird_owl', name: 'Owl Gaze', part: 'ears', partName: 'Ears', cost: '2 AP', range: '1-3', type: 'Ataque / Movilidad', desc: 'Ataque rápido de mirada penetrante que inflige 35-45 de daño y otorga +1 PM al tirador.', icon: './assets/skills/heroes/early-bird/2.png' },
      { id: 'bird_aerial_jump', name: 'Aerial Jump', part: 'mouth', partName: 'Mouth', cost: '3 AP', range: '2-4', type: 'Vuelo / Área', desc: 'Planea ágilmente sobre obstáculos (2-4 casillas), ganando +30 de Escudo y 25 de daño en cruz.', icon: './assets/skills/heroes/early-bird/3.png' },
      { id: 'bird_feather_barrage', name: 'Lluvia de Plumas', part: 'horn', partName: 'Horn', cost: '3 AP', range: '2-5', type: 'Área / Ráfaga', desc: 'Dispara una ráfaga de plumas afiladas que causa 42-55 de daño a todos los enemigos en el área.', icon: './assets/skills/heroes/early-bird/4.png' },
      { id: 'bird_tailwind', name: 'Viento de Cola', part: 'back', partName: 'Back', cost: '2 AP', range: '1-3', type: 'Soporte / Velocidad', desc: 'Invoca corrientes ascendentes favorables que otorgan +2 PM inmediatos a un aliado.', icon: './assets/skills/heroes/early-bird/5.png' },
      { id: 'bird_sky_dive', name: 'Picado Celestial', part: 'tail', partName: 'Tail', cost: '4 AP', range: '1-3', type: 'Impacto Aéreo', desc: 'Picado a velocidad terminal desde las nubes infligiendo 80-105 de daño y aturdiendo al objetivo (-1 PA).', icon: './assets/skills/heroes/early-bird/6.png' }
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
    spellIds: ['plant_cactus', 'plant_drain', 'plant_shield', 'plant_bramble_trap', 'plant_photosynthesis', 'plant_seed_burst'],
    skills: [
      { id: 'plant_cactus', name: 'Cactus Strike', part: 'eyes', partName: 'Eyes', cost: '3 AP', range: '1', type: 'Cuerpo a Cuerpo', desc: 'Pesado golpe espinoso que inflige 65-80 de daño físico y desgarra armaduras.', icon: './assets/skills/heroes/big-yak/1.png' },
      { id: 'plant_drain', name: 'Zigzag Bite', part: 'ears', partName: 'Ears', cost: '2 AP', range: '1-2', type: 'Drenaje Vital', desc: 'Drena energía vital del adversario, causando 40-50 de daño y restaurando 35 HP al Axie.', icon: './assets/skills/heroes/big-yak/2.png' },
      { id: 'plant_shield', name: 'Bidens Shell', part: 'mouth', partName: 'Mouth', cost: '2 AP', range: '0-3', type: 'Escudo Masivo', desc: 'Genera un denso caparazón vegetal que otorga un masivo +90 de Escudo a un aliado o a sí mismo.', icon: './assets/skills/heroes/big-yak/3.png' },
      { id: 'plant_bramble_trap', name: 'Trampa de Espinas', part: 'horn', partName: 'Horn', cost: '2 AP', range: '1-3', type: 'Control / Trampa', desc: 'Siembra raíces espinosas en una casilla que inmovilizan (-2 PM) y dañan al primer enemigo que la pise.', icon: './assets/skills/heroes/big-yak/4.png' },
      { id: 'plant_photosynthesis', name: 'Fotosíntesis', part: 'back', partName: 'Back', cost: '2 AP', range: 'Self', type: 'Regeneración', desc: 'Absorbe los rayos solares de Lunacia restaurando 55 HP de inmediato y +20 HP al inicio del siguiente turno.', icon: './assets/skills/heroes/big-yak/5.png' },
      { id: 'plant_seed_burst', name: 'Estallido de Semillas', part: 'tail', partName: 'Tail', cost: '4 AP', range: '1-3', type: 'Área / Veneno', desc: 'Detona semillas explosivas que causan 50-65 de daño en cruz y aplican veneno persistente.', icon: './assets/skills/heroes/big-yak/6.png' }
    ]
  }
];

export function getHeroSpells(heroKeyOrAxieId) {
  if (!heroKeyOrAxieId) return ['kotaro_slash', 'kotaro_push', 'kotaro_jump', 'kotaro_bite', 'kotaro_roar', 'kotaro_frenzy'];
  const s = String(heroKeyOrAxieId).toLowerCase();
  if (s.includes('bird') || s.includes('pájaro') || s.includes('pajaro') || s === '3797905') {
    return ['bird_cupid', 'bird_owl', 'bird_aerial_jump', 'bird_feather_barrage', 'bird_tailwind', 'bird_sky_dive'];
  }
  if (s.includes('plant') || s.includes('planta') || s === '10830416' || s.includes('yak')) {
    return ['plant_cactus', 'plant_drain', 'plant_shield', 'plant_bramble_trap', 'plant_photosynthesis', 'plant_seed_burst'];
  }
  return ['kotaro_slash', 'kotaro_push', 'kotaro_jump', 'kotaro_bite', 'kotaro_roar', 'kotaro_frenzy'];
}

export const SAPIDAE_CLASSES = {
  crafter: {
    id: 'crafter',
    name: 'Alfarero de Gólems',
    title: 'Artesano de la Arcilla Espiritual',
    archetype: 'Sapidae Alfarero de Gólems (Gólem Centinela y Defensa)',
    description: 'Artesanos que moldean la arcilla espiritual para resistir, no para conquistar. Su Gólem Centinela de Vasija recibe los golpes que romperían a un Axie y sostiene la línea mientras el escuadrón avanza.',
    icon: './assets/classes/class_forjacubiles.webp',
    iconImg: './assets/classes/class_forjacubiles.webp',
    golem: 'sentinel', // Hito 95 (combat/GolemSystem.js)
    maxHP: 240,
    maxPA: 6,
    maxPM: 3,
    initiative: 88,
    spells: ['craft_clay_fist', 'craft_sentinel_golem', 'craft_stone_veins', 'craft_clay_wall', 'craft_carry_wounded', 'craft_fortify'],
    spellPreviews: [
      {
        id: 'craft_clay_fist',
        name: 'Puño de Arcilla',
        cost: '3 AP',
        range: '1-2',
        type: 'Ataque / Empuje',
        icon: './assets/skills/heroes/crafter/1.webp',
        desc: 'Puñetazo de arcilla reforzada con piedra: 42-55 de daño y empuja al enemigo 1 casilla (daño de colisión si choca).'
      },
      {
        id: 'craft_sentinel_golem',
        name: 'Centinela de Vasija',
        cost: '4 AP',
        range: '1-2',
        type: 'Invocación / Defensa',
        icon: './assets/skills/heroes/crafter/2.webp',
        desc: 'Moldea un Gólem Centinela con el 70 % de tu vida máxima. Provoca a los enemigos que tiene al lado y tus aliados a su lado reciben −25 % de daño. Al romperse, da +30 de escudo a esos aliados. Uno a la vez.'
      },
      {
        id: 'craft_stone_veins',
        name: 'Vetas de Piedra',
        cost: '2 AP',
        range: '1-3',
        type: 'Soporte / Escudo',
        icon: './assets/skills/heroes/crafter/3.webp',
        desc: 'Refuerza a un aliado con vetas minerales: +60 de escudo y Arraigado (no puede ser empujado). Sobre tu gólem, lo repara +80 de vida.'
      },
      {
        id: 'craft_clay_wall',
        name: 'Muralla de Arcilla',
        cost: '2 AP',
        range: '1-3',
        type: 'Estructura / Cobertura',
        icon: './assets/skills/heroes/crafter/4.webp',
        desc: 'Levanta un muro de arcilla indestructible que bloquea el paso y la visión durante 2 rondas. +30 de escudo al lanzador.'
      },
      {
        id: 'craft_carry_wounded',
        name: 'Llevar al Herido',
        cost: '3 AP',
        range: '1-5',
        type: 'Rescate / Curación',
        icon: './assets/skills/heroes/crafter/5.webp',
        desc: 'Tu gólem trae a un aliado a una casilla a su lado y le cura 30-40. Sin gólem, lo trae junto a ti.'
      },
      {
        id: 'craft_fortify',
        name: 'Fortificar',
        cost: '2 AP',
        range: '1-6',
        type: 'Gólem / Blindaje',
        icon: './assets/skills/heroes/crafter/6.webp',
        desc: 'Tu gólem se endurece: +100 de escudo y Espinas (devuelve 20 de daño a quien lo golpee cuerpo a cuerpo) durante 2 rondas. 1 vez por turno.'
      },
    ]
  },
  shepard: {
    id: 'shepard',
    name: 'Comandante de Sombrero',
    title: 'La Voz de Lunacia en el Campo',
    archetype: 'Sapidae Comandante de Sombrero (Órdenes y Posición)',
    description: 'Comandantes que traducen los avisos de Lunacia a través de los Gólems Sombrero. Guían el combate sin dirigirlo: mueven, protegen y dan tiempo a sus Axies.',
    icon: './assets/classes/class_susurrador.webp',
    iconImg: './assets/classes/class_susurrador.webp',
    emoji: '✨',
    golem: 'hat', // Hito 95 (combat/GolemSystem.js)
    maxHP: 220,
    maxPA: 6,
    maxPM: 3,
    initiative: 90,
    spells: ['shepard_hat_headbutt', 'shepard_hat_golem', 'shepard_translate_warning', 'shepard_shared_order', 'shepard_guided_retreat', 'shepard_relief'],
    spellPreviews: [
      {
        id: 'shepard_hat_headbutt',
        name: 'Cabezazo del Sombrero',
        cost: '3 AP',
        range: '1-2',
        type: 'Ataque / Control',
        icon: './assets/skills/heroes/shepard/1.webp',
        desc: 'Embestida con el sombrero de arcilla: 40-52 de daño y −1 PA en el próximo turno del enemigo.'
      },
      {
        id: 'shepard_hat_golem',
        name: 'Gólem Sombrero',
        cost: '4 AP',
        range: '1-2',
        type: 'Invocación / Mando',
        icon: './assets/skills/heroes/shepard/2.webp',
        desc: 'Moldea un Gólem Sombrero con el 45 % de tu vida máxima. Repite tus órdenes: Traducir el Aviso, Orden Compartida y Retirada Guiada llegan a cualquier aliado a 2 casillas del gólem. Al final de tu turno da +1 PM a los aliados que tiene al lado. Al romperse, +1 PA a esos aliados.'
      },
      {
        id: 'shepard_translate_warning',
        name: 'Traducir el Aviso',
        cost: '2 AP',
        range: '1-4',
        type: 'Apoyo / Movimiento',
        icon: './assets/skills/heroes/shepard/3.webp',
        desc: 'Traduces el aviso de Lunacia: el aliado gana +2 PM en su turno. Llega también por tu Gólem Sombrero. 1 vez por turno.'
      },
      {
        id: 'shepard_shared_order',
        name: 'Orden Compartida',
        cost: '3 AP',
        range: '1-4',
        type: 'Apoyo / Axie',
        icon: './assets/skills/heroes/shepard/4.webp',
        desc: 'Tu Axie recibe la orden a tiempo: +1 PA y +15 % de daño en su turno. Llega también por tu Gólem Sombrero. 1 vez por turno.'
      },
      {
        id: 'shepard_guided_retreat',
        name: 'Retirada Guiada',
        cost: '2 AP',
        range: '1-4',
        type: 'Apoyo / Posición',
        icon: './assets/skills/heroes/shepard/5.webp',
        desc: 'Guías a un aliado lejos del suelo que se hunde: +30 de escudo y se aleja 2 casillas del enemigo más cercano. Llega también por tu Gólem Sombrero.'
      },
      {
        id: 'shepard_relief',
        name: 'Relevo',
        cost: '2 AP',
        range: '1-4',
        type: 'Táctica / Posición',
        icon: './assets/skills/heroes/shepard/6.webp',
        desc: 'Intercambias la posición con un aliado o con tu gólem. Los dos ganan +25 de escudo.'
      },
    ]
  },
  lunalogist: {
    id: 'lunalogist',
    name: 'Guardián de Campanas',
    title: 'Guardián de los Santuarios de Atia',
    archetype: 'Sapidae Guardián de Campanas (Curación y Purificación)',
    description: 'Guardianes de santuario que cuelgan Wind Bells junto a las aldeas. Sus campanas avisan de la corrupción, curan a los heridos y suenan en duelo cuando el combate se alarga.',
    icon: './assets/classes/class_lunalogista.webp',
    iconImg: './assets/classes/class_lunalogista.webp',
    emoji: '🌿',
    golem: 'bell', // Hito 95 (combat/GolemSystem.js)
    maxHP: 230,
    maxPA: 6,
    maxPM: 3,
    initiative: 86,
    spells: ['lunalogist_alarm_toll', 'lunalogist_bell_golem', 'lunalogist_mourning_tone', 'lunalogist_warning_whisper', 'lunalogist_purify', 'lunalogist_blood_moon'],
    spellPreviews: [
      {
        id: 'lunalogist_alarm_toll',
        name: 'Tañido de Alarma',
        cost: '3 AP',
        range: '1-3',
        type: 'Ataque / Marca',
        icon: './assets/skills/heroes/lunalogist/1.webp',
        desc: 'La campana delata la corrupción: 35-45 de daño y Frágil (+25 % de daño recibido) hasta el final de su próximo turno.'
      },
      {
        id: 'lunalogist_bell_golem',
        name: 'Gólem Campanario',
        cost: '4 AP',
        range: '1-2',
        type: 'Invocación / Curación',
        icon: './assets/skills/heroes/lunalogist/2.webp',
        desc: 'Moldea un Gólem Campanario con el 45 % de tu vida máxima, que lleva una Wind Bell. Al final de tu turno suena: aliados a 2 casillas o menos +20 de vida y pierden un estado negativo; enemigos a esa distancia quedan Frágiles. Al romperse, su último tañido cura 40 en radio 2.'
      },
      {
        id: 'lunalogist_mourning_tone',
        name: 'Tono de Duelo',
        cost: '2 AP',
        range: '1-3',
        type: 'Curación / Purificación',
        icon: './assets/skills/heroes/lunalogist/3.webp',
        desc: 'El tono grave de la campana: cura 40-55 y quita veneno, sangrado y quemadura.'
      },
      {
        id: 'lunalogist_warning_whisper',
        name: 'Susurro de Advertencia',
        cost: '2 AP',
        range: '1-4',
        type: 'Apoyo / Guarda',
        icon: './assets/skills/heroes/lunalogist/4.webp',
        desc: 'El viento avisa del golpe: +35 de escudo y Guarda (el próximo enemigo que golpee al aliado queda Debilitado, −20 % de daño, 1 turno).'
      },
      {
        id: 'lunalogist_purify',
        name: 'Purificar',
        cost: '3 AP',
        range: '1-3',
        type: 'Ataque / Disipar',
        icon: './assets/skills/heroes/lunalogist/5.webp',
        desc: 'Limpia la corrupción del enemigo: 30-40 de daño y le quita todos sus efectos positivos.'
      },
      {
        id: 'lunalogist_blood_moon',
        name: 'Resonancia de la Luna de Sangre',
        cost: '4 AP',
        range: 'Todo el escuadrón',
        type: 'Supremo / Escuadrón',
        icon: './assets/skills/heroes/lunalogist/6.webp',
        desc: 'Las campanas suenan con una resonancia extraña: todos tus aliados regeneran 20 de vida al empezar su turno durante 2 turnos y quedan Inmunes (aturdir, dormir y miedo) 1 turno.'
      },
    ]
  },
  stargazer: {
    id: 'stargazer',
    name: 'Rastreador Gogo',
    title: 'El Petrasentido de Lunacia',
    archetype: 'Sapidae Rastreador Gogo (Terreno y Control)',
    description: 'Exploradores que leen el suelo con su petrasentido y siguen a los caracoles Gogo, que marcan la tierra estable. Abren grietas bajo el enemigo y aseguran el terreno para sus Axies.',
    icon: './assets/classes/class_astromante.webp',
    iconImg: './assets/classes/class_astromante.webp',
    emoji: '🔮',
    golem: 'shell', // Hito 95 (combat/GolemSystem.js)
    maxHP: 210,
    maxPA: 6,
    maxPM: 3,
    initiative: 92,
    spells: ['stargazer_yielding_ground', 'stargazer_shell_golem', 'stargazer_petrasense', 'stargazer_shell_march', 'stargazer_corrupt_rift', 'stargazer_dawn_spiral'],
    spellPreviews: [
      {
        id: 'stargazer_yielding_ground',
        name: 'Suelo que Cede',
        cost: '3 AP',
        range: '1-3',
        type: 'Ataque / Control',
        icon: './assets/skills/heroes/stargazer/1.webp',
        desc: 'Tu petrasentido abre el suelo bajo el enemigo: 40-52 de daño y −1 PM en su próximo turno.'
      },
      {
        id: 'stargazer_shell_golem',
        name: 'Gólem Caparazón',
        cost: '4 AP',
        range: '1-2',
        type: 'Invocación / Terreno',
        icon: './assets/skills/heroes/stargazer/2.webp',
        desc: 'Moldea un Gólem Caparazón con el 50 % de tu vida máxima, cubierto de caracoles Gogo. Su casilla y las de alrededor son tierra estable: los aliados que empiezan su turno allí ganan +1 PM y Arraigado, y pierden quemadura y veneno. Al romperse, los caracoles dejan tierra estable en 3×3 durante 2 rondas.'
      },
      {
        id: 'stargazer_petrasense',
        name: 'Petrasentido',
        cost: '2 AP',
        range: '1-6',
        type: 'Marca / Debilitar',
        icon: './assets/skills/heroes/stargazer/3.webp',
        desc: 'Sientes al enemigo a través del suelo, sin necesidad de verlo: Frágil (+25 % de daño recibido) y −1 de alcance durante 2 turnos.'
      },
      {
        id: 'stargazer_shell_march',
        name: 'Marcha del Caparazón',
        cost: '2 AP',
        range: '1-3 (desde el gólem)',
        type: 'Gólem / Terreno',
        icon: './assets/skills/heroes/stargazer/4.webp',
        desc: 'Tu gólem avanza hasta 3 casillas desde donde está. Por donde pasa queda tierra estable durante 2 rondas. 1 vez por turno.'
      },
      {
        id: 'stargazer_corrupt_rift',
        name: 'Grieta Corrupta',
        cost: '2 AP',
        range: '1-4',
        type: 'Zona / Control',
        icon: './assets/skills/heroes/stargazer/5.webp',
        desc: 'Zona de 2×2 durante 2 rondas: los enemigos que empiezan su turno dentro pierden 2 PM.'
      },
      {
        id: 'stargazer_dawn_spiral',
        name: 'Espiral del Alba',
        cost: '4 AP',
        range: '1-3',
        type: 'Supremo / Área',
        icon: './assets/skills/heroes/stargazer/6.webp',
        desc: 'Los caracoles Gogo trazan una espiral en área 3×3: 45-58 de daño solo a los enemigos; los aliados ganan +25 de vida y pierden quemadura y veneno.'
      },
    ]
  },
};

/** Hito 95: habilidades de cada clase antes del rediseño, por ranura (para conservar sus niveles al migrar). */
export const SAPIDAE_LEGACY_SPELLS = {
  crafter: ['craft_anvil', 'craft_totem', 'craft_barricade', 'craft_quake', 'craft_reinforce', 'craft_turret'],
  shepard: ['shepard_astral_strike', 'shepard_balsam', 'shepard_attunement', 'shepard_pack_howl', 'shepard_spirit_bond', 'shepard_chimeric_awakening'],
  lunalogist: ['lunalogist_bramble', 'lunalogist_spores', 'lunalogist_berry', 'lunalogist_seed', 'lunalogist_cloak', 'lunalogist_bloom'],
  stargazer: ['stargazer_vortex', 'stargazer_transpose', 'stargazer_jump', 'stargazer_nova', 'stargazer_gravity_well', 'stargazer_eclipse'],
};

// Textos de héroes y clases en el idioma activo (i18n/*/heroes.js). Los ids, clases y el nombre de clase del Sapidae no cambian.
for (const h of HERO_ROSTER) {
  for (const f of ['archetype', 'description']) { const k = `heroes.${h.heroKey}.${f}`, v = i18n.t(k); if (v !== k) h[f] = v; }
  i18n.applyText(h.skills, `heroes.${h.heroKey}.skill`, ['name', 'partName', 'type', 'desc', 'range']);
}
i18n.applyText(SAPIDAE_CLASSES, 'heroes.class', ['name', 'title', 'archetype', 'description']); // Hito 95: el nombre de clase también se traduce
for (const c of Object.values(SAPIDAE_CLASSES)) i18n.applyText(c.spellPreviews, `heroes.class.${c.id}.spell`, ['name', 'type', 'desc', 'range']);

/**
 * Textos visibles de un héroe guardado (slot.hero) en el idioma actual: la partida guarda una copia con los textos del
 * idioma en que se creó; aquí se toman de HERO_ROSTER (por heroKey, y cada habilidad por id) y, si no está, de la copia.
 * Devuelve { archetype, description, skills }.
 */
export function heroDisplayText(hero) {
  const base = hero && HERO_ROSTER.find((h) => h.heroKey === hero.heroKey);
  const skills = (hero?.skills || base?.skills || []).map((s) => {
    const b = base?.skills?.find((x) => x.id === s.id);
    return b ? { ...s, name: b.name, partName: b.partName, type: b.type, desc: b.desc, range: b.range } : s;
  });
  return { archetype: base?.archetype ?? hero?.archetype ?? '', description: base?.description ?? hero?.description ?? '', skills };
}

// Invitado: la clave histórica (conserva el progreso que ya existía en el dispositivo).
const STORAGE_KEY = 'axie_tactics_adventure_slots_v1';
// Cuenta: una caché local separada por usuario, para que cambiar de cuenta nunca mezcle ni muestre progreso ajeno.
const ACCOUNT_KEY_PREFIX = 'lunakai_slots_u_';

const emptySync = () => ({ versions: {}, dirty: {}, pendingDeletes: {} });

export class SaveSlotManager {
  constructor() {
    this.slots = { 1: null, 2: null, 3: null };
    this.activeSlotId = null;
    this.owner = { mode: 'guest' };
    this.storageKey = STORAGE_KEY;
    this.sync = emptySync();
    // Ganchos que activa CloudSave cuando hay una cuenta conectada
    this.onLocalChange = null;   // (slotIds[]) => void
    this.onLocalDelete = null;   // (slotId) => void
    this._loadFromStorage();
  }

  // ---------------------------------------------------------------- dueño de las ranuras (invitado / cuenta)

  /** Cambia de quién son las ranuras en memoria: { mode: 'guest' } o { mode: 'account', userId }. */
  setOwner(owner) {
    const next = owner && owner.mode === 'account' && owner.userId ? { mode: 'account', userId: owner.userId } : { mode: 'guest' };
    this.owner = next;
    this.storageKey = next.mode === 'account' ? ACCOUNT_KEY_PREFIX + next.userId : STORAGE_KEY;
    this.slots = { 1: null, 2: null, 3: null };
    this.activeSlotId = null;
    this.sync = emptySync();
    this._loadFromStorage();
  }

  isAccount() { return this.owner.mode === 'account'; }

  /** Borra la caché local de la cuenta actual (al cerrar sesión) y vuelve a modo invitado. */
  clearAccountCache() {
    if (this.isAccount()) {
      try { localStorage.removeItem(this.storageKey); } catch { /* nada */ }
    }
    this.setOwner({ mode: 'guest' });
  }

  /** Aventuras de invitado guardadas en este dispositivo (sin cargarlas). */
  readGuestSlots() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return data && data.slots ? Object.assign({ 1: null, 2: null, 3: null }, data.slots) : { 1: null, 2: null, 3: null };
    } catch { return { 1: null, 2: null, 3: null }; }
  }

  hasGuestSlots() { return Object.values(this.readGuestSlots()).some(Boolean); }

  /** Tras subirlas a una cuenta, las aventuras de invitado se archivan (no se borran) para no volver a ofrecerlas. */
  archiveGuestSlots() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(`${STORAGE_KEY}_linked_${Date.now()}`, raw);
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* nada */ }
  }

  // ---------------------------------------------------------------- estado de sincronización (lo usa CloudSave)

  isDirty(slotId) { return Boolean(this.sync.dirty[slotId]); }
  markDirty(slotId) { this.sync.dirty[slotId] = true; this._writeStorage(); }
  clearDirty(slotId) { delete this.sync.dirty[slotId]; this._writeStorage(); }
  getDirtySlotIds() { return Object.keys(this.sync.dirty).map(Number); }
  getCloudVersion(slotId) { return this.sync.versions[slotId] || 0; }
  setCloudVersion(slotId, v) { this.sync.versions[slotId] = v; this._writeStorage(); }
  getPendingDeletes() { return Object.keys(this.sync.pendingDeletes).map(Number); }
  addPendingDelete(slotId) { this.sync.pendingDeletes[slotId] = true; this._writeStorage(); }
  clearPendingDelete(slotId) { delete this.sync.pendingDeletes[slotId]; delete this.sync.versions[slotId]; this._writeStorage(); }

  /** Escribe una ranura que viene de la nube (no la marca como pendiente). */
  applyCloudSlot(slotId, data, version) {
    const prev = this.slots[slotId];
    const merged = { ...data, id: slotId };
    if (prev && prev.sapidaePortrait && !merged.sapidaePortrait) {
      merged.sapidaePortrait = prev.sapidaePortrait;
      if (prev.sapidaePortraitKey) merged.sapidaePortraitKey = prev.sapidaePortraitKey; // va con su retrato (29-oct)
    }
    this.slots[slotId] = merged;
    this.sync.versions[slotId] = version;
    delete this.sync.dirty[slotId];
    this._writeStorage();
  }

  /** Quita una ranura solo en local (se borró en otro dispositivo). */
  removeSlotLocal(slotId) {
    this.slots[slotId] = null;
    if (this.activeSlotId === slotId) this.activeSlotId = null;
    delete this.sync.versions[slotId];
    delete this.sync.dirty[slotId];
    this._writeStorage();
  }

  /** Inserta una aventura traída del invitado y la marca para subir. */
  importSlot(slotId, data) {
    this.slots[slotId] = data;
    this._saveToStorage([slotId]);
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.slots) {
          this.slots = Object.assign({ 1: null, 2: null, 3: null }, data.slots);
          this.activeSlotId = data.activeSlotId || null;
          this.sync = Object.assign(emptySync(), data.sync || {});

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

              // 21-oct: el jugador pasa a los modelos nuevos (Ema / Kai); los antiguos quedan para los NPC
              if (slot.sapidaeModel && playerSapidaeModel(slot.sapidaeModel) !== slot.sapidaeModel) {
                slot.sapidaeModel = playerSapidaeModel(slot.sapidaeModel);
                slot.sapidaePortrait = null;
                migrated = true;
              }
              if (!slot.isSapidae || !slot.sapidaeModel) {
                slot.isSapidae = true;
                slot.sapidaeModel = 'sapidae-m-kai';
                slot.playerName = slot.playerName || 'Sapidae Adventurer';
                migrated = true;
              }
              if (!slot.sapidaeClass) {
                slot.sapidaeClass = 'crafter';
                migrated = true;
              }
              if (!slot.customization) {
                slot.customization = {
                  useOriginalTextures: true,
                  hair: '#ffffff',
                  eyes: '#ffffff',
                  shirt: '#ffffff',
                  pants: '#ffffff',
                  horns: 'base',
                  hornColor: 'original',
                  hasHat: false
                };
                migrated = true;
              } else if (slot.customization.useOriginalTextures === undefined) {
                slot.customization.useOriginalTextures = true;
                migrated = true;
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

  /**
   * Guarda en la caché local. `changedSlotIds` = ranuras cuyo contenido cambió:
   * con una cuenta conectada se marcan como pendientes y se avisa a CloudSave.
   */
  _saveToStorage(changedSlotIds = []) {
    const ids = changedSlotIds.map(Number).filter((id) => id >= 1 && id <= 3 && this.slots[id]);
    if (this.isAccount()) ids.forEach((id) => { this.sync.dirty[id] = true; });
    const ok = this._writeStorage();
    if (ids.length && this.isAccount() && typeof this.onLocalChange === 'function') {
      try { this.onLocalChange(ids); } catch (e) { console.warn('[SaveSlotManager] onLocalChange', e); }
    }
    return ok;
  }

  _writeStorage() {
    try {
      const payload = {
        version: 1,
        activeSlotId: this.activeSlotId,
        slots: this.slots,
        updatedAt: Date.now()
      };
      if (this.isAccount()) payload.sync = this.sync;
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[SaveSlotManager] Error saving slots to localStorage:', e);
      this.lastLocalError = e;
      return false;
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
      isSapidae: true,
      sapidaeModel: playerSapidaeModel(heroTemplate.sapidaeModel || 'sapidae-f-ema'),
      sapidaePortrait: heroTemplate.sapidaePortrait || null,
      playerName: heroTemplate.playerName || 'Lunara',
      sapidaeClass: heroTemplate.sapidaeClass || 'crafter',
      customization: heroTemplate.customization || {
        useOriginalTextures: true,
        hair: 'original',
        hairStyle: 'braids',
        eyes: 'original',
        eyeShape: 'round',
        suitColor: 'original',
        shirt: 'original',
        pants: 'original',
        horns: 'base',
        hornColor: 'original',
        hasHat: false,
        hatColor: 'original'
      },
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
        axpInfo: heroTemplate.axpInfo || null, // nivel y AXP de Sky Mavis (solo se muestran)
        spellIds: heroTemplate.spellIds || getHeroSpells(heroTemplate.heroKey),
        modelType: 'axie',
        scale: 0.88,
        sapidaeModel: heroTemplate.sapidaeModel || 'sapidae-m-a'
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
      // Hito 48: tutorial nuevo (TutorialDirector) desde su primer paso
      tutorialProgress: { v: 2, step: 'defend', done: false, flags: {}, bondBefore: null, isActive: true },
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
    this._saveToStorage([slotId]);
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
    if (progressData.squad !== undefined) slot.squad = progressData.squad;
    if (progressData.accountAxies) slot.accountAxies = progressData.accountAxies; // Hito 75: Axies de la cuenta
    if (progressData.inventory) slot.inventory = progressData.inventory;
    if (progressData.equipped) slot.equipped = progressData.equipped;
    if (progressData.progression) slot.progression = progressData.progression;
    if (progressData.currentHP) slot.currentHP = progressData.currentHP; // vida persistente de cada héroe
    if (progressData.sapidaeModel) slot.sapidaeModel = playerSapidaeModel(progressData.sapidaeModel);
    if (progressData.sapidaePortrait) slot.sapidaePortrait = progressData.sapidaePortrait;
    if (progressData.sapidaePortraitKey) slot.sapidaePortraitKey = progressData.sapidaePortraitKey; // 29-oct: apariencia del retrato
    if (progressData.playerName) slot.playerName = progressData.playerName;
    if (progressData.sapidaeClass) slot.sapidaeClass = progressData.sapidaeClass;
    if (progressData.customization) slot.customization = progressData.customization;
    if (progressData.bond) slot.bond = progressData.bond; // vínculo por Axie (BondService)

    return this._saveToStorage([this.activeSlotId]);
  }

  deleteSlot(slotId) {
    if (this.slots[slotId]) {
      this.slots[slotId] = null;
      if (this.activeSlotId === slotId) {
        this.activeSlotId = null;
      }
      delete this.sync.dirty[slotId];
      this._saveToStorage();
      if (this.isAccount() && typeof this.onLocalDelete === 'function') {
        try { this.onLocalDelete(slotId); } catch (e) { console.warn('[SaveSlotManager] onLocalDelete', e); }
      }
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
