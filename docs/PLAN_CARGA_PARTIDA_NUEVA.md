# Plan: carga de la partida nueva (de «Iniciar» a la cinemática)

> **Fecha:** 6-nov-2026 · **Estado:** aprobado (fase 5 opcional; con la cinemática saltada se usa la pantalla de carga normal). Medición 1 hecha: ver §0.
> **Problema:** con un personaje nuevo pasan ~30–40 s desde «Iniciar» hasta que empieza la cinemática.
> **Base:** lectura del código actual (`main.js`, `OverworldManager.js`, `TutorialDirector.js`, `PrologueCinematic.js`, `ModelCache.js`, cargadores de cada sistema, `.htaccess`, `server.js`). Todavía sin medir: la fase 0 confirma o corrige el orden de prioridades.

## 0. Medición 1 — localhost, navegador integrado (6-nov)

Herramienta: `tools/medir_carga.js` (pegar en la consola en la pantalla de título).
Equipo: RTX 4060, compilación en paralelo disponible, ventana 809×907.

| | 1.ª pasada (shaders sin caché) | 2.ª pasada (página recargada) |
|---|---|---|
| Clic → cinemática | **7,5 s** | **4,6 s** |
| Precalentado final | 3,2 s (fotograma completo 727 ms) | 0,8 s (217 ms) |
| Descargado antes de la cinemática | 31,9 MB · 143 peticiones | 29,3 MB · 132 peticiones |
| Bloqueos del hilo principal | 2,5 s (mayor: 729 ms) | 1,3 s (mayor: 521 ms) |
| Errores 404 | 0 | 0 |

**Pasos (2.ª pasada):**

| Paso | Tiempo |
|---|---|
| Fundido | 0,6 s |
| Sapidae | 0,3 s |
| NPC | 0,65 s |
| Bosque | 1,0 s |
| Cargas diferidas | 0,45 s |
| Precalentado | 0,8 s |
| Cinemática (modelos + voces) | 0,8 s |

**Descargas repetidas (en las dos pasadas):**
- `scroll_keeper.glb` ×2
- `kappa.glb` ×2
- `slime.glb` ×2
- `Grass.png` ×3
- `Bark_TwistedTree.ktx2` ×2
- el decodificador Draco ×2 (`draco_decoder.wasm` + wrapper): hay un segundo `DRACOLoader`.

**Qué pesan los 29 MB:**

| Tipo | MB |
|---|---|
| GLB | 19,7 |
| PNG | 3,1 |
| KTX2 | 2,8 |
| MP3 | 2,3 (`PROLOGO.mp3`: 1,6) |
| bin | 1,2 |
| wasm | 0,8 |
| WebP | 0,8 |

- Los más grandes: `sapidae-f-a` 2,6 MB, `werewolf-boss` 1,4, `paladill` 1,2, `forest_ground_1k.png` 1,1, `xia` 1,0, `bing` 1,0, `pomodoro` 0,95 y `Leaves.png` 0,9.
- Los 9 GLB de la cinemática (`werewolf-boss`, `bing`, `pomodoro`, `kotaro`, `sapidae-f-b`, `sapidae-m-c`…) se descargan **con texturas** que luego se tiran (`stripTextures`). Solo se usan como siluetas.

**Conclusión:** en este equipo y en local no se reproducen los 30–40 s. Lo que más cuesta es **lo que se descarga** (29 MB antes de la cinemática) y, con la caché de shaders vacía, el precalentado.
- En Hostinger, a 10 Mbps, 29 MB son ≈ 24 s solo de descarga. Ahí es donde la fase 1 (cinemática primero) y quitar peso cuentan de verdad.
- Pendiente: repetir con `tools/medir_carga.js` en el Chrome del usuario (pantalla completa) y en Hostinger, con caché vacía y llena.

**Nueva tarea (fase 3b):** versiones «silueta» de los modelos de la cinemática, solo geometría y animación, sin texturas y con Draco. Ahorra varios MB antes de la cinemática.

## 0b. Medición 2 — Hostinger (lunakai.stivendev.info), mismo PC y red del usuario (6-nov, 19:30)

Navegador integrado de la app (RTX 4060, ventana 809×907). Red: HTTP/3, «4g», ~10 Mbps estimados, RTT 200–250 ms.

