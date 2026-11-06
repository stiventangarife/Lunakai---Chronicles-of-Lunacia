# Hito 115: Ajustes de la Mochila de runas, el inicio, la derrota, el tutorial y la ranura de partida

> **Estado:** en la versión de prueba (2-nov-2026), pendiente de probarlo en el juego real. Solo se comprobó la sintaxis de cada archivo (`node --check`); no se ha ejecutado el juego.
> **Pedido:** tres tandas de ajustes pequeños, cada una con su plan aprobado antes de tocar el código. Solo se modificó lo acordado; no se tocó `assets/`, así que **no hace falta subir `ASSET_VERSION`**.
> (El Hito 113 es el trabajo de rendimiento del visor de la Mochila y el Hito 114 las tarjetas de la Mochila y la pesca.)

## 1. Runas, charms, inicio de sesión, derrota y sombra

| # | Cambio | Dónde |
|---|---|---|
| 1 | **Sin candado** en la runa y el charm que regala el tutorial. Ya se entiende que no son NFT por la ausencia del sello de Ronin. La regla no cambia: siguen sin comerciarse ni gastarse (`RuneCharmService.boundCount`, `sellable`, y el servidor). | `ui/RunesCharmsPanel.js` (se quitó `boundTag` y sus dos usos) |
| 2 | **La cantidad («×N») ya no tapa la clase** de la runa. Pasó de la esquina superior derecha (donde está el icono de clase) a la inferior derecha, a la altura del sello Ronin (`bottom: 26px`). | `ui/lunakai-ui.css` (`.lk-rc-qty`) |
| 3 | **Sin botón «Entrar con correo»** en la pantalla de inicio. Quedan Sky Mavis e invitado. | `rpg/ui/StartScreenUI.js` |
| 4 | **Al perder un combate** el escuadrón despierta frente al **altar de Atia** del pueblo del Bosque (antes, en el punto por defecto de la isla). | `rpg/world/ForestVillageLayout.js` (`ATIA_RESPAWN_SPOT`), `rpg/OverworldManager.js` (`resumeAfterDefeat`) |
| 5 | **Sin el disco de sombra** bajo el Sapidae. La sombra real del modelo (la del sol) sigue. Se ahorra una llamada de dibujo y una superficie transparente. | `rpg/PlayerEntity.js` (se quitó `_createUnderFeetAura`) |

**Notas:**

- **Correo:** solo se quitó el botón. El formulario, el código y `accountManager.sendEmailCode/verifyEmailCode` siguen en el código: sin botón no hay forma de abrirlos, pero quien ya entró con correo conserva su sesión. Si algún día se quiere borrar todo, hay que quitar `_emailStart`, `_emailSend`, `_emailVerify` y el formulario de `StartScreenUI`. La clave `start.emailBtn` queda sin uso.
- **Candado:** la clave `runesPanel.boundTitle` queda sin uso en los diccionarios. El archivo `assets/ui/icons/lock.png` no se tocó.
- **Derrota:** `ATIA_RESPAWN_SPOT = villagePoint('altar', 0, 5.0)` con `yaw = villageFacing('altar')`: unos 5 m delante del altar (≈ −93,7 / 24,0), mirando hacia la calle. Se calcula desde el altar, así que lo sigue si cambia de sitio. Se pasa a `WorldMapManager.changeMap('zone_2_2', null, spawn)`, que ya admitía un punto de llegada. El aviso pasó a «Descanso en el Altar de Atia» (`overworld.atiaRest`, `overworld.atiaRestDesc`, en español e inglés); las claves `overworld.dojoRest*` quedan sin uso. **La derrota dentro del tutorial no cambia** (los combates `tut_*` siguen volviendo junto a Paladill). Si el punto queda mal colocado, se ajusta el `5.0`.

## 2. Tutorial: cámara de cuidado y casillas de los combates

### 2.1 Cámara que mantiene al Axie a la vista (acariciar y alimentar)

**Causa.** La cámara solo seguía al jugador y el Axie va 2,45 m detrás. Con zoom cercano, cerca de una casa (el brazo de la cámara se acorta hasta 1,6 m) o si el Axie quedaba atrás, salía por debajo del borde o detrás de la cámara. Entonces `TutorialDirector._companionRect()` devolvía `null` (desaparecía la flecha «haz clic en tu Axie») y `AxieCarePanel.place()` ocultaba el panel de cuidados (va anclado al Axie): el paso no se podía continuar.

**Solución.**

