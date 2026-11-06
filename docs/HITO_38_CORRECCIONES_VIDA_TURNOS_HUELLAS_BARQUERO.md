# Hito 38 — Vida persistente, turnos alternados y correcciones (huellas, barquero, habilidades del Sapidae)

> **Estado:** completado en la versión de prueba (18-oct-2026).
> **Actualización (Hito 115, 2-nov-2026):** tras una derrota (fuera del tutorial) el escuadrón ya no despierta en el dojo, sino frente al altar de Atia del pueblo del Bosque (`ATIA_RESPAWN_SPOT`). La vida sigue como aquí se describe: quien cae vuelve con 1 de vida.
> **Pedido:** revisar y corregir cinco errores encontrados al jugar. Solo se cambió lo pedido.

## 1. Vida persistente

**Antes:** el combate empezaba siempre con la vida completa y el daño no se guardaba. El mundo abierto mostraba otra vida, que se quedaba atrás cuando subía la vida máxima.

**Ahora:**
- **El combate empieza con la vida del mundo abierto**, y al terminar (victoria o derrota) se guarda la vida que le queda a cada héroe.
- **Quien cae vuelve con 1 de vida.** Tras una derrota, el escuadrón despierta en el dojo, como antes.
- **Reintentar** un combate lo empieza con la vida que se tenía al entrar.
- **Si sube la vida máxima** (nivel, atributos o equipo), la vida actual sube lo mismo. Si baja, se recorta.
- **Regeneración en el mundo abierto:** +10 de vida cada 5 s a quien le falte (`OVERWORLD_HP_REGEN` en `main.js`). Las pociones siguen curando al momento.
- **La vida se guarda en la partida** (también en la nube), en el campo `currentHP` de la ranura.
  - Se guarda al volver de un combate (victoria o derrota), al usar una poción y, mientras se regenera, como mucho cada 30 s y al llenarse.
  - Las partidas antiguas sin este dato empiezan con la vida completa.
  - Al cargar, la vida se recorta a la máxima y nunca baja de 1.
- **No cambian:** el tutorial y la arena de pruebas (`lkDebug.arena()`), que siguen empezando con la vida completa y no la guardan.

| Archivo | Cambio |
| --- | --- |
| `src/tactics/EquipmentManager.js` | La vida actual sigue a la vida máxima; `setCurrentHP(id, hp, { silent })` y `regenPartyHP(10)`. |
| `src/tactics/Unit.js` | `config.currentHP` (opcional): la vida con la que entra la unidad. |
| `src/main.js` | Vida de entrada, `_writeBackSquadHP()` al terminar, reintento y `_tickOverworldRegen()`. |
| `src/rpg/SaveSlotManager.js` | La ranura guarda `currentHP`. |

## 2. Turnos alternados

- Cada bando se ordena por su iniciativa y se alternan: jugador, enemigo, jugador, enemigo…
- Empieza el bando que tiene la unidad con más iniciativa; si empatan, el jugador.
- Si un bando se queda sin unidades en la ronda, el otro juega las que le quedan.
- La barra de turnos muestra este orden.
- **19-oct ([Hito 42](HITO_42_AUDITORIA_VFX_COMPLETOS_Y_PRECOMPILADO.md)):** el orden se calcula una sola vez al empezar el combate y no cambia entre rondas; quien cae solo sale de la lista.
- **Tutorial:** mantiene el orden de siempre (Sapidae y luego Axie) para que su guion funcione (`turnManager.alternateTeams = false`).
- Archivos: `src/tactics/TurnManager.js` y una línea en `src/main.js`.

Ejemplos:

| Unidades (iniciativa) | Orden |
| --- | --- |
| Sapidae 90, Axie 85 · enemigos 95, 70, 60 | E95 · J90 · E70 · J85 · E60 |
| Sapidae 90, Axie 85 · enemigos 80, 70 | J90 · E80 · J85 · E70 |
| Sapidae 90 · enemigos 70, 65, 60, 50 | J90 · E70 · E65 · E60 · E50 |

## 3. Huellas sobre puentes y hielo

**Antes:** las huellas y el polvo se ponían a la altura del terreno de abajo, y quedaban escondidas bajo el puente del Bosque y el hielo del Ártico.

**Ahora:** usan la misma altura por la que camina el jugador. Sobre un puente o el hielo quedan planas, encima de la superficie.

- Archivos: `src/rpg/world/demo_scena/FootstepEffectsManager.js` y una línea en `GrandIslandZone.js`, `SavannaZone.js` y `DemoScenaZone22.js`.

## 4. Barquero: Espacio desactivado al elegir isla

**Antes:** al abrirse las islas, la primera quedaba seleccionada, y una pulsación más de Espacio (pasando el saludo de Pomodoro) llevaba a esa isla.

**Ahora:** con las islas en pantalla, Espacio no hace nada. Se elige con clic o con las teclas 1-5; Esc cierra.
- En el resto del diálogo del barquero, Espacio sigue pasando el texto. Los demás diálogos no cambian.
- Archivo: `src/rpg/ui/FerryTravelUI.js`.

## 5. Habilidades del Sapidae en la Mochila

**Antes:** la pestaña Habilidades no tenía la lista del Sapidae y mostraba «Sin habilidades que mejorar».

**Ahora:** muestra las 6 habilidades de su clase (Forjador, Pastor, Lunalogista o Astromante), las mismas que lleva al combate, con el mismo coste de puntos y la misma mejora que los Axies.
- Archivo: `src/rpg/ui/InventoryModal.js`.

## Pruebas

- **Turnos:** los órdenes de la tabla de arriba, el empate y el orden de siempre en el tutorial. Combates de IA contra IA en los 15 mapas con el orden alternado.
- **Vida guardada:** partida nueva a vida completa; tras guardar 57 y 1, al recargar vuelven 57 y 1; los valores fuera de rango se recortan (más que el máximo → máximo, 0 → 1).
- **Vida:** con 40/360, al subir la vida máxima en 5 pasa a 45/365; la regeneración llega a 365/365 en 32 pasos de +10.
- **Huellas:** con un puente a 2,4 m sobre un terreno a 1 m, la huella queda a 2,43 m; fuera del puente, a la altura del terreno.
- **Habilidades:** las 4 clases del Sapidae muestran sus 6 habilidades, iguales a las del combate.

## Pendiente

- Probar en partida real el ritmo de la regeneración (+10 cada 5 s) y ajustarlo si hace falta.
