# PROJECT_CONTEXT.md — Lunakai: Chronicles of Lunacia
## Guía Integral de Arquitectura, Estado y Continuidad Técnica

> **Última actualización:** 2026-11-04 (Hito 123, Arena PvP terminada, v0.5.0 — fases P0–P6: motor de combate sin gráficos con las mismas reglas del juego, servidor de la Arena en Supabase (cola, órdenes, huellas, Elo, SLP y temporada), tiempo real (Realtime, servicio y sesión de partida), la Arena dentro del juego (pestaña del Koliseo, búsqueda de rival, combate con los turnos del rival por red, pantalla final y clasificación), el árbitro (Edge Function que repite las partidas en disputa y castiga al tramposo), tableros justos (versiones espejo y salidas equivalentes para los dos bandos) y equilibrio y estadísticas de las partidas reales; probada con dos cuentas reales, ver la sección 5.47 y `docs/HITO_123_ARENA_PVP.md`. Hito 122, Koliseo · Desafío de la Bruma terminado, v0.5.0: premios del top 3 entregados a la partida; combates del Desafío de la Bruma jugables, jefe final Slime Caballero con miasma, modificadores de la semana activos y retratos de enemigos; K = Koliseo y T = Escuadrón; servidor del Desafío de la Bruma y panel del Koliseo con botón en el HUD y opción en Paladill, ver la sección 5.46. Hito 121: formulario de feedback, botón 💬 en el HUD y tarjeta «¿Te está gustando Lunakai?» al terminar el tutorial en lugar del mapa; feedback en Supabase por la función `submit_feedback`, ver la sección 5.45. Hito 120: tutorial rápido con combate final contra el Slime Caballero, cámara de combate isométrica fija, mapa con coordenadas y «Tierra» en lugar de «Isla», precalentado de efectos contra los tirones, ver la sección 5.44. Hito 118: menos brillo en las partes místicas, su color se limita a 0,88 para no disparar el bloom, ver la sección 5.42. Hito 117: las partes místicas de nivel 1 se ven en el juego; el shader místico del mixer ya no declara `uv1` dos veces, ver la sección 5.41. Hito 115: la cámara del tutorial mantiene al Axie a la vista al acariciarlo y alimentarlo, el Axie se mueve con total libertad en el duelo con Paladill, la derrota vuelve al altar de Atia del pueblo, la ranura de partida muestra el Axie principal actual y se quitan el botón de correo, el candado del regalo del tutorial y el disco de sombra del Sapidae; ver la sección 5.40. Hito 110: el Mercado de equipo, runas y charms pasa de bAXS a AXS; Ochi ya no compra runas ni charms. Hito 106: respawn de mobs en puntos aleatorios de toda la isla, 5 manadas por isla, con control de actualización por distancia. Hito 103: sin congelamientos al empezar la partida ni al viajar entre islas; precalentado completo, cargas detrás del telón y perfilador con atribución de código. Hito 98: habilidades por nivel, cuernos 3 / espalda 7 / cola 10. Hito 97: recarga de habilidades y usos por objetivo. Hito 96: el equipo del mundo sigue a la Forja; humo en las chimeneas. Hito 95: las 4 clases del Sapidae rehechas según el lore, con un gólem por clase). Lista completa de hitos: `docs/README.md`.  
> **Nombre del Proyecto:** Lunakai: Chronicles of Lunacia (anteriormente Axie Tactics / Axie Adventures)  
> **Estado actual:** mundo abierto 3D con **5 Grandes Islas** de 480 m y dirección de arte Genshin (cel-shading suave, pictórico, con bruma): Bosque (Hito 22), Sabana, Ártico, Mística (Hito 23) y **Genesis**, la antigua Mazmorra rediseñada (Hito 24). El Hito 24 añade también un plan de mejora por bioma (puente del Bosque; lugares de la Sabana, el Ártico y la Mística; *Fade LOD* de árboles en el Ártico). Las islas nuevas se construyen la primera vez que se visitan. El viaje entre islas se hace con el **barquero Kawa** (Pomodoro hasta el Hito 51, Kappa hasta el Hito 56), en la playa de cada isla; los portales cardinales están retirados. Los terrenos del mundo demo 1.0.0 (cuadrícula de macro-zonas de 80 m) ya no se construyen y su contenido de misiones vive en las islas. NPC, monstruos y nodos de misión están validados sobre el terreno real. Se mantienen la auditoría WebGL anti-NaN, el sistema dual de mapas, el minimapa radar y el determinismo Mulberry32. Desde el Hito 25 hay cuentas con Sky Mavis y guardado en Supabase. Los Hitos 26–32 rehacen el motor de combate en 6 fases (0–5): eventos, estados, habilidades de Sapidae, Ultimates, cartas de partes reales, pronóstico de daño y equilibrio. Ver la sección 5.19. Los Hitos 33–48 añaden VFX propios, mapas de combate por bioma, la economía (Forja, Tienda, runas y charms, recolección, lista de ítems), los modelos Ema y Kai, y una partida nueva que empieza con la cinemática del prólogo y el tutorial en 7 fases. Ver la sección 5.21. El Hito 49 optimiza el rendimiento (islas, memoria de texturas y combates) sin cambiar la imagen; ver la sección 5.22. El Hito 50 convierte el tutorial en una guía paso a paso que bloquea todo lo demás; ver la sección 5.23. Los Hitos 51–53 añaden el pueblo del Bosque, las armas del mixer y mejoras de memoria y FPS; ver la sección 5.24. El Hito 54 convierte las runas y los charms en objetos (sección 5.25) el Hito 55 pone modelos GLB en la Sabana (sección 5.26) el Hito 56 en el Ártico (sección 5.27) el Hito 57 en la Mística (sección 5.28) y el Hito 58 en Genesis (sección 5.29).  
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
├── server.js                        ← Servidor HTTP Node.js (puerto 8082, APIs de guardado)
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
│   ├── models/                      ← Modelos 3D GLB (Sapidae_Ema / Sapidae_Kai del jugador, sapidae-f/m-* de los NPC, paladill, xia, stylized_dojo, quimeras, slime...)
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
│   │   ├── TutorialManager.js       ← Combate guiado (8 pasos con flecha 3D) del primer combate del tutorial
│   │   ├── VFXManager.js            ← Partículas de hechizos, proyectiles e impactos
│   │   ├── combat/                  ← MOTOR DE REGLAS (Hitos 26–32)
│   │   │   ├── CombatEvents.js      ← Bus de eventos del combate (spell:cast, unit:damaged, status:applied…)
│   │   │   ├── SpellPresentation.js ← VFX, sonidos y textos por defecto (escucha los eventos)
│   │   │   ├── StatusSystem.js      ← 22 estados alterados con duración y modificadores
│   │   │   ├── EffectResolver.js    ← Ejecuta las habilidades escritas como datos (effects: [...])
│   │   │   ├── Elements.js          ← Triángulo de clases ±15 %
│   │   │   ├── BattlefieldObjects.js ← Obstáculos y zonas temporales
│   │   │   ├── UltimateSystem.js    ← Duo Ultimates (vínculo al 100 %)
│   │   │   ├── Forecast.js          ← Pronóstico de daño sin efectos secundarios (HUD e IA)
│   │   │   ├── CollectionVFX.js     ← VFX de las partes de colección especial
│   │   │   ├── CombatTelemetry.js   ← Registro de equilibrio de cada combate (localStorage)
│   │   │   ├── TutorialCombatHooks.js ← Reglas especiales del combate guiado
│   │   │   ├── RuneCharmEffects.js  ← Efectos de runas y charms en combate (Hito 44)
│   │   │   ├── TestArena.js         ← Arena de pruebas (lkDebug.arena)
│   │   │   └── CombatDebug.js       ← Consola window.lkDebug
│   │   └── data/
│   │       ├── PartCards.js         ← 235 cartas de partes (generado: no editar a mano)
│   │       ├── PartVariants.js      ← Variante de arte de cada parte
│   │       ├── StarterCards.js      ← Cartas α de Bing y Pomodoro
│   │       ├── CollectionCards.js   ← Cartas de colección Japan y Xmas
│   │       └── EnemySpellEffects.js ← Estados de los hechizos enemigos
│   ├── render/                      ← UTILIDADES DE RENDER (Hito 49): RenderWarmup.js (precalentado de shaders/texturas, waitProgramsReady), StaticMerge.js (combinar decorado fijo por material), ProgramKeepAlive.js (conservar shaders de materiales destruidos)
│   ├── vfx/                         ← MOTOR DE VFX (Hito 33): vfx-core.js (sin DOM), vfx-lib.js, modules/mod-<clase>-<parte>.js (235 efectos), vfx-cards.js (carta → efecto)
│   ├── net/                         ← CUENTAS Y NUBE (Hito 25): AuthService, CloudSave, AccountManager, config
│   ├── ui/                          ← HUD DE COMBATE Y PANELES: CombatHUD, ForecastPanel, UltimateButton, AxieCarePanel, ForgePanel, ShopPanel, RunesCharmsPanel, GatheringHUD, MaterialIcons, CSS lunakai-* (lunakai-tutorial.css: cinemática y tutorial)
│   └── rpg/                         ← MOTOR DE EXPLORACIÓN DE MUNDO ABIERTO (OVERWORLD)
│       ├── OverworldManager.js      ← Director general del Overworld, loop y renderizado
│       ├── PlayerEntity.js          ← Héroe explorador Sapidae humanoide y Compañero Axie seguidor (modelos 3D y animaciones)
│       ├── PlayerController.js      ← Control WASD, físicas, estados de habilitación/bloqueo
│       ├── OverworldCamera.js       ← Cámara isométrica (seguimiento suave + snapToTarget)
│       ├── OverworldCollisions.js   ← Sistema de colisiones sólidas AABB y círculos con deslizamiento
│       ├── SapidaeModularController.js ← Personalización por piezas A–E de Ema y Kai (peinado, ojos, boca, colores) y expresiones
│       ├── SapidaeModels.js         ← Modelos del jugador (Ema / Kai) y migración de los antiguos (Hito 47)
│       ├── ForgeService.js / ShopService.js / GatheringService.js / LootService.js ← Economía (Hitos 43–46)
│       ├── BondService.js / AxieCareService.js / RuneCharmService.js ← Vínculo, cuidados y runas por Axie
│       ├── NPCManager.js            ← Spawning de NPCs (Maestro Paladill, Xia), auras y colisión
│       ├── DialogSystem.js          ← Sistema de diálogos ramificados interactivos
│       ├── WanderingMonsters.js     ← Quimeras errantes en el mapa con patrulla e IA de alerta (!)
│       ├── BattleTransition.js      ← Transición cinematográfica fluida entre Overworld y Combate
│       ├── QuestManager.js          ← Gestor de misiones, estados de objetivos y recompensas
│       ├── SaveSlotManager.js       ← 3 Ranuras de guardado en localStorage + auto-save
│       ├── AxieMixerService.js      ← Generación / personalización de apariencia Axie
│       ├── OverworldTutorialManager.js ← (Legacy, ya no se crea) tutorial antiguo; lo sustituye tutorial/TutorialDirector.js
│       ├── CinematicFlythrough.js   ← (Legacy) vuelo de cámara del prólogo antiguo
│       ├── tutorial/                ← TUTORIAL NUEVO (Hito 48): TutorialDirector.js (pasos, bloqueos, franja, recompensas, guardado v2) y TutorialScript.js (todos los textos)
│       ├── cinematic/               ← CINEMÁTICA DEL PRÓLOGO (Hito 48): PrologueCinematic.js (motor) y CinematicArt.js (arte procedural en Canvas)
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
│       │   │   ├── SavannaLandmarksManager.js ← Campamento de Bing (hoguera, diana, estandarte); altar y fragua antiguos ocultos
│       │   │   ├── SavannaGenshinLandmarks.js ← Modelos GLB (kit IslandProps): casas, altar de Atia, tótem, tabla de surf y balsa (Hito 55)
│       │   │   ├── SavannaParticles.js  ← Ráfagas de viento y polvo de arena del desierto en suspensión
│       │   │   ├── SavannaDistantIslands.js ← Siluetas panorámicas 360° vistas desde la cima de la meseta
│       │   │   └── SavannaAssetManager.js ← Carga y gestión de recursos 3D y texturas de la Sabana
│       │   ├── islands/                 ← HITO 23/24: kit Genshin compartido + Ártico, Mística y Genesis (480 m, carga diferida)
│       │   │   ├── kit/                 ← Terreno/caminos, césped, árboles, cielo, agua, cristales, partículas, orquestador
│       │   │   ├── GrandIslandZone.js   ← Zona base de isla grande (terreno, luces, rocas, colisiones, horizonte)
│       │   │   ├── GrandIslands.js      ← Registro zona → isla y puntos de llegada de "Viajar a"
│       │   │   ├── IslandWorldLayout.js ← Zonas fusionadas, muelles del barquero, anclas de monstruos y NPC reubicados
│       │   │   └── arctic/ · mystic/ · dungeon/ ← Geografía, perfil de arte y puntos de interés de cada isla (dungeon/ = Genesis: DungeonIsland, GenesisLandmarks, GenesisNature, GenesisSilhouette)
│       │   └── demo_scena/              ← ENTORNO DE MUNDO ABIERTO DE ALTA FIDELIDAD (GENSHIN/BOTW STYLE)
│       │       ├── genshin/             ← CAPA DE DIRECCIÓN DE ARTE GENSHIN (Hito 22): cielo, montañas, césped, árboles, agua, post
│       │       ├── DemoScenaZone22.js   ← Orquestador de la escena de mundo abierto
│       │       ├── Terrain.js           ← Terreno continuo esculpido con ruido Simplex determinista
│       │       ├── VegetationManager.js ← 50.000 briznas de césped V3 GPU, viento, deformación por pisadas y flores
│       │       ├── PropsManager.js      ← ~350 árboles y rocas reales texturizados instanciados en ~30 draw calls
│       │       ├── WaterManager.js      ← Río continuo con peces animados, espadañas, rocas y ondas de choque
│       │       ├── LandmarksManager.js  ← Gran Árbol Sagrado, Dojō, Santuario con monolitos levitantes y partículas
│       │       ├── DistantIsland.js     ← Siluetas de islas remotas en 360° (Ártico, Sabana, Místico, Genesis)
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
├── supabase/                        ← Migración SQL y Edge Function skymavis-auth (Hito 25)
├── tools/part-mapper.html           ← Herramienta para revisar el mapeo de partes y cartas
├── tools/vfx-lab/                   ← Laboratorio de VFX (no se sube al hosting); ver su README
└── docs/                            ← Documentación técnica e hitos (Hitos 1 al 32; índice en docs/README.md)
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
            ├─ grandIslands (Ártico/Mística/Genesis) ← grupos vacíos; se construyen al primer viaje
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
                 ✨ Isla Genesis
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
   - **🐶 Campamento de Bing:** Refugio nómada del alegre cachorro Bing (Beast) y su reserva de helados.
   - **🔨 Fragua Nómada de Baruk:** Gran herrería del cañón forjando acero de Atia.
