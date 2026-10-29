# Hito 98: Habilidades que se desbloquean al subir de nivel

> **Estado:** en la versión de prueba (28-oct-2026), pendiente de probarlo en el juego.
> **Pedido:** los héroes empezaban con sus 6 habilidades. Ahora solo 3 a nivel 1, y el resto al subir: cuernos a nivel 3, espalda a 7 y cola a 10; igual para el Sapidae.
> **Decisiones del usuario:** el orden actual de las habilidades del Sapidae está bien · se aplica a todas las partidas por igual · la curva de experiencia no cambia.

## 1. Reglas (`src/tactics/combat/SkillUnlocks.js`)

| Nivel | Axie (por tipo de parte) | Sapidae (por posición en su clase) |
|---|---|---|
| 1 | Ojos, orejas, boca | Ataque, gólem y 3.ª habilidad |
| 3 | Cuernos | 4.ª |
| 7 | Espalda | 5.ª |
| 10 | Cola | 6.ª |

| Clase | Nivel 3 | Nivel 7 | Nivel 10 |
|---|---|---|---|
| Alfarero de Gólems | Muralla de Arcilla | Llevar al Herido | Fortificar |
| Comandante de Sombrero | Orden Compartida | Retirada Guiada | Relevo |
| Guardián de Campanas | Susurro de Advertencia | Purificar | Luna de Sangre |
| Rastreador Gogo | Marcha del Caparazón | Grieta Corrupta | Espiral del Alba |

- **Constantes:** `PART_UNLOCK_LEVEL` = { horn: 3, back: 7, tail: 10 } y `SLOT_UNLOCK_LEVEL` = [1, 1, 1, 3, 7, 10].
- **Axies:** el bloqueo va por la **parte** de la carta (`spell.part`), no por su posición. El tutorial reordena las cartas, y las variantes, las colecciones y las cartas iniciales de Bing y Pomodoro conservan su parte. Las cartas sin parte (hechizos antiguos) se bloquean por posición, igual que el Sapidae.
- **A quién afecta:** solo a los héroes del jugador. Cada unidad recibe `heroLevel` en `main.js`, a partir de `getProgression(id).level`. Los enemigos, los gólems, las unidades sin nivel y la Definitiva no se bloquean.
- **Partidas guardadas:** se aplica a todas por igual. Un héroe de nivel bajo pierde las cartas de sus partes altas hasta subir.

## 2. Combate

- `SpellManager.castBlockReason` devuelve `'locked'` antes que `'spent'` o `'cooldown'`. Así `canCastNow`, las casillas válidas, `castSpell`, la IA y el tutorial lo respetan.
- Métodos nuevos: `unlockLevel(u, s)` e `isLocked(u, s)`.
- Las cartas no cambian de ranura ni de tecla. La bloqueada sale en gris con un candado y «Nv. N» (`.lk-lock-badge`, `data-locked`), sin el número de daño. Su ficha dice «Bloqueada: se desbloquea a nivel 3 (Cuerno).».
- **Tutorial:** la carta que se pone en la ranura [1] (`tutorialCardOrder`) se elige solo entre las desbloqueadas a nivel 1.
- **Arena de pruebas:** la carta que se prueba con `lkDebug.probar` siempre está desbloqueada (`_unlockAll`).

## 3. Interfaz fuera del combate

- **Fin de combate:** al subir a 3, 7 o 10, el héroe muestra «✦ ¡Nueva habilidad! Nombre (Parte)». Los de apoyo muestran «✦ +1 habilidad» (`newlyUnlocked` en `main.js` → `CombatEndScreen`).
- **Creador de personaje:** las 6 habilidades de la clase y las 6 cartas del compañero se ven, pero las de nivel 3, 7 y 10 llevan candado y «Nv. N»; la ficha explica cuándo se desbloquean.
- **Escuadrón:** sin cambios (a petición del usuario, las partes se ven como siempre).
- **Textos:** `game.spellLocked`, `game.levelShortN`, `combatHud.lockedAt`, `combatHud.lockedAtPart` y `combatEnd.newSkill(s)` / `newSkillShort`, en español e inglés.

## 3b. Runas y charms (añadido después)

- **Panel** (`ui/RunesCharmsPanel.js`): las partes cuya habilidad aún está bloqueada salen en gris, con «🔒 Nv. N» y un candado en el hueco del charm. No se pueden elegir ni recibir charms (clic, clic en la estantería o arrastrar) y avisan «Esta habilidad se desbloquea a nivel N: hasta entonces no se le pueden poner charms.». La ficha de la habilidad lo dice en rojo. La parte elegida pasa sola a una desbloqueada.
- **Partidas antiguas** con un charm ya puesto en una parte bloqueada: se ve «charm inactivo» y se puede quitar.
- **Combate** (`RuneCharmSystem.setupCombat`): los charms de partes bloqueadas no se aplican (ni a la carta ni a las estadísticas) hasta que el Axie llega al nivel.
- **Textos:** `runesPanel.lockedPart`, `lockedSkill`, `lockedCharm` y `charmInactive`.
- **Prueba** (`_test/runes-lock.html`): 8 de 8 (gris a nivel 1, hueco bloqueado, equipar en una parte libre, charm de la cola ignorado a nivel 1 y aplicado a nivel 10, marcado como inactivo y se puede quitar, cuernos libres a nivel 3).

## 4. Pruebas

- **Banco nuevo** (`_test/unlock-test.js`, módulos reales): 21 de 21.
  - Bing a nivel 1, 2, 3, 7 y 10;
  - el bloqueo por parte se mantiene con las cartas reordenadas;
  - las 4 clases del Sapidae en los niveles 1, 2, 3, 6, 7, 9 y 10;
  - sin bloqueo para enemigos ni para unidades sin nivel;
  - la Definitiva nunca se bloquea;
  - `newlyUnlocked` (Bing 2→7 = cuernos y espalda; Guardián 9→10 = Luna de Sangre).
- **Bancos anteriores:** gólems 123 de 123, recargas 31 de 31, equipo 10 de 10.
- **Juego real** (arena con un héroe de nivel 1): las cartas 4–6 salen con candado y «Lv. 3 / 7 / 10», y la ficha dice «Locked: unlocks at level 3 (Horn).».
- **Consola:** `lkDebug.nivel("kotaro", 7)` cambia el nivel del héroe (guardado y en combate) para probar los desbloqueos.
