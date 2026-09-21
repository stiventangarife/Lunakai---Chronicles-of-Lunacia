# Hito 3: Macro-Cuadrícula de Lunacia, 5 Biomas y Estructura 2x2 Estilo Dofus

## 1. Visión General
El tercer hito del proyecto consolidó la escala del Overworld de **Axie Tactics**, implementando la macro-cuadrícula global interconectada mediante el sistema cardinal de **Dofus**. Cada macro-zona se estructura internamente en cuadrantes de **2x2**, abarcando **5 biomas principales** (incorporando el **Bioma de Mazmorra en rojo**) y dotando al jugador de un **Mapa del Mundo Interactivo (Tecla [M])** en tiempo real.

> [!NOTE]
> **Calibración de Alcance para la Versión Demo (5x5 - 25 Macro-Zonas)**:
> Para garantizar una experiencia de demostración compacta, ágil y pulida, la cuadrícula activa se calibra a **$5 \times 5$ Macro-Zonas (25 regiones)**, manteniendo el **Valle del Dojo de Lunacia** como epicentro en las coordenadas `[3, 3]`, con indexación 1-based (`1,1` a `5,5`) y el patrón de molinete original.

---

## 2. Matriz Global de la Demo 5x5 (25 Macro-Zonas)

El diseño del mundo sigue una distribución concéntrica en molinete (*pinwheel*) alrededor del corazón del Bosque y el Dojo:

```
                        COLUMNAS (gx: 1 .. 5)
         Col 1          Col 2          Col 3          Col 4          Col 5
Row 1 [1,1 ÁRTICO ]  [2,1 ÁRTICO ]  [3,1 ÁRTICO ]  [4,1 ÁRTICO ]  [5,1 SABANA ]
Row 2 [1,2 MÍSTICO]  [2,2 BOSQUE ]  [3,2 BOSQUE ]  [4,2 BOSQUE ]  [5,2 SABANA ]
Row 3 [1,3 MÍSTICO]  [2,3 BOSQUE ]  [3,3 DOJO ⚔️]  [4,3 BOSQUE ]  [5,3 SABANA ]
Row 4 [1,4 MÍSTICO]  [2,4 BOSQUE ]  [3,4 BOSQUE ]  [4,4 BOSQUE ]  [5,4 SABANA ]
Row 5 [1,5 MÍSTICO]  [2,5 MAZMORRA] [3,5 MAZMORRA] [4,5 MAZMORRA] [5,5 MAZMORRA]
```

### Distribución de Macro-Zonas por Bioma (5x5):
- 🌲 **Bosque / Forest (Verde)**: Bloque central de $3 \times 3$ ($9$ macro-zonas, `gx: 2..4, gy: 2..4`). Inicio del juego en el Dojo de Lunacia `[3, 3]`.
- ❄️ **Ártico / Arctic (Azul)**: Franja norte ($4$ macro-zonas, `gx: 1..4, gy: 1`).
- 🏜️ **Sabana / Savannah (Amarillo)**: Franja este ($4$ macro-zonas, `gx: 5, gy: 1..4`).
- 🔮 **Místico / Mystic (Morado)**: Franja oeste ($4$ macro-zonas, `gx: 1, gy: 2..5`).
- 🏰 **Mazmorra / Dungeon (Rojo)**: Franja sur ($4$ macro-zonas, `gx: 2..5, gy: 5`).

$$\text{Total Macro-Zonas Demo} = 9 + 4 + 4 + 4 + 4 = 25$$

---

## 3. Arquitectura del Enfoque A.1: Macro-Zona Continua 80x80m con 4 Cuadrantes