3. **❄️ Isla del Ártico (Norte - Nivel 4 - 6):**
   - **🏔️ Valle de la Escarcha Eterna:** Santuario congelado con el Altar de Atia (sustituye a los tótems).
   - **🌱 Invernadero de Pomodoro:** Refugio botánico; Pomodoro vive ahora en su casa de troncos junto a la hoguera.
   - **🍲 Campamento de Cocina Boreal:** Puesto de provisiones y estofado de nieve.
4. **🔮 Isla Mística (Oeste - Nivel 7 - 9):**
   - **✨ Santuario del Vacío Astral:** Monolitos celestes que resuenan con las constelaciones.
   - **🌌 Nebulosa de Lunacia:** Fisura mágica de polvo estelar y tiempo distorsionado.
   - **🔭 Observatorio Astral:** Torre de contemplación cósmica con cúpula de amatista y telescopio, junto a la casa del astrólogo.
5. **✨ Isla Genesis — Jardines Reales del Origen (Sur - Nivel > 10, antes Mazmorra):**
   - **⛩️ Puerta del Santuario:** Puerta monumental con velo de aurora custodiada por Kotaro.
   - **🌸 Jardín Real:** Plaza central con tótem, monumentos abstractos y cristales.
   - **🏛️ Santuario del Origen:** Columnas antiguas, gran arco y Trono del Origen con el Espíritu de Atia.

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
  - **Bing** (Beast) y **Pomodoro** (Bug): Axies iniciales oficiales de Origins con sus 6 cartas α originales (`tactics/data/StarterCards.js`).
    - Bing es un cachorro alegre de la Sabana; su historia ya no es «el arquero alado». Cartas: Puppy (×3), Toy Ball (provocación), Cone Shell y Shiba (golpe fuerte que potencia).
    - Pomodoro es el «Leaf-Shell Guardian» y sigue siendo el barquero. Cartas: Passion, Leaf Bug, Platypus, Lost Dream y Village Hero.
  - **Axies del jugador:** cada Axie usa las 6 cartas de sus partes reales (`rpg/AxiePartsResolver.js`: caché → API de Sky Mavis → genes). La ranura del Axie principal tiene el id interno `kotaro`, heredado del prototipo; en pantalla se ve el nombre real del Axie.
- **Iconos de Habilidades Dedicados**: Ubicados en `assets/skills/heroes/<nombre>/1.png` a `6.png`, integrados en `Spells.js`, `InventoryModal.js` y `StartScreenUI.js`. Sapidae (Hito 95): `assets/skills/heroes/<crafter|shepard|lunalogist|stargazer>/1–6.webp`, una por habilidad en su orden.
- **Enemigos Quimeras y Slimes**: Modelos 3D animados con animaciones de idle, walk, attack, skill y faint.

### 5.4 Estudio de Personalización Sapidae y Diorama 3D
- **Interfaz Dofus-Inspired**: Layout en 3 columnas en `StartScreenUI.js` para crear y personalizar al aventurero.
- **Controlador Modular (`SapidaeModularController.js`)**: Gestiona peinados (Braids, Short Crop, Spiky, Wild), ojos (Wide, Determined, Fierce, Narrow), cornamenta ancestral (Antlers, Ram, Curved, Spike) y tintes RGB interactivos con botón "Base Texture" para volver a la tela original.
- **Diorama 3D en Tiempo Real (`CharacterPreviewDiorama.js`)**: Pedestal de piedra 3D con controles de rotación 360° `[⟲] [⟳]`, iluminación cinemática y renderizado simultáneo del avatar Sapidae y su compañero Axie 3D.
- **4 Clases de Sapidae** (Hito 95): Alfarero de Gólems (`crafter`), Comandante de Sombrero (`shepard`), Guardián de Campanas (`lunalogist`) y Rastreador Gogo (`stargazer`), con stats base y previsualización de 6 hechizos con tooltips flotantes. Cada clase invoca su gólem (Centinela, Sombrero, Campanario, Caparazón). Ver `docs/HITO_95_GOLEMS_Y_CLASES_SAPIDAE.md`.

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
  - **Sur:** Isla Genesis (`GenesisSilhouette.js`, Hito 24): meseta-jardín en dos terrazas, pilares lavanda en capas, copas de árboles y el gran arco del Santuario. Sustituye a la antigua silueta lunar volcánica.

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
- **Ártico / Mística / Genesis**: `GrandIslandZone` creada en `OverworldManager.grandIslands` y construida la primera vez que se viaja a la isla. `WorldMapManager._updateGrandIslandVisuals()` activa la isla y oculta el mundo antiguo de 80 m; `travelToIsland` usa `GRAND_ISLAND_TRAVEL`.
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

### 5.18 Mejora de Biomas y Rediseño de Genesis (Hito 24)
- **Bosque**: `demo_scena/ForestBridge.js`, puente `bridge.glb` de 4 módulos en arco entre (17.3, 27) y (53.4, 22); `getDeckHeight()` y barandillas `forest_bridge_rail`.
- **Sabana**:
  - `SavannaGenshinLandmarks.js`: casa de Bing, Altar de Atia y fragua de Baruk;
  - `SavannaGenshinOasis.js`: plantas, espuma y peces;
  - `SavannaGenshinNature.js`: rocas, arbustos, flores, bruma y polen;
  - cactus `cactus_forge3D`.
- **Ártico**:
  - `ArcticSites.js`, `ArcticLandmarks.js` y `ArcticIce.js`, el plan de 12 puntos;
  - 76 árboles nuevos (`firteal`, `frostbroad`, muertos);
  - `ArcticTreeLOD.js`: *Fade LOD* con *dither* de 70 a 95 m hacia *proxies* de bajo poligonaje.
- **Mística**:
  - `MysticLandmarks.js`: Observatorio Astral, casa del astrólogo, islote con sauce luminoso y pilar rúnico;
  - `MysticLife.js`: mariposas, vegetación luminosa de `assets/mystic`, peces, luciérnagas, lianas, guijarros y espuma;
  - canal emisivo de cristales, 3 luces puntuales y hierba en dos tonos.
- **Genesis** (`islands/dungeon/`, id interno `dungeon`):
  - `DungeonIsland.js` reescrito;
  - `GenesisLandmarks.js`: Puerta del Santuario, Jardín Real, cantera y Santuario del Origen;
  - `GenesisNature.js`: pilares lavanda, troncos y espuma;
  - `GenesisSilhouette.js`: silueta del horizonte;
  - nombres, misiones y textos renombrados a Genesis.
- **Primitivas**: los lugares nuevos son marcadores de posición con primitivas (`bakeParts` → una malla con color por vértice + una de brillo) hasta tener assets propios. Máximo 3 luces puntuales nuevas por isla.

### 5.19 Cuentas y motor de combate nuevo (Hitos 25–32)

| Hito | Sistema | Puntos clave |
| --- | --- | --- |
| 25 | Cuentas y nube | Sky Mavis (OAuth + PKCE en la Edge Function); el botón de correo se quitó de la pantalla de inicio en el Hito 115 (el código sigue, sin forma de abrirlo); ranuras en Supabase; `localStorage` solo como caché. |
| 26 | Fase 0: eventos | `castSpell` es un pipeline que emite eventos; los VFX escuchan (`SpellPresentation`). El azar de las reglas va aparte (`spellManager.rng`). |
| 27 | Fase 1: estados | 22 estados, áreas nuevas, triángulo de clases ±15 % y habilidades como datos (`effects`). |
| 28 | Fase 2: Sapidae | Las 24 habilidades de las 4 clases, fieles al Manifiesto. |
| 29 | Fase 3: Ultimates | Vínculo por Axie y 3 Duo Ultimates según la tríada del Axie principal (tecla 7). |
| 30 | Axie Care | Clic en el compañero: acariciar, comida y paseo para subir el vínculo. |
| 31 | Fase 4: cartas | 235 cartas de partes con arte oficial, cartas reales por Axie, Bing y Pomodoro de Origins, y colecciones Japan y Xmas. |
| 32 | Fase 5: integración | Pronóstico de daño, enemigos con estados, IA con pronóstico, 1 uso por turno de las cartas de tempo, corrección de unidades superpuestas, equilibrio y registro de partidas. |

**Reglas del combate que conviene recordar:**

- **Nada de VFX dentro de las reglas.** Los efectos visuales escuchan los eventos de `CombatEvents.js`; el motor de VFX propio se conectará ahí.
- **Habilidades nuevas como datos.** Se escriben como `effects: [...]`. `Forecast.js` debe seguir coincidiendo con el daño real; la prueba de fase 5 lo comprueba carta por carta.
- **Cartas de tempo.** Las cartas que dan PA o PM al propio equipo llevan `castsPerTurn: 1`.
- **Turnos y casillas.** `TurnManager.turnEnding` bloquea las órdenes mientras se pasa el turno, y `syncOccupancy()` repara las casillas al empezar cada turno.
- **Cartas de partes.** `PartCards.js` se genera con un script; los ajustes de equilibrio van en ese script, no a mano en el archivo.

**Equilibrio:** cada combate queda registrado. En la consola (F12), `lkDebug.balance()`, `balanceFights()` y `balanceExport()` muestran y descargan el registro. Las propuestas pendientes de las primeras partidas reales están en el Hito 32: suavizar la escala de Mística y Genesis y subir el daño de Stargazer.

**VFX (Fase 6):** etapas 1 y 2 completadas (Hitos 33 y 34). El núcleo y los módulos viven en `src/vfx/` y el laboratorio en `tools/vfx-lab/`. `VfxBridge.js` reproduce los efectos en combate: `ctx.vfx.untilImpact` retrasa el daño hasta el impacto y `SpellPresentation` no dibuja el impacto por defecto de esas cartas. Las etapas siguientes ya están hechas: todas las cartas, Sapidae, Ultimates y enemigos tienen efecto (Hitos 36 y 42), y las runas y los charms funcionan en combate (Hito 44).

### 5.20 Mapas de combate por bioma (Hito 35)

- **Elección:** los combates del mundo abierto usan uno de los 3 mapas del bioma, al azar y sin repetir el último. Los jefes usan su mapa fijo: líder 👑 (`pack.isBoss`), rol `apex_boss` o `armored_titan`, y las misiones `mob_polar_golem` y `mob_oracle_chimera`. La campaña antigua y `lkDebug.arena()` siguen en el 10×10; el tutorial se juega en el Claro de Arces (Hito 37).
- **Datos:** `src/tactics/maps/BattleMaps.js`, con una letra por casilla (leyenda en `BattleMapLayout.js`). Tras cualquier cambio, `node tools/battle-maps/check-maps.mjs`.
- **Tablero:** `GridManager.loadLayout(mapa)` cambia el tamaño y la forma; fuera del tablero `isValidCoord` es falso. El agua corta el paso, pero no la visión. Un empuje contra el vacío choca como contra un muro. En los mapas con forma, `TacticalAI` se acerca por distancia caminando.
- **Escenario:** `src/tactics/arena/BattleArena.js` y `BattleArenaThemes.js`, con el arte de las islas. Lo coloca `SceneManager.setArena()` y se libera al volver al mundo abierto. Ver `docs/HITO_35_MAPAS_DE_COMBATE_POR_BIOMA.md`.
- **Dither fading (Hito 37):** `src/tactics/arena/ArenaOcclusionDither.js` disuelve el escenario que tapa a una unidad o a la casilla bajo el ratón; obstáculos del tablero ≥ 35 % visibles, decoración ≥ 8 %. Los puntos los da `main._occlusionPoints()`.

### 5.21 VFX, economía, personaje y tutorial (Hitos 33–48)

| Hito | Sistema | Puntos clave |
| --- | --- | --- |
| 33–34, 36, 42 | VFX en combate | Motor propio en `src/vfx/` (núcleo sin DOM + 235 efectos), `VfxBridge.js` en combate, Sapidae y Ultimates, enemigos; precompilado de shaders. |
| 35, 37 | Tableros | 15 mapas por bioma (`BattleMaps.js`), escenario con el arte de la isla y *dither fading*. |
| 38–41 | Ajustes y cuentas | Vida persistente, turnos alternados, fuego amigo, vínculo equilibrado, estadísticas base por clase y rol, Axies por ID, inicio de sesión OIDC con Sky Mavis. |
| 43 | Forja y Tienda | Yunque del patio (E): crear Tier 0 y evolucionar; Tienda del Mercader Ochi. |
| 44 | Runas y charms | 63 runas y 90 charms con efecto en combate (`RuneCharmEffects.js`), tecla U. |
| 45 | Recolección | Pesca y tala (Axie), minería y flores (Sapidae); 3 puntos por isla y el árbol de la Forja. |
| 46 | Ítems | 7 líneas de equipo × 4 rarezas, 14 materiales, comida y pociones; iconos WEBP con fondo de rareza; la Forja se queda la pieza al evolucionar; pantalla de arranque. |
| 47 | Ema y Kai | Modelos del jugador por piezas A–E con colores; expresiones en combate. |
| 48 | Prólogo y tutorial | Cinemática de 73 s (papel y teatro de sombras, final épico con el modelo del jugador y el logo). Tutorial en 7 fases: defensa del Dojo, Mochila, duelo con Paladill (fin al 30 %), Forja (×4 gratis), vínculo y prueba de la Ultimate (ronda 1), runas y graduación. «Saltar tutorial». |

