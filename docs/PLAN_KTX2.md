# Plan KTX2: etapa 1 (ETC1S) y etapa 2 (UASTC)

Base: `docs/DIAGNOSTICO_KTX2_Y_PROPS.md` (30-oct-2026). Este documento es la lista para revisar a mano antes de convertir.

## Quién hace qué

- **Conversión (en tu PC).** Desde aquí no puedo instalar las herramientas: la red de mi entorno bloquea GitHub (KTX-Software) y el registro de npm (`gltf-transform`), y no tengo una terminal en tu equipo. Yo preparo los scripts listos para ejecutar (`tools/ktx/`) y tú los lanzas.
- **Código del juego (yo).** Lector KTX2 compartido, conectado a todos los lectores de modelos y texturas, y ajustes donde haga falta.
- **Verificación (los dos).** Yo reviso con `lkDebug.assets.audit()` y `lkDebug.perf` (que cargue sin errores, memoria, tirones). Tú revisas a ojo la calidad: ETC1S pierde algo de detalle.

## Etapa 0: preparación (una vez)

| # | Quién | Qué |
|---|---|---|
| 0.1 | Tú | Instalar KTX-Software (incluye `toktx`, que debe quedar en el PATH) y `npm i -g @gltf-transform/cli`. |
| 0.2 | Tú | Copiar de `three@0.160.0` (la misma versión que `vendor/three.module.js`): `examples/jsm/loaders/KTX2Loader.js` → `vendor/loaders/KTX2Loader.js`; `examples/jsm/libs/ktx-parse.module.js` y `zstddec.module.js` → `vendor/libs/`; `examples/jsm/libs/basis/basis_transcoder.js` y `.wasm` → `vendor/libs/basis/`. |
| 0.3 | Yo | `src/render/Ktx2.js`: un solo `KTX2Loader` con `detectSupport(renderer)`, conectado al `GLTFLoader` de `ModelCache`, `CharacterPortraitService` y `CharacterPreviewDiorama`, y a los `TextureLoader` que cargan PNG sueltos (`GenshinTrees`, `GenshinForestArt`, `IslandTerrainMaterial`, `GrandIslandZone`): si la ruta termina en `.ktx2`, usa el lector KTX2. |
| 0.4 | Yo | Script `tools/ktx/gltf-uri.mjs`: en los `.gltf` con imágenes externas, cambia `X.png` por `X.ktx2` y añade `KHR_texture_basisu`. Así todos los `.gltf` que usan la misma imagen apuntan al mismo `.ktx2`. |
| 0.5 | Tú | Medición base: recargar, `lkDebug.assets.audit()` en cada isla, `export()`; y una grabación `lkDebug.perf` de un viaje. |

## Etapa 1: ETC1S (color opaco)

Solo se convierte la textura de color (`baseColorTexture`). Los mapas de normales, el follaje y los personajes esperan a la etapa 2.

### 1A. Props del pueblo y de las islas: `assets/environment/*.glb`

| Archivo | Dónde se ve | Tamaño propuesto | Revisar |
|---|---|---|---|
| `altar_atia.glb` | Pueblo, Sabana, Ártico | 1024 | |
| `balsa.glb` | Pueblo, Sabana, Ártico | 1024 | |
| `bridge.glb` | Zona 2-2 | 1024 | |
| `bus.glb` | Pueblo | 1024 | |
| `cartel_fish.glb` | Puntos de pesca | **512** | si tiene texto, que se lea |
| `dojo.glb` | Pueblo | 1024 | |
| `forja.glb` | Pueblo | 1024 | |
| `house.glb` | Pueblo, Sabana, Ártico | 1024 | |
| `lamp.glb` | Pueblo | **512** | |
| `parada.glb` | Pueblo | 1024 | si tiene texto, que se lea |
| `shop.glb` | Pueblo, Ártico | 1024 | letreros |
| `shop_fish.glb` | Pueblo | 1024 | letreros |
| `totem.glb` | Pueblo, Ártico | 1024 | |
| `flag.glb` | Ártico | 1024 | |
| `statue_mystic.glb` | Nebulosa | 1024 | |
| `table_surf.glb` | Sabana | 1024 | |
| `totem_2.glb` | Sabana | 1024 | |
| `totem_ice.glb` | Ártico | 1024 | |
| `arco.glb`, `baston.glb`, `doble.glb`, `hacha.glb`, `lanza.glb`, `mana.glb`, `mando.glb`, `peluche.glb` | Genesis | **512** | |
| `atias.glb`, `bones.glb` | no salieron en el diagnóstico | — | confirmar si se usan antes de convertir |