En este enfoque, el jugador transita de manera 100% fluida dentro de la macro-zona:
- **Dimensiones del Terreno**: Terreno plano estilizado de $80\text{m} \times 80\text{m}$ (`StylizedGround.js`, `textureRepeat: 16.0`, rango SDF $6\text{m}$).
- **Densidad Visual**: Cobertura de hierba estilizada con shader de viento en GPU (18,000 briznas) y 380 flores silvestres.
- **Distribución de Árboles (8 Árboles)**:
  - Cuadrante NW: `[-24, 0, -24]`, `[-28, 0, -14]`
  - Cuadrante NE: `[24, 0, -24]`, `[28, 0, -14]`
  - Cuadrante SW: `[-24, 0, 24]`, `[-16, 0, 28]`
  - Cuadrante SE: `[24, 0, 24]`, `[28, 0, 26]`
- **Límites y Colisiones Físicas**:
  - Límites de colisión exterior: `{ minX: -38.5, maxX: 38.5, minZ: -38.5, maxZ: 38.5 }`.
  - Colisiones de troncos de los 8 árboles ($r = 2.0\text{m}$).
- **Sub-Cuadrantes 2x2 en Tiempo Real**:
  - $X < 0, Z < 0 \implies$ `NW` (Noroeste)
  - $X \ge 0, Z < 0 \implies$ `NE` (Noreste)
  - $X < 0, Z \ge 0 \implies$ `SW` (Suroeste)
  - $X \ge 0, Z \ge 0 \implies$ `SE` (Sureste)
  - El HUD (`#overworld-zone-coord-badge`) y el modal (`WorldMapModal`) detectan de forma reactiva en cuál de los 4 cuadrantes se encuentra el jugador, iluminándolo con resplandor cian.
- **Portales Cardinales Dofus y Centrado del Héroe**:
  - Ubicados al extremo de los 4 caminos cardinales exteriores en $X = \pm 38.0\text{m}, Z = \pm 38.0\text{m}$.
  - Al cruzar un portal perimetral, se ejecuta la transición visual suave y el jugador aparece en el portal opuesto de la macro-zona contigua con un offset seguro de $\pm 32.5\text{m}$.
  - **Corrección de Centrado de Modelo**: Se integró `player.teleport(x, y, z, yaw)` en `PlayerEntity.js`. El modelo 3D hijo (`mesh`) se mantiene estrictamente fijado en el origen local `(0, 0, 0)` de su contenedor `group` con orientación hacia el interior de la nueva macro-zona, impidiendo desplazamientos indebidos o desalineación con el círculo/aura del suelo.

---

## 4. Gestor Temático de Biomas (`BiomeThemeManager.js`)
Siguiendo las directrices del usuario (*cambio sutil para reconocer cada bioma mientras se establecen los cuadrantes*), todos los biomas conservan su pradera verde natural, variando suavemente el matiz de la iluminación solar y la niebla atmosférica:

| Bioma | Código / Insignia | Luz Solar | Niebla Atmosférica | Variación de Color |
| :--- | :--- | :--- | :--- | :--- |
| **🌲 Bosque** | `forest`<br/>`🌲 BOSQUE` | Cálida dorada (`#fff1cf`, $2.8$) | Celeste suave (`#cee4f5`, $\rho = 0.006$) | Prado natural de Lunacia |
| **❄️ Ártico** | `arctic`<br/>`❄️ ÁRTICO` | Fría cristalina (`#f0f9ff`, $2.6$) | Azul escarcha tenue (`#e0f2fe`, $\rho = 0.009$) | Tinte gélido sutil |
| **🏜️ Sabana** | `savannah`<br/>`🏜️ SABANA` | Dorada solar (`#fef9c3`, $3.0$) | Tinte ocre sutil (`#fef3c7`, $\rho = 0.008$) | Calidez templada |
| **🔮 Místico** | `mystic`<br/>`🔮 MÍSTICO` | Lavanda suave (`#faf5ff`, $2.6$) | Bruma violeta tenue (`#f3e8ff`, $\rho = 0.010$) | Aura etérea delicada |
| **🏰 Mazmorra** | `dungeon`<br/>`🏰 MAZMORRA` | Ámbar cálido (`#fff7ed`, $2.7$) | Humo rojizo tenue (`#fee2e2`, $\rho = 0.011$) | Atmósfera de fortaleza |

