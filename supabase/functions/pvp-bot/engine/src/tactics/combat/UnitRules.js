// UnitRules.js — Reglas de una unidad sin gráficos (Arena PvP, fase P0).
//
// Lo comparten la unidad con modelo (Unit.js) y la unidad lógica del motor sin gráficos (LogicUnit.js), para que el
// combate dé exactamente lo mismo con y sin escena: vida y escudo, recursos al empezar el turno, caminar por un
// camino y ser empujado. Aquí no hay three.js, ni DOM, ni tiempo real: la animación de cada paso (si la hay) la pone
// quien llama con `step(x, z)`.

/**
 * Daño recibido: primero el escudo, luego la vida. Runas y charms: `lethalGuard` (sobrevivir a un golpe letal) y
 * `afterDamage` (reaccionar al daño). No decide la muerte: devuelve el daño que llegó a la vida.
 */
export function absorbDamage(unit, amount) {
  let actualDamage = Number(amount) || 0;
  if (unit.shield > 0) {
    if (unit.shield >= actualDamage) {
      unit.shield -= actualDamage;
      actualDamage = 0;
    } else {
      actualDamage -= unit.shield;
      unit.shield = 0;
    }
  }
  const cur = typeof unit.currentHP === 'number' && !isNaN(unit.currentHP) ? unit.currentHP : 0;
  unit.currentHP = Math.max(0, cur - actualDamage);
  if (unit.currentHP <= 0 && typeof unit.lethalGuard === 'function' && unit.lethalGuard(unit)) {
    unit.currentHP = Math.max(1, unit.currentHP);
  }
  if (unit.currentHP > 0 && actualDamage > 0 && typeof unit.afterDamage === 'function') unit.afterDamage(unit);
  return actualDamage;
}

/** PA y PM al empezar el turno, con los bonos y castigos temporales de `buffs` (y su duración). */
export function refillTurn(unit) {
  unit.currentPA = unit.maxPA;
  unit.currentPM = unit.maxPM;
  for (let i = unit.buffs.length - 1; i >= 0; i--) {
    const b = unit.buffs[i];
    if (b.type === 'bonusPA') {
      unit.currentPA += b.value;
    } else if (b.type === 'minusPM') {
      unit.currentPM = Math.max(0, unit.currentPM - b.value);
    }
    b.duration--;
    if (b.duration <= 0) {
      unit.buffs.splice(i, 1);
    }
  }
}

/**
 * Camina por `path` (la primera casilla es la de salida). Cada paso cuesta 1 PM. Nunca entra en un obstáculo y nunca
 * termina (ni se detiene) encima de otra unidad viva: se puede cruzar a un aliado, no quedarse en su casilla.
 * hooks: step(x, z) → animación del paso (await) · afterStep() → refrescar la ficha · snap() → colocar el modelo.
 */
export async function walkPath(unit, path, { step = null, afterStep = null, snap = null } = {}) {
  const grid = unit.gridManager;
  // 1. La casilla de salida queda libre en cuanto empieza a andar
  const originTile = grid.getTile(unit.gridX, unit.gridZ);
  if (originTile && originTile.unit === unit) originTile.unit = null;

  for (let i = 1; i < path.length; i++) {
    const nextStep = path[i];
    const isFinalStep = (i === path.length - 1);

    // Nunca pisar un obstáculo ni una casilla no transitable
    const stepTile = grid.getTile(nextStep.x, nextStep.z);
    if (!stepTile || !stepTile.walkable || stepTile.obstacle) {
      console.warn(`[Unit.moveAlongPath] Blocked illegal step onto obstacle/unwalkable cell (${nextStep.x}, ${nextStep.z}) by "${unit.name}". Halting movement.`);
      break;
    }
    // Fase 5: nunca terminar (ni detenerse) encima de otra unidad viva; se puede cruzar a un aliado, no quedarse
    const occupant = stepTile.unit && stepTile.unit !== unit && !stepTile.unit.isDead ? stepTile.unit : null;
    if (occupant && (isFinalStep || occupant.team !== unit.team)) {
      console.warn(`[Unit.moveAlongPath] (${nextStep.x}, ${nextStep.z}) ocupada por "${occupant.name}": "${unit.name}" se detiene antes.`);
      break;
    }

    if (step) await step(nextStep.x, nextStep.z);

    unit.gridX = nextStep.x;
    unit.gridZ = nextStep.z;
    unit.currentPM = Math.max(0, unit.currentPM - 1);
    afterStep?.();

    // Solo la casilla final apunta a la unidad (nunca se pisa a un aliado de una casilla intermedia)
    if (isFinalStep) {
      const destTile = grid.getTile(nextStep.x, nextStep.z);
      if (destTile) destTile.unit = unit;
    }
  }

  // La casilla final queda registrada (sin pisar a otra unidad viva si el movimiento se detuvo sobre un aliado)
  let finalTile = grid.getTile(unit.gridX, unit.gridZ);
  if (finalTile && finalTile.unit && finalTile.unit !== unit && !finalTile.unit.isDead) {
    // retrocede por el camino hasta la última casilla libre
    for (let k = path.length - 1; k >= 0; k--) {
      const t = grid.getTile(path[k].x, path[k].z);
      if (t && (!t.unit || t.unit === unit || t.unit.isDead) && t.walkable !== false && !t.obstacle) {
        unit.gridX = path[k].x; unit.gridZ = path[k].z;
        snap?.();
        finalTile = t;
        break;
      }
    }
  }
  if (finalTile && (!finalTile.unit || finalTile.unit.isDead || finalTile.unit === unit)) finalTile.unit = unit;
}

