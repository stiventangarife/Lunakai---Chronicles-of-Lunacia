# Hito 31: Fase 4 — Cartas de partes (235) y Axies reales

> **Estado:** completado. Cada Axie del jugador lucha con las 6 cartas de sus partes reales (ojos, orejas, boca, cuerno, espalda, cola), leídas de la blockchain a través de la API de Sky Mavis o, sin conexión, de sus genes.

## Qué cambia en el juego

- Al entrar en un combate (salvo el tutorial), el juego mira las partes de cada Axie del escuadrón y le da sus 6 cartas oficiales en las ranuras 1-6 del HUD, en este orden: **ojos · orejas · boca · cuerno · espalda · cola**. La Ultimate sigue en la 7.
- Las clases secretas (Mech, Dawn, Dusk) usan la carta de la clase de cada parte; la clase del Axie solo cuenta para el triángulo elemental y la Ultimate.
- Si un Axie no se puede resolver (sin API y sin genes, o con una parte que el catálogo no conoce), **conserva sus hechizos de siempre**: nunca se inventan cartas.
- El tutorial sigue enseñando con los hechizos de siempre (su guion apunta a la ranura 1).

Ejemplos con los Axies iniciales:

| Axie | Cartas |
| --- | --- |
| #10455 Shinji | Gero · Nyan · Tiny Turtle · Trump · Green Thorns · Tiny Dino |
| #3797905 Early Bird | Puppy · Early Bird · Little Owl · Scaly Spoon · Cupid · The Last One |
| #10830416 Big Yak | Blossom · Hollow · Zigzag · Cactus · Bidens · Iguana |

## Cómo se resuelven las cartas (`rpg/AxiePartsResolver.js`)

1. **Caché de la partida** (`slot.partCards[axieId]`): la segunda vez es instantáneo y funciona sin conexión; viaja con el guardado en la nube.
2. **API de Sky Mavis** (`AxieMixerService.fetchAxieData` → `parts { name, class, type }`), con 3,5 s de límite.
3. **Genes** decodificados con el decodificador del Axie Mixer (`AXIE_GENES_DECODER`) + la tabla `tactics/data/PartVariants.js`.
4. Si nada funciona: `null` → hechizos de siempre.

`main.js` llama a `_resolvePartCards()` al empezar cada combate (máximo ~4 s en total) y al crear las unidades usa `partsResolver.idsFor(hero)`.

### La tabla de variantes

Los genes de 512 bits guardan, por parte, la clase y un número de variante; el nombre no está en los genes. La tabla se construyó con **133 Axies reales del marketplace** (192 partes regulares, 0 conflictos):

- Orejas, cuerno, espalda y cola: 6 variantes por clase (02, 04, 06, 08, 10, 12).
- Ojos y boca: 4 variantes por clase (02, 04, 08, 10).
- Las partes especiales (Japón, verano, navidad, místicas…) no están en la tabla: se resuelven por la API y quedan en caché.

Para ampliarla o regenerarla: **`tools/part-mapper.html`** (`http://localhost:8082/tools/part-mapper.html`). Muestrea el marketplace, decodifica los genes en el navegador, enseña la cuadrícula de cobertura (verde = tiene carta) y descarga un `PartVariants.js` nuevo.

Alias (nombre real de la parte ≠ nombre del GDD): `Owl` → Little Owl (orejas), `Confused` → Confusion (ojos). Rice es una **cola** (el GDD la listaba como espalda; corregido).

Las partes con **skin especial** (místicas, Japón, navidad, verano, Nightmare/Shiny: Crystal Hermit, Kuro Koi, Hazy Shiny…) comparten variante con su parte base y usan su carta: si la API da un nombre que el catálogo no conoce, el resolutor decodifica los genes que devuelve la propia API.

## El catálogo (`tactics/data/PartCards.js`)

