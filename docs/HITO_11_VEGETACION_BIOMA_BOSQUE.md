# Hito 11: Naturaleza y Vegetación del Bioma Bosque (9 Macro-Zonas)

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** `ForestNatureManager` (vegetación de las macro-zonas de 80 m) **ya no se construye**. La vegetación del Bosque la dibujan `GenshinTrees` y `GenshinGrassField` (Hito 22).


> **Estado:** Completado y Verificado ✅  
> **Área:** Overworld / Generación de Entorno Procedimental / Optimización GPU  
> **Archivos Involucrados:**  
> - `src/rpg/world/ForestNatureManager.js`  
> - `src/rpg/stylized/StylizedTrees.js`  
> - `src/rpg/world/MapRegistry.js`  
> - `src/rpg/OverworldCollisions.js`  

---

## 1. Objetivos del Hito

Dotar a las 9 macro-zonas que componen el Bioma de Bosque central (`[2, 2]` hasta `[4, 4]`) de una biodiversidad visual rica, orgánica y creíble, superando el aspecto de pradera plana anterior sin comprometer los 60 FPS estables en navegadores modestos.

---

## 2. Arquitectura de `ForestNatureManager.js`

### 2.1 Catálogo de Especies y Props Instanciados
El gestor unifica mallas de alta calidad estilizadas en grupos instanciados (`InstancedMesh`):
- **Pinos Esculpidos (`Pine_1`, `Pine_2`, `Pine_3`)**:
  - Árboles coníferos estilizados colocados en agrupaciones naturales fuera del camino de losas.
- **Rocas Medianas (`Rock_Medium_1`, `Rock_Medium_2`, `Rock_Medium_3`)**:
  - Formaciones rocosas con colisión física sólida registrada en `OverworldCollisions.js`.
- **Matorrales y Arbustos Florales (`Bush_Common`, `Bush_Common_Flowers`)**:
  - Arbustos volumétricos con bayas y flores pequeñas.
- **Setas y Hongos Mágicos (`Mushroom_Common`, `Mushroom_Laetiporus`)**:
  - Racimos de setas silvestres con sombreado cálido al pie de árboles y rocas.
- **Helechos y Flores (`Fern_1`, `Flower_3_Group`, `Flower_4_Group`)**:
  - Relleno de sotobosque con respuesta al viento.
- **Pétalos y Guijarros en el Suelo (`Petal_1`, `Petal_2`, `Pebble_Round_1..5`, `Pebble_Square_1..2`)**:
  - Micro-detalles que eliminan la monotonía del plano del suelo.

### 2.2 Distribución Pseudo-Aleatoria Determinista
- Para evitar que cada zona cambie de aspecto al azar en cada recarga, se utiliza una función de *hash* basada en las coordenadas de la macro-zona (`gx`, `gy`) y un *seed* fijo.
- Cada zona de las 9 macro-zonas de bosque posee una identidad propia:
  - Zonas próximas al río tienen mayor densidad de tréboles, guijarros y humedad.
  - Zonas colindantes con el ártico incorporan transiciones de rocas frías.
  - Zonas colindantes con la sabana aclaran progresivamente el verdor del sotobosque.

### 2.3 Variantes de Árboles en `StylizedTrees.js`
- Se crearon paletas cromáticas diferenciadas:
  - `maple_red`: Arces rojos otoñales (predominantes en el Dojo y claros sagrados).
  - `golden`: Abedules dorados con follaje ámbar y cálido.
  - `green`: Árboles de hoja perenne verde esmeralda y verde lima.
