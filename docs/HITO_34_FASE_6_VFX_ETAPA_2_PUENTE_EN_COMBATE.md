# Hito 34 — Fase 6 (VFX), etapa 2: los efectos llegan al combate

> **Estado:** completada. Las cartas de los Axies jugables usan los efectos del laboratorio en combate real.
> **Plan:** pestaña «Fase 6 — VFX» del plan de implementación de habilidades.
> **Actualización 19-oct ([Hito 42](HITO_42_AUDITORIA_VFX_COMPLETOS_Y_PRECOMPILADO.md)):** ya no se limita a esta lista piloto. Todas las cartas, las 5 cartas α de abajo y los ataques de enemigos tienen efecto en combate (`lkDebug.vfxAll(false)` vuelve a la lista piloto).

## Qué se ve en el juego

Cuando un Axie lanza una de estas 24 cartas, el combate reproduce su efecto del laboratorio sobre el tablero:

| Axie | Cartas |
| --- | --- |
| Shinji | Gero, Nyan, Tiny Turtle, Trump, Green Thorns, Tiny Dino |
| Early Bird | Puppy, Early Bird, Little Owl, Scaly Spoon, Cupid, The Last One |
| Big Yak | Blossom, Hollow, Zigzag, Cactus, Bidens, Iguana |
| Bing y Pomodoro (cartas α) | Puppy de ojos y de orejas, Shiba, Passion, Leaf Bug de orejas y de cola, Platypus |

Las cartas que siguen sin efecto propio usan los VFX de siempre:

- Puppy de boca, Toy Ball, Cone Shell, Lost Dream y Village Hero (cartas α);
- los ataques de los enemigos.

Desde el [Hito 36](HITO_36_FASE_6_VFX_SAPIDAE_Y_ULTIMATES.md), las habilidades del Sapidae y las Ultimates tienen efecto propio.

- **El daño aparece en el fotograma del impacto** del efecto, no antes. Hay un tope de seguridad: si algo falla, el combate sigue como mucho 2,6 s después.
- **Se oscurece el tablero** mientras dura el efecto. Los efectos son aditivos y se diseñaron sobre fondo oscuro; sin esto se perdían contra el cielo de día.
- **Embestidas y retrocesos:** se mueven las unidades de forma solo visual, como máximo media casilla. Al terminar vuelven a su casilla. Si la carta empuja o teletransporta de verdad, manda el motor y no hay movimiento visual.
- **Golpe con peso:** en el impacto hay una pausa breve (*hit-stop*) y una sacudida según el nivel de la carta, y el *bloom* se refuerza mientras dura el efecto.

## Cómo funciona (`src/vfx/VfxBridge.js`)

1. **Al empezar el combate**, el puente mira las cartas de todas las unidades y carga solo los módulos que hacen falta. Después construye esos efectos y precompila sus shaders (`renderer.compile`), para que no haya tirones en mitad de un ataque.
2. **Al lanzar una carta** (`spell:cast`), coloca el grupo raíz del motor sobre la línea lanzador → objetivo:
   - traslación, giro y escala uniforme (un Axie mide ≈ 1,15 frente a 1,87 del muñeco del laboratorio);
   - espejo cuando hace falta, para que el frente del efecto mire a la cámara del juego;
   - la distancia se ajusta con la deformación del pasillo (ver «Distancia» más abajo).
3. **Las cartas sobre aliados** usan como ancla el aliado del laboratorio (`ALLY_POS[0]`) y las cartas sobre uno mismo se centran en el lanzador.
4. **Marca `ctx.vfx = { untilImpact }`:**
   - `castSpell` espera esa promesa antes de aplicar los efectos;
   - `SpellPresentation` no dibuja su proyectil ni su impacto para esa carta.
5. **En cada fotograma** (`SceneManager.onBeforeRender`) actualiza la cámara proxy, es decir, la cámara real vista desde el grupo raíz. Así los *billboards* de los módulos miran bien. También ajusta el tamaño de las partículas y llama a `core.evaluate(habilidad, t)`.