**Reglas del tutorial que conviene recordar:**

- **Una sola fuente de textos:** `src/rpg/tutorial/TutorialScript.js` (pasos, diálogos, consejos, avisos y recompensas). Diálogos de 2–3 líneas como máximo.
- **API heredada:** `TutorialDirector` mantiene la API del gestor antiguo (`isActive`, `isFeatureUnlocked`, `isInputLocked`, `hideBanner`, `loadSaveData`…). Las funciones nuevas preguntan `tutorialManager.lockMessage('forge' | 'care' | 'runes' | 'shop' | 'gather' …)` antes de abrirse.
- **Combates del tutorial:** `LEVELS_CONFIG[1]` (guiado), `tut_duel` (regla de fin `TurnManager.endRule`, al 30 % de vida) y `tut_ult` (`ultimateMinRound: 1`). Se lanzan con `OverworldManager.startTutorialBattle(id, config)` y al volver avisan a `TutorialDirector.onBattleReturn`.
- **Guardado:** `slot.tutorialProgress = { v: 2, step, done, flags, bondBefore }`. Cualquier progreso antiguo, o nivel > 1, cuenta como tutorial terminado.
- **Cinemática:** usa el renderer del juego con `gameState = 'CINEMATIC'` (el bucle principal no dibuja). El velo negro de carga se quita mientras se reproduce.

### 5.22 Optimización de rendimiento (Hito 49)

| Área | Qué se hizo | Dónde |
| --- | --- | --- |
| Bosque | Río instanciado, partículas en pausa fuera de cámara, recorte por árbol (LOD desactivado), caja de sombras 80 con ajuste al texel, calidad Media/Baja, construcción diferida (`ensureForestBuilt`). | `demo_scena/`, `genshin/`, `OverworldManager.js` |
| Memoria | 40 GLB con texturas a 1024 (jefe y cuerpo del Sapidae a 2048); árboles antiguos diferidos (salvo `tree_twisted_1`); variantes del Sapidae fuera de la GPU (`lkNoPrewarm`); texturas de islas inactivas liberadas (`releaseTextures`). | `DemoScenaAssetManager.js`, `PropsManager.js`, `SapidaeModularController.js`, `render/RenderWarmup.js`, `WorldMapManager.js` |
| Sabana | Carga diferida de modelos y texturas antiguos; `forceSinglePass`; las islas se construyen antes de cambiar `currentMapId`. | `world/savanna/`, `WorldMapManager.js` |
| Horizonte | `mergeStaticByMaterial` en las cinco islas: 174 → ~10 mallas. | `render/StaticMerge.js`, `GrandIslandZone.js`, `DemoScenaZone22.js`, `SavannaZone.js` |
| Mística | Islotes y lugares combinados; minimapa con el nombre real de la isla. | `MysticIsland.js`, `MysticLandmarks.js`, `MinimapHUD.js` |
| Combate | Hover una vez por fotograma y solo si cambia algo; casillas resaltadas en reserva; ficha de unidad sin recalcular la página; fotograma completo detrás del velo; `ProgramKeepAlive`; marcas y estelas compartidas; nubes combinadas. | `main.js`, `GridManager.js`, `CombatHUD.js`, `SpellPresentation.js`, `SceneManager.js`, `VfxBridge.js` |

Detalle, mediciones y reglas en `docs/HITO_49_OPTIMIZACION_DE_RENDIMIENTO.md`.

### 5.23 Tutorial guiado paso a paso (Hito 50)

- **Mundo abierto:** `TutorialDirector._computeGuide()` decide qué señalar (elemento o hueco en el mundo, frase, teclas permitidas) y `_updateGuide()` lo aplica cada 200 ms con el velo `#tutorial-focus-overlay.lk-tut-guide`, la flecha y la capa `#lk-tut-catch`. Fuera del hueco no responde nada; las teclas pasan por `_guardKeys` (fase de captura).
- **`isOverlayActive`:** queda en `false` cuando la guía señala el botón de la Mochila, el Axie o el panel de cuidados, porque `isAnyModalOpen()` lo lee y si no el juego ignoraría el botón, la tecla U o el clic sobre el compañero.
- **Combate:** `TutorialManager` tiene pasos fijos (Dojo) y una guía calculada por turno para el duelo y la Ultimate (`startDynamic('duel' | 'ult')`, `_dynStep`). `main.js` consulta `isSpellAllowed`, `isUltAllowed` y las casillas permitidas antes de pintar o actuar, y llama a `nudge()` si se intenta otra cosa.
- **Mientras dura el tutorial:** solo Paladill habla (`NPCManager.tryInteract`) y los slimes del Bosque están ocultos (`SlimeCreaturesManager._tutorialRunning`).
- **Paso nuevo con ventana:** añadir su caso en `_computeGuide()` con un selector estable (`data-*`), no con textos.
- **Memoria al cargar partida:** lo que se crea en `OverworldManager.init()` y registra escuchadores en `window` o se añade a la escena necesita `dispose()` (como `PlayerController` y `PlayerEntity`), o crearse una sola vez. Los Axies de la librería del mixer se devuelven con `axie.dispose()` (también en `Unit.dispose()`).

Detalle y pruebas en `docs/HITO_50_TUTORIAL_GUIADO_Y_AJUSTES.md`.

### 5.24 Pueblo del Bosque, armas del mixer, memoria y rendimiento (Hitos 51–53)

- **Pueblo (Hito 51):** `world/ForestVillageLayout.js` (posiciones y puntos derivados, sin imports) y `world/ForestVillage.js` (`InstancedMesh` por modelo, claros en la hierba, colisiones, se libera al salir con `ModelCache.evictGLTF`). Ochi, Paladill, la Forja, su árbol y el Guardián de los Pergaminos leen sus puntos del layout. El barquero es **Kawa** (id interno `ferry_pomodoro`). Los NPC animados necesitan `skeleton.dispose()` al retirarse y los de luz horneada `matte: true`.
- **Armas (Hito 52):** `rpg/WeaponVisuals.js` decide el modelo por objeto (`WEAPON_VISUALS`) y el agarre del Sapidae (`SAPIDAE_GRIP`, hueso `Weapon_R`; el tamaño se compensa en cada fotograma porque las animaciones de Kai escalan el hueso). El Axie usa `equipAxieWeapon`, que libera el esqueleto del arma anterior.
- **Memoria (Hito 53):** la cinemática suelta las texturas de sus modelos; `SapidaeModularController.releaseHiddenFace` libera las variantes ocultas al aplicar el equipo y al volver de un combate, y el precalentado de efectos respeta `lkNoPrewarm`.
- **Rendimiento (Hito 53):** en `EnvironmentSystem.render` las sombras se recalculan uno de cada dos fotogramas y `_trimSmallShadows` quita la sombra a la vegetación pequeña y las farolas; el bloom va a media resolución; `PlayerEntity` comparte un solo esqueleto entre las piezas del Sapidae (`shareSkeletons`).

Detalle en `docs/HITO_51_PUEBLO_DEL_BOSQUE.md`, `docs/HITO_52_ARMAS_DEL_MIXER.md` y `docs/HITO_53_MEMORIA_TUTORIAL.md`.

### 5.25 Runas y charms como objetos (Hito 54)

- `RuneCharmService` guarda también la bolsa (`slot.runeCharmBag`): solo se equipa lo libre (`available`); `openBag(kind)` da una de clase al azar y `rollNeutral(kind)` una neutra (botín en `main.js`, `EconomyCatalog.RUNE_CHARM_DROP`).
- Bolsas `rune_bag` y `charm_bag` (ItemDatabase, recetas de la Forja) se abren en la Mochila (`InventoryModal._openBag`).
- La Tienda vende runas y charms con ids `rune:<id>` / `charm:<id>` (`ShopService.itemOf`, `EconomyCatalog.RUNE_CHARM_SELL`).
- Arte compartido en `ui/RuneCharmArt.js`; tarjeta de recompensa en `ui/RewardCard.js`.
- Tutorial: paso `forge_close`, `AxieCareService.tutorialFill` (caricia + comida = 100 %), sin préstamo de vínculo. Detalle en `docs/HITO_54_TUTORIAL_Y_RUNAS_COMO_OBJETOS.md`.

### 5.26 Modelos GLB en la Sabana (Hito 55)

- `SavannaGenshinLandmarks` carga `house.glb` (campamento de Bing y casa de Baruk), `altar_atia.glb`, `totem_2.glb`, `table_surf.glb` y `balsa.glb` con la clave `'<url>#sabana'`: el pueblo del Bosque descarga sus modelos al salir (`evictGLTF`) y no debe compartir caché con la Sabana. La Sabana no descarga los suyos (`WorldMapManager` libera las texturas de islas inactivas).
- Ya no hay fragua ni altar del Sol con primitivas (ni sus luces puntuales). Las colisiones se conocen al construir; solo la balsa se mueve. Detalle en `docs/HITO_55_MODELOS_DE_LA_SABANA.md`.

### 5.27 Modelos GLB en el Ártico (Hito 56)

- Kit compartido `rpg/world/islands/kit/IslandProps.js`: `ISLAND_PROPS` + `placeIslandProps()` (colisiones al momento, modelos al cargar, caché `'<url>#islas'` compartida por Sabana y Ártico, zócalo de piedra en pendientes > 25 cm). Para añadir una pieza a una isla: una entrada en `ISLAND_PROPS` y una línea en la lista de la isla.
- Ártico: casas `house.glb` (Pomodoro, Ermitaño y la del Campamento Boreal, junto a la de Pomodoro para dejar el lago despejado; `house_artic.glb` ya no se carga en la isla), `shop.glb` del Chef, `totem_ice` en el valle (sitio `altar`), `altar_atia` en el sitio nuevo `atia` (19, 76), banderas y `totem`. Detalle en `docs/HITO_56_MODELOS_DEL_ARTICO.md`.

### 5.28 Modelos GLB en la Isla Mística (Hito 57)

- `MysticLandmarks._buildModels()` usa el kit `IslandProps` (grupo `MysticProps`, fuera del `mergeStaticByMaterial`): `house.glb` para el astrólogo y `statue_mystic` en el islote (antes pilar de runas) y el Observatorio.
- La flor `herb_mystic_2` pasa a la orilla del pantano (−46, 33). Detalle en `docs/HITO_57_MODELOS_DE_LA_MISTICA.md`.

### 5.29 Estatuas GLB en Genesis (Hito 58)

- `GenesisLandmarks._buildPlazaStatues()` (kit `IslandProps`): `peluche.glb` en el centro del Jardín Real y siete estatuas de armas (`lanza`, `hacha`, `doble`, `mando`, `baston`, `arco`, `mana`) en el círculo de 17 m, mirando al centro. El NPC `atia_spirit` usa `assets/models/atias.glb` (`matte: true`). Detalle en `docs/HITO_58_ESTATUAS_DE_GENESIS.md`.

### 5.30 Dos idiomas (Hito 59)

- `src/i18n/i18n.js` + diccionarios `src/i18n/{es,en}/*.js`. Todo texto visible nuevo va por `i18n.t('modulo.clave')` con la clave en **los dos** idiomas (revisar con `check_i18n.py`). Idioma por defecto inglés; se lee una vez al cargar (`axie_lk_prefs.lang`) y cambiarlo guarda y recarga. Nombres de personajes y cartas no se traducen; lugares sí. Ids, variables y datos guardados no cambian. Detalle en `docs/HITO_59_DOS_IDIOMAS.md`.
- Hito 60 (historia): módulos `quests`, `npc`, `npcDefs`, `tutorial*`, `prologue`, `story`. El código que decide buscando palabras en un texto visible debe usar `i18n.en(texto)` (versión inglesa) para comportarse igual en los dos idiomas. Detalle en `docs/HITO_60_IDIOMAS_HISTORIA.md`.
- Hito 61 (datos): listas grandes de datos se traducen con `i18n.applyText(lista, prefijo, campos)` justo después de definirlas (claves `prefijo.<id>.<campo>`); si un archivo de datos se regenera, conserva esa línea. `i18n.inLang(texto, lang)` para analizar textos visibles en un idioma fijo. Nombres oficiales de Axie (cartas, runas, charms) no se traducen. Detalle en `docs/HITO_61_IDIOMAS_DATOS.md`.
- Hito 62 (sistema): el juego queda completo en los dos idiomas (3597 claves). Números con decimales siempre con `i18n.num` (o el idioma activo), nunca `replace('.', ',')` fijo. Lo que queda sin traducir a propósito está listado en `docs/HITO_62_IDIOMAS_SISTEMA.md` §3.

### 5.31 Sin congelamientos al empezar ni al viajar (Hito 103)

- **Precalentado del mundo abierto** (`WorldMapManager._warmupShaders`), en este orden:
  1. estilo anime de los personajes en todas las islas;
  2. transparencia de la cámara (`CameraOcclusion.prepareForWarmup`);
  3. `warmupRender`;
  4. un fotograma completo sin recorte y con sombras forzadas (`_renderFullWarmFrame`, `EnvironmentSystem.renderWithShadows`).
- **Cargas detrás del telón:** `src/render/LoadGate.js` (`trackLoad`, `waitForLoads`, `holdLoads`, `sliceBudget`). Lo usan el pueblo del Bosque, `placeIslandProps`, las texturas de caminos y las máscaras de agua y pendiente.
- **Viajes:**
  - `changeMap(id, dir, spawnOverride)` coloca al jugador y la cámara en el muelle antes de precalentar.
  - Mientras dura el cambio, el mundo no se dibuja (`om._renderSuspended`).
