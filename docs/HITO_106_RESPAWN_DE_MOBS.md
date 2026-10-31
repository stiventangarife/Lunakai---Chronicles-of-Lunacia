# Hito 106: Respawn de mobs por isla, en puntos aleatorios de todo el bioma

> **Estado:** en la versión de prueba (31-oct-2026). Aceptado por el dueño del proyecto tras la prueba en el juego.
> **Pedido:** «los mobs no hacen re-spawn, la única forma de pelear con un mob de nuevo es recargar el juego». Que reaparezcan en todos los biomas, de forma aleatoria por toda la isla y no en un solo lugar, sin perder fluidez. Decisiones del dueño: 5 manadas por isla (los slimes del Bosque igual que las demás islas y lejos del pueblo); jefes y mobs de misión reaparecen con retardo más largo y, con la misión ya cumplida, sin objetos de misión; efecto simple de humo al aparecer.

## 1. Causa
- `spawnZoneMonsters` solo se ejecuta al entrar en una isla (`changeMap`); `despawnMonster` retiraba al mob para siempre. Solo «reaparecían» al cambiar de isla, y siempre en 4 anclas fijas (`ISLAND_MONSTER_LAYOUT`).
- Los 3 slimes del Bosque (`SlimeCreaturesManager`) tenían posición fija y `defeatedIds` los bloqueaba hasta recargar.
- `despawnSlime` no liberaba los materiales clonados del slime: con respawn se habrían acumulado.

## 2. Diseño
- **`src/rpg/world/MobRespawnDirector.js`** (lógica pura, sin three ni DOM): cola de reapariciones con reloj propio, un handler por tipo de mob y elección de punto. El reloj solo avanza mientras se explora (`WanderingMonsters.update`), así que se detiene en combate y menús. Con la cola vacía, `tick` suma un número y sale; con cola, comprueba una vez por segundo y atiende un mob a la vez. Un contador `epoch` descarta los trabajos de la isla anterior.
- **`src/rpg/world/islands/MobSpawnPools.js`** (solo datos): `ISLAND_SPAWN_POOL` (51–60 puntos por isla) y `RESPAWN_CONFIG` (población, retardos, distancias, LOD).
- **Dónde salen:** un punto del pool que esté a ≥ 50 m del jugador y ≥ 30 m de otros mobs, sin repetir los últimos 3, con preferencia por los más alejados de los demás mobs (reparto por toda la isla). Si el pool no da más, se relaja la separación entre mobs.
- **Qué reaparece:**

| Tipo | Quién | Dónde | Retardo |
| --- | --- | --- | --- |
| `pack` | manadas normales | punto aleatorio del pool | Bosque 45–75 s · Sabana 60–90 · Ártico 75–105 · Mística 90–120 · Genesis 120–150 |
| `boss` | primera manada de Ártico (`wolf_alpha`) y Genesis (`bear_mom`) | punto aleatorio del pool | 240–360 s |
| `fixed` | manada fusionada, mobs de misión de Sabana y Genesis | su puesto de siempre (la brújula de misiones los señala ahí) | 240–360 s |
| `slime` | slimes del Bosque | punto aleatorio del pool | 45–75 s |

- **Población:** 5 manadas libres por isla (`RESPAWN_CONFIG.population`), contando los jefes aleatorios; la manada fusionada y los mobs de misión van aparte. Al reentrar en una isla se vuelve a llenar hasta 5; en el Bosque, `refillToPopulation()` repone los slimes que faltan detrás del telón.
- **Mobs de misión:** los de la Sabana están siempre; los de Genesis aparecen mientras la misión hace falta y se quedan con la misión completada. La flecha-baliza solo se ve con su misión activa y el paso pendiente (ya lo decidía `update`).
- **Recompensas:** `OverworldManager.resumeAfterVictory` calcula antes de avanzar la misión si estaba pendiente. `hardened_ore` (antes se daba sin comprobar la misión) y los avisos «carcasa obtenida» y «ventisca disipada» solo salen la primera vez.
- **Efecto:** `spawnPuff` (10 bolitas) y aparición con rebote de 0,45 s. Se omite con «Reducir movimiento».

