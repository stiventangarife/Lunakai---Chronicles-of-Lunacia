# Hito 44 — Runas y charms en el combate

> **Estado:** completado en la versión de prueba (20-oct-2026).
> **Pedido:** conectar al motor de combate las runas y los charms que ya se equipaban en la Mochila (tecla U) y no tenían efecto. Guía: «Matriz completa de runas maestras (63) y catálogo maestro de charms (90)».

## 1. Qué cambia en el juego

- Las **63 runas** de la guía (9 por clase pura + 9 neutrales) y los **90 charms** funcionan en combate.
- Cada runa y cada charm tiene su texto en la ficha de la Mochila. Al elegir un charm sobre una parte, la ficha muestra el «antes → después» de la carta (coste, alcance, visión, daño, escudo o curación).
- En combate, las cartas muestran su valor real con los charms y la runa. La ficha flotante añade la línea «Charms y runa: …». El coste de las cartas con descuento sale con el número rebajado.
- Cuando una runa o un charm se activa, sale un texto flotante «✦ Nombre» (Counter Stance, Bloodlust, Miracle Leaf…). Las esquivas muestran «💨 ¡ESQUIVA!».

## 1b. Potential Points por clase (corrección del 20-oct)

Los 15 PP de cada Axie se reparten por clase, como dice el GDD (§3):

- **3 PP** de la clase del Axie y **2 PP por parte** para la clase de esa parte.
- Un **charm de clase** solo gasta PP de su clase (y sigue entrando solo en partes de su clase).
- Un **charm neutral** gasta primero de la clase de la parte donde va y, si no alcanza, sigue el orden canónico: Aquatic → Beast → Bird → Bug → Dawn → Dusk → Mech → Plant → Reptile.

Ejemplo: Axie Bicho con ojos y orejas Bicho, boca Bestia y cuerno, espalda y cola Pájaro → **Bicho 7 · Bestia 2 · Pájaro 6**. Un charm Bicho de 4 PP deja 3 de Bicho; un charm Bestia de 3 PP no cabe (solo hay 2 de Bestia); tres charms Pájaro de 2 PP dejan 0 de Pájaro.

- La Mochila muestra los PP libres de cada clase, avisa «Te faltan 1 PP de Bestia» y marca como inalcanzables los charms que no caben.
- Funciones: `ppPools`, `ppAllocate` y `ppCanSet` en `tactics/data/RunesCharms.js`; `RuneCharmService.setCharm(id, parte, charm, { axieClass, partClasses })` y `ppReport()`.
- En combate, un charm que ya no cabe en los PP de su clase (partidas guardadas antes de este cambio) no se aplica; la Mochila lo avisa en rojo.

## 2. Cómo funciona (`src/tactics/combat/RuneCharmEffects.js`)

| Tipo de efecto | Dónde actúa |
| --- | --- |
| Vida máx., iniciativa, PM, crítico, escudo inicial, poder de apoyo | Al crear las unidades del combate (`setupCombat`), antes de fijar el orden de turnos |
| Daño, escudo, curación, alcance, visión, coste, estados, empuje, atracción, rotura de escudo de la carta de una parte | Copia modificada de esa carta para ese Axie (`unit.rcSpells[id]`, **mismo id**: VFX, nivel de habilidad y registro de equilibrio no cambian) |
| % de daño hecho y recibido, daño crítico, perforación, esquiva | Ganchos en `_applyDamageModifiers`, `EffectResolver.dealDamage` y `Forecast` (el pronóstico sigue coincidiendo con el daño real) |
| Robo de vida, estados al golpear, matar, críticos, contraataques y espinas | `afterHit`, al final de `SpellManager._dealDamage` |
| «Al usar esta habilidad» (escudo o cura propios, +PM, espejos, salpicadura…) | `onResolved`, al terminar la carta |
| Inicio y fin de turno, inicio de ronda | `bindTurnManager` |
| Golpe letal y muerte | `Unit.takeDamage` (`lethalGuard`, `afterDamage`, `onDeath`) |

