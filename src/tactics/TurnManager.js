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
    this.alternateTeams = true; // turnos alternados entre bandos (el tutorial lo desactiva)

    // Callbacks
    this.onTurnChange = null;
    // Ganchos de reglas (estados, zonas, objetos temporales)
    this.onCombatStart = null;    // ()
    this.onRoundStart = null;     // (round)
    this.onUnitTurnStart = null;  // (unit) => { skip, died }
    this.onUnitTurnEnd = null;    // (unit)
    this.onVictory = null;
    this.onDefeat = null;
  }

  setUnits(units) {
    this.units = units;
    this.buildInitiativeQueue({ reset: true });
  }

  /**
   * Orden de la ronda (18-oct): turnos alternados entre bandos — jugador, enemigo, jugador…
   *  · cada bando se ordena por su iniciativa;
   *  · empieza el bando de la unidad con más iniciativa (empate: el jugador);
   *  · si un bando se queda sin unidades, el otro juega las que le quedan.
   * alternateTeams = false (tutorial) usa el orden de siempre: solo por iniciativa.
   *
   * El orden se decide UNA vez al empezar el combate (19-oct) y se mantiene en todas las rondas: quien cae solo
   * sale de la lista, sin que el resto cambie de puesto. Las unidades que aparezcan a mitad de combate van al final.
   */
  _computeOrder(units) {
    const byInit = (a, b) => b.initiative - a.initiative;
    const alive = units.filter(u => !u.isDead).sort(byInit);
    if (!this.alternateTeams) return alive;
    const players = alive.filter(u => u.team === 'player');
    const enemies = alive.filter(u => u.team !== 'player');
    const bestP = players.length ? players[0].initiative : -Infinity;
    const bestE = enemies.length ? enemies[0].initiative : -Infinity;
    const [first, second] = bestP >= bestE ? [players, enemies] : [enemies, players];
    const order = [];
    for (let i = 0; i < Math.max(first.length, second.length); i++) {
      if (i < first.length) order.push(first[i]);
      if (i < second.length) order.push(second[i]);
    }
    return order;
  }

  buildInitiativeQueue({ reset = false } = {}) {
    if (reset || !this.turnOrder) this.turnOrder = this._computeOrder(this.units);
    const newcomers = this.units.filter(u => !u.isDead && !this.turnOrder.includes(u));
    if (newcomers.length) this.turnOrder.push(...this._computeOrder(newcomers));
    this.queue = this.turnOrder.filter(u => !u.isDead);
  }

  startCombat() {
    this.round = 1;
    this.isCombatOver = false;
    this.turnEnding = false;
    this.units.forEach(u => {
      if (u.clearDamageFlash) u.clearDamageFlash();
    });
    this.buildInitiativeQueue({ reset: true });
    this.currentIndex = -1;
    if (this.onCombatStart) this.onCombatStart();
    if (this.onRoundStart) this.onRoundStart(this.round);
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
      if (this.onUnitTurnEnd) this.onUnitTurnEnd(prevUnit);
      prevUnit.endTurn();
    }

    // Move to next index
    this.currentIndex++;

    // If reached end of round, restart queue
    if (this.currentIndex >= this.queue.length) {
      this.round++;
      this.buildInitiativeQueue();
      this.currentIndex = 0;
      if (this.onRoundStart) this.onRoundStart(this.round);
    }

    const currentUnit = this.queue[this.currentIndex];

    // If this unit died during previous turn, skip to next
    if (currentUnit.isDead) {
      this.nextTurn();
      return;
    }

    // Start unit turn
    currentUnit.startTurn();

    // Estados al empezar el turno: daño periódico, recursos, aturdido/dormido
    const statusResult = this.onUnitTurnStart ? (this.onUnitTurnStart(currentUnit) || {}) : {};
    if (statusResult.died || currentUnit.isDead) {
      // Murió por daño periódico: se comprueba el fin del combate y se pasa al siguiente
      setTimeout(() => this.nextTurn(), 700);
      return;
    }

    // Focus camera
    const worldPos = currentUnit.gridManager.gridToWorld(currentUnit.gridX, currentUnit.gridZ);
    this.sceneManager.focusOn(worldPos);

    if (this.onTurnChange) {
      this.onTurnChange(currentUnit, this.queue, this.round, { skipped: Boolean(statusResult.skip) });
    }

    // Aturdido o dormido: pierde el turno automáticamente
    if (statusResult.skip) {
      this.isSkippingTurn = true;
      setTimeout(() => {
        this.isSkippingTurn = false;
        if (!this.isCombatOver && this.getActiveUnit() === currentUnit) this.nextTurn();
      }, 1100);
    }
  }

  async endCurrentTurn() {
    if (this.isCombatOver || this.isSkippingTurn) return; // el turno perdido se pasa solo
    if (this.turnEnding) return; // Fase 5: un segundo «fin de turno» durante la transición no salta otro turno
    this.turnEnding = true;
    try {
      await new Promise(r => setTimeout(r, 400));
      // nunca pasar de turno con la unidad todavía caminando (si no, el siguiente actúa con ella a medio camino)
      const unit = this.getActiveUnit();
      for (let t = 0; unit && unit.isMoving && t < 50; t++) await new Promise(r => setTimeout(r, 100));
    } finally {
      this.turnEnding = false;
    }
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
