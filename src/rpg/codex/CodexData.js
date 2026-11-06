// CodexData.js — Hito 126 · Códice de Lunacia: capítulos y páginas.
//
// Cada capítulo: { id, icon (assets/ui/icons), pages: [...] }. Cada página: { id, img? | art? (CodexArt.js) | gen? (CodexGenerated.js), action? }.
// Los textos salen de i18n: codex.<capítulo>.<página>.title / .body / .tip (el consejo es opcional).
// action: { id, label } → CodexModal._runAction(id) abre el panel del juego (cierra el Códice antes).
// C1: estructura. C2: páginas de los capítulos 0–7 y 11 con diagramas. C3: páginas generadas (Bestiario, cartas, Sapidae).

import { bestiaryPages } from './CodexGenerated.js';

const IMG = (n) => `assets/ui/codex/${n}.webp`;

export const CODEX_CHAPTERS = [
  { id: 'loop', icon: 'replay', pages: [
    { id: 'intro', img: IMG('01_mundo') },
    { id: 'cycle', art: 'loop' },
    { id: 'battle', img: IMG('02_combate') },
  ] },
  { id: 'equipment', icon: 'equipable', pages: [
    { id: 'intro', img: IMG('03_mochila'), action: { id: 'inventory', label: 'codex.action.inventory' } },
    { id: 'tiers', img: IMG('08_forja_panel') },
  ] },
  { id: 'squad', icon: 'team', pages: [
    { id: 'intro', img: IMG('04_escuadron'), action: { id: 'squad', label: 'codex.action.squad' } },
    { id: 'classes', art: 'triangle' },
    { id: 'account', img: IMG('17_escuadron_id') },
  ] },
  { id: 'economy', icon: 'resource', pages: [
    { id: 'intro', img: IMG('05_tienda') },
    { id: 'currencies', art: 'currencies' },
    { id: 'market', img: IMG('06_mercado') },
  ] },
  { id: 'forge', icon: 'build', pages: [
    { id: 'intro', img: IMG('08_forja_panel') },
    { id: 'gather', img: IMG('07_forja_recolectar') },
    { id: 'time', img: IMG('18_forja_acelerar') },
  ] },
  { id: 'runes', icon: 'rune', pages: [
    { id: 'intro', img: IMG('09_runas'), action: { id: 'runes', label: 'codex.action.runes' } },
    { id: 'where', img: IMG('06_mercado') },
  ] },
  { id: 'koliseo', icon: 'tournament', pages: [
    { id: 'intro', img: IMG('13_arena_combate'), action: { id: 'koliseo', label: 'codex.action.koliseo' } },
    { id: 'season', img: IMG('19_arena_clasificacion') },
  ] },
  { id: 'mist', icon: 'vision', pages: [
    { id: 'intro', img: IMG('14_bruma'), action: { id: 'mist', label: 'codex.action.mist' } },
    { id: 'rewards', img: IMG('20_bruma_clasificacion') },
  ] },
  { id: 'bestiary', icon: 'pve', pages: [{ id: 'intro', img: IMG('02_combate') }, ...bestiaryPages()] },
  { id: 'axieSkills', icon: 'axie', pages: [{ id: 'intro', img: IMG('16_cartas_axie') }, { id: 'yours', gen: 'axieCards' }] },
  { id: 'sapidae', icon: 'sword', pages: [
    { id: 'intro', img: IMG('11_ultimate') },
    { id: 'class', gen: 'sapidaeClass' },
    { id: 'ultimates', gen: 'ultimates' },
    { id: 'bond', img: IMG('10_cuidados') },
  ] },
  { id: 'terrain', icon: 'grid', pages: [
    { id: 'intro', img: IMG('02_combate') },
    { id: 'sight', img: IMG('11_ultimate') },
  ] },
];

/** Clave única de una página: 'capítulo/página'. */
export const pageKey = (chapterId, pageId) => `${chapterId}/${pageId}`;

export function findChapter(id) { return CODEX_CHAPTERS.find((c) => c.id === id) || null; }

export function allPageKeys() {
  return CODEX_CHAPTERS.flatMap((c) => c.pages.map((p) => pageKey(c.id, p.id)));
}
