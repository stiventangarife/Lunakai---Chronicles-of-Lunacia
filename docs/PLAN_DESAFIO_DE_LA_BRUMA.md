# Plan: Desafío de la Bruma (Koliseo)

> **Estado:** plan (3-nov-2026, revisado el mismo día). No hay código escrito. Investigación general y comparación de arquitecturas en `PLAN_KOLISEO_PVP_Y_DESAFIO_DE_LA_BRUMA.md`.
> **Decisiones del usuario:**
> - escuadrón completo;
> - vida llena en cada combate, y se puede reequipar entre combates;
> - **un solo bioma por semana**, con los 5 combates en sus tableros;
> - dificultad creciente hasta **×3** de vida, daño y escudo;
> - **2 intentos por semana**;
> - clasificación por **combates superados** y después **menos turnos**;
> - **premios solo para el top 3** (bAXS, menos que en el PvP, más Esquirla lunar, Ámbar de Atia y oro);
> - experiencia sí, botín normal no;
> - invitados sin clasificar;
> - **sin edificio en el mapa:** el Koliseo se abre con un botón del HUD y desde el Maestro Paladill.
> **Orden:** es el primer modo que se construye. Monta el Koliseo y la base común (temporadas, clasificaciones y premios) que luego usa el PvP.

---

## Estado de las fases

| Fase | Estado |
|---|---|
| **B0 · Servidor** | **Hecha (3-nov-2026).** Migración `supabase/migrations/20261104000001_koliseo_bruma.sql`. Probada en PostgreSQL 16 local con las 20 migraciones del proyecto (ver «Pruebas de B0» al final). Falta aplicarla en Supabase. |
| **B1 · Koliseo** | **Hecha (3-nov-2026).** Botón del HUD, opción en el diálogo de Paladill y panel con 3 pestañas (ver sección 9). |
| **B2 · Intento y combates** | **Hecha (3-nov-2026).** Empezar o continuar intento, combates con grupos del bioma sembrados y ×1 → ×3, informe al servidor, vuelta al panel con el resultado, preparación entre combates, invitado local. Atajos: **K** Koliseo, **T** Escuadrón (ver sección 10). |
| **B3 · Jefe, modificadores y retratos** | **Hecha (4-nov-2026).** El combate 5 es siempre el **Slime Caballero** con el Rastro de Miasma; `thick_mist` y `icy_wind` ya actúan en combate; retratos de los enemigos en cada tarjeta. Genesis conserva su dificultad (decisión: que se note más difícil y obligue a subir de nivel). Ver sección 11. |
| **B4 · Premios** | **Hecha (4-nov-2026).** Entrega en dos pasos de los premios del top 3 (materiales a la partida sin perderlos ni duplicarlos), tarjeta de recompensa, saldo actualizado. Ajustes del panel: retratos sin marco y centrados, «Daño ×N». Ver sección 12. Migración `20261105000000_koliseo_rewards.sql` aplicada en Supabase (4-nov-2026). |
| **B5 · Pruebas y documentación** | **Hecha (4-nov-2026).** Migraciones desde cero, dos semanas simuladas, flujo completo en Chrome y corrección de los escoltas del jefe. Documento del hito: `docs/HITO_122_KOLISEO_DESAFIO_DE_LA_BRUMA.md`. Ver sección 13. |

Decisiones finales: 2 intentos por **cuenta**; la primera semana es la del **Bosque**.

## 1. Reglas del modo

| Regla | Valor |
|---|---|
| Semana | Lunes 00:00 a domingo 23:59 (hora de Colombia, UTC−5). Igual para todos los jugadores. |
| Bioma de la semana | Uno solo, en rotación fija: Bosque → Sabana → Ártico → Mística → Genesis → Bosque… Así la escena de combate se carga una vez y no hace falta traer los 15 mapas. |
| Escuadrón | Sapidae + hasta 3 Axies (la Escuadra del jugador), con su equipo, runas y charms reales. |
| Combates | 5, en orden. Cada uno empieza con la vida llena. |
| Derrotas | Perder un combate gasta una «vida» y se repite **ese mismo combate**. Con **2 derrotas** el intento termina con los combates superados hasta ese momento. |
| Entre combates | Pantalla de preparación del Koliseo: Mochila, Escuadra, runas y charms abiertos para reequipar. |
| Intentos | 2 por semana **por cuenta** (no por ranura: con 3 ranuras serían 6). Un intento se gasta al empezarlo. |
| Pausa | Se puede salir a mitad de un intento y seguir otro día de la misma semana. Al cerrar la semana, el intento cuenta con lo que tenga. |
| Recompensa por combate | **Experiencia sí, botín normal no** (ni objetos ni oro de combate), para que no sea la mejor forma de farmear. |
| Ultimate | Permitida, como en el resto del juego (es contra la IA). |
| Invitados | Juegan la misma semana con la misma configuración. Sin clasificación ni premios; los intentos se cuentan solo en el navegador. |

