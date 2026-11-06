# Hito 129 · Recorridos de panel como «coach marks»

Las tarjetas explicativas que salen la primera vez que se abre el **Escuadrón** (T) y el **Koliseo** (K) se rediseñan con el patrón de *coach mark*: la tarjeta señala la zona que explica y el resto del panel queda en segundo plano. Los textos, los pasos y cuándo aparecen no cambian.

## Qué cambia para el jugador

| Antes | Ahora |
|---|---|
| La tarjeta flotaba cerca de la zona, sin señalarla. | Una **flecha** sale de la tarjeta y apunta al centro de la zona (debajo de ella, o encima si no cabe). |
| La zona solo tenía un borde dorado parpadeante. | Un **foco** atenúa el resto de la pantalla y deja la zona a la vista; se desliza de un paso al siguiente. No bloquea clics. |
| Solo «Siguiente» y «Saltar» abajo. | **«Atrás»** desde el paso 2; «Saltar» arriba a la derecha (no aparece en el último paso). |
| Progreso repetido (texto «1 de 3» y puntos). | La cabecera dice «Koliseo · 1 de 3» y los puntos marcan hechos / actual (pastilla) / pendientes. |
| Sin teclado. | **→ / Intro** siguiente, **←** atrás, **Esc** salta el recorrido (sin cerrar el panel). El foco del teclado pasa a «Siguiente» y vuelve a donde estaba al terminar. |
| Enlace al Códice como texto. | Botón con icono de libro «Ver en el Códice» en la última tarjeta. |

## Archivos

- `src/rpg/ui/PanelTour.js` — misma API (`startPanelTour(owner, { steps, ns, codex, onDone })` → `{ stop, active }`); los llamadores (`SquadTour.js`, `KoliseoPanel.startTour`, `TutorialDirector`) no cambian.
  - `.lk-sqt-spot`: capa fija `aria-hidden`, `pointer-events: none`, colocada con `transform` + `width/height` alrededor del rectángulo de la zona (margen 6 px).
  - `place()` decide el lado (`data-side="below|above|none"`) y la posición de la flecha (`--ax`); si la zona no existe o no se ve, la tarjeta queda libre y el foco se oculta.
  - Se recoloca con `resize` y `scroll` (en captura, vía `requestAnimationFrame`).
  - Tarjeta `role="dialog"` con `aria-labelledby` / `aria-describedby`; los botones llevan `aria-keyshortcuts`.
  - Sonido: `playClick` en cada paso.
- `src/ui/lunakai-tutorial.css` — bloque «Hito 129 · Recorridos de paneles como coach marks» al final (colores con `--lk-*`, tamaños en rem, `prefers-reduced-motion` sin transiciones). Neutraliza el parpadeo antiguo de `.lk-sqt-focus`.
- `src/i18n/{es,en}/tutorialDirector.js` — `squadTour.back` y `koliseoTour.back` («Atrás» / «Back»).

## Comprobado

- Koliseo (3 pasos) y Escuadrón (3 pasos) en 1366×768 y 1280×600, en español e inglés: la tarjeta nunca tapa la zona que explica y la flecha apunta a ella.
- ← vuelve al paso anterior; Esc cierra el recorrido, deja el panel abierto y lo marca como visto.
