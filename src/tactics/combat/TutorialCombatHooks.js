// TutorialCombatHooks.js — Ajustes de daño del combate guiado (tutorial).
//
// Antes estaban incrustados en SpellManager.castSpell. Ahora se registran como ganchos:
//   critAllowed(ctx, target)               → false para prohibir el crítico
//   adjustDamage(ctx, target, dmg, isCrit) → devuelve el daño final

export function registerTutorialHooks(spellManager) {
  const tutorial = () => {
    const tm = spellManager.game && spellManager.game.tutorialManager;
    return tm && tm.isActive ? tm : null;
  };

  // En el tutorial no hay críticos: evitan matar por accidente a los enemigos de prueba.
  spellManager.hooks.critAllowed.push(() => !tutorial());

  spellManager.hooks.adjustDamage.push((ctx, target, dmg) => {
    const tm = tutorial();
    if (!tm) return dmg;
    const step = tm.getCurrentStepId();

    // step_attack_1: el Sapidae derrota a la quimera exploradora
    if (target.id === 'quimera_scout' && step === 'step_attack_1') {
      dmg = Math.max(dmg, target.currentHP);
    }
    // step_attack_2: el Axie deja a la quimera guardiana lista para el flujo de batalla
    if (target.id === 'quimera_guard' && step === 'step_attack_2') {
      dmg = Math.min(Math.max(dmg, 45), Math.max(1, target.currentHP - 15));
    }
    // La guardiana no puede morir antes de step_battle_flow
    if (target.id === 'quimera_guard' && step !== 'step_battle_flow') {
      dmg = Math.min(dmg, Math.max(1, target.currentHP - 15));
    }
    return dmg;
  });
}
