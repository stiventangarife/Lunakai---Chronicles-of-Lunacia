# Hito 37 — Dither fading en los tableros de combate y tutorial en el Claro de Arces

> **Estado:** completado en la versión de prueba (18-oct-2026).
> **Pedido:** que la ambientación y los objetos no tapen la vista del jugador durante el combate, solo en los tableros tácticos; el tutorial pasa a uno de los tableros nuevos (Claro de Arces) y usa también el dither.

## Qué se ve en el juego

- **Lo que tapa algo importante se disuelve.** Un árbol, una roca, un cactus, un cristal, un pilar o una pared del cañón que quede entre la cámara y una unidad se disuelve con un tramado de pantalla. Lo mismo pasa con lo que tape la casilla bajo el ratón.
  - Funciona desde cualquier ángulo de la cámara (360°) y con cualquier zoom.
  - Al girar la cámara, al mover el ratón o al caminar una unidad, se disuelve y vuelve suavemente, en ~0,25 s.
- **Los obstáculos del tablero se siguen leyendo.** Nunca bajan del **35 % visible**: se nota que siguen ahí y que bloquean el paso y la visión. La decoración de fuera del tablero puede bajar hasta el **8 %**.
- **Las sombras no cambian.** Un árbol disuelto sigue proyectando su sombra.
- **No se disuelve nunca:** losas, agua, marcas de movimiento y alcance, unidades, VFX ni textos.
- **Tutorial:** se juega en el **Claro de Arces** (`forest_maple_glade`) con su escenario del Bosque y su dither, en lugar del Dojo de siempre.
  - El mapa también es de 10×10.
  - Todas las casillas del guion están libres y a la misma distancia que antes: (4,3), (3,4), (4,5), (4,6), (3,6), (3,7) y (4,7). Los pasos, flechas y textos no cambian.
  - Los postes de entrenamiento del Dojo se sustituyen por las rocas del claro, que no están en el camino del guion (desde el 18-oct el tablero ya no tiene árboles: ver Hito 35).
- **La campaña antigua y la arena de pruebas** (`lkDebug.arena()`) siguen en el 10×10 de siempre, sin escenario de bioma.

## Cómo funciona (`src/tactics/arena/ArenaOcclusionDither.js`)

1. **Puntos que no se deben tapar:** `main._occlusionPoints()` los da en cada fotograma del combate.
   - Cada unidad viva, a la altura del pecho, con radio 0,95 m. La unidad activa usa 1,25 m. Las unidades grandes (jefes) escalan radio y altura con su tamaño.
   - La casilla bajo el ratón, con radio 0,85 m.
   - Hasta 12 puntos.
2. **Por píxel:** cada material del escenario comprueba si el píxel está entre la cámara y algún punto, dentro de un cilindro alrededor de la línea cámara → punto. Si lo está, se descarta con el tramado IGN. La fuerza crece hasta el mínimo que corresponde:
   - 35 % visible si el píxel está sobre una casilla del tablero, según una máscara del mapa;
   - 8 % visible en el resto.
3. **Solo el escenario de combate:** `patchArenaGroup()` parchea los materiales que crea `BattleArena`. Son el follaje y los troncos de los árboles, las rocas, los cactus y hongos, los cristales, los pilares y pedestales, la vegetación y el terreno; el terreno solo por encima del tablero, para no agujerear el suelo.
   - Se encadena con los `onBeforeCompile` existentes y cambia su clave de caché, así que el mundo abierto no se toca.
   - Las losas y el agua no se parchean.
4. **La franja que ya disolvía los árboles de delante del tablero** (Hito 35) sigue, pero más suave (hasta el 40 %). El trabajo fino lo hace el dither por unidad.

| Archivo | Cambio |
| --- | --- |
| `src/tactics/arena/ArenaOcclusionDither.js` | Nuevo: uniformes compartidos, parche de materiales y suavizado de los puntos. |
| `src/tactics/arena/BattleArena.js` | Parchea el escenario al construirlo; `onActivate()` pone la máscara del tablero; `update()` recibe los puntos. |
| `src/tactics/SceneManager.js` | `occlusionProvider` (lo rellena main) y aviso `onActivate` al poner un escenario. |
| `src/main.js` | `_occlusionPoints()` y el comando de consola `lkDebug.dither`. |
| `src/tactics/LevelsDatabase.js` | Nivel 1 (tutorial): `battleMapId: 'forest_maple_glade'`. |
| `battle_maps_preview.html` | Las unidades de referencia activan el dither; `?dither=0` para comparar. |

