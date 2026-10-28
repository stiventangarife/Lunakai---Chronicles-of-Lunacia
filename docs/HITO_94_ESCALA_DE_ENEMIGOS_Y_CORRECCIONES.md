# Hito 94: Tamaño de los enemigos, retratos del fin de combate y correcciones del mundo

> **Estado:** en la versión de prueba (28-oct-2026), pendiente de probarlo en el juego.
> **Pedido:**
> 1. Los enemigos con remesh deben verse grandes sin salirse de la casilla de combate (los extremos pueden asomar un poco), y en el mundo abierto los que son más altos que el Sapidae se veían pequeños.
> 2. Lista de revisión:
>    - retratos de los Axies por ID en el panel de victoria y derrota;
>    - paredes invisibles junto al mar, donde está la balsa (Mística);
>    - saltos de la cámara en el arco de entrada de Génesis;
>    - luz y chispas de la Forja descentradas;
>    - las botas cambian el color del pantalón (desactivarlo);
>    - gaviotas en el horizonte del mar del Bosque y la Sabana.

## 1. Tamaño de los enemigos en combate (`src/tactics/Unit.js`)

Los modelos nuevos ya no miden 1 m. Con la escala de siempre, algunos ocupaban varias casillas (bear-dad llegaba a 2,6 m de alto y 3,5 m de ancho).

**Ahora** cada enemigo usa la escala que pida (por tipo, por nivel o por misión), pero se reduce si no cabe:
- **El cuerpo:** el 85 % de sus vértices (distancia horizontal al centro de la casilla) debe quedar dentro del bloque visible de la casilla (1,6 m × 0,94).
- **Los extremos** (brazos, colas, armas): pueden salir hasta el 115 % de media casilla, unos 17 cm del borde visible.
- **Cálculo:** se mide una vez por GLB y vale para cualquier dirección a la que mire. No se aplica al Sapidae ni al zorro.
- **Ajustes:** las constantes `BODY_PERCENTILE`, `BODY_FILL` y `SPILL_MAX` están al principio del archivo.

| Modelo | Escala pedida | Queda | Alto |
|---|---|---|---|
| dryad-fighter / dryad-range | 1,5 | 1,28 / 1,26 | 1,68 m |
| werewolf-boss | 2,1 | 1,72 | 1,72 m |
| bear-dad | 2,05 | 1,07 | 1,34 m (lo limita el hacha) |
| treant-flower | 1,25 | 1,17 | 1,24 m |
| wolf-alpha / wolf-aquatic-alpha | 1,65 / 1,6 | 1,27 | 0,85 / 1,16 m |

Los slimes, wolf-gray, wolf-aquatic, dryad-mage y bear-mom no cambian: ya cabían.

## 2. Tamaño de los enemigos en el mundo (`src/rpg/WanderingMonsters.js`)

El Sapidae mide ~2,3 m en el mundo, pero los enemigos usaban la escala del combate. **Ahora** los grandes tienen un alto mínimo en «alturas de Sapidae» (`WORLD_MIN_HEIGHT`):

| Enemigo | Mínimo | Antes → ahora |
|---|---|---|
| werewolf-boss | ×1,5 | 2,1 → 3,45 m |
| bear-dad | ×1,4 | 2,6 → 3,2 m |
| dryad-fighter / dryad-range | ×1,25 / ×1,2 | 2,0 → 2,9 / 2,8 m |
| dryad-mage | ×1,15 | 1,6 → 2,6 m |
| bear-mom | ×1,15 | 1,76 → 2,6 m |
| treant-flower | ×1,0 | 1,35 → 2,3 m |
| wolf-alpha / wolf-aquatic-alpha | ×0,75 | 1,1 / 1,46 → 1,7 m |

- **Solo agranda**, y conserva los multiplicadores propios (el jefe de la mazmorra ×1,15, las misiones).
- **Crecen con el modelo:** el aro de los pies, el radio de choque (máximo 1,6 m) y la placa de nombre.

## 3. Retratos de los Axies por ID en el fin de combate (`src/main.js`)

**Causa:** el panel de victoria y derrota pedía el retrato que faltaba con `getPortrait(axieId)`, que busca un GLB con ese nombre (no existe). La línea de turnos tenía el mismo fallo.

**Ahora:**
- `_requestPortrait(key)`: si la clave es un ID de Axie, usa `ensureAxiePortrait` con los genes del héroe (Hito 93); si no, sigue con `getPortrait`.
- Lo usan el panel de fin de combate (`resolvePortrait`), la línea de turnos y la petición de retratos al empezar el combate.
- `_getHeroPortrait` devuelve primero la foto 3D del Axie (clave en texto) y después su imagen.

## 4. Botas y pantalón (`src/rpg/SapidaeModularController.js`)

Las botas teñían las piernas del color de su rareza (azul, verde, ámbar…). **Ahora** está desactivado con `BOOTS_TINT_LEGS = false`: el pantalón conserva el color de la personalización. Se puede reactivar cuando las botas tengan malla propia.

