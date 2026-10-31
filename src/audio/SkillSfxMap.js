// SkillSfxMap.js — Tipo de ataque de cada carta para el sonido de las habilidades (fase 2 del plan de audio de skills).
//
// El pack de sonidos (assets/sounds/sfx/skills/, manifest.json) tiene, por clase, 7 animaciones de ataque:
//   bite (mordisco) · gore (cornada, embestida, estocada, picado) · slash (zarpazo, tajo, latigazo cortante) ·
//   smash (golpe contundente: algo que cae, aplasta o azota) · cast (magia sin objeto que vuele: ondas, auras, rayos de luz,
//   espíritus que aparecen, apoyo) · projectile (disparo recto: dardos, chorros, espinas, flechas, ráfagas) ·
//   throw (objeto lanzado en parábola: fruta, huevo, nuez, pelota).
// Archivos por clase: <clase>_<anim>_attack (las 7) · <clase>_<cast|projectile|throw>_hit · <clase>_fly ·
// <clase>_<projectile|throw>_fly. Los cuerpo a cuerpo (bite/gore/slash/smash) no tienen _hit: el golpe ya va en _attack.
//
// La animación sale de lo que DIBUJA el VFX estilizado de la carta (cabecera de cada mod-estilizado-*.js), no solo de la
// parte: así el sonido cuenta lo mismo que se ve. «+» = algo cruza el tablero entre lanzador y objetivo (criatura, onda,
// raíz bajo tierra…): ese viaje puede sonar con <clase>_fly. projectile y throw siempre viajan.
//
// La clase del sonido es la del Axie que lanza (Mech, Dawn y Dusk tienen sonidos propios), no la de la carta: un Mech con
// una carta de Bestia suena a Mech haciendo ese movimiento, como en Origins.
//
// Uso (fase 3): skillSfx(spell, caster) → { cls, anim, travel, role, attack, fly, hit } con claves del manifiesto, o null
// si no tiene sonido propio (enemigos). Fase 4: también el Sapidae (SAPIDAE_SFX), gólems, estados y Ultimates (abajo).
// Consola: lunakaiSkillSfx.check(PART_CARDS_LIST) revisa que todas las cartas tengan entrada.

export const SKILL_ANIMS = ['bite', 'gore', 'slash', 'smash', 'cast', 'projectile', 'throw'];
export const SOUND_CLASSES = ['aquatic', 'beast', 'bird', 'bug', 'dawn', 'dusk', 'mech', 'plant', 'reptile'];
const MELEE = new Set(['bite', 'gore', 'slash', 'smash']);
const HAS_HIT = new Set(['cast', 'projectile', 'throw']);
const CLASS_ALIAS = { aqua: 'aquatic', insect: 'bug' };

