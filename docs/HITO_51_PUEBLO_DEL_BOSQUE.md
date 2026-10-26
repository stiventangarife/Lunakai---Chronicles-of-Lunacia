# Hito 51 — Pueblo del Bosque

> **Estado:** en la versión de prueba (23-oct-2026). Cambios posteriores en la sección 7.
> **Pedido:** montar un pequeño pueblo en el bosque, junto a los caminos, con los modelos de `assets/environment`; Ochi en la tienda nueva, la Forja y el Maestro Paladill en sus edificios, la balsa junto al barquero y el bus parado mirando hacia el Gran Árbol de Atia. Retirar el dojo antiguo y que su patio vuelva a tener hierba.

## 1. Qué hay y dónde

El pueblo bordea el camino principal de la Isla del Bosque (zona 2_2), desde su final (-95, 25) hasta la salida hacia el Gran Árbol (-23, -29), unos 90 m. Lado A = noroeste del camino, lado B = sureste. Todas las fachadas miran a la calle.

| Pieza | Modelo | Escala | Dónde |
| --- | --- | --- | --- |
| Tienda (Mercader Ochi delante) | `shop.glb` | ×6 (11 m) | A, (-79.6, 0.6) |
| Forja (yunque delante de la puerta) | `forja.glb` | ×6,5 (12 m) | A, (-64.9, -8.6) |
| Árbol de la Forja (tutorial) | — | — | al lado de la Forja, (-56.7, -12.4) |
| Casas ×4 | `house.glb` | ×4 | A (-50.8, -18.9); B (-87.4, 28.6), (-72.8, 17.9), (-50.6, 0.1) |
| Parada | `parada.glb` | ×4 | A, 2,5 m detrás del bus, (-41.5, -29.8) |
| Bus (morro hacia el Gran Árbol, puerta a la parada; se inclina con el terreno) | `bus.glb` | ×5 (9,5 m) | A, arcén, (-38.2, -24.8) |
| Dojo (Maestro Paladill delante del porche) | `dojo.glb` | ×9 (17 m) | B, (-33.2, -6.0) |
| Altar de Atia (cierra la calle) | `altar_atia.glb` | ×3 | final del camino, (-97.7, 27.0) |
| Tótem | `totem.glb` | ×2,5 | B, salida del pueblo, (-24.0, -22.6) |
| Farolas ×6 | `lamp.glb` | ×1,2 (2,3 m) | a ambos lados de la calle |
| Puesto de pescado | `shop_fish.glb` | ×4 | embarcadero del barquero (Kappa), (36, 132) |
| Balsa (flota y se mece) | `balsa.glb` | ×3,5 | en el agua junto al barquero, (48.5, 135.5) |

Los Sapidae miden ~2,8 m: dojo, Forja, tienda, parada y bus van a su escala (puertas y bancos a su medida). Separación: ≥ 2,5 m entre la calle (4,8 m) y cada fachada, ≥ 5 m entre edificios.

## 2. Cómo funciona

| Pieza | Archivo |
| --- | --- |
| Posiciones, escalas y puntos derivados (`OCHI_SPOT`, `FORGE_USE_SPOT`, `FORGE_TREE_SPOT`, `PALADILL_SPOT`, `PALADILL_GREET_SPOT`). Sin imports: lo leen el resto de módulos. | `rpg/world/ForestVillageLayout.js` |
| Carga cada modelo una vez y lo dibuja como `InstancedMesh` (casas y farolas: una llamada por grupo). Corrige los modelos con el origen descentrado (bus, parada). Apoyo en la altura **más baja** de la planta (rejilla 5×5). Colisión: 4 paredes por edificio, círculo para farolas y balsa. Se coloca al cargar la zona 2_2 y se retira al salir. | `rpg/world/ForestVillage.js` (sustituye a `ForestDojo.js`) |
| Claros: sin hierba ni flores bajo cada pieza (hasta 24 rectángulos en el shader), sin plantas, guijarros ni rocas, y sin los árboles que tocan un edificio o crecen a < 6 m de la calle (7 árboles). El resto del bosque no cambia. | `ForestVillage._clearVegetation`, `genshin/GenshinGrassField.js` (`setClearings`) |
| Forja: el punto de uso (E), el anillo dorado, la luz del horno y las chispas; el edificio lo pone el pueblo. | `rpg/world/ForgeStation.js` |
| Ochi y Paladill en sus sitios nuevos; Paladill también en su creación especial y su colisión. | `world/MapRegistry.js`, `NPCManager.js`, `OverworldManager.js` |
| Tutorial: la flecha va al árbol junto a la Forja, a la Forja y a Paladill en el dojo; tras la cinemática el jugador aparece frente a Paladill. Textos de la Forja actualizados. | `tutorial/TutorialDirector.js`, `tutorial/TutorialScript.js`, `tactics/data/GatheringCatalog.js` |
| Mapa: marcas de tienda, Forja y dojo en el pueblo y nueva marca «Pueblo del Bosque»; fuera el sendero al dojo antiguo. Los pétalos de sakura que caían sobre el dojo se quitaron (23-oct). | `MapRegistry.js`, `WorldMapModal.js`, `demo_scena/ParticleSystemManager.js` |
| Dojo antiguo (Dojō Secreto, -87.9, 74) retirado y su patio con hierba otra vez. Los árboles de alrededor no cambian (moverlos reordenaría el bosque). | `demo_scena/LandmarksManager.js`, `DemoScenaAssetManager.js`, `genshin/GenshinTerrainData.js` |

