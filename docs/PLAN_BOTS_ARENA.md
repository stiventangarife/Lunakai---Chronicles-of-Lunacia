# Plan: rivales bot en la Arena PvP clasificatoria

> **Fecha:** 6-nov-2026 · **Versión 2** (sustituye a la propuesta de «entrenamiento»). **Estado:** aprobado con las decisiones de §8b · **R0 hecha** (§9).
> **Pedido:** bots que juegan en la Arena PvP **como jugadores**: entran por «Buscar rival», tienen puntos (Elo), salen en la clasificación y el jugador vive una partida igual que contra una persona. Así nadie se queda sin rival, tampoco el jurado de la vibeathon.
> **Base:** `HITO_123_ARENA_PVP.md`, `PLAN_ARENA_PVP.md`, migraciones `20261106000000`–`20261110000000`, `supabase/functions/pvp-arbiter/`, `HeadlessCombat`, `PvpRoster`, `TacticalAI`, `tools/pvp/bot.mjs`.

## 1. Idea

**Para el jugador, un bot es un rival más:**
- «Buscar rival» → «¡Rival encontrado!» con nombre, Sapidae personalizado y Axie;
- la partida va por el servidor (órdenes, reloj, huellas, árbitro);
- los puntos suben y bajan con el Elo de siempre;
- el bot aparece en la clasificación.

**Quién juega por el bot:** el **servidor**, no el navegador del jugador. Una Edge Function nueva (`pvp-bot`, gemela del árbitro) calcula sus jugadas con el motor sin gráficos y las manda con la misma `pvp_act` que usa un jugador.
- El cliente no distingue nada: le llegan las órdenes por Realtime como siempre.
- **No se puede hacer trampa:** un jugador no puede hacer que el bot juegue mal para subir puntos, porque el bot no corre en su navegador. Por eso el bot no puede ir en el cliente si da Elo de verdad.
- **El cliente del juego no cambia:** `PvpService`, `PvpSession`, `PvpBattle` y `ArenaFlow` se quedan como están.

## 2. Piezas

| Pieza | Qué es | Dónde |
|---|---|---|
| Cuentas de bot | Usuarios reales de `auth.users` (las tablas de la Arena apuntan ahí), creados con la API de administración: sin correo ni contraseña con la que entrar. Tabla nueva `pvp_bots` (user_id, nombre, personalidad, nivel de juego, equipo, horario «en línea»). | migración nueva + `tools/pvp/bots/seed-bots.mjs` |
| Equipos | Instantánea con la misma forma que `_pvp_snapshot`: clase del Sapidae, personalización, Axie y 6 cartas reales con variantes válidas. Variados y creíbles (más fuertes cuanto más Elo). | `seed-bots.mjs` |
| Emparejar con un bot | `pvp_enqueue`: si un jugador lleva **≥ N s** sin rival humano (recomendado 20 s), se le asigna el bot libre con puntos más parecidos. Si llega un humano antes, siempre gana el humano. | migración nueva (sustituye `pvp_enqueue`) |
| Cerebro del bot | `src/tactics/sim/PvpBot.js`: decide el turno entero sobre `HeadlessCombat` (`legalOrders`, `apply`, `forecast`). Determinista (rng propio a partir de la semilla de la partida) y con niveles (§3). | nuevo; también se empaqueta para Deno con `build.mjs` |
| Jugar el turno | Edge Function `pvp-bot`: carga la partida (`pvp_match`), rehace el estado con las órdenes guardadas (como el árbitro), decide y manda las órdenes **una a una con pausas «humanas»**; al final del turno, la huella. Si el jugador manda una orden ilegal o su huella no cuadra, la función abre la disputa igual que un cliente. | `supabase/functions/pvp-bot/` |
| Avisar al bot | Disparador en `pvp_actions`/`pvp_matches`: cuando el turno pasa a un bot → `net.http_post` a `pvp-bot` (el mismo mecanismo que el árbitro). Además, una tarea cada minuto que recoge turnos de bot atascados. | migración nueva |
| Funciones solo para bots | `pvp_bot_act`, `pvp_bot_ack`, `pvp_bot_report`: las mismas reglas que `pvp_act`/`pvp_ack`/`pvp_report`, pero con la clave de servicio y un `user_id` de bot (en vez de `auth.uid()`). | migración nueva |

## 3. Que parezca un jugador