- **235 cartas** generadas a partir del GDD y de la hoja de cálculo (`gen_cards.py`): 41 Beast, 39 Bug, 39 Bird, 43 Plant, 35 Aquatic, 38 Reptile.
- Costes: 34 de 1 PA, 176 de 2 PA, 24 de 3 PA y 1 de coste X (Puff).
- Objetivos: 138 a enemigo, 48 a uno mismo, 41 a aliado, 7 a cualquier casilla, 1 a casilla vacía.
- Todas descritas por datos (`effects`) y con descripción en español.
- **Daño en rango:** ±10 % alrededor del valor del GDD (la media no cambia): 65 → 58–72. Se ajusta con `SPREAD` en `gen_cards.py`.
- **Ilustración original** en `assets/cards/<clase>-<parte>-<variante>.webp` (256 px, unos 12 KB cada una; 238 imágenes, 2,9 MB). La carta la enlaza en `art` y el HUD la usa como icono. 230 de 235 cartas la tienen; Boomerang, Platypus, Mystery Seed, Shield Shroom y Pacu usan el icono de la parte (`assets/parts`).
  - Partes regulares: el nombre del archivo es la misma clave que la tabla de variantes.
  - Partes exclusivas de Origins (variantes impares 01, 03, 05…): no salen en el marketplace; se emparejaron viendo la ilustración (Baby, Sparky, Lump, Rubber Duckling, Death Shroom…). Sin carta asignada: aquatic-horn-01, beast-mouth-03/05, bird-back-03, bird-tail-01, plant-horn-05, plant-mouth-01, reptile-back-03.
  - Para regenerar: `python3 gen_cards.py && node build_partcards.mjs` (en la carpeta de herramientas).
- **65 cartas adaptadas** a las reglas del juego; la nota está en el campo `adaptation` de cada una.

Reglas de adaptación aplicadas:

| Concepto de Origins | En Lunakai |
| --- | --- |
| Banish | Se ignora |
| Initial | El bonus se aplica siempre |
| Reactivar / reiniciar / recuperar / refrescar | +2 PA ahora |
| Reducir el coste de la siguiente carta | +1 PA ahora |
| Cargas, familias, «por carta jugada», reserva, secretos, sigilo, invocaciones con PV, charcos | Eliminados |
| Sparky | +2 PA |
| «Una vez por combate» | No existe (solo la Ultimate) |

## Motor de combate: lo nuevo

- **Estados:** Gafe (sin críticos), Nutrido (+% de curación recibida), Represalia (devuelve daño al próximo atacante, una vez), Barrera (anula el próximo golpe hasta su valor), Reflejo (devuelve un % de cada golpe), Arraigado (no se puede empujar ni atraer), Guarda (reacción al recibir un golpe: asustar, sangrar, debilitar, ralentizar al atacante, o dar escudo/PA/potenciado; puede ser solo cuerpo a cuerpo).
- **Efectos:** `shieldBreak` (fijo o %), `selfDamage` (nunca mata al lanzador), `transferDebuffs`, `statusMultiply`, `ward`.
- **Condiciones:** golpe crítico, objetivo dañado, enemigos en superioridad numérica, vida del lanzador, vida del objetivo, objetivo con escudo, distancia mínima, aliado solo, enemigo con escudo, ronda máxima.
- **Bonus:** por aliado vivo, por aliado de una clase, por estado del objetivo, por % del escudo propio.
- **Coste X:** gasta todos los PA y golpea una vez por PA gastado.

## Catálogo oficial de Origins

La API de Sky Mavis `/origins/v2/community/cards` da las 588 cartas oficiales con su gen exacto (clase, parte, variante). Con ella:

- Las ilustraciones se enlazan por la clave oficial, no a ojo. Corrige, entre otras, Lil Bro (`bird-back-01`), Paper Wing (`bird-back-03`), Termites (`bug-ears-01`), Brimstone (`bug-ears-03`) y Puff de boca (`beast-mouth-03`).
- **Beetroot** es una boca (`plant-mouth-01`), no unas orejas.
- Renombres del GDD: Feather Dagger = Feathery Dart, Termite = Termites, Shield Crusher = Shield Shattering, Bamboo Shoot = Bamboo Spear.
- **Boomerang, Mystery Seed, Shield Shroom y Pacu** no existen en el Origins actual.
- La tabla queda en `origins_parts.txt`, en la carpeta de herramientas.

## Bing y Pomodoro: Axies iniciales de Origins

Son dos Axies iniciales oficiales de Origins; las texturas de sus modelos 3D se llaman `T_Char_Axies_Bing` y `T_Char_Axies_Pomodoro`. Usan las versiones «α» de sus cartas, que tienen efectos propios (`tactics/data/StarterCards.js`). Antes solo tenían 3 hechizos inventados. Las partes se confirmaron con sus modelos y con las ilustraciones oficiales: la de la cola Leaf Bug muestra a Pomodoro.

