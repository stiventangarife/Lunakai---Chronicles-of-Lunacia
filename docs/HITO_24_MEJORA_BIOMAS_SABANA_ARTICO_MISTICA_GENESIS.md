# Hito 24: Mejora de Biomas (Bosque, Sabana, Ártico, Mística) y Rediseño de Genesis

> **Fecha de implementación:** Octubre 2026 (13 – 16 oct)
> **Estado:** Completado y verificado (capturas headless, sondas de colisión, recorrido completo entre las 5 islas)
> **Módulos clave:** `demo_scena/ForestBridge.js`, `savanna/SavannaGenshin{Landmarks,Oasis,Nature}.js`, `islands/arctic/*`, `islands/mystic/*`, `islands/dungeon/*` (Genesis), `MapRegistry.js`, `IslandWorldLayout.js`, `QuestManager.js`, `NPCManager.js`

---

## 1. Visión General

Tras el rediseño Genshin de las islas (Hito 23), cada bioma recibe un **plan de mejora** con puntos de interés propios, vida ambiental y NPC reubicados junto a su lugar. La antigua **Mazmorra** se rediseña casi por completo y pasa a llamarse **Genesis**, el bioma oficial de Axie Infinity: los *Jardines Reales del Origen*.

Reglas que se mantuvieron en todo el hito:
* Cada cambio afecta solo al bioma pedido; los demás entornos no se tocan.
* Los nuevos lugares se construyen con **primitivas estilizadas** (cel-shading suave) como marcadores de posición, hasta tener assets propios.
* Patrón de primitivas: `bakeParts([geometría, color])` → una malla fusionada con color por vértice + una malla de brillo (`MeshBasicMaterial`, `toneMapped: false`). Cada lugar cuesta 1–2 draw calls.
* Colocación determinista con Mulberry32 (semillas fijas).
* Como máximo **3 luces puntuales nuevas por isla**: cada luz puntual obliga a recompilar todos los programas iluminados.

| Isla | Cambio principal |
| :--- | :--- |
| 🌲 Bosque | Puente de madera sobre los rápidos del río |
| 🏜️ Sabana | Cactus estilizados y plan de mejora (casa de Bing, Altar de Atia, fragua de Baruk, oasis y naturaleza) |
| ❄️ Ártico | Plan de 12 puntos, 76 árboles nuevos de otros colores y *Fade LOD* de árboles |
| 🔮 Mística | Observatorio Astral, sauce luminoso, vida luminiscente, canal emisivo de cristales y lianas |
| ✨ Genesis | Rediseño total del antiguo bioma Mazmorra, nombres, misiones y silueta del horizonte |

---

## 2. Bosque: puente sobre los rápidos (`demo_scena/ForestBridge.js`)

* Usa la malla `SmallBridge` de `assets/environment/bridge.glb` (no se usan la bandera, la puerta ni la farola del archivo).
* Une el final del sendero del Gran Árbol (orilla oeste, `(17.3, 27.0)`) con el camino del Santuario (orilla este, `(53.4, 22.0)`).
* **4 módulos** de unos 7 m encadenados sobre un arco suave (+0,6 m en el centro), con tablero de 4 m de ancho. Solo se alargan los extremos inferiores de los postes para que todos lleguen bajo el agua.
* **Jugabilidad:**
  * `getDeckHeight(x, z)` devuelve la altura caminable del tablero, sin huecos entre módulos, o `null` fuera del puente;
  * dos barandillas de colisión (`forest_bridge_rail`) mientras el Bosque está activo.

---

## 3. Sabana

### 3.1 Cactus estilizados (`SavannaPropsManager.js`)
* El modelo `cactus_forge3D` sustituye a los cactus anteriores en las mismas posiciones.
* Dos clases de tamaño que sobresalen de la hierba alta: altos de 2,2–3,0 m y bajos de 1,5–2,1 m, con la base algo hundida en la arena.

### 3.2 Lugares (`SavannaGenshinLandmarks.js`)
| Lugar | Contenido |
| :--- | :--- |
| 🏹 Campamento de Bing | Casa de adobe (sustituye a la tienda) y dos farolas de piedra en la entrada. Se conservan la hoguera, la diana y el estandarte. |
| 🗿 **Altar de Atia** (antes Altar del Sol Naciente) | Estrado escalonado de arenisca con la estatua de Atia y dos braseros. El Centinela del Desierto vigila fuera, en el sendero. |
| 🔨 Fragua de Baruk | Horno de piedra con chimenea, toldo, yunque, barril de temple, lingotes y una casa de adobe. Baruk está delante de la fragua. |

