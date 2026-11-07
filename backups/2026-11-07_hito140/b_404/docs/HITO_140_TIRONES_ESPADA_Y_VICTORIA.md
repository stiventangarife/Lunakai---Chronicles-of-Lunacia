# Hito 140 · Tirones al equipar la espada y ritmo de la victoria

**Fecha:** 7-nov-2026 · **Estado:** fases 1–4 aplicadas y medidas.

## Qué se pidió

1. Congelamiento tras ganar el primer combate, entre el destello del último enemigo y el panel de victoria.
2. Congelamiento al cortar el árbol de la Forja (tecla E): comprobar que el hacha se precalienta.

## Qué se encontró al medir (`lkDebug.perf`)

| Momento | Antes | Causa |
|---|---|---|
| Equipar la espada (paso del tutorial) | Fotogramas de 79, 102, 186 y 68 ms | Nuevo retrato del Sapidae: se dibujaba y se leía la imagen del canvas WebGL (`toDataURL`) en el mismo clic, así que el hilo principal esperaba a la GPU. Además, el visor comprobaba los shaders en su primer uso. |
| Victoria | Sin fotogramas largos; sensación de "quieto" | 380 ms de pausa antes del remate + 450 ms fijos antes del banner. |
| Cortar el árbol (E) | Sin tirones | El hacha ya se precompila (30–178 ms, en segundo plano). No se cambió nada. |

## Cambios

- **`src/tactics/CharacterPortraitService.js`**
  - `captureModel` se divide en `_renderCapture` (dibuja) y `_storeCapture` (caché, alias, aviso y guardado). La versión síncrona funciona igual que antes.
  - Nuevo `_captureModelEncoded`: dibuja, espera a la GPU con `_waitGpuIdle()` y codifica con `toBlob` + `FileReader` (con `toDataURL` como respaldo). Si otro retrato usó el canvas mientras tanto, vuelve a dibujar.
  - `_waitGpuIdle(maxMs = 1500)`: `fenceSync`, `flush` y `clientWaitSync(sync, 0, 0)` cada 4 ms. En WebGL1 no espera.
  - `captureModelAsync` usa `_captureModelEncoded`.
- **`src/tactics/EquipmentManager.js`**: `_updateSapidaePortrait()` junta los cambios seguidos (`_portraitQueued`) y genera el retrato a los 600 ms, en un momento libre (`requestIdleCallback`, máximo 2,5 s). El cuerpo anterior pasa a `_updateSapidaePortraitNow()`.
- **`src/rpg/tutorial/TutorialDirector.js`**: `onSwordEquipped()` avanza el paso en el fotograma siguiente, con `_equipQueued` para no repetirlo.
- **`src/rpg/ui/CharacterPreviewDiorama.js`**: `renderer.debug.checkShaderErrors = false` (creador, selector de ranuras y Mochila).
- **`src/tactics/Unit.js`** (solo la muerte cinemática del último enemigo):
  - promesa `burstStarted`, que se cumple cuando empieza el estallido de partículas;
  - pausa de 380 → 150 ms;
  - parpadeos de 60/50/60/40 ms.
- **`src/main.js` `onVictory`**: espera al estallido + 250 ms (máximo 1,2 s) en lugar de 450 ms fijos. Si no hay remate cinemático, mantiene los 450 ms.

## Resultados

| Prueba | Antes | Después |
|---|---|---|
| Equipar la espada | máx. 186 ms, 4 tirones | máx. 31 ms, 0 tirones |
| Retrato nuevo forzado (en frío) | 186 ms | 50 ms |
| Retrato nuevo forzado (en caliente) | — | 17 ms |
| Victoria: golpe → banner "VICTORIA" | ~2,3 s | 1,8 s (remate a 0,9 s, parpadeos a 1,1 s, panel a 4,0 s) |

El retrato sale correcto (PNG de 192×192).

## Notas

- **Fotograma intermitente al aparecer el banner:** en una de las medidas hubo un fotograma de 110 ms, del lado de la GPU, al aparecer el banner sobre el combate. No se reprodujo por separado (banner solo o audio solo: 17 ms) ni aparece en la grabación del usuario. Queda anotado.
- **Errores 404 en consola:** en una recarga aparecieron 35. No salen en los tiempos de recursos ni en las peticiones de la carga del título, que dan todas 200/206. El origen no está identificado y no se cambió nada.
- No se tocó `ASSET_VERSION` ni `GAME_VERSION`.

## Reglas nuevas

1. No leer una imagen de un canvas WebGL sin esperar antes a la GPU (`_waitGpuIdle`).
2. El retrato del Sapidae se genera agrupado y en un momento libre; no llamar a `_updateSapidaePortraitNow()` desde un clic.
3. Todo renderer nuevo usa `debug.checkShaderErrors = false`.

## Copias de seguridad

`backups/2026-11-07_hito140/` (código, `docs/README.md` y `PROJECT_CONTEXT.md` originales).
