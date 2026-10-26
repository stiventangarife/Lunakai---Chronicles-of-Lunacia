// TutorialScript.js — Textos del tutorial nuevo (Hito 48). Diálogos cortos: como mucho 2–3 líneas por momento.
// {name} = nombre del Sapidae · {axie} = nombre del Axie compañero.
// Cada paso: fase (para los rombos de la franja), tipo ('talk' = conversación con Paladill, 'task' = acción del jugador)
// y la franja que se ve arriba (title + text). Las conversaciones están en DIALOGS.
// Textos en i18n/{es,en}/tutorialScript.js.
import * as i18n from '../../i18n/i18n.js';

export const PHASES = [
  i18n.t('tutorialScript.phase.defense'), i18n.t('tutorialScript.phase.backpack'), i18n.t('tutorialScript.phase.duel'), i18n.t('tutorialScript.phase.forge'),
  i18n.t('tutorialScript.phase.bond'), i18n.t('tutorialScript.phase.runes'), i18n.t('tutorialScript.phase.graduation'),
];

export const STEPS = {
  defend:        { phase: 0, kind: 'talk', dialog: 'alarm',      title: i18n.t('tutorialScript.step.defend.title'), text: i18n.t('tutorialScript.talkToPaladill') },
  equip_talk:    { phase: 1, kind: 'talk', dialog: 'after_dojo', title: i18n.t('tutorialScript.step.equipTalk.title'), text: i18n.t('tutorialScript.step.equipTalk.text') },
  equip_sword:   { phase: 1, kind: 'task', title: i18n.t('tutorialScript.step.equipSword.title'), text: i18n.t('tutorialScript.step.equipSword.text') },
  duel_talk:     { phase: 2, kind: 'talk', dialog: 'duel',       title: i18n.t('tutorialScript.step.duelTalk.title'), text: i18n.t('tutorialScript.talkToPaladill') },
  forge_talk:    { phase: 3, kind: 'talk', dialog: 'forge',      title: i18n.t('tutorialScript.step.forgeTalk.title'), text: i18n.t('tutorialScript.talkToPaladill') },
  chop:          { phase: 3, kind: 'task', title: i18n.t('tutorialScript.step.chop.title'), text: i18n.t('tutorialScript.step.chop.text') },
  forge_open:    { phase: 3, kind: 'task', title: i18n.t('tutorialScript.step.forgeOpen.title'), text: i18n.t('tutorialScript.step.forgeOpen.text') },
  forge_evolve:  { phase: 3, kind: 'task', title: i18n.t('tutorialScript.step.forgeEvolve.title'), text: i18n.t('tutorialScript.step.forgeEvolve.text') },
  forge_speed:   { phase: 3, kind: 'task', title: i18n.t('tutorialScript.step.forgeSpeed.title'), text: i18n.t('tutorialScript.step.forgeSpeed.text') },
  forge_collect: { phase: 3, kind: 'task', title: i18n.t('tutorialScript.step.forgeCollect.title'), text: i18n.t('tutorialScript.step.forgeCollect.text') },
  forge_close:   { phase: 3, kind: 'task', title: i18n.t('tutorialScript.step.forgeClose.title'), text: i18n.t('tutorialScript.step.forgeClose.text') },
  bond_talk:     { phase: 4, kind: 'talk', dialog: 'bond',       title: i18n.t('tutorialScript.step.bondTalk.title'), text: i18n.t('tutorialScript.talkToPaladill') },
  pet:           { phase: 4, kind: 'task', title: i18n.t('tutorialScript.step.pet.title'), text: i18n.t('tutorialScript.step.pet.text') },
  feed:          { phase: 4, kind: 'task', title: i18n.t('tutorialScript.step.feed.title'), text: i18n.t('tutorialScript.step.feed.text') },
  ult_talk:      { phase: 4, kind: 'talk', dialog: 'ultimate',   title: i18n.t('tutorialScript.step.ultTalk.title'), text: i18n.t('tutorialScript.talkToPaladill') },
  runes_talk:    { phase: 5, kind: 'talk', dialog: 'runes',      title: i18n.t('tutorialScript.step.runesTalk.title'), text: i18n.t('tutorialScript.talkToPaladill') },
  runes:         { phase: 5, kind: 'task', title: i18n.t('tutorialScript.step.runes.title'), text: i18n.t('tutorialScript.step.runes.text') },
  grad_talk:     { phase: 6, kind: 'talk', dialog: 'graduation', title: i18n.t('tutorialScript.step.gradTalk.title'), text: i18n.t('tutorialScript.talkToPaladill') },
  done:          { phase: 7, kind: 'done', title: i18n.t('tutorialScript.step.done.title'), text: i18n.t('tutorialScript.step.done.text') },
};

