# Plan — Misión «El mercader del Dojō» (Ochi)

> Estado: **programado** (4-nov-2026, v0.5.0). Resumen, archivos y pruebas: `docs/HITO_124_MISION_OCHI.md`.
> Decisiones del usuario: sin paso de venta (Ochi solo menciona el Mercado); recompensa de 80 de oro **+ 2 pociones de vida pequeñas**; el Yelmo Bestial (el casco calabaza) **deja de caer en combate**.
> Objetivo: enseñar la economía del juego (oro → Tienda → equipo) justo después del tutorial, sin alargar el tutorial.

## 1. Resumen

Nueva misión **principal** entre la graduación del Dojō y la misión de Bing:

```
quest_slime_purification (tutorial, Paladill)
        └─► quest_merchant_ochi  ← NUEVA (Ochi, patio del Dojō)
                └─► quest_prove_ferocity (Bing, sabana)
                        └─► … resto de la historia sin cambios
```

Flujo del jugador (2–3 minutos):

1. Tras la tarjeta de graduación, **Paladill**: «Antes de partir, habla con el mercader Ochi». El rastreador de misiones ya apunta a Ochi.
2. **Ochi** explica en 3 frases cómo funciona el oro, da un **monedero de aprendiz** (completa hasta 60 de oro) y abre la Tienda con el **Yelmo Bestial** seleccionado.
3. El jugador **compra** el casco (60 de oro).
4. El jugador **se lo pone** (Mochila, tecla I). Se ve en el Sapidae en el mundo: es la recompensa visual inmediata.
5. Vuelve a **Ochi** → entrega → recompensa (oro) → Ochi lo manda con Bing en la sabana.

## 2. Datos de la misión (`src/rpg/QuestManager.js`)

```js
quest_merchant_ochi: {
  id: 'quest_merchant_ochi',
  category: 'Principal',
  order: 2,
  title: i18n.t('quests.merchantOchi.title'),          // «El mercader del Dojō»
  giver: { id: 'merchant_ochi', name: 'Ochi' },         // id real del NPC: confirmar en su definición
  status: 'locked',
  objective: { steps: [
    { id: 'talk_ochi',    desc: i18n.t('quests.merchantOchi.step.talk'),   done: false },
    { id: 'buy_helmet',   desc: i18n.t('quests.merchantOchi.step.buy'),    done: false },
    { id: 'equip_helmet', desc: i18n.t('quests.merchantOchi.step.equip'),  done: false },
    { id: 'report_ochi',  desc: i18n.t('quests.merchantOchi.step.report'), done: false },
  ] },
  rewards: { gold: 80, items: [] },
}
```

Cambios en el mismo archivo:

| Sitio | Cambio |
|---|---|
| `order` de las misiones principales | Bing pasa de 2 → 3, y todas las siguientes +1 (hasta `quest_primeval_purification` = 11). `isMainQuestUnlocked` (línea ~780) funciona con `order - 1`, así que no cambia. |
| `nextMainQuestMap` (~956) | `quest_slime_purification → quest_merchant_ochi`, `quest_merchant_ochi → quest_prove_ferocity`. |
| `mainQuestIds` (~998) | Insertar `quest_merchant_ochi` en 2.º lugar. |
| `getNavigationTarget` (~1048) | Rama nueva: pasos `talk_ochi` y `report_ochi` → flecha a Ochi. En `buy_helmet` y `equip_helmet` no hay flecha (son de interfaz, igual que los pasos de Mochila y runas: `OverworldManager` ~2082). |
| `loadSaveData` (~1318) | Migración de partidas viejas (ver §6). |
| QuestBook | No necesita nada: ordena por `order` (`QuestBookModal.js:145`). |

## 3. Detectar la compra y el equipo

**Compra** — `src/rpg/ShopService.js`, `buy()` (~135): es el único camino, porque `buyAsync` termina en `buy(..., { serverPaid: true })`. Al final, si todo ha ido bien:

```js
this._emit('buy', { shopId, id, qty, it });   // lista de oyentes mínima: ShopService.on('buy', fn)
```

QuestManager (o un pequeño `OchiQuest.js` en `src/rpg/quests/`) escucha: si la misión está activa, `talk_ochi` está hecho y `it.slot === 'hat'` → `advanceStep('quest_merchant_ochi', 'buy_helmet', true)`.
Se acepta **cualquier casco** de la Tienda, no solo `beast_helmet`. Así la misión no se rompe si mañana cambia el stock.

