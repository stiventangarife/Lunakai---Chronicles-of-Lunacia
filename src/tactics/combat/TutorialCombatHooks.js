// TutorialCombatHooks.js — Ajustes de daño del combate guiado (tutorial).
//
// Antes estaban incrustados en SpellManager.castSpell. Ahora se registran como ganchos:
//   critAllowed(ctx, target)               → false para prohibir el crítico
//   adjustDamage(ctx, target, dmg, isCrit) → devuelve el daño final
//
// Guion del combate 1 (Sapidae → Slime → Axie → Slime Guardián):
//   · el golpe del Sapidae nunca mata al Slime (le deja vida de sobra, también contra el choque de un empuje);
//   · los mordiscos al Sapidae hacen un daño fijo (35 el Slime, 30 el Guardián): se ve el golpe y nadie cae;
//   · el ataque del Axie remata al Slime, sea cual sea su carta;
//   · el Guardián no cae antes de la ronda libre (step_battle_flow).

const SCOUT = 'quimera_scout';
const GUARD = 'quimera_guard';
const SAPIDAE = 'sapidae_hero';
const ENEMY_HIT = { [SCOUT]: 35, [GUARD]: 30 };

export function registerTutorialHooks(spellManager) {
  const tutorial = () => {
    const tm = spellManager.game && spellManager.game.tutorialManager;
    return tm && tm.isActive && !tm.dynamic ? tm : null;
  };

  // En el tutorial no hay críticos: evitan matar por accidente a los enemigos de prueba.
  spellManager.hooks.critAllowed.push(() => {
    const tm = spellManager.game && spellManager.game.tutorialManager;
    return !(tm && tm.isActive);
  });

  spellManager.hooks.adjustDamage.push((ctx, target, dmg) => {
    const tm = tutorial();
    if (!tm || !target) return dmg;
    const step = tm.getCurrentStepId();
    const free = step === 'step_battle_flow';

    // Mordiscos de las quimeras al Sapidae: daño fijo
    const caster = ctx && ctx.caster;
    if (!free && caster && caster.team === 'enemy' && target.id === SAPIDAE && ENEMY_HIT[caster.id]) {
      return Math.min(ENEMY_HIT[caster.id], Math.max(1, target.currentHP - 1));
    }
    if (target.id === SCOUT && !free) {
      // El Axie remata al Slime; antes de eso, nada lo mata (margen de 35 para el choque de un empuje)
      if (step === 'step_attack_2') return Math.max(dmg, target.currentHP);
      return Math.min(dmg, Math.max(1, target.currentHP - 35));
    }
    // El Guardián no puede caer antes de la ronda libre
    if (target.id === GUARD && !free) {
      return Math.min(dmg, Math.max(1, target.currentHP - 15));
    }
    return dmg;
  });
}
