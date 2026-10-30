# Hito 103: Sin congelamientos al empezar la partida ni al viajar entre islas

> **Estado:** en la versión de prueba (29-oct-2026), medido en el juego real (Chrome con GPU, `KHR_parallel_shader_compile` disponible).
> **Pedido:** «El congelamiento del inicio de la partida continúa igual»: al abrir el telón el juego se quedaba congelado muchos segundos, y los viajes en barca tardaban mucho con la pantalla de carga parada.
> **Método:** medir, atribuir cada tirón a una función concreta y arreglar solo lo que la medición señala. Cada cambio se comprobó con una nueva grabación de `lkDebug.perf` (sección 6).

## 1. Resultado

| Medición | Antes | Después |
| --- | --- | --- |
| Peor fotograma al empezar la partida (telón ya abierto) | **18.359 ms** | ≤ 70 ms |
| FPS medio en el mundo abierto (primer minuto) | 27 | 58–59 |
| Viaje Bosque → Sabana (primera visita) | ~17 s, con congelamientos de 5,2 / 2,4 / 6,8 s | ~5 s detrás del telón, peor fotograma 352 ms |
| Viaje Sabana → Ártico / Ártico → Bosque | — | ~2 s cada uno |
| Shaders enlazados de forma bloqueante con el juego visible | 13–35 por sesión (0,5–3 s cada uno) | 0 |
| Pantalla de carga inicial | ~9,5 s | ~10 s (igual) |

En este equipo cada shader pesado tarda **0,5–3 s** en enlazarse si se fuerza de forma síncrona (Direct3D a través de ANGLE). Con la compilación en paralelo del navegador (`KHR_parallel_shader_compile`) los mismos shaders se preparan en ~1 s en total. Cualquier material que llegue a dibujarse sin precalentar congela el juego de forma muy visible.

## 2. Las seis causas

| # | Causa | Efecto medido | Arreglo |
| --- | --- | --- | --- |
| 1 | **Transparencia de la cámara** (`CameraOcclusion`, Hito 74). `rebuild()` añade el «agujero» al shader de árboles, troncos, follaje y lo que tapa la cámara (`_patchSeeThrough` → `needsUpdate`). Se programaba 600 ms después de entrar en la zona, con el telón ya abierto. | Un fotograma de **18,3 s** al abrir el telón (13 shaders de árboles y edificios) | `CameraOcclusion.prepareForWarmup()`: se aplica en `_warmupShaders`, antes de compilar, también a lo oculto (los árboles de `GenshinTrees` siguen ocultos hasta su primer recorte). El precalentado compila ya esas versiones. |
| 2 | **Retrato del autoguardado** (`main._saveCurrentProgress`). Para la imagen de la ranura metía la malla viva del jugador en el **segundo contexto WebGL** de `CharacterPortraitService`, que no comparte shaders con el juego, y compilaba todo de forma síncrona. La clave «¿cambió la apariencia?» incluía el `uuid` de la malla, distinto en cada carga, así que pasaba en **cada** sesión. Lo disparaba el saldo del servidor (`EconomyService.apply` → `ForgeService._commit` → `EquipmentManager._notifyChange`) o cualquier otro autoguardado. | Un fotograma de **9,8–11,5 s** justo después de abrir el telón | La clave ya no lleva el `uuid` y se guarda en la ranura (`sapidaePortraitKey`, solo local). Si hace falta un retrato nuevo, `captureModelAsync` lo hace en segundo plano (ver sección 3.3). |
| 3 | **El bucle seguía dibujando el mundo durante los viajes.** En la carga inicial el estado es `LOADING` y no se dibuja nada, pero en un viaje el estado sigue siendo `OVERWORLD`. Cada pieza nueva de la isla compilaba su shader al entrar en escena, y el precalentado (compilación en paralelo) competía con el bucle. | 35 compilaciones bloqueantes, **14,3 s**; viaje de ~17 s | `changeMap` suspende el dibujo del mundo (`om._renderSuspended`) mientras dura. El precalentado dibuja su propio fotograma completo. |
| 4 | **Cargas sueltas:** pueblo del Bosque (11 GLB), edificios y estatuas de las islas (`placeIslandProps`), texturas de tierra de los caminos. Nadie las esperaba y entraban 1–3 s después de abrir el telón. | Texturas subidas y shaders compilados en pleno juego | `src/render/LoadGate.js`: cada carga diferida se apunta con `trackLoad()`. `init` y `changeMap` esperan `waitForLoads(8000)` antes del precalentado (tope de 8 s: con red lenta o un GLB roto, se sigue igual que antes). |
| 5 | **Máscaras de agua y pendiente** y colisiones de objetos calculadas con el juego ya visible (`setTimeout(…, 0)` en `GrandIslandZone.setActive`). | Bajadas de FPS los primeros segundos en cada isla | Se esperan detrás del telón. Con el telón cerrado los cálculos por trozos usan 24 ms en vez de 4 (`holdLoads` / `sliceBudget`). Las colisiones se calculan dentro de `setActive`. |
| 6 | **Llegada al muelle:** `travelToIsland` teletransportaba al jugador después de `changeMap` sin encuadrar la cámara. La cámara se deslizaba ~140 m desde el centro de la isla con el telón abriéndose. | Barrido de cámara y objetos entrando en pantalla al llegar | `changeMap(id, dir, spawnOverride)`: el muelle es el punto de llegada y la cámara se encuadra ahí antes del precalentado. |

