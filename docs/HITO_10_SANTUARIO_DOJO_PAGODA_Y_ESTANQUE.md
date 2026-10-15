# Hito 10: Santuario del Dojo, Pagoda Japonesa 3D, Arces Rojos y Estanque Zen

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** `DojoBuilding`, `DojoRockSanctuary`, `DojoBambooGrove` y el estanque Zen de 80 m **ya no se construyen**. El Dojo y el Maestro Paladill viven en la Isla del Bosque (`demo_scena`, Valle del Dojō en x −87.9, z 74).


> **Estado:** Completado y Verificado ✅  
> **Área:** Overworld / Modelado 3D / Props Especiales / Shaders  
> **Archivos Involucrados:**  
> - `src/rpg/world/DojoBuilding.js`  
> - `src/rpg/world/DojoRockSanctuary.js`  
> - `src/rpg/world/DojoBambooGrove.js`  
> - `src/rpg/world/DojoNatureManager.js`  
> - `src/rpg/stylized/StylizedPond.js`  
> - `src/rpg/stylized/StylizedTrees.js`  
> - `src/rpg/NPCManager.js`  
> - `src/rpg/world/MapRegistry.js`  

---

## 1. Objetivos del Hito

El templo central de Lunacia en la coordenada `[3, 3]` fue completamente reconstruido para convertirlo en un punto neurálgico imponente con arquitectura oriental estilizada, naturaleza zen procedimental, santuario de rocas sagradas y un estanque acuático con fauna viva interactiva.

---

## 2. Elementos Principales Implementados

### 2.1 Gran Pagoda 3D del Dojo (`DojoBuilding.js`)
- **Modelo 3D GLB**: Incorporación de `assets/models/stylized_dojo.glb`.
- **Ubicación y Escala**:
  - Posicionada en la pradera occidental: `x: -10.5, y: -0.22, z: -15.5`, escala `2.9`, rotación `Math.PI * 0.5`.
  - Deja el camino principal de piedra expedito.
  - Hundimiento deliberado de los pilares de madera a `y = -0.22` para garantizar un apoyo orgánico sobre el terreno sin levitación.
- **Colisiones Sólidas**:
  - Definición de cajas y cilindros de colisión física para pilares, muros traseros y escalinatas.

### 2.2 Estanque Zen con Peces Vivos (`StylizedPond.js`)
- **Topografía**:
  - Depresión física excavada en el terreno (`StylizedGround.js`) en `[-30.3, 12.0]` con profundidad máxima de `-0.78m`.
- **Agua Traslúcida y Refracción**:
  - Malla de agua a altura `-0.36m` con material shader personalizado: color turquesa suave, transparencia, bordes con espuma y reflejos solares especulares.
- **Fauna Animada**:
  - Cardumen de peces estilizados (sombras suaves) que nadan en trayectorias elípticas aleatorias en el lecho del estanque, con aleteo sinusoidal de cola sincronizado en el shader.
- **Vegetación de Orilla**:
  - Anillo denso de boulders y rocas de ribera (`Pebble_Round_1..5`), lirios acuáticos y tréboles.

### 2.3 Arces Japoneses Rojos Otoñales (`StylizedTrees.js`)
- Implementación de la variante cromática `maple_red`:
  - Follaje carmesí y rojizo distribuido alrededor de la pagoda y el estanque.
  - Viento suave en canopia y caída de hojas de arce como partículas atmosféricas en la zona `[3, 3]`.

### 2.4 Bosque de Bambú GPU (`DojoBambooGrove.js`)
- InstancedMesh unificado (tallos, nudos, ramas y hojas) en el cuadrante noroeste de la zona `[3, 3]`.
- Oscilación armónica por viento GPU sin carga en la CPU.

### 2.5 NPCs Residentes: Maestro Paladill y Xia
- **Maestro Paladill**:
  - Reubicado en el patio frontal del dojo (`x: -14.5, y: 0.0, z: -8.5`), junto a las escaleras principales.
  - Pedestal de piedra ornamental, aura dorada radiante y colisiones circulares.
- **NPC Xia**:
  - Modelo `assets/models/xia.glb` en `x: -21.2, z: 16.4`, cerca del estanque Zen.
  - Animación *Idle* continua, delineado *Toon Outline* cel-shaded y sistema de diálogos interactivo con la tecla `[E]`.
