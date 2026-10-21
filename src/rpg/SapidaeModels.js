// SapidaeModels.js — Modelos del Sapidae del jugador (21-oct).
// Ema (femenina) y Kai (masculino) son los modelos nuevos con piezas intercambiables: dos peinados (Ema), tres cuernos,
// dos atuendos (Ema) y atlas de expresiones (ojos y boca, 2 × 2 cada uno). Los modelos antiguos (sapidae-f-a, sapidae-m-a…)
// los siguen usando los NPC; las partidas del jugador pasan a Ema / Kai al cargarse.

/** Clave del modelo → archivo y datos. La clave mantiene el prefijo «sapidae-f/m» que usa el resto del juego. */
export const SAPIDAE_BASES = {
  'sapidae-f-ema': { file: 'Sapidae_Ema.glb', name: 'Ema', gender: 'f', label: 'Femenina' },
  'sapidae-m-kai': { file: 'Sapidae_Kai.glb', name: 'Kai', gender: 'm', label: 'Masculina' },
};
export const DEFAULT_SAPIDAE_MODEL = 'sapidae-f-ema';

/** Modelos del jugador de antes del 21-oct → su equivalente nuevo. */
export const LEGACY_PLAYER_MODELS = {
  'sapidae-f-a': 'sapidae-f-ema', 'sapidae-female': 'sapidae-f-ema', 'Sapidae_female': 'sapidae-f-ema',
  'sapidae-m-a': 'sapidae-m-kai',
};

/** Modelo del jugador actualizado (los antiguos pasan a Ema / Kai). */
export function playerSapidaeModel(key) {
  if (!key) return DEFAULT_SAPIDAE_MODEL;
  return LEGACY_PLAYER_MODELS[key] || key;
}

/** Ruta del GLB de un modelo de Sapidae (clave nueva, clave antigua o nombre de archivo). */
export function sapidaeModelUrl(key) {
  const k = String(key || DEFAULT_SAPIDAE_MODEL);
  const base = SAPIDAE_BASES[k];
  if (base) return `./assets/models/${base.file}`;
  return `./assets/models/${k.endsWith('.glb') ? k : `${k}.glb`}`;
}

export const isFemaleSapidae = (key) => (SAPIDAE_BASES[key]?.gender || (/-f-|female/i.test(String(key)) ? 'f' : 'm')) === 'f';
