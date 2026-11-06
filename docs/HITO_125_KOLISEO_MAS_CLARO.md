# Hito 125: Koliseo más claro (Arena PvP, Desafío de la Bruma y Clasificación)

> **Estado:** probado el 5-nov-2026 en una página de prueba con `KoliseoPanel` real y datos simulados iguales a las capturas del usuario (español e inglés; 1366×768, 1280×720, 1280×600 y 1024×768). Sintaxis comprobada con `node --check`. Pendiente de probar en el juego real.
> **Pedido:** revisar las tres pestañas del Koliseo y mejorarlas según Crónica Celeste y un patrón de UX más intuitivo.
> **Reglas respetadas:** sin bundlers; textos por `i18n.t()` en español e inglés; colores con las variables `--lk-*`; sin assets nuevos (`ASSET_VERSION` no cambia); sin cambios en el servidor ni en `ArenaFlow` (las acciones `data-act` y las referencias `data-ref` siguen igual).

## 1. Diagnóstico

| Pestaña | Problema |
|---|---|
| Todas | La ventana cambiaba de alto al cambiar de pestaña (520–631 px): todo saltaba. |
| Arena PvP | Una sola columna con un gran hueco a la derecha; «Buscar rival» suelto en una esquina; todas las cifras con el mismo peso; «10 victorias más con 15 SLP» confuso; el historial sin tablero ni fecha. |
| Desafío de la Bruma | «Daño ×2» en verde (color de lo positivo) aunque es una amenaza; «Siguiente» era solo un punto; reglas en un párrafo; sin intentos solo decía «vuelve el lunes». |
| Clasificación | Tres niveles de pestañas a la vez y un título que repetía la pestaña; los premios en una caja aparte de la tabla. |

## 2. Cambios

**Ventana:** alto fijo `min(640px, 100vh − 40px)` (el cuerpo hace scroll si no cabe). Pestañas con icono (`swords`, `pve`, `rank`) y `aria-selected`.

**Arena PvP** (`_renderArena`):
- Tarjeta **Temporada**: puesto como insignia (oro, plata o bronce en el top 3), puntos grandes, racha como ficha, victorias/derrotas/empates en tres fichas y la línea de SLP «+15 SLP por victoria · quedan 10 hoy». La cuenta atrás es una píldora con reloj.
- Tarjeta **Duelo 1 contra 1**: la acción principal arriba y a todo el ancho; mientras se busca, el estado y **Cancelar** van en la misma caja (la tarjeta no crece); las reglas como lista con iconos.
- **Últimas partidas**: resultado en una píldora con texto (no solo color), rival, **tablero y hace cuánto** («Vado del Río · hace 2 h») y puntos.

**Desafío de la Bruma** (`_renderBruma`):
- El multiplicador es una ficha de **amenaza** que va del dorado (×1) al carmesí (×3).
- «Siguiente» es una insignia con texto sobre el borde de la tarjeta.
- Barra inferior con los **intentos como rombos**, la mejor marca, el intento en curso y la acción; sin intentos dice **«Nuevos intentos en 3 d 6 h»** (el texto anterior sigue como ayuda al pasar el ratón).
- Reglas como **fichas** (se separan por « · » en el mismo texto de siempre) y premios del top 3 con sus **iconos** (bAXS, Esquirla lunar, Ámbar de Atia, oro) junto a «Ver clasificación».

**Clasificación** (`_renderBoard`):
- Tipo (Arena PvP · Desafío de la Bruma, con icono) y periodo en **una sola barra**; sin título repetido.
- Columna **Premio** en cada fila (bAXS del puesto; «—» fuera de premios).
- La caja de premios de la Arena pasa a una **tira agrupada**: 1 · 2 · 3 · 4–5 · 6–10.
- Los premios de la Bruma salen de una sola tabla (`BRUMA_PRIZE`) para la fila y la caja.

**Textos nuevos** (`i18n/es|en`): `arena.play.title`, `arena.play.sub`, `arena.wins`, `arena.losses`, `arena.draws`, `arena.slpLine`, `arena.ago.m|h|d`, `arena.board.prize`, `koliseo.bruma.resets`, `koliseo.bruma.prizesShort`, `koliseo.board.prize`.

**Estilos:** bloque «Hito 125» al final de `ui/lunakai-ui.css` (con variables `--lk-*`); en pantallas de poca altura (≤ 700 px) las tarjetas se compactan.

## 3. Prueba

- Las 6 vistas (Arena, Arena buscando, Bruma, Bruma con intento en curso, Clasificación de la Arena y de la Bruma) miden lo mismo: 640 px a 1366×768, 1280×720 y 1024×768; a 1280×600, 560 px con scroll en el cuerpo.
- Sin scroll a 1366×768 en ninguna vista; textos en español e inglés sin cortes.

## 4. Pendiente

- Probar en el juego real (estado de partida abierta, partida en revisión, invitado sin cuenta y sin conexión no cambian de lógica, pero conviene verlos).
- El servidor no envía el tope diario de victorias con SLP (10); si se añade a `pvp_me`, la línea de SLP puede pasar a una barra de progreso.