| | Caché llena (visitas anteriores) | Caché vacía (forzada con `cache:'reload'`) |
|---|---|---|
| Clic → cinemática | **9,6 s** | **12,0 s** |
| Descargado | 1,1 MB (107 archivos de la caché) | 26,2 MB · 134 peticiones |
| NPC | 1,0 s | **4,2 s** (descarga de sus GLB) |
| Bosque | 2,0 s | 2,2 s |
| Cargas diferidas | 0,8 s | 1,0 s |
| Precalentado | 3,5 s (fotograma completo 817 ms) | 1,4 s |
| Cinemática (9 GLB + voces) | 0,6 s | **1,8 s** |
| Bloqueos del hilo principal | 3,6 s (mayor: 821 ms) | 1,8 s |
| Errores 404 | 0 | 0 |

**Qué devuelve el servidor:**
- **La CDN de Hostinger (`hcdn`) no guarda los GLB:** responde `x-hcdn-cache-status: DYNAMIC`, así que cada GLB va al servidor de origen y tarda 450–900 ms en empezar a llegar. Probablemente por el `?v=` o por el tipo `model/gltf-binary`. Los PNG y los JS salen como `MISS`.
- Los GLB se envían **sin comprimir** (sin `content-encoding`). Los JS sí van en Brotli.
- Los PNG de texturas (`Grass.png`, `Leaves.png`…) llevan `Cache-Control: no-cache`: incluso con caché llena cada uno pide una revalidación de ~700–900 ms antes de usarse.
- Con caché llena, el precalentado tarda más que con caché vacía (3,5 s frente a 1,4 s). Depende de si el navegador ya tiene esos shaders compilados guardados, lo que varía de una vez a otra.

**Conclusión:** en este PC y esta red, el peor caso real (caché vacía) es **12 s**, no 30–40 s. Para encontrar la diferencia hay que saber cómo se midieron los 30–40 s: si incluye la creación del personaje o el inicio de sesión, o si fue en otro equipo, con otra red o en pantalla completa. Igualmente:
1. la fase 1 (cinemática primero) bajaría A a ~1–2,5 s también en Hostinger;
2. arreglar la CDN (que guarde GLB/KTX2/bin, con el `?v=` incluido en la clave) y servir las texturas con versión e `immutable` quita la mayor parte de las esperas de red.

## 1. Qué pasa hoy (flujo real del código)

| # | Paso | Dónde | Bloquea la cinemática |
|---|---|---|---|
| 1 | Fundido de salida de la pantalla de inicio (600 ms) | `StartScreenUI._launchGameWithSlot` | sí |
| 2 | Telón «Loading Biome…» | `main._startOverworld` | — |
| 3 | `StylizedEnvironment` (solo luz y niebla) | `OverworldManager._initImpl` paso 1 | sí |
| 4 | Sapidae + Axie compañero (`cloneGLTF`, teñido, `HatHairFit`) | paso 2 | sí |
| 5 | NPC de la isla (Paladill, Kawa, Guardián de los Pergaminos…) con su propio `GLTFLoader` | `NPCManager.init` | sí |
| 6 | Monstruos de la isla | `WanderingMonsters.init` | sí |
| 7 | `BiomeDecorationManager.init` | — | **no carga nada en el Bosque** (es diferido) |
| 8 | Isla del Bosque completa: ~40 GLTF/GLB (árboles, rocas, vegetación, **4 slimes**) y 11 texturas, capa Genshin, río, máscaras | `ensureForestBuilt` → `DemoScenaAssetManager.loadAll` | sí |
| 9 | `WorldMapManager.init` → `loadMap` + precalentado | — | sí |
| 10 | `EnvironmentSystem` (sombras, post) | — | sí |
| 11 | Visor 3D de la Mochila (`prewarmModel`) | apuntado con `trackLoad` | sí (hasta 8 s) |
| 12 | Pueblo del Bosque (11 GLB), props, caminos, máscaras | `waitForLoads(8000)` | sí (hasta 8 s) |
| 13 | Precalentado final con fotograma completo y sombras | `WorldMapManager._warmupShaders` | sí |
| 14 | `startPrologue` → velo «Crónica» → **`cin.preload()`**: 9 GLB (con texturas que luego se tiran) + voces | `TutorialDirector.playOpening` | sí |
| 15 | La cinemática empieza (`gameState = 'CINEMATIC'`: el mundo **no se dibuja**) | `PrologueCinematic.play` | — |

**Lo importante:** la cinemática dura 73 s, tiene escena y cámara propias y **no usa el mundo**. Del juego solo toma `player.mesh` y `player.companionMesh`, y solo en el final (segundo 55, `_setupFinale`). Todo lo de los pasos 3 y 5–13 se puede hacer **mientras se ve la cinemática**. Tiempo disponible: 73 s; hoy la carga tarda 30–40 s.

