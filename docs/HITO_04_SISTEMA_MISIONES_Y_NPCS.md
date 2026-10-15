# Hito 4: Sistema de Misiones, Diario de Aventuras y Gestión de NPCs en Lunacia

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** los NPC de las zonas de esquina retiradas viven ahora en su isla: Ermitaño Glacial → Ártico (−52, −66); Oráculo (34, −36) y Chamán (−40, 40) → Mística; Espíritu de Atia → Mazmorra (0, −13). Las misiones conservan sus coordenadas lógicas (`zoneCoords`), y la brújula traduce la zona antigua a su isla. Si el objetivo está en otra isla, la brújula apunta al barquero Pomodoro (`ferry_pomodoro`). Ver la sección 6 del Hito 23.


## 1. Visión General
El cuarto hito del proyecto estructuró el flujo narrativo y de objetivos guiados para **Axie Tactics**. Conecta la exploración en el Overworld con el motor de combate táctico mediante un **Sistema de Misiones Progresivo**, un **Diario de Aventuras (Libro de Misiones)** accesible vía interfaz y tecla rápida **`[L]`**, y un **Control Territorial de NPCs**, corrigiendo la duplicación de entidades entre macro-zonas y garantizando la integridad de las recompensas otorgadas al jugador.

---

## 2. Gestor de Misiones (`src/rpg/QuestManager.js`)

### 2.1 Estructura de Datos de una Misión
Cada misión se modela mediante una entidad estructurada con ciclo de vida observable:
- **`id`**: Identificador canónico único (ej. `quest_first_steps`).
- **`title`**: Título descriptivo de la aventura.
- **`description`**: Trasfondo narrativo y contexto del encargo.
- **`status`**: Estado de ciclo de vida (`not_started`, `active`, `completed`).
- **`steps`**: Secuencia ordenada de pasos/objetivos requeridos para su resolución.
- **`currentStep`**: Índice del paso activo actual ($0$-indexed).
- **`rewards`**: Recompensas otorgadas exclusivamente al completar la misión:
  - `exp`: Experiencia distribuida entre los miembros del escuadrón.
  - `items`: Lista de identificadores de objetos de `ItemDatabase.js` agregados a la mochila.
  - `gold`: Monedas de oro de Lunacia.

### 2.2 Misión Tutorial: "El Despertar del Duelista" (Maestro Paladill)
Diseñada como la introducción tutorial interactiva para el jugador:
1. **Paso 1 - La Voz del Mentor**: Acercarse al Maestro Paladill en el Dojo Central de Lunacia e iniciar el diálogo con la tecla **`[E]`**.
2. **Paso 2 - Entrenamiento en el Tablero**: Entrar al entrenamiento táctico para dominar la cuadrícula, los Puntos de Acción (PA), Puntos de Movimiento (PM) y cartas de combate.
3. **Paso 3 - Prueba de Combate Real**: Localizar y derrotar a la Quimera errante de prueba en las inmediaciones del bosque.
4. **Paso 4 - Retorno y Graduación**: Regresar con el Maestro Paladill para certificar la victoria y recibir el equipamiento de graduación.

### 2.3 Corrección Crítica: Prevención de Doble Recompensa
- **Incidencia Reportada**: La espada de caballero (`wood_sword`) se estaba entregando dos veces (una durante la fase intermedia de entrenamiento táctico y otra al concluir la misión en su totalidad con el diálogo final).
- **Causa Raíz**: En versiones previas, tanto el callback del diálogo intermedio del dojo como el método final de graduación ejecutaban de forma independiente llamadas a `equipmentManager.addItem()`.
- **Solución Implementada**: Se centralizó la entrega de objetos exclusivamente en el método `completeQuest(questId)`. Se eliminaron las asignaciones de ítems en los pasos intermedios de `advanceQuestStep`, garantizando que el equipo se deposite una única vez en la mochila del jugador al alcanzar el estado `completed`.

```javascript
completeQuest(questId) {
  const quest = this.quests[questId];
  if (!quest || quest.status === 'completed') return false;

  quest.status = 'completed';
  
  // Entrega singular de recompensas al finalizar satisfactoriamente
  if (quest.rewards) {
    if (quest.rewards.items && this.equipmentManager) {
      this.equipmentManager.addItemsToInventory(quest.rewards.items);
    }
    if (quest.rewards.exp && this.equipmentManager) {
      this.equipmentManager.addExpToSquad(this.equipmentManager.activeLeaderId, quest.rewards.exp);
    }
  }

  this._notifyQuestCompleted(quest);
  return true;
}
```