### 1B. Rocas y caminos: imágenes compartidas por `.gltf` (`assets/nature/`)

Se convierte la imagen una vez y se actualizan los `.gltf` que la usan (script 0.4).

| Imagen | `.gltf` que la usan (el script lo confirma leyendo cada uno) | Tamaño propuesto |
|---|---|---|
| `Rocks_Diffuse.png` | `Rock_Medium_1…3` | 1024 |
| `PathRocks_Diffuse.png` | `Pebble_Round_1…5`, `Pebble_Square_1…6`, `RockPath_Round_*`, `RockPath_Square_*` | **512** |
| `Rocks_Desert_Diffuse.png` | no salió en el diagnóstico | confirmar uso |

### 1C. Rocas de la Sabana: textura dentro del GLB

| Archivo | Tamaño propuesto | Nota |
|---|---|---|
| `nature/rocks/Rock_sabana1…5.glb` | 1024 | Las 5 llevan la misma `Rocks.png`. Más adelante, unificarla ahorra 4 copias más. |

### 1D. Corteza

| Imagen | La usan | Revisar |
|---|---|---|
| `nature/Bark_TwistedTree.png` (y su copia `nature/twisted/`) | `TwistedTree_1…5.gltf` y `GenshinTrees.js` | |
| `nature/Bark_NormalTree.png` | `CommonTree_1…5.gltf`, `Pine_1…5.gltf` y `GenshinTrees.js` | En los `.gltf` su material tiene `alphaMode: MASK`. Si la corteza tiene huecos transparentes, pasa a UASTC (etapa 2). |
| `nature/Bark_DeadTree.png` | `DeadTree_1…5.gltf` y `GenshinTrees.js` | |

`GenshinTrees.js` las carga como PNG suelto (`TextureLoader`, con la imagen volteada). Una textura KTX2 no se voltea al subirla: lo ajusto en el código (paso 0.3).

### 1E. Otros

| Archivo / imagen | La usan | Tamaño propuesto | Revisar |
|---|---|---|---|
| `nature/Mushrooms.png` | `Mushroom_Common.gltf`, `Mushroom_Laetiporus.gltf` | **512** | |
| `nature/Grass.png` | `Grass_Common_*`, `Grass_Wispy_*` | se queda | Material `OPAQUE`. Si se ven bordes, pasa a UASTC. |
| `savannah/cactus_forge3D.glb` | Sabana | 1024 | |

**Resultado esperado de la etapa 1:** unas 45 texturas de color, de ~240 MB a ~30 MB en la tarjeta gráfica, sumando todas las islas.

## Etapa 2: UASTC (normales, follaje y personajes)

### 2A. Mapas de normales

| Archivo / imagen | Slot |
|---|---|
| Todos los GLB de 1A (sus `normal` de 512; `lamp.glb` lo tiene de 1024) | `normalTexture` |
| `nature/Bark_TwistedTree_Normal.png` (y la copia en `twisted/`), `Bark_NormalTree_Normal.png`, `Bark_DeadTree_Normal.png` | imagen externa + `GenshinTrees.js` |

### 2B. Follaje con recorte (`alphaMode: MASK`)

