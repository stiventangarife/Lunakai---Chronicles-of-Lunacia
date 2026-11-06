# Hito 128: Ajustes del Koliseo, las runas, la Forja y la apariencia

> **Estado:** terminado el 5-nov-2026 (v0.5.0). Plan: `docs/PLAN_AJUSTES_KOLISEO_RUNAS_FORJA_APARIENCIA.md`.
> Sin cambios en el servidor ni en el árbitro PvP.

## 1. Koliseo: punto de «Nuevo» y recorrido de la primera apertura

- **Punto dorado** en el botón K desde la graduación hasta terminar el recorrido.
  - Va en `TutorialDirector._updateHUDButtonsState` (`flags.koliseoTour`).
  - El CSS del punto es común a todos los botones del HUD: `.lk-ow-menu .lk-btn-circle-icon.lk-has-new`. Lo usan el Escuadrón, el Koliseo y el Códice.
- **Recorrido de 3 tarjetas**, cada una resaltando su pestaña: Arena PvP, Desafío de la Bruma y Clasificación. La última lleva al Códice.
  - Lo lanza `koliseoPanel.onOpen` (`_maybeKoliseoTour`).
  - Si se cierra el panel a mitad, se repite. «Saltar» o terminar lo marcan como visto.
  - Las partidas ya graduadas lo ven una vez.
- **Componente común:** `rpg/ui/PanelTour.js` (`startPanelTour(owner, { steps, ns, codex, onDone })`).
  - `SquadTour.js` pasa a ser una configuración de 3 pasos sobre él.
  - `KoliseoPanel.startTour()` / `tourActive`.
  - Arreglos de paso: la tarjeta se salía por la derecha en la última pestaña (faltaba `box-sizing: border-box`) y el botón principal tenía el relleno torcido.
- **Textos:** `tutorialDirector.koliseoTour.*` en español e inglés.

## 2. Etiqueta «Nuevo» de runas y charms

- **Causa:** el estilo en línea `font: 700 .62rem/1.4 inherit` no es válido (`inherit` no cabe dentro del atajo `font`). El navegador descartaba la regla entera y la etiqueta heredaba el tamaño grande del contenedor.
- **Arreglo:** ahora es la clase `.lk-rc-new` (10 px) en `lunakai-ui.css`.

## 3. Forja: la ficha del material ya no se queda encima de «Acelerar»

- **Causa:**
  1. Al abrir la Forja con el ratón sobre un material, su ficha (`.lk-mat-tip`) se abría.
  2. Enseguida el tutorial ponía su velo encima, así que el `mouseout` nunca llegaba y la ficha no se cerraba.
  3. Encima del hueco de la guía, tapaba el botón «×4».
- **Arreglo:**
  - La ficha se cierra al abrir la Forja, al repintar, con cualquier clic y al salir el ratón de la ventana.
  - `forgeModal.hideTip()`.
  - `TutorialDirector._spotlightOn` cierra las fichas abiertas (`.lk-mat-tip`, `.lk-tt-item`) cada vez que pone la guía.
  - `.lk-mat-tip` y `.lk-tt-item` tienen `pointer-events: none`; la ficha fijada de la Mochila sigue siendo pulsable.

## 4. Apariencia sin «Ema» ni «Kai»

- El selector de base muestra solo «Femenino» / «Masculino» (`StartScreenUI._ccRenderLookV2`).
- Las descripciones de peinados son neutras («Melena corta y ondulada», «Pelo alborotado», «Coletas con lazos»), en español e inglés.
- Los nombres internos (`Sapidae_Ema.glb`, `PIECE_SETS`, guardado) no cambian, y la Herbolaria Ema sigue igual.

## Pruebas

- **Node (20 comprobaciones):**
  - el Escuadrón sigue igual;
  - recorrido del Koliseo: pendiente en partidas antiguas, se lanza al abrir, se repite si se corta, no se repite al terminar y no sale durante el entrenamiento.
- **Chrome sin interfaz:**
  - la etiqueta «Nuevo» mide 10 px dentro de un contenedor de 42 px;
  - las 3 tarjetas del Koliseo caben en pantalla.
- **Pendiente en el juego:**
  - abrir la Forja en el paso «Acelerar» con el ratón sobre un material;
  - graduarse y abrir K;
  - ver el creador de personaje.

## Archivos

- **Nuevo:** `rpg/ui/PanelTour.js`.
- **Modificados:**
  - `rpg/ui/SquadTour.js`, `ui/KoliseoPanel.js`, `rpg/tutorial/TutorialDirector.js`
  - `ui/ForgePanel.js`, `ui/RunesCharmsPanel.js`, `rpg/ui/StartScreenUI.js`
  - `ui/lunakai-ui.css`, `ui/lunakai-tutorial.css`
  - `i18n/{es,en}/tutorialDirector.js`, `i18n/{es,en}/creator.js`