- **Retrato de la ranura:** solo se rehace si cambia el aspecto (`slot.sapidaePortraitKey`, solo local). Se hace en segundo plano con `CharacterPortraitService.captureModelAsync`: copia del modelo, compilación en paralelo, texturas de una en una.
- **Sombras:** `_trimSmallShadows` y `_prepareShadowCasters` solo cuando entra algo nuevo (`markShadowCastersDirty`), más un repaso cada ~10 s.
- **Medido:** al abrir el telón, de un fotograma de 18 s a ninguno por encima de 70 ms; viaje Bosque → Sabana, de ~17 s a ~5 s; Sabana → Ártico y Ártico → Bosque, ~2 s. Ver `docs/HITO_103_TIRONES_MUNDO_ABIERTO_Y_VIAJES.md`.

### 5.32 Respawn de mobs (Hito 106)

- **Piezas:** `world/MobRespawnDirector.js` (reloj y cola; lógica pura), `world/islands/MobSpawnPools.js` (`ISLAND_SPAWN_POOL` de 51–60 puntos por isla y `RESPAWN_CONFIG`) y `world/SpawnPoolTool.js` (herramienta que genera los pools). El director vive en `WanderingMonsters.respawn`; los slimes del Bosque lo usan a través de `om.monsters.respawn`.
- **Reglas:** 5 manadas libres por isla (slimes en el Bosque). Al morir un mob se encola su reaparición: `pack` y `slime` en un punto aleatorio del pool (≥ 50 m del jugador, ≥ 30 m de otros mobs); `boss` (primera manada de Ártico y Genesis) igual pero con retardo largo; `fixed` (manada fusionada y mobs de misión) en su puesto, con retardo largo. El reloj solo corre mientras se explora.
- **Mobs de misión:** reaparecen; sus recompensas y avisos solo salen con la misión activa y el paso pendiente (`resumeAfterVictory`). Los respawn genéricos no llevan `logicalZone`.
- **Rendimiento:** solo se eligen manadas con el modelo ya en caché; un mob que patrulla a más de 75 m no actualiza animación ni IA, y entre 40 y 75 m lo hace un fotograma de cada dos. Aparición con humo (`PuffEffect`).
- **Consola:** `lkDebug.spawnPool()` (regenerar un pool; hace falta si cambia el terreno o se colocan edificios) y `lkDebug.respawn({ fast, kill })`.

Detalle y medidas en `docs/HITO_106_RESPAWN_DE_MOBS.md`.

### 5.33 Números de combate (Hito 107)

- `FloatingCombatText.pop({ pos, key, kind, value | text, label, icon, size, from, adv, merge, countUp, delay })` con el estilo del sistema de diseño: blanco el daño que haces, carmesí suave el que recibes; crítico dorado con etiqueta encima; estados y recursos en píldoras que se apilan por unidad; golpes seguidos se suman; KO, total de área y título de Ultimate. `spawn()` antiguo sigue funcionando.
- Opción «Números de combate» (Todos / Solo daño / Ocultos) en `access.combatNumbers`. Detalle en `docs/HITO_107_NUMEROS_DE_COMBATE.md`.

### 5.34 Sonido de las habilidades (Hito 108)

- **Pack:** 145 MP3 en `assets/sounds/sfx/skills/` con `manifest.json` (clave lógica → archivo, alias, clase, animación, nivel). Se generan con `tools/audio/build_skill_sfx.py` desde los WAV de `backups/2026-10-30_sounds/combat/` (el juego no usa los WAV).
- **Piezas:** `src/audio/SkillSfxMap.js` (datos: `CARD_ANIM` de las 235 cartas, `STARTER_ANIM`, `SAPIDAE_SFX`, `ENEMY_SFX`, `GOLEM_SFX`, `STATUS_SFX`, `EVENT_SFX`, `ULTIMATE_SFX`; `skillSfx(spell, caster)`), `src/audio/SkillSfxBank.js` (carga y reproducción) y `CombatSfx` (sincronía con `spell:cast` / `spell:windup` / `spell:impact`, firmas sintetizadas y guion de las Ultimates). `VfxBridge.play` devuelve `ti`; `main._prewarmBattle` precarga con `audio.combat.prepareSkills`.
- **Mezcla:** cartas de 2 PA a ~−21 LUFS momentáneos (+3 dB sobre la música del combate), estados −24, Ultimates −16 con la música −6 dB durante su guion.
- **Consola:** `lkDebug.sfx('skills' | 'sapidae' | 'enemigos' | 'estados' | 'ultimates')`, `lkDebug.sfx('recorrido', { grupo })` (recorrido de VFX con sonido), `lkDebug.sfx('skill', id)` y `lkDebug.sfx('memoria')`. Detalle en `docs/HITO_108_SONIDO_DE_HABILIDADES.md`.

### 5.35 Versión de los assets en las rutas (Hito 109)

- **Problema:** el hosting (Hostinger, `.htaccess`) guarda modelos y audio un año sin volver a preguntar (`immutable`). Un asset reemplazado con el mismo nombre no llegaba a quien ya había jugado (caso: el cactus de la Sabana optimizado el 30-oct).
- **Solución:** `src/render/AssetVersion.js` exporta `ASSET_VERSION` y `v(url)`; se importa al principio de `main.js` y parchea `FileLoader` / `ImageLoader` / `ImageBitmapLoader.prototype.load` de three.js, así que todas las cargas de three (GLTF, texturas, KTX2, DRACO, `LoadingManager` propios, mixer de Axies) piden `?v=ASSET_VERSION`. El audio por `fetch` / `new Audio` (`MusicManager`, `AmbienceManager`, `SfxBank`, `SkillSfxBank`, `PrologueVoice`) y lo que el mixer pide con `fetch` (`resolveAssetUrl`) usan `v()`. La versión se añade solo en la petición: las rutas del código, las claves de `ModelCache`/Ktx2 y las comprobaciones de extensión no cambian. `data:`, `blob:` y otros dominios no se tocan.
- **Imágenes de la interfaz** (`<img src>`, unos 200 sitios) no llevan versión: el `.htaccess` las sirve con `no-cache` (se revalidan con 304). Modelos, audio, `.ktx2`, `.bin` y `.wasm` siguen con un año `immutable`.
- **Publicar:** si cambias algo en `assets/`, sube `ASSET_VERSION` antes de subir (pasos en `DEPLOYMENT_GUIDE.md`). En la consola, `lkAssetVersion`. Detalle en `docs/HITO_109_VERSION_DE_ASSETS.md`.

### 5.36 Moneda AXS (Hito 110)

- **Cuatro monedas:**
  - **oro:** Ochi, Forja T0 y Mercado de recursos;
  - **SLP:** evolución y bolsas;
  - **AXS:** Mercado entre jugadores de equipo T1–3, runas y charms, que se perciben como NFT;
  - **bAXS:** tasas de la Forja y, más adelante, premios de arena y reto semanal. **No se intercambia.**
- **Saldo:** el AXS vive en `slot.forge.axs` (`ForgeService.wallet().axs`). Con cuenta lo pone el servidor (`slot_wallets.axs`, `_econ_apply_axs`).
- **Pago y comisión:** el pago del Mercado pasa solo por `_mkt_pay` (oro o AXS). La comisión es del 5 %, al céntimo en AXS.
- **Ochi:** no compra runas, charms, sus bolsas ni equipo T1–3 (`sellPrice` = 0, `ShopService.sellBlock`; en el servidor, sin filas `sell:` en el catálogo). Las bolsas se venden en el Mercado, en AXS.
- **Sello NFT:** el equipo T1–3 (y en el Mercado las runas y los charms) lleva el logo de Ronin: `isNftGear(it)` / `nftSeal()` de `ui/lk.js`. Un panel nuevo que muestre equipo debe usarlos.
- **Regalo del tutorial:** una unidad de la runa y del charm de `TutorialScript.REWARDS` queda ligada a la partida una vez recibida (`RuneCharmService.boundCount`; en el servidor `_mkt_bound` / `_mkt_locked`): se equipa, pero no se comercia ni se gasta. Si cambian esos ids, cambiar los dos sitios.
- **Bono:** 5 AXS + 15 bAXS en partidas nuevas, y +5 AXS +15 bAXS una vez a las existentes (`forge.axsLaunch` / `slot_wallets.axs_launch`).
- **Versión:** el juego muestra «Demo 1 (v0.4.0)» (`GAME_VERSION` en `rpg/ui/StartScreenUI.js`). `ASSET_VERSION` sigue en `0.4.0` (no se reemplazó ningún asset).
- **Despliegue:** migraciones `20261101000000` a `20261101000005`, en orden (los catálogos, generados con `tools/gen_catalog.mjs`). Detalle en `docs/HITO_110_MONEDA_AXS.md`.

### 5.37 Interfaz adaptable a PC (Hito 111)

- **Objetivo:** que las ventanas y el HUD se vean bien en ventanas de PC bajas y estrechas (1366×768, 1280×720, 1280×600, 1024×768). En PC lo que falla es la **altura**, no el ancho.
- **Reglas** (todo en `ui/lunakai-ui.css`, bloque «Hito 111»):
  - ventana con `height: min(Xpx, 100vh − 40px)`, cabecera y acción principal siempre visibles y cuerpo con scroll propio (barra dorada visible);
  - compactar por altura con `@media (max-height: …)`;
  - la franja de coste de la Forja y el botón de la Tienda son `sticky` al pie;
  - Mochila y Runas conservan las tres columnas hasta 981 px;
  - un SVG o canvas decorativo dentro de un contenedor con scroll lleva tamaño explícito (las chispas de la Forja creaban un scroll fantasma).
- **Combate:** la cola de turnos se recorta al ancho libre y se compacta con > 9 unidades (`fitTimeline` en `CombatHUD.js`); la ficha de la unidad reserva una fila de 3 chips de estado (2 + «+N») y no se mueve.
- **Pendiente de auditar:** resuelto en el Hito 112. Detalle en `docs/HITO_111_RESPONSIVE_PC.md`.

### 5.38 Escuadra, inicio y scrollbars (Hito 112)

- Bloque «Hito 112» al final de `ui/lunakai-ui.css`: ranuras de la Escuadra compactadas por altura (`max-height: 820px` y `680px`, solo ≥ 1101 px de ancho); el logo del inicio se escala con `vh` y la tarjeta se compacta (`max-height: 820px` y `680px`); fin de combate compacta el escudo/título con `max-height: 700px`.
- Scrollbars visibles: dorado claro en fondos oscuros, dorado oscuro en pergamino.
- **Sin auditar:** formulario de email, código y selector de slots del acceso. Detalle en `docs/HITO_112_RESPONSIVE_PC_PANTALLAS.md`.

### 5.39 Mochila y pesca (Hito 114)

- **Casillas `.lk-it` en la Mochila:** son `<button>` (centran en vertical). En `.lk-bag__grid` son columna flex con el arte arriba y el pie con 2 líneas reservadas; así no hay franjas cuando conviven pies de 1 y 2 líneas. Una cuadrícula nueva con `.lk-it` debe hacer lo mismo.
- **Pesca (`ui/GatheringHUD.js`):** un solo panel `.lk-fish` de tamaño fijo (cabecera · corcho y texto · barra o resultado · teclas) que sustituye a la barra «Pescando…»; el botín de la pesca se muestra dentro. El marcador se mueve con `transform`; la zona solo se coloca al empezar o tras un fallo; el mordisquito llega por `hud.sfx('nibble')`. Las reglas siguen en `FISH_CHALLENGE` (`GatheringActors.js`). Detalle en `docs/HITO_114_MOCHILA_Y_PESCA.md`.

### 5.40 Ajustes del tutorial, la derrota y la ranura de partida (Hito 115)

- **Cámara de cuidado (`rpg/OverworldCamera.js`, `rpg/tutorial/TutorialDirector.js`):** `OverworldCamera.setFrameTarget(getter)` encuadra a un acompañante: la cámara apunta al punto medio entre el jugador y el Axie y, si el Axie se sale de la zona segura de la pantalla, suma distancia (hasta +6 m) y ángulo (hasta +0,32 rad) con un factor `_frameF` suave y con holgura (sin vaivén). `TutorialDirector._frameAxie(on)` lo activa en los pasos `pet` y `feed` y lo apaga en cualquier otro paso y en `_applyDone`. Con el factor a 0 la cámara es idéntica a la de siempre.
- **Combates guiados (`tactics/TutorialManager.js`, `main.js`):** `step_move_2` (primer combate) solo permite (4,6). En el duelo, `_dynStep` da al que **no es el Sapidae**, si ninguna carta alcanza, un paso `step_move_1` con `freeMove: true` y `allowedCells` = todas las casillas libres alcanzables; `_dynAdvance` no lo da por movido hasta agotar los PM. Los pasos libres (`free_action` / `step_battle_flow`) pintan las casillas alcanzables como en un combate normal (`_refreshMovementHighlights`).
- **Derrota (`rpg/world/ForestVillageLayout.js`, `rpg/OverworldManager.js`):** `ATIA_RESPAWN_SPOT` (5 m delante del altar, calculado con `villagePoint`) es el punto al que vuelve el escuadrón tras perder un combate fuera del tutorial (`changeMap('zone_2_2', null, ATIA_RESPAWN_SPOT)`). El aviso es `overworld.atiaRest` / `atiaRestDesc`.
- **Ranura de partida (`tactics/EquipmentManager.js`, `main.js`, `rpg/SaveSlotManager.js`, `rpg/ui/StartScreenUI.js`):** `exportSlotData()` devuelve `mainAxie` (el puesto 1 de `getSquad()`); `main._saveCurrentProgress` y `SaveSlotManager.updateActiveSlot` lo guardan en `slot.mainAxie` (viaja a la nube) y la tarjeta usa `mainAxie || hero`. `slot.hero` sigue siendo el Axie de creación (puesto interno `kotaro`).
- **Cinemática (`rpg/ui/ZoneBanner.js`):** `hideZoneBanner()` quita el rótulo de zona al instante; `playOpening()` la llama para que el «Bosque» de la carga inicial no se vea sobre el prólogo.
- **Quitado:** botón «Entrar con correo» (`StartScreenUI`), icono de candado de la runa y el charm del tutorial (`RunesCharmsPanel.boundTag`; la regla de «ligado a la partida» sigue en `RuneCharmService.boundCount`), disco de sombra bajo el Sapidae (`PlayerEntity._createUnderFeetAura`). La cantidad («×N») de runas y charms va abajo a la derecha (`.lk-rc-qty`).

