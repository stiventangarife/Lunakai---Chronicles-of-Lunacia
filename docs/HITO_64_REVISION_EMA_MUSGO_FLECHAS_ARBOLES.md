# Hito 64 — Revisión: Ema, tirón del musgo, flechas de misión, abetos del Ártico, Xia y el Cartero

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.

## 1. Rosalba ahora se llama Ema

- Nombre visible en los dos idiomas: NPC del Valle del Dojo (`MapRegistry`), quien da «Elixir para el bosque» («Herbolaria Ema» / «Herbalist Ema»), pasos («Habla con Ema…», «Entrega el musgo a Ema»), descripciones del Frasco de rocío y del Musgo Luminoso, y aviso al recoger el musgo.
- Ids sin cambios (`herbalist`, `quest_forest_elixir`, `mob_rosalba_plant_guardian`, clave `quests.npc.herbalistRosalba`): las partidas no cambian.
- Retrato: claves `herbolaria ema` / `herbalist ema`. No hay clave suelta `ema`, porque un jugador puede llamarse así; la herbolaria usa su `avatar`.
- **Nombre por defecto del jugador:** pasa de «Ema» a «Lunara» (StartScreenUI, SaveSlotManager, OverworldManager, EquipmentManager), y «Ema» sale de la lista de nombres al azar. Las partidas que ya existen conservan su nombre.

## 2. Tirón al aparecer el musgo

- **Causa:** al aceptar una misión (`NPCManager`) y al vencer al guardián de la planta (`OverworldManager`), el juego llamaba a `questInteractables.loadForZone()`. Esa función también reconstruye todo lo que se engancha a ella: el pueblo, el dojo, la Forja, el puesto del mercader y los puntos de recolección, con geometrías y materiales nuevos que hay que volver a subir a la GPU y compilar. Eso era el tirón.
- **Arreglo:**
  - nuevo `QuestInteractablesManager.refreshQuestNodes(zone)`, que solo quita y vuelve a crear los objetos de misión (musgo, setas, polvo estelar, marcados con `questNode`);
  - esos dos puntos lo usan en lugar de `loadForZone()`;
  - `loadForZone()` sigue igual para cambiar de zona.

## 3. Flecha sobre mobs de misión antes de aceptarla

- La Quimera Picuda Alfa (misión del Centinela) y la Quimera Acorazada (misión de Baruk) mostraban la flecha aunque la misión estuviera bloqueada o sin aceptar.
- **Arreglo:** cada flecha guarda su misión y su paso (`questArrowFor`). En `WanderingMonsters.update` solo se ve con la misión `active` y el paso pendiente, y aparece sola al aceptarla. El mob sigue patrullando como antes.

## 4. Abetos de tala del Ártico más visibles

- **Nuevas posiciones** (`ARCTIC_SITES.chopTrees`, usadas por `GatheringCatalog`):

  | Abeto (es / en) | Junto a | Posición |
  | --- | --- | --- |
  | «Abeto del altar» / «Altar Fir» | Altar de Atia | (25, 71.5) |
  | «Abeto de la tienda» / «Shop Fir» | Tienda del Chef | (6, −34.5) |
  | «Abeto del ermitaño» / «Hermit's Fir» | Cabaña del Ermitaño | (−28.5, −62.5) |

- **Claros:** cada uno tiene un claro de 3 m sin abetos decorativos, rocas ni hierba (`arcticSiteFootprints`).
- **Marca clara** (`highlight: true`): anillo más ancho y más opaco con pulso, y un hacha 🪓 flotante sobre la copa. Las dos marcas se ocultan mientras el árbol rebrota.

## 5. Xia y el Cartero

- Xia: (8.4, 46.7) → (−97.3, 21.3), junto al altar del final de la calle del pueblo. También cambia el destino de respaldo de la navegación.
- Cartero: (15.4, 26.0) → (−2.1, 10.8).