- `OverworldCamera.setFrameTarget(getter)` activa un encuadre. Mientras está activo:
  - la cámara apunta al punto medio (x, z) entre el jugador y el Axie;
  - cada fotograma se proyecta al Axie (`position` + 0,8 m) con la matriz del fotograma anterior; si cae fuera de la zona segura (`|x| > 0,62`, `y > 0,62`, `y < −0,5` en coordenadas de pantalla, o detrás de la cámara), un factor `_frameF` (0–1) sube a `0,35 + exceso` por segundo;
  - ese factor suma `6 m` de distancia y `0,32 rad` de ángulo (tope 1,45 rad), y el brazo con colisión trabaja con esos valores (`dist`, `pitch`);
  - el factor solo baja (0,25 por segundo) cuando el Axie está dentro de una zona más estrecha (`|x| < 0,45`, `−0,35 < y < 0,45`); entre las dos zonas se queda quieto, así no hay vaivén;
  - sin Axie que encuadrar, el factor vuelve a 0 a 0,8 por segundo.
- `TutorialDirector._frameAxie(on)` lo activa en los pasos `pet` y `feed` (en `_enterStep`) y lo apaga en cualquier otro paso y en `_applyDone` (terminar o saltar el tutorial). Recibe una función que devuelve `om.player.companionGroup`, por si el modelo se rehace.
- **Fuera de ese modo la cámara es idéntica a la de antes** (con el factor a 0, `dist` y `pitch` valen lo de siempre). Sin objetos nuevos por fotograma: se reutiliza un `Vector3`.
- Valores a ajustar si hace falta: `6.0` y `0.32` en `OverworldCamera.update`, y los umbrales de `_updateFrame`.

### 2.2 Primer combate guiado: un solo punto azul para el Axie

`TutorialManager` → paso `step_move_2`: tenía `allowedCells` con (4,6), (3,6) y (3,7) y `main._tutorialAllowedReach()` pintaba las tres en azul. Se quitó la lista y queda solo `allowedCell: { x: 4, z: 6 }` (con su halo dorado y su flecha). Las otras dos casillas dejan de ser válidas al hacer clic.

> Posible riesgo: esas dos casillas podían ser una red de seguridad por si (4,6) no fuera alcanzable. Por el código sí lo es (el explorador muere antes y `syncOccupancy` repara las casillas al empezar el turno; el Axie sale de (3,4) con 3 PM), pero no se comprobó en el juego. Si en una partida el Axie no llega a (4,6), el paso se queda sin salida y hay que añadir un respaldo.

### 2.3 Duelo con Paladill: el Axie se mueve con total libertad

**Causa.** En el duelo (`tut_duel`) la guía se calcula turno a turno (`TutorialManager._dynStep`). Cuando ninguna carta alcanzaba a Paladill, mandaba al Axie a **la casilla alcanzable más cercana a él**. Con cartas de AL mínimo 2 y Paladill pegado, esa casilla no sirve, y después de moverse la guía forzaba a pasar el turno. Además, en los pasos «libres» (`free_action`) `main._refreshMovementHighlights` borraba todas las casillas aunque el clic sí funcionaba.

**Solución.**

- `_dynStep`: para una unidad que **no es el Sapidae**, sin carta que alcance, con PM y con casillas libres a su alcance, el paso es `step_move_1` con `freeMove: true` y `allowedCells` = **todas las casillas libres alcanzables**. Se marcan todas en azul y se puede ir a cualquiera. El Sapidae conserva su casilla guiada.
- `_dynAdvance`: tras un movimiento libre, `moved` solo pasa a `true` cuando se agotan los PM. El Axie puede seguir moviéndose hasta que una carta alcance o se le acaben; entonces la guía pasa a «elige una carta» o a «pasa el turno».
- Si el Axie está pegado a Paladill y aun así ninguna carta alcanza, el aviso final dice «Ninguna carta alcanza a {name} desde aquí» (`noReachText`) en lugar de «aún está lejos» (`farText`, que se mantiene si de verdad está lejos).
- `main._refreshMovementHighlights`: en un paso libre (`free_action` / `step_battle_flow`) ahora se pintan las casillas alcanzables como en un combate normal. También afecta al último paso del primer combate guiado, que es libre.
- Textos nuevos en `i18n/es|en/tutorialCombat.js`: `moveFree.title`, `moveFree.text`, `noReachText`.

## 3. Cinemática y tarjeta de la partida

### 3.1 Cartel «Bosque» sobre la cinemática

