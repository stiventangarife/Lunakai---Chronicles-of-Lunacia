// EffectResolver.js — Ejecuta habilidades descritas como datos: `spell.effects = [ {type, ...}, ... ]`.
//
// Las habilidades antiguas (campos sueltos: baseMinDamage, shieldAmount, pushDistance…) siguen
// funcionando por el camino de siempre. Las nuevas (fases 2-4: Sapidae, Ultimates, cartas de partes)
// se escriben así:
//
//   effects: [
//     { type: 'damage', min: 60, max: 60, pierceShield: 0.25, bonus: [{ if: { targetHpBelow: 0.5 }, add: 20 }] },
//     { type: 'status', status: 'bleed', value: 15, duration: 2 },
//     { type: 'push', distance: 1 },
//   ]
//
// Tipos: damage · heal · drain · shield · push · pull · status · cleanse · dispel · resource ·
//        summon · zone · teleport (animate: 'hop') · swap
//
// `target` de cada efecto (por defecto 'area'):
//   'area'          unidades de las casillas afectadas que encajan con spell.targetType
//   'enemiesInArea' / 'alliesInArea'   solo enemigos / aliados del lanzador en el área
//   'self'          el lanzador
//   'allEnemies' / 'allAllies'         todo el tablero
//   'enemiesAroundCaster'              enemigos adyacentes al lanzador (tras moverse, si se movió)
//   'cell'          la casilla objetivo (summon, zone, teleport)
//
// Recursos (`resource`): when 'now' | 'nextTurn' | 'auto' (por defecto). 'auto' = ahora si el objetivo es
// la unidad del turno; si no, al empezar su próximo turno (los PA/PM se reponen al empezar el turno,
// así que dárselos ahora a otra unidad no serviría de nada).
//
// `if` (condiciones por objetivo): targetHpBelow, casterHpBelow, targetClass[], targetHasStatus,
//   targetHasDebuff, casterHasShield, targetNoShield, minRound, chance

import { STATUS_DEFS } from './StatusSystem.js';
import { elementalMultiplier } from './Elements.js';

export class EffectResolver {
  constructor(spellManager) {
    this.sm = spellManager;
  }

  get events() { return this.sm.events; }
  get statuses() { return this.sm.statuses; }
  get grid() { return this.sm.gridManager; }

  async run(ctx) {
    ctx.totalDamage = 0;
    for (const effect of ctx.spell.effects) {
      const targets = this.resolveTargets(ctx, effect);
      await this.apply(ctx, effect, targets);
    }
  }

  // ------------------------------------------------ objetivos

  resolveTargets(ctx, effect) {
    const { caster, spell } = ctx;
    const all = (this.sm.game?.units || []).filter((u) => !u.isDead);
    const inArea = () => (ctx.affectedCells || [])
      .map((c) => this.grid.getTile(c.x, c.z)?.unit)
      .filter((u) => u && !u.isDead);
    const sel = effect.target || 'area';

    switch (sel) {
      case 'self': return [caster];
      case 'cell': return [];
      case 'enemiesInArea': return inArea().filter((u) => u.team !== caster.team);
      case 'alliesInArea': return inArea().filter((u) => u.team === caster.team);
      case 'allEnemies': return all.filter((u) => u.team !== caster.team);
      case 'allAllies': return all.filter((u) => u.team === caster.team);
      case 'enemiesAroundCaster': return all.filter((u) => u.team !== caster.team
        && Math.abs(u.gridX - caster.gridX) + Math.abs(u.gridZ - caster.gridZ) === 1);
      case 'area':
      default: {
        const units = inArea();
        if (spell.targetType === 'enemy') return units.filter((u) => u.team !== caster.team);
        if (spell.targetType === 'ally') return units.filter((u) => u.team === caster.team);
        if (spell.targetType === 'self') return [caster];
        return units;
      }
    }
  }

