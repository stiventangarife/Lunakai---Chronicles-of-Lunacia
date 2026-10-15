# Hito 20: Primera Gran Isla — Isla de la Sabana, Geografía de Meseta Alta y Ecosistema Árido

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** el oasis ya no está hundido a Y = 11.2 m. Ahora está **en la cima, a ras de la meseta**: repisa a 25,4 m, laguna con agua a 25,15 m y contorno orgánico. Sobre la isla se aplica la capa de arte Genshin `SavannaGenshinArt.js`, con la paleta de la sabana de Axie, acacias y pináculos (Hito 23, sección 3.1). Al llegar en barca el jugador aparece en el muelle de la playa oeste (−126, 42). Desde ahí la rampa A sube a la meseta.


> **Fecha de implementación:** Octubre 2026  
> **Estado:** Completado y Verificado en Producción  
> **Módulos clave:** `SavannaZone.js`, `SavannaTerrain.js`, `SavannaWaterManager.js`, `SavannaVegetationManager.js`, `SavannaPropsManager.js`, `SavannaLandmarksManager.js`, `SavannaParticles.js`, `SavannaDistantIslands.js`, `WorldMapManager.js`

---

## 1. Visión General

El Hito 20 marca el inicio de la construcción de las 4 grandes islas restantes del archipiélago de Lunacia, comenzando por la **Gran Isla de la Sabana** (macro-zona este `zone_3_2`).

Siguiendo las pautas de diseño:
* **Escala Idéntica:** El tamaño global de la isla coincide con el de la Isla del Bosque, asegurando coherencia espacial en el mapa mundial.
* **Orografía Singular de Meseta Alta (*Tepuy / Cañón*):** A diferencia de las suaves colinas del bosque, la Sabana emerge desde el mar a cota $Y = 0\text{ m}$ mediante imponentes acantilados escalonados y culmina en una meseta alta ($Y \approx 25.5\text{ m}$) que ofrece una visión panorámica 360° de las siluetas de las islas circundantes en el horizonte.
* **Ecosistema y Props Temáticos:** Se sustituyen los pinos por palmeras del desierto, los peñascos grises por rocas de arenisca rojiza, y la caída de hojas por ráfagas de viento y arena en suspensión.
* **Máximo Rendimiento:** Todos los sistemas emplean `InstancedMesh`, Frustum Culling y LOD, garantizando 60 FPS estables.

---

## 2. Geografía y Terreno Procedimental (`SavannaTerrain.js`)

El terreno se genera mediante geometría personalizada y shaders GLSL que reproducen las formaciones rocosas sedimentarias de los grandes cañones:

* **Estratificación Horizontal Geológica:** Shader que evalúa la altura vertical y aplica bandas cromáticas multi-frecuencia inspiradas en estratos de arenisca (*Terracotta Red*, *Deep Ochre*, *Golden Sandstone* y vetas de hierro oscuro).
* **Zonificación Bioclimática por Cota:**
  * **$Y > 18\text{ m}$ (Cima de la Meseta):** Pradera dorada de gramíneas secas (`#d89f38`) y dunas solares modeladas con ondas sinusoidales orgánicas.
  * **$Y \approx 11.2\text{ m}$ (Cuenca del Oasis):** Depresión interior protegida con arena húmeda fina y orillas suaves.
  * **$Y < 8\text{ m}$ (Playa y Rompiente Marina):** Franja costera de arena de playa dorada (`#deb578`).
* **Sombreado Half-Lambert Cel-Shaded:** Fusión suave entre estratos verticales de acantilado y suelo plano en función de la normal (`smoothstep(0.68, 0.82, slope)`).

---

## 3. Hidrografía Marina y Oasis Interior (`SavannaWaterManager.js`)

El bioma cuenta con un sistema hídrico dual de alto impacto visual:

### 3.1 Océano Circundante 360°
* **Plano Marino Extendido:** Malla marina de $6000\text{ m} \times 6000\text{ m}$ orientada horizontalmente que rodea la isla hasta el horizonte.
* **Gradiente Cromático Tropical:** Transición fluida de aguamarina brillante (`#32cfd5`) en aguas someras costeras a turquesa zafiro profundo (`#0e5d75`) en altamar.
* **Rompientes Costeras (Surf Breakers):** Dos trenes de ondas dinámicas aproximándose a la costa con rompientes de espuma blanca.
* **Espuma Swash Costera:** Franja de espuma densa modulada por oleaje que lame y se retira sobre las arenas de la orilla.
* **Resplandor Toon Specular:** Reflejo especular anime de alta luminosidad bajo el sol abrasador del desierto.