## 2. Revisión de las propuestas

| Propuesta | Veredicto | Matiz |
|---|---|---|
| Cargar solo el Dojo y los personajes; lo demás después | **Sí, con cambios** | `BiomeDecorationManager` no es el culpable: en el Bosque su `init` no carga nada. Lo pesado es el paso 8 (Bosque entero, con slimes que **están ocultos durante el tutorial**), el pueblo, los NPC, los monstruos, el visor de la Mochila y el precalentado. Ojo: el Hito 103 llevó todo detrás del telón a propósito, porque cargar con el juego visible volvía a dar tirones. Con la fase 1 la cinemática hace de telón; en partidas guardadas (sin cinemática) hay que diferir con cuidado (fase 2). |
| `THREE.Cache.enabled = true` + mapa de promesas por URL | **El mapa sí; `THREE.Cache` no, o solo con ajustes** | Ver fase 3. Hay **8 `GLTFLoader` independientes** además de `ModelCache` (`NPCManager`, `DemoScenaAssetManager`, `SlimeCreaturesManager`, `BiomeDecorationManager`, `GrandIslandZone`, `SavannaAssetManager`, `CharacterPortraitService`, `PrologueCinematic`), cada uno con su caché o sin ninguna. `slime.glb` lo piden 5 sistemas. Las descargas **simultáneas** de la misma URL ya las une `FileLoader`; las repetidas son **seguidas**. En local `server.js` responde `no-store`, así que se descargan otra vez; en Hostinger salen de la caché del disco (`immutable`). En los dos casos se **analizan y suben a la GPU dos veces**, y eso es lo que más cuesta. `THREE.Cache` guarda todos los bytes en RAM para siempre y, con `evictGLTF` (que cierra los `ImageBitmap`), puede devolver imágenes cerradas: texturas negras (el fallo del Hito 113). |
| Quitar las rutas 404 | **Sí** | Rápido y sin riesgo. Hace falta una pasada por Network (fase 0) y un script que lo compruebe solo (fase 4). |
| Precargar / precalentar durante la cinemática | **Sí: es el cambio de mayor impacto** | Ver fase 1. Riesgos: bloquear el hilo principal hace tartamudear la cinemática; `_renderFullWarmFrame` dibuja en el mismo canvas; sin `KHR_parallel_shader_compile` los shaders se enlazan de forma bloqueante (0,5–3 s cada uno en ANGLE). |
| Empaquetar con Vite/esbuild | **Sí, pero no arregla este problema** | Los módulos ya están cargados cuando el jugador pulsa «Iniciar» (la pantalla de título los necesita). Empaquetar acorta la **primera** carga hasta el título y quita cientos de revalidaciones (`.htaccess`: `.js` con `no-cache`), no los 30–40 s. Además rompe la regla 1 del proyecto (sin bundlers): necesita tu visto bueno. Ver fase 5. |

## 3. Fases

### Fase 0 · Medir antes de tocar (S)

1. Añadir marcas `perfMark` a cada paso de `_initImpl` (hoy solo hay inicio y fin), a `cin.preload` y al primer fotograma de la cinemática.
2. Grabar `lkDebug.perf.start(180)` desde la pantalla de título con un personaje nuevo, **en local y en Hostinger** (el `no-store` de `server.js` infla la medida local), con la caché vacía y con la caché llena.
3. En DevTools → Network: lista de 404 y de URLs repetidas, con su tamaño.
4. Comprobar `KHR_parallel_shader_compile` en el equipo de prueba.

**Métricas:**
- **A** = «Iniciar» → primer fotograma de la cinemática;
- **B** = fin de la cinemática → control del jugador;
- peor fotograma *durante* la cinemática.

### Fase 1 · La cinemática primero, el mundo debajo (M–L) — mayor impacto

**Flujo nuevo (solo partida nueva):**

1. Clic → fundido → en paralelo:
   - `StylizedEnvironment` + Sapidae y Axie compañero (pasos 3–4);
   - `cin.preload()`.
2. Empieza la cinemática.
3. **Mientras se ve**, se construye el mundo (pasos 5–12) en «modo cinemática».
4. Al terminar o saltar la cinemática → velo negro (ya existe) → se espera lo que falte, con la barra del velo si hace falta → precalentado final (paso 13) → Dojo.