## Distancia: deformación del pasillo (corrección del 17-oct)

En el laboratorio, lanzador y objetivo están siempre a 7,1 unidades. En el tablero pueden estar en casillas vecinas (1,6) o a más de 9. Al principio se estiraba todo el efecto a lo largo del viaje, con límites. Con las cartas a distancia lanzadas cuerpo a cuerpo, eso las aplastaba: anillos convertidos en óvalos, el impacto deformado y el origen detrás del lanzador.

Ahora el efecto no se estira. Solo se comprime o se alarga el **pasillo** entre los dos extremos:

- **Zonas rígidas:** 1,3 unidades del laboratorio alrededor del lanzador (boca, aura de lanzamiento) y 1,6 alrededor del objetivo (impacto, anillos) conservan su forma.
- **El pasillo** absorbe toda la diferencia de distancia: un proyectil recorre menos o más camino, pero nace en el lanzador y estalla en el objetivo.
- **Cuerpo a cuerpo:** si las dos zonas no caben, se comprimen un poco por igual (×0,79 con el objetivo en la casilla vecina).
- **Cómo se aplica:** se añade al final de cada *vertex shader* del efecto. Recupera la posición en el mundo desde `gl_Position`, la pasa al espacio del laboratorio, la deforma y la vuelve a proyectar. Así funciona con los 4.807 materiales de los 240 efectos sin tocar ningún módulo. La luz del efecto se deforma igual en JS.
- **Navegadores sin WebGL2:** no reciben la deformación, porque `inverse()` necesita WebGL2.

**Verificación:**

- **Precisión:** para las 24 cartas piloto, a 1, 2, 3, 5 y 7 casillas, el punto de impacto del laboratorio cae exactamente sobre el objetivo y el origen sobre el lanzador. El error máximo es de 0,000 unidades.
- **Capturas:** Zigzag, Nyan, Gero, Cupid y Little Owl a 1, 2 y 4 casillas muestran el impacto sobre la unidad objetivo.
- **Compilación:** los 240 efectos compilan y se dibujan con la deformación sin errores de shader.

## Corrección: a 1 y 2 casillas los efectos se aplastaban (18-oct)

Caso de prueba: **Watermelon** (`part_plant_horn_watermelon`), que hace rodar una sandía del lanzador al objetivo.

**El problema.** Una casilla equivale a 2,6 unidades del laboratorio, donde lanzador y objetivo están a 7,1.

- **A 2 casillas,** el pasillo se comprimía al 55 %. Todo lo que pasaba por él, como la sandía, se aplastaba en la dirección del ataque.
- **A 1 casilla,** el pasillo desaparecía: la sandía quedaba plana, como un disco, y saltaba de golpe. Además, las zonas del lanzador y del objetivo se comprimían solo a lo largo del ataque, así que el anillo de impacto salía ovalado.

**La solución** (`src/vfx/VfxBridge.js`):

- **Objetos rígidos.** Una malla compacta (radio menor de 0,95 unidades, con su origen dentro de la propia malla) se desplaza entera según dónde cae su centro, así que no se deforma; solo recorre menos camino. Rayos, estelas, planos de suelo y partículas se siguen deformando vértice a vértice, porque así se ven bien. La clasificación es automática al preparar cada efecto, sin tocar los módulos. Si un material lo comparten mallas rígidas y elásticas, gana elástico.
- **Encogimiento uniforme.** Cuando las dos zonas no caben, el efecto se encoge por igual en las tres direcciones: queda más pequeño, pero sin óvalos.
- **Pasillo mínimo.** El pasillo conserva al menos el 15 % de la distancia, para que lo que viaja se vea viajar. En cuerpo a cuerpo el efecto queda algo más pequeño, porque tiene que caber entre las dos unidades (valor ajustado en el Hito 36; al principio era el 22 %).

**Verificación:**

