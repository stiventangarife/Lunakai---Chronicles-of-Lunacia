# Hito 126: Escuadrón tras la graduación y Códice de Lunacia

> **Estado:** terminado el 5-nov-2026 (v0.5.0).
> Plan: `docs/PLAN_CODEX_Y_ESCUADRON.md` (fases C0–C5).
> Pruebas en Node y en Chrome sin interfaz (ver «Pruebas»). Falta la prueba completa dentro del juego.

Dos cambios pensados para los calificadores: poder probar el Escuadrón (y cargar sus Axies de Sky Mavis) sin esperar a la misión de Bing, y un libro que explica todo el bucle del juego.

## 1. Escuadrón desbloqueado al graduarse (C0)

- **Antes:** el Escuadrón (tecla **T**) se abría al reclutar a Bing (Hito 75).
- **Ahora:** se abre al graduarse o con «Saltar tutorial» (`TutorialDirector.isFeatureUnlocked('squad')` → `done || _squadReady()`). Mientras falte el recorrido, el botón lleva un punto dorado de «Nuevo».
- **Recorrido de la primera apertura** (`rpg/ui/SquadTour.js`): 3 tarjetas sobre el panel, con «Siguiente» y «Saltar», sin bloquear el panel:
  1. Líder, Principal y Apoyo.
  2. La colección.
  3. «Cargar mis Axies», con un texto para quien tiene cuenta y otro para quien juega como invitado (que puede usar «Cargar por ID»).

  Si se cierra el panel a mitad, el recorrido se repite la próxima vez. El botón **«?»** de la cabecera lo repite cuando se quiera, y su última tarjeta lleva al capítulo del Códice.
- **Paso de Bing:** al reclutarlo queda solo «abre el Escuadrón y ponlo en apoyo» (2 pasos). Al terminar sale el aviso «Bing ya viaja contigo».
- **Guardado:**
  - `flags.squadTour` (`pending` / `done`) guarda el recorrido.
  - `flags.squadIntro` (`waiting` / `open` / `place` / `done`) guarda el paso de Bing.
- **Partidas antiguas:**
  - con `squadIntro = done`, no ven nada nuevo;
  - con `load`, se quedan con el recorrido pendiente y el paso de Bing terminado;
  - con `open` o `place`, siguen en ese paso.

## 2. Códice de Lunacia (C1–C3)

Se abre con la **tecla C** o con el botón del HUD que hay junto a la Crónica. Se desbloquea al graduarse. Es un libro de marfil: carril de 12 capítulos y una doble página (ilustración + texto corto, consejo y botón que lleva al sitio del juego).

| # | Capítulo | Páginas |
|---|---|---|
| 0 | El bucle de Lunacia | presentación · diagrama del ciclo · cómo es un combate |
| 1 | Equipamiento | 5 ranuras · de T0 a T3 |
| 2 | Escuadrón | puestos · ventaja de clase (diagrama, +15 %) · Axies de Sky Mavis |
| 3 | Economía | oro y Tienda · las cuatro monedas (diagrama) · Mercado |
| 4 | Forja | crear y evolucionar · recolectar · esperar, acelerar y recoger |
| 5 | Runas y charms | cómo funcionan · dónde conseguirlas |
| 6 | Koliseo · Arena | duelos · puntos, temporadas y premios |
| 7 | Desafío de la Bruma | reglas · clasificación y premios |
| 8 | Bestiario | presentación + **18 fichas generadas** (silueta «???» hasta vencer a la quimera) |
| 9 | Habilidades de los Axies | de dónde salen · **las cartas de tu Axie principal** (generada) |
| 10 | Sapidae y Ultimate | clases · **tu clase y sus 6 hechizos** · **las tres Ultimate** (la tuya marcada) · el vínculo |
| 11 | Terrenos | casillas · línea de visión y alcance |

