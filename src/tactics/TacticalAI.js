// TacticalAI.js - Smart Enemy Decision Engine for Axie Tactics with Tactical Pacing & Combos
// Fase 5: elige hechizo y objetivo con el pronóstico (combat/Forecast.js) y usa escudos/protecciones cuando está herido.
import { forecast } from './combat/Forecast.js';
export class TacticalAI {
  constructor(gridManager, spellManager, turnManager) {
    this.gridManager = gridManager;
    this.spellManager = spellManager;
    this.turnManager = turnManager;
  }

  async executeTurn(enemyUnit) {
    if (enemyUnit.isDead || this.turnManager.isCombatOver) return;

    // 1. Deliberate initial pause: allows camera focus, nameplate, and turn banner to sink in
    await this._sleep(900);
    if (this.turnManager.isCombatOver || enemyUnit.isDead) return;

    const heroes = this.turnManager.units.filter(u => u.team === 'player' && !u.isDead);
    const allies = this.turnManager.units.filter(u => u.team === 'enemy' && !u.isDead && u !== enemyUnit);

    if (heroes.length === 0 || this.turnManager.isCombatOver) {
      this.turnManager.endCurrentTurn();
      return;
    }

    // Sort heroes strategically: prioritize wounded heroes and closer targets
    const prioritizedHeroes = [...heroes].sort((a, b) => {
      const distA = this.gridManager.getDistance({ x: enemyUnit.gridX, z: enemyUnit.gridZ }, { x: a.gridX, z: a.gridZ });
      const distB = this.gridManager.getDistance({ x: enemyUnit.gridX, z: enemyUnit.gridZ }, { x: b.gridX, z: b.gridZ });
      const scoreA = distA + (a.currentHP / a.maxHP) * 3.5;
      const scoreB = distB + (b.currentHP / b.maxHP) * 3.5;
      return scoreA - scoreB;
    });

    // Provocación: los héroes que provocan van primero (también al decidir hacia dónde moverse).
    // Hito 95: el Centinela de Vasija provoca a los enemigos que tiene al lado (isTauntingFor)
    const statuses = this.spellManager.statuses;
    if (statuses) {
      const taunts = (u) => Number(this.spellManager.isTauntingFor ? this.spellManager.isTauntingFor(u, enemyUnit) : statuses.has(u, 'taunt'));
      prioritizedHeroes.sort((a, b) => taunts(b) - taunts(a));
    }

    // Objetivo fijado por el combate (guion del tutorial: las quimeras van a por el Sapidae)
    const forcedId = enemyUnit.config && enemyUnit.config.aiTargetId;
    const forced = forcedId ? heroes.find((h) => h.id === forcedId) : null;
    if (forced) prioritizedHeroes.splice(0, prioritizedHeroes.length, forced);

    // Miedo: no puede atacar; se aleja todo lo que pueda y termina el turno
    if (statuses && statuses.isFeared(enemyUnit)) {
      for (let i = 0; i < 3 && enemyUnit.currentPM > 0 && !this.turnManager.isCombatOver; i++) {
        const before = enemyUnit.currentPM;
        await this._retreatStep(enemyUnit, prioritizedHeroes);
        if (enemyUnit.currentPM === before) break;
      }
      if (this.turnManager.isCombatOver) return;
      await this._sleep(450);
      this.turnManager.endCurrentTurn();
      return;
    }

    // 2. Heal Ally check (e.g. Shaman / Mystic Puffies)
    const healSpellId = enemyUnit.spellIds.find(id => {
      const s = this.spellManager.getSpell(id);
      return s && s.baseMinHeal;
    });

    if (healSpellId && enemyUnit.currentPA >= 3) {
      const injuredAlly = allies.find(a => a.currentHP < a.maxHP * 0.7);
      if (injuredAlly) {
        const spell = this.spellManager.getSpell(healSpellId);
        const validCells = this.spellManager.getValidTargetCells(enemyUnit, spell);
        const canHeal = validCells.some(c => c.x === injuredAlly.gridX && c.z === injuredAlly.gridZ);
        if (canHeal) {
          await this._sleep(400);
          if (this.turnManager.isCombatOver) return;
          await this.spellManager.castSpell(enemyUnit, spell, { x: injuredAlly.gridX, z: injuredAlly.gridZ });
          if (this.turnManager.checkCombatEnd()) return;
          await this._sleep(850);
        }
      }
    }

    if (this.turnManager.isCombatOver) return;

    // 2b. Escudos / protecciones cuando está herido (Fase 5)
    await this._trySupport(enemyUnit, allies);
    if (this.turnManager.isCombatOver) return;

    // 3. Attack check from current position
    let attacked = await this._tryAttack(enemyUnit, prioritizedHeroes);
    if (this.turnManager.isCombatOver) return;

    // 4. If could not attack and has PM, move into range, then attack!
    if (!attacked && enemyUnit.currentPM > 0) {
      await this._moveIntoRangeAndAttack(enemyUnit, prioritizedHeroes);
    }
    if (this.turnManager.isCombatOver) return;

    // 5. If enemy still has PA, chain secondary attacks or debuffs!
    while (enemyUnit.currentPA >= 3 && !enemyUnit.isDead && !this.turnManager.isCombatOver) {
      const aliveHeroes = forced && !forced.isDead ? [forced] : this.turnManager.units.filter(u => u.team === 'player' && !u.isDead);
      if (aliveHeroes.length === 0) break;
      const comboHit = await this._tryAttack(enemyUnit, aliveHeroes);
      if (!comboHit || this.turnManager.isCombatOver) break;
      await this._sleep(500);
    }

    if (this.turnManager.isCombatOver) return;

    // 6. If has remaining PM and is a ranged enemy, retreat 1 step to keep distance
    if (enemyUnit.currentPM > 0 && (enemyUnit.type.includes('attack') || enemyUnit.type.includes('puffy'))) {
      await this._sleep(300);
      if (this.turnManager.isCombatOver) return;
      await this._retreatStep(enemyUnit, prioritizedHeroes);
    }

    if (this.turnManager.isCombatOver) return;

    // Conclude turn with a clean, calm pause
    await this._sleep(450);
    this.turnManager.endCurrentTurn();
  }