- **Watermelon a 1, 2 y 4 casillas,** con el tiempo congelado en 5 instantes: la sandía es redonda durante toda la rodada y el anillo de impacto es circular.
- **Otras cartas a 1, 2 y 4 casillas:** Gero, Little Owl, Tiny Dino y Cupid.
- **Precisión:** el impacto cae exactamente sobre el objetivo en las 24 cartas piloto, a 1, 2, 3, 5 y 7 casillas (error 0,000).
- **Compilación:** los 240 efectos compilan sin errores.

## Corrección: cartas de área sobre casillas vacías (17-oct)

Green Thorns (y cualquier carta lanzada sobre una casilla vacía, como Hollow) se tomaba como «lanzada sobre uno mismo», porque no había unidad en la casilla. El efecto salía entonces hacia la derecha de la cámara, así que iba hacia delante o hacia atrás según desde dónde se mirara el tablero.

- **Ahora solo cuenta como propia la casilla del lanzador.** Una casilla vacía es un objetivo normal: el efecto va del lanzador a esa casilla.
- **Las cartas que sí son sobre uno mismo** orientan su efecto hacia el enemigo vivo más cercano, no hacia la cámara. Así se ven igual desde cualquier ángulo.
- **Verificado:** Green Thorns lanzada a una casilla vacía a 3 de distancia, con la cámara girada a sus 4 posiciones. El impacto cae siempre en esa casilla (error 0,000).

## Cambios en el juego

| Archivo | Cambio |
| --- | --- |
| `src/vfx/VfxBridge.js` | Nuevo: el puente. |
| `src/main.js` | Instala el puente y sus comandos de consola. |
| `src/tactics/SceneManager.js` | Guarda `bloomPass` y llama a `onBeforeRender(dt)` después de mover la cámara. |
| `src/tactics/Spells.js` | Si `ctx.vfx` existe, `castSpell` espera al impacto en lugar del proyectil. |
| `src/tactics/combat/SpellPresentation.js` | No dibuja el impacto por defecto cuando la carta tiene efecto propio. |

## Consola (F12)

| Comando | Qué hace |
| --- | --- |
| `lkDebug.vfx()` | Estado: activo, cartas piloto, efectos construidos, efecto en curso. |
| `lkDebug.vfx(false)` / `lkDebug.vfx(true)` | Apaga o enciende los efectos nuevos (se recuerda en el navegador). |
| `lkDebug.vfxAll(true)` | Activa las 235 cartas, no solo las piloto (para probar). |
| `lkDebug.vfxPlay('part_bird_mouth_little_owl')` | Reproduce un efecto desde la unidad activa hacia el enemigo más cercano. |

## Pruebas

- **Combate real en el navegador:** se lanzaron las cartas de Shinji, Bing y Pomodoro con un enemigo a tiro. Todas las cartas con efecto lo reprodujeron y el daño llegó en el mismo milisegundo que el impacto. Las unidades volvieron a su casilla y no hubo errores de JavaScript.
- **Campaña simulada (niveles 2, 5 y 8) con los efectos activos:** victorias sin bloqueos ni unidades superpuestas.
- **Tutorial completo:** pasa sin errores.
- **Pruebas automáticas:** fases 0–5 y Axie Care en verde. La regresión sigue igual que antes: solo cambian los hechizos ajustados a propósito.

## Pendiente (etapas siguientes)

- **Etapa 3:** extender la espera al impacto a todos los hechizos (también los que no son cartas) y pasar la sacudida y la luz a `SceneManager`.
- **Etapa 4:** las 235 cartas (ya se pueden probar con `lkDebug.vfxAll(true)`). También hay que colocar bien los efectos con aliados o enemigos extra. Hoy esas piezas salen en la posición del laboratorio relativa al lanzador, no sobre la unidad real.
- **Velocidad:** algunos efectos tardan más de 2 s en llegar al impacto. Si el combate se siente lento, se puede añadir un factor de velocidad global.
- **Color:** el combate usa *tonemapping* ACES y el laboratorio no, así que los brillos se ven algo más suaves. Se revisará con capturas en la etapa 6.
