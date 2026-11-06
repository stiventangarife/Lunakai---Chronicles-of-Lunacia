# Hito 131 · Selector de aventura: escenario con el personaje en 3D

La pantalla «Elige tu aventura» pasa de tres tarjetas iguales a un **escenario** con la aventura elegida (inspirado en los selectores de Alerith, Dofus y los MMO coreanos) y una **lista de ranuras** al lado. Además, el mundo deja de dibujarse detrás de la pantalla de título.

## Fase 0 · El mundo no se dibuja detrás del título

Al volver al título desde una partida, `gameState` seguía en `OVERWORLD` y el bucle de `main.js` actualizaba y dibujaba el mundo a pantalla completa detrás de la pantalla de título, que lo tapa entero. Ahora `_animate()` no hace nada mientras `startScreen.isOpen` (título, lista de ranuras y creador). La partida vuelve a dibujarse al empezar (`_launchGameWithSlot` pone `isOpen = false` antes de `onStartAdventure`). También deja de correr la regeneración de vida (y su guardado) mientras se está en el título.

## Fase A · Nuevo diseño

| Antes | Ahora |
|---|---|
| Tres tarjetas iguales; el personaje en un medallón de ~90 px. | **Escenario** grande con el personaje sobre un pedestal y el fondo de su zona (`_biomeOf`). Flechas ‹ › a los lados. |
| «Continuar» abajo a la derecha, lejos de la ranura. | Botón **Jugar / Crear aventura** en la placa del escenario, junto al nombre. |
| «XP Nv 15». | «NIVEL 15» (encabezado) y «Nv 15» en la lista. |
| «Axie #11655 #11655». | El número solo se añade si el nombre no lo lleva («Axie #11655», «Shinji #10455»). |
| Nombre de la clase siempre en español. | `heroes.class.<id>.name` (español / inglés). |
| — | **Lista de ranuras**: retrato (cabeza), nombre, nivel · clase, cuándo se jugó, «Última partida» y menú ⋯ (Jugar / Eliminar). Ranuras vacías: «Nueva aventura». Contador «2 de 3». |

- Teclado: ← → cambian de ranura en cualquier parte; ↑ ↓ también en la lista; Intro juega. Doble clic en una fila juega.
- Los nombres de las partidas se escapan (`esc`).
- Sin saltos de diseño: el escenario tiene alto fijo (`clamp(21rem, 100vh − 15.5rem, 40rem)`); al cambiar de ranura solo cambia su contenido (entrada suave, sin animación con «reducir movimiento»).
- Clases nuevas `lk-advstage*` y `lk-srow*` (el sistema de diseño ya tiene un componente `.lk-stage`, que no se toca). CSS: bloque «Hito 131» al final de `lunakai-ui.css`.

## Fase B · Personaje 3D (SlotStagePreview)

`src/rpg/ui/SlotStagePreview.js` reutiliza `CharacterPreviewDiorama` (la escena del creador y de la Mochila) con el Sapidae de la ranura (personalización + equipo) y su Axie principal. Mientras carga se ve el retrato; el 3D aparece encima con un fundido cuando sus shaders están compilados. Se puede girar arrastrando.

**Presupuesto de rendimiento**
- **Un solo visor**: se crea al ver la lista y se libera (contexto WebGL, modelos) al abrir el creador, cerrar sesión, vincular cuenta o empezar a jugar. Se vuelve a montar al cerrar el creador o al volver al título.
- **Solo la ranura elegida.** En una ranura vacía el bucle se para.
- **30 fps** como máximo y resolución **×1,25** como máximo. El navegador lo pausa con la pestaña oculta.
- **Sin pasada de sombras** (Hito 113): solo la sombra de contacto.
- **Precompilado**: los modelos se mantienen ocultos hasta que `warmupRender` termina (el primer dibujo de un material nuevo compila de forma síncrona y congela la pantalla).
- **Modelos compartidos**: el GLB sale de `ModelCache`, la misma copia que ya carga el retrato de la ranura y luego el mundo; no se descarga ni se decodifica otra vez.
- **Equipos con poca memoria** (`navigator.deviceMemory < 4`) o `window.lkNoStage3d = true`: solo el retrato.

**Medido** (Chromium con SwiftShader, 1366×768):

| | Ema (Lunara) | Kai (Stiven) |
|---|---|---|
| GLB | 10,2 MB (41 imágenes, 172 MB decodificadas) | 8,9 MB (37 imágenes, 160 MB) |
| Texturas subidas a la gráfica del visor | 22 · ~114 MB | 20 · ~108 MB |
| Dibujado | 9 440 triángulos · 16 llamadas | 10 328 triángulos · 15 llamadas |
| Lienzo | 706×262 a ×1 (×1,25 en pantallas de alta densidad) | |
| Programas de shader | 5 | |

- Las variantes ocultas del Sapidae (otros peinados, ojos…) no se suben: el controlador las marca con `lkNoPrewarm`.
- Como solo hay dos modelos de jugador, el máximo en la gráfica es ~220 MB si se alterna entre una ranura de Ema y otra de Kai. Todo se libera al empezar a jugar.
- 12 cambios seguidos entre ranuras: el número de texturas y geometrías no crece (sin fugas).
- Con gráfica por software: primer 3D en ~1,7–2,4 s, cambio de ranura en ~0,9 s. Con una gráfica real es bastante menos; para medirlo en el juego: `lkDebug.perf` y `lkDebug.gpu()`.

## Archivos

- `src/main.js` — Fase 0 (`_animate`).
- `src/rpg/ui/StartScreenUI.js` — nuevo marcado de la vista de selección, `refreshSlots` (lista), `_renderStage` (escenario), `_moveSlot`, `_className`, `_slotAxie`, `_stage3dShow` / `_stage3dDispose`; `closeHeroSelect({ restoreStage })`.
- `src/rpg/ui/SlotStagePreview.js` (nuevo) — visor 3D del escenario.
- `src/ui/lunakai-ui.css` — bloque «Hito 131».
- `src/i18n/{es,en}/start.js` — `start.stageAria`, `prevSlot`, `nextSlot`, `slotsUsed`, `newAdventureShort`, `levelShort`, `level`, `withAxie`, `rotateHint`. (`start.xpLevel`, `start.summary` y `start.freeSlot` quedan sin uso.)

## Pendiente (Fase C, opcional)

Isla o pedestal propio por bioma (bosque, sabana, ártico) y un panel «Tu partida» (misión actual, tiempo jugado) en el hueco bajo la lista.
