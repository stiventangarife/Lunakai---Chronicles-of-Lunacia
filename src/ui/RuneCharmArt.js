// RuneCharmArt.js — Arte de las runas y los charms (assets/ui/runes-charms.json: «runes/<id>» o «charms/<id>» → imagen).
// Se carga una sola vez y lo comparten el panel de Runas, la Tienda, el botín y las tarjetas de recompensa (Hito 54).

import { asset } from './lk.js';

let ART = null;
let loading = null;

/** Carga el arte (una vez). Devuelve el mapa id → imagen. */
export function loadRuneCharmArt() {
  if (ART) return Promise.resolve(ART);
  loading = loading || fetch(asset('assets/ui/runes-charms.json')).then((r) => r.json()).then((m) => (ART = m)).catch(() => (ART = {}));
  return loading;
}

/** Imagen de una runa (kind 'runes') o un charm ('charms'); '' si aún no ha cargado o no tiene. */
export const runeCharmArt = (kind, id) => (ART ? ART[`${kind}/${id}`] || '' : '');

/** ¿Ya está cargado el arte? */
export const runeCharmArtReady = () => Boolean(ART);
