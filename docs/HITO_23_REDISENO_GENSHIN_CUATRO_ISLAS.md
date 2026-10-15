# Hito 23: Rediseño Genshin de las 4 Islas (Sabana, Ártico, Mística y Mazmorra)

> **Fecha de implementación:** Octubre 2026
> **Estado:** Completado y verificado (capturas headless + recorrido completo entre islas)
> **Módulos clave:** `world/islands/kit/*`, `world/islands/GrandIslandZone.js`, `world/islands/GrandIslands.js`, `world/islands/{arctic,mystic,dungeon}/*`, `world/savanna/SavannaGenshinArt.js`

---

## 1. Visión General

Las cuatro islas exteriores adoptan la dirección de arte de la Isla del Bosque (Hito 22): estilo anime, cel-shading suave, pintura pictórica y atmósfera con bruma. Cada isla tiene una geografía propia basada en la silueta que se ve desde el Bosque en mar abierto:

| Isla | Silueta de origen | Geografía | Hora / atmósfera |
|---|---|---|---|
| 🏜️ Sabana (Este, `zone_3_2`) | 5 mesetas escalonadas con acacias | Meseta de 25,5 m con terrazas y rampas; **oasis en la cima a ras de suelo**; peñas sueltas en el mar | Tarde dorada, neblina ocre-melocotón |
| ❄️ Ártico (Norte, `zone_2_1`) | 5 cuernos glaciares + plataformas de hielo | Anillo de cuernos al norte (fondo), valle glaciar en U, río y lago helados, plataformas de hielo al sur, icebergs | Mañana fría, aurora tenue, nieve |
| 🔮 Mística (Oeste, `zone_1_2`) | Árbol Arcano + 3 espiras | Colina con el Árbol Arcano (fondo), raíces-arco, **rocas grandes de cristal púrpura**, pantano luminoso, islotes flotantes | Atardecer violeta con estrellas, luciérnagas |
| 🌋 Mazmorra (Sur, `zone_2_3`) | Volcán + cráter lunar | **Luna volcánica: cráteres en todo el mapa** (grandes, medianos y pequeños; lunares y volcánicos), volcán de fondo, ríos de lava | Ocaso de brasas bajo ceniza, luna con cráteres |

La Isla del Bosque **no se modifica**: ningún archivo de `demo_scena/` cambia, y el kit reutiliza sus módulos por herencia.

---

## 2. Kit compartido (`src/rpg/world/islands/kit/`)

| Módulo | Función |
|---|---|
| `IslandTerrainData.js` | Hereda de `GenshinTerrainData`. Hornea altura, máscaras (césped, camino, flores, humedad/calor) y un *frame* de caminos (distancia con signo, tangente y medio ancho) a partir de polilíneas por isla. |
| `IslandTerrainMaterial.js` | Suelo pictórico iluminado (`MeshStandardMaterial` + parche): la misma función de color que el césped, hooks GLSL por isla (`islandSurface`, `islandCliff`), caminos de tierra a parches del Bosque (textura `ground_07`) re-teñidos y con relieve. |
| `IslandGrassField.js` | Hereda de `GenshinGrassField`: el mismo césped del Bosque (tiles, crossfade LOD, viento, pisadas), con paleta, flores (opcionalmente luminosas) y altura por isla. |
| `IslandTrees.js` | Hereda de `GenshinTrees`. Arquetipos nuevos: acacia de copa plana, palmera, árbol seco o carbonizado y **Árbol Arcano** gigante; nieve en las capas y brillo bioluminiscente opcionales. |
| `IslandMaterials.js` | Roca por bioma (musgo, nieve, ceniza, estratos de arenisca, vetas de magma emisivas) y **material de cristal** translúcido facetado (hielo, amatista, cuarzo lunar). |
| `IslandSky.js` | El cielo del Bosque más estrellas, luna con cráteres y cortinas de aurora. |
| `IslandWater.js` | Océano Genshin re-coloreado + cuerpos de agua que leen la profundidad del terreno: agua, hielo y lava. |
| `IslandParticles.js` | Partículas GPU alrededor del jugador: arena, nieve, esporas, brasas y destellos de hielo. |
| `IslandArtLayer.js` | Orquestador por isla: luz, niebla exponencial (se reaplica si otra zona la cambia), bloom, exposición, PostFX y estilo de personajes. |

