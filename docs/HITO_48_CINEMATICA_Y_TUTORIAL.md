# Hito 48 — Cinemática del prólogo y tutorial nuevo

> **Estado:** completado en la versión de prueba (21-oct-2026).
> **Pedido:** cambiar el tutorial por completo, con diálogos cortos, y hacer una cinemática nueva al estilo de las referencias (vídeo de lore de Axie y presentación de raza de Dofus), con un momento épico al final.

## 1. La cinemática (73 s, se puede saltar con Esc)

Narra el Maestro Paladill (de momento solo subtítulos). Papel envejecido con grano, viñeta y bordes quemados; siluetas hechas con los modelos 3D reales del juego pintados a tinta.

| Tiempo | Plano | Subtítulo |
| --- | --- | --- |
| 0–10 s | Constelaciones doradas de tres Axies sobre papel sepia | «Escuchad, jóvenes Sapidae. Todo empezó con la luz de Atia.» |
| 10–19 s | La luna sale tras el Gran Árbol | «Bajo su luna nació Lunacia… y nosotros con ella.» |
| 19–30 s | Friso de piedra en panorámica: parejas Sapidae + Axie unidas por un hilo dorado | «A cada Sapidae, un Axie. Un vínculo para siempre.» |
| 30–39 s | Rojo: las quimeras avanzan entre humo y brasas | «Pero donde hay vida, llega la corrupción.» |
| 39–47 s | La luna se agrieta y estalla; las esquirlas caen sobre las islas | «La luna se rompió… y sus esquirlas cayeron sobre las islas.» |
| 47–55 s | Tótems con esquirlas; Sapidae y Axies hacen retroceder a las quimeras | «Con ellas resistimos. Con ellas nos hicimos fuertes.» |
| 55–73 s | **Final épico** | ver abajo |

**Final épico:** se alza un Señor de las Quimeras gigante con ojos rojos («Pero la sombra siempre regresa… más grande que nunca»). Entran **tu Sapidae (tu modelo y tu peinado) y tu Axie** («Y una nueva luz se alza para enfrentarla»). La esquirla de luna se enciende en su mano («¡Resonad!»): destello, onda expansiva y la paleta pasa del rojo al oro de la resonancia; la sombra retrocede. Cae el **logo LUNAKAI** con temblor de cámara y polvo dorado. Fundido a negro y el Dojo.

**Música:** `CINEMATICA` y, en el final, `BATTLE_BOSS` desde su parte más intensa (s. 10,5). Efectos con el sintetizador del juego.

## 2. El tutorial (7 fases)

| Fase | Qué pasa | Recompensa |
| --- | --- | --- |
| 1 · Defensa | Paladill da la alarma y empieza el combate guiado (los 8 pasos de siempre). | Espada de madera |
| 2 · Mochila | Abrir la Mochila (I) —el botón se señala— y equipar la espada. | — |
| 3 · Duelo | Combate de entrenamiento contra Paladill. Termina cuando alguien baja al **30 %** de vida: si es él, se rinde. | 50 de oro |
| 4 · Forja | Lote del aprendiz (diente de lobo y lana), talar el Árbol de la Forja, evolucionar la espada, **acelerar ×4 gratis** (Paladill devuelve los bAXS) y recogerla: vuelve equipada. | Espada de hierro |
| 5 · Vínculo | Acariciar al Axie (sin espera en el tutorial) y darle de comer. Paladill presta su resonancia (vínculo al 100 %) para un combate de prueba con la **Ultimate desde la ronda 1**; el botón se ilumina. Al volver, el vínculo vuelve a su valor real. | — |
| 6 · Runas | Runa y charm neutros (Pure Power y Awaken Stamp M); equiparlos en Mochila › Runas (U). | Runa y charm |
| 7 · Graduación | Se abren el mapa (M), los portales, el escuadrón, la tienda y la recolección; se activa la misión de Bing. | 100 EXP |

- **Franja de arriba:** 7 rombos de fase, el paso actual y el botón **«Saltar tutorial»** (pide confirmación y da todo lo que falte: espada de hierro, oro, comida, y deja la runa y el charm equipados).
- **Funciones bloqueadas** hasta su fase, con un aviso: Mochila, Forja, Axie Care, Runas, Escuadrón, Tienda, Mapa y recolección (salvo el árbol de la Forja).
- **Consejo del maestro** en el duelo y en la prueba de la Ultimate (tarjeta arriba en el combate).
- **Tarjetas de recompensa** al terminar cada fase.
- La misión principal 1 pasa a ser «El aprendiz del Dojo», con un paso por fase; la flecha del HUD apunta a Paladill, al árbol o a la Forja según el paso.
- Si se cierra el juego a mitad, al volver se retoma el paso (Paladill repite su conversación).

