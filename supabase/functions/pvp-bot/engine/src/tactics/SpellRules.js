// SpellRules.js — Reglas de las habilidades sin gráficos (antes SpellManager en Spells.js; separado en la Arena PvP,
// fase P0). Coste, alcance, objetivos, áreas, daño, curas, estados, empujes, saltos, gólems, zonas, turnos.
//
// SpellManager (Spells.js, en el juego) hereda de aquí y añade los VFX y la presentación, que escuchan el bus de
// eventos. El motor sin gráficos (sim/HeadlessCombat.js) usa esta clase tal cual. Cualquier cambio de reglas va aquí.
// Reglas de oro: el azar solo por `this.rng`; nada de tiempo real (Date.now, setTimeout) que cambie el resultado.

import { unitUnlockLevel, isLockedFor } from './combat/SkillUnlocks.js'; // Hito 98
import { CombatEvents } from './combat/CombatEvents.js';
import { registerTutorialHooks } from './combat/TutorialCombatHooks.js';
import { StatusSystem } from './combat/StatusSystem.js';
import { BattlefieldObjects } from './combat/BattlefieldObjects.js';
import { EffectResolver } from './combat/EffectResolver.js';
import { elementalMultiplier } from './combat/Elements.js';
import { UltimateSystem } from './combat/UltimateSystem.js';
import { RuneCharmSystem } from './combat/RuneCharmEffects.js';
import { GolemRules } from './combat/GolemRules.js';
import { SPELLS_DB } from './data/SpellsDB.js';
import * as i18n from '../i18n/i18n.js';

export class SpellRules {
  /**
   * @param {object} gridManager  tablero (GridManager con gráficos o GridRules sin ellos)
   * @param {object} [opts]
   *   sceneManager, audio, combatText, game · como siempre (game.units: unidades del combate)
   *   installPresentation(sm)  crea los VFX y la presentación (Spells.js). Se llama justo después de crear el bus de
   *                            eventos, en el mismo punto que antes: el orden de los oyentes no cambia.
   *   golems(sm)               sistema de gólems (por defecto GolemRules, sin modelo)
   *   headless                 motor sin gráficos: sin esperas de presentación (HeadlessCombat)
   */
  constructor(gridManager, { sceneManager = null, audio = null, combatText = null, game = null, installPresentation = null, golems = null, headless = false } = {}) {
    this.gridManager = gridManager;
    this.sceneManager = sceneManager;
    this.audio = audio;
    this.combatText = combatText;
    this.headless = Boolean(headless);
    // Koliseo B3: modificadores del combate para todas las unidades (main los fija antes de cada combate).
    //   range: suma al alcance máximo de las cartas a distancia (Niebla espesa: −1, mínimo 1)
    //   firstRoundPM: suma a los PM de cada unidad en la ronda 1 (Viento helado: −1)
    this.battleMods = { range: 0, firstRoundPM: 0 };
    this.game = game;
    this.vfx = null;
    this.presentation = null;

    // Bus de eventos: la lógica anuncia, la presentación (VFX, sonido, textos) escucha.
    this.events = new CombatEvents();
    installPresentation?.(this);

    // Azar de las reglas (daño, curas, críticos). Separado del azar de los VFX para que los
    // efectos visuales nunca cambien el resultado de un combate; se puede sembrar (Arena PvP: semilla de la partida).
    this.rng = () => Math.random();

    // Ganchos de reglas (tutorial, y más adelante runas/charms)
    this.hooks = { critAllowed: [], adjustDamage: [] };
    registerTutorialHooks(this);

    // Fase 1: estados alterados, objetos temporales del tablero y efectos descritos como datos
    this.statuses = new StatusSystem({ events: this.events, gridManager: this.gridManager });
    this.field = new BattlefieldObjects({ gridManager: this.gridManager, events: this.events });
    this.effects = new EffectResolver(this);
    // Fase 3: Duo Ultimates (vínculo al 100 %, 6 PA, ronda ≥ 2, un uso)
    this.ultimates = new UltimateSystem(this);
    // Runas y charms de los Axies del jugador (RuneCharmEffects.js): estadísticas, cartas modificadas y ganchos de reglas
    this.runeCharms = new RuneCharmSystem(this);
    // Hito 95: gólems de arcilla espiritual del Sapidae (sin turno propio; pulso al final del turno de su dueño)
    this.golems = golems ? golems(this) : new GolemRules(this);
    this.field.onStableGround = (unit, owner) => this.golems.applyStableGround(unit, owner);
    // Triángulo elemental (±15 %). Se puede apagar para pruebas: sm.elementalEnabled = false
    this.elementalEnabled = true;
  }

  /** Conecta el ciclo de turnos con estados y objetos temporales. */
  bindTurnManager(tm) {
    this.turnManager = tm;
    tm.onCombatStart = () => {
      this.field.reset();
      this.golems.reset();
      this.presentation?.clearZoneDecals?.(); // Hito 95: marcas de zona del combate anterior
      this.ultimates.used = false;
      for (const u of tm.units || []) { u.statuses = []; this.resetCooldowns(u); }
      this.runeCharms.onCombatStart(tm.units || []);
    };
    tm.onRoundStart = (round) => {
      this.field.onRoundStart(round);
      this.runeCharms.onRoundStart(round);
    };
    tm.onUnitTurnStart = (unit) => {
      unit._castsThisTurn = {}; // Fase 5: usos por turno (castsPerTurn)
      unit._castsOnTarget = {}; // Hito 97: usos por objetivo y turno (castsPerTarget)
      unit._turnNo = (unit._turnNo || 0) + 1; // Hito 97: turnos propios (recargas)
      this._announceReady(unit);
      this.syncOccupancy(); // Fase 5: cada casilla apunta a la unidad viva que está de verdad en ella
      this.field.onTurnStart(unit);
      this.golems.onUnitTurnStart(unit); // Hito 95: tierra estable del Gólem Caparazón
      this.runeCharms.turnStartPre(unit);
      const result = this.statuses.onTurnStart(unit);
      this.runeCharms.turnStartPost(unit, result);
      this._applyBattleModsTurnStart(unit, result);
      return result;
    };
    tm.onUnitTurnEnd = (unit) => {
      this.field.onTurnEnd(unit); // Rastro de Miasma: terminar el turno en una casilla infectada quita vida
      if (unit.config?.mechanic === 'miasma' && !unit.isDead) this._placeMiasma(unit);
      this.runeCharms.turnEnd(unit); // antes de que caduquen estados y escudos
      this.statuses.onTurnEnd(unit);
      // Escudos de habilidades: caducan al final del turno del receptor en la ronda siguiente a recibirlos
      if (unit.shieldExpiresRound != null && this.field.round >= unit.shieldExpiresRound) {
        unit.shield = 0;
        unit.shieldExpiresRound = null;
        unit.updateHUD?.();
      }
      this.golems.onOwnerTurnEnd(unit); // Hito 95: pulso de su gólem
    };
  }

