// RuneCharmEffects.js — Efecto en combate de las runas maestras y los charms (guía: «Matriz de runas y catálogo de charms»).
//
// Las runas y los charms se equipan fuera del combate (RuneCharmService, pestaña «Runas y charms» de la Mochila).
// Este módulo los traduce a reglas del motor, sin VFX: lo visible lo anuncian los eventos (`runeCharm:proc`, `unit:evaded`…).
//
// Cómo actúan:
//   · Estadísticas del Axie (vida, iniciativa, PM, crítico, escudo inicial, poder de apoyo): se aplican al crear las unidades
//     (setupCombat), antes de fijar el orden de turnos.
//   · Charms que cambian la carta de su parte (daño, escudo, curación, alcance, visión, coste, estados, empujes…): cada Axie
//     recibe una copia modificada de esa carta (`unit.rcSpells[id]`, mismo id). getSpell(id, unit) y castSpell la usan,
//     así que el HUD, el pronóstico y la IA ven los valores reales.
//   · El resto son ganchos del SpellManager: % de daño hecho y recibido, crítico, perforación, esquiva, reacciones al
//     recibir golpes, robo de vida, efectos al golpear o al matar, costes dinámicos, inicio y fin de turno y de ronda,
//     golpe letal y muerte.
//
// Reglas comunes: sin cargas ni contadores; los porcentajes se suman a los de los estados (Potenciado, Frágil…).
// «Cuerpo a cuerpo» = objetivo a 1 casilla; «a distancia» / «proyectil» = a 2 o más casillas.
// Solo los Axies del jugador llevan runas y charms; el tutorial no las aplica (su guion es fijo).

import { RUNE_BY_ID, CHARM_BY_ID, runeFits, charmFits, ppCanSet } from '../data/RunesCharms.js';
import { STATUS_DEFS } from './StatusSystem.js';

// ─────────────────────────────────────────────────────────────── Runas (63)
// Campos: hp · init · pm · crit · critDmg (% extra sobre el ×1,5) · startShield · support (% curas y escudos dados)
//   dmgPct · meleePct · rangedPct · lowHpTargetPct · shieldedTargetPct · stillTargetPct · dotTargetPct · cost2Pct
//   firstAttackRoundPct · secondAttackPct · teamDmgPct · takenPct · takenRangedPct · takenNonMagicPct
//   healTakenPct · shieldPct · shieldPctPlant · rangeRanged · evasionRanged · gatesEvasion · pierceRanged
//   critTakenHalf · counterMelee · thornsMelee · poisonOnHit · bleedMelee · slowOnHit · glareRanged · leechPct
//   leechActualPct · bloodlust · critTeamPm · splashRanged · flatWhileShield · roundPa · teamRoundPa · sacredFeather
//   shadyExchange · regenEnd · aromaEnd · calciumShield · gaiaShield · metamorphosis · puffer · miracle · lastWish
//   vengeful · pushReduce · redirect · energyGuru · fateMaker · collisionImmune · shieldOnCast
export const RUNE_FX = {
  // Bestia
  'beast-brutal-claw': { critDmg: 25, meleePct: 15 },
  'beast-counter-stance': { counterMelee: 35 },
  'beast-dominant-predator': { lowHpTargetPct: 15 },
  'beast-endless-anger': { roundPa: [1, 3] },
  'beast-glorious-mane': { hp: 40, init: 8 },
  'beast-inspirational-hero': { critTeamPm: 1 },
  'beast-pangolin-scale': { startShield: 60, takenRangedPct: -15 },
  'beast-reckless-hunter': { dmgPct: 20, takenPct: 10 },
  'beast-way-of-beast': { dmgPct: 10, crit: 10 },
  // Planta
  'plant-destiny-leaf': { hp: 50, healTakenPct: 20 },
  'plant-forest-aroma': { aromaEnd: 25 },
  'plant-gaias-embrace': { gaiaShield: 40 },
  'plant-healing-pulse': { support: 25 },
  'plant-jungle-nightmare': { slowOnHit: 1 },
  'plant-leaf-cloak': { takenRangedPct: -20 },
  'plant-miracle-leaf': { miracle: 90 },
  'plant-rise-ruin': { shieldedTargetPct: 20 },
  'plant-way-of-plant': { hp: 60, shieldPctPlant: 15 },
  // Acuático
  'aquatic-bloodlust': { bloodlust: true },
  'aquatic-blunt-teeth': { stillTargetPct: 15 },
  'aquatic-bombshell-maker': { splashRanged: 20 },
  'aquatic-calcium-armor': { calciumShield: 50 },
  'aquatic-giant-bubble': { startShield: 35, init: 10 },
  'aquatic-heart-of-ocean': { dmgPct: 18, pm: 1 },
  'aquatic-hearty-warrior': { hp: 45, cost2Pct: 12 },
  'aquatic-puffers-plight': { puffer: 100 },
  'aquatic-way-of-aquatic': { init: 15, rangedPct: 10 },
  // Pájaro
  'bird-energy-guru': { energyGuru: true },
  'bird-feather-descend': { pm: 1, rangeRanged: 1 },
  'bird-flock-might': { teamDmgPct: 8 },
  'bird-frail-egg': { init: 25, dmgPct: 15, hp: -30 },
  'bird-gates-of-unity': { gatesEvasion: 15 },
  'bird-ravens-tactic': { firstAttackRoundPct: 25 },
  'bird-sacred-feather': { sacredFeather: 2 },
  'bird-sharp-talon': { pierceRanged: 0.3 },
  'bird-way-of-bird': { init: 20, pm: 1 },
  // Bicho
  'bug-blood-beetle': { bleedMelee: 15 },
  'bug-collect-protect': { shieldOnCast: 20 },
  'bug-fate-maker': { fateMaker: true },
  'bug-greedy-leech': { leechActualPct: 30 },
  'bug-leech': { leechPct: 15, hp: 30 },
  'bug-metamorphosis': { metamorphosis: true },
  'bug-sturdy-fighter': { takenNonMagicPct: -15, collisionImmune: true },
  'bug-vault-builder': { startShield: 50, init: 10 },
  'bug-way-of-bug': { hp: 40, shieldPct: 15 },
  // Reptil
  'reptile-desert-protector': { redirect: 0.2 },
  'reptile-paralyzing-glare': { glareRanged: 20 },
  'reptile-poison-touch': { poisonOnHit: 12 },
  'reptile-prehistoric-armor': { hp: 70, critTakenHalf: true },
  'reptile-regenerator': { regenEnd: 35 },
  'reptile-shellshock': { flatWhileShield: 18 },
  'reptile-spike-spray': { thornsMelee: 20 },
  'reptile-venom-master': { dotTargetPct: 25 },
  'reptile-way-of-reptile': { hp: 55, meleePct: 10 },
  // Neutrales
  'neutral-energy-shard': { teamRoundPa: [2, 4] },
  'neutral-last-wish': { hp: 50, lastWish: 80 },
  'neutral-philosophers-stone': { dmgPct: 10, support: 10 },
  'neutral-pure-instinct': { secondAttackPct: 25 },
  'neutral-pure-luck': { crit: 20, evasionRanged: 15 },
  'neutral-pure-power': { dmgPct: 12 },
  'neutral-pure-skill': { support: 15, pushReduce: 0.25 },
  'neutral-shady-exchange': { shadyExchange: 25 },
  'neutral-vengeful-soul': { hp: 60, vengeful: 15 },
};

