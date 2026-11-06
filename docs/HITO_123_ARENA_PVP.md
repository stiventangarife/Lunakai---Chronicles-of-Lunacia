# Hito 123: Arena PvP

> **Estado:** programado el 4-nov-2026 en 7 fases (P0–P6). Probado en Node, en Chrome sin interfaz (dos navegadores contra PostgreSQL 16 y un Supabase simulado) y por el usuario con **dos cuentas reales** en Supabase (partida completa correcta). Las migraciones de la Arena están aplicadas y el árbitro desplegado.
> **Pedido:** dentro del Koliseo, duelos 1 contra 1 entre jugadores con su Sapidae y su Axie principal, temporadas con clasificación y premios, al estilo de Dofus.
> **Plan y detalle por fase:** `docs/PLAN_ARENA_PVP.md` (secciones 11–17). Investigación (Colyseus o Supabase): `docs/PLAN_KOLISEO_PVP_Y_DESAFIO_DE_LA_BRUMA.md`.
> **Reglas respetadas:** sin bundlers; textos por `i18n.t()` en español e inglés; sin assets nuevos (`ASSET_VERSION` no cambia); el modo historia no cambia; `GAME_VERSION` se queda en **0.5.0**; el *client secret* de Sky Mavis y la clave del árbitro solo en los secretos de Supabase.

## 1. Cómo se juega

| Regla | Valor |
|---|---|
| Equipos | Sapidae + Axie principal, **igualados**: nivel 10 (todo desbloqueado), sin atributos repartidos, equipo, runas, charms ni Ultimate. Cuentan la clase del Sapidae y las 6 cartas del Axie (con sus variantes). |
| Tableros | 7 mapas simétricos (giro de 180°): Claro de Arces, Jardín Real y 5 versiones espejo (Oasis, Cañón, Paso Glaciar, Campamento Boreal, Pantano Luminoso). Cada jugador se ve abajo; el bando B mira desde el otro lado. |
| Turnos | 45 s (+5 de margen) con la hora del servidor. 3 turnos agotados seguidos = derrota por abandono; sin jugar 3 min = abandono. 25 rondas como máximo: gana quien conserva más vida en %. |
| Cola | «Buscar rival» con ±100 puntos, ampliándose 100 cada 15 s hasta cualquiera a los 60 s. Mientras está abierta la ventana del Koliseo. |
| Puntos | Elo (K 32 las 20 primeras partidas, luego 24; +10 mínimo al ganar, −30 máximo al perder). Contra el mismo rival puntúan 3 partidas al día. |
| SLP | 15 por victoria, hasta 10 victorias con SLP al día. |
| Temporada | Un mes (hora de Colombia). Al cerrarse, bAXS al top 10 (30, 20, 15, 10, 10, 5, 5, 5, 5, 5). |
| Acceso | Solo con cuenta de Sky Mavis. Los invitados ven la explicación y la clasificación. |

## 2. Cómo funciona por dentro

```
Cliente A ──pvp_act()──▶ Supabase (turno, número, tiempo, forma) ──Realtime──▶ Cliente B
   │  mismo motor y misma semilla en los dos: cada fin de turno lleva la huella del estado; el rival la confirma
   └── final de los dos iguales → puntos y SLP · disputa o un solo informe → árbitro (Edge Function con el motor)
```