/** id de carta (sin «part_») → animación; «+» = viaja hasta el objetivo. */
export const CARD_ANIM = {
  // ---------------------------------------------------------------- Bestia
  beast_horn_arco: 'gore+',            // cuerna de carnero que carga en línea y embiste
  beast_horn_dual_blade: 'slash',      // dos tajos en X
  beast_horn_imp: 'slash',             // salto y zarpazo
  beast_horn_little_branch: 'gore+',   // rama espinosa que crece en arco y se clava
  beast_horn_merry: 'cast+',           // hilo dorado al aliado, cúpula de lana
  beast_horn_pocky: 'throw',           // palito que gira en vuelo y se clava
  beast_horn_boomerang: 'throw',
  beast_horn_lump: 'cast+',            // pulsos de vigor al aliado
  beast_mouth_axie_kiss: 'throw',      // corazón que vuela en arco
  beast_mouth_goda: 'bite',
  beast_mouth_nut_cracker: 'bite',     // mandíbulas que cascan la nuez
  beast_mouth_puff: 'projectile',      // chorro de vapor
  beast_mouth_foxy: 'bite+',           // zorro de fuego que salta y muerde
  beast_mouth_platypus: 'smash',       // pico contra el suelo, onda
  beast_mouth_confident: 'cast',
  beast_ears_belieber: 'projectile',   // tres ráfagas de sonido por el pentagrama
  beast_ears_innocent_lamb: 'cast',
  beast_ears_nut_cracker: 'throw',     // nueces que orbitan y salen
  beast_ears_nyan: 'slash+',           // embestida baja con vetas de garra
  beast_ears_foxy: 'projectile',       // disparo con mira
  beast_ears_puppy: 'cast',
  beast_ears_zen: 'cast',
  beast_eyes_chubby: 'smash',          // pata espectral gigante
  beast_eyes_little_peas: 'projectile',
  beast_eyes_zeal: 'cast',
  beast_eyes_puppy: 'cast',
  beast_eyes_sobby: 'projectile',      // chorros de lágrimas
  beast_eyes_sparky: 'cast',
  beast_back_furball: 'throw',         // ovillo que bota
  beast_back_hero: 'slash',            // espada de luz
  beast_back_jaguar: 'slash+',         // jaguar espiritual, tres zarpazos
  beast_back_risky_beast: 'gore+',     // cometa carmesí, cuerpo a cuerpo
  beast_back_ronin: 'slash',           // iaido
  beast_back_timber: 'cast+',          // raíces al aliado, corteza
  beast_tail_rice: 'smash',            // bola de arroz que golpea
  beast_tail_cottontail: 'cast+',      // copos de algodón al aliado
  beast_tail_nut_cracker: 'smash',     // latigazo contra el suelo
  beast_tail_shiba: 'bite+',           // Shiba de fuego que salta y muerde
  beast_tail_buba_brush: 'cast+',      // kanji 火 que vuela y estalla
  beast_tail_gerbil: 'slash+',         // jerbo que corre y da dos zarpazos
  beast_tail_hare: 'smash+',           // liebre en tres brincos, doble patada
  // ---------------------------------------------------------------- Planta
  plant_horn_bamboo_shoot: 'gore+',    // raíz bajo tierra, cañas que brotan y lanzan
  plant_horn_beech: 'gore+',           // ariete de roble disparado
  plant_horn_mandarine: 'throw',       // mandarina en parábola al aliado
  plant_horn_persimmon: 'throw',
  plant_horn_rose_bud: 'cast+',
  plant_horn_strawberry_shortcake: 'throw',
  plant_horn_watermelon: 'throw',      // sandía que rueda y revienta
  plant_horn_cactus: 'projectile',     // ráfaga de espinas
  plant_mouth_serious: 'bite',         // trampa carnívora
  plant_mouth_silence_whisper: 'cast+',
  plant_mouth_zigzag: 'gore+',         // raíces que corren bajo tierra y revientan en espinas
  plant_mouth_herbivore: 'bite',
  plant_mouth_beetroot: 'smash',       // remolacha que cae como un mazo
  plant_ears_leafy: 'projectile',      // remolino de hojas cortantes
  plant_ears_lotus: 'cast',
  plant_ears_rosa: 'cast+',            // ramas de rosas que brotan bajo el rival
  plant_ears_sakura: 'cast',
  plant_ears_hollow: 'smash',          // tronco que cae del cielo
  plant_ears_clover: 'cast+',
  plant_eyes_risky_trunk: 'smash',     // tronco en llamas que cae
  plant_eyes_blossom: 'cast',
  plant_eyes_confusion: 'projectile',  // chorro de esporas
  plant_eyes_cucumber_slice: 'cast',
  plant_eyes_papi: 'cast+',
  plant_back_succulent: 'cast',
  plant_back_bidens: 'cast',
  plant_back_death_shroom: 'cast',
  plant_back_forest_hero: 'slash',     // espada-hoja que cae en arco
  plant_back_mint: 'cast',
  plant_back_pumpkin: 'smash',         // calabaza que cae sobre el aliado
  plant_back_turnip: 'throw',
  plant_back_watering_can: 'cast',
  plant_back_shiitake: 'cast',
  plant_tail_carrot: 'throw',          // zanahoria-flecha en arco
  plant_tail_cattail: 'projectile',
  plant_tail_hatsune: 'cast+',
  plant_tail_hot_butt: 'projectile',   // llamarada de chile
  plant_tail_mystery_seed: 'cast',
  plant_tail_potato_leaf: 'bite+',     // hojas que se cierran como trampa
  plant_tail_shield_shroom: 'cast',
  plant_tail_sprout: 'cast',
  plant_tail_tropical_guardian: 'cast+',
  plant_tail_yam: 'throw',
  // ---------------------------------------------------------------- Acuático
  aquatic_horn_anemone: 'projectile',  // tres dardos urticantes
  aquatic_horn_babylonia: 'gore+',     // caracola que avanza como taladro
  aquatic_horn_clamshell: 'bite',      // valvas que se cierran
  aquatic_horn_shoal_star: 'projectile',
  aquatic_horn_teal_shell: 'cast+',
  aquatic_horn_oranda: 'smash+',       // pez oranda que cae en picado
  aquatic_mouth_catfish: 'cast+',      // pez gato que descarga electricidad
  aquatic_mouth_lam: 'bite+',
  aquatic_mouth_piranha: 'bite+',
  aquatic_mouth_risky_fish: 'smash+',  // salto alto y picado
  aquatic_ears_bubblemaker: 'cast+',
  aquatic_ears_gill: 'projectile',     // anillos de vórtice
  aquatic_ears_inkling: 'projectile',  // chorro de tinta
  aquatic_ears_nimo: 'cast',
  aquatic_ears_tiny_fan: 'cast',
  aquatic_ears_little_crab: 'bite',    // pinzas de cangrejo
  aquatic_ears_seaslug: 'smash+',      // oleada de mucosa que rompe baldosas
  aquatic_eyes_clear: 'cast',
  aquatic_eyes_gero: 'throw',          // esfera de agua en parábola
  aquatic_eyes_sleepless: 'cast+',
  aquatic_eyes_telescope: 'cast',
  aquatic_eyes_baby: 'cast',
  aquatic_back_anemone: 'slash+',      // látigo de agua que cruza el tablero
  aquatic_back_blue_moon: 'cast',
  aquatic_back_hermit: 'cast',
  aquatic_back_perch: 'projectile',    // perca torpedo
  aquatic_back_sponge: 'cast',
  aquatic_back_goldfish: 'gore+',      // pez que se lanza como un dardo
  aquatic_tail_koi: 'smash+',          // carpa que salta y cae
  aquatic_tail_ranchu: 'cast',
  aquatic_tail_tadpole: 'projectile',  // burbuja de renacuajos
  aquatic_tail_puff: 'projectile',     // púas del pez globo
  aquatic_tail_nimo: 'cast',
  aquatic_tail_navaga: 'projectile',
  aquatic_tail_shrimp: 'projectile',
  // ---------------------------------------------------------------- Pájaro
  bird_horn_cuckoo: 'cast',
  bird_horn_feather_spear: 'projectile',
  bird_horn_trump: 'cast+',            // cono de anillos sónicos
  bird_horn_big_sister: 'cast',
  bird_horn_eggshell: 'throw',
  bird_horn_wing_horn: 'projectile',
  bird_horn_kestrel: 'slash+',         // cernícalo en picado, tres cortes
  bird_mouth_little_owl: 'cast',       // ultrasonido
  bird_mouth_peace_maker: 'cast+',     // paloma que deja caer un halo
  bird_mouth_feather_dagger: 'projectile',
  bird_mouth_hungry_bird: 'bite',      // picotazos
  bird_mouth_doubletalk: 'cast+',
  bird_ears_curly: 'projectile',
  bird_ears_little_owl: 'gore+',       // búho en picado
  bird_ears_peace_maker: 'cast+',
  bird_ears_pink_cheek: 'cast',
  bird_ears_risky_bird: 'gore+',       // halcón en picado suicida
  bird_ears_early_bird: 'gore+',       // vencejo en picado rasante
  bird_eyes_little_owl: 'gore+',
  bird_eyes_lucas: 'cast',
  bird_eyes_concentrate: 'cast',
  bird_eyes_passion: 'cast',
  bird_eyes_mavis: 'cast',
  bird_eyes_robin: 'gore+',            // petirrojos en picado
  bird_back_balloon: 'throw',
  bird_back_cupid: 'projectile',       // flecha
  bird_back_kingfisher: 'cast+',
  bird_back_lil_bro: 'bite+',          // polluelo que picotea
  bird_back_raven: 'gore+',
  bird_back_tri_feather: 'projectile',
  bird_back_paper_wing: 'slash+',      // grulla de papel que corta
  bird_back_rubber_duckling: 'smash',  // patito que cae sobre el aliado
  bird_back_pigeon_post: 'cast+',
  bird_tail_cloud: 'cast+',            // nubarrón con relámpagos
  bird_tail_feather_fan: 'projectile', // medias lunas de viento
  bird_tail_granmas_fan: 'projectile', // brisa en línea
  bird_tail_post_fight: 'projectile',
  bird_tail_the_last_one: 'projectile',
  bird_tail_swallow: 'slash+',
  // ---------------------------------------------------------------- Bicho
  bug_horn_caterpillars: 'cast+',      // enjambre de orugas
  bug_horn_lagging: 'projectile',      // glóbulo de baba
  bug_horn_leaf_bug: 'cast',
  bug_horn_parasite: 'bite+',          // garrapata que salta y muerde
  bug_horn_pliers: 'bite',             // pinzas
  bug_horn_antenna: 'cast',
  bug_mouth_cute_bunny: 'cast',        // chillido
  bug_mouth_mosquito: 'gore+',         // aguijón
  bug_mouth_pincer: 'bite',
  bug_mouth_square_teeth: 'bite',
  bug_ears_earwing: 'projectile',
  bug_ears_leaf_bug: 'cast',
  bug_ears_tassels: 'cast',
  bug_ears_termite: 'cast',
  bug_ears_brimstone: 'cast',
  bug_ears_ear_breathing: 'projectile',
  bug_ears_beetle_spike: 'projectile',
  bug_ears_larva: 'cast',
  bug_eyes_bookworm: 'cast',
  bug_eyes_kotaro: 'slash+',           // guadañas de sombra
  bug_eyes_neo: 'projectile',          // rayos finos
  bug_eyes_nerdy: 'cast',
  bug_eyes_ladybug_goggles: 'cast',
  bug_eyes_pacu: 'bite',
  bug_back_buzz_buzz: 'projectile',    // enjambre en zigzag
  bug_back_garish_worm: 'projectile',  // glóbulo de ácido
  bug_back_sandal: 'smash',
  bug_back_scarab: 'gore+',            // escarabajo que sale del suelo
  bug_back_snail_shell: 'cast+',
  bug_back_spiky_wing: 'projectile',
  bug_tail_ant: 'cast',
  bug_tail_fish_snack: 'throw',
  bug_tail_gravel_ant: 'cast+',
  bug_tail_pupae: 'cast+',
  bug_tail_thorny_caterpillar: 'gore+', // bola espinosa que rueda
  bug_tail_twin_tail: 'gore',          // aguijones
  bug_tail_centipede: 'bite+',
  bug_tail_shield_crusher: 'smash',    // mazo de escarabajo
  bug_tail_leaf_bug: 'cast',
  // ---------------------------------------------------------------- Reptil
  reptile_horn_bumpy: 'cast',
  reptile_horn_cerastes: 'cast+',
  reptile_horn_incisor: 'gore',        // colmillo que sube y empala
  reptile_horn_poison_tube: 'projectile',
  reptile_horn_scaly_spear: 'projectile',
  reptile_horn_scaly_spoon: 'cast+',
  reptile_horn_unko: 'smash',          // pila que cae del cielo
  reptile_mouth_chemical_fang: 'bite',
  reptile_mouth_kotaro: 'bite+',       // fauces de sombra
  reptile_mouth_razor_bite: 'bite',
  reptile_mouth_tiny_turtle: 'bite+',
  reptile_mouth_toothless_bite: 'bite+',
  reptile_mouth_tiny_dino: 'smash',    // cola que golpea el suelo (apoyo)
  reptile_ears_curved_spine: 'cast+',
  reptile_ears_friezard: 'cast',
  reptile_ears_hidden_ears: 'cast',
  reptile_ears_pogona: 'projectile',
  reptile_ears_sidebarb: 'projectile',
  reptile_ears_small_frill: 'cast',
  reptile_ears_swirl: 'cast',
  reptile_ears_venom_nail: 'slash+',   // cuchillas que barren el suelo
  reptile_eyes_punky: 'cast',
  reptile_eyes_scar: 'cast',
  reptile_eyes_topaz: 'projectile',
  reptile_eyes_gecko: 'cast',
  reptile_eyes_tricky: 'cast',
  reptile_back_bone_sail: 'cast+',
  reptile_back_croc: 'cast',
  reptile_back_green_thorns: 'throw',  // espinas que llueven en arco
  reptile_back_indian_star: 'cast+',
  reptile_back_red_ear: 'cast+',
  reptile_back_tri_spikes: 'projectile',
  reptile_tail_gila: 'cast',           // onda de veneno a todos
  reptile_tail_grass_snake: 'bite+',
  reptile_tail_iguana: 'slash',        // coletazo que barre
  reptile_tail_snake_jar: 'throw',
  reptile_tail_tiny_dino: 'smash',     // mazo de cola
  reptile_tail_wall_gecko: 'slash+',   // cola que vuela y azota
};