// ─────────────────────────────────────────────────────────────── Charms (90)
// Del Axie (se suman al perfil): hp · init · pm · startShield · support · takenShieldedPct · thornsMelee · whiteSage
//   incense · woodenIdol · lastGift
// De la carta de su parte (copia modificada): dmg · dmgFar {dist, add} · crit · critDmg · faith (escudo o curación) · sh
//   (escudo de la carta) · range · rangeIfRanged · rangeProjectile · noLoS · costDown · push · pull · bleed · poison
//   ({value, duration}) · slow · slowMelee · weak · dispel · shieldBreak · selfDamage · collision
// Al usar la carta (ganchos): pmNow · paOnCrit · sproutHeal · selfShield · selfShieldLow · selfShieldChain · selfHeal
//   · selfHealChain · cleanseSelf · splash · initDown · costRound1 · dmgChain · scotch · preorder
export const CHARM_FX = {
  // Bestia
  'beast-beasts-charm-of-focus-i': { crit: 6 },
  'beast-beasts-charm-of-focus-ii': { crit: 12, critDmg: 10 },
  'beast-beasts-charm-of-power-i': { dmg: 6 },
  'beast-beasts-charm-of-power-ii': { dmg: 12 },
  'beast-beasts-energy-drink-s': { pmNow: 1 },
  'beast-beasts-energy-drink-m': { pm: 1, dmg: 8 },
  'beast-hidden-razor': { bleed: { value: 12, duration: 2 } },
  'beast-mad-moon-mask': { dmg: 22, critDmg: 15 },
  'beast-mask-of-frenzy': { paOnCrit: 1 },
  'beast-awaken-stamp-beast': { dmg: 18, push: 1 },
  // Planta
  'plant-plants-charm-of-vitality-i': { hp: 20 },
  'plant-plants-charm-of-vitality-ii': { hp: 45 },
  'plant-plants-charm-of-faith-i': { faith: 8 },
  'plant-plants-charm-of-faith-ii': { faith: 16 },
  'plant-secret-sprout': { sproutHeal: 15 },
  'plant-leafy-pot': { selfShield: 25 },
  'plant-ancient-root': { slow: 1 },
  'plant-oak-bud': { startShield: 35, sh: 20 },
  'plant-red-sage': { cleanseSelf: 1 },
  'plant-awaken-stamp-plant': { hp: 50, support: 15 },
  // Acuático
  'aquatic-aquatics-charm-of-focus-i': { init: 6 },
  'aquatic-aquatics-charm-of-focus-ii': { init: 14, dmg: 5 },
  'aquatic-aquatics-charm-of-power-i': { dmg: 6 },
  'aquatic-aquatics-charm-of-power-ii': { dmg: 12 },
  'aquatic-aquatics-energy-drink-s': { pmNow: 1 },
  'aquatic-bubble-paste': { selfShield: 20 },
  'aquatic-sticky-octopus': { pull: 1 },
  'aquatic-paralyzing-jellyfish': { initDown: 15 },
  'aquatic-exploding-bombshell': { splash: 18 },
  'aquatic-awaken-stamp-aquatic': { dmg: 18, init: 10 },
  // Pájaro
  'bird-birds-charm-of-focus-i': { init: 8 },
  'bird-birds-charm-of-focus-ii': { init: 18 },
  'bird-birds-charm-of-power-i': { dmg: 6 },
  'bird-birds-charm-of-power-ii': { dmg: 12 },
  'bird-birds-energy-drink-s': { pm: 1 },
  'bird-secret-egg': { selfShieldLow: 30 },
  'bird-feather-fan': { range: 1 },
  'bird-flamingo-hammer': { dmg: 15, push: 1 },
  'bird-storm-shuriken': { dmgFar: { dist: 3, add: 20 } },
  'bird-awaken-stamp-bird': { dmg: 16, rangeProjectile: 1 },
  // Bicho
  'bug-bugs-charm-of-endurance-i': { hp: 15, startShield: 5 },
  'bug-bugs-charm-of-endurance-ii': { hp: 35, sh: 12 },
  'bug-bugs-charm-of-power-i': { dmg: 6 },
  'bug-bugs-charm-of-power-ii': { dmg: 12 },
  'bug-secret-cocoon': { selfShield: 20 },
  'bug-tricksters-card': { costRound1: 1 },
  'bug-bugs-energy-drink-m': { pm: 1, hp: 25 },
  'bug-lazy-snail': { slowMelee: 1 },
  'bug-mantis-dagger': { dmg: 18, critDmg: 15 },
  'bug-awaken-stamp-bug': { dmg: 14, selfHeal: 15 },
  // Reptil
  'reptile-reptiles-charm-of-endurance-i': { hp: 20 },
  'reptile-reptiles-charm-of-endurance-ii': { hp: 40, sh: 10 },
  'reptile-reptiles-charm-of-vitality-i': { hp: 20 },
  'reptile-reptiles-charm-of-vitality-ii': { hp: 45 },
  'reptile-reptiles-energy-drink-m': { pm: 1, hp: 30 },
  'reptile-sticky-lizard': { collision: 15 },
  'reptile-vipers-venom': { poison: { value: 10, duration: 2 } },
  'reptile-gecko-mask': { takenShieldedPct: -10 },
  'reptile-gloves-of-infection': { dmg: 14, poison: { value: 15, duration: 2 } },
  'reptile-awaken-stamp-reptile': { hp: 55, thornsMelee: 15 },
  // Neutrales
  'neutral-novice-spell': { dmg: 5 },
  'neutral-deadly-spell': { dmg: 18 },
  'neutral-awaken-stamp-s': { hp: 15 },
  'neutral-awaken-stamp-m': { hp: 35 },
  'neutral-awaken-stamp-l': { hp: 60 },
  'neutral-charm-of-endurance-ii': { hp: 30, sh: 10 },
  'neutral-charm-of-faith-ii': { faith: 14 },
  'neutral-charm-of-focus-ii': { crit: 10 },
  'neutral-charm-of-power-ii': { dmg: 10 },
  'neutral-charm-of-vitality-ii': { hp: 40 },
  'neutral-beans-charm': { selfHeal: 12 },
  'neutral-white-sage': { whiteSage: 1 },
  'neutral-black-sage': { dispel: 1 },
  'neutral-purifying-incense': { incense: true },
  'neutral-wooden-idol': { woodenIdol: true },
  'neutral-discount-coupon': { costDown: 1 },
  'neutral-pre-order-tag': { preorder: true },
  'neutral-scotch-tape': { scotch: 10 },
  'neutral-energy-drink-s': { pmNow: 1 },
  'neutral-energy-drink-m': { pm: 1 },
  'neutral-blue-mirror': { selfShieldChain: 15 },
  'neutral-green-mirror': { selfHealChain: 15 },
  'neutral-red-mirror': { dmgChain: 10 },
  'neutral-sun-stamp': { dmg: 15, shieldBreak: 15 },
  'neutral-earth-stamp': { selfShield: 20 },
  'neutral-lens-of-revelation': { rangeIfRanged: 1 },
  'neutral-rocket-stamp': { range: 2, noLoS: true },
  'neutral-cursed-doll': { weak: 15 },
  'neutral-bloodpact': { dmg: 30, selfDamage: 20 },
  'neutral-last-gift': { lastGift: true },
};

