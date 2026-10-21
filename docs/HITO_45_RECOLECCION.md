# Hito 45 — Recolección de recursos (pesca, tala, minería y plantas)

> **Estado:** completado en la versión de prueba (20-oct-2026).
> **Pedido:** un sistema de recolección sencillo y con pocos puntos, una actividad por bioma. La pesca y la tala las hace el Axie (con las armas del Mixer); la minería y las plantas, el Sapidae. Un árbol en el Bosque, junto a la Forja, para explicar más adelante la evolución.

## 1. Qué cambia en el juego

| Isla | Actividad | Puntos | Quién | Recurso | Raro (10 %) |
| --- | --- | --- | --- | --- | --- |
| Bosque (2_2) | Pesca en el río | 3 | Axie, con la caña («Whip») | Pez de río *(nuevo, T1)* | Koi dorado *(nuevo, T3)* |
| Bosque (2_2) | Tala | 1 (junto a la Forja) | Axie, con el hacha («Axe») | Madera *(nuevo, T1)* | — |
| Ártico (2_1) | Tala de abetos | 3 | Axie, con el hacha | Madera de abeto escarchado *(nuevo, T3)* | Cristal de escarcha |
| Sabana (3_2) | Minería | 3 | Sapidae, con un pico | Cobre del cañón | Esquirla lunar |
| Mística (1_2) | Flores | 3 | Sapidae | Flor lunar *(nuevo, T4)* | Polvo astral |
| Genesis (2_3) | — | 0 | — | — | — |

- **Cómo se usa:** acercarse al punto (anillo del color de la actividad en el suelo y un icono en el minimapa) → «E · Pescar · Remanso del río» → esperar 6 s. Mientras dura no te puedes mover (Esc cancela antes de recoger el botín).
- **Botín:** 1–3 unidades del recurso y un 10 % de un raro. Va a la bolsa de materiales de la Forja (la misma de la Tienda) y se ve en la Mochila (I), pestaña «Materiales». Sale una tarjeta «+2 Pez de río» (el raro en dorado con «¡Raro!»).
- **Agotado:** el punto vuelve a los **8 minutos reales** (también con el juego cerrado; se guarda en la partida). Mientras tanto se ve vacío (tocón, roca sin cobre, tallo sin flor, agua quieta), el icono del minimapa sale gris y el aviso dice «vuelve en 7 min».
- **Cancelar:** Esc antes de terminar (moverse está bloqueado). No se puede recolectar en combate ni con una ventana abierta. El vínculo no influye.
- **Mapa del mundo (M):** en «Puntos de interés» de cada isla hay una fila por actividad con los puntos listos o el tiempo que falta.

### Cómo se ve

- **Pesca (Axie):** la cámara pasa al Axie, que deja de seguir al Sapidae y corre a la orilla; el Sapidae se aparta a un lado (contrario a la cámara) para no tapar la vista. Se equipa la caña del Mixer (`Whip`, con su sedal de 13 huesos) y hace `Whip.Skill` estirada a los 6 s (timeScale ≈ 0,72): lanza, el corcho flota en la punta del sedal, pica (salpicadura + «¡Pica!») y recoge. Guarda la caña, vuelve con el pez encima de la cabeza (`Action.WalkCarryItem` / `RunCarryItem`), se lo da al Sapidae y la cámara vuelve.
- **Tala (Axie):** igual (el Sapidae también se aparta), con el hacha (`Axe.Attack` en bucle). Cada golpe sacude la copa y suelta hojas (o nieve en el Ártico) y astillas. Al terminar el árbol queda en tocón. El árbol de la Forja usa el mismo modelo que el resto de árboles del Bosque (frondoso verde de `GenshinTrees`, con su viento y sombras); los del Ártico, uno de los abetos de la isla (`IslandTrees`). Si el arte de la isla no estuviera cargado, se usa un árbol de primitivas.
- **Minería (Sapidae):** sin cambio de cámara. El Sapidae va a la veta, saca un pico hecho con primitivas (en el hueso de la mano derecha) y golpea: los movimientos se hacen sobre los huesos (hombro y espalda) encima de su animación de reposo. Cada golpe saca chispas.
- **Flores (Sapidae):** se agacha (caderas, rodillas, espalda y brazo), tira de la flor y esta se encoge con un destello de pétalos.

## 2. Cómo funciona