/** Cartas α de Bing y Pomodoro (id completo). */
export const STARTER_ANIM = {
  starter_bing_eyes: 'cast',
  starter_bing_ears: 'projectile',     // ladrido en medias lunas
  starter_bing_mouth: 'bite',
  starter_bing_horn: 'throw',          // pelota de goma
  starter_bing_back: 'cast',
  starter_bing_tail: 'bite+',          // Shiba
  starter_pomodoro_eyes: 'cast',
  starter_pomodoro_ears: 'cast',
  starter_pomodoro_mouth: 'smash',     // Platypus
  starter_pomodoro_horn: 'cast',
  starter_pomodoro_back: 'gore',       // estandarte en lanza
  starter_pomodoro_tail: 'cast',
};

// ------------------------------------------------------------------ Fase 4 · Sapidae, gólems, estados y Ultimates
//
// El pack no trae sonidos del Sapidae: cada clase toma el timbre de una clase de Axie que encaja con su lore y le suma
// una «firma» sintetizada (CombatSfx._layer) que la hace reconocible:
//   Alfarero (arcilla, losas)        → reptil/bestia + «clay»   (golpe sordo de barro y terrones)
//   Comandante (sombrero, viento)    → pájaro/dawn  + «call»   (dos notas de silbato de orden)
//   Guardián (Wind Bells, curación)  → dawn         + «bell»   (campana de bronce inarmónica) · Luna de Sangre «moon»
//   Rastreador (piedra, musgo, Gogo) → planta/dusk  + «rumble» (la piedra que retumba) · Espiral del Alba «star»
// Formato: 'clase:anim[+]|firma[|support]'. «support» = no suena el impacto (la cura, el escudo o el estado suenan solos).
export const SAPIDAE_SFX = {
  craft_clay_fist: 'beast:smash|clay',                       // puño de arcilla que golpea en línea
  craft_sentinel_golem: 'reptile:cast|clay|support',         // vasija que se tornea (la salida suena con el gólem)
  craft_stone_veins: 'reptile:cast+|clay|support',           // hilo dorado y losas que se ajustan
  craft_clay_wall: 'reptile:smash|clay|support',             // la muralla brota del suelo
  craft_carry_wounded: 'plant:cast+|clay|support',
  craft_fortify: 'reptile:cast+|clay|support',               // placas de arcilla que vuelan y se cierran
  shepard_hat_headbutt: 'bird:throw|call',                   // el sombrero vuela en arco y cabecea
  shepard_hat_golem: 'bird:smash|call|support',              // el gran sombrero cae del cielo
  shepard_translate_warning: 'bird:cast+|call|support',
  shepard_shared_order: 'dawn:cast+|call|support',           // tres ondas de orden
  shepard_guided_retreat: 'bird:cast|call|support',
  shepard_relief: 'bird:cast+|call|support',                 // dos sombreros que se cruzan
  lunalogist_alarm_toll: 'dawn:cast+|bell',                  // la campana tañe y tres anillos viajan
  lunalogist_bell_golem: 'dawn:cast|bell|support',
  lunalogist_mourning_tone: 'dawn:cast|bell|support',
  lunalogist_warning_whisper: 'dawn:cast|bell|support',
  lunalogist_purify: 'dawn:smash|bell',                      // una campana cae y golpea
  lunalogist_blood_moon: 'dusk:cast|moon|support',
  stargazer_yielding_ground: 'plant:smash|rumble',           // el suelo se hunde en un pozo de barro
  stargazer_shell_golem: 'plant:cast|rumble|support',
  stargazer_petrasense: 'reptile:cast+|rumble|support',      // ondas por la piedra (el Frágil suena solo)
  stargazer_shell_march: 'plant:cast|rumble|support',
  stargazer_corrupt_rift: 'dusk:cast|rumble|support',
  stargazer_dawn_spiral: 'dawn:cast|star',
};

