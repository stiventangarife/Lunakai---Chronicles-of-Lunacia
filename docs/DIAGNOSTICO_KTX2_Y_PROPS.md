# Diagnóstico de texturas (KTX2) y props (triángulos)

Fecha: 30-oct-2026. Datos: `lkDebug.assets.audit()` en Valle del Dojo, Desierto del Sol Naciente, Picos Glaciares, Nebulosa Astral y Jardines Reales de Genesis (`src/debug/AssetAudit.js`).

## 0. Cómo leer las cifras

- **MB = memoria estimada en la tarjeta gráfica**, no el peso del archivo. Una textura de 1024×1024 sin comprimir ocupa ~5,3 MB con mipmaps aunque el PNG pese 300 KB. En escritorio, KTX2 se convierte a BC1 (ETC1S, 0,5 B/px) o BC7 (UASTC, 1 B/px).
- **Es la suma de las cinco islas.** En un momento dado solo está cargada la isla activa (las demás liberan sus texturas al viajar) y el Sapidae solo tiene en la GPU las piezas que se ven. El total real en un instante es bastante menor.
- **Los triángulos de criaturas y NPC salen dobles:** el contorno de dibujo animado es una copia de la malla. Un lobo de «12.662» tiene 6.331 triángulos de modelo.
- `tamM` de las mallas instanciadas del pueblo del Bosque (`ForestVillage_*`) no es fiable (no incluye la escala de cada copia).

## 1. Resumen

| | Texturas | MB ahora | MB con KTX2 |
|---|---|---|---|
| ETC1S | 89 | 480 | 63 |
| UASTC | 58 | 183 | 45 |
| Mantener PNG (Sapidae: se tiñe) | 115 | 604 | 604 |
| Mantener (las genera el juego) | 88 | 49 | 49 |
| **Total** | **350** | **1.316** | **762** |

El 85 % de lo que se puede comprimir pasa de ~663 MB a ~108 MB. Lo que no se puede tocar es el Sapidae (se tiñe leyendo píxeles) y las texturas generadas en el juego (máscaras, canvas).

## 2. Antes de KTX2: texturas duplicadas

Varios GLB llevan dentro **la misma imagen**, y cada uno la sube a la tarjeta gráfica por separado. Unificarlas ahorra memoria sin tocar la calidad:

| Imagen | Copias | Archivos |
|---|---|---|
| `Rocks.png` | 5 | `nature/rocks/Rock_sabana1…5.glb` |
| `Rocks_Diffuse` | 3 | `nature/Rock_Medium_1…3.gltf` |
| `PathRocks_Diffuse` | 3 | `nature/Pebble_Round_1…3.gltf` |
| `Flowers` | 3 | `Flower_3_Group`, `Flower_4_Group`, `Bush_Common_Flowers` |
| `T_Char_Sapidae_Kai_Body_C`, `HeadA_C`, `Pants_C` | 6 cada una | `Sapidae_Kai.glb` y `sapidae-m-a…e.glb` (NPC) |
| `T_Char_Sapidae_Ema_Cheek_C`, `Body_C`, `HeadA_C`, `Pants_C` | 4–5 cada una | `sapidae-f-a…e.glb` (NPC) |
| `T_Char_Sapidae_Kai_Eyes*/Hair*/Head*/Mouth*/Shirt*` | 2 cada una | `Sapidae_Kai.glb` y el NPC `sapidae-m-*` correspondiente |

- Rocas: 8 copias de más ≈ 42 MB.
- NPC Sapidae: ~50 copias de imágenes que ya tiene el jugador ≈ 260 MB en el peor caso (todas las variantes subidas).
- Se puede hacer de dos formas: en los archivos (que los GLB compartan un `.png` externo: `.gltf` + imagen, o `gltf-transform` con texturas externas) o en el juego (al cargar un GLB, si una imagen tiene la misma huella de contenido que otra ya cargada, reutilizar esa textura; `imageFingerprint` ya existe). Ojo con el Sapidae del jugador: libera las texturas de las piezas ocultas, así que sus texturas no deben compartirse con NPC visibles.
- `#islas`: `house`, `shop`, `totem`, `altar_atia`, `balsa` se cargan dos veces (pueblo del Bosque y islas) con claves distintas. No coinciden en la misma isla, así que no duplica memoria a la vez.

## 3. Texturas → ETC1S (color opaco y mapas de material)

