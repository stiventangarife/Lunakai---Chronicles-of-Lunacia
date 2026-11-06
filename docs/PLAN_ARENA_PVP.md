# Plan: Arena PvP (Koliseo)

> **Estado:** **terminado el 4-nov-2026** (fases P0–P6, secciones 11–17; resumen en `docs/HITO_123_ARENA_PVP.md`). Probado con dos cuentas reales en Supabase. Plan del 3-nov-2026. Investigación y comparación Colyseus / Supabase en `PLAN_KOLISEO_PVP_Y_DESAFIO_DE_LA_BRUMA.md` (se eligió **Supabase**: *lockstep* determinista + árbitro).
> **Decisiones del usuario:**
> - 1 contra 1, cada uno con su Sapidae y su Axie principal;
> - mapa al azar;
> - **sin Duo Ultimate**;
> - temporada de **un mes**;
> - bAXS para los **10 mejores** (30 / 20 / 15 / 10 / 5);
> - **arena igualada** (confirmada);
> - **puntos desde la primera partida** y clasificación con los 10 mejores más tu puesto;
> - límite de **25 rondas**;
> - el Koliseo se abre con un botón del HUD y desde el Maestro Paladill (sin edificio en el mapa).
> **Orden:** se construye después del Desafío de la Bruma, que deja hechos el Koliseo, las temporadas y las clasificaciones.

---

## 1. Arena igualada (confirmada)

En el PvP clasificado, **estadísticas igualadas**:

| Qué | En la arena clasificada |
|---|---|
| Nivel | Todas las unidades a **nivel 10**: las 6 habilidades desbloqueadas y el mismo bono de nivel (+18 de vida, +27 de iniciativa). |
| Puntos de atributo repartidos | No cuentan (0). |
| Equipo (armas, cascos, armaduras…) | No da estadísticas; solo se ve (cosmético). |
| Runas y charms | Desactivados. |
| Duo Ultimate | Desactivada (decisión del usuario). |
| Lo que sí decide | La **clase del Sapidae** (y su gólem), las **partes reales del Axie** (sus 6 cartas, su clase y su rol) y cómo se juega. |

**Por qué:**
1. **No se compra la clasificación.** El equipo T1–3, las runas y los charms se comercian por **AXS** en el Mercado (Hito 110). Si dieran ventaja en una clasificación que paga bAXS, el PvP premiaría a quien compra. En un evento de Axie eso se critica enseguida.
2. **Hay pocos jugadores:** el emparejamiento juntará niveles muy distintos. Igualado, un jugador nuevo puede ganar a uno antiguo.
3. **Es más fácil de equilibrar y de arbitrar:** la «foto» del equipo es pequeña (clase del Sapidae + partes del Axie) y el servidor la puede comprobar.
4. **Encaja con el ADN de Axie:** como en Origins, la ventaja está en el Axie que eliges y sus partes, no en subir números.

**Más adelante:** una **Arena libre** sin clasificar con todo lo real (equipo, runas, charms), para quien quiera probar su progreso.

---

## 2. Reglas del combate PvP

| Regla | Valor |
|---|---|
| Unidades | Sapidae + Axie principal por bando (más el gólem del Sapidae cuando lo invoca). |
| Mapa | Uno al azar de la **lista PvP**: los mapas del juego que pasen la revisión de justicia de la sección 6 (sin mapas de jefe). |
| Bandos | A y B sorteados con la semilla. A sale en las casillas `P` y B en las `E`. Cada jugador se ve siempre «abajo» (la cámara gira; las reglas no). |
| Orden de turnos | Alternado por bandos, como hoy, ordenado por iniciativa. Con empate empieza el bando que diga la semilla (hoy el empate lo ganaba «el jugador»: en PvP no sirve). |
| Cronómetro | `TurnTimer` (30 s más el sobrante, hasta 45 s; castigo por inactividad). El servidor guarda la hora límite de cada turno. |
| Fin | Gana quien deja al rival sin unidades (los gólems no cuentan). **Límite de 25 rondas:** gana quien tenga más vida total en %; si empatan, empate. |
| Rendirse | Botón con confirmación; cuenta como derrota. |
| Desconexión | 60 s para volver, con la partida esperando. Si no vuelve, derrota. |

## 3. Clasificación y temporada

