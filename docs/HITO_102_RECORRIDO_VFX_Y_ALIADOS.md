# Hito 102: Recorrido de todos los VFX y efectos de aliado que caían sobre el lanzador

> **Estado:** en la versión de prueba (29-oct-2026).
> **Pedido:**
> 1. Un método para ejecutar todos los VFX en orden, viendo el nombre de cada uno, para apuntar cuáles necesitan arreglos.
> 2. Algunos VFX lanzados sobre un aliado caían sobre el propio lanzador.

## 1. Recorrido en el juego (`src/tactics/combat/VfxTour.js`)

Abre la arena de pruebas y reproduce los efectos uno tras otro. Las cartas se lanzan por el camino normal del combate (`lkDebug.probar`: daño, estados y VFX); los ataques de enemigos, las Ultimates y los gólems solo reproducen su efecto (`lkDebug.vfxPlay`).

| Consola (F12) | Qué hace |
|---|---|
| `lkDebug.vfxRecorrido()` | Los 387 efectos en orden (abajo) |
| `lkDebug.vfxRecorrido({ clase: 'bestia' })` | Una clase: `planta`, `pajaro`, `reptil`, `bestia`, `bicho`, `acuatico` |
| `lkDebug.vfxRecorrido({ grupo: 'alfa' })` | Un grupo: `cartas`, `alfa`, `ultimates`, `sapidae`, `enemigos`, `golems` |
| `lkDebug.vfxRecorrido({ solo: 'aliado' })` | Solo las cartas que se lanzan sobre un aliado |
| `lkDebug.vfxRecorrido({ desde: 120, d: 3, pausa: 1.5, manual: true })` | Empezar en el n.º 120, a 3 casillas, 1,5 s entre efectos, avance manual |
| `lkDebug.vfxRecorridoLista()` | Tabla con la lista completa y su número |
| `lkDebug.vfxMarcadas()` | Tabla de los marcados; también los copia al portapapeles para pegarlos |
| `lkDebug.vfxMarcadasBorrar()` / `lkDebug.vfxRecorridoParar()` | Vaciar la lista / detener el recorrido |

**Orden:**
1. **Cartas de partes (276):** las 235 por clase (Planta, Pájaro, Reptil, Bestia, Bicho, Acuático) y parte (cuernos, boca, orejas, ojos, espalda, cola). Las cartas de aliado con alcance 0 salen dos veces: sobre un aliado y lanzadas sobre sí mismo.
2. **Cartas α de Bing y Pomodoro (17).**
3. **Las 3 Ultimates de dúo.**
4. **Las 24 habilidades del Sapidae.**
5. **Los 61 ataques de enemigos.**
6. **Los 6 efectos de gólem.**

**Panel en pantalla:**
- número y total;
- clase y parte (o grupo);
- nombre de la carta;
- id, objetivo y distancia;
- módulo del efecto, que indica si es el estilo nuevo o el anterior.

**Teclas:**

| Tecla | Acción |
|---|---|
| Espacio | Pausa / sigue |
| ← → | Anterior / siguiente |
| R | Repetir |
| 1, 2, 4 | Cambiar la distancia y repetir |
| M | Marcar «necesita arreglo»; se escribe una nota y Enter (Esc la guarda sin nota) |
| Esc | Terminar |

Las teclas del recorrido no llegan al juego (no pasan turno ni mueven la cámara). Los marcados se guardan en el navegador (`lunakai_vfx_marcadas`) y no se pierden al recargar.

**En el laboratorio** (`tools/vfx-lab/estilizado.html`):
- **«⏵ Recorrido»:** reproduce en orden todas las opciones del selector, con el efecto actual y el estilizado lado a lado.
- **«⚑ Marcar» y «📋 Marcados»:** guardan y copian la lista.
- **Grupo «Cartas α (como en el combate)»:** `?fx=spell:<id>` reproduce una carta con sus datos reales y deja que el puente elija su efecto, como en el juego.

## 2. Efectos de aliado que caían sobre el lanzador