## 3. Cómo funciona

| Archivo | Qué hace |
| --- | --- |
| `src/rpg/cinematic/PrologueCinematic.js` | **Nuevo.** Motor de la cinemática: escena ortográfica, siluetas de GLB con material de tinta y borde de luz, pasada de papel, subtítulos, música y «Saltar». |
| `src/rpg/cinematic/CinematicArt.js` | **Nuevo.** Arte procedural en Canvas: papel, constelaciones, luna, grietas, Gran Árbol, friso, islas, colinas, tótems, humo, anillos y rayos. |
| `src/rpg/tutorial/TutorialDirector.js` | **Nuevo.** Sustituye a `OverworldTutorialManager` (mantiene su API): pasos, bloqueos, franja, foco, consejo en combate, recompensas, guardado v2 y «Saltar tutorial». |
| `src/rpg/tutorial/TutorialScript.js` | **Nuevo.** Todos los textos (pasos, diálogos, consejos, avisos) y recompensas. |
| `src/ui/lunakai-tutorial.css` | **Nuevo.** Estilos de la cinemática, la franja, la tarjeta de recompensa y el consejo. |
| `src/tactics/LevelsDatabase.js` | Nivel 1 en español con la Espada de madera; niveles nuevos `tut_duel` y `tut_ult`. |
| `src/main.js`, `src/tactics/TurnManager.js` | Combates con configuración propia, regla de fin del duelo (`endRule`), vida no persistente en el tutorial. |
| `src/tactics/combat/UltimateSystem.js` | `minRound` configurable (la prueba la permite en la ronda 1). |
| `src/rpg/OverworldManager.js`, `NPCManager.js`, `QuestManager.js` | Arranque con la cinemática, combates del tutorial, Paladill habla según el paso, misión nueva, textos en español y corrección de `defeat_slimes` → `defeat_slime`. |
| `ForgeService.js` (`grant`), `ForgePanel.js` (`setMode`), `AxieCareService.js` (`cooldownFree`), `AxieCarePanel.js`, `GatheringHUD.js`, `ShopPanel.js`, `RunesCharmsPanel.js`, `InventoryModal.js`, `SaveSlotManager.js`, `MusicManager.js` (`startAt`) | Ganchos del tutorial. |

**Guardado:** `slot.tutorialProgress = { v: 2, step, done, flags, bondBefore }`. Las partidas con el progreso del tutorial antiguo, o de nivel > 1, cuentan como terminadas.

**Consola:** `lunakaiTutorial.state()`, `.reset()`, `.goto('forge_talk')`, `.skip()`; `lunakaiCinematic.seek(55)` durante la cinemática.

## 4. Pruebas

En el juego (navegador integrado, partida nueva): cinemática completa (capturas en `scratch/cine/`), alarma de Paladill, combate guiado → Espada de madera, equiparla, duelo hasta el 30 % (Paladill se rinde, 50 de oro), lote, tala, evolución con ×4 (bAXS devueltos) y recogida (espada de hierro equipada), caricia + comida (vínculo 68 → 81 %), prueba de la Ultimate en la ronda 1 (vínculo restaurado a 81 %), runa y charm, graduación (misión de Bing activa, mapa abierto). También: retomar a mitad tras recargar, «Saltar tutorial» y una partida antigua («Auditoria») cargada sin tutorial.

## 5. Correcciones (21-oct, tarde)

- **La cinemática se veía en negro.** El velo negro que tapa la pantalla al empezar la partida nueva seguía encima del canvas durante toda la cinemática. Ahora se quita en cuanto empieza y vuelve a ponerse al terminar, para pasar al Dojo sin saltos.
- **Carga visible:** mientras se cargan los modelos de la cinemática (unos segundos) sale «Abriendo la crónica…» con una barra de progreso, en vez de una pantalla negra.
- **Ritmo con pocos FPS:** el reloj de la cinemática admite pasos de hasta 0,25 s, así que no se queda atrás de la música en equipos lentos.

## 6. Pendiente

- Voz de Paladill para la narración.
- El Dojo de noche al terminar la cinemática (ahora se vuelve al Dojo con su luz normal).
- Las runas y los charms no tienen inventario propio: la recompensa es simbólica (todos se pueden equipar).
