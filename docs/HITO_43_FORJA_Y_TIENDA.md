# Hito 43 — Forja y Tienda del Valle del Dojō

> **Estado:** implementadas por el equipo (pantallas 24 y 25 del sistema de diseño). Revisadas el 20-oct-2026: este documento las describe y recoge lo encontrado en la revisión (sección 5). Se corrigieron los errores 1, 2, 4 y 5 (sección 5.3); el 3 queda a la espera de los objetos nuevos.

> **Actualización (21-oct-2026):** al evolucionar, la Forja se queda la pieza hasta recogerla y vuelve equipada en su ranura (Hito 46, punto 9). En el tutorial (Hito 48) la Forja se abre en su fase, el acelerado ×4 sale gratis (`ForgeService.grant`) y la vista pasa sola a «Evolucionar» (`forgeModal.setMode`). La Tienda abre al terminar el tutorial.

## 1. Dónde están

Las dos están en el patio del Dojō (zona `2_2`):

| | Forja | Tienda |
| --- | --- | --- |
| En el mundo | Yunque con horno, a −76,5 · 67 (`ForgeStation.js`) | Puesto del **Mercader Ochi**, a −80 · 61 (`MerchantStall.js` + NPC `merchant_ochi` en `MapRegistry.js`) |
| Cómo se abre | **E** junto al yunque («Usar la forja»), como el resto de objetos de `QuestInteractablesManager` | Hablando con el mercader: un saludo y se abre (`NPCManager._handleMerchantInteraction`) |
| Pantalla | `src/ui/ForgePanel.js` (`attachForge`) | `src/ui/ShopPanel.js` (`attachShop`) |
| Reglas | `src/rpg/ForgeService.js` | `src/rpg/ShopService.js` |
| Datos y números | `src/tactics/data/EconomyCatalog.js` | El mismo |

- Las dos se conectan en `main.js` (`this.forge`, `this.shop`).
- Las dos no se abren durante un combate.
- Mientras están abiertas, se quedan con el teclado (Esc las cierra) y cuentan como ventana abierta (`ow.isAnyModalOpen`).

## 2. Monedas y materiales

- **Oro:** el de siempre (`EquipmentManager`). Se usa para crear objetos y para comprar y vender.
- **SLP:** la moneda de evolución.
- **bAXS:** paga la comisión de evolución y la rapidez.
- **Materiales:** 12, en la «bolsa de materiales» de la forja:

  | Isla | Tier | Materiales |
  | --- | --- | --- |
  | Bosque | 1 | bambú, fibra, resina |
  | Sabana | 2 | cuero, cobre |
  | Ártico | 3 | hierro glaciar, cristal de escarcha |
  | Mística | 4 | polvo astral, seda lunar |
  | Génesis | 5 | núcleo de obsidiana, esencia del origen |
  | Todas las islas | — | **esquirla lunar**: catalizador para evolucionar a Tier 2 y 3 |

- **Lote inicial de la demo:** cada partida recibe una vez 1000 SLP, 100 bAXS, 8 de bambú, 6 de fibra, 4 de resina y 1 esquirla. Todavía no hay botín de materiales ni de SLP.
- **Guardado:** en la ranura activa (`slot.forge = { slp, baxs, mats, jobs, uid, starter }` y `slot.shops[shopId]`). Viaja con la partida, también en la nube. Sin ranura activa funciona en memoria.

## 3. Forja

### 3.1 Crear (Tier 0)

- 7 recetas de oro + materiales del Bosque: espada, arco, varita, gorro, escudo, túnica y sandalias.
- El objeto va a la Mochila al instante.
- Los objetos Tier 0 usan el dibujo del Tier 1 de su línea, en tono sepia (`isT0`), hasta que tengan arte propio.

### 3.2 Evolucionar

- Cada pieza sube a la siguiente de su **línea** (`EVOLUTION_LINES`, 12 líneas). Se pueden evolucionar las piezas equipadas en cualquier héroe y las de la Mochila.
- **Coste por tier de destino:**

  | Tier de destino | SLP | Materiales | Esquirlas | Tiempo (×1) |
  | --- | --- | --- | --- | --- |
  | 1 | 50 | 2 bambú, 2 resina | 0 | 1 h |
  | 2 | 150 | 3 cuero, 2 cobre | 1 | 4 h |
  | 3 | 400 | 3 hierro glaciar, 2 cristal | 2 | 8 h |

  Siempre se suma una comisión de **0,5 bAXS**.