---

## 5. Modal del Mapa del Mundo 7x7 (`WorldMapModal.js`)
- **Acceso Inmediato**: Pulsando la tecla **`[M]`** o el botón `🗺️ Ver Mapa [M]` del HUD.
- **Gráfica 7x7 Completa**: Dibuja las 49 macro-zonas con los colores oficiales del esquema (392px x 392px).
- **Pin de Jugador en Tiempo Real**: Marcador pulsante (`⚔️`) ubicado en la coordenada activa del jugador (`[gx, gy]`).
- **Desglose de Sub-Cuadrantes 2x2**: Al seleccionar cualquier macro-zona, el panel lateral detalla los 4 sub-cuadrantes e ilumina el cuadrante donde se encuentra el jugador en tiempo real.
- **Conexiones Cardinales Dofus**: Lista interactiva de salidas cardinales con etiquetas y destinos.

---

## 6. Verificación Automatizada
- Pruebas automatizadas ejecutadas en `scratch/test_7x7_world.js` mediante Chrome Headless con WebGL.
- **Validaciones Superadas**:
  1. Carga íntegra de la matriz 7x7 (49 macro-zonas generadas con reciprocidad de portales).
  2. Movimiento continuo entre cuadrantes: Kotaro inició en `SE` (posición $(0, 0, 2)$) y se desplazó a `NW` (posición $(-18, 0, -18)$); el HUD y el modal se actualizaron automáticamente a `NW`.
  3. Transición por portal perimetral a macro-zona de Mazmorra `zone_3_5` (`[3, 5]` Umbral de la Fortaleza Ígnea), actualizando la niebla y reposicionando el pin del jugador en el mapa $7 \times 7$.
  4. Cero errores o excepciones de JavaScript en la consola del navegador.

---

## 7. Bioma Sabana / Desierto (Implementación Detallada)
Siguiendo las especificaciones exactas del usuario, la Sabana (`savannah`) es el primer bioma con diseño estilizado completo:

1. **Suelo Desértico (`#FAC651`)**:
   - Modificación del shader en `StylizedGround.js` con los uniforms `uGroundColorOverride` y `uUseGroundOverride`.
   - Se reemplaza la hierba verde por el tono desértico cálido `#FAC651`, preservando íntegramente las oclusiones, relieves y el camino de adoquines con tierra y musgo.
2. **Cactus Estilizados CC0 (`#DA7635`)**:
   - Modelos CC0 libres de derechos integrados en `assets/savannah/cactus_tall.glb` y `cactus_short.glb`.
   - Material PBR con rugosidad $0.80$, metalicidad $0.05$ y color exacto `#DA7635`.
   - 32 cactus distribuidos estratégicamente en grupos en los 4 cuadrantes (NW, NE, SW, SE) fuera de los caminos transitables.
   - Colisiones físicas cilíndricas registradas dinámicamente en `OverworldCollisions` para los cactus altos (`savannah_cactus_...`).
3. **Árboles del Desierto con Tronco Curvado y Hojas Naranjas (`#DF6637`)**:
   - Modelos libres de derechos `assets/savannah/tree_palmBend.glb` (palmera con tronco curvado y rugoso) y `assets/savannah/tree_plateau.glb` (acacia tipo meseta).
   - Acabado de tronco corrugado envejecido por el sol (`#7c5836`) y copas con el tono naranja cálido exacto `#DF6637` (`foliageMat` en `BiomeDecorationManager.js` y `treeCanopy` en `BiomeThemeManager.js`).
   - Alineados con los 8 puntos de colisión de troncos del mapa de 80m.
4. **Césped Ralo y Cálido (`#F99A5D`)**:
   - Inclusión de césped desértico en menor cantidad mediante `StylizedGrass.setDensityFactor(0.30)` (reducción dinámica al 30% del volumen, 5.400 briznas en lugar de 18.000).
   - Tono cálido en puntas `#F99A5D` y base `#b55829`.
   - Ocultamiento de flores silvestres en el desierto con `StylizedFlowers.setVisible(false)`.