**Auditoría** (`landing.cjs`, laboratorio con el `VfxBridge` real): cada carta que se lanza sobre un aliado (y las de objetivo «cualquiera») se reproduce con sus datos reales a 1 y 3 casillas, y sobre sí mismo si su alcance mínimo es 0. Para medir dónde cae, se dibuja solo el efecto sobre negro en 4 instantes tras el impacto y se calcula el centro de su brillo en pantalla, que se compara con la posición del lanzador y del receptor. En total, 152 lanzamientos.

**Causas encontradas:**
- **Cartas α con otro objetivo que su carta base.** Cuatro cartas α usaban el efecto de su carta base, que va sobre sí mismo, aunque la α va sobre otro, así que todo el efecto salía en el lanzador:
  - Puppy α de ojos (cura y potencia a un aliado);
  - Puppy α de orejas (daña a un enemigo y cura al equipo);
  - Passion α (cura y limpia a un aliado);
  - Leaf Bug α de orejas (escudo y protección a un aliado).
  
  Ahora tienen efecto propio (`sty_starter_bing_eyes`, `sty_starter_bing_ears`, `sty_starter_pomodoro_eyes`, `sty_starter_pomodoro_ears`), elegido por `STYLE_STARTER_EXTRA` en `VfxBridge.js`.
- **Efectos sin receptor declarado, lanzados sobre sí mismo.** Por ejemplo, Clover: el efecto se quedaba en la casilla de delante. Ahora, si una carta de aliado no declara `receiver` ni aliados, el puente dibuja el receptor en el objetivo. Lanzada sobre sí mismo, eso es la casilla del lanzador; en cartas nuevas tampoco volverá a pasar.

Las demás cartas que la medida marcaba como dudosas (Cuckoo, Sakura, Confident, Tiny Dino) caen bien en la imagen: son efectos grandes que mueven el centro de la medida (el reloj de Cuckoo nace en el lanzador a propósito y la copa del Sakura está sobre el receptor).


## 3. Otros arreglos

- **`lkDebug.vfxPlay`:** con un id que no es carta (Ultimates, gólems, claves `sty_…`), `getSpell` devuelve el Mordisco de quimera, así que se reproducía ese efecto. Ahora solo usa la carta si el id coincide; acepta un cuarto parámetro con la carta (`vfxPlay(id, desde, hasta, carta)`) para las Ultimates.
- **Exportaciones:** `VfxBridge.js` exporta `ENEMY_VFX` y `GOLEM_KIND_MODULE` para el recorrido.

## 4. Comprobado

- **Laboratorio** (Chromium con WebGL por software, `VfxBridge` real):
  - Los 248 efectos estilizados (los 243 del Hito 101, las 4 α nuevas y Leaf Bug α lanzada sobre sí mismo) se construyen y se evalúan sin errores, con `stylized: true` y ninguno de respaldo.
  - En la auditoría de aliados repetida (152 lanzamientos) ningún efecto cae ya en el lanzador; Clover lanzada sobre sí mismo cae en el lanzador.
  - La medida solo señala Cuckoo, cuyo reloj y cuco salen a propósito de los cuernos del lanzador mientras las flores caen en el aliado.
  - Las 4 α nuevas caen a 0,03–0,23 del receptor (fracción de la distancia lanzador–aliado), antes a ~1,0.
- **Recorrido:** lista, panel, marcado con nota y exportación probados en el navegador con un combate simulado.
- **Pendiente en el juego real:** el recorrido completo en la arena con GPU. Es la primera vez que corre sobre el combate de verdad: si una carta no encuentra casilla o lanzador, el recorrido lo avisa en la consola y sigue con la siguiente.

## 5. Archivos

| Archivo | Cambio |
|---|---|
| `src/tactics/combat/VfxTour.js` | Nuevo: el recorrido |
| `src/main.js` | Instala el recorrido junto a la arena de pruebas |
| `src/vfx/VfxBridge.js` | `STYLE_STARTER_EXTRA`, receptor por defecto, `vfxPlay` corregido, exportaciones |
| `src/vfx/modules/mod-estilizado-starter-bing.js`, `mod-estilizado-starter-pomodoro.js` | Los 4 efectos α nuevos |
| `tools/vfx-lab/estilizado.html` | `?fx=spell:<id>`, recorrido, marcar y medida de dónde cae el efecto (`lab.landing`) |
