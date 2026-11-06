# Hito 133 · Selector de aventura: cielo del título e islas 3D de cada bioma

Revisión del escenario del selector (Hitos 131–132). El fondo rosa plano y la isla dibujada en SVG no encajaban con los personajes en 3D. De las tres propuestas (A cielo nocturno, B diorama 3D, C foco de escenario), se eligió combinar el **cielo estrellado del título** con **islas parecidas a los terrenos del juego**.

## Fondo

- El escenario continúa la noche de la pantalla de título: degradado azul noche, estrellas, luz de luna detrás del personaje y montañas lejanas en silueta.
- Un brillo en el horizonte con el color de la isla (`--hz` por `data-biome`): bosque verde, sabana ámbar, ártico azul hielo, místico rosa, Génesis turquesa.
- Ya no se usa `--biome` (`_biomeOf` se eliminó).

## Islas 3D (`src/rpg/ui/SlotIsland.js`)

Isla flotante low-poly con el mismo sombreado toon y contorno que los personajes:

- **Base:** superficie con borde irregular, franja de tierra, roca inferior (cono deformado) y dos rocas sueltas. Es determinista: una zona siempre da la misma isla.
- **Colores reales del terreno** de cada isla, tomados de `BiomeThemeManager`, `ArcticIsland`, `MysticIsland` y `DungeonIsland`.
- **Props del propio juego** (`assets/<bioma>/*.glb`, 16–215 triángulos, sin texturas), recoloreados por nombre de material (`grass`, `dirt`, `leafsGreen`, `woodBark`, `colorRed`…). Las geometrías se comparten con `ModelCache` y no se liberan aquí.

| Bioma | Isla del juego | Superficie | Props |
|---|---|---|---|
| `forest` | Valle del Dojo (`zone_2_2`) | hierba | roble, árbol, arbusto, flores, roca |
| `savannah` | Sabana (`zone_3_2`) | arena | acacia de copa naranja, cactus, rocas |
| `arctic` | Ártico (`zone_2_1`) | nieve | cristales de hielo, piedras, arbusto escarchado |
| `mystic` | Mística (`zone_1_2`) | musgo verde azulado | amatistas, setas rosas, flor |
| `genesis` | Génesis (`zone_2_3`) | índigo | monolitos de runas, cristales aurora, anillo de runas |

- El bioma sale del `mapId` guardado (`canonicalZoneId`, así que las zonas antiguas van a su isla). Si no hay `mapId`, se usa el nombre.
- Las islas se construyen la primera vez que se ven y se guardan por bioma (como máximo 5). Se liberan con el visor.
- Antes de mostrarse se precompilan junto con los personajes (`warmupRender`).

## Encuadre

- La capa 3D cubre ahora **todo el escenario**. La isla cuelga entre el nombre y el botón, sin cortarse; la placa queda por encima y sus botones siguen recibiendo los clics.
- `SlotStagePreview._fit()`:
  - los pies quedan al 78 % del alto de la zona del personaje y la cabeza a partir del 12 % (`FEET_LINE`, `HEAD_LINE`);
  - la isla entera siempre cabe a lo ancho (`ISLAND_W`);
  - la cámara mira ~9° desde arriba para que se vea la superficie.
- Sapidae en x −0,42 y Axie en x +0,5, sobre la isla.
- Mientras carga el 3D (o en una ranura vacía) se ve el retrato sobre un **anillo de luz** dorado en la misma línea de los pies (`.lk-advstage__ring`).

## Rendimiento

| | Antes | Con isla |
|---|---|---|
| Triángulos | 9 440 | 11 430 (isla: ~2 000) |
| Llamadas de dibujo | 16 | 50 (la mitad, contorno) |
| Texturas nuevas | — | 0 |
| Programas de shader | 5 | 7 |
| Lienzo a 1366×768 | 706×262 | 772×520 (×1,25 como máximo) |

Con 12 cambios seguidos entre ranuras no crece nada: ni texturas ni geometrías.

## Otros

- El escenario compara con el último HTML escrito, no con el DOM: un retrato que falla se oculta y ya no se vuelve a crear en cada repintado (antes parpadeaba un recuadro).

## Archivos

- `src/rpg/ui/SlotIsland.js` (nuevo).
- `src/rpg/ui/SlotStagePreview.js` — `_useIsland`, nuevo `_fit`, `viewEl`, `show(data, { biome })`.
- `src/rpg/ui/StartScreenUI.js` — capa 3D a nivel del escenario, `_biomeKey` por isla (con Génesis), anillo, sin `_isleSVG` ni `_biomeOf`.
- `src/ui/lunakai-ui.css` — bloque «Hito 133»; se quitaron las reglas de la isla SVG del bloque «Hito 132».