5. **Rocas y Piedras Integradas**:
   - Conjunto de 24 rocas y piedras naturales (`stone_smallA.glb`, `rock_smallA.glb`, `rock_smallB.glb`, `rock_smallFlatA.glb`) distribuidas en clusters alrededor de la vegetación y accidentes del terreno.
6. **Orientación de Flechas Cardinales Dofus (Alineadas Hacia Afuera)**:
   - Corrección de `arrowHeading` en `MapRegistry.js`:
     - **NORTE** ($Z = -38\text{m}$): `0` (apunta hacia $-Z$, borde norte).
     - **SUR** ($Z = +38\text{m}$): $\pi$ (apunta hacia $+Z$, borde sur).
     - **OESTE** ($X = -38\text{m}$): $\pi/2$ (apunta hacia $-X$, borde oeste exterior).
     - **ESTE** ($X = +38\text{m}$): $-\pi/2$ (apunta hacia $+X$, borde este exterior).
   - Todas las flechas señalan inequívocamente hacia la salida y dirección de marcha del jugador.
7. **Gestión Modular Dinámica (`BiomeDecorationManager.js`)**:
   - Carga y administra los modelos y colisiones de Sabana de forma asíncrona y reactiva al entrar y salir de zonas de bioma `savannah`.

---

## 8. Bioma Ártico / Nieve (Implementación Detallada)
Siguiendo las especificaciones exactas del usuario para el segundo bioma especializado, el Ártico (`arctic`):

1. **Suelo Níveo (`#F3F3F6`)**:
   - Uniform `uGroundColorOverride: #F3F3F6` en `StylizedGround.js`.
   - Modula el prado sustituyendo el verde del bosque por una capa nívea reflectiva `#F3F3F6`, preservando los relieves de oclusión, el camino empedrado y un borde de tierra congelada procedimental (`arcticSoil`).
2. **Árboles del Bosque con Manto Blanco de Nieve en las Hojas**:
   - Se mantienen los mismos modelos del bosque (`tree-tronk.glb` y `tree-leaves-mesh.glb` en `StylizedTrees.js`).
   - Sombreador PBR procedimental en `leafMaterial.onBeforeCompile`: combina normales esféricas volumétricas (`leafSphereNorm.y`) y normales del plano del vértice (`vLeafWorldNormal.y`) reguladas por `uSnowAmount`.
   - En Ártico (`uSnowAmount = 1.0`), la parte superior de cada cúmulo de hojas recibe un generoso manto blanco `#F3F3F6`, manteniendo la base de follaje verde bosque en los envases inferiores.
3. **Arbustos Verdes con Capa de Nieve Superior (CC0)**:
   - Modelos libres de derechos `plant_bush.glb`, `plant_bushDetailed.glb` y `plant_bushSmall.glb` en `assets/arctic/`.
   - Shader procedural `createSnowCapMaterial`: color base verde bosque `#285926` con acumulación de nieve `#F3F3F6` en normales orientadas hacia arriba (`vSnowWorldNormal.y > 0.20`).
   - 24 arbustos nevados de escala prominente distribuidos en los 4 cuadrantes fuera de los caminos transitables.
4. **Rocas con Manto de Nieve (CC0)**:
   - Modelos libres de derechos `rock_smallA.glb`, `rock_smallB.glb`, `rock_smallFlatA.glb` y `stone_smallA.glb` en `assets/arctic/`.
   - Shader con color base piedra pizarra `#525c68` y nieve orientada por normales superiores `#F3F3F6`.
   - 24 rocas y lajas nevadas integradas por el terreno.
   - Colisiones físicas registradas en `SpatialCollisionSystem` (`arctic_rock_...`) para las rocas principales.
5. **Césped Nevado a Densidad Reducida**:
   - Reducción dinámica de densidad al $35\%$ mediante `StylizedGrass.setDensityFactor(0.35)`.
   - Puntas de las briznas teñidas de `#F3F3F6` (nieve en las puntas) y raíces en verde bosque profundo `#3d6325`.
   - Flores silvestres cubiertas bajo el manto invernal (`showFlowers: false`).