**Apoyo en pendiente:** los edificios usan la altura más baja de su planta. Las dos casas junto al altar (`plinth`) se apoyan en lo más alto del terreno bajo su base, para que no asome por dentro, y un zócalo de piedra (una sola `InstancedMesh`) rellena el hueco hasta el suelo. El bus (`conform`) se inclina con el terreno para que las cuatro ruedas apoyen.

**Detalle útil:** para que GenshinTrees no dibuje un árbol se le pone radio `-1e9` en `lodBuckets[].radii`. Un radio negativo pequeño no basta: `Frustum.intersectsSphere` lo sigue dando por visible.

## 3. Rendimiento

Medido con el pueblo a la vista (mostrándolo y ocultándolo):

| | Valor |
| --- | --- |
| Llamadas de dibujo | +13 (≈ 4 %) |
| Triángulos dibujados (con sombras) | +130 mil (≈ 11 %); el pueblo tiene ~114 mil |
| Geometría en GPU | 4,6 MB |
| Texturas en GPU | **72 MB** dentro del Bosque (antes 112 MB) y **0** fuera |

- **Mapas de relieve a 512:** los 10 GLB con mapa de relieve lo llevan ahora a 512 (el color sigue a 1024). Los GLB pesan un 30 % menos. Originales en `_respaldo_glb/`.
- **Se libera al salir del Bosque:** `ForestVillage._release()` saca los modelos de la escena y `ModelCache.evictGLTF()` libera geometrías, materiales, texturas e imágenes. Al volver se cargan otra vez (del caché HTTP). Probado con 3 viajes de ida y vuelta a la Sabana.
- **Observado, no era del pueblo:** cada viaje de ida y vuelta Bosque ↔ Sabana dejaba ~7 texturas más en la GPU. Eran los esqueletos de los NPC; corregido (sección 6).

## 4. Pruebas

- Navegador integrado, partida «Auditoria»: el pueblo, Ochi, Paladill y el yunque en su sitio, sin errores en consola; el aviso «Usar la forja» aparece en el punto de uso; el árbol de la Forja al lado del edificio; el patio del dojo antiguo con hierba.
- Pendiente: recorrer el tutorial de la Forja completo (árbol → Forja) y la llegada tras la cinemática con una partida nueva.

## 5. Pendiente

- `ForestDojo.js` y `MerchantStall.js` ya no se usan: se pueden borrar.
- Los modelos `house_artic`, `snowman_artic` y `bridge` siguen en uso en otras islas.

## 6. Kappa y el Guardián de los Pergaminos (23-oct)

| Cambio | Archivo |
| --- | --- |
| **Kappa es el barquero** (antes Pomodoro): modelo `kappa.glb` (2,4 m), retrato `portraits/kappa.png`, textos del viaje y de la misión («Habla con Kappa en la playa»). El id interno sigue siendo `ferry_pomodoro` para no tocar partidas ni misiones. Pomodoro como héroe reclutable no cambia. | `islands/IslandWorldLayout.js`, `ui/FerryTravelUI.js`, `QuestManager.js`, `DialogSystem.js` |
| **Guardián de los Pergaminos** junto a la puerta de la Forja (a la izquierda; el árbol está a la derecha), a > 4 m del yunque para que los avisos de E no se pisen. Explica la Forja en tres frases y ofrece «Abrir la Forja» (usa la misma apertura que el yunque, con sus bloqueos). Durante el tutorial solo se habla con Paladill. | `MapRegistry.js` (`scroll_keeper`, tipo `forge_keeper`), `NPCManager._handleForgeKeeperInteraction`, `ForestVillageLayout.SCROLL_KEEPER_SPOT` |
| **Modelos sin animación:** respiran con un balanceo suave (±1,5 % de alto). `matte: true` en la definición los deja sin metal (si no, se ven negros). | `NPCManager.js` |
| **Draco en los NPC:** el lector de NPCManager usa el mismo decodificador que la caché de modelos. | `render/ModelCache.js` (`DRACO_LOADER`), `NPCManager.js` |
| **Fuga de esqueletos corregida:** `_disposeNPC` libera el esqueleto de cada NPC animado (antes quedaban ~7 texturas huérfanas por viaje entre islas). | `NPCManager.js` |
| Relieve a 512 en los dos modelos (originales en `_respaldo_glb/`); retratos generados con una vista frontal de cada modelo. | `assets/models`, `assets/portraits` |

**Regla:** todo modelo animado que se retire de la escena necesita `skeleton.dispose()`; los NPC con modelo de luz horneada llevan `matte: true`.

## 7. Cambios posteriores (23-oct)

| Cambio | Archivo |
| --- | --- |
| **Cámara tras la cinemática:** el jugador aparece frente a Paladill y la cámara, con su giro por defecto (45°), quedaba dentro del dojo. Ahora se coloca detrás del jugador, mirando al maestro. | `tutorial/TutorialDirector.js` |
| **Sin pétalos de sakura** sobre el dojo (se quitó el sistema de partículas). | `demo_scena/ParticleSystemManager.js` |
| **Farolas sin sombra** (rendimiento, Hito 53): las 6 farolas suman ~32 mil triángulos. | `world/EnvironmentSystem.js` |
| Para encender el servidor local con doble clic: `iniciar_servidor.bat` en la raíz del proyecto (puerto 8082). | — |

**Pendiente:** `ForestDojo.js` y `MerchantStall.js` ya no se usan y se pueden borrar.