### 3.2 Oasis de la Meseta
* **Laguna Interior a $Y = 11.2\text{ m}$:** Ubicada en la depresión central de la meseta (`X: 14.0, Z: -12.0`).
* **Cáusticas Animadas y Borde de Espuma:** Ondulaciones translúcidas con mezcla de transparencia orgánica en la orilla.
* **Fauna Viva:** Cardumen de peces estilizados nadando en órbitas elípticas con aleteo sinusoidal continuo.

---

## 4. Vegetación, Props y Partículas (`SavannaVegetationManager.js` / `SavannaPropsManager.js`)

* **Palmeras Estilizadas del Desierto:** Sustitución completa de los pinos templados por palmeras de tronco anillado y copas de hojas doradas y verdes.
* **Rocas de Cañón y Desierto:** Formaciones de arenisca rojiza con texturas diffuse optimizadas y colisiones sólidas adaptadas al relieve.
* **Césped Dorado de Sabana Instanciado:**
  * 45.000 briznas agrupadas eficientemente por *chunk buckets*.
  * Deformación suave por viento cálido en GPU y aplastamiento por pisada del jugador y su compañero Axie.
  * Paleta de briznas en tonos trigo, oliva seco y amarillo tostado.
* **Ráfagas de Viento y Polvo de Arena (`SavannaParticles.js`):**
  * Se eliminaron las hojas de árbol cayendo del bioma bosque.
  * Nuevo emisor GPU de 60 partículas que simula ráfagas de polvo dorado y arena del desierto cruzando el campo visual a gran velocidad horizontal con deriva turbulenta.

---

## 5. Puntos de Interés y Reubicación de NPCs

Se limpiaron completamente los elementos de la macro-zona anterior y se reubicaron los NPCs sobre la superficie real de la meseta:

| NPC / POI | Coordenadas $(X, Y, Z)$ | Rol y Función |
| :--- | :---: | :--- |
| **🏹 Bing** | `(-25.5, 25.5, -33.5)` | Héroe Arquero Reclutable (Misión principal 2: *Probar Ferocidad*). |
| **🏜️ Desert Sentinel** | `(62.0, 25.5, -28.5)` | Centinela del Desierto del Sol Naciente. |
| **🔨 Blacksmith Baruk** | `(44.5, 25.5, 49.5)` | Fragua Nómada del Cañón (Forja de acero de Atia). |
| **🎯 Hunter Zarek** | `(2.5, 25.5, -10.0)` | Tirador y duelista nómada junto al oasis. |

### Purga de Sistemas Legacy
En [`WorldMapManager.js`](file:///D:/Proyectos%20Unity/Axie_Adventures_Tactics_backup/axie-tactics-web/src/rpg/world/WorldMapManager.js), al activarse `zone_3_2`:
* Se desactivan y ocultan automáticamente: `stylizedEnv`, `dojoRockSanctuary`, `stylizedRiver`, `dojoBambooGrove`, `dojoBuilding`, `forestNatureManager`, `dojoPond` y `westPond`.
* Se eliminan todas las etiquetas de colisión residuales del bosque (`forest_tree`, `dojo_rock`, `river_chasm`, etc.), dejando exclusivamente las colisiones activas de la Sabana.

---

## 6. Siluetas Panorámicas 360° en el Horizonte (`SavannaDistantIslands.js`)

Desde la alta cima de la meseta, el jugador disfruta de una vista despejada de las otras cuatro islas:
* **Noroeste:** Silueta de la **Isla del Bosque** dominada por la copa inmensa del Gran Árbol Sagrado de Atia.
* **Norte:** Picos afilados y glaciares cian de la **Isla Ártica**.
* **Suroeste:** Cúpulas de árboles arcanos y monolitos flotantes de la **Isla Mística**.
* **Sur:** Silueta del estratovolcán colosal y cráteres de basalto de la **Isla Lunar y Volcánica**.
