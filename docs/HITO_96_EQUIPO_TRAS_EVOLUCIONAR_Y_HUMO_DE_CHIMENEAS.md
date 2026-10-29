# Hito 96: El equipo del mundo sigue a la Forja y humo en las chimeneas

> **Estado:** en la versión de prueba (28-oct-2026), pendiente de probarlo en el juego.
> **Pedido:**
> 1. Al evolucionar un arma equipada, la pieza sale del inventario pero en el mundo se sigue viendo; al recogerla ya evolucionada, se sigue viendo el modelo anterior hasta desequipar y volver a equipar.
> 2. Humo en las chimeneas: algunas casas del Bosque, la de Baruk (Sabana), las de Pomodoro y del Ermitaño (Ártico) y la del astrólogo (Mística). Gris claro y tranquilo.

## 1. Equipo del mundo (`src/rpg/OverworldManager.js`)

**Causa:** el modelo del mundo solo se actualizaba desde la Mochila (`onItemEquipped` / `onItemUnequipped`). La Forja (`ForgeService.evolve` y `collect`) cambia `em.equipped` directamente y solo rehacía el retrato.

**Ahora:**
- `_syncWorldEquipment()` aplica al Sapidae su equipo (arma, casco, armadura…) y al Axie compañero su arma. Solo toca el modelo si algo cambió (compara el equipo con el último aplicado), porque el aviso de `EquipmentManager` también salta con la vida o el oro.
- `_watchEquipment()` la conecta a `EquipmentManager.addListener` (una sola vez). Así funciona venga el cambio de donde venga: Mochila, Forja, Tienda o lo que se añada después.
- La Mochila usa la misma función (antes tenía su propio código).

Prueba automática (Chromium, módulos reales de la Forja y del equipo): al evolucionar el arma del Sapidae, el modelo la suelta; al recogerla, lleva la evolucionada; lo mismo con el arma del Axie compañero; un aviso sin cambios no recarga el modelo.

## 2. Humo de las chimeneas (`src/rpg/world/ChimneySmoke.js`)

- Todas las casas son `house.glb`; su chimenea es la boquilla curva de barro del tejado: `HOUSE_CHIMNEY` = (0,245, 1,88, −0,11) en unidades del GLB (frente = +Z). `chimneyPoint()` la lleva al sitio de cada casa (centro, altura, giro y escala).
- **Aspecto** (`SMOKE_STYLE`): 22 bolitas por chimenea, 8 s de vida, suben 6,5 m, crecen de 0,7 a 3,2 m, se inclinan 1,6 m con el viento, opacidad 0,42, grises `#e4e6e8`–`#c9cdd2`, borde algo irregular y giro lento.
- **Rendimiento:** un `THREE.Points` por grupo de casas (una llamada de dibujo por isla) y un solo material para todo el juego. Todo el movimiento va en el shader; el tiempo se pone al dibujar (`onBeforeRender`), así que no hay que llamar a ningún `update()`. Respeta la niebla.
- **Luz:** cada 5 s mira las luces de la escena (hemisférica, ambiente, sol) y oscurece y tiñe el humo con ellas: de día gris claro; de noche o en islas oscuras, gris azulado sin brillar.
- **Reducir movimiento:** el humo sube más despacio.

**Qué casas:** se marcan con `smoke: true`.

| Isla | Casa | Dónde |
|---|---|---|
| Bosque | `house_1`, `house_3`, `house_4` (no `house_2`) | `ForestVillageLayout.js` |
| Sabana | Casa de Baruk | `SavannaGenshinLandmarks.js` |
| Ártico | Casa de Pomodoro y del Ermitaño | `ArcticLandmarks.js` |
| Mística | Casa del astrólogo | `MysticLandmarks.js` |

- **Bosque** (`ForestVillage.js`): el humo vive en el grupo del pueblo, sigue la altura de cada casa cuando se asienta en el terreno (`_syncSmoke`, solo cuando cambian las matrices) y se libera con el pueblo al salir de la isla.
- **Islas** (`IslandProps.placeIslandProps`): las casas con `smoke` crean un `ChimneySmoke` en el mismo grupo al cargar los modelos (`props.smoke`). `prepare()` guarda `userData.origin` para situar puntos del GLB.

Para poner o quitar humo en una casa: añadir o quitar `smoke: true` en su entrada. Para cambiar el aspecto: `SMOKE_STYLE`. Si cambia el modelo de la casa: medir de nuevo `HOUSE_CHIMNEY`.

## 3. Pruebas

- Equipo: 10 de 10 comprobaciones (evolucionar y recoger, Sapidae y compañero, sin recargas de más).
- Humo: capturas de día y de noche con `placeIslandProps`; el pueblo del Bosque crea 3 columnas, sigue la altura sin recrear la malla y se libera al salir.
- El juego arranca sin errores.
- **Pendiente en el juego:** ver el humo en cada isla y medir los FPS en el pueblo del Bosque.