## 3. Cambios

### 3.1 Precalentado del mundo abierto (`WorldMapManager._warmupShaders`)

1. Estilo anime en el jugador y los NPC **en todas las islas** con capa de arte (antes solo en el Bosque). `applyGenshinCharacterStyle` solo actúa una vez por material.
2. `CameraOcclusion.prepareForWarmup()` (causa 1).
3. `warmupRender` (compilación y texturas, como antes).
4. **Fotograma completo** (`_renderFullWarmFrame`): todo lo visible de la escena, sin recorte de cámara y con el mapa de sombras forzado (`EnvironmentSystem.renderWithShadows`). `compile()` de three r160 no prepara el pase de sombras ni sube la geometría; esto sí. Se saltan las islas inactivas. Para comparar: `window.lkNoFullWarm = true`.

### 3.2 Cargas detrás del telón (`src/render/LoadGate.js`)

| Función | Uso |
| --- | --- |
| `trackLoad(promesa, 'nombre')` | Quien lanza una carga diferida la apunta (devuelve la misma promesa) |
| `await waitForLoads(ms)` | `OverworldManager.init` y `WorldMapManager.changeMap` antes del precalentado; también espera lo que se apunte mientras espera |
| `holdLoads()` | Marca «telón cerrado» hasta llamar a la función que devuelve (se suelta sola a los 30 s) |
| `sliceBudget(4)` | 4 ms jugando, 24 ms con el telón cerrado (máscaras de agua y pendiente) |
| `lkLoads.pending()` | Consola: cargas que siguen pendientes |

Apuntan cargas: `ForestVillage` (gancho de `loadForZone`), `placeIslandProps`, las máscaras de `DemoScenaZone22`, `SavannaZone` y `GrandIslandZone`, y las texturas `ground_07` de `GenshinForestArt` e `IslandTerrainMaterial`.

### 3.3 Retratos sin congelar (`CharacterPortraitService.captureModelAsync`)

- Trabaja sobre una **copia** del modelo (`SkeletonUtils.clone`, comparte geometría y materiales): la malla viva del jugador no sale del mundo.
- Compila solo lo visible, en paralelo, y espera sin bloquear (`waitProgramsReady`).
- Sube las texturas de una en una (una por tarea) y solo entonces dibuja y codifica la imagen.
- Si no termina en 15 s o falla, devuelve `null` y se reintenta en el siguiente guardado.
- `_saveCurrentProgress` guarda en el momento con el retrato anterior. Cuando el nuevo está listo, lo pone en la ranura con `updateActiveSlot({ sapidaePortrait, sapidaePortraitKey })`.

### 3.4 Sombras: repaso solo cuando entra algo nuevo (`EnvironmentSystem`)

- `_trimSmallShadows` y `_prepareShadowCasters` recorrían toda la escena **dos veces cada ~2 s**. Ahora se ejecutan con `markShadowCastersDirty()`, que avisan:
  - el cambio de isla y la carga inicial;
  - el pueblo y `placeIslandProps` al terminar;
  - `lkDebug.shadows(…)`.
- Queda un repaso de seguridad cada ~10 s.
- `refreshShadowCasters()` lo hace al momento; lo usa el precalentado.

### 3.5 Sin dibujar durante los viajes

- `OverworldManager.render` no dibuja mientras `_renderSuspended > 0`, pero sigue atendiendo a quien espere un fotograma (`waitForNextRenderFrame`).
- `WorldMapManager.changeMap` lo sube al empezar y lo baja en un `finally`.
- La pantalla conserva la última imagen debajo del telón.

### 3.6 Pantalla de carga: el Sapidae se preparaba tres veces

La grabación de DevTools mostró que el recoloreado del pelo y la piel (`_recolorHueTexture`, `whiteHairTexture`, ~1,3 s) y el ajuste del pelo bajo el sombrero (`HatHairFit`, ~650 ms) se repetían 3 veces por carga: el Sapidae se monta en el mundo, en la vista previa del héroe y en el servicio de retratos, y cada copia trae imágenes y geometrías propias. Las cachés usaban la identidad del objeto (`uuid`, `WeakMap`), así que nunca acertaban.