6. **Atmósfera Invernal y Reversibilidad Total**:
   - Iluminación solar fría (`#eef6ff`, intensidad $2.9$), cielo gélido (`#ecfdf5`), niebla polar tenue (`#dbeafe`, $\rho = 0.005$) y partículas de copos de nieve flotantes.
   - Conmutación reactiva e instantánea al viajar entre Ártico, Sabana y Bosque sin recarga de página ni fugas de memoria.

---

## 9. Bioma Místico / Astral (Tercera Zona Especializada)
Siguiendo las directrices del usuario, el Bioma Místico (`mystic`) implementa una estética onírica y de fantasía mágica:

1. **Color de Suelo Astral (`#1E6E84`)**:
   - Uniform `uGroundColorOverride: #1E6E84` en `StylizedGround.js`.
   - Reemplaza el prado con un tono turquesa/petróleo místico, conservando los relieves de oclusión, el camino empedrado y un borde de tierra mística procedimental (`mysticSoil` en tonos petróleo oscuro) para una transición suave.
2. **Árboles del Bosque con Hojas Dual-Tone (`#FCA6B0` / Sombra `#B66C8A`)**:
   - Mismos árboles estilizados del bosque (`tree-tronk.glb` y `tree-leaves-mesh.glb` en `StylizedTrees.js`).
   - Sombreador Dual-Tone volumétrico: `mix(uCanopyShadowColor, uCanopyBaseColor, smoothstep(-0.35, 0.45, leafSphereNorm.y))` permitiendo que las hojas reciban luz superior en rosa pastel `#FCA6B0` y sombras en malva profundo `#B66C8A`.
3. **Arbustos Estilizados en Rosa Mágico (`#FD9DA9`)**:
   - Modelos libres de derechos CC0 `plant_bush.glb`, `plant_bushDetailed.glb` y `plant_bushSmall.glb` en `assets/mystic/`.
   - Acabado estándar mate de color `#FD9DA9` con rugosidad $0.82$, distribuidos con frondosidad a lo largo de los 4 cuadrantes.
4. **Césped Disperso a Densidad Reducida ($35\%$) en `#FD9DA9`**:
   - Reducción dinámica de densidad al $35\%$ mediante `StylizedGrass.setDensityFactor(0.35)`.
   - Raíces malva `#B66C8A` en armonía con las sombras de los árboles y puntas en rosa vibrante `#FD9DA9`.
5. **Rocas Pizarra con Flores Adyacentes (`#FDADB4`)**:
   - Modelos libres de derechos de rocas pizarra (`rock_smallA.glb`, `rock_smallB.glb`, `rock_smallFlatA.glb`, `stone_smallA.glb`) en gris pizarra `#3b4a54` combinadas e integradas con flores CC0 (`flower_redA.glb`, `flower_redB.glb`) de color `#FDADB4` brotando de sus grietas.
6. **Setas y Champiñones Místicos (`#D4595D`)**:
   - Modelos libres de derechos CC0 (`mushroom_red.glb`, `mushroom_redGroup.glb`, `mushroom_redTall.glb`) en `assets/mystic/`.
   - Sombrero carmesí en `#D4595D` y tallo beige pastel `#F1E4E8`.
   - Organizados en clústeres mágicos y arboledas en los 4 cuadrantes.
7. **Colisiones Físicas y Transición Reversible**:
   - 12 círculos de colisión registrados dinámicamente en `OverworldCollisions` para rocas grandes y clústeres de setas con la etiqueta `mystic_prop`.
   - Transición instantánea mediante portales cardinales hacia Bosque, Sabana o Ártico con cambio inmediato de paleta, props y colisiones.

---

