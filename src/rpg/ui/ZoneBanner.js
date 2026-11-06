// ZoneBanner.js — Rótulo de zona al entrar (Crónica Celeste: banner de juego con medallón de bioma).
// Sustituye al antiguo «zone-discovery-banner» de ZoneTransitionManager, que solo delega aquí.
import { ISLANDS_REGISTRY, MAP_REGISTRY } from '../world/MapRegistry.js';
import * as i18n from '../../i18n/i18n.js';

const BIOMES = {
  forest: { label: i18n.t('hud.biomeForest'), color: '#4ADE80' },
  arctic: { label: i18n.t('hud.biomeArctic'), color: '#7DD3FC' },
  savannah: { label: i18n.t('hud.biomeSavannah'), color: '#FAC651' },
  mystic: { label: i18n.t('hud.biomeMystic'), color: '#FFB3CA' },
  dungeon: { label: i18n.t('hud.biomeGenesis'), color: '#A5B4FC' }
};
// Mismos glifos dibujados que las tarjetas del mapa del archipiélago
const GLYPH = {
  forest: '<path d="M32 10l-11 15h6l-9 12h7l-9 12h32l-9-12h7l-9-12h6z"/><path d="M32 49v7"/>',
  arctic: '<path d="M32 10v44M13 21l38 22M13 43l38-22"/><path d="M26 13l6 6 6-6M26 51l6-6 6 6M12 28l8-1-3-7M52 36l-8 1 3 7M12 36l8 1-3 7M52 28l-8-1 3-7"/>',
  savannah: '<circle cx="32" cy="24" r="8"/><path d="M32 9v3M19 24h-3M48 24h-3M22.8 14.8l2.1 2.1M41.2 14.8l-2.1 2.1"/><path d="M8 48c6-6 12-6 18-1s12 5 18 0 10-5 12-3"/><path d="M8 55h48"/>',
  mystic: '<path d="M38 11a19 19 0 1 0 15 30 15 15 0 1 1-15-30z"/><path d="M45 15l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="currentColor"/>',
  dungeon: '<path d="M12 22h40M15 16h34"/><path d="M19 22v32M45 22v32M19 32h26"/><path d="M32 36l3 5-3 5-3-5z" fill="currentColor"/><path d="M10 54h44"/>'
};

/** «🌲 Forest» / «✨ Genesis» / 'forest' → clave de bioma. */
function biomeKey(badge) {
  const t = String(badge || '').toLowerCase();
  if (/arctic|ártico|artico/.test(t)) return 'arctic';
  if (/savann|sabana|desert/.test(t)) return 'savannah';
  if (/mystic|místic|mistic/.test(t)) return 'mystic';
  if (/genesis|génesis|dungeon/.test(t)) return 'dungeon';
  return 'forest';
}

const SEEN_KEY = 'lk_zones_seen';
/** Id estable de la zona (p. ej. 'zone_2_2') a partir de su nombre visible, que depende del idioma. */
function zoneIdOf(name) {
  const def = Object.values(MAP_REGISTRY).find((d) => d && d.name === name);
  return (def && def.id) || null;
}
/**
 * Marca la zona como vista y dice si es nueva. Se guarda por id estable (no cambia con el idioma); las partidas
 * antiguas guardaban el NOMBRE: si está el nombre en cualquiera de los dos idiomas, cuenta como vista y se añade su id.
 */
function markSeen(name, zoneId) {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    const id = zoneId || zoneIdOf(name) || name;
    if (seen.includes(id)) return false;
    const names = [name, i18n.inLang(name, 'es'), i18n.inLang(name, 'en')];
    const wasSeen = names.some((n) => seen.includes(n));
    seen.push(id); localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-200)));
    return !wasSeen;
  } catch { return false; }
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let el = null, timer = 0, outTimer = 0;
function ensure() {
  if (el && el.isConnected) return el;
  el = document.getElementById('lk-zone-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lk-zone-banner';
    el.className = 'lk-ui lk-zone hidden';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

/** Muestra el rótulo de la zona. `badge` admite la etiqueta antigua («🌲 Forest») o la clave del bioma. `zoneId` (opcional): id estable; si falta se busca por el nombre. */
export function showZoneBanner(zoneName, badge, ms = 3600, zoneId = null) {
  const key = biomeKey(badge);
  const b = BIOMES[key];
  const island = Object.values(ISLANDS_REGISTRY).find((i) => i && i.biome === key);
  const isNew = markSeen(zoneName, zoneId);
  const root = ensure();
  root.style.setProperty('--zc', b.color);
  root.innerHTML = `
    <div class="lk-zone__band">
      <span class="lk-zone__med"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[key]}</svg></span>
      <span class="lk-zone__kicker"><i></i>${esc(b.label)}<i></i></span>
      <h2 class="lk-zone__name">${esc(zoneName)}</h2>
      <span class="lk-zone__line"><i></i></span>
      <span class="lk-zone__sub">${isNew ? `<b>${i18n.t('hud.zoneDiscovered')}</b> · ` : ''}${esc(island?.name || 'Lunacia')}</span>
    </div>`;
  clearTimeout(timer); clearTimeout(outTimer);
  root.classList.remove('hidden', 'lk-is-out', 'lk-is-on');
  void root.offsetWidth; // reinicia la animación de entrada
  root.classList.add('lk-is-on');
  timer = setTimeout(() => {
    root.classList.add('lk-is-out');
    outTimer = setTimeout(() => root.classList.add('hidden'), 600);
  }, ms);
}

/** Quita el rótulo al instante y cancela su cuenta atrás (p. ej. la cinemática del prólogo, que cubre la carga inicial del mundo). */
export function hideZoneBanner() {
  clearTimeout(timer); clearTimeout(outTimer);
  const root = (el && el.isConnected) ? el : document.getElementById('lk-zone-banner');
  if (root) root.classList.add('hidden');
}
