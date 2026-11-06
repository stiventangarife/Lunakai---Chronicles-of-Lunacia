# Hito 134 · Selector de aventura: terreno cuadrado de casillas

La isla redonda del Hito 133 no terminaba de encajar. Ahora el personaje se para sobre **un trozo de tablero de combate flotante**: cuadrado y por casillas, como el juego táctico.

## Cómo es

- **Tablero de 5 × 4 casillas** (`T = 0,46`). Cada losa es como las de `BattleArena`: casilla al 96,5 %, damero claro/oscuro, losas de acento al azar estable, leve variación de tono y lateral de color. Las losas del borde quedan algo más bajas para que no parezca un bloque perfecto.
- **Colores exactos de la arena de combate del bioma**: se leen de `ARENA_THEMES[bioma].tiles` (`floor`, `side`, `accent`). Si se retoca una arena, el selector cambia con ella.
- **Bloque recto** de tierra y roca bajo el tablero (`terrain.soil` y `terrain.cliffShadow` de la misma arena), cada vez más oscuro hacia abajo hasta fundirse con la noche, y dos cubitos sueltos flotando.
  - Usa un material sin iluminación: la luz de relleno de la escena aclaraba las caras que miran abajo.
  - Los colores se oscurecen teniendo en cuenta que three.js trabaja en espacio lineal: ×0,3 lineal ≈ ×0,58 en pantalla.
- **Props** (los mismos del Hito 133) en las casillas de las columnas de los lados: árboles, cactus, cristales, setas, monolitos. Los personajes ocupan las centrales.
- Cámara a ~15° desde arriba (antes ~9°) para que se vea el damero.

## Rendimiento

- Las 20 losas son **una sola malla** (colores por vértice) y el bloque es otra: 2 llamadas de dibujo, más contornos y props. Sin texturas.
- Medido (bosque, 1366×768): el terreno con sus props tiene **878 triángulos** en 15 mallas (antes ~2 000 con la isla redonda). La escena completa tiene 11 196 triángulos en 46 llamadas de dibujo, y no se añade ninguna textura.

## Archivos

- `src/rpg/ui/SlotIsland.js` — reescrito: `buildBoard` (losas), `buildBlock` (`frustum` con degradado), props por casilla (`[archivo, columna, fila, alto, giro]`), `PROP_MATS`; se quitan la isla redonda y el anillo de Génesis.
- `src/rpg/ui/SlotStagePreview.js` — inclinación de la cámara 0,27 rad.
