# Hito 60 — Dos idiomas: Fase 2 (historia)

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** traducir la historia (misiones, diálogos de NPC, tutorial y cinemáticas) a los dos idiomas, sin tocar la lógica. Sigue al Hito 59.

## 1. Qué se traduce

| Bloque | Archivos | Módulos (claves por idioma) |
| --- | --- | --- |
| Misiones: título, quién la da, historia, cita, resumen, pasos, globos; textos del rastreador y la navegación | `QuestManager.js` | `quests` (200) |
| Diálogos de NPC: conversaciones, globos, reclutamiento, entregas, revanchas, barquero, mercader, Forja; cargos, títulos y frases de `ZONE_NPCS` | `NPCManager.js`, `MapRegistry.js` | `npc` (124), `npcDefs` (53) |
| Tutorial del Dojo, combate guiado, director del tutorial y tutorial antiguo del mundo abierto | `TutorialScript`, `TutorialManager`, `TutorialDirector`, `OverworldTutorialManager` | `tutorialScript` (78), `tutorialCombat` (58), `tutorialDirector` (56), `tutorialOverworld` (31) |
| Prólogo, vuelo inicial, consejos de la transición a combate, objetos de misión que se recogen, avisos de zona, carteles de victoria | `PrologueCinematic`, `CinematicFlythrough`, `BattleTransition`, `QuestInteractablesManager`, `ZoneTransitionManager`, `OverworldManager`, `DialogSystem` | `prologue` (17), `story` (53) |

Total del juego: **2136 claves por idioma**, las mismas en los dos.

## 2. Nombres de personajes

Los nombres propios no cambian. El cargo sí se traduce: Maestro Paladill / Master Paladill, Cartero / Postman, Guardián de los Pergaminos / Scroll Keeper, Mercader Ochi / Merchant Ochi, Herrero Baruk / Blacksmith Baruk, Cazador Zarek / Hunter Zarek, Herbolaria Rosalba / Herbalist Rosalba, Centinela del Desierto / Desert Sentinel, Ermitaño Glacial / Glacial Hermit, Astrólogo, Oráculo y Sabio Astral / Astral Astrologer, Oracle, Sage, Chamana Espiritual / Spiritual Shaman, Espíritu de Atia / Spirit of Atia. Se unifican «Boreal Chef» → «Chef Boreal», «Lunacian Postman» → «Postman» y «Polar Sage» → «Astral Sage». El mapa de retratos (`NPC_PORTRAIT_MAP`) tiene los nombres nuevos en los dos idiomas.

## 3. Lógica que leía textos (sin cambiar su comportamiento)

- **Navegación y entregas:** `NPCManager` (entrega, icono ❓ del globo, primer paso) y `OverworldManager` (destino de la flecha) deciden buscando palabras dentro del texto del paso («talk», «hablar», «defeat», «gather»…). Ahora buscan en la versión inglesa del texto con `i18n.en(texto)` (nuevo en `i18n.js`), que da el mismo resultado que el original en los 79 pasos y resúmenes en los dos idiomas (comprobado con un script).
- **Cartel de misión completada:** además de COMPLETADA / PURIFICADA / VICTORIA reconoce el texto inglés. En inglés, «QUEST COMPLETED!», «CHIMERA PURIFIED!» y «VICTORY…» salen ahora con el estilo de completada, como en español.
- **Tutorial de combate:** el cambio de «Habilidad de Clase [1]» por el nombre de la carta usa la misma clave en los dos lados. La guía de la Forja reconoce los botones «Evolucionar» y «Recoger» en los dos idiomas (en inglés fallaba desde el Hito 59).
- Las partidas no cambian: solo guardan el estado de las misiones, no los textos.

## 4. Pendiente

- **Fase 3 (datos del juego):** objetos y sus descripciones (también los de recompensa), nombres de enemigos, cartas, runas, habilidades, rarezas, y la clase «Sapidae Adventurer» que sale en un diálogo. En los diálogos los nombres de enemigos y objetos ya van traducidos y habrá que cuadrarlos con los de la Fase 3.
- **Fase 4 (mensajes del sistema).**

## 5. Pruebas

- Español: Libro de misiones, rastreador del HUD y diálogo de Tripp en español. Inglés: los mismos en inglés.
- Consola sin errores. Composición antes/después: `docs/images/i18n_fase2_historia.jpg`.
- Al probar el diálogo se aceptó la misión «La reliquia de Tripp» en la partida de prueba «Auditoria».
