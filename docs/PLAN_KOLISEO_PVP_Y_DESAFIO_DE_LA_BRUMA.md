# Plan: Koliseo — Arena PvP y Desafío de la Bruma

> **Estado:** investigación (3-nov-2026). No hay código escrito.
> **Planes por modo (con las decisiones del usuario):** [`PLAN_DESAFIO_DE_LA_BRUMA.md`](PLAN_DESAFIO_DE_LA_BRUMA.md) (se construye primero) y [`PLAN_ARENA_PVP.md`](PLAN_ARENA_PVP.md).
> **Decisiones tomadas (3-nov):**
> - para después del 7-nov, pero se empieza ya;
> - PvP sin Duo Ultimate y con arena igualada recomendada;
> - Bruma con escuadrón completo, vida llena por combate, 2 intentos por semana y clasificación por combates y turnos;
> - temporada PvP mensual con bAXS para el top 10;
> - invitados en la Bruma sin clasificar.
> **Revisión (3-nov, noche):**
> - Bruma con un solo bioma por semana, dificultad hasta ×3 y premios solo para el top 3 (bAXS, Esquirla lunar, Ámbar de Atia y oro).
> - PvP con puntos desde la primera partida, top 10 + tu puesto y 25 rondas.
> - Koliseo con botón en el HUD y desde Paladill, sin edificio.
> La sección 8 de este documento queda respondida en esos planes; donde no coincidan, mandan los planes por modo.
> **Pedido:**
> - **Koliseo:** un apartado con dos modos.
> - **Arena PvP:** 1 contra 1, cada jugador con su Sapidae y su Axie principal, en un mapa al azar de los tableros tácticos. El ganador recibe SLP y puntos de temporada, y el perdedor pierde puntos. Habrá una clasificación, y los mejores se reparten bAXS al cerrar la temporada.
> - **Desafío de la Bruma:** reto semanal para un jugador. Son 5 combates contra 5 grupos; con 2 derrotas quedas fuera. Tiene clasificación propia y premios del juego.
> - Revisar Colyseus y estimar trabajo y herramientas.

---

## 1. Resumen

| | Desafío de la Bruma | Arena PvP |
|---|---|---|
| **Viabilidad** | Alta. Es un jugador contra la IA: reutiliza el combate actual. | Alta en lo técnico, porque un juego por turnos con toda la información a la vista es el caso fácil del multijugador. El trabajo de fondo es hacer que el combate pueda ejecutarse **sin gráficos** para arbitrar las partidas. |
| **Servidor nuevo** | No. Supabase basta. | **Recomendado: no** (Supabase Realtime + Postgres + Edge Function árbitro). Colyseus queda como plan B si el PvP crece. |
| **Coste extra** | 0 | 0 en el plan gratuito de Supabase (200 conexiones simultáneas). Con Colyseus: desde 15 USD/mes (Colyseus Cloud) o un VPS. |
| **Trabajo estimado** | **6–8 días** (incluye el Koliseo y la base común) | **+13–18 días** encima de lo anterior |

**Total del Koliseo completo:** unas 4–5 semanas de trabajo, al ritmo actual del proyecto (una persona con Claude).

**Plazo de la Vibeathon:** si la entrega sigue siendo el **7 de noviembre** (sección 6 del GDD), el PvP no llega. Lo realista para esa fecha es el **Koliseo con el Desafío de la Bruma en versión reducida** y el PvP anunciado como «Próximamente».

---

## 2. Lo que ya tenemos a favor (revisado en el código)

