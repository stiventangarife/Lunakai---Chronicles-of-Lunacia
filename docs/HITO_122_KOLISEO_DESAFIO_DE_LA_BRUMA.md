# Hito 122: Koliseo · Desafío de la Bruma

> **Estado:** programado del 3 al 4-nov-2026 en 6 fases (B0–B5). Servidor probado en PostgreSQL 16 con las 17 migraciones del proyecto aplicadas desde cero y dos semanas simuladas. Cliente probado en Chrome sin interfaz con el servidor simulado y en Node. Las dos migraciones del Koliseo están aplicadas en Supabase (4-nov-2026); **falta jugar una semana completa en el juego real**.
> **Pedido:** dentro de un apartado «Koliseo» (junto a la futura Arena PvP), un reto semanal para un jugador: 5 combates contra grupos de enemigos, 2 derrotas y fuera, clasificación y premios para los mejores.
> **Plan y detalle por fase:** `docs/PLAN_DESAFIO_DE_LA_BRUMA.md` (secciones 8–13). Investigación: `docs/PLAN_KOLISEO_PVP_Y_DESAFIO_DE_LA_BRUMA.md`. Arena PvP (siguiente): `docs/PLAN_ARENA_PVP.md`.
> **Reglas respetadas:** sin bundlers; textos por `i18n.t()` en español e inglés; sin assets nuevos (los retratos ya existían, `ASSET_VERSION` no cambia); `GAME_VERSION` sube a **0.5.0**.

## 1. Reglas del modo (decisiones del usuario)

| Regla | Valor |
|---|---|
| Semana | Lunes 00:00 a domingo 23:59 (hora de Colombia). Un bioma por semana en rotación: Bosque → Sabana → Ártico → Mística → Genesis (la primera, el Bosque). |
| Combates | 5, en los tableros de ese bioma (A, B, A, B, jefe). Enemigos con daño, vida y escudo ×1 · ×1,5 · ×2 · ×2,5 · ×3. |
| Combate 5 | Siempre el **Slime Caballero** con el Rastro de Miasma (envenena las casillas de los héroes), más 2 escoltas del bioma. Genesis conserva su dificultad: es la semana más dura a propósito. |
| Modificador | Uno por semana: Bruma espesa (−1 alcance), Furia de la bruma (+15 % daño enemigo), Coraza de niebla (+40 escudo enemigo), Viento helado (−1 PM en la ronda 1). |
| Escuadra | Completa; vida llena en cada combate; se puede reequipar entre combates (Mochila, Escuadra, Runas). |
| Intentos | 2 por semana y por cuenta; 2 derrotas terminan el intento. Un combate empezado y sin informar cuenta como derrota. |
| Recompensas | Experiencia sí, botín no. Sin pérdida de vínculo al perder. |
| Clasificación | Combates superados y, a igualdad, menos rondas. Top 10 y tu puesto. |
| Premios (solo top 3) | 1.º 10 bAXS, 3 Esquirlas lunares, 3 Ámbar de Atia, 1000 de oro · 2.º 6 / 2 / 2 / 600 · 3.º 4 / 1 / 1 / 300. |
| Invitados | Juegan con el mismo flujo en su navegador, sin clasificar. |
| Acceso | Botón del HUD (tecla **K**) o el diálogo de Paladill. Se desbloquea al terminar el tutorial. El Escuadrón pasa a la tecla **T**. |

## 2. Servidor

| Migración | Contenido |
|---|---|
| `20261104000001_koliseo_bruma.sql` (B0) | `bruma_settings()` con todos los números · tablas `bruma_biomes`, `bruma_weeks`, `bruma_runs`, `bruma_battles` (token por combate), `koliseo_rewards` · `bruma_week`, `bruma_start`, `bruma_stage_begin`, `bruma_report`, `bruma_board`, `koliseo_claim` (ya sin uso) · cierre de semana `_bruma_close_week` (paga bAXS y oro en la cartera y deja los materiales pendientes; idempotente) al abrir la semana siguiente y con `pg_cron` si existe. |
| `20261105000000_koliseo_rewards.sql` (B4) | `koliseo_pending(slot)` (cierra semanas vencidas y lista premios sin cobrar) y `koliseo_ack(slot, ids)` (los marca como cobrados). |

Todas las funciones son `security definer`; las tablas tienen RLS sin políticas. El jugador nunca dice quién es: lo decide `auth.uid()`.

## 3. Cliente

| Pieza | Dónde |
|---|---|
| Datos y RPC (semana, clasificación, intento, informes pendientes sin red, invitado local, premios) | `src/rpg/KoliseoService.js` |
| Panel con 3 pestañas (Arena próximamente · Bruma · Clasificación), tarjetas de los 5 combates con retratos de sus enemigos, preparación entre combates, mensajes del resultado | `src/ui/KoliseoPanel.js`, CSS «Koliseo» en `src/ui/lunakai-ui.css` |
| Flujo del intento (empezar, combate, informe, vuelta al panel, preparación) | `src/rpg/koliseo/KoliseoRun.js` |
| Combates sembrados (mismo grupo para todos), multiplicadores, jefe con miasma, modificadores de enemigos | `src/rpg/koliseo/BrumaEncounter.js` |
| Modificadores que afectan a todas las unidades (`Spells.battleMods`: alcance y PM de la ronda 1) | `src/tactics/Spells.js`, `src/main.js` |
| Entrega de premios en dos pasos (sin perder ni duplicar materiales) y tarjeta de recompensa | `src/rpg/koliseo/KoliseoRewards.js` |
| Vuelta del combate al sitio del jugador, sin misiones por zona ni altar (`_returnFromKoliseo`, ids `kol_…`) | `src/rpg/OverworldManager.js` |
| Textos (módulo `koliseo`) | `src/i18n/{es,en}/koliseo.js` |

