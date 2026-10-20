// AxiePartsResolver.js — Las 6 cartas de cualquier Axie a partir de sus partes reales.
//
// Orden de resolución (la primera que funcione):
//   1. Caché en la ranura de guardado (slot.partCards[axieId]) — funciona sin conexión.
//   2. API de Sky Mavis (AxieMixerService.fetchAxieData → parts { name, class, type }) → catálogo por clase + parte + nombre.
//   3. Genes decodificados (Axie Mixer) + tabla variante → nombre (tactics/data/PartVariants.js, la genera tools/part-mapper.html).
//   4. Sin resolver: se devuelve null y el Axie conserva sus hechizos de siempre (no se inventan cartas).
//
// Las cartas se devuelven en el orden de las 6 ranuras del HUD: ojos, orejas, boca, cuerno, espalda, cola.
// Clases secretas (Mech, Dawn, Dusk): cada parte usa la carta de su propia clase; la clase del Axie solo cuenta para el
// triángulo elemental y la Ultimate.

import { findPartCard, PART_CARDS } from '../tactics/data/PartCards.js';
import { PART_VARIANTS } from '../tactics/data/PartVariants.js';
import { collectionOf, collectionCardFor, COLLECTION_CARDS } from '../tactics/data/CollectionCards.js';
import { registerVariantCard, variantId, partStage, VARIANT_CARDS, anyPartCard } from '../tactics/data/VariantCards.js';

/** Versión de las variantes (nombre de colección y nivel 2): las cachés anteriores se actualizan al haber conexión. */
const VARIANT_VERSION = 1;

/**
 * Variantes de las 6 cartas a partir de las partes de Sky Mavis (19-oct): nombre de la parte de colección
 * («Deadly Pogona», «Dark Kiss») y partes de nivel 2 (id terminado en «-2»). Devuelve { ids, variants }.
 */
export function applyVariants(ids, collections = [], apiParts = []) {
  const out = [...ids];
  const variants = [];
  PART_ORDER.forEach((type, i) => {
    const base = anyPartCard(out[i]);
    if (!base) return;
    const p = (apiParts || []).find((x) => TYPE_KEY[lc(x.type)] === type) || null;
    const stage = partStage(p);
    const name = p?.name || base.name;
    const renamed = lc(name) !== lc(base.name);
    if (stage < 2 && !renamed) return;
    const def = { id: variantId(base.id, name, stage), baseId: base.id, name, collection: collections[i] || base.collection || null, stage };
    if (registerVariantCard(def)) { out[i] = def.id; variants.push(def); }
  });
  return { ids: out, variants };
}

export const PART_ORDER = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
const TYPE_KEY = { eyes: 'eyes', eye: 'eyes', ears: 'ears', ear: 'ears', mouth: 'mouth', horn: 'horn', back: 'back', tail: 'tail' };
const API_TIMEOUT_MS = 3500;
const CACHE_VERSION = 2; // v2: colecciones especiales (Japan, Xmas, Mystic…)

const lc = (s) => String(s || '').toLowerCase();

/** Nombre limpio a partir del id de la API ("horn-dual-blade-2" → "dual blade"). */
function nameFromPartId(id, type) {
  return lc(id).replace(new RegExp(`^${type}-`), '').replace(/-(\d+|japan|xmas|summer|shiny|mystic|origin|meo)(-.*)?$/, '').replace(/-/g, ' ');
}

/**
 * Partes de la API → { ids:[6], parts:[...], missing:[...] }.
 * parts: [{ id, name, class, type }]
 */
export function cardsFromApiParts(parts = []) {
  const byType = {};
  const missing = [];
  for (const p of parts || []) {
    const type = TYPE_KEY[lc(p.type)];
    if (!type) continue;
    const cls = lc(p.class);
    const card = findPartCard(cls, type, p.name) || (p.id ? findPartCard(cls, type, nameFromPartId(p.id, type)) : null);
    if (card) byType[type] = card.id;
    else missing.push({ type, class: cls, name: p.name, id: p.id });
  }
  const ids = PART_ORDER.map((t) => byType[t] || null);
  return { ids, missing, complete: ids.every(Boolean) };
}

/**
 * Genes decodificados → cartas, con la tabla de variantes.
 * decoded: [{ type:'horn', class:'Beast', variant:2 }] (formato normalizado; ver normalizeDecoded)
 */
