# Hito 55 — Modelos GLB en la Sabana

> **Estado:** en la versión de prueba (23-oct-2026), pendiente de la revisión del usuario.
> **Pedido:** cambiar las piezas hechas con primitivas de la Sabana por los modelos del Bosque (casa y altar de Atia), quitar la fragua y decorar con `table_surf` y `totem_2`, todo optimizado.

## 1. Qué cambia

| Lugar | Antes | Ahora |
| --- | --- | --- |
| **Campamento de Bing** (-33, -40) | Casa de adobe con primitivas | `house.glb` ×4, la misma casa del pueblo del Bosque, con la puerta hacia Bing. Se quedan las dos farolas de piedra, la hoguera, la diana y el estandarte. |
| **Tótem** (-27.6, -42.6) | — | `totem_2.glb` ×2.5 al lado de la casa de Bing. |
| **Altar** (68, -30) | Altar del Sol: tarima, estatua, dos braseros con llamas y una luz puntual | `altar_atia.glb` ×4 (llena el claro del altar antiguo), de frente al camino. Sin braseros y sin luz: un PointLight menos. |
| **Baruk** (51.5, 47.1) | Fragua (horno, chimenea, toldo, yunque, barril, lingotes y luz) y una casa de adobe | Solo `house.glb` ×4, donde estaba la casa de adobe, con la puerta hacia el camino. La fragua y su luz ya no están. Baruk sigue en su sitio (42.39, 48.73). |
| **Embarcadero de Kappa** | — | `table_surf.glb` ×1.3 de pie en la arena (-136.5, 37.5) y `balsa.glb` ×3.5 (la balsa del Bosque) flotando en el mar (-144.5, 45), con el mismo vaivén que en el Bosque. |

La casa de Baruk no va detrás de él: el árbol grande del camino la tapaba desde la llegada. Por eso va donde estaba la casa de adobe.

## 2. Cómo se hace (`rpg/world/savanna/SavannaGenshinLandmarks.js`)

> **Desde el Hito 56** la carga y la colocación están en el kit compartido `islands/kit/IslandProps.js`, la clave de caché es `#islas` (compartida con el Ártico) y los edificios en pendiente llevan zócalo de piedra en lugar de hundirse.

- **Clave de caché propia:** los modelos se cargan con `cloneGLTF('./assets/environment/<archivo>.glb#sabana')`. El pueblo del Bosque descarga sus modelos al salir del Bosque (`evictGLTF` cierra sus imágenes). Con la misma clave, la Sabana se quedaría sin texturas. La Sabana no descarga los suyos: `WorldMapManager` ya libera de la GPU las texturas de las islas inactivas, y vuelven a subirse al regresar.
- **Una carga por modelo:** la segunda casa usa `clone()` de la primera, así que comparten geometría y material.
- **Estáticas:** las mallas y los grupos con `matrixAutoUpdate = false`. Solo la balsa se actualiza cada fotograma (vaivén en `update()`).
- **Apoyo en el suelo:** la altura más baja del terreno bajo la planta (5×5 muestras) menos 5 cm, como en el Bosque. La balsa va al nivel del mar (Y = 0.45) menos `0.45 · escala / 3.5`.
- **Materiales:** sin metal y con rugosidad 0.85 (la luz viene en la textura), como en el Bosque. La balsa no proyecta sombra.
- **Colisiones:** se conocen al construir (`SavannaGenshinArt` las lee enseguida): casas 3.3 m, altar 3.0, tótem 1.0, tabla 0.6. Las farolas siguen igual (0.55).
- **Lo que se quitó:** `housePartsList`, `_buildAltar` y `_buildForge`, con sus llamas y sus dos luces puntuales.
- La flora y las rocas no cambian: `SAVANNA_LANDMARKS.forge` mantiene `x/z` y `house` (zonas libres que lee `SavannaGenshinNature`).

## 3. Assets

| Archivo | Cambio | Tamaño |
| --- | --- | --- |
| `assets/environment/table_surf.glb` | Mapa de normales 1024 → 512 (webp) | 390 KB → 298 KB |
| `assets/environment/totem_2.glb` | Mapa de normales 1024 → 512 (webp) | 480 KB → 364 KB |

Originales en `scratch/_respaldo_glb/`. `house.glb`, `altar_atia.glb` y `balsa.glb` no cambian.

## 4. Pruebas

- Bosque → Sabana → Bosque → Sabana: las seis piezas tienen su textura (1024×1024) y no hay errores en la consola.
- Capturas de antes y después: campamento, altar, casa de Baruk y embarcadero.
