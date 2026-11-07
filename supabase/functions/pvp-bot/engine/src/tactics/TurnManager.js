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
    // Arena PvP (P0): sim = true → sin esperas ni cámara (motor sin gráficos: todo pasa en el acto y en orden fijo).
    // tieBreak: bando que empieza con empate de iniciativa ('player' | 'enemy'); null = el jugador, como siempre.
    this.sim = false;
    this.tieBreak = null;

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
    // Hito 95: los gólems del Sapidae no tienen turno propio (actúan al final del turno de su dueño)
    const alive = units.filter(u => !u.isDead && !u.isGolem).sort(byInit);
    if (!this.alternateTeams) return alive;
    const players = alive.filter(u => u.team === 'player');
    const enemies = alive.filter(u => u.team !== 'player');
    const bestP = players.length ? players[0].initiative : -Infinity;
    const bestE = enemies.length ? enemies[0].initiative : -Infinity;
    const playersFirst = bestP > bestE || (bestP === bestE && this.tieBreak !== 'enemy');
    const [first, second] = playersFirst ? [players, enemies] : [enemies, players];
    const order = [];
    for (let i = 0; i < Math.max(first.length, second.length); i++) {
      if (i < first.length) order.push(first[i]);
      if (i < second.length) order.push(second[i]);
    }
    return order;
  }

  buildInitiativeQueue({ reset = false } = {}) {
    if (reset || !this.turnOrder) this.turnOrder = this._computeOrder(this.units);
    const newcomers = this.units.filter(u => !u.isDead && !u.isGolem && !this.turnOrder.includes(u));
    if (newcomers.length) this.turnOrder.push(...this._computeOrder(newcomers));
    this.queue = this.turnOrder.filter(u => !u.isDead);
  }

  startCombat() {
    this.round = 1;
    this.isCombatOver = false;
    this.endReason = null;
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

    // Hito 82 · red de seguridad: al cambiar de turno, toda unidad viva vuelve al centro de su casilla si un efecto la
    // dejó desplazada (p. ej. entre dos casillas tras el ataque de una quimera)
    for (const u of this.queue || []) { if (u && !u.isDead && !u.isMoving) u.settleToTile?.(); }

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
      this._later(() => this.nextTurn(), 700);
      return;
    }

    // Focus camera (según Opciones › Cámara de combate)
    if (!this.sim) {
      const worldPos = currentUnit.gridManager.gridToWorld(currentUnit.gridX, currentUnit.gridZ);
      this.sceneManager.focusOnTurn(worldPos, currentUnit);
    }

    if (this.onTurnChange) {
      this.onTurnChange(currentUnit, this.queue, this.round, { skipped: Boolean(statusResult.skip) });
    }

    // Aturdido o dormido: pierde el turno automáticamente
    if (statusResult.skip) {
      this.isSkippingTurn = true;
      this._later(() => {
        this.isSkippingTurn = false;
        if (!this.isCombatOver && this.getActiveUnit() === currentUnit) this.nextTurn();
      }, 1100);
    }
  }

  /** Espera de presentación; en simulación se ejecuta en el acto (mismo orden, sin tiempo real). */
  _later(fn, ms) {
    if (this.sim) { fn(); return; }
    this._pendingLater = (this._pendingLater || 0) + 1;
    setTimeout(() => { this._pendingLater--; fn(); }, ms);
  }

  /**
   * Arena PvP (P3): espera a que el paso de turno termine del todo (turnos perdidos por aturdimiento, muertes por
   * daño periódico…). Solo entonces el estado es el mismo que el del motor sin gráficos y se puede calcular la huella.
   */
  async settled() {
    for (let i = 0; i < 400 && ((this._pendingLater || 0) > 0 || this.turnEnding); i++) await new Promise((r) => setTimeout(r, 25));
  }

  async endCurrentTurn() {
    if (this.isCombatOver || this.isSkippingTurn) return; // el turno perdido se pasa solo
    if (this.turnEnding) return; // Fase 5: un segundo «fin de turno» durante la transición no salta otro turno
    this.turnEnding = true;
    if (this.sim) {
      this.turnEnding = false;
      this.nextTurn();
      return;
    }
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

    // Hito 48: regla de fin propia (duelo de entrenamiento: al 30 % de vida). Cuenta como victoria del escuadrón.
    if (typeof this.endRule === 'function') {
      const reason = this.endRule(this.units.filter(u => !u.isGolem));
      if (reason) {
        this.isCombatOver = true;
        this.endReason = reason;
        if (this.onVictory) this.onVictory();
        return true;
      }
    }

    // Hito 95: un gólem en pie no evita la derrota ni la victoria
    const playersAlive = this.units.filter(u => u.team === 'player' && !u.isDead && !u.isGolem);
    const enemiesAlive = this.units.filter(u => u.team === 'enemy' && !u.isDead && !u.isGolem);

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