| Imagen | La usan |
|---|---|
| `Leaves.png` | `Fern_1`, `Plant_1`, `Plant_7`, `Clover_*`, `Flower_3/4_Group` |
| `Flowers.png` | `Flower_*`, `Bush_Common_Flowers`, `Petal_*` |
| `Leaves_ForestGreen_C.png` | `Bush_Common` |
| `Leaves_NormalTree_C.png` | `CommonTree_*`, `Bush_Common_Flowers` |
| `Leaves_TwistedTree_C.png` (y copia en `twisted/`) | `TwistedTree_*` |
| `Leaf_Pine_C.png` | `Pine_*` |
| `Leaves_GiantPine_C.png`, `Leaves_NormalTree.png`, `Leaves_TwistedTree.png`, `Leaf_Pine.png` | no salieron en el diagnóstico: confirmar uso |

### 2C. Criaturas: color UASTC + normales UASTC + rugosidad/metal ETC1S

| Archivo | Nota |
|---|---|
| `models/slime.glb`, `slime-attack.glb`, `slime-support.glb`, `slime-forest-a.glb` | |
| `models/wolf-alpha.glb`, `wolf-aquatic.glb`, `wolf-aquatic-alpha.glb` | |
| `models/treant-flower.glb`, `dryad-fighter.glb`, `dryad-mage.glb`, `dryad-range.glb`, `bear-mom.glb` | |
| `models/werewolf-boss.glb` | color 2048 → **1024** |
| `models/bear-dad.glb`, `golem-bell.glb`, `golem-hat.glb`, `golem-sentinel.glb`, `golem-shell.glb`, `slime-defese.glb`, `slime-forest-b.glb`, `slime-fusion.glb`, `wolf-gray.glb` | No salieron en el diagnóstico (no estaban en escena). Misma familia: revisar que tengan las mismas texturas. |

### 2D. Axies y NPC con modelo propio

| Archivo | Nota |
|---|---|
| `models/kotaro.glb`, `xia.glb`, `tripp.glb`, `kibo.glb`, `paladill.glb`, `atias.glb`, `kappa.glb`, `scroll_keeper.glb` | color UASTC; normales UASTC donde las haya |
| `models/bing.glb`, `buba.glb`, `pomodoro.glb`, `statue_atia.glb`, `nature/palms/PalmTree_1…5.glb` | No salieron en el diagnóstico: confirmar uso y tipo. |

## No se convierten

- `models/Sapidae_Kai.glb`, `Sapidae_Ema.glb`, `Sapidae_female*.glb`, `sapidae-*.glb`, `models/sapidae/`: el juego las tiñe leyendo sus píxeles.
- `assets/axie/` (texturas del mezclador de Axies).
- `savannah/cactus_short`, `cactus_tall`, `rock_*`, `stone_*`, `tree_*`: modelos sin textura (colores por vértice o material).
- Interfaz, retratos, cartas e iconos.

## Cómo se hace cada etapa

1. Copia de seguridad de los archivos de la etapa en `backups/<fecha>_ktx2_etapaN/assets/…`.
2. Tú ejecutas `tools/ktx/etapaN.ps1`:
   - GLB: `gltf-transform etc1s` (o `uastc`) con `--slots` del tipo de textura, y `gltf-transform resize` donde se propone 512;
   - imágenes sueltas: `toktx --t2 --encode etc1s --genmipmap --assign_oetf srgb` (normales: `--encode uastc --assign_oetf linear`);
   - `.gltf`: el script 0.4.
3. Yo verifico: carga sin errores ni avisos, `lkDebug.assets.audit()` (las texturas salen como «comprimida») y una grabación `lkDebug.perf` del mismo viaje que la base.
4. Tú revisas a ojo, sobre todo letreros, texto y detalles finos. Si algo se ve mal, solo ese archivo vuelve a PNG (o pasa a UASTC).
5. Se documenta en el hito.
