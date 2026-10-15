# PROJECT_CONTEXT.md — Lunakai: Chronicles of Lunacia
## Guía Integral de Arquitectura, Estado y Continuidad Técnica

> **Última actualización:** 2026-10-13 (Hito 23 + ajustes: islas Genshin, barquero Pomodoro, mundo demo 1.0.0 retirado)  
> **Nombre del Proyecto:** Lunakai: Chronicles of Lunacia (anteriormente Axie Tactics / Axie Adventures)  
> **Estado actual:** mundo abierto 3D con **5 Grandes Islas** de 480 m y dirección de arte Genshin (cel-shading suave, pictórico, con bruma): Bosque (Hito 22), Sabana, Ártico, Mística y Mazmorra lunar volcánica (Hito 23). Las islas nuevas se construyen la primera vez que se visitan. El viaje entre islas se hace con el **barquero Pomodoro**, en la playa de cada isla; los portales cardinales están retirados. Los terrenos del mundo demo 1.0.0 (cuadrícula de macro-zonas de 80 m) ya no se construyen y su contenido de misiones vive en las islas. NPC, monstruos y nodos de misión están validados sobre el terreno real. Se mantienen la auditoría WebGL anti-NaN, el sistema dual de mapas, el minimapa radar y el determinismo Mulberry32.  
> **Idioma de comunicación con el usuario:** **Siempre en español**.

---

## 1. Visión General del Proyecto

**Lunakai: Chronicles of Lunacia** es un RPG táctico 3D web que fusiona exploración de mundo abierto (*Overworld*) estilizado con combates estratégicos por turnos en cuadrícula isométrica. Está fuertemente inspirado en clásicos como *Final Fantasy Tactics*, *Dofus*, *Zelda: Wind Waker* y *Fire Emblem*, ambientado en el universo y la propiedad intelectual de **Axie Infinity**.

### Pilares Técnicos Fundamentales
- **Filosofía Zero-Build**: Sin Webpack, sin Vite, sin npm dependencies obligatorias para compilar. Todo se ejecuta directamente en el navegador con ES6 Modules nativos y WebGL 2.0.
- **Three.js Local**: Bundleado localmente en `vendor/three.module.js` (r160). **NO importar desde CDN ni con `require('three')`**.
- **Servidor HTTP**: Servidor Node.js ligero (`server.js`) en el puerto `8082` (o alternativo en Python `server.py`). Soporta MIME types para `.glb`, `.gltf`, `.wasm`, `.webp` y cabeceras CORS.
- **URL por Defecto**: `http://localhost:8082` (o `http://127.0.0.1:8082`).
- **Persistencia**: `SaveSlotManager.js` gestiona 3 ranuras independientes de guardado en `localStorage`, guardando posición en el mundo, bioma, inventario, niveles, atributos, personalización Sapidae y misiones.

---

## 2. Arquitectura Global del Código

El juego opera bajo una máquina de estados dual controlada por `src/main.js`:
- `state-overworld`: El jugador controla a un explorador humanoide **Sapidae** acompañado fielmente por su **Compañero Axie** en 3D (cámara isométrica suave, colisiones, diálogos con NPCs, cofres, recolección, libro de misiones, mapa del mundo).
- `state-combat`: Cuando el jugador toca una quimera errante o inicia un reto, `BattleTransition.js` ejecuta un zoom cinematográfico y cede el control al motor táctico (`src/tactics/`), instanciando la cuadrícula isométrica, turnos por iniciativa, cartas de acción y VFX con su escuadrón de Axies. Al ganar o huir, el estado regresa limpiamente al overworld.

### 2.1 Estructura Completa de Carpetas

