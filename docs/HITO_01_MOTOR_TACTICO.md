# Hito 1: Motor de Combate Táctico 3D por Turnos

## 1. Visión General
El primer hito del proyecto estableció las bases del combate táctico tridimensional para **Axie Tactics**, inspirado en juegos como *Final Fantasy Tactics*, *Dofus* y *Fire Emblem*, integrando el lore y los activos oficiales del universo Axie Infinity.

---

## 2. Componentes Principales

### 2.1 Tablero Táctico y Renderizado (`src/tactics/TacticsGrid.js`, `src/tactics/TacticsStage.js`)
- **Cuadrícula Táctica**:
  - Matriz lógica configurable de $N \times M$ casillas.
  - Renderizado de losetas con detección de elevación, obstáculos intransitables y estados de celda (libre, ocupada, rango de movimiento, rango de ataque).
  - Resaltado interactivo con feedback visual al posar el cursor o seleccionar habilidades.
- **Cámara Táctica Isométrica**:
  - Vista elevada con ángulo cenital/isométrico.
  - Controles de rotación en cuartos de vuelta ($Q$ / $R$) y zoom dinámico con la rueda del ratón.

### 2.2 Entidades y Modelos 3D (`src/entities/`, `vendor/GLTFLoader.js`)
- **Sistema de Unidades**:
  - Soporte para héroes (Axies) y enemigos (Quimeras).
  - Carga de modelos `.glb` con esqueleto, animación de idle, movimiento (walk/run), ataque y desmayo.
  - Barras de vida (HP), energía y escudos proyectados en el espacio de pantalla sobre la cabeza de cada unidad.
- **Integración con Axie Mixer 3D**:
  - Arquitectura preparada para cargar Axies personalizados según la colección del jugador a través de partes modulares (`axie-mixer`).

### 2.3 Sistema de Turnos y Cola de Acción (`src/combat/TurnManager.js`)
- **Iniciativa y Fases**:
  - Cálculo de iniciativa basado en la velocidad de las unidades.
  - Flujo de ronda: Fase de inicio de turno (recarga de energía, aplicación de daño persistente/estados), Fase de acción (movimiento + cartas/habilidades) y Fase de fin de turno.
  - Indicador visual de orden de turnos en la interfaz superior (turn timeline).

### 2.4 Sistema de Cartas y Combate (`src/cards/CardManager.js`, `src/combat/DamageCalculator.js`)
- **Mazo y Mano de Cartas**:
  - Cada unidad cuenta con cartas de partes (Boca, Cuerno, Espalda, Cola) con costo de energía.
  - Previsualización de área de efecto (AoE), objetivo único y rango en la cuadrícula.
- **Fórmulas de Daño y Estados**:
  - Modificadores de daño por afinidad de clases (Bestia/Bicho/Meca vs Planta/Reptil/Anochecer vs Acuático/Pájaro/Amanecer).
  - Estados alterados: Sangrado, Aturdimiento, Escudo, Curación y Aumento de Daño.

---

## 3. Verificación y Resultados
- Motor verificado con combates funcionales entre Kotaro y Quimeras Slime.
- HUD táctico reactivo con animaciones CSS fluidas y compatibilidad WebGL universal.