| Grupo | Archivos | Textura | MB ahora → KTX2 |
|---|---|---|---|
| Pueblo del Bosque | `environment/shop, forja, house, parada, bus, altar_atia, dojo, totem, lamp, shop_fish, balsa, bridge, cartel_fish .glb` | `texture_0` / color (1024) | 13 × 5,3 = 69 → 9 |
| Props de islas | `environment/totem_2, table_surf, flag, totem_ice, statue_mystic, peluche, lanza, hacha, doble, mando, baston, arco, mana .glb` | `texture_0` (1024) | 13 × 5,3 = 69 → 9 |
| Rocas | `nature/Rock_Medium_1…3.gltf`, `Pebble_Round_1…3.gltf`, `nature/rocks/Rock_sabana1…5.glb` | `Rocks*`, `PathRocks_Diffuse` | 11 × 5,3 = 58 → 8 (3 → 0,7 si además se unifican) |
| Corteza | `nature/Bark_TwistedTree.png`, `Bark_NormalTree.png`, `Bark_DeadTree.png`; `TwistedTree_1.gltf` (corteza) | color | 4 × 5,3 = 21 → 3 |
| Otros de naturaleza | `nature/Mushroom_Common.gltf`, `savannah/cactus_forge3D.glb`, `Grass_Wispy_Tall.gltf` (512) | color | 12 → 1,6 |
| Criaturas: rugosidad / metal | `slime, slime-support, slime-attack, slime-forest-a, wolf-alpha, wolf-aquatic, wolf-aquatic-alpha, treant-flower, dryad-range, dryad-mage, dryad-fighter, bear-mom .glb` | `Image_1` (roughness+metalness) | 12 × 5,3 = 64 → 8 |

## 4. Texturas → UASTC (normales, hojas con recorte y color de personajes)

| Grupo | Archivos | Textura | MB ahora → KTX2 |
|---|---|---|---|
| Mapas de normales | `Bark_*_Normal.png` (3), `TwistedTree_1.gltf`, los 12 GLB de criaturas (`Image_2`), `environment/lamp.glb` (1024) y el `normal` de 512 de todos los props del pueblo y de las islas | normal | 17 × 5,3 + 27 × 1,3 ≈ 126 → 31 |
| Follaje con recorte | `TwistedTree_1.gltf` (hojas), `Flower_3_Group`, `Flower_4_Group`, `Bush_Common_Flowers`, `Bush_Common`, `Fern_1`, `Plant_1`, `Plant_7` | `Leaves*`, `Flowers` | ~11 × 5 = 57 → 14 |
| **Color de criaturas y Axies** (recomendación mía: se ven de cerca en combate; la herramienta los marcó ETC1S) | criaturas (`Image_0` / `texture`), `models/kotaro, xia, tripp, kibo, paladill, atias, kappa, scroll_keeper .glb` | color (1024) | 20 × 5,3 = 106 → 27 |
| **Jefe** | `models/werewolf-boss.glb` | `werewolf-boss_basecolor.jpg` **2048×2048** | 21 → 5,3 (o 1,3 si se baja a 1024: mide 3,9 m) |

## 5. No convertir

- **Sapidae del jugador** (`Sapidae_Kai.glb`, 71 texturas): se tiñen leyendo sus píxeles (pelo, ropa, cuernos). Igual para los NPC `sapidae-m-*` / `sapidae-f-*` mientras el creador de personaje use esos mismos GLB y los tiña. Si los NPC tienen un aspecto fijo, se podría preparar una versión KTX2 solo para ellos.
- **Texturas de Axies del mezclador** (`assets/axie/.../MainTex`, uniform `uMainTex`): las gestiona el mezclador de Axies (`vendor/axie-mixer3d`); no tocarlas sin revisar ese flujo.
- **Generadas en el juego** (88: máscaras de agua y pendiente, canvas de teñido, `DataTexture`): no son archivos.

## 6. Bajar de resolución (además de KTX2)

| Textura | Motivo | Ahorro |
|---|---|---|
| `werewolf-boss_basecolor.jpg` 2048 → 1024 | jefe de 3,9 m | ×4 |
| `Rocks.png`, `PathRocks_Diffuse`, `Mushroom_Common` 1024 → 512 | piedras y setas de 0,5–2 m | ×4 |
| `cartel_fish.glb`, `lamp.glb` 1024 → 512 | props de ~1,5–2,5 m | ×4 |
| Armas de exhibición de Genesis (`hacha, lanza, doble, mando, baston, arco, mana, peluche`) 1024 → 512 | una sola textura por prop y se ven de lejos | ×4 |