```
axie-tactics-web/
├── server.js                        ← Servidor HTTP Node.js (puerto 8081, APIs de guardado)
├── server.py                        ← Servidor alternativo Python 3
├── index.html                       ← Entrada HTML única (HUDs, modales, canvases)
├── styles.css                       ← Estilos globales (>220KB), temas, HUDs y animaciones GPU
├── package.json                     ← Metadatos y scripts ("start": "node server.js")
├── vercel.json / netlify.toml       ← Configuraciones de hosting cloud con MIME headers
├── vendor/                          ← Librerías locales Three.js (sin descargas externas)
│   ├── three.module.js              ← Three.js core en ES Module
│   ├── GLTFLoader.js                ← Cargador de modelos GLTF/GLB
│   ├── OrbitControls.js             ← Control de cámara para herramientas/inspección
│   └── BufferGeometryUtils.js       ← Utilidades de unión de geometrías
├── assets/
│   ├── models/                      ← Modelos 3D GLB (sapidae_male/female, paladill, xia, stylized_dojo, quimeras, slime...)
│   ├── portraits/                   ← Retratos 2D/3D (shinji, early-bird, big-yak, bing, pomodoro)
│   ├── parts/                       ← Iconos oficiales de partes Axie (beast-eyes, ears, mouth, horn, back, tail)
│   ├── skills/heroes/               ← Iconos 2D dedicados por héroe (/shinji, /early-bird, /big-yak, etc., 6 por héroe)
│   ├── stylized/                    ← Texturas de terreno, árboles, rocas, hierba, hojas
│   ├── arctic/, savannah/, mystic/, dungeon/ ← Props específicos por bioma
│   └── audio/                       ← Efectos de sonido y pistas musicales
├── src/
│   ├── main.js                      ← Orquestador maestro (AxieTacticsGame) y FSM
│   ├── audio/
│   │   └── MusicManager.js          ← Motor de música y atmósfera sonora
│   ├── tactics/                     ← MOTOR DE COMBATE TÁCTICO POR TURNOS
│   │   ├── SceneManager.js          ← Escena 3D de combate, luces y cámara táctica
│   │   ├── GridManager.js           ← Cuadrícula NxM, pathfinding BFS y validaciones
│   │   ├── Unit.js                  ← Entidades de combate (héroes, quimeras, animaciones)
│   │   ├── Spells.js                ← Catálogo de hechizos/habilidades (6 por héroe y clase Sapidae), costes PA/PM, rangos AL
│   │   ├── TurnManager.js           ← Iniciativa, timeline de turnos y rondas
│   │   ├── TacticalAI.js            ← IA de quimeras enemigas (decisiones, movimiento, ataque)
│   │   ├── DynamicCombatFactory.js  ← Generador procedimental de encuentros desde el Overworld
│   │   ├── LevelsDatabase.js        ← Niveles preconfigurados y arenas
│   │   ├── EquipmentManager.js      ← Gestión de objetos, armas, armaduras y accesorios
│   │   ├── ItemDatabase.js          ← Catálogo de objetos equipables con stats
│   │   ├── CharacterPortraitService.js ← Generador offscreen de miniaturas 3D a 128x128
│   │   ├── FloatingCombatText.js    ← Daño, curación y efectos flotantes en pantalla
│   │   ├── TacticalAudio.js         ← Motor de audio procedimental Web Audio API
│   │   ├── TextureGenerator.js      ← Generación de texturas de casillas
│   │   ├── TutorialManager.js       ← Tutorial guiado paso a paso con flecha 3D
│   │   └── VFXManager.js            ← Partículas de hechizos, proyectiles e impactos
│   └── rpg/                         ← MOTOR DE EXPLORACIÓN DE MUNDO ABIERTO (OVERWORLD)
│       ├── OverworldManager.js      ← Director general del Overworld, loop y renderizado
│       ├── PlayerEntity.js          ← Héroe explorador Sapidae humanoide y Compañero Axie seguidor (modelos 3D y animaciones)
│       ├── PlayerController.js      ← Control WASD, físicas, estados de habilitación/bloqueo
│       ├── OverworldCamera.js       ← Cámara isométrica (seguimiento suave + snapToTarget)
│       ├── OverworldCollisions.js   ← Sistema de colisiones sólidas AABB y círculos con deslizamiento
│       ├── SapidaeModularController.js ← Personalización modular de avatar Sapidae (pelo, ojos, cuernos, vestimenta)
│       ├── NPCManager.js            ← Spawning de NPCs (Maestro Paladill, Xia), auras y colisión
│       ├── DialogSystem.js          ← Sistema de diálogos ramificados interactivos
│       ├── WanderingMonsters.js     ← Quimeras errantes en el mapa con patrulla e IA de alerta (!)
│       ├── BattleTransition.js      ← Transición cinematográfica fluida entre Overworld y Combate
│       ├── QuestManager.js          ← Gestor de misiones, estados de objetivos y recompensas
│       ├── SaveSlotManager.js       ← 3 Ranuras de guardado en localStorage + auto-save
│       ├── AxieMixerService.js      ← Generación / personalización de apariencia Axie
│       ├── OverworldTutorialManager.js ← Guía inicial del nuevo aventurero
│       ├── CinematicFlythrough.js   ← Vuelos cinemáticos de cámara para revelación de zonas
│       ├── stylized/                ← AMBIENTE VISUAL PROCEDIMENTAL Y SHADERS
│       │   ├── StylizedEnvironment.js   ← Modo `lightingOnly`: solo sol, luz hemisférica y niebla base (la pradera de 80 m es legacy)
│       │   ├── StylizedGround.js        ← Terreno 80x80m con shader PBR y deformaciones
│       │   ├── StylizedGrass.js         ← 18.000 briznas instanciadas con viento GPU
│       │   ├── StylizedFlowers.js       ← 380 flores instanciadas con sombreado cel-shaded
│       │   ├── StylizedTrees.js         ← Árboles procedurales (variantes maple_red, golden, green)
│       │   ├── StylizedTreeVines.js     ← Hiedras que trepan los troncos (TubeGeometry optimizado)
│       │   ├── StylizedGroundFoliage.js ← Arbustos y follaje bajo de bosque
│       │   ├── StylizedRiver.js         ← Río animado continuo en columna 3 [3,1]..[3,5] con puentes
│       │   ├── StylizedPond.js          ← Estanque Zen en [3,3] con peces animados, rocas y agua traslúcida
│       │   ├── PathSDF.js               ← Signed Distance Field para curvas de camino y río
│       │   └── ToonOutline.js           ← Delineado cel-shading en tiempo real para NPCs y modelos
│       ├── world/                   ← GESTIÓN DE ISLAS, BIOMAS, DEMO_SCENA Y POIS
│       │   ├── MapRegistry.js           ← Registro de las 5 Grandes Islas, niveles recomendados y 3 POIs por isla
│       │   ├── WorldMapManager.js       ← Carga de islas, viaje en barca (`travelToIsland`), alias de zonas fusionadas; sin portales
│       │   ├── WorldMapModal.js         ← Modal Dual de Mapas [M] (Pestaña Mapa Mundi y Pestaña Mapa de la Isla)
│       │   ├── BiomeThemeManager.js     ← Paletas de luz, niebla y color atmosférico por bioma
│       │   ├── BiomeDecorationManager.js← Props 3D por bioma (cactus, rocas nevadas, setas)
│       │   ├── SlimeCreaturesManager.js ← Generación y patrulla de slimes 3D en el bosque sin invadir el río
│       │   ├── MagicalSkybox.js         ← (Legacy, no se crea) Bóveda celeste del mundo demo de 80 m
│       │   ├── ZoneParticleManager.js   ← (Legacy, no se crea) Partículas atmosféricas del mundo demo
│       │   ├── ZoneTransitionManager.js ← Pantalla de carga GPU a 60 FPS y telón (portales retirados: `setPortals({})`)
│       │   ├── OverworldLODManager.js   ← Level of Detail para optimización en hardware modesto
│       │   ├── savanna/                 ← PRIMERA GRAN ISLA: ISLA DE LA SABANA (ZONE_3_2)
│       │   │   ├── SavannaZone.js       ← Orquestador maestro del bioma de la Sabana
│       │   │   ├── SavannaTerrain.js    ← Meseta alta y cañón tepuy con estratos horizontales y dunas
│       │   │   ├── SavannaWaterManager.js ← Mar abierto turquesa 360°, rompientes marinas y oasis con peces a Y=11.2m
│       │   │   ├── SavannaVegetationManager.js ← 45.000 briznas de hierba dorada instanciada con viento y pisadas
│       │   │   ├── SavannaPropsManager.js ← Palmeras del desierto y rocas de arenisca roja instanciadas
│       │   │   ├── SavannaLandmarksManager.js ← Campamento de Bing, Altar del Sol Naciente y Fragua de Baruk
│       │   │   ├── SavannaParticles.js  ← Ráfagas de viento y polvo de arena del desierto en suspensión
│       │   │   ├── SavannaDistantIslands.js ← Siluetas panorámicas 360° vistas desde la cima de la meseta
│       │   │   └── SavannaAssetManager.js ← Carga y gestión de recursos 3D y texturas de la Sabana
│       │   ├── islands/                 ← HITO 23: kit Genshin compartido + Ártico, Mística y Mazmorra (480 m, carga diferida)
│       │   │   ├── kit/                 ← Terreno/caminos, césped, árboles, cielo, agua, cristales, partículas, orquestador
│       │   │   ├── GrandIslandZone.js   ← Zona base de isla grande (terreno, luces, rocas, colisiones, horizonte)
│       │   │   ├── GrandIslands.js      ← Registro zona → isla y puntos de llegada de "Viajar a"
│       │   │   ├── IslandWorldLayout.js ← Zonas fusionadas, muelles del barquero, anclas de monstruos y NPC reubicados
│       │   │   └── arctic/ · mystic/ · dungeon/ ← Geografía, perfil de arte y puntos de interés de cada isla
│       │   └── demo_scena/              ← ENTORNO DE MUNDO ABIERTO DE ALTA FIDELIDAD (GENSHIN/BOTW STYLE)
│       │       ├── genshin/             ← CAPA DE DIRECCIÓN DE ARTE GENSHIN (Hito 22): cielo, montañas, césped, árboles, agua, post
│       │       ├── DemoScenaZone22.js   ← Orquestador de la escena de mundo abierto
│       │       ├── Terrain.js           ← Terreno continuo esculpido con ruido Simplex determinista
│       │       ├── VegetationManager.js ← 50.000 briznas de césped V3 GPU, viento, deformación por pisadas y flores
│       │       ├── PropsManager.js      ← ~350 árboles y rocas reales texturizados instanciados en ~30 draw calls
│       │       ├── WaterManager.js      ← Río continuo con peces animados, espadañas, rocas y ondas de choque
│       │       ├── LandmarksManager.js  ← Gran Árbol Sagrado, Dojō, Santuario con monolitos levitantes y partículas
│       │       ├── DistantIsland.js     ← Siluetas de islas remotas en 360° (Ártico, Sabana, Místico, Volcánica Lunar)
│       │       ├── MathUtils.js         ← Generador determinista Mulberry32 (`createSeededRandom`) y SimplexNoise
│       │       ├── AtmosphereManager.js ← Niebla atmosférica, cielo dinámico e iluminación de horizonte
│       │       ├── LightingManager.js   ← Sol direccional PBR, sombras calibradas y luz ambiental
│       │       ├── FootstepEffectsManager.js ← Huellas dinámicas y polvo al correr
│       │       ├── ParticleSystemManager.js   ← Esporas doradas y polen mágico flotante
│       │       ├── StylizedBladeMaterial.js   ← Shaders y geometrías para mallas de briznas
│       │       ├── grassShader.js       ← Shader cel-shaded V3 con sombreado de suelo y meandros
│       │       └── grassTexture.js      ← Generador procedimental de textura hand-painted
│       └── ui/                      ← INTERFACES DE USUARIO DEL OVERWORLD
│           ├── MinimapHUD.js            ← Radar circular flotante en pantalla con POIs y orientación dinámica
│           ├── SquadHUD.js              ← Barra superior de héroes con retratos 3D y barras de vida
│           ├── InventoryModal.js        ← Inventario [I] en 3 columnas (Paper Doll, mochilas, stats)
│           ├── QuestBookModal.js        ← Diario de Aventuras [L] con estética de pergamino
│           ├── SettingsModal.js         ← Menú de Opciones [ESC] (gráficos, sonido, controles)
│           ├── FerryTravelUI.js         ← Selector de islas del barquero Pomodoro
│           ├── CharacterPreviewDiorama.js ← Diorama 3D interactivo con rotación 360° para personalización
│           └── StartScreenUI.js         ← Pantalla de inicio, gestión de ranuras y estudio de creación
└── docs/                            ← Documentación técnica e hitos históricos (Hitos 1 al 23)
```

