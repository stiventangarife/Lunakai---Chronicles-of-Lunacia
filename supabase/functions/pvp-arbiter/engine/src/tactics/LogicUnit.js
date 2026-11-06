// LogicUnit.js — Unidad sin modelo para el motor sin gráficos (Arena PvP, fase P0).
//
// Misma API de reglas que Unit.js (vida, escudo, PA, PM, casilla, estados, moveAlongPath, pushback…), con las mismas
// reglas (combat/UnitRules.js), pero sin three.js, sin DOM y sin animaciones: moverse, saltar y ser empujado son
// instantáneos. La usa HeadlessCombat (árbitro, repeticiones, pruebas en Node) y, más adelante, el servidor.

import { absorbDamage, refillTurn, walkPath, pushSteps, initUnitStats } from './combat/UnitRules.js';

export class LogicUnit {
  constructor(config, gridManager) {
    initUnitStats(this, config);
    this.gridManager = gridManager;
    this.sceneManager = null;
    this.audio = null;
    this.isLogic = true;

    const tile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (tile) tile.unit = this;
  }

  getSkillLevel(spellId) {
    return (this.skillLevels && this.skillLevels[spellId]) || 1;
  }

  // ---------------------------------------------- turno
  setActiveTurn(isActive) { this.isActiveTurn = isActive; }

  startTurn() {
    this.setActiveTurn(true);
    refillTurn(this);
  }

  endTurn() {
    this.setActiveTurn(false);
    // Los escudos de habilidades duran hasta el final del turno del receptor en la ronda siguiente
    // (lo gestiona SpellRules); los demás (escudo inicial) caducan al terminar el turno, como en Unit.
    if (this.shieldExpiresRound == null) this.shield = 0;
  }

  // ---------------------------------------------- movimiento (instantáneo)
  async moveAlongPath(path) {
    if (!path || path.length <= 1) return;
    this.isMoving = true;
    await walkPath(this, path);
    this.isMoving = false;
  }

  /** Salto: sin animación. Como en Unit, la casilla la actualiza quien llama (SpellRules._teleport / _executeJump). */
  async _hopToCell() {}
  jumpToCell() { return Promise.resolve(); }

  pushback(dx, dz, distance) {
    return pushSteps(this, dx, dz, distance);
  }

  // ---------------------------------------------- vida
  takeDamage(amount) {
    if (this.isDead) return 0;
    const actualDamage = absorbDamage(this, amount);
    if (this.currentHP <= 0) {
      this.isDead = true;
      if (typeof this.onDeath === 'function') {
        try { this.onDeath(this); } catch (err) { console.warn(`[LogicUnit] onDeath ${this.id}:`, err); }
      }
      this.die();
    }
    return actualDamage;
  }

  heal(amount) {
    if (this.isDead) return 0;
    const prev = this.currentHP;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    return this.currentHP - prev;
  }

  addShield(amount) {
    this.shield += amount;
  }

  die() {
    this.isDead = true;
    const tile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (tile && tile.unit === this) tile.unit = null;
    return Promise.resolve();
  }

  dieCinematic() { return this.die(); }

  // ---------------------------------------------- presentación (nada)
  updateHUD() {}
  updateWorldPosition() {}
  settleToTile() { return Promise.resolve(false); }
  clearDamageFlash() {}
  playAttackAnimation() {}
  flashPulse() {}
  dispose() {}
  update() {}
}

/** Gólem del Sapidae sin modelo: unidad del bando de su dueño, sin turno propio ni PA/PM (GolemRules). */
export class LogicGolem extends LogicUnit {
  constructor(config, gridManager) {
    super({ ...config, isGolem: true, maxPA: 0, maxPM: 0, initiative: 0 }, gridManager);
    this.isGolem = true;
    this.golemKind = config.golemKind;
    this.owner = config.owner || null;
    this.maxPA = 0;
    this.maxPM = 0;
    this.currentPA = 0;
    this.currentPM = 0;
  }

  startTurn() { /* sin turno propio */ }
  endTurn() { /* sin turno propio */ }
}