---

## 3. Islas

### 3.1 Sabana (`SavannaGenshinArt.js`)
- `SavannaTerrain`: se elimina la cuenca hundida. El oasis queda **en la cima, a ras de la meseta**: repisa de arena a 25,4 m y laguna poco profunda con el agua ~25 cm por debajo de la orilla, de contorno orgánico.
- `SavannaWaterManager`: el agua, los peces y los juncos se colocan en el nuevo nivel.
- Hierba dorada alta, claros de arena, anillo de hierba verde alrededor del oasis, estratos de arenisca en las terrazas, caminos de arcilla rojiza a parches entre rampas, oasis y los 3 lugares de interés.
- Acacias y palmeras Genshin sobre las posiciones deterministas de `SavannaPropsManager`; árboles secos; rocas y arbustos re-estilizados.
- 4 peñas sueltas en el mar coronadas con acacias; océano Genshin.
- **Acacias con la copa apoyada en las ramas** (`IslandTrees.js`): la altura de la copa se calcula desde las puntas reales de las ramas (media de las puntas + 0,25 m). Ninguna nube de hojas queda por encima de su rama (como máximo 0,35 m sobre la punta). Antes la copa estaba a una altura fija y quedaba flotando.
- **Paleta de la sabana de Axie Infinity:**
  - copas de acacia lima (`0xa8cf3a`), amarillo verdoso (`0xdccb3c`), naranja (`0xf2a142`) y rojo coral (`0xf26b52`);
  - palmeras verde brillante (`0x7cc03a`);
  - troncos pálidos tipo baobab (corteza `normal` con tono claro) y árboles secos con corteza `pine`.
- **Pináculos y chimeneas de hada** (`_buildHoodoos`):
  - se construyen con las rocas del propio juego (`assets/nature/rocks/Rock_sabana1-5`, de 200 a 700 triángulos);
  - `rock_savanna_4`, `5`, `3` y `1` se estiran en vertical y forman pináculos de 4 a 14 m, en grupos de 1 a 3 sobre la meseta y las terrazas;
  - `rock_savanna_2` queda como peñasco redondeado;
  - su textura se reemplaza por arenisca estratificada en la paleta melocotón y naranja de Axie, con vetas oscuras (`islandRockMaterial`);
  - se dibujan instanciados por forma, no tapan los caminos y tienen colisiones con la etiqueta `savgenshin_hoodoo_`, que se añaden al activar la isla.

### 3.2 Ártico (`arctic/ArcticIsland.js`)
- 7 cuernos con aristas (el central de 62 m), valle en U con río helado, lago de permafrost, plataformas de hielo escalonadas e icebergs.
- **Cristales de hielo y permafrost**: las rocas del pack Ártico (`rock_smallA/B`, `stone_smallA`, de 16–24 triángulos) estiradas como esquirlas con material de hielo azul brillante, en grupos al pie de las rocas; `rock_smallFlatA` aplanada como placas de permafrost.
- Puntos de interés (los NPC conservan sus posiciones de misión): Valle de la Escarcha Eterna (tótems de hielo y corazón de cristal), Invernadero de Pomodoro (cúpula de cristal con jardín) y Campamento de Cocina Boreal (`house_artic`, `snowman_artic`, fogata con humo).

### 3.3 Mística (`mystic/MysticIsland.js`)
- Árbol Arcano de unos 45 m sobre la colina, con raíces en arco sobre el sendero e islotes flotantes.
- **Rocas grandes de cristal púrpura**: 3 espiras gigantes de amatista (las de la silueta), racimos de monolitos y peñascos de cristal con las formas de `StylisedRockCollection`. Solo las piedras pequeñas son de pizarra con musgo.
- Pantano luminoso con terrazas, fisura de la Nebulosa de Lunacia con polvo estelar, Santuario del Vacío Astral (monolitos flotantes alrededor de un altar estelar) y Observatorio del Oráculo.