/** Campos de charm que se suman al perfil del Axie (no a la carta). */
const CHARM_AXIE_KEYS = ['hp', 'init', 'pm', 'startShield', 'support', 'takenShieldedPct', 'thornsMelee'];
const CHARM_AXIE_FLAGS = ['whiteSage', 'incense', 'woodenIdol', 'lastGift'];

const PART_ORDER = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
const lc = (s) => String(s || '').toLowerCase();
const distOf = (a, b) => (a && b ? Math.abs(a.gridX - b.gridX) + Math.abs(a.gridZ - b.gridZ) : 1);
const isDamageCard = (spell) => Array.isArray(spell?.effects) && spell.effects.some((e) => e.type === 'damage');
const isMagicSpell = (spell) => spell?.damageBonus === 'magic' || /^(lunalogist|stargazer|pomodoro)_/.test(spell?.id || '');

// ─────────────────────────────────────────────────────────────── carta modificada por los charms

function addToDamage(e, add) {
  if (e.amount != null) e.amount += add;
  if (e.min != null) e.min += add;
  if (e.max != null) e.max += add;
}

/**
 * Copia de una carta con los charms de su parte (y la runa, para el alcance) aplicados. Devuelve null si nada cambia.
 * cardFx: lista de fx de charm para esta parte · runeFx: perfil del Axie (rangeRanged…)
 */
export function buildCardOverride(spell, cardFx = [], profile = null) {
  if (!spell) return null;
  const s = { ...spell, effects: Array.isArray(spell.effects) ? spell.effects.map((e) => ({ ...e, bonus: e.bonus ? [...e.bonus] : undefined })) : spell.effects };
  const notes = [];
  let changed = false;
  const dmgCard = isDamageCard(spell);
  const hitsOf = (e) => (typeof e.hits === 'number' ? e.hits : 1);

  for (const { fx, name } of cardFx) {
    // Coste y alcance
    if (fx.costDown && typeof s.paCost === 'number' && s.paCost > 1) { s.paCost = Math.max(1, s.paCost - fx.costDown); notes.push(`${name}: −${fx.costDown} PA`); changed = true; }
    if (fx.range && s.maxRange >= 1) { s.maxRange += fx.range; notes.push(`${name}: +${fx.range} AL`); changed = true; }
    if (fx.rangeIfRanged && s.maxRange >= 2) { s.maxRange += fx.rangeIfRanged; notes.push(`${name}: +${fx.rangeIfRanged} AL`); changed = true; }
    if (fx.rangeProjectile && s.maxRange > 1) { s.maxRange += fx.rangeProjectile; notes.push(`${name}: +${fx.rangeProjectile} AL`); changed = true; }
    if (fx.noLoS && s.requiresLoS) { s.requiresLoS = false; notes.push(`${name}: sin línea de visión`); changed = true; }

    if (!Array.isArray(s.effects)) continue; // las cartas antiguas (sin effects) solo admiten coste y alcance

    // Daño de la carta
    if (dmgCard) {
      const dmgFx = s.effects.filter((e) => e.type === 'damage');
      if (fx.dmg) { dmgFx.forEach((e) => addToDamage(e, fx.dmg)); notes.push(`${name}: +${fx.dmg} de daño`); changed = true; }
      if (fx.dmgFar) { dmgFx.forEach((e) => { e.bonus = [...(e.bonus || []), { if: { distAtLeast: fx.dmgFar.dist }, add: fx.dmgFar.add }]; }); notes.push(`${name}: +${fx.dmgFar.add} de daño a ${fx.dmgFar.dist}+ casillas`); changed = true; }
      if (fx.crit) { dmgFx.forEach((e) => { e.critBonus = (e.critBonus || 0) + fx.crit; }); notes.push(`${name}: +${fx.crit} % de crítico`); changed = true; }
      if (fx.critDmg) { dmgFx.forEach((e) => { e.critDmgBonus = (e.critDmgBonus || 0) + fx.critDmg; }); notes.push(`${name}: +${fx.critDmg} % de daño crítico`); changed = true; }
      if (fx.shieldBreak) {
        const i = s.effects.findIndex((e) => e.type === 'damage');
        s.effects.splice(i, 0, { type: 'shieldBreak', amount: fx.shieldBreak, fromCharm: true });
        notes.push(`${name}: destruye ${fx.shieldBreak} de escudo`); changed = true;
      }
      if (fx.push) {
        const pushes = s.effects.filter((e) => e.type === 'push');
        if (pushes.length) pushes.forEach((e) => { e.distance = (e.distance || 1) + fx.push; });
        else s.effects.push({ type: 'push', distance: fx.push, fromCharm: true });
        notes.push(`${name}: empuje +${fx.push}`); changed = true;
      }
      if (fx.pull) { s.effects.push({ type: 'pull', distance: fx.pull, fromCharm: true }); notes.push(`${name}: atrae ${fx.pull} casilla`); changed = true; }
      if (fx.bleed) { s.effects.push({ type: 'status', status: 'bleed', value: fx.bleed.value, duration: fx.bleed.duration, fromCharm: true }); notes.push(`${name}: Sangrado ${fx.bleed.value} (${fx.bleed.duration} turnos)`); changed = true; }
      if (fx.poison) { s.effects.push({ type: 'status', status: 'poison', value: fx.poison.value, duration: fx.poison.duration, fromCharm: true }); notes.push(`${name}: Veneno ${fx.poison.value} (${fx.poison.duration} turnos)`); changed = true; }
      if (fx.weak) { s.effects.push({ type: 'status', status: 'weak', value: fx.weak, duration: 1, fromCharm: true }); notes.push(`${name}: el objetivo hace −${fx.weak} % de daño (1 turno)`); changed = true; }
      if (fx.slow) { s.effects.push({ type: 'resource', pm: -fx.slow, when: 'nextTurn', fromCharm: true }); notes.push(`${name}: −${fx.slow} PM en su próximo turno`); changed = true; }
      if (fx.slowMelee) { s.effects.push({ type: 'resource', pm: -fx.slowMelee, when: 'nextTurn', if: { distAtMost: 1 }, fromCharm: true }); notes.push(`${name}: −${fx.slowMelee} PM si golpea a 1 casilla`); changed = true; }
      if (fx.dispel) { s.effects.push({ type: 'dispel', count: fx.dispel, fromCharm: true }); notes.push(`${name}: quita ${fx.dispel} beneficio`); changed = true; }
      if (fx.selfDamage) { s.effects.push({ type: 'selfDamage', amount: fx.selfDamage, fromCharm: true }); notes.push(`${name}: el lanzador pierde ${fx.selfDamage} HP`); changed = true; }
    }

    // Escudo y curación de la carta
    if (fx.faith || fx.sh) {
      let touched = false;
      for (const e of s.effects) {
        if (e.type === 'shield' && (fx.faith || fx.sh)) { e.amount = (e.amount || 0) + (fx.faith || 0) + (fx.sh || 0); touched = true; }
        if (e.type === 'heal' && fx.faith) { addToDamage(e, fx.faith); touched = true; }
      }
      if (touched) { notes.push(`${name}: +${(fx.faith || 0) + (fx.sh || 0)} de escudo${fx.faith ? ' o curación' : ''}`); changed = true; }
    }
  }

  // Sticky Lizard: más daño de colisión en los empujes de la carta (también los que añaden otros charms)
  const collision = cardFx.reduce((a, c) => a + (c.fx.collision || 0), 0);
  if (collision && Array.isArray(s.effects)) {
    const pushes = s.effects.filter((e) => e.type === 'push');
    if (pushes.length) { pushes.forEach((e) => { e.collisionBonus = (e.collisionBonus || 0) + collision; }); notes.push(`+${collision} de daño de colisión`); changed = true; }
  }

  // Runa: +AL a las habilidades de disparo a distancia
  if (profile?.rangeRanged && s.maxRange > 1) { s.maxRange += profile.rangeRanged; notes.push(`Runa: +${profile.rangeRanged} AL`); changed = true; }

  if (!changed) return null;

  // Campos de visualización (HUD, Mochila) coherentes con los efectos
  if (Array.isArray(s.effects)) {
    const d = s.effects.find((e) => e.type === 'damage');
    if (d) { s.baseMinDamage = (d.min ?? d.amount ?? 0) * hitsOf(d); s.baseMaxDamage = (d.max ?? d.amount ?? 0) * hitsOf(d); }
    const sh = s.effects.find((e) => e.type === 'shield');
    if (sh && spell.shieldAmount != null) s.shieldAmount = sh.amount;
    const h = s.effects.find((e) => e.type === 'heal');
    if (h && spell.baseMinHeal != null) { s.baseMinHeal = h.min ?? h.amount; s.baseMaxHeal = h.max ?? h.amount; }
  }
  s.rcNotes = notes;
  s.rcBase = spell;
  return s;
}

