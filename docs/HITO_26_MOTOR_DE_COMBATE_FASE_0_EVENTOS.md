# Hito 26: Motor de combate — Fase 0 (lógica separada de la presentación)

> **Estado:** completado. El combate se juega igual que antes; cambia cómo está organizado por dentro.
> **Plan:** fase 0 del *Plan de implementación de habilidades*.

## Qué cambió

| Antes | Ahora |
| --- | --- |
| `SpellManager.castSpell` (~280 líneas) mezclaba reglas, VFX, sonidos, textos flotantes y casos del tutorial. | `castSpell` es un pipeline: validar → pagar coste → resolver mecánicas especiales → proyectil → impacto → efectos por casilla. Cada paso emite un evento. |
| Los VFX se elegían dentro de la lógica. | `combat/SpellPresentation.js` escucha los eventos y reproduce exactamente los mismos efectos. |
| Los ajustes del tutorial estaban incrustados en el cálculo de daño. | `combat/TutorialCombatHooks.js` los registra como ganchos (`critAllowed`, `adjustDamage`). |
| El azar del daño compartía `Math.random` con las chispas de los VFX. | `spellManager.rng`: azar propio de las reglas (los VFX ya no pueden cambiar un resultado). |
| `Unit` no sabía su clase de Axie. | `unit.axieClass` ('Beast', 'Plant'…), base del triángulo elemental y de la Ultimate. |
| El Axie compañero tenía iniciativa fija 85. | Usa su iniciativa real (clase + nivel + equipo). En el tutorial se mantiene 85 para conservar el orden guiado. |
| `Unit.dieCinematic` pedía `spellManager.vfxManager`, que no existía: el remate cinemático del último enemigo nunca se veía. | `vfxManager` es un alias de `vfx`: el remate ahora se reproduce. |

## Archivos

- `src/tactics/combat/CombatEvents.js` — bus de eventos (`on`, `emit`, `emitAsync`). Lista de eventos y su contenido en la cabecera del archivo.
- `src/tactics/combat/SpellPresentation.js` — VFX, sonidos, textos y sacudidas por defecto (`install` / `uninstall`).
- `src/tactics/combat/TutorialCombatHooks.js` — reglas especiales del combate guiado.
- `src/tactics/combat/CombatDebug.js` — consola `lkDebug`.
- `src/tactics/Spells.js` — `SpellManager` reescrito; `SPELLS_DB` sin cambios.
- `src/tactics/Unit.js`, `src/main.js` — `axieClass`, iniciativa real, instalación de `lkDebug`.

## Conectar un motor de VFX propio

```js
const sm = window.__AXIE_TACTICS_APP__.spellManager;
sm.presentation.uninstall();               // apaga los VFX por defecto (o deja ambos)
sm.events.on('spell:projectile', ({ casterPos, targetPos, spell }) => miMotor.proyectil(casterPos, targetPos, spell)); // devolver una promesa retrasa el impacto
sm.events.on('spell:impact', ({ targetPos, affectedCells, spell }) => miMotor.impacto(targetPos, affectedCells, spell));
sm.events.on('unit:damaged', ({ unit, actual, isCrit }) => miMotor.golpe(unit, actual, isCrit));
```

## Consola de pruebas (F12)

`lkDebug.help()` · `units()` · `give("active", {pa: 3})` · `damage("foe", 50)` · `heal("hero", 50)` · `killEnemies()` · `turn()` · `events(true)` · `presentation(false)`

## Verificación

- **Regresión:** 118 escenarios (todos los hechizos de `SPELLS_DB` lanzados dos veces, falta de PA, empuje contra unidad, transposición fallida, muerte y los 4 pasos especiales del tutorial). El `castSpell` original y el nuevo producen los mismos 1.727 eventos en el mismo orden (textos, sonidos, VFX, sacudidas, empujes, muertes) y el mismo estado final.
- **Desacoplamiento:** con la presentación apagada el combate da el mismo resultado y no se dispara ningún efecto; un motor externo puede retrasar el impacto devolviendo una promesa.
- **Prueba manual recomendada:** jugar el tutorial completo y un combate normal; en consola, `lkDebug.events(true)` muestra cada evento.