---

## 3. Control Territorial de NPCs (`src/overworld/NPCManager.js`)

### 3.1 Corrección de Duplicación del Maestro Paladill
- **Incidencia Reportada**: Al explorar la macro-cuadrícula de 7x7 biomas (Hito 3), el Maestro Paladill se renderizaba repetido en todas las macro-zonas del mapa.
- **Causa Raíz**: El ciclo de generación del Overworld instanciaba al NPC de forma genérica en cada carga de celda geográfica sin verificar las coordenadas macro del mundo.
- **Solución Implementada**:
  - Se introdujo una propiedad de restricción territorial estricta: `targetZone: [3, 3]`.
  - El `NPCManager` evalúa en cada cambio de zona las coordenadas `[macroX, macroY]` actuales del jugador.
  - El modelo 3D `paladill.glb` solo se añade a la escena cuando el jugador se encuentra en la macro-zona central del Bosque/Dojo `[3, 3]`, y se retira/despacha limpiamente al transitar hacia cualquier otra zona vecina.

```javascript
updateForMacroZone(macroX, macroY) {
  // Maestro Paladill solo reside en la coordenada central [3, 3]
  const isDojoCentral = (macroX === 3 && macroY === 3);
  
  if (isDojoCentral) {
    if (!this.paladillEntity.isAttached) {
      this.scene.add(this.paladillEntity.mesh);
      this.paladillEntity.isAttached = true;
    }
  } else {
    if (this.paladillEntity.isAttached) {
      this.scene.remove(this.paladillEntity.mesh);
      this.paladillEntity.isAttached = false;
    }
  }
}
```

---

## 4. Diario de Aventuras y Tracker HUD (`src/ui/QuestBookModal.js`)

### 4.1 Libro de Misiones (`[L]`)
- **Acceso Rápido**: Tecla **`[L]`** (Log/Libro) o botón de pergamino en el HUD principal.
- **Diseño Estilizado**: Modal con estética de pergamino y cuero medieval, tipografía legible con temática RPG fantástica.
- **Pestañas de Navegación**:
  - **Misiones en Curso**: Lista de misiones activas con su descripción, indicador de paso actual y recompensas pendientes.
  - **Misiones Completadas**: Historial de logros narrativos archivados.
- **Aislamiento de Scroll de Cámara**:
  - Se solucionó la propagación del evento `wheel` dentro de los modales. Al hacer scroll con la rueda del ratón en el registro de misiones, se detiene la propagación para evitar alterar el zoom de la cámara ortográfica 3D del Overworld (`e.stopPropagation()`).
### 4.2 HUD Tracker de Objetivos en Pantalla
- Panel lateral compacto fijado en la esquina superior derecha del Overworld.
- Muestra el objetivo activo de la misión prioritaria con indicadores visuales claros (ej. `⭐ Purificación del Slime de Atia: Hablar con el Maestro Paladill`).
- Se actualiza reactivamente mediante el bus de eventos de `QuestManager` ante cualquier avance de paso o finalización de misión.

---

## 5. Expansión: Cadena Completa de 20 Misiones del Mundo

El sistema se expandió a un catálogo completo de **20 misiones** (10 principales lineales y 10 secundarias distribuidas en la matriz 5x5):