| Fase | Qué se hizo | Dónde |
|---|---|---|
| P0 Motor sin gráficos | Reglas separadas del dibujo (`SpellRules`, `GridRules`, `UnitRules`, `GolemRules`), `LogicUnit`, `HeadlessCombat`, semilla, huella del estado, repeticiones. Idéntico al combate del juego, en Chrome y en Node. | `src/tactics/sim/` |
| P1 Servidor | Temporadas, puntos, cola, partidas, órdenes, tiempo agotado, rendición, Elo, SLP, cierre de temporada. | `20261106000000_arena_pvp.sql` |
| P2 Tiempo real | Avisos por Realtime, presencia, abandono, cliente Phoenix propio, servicio y sesión de partida (reconexión, resync). | `20261106000001_arena_realtime.sql`, `src/net/RealtimeClient.js`, `src/net/PvpService.js`, `src/rpg/arena/PvpSession.js` |
| P3 La Arena en el juego | Equipos igualados y perspectiva (`PvpRoster`), combate del juego como motor de la sesión (`PvpBattle`), pestaña Arena, «¡Rival encontrado!», barra del combate, pantalla final, clasificación Arena/Bruma, puesta al día sin animaciones al recargar. | `20261107000000_arena_snapshot_visuals.sql`, `src/rpg/arena/`, `src/ui/PvpHud.js`, `src/ui/KoliseoPanel.js`, `src/main.js` |
| P4 Árbitro | Repite las órdenes guardadas y decide: el que hace trampa (fuera de turno, jugada ilegal, huella falsa, final inventado, disputa sin motivo) pierde; si no, vale el final del motor; sin pruebas, se anula. | `20261108000000_arena_arbiter.sql`, `src/tactics/sim/PvpArbiter.js`, `supabase/functions/pvp-arbiter/` |
| P5 Tableros justos | Salidas equivalentes para los dos bandos y versiones espejo de los mapas; medidas y partidas simuladas por mapa. | `20261109000000_arena_maps.sql`, `src/tactics/maps/BattleMaps.js`, `tools/pvp/map-fairness.mjs`, `tools/pvp/mirror-map.mjs` |
| P6 Pruebas reales, equilibrio y cierre | Retratos propios de cada Sapidae en el orden de turnos; estudio de equilibrio (`balance.mjs`) y estadísticas de las partidas reales (`pvp_stats`); esta documentación. | `20261110000000_arena_stats.sql`, `tools/pvp/balance.mjs` |

## 3. Corrección de P6: retratos de los Sapidae

En la prueba con dos cuentas, los dos Sapidae salían con el **mismo retrato** en el orden de turnos (el del jugador): el orden busca el retrato por el modelo (`sapidae-m-a`…) y ese nombre lo ocupa el retrato personalizado del Sapidae del jugador. Ahora, en la Arena, cada Sapidae tiene el suyo, hecho en segundo plano con su modelo y su personalización (`PvpBattle.sapidaePortrait`, sin tocar los alias del retrato del jugador; `getSapidaeCustomPortrait(…, { aliases: [] })`); mientras se hace, sale su inicial. Lo usan el orden de turnos y el panel de la unidad activa (`main._unitPortrait`).

## 4. Equilibrio (P6)

`node tools/pvp/balance.mjs 6000`: 6000 partidas en los 7 mapas con equipos al azar (clase del Sapidae, clase del Axie y una carta por parte), cada pareja dos veces cambiando de bando. Con el jugador automático de las pruebas, que es sencillo:

| Medida | Resultado |
|---|---|
| Gana quien juega primero | 44,6 % (no hay ventaja por empezar) |
| Empates / final por rondas | 5,1 % / 21,8 %; 9,6 rondas de media |
| Sapidae | Lunalogist 55 %, Stargazer 49 %, Crafter 48 %, Shepard 48 % |
| Axie | **Reptile 59 %**, Plant 50 %, Bird 49 %, Beast 48 %, Aquatic 48 %, Bug 46 % |
| Cartas | De 73 % (Beech, Toothless Bite) a 32 % (Neo, Bidens): elegir bien las partes importa, como debe ser. |

**Decisión: no se cambian las reglas todavía.** El jugador automático no planea ni usa bien gólems, zonas o empujes, y favorece a los equipos que aguantan y pegan en línea recta (Reptile, Lunalogist). Si las partidas reales lo confirman (`pvp_stats`: más de ~200 partidas y una clase por encima del 56 %), el ajuste se hace solo para la Arena en `PvpRoster` (vida o iniciativa por clase), sin tocar el modo historia, y después se vuelve a desplegar el árbitro.

