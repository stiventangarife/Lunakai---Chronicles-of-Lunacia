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
    description: 'Agile and swift like the wind. Masters rapid movement with 4 MP and 115 initiative, striking with accurate Cupid arrows.',
    baseHP: 290,
    basePA: 6,
    basePM: 4,
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
    name: 'Forjacubiles',
    title: 'Maestro de la Artesanía Ancestral ("Sapidae Craft")',
    archetype: 'Sapidae Forjacubiles (Soporte Táctico y Escudos)',
    description: 'Artesanos magistrales de Lunacia capaces de forjar yunques, tótems y balistas en pleno campo de batalla. Expertos en escudos protectores, control del terreno y despliegue táctico.',
    icon: './assets/classes/class_forjacubiles.jpg',
    iconImg: './assets/classes/class_forjacubiles.jpg',
    maxHP: 240,
    maxPA: 6,
    maxPM: 3,
    initiative: 88,
    spells: ['craft_anvil', 'craft_totem', 'craft_barricade', 'craft_quake', 'craft_reinforce', 'craft_turret'],
    spellPreviews: [
      {
        id: 'craft_anvil',
        name: 'Yunque Táctico',
        cost: '3 AP',
        range: '1-2',
        type: 'Ataque / Empuje',
        icon: './assets/skills/heroes/crafter/1.png',
        desc: 'Golpe contundente con yunque ancestral. Inflige 45-60 de daño físico y empuja 1 casilla provocando colisión.'
      },
      {
        id: 'craft_totem',
        name: 'Tótem de Resguardo',
        cost: '2 AP',
        range: '1-3',
        type: 'Soporte / Escudo',
        icon: './assets/skills/heroes/crafter/2.png',
        desc: 'Erige un tótem protector ancestral que otorga +50 de Escudo y +1 PM al objetivo durante 1 turno.'
      },
      {
        id: 'craft_barricade',
        name: 'Barricada de Lunacia',
        cost: '2 AP',
        range: '1-3',
        type: 'Estructura / Cobertura',
        icon: './assets/skills/heroes/crafter/3.png',
        desc: 'Despliega una barricada de madera en casilla vacía para bloquear paso y visión, ganando +30 de Escudo.'
      },
      {
        id: 'craft_quake',
        name: 'Impacto Sísmico',
        cost: '3 AP',
        range: '1-2',
        type: 'Área / Control',
        icon: './assets/skills/heroes/crafter/4.png',
        desc: 'Martillazo telúrico que causa 40-52 de daño en cruz y reduce -1 PM a todos los enemigos impactados.'
      },
      {
        id: 'craft_reinforce',
        name: 'Refuerzo de Placas',
        cost: '2 AP',
        range: '1-3',
        type: 'Soporte / Blindaje',
        icon: './assets/skills/heroes/crafter/5.png',
        desc: 'Refuerza la armadura del Sapidae o de su Axie con metal lunar: +70 de Escudo y disipa reducciones de PM.'
      },
      {
        id: 'craft_turret',
        name: 'Balista de Lunacia',
        cost: '4 AP',
        range: '1-4',
        type: 'Invocación Ofensiva',
        icon: './assets/skills/heroes/crafter/6.png',
        desc: 'Despliega una balista mecánica de artesanía Sapidae que dispara a los enemigos cercanos al final de cada turno.'
      }
    ]
  },
  shepard: {
    id: 'shepard',
    name: 'Susurrador',
    title: 'Lazo Místico con los Axies',
    archetype: 'Sapidae Susurrador (Búfer y Sanador Místico)',
    description: 'Sapidae con un lazo místico ultra desarrollado con los Axies, capaces de despertar la energía oculta de sus genes. Clase de soporte y búfer: curación, sintonía genética (+1 PA / daño) y fulgor cósmico a distancia.',
    icon: './assets/classes/class_susurrador.jpg',
    iconImg: './assets/classes/class_susurrador.jpg',
    emoji: '✨',
    maxHP: 220,
    maxPA: 6,
    maxPM: 3,
    initiative: 90,
    spells: ['shepard_astral_strike', 'shepard_balsam', 'shepard_attunement', 'shepard_pack_howl', 'shepard_spirit_bond', 'shepard_chimeric_awakening'],
    spellPreviews: [
      {
        id: 'shepard_astral_strike',
        name: 'Fulgor Cósmico',
        cost: '3 AP',
        range: '1-3',
        type: 'Magia Estelar',
        icon: './assets/skills/heroes/shepard/1.png',
        desc: 'Canaliza energía astral pura de Lunacia infligiendo 48-62 de daño mágico a distancia.'
      },
      {
        id: 'shepard_balsam',
        name: 'Bálsamo Astral',
        cost: '2 AP',
        range: '1-3',
        type: 'Sanación / Escudo',
        icon: './assets/skills/heroes/shepard/2.png',
        desc: 'Sana 30-42 HP y envuelve al compañero Axie en +40 de Escudo protector estelar.'
      },
      {
        id: 'shepard_attunement',
        name: 'Sintonía Genética',
        cost: '2 AP',
        range: '1-4',
        type: 'Potenciador de Axie',
        icon: './assets/skills/heroes/shepard/3.png',
        desc: 'Despierta la resonancia genética del Axie: restaura 50-65 HP y concede +1 PA extra para el turno.'
      },
      {
        id: 'shepard_pack_howl',
        name: 'Aullido de Manada',
        cost: '2 AP',
        range: 'Aura (2)',
        type: 'Aura / Búfer',
        icon: './assets/skills/heroes/shepard/4.png',
        desc: 'Aullido que resuena con los Axies aliados en un radio de 2 casillas, otorgando +1 PM y +1 PA.'
      },
      {
        id: 'shepard_spirit_bond',
        name: 'Lazo Simbiótico',
        cost: '3 AP',
        range: '1-4',
        type: 'Vínculo Vital',
        icon: './assets/skills/heroes/shepard/5.png',
        desc: 'Enlaza las almas del Sapidae y su Axie: redistribuye el daño recibido y regenera 25 HP por turno.'
      },
      {
        id: 'shepard_chimeric_awakening',
        name: 'Despertar Quimérico',
        cost: '4 AP',
        range: '1-3',
        type: 'Ascensión Épica',
        icon: './assets/skills/heroes/shepard/6.png',
        desc: 'Desata el verdadero potencial genético del Axie: +20% Daño crítico, +2 PM y +60 de Escudo inmediato.'
      }
    ]
  },
  lunalogist: {
    id: 'lunalogist',
    name: 'Lunalogista',
    title: 'Alquimista Botánico de Lunacia',
    archetype: 'Sapidae Lunalogista (Control de Masas y Drenaje)',
    description: 'Botánicos y alquimistas que cosechan la energía vital de las plantas y el rocío lunar de Lunacia. Especialistas en control de masas: atrapan enemigos con zarzas (-PM/-PA), dispersan esporas sanadoras y alimentan con bayas lunares.',
    icon: './assets/classes/class_lunalogista.jpg',
    iconImg: './assets/classes/class_lunalogista.jpg',
    emoji: '🌿',
    maxHP: 230,
    maxPA: 6,
    maxPM: 3,
    initiative: 86,
    spells: ['lunalogist_bramble', 'lunalogist_spores', 'lunalogist_berry', 'lunalogist_seed', 'lunalogist_cloak', 'lunalogist_bloom'],
    spellPreviews: [
      {
        id: 'lunalogist_bramble',
        name: 'Zarzas Lunares',
        cost: '3 AP',
        range: '1-3',
        type: 'Control / Drenaje',
        icon: './assets/skills/heroes/lunalogist/1.png',
        desc: 'Zarzas botánicas que inmovilizan al enemigo: causan 38-48 de daño de naturaleza y drenan 1 PM y 1 PA.'
      },
      {
        id: 'lunalogist_spores',
        name: 'Esporas Vigorizantes',
        cost: '3 AP',
        range: '1-3',
        type: 'Área / Drenaje',
        icon: './assets/skills/heroes/lunalogist/2.png',
        desc: 'Nube de esporas en cruz que daña enemigos por 30-40 y restaura 25 HP al Sapidae y aliados cercanos.'
      },
      {
        id: 'lunalogist_berry',
        name: 'Baya Lunar Alquímica',
        cost: '2 AP',
        range: '1-3',
        type: 'Soporte / PM',
        icon: './assets/skills/heroes/lunalogist/3.png',
        desc: 'Alimenta al compañero con una baya de rocío lunar: otorga +40 de Escudo y +1 PM inmediato.'
      },
      {
        id: 'lunalogist_seed',
        name: 'Semilla Parásita',
        cost: '3 AP',
        range: '1-3',
        type: 'Drenaje Vital',
        icon: './assets/skills/heroes/lunalogist/4.png',
        desc: 'Implanta una semilla botánica que inflige 35-45 de daño y sana al Sapidae el 60% del daño infligido.'
      },
      {
        id: 'lunalogist_cloak',
        name: 'Manto Clorofílico',
        cost: '2 AP',
        range: 'Auto',
        type: 'Defensa Natural',
        icon: './assets/skills/heroes/lunalogist/5.png',
        desc: 'Se envuelve en hojas densas de Lunacia: +55 de Escudo y reduce un 30% el daño recibido a distancia.'
      },
      {
        id: 'lunalogist_bloom',
        name: 'Brotación Primigenia',
        cost: '4 AP',
        range: '1-3',
        type: 'Control Masivo (3x3)',
        icon: './assets/skills/heroes/lunalogist/6.png',
        desc: 'Eclosión botánica masiva: inflige 45-60 de daño en área 3x3 e inmoviliza a todos los enemigos (-2 PM).'
      }
    ]
  },
  stargazer: {
    id: 'stargazer',
    name: 'Astromante',
    title: 'Sabio de la Gravedad Cósmica',
    archetype: 'Sapidae Astromante (Manipulación Espacial y Vórtices)',
    description: 'Sabios que canalizan el poder de las fases lunares y la curvatura cósmica. Especialistas en posicionamiento táctico: transposición espacial con el Axie compañero, vórtices gravitacionales de colisión y saltos astrales.',
    icon: './assets/classes/class_astromante.jpg',
    iconImg: './assets/classes/class_astromante.jpg',
    emoji: '🔮',
    maxHP: 210,
    maxPA: 6,
    maxPM: 4,
    initiative: 92,
    spells: ['stargazer_vortex', 'stargazer_transpose', 'stargazer_jump', 'stargazer_nova', 'stargazer_gravity_well', 'stargazer_eclipse'],
    spellPreviews: [
      {
        id: 'stargazer_vortex',
        name: 'Vórtice Gravitacional',
        cost: '3 AP',
        range: '1-3',
        type: 'Gravedad / Colisión',
        icon: './assets/skills/heroes/stargazer/1.png',
        desc: 'Onda cósmica que inflige 40-52 de daño y empuja al enemigo 2 casillas con daño masivo de colisión.'
      },
      {
        id: 'stargazer_transpose',
        name: 'Transposición Estelar',
        cost: '2 AP',
        range: '1-4',
        type: 'Movilidad Dimensional',
        icon: './assets/skills/heroes/stargazer/2.png',
        desc: 'Curvatura espacial: intercambia instantáneamente de posición con el Axie compañero, otorgando +25 de Escudo a ambos.'
      },
      {
        id: 'stargazer_jump',
        name: 'Salto Astral',
        cost: '2 AP',
        range: '2-4',
        type: 'Teletransporte',
        icon: './assets/skills/heroes/stargazer/3.png',
        desc: 'Fase dimensional a casilla vacía (2-4 rango): gana +35 de Escudo y ralentiza (-1 PM) a los enemigos adyacentes.'
      },
      {
        id: 'stargazer_nova',
        name: 'Nova Estelar',
        cost: '3 AP',
        range: '1-3',
        type: 'Área Cósmica',
        icon: './assets/skills/heroes/stargazer/4.png',
        desc: 'Detona una estrella comprimida: 45-58 de daño en cruz y ciega a los enemigos reduciendo su alcance en -1.'
      },
      {
        id: 'stargazer_gravity_well',
        name: 'Pozo Gravitatorio',
        cost: '2 AP',
        range: '1-4',
        type: 'Alteración Espacial',
        icon: './assets/skills/heroes/stargazer/5.png',
        desc: 'Crea una zona de baja gravedad: aliados que la crucen ganan +2 PM y los enemigos pierden -1 PM.'
      },
      {
        id: 'stargazer_eclipse',
        name: 'Eclipse Cataclísmico',
        cost: '4 AP',
        range: '1-4',
        type: 'Supremo Gravitatorio',
        icon: './assets/skills/heroes/stargazer/6.png',
        desc: 'Invoca un eclipse total: desata 60-78 de daño masivo en área y atrae a todos los enemigos hacia el epicentro.'
      }
    ]
  }
};

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
    if (prev && prev.sapidaePortrait && !merged.sapidaePortrait) merged.sapidaePortrait = prev.sapidaePortrait;
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

              if (!slot.isSapidae || !slot.sapidaeModel) {
                slot.isSapidae = true;
                slot.sapidaeModel = 'sapidae-m-a';
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
      sapidaeModel: heroTemplate.sapidaeModel || 'sapidae-f-a',
      sapidaePortrait: heroTemplate.sapidaePortrait || null,
      playerName: heroTemplate.playerName || 'Ema',
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
      tutorialProgress: {
        isActive: true,
        currentStep: 'TALK_TO_PALADILL',
        hasOpenedQuestBook: false,
        hasEquippedSword: false,
        unlockedFeatures: { questBook: false, combat: false, inventory: false, worldMap: false }
      },
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
    if (progressData.inventory) slot.inventory = progressData.inventory;
    if (progressData.equipped) slot.equipped = progressData.equipped;
    if (progressData.progression) slot.progression = progressData.progression;
    if (progressData.sapidaeModel) slot.sapidaeModel = progressData.sapidaeModel;
    if (progressData.sapidaePortrait) slot.sapidaePortrait = progressData.sapidaePortrait;
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