### 3.3 Oasis y naturaleza
* **`SavannaGenshinOasis.js`** (oasis de Hunter Zarek, `(14, −12)`):
  * eneas, papiros y nenúfares con flor;
  * espuma animada que sigue la orilla real, muestreada del terreno;
  * peces estilizados naranjas, dorados y plateados.
  * Sustituye a los juncos de palo y a las sombras de pez de `SavannaWaterManager`.
* **`SavannaGenshinNature.js`:**
  * montículos de roca erosionada rojiza junto a los senderos;
  * arbustos ocre secos y matas de flores naranjas y rojas cerca del oasis y al pie de los árboles;
  * franja de bruma dorada en el horizonte y motas lentas de polvo y polen dorado.

### 3.4 NPC reubicados (`MapRegistry.ZONE_NPCS['3_2']`)
| NPC | Posición (x, z) |
| :--- | :---: |
| 🏹 Bing | (−30.24, −37.24) |
| 🏜️ Desert Sentinel | (58.5, −24.0) |
| 🔨 Blacksmith Baruk | (42.39, 48.73) |

---

## 4. Ártico

### 4.1 Plan de mejora (12 puntos, primitivas)
* **Lugares** (`ArcticSites.js` + `ArcticLandmarks.js`):
  1. **Casa de Pomodoro:** cabaña de troncos con tejado nevado, farola de piedra y hoguera con peces en palos. Pomodoro sale del invernadero y espera junto a la hoguera.
  2. **Granja helada:** 4 parcelas valladas con cultivos de escarcha, cajoneras frías y un espantapájaros, al norte del invernadero.
  3. **Puesto del Chef Boreal:** puesto de mercado (toldo, cajas de fruta, pescado colgado) y hoguera con olla en la orilla este del lago.
  4. **Cabaña del Ermitaño:** cabaña y hoguera en el borde este del Valle de la Escarcha, con un estanque helado nuevo.
  5. **Altar de Atia:** estrado de piedra escarchada con la estatua de Atia y braseros de llama azul. Sustituye a los tótems de escarcha.
* **Hielo** (`ArcticIce.js`):
  * bloques de hielo translúcido con carámbanos, que sustituyen a parte de las rocas grandes;
  * vetas de mineral (base de roca y cristales brillantes) donde estaban los fragmentos de hielo;
  * peces congelados bajo el hielo del lago y del estanque, losas escarchadas y púas de escarcha en las orillas;
  * bancos de niebla cian que se desplazan por el fondo del valle;
  * `iceWalkHeight()`: altura caminable sobre el agua helada (lago, estanque y ríos).
* **Isla** (`ArcticIsland.js`):
  * paleta con hierba color paja, niebla cian y luz azul fría;
  * lago y ríos translúcidos y cuenca del estanque del Ermitaño;
  * marco de caminos con `pathFrameSignedFar`, que elimina las líneas sueltas de los extremos.

### 4.2 Variedad de árboles
* **76 árboles nuevos** (semilla 8282, `arcticVarietyTrees`) para dar color, siguiendo la referencia ártica de Axie:
  * abetos turquesa (`firteal`);
  * árboles redondos color menta (`frostbroad`);
  * más árboles muertos blanqueados.
* Los árboles originales no cambian de posición.

### 4.3 *Fade LOD* de árboles (`ArcticTreeLOD.js`)
| Distancia a la cámara | Qué se dibuja |
| :--- | :--- |
| < 70 m | Árbol completo (tarjetas de follaje y tronco con corteza) |
| 70 – 95 m | Fundido cruzado con *dither* de pantalla: el árbol se disuelve y aparece el *proxy* con patrones complementarios (nunca hay hueco ni árbol doble) |
| > 95 m | Solo el *proxy* de bajo poligonaje (≈80–140 triángulos) |

* Los *proxies* tienen bandas de nieve escalonadas, color desaturado y sombreado plano.
* Por instancia hay un atributo `aLodFade`; el descarte usa *dither* IGN y la clave de caché del programa se amplía.
* Las instancias se reordenan por distancia solo cuando la cámara se mueve, así la GPU se salta de verdad los árboles lejanos (vértices y sombras).
* El kit compartido `IslandTrees` no se modifica.
* Los árboles muertos, sin follaje, no usan LOD.
* **Medido:** −4 % a −17 % de triángulos respecto a no usar LOD, según la vista.