## 5. Luz y chispas de la Forja (`src/rpg/world/ForgeStation.js`)

La boca del horno estaba puesta a mano para el modelo anterior. **Ahora** se mide en `forja.glb`: es el centro de los vértices con el brillo naranja del fuego, a escala 6,5, 1,63 m por delante del centro del edificio, x −0,36, y 1,35.
- **Chispas:** salen de la boca del horno.
- **Luz:** va 0,4 m por delante de la boca.

## 6. Arco de entrada de Génesis y la cámara

**Causa:** la puerta del Santuario es una sola malla. La cámara (`CameraOcclusion`) la trataba como una caja que incluía también el hueco del arco:
- **al salir** con el arco detrás, la cámara se acercaba de golpe hasta el personaje;
- **al entrar** en la caja, esta dejaba de contar y la cámara volvía a alejarse.

**Ahora:**
- **`CameraOcclusion`:** una malla puede traer sus propias cajas (`userData.cameraBoxes`, en sus ejes locales) o pedir que se ignore (`userData.cameraIgnore`).
- **`GenesisLandmarks._buildGate`:** da cajas a los pilares, el dintel, los muros y los obeliscos. El velo, las llamas y el brillo no acercan la cámara.

**Prueba:**

| | Hueco del arco | Pilar | Muro |
|---|---|---|---|
| Antes | 0,13 (salto) | 0,13 | 0,13 |
| Ahora | **1 (libre)** | 0,13 | 0,21 |

## 7. Paredes invisibles junto al mar en la Mística (`MysticIsland.js`)

**Causa:** la ladera por la que el terreno baja al mar (r ≥ 134 m) llega a 35–39°, justo por encima del límite de 35°. Quedaba una franja de ~6 m de hierba que no se podía bajar antes del agua:
- junto al barquero y la balsa, al este;
- y en varios tramos más de la costa (oeste, suroeste y norte).

**Ahora** (`openCoast`), en esa ladera las pendientes de hasta 41° se pueden bajar. Recorriendo toda la costa (cada 1° y cada 0,5 m): de 441 puntos bloqueados a 0. La pendiente máxima de la costa queda en 33°.

## 8. Gaviotas (`src/rpg/world/Seagulls.js`, nuevo)

En el Bosque y la Sabana planean 3 bandadas de 6 gaviotas sobre el mar, lejos de la costa:
- **Bosque:** entre 150 y 210 m del centro, a 18–32 m de altura.
- **Sabana:** entre 135 y 190 m del centro, a 16–30 m de altura.

**Cómo se dibujan:**
- **Malla:** una gaviota de 17 triángulos hecha por código. Todas juntas son una sola malla instanciada, una llamada de dibujo.
- **Aleteo:** se hace en la GPU. La mayor parte del tiempo planean y cada pocos segundos aletean un rato.
- **Color:** blanco y gris sin luz, con niebla, porque desde abajo y a contraluz se veían oscuras.
- **Zona:** van dentro del grupo de la zona y se ocultan con ella.
- **Cámara:** no la acercan (`cameraIgnore`).

## 9. Modelos de enemigos con remesh (`assets/models/`)

El usuario rehízo los 17 enemigos de prioridad alta y media. La revisión está en la página «Remesh de modelos Lunakai».

| Modelo | Triángulos (antes → ahora) | KB | Nota |
|---|---|---|---|
| slime | 8.965 → 1.544 | 151 | Sin Draco (lo cargan cargadores sin Draco); origen en la base. |
| slime-attack | 10.291 → 1.542 | 124 | Forma nueva: gota alta con la pinza en la cara. |
| slime-defese | 10.072 → 1.540 | 158 | |
| slime-support | 9.216 → 1.532 | 142 | |
| slime-forest-a | 10.537 → 1.482 | 198 | |
| slime-forest-b | 10.336 → 2.048 | 158 | Flota a propósito (globo). |
| slime-fusion | 10.069 → 2.713 | 243 | Flota a propósito (nave). |
| wolf-alpha | 11.185 → 6.331 | 429 | Más largo, otra silueta. |
| wolf-gray | 10.701 → 6.316 | 446 | |
| wolf-aquatic | 10.578 → 3.148 | 244 | |
| wolf-aquatic-alpha | 10.113 → 6.321 | 432 | |
| dryad-fighter | 11.026 → 3.678 | 322 | |
| dryad-range | 10.846 → 4.210 | 397 | Sin el bastón blanco (se queda así). |
| dryad-mage | 10.640 → 6.312 | 375 | Flota 10 cm a propósito. |
| bear-mom | 10.218 → 4.215 | 365 | Sin la sartén (se queda así). |
| bear-dad | 10.168 → 4.108 | 480 | Con hacha y mochila. |
| treant-flower | 11.026 → 4.256 | 567 | **Modelo nuevo: Slime Knight** (apartado 10). Antes era una copia de la dríade. |

