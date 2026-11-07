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
- **Errores 404 en consola:** resueltos en la parte B (abajo). No salían en los tiempos de recursos porque ese registro del navegador se llena a las 250 entradas y deja de anotar.
- `GAME_VERSION` sin cambio. `ASSET_VERSION` sube en la parte B.

## Parte B · Errores 404 hasta la tala

Tres fuentes, ninguna relacionada con el congelamiento del hacha (las peticiones van por detrás):

| 404 | Causa | Efecto |
|---|---|---|
| `src/ui/assets/skills/heroes/<clase>/<n>.webp` | `CombatHUD.js` ponía `--art:url('./assets/…')` relativa. Un `url()` dentro de una variable CSS se resuelve contra la hoja que la usa (`src/ui/ds.generated.css`). | La ficha de las cartas en combate salía **sin imagen de cabecera**. |
| `assets/sounds/ambience/*_loop.mp3` (mar, río, rápidos, hoguera) | `AmbienceManager` pedía los bucles opcionales y la carpeta no existe. | Ninguno (suena sintetizado); 3 peticiones inútiles por sesión. |
| `assets/sounds/sfx/{creatures,combat,world}/…` | `SfxBank` daba por hecho que había todas las grabaciones porque existe `CREDITOS.txt`; solo hay `steps/`. | Ninguno (sintetizado); una petición por variante que falta. |

Cambios:

- **`src/ui/CombatHUD.js`**: la imagen de la ficha usa la ruta absoluta (`new URL(art, document.baseURI)`), como ya hacían `lk.js` y `StartScreenUI.js`.
- **`assets/sounds/sfx/manifest.json`** (nuevo): `sfx` (rutas relativas a `assets/sounds/sfx/`; hoy los 30 pasos) y `ambience` (bucles de `assets/sounds/ambience/`; hoy vacío).
- **`src/audio/SoundManifest.js`** (nuevo): lee la lista una vez por sesión (`loadSoundManifest`, `soundManifest`). Si falla, listas vacías y todo sintetizado.
- **`src/audio/SfxBank.js`**: lee la lista en lugar de `CREDITOS.txt` y solo pide las variantes que están en ella; una familia sin variantes queda `missing` sin pedir nada.
- **`src/audio/AmbienceManager.js`**: `_loop` solo pide un bucle si está en la lista; si la lista trae bucles después de montar el fondo, lo rehace.
- **`src/render/AssetVersion.js`**: `ASSET_VERSION` de `0.4.0` a `0.4.1` (archivo nuevo en `assets/`).
- **`docs/AUDIO_ARCHIVOS_A_CONSEGUIR.md`**: nota nueva sobre la lista.

Comprobado en el navegador:

- Recarga del título: 0 errores 404 (antes, 3 de los bucles de ambiente).
- Pasos: se piden los 4 de hierba y de madera (200, `?v=0.4.1`) y suenan.
- `chop_wood`, `tree_fall`, `axie_happy`, `axie_hurt`, `axie_curious`, `faint_enemy` y `land_soft` quedan sintetizados sin ninguna petición; los cuatro bucles de ambiente, igual.
- Ficha: la imagen se resuelve a `/assets/skills/heroes/stargazer/4.webp` (200); antes, a `/src/ui/assets/…`.

## Parte C · Corazón del vínculo y cartel de la forja

| Problema | Causa | Arreglo |
|---|---|---|
| En el tutorial sube el vínculo (caricia, mandarina) pero el corazón del Axie en el escuadrón (derecha) no se rellena. | `SquadHUD` solo se repintaba al cambiar el equipo (oyente de `EquipmentManager`); no escuchaba a `BondService`. | `SquadHUD` se suscribe a `BondService.onChange` y repinta con `_renderSoon()` (varios cambios seguidos: un repintado cada 120 ms). `destroy()` quita la suscripción y el repintado pendiente. |
| «Usar la forja» en español con el juego en inglés. | Texto escrito a mano en `ForgeStation.js` (`promptText: 'Usar la forja'`); era el único cartel así. | Clave `forge.usePrompt` en `i18n/es/forge.js` («Usar la forja») y `i18n/en/forge.js` («Use the forge»). `promptText` es un *getter*: el texto se lee al mostrar el cartel, así que también cambia si se cambia el idioma con la partida abierta. |

Comprobado en el navegador: el nivel del corazón pasa de 8,7 (68 %) a 2,9 (92 %) y a 1,0 (100 %) en menos de 250 ms, y vuelve al restaurar el valor. `inLang('Usar la forja', 'en')` da «Use the forge». Sin cambios en `assets/`.

## Reglas nuevas

1. No leer una imagen de un canvas WebGL sin esperar antes a la GPU (`_waitGpuIdle`).
2. El retrato del Sapidae se genera agrupado y en un momento libre; no llamar a `_updateSapidaePortraitNow()` desde un clic.
3. Todo renderer nuevo usa `debug.checkShaderErrors = false`.
4. Una URL que va dentro de una variable CSS (`--art:url(…)`) se escribe absoluta.
5. Las grabaciones opcionales solo se piden si están en `assets/sounds/sfx/manifest.json`. Al añadir o quitar una, actualizar la lista y subir `ASSET_VERSION`.
6. Un panel que muestra el vínculo se suscribe a `BondService.onChange`; no basta con el oyente del equipo.
7. Ningún texto visible escrito a mano: los carteles (`promptText`) usan `i18n.t`, mejor leído al mostrarse (getter).

## Copias de seguridad

`backups/2026-11-07_hito140/` (código, `docs/README.md` y `PROJECT_CONTEXT.md` originales); los de la parte B, en `backups/2026-11-07_hito140/b_404/`; los de la parte C, en `backups/2026-11-07_hito140/c_vinculo_forja/`.