### 3.4 Mazmorra (`dungeon/DungeonIsland.js`)
- **Cráteres en todo el mapa**:
  - 2 grandes: la Cripta Lunar, con los NPC en su fondo, y el de la Fortaleza, con su pico central.
  - 14 medianos: lunares, volcánicos con lava, o pozas que reflejan la luna.
  - 80 pequeños, como marcas de impacto.
- Volcán de fondo con lago de lava, cono secundario, domo de lava y 2 ríos de lava en sus cauces. Plataforma de la Caldera de Magma con puentes de piedra.
- Regolito plateado con mares oscuros, costra de basalto con grietas de magma pulsantes según el calor, columnas de basalto y cristales lunares fríos.
- Cripta (arco antiguo, columnas, lápidas y altar de huesos con portal brillante) y Fortaleza de las Sombras (torres, almenas, ventanas encendidas y antorchas).

---

## 4. Integración y rendimiento

- `GrandIslandZone` (480 m, el mismo sistema de coordenadas que el Bosque y la Sabana) se ocupa de:
  - el terreno, una `LightingManager` propia (oculta mientras la isla está inactiva) y las rocas GLTF instanciadas;
  - las colisiones, que se añaden al activar la isla y se quitan al salir (etiqueta `grandisle_<id>_`);
  - las siluetas de las demás islas en su posición relativa real.
- **Carga diferida**: cada isla nueva se construye la primera vez que el jugador viaja a ella; al arrancar el juego solo se crea un grupo vacío.
- Cambios en `OverworldManager.js` (`grandIslands`, `getGroundHeight`, `update`) y `WorldMapManager.js`:
  - `_updateGrandIslandVisuals`;
  - se omiten las decoraciones antiguas de 80 m;
  - `travelToIsland` incluye el Ártico, la Mística y la Mazmorra.
- Todo se dibuja con `InstancedMesh`; el césped mantiene el *crossfade LOD* y el *frustum culling* por tile. En el render de pruebas (SwiftShader, calidad baja) cada isla se queda entre 450 y 700 draw calls.
- Conmutador de la Sabana en consola: `window.savannaGenshinArt.setEnabled(false|true)`.

---

## 5. Pendiente / fuera del alcance de este hito
- Las siluetas de la Mística y la Mazmorra **vistas desde el Bosque** no se tocaron, para no alterar el entorno del Bosque.
- El minimapa y la pestaña "Mapa de la Isla" siguen mostrando los datos del Bosque cuando el jugador está en las islas nuevas, porque la interfaz no se modificó en este hito.
- ~~Los portales cardinales de la cuadrícula 3×3 siguen activos~~ → resuelto en la sección 6 (barquero Pomodoro).

---

## 6. Ajustes posteriores: NPC, monstruos, mundo demo y barquero

### 6.1 Auditoría de posiciones (render headless sobre los terrenos reales)
- **NPC**: los 15 NPC de las 5 islas quedan sobre el suelo real: por encima del mar, pendiente < 0,4, sin agua y sin colisiones de roca. Pomodoro (recluta) está dentro del invernadero, que es su sitio.
- **Monstruos**: los *presets* de patrulla de 80 m se sustituyen por anclas validadas por isla (`ISLAND_MONSTER_LAYOUT`). Cada ancla cumple:
  - sus 4 puntos de patrulla están por encima de 1,3 m, con pendiente < 0,42;
  - no tocan agua, lava ni colisiones;
  - están a ≥ 12 m de los NPC.

  En la Mazmorra, el *preset* antiguo cruzaba el borde de un cráter (pendiente 2,2).
- **Nodos de misión**:
  - antes se creaban a `y = 0`, enterrados bajo las islas; ahora se apoyan en el suelo;
  - el musgo del Bosque estaba dentro del arroyo y se movió a la orilla (11, −6,5);
  - la seta 2 del Ártico estaba dentro de una roca y se movió a (11,5, −9,5).

