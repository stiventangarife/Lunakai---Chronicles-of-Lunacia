# Hito 127: Códice más claro

> **Estado:** probado el 5-nov-2026 en una página de prueba con `CodexModal` real, sus datos y sus ilustraciones (español e inglés; 1920×1080, 1366×768, 1280×600 y 860×700). Sintaxis comprobada con `node --check`. Pendiente de probar en el juego real.
> **Pedido:** mejorar la apariencia del Códice según Crónica Celeste y buenos patrones de UX, **sin quitar ni cambiar su contenido**.
> **Reglas respetadas:** ningún texto de las páginas cambia; solo hay textos nuevos de interfaz (`i18n` en español e inglés); colores con `--lk-*`; sin assets nuevos; la API (`open`, `close`, `recordBeasts`, guardado) y los `data-codex` siguen igual.

## 1. Diagnóstico

| Zona | Problema |
|---|---|
| Ilustración | Las capturas son apaisadas y la página vertical: la imagen ocupaba menos de la mitad del papel (450×254 en 486×609) y dejaba mucho hueco. No se podían ampliar, y son capturas de interfaz con mucho detalle. |
| Pasar página | Puntos de 9 px (difíciles de acertar) y, en el Bestiario, 19 seguidos. Las flechas no decían adónde llevaban; al final de un capítulo saltaban al siguiente sin avisar. |
| Carril | Todos los capítulos con el mismo punto amarillo: no se veía cuánto se había leído de cada uno. |

## 2. Cambios

- **Índice del capítulo** («En este capítulo») bajo la ilustración, en capítulos de hasta 8 páginas: los títulos de sus páginas (los mismos de siempre), la actual resaltada y las leídas marcadas. Se pulsa para ir a esa página.
- **Ilustración como lámina** (marco claro y una ligera inclinación) y botón **«Ampliar la imagen»**, también al pulsar la imagen: ocupa toda la doble página; el mismo botón («Volver a la página») o **Esc** vuelven, sin cerrar el Códice. Al cambiar de página se sale de la vista ampliada.
- **Pasar página con texto:** «‹ Anterior» y «Siguiente ›». En la última página de un capítulo, el botón dice el **nombre del capítulo siguiente** y se resalta en dorado; en la primera, el del anterior. Llevan `aria-keyshortcuts` y la pista «Usa ← y → para pasar página».
- **Puntos más fáciles de pulsar** (zona de 22 px) y, en capítulos de más de 8 páginas (Bestiario), un **contador «2 / 19» con barra** en lugar de los puntos.
- **Carril con progreso de lectura:** ✓ si el capítulo está leído, «1/3» si está a medias y el punto de «Nuevo» si no se ha empezado. Carril de 256 px en pantallas anchas (los títulos se parten menos).
- **Transición suave** al pasar página (sin movimiento con «reducir movimiento»).
- **Poca altura** (≤ 700 px): el índice se oculta para dejar sitio a la ilustración. **Pantallas estrechas** (≤ 900 px): se mantiene el diseño de una columna del Hito 126.

**Textos nuevos** (`i18n/{es,en}/codex.js`): `codex.inChapter`, `codex.prevShort`, `codex.nextShort`, `codex.zoom`, `codex.zoomOut`, `codex.read`, `codex.keysHint`.

**Código:** `rpg/ui/CodexModal.js` (`_renderPage`, `_renderRail`, `_setZoom`, `_pageTitle`, `_chapterProgress`) y bloque «Hito 127» al final de `ui/lunakai-ui.css`.

## 3. Prueba

- La ilustración apaisada se ve con su lámina y el índice llena el hueco; los diagramas SVG y las fichas del Bestiario no cambian de tamaño.
- Ampliar: la captura pasa a 844×482 (antes 450×254); Esc vuelve sin cerrar el Códice.
- Al final de Equipamiento el botón dice «Escuadrón» y lleva a su primera página; allí «Anterior» dice «Equipamiento».
- El índice lleva a la página pulsada; ← y → siguen funcionando.

### Corrección (5-nov): la captura vertical tapaba el índice

En «Cuidar el vínculo» (la única captura vertical) la imagen se salía de su sitio y tapaba el índice: la rejilla de la ilustración tenía una fila de alto automático y el límite de altura de la imagen no tenía referencia. Ahora la lámina reparte su alto fijo entre la imagen y el botón «Ampliar» (`.lk-cdx__media` en columna flex; `.lk-cdx__plate` con filas `minmax(0, 1fr) auto`). A 1366×768 la captura pasa de 325×582 (encima del índice) a 183×324 (cabe); ampliada, 290×525. Las capturas apaisadas, los diagramas y las fichas no cambian.

## 4. Pendiente

- Probar en el juego real (abrir desde la tecla C, el HUD y los botones «?» de la Tienda, la Forja y el Koliseo).
