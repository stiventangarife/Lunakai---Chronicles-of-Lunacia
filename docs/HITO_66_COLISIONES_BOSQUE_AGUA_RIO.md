# Hito 66 — Colisiones de la Isla del Bosque, agua poco profunda y río de mar a mar

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** revisar isla por isla qué objetos deben tener colisión (empezando por el Bosque), sin perder rendimiento; poder caminar solo por la orilla poco profunda del mar (hasta la rodilla) con efecto de agua; río que cruce la isla de lado a lado, con un puente nuevo en el pueblo y vados al norte y al sur.

## Rendimiento de las colisiones (rejilla espacial)

- Antes cada comprobación recorría todas las colisiones de la isla. Ahora cada colisión se apunta en las celdas de 8 m que toca y la consulta solo mira las celdas cercanas.
- Mismos resultados que el sistema anterior: 800.000 comprobaciones comparadas, 0 diferencias.

| Colisiones en la isla | Antes | Ahora |
|---|---|---|
| 1.000 | 1,7 µs | 0,36 µs |
| 3.000 | 6,9 µs | 0,6–1,1 µs |
| 8.000 | 17,8 µs | 1,2 µs |

- Rehacer la rejilla tras un alta o baja: ≤ 1,8 ms con 8.000 colisiones (solo al entrar en una zona o al cambiar algo).
- `resolveMovement` devuelve un vector reutilizado (sin crear objetos por movimiento).
- Las listas `circles`, `boxes` y `segments` se pueden seguir sustituyendo desde fuera (ForestBridge, ForestDojo y ForestVillage lo hacen): al asignarlas, la rejilla se rehace.
- Consola: `lkColliders.show(true)` dibuja las colisiones en el suelo; `lkColliders.info()` da el recuento.

## Fase A — Colisiones del Bosque

| Qué | Cantidad | Colisión |
|---|---|---|
| Árboles de hoja | 134 | tronco (0,6–1,2 m) |
| Pinos | 60 | tronco (0,4–0,7 m) |
| Rocas medianas y columnas de roca | 109 | base de cada pieza (vértices del primer metro) |
| Gran Árbol Ancestral | 1 | tronco (4,2 m) |
| Monolitos del santuario que tocan el suelo | 2 | base (el que flota no) |

- Arbustos, helechos, setas, flores y piedrecitas: sin colisión (decisión del usuario).
- Los árboles y rocas que el pueblo retira de sus claros no cuentan (`ForestVillage` avisa con `refreshForestColliders`).
- Se dan de alta al activar la isla y de baja al salir (etiqueta `forestisle_`).
- Comprobado con un relleno de 1 m desde el jugador: todos los NPC, puntos de recolección y el musgo de la misión de Ema siguen alcanzables; no se cierra ningún camino (los huecos sin salida son los mismos que antes: interiores del pueblo).

## Fase B — Agua poco profunda

- **Límite por profundidad:** se camina mientras el agua cubra ≤ 0,5 m (hasta la rodilla). Más honda, el personaje se para y se desliza por el borde. Afecta igual a los monstruos.
- La profundidad (mar y río) se precalcula al cargar la isla en una cuadrícula de 1 m: 129 ms en total, repartidos en trozos de 4 ms (sin tirones). Consulta interpolada: 0,31 µs con todas las colisiones del Bosque.
- **En el mar** queda una franja caminable de 1–2 m en la orilla (depende de la pendiente de la playa).
- **Efecto al caminar por el agua:**
  - ondas en anillo (al pisar, estela al avanzar, onda lenta parado);
  - salpicaduras de gotitas en cada paso;
  - chapoteo en lugar del paso normal (más grave cuanto más honda);
  - sin huellas ni polvo dentro del agua;
  - el compañero también hace ondas.
- Coste: dos mallas (anillos y gotas, mezcla aditiva) con piezas reutilizadas; se ocultan cuando no hay nada activo.

## Fase C — Río de mar a mar, puente del pueblo y vados

