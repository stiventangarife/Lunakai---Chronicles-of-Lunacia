# Hito 53 — Memoria del tutorial y rendimiento del mundo abierto

> **Estado:** en la versión de prueba (23-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** durante el tutorial la memoria sube de ~1,3 GB a ~1,8 GB (administrador de tareas del navegador): se aplican las mejoras A (cinemática) y D (variantes ocultas del Sapidae). Después, los FPS en el Bosque bajan a 40–50: se aplican las mejoras 1, 2, 3 y 5 (sección 4).

## 1. Cambios

| Cambio | Ahorro | Archivo |
| --- | --- | --- |
| **A. Cinemática del prólogo:** los 9 modelos se dibujan como siluetas de tinta, así que sus texturas se sueltan nada más cargarlos (se cierran las imágenes). Al terminar se liberan geometrías, esqueletos (también los de cada plano) y los lienzos de los fondos dibujados. | ~100 MB de imágenes y ~60 MB de lienzos | `rpg/cinematic/PrologueCinematic.js` |
| **D. Variantes ocultas del Sapidae (Ema / Kai):** ya se liberaban peinados, cabezas, camisas y sombrero al personalizar, pero el primer combate las volvía a subir todas (el precalentado de efectos subía las texturas de toda la escena sin mirar la marca `lkNoPrewarm`) y no se volvían a liberar. Ahora el precalentado respeta la marca, también se liberan las expresiones de ojos y boca y los cuernos que no se ven, y se repite al aplicar el equipo y al volver de cualquier combate. | ~110 MB de tarjeta gráfica después del primer combate (~45 MB antes de él) | `vfx/VfxBridge.js`, `rpg/SapidaeModularController.js` (`releaseHiddenFace`), `rpg/PlayerEntity.js`, `rpg/OverworldManager.js` |

En combate, si una expresión nueva se muestra (enfado, sorpresa), three.js sube su textura al dibujarla, una sola vez por combate.

## 2. Pruebas

- Partida «Auditoria»: texturas ocultas del Sapidae subidas a la GPU: 0 al entrar, 0 durante un combate y 0 al volver (antes: 21 texturas, ~110 MB, después del primer combate). La cara visible se ve igual; la expresión cambiada en combate se dibuja bien.
- Cinemática: los modelos cargan sin texturas, las siluetas se dibujan igual (plano de las quimeras) y al terminar no queda nada de la cinemática en memoria.
- Pendiente: medir con el administrador de tareas del navegador recorriendo el tutorial en una partida nueva.

## 3. Pendiente (plan de memoria)

- **B.** Al volver de un combate, liberar los modelos del mapa de combate y de los enemigos (~110 MB).
- **C.** Compartir entre piezas del decorado las texturas repetidas (hojas ×5; rocas, piedras del camino y flores ×3): ~50 MB.

## 4. Rendimiento en el mundo abierto (23-oct)

Pedido: los FPS bajaron a 40–50 (a veces 30) con calidad Alta. Se aplican las mejoras 1, 2, 3 y 5 del plan.

| Cambio | Antes → después (pueblo del Bosque) | Archivo |
| --- | --- | --- |
| **1. Sombras uno de cada dos fotogramas** (solo en el mundo abierto; el combate no cambia) | dibujar la escena: ~8–10 ms → ~4,3 ms en los fotogramas sin sombras y ~7,2 ms en los que sí | `rpg/world/EnvironmentSystem.js` (`render`) |
| **2. Sin sombra:** helechos, setas, flores, plantas pequeñas, guijarros y farolas (árboles, arbustos, rocas, edificios y personajes la mantienen) | ~0,2 ms en los fotogramas con sombras | `EnvironmentSystem._trimSmallShadows` |
| **3. Un solo esqueleto para el Sapidae del jugador** (antes 9 con los mismos huesos) | 8 esqueletos menos que calcular y subir por fotograma | `rpg/PlayerEntity.js` (`shareSkeletons`) |
| **5. Brillo (bloom) a media resolución** | ~2,9 ms → ~0,5 ms de tarjeta gráfica | `EnvironmentSystem.js` |

Medido con la ventana del navegador oculta (tiempos por fotograma, no FPS). Pendiente: comprobar los FPS con el contador del menú de opciones.
Pendiente del plan: **4.** preparar los efectos de combate solo detrás de pantallas de carga (las caídas puntuales a 30).
