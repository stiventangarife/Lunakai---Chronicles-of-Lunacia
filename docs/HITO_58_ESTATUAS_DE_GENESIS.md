# Hito 58 — Estatuas GLB en Genesis (Jardín Real y Espíritu de Atia)

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** cambiar la estatua del centro de la plaza por `peluche.glb` y las que la rodean por `lanza`, `hacha`, `doble`, `mando`, `baston`, `arco` y `mana`, todo optimizado.

## 1. Qué cambia (plaza central, 0, 0)

| Antes | Ahora |
| --- | --- |
| Tótem turquesa con cuernos (primitivas) | `peluche.glb` ×3 (~5,7 m), mirando a la avenida del este, por donde se llega desde la Puerta del Santuario. |
| 6 monumentos abstractos sobre pedestales de mármol, en un círculo de 17 m | 7 estatuas de armas ×3 (~5,7 m): lanza, hacha, doble, mando, bastón, arco y maná, repartidas por igual en el mismo círculo y mirando al centro. Traen su propia base de piedra, así que ya no hay pedestales. |

Se quedan la hoguera (con su luz), el cristal rosa y el círculo de runas.

## 2. Código

- `islands/kit/IslandProps.js`: entradas `peluche` (escala 3, colisión 2.4, apoyo `mid`) y las siete armas (escala 3, colisión 1.2–1.4). Caché `#islas`.
- `islands/dungeon/GenesisLandmarks.js`: `_buildPlazaStatues()` sustituye el tótem y los seis monumentos (bloques de primitivas eliminados).

## 3. Assets (mapa de normales 1024 → 512)

| Archivo | Tamaño |
| --- | --- |
| `peluche.glb` | 320 → 227 KB |
| `lanza.glb` | 516 → 369 KB |
| `hacha.glb` | 512 → 353 KB |
| `doble.glb` | 543 → 392 KB |
| `mando.glb` | 468 → 332 KB |
| `baston.glb` | 470 → 337 KB |
| `arco.glb` | 588 → 410 KB |
| `mana.glb` | 606 → 394 KB |

Originales en `scratch/_respaldo_glb/`.

## 4. Pruebas

Las ocho piezas cargan con su textura y miden 5,7 m; capturas de antes y después de la plaza.

## 5. Espíritu de Atia (Santuario del Origen, 0, 92)

- Modelo nuevo: `atias.glb` (Atia sentada en meditación sobre su base) en lugar de `statue_atia.glb`. El archivo está en `assets/models/atias.glb`, donde `NPCManager` busca los modelos de personajes, con el mapa de normales a 512 (411 → 273 KB). El original sigue en `assets/environment/atias.glb`.
- `MapRegistry` (`atia_spirit`): `model: 'atias.glb'`, `matte: true` (la luz viene en la textura), `scale: 10.2` (~10 m de alto: su base, de 8,4 × 6,9 m, ocupa el primer círculo del suelo, el cian de radio 4,2 m), `collisionRadius: 3.9`, `interactRadius: 7` (se habla con ella desde el borde del círculo), `calloutRadius: 11` y `bubbleHeight: 11`. Mantiene su posición, su contorno, su misión y su retrato (`statue_atia.png`).
- `NPCManager`: `interactRadius` y `calloutRadius` se pueden fijar por NPC (antes siempre 4 y 7,5), y la luz azul de las estatuas crece con su tamaño (más alcance y delante de la figura, no enterrada dentro).

## 6. Atia Flame

- Nuevo `islands/dungeon/GenesisAtiaFlame.js`: llama sagrada flotando delante del pecho del Espíritu de Atia (2,6 m al frente, 5 m sobre el suelo, 2,2 m de tamaño). Núcleo dorado pálido y tres capas de llama con lenguas que se mueven en el shader (turquesa con puntas naranja-doradas), halo que respira hacia la cámara y brasas que suben (`IslandParticles` 'embers'). Las capas exteriores usan mezcla alfa para que el color se vea sobre el mármol claro; el núcleo, la capa interior, el halo y las brasas son aditivos.
- Coste: 5 llamadas de dibujo, unos mil triángulos, sin luces nuevas y sin trabajo de CPU por fotograma (solo el uniforme de tiempo).
- La luz de la estatua (`NPCManager`) acepta `lightColor` y `lightOffset` por NPC: en `atia_spirit` es turquesa-dorada (0x9ff4dc) y está delante del pecho, junto a la llama. El pulso de esa luz respeta ahora su intensidad base (antes la fijaba siempre en 1,6).
- Se construye en `GenesisLandmarks._buildAtiaFlame()`, con el Santuario.