Detalle y pruebas pendientes en `docs/HITO_115_AJUSTES_TUTORIAL_INICIO_Y_DERROTA.md`.

### 5.41 Partes místicas de nivel 1 (Hito 117)

- Las partes `S01_<Clase>02_L1_*` toman su aspecto de un add-on que cambia el material por uno `Mystic_Final` (`materialOverrides.Model`); las de nivel 2 usan el material normal del Axie.
- Su shader de vértices (`vendor/axie-mixer3d/chunks/mystic-material-factory-ZyStOYbU.js`) declaraba `attribute vec2 uv1;` y three r160 también lo declara cuando la malla trae `TEXCOORD_1` (`USE_UV1`): `'uv1' : redefinition`, el programa no compilaba y solo se veía el contorno oscuro. Ahora va dentro de `#ifndef USE_UV1` (comentario `Lunakai Hito 117`).
- Sin subir `ASSET_VERSION`: los `.js` se sirven con `no-cache` y se revalidan solos. Detalle en `docs/HITO_117_PARTES_MISTICAS_NIVEL_1.md`.

### 5.42 Brillo de las partes místicas (Hito 118)

- La salida de color de todos los materiales místicos del mixer (superficies y partículas, en `mystic-material-factory-ZyStOYbU.js`) se limita a `clamp(color, 0.0, 0.88)` (en espacio gamma, ≈ 0,75 lineal), por debajo del umbral del bloom del mundo (0,82) y del combate (0,86). Comentario `Lunakai Hito 118`.
- Antes daban valores muy por encima de 1 (borde de luz hasta 238, emisión ×7) que el bloom convertía en un destello; sin tope, en algunas tarjetas el bloom podía llenarse de valores no válidos (pantalla negra).
- Ajuste: subir el 0,88 da más brillo (por encima de ~0,92 vuelve el halo), bajarlo apaga las partes. Detalle en `docs/HITO_118_BRILLO_MISTICOS.md`.

### 5.43 Música del título y sonido de los botones (Hito 119)

- **Audio:** los efectos (Web Audio) se encienden con el primer gesto (detector único en `main.js`); no hace falta llamar a `audio.init()` antes de un sonido de interfaz.
- **Música del título:** `audio.playTitleMusic()` (pista `TITLE` = `assets/sounds/AVATAR_THEME_V1.mp3`, −18,0 LUFS) desde el constructor de `StartScreenUI` (arranque) y desde `show()` (volver al título); se apaga al empezar la aventura. `MusicManager.playTrack` ya no corta ni baja de volumen (doble igualación) una pista que se reintenta tras el primer gesto.
- **Botones:** `audio/UiClickSfx.js` toca `playClick` en cualquier `button`, `[role="button"]` o `.lk-btn` que no haya sonado ya (80 ms). Un botón con sonido propio solo necesita llamar a su `play*`; para excluir uno: `data-sfx="none"`. El sonido de paso (`playStep`) no se usa como clic. Detalle en `docs/HITO_119_MUSICA_TITULO_Y_SONIDO_BOTONES.md`.

### 5.44 Tutorial rápido, cámara isométrica y correcciones (Hito 120)

- **Tutorial (`rpg/tutorial/TutorialScript.js`, `TutorialDirector.js`):** defensa del Dojo → Mochila → Forja → vínculo (92 → 97 → 100 %, bloqueado durante el tutorial con `AxieCareService._bondLocked`) → runas → combate final `tut_boss` contra el Slime Caballero (650 de vida, `damageMult: 2`, Rastro de Miasma: −50 % de vida al terminar el turno en lo morado, 3 rondas) → graduación → mapa del archipiélago. Duelo con Paladill opcional (`tut_duel`). Pasos antiguos → `LEGACY_STEPS`. `_syncQuest` trabaja sobre `qm.quests[QUEST]` (no sobre la copia de `getQuest`).
- **Cámara de combate (`tactics/SceneManager.js`):** isométrica, FOV 14, `Q`/`E` giran 90°, clic derecho o rueda pulsada + arrastrar desplaza. Opción `combatCam` (Fija por defecto / Mis unidades / Cada turno) en `AccessPrefs`; `focusOnTurn` la respeta. El Combate 1 del tutorial empieza girado como con `Q`.
- **Clic en el modelo (`main._cellUnderCursor`, `_unitPickShape`):** con carta elegida, cajas medidas por unidad; gana el objetivo válido más cercano a la cámara.
- **Miasma (`SpellPresentation._buildMiasma`, `main._showZoneWarn`):** morado saturado, humo que gira y burbujas (materiales compartidos `MIASMA`); al pasar el ratón, «−50 % de vida (−N) si terminas aquí».
- **Árboles (`BattleArena._updateOcclusionFade`):** se vuelven transparentes enteros si tapan a una unidad o la tienen bajo la copa (usa los puntos `u:` de `main._occlusionPoints`).
- **Mapa (`WorldMapModal._coordLabel`, `MapRegistry.js`):** coordenada `[x, y]` (de `zoneId`) bajo cada tierra; sin Valle del Dojo, Pueblo del Bosque ni Santuario del Portal Antiguo. Textos: «Tierra de…» / «… Land».
- **Precalentado del combate (`main._prewarmBattle`):** `Unit.deathFxWarmGroup()`, `GridManager.decalWarmGroup()` y `miasmaWarmGroup()` se añaden detrás del velo y se quitan tras el fotograma completo.

Detalle y pruebas en `docs/HITO_120_TUTORIAL_RAPIDO_CAMARA_ISOMETRICA_Y_CORRECCIONES.md`.

### 5.45 Formulario de feedback (Hito 121)

- **Servidor:** migración `20261104000000_feedback.sql`. Tabla `public.feedback` sin acceso para los jugadores (RLS sin políticas; se lee en el panel de Supabase). Se escribe solo con `submit_feedback(p_message, p_source, p_guest_id, p_context)`, que pueden llamar `anon` y `authenticated`: con sesión el tipo de cuenta sale de `profiles` (`skymavis` / `email`), sin sesión es `guest` con `guest_id`. Antispam: 3 cada 10 min por cuenta o invitado, 10 por IP (`ip_hash`).
- **Cliente:** `net/FeedbackService.js` (`send`, `sender`; `guest_id` en `localStorage` `lunakai_feedback_guest_id`) y `ui/FeedbackPanel.js` (`open({ source })`, `invite()`, `close({ force })`, estados `ask` → `form` → `sending` → `done`). Botón `#btn-open-feedback` entre Mapa y Opciones y tecla **F** (`om.toggleFeedback()`; no se abre encima de otra ventana); `om.feedbackPanel` cuenta en `isAnyModalOpen()` y se cierra (conservando el texto) al empezar un encuentro.
- **Tutorial:** el botón funciona en cualquier paso (`_placeSpot` abre un segundo hueco en el velo; con el formulario abierto la guía se aparta). Al graduarse, `_askFeedback()` sustituye a `_openArchipelago()` (una vez por partida, `flags.feedbackAsked`; «Ahora no» no abre el mapa).
- `GAME_VERSION` 0.4.1. Detalle y pruebas en `docs/HITO_121_FORMULARIO_DE_FEEDBACK.md`.

### 5.46 Koliseo: Desafío de la Bruma (Hito 122, terminado; fases B0 a B5)

- **Planes:** `docs/PLAN_DESAFIO_DE_LA_BRUMA.md` (estado de cada fase al principio), `docs/PLAN_ARENA_PVP.md` e investigación en `docs/PLAN_KOLISEO_PVP_Y_DESAFIO_DE_LA_BRUMA.md`.
- **Servidor (B0):** `supabase/migrations/20261104000001_koliseo_bruma.sql`.
  - Todos los números en `bruma_settings()`.
  - Un bioma por semana en rotación (la primera, el Bosque), 5 combates ×1 → ×3, 2 intentos por cuenta y 2 derrotas.
  - Clasificación: combates superados y luego rondas.
  - Top 3 pagado al cerrar la semana: bAXS y oro a la cartera; Esquirla lunar y Ámbar de Atia en `koliseo_rewards`.
  - Funciones: `bruma_week`, `bruma_start`, `bruma_stage_begin`, `bruma_report`, `bruma_board`, `koliseo_claim`.
  - La semana se cierra sola al abrir la siguiente (y con `pg_cron`, si existe).
- **Cliente (B1):** `rpg/KoliseoService.js` y `ui/KoliseoPanel.js` (Arena próximamente · Bruma · Clasificación).
  - Se abre con `#btn-open-koliseo` del HUD o desde Paladill.
  - `om.toggleKoliseo(tab)`; desbloqueado al terminar el tutorial (`UNLOCK_AT.koliseo`).
- **Intento y combates (B2):**
  - `rpg/koliseo/KoliseoRun.js` (flujo, informe, preparación) y `rpg/koliseo/BrumaEncounter.js` (grupos sembrados del bioma, ×1 → ×3, tablero fijado).
  - Los combates del Koliseo usan ids `kol_…` y `config.koliseo`: sin botín ni pérdida de vínculo, vida llena y vuelta en el sitio (`OverworldManager._returnFromKoliseo`).
  - **Regla:** un combate nuevo del Koliseo debe llevar un id `kol_` para no avanzar misiones por zona.
- **Jefe, modificadores y retratos (B3):**
  - El combate 5 es siempre el **Slime Caballero** con el Rastro de Miasma (`BRUMA_BOSS`, `BRUMA_BOSS_BODY` en `BrumaEncounter.js`); Genesis conserva su dificultad.
  - `Spells.battleMods = { range, firstRoundPM }`: `thick_mist` −1 alcance a cartas a distancia, `icy_wind` −1 PM en la ronda 1. `main._startBattleBody` los fija en cada combate desde `config.koliseo.modifier`.
  - Retratos del grupo en cada tarjeta del panel (`KoliseoPanel._foesHtml`, misma semilla que el combate).
- **Premios (B4):** `supabase/migrations/20261105000000_koliseo_rewards.sql` (`koliseo_pending`, `koliseo_ack`) y `rpg/koliseo/KoliseoRewards.js`.
  - Entrega en dos pasos: materiales a la Forja + id en `slot.forge.kolClaimed`, guardado en la nube y luego ack. Nunca se pierden ni se duplican.
  - Se comprueba al cargar la partida y al abrir el Koliseo; tarjeta de recompensa por premio.
- **Memoria (revisión tras B5):** al volver al mundo abierto `spellManager.releaseBattle()` vacía zonas, quita las marcas del miasma y cancela su bucle, y pone a 0 los modificadores; caché de retratos y de clasificación; sondeo de preparación con tope. Detalle en la sección 14 del plan.
- **Pruebas y documentación (B5):** detalle en `docs/HITO_122_KOLISEO_DESAFIO_DE_LA_BRUMA.md`. En el combate 5 ningún escolta repite el modelo del jefe. `GAME_VERSION` 0.5.0.

### 5.47 Arena PvP (Hito 123, terminada: fases P0–P6)

- **Plan:** `docs/PLAN_ARENA_PVP.md` (estado por fase; detalle de P0 en la sección 11).
- **Motor sin gráficos (P0):** las reglas del combate se separan de su dibujo sin cambiar el modo historia.
  - Reglas: `tactics/SpellRules.js` (habilidades), `tactics/GridRules.js` (tablero), `tactics/combat/UnitRules.js` (unidad), `tactics/combat/GolemRules.js` (gólems), catálogo en `tactics/data/SpellsDB.js`.
  - Con gráficos (heredan de las reglas): `SpellManager` (`Spells.js`), `GridManager`, `Unit`, `GolemSystem`.
  - Sin gráficos: `LogicUnit` / `LogicGolem` y `tactics/sim/` (`HeadlessCombat`, `SeededRandom`, `StateHash`, `CombatReplay`).
  - `TurnManager.sim` (sin esperas) y `TurnManager.tieBreak` (empate de iniciativa).
- **Servidor (P1):** `supabase/migrations/20261106000000_arena_pvp.sql` (cifras en `pvp_settings()`).
  - Tablas `pvp_seasons`, `pvp_ratings`, `pvp_queue`, `pvp_matches`, `pvp_actions`.
  - Funciones del juego: `pvp_enqueue`, `pvp_leave_queue`, `pvp_match`, `pvp_act`, `pvp_timeout`, `pvp_ack`, `pvp_report`, `pvp_dispute`, `pvp_surrender`, `pvp_board`, `pvp_me`. Internas: `_pvp_resolve` (Elo + SLP, la usará el árbitro), `pvp_cleanup`, cierre de temporada.
  - El servidor no simula: ordena y guarda órdenes; los dos motores y el árbitro deciden. Huellas distintas o informes distintos → `disputed`.
- **Tiempo real (P2):** `supabase/migrations/20261106000001_arena_realtime.sql` (avisos por `realtime.send` desde disparadores, políticas de `realtime.messages`, 3 turnos perdidos = abandono, primer turno con plazo).
  - Cliente: `src/net/RealtimeClient.js` (Phoenix sin npm), `src/net/PvpService.js` (llamadas y cola), `src/rpg/arena/PvpSession.js` (una partida: órdenes, huellas, tiempo, final, reconexión, resync).
  - Pruebas sin la nube: `tools/pvp/local/` (Supabase simulado + dos navegadores).