**Regla para futuros cambios:** todo combate del Koliseo lleva un id que empieza por `kol_` (si no, avanzaría misiones por zona) y `config.koliseo` (sin botín, vida llena, modificadores).

## 4. Pruebas de B5 (4-nov-2026)

**PostgreSQL 16, base de datos nueva:** las 17 migraciones del proyecto se aplican en orden sin errores. Dos semanas simuladas con 8 cuentas (el cierre se simula moviendo la semana al pasado):

| Comprobación | Resultado |
|---|---|
| Rotación | Semana 1 Bosque (ord 0) → semana 2 Sabana (ord 1) → semana 3 Ártico (ord 2). Curva ×1 → ×3. |
| Intentos | 2 por cuenta; el 3.º da `no_attempts`; con un intento abierto en la partida 1, la partida 2 da `run_in_other_slot`; en la semana nueva vuelven a ser 2. |
| Derrotas | 2 derrotas → `out`; 5/5 → `finished`; el mejor intento de la cuenta es el que cuenta (U2 mejora de 15 a 10 rondas). |
| Clasificación | 5/5 en 10 · 5/5 en 20 · 5/5 en 25 · 4/5 · 1/5 · 0/5; también la de una semana pasada. |
| Cierre | Paga al top 3 en la cartera (100 + 1000 de oro y 10 bAXS al 1.º; 6 y 4 bAXS al 2.º y 3.º); cuenta como abandono un combate sin informar; repetirlo no vuelve a pagar (`already`). |
| Premios | `koliseo_pending` da solo los de la cuenta y la partida (la partida 2 de U8 gana en la semana 2 y su partida 1 no ve nada); `koliseo_ack` los marca y desaparecen; un jugador con premios de dos semanas los recibe juntos. 6 premios creados, 1 cobrado en la prueba. |

**Chrome sin interfaz (servidor simulado):**
- Flujo completo de B2: empezar → combate 1 → victoria → Mochila y vuelta al Koliseo → derrota («te queda 1 vida») → informe sin red guardado y reenviado antes del siguiente combate → segunda derrota → intento terminado; invitado completo y abandono = derrota.
- Los 5 biomas × combates 1, 4 y 5 × modificadores: jefe Slime Caballero con `miasma` en el combate 5, ×1,15 con Furia de la bruma, +40 de escudo con Coraza de niebla, sin botín, vida llena, tablero del servidor.
- Panel: retratos sin marco y centrados, «Daño ×N», etiqueta en la fila del daño, estado con icono.
- Premios: tarjeta, materiales sumados una sola vez, ack repetido sin duplicar, sin ack si la nube no guardó.
- Sin errores en la consola.

**Node:** el mismo grupo con la misma semilla; Bruma espesa (alcance 5 → 4, mínimo 1, cuerpo a cuerpo sin cambios); Viento helado (3 → 2 PM solo en la ronda 1).

**Corrección de B5:** en el combate 5, ningún escolta repite el modelo del jefe (en el Ártico salían Slimes Caballero sin miasma junto al jefe y se confundían con él).

**Sin probar:** una semana real en Supabase (cierre de domingo a lunes y `pg_cron`) y los combates jugados en el juego completo con el miasma ×3.

## 5. Revisión de memoria y rendimiento

- **Fin de combate (afecta también al jefe del tutorial):** el Rastro de Miasma seguía vivo en el mundo abierto. Sus marcas y su bucle de animación (`requestAnimationFrame` a 60 fps) solo se quitaban al empezar el combate siguiente, y las zonas guardaban referencias a unidades ya liberadas. Ahora `_returnToOverworld` llama a `spellManager.releaseBattle()`, que vacía las zonas, quita las marcas, cancela el bucle y deja a 0 los modificadores del Koliseo. Geometrías y materiales del miasma son compartidos y se reutilizan: no se liberan.
- **Panel:** una respuesta vieja de la semana ya no pisa a una nueva (revisión de carga); los retratos se calculan una vez por semana y combate (caché que se vacía al cambiar la semana), no en cada repintado.
- **Clasificación:** caché de 30 s (10 min para semanas cerradas); cambiar de pestaña o de semana ya no repite la petición. Se vacía al informar un combate.
- **Preparación:** el sondeo que reabre el Koliseo al cerrar la Mochila o la Escuadra tiene tope de 15 min, se para al entrar en combate y se cancela al empezar otro combate.
- **Premios:** la tarjeta ya no puede salir encima de un combate. Espera un momento tranquilo hasta 30 min y, si no llega o cambia la partida, no se enseña (los materiales ya están guardados).
- **Pruebas:** abrir y cerrar el panel 120 veces con cambios de pestaña deja los nodos del DOM estables (122), 0 intervalos vivos y un solo panel; con 2 peticiones de semana y 2 de clasificación. Carga lenta seguida de una rápida: gana la rápida. El sondeo de preparación se apaga al cerrar la ventana y al cancelarlo. `releaseBattle` y `clearZoneDecals` en Node: cancela el bucle, quita las marcas y vacía las zonas. Las pruebas anteriores (flujo completo, premios, 5 biomas) siguen pasando sin errores.
- **Revisado sin cambios:** `BrumaEncounter` es puro (sin escena ni DOM); el panel es una sola instancia, con un listener delegado y su intervalo de la cuenta atrás solo con el panel abierto; las unidades del combate ya se liberan en `_returnToOverworld` (`u.dispose()`); el precalentado del miasma usa materiales compartidos.

## 6. Siguiente

Arena PvP, fases P0–P6 de `docs/PLAN_ARENA_PVP.md` (arena igualada, temporada mensual, 25 rondas, Supabase con lockstep y árbitro).