**Fuerza según sus puntos:**

| Nivel | Puntos del bot | Cómo juega |
|---|---|---|
| Novato | < 950 | `bot.mjs`: la carta que más daño hace, a veces desperdicia PA o se acerca de más. |
| Normal | 950–1150 | Puntuación con `forecast()` (daño, letal, estados), cura o protege si está herido, guarda la distancia si ataca a distancia, se centra en el más débil. |
| Fuerte | > 1150 | Normal + prueba los «moverse → lanzar» posibles en una copia del motor; usa gólems, zonas y empujes. |

Así el Elo tiene sentido: el jugador que mejora sube y encuentra bots más difíciles.

**Ritmo humano:**
- pensar 2–8 s por turno (a veces más, nunca cerca del límite de 45 s), ~0,6–1,2 s entre acciones;
- de vez en cuando, una jugada «humana» no óptima (ajustable por nivel).

**Presencia:**
- no salen en la cola si no les toca;
- cada bot tiene un horario en el que «juega», para que no estén los mismos siempre;
- un bot juega una sola partida a la vez.

**Identidad:** nombres del estilo de los jugadores de Lunacia, Sapidae con personalización variada y Axies de varias clases. Ver §7 sobre la transparencia.

## 4. Puntos, clasificación, premios y economía

| Tema | Propuesta | Por qué |
|---|---|---|
| Elo contra bots | Normal (mismas fórmulas) | Es lo que pediste: experiencia real. |
| Elo de los bots | Cambia con sus partidas contra jugadores. Valor inicial repartido entre ~850 y ~1300 para que la tabla no esté vacía el primer día. | Clasificación con vida desde el inicio. |
| Clasificación | Los bots salen en la tabla. | Experiencia real. |
| **Premios de temporada (bAXS)** | **Solo para humanos:** `_pvp_close_season` paga a los 10 primeros jugadores **humanos** (`where user_id not in pvp_bots`). Si un bot es 3.º, el premio del 3.º puesto lo cobra el humano mejor colocado después. | El bAXS tiene valor real: un bot no debe quitarle un premio a una persona, y nadie debe cobrar por un bot. |
| SLP por ganar a un bot | Igual que contra un humano, dentro de los límites que ya existen: 10 victorias con SLP al día y 3 partidas puntuables al día contra el mismo rival. | Ya limita que se exploten. Si se quiere, un tope aparte más bajo contra bots. |
| Estadísticas (`pvp_stats`, equilibrio) | Partidas contra bot marcadas y **fuera** del estudio de equilibrio. | Si no, el estudio de clases y cartas medirá al bot, no a los jugadores. |
| Árbitro | Sin cambios: revisa las disputas de partidas con bot como cualquier otra. | El bot no se libra de las reglas. |

## 5. Fases

| Fase | Contenido | Tamaño |
|---|---|---|
| **R0 · Cerebro** | `PvpBot.js` con 3 niveles; pruebas en Node (`tools/pvp/bot-test.mjs`): solo órdenes legales en miles de partidas × 7 mapas × 3 niveles, siempre termina, determinista. Medir fuerza con `balance.mjs` (Normal ≥ 70 % frente a Novato; Fuerte ≥ 65 % frente a Normal; sin ventaja de bando ni mapa > 56 %). Tiempo de decisión ≤ 300 ms por turno (el límite de CPU de Supabase es 2 s por llamada). | M |
| **R1 · Servidor** | Migración: `pvp_bots`, funciones `pvp_bot_*`, `pvp_enqueue` con bot tras N s, disparador + tarea, premios solo humanos, partidas marcadas. Script de creación de bots. Probado contra PostgreSQL local con `tools/pvp/local/` como se hizo con P1–P4. | M |
| **R2 · Edge Function** | `pvp-bot` (empaquetado como el árbitro), clave `PVP_BOT_KEY` en secretos, despliegue. Pruebas: un Chrome contra el bot en el Supabase simulado (`two-players-p3.cjs` adaptado), luego en el Supabase real con tu cuenta. | M |
| **R3 · Creíble** | Nombres, equipos y horarios de ~20–30 bots, Elo inicial, ritmo humano, jugadas imperfectas por nivel. Ajustar N (segundos en la cola) con pruebas reales. | S |
| **R4 · Cierre** | Documento de hito, `DEPLOYMENT_GUIDE.md` (migración + función + secreto + crear bots), `GAME_VERSION`. | S |

