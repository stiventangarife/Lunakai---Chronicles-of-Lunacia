# Hito 139 · Carga del creador, farola del Dojo y Axies a distancia en el primer combate

> **Fecha:** 7-nov-2026 · **Estado:** hecho y probado en el navegador integrado con el servidor local (puerto 8082).
> **Copias de seguridad:** `backups/2026-11-07_hito139/` (todos los archivos tocados, tal como estaban).
> **Sin cambios en `assets/`:** no hace falta subir `ASSET_VERSION`. Sin cambios en las reglas del combate: no hace falta recompilar el árbitro ni los bots de la Arena.

## 1. Carga del Sapidae y el Axie en el creador de personaje

**Medición (primera apertura del creador en la sesión, local, RTX 4060):**

| | Antes | Después |
|---|---|---|
| Sapidae visible | 1,26 s | 0,98 s (ya compilado) |
| Axie visible | 2,85 s | 1,65 s (ya compilado) |
| Parón más largo | 577 ms (y otro de 433 ms) | 130 ms |
| En la ruta crítica | API `axie-data` (0,9 s) + manifiesto del mixer (8,7 MB) + GLB del Sapidae (10 MB) | Solo el GLB (en Hostinger sale de la caché tras la precarga) |

La segunda apertura ya era rápida (0,13 s / 0,49 s): el problema era la primera de cada sesión. En Hostinger a ~10 Mbps esos ~20 MB eran más de 15 s.

**Cambios:**
- `rpg/AxieMixerService.js`
  - `loadAxieHero`: las partes de la API (`_apiPartsFor`) se piden **a la vez** que se prepara el mixer, no después.
  - `_apiPartsFor`: guarda las partes en `sessionStorage` (`lk_axparts_v1_<id>`): al recargar no se vuelve a esperar a la API.
  - `getMixer`: una sola creación aunque lo pidan dos a la vez (`_mixerPromise`).
  - Nuevo `prewarm({ renderer, axieIds })`: prepara el mixer (manifiesto) y las partes de la API; no crea modelos ni sube nada a la GPU.
- `rpg/ui/StartScreenUI.js`
  - `_schedulePrewarmCreator()`: con el navegador ocioso en el título (`requestIdleCallback`), una vez por sesión y solo si hay una ranura libre: descarga a la caché HTTP el GLB del Sapidae por defecto (sin decodificarlo), prepara el mixer con el renderer del juego (`game.sceneManager.renderer`, que vive toda la sesión) y pide las partes de los dos Axies iniciales. Se llama desde `refreshSlots`.
  - `_cc3d(kind, load)`: el Sapidae y el Axie del creador quedan ocultos mientras llegan y se compilan (`warmupObjects` de `render/RenderWarmup.js`) y solo entonces se ven. Cada tipo lleva su número: con cambios rápidos (Ema ↔ Kai, cambio de Axie) solo cuenta la última petición. Lo usan la apertura, el cambio de base y el cambio de compañero. Si el Sapidae pedido es el que ya está, solo cambia su aspecto (sin ocultarlo).
  - Luna de carga (`lk-moon-spin`) en el escenario mientras haya algo pendiente (`data-ref="ccLoading"`, `_ccLoadingUi`).
- `ui/lunakai-ui.css`: bloque «Hito 139» al final (posición de la luna; sin animación con «Reducir movimiento»).

**No se tocó:** `CharacterPreviewDiorama` (sigue cerrando su contexto con `forceContextLoss`, Hito 135), `SlotStagePreview` y el teñido del Sapidae (la segunda apertura mostró que no pesa: la fase 4 del plan no hizo falta).

**Pruebas:** 5 cambios Ema ↔ Kai seguidos y 3 cambios de Axie: un solo Sapidae (el pedido), Axie visible, luna apagada, sin errores en la consola.

## 2. Farola que tapaba al jugador al empezar

`lamp_6` (`rpg/world/ForestVillageLayout.js`) estaba en (−43.3, −20.2), justo entre la cámara y `PALADILL_GREET_SPOT` (−40.8, −16.0), donde aparece el jugador tras la cinemática. Pasa a **(−92.7, 15.8)**, lado A de la calle, hacia el altar de Atia (posición elegida por el usuario).

Comprobado en el juego: ninguna farola queda a menos de 10 m de la línea cámara → jugador al empezar (antes, menos de 1 m), y la nueva está apoyada en el suelo como las demás. Colisión, suelo y sombras los pone `ForestVillage` como siempre.

## 3. Primer combate del tutorial con Axies que atacan a distancia

**Antes:** `tutorialCardOrder` (`main.js`) solo aceptaba para la ranura [1] un ataque desbloqueado que alcanzara a 1 casilla. Si el Axie solo tenía ataques a distancia (AL mínimo ≥ 2), devolvía `null` y el Axie jugaba el tutorial con los hechizos de Shinji (`kotaro_*`). Pasaba, por ejemplo, con **Early Bird**, uno de los dos Axies del creador (Early Bird y Little Owl, AL 2–4). A nivel 1 hay 12 cartas de ataque así (casi todas de Bird, más Foxy de Beast y Toothless Bite de Reptile).

**Ahora:**
- `tutorialCardOrder`: con un ataque cuerpo a cuerpo, igual que siempre. Si no, va en la [1] el mejor ataque a distancia (de un solo objetivo primero, para no dañar al Sapidae; luego el AL mínimo más corto y el más barato). Los hechizos de Shinji quedan solo si el Axie no tiene ningún ataque desbloqueado.
- `TutorialManager._resolveCells` (paso `step_move_2`): con la carta real de la ranura [1] calcula desde qué casillas le llega al Slime, con las reglas de `SpellRules.getValidTargetCells` (AL mínimo y máximo con modificadores, línea recta y línea de visión, que solo cortan los obstáculos). Si ya le llega, se salta el paso de moverse; si no, marca la casilla a tiro más cercana; si ninguna está a su alcance, movimiento libre (como antes). Con un ataque cuerpo a cuerpo el comportamiento es el de siempre (pegado al Slime, con preferencia por (3, 6)).
- Textos nuevos `tutorialCombat.step.move2Range.title/text` en `i18n/es` y `i18n/en`.

**Pruebas en el juego (Early Bird):** carta [1] = `part_bird_ears_early_bird`; el Axie empieza en (3, 4), a 3 casillas del Slime, así que pasa directo a elegir la carta; el Slime está en su alcance y la carta lo remata. Casos simulados con `_resolveCells`:

| Caso | Resultado |
|---|---|
| A distancia, pegado al Slime (3, 6) | casilla (2, 6), a 2 del Slime |
| A distancia, lejos (1, 8), (8, 8), (2, 9), (7, 9) | casilla a tiro más cercana (a 4 del Slime) |
| A distancia, sin casilla a tiro con sus PM (1, 1) | movimiento libre (12 casillas) |
| Cuerpo a cuerpo desde (3, 4) | (3, 6), como antes |
| Cuerpo a cuerpo ya al lado | se salta el paso, como antes |

## Archivos

`src/rpg/AxieMixerService.js`, `src/rpg/ui/StartScreenUI.js`, `src/ui/lunakai-ui.css`, `src/rpg/world/ForestVillageLayout.js`, `src/main.js` (`tutorialCardOrder`), `src/tactics/TutorialManager.js` (`_resolveCells`), `src/i18n/{es,en}/tutorialCombat.js`.