**Total:** de 176.000 a 61.300 triángulos.
- **Revisado en todos:** sin Draco, con textura de metal/rugosidad (sin ella el glTF se ve metal oscuro) y doble cara. Ninguno tiene esqueleto ni animaciones, igual que antes.
- **Tamaño en el juego:** lo ajustan las reglas de los apartados 1 y 2.

## 10. Slime Knight (antes «Treant Florido»)

El enemigo del Ártico con el modelo nuevo (slime con cuernos, escudo y mazas de hongo) cambia de nombre y de hechizos. El id interno sigue siendo `treant_flower` / `treant-flower`, para no romper partidas guardadas, niveles ni misiones.

| Texto | Español | Inglés |
|---|---|---|
| Nombre (`enemies.arch.treant_flower.name`) | Slime Caballero | Slime Knight |
| Tipo en la ficha de combate (`game.archTreant`) | Caballero Slime de Escarcha | Frost Slime Knight |
| Hechizo 1 (`treant_flower_slam`) | Mazazo Helado: golpe aplastante con su maza de hongo cubierta de escarcha | Frosted Mace Smash |
| Hechizo 2 (`treant_flower_nova`) | Lluvia de Esporas Heladas: sacude sus mazas de hongo y suelta esporas heladas en cruz | Icy Spore Shower |
| Origen de la Madera (`items.mat_wood.source`, `EconomyCatalog`) | … · Slimes Caballero del Ártico | … · Arctic Slime Knights |

- **Misiones y niveles:** los combates del Ártico (`quimera_frost3`, `guard_frost_a`, `quimera_frost_shaman`) y los grupos del mundo toman el nombre del texto, así que ya dicen «Slime Caballero» / «Slime Knight».
- **Sin cambios:** el «Espectro del Vacío» de la misión del Oráculo usa el mismo modelo teñido de morado, pero conserva su propio nombre. El daño, el coste y los efectos de los hechizos tampoco cambian.

## 11. Retratos de combate (`assets/portraits/`)

Se rehicieron los retratos de los 17 enemigos desde sus modelos nuevos: los 7 slimes, los 4 lobos, las 3 dríades, los 2 osos y Slime Knight.
- **Formato:** 256 px con fondo transparente, hechos con la función de foto del juego (`captureModel`) y el contorno.
- **Archivos:** con el mismo nombre que el modelo (`slime.png`, `wolf-alpha.png`, `treant-flower.png`…), así que no hay que tocar código.
- **werewolf-boss:** no cambió de modelo y conserva su retrato.

## 12. Archivos

| Archivo | Cambio |
|---|---|
| `src/tactics/Unit.js` | Escala de los enemigos según la casilla. |
| `src/rpg/WanderingMonsters.js` | Alto mínimo de los enemigos grandes en el mundo. |
| `src/main.js` | `_requestPortrait`; retratos de Axies por ID en el fin de combate y en la línea de turnos. |
| `src/rpg/SapidaeModularController.js` | `BOOTS_TINT_LEGS = false`. |
| `src/rpg/world/ForgeStation.js` | Boca del horno medida en el modelo. |
| `src/rpg/CameraOcclusion.js` | `userData.cameraBoxes` y `userData.cameraIgnore`. |
| `src/rpg/world/islands/dungeon/GenesisLandmarks.js` | Cajas de cámara de la puerta del Santuario. |
| `src/rpg/world/islands/mystic/MysticIsland.js` | `openCoast`: la ladera de la costa se puede bajar. |
| `src/rpg/world/Seagulls.js` | **Nuevo.** Gaviotas. |
| `src/rpg/world/demo_scena/DemoScenaZone22.js`, `src/rpg/world/savanna/SavannaZone.js` | Crean y animan las gaviotas. |
| `assets/models/` (17 enemigos) | Remesh del usuario (apartado 9). |
| `assets/portraits/` (17 enemigos) | Retratos nuevos (apartado 11). |
| `src/i18n/{es,en}/enemies.js`, `spells.js`, `game.js`, `items.js`, `src/tactics/Spells.js`, `src/tactics/data/EconomyCatalog.js`, `src/rpg/world/BiomeEnemyCatalog.js` | Slime Knight (apartado 10). |

## 13. Pendiente

- Probarlo en el juego:
  - un combate con dríades, osos y lobos alfa;
  - el mundo con los mismos enemigos;
  - ganar y perder con un Axie por ID;
  - cruzar el arco de Génesis;
  - bajar a la orilla junto a la balsa de la Mística;
  - mirar el horizonte en el Bosque y la Sabana.
- El Santuario del Origen de Génesis también es una sola malla. Si la cámara salta dentro de él, se le pueden dar cajas igual que a la puerta.
- Iconos de los hechizos de Slime Knight: siguen siendo los del treant (`assets/skills/mobs/treant-flower/`).
