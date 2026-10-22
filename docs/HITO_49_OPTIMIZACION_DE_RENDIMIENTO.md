# Hito 49 — Optimización de rendimiento: islas, memoria y combate

> **Estado:** completado (21–22 oct 2026).
> **Pedido:** optimizar el juego (three.js r160, sin bundler) isla por isla y después los tableros de combate, sin cambiar la composición visual en calidad Alta, sin agrupar los árboles y sin tocar la vegetación. Cada tanda empezó con una revisión y un plan aprobado, y terminó con capturas de antes y después y una revisión independiente del código.

## 1. Resumen de resultados

| Área | Antes | Después |
| --- | --- | --- |
| Bosque: CPU de render por fotograma | 8,8 ms | 4,4–4,7 ms |
| Bosque: CPU de actualización | 2,3 ms | 1,6–1,8 ms |
| Bosque: GPU | ~11,3 ms | ~7,7–8,5 ms |
| Bosque: fotograma p95 | 22 ms | ~18 ms |
| Memoria de texturas en GPU | ~1220 MB | ~400 MB |
| Copias de imágenes en memoria (CPU) | ~920 MB | ~300 MB |
| Sabana: carga de partida | 8,6 s | 6,8 s |
| Sabana: viaje desde el Bosque | 4,5 s | 2,3–3,9 s |
| Sabana: texturas en GPU | 676 MB | 343 MB |
| Sabana en calidad Baja: GPU | 8,8 ms | 5,8 ms |
| Horizonte de islas lejanas (todas las islas) | 174 mallas | 9–11 mallas |
| Ártico: llamadas de dibujo / CPU de render | 407 / 3,7 ms | 334 / 3,1 ms |
| Bosque: llamadas de dibujo | 494 | 422 |
| Mística: llamadas de dibujo (vista de juego) | 349 | 340 |
| Combate: casillas rehechas en 4 s arrastrando la cámara | 113 | 26 |
| Combate: CPU por fotograma al arrastrar (media / máx.) | 5,9 / 15,8 ms | 4,2 / 6,2 ms |
| Combate: primer lanzamiento de Gero | fotograma de 73 ms | 18 ms |
| Combate: entrada (arena de pruebas en el tablero Oasis) | 1,35 s | 1,0 s |
| Combate: llamadas de dibujo del tablero | ~205 | ~180 |

Las medidas se tomaron en el navegador integrado con la partida «Auditoria». La GPU de ese equipo baja la frecuencia cuando tiene poca carga, así que los tiempos de GPU sirven para comparar, no como valor absoluto.

## 2. Bosque

| Cambio | Archivo |
| --- | --- |
| Peces, juncos, estelas y burbujas del río como `InstancedMesh` (el río pasa de ~600 objetos a 57); `forceSinglePass` en océano, río y peces. | `demo_scena/WaterManager.js`, `genshin/GenshinWater.js` |
| Sistemas de partículas en pausa cuando no se ven (caja recalculada cada 0,5 s); escala de las ráfagas guardada aparte. | `demo_scena/ParticleSystemManager.js` |
| Huellas: las 3 mallas se ocultan si no hay ninguna activa. | `demo_scena/FootstepEffectsManager.js` |
| Árboles pictóricos: recorte por árbol (instancias visibles primero, las que solo dan sombra después), con un registro por escena (`scene.userData.lkTreeCullers`). El LOD con fundido está implementado pero desactivado (`GenshinTrees.LOD_ENABLED = false`): no mejoraba y mezclar LOD costaba ~2 ms. | `genshin/GenshinTrees.js` |
| Caja de sombras del Bosque más ajustada (80) y con ajuste al texel (solo en el Bosque). | `demo_scena/LightingManager.js`, `DemoScenaZone22.js` |
| Calidad Media/Baja: densidad de hierba 0,55, partículas, rayos de sol, bloom 0,28 en Baja, mapa de sombras 1024. | `genshin/GenshinForestArt.js`, `genshin/GenshinGrassField.js` (`setDensity`) |
| El Bosque se construye solo si la partida empieza en él; si no, la primera vez que se viaja allí (`ensureForestBuilt`). | `OverworldManager.js`, `world/WorldMapManager.js` |
| El reloj de pausa por paneles solo cuenta un panel si de verdad está a la vista. | `OverworldManager.js` |