// ─────────────────────────────────────────────────────────────── perfil del Axie

/** Perfil de combate de un Axie a partir de lo equipado ({ rune, charms: { parte: id } }). */
export function buildProfile(loadout, axieClass, cardsByPart = {}) {
  if (!loadout) return null;
  const p = { rune: null, charms: {}, cardFx: {} };
  const add = (k, v) => { p[k] = (p[k] || 0) + v; };
  const rune = RUNE_BY_ID[loadout.rune];
  if (rune && runeFits(rune, lc(axieClass)) && RUNE_FX[rune.id]) {
    p.rune = rune.id;
    for (const [k, v] of Object.entries(RUNE_FX[rune.id])) {
      if (typeof v === 'number') add(k, v); else p[k] = v;
    }
  }
  // PP por clase (GDD §3): los charms que no caben en los PP de su clase (partidas antiguas) no se aplican
  const partClasses = Object.fromEntries(PART_ORDER.map((pt) => [pt, lc(cardsByPart[pt]?.class || axieClass)]));
  for (const part of PART_ORDER) {
    const id = loadout.charms?.[part];
    const ch = CHARM_BY_ID[id];
    const fx = ch && CHARM_FX[ch.id];
    if (!fx) continue;
    const partClass = partClasses[part];
    if (!charmFits(ch, partClass)) continue;
    if (!ppCanSet(axieClass, partClasses, p.charms, part, ch.id).ok) { (p.rejected ||= []).push(ch.id); continue; }
    p.charms[part] = ch.id;
    for (const k of CHARM_AXIE_KEYS) if (fx[k]) add(k, fx[k]);
    for (const k of CHARM_AXIE_FLAGS) if (fx[k]) p[k] = true;
    p.cardFx[part] = { id: ch.id, name: ch.name, fx };
  }
  if (!p.rune && !Object.keys(p.charms).length) return null;
  return p;
}

// ─────────────────────────────────────────────────────────────── sistema

export class RuneCharmSystem {
  constructor(spellManager) {
    this.sm = spellManager;
    this.enabled = true;
    this._initDowns = [];
    const ev = spellManager.events;
    // White Sage: los perjuicios que recibe el portador duran 1 turno menos (mínimo 1)
    ev?.on('status:applied', ({ unit, status, source }) => {
      if (!unit?.rc?.whiteSage || source === unit || STATUS_DEFS[status]?.kind !== 'debuff') return;
      const st = this.sm.statuses.get(unit, status);
      if (st && !st._rcSage && st.duration > 1) { st.duration -= 1; st._rcSage = true; }
    });
  }

  get events() { return this.sm.events; }
  get round() { return this.sm.field?.round || this.sm.turnManager?.round || 1; }
  _units() { return (this.sm.game?.units || this.sm.turnManager?.units || []).filter((u) => !u.isDead); }
  _proc(unit, label, extra = {}) { this.events?.emit('runeCharm:proc', { unit, label, ...extra }); }

  // ------------------------------------------------ inicio del combate

  /**
   * Aplica runas y charms a las unidades del jugador. Llamar después de crear las unidades y ANTES de fijar
   * el orden de turnos (la iniciativa cuenta). loadoutOf(heroId) → { rune, charms } · cardsOf(unit) → cartas por parte.
   */
  setupCombat(units, { loadoutOf, enabled = true } = {}) {
    this._initDowns = [];
    for (const u of units || []) { u.rc = null; u.rcSpells = null; }
    if (!enabled || !this.enabled || typeof loadoutOf !== 'function') return [];
    const applied = [];
    for (const u of units || []) {
      if (u.team !== 'player' || u.type === 'sapidae' || u.config?.isSapidae) continue;
      const cards = (u.spellIds || []).map((id) => this.sm.getSpell(id)).filter((s) => s && s.part);
      const byPart = Object.fromEntries(cards.map((s) => [s.part, s]));
      const profile = buildProfile(loadoutOf(u.id), u.axieClass, byPart);
      if (!profile) continue;
      this._applyStats(u, profile);
      // Cartas modificadas por los charms de su parte (y por la runa, en el alcance)
      u.rcSpells = {};
      for (const s of cards) {
        const fx = profile.cardFx[s.part];
        const ov = buildCardOverride(s, fx ? [fx] : [], profile);
        if (ov) u.rcSpells[s.id] = ov;
      }
      u.rc = profile;
      applied.push({ unit: u.id, rune: profile.rune, charms: profile.charms });
    }
    return applied;
  }

