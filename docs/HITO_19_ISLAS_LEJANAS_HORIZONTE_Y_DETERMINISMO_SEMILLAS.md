# Hito 19: Islas Lejanas del Horizonte, Balizas de Misión y Determinismo Procedimental

> **Fecha de implementación:** Octubre 2026  
> **Estado:** Completado y Verificado en Producción  
> **Módulos clave:** `DistantIsland.js`, `PropsManager.js`, `VegetationManager.js`, `LandmarksManager.js`, `WaterManager.js`, `MathUtils.js`

---

## 1. Visión General

El Hito 19 resuelve tres necesidades críticas para la inmersión, rendimiento y consistencia visual de Lunakai:
1. Renderizado panorámico 360° de las islas circundantes en el horizonte marino.
2. Limpieza y estilización de las balizas de navegación hacia NPCs y misiones.
3. Determinismo procedural completo con semillas fijas (algoritmo Mulberry32) para evitar que los elementos del mundo cambien de posición entre sesiones.

---

## 2. Islas Lejanas del Horizonte (`DistantIsland.js`)

Para conectar visualmente la Isla del Bosque con el resto de Lunacia sin sobrecargar la tarjeta gráfica, se desarrolló un sistema de siluetas de bajo poligonaje con shaders atmosféricos personalizados y niebla desacoplada (`fog: false`):

### 2.1 Distribución Cardinal en el Horizonte
* **❄️ Norte (`Z = -1550`, `X = +40`): Isla Ártica**
  * Picos glaciares afilados estilo Cervino (*Matterhorn*) con conos facetados y aristas asimétricas.
  * Plataformas de hielo e icebergs en la base marina.
  * Bruma glacial blanca y cian gélido.
* **🏜️ Este (`X = +1550`, `Z = +40`): Isla de la Sabana**
  * Cadena de mesetas y cañones tepuy con estratos horizontales.
  * Siluetas de acacias gigantes de copa plana (*Umbrella Acacias*) situadas en las cumbres.
  * Rotación panorámica de 90° (`rotation.y = Math.PI / 2`) para que su extensión de más de 600 metros se despliegue a lo ancho del campo visual del jugador.
  * Bruma cálida dorada de terracota.
* **🔮 Oeste (`X = -1550`, `Z = -60`): Isla Mística**
  * Gran Árbol Arcano (*World Tree*) colosal con contrafuertes orgánicos de raíces.
  * Cúpulas de follaje sagrado estilo anime, espiras monolíticas y gran arco marino emergiendo del agua.
  * Bruma esmeralda bioluminiscente.
* **🌋 Sur (`Z = +1550`, `X = +60`): Isla Lunar y Volcánica**
  * **Gran Caldera Volcánica:** Estratovolcán colosal (altura 310m) con labio aserrado irregular y cráter cóncavo interior.
  * **Volcán Secundario:** Cono parásito escarpado en el flanco oeste con estrías de lava basáltica.
  * **Cráter de Impacto Lunar:** Cordillera circular anular (*impact ring-wall* estilo Copérnico/Tycho) con cuenca plana y **pico central resurgente**.
  * **Domo de Lava y Cráter Menor:** Relieves escarpados en los flancos laterales.
  * **6 Espiras de Basalto:** Hornitos y agujas de obsidiana puntiagudas en la costa.
  * **Shader Temático y Bruma:** Base de basalto oscuro (`#1c1219`), laderas de escoria oxidada (`#6b1f25`), cumbres con fulgor incandescente de magma (`#f97316`) y doble capa de calina de ceniza volcánica.

---

## 3. Rediseño de Balizas e Indicadores de Misión

* **Eliminación de Carteles Flotantes:** Se retiraron los carteles de texto estáticos y permanentes sobre los NPCs, mostrándose únicamente cuando el jugador entra en su radio de interacción.
* **Sustitución de Círculos de Suelo:** Los círculos proyectados en el terreno se ocultaban o deformaban en caminos empinados y laderas; fueron eliminados en favor de una **punta de flecha flotante limpia**.
* **Eliminación de Anillos y Rectángulos:** Diseño simplificado a una flecha estilizada sobre el objetivo, sin anillos giratorios distractores.
* **Desaparición por Proximidad:** La flecha indicadora se desvanece de forma suave al acercarse al NPC para una inmersión visual limpia.
* **Retiro de Herramientas de Depuración:** Botón evaluador de briznas (`🌿 [+]`) oculto en producción.

---

## 4. Determinismo Procedimental (Algoritmo Mulberry32)

### 4.1 Problema Identificado
Al reiniciar la escena o refrescar el navegador, `Math.random()` generaba una secuencia numérica distinta. Esto causaba que los árboles, rocas, matas de hierba y juncos cambiaran ligeramente de posición, escala y orientación en cada sesión.

### 4.2 Solución con Semillas Fijas
Se reemplazó el uso de `Math.random()` por la función determinista `createSeededRandom(seed)` en [`MathUtils.js`](file:///D:/Proyectos%20Unity/Axie_Adventures_Tactics_backup/axie-tactics-web/src/rpg/world/demo_scena/MathUtils.js), asignando semillas fijas independientes a cada subsistema:

* **Árboles y Rocas (`PropsManager.js`):** Semilla fija `133742`.
* **Césped V3 y Pradera (`VegetationManager.js`):** Semilla fija `77005`.
* **Césped Estilizado y Flores (`VegetationManager.js`):** Semillas fijas `77001`, `77002`, `77003`, `77004`.
* **Rocas Flotantes del Santuario (`LandmarksManager.js`):** Semilla fija `99001`.
* **Espadañas y Juncos del Río (`WaterManager.js`):** Semilla fija `88001`.

### 4.3 Ventajas
* **Consistencia Absoluta:** Cada elemento del mundo se genera siempre en sus coordenadas `(X, Y, Z)` exactas con idéntica escala y rotación.
* **Cero Overhead:** Mulberry32 realiza operaciones bit a bit de enteros de 32 bits a nivel de CPU (< 1 nanosegundo por llamada) sin consumo extra de memoria ni presión en el recolector de basura.
