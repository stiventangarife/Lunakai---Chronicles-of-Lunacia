// Forecast.js — Pronóstico de un hechizo sobre una casilla, SIN efectos secundarios (no tira dados ni toca unidades).
//
// Usa exactamente las reglas del combate: tirada mínima/máxima, nivel de la habilidad, bonus plano del lanzador,
// bonus condicionales de la carta, triángulo elemental, estados (Frágil, Débil, Potenciado, Protegido, Cobertura…),
// barrera y escudo. El crítico (x1,5) se muestra aparte como «máximo con crítico».
//
// forecast(sm, caster, spell, cell) → {
//   critChance, targets: [{ unit, damage: {min, max, critMax, hits, elemental, lethal, shieldMin, shieldMax},
//                           heal, shield, statuses: [{id, label, icon, kind, value, duration}], notes: [] }]
// }

import { STATUS_DEFS } from './StatusSystem.js';
import { elementalMultiplier } from './Elements.js';

const dist = (a, b) => Math.abs(a.gridX - b.gridX) + Math.abs(a.gridZ - b.gridZ);

function targetsFor(sm, ctx, effect) {
  return sm.effects.resolveTargets(ctx, effect);
}

/** Daño de un golpe tras los modificadores (sin crítico ni aleatoriedad). */
function hitDamage(sm, ctx, target, base, e) {
  const { caster, spell } = ctx;
  const d = dist(caster, target);
  let dmg = Math.floor(base * sm._getSpellMultiplier(caster, spell));
  dmg += sm._flatDamageBonus(caster, spell, d);
  const alive = (sm.game?.units || []).filter((u) => !u.isDead);
  for (const b of e.bonus || []) {
    if (!sm.effects.check(b.if, ctx, target)) continue;
    if (b.perAllyAlive) { dmg += b.perAllyAlive * alive.filter((u) => u.team === caster.team && u !== caster).length; continue; }
    if (b.perAllyOfClass) { dmg += (b.add || 0) * alive.filter((u) => u.team === caster.team && u !== caster && String(u.axieClass || '').toLowerCase() === b.perAllyOfClass).length; continue; }
    if (b.perAllyShielded) { const n = alive.filter((u) => u.team === caster.team && u !== caster && u.shield > 0).length; dmg += Math.min(b.cap ?? Infinity, b.perAllyShielded * n); continue; }
    if (b.perTargetStatus) { const st = sm.statuses.get(target, b.perTargetStatus); dmg += (b.add || 0) * (st ? Math.floor(st.value / (b.per || 1)) : 0); continue; }
    if (b.casterShieldPct) { dmg += Math.round((caster.shield || 0) * b.casterShieldPct); continue; }
    if (b.add) dmg += b.add;
    if (b.mult) dmg = Math.round(dmg * b.mult);
  }
  return sm._applyDamageModifiers(caster, target, dmg, d, ctx);
}

/** Multiplicador del crítico (×1,5 + daño crítico de runas y charms). */
const critMult = (sm, caster, target, e = null) => (sm.runeCharms ? sm.runeCharms.critMultiplier(caster, target, e) : 1.5);

/** Cuánto del daño total se lo comen la barrera y el escudo, y cuánto llega a la vida. */
function absorb(sm, target, total, pierce = 0, broken = 0) {
  let dmg = total;
  const barrier = sm.statuses.get(target, 'barrier');
  if (barrier) dmg = Math.max(0, dmg - barrier.value);
  const shield = Math.max(0, (target.shield || 0) - broken);
  const pierced = pierce > 0 ? Math.round(dmg * Math.min(1, pierce)) : 0;
  const blockable = dmg - pierced;
  const toShield = Math.min(shield, blockable);
  return { toHP: dmg - toShield, toShield, barrier: barrier ? Math.min(total, barrier.value) : 0 };
}