  _applyStats(u, p) {
    const hp = p.hp || 0;
    if (hp) {
      const before = u.currentHP;
      u.maxHP = Math.max(1, u.maxHP + hp);
      u.currentHP = hp > 0 ? u.currentHP + hp : Math.min(u.currentHP, u.maxHP);
      u._rcHpDelta = (u._rcHpDelta || 0) + (u.currentHP - before);
    }
    if (p.init) u.initiative = (u.initiative || 0) + p.init;
    if (p.pm) { u.maxPM += p.pm; u.currentPM += p.pm; }
    if (p.crit) u.critRate = (u.critRate > 0 ? u.critRate : 20) + p.crit;
    if (p.support) u.supportPower = (u.supportPower || 0) + p.support;
    if (p.startShield) {
      u.shield = (u.shield || 0) + p.startShield;
      u.shieldExpiresRound = 2; // como un escudo de habilidad dado en la ronda 1
    }
    u._rcState = { lethalUsed: false, pufferUsed: false, miracleUsed: false, idolUsed: false, fateRound: -Infinity, morphed: false };
    u.lethalGuard = (unit) => this._lethalGuard(unit);
    u.afterDamage = (unit) => this._afterDamage(unit);
    u.onDeath = (unit) => this._onDeath(unit);
    u.updateHUD?.();
  }

  /** Al empezar el combate (TurnManager.onCombatStart): reinicia los contadores por combate. */
  onCombatStart(units) {
    for (const u of units || []) {
      u._rcTurnCasts = 0; u._rcTurnAttacks = 0; u._rcLastAttackRound = 0; u._rcRoundCasts = {};
      u._rcUsedPrev = new Set(); u._rcUsedNow = new Set(); u._rcTurns = 0; u._rcOncePerTurn = {};
      u._rcMovedLastTurn = false; u._rcCurrentCast = null;
    }
    this._vengeance = { player: 0, enemy: 0 };
  }

  // ------------------------------------------------ cartas y coste

  /** Carta efectiva de una unidad (la copia con charms si la tiene). */
  spellFor(unit, spell) {
    if (!spell || !unit?.rcSpells) return spell;
    return unit.rcSpells[spell.id] || spell;
  }

  /** Descuentos de coste que dependen del momento: Trickster's Card, Energy Guru y Fate Maker. */
  _dynamicDiscount(caster, spell) {
    const p = caster?.rc;
    if (!p || typeof spell?.paCost !== 'number' || spell.paCost <= 1 || spell.isUltimate) return { off: 0, tags: [] };
    let off = 0;
    const tags = [];
    const round = this.round;
    const fx = spell.part ? p.cardFx[spell.part]?.fx : null;
    if (fx?.costRound1 && round === 1) { off += fx.costRound1; tags.push('trickster'); }
    if (p.energyGuru && round === 1 && !(caster._rcRoundCasts?.[1] > 0)) { off += 1; tags.push('guru'); }
    if (p.fateMaker && (spell.part === 'horn' || spell.part === 'mouth') && round - (caster._rcState?.fateRound ?? -Infinity) >= 2) { off += 1; tags.push('fate'); }
    return { off, tags };
  }

  /** Coste en PA que pagará la unidad (mínimo 1 si hay descuentos). */
  costOf(caster, spell) {
    if (!spell) return 0;
    if (spell.paCost === 'X') return 'X';
    const base = Number(spell.paCost) || 0;
    const { off } = this._dynamicDiscount(caster, spell);
    return off ? Math.max(1, base - off) : base;
  }

  /** Marca los descuentos de uso limitado como gastados (Fate Maker). */
  onPaid(caster, spell) {
    const { tags } = this._dynamicDiscount(caster, spell);
    if (tags.includes('fate')) caster._rcState.fateRound = this.round;
  }

  // ------------------------------------------------ lanzamiento

  /** Estado del lanzamiento en curso (o del siguiente, para el pronóstico). */
  castFlags(caster, spell) {
    if (caster?._rcCurrentCast) return caster._rcCurrentCast;
    const isAtk = isDamageCard(spell) || Boolean(spell?.baseMinDamage);
    return {
      chain: (caster?._rcTurnCasts || 0) > 0,
      firstAttackRound: isAtk && (caster?._rcLastAttackRound || 0) !== this.round,
      secondAttack: isAtk && (caster?._rcTurnAttacks || 0) === 1,
      scotch: Boolean(spell && caster?._rcTurns > 1 && !caster._rcUsedPrev?.has(spell.id)),
      isAttack: isAtk,
    };
  }

  /** spell:cast — fija el estado del lanzamiento y cuenta usos. */
  onCast(ctx) {
    const { caster, spell } = ctx;
    if (!caster) return;
    caster._rcCurrentCast = null;
    const flags = this.castFlags(caster, spell);
    caster._rcCurrentCast = flags;
    ctx.rcFlags = flags;
    caster._rcTurnCasts = (caster._rcTurnCasts || 0) + 1;
    (caster._rcRoundCasts ||= {})[this.round] = (caster._rcRoundCasts[this.round] || 0) + 1;
    if (flags.isAttack) { caster._rcTurnAttacks = (caster._rcTurnAttacks || 0) + 1; caster._rcLastAttackRound = this.round; }
    caster._rcUsedNow?.add(spell.id);
    // Collect & Protect: cada carta que gasta PA da +20 de escudo
    if (caster.rc?.shieldOnCast && (ctx.spent || 0) > 0) this._shield(caster, caster.rc.shieldOnCast, 'Collect & Protect');
  }

