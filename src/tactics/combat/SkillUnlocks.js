// SkillUnlocks.js — Habilidades que se desbloquean al subir de nivel (Hito 98).
//
// · Axies: por TIPO DE PARTE, no por posición (el tutorial reordena las cartas y las variantes, colecciones y cartas
//   iniciales de Bing y Pomodoro guardan su parte): ojos, orejas y boca a nivel 1; cuernos a 3; espalda a 7; cola a 10.
// · Sapidae: por la posición en las 6 habilidades de su clase (ataque, gólem y la 3.ª a nivel 1; 4.ª a 3; 5.ª a 7;
//   6.ª a 10).
// · Solo para los héroes del jugador (unidades con `heroLevel` en su config). Enemigos, gólems y la Definitiva no
//   cambian. Cartas sin parte conocida (hechizos antiguos de los héroes): por posición, como el Sapidae.

/** Nivel del héroe con el que se desbloquea cada parte (las que no aparecen, nivel 1). */
export const PART_UNLOCK_LEVEL = { horn: 3, back: 7, tail: 10 };
/** Nivel para cada una de las 6 ranuras (Sapidae y cartas sin parte). */
export const SLOT_UNLOCK_LEVEL = [1, 1, 1, 3, 7, 10];
/** Orden de las partes (el mismo que AxiePartsResolver.PART_ORDER). */
export const UNLOCK_PART_ORDER = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
/** Niveles en los que se desbloquea algo (para el aviso de «nueva habilidad»). */
export const UNLOCK_LEVELS = [...new Set(SLOT_UNLOCK_LEVEL.filter((l) => l > 1))];

/**
 * Nivel necesario para usar la carta.
 * @param {object} spell  carta (SPELLS_DB)
 * @param {{ isSapidae?: boolean, slot?: number }} where  isSapidae: habilidad de clase; slot: posición 0–5 en sus cartas
 */
export function unlockLevelOf(spell, { isSapidae = false, slot = -1 } = {}) {
  if (!spell || spell.isUltimate) return 1;
  if (!isSapidae && spell.part && UNLOCK_PART_ORDER.includes(spell.part)) return PART_UNLOCK_LEVEL[spell.part] || 1;
  return slot >= 0 && slot < SLOT_UNLOCK_LEVEL.length ? SLOT_UNLOCK_LEVEL[slot] : 1;
}

/** Nivel necesario para una carta de una unidad de combate (1 si no es un héroe del jugador). */
export function unitUnlockLevel(unit, spell) {
  if (!unit || !spell || unit.team !== 'player' || unit.isGolem) return 1;
  const lvl = unit.config?.heroLevel;
  if (!Number.isFinite(lvl)) return 1;
  const isSapidae = Boolean(unit.isSapidae || unit.config?.isSapidae);
  return unlockLevelOf(spell, { isSapidae, slot: (unit.spellIds || []).indexOf(spell.id) });
}

/** ¿Está bloqueada la carta para esta unidad por su nivel? */
export function isLockedFor(unit, spell) {
  if (!unit || unit._unlockAll) return false;
  const lvl = unit.config?.heroLevel;
  if (!Number.isFinite(lvl)) return false;
  return lvl < unitUnlockLevel(unit, spell);
}

/**
 * Cartas que se desbloquean al pasar de `from` a `to` (para el fin de combate).
 * @param {string[]} spellIds  cartas del héroe en su orden natural (partes: ojos…cola; Sapidae: las de su clase)
 * @param {(id:string)=>object} getSpell
 */
export function newlyUnlocked(spellIds, getSpell, from, to, isSapidae = false) {
  const out = [];
  (spellIds || []).forEach((id, i) => {
    const sp = getSpell(id);
    if (!sp) return;
    const need = unlockLevelOf(sp, { isSapidae, slot: i });
    if (need > from && need <= to) out.push({ id, spell: sp, level: need });
  });
  return out;
}
