# Hito 56 — Modelos GLB en el Ártico (y casas de la Sabana sin enterrar)

> **Estado:** en la versión de prueba (23-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** poner la casa del Bosque, el altar de Atia, la tienda y el `totem_ice` en el Ártico, decorar con `totem` y `flag`, y subir las casas de la Sabana, que quedaban un poco enterradas.

## 1. Qué cambia en el Ártico

| Lugar | Antes | Ahora |
| --- | --- | --- |
| **Casa de Pomodoro** (17, 13) | Cabaña de troncos con jardineras | `house.glb` ×4 y `totem.glb` ×2.5 a la entrada. Se quedan la farola y la hoguera con peces. |
| **Tienda del Chef Boreal** (0, −40.2) | Puesto de mercado (toldo, cajas, peces) | `shop.glb` ×4, un poco más atrás, con el Chef delante del mostrador. `flag.glb` al lado. Se quedan la hoguera con la olla y la farola (en la esquina delantera). |
| **Casa del Ermitaño** (−33.5, −69.5) | Cabaña con amuletos de hielo | `house.glb` ×4. Se quedan la hoguera y los troncos. |
| **Casa del Campamento Boreal** | `house_artic.glb` (3,6 MB) en la orilla del lago helado (−18, −26) | `house.glb` ×4 (0,2 MB) junto a la casa de Pomodoro (10, 4), con la puerta hacia el camino como la de Pomodoro, y `flag.glb` en su esquina delantera. El lago queda despejado. La hoguera del campamento se queda. |
| **Valle de la Escarcha Eterna** (−60, −76) | Altar de Atia de primitivas (tarima, estatua, braseros azules, luz) | `totem_ice.glb` ×3 donde patrullan las quimeras de la misión del ermitaño. El grupo de monstruos y su recorrido no cambian. |
| **Altar de Atia** (19, 76), zona nueva | — | `altar_atia.glb` ×4 en un claro junto al camino que sube de la playa, de frente al camino, con las chispas de nieve del altar antiguo. |
| **Entrada de la isla** (9.5, 114) | — | `flag.glb` junto al camino, a unos metros del desembarco (5, 120), de cara a la playa. |

Ya no hay braseros ni luces puntuales en el valle: hay un PointLight menos.

**Memoria:** ni `house_artic.glb` (3,6 MB) ni el muñeco de nieve `snowman_artic.glb` (3,1 MB, 12.000 triángulos y una textura de 1024) se cargan ya en la isla: no se descargan ni ocupan memoria (comprobado con una carga desde cero). Sus rutas solo siguen en `BiomeDecorationManager`, el sistema de decoración antiguo, que no se usa en las Grandes Islas.

## 2. Sabana: casas sin enterrar

Las casas se apoyaban en el punto más bajo del terreno bajo su planta: en pendiente, el lado alto quedaba enterrado. Ahora los edificios (casas, tienda, altar) siguen la regla del pueblo del Bosque:

- con 25 cm de desnivel o menos bajo la base, se apoyan algo por encima del punto medio;
- con más desnivel, se apoyan en el punto más alto (nada enterrado) y un **zócalo de piedra** rellena hasta el punto más bajo (nada flota). En la Sabana es de arenisca (0xb98a62) y en el Ártico gris (0x8a93a3).

Casa de Bing: +1 m (zócalo de 1,26 m). Casa de Baruk: zócalo de 0,87 m.

## 3. Código

- **Nuevo `rpg/world/islands/kit/IslandProps.js`:** `ISLAND_PROPS` (archivo, escala, radio de colisión, apoyo), `placeIslandProps(parent, list, { height, seaLevel, plinthColor })` (devuelve `colliders`, `floating` y `ready`) y `updateFloatingProps`. Lo usan la Sabana y el Ártico.
  - **Caché compartida `#islas`:** la Sabana y el Ártico cargan una sola copia de cada modelo (la casa, por ejemplo). El Bosque usa la suya, porque al salir la descarga (`evictGLTF`). Las islas no descargan: `WorldMapManager` libera de la GPU las texturas de la isla inactiva y vuelven a subirse al regresar.
  - Una carga por modelo; las copias comparten geometría y material. Grupos estáticos (`matrixAutoUpdate = false`), salvo la balsa.
  - Zócalo: una caja unidad compartida y un material por color.
- `savanna/SavannaGenshinLandmarks.js`: usa el kit (ya no carga los modelos por su cuenta).
- `islands/arctic/ArcticSites.js`: sitios nuevos `chef.shop`, `atia`, `campHouse` y `entranceFlag`; `chef.shop`, `atia` y `campHouse` entran en las zonas libres de árboles, rocas y hierba.
- `islands/arctic/ArcticLandmarks.js`: `_buildModels()` y `_buildAtiaSparkles()`. Se quitan `cabinParts`, `stallParts`, `_buildAltar` y las jardineras.
- `islands/arctic/ArcticIsland.js`: la casa del campamento usa el kit en lugar de `house_artic.glb`, y ya no se carga el muñeco de nieve (ni su colisión).

## 4. Assets

| Archivo | Cambio | Tamaño |
| --- | --- | --- |
| `assets/environment/totem_ice.glb` | Mapa de normales 1024 → 512 | 492 KB → 366 KB |
| `assets/environment/flag.glb` | Mapa de normales 1024 → 512 | 563 KB → 413 KB |

Originales en `scratch/_respaldo_glb/`.

## 5. Pruebas

- Bosque → Sabana → Ártico → Bosque → Sabana: todas las piezas tienen su textura y no hay errores en la consola.
- Capturas de antes y después de cada lugar del Ártico y de las dos casas de la Sabana.

## 6. Barquero: Kawa

El barquero se llama ahora **Kawa** (antes Kappa): nombre sobre la cabeza, diálogo de la barca, pantalla de carga («Kawa iza las velas...») y guía de misión («⛵ Habla con Kawa en la playa»). Los identificadores y archivos internos no cambian, para no romper partidas ni recursos: `ferry_pomodoro`, `npcId: 'kappa'`, `kappa.glb` y `kappa.png`.
Archivos: `islands/IslandWorldLayout.js`, `ui/FerryTravelUI.js`, `QuestManager.js` (y comentarios en `NPCManager.js` y `SavannaGenshinLandmarks.js`).
