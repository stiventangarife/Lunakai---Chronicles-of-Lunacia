# Archivos de audio a conseguir (fases 2 y 3 del plan de sonido)

> **Para qué:** el viento, el agua, el fuego, la interfaz y la «voz de pitidos» de los NPC se sintetizan en el navegador (Hito 86). Lo que suena natural solo con grabaciones son los pájaros, los animales, los pasos y los golpes. Esta es la lista.
> **Dónde ponerlos:** `axie-tactics-web/assets/sounds/sfx/<carpeta>/<nombre>` con **exactamente** el nombre de la tabla. El código los buscará ahí. Si falta alguno, ese sonido sigue sintetizado o en silencio.

## Formato

| | |
|---|---|
| **Formato** | MP3 (vale en todos los navegadores, como la música) |
| **Calidad** | 44,1 kHz, **mono**, 96–128 kbps |
| **Volumen** | Normalizado a pico −1 dBFS; sin silencio al principio (que el golpe empiece en el primer milisegundo) |
| **Duración** | La de la tabla (corta = menos memoria: cada segundo descomprimido ocupa ~170 KB en mono) |
| **Variantes** | Cuando dice «×4», 4 archivos parecidos pero distintos (`_1` … `_4`): el juego elige uno al azar y cambia un poco el tono para que no suene repetido |
| **Licencia** | CC0 o «royalty-free» con uso comercial. Guarda el enlace de cada archivo en `assets/sounds/sfx/CREDITOS.txt` |

**Dónde buscar:**
- Kenney: «RPG Audio», «Impact Sounds» e «Interface Sounds», todos CC0 → kenney.nl/assets.
- Freesound.org con el filtro de licencia «Creative Commons 0».
- OpenGameArt.org, filtrando por CC0.
- Sonniss «GDC Game Audio Bundle», royalty-free.
- Para los términos de búsqueda, la columna «Buscar» va en inglés.

**Total aproximado:** 100 archivos, unos 3–4 MB.

---

## 0. Fondos en bucle (`ambience/`), **prioridad alta**

El agua es lo más difícil de sintetizar con naturalidad. Si pones estos archivos en `axie-tactics-web/assets/sounds/ambience/`, el juego los usa solo, sin tocar código; mientras falten, suena la versión sintetizada. Estos sí van en **estéreo**, a 128–160 kbps, y tienen que **enlazar sin corte** (el final empata con el principio: busca «seamless loop» o recorta en un cruce por cero).

| Archivo | Duración | Qué es | Dónde suena | Buscar |
|---|---|---|---|---|
| `river_loop.mp3` | 20–40 s | Río o arroyo tranquilo, agua corriendo entre piedras, sin pájaros | Junto al río del Bosque | gentle river stream loop, brook water flowing |
| `rapids_loop.mp3` | 20–40 s | Agua rápida o cascada pequeña, más fuerte que el río | Rápidos del puente | river rapids loop, small waterfall loop |
| `sea_waves_loop.mp3` | 30–60 s | Olas suaves rompiendo en una playa, sin gaviotas ni viento | Costas de todas las islas | gentle ocean waves beach loop |
| `campfire_loop.mp3` | 15–30 s | Hoguera crepitando, de cerca | Hogueras de Sabana y Ártico | campfire crackling loop |

Más adelante, al revisar cada isla, se pueden añadir sus fondos propios (sabana con insectos, viento ártico, pantano nocturno).

## 1. Pájaros y fauna ambiental (`sfx/fauna/`)

Sonidos sueltos que el ambiente lanza de vez en cuando, con eco y desde un lado o el otro.