  check(cond, ctx, target) {
    if (!cond) return true;
    const { caster } = ctx;
    const round = this.sm.field?.round || 1;
    const hpRatio = (u) => (u.maxHP ? u.currentHP / u.maxHP : 1);
    if (cond.targetHpBelow != null && !(target && hpRatio(target) < cond.targetHpBelow)) return false;
    if (cond.casterHpBelow != null && !(hpRatio(caster) < cond.casterHpBelow)) return false;
    if (cond.targetClass && !(target && cond.targetClass.map((c) => c.toLowerCase()).includes(String(target.axieClass || '').toLowerCase()))) return false;
    if (cond.targetHasStatus && !(target && this.statuses.has(target, cond.targetHasStatus))) return false;
    if (cond.targetHasDebuff && !(target && (target.statuses || []).some((s) => STATUS_DEFS[s.id]?.kind === 'debuff'))) return false;
    if (cond.casterHasShield && !(caster.shield > 0)) return false;
    if (cond.targetNoShield && !(target && !(target.shield > 0))) return false;
    if (cond.minRound != null && round < cond.minRound) return false;
    if (cond.maxRound != null && round > cond.maxRound) return false;
    // Fase 4 (cartas de partes)
    if (cond.casterHpAtLeast != null && !(hpRatio(caster) >= cond.casterHpAtLeast)) return false;
    if (cond.casterHpAbove != null && !(hpRatio(caster) > cond.casterHpAbove)) return false;
    if (cond.targetHpAtMost != null && !(target && target.currentHP <= cond.targetHpAtMost)) return false;
    if (cond.targetHasShield && !(target && target.shield > 0)) return false;
    if (cond.distAtLeast != null && !(target && Math.abs(target.gridX - caster.gridX) + Math.abs(target.gridZ - caster.gridZ) >= cond.distAtLeast)) return false;
    if (cond.hitCrit && !ctx.lastHit?.isCrit) return false;
    if (cond.hitDamaged && !(ctx.lastHit?.actual > 0)) return false;
    const alive = (this.sm.game?.units || []).filter((u) => !u.isDead);
    if (cond.aloneAlly && alive.filter((u) => u.team === caster.team).length !== 1) return false;
    if (cond.enemiesOutnumber && !(alive.filter((u) => u.team !== caster.team).length > alive.filter((u) => u.team === caster.team).length)) return false;
    if (cond.enemyHasShield && !alive.some((u) => u.team !== caster.team && u.shield > 0)) return false;
    if (cond.chance != null && !(this.sm.rng() < cond.chance)) return false;
    return true;
  }

  // ------------------------------------------------ efectos

