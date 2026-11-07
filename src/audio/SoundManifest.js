// SoundManifest.js — Lista de las grabaciones de audio que existen (Hito 140).
//
// SfxBank (efectos) y AmbienceManager (fondos en bucle) son opcionales: si la grabación existe suena; si no, el juego
// la sintetiza. Antes pedían cada archivo para averiguarlo y cada uno que faltaba dejaba un 404 en la consola. Ahora
// se lee una sola vez assets/sounds/sfx/manifest.json y solo se pide lo que está en la lista.
//
//   { "sfx": ["steps/step_grass_1.mp3", …],       rutas relativas a assets/sounds/sfx/
//     "ambience": ["sea_waves_loop.mp3", …] }      rutas relativas a assets/sounds/ambience/
//
// REGLA: al añadir o quitar una grabación, actualizar la lista y subir ASSET_VERSION (la lista se pide con ?v=).
// Si la lista no está o no se puede leer, todo suena sintetizado y no se pide nada más.

import { v as withVersion } from '../render/AssetVersion.js';

const MANIFEST_URL = './assets/sounds/sfx/manifest.json';
let promise = null;
let data = null;

const toSet = (a) => new Set(Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []);

/** Pide la lista una sola vez por sesión. Siempre se cumple: { sfx: Set, ambience: Set } (vacíos si falla). */
export function loadSoundManifest() {
  if (!promise) {
    const req = typeof fetch === 'function'
      ? fetch(withVersion(MANIFEST_URL)).then((r) => (r.ok ? r.json() : null))
      : Promise.resolve(null);
    promise = req.catch(() => null).then((j) => { data = { sfx: toSet(j && j.sfx), ambience: toSet(j && j.ambience) }; return data; });
  }
  return promise;
}

/** La lista si ya llegó; null si todavía no (y la pide). */
export function soundManifest() {
  if (!data) loadSoundManifest();
  return data;
}