### Tableros y grupos: todo del mismo bioma

Cada bioma tiene 3 tableros, uno de ellos de jefe (`boss: true` en `BattleMaps.js`):

| Combate | Tablero | Grupo |
|---|---|---|
| 1 | Normal A del bioma | Grupo del bioma (la semilla elige cuál) |
| 2 | Normal B | Otro grupo del bioma |
| 3 | Normal A | Grupo del bioma |
| 4 | Normal B | El grupo más fuerte del bioma (sin el jefe) |
| 5 | **Tablero de jefe** | **Jefe del bioma** (o el grupo más duro si el bioma no tiene jefe propio) |

| Bioma | Tableros normales | Tablero de jefe |
|---|---|---|
| Bosque | Claro de Arces (`forest_maple_glade`), Vado del Río (`forest_river_ford`) | Raíces del Gran Árbol (`forest_great_roots`) |
| Sabana | Oasis Escondido (`savannah_oasis`), Cañón de Arenisca (`savannah_canyon`) | Meseta Dorada (`savannah_golden_mesa`) |
| Ártico | Paso Glaciar (`arctic_glacier_pass`), Campamento Boreal (`arctic_boreal_camp`) | Lago Helado (`arctic_frozen_lake`) |
| Mística | Pantano Luminoso (`mystic_glow_swamp`), Islas de Cristal (`mystic_crystal_isles`) | Círculo Arcano (`mystic_arcane_circle`) |
| Genesis | Jardín Real (`genesis_royal_garden`), Puerta del Santuario (`genesis_sanctum_gate`) | Santuario del Origen (`genesis_sanctum_origin`) |

### Dificultad: hasta ×3

Multiplicadores fijos e iguales para todos, así la clasificación compara contra los mismos enemigos:

| Combate | Vida enemiga | Daño enemigo | Escudo inicial enemigo |
|---|---|---|---|
| 1 | ×1,0 | ×1,0 | ×1,0 |
| 2 | ×1,5 | ×1,5 | ×1,5 |
| 3 | ×2,0 | ×2,0 | ×2,0 |
| 4 | ×2,5 | ×2,5 | ×2,5 |
| 5 | **×3,0** | **×3,0** | **×3,0** |

- La vida y el escudo multiplican los valores del grupo (`maxHP`, `initialShield`). El daño usa `damageMult`, que ya existe (Slime Caballero del Hito 120, `Spells._applyDamageModifiers`).
- Las cifras viven en un solo archivo de datos (`KOLISEO_BRUMA` en un catálogo nuevo) y se ajustan con `CombatTelemetry` tras la primera semana.
- En los biomas altos (Mística, Genesis) el ×3 puede ser excesivo: la curva puede bajar por bioma sin tocar el código.

### Modificador semanal («la bruma»)

Uno por semana, elegido con la semilla. Para el primer lanzamiento solo los que el motor ya sabe aplicar:

| Modificador | Efecto | Cómo se aplica |
|---|---|---|
| Bruma espesa | −1 AL para todas las unidades (mínimo 1) | Ajuste del alcance de las cartas al empezar el combate |
| Furia de la bruma | Enemigos +15 % de daño (se suma al multiplicador del combate) | `damageMult` |
| Coraza de niebla | Enemigos empiezan con +40 de escudo | `initialShield` |
| Viento helado | Todas las unidades −1 PM en la ronda 1 | Estado al empezar el combate (`StatusSystem`) |

## 2. Clasificación

- **Orden:**
  1. Combates superados (más es mejor).
  2. Turnos totales del intento (menos es mejor). Cuentan las rondas de **todos** los combates jugados, también los perdidos: perder sale caro.
  3. Desempate: quien terminó antes.
- **Por jugador:** su **mejor** intento de la semana.
- **Pantalla:** los **10 primeros** y, si estás fuera, **tu puesto** debajo (igual que en el PvP). Pestaña «Semana pasada» con los 3 premiados.
- **Nombre visible:** el de la ranura (Sapidae) y su Axie principal (retrato con `portraitService.axieUrl`).

## 3. Premios (solo top 3, al cerrar la semana)

| Puesto | bAXS | Esquirla lunar | Ámbar de Atia | Oro |
|---|---|---|---|---|
| 1 | 10 | 3 | 3 | 1000 |
| 2 | 6 | 2 | 2 | 600 |
| 3 | 4 | 1 | 1 | 300 |