## 7. Props a simplificar

Ordenados por triángulos ahorrados (dibujo + sombra; con 2 luces de sombra, cada triángulo con sombra se dibuja hasta 3 veces).

| Prop | Copias | Tris por copia | Sombra | Objetivo | Ahorro aprox. |
|---|---|---|---|---|---|
| Cactus de la Sabana (`cactus_forge3D.glb`, instanciado) | 39 | 2.166 | sí | ~800 y **sin sombra** | 53k dibujo + 84k sombra |
| Flores anime de la Zona 22 (`InstancedAnimeFlower_flower_group_4`) | 74 | 1.200 | no | ~500 | ~52k |
| Armas de exhibición de Genesis (`hacha 7.062, peluche 7.532, mando 5.688, mana 5.420, baston 4.740, doble 3.934, lanza 3.814, arco 3.214`) | 1 c/u | 3.200–7.500 | sí | ~2.500 c/u | ~21k dibujo + 21k sombra |
| Lámpara del pueblo (`lamp.glb`) | 6 | 5.297 | no | ~1.500 | ~23k |
| Setas (`Mushroom_Common`, instanciado) | 42 | 880 | no | ~300 | ~24k |
| Balsa (`balsa.glb`) | 4 en islas + 1 en el pueblo | 6.372 | no | ~2.500 | ~19k |
| Bandera (`flag.glb`) | 3 | 5.886 | sí | ~2.000 (es casi plana) | ~12k + 12k sombra |
| Cartel de pesca (`cartel_fish.glb`) | 3 | 3.642 | sí | ~1.200 | ~7k + 7k sombra |
| `GenesisLavenderPillars` (malla fusionada) | 1 | 47.744 | sí | revisar: quitar sombra o simplificar | hasta 48k de sombra |
| Mallas sin nombre `BufferGeometry` en Ártico (3 × 7.192, 14,7 m) y Genesis (5 × 6.488, 42,8 m) | 3 / 5 | 6.500–7.200 | sí | identificar qué son | — |

**Mantener:** casas (`house` 5.759, 8,5 m), `altar_atia`, `shop`, `forja`, `dojo`, `shop_fish`, `parada`, `bus`, `totem*`, `table_surf`, `statue_mystic` (5.358 × 2: opcional ~3.500). Son grandes y hay pocas copias.

**Criaturas y NPC:** el modelo real tiene 1.500–10.000 triángulos (lobo 6.331, jefe 10.009, kappa 6.462, dríades 3.700–6.300, slimes ~1.540). Es razonable para algo que se ve de cerca en combate. El contorno los duplica: si hiciera falta, el contorno se podría quitar a distancia antes que simplificar los modelos.

**Terreno:** cada isla tiene una malla de 131.072 triángulos (rejilla de 256×256). Es lo más pesado de la escena. Una rejilla de 128×128 (32.768) o un LOD por zonas ahorraría ~100k por fotograma, si la forma del terreno lo aguanta.

## 8. Orden recomendado

1. Unificar texturas duplicadas (rocas, flores; NPC Sapidae con cuidado). Sin pérdida de calidad.
2. Simplificar cactus, flores anime, lámpara, balsa, bandera, cartel y armas de Genesis; quitar sombra al cactus.
3. KTX2 en lotes, midiendo antes y después con `lkDebug.assets.audit()` y `lkDebug.perf`:
   - normales y follaje (UASTC);
   - props de pueblo e islas, rocas y corteza (ETC1S);
   - criaturas y Axies (UASTC para el color, ETC1S para rugosidad/metal).
4. Para KTX2 hace falta en el juego: `KTX2Loader` (con el transcodificador Basis en `vendor/`) conectado al `GLTFLoader` de `ModelCache` y `detectSupport(renderer)`. Conversión, por ejemplo con `gltf-transform` + KTX-Software: `gltf-transform etc1s in.glb out.glb --slots "baseColorTexture"` y `gltf-transform uastc in.glb out.glb --slots "normalTexture"`.

## 9. Cómo repetir el diagnóstico

1. Recargar la página (las rutas se anotan desde la carga).
2. En cada isla: `lkDebug.assets.audit()`.
3. `lkDebug.assets.export()` descarga el JSON.

Corrección del 30-oct: las texturas de un GLB vienen marcadas como «repetidas» por defecto en glTF; la herramienta ya no las cuenta como repetidas, así que propone «bajar a 512» para objetos pequeños.