  /** spell:resolved — efectos de charm «al usar esta habilidad» y salpicaduras. */
  onResolved(ctx) {
    const { caster, spell, targetCell } = ctx;
    if (!caster || caster.isDead) { if (caster) caster._rcCurrentCast = null; return; }
    const p = caster.rc;
    const flags = ctx.rcFlags || {};
    if (p) {
      const charm = spell?.part ? p.cardFx[spell.part] : null;
      const fx = charm?.fx;
      const primary = targetCell ? this.sm.gridManager.getTile(targetCell.x, targetCell.z)?.unit : null;
      const hitEnemy = primary && primary !== caster && primary.team !== caster.team ? primary : null;
      if (fx) {
        const once = (key) => { const k = `${spell.id}|${key}`; if (caster._rcOncePerTurn[k]) return false; caster._rcOncePerTurn[k] = true; return true; };
        if (fx.pmNow && once('pm')) { caster.currentPM += fx.pmNow; caster.updateHUD?.(); this.events?.emit('unit:resourceGained', { unit: caster, source: caster, spell, pm: fx.pmNow }); }
        if (fx.paOnCrit && ctx.rcCrit && once('frenzy')) { caster.currentPA += fx.paOnCrit; caster.updateHUD?.(); this.events?.emit('unit:resourceGained', { unit: caster, source: caster, spell, pa: fx.paOnCrit }); this._proc(caster, charm.name); }
        if (fx.selfShield) this._shield(caster, fx.selfShield, charm.name);
        if (fx.selfShieldLow && caster.currentHP < caster.maxHP * 0.5) this._shield(caster, fx.selfShieldLow, charm.name);
        if (fx.selfShieldChain && flags.chain) this._shield(caster, fx.selfShieldChain, charm.name);
        if (fx.selfHeal) this.sm._heal(caster, fx.selfHeal, caster, spell);
        if (fx.selfHealChain && flags.chain) this.sm._heal(caster, fx.selfHealChain, caster, spell);
        if (fx.cleanseSelf) this.sm.statuses.clear(caster, 'debuff', fx.cleanseSelf);
        if (fx.sproutHeal) {
          const near = this._units().filter((u) => u.team === caster.team && u !== caster && distOf(u, caster) === 1 && u.currentHP < u.maxHP)
            .sort((a, b) => a.currentHP / a.maxHP - b.currentHP / b.maxHP)[0];
          if (near) this.sm._heal(near, fx.sproutHeal, caster, spell);
        }
        if (fx.initDown && hitEnemy && !hitEnemy.isDead && ctx.rcHitTargets?.has(hitEnemy)) this._initDown(hitEnemy, fx.initDown, charm.name);
        if (fx.splash && hitEnemy && ctx.rcHitTargets?.has(hitEnemy)) this._splash(ctx, targetCell, fx.splash, charm.name);
      }
      // Bombshell Maker: los ataques a distancia salpican 20 en cruz alrededor del objetivo
      if (p.splashRanged && hitEnemy && ctx.rcHitTargets?.has(hitEnemy) && distOf(caster, hitEnemy) >= 2) this._splash(ctx, targetCell, p.splashRanged, 'Bombshell Maker');
    }
    caster._rcCurrentCast = null;
  }

