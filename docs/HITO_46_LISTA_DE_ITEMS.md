# Hito 46 — Lista de ítems de la demo (según el Excel)

> **Estado:** completado en la versión de prueba (20-oct-2026). Ajustes del 20 y 21-oct en el punto 9.
> **Pedido:** dejar solo los ítems de `Items.xlsx`. La rareza sale del color de cada celda; el equipo va en 7 líneas de 4 piezas (de arriba abajo = su evolución). Las piezas Raras, Épicas y Místicas solo se consiguen evolucionando. Tiempos de demo cortos para que se vea todo el ciclo rápido.

## 1. Equipables (7 líneas × 4)

Común = Tier 0 (se crea en la Forja, se compra en la Tienda o sale de botín y misiones). Raro, Épico y Místico = Tier 1, 2 y 3 (solo evolucionando).

| Línea | Común | Raro | Épico | Místico |
| --- | --- | --- | --- | --- |
| Sombrero | Yelmo bestial | Sombrero de paja | Casco de bronce (id `arcane_ring`; antes «Corona arcana», Hito 92) | Corona de Lunacia |
| Armadura | Capa de viajero | Coraza de quitina | Armadura de bronce | Placas de obsidiana |
| Escudo | Rodela de roble | Escudo de cuero reforzado | Escudo de hierro | Escudo de acero |
| Botas | Botas pesadas | Botas de mensajero | Botas del viento | Botas dracónicas |
| Espada | Espada de madera | Espada de hierro | Espada del pez | Espada de quimera |
| Arco | Arco compuesto | Arco de hueso | Arco de planta | Arco de pájaro |
| Bastón | Bastón de hongo | Bastón de planta | Bastón de hielo | Bastón de la llave |

- **Estadísticas:** las de la pieza Común × 1,25 (Raro), × 1,5 (Épico) y × 2 (Místico). El bastón Místico da además +1 PA y las botas Místicas +1 PM.
- **Iconos:** cada pieza usa `assets/equippable/<id>.webp`. Los PNG se pasaron a WEBP sin pérdida (mismos píxeles, 137 KB → 90 KB); `arcane_ring.png.png` quedó como `arcane_ring.webp`.
- **Iconos de consumibles, materiales y misión** (20-oct): `assets/consumable/*.webp` (pociones y comida), `assets/materials/*.webp` (14 materiales) y `assets/materials/misions/*.webp` (7 objetos de misión). Los materiales se ven con su imagen en la Mochila, la Forja (bolsa y coste), la Tienda, la victoria, el libro de misiones y la tarjeta de recolección (`matIcon` en `src/ui/MaterialIcons.js`; si un material no tiene imagen se usa su dibujo SVG). Tamaño recomendado: 128 × 128 px.

## 2. Forja

**Crear (Tier 0)** — solo materiales Comunes:

| Pieza | Coste |
| --- | --- |
| Yelmo bestial | 15 oro · 2 Cola de quimera · 1 Baba de slime |
| Capa de viajero | 20 oro · 3 Baba de slime · 1 Cola de quimera |
| Rodela de roble | 20 oro · 2 Cobre · 2 Baba de slime |
| Botas pesadas | 15 oro · 2 Cola de quimera · 1 Cobre |
| Espada de madera | 20 oro · 3 Cobre · 1 Baba de slime |
| Arco compuesto | 20 oro · 2 Baba de slime · 2 Cola de quimera |
| Bastón de hongo | 25 oro · 2 Baba de slime · 1 Cobre · 1 Cola de quimera |

**Evolucionar** (igual para las 7 líneas):

| A | Tiempo | SLP | Materiales |
| --- | --- | --- | --- |
| Raro | 1 min | 50 | 2 Madera · 1 Diente de lobo · 1 Lana |
| Épico | 2 min | 150 | 2 Flor lunar · 1 Rama · 1 Bastón · 1 Flor de druida |
| Místico | 3 min | 400 | 2 Ámbar de Atia · 1 Cristal de escarcha · 1 Polvo astral · 1 Esquirla lunar |

**Lote inicial de materiales:** 6 Cobre, 6 Baba de slime, 4 Cola de quimera y 1 Esquirla lunar.

## 3. Materiales (14)

| Rareza | Material | De dónde sale |
| --- | --- | --- |
| Común | Cobre del cañón | Minería en la Sabana |
| Común | Baba de slime | Slimes del Bosque y la Sabana |
| Común | Cola de quimera | Lobos acuáticos (Sabana) |
| Raro | Madera | Tala (Bosque y Ártico) · Treants |
| Raro | Diente de lobo | Lobos acuáticos (Sabana) |
| Raro | Lana | Lobos grises y alfa (Ártico) |
| Épico | Flor lunar | Flores de la Isla Mística |
| Épico | Rama, Bastón y Flor de druida | Dríadas (Mística) |
| Místico | Cristal de escarcha | Tala en el Ártico (raro) |
| Místico | Polvo astral | Flores de Mística (raro) |
| Místico | Ámbar de Atia | Osos, slimes de Génesis y su jefe |
| Catalizador | Esquirla lunar | Minería en la Sabana (rara) y la Tienda |

