// GolemRules.js — Reglas de los gólems de arcilla espiritual del Sapidae, sin gráficos (Hito 95; separado en la
// Arena PvP, fase P0). Lore, cifras y reglas comunes: ver la cabecera de GolemSystem.js.
//
// GolemSystem (con modelo, en el juego) hereda de aquí y solo cambia cómo se crea la unidad del gólem (GolemUnit con
// su GLB) y la descarga previa de los modelos. El motor sin gráficos usa esta clase tal cual (LogicGolem).

import { LogicGolem } from '../LogicUnit.js';
import * as i18n from '../../i18n/i18n.js';

/** Clase de Sapidae → tipo de gólem. */
export const GOLEM_KIND_BY_CLASS = { crafter: 'sentinel', shepard: 'hat', lunalogist: 'bell', stargazer: 'shell' };

/** Reglas de cada gólem (todas las cifras de equilibrio están aquí). */
export const GOLEM_DEFS = {
  sentinel: { hpPct: 0.7, tauntAdjacent: true, guardPct: 25, breakShield: 30 },
  hat: { hpPct: 0.45, relayRadius: 2, pulseHaste: 1, breakEnergize: 1 },
  bell: { hpPct: 0.45, pulseRadius: 2, pulseHeal: 20, pulseCleanse: 1, pulseFragile: 25, breakHeal: 40, breakRadius: 2 },
  shell: { hpPct: 0.5, groundRadius: 1, groundPM: 1, groundCleanse: ['burn', 'poison'], breakZoneRounds: 2 },
};

const manhattan = (a, b) => Math.abs(a.gridX - b.gridX) + Math.abs(a.gridZ - b.gridZ);

// ------------------------------------------------------------------ reglas

export class GolemRules {
  constructor(spellManager) {
    this.sm = spellManager;
    this.golems = [];
  }

  get grid() { return this.sm.gridManager; }
  get events() { return this.sm.events; }
  get units() { return this.sm.game?.units || this.sm.turnManager?.units || []; }

  reset() {
    this.golems = [];
    this._seq = 0; // ids de gólem estables (mismo combate → mismos ids: repeticiones y árbitro)
  }

  /** Crea la unidad del gólem. Sin gráficos: LogicGolem. GolemSystem (con modelo) la sustituye por GolemUnit. */
  async _createGolem(config) {
    return new LogicGolem(config, this.grid);
  }

  def(golem) { return GOLEM_DEFS[golem?.golemKind] || null; }
  alive() { return this.golems.filter((g) => !g.isDead); }
  /** Gólem vivo del lanzador (o null). */
  golemOf(owner) { return this.golems.find((g) => g.owner === owner && !g.isDead) || null; }

  /** Tipo de gólem de una unidad (por la clase del Sapidae). */
  kindFor(caster) {
    const cls = caster?.config?.sapidaeClass;
    return GOLEM_KIND_BY_CLASS[cls] || 'sentinel';
  }

  // ---------------------------------------------- invocar, mover, traer

  async summon(owner, cell, kind = null) {
    kind = kind || this.kindFor(owner);
    const tile = this.grid.getTile(cell.x, cell.z);
    if (!tile || tile.unit || tile.obstacle || tile.walkable === false) return null;
    // Un gólem por Sapidae: el anterior vuelve a la tierra sin su efecto final
    const prev = this.golemOf(owner);
    if (prev) this.retire(prev);

    const def = GOLEM_DEFS[kind];
    const maxHP = Math.max(30, Math.round((owner.maxHP || 200) * def.hpPct));
    this._seq = (this._seq || 0) + 1;
    const golem = await this._createGolem({
      id: `golem_${kind}_${owner.id}_${this._seq}`,
      name: i18n.t(`golems.${kind}.name`),
      type: `golem_${kind}`,
      golemKind: kind,
      owner,
      team: owner.team,
      pvpSide: owner.pvpSide ?? null,
      x: cell.x,
      z: cell.z,
      maxHP,
      scale: 1,
    });
    golem.onDeath = () => this._onBreak(golem);
    this.golems.push(golem);
    const list = this.units;
    if (!list.includes(golem)) list.push(golem);
    this.sm.audio?.playImpact?.();
    golem.flashPulse(1);
    this.events.emit('golem:summoned', { golem, owner, kind, pos: this.grid.gridToWorld(cell.x, cell.z) });
    return golem;
  }

