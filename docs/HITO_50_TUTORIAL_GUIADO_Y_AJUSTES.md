# Hito 50 — Tutorial guiado paso a paso y ajustes del inicio

> **Estado:** completado en la versión de prueba (22-oct-2026).
> **Pedido:** que el tutorial bloquee cada acción hasta que el jugador la haga, con flechas y resaltados (tutorial inicial y de combate); en la cinemática, un corazón en el pecho en lugar del hilo y una luna que solo se rompe en parte; arreglar los dos modelos superpuestos al elegir personaje; mover la tienda a (-77.0, 3.7) y que los slimes no ataquen durante el tutorial.

## 1. Tutorial guiado (mundo abierto)

Mientras hay algo que pulsar, la pantalla se oscurece y solo queda libre un hueco sobre el objetivo, con una flecha y una frase corta («Pulsa Evolucionar», «Elige la runa neutra»…). Lo demás no responde:

- **Ratón:** un clic fuera del hueco no hace nada; la flecha se sacude para recordar dónde pulsar. El velo también corta la rueda, el arrastre y el clic derecho.
- **Teclado:** solo pasan las teclas que pide el paso (I y U para la Mochila, Esc para cerrar la ventana del paso).
- **Desplazamiento:** si el objetivo queda fuera de la vista dentro de una ventana, se desplaza solo hasta él.
- **Franja de arriba:** con la Forja o la Mochila abiertas baja al pie de la pantalla, salvo que el objetivo esté en la mitad de abajo; entonces se queda arriba.
- **NPC:** durante el tutorial solo se puede hablar con el Maestro Paladill («Primero termina el entrenamiento con el Maestro Paladill.»).

| Paso | Qué se señala, en orden |
| --- | --- |
| Equipar la espada | Botón de la Mochila → Espada de madera → Equipar |
| Forja | Evolucionar → Espada de madera → Evolucionar → ×4 → Recoger |
| Vínculo | El Axie (hueco sobre él en el mundo) → Acariciar → Dar de comer |
| Runas | Mochila → Runas y charms → tu Axie → hueco de la runa → runa neutra → Charms → charm neutro |
| Diálogos, talar, ir a la Forja | Solo el botón de cerrar si hay una ventana abierta; el resto lo marca la flecha del HUD |

## 2. Combates del tutorial

- **Combate guiado (defensa del Dojo):** solo se iluminan las casillas permitidas; la casilla bajo el cursor solo se pinta si se puede usar. Teclas de cartas, Pasar turno y Ultimate bloqueadas fuera de su paso; la tarjeta del maestro se sacude si se intenta otra cosa.
- **Duelo con Paladill y prueba de la Ultimate:** guía calculada en cada turno (`TutorialManager.startDynamic`).
  - **Duelo:** el primer turno de cada aliado va guiado (acercarse si hace falta → carta iluminada → Paladill → Pasar turno). Cuando los dos han jugado su turno guiado (o desde la ronda 2), el duelo es libre.
  - **Ultimate:** tu Axie pasa turno; tu Sapidae pulsa el medallón (o 7) y elige la quimera marcada; después, libre.
  - **Temporizador:** el del turno no corre mientras la guía está activa.

## 3. Otros cambios

| Cambio | Archivo |
| --- | --- |
| **Cinemática:** corazón dorado que late en el pecho de cada Sapidae y cada Axie del friso (sustituye al hilo). La luna se agrieta solo por un bocado y queda en **media luna**; las esquirlas salen del bocado. | `cinematic/CinematicArt.js` (`MOON_BITE`, `heartCanvas`, `moonCanvas(…, bite)`), `cinematic/PrologueCinematic.js` |
| **Elegir personaje:** cambiar de Ema a Kai muy rápido ya no deja dos modelos superpuestos (cada carga lleva un número y la antigua se descarta). | `rpg/ui/CharacterPreviewDiorama.js` |
| **Tienda:** el puesto del Mercader Ochi pasa a (-77.0, 3.7), en un prado llano junto al camino. | `world/MerchantStall.js`, `world/MapRegistry.js` |
| **Slimes:** ocultos y sin IA ni encuentros mientras dura el tutorial; vuelven al terminarlo. El slime de ataque pasa de (-60, 45) a (55, -60), al otro lado del bosque. | `world/demo_scena/SlimeCreaturesManager.js` |
| **Clic en el tablero:** un clic sin movimiento previo del ratón (p. ej. un toque en pantalla táctil) apunta a la casilla del clic, no a la última del cursor. | `src/main.js` |