  /**
   * Rastro de Miasma (Slime Knight del tutorial): al final de su turno marca en morado las casillas donde están el
   * Sapidae y los Axies rivales durante 3 rondas. Quien termine su turno dentro pierde el 50 % de su vida máxima
   * (BattlefieldObjects.onTurnEnd). Una casilla ya infectada no se vuelve a marcar.
   */
  /**
   * Al volver al mundo abierto: suelta lo que el combate dejó vivo (marcas de zona como el Rastro de Miasma y su
   * bucle de animación, zonas con referencias a unidades ya liberadas y los modificadores del Koliseo).
   */
  releaseBattle() {
    this.field?.reset?.();
    this.presentation?.clearZoneDecals?.();
    this.battleMods = { range: 0, firstRoundPM: 0 };
  }

  /** Koliseo B3 · Viento helado: −PM en la ronda 1 (tras estados y runas, para que no lo deshagan). */
  _applyBattleModsTurnStart(unit, result) {
    const pm = this.battleMods?.firstRoundPM || 0;
    if (!pm || result?.skip || unit.isDead || (this.turnManager?.round || 1) !== 1) return;
    const before = unit.currentPM;
    unit.currentPM = Math.max(0, unit.currentPM + pm);
    if (unit.currentPM !== before) {
      unit.updateHUD?.();
      const pos = this.gridManager?.gridToWorld?.(unit.gridX, unit.gridZ);
      if (pos) this.combatText?.pop?.({ pos, kind: 'pm', key: unit, text: i18n.t('koliseo.mod.icyWindPop', { n: unit.currentPM - before }) });
    }
  }

  _placeMiasma(owner) {
    const foes = (this.turnManager?.units || []).filter((u) => u.team !== owner.team && !u.isDead && !u.isGolem);
    const cells = foes.map((u) => ({ x: u.gridX, z: u.gridZ }))
      .filter((c) => !this.field.zonesAt(c.x, c.z).some((zn) => zn.kind === 'miasma'));
    if (!cells.length) return;
    this.field.placeZone({ cells, rounds: 3, owner, kind: 'miasma', enemy: { endTurnHpPct: 0.5 } });
  }

  _shieldExpiry() { return (this.field?.round || 1) + 1; }

  /**
   * Da escudo a una unidad. El escudo dura hasta el final del turno del receptor en la ronda
   * siguiente: así un escudo propio protege durante los turnos enemigos y uno dado a un aliado
   * no se pierde antes de que le ataquen.
   */
  _grantShield(unit, amount) {
    unit.shield = (unit.shield || 0) + amount;
    unit.shieldExpiresRound = this._shieldExpiry();
    return amount;
  }

  /** Unidad activa del turno (null fuera de combate o en pruebas sin TurnManager). */
  _activeUnit() {
    return this.turnManager?.getActiveUnit?.() || null;
  }

  /**
   * Hito 95 · casilla desde la que se mide el alcance: la del lanzador o, con spell.rangeFrom === 'golem', la de su
   * gólem (Marcha del Caparazón). Sin gólem en pie, la carta no tiene casillas.
   */
  _castOrigin(caster, spell) {
    if (spell?.rangeFrom === 'golem') {
      const g = this.golems.golemOf(caster);
      return g ? { x: g.gridX, z: g.gridZ } : null;
    }
    return { x: caster.gridX, z: caster.gridZ };
  }

  /**
   * Hito 95 · ¿sirve esta unidad como objetivo aliado de la carta?
   *   allyFilter: 'companion' (Axie: ni Sapidae ni gólem ni el lanzador) · 'living' (cualquier aliado salvo gólems) ·
   *               'otherLiving' (como 'living', sin el lanzador) ·
   *               'golem' (solo el gólem del lanzador) · 'notSelf' (cualquier aliado salvo el lanzador) · sin filtro: cualquiera.
   */
  _allyMatches(caster, spell, u) {
    if (!u || u.isDead || u.team !== caster.team) return false;
    switch (spell.allyFilter) {
      case 'companion': return u !== caster && u.type !== 'sapidae' && !u.isGolem;
      case 'living': return !u.isGolem;
      case 'otherLiving': return u !== caster && !u.isGolem;
      case 'golem': return Boolean(u.isGolem) && u.owner === caster;
      case 'notSelf': return u !== caster;
      default: return true;
    }
  }

  /** Provocación: estado Provocación o Centinela de Vasija al lado del atacante (Hito 95). */
  isTauntingFor(unit, attacker) {
    if (!unit || unit.isDead) return false;
    if (unit.statuses?.length && this.statuses.has(unit, 'taunt')) return true;
    return this.golems.tauntsAgainst(unit, attacker);
  }

  /** ¿El hechizo hace daño? (campos antiguos o lista de efectos) */
  isDamageSpell(spell) {
    if (!spell) return false;
    if (spell.baseMinDamage) return true;
    return Array.isArray(spell.effects) && spell.effects.some((e) => e.type === 'damage');
  }

  /** Alcance máximo efectivo: los estados de alcance solo afectan a hechizos de alcance > 1. */
  getEffectiveMaxRange(caster, spell) {
    const base = spell.maxRange;
    if (base <= 1 || spell.fixedRange) return base;
    const mod = (caster.statuses?.length ? this.statuses.mod(caster, 'range') : 0) + (this.battleMods?.range || 0);
    return Math.max(spell.minRange, 1, base + mod);
  }

  /** Alias usado por Unit.dieCinematic para el remate cinemático del último enemigo. */
  get vfxManager() { return this.vfx; }

  /**
   * Hechizo por id. Con `unit`, devuelve la carta tal como la lanza esa unidad: si un charm la modifica
   * (daño, alcance, coste…), su copia (mismo id). Sin unidad, la carta base del catálogo.
   */
  getSpell(spellId, unit = null) {
    if (!spellId) return null;
    const base = SPELLS_DB[spellId] || SPELLS_DB.chimera_bite || null;
    return unit ? this.runeCharms.spellFor(unit, base) : base;
  }

  /** Coste en PA que pagará la unidad por la carta (descuentos de charms y runas incluidos). */
  getSpellCost(caster, spell) {
    if (!spell) return 0;
    return this.runeCharms.costOf(caster, this.runeCharms.spellFor(caster, spell));
  }