**Estadísticas reales:** en el SQL Editor, `select jsonb_pretty(public.pvp_stats(30));` resume los últimos 30 días: partidas, motivos de final, bando A/B, quién empezó, cada mapa (victorias A/B, primero, órdenes y minutos), cada clase de Sapidae y de Axie (con % de victorias) y las faltas del árbitro. Solo para el equipo.

## 5. Puesta en marcha y mantenimiento

| Qué | Cómo |
|---|---|
| Migraciones | Las 6 de la Arena en orden: `20261106000000` … `20261110000000` (lista en `DEPLOYMENT_GUIDE.md`, «Koliseo y Arena PvP»). |
| Árbitro | Secreto `PVP_ARBITER_KEY`; `node tools/pvp/arbiter/build.mjs`; `npx supabase@latest functions deploy pvp-arbiter --no-verify-jwt --use-api`; extensiones pg_net y pg_cron; fila de `pvp_arbiter_config` y tarea `lunakai_pvp_arbiter`. Paso a paso: plan, sección 15. |
| Cambiar reglas del combate | `node tools/pvp/sim-test.mjs`, `tools/pvp/parity.html`, `tools/pvp/pvp-battle.html`, `node tools/pvp/arbiter-test.mjs`; **después** `node tools/pvp/arbiter/build.mjs` y volver a desplegar el árbitro (si no, repetiría las partidas con reglas viejas; `--check` lo avisa). Mejor sin partidas en curso. |
| Reglas que no se pueden romper | El azar de las reglas solo por `spellManager.rng`; nada de `Math.random`, `Date.now` o `setTimeout` que cambie un resultado; reglas simétricas entre equipos (nada de `team === 'player'` en las reglas); el orden de las unidades es parte de las reglas. |
| Mapas nuevos para la Arena | `node tools/pvp/mirror-map.mjs <id>` → pegar en `BattleMaps.js` con `pvp: true` → `node tools/battle-maps/check-maps.mjs` → `node tools/pvp/map-fairness.mjs 1600 --maps <id>` → añadir a la lista de `pvp_settings()` con una migración nueva (y desplegar el juego antes). |
| Ver qué decide el árbitro | `select id, status, winner, reason, arbiter->>'culprit', arbiter->>'fault' from pvp_matches where arbiter is not null order by ended_at desc;` |

## 6. Pruebas

| Prueba | Qué comprueba |
|---|---|
| `node tools/pvp/sim-test.mjs` | Determinismo (40 partidas × 100 repeticiones), árbitro básico, fin forzado, perspectivas A y B iguales orden a orden, lista de mapas del servidor simétrica. |
| `tools/pvp/parity.html`, `tools/pvp/pvp-battle.html` | El combate del juego (con VFX, esperas y puesta al día) da las mismas huellas que el motor sin gráficos. |
| `node tools/pvp/arbiter-test.mjs` | 13 tipos de partida (limpias y con trampa) por partida al azar. |
| `node --experimental-strip-types tools/pvp/arbiter/local-test.mjs` | La Edge Function en Node contra PostgreSQL con partidas creadas por las funciones reales. |
| `tools/pvp/local/two-players-p3.cjs [full\|reload\|resync\|arbiter\|surrender]` | Dos Chrome con el combate del juego contra PostgreSQL y el Supabase simulado. |
| `node tools/pvp/map-fairness.mjs`, `node tools/pvp/balance.mjs` | Justicia de los tableros y equilibrio de clases y cartas. |
| Prueba del usuario (4-nov-2026) | Dos cuentas reales en Supabase: partida completa correcta; encontró el retrato repetido de los Sapidae (corregido en P6). |

## 7. Pendiente

- Comprobar las variantes de nivel 2 (+20 %) contra Sky Mavis al entrar en la cola, si aparecen abusos (hoy el servidor solo acepta variantes con un id coherente sobre una carta base real).
- Revisar con las partidas reales el equilibrio de clases (Reptile y Lunalogist en la simulación) y los 3 tableros que quedaron fuera (Puerta del Santuario, Islas de Cristal, Vado del Río).
- Revisión de partidas por muestreo (hoy el árbitro solo mira disputas e informes solitarios).
