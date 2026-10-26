# Hito 54 — Ajustes del tutorial y runas y charms como objetos

> **Estado:** en la versión de prueba (23-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** pulir textos y pasos del tutorial (duelo, oro, Forja, vínculo, Ultimate, runas y charms) y convertir las runas y los charms en objetos que se consiguen (botín y bolsas de la Forja) y se venden.

## 1. Tutorial

| Cambio | Archivo |
| --- | --- |
| **Duelo:** ya no se anuncia que termina al 30 % de vida (diálogo, consejo en combate y guía). El duelo sigue terminando igual. | `tutorial/TutorialScript.js`, `tactics/TutorialManager.js` |
| **Icono del oro:** la moneda de la Forja y la Tienda (`curIcon('gold')`) en las tarjetas de recompensa. | `tutorial/TutorialDirector.js` |
| **Forja → recompensa:** al recoger la espada hay un paso nuevo, «Cierra la Forja» (`forge_close`, con la X resaltada); la tarjeta «Espada evolucionada» sale al cerrarla. | `TutorialScript.js`, `TutorialDirector.js` (`_afterCollect`, `_forgeReward`) |
| **Avisos sobre el diálogo:** con un diálogo abierto `<body>` lleva `.lk-dialog-open` y se ocultan los avisos «E · …» (`#npc-interaction-prompt`, `.lk-interact-prompt`). | `rpg/DialogSystem.js`, `ui/lunakai-tutorial.css` |
| **Vínculo:** en el tutorial (`AxieCareService.tutorialFill`) la caricia sube el vínculo a mitad de lo que falta y la comida lo completa al 100 %. Paladill ya no «presta» el vínculo ni lo devuelve; textos de antes y de después de la prueba reescritos. Una partida antigua que llegue a la prueba con menos se completa sin devolverlo. | `rpg/AxieCareService.js`, `TutorialDirector.js` (`_startUltTrial`), `TutorialScript.js` |
| **Ultimate:** el consejo tras lanzarla es «Ahora termina el combate» (sin «¡Resonancia!») y muestra el retrato de Paladill (el estilo `--hint` lo ocultaba). | `TutorialScript.js`, `lunakai-tutorial.css` |
| **Recompensa de runas:** 1 runa y 1 charm neutros con su arte real (`assets/ui/runes-charms.json`). Van a la bolsa de runas y charms. | `TutorialDirector.js` (`_giveRunes`, `_ensureRuneReward`) |
| **Paso del charm:** primero se resalta el hueco de la habilidad (la primera parte, p. ej. «Gero · Ojos») y después el charm neutro. | `TutorialDirector._computeGuide` |

La tarjeta de recompensa es ahora un módulo compartido: `ui/RewardCard.js` (`showRewardCard`).

## 2. Runas y charms como objetos

| Pieza | Detalle | Archivo |
| --- | --- | --- |
| **Bolsa** | `slot.runeCharmBag = { runes: { id: n }, charms: { id: n } }` (equipadas incluidas). Solo se equipa lo que queda libre (`available`); al quitarla vuelve a quedar libre. Al crear la bolsa en una partida antigua, lo ya equipado pasa a ser tuyo. | `rpg/RuneCharmService.js` (`owned`, `available`, `list`, `add`, `openBag`, `rollNeutral`) |
| **Panel** | Solo muestra lo que tienes (más lo que el Axie lleva puesto), con «×n» si tienes varias libres. Sin nada, explica dónde conseguirlas. El aviso «!» solo sale si hay una runa libre. | `ui/RunesCharmsPanel.js`, `ui/lunakai-ui.css` |
| **Botín** | Al ganar un combate (no en el tutorial): charm neutro 10 %, runa neutra 5 %; ×2 contra jefes. Rareza al azar con peso (común 45, rara 35, épica 15, mística 5). Salen en la pantalla de victoria con su arte. | `main.js`, `EconomyCatalog.RUNE_CHARM_DROP` |
| **Bolsas de la Forja** | Crear › **Bolsa de runa** (80 oro, 5 baba de slime, 3 cobre, 1 esquirla lunar) y **Bolsa de charm** (50 oro, 3 colas de quimera, 1 esquirla lunar). Van a la Mochila (Consumibles) y se abren con «Abrir»: una runa o un charm de una de las 6 clases (Acuático, Bestia, Pájaro, Bicho, Planta, Reptil), pesada por rareza. | `EconomyCatalog.CRAFT_RECIPES`, `ItemDatabase` (`rune_bag`, `charm_bag`), `rpg/ui/InventoryModal._openBag`, `ui/ForgePanel.js` |
| **Tienda** | Vender › pestaña «Runas y charms»: neutras 15 de oro; de clase 20 / 40 / 80 (rara / épica / mística; común 10). Las equipadas no se venden. Se pueden recomprar como el resto. | `rpg/ShopService.js` (ids `rune:<id>` y `charm:<id>`), `ui/ShopPanel.js`, `EconomyCatalog.RUNE_CHARM_SELL` |
| **Arte** | Un solo cargador para el panel, la Tienda, el botín y las recompensas. | `ui/RuneCharmArt.js` |

Consola: `lkDebug.rune(heroId, id)` y `lkDebug.charm(heroId, parte, id)` añaden a la bolsa lo que falte antes de equiparlo.

## 3. Pruebas

- Partida «GuiaTest» (tutorial en curso):
  - caricia 40 → 70 % y comida 70 → 100 %;
  - textos del vínculo y de la Ultimate nuevos;
  - consejo con retrato;
  - recompensa de runa y charm con su arte;
  - paso del charm (hueco de Gero → charm neutro → graduación);
  - «Cierra la Forja» antes de la tarjeta de la espada;
  - aviso «E» oculto durante el diálogo.
- Partida «Auditoria»:
  - botín de runa y charm (probabilidad forzada al 100 % para la prueba);
  - crear y abrir las dos bolsas;
  - el panel solo muestra lo que se tiene;
  - venta en la Tienda (+15 de oro por una runa neutra).
- Sin errores en la consola.
- Pendiente: recorrer el tutorial completo en una partida nueva.
