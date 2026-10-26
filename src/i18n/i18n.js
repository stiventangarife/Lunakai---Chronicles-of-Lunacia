// i18n.js — Textos del jugador en dos idiomas (Hito 59). Solo traduce cadenas visibles: ids, claves de guardado,
// clases CSS y datos internos no pasan por aquí.
//
// · t('modulo.clave', { n: 3 }) devuelve el texto en el idioma activo; los {marcadores} se rellenan con params.
//   Marcadores que el propio juego rellena después ({heroName}, {axieName}…) se dejan tal cual si no van en params.
// · El idioma se lee una vez al cargar la página (Opciones › Accesibilidad › Idioma, en axie_lk_prefs.lang).
//   Cambiarlo guarda la partida y recarga (SettingsModal), así que los textos pueden calcularse al cargar un módulo.
// · Idioma por defecto para un jugador nuevo: inglés. Si falta una clave en un idioma se usa el otro y, en último
//   caso, la propia clave (así una clave olvidada se ve y se corrige).
// · Diccionarios por módulo en i18n/es/*.js e i18n/en/*.js (mismas claves en los dos); index.js de cada idioma los junta.
import ES from './es/index.js';
import EN from './en/index.js';

export const LANGS = ['en', 'es'];
export const DEFAULT_LANG = 'en';
const PREFS_KEY = 'axie_lk_prefs';
const DICTS = { es: ES, en: EN };

function readLang() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (LANGS.includes(p.lang)) return p.lang;
  } catch (_) { /* sin almacenamiento */ }
  return DEFAULT_LANG;
}

const LANG = readLang();
try { document.documentElement.lang = LANG; } catch (_) { /* fuera del navegador */ }

/** Idioma activo ('en' | 'es'). */
export function lang() { return LANG; }

/** Texto traducido. params: { nombre: valor } para los marcadores {nombre}. */
export function t(key, params) {
  let s = DICTS[LANG][key];
  if (s === undefined) s = DICTS[LANG === 'es' ? 'en' : 'es'][key];
  if (s === undefined) return key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined && params[k] !== null ? String(params[k]) : m));
  return s;
}

/** Elige entre dos textos ya escritos ({ es, en }) — para listas cortas de datos. */
export function pick(o) { return (o && (o[LANG] ?? o.en ?? o.es)) ?? ''; }

/** Formato de números según el idioma (1.234 / 1,234). */
export function num(n) { try { return Number(n).toLocaleString(LANG === 'es' ? 'es-ES' : 'en-US'); } catch (_) { return String(n); } }

/**
 * Versión inglesa de un texto ya traducido (Hito 60). Para el código que decide cosas buscando palabras dentro de un
 * texto (p. ej. la navegación lee los pasos de misión): así se comporta igual en los dos idiomas. Si el texto no
 * viene del diccionario, se devuelve tal cual.
 */
const _toLang = {};
/** Texto ya traducido → el mismo texto en `target` ('es' | 'en'). Si no viene del diccionario, se devuelve tal cual. */
export function inLang(text, target) {
  if (LANG === target || typeof text !== 'string' || !DICTS[target]) return text;
  let map = _toLang[target];
  if (!map) {
    map = _toLang[target] = new Map();
    for (const [k, v] of Object.entries(DICTS[LANG])) if (!map.has(v) && DICTS[target][k] !== undefined) map.set(v, DICTS[target][k]);
  }
  return map.get(text) ?? text;
}
export function en(text) { return inLang(text, 'en'); }

/**
 * Listas de datos grandes (cartas, runas…) — Hito 61. Los datos se quedan como están en su archivo; esto cambia los
 * campos de texto de cada entrada por los del idioma activo, buscando `${prefix}.${entry.id}.${campo}` en el
 * diccionario. Un campo sin clave se queda como está. Devuelve la misma lista.
 */
export function applyText(list, prefix, fields) {
  const D = DICTS[LANG];
  const each = Array.isArray(list) ? list : Object.values(list || {});
  for (const e of each) {
    if (!e || e.id === undefined) continue;
    for (const f of fields) {
      const s = D[`${prefix}.${e.id}.${f}`];
      if (s !== undefined) e[f] = s;
    }
  }
  return list;
}

if (typeof window !== 'undefined') window.lkI18n = { t, lang, LANGS };