  /**
   * Hito 65 · alcance para DIBUJAR (estilo Dofus): todas las casillas a tiro, haya o no unidades.
   *   range   → a tiro (distancia, línea recta si la pide, casilla usable y con línea de visión)
   *   blocked → dentro de la distancia pero sin línea de visión (tapadas por un obstáculo)
   * No decide nada: dónde se puede lanzar lo sigue diciendo getValidTargetCells (mismas reglas + unidad).
   */
  getRangeCells(caster, spell) {
    const out = { range: [], blocked: [] };
    if (!caster || !spell) return out;
    if (spell.isUltimate && !this.ultimates.canCast(caster)) return out;
    if (this.isDamageSpell(spell) && caster.statuses?.length && this.statuses.isFeared(caster)) return out;
    if (this.castBlockReason(caster, spell)) return out; // usos del turno agotados o en recarga (Hito 97)
    const origin = this._castOrigin(caster, spell);
    if (!origin) return out;
    const fromX = origin.x, fromZ = origin.z;
    if (spell.targetType === 'self') { out.range.push({ x: fromX, z: fromZ }); return out; }
    const maxRange = (caster.statuses?.length || this.battleMods?.range) ? this.getEffectiveMaxRange(caster, spell) : spell.maxRange;
    for (let x = 0; x < this.gridManager.width; x++) {
      for (let z = 0; z < this.gridManager.height; z++) {
        const dist = Math.abs(x - fromX) + Math.abs(z - fromZ);
        if (dist < spell.minRange || dist > maxRange) continue;
        if (spell.isLinear && (x !== fromX && z !== fromZ)) continue;
        const tile = this.gridManager.getTile(x, z);
        if (!tile || tile.obstacle || tile.baseWalkable === false) continue;
        if (spell.requiresLoS && !this.gridManager.hasLineOfSight({ x: fromX, z: fromZ }, { x, z })) out.blocked.push({ x, z });
        else out.range.push({ x, z });
      }
    }
    // Hito 95 · Gólem Sombrero: las órdenes llegan también a las casillas cercanas al gólem
    if (spell.relay) {
      for (const c of this.golems.relayCells(caster)) {
        const tile = this.gridManager.getTile(c.x, c.z);
        if (!tile || tile.obstacle || tile.baseWalkable === false) continue;
        out.blocked = out.blocked.filter((b) => b.x !== c.x || b.z !== c.z);
        if (!out.range.some((r) => r.x === c.x && r.z === c.z)) out.range.push(c);
      }
    }
    return out;
  }

  getValidTargetCells(caster, spell) {
    const validCells = [];
    const origin = this._castOrigin(caster, spell);
    if (!origin) return validCells; // Hito 95: carta que se lanza desde el gólem y no hay gólem
    const fromX = origin.x;
    const fromZ = origin.z;
    const isDamage = this.isDamageSpell(spell);

    // Ultimate: solo si se cumplen todas sus condiciones
    if (spell.isUltimate && !this.ultimates.canCast(caster)) return validCells;

    // Miedo: no puede usar hechizos de daño
    if (isDamage && caster.statuses?.length && this.statuses.isFeared(caster)) return validCells;
    // Usos por turno agotados o en recarga (Hito 97)
    if (this.castBlockReason(caster, spell)) return validCells;
    const maxRange = (caster.statuses?.length || this.battleMods?.range) ? this.getEffectiveMaxRange(caster, spell) : spell.maxRange;

    for (let x = 0; x < this.gridManager.width; x++) {
      for (let z = 0; z < this.gridManager.height; z++) {
        const dist = Math.abs(x - fromX) + Math.abs(z - fromZ);
        if (dist < spell.minRange || dist > maxRange) continue;

        if (spell.isLinear && (x !== fromX && z !== fromZ)) continue;

        if (spell.requiresLoS && !this.gridManager.hasLineOfSight({ x: fromX, z: fromZ }, { x, z })) {
          continue;
        }

        const tile = this.gridManager.getTile(x, z);
        // Casillas inutilizables: fuera del tablero, con obstáculo (roca, árbol, barricada…) o con agua.
        // Ninguna habilidad se puede lanzar sobre ellas (sí se puede ver y disparar por encima del agua).
        if (!tile || tile.obstacle || tile.baseWalkable === false) continue;

        if (spell.targetType === 'empty') {
          if (!tile || !tile.walkable || tile.obstacle || tile.unit) continue;
        } else if (spell.targetType === 'self') {
          if (x !== fromX || z !== fromZ) continue;
        } else if (spell.targetType === 'enemy') {
          // Fuego amigo (18-oct): un ataque se puede lanzar sobre cualquier unidad (también un aliado), salvo uno mismo
          if (!tile || !tile.unit || tile.unit === caster) continue;
        } else if (spell.targetType === 'ally') {
          // Hito 95: filtros de aliado ('companion', 'living', 'golem', 'notSelf'), ver _allyMatches
          if (!tile || !this._allyMatches(caster, spell, tile.unit)) continue;
        }
        // Hito 97: usos por objetivo y turno agotados sobre esa unidad
        if (spell.castsPerTarget && tile?.unit && this.targetLimitReached(caster, spell, tile.unit)) continue;

        validCells.push({ x, z });
      }
    }

    // Hito 95 · Gólem Sombrero: las órdenes (spell.relay) llegan a los aliados cercanos al gólem, estén donde estén
    if (spell.relay && spell.targetType === 'ally') {
      for (const c of this.golems.relayCells(caster)) {
        const u = this.gridManager.getTile(c.x, c.z)?.unit;
        if (!this._allyMatches(caster, spell, u)) continue;
        if (spell.castsPerTarget && this.targetLimitReached(caster, spell, u)) continue;
        if (!validCells.some((v) => v.x === c.x && v.z === c.z)) validCells.push(c);
      }
    }

    // Provocación: si un enemigo provocador está al alcance, los hechizos de daño solo pueden apuntarle a él
    // (Hito 95: también el Centinela de Vasija para los enemigos que tiene al lado)
    if (isDamage && spell.targetType === 'enemy') {
      const taunting = validCells.filter((c) => {
        const u = this.gridManager.getTile(c.x, c.z)?.unit;
        return u && u.team !== caster.team && this.isTauntingFor(u, caster);
      });
      if (taunting.length) return taunting;
    }
    return validCells;
  }

