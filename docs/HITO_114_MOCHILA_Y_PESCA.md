# Hito 114: Tarjetas de la Mochila iguales y nueva interfaz de pesca

> **Estado:** probado en la versión de prueba (2-nov-2026), pendiente de probarlo en el juego real.
> **Pedido:** (1) algunas tarjetas de objetos se veían distintas; (2) mejorar la interfaz del minijuego de pesca según Crónica Celeste (solo la propuesta A: interfaz, sin cambiar las reglas del reto).
> (El Hito 113 es el trabajo de rendimiento del visor de la Mochila.)

## 1. Tarjetas de la Mochila

**Causa.** Cada casilla es un `<button>`, y un botón centra su contenido en vertical. En una fila de la cuadrícula conviven pies de 1 línea («+4 % Vínculo») y de 2 líneas («Común · Sabana»); la fila toma la altura de la más alta y las de 1 línea bajaban el arte: quedaba una franja marfil de 6 px arriba y abajo y parecían «enmarcadas».

**Arreglo** (`ui/lunakai-ui.css`, bloque «Hito 114», solo en `.lk-bag__grid`): la casilla es una columna flex con el arte siempre arriba y el pie reserva 2 líneas con el texto centrado. Todas miden lo mismo (100 px) sin depender de la fila ni del filtro. La Tienda, que usa la misma tarjeta, no cambia.

## 2. Interfaz de la pesca

Antes había dos paneles apilados («Pescando… Esc» y el reto) que cambiaban de tamaño en cada estado, sin intentos ni tiempo a la vista, y solo con texto y colores sueltos.

Ahora hay **un solo panel** (`.lk-fish`, ancho `min(21rem, 92vw)`) con el mismo tamaño en todos los estados:

| Zona | Contenido |
|---|---|
| Cabecera | icono del pez, nombre del punto de pesca, «Esc para cancelar» |
| Centro | **corcho** dibujado en CSS + texto del estado |
| Abajo | en «recoger»: barra con la zona buena y el centro «perfecto», **anzuelos** que quedan (fallos permitidos) e **hilo del tiempo** (7 s); en el resto: pista, resultado o botín |
| Pie | E · Espacio · toque |

Estados del corcho: lanzando (asoma), espera (se mece y salen ondas), **mordisquito** (se hunde un instante, a partir del sonido `nibble`), picada (se hunde y tira, borde dorado), recoger (tenso), capturado/perfecto (sale el pez), escapado (apagado).

- La barra «Pescando…» ya no aparece en la pesca; la tala y la minería la siguen usando igual.
- El **botín de la pesca** se muestra en el mismo panel («Tu Axie te lo trae…» y después las filas de botín), sin la segunda tarjeta encima. Si el panel ya se ocultó, se usa la tarjeta de siempre.
- En la espera, una pista explica que los mordisquitos engañan (no cambia la regla).
- **Rendimiento:** en «recoger» solo se mueve el marcador con `transform` (antes se recolocaban zona y marcador con `left` en cada fotograma); la zona se coloca al empezar y tras cada fallo; el hilo del tiempo es una animación CSS.
- **Accesibilidad:** con `prefers-reduced-motion` el corcho y las ondas quedan quietos (cada estado se distingue por posición y color); el hilo del tiempo se mantiene porque es información. Los anzuelos llevan `aria-label` («Intentos: 2»).
- Textos nuevos (`i18n/es|en/notices.js`): `fishBring`, `fishTries`, `fishTip`.

**Sin cambios:** las reglas y tiempos del reto (`FISH_CHALLENGE` en `GatheringActors.js`), los sonidos y el botín.

## 3. Pendiente

- Probar en el juego real (las capturas se hicieron con el módulo real en una página de prueba).
- Fase B (ideas de juego: sin castigo al pulsar antes, rachas, peces por isla, cebos, cuaderno) queda para decidir.