| Qué | Dónde | Por qué ayuda |
|---|---|---|
| Las reglas ya están separadas de los efectos visuales: la lógica emite eventos y los VFX y sonidos solo escuchan. | `combat/CombatEvents.js`, `SpellPresentation.js` (Hito 26) | En el servidor o en el árbitro basta con no instalar la presentación. |
| Todo el azar de las reglas pasa por **un único generador**, `spellManager.rng` (daño, curas, críticos). Es el único `Math.random` de las reglas; los demás son visuales (temblor y partículas en `Unit.js`) o de preparación del encuentro (botín y obstáculos en `DynamicCombatFactory`, que en la Bruma tendrán que usar la semilla de la semana). | `Spells.js` l. 1856 | Con una semilla compartida, dos máquinas obtienen el mismo resultado ante las mismas acciones: es lo que permite el *lockstep* y la repetición. |
| Los módulos de reglas no usan three.js: `StatusSystem`, `EffectResolver`, `BattlefieldObjects`, `RuneCharmEffects`, `UltimateSystem`, `Forecast`, `TurnManager` y `TacticalAI`. | `tactics/combat/` | La mayor parte del motor ya funciona sin gráficos. |
| Los mapas son datos puros y ya tienen salidas de los dos bandos (`P` y `E`). Hay un validador en Node. | `maps/BattleMaps.js`, `BattleMapLayout.js` (15 mapas) | Elegir un mapa al azar para el PvP es inmediato. |
| Ya existe un cronómetro de turno sin DOM: 30 s más el sobrante, hasta 45 s, con castigo por inactividad. | `combat/TurnTimer.js` | Sirve tal cual para el PvP, controlado también desde el servidor. |
| La economía ya vive en el servidor: carteras por ranura, libro de movimientos con idempotencia y recompensas por catálogo. | `economy.sql` (`slot_wallets`, `economy_ledger`, `economy_reward`) | El SLP del PvP y los premios se pagan con el mismo sistema. |
| Ya hay generador de encuentros y grupos por bioma. | `DynamicCombatFactory.createEncounter` | Los 5 combates de la Bruma salen de aquí. |

## 3. Lo que hay que resolver

1. **Las unidades y el tablero mezclan reglas y gráficos.** `Unit.js` (1508 líneas) guarda la vida, los PA y la casilla junto al modelo 3D. Además, las reglas **esperan animaciones**: `await moveAlongPath`, `await pushback`, `await _teleport` y la invocación de gólems. `GridManager.gridToWorld` y `GolemSystem` (41 usos de `THREE`) también dependen de three.js.
   - Para arbitrar hace falta un modo **sin gráficos**: una «unidad lógica» y un «tablero lógico» con la misma API, donde moverse o empujar sea instantáneo. Es la pieza más grande del PvP.
2. **La perspectiva es local.** Los bandos son `team: 'player' | 'enemy'`, y el empate de iniciativa lo gana «el jugador» (`TurnManager._computeOrder`).
   - En PvP cada cliente se ve como `player`, así que el orden saldría distinto en cada máquina.
   - Hace falta un bando canónico (A/B) para las reglas y el espejo solo para la cámara y los colores.
3. **Los turnos del rival hoy los juega la IA** (`main.js` + `TacticalAI`). En PvP, el turno de las unidades rivales debe esperar las órdenes que llegan por red.
4. **Los invitados no tienen cartera en el servidor.** `_econ_uid` exige sesión.
   - El PvP clasificado, la clasificación y los premios serán **solo con cuenta** (Sky Mavis).
   - Un invitado podría jugar la Bruma sin clasificar.
5. **Sin bundler.** El SDK de Colyseus y `supabase-js` se instalan con npm. Habría que traer un *bundle* ESM ya construido a `vendor/`. Para Realtime también vale un cliente propio pequeño del protocolo Phoenix (~150 líneas), en la línea de `supabaseFetch`.

---

## 4. Arquitectura del PvP: opciones

### Opción A — Colyseus (servidor autoritativo)

Colyseus es un framework de código abierto y licencia MIT para Node.js. Organiza las partidas en salas con estado propio. El estado de cada sala se sincroniza solo con los clientes, enviando únicamente lo que cambia. También reparte a los jugadores entre salas (*matchmaking*).

- **Versión 0.17:** reconexión automática en el cliente y una API nueva `defineServer()`. Tiene sala de cola integrada (*Queue Room*) y una demo de tanques por turnos.
- **Alojamiento:** propio (gratis, solo con un servidor Node encendido siempre) o Colyseus Cloud, desde 15 USD/mes sin límite de jugadores.
- **En nuestro caso:** el hosting compartido actual no sirve. Hostinger solo permite conexiones WebSocket salientes en sus planes Web y Cloud; para recibirlas hace falta su VPS (desde 4,99 USD/mes) o su hosting de apps Node.
- **Flujo:** el servidor ejecuta el motor sin gráficos, valida cada orden y la reenvía. Los clientes solo dibujan.

**A favor:** máxima seguridad; cola, salas y reconexión ya hechas.
**En contra:**
- Un servidor más que mantener y pagar.
- Puente de autenticación con Supabase: `onAuth` verificando el JWT y escribiendo resultados con la clave de servicio.
- El SDK necesita el *bundle* en `vendor/`.
- El motor sin gráficos hace falta igual.