- **Rapidez ×2 o ×4:** se paga en bAXS una vez empezada la pieza. Cuesta 1 o 3 bAXS (por 1,5 en Tier 2 y por 2 en Tier 3) y se paga solo la diferencia con la rapidez actual.
- **2 yunques:** como mucho dos piezas a la vez.
  - El tiempo es real: sigue corriendo con el juego cerrado.
  - Una pieza lista se recoge con un clic.
  - Fuera de la forja avisa una vez con un mensaje.
- **Pieza equipada:** el héroe la sigue usando mientras se forja y al recogerla se mejora donde está. Si está en la Mochila, sale de ella, entra en la forja y vuelve evolucionada.
- **Pieza apartada** (desde el 20-oct): mientras una pieza equipada se forja, la forja la sigue allí donde esté: su ranura, la Mochila si la desequipas u otro héroe si se la pasas.
  - Esa copia no se puede volver a forjar ni vender: la tienda la muestra bloqueada con «Está en la forja».
  - Al recogerla se mejora justo esa copia.
  - Si pones otra pieza en esa ranura, la nueva sí se puede evolucionar.

## 4. Tienda (Mercader Ochi · `SHOPS.dojo_valley`)

- **Vende:**
  - materiales: bambú y fibra sin límite; 20 de resina, 8 de cuero y 1 esquirla por reposición;
  - comida;
  - pociones;
  - las 7 piezas Tier 0 (2 de cada una).
- Las existencias se reponen cada **6 h**.
- **Compra** materiales al 50 % y el resto al 30 %. Este mercader solo compra equipo Tier 0, no lo que llevas equipado y no los objetos de misión.
- **Recompra:** las 6 últimas ventas se recuperan al mismo precio.
- **Precios** (`EconomyCatalog`):
  - equipo por tier (60 · 60 · 150 · 400 para Tier 0 · 1 · 2 · 3) multiplicado por la rareza; el Tier 0 subió de 30 a 60 el 20-oct;
  - materiales por tier (6 · 14 · 30 · 65 · 140; la esquirla, 250);
  - comida y pociones con precio fijo.
- **Ficha del objeto:**
  - compara con lo que lleva el héroe elegido en la Mochila (▲▼);
  - dice dónde se consigue cada material y para qué sirve;
  - dice a qué evoluciona cada pieza.
- Lo raro o mejor se vende **manteniendo pulsado** el botón 0,9 s.
- Los materiales comprados van directos a la bolsa de la forja.

## 5. Revisión (20-oct)

Pruebas en `_test/forge.html` con los servicios reales y un `EquipmentManager` simulado, más una comprobación de los datos del catálogo.

### 5.1 Funciona bien
- Crear, evolucionar, acelerar, recoger, comprar, vender y recomprar cuadran: cobran lo que dicen y guardan en la ranura.
- Las 12 líneas existen en `ITEMS_DB` y suben de tier en orden. Todo lo que vende la tienda tiene ficha.
- La reposición de existencias añade los objetos nuevos del catálogo sin borrar el estado guardado.
- Si una pieza equipada se desequipa mientras se forja, se mejora en la Mochila.

### 5.2 Errores encontrados

1. **Duplicar equipo con la forja (importante; corregido).** Si una pieza equipada está en la forja, nada impide moverla:
   - desequiparla y mandarla otra vez a la forja desde la Mochila: **una Iron Sword se convirtió en dos Frost Blade**;
   - pasársela a otro héroe: ese héroe se queda la Iron Sword y además llega la Frost Blade a la Mochila; también puede evolucionarla otra vez;
   - venderla (solo con piezas Tier 0, que son las que compra el mercader): cobras la venta y aun así recoges la pieza evolucionada.
   
   Arreglo propuesto: que la forja reserve la pieza (no se puede volver a evolucionar ni vender mientras esté en un yunque) y que al recogerla la busque en cualquier héroe antes de dar una nueva.