---

## 3. Flujo de Inicialización Crítico

El orden de carga en `src/rpg/OverworldManager.js` es estrictamente asíncrono y dependiente. Si un módulo falla, la pantalla de carga puede quedarse congelada.

```
index.html
  └─ src/main.js (DOMContentLoaded)
       └─ OverworldManager.init()
            ├─ StylizedEnvironment.init()      ← await, modo lightingOnly (sol + luz hemisférica + niebla base)
            │   (LEGACY_DEMO_WORLD = false: MagicalSkybox, ZoneParticleManager, DojoRockSanctuary,
            │    StylizedRiver, DojoBambooGrove, DojoBuilding, ForestNatureManager y el estanque NO se crean)
            ├─ PlayerEntity.loadModel()         ← await (Sapidae + compañero Axie)
            ├─ NPCManager.init()                ← await (NPC de la isla inicial, incluido el barquero)
            ├─ WanderingMonsters                ← manadas por isla con anclas validadas
            ├─ BiomeDecorationManager.init()    ← await (sin props en las islas: las islas grandes lo omiten)
            ├─ DemoScenaZone22.init()           ← await (Isla del Bosque + capa Genshin)
            ├─ SavannaZone.init()               ← await (Isla de la Sabana + SavannaGenshinArt)
            ├─ grandIslands (Ártico/Mística/Mazmorra) ← grupos vacíos; se construyen al primer viaje
            └─ WorldMapManager.init()           ← loadMap(canonicalZoneId(id)) → activa la isla
```

