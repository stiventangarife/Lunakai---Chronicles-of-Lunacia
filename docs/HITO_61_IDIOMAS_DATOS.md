# Hito 61 — Dos idiomas: Fase 3 (datos del juego)

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** traducir los datos del juego (objetos, habilidades, cartas, runas, enemigos) sin tocar la lógica. Sigue a los Hitos 59 y 60.

## 1. Decisiones

- **Se quedan en inglés** (nombres oficiales de Axie Infinity): cartas de partes, cartas iniciales («Puppy», «Toy Ball»…), runas y charms («Bloodlust»…). Sus **descripciones sí** se traducen.
- **Se traducen**: objetos, materiales, comida y consumibles; habilidades del Sapidae, de los Axies compañeros, Ultimates y habilidades enemigas; estados; clases y arquetipos de héroe; rarezas; enemigos y quimeras; niveles y lugares de combate; opciones del creador.
- Las clases del Sapidae (Forjacubiles, Susurrador, Lunalogista, Astromante) se tratan como nombres propios, como en la interfaz.

## 2. Qué se traduce

| Bloque | Archivos | Módulos (claves por idioma) |
| --- | --- | --- |
| Objetos y materiales | `ItemDatabase`, `EconomyCatalog` (materiales, Tier 0, rarezas, tienda), `GatheringCatalog`, `ShopService`, `AxieCareService`, recompensas de `QuestManager` | `items` (169) |
| Habilidades, estados y héroes | `Spells`, `UltimateSystem`, `StatusSystem`, `AxieBaseStats`, `SaveSlotManager` (HERO_ROSTER, SAPIDAE_CLASSES), `EnemySpellEffects`, `VariantCards`, `CollectionCards` | `spells` (230), `heroes` (180), `status` (31), `enemySpells` (16) |
| Cartas, runas y charms | `PartCards` (235 cartas), `StarterCards`, `RunesCharms` (90 + 90), `RuneCharmEffects` (notas del tooltip) | `partCards` (317), `starterCards` (20), `runesCharms` (153), `runeEffects` (21) |
| Enemigos, niveles y creador | `LevelsDatabase`, `DynamicCombatFactory`, `WanderingMonsters`, `BiomeEnemyCatalog`, `Biomes`, monstruos de `MapRegistry`, `SapidaeModularController`, lugares de `BattleMaps` | `enemies` (50), `levels` (52), `creator` (126) |

Total del juego: **3501 claves por idioma**, las mismas en los dos.

## 3. Cómo funciona

- **Listas grandes sin reescribir los datos:** `i18n.applyText(lista, 'prefijo', ['campo', …])` (nuevo en `i18n.js`) cambia, al cargar, los campos de texto de cada entrada por los del idioma activo buscando `prefijo.<id>.<campo>`. Los datos de `PartCards`, `RunesCharms`, `StarterCards`, `Spells`, `ItemDatabase` y `EconomyCatalog` quedan como estaban en su archivo; solo se añade una línea después de cada lista. (Si se regenera `PartCards.js`, hay que volver a poner su import y su línea de `applyText`.)
- **`i18n.inLang(texto, 'es' | 'en')`** (amplía `i18n.en` del Hito 60): el código que analiza un texto visible lo lee siempre en el mismo idioma.
  - La ficha de habilidad de la pantalla de inicio lee daño, curación y escudo de la descripción española.
  - La detección de jefes («Señor», «Jefe») en `DynamicCombatFactory` mira el nombre español.
  - El rol del Escuadrón y del HUD se busca en el arquetipo inglés.
- **Partida guardada:** guarda una copia del héroe con su arquetipo y habilidades. Ahora se muestra el texto del idioma actual buscándolo por `heroKey` e id (`heroDisplayText` en `SaveSlotManager`; `EquipmentManager` lo usa). Lo guardado no cambia.
- La navegación de misiones nombra a los enemigos con las mismas claves (`enemies.*`) que el combate y el mapa.

## 4. Pendiente (Fase 4: mensajes del sistema)

Registro de combate y texto flotante («−N iniciativa»), avisos de la tienda y la Forja («No tienes tantos», «Los yunques están ocupados»), recolección («vuelve en», «No se pudo recolectar»), errores y red.

## 5. Pruebas

- Inglés: Mochila con rarezas «Common · Savannah», tarjetas «Moon Mandarin» y «Wooden Sword», cartas y runas en el panel (nombres oficiales y descripciones en inglés), habilidades enemigas («Acid Spit — 28–38 ranged damage. Poison…»).
- Español: los mismos textos en español («Mandarina lunar», «Escupitajo Ácido — 28–38 de daño a distancia…»).
- Consola sin errores. Composición antes/después: `docs/images/i18n_fase3_datos.jpg`.