- **bAXS:** menos que el PvP (30 / 20 / 15), unos 20 por semana. En un mes, unos 80, frente a los 110 por temporada del PvP.
- **Materiales:** `mat_lunar_shard` y `mat_amber_atia`, los dos de rareza mística. Evolucionar una pieza a Tier 3 pide 2 de ámbar y 1 esquirla, así que el premio del primer puesto da para una evolución.
- **bAXS y oro:** se pagan en la cartera del servidor (`_econ_apply`, como el resto de la economía).
- **Materiales:** viven en la partida, no en el servidor. Se dejan como premio pendiente en `koliseo_rewards` y la partida los recoge al entrar, con la tarjeta de recompensa (`RewardCard`).
- **Requisito:** haber superado al menos 1 combate. Solo cuentas con Sky Mavis.

## 4. Servidor (Supabase)

**Tablas:**

| Tabla | Contenido |
|---|---|
| `bruma_weeks` | `week` (p. ej. `2026-W45`), `biome`, `seed`, `config` (5 combates: tablero, grupo, multiplicadores; modificador), `starts_at`, `ends_at`, `closed` |
| `bruma_runs` | `id`, `week`, `user_id`, `slot_id`, `attempt` (1–2), `status` (`active`, `finished`, `out`), `cleared`, `turns`, `defeats`, `started_at`, `finished_at` |
| `bruma_battles` | `run_id`, `stage` (1–5), `try` (1–3), `result`, `rounds`, `started_at`, `ended_at`, `actions` (jsonb, para el árbitro futuro) |
| `koliseo_rewards` | Premios pendientes por usuario y ranura: `source`, `items`, `claimed_at` (el bAXS y el oro se pagan al momento) |

**Funciones** (`security definer`, igual que la economía; nadie escribe directamente en las tablas):

| Función | Quién | Qué hace |
|---|---|---|
| `bruma_week()` | `anon` y `authenticated` | Configuración de la semana actual. La crea la primera vez a partir del bioma de la rotación y la semilla de la semana. |
| `bruma_start(slot)` | Con cuenta | Comprueba que quedan intentos, crea el intento y devuelve su id. |
| `bruma_stage_begin(run, stage)` | Con cuenta | Anota el inicio del combate y devuelve un *token* del combate. |
| `bruma_report(run, stage, token, result, rounds, actions)` | Con cuenta | Guarda el resultado y actualiza `cleared`, `turns` y `defeats`. Con 2 derrotas o 5 combates, cierra el intento. |
| `bruma_board(week)` | Todos | Los 10 primeros y tu puesto. |
| `koliseo_claim(slot)` | Con cuenta | Entrega los premios pendientes. |

- **Cierre de semana:** tarea `pg_cron` el lunes a las 00:05. Cierra los intentos abiertos, calcula los puestos, paga bAXS y oro al top 3, escribe sus materiales en `koliseo_rewards` y crea la semana siguiente.
- **Antitrampas, paso 1** (sin árbitro todavía):
  - la configuración la pone el servidor;
  - el *token* de cada combate es de un solo uso;
  - duración mínima creíble (≥ 15 s por ronda informada), rondas ≥ 2 y nunca más combates de los que tiene la semana.
  - Las órdenes se guardan desde el primer día (`actions`).
  - Como solo premia al top 3, esos tres intentos se pueden revisar a mano antes del pago si algo llama la atención.
- **Antitrampas, paso 2:** con el motor sin gráficos del plan del PvP, la Edge Function árbitro repite los combates del top 10 antes de pagar. La IA no usa azar y las reglas usan la semilla, así que los combates son repetibles.

## 5. Cliente

| Pieza | Qué | Dónde (propuesta) |
|---|---|---|
| **Botón del Koliseo** | Botón redondo en el menú de abajo a la derecha (icono `tournament.png`), como el de feedback. Disponible al terminar el tutorial. Sin edificio en el mapa. | `OverworldManager._createOverworldHUDDOM` |
| **Maestro Paladill** | Opción nueva en su diálogo, «Koliseo», que abre el mismo panel. | `NPCManager` / diálogo de Paladill (`i18n/npc`) |
| Panel del Koliseo | Ventana del sistema de diseño con 3 pestañas: Arena (por ahora «Próximamente»), Desafío de la Bruma, Clasificación | `ui/KoliseoPanel.js` (nuevo) |
| Pestaña Bruma | Semana y cuenta atrás, bioma y modificador, los 5 combates (tablero, retratos de enemigos, multiplicador, estado), intentos restantes, mejor marca y botón «Empezar intento» / «Siguiente combate» | `ui/KoliseoPanel.js` |
| Preparación entre combates | Botones a Mochila, Escuadra y Runas sin salir del panel | Reutiliza `InventoryModal`, `SquadModal`, `RunesCharmsPanel` |
| Combate | `startKoliseoBattle(stage)`: genera el encuentro con la semilla y los multiplicadores, usa el tablero fijado y aplica el modificador | `rpg/KoliseoService.js` (nuevo) + `DynamicCombatFactory` (aceptar `rng` y multiplicadores; hoy usa `Math.random` para botín y obstáculos) |
| Fin de combate | Pantalla propia: «Combate 3/5 superado · 7 rondas», vidas restantes, experiencia ganada y botón para volver a la preparación (sin botín) | `CombatEndScreen` (variante `koliseo`) |
| Datos del servidor | `KoliseoService` habla con las funciones; los invitados reciben la configuración y guardan su progreso en `localStorage` | `rpg/KoliseoService.js` |
| Textos | Módulo `koliseo` en los dos idiomas | `i18n/{es,en}/koliseo.js` |