export const ORDER = Object.keys(STEPS);

/** Conversaciones (cada entrada es una línea de Paladill; `me` = respuesta del jugador como opción). */
export const DIALOGS = {
  alarm: [
    i18n.t('tutorialScript.dialog.alarm.1'),
    i18n.t('tutorialScript.dialog.alarm.2'),
  ],
  after_dojo: [
    i18n.t('tutorialScript.dialog.afterDojo.1'),
    i18n.t('tutorialScript.dialog.afterDojo.2'),
  ],
  duel: [
    i18n.t('tutorialScript.dialog.duel.1'),
    i18n.t('tutorialScript.dialog.duel.2'),
  ],
  duel_yield: [i18n.t('tutorialScript.dialog.duelYield.1')],
  duel_stop: [i18n.t('tutorialScript.dialog.duelStop.1')],
  forge: [
    i18n.t('tutorialScript.dialog.forge.1'),
    i18n.t('tutorialScript.dialog.forge.2'),
    i18n.t('tutorialScript.dialog.forge.3'),
  ],
  bond: [
    i18n.t('tutorialScript.dialog.bond.1'),
    i18n.t('tutorialScript.dialog.bond.2'),
  ],
  ultimate: [
    i18n.t('tutorialScript.dialog.ultimate.1'),
    i18n.t('tutorialScript.dialog.ultimate.2'),
    i18n.t('tutorialScript.dialog.ultimate.3'),
  ],
  runes: [
    i18n.t('tutorialScript.dialog.runes.1'),
    i18n.t('tutorialScript.dialog.runes.2'),
    i18n.t('tutorialScript.dialog.runes.3'),
  ],
  graduation: [
    i18n.t('tutorialScript.dialog.graduation.1'),
    i18n.t('tutorialScript.dialog.graduation.2'),
  ],
  // Recordatorios cortos si el jugador habla con Paladill durante una tarea
  remind_equip_sword: [i18n.t('tutorialScript.dialog.remindEquipSword.1')],
  remind_chop: [i18n.t('tutorialScript.dialog.remindChop.1')],
  remind_forge: [i18n.t('tutorialScript.dialog.remindForge.1')],
  remind_pet: [i18n.t('tutorialScript.dialog.remindPet.1')],
  remind_runes: [i18n.t('tutorialScript.dialog.remindRunes.1')],
  ambient: [i18n.t('tutorialScript.dialog.ambient.1')],
};

/** Consejos del maestro durante los combates del tutorial (franja «coach»). */
export const COACH = {
  duel: i18n.t('tutorialScript.coach.duel'),
  ult_wait: i18n.t('tutorialScript.coach.ultWait'),
  ult_axie: i18n.t('tutorialScript.coach.ultAxie'),
  ult_done: i18n.t('tutorialScript.coach.ultDone'),
};

/** Mensajes al intentar usar algo que el tutorial aún no ha enseñado. */
export const LOCKED = {
  inventory: i18n.t('tutorialScript.locked.inventory'),
  squad: i18n.t('tutorialScript.locked.squad'),
  worldMap: i18n.t('tutorialScript.locked.worldMap'),
  forge: i18n.t('tutorialScript.locked.forge'),
  care: i18n.t('tutorialScript.locked.care'),
  runes: i18n.t('tutorialScript.locked.runes'),
  shop: i18n.t('tutorialScript.locked.shop'),
  gather: i18n.t('tutorialScript.locked.gather'),
};

/** Recompensas que da el tutorial (también las da «Saltar tutorial» si faltan). */
export const REWARDS = {
  duelGold: 50,
  bundle: { mat_wolf_tooth: 1, mat_wool: 1 },
  rune: 'neutral-pure-power',
  charm: 'neutral-awaken-stamp-m',
  food: ['food_berry', 'food_berry'],
};
