# Hito 143 · Resolución dinámica, tiempo de GPU en lkDebug.perf y memoria del Sapidae

**Fecha:** 7-nov-2026 · Sin cambios en `assets/`.

**Archivos:**
- Nuevos: `src/render/GpuTimer.js`, `src/render/ResolutionScale.js`.
- Cambiados: `src/main.js`, `src/tactics/SceneManager.js`, `src/rpg/world/EnvironmentSystem.js`, `src/rpg/ui/SettingsModal.js`, `src/i18n/{es,en}/settings.js`, `src/debug/PerfProbe.js`.

## Contexto (medidas del usuario, Chrome a 1920×945, RTX 4060)

- Con DevTools y la extensión Three.js DevTools abiertos: 54,7 fps, 18,3 ms y un pico de 57 ms.
- Con DevTools cerrado: **59,8 fps**, fotograma p50 16,7 / p95 17,9 / p99 20,5 ms, CPU del bucle 7,6 ms, 0 tirones. La pérdida la causaba la herramienta.
- Las medidas de GPU hechas desde la consola salían infladas: el contador de GPU mide del primer comando al último, y con DevTools abierto los comandos llegan espaciados.
- Los renderers de 0×0 no dibujan en el mundo, así que pararlos no ganaría nada.

## 4 · Tiempo de GPU en lkDebug.perf

- `GpuTimer` abre una consulta de tiempo de GPU (`EXT_disjoint_timer_query_webgl2`) justo antes de dibujar el fotograma y la cierra después. Va en `main.js`, alrededor de `overworldManager.render` y `sceneManager.render`.
- El resultado se recoge sin bloquear uno o dos fotogramas después.
- Los fotogramas que no dibujaron (`renderer.info.render.frame` sin cambiar) se descartan.
- Solo mide mientras alguien escucha: la escala automática o una grabación.
- El informe de `lkDebug.perf` trae `gpuDibujoMs` (p50, p95, máx., fotogramas) y `renderer.escala` (escala del jugador, escala automática y últimos cambios).
- **Para medir: grabar con DevTools cerrado** (`lkDebug.perf.start(20)`, cerrar DevTools, jugar, volver a abrir, `lkDebug.perf.export()`).

## 2 · Escala de resolución (Opciones y automática)

**Fallo encontrado:** la escala de resolución de Opciones solo cambiaba el renderer.
- Los dos `EffectComposer` (mundo y combate) se quedaban con la densidad de píxeles del arranque.
- Al 70 %, el lienzo bajaba a 566×634 pero la escena se seguía dibujando a 809×907 y luego se copiaba reducida. No ahorraba GPU y además emborronaba.

**`ResolutionScale`** pasa a ser la única fuente.
- Densidad de píxeles = DPR (como mucho 1,5) × escala del jugador × escala automática.
- Se aplica al renderer y a cada composer registrado (`addComposer`, desde `SceneManager` y `EnvironmentSystem`).
- Probado al 70 %: el lienzo, los dos composers y el bloom pasan a ~566×634, y vuelven a 809×907 al 100 %.

**Automática** (Opciones › «Resolución dinámica», activada por defecto, guardada en `axie_tactics_gfx.dynRes`; no cambia el preset de calidad):
- **Cuándo mide:** ventanas de 1,5 s, solo en el mundo o en combate a la vista.
- **Cuándo baja:** un 10 % (mínimo 0,8 sobre la escala del jugador) tras 2 ventanas en las que se cumplan las dos cosas:
  - media de fotograma por encima de 18 ms;
  - GPU del dibujo (p75) por encima de 12,5 ms y más de 1,25 veces la CPU del dibujo.
- **Cuándo sube:** un 10 % tras 3 ventanas con la GPU por debajo de 8,5 ms.
- **Sin medición de GPU** (Firefox, Safari): baja con fotogramas lentos y prueba a subir tras ~10 s buenos; si vuelve a ir lento, espera el doble antes de volver a probar.
- **Esperas:** al menos 3 s entre cambios.
- **Consola:** `lkResolution.status()`.

**Prueba**, con la carga de GPU forzada por un pase de posprocesado artificial:

| | Fotograma | GPU p75 | Escala |
|---|---|---|---|
| Sin carga | 16,7 ms | ~6 ms | 1,0 (sin cambios) |
| Carga media (GPU 8 ms, 60 fps) | 16,7 ms | 8,3 ms | 1,0 (no hacía falta) |
| Carga fuerte | 42,8 ms | 46,7 ms | baja a 0,9 (a los ~3 s) y a 0,8 (~6 s) |
| Carga fuerte a 0,8 | 17–19 ms | 16–18 ms | se queda en 0,8 (mínimo) |
| Se quita la carga | 16,7 ms | ~6 ms | sube a 0,9 y a 1,0 en ~10 s |

Una ventana lenta por la CPU (23,6 ms con GPU 3,8 ms) no bajó la escala, que es lo correcto. El interruptor de Opciones se guarda y no cambia el preset.

## 3 · Memoria del Sapidae (investigación, sin cambios)

- `Sapidae_Ema.glb` / `Sapidae_Kai.glb` es modular: 78 mallas, de las que se ven 15, y 42 texturas, de las que se usan 10 (5 ojos, 4 peinados… de 1024×1024; el cuerpo, de 2048×2048).
- Las 41 imágenes decodificadas (ImageBitmap) ocupan **~150–165 MB** de memoria del navegador.
- Es así por diseño:
  - `SapidaeModularController._releaseUnusedVariantTextures` ya saca de la GPU las variantes ocultas, pero conserva la imagen porque el recoloreado (teñido por lienzo) la necesita.
  - El GLB se comparte por `ModelCache` entre el mundo, el creador y el visor; cerrar sus imágenes dejaría en negro lo que no esté en la GPU (fallo reproducido, anotado en `ModelCache.js`).
- Opciones para reducirla, pendientes de decidir:
  1. **Rehidratar bajo demanda:** cerrar las imágenes de las variantes ocultas en el mundo y volver a decodificarlas desde el caché HTTP solo cuando hagan falta (creador, vestuario, recoloreado). Es la mayor ganancia (~120 MB) sin cambiar el aspecto, con riesgo medio: hay que cubrir todos los caminos que muestran una variante.
  2. **Texturas de variantes a 512×512** (cambio de asset): 4 veces menos memoria en esas texturas, con algo menos de detalle; hay que subir `ASSET_VERSION`.
  3. **KTX2:** no sirve tal cual, porque el recoloreado necesita los píxeles en la CPU. Antes habría que pasar el teñido a un shader.
- Otros modelos de Sapidae en memoria (NPC): `sapidae-m-d` 32 MB, `sapidae-m-a` 28 MB, `sapidae-f-a` 23 MB.

## Otros

- **404 al crear una partida nueva:** falta `assets/portraits/sapidae-f-ema.png` (retrato del modelo por defecto). Hay otros 4 404 al cargar el título, aún sin identificar. No se tocaron.

## Reglas

1. La densidad de píxeles solo se cambia con `ResolutionScale` (`setUser`, `setAutoEnabled`). Todo `EffectComposer` nuevo se registra con `resolutionScale.addComposer()`.
2. Para medir rendimiento, grabar con DevTools cerrado.

## Copias de seguridad

`backups/2026-11-07_hito143/` (los 7 archivos cambiados y los documentos).