export function cardsFromDecoded(decoded = [], variants = PART_VARIANTS) {
  const byType = {};
  const missing = [];
  for (const d of decoded) {
    const type = TYPE_KEY[lc(d.type)];
    if (!type) continue;
    const key = `${lc(d.class)}-${type}-${String(d.variant).padStart(2, '0')}`;
    const name = variants[key];
    const card = name ? findPartCard(lc(d.class), type, name) : null;
    if (card) byType[type] = card.id;
    else missing.push({ type, class: lc(d.class), variant: d.variant, key });
  }
  const ids = PART_ORDER.map((t) => byType[t] || null);
  return { ids, missing, complete: ids.every(Boolean) };
}

/**
 * Colecciones especiales (Japan, Xmas, Mystic, Summer, Nightmare, Shiny, Bionic) a partir de los genes decodificados.
 * Las partes Japan y Xmas cambian su carta base por su carta de colección (mismo efecto, otro nombre e ilustración).
 * Devuelve { ids, collections } con las 6 ranuras en el orden del HUD.
 */
export function applyCollections(ids, decoded = []) {
  const out = [...ids];
  const collections = PART_ORDER.map(() => null);
  for (const d of decoded) {
    const type = TYPE_KEY[lc(d.type)];
    const i = PART_ORDER.indexOf(type);
    if (i < 0) continue;
    const col = collectionOf(d.skin);
    if (!col) continue;
    collections[i] = col;
    const card = collectionCardFor(lc(d.class), type, d.variant, d.skin);
    if (card && out[i] === card.baseCardId) out[i] = card.id;
  }
  return { ids: out, collections };
}

/** Acepta varias formas de salida del decodificador del Mixer y devuelve [{type, class, variant}]. */
export function normalizeDecoded(raw) {
  if (!raw) return [];
  const src = raw.parts || raw.descriptor?.parts || raw;
  const list = Array.isArray(src) ? src : Object.entries(src).map(([type, v]) => ({ type, ...(typeof v === 'object' ? v : {}) }));
  return list.map((p) => ({
    type: p.type || p.partType || p.slot,
    class: p.class || p.className || p.cls,
    variant: p.variant ?? p.index ?? p.partIndex,
    skin: Number(p.skin) || 0,
  })).filter((p) => p.type && p.class && p.variant != null);
}

export class AxiePartsResolver {
  /**
   * deps.fetchAxie(axieId) → { parts } (AxieMixerService.fetchAxieData)
   * deps.decodeGenes(genes) → salida del decodificador del Mixer (opcional)
   * deps.slots → SaveSlotManager (caché por ranura)
   */
  constructor({ fetchAxie = null, decodeGenes = null, slots = null } = {}) {
    this.fetchAxie = fetchAxie;
    this.decodeGenes = decodeGenes;
    this.slots = slots;
    this.memory = {};
  }

  _cache() {
    const slot = this.slots?.getActiveSlot?.();
    if (!slot) return this.memory;
    if (!slot.partCards || typeof slot.partCards !== 'object') slot.partCards = {};
    return slot.partCards;
  }

  /** Resultado guardado para un Axie (o null). */
  cached(axieId) {
    const c = axieId ? this._cache()[String(axieId)] : null;
    if (c && Array.isArray(c.variants)) c.variants.forEach((d) => registerVariantCard(d)); // recrea sus cartas variantes
    return c && c.v === CACHE_VERSION && Array.isArray(c.ids) && c.ids.every((id) => PART_CARDS[id] || COLLECTION_CARDS[id] || VARIANT_CARDS[id]) ? c : null;
  }

  _store(axieId, res) {
    res.v = CACHE_VERSION;
    this._cache()[String(axieId)] = res;
    const sm = this.slots;
    if (sm?.activeSlotId && sm.getActiveSlot?.() && typeof sm._saveToStorage === 'function') sm._saveToStorage([sm.activeSlotId]);
    return res;
  }

  /** Ids de las 6 cartas si ya se conocen (síncrono, para crear unidades). */
  idsFor(hero) {
    return this.cached(hero?.axieId)?.ids || null;
  }

  /** { idDeCarta: colección } de las partes de colección especial de un Axie (para el VFX). */
  collectionsFor(hero) {
    const c = this.cached(hero?.axieId);
    if (!c?.collections) return {};
    return Object.fromEntries(c.ids.map((id, i) => [id, c.collections[i]]).filter(([, col]) => col));
  }