- **Derrota en la Bruma:** no te manda al altar de Atia; vuelves al panel del Koliseo.
- **Mundo abierto:** los mobs y el respawn no cambian.

## 6. Fases y estimación

| Fase | Contenido | Días |
|---|---|---|
| B0 | Tablas y funciones (semana con rotación de bioma, intentos, informes, clasificación, premios, `pg_cron`) y pruebas en PostgreSQL local, como en el Hito 121 | 1,5–2 |
| B1 | Koliseo: botón del HUD, opción en el diálogo de Paladill y panel con pestañas | 0,5–1 |
| B2 | Pestaña Bruma, preparación entre combates y flujo de 5 combates con 2 vidas | 1,5–2 |
| B3 | Generación de los combates del bioma con la semilla, multiplicadores ×1 a ×3, tableros fijados y los 4 modificadores | 1–1,5 |
| B4 | Clasificación (top 10 + tu puesto), premios del top 3 y su recogida, modo invitado | 1 |
| B5 | Pruebas completas (navegador sin interfaz, dos semanas simuladas) y documentación del hito | 0,5–1 |
| **Total** | | **≈ 6–8,5 días** |

## 7. Decisiones

Todas tomadas: intentos por cuenta; primera semana en el Bosque.

## 8. Fase B0: servidor (hecha)

**Archivo:** `supabase/migrations/20261104000001_koliseo_bruma.sql`

| Pieza | Qué hace |
|---|---|
| `bruma_settings()` | Todos los números en un sitio: zona horaria, intentos, derrotas, curva ×1 → ×3, orden de tableros y rangos, biomas, modificadores, mínimo de 8 s por ronda, máximo de 200 rondas, tamaño de la clasificación y premios. |
| `bruma_biomes` | Los 3 tableros de cada bioma. |
| `bruma_weeks` | Una fila por semana: `ord` decide el bioma (0 = Bosque); `config` = modificador + 5 combates `{stage, map, rank, mult, pick}`. `pick` es un número 0–9999 con el que el cliente elige el grupo del bioma (fase B3). |
| `bruma_runs` / `bruma_battles` | Intentos y combates; cada combate tiene un *token* de un solo uso y guarda `actions` para el árbitro futuro. |
| `koliseo_rewards` | Materiales pendientes de recoger. |
| `bruma_week()` (invitados y cuentas) | Semana actual: la crea si no existe y, al crearla, cierra y paga la anterior. Con sesión añade `me: { used, left, active, best }`. |
| `bruma_start(slot)` | Empieza o reanuda el intento. Errores: `no_attempts`, `run_in_other_slot`. |
| `bruma_stage_begin(run)` | Token del combate actual, su configuración, el modificador, el bioma y la semilla. Un combate anterior sin informar cuenta como derrota (`abandoned: true`; puede devolver `run_over`). Error `week_over` si la semana terminó. |
| `bruma_report(run, token, 'win'\|'loss', rondas, órdenes)` | Aplica el resultado. Informe repetido igual → `replay`. Errores: `too_fast` (menos de 8 s por ronda), `bad_rounds`, `already_reported`, `too_big`, `run_over`, `week_over`. |
| `bruma_board(week?)` (invitados y cuentas) | Los 10 primeros `{rank, name, axie{name,class,axieId}, cleared, turns, status, me}` y `me` si estás fuera del top. Nombre = `playerName` de la ranura en la nube. |
| `koliseo_claim(slot)` | Devuelve los premios pendientes y los marca recogidos. |
| Cierre | `_bruma_close_week` (idempotente): cierra los intentos abiertos, marca abandonados los combates sin informar, paga bAXS y oro al top 3 (`economy_ledger`, `idem = bruma:<semana>`) y deja los materiales en `koliseo_rewards`. Lo lanzan `bruma_week` al abrir la semana nueva y, si existe, `pg_cron` (`lunakai-bruma-close`, lunes 05:05 UTC). |

**Aplicar:** `supabase db push`. Si `pg_cron` no está activado en el proyecto, la migración lo avisa y sigue: la semana se cierra igualmente la primera vez que alguien abre el Koliseo el lunes.

### Pruebas de B0 (PostgreSQL 16 local, todas las migraciones en orden)