**Equipo** — `src/tactics/EquipmentManager.js`, `equipItem(heroId, slot, itemId)` (~658): mismo patrón (`on('equip')`). Con `heroId === 'sapidae'`, `slot === 'hat'` y `buy_helmet` hecho → `equip_helmet`.

**Caso «ya lo tenía»**: al activarse cada paso se comprueba el estado actual. Si el jugador ya compró el casco o ya lo lleva puesto, el paso se marca solo. Esto evita misiones atascadas.

## 4. Ochi (`src/rpg/NPCManager.js`, `_handleMerchantInteraction` ~580)

Antes del saludo de siempre, se mira la misión:

| Estado de la misión | Ochi dice | Al cerrar el diálogo |
|---|---|---|
| activa, `talk_ochi` sin hacer | 3 frases: el oro se gana en combates y misiones; aquí compras equipo, comida y pociones; vendes lo que te sobra; «toma este monedero, cómprate ese yelmo» | `talk_ochi` ✔ · monedero (§5) · Tienda abierta en la pestaña Equipo con el yelmo seleccionado |
| `buy_helmet` hecho, `equip_helmet` no | «¡Te queda pequeño en la mochila! Póntelo (tecla I).» | Abre la Mochila en la ranura del casco |
| los 3 pasos hechos | «¡Ahora pareces un aventurero!» + pista: Bing te espera en la sabana | `report_ochi` ✔ → `completeQuest` → recompensa → se desbloquea Bing |
| cualquier otro caso | saludo actual (`npc.merchant.greet`) | Tienda |

**Ayuda visual en la Tienda** (`src/ui/ShopPanel.js`): `open(shopId, { focus: 'beast_helmet' })` → `SH.tab = 'gear'`, `SH.sel = id`, y la clase `lk-quest-pulse` en la fila del casco (anillo dorado, la misma estética del foco del tutorial). Se quita después de la compra.
**Stock garantizado**: mientras `buy_helmet` siga pendiente, `ShopService._state` asegura al menos 1 casco en el stock (el yelmo tiene stock 2 y se repone cada 6 h).

## 5. Oro: que siempre alcance

Al graduarse, el jugador tiene unos 50 de oro (`tut:duel`) más lo que haya caído en combates, pero el yelmo vale 60 (`PRICE_BY_TIER[1] × común`). La solución es un **monedero con tope**: el servidor ya lo soporta con `meta = 1` en el catálogo, que es el mismo mecanismo de `tut:slp_topup`. El catálogo da «lo que falte hasta N», una sola vez por ranura (`economy_reward_claims`), así que no se puede repetir para sacar oro.

Nueva migración `supabase/migrations/20261111000000_quest_merchant_ochi.sql`:

```sql
insert into public.economy_catalog (key, gold, slp, baxs, meta) values
  ('reward:tut:ochi_purse', 60, 0, 0, 1),                  -- completa hasta 60 de oro
  ('reward:quest:quest_merchant_ochi', 80, 0, 0, null)     -- recompensa al entregar
on conflict (key) do update set gold = excluded.gold, meta = excluded.meta;
```

Cliente:
- **Con cuenta**: `EconomyService.reward('tut:ochi_purse')`, con el mismo patrón que `_grantDuelGold` (`TutorialDirector.js:746`), incluido el respaldo `unavailable`.
- **Sin cuenta**: `if (gold < 60) addGold(60 - gold)`, marcado en los flags de la ranura para darlo una sola vez.

La recompensa final ya la paga `completeQuest` → `EconomyService.reward('quest:quest_merchant_ochi')` (`QuestManager.js:865`), sin código nuevo.

> Hay que comprobar que el precio de `shop:beast_helmet` en el catálogo del servidor sea 60, igual que el del cliente.

## 6. Partidas existentes (migración)