**Cambios:**
- Dividir `OverworldManager.init` en `initCore()` (pasos 3–4) e `initWorld()` (pasos 5–13), y el precalentado final en una función aparte. `main._startOverworld(withPrologue)` lanza `initWorld` sin esperarlo y `playOpening` lo espera al final.
- **Precargar los assets de la cinemática** mientras el jugador está en el creador de personaje (9 GLB + logo + voces): `cin.preload` ya es independiente del mundo.
- `cin.preload` usa su propio `GLTFLoader` y tira las texturas (`stripTextures`): debe trabajar sobre un **clon** si pasa por `ModelCache` (fase 3), porque modifica el GLTF.
- **Modo cinemática en `LoadGate`:** nuevo estado además de `holdLoads`, con `sliceBudget` de ~4 ms (no 24) para no robar fotogramas a la cinemática.
- **Nada de dibujar en el canvas durante la cinemática:** `_renderFullWarmFrame` y `InventoryModal.prewarmModel` (fotograma detrás del telón) se pasan al velo final. `warmupRender` (compilación en paralelo, sin dibujar) sí puede ir durante la cinemática.
- **Sin `KHR_parallel_shader_compile`:** todo el precalentado va detrás del velo final, como ahora (peor B, mismo A).
- **Saltar la cinemática (Esc) antes de tiempo:** el velo muestra la barra de progreso hasta que el mundo esté listo. No se suelta el control antes.
- El final de la cinemática usa `player.mesh`: `initCore` debe haber terminado antes de `play()` (ya lo garantiza el paso 1).

**Riesgos:**
- El orden de dependencias de `_initImpl` (NPC → colisiones de Paladill, `questManager.loadSaveData`, `worldMapManager.init` después de los cargadores: «Regla de Oro» de `PROJECT_CONTEXT` §3) se mantiene dentro de `initWorld`; solo cambia cuándo se ejecuta.
- Tirones dentro de la cinemática por análisis de GLB y subida de texturas. Se mide con el peor fotograma de la fase 0. Si molesta, se reparten las cargas en las escenas de papel (las más simples).

**Resultado esperado:** A ≈ tiempo de `initCore` + preload de la cinemática (objetivo < 5 s, a confirmar en fase 0); B ≈ precalentado final (~1–3 s), porque el resto ya cargó durante los 73 s.

### Fase 2 · Al empezar, solo el Dojo (M)

Sirve sobre todo para **cargar una partida guardada** (sin cinemática que lo tape), y aligera la fase 1.

| Qué | Cuándo se carga | Notas |
|---|---|---|
| Slimes del Bosque (`DemoScenaAssetManager` claves `slime*` + `SlimeCreaturesManager`) | Al terminar el tutorial o al primer respawn | Están ocultos durante el tutorial (`_tutorialRunning`) |
| Monstruos de la isla (`WanderingMonsters`) | Tras abrir el telón, por manadas, con su modelo ya en caché | El director de respawn ya elige solo manadas cacheadas |
| NPC lejanos del Dojo | Por distancia al jugador | Durante el tutorial solo habla Paladill |
| Visor de la Mochila (`prewarmModel`) | Antes del paso «Mochila» del tutorial, detrás de un velo o con compilación en paralelo | Hoy espera hasta 8 s |
| Pueblo del Bosque fuera del Dojo | Por anillos de distancia | Revisar con el diseño del pueblo |

**Regla (Hito 103):** todo lo que entre tras abrir el telón debe tener su shader ya compilado (añadir una malla de muestra al precalentado, como `Unit.deathFxWarmGroup`) y avisar con `markShadowCastersDirty()`. Si no, vuelven los tirones de 0,5–3 s.

### Fase 3 · Una sola caché de modelos (M)

- `ModelCache.loadGLTFCached` ya es un mapa de promesas por URL. Hacer que **todos** los cargadores pasen por ahí: los 8 de la tabla de §2. Quien modifique el GLTF (cinemática, teñido) usa `cloneGLTF` o un clon propio.
- `ModelCache` resuelve la URL a una clave canónica (sin `./`, sin `?v=`), para que `'./assets/models/slime.glb'` y `'assets/models/slime.glb'` coincidan.
- Contador de peticiones por URL en `lkDebug.assets` para comprobar que ninguna se repite.
- **`THREE.Cache`:** no activarlo de forma global. Si la fase 0 muestra descargas repetidas de **texturas sueltas** (PNG de `TextureLoader`, que no pasan por `ModelCache`), se activa con estas condiciones:
  - `evictGLTF` y `releaseTextures` hacen `THREE.Cache.remove(url)`;
  - se vacía al cambiar de isla, para no retener en RAM los bytes de los GLB.
