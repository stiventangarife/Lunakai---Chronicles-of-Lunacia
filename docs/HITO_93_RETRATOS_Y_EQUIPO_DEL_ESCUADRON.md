# Hito 93: Retratos de Axies por ID, equipo fuera del escuadrón y retratos de NPC

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de probarlo en el juego.
> **Actualización (Hito 115, 2-nov-2026):** la tarjeta de cada ranura en la selección de aventura muestra el Axie principal actual (`slot.mainAxie`, guardado desde `getSquad()[1]`) y no el Axie de creación (`slot.hero`). Su retrato sale de lo ya guardado; no se genera ninguna foto al pintar la tarjeta.
> **Pedido:** (1) el Axie que se carga por ID no tenía retrato; (2) al sacar un Axie del escuadrón debe salir también de la mochila, pero conservar su equipo, runas y charms, con un botón para devolver el equipo; (3) actualizar los retratos de los NPC.

## 1. Retrato de los Axies cargados por ID

**Causa:** el retrato de un Axie con ID solo se hacía cuando su modelo 3D aparecía en el mundo (compañero) o en un combate. Un Axie recién cargado que esperaba en la colección o en un puesto de apoyo no tenía retrato:
- la barra del escuadrón (`SquadHUD`) no ponía nada;
- Escuadrón y la Mochila pedían `./assets/models/<id>.glb`, que no existe, y no se volvía a intentar.

**Ahora:**
- `CharacterPortraitService.ensureAxiePortrait(axieId)` carga el Axie fuera de pantalla, le hace la foto con el encuadre de siempre, la guarda en el navegador y lo libera. Los retratos se hacen de uno en uno, con un respiro entre ellos. Si el mezclador 3D aún no existe, se vuelve a intentar la próxima vez que se pide.
- `portraitService.axieUrl(base, onReady)` devuelve la foto 3D; mientras se hace, la imagen del marketplace (`base.image`); y avisa con `onReady` para volver a dibujar.
- Lo usan Escuadrón, la Mochila (fila de héroes y vista 3D de respaldo), la barra del escuadrón y el panel de cuidado.
- `loadAxieHero` acepta `skipPortrait`. La foto automática ya no se repite si el retrato apareció mientras esperaba.

## 2. Equipo de los Axies fuera del escuadrón

- **Mochila:** muestra solo el Sapidae y los Axies del escuadrón (también la pestaña de runas y charms). Si el Axie elegido sale del escuadrón, la Mochila pasa al primero de la lista.
- **Equipo:** el Axie que sale conserva sus piezas, su runa y sus charms. No vuelven a la bolsa, y si regresa al escuadrón entra ya equipado.
- **Escuadrón:**
  - en la colección, el Axie que lleva equipo tiene una etiqueta con una mochila y el número de piezas; al pasar el ratón se ve el detalle;
  - en su ficha: «Lleva puesto: N pieza(s) · N runa · N charm(s)» y el botón **«Devolver equipo a la bolsa»**, que quita piezas, runa y charms y los deja libres para otro Axie. El botón está también para los Axies del escuadrón.
- Textos nuevos en español e inglés (`squad.gearTitle`, `gearLine`, `returnGear`, `returnGearTitle`, `gearReturned`).

## 3. Retratos de los NPC (`assets/portraits/`)

Hechos desde el modelo que se ve en el juego, con su pose de reposo, el contorno y la función de foto del juego (`captureModel`), a 256 px:

| Retrato | NPC | Antes |
|---|---|---|
| `sapidae-m-a` … `sapidae-m-e` | Cartero, Baruk, Zarek, Ochi y chef, ermitaño | Modelos viejos en pose T; chef = ermitaño |
| `sapidae-f-a` | Herbolaria (Ema) | Sin el sombrero ni la ropa roja que lleva en el juego |
| `sapidae-f-b` … `sapidae-f-e` | Astróloga, sabia polar, oráculo, chamán | Modelos viejos en pose T; sabia = oráculo, astróloga = chamán |
| `statue_atia` | Estatua de Atia | Era la estatua anterior (`statue_atia.glb`); ahora la de `atias.glb` |

Kibo, Xia, Tripp, Paladill, Kotaro, Bing, Pomodoro, Kappa y el guardián de pergaminos ya estaban al día. Los nombres de archivo no cambian, así que no hubo que tocar código.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/tactics/CharacterPortraitService.js` | `ensureAxiePortrait`, `axieUrl`. |
| `src/rpg/AxieMixerService.js` | `loadAxieHero({ skipPortrait })`; la foto automática comprueba antes si ya hay retrato. |
| `src/rpg/ui/SquadModal.js` | Retratos con `axieUrl`; etiqueta de equipo, línea «Lleva puesto» y botón «Devolver equipo a la bolsa». |
| `src/rpg/ui/InventoryModal.js` | Solo el escuadrón; retratos con `axieUrl`. |
| `src/rpg/ui/SquadHUD.js`, `src/ui/AxieCarePanel.js` | Retratos con `axieUrl`. |
| `src/i18n/es/squad.js`, `src/i18n/en/squad.js` | 5 textos nuevos. |
| `assets/portraits/sapidae-*.png` (10), `statue_atia.png` | Retratos nuevos. |

## 5. Comprobado (Chromium, con los módulos del juego)

- **Escuadrón y Mochila (EquipmentManager real):**
  - con 2 Axies cargados por ID en el escuadrón, la Mochila los muestra;
  - al retirar uno, sale de la Mochila y conserva sus 2 piezas;
  - en Escuadrón tiene la etiqueta «2» y el botón;
  - al pulsar el botón, las piezas vuelven a la bolsa y desaparecen la etiqueta y el botón;
  - al volver al escuadrón, entra con lo que lleve puesto.
- **Retratos (con un mezclador simulado):**
  - sin mezclador devuelve la imagen del marketplace y no se queda esperando;
  - con mezclador hace la foto, la guarda y avisa una vez;
  - dos pedidos a la vez se hacen de uno en uno y los modelos se liberan.
- **Retratos de NPC:** comparados uno a uno con los modelos actuales (hoja «antes y después»).

## 6. Pendiente

- Probar en el juego: cargar un Axie por ID y ver su retrato en Escuadrón, la barra y la Mochila (con el mezclador 3D real).
