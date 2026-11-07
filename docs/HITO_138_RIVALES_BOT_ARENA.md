# Hito 138: Rivales bot en la Arena PvP

> **Fecha:** 6-nov-2026 · **Plan y detalle de cada fase:** [PLAN_BOTS_ARENA.md](PLAN_BOTS_ARENA.md)

## Qué cambia para el jugador

- Quien busca rival en la Arena y lleva **10 s sin rival humano** juega contra un bot. Si hay otra persona esperando, siempre se emparejan las dos personas.
- Para el jugador, el bot es un rival más: nombre, Sapidae personalizado y Axie; partida por el servidor con reloj, huellas y árbitro; puntos y SLP como siempre; aparece en la clasificación. Los premios de temporada también cuentan para los bots (decisión del 6-nov).
- Los invitados siguen sin acceso a la Arena.

## Cómo funciona

| Pieza | Archivo |
|---|---|
| Cerebro del bot (3 niveles según sus puntos: novato < 950, normal ≤ 1150, fuerte) | `src/tactics/sim/PvpBot.js` |
| «Jugador» del bot: se pone al día, confirma huellas, juega con pausas humanas, reclama el tiempo agotado del rival, informa del final, abre disputas por órdenes ilegales | `src/tactics/sim/PvpBotRunner.js` |
| Servidor: tabla de bots, emparejar con un bot, funciones del bot, avisos (pg_net) y tarea de cada minuto (pg_cron), `rivalPresence`, `pvp_stats` sin bots | `supabase/migrations/20261113000000_arena_bots.sql` |
| Edge Function que juega por los bots | `supabase/functions/pvp-bot/` (motor copiado con `tools/pvp/bots/build.mjs`) |
| Los 30 bots (generados, con semilla fija) | `tools/pvp/bots/seed-bots.mjs` → `tools/pvp/bots/bots.sql` |
| El bot espera a que el jugador tenga el combate en pantalla | `supabase/migrations/20261114000000_arena_bots_ready.sql` |
| Los 27 Axies reales de los bots (genes y cartas resueltas) | `tools/pvp/bots/axies.json` |
| Cliente: sin aviso de «rival desconectado» si `rivalPresence = false` | `src/rpg/arena/PvpSession.js` (3 líneas; original en `backups/2026-11-06_bots_arena/`) |
| Deshacer | `tools/pvp/bots/rollback.sql` |

**Los bots**
- Cada bot es un usuario sin contraseña, con su partida guardada en la ranura 1: nombre, clase, Ema/Kai con personalización al azar, nivel 4–18 y su Axie principal con sus genes y sus cartas reales (variantes de nivel 2 y cartas de colección incluidas). Los 3 bots con menos puntos llevan un Axie inicial, como un jugador recién llegado; los otros 27, uno de los 27 Axies reales de `axies.json` (3 por clase, las 9 clases), repartidos por clase entre todos los tramos de puntos.
- Tienen puntos de base entre 855 y 1295 y una franja horaria de «conexión»: a cualquier hora hay al menos 9 conectados.
- Empiezan sin historial: salen en la clasificación cuando juegan su primera partida.

**Reglas de elección del bot** (`_pvp_pick_bot`)
1. Activo, «conectado» y sin partida abierta.
2. Primero los que todavía puntúan contra ese jugador hoy.
3. Después, los que no fueron su rival en los últimos 20 minutos.
4. Por último, el de puntos más parecidos.

**Sin la Edge Function configurada (`pvp_bot_config` vacía) no entra ningún bot.**

## Pruebas

| Comando | Qué comprueba | Resultado |
|---|---|---|
| `node tools/pvp/bot-test.mjs 300` | órdenes legales en los 7 mapas, final, determinismo, fuerza, tiempo | normal frente a novato 71 %, fuerte frente a normal 55 %, fuerte frente al jugador sencillo 82 %; ~1 ms por turno |
| `node tools/pvp/bots/local-test.mjs` | servidor de punta a punta en PostgreSQL | emparejar, partida completa con puntos y SLP, clasificación, `pvp_stats`, tiempo agotado, orden ilegal, permisos, sin repetir rival, partidas entre personas sin cambios |
| `node --experimental-strip-types tools/pvp/bots/function-test.mjs --real` | la Edge Function en Node contra PostgreSQL | acceso con clave, partida completa, dos avisos a la vez, partidas atascadas, pausas reales (turno de 4 órdenes en ~7 s) |

El usuario lo probó en local el 6-nov.

## Mantenimiento

- **Apagar:** `delete from public.pvp_bot_config;` (no entran en partidas nuevas) o `update public.pvp_bots set active = false;`.
- **Cambios en las reglas del combate:** `node tools/pvp/arbiter/build.mjs` **y** `node tools/pvp/bots/build.mjs`, y desplegar `pvp-arbiter` y `pvp-bot`.
- **Más o distintos bots:** cambiar `seed-bots.mjs` y volver a ejecutar `bots.sql`. Los ids son fijos, así que se actualizan los mismos bots. El nivel usa su propio azar: tocarlo no cambia el resto.
- **Despliegue paso a paso:** `DEPLOYMENT_GUIDE.md` y la sección 11 de `PLAN_BOTS_ARENA.md`.

## Pendiente

- Ajustar con partidas reales: los segundos en la cola (`bot_after_secs`), el ritmo y si los bots de más de 1150 puntos resultan fáciles. Para esto último, búsqueda de 1 jugada del rival.
