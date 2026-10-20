# Hito 35 — Mapas de combate por bioma

> **Estado:** completado en la versión de prueba (17-oct-2026).
> **Pedido:** el tablero de combate se parece al bioma donde empieza el combate; 3 mapas por bioma, uno al azar; mapas de distintos tamaños y formas.

## Qué cambia en el juego

- **Cada bioma tiene 3 mapas propios.**
  - Al entrar en un combate del mundo abierto sale uno de los 3 mapas del bioma, al azar y sin repetir el último.
  - Los **jefes** usan siempre su mapa de jefe (👑 en la tabla).
- **Tamaños y formas distintos:** desde 7×12 hasta 13×12, con esquinas recortadas, cruces, anillos y pasillos. También hay agua que se cruza por puentes, grietas en el suelo e islas flotantes.
- **El escenario usa el arte de la isla donde empezó el combate:**
  - los árboles de IslandTrees: arces otoñales, acacias, palmeras, abetos nevados, árboles de jade y lavanda, y árboles turquesa y naranja de Genesis;
  - las rocas de la isla con su material: musgo, arenisca con estratos, nieve y lavanda;
  - la vegetación GLTF de las islas, los cactus, los hongos luminosos, los cristales y los pilares lavanda;
  - las partículas, el cielo, la luz y la niebla de cada isla.
- **No cambia:**
  - los niveles antiguos de la campaña y la arena de pruebas (`lkDebug.arena()`) siguen en el 10×10 de siempre. El tutorial pasó al Claro de Arces en el Hito 37;
  - las reglas, el daño, el pronóstico, las cartas y los VFX.

## Los 15 mapas

| Bioma | Mapa | Tamaño | Casillas | Rasgo |
| --- | --- | --- | --- | --- |
| 🌲 Bosque | Claro de Arces (`forest_maple_glade`) | 10×10 | 84 | Esquinas recortadas y sendero central |
| 🌲 Bosque | Vado del Río (`forest_river_ford`) | 12×9 | 87 | Río de lado a lado con 2 puentes de tablones |
| 🌲 Bosque | Raíces del Gran Árbol 👑 (`forest_great_roots`) | 11×11 | 92 | Gran árbol en el centro y rocas como cobertura |
| 🏜️ Sabana | Meseta Dorada 👑 (`savannah_golden_mesa`) | 13×8 | 85 | Ancho, con cactus y arenisca |
| 🏜️ Sabana | Oasis Escondido (`savannah_oasis`) | 11×11 | 82 | Anillo alrededor de un estanque |
| 🏜️ Sabana | Cañón de Arenisca (`savannah_canyon`) | 14×7 | 62 | Pasillo en zigzag entre paredes de 3,8 m |
| ❄️ Ártico | Lago Helado 👑 (`arctic_frozen_lake`) | 10×10 | 80 | Octágono con un lago de hielo en el centro |
| ❄️ Ártico | Paso Glaciar (`arctic_glacier_pass`) | 7×12 | 71 | Largo y estrecho, con grietas y paredes de hielo |
| ❄️ Ártico | Campamento Boreal (`arctic_boreal_camp`) | 12×10 | 58 | En cruz, con 4 brazos para flanquear |
| 🔮 Mística | Pantano Luminoso (`mystic_glow_swamp`) | 11×11 | 85 | Charcas sueltas: cortan el paso, no la visión |
| 🔮 Mística | Islas de Cristal (`mystic_crystal_isles`) | 11×11 | 68 | Islotes flotantes unidos por puentes de 1 casilla |
| 🔮 Mística | Círculo Arcano 👑 (`mystic_arcane_circle`) | 11×11 | 88 | Círculo con anillo de cristales |
| ✨ Genesis | Jardín Real (`genesis_royal_garden`) | 12×12 | 128 | Cruz de caminos dorados y 4 pedestales |
| ✨ Genesis | Puerta del Santuario (`genesis_sanctum_gate`) | 9×11 | 78 | Avenida con hileras de pilares lavanda |
| ✨ Genesis | Santuario del Origen 👑 (`genesis_sanctum_origin`) | 13×12 | 117 | Redondo, con anillo de pilares y trono central |

## Cómo se escribe un mapa

