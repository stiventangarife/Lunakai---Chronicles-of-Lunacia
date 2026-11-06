// bot.mjs — Jugador automático sencillo para las pruebas de la Arena PvP (fases P5–P6): map-fairness.mjs y balance.mjs.
// No es la IA del juego (TacticalAI): solo sirve para comparar mapas, bandos y equipos con el motor sin gráficos.
// Cada turno: ataca al rival con la carta que más daño hace; cura a un aliado herido si puede; a veces usa una carta
// sin daño (gólems, zonas); si no llega a nadie, se acerca; y termina el turno.

export const dmgOf = (sp) => {
  if (!sp) return 0;
  const e = (sp.effects || []).filter((x) => x.type === 'damage').reduce((t, x) => t + ((x.min || 0) + (x.max || 0)) / 2, 0);
  return e || ((sp.baseMinDamage || 0) + (sp.baseMaxDamage || 0)) / 2;
};

/**
 * Juega el turno entero de la unidad activa de `e` (HeadlessCombat). `pick` = azar propio (mulberry32), no el de las
 * reglas. `onCast(spellId, unit)` opcional: para contar qué cartas se usan.
 */
export async function botTurn(e, pick, onCast = null) {
  for (let step = 0; step < 12 && !e.over; step++) {
    const u = e.activeUnit;
    const side = e.turnSide;
    const legal = e.legalOrders();
    let best = null, bestScore = 0;
    for (const o of legal) {
      if (o.t !== 'cast') continue;
      const t = e.grid.getTile(o.x, o.z)?.unit;
      const sp = e.sm.getSpell(o.spell, u);
      let s = 0;
      if (t && !t.isDead && t.team !== u.team) s = dmgOf(sp) + 5 + pick() * 4;
      else if (t && t.team === u.team && !t.isGolem && t.currentHP < t.maxHP * 0.6 && sp && !dmgOf(sp)) s = 20 + pick() * 4;
      else if (!t && sp && !dmgOf(sp) && pick() < 0.08) s = 6; // de vez en cuando, gólems y zonas
      if (s > bestScore) { bestScore = s; best = o; }
    }
    if (best) { onCast?.(best.spell, u); await e.apply(best); if (e.turnSide !== side) return; continue; }
    const moves = legal.filter((o) => o.t === 'move');
    if (moves.length && u.currentPM > 0) {
      const foes = e.units.filter((x) => !x.isDead && x.team !== u.team && !x.isGolem);
      const range = Math.max(1, ...u.spellIds.map((id) => e.sm.getSpell(id, u)).filter((sp) => dmgOf(sp)).map((sp) => sp.maxRange || 1));
      const want = (o) => Math.min(...foes.map((f) => Math.abs(f.gridX - o.x) + Math.abs(f.gridZ - o.z)));
      const here = Math.min(...foes.map((f) => Math.abs(f.gridX - u.gridX) + Math.abs(f.gridZ - u.gridZ)));
      if (here > range) {
        const m = moves.reduce((a, b) => (want(b) + pick() * 0.5 < want(a) ? b : a));
        if (want(m) < here) { await e.apply(m); if (e.turnSide !== side) return; continue; }
      }
    }
    break;
  }
  if (!e.over) await e.apply({ t: 'end', unit: e.activeUnit.id });
}