| Ranura | Bing (Beast en Origins) | Pomodoro (Bug en Origins) |
| --- | --- | --- |
| Ojos | Puppy: cura 5 + Potenciado a un aliado | Passion: cura 5 y quita 3 perjuicios |
| Orejas | Puppy: 45–55 + cura 12 a todos | Leaf Bug: +60 escudo y Protegido a un aliado |
| Boca | Puppy: 50–61 + Potenciado a todos | Platypus: +20 escudo a todos |
| Cuerno | Toy Ball: 45–55 + Provocación | Lost Dream: +50 escudo y Protegido; +20 escudo a todos |
| Espalda | Cone Shell: cura 60 | Village Hero: 45–55, +10 por aliado con escudo (máx. +40) |
| Cola | Shiba: 117–143 + Potenciado a todos | Leaf Bug: +60 escudo y Protegido a un aliado |

Traducción: Rage → Potenciado +20 % (2 turnos); Bulwark → Protegido −20 % (2 turnos). Cocoon, robar cartas, Ethereal y Purify no existen en el motor.

**Clases originales:** Bing pasa a ser **Beast** y Pomodoro **Bug**, como en Origins. Esto afecta al triángulo elemental, a la Ultimate y al icono de clase. Las ilustraciones son las oficiales de sus cartas α (`assets/cards/starter/`).

**Historia actualizada:** Bing deja de ser «el arquero alado». Ahora es un alegre cachorro Beast que defiende su reserva de helados en la Sabana y anima al escuadrón con su Toy Ball y sus ladridos; la misión «Prove Your Ferocity», sus diálogos, su campamento y su título (🐶 Savannah Pup) se reescribieron. Pomodoro pasa de «guardián botánico sanador» a «Leaf-Shell Guardian»: un cocinero Bug que se refugia bajo hojas de otoño y protege con su sartén. Conserva su misión del brote de Atia y su papel de barquero.

Pendiente opcional: el campamento de Bing todavía tiene dianas de tiro con arco en 3D (`SavannaLandmarksManager.js`).

## Partes de colección especial

Las partes de colección son «skins» de una parte base: mismo gen con otro valor de skin (1 Mystic, 2 Bionic, 3 Japan, 4–5 Xmas, 6–8 Summer, 12 Nightmare, 13 Shiny).

- **Japan (18) y Xmas (12) tienen carta de colección** (`tactics/data/CollectionCards.js`). Su efecto es el mismo que el de su carta base, porque Sky Mavis dice que «funcionan igual que sus partes originales en combate». Cambian el nombre (Kendama en lugar de Imp, Rudolph en lugar de Zigzag…), la ilustración y el VFX. La tabla sale de 23.510 Axies del marketplace.
- **Todas las colecciones tienen VFX propio** al lanzar la carta de esa parte (`combat/CollectionVFX.js`): pétalos de sakura (Japan), nieve (Xmas), estrellas (Mystic), gotas y sol (Summer), humo morado (Nightmare), destellos arcoíris (Shiny) y chispas eléctricas (Bionic). Escucha `spell:cast` y se desinstala con `uninstall()`, así que el motor de VFX propio puede sustituirlo.
- El resolutor saca la skin de cada parte de los genes (de la API o de la partida) y guarda las colecciones en la caché, que pasa a la versión 2: las cachés antiguas se vuelven a resolver una vez.

Las 30 cartas de colección tienen su propia ilustración (`assets/cards/collection/`). Imágenes pendientes: `docs/IMAGENES_PENDIENTES_CARTAS.md`.

## Consola (F12)

- `lkDebug.auditParts()` — tabla con las cartas de cada Axie del escuadrón y su fuente (caché / API / genes).
- `lunakaiParts.resolve({ axieId: 10455 }, { force: true })` — vuelve a resolver un Axie.

## Pruebas

`phase4.mjs` (40 comprobaciones): las 235 cartas se lanzan sin errores ni NaN; guarda, barrera, represalia, reflejo, rotura de escudo, coste X, arraigado, nutrido, gafe, traspaso de perjuicios, multiplicar estado y los bonus nuevos; los 3 Axies iniciales dan las mismas cartas por la API y por los genes; la tabla de variantes; y el resolutor (API, caché, sin conexión, API colgada, sin datos). Las regresiones de las fases 0-3 y Axie Care siguen en verde.

## Fase 5 (completada)

La integración y la primera pasada de equilibrio están en el [Hito 32](HITO_32_FASE_5_INTEGRACION_Y_EQUILIBRIO.md):

- pronóstico de daño;
- ajustes de coste y valor de 14 cartas;
- 1 uso por turno para las cartas que dan PA o PM;
- registro de partidas reales.

Sigue pendiente revisar las 65 adaptaciones con más partidas.