`loadSaveData`:
- **Ranura guardada sin `quest_merchant_ochi`** (partidas de antes de esta versión): si `quest_prove_ferocity` **no** está `locked`, se marca la misión de Ochi como `completed` (el jugador ya había pasado de ahí). Si no, queda `locked` o `active` según el tutorial.
- **Ruta antigua por `heroLevel`** (~1342 y ~1364): con `heroLevel >= 2`, además de `quest_slime_purification` también se añade `quest_merchant_ochi` a las completadas. Los bloques de pasos por nivel no cambian, porque apuntan a ids, no a `order`.
- **Partida en mitad del tutorial**: no hay que hacer nada. Al graduarse, `completeQuest` desbloquea Ochi.
- **«Saltar tutorial»**: igual, llama a `completeQuest(QUEST)` → Ochi se activa.

## 7. Paladill y la graduación (`src/rpg/tutorial/`)

- `TutorialScript.js` · `DIALOGS.graduation`: añadir una frase final que mande al jugador con Ochi.
- Después de la invitación al feedback (`_askFeedback`), un **globo de Paladill** (no un diálogo que bloquee): «Habla con el mercader Ochi, en el patio». El rastreador ya está en la misión nueva, porque `completeQuest` hace `trackedQuestId = next`.
- Diálogo genérico de Paladill mientras la misión de Ochi está activa: una línea que lo vuelve a indicar.
- `npc.recruit.bingLocked` (es y en): ahora dice «Ochi te busca en el Dojō» en lugar de «completa tu entrenamiento».

## 8. Textos (i18n es / en)

- `src/i18n/{es,en}/quests.js`: `quests.merchantOchi.{title, desc, step.talk, step.buy, step.equip, step.report}`.
- `src/i18n/{es,en}/npc.js`: `npc.ochi.{intro1, intro2, intro3, equipHint, turnIn1, turnIn2}`, `npc.paladill.goOchi`.
- `src/i18n/{es,en}/tutorial*.js`: la frase nueva de la graduación.

## 9. Riesgos y comprobaciones

| Riesgo | Mitigación |
|---|---|
| El jugador va directamente a la sabana | Bing ya bloquea con `isMainQuestUnlocked` y su texto nuevo manda a Ochi. **Hay que verificar** la emboscada `mob_bing_ambush` (`OverworldManager.js:1650`): con la misión bloqueada, `advanceStep` no avanza (~811), pero hay que comprobar que la pelea no salte. |
| Código que mira `order` | Solo `isMainQuestUnlocked` y QuestBook; los dos usan orden relativo. Las comprobaciones de Bing usan su id. |
| Doble pago del monedero | `economy_reward_claims` (uno por ranura) y un flag local en modo invitado. |
| Compra con cuenta fallida | `buyAsync` ya devuelve el error. El paso solo avanza con `ok: true`. |
| Stock agotado (por ejemplo, después de vender y recomprar) | Garantía de 1 unidad mientras el paso esté pendiente (§4). |

## 10. Fases de implementación

1. **Datos y cadena**: misión en QuestManager, `order`, mapas de cadena, migración de partidas y i18n.
2. **Eventos**: `ShopService.on('buy')`, `EquipmentManager.on('equip')` y avance de pasos, con comprobación del estado inicial.
3. **Ochi y Paladill**: ramas del diálogo, monedero, foco en la Tienda y en la Mochila, frase de la graduación, texto de Bing bloqueado.
4. **Servidor**: migración `20261111000000_quest_merchant_ochi.sql`. La aplica el usuario en el SQL Editor. No toca el árbitro PvP, así que no hace falta volver a desplegarlo.
5. **Pruebas**:
   - partida nueva: tutorial → Ochi → Bing;
   - «Saltar tutorial»;
   - partida antigua con Bing ya en curso o ya terminado: la misión de Ochi aparece completada;
   - modo invitado y con cuenta (el oro lo paga el servidor);
   - recargar en cada paso;
   - llegar con menos de 60 y con más de 60 de oro;
   - ir a la sabana antes de tiempo.
6. **Documentación**: `docs/HITO_124_MISION_OCHI.md`, entrada en el README y `PROJECT_CONTEXT.md`. La versión se queda en v0.5.0.

## 11. Decisiones (tomadas)

- **Paso de venta:** no. Ochi solo menciona que lo que él no compra (runas, charms) se pone en el Mercado para que otros Sapidae lo compren.
- **Recompensa final:** 80 de oro, 2 pociones de vida pequeñas y 50 de exp.
- **Casco:** el Yelmo Bestial (el de calabaza). Ya no cae en combate: se compra a Ochi o se crea en la Forja. `quest_hostile_sands` da materiales de la sabana en su lugar.
