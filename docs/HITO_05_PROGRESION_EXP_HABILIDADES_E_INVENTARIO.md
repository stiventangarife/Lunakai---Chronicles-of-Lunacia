# Hito 5: Progresión de Experiencia por Escuadrón, Habilidades e Inventario Rediseñado

## 1. Visión General
El quinto hito consolidó la profundidad RPG de **Axie Tactics**, introduciendo un sistema integral de **Progresión de Experiencia y Subida de Nivel para el Escuadrón**, cuatro **Atributos Elementales Asignables**, un sistema de **Costes Escalonados para Mejora de Habilidades**, y un **Rediseño Completo de la Interfaz de Inventario** basado en tres columnas con muñeco de papel (*Paper Doll*) cruciforme, ranuras limpias con tooltip flotante, desequipado en 1 clic y corrección de la disposición de tarjetas en la mochila.

---

## 2. Sistema de Experiencia y Subida de Nivel del Escuadrón (`src/rpg/EquipmentManager.js`)

### 2.1 Curva Dinámica de Nivel
Para garantizar un avance ágil y satisfactorio (sin ser trivial al inicio ni frustrante en niveles avanzados), se diseñó una curva exponencial moderada calibrada:

$$\text{EXP Requerida}(L) = \text{round}(100 \times L^{1.35})$$

Donde $L$ representa el nivel actual del Axie:

| Nivel Actual $\to$ Siguiente | EXP Requerida | EXP Acumulada Aprox. |
| :---: | :---: | :---: |
| **Nivel 1 $\to$ 2** | $100\text{ EXP}$ | $100\text{ EXP}$ |
| **Nivel 2 $\to$ 3** | $255\text{ EXP}$ | $355\text{ EXP}$ |
| **Nivel 3 $\to$ 4** | $441\text{ EXP}$ | $796\text{ EXP}$ |
| **Nivel 4 $\to$ 5** | $651\text{ EXP}$ | $1,447\text{ EXP}$ |
| **Nivel 5 $\to$ 6** | $880\text{ EXP}$ | $2,327\text{ EXP}$ |

### 2.2 Reglas de Reparto de Experiencia por Participación
El escuadrón activo se compone de hasta **3 Axies** (1 Héroe Líder y 2 Aliados de Apoyo equipados). La experiencia obtenida en combate o mediante misiones se distribuye según el rol y participación activa:
- 👑 **Héroe Líder Activo**: Recibe el **$100\%$** de la EXP base otorgada.
- 🛡️ **Aliados de Apoyo Equipados y Participantes**: Reciben el **$60\%$** de la EXP.
- 💤 **Axies en Reserva / No Equipados**: Reciben el **$0\%$** (no acumulan EXP pasiva sin participar en la batalla).

### 2.3 Beneficios por Subida de Nivel
Cada vez que un Axie sube de nivel, obtiene simultáneamente bonos automáticos y puntos asignables por el jugador:
1. **Bonificaciones Base Automáticas**:
   - $+2\text{ HP Máximo}$ permanente.
   - $+3\text{ Iniciativa de Turno}$ permanente.
2. **Puntos para el Jugador**:
   - $+3\text{ Puntos de Atributos}$ para distribuir entre las estadísticas básicas.
   - $+1\text{ Punto de Habilidad}$ para potenciar cartas/habilidades de combate.

---

## 3. Sistema de Atributos Elementales Simplificados

Se establecieron 4 atributos principales personalizables inspirados en dinámicas tácticas elementales, complementados por estadísticas fijas gobernadas exclusivamente por objetos equipables:

### 3.1 Atributos Asignables por Puntos

| Atributo | Icono / Elemento | Beneficios por Punto Asignado |
| :--- | :---: | :--- |
| **Vitalidad** | ❤️ Tierra / Vida | $+1.0\text{ HP}$ por punto asignado (además de los $+2\text{ HP}$ base automáticos por nivel). |
| **Ferocidad** | ⚔️ Fuego / Fuerza | $+1.5\text{ Daño Melee (Cuerpo a Cuerpo)}$ y $+1.0\text{ Daño de Colisión por Empuje}$. |
| **Agilidad** | 🏹 Aire / Destreza | $+1.2\text{ Daño de Rango}$ y $+0.5\%\text{ Probabilidad de Golpe Crítico}$. |
| **Esencia** | ✨ Agua / Magia | $+1.2\text{ Daño Mágico}$ y $+2.0\%\text{ Eficacia de Curación y Escudos}$. |

