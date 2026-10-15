# Hito 22: Dirección de Arte "Genshin Impact" para la Isla del Bosque (Isla 1)

> **Fecha de implementación:** Octubre 2026  
> **Estado:** Completado y verificado (capturas headless). Incluye los ajustes posteriores de la sección 7.  
> **Módulos clave:** `src/rpg/world/demo_scena/genshin/*`, `DemoScenaZone22.js`, `LightingManager.js`

---

## 1. Objetivo

Rediseñar por completo el **look** de la Isla del Bosque hacia el estilo de *Genshin Impact* (Mondstadt / Liyue): anime, cel-shading suave, pictórico, con atardecer dorado, **sin modificar** la jugabilidad:

* Mismo terreno (alturas), mismo río, mismas posiciones de árboles, rocas y NPCs (semillas Mulberry32 intactas).
* Mismas colisiones, portales, misiones, HUD, minimapa, escuadrón y mecánicas del personaje y su compañero Axie.
* Toda la capa nueva vive en `demo_scena/genshin/` y se activa desde `DemoScenaZone22` (`this.useGenshinArt = true`). Si algo falla al construirla, el juego vuelve automáticamente al look anterior.

---

## 2. Arquitectura

```
DemoScenaZone22.init()
  └─ GenshinForestArt (orquestador)
       ├─ GenshinTerrainData   → hornea alturas (R16F) + máscaras (RGBA8) desde la malla del terreno
       ├─ Terreno               → shader pictórico (pradera, senderos, arena húmeda, roca con musgo)
       ├─ GenshinSky            → cielo anime + sol + nubes cel-shaded procedurales (1 draw call)
       ├─ GenshinMountains      → cordilleras nevadas 360° + pilares kársticos estilo Liyue (2 draw calls)
       ├─ GenshinGrassField     → césped denso + flores silvestres en tiles que siguen al jugador
       ├─ GenshinTrees          → árboles voluminosos (otoño + coníferas) instanciados
       ├─ GenshinWater          → río translúcido con profundidad real, espuma, destellos y cáusticas
       ├─ GenshinMaterials      → rocas erosionadas con musgo, follaje y personajes en cel suave
       └─ GenshinPostFX         → god rays + lens flare + gradación de color (antes del OutputPass)
```

`GenshinArtDirection.js` es la **fuente única** de paleta, dirección del sol, calidad y funciones GLSL compartidas, para que todo el entorno sea coherente.

---

## 3. Sistemas

### 3.1 Iluminación de hora dorada (`LightingManager` preset `genshin_golden`)
* Sol cálido color miel, elevación ~24°, sombras PCF suaves (`shadow.radius = 3`).
* Relleno hemisférico azul cielo / verde cálido → **sombras azuladas** típicas de Genshin en vez de negras.
* Niebla cálida melocotón (90 m → 520 m) que funde el horizonte con el cielo.

### 3.2 Cielo, nubes y montañas lejanas
* Degradado anime de 3 tonos; horizonte cálido del lado del sol y lavanda del lado opuesto.
* Disco solar + halos (alimentan el bloom y el lens flare).
* Cúmulos procedurales con dos tonos cel (luz crema / sombra lila) y borde dorado; cirros finos.
* Cordilleras nevadas a 2,3–2,9 km y pilares kársticos (Liyue) en los sectores diagonales, para no tapar las 4 islas hermanas de los puntos cardinales. Perspectiva aérea y bruma de valle en shader propio (`fog: false`).

### 3.3 Césped y flores
* Rejilla de N×N tiles de 10 m que se recentra alrededor del jugador. Cada tile es un `Mesh` con **`InstancedBufferGeometry` compartida**; el origen del tile es la `modelMatrix`.
* Cada instancia es un mechón de 3 briznas suaves y redondeadas. Altura, densidad, senderos, río, orillas, pendientes y patio del Dojo salen de las **texturas horneadas**, así que césped, flores y terreno siempre coinciden.
* LOD: tiles cercanos densos (3 segmentos por brizna), lejanos dispersos (1 segmento) y desvanecimiento suave hacia el borde, donde el terreno pinta el mismo color.
* Frustum culling nativo por tile, sombras reales del sol, translucidez a contraluz, viento por ráfagas y aplastamiento al pasar el Sapidae y el Axie.
* Flores silvestres amarillas, blancas, azules (y alguna rosa) con el mismo sistema de tiles.

### 3.4 Árboles
* Mismas posiciones que `PropsManager` (semilla `133742`). Los árboles GLTF antiguos se ocultan.
* 4 arquetipos de frondosos (tronco curvado, raíces, ramas y 6–10 "nubes" de hojas con normales esféricas) y 3 de coníferas (faldas escalonadas con borde dentado).
* Colores por instancia: rojos, naranjas, dorados y verdes otoñales; coníferas verde azulado.
* Rampa toon suave, translucidez de hojas a contraluz, balanceo por viento en GPU, sombras con recorte alfa. Total: **14 draw calls** para los ~200 árboles.

### 3.5 Río y rocas
* Profundidad real por vértice (altura del agua − terreno): orillas cristalinas que dejan ver el lecho, canal turquesa profundo.
* Normales de ondas alineadas con la corriente (más rápidas en los rápidos z∈[14,36]), reflejo fresnel del cielo, destellos del sol, chispas, cáusticas, espuma en orillas, estelas y aguas blancas.
* Rocas: piedra gris cálida (la textura GLTF solo aporta detalle), musgo en las caras que miran hacia arriba, base húmeda más oscura y sombras lila frías.

### 3.6 Personajes
* Sin cambiar el diseño: rampa toon más suave, luz de borde cálida (rim light) y contorno marrón oscuro en lugar de negro puro.