  _splash(ctx, cell, amount, label) {
    const { caster } = ctx;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const u = this.sm.gridManager.getTile(cell.x + dx, cell.z + dz)?.unit;
      if (!u || u.isDead || u === caster || u.team === caster.team) continue;
      const sh0 = u.shield || 0;
      const actual = u.takeDamage(amount);
      this.events?.emit('unit:damaged', { unit: u, source: caster, spell: null, actual, shieldAbsorbed: Math.max(0, sh0 - (u.shield || 0)), isCrit: false, plain: true, splash: true });
    }
    this._proc(caster, label);
  }

  // ------------------------------------------------ daño

  /** Bonus plano extra del lanzador (Shellshock, Red Mirror). Se suma al bonus de atributos. */
  flatDamage(caster, spell, dist = 1) {
    const p = caster?.rc;
    if (!p || !spell) return 0;
    let add = 0;
    if (p.flatWhileShield && caster.shield > 0) add += p.flatWhileShield;
    const fx = spell.part ? p.cardFx[spell.part]?.fx : null;
    if (fx?.dmgChain && this.castFlags(caster, spell).chain) add += fx.dmgChain;
    return add;
  }

  /** % de daño que suman las runas y charms del atacante y del defensor (se suma a los estados). */
  damagePct(caster, target, dist = 1, ctx = null) {
    let pct = 0;
    const spell = ctx?.spell || null;
    const p = caster?.rc;
    if (p) {
      pct += p.dmgPct || 0;
      if (dist <= 1) pct += p.meleePct || 0;
      if (dist >= 2) pct += p.rangedPct || 0;
      if (target) {
        if (p.lowHpTargetPct && target.currentHP < target.maxHP * 0.5) pct += p.lowHpTargetPct;
        if (p.shieldedTargetPct && target.shield > 0) pct += p.shieldedTargetPct;
        if (p.stillTargetPct && !target._rcMovedLastTurn) pct += p.stillTargetPct;
        if (p.dotTargetPct && (this.sm.statuses.has(target, 'poison') || this.sm.statuses.has(target, 'bleed'))) pct += p.dotTargetPct;
      }
      if (p.cost2Pct && spell) {
        const cost = spell.paCost === 'X' ? (ctx?.spent || caster.currentPA || 1) : Number(spell.paCost) || 0;
        if (cost >= 2) pct += p.cost2Pct;
      }
      if (p.metamorphosis && caster._rcState?.morphed) pct += 15;
      if (spell && (p.firstAttackRoundPct || p.secondAttackPct)) {
        const f = this.castFlags(caster, spell);
        if (p.firstAttackRoundPct && f.firstAttackRound) pct += p.firstAttackRoundPct;
        if (p.secondAttackPct && f.secondAttack) pct += p.secondAttackPct;
      }
      const fx = spell?.part ? p.cardFx[spell.part]?.fx : null;
      if (fx?.scotch && this.castFlags(caster, spell).scotch) pct += fx.scotch;
    }
    // Flock Might (aliados vivos con la runa) y Vengeful Soul (aliados caídos con la runa)
    if (caster) {
      for (const u of this._units()) if (u.team === caster.team && u.rc?.teamDmgPct) pct += u.rc.teamDmgPct;
      pct += this._vengeance?.[caster.team === 'player' ? 'player' : 'enemy'] || 0;
    }
    // Defensor
    const t = target?.rc;
    if (t) {
      pct += t.takenPct || 0;
      if (dist >= 2) pct += t.takenRangedPct || 0;
      if (t.takenNonMagicPct && !isMagicSpell(spell)) pct += t.takenNonMagicPct;
      if (t.takenShieldedPct && target.shield > 0) pct += t.takenShieldedPct;
    }
    return pct;
  }

  /** Multiplicador del crítico: ×1,5 + daño crítico de runas y charms; Prehistoric Armor reduce a la mitad lo extra. */
  critMultiplier(caster, target, e = null) {
    let extra = 0.5 + ((caster?.rc?.critDmg || 0) + (e?.critDmgBonus || 0)) / 100;
    if (target?.rc?.critTakenHalf) extra /= 2;
    return 1 + extra;
  }

  /** Perforación de escudo (Sharp Talon a distancia). */
  pierce(caster, dist) {
    return caster?.rc?.pierceRanged && dist >= 2 ? caster.rc.pierceRanged : 0;
  }

  /** Probabilidad de esquivar un ataque a distancia (Pure Luck, Gates of Unity). */
  evasionChance(caster, target, dist) {
    if (!target || dist < 2 || !caster || caster.team === target.team) return 0;
    let ev = target.rc?.evasionRanged || 0;
    const allies = this._units().filter((u) => u.team === target.team && u !== target && distOf(u, target) <= 2);
    if (target.rc?.gatesEvasion && allies.length) ev += target.rc.gatesEvasion;
    else if (allies.some((u) => u.rc?.gatesEvasion)) ev += Math.max(...allies.map((u) => u.rc?.gatesEvasion || 0));
    return Math.min(90, ev) / 100;
  }

  /** ¿Esquiva este golpe? Tira con el azar de las reglas solo si hay probabilidad. */
  evade(ctx, target, dist) {
    const chance = this.evasionChance(ctx?.caster, target, dist);
    if (!(chance > 0)) return false;
    if (this.sm.rng() >= chance) return false;
    this.events?.emit('unit:evaded', { unit: target, source: ctx.caster, spell: ctx.spell });
    return true;
  }

  /** Desert Protector: el 20 % del daño de un aliado adyacente lo recibe el protector. Devuelve el daño restante. */
  redirect(ctx, target, dmg) {
    const caster = ctx?.caster;
    if (!caster || !target || caster.team === target.team || !(dmg > 1)) return dmg;
    const prot = this._units().find((u) => u !== target && u.team === target.team && u.rc?.redirect && distOf(u, target) === 1);
    if (!prot) return dmg;
    const shared = Math.round(dmg * prot.rc.redirect);
    if (!(shared > 0)) return dmg;
    const sh0 = prot.shield || 0;
    const actual = prot.takeDamage(shared);
    this.events?.emit('unit:damaged', { unit: prot, source: caster, spell: ctx.spell, actual, shieldAbsorbed: Math.max(0, sh0 - (prot.shield || 0)), isCrit: false, linked: true, redirected: true });
    this._proc(prot, 'Desert Protector');
    return dmg - shared;
  }

  /** Tras cada golpe de una carta: robo de vida, estados al golpear, contraataques, matar y críticos. */
  afterHit(ctx, target, { actual = 0, shieldAbsorbed = 0, isCrit = false, dist = 1 } = {}) {
    const { caster, spell } = ctx || {};
    if (!caster || !target || !spell || caster === target) return;
    const enemy = caster.team !== target.team;
    const taken = actual + shieldAbsorbed;
    (ctx.rcHitTargets ||= new Set()).add(target);
    if (isCrit) ctx.rcCrit = true;
    const p = caster.rc;
    if (p && enemy && taken > 0) {
      const done = (ctx.rcDone ||= new Set());
      const firstOn = (key) => { const k = `${key}|${target.id}`; if (done.has(k)) return false; done.add(k); return true; };
      // Robo de vida
      const leech = Math.round(taken * (p.leechPct || 0) / 100 + actual * (p.leechActualPct || 0) / 100);
      if (leech > 0 && !caster.isDead) this.sm._heal(caster, leech, caster, spell);
      if (!target.isDead) {
        if (p.poisonOnHit && firstOn('poison')) this.sm.statuses.apply(target, 'poison', { value: p.poisonOnHit, duration: 2, source: caster });
        if (p.bleedMelee && dist <= 1 && firstOn('bleed')) this.sm.statuses.apply(target, 'bleed', { value: p.bleedMelee, duration: 2, source: caster });
        if (p.slowOnHit && firstOn('slow')) this.sm.statuses.apply(target, 'slowed', { value: p.slowOnHit, duration: 1, source: caster });
        if (p.glareRanged && dist >= 2 && firstOn('glare')) {
          this.sm.statuses.apply(target, 'slowed', { value: 1, duration: 1, source: caster });
          this._initDown(target, p.glareRanged, 'Paralyzing Glare');
        }
      }
      // Bloodlust: al eliminar a un enemigo, +1 PA y +1 PM ahora
      if (p.bloodlust && target.isDead && firstOn('kill') && !caster.isDead) {
        caster.currentPA += 1; caster.currentPM += 1; caster.updateHUD?.();
        this.events?.emit('unit:resourceGained', { unit: caster, source: caster, spell, pa: 1, pm: 1 });
        this._proc(caster, 'Bloodlust');
      }
      // Inspirational Hero: con un crítico, todo el escuadrón +1 PM en su próximo turno
      if (p.critTeamPm && isCrit && !ctx.rcInspired) {
        ctx.rcInspired = true;
        for (const u of this._units()) if (u.team === caster.team) this.sm.statuses.apply(u, 'hasted', { value: p.critTeamPm, duration: 1, source: caster });
        this._proc(caster, 'Inspirational Hero');
      }
    }
    // Reacciones del defensor contra un atacante cuerpo a cuerpo
    const t = target.rc;
    if (t && enemy && dist <= 1 && !caster.isDead && taken > 0) {
      let back = (t.thornsMelee || 0);
      const done = (ctx.rcDone ||= new Set());
      if (t.counterMelee && !done.has(`counter|${target.id}`) && !target.isDead) { done.add(`counter|${target.id}`); back += t.counterMelee; this._proc(target, 'Counter Stance'); }
      if (back > 0) {
        const sh0 = caster.shield || 0;
        const dealt = caster.takeDamage(back);
        this.events?.emit('unit:damaged', { unit: caster, source: target, spell: null, actual: dealt, shieldAbsorbed: Math.max(0, sh0 - (caster.shield || 0)), isCrit: false, plain: true, reflected: true });
      }
    }
  }

  // ------------------------------------------------ curas y escudos

  healTakenPct(target) { return target?.rc?.healTakenPct || 0; }

  /** % extra de los escudos que da el lanzador con esta carta (Way of Plant con cartas de Planta, Way of Bug). */
  shieldPct(caster, spell) {
    const p = caster?.rc;
    if (!p) return 0;
    return (p.shieldPct || 0) + (p.shieldPctPlant && lc(spell?.class) === 'plant' ? p.shieldPctPlant : 0);
  }

  _shield(unit, amount, label = null) {
    if (!unit || unit.isDead || !(amount > 0)) return;
    this.sm._grantShield(unit, amount);
    unit.updateHUD?.();
    this.events?.emit('unit:shielded', { unit, source: unit, spell: null, amount });
    if (label) this._proc(unit, label);
  }

  /** Distancia de un empuje sufrido (Pure Skill: −25 %, mínimo 1). */
  pushDistance(target, distance) {
    const r = target?.rc?.pushReduce;
    return r ? Math.max(1, Math.floor(distance * (1 - r))) : distance;
  }

  collisionImmune(unit) { return Boolean(unit?.rc?.collisionImmune); }

  _initDown(unit, amount, label) {
    // La iniciativa se fija al empezar el combate (GDD): bajarla no cambia el orden de turnos ya decidido.
    unit.initiative = (unit.initiative || 0) - amount;
    this._initDowns.push({ unit, amount, until: this.round + 1 });
    this._proc(unit, `${label}: −${amount} iniciativa`);
  }

  // ------------------------------------------------ turnos y rondas

  onRoundStart(round) {
    for (const d of [...this._initDowns]) {
      if (round >= d.until) { d.unit.initiative += d.amount; this._initDowns.splice(this._initDowns.indexOf(d), 1); }
    }
    for (const u of this._units()) {
      const p = u.rc;
      if (!p) continue;
      // Gaia's Embrace: +40 de escudo a este Axie y a los aliados adyacentes
      if (p.gaiaShield) {
        this._shield(u, p.gaiaShield, "Gaia's Embrace");
        for (const a of this._units()) if (a !== u && a.team === u.team && distOf(a, u) === 1) this._shield(a, p.gaiaShield);
      }
      // Metamorphosis: al empezar la ronda 3, +50 HP, +15 % de daño y +1 PM permanentes
      if (p.metamorphosis && round === 3 && !u._rcState.morphed) {
        u._rcState.morphed = true;
        u.maxHP += 50; u.currentHP += 50; u._rcHpDelta = (u._rcHpDelta || 0) + 50;
        u.maxPM += 1;
        u.updateHUD?.();
        this._proc(u, 'Metamorphosis');
      }
      // Purifying Incense: al empezar la ronda 2 limpia todos sus perjuicios
      if (p.incense && round === 2) { if (this.sm.statuses.clear(u, 'debuff')) this._proc(u, 'Purifying Incense'); }
    }
  }

  /** Antes de los estados del inicio de turno. */
  turnStartPre(unit) {
    unit._rcTurnCasts = 0; unit._rcTurnAttacks = 0; unit._rcOncePerTurn = {}; unit._rcCurrentCast = null;
    unit._rcUsedPrev = unit._rcUsedNow || new Set(); unit._rcUsedNow = new Set();
    unit._rcTurns = (unit._rcTurns || 0) + 1;
    // Sacred Feather: ignora las reducciones de PM
    if (unit.rc?.sacredFeather) {
      if (this.sm.statuses.has(unit, 'slowed')) this.sm.statuses.remove(unit, 'slowed', 'cleansed');
    }
  }

  /** Después de los estados del inicio de turno. result = { skip, died }. */
  turnStartPost(unit, result = {}) {
    if (unit.isDead || result.died) return;
    const round = this.round;
    const p = unit.rc;
    if (!result.skip) {
      let pa = 0, pm = 0;
      if (p?.roundPa?.includes(round)) { pa += 1; this._proc(unit, 'Endless Anger'); }
      // Energy Shard: en las rondas 2 y 4, +1 PA a todo el escuadrón (por cada aliado vivo con la runa)
      for (const u of this._units()) if (u.team === unit.team && u.rc?.teamRoundPa?.includes(round)) pa += 1;
      if (p?.sacredFeather) {
        if (unit.currentPM < unit.maxPM) unit.currentPM = unit.maxPM; // reducciones de PM disipadas
        if (unit._rcTurns === 1) { pm += p.sacredFeather; this._proc(unit, 'Sacred Feather'); }
      }
      if (p?.shadyExchange && unit.currentHP > 1) {
        const lost = Math.min(p.shadyExchange, unit.currentHP - 1); // nunca se mata a sí mismo
        unit.currentHP -= lost;
        this.events?.emit('unit:damaged', { unit, source: unit, spell: null, actual: lost, shieldAbsorbed: 0, isCrit: false, plain: true, selfInflicted: true });
        pa += 1; pm += 1;
        this._proc(unit, 'Shady Exchange');
      }
      if (pa || pm) {
        unit.currentPA += pa; unit.currentPM += pm;
        this.events?.emit('unit:resourceGained', { unit, source: unit, spell: null, pa: pa || undefined, pm: pm || undefined });
      }
    }
    unit._rcPmAtStart = unit.currentPM;
    unit.updateHUD?.();
  }

  /** Al terminar el turno de la unidad (antes de que caduquen estados y escudos). */
  turnEnd(unit) {
    if (unit.isDead) return;
    const spentPM = unit._rcPmAtStart != null && unit.currentPM < unit._rcPmAtStart;
    unit._rcMovedLastTurn = spentPM;
    const p = unit.rc;
    if (!p) return;
    // Regenerator: +35 HP al final de su turno
    if (p.regenEnd) this.sm._heal(unit, p.regenEnd, unit, null);
    // Forest Aroma: +25 HP al aliado con menos vida a 2 casillas o menos (él incluido)
    if (p.aromaEnd) {
      const t = this._units().filter((u) => u.team === unit.team && distOf(u, unit) <= 2 && u.currentHP < u.maxHP)
        .sort((a, b) => a.currentHP / a.maxHP - b.currentHP / b.maxHP)[0];
      if (t) { this.sm._heal(t, p.aromaEnd, unit, null); this._proc(unit, 'Forest Aroma'); }
    }
    // Calcium Armor: +50 de escudo si no gastó PM
    if (p.calciumShield && !spentPM) this._shield(unit, p.calciumShield, 'Calcium Armor');
  }

  // ------------------------------------------------ golpe letal y muerte

  _lethalGuard(unit) {
    const p = unit.rc, st = unit._rcState;
    if (!p || !st) return false;
    if (p.puffer && !st.pufferUsed) {
      st.pufferUsed = true;
      unit.currentHP = 1;
      // El escudo se da al terminar el golpe en curso
      queueMicrotask(() => { if (!unit.isDead) this._shield(unit, p.puffer, "Puffer's Plight"); });
      return true;
    }
    if (p.woodenIdol && !st.idolUsed) {
      st.idolUsed = true;
      unit.currentHP = 1;
      this._proc(unit, 'Wooden Idol');
      return true;
    }
    return false;
  }

  _afterDamage(unit) {
    const p = unit.rc, st = unit._rcState;
    if (!p?.miracle || st.miracleUsed || unit.isDead) return;
    if (unit.currentHP < unit.maxHP * 0.25) {
      st.miracleUsed = true;
      this._shield(unit, p.miracle, 'Miracle Leaf');
    }
  }

  _onDeath(unit) {
    const p = unit.rc;
    if (!p) return;
    const allies = this._units().filter((u) => u !== unit && u.team === unit.team && !u.isDead && u.currentHP > 0);
    if (p.lastWish) { for (const a of allies) this._shield(a, p.lastWish); this._proc(unit, 'Last Wish'); }
    if (p.vengeful) { const k = unit.team === 'player' ? 'player' : 'enemy'; this._vengeance[k] = (this._vengeance[k] || 0) + p.vengeful; this._proc(unit, 'Vengeful Soul'); }
    if (p.lastGift) {
      const leader = allies.find((u) => u.type === 'sapidae' || u.config?.isSapidae);
      if (leader) {
        this._shield(leader, 50);
        const res = { type: 'resource', pa: 1 };
        this.sm.effects.resource({ caster: unit, spell: null }, leader, res);
        this._proc(unit, 'Last Gift');
      }
    }
  }

  // ------------------------------------------------ consulta

  /** Resumen legible de lo que hace cada runa/charm activo en el combate (consola). */
  summary(units = this.sm.game?.units || []) {
    return units.filter((u) => u.rc).map((u) => ({
      unidad: u.name || u.id, runa: u.rc.rune ? RUNE_BY_ID[u.rc.rune]?.name : '—',
      charms: Object.entries(u.rc.charms).map(([pt, id]) => `${pt}: ${CHARM_BY_ID[id]?.name}`).join(' · ') || '—',
      vida: u.maxHP, iniciativa: u.initiative, PM: u.maxPM, critico: u.critRate, apoyo: u.supportPower,
      cartas: Object.values(u.rcSpells || {}).map((s) => `${s.name} (${s.rcNotes.join('; ')})`).join(' | ') || '—',
    }));
  }
}

export { buildCardOverride as rcCardOverride };