- **Páginas generadas** (`rpg/codex/CodexGenerated.js`): leen `ENEMY_ARCHETYPES`, `BIOME_SPAWN_POOLS`, `BIOME_TIER_CONFIG`, `SPELLS_DB`, `MATERIALS`, `SAPIDAE_CLASSES` y `ULTIMATES`. La vida y el escudo de cada quimera salen ya con los valores de su bioma. Cuando cambia una regla, el Códice cambia solo.
- **Bestiario:**
  - **Cuándo se desvela una ficha:** al ganar un combate, `main.js` (`onVictory`) llama a `codexModal.recordBeasts(types)`. Los duelos no cuentan y la Arena tampoco, porque tiene su propia pantalla de fin.
  - **Fichas sin descubrir:** no cuentan como «sin leer».
  - **Fichas nuevas:** recuperan el sello «Nuevo».
- **Diagramas en SVG** (`rpg/codex/CodexArt.js`): bucle, triángulo de clases y monedas. Usan los iconos del juego y los textos de i18n. La leyenda de casillas se quitó a petición del usuario; Terrenos usa capturas.
- **Ilustraciones:** `assets/ui/codex/*.webp`, capturas del usuario pasadas a WebP (unos 1,1 MB en total). Solo se carga la de la página abierta.
- **Botones «?»:**
  - En la Tienda, la Forja y el Koliseo (`data-codex="capítulo"`). En el Koliseo, la pestaña de la Bruma lleva al capítulo de la Bruma.
  - El Códice se abre por encima del panel (`z-index` 1550); al cerrarlo, se vuelve al panel.
  - Cualquier botón nuevo con `data-codex` funciona sin más código.
- **Progreso:** `slot.codexProgress = { v: 1, seen: ['capítulo/página'], beasts: { id: victorias } }` (`main._saveCurrentProgress`, `SaveSlotManager`). Se guarda al leer una página nueva o desvelar una quimera. Las partidas sin el campo empiezan con todo sin leer.
- **Textos:** `i18n/{es,en}/codex.js` (173 claves). El estilo de teclas (`kbd`) es propio del papel, porque el global ponía el texto en marfil y no se veía.

## Archivos

- **Nuevos:**
  - `rpg/ui/SquadTour.js`, `rpg/ui/CodexModal.js`
  - `rpg/codex/CodexData.js`, `rpg/codex/CodexArt.js`, `rpg/codex/CodexGenerated.js`
  - `i18n/{es,en}/codex.js`
  - `assets/ui/icons/codex.png`, `assets/ui/codex/*.webp`
- **Modificados:**
  - `rpg/tutorial/TutorialDirector.js`, `rpg/ui/SquadModal.js`, `rpg/OverworldManager.js`
  - `main.js`, `rpg/SaveSlotManager.js`
  - `ui/ShopPanel.js`, `ui/ForgePanel.js`, `ui/KoliseoPanel.js`
  - `ui/lunakai-ui.css`, `ui/lunakai-tutorial.css`
  - `i18n/{es,en}/index.js`, `tutorialDirector.js`, `squad.js`, `overworld.js`, `tutorialScript.js`

Sin cambios en el servidor ni en el árbitro PvP.

## Pruebas

- **Escuadrón (Node, 13 comprobaciones):**
  - desbloqueo al graduarse y bloqueo durante el entrenamiento;
  - el recorrido no se repite y, si se corta, se repite;
  - el paso de Bing y su aviso único;
  - las tres migraciones de partidas antiguas.
- **Códice (Chrome sin interfaz, 1440×900 y 820×1000, en español e inglés):**
  - las 51 páginas tienen título y texto traducidos;
  - recuento de «sin leer»;
  - `recordBeasts` ignora lo que no es quimera;
  - silueta y ficha desvelada;
  - guardar y cargar;
  - páginas generadas sin partida;
  - la ventana cabe en las dos pantallas.
- **Pendiente en el juego:**
  - graduarse, abrir T, saltar el recorrido y repetirlo con «?»;
  - reclutar a Bing;
  - abrir el Códice con C;
  - ganar un combate y ver la ficha;
  - recargar con la ranura guardada.

## Pendiente

- La captura `15_tablero_terrenos` ya no hace falta.
- Cuando haya arte de las Ultimate (hoy `icon: '✦'`), se puede añadir a su página.
