# Hito 141 · Colisión de la cámara del mundo

**Fecha:** 7-nov-2026 · **Archivos:** `src/rpg/OverworldCamera.js`, `src/rpg/CameraOcclusion.js` · Sin cambios en `assets/`.

## Qué se pidió

1. Distancia mínima de 1,5–2 m desde el personaje. Si la cámara tendría que acercarse más, sube y gira por encima.
2. Detectar el choque con una esfera en vez de un rayo, para que no se cuele por esquinas ni rendijas.
3. Acercarse rápido y alejarse despacio, con ~0,3 s de retraso al volver, para que no «bombee» junto a una pared.

## Qué había (Hitos 74, 79 y 136) y qué fallaba

| Punto | Antes | Fallo |
|---|---|---|
| Mínimo y subida | Mínimo 1,6 m. Subía (+20°, +40°, +60°) solo si el obstáculo estaba antes del 60 % del brazo y el ángulo dejaba libre el 85 %. | Con el personaje junto a una pared alta (la Forja, 8,8 m) ningún ángulo dejaba el 85 % libre: no subía y el mínimo de 1,6 m metía la cámara **dentro del edificio**. |
| Esfera | Cajas agrandadas 0,2 m; terreno en 12 puntos sueltos; excepción «si el choque está al final del brazo, no te acerques» (Hito 79). | Rayo grueso de 0,2 m, menos que lo que ocupa el plano cercano de la cámara; rendijas de más de 0,4 m; salientes del terreno entre muestras; `inside()` solo miraba la celda del centro; el ajuste al suelo podía dejar la cámara en una caja. |
| Suavizado | Distancia: rápido / 0,3 s / despacio. | La subida volvía sin esperar; la excepción de las esquinas cambiaba de idea de un fotograma a otro. |

## Cambios

**`CameraOcclusion.js`**

- `cast(a, b, pad)`: el terreno es una esfera de radio `pad` (mín. 0,3 m), con una muestra cada ~0,75 m (12–48) y, en los últimos 2 m, un anillo de 3 puntos a `pad` de la línea (a los lados y por detrás).
- `inside(p, pad)`: mira todas las celdas de la rejilla que toca la esfera.

**`OverworldCamera.js`** (`update`)

- Parámetros nuevos: `collisionRadius` 0,35 m · `minArm` 1,8 m · `armHoldS` 0,3 s · `armInRate` 16 (~0,06 s) · `armOutRate` 5 (~0,6 s) · `armOutMaxSpeed` 6 m/s.
- Esfera de 0,35 m en todas las pruebas.
- Subida (bisección, 4 pruebas por criterio, solo con un obstáculo cerca):
  1. Si el obstáculo está antes del 60 % del brazo o no cabe el mínimo: el ángulo más bajo (hasta +60°) que deja libre el 85 % del brazo (lo del Hito 136, conserva la distancia en lomas y casas).
  2. Si no lo hay y no caben `minArm` + 0,25 m: el ángulo más bajo (hasta ~83°) que los deja. La cámara pasa por encima del personaje.
  3. Si ni así (bajo un tejado o un arco): se queda abajo a `minArm` y lo que tapa se transparenta.
- Una sola retención (`_camHold`) para distancia y subida: acercarse o subir es rápido y renueva 0,3 s de espera; volver es despacio y como mucho a 6 m/s.
- Excepción de las esquinas (Hito 79) acotada: solo si el choque está al final (f ≥ 0,8, con histéresis hasta 0,72) y la esfera de la cámara queda a más de 0,55 m de toda caja.
- Comprobación final tras el ajuste al suelo: si la cámara queda metida en una caja, se adelanta hacia la cabeza hasta salir.

## Medidas

Simulación fija (dt = 1/60) con la cámara real y un personaje de prueba, en la isla del Bosque: 12 obstáculos (Forja, casas, parada, autobús, altar de Atia, Dojo y pilares de roca), zoom 11 y 18 m, y 10 laderas (desnivel > 2,5 m a 4 m). La versión antigua se cargó desde la copia de seguridad y se probó con las mismas cajas. «Metida» = la cámara a menos de 0,12 m de una caja o del suelo. «Bombeo» = ida y vuelta de ≥ 25 cm cada tramo en ≤ 1 s.

| Recorrido | Metida (antes → ahora) | Distancia mínima | Distancia media | Bombeos |
|---|---|---|---|---|
| A · pared a 45° (cámara hacia la pared) | 3340 → **0** | 1,64 → 1,73 m | 5,6 → 4,9 m | 0 → 4* |
| B · vuelta completa junto a la esquina | 596 → **0** | 1,64 → 1,80 m | 10,5 → 9,0 m | 6 → 4 |
| C · cámara casi paralela a la pared | 8 → **0** | 2,16 → 2,06 m | 9,5 → 7,2 m | 0 → 0 |
| D · laderas | 84 → **0** | 4,85 → 3,47 m | 14,0 → 12,5 m | 6 → 7 |

Coste de la cámara por fotograma: p50 0,1 ms · p99 0,4 ms · máx. 1,1 ms (antes p99 0,2 ms).

\* Los 4 de A no son idas y vueltas: son el instante del acercamiento rápido (11 → 2 m en 0,1 s), en el que la comprobación final adelanta la cámara 0,3 m durante un fotograma mientras sube.

**Notas**

- La distancia media baja porque ahora la cámara se acerca cuando antes se quedaba al otro lado de la pared (metida o mirando a través de ella). Si se quiere más distancia, el ajuste es `collisionRadius` (menos radio, menos acercamiento).
- Probado solo en la simulación (la pestaña del navegador estaba oculta y limitada a ~1 fps); falta una prueba jugando.

## Reglas

1. La colisión de la cámara se ajusta solo con los parámetros del constructor (`collisionRadius`, `minArm`, `armHoldS`, `armInRate`, `armOutRate`, `armOutMaxSpeed`).
2. Ver dentro de una pared es peor que quedar por debajo de `minArm`: la comprobación final manda.
3. Toda subida o acercamiento renueva la retención compartida; nada vuelve atrás antes de `armHoldS`.

## Copias de seguridad

`backups/2026-11-07_hito141/` (los dos archivos originales).
