// EnemySpellEffects.js — Fase 5: los hechizos de los enemigos pasan al motor de efectos y usan estados.
//
// Se mantiene el mismo daño (baseMinDamage/baseMaxDamage) y los campos de interfaz; se añaden estados temáticos:
//   veneno (escupitajos), provocación (rugidos y bramidos), ralentización (escarcha, baba), sangrado (zarpazos y espinas),
//   quemadura (cataclismos), debilitar (nova del treant), Frágil (estallido de la dríade).
// Valores en línea con las cartas: veneno 8 por acumulación, sangrado 12, quemadura 20, Frágil 25 %, Débil 20 %.

const dmg = (s, extra = {}) => ({ type: 'damage', min: s.baseMinDamage, max: s.baseMaxDamage, ...extra });
const st = (status, duration, value, target) => ({ type: 'status', status, duration, ...(value != null ? { value } : {}), ...(target ? { target } : {}) });

/** id → (hechizo antiguo) → { effects, description } */
export const ENEMY_SPELL_EFFECTS = {
  // ---------------------------------------------------------------- veneno
  chimera_spit: (s) => ({ effects: [dmg(s), st('poison', 2, 8)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño a distancia. Veneno (8 por turno, 2 turnos).` }),
  slime_attack_spit: (s) => ({ effects: [dmg(s), st('poison', 2, 8)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño a distancia. Veneno (8 por turno, 2 turnos).` }),
  slime_forest_a_spit: (s) => ({ effects: [dmg(s), st('poison', 2, 8)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño a distancia. Veneno (8 por turno, 2 turnos).` }),

  // ---------------------------------------------------------------- provocación (el rugido obliga a golpear al que ruge)
  chimera_bellow: (s) => ({ effects: [dmg(s), { type: 'push', distance: s.pushDistance || 1 }, st('taunt', 2, null, 'self')], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño y empuje. Provocación al lanzador (2 turnos): hay que atacarle a él si está a tiro.` }),
  wolf_alpha_roar: (s) => ({ effects: [dmg(s), { type: 'push', distance: s.pushDistance || 1 }, st('taunt', 2, null, 'self')], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño y empuje. Provocación al lanzador (2 turnos).` }),
  wolf_aquatic_alpha_roar: (s) => ({ effects: [dmg(s), { type: 'push', distance: s.pushDistance || 1 }, st('taunt', 2, null, 'self')], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño y empuje. Provocación al lanzador (2 turnos).` }),
  werewolf_boss_roar: (s) => ({ effects: [dmg(s), { type: 'push', distance: s.pushDistance || 2 }, st('taunt', 2, null, 'self')], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño y empuje de ${s.pushDistance || 2}. Provocación al lanzador (2 turnos).` }),

  // ---------------------------------------------------------------- ralentización
  chimera_frost_nova: (s) => ({ effects: [dmg(s), st('slowed', 1, 1)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño en cruz. −1 PM en su próximo turno.` }),
  slime_attack_goo: (s) => ({ effects: [dmg(s), st('slowed', 1, 1)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño. Baba pegajosa: −1 PM en su próximo turno.` }),

  // ---------------------------------------------------------------- sangrado
  slime_forest_a_thorn: (s) => ({ effects: [dmg(s), st('bleed', 1, 12)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño. Sangrado (12, 1 turno).` }),
  werewolf_boss_bite: (s) => ({ effects: [dmg(s), st('bleed', 2, 12)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño. Sangrado (12 por turno, 2 turnos).` }),
  dryad_fighter_slash: (s) => ({ effects: [dmg(s), st('bleed', 1, 12)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño. Sangrado (12, 1 turno).` }),

  // ---------------------------------------------------------------- quemadura (áreas grandes)
  kibo_cataclysm: (s) => ({ effects: [dmg(s), st('burn', 1, 20)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño en cruz. Quemadura (20, 1 turno).` }),
  werewolf_boss_cataclysm: (s) => ({ effects: [dmg(s), st('burn', 1, 20)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño en cruz. Quemadura (20, 1 turno).` }),

  // ---------------------------------------------------------------- debilitar / Frágil
  treant_flower_nova: (s) => ({ effects: [dmg(s), st('weak', 2, 20)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño en cruz. Débil: −20 % de daño (2 turnos).` }),
  dryad_mage_burst: (s) => ({ effects: [dmg(s), st('fragile', 1, 25)], description: `${s.baseMinDamage}–${s.baseMaxDamage} de daño en cruz. Frágil: +25 % de daño recibido (1 turno).` }),

  // ---------------------------------------------------------------- apoyo
  slime_barrier: (s) => ({ effects: [{ type: 'shield', amount: s.shieldAmount || 30 }, st('guarded', 1, 20)], description: `+${s.shieldAmount || 30} de escudo y −20 % de daño recibido (1 turno) a sí mismo o a un aliado.` }),
  chimera_heal: (s) => ({ effects: [{ type: 'heal', min: s.baseMinHeal, max: s.baseMaxHeal }, { type: 'cleanse', count: 1 }], description: `Cura ${s.baseMinHeal}–${s.baseMaxHeal} HP a un aliado y le quita un perjuicio.` }),
  dryad_mage_heal: (s) => ({ effects: [{ type: 'heal', min: s.baseMinHeal, max: s.baseMaxHeal }, { type: 'cleanse', count: 1 }], description: `Cura ${s.baseMinHeal}–${s.baseMaxHeal} HP a un aliado y le quita un perjuicio.` }),
};

/** Aplica los efectos a SPELLS_DB (conserva los campos de interfaz del hechizo antiguo). */
export function applyEnemySpellEffects(db) {
  for (const [id, make] of Object.entries(ENEMY_SPELL_EFFECTS)) {
    const s = db[id];
    if (!s || Array.isArray(s.effects)) continue;
    Object.assign(s, make(s), { enemyStatusSpell: true });
  }
  return db;
}