| Archivo | Variantes | Duración | Qué es | Isla | Buscar |
|---|---|---|---|---|---|
| `bird_songbird_N.mp3` | ×4 | 1–3 s | Canto de pájaro cantor de bosque templado (petirrojo, mirlo, pinzón), alegre | Bosque | songbird chirp single, robin song short |
| `bird_woodpecker_N.mp3` | ×2 | 1–2 s | Carpintero golpeando un tronco a lo lejos | Bosque | woodpecker drumming distant |
| `bird_dove_N.mp3` | ×2 | 2–3 s | Paloma o tórtola, arrullo suave | Bosque, Génesis | dove coo |
| `bird_seagull_N.mp3` | ×3 | 1–2 s | Gaviota | Playas (todas las islas) | seagull call single |
| `bird_hawk_N.mp3` | ×2 | 1–3 s | Grito de halcón o águila, lejano | Sabana | hawk cry distant, red tailed hawk |
| `bird_exotic_N.mp3` | ×3 | 1–2 s | Pájaro tropical o de sabana (tejedor, abejaruco) | Sabana | african bird chirp |
| `bird_owl_N.mp3` | ×2 | 1–2 s | Búho, ulular suave | Mística | owl hoot soft |
| `bird_snow_N.mp3` | ×2 | 1 s | Pájaro pequeño de invierno (carbonero, escribano nival), pocas notas | Ártico | chickadee call, snow bunting |
| `bird_garden_N.mp3` | ×3 | 1–2 s | Canto melodioso y limpio (ruiseñor, curruca) | Génesis | nightingale short phrase |
| `frog_N.mp3` | ×3 | 0,5–1 s | Croar de rana | Mística (pantano) | frog croak single |
| `cricket_loop.mp3` | ×1 | 4–6 s, **en bucle sin corte** | Grillos de fondo, tenue | Mística | crickets loop seamless |
| `cicada_N.mp3` | ×2 | 4–8 s | Cigarra subiendo y bajando | Sabana | cicada buzz |
| `insect_buzz_N.mp3` | ×2 | 1–2 s | Abejorro o mosca que pasa | Bosque, Sabana | bee fly by |
| `wolf_howl_far_N.mp3` | ×2 | 3–4 s | Aullido muy lejano | Ártico | wolf howl distant |

## 2. Pasos (`sfx/steps/`)

Un paso es un solo contacto, no una secuencia. Lo dispara la animación del Sapidae. El Axie usa los mismos más agudos.

| Archivo | Variantes | Duración | Superficie | Buscar |
|---|---|---|---|---|
| `step_grass_N.mp3` | ×4 | 0,2–0,4 s | Hierba | footstep grass single |
| `step_dirt_N.mp3` | ×4 | 0,2–0,4 s | Camino de tierra | footstep dirt gravel |
| `step_wood_N.mp3` | ×4 | 0,2–0,4 s | Puentes, muelle, porches | footstep wood plank |
| `step_stone_N.mp3` | ×4 | 0,2–0,4 s | Piedra (pueblo, plaza de Génesis) | footstep stone |
| `step_sand_N.mp3` | ×4 | 0,2–0,4 s | Arena (playas, Sabana) | footstep sand |
| `step_snow_N.mp3` | ×4 | 0,3–0,5 s | Nieve | footstep snow crunch |
| `step_ice_N.mp3` | ×3 | 0,2–0,4 s | Hielo (lago y ríos del Ártico) | footstep ice |
| `step_water_N.mp3` | ×3 | 0,3–0,5 s | Agua somera (sustituye al chapoteo sintetizado) | footstep shallow water splash |
| `land_soft_N.mp3` | ×2 | 0,3 s | Aterrizar tras un salto (combate) | jump land soft |

## 3. Combate: golpes e impactos (`sfx/combat/`)

Cada carta suena por **clase** (lo que golpea) y **peso** (coste en PA: 1 ligero, 2 medio, 3+ pesado). El peso cambia volumen y grave; los archivos son por clase.