  async _tryAttack(enemyUnit, heroes) {
    if (enemyUnit.isDead) return false;

    const attackSpells = enemyUnit.spellIds
      .map(id => this.spellManager.getSpell(id))
      .filter(s => s && this.spellManager.isDamageSpell(s) && this.spellManager.canCastNow(enemyUnit, s)); // Hito 97: PA, usos y recarga

    const best = this.pickAttack(enemyUnit, heroes, attackSpells);
    if (!best) return false;

    // Telegraphing pause: Face target and pause before launching attack
    await this._sleep(450);
    if (this.turnManager.isCombatOver) return true;
    await this.spellManager.castSpell(enemyUnit, best.spell, best.cell);
    if (this.turnManager.checkCombatEnd()) return true;
    // Impact pause: let player see the damage, floating text, and health bar drain
    await this._sleep(850);
    return true;
  }

  /**
   * Mejor par (hechizo, casilla) según el pronóstico: daño medio a la vida, +60 si es letal, +12 por cada estado
   * perjudicial nuevo, −30 por cada aliado propio alcanzado; ligera preferencia por los héroes priorizados.
   */
  pickAttack(enemyUnit, heroes, spells) {
    const sm = this.spellManager;
    const order = new Map(heroes.map((h, i) => [h, i]));
    let best = null;
    for (const spell of spells) {
      for (const cell of sm.getValidTargetCells(enemyUnit, spell)) {
        const main = this.gridManager.getTile(cell.x, cell.z)?.unit;
        if (!main || main.isDead || main.team === enemyUnit.team || !order.has(main)) continue;
        let score = 0;
        try {
          const fc = forecast(sm, enemyUnit, spell, cell);
          for (const r of fc?.targets || []) {
            const foe = r.unit.team !== enemyUnit.team;
            if (r.damage) {
              const avg = (r.damage.min + r.damage.max) / 2;
              const toHP = Math.max(0, avg - ((r.damage.shieldMin + r.damage.shieldMax) / 2 || 0));
              score += foe ? toHP + (r.damage.lethal ? 60 : 0) : -30 - toHP;
            }
            if (foe) score += 12 * r.statuses.filter((st) => st.kind === 'debuff' && !sm.statuses.has(r.unit, st.id)).length;
          }
        } catch {
          score = spell.baseMaxDamage || 1;
        }
        score -= (order.get(main) || 0) * 4; // prioridad de objetivo (herido / cercano / provocador)
        score /= Math.max(1, Number(spell.paCost) || 1) ** 0.35; // algo de eficiencia por PA
        if (!best || score > best.score) best = { spell, cell, score };
      }
    }
    return best;
  }

