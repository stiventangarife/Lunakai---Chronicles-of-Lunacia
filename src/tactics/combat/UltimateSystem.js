// UltimateSystem.js — Duo Ultimates (Vínculo Supremo): una por tríada, elegida por la clase del Axie principal.
//
// Reglas (decididas en el plan):
//   · El vínculo con el Axie principal debe estar al 100 % AL ENTRAR al combate (BondService). En combate no cambia.
//   · La lanza el Sapidae, cuesta 6 PA (todo su turno base), desde la ronda 2, un solo uso por combate,
//     y exige que el Sapidae y el Axie principal sigan vivos.
//   · No se puede usar en el tutorial guiado.
//
// Tríadas (mismas que el triángulo elemental, combat/Elements.js):
//   Asalto  (Beast / Bug / Mech)        → Embestida Destructiva
//   Bastión (Plant / Reptile / Dusk)    → Égida de Gaia
//   Torrente(Aquatic / Bird / Dawn)     → Maelstrom Celeste
//
// Eventos: ultimate:ready (setup), ultimate:used.

import { triadOf } from './Elements.js';

export const ULTIMATE_PA_COST = 6;
export const ULTIMATE_MIN_ROUND = 2;

export const ULTIMATES = {
  duo_destructiva: {
    id: 'duo_destructiva', name: 'Embestida Destructiva', triad: 'assault', isUltimate: true,
    icon: '⚔️', // sin arte propio todavía
    paCost: ULTIMATE_PA_COST, minRange: 1, maxRange: 4, requiresLoS: true, isLinear: true,
    targetType: 'enemy', areaType: 'single', sound: 'push', fixedRange: true,
    baseMinDamage: 150, baseMaxDamage: 170, pushDistance: 3,
    effects: [
      { type: 'damage', min: 150, max: 170 },
      { type: 'push', distance: 3, collisionDamage: 60 },
    ],
    description: 'Sapidae y Axie cargan juntos en línea recta: 150-170 de daño y empujan 3 casillas. Si choca contra un obstáculo o una unidad, 60 de daño de impacto a los dos.'
  },
  duo_gaia: {
    id: 'duo_gaia', name: 'Égida de Gaia', triad: 'bastion', isUltimate: true,
    icon: '🌳',
    paCost: ULTIMATE_PA_COST, minRange: 0, maxRange: 0, requiresLoS: false, isLinear: false,
    targetType: 'self', areaType: 'circle3', sound: 'heal',
    baseMinHeal: 60, baseMaxHeal: 60, shieldAmount: 80,
    effects: [
      { type: 'cleanse', target: 'alliesInArea' },
      { type: 'shield', amount: 80, target: 'alliesInArea' },
      { type: 'heal', amount: 60, target: 'alliesInArea' },
    ],
    description: 'Un árbol rúnico protege al escuadrón: todos los aliados a 3 casillas o menos ganan +80 de escudo, se curan 60 HP y pierden sus estados negativos.'
  },
  duo_maelstrom: {
    id: 'duo_maelstrom', name: 'Maelstrom Celeste', triad: 'torrent', isUltimate: true,
    icon: '🌀',
    paCost: ULTIMATE_PA_COST, minRange: 1, maxRange: 5, requiresLoS: true, isLinear: false,
    targetType: 'any', areaType: 'cross2', sound: 'buff', fixedRange: true,
    baseMinDamage: 100, baseMaxDamage: 120,
    effects: [
      { type: 'damage', min: 100, max: 120, target: 'enemiesInArea' },
      { type: 'resource', pm: -2, when: 'nextTurn', target: 'enemiesInArea' },
      { type: 'resource', pa: -1, when: 'turnAfterNext', target: 'enemiesInArea' },
    ],
    description: 'Tormenta de maná en cruz de 2 casillas: 100-120 de daño a los enemigos, −2 PM en su próximo turno y −1 PA en el siguiente.'
  },
};

const BY_TRIAD = { assault: 'duo_destructiva', bastion: 'duo_gaia', torrent: 'duo_maelstrom' };

/** Ultimate que corresponde a una clase de Axie (o null si la clase no se conoce). */
export function ultimateForClass(axieClass) {
  const t = triadOf(axieClass);
  return t ? ULTIMATES[BY_TRIAD[t]] : null;
}

const REASONS = {
  ok: 'Lista',
  none: 'Sin Ultimate',
  tutorial: 'No disponible en el tutorial',
  not_sapidae: 'La lanza el Sapidae',
  bond: 'Vínculo insuficiente',
  round: 'Disponible desde la ronda 2',
  used: 'Ya usada en este combate',
  axie_down: 'Tu Axie principal ha caído',
  pa: 'Necesita 6 PA',
  not_turn: 'No es tu turno',
};

export class UltimateSystem {
  constructor(spellManager) {
    this.sm = spellManager;
    this.reset();
    // Se marca como usada al lanzarse (sea desde el botón, la consola o cualquier otro camino)
    this.sm.events.on('spell:cast', ({ caster, spell }) => {
      if (!spell?.isUltimate || this.used) return;
      this.used = true;
      this.usedRound = this.round();
      this.sm.events.emit('ultimate:used', { caster, spell, axie: this.axie });
    });
  }

  reset() {
    this.spell = null;
    this.sapidae = null;
    this.axie = null;
    this.bond = 0;
    this.used = false;
    this.usedRound = null;
    this.isTutorial = false;
  }

  /**
   * Prepara el combate. units: unidades del combate; mainHeroId: id del Axie principal (squad[1]);
   * bond: vínculo con él al entrar (0–100).
   */
  setupCombat({ units = [], mainHeroId = null, bond = 0, isTutorial = false } = {}) {
    this.reset();
    this.isTutorial = Boolean(isTutorial);
    this.sapidae = units.find((u) => u.team === 'player' && u.type === 'sapidae') || null;
    this.axie = (mainHeroId && units.find((u) => u.id === mainHeroId && u.team === 'player'))
      || units.find((u) => u.team === 'player' && u.type !== 'sapidae') || null;
    this.bond = Math.max(0, Math.min(100, Math.round((bond || 0) * 10) / 10)); // décimas: 99,5 % no llega al 100 %
    this.spell = this.axie ? ultimateForClass(this.axie.axieClass) : null;
    this.sm.events.emit('ultimate:ready', { spell: this.spell, bond: this.bond, sapidae: this.sapidae, axie: this.axie });
    return this.spell;
  }

  round() { return this.sm.turnManager?.round || this.sm.field?.round || 1; }

  /**
   * ¿Puede lanzarla `caster` ahora? Devuelve { ok, reason, label }.
   * El orden de las comprobaciones decide qué motivo se muestra en el botón.
   */
  check(caster = this.sm._activeUnit?.()) {
    const r = (reason) => ({ ok: reason === 'ok', reason, label: REASONS[reason] });
    if (!this.spell) return r('none');
    if (this.isTutorial) return r('tutorial');
    if (this.used) return r('used');
    if (this.bond < 100) return r('bond');
    if (!this.axie || this.axie.isDead) return r('axie_down');
    if (!caster || caster !== this.sapidae) return r('not_sapidae');
    const active = this.sm._activeUnit?.();
    if (active && active !== caster) return r('not_turn');
    if (this.round() < ULTIMATE_MIN_ROUND) return r('round');
    if ((caster.currentPA || 0) < this.spell.paCost) return r('pa');
    return r('ok');
  }

  canCast(caster) { return this.check(caster).ok; }
}
