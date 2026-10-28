# Hito 82: Ataques en el sitio, posición tras ataques, muelle, cartel de pesca, zoom y juego en segundo plano

## 1. Las quimeras ya no dejan al jugador entre dos casillas
**Causa:** el efecto visual del hechizo guardaba la posición de la unidad al empezar. Si un empujón o un arrastre la cambiaba de casilla, al terminar el efecto la devolvía a la posición vieja, a medio camino.

**Arreglo:**
- **`VfxBridge.js`:** cada unidad animada guarda su casilla (`gx`, `gz`). Solo se mueve si sigue en la misma casilla. Al terminar:
  - si sigue en la misma casilla, vuelve a su posición;
  - si cambió, se coloca en el centro de la casilla nueva.
- **`Unit.settleToTile()`:** lleva la unidad al centro de su casilla en 0,15 s, sin saltos. Con la pestaña oculta lo hace al instante.
- **`TurnManager.nextTurn`:** al cambiar de turno, centra a todas las unidades vivas que no se estén moviendo, como red de seguridad.

## 1b. El atacante ataca en su sitio (Hito 82b)
**Problema:** al atacar, el efecto visual deslizaba al atacante hasta media casilla (0,8 m) hacia el objetivo, y el objetivo retrocedía otro tanto. Una quimera quedaba medio encima de la casilla del aliado y luego volvía.

**Arreglo (`VfxBridge.js`):**
- **Atacante:** no se desplaza en horizontal; solo hace su animación en el sitio. Los saltos verticales del efecto se mantienen.
- **Objetivo y aliados del efecto:** retroceden como máximo 0,25 m (`MAX_RECOIL`), siempre en la dirección contraria al atacante.
- **Sin cambios:** las cartas que mueven unidades de verdad (empujes, saltos, teletransportes) no usan este desplazamiento visual.

**Medición en la arena (235 efectos, con el atacante al lado y en diagonal):**

| | Antes | Ahora |
|---|---|---|
| Avance del atacante | hasta 0,8 m | 0 m |
| Retroceso del objetivo | hasta 0,8 m | hasta 0,25 m |
| Distancia mínima entre ellos | 0,63 m | 1,6 m (una casilla) |

Todos los efectos devuelven a las dos unidades a su sitio.

## 2. Muelle junto a Kawa
La entrada está en la arena, a unos 6 m de Kawa, y el muelle entra recto en el mar en la dirección que marcó el usuario, unos 57° respecto a +x. La barca de Kawa queda a su izquierda, sin tocarlo.

| | Antes (Hito 79) | 82 | 82c | Ahora (82d) |
|---|---|---|---|---|
| Extremos | (30, 135) → (30, 151) | (26, 131) → (26, 149) | (41,5, 140,3) → (59,5, 140,3) | (42,7, 138,2) → (52,6, 153,2) |
| Altura del tablero (`level`) | 1,95 m | 1,6 m | 0,8 m | 0,8 m |

**Altura:** la arena junto a Kawa está baja. Con 0,8 m se pasa de la arena (0,9 m) al tablero (0,9–1,2 m) sin escalón.

**Punto de pesca:** está en (51,84, 150,14), cerca de la punta. Se pesca por el costado este, con el corcho en (55,10, 147,80).

**Comprobado en el juego:**
- desde la vista de la captura del usuario, el muelle sale recto hacia arriba desde la orilla;
- se pesca desde el extremo;
- Kawa sigue hablando igual.

## 3. Cartel de pesca
- Los puntos de pesca usan `assets/environment/cartel_fish.glb` en lugar del poste con tablita. Mide 1,45 m de alto y mira hacia el jugador.
- La textura se recomprimió de 520 KB a 265 KB, sin cambio visible.
- Si el modelo no carga, vuelve el poste anterior.

## 4. Punto de pesca de la orilla del puente
Se quitó `fish_forest_2`.

## 5. Roca en (-5,4, -40,6)
**`PropsManager._removeListedProps()`** quita la roca y su colisión.

## 6. Zoom
- **Límites:** de 4 a 22 m (antes de 3,2 a 65 m).
- **Rueda:**
  - mueve un objetivo de distancia, como mucho 2,5 m por paso;
  - la cámara se acerca a ese objetivo de forma suave, sin saltos;
  - funciona igual con ratón, touchpad y rueda por líneas o páginas.

## 7. El juego no se pausa al minimizar
**Decisión:** el combate sigue corriendo con la ventana minimizada. Si el jugador no atiende, el temporizador del turno se agota y la IA sigue atacando, así que puede perder.

**Cambios:**
- **`BackgroundFrames.js`:** con la pestaña oculta, el navegador detiene los fotogramas. Mientras está oculta, los fotogramas se ejecutan con temporizadores.
- **`main.js`:** en combate y con la pestaña oculta, cada fotograma puede avanzar hasta 2 s, para que las animaciones terminen aunque lleguen pocos fotogramas.
- **Sin cambios:**
  - el temporizador del turno ya iba por reloj real;
  - las pausas de la IA ya usaban temporizadores.

**Límite del navegador:** Chrome frena los temporizadores de las pestañas ocultas, a unas 1 vez por segundo, y tras 5 minutos ocultas, a 1 vez por minuto. El combate sigue avanzando, pero más despacio en ese caso.