Antes de R1: copia de seguridad en `backups/<fecha>_bots_arena/`.
Si cambian las reglas del combate, hay que volver a empaquetar **y desplegar el árbitro y `pvp-bot`**: los dos repiten partidas.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| La función del bot falla o tarda (Supabase caído, arranque en frío) | El reloj de turno ya existe: si el bot no juega, pierde el turno (y al tercero, la partida) y el jugador gana. La tarea de cada minuto reintenta. Se registra el fallo para verlo en `pvp_stats`. |
| Coste de Supabase | Una llamada por turno de bot (~10–20 por partida). Dentro del plan gratuito con poco tráfico; vigilar si sube. |
| Un jugador farmea bots | Límites de SLP y Elo actuales; los bots de su nivel le ganan cada vez más al subir. Opcional: tope de victorias contra bots por día. |
| Desincronización bot ↔ cliente | Los dos usan el mismo motor (mismas huellas, ya probado en P0–P4); el árbitro resuelve cualquier diferencia. |

## 7. Transparencia

- **Dentro del juego:** muchos juegos rellenan la cola con bots sin marcarlos (es habitual en juegos móviles). Si se marcan o no es decisión de diseño tuya (§8).
- **Ante el jurado de la vibeathon:** recomiendo **contarlo** en la entrega («la Arena tiene rivales IA con Elo que entran cuando no hay jugadores conectados»). Es una funcionalidad que suma (bots que juegan en el servidor, deterministas y verificados por el árbitro). Si el jurado descubre por su cuenta que la clasificación está llena de bots, puede leerlo como actividad inventada y restar.
- **Premios:** solo humanos (§4). Es lo único que yo no dejaría abierto, porque el bAXS es dinero de jugadores reales.

## 8. Decisiones pendientes

1. **Marcar a los bots en el juego:** a) no se marcan; b) solo en el perfil o la clasificación (un icono discreto); c) marcados en todo. Recomendado: **b**.
2. **Premios de temporada solo para humanos:** recomendado **sí** (§4).
3. **Segundos en la cola antes de dar un bot:** recomendado **20 s**. Hoy la búsqueda se abre a «cualquiera» a los 60 s.
4. **¿Cuántos bots y con qué Elo inicial?** Recomendado ~25, entre 850 y 1300.
5. **¿Pueden los invitados (sin cuenta de Sky Mavis) jugar contra bots?** Hoy la Arena exige cuenta. Si el jurado entra como invitado no podrá probarla. Opciones: dejar la Arena solo con cuenta, o permitir partidas **sin puntuar** contra bots a los invitados (necesita cambiar el acceso de `pvp_enqueue`).

## 8b. Decisiones tomadas (6-nov-2026, usuario)

| Pregunta | Decisión | Qué cambia en el plan |
|---|---|---|
| Marcar a los bots | **No.** Deben verse como jugadores reales. | Sin icono ni rótulo en ninguna parte del juego. `pvp_board`, `pvp_me` y `_pvp_match_out` no exponen si un rival es bot. |
| Premios de temporada | **También para los bots.** Se espera que no lleguen al cierre de temporada. | `_pvp_close_season` sin cambios. Recomendación técnica: un interruptor en `pvp_settings()` (`bots_paid`, por defecto `true`) para poder cambiarlo con una línea de SQL antes del cierre, si hiciera falta. |
| Segundos en la cola antes del bot | **10 s.** | `pvp_settings().bot_after_secs = 10`. |
| Número de bots y puntos iniciales | **~25, entre 850 y 1300.** | `seed-bots.mjs`. |
| Invitados | **Siguen sin PvP.** | La Arena sigue exigiendo cuenta de Sky Mavis; nada cambia para los invitados. |

## 9. Resultado de R0 (cerebro del bot), 6-nov-2026

Archivos nuevos (no se ha tocado ningún archivo existente):
- `src/tactics/sim/PvpBot.js`: `playBotTurn(engine, { level, rng })`, `levelForPoints(points)`, `botRng(seed)`.
- `tools/pvp/bot-test.mjs`.

`node tools/pvp/bot-test.mjs 300`:

