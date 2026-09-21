# Hito 7: UI del Escuadrón en Mundo Abierto (Marcos de Axies, HP, PA & PM)

## 1. Resumen de la Implementación
Se ha implementado una interfaz visual estilizada (**HUD del Escuadrón**) para el mundo abierto de Lunacia. Esta interfaz permite al jugador monitorear en tiempo real la salud y recursos tácticos de todos los miembros activos del grupo, destacando su identidad de clase mediante marcos decorativos distintivos.

---

## 2. Componentes y Arquitectura

### 2.1. Marcos Visuales por Axie (`SquadHUD.js` & `styles.css`)
Cada tarjeta de Axie cuenta con un marco hexagonal/diamante con bisel metálico, ornatos y resplandor según su arquetipo:
- **Kotaro (Bestia - Duelista Melee)**:
  - Marco: Bisel dorado/ámbar con resplandor cálido (`#f59e0b`).
  - Icono: `⚔️`.
  - Insignia de Clase: `BESTIA`.
  - Recursos base: 340 HP | 6 PA | 3 PM.
- **Bing (Pájaro - Tirador de Rango)**:
  - Marco: Bisel cian eólico con resplandor celeste (`#38bdf8`).
  - Icono: `🏹`.
  - Insignia de Clase: `PÁJARO`.
  - Recursos base: 240 HP | 6 PA | 4 PM.
- **Pomodoro (Planta - Sanador y Control)**:
  - Marco: Bisel esmeralda con resplandor botánico (`#10b981`).
  - Icono: `🌱`.
  - Insignia de Clase: `PLANTA`.
  - Recursos base: 260 HP | 6 PA | 3 PM.

### 2.2. Métricas y Recursos Visibles
- **Insignia de Nivel**: Superpuesta en el marco del avatar (`Nv. 1`).
- **Barra de Vida (HP)**: Gradiente dinámico de salud con indicador numérico (`340 / 340 HP`).
- **Puntos de Acción (PA)**: Insignia de cristal de energía (`⚡ 6 PA`).
- **Puntos de Movimiento (PM)**: Insignia de agilidad (`👟 3 PM` o `4 PM`).

### 2.3. Reactividad y Eventos (`EquipmentManager.js`)
- Patrón Observer con `addListener`, `removeListener` y `_notifyChange()`.
- Se actualiza automáticamente al:
  1. Desbloquear nuevos héroes (`unlockHero`).
  2. Equipar o desequipar armas/armaduras (`equipItem`, `unequipItem`).
  3. Ganar EXP o subir de nivel (`addExpToHero`).
  4. Asignar atributos o mejorar habilidades (`allocateStatPoint`, `upgradeSkill`).

### 2.4. Interactividad
- Al hacer clic en la tarjeta de cualquier Axie, se abre instantáneamente la pantalla de **Inventario y Atributos** enfocada directamente en ese héroe específico.

### 2.5. Transición entre Exploración y Combate
- La UI está anclada a la esquina inferior izquierda de la pantalla (`bottom: 24px; left: 24px`).
- Al entrar en combate táctico (`state-combat`), la UI se oculta automáticamente.
- Al terminar el combate (por victoria o retirada al dojo), se restaura inmediatamente con los valores actualizados.

---

## 3. Pruebas y Verificación Automatizada
Ejecutadas con éxito en `scratch/verify_squad_hud.cjs` vía Chrome Headless CDP:
- ✅ Render inicial de Kotaro con marco Bestia, 340 HP, 6 PA, 3 PM.
- ✅ Reclutamiento de Bing: aparece su marco de Pájaro con 240 HP, 6 PA, 4 PM.
- ✅ Reclutamiento de Pomodoro: aparece su marco de Planta con 260 HP, 6 PA, 3 PM.
- ✅ Reactividad a cambios de equipamiento y atributos.
- ✅ Clic en tarjeta abre el inventario enfocado en el Axie seleccionado.
- ✅ Ocultamiento correcto durante el combate y restauración al volver al mundo abierto.