### 3.2 Estadísticas Fijas y de Equipamiento (No asignables directamente)
- **Puntos de Acción (PA)**: Base $6\text{ PA}$ $+$ Bonificaciones de armas y accesorios.
- **Puntos de Movimiento (PM)**: Base $3\text{ PM}$ $+$ Bonificaciones de botas y equipo ligero.
- **Daño Adicional**: Base según clase de Axie (Bestia, Pájaro, Planta, etc.) $+$ Daño de armas equipadas.
- **Escudo Inicial**: Base según clase $+$ Escudo otorgado por armaduras y escudos.
- **Iniciativa**: Base según clase $+$ Bonos de botas/equipo $+$ $3\text{ de Iniciativa}$ por nivel alcanzado.

---

## 4. Sistema de Habilidades con Coste Escalonado

Cada Axie cuenta con sus cartas activas de combate (derivadas de sus partes del cuerpo: Boca, Cuerno, Espalda y Cola). La mejora de nivel de estas habilidades utiliza una escala de coste creciente:

$$\text{Coste de Mejora}(N \to N + 1) = N \text{ Puntos de Habilidad}$$

- **Nivel 1 $\to$ Nivel 2**: Requiere **$1$ Punto de Habilidad**.
- **Nivel 2 $\to$ Nivel 3**: Requiere **$2$ Puntos de Habilidad**.
- **Nivel 3 $\to$ Nivel 4**: Requiere **$3$ Puntos de Habilidad**.
- **Nivel 4 $\to$ Nivel 5**: Requiere **$4$ Puntos de Habilidad**.

Esta progresión fomenta decisiones estratégicas entre especializar una habilidad estrella a niveles máximos o diversificar el repertorio de cartas del Axie.

---

## 5. Rediseño de la Interfaz de Inventario (`src/ui/InventoryModal.js` y `public/css/styles.css`)

Se rediseñó por completo el modal de inventario (`[I]`), transformándolo en una interfaz limpia, espaciosa e intuitiva dividida en 3 columnas maestras sin barras de desplazamiento visibles:

```
+-------------------+---------------------------+-----------------------+
| 1. AXIE & STATS   | 2. PAPER DOLL CRUCIFORME  | 3. MOCHILA & OBJETOS  |
|                   |                           |                       |
| Selector Escuadrón|         [ SOMBRERO ]      | [Todas][Armas][Armad] |
| Vitalidad   [+]   | [ARMA]  [ CUERPO ] [ESCUD]| +---------+ +---------+ |
| Ferocidad   [+]   |         [ BOTAS ]         | | Tarjeta | | Tarjeta | |
| Agilidad    [+]   |                           | | Ítem 1  | | Ítem 2  | |
| Esencia     [+]   |      [Desequipar 1-Clic]  | | [Equip] | | [Equip] | |
| Puntos Disp: 3    |    (Tooltip al pasar cursor) +---------+ +---------+ |
+-------------------+---------------------------+-----------------------+
```

### 5.1 Columna Izquierda: Selector de Axie y Atributos Interactivos
- Selector tipo carrusel con miniatura, nombre, nivel actual y barra de progreso de EXP.
- Panel de asignación de atributos interactivo:
  - Muestra los valores base, bonos por puntos y bonos por equipo.
  - Botones discretos `[+]` activos únicamente cuando el Axie dispone de `statPoints > 0`.
  - Desglose informativo del impacto en estadísticas de combate (Melee, Rango, Crítico, Curación).