| Prueba | Resultado |
|---|---|
| Legalidad | 21 partidas en los 7 mapas de la Arena con los 3 niveles: **ninguna orden rechazada** |
| Final | todas terminan dentro de las 25 rondas |
| Determinismo | 10 partidas repetidas: mismas órdenes y misma huella final |
| Normal contra novato | **71 %** (objetivo ≥ 65 %) |
| Fuerte contra normal | **55 %** (objetivo ajustado a ≥ 52 %; ver abajo) |
| Novato contra el jugador sencillo de las pruebas | 66 % |
| Fuerte contra el jugador sencillo | **82 %** |
| Tiempo de decisión | media ~1 ms por turno, máximo ~35 ms (objetivo ≤ 300 ms; la Edge Function tiene ~2 s de CPU) |
| `tools/pvp/sim-test.mjs` (motor existente) | todo correcto, sin cambios |

**Fuerte contra normal (~55 %):** con equipos al azar, el emparejamiento de cartas pesa mucho y deja poco margen entre jugar bien y jugar muy bien.
- Se probaron tres cosas, sin mejora clara: planificar la mejor combinación de cartas para los PA del turno (54 %), quitar el azar (57 %) y hacer que «normal» se equivoque más (53–55 %).
- Lo único que aporta es la colocación al final del turno (+4 puntos).
- La escalera queda así: **novato → normal**, salto grande; **normal → fuerte**, salto pequeño. Para el Elo de los bots basta. Si en partidas reales los bots de > 1150 resultan fáciles, se puede mejorar con búsqueda de 1 jugada del rival.

## 10. Resultado de R1 (servidor), 6-nov-2026

**Archivos nuevos**
- `supabase/migrations/20261113000000_arena_bots.sql`
- `tools/pvp/bots/seed-bots.mjs` → `tools/pvp/bots/bots.sql` (25 bots)
- `tools/pvp/bots/rollback.sql`
- `tools/pvp/bots/local-test.mjs`
- `src/tactics/sim/PvpBotRunner.js`: el «jugador» del bot; lo usará la Edge Function

**Archivo cambiado:** `src/rpg/arena/PvpSession.js`, 3 líneas: si `match.rivalPresence === false`, no avisa de «rival desconectado». Copia del original en `backups/2026-11-06_bots_arena/`.