### 6.2 Mundo demo 1.0.0 retirado
- Los constructores del mundo de 80 m ya no se ejecutan (`LEGACY_DEMO_WORLD = false` en `OverworldManager`):
  - `DojoRockSanctuary`, `StylizedRiver`, `DojoBambooGrove`, `DojoBuilding`;
  - `ForestNatureManager`, el estanque del Dojo, `MagicalSkybox` y `ZoneParticleManager`;
  - los estanques secundarios.
- `StylizedEnvironment` arranca en modo `lightingOnly`: crea solo el sol, la luz hemisférica y la niebla base, sin césped, flores, árboles ni suelo.
- Medido al arrancar en el Bosque, sin cambio visual:

  | Métrica | Antes | Ahora |
  |---|---|---|
  | Objetos en escena | 4093 | 2136 |
  | Mallas | 2563 | 1414 |
  | Mallas ocultas | 1648 | 497 |
  | Heap JS | 159 MB | 133 MB |
  | Arranque | — | ~6 s menos |

### 6.3 Zonas de esquina fusionadas en sus islas (`world/islands/IslandWorldLayout.js`)
| Zona antigua | Isla | Contenido trasladado |
|---|---|---|
| [1, 1] Valle de la Escarcha | Ártico | Ermitaño Glacial (−52, −66) y la manada del Gólem Polar (−64, −72) |
| [3, 1] Yermos Áridos | Sabana | Manada (96, −64) y quimeras de misión Acorazada (64, 32) y Picuda (−40, −8) |
| [1, 3] Santuario del Vacío | Mística | Oráculo (34, −36), Chamán (−40, 40) y manada de la Dríade (−80, 16) |
| [3, 3] Catacumbas | Mazmorra | Espíritu de Atia (0, −13) y manada del Hombre Lobo (0, 104) |

- Las manadas fusionadas conservan su zona lógica (`logicalZone`), que se usa como `currentBattlingZoneKey`, así las misiones avanzan igual que antes.
- `canonicalZoneId()`:
  - convierte las zonas antiguas en su isla, tanto en `changeMap` y `loadMap` como en las partidas guardadas;
  - una partida guardada en una zona antigua aparece en el muelle de su isla.
- Entrar en la isla completa los pasos de “llegar a la zona” de la zona fusionada.

### 6.4 Barquero Pomodoro (sustituye a las flechas de teleport)
- `setPortals({})`: ya no hay anillos ni flechas cardinales.
- `ferry_pomodoro` (modelo `pomodoro.glb`, sin `heroId`, así que sigue allí tras reclutar a Pomodoro) está en la playa de cada isla:

  | Isla | Posición del barquero |
  |---|---|
  | Bosque | (43, 132) |
  | Sabana | (−133, 42), al pie de la rampa A |
  | Ártico | (14, 136) |
  | Mística | (136, 14) |
  | Mazmorra | (136, 18) |

- Al hablarle abre `ui/FerryTravelUI.js`:
  - muestra las 5 islas y la actual marcada;
  - viaja con la misma cortina de carga de los cambios de zona.
- Mientras el tutorial bloquea la salida, Pomodoro explica que aún no se puede zarpar.
- Al llegar en barca el jugador aparece junto al barquero (`FERRY_DOCKS.arrive`).
- La brújula de misión apunta al barquero cuando el objetivo está en otra isla (“⛵ Habla con Pomodoro en la playa ➔ Isla …”).

### 6.5 Misión “Hunt of the Beaked Chimera” (`WanderingMonsters.js`)
- **Causa:**
  - la quimera de misión usaba el modelo `bird-early`, que solo existe como héroe Axie y no como `.glb`, así que se mostraba una esfera de respaldo medio enterrada;
  - además, todos los monstruos aparecían a `y = 0` y solo se ajustaban al suelo al moverse. En la meseta de la Sabana, a unos 25 m, nacían dentro del terreno.
- **Solución:**
  - en el mapa, la Quimera Picuda Alfa usa el modelo `wolf-aquatic` teñido de ámbar, el mismo de la “Winged Beaked Chimera” de su manada. El combate no cambia y sigue usando `bird-early`;
  - `spawnMonster` coloca cada monstruo en la altura real del suelo al aparecer.