// ------------------------------------------------------------------ Enemigos (Hito 108 · sonido de enemigos)
//
// Cada habilidad enemiga toma el timbre de la clase de Axie que mejor encaja con la criatura y lo que hace su VFX
// (VFX.ENEMY_ROWS: MORDISCO, ZARPAZO, GOLPE, EMBESTIDA, ESCUPITAJO, FLECHA, RUGIDO, CURA, ESCUDO…), más una firma
// sintetizada de criatura (CombatSfx._layer) y, a veces, un golpe genérico del pack que refuerza el impacto (x:clave):
//   slimes → acuático (planta en el bosque, reptil/dusk en la caverna y el volcán) + «slime» (boing viscoso) · liquid_hit
//   lobos → bestia o acuático + «growl» en los mordiscos y zarpazos · «roar» / «howl» en rugidos y aullidos
//   hombre lobo y jefe → bestia/dusk + gruñido, aullido y «quake» (terremoto) en el cataclismo
//   treants → planta (golpes de madera y raíces) · dríadas → planta, dawn y pájaro (flechas: sharp_edged_hit)
//   osos → bestia (cucharón y zarpas: tackle / sharp_edged_hit) · quimera y Kibo → reptil/dusk · novas de hielo → «frost»
// Formato igual que el Sapidae: 'clase:anim[+]|firma|support|x:golpe' (las piezas tras la primera, en cualquier orden).
export const ENEMY_SFX = {
  chimera_bite: 'reptile:bite|growl',
  chimera_bellow: 'dusk:cast|roar',
  chimera_spit: 'reptile:projectile|x:liquid_hit',
  chimera_heal: 'reptile:cast|roar|support',
  chimera_frost_nova: 'aquatic:cast|frost',
  kibo_cataclysm: 'dusk:cast|quake',
  slime_strike: 'aquatic:smash|slime|x:liquid_hit',
  slime_barrier: 'aquatic:cast|slime|support',
  slime_attack_spit: 'aquatic:projectile|slime|x:liquid_hit',
  slime_attack_goo: 'aquatic:smash|slime|x:liquid_hit',
  slime_defense_slam: 'aquatic:gore|slime|x:liquid_hit',
  slime_defense_barrier: 'aquatic:cast|slime|support',
  slime_support_pinch: 'aquatic:bite|slime',
  slime_support_heal: 'aquatic:cast|slime|support',
  slime_forest_a_swipe: 'plant:slash|slime',
  slime_forest_a_spit: 'plant:projectile|slime|x:liquid_hit',
  slime_forest_a_thorn: 'plant:projectile|x:sharp_edged_hit',
  slime_forest_b_slam: 'reptile:smash|slime|x:liquid_hit',
  slime_forest_b_spit: 'dusk:projectile|slime|x:liquid_hit',
  slime_forest_b_heavy: 'reptile:gore|slime',
  slime_fusion_burst: 'aquatic:cast|slime|x:liquid_hit',
  wolf_aquatic_bite: 'aquatic:bite|growl|x:fuzzy_hit',
  wolf_aquatic_alpha_splash: 'aquatic:bite|growl|x:liquid_hit',
  wolf_aquatic_alpha_roar: 'aquatic:cast|roar',
  wolf_gray_bite: 'beast:bite|growl|x:fuzzy_hit',
  wolf_gray_slash: 'beast:slash|growl|x:sharp_edged_hit',
  wolf_alpha_bite: 'beast:bite|growl|x:fuzzy_hit',
  wolf_alpha_roar: 'beast:cast|roar',
  wolf_alpha_nova: 'aquatic:cast|frost',
  wolf_alpha_howl: 'beast:cast|howl|support',
  werewolf_crush: 'beast:smash|growl|x:tackle',
  werewolf_slam: 'beast:gore|frost|x:tackle',
  werewolf_roar: 'dusk:cast|roar|support',
  werewolf_boss_bite: 'dusk:bite|growl|x:fuzzy_hit',
  werewolf_boss_roar: 'dusk:cast|howl',
  werewolf_boss_cataclysm: 'dusk:cast|quake',
  treant_flower_slam: 'plant:smash|frost|x:tackle',
  treant_flower_nova: 'plant:cast|frost',
  treant_fighter_punch: 'plant:smash|x:tackle',
  treant_fighter_bash: 'plant:gore|x:tackle',
  treant_fighter_bark: 'plant:cast|support',
  treant_spore: 'plant:throw',
  treant_entangle: 'plant:cast+',
  dryad_fighter_blade: 'plant:gore|x:sharp_edged_hit',
  dryad_fighter_dance: 'bird:slash',
  dryad_fighter_slash: 'dawn:slash|x:sharp_edged_hit',
  dryad_mage_spark: 'dawn:projectile|x:laser_hit',
  dryad_mage_heal: 'dawn:cast|support',
  dryad_mage_burst: 'dawn:cast',
  dryad_mage_orb: 'dawn:projectile|x:laser_hit',
  dryad_mage_blast: 'plant:projectile',
  dryad_mage_barrier: 'plant:cast|support',
  dryad_range_arrow: 'bird:projectile|x:sharp_edged_hit',
  dryad_range_snipe: 'bird:projectile|x:sharp_edged_hit',
  dryad_range_root: 'plant:cast+',
  bear_mom_strike: 'beast:smash|x:tackle',
  bear_mom_roar: 'beast:cast|roar',
  bear_mom_slam: 'beast:smash|growl|x:tackle',
  bear_dad_claw: 'beast:slash|growl|x:sharp_edged_hit',
  bear_dad_roar: 'beast:cast|roar',
  bear_dad_shield: 'beast:cast|support',
  bear_dad_slam: 'beast:smash|growl|x:tackle',
  // héroes antiguos que aún están en SPELLS_DB (Kotaro, Early Bird, Big Yak, Bing, Pomodoro de la versión 1)
  kotaro_slash: 'bug:slash', kotaro_push: 'bug:gore', kotaro_jump: 'bug:smash', kotaro_bite: 'bug:bite',
  kotaro_roar: 'bug:cast|support', kotaro_frenzy: 'bug:slash|x:sharp_edged_hit',
  bird_cupid: 'bird:projectile', bird_owl: 'bird:cast', bird_aerial_jump: 'bird:smash', bird_feather_barrage: 'bird:projectile',
  bird_tailwind: 'bird:cast|support', bird_sky_dive: 'bird:gore',
  plant_cactus: 'plant:gore', plant_drain: 'plant:bite', plant_shield: 'plant:cast|support', plant_bramble_trap: 'plant:cast+',
  plant_photosynthesis: 'plant:cast|support', plant_seed_burst: 'plant:throw',
  bing_explosive: 'beast:throw', bing_retreat: 'beast:gore', bing_slow: 'beast:projectile',
  pomodoro_heal: 'bug:cast|support', pomodoro_stim: 'bug:cast|support', pomodoro_bramble: 'plant:projectile',
};

