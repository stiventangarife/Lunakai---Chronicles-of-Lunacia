# Hito 70: Deslizamiento al chocar (sin atascos)

Antes de seguir con las demás islas: el personaje ya no se queda pegado al chocar. Usa el mismo enfoque que el CharacterController de Unity («collide and slide» con fricción). Está todo en `src/rpg/OverworldCollisions.js`, así que sirve para todas las islas, el jugador, los monstruos y los actores de recolección.

## Por qué se atascaba

- **El agua honda y las paredes empinadas** solo decían «aquí no», sin dirección. Contra la orilla o un acantilado en diagonal, el personaje se paraba en seco.
- **Los obstáculos empujaban hacia fuera** uno tras otro. Entre dos cercanos los empujes se anulaban. Además, el resultado se aceptaba aunque quedara un 5 % dentro del obstáculo, y por eso a veces se atravesaba un poco.
- **El último recurso** era moverse solo en X o solo en Z, que falla en paredes diagonales.

## Cómo funciona ahora

1. **Destino libre**: se va directo, igual que antes y con el mismo coste.
2. **Punto de contacto**: si choca, se busca a lo largo del paso con una búsqueda binaria (7 pasos, precisión de paso/128).
3. **Normal de lo que se toca**, hacia fuera:
   - círculos: desde el centro;
   - cajas y segmentos: desde el punto más cercano;
   - bordes del mundo;
   - agua honda: hacia donde es menos honda (gradiente de la tabla de profundidad);
   - paredes de las mesetas: hacia donde baja la pendiente.
4. **Deslizar**:
   - de lo que queda del paso se quita la parte que va contra cada superficie, una tras otra; se conserva la paralela;
   - fricción: velocidad = sen(ángulo)^0,6. Paralelo al borde: 100 %; a 45°: 81 %; a 20°: 53 %;
   - casi de frente (menos de ~10°) contra una pared: se detiene, sin temblar;
   - casi de frente contra un tronco o una roca: lo rodea al 45 % de la velocidad, por el lado hacia el que ya se inclinaba, y mantiene ese lado mientras sigue empujando (no alterna entre dos troncos);
   - rincones y huecos más estrechos que el personaje: se detiene. Nunca desliza hacia atrás respecto a la dirección pulsada.
5. **Hasta 3 contactos por paso** (rincón = dos paredes), con una separación de 1,5 cm para no volver a rozar la misma superficie.
6. **Seguridad**: si el resultado acabara dentro de algo, se queda donde estaba. Si ya se empieza dentro (por ejemplo, porque aparece una colisión encima), se usa el empuje hacia fuera de antes.

## Resultados (recorridos automáticos con la dirección fija, colisiones reales)

| | Velocidad al rozar | Fotogramas atascado al rozar | Veces dentro de una colisión |
|---|---|---|---|
| Sabana, antes | 17 % | 69 % | 471 |
| Sabana, ahora | 52 % | 24 % | 0 |
| Bosque, antes | 40 % | 36 % | 1937 |
| Bosque, ahora | 52 % | 28 % | 0 |

El «atascado» que queda corresponde a chocar de frente contra una pared o a meterse en un rincón: ahí pararse es lo correcto. Temblores (ida y vuelta entre fotogramas): 12–14 en 270 000 pasos.

Coste: ≈1 µs por paso (antes ≈0,8 µs). Solo se paga más cuando hay contacto. Sin coste visible.

Captura: `scratch/col/deslizar_acantilado.jpg` (misma dirección pulsada contra el acantilado de la Sabana: en rojo antes, se para; en verde ahora, desliza).

## Corrección: enganches junto a las rampas de la Sabana (70b)

El jugador se quedaba pegado al subir por la rampa oeste, en torno a (-93, 35). Había tres causas, todas en la tabla de pendientes:

1. **Borde en escalera**: el límite de subida junto a las rampas (69b) marcaba casillas sueltas de 1 m. El borde salía en escalones y cada escalón era un rincón. Ahora la pendiente depende de cuánto se pasa de la altura permitida (35° + 12° por metro de exceso), así que el límite queda en una curva de nivel suave. Además, el tramo bajo y el alto se mezclan sin quiebro, y en los lados y extremos de la zona el cambio se funde con la pendiente original (sin crestas).
2. **Picos y entrantes de una casilla** en paredes naturales cuya pendiente ronda los 35°: la tabla se suaviza con una media 3×3 (`smoothSlope`) y se quitan las motas sueltas (`slopeLimit`).
3. **Normal del agua y de las paredes**: ya no sale del gradiente, sino de tantear 12 direcciones alrededor (apunta hacia lo libre). Si el deslizamiento choca enseguida con un quiebro del borde, se abre un poco (10°, 20°, 35°) y sigue.

Resultados:

- **Rampa oeste**: avanza sin atascarse empujando contra cualquiera de los dos laterales con 15°, 25° y 40° de ángulo. Antes se paraba a los 5–8 m.
- **Sabana**: la velocidad al rozar pasa a 54 % y los fotogramas atascados a 23 %.
- **Paradas largas restantes**: las que quedan con un ángulo que permitiría deslizar son huecos más estrechos que el personaje (entre un tronco y una pared, o entre dos rocas), donde pararse es lo correcto.
- **Alcance**: sigue siendo todo alcanzable, sin zonas encerradas.
- **Bosque**: velocidad al rozar 53 %, atascado 27 %, nunca dentro.

## Ajustes (constantes al principio del archivo)

`FRICTION_EXP` (más bajo = más resbaladizo), `HEAD_ON` (ángulo frontal en el que se detiene), `ROUND_SPEED` (velocidad al rodear un tronco), `SKIN`.