## Consola (F12)

| Comando | Qué hace |
| --- | --- |
| `lkDebug.dither(false)` / `lkDebug.dither(true)` | Apaga / enciende el dither fading |
| `lkDebug.dither({ radius: 1.1, activeRadius: 1.4 })` | Ajusta los radios (también `hoverRadius`, `height`, `fadeSpeed`) |

## Pruebas

- **Cuánto se ve de cada unidad** en los 15 mapas (medido antes de quitar los árboles del tablero el 18-oct; ahora hay menos cosas que tapen): 4 colocaciones (las salidas y 3 al azar) × 8 ángulos de cámara, unas 240 medidas por mapa. Se mide en píxeles qué parte de la unidad queda a la vista.

  | Mapa | Peor caso sin → con dither | Media sin → con | Medidas con menos del 85 % visible, sin → con |
  | --- | --- | --- | --- |
  | Claro de Arces (tutorial) | 0 → 0,64 | 0,83 → 0,95 | 25,4 % → 12,9 % |
  | Vado del Río | 0 → 0,64 | 0,82 → 0,95 | 29,6 % → 14,6 % |
  | Raíces del Gran Árbol | 0 → 0,63 | 0,79 → 0,94 | 33,9 % → 17,3 % |
  | Meseta Dorada | 0 → 0,64 | 0,81 → 0,95 | 31,5 % → 14,5 % |
  | Oasis Escondido | 0 → 0,63 | 0,81 → 0,94 | 29,2 % → 17,9 % |
  | Cañón de Arenisca | 0 → 0,67 | 0,53 → 0,95 | 56,9 % → 3,0 % |
  | Lago Helado | 0 → 0,62 | 0,92 → 0,98 | 13,8 % → 5,0 % |
  | Paso Glaciar | 0 → 0,61 | 0,76 → 0,96 | 39,6 % → 8,8 % |
  | Campamento Boreal | 0 → 0,61 | 0,87 → 0,97 | 19,6 % → 6,3 % |
  | Pantano Luminoso | 0 → 0,63 | 0,87 → 0,97 | 20,4 % → 7,1 % |
  | Islas de Cristal | 0 → 0,66 | 0,93 → 0,98 | 11,3 % → 5,6 % |
  | Círculo Arcano | 0,26 → 0,75 | 0,93 → 0,99 | 12,5 % → 2,4 % |
  | Jardín Real | 0 → 0,64 | 0,92 → 0,99 | 14,1 % → 7,3 % |
  | Puerta del Santuario | 0 → 0,64 | 0,89 → 0,99 | 20,8 % → 10,4 % |
  | Santuario del Origen | 0 → 0,63 | 0,91 → 0,99 | 17,6 % → 8,2 % |

  - Sin dither, en todos los mapas menos uno hay ángulos en los que una unidad queda **totalmente tapada**. Con dither, ninguna unidad baja del 61 % visible.
  - Lo que queda por debajo del 85 % son unidades detrás de un obstáculo del tablero, que se queda en el 35 % acordado. Con los dos mínimos en 0, solo quedaba tapado un ~1 %: el radio del cilindro basta.
- **Capturas de antes y después** en Raíces del Gran Árbol, Cañón de Arenisca y Paso Glaciar.
- **Tutorial en el Claro de Arces:** todas las casillas del guion son caminables, y las distancias del Sapidae y de Kotaro a sus casillas son las mismas que en el Dojo.
- **10×10 de siempre:** la imagen es idéntica píxel a píxel a la anterior (Llanuras, Dojo y arena de jefe), porque sin escenario no hay dither.
## Pendiente

- Probarlo en partidas reales con los modelos de los Axies, para ajustar los radios si hace falta (`lkDebug.dither({...})`).
