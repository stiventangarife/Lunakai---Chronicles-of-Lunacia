// Spells.js — SpellManager: las reglas de las habilidades (SpellRules.js) con sus VFX y su presentación.
// Arena PvP, fase P0: el catálogo vive en data/SpellsDB.js y las reglas en SpellRules.js (sin three.js), para que el
// motor sin gráficos las use tal cual. Aquí solo queda lo que se ve y se oye. Los imports de siempre siguen valiendo.

import { VFXManager } from './VFXManager.js';
import { SpellPresentation } from './combat/SpellPresentation.js';
import { GolemSystem } from './combat/GolemSystem.js';
import { SpellRules } from './SpellRules.js';

export { SPELLS_DB, SPELL_USE_LIMITS } from './data/SpellsDB.js';

export class SpellManager extends SpellRules {
  constructor(gridManager, sceneManager, audio, combatText, game = null) {
    super(gridManager, {
      sceneManager,
      audio,
      combatText,
      game,
      golems: (sm) => new GolemSystem(sm), // gólems con modelo
      // VFX y presentación: se instalan en el bus de eventos antes que los sistemas de reglas (como siempre)
      installPresentation: (sm) => {
        sm.vfx = new VFXManager(sceneManager.scene, gridManager);
        sm.presentation = new SpellPresentation({
          sceneManager,
          gridManager,
          audio,
          combatText,
          vfx: sm.vfx,
        }).install(sm.events);
      },
    });
  }

  // Compatibilidad: estos métodos ahora viven en SpellPresentation.
  _spawnProjectile(fromPos, toPos, spell) { return this.presentation.spawnProjectile(fromPos, toPos, spell); }
  _spawnImpactVFX(worldPos, spell) { return this.presentation.spawnImpactVFX(worldPos, spell); }
  _playSpellSound(soundType) { return this.presentation.playSpellSound(soundType); }
}