- **Semana:**
  - el invitado la lee: 2026-W45, Bosque, lunes 2 → lunes 9 de noviembre (Colombia);
  - tableros A, B, A, B y jefe con ×1 a ×3;
  - el invitado no puede empezar (`permission denied`).
- **Un jugador:**
  - empezar, reanudar y otra ranura (`run_in_other_slot`);
  - informe instantáneo → `too_fast`;
  - informe repetido igual → `replay`; distinto → `already_reported`;
  - abandono → derrota; segunda derrota → `out`;
  - segundo intento; tercer intento con el segundo abierto → se reanuda.
- **Clasificación con 15 jugadores:**
  - el orden es el esperado: combates, luego rondas;
  - el puesto 11 sale en `me`;
  - el anónimo ve la lista sin `me`.
- **Cambio de semana simulado:**
  - un invitado abre el Koliseo → se crea la W45 de la **Sabana** y se cierra la W44;
  - top 3 pagado (10/6/4 bAXS, 1000/600/300 de oro) en el libro;
  - intentos abiertos cerrados y combate a medias → `abandon`;
  - repetir el cierre no paga dos veces;
  - premios recogidos una sola vez; 2 intentos nuevos;
  - el intento viejo ya no se puede seguir (`run_over`).

## 9. Fase B1: Koliseo (hecha)

| Pieza | Qué hace | Dónde |
|---|---|---|
| Servicio | `koliseoService.week({force})` (caché de 30 s, ajuste de hora con el servidor), `board(week?)`, `previousWeekId(starts_at)`, `serverNow()`. Con cuenta manda el token; el invitado, solo la clave pública. Consola: `lunakaiKoliseo`. | `src/rpg/KoliseoService.js` (nuevo) |
| Panel | `KoliseoPanel` (`open(tab)`, `close()`, `toggle()`, `isOpen`, `onStartRun`). | `src/ui/KoliseoPanel.js` (nuevo) |
| Pestaña Arena PvP | «Próximamente» con las reglas acordadas. | |
| Pestaña Desafío de la Bruma | Bioma, semana y cuenta atrás; modificador; los 5 combates (tablero, multiplicador, Élite y Jefe, superado o siguiente si hay intento); intentos, mejor marca e intento en curso; reglas y premios. | |
| Botón «Empezar intento / Continuar intento» | Se activa cuando la fase B2 conecte `onStartRun`; hasta entonces sale desactivado con el aviso «se abren en la próxima actualización». | |
| Pestaña Clasificación | Esta semana / Semana pasada, los 10 primeros con medallas, tu fila marcada y, si estás fuera, «⋯» y tu puesto; tabla de premios del top 3. | |
| Sin conexión | Sin datos: aviso y «Reintentar». Con datos anteriores: los muestra con el aviso «puede que no estén al día». | |
| Botón del HUD | `#btn-open-koliseo` (icono `tournament.png`) entre Mapa y Feedback; desactivado durante el tutorial (`UNLOCK_AT.koliseo = 'done'`). | `OverworldManager._createOverworldHUDDOM`, `TutorialDirector._updateHUDButtonsState` |
| `om.toggleKoliseo(tab)` | No se abre en combate, con diálogo, en la cinemática ni encima de otra ventana; durante el tutorial muestra «Termina tu entrenamiento…». Cuenta en `isAnyModalOpen()` y Esc lo cierra. | `OverworldManager.js` |
| Paladill | Tras el tutorial, su diálogo ofrece «Llévame al Koliseo» (junto al duelo de entrenamiento) y abre la pestaña de la Bruma. | `TutorialDirector._offerTraining` |
| Textos | Módulo `koliseo` (es/en). Los biomas usan `hud.biome*`, y los tableros, `name` / `nameEs` de `BattleMaps.js`. | `src/i18n/{es,en}/koliseo.js` |
| Estilos | Bloque «Koliseo, fase B1» al final; ventana ajustada al contenido (520–680 px); 5 combates en fila (3 por fila por debajo de 900 px); compacto por debajo de 720 px de alto. | `src/ui/lunakai-ui.css` |

**Pruebas** (Chrome sin interfaz con el servidor simulado):
- **Invitado:** 5 combates con los nombres reales de los tableros, cuenta atrás, modificador, aviso de invitado y botón desactivado.
- **Cuenta:** envía su token; muestra intentos, mejor marca, intento en curso (combates 1–2 superados, 3 siguiente) y el botón «Continuar intento».
- **Clasificación:** 10 filas y el puesto 37 aparte; «Semana pasada» pide la 2026-W44 y muestra «No hubo Desafío…».
- **Sin red:** con datos previos y desde cero; reintento correcto.
- **Pantalla:** a 1024×600 el botón se ve sin desplazar.
- **Consola:** sin errores.

## 10. Fase B2: intento y combates (hecha)