- **Río alargado** hasta el mar del norte. Antes nacía en un manantial (z −115). Baja en rápidos con espuma hasta el nivel del mar (z −124 → −146) y se abre en la desembocadura como la del sur.
- **Isla idéntica:** la vegetación se coloca con el terreno anterior (cada rechazo cambia la secuencia aleatoria) y después se apoya en el suelo nuevo. Resultado: mismos árboles, rocas, plantas y guijarros; solo se retiró 1 árbol que quedaba dentro del cauce nuevo.
- **Puente del pueblo:** donde el camino de los Riscos cruza el río al pie del Gran Árbol, de (2,2, −29,2) a (30,6, −21,9). Mismo modelo que el de los rápidos, con barandas de colisión.
- **Vado norte:** a lo largo del camino principal, que ya cruzaba el río en diagonal (el «Vado del Río» de RoadManager). El lecho sube hasta dejar 0,28 m de agua.
- **Vado sur:** paso recto entre el puente de los rápidos y el mar (z 95).
- 31 piedras planas marcan los vados (una sola malla instanciada, sin colisión: se pisan). El agua se ve más clara porque el sombreado del río usa la profundidad real.
- Comprobado con relleno desde el pueblo:
  - todo sigue alcanzable;
  - cada cruce por sí solo conecta las dos orillas (puente del pueblo, vado norte, vado sur);
  - sin puentes ni vados, el río separa la isla por completo.

## Ajustes tras la revisión del usuario (24-oct-2026)

**Menos ondas al caminar** (unas 4 veces menos):
- sin estela continua: una onda por paso del personaje y una de cada dos pisadas del compañero;
- parado, una onda lenta cada 2,2 s (antes cada 1,1 s);
- 3–4 gotas por paso (antes 5–9).

**Río y mar unidos:**
- **Sin lengua de arena:** el cauce se excava hasta el fondo del mar (`RIVER_CARVE_Z0` = −190) y la boca norte se abre como un estuario (hasta ×1,7, `getNorthMouthFactor`, el mismo en el cauce y en el agua).
- **Sin borde recto:** en los últimos 13 m de cada boca, el agua del río se vuelve transparente hacia el final y hacia los lados (atributo `aFade`). Debajo ya se ve el mar, al mismo nivel.
- **Corriente suave:** la bajada al mar se reparte en 35 m (z −112 → −147) en vez de 22. En el norte, la espuma son estrías finas en la corriente, sin manchas blancas.
- Una línea suave de espuma donde el río se encuentra con el mar.
- **Corrección en la boca norte:** el vado norte llega solo hasta z −84, donde el camino atraviesa el río. Antes seguía el camino hasta el mar y dejaba 6 piedras y una franja somera en la boca.
- El estuario se abre solo hacia el oeste, así la orilla este y el camino quedan en tierra.
- Menos destellos en el agua somera y en la bajada al mar (eran la banda de puntitos blancos).
- Igual en la boca sur.
- Comprobado de nuevo:
  - cada cruce (puente del pueblo, vado norte, vado sur) conecta las dos orillas;
  - sin ellos, el río separa la isla;
  - todos los NPC y puntos de recolección siguen alcanzables;
  - la vegetación no cambia.

## Código

- **Nuevos:**
  - `rpg/world/WaterDepthMask.js`;
  - `demo_scena/ForestColliders.js`;
  - `demo_scena/WaterWadeEffects.js`;
  - `demo_scena/RiverFords.js`.
- **Cambiados:**
  - `rpg/OverworldCollisions.js` (rejilla, agua, listas con asignación);
  - `demo_scena/DemoScenaZone22.js` (colisiones, máscara de agua, puente, vados);
  - `ForestVillage.js` (aviso tras los claros);
  - `FootstepEffectsManager.js` (agua);
  - `PlayerController.js` y `TacticalAudio.js` (chapoteo);
  - `WaterManager.js` (río de mar a mar, vados);
  - `Terrain.js` (cauce nuevo, vados, modo `legacyHeights`);
  - `PropsManager.js` (colocación con el terreno anterior y ajuste);
  - `genshin/GenshinTerrainData.js` y `genshin/GenshinWater.js` (hierba y rápidos del norte);
  - `ForestBridge.js` (varios puentes).

## Pendiente

- Medir los fps recorriendo la isla con el panel del navegador visible (la medición de esta sesión quedó sin hacer porque el panel estaba oculto). Los costes medidos (consultas de 0,3 µs, repintado instanciado) no deberían notarse.
- Siguientes islas: Sabana, Ártico, Mística y Génesis.

## Capturas

`cap/A_*` colisiones del Bosque, `cap/B_*` agua poco profunda, `cap/C_*` río, puente y vados.
