// TurnManager.js - Initiative Queue, Round Counter, and Non-Atomic Turn Transitions
export class TurnManager {
  constructor(sceneManager, audio) {
    this.sceneManager = sceneManager;
    this.audio = audio;

    this.units = [];
    this.queue = [];
    this.currentIndex = -1;
    this.round = 1;
    this.isCombatOver = false;

    // Callbacks
    this.onTurnChange = null;
    this.onVictory = null;
    this.onDefeat = null;
  }

  setUnits(units) {
    this.units = units;
    this.buildInitiativeQueue();
  }

  buildInitiativeQueue() {
    // Filter alive units and sort by initiative descending
    const aliveUnits = this.units.filter(u => !u.isDead);
    aliveUnits.sort((a, b) => b.initiative - a.initiative);
    this.queue = aliveUnits;
  }

  startCombat() {
    this.round = 1;
    this.isCombatOver = false;
    this.units.forEach(u => {
      if (u.clearDamageFlash) u.clearDamageFlash();
    });
    this.buildInitiativeQueue();
    this.currentIndex = -1;
    this.nextTurn();
  }

  getActiveUnit() {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  nextTurn() {
    if (this.isCombatOver) return;

    // Check combat end conditions first
    if (this.checkCombatEnd()) return;

    // Finish current unit turn if any
    const prevUnit = this.getActiveUnit();
    if (prevUnit && !prevUnit.isDead) {
      prevUnit.endTurn();
    }

    // Move to next index
    this.currentIndex++;

    // If reached end of round, restart queue
    if (this.currentIndex >= this.queue.length) {
      this.round++;
      this.buildInitiativeQueue();
      this.currentIndex = 0;
    }

    const currentUnit = this.queue[this.currentIndex];

    // If this unit died during previous turn, skip to next
    if (currentUnit.isDead) {
      this.nextTurn();
      return;
    }

    // Start unit turn
    currentUnit.startTurn();

    // Focus camera
    const worldPos = currentUnit.gridManager.gridToWorld(currentUnit.gridX, currentUnit.gridZ);
    this.sceneManager.focusOn(worldPos);

    if (this.onTurnChange) {
      this.onTurnChange(currentUnit, this.queue, this.round);
    }
  }

  async endCurrentTurn() {
    if (this.isCombatOver) return;
    await new Promise(r => setTimeout(r, 400));
    this.nextTurn();
  }

  checkCombatEnd() {
    if (this.isCombatOver) return true;

    const playersAlive = this.units.filter(u => u.team === 'player' && !u.isDead);
    const enemiesAlive = this.units.filter(u => u.team === 'enemy' && !u.isDead);

    if (enemiesAlive.length === 0) {
      this.isCombatOver = true;
      if (this.onVictory) this.onVictory();
      return true;
    }

    if (playersAlive.length === 0) {
      this.isCombatOver = true;
      if (this.onDefeat) this.onDefeat();
      return true;
    }

    return false;
  }
}
