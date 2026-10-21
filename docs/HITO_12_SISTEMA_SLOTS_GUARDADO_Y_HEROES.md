# Hito 12: Sistema Multi-Ranura de Guardado, Nuevos Héroes e Iconos de Habilidades

> **Estado:** Completado y Verificado ✅  
> **Actualización (21-oct-2026):** las ranuras nuevas guardan el tutorial en formato v2 (`tutorialProgress = { v: 2, step, done, flags, bondBefore }`, Hito 48) y el modelo del jugador es Ema o Kai (Hito 47); las partidas antiguas se migran al cargar.  
> **Área:** Progresión / Persistencia / UI / Combate Táctico  
> **Archivos Involucrados:**  
> - `src/rpg/SaveSlotManager.js`  
> - `src/rpg/ui/StartScreenUI.js`  
> - `src/rpg/ui/InventoryModal.js`  
> - `src/tactics/Spells.js`  
> - `src/rpg/PlayerEntity.js`  
> - `assets/skills/heroes/`  

---

## 1. Objetivos del Hito

Permitir que el jugador mantenga hasta 3 partidas independientes guardadas de forma persistente en su navegador, renovar la alineación de héroes del juego con modelos icónicos del universo Axie Infinity y enriquecer la experiencia visual del combate con iconos 2D personalizados de alta definición para cada habilidad.

---

## 2. Sistema Multi-Ranura de Guardado (`SaveSlotManager.js`)

### 2.1 Estructura del Guardado
- Soporte para 3 ranuras independientes (`slot_1`, `slot_2`, `slot_3`) almacenadas en `localStorage`.
- Los datos serializados incluyen:
  - **Héroe activo y Escuadrón**: Nivel, EXP, atributos base y puntos asignados.
  - **Posición en el Mundo**: Macro-zona actual (`gx`, `gy`), coordenadas exactas `(x, y, z)` y ángulo de rotación.
  - **Misiones**: Misiones activas, pasos completados, recompensas reclamadas.
  - **Inventario**: Equipamiento actual (armas, armaduras, accesorios) y objetos en la mochila.
  - **Metadatos de la Ranura**: Fecha y hora de guardado, tiempo jugado y retrato del líder.

### 2.2 Auto-Guardado Continuo
- El juego guarda el progreso automáticamente tras:
  - Salir victorioso de un combate táctico.
  - Completar un paso de misión o entregar una misión.
  - Cambiar de zona a través de un portal.
  - Modificar el equipamiento o gastar puntos de atributos/habilidades.

---

## 3. Roster de Héroes e Iconografía Dedicada

### 3.1 Nuevo Héroe Líder: Shinji (Beast #10455)
- El anterior modelo genérico de Bestia fue reemplazado por **Shinji** (Axie Beast #10455), con pelaje dorado, piezas características y retrato 2D en `assets/portraits/shinji.png`.
- Animaciones de combate integradas: ataque de tajo, salto acrobático y pose de guardia.

### 3.2 Iconos de Habilidades 2D Dedicados
Se integraron paquetes de iconos en `assets/skills/heroes/`:
- **Shinji**:
  - `1.png`: Tajo de Kotaro (`kotaro_slash`)
  - `2.png`: Empuje Táctico (`kotaro_push`)
  - `3.png`: Salto Temerario (`kotaro_jump`)
- **Early Bird**:
  - `1.png`: Flecha de Cupido (`bird_cupid`)
  - `2.png`: Mirada Nocturna (`bird_owl`)
  - `3.png`: Salto Aéreo (`bird_aerial_jump`)
- **Big Yak**:
  - `1.png`: Pincho de Cactus (`plant_cactus`)
  - `2.png`: Drenaje Vital (`plant_drain`)
  - `3.png`: Escudo de Espinas (`plant_shield`)
- **Bing** y **Pomodoro**:
  - Habilidades de apoyo, bombas, bombas de humo, estimulantes y curaciones.

### 3.3 Visualización en Pantallas
- Los iconos se muestran en alta fidelidad en:
  - El HUD táctico de batalla inferior.
  - El modal de selección de cartas durante el combate.
  - La pestaña de árbol de habilidades del Inventario `[I]`.
  - La pantalla de inicio y selección de héroes `StartScreenUI.js`.
