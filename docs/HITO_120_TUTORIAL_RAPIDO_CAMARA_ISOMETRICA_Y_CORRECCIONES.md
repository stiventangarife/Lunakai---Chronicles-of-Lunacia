# Hito 120: Tutorial rápido, cámara isométrica de combate y correcciones

> **Estado:** probado en el juego real por el usuario el 3-nov-2026 (todos los puntos de este documento). Sintaxis comprobada con `node --check`.
> **Pedido:** revisar el clic sobre los modelos, el temporizador y el vínculo del tutorial, poner la cámara de combate isométrica y fija, reformular el tutorial en un recorrido corto con un combate final, y corregir lo que fue saliendo al probarlo.
> **Reglas respetadas:** sin bundlers, three r160 de `vendor/`, alcance = `AL`, textos por `i18n.t()` en español e inglés, sin crear materiales ni luces en caliente. No se tocó nada de `assets/` (no hace falta subir `ASSET_VERSION`).

## 1. Combate: clic, temporizador y cámara

| Qué | Cómo | Dónde |
|---|---|---|
| **Clic sobre el modelo = clic en su casilla** | Con una carta elegida, el rayo del ratón se prueba contra una caja por unidad (alto y medio ancho medidos una vez de la geometría en reposo, sin esqueleto). Gana la unidad más cercana a la cámara que sea objetivo válido; si solo corta modelos que no lo son, la del más cercano (no la del suelo de detrás). Las cajas se miden detrás del velo al empezar el combate. | `main._cellUnderCursor`, `main._unitPickShape` |
| **Sin temporizador en el tutorial** | El reloj de turno no corre en los combates del tutorial. | `TurnTimerHUD.js`, `main.js` |
| **Cámara isométrica fija** | FOV 14 (antes 36) con la distancia compensada (`ISO_K`), ángulo fijo en diagonal. `Q`/`E` giran 90°. Arrastrar con **clic derecho o rueda pulsada** desplaza la cámara. | `SceneManager.js` |
| **Opción «Cámara de combate»** | Fija (por defecto) / Mis unidades / Cada turno. Se guarda en la clave `combatCam`; `SceneManager.focusOnTurn` la respeta. | `AccessPrefs.js`, `SettingsModal.js`, `TurnManager.js` |
| **Combate 1 del tutorial girado** | Empieza como si se hubiera pulsado `Q` (`sceneManager.rotateLeft()` antes del precalentado), para ver de frente el lado del Sapidae y del Axie. `R` vuelve al ángulo normal. | `main.js` (antes de `_prewarmBattle`) |

## 2. Tutorial rápido (mundo abierto)

Recorrido nuevo (`rpg/tutorial/TutorialScript.js`, `STEPS` / `ORDER`):
defensa del Dojo → Mochila (equipar la espada) → Forja → vínculo (acariciar y dar de comer) → runas y charm → **combate final contra el Slime Caballero** → graduación → mapa del archipiélago → mundo libre.

- **Combate 1 guiado:** orden de turnos Sapidae → Slime → Axie → Guardián (`turnManager.alternateTeams`). Sin tarjeta de recompensa repetida al terminarlo.
- **Duelo con Paladill:** pasa a ser un entrenamiento **opcional** al hablar con él; más fuerte y hasta 0 % de vida (`tut_duel`, `CombatEndScreen` con `restart: 'secondary'`).
- **Forja:** texto de demostración.
- **Partidas guardadas a mitad:** `LEGACY_STEPS` lleva cada paso del tutorial anterior a su equivalente.
- **Vínculo del tutorial:** 92 → 97 → 100 %. No baja con el tiempo durante el tutorial (`AxieCareService._bondLocked`) ni en sus combates (`noBondLoss`), y se fija al 100 % al entrar en el paso `boss`.
- **Panel de cuidados:** la cuenta atrás de la caricia solo actualiza los textos (`updatePetCountdown`), el panel no se mueve durante el tutorial y el señalador vuelve a buscar el botón si el panel se repinta (antes a veces el clic en la mandarina no llegaba).
- **Graduación:** la tarjeta no se cierra sola (`RewardCard` con `autoCloseMs: 0`); el mapa del archipiélago se abre después de cerrarla.