  /** Devuelve el gólem a la tierra sin su efecto final (al invocar otro). */
  retire(golem) {
    if (!golem || golem.isDead) return;
    golem.onDeath = null;
    golem.currentHP = 0;
    golem.die();
    this.events.emit('golem:retired', { golem });
  }

  /** Marcha del Caparazón: el gólem salta a la casilla y deja tierra estable por donde pasa. */
  async move(owner, cell, { trailRounds = 0 } = {}) {
    const golem = this.golemOf(owner);
    if (!golem) return false;
    const from = { x: golem.gridX, z: golem.gridZ };
    const ok = await this.sm._teleport(golem, cell, null, { hop: true });
    if (!ok) return false;
    if (trailRounds > 0) {
      const cells = [];
      const push = (x, z) => { if (!cells.some((c) => c.x === x && c.z === z)) cells.push({ x, z }); };
      // Camino en L: primero en X, luego en Z
      let x = from.x, z = from.z;
      push(x, z);
      while (x !== cell.x) { x += Math.sign(cell.x - x); push(x, z); }
      while (z !== cell.z) { z += Math.sign(cell.z - z); push(x, z); }
      this.sm.field.placeZone({ cells, rounds: trailRounds, owner, kind: 'stable_ground', ally: { stable: true }, enemy: {} });
    }
    golem.flashPulse(1);
    return true;
  }