- **Medida de éxito:** 0 URLs repetidas en Network durante la carga; menos memoria de texturas en `lkDebug.gpu()`.

### Fase 4 · Sin 404 (S)

- Corregir o quitar cada ruta que salga en la fase 0.
- Nuevo `tools/check-assets.mjs`: busca en `src/` las rutas `./assets/…` y `./vendor/…` y comprueba que el archivo exista. Se lanza antes de cada entrega (añadirlo a `DEPLOYMENT_GUIDE.md`).
- Las rutas construidas con variables (p. ej. `assets/models/${file}.glb`) solo se ven en ejecución: un contador de 404 en `lkDebug.perf` (desde `LoadingManager.onError` y el `FileLoader` parcheado de `AssetVersion.js`).

### Fase 5 · Empaquetado solo para publicar (M) — necesita tu visto bueno

- **Desarrollo sigue igual** (sin compilar, `node server.js 8082`). Solo la subida usa `tools/build.mjs` con **esbuild** (un binario, sin configuración) → `dist/`, con 2–3 archivos con hash: núcleo (título y mundo), combate (carga diferida) y `three`.
- **Cuidado al empaquetar:**
  - **Un solo `three`:** el mixer de Axies importa `"three"` por el `importmap`. Si el empaquetador mete dos copias, el parche de `AssetVersion.js` (que toca `FileLoader.prototype`) y los `instanceof` fallan.
  - **Módulos de VFX:** son scripts clásicos (IIFE) que se cargan con `<script>` (`vfx-modules.js`). Se quedan fuera del paquete y se copian tal cual; como mucho se minifican.
  - **Rutas relativas a `index.html`:** Draco (`./vendor/draco/`), Basis/KTX2, `new URL('./', import.meta.url)`, los `import()` dinámicos. Hay que copiarlas y comprobarlas en `dist/`.
  - **Caché:** archivos con hash → `immutable` en `.htaccess` para `dist/*.js` (hoy los `.js` van con `no-cache`: una revalidación por módulo en cada visita).
- `three` r160 se deja recortar poco (muchas clases se usan por nombre); el ahorro grande sale de unir y minificar los módulos del juego.
- **Medida de éxito:** tiempo hasta la pantalla de título y número de peticiones, con caché vacía y llena, en Hostinger.

### Fase 6 · Hosting (S) — sube de prioridad tras la medición 2

- **CDN de Hostinger:** activar que guarde `.glb/.ktx2/.bin/.gltf/.mp3/.wasm` respetando la query string `?v=`. Hoy los GLB salen `DYNAMIC`: no se guardan en la CDN. Se configura en hPanel → CDN o con una regla de caché.
- **Texturas PNG/WebP del juego** (`assets/nature`, `assets/stylized`): pedirlas con `?v=ASSET_VERSION` (que `TextureLoader`/`ImageLoader` también pasen por `AssetVersion.js`) y servirlas `immutable`. Así no hay una revalidación de ~800 ms por textura en cada visita.

- `.htaccess`: comprimir también `model/gltf+json` (los `.gltf` son JSON) e `image/svg+xml`. Comprobar si Hostinger da Brotli.
- Revisar que la CDN de Hostinger respete `?v=`.

## 4. Orden propuesto

1. **Fase 0** (medir) → confirma qué pasos de la tabla de §1 pesan más.
2. **Fase 4** (404) y **fase 3** (una caché): rápidas, sin riesgo de tirones y ayudan a la fase 1.
3. **Fase 1** (cinemática primero): el gran cambio de la métrica A.
4. **Fase 2** (Dojo primero): para cargar partidas guardadas.
5. **Fase 5** (empaquetado) y **fase 6**, si se aprueban.

Cada fase termina con:
- una grabación `lkDebug.perf` igual a la de la fase 0;
- una copia de seguridad en `backups/<fecha>_carga_inicial/`;
- su documento de hito (siguiente número libre: 138);
- `ASSET_VERSION` subido si se toca `assets/`.

## 5. Preguntas abiertas

1. ¿Los 30–40 s se midieron en local (`server.js`, sin caché) o en Hostinger?
2. ¿Se aprueba el empaquetado solo para publicar (fase 5), como excepción a la regla 1?
3. Si el jugador salta la cinemática en el segundo 5, ¿se acepta una barra de carga en el velo hasta que el mundo esté listo?