## 10. Bioma Mazmorra / Bosque Corrupto por las Quimeras (Quinta y Última Zona Especializada)
Siguiendo las especificaciones del usuario para el quinto y último bioma especializado, la Mazmorra (`dungeon`) transforma el entorno en un **bosque marchito y corrupto por las quimeras**, con una estética tétrica, deplorable y opresiva, despojada de colores alegres o naturales:

1. **Color de Suelo Cenizo y Corrupto (`#231D28`)**:
   - Uniform `uGroundColorOverride: #231D28` en `StylizedGround.js`.
   - Cálculo procedimental de borde `dungeonSoil` (`mix(vec3(0.14, 0.11, 0.16), vec3(0.20, 0.15, 0.22), soilNoise)`), fundiendo el empedrado con un contorno orgánico de cenizas descompuestas sin ningún color alegre.
2. **Árboles Retorcidos sin Hojas (`StylizedTrees.js`)**:
   - Método dinámico `setLeafless(true)` que desactiva de inmediato la visibilidad de las mallas instanciadas de hojas (`instancedMesh.visible = false`), exponiendo las ramas desnudas, retorcidas y bifurcadas del modelo `tree-tronk.glb`.
   - Método `setTrunkColor(0x1E1820)` que quema la textura de la madera a un carbón necrótico profundo con rugosidad $0.92$.
   - Al retornar a Bosque, Ártico o Místico, `setLeafless(false)` y `setTrunkColor(null)` restauran la canopia frondosa y tono natural.
3. **Árboles Secundarios Muertos y Calcinados (CC0)**:
   - Modelos libres de derechos `tree_oak.glb` en `assets/dungeon/`, filtrados para ocultar sus mallas de follaje y renderizar exclusivamente sus ramas secas retorcidas con el acabado calcinado `#1E1820`.
4. **Zarzas y Arbustos Marchitos (`#3D2D38`)**:
   - Modelos CC0 libres de derechos `plant_bush.glb`, `plant_bushDetailed.glb` y `plant_bushSmall.glb` en `assets/dungeon/`.
   - Material mate deshidratado en tono mora seca/zarza marchita `#3D2D38` con rugosidad $0.90$.
5. **Rocas de Obsidiana Maldita (`#201B24`)**:
   - Modelos CC0 `rock_smallA.glb`, `rock_smallFlatA.glb` y `stone_smallA.glb` en `assets/dungeon/`.
   - Acabado en obsidiana angular y pizarra negra `#201B24` con rugosidad $0.88$.
6. **Flores Quiméricas Tóxicas (`#5C1D38`)**:
   - Modelos CC0 `flower_redA.glb` y `flower_redB.glb` en `assets/dungeon/`.
   - Tintadas en violeta tóxico/carmesí quimérico `#5C1D38` brotando de las grietas de la obsidiana y a los pies de los árboles muertos.
7. **Césped Necrótico a Densidad Mínima ($22\%$)**:
   - Reducción drástica de densidad al $22\%$ mediante `StylizedGrass.setDensityFactor(0.22)` (3.960 briznas secas).
   - Raíces en púrpura mortecino `#1C1521` y puntas en ceniza `#42343F`. Flores silvestres convencionales ocultadas (`showFlowers: false`).
8. **Niebla Opresiva y Tétrica (`FogExp2` $\rho = 0.022$, `#181220`)**:
   - Niebla exponencial $4.4\times$ más densa que en los demás biomas ($\rho = 0.022$ frente a $0.005$), limitando la visibilidad a $\sim 18\text{m}$ y sumergiendo el horizonte en tinieblas y sombras opresivas.
9. **Colisiones Físicas y Reversibilidad Completa**:
   - 12 círculos de colisión física registrados en `SpatialCollisionSystem` (`dungeon_prop_0` a `11`) para las rocas de obsidiana y árboles muertos en los 4 cuadrantes.
   - Verificación automatizada de transición bidireccional fluida de ida y vuelta (`zone_3_5` $\leftrightarrow$ `zone_3_4`) garantizando la reactivación instantánea de hojas y despeje de la niebla al volver al Bosque.