| Pieza | Qué hace | Dónde |
|---|---|---|
| Combates | `buildBrumaPack` / `buildBrumaEncounter`: grupo del bioma con azar sembrado (Mulberry32 con la semilla de la semana, el número del combate y su `pick`), igual para todos. Normal 2–3 enemigos, Élite 3 con líder fuerte, Jefe 3 con el jefe del bioma (`BRUMA_LEADERS`). Vida y escudo ×mult, daño con `damageMult`; `mist_fury` (+15 % daño) y `fog_armor` (+40 escudo) ya se aplican. Tablero fijado por el servidor. Sin botín (`rewardItems: []`), con experiencia, vida llena (`noPersistentHP`). | `src/rpg/koliseo/BrumaEncounter.js` (nuevo) |
| Catálogo | `generatePackForBiome(biome, zona, líder, { rng, size })`: azar y tamaño opcionales; sin ellos funciona como antes. | `rpg/world/BiomeEnemyCatalog.js` |
| Generador | `createEncounter({ battleMapId })` usa ese tablero en lugar de uno al azar. | `tactics/DynamicCombatFactory.js` |
| Flujo | `KoliseoRun`: `start()` (bruma_start + bruma_stage_begin → combate `kol_bruma_<n>`), `onBattleEnd({win, rounds})` (informe), `onReturn()` (panel con el resultado), `prep('bag'\|'squad'\|'runes')` (abre la ventana y vuelve al Koliseo al cerrarla). | `src/rpg/koliseo/KoliseoRun.js` (nuevo) |
| Servicio | `startRun`, `beginStage`, `reportStage`, `flushPending`. Sin red, el informe queda en `localStorage` (`lunakai_bruma_pending_v1`) y se reenvía antes del siguiente combate (si no, el servidor lo contaría como abandono). Invitado: el mismo flujo en `lunakai_bruma_guest_v1` (2 intentos, 2 derrotas, abandono = derrota). | `rpg/KoliseoService.js` |
| Panel | Botón «Empezar / Continuar intento» activo, mensaje del resultado (verde, ámbar, rojo), fila «Prepárate para el siguiente combate» con Mochila, Escuadra y Runas, y progreso del invitado. | `ui/KoliseoPanel.js` |
| Combate | Victoria y derrota informan con `turnManager.round`; sin baya, runas, charms ni oro; derrota sin pérdida de vínculo ni «botín perdido»; «Reintentar» devuelve al mundo (un combate solo se empieza desde el panel). | `main.js` |
| Vuelta | `_returnFromKoliseo`: el jugador aparece donde estaba, sin altar de Atia, sin avanzar misiones por zona ni tocar monstruos del mapa. | `OverworldManager.js` |
| Atajos | **K** abre o cierra el Koliseo; el Escuadrón pasa a la **T** (botón, guía del tutorial, textos de la Mochila, del Escuadrón y del tutorial y lista de Controles en Opciones). | `OverworldManager.js`, `TutorialDirector.js`, `SettingsModal.js`, `i18n/{es,en}/{inventory,squad,tutorialDirector}.js` |

**Pruebas:**
- **Node:**
  - la misma semilla da el mismo grupo;
  - ×1, ×1,5 y ×3 se aplican a vida y escudo;
  - el combate 5 usa el tablero de jefe con su jefe;
  - sin botín, con experiencia y vida llena.
- **Chrome con el servidor simulado:**
  - empezar → combate 1 (Bosque, +40 de escudo por `fog_armor`);
  - victoria → mensaje y combate 2 «Siguiente»;
  - Mochila → al cerrarla vuelve el Koliseo;
  - derrota → «Te queda 1 vida»;
  - sin red → pendiente, reenviado antes del siguiente combate;
  - segunda derrota → «Intento terminado»;
  - invitado: flujo completo y abandono = derrota;
  - sin errores en la consola.
- **Sin probar:** dentro del juego completo.

---

## 11. Fase B3: jefe, modificadores y retratos (hecha)

**Decisiones (4-nov-2026):**
- Las migraciones de B0 y del feedback ya están aplicadas en Supabase.
- La curva de Genesis no se toca: es la semana más dura a propósito, para que haya que subir de nivel.
- El combate 5 tenía poca dificultad: el jefe pasa a ser siempre el **Slime Caballero** (modelo `treant-flower`, id histórico `treant_flower`) con la mecánica **Rastro de Miasma** del jefe del tutorial.