  /**
   * Casillas afectadas. Áreas: single · cross1 · cross2 · circle1/2/3 (rombo de radio N) ·
   * box2x2 (objetivo + derecha/abajo) · box3x3 · line2/line3 (desde el lanzador en la dirección del objetivo) · allEnemies · allAllies
   */
  getAoECells(targetCell, spell, caster = null) {
    const cells = [{ x: targetCell.x, z: targetCell.z }];
    const area = spell.areaType || 'single';
    const push = (x, z) => {
      if (this.gridManager.isValidCoord(x, z) && !cells.some((c) => c.x === x && c.z === z)) cells.push({ x, z });
    };

    if (area === 'cross1' || area === 'cross2') {
      const r = area === 'cross1' ? 1 : 2;
      for (let d = 1; d <= r; d++) {
        push(targetCell.x + d, targetCell.z);
        push(targetCell.x - d, targetCell.z);
        push(targetCell.x, targetCell.z + d);
        push(targetCell.x, targetCell.z - d);
      }
    } else if (/^circle[123]$/.test(area)) {
      const r = Number(area.slice(6));
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) <= r) push(targetCell.x + dx, targetCell.z + dz);
        }
      }
    } else if (area === 'box2x2') {
      push(targetCell.x + 1, targetCell.z);
      push(targetCell.x, targetCell.z + 1);
      push(targetCell.x + 1, targetCell.z + 1);
    } else if (area === 'box3x3') {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) push(targetCell.x + dx, targetCell.z + dz);
    } else if ((area === 'line2' || area === 'line3') && caster) {
      const n = Number(area.slice(4));
      const dx = Math.sign(targetCell.x - caster.gridX);
      const dz = Math.sign(targetCell.z - caster.gridZ);
      if (dx === 0 || dz === 0) {
        for (let i = 1; i < n; i++) push(targetCell.x + dx * i, targetCell.z + dz * i);
      }
    } else if ((area === 'allEnemies' || area === 'allAllies') && caster) {
      const wantEnemy = area === 'allEnemies';
      for (const u of this.game?.units || []) {
        if (u.isDead) continue;
        if ((u.team !== caster.team) === wantEnemy) push(u.gridX, u.gridZ);
      }
    }
    return cells;
  }

  // ------------------------------------------------------------------ pipeline

  /**
   * Lanza un hechizo: validar → pagar coste → resolver objetivos → aplicar efectos.
   * Cada paso anuncia un evento en this.events; los efectos visuales viven en SpellPresentation.
   * Devuelve false si no se pudo lanzar (sin PA suficientes).
   */
  async castSpell(caster, spell, targetCell) {
    spell = this.runeCharms.spellFor(caster, spell); // carta con los charms de la unidad (si los tiene)
    if (spell.isUltimate && !this.ultimates.canCast(caster)) return false;
    if (!this._canPay(caster, spell)) return false;
    if (spell.castsPerTarget && this.targetLimitReached(caster, spell, this.gridManager.getTile(targetCell.x, targetCell.z)?.unit)) return false;
    const spent = this._payCost(caster, spell);
    this._recordCast(caster, spell, targetCell); // Hito 97: recarga y usos por objetivo

    const ctx = {
      caster,
      spell,
      spent,
      targetCell,
      casterPos: this.gridManager.gridToWorld(caster.gridX, caster.gridZ),
      targetPos: this.gridManager.gridToWorld(targetCell.x, targetCell.z),
    };
    this.runeCharms.onCast(ctx);
    this.events.emit('spell:cast', ctx);

    // Mecánicas especiales de las clases de Sapidae
    if (spell.isBarricade) {
      this._resolveBarricade(ctx);
      return true;
    }
    if (spell.isTranspose && this._resolveTranspose(ctx)) {
      return true;
    }
    if (spell.isPackHowl) {
      this._resolvePackHowl(ctx);
      return true;
    }
    if (spell.targetType === 'empty' && !Array.isArray(spell.effects)) {
      await this._executeJump(caster, spell, targetCell);
      return true;
    }

    // Hechizo normal: animación, proyectil (si es a distancia) e impacto
    this.events.emit('spell:windup', ctx);
    if (ctx.vfx && ctx.vfx.untilImpact) {
      // Fase 6: la carta tiene efecto del motor de VFX; el daño se aplica en su fotograma de impacto
      await ctx.vfx.untilImpact;
    } else if (this._isRangedCast(ctx)) {
      const travel = this.events.emitAsync('spell:projectile', ctx);
      if (travel) await travel;
    }
    ctx.affectedCells = this.getAoECells(targetCell, spell, caster);
    this.events.emit('spell:impact', ctx);

    // Habilidades nuevas: lista de efectos
    if (Array.isArray(spell.effects)) {
      await this.effects.run(ctx);
      this.runeCharms.onResolved(ctx);
      this.events.emit('spell:resolved', ctx);
      return true;
    }

    for (const cell of ctx.affectedCells) {
      const tile = this.gridManager.getTile(cell.x, cell.z);
      if (!tile) continue;
      await this._applyEffects(ctx, tile.unit);
    }

    this.runeCharms.onResolved(ctx);
    this.events.emit('spell:resolved', ctx);
    return true;
  }

  /**
   * Fase 5: reconstruye tile.unit a partir de las posiciones reales de las unidades vivas.
   * Evita que una referencia perdida deje «libre» la casilla de alguien (y que otra unidad termine encima).
   */
  syncOccupancy() {
    const grid = this.gridManager;
    const units = this.game?.units || this.turnManager?.units || [];
    if (!grid || !units.length) return 0;
    let fixed = 0;
    for (let x = 0; x < grid.width; x++) {
      for (let z = 0; z < grid.height; z++) {
        const t = grid.getTile(x, z);
        const u = t?.unit;
        if (u && (u.isDead || u.gridX !== x || u.gridZ !== z)) { t.unit = null; fixed++; }
      }
    }
    for (const u of units) {
      if (u.isDead) continue;
      const t = grid.getTile(u.gridX, u.gridZ);
      if (t && t.unit !== u) { if (!t.unit) fixed++; t.unit = t.unit || u; }
    }
    return fixed;
  }

  /** Fase 5: ¿ha agotado esta carta sus usos del turno? (castsPerTurn; las que dan PA/PM, 1 por turno) */
  castLimitReached(caster, spell) {
    return Boolean(spell?.castsPerTurn) && ((caster?._castsThisTurn?.[spell.id]) || 0) >= spell.castsPerTurn;
  }

  // ------------------------------------------------------------------ Hito 97 · recarga y usos por objetivo
  //
  // · spell.cooldown = N: tras usarla, no se puede en los N turnos siguientes de quien la lanzó (vuelve en el N+1).
  //   Se cuentan los turnos propios (unit._turnNo), también los perdidos por aturdir o dormir, como los estados.
  // · spell.initialCooldown = N: al empezar el combate no se puede hasta el turno N+1 de la unidad.
  // · spell.castsPerTarget = N: usos por turno sobre una misma unidad (el objetivo principal de la carta).
  // · Las recargas duran solo el combate. Runas y charms pueden cambiarla con runeCharms.cooldownOf (si existe).

  /** Recarga de la carta para esta unidad (turnos), con runas y charms. */
  cooldownOf(caster, spell) {
    const base = Math.max(0, Number(spell?.cooldown) || 0);
    const mod = this.runeCharms?.cooldownOf?.(caster, spell, base);
    return Math.max(0, Number.isFinite(mod) ? mod : base);
  }

  /** Turno propio (unit._turnNo) en el que la carta vuelve a estar lista. */
  _readyTurn(caster, spell) {
    const r = caster?._spellReady?.[spell.id];
    if (r != null) return r;
    const init = Math.max(0, Number(spell?.initialCooldown) || 0);
    return init ? init + 1 : 0;
  }

  /** Turnos que faltan para poder usarla (0 = lista). Durante su turno: con recarga 2, «2» justo tras usarla. */
  cooldownLeft(caster, spell) {
    if (!caster || !spell) return 0;
    const ready = this._readyTurn(caster, spell);
    const now = caster._turnNo || 0;
    if (ready <= now) return 0;
    const cap = Math.max(this.cooldownOf(caster, spell), Number(spell.initialCooldown) || 0, 1);
    return Math.min(cap, ready - Math.max(now, 1));
  }

  isOnCooldown(caster, spell) { return this.cooldownLeft(caster, spell) > 0; }

  /** Recargas a cero (inicio de combate, arena de pruebas). */
  resetCooldowns(unit) {
    if (!unit) return;
    unit._turnNo = 0;
    unit._spellReady = {};
    unit._castsThisTurn = {};
    unit._castsOnTarget = {};
    unit._cdAnnounced = {};
  }

  /** ¿Se agotaron los usos de la carta sobre esta unidad en este turno? */
  targetLimitReached(caster, spell, target) {
    if (!spell?.castsPerTarget || !target) return false;
    return ((caster?._castsOnTarget?.[spell.id]?.get?.(target)) || 0) >= spell.castsPerTarget;
  }

  /** Hito 98: nivel del héroe con el que se desbloquea la carta (1 si no es un héroe del jugador). */
  unlockLevel(caster, spell) { return unitUnlockLevel(caster, spell); }
  isLocked(caster, spell) { return isLockedFor(caster, spell); }

  /** Motivo por el que la carta no se puede usar ahora (sin mirar PA ni objetivo): 'locked' | 'spent' | 'cooldown' | null. */
  castBlockReason(caster, spell) {
    if (isLockedFor(caster, spell)) return 'locked'; // Hito 98: aún no desbloqueada por nivel
    if (this.castLimitReached(caster, spell)) return 'spent';
    if (this.isOnCooldown(caster, spell)) return 'cooldown';
    return null;
  }

  /** Una sola respuesta para la interfaz, la IA y el tutorial: ¿se puede lanzar ya (PA, usos, recarga, gólem…)? */
  canCastNow(caster, spell) {
    if (!caster || !spell || caster.isDead) return false;
    spell = this.runeCharms.spellFor(caster, spell);
    if (spell.isUltimate && !this.ultimates.canCast(caster)) return false;
    if (!this._canPay(caster, spell)) return false;
    if (!this._castOrigin(caster, spell)) return false;
    return true;
  }

  _recordCast(caster, spell, targetCell) {
    const cd = this.cooldownOf(caster, spell);
    if (cd > 0) {
      (caster._spellReady ||= {})[spell.id] = (caster._turnNo || 0) + cd + 1;
      if (caster._cdAnnounced) delete caster._cdAnnounced[spell.id];
      this.events.emit('spell:cooldown', { unit: caster, spell, turns: cd });
    }
    if (spell.castsPerTarget && targetCell) {
      const target = this.gridManager.getTile(targetCell.x, targetCell.z)?.unit;
      if (target) {
        const m = ((caster._castsOnTarget ||= {})[spell.id] ||= new Map());
        m.set(target, (m.get(target) || 0) + 1);
      }
    }
  }

  /** Al empezar el turno: avisa de las cartas que vuelven a estar listas (destello en la carta). */
  _announceReady(unit) {
    const ready = unit?._spellReady;
    if (!ready) return;
    for (const [id, turn] of Object.entries(ready)) {
      if (turn === unit._turnNo && !unit._cdAnnounced?.[id]) {
        (unit._cdAnnounced ||= {})[id] = true;
        this.events.emit('spell:ready', { unit, spellId: id });
      }
    }
  }

  _canPay(caster, spell) {
    if (this.castBlockReason(caster, spell)) return false;
    if (spell.paCost === 'X') return caster.currentPA >= 1; // coste X: gasta todos los PA que queden
    return caster.currentPA >= this.runeCharms.costOf(caster, spell);
  }

  /** Paga el coste y devuelve los PA gastados (para cartas de coste X). */
  _payCost(caster, spell) {
    const cost = spell.paCost === 'X' ? caster.currentPA : this.runeCharms.costOf(caster, spell);
    this.runeCharms.onPaid(caster, spell);
    caster.currentPA -= cost;
    if (spell.castsPerTurn) (caster._castsThisTurn ||= {})[spell.id] = ((caster._castsThisTurn[spell.id]) || 0) + 1;
    caster.updateHUD();
    return cost;
  }

  /** ¿El hechizo viaja como proyectil? (heurística histórica por id y alcance) */
  _isRangedCast({ caster, spell, targetCell }) {
    const dist = Math.abs(targetCell.x - caster.gridX) + Math.abs(targetCell.z - caster.gridZ);
    return dist > 1 || spell.maxRange > 1 || spell.id.includes('bow') || spell.id.includes('cupid') || spell.id.includes('owl') || spell.id.includes('spit') || spell.id.includes('explosive') || spell.id.includes('slow') || spell.id.includes('heal') || spell.id.includes('stim') || spell.id.includes('bramble') || spell.id.includes('bellow') || (spell.targetType === 'ally' && spell.maxRange > 0);
  }

  _resolveBarricade({ caster, spell, targetCell }) {
    this.gridManager.setObstacle(targetCell.x, targetCell.z, 'wood_post');
    const pos = this.gridManager.gridToWorld(targetCell.x, targetCell.z);
    this.events.emit('spell:barricade', { caster, spell, cell: targetCell, pos });
    if (spell.shieldAmount && caster) {
      this._grantShield(caster, spell.shieldAmount);
      caster.updateHUD();
      this.events.emit('unit:shielded', { unit: caster, source: caster, spell, amount: spell.shieldAmount });
    }
  }

  /** Intercambia posiciones con la unidad objetivo. Devuelve false si no hay unidad válida. */
  _resolveTranspose({ caster, spell, targetCell }) {
    const tileTarget = this.gridManager.getTile(targetCell.x, targetCell.z);
    const targetUnit = tileTarget ? tileTarget.unit : null;
    if (!targetUnit || targetUnit === caster) return false;

    const tileCaster = this.gridManager.getTile(caster.gridX, caster.gridZ);
    const origCx = caster.gridX;
    const origCz = caster.gridZ;
    const origTx = targetUnit.gridX;
    const origTz = targetUnit.gridZ;

    tileCaster.unit = targetUnit;
    tileTarget.unit = caster;

    caster.gridX = origTx;
    caster.gridZ = origTz;
    targetUnit.gridX = origCx;
    targetUnit.gridZ = origCz;

    caster.updateWorldPosition();
    targetUnit.updateWorldPosition();
    caster.updateHUD();
    targetUnit.updateHUD();

    if (spell.shieldAmount) {
      this._grantShield(caster, spell.shieldAmount);
      this._grantShield(targetUnit, spell.shieldAmount);
    }

    this.events.emit('spell:transpose', {
      caster,
      target: targetUnit,
      spell,
      casterPos: this.gridManager.gridToWorld(caster.gridX, caster.gridZ),
      targetPos: this.gridManager.gridToWorld(targetUnit.gridX, targetUnit.gridZ),
    });
    return true;
  }

  _resolvePackHowl({ caster, spell }) {
    if (this.game && this.game.units) {
      this.game.units.filter(u => u.team === caster.team && !u.isDead).forEach(ally => {
        const d = Math.abs(ally.gridX - caster.gridX) + Math.abs(ally.gridZ - caster.gridZ);
        if (d <= 2) {
          ally.currentPM = Math.min(ally.maxPM + 1, ally.currentPM + 1);
          ally.currentPA = Math.min(ally.maxPA + 1, ally.currentPA + 1);
          ally.updateHUD();
          this.events.emit('unit:resourceGained', { unit: ally, source: caster, spell, pa: 1, pm: 1 });
        }
      });
    }
    this.events.emit('spell:aura', { caster, spell, casterPos: this.gridManager.gridToWorld(caster.gridX, caster.gridZ) });
  }

  /** Aplica todos los efectos del hechizo a una unidad de una casilla afectada (mismo orden que siempre). */
  async _applyEffects(ctx, targetUnit) {
    const { caster, spell } = ctx;

    if (spell.baseMinHeal && targetUnit) {
      const mult = this._getSpellMultiplier(caster, spell);
      let healAmt = Math.floor((spell.baseMinHeal + this.rng() * (spell.baseMaxHeal - spell.baseMinHeal + 1)) * mult);
      if (caster && caster.supportPower) {
        healAmt = Math.round(healAmt * (1 + caster.supportPower / 100));
      }
      this._heal(targetUnit, healAmt, caster, spell);
    }

    if (spell.buffPA && targetUnit) {
      targetUnit.buffs.push({ type: 'bonusPA', value: spell.buffPA, duration: 1 });
      this.events.emit('unit:resourceGained', { unit: targetUnit, source: caster, spell, pa: spell.buffPA });
    }

    if (spell.shieldAmount && targetUnit && spell.targetType === 'ally') {
      const mult = this._getSpellMultiplier(caster, spell);
      let sAmt = Math.round(spell.shieldAmount * mult);
      if (caster && caster.supportPower) {
        sAmt = Math.round(sAmt * (1 + caster.supportPower / 100));
      }
      this._grantShield(targetUnit, sAmt);
      targetUnit.updateHUD();
      this.events.emit('unit:shielded', { unit: targetUnit, source: caster, spell, amount: sAmt });
    }

    if (spell.buffTargetPM && targetUnit) {
      targetUnit.currentPM = Math.min(targetUnit.maxPM + 1, targetUnit.currentPM + spell.buffTargetPM);
      targetUnit.updateHUD();
      this.events.emit('unit:resourceGained', { unit: targetUnit, source: caster, spell, pm: spell.buffTargetPM });
    }

    if (spell.baseMinDamage && targetUnit) {
      const evDist = Math.abs(targetUnit.gridX - caster.gridX) + Math.abs(targetUnit.gridZ - caster.gridZ);
      if (caster && targetUnit !== caster && this.runeCharms.evade(ctx, targetUnit, evDist)) return; // esquiva (runas)
      const { dmg, isCrit } = this._computeDamage(ctx, targetUnit);

      this._dealDamage(ctx, targetUnit, dmg, { isCrit, elemental: ctx.lastElemental || 1 });

      if (spell.debuffPM) {
        targetUnit.buffs.push({ type: 'minusPM', value: spell.debuffPM, duration: 1 });
        this.events.emit('unit:resourceLost', { unit: targetUnit, source: caster, spell, pm: spell.debuffPM });
      }

      if (spell.debuffPA) {
        targetUnit.currentPA = Math.max(0, targetUnit.currentPA - spell.debuffPA);
        targetUnit.updateHUD();
        this.events.emit('unit:resourceLost', { unit: targetUnit, source: caster, spell, pa: spell.debuffPA });
      }

      if (spell.drainHeal && caster && !caster.isDead) {
        const multD = this._getSpellMultiplier(caster, spell);
        const healVal = Math.round(spell.drainHeal * multD);
        this._heal(caster, healVal, caster, spell);
      }

      if (spell.buffSelfPM && caster && !caster.isDead) {
        caster.currentPM = Math.min(caster.maxPM + 1, caster.currentPM + spell.buffSelfPM);
        caster.updateHUD();
        this.events.emit('unit:resourceGained', { unit: caster, source: caster, spell, pm: spell.buffSelfPM });
      }

      if (spell.pushDistance && !targetUnit.isDead) {
        await this._executePushback(caster, targetUnit, spell.pushDistance, spell);
      }
    }
  }

  /** Daño de un hechizo contra un objetivo: tirada, nivel de habilidad, bonus del lanzador, crítico y ganchos. */
  _computeDamage(ctx, targetUnit) {
    const { caster, spell } = ctx;
    const mult = this._getSpellMultiplier(caster, spell);
    let dmg = Math.floor((spell.baseMinDamage + this.rng() * (spell.baseMaxDamage - spell.baseMinDamage + 1)) * mult);
    if (caster) {
      if ((spell.id.startsWith('kotaro_') || spell.id.startsWith('plant_')) && caster.bonusMeleeDamage) {
        dmg += Math.round(caster.bonusMeleeDamage);
      } else if ((spell.id.startsWith('bing_') || spell.id.startsWith('bird_')) && caster.bonusRangedDamage) {
        dmg += Math.round(caster.bonusRangedDamage);
      } else if (spell.id.startsWith('pomodoro_') && caster.bonusMagicDamage) {
        dmg += Math.round(caster.bonusMagicDamage);
      } else if (caster.bonusDamage) {
        dmg += caster.bonusDamage;
      }
    }
    const dist0 = Math.abs(targetUnit.gridX - caster.gridX) + Math.abs(targetUnit.gridZ - caster.gridZ);
    if (caster) dmg += this.runeCharms.flatDamage(caster, spell, dist0); // Shellshock, Red Mirror

    const critAllowed = this.hooks.critAllowed.every((fn) => fn(ctx, targetUnit) !== false);
    const statusCrit = caster.statuses?.length ? this.statuses.mod(caster, 'critPct') : 0; // Gafe, Crítico +
    const critChance = ((caster.critRate > 0 ? caster.critRate : 20) + statusCrit) / 100; // critRate ya incluye el 20 % base
    const isCrit = critAllowed && (this.rng() < critChance);
    if (isCrit) {
      dmg = Math.round(dmg * this.runeCharms.critMultiplier(caster, targetUnit)); // ×1,5 (+ daño crítico de runas)
    }

    const dist = dist0;
    const mods = this._applyDamageModifiers(caster, targetUnit, dmg, dist, ctx);
    dmg = mods.amount;
    ctx.lastElemental = mods.elemental;

    for (const fn of this.hooks.adjustDamage) dmg = fn(ctx, targetUnit, dmg, isCrit);
    return { dmg, isCrit };
  }

  /**
   * Modificadores de daño de fase 1: triángulo elemental (±15 %) y estados
   * (Potenciado/Debilitado del atacante, Frágil/Protegido/Cobertura del defensor).
   * Si no hay ningún modificador el daño no se toca (ni se redondea).
   */
  _applyDamageModifiers(caster, target, dmg, dist = 1, ctx = null) {
    let elemental = 1;
    if (this.elementalEnabled && caster && target) elemental = elementalMultiplier(caster.axieClass, target.axieClass);
    let pct = 0;
    if (caster?.statuses?.length) pct += this.statuses.mod(caster, 'damageDealtPct');
    if (target?.statuses?.length) {
      pct += this.statuses.mod(target, 'damageTakenPct');
      if (dist > 1) pct += this.statuses.mod(target, 'rangedDamageTakenPct');
    }
    pct += this.runeCharms.damagePct(caster, target, dist, ctx); // runas y charms (atacante y defensor)
    if (this.golems) pct += this.golems.damageTakenPct(target);   // Hito 95: aliado al lado de un Centinela de Vasija
    // damageMult: multiplicador propio de la unidad (Slime Knight del tutorial: ×2). Lo usa también el pronóstico.
    const mult = elemental * (1 + pct / 100) * (caster?.config?.damageMult || 1);
    if (mult === 1) return { amount: dmg, elemental };
    return { amount: Math.max(0, Math.round(dmg * mult)), elemental };
  }

  /**
   * Aplica daño ya calculado: escudo (con perforación opcional), evento y Espinas.
   * Devuelve el daño real a la vida.
   */
  _dealDamage(ctx, target, dmg, { isCrit = false, elemental = 1, pierceShield = 0, dist = null } = {}) {
    const { caster, spell } = ctx;

    // Lazo Simbiótico: la mitad del daño la recibe la pareja vinculada (si sigue viva)
    if (target.statuses?.length) {
      const link = this.statuses.get(target, 'soulLink');
      const partner = link?.partner;
      if (partner && partner !== target && !partner.isDead && dmg > 1) {
        const shared = Math.floor(dmg / 2);
        dmg -= shared;
        const pShield = partner.shield || 0;
        const pActual = partner.takeDamage(shared);
        this.events.emit('unit:damaged', { unit: partner, source: caster, spell, actual: pActual, shieldAbsorbed: Math.max(0, pShield - (partner.shield || 0)), isCrit: false, linked: true });
      }
    }

    // Desert Protector: un aliado adyacente con la runa recibe el 20 % del golpe
    dmg = this.runeCharms.redirect(ctx, target, dmg);

    // Barrera (Hermit, Snake Jar): anula el golpe hasta su valor
    if (target.statuses?.length && this.statuses.has(target, 'barrier')) dmg = this.statuses.absorbBarrier(target, dmg);

    const initialShield = target.shield || 0;
    const hitDist = dist ?? (caster ? Math.abs(target.gridX - caster.gridX) + Math.abs(target.gridZ - caster.gridZ) : 1);
    pierceShield = Math.max(pierceShield, this.runeCharms.pierce(caster, hitDist)); // Sharp Talon
    let actual;
    if (pierceShield > 0 && initialShield > 0) {
      const pierced = Math.round(dmg * Math.min(1, pierceShield));
      actual = target.takeDamage(dmg - pierced);
      if (!target.isDead && pierced > 0) {
        const keep = target.shield || 0;
        target.shield = 0;
        actual += target.takeDamage(pierced);
        if (!target.isDead) { target.shield = keep; target.updateHUD?.(); }
      }
    } else {
      actual = target.takeDamage(dmg);
    }
    const shieldAbsorbed = Math.max(0, initialShield - (target.shield || 0));
    const payload = { unit: target, source: caster, spell, actual, shieldAbsorbed, isCrit };
    if (elemental !== 1) payload.elemental = elemental;
    this.events.emit('unit:damaged', payload);

    // Reacciones del objetivo: guardas, represalia y reflejo (cartas de partes)
    if (caster && target !== caster && target.statuses?.length) {
      const d0 = dist ?? (Math.abs(target.gridX - caster.gridX) + Math.abs(target.gridZ - caster.gridZ));
      for (const r of this.statuses.onHit(target, caster, { taken: actual + shieldAbsorbed, dist: d0 })) {
        if (r.kind === 'damageAttacker' && r.amount > 0 && !caster.isDead) {
          const back = caster.takeDamage(r.amount);
          this.events.emit('unit:damaged', { unit: caster, source: target, spell: null, actual: back, shieldAbsorbed: 0, isCrit: false, plain: true, reflected: true });
        } else if (r.kind === 'shieldUnit' && r.amount > 0) {
          this._grantShield(r.unit, r.amount);
          r.unit.updateHUD?.();
          this.events.emit('unit:shielded', { unit: r.unit, source: target, spell: null, amount: r.amount });
        }
      }
    }

    // Espinas: devuelve daño plano al atacante cuerpo a cuerpo
    if (caster && target !== caster && target.statuses?.length && !caster.isDead) {
      const thorns = this.statuses.get(target, 'reflect');
      const d = dist ?? (Math.abs(target.gridX - caster.gridX) + Math.abs(target.gridZ - caster.gridZ));
      if (thorns && d <= 1 && thorns.value > 0) {
        const back = caster.takeDamage(thorns.value);
        this.events.emit('unit:damaged', { unit: caster, source: target, spell: null, actual: back, shieldAbsorbed: 0, isCrit: false, plain: true, reflected: true });
      }
    }

    // Runas y charms: robo de vida, estados al golpear, matar, críticos y contraataques
    this.runeCharms.afterHit(ctx, target, { actual, shieldAbsorbed, isCrit, dist: hitDist });
    return actual;
  }

  /** Cura respetando Herida (bloqueo de curación). Devuelve la vida realmente curada. */
  _heal(target, amount, source, spell) {
    if (target.statuses?.length && this.statuses.isHealBlocked(target)) {
      this.events.emit('unit:healBlocked', { unit: target, source, spell });
      return 0;
    }
    {
      const pct = (target.statuses?.length ? this.statuses.mod(target, 'healTakenPct') : 0) + this.runeCharms.healTakenPct(target);
      if (pct) amount = Math.round(amount * (1 + pct / 100));
    }
    const actual = target.heal(amount);
    this.events.emit('unit:healed', { unit: target, source, spell, amount: actual });
    return actual;
  }

  /** Teletransporte instantáneo a una casilla libre. */
  async _teleport(unit, cell, spell = null, { hop = false } = {}) {
    const dest = this.gridManager.getTile(cell.x, cell.z);
    if (!dest || dest.unit || dest.obstacle || dest.walkable === false) return false;
    const from = this.gridManager.getTile(unit.gridX, unit.gridZ);
    if (from && from.unit === unit) from.unit = null;
    dest.unit = unit;
    const pos = this.gridManager.gridToWorld(cell.x, cell.z);
    if (hop && typeof unit._hopToCell === 'function') {
      await unit._hopToCell(cell.x, cell.z, 0.45); // salto animado, como el Salto Astral de siempre
      unit.gridX = cell.x;
      unit.gridZ = cell.z;
      unit.updateHUD?.();
      this.events.emit('spell:landing', { caster: unit, spell, pos });
    } else {
      unit.gridX = cell.x;
      unit.gridZ = cell.z;
      unit.updateWorldPosition?.();
      unit.updateHUD?.();
      this.events.emit('unit:teleported', { unit, spell, pos });
    }
    return true;
  }

  /** Intercambia posiciones de dos unidades (sin efectos extra). */
  _swapUnits(a, b, spell = null) {
    const ta = this.gridManager.getTile(a.gridX, a.gridZ);
    const tb = this.gridManager.getTile(b.gridX, b.gridZ);
    if (!ta || !tb) return false;
    ta.unit = b; tb.unit = a;
    [a.gridX, b.gridX] = [b.gridX, a.gridX];
    [a.gridZ, b.gridZ] = [b.gridZ, a.gridZ];
    a.updateWorldPosition?.(); b.updateWorldPosition?.();
    a.updateHUD?.(); b.updateHUD?.();
    this.events.emit('spell:transpose', {
      caster: a, target: b, spell,
      casterPos: this.gridManager.gridToWorld(a.gridX, a.gridZ),
      targetPos: this.gridManager.gridToWorld(b.gridX, b.gridZ),
    });
    return true;
  }

  /**
   * Bonus plano de daño del lanzador para hechizos con `effects`.
   * spell.damageBonus ('melee' | 'ranged' | 'magic' | 'none') manda; si no, prefijo histórico del id
   * (kotaro_/plant_ cuerpo a cuerpo, bing_/bird_ a distancia, pomodoro_ mágico); Sapidae usa el bonus
   * general como siempre; el resto (cartas de partes) según la distancia al objetivo.
   */
  _flatDamageBonus(caster, spell, dist = 1) {
    if (!caster) return 0;
    const id = spell.id || '';
    let kind = spell.damageBonus;
    if (!kind) {
      if (id.startsWith('kotaro_') || id.startsWith('plant_')) kind = 'melee';
      else if (id.startsWith('bing_') || id.startsWith('bird_')) kind = 'ranged';
      else if (id.startsWith('pomodoro_')) kind = 'magic';
      // Sapidae (19-oct; nombres del Hito 95): Alfarero y Comandante usan Ferocidad (1 casilla) o Agilidad (más lejos); Guardián de Campanas y Rastreador Gogo, Esencia
      else if (/^(lunalogist|stargazer)_/.test(id)) kind = 'magic';
      else if (/^(craft|shepard)_/.test(id)) kind = dist <= 1 ? 'melee' : 'ranged';
      else kind = dist <= 1 ? 'melee' : 'ranged';
    }
    const extra = this.runeCharms ? this.runeCharms.flatDamage(caster, spell, dist) : 0; // Shellshock, Red Mirror
    const pick = { melee: caster.bonusMeleeDamage, ranged: caster.bonusRangedDamage, magic: caster.bonusMagicDamage }[kind];
    if (pick) return Math.round(pick) + extra;
    if (kind === 'none') return extra;
    return (caster.bonusDamage || 0) + extra;
  }

  _getSpellMultiplier(caster, spell) {
    if (!caster || typeof caster.getSkillLevel !== 'function') return 1.0;
    const level = caster.getSkillLevel(spell.id);
    // Level 1: 100%, Level 2: 120%, Level 3: 140%, Level 4: 160%, Level 5: 185%
    const multipliers = [1.0, 1.0, 1.20, 1.40, 1.60, 1.85];
    return multipliers[Math.min(5, Math.max(1, level))];
  }

  async _executeJump(caster, spell, targetCell) {
    const oldTile = this.gridManager.getTile(caster.gridX, caster.gridZ);
    if (oldTile && oldTile.unit === caster) oldTile.unit = null;

    const newTile = this.gridManager.getTile(targetCell.x, targetCell.z);
    if (newTile) {
      if (newTile.unit && newTile.unit !== caster) return false;
      newTile.unit = caster;
    }

    await caster._hopToCell(targetCell.x, targetCell.z, 0.45);
    caster.gridX = targetCell.x;
    caster.gridZ = targetCell.z;
    caster.updateHUD();

    const targetWorldPos = this.gridManager.gridToWorld(targetCell.x, targetCell.z);
    this.events.emit('spell:landing', { caster, spell, pos: targetWorldPos });

    if (spell.shieldAmount) {
      const mult = this._getSpellMultiplier(caster, spell);
      let shieldAmt = Math.round(spell.shieldAmount * mult);
      if (caster && caster.supportPower) {
        shieldAmt = Math.round(shieldAmt * (1 + caster.supportPower / 100));
      }
      caster.addShield(shieldAmt);
      caster.shieldExpiresRound = this._shieldExpiry();
      this.events.emit('unit:shielded', { unit: caster, source: caster, spell, amount: shieldAmt, pos: targetWorldPos, variant: 'jump' });
    }

    const adjacent = [
      { x: targetCell.x + 1, z: targetCell.z },
      { x: targetCell.x - 1, z: targetCell.z },
      { x: targetCell.x, z: targetCell.z + 1 },
      { x: targetCell.x, z: targetCell.z - 1 }
    ];

    adjacent.forEach(adj => {
      const tile = this.gridManager.getTile(adj.x, adj.z);
      if (tile && tile.unit && tile.unit !== caster) { // fuego amigo: el impacto del salto alcanza a cualquiera
        const mult = this._getSpellMultiplier(caster, spell);
        let dmg = Math.floor((spell.baseMinDamage + this.rng() * (spell.baseMaxDamage - spell.baseMinDamage + 1)) * mult);
        if (caster) {
          if (caster.bonusMeleeDamage) dmg += Math.round(caster.bonusMeleeDamage);
          else if (caster.bonusDamage) dmg += caster.bonusDamage;
        }
        const actual = tile.unit.takeDamage(dmg);
        this.events.emit('unit:damaged', { unit: tile.unit, source: caster, spell, actual, shieldAbsorbed: 0, isCrit: false, plain: true });
      }
    });

    this.events.emit('spell:jumpImpact', { caster, spell, pos: targetWorldPos });
  }

  /** collisionDamage: daño fijo por choque (sustituye a 20 por casilla restante); collisionBonus se suma. */
  async _executePushback(caster, targetUnit, distance, spell = null, collisionBonus = 0, collisionDamage = null) {
    if (targetUnit.isGolem || (targetUnit.statuses?.length && this.statuses.has(targetUnit, 'unmovable'))) {
      this.events.emit('unit:unmoved', { unit: targetUnit, source: caster, spell });
      return;
    }
    const dx = Math.sign(targetUnit.gridX - caster.gridX);
    const dz = Math.sign(targetUnit.gridZ - caster.gridZ);
    distance = this.runeCharms.pushDistance(targetUnit, distance); // Pure Skill

    this.events.emit('unit:pushStart', { unit: targetUnit, source: caster, spell });

    const pushResult = await targetUnit.pushback(dx, dz, distance);

    if (pushResult.hitObstacle && pushResult.remainingTiles > 0) {
      // Small 70ms delay: just an instant after attack damage so texts don't overlap while feeling immediate
      // (sin gráficos no hay textos que separar: el motor sin gráficos no espera)
      if (!this.headless) await new Promise(r => setTimeout(r, 70));

      const extraCollision = Math.round((caster && caster.collisionBonus) || 0);
      const base = collisionDamage != null ? collisionDamage : pushResult.remainingTiles * 20;
      const collisionDamage_ = base + extraCollision + collisionBonus;

      // Sturdy Fighter: inmune al daño de colisión
      const hitsTarget = !this.runeCharms.collisionImmune(targetUnit);
      this.events.emit('unit:collision', { unit: targetUnit, source: caster, damage: hitsTarget ? collisionDamage_ : 0, first: true });
      if (hitsTarget) targetUnit.takeDamage(collisionDamage_);

      if (pushResult.collidingUnit) {
        const hitsOther = !this.runeCharms.collisionImmune(pushResult.collidingUnit);
        this.events.emit('unit:collision', { unit: pushResult.collidingUnit, source: caster, damage: hitsOther ? collisionDamage_ : 0, first: false });
        if (hitsOther) pushResult.collidingUnit.takeDamage(collisionDamage_);
      }
    }
  }

}