- **La Arena en el juego (P3):** `supabase/migrations/20261107000000_arena_snapshot_visuals.sql` (la instantánea lleva el aspecto del Sapidae y los genes del Axie). Plan, sección 14.
  - Equipos igualados y perspectiva: `tactics/sim/PvpRoster.js` (nivel 10, sin equipo, runas ni Ultimate; cada jugador se ve abajo, el bando fijo va en `unit.pvpSide` y es el que cuenta en la huella).
  - Combate: `src/rpg/arena/PvpBattle.js` (el motor de la sesión hecho con el combate del juego; `applyOrder` compartido con `HeadlessCombat`; puesta al día sin animaciones con `gridManager.fastForward`; `TurnManager.settled()` antes de cada huella). En `main.js`, `_startPvpBattleBody` y ganchos `if (this.pvpBattle)`.
  - Pantallas: `src/ui/PvpHud.js` (rival encontrado, barra del combate, pantalla final); flujo: `src/rpg/arena/ArenaFlow.js`; pestañas Arena y Clasificación (Arena / Bruma) en `ui/KoliseoPanel.js`; textos `i18n/{es,en}/arena.js`.
  - Pruebas: `tools/pvp/sim-test.mjs` (perspectivas A/B), `tools/pvp/pvp-battle.html` (combate del juego ↔ motor sin gráficos) y `tools/pvp/local/two-players-p3.cjs` (dos navegadores con el combate del juego).
- **Árbitro (P4):** `src/tactics/sim/PvpArbiter.js` (repite las órdenes guardadas y decide: culpable pierde, si no vale el final del motor, si no se anula) en la Edge Function `supabase/functions/pvp-arbiter/` (clave `PVP_ARBITER_KEY`; motor copiado con `tools/pvp/arbiter/build.mjs`). Servidor: `supabase/migrations/20261108000000_arena_arbiter.sql` (`pvp_arbiter_pending`, `pvp_arbiter_verdict`, respaldo en `pvp_cleanup`, avisos por pg_net/pg_cron con `pvp_arbiter_config`). Plan, sección 15.
  - Pruebas: `tools/pvp/arbiter-test.mjs`, `tools/pvp/arbiter/local-test.mjs` (la función en Node contra PostgreSQL) y `two-players-p3.cjs arbiter`.
- **Tableros justos (P5):** solo mapas simétricos con un giro de 180° (`20261109000000_arena_maps.sql`): 2 originales y 5 versiones espejo `pvp_…` (`BattleMaps.js`, `pvp: true`, fuera del modo historia). El bando B empieza en las salidas del A giradas (`PvpRoster.pvpSpawns`). Medir un mapa: `node tools/pvp/map-fairness.mjs`; crear una versión espejo: `node tools/pvp/mirror-map.mjs <id>`. Plan, sección 16.
- **Cierre (P6):** retrato propio de cada Sapidae en el orden de turnos (`PvpBattle.sapidaePortrait`, `main._unitPortrait`); equilibrio con `node tools/pvp/balance.mjs` (jugador automático `tools/pvp/bot.mjs`) y partidas reales con `select jsonb_pretty(public.pvp_stats(30));` (`20261110000000_arena_stats.sql`). Ajustes de equilibrio: solo en la Arena (`PvpRoster`) y con el árbitro desplegado de nuevo. Resumen y mantenimiento: `docs/HITO_123_ARENA_PVP.md`.
- **Regla:** el azar de las reglas solo por `spellManager.rng`; nada de `Math.random`, `Date.now` o `setTimeout` que cambie un resultado. Antes de entregar un cambio de combate: `node tools/pvp/sim-test.mjs`, `tools/pvp/parity.html` y `tools/pvp/pvp-battle.html` (con el servidor del juego). Las reglas deben seguir siendo simétricas entre equipos: nada de `team === 'player'` en las reglas (sí en el dibujo). Y después: `node tools/pvp/arbiter-test.mjs`, `node tools/pvp/arbiter/build.mjs` y volver a desplegar `pvp-arbiter`.

### 5.48 Misión «El mercader del Dojō» (Hito 124)

- **Resumen y pruebas:** `docs/HITO_124_MISION_OCHI.md` (plan en `docs/PLAN_MISION_OCHI.md`).
- **Cadena principal:** 1 tutorial (Paladill) → **2 `quest_merchant_ochi`** → 3 Bing → … → 11. `isMainQuestUnlocked` usa `order - 1`; al añadir una misión principal hay que subir los `order` siguientes y tocar `nextMainQuestMap`, `mainQuestIds` y la migración de `loadSaveData`.
- **Lógica:** `rpg/quests/OchiQuest.js` (`om.ochiQuest`).
  - Pasos `talk_ochi` · `buy_helmet` (aviso `ShopService.onBuy`, cualquier casco) · `equip_helmet` (estado del Sapidae) · `report_ochi`.
  - Ochi (`NPCManager._handleMerchantInteraction`) y Paladill le preguntan primero.
- **Tienda:** `shopModal.open(shopId, { guide: { focus, note(), action(), avatar } })` muestra una franja de misión y resalta un objeto. `ShopService.ensureStock` garantiza el casco mientras haga falta.
- **Oro:** monedero `REWARDS.ochiPurse` (60, «completa hasta»; con cuenta `reward:tut:ochi_purse`, `meta = 1`) y recompensa `reward:quest:quest_merchant_ochi` (80). Migración `20261111000000_quest_merchant_ochi.sql`, que es obligatoria con cuentas.
- **Botín:** el Yelmo Bestial no cae en combate (`ItemDatabase.NOT_DROPPED`); `quest_hostile_sands` da materiales en lugar del yelmo.

### 5.49 Koliseo más claro (Hito 125)

- **Ventana** de alto fijo (`min(640px, 100vh − 40px)`); las pestañas llevan icono y `aria-selected`.
- **Arena** (`KoliseoPanel._renderArena`): tarjeta de temporada + tarjeta de duelo (acción arriba; Cancelar dentro de la caja de búsqueda) + historial con `_mapName(r.map)` y `_ago(r.at)`. `data-ref="arena-ends"` y `data-ref="waited"` siguen existiendo para los contadores.
- **Bruma**: multiplicador como amenaza (`--threat` 0→1 en la tarjeta), barra con intentos en rombos y «Nuevos intentos en …» (`koliseo.bruma.resets`); reglas como fichas partiendo `koliseo.bruma.rules` por « · ».
- **Clasificación**: `_kindSwitch(period)` pone tipo y periodo en una barra; columna de premio; `_payoutStrip()` agrupa puestos con el mismo premio; `BRUMA_PRIZE` es la única tabla de premios de la Bruma en el cliente. Detalle en `docs/HITO_125_KOLISEO_MAS_CLARO.md`.

### 5.50 Escuadrón tras la graduación y Códice de Lunacia (Hito 126)

- **Detalle:** `docs/HITO_126_ESCUADRON_Y_CODICE.md` (plan: `docs/PLAN_CODEX_Y_ESCUADRON.md`).
- **Escuadrón:** `isFeatureUnlocked('squad')` = `done || _squadReady()`. El recorrido de la primera apertura está en `rpg/ui/SquadTour.js` (`squadModal.startTour()`, `onTourDone`), con `flags.squadTour`. El paso de Bing es `flags.squadIntro` (`waiting` · `open` · `place` · `done`; el antiguo `load` pasa a `done`).
- **Códice:** `om.codexModal` (`rpg/ui/CodexModal.js`; tecla C; `om.toggleCodex(ch)`). Se desbloquea con `isFeatureUnlocked('codex')`, es decir, con la graduación.
  - Capítulos en `rpg/codex/CodexData.js`. Cada página es `{ id, img | art | gen, action? }`, y sus textos están en `codex.<cap>.<página>.title/body/tip`.
  - Diagramas en `CodexArt.js`; páginas generadas en `CodexGenerated.js` (Bestiario, cartas del Axie principal, clase del Sapidae, Ultimate).
  - **Abrir el Códice desde otro panel:** cualquier botón con `data-codex="capítulo"` (y opcional `data-codex-page`) lo abre.
  - **Añadir una página:** una entrada en `CodexData` y sus claves en `i18n/{es,en}/codex.js`.
- **Bestiario:** `codexModal.recordBeasts(unit.type[])` en `main.js` (`onVictory`, sin duelos). Las fichas sin descubrir no cuentan como «sin leer».
- **Guardado:** `slot.codexProgress = { v: 1, seen, beasts }`; `om.onCodexChange` guarda la partida.


### 5.51 Códice más claro (Hito 127)

- Solo apariencia y navegación (`CodexModal._renderPage` / `_renderRail`): índice «En este capítulo» bajo la ilustración (capítulos de hasta 8 páginas), imagen ampliable (`_setZoom`; Esc vuelve sin cerrar), botones de pasar página con texto (en la última página nombran el capítulo siguiente), contador «n / total» en capítulos de más de 8 páginas y progreso de lectura en el carril (`_chapterProgress`). Detalle en `docs/HITO_127_CODICE_MAS_CLARO.md`.
### 5.52 Ajustes del Koliseo, las runas, la Forja y la apariencia (Hito 128)

- **Recorridos de panel:** `rpg/ui/PanelTour.js` (`startPanelTour(owner, { steps, ns, codex, onDone })`) para el Escuadrón (`SquadTour.js`) y el Koliseo (`KoliseoPanel.startTour`). El Koliseo usa `flags.koliseoTour` y su punto de «Nuevo» está en el botón K. El CSS común es `.lk-ow-menu .lk-btn-circle-icon.lk-has-new`.
- **Fichas flotantes:** `TutorialDirector._spotlightOn` cierra `.lk-mat-tip` / `.lk-tt-item` al poner la guía. La Forja cierra su ficha al abrir, repintar, hacer clic y al salir el ratón (`forgeModal.hideTip`). Las fichas no reciben clics.
- **Runas:** la etiqueta «Nuevo» es la clase `.lk-rc-new`. No hay que usar `inherit` dentro del atajo `font`.
- **Creador:** sin «Ema» / «Kai» en la interfaz. Detalle en `docs/HITO_128_AJUSTES_KOLISEO_RUNAS_FORJA_APARIENCIA.md`.

### 5.53 Recorridos de panel como «coach marks» (Hito 129)

- `PanelTour.js` (misma API): foco `.lk-sqt-spot` que atenúa el resto y no bloquea clics, flecha hacia la zona (`data-side`, `--ax`), «Atrás», «Saltar» arriba, teclas → / Intro / ← / Esc (Esc no cierra el panel) y foco de teclado que vuelve al terminar. CSS al final de `lunakai-tutorial.css`; claves `squadTour.back` / `koliseoTour.back`. Detalle en `docs/HITO_129_RECORRIDOS_DE_PANEL_COACH_MARKS.md`.

### 5.54 Avisos de «Nuevo» en el HUD (Hito 130)

- **Un solo gestor:** `ui/NewBadges.js` → `newBadges.set(idBotón, { on, count, hint, prio })`. Punto o número («9+»), el `hint` se añade al `aria-label`/`title`, late 3 veces al encenderse (solo el de más `prio`) y queda fijo. El estado «visto» lo guarda quien llama.
- **Escuadrón / Koliseo:** se apagan al abrir el panel (`flags.squadSeen` / `flags.koliseoSeen`, `TutorialDirector._markPanelSeen`); el recorrido sigue saliendo si no se terminó.
- **Códice:** número = `codexModal.unreadCount()` (páginas sin leer); baja al leer cada página. No usar `::after` para estos avisos: el CSS está en el bloque «Hito 130» de `lunakai-tutorial.css`. Detalle en `docs/HITO_130_AVISOS_DE_NUEVO.md`.

### 5.55 Selector de aventura con escenario 3D (Hito 131)

- **Título sin mundo detrás:** `main._animate()` no actualiza ni dibuja nada mientras `startScreen.isOpen` (antes, al volver de una partida, el mundo seguía dibujándose tapado).
- **Vista de selección:** escenario (`.lk-advstage`, `_renderStage`) con la ranura elegida, flechas ‹ › y el botón Jugar; lista de ranuras (`.lk-srow`, `refreshSlots`). No usar `.lk-stage` (es otro componente del sistema de diseño).
- **3D:** `rpg/ui/SlotStagePreview.js` sobre `CharacterPreviewDiorama`. Un solo visor, solo la ranura elegida, 30 fps, ×1,25, sin sombras, precompilado antes de mostrarse; se libera al abrir el creador, cerrar sesión o jugar (`_stage3dDispose`). ~110 MB de texturas en la gráfica por modelo (Ema / Kai). Sin 3D con `navigator.deviceMemory < 4` o `window.lkNoStage3d`. Detalle y medidas en `docs/HITO_131_SELECTOR_DE_AVENTURA.md`.

### 5.56 Selector: isla por bioma y panel «Tu partida» (Hito 132)

- **Isla:** SVG estático bajo el personaje (`_isleSVG`, `.lk-advstage__isle`), colores por `data-biome` (`_biomeKey`: forest · savannah · arctic · mystic · volcanic · none). Los pies van al 78 % del alto de la vista: retrato con `inset … 22%` y 3D con el encuadre de `SlotStagePreview._fit`. Si se cambia uno, cambiar los otros.
- **Tu partida:** `_renderSlotInfo` (misión seguida y siguiente paso con un `QuestManager` de solo lectura, escuadrón, fecha de creación). El tiempo jugado no se guarda. Detalle en `docs/HITO_132_SELECTOR_ISLA_Y_TU_PARTIDA.md`.

### 5.57 Selector: cielo del título e islas 3D (Hito 133)

- El escenario usa el cielo nocturno del título con un brillo de horizonte por bioma (`--hz`). La isla SVG del Hito 132 pasa a ser 3D: `rpg/ui/SlotIsland.js` (`buildSlotIsland(biome)`) con los colores del terreno de cada isla y props de `assets/<bioma>/` recoloreados por material. Biomas: forest · savannah · arctic · mystic · genesis (`_biomeKey` por `mapId`).
- La capa 3D cubre todo el escenario; los pies en `FEET_LINE` (78 %) de la vista. Si se cambia, ajustar `.lk-advstage__fig` y `.lk-advstage__ring`. Isla: ~2 000 triángulos, sin texturas. Detalle en `docs/HITO_133_SELECTOR_CIELO_E_ISLAS_3D.md`.

### 5.58 Selector: terreno cuadrado de casillas (Hito 134)

- `SlotIsland.js` ya no hace una isla redonda: hace un tablero de combate flotante de 5 × 4 losas con los colores de `ARENA_THEMES[bioma].tiles` (una malla con colores por vértice) sobre un bloque recto de tierra y roca (`MeshBasicMaterial`, se oscurece hacia abajo). Props en las columnas de los lados (`[archivo, columna, fila, alto, giro]`). Cámara a ~15°. Detalle en `docs/HITO_134_SELECTOR_TERRENO_DE_CASILLAS.md`.