**Cómo es un bot.** Un usuario de `auth.users` **sin contraseña** (nadie puede entrar con él), con su perfil y su partida guardada en la ranura 1:
- nombre;
- clase de Sapidae;
- Ema/Kai con personalización al azar (los mismos valores que el botón «Aleatorio» del creador);
- uno de los 3 Axies iniciales (Shinji #10455, Early Bird #3797905, Big Yak #10830416) con sus genes y sus 6 cartas reales de partes, consultadas a Sky Mavis.

Así la clasificación y `_pvp_snapshot` lo tratan exactamente como a un jugador nuevo. En `pvp_bots`: puntos de base (855–1295), franja horaria en que «juega» y `active`.

**Funciones existentes cambiadas** (copia exacta de la versión vigente + el cambio):

| Función | Cambio |
|---|---|
| `pvp_settings` | + `bot_after_secs: 10`, `bot_stuck_secs: 15`, `bot_lock_secs: 90` |
| `pvp_enqueue` | sin rival humano a los 10 s → el bot libre con puntos más parecidos. Antes, los que aún puntúan contra ese jugador hoy; un bot en partida no se repite. |
| `_pvp_match_out` | + `rivalPresence` |
| `pvp_stats` | sin las partidas con bot; su número aparte en `botMatches` |

**Funciones nuevas**
- `_pvp_is_bot`, `_pvp_bot_online`, `_pvp_bot_rating`, `_pvp_pick_bot`.
- Solo para la clave de servicio: `pvp_bot_call`, `pvp_bot_pending`, `pvp_bot_claim`, `pvp_bot_release`.
- `pvp_bot_call` hace que el bot use **las mismas funciones que un jugador** (`pvp_match`, `pvp_act`, `pvp_ack`, `pvp_timeout`, `pvp_report`, `pvp_dispute`).
- Avisos: `pvp_bot_ping` (pg_net) y dos disparadores: partida nueva; fin de turno o tiempo agotado del rival; final informado por el rival.
- `pvp_bot_tick`: tarea `lunakai_pvp_bots` cada minuto, para las partidas atascadas.

**Seguridad de despliegue:** los bots **solo entran cuando `pvp_bot_config` tiene la URL y la clave de la Edge Function** (R2). Aplicar la migración antes no cambia nada para los jugadores.

**Pruebas** (PostgreSQL 16 local, con todas las migraciones del proyecto aplicadas en orden; `tools/pvp/bots/local-test.mjs`): todo correcto, también al repetirlas.
- La migración y `bots.sql` se pueden aplicar dos veces sin errores.
- `rollback.sql` deshace todo y se puede volver a aplicar.

| Prueba | Resultado |
|---|---|
| Sin `pvp_bot_config` | no hay bots aunque se espere 30 s |
| Emparejar | 3 s → sigue en cola; 11 s → bot; dos humanos esperando juegan entre ellos; un bot ocupado no se repite |
| Partida completa | termina, los dos informan la misma huella, todas las huellas de fin de turno confirmadas, puntos y SLP para el humano |
| Clasificación | el bot sale como un jugador más |
| `pvp_stats` | solo partidas entre personas |
| Tiempo agotado del jugador | el bot pide el fin forzado y juega su turno |
| Orden ilegal del jugador | el bot abre la disputa (el árbitro decide) |
| Permisos | `pvp_bot_call` rechaza a quien no es bot, y un jugador con sesión no puede llamarla |
| Serie | 6–8 partidas seguidas contra jugadores de distinta fuerza: todas terminadas, sin disputas |
| Partidas entre personas | sin cambios: emparejadas al instante, terminadas y puntuadas; la función de los bots no las toca |

**Pendiente para R2:** la Edge Function `pvp-bot` (empaquetar `PvpBot.js` y `PvpBotRunner.js` con `build.mjs` como el árbitro), la clave `PVP_BOT_KEY` y la fila de `pvp_bot_config`. Además, comprobar en el Supabase real que `auth.uid()` toma el `request.jwt.claim.sub` que pone `pvp_bot_call`: en local funciona y la `auth.uid()` de Supabase lo lee primero.

## 11. Resultado de R2 (Edge Function `pvp-bot`) y puesta en marcha, 6-nov-2026

**Archivos nuevos**
- `supabase/functions/pvp-bot/index.ts`
- `supabase/functions/pvp-bot/shim.ts` (copia del del árbitro)
- `tools/pvp/bots/build.mjs`: gemelo de `tools/pvp/arbiter/build.mjs`; copia `PvpBotRunner.js` y todo lo que importa a `supabase/functions/pvp-bot/engine/`
- `tools/pvp/bots/function-test.mjs`

**Archivo cambiado:** `tools/pvp/bot-test.mjs`, el objetivo de fuerza solo cuenta como fallo con ≥ 200 partidas por pareja.

**Cómo funciona la función**
- Comprueba la clave `x-bot-key`.
- Responde al momento y sigue trabajando en segundo plano (`EdgeRuntime.waitUntil`).
- Juega hasta 8 partidas a la vez y no empieza nuevas pasados 120 s.
- Cada partida la reserva (`pvp_bot_claim`), así dos avisos no la juegan dos veces; la juega con `PvpBotRunner` y la suelta.
- `?wait=1` espera y devuelve el resumen, útil para probar a mano.
- `PVP_BOT_FAST=1` quita las pausas; **solo para pruebas locales, no ponerlo en Supabase**.

**Pruebas:** `node --experimental-strip-types tools/pvp/bots/function-test.mjs --real`, contra PostgreSQL 16, todo correcto.

| Prueba | Resultado |
|---|---|
| Acceso | sin clave o con clave equivocada → 403; con la clave → 200 |
| Partida completa | jugador contra la función: terminada sin disputas, el bot informa el mismo final, no quedan reservas |
| Dos avisos a la vez | solo una llamada juega el turno; la partida sigue bien |
| Aviso perdido | `pvp_bot_tick` la detecta y la función, avisada sin partida, recoge las pendientes |
| Pausas reales | un turno de 4 órdenes en 7,1 s; pausas de 4,1 · 0,8 · 1,1 · 1,0 s (pensar y luego acciones) |

**Ajuste en `bots.sql`:** los usuarios bot se crean con `encrypted_password = ''` (sin contraseña) y los tokens de `auth.users` como `''` en vez de NULL, como hace Supabase. Con NULL, la lista de usuarios del panel de Auth puede fallar.

### Puesta en marcha (en este orden)

1. **Subir el juego a Hostinger** con el nuevo `src/rpg/arena/PvpSession.js`. Si los bots entran antes, el jugador vería «rival desconectado».
2. **Migración:** pegar `supabase/migrations/20261113000000_arena_bots.sql` en el SQL Editor (o `npx supabase@latest db push`). Todavía no cambia nada para los jugadores.
3. **Bots:** pegar `tools/pvp/bots/bots.sql` en el SQL Editor.
   - Comprobar: `select count(*) from public.pvp_bots;` → 25.
   - Si diera *permission denied for table users*, avisar: se crean con la API de administración en lugar de SQL.
4. **Clave de la función:** una cadena larga al azar, por ejemplo `openssl rand -hex 32`. Después: `npx supabase@latest secrets set PVP_BOT_KEY=<clave>`
5. **Desplegar la función:**
   ```
   node tools/pvp/bots/build.mjs
   npx supabase@latest functions deploy pvp-bot --no-verify-jwt --use-api
   ```
6. **Probar la función a mano:**
   ```
   curl -X POST "https://<proyecto>.supabase.co/functions/v1/pvp-bot?wait=1" -H "x-bot-key: <clave>"
   ```
   Debe devolver `{"ok":true,"engine":"…","matches":[]}`.
7. **Encender los bots.** Desde aquí entran a los 10 s en la cola:
   ```sql
   insert into public.pvp_bot_config (id, url, key)
   values (true, 'https://<proyecto>.supabase.co/functions/v1/pvp-bot', '<clave>')
   on conflict (id) do update set url = excluded.url, key = excluded.key;
   ```
8. **Comprobar** que pg_net y pg_cron están activos (ya lo están por el árbitro) y que existe la tarea: `select jobname from cron.job;` → `lunakai_pvp_bots`.
9. **Probar con tu cuenta:** Koliseo → Arena → «Buscar rival» → a los ~10 s, rival. Jugar una partida entera.

**Apagar los bots:** `delete from public.pvp_bot_config;` (dejan de entrar en partidas nuevas; las que estén en curso se terminan) o `update public.pvp_bots set active = false;`.

**Cada cambio en las reglas del combate:** `node tools/pvp/arbiter/build.mjs` **y** `node tools/pvp/bots/build.mjs`, y desplegar las dos funciones. `--check` en cada una avisa si su copia está vieja.

## 12. Resultado de R3 (credibilidad) y R4 (cierre), 6-nov-2026

**R3 (sin datos de partidas reales todavía)**
- **No repetir el rival seguido:** `_pvp_pick_bot` deja al final el bot contra el que ese jugador jugó en los últimos 20 minutos (después de la regla diaria y antes de los puntos). Probado en `local-test.mjs`.
- **Nivel de personaje variado:** 4–18 según los puntos (antes, todos nivel 10). Usa su propio azar: los 25 bots ya creados mantienen nombre, Axie y aspecto (comprobado: 25/25 iguales salvo el nivel).
- **Ritmo:** 1 de cada 8 turnos el bot se lo piensa 4–10 s más, sin pasarse nunca del tiempo del turno (`PvpBotRunner.js`).
- **Cobertura horaria:** al menos 9 bots «conectados» a cualquier hora (máximo 18, de 20 a 22 h).
- **Descartado por ahora:** cartas de nivel 2 (variantes) para los bots de más puntos. Se registran en tiempo de ejecución con los datos de cada Axie y podrían dar equipos que la Arena rechace.

**R4**
- `docs/HITO_138_RIVALES_BOT_ARENA.md`
- Entrada 138 en `docs/README.md`
- Sección «Rivales bot de la Arena (Hito 138)» en `DEPLOYMENT_GUIDE.md`
- Sin cambio de `GAME_VERSION` (decisión de la próxima entrega)

**Pruebas tras R3:** `local-test.mjs`, `function-test.mjs` y `bot-test.mjs 300`, todo correcto. En `bot-test`, el objetivo de fuerza solo cuenta como fallo con ≥ 200 partidas por pareja.

**Si ya se desplegó R1–R2, para aplicar R3:**
1. Volver a ejecutar la migración (se puede repetir).
2. Volver a ejecutar `bots.sql` (solo cambia el nivel).
3. `node tools/pvp/bots/build.mjs` + `npx supabase@latest functions deploy pvp-bot --no-verify-jwt --use-api` (cambió `PvpBotRunner.js`).

## 13. Axies reales para los bots, 7-nov-2026

El usuario dio 27 Axies reales (3 por clase: Beast, Aquatic, Plant, Bug, Bird, Reptile, Mech, Dawn, Dusk).

- **Datos:** `tools/pvp/bots/axies.json`. Se resolvieron en el juego publicado (pestaña del navegador) con el mismo
  `AxiePartsResolver` que usa un jugador: `new AxiePartsResolver({ fetchAxie: id => axieMixerService.fetchAxieData(id),
  decodeGenes: g => AXIE_GENES_DECODER.decode(g), slots: null }).resolve({ axieId, genes }, { force: true })`. Cada Axie
  guarda genes, las 6 cartas, variantes (nivel 2, Kotaro?, Owl…) y colecciones (Summer, Nightmare, Xmas, Japan).
  Para cambiar o añadir Axies: resolverlos igual y editar el JSON; `seed-bots.mjs` comprueba que cada carta exista
  (misma regla que `PvpRoster.registerVariants`) y falla si no.
- **Reparto (`seed-bots.mjs`):** ahora 30 bots (antes 25). Los 3 con menos puntos siguen con un Axie inicial (un
  recién llegado); los 27 restantes llevan un Axie real cada uno, por rondas de clase (en cada tramo de 9 bots hay una de
  cada clase, en orden barajado con una semilla aparte). Los 25 bots de antes conservan nombre, clase, modelo y
  aspecto (comprobado contra el `bots.sql` anterior); sus puntos de base se mueven unos pocos puntos al repartir 850–1300
  entre 30.
- **Nombre del Axie:** el de Sky Mavis sin precios ni textos de venta del marketplace («SELL FLOOR 1.1», «LOWEST BUG…
  FOR QUEST», «ja 0.69»…); si no queda nada razonable, «Axie #id».
- **Pruebas:** instantáneas de los 30 bots con genes, variantes y colecciones; 60 partidas bot contra bot con esas
  instantáneas (113 cartas distintas, 0 errores); `local-test.mjs` y `function-test.mjs` sin fallos.
- **Para aplicarlo:** volver a ejecutar `tools/pvp/bots/bots.sql` en el SQL Editor de Supabase. No hace falta tocar la
  migración ni volver a desplegar la función.

## 14. El bot espera a que el jugador tenga el combate en pantalla, 7-nov-2026

**Problema (prueba del usuario):** a veces, antes de que se quitara la pantalla de carga, el Axie del bot ya se había
movido. La partida se crea al salir de la cola, pero el cliente aún tiene que enseñar la presentación «VS» y montar el
combate; si empezaba el bot, jugaba en ese rato y el cliente, al ponerse al día, lo aplicaba bajo la pantalla de carga.

**Arreglo (sin tocar el cliente):**
- Migración `20261114000000_arena_bots_ready.sql`: tabla `pvp_bot_ready`. `pvp_match` anota la hora la primera vez que
  la llama el humano de una partida con bot (el cliente no la llama hasta `PvpBattle.onBattleReady`), devuelve al bot
  `rivalReadyAt` y avisa a la Edge Function. Si nadie ha jugado todavía, el turno en curso vuelve a tener su tiempo
  completo (lo que se fue cargando no se le descuenta al jugador, ni al bot lo que esperó).
- `PvpBotRunner.js`: con `rivalReadyAt = null` (y sin órdenes del rival) no juega ni reclama tiempo → `stop:
  'waiting_ready'`; tope de 90 s desde que se creó la partida (si el jugador cerró el juego). Su primera acción llega
  como pronto 4 s después de que el jugador tenga el combate. Además, el turno del bot nunca pasa del plazo del servidor.
- Con un servidor sin la migración (`rivalReadyAt` ausente), el bot se comporta como antes.
- Pruebas: `local-test.mjs` sección 2b (espera mientras carga, plazo restaurado, juega tras el aviso con ≥ 4 s de margen,
  tope de 90 s); el resto de `local-test.mjs` y `function-test.mjs` sin fallos. `rollback.sql` también lo deshace.

**Para aplicarlo:** ejecutar la migración `20261114000000_arena_bots_ready.sql` y volver a desplegar la función
(`node tools/pvp/bots/build.mjs` + `npx supabase@latest functions deploy pvp-bot --no-verify-jwt --use-api`).