  async apply(ctx, e, targets) {
    const { caster, spell } = ctx;
    switch (e.type) {
      case 'damage':
        for (const t of targets) {
          if (t.isDead || !this.check(e.if, ctx, t)) continue;
          const hits = e.hits === 'spent' ? Math.max(1, ctx.spent || 1) : Math.max(1, e.hits || 1);
          for (let i = 0; i < hits && !t.isDead; i++) this.dealDamage(ctx, t, e);
        }
        break;

      case 'heal':
        for (const t of targets) {
          if (!this.check(e.if, ctx, t)) continue;
          this.heal(ctx, t, this.roll(e) * this.sm._getSpellMultiplier(caster, spell), true);
        }
        break;

      case 'drain': {
        const amount = Math.round((ctx.totalDamage || 0) * (e.percent ?? 0.5));
        if (amount > 0 && !caster.isDead) this.heal(ctx, caster, amount, false);
        break;
      }

      case 'shield':
        for (const t of targets) {
          if (!this.check(e.if, ctx, t)) continue;
          let amt = Math.round((e.amount || 0) * this.sm._getSpellMultiplier(caster, spell));
          if (caster.supportPower) amt = Math.round(amt * (1 + caster.supportPower / 100));
          this.sm._grantShield(t, amt);
          t.updateHUD?.();
          this.events.emit('unit:shielded', { unit: t, source: caster, spell, amount: amt });
        }
        break;

      case 'push':
        for (const t of targets) {
          if (t.isDead || t === caster || !this.check(e.if, ctx, t)) continue;
          await this.sm._executePushback(caster, t, e.distance || 1, spell, e.collisionBonus || 0, e.collisionDamage ?? null);
        }
        break;

      case 'pull':
        for (const t of targets) {
          if (t.isDead || t === caster || !this.check(e.if, ctx, t)) continue;
          if (this.statuses.has(t, 'unmovable')) continue;
          const center = e.toward === 'center' ? ctx.targetCell : { x: caster.gridX, z: caster.gridZ };
          const ox = center.x - t.gridX;
          const oz = center.z - t.gridZ;
          if (!ox && !oz) continue;
          // Se atrae por el eje con más distancia (en diagonal, primero en X): nunca en diagonal
          const alongX = Math.abs(ox) >= Math.abs(oz);
          const dx = alongX ? Math.sign(ox) : 0;
          const dz = alongX ? 0 : Math.sign(oz);
          const gap = alongX ? Math.abs(ox) : Math.abs(oz);
          // Atraer no causa daño de colisión: solo mueve hasta donde se pueda
          const dist = Math.min(e.distance || 1, gap - (e.toward === 'center' ? 0 : 1));
          if (dist <= 0) continue;
          this.events.emit('unit:pulled', { unit: t, source: caster, spell });
          await t.pushback(dx, dz, dist);
        }
        break;

      case 'status': {
        // linkTo: 'caster' (pareja = lanzador) | 'target' (pareja = unidad de la casilla objetivo)
        const primary = this.grid.getTile(ctx.targetCell.x, ctx.targetCell.z)?.unit || null;
        for (const t of targets) {
          if (t.isDead || !this.check(e.if, ctx, t)) continue;
          const partner = e.linkTo === 'caster' ? caster : e.linkTo === 'target' ? primary : null;
          this.statuses.apply(t, e.status, { value: e.value, duration: e.duration ?? 1, source: caster, partner, delay: e.delay || 0 });
        }
        break;
      }

      case 'cleanse':
        for (const t of targets) if (this.check(e.if, ctx, t)) this.statuses.clear(t, 'debuff', e.count ?? Infinity, e.only || null);
        break;

      case 'dispel':
        for (const t of targets) if (this.check(e.if, ctx, t)) this.statuses.clear(t, 'buff', e.count ?? Infinity);
        break;

      case 'resource':
        for (const t of targets) {
          if (t.isDead || !this.check(e.if, ctx, t)) continue;
          this.resource(ctx, t, e);
        }
        break;

      case 'summon':
        this.sm.field.placeObstacle({ x: ctx.targetCell.x, z: ctx.targetCell.z, type: e.model || 'wood_post', rounds: e.rounds ?? 2, owner: caster, kind: e.kind || 'summon' });
        break;

      case 'zone':
        this.sm.field.placeZone({ cells: ctx.affectedCells || [ctx.targetCell], rounds: e.rounds ?? 2, owner: caster, kind: e.kind || 'zone', ally: e.ally || {}, enemy: e.enemy || {} });
        break;

      case 'teleport':
        await this.sm._teleport(caster, ctx.targetCell, spell, { hop: e.animate === 'hop' });
        break;

      case 'swap': {
        const t = this.grid.getTile(ctx.targetCell.x, ctx.targetCell.z)?.unit;
        if (t && t !== caster) this.sm._swapUnits(caster, t, spell);
        break;
      }

      // ---------------- Fase 4: cartas de partes
      case 'shieldBreak':
        for (const t of targets) {
          if (t.isDead || !(t.shield > 0) || !this.check(e.if, ctx, t)) continue;
          const lost = Math.min(t.shield, e.amount != null ? e.amount : Math.round(t.shield * (e.percent || 0)));
          t.shield -= lost;
          t.updateHUD?.();
          this.events.emit('unit:shieldBroken', { unit: t, source: caster, spell, amount: lost });
        }
        break;

      case 'selfDamage': {
        if (caster.isDead) break;
        const lost = Math.min(e.amount || 0, Math.max(0, caster.currentHP - 1)); // nunca se mata a sí mismo
        if (lost > 0) {
          caster.currentHP -= lost;
          caster.updateHUD?.();
          this.events.emit('unit:damaged', { unit: caster, source: caster, spell, actual: lost, shieldAbsorbed: 0, isCrit: false, plain: true, selfInflicted: true });
        }
        break;
      }

      case 'transferDebuffs': {
        const t = this.grid.getTile(ctx.targetCell.x, ctx.targetCell.z)?.unit;
        if (!t || t === caster || t.isDead) break;
        for (const st of [...(caster.statuses || [])]) {
          if (STATUS_DEFS[st.id]?.kind !== 'debuff') continue;
          this.statuses.remove(caster, st.id, 'transferred');
          this.statuses.apply(t, st.id, { value: st.value, duration: st.duration, source: caster });
        }
        break;
      }

      case 'statusMultiply':
        for (const t of targets) {
          const st = t.isDead ? null : this.statuses.get(t, e.status);
          if (!st) continue;
          const def = STATUS_DEFS[e.status];
          st.value = Math.min(def?.maxValue ?? Infinity, Math.round(st.value * (e.mult || 2)));
          t.updateHUD?.();
          this.events.emit('status:applied', { unit: t, status: e.status, value: st.value, duration: st.duration, source: caster, def });
        }
        break;

      case 'ward':
        // Guarda reactiva sobre el aliado: al recibir un golpe enemigo se dispara una vez (ver StatusSystem.onHit)
        for (const t of targets) {
          if (t.isDead || !this.check(e.if, ctx, t)) continue;
          this.statuses.apply(t, 'ward', {
            value: 1, duration: e.duration ?? 2, source: caster,
            data: { apply: e.apply || null, applyDuration: e.applyDuration || 1, applyValue: e.applyValue, meleeOnly: Boolean(e.meleeOnly), gain: e.gain || null, amount: e.amount || 0 },
          });
        }
        break;

      default:
        console.warn(`[EffectResolver] Efecto desconocido "${e.type}" en ${spell.id}`);
    }
  }

  roll(e) {
    if (e.amount != null) return e.amount;
    const min = e.min ?? 0;
    const max = e.max ?? min;
    return Math.floor(min + this.sm.rng() * (max - min + 1));
  }