/** Gólems: clase de timbre y firma (invocación con summon_on, rotura con summon_off). */
export const GOLEM_SFX = {
  sentinel: { cls: 'reptile', layer: 'clay' },
  hat: { cls: 'bird', layer: 'call' },
  bell: { cls: 'dawn', layer: 'bell' },
  shell: { cls: 'plant', layer: 'rumble' },
};

/**
 * Estado → sonido del pack al aplicarse (null = el sintetizado de siempre). Lo que no está usa buff/debuff según su tipo.
 * tick: sonido del daño por turno (más bajo).
 */
export const STATUS_SFX = {
  poison: 'poison', bleed: 'bleed', burn: null, stun: 'stunned', sleep: 'sleep', fear: 'fear', taunt: 'taunt',
  fragile: 'vulnerable', weak: 'weak', empowered: 'damage_boost', guarded: 'buff', guardedRanged: 'feather',
  critUp: 'damage_boost', rangeDown: 'doubt', rangeUp: 'buff', healBlock: 'heal_block', reflect: 'reflect_damage',
  reflectPct: 'reflect_damage', retaliate: 'reflect_damage', immune: 'cleanser', regen: 'leaf', soulLink: 'secret',
  jinx: 'hex', nurtured: 'heal_alt', barrier: 'bubble', unmovable: 'buff', ward: 'secret', drained: 'silent',
  slowed: 'debuff', energized: 'power_gain', hasted: 'feather',
};
export const STATUS_TICK_SFX = { poison: 'poison_alt', bleed: 'bleed' };