- `SapidaeModularController.imageFingerprint(image)`: huella del contenido (tamaño + miniatura de 32×32). La usan `_imgKey` y `whiteHairTexture`.
- `HatHairFit.geoPrint(geo)`: huella de la geometría (vértices, índices y 48 posiciones de muestra). `_maps`, `_centers` y `_skins` son `Map` por huella. `_fits` sigue siendo por objeto.
- Prueba en Chromium: misma imagen en dos objetos → misma huella; color distinto → huella distinta. El ajuste del sombrero baja de 82 ms a 0,9 ms en la segunda copia.

### 3.7 Mochila: abrir, equipar y desequipar

Grabación del 29-oct (60 s abriendo la mochila y cambiando piezas): congelamientos de 2,2–6,3 s en cada cambio y ~4,4 s en la primera apertura.

- **Retrato del autoguardado (20,9 s en total, 540 llamadas a `canvas.toDataURL`).** `captureModelAsync` copiaba el Sapidae con `SkeletonUtils.clone`, y three.js copia `userData` con `JSON.stringify`. El Sapidae guarda ahí texturas y mallas (`origMap`, `sourceMesh` de los contornos), así que cada copia serializaba unas 60 imágenes. Ahora `cloneWithoutUserDataJson` (en `CharacterPortraitService`) da a cada copia una copia superficial del `userData`. Prueba: con 20 piezas, de 263 ms y 60 imágenes a 1 ms y ninguna. También afectaba a la Forja (el servidor cambia el equipo → autoguardado → retrato).
- **Un solo retrato por cambio de ropa.** `main._saveCurrentProgress` espera 2 s desde el último cambio de apariencia antes de hacer el retrato.
- **Primera apertura (~4 s enlazando 9 programas).** `renderer.compile` solo compila lo visible, no espera al enlazado ni hace los shaders de sombra. `InventoryModal.prewarmModel` usa ahora `warmupRender` (todas las piezas, también cascos y armaduras ocultos, esperando al driver) y dibuja un fotograma detrás del telón. `OverworldManager` lo apunta con `trackLoad` en lugar de cortarlo a los 1,5 s.

## 4. Archivos

| Archivo | Cambio |
| --- | --- |
| `src/render/LoadGate.js` | Nuevo: esperas detrás del telón |
| `src/rpg/world/WorldMapManager.js` | `changeMap` con `spawnOverride`, espera de cargas, suspensión del dibujo; `travelToIsland` con el muelle; `_warmupShaders` (estilo en todas las islas, transparencia de cámara, fotograma completo); marcas `perfMark` |
| `src/rpg/OverworldManager.js` | `init` espera las cargas; `render` respeta `_renderSuspended` |
| `src/rpg/CameraOcclusion.js` | `prepareForWarmup()`; `rebuild({ includeHidden })` |
| `src/rpg/world/EnvironmentSystem.js` | `markShadowCastersDirty`, `refreshShadowCasters`, `renderWithShadows` |
| `src/rpg/world/ForestVillage.js`, `islands/kit/IslandProps.js` | `trackLoad` y aviso de sombras |
| `src/rpg/world/WaterDepthMask.js`, `islands/kit/IslandTerrainMask.js` | `sliceBudget` |
| `src/rpg/world/demo_scena/DemoScenaZone22.js`, `savanna/SavannaZone.js`, `islands/GrandIslandZone.js` | Máscaras apuntadas; colisiones en `setActive` sin `setTimeout` |
| `src/rpg/world/demo_scena/genshin/GenshinForestArt.js`, `islands/kit/IslandTerrainMaterial.js` | Texturas de caminos apuntadas |
| `src/tactics/CharacterPortraitService.js` | `captureModelAsync`; copia sin `userData` por JSON (sección 3.7) |
| `src/rpg/ui/InventoryModal.js` | `prewarmModel` con `warmupRender` y un fotograma (sección 3.7) |
| `src/main.js` | Retrato del autoguardado con clave estable y en segundo plano; marcas `perfMark` |
| `src/rpg/SaveSlotManager.js`, `src/net/CloudSave.js` | `sapidaePortraitKey` (solo local, como el retrato) |
| `src/tactics/combat/CombatDebug.js` | `lkDebug.shadows(…)` avisa al repaso de sombras |
| `src/debug/PerfProbe.js` | Atribución de código, llamadas a WebGL, heap (sección 6) |
| `src/rpg/SapidaeModularController.js`, `src/rpg/HatHairFit.js` | Cachés por contenido (sección 3.6) |
| `src/vfx/VfxBridge.js` | `prepareInBackground` solo con compilación en paralelo disponible |