- `SpellManager.getSpell(id, unit)` devuelve la carta de esa unidad (con charms); sin unidad, la del catálogo.
- `SpellManager.getSpellCost(unit, spell)` da el coste real (Discount Coupon, Trickster's Card, Energy Guru, Fate Maker).
- Solo los **Axies del jugador** llevan runas y charms. El Sapidae y los enemigos no.
- **Tutorial:** no se aplican (su guion es fijo). La arena de pruebas sí los aplica.
- Una runa de otra clase o un charm de clase en una parte de otra clase no se aplican (mismas reglas que la Mochila).

## 3. Decisiones de adaptación (revisar si hace falta)

| Caso | Decisión |
| --- | --- |
| Iniciativa −20 (Paralyzing Glare) y −15 (Paralyzing Jellyfish) | Baja el valor durante una ronda, pero **no cambia el orden de turnos**: el GDD fija la iniciativa al empezar el combate. Hoy no tiene efecto práctico. |
| Sangrado de Hidden Razor y Blood Beetle | El motor hace el daño del sangrado al empezar el turno del afectado, no «al moverse» ni «al final del turno rival». |
| Evasión (Pure Luck, Gates of Unity) | Mecánica nueva: probabilidad de que un golpe a distancia (2+ casillas) de un enemigo no llegue. Tira con el azar de las reglas; el pronóstico la avisa. |
| Prehistoric Armor | El extra del crítico que recibe se reduce a la mitad (×1,5 → ×1,25). |
| White Sage | Los perjuicios duran 1 turno menos, con un mínimo de 1. |
| Pre Order Tag | Sin efecto: en Lunakai las 6 cartas siempre están disponibles. |
| Energy Drink S (Bestia, Acuático y neutral) | +1 PM una vez por turno (regla de las cartas de tempo). |
| Daño «físico» (Sturdy Fighter, Reckless Hunter) | Todo daño de cartas que no sea mágico; los Axies solo hacen daño físico. Reckless (+10 % recibido) cuenta el daño de cartas, no el periódico ni el de colisión. |
| Salpicaduras (Bombshell Maker, Exploding Bombshell) | Solo a enemigos del lanzador, en cruz alrededor del objetivo. |
| «+X de daño a la habilidad» | Se suma al daño de la carta, así que también lo multiplica su nivel. |
| «+X de escudo a la habilidad» (Endurance II, Oak Bud, Faith) | Solo si la carta da escudo (Faith: escudo o curación). |
| Vida extra (runas y charms) | Solo existe en combate: al volver al mundo abierto se descuenta de la vida que queda (mínimo 1). |
| Last Gift | El +1 PA llega en el próximo turno del Sapidae (o al momento si es su turno). |
| Bird's Energy Drink S | Pasa de 2 a 3 PP, como dice la guía. |
| Runas de las clases secretas (Mech, Dawn, Dusk) | No están en la guía: siguen sin efecto («Efecto pendiente de integrar»). |

## 4. Archivos

| Archivo | Cambio |
| --- | --- |
| `src/tactics/combat/RuneCharmEffects.js` | **Nuevo.** Tablas `RUNE_FX` y `CHARM_FX`, `buildCardOverride`, `buildProfile` y `RuneCharmSystem` (todos los ganchos). |
| `src/tactics/Spells.js` | Instancia `runeCharms`; `getSpell(id, unit)`, `getSpellCost`; coste, daño, crítico, perforación, esquiva, Desert Protector, reacciones, curación recibida, empuje y colisión. |
| `src/tactics/combat/EffectResolver.js` | Esquiva, multiplicador de crítico, % de escudos, condición `distAtMost`. |
| `src/tactics/combat/Forecast.js` | Carta de la unidad, crítico, perforación y aviso de esquiva. |
| `src/tactics/Unit.js` | `takeDamage`: `lethalGuard`, `afterDamage`, `onDeath`. |
| `src/main.js` | `setupCombat` al crear las unidades (no en el tutorial), cartas y costes por unidad en el HUD, vida extra descontada al volver. |
| `src/ui/CombatHUD.js` | Coste real, valor con charms y runa, línea «Charms y runa». |
| `src/ui/RunesCharmsPanel.js` | `charmPreview`: «antes → después» de la carta. |
| `src/tactics/combat/SpellPresentation.js`, `CombatEvents.js` | Textos de `runeCharm:proc` y `unit:evaded`; el coste flotante es el pagado. |
| `src/tactics/data/RunesCharms.js` | Descripciones de las 63 runas y los 90 charms; PP de Bird's Energy Drink S. |
| `src/rpg/RuneCharmService.js`, `src/tactics/combat/CombatDebug.js` | `window.lunakaiRuneCharms`; `lkDebug.runes()`, `rune()`, `charm()`. |

## 5. Consola (F12)

| Comando | Qué hace |
| --- | --- |
| `lkDebug.runes()` | Tabla de los Axies con runa o charms en el combate: estadísticas y cartas modificadas |
| `lkDebug.rune('kotaro', 'beast-brutal-claw')` | Equipa una runa (se aplica en el próximo combate) |
| `lkDebug.charm('kotaro', 'horn', 'neutral-deadly-spell')` | Engarza un charm en una parte |

## 6. Pruebas

- **Regresión sin runas ni charms:** las 301 cartas (partes, colección, Bing, Pomodoro y Sapidae) dan los mismos eventos, el mismo estado y el mismo pronóstico que antes: **0 diferencias**.
- **217 comprobaciones** con el `SpellManager` y el `TurnManager` reales: cada una de las 63 runas y de los 90 charms, los PP por clase (con el ejemplo de arriba), la compatibilidad de clases y que el pronóstico coincide con el daño real.
- **Estrés:** las 235 cartas de partes con una runa y un charm cada una, con la presentación instalada y 8 turnos seguidos: sin errores ni valores `NaN`.

## 7. Pendiente

- Probar en partida real y ajustar números (están en `RUNE_FX` y `CHARM_FX`).
- Decidir si las bajadas de iniciativa deben tener otro efecto, ya que el orden de turnos es fijo.
- Dar efecto a las 27 runas de las clases secretas cuando estén en la guía.
