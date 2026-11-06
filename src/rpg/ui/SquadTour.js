// SquadTour.js — Hito 126 · Recorrido del Escuadrón la primera vez que se abre (tras graduarse).
//
// Tres tarjetas (PanelTour.js): ① Líder, Principal y Apoyo · ② la colección · ③ «Cargar mis Axies».
// Lo lanza TutorialDirector (flags.squadTour) y también el botón «?» de la cabecera del Escuadrón.
//
// API: const tour = startSquadTour(squadModal, { onDone(completed) }); tour.stop();

import { canLoadAccountAxies } from '../AccountAxiesService.js';
import { startPanelTour } from './PanelTour.js';
import * as i18n from '../../i18n/i18n.js';

const NS = 'tutorialDirector.squadTour';

export function startSquadTour(modal, { onDone } = {}) {
  if (!modal?.root) return null;
  return startPanelTour(modal, {
    ns: NS,
    codex: 'squad',
    onDone,
    steps: [
      { el: () => modal.$('slots'), key: 'roles' },
      { el: () => modal.$('col'), key: 'collection', scroll: true },
      { el: () => modal.$('loadAx'), key: 'load', text: () => i18n.t(canLoadAccountAxies() ? `${NS}.loadText` : `${NS}.loadTextGuest`) },
    ],
  });
}