### Opción B — Solo Supabase: *lockstep* determinista + árbitro (**recomendada**)

El combate es por turnos y con toda la información visible (no hay niebla de guerra ni cartas ocultas). Por eso no hace falta que el servidor simule en vivo: basta con que **reparta las órdenes en orden** y **arbitre al final**.

1. **Partida:** una fila en `pvp_matches` con la semilla del azar, el mapa, los lados (A/B al azar) y la «foto» de los dos equipos (stats, cartas, runas y charms leídos del servidor, no del cliente).
2. **Órdenes:** `pvp_act(match, seq, orden)` es una función del servidor. Comprueba que es tu turno, el número de orden siguiente y el tiempo restante, la guarda en `pvp_actions` y la reenvía con `realtime.send` (Broadcast desde la base de datos) al canal privado de la partida.
   - Las órdenes son intenciones atómicas: `MOVE {unit, x, z}`, `CAST {unit, spell, x, z}`, `END_TURN`.
3. **Los dos clientes simulan** con la misma semilla y las mismas órdenes. Una orden ilegal (por ejemplo, sin PA) la rechaza el motor del rival: queda marcada como desincronización y decide el árbitro.
4. **Árbitro:** al terminar, o ante una disputa, una Edge Function (Deno) repite la partida entera con el motor sin gráficos a partir de las órdenes guardadas. El resultado oficial es el suyo.
   - Una partida son unos cientos de órdenes de pura lógica, así que cabe en el límite de CPU de una función.
   - Con el resultado aplica la clasificación y las recompensas.
5. **Tiempo y abandono:** el servidor guarda la hora de cada orden.
   - Si un turno supera su tiempo, cualquiera de los dos clientes (o un `pg_cron` cada minuto) puede pedir `pvp_timeout`, que pasa el turno o, tras 60 s sin conexión, da la victoria al otro.
   - La presencia (Realtime Presence) avisa de quién está conectado.

**A favor:**
- Sin servidor nuevo y sin coste extra.
- Todo queda en Supabase, como la economía y el Mercado.
- La partida queda grabada: sirve para repeticiones y para revisar disputas.

**En contra:**
- Hay que garantizar el determinismo: mismo orden de unidades, ningún azar fuera de `rng` y nada que dependa del tiempo real.
- El servidor no valida cada orden en vivo: un tramposo puede estropear una partida, pero pierde en el arbitraje.

**Límites que importan:**
- **Realtime:** 200 conexiones simultáneas y 100 mensajes por segundo en el plan gratuito; 500 y 500 en Pro (25 USD/mes).
- **WebSockets en Edge Functions:** sirven poco aquí, porque la función se cierra a los 150 s (gratis) o 400 s (pago). Por eso el árbitro es una llamada HTTP al final y no una sala abierta.

### Comparación

| | A · Colyseus | B · Supabase |
|---|---|---|
| Servidor nuevo | Sí (Node siempre encendido) | No |
| Coste | 15 USD/mes o VPS | 0 (Pro a 25 USD/mes si crece) |
| Antitrampas | En vivo | Al final (repetición) + reglas de turno y tiempo en vivo |
| Reconexión / cola | Integradas | Propias (simples en un 1 contra 1 por turnos) |
| Motor sin gráficos | Necesario | Necesario |
| Encaja con «sin bundler» | Peor (SDK en `vendor/`) | Mejor (`fetch` + cliente Realtime pequeño) |
| Días extra estimados | +2–4 sobre B | — |

**Recomendación:** empezar con **B**. El motor sin gráficos es la inversión principal y sirve igual para las dos: si el PvP crece (torneos, espectadores, muchas salas), esa pieza se mueve tal cual a una sala de Colyseus.

---

## 5. Diseño propuesto

### 5.1 Koliseo (lo común)
- **Dónde:** un lugar en el pueblo del Bosque (NPC o edificio) con un panel de tres pestañas: **Arena**, **Desafío de la Bruma** y **Clasificación**. Por ahora sin tecla propia.
- **Temporadas:** propuesta mensual. Al cerrar:
  - reparto de bAXS según el puesto;
  - reinicio suave de puntos (por ejemplo, `nuevo = 1000 + (actual − 1000) / 2`).
- **Clasificación:** vista del servidor con los 100 primeros y «tu puesto». Solo cuentas con Sky Mavis.