## 7. Nombres en los textos: Sapidae y Axie principal

- Antes, los textos del grupo decían «{heroName}, Bing, Pomodoro»: el primero era el Sapidae y los otros dos estaban escritos fijos.
- Nuevo marcador `{axieName}`: el nombre del Axie principal del escuadrón (`getSquad()[1]`). Lo resuelven `DialogSystem` (`axieName()`, con `axieNameFn` puesto por `OverworldManager`), los globos de `NPCManager` y `QuestManager._formatText` (`getAxieName()`).
- Cinco textos pasan a «{heroName} y {axieName}»: el globo y la misión del Espíritu de Atia (`MapRegistry`, `QuestManager` `quest_primeval_purification`) y tres diálogos del Oráculo Astral (`NPCManager`).
- Corrección: `QuestManager.getHeroName()` devolvía el primer héroe desbloqueado; ahora devuelve el nombre del Sapidae, igual que los diálogos.

## 8. Obeliscos de la avenida del este

- Los 8 obeliscos procesionales estaban en una fila recta hacia el oeste desde la Puerta, pero la avenida gira hacia el suroeste: los más alejados quedaban sobre el camino o lejos de él.
- Ahora siguen la línea central de la avenida: un par cada 9 m, a 5,5 m de cada lado, girados con ella. La avenida es una sola lista, `GENESIS_SITES.eastAvenue`, que usan `DungeonIsland` (para pintarla) y `GenesisLandmarks` (para los obeliscos).

## 9. Kotaro en el Jardín Real

- Kotaro (`sulfur_guard`, misión `quest_sulfur_threshold`) pasa de la Puerta del Santuario (104, 13) a la plaza central, en (15.0, 4.2), entre las estatuas de armas y mirando a la avenida del este (`rotation: π/2`). Cambia en `MapRegistry` y en `GENESIS_SITES.npcs.kotaro`.
- `DungeonIsland` sigue reservando su antiguo sitio junto a la Puerta, para que la vegetación de allí no cambie.

## 10. Silueta de la Isla del Bosque (horizonte)

- `savanna/SavannaDistantIslands.buildForestIsland` (la silueta que se ve desde las otras cuatro islas): el Gran Árbol se apoyaba sobre la punta de un cono y parecía flotar.
- Ahora la colina central es una meseta (cono truncado, cima de 144 m) y el árbol se apoya en ella, un 15 % más pequeño, con el tronco algo hundido y raíces anchas en la base. Hay seis copas de bosque bajas sobre las laderas.
- Mismo material; `mergeStaticByMaterial` lo sigue juntando en una sola malla.

## 11. Canoa de Kawa en Ártico, Mística y Genesis + revisión de memoria

- `GrandIslandZone._buildFerryCanoe()` (tabla `FERRY_CANOES`): la canoa `balsa.glb` (kit `IslandProps`, caché `#islas`) flota y se mece junto al barquero. Posiciones: Ártico (14.3, 148), a 12 m; Mística (155.7, 17.5), al pie del acantilado, a 20 m; Genesis (142, 19.6), a 6 m. No proyecta sombra.
- Revisión de memoria (Sabana → Ártico → Mística → Genesis → Bosque): en la tarjeta gráfica solo están las texturas de la isla activa; las de las demás se liberan (`WorldMapManager.releaseTextures`), también las de las canoas. Los NPC de cada zona, incluida la estatua de Atia, se destruyen al cambiar de zona (`NPCManager._disposeNPC`). Todos los GLB nuevos tienen el mapa de normales a 512 y son estáticos (`matrixAutoUpdate = false`). Lo único que se conserva es la copia en RAM de las imágenes de la caché `#islas`, para volver a subirlas sin descargar al regresar.
- Corrección: las canoas se veían llenas de agua porque iban hundidas 0,45 m (el casco mide 1,2 m y el oleaje lo cubría por dentro). `IslandProps` las coloca ahora con un calado de 0,12 m (base a 0,33 con el mar a 0,45), en las tres islas y también en la Sabana.