- **Temporada:** mes natural, del día 1 a las 00:00 al último día a las 23:59 (UTC−5).
- **Puntos desde la primera partida:** Elo con inicio en 1000 y K = 32 en las primeras 20 partidas (luego 24). Mínimo +10 al ganar y máximo −30 al perder.
- **Clasificación:** los **10 mejores** y, si estás fuera, **tu puesto** debajo (por ejemplo, «#37 · 1048 puntos»).
- **Cierre de temporada:** reinicio suave, `nuevo = 1000 + (puntos − 1000) / 2`, y paso de la clasificación al histórico.
- **Reparto:** sin mínimo de partidas; cuenta desde la primera.
  - **Empate de puntos:** gana quien jugó más partidas y, si siguen iguales, quien llegó antes a esa cifra.
  - El riesgo de «ganar 2 y retirarse» es bajo con K = 32 y muchos jugadores; si se viera en la primera temporada, se puede añadir un mínimo después.
- **Antiabuso:**
  - contra el mismo rival solo cuentan **3 partidas al día** para los puntos;
  - se registran las cuentas que se enfrentan siempre entre sí para revisarlas.

### Reparto de bAXS (demo, propuesta)

| Puesto | bAXS |
|---|---|
| 1 | 30 |
| 2 | 20 |
| 3 | 15 |
| 4–5 | 10 cada uno |
| 6–10 | 5 cada uno |
| **Total por temporada** | **110** |

Referencias: el bono de inicio es de 15 bAXS y una evolución en la Forja cuesta 0,5 bAXS de tasa. El bAXS no se intercambia (Hito 110).

### SLP por partida

- Victoria: **15 SLP**; derrota: 0.
- Tope de **10 victorias con SLP al día**.
- Cifras en el catálogo del servidor (`reward:pvp_win`), ajustables sin tocar el cliente.

---

## 4. Arquitectura (Supabase, sin servidor nuevo)

```
Cliente A ──pvp_act()──▶ Postgres (comprueba turno, orden, tiempo) ──realtime.send──▶ Cliente B
    ▲                         │ pvp_actions (todas las órdenes, con hora)                 │
    └──────────── Realtime (canal privado de la partida, Presence) ◀──────────────────────┘
Fin o disputa ──▶ Edge Function «arbiter» (motor sin gráficos) ──▶ resultado oficial, Elo, SLP
```

1. **Cola:** `pvp_enqueue(slot)` guarda la entrada y busca rival con ±100 puntos. La ventana se amplía 100 cada 15 s, hasta cualquiera a los 60 s.
   - Al emparejar crea la partida y avisa a los dos por Realtime.
   - `pvp_leave_queue` para cancelar; la entrada caduca sola a los 2 minutos sin latido.
2. **Partida:** `pvp_matches` guarda la semilla, el mapa, los bandos y la **foto igualada** de los dos equipos.
   - La foto la arma el servidor a partir de la ranura en la nube: clase del Sapidae, Axie principal y sus partes.
   - El cliente no puede mandar sus propias estadísticas.
3. **Órdenes:** `pvp_act(match, seq, order)` con `MOVE {unit, x, z}`, `CAST {unit, spell, x, z}` o `END_TURN`.
   - El servidor comprueba que juega el bando del turno, que `seq` es el siguiente y que no ha vencido el tiempo.
   - Si todo es correcto, guarda la orden en `pvp_actions` y la reenvía.
   - No revisa si la jugada es legal; eso lo hacen los dos clientes y el árbitro.
4. **Simulación:** los dos clientes ejecutan las mismas órdenes con la misma semilla.
   - Tras cada turno calculan una **huella del estado** (vida, PA, PM, casillas, estados) y la envían con `END_TURN`.
   - Si las huellas no coinciden, la partida se marca en disputa.
5. **Árbitro:** Edge Function en Deno que importa el motor sin gráficos, repite la partida desde las órdenes guardadas y fija el resultado.
   - Se llama siempre al terminar. Una partida son unos cientos de órdenes de lógica pura: cabe en los límites de CPU de una función.
   - Con el resultado oficial aplica el Elo y el SLP en una transacción, con idempotencia (`economy_ledger`).
6. **Tiempo agotado:** pasado el límite del turno, el cliente que espera llama a `pvp_timeout(match)`. El servidor lo comprueba con su hora y anota un `END_TURN` forzado.
   - Una tarea `pg_cron` cada minuto limpia partidas abandonadas: sin órdenes en 3 minutos = derrota del que debía jugar.
7. **Reconexión:** al volver, el cliente descarga `pvp_actions` y las repite en **modo rápido** (el motor sin gráficos con la escena actualizada al final) hasta ponerse al día.
8. **Realtime en el cliente:** un cliente pequeño propio del protocolo Phoenix en `src/net/RealtimeClient.js` (sin npm, en la línea de `supabaseFetch`). La otra opción es un *bundle* ESM de `supabase-js` en `vendor/`.
   - Canal privado `pvp:<match>` con autorización por RLS sobre `realtime.messages`: solo entran los dos jugadores.

### Tablas

`seasons` (compartida con la Bruma) · `pvp_ratings` (temporada, usuario, puntos, partidas, victorias, derrotas, mejor racha) · `pvp_queue` · `pvp_matches` (estado, bandos, semilla, mapa, foto, ganador, motivo, huellas) · `pvp_actions` (partida, seq, bando, orden, hora) · `koliseo_payouts` (reparto de cada temporada)

### Funciones

`pvp_enqueue` · `pvp_leave_queue` · `pvp_act` · `pvp_timeout` · `pvp_surrender` · `pvp_board(season)` (los 10 primeros y tu puesto) · `pvp_me()` · cierre de temporada en `pg_cron` el día 1 a las 00:05 (puestos, `koliseo_payouts`, bAXS por `_econ_apply`, reinicio suave).

---

## 5. El motor sin gráficos (requisito)

Es la pieza más grande y la base del árbitro. También sirve para revisar la Bruma y para las repeticiones.

| Trabajo | Detalle |
|---|---|
| Unidad lógica | Clase con la misma API de reglas que `Unit` (vida, PA, PM, casilla, estados, escudo, `moveAlongPath`, `pushback`) sin modelo. Moverse y empujar son instantáneos. |
| Tablero lógico | `GridManager` sin three.js: casillas, ocupación, caminos y línea de visión. `gridToWorld` devuelve `{x, y, z}` sencillos. |
| Gólems | `GolemSystem` tiene 41 usos de `THREE`: separar las reglas del gólem de su modelo. |
| Turnos | `TurnManager` sin `setTimeout` en modo simulación (hoy espera 400–700 ms entre turnos). |
| Bandos canónicos | `team` A/B en las reglas; `player`/`enemy` solo para la cámara y los colores. Empate de iniciativa resuelto por semilla. |
| Semilla | `spellManager.rng` con un generador sembrado (Mulberry32, que ya está en `MathUtils.js`). |
| Registro y repetición | `CombatRecorder` (órdenes) y `CombatReplay` (las repite en el motor sin gráficos o en el normal). |
| Huella del estado | Resumen estable del estado tras cada turno, para detectar desincronizaciones. |
| Pruebas en Node | La misma partida repetida 100 veces da la misma huella; partidas grabadas en el navegador dan la misma huella en Node. Se añade a `tools/`. |

**Regla de oro:** el modo historia no cambia. Lo sin gráficos se añade al lado, con la misma API, y `Unit` y `GridManager` siguen como están.

---

## 6. Justicia de los mapas

- Script en Node (junto a `check-maps.mjs`) que para cada mapa mide, desde las salidas `P` y `E`:
  - distancia media al centro;
  - casillas alcanzables en 3 PM;
  - obstáculos que dan cobertura;
  - línea de visión entre bandos.
- Entran en la lista PvP los mapas con diferencias pequeñas. Si quedan pocos, se crean versiones **espejo** de los existentes (mitad superior reflejada) con la misma leyenda.

---

## 7. Cliente

| Pieza | Dónde (propuesta) |
|---|---|
| Pestaña **Arena** del Koliseo: puntos, puesto, temporada y cuenta atrás, botón «Buscar rival» (con tiempo de espera y cancelar), últimas partidas | `ui/KoliseoPanel.js` |
| Pantalla «Rival encontrado» (nombres, retratos del Sapidae y del Axie, mapa) y cuenta atrás de 5 s | `ui/PvpMatchIntro.js` (nuevo) |
| Combate PvP: los turnos del rival vienen de la red; indicador «Turno del rival», cronómetro visible para los dos, botón Rendirse, aviso de desconexión | `main.js` (modo `pvp`), `CombatHUD`, `TurnTimerHUD` |
| Servicio PvP: cola, canal, envío y recepción de órdenes, huellas, reconexión | `net/PvpService.js` (nuevo) |
| Cliente Realtime | `net/RealtimeClient.js` (nuevo) |
| Fin de partida: victoria o derrota, cambio de puntos (+18 / −14), SLP y «Buscar otra» | `CombatEndScreen` (variante `pvp`) |
| Pestaña **Clasificación**: Arena (top 10 de la temporada + tu puesto si estás fuera) y Bruma (igual) | `ui/KoliseoPanel.js` |
| Entrada al Koliseo: botón del HUD (abajo a la derecha) y opción «Koliseo» en el diálogo de Paladill (la deja hecha la Bruma) | `OverworldManager`, `NPCManager` |
| Textos | `i18n/{es,en}/koliseo.js` |

**Requisitos:** solo con cuenta de Sky Mavis (los invitados ven la pestaña, pero el botón pide iniciar sesión), y con el tutorial terminado.

---

## 8. Fases y estimación

| Fase | Contenido | Días |
|---|---|---|
| P0 ✓ | Motor sin gráficos: unidad y tablero lógicos, gólems, turnos, bandos A/B, semilla, registro, repetición, huella y pruebas de determinismo en Node. **Hecha (4-nov-2026), sección 11.** | 5–7 |
| P1 ✓ | Servidor: tablas, cola, partida, órdenes, tiempo agotado, rendición, Elo, SLP, cierre de temporada y pruebas en PostgreSQL local. **Hecha (4-nov-2026), sección 12.** | 2–2,5 |
| P2 ✓ | Cliente Realtime y `PvpService` (canal privado, presencia, reconexión con repetición rápida). **Hecha (4-nov-2026), sección 13.** | 1,5–2 |
| P3 ✓ | Combate PvP en el cliente: turnos del rival por red, foto igualada, cámara del bando, HUD, fin de partida. **Hecha (4-nov-2026), sección 14.** | 2–2,5 |
| P4 ✓ | Árbitro (Edge Function con el motor) y disputas. **Hecha (4-nov-2026), sección 15.** | 1–1,5 |
| P5 ✓ | Justicia de mapas (script y, si hace falta, mapas espejo). **Hecha (4-nov-2026), sección 16.** | 0,5–1 |
| P6 ✓ | Pruebas con dos navegadores (Playwright), partidas reales con dos cuentas, equilibrio y documentación. **Hecha (4-nov-2026), sección 17.** | 2–3 |
| **Total** | | **≈ 14,5–19,5 días** |

Si después se quisiera pasar a Colyseus (torneos, espectadores, muchas salas), P0 se reutiliza tal cual dentro de una sala y P1–P2 se rehacen (+2–4 días y el alojamiento).

## 9. Riesgos

- **Determinismo:** cualquier azar o tiempo real fuera de `rng` rompe la partida. Defensa: la huella por turno desde el primer día y las pruebas de P0.
- **Pocos jugadores:** colas vacías. Ideas:
  - avisar en el juego cuando alguien busca rival;
  - «horas de arena»;
  - más adelante, rivales fantasma (repeticiones de otros jugadores contra la IA) que no dan puntos.
- **Equilibrio 1 contra 1:** sin Ultimate ni equipo, pesan más el triángulo de clases (±15 %), los aturdimientos y quién empieza. Se ajusta con las partidas registradas (`CombatTelemetry`) durante la primera temporada.
- **Tocar el combate:** el modo PvP no debe cambiar nada del modo historia. Todo va detrás de `config.mode === 'pvp'` y del motor sin gráficos aparte.

## 10. Decisiones

Todas tomadas (3-nov-2026): arena igualada, bAXS 30 / 20 / 15 / 10 / 5, 15 SLP por victoria con tope de 10 al día, límite de 25 rondas con desempate por vida en %, puntos desde la primera partida y clasificación con top 10 + tu puesto.

---

## 11. Fase P0: motor sin gráficos (hecha, 4-nov-2026)

**Idea:** no hay un segundo motor. Las reglas que ya usa el juego se separan de su dibujo y el motor sin gráficos las usa tal cual; el juego sigue usando las mismas clases de siempre, que ahora heredan de las reglas.

| Pieza | Qué es | Dónde |
|---|---|---|
| Reglas de habilidades | `SpellRules`: todo lo que era `SpellManager` menos los VFX y la presentación. `SpellManager` hereda de ella y monta VFX y presentación en el mismo punto que antes (el orden de los oyentes del bus de eventos no cambia). Opción `headless`: sin la espera de 70 ms del choque de un empujón. | `tactics/SpellRules.js` (nuevo), `tactics/Spells.js` |
| Catálogo | `SPELLS_DB` y `SPELL_USE_LIMITS` pasan a su propio archivo (sin three.js). `Spells.js` los vuelve a exportar: los imports de siempre siguen valiendo. | `tactics/data/SpellsDB.js` (nuevo) |
| Tablero | `GridRules`: casillas, ocupación, caminos (A*), alcanzables, línea de visión y versión sin dibujo de cargar mapa y obstáculos. `GridManager` hereda de ella; `gridToWorld` devuelve un `THREE.Vector3` en el juego y `{x, y, z}` sin gráficos. | `tactics/GridRules.js` (nuevo), `tactics/GridManager.js` |
| Unidad | Reglas compartidas (daño con escudo y runas, PA y PM del turno, caminar, empujón, estadísticas de la configuración) en `UnitRules`. `Unit` las llama y pone la animación; `LogicUnit` / `LogicGolem` las usan sin modelo (moverse, saltar y ser empujado son instantáneos). | `tactics/combat/UnitRules.js`, `tactics/LogicUnit.js` (nuevos), `tactics/Unit.js` |
| Gólems | `GolemRules`: todas las reglas (invocar, pulsos, tierra estable, provocación, al romperse). `GolemSystem` hereda y solo cambia cómo se crea el gólem (con su GLB). Ids estables: `golem_<tipo>_<dueño>_<n>` (antes llevaban la hora). | `tactics/combat/GolemRules.js` (nuevo), `tactics/combat/GolemSystem.js` |
| Turnos | `TurnManager.sim` (sin esperas ni cámara: los turnos perdidos y las muertes por veneno pasan en el acto) y `TurnManager.tieBreak` (bando que empieza con empate de iniciativa; por defecto el jugador, como siempre). | `tactics/TurnManager.js` |
| Motor | `HeadlessCombat`: mapa, unidades, semilla (Mulberry32), desempate y límite de 25 rondas (gana más vida en %; igual = empate). Órdenes `move` / `cast` / `end` comprobadas como lo haría el árbitro (turno, unidad, PM con el camino canónico de `getReachableCells`, carta propia, PA, objetivo válido). Rendición. Bandos: A = `player`, B = `enemy`. | `tactics/sim/HeadlessCombat.js` |
| Azar | `mulberry32(seed)` con `state()` para la huella y `seedFrom(texto)`. | `tactics/sim/SeededRandom.js` |
| Huella | `stateHash`: ronda, turno, cada unidad (vida, escudo, PA, PM, casilla, estados, ventajas, recargas), zonas, obstáculos temporales y estado del azar → FNV-1a de 8 caracteres. Igual con `Unit` y con `LogicUnit`. | `tactics/sim/StateHash.js` |
| Registro y repetición | `CombatRecorder` (configuración + órdenes con su huella, JSON puro), `replay(record)` (resultado oficial, primera orden desincronizada, orden ilegal) y `playRandom` (partidas al azar para pruebas). | `tactics/sim/CombatReplay.js` |
| Pruebas | `node tools/pvp/sim-test.mjs [partidas] [repeticiones]` y `tools/pvp/parity.html?n=12` (con el servidor del juego). Equipos de prueba en `tools/pvp/test-teams.js`. | `tools/pvp/` (nuevo) |

**Reglas para el código de combate desde ahora:**
- Las reglas van en `SpellRules`, `GridRules`, `UnitRules`, `GolemRules` y los sistemas de `combat/` (sin three.js ni DOM). Lo que se ve y se oye va en `Spells.js`, `GridManager`, `Unit`, `GolemSystem` y `SpellPresentation`.
- El azar de las reglas solo por `spellManager.rng`. Nada de `Math.random`, `Date.now` ni `setTimeout` que cambie el resultado.
- Antes de entregar un cambio de combate: `node tools/pvp/sim-test.mjs` y `tools/pvp/parity.html`.

**Pruebas (4-nov-2026):**
- **Determinismo (Node):** 40 partidas al azar (10 mapas sin jefe, 4 clases de Sapidae, 6 clases de Axie con cartas reales, semillas y desempates distintos), cada una repetida 100 veces: 4000 repeticiones con las mismas huellas en las 9516 órdenes y el mismo resultado. 221 cartas distintas lanzadas, 249 gólems, 21 finales por rondas (3 empates). Una partida entera se repite en ~5 ms.
- **Misma partida, otra máquina:** 12 registros grabados en Node dan las mismas huellas en Chrome.
- **Juego ↔ motor sin gráficos:** las mismas partidas jugadas con las clases del juego (`Unit`, `GridManager`, `SpellManager` con VFX y gólems con modelo) dan la misma huella tras cada orden (12 partidas, ~3000 órdenes).
- **Antes ↔ después de separar las reglas:** el código anterior a P0 y el nuevo dan el mismo estado tras cada orden en esas 12 partidas (con los ids de gólem normalizados, que antes llevaban la hora). El modo historia no cambia.
- **Árbitro:** detecta una huella cambiada (desincronización) en la orden exacta y rechaza un movimiento imposible, una orden fuera de turno y una carta que la unidad no tiene.
- **Sin probar:** Deno (el árbitro de P4); usa el mismo motor V8 que Chrome y Node, que ya coinciden.

**Para P1–P3:** la «foto igualada» (nivel 10, sin equipo, runas ni charms, sin Ultimate) se arma al crear la partida; el motor ya funciona sin runas ni Ultimate si no se preparan (`runeCharms.setupCombat` y `ultimates.setupCombat` no se llaman). El cliente PvP usará `sm.rng = mulberry32(seed)`, `tm.tieBreak` y las mismas órdenes.

---

## 12. Fase P1: servidor (hecha, 4-nov-2026)

Migración `supabase/migrations/20261106000000_arena_pvp.sql`. Todas las cifras en `pvp_settings()`. Tablas con RLS sin políticas; todo por funciones `security definer`.

**Modelo:** el servidor no simula el combate. Ordena, guarda y reparte las órdenes; comprueba turno, número de orden, tiempo y forma. La legalidad de cada jugada la comprueban los dos motores (y el árbitro en P4). El cliente que termina su turno manda la huella y el bando que juega después; el rival confirma la huella al aplicarlo. Si algo no cuadra, la partida queda **en disputa** para el árbitro.

| Tabla | Para qué |
|---|---|
| `pvp_seasons` | Temporada = mes natural (hora de Colombia): `2026-11`. `results` con el top 10 pagado. |
| `pvp_ratings` | Puntos por temporada y cuenta: partidas, victorias, derrotas, empates, racha, `points_at` (desempate) y `last_slot` (dónde se paga). |
| `pvp_queue` | Cola: ranura, puntos, foto y latido (caduca a los 2 min sin latido). |
| `pvp_matches` | Partida: semilla, mapa, desempate, bando A/B de cada jugador con su foto, siguiente orden, bando y plazo del turno, informes, ganador, motivo, puntos, SLP y disputa. Estados: `active` → `ended` (un informe) → `finished`; `disputed`; `aborted`. |
| `pvp_actions` | Órdenes en orden (`seq`), bando (`A`, `B` o `S` = servidor), huella del fin de turno y la confirmación del rival. |

| Función | Qué hace |
|---|---|
| `pvp_enqueue(slot)` | Buscar rival y latido de la cola. Arma la **foto igualada** desde la partida guardada (clase del Sapidae, Axie principal y sus 6 cartas de `partCards`; sin cartas → `no_cards`). Ventana ±100 puntos, +100 cada 15 s, cualquiera a los 60 s. Al emparejar: semilla, mapa de la lista PvP, bandos y desempate al azar. Si ya hay partida abierta devuelve `in_match`. |
| `pvp_leave_queue()` | Salir de la cola. |
| `pvp_match(id, desde)` | Estado y órdenes desde un número (reconexión). Solo los dos jugadores. |
| `pvp_act(id, seq, orden, huella, siguiente)` | Una orden (`move`, `cast`, `end`). Rechaza: número equivocado, fuera de turno, tiempo vencido, forma mala, fin de turno sin huella o sin bando siguiente. |
| `pvp_timeout(id, seq, huella, siguiente)` | Quien espera fuerza el fin del turno del rival pasado el plazo (45 s + 5 de margen). Se guarda como orden `timeout` del servidor; el motor la aplica como fin de turno. |
| `pvp_ack(id, seq, huella)` | El rival confirma la huella de un fin de turno. Distinta → disputa. |
| `pvp_report(id, ganador, motivo, huella)` | Final según el motor de cada jugador. Iguales → se cierra (puntos y SLP); distintos → disputa. Si solo informa uno, a los 2 min vale su informe. |
| `pvp_dispute(id, motivo, seq)` | El motor del jugador no está de acuerdo (orden ilegal, final que no ve): disputa. |
| `pvp_surrender(id)` | Rendirse: derrota en el acto. |
| `pvp_board(temporada)` | Top 10 y tu puesto si estás fuera. También invitados. |
| `pvp_me()` | Temporada, puntos, puesto, cola, partida abierta, victorias con SLP que quedan hoy y las 5 últimas partidas. |
| `pvp_cleanup()` | Sin órdenes en 3 min: pierde quien debía jugar (si nadie empezó, se anula). Informes que esperan más de 2 min. Cola caducada. |
| `_pvp_resolve(id, ganador, motivo)` | Cierre oficial, una vez: Elo (K 32 las 20 primeras, luego 24; +10 mínimo, −30 máximo; empate a medias; 3 partidas puntuables al día contra el mismo rival) y 15 SLP al ganador (10 victorias con SLP al día) por `_econ_apply`. Lo usará el árbitro. |
| `_pvp_close_season` / `pvp_close_due` | Cierre de temporada: bAXS al top 10 (30 / 20 / 15 / 10 / 10 / 5 ×5) en la cartera de su última ranura; idempotente. La siguiente temporada empieza en `1000 + (puntos − 1000) / 2`. |

**Tareas programadas** (si hay `pg_cron`): limpieza cada minuto y cierre el día 1 a las 00:05 de Colombia. Sin `pg_cron`, la cola y `pvp_me` hacen la limpieza y el cierre al usarse.

**Motor:** `HeadlessCombat` acepta la orden `{ t: 'timeout' }` y da `turnSide` (bando que juega ahora, lo que se manda como «siguiente»).

**Pruebas (PostgreSQL 16, las 18 migraciones desde cero):**
- Cola: sin cartas → `no_cards`; latido; emparejados con foto completa; al volver → `in_match`; ventana de puntos (1400 contra 1031: en cola a los 35 s, emparejados a los 61 s); salir de la cola.
- Órdenes: número equivocado, orden rara, fin sin huella, fuera de turno, confirmar el propio turno, tiempo antes de hora, orden tarde (`turn_over`), fin forzado por tiempo; un tercero no puede ver la partida.
- Final: dos informes iguales → +16 / −16 y 15 SLP; informes distintos, huella distinta y aviso del cliente → disputa; rendición; abandono con turno → pierde quien debía jugar; nadie empezó → anulada; un solo informe a los 2 min → vale.
- Topes: 3 partidas puntuables al día contra el mismo rival (la 4.ª da 0); 10 victorias con SLP al día (150 SLP y luego 0).
- Temporada: pago al top 10 (30 / 20 / 15 / 10 / 10 / 5 / 5), cierre repetido sin pagar dos veces, reinicio suave (1240 → 1120), clasificación y `pvp_me`.
- Permisos: un invitado solo ve la clasificación; nadie toca las tablas.
- **De punta a punta:** dos clientes en Node, cada uno con su motor, juegan una partida completa contra el servidor (180 órdenes, 16 rondas): huellas iguales en los dos clientes, 48 confirmaciones sin diferencias, informe final → `finished` con +16 / −16 y 15 SLP; repetir en un motor nuevo las órdenes guardadas en el servidor da la misma huella y el mismo resultado (lo que hará el árbitro).

**Pendiente para P2/P3:** avisos por Realtime (hoy el cliente sabría de su partida al volver a llamar a `pvp_enqueue` o `pvp_match`), presencia y los 60 s de reconexión; el módulo que convierte la foto en unidades igualadas (nivel 10) para los dos clientes y el árbitro.

**Aplicar:** `supabase db push` o pegar el archivo en el SQL Editor.

---

## 13. Fase P2: tiempo real y servicio PvP (hecha, 4-nov-2026)

**Servidor:** `supabase/migrations/20261106000001_arena_realtime.sql` (después de la de P1).

| Pieza | Qué hace |
|---|---|
| Avisos | Disparadores sobre `pvp_actions` y `pvp_matches` que llaman a `realtime.send`: `pvp_user:<uid>` → «matched»; `pvp:<partida>` → «action» (cada orden guardada) y «status» (cambios de estado). Las funciones de P1 no cambian para avisar. Sin Realtime (PostgreSQL local) no hacen nada. |
| Permisos | `pvp_can_listen(tema)` y políticas en `realtime.messages`: cada jugador solo escucha su canal y el de sus partidas, y solo manda presencia en el de su partida. Las órdenes nunca van por el canal. |
| Turnos perdidos | 3 fines de turno forzados seguidos del mismo bando = derrota por abandono (≈ 2,5 min sin jugar). Cumple «60 s para volver» sin fiarse de la presencia, que la cuenta el cliente. |
| Primer turno con plazo | La partida nace con plazo (turno + 10 s de presentación). Si quien empieza no juega, el rival pide el fin forzado como siempre (`pvp_timeout` admite el primer turno). `pvp_act` conserva ese plazo en la primera orden. |
| Vista de la partida | `_pvp_match_out` añade `turnSecs`, `graceSecs` y `timeouts`. |

**Cliente:**

| Pieza | Qué hace | Dónde |
|---|---|---|
| Realtime | Cliente propio del protocolo Phoenix 1.0.0 (sin npm): canales privados con el JWT del jugador, broadcast (lo que manda el servidor), presencia, latido cada 25 s, reconexión con espera creciente (1, 2, 5, 10 s), vuelve a unirse a los canales y renueva el token cada 4 min. | `src/net/RealtimeClient.js` (nuevo) |
| Servicio | Llamadas `pvp_*` con reintento de red (salvo las órdenes, que reintenta la sesión con su número), hora del servidor, y `startQueue({ slot, onStatus, onMatched })`: latido de la cola cada 4 s y aviso «matched» en el acto por Realtime. | `src/net/PvpService.js` (nuevo) |
| Sesión de partida | Une un motor (cualquiera con `apply`, `hash`, `turnSide`, `over`, `result`) con el servidor: mis órdenes (el motor las comprueba antes de mandarlas), las del rival por Realtime o pidiéndolas si falta alguna, confirmación de huellas, disputa si una orden del rival no vale, fin forzado del turno del rival, informe final, rendición, presencia del rival y **resync** (motor nuevo + todas las órdenes guardadas) si el servidor rechaza algo. Todo en fila: nunca dos órdenes a la vez. | `src/rpg/arena/PvpSession.js` (nuevo) |

**Herramientas de prueba local** (`tools/pvp/local/`, sin la nube): `fake-supabase.cjs` (RPC sobre PostgreSQL con el usuario del JWT de prueba + Realtime Phoenix con canales, presencia y los avisos de `realtime.send`; necesita `ws`), `realtime-setup.sql` (un `realtime.send` de pruebas), `players.sql` (20 jugadores de prueba), `arena-test.html` (un jugador automático) y `two-players.cjs` (dos navegadores con Playwright).

**Pruebas (4-nov-2026, PostgreSQL 16 + Realtime simulado + dos Chrome):**
- Partida completa con los dos conectados: emparejados al primer latido, 226 órdenes, huella final igual en los dos, 0 resincronizaciones, puntos y SLP aplicados, sin errores.
- Recarga del navegador de un jugador a mitad de partida: se une de nuevo, aplica sus propias órdenes guardadas sin volver a mandarlas y la partida termina igual en los dos (el rival lo ve desconectarse y volver).
- Rival que no juega (turnos de 4 s en la prueba): el que espera pide los fines forzados y al tercero gana por abandono, también cuando el inactivo es el que empieza.
- Orden imposible del rival: el motor la rechaza y la partida queda en disputa.
- Presencia: cerrar el juego del rival se ve en el acto.
- Corte del servidor (RPC y Realtime) durante 4 s a mitad de partida: los clientes reconectan, recuperan lo perdido y terminan con la misma huella.
- Las pruebas de servidor de P1 siguen pasando con P2 aplicada.
- **Sin probar:** contra el Realtime real de Supabase (las políticas sobre `realtime.messages` y `realtime.send` solo existen allí). Lo primero de la fase P3 al aplicar la migración.

**Aplicar:** `supabase db push` (o pegar en el SQL Editor) `20261106000001_arena_realtime.sql` después de `20261106000000_arena_pvp.sql`. En el panel de Supabase, Realtime → Settings: dejar activado «Allow public access» o no, da igual (los canales de la Arena son privados).

## 14. Fase P3: la Arena dentro del juego (hecha, 4-nov-2026)

**Servidor:** `supabase/migrations/20261107000000_arena_snapshot_visuals.sql` (después de las de P1 y P2). La instantánea de la cola lleva además la personalización del Sapidae (solo valores simples y cortos) y los genes del Axie principal (de `accountAxies` o de `hero`): lo justo para dibujar al rival. No cambia las reglas.

**Reglas compartidas (las usan el juego, el motor sin gráficos y, en P4, el árbitro):**

| Pieza | Qué hace | Dónde |
|---|---|---|
| Equipos igualados | De la instantánea solo cuentan la clase del Sapidae y las 6 cartas del Axie (con sus variantes). Nivel 10 (todo desbloqueado; +18 de vida y +27 de iniciativa, como `EquipmentManager`), sin atributos, equipo, runas, charms ni Ultimate; crítico 20 %, apoyo 25 % el Sapidae. Sapidae en la casilla 1 de su bando y Axie en la 2 (P para A, E para B), mirando al rival. Las variantes del rival solo se aceptan si su id es el que el juego calcularía (`variantId`) y la carta base existe; las cartas que no son de partes se descartan. | `src/tactics/sim/PvpRoster.js` (nuevo) |
| Perspectiva | Cada jugador se ve abajo: sus unidades son `player` y las del rival `enemy`. Las reglas son simétricas y el orden de las unidades es fijo (`A_sapidae`, `A_axie`, `B_sapidae`, `B_axie`), así que las dos perspectivas juegan la misma partida. El desempate se traduce al equipo de cada uno. | `PvpRoster.pvpCombatSetup(match, lado)` |
| Bando fijo | `unit.pvpSide` ('A' / 'B', también en los gólems). La huella usa el bando, no el equipo; `turnSide` y `result.winnerSide` también. | `combat/UnitRules.js`, `combat/GolemRules.js`, `sim/StateHash.js`, `sim/HeadlessCombat.js` |
| Órdenes | `applyOrder({ tm, sm, grid }, orden)`: la misma comprobación y ejecución para el motor sin gráficos y para el combate del juego. `HeadlessCombat.fromMatch(match, lado)`. | `sim/HeadlessCombat.js` |
| Paso de turno completo | `TurnManager.settled()`: espera los pasos diferidos (turnos perdidos por aturdimiento, muertes por daño periódico). Sin esto, la huella de un fin de turno se calculaba a medias en el combate del juego. | `TurnManager.js` |
| Puesta al día | `gridManager.fastForward`: moverse, saltar y ser empujado se colocan al momento, sin proyectiles ni VFX de las cartas, y el TurnManager sin esperas. Solo cambia el tiempo, no las reglas. | `Unit.js`, `SpellPresentation.js`, `vfx/VfxBridge.js` |

**Cliente:**

| Pieza | Qué hace | Dónde |
|---|---|---|
| Combate de la Arena | El «motor» de `PvpSession` hecho con el combate del juego (Unit, SpellManager con VFX, TurnManager real). Mis jugadas (clic, «Pasar turno», Espacio) van por la sesión; las del rival se animan igual. Semilla de la partida, límite de 25 rondas (gana quien conserva más vida en %), sin IA ni reloj local. Al volver a una partida, lo ya jugado se aplica sin animaciones (la última orden sí se ve). Si el servidor rechaza algo, el combate se rehace desde el principio. | `src/rpg/arena/PvpBattle.js` (nuevo) |
| Montaje | `main._startBattle(config)` con `config.pvp`: `_startPvpBattleBody` pone las 4 unidades, sin runas ni Ultimate, y conecta la partida cuando el primer turno ya empezó. Ganchos `if (this.pvpBattle)` en el cambio de turno (sin IA), victoria/derrota, clic en el tablero, «Pasar turno», Espacio y la vuelta al mundo. El bando B ve el tablero girado media vuelta (`sceneManager.flipSide`). | `main.js`, `SceneManager.js` |
| Pantallas | «¡Rival encontrado!» (los dos equipos y el tablero, 3 s o un clic); barra del combate (de quién es el turno, reloj con la hora del servidor, ronda, rival conectado o no, «Rendirse» con confirmación); avisos (sincronizando, jugada rechazada); pantalla final con el resultado oficial: puntos de la temporada (o «sin puntos» por el límite diario con el mismo rival), SLP y «Volver al Koliseo». Partida en revisión y anulada, con su texto. | `src/ui/PvpHud.js` (nuevo) |
| Flujo | Pestaña → guardar en la nube → cola (latido + aviso) → presentación → combate (id `kol_arena`, el telón de siempre) → vuelta al mundo en el mismo sitio → pestaña de la Arena con el resultado y la cartera al día. La búsqueda dura mientras la ventana del Koliseo está abierta (cerrarla sale de la cola). | `src/rpg/arena/ArenaFlow.js` (nuevo), `OverworldManager.js` |
| Pestaña Arena | Temporada y cuenta atrás, puntos, puesto, partidas (V/D/E), racha, SLP que quedan hoy, reglas, últimas 5 partidas, «Buscar rival» (espera, margen de puntos, cancelar), «Volver a la partida» o aviso de revisión. Invitados: la explicación y que hace falta cuenta. | `src/ui/KoliseoPanel.js` |
| Clasificación | Selector Arena / Bruma. Arena: top 10 de la temporada (o la pasada) con puntos y V/D, tu puesto si estás fuera y el reparto de bAXS. | `src/ui/KoliseoPanel.js` |
| Textos | es / en | `src/i18n/{es,en}/arena.js` (nuevo) |
| Sin Ultimate ni reloj local | `hasUltimate` es falso en la Arena; el reloj de 30 s del juego no corre (el tiempo lo lleva el servidor). | `ui/UltimateButton.js`, `ui/TurnTimerHUD.js` |

**Pruebas (4-nov-2026):**
- `node tools/pvp/sim-test.mjs`: nueva sección 4 — 16 partidas (≈ 3200 órdenes) desde las instantáneas, vistas desde A y desde B: mismas huellas orden a orden, mismos turnos y mismo ganador; el desempate del servidor decide con iniciativas iguales; variantes del rival registradas, personalización limpiada y cartas ajenas descartadas.
- `tools/pvp/pvp-battle.html` (Chrome): 12 partidas (2397 órdenes) jugadas en el motor sin gráficos desde A y repetidas en el combate del juego desde B con el TurnManager real (esperas y pasos diferidos), la mitad con puesta al día sin animaciones y una con límite de 4 rondas: huellas idénticas en todas y el mismo final.
- `tools/pvp/parity.html`: la paridad de P0 sigue intacta.
- `tools/pvp/local/two-players-p3.cjs` + `arena-battle.html` (dos Chrome con el combate del juego contra `fake-supabase.cjs` y PostgreSQL): partidas completas (156–339 órdenes, finales por eliminación y por rondas: misma huella, el servidor las acepta sin disputa, cada uno ve sus unidades y gólems como propios, el bando B mira desde el otro lado, pantalla final en los dos, sin errores); recarga a mitad de partida (55 órdenes puestas al día en ≈ 1 s, el rival ve la desconexión y la vuelta); combate rehecho desde cero a mitad de partida (resync) con la misma huella final; rendición. Jugadores de prueba con cartas reales: `tools/pvp/local/players-p3.sql`.
- Las pruebas de servidor de P1 siguen pasando con la migración nueva.
- **Sin probar aquí:** el recorrido completo dentro del juego (mundo abierto → Koliseo → combate → vuelta) con dos cuentas reales y el Realtime de Supabase: este entorno no tiene los modelos ni el inicio de sesión. Es lo primero que conviene mirar (fase P6), con dos navegadores.

**Pendiente para P4/P5:** las variantes de nivel 2 (+20 %) vienen de la partida guardada del jugador; el servidor no las comprueba todavía contra Sky Mavis. El árbitro (P4) puede validarlas al revisar una partida, y P5 decidirá si se comprueban al entrar en la cola.

**Aplicar:** `supabase db push` (o pegar en el SQL Editor) `20261107000000_arena_snapshot_visuals.sql`.

## 15. Fase P4: el árbitro (hecha, 4-nov-2026)

**Qué decide.** Las partidas **en disputa** (huella distinta, informes distintos, orden que un motor rechaza) y las que **terminaron con un solo informe** (el otro jugador cerró el juego). Repite en el motor sin gráficos las órdenes que guardó el servidor, desde el bando A, con los mismos equipos igualados (`PvpRoster`).

| Comprobación (orden a orden) | Si falla |
|---|---|
| La orden la manda el bando al que le toca según el motor (el servidor se fía del «siguiente bando» que declara el cliente) | pierde quien jugó fuera de turno (`out_of_turn`) |
| La orden es legal: unidad activa, camino del juego, carta propia, PA, objetivo | pierde quien la mandó (`illegal`) |
| Fin de turno forzado: del bando que tenía el turno | pierde quien lo pidió (`bad_timeout`) |
| Huella del que termina el turno y huella con que la confirma el rival | pierde quien mandó la huella falsa (`hash` / `ack`) |
| Órdenes después del final | pierde quien las mandó (`after_end`) |

**Decisión:** con culpable, gana el otro (motivo `arbiter`, con puntos y SLP como siempre). Sin culpable y con final en el motor, vale ese final (eliminación o rondas) aunque un informe diga otra cosa (el informe falso queda anotado en `liars`). Sin culpable y sin final: quien informó de un final que no existe pierde (`false_report`); quien abrió una disputa sin motivo pierde (`false_dispute`); si no hay pruebas contra nadie, la partida **se anula** (sin puntos). El veredicto es siempre el mismo con las mismas órdenes.

| Pieza | Qué hace | Dónde |
|---|---|---|
| Árbitro | `arbitrate(match, actions)` → veredicto `{ result, winner, reason, culprit, fault, seq, replay }`. Puro: sin red, tiempo ni azar propio. | `src/tactics/sim/PvpArbiter.js` (nuevo) |
| Edge Function | Pide las partidas pendientes, las arbitra (hasta 6 por llamada, 1,2 s de presupuesto: el límite de CPU de Supabase es 2 s) y manda cada veredicto. Solo entra con la cabecera `x-arbiter-key` = secreto `PVP_ARBITER_KEY`; habla con la base de datos con la clave de servicio. | `supabase/functions/pvp-arbiter/index.ts` (nuevo) |
| Motor de la función | La función solo puede importar su carpeta: `tools/pvp/arbiter/build.mjs` copia el motor del juego (144 archivos, sin cambios) a `supabase/functions/pvp-arbiter/engine/` y guarda su huella (`BUILD.json`), que va en cada veredicto. `--check` dice si la copia es la del juego actual. | `tools/pvp/arbiter/build.mjs` (nuevo) |
| Servidor | `pvp_arbiter_pending(límite)` (marca el intento; hasta 5, uno por minuto) y `pvp_arbiter_verdict(partida, veredicto, nº de órdenes)` (comprueba que la partida sigue esperando y que el árbitro vio todas sus órdenes; aplica `_pvp_resolve` o anula). Solo `service_role`. Columnas `arbiter`, `arbiter_tries`, `arbiter_at`. La vista de la partida lleva `verdict` (resultado, culpable y falta, sin detalles). | `supabase/migrations/20261108000000_arena_arbiter.sql` |
| Respaldo sin árbitro | `pvp_cleanup`: un informe solitario vale a los 15 min (antes 2 min, ahora es el árbitro quien lo mira a los 2 min); una disputa sin resolver se anula a los 30 min para que los jugadores puedan volver a la cola. | misma migración |
| Avisos | Disparador: una disputa nueva llama al árbitro en el acto (pg_net); `pg_cron` lo llama cada minuto. Ambos leen la URL y la clave de `pvp_arbiter_config` (una fila que se pone a mano; sin ella no se llama a nada). | misma migración |
| Cliente | La pantalla «en revisión» se cambia sola por el resultado cuando llega el veredicto, con una línea de lo que decidió el árbitro (tu jugada no valía / la del rival no valía / anulada). Aviso de partida anulada al volver al Koliseo. | `rpg/arena/PvpBattle.js`, `ui/PvpHud.js`, `rpg/arena/ArenaFlow.js`, `i18n/{es,en}/arena.js` |

**Pruebas (4-nov-2026):**
- `node tools/pvp/arbiter-test.mjs 20`: 20 partidas al azar arbitradas limpias (con dos informes y con uno) dan el final del motor; 159 trampas (huella falsa, confirmación falsa, movimiento imposible, carta ajena, fuera de turno, final inventado, disputa sin motivo, fin forzado mal pedido, órdenes tras el final) dan como perdedor a quien la hizo; dos informes de un final que no existe → anulada; veredicto determinista.
- `node --experimental-strip-types tools/pvp/arbiter/local-test.mjs` (PostgreSQL + `fake-supabase.cjs` con clave de servicio de prueba): 6 partidas creadas con las funciones reales del juego y la **Edge Function ejecutada en Node** con un Deno mínimo: sin la clave → 403; 6 veredictos en ≈ 0,7 s, todos correctos (puntos y SLP aplicados por `_pvp_resolve`); un veredicto repetido no cambia nada; un jugador no puede pedir la lista del árbitro.
- `two-players-p3.cjs arbiter` (dos Chrome con el combate del juego): un jugador manda una orden imposible → el otro abre la disputa y ve «en revisión» → el árbitro decide → las dos pantallas pasan a Victoria / Derrota.
- Respaldo de `pvp_cleanup` (informe solitario a los 15 min, disputa anulada a los 30, una de 5 min sigue esperando) y pruebas anteriores (sim-test, dos navegadores) sin cambios.
- **Sin probar aquí:** Deno de verdad (la función usa solo `Deno.serve` y `Deno.env`, con importaciones estáticas para que el empaquetador de Supabase incluya todo el motor; el motor ya da lo mismo en Chrome y Node, que comparten V8 con Deno) y pg_net / pg_cron de Supabase.

**Poner en marcha** (hecho el 4-nov-2026; comandos de PowerShell en Windows, en la carpeta del proyecto):
1. Aplicar `20261108000000_arena_arbiter.sql`. Comprobar: `select proname from pg_proc where proname like 'pvp_arbiter%';` → `pvp_arbiter_pending`, `pvp_arbiter_ping`, `pvp_arbiter_verdict`.
2. CLI de Supabase sin instalar nada: `npx supabase@latest …` (Node ya está). Entrar: `npx supabase@latest login` (si el navegador solo enseña un código, pegarlo en la terminal aunque no se vea la pregunta) o, sin navegador, un token de **Account → Access Tokens** en la misma ventana: `$env:SUPABASE_ACCESS_TOKEN = "sbp_…"`. Enlazar: `npx supabase@latest link --project-ref <ref>` (`<ref>` = el código final de la URL del panel, o **Project Settings → General → Project ID**).
3. Clave del árbitro (64 caracteres al azar; al gestor de contraseñas, nunca al código ni al chat):
   ```powershell
   $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
   $KEY = ($b | ForEach-Object { $_.ToString('x2') }) -join ''
   npx supabase@latest secrets set PVP_ARBITER_KEY=$KEY
   ```
4. Motor y despliegue (`--use-api`: lo empaqueta Supabase, sin Docker):
   ```powershell
   node tools/pvp/arbiter/build.mjs
   npx supabase@latest functions deploy pvp-arbiter --no-verify-jwt --use-api
   ```
5. Probar: `Invoke-RestMethod -Method Post -Uri "https://<ref>.supabase.co/functions/v1/pvp-arbiter" -Headers @{ "x-arbiter-key" = $KEY }` → `ok: True`, `engine` = huella del paso 4. 403 = clave distinta; 500 `not_configured` = falta el secreto.
6. **Database → Extensions:** pg_net y pg_cron. En el SQL Editor (misma clave):
   ```sql
   insert into public.pvp_arbiter_config (url, key) values ('https://<ref>.supabase.co/functions/v1/pvp-arbiter', '<clave>')
   on conflict (id) do update set url = excluded.url, key = excluded.key;
   select cron.unschedule(jobid) from cron.job where jobname = 'lunakai_pvp_arbiter';
   select cron.schedule('lunakai_pvp_arbiter', '* * * * *', 'select public.pvp_arbiter_ping()');
   ```
7. Comprobar: `select public.pvp_arbiter_ping();` → `true`; `select status_code, content::text from net._http_response order by created desc limit 3;` → 200 y `{"ok":true…`; `select status from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'lunakai_pvp_arbiter') order by start_time desc limit 3;` → `succeeded`.

**Regla:** cada cambio en las reglas del combate → `node tools/pvp/arbiter/build.mjs` + desplegar `pvp-arbiter` (si no, el árbitro repetiría las partidas con reglas viejas). `node tools/pvp/arbiter/build.mjs --check` lo avisa.

**Pendiente (P5/P6):** comprobar las variantes de nivel 2 de la instantánea contra Sky Mavis; revisión de partidas por muestreo (hoy solo se arbitran disputas e informes solitarios).

## 16. Fase P5: tableros justos (hecha, 4-nov-2026)

**Herramienta:** `node tools/pvp/map-fairness.mjs [partidas] [--maps a,b] [--seed n]`. Para cada mapa compara los dos bandos desde sus salidas de la Arena:
- **Medidas del tablero:** acercamiento (casillas a pie hasta el rival), territorio (casillas a las que llega antes), movilidad (3 PM), cobertura (territorio junto a obstáculos), exposición (territorio que el rival ve a ≤ 6) y bordes.
- **Partidas simuladas** en el motor sin gráficos con un jugador automático sencillo (ataca con lo que más daño hace; si no, se acerca), los mismos equipos en los dos bandos o X/Y y luego Y/X con la misma semilla, y el desempate repartido. Un mapa es **justo** si las medidas coinciden (±25 %) y la diferencia de victorias A−B está dentro del ruido (≤ 2 errores típicos y ≤ 10 puntos).

**Qué salió (10 mapas sin jefe, 800 partidas cada uno):** solo 1 de 10 era justo. Dos causas:
1. **Las salidas.** El orden de salidas del mapa desempata por fila y columna, así que en un mapa simétrico el Sapidae y el Axie de cada bando no empezaban en casillas equivalentes (territorio 42/37 en el Claro de Arces, que es simétrico). **Arreglo:** `PvpRoster.pvpSpawns(map)`: el bando A usa sus 2 primeras salidas P y el B las mismas giradas media vuelta (si el mapa es simétrico; si no, como antes). Con eso, todas las medidas quedan idénticas en los mapas simétricos.
2. **El tablero.** 7 de los 10 no son simétricos (de 4 a 28 casillas distintas). **Arreglo:** versiones espejo (`tools/pvp/mirror-map.mjs`): la mitad de un bando y su copia girada 180°, con las salidas P → E. Cada jugador ve el mismo tablero desde su lado (el bando B ya mira con la cámara girada). Van en `BattleMaps.js` con `pvp: true` y `mirrorOf`; no entran en la selección por bioma del modo historia. `check-maps.mjs` comprueba que son simétricas.

**Lista de la Arena** (`20261109000000_arena_maps.sql`; 1600 partidas por mapa y tanda, dos tandas):

| Mapa | A−B | Gana quien empieza | Rondas | |
|---|---|---|---|---|
| `forest_maple_glade` (original simétrico) | +2 % / +1 % | 54 % | 4,7 | ✓ |
| `genesis_royal_garden` (original simétrico) | 0 % / −2 % | 39 % | 14,3 | ✓ |
| `pvp_savannah_oasis` | +2 % / −1 % | 40 % | 18,9 | ✓ |
| `pvp_savannah_canyon` | −3 % / +1 % | 44 % | 9,4 | ✓ |
| `pvp_arctic_glacier_pass` | −4 % / −2 % | 55 % | 6,9 | ✓ |
| `pvp_arctic_boreal_camp` | −1 % / −1 % | 47 % | 11,2 | ✓ |
| `pvp_mystic_glow_swamp` | +3 % / +2 % | 51 % | 6,7 | ✓ |
| `genesis_sanctum_gate` (simétrico) | +5 % / +7 % | 64 % | 6,2 | fuera |
| `pvp_mystic_crystal_isles` | −10 % / −8 % | 54 % | 5,7 | fuera |
| `forest_river_ford` (ninguna versión espejo) | −5 % / −8 % | 50 % | 6,1 | fuera |

Los que quedan fuera tienen el tablero idéntico para los dos bandos: su pequeña ventaja viene de desempates de las reglas o del jugador automático (orden de recorrido de casillas), y en un tablero estrecho pesa más. Se pueden revisar más adelante. En la Puerta del Santuario, además, quien juega primero gana el 64 %.

**Comprobaciones:** `node tools/pvp/sim-test.mjs` (nuevo apartado 4b) lee la lista de la última migración de la Arena y comprueba que cada mapa existe, no es de jefe, es simétrico y tiene las salidas giradas. `node tools/battle-maps/check-maps.mjs`: 15 mapas del modo historia sin cambios y 6 versiones espejo simétricas. Dos navegadores con el combate del juego juegan en los mapas nuevos (mismo final y misma huella); paridad juego ↔ motor sin gráficos y árbitro sin cambios.

**Aplicar (las dos cosas juntas, mejor sin partidas en curso):** la migración `20261109000000_arena_maps.sql`, y **volver a copiar y desplegar el árbitro**: cambian las salidas del bando B, que forman parte de las reglas (`node tools/pvp/arbiter/build.mjs` + `npx supabase@latest functions deploy pvp-arbiter --no-verify-jwt --use-api`). Los jugadores necesitan la versión nueva del juego.

**Decisión sobre las variantes de nivel 2** (pendiente de P3/P4): de momento no se comprueban contra Sky Mavis al entrar en la cola. El servidor ya solo acepta variantes con un id que el juego calcularía y sobre una carta base real, y el máximo efecto de una trampa es un +20 % en algunas cartas propias. Comprobarlas exige la clave de la API de Sky Mavis en una función (como `axie-data`); queda para P6 si aparecen abusos.

## 17. Fase P6: pruebas reales, equilibrio y cierre (hecha, 4-nov-2026)

- **Prueba del usuario con dos cuentas reales** (Supabase de verdad, Realtime, árbitro desplegado): partida completa correcta. Un error: los dos Sapidae con el mismo retrato en el orden de turnos (el del jugador). **Corregido:** cada Sapidae de la Arena tiene su retrato con su modelo y su personalización (`PvpBattle.sapidaePortrait`, `main._unitPortrait`; `getSapidaeCustomPortrait` acepta `aliases: []` para no pisar el retrato genérico del modelo).
- **Equilibrio:** `node tools/pvp/balance.mjs 6000` (motor sin gráficos, jugador automático compartido `tools/pvp/bot.mjs`, equipos al azar, cada pareja en los dos bandos, los 7 mapas). Quien empieza gana el 44,6 %; Sapidae de 48 a 55 % (Lunalogist arriba); Axie de 46 a 59 % (Reptile arriba); cartas de 32 a 73 %. **No se cambian las reglas todavía:** el jugador automático es sencillo y favorece a los equipos que aguantan y pegan en línea recta. Se decide con partidas reales (umbral propuesto: > 200 partidas y una clase por encima del 56 %); el ajuste iría solo en la Arena (`PvpRoster`) y obliga a desplegar el árbitro.
- **Estadísticas reales:** `supabase/migrations/20261110000000_arena_stats.sql` · `select jsonb_pretty(public.pvp_stats(30));` (solo equipo): partidas, motivos, bando A/B, quién empezó, por mapa, por clase de Sapidae y de Axie, faltas del árbitro, duración.
- **Documentación:** `docs/HITO_123_ARENA_PVP.md`, entrada 123 del índice, `PROJECT_CONTEXT.md` (5.47). `GAME_VERSION` sigue en 0.5.0.