### 5.59 Contextos WebGL y lista de ranuras (Hito 135)

- **Todo visor con su propio `WebGLRenderer` debe llamar a `renderer.forceContextLoss()` al liberarse.** Si no, Chrome supera ~16 contextos y cierra el del juego (pantalla negra). Ya lo hace `CharacterPreviewDiorama.dispose()` (creador, escenario del selector y visor de la Mochila).
- Lista de ranuras: sin desplazamiento al pasar el ratón y retratos con el recorte del medallón (`50% 18%`). Qué memoria se libera (selector, caché y mundo): `docs/HITO_135_CONTEXTOS_WEBGL_Y_LISTA_DE_RANURAS.md`.

### 5.60 Guía por migas y mapa de rumbo (Hito 136, fase 1)

- **`GuideFlowField`** (`src/rpg/guide/`): distancia caminando desde el objetivo a cada casilla de la isla (Dijkstra, celdas de 1–1,45 m), con `OverworldCollisions.isPointBlocked` como única fuente de «se puede pisar». Se calcula por partes (≈2 ms por fotograma) y solo hasta 40 m más allá del jugador; deambular no recalcula nada.
- **`OverworldCollisions.version`** sube con cada cambio (colisiones, agua, pendiente, límites). El mapa de rumbo la usa para rehacerse; **cualquier código que cambie las listas de colisiones por fuera debe pasar por los setters o por `_changed()`.**
- **`GuideTrail`**: chispa y migas en un solo `THREE.Points` (una llamada de dibujo, sin texturas). Se crea oculta antes del precalentado final.
- **La flecha flotante delante del personaje se quitó** (`PlayerEntity.setNavTarget` solo guarda el objetivo).
- **Integración:** `OverworldManager._updateGuide` y `_guideOff`. Consola: `lkGuide.info()` y `lkGuide.pulse()`.
- **Retratos de Axie en medallones:** van enteros (`object-fit: contain`, 78 %) con `lk-med--axie` (o `lk-pm-axie` en el HUD del grupo). **Todo medallón nuevo con un Axie debe llevar esa clase.**
- **Árboles procedurales:** `GenshinTrees._branch` devuelve `curve`. Las ramas deben nacer con `trunk.curve.getPointAt(t)`, nunca en la recta base→punta.
- **Arte de runas y charms:** todo está en `assets/ui/runes-charms.json` (WebP en base64). Un arte nuevo debe tener el mismo encuadre que el resto (128 × 128, el hexágono a ~127 px).
- **Detalle:** `docs/HITO_136_GUIA_MIGAS_Y_MAPA_DE_RUMBO.md`.

### 5.61 Puente plano del Bosque (Hito 137)

- **Modelo:** `ForestBridge` (los dos puentes y el muelle) usa `assets/environment/puente_plano.glb`. Sus piezas se unen en una malla y el número de módulos sale del largo del modelo.
- **Textura en KTX2:** es el mismo atlas de madera que `bridge.glb`, ya en KTX2. **Regla:** las texturas de los GLB nuevos van en KTX2 (`KHR_texture_basisu`), no en WebP o PNG (~8 veces menos memoria de vídeo).
- **Detalle:** `docs/HITO_137_PUENTE_PLANO_DEL_BOSQUE.md`.


### 5.62 Estado de pendientes (revisión del 7-nov-2026)

Revisión hecha con el usuario tras leer toda la documentación. Manda sobre las notas de «Pendiente» de los hitos anteriores.

- **Migraciones de Supabase:** todas aplicadas y funcionando (hasta `20261114000000_arena_bots_ready.sql`), incluidas las que los hitos daban como obligatorias: `20261104000000_feedback.sql`, `20261111000000_quest_merchant_ochi.sql` y `20261112000000_tutorial_boss_gold.sql`. Lista completa en `DEPLOYMENT_GUIDE.md`.
- **Resueltos (ya no ocurren):** pociones iniciales de la partida nueva (Hito 46), Pozo Gravitatorio al cruzarlo a mitad de movimiento (Hito 28), «×1,5» con coma en inglés (Hito 59), cola alta de Ema bajo el casco (Hito 92), VFX y sonidos de los gólems (Hito 95), arte de las Ultimate (Hito 126), tiempo jugado y retratos de ranura sin imagen (Hito 132). Cada hito lleva la marca «Resuelto · revisión del 7-nov-2026».
- **Siguen pendientes:**
  - Carga de la partida nueva: `docs/PLAN_CARGA_PARTIDA_NUEVA.md` (fases 0–6, sin empezar).
  - Equilibrio de la Arena PvP (Reptil 59 %, Lunalogist 55 % en la simulación; `docs/HITO_123_ARENA_PVP.md`). Prioridad baja.
  - Código sin uso que se puede borrar: `assets/environment/bridge.glb`, `src/rpg/world/ForestDojo.js`, `src/rpg/world/MerchantStall.js`, `src/vfx/modules/mod-toon-piloto.js`.
- **Datos que mandan cuando los documentos se contradicen:**
  - **Puerto local: 8082** (`node server.js 8082`).
  - **Duo Ultimate** (`src/tactics/combat/UltimateSystem.js`): cuesta **6 PA** (todo el turno base del Sapidae), se lanza **desde la ronda 2**, una vez por combate, con el vínculo al 100 % **al entrar** al combate (en combate no cambia), y con el Sapidae y el Axie principal vivos. El efecto depende de cada Ultimate:
    - Embestida Destructiva (Asalto): AL 1–4 en línea, 150–170 de daño, empuje 3 y 60 de daño por choque.
    - Égida de Gaia (Bastión): círculo de 3 en el Sapidae; aliados: purificar, escudo 80 y cura 60; enemigos del círculo: 60–80 de daño.
    - Maelstrom Celeste (Torrente): AL 1–5, cruz 2, 100–120 de daño; −2 PM en su siguiente turno y −1 PA en el siguiente.
  - **Clases del Sapidae:** las del Hito 95 (arcilla espiritual): Alfarero de Gólems (`crafter`), Comandante de Sombrero (`shepard`), Guardián de Campanas (`lunalogist`) y Rastreador Gogo (`stargazer`). Forjacubiles, Pastor de Estrellas / Susurrador, Lunalogista y Astromante son nombres antiguos.

### 5.63 Creador, farola y Axies a distancia en el tutorial (Hito 139)

- **Creador:** `StartScreenUI._cc3d(kind, load)` carga el Sapidae o el Axie con el grupo oculto, compila con `warmupObjects` y lo enseña; luna de carga `data-ref="ccLoading"`. **Regla:** cualquier carga nueva de un modelo en el creador pasa por `_cc3d`, no por `diorama.loadSapidae/loadCompanion` directamente.
- **Precarga en el título:** `_schedulePrewarmCreator()` (una vez por sesión, con `requestIdleCallback`, solo si hay una ranura libre) y `axieMixerService.prewarm({ renderer, axieIds })`. `getMixer` comparte una sola promesa (`_mixerPromise`). Las partes de la API se guardan en `sessionStorage` (`lk_axparts_v1_<id>`).
- **Farola:** `lamp_6` en (−92.7, 15.8) (`ForestVillageLayout.js`).
- **Tutorial:** `tutorialCardOrder` (`main.js`) pone en la ranura [1] un ataque cuerpo a cuerpo o, si no hay, el mejor a distancia; `TutorialManager._resolveCells` busca para `step_move_2` una casilla desde la que la carta [1] alcance al Slime (mismas reglas que `SpellRules.getValidTargetCells`). Textos `tutorialCombat.step.move2Range.*`.
- Detalle y medidas: `docs/HITO_139_CREADOR_FAROLA_Y_TUTORIAL_A_DISTANCIA.md`.

---

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
   - En combate: dos unidades vivas nunca terminan en la misma casilla (`Unit.moveAlongPath` → `UnitRules.walkPath` se detiene antes). Los aliados pueden atravesarse consumiendo 1 PM.
   - En overworld: colisiones calculadas con `OverworldCollisions.js`, que permite deslizamiento suave en paredes diagonales sin atascos.
6. **Guardar variables de carga como propiedades de clase (`this.*`)**:
   - Nunca almacenar referencias críticas de geometrías o centros en variables locales de métodos `async load()`, ya que métodos síncronos posteriores como `setZone()` fallarán con `ReferenceError`.
7. **Secretos**:
   - El *client secret* de Sky Mavis nunca va en el código ni en el chat: solo en los *secrets* de Supabase.