  /** Llevar al Herido: trae al aliado a una casilla libre junto al gólem (o junto al Sapidae si no hay gólem). */
  async fetch(owner, ally) {
    if (!ally || ally.isDead || ally === owner || ally.isGolem) return false;
    const anchor = this.golemOf(owner) || owner;
    if (manhattan(ally, anchor) === 1) return false; // ya está al lado
    const free = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dz]) => ({ x: anchor.gridX + dx, z: anchor.gridZ + dz }))
      .filter((c) => {
        const t = this.grid.getTile(c.x, c.z);
        return t && !t.unit && !t.obstacle && t.walkable !== false;
      })
      .sort((a, b) => (Math.abs(a.x - ally.gridX) + Math.abs(a.z - ally.gridZ)) - (Math.abs(b.x - ally.gridX) + Math.abs(b.z - ally.gridZ)));
    if (!free.length) return false;
    return this.sm._teleport(ally, free[0], null, { hop: true });
  }

  // ---------------------------------------------- reglas pasivas

  /** Centinela: ¿obliga a `attacker` a atacarle? (está a su lado) */
  tauntsAgainst(unit, attacker) {
    if (!unit?.isGolem || unit.isDead || !attacker || unit.team === attacker.team) return false;
    return Boolean(this.def(unit)?.tauntAdjacent) && manhattan(unit, attacker) <= 1;
  }

  /** Centinela: % de daño recibido (negativo) para un aliado a su lado. */
  damageTakenPct(target) {
    if (!target || target.isGolem || target.isDead) return 0;
    let best = 0;
    for (const g of this.golems) {
      if (g.isDead || g.team !== target.team) continue;
      const d = this.def(g);
      if (d?.guardPct && manhattan(g, target) <= 1) best = Math.max(best, d.guardPct);
    }
    return -best;
  }

  /** Sombrero: casillas extra a las que llegan las órdenes con `spell.relay`. */
  relayCells(caster) {
    const g = this.golemOf(caster);
    const r = g && this.def(g)?.relayRadius;
    if (!r) return [];
    const out = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r) continue;
        const x = g.gridX + dx, z = g.gridZ + dz;
        if (this.grid.isValidCoord(x, z)) out.push({ x, z });
      }
    }
    return out;
  }

  /** Tierra estable (Caparazón y su rastro): +1 PM, Arraigado y sin quemadura ni veneno. Una vez por turno. */
  applyStableGround(unit, source = null) {
    if (!unit || unit.isDead || unit.isGolem) return;
    const stamp = `${this.sm.field?.round || 0}:${this.sm.turnManager?.currentIndex ?? 0}`;
    if (unit._stableStamp === stamp) return;
    unit._stableStamp = stamp;
    const d = GOLEM_DEFS.shell;
    unit.currentPM = Math.max(0, unit.currentPM + d.groundPM);
    this.sm.statuses.clear(unit, 'debuff', Infinity, d.groundCleanse);
    // Duración 2: cubre su turno y los turnos enemigos hasta el siguiente
    this.sm.statuses.apply(unit, 'unmovable', { duration: 2, source });
    unit.updateHUD?.();
    this.events.emit('unit:resourceGained', { unit, source, spell: null, pm: d.groundPM });
    this.events.emit('golem:stableGround', { unit, source });
  }

  // ---------------------------------------------- ciclo de turnos

  /** Al empezar el turno de cualquier unidad: tierra estable del Caparazón. */
  onUnitTurnStart(unit) {
    if (!unit || unit.isGolem) return;
    for (const g of this.golems) {
      const d = this.def(g);
      if (g.isDead || !d?.groundRadius || g.team !== unit.team) continue;
      if (manhattan(g, unit) <= d.groundRadius) { this.applyStableGround(unit, g); break; }
    }
  }

  /** Al terminar el turno del dueño: caducan estados y escudo del gólem, y el gólem hace su pulso. */
  onOwnerTurnEnd(owner) {
    for (const g of this.golems) {
      if (g.isDead || g.owner !== owner) continue;
      this._tick(g);
      if (!g.isDead) this._pulse(g);
    }
  }

  _tick(g) {
    const st = this.sm.statuses;
    // Regeneración (los gólems no tienen turno: se cura aquí)
    const regen = st.get(g, 'regen');
    if (regen && regen.value > 0 && !(regen.delay > 0)) {
      const healed = g.heal(Math.round(regen.value));
      this.events.emit('status:tick', { unit: g, status: 'regen', heal: healed, damage: 0 });
    }
    st.onTurnEnd(g);
    if (g.shieldExpiresRound != null && (this.sm.field?.round || 1) >= g.shieldExpiresRound) {
      g.shield = 0;
      g.shieldExpiresRound = null;
    }
    g.updateHUD();
  }

  _alliesNear(g, r, { includeGolems = false } = {}) {
    return this.units.filter((u) => !u.isDead && u.team === g.team && u !== g && (includeGolems || !u.isGolem) && manhattan(u, g) <= r);
  }

  _enemiesNear(g, r) {
    return this.units.filter((u) => !u.isDead && u.team !== g.team && manhattan(u, g) <= r);
  }

  _pulse(g) {
    const d = this.def(g);
    const st = this.sm.statuses;
    if (g.golemKind === 'hat') {
      const allies = this._alliesNear(g, 1);
      for (const u of allies) st.apply(u, 'hasted', { value: d.pulseHaste, duration: 1, source: g });
      if (allies.length) { g.flashPulse(1); this.sm.audio?.playBuff?.(); }
    } else if (g.golemKind === 'bell') {
      const allies = this._alliesNear(g, d.pulseRadius, { includeGolems: true });
      for (const u of allies) {
        this.sm._heal(u, d.pulseHeal, g, null);
        if (d.pulseCleanse) st.clear(u, 'debuff', d.pulseCleanse);
      }
      for (const u of this._enemiesNear(g, d.pulseRadius)) st.apply(u, 'fragile', { value: d.pulseFragile, duration: 1, source: g });
      g.flashPulse(d.pulseRadius);
      this.sm.audio?.playHeal?.();
    }
    if (g.golemKind !== 'sentinel' && g.golemKind !== 'shell') this.events.emit('golem:pulse', { golem: g, kind: g.golemKind });
  }

  /** Al romperse (muere por daño): efecto final de cada gólem. */
  _onBreak(g) {
    const d = this.def(g);
    const st = this.sm.statuses;
    if (g.golemKind === 'sentinel') {
      for (const u of this._alliesNear(g, 1)) {
        this.sm._grantShield(u, d.breakShield);
        u.updateHUD?.();
        this.events.emit('unit:shielded', { unit: u, source: g, spell: null, amount: d.breakShield });
      }
    } else if (g.golemKind === 'hat') {
      for (const u of this._alliesNear(g, 1)) st.apply(u, 'energized', { value: d.breakEnergize, duration: 1, source: g });
    } else if (g.golemKind === 'bell') {
      for (const u of this._alliesNear(g, d.breakRadius)) this.sm._heal(u, d.breakHeal, g, null);
    } else if (g.golemKind === 'shell') {
      const cells = [];
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push({ x: g.gridX + dx, z: g.gridZ + dz });
      this.sm.field.placeZone({ cells, rounds: d.breakZoneRounds, owner: g.owner || g, kind: 'stable_ground', ally: { stable: true }, enemy: {} });
    }
    this.events.emit('golem:broken', { golem: g, kind: g.golemKind, pos: this.grid.gridToWorld(g.gridX, g.gridZ) });
  }
}
