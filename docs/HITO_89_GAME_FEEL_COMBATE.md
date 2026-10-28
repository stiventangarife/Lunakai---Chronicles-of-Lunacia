# Hito 89: *Game feel* del combate (fase 4 del plan)

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de probarlo en un combate.
> **Pedido:** fase 4 del plan de sonido y *game feel*: que cada golpe se sienta según su fuerza.

## 1. Temblor de cámara por «trauma»

- **Antes:**
  - un salto al azar en X e Y en cada fotograma, que bajaba ×0,9 por fotograma;
  - por eso temblaba más rato a más FPS, y se veía como vibración nerviosa.
- **Ahora** (`SceneManager`):
  - cada golpe suma **trauma** (0–1);
  - la cámara se mueve con **trauma²**, así que los golpes pequeños apenas mueven y los grandes sí;
  - el movimiento es un ruido suave (dos senos por eje) en X, Y y **un poco de giro** (hasta 1,3°);
  - el trauma baja 1,4 por segundo, igual a cualquier velocidad de fotogramas.
- La llamada `shake(intensidad)` se mantiene, con la misma escala de antes, y respeta Opciones › Accesibilidad (temblor apagado, o la mitad con «Reducir movimiento»).

| Golpe | Desplazamiento máximo | Dura |
|---|---|---|
| Rasguño (0,14) | ~0,04 | ~0,08 s |
| Medio (0,22) | ~0,1 | ~0,23 s |
| Crítico (0,40) | ~0,3 | ~0,4 s |
| Golpe final (0,65) | ~0,4–0,5 | ~0,5 s |

## 2. El temblor depende del daño

- `SpellPresentation` ya no usa valores fijos: el temblor sale de la parte de la vida máxima que quita el golpe.
- Quitar el 40 % de la vida, o más, cuenta como golpe máximo.
- Un rasguño casi no mueve la cámara; un golpe que se lleva media vida sí.

## 3. Pausa de impacto (*hit-stop*)

- Al recibir daño, las unidades se congelan unas centésimas: dejan de avanzar sus animaciones.
- La cámara, el temblor, los efectos y los números siguen moviéndose.
- **Duración:**
  - 35 ms con carta de 1 PA, 62 ms con 2 PA y 90 ms con 3+ PA o Ultimate;
  - +30 ms si es crítico y +50 ms si derriba a la unidad;
  - tope de 160 ms.
- **Implementación:**
  - `SceneManager.hitStop(s)`;
  - `main.js` usa `sceneManager.unitDt(dt)` para las unidades;
  - los desplazamientos por el tablero no se ven afectados, porque van por su propio reloj.

## 4. Barra de vida «fantasma»

- En la barra sobre cada unidad, la vida que se acaba de perder queda **en claro** 0,45 s y luego baja (60 % de la vida máxima por segundo).
- Se ve cuánto quitó el golpe.
- Cada golpe nuevo vuelve a esperar.
- Al curar, la barra sube al momento, sin parte fantasma.
- Solo se redibuja mientras baja.

## 5. Números de daño según el golpe

- `FloatingCombatText.spawn(..., { size })` acepta un tamaño relativo, de 0,7 a 1,45.
- El daño va de **0,85** (rasguño) a **1,3** (golpe que quita el 40 % de la vida o más).
- El crítico suma 0,1.
- Los números grandes también duran un poco más en pantalla.

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/tactics/SceneManager.js` | Trauma (`trauma`, `_shakeOffset`), giro de cámara, `hitStop()`, `unitDt()`. |
| `src/main.js` | Las unidades del combate avanzan con `unitDt(dt)`. |
| `src/tactics/combat/SpellPresentation.js` | Temblor, tamaño de número y pausa de impacto según el daño y el peso de la carta. |
| `src/tactics/FloatingCombatText.js` | Opción `size`. |
| `src/tactics/Unit.js` | Barra fantasma (`_ghostHP`, espera y bajada en `update`). |

## 7. Comprobado

- **Node** (`SceneManager` real):
  - temblor a 60 y 144 fps con la misma duración y amplitud parecida;
  - una pausa de 62,5 ms congela 4 fotogramas a 60 fps;
  - la pausa queda topada a 160 ms.
- **Navegador** (`Unit.updateHUD` y `FloatingCombatText` reales), capturas de la barra:
  - al instante, la parte fantasma completa;
  - a 0,3 s sigue esperando;
  - a 0,6 y 0,9 s va bajando;
  - a 1,4 s alcanza la vida real;
  - con un segundo golpe, vuelve a esperar.
- **Números de daño:** de −8 a −140 crítico, cada uno con su tamaño.

## 8. Pendiente

- Probarlo en combates y ajustar al gusto. Los números que se tocan son:
  - el trauma, ×2,2 en `shake`;
  - la pausa, de 35 a 90 ms;
  - la espera de la barra fantasma, 0,45 s.
- Fase 5 (mundo abierto): aceleración al moverse y cámara que se adelanta un poco en la dirección de la marcha.
