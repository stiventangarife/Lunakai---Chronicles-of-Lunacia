# Hito 69: Colisiones de la Sabana, mar y oasis caminables

Segunda isla de la revisión de colisiones (después del Bosque, Hito 66). Los arbustos y la hierba siguen sin colisión, a propósito.

## Qué cambia al jugar

| Elemento | Antes | Ahora |
|---|---|---|
| Palmeras (42), acacias (30), árboles secos (35) | se atravesaban | el tronco bloquea; la copa no |
| Cactus (39) | se atravesaban | bloquean |
| Montículos de roca de más de 0,7 m (38) | se atravesaban | bloquean (los bajos se pisan) |
| Agujas de roca sin colisión (8) | se atravesaban | bloquean (las 68 que ya la tenían no se duplican) |
| Paredes de las mesetas (~50°) | se subían caminando | no se suben: pendiente máxima 35° |
| Rampas oeste y noreste (13–22°) | caminables | siguen caminables |
| Mar | se caminaba sin límite | solo hasta la rodilla (0,5 m), con ondas y salpicaduras |
| Oasis | el personaje se hundía | se cruza entero con el agua a media pierna (0,3 m), con ondas |

Comprobación de alcance (cuadrícula de 1 m, radio del personaje 0,55 m): los 4 NPC de la isla (Centinela, Baruk, Zarek, Kawa), las 3 minas y el oasis siguen siendo alcanzables. No queda ninguna zona libre encerrada.

## Cómo funciona

- **`islands/kit/IslandPropColliders.js`** (nuevo, reutilizable en las demás islas): calcula un círculo que se ajusta a la base de cada malla (tronco, base de la roca) a partir de sus vértices; sirve también para cada instancia de una InstancedMesh. Se calcula una sola vez, la primera vez que la isla está visible (unos ms, durante el viaje).
- **`islands/kit/IslandTerrainMask.js`** (nuevo, reutilizable): una pasada de alturas en cuadrícula de 1 m da la pendiente y la profundidad del agua. El cálculo se reparte en trozos de 4 ms (sin tirones). Las zonas «someras» (el oasis) limitan su profundidad y elevan la altura de caminar para que el personaje no se hunda.
- **`OverworldCollisions.js`**: nueva máscara de pendiente (`setSlopeMask`) junto a la de agua. Regla de escape: si el personaje ya está en un sitio no permitido (agua honda o pared), puede moverse solo hacia donde no sea más hondo ni más empinado. Así siempre sale y nunca avanza mar adentro (también corrige ese caso en el Bosque).
- **`SavannaZone.js`**: da de alta las colisiones (etiqueta `savisle_`) y las máscaras al activar la isla, y las retira al salir (cada máscara por separado, para no pisar las de la isla siguiente). Las huellas usan la profundidad para las ondas.

## Rendimiento

- 192 círculos más en la rejilla espacial: cada consulta solo mira las celdas cercanas.
- Agua y pendiente: dos lecturas de una tabla por consulta.
- La comprobación completa de alcance de toda la isla (≈ 55 000 celdas) tarda 33 ms, así que el coste por fotograma del jugador es despreciable.

## Capturas

`scratch/col/sav_antes.jpg`, `sav_despues.jpg` (rojo: paredes que no se suben; cian: agua caminable; azul oscuro: agua honda; naranja: colisiones nuevas; amarillo: las que ya existían), `sav_oasis_vadeo.jpg`, `sav_mar_vadeo2.jpg`.

## Ajuste: laterales de las rampas (69b)

A petición, junto a las dos rampas (oeste y noreste), 18 m a cada lado del eje:

- **Tramo bajo** (camino por debajo de 8,5 m): los laterales del primer escalón (hasta 15,5 m) se pisan enteros. El resto del anillo exterior sigue siendo pared.
- **Tramo alto**: se sube por el lateral hasta `2 + 0,55 × (altura del camino − 10,4)` metros sobre el camino. Medido en la rampa oeste: +1,8 m al pie del tramo alto, +3,1 m y +4,3 m a media rampa, +7,6 m cerca de arriba, donde la pared ya queda libre del todo.
- Se aplica una sola vez, al terminar el cálculo de pendientes (`IslandTerrainMask` admite un ajuste `adjust` por isla). Unos 1018 m² de pared se pueden pisar ahora. Sin coste por fotograma.

Capturas: `scratch/col/rampa_oeste_antes|despues.jpg`, `rampa_ne_antes|despues.jpg`.

## Siguiente

Ártico → Mística → Génesis, con el mismo kit.
