# Hito 13: Pantalla de Carga GPU a 60 FPS, Transición Limpia de Salida, Cámara Instantánea y Botón de Opciones [ESC]

> **Estado:** Completado y Verificado ✅  
> **Área:** Experiencia de Usuario (UX) / Rendimiento / CSS GPU / Cámara 3D / HUD  
> **Archivos Involucrados:**  
> - `src/rpg/world/ZoneTransitionManager.js`  
> - `src/rpg/OverworldManager.js`  
> - `src/rpg/OverworldCamera.js`  
> - `src/rpg/world/WorldMapManager.js`  
> - `src/rpg/ui/SettingsModal.js`  
> - `styles.css`  

---

## 1. Objetivos del Hito

Resolver los problemas de micro-cortes (*stutter*) y tirones visuales durante los cambios de zona, modernizar y profesionalizar la pantalla de carga, eliminar el barrido transversal de 70 metros de la cámara entre mapas, e implementar una transición de salida limpia que garantice que el usuario solo tome el control cuando el mundo esté completamente dibujado y respondiendo a 60 FPS en tiempo real. Asimismo, agregar acceso visible al menú de opciones mediante tecla de acceso rápido `[ESC]`.

---

## 2. Optimizaciones de la Pantalla de Carga

### 2.1 Localización y Tipografía Limpia
- El texto de carga fue traducido al inglés internacional: **"Loading Biome..."**.
- El subtítulo fue actualizado a **"LUNAKAI"**, con espaciado elegante y sobrio.
- Se eliminaron todos los emojis informales del overlay de carga, brindando una estética de RPG profesional.

### 2.2 Animaciones 100% en GPU (Cero Reflows)
- **Orbe Giratorio (`.zone-loading-orb`)**:
  - Propiedades aceleradas por hardware: `transform: translateZ(0)` y `will-change: transform`.
  - Rotación continua `linear` a 60 FPS sin tirones del hilo principal de JavaScript.
- **Barra de Progreso (`.zone-loading-bar-fill`)**:
  - Se eliminó la animación clásica de `width: X%` (la cual provocaba recalculo de *layout* y *reflows* en cada fotograma).
  - Se sustituyó por transformaciones matriciales directas en el compositor: `transform: translateX(...) scaleX(...)`.
  - Animación suave e instantánea sin micro-cortes.

---

## 3. Transición de Salida Limpia y Sincronización de Frames

### 3.1 Espera al Primer Frame Útil (`waitForNextRenderFrame(2)`)
- En `OverworldManager.js`, el desvanecimiento de salida (*fade out*) de la cortina negra no comienza de inmediato al terminar la carga de datos.
- El sistema invoca `waitForNextRenderFrame(2)`, obligando al navegador a ejecutar 2 ciclos completos de `requestAnimationFrame` y rasterizar el terreno, texturas PBR y mallas en la GPU.
- Solo cuando el primer frame útil ya está renderizado en el canvas de Three.js, se dispara la animación de *fade out* suave de 500ms.

### 3.2 Bloqueo Preventivo de Controles
- Durante el cambio de mapa y el desvanecimiento de salida, el controlador del jugador (`PlayerController.setEnabled(false)`) permanece completamente inactivo.
- Esto evita que el personaje reciba impulsos de movimiento hacia el vacío o registre entradas del teclado antes de que el mundo responda en tiempo real. Al culminar el *fade out*, los controles se reactivan de manera limpia y transparente.

---

## 4. Snap Instantáneo de Cámara en Cambios de Zona (`snapToTarget`)

### 4.1 El Problema Previo
Al cruzar un portal cardinal hacia una zona colindante (por ejemplo, del portal norte `z = -38` al portal sur `z = 32.5`), la cámara realizaba una interpolación lineal (*lerp*) a través de más de 70 metros de mapa vacío. Durante ese recorrido de 1 segundo se producían cortes notables en la tasa de refresco.

### 4.2 La Solución
- Se implementó el método `snapToTarget(target)` en `OverworldCamera.js`:
  - En lugar de interpolar suavemente, teletransporta instantáneamente la posición de la cámara y su punto de mira (*lookAt*) directamente sobre el nuevo punto de aparición del héroe.
- `WorldMapManager.js` invoca `snapToTarget()` tanto en `changeMap()` como en `loadMap()`, eliminando por completo cualquier barrido lateral indeseado o caída de fotogramas.

---

## 5. Acceso Visible al Menú de Opciones: `⚙️ Options [ESC]`

- El botón de opciones en el HUD superior derecho del Overworld fue renombrado y estilizado como **`⚙️ Options [ESC]`**.
- En la guía de controles en pantalla se incorporó la indicación `<kbd>ESC</kbd> Options`.
- Al pulsar `[ESC]` en el teclado o pulsar el botón en el HUD, se despliega fluidamente `SettingsModal.js`, permitiendo calibrar gráficos, calidad, sombras, volúmenes de música/efectos y consultar la tabla de controles.
