# Hito 2: Overworld Estilizado, NPC Maestro Paladill y Quimeras Errantes

## 1. Visión General
El segundo hito transformó el juego de una cuadrícula táctica estática a una experiencia de rol de mundo abierto (*Overworld*), donde el jugador explora libremente praderas estilizadas, interactúa con mentores y entabla combate con monstruos errantes.

---

## 2. Componentes del Entorno Estilizado (`src/rpg/stylized/`)

### 2.1 Shaders de Hierba y Viento (`StylizedGrass.js`)
- **Técnica de Renderizado**: `THREE.InstancedMesh` con geometría personalizada de briznas de hierba (5,000 a 12,000 instancias optimizadas).
- **Parámetros Visuales**:
  - Escala calibrada a **0.50**.
  - Gradiente de color de raíz a punta con variación aleatoria por instancia (`uRootColor`, `uTipColor`, `uRootColorB`, `uTipColorB`).
  - Animación de viento en tiempo real mediante textura de ruido de Perlin en el Vertex Shader.
  - Atenuación automática de densidad y altura en los bordes del camino de piedra mediante muestreo del mapa SDF.

### 2.2 Flores Procedurales (`StylizedFlowers.js`)
- **Instancias**: Malla instanciada de flores multicolor distribuidas armónicamente fuera de los caminos transitables.
- **Parámetros**: Escala calibrada a **0.80**, con orientación al viento y sombreado cel-shaded.

### 2.3 Suelo y Camino con Campos de Distancia Signados (`StylizedGround.js`, `PathSDF.js`)
- **Camino de Piedra Orgánico**:
  - Textura procedural SDF de $512 \times 512$ que define curvas y encrucijadas naturales.
  - Shaders que combinan textura de adoquín/tierra (`dirtColor`) con bordes de transición de arena y pasto (`grassColor`) sin cuadrícula visible.
  - **Eliminación de Z-Fighting y Parpadeo**: Reemplazo de la caja de colisión anterior por planos verticales colgantes en los bordes ($Y = -0.05$ a $-12.05$), eliminando interferencias de coplanaridad entre el suelo y los acantilados.

### 2.4 Árboles Estilizados (`StylizedTrees.js`)
- Cuatro árboles en las esquinas del área central con troncos modelados proceduralmente y copas de hojas esféricas esponjosas cel-shaded.

---

## 3. Personaje Principal y Controlador (`src/rpg/PlayerEntity.js`, `PlayerController.js`)
- **Control Libre**: Desplazamiento con $WASD$ adaptado a la orientación isométrica de la cámara.
- **Física Ligera**: Velocidad, aceleración, fricción y colisiones circulares con obstáculos (árboles, bordes y NPCs).
- **Flexibilidad de Héroe**: Arquitectura desacoplada que permite utilizar a Kotaro o a cualquier Axie seleccionado por el usuario mediante `threejs-axie-mixer3d`.
- **Selector en Suelo**: Anillo estático de orientación que no gira erráticamente.

---

## 4. Maestro Paladill y Sistema de Diálogos (`src/rpg/NPCManager.js`, `DialogSystem.js`)
- **Modelo Oficial**: Integración del archivo oficial `assets/models/paladill.glb` con animaciones (`Hammer.Idle`, `Greeting`).
- **Orientación Corregida**: Posicionado de frente hacia el patio central sobre un pedestal de madera y aura dorada estática.
- **Control de Input en Diálogos**:
  - Tecla **[E]**: Inicia la interacción con el NPC cercano.
  - Tecla **[Espacio]**: Avanza secuencialmente por las líneas de diálogo sin interferir con la tecla de inicio.
  - Textos dinámicos adaptados al arquetipo del héroe activo y al lore de Lunacia.

---

## 5. Quimeras Errantes y Transición a Combate (`src/rpg/WanderingMonsters.js`, `BattleTransition.js`)
- **IA de Monstruos**:
  - Modo Patrulla: Recorrido suave entre waypoints definidos.
  - Modo Alerta: Detección del jugador por radio de proximidad, animación de pausa con signo `!` flotante y persecución activa.
- **Transición Fluida a Combate Táctico**:
  - Al colisionar con la quimera, se congela el movimiento y se guarda la posición exacta del jugador.
  - Efecto visual de cortinilla y transición al tablero de batalla por turnos.
  - Al triunfar en combate, `resumeAfterVictory` restaura la posición del jugador, disuelve la quimera derrotada y actualiza la misión principal.