### 4.4 NPC reubicados
| NPC | Posición (x, z) | Dónde |
| :--- | :---: | :--- |
| 🍅 Pomodoro (`pomodoro_npc`) | (8.0, 18.6) | Junto a la hoguera de su casa |
| 🍲 Chef Boreal | (−5.4, −39.0) | Delante de su puesto |
| 🧙 Ermitaño Glacial | (−39.2, −70.4) | Junto a su cabaña (`MERGED_NPC_POSITIONS`) |

---

## 5. Mística

### 5.1 Lugares (`MysticLandmarks.js`)
| Lugar | Contenido |
| :--- | :--- |
| 🔭 **Observatorio Astral** (antes Observatorio del Oráculo) | Torre de pizarra en dos cuerpos con cornisas, escalera exterior en espiral, ventanas encendidas, cúpula de amatista con telescopio de latón, esfera armilar con anillos que giran y dos faroles rúnicos. Sustituye a la torre antigua. |
| 🏠 Casa del astrólogo `(50, −26)` | Casita de piedra y madera con tejado violeta, remates de estrella, ventanas encendidas y un pequeño jardín de cristales. |
| 🌿 Islote del estanque `(−64, 62)` | Islote con musgo en el centro del pantano, con un **sauce llorón luminoso** de 210 lianas (sin bolitas) y un pequeño pilar rúnico antiguo frente a él, mirando al Chamán Espiritual. |

### 5.2 Vida luminosa (`MysticLife.js`)
* Mariposas luminiscentes animadas en GPU (vuelo y aleteo en el *vertex shader*, 1 draw call).
* **Vegetación del pack místico** (`assets/mystic`), con brillo para que encaje con la ambientación:
  * hongos `mushroom_red`, `mushroom_Tall` y `mushroom_Group`;
  * flores `flower_redA` y `flower_redB`;
  * arbustos `plant_bush*`.
* Peces mágicos luminosos en el pantano y luciérnagas sobre él.
* **Lianas del Árbol Arcano:** 150 lianas que se mecen con el viento, sustituyendo a los frutos luminosos. Luciérnagas mágicas ascienden del suelo hacia el cielo.
* Guijarros mágicos pequeños en la orilla del mar (algunos con brillo tenue) y espuma animada en toda la costa.

### 5.3 Cristales, hierba y agua (`MysticIsland.js`)
* Canal emisivo para los cristales (`addCrystalEmissiveChannel`).
* **3 luces puntuales**, en la base de las 3 espiras más grandes, que tiñen el suelo y las rocas cercanas.
* Hierba en dos tonos: el actual y un violeta suave (`0xa98ee0`).
* Pantano con opacidad 0,6.

### 5.4 Oráculo y mapa
* Oráculo reubicado al pie del Árbol Arcano: `(3.5, −45.5)`.
* El punto de interés del mapa `oracle_tower` se llama ahora **"🔭 Observatorio Astral"**.
* **Medido:** +3 % a +7 % de draw calls y +6 % a +8 % de triángulos.

---

## 6. Genesis (antes Mazmorra)

### 6.1 Concepto
El bioma Genesis es majestuoso, antiguo y exclusivo: el equivalente a los "jardines reales" del continente. El aire es denso en magia, el cielo tiene tonos místicos con auroras etéreas, y cruzar sus fronteras se siente como entrar en un santuario prohibido, reservado a la élite de los entrenadores de Axies.

### 6.2 Geografía (`dungeon/DungeonIsland.js`, reescrito)
* Se conservan las exportaciones `createDungeonIsland` y `DUNGEON_SPAWN` `(130, 22, −π/2)` y el id interno `'dungeon'`. La etiqueta visible es **'Isla Genesis'**.
* Relieve (`genesisHeight`):
  * plaza central plana a 4,8 m;
  * terraza del Santuario a 8,6 m en `(0, 92)`, radio 26 m;
  * cuenca de la cantera;
  * playas doradas a 1,35 m que bajan al mar hacia los 139 m.
* **Caminos dorados:**
  * anillos cuadrados densos alrededor de la plaza (`squareLoop(0, 0, 30)`) y del Santuario (`squareLoop(0, 92, 17, 3.4)`);
  * avenidas este, norte, oeste, sur y noroeste que terminan exactamente sobre los anillos, así no quedan líneas sueltas;
  * tinte dorado `[2.35, 1.62, 0.42]` con desaturación 1,0 y `pathFrameSignedFar`.