### Combate final: Slime Caballero (`tut_boss`)

| Punto | Valor | Dónde |
|---|---|---|
| Posición en el mundo | (-2.4, -6.1); tras perder se vuelve a (-12.2, -8.0) | `WanderingMonsters.spawnTutorialKnight`, `TutorialDirector` |
| Vida / daño | 650 de vida, `damageMult: 2` | `LevelsDatabase.js`, `Spells._applyDamageModifiers` |
| Rastro de Miasma | Casillas infectadas 3 rondas; terminar el turno en una quita el 50 % de la vida máxima (`endTurnHpPct: 0.5`) | `Spells._placeMiasma`, `BattlefieldObjects.onTurnEnd` |
| Ultimate | Disponible con el vínculo al 100 %; la franja de consejos avisa en la ronda 2 | `TutorialDirector`, `UltimateSystem` |
| Mapa | `forest_great_roots` (cerca del Gran Árbol de Atia) | mapas de combate por bioma |
| Tras ganar | No reaparece (`_knightDown`); paso `defeat_knight` de la misión | `WanderingMonsters`, `QuestManager` |
| Tras perder | El botón principal reintenta al momento (`restart: 'swap'`) | `CombatEndScreen`, `main._endSwap` |

## 3. Mapa del mundo y nombres

- **Coordenada en lugar del nivel** bajo el nombre de cada tierra, en el mismo formato que las misiones: Bosque [2, 2], Sabana [3, 2], Ártico [2, 1], Mística [1, 2], Genesis [2, 3]. Se saca de `zoneId` (`zone_3_2` → `[3, 2]`; si no, `gridPos` + 1). Clave `worldMap.coordN`. El nivel recomendado sigue en la ficha lateral y la tarjeta conserva el aviso de dificultad. → `WorldMapModal._coordLabel`
- **Puntos de interés del Bosque:** quitados Valle del Dojo, Pueblo del Bosque y Santuario del Portal Antiguo (quedan la tienda, la forja y el Árbol de Atia). → `MapRegistry.js`
- **«Isla» → «Tierra»** en el mapa, el barquero, Paladill, el HUD (`Mapa de la tierra [M]`), las misiones y el origen de los materiales: Tierra del Bosque, Tierra de la Sabana, Tierra del Ártico, Tierra Mística, Tierra de Genesis. En inglés, «Island» → «Land». Se mantienen a propósito la frase del prólogo («cayeron sobre las islas») y «Islas flotantes» en la descripción de la Mística. `_shortName` reconoce los dos prefijos. → `i18n/{es,en}/places, worldMap, forge, misc, npc, hud, quests, items`

## 4. Guía del combate tutorial

- **Flecha dorada:** en una casilla vacía queda a 0,4 del suelo; sobre una unidad, 0,3 por encima de su cabeza (alto medido con `_unitPickShape`). El aro dorado va pegado al suelo (antes subía y bajaba con la flecha). → `TutorialManager.showArrowAt`, `update`
- **«Pasar turno»** conserva su forma y solo parpadea (`lk-tut-blink`). → `TutorialManager._markUi`, `lunakai-tutorial.css`
- **Tarjeta «¡Buen trabajo!»:** una vez cerrada no vuelve a abrirse en cada turno (cada inicio de turno llamaba a `_renderStep`). Bandera `_freeDismissed`, que se borra al empezar o terminar un combate guiado. → `TutorialManager.js`
- **Texto de Paladill antes del jefe:** «Vuestro vínculo está completo: la Ultimate ya está disponible (tecla 7).» → `tutorialScript.dialog.ultimate.2`
- **Ultimate solo para el Sapidae:** el botón no aparece en el turno del Axie principal. → `UltimateButton.paintUltimate`

