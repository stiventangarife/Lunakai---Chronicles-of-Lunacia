// BattlefieldObjects.js — Objetos temporales del tablero.
//
// - Invocaciones sin barra de vida (Barricada, Hollow Trunk): bloquean paso y línea de visión
//   durante N rondas fijas y desaparecen solas. Indestructibles mientras duran.
// - Zonas (Pozo Gravitatorio…): casillas alteradas durante N rondas. Al empezar su turno dentro
//   de la zona, cada unidad recibe el efecto según su equipo respecto al creador.
//
// "N rondas fijas": colocado en la ronda R, desaparece al empezar la ronda R + N.

export class BattlefieldObjects {
  constructor({ gridManager, events }) {
    this.gridManager = gridManager;
    this.events = events;
    this.round = 1;
    this.obstacles = []; // { x, z, type, expiresAtRound, owner, kind }
    this.zones = [];     // { cells:[{x,z}], expiresAtRound, owner, kind, ally:{pm,pa}, enemy:{pm,pa} }
  }

  reset() {
    this.obstacles = [];
    this.zones = [];
    this.round = 1;
  }

  /** Coloca un obstáculo temporal en una casilla vacía. Devuelve el objeto o null. */
  placeObstacle({ x, z, type = 'wood_post', rounds = 2, owner = null, kind = 'obstacle' }) {
    const tile = this.gridManager.getTile(x, z);
    if (!tile || tile.unit || tile.obstacle) return null;
    this.gridManager.setObstacle(x, z, type);
    const obj = { x, z, type, kind, owner, expiresAtRound: this.round + rounds };
    this.obstacles.push(obj);
    this.events?.emit('field:obstaclePlaced', { ...obj, pos: this.gridManager.gridToWorld(x, z) });
    return obj;
  }

  placeZone({ cells, rounds = 2, owner = null, kind = 'zone', ally = {}, enemy = {} }) {
    const valid = cells.filter((c) => this.gridManager.isValidCoord(c.x, c.z));
    const zone = { cells: valid, owner, kind, ally, enemy, expiresAtRound: this.round + rounds };
    this.zones.push(zone);
    this.events?.emit('field:zonePlaced', { ...zone, positions: valid.map((c) => this.gridManager.gridToWorld(c.x, c.z)) });
    return zone;
  }

  zonesAt(x, z) { return this.zones.filter((zn) => zn.cells.some((c) => c.x === x && c.z === z)); }

  /** Al empezar una ronda: caducan obstáculos y zonas. */
  onRoundStart(round) {
    this.round = round;
    for (const ob of [...this.obstacles]) {
      if (round >= ob.expiresAtRound) {
        this._removeObstacle(ob);
      }
    }
    for (const zn of [...this.zones]) {
      if (round >= zn.expiresAtRound) {
        this.zones.splice(this.zones.indexOf(zn), 1);
        this.events?.emit('field:zoneExpired', { ...zn });
      }
    }
  }

  /** Al empezar el turno de una unidad: efectos de las zonas donde está. */
  onTurnStart(unit) {
    for (const zn of this.zonesAt(unit.gridX, unit.gridZ)) {
      const friendly = zn.owner && zn.owner.team === unit.team;
      const fx = friendly ? zn.ally : zn.enemy;
      if (!fx) continue;
      if (fx.pm) unit.currentPM = Math.max(0, unit.currentPM + fx.pm);
      if (fx.pa) unit.currentPA = Math.max(0, unit.currentPA + fx.pa);
      if (fx.pm || fx.pa) {
        unit.updateHUD?.();
        this.events?.emit(fx.pm > 0 || fx.pa > 0 ? 'unit:resourceGained' : 'unit:resourceLost', {
          unit, source: zn.owner, spell: null,
          pm: fx.pm ? Math.abs(fx.pm) : undefined, pa: fx.pa ? Math.abs(fx.pa) : undefined,
        });
      }
    }
  }

  _removeObstacle(ob) {
    this.obstacles.splice(this.obstacles.indexOf(ob), 1);
    if (typeof this.gridManager.removeObstacle === 'function') this.gridManager.removeObstacle(ob.x, ob.z);
    else {
      const t = this.gridManager.getTile(ob.x, ob.z);
      if (t) { t.obstacle = null; t.walkable = true; }
    }
    this.events?.emit('field:obstacleExpired', { ...ob, pos: this.gridManager.gridToWorld(ob.x, ob.z) });
  }
}