| Archivo | Qué hace |
| --- | --- |
| `src/tactics/data/GatheringCatalog.js` | **Nuevo.** Reglas (`GATHER_RULES`), actividades (`GATHER_KINDS`), botín (`GATHER_LOOT`) y los 13 puntos (`GATHER_NODES`) con su isla y posición. |
| `src/rpg/GatheringService.js` | **Nuevo.** Disponibilidad, tirada de botín, agotado 8 min y guardado en `slot.gathering = { until, total }`. El botín entra con `ForgeService.addMats` (una sola escritura de la partida). |
| `src/rpg/world/GatheringNodes.js` | **Nuevo.** Los puntos en el mundo, hechos con primitivas (estaca, cubo y ondas en el agua; árbol del Bosque con el modelo de la isla y abeto con tocón; veta de cobre; flor lunar). Se enganchan a `QuestInteractablesManager` como la Forja (mismo aviso y tecla E). Efectos: `shake`, `sparks`, `pluck`, `splash`. Comprobación contra el terreno: `check()`. |
| `src/rpg/GatheringActors.js` | **Nuevo.** `AxieSession` (pesca y tala con `equipWeapon` + `playAnimation` del Mixer, cámara al Axie) y `SapidaeSession` (va al punto solo, pico de primitivas y poses por huesos con `BonePoser`, que vale para cualquier esqueleto). |
| `src/ui/GatheringHUD.js` | **Nuevo.** `attachGathering(game)`: barra «Pescando…», tarjeta de botín, cancelar al moverse o con Esc, iconos del minimapa y filas del mapa del mundo. Consola `window.lunakaiGathering`. |
| `src/rpg/PlayerEntity.js` | `companionHold`: mientras está a `true` el Axie no sigue al Sapidae (solo avanzan sus animaciones). |
| `src/rpg/ui/InventoryModal.js` | Pestaña «Materiales» en la Mochila: los materiales de la bolsa de la Forja con su cantidad, tier, isla y de dónde salen. |
| `src/tactics/data/EconomyCatalog.js` | 5 materiales nuevos (`mat_wood`, `mat_river_fish`, `mat_golden_koi`, `mat_frost_fir_wood`, `mat_moon_flower`) y la fuente de cobre, cristal de escarcha, polvo astral y esquirla lunar. El precio en la Tienda sale de su tier. |
| `src/ui/ForgePanel.js` | Iconos nuevos de material: tronco, pez y flor. |
| `src/ui/lunakai-ui.css` | Barra y tarjeta de la recolección; icono en el mapa del mundo. |
| `src/main.js` | `this.gathering = attachGathering(this)`, después de la Forja. |

### Posiciones

Se eligieron en el juego, con el terreno real cargado: suelo con pendiente < 0,3, sin colisiones ni rocas o árboles encima, a ≥ 12 m de los NPC y lejos de los anclajes de los monstruos.

- Pesca: orillas llanas del río del Bosque (agua a 2 m): (3,8 · −30), (38,1 · −4) y (20,8 · −74,5). `water` es el punto donde cae el corcho.
- Árbol de la Forja: claro al norte de la Forja, (−73,5 · 54,5).
- Ártico: (18 · 96) junto al embarcadero, (−16 · 38) y (−2 · −20).
- Sabana: al pie de tres hoodoos, (−76,5 · 49,6), (−22 · −21) y (12,2 · 17,3).
- Mística: (92 · 8) junto al embarcadero, (−50 · 50) en el pantano y (24 · 4).

## 3. Decisiones

| Caso | Decisión |
| --- | --- |
| Recetas de creación y evolución | No cambian todavía: los recursos nuevos ya están en la bolsa y la Tienda, y las recetas se reorganizan más adelante. |
| Tutorial | Hecho en el Hito 48: el jugador tala el Árbol de la Forja para conseguir la madera de la evolución. Durante el tutorial solo ese árbol se puede recolectar. |
| Herramientas | No hace falta tener nada equipado: el Axie usa las armas del Mixer y el pico del Sapidae se crea al minar. |
| Raro | Se suma al botín normal (1–3 del recurso + 1 raro). |
| Botín ya recogido | Si el jugador se mueve mientras el Axie vuelve con el botín, no se pierde: el Axie lo trae igual. |
| Cambio de isla, combate o de compañero a mitad | Se cancela sin botín (el punto no se agota). |
| Laboratorio de animaciones (fase 2 del plan) | Se probó directamente en el juego con el Mixer real; las animaciones de caña, hacha y llevar objetos existen en los 8 cuerpos. No se ha añadido una página aparte. |

## 4. Consola (F12)

| Comando | Qué hace |
| --- | --- |
| `lunakaiGathering.status()` | Estado de los 13 puntos (disponible, ms que faltan) |
| `lunakaiGathering.check()` | Comprueba los puntos de la isla actual contra el terreno (pendiente, colisiones, NPC, objetos encima, agua) |
| `lunakaiGathering.reset()` | Deja todos los puntos disponibles (o uno: `reset('fish_forest_1')`) |
| `lunakaiGathering.start('tree_forest_forge')` | Empieza la recolección de un punto de la isla actual |

## 5. Pruebas

- `node tools/gathering/test-gathering.mjs`: catálogo (13 puntos, Genesis sin puntos, materiales existentes) y reglas (1–3, 10 % raro, 8 min, una escritura de la partida).
- En el juego: pesca, tala, minería y flores de principio a fin (botín, agotado, cancelar), y fotos de la pesca, la tala y la minería.

## 6. Pendiente

- Ajustar números (cantidad, tiempo de 6 s, raro) en `GATHER_RULES` tras probar en partida.
- Usar los recursos nuevos en las recetas de la Forja.
- ~~El tutorial del árbol (explicar la evolución).~~ Hecho en el Hito 48.