  /** Daño completo: tirada, nivel, bonus del lanzador, crítico, condiciones, modificadores y ganchos. */
  dealDamage(ctx, target, e) {
    const { caster, spell } = ctx;
    const dist = Math.abs(target.gridX - caster.gridX) + Math.abs(target.gridZ - caster.gridZ);
    let dmg = Math.floor(this.roll(e) * this.sm._getSpellMultiplier(caster, spell));

    // Bonus plano del lanzador (misma regla que los hechizos antiguos; ver SpellManager._flatDamageBonus)
    dmg += this.sm._flatDamageBonus(caster, spell, dist);

    // Bonus condicionales de la carta
    const alive = (this.sm.game?.units || []).filter((u) => !u.isDead);
    for (const b of e.bonus || []) {
      if (!this.check(b.if, ctx, target)) continue;
      if (b.perAllyAlive) { dmg += b.perAllyAlive * alive.filter((u) => u.team === caster.team && u !== caster).length; continue; }
      if (b.perAllyOfClass) { dmg += (b.add || 0) * alive.filter((u) => u.team === caster.team && u !== caster && String(u.axieClass || '').toLowerCase() === b.perAllyOfClass).length; continue; }
      if (b.perTargetStatus) { const st = this.statuses.get(target, b.perTargetStatus); dmg += (b.add || 0) * (st ? Math.floor(st.value / (b.per || 1)) : 0); continue; }
      if (b.perAllyShielded) { const n = alive.filter((u) => u.team === caster.team && u !== caster && u.shield > 0).length; dmg += Math.min(b.cap ?? Infinity, b.perAllyShielded * n); continue; }
      if (b.casterShieldPct) { dmg += Math.round((caster.shield || 0) * b.casterShieldPct); continue; }
      if (b.add) dmg += b.add;
      if (b.mult) dmg = Math.round(dmg * b.mult);
    }

    // Crítico
    const critAllowed = this.sm.hooks.critAllowed.every((fn) => fn(ctx, target) !== false);
    const critChance = 0.20 + ((caster.critRate || 0) + this.statuses.mod(caster, 'critPct') + (e.critBonus || 0)) / 100;
    const isCrit = critAllowed && (this.sm.rng() < critChance);
    if (isCrit) dmg = Math.round(dmg * 1.5);

    const { amount, elemental } = this.sm._applyDamageModifiers(caster, target, dmg, dist);
    dmg = amount;
    for (const fn of this.sm.hooks.adjustDamage) dmg = fn(ctx, target, dmg, isCrit);

    const actual = this.sm._dealDamage(ctx, target, dmg, { isCrit, elemental, pierceShield: e.pierceShield || 0, dist });
    ctx.totalDamage += actual;
    ctx.lastHit = { target, actual, isCrit };
    return actual;
  }

  heal(ctx, target, amount, useSupport) {
    const { caster, spell } = ctx;
    let amt = Math.round(amount);
    if (useSupport && caster.supportPower) amt = Math.round(amt * (1 + caster.supportPower / 100));
    const actual = this.sm._heal(target, amt, caster, spell);
    return actual;
  }

  resource(ctx, t, e) {
    const { caster, spell } = ctx;
    const pa = e.pa || 0;
    const pm = e.pm || 0;
    const active = this.sm._activeUnit();
    const when = e.when || 'auto';
    if (when === 'nextTurn' || when === 'turnAfterNext' || (when === 'auto' && active && active !== t)) {
      const delay = when === 'turnAfterNext' ? 1 : 0;
      if (pa > 0) this.statuses.apply(t, 'energized', { value: pa, duration: 1, source: caster, delay });
      if (pa < 0) this.statuses.apply(t, 'drained', { value: -pa, duration: 1, source: caster, delay });
      if (pm > 0) this.statuses.apply(t, 'hasted', { value: pm, duration: 1, source: caster, delay });
      if (pm < 0) this.statuses.apply(t, 'slowed', { value: -pm, duration: 1, source: caster, delay });
      return;
    }
    if (pa) t.currentPA = Math.max(0, t.currentPA + pa);
    if (pm) t.currentPM = Math.max(0, t.currentPM + pm);
    t.updateHUD?.();
    if (pa > 0 || pm > 0) this.events.emit('unit:resourceGained', { unit: t, source: caster, spell, pa: pa > 0 ? pa : undefined, pm: pm > 0 ? pm : undefined });
    if (pa < 0 || pm < 0) this.events.emit('unit:resourceLost', { unit: t, source: caster, spell, pa: pa < 0 ? -pa : undefined, pm: pm < 0 ? -pm : undefined });
  }
}

export { elementalMultiplier };