### 5.2 Columna Central: Paper Doll Cruciforme y Ranuras Limpias
- **Disposición en Cruz 3x3**:
  - `hat` (Sombrero / Casco): Fila superior central `grid-column: 2, grid-row: 1`.
  - `weapon` (Arma): Fila media izquierda `grid-column: 1, grid-row: 2`.
  - `body` (Armadura / Peto): Centro neurálgico `grid-column: 2, grid-row: 2`.
  - `shield` (Escudo / Accesorio secundario): Fila media derecha `grid-column: 3, grid-row: 2`.
  - `boots` (Botas de movimiento): Fila inferior central `grid-column: 2, grid-row: 3`.
- **Fondo de Silueta**: El centro del contenedor integra un avatar/silueta translúcida del Axie seleccionado para máxima inmersión.
- **Visualización Limpia de Ranuras**: Las casillas equipadas exhiben exclusivamente la imagen/icono estilizado del objeto, sin textos redundantes que saturen la vista.
- **Tooltip Flotante Dinámico**: Al pasar el ratón (`mouseenter`) sobre cualquier ranura equipada, emerge una ventana flotante anclada a la posición del cursor con:
  - Nombre del ítem con color de rareza (*Common, Rare, Epic, Legendary*).
  - Desglose exacto de estadísticas y bonos aportados.
  - Indicación interactiva: *"Haz clic para desequipar"*.
- **Desequipado en 1 Clic**: Un simple clic sobre la ranura retira el objeto inmediatamente y lo devuelve a la mochila sin fricción de menús contextuales.

### 5.3 Columna Derecha: Mochila y Corrección de Tarjetas
- Pestañas de filtrado rápido (*Todo, Armas, Armaduras, Accesorios, Consumibles*).
- **Corrección de Solapamiento de Tarjetas**:
  - *Problema previo*: El botón inferior "Equipar" de cada tarjeta sobrepasaba los límites del contenedor y pisaba la cabecera del siguiente ítem.
  - *Solución*: Se ajustó la rejilla con `grid-auto-rows: min-content`, espaciado vertical `gap: 14px`, `box-sizing: border-box`, `overflow: visible` y márgenes calibrados, asegurando que cada tarjeta encapsule perfectamente sus botones y descripciones.
- **Eliminación Total de Barras de Scroll**:
  - Se configuró la maquetación CSS con `overflow: hidden` y selectores `::-webkit-scrollbar { display: none; }` junto con `scrollbar-width: none` para Firefox, logrando una estética moderna y limpia en resoluciones estándar.

---

## 6. Pantalla de Victoria de Combate (`src/ui/CombatVictoryModal.js`)

Al vencer en combate táctico contra Quimeras errantes:
1. El modal presenta la experiencia base total obtenida en el encuentro.
2. Desglosa individualmente a cada miembro del escuadrón:
   - Avatar del Axie y distintivo de rol (👑 Líder o 🛡️ Apoyo).
   - Indicador del porcentaje aplicado ($100\%$ o $60\%$).
   - Barra de EXP animada visualmente desde su progreso anterior hasta el nuevo total.
   - Efecto luminoso de **"¡LEVEL UP!"** cuando el Axie alcanza un nuevo nivel, informando los $+3$ puntos de stats y $+1$ punto de habilidad adquiridos.

---

## 7. Resumen de Archivos Clave del Hito 5

| Archivo | Responsabilidad Principal |
| :--- | :--- |
| `src/rpg/EquipmentManager.js` | Motor de progresión de EXP, distribución de experiencia por escuadrón, fórmula de subida de nivel, atributos elementales y costes escalonados de habilidades. |
| `src/rpg/ItemDatabase.js` | Catálogo de objetos equipables (armas, armaduras, escudos, botas) con atributos de combate asignados. |
| `src/ui/InventoryModal.js` | Lógica y renderizado del inventario de 3 columnas, paper doll cruciforme, tooltip flotante y gestión de eventos de equipar/desequipar. |
| `public/css/styles.css` | Estilos del paper doll 3x3, rejilla de mochila sin solapamientos, tooltips flotantes e invisibilidad de scrollbars. |
| `src/ui/CombatVictoryModal.js` | Modal de recompensas post-combate con desglose y animación de experiencia del escuadrón. |