| Archivo | Variantes | Duración | Qué es | Buscar |
|---|---|---|---|---|
| `hit_beast_N.mp3` | ×3 | 0,3–0,5 s | Golpe sordo de garra o mordisco, carnoso | punch flesh impact, claw hit |
| `hit_plant_N.mp3` | ×3 | 0,3–0,5 s | Latigazo vegetal o crujido de hojas y madera | whip leaves impact, wood snap |
| `hit_aquatic_N.mp3` | ×3 | 0,3–0,5 s | Salpicadura con golpe | water splash impact |
| `hit_bird_N.mp3` | ×3 | 0,2–0,4 s | Golpe rápido con aleteo o silbido | wing flap hit, swoosh hit |
| `hit_bug_N.mp3` | ×3 | 0,2–0,4 s | Chasquido quitinoso o pinchazo | insect crunch, stab |
| `hit_reptile_N.mp3` | ×3 | 0,3–0,5 s | Mordida con siseo o golpe de escamas | snake hiss bite |
| `hit_magic_N.mp3` | ×3 | 0,4–0,6 s | Impacto mágico (habilidades del Sapidae) | magic impact spell hit |
| `whoosh_light_N.mp3` | ×3 | 0,2–0,3 s | Barrido de aire corto (ataque que sale) | whoosh short |
| `whoosh_heavy_N.mp3` | ×2 | 0,4–0,6 s | Barrido grave (ataque pesado, salto) | whoosh heavy |
| `crit_N.mp3` | ×2 | 0,5–0,8 s | Remate de crítico: golpe con brillo metálico | critical hit sting |
| `block_shield_N.mp3` | ×3 | 0,3 s | Escudo que para el golpe, «tink» metálico o mágico | shield block metal |
| `shield_break.mp3` | ×1 | 0,6 s | Escudo que se rompe como cristal | glass shatter magic |
| `heal_N.mp3` | ×2 | 0,8–1,2 s | Curación: brillo ascendente suave | heal spell chime |
| `buff.mp3` | ×1 | 0,6 s | Potenciar | power up short |
| `debuff.mp3` | ×1 | 0,6 s | Debilitar (descendente, oscuro) | debuff curse |
| `poison_tick.mp3` | ×1 | 0,4 s | Burbujeo de veneno | poison bubble |
| `stun.mp3` | ×1 | 0,6 s | Aturdido: pajaritos o campanas que giran | stun dizzy |
| `faint_enemy_N.mp3` | ×2 | 0,8–1,2 s | Quimera que cae (gemido corto, no gore) | creature death cute |
| `faint_ally.mp3` | ×1 | 1 s | Aliado que cae (triste, suave) | sad defeat short |
| `ult_charge.mp3` | ×1 | 1,5–2 s | Subida que anuncia la Ultimate lista | magic charge riser |
| `ult_impact.mp3` | ×1 | 1,5–2,5 s | Golpe enorme con cola grave | cinematic boom impact |
| `turn_timer_tick.mp3` | ×1 | 0,1 s | Tic de reloj (últimos 5 s del turno) | clock tick single |
| `heartbeat.mp3` | ×1 | 1 s, **en bucle** | Latido suave (vida baja) | heartbeat loop |

## 4. Axies y monstruos (`sfx/creatures/`)

Voces **cortas y simpáticas** (estilo Pokémon o Animal Crossing), nada realista ni agresivo.

| Archivo | Variantes | Duración | Qué es | Buscar |
|---|---|---|---|---|
| `axie_happy_N.mp3` | ×3 | 0,3–0,6 s | Gorjeo alegre de criatura pequeña (caricia, comida) | cute creature happy chirp |
| `axie_curious_N.mp3` | ×2 | 0,3–0,5 s | «¿Mm?» curioso (quieto, mira a un NPC) | cute creature curious |
| `axie_sad.mp3` | ×1 | 0,5 s | Quejido (vínculo bajo) | cute creature whine |
| `axie_attack_N.mp3` | ×3 | 0,2–0,4 s | Grito corto de esfuerzo al atacar | cute creature attack grunt |
| `axie_hurt_N.mp3` | ×2 | 0,2–0,4 s | «¡Ay!» al recibir daño | cute creature hurt |
| `slime_boing_N.mp3` | ×3 | 0,2–0,4 s | Salto blandito de slime | slime jump boing |
| `slime_squish.mp3` | ×1 | 0,4 s | Slime aplastado (al caer) | slime squish |
| `chimera_growl_N.mp3` | ×3 | 0,6–1 s | Gruñido de quimera (amenaza amable) | monster growl small |
| `chimera_alert.mp3` | ×1 | 0,5 s | Grito al detectarte, junto al «!» | monster alert screech short |
| `boss_roar.mp3` | ×1 | 1,5–2 s | Rugido de jefe (inicio del combate con jefe) | monster roar big |

