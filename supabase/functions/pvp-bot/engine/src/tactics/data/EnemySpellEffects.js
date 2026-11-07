// EnemySpellEffects.js — Fase 5: los hechizos de los enemigos pasan al motor de efectos y usan estados.
//
// Se mantiene el mismo daño (baseMinDamage/baseMaxDamage) y los campos de interfaz; se añaden estados temáticos:
//   veneno (escupitajos), provocación (rugidos y bramidos), ralentización (escarcha, baba), sangrado (zarpazos y espinas),
//   quemadura (cataclismos), debilitar (nova del treant), Frágil (estallido de la dríade).
// Valores en línea con las cartas: veneno 8 por acumulación, sangrado 12, quemadura 20, Frágil 25 %, Débil 20 %.

import * as i18n from '../../i18n/i18n.js';

const dmg = (s, extra = {}) => ({ type: 'damage', min: s.baseMinDamage, max: s.baseMaxDamage, ...extra });
const st = (status, duration, value, target) => ({ type: 'status', status, duration, ...(value != null ? { value } : {}), ...(target ? { target } : {}) });

/** id → (hechizo antiguo) → { effects, description } */
export const ENEMY_SPELL_EFFECTS = {
  // ---------------------------------------------------------------- veneno
  chimera_spit: (s) => ({ effects: [dmg(s), st('poison', 2, 8)], description: i18n.t('enemySpells.d1', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  slime_attack_spit: (s) => ({ effects: [dmg(s), st('poison', 2, 8)], description: i18n.t('enemySpells.d1', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  slime_forest_a_spit: (s) => ({ effects: [dmg(s), st('poison', 2, 8)], description: i18n.t('enemySpells.d1', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),

  // ---------------------------------------------------------------- provocación (el rugido obliga a golpear al que ruge)
  chimera_bellow: (s) => ({ effects: [dmg(s), { type: 'push', distance: s.pushDistance || 1 }, st('taunt', 2, null, 'self')], description: i18n.t('enemySpells.d2', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  wolf_alpha_roar: (s) => ({ effects: [dmg(s), { type: 'push', distance: s.pushDistance || 1 }, st('taunt', 2, null, 'self')], description: i18n.t('enemySpells.d3', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  wolf_aquatic_alpha_roar: (s) => ({ effects: [dmg(s), { type: 'push', distance: s.pushDistance || 1 }, st('taunt', 2, null, 'self')], description: i18n.t('enemySpells.d3', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  werewolf_boss_roar: (s) => ({ effects: [dmg(s), { type: 'push', distance: s.pushDistance || 2 }, st('taunt', 2, null, 'self')], description: i18n.t('enemySpells.d4', { min: s.baseMinDamage, max: s.baseMaxDamage, push: s.pushDistance || 2 }) }),

  // ---------------------------------------------------------------- ralentización
  chimera_frost_nova: (s) => ({ effects: [dmg(s), st('slowed', 1, 1)], description: i18n.t('enemySpells.d5', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  slime_attack_goo: (s) => ({ effects: [dmg(s), st('slowed', 1, 1)], description: i18n.t('enemySpells.d6', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),

  // ---------------------------------------------------------------- sangrado
  slime_forest_a_thorn: (s) => ({ effects: [dmg(s), st('bleed', 1, 12)], description: i18n.t('enemySpells.d7', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  werewolf_boss_bite: (s) => ({ effects: [dmg(s), st('bleed', 2, 12)], description: i18n.t('enemySpells.d8', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  dryad_fighter_slash: (s) => ({ effects: [dmg(s), st('bleed', 1, 12)], description: i18n.t('enemySpells.d7', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),

  // ---------------------------------------------------------------- quemadura (áreas grandes)
  kibo_cataclysm: (s) => ({ effects: [dmg(s), st('burn', 1, 20)], description: i18n.t('enemySpells.d9', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  werewolf_boss_cataclysm: (s) => ({ effects: [dmg(s), st('burn', 1, 20)], description: i18n.t('enemySpells.d9', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),

  // ---------------------------------------------------------------- debilitar / Frágil
  treant_flower_nova: (s) => ({ effects: [dmg(s), st('weak', 2, 20)], description: i18n.t('enemySpells.d10', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),
  dryad_mage_burst: (s) => ({ effects: [dmg(s), st('fragile', 1, 25)], description: i18n.t('enemySpells.d11', { min: s.baseMinDamage, max: s.baseMaxDamage }) }),

  // ---------------------------------------------------------------- apoyo
  slime_barrier: (s) => ({ effects: [{ type: 'shield', amount: s.shieldAmount || 30 }, st('guarded', 1, 20)], description: i18n.t('enemySpells.d12', { shield: s.shieldAmount || 30 }) }),
  chimera_heal: (s) => ({ effects: [{ type: 'heal', min: s.baseMinHeal, max: s.baseMaxHeal }, { type: 'cleanse', count: 1 }], description: i18n.t('enemySpells.d13', { min: s.baseMinHeal, max: s.baseMaxHeal }) }),
  dryad_mage_heal: (s) => ({ effects: [{ type: 'heal', min: s.baseMinHeal, max: s.baseMaxHeal }, { type: 'cleanse', count: 1 }], description: i18n.t('enemySpells.d13', { min: s.baseMinHeal, max: s.baseMaxHeal }) }),
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