## 3. Memoria y texturas

- **40 modelos GLB con texturas reducidas:** slimes, lobos, osos, dríadas y treant a 1024; el jefe hombre lobo a 2048; Sapidae Ema y Kai con el cuerpo (`_Body_`) a 2048 y el resto a 1024; NPC, rocas de la Sabana y cactus a 1024. Originales en `D:\Proyectos Unity\Axie_Adventures_Tactics_backup\_backup_texturas_originales\assets\...`. Herramienta: `glb_resize.py` (cambia solo los bytes de la imagen dentro del GLB y recoloca el BIN).
- **Árboles antiguos diferidos:** el Bosque y la Sabana ya no cargan los modelos de árbol antiguos ocultos; se cargan solo si se desactiva el arte Genshin (`ensureLegacyTrees`). El árbol del Gran Árbol Ancestral (`tree_twisted_1`) se sigue cargando siempre.
- **Variantes del Sapidae:** las texturas de peinados, cabezas, camisas y sombreros que no se usan se liberan de la GPU (`lkNoPrewarm`); ojos y bocas se quedan porque cambian con las expresiones.
- **Islas inactivas:** al viajar se liberan de la GPU las texturas de las islas que no se ven y no se precalientan (`releaseTextures`, `skipRoots`).

## 4. Sabana

- Carga diferida de palmeras, árboles antiguos, `stylized_grass_blades` y las 8 texturas del catálogo (`SavannaAssetManager.loadAll({ deferKeys })`).
- `forceSinglePass` en arena, ráfagas y nenúfares.
- Calidad Media/Baja también en las islas del kit (`IslandArtLayer.applySettings`).
- Las islas se construyen **antes** de cambiar `currentMapId`, para que un fallo no deje el mapa a medias.

## 5. Horizonte de islas lejanas (Ártico, Bosque, Sabana, Mística y Genesis)

- **Nuevo `src/render/StaticMerge.js` → `mergeStaticByMaterial(root, { removeHidden, name, skip })`:** combina las mallas fijas que comparten material en una sola por material, con cada vértice en la misma posición del mundo. No combina mallas transparentes, instanciadas, con esqueleto, con varios materiales, con *morph targets*, con transformación espejo o con `renderOrder` / `onBeforeRender` propios. Ignora los grupos de la geometría (con un solo material three dibuja la malla entera).
- Se usa en `GrandIslandZone._buildHorizon()` (con `removeHidden`), `DemoScenaZone22` y `SavannaZone`: 174 → 9–11 mallas por isla.
- Anillos de bruma de `DistantIsland.addMistLayer` con `forceSinglePass` (color y opacidad uniformes, sin escritura de profundidad: mismo resultado).
- La luz de la forja (`ForgeStationLight`) se queda en la escena con intensidad 0 a propósito: quitarla cambiaría el número de luces y recompilaría todos los materiales.

## 6. Mística y Genesis

- **Mística:** cono y plataforma de cada islote flotante en una sola malla (21 → 14); partes fijas y opacas del observatorio, la casa, el sauce y el pilar en 2 mallas (los anillos de la esfera armilar siguen girando aparte). Los monolitos del santuario **no** se combinaron: son cristales translúcidos que orbitan y la estrella dejaría de verse a través del monolito de delante.
- **Minimapa:** el título bajo el minimapa muestra la isla real (`ISLAND_NAMES` + `canonicalZoneId`); antes decía «Isla del Bosque» en el Ártico, la Mística y Genesis.
- **Genesis:** revisada (205 llamadas de dibujo, viaje de 2,2 s). Sin cambios hasta que lleguen los modelos de los monumentos; entonces conviene revisar sus GLB (texturas ≤ 1024, pocos materiales) y combinar sus piezas fijas.

## 7. Tableros de combate