## 5. Rastro de Miasma: aviso y aspecto

- **Pronóstico:** al pasar el ratón por una casilla infectada en tu turno, «−50 % de vida (−158) si terminas aquí» (la cifra sale de la vida máxima de la unidad del turno). Un solo `div.lk-zone-warn` reutilizado, colocado sobre la casilla; se oculta con `_hideForecast`. Clave `combatFx.miasmaWarn`. → `main._showZoneWarn`, `lunakai-ui.css`
- **Aspecto:** base morada saturada (`0x9d12ff`, opacidad 0,55, encima del azul de movimiento), humo con textura que gira y 3 burbujas por casilla que suben y revientan. Materiales y geometrías compartidos (`MIASMA` en `SpellPresentation.js`); un solo bucle `requestAnimationFrame` mientras quede miasma, que se para solo. → `SpellPresentation._buildMiasma`, `_startMiasmaAnim`

## 6. Árboles transparentes sobre las unidades

Un árbol que tapa a una unidad o la tiene bajo su copa se vuelve transparente entero (tramado, `aFade` por instancia) sin depender del ratón: la decoración hasta un 15 % visible y los árboles que son obstáculos del tablero hasta un 40 %. La copa y la altura de cada árbol se miden una vez de su `boundingSphere`; cuánto tapa depende de la pendiente de la cámara. Se usan los puntos `u:` que ya calcula `main._occlusionPoints`. → `BattleArena._setupOcclusionFade`, `_updateOcclusionFade`

## 7. Rendimiento: precalentado del combate (tirones)

Todo detrás del velo en `main._prewarmBattle` (se añaden a la escena en y = -60 antes de `warmupRender` y del fotograma completo, y se quitan en el `finally`):

| Grupo | Qué prepara | Antes daba tirón en… |
|---|---|---|
| `Unit.deathFxWarmGroup()` | núcleo opaco, partícula transparente y una malla transparente de dos caras | el primer KO; los choques del empuje y el remate al lanzar la Ultimate |
| `GridManager.decalWarmGroup()` | una marca de impacto por tipo (mapa, transparente, dos caras) y sus texturas | el primer golpe que deja marca |
| `miasmaWarmGroup()` (`SpellPresentation.js`) | base, humo (y su textura) y burbuja del miasma, con sus materiales exactos | la aparición del Rastro de Miasma |

- Los efectos de muerte (`DEATH_FX`) y el anillo y las chispas de `spawnImpactVFX` usan geometrías compartidas (antes se creaban y subían a la GPU en cada golpe).
- `ProgramKeepAlive` evita que se borren los programas de los materiales que se destruyen, así que lo precalentado sigue valiendo.

## 8. Misión del Dojo

`TutorialDirector._syncQuest` marcaba los pasos sobre la copia que devuelve `QuestManager.getQuest()` (textos formateados) y no cambiaba nada: el panel seguía en «Fortalece el vínculo con tu Axie» durante el combate final. Ahora usa la misión original (`qm.quests[QUEST]`). Las partidas ya empezadas se ponen al día en el siguiente cambio de paso.

## 9. Prueba

- Combate 1: la cámara empieza girada (como `Q`); flecha baja en las casillas y sobre el Slime; aro en el suelo; «¡Buen trabajo!» sale una vez.
- Slime Caballero: Paladill dice el texto nuevo; al pasar el ratón por lo morado sale el aviso con la cifra; el miasma se distingue del azul; en el turno del Axie no hay botón de Ultimate.
- Mapa [M]: coordenadas bajo cada tierra, «Tierra de…», sin los tres puntos del Bosque.
- Panel de misión: avanza con cada paso del tutorial.

## 10. Pendiente

- Nada. Si en el futuro vuelve algún tirón en combate: `lkDebug.perf.start(180)` → reproducirlo → `lkDebug.perf.export()` (ver `framesLargos`) y añadir el material que falte a un grupo de precalentado de `main._prewarmBattle`.
