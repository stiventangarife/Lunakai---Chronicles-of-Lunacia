# Hito 65 — Casillas de combate: alcance siempre visible y colores más claros

> **Estado:** en la versión de prueba (24-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** que al elegir una habilidad se vean las casillas donde se puede lanzar aunque no haya un enemigo cerca (como en Dofus), y que las casillas de ataque y de movimiento se vean mejor, sin perder rendimiento.

## Antes

- Al elegir una habilidad solo se marcaban las casillas con un objetivo válido. Sin un enemigo cerca, no se veía nada (o solo los aliados en rosa).
- El alcance de movimiento era un azul claro y plano, poco visible sobre las baldosas de arena.
- Cada casilla resaltada era una malla nueva: crearla y borrarla en cada movimiento del ratón generaba trabajo extra.

## Ahora

**Colores (decisión del usuario):**

| Capa | Color | Cuándo sale |
|---|---|---|
| Alcance de movimiento | Azul `#2f7dff` | Turno propio, sin habilidad elegida |
| Camino y casilla destino | Verde `#39e75f` | Al pasar el ratón por una casilla alcanzable (puntos verdes = ruta) |
| Alcance de la habilidad | Rojo `#ff1f3d` | Al elegir una carta: todas las casillas a distancia válida, haya o no objetivo |
| Objetivos válidos | Rojo intenso, con pulso suave | Casillas donde la carta se puede lanzar ahora |
| Sin línea de visión | Gris apagado `#6b5a66` | Dentro del alcance, pero tapadas por un obstáculo |
| Área de efecto | Naranja `#ff9a1f` | Al pasar el ratón por un objetivo válido |

- Baldosa con relleno translúcido, borde nítido y un brillo hacia el borde: se lee bien sobre la piedra azul y sobre la arena.
- Se respetan las reglas de cada carta: alcance mínimo y máximo, cartas en línea, casillas usables y línea de visión. Las cartas sobre uno mismo marcan solo la casilla del lanzador.
- Lanzar sigue igual: solo se lanza en un objetivo válido. Pulsar una casilla roja vacía no gasta PA.
- Tutorial: el paso de ataque marca su casilla permitida como objetivo (rojo con pulso).

## Rendimiento

- Una sola malla instanciada por capa (`InstancedMesh`), creada una vez por combate; repintar solo cambia posiciones y el número de instancias.
- Una textura de baldosa compartida, generada en un canvas una sola vez.
- Repintado completo de alcance y objetivos: **0,022 ms** de media (50 repeticiones).
- Fotogramas con una habilidad elegida y el pulso activo: 60 fps, p50 16,7 ms, p99 16,8 ms, máx. 16,9 ms (3 s medidos). Sin tirones.

## Código

- `tactics/GridManager.js`:
  - `HL_STYLE` (color, opacidad y altura por capa) y `_tileTexture()`;
  - `_hl()` crea las capas instanciadas; `_hlAdd()` añade una casilla; `clearHighlights()` pone los contadores a 0;
  - nuevas `highlightSpellBlocked()` y `highlightSpellTargets()`;
  - `tickHighlights(time)` hace el pulso de objetivos y cursor.
- `tactics/Spells.js`: nueva `getRangeCells(caster, spell)` → `{ range, blocked }` (mismas reglas que `getValidTargetCells`, sin exigir objetivo).
- `main.js`:
  - `spellRangeCells` y `_paintSpellCells()` (sin visión → alcance → objetivos), usados al elegir carta o definitiva y al mover el ratón;
  - casilla destino del movimiento en verde;
  - el bucle principal llama a `gridManager.tickHighlights(time)`.
- `tactics/TutorialManager.js`: el paso de ataque usa `highlightSpellTargets`.

## Pruebas

- Carta de alcance 1–4 sin enemigos cerca: 25 casillas rojas, 1 sin visión, 3 objetivos.
- Carta en cruz (`cross1`): área naranja al pasar por un objetivo.
- Clic en casilla roja vacía: no lanza ni gasta PA. Clic en objetivo válido: lanza (PA 6 → 4) y limpia el alcance.
- Movimiento a 2 casillas: se mueve y repinta el alcance restante.
- Consola: sin errores nuevos (los 404 de imágenes ya existían).

## Nota

Sobre las baldosas de arena, el rojo translúcido se ve algo anaranjado. El área naranja solo sale junto con el cursor dorado, así que se distinguen. Si molesta, se puede subir más la opacidad del alcance.

## Capturas

`cap/antes_movimiento.jpg`, `cap/antes_habilidad.jpg`, `cap/despues_movimiento.jpg`, `cap/despues_habilidad_sin_enemigo.jpg`, `cap/despues_area_naranja.jpg`, `cap/despues_balista_alcance4.jpg`.
