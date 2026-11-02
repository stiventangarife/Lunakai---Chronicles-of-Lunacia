# Hito 112: Escuadra, inicio y scrollbars visibles (PC)

> **Estado:** en la versión de prueba (1-nov-2026), pendiente de probarlo en el juego real.
> **Pedido:** continuar el Hito 111 con las pantallas que quedaban por auditar.
> **Cómo se midió:** igual que en el Hito 111 (HTML y CSS reales en una página de prueba, 7 tamaños de 1920×1080 a 1280×600, y también con texto al 125 %). Mundo abierto ya estaba bien y no se tocó.

## 1. Qué se cambió (todo en `ui/lunakai-ui.css`, bloque «Hito 112»)

| Pantalla | Problema | Solución |
|---|---|---|
| **Escuadra** | Las 4 ranuras ocupaban ~260 px fijos; a 1280×600 la colección y la ficha quedaban reducidas a 200 px de alto. | Con `min-width: 1101px` y `max-height: 820px` se compactan las ranuras (retrato 52 px, menos relleno); con `max-height: 680px` retrato de 40 px y se oculta el «Bond». La colección pasa de 202 a 292 px a 1280×600. |
| **Inicio / acceso** | A 1366×768 y menos la pantalla entera hacía scroll (775/768); a 1280×600 «Jugar como invitado» quedaba bajo el pliegue. | Con `max-height: 820px` y `680px` el logo se escala por altura (`40vh`/`36vh`) y se reducen los márgenes de la tarjeta. Sin scroll en 1366×768, 1280×720, 1280×600 y 1024×768. |
| **Fin de combate** | Con poca altura el encabezado dejaba ~266 px al resumen. | Con `max-height: 700px` se compacta el escudo/título: ~273 px útiles. |
| **Libro de misiones, mapa del mundo, fin de combate, escuadra** | La barra de scroll no se veía. | Barra dorada visible (`scrollbar-color`): clara en fondos oscuros, oscura en pergamino. |

## 2. Resultado de la barrida

- Sin cortes de botones críticos en Escuadra desde 1366×768. A 1280×600 una fila de la colección queda dentro del scroll de su columna (esperado).
- Inicio: sin scroll en todos los tamaños a 100 %; con texto al 125 % solo hace scroll en 1280×720 y 1280×600 (esperado).
- Fin de combate, misiones y mapa: sin cambios de layout; hacen scroll interno.

## 3. Pendiente

- Estados del acceso no auditados: formulario de email, código y selector de slots de guardado (necesitan cuenta/servicio).
- Verificar todo en el juego real (las pruebas fueron en una página de prueba, sin fuentes de Google ni imágenes reales).