/** Otros momentos del combate con sonido del pack. */
export const EVENT_SFX = {
  heal: 'heal', bigHeal: 'cure', drain: 'drain', shield: 'shield', shieldBreak: 'shield_break', crit: 'critical',
  cleansed: 'cleanse', dispelled: 'dispel', barrierPop: 'bubble_bomb', counter: 'counter', resisted: 'doubt',
  paGain: 'power_gain', paLoss: 'silent', runeProc: 'secret', ultReady: 'power_awaken', summon: 'summon_on',
  unsummon: 'summon_off', buff: 'buff', debuff: 'debuff',
};

/**
 * Ultimates de dúo: guion de sonido sobre su VFX (ti = impacto; los valores son los del VFX estilizado y se usan si el
 * efecto no informa el suyo). «{c}» es la clase del Axie del dúo (la tríada decide la Ultimate).
 *   rise:   sonido que arranca con el lanzamiento · travel: sonidos de la fase central (de `at` hasta el impacto)
 *   strike: archivos cuyo golpe cae en ti (como los cuerpo a cuerpo) · impact: archivos que empiezan en ti
 *   synth:  capas sintetizadas (riser hasta ti, trueno antes de ti, boom en ti, acorde)
 */
export const ULTIMATE_SFX = {
  duo_destructiva: {      // Ola de arcilla: el dúo carga sobre una ola de barro y rompe contra el rival
    ti: 1.4, rise: ['power_awaken'], travel: [{ key: '{c}_fly', at: 0.6 }, { key: 'aquatic_fly', at: 0.65, vol: 0.6 }],
    strike: ['{c}_gore_attack', 'beast_smash_attack'], impact: ['shield_break'], synth: ['riser', 'clay', 'boom'],
  },
  duo_gaia: {             // Égida de arcilla: pilares que se alzan, cúpula, púas bajo los rivales y curación
    ti: 1.78, rise: ['power_awaken'], travel: [{ key: '{c}_cast_attack', at: 0.8 }],
    strike: ['reptile_smash_attack'], impact: ['shield', 'cure'], synth: ['riser', 'rumble', 'chord', 'boom'],
  },
  duo_maelstrom: {        // Tornado de arcilla, agua y plumas; relámpago y detonación en cruz
    ti: 1.8, rise: ['power_awaken'], travel: [{ key: 'aquatic_fly', at: 0.25 }, { key: 'bird_fly', at: 0.7, vol: 0.7 }],
    strike: [], impact: ['aquatic_cast_hit', '{c}_cast_hit'], synth: ['riser', 'thunder', 'boom'],
  },
};