> Las voces del Axie se afinan por clase en el código (más grave en Bestia y Reptil, más aguda en Pájaro y Bicho). No hace falta un archivo por clase.

## 5. Recolección y mundo (`sfx/world/`)

| Archivo | Variantes | Duración | Qué es | Buscar |
|---|---|---|---|---|
| `fishing_cast.mp3` | ×1 | 0,6 s | Lanzar la caña: silbido del hilo | fishing rod cast whoosh |
| `fishing_bobber.mp3` | ×1 | 0,3 s | Corcho que cae al agua, «plop» | small object water plop |
| `fishing_bite.mp3` | ×1 | 0,5 s | Pez que pica: salpicadura y tirón | fish splash bite |
| `fishing_reel.mp3` | ×1 | 1–1,5 s | Carrete recogiendo | fishing reel |
| `fish_catch.mp3` | ×1 | 0,6 s | Pez fuera del agua (coleteo) | fish flop |
| `chop_wood_N.mp3` | ×3 | 0,3–0,5 s | Hachazo en tronco | axe chop wood |
| `tree_fall.mp3` | ×1 | 1,5 s | Crujido de rama o árbol (al terminar la tala) | tree branch crack |
| `mine_rock_N.mp3` | ×3 | 0,3–0,5 s | Pico contra roca | pickaxe rock hit |
| `rock_break.mp3` | ×1 | 0,8 s | Roca que se parte | rock break |
| `pick_flower_N.mp3` | ×2 | 0,3 s | Arrancar planta (crujido vegetal) | pluck plant |
| `anvil_N.mp3` | ×3 | 0,6–1 s | Martillo en yunque (Forja, también de ambiente) | anvil hammer hit |
| `chest_open.mp3` | ×1 | 1 s | Abrir cofre | wooden chest open |
| `coins_N.mp3` | ×2 | 0,4–0,6 s | Monedas (comprar, vender, oro del combate) | coins handful |
| `bag_open.mp3` | ×1 | 0,5 s | Abrir bolsa de runas o charms | cloth bag open |
| `boat_oars_loop.mp3` | ×1 | 4–6 s, **en bucle** | Remos en el agua (viaje en barca) | rowing boat oars loop |
| `door_wood.mp3` | ×1 | 0,8 s | Puerta de madera (entrar al dojo o la tienda, futuro) | wooden door open |

## 6. Interfaz «premium» (`sfx/ui/`), opcional

La interfaz ya suena sintetizada desde el Hito 86. Estos archivos solo la harían más rica.

| Archivo | Variantes | Duración | Qué es | Buscar |
|---|---|---|---|---|
| `ui_page_N.mp3` | ×2 | 0,3 s | Pasar página (Diario de misiones) | book page turn |
| `ui_paper.mp3` | ×1 | 0,4 s | Desplegar pergamino o mapa | paper unfold |
| `quest_complete.mp3` | ×1 | 1,5–2 s | Misión completada (fanfarria corta) | quest complete jingle |
| `level_up.mp3` | ×1 | 2 s | Subida de nivel | level up fanfare |
| `item_rare.mp3` | ×1 | 1 s | Objeto épico o místico revelado | magical item reveal |

---

**Importante (Hito 87):** el juego solo busca las grabaciones de `assets/sounds/sfx/` si existe **`assets/sounds/sfx/CREDITOS.txt`**, aunque esté vacío al principio. Así no salen errores 404 mientras no haya archivos. Los fondos en bucle de `assets/sounds/ambience/` no lo necesitan.

**Cuando los tengas:** pon las carpetas en `assets/sounds/sfx/` y avísame. Los conecto en las fases 2 y 3, y los que falten seguirán sonando sintetizados.