Los mapas son datos en `src/tactics/maps/BattleMaps.js`: una letra por casilla y filas de la misma longitud.

| Letra | Casilla |
| --- | --- |
| `.` `,` | Suelo y suelo alternativo (sendero, arena, hielo, camino dorado) |
| `=` | Puente (se camina) |
| `P` / `E` | Salidas del jugador / del enemigo. La más central es la del Sapidae o la del líder |
| `T` `R` `C` | Obstáculos: árbol, roca y pieza especial del bioma (cactus, hielo, cristal, pilar, gran árbol) |
| `w` | Agua: corta el paso, **no** la línea de visión |
| `#` | Fuera del tablero: terreno con decoración |
| `~` | Fuera del tablero: grieta o vacío |

- Opciones de cada mapa:
  - `boss: true` lo marca como mapa de jefe;
  - `terrainRise` levanta paredes de cañón o de glaciar alrededor del tablero;
  - `floating: true` deja los islotes flotando sobre el mar de nubes;
  - `seed` fija la decoración.
- **Validador:** `node tools/battle-maps/check-maps.mjs`. Comprueba en cada mapa:
  - que haya al menos 4 salidas por bando;
  - que todas las casillas estén conectadas;
  - la distancia entre los dos bandos (de 5 a 11);
  - el número de casillas y de obstáculos;
  - que haya 3 mapas por bioma con 1 de jefe;
  - que la IA llegue a cualquier casilla desde cada salida enemiga;
  - que la elección sea al azar sin repetir.

## Cómo funciona

| Archivo | Cambio |
| --- | --- |
| `src/tactics/maps/BattleMapLayout.js` | Nuevo. Lee el texto del mapa, ordena las salidas y calcula hacia dónde mira cada unidad. |
| `src/tactics/maps/BattleMaps.js` | Nuevo. Los 15 mapas, `pickBattleMap(bioma, { isBoss })` y `forceBattleMap(id)`. |
| `src/tactics/arena/BattleArenaThemes.js` | Nuevo. Paletas y arte de cada bioma, tomados de los perfiles de las islas. |
| `src/tactics/arena/BattleArena.js` | Nuevo. Construye el tablero, el terreno, la decoración y las partículas. Se libera al salir del combate. |
| `src/tactics/GridManager.js` | `loadLayout(mapa)` cambia el tamaño y la forma del tablero. `isValidCoord` es falso fuera del tablero. `useLegacyLayout()` vuelve al 10×10. |
| `src/tactics/SceneManager.js` | `setArena(arena)`: pone el escenario, oculta el islote de siempre y ajusta la cámara y las sombras al tamaño del tablero. |
| `src/tactics/DynamicCombatFactory.js` | Elige el mapa (jefe o azar) y coloca a cada unidad en las salidas del mapa, mirando al bando contrario. |
| `src/rpg/WanderingMonsters.js` | Las manadas con líder fijo (👑) se marcan como jefe (`pack.isBoss`). |
| `src/tactics/TacticalAI.js` | En los mapas con forma, el enemigo se acerca por distancia caminando y no en línea recta: así rodea ríos, grietas y esquinas en vez de quedarse quieto. En el 10×10 no cambia. |
| `src/main.js` | Carga el mapa y su escenario al empezar el combate y lo libera al volver al mundo abierto. Añade los comandos de consola. |
| `battle_maps_preview.html` | Visor de los 15 mapas (`?map=id&angle=0..7`). |

**Reglas en tableros con forma.** No hizo falta cambiar ninguna regla:

- Las casillas que no existen devuelven `false` en `isValidCoord`. Movimiento, alcance, áreas, teletransportes e IA las tratan como fuera del tablero.
- Un empuje contra el vacío o el agua **choca como contra un muro**: hay daño por colisión y no se cae.
- El agua y las grietas dejan ver a través: se puede disparar por encima del río, aunque no sobre el agua misma.
- En los mapas con paredes (Cañón de Arenisca y Paso Glaciar), el terreno fuera del tablero **tapa la visión**, igual que se ve en pantalla. En el resto de mapas el terreno de fuera es bajo y no la tapa.
- Los árboles y rocas del mapa no se pueden quitar (`removeObstacle` los ignora).
- **Casillas inutilizables (18-oct):** ninguna habilidad se puede lanzar sobre una casilla con obstáculo (roca, árbol, cristal, pilar, barricada…), con agua o fuera del tablero. Esas casillas tampoco se marcan en rojo al elegir la habilidad. Vale para todos los tableros, también el 10×10, y para el jugador y la IA (`SpellManager.getValidTargetCells`).
  - Las áreas no cambian: si el área de una habilidad toca una de esas casillas, no pasa nada en ella, porque nunca hay una unidad.
  - Sobre el agua se sigue viendo y disparando hacia otras casillas.