### 5.1 10 Misiones Principales (Campaña Lineal Progresiva)
Estructuradas siguiendo la progresión estricta de dificultad de los 5 biomas (**Bosque → Sabana → Ártico → Místico → Mazmorra**):
1. **Purificación del Slime de Atia** (`[3, 3]`, Maestro Paladill): Tutorial y graduación del Dojo.
2. **Demuestra tu Ferocidad** (`[4, 3]`, Bing): **Reclutamiento de Bing** (Bird DPS a distancia).
3. **Arenas Hostiles** (`[5, 3]`, Centinela del Desierto): Llegada a la frontera de la Sabana.
4. **La Cacería de la Quimera Picuda** (`[5, 2]`, Centinela): Vencer al Alfa Picudo en los Yermos.
5. **La Semilla Congelada** (`[4, 1]`, Pomodoro): **Reclutamiento de Pomodoro** (Plant Soporte/Tanque botánico).
6. **El Núcleo de la Ventisca** (`[2, 1]`, Pomodoro): Vencer al Gólem Polar en los Picos Glaciares.
7. **Ecos del Vacío Astral** (`[1, 2]`, Sabio Polar): Entrada al bioma Místico y consulta con el Oráculo.
8. **La Resonancia Prohibida** (`[1, 4]`, Oráculo Astral): Purificar a la Quimera Sapidae Arcana.
9. **El Umbral de Azufre** (`[3, 5]`, Guardián del Umbral): Quebrar los sellos de la Fortaleza Ígnea.
10. **La Purificación Primigenia** (`[5, 5]`, Espíritu de Atia): Gran batalla final en las Catacumbas Profundas contra el Señor de las Quimeras.

### 5.2 10 Misiones Secundarias (Mundo Abierto y Globos de Diálogo)
Otorgadas por habitantes de Lunacia distribuidos por el mapa 5x5:
1. **El Cartógrafo de las 25 Regiones** (`[3, 3]`, Sabio Cartógrafo): Consultar el mapa `[M]` y viajar a nuevos biomas.
2. **El Correo Extraviado** (`[2, 3]`, Cartero Lunaciano): Recuperar valijas de cartas dispersas.
3. **Elixir para el Bosque** (`[3, 2]`, Herborista Rosalba): Recolectar Musgo Luminoso de Atia.
4. **El Acero del Nómada** (`[5, 4]`, Herrero Baruk): Extraer coraza mineral de Quimeras de la sabana.
5. **El Desafío del Ojo Avizor** (`[5, 1]`, Cazador Zarek): Prueba de tiro y combate a distancia.
6. **Un Caldo en la Ventisca** (`[3, 1]`, Chef Boreal): Conseguir hongos azules polares en el hielo.
7. **Tótems de Escarcha Negra** (`[1, 1]`, Ermitaño Glacial): Destruir monolitos de hielo oscuro.
8. **Polvo de Estrellas Caídas** (`[1, 3]`, Astrólogo Astral): Reunir fragmentos de meteorito prismático.
9. **El Espejo de las Sombras** (`[1, 5]`, Chamán Espiritual): Disipar una proyección ilusoria en la niebla.
10. **La Reliquia del Minero Olvidado** (`[2, 5]`, Espíritu del Minero): Rescatar el pico de oro en la mazmorra.

---

## 6. Sistema de Globos de Diálogo Flotantes (Speech Bubbles)
- **Detección de Proximidad**: Cuando el héroe camina a una distancia `< 6.5m` de un NPC con llamada, se activa automáticamente el globo flotante (`.npc-speech-bubble`).
- **Proyección 3D a Pantalla**: Las coordenadas tridimensionales de la cabeza del NPC se proyectan en tiempo real a coordenadas $2D$ de pantalla (`Vector3.project(camera)`), con sujeción y sujeción dentro del viewport.
- **Insignias Contextuales**:
  - `❗`: Misión secundaria disponible.
  - `❓`: Misión lista para entregar.
  - `✨`: Misión de reclutamiento de héroe.
  - `💬`: Diálogo de ambiente o consejo.
- **Cola Estilo Cómic**: Flecha animada (`.npc-bubble-tail`) apuntando directamente a la coronilla del personaje 3D con animación de flotación suave (`@keyframes speechBubbleBounce`).

---

## 7. Resumen de Archivos Clave del Hito 4

| Archivo | Responsabilidad Principal |
| :--- | :--- |
| `src/rpg/QuestManager.js` | Base de datos de 20 misiones, progresión lineal y desbloqueo de aliados (`bing`, `pomodoro`). |
| `src/rpg/NPCManager.js` | Spawning multizona, proyección de Speech Bubbles 3D y controladores de diálogo de misiones. |
| `src/rpg/world/MapRegistry.js` | Matriz 5x5 de macro-zonas con registro geográfico de NPCs (`ZONE_NPCS`). |
| `src/rpg/world/WorldMapManager.js` | Transiciones de mapa, carga dinámica de NPCs de zona y hooks del cartógrafo al abrir `[M]`. |
| `src/rpg/ui/QuestBookModal.js` | Interfaz del Grimorio de Misiones con filtrado de categorías y badges de reclutamiento. |
| `styles.css` | Estilos para globos de diálogo flotantes, insignias, modales y supresión en estado de combate (`state-combat`). |

