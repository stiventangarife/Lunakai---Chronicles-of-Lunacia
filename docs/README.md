# Axie Tactics - Documentación del Proyecto

Bienvenido al repositorio de documentación técnica y diseño de **Axie Tactics**, un RPG táctico 3D con exploración de mundo abierto (*Overworld*) estilizado y combates estratégicos por turnos basado en la propiedad intelectual de Axie Infinity.

---

## 📚 Índice de Hitos de Desarrollo

1. [**Hito 1: Motor de Combate Táctico 3D por Turnos**](HITO_01_MOTOR_TACTICO.md)
   - Tablero táctico con cuadrícula isométrica ($N \times M$).
   - Sistema de turnos por iniciativa y línea de tiempo.
   - Sistema de cartas de partes de Axie (Boca, Cuerno, Espalda, Cola) con cálculo de afinidad elemental.
   - Modelos 3D, animaciones esqueléticas y barras de vida proyectadas.

2. [**Hito 2: Overworld Estilizado, Maestro Paladill y Quimeras Errantes**](HITO_02_OVERWORLD_PRADERA.md)
   - Entorno estilizado con hierba instanciada y viento procedural en GPU.
   - Flores con sombreado cel-shaded y árboles estilizados.
   - Camino de losas de piedra con Signed Distance Fields (SDF) y eliminación de Z-fighting.
   - NPC Maestro Paladill (`paladill.glb`) con diálogo interactivo (`[E]` para hablar).
   - Quimeras errantes con IA de patrulla, estado de alerta "!" y transición fluida a combate.

3. [**Hito 3: Macro-Cuadrícula de Lunacia (5x5 Demo / 25 Zonas), 5 Biomas y Estructura Dofus**](HITO_03_MAPAS_CONTINUOS_Y_BIOMAS.md)
   - Macro-cuadrícula de Lunacia calibrada para la Demo a $5 \times 5$ (25 regiones) con centro en el Dojo `[3, 3]`.
   - 5 biomas temáticos en patrón molinete: Bosque (Verde 3x3), Ártico (Azul 4), Sabana (Amarillo 4), Místico (Morado 4) y Mazmorra (Rojo 4).
   - Estructura interna de $2 \times 2$ sub-cuadrantes (NW, NE, SW, SE) continuos por cada macro-zona.
   - Portales cardinales 3D en el suelo estilo Dofus, cortinillas direccionales y estandartes heráldicos.
   - Interfaz interactiva del **Mapa del Mundo (Tecla [M])** con pin del jugador en tiempo real `[3, 3]`.

4. [**Hito 4: Sistema de Misiones, Diario de Aventuras y Gestión de NPCs**](HITO_04_SISTEMA_MISIONES_Y_NPCS.md)
   - Motor de misiones progresivas (`QuestManager.js`) con estados, objetivos y recompensas de graduación.
   - Diario de Aventuras / Libro de Misiones (`[L]`) con pestañas de activas/completadas y estilo pergamino.
   - Mini-panel HUD reactivo para seguimiento de objetivos activos en el Overworld.
   - Control territorial estricto en `NPCManager.js` para evitar duplicación del Maestro Paladill fuera del Dojo `[3, 3]`.
   - Corrección de integridad de recompensas singulares (eliminación de duplicado de espada de madera).

5. [**Hito 5: Progresión de Experiencia por Escuadrón, Habilidades e Inventario Rediseñado**](HITO_05_PROGRESION_EXP_HABILIDADES_E_INVENTARIO.md)
   - Curva dinámica de EXP de escuadrón: $\text{EXP}(L) = \text{round}(100 \times L^{1.35})$.
   - Reparto justo de EXP: $100\%$ Héroe líder activo, $60\%$ aliados de apoyo equipados participantes, $0\%$ reserva.
   - Bonificaciones automáticas por nivel ($+2\text{ HP}$, $+3\text{ Iniciativa}$) y asignables ($+3\text{ Stats}$, $+1\text{ Habilidad}$).
   - 4 Atributos Elementales: Vitalidad (HP), Ferocidad (Melee/Colisión), Agilidad (Rango/Crítico), Esencia (Magia/Curación).
   - Sistema de costes escalonados para subida de nivel de cartas/habilidades ($N$ puntos para nivel $N \to N+1$).
   - Rediseño de Inventario (`[I]`) en 3 columnas: Paper Doll cruciforme 3x3, slots limpios solo con iconos, tooltip flotante dinámico, desequipado en 1 clic, eliminación universal de scrollbars y corrección del contenedor de tarjetas de mochila.
   - Pantalla de victoria con animación visual de barras de progreso de experiencia por Axie.

---

## 🎮 Controles y Atajos de Teclado

| Tecla | Acción en el Juego |
| :---: | :--- |
| **`[W] [A] [S] [D]`** / Flechas | Desplazamiento del héroe en el Overworld. |
| **`[E]`** | Interactuar con NPCs (Maestro Paladill) y cofres u objetos. |
| **`[Espacio]`** | Avanzar líneas de diálogo. |
| **`[I]`** | Abrir / Cerrar el **Inventario**, Equipamiento y Atributos. |
| **`[L]`** | Abrir / Cerrar el **Diario de Aventuras** (Libro de Misiones). |
| **`[M]`** | Abrir / Cerrar el **Mapa del Mundo** interactivo (7x7 Macro-Zonas). |

---

## 🛠️ Tecnologías Empleadas
- **Motor 3D**: Three.js (WebGL 2.0).
- **Formatos 3D**: glTF / GLB con animaciones esqueléticas personalizadas (Axies, NPCs, Quimeras).
- **Shaders**: GLSL personalizado para briznas de hierba estilizada, caminos SDF y atenuación atmosférica.
- **Arquitectura Web**: Vanilla JavaScript modular (ES6 Modules) sin sobrecarga de frameworks externos.
- **Backend / Servidor Local**: Node.js HTTP Server (`server.js`).
