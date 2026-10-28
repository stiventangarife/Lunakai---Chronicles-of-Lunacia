# Hito 79: Sombras, cámara con colisión, color del daño y pesca en alto

## 1. Sombras que titilaban
**Causa:** el sol sigue al jugador para que la zona de sombras quede siempre a su alrededor.
- En el Bosque esa zona avanza en pasos de un texel del mapa de sombras (unos 13 cm), así que los bordes no se mueven.
- En la Sabana, el Ártico, la Mística y Génesis avanzaba cualquier fracción. Cada fotograma los bordes caían en un texel distinto y titilaban al caminar.

**Arreglo:** `SavannaZone` y `GrandIslandZone` (Ártico, Mística y Génesis) usan los mismos pasos fijos que el Bosque (`LightingManager` con `snapShadows`).

**Comprobado:** en 200 fotogramas caminando, la caja de sombras pasa de un desfase de hasta medio texel a 0.

## 2. Cámara con colisión: menos acercamientos y sin rebotes
**Causas:**
- Cada objeto era una caja alineada con el mundo; en una casa girada, esa caja es mucho mayor que la casa.
- También contaban faroles, postes y carteles.
- Las copas de algunos modelos acercaban la cámara. Por ejemplo, la del árbol de la Forja: la malla se llama «Mesh» y el nombre útil está en el padre.
- Al chocar, la cámara entraba de golpe; al quedar libre, salía despacio. Al pasar rozando, iba y venía.

**Ahora** (`CameraOcclusion.js` y `OverworldCamera.js`):
- **Cajas orientadas:** giran con cada objeto. El rayo se prueba en el espacio del objeto, con casi el mismo coste.
- **Lo pequeño no acerca la cámara:**
  - por tamaño: menos de 0,35 m de grosor o menos de 1,3 m de ancho;
  - por nombre: farol, poste, cartel, valla, tótem, barril, caja, cubo…;
  - lo que flota a más de 2,2 m del suelo: copas, tejadillos sueltos.
- **El nombre se busca también en los dos padres** de cada malla.
- **Rozar una esquina:** si el obstáculo queda en el último 30 % del brazo, junto a la cámara, y la cámara no está dentro de nada, no se acerca. Esa esquina se transparenta con el mismo tramado que los árboles.
- **Movimiento suave:**
  - se acerca rápido pero suave, en unas 6 centésimas de segundo;
  - al quedar libre espera 0,3 s y luego se aleja despacio;
  - sin obstáculos durante 1,5 s, sigue la rueda del ratón con normalidad.

**Medido en el pueblo del Bosque:** 67 objetos pequeños ya no cuentan, y la copa del árbol de la Forja deja de acercar la cámara. Las casas, el dojo y las rocas grandes siguen acercándola cuando de verdad tapan al personaje.

## 3. Por qué el daño se veía verde en unas cartas y rojo en otras
- **No dependía del personaje.** El verde significaba «mayor que el valor base de la carta» (nivel de habilidad, atributos, runas, estados). Las cartas del Sapidae casi siempre lo están; las de un Axie sin mejoras, no.
- **El problema:** el verde también es el color de las curaciones, y el rojo de «reducido» era casi igual al normal.
- **Ahora:** el daño se ve siempre en su color, y una flechita al lado indica si cambió:
  - **▲ verde** si es mayor que el de la carta;
  - **▼ roja** si es menor.
- Las curaciones siguen en verde y los escudos en turquesa. El desglose sigue en la ficha.
- Archivo: `CombatHUD.js`.

## 4. Pesca en alto, con hilo
- **Puntos de pesca del Bosque** (`GatheringCatalog.js`):

  | Punto | Dónde | Altura |
  |---|---|---|
  | Puente del pueblo (`fish_forest_1`) | junto a la barandilla | tablero a ~3,3 m, agua a 2 m |
  | Puente de los rápidos (`fish_forest_3`) | junto a la barandilla | tablero a ~5,5 m, agua a ~0,8 m |
  | Muelle de la playa (`fish_forest_4`, **nuevo**) | junto a la tienda de pescado del barquero | tablero a 1,95 m, mar a 0,45 m |
  | Orilla del puente (`fish_forest_2`) | en la orilla, se mantiene para variar | — |

- **El muelle** (`FOREST_PIER` en `ForestBridge.js`):
  - mismo modelo que los puentes, con el tablero a altura fija;
  - barandillas y tope en la punta;
  - se puede caminar por él (`DemoScenaZone22.getHeight`).
- **Hilo de pesca** (`GatheringActors.js`):
  - una línea fina desde la punta del látigo hasta el corcho, con comba;
  - se tensa cuando pica y se recoge con la animación.
- **El corcho cae donde están las ondas**, fuera del puente (antes caía justo bajo la punta).
- **El Sapidae se aparta hacia el lado que es tablero.** Si ese lado es el de la cámara, la cámara gira al otro para que el Sapidae no quede delante del Axie.
- **Comprobación de los puntos** (`lunakaiGathering.check()`): en puentes y muelle no cuenta la pendiente del terreno de al lado. Los 5 puntos del Bosque dan «ok».

## Comprobado
- **Cartas:** «62–74 ▲» en el color del daño, «+20» en verde, y «▼» cuando el Axie está Debilitado.
- **Pesca:** las tres posiciones en alto, con el hilo hasta el corcho y las ondas (capturas).
- **Sombras:** pasos de un texel en las islas que no los tenían.
- **La partida del usuario quedó intacta.**