---

## 8. Optimizaciones y Correcciones Críticas

1. **Normalización Automática de Escala para NPCs 3D (`NPCManager.js`)**:
   - Para evitar inconsistencias con modelos de assets externos donde las unidades internas varían enormemente (ej. `fox.glb` con altura nativa > 70 unidades), se implementó un cálculo dinámico de caja delimitadora (`THREE.Box3`).
   - Todos los modelos se normalizan automáticamente a la altura estándar de héroe (~1.35m), con un clamp específico para modelos de zorros y animales (`scale <= 0.018`), garantizando proporciones coherentes dentro del camino de la macro-zona.
   - El punto de apoyo (pies) se alinea a nivel del suelo (`y = 0`) para evitar flotaciones o hundimientos en el terreno.

2. **Filtrado Estricto de Visibilidad en el Grimorio de Misiones (`QuestBookModal.js`)**:
   - Siguiendo los principios de inmersión y descubrimiento gradual, el Libro de Misiones (`[J]`) únicamente lista las misiones que el jugador ha adquirido activamente mediante interacciones con NPCs (`status === 'active' || status === 'ready_to_turn_in'`) o que ya ha completado con éxito (`status === 'completed'`).
   - Las misiones no descubiertas o bloqueadas permanecen invisibles hasta que el jugador encuentre al NPC correspondiente o avance en la historia.

3. **Supresión de Superposiciones del Overworld en Batalla Táctica**:
   - Para evitar que globos de llamada flotantes (`#npc-speech-bubble`) o indicadores de interacción (`#interaction-prompt`) permanezcan visibles sobre el tablero táctico, se configuró una regla estricta por CSS:
     ```css
     body.state-combat #npc-speech-bubble,
     body.state-combat .npc-speech-bubble,
     body.state-combat #interaction-prompt,
     body.state-combat .interaction-prompt {
       display: none !important;
       visibility: hidden !important;
       opacity: 0 !important;
     }
     ```
   - Al detonar cualquier encuentro de combate o transición, se añade la clase `state-combat` al `<body>` y se invoca `hideAllOverlays()` en `NPCManager.js` y `OverworldManager.js`. Al regresar victorioso o derrotado al Overworld, la clase se remueve de forma segura.

4. **Ciclo de Vida de Aliados de Macro-Zona y Reclutamiento Permanente (Misión 2 - Bing)**:
   - **Aliado Temporal Exclusivo de Zona**: Al interactuar por primera vez con Bing en la macro-zona `[4, 3]`, se activa la misión `quest_prove_ferocity` (paso `find_bing: true`). A partir de ese momento, mientras el jugador combata dentro de dicha macro-zona, `DynamicCombatFactory` incorpora dinámicamente a Bing al escuadrón táctico (`heroIds: ['kotaro', 'bing']`), desplegándolo en la casilla `(5, 2)` con su baraja de hechizos a distancia (`bing_explosive`, `bing_retreat`, `bing_slow`).
   - **Prevención de Bucle de Diálogo**: Si el jugador interactúa nuevamente con Bing antes de haber completado la batalla en `[4, 3]`, Bing no reinicia su discurso inicial, sino que le recuerda tácticamente el objetivo con un diálogo contextual de soporte ("¡No bajes la guardia! Las quimeras del bosque aún merodean...").
   - **Victoria y Desbloqueo Permanente**: Al vencer el combate en `[4, 3]`, `OverworldManager.resumeAfterVictory()` marca el paso `defend_bing` como completado y actualiza el HUD Tracker para solicitar hablar nuevamente con Bing.
   - **Reclutamiento Definitivo y Desaparición del Mapa**: Al hablar con Bing tras la batalla, se dispara el diálogo de graduación/victoria, se completa la Misión 2 activando la Misión 3 (`quest_hostile_sands`), se desbloquea a Bing permanentemente en el escuadrón mediante `EquipmentManager.unlockHero('bing')`, y Bing se retira de la escena de forma definitiva (`group.visible = false`), garantizando mediante comprobación en `loadZoneNPCs` y `update` que nunca vuelva a reaparecer al transitar o recargar la macro-zona `[4, 3]`.