  async _collections(ids, genes) {
    if (!genes || !this.decodeGenes) return { ids, collections: PART_ORDER.map(() => null) };
    try { return applyCollections(ids, normalizeDecoded(await this.decodeGenes(genes))); }
    catch { return { ids, collections: PART_ORDER.map(() => null) }; }
  }

  /**
   * Resuelve (y guarda) las cartas de un Axie. hero: { axieId, genes }.
   * Devuelve { ids, source: 'cache'|'api'|'genes', missing } o null.
   */
  async resolve(hero, { force = false } = {}) {
    const axieId = hero?.axieId ? String(hero.axieId) : null;
    if (!axieId && !hero?.genes) return null;
    let stale = null;
    if (!force && axieId) {
      const c = this.cached(axieId);
      if (c && (c.vv === VARIANT_VERSION || !this.fetchAxie)) return { ...c, source: 'cache' };
      stale = c; // caché sin variantes: se intenta actualizar; si no hay conexión, se usa tal cual
    }
    let apiParts = null;
    // 2. API
    let genes = hero?.genes || null;
    if (axieId && this.fetchAxie) {
      try {
        const data = await Promise.race([
          this.fetchAxie(axieId),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), API_TIMEOUT_MS)),
        ]);
        if (data?.parts?.length) {
          apiParts = data.parts.map((p) => ({ id: p.id, name: p.name, class: p.class, type: p.type, stage: p.stage }));
          const r = cardsFromApiParts(data.parts);
          if (r.complete) {
            const col = await this._collections(r.ids, data.newGenes || hero?.genes);
            const vr = applyVariants(col.ids, col.collections, apiParts);
            const res = { ids: vr.ids, variants: vr.variants, vv: VARIANT_VERSION, collections: col.collections, from: 'api', parts: apiParts, at: Date.now() };
            this._store(axieId, res);
            return { ...res, source: 'api', missing: [] };
          }
          // Partes con skin especial (místicas, Japón, navidad, verano, Shiny…) tienen otro nombre en la API
          // pero sus genes apuntan a la parte base: se resuelven por los genes que devuelve la propia API.
          if (r.missing.length) console.info(`[AxiePartsResolver] Axie #${axieId}: partes por nombre especial, se usan los genes`, r.missing.map((m) => m.name));
        }
        genes = data?.newGenes || genes; // solo el formato de 512 bits (newGenes)
      } catch (err) {
        console.warn(`[AxiePartsResolver] API no disponible para #${axieId}:`, err.message || err);
      }
    }
    // 3. Genes + tabla de variantes
    if (genes && this.decodeGenes) {
      try {
        const decoded = normalizeDecoded(await this.decodeGenes(genes));
        const r = cardsFromDecoded(decoded);
        if (r.complete) {
          const col = applyCollections(r.ids, decoded);
          // Nombres de colección y nivel 2: de las partes de la API si llegaron (aunque no casaran por nombre)
          const vr = applyVariants(col.ids, col.collections, apiParts || []);
          const res = { ids: vr.ids, variants: vr.variants, vv: VARIANT_VERSION, collections: col.collections, from: 'genes', parts: apiParts || undefined, at: Date.now() };
          if (axieId) this._store(axieId, res);
          return { ...res, source: 'genes', missing: [] };
        }
        if (r.missing.length) console.warn(`[AxiePartsResolver] variantes sin nombre (genera PartVariants.js con tools/part-mapper.html):`, r.missing.map((m) => m.key));
      } catch (err) {
        console.warn('[AxiePartsResolver] No se pudieron decodificar los genes:', err.message || err);
      }
    }
    return stale ? { ...stale, source: 'cache' } : null;
  }

  /** Informe de cobertura para la consola (lkDebug.auditParts). */
  async audit(heroes = []) {
    const rows = [];
    for (const h of heroes) {
      const r = await this.resolve(h, { force: true });
      rows.push({
        axie: h.name || h.axieId, id: h.axieId,
        fuente: r?.source || '—',
        cartas: r ? r.ids.map((id, i) => anyPartCard(id)?.name + (r.collections?.[i] ? ` [${r.collections[i]}]` : '')).join(' · ') : 'sin resolver (usa sus hechizos de siempre)',
      });
    }
    return rows;
  }
}