2. **Crear sale más caro que comprar (corregido).** Las recetas cuestan 33–49 de oro contando los materiales a precio de tienda, y la misma pieza se compra por 30 y se vende por 9. Hay que subir el precio de compra del Tier 0 o bajar el coste de las recetas.
3. **Piezas Tier 2 sin evolución (se deja así: los objetos van a cambiar).** Estas piezas no están en ninguna línea y la forja las da por «en lo más alto», aunque no son Tier 3:
   - `obsidian_dagger`, `beast_helmet`, `nomad_turban`, `desert_turban` y `thermal_pot`;
   - y `heavy_boots`, que es el final de su línea.
   
   Además hay saltos grandes: la varita de Tier 0 pasa directa a Tier 2 (con materiales de la Sabana y una esquirla) y el arco de Tier 1 a Tier 3.
4. **El yunque no libera su memoria (corregido; el horno se cambiará por un modelo).** Cada vez que se entra en el Valle, `ForgeStation` construye el horno de nuevo y al salir no libera geometrías ni materiales. `MerchantStall` sí lo hace.
5. **Detalles menores (corregidos):**
   - comprar materiales guarda la partida dos veces (tienda y forja);
   - con una pieza equipada en la forja, otra pieza que pongas en esa ranura no se puede evolucionar hasta recoger la primera;
   - la luz del horno (`PointLight`) suma una luz a la escena al entrar en el Valle, y three recompila los materiales de la escena (lo mismo que pasa con otros objetos con luz).

### 5.3 Correcciones (20-oct)

| Error | Corrección | Archivo |
| --- | --- | --- |
| 1. Duplicar equipo | `ForgeService._claims()` sigue a cada pieza equipada en la forja (su ranura → una copia en la Mochila → otro héroe). `gear()` y `evolve()` no ofrecen ni aceptan esa copia. `collect()` mejora justo esa copia. `reservedInInventory()` le dice a la tienda qué copias no puede comprar (`ShopService.sellable`). | `ForgeService.js`, `ShopService.js` |
| 2. Crear más caro que comprar | El equipo Tier 0 pasa de 30 a 60 de oro (se vende por 18). Crearlo (33–49) sale más barato que comprarlo, y venderlo da menos que crearlo: no hay bucle de ganancia. | `EconomyCatalog.js` (`PRICE_BY_TIER`) |
| 4. Memoria del horno | Al cambiar de zona se liberan las geometrías y los materiales del horno anterior. | `ForgeStation.js` |
| 5a. Doble guardado | La tienda mueve los materiales con `ForgeService.addMats(id, n, false)` y guarda una sola vez. | `ShopService.js`, `ForgeService.js` |
| 5b. Ranura ocupada | Corregido con el 1: solo se aparta la pieza que está en la forja, no la ranura. | `ForgeService.js` |
| 5c. Luz del horno | La luz se crea una sola vez y se queda en la escena (apagada fuera del Valle). Así el número de luces no cambia al entrar o salir y three no recompila los materiales. | `ForgeStation.js` |

**Pruebas** (`_test/forge.html` y `_test/forgestation.html`):
- **Las tres formas de duplicar están cerradas:** volver a forjar desde la Mochila, venderla y pasarla a otro héroe. En este último caso la Frost Blade aparece en Bing, en lugar de la Iron Sword.
- **Siguen funcionando:**
  - dos copias reales de la misma pieza se pueden evolucionar a la vez;
  - otra pieza en la ranura ocupada se puede evolucionar.
- **Tienda:** comprar materiales guarda una vez. El Tier 0 se compra por 60 y se vende por 18.
- **Horno:**
  - 1 sola luz en la escena dentro y fuera del Valle, colocada en la boca del horno;
  - 24 geometrías liberadas al salir;
  - un solo horno al volver.

### 5.4 Antes de publicar
- Quitar o ajustar el **lote inicial de la demo** (1000 SLP y 100 bAXS).
- Repartir materiales, SLP y esquirlas como botín. Ahora solo salen del lote y de la tienda.
- El tiempo de forja usa el reloj del equipo: cambiando la hora se termina al instante. Para la demo no importa.

## 6. Consola

- `lunakaiForge.open()` / `close()`; `lunakaiForge.finishAll()` termina ya todas las piezas en curso; `lunakaiForge.service` da acceso a `ForgeService`.
- `lunakaiShop.open('dojo_valley')` / `close()`; `lunakaiShop.service` da acceso a `ShopService`.
