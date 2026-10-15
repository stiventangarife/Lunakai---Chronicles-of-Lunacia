# Hito 09: Corredor Fluvial Continuo, Lagos Glaciares y Abismo Volcánico

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** `StylizedRiver` y los lagos o estanques de 80 m **ya no se construyen**. El río actual del Bosque es el de `demo_scena` con el shader `GenshinWater` (Hito 22). Los ríos y lagos de las demás islas son `IslandWaterBody`: agua, hielo y lava (Hito 23).


> **Estado:** Completado y Verificado ✅  
> **Área:** Overworld / Renderizado Procedimental / Shaders GLSL  
> **Archivos Involucrados:**  
> - `src/rpg/stylized/StylizedRiver.js`  
> - `src/rpg/stylized/StylizedGround.js`  
> - `src/rpg/stylized/PathSDF.js`  
> - `src/rpg/world/MapRegistry.js`  
> - `src/rpg/world/WorldMapManager.js`  

---

## 1. Objetivos del Hito

El objetivo principal de este hito fue convertir el río de un elemento aislado de la zona central a un **corredor fluvial biogeográfico continuo** que atraviesa todo el mapa de Lunacia de Norte a Sur a lo largo de la columna central (`gx = 3`, filas `gy = 1..5`), adaptando su aspecto visual, cauce, fauna y estructuras de cruce según el bioma que atraviesa.

---

## 2. Implementación Técnica

### 2.1 Trayectoria del Río por la Columna 3
- **Zona `[3, 1]` (Bioma Ártico - Origen del Río)**:
  - Generación de un **Lago Glacial de Nacimiento** en el norte (`z: -30` a `-38`).
  - Animación de anillos de ondas concéntricas (*ripples*) en el manantial de agua helada.
  - Puentes de bloques de hielo tallados adaptados al terreno ártico.
  - Sellado de los límites norte con cordilleras rocosas nevadas para evitar vacíos visuales.
- **Zonas `[3, 2]`, `[3, 3]`, `[3, 4]` (Bioma Bosque y Dojo)**:
  - Cauce meándrico natural con orillas cubiertas de tréboles instanciados (`Clover_1`, `Clover_2`) y guijarros de ribera.
  - En la zona `[3, 3]`, integración del **Puente de Piedra Arqueado**:
    - Se garantiza la transitabilidad al 100% en `z = 0` (el plano de colisión del agua no interrumpe el paso sobre el puente).
- **Zona `[3, 5]` (Bioma Mazmorra - Desembocadura)**:
  - Transformación del río en una cascada de lava / **Abismo Volcánico Terminal**, con orillas de roca volcánica y vapor ascendente.

### 2.2 Coordinación de Shaders y Signed Distance Fields (SDF)
- `StylizedRiver.js` expone la función de cálculo espacial `getRiverCenter(z)`:
  - Devuelve `{ x, dx }` en cualquier punto longitudinal del mapa.
  - Consumida por `PathSDF.js` para esculpir la depresión del lecho del río en `StylizedGround.js` y disipar automáticamente la hierba instanciada (`StylizedGrass.js`) y las flores (`StylizedFlowers.js`) dentro del agua.

### 2.3 Subgrupos Dinámicos y Rendimiento
- `StylizedRiver.setZone(zoneId, gx, gy)`:
  - Activa y desactiva selectivamente los subgrupos de Three.js correspondientes a cada bioma (`waterfallLakeGroup`, `dungeonChasmGroup`, `stoneBridgeGroup`, etc.), manteniendo un consumo de memoria y *draw calls* mínimo.
- Colisiones dinámicas por zona registradas en `OverworldCollisions.js`:
  - Los bordes del río impiden que el jugador caiga al agua, canalizando el cruce obligatoriamente a través del puente de piedra.