## 4. Cómo funciona

- `TutorialDirector._computeGuide()` decide en cada momento qué señalar. Devuelve el elemento, la frase, las teclas permitidas y si el objetivo está en el mundo (`canvas`). `_updateGuide()` lo aplica cada 200 ms.
- `#lk-tut-catch` recibe el clic sobre el hueco y lo pasa al objetivo, aunque otro elemento lo tape a medias.
- `isOverlayActive` (que lee `OverworldManager.isAnyModalOpen()`) queda en `false` cuando la guía señala algo que abre una ventana desde el mundo: el botón de la Mochila, el Axie o el panel de cuidados. Si no, el juego ignoraría el botón, la tecla U o el clic sobre el compañero, y el panel de cuidados se cerraría solo.
- En combate, `TutorialManager` expone `isUltAllowed()`, `nudge()` y `allowedSpellIndexes`. `main.js` los consulta antes de pintar la casilla bajo el cursor, de seleccionar una carta y de lanzar la Ultimate.

## 5. Pruebas

Probado en el navegador integrado con la partida «GuiaTest», en el orden del tutorial:

1. **Duelo:** turnos guiados de Shinji y de GuiaTest; un clic en otra casilla se ignora; libre desde la ronda 2; Paladill se rinde.
2. **NPC y slimes:** el Mercader bloqueado; los slimes ocultos.
3. **Forja:** talar el árbol y la Forja completa (la X no cierra a mitad).
4. **Vínculo:** caricia y comida.
5. **Ultimate:** la carta bloqueada para el Axie; el medallón y el objetivo con el Sapidae.
6. **Runas:** la guía completa con desplazamiento automático.
7. **Final:** graduación; los slimes vuelven.

También, antes: combate guiado del Dojo, Mochila, cinemática (corazones y media luna), 8 cambios rápidos Ema/Kai (un solo modelo) y la tienda en su sitio.

Capturas en `outputs/capturas/` (`tutorial_guia.jpg`, `tienda_antes_despues.jpg`, `cinematica_despues.jpg`).

**Revisión independiente (correcciones aplicadas):**

- **Ultimate de casilla propia o sin objetivo** (p. ej. Égida de Gaia): la guía marca las casillas válidas, o deja el combate libre si no hay ninguna. Antes el turno quedaba bloqueado.
- **Clic lento en «Equipar»:** pulsar sobre el hueco ya no cierra la ficha del ítem antes de recibir el clic.
- **Forja:** la guía busca la fila de la Espada de madera por su nombre y señala «Evolucionar» solo con ella elegida; si aun así no se puede evolucionar, no bloquea.
- **Al abrir la Forja** ya no aparece un instante «Cierra la Forja».
- **Objetivo ausente u oculto:** no hay guía, en vez de un velo sin hueco.

**Segunda revisión (22-oct, tarde):**

| Cambio | Archivo |
| --- | --- |
| **Corazones de la cinemática pegados al esqueleto:** en cada fotograma, el del Sapidae sigue al hueso `chest` (un poco adelantado hacia donde mira) y el del Axie al tronco (`Spine01_JNT`), hacia delante y bajo la cara. Antes se colocaban a una distancia fija del centro de la figura y caían en la espalda. | `cinematic/PrologueCinematic.js` (`_placeHearts`, constantes `HEART_*`) |
| **Flecha 3D del tutorial:** sigue el destino del tutorial (`TutorialDirector.navTarget()`): árbol de la Forja al talar, yunque en los pasos de la Forja, Paladill al hablar. En los pasos sin sitio al que ir (Mochila, vínculo, runas) se oculta. Antes una regla antigua de la misión la dejaba siempre sobre Paladill. | `rpg/OverworldManager.js` (`_updateQuestNavigation`) |
| **Forja en ventana estrecha:** la zona del yunque ya no se monta sobre el panel del botón y del temporizador. Con la ventana estrecha (≤ 980 px), la lista queda en 2 filas, la bolsa de materiales en una sola fila con desplazamiento lateral, y el yunque ocupa lo que necesita. Con la ventana ancha, el yunque reserva 250 px y se desplaza si no cabe. | `ui/lunakai-ui.css` |

## 6. Pendiente u observado (no es de este hito)

- Varios textos en inglés en el juego: «FEATURE LOCKED» en el aviso de bloqueo, el globo de Paladill («The discipline of the dojo forges the spirit!») y «In target zone! [2, 2]» en el panel de la misión.