/** Claves de la Ultimate para la clase del Axie del dúo. */
export function ultimateKeys(spellId, axieClass) {
  const u = ULTIMATE_SFX[spellId];
  if (!u) return [];
  const c = SOUND_CLASSES.includes(axieClass) ? axieClass : 'beast';
  const fill = (k) => k.replace('{c}', c);
  return [...u.rise, ...u.travel.map((t) => t.key), ...u.strike, ...u.impact].map(fill);
}

/** Habilidad del Sapidae o de un enemigo → { cls, anim, travel, layer, support, extra, source }. */
export function sapidaeSfx(spellId) {
  const v = SAPIDAE_SFX[spellId] || ENEMY_SFX[spellId];
  if (!v) return null;
  const [ca, ...rest] = v.split('|');
  const [cls, a] = ca.split(':');
  const anim = a.replace('+', '');
  let layer = null, support = false, extra = null;
  for (const p of rest) {
    if (p === 'support') support = true;
    else if (p.startsWith('x:')) extra = p.slice(2);
    else if (p) layer = p;
  }
  return {
    cls, anim, travel: a.endsWith('+') || anim === 'projectile' || anim === 'throw', layer, support, extra,
    source: SAPIDAE_SFX[spellId] ? 'sapidae' : 'enemy',
  };
}

/** Claves del pack que puede pedir un hechizo por sus efectos (estados, curas, escudos…): se precargan con el combate. */
export function effectKeys(spell) {
  const keys = new Set();
  for (const e of spell?.effects || []) {
    if (e.type === 'status') { const k = STATUS_SFX[e.status]; if (k !== null) keys.add(k || 'buff'); const t = STATUS_TICK_SFX[e.status]; if (t) keys.add(t); }
    else if (e.type === 'heal') keys.add((e.amount || e.max || 0) >= 45 ? EVENT_SFX.bigHeal : EVENT_SFX.heal);
    else if (e.type === 'drain') keys.add(EVENT_SFX.drain);
    else if (e.type === 'shield' || e.type === 'ward') keys.add(EVENT_SFX.shield);
    else if (e.type === 'shieldBreak') keys.add(EVENT_SFX.shieldBreak);
    else if (e.type === 'cleanse') keys.add(EVENT_SFX.cleansed);
    else if (e.type === 'dispel') keys.add(EVENT_SFX.dispelled);
    else if (e.type === 'summonGolem') { keys.add(EVENT_SFX.summon); keys.add(EVENT_SFX.unsummon); }
    else if (e.type === 'resource' && (e.pa || 0) > 0) keys.add(EVENT_SFX.paGain);
    else if (e.type === 'resource' && (e.pa || 0) < 0) keys.add(EVENT_SFX.paLoss);
  }
  return [...keys];
}

