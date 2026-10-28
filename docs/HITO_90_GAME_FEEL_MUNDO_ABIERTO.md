# Hito 90: *Game feel* del mundo abierto (fase 5 del plan)

> **Estado:** en la versión de prueba (27-oct-2026), pendiente de probarlo caminando por las islas.
> **Pedido:** fase 5 del plan: que moverse por el mundo se sienta más natural.

## 1. Inercia corta al moverse (`PlayerController`)

- **Antes:** el Sapidae pasaba de 0 a 6,8 m/s en un fotograma y se paraba en seco.
- **Ahora** la velocidad se acerca a la deseada de forma suave (exponencial, igual a cualquier FPS):

| | Valor | Resultado |
|---|---|---|
| Arrancar | 16/s | 90 % de la velocidad en ~0,15 s |
| Soltar las teclas | 22/s | Frena en ~0,23 s, deslizando ~0,25 m |
| Dar media vuelta | 26/s | Empieza a volver al instante |

- Es corta a propósito: el control sigue siendo preciso (un MMO táctico no debe sentirse «resbaladizo»).
- **Contra una pared:** la velocidad no se acumula; se queda con lo que de verdad se movió.
- **Animación:** correr mientras hay velocidad y reposo en el último tramo del frenado.
- **Se pone a cero:** al desactivar el control (diálogos, menús, cinemáticas) y en `resetInputs`.

## 2. Cámara que se adelanta (`OverworldCamera`)

- **Comportamiento:**
  - la cámara mira un poco por delante de donde camina el jugador: 0,18 s de su velocidad, hasta ~1,2 m (tope de 1,4 m);
  - así se ve más de lo que viene;
  - al parar, vuelve despacio al personaje.
- **Suavizado:** el adelanto se suaviza aparte (2,2/s), más despacio que el seguimiento de la cámara, para que no dé tirones al girar.
- **Cuándo se aplica:**
  - solo cuando la cámara sigue al jugador; durante la pesca sigue al Axie y no hay adelanto;
  - solo con una velocidad reciente, así que al recolectar no se queda adelantada;
  - al hacer `snapToTarget` (teletransporte, cambio de isla) el adelanto vuelve a cero.
- **Accesibilidad:** con **«Reducir movimiento»** (Opciones › Accesibilidad) no hay adelanto.

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/rpg/PlayerController.js` | `velocity`, `accel`, `decel` y `reverse`; movimiento con inercia y colisiones que frenan. |
| `src/rpg/OverworldCamera.js` | `lookAhead` (adelanto suavizado), `lookAheadTime` y `lookAheadMax`; respeta «Reducir movimiento». |

## 4. Comprobado (Node, con `PlayerController` y `OverworldCamera` reales)

| | 30 fps | 60 fps | 144 fps |
|---|---|---|---|
| Llega al 90 % de la velocidad | 0,17 s | 0,15 s | 0,15 s |
| Desliza al soltar | 0,21 m | 0,25 m | 0,28 m |
| Se para en | 0,23 s | 0,23 s | 0,23 s |

- **Contra una pared:** velocidad 0.
- **Media vuelta:** empieza a volver en 1 fotograma.
- **Cámara corriendo:** se adelanta 0,76 m a los 0,5 s y 1,2 m a los 2 s; al parar vuelve a 0,05 m en 1,5 s.

## 5. Pendiente

- Probar caminando por las islas.
- Si el control se siente lento o resbaladizo, se ajustan `accel` y `decel` en `PlayerController`.
- Si el adelanto marea, se ajusta `lookAheadTime` (0 lo apaga).
