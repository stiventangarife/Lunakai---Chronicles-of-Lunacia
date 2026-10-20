# Hito 36 — Fase 6 (VFX): Sapidae y Ultimates en combate, efectos más grandes

> **Estado:** completada (18-oct).
> **Plan:** pestaña «Fase 6 — VFX» del plan de implementación de habilidades.

## Qué cambia en el juego

| Antes | Ahora |
| --- | --- |
| Las habilidades del Sapidae y las Ultimates usaban los VFX antiguos | Las 24 habilidades del Sapidae y las 3 Ultimates de dúo reproducen sus efectos del motor |
| Algunos efectos mostraban los muñecos grises del laboratorio sobre el tablero | Los muñecos del laboratorio no se dibujan nunca en el juego |
| Los efectos se veían pequeños | Un 35 % más grandes; ajustable desde la consola |
| `o.dark` y `o.white` de los módulos no hacían nada en el juego | Oscurecen el tablero y dan un destello blanco, como en el laboratorio |

## Módulos nuevos (diseñados por el equipo)

| Módulo | Habilidades | Hechizos del juego |
| --- | --- | --- |
| `mod-sapidae-forjacubiles.js` | 6 | `craft_*` |
| `mod-sapidae-susurrador.js` | 6 | `shepard_*` |
| `mod-sapidae-lunalogista.js` | 6 | `lunalogist_*` |
| `mod-sapidae-astromante.js` | 6 | `stargazer_*` |
| `mod-duo-embestida.js` | `duo_embestida` | Ultimate `duo_destructiva` (Embestida Destructiva) |
| `mod-duo-gaia.js` | `duo_gaia` | Ultimate `duo_gaia` (Égida de Gaia) |
| `mod-duo-maelstrom.js` | `duo_maelstrom` | Ultimate `duo_maelstrom` (Maelstrom Celeste) |

- **Sapidae:** la clave de cada efecto es el id de su hechizo, así que el emparejamiento es directo.
- **Ultimates:** la única con nombre distinto es Embestida (`duo_embestida` ↔ `duo_destructiva`).
- **Disponibilidad:** los efectos del Sapidae y las Ultimates están siempre activos, no solo con `lkDebug.vfxAll(true)`.

## Cómo se integran (`src/vfx/VfxBridge.js`)

- **Emparejamiento:** `specialVfx(id)` traduce el hechizo a `[clave, módulo]`. `effectFor()` lo consulta antes que las cartas de partes.
- **Preparación de la Ultimate:**
  - se carga al empezar el combate y otra vez con el evento `ultimate:ready`;
  - motivo: solo se usa una vez por combate, y si no estuviera lista saldría con los VFX antiguos.
- **Variantes:**
  - **Esporas** usa la variante «cura» si la casilla tiene un aliado y «daño» si tiene un enemigo o está vacía.
  - **Los dúos** usan la variante «Completo» (`full`); sus piezas sueltas (`vfx_dest_*`, `vfx_gaia_*`, `vfx_mael_*`) quedan para el laboratorio.
- **Compañero:** en las cartas sobre un aliado y en las Ultimates, el muñeco aliado del laboratorio guía el movimiento visual de la unidad real:
  - en las cartas sobre un aliado, ese aliado;
  - en las Ultimates, el Axie principal.
- **Muñecos:**
  - **El problema:** algunos módulos encienden o apagan a mano los muñecos del laboratorio. Transposición enciende al lanzador y al aliado; Égida de Gaia apaga al objetivo. Por eso aparecían figuras grises en el tablero.
  - **La solución:** en cada fotograma, el puente lee qué muñecos quiere ocultar el módulo y luego los deja todos ocultos.
  - **Unidad real:** si el módulo oculta al lanzador, al objetivo o al aliado, se oculta esa unidad, y vuelve a verse al terminar el efecto.
- **`o.dark`:** oscurece el velo del tablero, como máximo un 90 %.
- **`o.white`:** destello blanco a pantalla completa, aplicado a la mitad (`WHITE_GAIN = 0.5`) porque el tablero ya es claro y el *bloom* suma luz.

## Tamaño de los efectos

- **Escala:** los efectos se ven un 35 % más grandes que a la altura exacta de un Axie (`VFX_SCALE_DEFAULT = 1.35`).
- **Distancia:** el lanzador y el objetivo siguen cayendo exactamente sobre las unidades; la deformación del pasillo absorbe la diferencia.
- **Cuerpo a cuerpo:** el tamaño lo limita el espacio entre las dos unidades. Por eso el pasillo mínimo baja del 22 % al 15 %.
- **Ajuste en vivo:** `lkDebug.vfxScale(1.6)` cambia la escala y se recuerda en el navegador. `lkDebug.vfxScale(null)` vuelve a 1,35 y `lkDebug.vfxScale()` muestra el valor actual.

## Verificación

- **En Node:** las 267 habilidades (240 anteriores + 27 nuevas) se construyen y se evalúan en todas sus variantes sin errores.
- **En el navegador, Sapidae:** las 24 habilidades se lanzaron en la arena de pruebas con captura en el instante del impacto. Todas usan su efecto nuevo, ningún muñeco es visible y no hay errores de JavaScript.
- **En el navegador, Ultimates:** las 3 se reprodujeron desde el Sapidae, con el Axie principal como compañero. Se capturaron antes del impacto, en el impacto y después.
- **Precisión:** a 1, 2, 3, 5 y 7 casillas, el impacto cae sobre el objetivo en las 24 cartas piloto (error 0,000) con la escala nueva.
- **Compilación:** los 267 efectos compilan (5.621 materiales con deformación) sin errores de shader.

## Pendiente

- **Enemigos extra en el tablero:** los efectos que usan enemigos extra del laboratorio (Little Owl, Floración lunar, Eclipse, Maelstrom…) siguen colocando esas piezas en la posición del laboratorio, no sobre las unidades reales (etapa 4).
- **Ultimates en la arena:** `lkDebug.probar` no lanza Ultimates, porque no están en la lista de hechizos de las unidades. Se prueban en combate real desde la ronda 2, con el vínculo al 100 %.