### 3.7 Postprocesado
* Pase único antes del `OutputPass` (ACES): god rays (20 muestras, desactivados si el sol está fuera de pantalla), lens flare anime con oclusión estimada, split toning cálido/frío, saturación y viñeta suaves.
* Todas las lecturas de color van con clamp y protección contra `NaN`/`Inf` (regla del Hito 21). Ningún `smoothstep` invertido ni `pow` con base cero en los shaders nuevos.

---

## 4. Rendimiento

| Sistema | Técnica | Draw calls aprox. |
| :--- | :--- | :---: |
| Césped + flores | Tiles instanciados que siguen al jugador + frustum culling | 2 por tile visible |
| Árboles | `InstancedMesh` por arquetipo (tronco + copa) | 14 |
| Cielo + montañas | Shaders analíticos sin texturas | 3 |
| Río | 1 malla, 1 shader | 1 |

* **Calidad automática** (`resolveQuality`): con GPU por software o móvil reduce los tiles (9×9), la densidad y desactiva los god rays.
* El trabajo por fotograma en CPU se limita a actualizar uniforms y, solo al cambiar de tile, recolocar ~100 mallas.

---

## 5. Uso y depuración

* Activar / desactivar en caliente desde la consola: `window.genshinArt.setEnabled(false)` / `true`.
* Desactivar por código: `DemoScenaZone22.useGenshinArt = false`.
* Paleta y sol: `genshin/GenshinArtDirection.js` (`GENSHIN_PALETTE`, `SUN_OFFSET`, `GENSHIN_QUALITY`).

---

## 6. Corrección colateral

* `NPCManager._spawnGenericNPC`: el modelo de respaldo usaba una variable `auraColor` inexistente (`ReferenceError`) cuando un GLB de NPC no cargaba, lo que abortaba la carga del Overworld. Ahora usa `def.auraColor` con un color por defecto.

---

## 7. Ajustes posteriores (12–13 de octubre de 2026)

### 7.1 Coníferas con tronco recto (`GenshinTrees.js`)
* `_branch()` acepta `bendAmount`. Las coníferas usan un tronco **totalmente vertical** (`bendAmount = 0`) que recorre todas las faldas (altura + 1,2 m). Así las faldas de agujas, centradas en el eje Y, siempre quedan sobre el tronco y no flotan desplazadas.

### 7.2 LOD del césped con fundido cruzado (`GenshinGrassField.js`)
* El LOD lejano es un **prefijo exacto** de la lista barajada de instancias del LOD cercano: los mismos mechones y flores existen en ambos LOD.
* El shader desvanece las instancias que solo existen en el LOD cercano (`uLodNear` → `uLodFar`) antes de que un tile cambie de geometría, así que no hay *pop-in*.
* La colocación es estratificada con *jitter* y barajado determinista (Mulberry32). `uGrassFarKeep` y `uFlowerFarKeep` guardan la fracción que conserva el LOD lejano.
* El fundido exterior (`uFadeStart` / `uFadeEnd`) termina 1 m antes del borde cubierto por los tiles: los tiles se recolocan cuando ya son invisibles. Las flores se desvanecen a partir de `uFlowerCut` = 34 m.

### 7.3 Corteza por variedad de árbol (`GenshinTrees.js`)
* Los troncos usan las texturas de corteza pintadas a mano que ya trae el juego (`assets/nature/`, con su mapa de normales): `Bark_NormalTree`, `Bark_TwistedTree` y `Bark_DeadTree`. De la textura solo se toman las pinceladas y el relieve; el color se reasigna al tono de cada variedad, en espacio lineal y respecto al color medio de la textura.

| Variedad | Corteza | Tono |
| :--- | :--- | :--- |
| Verde | `normal` | marrón medio actual |
| Dorado | `normal` | miel claro |
| Naranja | `twisted` (retorcida) | castaño cálido |
| Rojo | `twisted` | marrón rojizo oscuro |
| Conífera | `pine` (surcos profundos) | gris-marrón frío |

* Hay una `InstancedMesh` de tronco por variedad y arquetipo, con una variación de ±8 % de valor por árbol. Usa un generador aleatorio aparte, así que los colores y las variantes de las copas no cambian.

### 7.4 Caminos de tierra a parches (`GenshinTerrainData.js` + `GenshinForestArt.js`)
* **Marco de camino:** `GenshinTerrainData` hornea un *road frame* RGBA16F a partir de las curvas exactas de `RoadManager`:
  * R: distancia con signo al eje;
  * G y B: tangente;
  * A: banda de 8 m.
* **Textura de tierra:** el suelo del camino usa el set `ground_07` (tierra agrietada: color, normal y altura). Lo hace en coordenadas de mundo, con dos capas rotadas y escaladas que se mezclan con ruido para que no se note la repetición.
* **Forma irregular:**
  * borde ondulado que sigue las placas de tierra;
  * islas de césped dentro del camino, más frecuentes cerca de los bordes;
  * manchas de tierra suelta junto al borde;
  * ancho que “respira” a lo largo del recorrido.
* **Detalle:** surcos de rueda o de pisadas suaves e intermitentes, y césped corto y pisado en la franja sin briznas. Mientras cargan las texturas se usan colores de respaldo.

### 7.5 Bruma de distancia restaurada (`GenshinForestArt._ensureDistanceHaze`)
* **Causa:** al volver de otra zona, el `AtmosphereManager` de la Sabana restauraba su niebla al desactivarse y se perdía la bruma del Bosque.
* **Solución:** la isla mantiene una única `FogExp2(0xcde4f7, 0.003)` persistente, una bruma celeste que vela árboles, colinas y mar a media y larga distancia. Se reaplica en el siguiente fotograma si otra zona la cambia, así que siempre es la misma venga el jugador de donde venga.