**Causa.** En una partida nueva el mundo se carga antes de la cinemática. Esa carga (`WorldMapManager.loadMap`) muestra el cartel de zona durante 3,6 s y la cinemática empezaba con él todavía encima.

**Solución.** `ZoneBanner.hideZoneBanner()` quita el cartel al instante y cancela sus temporizadores; `TutorialDirector.playOpening()` la llama justo después de `hideBanner()`. El cartel sigue saliendo al viajar entre islas y al cargar una partida guardada.

> Efecto secundario conocido: la carga inicial ya marcó el Bosque como visto, así que en una partida nueva la etiqueta «Zona descubierta» del Bosque no vuelve a salir. Si se quiere mostrar el cartel al terminar la cinemática, es una llamada a `showZoneBanner` al final de `playOpening`.

### 3.2 Retrato del Axie principal en la selección de aventura

**Causa.** La tarjeta de la ranura (`StartScreenUI.refreshSlots`) pintaba `slot.hero`, que es siempre el Axie con que se creó la partida (el puesto interno `kotaro`). Al poner de principal a otro Axie en el Escuadrón, el principal pasa a ser el puesto 1 de `getSquad()`, pero `slot.hero` no cambia.

**Solución.**

- `EquipmentManager.exportSlotData()` devuelve `mainAxie: { id, axieId, heroKey, name, class, image }` a partir de `getSquad()[1]` (`getSquad()` no tiene efectos secundarios).
- El guardado solo copia una lista fija de campos, así que se añadió `mainAxie` a la llamada de `main._saveCurrentProgress` y a `SaveSlotManager.updateActiveSlot` (`slot.mainAxie`). `CloudSave` solo deja fuera `sapidaePortrait` y `sapidaePortraitKey`, así que `mainAxie` viaja a la nube con la ranura.
- La tarjeta usa `data.mainAxie || data.hero`: retrato, color y icono de clase, nombre y `#id`. El texto resumen de la ranura también. **No se genera ninguna foto 3D al pintar la tarjeta:** el retrato sale de lo ya guardado (almacenamiento del navegador para Axies por ID, retratos prehechos por clave) o de la imagen del Axie; si no hay ninguno, no se muestra retrato en vez de enseñar el del Axie equivocado.
- `slot.hero` no cambia (sigue describiendo el puesto `kotaro`). Las partidas existentes se corrigen solas en su siguiente guardado: el cambio de Escuadrón, el autoguardado y la vuelta al título (`equipmentManager.addListener` dispara `_saveCurrentProgress`).

## 4. Archivos tocados

`ui/RunesCharmsPanel.js` · `ui/lunakai-ui.css` · `rpg/ui/StartScreenUI.js` · `rpg/world/ForestVillageLayout.js` · `rpg/OverworldManager.js` · `rpg/PlayerEntity.js` · `rpg/OverworldCamera.js` · `rpg/tutorial/TutorialDirector.js` · `tactics/TutorialManager.js` · `main.js` · `rpg/ui/ZoneBanner.js` · `tactics/EquipmentManager.js` · `rpg/SaveSlotManager.js` · `i18n/es/overworld.js` · `i18n/en/overworld.js` · `i18n/es/tutorialCombat.js` · `i18n/en/tutorialCombat.js`.

## 5. Pendiente: probar en el juego real

1. **Runas:** Mochila › Runas con una runa repetida y el regalo del tutorial: sin candado y con el «×N» abajo a la derecha, sin tapar la clase.
2. **Inicio:** solo Sky Mavis e invitado.
3. **Derrota:** perder un combate fuera del tutorial (por ejemplo en otra isla): aterrizar frente al altar de Atia, ni dentro de él ni en un desnivel.
4. **Sombra:** caminar y confirmar que no hay disco bajo el Sapidae.
5. **Cámara de cuidado:** en el paso de acariciar, con zoom al máximo o junto a una casa, el Axie vuelve a verse y la cámara se relaja sola al salir del paso.
6. **Combate 1:** el turno del Axie muestra una sola casilla azul.
7. **Duelo:** con un Axie de carta AL 2 y Paladill pegado, se marcan todas las casillas alcanzables y se puede ir a cualquiera.
8. **Cinemática:** en una partida nueva no aparece el cartel del Bosque sobre ella.
9. **Ranura:** poner de principal a otro Axie, volver al título y comprobar retrato, nombre e `#id` de la tarjeta (en una partida vieja, entrar y salir una vez antes).