export function forecast(sm, caster, spell, cell) {
  if (!sm || !caster || !spell || !cell) return null;
  if (sm.runeCharms) spell = sm.runeCharms.spellFor(caster, spell); // carta con los charms de la unidad
  const ctx = { caster, spell, targetCell: cell, spent: spell.paCost === 'X' ? (caster.currentPA || 1) : spell.paCost };
  ctx.affectedCells = sm.getAoECells(cell, spell, caster);
  const critChance = Math.max(0, Math.min(1, ((caster.critRate > 0 ? caster.critRate : 20) + sm.statuses.mod(caster, 'critPct')) / 100));
  const rows = new Map();
  const row = (u) => {
    if (!rows.has(u)) rows.set(u, { unit: u, damage: null, heal: 0, shield: 0, statuses: [], notes: [] });
    return rows.get(u);
  };

  // Hechizos antiguos (sin `effects`): rango base + bonus plano + modificadores
  if (!Array.isArray(spell.effects)) {
    const tile = sm.gridManager.getTile(cell.x, cell.z);
    const u = tile?.unit;
    if (u && !u.isDead && spell.baseMinDamage) {
      const e = {};
      const lo = hitDamage(sm, ctx, u, spell.baseMinDamage, e);
      const hi = hitDamage(sm, ctx, u, spell.baseMaxDamage ?? spell.baseMinDamage, e);
      const a = absorb(sm, u, lo.amount), b = absorb(sm, u, hi.amount);
      const ev = sm.runeCharms ? sm.runeCharms.evasionChance(caster, u, dist(caster, u)) : 0;
      if (ev > 0) row(u).notes.push(`Puede esquivar (${Math.round(ev * 100)} %)`);
      row(u).damage = { min: lo.amount, max: hi.amount, critMax: Math.round(hi.amount * critMult(sm, caster, u)), hits: 1, elemental: lo.elemental, lethal: a.toHP >= u.currentHP, mayKill: b.toHP >= u.currentHP, shieldMin: a.toShield, shieldMax: b.toShield };
    } else if (u && spell.baseMinHeal) {
      row(u).heal = spell.baseMinHeal;
    }
    return { critChance, targets: [...rows.values()] };
  }

  for (const e of spell.effects) {
    const targets = targetsFor(sm, ctx, e);
    for (const t of targets) {
      if (t.isDead) continue;
      if (e.type !== 'damage' && e.if && !sm.effects.check(e.if, ctx, t)) continue;
      const r = row(t);
      switch (e.type) {
        case 'damage': {
          if (e.if && !sm.effects.check(e.if, ctx, t)) { r.notes.push('Condición no cumplida: sin daño extra'); break; }
          const hits = e.hits === 'spent' ? Math.max(1, ctx.spent || 1) : Math.max(1, e.hits || 1);
          const lo = hitDamage(sm, ctx, t, e.min ?? e.amount ?? 0, e);
          const hi = hitDamage(sm, ctx, t, e.max ?? e.amount ?? 0, e);
          const prev = r.damage || { min: 0, max: 0, critMax: 0, hits: 0, elemental: lo.elemental };
          r.damage = { ...prev, min: prev.min + lo.amount * hits, max: prev.max + hi.amount * hits, critMax: prev.critMax + Math.round(hi.amount * critMult(sm, caster, t, e)) * hits, hits: prev.hits + hits, elemental: lo.elemental, pierce: Math.max(e.pierceShield || 0, prev.pierce || 0, sm.runeCharms ? sm.runeCharms.pierce(caster, dist(caster, t)) : 0) };
          const ev = sm.runeCharms ? sm.runeCharms.evasionChance(caster, t, dist(caster, t)) : 0;
          if (ev > 0 && !r.notes.some((n) => n.startsWith('Puede esquivar'))) r.notes.push(`Puede esquivar (${Math.round(ev * 100)} %)`);
          break;
        }
        case 'heal': {
          if (sm.statuses.has(t, 'healBlock')) { r.notes.push('Herida: no puede curarse'); break; }
          let amt = Math.round((e.amount ?? e.min ?? 0) * sm._getSpellMultiplier(caster, spell));
          if (caster.supportPower) amt = Math.round(amt * (1 + caster.supportPower / 100));
          amt = Math.round(amt * (1 + sm.statuses.mod(t, 'healTakenPct') / 100));
          r.heal += Math.min(amt, Math.max(0, t.maxHP - t.currentHP));
          break;
        }
        case 'shield':
          r.shield += Math.round((e.amount || 0) * sm._getSpellMultiplier(caster, spell));
          break;
        case 'status': {
          const def = STATUS_DEFS[e.status];
          if (def) r.statuses.push({ id: e.status, label: def.label, icon: def.icon, kind: def.kind, value: e.value ?? def.defaultValue, duration: e.duration ?? 1 });
          break;
        }
        case 'shieldBreak':
          if (t.shield > 0 && Math.max(0, t.shield - (r.shieldBroken || 0) - (r.damage ? r.damage.min : 0)) > 0) {
            const left = Math.max(0, t.shield - (r.shieldBroken || 0) - (r.damage ? r.damage.min : 0)); // el daño previo de la carta ya gasta escudo
            const broken = Math.min(left, e.amount != null ? e.amount : Math.round(left * (e.percent || 0)));
            r.shieldBroken = (r.shieldBroken || 0) + broken;
            r.notes.push(`Rompe ${broken} de escudo`);
          }
          break;
        case 'push': r.notes.push(`Empuje ${e.distance} casillas`); break;
        case 'cleanse': r.notes.push('Quita perjuicios'); break;
        case 'dispel': r.notes.push('Quita beneficios'); break;
        case 'drain': r.notes.push(`Te curas el ${Math.round((e.percent || 0) * 100)} % del daño`); break;
        default: break;
      }
    }
  }

  // Escudo, barrera y letalidad del daño acumulado
  for (const r of rows.values()) {
    const d = r.damage;
    if (!d) continue;
    const u = r.unit;
    const a = absorb(sm, u, d.min, d.pierce, r.shieldBroken), b = absorb(sm, u, d.max, d.pierce, r.shieldBroken);
    d.shieldMin = a.toShield; d.shieldMax = b.toShield; d.barrier = b.barrier;
    d.lethal = a.toHP >= u.currentHP;
    d.mayKill = !d.lethal && absorb(sm, u, d.critMax, d.pierce, r.shieldBroken).toHP >= u.currentHP;
    d.shieldBroken = r.shieldBroken || 0;
    if (sm.statuses.get(caster, 'jinx')) d.critMax = d.max;
  }
  return { critChance: sm.statuses.get(caster, 'jinx') ? 0 : critChance, targets: [...rows.values()] };
}

/** Texto corto de la ventaja elemental para la interfaz. */
export function elementalLabel(mult) {
  if (mult > 1.001) return { text: `Ventaja de clase +${Math.round((mult - 1) * 100)} %`, kind: 'good' };
  if (mult < 0.999) return { text: `Desventaja de clase −${Math.round((1 - mult) * 100)} %`, kind: 'bad' };
  return null;
}

export { elementalMultiplier };