Originales en `D:\Proyectos Unity\Axie_Adventures_Tactics_backup\backups\2026-10-29_tirones_mundo_abierto\`.

## 5. Reglas para el código nuevo

- **Nada que cambie un shader después del precalentado.** Lo que haga `needsUpdate = true`, ponga `onBeforeCompile` o `customProgramCacheKey` en materiales del mundo (como la transparencia de la cámara o el estilo de personajes) debe ejecutarse antes de `_warmupShaders`, o tener su paso dentro de él.
- **Toda carga diferida de una isla se apunta con `trackLoad()`.** Modelos, texturas o cálculos por trozos que no se esperan con `await` dentro de `init()`. Así `changeMap` los espera detrás del telón.
- **Los cálculos repartidos en trozos leen `sliceBudget(ms)`** en cada trozo, no un presupuesto fijo.
- **Ningún render en un segundo contexto WebGL con el juego visible.** Retratos y visores tienen sus propios shaders: usar `captureModelAsync` (o hacerlo detrás de un telón).
- **Lo que llegue a la escena tras la carga avisa con `environmentSystem.markShadowCastersDirty()`.**
- **No clonar modelos del Sapidae con `clone()` / `SkeletonUtils.clone` directamente**: su `userData` lleva texturas y mallas y three.js lo copia por JSON (serializa las imágenes). Usar `cloneWithoutUserDataJson`.
- **Cachés de texturas o geometrías por contenido, no por objeto.** El mismo modelo se carga varias veces (mundo, vista previa, retrato) con copias distintas.
- **Para llevar al jugador a otro sitio al cambiar de mapa**, pasar `spawnOverride` a `changeMap`; no teletransportar después.
- **Cambios de isla** solo con el telón o un fundido delante: mientras dura `changeMap` el mundo no se dibuja.

## 6. Cómo medir (`lkDebug.perf`)

| Consola | Qué hace |
| --- | --- |
| `lkDebug.perf.start(180)` | Graba hasta 180 s (por defecto 60). Empezar en la pantalla de inicio para medir la carga. |
| `lkDebug.perf.stop()` / `.export()` | Informe en consola / descarga en JSON |

Secciones nuevas del informe:

- **`tirones[].codigo` y `framesLargos`:** qué script ocupó cada fotograma de más de 50 ms (API *Long Animation Frames* de Chrome/Edge). Da el punto de entrada: el bucle (`BackgroundFrames.js`), una promesa de red (`AuthService.js`), un `setTimeout`, etc.
- **`llamadasLentasGL` y `llamadasLentasGLTotal`:** llamadas a WebGL o canvas que bloquearon más de 25 ms (enlazar shaders, subir texturas, `readPixels`, `toDataURL`…), en todos los contextos. Cada una lleva su **pila**: primero three.js y luego las funciones del juego que la pidieron. Mientras se graba, las pilas llegan a 60 líneas.
- **`heap`:** inicio, mínimo, máximo y final, y el mínimo de cada mitad (una lectura por segundo). Una fuga se ve si el mínimo sube de forma sostenida en grabaciones largas que repiten lo mismo.
- **Marcas `lk:`** (también en el panel Performance de DevTools):
  - `carga: …`, `viaje: …`;
  - `precalentado: inicio` / `transparencia de cámara` / `fotograma completo` / `fin`;
  - `telón: …`, `VFX segundo plano: …`.

Diagnóstico de esta sesión: `KHR_parallel_shader_compile` en `game.sceneManager.renderer.extensions.has(…)` debe dar `true`. Sin esa extensión, la compilación en paralelo y `captureModelAsync` no pueden evitar el bloqueo.

## 7. Pendiente

- **Precalentado de VFX en segundo plano** (`main._scheduleBackgroundCombatWarmup`, desde ~4 s tras abrir el telón): revisado, sin cambios de fondo.
  - En las tres grabaciones con él activo solo dejó un tirón de ~65 ms (lectura de un módulo de efectos) y ninguna llamada a WebGL bloqueante.
  - Dos tirones de ~520 ms sin JavaScript (GPU o navegador) aparecieron una vez cada uno y no se repitieron.
  - Riesgo en otros equipos: sin `KHR_parallel_shader_compile`, `_precompile` fuerza el enlazado en el hilo principal. Ahora `VfxBridge.prepareInBackground` no hace nada en ese caso, y el combate lo prepara detrás de su velo como antes.
- **Tirones con el telón cerrado:** resueltas las repeticiones del Sapidae (sección 3.6), falta confirmarlo con una grabación nueva. Quedan, sin verse en el juego: montaje del bosque (~400 ms), mixer de Axies (~230 ms) y vista previa del héroe.
- **Mundo al equipar:** un shader nuevo del mundo (~800 ms una vez) al equipar una pieza que no estaba precalentada. Pendiente de confirmar con una grabación nueva.
- **Heap:** comprobar con varios viajes de ida y vuelta a la misma isla que el mínimo no sube.
- **Combate:** este hito no lo midió.
