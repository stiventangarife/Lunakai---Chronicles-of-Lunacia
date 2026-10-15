# Hito 6: Sistema de Skybox Mágico Procedural y Partículas Ambientales por Zona

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** `MagicalSkybox` y `ZoneParticleManager` pertenecen al mundo demo de 80 m y **ya no se crean** (`LEGACY_DEMO_WORLD = false` en `OverworldManager`). Cada isla tiene su propio cielo y sus partículas: `GenshinSky` en el Bosque, e `IslandSky` e `IslandParticles` en las demás islas.


## 1. Visión General
El sexto hito visual de **Axie Tactics** transforma la estética del Overworld de un plano básico a un entorno tridimensional inmersivo y mágico con calidad cinematográfica anime (*inspirado en Genshin Impact y Studio Ghibli*). Integra dos grandes subsistemas coordinados:
1. **Skybox Mágico Procedural Dinámico (`src/rpg/world/MagicalSkybox.js`)**: Una cúpula celeste infinita con gradientes atmosféricos multicapa, disco solar/lunar radiante con dispersión Mie, manto estelar titilante, capas de nubes procedurales a la deriva y auroras boreales/astrales reactivas.
2. **Gestor de Partículas Ambientales por Zona (`src/rpg/world/ZoneParticleManager.js`)**: Cinco sistemas de partículas meteorológicas y ambientales procedimentales adaptadas con precisión a la naturaleza de cada uno de los 5 biomas del mundo abierto de Lunacia.

---

## 2. Skybox Mágico Procedural (`MagicalSkybox.js`)

### 2.1 Calibración del Gradiente para Cámara Isométrica Elevada
La cámara del juego opera con un ángulo de inclinación elevado (~49° hacia el suelo). Si el horizonte del cielo se sitúa en $y = 0.0$, la cámara solo observaría el vacío inferior. La cúpula celeste del `MagicalSkybox` calibra el horizonte óptico a `dir.y = -0.32`:
- **Nivel del Horizonte (`dir.y = -0.32`)**: Se funde perfectamente con el color de la niebla volumétrica del bioma (`biome.lighting.fogColor`), eliminando cualquier corte abrupto con los bordes de la macro-zona.
- **Bóveda Superior (`dir.y > -0.32`)**: Despliega la transición suave desde el cénit profundo hasta el cielo medio y el horizonte.
- **Seguimiento Dinámico de Cámara**: La esfera de cielo (radio 380m) sincroniza continuamente su centro con `camera.position` (`mesh.position.copy(camera.position)`), garantizando una sensación de lejanía infinita sin artefactos de recorte durante el zoom o la rotación de cámara.

### 2.2 Paletas Celestiales por Bioma y Transición Suave

| Bioma | Cénit (Zenith) | Cielo Medio (Mid) | Horizonte (Fog Sync) | Fenómenos Celestiales |
| :--- | :--- | :--- | :--- | :--- |
| **Bosque (Forest)** | `#0c4a6e` (Zafiro Profundo) | `#38bdf8` (Azul Anime) | `#cbe5ff` (Bruma Diurna) | Sol dorado radiante, nubes cúmulos suaves y destellos solares. |
| **Sabana (Savannah)** | `#312e81` (Índigo Atardecer) | `#f97316` (Ámbar Ígneo) | `#fef3c7` (Calima Dorada) | Resplandor solar intenso, halo cálido y nubes tostadas. |
| **Ártico (Arctic)** | `#0f172a` (Vacío Polar) | `#0284c7` (Azul Glaciar) | `#dbeafe` (Escarcha Helada) | Sol plateado frío y cortinas ondulantes de Aurora Boreal esmeralda/cian. |
| **Místico (Mystic)** | `#0a0614` (Violeta Astral) | `#701a75` (Orquídea Radiante) | `#13273b` (Pizarra Ecos) | Luna astral etérea, manto denso de estrellas titilantes y velos de nebulosa rosa/púrpura. |
| **Mazmorra (Dungeon)** | `#060408` (Obsidiana Pura) | `#271138` (Sulfuro Carmesí) | `#181220` (Ceniza de Cripta) | Anillo de eclipse lunar espectral, nubes de humo pesado y vacío abisal. |

- **Transición Dinámica entre Zonas**: Al transitar entre macro-zonas, `setBiome(biomeId, duration = 1.5)` ejecuta una interpolación no lineal (Smoothstep) de todos los uniformes de color, posición solar y efectos celestiales, produciendo un cambio ambiental cinematográfico y continuo.

---

