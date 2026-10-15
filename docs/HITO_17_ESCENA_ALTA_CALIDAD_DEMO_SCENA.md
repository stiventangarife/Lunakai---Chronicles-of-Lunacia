# Hito 17: Escena Abierta de Alta Fidelidad Visual (Demo_Scena)

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** `demo_scena` sigue siendo la base de la Isla del Bosque (terreno, río, posiciones y colisiones). Su aspecto lo define la capa Genshin del Hito 22.


> **Fecha de implementación:** Octubre 2026  
> **Estado:** Completado y Verificado en Producción  
> **Módulos clave:** `src/rpg/world/demo_scena/*`, `Terrain.js`, `VegetationManager.js`, `PropsManager.js`, `WaterManager.js`, `LandmarksManager.js`

---

## 1. Visión General y Objetivos

El Hito 17 introduce la integración de la arquitectura **Demo_Scena** como entorno visual de referencia para el mundo abierto de Lunakai. Este sistema eleva el apartado gráfico a un estilo artístico cel-shaded / anime de alta fidelidad (inspirado en *Genshin Impact* y *Zelda: Breath of the Wild*), manteniendo un rendimiento riguroso de 60 FPS mediante instanciado masivo en GPU (`THREE.InstancedMesh`) y shaders GLSL personalizados.

---

## 2. Componentes Técnicos Principales

### 2.1 Terreno Esculpido y Elevación Continua (`Terrain.js`)
* **Malla de Terreno:** Malla de alta resolución con curvatura natural, colinas escarpadas, mesetas y valles.
* **Ruido Determinista:** Implementación de `SimplexNoise` con semilla fija (`1337`), garantizando que la topografía y las pendientes permanezcan idénticas en cada carga.
* **Cálculo Físico de Normales y Altura:** Métodos analíticos `getHeight(x, z)` y `getNormal(x, z)` para asentar con precisión milimétrica al jugador, árboles, rocas y briznas de hierba.

### 2.2 Césped Estilizado V3 y Vegetación Multicapa (`VegetationManager.js`)
* **50.000 Briznas Instanciadas:** Renderizado de decenas de miles de matas de césped mediante `THREE.InstancedMesh` divididas en chunks espaciales con frustum culling.
* **Shader Cel-Shaded V3:**
  * Curvas de gradiente cromático (verde profundo en raíz, esmeralda cálido en puntas).
  * Viento procedural con ondas multidireccionales (`uWindStrength`, `uWindSpeed`).
  * Deformación interactiva al paso del jugador y su compañero Axie (`uTrampleStrength`, `uPlayerPos`, `uCompanionPos`).
* **Sotobosque y Flores:** Campos de flores estilizadas y arbustos de calidad artística instanciados en GPU sin primitivas geométricas simplistas.

### 2.3 Árboles y Rocas de Alta Calidad (`PropsManager.js`)
* **Modelos 3D Reales:** Sustitución de conos y cilindros por modelos GLB completos texturizados con mapas de normales (`tree_common`, `tree_twisted`, `tree_pine`, `rock_col`).
* **Batching Masivo en GPU:** ~350 árboles y centenares de formaciones rocosas agrupados en ~30 draw calls totales para toda la isla.
* **Guijarros con LOD Dinámico:** Guijarros en márgenes de caminos con 3 niveles de detalle (LOD 0 con sombras completas, LOD 1 sin sombras costosas, LOD 2 con oclusión total a más de 140m).

### 2.4 Río Continuo y Efectos Acuáticos (`WaterManager.js`)
* **Shaders de Agua con Refracción y Espuma:** Corredor fluvial continuo con ripples de manantial y olas superficiales animadas.
* **Sombras de Peces Vivos:** Siluetas de peces nadando contra corriente con aleteo sinusoidal.
* **Espadañas y Juncos:** Grupos botánicos de espadañas maduras (*ripe bulrushes*) en orillas poco profundas con balanceo al viento.
* **Ondas de Choque en Rocas:** Shaders de espuma y anillos concéntricos alrededor de las rocas del cauce.

### 2.5 Monumentos y Puntos de Interés (`LandmarksManager.js`)
* **Gran Árbol Ancestral de Atia:** Coloso vegetal sagrado en el valle central.
* **Santuario del Portal Antiguo:** Estatua monumental, columnas arcanas y 3 monolitos de roca levitantes con partículas de energía y luz mágica.
* **Dojo Valley:** Zona ceremonial de entrenamiento del Maestro Paladill.
* **Gran Puente Rústico:** Estructura de madera que permite el cruce peatonal fluido del río.

---

## 3. Optimizaciones y Métricas

| Métrica | Enfoque Tradicional | Implementación Hito 17 |
| :--- | :--- | :--- |
| **Draw Calls de Vegetación** | > 1.200 | **~30 draw calls** |
| **Briznas de Hierba** | CPU Clones (~2.000 max) | **50.000 en GPU** |
| **Tasa de Refresco** | 30-45 FPS con caídas | **60 FPS estables** |
| **Carga de Memoria** | Instancias separadas en RAM | **Buffers compartidos en VRAM** |
