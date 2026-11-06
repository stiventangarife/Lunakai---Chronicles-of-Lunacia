// Elements.js — Triángulo elemental canónico de Axie Infinity (+15 % de daño).
//
//   Beast / Bug / Mech  ──►  Plant / Reptile / Dusk  ──►  Aquatic / Bird / Dawn  ──►  Beast / Bug / Mech
//
// Las tríadas también deciden la Ultimate del Axie principal (Asalto, Bastión, Torrente).

export const ELEMENT_BONUS = 0.15;

const GROUP = {
  beast: 'assault', bug: 'assault', mech: 'assault',
  plant: 'bastion', reptile: 'bastion', dusk: 'bastion',
  aquatic: 'torrent', aqua: 'torrent', bird: 'torrent', dawn: 'torrent',
};
const BEATS = { assault: 'bastion', bastion: 'torrent', torrent: 'assault' };

/** Tríada de una clase: 'assault' | 'bastion' | 'torrent' | null. */
export function triadOf(axieClass) {
  return GROUP[String(axieClass || '').toLowerCase()] || null;
}

/** Multiplicador de daño del atacante contra el defensor: 1.15, 0.85 o 1. */
export function elementalMultiplier(attackerClass, defenderClass) {
  const a = triadOf(attackerClass);
  const d = triadOf(defenderClass);
  if (!a || !d || a === d) return 1;
  if (BEATS[a] === d) return 1 + ELEMENT_BONUS;
  if (BEATS[d] === a) return 1 - ELEMENT_BONUS;
  return 1;
}