| Pieza | Qué hace | Dónde |
|---|---|---|
| Jefe del combate 5 | `BRUMA_BOSS = 'treant_flower'` en los 5 biomas. Cuerpo de jefe (`BRUMA_BOSS_BODY`) sobre los valores del bioma y antes del ×3: vida ×1,6, 6 PA, 3 PM, escala 1,5 y `mechanic: 'miasma'`. Escoltas: 2 del bioma, sembradas. | `rpg/koliseo/BrumaEncounter.js` |
| Rastro de Miasma | Al final del turno del jefe, las casillas de los héroes quedan envenenadas 3 rondas; quien termina su turno en una pierde el 50 % de su vida máxima (motor existente: `Spells._placeMiasma`). Hay que moverse cada turno. | `tactics/Spells.js` (sin cambios), `main.js` pasa `mechanic` |
| `thick_mist` (Bruma espesa) | −1 de alcance máximo a las cartas a distancia (alcance > 1) de **todas** las unidades, mínimo 1. Las de cuerpo a cuerpo no cambian (misma regla que el estado «Alcance −»). | `Spells.battleMods.range` → `getEffectiveMaxRange` |
| `icy_wind` (Viento helado) | −1 PM a todas las unidades en sus turnos de la ronda 1, con texto flotante «Viento helado −1 PM». Se aplica después de estados y runas para que no se deshaga. | `Spells.battleMods.firstRoundPM` → `_applyBattleModsTurnStart` |
| Activación | `main._startBattleBody` fija `spellManager.battleMods` en **cada** combate desde `config.koliseo.modifier` (fuera del Koliseo quedan a 0, así no se arrastran). | `main.js` |
| Retratos | Cada tarjeta muestra los retratos del grupo (`assets/portraits/<modelo>.png`), calculados con la misma semilla que el combate real (`buildBrumaPack`): lo que se ve es lo que te encontrarás. El jefe va primero, más grande y con aro dorado; su texto explica el Miasma. Los combates superados se ven en gris. | `ui/KoliseoPanel.js` (`_foesHtml`), CSS «Koliseo, fase B3» |

**Vida del jefe con ×3 (semilla de prueba):** Bosque ~1490 · Sabana ~2010 · Ártico ~3125 · Mística ~3870 · Genesis ~4910.

**Pruebas:**
- **Node:**
  - el combate 5 de los 5 biomas da el Slime Caballero con `miasma`, 6 PA y 3 PM, y la misma semilla repite el grupo;
  - las escoltas cambian con la semilla;
  - `thick_mist`: alcance 5 → 4, 2 → 2 (mínimo), cuerpo a cuerpo 1 → 1;
  - `icy_wind`: 3 PM → 2 en la ronda 1 y 3 en la ronda 2.
- **Chrome (panel con servidor simulado):** retratos en las 5 tarjetas, jefe marcado en el combate 5, sin errores en la consola.
- **Sin probar:** el combate completo dentro del juego (miasma con ×3 y los dos modificadores en partida real).

---

## 12. Fase B4: premios del top 3 (hecha)

**Problema de B0:** `koliseo_claim` marcaba el premio como cobrado antes de que la partida guardara los materiales; si el juego se cerraba en medio, se perdían. El bAXS y el oro no tienen ese riesgo: se pagan en la cartera del servidor al cerrar la semana.

**Entrega en dos pasos** (migración `supabase/migrations/20261105000000_koliseo_rewards.sql`):

| Paso | Qué pasa |
|---|---|
| 1. `koliseo_pending(slot)` | Cierra las semanas terminadas (`bruma_close_due`) y devuelve los premios sin cobrar de esa partida: `{ id, week, biome, rank, items, gold, baxs }`. |
| 2. Partida | Los materiales van a la bolsa de la Forja y el id del premio a `slot.forge.kolClaimed`, en el mismo guardado; luego se sube a la nube (`cloud.flush`). |
| 3. `koliseo_ack(slot, ids)` | Solo si la nube confirmó el guardado: marca como cobrados esos ids (solo los de la cuenta y la partida). Va en segundo plano para no retrasar la tarjeta. |

- Si el paso 3 falla, el premio vuelve a salir la próxima vez, pero su id ya está en la partida: no se suma otra vez, solo se repite el ack.
- Si el guardado en la nube falla, no se hace ack.
- `koliseo_claim(smallint)` sigue en la base de datos, pero el juego ya no lo usa.

**Cliente:**

| Pieza | Qué hace | Dónde |
|---|---|---|
| Servicio | `pendingRewards(slot)`, `ackRewards(slot, ids)` (solo cuentas). | `rpg/KoliseoService.js` |
| Entrega | `KoliseoRewards.check({ force })`: una comprobación a la vez, como mucho cada 60 s salvo `force`. Espera a un momento tranquilo (fuera de combate, cinemáticas y diálogos) y enseña una tarjeta de recompensa por premio (materiales, oro y bAXS, con semana y bioma). Después pide el saldo nuevo a la Economía. | `rpg/koliseo/KoliseoRewards.js` (nuevo) |
| Cuándo | Al cargar la partida (después de `EconomyService.sync`) y cada vez que se abre el Koliseo. | `main.js`, `OverworldManager.toggleKoliseo` |