En la Mochila, la Forja y la Tienda se muestra la rareza («Raro · Ártico») en lugar del tier. Los iconos nuevos (baba, cola, diente, lana, rama, bastón) son dibujos SVG en `src/ui/MaterialIcons.js`.

## 4. Comida y consumibles

| Objeto | Rareza | Efecto | Cómo se consigue |
| --- | --- | --- | --- |
| Frutas del bosque *(nuevo)* | Común | +3 % vínculo | Slimes |
| Pescado de río *(nuevo)* | Común | +4 % vínculo | Pesca (va a la Mochila, no a la bolsa) |
| Koi dorado *(nuevo)* | Místico | +10 % vínculo | Pesca (raro) |
| Mandarina lunar | Común | +3 % vínculo | Tienda y victorias |
| Pastelito de arroz | Raro | +5 % vínculo | Tienda |
| Festín de Lunacia | Épico | vínculo | Tienda |
| Lesser Health Potion | Común | vida | Tienda · inventario inicial (×3) |
| Healing Dew Flask | Raro | vida | Misión `forest_elixir` |
| Greater Health Elixir | Épico | vida | Tienda (3 al día) |

Se han quitado el tónico de energía y la poción de escudo. Los 7 objetos de misión se mantienen.

## 5. Botín, misiones y tienda

- **Combates:** cada monstruo suelta lo de su isla (tabla del punto 3). Los encuentros de misión sueltan lo de su modelo (lobo, dríada, treant…). Los materiales salen ×1–2 y van a la bolsa de la Forja; la pantalla de victoria los enseña con su dibujo y cantidad (`src/rpg/LootService.js`).
- **Misiones:** las 20 recompensas son ahora equipo Común o materiales (p. ej. la Espada de madera sale ahora del combate de defensa del Dojo, Hito 48; `frozen_seed` → 3 Lana + 3 Madera; `astral_void_echoes` → 3 Flor de druida + 2 Flor lunar). El libro de misiones muestra los materiales con su dibujo.
- **Tienda del Mercader Ochi:** pociones (pequeña sin límite, Greater ×3), comida (mandarina, pastelito, festín), los 3 materiales Comunes (×20), 1 esquirla y las 7 piezas Comunes (×2). Solo compra equipo Tier 0.

## 6. Partidas existentes

Al cargar una partida se descartan los objetos que ya no existen (mochila y equipo puesto), los materiales antiguos de la bolsa y los trabajos de la Forja con piezas antiguas, y se completa el lote inicial nuevo (una sola vez, `forge.starterV = 3`).

## 7. Archivos

`ItemDatabase.js` (44 ítems), `EconomyCatalog.js` (materiales, recetas, evolución, precios y tienda), `BiomeEnemyCatalog.js` (botín por monstruo), `DynamicCombatFactory.js`, `LootService.js` *(nuevo)*, `main.js`, `CombatEndScreen.js`, `QuestManager.js`, `QuestBookModal.js`, `LevelsDatabase.js`, `EquipmentManager.js`, `ForgeService.js`, `GatheringCatalog.js`, `GatheringService.js`, `GatheringHUD.js`, `InventoryModal.js`, `ForgePanel.js`, `ShopPanel.js`, `ShopService.js`, `MaterialIcons.js` *(nuevo)*.

## 8. Pruebas

- `node tools/gathering/test-gathering.mjs` (actualizado: el pescado va a la Mochila).
- En el juego: evolución Espada de madera → hierro → pez → quimera (1, 2 y 3 min), Mochila (pestaña Materiales con rareza), Tienda (comprar y vender), botín de lobos grises, acuáticos y osos, y pantalla de victoria con materiales. Iconos: ninguno da 404.

## 9. Ajustes posteriores (20 y 21-oct)

- **Fondo de los iconos = color de la rareza.** En la Forja y la Tienda algunos objetos (sobre todo materiales) salían con el color de su bioma; ahora todos usan el de su rareza (`--lk-rar-*`), también en la ficha de la Tienda.
- **La Forja se queda la pieza mientras evoluciona.** Al pulsar «Evolucionar», la pieza se quita de su ranura (o de la Mochila) y el héroe deja de llevarla; el trabajo guarda `held: true`. Al recogerla vuelve equipada en su ranura si sigue libre; si no, va a la Mochila. Los trabajos antiguos (sin `held`) siguen funcionando como antes.
- **Pantalla de arranque** (`#lk-boot` en `index.html`): tapa la página mientras cargan los módulos del juego. Si un archivo falla, dice cuál; si tarda más de 20 s, avisa y ofrece «Recargar». Se quita sola cuando aparece la pantalla de inicio.
- **Tecla H desactivada:** ya no abre el panel «evaluador y comparador» de la escena (`DemoScenaDebugUI`). Para pruebas: `game.overworldManager.demoScenaDebugUI.toggleCollapse()` en la consola.

## 10. Pendiente

- Modelos 3D del Sapidae para sombreros, armaduras y armas.
- Las partidas nuevas empiezan con la Mochila vacía: faltan las 3 pociones del inventario inicial (`SaveSlotManager.createSlot` guarda `inventory: []`). **[Resuelto · revisión del 7-nov-2026: el usuario confirma que ya no ocurre.]**
