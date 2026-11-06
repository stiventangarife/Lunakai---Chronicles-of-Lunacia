# Hito 130 · Avisos de «Nuevo» en el HUD

El punto amarillo de «Nuevo» de los botones del HUD (**Escuadrón T**, **Koliseo K**, **Códice C**) pasa a un gestor común con un comportamiento más claro y menos insistente.

## Qué cambia para el jugador

| Antes | Ahora |
|---|---|
| Siempre un punto, aunque hubiera muchas cosas nuevas. | **Punto** si es algo sin número (panel nuevo) y **número** si se puede contar (el Códice muestra «4»; a partir de 10, «9+»). |
| El punto latía sin parar. | **Late 3 veces** al aparecer o al subir el número y luego queda fijo. Si se encienden varios a la vez, solo late el más importante (Escuadrón › Koliseo › Códice). |
| Solo se distinguía por el color. | Al pasar el ratón el botón dice qué hay («Escuadrón [T] · Nuevo: organiza tu equipo», «Códice [C] · 4 páginas sin leer»); los lectores de pantalla lo leen en el `aria-label`. |
| Escuadrón y Koliseo: se apagaba al **terminar** el recorrido (cerrar a mitad lo dejaba encendido). | Se apaga al **abrir** el panel. El recorrido sigue saliendo la próxima vez si no se terminó. |
| Códice: un punto hasta leer **todas** las páginas, sin saber cuántas faltaban. | El número cuenta las **páginas sin leer** y baja de uno en uno al leer cada página (4 → 3…). Dentro del libro siguen los sellos «Nuevo» y el progreso por capítulo. Una ficha nueva del Bestiario lo vuelve a subir (y late). |

## Archivos

- `src/ui/NewBadges.js` (nuevo) — `newBadges.set(id, { on, count, hint, prio })` y `newBadges.refresh()`. Añade un `<span class="lk-nb">` (`aria-hidden`) dentro del botón, suma el texto del aviso al `aria-label` y al `title` originales y los restaura al apagarse. Mantiene la clase `.lk-has-new` en el botón.
- `src/rpg/tutorial/TutorialDirector.js` — `_updateHUDButtonsState` usa `newBadges`; nuevos `flags.squadSeen` / `flags.koliseoSeen` (se guardan con la partida) que marca `_markPanelSeen` al abrir el panel tras graduarse.
- `src/rpg/OverworldManager.js` — `_updateCodexDot()` pinta `codexModal.unreadCount()` con `newBadges` (se llama en cada `onChange` del Códice, es decir, al leer una página). `CodexModal.js` no cambia.
- `src/ui/lunakai-tutorial.css` — el antiguo `::after` con latido infinito se sustituye por el bloque «Hito 130» al final (`--lk-gold-atia-bright`, `--lk-ink-900`, tamaños en rem, sin latido con «reducir movimiento»).
- `src/i18n/{es,en}/overworld.js` — `overworld.newSquad`, `newKoliseo`, `newCodex`, `newCodexOne`.

## Añadir un aviso nuevo

```js
import { newBadges } from '../ui/NewBadges.js';
newBadges.set('btn-open-inventory', { on: n > 0, count: n, hint: i18n.t('…', { n }), prio: 1 });
```
El estado «visto» lo guarda quien llama (como `flags.squadSeen` o las páginas leídas del Códice).

## Comprobado

- Tres avisos a la vez: late solo el del Escuadrón; a los 3 s ninguno late. Subir el número del Códice (4 → 12) lo hace latir de nuevo y muestra «9+».
- Al apagarse, `aria-label` y `title` vuelven a los originales.
- Códice: 30 páginas sin leer → «9+»; al leer una página el número baja a 29 y luego a 28 (sin latido al bajar).

> Corrección: la primera versión apagaba el número del Códice al abrirlo (páginas «avisadas»); se cambió para que cuente las páginas sin leer, que es lo que espera el jugador.
