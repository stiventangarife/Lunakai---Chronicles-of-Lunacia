# Hito 124: Misión «El mercader del Dojō» (Ochi)

> **Estado:** programado el 4-nov-2026 (v0.5.0). Probado en Node con el flujo completo (26 comprobaciones). Falta la prueba en el navegador y aplicar la migración `20261111000000_quest_merchant_ochi.sql` en Supabase.
> Plan: `docs/PLAN_MISION_OCHI.md`.

## Qué es

Una misión principal corta (2–3 min) entre la graduación del Dojō y Bing. Enseña la economía sin alargar el tutorial: oro, Tienda, Mercado entre jugadores y equipo.

```
1 · quest_slime_purification (tutorial, Paladill)
2 · quest_merchant_ochi      (NUEVA · Ochi, delante de la tienda del pueblo)
3 · quest_prove_ferocity     (Bing, Sabana del Este)
4…11 · el resto de la historia (antes 3…10)
```

1. Al graduarse, Paladill dice «Antes de partir, habla con el mercader Ochi». El rastreador ya apunta a Ochi, y si se habla otra vez con Paladill, lo repite.
2. **Ochi** explica el oro, la Tienda y el Mercado («lo que yo no compro, como las runas y los charms, ponlo en el Mercado para que otros Sapidae te lo compren»). Da un **monedero de aprendiz**, que completa el oro hasta 60, y abre la Tienda con el **Yelmo Bestial** resaltado y una franja de misión.
3. **Compra un casco**: vale cualquier casco; la Tienda solo vende el Yelmo Bestial (60 de oro).
4. **Póntelo**: la franja cambia a «¡Comprado! Ahora póntelo» con el botón *Abrir Mochila*. En este paso no hay flecha.
5. **Vuelve con Ochi**: recompensa de **80 de oro + 2 pociones de vida pequeñas + 50 de exp.**, y se desbloquea la misión de Bing.

## Archivos

| Archivo | Cambio |
|---|---|
| `src/rpg/quests/OchiQuest.js` | **Nuevo.** Lógica de la misión: diálogos de Ochi por paso, monedero, avance por compra (`ShopService.onBuy`) y por equipo (estado del Sapidae, también si ya llevaba casco), tarjetas de recompensa y guía de la Tienda. |
| `src/rpg/QuestManager.js` | Misión `quest_merchant_ochi` (order 2). Las siguientes suben un puesto. Cadena (`nextMainQuestMap`, `mainQuestIds`), flecha a Ochi (`getNavigationTarget`) y migración de partidas. Las recompensas con `stack: true` dan todas las copias. `quest_hostile_sands` da 3 colas de quimera y 3 de cobre en lugar del yelmo. |
| `src/rpg/ShopService.js` | `onBuy(fn)` (aviso de cada compra, también con cuenta) y `ensureStock(shop, id, n)`. |
| `src/ui/ShopPanel.js` | `open(shopId, { guide })`: franja de misión encima de la rejilla, objeto resaltado y seleccionado (pestaña Equipo) y botón de acción. |
| `src/rpg/NPCManager.js` | Ochi consulta primero `ochiQuest.handleOchi()`. Paladill manda con Ochi mientras falte hablar con él. |
| `src/rpg/OverworldManager.js` | Crea `this.ochiQuest` y quita la flecha en el paso «póntelo». |
| `src/rpg/tutorial/TutorialScript.js` | `REWARDS.ochiPurse = 60`. Textos de graduación y del cartel final: ahora mandan con Ochi. |
| `src/tactics/ItemDatabase.js` | El Yelmo Bestial ya **no cae en combate** (`TIER_DROPS`, `LEVEL_DROPS`). Se consigue en la Tienda o en la Forja. |
| `src/i18n/{es,en}/quests.js`, `npc.js`, `tutorialScript.js` | `quests.merchantOchi.*`, `npc.ochi.*`, `npc.paladill.goOchi`, Bing bloqueado («pásate antes por Ochi»), graduación. |
| `supabase/migrations/20261111000000_quest_merchant_ochi.sql` | **Nueva.** `reward:tut:ochi_purse` (60 con `meta = 1`, es decir, «completa hasta») y `reward:quest:quest_merchant_ochi` (80). |
| `tools/gen_catalog.mjs` | Incluye `reward:tut:ochi_purse`. La recompensa de la misión ya la saca de QuestManager. |

## Oro y servidor

- Al graduarse se tienen unos 50 de oro (`tut:duel`). El casco vale 60 (`buy:beast_helmet`, igual en el cliente y en el servidor).
- El monedero **completa hasta 60**, no suma 60: el que ya tiene oro no recibe nada y nadie puede sacar oro con él.
  - **Con cuenta:** `economy_reward('tut:ochi_purse')`, una vez por ranura (`economy_reward_claims`).
  - **Sin cuenta:** se completa en el cliente al marcar «hablar con Ochi». Ese paso se guarda, así que también ocurre una sola vez.
- La recompensa final la paga `claimRewards` (`reward:quest:quest_merchant_ochi` con cuenta). Las pociones las da el cliente, como los demás objetos de misión.

## Partidas existentes

- **Partida guardada sin esta misión con Bing ya desbloqueado o más adelante:** Ochi queda **completada**, sin recompensa. El jugador sigue donde estaba.
- **Partida en mitad del tutorial:** no cambia nada. Al graduarse (o con «Saltar tutorial») se activa Ochi.
- **Ruta antigua por nivel del héroe** (partidas sin progreso de misiones): con nivel ≥ 2, Ochi completada.

## Pruebas

- **Node:** flujo completo con el código real de QuestManager, ShopService y OchiQuest (26 comprobaciones). Cubre:
  - bloqueo inicial y la cadena;
  - el monedero (+10 con 50 de oro, y que no se repite);
  - que comprar comida o comprar antes de hablar no cuenta;
  - la compra y el equipo, y la recompensa (80 de oro y 2 pociones);
  - el desbloqueo de Bing, guardar y cargar, y las 3 migraciones;
  - que el yelmo no cae como botín.
- **Navegador (pendiente):**
  - partida nueva: tutorial → Ochi → Bing;
  - «Saltar tutorial»;
  - con cuenta (el oro lo paga el servidor) y como invitado;
  - recargar en cada paso;
  - ir a la Sabana antes de tiempo (Bing dice que pases por Ochi).

## Puesta en marcha

1. Subir `src/` al hosting y purgar la caché.
2. Aplicar `supabase/migrations/20261111000000_quest_merchant_ochi.sql` en el SQL Editor de Supabase. **Es obligatoria:** sin ella, con cuenta, el monedero y la recompensa responden `unknown_reward` y no se paga oro, así que un jugador con menos de 60 de oro no podría comprar el casco. Como invitado funciona sin migración.
3. No hay que volver a desplegar el árbitro PvP: no cambia ninguna regla de combate.