> ⚠️ **Regla de Oro**: `WorldMapManager.init()` debe llamarse después de que todos los loaders hayan terminado. Al cambiar de zona, `changeMap()` ejecuta una pantalla de carga GPU, actualiza los subsistemas, posiciona al jugador, hace **`snapToTarget()` en la cámara**, y espera mediante `waitForNextRenderFrame(2)` a que el primer frame útil se pinte en pantalla antes de iniciar el fade-out de salida y desbloquear los controles del jugador.

---

## 4. Geografía Mundial: Las 5 Grandes Islas de Lunacia

El mapa mundial ha evolucionado de la antigua cuadrícula rígida de macro-zonas a una **arquitectura de 5 Grandes Islas Bioma** en disposición cardinal (cruz):

```
                      [ NORTE ]
                 ❄️ Isla del Ártico
                   (Nivel 4 - 6)
                         |
  [ OESTE ]              |              [ ESTE ]
🔮 Isla Mística --- 🌲 Isla del Bosque --- 🏜️ Isla de la Sabana
  (Nivel 7 - 9)       (Nivel 1 - Demo)     (Nivel 1 - 3)
                         |
                         |
                 🌋 Isla de la Mazmorra
                   (Nivel > 10)
                      [ SUR ]
```

### Características y Puntos de Interés Emblemáticos (3 POIs por Isla)
Todas las islas se encuentran desbloqueadas desde el inicio para libre exploración y cuentan con exactamente los 3 puntos de interés más importantes registrados en `MapRegistry.js`:

1. **🌲 Isla del Bosque (Centro - Nivel 1, Demo Principal):**
   - **🥋 Valle del Dojō:** Centro de entrenamiento marcial y dojo del Maestro Paladill (`x: -87.9, z: 74.0`).
   - **🌳 Gran Árbol Ancestral de Atia:** Monumento natural místico que irradia bendición y vida (`x: -8.0, z: -25.0`).
   - **🏛️ Santuario del Portal Antiguo:** Monolitos flotantes con levitación mágica y runas ancestrales (`x: 115.0, z: 65.0`).
2. **🏜️ Isla de la Sabana (Este - Nivel 1 - 3):**
   - **☀️ Desierto del Sol Naciente:** Dunas inmensas donde vigilan los centinelas del desierto.
   - **🏹 Campamento de Bing:** Refugio del arquero alado y sus aprendices nómadas.
   - **🔨 Fragua Nómada de Baruk:** Gran herrería del cañón forjando acero de Atia.
3. **❄️ Isla del Ártico (Norte - Nivel 4 - 6):**
   - **🏔️ Valle de la Escarcha Eterna:** Santuario congelado protegido por tótems sagrados.
   - **🌱 Invernadero de Pomodoro:** Refugio botánico aclimatado contra las ventiscas polares.
   - **🍲 Campamento de Cocina Boreal:** Puesto de provisiones y estofado de nieve.
4. **🔮 Isla Mística (Oeste - Nivel 7 - 9):**
   - **✨ Santuario del Vacío Astral:** Monolitos celestes que resuenan con las constelaciones.
   - **🌌 Nebulosa de Lunacia:** Fisura mágica de polvo estelar y tiempo distorsionado.
   - **🔮 Observatorio del Oráculo:** Torre de contemplación cósmica y profecías estelares.
