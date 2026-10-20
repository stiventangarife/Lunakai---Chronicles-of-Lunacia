# Hito 39 — Vínculo equilibrado, cartas de partes en los menús, pelo blanco, fuego amigo y fin de combate limpio

> **Estado:** completado en la versión de prueba (18-oct-2026).
> **Pedido:** revisar y mejorar cinco puntos encontrados al jugar. Solo se cambió lo pedido.

## 1. Vínculo

| | Antes | Ahora |
| --- | --- | --- |
| Acariciar (cada 2 min) | +5 % | +5 % |
| Mandarina lunar | +10 % | **+3 %** |
| Pastelito de arroz | +15 % | **+5 %** |
| Festín de Lunacia | +25 % | **+8 %** |
| Caminar juntos (cada 500 m) | +2 % | **+0,5 %** |
| Jugando sin cuidados | — | **−1 % cada 10 min de juego** si en esos 10 min no comió ni recibió caricias |
| Sin jugar | — | **−5 % por día** con el juego cerrado (proporcional: 12 h = −2,5 %) |

- El vínculo admite décimas (63,5 %) y se muestra con coma.
- **Nunca baja de 0 %.**
- **A quién afecta la bajada:** al Axie compañero, el que recibe los cuidados. Su vínculo es el que habilita la Duo Ultimate, y la Ultimate sigue pidiendo el 100 % exacto: un 99,5 % no basta.
- **Cómo se calcula el tiempo:**
  - El tiempo de juego cuenta con la partida abierta, en el mundo abierto o en combate.
  - La «última vez jugado» se guarda en la ranura (`slot.axieCare.lastSeenAt`), también al cerrar u ocultar la pestaña.
  - Al cargar la partida se aplica la bajada por los días sin jugar.
- **Partidas nuevas o antiguas sin ese dato:** no pierden nada la primera vez.
- Archivos:
  - `src/rpg/BondService.js`: décimas y `formatBond`.
  - `src/rpg/AxieCareService.js`: `startSession()`, `tickPlay()` y nuevos valores.
  - `src/ui/AxieCarePanel.js`: cuenta el tiempo y muestra los textos.
  - `src/tactics/ItemDatabase.js`: comida.
  - `src/main.js`: llamada a `startSession` al cargar.
  - Formato en `SquadHUD.js`, `UltimateButton.js` y `CombatEndScreen.js`.
  - `UltimateSystem.js`: ya no redondea el 99,5 % a 100 %.

## 2. Cartas de partes en el selector de compañero y en la Mochila

**Antes:** el selector del principio y la pestaña Habilidades mostraban la lista antigua del Axie (Fierce Strike, Knockback Rush…). Esa lista solo se usa en el tutorial; en combate el Axie usa las 6 cartas de sus partes.

**Ahora:**
- Los dos muestran las **6 cartas de partes** del Axie, las mismas del combate (`AxiePartsResolver`), con nombre, coste, alcance, daño y descripción. La ficha flotante usa los datos reales de la carta.
- Mientras se consultan las partes (la primera vez, a Sky Mavis o por los genes) se ve «Cargando cartas…». Si no se pueden resolver, se muestra la lista de siempre, que es la que el combate usaría.
- Al mejorar una carta en la Mochila, la mejora se aplica en combate, porque el nivel se guarda con el id de la carta.
- Archivos: `src/rpg/ui/StartScreenUI.js` (`_ccAxieSkills`) y `src/rpg/ui/InventoryModal.js` (`_partCardIds`).

## 3. Pelo blanco para los colores personalizados

**Antes:** el color elegido se multiplicaba por la textura del pelo. Los modelos A la tienen pintada de rojo oscuro (femenino) o naranja (masculino, que además tiñe el pelo con colores de vértice), así que un azul o un rubio salían oscuros o mezclados.

**Ahora:**
- Al elegir un color, el pelo usa una **versión blanca de su propia textura**, calculada en el juego: escala de grises normalizada, con sus sombras y mechones. También se apagan los colores de vértice del pelo.
- Con «Original» vuelve todo como estaba.
- Funciona en los 10 modelos sin tocar los archivos `.glb`. La textura blanca se calcula una vez por modelo.
- Archivo: `src/rpg/SapidaeModularController.js` (`whiteHairTexture`, `_setHairWhiteMap`).

## 4. Fuego amigo completo

- **Los ataques se pueden lanzar sobre cualquier unidad**, también un aliado (nunca sobre uno mismo).
- **Las áreas alcanzan a todos los que estén dentro**, aliados o enemigos. Esto vale para:
  - el daño;
  - los empujes y las atracciones;
  - los estados negativos;
  - quitar potenciadores;
  - robar PA o PM.
- **El lanzador nunca se daña a sí mismo** con su propio ataque.
- **Curas, escudos y potenciadores siguen siendo solo para aliados.** Lo que un ataque da a quien lo lanza (escudo, curación propia) no cambia.
- **Provocación:** solo obliga a apuntar a un enemigo provocador, no a un aliado.
- **La previsión de daño** ya muestra el daño a los aliados que estén en el área.
- **IA enemiga:**
  - no elige como objetivo principal a uno de los suyos;
  - penaliza las áreas que alcanzan a sus aliados;
  - no usa ataques con estados negativos sobre sus aliados.
- Archivos: `src/tactics/combat/EffectResolver.js`, `src/tactics/Spells.js` y `src/tactics/TacticalAI.js`.

## 5. Fin de combate limpio

En cuanto termina el combate, antes del cartel de **VICTORIA** o **DERROTA**, se retira toda la UI de combate:
- la cabecera, la barra de hechizos y de turnos, la Ultimate y los controles de cámara;
- el registro de combate, el aviso de turno enemigo, la previsión y las fichas flotantes;
- las marcas del tablero, las barras de vida sobre las unidades y los textos flotantes.

El tablero deja de responder al ratón. Reintentar o pasar al siguiente nivel vuelve a mostrar la UI.
- Archivo: `src/main.js` (`_cleanCombatUIForEnd`).

## Pruebas

- **Vínculo:**
  - paseo de 50 → 50,5 → 51 %;
  - comida +3, +5 y +8;
  - 25 min de juego sin cuidados: 60 → 58 %;
  - tras una caricia no baja en los 10 min siguientes;
  - 36 h sin jugar: −7,5 %;
  - nunca baja de 0 %.
- **Fuego amigo:**
  - un área sobre un enemigo daña también al aliado de al lado y no al lanzador;
  - un ataque directo puede apuntar a un aliado y le hace daño;
  - una cura no puede apuntar a un enemigo.
- **Combates de IA contra IA en los 15 mapas:** todos terminan sin errores, y la IA no dañó a ninguno de los suyos en ningún combate.
- **Cartas de partes:** el selector y la Mochila pasan de «Cargando cartas…» a las 6 cartas de partes. Si no se pueden resolver, muestran la lista de siempre.
- **Pelo:** comparación de los 4 modelos (femenino y masculino, A y C) con azul, amarillo, rosa y verde, antes y después.

## Pendiente

- Probar en partida real el ritmo del vínculo y ajustar las cifras si hace falta. Están al principio de `AxieCareService.js` y en `ItemDatabase.js`.
