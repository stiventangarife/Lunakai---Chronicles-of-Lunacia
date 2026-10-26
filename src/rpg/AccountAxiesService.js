// AccountAxiesService.js — Hito 75: trae a la partida los demás Axies de la cuenta de Sky Mavis.
// Usa la misma función de servidor que la creación de partida (axie-data · op 'owned'): las direcciones Ronin
// las guarda el servidor al iniciar sesión, y la API key de Sky Mavis nunca llega al navegador.
// Cada Axie pasa a ser un héroe «ax_<id>» de la partida (EquipmentManager.syncAccountAxies): nivel 1, su propio
// equipo y sus cartas de partes reales (AxiePartsResolver).

import { axieMixerService } from './AxieMixerService.js';
import { axieBaseStats } from '../tactics/data/AxieBaseStats.js';
import { accountManager } from '../net/AccountManager.js';

export class AccountAxiesError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

const cap = (c) => { const t = String(c || 'Beast'); return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); };

/** Héroe a partir de los datos de Sky Mavis de un Axie (mismo formato que la creación de partida). */
export function heroFromAxieData(data) {
  const id = String(data.id);
  const cls = cap(data.class);
  return {
    axieId: id, heroKey: `axie_${id}`, name: data.name || `Axie #${id}`, class: cls,
    archetype: `${cls} (Axie #${id})`, genes: data.newGenes || data.genes || null,
    image: data.image || null, axpInfo: data.axpInfo || null,
  };
}

/** ¿Hay sesión de Sky Mavis? (como Invitado o con correo no hay cuenta de la que leer Axies) */
export function canLoadAccountAxies() {
  return accountManager?.getSessionView?.()?.mode === 'skymavis';
}

/** ID de Axie a partir de lo que se escriba: «12345», «#12345» o un enlace del marketplace. */
export function parseAxieId(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/axie\/(\d+)/i) || t.match(/^#?\s*(\d{1,10})$/);
  if (m) return m[1];
  const runs = t.match(/\d+/g) || [];
  return runs.sort((a, b) => b.length - a.length)[0] || '';
}

/**
 * Hito 75: carga un Axie cualquiera por su ID (también como invitado) y lo pone en la colección, en nivel 1.
 * @returns {Promise<{ ok: true, heroId: string, name: string } | { ok: false, code: 'empty'|'companion'|'already'|'not_found'|'error', name?: string }>}
 */
export async function loadAxieById(em, raw) {
  const id = parseAxieId(raw);
  if (!id) return { ok: false, code: 'empty' };
  if (String(em.heroesBase.kotaro?.axieId || '') === id) return { ok: false, code: 'companion', name: em.heroesBase.kotaro?.name };
  const prev = em.heroesBase[`ax_${id}`];
  if (prev && em.unlockedHeroes.includes(`ax_${id}`)) return { ok: false, code: 'already', name: prev.name };
  let data = null;
  try { data = await axieMixerService.fetchAxieData(id); } catch { data = null; }
  if (!data || !(data.newGenes || data.genes)) return { ok: false, code: navigator.onLine === false ? 'error' : 'not_found', id };
  const h = heroFromAxieData(data);
  const resolver = typeof window !== 'undefined' ? window.lunakaiParts : null;
  const res = resolver ? await resolver.resolve(h).catch(() => null) : null;
  if (res?.ids?.length) h.spellIds = res.ids;
  Object.assign(h, axieBaseStats(h.class, res?.ids || []));
  const heroId = em.addAxieById(h);
  return { ok: true, heroId, name: h.name };
}

/**
 * Carga los Axies de la cuenta y los pone en la partida.
 * @param {import('../tactics/EquipmentManager.js').EquipmentManager} em
 * @param {{ fetchOwned?: () => Promise<object[]>, onProgress?: (done:number, total:number) => void }} [opts]
 * @returns {Promise<{ added: string[], removed: string[], total: number }>}
 */
export async function loadAccountAxies(em, { fetchOwned = null, onProgress = null } = {}) {
  if (!em) throw new AccountAxiesError('no_game');
  if (!fetchOwned && !canLoadAccountAxies()) throw new AccountAxiesError('no_session');
  const list = await (fetchOwned ? fetchOwned() : axieMixerService.fetchOwnedAxies());
  const heroes = (Array.isArray(list) ? list : []).filter((a) => a && a.id && (a.newGenes || a.genes)).map(heroFromAxieData);
  // Cartas de partes (para sus estadísticas y su mazo); de 3 en 3 para no saturar la red
  const resolver = typeof window !== 'undefined' ? window.lunakaiParts : null;
  let done = 0;
  for (let i = 0; i < heroes.length; i += 3) {
    await Promise.all(heroes.slice(i, i + 3).map(async (h) => {
      const res = resolver ? await resolver.resolve(h).catch(() => null) : null;
      if (res?.ids?.length) h.spellIds = res.ids;
      Object.assign(h, axieBaseStats(h.class, res?.ids || []));
      done += 1;
      onProgress?.(done, heroes.length);
    }));
  }
  return em.syncAccountAxies(heroes);
}