/**
 * Empujón de `distance` casillas en la dirección (dx, dz). Se para contra el borde, un obstáculo o una unidad.
 * hooks: step(x, z) → animación de cada casilla (await). Devuelve { actualPushed, hitObstacle, remainingTiles, collidingUnit }.
 */
export async function pushSteps(unit, dx, dz, distance, { step = null } = {}) {
  const grid = unit.gridManager;
  let actualPushed = 0;
  let hitObstacle = false;
  let collidingUnit = null;

  for (let s = 1; s <= distance; s++) {
    const testX = unit.gridX + dx;
    const testZ = unit.gridZ + dz;

    if (!grid.isValidCoord(testX, testZ)) {
      hitObstacle = true;
      break;
    }

    const tile = grid.getTile(testX, testZ);
    if (!tile.walkable || tile.obstacle) {
      hitObstacle = true;
      break;
    }

    if (tile.unit) {
      collidingUnit = tile.unit;
      hitObstacle = true;
      break;
    }

    const oldTile = grid.getTile(unit.gridX, unit.gridZ);
    if (oldTile && oldTile.unit === unit) oldTile.unit = null;
    tile.unit = unit;

    unit.gridX = testX;
    unit.gridZ = testZ;
    actualPushed++;

    if (step) await step(testX, testZ);
  }

  return {
    actualPushed,
    hitObstacle,
    remainingTiles: distance - actualPushed,
    collidingUnit,
  };
}

/** Estadísticas de combate de una unidad a partir de su configuración (lo mismo con y sin modelo). */
export function initUnitStats(unit, config) {
  unit.config = config;
  unit.id = config.id;
  unit.name = config.name;
  unit.archetype = config.archetype || null;
  unit.type = config.type;
  unit.team = config.team;
  unit.pvpSide = config.pvpSide ?? null; // Arena PvP (P3): bando fijo 'A' | 'B' (el equipo depende de quién mira)

  unit.maxHP = config.maxHP || 300;
  // Vida persistente (18-oct): los héroes entran al combate con la vida que tenían en el mundo abierto
  unit.currentHP = (typeof config.currentHP === 'number' && !isNaN(config.currentHP))
    ? Math.max(1, Math.min(unit.maxHP, Math.round(config.currentHP)))
    : unit.maxHP;
  unit.shield = config.initialShield || 0;
  unit.bonusDamage = config.bonusDamage || 0;
  unit.bonusMeleeDamage = config.bonusMeleeDamage || 0;
  unit.bonusRangedDamage = config.bonusRangedDamage || 0;
  unit.bonusMagicDamage = config.bonusMagicDamage || 0;
  unit.collisionBonus = config.collisionBonus || 0;
  unit.critRate = config.critRate || 0;
  unit.supportPower = config.supportPower || 0;
  unit.skillLevels = config.skillLevels || {};
  unit.maxPA = config.maxPA || 6;
  unit.currentPA = unit.maxPA;
  unit.maxPM = config.maxPM || 3;
  unit.currentPM = unit.maxPM;
  unit.initiative = config.initiative || 100;

  unit.spellIds = config.spellIds || [];
  unit.buffs = [];
  unit.statuses = []; // estados alterados (StatusSystem)
  // Clase de Axie de la unidad ('Beast', 'Plant', 'Mech'…). La usan el triángulo elemental y la Ultimate.
  unit.axieClass = config.axieClass || null;

  unit.gridX = config.x || 0;
  unit.gridZ = config.z || 0;

  unit.isDead = false;
  unit.isMoving = false;
  unit.isActiveTurn = false;
}
