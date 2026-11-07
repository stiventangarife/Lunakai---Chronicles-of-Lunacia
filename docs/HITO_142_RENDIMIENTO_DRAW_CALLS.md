# Hito 142 · Revisión de rendimiento y menos draw calls (tablero del combate, hierba y flores)

**Fecha:** 7-nov-2026 · **Archivos:** `src/tactics/GridManager.js`, `src/rpg/world/demo_scena/genshin/GenshinGrassField.js` · Sin cambios en `assets/`.

## Fase 1 · Medidas (sin cambios)

Navegador integrado visible, 809×907, pixelRatio 1. Contadores por contexto WebGL (interceptando las llamadas de dibujo), `lkDebug.perf`, consultas de tiempo de GPU y tiempos de cada sistema del bucle.

| | Mundo (zona 2_2) | Combate (arena de prueba) |
|---|---|---|
| CPU del bucle p50 / p95 | 8,8 / 12,6 ms | 6,3 / 8,2 ms |
| — dibujar (`om.render` / `sceneManager.render`) | 6,6 ms | 5,7 ms |
| — lógica (`om.update`) | 1,6 ms | — |
| GPU p50 / p95 | 2,75 / 7,6 ms | — |
| Draws / triángulos por fotograma | ~310 / 1,35 M | 297 / 63 K |

- El límite es la CPU que three.js gasta en preparar cada draw call.
- **Mundo:** sombra 2048 con 147 draws (se recalcula cada 2 fotogramas), escena principal 217 (hierba y flores 64), bloom ~15.
- **Combate:** de 257 draws de la escena, 188 eran el tablero (94 casillas + 94 contornos).
- Los renderers de 0×0 que muestra la extensión Three.js DevTools (retratista, visores del personaje) no dibujan cuando no se ven; sus cifras son las del último dibujo.
- Mochila abierta: el mundo se dibuja 1 de cada 4 fotogramas.

Otras mejoras posibles (no aplicadas): sombra del mundo más ajustada al jugador y sin sombra en flores y puntos de pesca; instanciar `Flower_3_Group` (18 copias); liberar la escena del combate en el mundo (1001 objetos, 457 materiales); revisar las 6 luces puntuales del mundo midiendo la GPU a pantalla completa; avisos `flatShading` en `MeshToonMaterial`.

## Mejora 1 · Tablero del combate (`GridManager.js`)

- Cada casilla del 10×10 pasa a ser un registro `{ material, position, userData }`. `setupBiome` sigue asignando `material` igual que antes.
- `_rebuildTileInstances()` dibuja una `InstancedMesh` por material en uso. Solo rehace si cambió el reparto de materiales.
- Los contornos son una sola `LineSegments` (`LegacyTileEdges`).
- Las casillas ya no clonan su material: los clones nunca se modificaban.
- Los resaltados, los obstáculos y la lógica no cambian. Nada fuera de `GridManager` usaba las mallas de las casillas.

## Mejora 2 · Hierba y flores (`GenshinGrassField.js`)

- Antes: una malla por baldosa de 10 m (hierba y flores), con dos geometrías (cerca y lejos) y descarte por baldosa.
- Ahora hay 4 mallas: hierba cerca, hierba lejos, flores cerca y flores lejos.
  - `update()` sigue decidiendo dónde va cada baldosa, su nivel de detalle y si se ve (isla, radio de flores).
  - En `onBeforeRender`, con la cámara real y una vez por cámara y fotograma, se descartan las baldosas que no ve la cámara, con la misma esfera que usaba three.js, y se ordenan de cerca a lejos. Su origen va en el array uniforme `uTiles`.
  - En el shader, `gl_InstanceID` da la baldosa y la mata. Los datos de cada mata, que antes iban en los atributos `aInst` y `aRank`, se leen de una textura (`uInstTex`); el rango se calcula como `(mata + 0,5) / uRankDen`.
- Se mantiene la API pública: `update`, `setDensity`, `setVisible`, `setClearings`, `dispose` y `uniforms`.

## Resultados

| | Antes | Después |
|---|---|---|
| Combate: draws | 296 | **113** |
| Combate: CPU p50 / p95 | 6,3 / 8,0 ms | **5,1 / 6,3 ms** |
| Mundo: draws | 308–313 | **247–251** |
| Mundo: CPU de dibujo (`om.render`) | 6,6 ms | **5,2 ms** |
| Mundo: CPU del bucle p50 | 8,8 ms | **6,8 ms** |

Aspecto comprobado con capturas antes y después, con la cámara fija y el viento congelado.

- **Mundo:** solo cambian los elementos que se animan solos (árboles, personajes, partículas). La zona de hierba es idéntica.
- **Combate:** el tablero difiere en un 0,04 % de los píxeles (compresión de las capturas).
- **Biomas:** los 6 biomas del 10×10 (hielo y agua transparentes incluidos) dan 4 mallas y 100 casillas.
- **Movimiento:** en un recorrido de 40 m las baldosas se recolocan y cambian de nivel de detalle, sin errores de shader ni de WebGL.
- **Precalentado:** el del combate sigue en 3 programas nuevos.

## Reglas

1. No clonar un material por objeto si no se va a modificar: impide agrupar draws.
2. Varias copias de lo mismo se dibujan instanciadas, y su descarte por baldosa se hace en `onBeforeRender` con la cámara real.

## Copias de seguridad

`backups/2026-11-07_hito142/` (los dos archivos originales).