  /** Escudos y protecciones (slime_barrier…): sobre sí mismo o un aliado herido que no tenga ya escudo. */
  async _trySupport(enemyUnit, allies) {
    const sm = this.spellManager;
    const spells = enemyUnit.spellIds.map(id => sm.getSpell(id))
      .filter(s => s && s.targetType !== 'enemy' && !sm.isDamageSpell(s) && !s.baseMinHeal && (s.shieldAmount || (s.effects || []).some(e => e.type === 'shield' || e.type === 'status')) && sm.canCastNow(enemyUnit, s));
    for (const spell of spells) {
      const cells = sm.getValidTargetCells(enemyUnit, spell);
      const who = [enemyUnit, ...allies]
        .filter(u => !u.isDead && u.currentHP < u.maxHP * 0.75 && !(u.shield > 0))
        .find(u => cells.some(c => c.x === u.gridX && c.z === u.gridZ));
      if (!who) continue;
      await this._sleep(400);
      if (this.turnManager.isCombatOver) return true;
      await sm.castSpell(enemyUnit, spell, { x: who.gridX, z: who.gridZ });
      await this._sleep(700);
      return true;
    }
    return false;
  }

  async _moveIntoRangeAndAttack(enemyUnit, heroes) {
    const targetHero = heroes[0];
    if (!targetHero) return;

    const currentDist = this.gridManager.getDistance({ x: enemyUnit.gridX, z: enemyUnit.gridZ }, { x: targetHero.gridX, z: targetHero.gridZ });

    // Find all reachable cells within PM
    const reachable = this.gridManager.getReachableCells(
      enemyUnit.gridX,
      enemyUnit.gridZ,
      enemyUnit.currentPM,
      enemyUnit
    );

    if (reachable.length === 0) return;

    // Evaluate which reachable cell gets closest to the hero or in attack range
    // Hito 35: en los mapas con forma (ríos, grietas, vacío) se mide la distancia caminando, no en línea
    // recta: si no, el enemigo se queda quieto cuando rodear obliga a alejarse primero.
    const walk = this.gridManager.layout ? this._walkDistances(targetHero, enemyUnit) : null;
    const distTo = (x, z) => {
      if (walk) {
        const w = walk.get(x + ',' + z);
        if (w !== undefined) return w;
      }
      return this.gridManager.getDistance({ x, z }, { x: targetHero.gridX, z: targetHero.gridZ }) + (walk ? 1000 : 0);
    };
    let bestCell = null;
    let bestDist = distTo(enemyUnit.gridX, enemyUnit.gridZ);

    for (const r of reachable) {
      const d = distTo(r.x, r.z);
      if (d < bestDist) {
        bestDist = d;
        bestCell = r;
      }
    }

    if (bestCell && bestCell.path) {
      await this._sleep(350);
      await enemyUnit.moveAlongPath(bestCell.path);
      await this._sleep(600);

      // Now try attacking after moving!
      await this._tryAttack(enemyUnit, heroes);
    }
  }

  /** Hito 35: pasos caminando desde cada casilla hasta el héroe objetivo (BFS por donde puede pasar la unidad). */
  _walkDistances(targetHero, unit) {
    const gm = this.gridManager;
    const dist = new Map([[targetHero.gridX + ',' + targetHero.gridZ, 0]]);
    const queue = [{ x: targetHero.gridX, z: targetHero.gridZ, d: 0 }];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (queue.length) {
      const c = queue.shift();
      for (const [dx, dz] of dirs) {
        const x = c.x + dx, z = c.z + dz;
        const k = x + ',' + z;
        if (dist.has(k)) continue;
        if (!gm.isCellTraversable(x, z, unit)) continue;
        dist.set(k, c.d + 1);
        queue.push({ x, z, d: c.d + 1 });
      }
    }
    return dist;
  }

  async _retreatStep(enemyUnit, heroes) {
    const closestHero = heroes[0];
    if (!closestHero) return;

    const minDist = this.gridManager.getDistance({ x: enemyUnit.gridX, z: enemyUnit.gridZ }, { x: closestHero.gridX, z: closestHero.gridZ });

    const reachable = this.gridManager.getReachableCells(
      enemyUnit.gridX,
      enemyUnit.gridZ,
      1,
      enemyUnit
    );

    // Pick tile that maximizes distance to closest hero
    let bestCell = null;
    let maxDist = minDist;

    for (const r of reachable) {
      const d = this.gridManager.getDistance({ x: r.x, z: r.z }, { x: closestHero.gridX, z: closestHero.gridZ });
      if (d > maxDist) {
        maxDist = d;
        bestCell = r;
      }
    }

    if (bestCell && bestCell.path) {
      await enemyUnit.moveAlongPath(bestCell.path);
      await this._sleep(400);
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