## 3. Rendimiento
- Los respawn solo eligen manadas cuyo líder ya está en `ModelCache` (`_warmPack`): no estrenan modelo ni texturas en mitad del juego. Los 3 modelos de slime se precargan al construir el Bosque.
- **Congelar lejos:** un mob que patrulla a más de 75 m del jugador no actualiza animación ni IA (los de misión no, para que su flecha responda). Entre 40 y 75 m, un fotograma de cada dos con el tiempo acumulado. Lo mismo para los slimes en reposo.
- Sin `setInterval` ni `requestAnimationFrame` nuevos para el reloj; sin luces nuevas; los sprites y materiales del slime retirado se liberan (`_disposeSlime`); `markShadowCastersDirty()` tras cada aparición.
- **Medido** con `lkDebug.perf` (60–75 s en el mundo abierto):

| | Antes (2 manadas) | Ahora (5 manadas) |
| --- | --- | --- |
| FPS medio | 57,4 | 59,5 |
| CPU mediana / p95 | 5,6 / 7,7 ms | 6,0 / 7,9 ms |
| Draw calls | 326 | 355 |
| Triángulos | 1,471 M | 1,493 M |
| Heap | 228–240 MB | 229–275 MB, sin crecimiento sostenido |

## 4. Herramientas
- **`lkDebug.spawnPool()`** (`src/rpg/world/SpawnPoolTool.js`): genera el pool de la isla donde estás. Tierra seca con margen respecto al agua (el agua poco profunda es caminable, por eso no basta `isPointBlocked`), sin colliders ni pendientes de más de 22°, alcanzable desde el muelle, lejos de NPC, edificios y, en el Bosque, del pueblo. Dibuja pilares de revisión y deja el bloque en `__lkSpawnPool.text`. Opciones: `shoreMargin`, `avoid`, `max`, `spacing`, `clear`. **Hay que regenerar el pool si cambia el terreno o se colocan edificios.**
- **`lkDebug.respawn()`:** cola y mobs vivos. `{ fast: true }` divide los retardos entre 25; `{ kill: true }` retira el mob libre más cercano como si lo hubieras ganado.

## 5. Archivos

| Archivo | Cambio |
| --- | --- |
| `src/rpg/world/MobRespawnDirector.js`, `islands/MobSpawnPools.js` | Nuevos |
| `src/rpg/world/SpawnPoolTool.js` | Nuevo (herramienta de desarrollo) |
| `src/rpg/WanderingMonsters.js` | Población desde el pool; `respawnSpec` en cada mob; `_spawnPackMonster`, `_spawnFixed`, handlers; LOD; aparición |
| `src/rpg/world/demo_scena/SlimeCreaturesManager.js` | Plantillas, `_spawnSlime`, `refillToPopulation`, `_respawnOne`, `_disposeSlime`, LOD |
| `src/rpg/OverworldManager.js` | Recompensas y avisos de misión solo la primera vez |
| `src/tactics/combat/CombatDebug.js` | `lkDebug.spawnPool`, `lkDebug.respawn` |

Originales en `backups/2026-10-30_respawn_mobs/`.

## 6. Reglas para el código nuevo
- Un mob que deba reaparecer lleva `respawn: { kind: 'pack' | 'boss' | 'fixed' }` en la config de `spawnMonster`. Los de puesto fijo pasan una función `make()` que devuelve `{ cfg, arrow? }` y se puede llamar de nuevo.
- Los respawn genéricos **no** llevan `logicalZone`: varias misiones se completan por la clave de zona del combate.
- Ningún respawn debe estrenar modelo ni shader en mitad del juego; si añades arquetipos a un bioma, precárgalos detrás del telón (`trackLoad`).
- Recompensas de un mob de misión: comprobar que la misión está activa y el paso pendiente **antes** de avanzarla.

## 7. Pendiente
- Pico de 202 ms al abrir el inventario por primera vez (shader del diorama del personaje y `captureModelAsync`); es el pendiente del Hito 103 (§3.7 y §7), ajeno a este hito.
- El círculo que evita el centro del Ártico (en 0, 0) y el del Gran Árbol de la Mística (3,5, −45,5) son aproximaciones; los pools se revisaron a mano en el juego.