5. **🌋 Isla de la Mazmorra / Lunar Volcánica (Sur - Nivel > 10):**
   - **🌋 Caldera de Magma:** Epicentro volcánico activo sobre ríos de lava y azufre.
   - **🌑 Cráter de la Cripta Lunar:** Cuenca de impacto cósmica y catacumbas ancestrales.
   - **🏰 Fortaleza de las Sombras:** Cámara volcánica suprema y combate definitivo de Lunacia.

---

## 5. Sistemas Recientes y Optimizaciones Clave

### 5.1 Pantalla de Carga Optimizada a 60 FPS y Transición Limpia
- **Localización Completa al Inglés**: Texto traducido a "Loading Biome...", título "LUNAKAI", y eliminación de emojis infantiles para una presentación limpia.
- **Cero Tirones (Reflow-Free GPU Animations)**:
  - El orbe de carga (`.zone-loading-orb`) utiliza `transform: translateZ(0)` y rotación `linear` continua acelerada por hardware.
  - La barra de carga (`.zone-loading-bar-fill`) utiliza `transform: translateX(...) scaleX(...)` en lugar de manipular `width`, evitando recalcular el layout CSS de la página.
- **Transición de Salida Limpia**:
  - `OverworldManager.js` implementa `waitForNextRenderFrame(2)` que aguarda a que WebGL complete el renderizado del mapa antes de quitar la cortina.
  - Los controles del jugador (`PlayerController.setEnabled(false)`) se mantienen bloqueados durante el desvanecimiento de 500ms y solo se entregan cuando el mundo responde con fluidez a 60 FPS.
- **Cámara Instantánea (`snapToTarget`)**:
  - Al cambiar de mapa, `OverworldCamera.js` ejecuta `snapToTarget(spawnPoint)` en lugar de desplazar la cámara 70 metros a través del vacío, eliminando los tirones visuales durante la transición.

### 5.2 Botón de Opciones y Modal de Ajustes `[ESC]`
- El HUD superior muestra el botón **`⚙️ Options [ESC]`**.
- Al presionar `ESC` o hacer clic en el botón, se abre `SettingsModal.js` para calibrar:
  - Calidad gráfica (Alta, Media, Baja).
  - Sombras dinámicas y densidad de partículas/hierba.
  - Volumen maestro, música y efectos sonoros.
  - Guía completa de controles para teclado y ratón.