- **Tableros sin árboles (18-oct):** para que se vea mejor el combate, se quitaron los árboles **del tablero** (la `T`) en el Bosque, la Sabana, el Ártico (los pinos) y el Pantano Luminoso. Esas casillas son ahora suelo libre.
  - En Raíces del Gran Árbol solo queda el gran árbol del centro.
  - Siguen con árboles en el tablero: las Islas de Cristal y los mapas de Genesis.
  - Los obstáculos de otro tipo (rocas, cactus, hielo, cristales, pilares) y la decoración de alrededor del tablero no cambian.

**Jefes.** Usan su mapa fijo:

- las manadas con líder fijo (👑);
- los enemigos con rol `apex_boss` o `armored_titan`;
- los combates de misión `mob_polar_golem` y `mob_oracle_chimera`.

**Árboles que tapan.** La cámara gira 360°. Los árboles de alrededor que quedan entre la cámara y el tablero se disuelven con un tramado de pantalla, como el *Fade LOD* del Ártico, y vuelven al girar. Los árboles que son obstáculos del tablero no se disuelven.

**Rendimiento.**

- Cada escenario tiene entre 26 y 44 mallas y no añade luces puntuales.
- Se construye en 65–400 ms de CPU; el primero es el más lento porque carga los GLTF.
- Las plantillas GLTF y la corteza de los árboles se comparten entre combates.
- Si un asset tarda más de 8 s, el combate empieza sin él. Si fallara el escenario entero, se dibuja solo el tablero (losas, agua y obstáculos simples), y el combate se juega igual.
- Al pasar 3 veces por 5 mapas, la memoria de la GPU se queda estable: no hay fugas.

## Consola (F12)

| Comando | Qué hace |
| --- | --- |
| `lkDebug.maps()` | Tabla de los 15 mapas |
| `lkDebug.map('savannah_oasis')` | Los siguientes combates del mundo abierto usan ese mapa |
| `lkDebug.map(null)` | Vuelve la elección al azar por bioma |

## Pruebas

- **Validador:** los 15 mapas son válidos, la elección al azar no repite y los jefes usan su mapa fijo.
- **Combates IA contra IA con las reglas reales en los 15 mapas:**
  - todos terminan;
  - no hay unidades superpuestas, fuera del tablero ni sobre agua u obstáculos;
  - no hay errores de JavaScript.
- **La IA nunca se atasca:** desde cada salida enemiga llega a cualquier casilla en los 4.956 recorridos posibles (antes del cambio en `TacticalAI`, la revisión encontró cientos de recorridos en los que se quedaba quieta).
- **Revisión independiente del código** (otro agente): sin rutas que fallen en tableros con forma. Sus 4 observaciones se corrigieron: IA, respaldo del escenario, tiempo límite de los assets y visión a través de las paredes.
- **Empujes contra el vacío y el agua** (Islas de Cristal, Paso Glaciar, Cañón): la unidad choca y se queda en su casilla.
- **Configuraciones del mundo abierto:** 5 biomas × (normal, jefe 👑, `apex_boss`, misión de jefe).
  - Las posiciones son distintas, siempre caen sobre suelo y cada unidad tiene orientación.
  - Los jefes usan su mapa fijo.
- **10×10 de siempre:** la imagen es idéntica píxel a píxel a la anterior en los 6 biomas antiguos.
  - Después de visitar varios mapas y volver, el estado es idéntico: cámara, sombras, sol, nubes y casillas.

## Pendiente

- Probarlo en partidas reales, con los modelos de los Axies y los VFX, para ajustar la distancia de la cámara y la cantidad de decoración.
- El tablero sigue siendo plano: las alturas cambiarían la línea de visión y el clic.
