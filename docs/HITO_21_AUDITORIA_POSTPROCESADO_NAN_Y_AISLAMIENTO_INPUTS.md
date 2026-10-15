# Hito 21: Auditoría de Postprocesado WebGL (Eliminación de Parpadeos Negros NaN), Sombras y Aislamiento de Entradas en UI

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** los portales cardinales se retiraron (`setPortals({})`) y el viaje entre islas es con el barquero Pomodoro. El blindaje de altura de los portales ya no aplica. El telón de carga (`.zone-curtain`) se sigue usando en cada viaje en barca.


> **Fecha de implementación:** Octubre 2026  
> **Estado:** Completado y Verificado en Producción  
> **Módulos clave:** `SavannaWaterManager.js`, `WaterManager.js`, `LightingManager.js`, `AtmosphereManager.js`, `grassShader.js`, `Terrain.js`, `ZoneTransitionManager.js`, `StartScreenUI.js`, `OverworldManager.js`, `PlayerController.js`

---

## 1. Visión General

El Hito 21 resuelve dos problemas de calidad de vida y estabilidad visual de máxima prioridad reportados durante las pruebas del juego:

1. **Parpadeos Negros Intermitentes en Pantalla:** Artefactos visuales esporádicos en los que un cuadrante o panel rectangular de la pantalla parpadeaba de color negro como si fuera una textura superpuesta.
2. **Conflicto de Teclado en la Creación de Personaje Sapidae:** Al escribir el nombre del héroe, presionar teclas como `[I]`, `[M]`, `[J]`, `[L]`, `[O]`, `[E]` o `[W][A][S][D]` no permitía escribir las letras porque el gestor de atajos del mundo interceptaba los eventos y mostraba alertas de funcionalidades bloqueadas (ej. *"Inventory unlocks after your first battle"*).

---

## 2. Auditoría Gráfica: Parpadeos Negros por Intoxicación NaN (`UnrealBloomPass`)

### 2.1 Causa Raíz Matemática
En WebGL (sobre el backend ANGLE / DirectX 11 de Windows), cuando un shader de fragmento ejecuta:
1. `smoothstep(edge0, edge1, x)` con `edge0 > edge1` (invertido): la especificación oficial de GLSL define el comportamiento como **indefinido**. En compiladores DirectX, esto produce divisiones inválidas que generan valores `NaN` (Not a Number) o `-Infinity`.
2. `pow(base, exp)` cuando `base == 0.0`: evaluado internamente como $\text{exp2}(\text{exp} \times \log_2(\text{base}))$. Al ser $\log_2(0) = -\infty$, la GPU puede colapsar a `NaN`.

### 2.2 Propagación a Nivel de Postprocesado
* El pase de Bloom (`UnrealBloomPass`) reduce la textura de la escena por mitades sucesivas (downsampling mips).
* Por la aritmética IEEE-754, cualquier operación que involucre `NaN` resulta en `NaN` ($\text{NaN} + x = \text{NaN}$).
* Durante el filtrado bilineal, **un único píxel `NaN` contamina un bloque rectangular entero de 16x16 o 32x32 píxeles**.
* Al procesar ese bloque con `ACESFilmicToneMapping` en `OutputPass`, el bloque colapsa y se renderiza como un **cuadrante o panel negro parpadeante** en pantalla.

### 2.3 Solución Aplicada en Shaders
Se refactorizaron todos los `smoothstep` invertidos a la forma canónica y se blindaron las operaciones matemáticas:

* **Agua Marina de Sabana y Bosque (`SavannaWaterManager.js` / `WaterManager.js`):**
  * `smoothstep(170.0, 150.0, distToIsland)` $\rightarrow$ `(1.0 - smoothstep(150.0, 170.0, distToIsland))`.
  * `smoothstep(7.5 + shoreWash, 0.2, dist)` $\rightarrow$ `(1.0 - smoothstep(0.2, maxShoreWash, dist))`.
  * Espuma del río: `smoothstep(0.14, 0.012, ...)` $\rightarrow$ `(1.0 - smoothstep(0.012, 0.14, ...))`.
  * Estelas de cascada: corregidos `bowWave` y `edgeFade`.
  * Normalización de `halfVector`: protegida con épsilon contra vectores de longitud cero: `normalize(lightDir + viewDir + vec3(0.0001))`.
