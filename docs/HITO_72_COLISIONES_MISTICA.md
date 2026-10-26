# Hito 72: Colisiones de Mística

Cuarta isla de la revisión de colisiones. Usa la base común de las islas grandes (Hito 71) y el deslizamiento (Hito 70).

## Antes

114 colisiones: el Árbol Arcano, las 3 grandes agujas, el santuario, el observatorio, los pies de los arcos de raíces, los NPC y las rocas de cristal grandes. No había regla de agua ni de pendiente.

## Ahora

| Elemento | Colisión |
|---|---|
| Árboles (80) | tronco |
| Agujas de amatista medianas (6) | base |
| Cúmulos de amatista (23) y rocas (24) | los de más de 0,7 m de alto |
| Guijarros, enredaderas, flores, arbustos, setas (también las rojas de más de 1,5 m), cortinas del sauce, islas flotantes | ninguna, se atraviesan |
| Arcos de raíces | sin cambios: colisión en los pies; el camino pasa por debajo |
| Pantano luminoso | se cruza entero con el agua a media pierna (0,3 m), con ondas. Se llega al islote del sauce y al pilar rúnico |
| Mar | hasta la rodilla (0,5 m), con ondas |
| Pendiente de más de 35° | algunos tramos de costa, el borde del pantano y el del observatorio |

**Comprobación de alcance desde el muelle de Kawa:** se llega a Kawa, al Astrólogo, a la Chamana, al Oráculo, al Sabio, a las 3 hierbas, al islote, al pilar, al santuario, al observatorio y a la nebulosa. Solo queda encerrado un hueco de 2 m² entre dos agujas.

**Deslizamiento** (recorridos automáticos):

| | Velocidad al rozar | Atascado | Veces dentro de una colisión |
|---|---|---|---|
| Antes | 38 % | 41 % | 799 |
| Ahora | 53 % | 27 % | 0 |

## Cómo funciona

- `createMysticIsland` declara `collision` con sus reglas de objetos y `shallow`: el disco del pantano (radio 33 m, nivel 3,0). Ahí la profundidad se limita a 0,3 m.
- `GrandIslandZone.getHeight` devuelve la altura de caminar elevada en el agua somera, igual que el oasis de la Sabana. Esto vale para cualquier isla grande que declare `shallow`.

## Ajuste: borde del pantano con una sola entrada (72b)

- **Una sola entrada:** el pantano solo se baja y se sube por la entrada del noreste, en torno a (-52, 32): la rampa suave junto a la nebulosa, de unos 7 m de ancho. El resto del borde (la pared de las terrazas, a 29–31,6 m del centro) no se cruza en ningún sentido. Está en `SWAMP_FENCE` y `fenceSwamp` de `MysticIsland.js`.
- **Corrección general:** en el agua somera, solo el fondo cubierto por el agua deja de contar como pared. Antes también la orilla seca, y por eso se podía subir la pared del pantano por cualquier sitio. Afecta también al oasis de la Sabana, cuyas orillas son suaves.
- **Comprobado:**
  - intentando entrar desde fuera cada 10°, solo se entra por la entrada;
  - desde dentro solo se sale por ella;
  - el islote y todo lo demás siguen siendo alcanzables.
- **Captura:** `scratch/col/pantano_borde.jpg`.

## Ajuste: hundimiento junto al pantano y monolitos del santuario (72c)

- **Zanja de la nebulosa, quitada:** junto a la entrada del pantano había un hundimiento de unos 2 m, la zanja de la grieta de la nebulosa. Sus paredes contaban como pared. Ahora el terreno es llano ahí y desapareció también la cinta brillante del fondo. El polvo de estrellas y la luz de la nebulosa siguen.
- **Monolitos del santuario:** ya no giran alrededor del altar. Cada uno flota en su sitio subiendo y bajando, y tiene colisión (círculo de 0,8 m, la losa mide 1,4 × 0,5 m).
- **Comprobado:**
  - la vegetación de la isla sale idéntica (posiciones de todos los objetos iguales antes y después);
  - la entrada del pantano sigue siendo la única;
  - el santuario y el resto de la isla siguen siendo alcanzables.
- **Capturas:** `scratch/col/grieta_antes|despues.jpg` y `monolitos_antes|despues.jpg`.

## Ajuste: colisión exacta de los cristales (72d)

- **El problema:** los cristales son prismas inclinados y agrupados, y su colisión era un círculo. En unos sitios el círculo quedaba corto y se atravesaban los extremos del cristal; en otros sobraba y había una pared invisible. En el cristal gigante del oeste el círculo medía 9,75 m.
- **La solución:** cada aguja, cúmulo de amatista y roca de cristal de más de 0,4 m tiene ahora como colisión su **huella exacta**. Es el corte de la malla entre el suelo y la altura del personaje (1,8 m), convertido en un polígono convexo y usado como contorno de segmentos. Función `buildPropHulls` en `kit/IslandPropColliders.js`; cada isla grande la activa con `def.collision.hullRules`.
- **Círculos quitados:** los círculos antiguos de estos cristales y los que añadí en el Hito 72 para agujas y cúmulos ya no se usan.
- **Cifras:** 193 contornos y 1939 segmentos, calculados en ~70 ms una sola vez al entrar en la isla.
- **Comprobado:**
  - al acercarse a cada cristal desde 16 direcciones (2355 intentos), el personaje nunca entra en la huella;
  - se queda a unos 0,75 m del borde (su radio), sin hueco invisible;
  - todo sigue siendo alcanzable;
  - las únicas zonas «encerradas» son el interior de los propios cristales.
- **Capturas:** `scratch/col/cristales_contornos.jpg` (rojo: huellas) y `cristal_choque.jpg`.

## Revisión del Ártico (corrección)

La comprobación de «zonas encerradas» del Hito 71 tenía un fallo de cálculo. Rehecha con el método correcto:

- Todos los sitios de juego siguen siendo alcanzables.
- Quedan algunos rellanos encerrados entre los cuernos del norte (el mayor, de unos 265 m², en -79, -108). Están rodeados de paredes de más de 35° y no hay nada en ellos, así que no afectan al juego.

## Capturas

- `scratch/col/mistica_antes.jpg` y `mistica_despues.jpg`.
- `scratch/col/mistica_pantano.jpg`: cruzando el pantano.