### 5.2 Arena PvP
- **Equipo:** Sapidae + Axie principal (2 unidades por bando, más los gólems). El bando A o B se sortea.
- **Mapa:** uno al azar de los 15, del que se excluyen los mapas de jefe. Antes de abrir el modo hay que revisar si cada mapa es justo para los dos lados.
- **Cronómetro:** el de `TurnTimer` (30 s más el sobrante, hasta 45 s), con la hora de referencia en el servidor.
- **Puntos de temporada:** **Elo** con K = 32 al principio y 24 después.
  - Elo es transparente para el jugador, y con pocos jugadores Glicko-2 no aporta mucho: rinde mejor con 10–20 partidas por jugador y periodo.
  - Mínimo +10 por victoria, para que ganar siempre se note.
- **Cola:** se busca rival con ±100 puntos y la ventana se amplía con la espera, hasta cualquiera a los 60 s.
- **Recompensas y antiabuso:**
  - SLP por victoria (cifra del catálogo `reward:pvp_win`), con tope diario.
  - Contra el mismo rival solo cuentan 3 partidas al día para la clasificación.
  - El perdedor no gana SLP.
- **Antitrampas:** el equipo se lee del servidor (ranura en la nube), no del cliente. Las órdenes llevan número y hora, y el resultado lo pone el árbitro.

### 5.3 Desafío de la Bruma
- **Semana:** ISO, de lunes a domingo (UTC−5). El servidor publica la configuración de la semana:
  - semilla;
  - los 5 grupos, de menor a mayor dificultad, sacados de los grupos por bioma;
  - los 5 mapas;
  - un **modificador de bruma** (por ejemplo, −1 AL para todos o enemigos con +20 % de vida).
  - Es igual para todos los jugadores.
- **Intento:** `bruma_start` crea la partida del reto con su semilla; cada combate se informa con `bruma_report`. Con **2 derrotas** el intento termina.
- **Puntuación** (no se usa el tiempo real, que castiga pensar y se puede manipular):
  1. combates superados (0–5);
  2. menos turnos totales;
  3. más vida restante del escuadrón.
  - Fórmula sugerida: `superados × 10000 − turnos × 50 + vida_restante %`.
- **Premios:** del juego: oro, bolsas de runa o charm y materiales. Hay un premio por participar y otros por tramos (top 10, 11–50, «completó los 5»).
- **Antitrampas en dos pasos:**
  1. Al principio, comprobaciones de verosimilitud: la configuración la da el servidor, hay tiempos mínimos por combate y topes de daño o turnos.
  2. Cuando exista el motor sin gráficos, el cliente envía también las órdenes y el mismo árbitro del PvP repite el combate. `TacticalAI` no usa azar, así que el combate es repetible con la semilla.

### 5.4 Tablas nuevas en Supabase (borrador)
`seasons` · `pvp_ratings` (temporada, usuario, puntos, victorias, derrotas) · `pvp_queue` · `pvp_matches` · `pvp_actions` · `bruma_weeks` · `bruma_runs` · `bruma_battles` · `koliseo_payouts`

- Funciones: `pvp_enqueue`, `pvp_act`, `pvp_timeout`, `bruma_start`, `bruma_report`.
- Edge Function: `arbiter`.
- Tareas `pg_cron`: tiempos agotados, cierre de semana y cierre de temporada.

Todo pasa por funciones del servidor, igual que la economía. Los jugadores no escriben directamente en las tablas.

---

## 6. Fases y estimación

Las cifras son días de trabajo de una persona con Claude, al ritmo de los últimos hitos.

| Fase | Contenido | Días |
|---|---|---|
| 0 | Decisiones (sección 8), tablas comunes, temporadas, clasificación y pagos | 1,5–2 |
| 1 | Koliseo: lugar en el pueblo y panel con las 3 pestañas (i18n, diseño del juego) | 1–1,5 |
| 2 | **Desafío de la Bruma** jugable: semana, 5 combates, 2 derrotas, puntuación, clasificación y premios (con comprobaciones de verosimilitud) | 3–4,5 |
| **Subtotal** | **Koliseo + Bruma** | **≈ 6–8** |
| 3 | **Motor sin gráficos:** unidad y tablero lógicos, bandos A/B, orden canónico, semilla, registro y repetición de órdenes, y pruebas de determinismo en Node (la misma partida da el mismo resultado byte a byte) | 5–7 |
| 4 | **PvP:** cola, partida, envío de órdenes por Realtime, turnos del rival por red, cronómetro en el servidor, desconexión y abandono, árbitro (Edge Function), Elo y recompensas | 6–8 |
| 5 | Equilibrio PvP y pruebas con dos cuentas reales (Playwright con dos navegadores) | 2–3 |
| **Subtotal** | **PvP** | **≈ 13–18** |
| (A) | Variante Colyseus en lugar de la fase 4 (servidor, despliegue, puente de autenticación) | +2–4 |