* **Atmósfera (`AtmosphereManager.js`):** Halo y resplandor solar protegidos contra bases nulas: `(sunDot > 0.001) ? pow(sunDot, 64.0) * 0.9 : 0.0`.
* **Césped (`grassShader.js`):** Deformación de viento, curvatura y contraluz BotW acotadas con `clamp(..., 0.0001, 1.0)`, y erosión de pendiente corregida a `(1.0 - smoothstep(0.68, 0.85, slope)) * 0.45`.
* **Terreno (`Terrain.js`):** Corregido `smoothstep(55.0, 15.0, ...)` a `1.0 - smoothstep(15.0, 55.0, ...)`.

---

## 3. Optimización de Sombras Direccionales (`LightingManager.js`)

* **Corrección de Bias Negativo:** El sesgo de sombras `this.dirLight.shadow.bias = -0.0004` empujaba la profundidad hacia la superficie, produciendo *shadow acne* (parches oscuros de auto-sombreo que parpadeaban en las terrazas de la meseta al mover la cámara).
* **Nuevo Ajuste de Sombras:** Sesgo corregido a `0.00002` y `normalBias = 0.025`, eliminando por completo el shadow acne.
* **Eliminación de Lag de 1 Fotograma:** Se añadió `this.dirLight.target.updateMatrixWorld()` en `updateLightTarget`, sincronizando la matriz de sombra en el mismo instante en que el jugador se desplaza.

---

## 4. Detección de Portales en Altura y Telón de Carga (`ZoneTransitionManager.js`)

* **Problema:** En la meseta de la Sabana ($Y \approx 25.5\text{ m}$), los portales cardinales de transición estaban colocados a $Y = 0\text{ m}$. La comprobación de proximidad solo medía distancia horizontal ($X/Z$), provocando disparos fantasma del telón de carga oscuro (`.zone-curtain`) al caminar sobre las coordenadas de los portales.
* **Muestreo de Altura Real:** Los portales ahora obtienen su elevación correcta mediante `getGroundHeight(x, z)`.
* **Validación Vertical:** Se exige una distancia vertical máxima de $\Delta Y \le 3.5\text{ m}$ para que un portal pueda activarse.
* **CSS de Telón:** Inyección de `.zone-curtain.hidden { display: none !important; }` para asegurar que el elemento nunca se pinte en pantalla mientras esté inactivo.

---

## 5. Aislamiento de Entradas de Teclado en Creación de Personaje

### 5.1 Causa del Bloqueo
* En [`OverworldManager.js`](file:///D:/Proyectos%20Unity/Axie_Adventures_Tactics_backup/axie-tactics-web/src/rpg/OverworldManager.js), el escuchador global de teclado en `window` interceptaba teclas como `KeyI` (Inventario), `KeyM` (Mapa), `KeyJ`/`KeyL` (Misiones) y `KeyO` (Ajustes).
* Al pulsar una letra como `I` mientras se escribía el nombre, el juego mostraba la advertencia de *"Inventory unlocks after your first battle"* y ejecutaba `e.preventDefault()`, impidiendo que el navegador escribiera la letra en el `<input>`.
* Simultáneamente, [`PlayerController.js`](file:///D:/Proyectos%20Unity/Axie_Adventures_Tactics_backup/axie-tactics-web/src/rpg/PlayerController.js) capturaba `W`, `A`, `S`, `D` y movía al personaje en segundo plano.

### 5.2 Solución Implementada
1. **Aislamiento en el Estudio de Creación (`StartScreenUI.js`):**
   * Se añadieron escuchadores `keydown`, `keyup` y `keypress` con `e.stopPropagation()` directamente sobre `#hero-select-modal` y `#start-screen-overlay`.
   * Cualquier tecla pulsada en la interfaz de personalización queda contenida y **nunca escala al objeto `window`**.
2. **Guarda Prioritaria en `OverworldManager.js`:**
   * En la cabecera de `_setupInput()`, se valida si el foco o el objetivo es un campo editable:
     ```javascript
     const activeTag = document.activeElement?.tagName;
     const targetTag = e.target?.tagName;
     if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target?.isContentEditable) {
       return;
     }
     ```
   * Si la pantalla de inicio o el creador de personajes está abierto, se ignoran de forma preventiva todos los atajos del Overworld.
   * Se actualizó `isAnyModalOpen()` para incluir `#start-screen-overlay` y `#hero-select-modal`.
3. **Protección en Controladores Secundarios:**
   * `PlayerController.js`: WASD no mueve al personaje cuando el usuario escribe en un campo de texto.
   * `OverworldCamera.js` y `DialogSystem.js`: Teclas de cámara y diálogos (`PageUp`, `Space`, `Enter`) ignoran eventos si el usuario escribe en inputs.