| Cambio | Archivo |
| --- | --- |
| La casilla bajo el cursor se calcula una vez por fotograma, al principio del fotograma de combate (`_hoverDirty` en `_animate`), y solo si cambió la casilla, la unidad activa, la carta, las casillas alcanzables, el paso del tutorial o los resaltados (`gridManager.highlightVersion`). | `src/main.js` (`_handleHover`, `_paintHover`) |
| Casillas resaltadas (movimiento, alcance, área, cursor y camino) con geometrías y materiales fijos y una reserva de mallas que se encienden y se apagan. Mismos tamaños, colores, opacidades y alturas. | `src/tactics/GridManager.js` |
| Ficha de la unidad: el HTML solo se reescribe si cambia, el tamaño se mide solo cuando cambia el contenido y la posición se actualiza una vez por fotograma. | `src/ui/CombatHUD.js` |
| Antes de abrir el combate, detrás del velo: tope de precalentado de 6 s (antes 3) y un fotograma con todo el escenario a la vista (`frustumCulled = false` un fotograma) para subir la geometría a la GPU y compilar los shaders de sombras. | `src/main.js` (`_prewarmBattle`) |
| Espera segura de shaders: `waitProgramsReady` deja de esperar programas que ya se borraron. `VfxBridge` ya no usa `renderer.compileAsync`, que con un material destruido no terminaba nunca y preguntaba cada 10 ms (avisos «glGetProgramiv: Program object expected»). | `src/render/RenderWarmup.js`, `src/vfx/VfxBridge.js` |
| **Nuevo `src/render/ProgramKeepAlive.js`:** cuando se destruye el último material de una receta, su shader se conserva (hasta 256), así que el siguiente efecto no lo recompila. No se aplica a `ShaderMaterial` (su clave cambia al destruirse). Se instala en `main.js` con `installProgramKeepAlive(renderer)`. | `src/render/ProgramKeepAlive.js` |
| Marcas en el suelo: una textura por tipo y una geometría compartidas (antes un lienzo nuevo subido a la GPU en cada impacto). | `src/tactics/GridManager.js` (`spawnImpactDecal`) |
| Estela de proyectiles: geometría compartida (antes una esfera nueva ~45 veces por segundo). | `src/tactics/combat/SpellPresentation.js` |
| Nubes del combate: una malla por nube (≈130 → 20 llamadas de dibujo). | `src/tactics/SceneManager.js` |

**No hecho (bajo impacto tras las mediciones):** guardar entre combates los cálculos del escenario (altura del terreno por casilla, plantillas de árboles) y las pequeñas asignaciones por fotograma del bucle de combate.

## 8. Reglas para el código nuevo

- **No crear y destruir materiales o texturas en cada evento o fotograma.** Compartirlos y reutilizar mallas (encender y apagar, o `InstancedMesh`). Si un efecto necesita su propio material (p. ej. para su opacidad), que sea de un tipo normal: `ProgramKeepAlive` conserva su shader.
- **No añadir ni quitar luces en juego:** cambia el número de luces y recompila todos los materiales. Usar `TransientLightPool` o luces fijas con intensidad 0.
- **Decorado fijo con muchas piezas:** pasarlo por `mergeStaticByMaterial` al construirlo (solo piezas opacas que no se mueven ni se consultan después; las animadas, con `skip`).
- **Texturas:** 1024 como norma; 2048 solo para jefes y el cuerpo del jugador.
- **Shaders y texturas antes de mostrar:** todo lo que aparezca en una isla o un combate debe pasar por el precalentado (`warmupRender`) detrás de la pantalla de carga o del velo.

## 9. Herramientas de medición

- `lkDebug.arena()` y `lkDebug.probar('id_de_carta', distancia)` (arena de pruebas); `lkDebug.perf.start()` / `.stop()` / `.hud(true)`.
- `renderer.info.render.calls`, `renderer.info.programs.length` y `renderer.info.memory` desde `game.sceneManager.renderer` (combate) o `game.overworldManager` (mundo abierto).
- El navegador integrado de la app se detiene cuando su panel está oculto: medir siempre con el panel visible.