## 3. Gestor de Partículas Ambientales (`ZoneParticleManager.js`)

Todas las texturas de partículas se sintetizan procedimentalmente en lienzos HTML5 Canvas de alta resolución durante la carga inicial, garantizando cero latencia de red y portabilidad completa sin dependencias de assets externos.

### 3.1 Comportamiento y Física por Bioma

1. **🌲 Bosque de Lunacia — Hojas Volando por el Aire**:
   - **Emisor**: 180 hojas estilizadas con variación cromática (verde lima, esmeralda, dorado otoñal y ocre).
   - **Dinámica**: Descenso grácil con oscilación sinusoidal doble (`Math.sin(phase) * 0.85`), simulando el aleteo por la brisa vegetal.
   - **Volumen**: Envuelve un área de `±20m` alrededor del jugador con reaparición en las copas de los árboles (`y = 9.5 a 12.5m`).

2. **🏜️ Sabana / Desierto — Ráfagas de Viento y Polvo de Arena**:
   - **Emisor**: 300 partículas de arena y estelas de polvo ámbar/dorado.
   - **Dinámica**: Viento horizontal sostenido reforzado por ráfagas periódicas rítmicas (`Math.pow(sin(t * 1.75), 2) * 2.2`) que barren el terreno desértico cerca del suelo (`y = 0.2 a 3.8m`).

3. **❄️ Picos Glaciares del Ártico — Nieve y Copos Cristalinos**:
   - **Emisor**: 380 copos de nieve cristalinos hexagonales y partículas de hielo diamante.
   - **Dinámica**: Caída vertical constante (`vy = -1.6 a -3.2 m/s`) con suave turbulencia lateral, cubriendo desde 12 metros de altitud hasta posarse en la nieve.

4. **🔮 Planicie Astral Mística — Luciérnagas Mágicas**:
   - **Emisor**: 190 orbes luminosos con núcleo blanco brillante y halos cian, lavanda, rosa y verde hada.
   - **Dinámica**: Vuelo orgánico tridimensional browniano flotando en el aire (`y = 0.5 a 6.0m`), con parpadeo respiratorio de opacidad (`AdditiveBlending`), aportando vida mística entre la hierba y los árboles astrales.

5. **🏰 Fortaleza de la Mazmorra — Vientos de Neblina Rasante y Hojas Secas/Brasas**:
   - **Emisor Doble**:
     - *80 Nubes de Neblina*: Capa de bruma densa violácea que se desliza a ras del suelo (`y = 0.2 a 1.8m`).
     - *110 Hojas Secas y Brasas*: Siluetas de hojas marchitas crujientes y chispas incandescentes que ascienden lentamente en las corrientes de aire oscuro.

### 3.2 Envoltura Toroidal y Rendimiento a 60 FPS
- Las partículas calculan su posición en relación a `player.position`: al salir de los márgenes de `±20m` horizontalmente, reaparecen en el extremo opuesto sin destruirse ni recrearse.
- Solo los emisores del bioma activo procesan la actualización de sus buffers de vértices; los emisores inactivos se apagan con fundido suave (`opacity -> 0.0`), consumiendo prácticamente 0% de CPU.

### 3.3 Supresión Limpia en Combate
- Al detonarse un encuentro táctico (`_handleMonsterEncounter`), `this.zoneParticleManager.group.visible = false` oculta instantáneamente las partículas del mundo para evitar interferir con la cuadrícula de batalla.
- Al regresar al Overworld tras la victoria o rescate en el dojo, las partículas se reactivan limpiamente.

---

## 4. Archivos Clave del Hito 6

| Archivo | Responsabilidad |
| :--- | :--- |
| `src/rpg/world/MagicalSkybox.js` | Shader procedural de cúpula celeste, estrellas, nubes, sol/luna, auroras y transiciones de bioma. |
| `src/rpg/world/ZoneParticleManager.js` | Emisores de partículas meteorológicas y ambientales procedurales para los 5 biomas. |
| `src/rpg/world/BiomeThemeManager.js` | Coordinación de transiciones entre biomas integrando iluminación, niebla, cielo y clima. |
| `src/rpg/world/WorldMapManager.js` | Inyección de dependencias de Skybox y Partículas en el ciclo de carga y cambio de mapa. |
| `src/rpg/stylized/StylizedEnvironment.js` | Retiro de la esfera estática previa para renderizado sin obstrucciones del Skybox. |
| `src/rpg/OverworldManager.js` | Instanciación, bucle de renderizado/actualización y control de visibilidad en transiciones de combate. |
