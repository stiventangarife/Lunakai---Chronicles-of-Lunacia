# Hito 136 · Guía por migas («Chispa guía») y mapa de rumbo — fase 1, y ajustes visuales

> **Parte A** (guía): de aquí hasta «Archivos de la guía». **Parte B**: ajustes visuales pedidos durante las pruebas (retratos de Axie, Mochila, runas y árboles), al final.

La flecha dorada que flota delante del personaje quedaba tapada por el propio personaje y por la hierba. Ahora una **chispa** sale de los pies del personaje y recorre el camino hacia el objetivo dejando **migas de polvo dorado** que se apagan solas. El camino **rodea lo que no se puede pisar**: árboles, rocas, NPC, edificios, vallas, agua honda, paredes empinadas y el borde de la isla.

## Mapa de rumbo (`src/rpg/guide/GuideFlowField.js`)

- **Qué es:** una rejilla sobre la isla. Desde el objetivo hacia afuera se calcula la distancia **caminando** a cada casilla (Dijkstra con 8 vecinos, sin cortar esquinas en diagonal).
- **Dónde se puede pisar:** se pregunta al propio sistema de colisiones (`OverworldCollisions.isPointBlocked`, con una holgura de 0,5 m). No hay datos nuevos ni mapas hechos a mano.
- **Camino:** desde donde esté el jugador, se va a la casilla vecina más cercana al objetivo. Luego se suaviza: si hay línea libre entre dos puntos, se va recto.
- **El jugador se desvía o vuelve atrás:** no se recalcula nada.
- **Hasta dónde se calcula:** hasta 40 m de camino más allá del jugador. Si sale de esa zona, el cálculo sigue donde se quedó.
- **Por partes:** unos 2 ms por fotograma.
- **Qué se reutiliza:** la prueba «¿se puede pisar?» de cada casilla se guarda y sirve para todos los objetivos de la isla. Se rehace solo si cambian:
  - las colisiones (nuevo `OverworldCollisions.version`);
  - los límites de la isla;
  - o el agua o la pendiente terminan de calcularse.
- **Objetivos tapados:** si el objetivo está dentro de un obstáculo (un NPC tiene su propio círculo de colisión), el camino termina en las casillas libres a menos de 4 m (u 8 m) de él.
- **Objetivo que se mueve:** si se desplaza más de 3 m, se recalcula.
- **Sin camino o aún sin mapa** (inalcanzable a pie, o mientras se calcula): la estela va en línea recta y salta las migas que caerían dentro de un obstáculo o en el agua.

### Medido (banco de pruebas en el navegador, isla de 320 m)

Isla de prueba: 2 500 árboles, 40 edificios, 60 vallas, 4 lagos y una muralla que obliga a rodear.

| | |
|---|---|
| Rejilla | 220 × 220 = 48 400 casillas de 1,45 m |
| Cálculo completo (de esquina a esquina) | 61 ms en total, repartidos en 28 fotogramas (≈ 2 ms por fotograma) |
| Camino encontrado | 480 m (382 m en línea recta: rodea la muralla) |
| Cada pulso (trazar el camino) | 0,04 ms |
| Deambular 200 posiciones cerca | 0 fotogramas de cálculo extra |
| Memoria | 484 KB, reutilizados entre objetivos e islas |

Con el `OverworldManager` real y un objetivo detrás de una muralla: 23 fotogramas de cálculo y ningún fotograma por encima de 4 ms.

## Estela (`src/rpg/guide/GuideTrail.js`)

- **Cómo es:**
  - Una chispa con destello de cuatro puntas avanza a 11 m/s a ~0,45 m del suelo, por encima de la hierba.
  - Deja una miga cada 1,4 m: una mota grande y dos de polvo que se separan y suben. Cada miga dura 2,6 s y luego se apaga.
  - Se dibujan como mucho 18 m por pulso. Las últimas migas son algo más tenues, para que se lea la dirección.
  - Al final del recorrido, la chispa hace un destello.
- **Coste:**
  - **una llamada de dibujo** (`THREE.Points`, 49 puntos);
  - sin texturas: la forma se dibuja en el shader;
  - sin luces ni sombras;
  - cuando no hay pulso, el objeto se oculta.
- **Altura del suelo:** se consulta una vez por miga, al lanzar el pulso.
- **Precompilación:** se crea oculta antes del precalentado final del mundo, así que su shader ya está compilado (Hito 113). Si el mundo se montó por otra vía, se precompila con `warmupObjects` antes del primer pulso.
- **Color:** oro de la Crónica Celeste (`#F0A531`), con el centro por encima de 1 para que el bloom del mundo le dé brillo.
- **Movimiento reducido** (`access.reduceMotion`): sin chispa que viaja ni parpadeo; las migas aparecen y se apagan.

## Cuándo aparece (provisional, hasta la fase 2)

- Un pulso medio segundo después de cambiar de objetivo.
- Después, uno nuevo 1,4 s después de que termine el anterior (≈ cada 5,6 s).
- No aparece:
  - a menos de 5 m del objetivo;
  - con un panel abierto;
  - fuera de la exploración (combate, diálogo, cinemática).
- Si el jugador llega cerca o la navegación se apaga, la estela se desvanece en 0,35 s.

## Flecha quitada

