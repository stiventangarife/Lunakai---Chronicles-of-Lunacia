// RoninItemsService.js — Hito 75: runas y charms NFT («Ronin», ERC-1155) de la cuenta de Sky Mavis.
// Lee lo que hay en las direcciones Ronin del jugador (función de servidor axie-data · op 'items'), empareja cada
// token con el catálogo del juego por nombre (y clase si el nombre se repite) y da una copia jugable mientras siga
// en la billetera (RuneCharmService.setRonin). Solo lectura: nunca mueve ni gasta el NFT.

import { RUNES, CHARMS } from '../tactics/data/RunesCharms.js';
import { RuneCharmService } from './RuneCharmService.js';
import { axieMixerService } from './AxieMixerService.js';
import { canLoadAccountAxies } from './AccountAxiesService.js';

const CLASSES = ['aquatic', 'beast', 'bird', 'bug', 'plant', 'reptile', 'mech', 'dawn', 'dusk', 'neutral'];
/** Nombre comparable: sin acentos, sin temporada ni paréntesis, solo letras y números. */
export const normName = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\bseason\s*\d+\b|\bs\d+\b/g, ' ').replace(/[^a-z0-9]+/g, '');

const index = { runes: null, charms: null };
function byName(kind) {
  if (index[kind]) return index[kind];
  const m = new Map();
  (kind === 'runes' ? RUNES : CHARMS).forEach((x) => { const k = normName(x.name); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
  return (index[kind] = m);
}

/** id del catálogo para un token NFT (null si no hay ninguno con ese nombre). */
export function matchToken(kind, token) {
  const list = byName(kind).get(normName(token?.name));
  if (!list?.length) return null;
  if (list.length === 1) return list[0].id;
  const text = `${token.name || ''} ${token.description || ''}`.toLowerCase();
  const cls = CLASSES.find((c) => text.includes(c));
  return (list.find((x) => x.class === cls) || list[0]).id;
}

/**
 * Lee la cuenta y actualiza las copias Ronin. Sin sesión de Sky Mavis no hace nada.
 * @returns {Promise<{ ok: boolean, code?: string, runes?: number, charms?: number, unmatched?: string[] }>}
 */
export async function syncRoninItems({ fetchItems = null } = {}) {
  if (!fetchItems && !canLoadAccountAxies()) return { ok: false, code: 'no_session' };
  let res;
  try { res = await (fetchItems ? fetchItems() : axieMixerService.fetchOwnedItems()); }
  catch (err) { return { ok: false, code: err?.code || 'error' }; }
  const next = { runes: {}, charms: {} }, unmatched = [];
  for (const kind of ['runes', 'charms']) {
    for (const tok of res?.[kind] || []) {
      const id = matchToken(kind, tok);
      if (!id) { unmatched.push(String(tok?.name || tok?.tokenId)); continue; }
      next[kind][id] = (next[kind][id] || 0) + Math.max(0, Number(tok.total) || 0);
    }
  }
  RuneCharmService.setRonin(next);
  const sum = (m) => Object.values(m).reduce((a, b) => a + b, 0);
  return { ok: true, runes: sum(next.runes), charms: sum(next.charms), unmatched };
}