* Suelo azul marino con vetas diagonales, auroras, destellos y esporas en el aire. Árboles turquesa, naranjas y blanqueados.

### 6.3 Lugares (`GenesisLandmarks.js`, primitivas)
| Lugar | Contenido |
| :--- | :--- |
| ⛩️ Puerta del Santuario `(112, 20)` | Puerta monumental en la avenida este: pilares lavanda, dintel dorado, emblema y un velo de aurora que se atraviesa. Muros laterales, braseros y una hilera procesional de obeliscos. Kotaro la custodia. |
| 🌸 Jardín Real (plaza central) | Tótem turquesa con cuernos, hoguera, seis monumentos abstractos sobre pedestales (en lugar de estatuas de Axies, hasta tener assets), racimo de cristal rosa y anillo de runas. |
| 💎 Cantera de cristal `(−60, −60)` | Cantera de cristal rosa con el campamento de Tripp, armazones de minería y una vagoneta. |
| 🏛️ Santuario del Origen `(0, 92)` | Anillo de columnas antiguas (algunas rotas), tambores caídos, gran arco con velo de aurora, el Trono del Origen escalonado y braseros azul violeta. El Espíritu de Atia está en el centro. |

* 3 luces puntuales en total.
* **Naturaleza** (`GenesisNature.js`):
  * pilares de piedra lavanda en capas, en grupos y sueltos, con colisión;
  * troncos huecos caídos, tocones y montones de ramas;
  * piedras lavanda pequeñas;
  * espuma animada en toda la costa.

### 6.4 NPC y monstruos
| Elemento | Posición (x, z) |
| :--- | :---: |
| Kotaro (guardián de la Puerta) | (104, 13) |
| Tripp (cantera) | (−50, −50) |
| Espíritu de Atia | (0, 92) |
| Ancla de la manada del Hombre Lobo (zona lógica `3_3`) | (14, 50) |

* El ancla del jefe se movió a `(14, 50)` porque las columnas del Santuario bloqueaban el templo.
* Las patrullas están en terreno llano, validadas con sondas de colisión.

### 6.5 Nombres y textos (opciones A + B)
* **A, nombres visibles** (`MapRegistry.js`, `IslandWorldLayout.js`, `WorldMapModal.js`, `BiomeEnemyCatalog.js`):
  * color `#f5c542`, etiqueta "✨ Genesis", isla "Isla Genesis", lema "Jardines Reales del Origen";
  * puntos de interés: Puerta del Santuario, Jardín Real y Santuario del Origen;
  * zonas `2_3` "Royal Gardens of Genesis" y `3_3` "Sanctum of Origin";
  * leyenda del mapa "✨ Genesis (Sur)" y nivel de enemigos "Genesis".
* **B, misiones y monstruos** (`QuestManager.js`, `NPCManager.js`):
  * `quest_sulfur_threshold` → "The Genesis Threshold", con la llave "Genesis Sanctum Key";
  * `primeval_purification` menciona el Sanctum of Origin;
  * textos de la misión de Tripp; anillo renombrado a "Genesis Aurora Ring";
  * jefe "Genesis Warden Chimera";
  * diálogos del Oráculo, de Paladill y burbujas actualizados.

### 6.6 Silueta del horizonte (`dungeon/GenesisSilhouette.js`)
* `buildGenesisSilhouette(group, material)` sustituye al volcán y a los cráteres lunares:
  * meseta-jardín en dos terrazas bajas;
  * grupos de pilares lavanda en capas con remates de hongo;
  * copas redondas de árboles;
  * el gran arco del Santuario del Origen.
* Se usa desde el Bosque (`demo_scena/DistantIsland.js`, `buildGenesisIsland`) y desde la Sabana (`savanna/SavannaDistantIslands.js`).

### 6.7 Rendimiento
* En el render de pruebas: 1,6–2,1 M de triángulos y 374–544 draw calls según la vista.
* Recorrido completo entre las 5 islas sin errores y siluetas del horizonte correctas.

---

## 7. Pendiente
* Sustituir las primitivas de los lugares (Sabana, Ártico, Mística y Genesis) por assets finales.
* Estatuas de Axies propias para los pedestales del Jardín Real.