8. **Rendimiento (Hito 49)**:
   - No crear y destruir materiales, texturas o geometrías en cada evento o fotograma: compartirlos y reutilizar mallas.
   - No añadir ni quitar luces en juego (recompila todos los materiales): usar `TransientLightPool` o luces fijas con intensidad 0.
   - Decorado fijo con muchas piezas: `mergeStaticByMaterial` al construirlo. Texturas a 1024 (2048 solo jefes y el cuerpo del jugador).
   - Carga y viajes sin tirones (Hito 103):
     - Nada cambia un shader del mundo después del precalentado: lo que haga `needsUpdate`, `onBeforeCompile` o `customProgramCacheKey` en materiales del mundo va antes o dentro de `WorldMapManager._warmupShaders` (ahí están el estilo de personajes y `CameraOcclusion.prepareForWarmup()`).
     - Toda carga diferida de una isla (modelos, texturas, cálculos por trozos) se apunta con `trackLoad()` de `src/render/LoadGate.js`: `init` y `changeMap` la esperan detrás del telón (`waitForLoads`, tope 8 s). Los cálculos por trozos leen `sliceBudget(ms)`.
     - Nada de dibujar en un segundo contexto WebGL con el juego visible (retratos, visores): `portraitService.captureModelAsync`.
     - Lo que entre en la escena tras la carga avisa con `environmentSystem.markShadowCastersDirty()`.
     - Para llevar al jugador a otro sitio al cambiar de mapa, `changeMap(id, null, spawnOverride)`; mientras dura `changeMap` el mundo no se dibuja (`om._renderSuspended`), así que solo se llama con el telón o un fundido delante.
     - Efectos de combate nuevos con un tipo de material que aún no exista en el combate: añadir una malla con ese material a un grupo de precalentado de `main._prewarmBattle` (como `Unit.deathFxWarmGroup`, `GridManager.decalWarmGroup` o `miasmaWarmGroup`), no dejar que compile al aparecer (Hito 120).
     - Medir con `lkDebug.perf.start(180)` / `.stop()` / `.export()`: el informe trae `framesLargos` (código de cada fotograma largo), `llamadasLentasGL` (WebGL bloqueante con su pila) y `heap`. Detalle en `docs/HITO_103_TIRONES_MUNDO_ABIERTO_Y_VIAJES.md`.
   - Accesibilidad (Hito 85): lectura, visión y movimiento se leen de `src/ui/AccessPrefs.js` (`access.textScale`, `textSpeedMs`, `autoDelay()`, `contrast`, `palette`, `reduceMotion`, `shakeScale`, `flashScale`, `onChange`). Texto nuevo en CSS: mejor en rem (crece con la raíz); los px los escala la hoja generada. Colores de bando: usar `--lk-hp-vital-green` / `--lk-enemy-red` (o `access.palette` en 3D), no hex fijos. Animaciones nuevas: añadir su `@media (prefers-reduced-motion: reduce)` (se repite sola para la opción del juego). Temblor: siempre por `SceneManager.shake()`. Diagnóstico: `lkDebug.a11y()`.
   - Habilidades por nivel (Hito 98): `src/tactics/combat/SkillUnlocks.js` (`PART_UNLOCK_LEVEL`, `SLOT_UNLOCK_LEVEL`). Axies por `spell.part`; Sapidae por su posición en las habilidades de clase. Se aplica a las unidades del jugador con `config.heroLevel` (lo pone `main.js` desde la progresión); `castBlockReason` → `'locked'`. Runas y charms: las partes bloqueadas no aceptan charms (panel) y los charms ya puestos en ellas no se aplican en combate (`setupCombat`). Si se cambia el orden de las habilidades de una clase del Sapidae, cambia también qué se desbloquea a 3, 7 y 10. Diagnóstico: `lkDebug.nivel(id, n)`.
   - Recarga y usos (Hito 97): en las cartas, `cooldown` (turnos propios bloqueada tras usarla), `initialCooldown`, `castsPerTurn` y `castsPerTarget`. Para saber si una carta se puede lanzar usar siempre `spellManager.canCastNow(u, s)` (PA, usos, recarga, gólem); no mirar solo `currentPA >= paCost`. Valores del Sapidae y enemigos en `SPELL_USE_LIMITS` (Spells.js); cartas de Axie por reglas en `applyUseLimits` / `USE_LIMITS` (PartCards.js; una carta puede fijar `cooldown: 0`; los escudos en área o a todo el equipo, 1 por turno). Runas o charms que cambien la recarga: implementar `runeCharms.cooldownOf(caster, spell, base)`. Diagnóstico: `lkDebug.recargas()`.
   - Equipo del mundo (Hito 96): `OverworldManager._syncWorldEquipment()` escucha `EquipmentManager` y actualiza el Sapidae y el arma del Axie compañero. Quien cambie `em.equipped` (Forja, Tienda, misiones) solo tiene que avisar con `em._notifyChange()`; no llamar a `player.applyEquipment` a mano.
   - Humo de chimeneas (Hito 96): `src/rpg/world/ChimneySmoke.js`. Casa con humo = `smoke: true` en su entrada (`ForestVillageLayout` o la lista de `placeIslandProps`). Aspecto en `SMOKE_STYLE`; boca de la chimenea de `house.glb` en `HOUSE_CHIMNEY` (rehacer si cambia el modelo). Un `Points` por isla, sin `update()`.
   - Gólems del Sapidae (Hito 95): `src/tactics/combat/GolemSystem.js` (`spellManager.golems`). Son `Unit` con `isGolem`: sin turno (fuera de la cola), no cuentan para victoria/derrota, XP ni vida guardada; inmunes a estados negativos y sin empuje; uno por Sapidae. Cualquier lista de «unidades del escuadrón» o de héroes debe filtrar `!u.isGolem`. Números en `GOLEM_DEFS`; modelos en `assets/models/golem-<kind>.glb` (`GOLEM_MODEL_URL`; estáticos, mirando a +Z, se ajustan solos a `GOLEM_HEIGHT`; si faltan, primitivas). Datos de carta: `rangeFrom: 'golem'`, `allyFilter`, `relay`, `selective`. Los ids de clase (`crafter`…) y el prefijo de las habilidades no cambian; `SAPIDAE_LEGACY_SPELLS` migra niveles. Diagnóstico: `lkDebug.golem(kind)`, `lkDebug.golems()`. Arte: emblemas `assets/classes/class_*.webp` (256 px, transparentes; colores de clase en `CC_COLORS`, `SAPIDAE_CLASS_THEMES` y `.class-sapidae-*`); iconos de habilidades `assets/skills/heroes/<clase>/1–6.webp` en el orden de las habilidades de la clase.
   - Tamaño de enemigos (Hito 94): en combate `Unit.js` reduce la escala si el modelo no cabe en la casilla (cuerpo = 85 % de los vértices dentro del bloque visible; extremos hasta 115 % de media casilla). En el mundo `WORLD_MIN_HEIGHT` (`WanderingMonsters.js`) fija el alto mínimo de los grandes en alturas de Sapidae (~2,3 m). Un modelo nuevo: con el origen en la base y sin pose T; no hace falta tocar escalas para que quepa.
   - Cámara (Hito 94): una malla grande con huecos (arcos, puertas) puede llevar `userData.cameraBoxes` (Box3 locales) o `userData.cameraIgnore`; si no, `CameraOcclusion` usa una caja de toda la geometría y el hueco cuenta como sólido.
   - Retratos (Hito 94): para pedir un retrato que falta en combate usar `game._requestPortrait(key)` (Axie por ID → `ensureAxiePortrait`).
   - Slime Knight (Hito 94): el enemigo del Ártico `treant_flower` / modelo `treant-flower.glb` se llama «Slime Caballero» / «Slime Knight» (solo cambian los textos; el id no se toca). Retratos de enemigos: `assets/portraits/<modelo>.png` (256 px, `captureModel`); si se cambia un modelo, rehacer su retrato.
   - Retratos de Axies con ID (Hito 93): en la interfaz usar `portraitService.axieUrl(base, onReady)` (foto 3D o imagen del marketplace mientras se hace con `ensureAxiePortrait`). No usar `getPortrait(axieId)` para Axies con ID (busca un GLB que no existe). Retratos de NPC: 256 px desde su GLB con `captureModel` (Sapidae: `zoomFactor` 0,5, `yTargetRatio` 0,26); si se cambia el modelo de un NPC, rehacer su retrato.
   - Mochila (Hito 93): `InventoryModal._heroIds()` = solo el escuadrón. El equipo de un Axie fuera del escuadrón se queda en `em.equipped[id]` y `RuneCharmService` (no se devuelve solo).
   - Equipo de Ema / Kai (Hito 92): cascos y armaduras son mallas del GLB (`<Kai|Ema>_hat_<pieza>`, `<Kai|Ema>_shirt_<pieza>`; las de varios materiales llegan como grupo). Objeto → pieza en `EQUIP_MESH_PIECES` (`SapidaeModularController`); un objeto nuevo con malla se añade ahí. El pelo bajo el casco se ajusta con `src/rpg/HatHairFit.js` (copia de la geometría, la original no se toca; `baseGeometry(mesh)` la devuelve). Texturas del GLB: 1024 (el cuerpo 2048); al reexportar, revisar que ojos, boca y pelo no suban a 2048.
   - Mezcla (Hito 91, revisada en el Hito 108): música igualada con `TRACK_LUFS` en `MusicManager` (una pista nueva: medir su LUFS y añadirla). Efectos con `TacticalAudio.SFX_BASE` y compresor `sfxComp`; volumen por `setSfxVolume`/`setAmbientVolume`. Al crear sonidos nuevos, no subir el bus: los niveles de las habilidades están en `SKILL_MIX`, `FX_MIX`, `LAYER_GAIN` y `ULT_DUCK` (`CombatSfx.js`), medidos frente a la música del combate (−24 LUFS momentáneos); un sonido de combate nuevo debe quedar cerca de esos valores.
   - Movimiento del mundo abierto (Hito 90): `PlayerController.velocity` con inercia (`accel`, `decel`, `reverse`); la cámara se adelanta con `OverworldCamera.lookAhead`. Para mover al jugador por código (recolección, cinemáticas) poner `velocity` a 0 o usar `resetInputs()`.
   - *Game feel* del combate (Hito 89): temblor siempre con `SceneManager.shake(0–0,65)` (suma trauma); pausa de impacto con `sceneManager.hitStop(s)` (las unidades usan `unitDt`); números con `combatText.spawn(pos, txt, tipo, { size })`.
   - Sonido de combate (Hito 88): `TacticalAudio.combat` (`src/audio/CombatSfx.js`) escucha `CombatEvents` (lo instala `SpellPresentation`). Un evento nuevo del combate que deba sonar se añade en `CombatSfx.install`, no con llamadas sueltas a `audio.play…`. Peso: `hitWeight(carta)` (PA). Sin subgraves: los graves empiezan en ~90 Hz.
   - Sonido de habilidades (Hito 108): el sonido de una habilidad sale de `skillSfx(spell, caster)` (`SkillSfxMap.js`): cartas de Axie por `CARD_ANIM` con la clase del Axie que lanza; Sapidae por `SAPIDAE_SFX`; enemigos por `ENEMY_SFX` (sin entrada → golpe genérico del pack); estados por `STATUS_SFX`; Ultimates por `ULTIMATE_SFX`. Una habilidad o un estado nuevo: añadir su línea ahí (los sonidos son claves del manifiesto). Para que un sonido se oiga en su primer uso, sus claves tienen que estar en lo que precarga `prepareSkills` (cartas, efectos y Ultimate de las unidades del combate); lo no cargado suena sintetizado y se carga para la próxima vez. Un WAV nuevo: a `backups/2026-10-30_sounds/combat/` y `python tools/audio/build_skill_sfx.py`. Diagnóstico: `lkDebug.sfx('skill', id)`, `lkDebug.sfx('memoria')`.
   - Sonidos del mundo (Hito 87): `TacticalAudio.world` (`src/audio/WorldSfx.js`) tiene `footstep(suelo)`, `voiceBlip(quién, letra)`, `creature(tipo, evento, {x, z})`, `axie('happy'|'curious')` y `gather(evento)`. Primero intenta la grabación (`SfxBank`, `assets/sounds/sfx/…`, solo si existe `CREDITOS.txt`) y si no, sintetiza. Los pasos los dispara `FootstepEffectsManager` con cada zancada; no añadir pasos por temporizador. Reto de pesca: `FISH_CHALLENGE` en `GatheringActors.js`. Diagnóstico: `lkDebug.sfx()`.
   - Sonido (Hito 86): el ambiente lo lleva `src/audio/AmbienceManager.js` (perfiles por isla en `AMBIENCE_PROFILES`; se añade una fuente nueva con `{ kind, x, z, r, level }`). Lee `window.game` y `window.overworldManager` solo, sin llamadas desde el bucle. Bus propio `TacticalAudio.ambGain` (volumen «Ambiente»); efectos por `masterGain`. Interfaz: `playClick`, `playSelect`, `playConfirm`, `playImpact`, `playSfx(name)`. Diagnóstico: `lkDebug.audio()`.
   - Sombras del mundo abierto (Hito 83): el sol de las islas se mueve con `LightingManager.updateLightTarget` y se aplica solo en los fotogramas con recálculo del mapa (`commitShadowTargets`). No llamar a `light.shadow.updateMatrices()` fuera del pase de sombras (cambia la matriz con la que se leen); para saber qué cae en la zona de sombras, usar una copia de la cámara (`GenshinTrees._shadowCullCamera`). bias y normalBias salen de `LightingManager.refreshShadowBias`; diagnóstico con `lkDebug.shadows()`.
   - Monedas (Hito 110):
     - Una moneda nueva o un uso nuevo de una moneda va primero en el servidor (`slot_wallets`, `_econ_*`) y en `EconomyCatalog` (`CURRENCIES`, `MARKET_CURRENCY`).
     - El bAXS nunca se intercambia entre jugadores.
     - Lo que se comercia en el Mercado sale de `tools/gen_catalog.mjs`: si cambian objetos o precios, regenerar el catálogo y las reglas en una migración **nueva**, porque `supabase db push` no repite las ya aplicadas.
   - Versión del juego (Hito 110): la que se ve en la pantalla de inicio y en la de selección de personaje es `GAME_VERSION` (`src/rpg/ui/StartScreenUI.js`). Se sube con cada entrega; es independiente de `ASSET_VERSION`.
   - Versión de assets (Hito 109): **si cambias o reemplazas un archivo de `assets/` (o `vendor/`), sube `ASSET_VERSION` en `src/render/AssetVersion.js` antes de subir el juego**; si no, los jugadores que ya entraron seguirán con el archivo viejo hasta un año. Una carga nueva que no pase por three.js (`fetch`, `new Audio`, `new Image`) debe envolver la URL con `v()`. Al subir a Hostinger con la CDN activada, purgarla.
   - Tutorial y ranura de partida (Hito 115):
     - Un paso del tutorial que necesite ver al Axie en el mundo abierto usa `cameraController.setFrameTarget(() => om.player.companionGroup)` y lo apaga al salir (hoy, `TutorialDirector._frameAxie`). No tocar `distance` ni `pitchAngle` de la cámara para eso: el encuadre los suma aparte.
     - Un paso de la guía de combate con muchas casillas válidas va con `allowedCells` (y sin `allowedCell`: así no sale halo ni flecha). `isCellAllowed` y `_tutorialAllowedReach` lo respetan.
     - Un campo nuevo de la ranura debe añadirse a la llamada de `saveSlotManager.updateActiveSlot` en `main._saveCurrentProgress` **y** a `SaveSlotManager.updateActiveSlot`: copian una lista fija de campos. `CloudSave` sube la ranura entera salvo `LOCAL_ONLY_FIELDS`.
     - La tarjeta de la ranura (`StartScreenUI.refreshSlots`) lee `slot.mainAxie || slot.hero` y nunca debe generar retratos 3D al pintarse.
   - Feedback (Hito 121): una ventana nueva que deba poder usarse con la guía del tutorial activa necesita una capa por encima de 2147483003 y que `_computeGuide` devuelva `null` mientras esté abierta. El feedback nunca se escribe directamente en la tabla: solo por `submit_feedback` (el servidor decide el tipo de cuenta).
   - Mixer de Axies (Hito 117): `vendor/axie-mixer3d/` lleva un cambio propio en el shader místico (`#ifndef USE_UV1` alrededor de `attribute vec2 uv1;`, marcado `Lunakai Hito 117`). Si se actualiza la librería, conservarlo o comprobar que la versión nueva ya no declara `uv1` sin condición; si no, las partes místicas de nivel 1 vuelven a verse como siluetas oscuras. Comentarios dentro de código GLSL: solo ASCII. El tope de color del Hito 118 (`clamp(color, 0.0, 0.88)`, marcado `Lunakai Hito 118`) va en el mismo archivo y también hay que conservarlo.
9. **Idioma de comunicación**:
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
| **`[U]`** | Mochila › Runas y charms | — |
| **`[T]`** | Abrir / Cerrar Escuadrón | — |
| **`[K]`** | Abrir / Cerrar Koliseo (tras el tutorial) | — |
| **`[L]` o `[J]`** | Abrir / Cerrar Diario de Aventuras | Bloqueado (`display: none`) |
| **`[M]`** | Abrir / Cerrar Modal Dual de Mapas (Mundi / Isla) | Bloqueado (`display: none`) |
| **`[F]`** | Formulario de feedback (también durante el tutorial) | — |
| **`[ESC]`** | Abrir / Cerrar Menú de Opciones (saltar la cinemática del prólogo) | Deseleccionar casilla o hechizo |
| **Clic Izquierdo** | Interactuar con la interfaz | Seleccionar casilla de movimiento o apuntar habilidad |
| **Clic Derecho o Rueda pulsada + Arrastrar** | — | Desplazar la cámara isométrica |
| **Rueda del Ratón** | — | Zoom táctico dinámico |
| **`[Q] / [E]`** | — | Girar la cámara 90° (sigue isométrica) |
| **`[R]`** | — | Centrar cámara en el héroe activo |
| **`[1]`–`[6]`** | — | Seleccionar las habilidades de la unidad activa |
| **`[7]`** | — | Duo Ultimate (Sapidae, vínculo al 100 %, desde la ronda 2; ronda 1 en la prueba del tutorial) |
| **Botón ⓘ** | — | Ayuda de combate: controles, estados, triángulo de clases y pronóstico |
| **Clic en el Axie compañero** | Panel Axie Care | — |

---

## 8. Verificación y Pruebas

Para comprobar que el proyecto está saludable tras realizar cambios:

```bash
# 1. Iniciar servidor local (o doble clic en iniciar_servidor.bat, en la raíz del proyecto):
node server.js 8082

# 2. Verificar servidor en otra terminal:
curl -I http://localhost:8082/

# 3. Probar en navegador:
# Abrir http://localhost:8082 y abrir consola F12 para validar que no haya errores rojos.
```

Consola de combate (F12): `lkDebug.help()` lista los comandos; `lkDebug.auditParts()` muestra las cartas de cada Axie y `lkDebug.balance()` el registro de equilibrio.

Tutorial y cinemática: `lunakaiTutorial.state()`, `.goto('forge_talk')`, `.skip()`, `.reset()`; `lunakaiCinematic.seek(55)` mientras se reproduce. Forja: `lunakaiForge.finishAll()`. Recolección: `lunakaiGathering.status()`.

---
*Este documento es la fuente definitiva de verdad arquitectónica para Lunakai: Chronicles of Lunacia.*
