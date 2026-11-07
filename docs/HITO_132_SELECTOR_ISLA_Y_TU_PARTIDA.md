# Hito 132 · Selector de aventura: isla por bioma y panel «Tu partida»

Fase C del rediseño del selector (Hito 131). Dos añadidos sin coste de gráfica.

## Isla flotante por bioma

El pedestal elíptico del escenario pasa a ser una **isla flotante** (estilo Dofus) bajo el personaje, con colores y adornos según la zona de la partida:

| Bioma (`_biomeKey`) | Superficie | Adornos |
|---|---|---|
| `forest` (por defecto) | hierba | matas y flores |
| `savannah` | arena | piedras |
| `arctic` | nieve | cristales de hielo y montículo |
| `mystic` | violeta | cristales que brillan |
| `volcanic` | roca oscura | grietas de lava |
| `none` (ranura vacía) | noche, con brillo dorado | — |

- Es un **SVG estático** dentro del escenario (`_isleSVG`, `.lk-advstage__isle`): sin animación ni WebGL, así que se ve igual con el retrato y con el 3D.
- La zona elige el bioma con las mismas reglas que el fondo (`_biomeOf` usa ahora `_biomeKey`). El escenario lleva `data-biome` y el CSS fija los colores (`--isle-*`).
- **Pies sobre la isla:** la superficie queda al 78 % del alto de la vista. El retrato se coloca con `inset: … 22%` y el 3D (`SlotStagePreview._fit`) deja más margen vertical (×1,35) y mira un 12 % por debajo del centro, de modo que los pies caen en la misma línea.

## Panel «Tu partida»

Bajo la lista de ranuras, para la partida elegida:

- **Misión actual**: la misión que sigue el jugador y su siguiente paso (o «Lista para entregar»). Los atajos del texto («[I]») se muestran como tecla. Se calcula con un `QuestManager` sin juego que solo lee `questProgress` (`_slotQuest`, en caché por ranura y fecha de guardado).
- **Escuadrón** n / 4 y **Desde** (fecha de creación de la partida).
- En una ranura vacía el panel no se muestra.
- **Tiempo jugado:** no se muestra porque el juego no lo guarda. Añadirlo exigiría tocar el guardado. **[Resuelto · revisión del 7-nov-2026: el usuario confirma que ya no ocurre.]**
- Pantallas bajas: a ≤ 740 px de alto el paso de la misión ocupa una línea y se oculta la pista de teclado; a ≤ 680 px el panel se oculta. La columna nunca es más alta que el escenario (`contain: size`).

## Otros

- Si el retrato de una ranura no carga (las partidas sin retrato guardado apuntan a `assets/portraits/<modelo>.png`, que no existe para Ema y Kai), la imagen se oculta en lugar de mostrar el icono de imagen rota. **[Resuelto · revisión del 7-nov-2026: el usuario confirma que ya no ocurre.]**

## Archivos

- `src/rpg/ui/StartScreenUI.js` — `_biomeKey`, `_isleSVG`, `_slotQuest`, `_renderSlotInfo`; `data-biome` en `_renderStage`.
- `src/rpg/ui/SlotStagePreview.js` — encuadre (`_fit`).
- `src/ui/lunakai-ui.css` — sin el pedestal elíptico; bloque «Hito 132».
- `src/i18n/{es,en}/start.js` — `start.infoTitle`, `infoQuest`, `infoQuestReady`, `infoNoQuest`, `infoSquad`, `infoSince`.