- La flecha dorada que flotaba delante del personaje (`PlayerEntity._createQuestNavArrow`) ya no se crea: guía la estela.
- `setNavTarget` solo guarda el objetivo.
- Siguen igual: la flecha sobre el objetivo, el pin en pantalla con la distancia, el minimapa y la brújula del HUD.

## Consola

- `lkGuide.info()`: estado y coste del mapa de rumbo.
- `lkGuide.pulse()`: lanza un pulso ya.

## Pendiente (fase 2)

- Cuándo aparece:
  - al aceptar una misión o al terminar un diálogo;
  - con el jugador quieto unos 6 s;
  - si camina en dirección contraria;
  - y una tecla «¿por dónde voy?».
- ~~Reducir la flecha flotante~~: se quitó del todo (ver «Flecha quitada»).

## Archivos de la guía

- `src/rpg/guide/GuideFlowField.js` (nuevo).
- `src/rpg/guide/GuideTrail.js` (nuevo).
- `src/rpg/OverworldManager.js`:
  - `_updateGuide` y `_guideOff`, llamados desde `_updateQuestNavigation`;
  - la estela se crea antes del precalentado final.
- `src/rpg/PlayerEntity.js`: se quita la flecha flotante delante del personaje.
- `src/rpg/OverworldCollisions.js`: contador `version` (sube con cada cambio de colisiones, agua, pendiente o límites).

---

# Parte B · Ajustes visuales

## Retratos de Axie dentro de su marco

Los retratos de Axie son fotos muy ajustadas: orejas, adornos y patas tocan el borde de la imagen. Al ampliarlos para llenar un círculo, parecían salirse del marco. Ahora se muestran **enteros, al 78 % del medallón y un poco más abajo del centro** (`object-fit: contain`). El retrato del Sapidae no cambia.

| Dónde | Cómo |
|---|---|
| Medallones del grupo en el HUD | `img.lk-pm-axie` (`SquadHUD.js`) |
| Mochila, ventana de Escuadrón, fin de combate (solo unidades con clase de Axie), tarjetas de Axie de la creación de personaje | `.lk-med.lk-med--axie` (`InventoryModal.js`, `SquadModal.js`, `CombatEndScreen.js`, `StartScreenUI.js`) |

**Regla:** todo medallón nuevo que muestre un Axie lleva `lk-med--axie`.

## Escuadrón de la Mochila

- **Una sola fila de 4:** el Sapidae y sus 3 Axies (`repeat(4, minmax(0, 1fr))`). Antes el 4.º bajaba a una segunda fila y dejaba un hueco. Se ganan unos 70 px de alto para las estadísticas.
- **Corazón del vínculo:** con los 4 en fila, el «!» de puntos sin gastar del vecino lo tapaba. Ahora va en la esquina inferior derecha del medallón.

## Runas

- **Runa en su ranura (Runas y charms):** la ranura mide 52 px, pero la imagen de la runa seguía a 58 px y quedaba 9 px a la derecha y 4 px abajo. Ahora mide 2,75 rem y queda centrada (medido: mismo centro que la ranura).
- **Philosopher's Stone más pequeña:** de las 90 runas era la única con otro encuadre (106 × 128, con el hexágono en 104 × 113 y una sombra suave debajo). Se veía un 12 % más baja y 7 px más arriba en todas partes. Se reencuadró como las demás (128 × 128, el hexágono a 127 px de alto y centrado) dentro de `assets/ui/runes-charms.json`. Las otras 179 imágenes quedan idénticas, byte a byte.
- **Dónde está el arte:** las 90 runas y los 90 charms están dentro de `assets/ui/runes-charms.json` (WebP en base64 por clave `runes/<id>` o `charms/<id>`), que carga `src/ui/RuneCharmArt.js`. No hay una carpeta de imágenes sueltas.

## Árboles con ramas sueltas o cruzadas (Bosque e islas)

- **Fallo:** las ramas nacían en un punto de la recta entre la base y la punta del tronco, no sobre el tronco curvado. En los troncos más torcidos quedaban hasta ~1 m fuera: ramas flotando o cruzando el tronco en X.
- **Arreglo:** ahora nacen sobre la curva real del tronco (`_branch` devuelve también `curve`).
  - Se hacen las mismas llamadas al azar: el bosque conserva la misma colocación, los colores y las formas de copa.
  - Arreglado en `GenshinTrees._buildBroadleaf` (Bosque) y en `IslandTrees` (el árbol gigante de las islas y los árboles secos).

## Archivos de los ajustes

- `src/rpg/ui/SquadHUD.js`: `lk-pm-axie`.
- `src/rpg/ui/InventoryModal.js`, `SquadModal.js`, `CombatEndScreen.js`, `StartScreenUI.js`: `lk-med--axie`.
- `src/ui/lunakai-ui.css`:
  - `.lk-pm-frame img.lk-pm-axie` y `.lk-med.lk-med--axie > img`;
  - la fila de 4 de `.lk-bag .lk-sq-strip` y el corazón `.lk-hb`;
  - el tamaño de `.lk-bag-runes .lk-socket-master-rune img.lk-rune-art`.
- `assets/ui/runes-charms.json`: solo la entrada `runes/neutral-philosophers-stone`.
- `src/rpg/world/demo_scena/genshin/GenshinTrees.js` y `src/rpg/world/islands/kit/IslandTrees.js`: ramas sobre el tronco.