/** Regla para cartas sin entrada (partes nuevas, cartas de colección propias). */
export function ruleAnim(spell) {
  const fx = spell?.effects || [];
  const dmg = fx.some((e) => e.type === 'damage') || (spell?.baseMaxDamage || 0) > 0;
  const far = (Number(spell?.maxRange) || 0) > 1;
  if (!dmg) return 'cast';
  switch (spell?.part) {
    case 'mouth': return far ? 'projectile' : 'bite';
    case 'horn': return far ? 'projectile' : 'gore';
    case 'back': return far ? 'projectile' : 'slash';
    case 'tail': return far ? 'throw' : 'smash';
    default: return far ? 'projectile' : 'cast';     // ojos y orejas
  }
}

const parse = (v) => (v ? { anim: v.replace('+', ''), travel: v.endsWith('+') } : null);

/** { anim, travel, source } de una carta de Axie (variantes y colección usan su carta base). null si no es carta de Axie. */
export function cardAnim(spell) {
  if (!spell) return null;
  const ids = [spell.id, spell.baseCardId].filter(Boolean);
  for (const id of ids) {
    const v = STARTER_ANIM[id] || CARD_ANIM[String(id).replace(/^part_/, '')];
    if (v) { const r = parse(v); r.travel = r.travel || r.anim === 'projectile' || r.anim === 'throw'; r.source = 'table'; return r; }
  }
  if (!spell.isPartCard && !spell.part) return null;
  const anim = ruleAnim(spell);
  return { anim, travel: anim === 'projectile' || anim === 'throw', source: 'rule' };
}

/** Clase del sonido: la del Axie que lanza; si no la tiene (o no es un Axie), la de la carta. */
export function soundClass(caster, spell) {
  const norm = (c) => { const k = String(c || '').toLowerCase(); return CLASS_ALIAS[k] || k; };
  const own = caster && !caster.isSapidae && !caster.isGolem ? norm(caster.axieClass || caster.config?.axieClass) : '';
  if (SOUND_CLASSES.includes(own)) return own;
  const card = norm(spell?.class);
  return SOUND_CLASSES.includes(card) ? card : null;
}

/** ¿Hace daño o rompe escudos a un enemigo? (si no, es de apoyo). */
export function skillRole(spell) {
  const fx = spell?.effects || [];
  const hurts = fx.some((e) => ['damage', 'shieldBreak', 'statusMultiply'].includes(e.type))
    || (fx.length === 0 && (spell?.baseMaxDamage || 0) > 0);
  return hurts ? 'attack' : 'support';
}

/**
 * Claves de sonido (las del manifiesto) para lanzar una carta.
 * attack: al salir el ataque · fly: mientras viaja (null si no viaja) · hit: al impactar (null en cuerpo a cuerpo: el
 * golpe ya va dentro de attack).
 */
export function skillSfx(spell, caster = null) {
  const sap = spell && sapidaeSfx(spell.id);
  if (sap) {          // fase 4: Sapidae · Hito 108: enemigos (timbre de una clase de Axie afín + firma sintetizada)
    const { cls, anim, travel, layer, support, extra, source } = sap;
    const fly = !travel ? null : anim === 'projectile' ? `${cls}_projectile_fly` : anim === 'throw' ? `${cls}_throw_fly` : `${cls}_fly`;
    return {
      cls, anim, travel, layer, melee: MELEE.has(anim), role: support ? 'support' : 'attack', source,
      attack: `${cls}_${anim}_attack`, fly, hit: HAS_HIT.has(anim) && !support ? `${cls}_${anim}_hit` : null,
      extra: support ? null : extra,      // golpe genérico del pack que refuerza el impacto (enemigos)
    };
  }
  const a = cardAnim(spell);
  const cls = a && soundClass(caster, spell);
  if (!a || !cls) return null;
  const fly = !a.travel ? null
    : a.anim === 'projectile' ? `${cls}_projectile_fly`
      : a.anim === 'throw' ? `${cls}_throw_fly` : `${cls}_fly`;
  return {
    cls, anim: a.anim, travel: a.travel, melee: MELEE.has(a.anim), role: skillRole(spell), source: a.source,
    attack: `${cls}_${a.anim}_attack`,
    fly,
    hit: HAS_HIT.has(a.anim) ? `${cls}_${a.anim}_hit` : null,
  };
}

/** Diagnóstico: cartas sin entrada en la tabla y reparto de animaciones. lunakaiSkillSfx.check(PART_CARDS_LIST) */
export function check(cards = []) {
  const missing = [], count = {};
  for (const c of cards) {
    const a = cardAnim(c);
    if (!a || a.source !== 'table') missing.push(c.id);
    if (a) count[a.anim] = (count[a.anim] || 0) + 1;
  }
  const extra = Object.keys(CARD_ANIM).filter((k) => cards.length && !cards.some((c) => c.id === `part_${k}`));
  return { cartas: cards.length, sinEntrada: missing, sobrantes: extra, reparto: count };
}

if (typeof window !== 'undefined') window.lunakaiSkillSfx = { skillSfx, cardAnim, soundClass, check, CARD_ANIM, STARTER_ANIM, SAPIDAE_SFX, ENEMY_SFX, STATUS_SFX, ULTIMATE_SFX };