---

## 7. Herramientas

| Herramienta | Para qué | Coste |
|---|---|---|
| **Supabase** (ya en uso): Postgres, Realtime (Broadcast y Presence), Edge Functions (Deno), `pg_cron` | Datos, envío de órdenes, árbitro y tareas programadas | Gratis hasta 200 conexiones simultáneas; Pro 25 USD/mes |
| Cliente Realtime | Propio y pequeño en `src/net/`, o un *bundle* ESM de `supabase-js` en `vendor/` | — |
| **Node** (ya en uso) | Pruebas del motor sin gráficos y de determinismo, junto a `tools/battle-maps/check-maps.mjs` | — |
| **Playwright** | Pruebas de partidas PvP con dos navegadores | — |
| Colyseus 0.17 + Colyseus Cloud o VPS | Solo en la opción A | 15 USD/mes o VPS desde ~5 USD/mes |

## 8. Decisiones pendientes

1. **Plazo:** ¿esto es para la entrega del 7 de noviembre o para después? Cambia el orden (Bruma primero) y el alcance.
2. **PvP con equipo, runas y charms reales, o con estadísticas igualadas?** Lo real premia el progreso; lo igualado es más justo para empezar.
3. **¿La Duo Ultimate se permite en PvP?** Depende solo del vínculo al 100 %, que se puede subir sin combatir.
4. **Bruma:**
   - ¿escuadrón completo (Sapidae + hasta 3 Axies) o el mismo par que el PvP?
   - ¿la vida se arrastra entre los 5 combates?
   - ¿un intento por semana o varios, quedándose con la mejor marca?
5. **Criterio de la clasificación de la Bruma:** ¿la fórmula propuesta (combates, turnos y vida) o daño total?
6. **Temporada:** duración y tabla de bAXS por puesto (bAXS no se intercambia, así que no hace falta revisarlo con Sky Mavis; el AXS real sí).
7. **Invitados:** ¿pueden jugar la Bruma sin clasificar, o el Koliseo entero exige cuenta?

## 9. Riesgos

- **Determinismo:** cualquier azar o dependencia del tiempo fuera de `rng` desincroniza las partidas. Las pruebas de la fase 3 son la defensa; conviene añadir una «huella» del estado tras cada turno para detectar desincronizaciones al momento.
- **Pocos jugadores:** colas vacías. Mitigación: horario de arena, avisos cuando hay alguien buscando y, más adelante, una opción contra un «fantasma» (repetición de otro jugador).
- **Equilibrio 1 contra 1:** el triángulo de clases (±15 %), algunos estados (aturdir, dormir) y quién empieza pesan más que contra la IA. Habrá que ajustar con partidas reales (`CombatTelemetry` ya registra cada combate).
- **Refactor de `Unit.js`:** tocar el corazón del combate puede romper el modo historia. El modo sin gráficos debe añadirse al lado, con la misma API, sin cambiar lo que ya funciona.

## Fuentes

- Colyseus (framework): https://colyseus.io/framework/
- Colyseus 0.17: https://colyseus.io/blog/colyseus-017-is-here/
- Precios de Colyseus Cloud: https://colyseus.io/pricing/
- Límites de Supabase Realtime: https://supabase.com/docs/guides/realtime/limits
- Broadcast desde la base de datos (`realtime.send`): https://supabase.com/docs/guides/realtime/broadcast
- Límites de WebSockets en Edge Functions: https://github.com/orgs/supabase/discussions/47841
- WebSockets en Hostinger: https://www.hostinger.com/support/?p=1364
- Glicko-2 y número de partidas por periodo: https://fooskill.readthedocs.io/en/latest/overview/rating_system.html
- Investigación previa del proyecto: `docs/INVESTIGACION_ESCALABILIDAD.md`, sección 3