**Ajustes del panel (pedidos tras B3):**
- Retratos sin marco, centrados y uno al lado del otro; el jefe, un poco más grande y con brillo dorado.
- «Enemigos ×N» pasa a «Daño ×N»; al pasar el ratón se explica que el ×N también es de vida y escudo.

**Pruebas:**
- **PostgreSQL 16 local:**
  - `koliseo_pending` da solo los premios de la cuenta y la partida y cierra las semanas terminadas;
  - `koliseo_ack` con ids de otras cuentas solo marca los propios; repetirlo marca 0;
  - `anon` no puede llamar a las funciones.
- **Chrome con el servidor simulado:**
  - premio del 1.er puesto → tarjeta (3 Esquirlas, 3 Ámbar, 1000 de oro, 10 bAXS), materiales sumados una vez y guardado;
  - ack sin red → la siguiente comprobación no suma otra vez y repite el ack;
  - sin pendientes → nada;
  - nube sin guardar → se suma, sin ack;
  - panel con los retratos nuevos y «Daño ×N»; sin errores en la consola.
- **Sin probar:** en el Supabase real (migración ya aplicada; falta que se cierre una semana con premios).

---

## 13. Fase B5: pruebas completas y documentación (hecha)

- **Servidor:** las 17 migraciones del proyecto aplicadas desde cero en PostgreSQL 16 y dos semanas simuladas con 8 cuentas: rotación Bosque → Sabana → Ártico, intentos y derrotas, mejor intento por cuenta, cierre con pago al top 3, abandono de un combate sin informar, cierre idempotente, premios por cuenta y partida con `koliseo_pending` y `koliseo_ack`.
- **Cliente:** flujo completo de B2, los 5 biomas × combates 1, 4 y 5 × modificadores, panel y premios en Chrome sin interfaz; modificadores y grupos sembrados en Node. Sin errores en la consola.
- **Corrección:** en el combate 5 ningún escolta repite el modelo del jefe (`BrumaEncounter.buildBrumaPack`): en el Ártico salían Slimes Caballero sin miasma junto al jefe.
- **Versión:** `GAME_VERSION` 0.5.0.
- **Resultados detallados:** `docs/HITO_122_KOLISEO_DESAFIO_DE_LA_BRUMA.md`, sección 4.
- **Migraciones:** todas aplicadas en Supabase (4-nov-2026).
- **Pendiente fuera del código:** jugar una semana real (cierre del domingo y `pg_cron`).

---

## 14. Revisión de memoria y rendimiento (4-nov-2026)

- **Fin de combate (afecta también al jefe del tutorial):** el Rastro de Miasma seguía vivo en el mundo abierto. Sus marcas y su bucle de animación (`requestAnimationFrame` a 60 fps) solo se quitaban al empezar el combate siguiente, y las zonas guardaban referencias a unidades ya liberadas. Ahora `_returnToOverworld` llama a `spellManager.releaseBattle()`, que vacía las zonas, quita las marcas, cancela el bucle y deja a 0 los modificadores del Koliseo. Geometrías y materiales del miasma son compartidos y se reutilizan: no se liberan.
- **Panel:** una respuesta vieja de la semana ya no pisa a una nueva (revisión de carga); los retratos se calculan una vez por semana y combate (caché que se vacía al cambiar la semana), no en cada repintado.
- **Clasificación:** caché de 30 s (10 min para semanas cerradas); cambiar de pestaña o de semana ya no repite la petición. Se vacía al informar un combate.
- **Preparación:** el sondeo que reabre el Koliseo al cerrar la Mochila o la Escuadra tiene tope de 15 min, se para al entrar en combate y se cancela al empezar otro combate.
- **Premios:** la tarjeta ya no puede salir encima de un combate. Espera un momento tranquilo hasta 30 min y, si no llega o cambia la partida, no se enseña (los materiales ya están guardados).
- **Pruebas:** abrir y cerrar el panel 120 veces con cambios de pestaña deja los nodos del DOM estables (122), 0 intervalos vivos y un solo panel; con 2 peticiones de semana y 2 de clasificación. Carga lenta seguida de una rápida: gana la rápida. El sondeo de preparación se apaga al cerrar la ventana y al cancelarlo. `releaseBattle` y `clearZoneDecals` en Node: cancela el bucle, quita las marcas y vacía las zonas. Las pruebas anteriores (flujo completo, premios, 5 biomas) siguen pasando sin errores.
- **Revisado sin cambios:** `BrumaEncounter` es puro (sin escena ni DOM); el panel es una sola instancia, con un listener delegado y su intervalo de la cuenta atrás solo con el panel abierto; las unidades del combate ya se liberan en `_returnToOverworld` (`u.dispose()`); el precalentado del miasma usa materiales compartidos.