### 5.3 Sistema de Combate Táctico
- **Héroes del Roster**:
  - **Shinji** (Beast #10455, líder inicial): Especialista en combate cuerpo a cuerpo y crítico letal.
  - **Early Bird** (Bird): Daño aéreo a distancia, ráfagas de plumas y gran movilidad.
  - **Big Yak** (Plant): Coloso tanque con escudos de espinas, drenaje vital y trampas de raíces.
  - **Bing** y **Pomodoro**: Especialistas de apoyo táctico y control de masas.
- **Iconos de Habilidades Dedicados**: Ubicados en `assets/skills/heroes/<nombre>/1.png` a `6.png`, integrados en `Spells.js`, `InventoryModal.js` y `StartScreenUI.js`.
- **Enemigos Quimeras y Slimes**: Modelos 3D animados con animaciones de idle, walk, attack, skill y faint.

### 5.4 Estudio de Personalización Sapidae y Diorama 3D
- **Interfaz Dofus-Inspired**: Layout en 3 columnas en `StartScreenUI.js` para crear y personalizar al aventurero.
- **Controlador Modular (`SapidaeModularController.js`)**: Gestiona peinados (Braids, Short Crop, Spiky, Wild), ojos (Wide, Determined, Fierce, Narrow), cornamenta ancestral (Antlers, Ram, Curved, Spike) y tintes RGB interactivos con botón "Base Texture" para volver a la tela original.
- **Diorama 3D en Tiempo Real (`CharacterPreviewDiorama.js`)**: Pedestal de piedra 3D con controles de rotación 360° `[⟲] [⟳]`, iluminación cinemática y renderizado simultáneo del avatar Sapidae y su compañero Axie 3D.
- **4 Clases de Sapidae**: Forjacubiles (Crafter), Pastor de Estrellas (Shepard), Lunalogista (Lunalogist) y Astromante (Stargazer), con stats base y previsualización de 6 hechizos con tooltips flotantes.

### 5.5 Criaturas Slime y Encuentros en el Bosque
- **Gestión Espacial (`SlimeCreaturesManager.js`)**: Generación de criaturas Slime 3D en las 9 macro-zonas de bosque.
- **Modelo Oficial y Físicas**: Modelo unificado `slime.glb` con escala equilibrada y saltos suaves de baja altura.
- **Restricción Fluvial**: Filtro espacial que impide la aparición de slimes sobre el cauce del río central (`gx = 3`).
- **Sanitización de Combate**: Corrección en `Unit.js` garantizando que los slimes a 0 HP transicionen a derrota sin quedar en estado `null`.

### 5.6 Sistema de 6 Habilidades para Axies y Partes Corporales
- **Repertorio Completo (6 Spells por Axie)**: Cada compañero cuenta con 6 habilidades balanceadas en `SaveSlotManager.js` y `Spells.js`.
- **Mapeo de Partes Oficiales de Axie (`assets/parts/`)**:
  1. Eyes (`beast-eyes.png`) | 2. Ears (`beast-ears.png`) | 3. Mouth (`beast-mouth.png`) | 4. Horn (`beast-horn.png`) | 5. Back (`beast-back.png`) | 6. Tail (`beast-tail.png`).
- **Medallas en Esquina**: Badge circular exclusivo para Axies en la esquina superior izquierda de cada tarjeta de habilidad en `StartScreenUI.js`.
- **Ilustraciones Exclusivas**: 18 ilustraciones temáticas únicas sin repeticiones ni fallos de extensión (`.webp` vs `.png`).

### 5.7 Escena Abierta de Alta Fidelidad Visual (`demo_scena/`)
- **Estilo Artístico Anime / Cel-Shaded**: Iluminación PBR suave, paleta vibrante estilo *Genshin Impact* y *Breath of the Wild*.
- **50.000 Briznas de Césped V3 en GPU (`VegetationManager.js`)**: Renderizado en chunks espaciales con frustum culling, deformación reactiva al pisar y viento procedural sin caídas de frames.
- **Batching Masivo de Árboles y Rocas (`PropsManager.js`)**: ~350 modelos GLB reales de árboles y centenares de formaciones rocosas instanciados en ~30 draw calls totales.
- **Río Continuo y Vida Acuática (`WaterManager.js`)**: Shaders de refracción y espuma, siluetas de peces nadando contra corriente, espadañas botánicas y ondas de choque en rocas.
- **Monumentos Sagrados (`LandmarksManager.js`)**: Gran Árbol Ancestral de Atia, Dojō de entrenamiento, y Santuario Antiguo con 3 monolitos levitantes y partículas mágicas.

### 5.8 Sistema Dual de Mapas (`WorldMapModal.js`)
- **Pestaña Mapa Mundi**: Vista macroscópica de las 5 Grandes Islas con niveles recomendados, iconos y descripción del bioma.
- **Pestaña Mapa de la Isla**: Renderizado topográfico interactivo en canvas 2D con senderos, río, los 3 POIs principales y posición del héroe.
- **Botón Contextual Inteligente**: El botón *"🏝️ Ver Mapa de la Isla"* solo aparece activo para la isla en la que se encuentra físicamente el jugador.

### 5.9 Minimapa Radar en Pantalla (`MinimapHUD.js`)
- **Radar Circular Flotante**: HUD en esquina superior derecha con borde dorado, rosa de los vientos y radar de POIs y agua.
- **Orientación Dinámica en Tiempo Real**: Ángulo analítico de orientación de cámara (`atan2(cos(yaw), sin(yaw))`); el cono de visión y la flecha rotan con precisión suave instantánea al girar.

### 5.10 Siluetas de Islas Remotas del Horizonte (`DistantIsland.js`)
- **Visibilidad Panorámica 360°**: Cuatro islas visibles a lo lejos sobre el mar sin casteo de sombras ni overhead en GPU.
- **Shaders Atmosféricos Adaptativos (`fog: false`)**: Visibles nítidamente a través de la calina marina:
  - **Norte:** Picos glaciares Cervino y plataformas de hielo.
  - **Este:** Mesetas de cañón y acacias gigantes desplegadas a lo ancho del horizonte (rotación 90°).
  - **Oeste:** Gran Árbol Arcano con dosel mágico y arco marino.
  - **Sur:** Isla Lunar Volcánica con caldera principal de 310m, cono parásito, cráter de impacto lunar con pico central resurgente (estilo Tycho/Copérnico), espiras de basalto y fulgor de magma.

### 5.11 Determinismo Procedural con Semillas Fijas (Algoritmo Mulberry32)
- **Eliminación del Salto de Elementos**: Sustitución de `Math.random()` por generadores con semilla determinista (`createSeededRandom` en `MathUtils.js`).
- **Semillas Asignadas**:
  - `PropsManager.js`: Semilla `133742` (árboles, rocas, pilares).
  - `VegetationManager.js`: Semillas `77005` (césped V3), `77001` (césped estilizado), `77002`/`77003` (flores), `77004` (arbustos).
  - `LandmarksManager.js`: Semilla `99001` (rocas levitantes).
  - `WaterManager.js`: Semilla `88001` (espadañas y juncos).
- **Consistencia Total y Rendimiento**: Cada elemento mantiene siempre su posición exacta entre reinicios, ejecutándose en < 1ns por llamada en CPU sin consumo de memoria.

### 5.12 Balizas de Misión Limpias e Inmersivas
- **Punta de Flecha Estilizada**: Sustitución de círculos deformados en el suelo y carteles permanentes por una flecha flotante limpia sobre el objetivo.
- **Ocultación por Proximidad**: La baliza se desvanece automáticamente al acercarse al NPC.

### 5.13 Primera Gran Isla: Isla de la Sabana (`src/rpg/world/savanna/`, `zone_3_2`)
- **Geografía de Gran Meseta y Cañón Tepuy**: Isla que arranca en el mar y se eleva a una meseta alta panorámica ($Y \approx 25.5\text{ m}$) con cañones escalonados de arenisca roja y ocre (`SavannaTerrain.js`).
- **Mar Abierto 360° y Oasis Interior**: Malla oceánica de $6000\text{ m} \times 6000\text{ m}$ con gradiente tropical y rompientes costeras, y oasis interior a $Y = 11.2\text{ m}$ con cardumen de peces animados en cardumen (`SavannaWaterManager.js`).
- **Vegetación y Props de Desierto**: Palmeras estilizadas (sustituyendo los pinos), rocas de cañón rojizas, 45.000 briznas de hierba dorada instanciada (`InstancedMesh`) y ráfagas de viento/arena en suspensión (`SavannaParticles.js`).
- **Reubicación de NPCs y Purga Legacy**: Bing, Desert Sentinel, Blacksmith Baruk y Hunter Zarek posicionados en la meseta; purga automática de colisiones y capas de bosque legacy en `WorldMapManager.js`.
- **Siluetas Panorámicas 360° (`SavannaDistantIslands.js`)**: Visión panorámica desde la cima hacia las 4 islas restantes.

### 5.14 Auditoría Gráfica de Postprocesado WebGL y Sombras
- **Eliminación de Parpadeos Negros por `NaN`**: Erradicación de paneles/cuadrantes negros producidos por contaminación de tiles en `UnrealBloomPass` + `OutputPass` (ACESFilmicToneMapping) en WebGL (DirectX 11 / ANGLE).
- **Corrección de Shaders**: Sustitución de `smoothstep` invertidos en agua, cascadas, césped y terreno por la forma canónica `1.0 - smoothstep(min, max, x)`.
- **Blindaje Matemático**: Protección de funciones `pow(x, y)` contra bases nulas ($\log_2(0) = -\infty$) y de normalizaciones contra vectores nulos.
- **Optimización de Sombras Direccionales (`LightingManager.js`)**: Corrección de sesgo a `0.00002` (eliminando *shadow acne* en terrazas) y sincronización con `updateMatrixWorld()`.
- **Telón de Carga (`ZoneTransitionManager.js`)** (los portales se retiraron después, ver 5.17): Muestreo de altura real con `getGroundHeight()`, restricción vertical $\Delta Y \le 3.5\text{ m}$ e inyección de regla CSS `.zone-curtain.hidden { display: none !important; }`.

### 5.15 Aislamiento de Entradas de Teclado en la Creación de Personaje Sapidae
- **Resolución de Conflicto de Escritura de Nombres**: Al escribir letras como `[I]`, `[M]`, `[J]`, `[L]`, `[O]`, `[E]` o `[W][A][S][D]` en el campo de texto del nombre (`#dofus-char-name`), el juego ya no bloquea la entrada ni activa atajos del overworld.
- **Detención de Propagación en UI (`StartScreenUI.js`)**: `heroSelectModal` y `container` implementan `e.stopPropagation()` para capturar todos los eventos de teclado antes de que escalen a `window`.
- **Guarda Prioritaria en Overworld**: `OverworldManager._setupInput()` ignora teclas si el elemento activo o el objetivo es `INPUT`, `TEXTAREA` o `contentEditable`, o si la pantalla de inicio o creación está abierta.
- **Inhibición de Movimiento en Controladores**: `PlayerController.js`, `OverworldCamera.js` y `DialogSystem.js` suprimen controles mientras se escribe.

---

### 5.16 Dirección de Arte Genshin Impact en la Isla del Bosque (`demo_scena/genshin/`, Hito 22)
- **Orquestador `GenshinForestArt.js`**: se crea al final de `DemoScenaZone22.init()` (flag `useGenshinArt`) y solo cambia el aspecto visual; terreno, río, posiciones (semillas Mulberry32), colisiones, NPCs y HUD quedan intactos. Si falla, vuelve al look anterior automáticamente. Conmutador en consola: `window.genshinArt.setEnabled(false|true)`.
- **Datos horneados (`GenshinTerrainData.js`)**: alturas (R16F) y máscaras RGBA8 (densidad de césped, senderos, flores, humedad de orilla) a partir de la malla del terreno, compartidas por el césped, las flores y el shader del suelo.
- **Cielo y paisaje lejano**: `GenshinSky.js` (degradado anime, sol, nubes cel-shaded) y `GenshinMountains.js` (cordilleras nevadas a 2,3–2,9 km + pilares kársticos en diagonales, sin tapar las 4 islas cardinales).
- **Vegetación**: `GenshinGrassField.js` (tiles de 10 m con geometría instanciada compartida, LOD, sombras reales, viento y pisadas) y `GenshinTrees.js` (árboles frondosos otoñales y coníferas instanciados sobre las posiciones de `PropsManager`).
- **Agua, rocas y personajes**: `GenshinWater.js` (río con profundidad real + océano), `GenshinMaterials.js` (rocas con musgo, follaje toon, rim light y contorno marrón en personajes).
- **Iluminación y post**: preset `genshin_golden` en `LightingManager.js` y `GenshinPostFX.js` (god rays, lens flare, gradación) insertado antes del `OutputPass` del `EnvironmentSystem`.
- **Ajustes posteriores** (Hito 22, sección 7):
  - coníferas con tronco recto;
  - LOD del césped con fundido cruzado (el LOD lejano es un prefijo del cercano);
  - corteza `Bark_NormalTree`, `Bark_TwistedTree` y `Bark_DeadTree` por variedad de árbol, con tono propio;
  - caminos de tierra a parches con *road frame* horneado y texturas `ground_07`;
  - bruma `FogExp2(0xcde4f7, 0.003)` persistente (`_ensureDistanceHaze`).

### 5.17 Rediseño Genshin de las 4 Islas (`world/islands/`, Hito 23)
- **Kit compartido** (`islands/kit/`): hereda de los módulos `demo_scena/genshin/` del Bosque sin modificarlos. Cada isla aporta un perfil (paleta, luz, niebla, hooks GLSL de suelo y acantilado, caminos, vegetación, agua y partículas).
- **Sabana**: `SavannaGenshinArt.js` (capa sobre `SavannaZone`); oasis en la cima a ras de la meseta (`SavannaTerrain.oasisShelf / oasisPoolRadius / oasisWaterLevel`). Conmutador: `window.savannaGenshinArt.setEnabled()`.
- **Ártico / Mística / Mazmorra**: `GrandIslandZone` creada en `OverworldManager.grandIslands` y construida la primera vez que se viaja a la isla. `WorldMapManager._updateGrandIslandVisuals()` activa la isla y oculta el mundo antiguo de 80 m; `travelToIsland` usa `GRAND_ISLAND_TRAVEL`.
- **Niebla**: cada isla usa su propia `FogExp2` y la reaplica cada fotograma mientras está activa (la escena es compartida entre zonas).
- **Mundo de 5 islas** (`islands/IslandWorldLayout.js`):
  - las zonas de esquina de la cuadrícula 3×3 se fusionaron en sus islas (`MERGED_ZONES`, `canonicalZoneId`);
  - el mundo demo de 80 m ya no se construye (`LEGACY_DEMO_WORLD = false`);
  - las anclas de patrulla de los monstruos están validadas por isla (`ISLAND_MONSTER_LAYOUT`).
- **Viaje entre islas**: sin portales cardinales; el barquero Pomodoro (`ferry_pomodoro`, `ui/FerryTravelUI.js`) está en la playa de cada isla (`FERRY_DOCKS`).
- **Sabana**:
  - acacias con la copa calculada desde las puntas de las ramas;
  - paleta de Axie Infinity (lima, amarillo verdoso, naranja y coral, troncos pálidos);
  - pináculos hechos con `Rock_sabana1-5` estirados y con textura de arenisca (`_buildHoodoos`).
- **Monstruos**:
  - `spawnMonster` los coloca en la altura real del suelo;
  - la Quimera Picuda de misión usa `wolf-aquatic` en el mapa (`bird-early` no existe como `.glb`).

## 6. Reglas Inmutables para Desarrolladores y Agentes

Para garantizar la estabilidad del proyecto, cualquier persona o agente que trabaje en este repositorio debe respetar estrictamente:

1. **NO usar bundlers ni paquetes npm en tiempo de ejecución**:
   - No ejecutar `npm install` para añadir dependencias al juego cliente.
   - Si se requiere una utilidad JS, debe colocarse como módulo en `vendor/` o `src/` y exportarse como ES Module.
2. **NO usar `require('three')`**:
   - Siempre importar Three.js como: `import * as THREE from '../../vendor/three.module.js';` o desde `'three'` si es un submódulo con resolución interna de import map.
3. **Mantener `server.js` como estándar de ejecución**:
   - Comando oficial: `node server.js 8082` (puerto `8082`).
4. **Respetar la nomenclatura táctica `AL` (Alcance)**:
   - En el motor de combate, el alcance se denomina siempre **`AL`**, nunca "PO" ni "Range".
5. **Colisiones y Paso de Aliados**:
   - En combate: dos aliados no pueden terminar en la misma casilla, pero pueden atravesarse consumiendo 1 PM.
   - En overworld: colisiones calculadas con `OverworldCollisions.js`, que permite deslizamiento suave en paredes diagonales sin atascos.
6. **Guardar variables de carga como propiedades de clase (`this.*`)**:
   - Nunca almacenar referencias críticas de geometrías o centros en variables locales de métodos `async load()`, ya que métodos síncronos posteriores como `setZone()` fallarán con `ReferenceError`.
7. **Idioma de comunicación**:
   - Mensajes y explicaciones al usuario: **Siempre en español**.
   - Código, comentarios técnicos y commits/logs: En inglés o español según consistencia del archivo.

---

## 7. Referencia Rápida de Teclas y Controles

| Tecla / Input | Modo Overworld | Modo Combate Táctico |
| :--- | :--- | :--- |
| **`[W] [A] [S] [D]`** / Flechas | Mover al héroe por el terreno | Mover cámara táctica relativa a pantalla |
| **`[E]`** | Interactuar con NPCs y cofres | — |
| **`[Espacio]`** | Avanzar diálogos con NPCs | Pasar turno / Confirmar acción |
| **`[I]`** | Abrir / Cerrar Inventario y Habilidades | Bloqueado (`display: none`) |
| **`[L]` o `[J]`** | Abrir / Cerrar Diario de Aventuras | Bloqueado (`display: none`) |
| **`[M]`** | Abrir / Cerrar Modal Dual de Mapas (Mundi / Isla) | Bloqueado (`display: none`) |
| **`[ESC]`** | Abrir / Cerrar Menú de Opciones | Deseleccionar casilla o hechizo |
| **Clic Izquierdo** | Interactuar con la interfaz | Seleccionar casilla de movimiento o apuntar habilidad |
| **Clic Derecho + Arrastrar** | — | Rotar cámara táctica 360° en órbita |
| **Rueda del Ratón** | — | Zoom táctico dinámico |
| **`[Q] / [E]`** | — | Rotar cámara en pasos de 45° |
| **`[R]`** | — | Centrar cámara en el héroe activo |

---

## 8. Verificación y Pruebas

Para comprobar que el proyecto está saludable tras realizar cambios:

```bash
# 1. Iniciar servidor local:
node server.js 8082

# 2. Verificar servidor en otra terminal:
curl -I http://localhost:8082/

# 3. Probar en navegador:
# Abrir http://localhost:8082 y abrir consola F12 para validar que no haya errores rojos.
```

---
*Este documento es la fuente definitiva de verdad arquitectónica para Lunakai: Chronicles of Lunacia.*
