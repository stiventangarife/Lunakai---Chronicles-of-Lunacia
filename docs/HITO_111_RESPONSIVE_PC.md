# Hito 111: Interfaz adaptable a ventanas de PC (bajas y estrechas)

> **Estado:** en la versión de prueba (1-nov-2026), pendiente de probarlo en el juego real.
> **Pedido:** que toda la interfaz se vea bien en PC, también en ventanas pequeñas (1366×768, 1280×720, 1280×600, 1024×768).
> **Cómo se midió:** en una página de prueba con el HTML y el CSS reales, a 1920×1080, 1600×900, 1440×900, 1366×768, 1280×720, 1024×768 y 1280×600. Para cada pantalla se comprobó que sus elementos clave (acción principal, lista, botones de cabecera) quedan a la vista, descontando lo que recortan los contenedores con scroll.

## 1. Qué se arregló

| Pantalla | Problema | Solución |
|---|---|---|
| **Forja** | Las chispas del yunque (SVG decorativo) ocupaban su tamaño natural y creaban un scroll fantasma de ~500 px en la columna central: el botón «Forjar» y los materiales quedaban a medias. | `.lk-anvil__fx { width/height: 100% }`; franja de coste `sticky` al pie; con ≤ 700 px de alto la tarjeta del yunque y la bolsa se compactan. |
| **Tienda** | El botón «Comprar / Vender» quedaba al final de un panel con scroll. | `.lk-sp-act` es `sticky` al pie del detalle; con ≤ 700 px de alto se compactan cabecera, notas y resumen. |
| **Mochila y Runas** | De 981 a 1100 px de ancho las tres columnas se apilaban y la cuadrícula de objetos quedaba bajo el pliegue. | Se conservan las tres columnas (224 · 252 · resto) hasta 981 px; el muñeco 3D ya no fija un alto mínimo. |
| **Reglas y controles** | A ≤ 768 px de alto la sección de controles quedaba bajo el pliegue. | Dos escalones de compactación por altura (≤ 900 y ≤ 740 px). Cabe entera sin scroll hasta 1280×720; a 1280×600 hace scroll con barra visible. |
| **Cola de turnos** | Con muchas unidades pasaba por debajo de los botones de la esquina. | Se recorta al ancho libre (degradado en los bordes), con > 9 unidades las tarjetas se compactan sin nombres y el turno activo se centra (`fitTimeline` en `CombatHUD.js`). |
| **Estados en la ficha de la unidad** | El nombre y la barra de vida se movían ~11 px al aparecer el primer estado. | Fila reservada de una línea con 3 huecos (2 chips + «+N» con tooltip). La ficha no cambia de alto con 0, 1 o 6 estados. |

Además, los cuerpos con scroll propio usan una barra dorada visible (`scrollbar-color`) para que se note que hay más contenido.

## 2. Lo que no cambió (y por qué)

- **Opciones:** el «grupo que asoma 4 px» era contenido dentro del scroll del panel; no hay recorte.
- **Combate (HUD):** ya cabía en todos los tamaños probados; solo se tocaron la cola y los chips.
- **Texto «extra grande» (125 %):** Forja, Tienda, Mochila, Runas, Opciones y Combate mantienen sus elementos clave a la vista a 1366×768 y 1280×720. Reglas y controles hace scroll (esperado).

## 3. Pantallas aún sin auditar

Pantalla de inicio, mundo abierto (minimapa, misiones), mapa del mundo, escuadra, libro de misiones, fin de combate y acceso (login).

## 4. Reglas para pantallas nuevas

1. Ventana con `height: min(Xpx, 100vh − 40px)`; cabecera y acción principal siempre visibles; el cuerpo hace scroll solo si hace falta.
2. Compactar por **altura** (`@media (max-height: …)`), no solo por ancho: en PC lo que falla es la altura.
3. Un elemento decorativo con tamaño intrínseco (SVG, canvas) dentro de un contenedor con scroll debe tener tamaño explícito: si no, crea scroll fantasma.
4. Reservar el sitio de lo que aparece y desaparece (chips, avisos) para que nada se mueva.
5. Probar a 1366×768, 1280×720, 1280×600 y 1024×768, y con texto «extra grande».
