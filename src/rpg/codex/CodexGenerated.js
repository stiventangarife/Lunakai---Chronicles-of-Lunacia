// CodexGenerated.js — Hito 126 (fase C3) · Páginas del Códice que salen de los datos del juego.
//   · Bestiario: una ficha por quimera (ENEMY_ARCHETYPES), en silueta hasta vencerla (CodexModal.beasts).
//   · Tus cartas: las cartas de las partes de tu Axie principal (las mismas que usa el Escuadrón).
//   · Tu clase: los 6 hechizos de tu Sapidae. · Ultimates: las tres Duo Ultimate, con la tuya resaltada.
// Así los números (vida, PA, alcance, botín) no se quedan viejos cuando cambian las reglas.

import { ENEMY_ARCHETYPES, BIOME_SPAWN_POOLS, BIOME_TIER_CONFIG } from '../world/BiomeEnemyCatalog.js';
import { SPELLS_DB } from '../../tactics/data/SpellsDB.js';
import { MATERIALS } from '../../tactics/data/EconomyCatalog.js';
import { ITEMS_DB } from '../../tactics/ItemDatabase.js';
import { ULTIMATES, ultimateForClass } from '../../tactics/combat/UltimateSystem.js';
import { triadOf } from '../../tactics/combat/Elements.js';
import { getHeroSpells, SAPIDAE_CLASSES } from '../SaveSlotManager.js';
import { asset } from '../../ui/lk.js';
import * as i18n from '../../i18n/i18n.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = (k, p) => i18n.t(`codex.gen.${k}`, p);
const src = (p) => (p ? asset(String(p).replace(/^\.\//, '')) : '');
const BIOME_ORDER = ['forest', 'savannah', 'arctic', 'mystic', 'dungeon'];

// ------------------------------------------------------------------ Bestiario
/** Quimeras únicas (los alias del catálogo apuntan al mismo objeto), ordenadas por bioma. */
function beastList() {
  const seen = new Map();
  for (const [key, a] of Object.entries(ENEMY_ARCHETYPES)) {
    if (!a?.id || seen.has(a.id)) continue;
    let biome = BIOME_ORDER.find((b) => (BIOME_SPAWN_POOLS[b] || []).some((e) => e.archetypeId === a.id));
    // Las que no salen en las tablas (jefes) se reconocen por sus alias: «sapidae_dungeon» → Génesis
    if (!biome) biome = BIOME_ORDER.find((b) => Object.entries(ENEMY_ARCHETYPES).some(([k, x]) => x === a && k.endsWith(`_${b}`))) || 'dungeon';
    seen.set(a.id, { a, biome, boss: /boss/.test(a.role || '') });
  }
  return [...seen.values()].sort((x, y) => BIOME_ORDER.indexOf(x.biome) - BIOME_ORDER.indexOf(y.biome) || (x.boss - y.boss));
}
let _beasts = null;
export const BEASTS = () => (_beasts ||= beastList());
export const beastByType = (type) => BEASTS().find((b) => b.a.type === type || b.a.id === type) || null;

export function bestiaryPages() {
  return BEASTS().map((b) => ({ id: `b_${b.a.id}`, gen: 'beast', beast: b.a.id }));
}

function biomeName(b) { return BIOME_TIER_CONFIG[b]?.name || b; }

function spellLine(sid) {
  const sp = SPELLS_DB[sid];
  if (!sp) return '';
  const range = sp.maxRange > 0 ? `${sp.minRange === sp.maxRange ? sp.maxRange : `${sp.minRange}–${sp.maxRange}`}` : '0';
  return `<li>${sp.icon ? `<img src="${src(sp.icon)}" alt="">` : ''}<span><b>${esc(sp.name)}</b> <em>${esc(t('pa', { n: sp.paCost ?? '?' }))} · ${esc(t('range', { n: range }))}</em>${sp.description ? `<small>${esc(sp.description)}</small>` : ''}</span></li>`;
}

function dropName(id) { return MATERIALS[id]?.name || ITEMS_DB[id]?.name || id; }
function dropIcon(id) { return MATERIALS[id]?.icon || ITEMS_DB[id]?.icon || ''; }

function renderBeast(page, ctx) {
  const b = BEASTS().find((x) => x.a.id === page.beast);
  if (!b) return null;
  const a = b.a, wins = ctx.beasts?.[a.id] || 0, known = wins > 0;
  const cfg = BIOME_TIER_CONFIG[b.biome] || {};
  const art = `<div class="lk-cdx-beast ${known ? '' : 'lk-is-locked'}">
      <span class="lk-cdx-beast__biome">${esc(biomeName(b.biome))}${b.boss ? ` · ${esc(t('boss'))}` : ''}</span>
      <img src="${src(`assets/portraits/${a.type}.png`)}" alt="${known ? esc(a.name) : ''}">
      ${known ? '' : '<span class="lk-cdx-beast__q">?</span>'}
    </div>`;
  if (!known) {
    return { art, title: '???', body: `<p>${t('lockedBody', { biome: esc(biomeName(b.biome)) })}</p>`, tip: t('lockedTip') };
  }
  const hp = Math.round(a.baseStats.maxHP * (cfg.hpMultiplier || 1));
  const shield = Math.round((a.baseStats.initialShield || 0) + (cfg.shieldBonus || 0));
  const role = i18n.t(`codex.role.${a.role}`) !== `codex.role.${a.role}` ? i18n.t(`codex.role.${a.role}`) : a.role;
  const body = `
    <p class="lk-cdx-gen__role">${esc(role)}</p>
    <div class="lk-cdx-stats">
      <span><b>${hp}</b>${esc(t('hp'))}</span><span><b>${shield}</b>${esc(t('shield'))}</span>
      <span><b>${a.baseStats.maxPA}</b>${esc(t('ap'))}</span><span><b>${a.baseStats.maxPM}</b>${esc(t('mp'))}</span>
    </div>
    <h5 class="lk-cdx-gen__h">${esc(t('abilities'))}</h5>
    <ul class="lk-cdx-list">${(a.spellIds || []).map(spellLine).join('')}</ul>
    <h5 class="lk-cdx-gen__h">${esc(t('loot'))}</h5>
    <p class="lk-cdx-drops">${(a.possibleDrops || []).map((d) => `<span>${dropIcon(d) ? `<img src="${src(dropIcon(d))}" alt="">` : ''}${esc(dropName(d))}</span>`).join('')}</p>`;
  return { art, title: a.name, body, tip: t('wins', { n: wins }) };
}

// ------------------------------------------------------------------ Tus cartas (Axie principal)
function mainAxie(em) {
  const id = em?.getSquad?.()[1];
  const base = id ? em.heroesBase?.[id] : null;
  return base ? { id, base } : null;
}
function axieCardIds(id, base) {
  const resolver = typeof window !== 'undefined' ? window.lunakaiParts : null;
  const fromParts = resolver && (base.modelType === 'axie' || base.axieId) ? resolver.idsFor(base) : null;
  return fromParts || base.spellIds || getHeroSpells(base.heroKey || base.axieId) || [];
}

function renderAxieCards(page, ctx) {
  const m = mainAxie(ctx.em);
  if (!m) return { art: '', title: t('cardsTitle'), body: `<p>${esc(t('noAxie'))}</p>` };
  const cards = axieCardIds(m.id, m.base).map((sid) => SPELLS_DB[sid]).filter(Boolean);
  const art = `<div class="lk-cdx-cards">${cards.slice(0, 6).map((c, i) => `<img src="${src(c.art || c.icon)}" alt="${esc(c.name)}" style="--i:${i}">`).join('')}</div>`;
  const parts = cards.map((c) => `<li>${c.partIcon ? `<img src="${src(c.partIcon)}" alt="">` : ''}<span><b>${esc(c.name)}</b> <em>${esc(i18n.t(`codex.part.${c.part}`) || c.part)} · ${esc(t('pa', { n: c.paCost ?? '?' }))}</em>${c.description ? `<small>${esc(c.description)}</small>` : ''}</span></li>`).join('');
  return {
    art,
    title: t('cardsTitle'),
    body: `<p>${t('cardsLead', { name: esc(m.base.name || '') })}</p><ul class="lk-cdx-list">${parts}</ul>`,
    tip: t('cardsTip'),
  };
}

// ------------------------------------------------------------------ Tu Sapidae (clase y hechizos)
function renderSapidaeClass(page, ctx) {
  const s = ctx.em?.heroesBase?.sapidae;
  const key = s?.sapidaeClassKey || 'crafter';
  const cls = SAPIDAE_CLASSES[key];
  if (!cls) return null;
  const spells = (cls.spells || []);
  const art = `<div class="lk-cdx-class"><img class="lk-cdx-class__ico" src="${src(cls.iconImg || cls.icon)}" alt="">
      <div class="lk-cdx-class__grid">${(cls.spellPreviews || []).map((p) => `<img src="${src(p.icon)}" alt="" title="${esc(SPELLS_DB[p.id]?.name || p.name)}">`).join('')}</div></div>`;
  return {
    art,
    title: cls.name,
    body: `<p class="lk-cdx-gen__role">${esc(cls.title || '')}</p><p>${esc(cls.description || '')}</p>
      <h5 class="lk-cdx-gen__h">${esc(t('spells'))}</h5><ul class="lk-cdx-list">${spells.map(spellLine).join('')}</ul>`,
    tip: t('classTip'),
  };
}

// ------------------------------------------------------------------ Las tres Ultimate
const TRIAD_COL = { assault: 'var(--lk-class-beast, #E9A23B)', bastion: 'var(--lk-class-plant, #6CC24A)', torrent: 'var(--lk-class-aquatic, #3FB6E8)' };

function renderUltimates(page, ctx) {
  const m = mainAxie(ctx.em);
  const mine = m ? ultimateForClass(m.base.class) : null;
  const list = Object.values(ULTIMATES);
  const art = `<div class="lk-cdx-ults">${list.map((u) => `<div class="lk-cdx-ult ${mine?.id === u.id ? 'lk-is-mine' : ''}" style="--c:${TRIAD_COL[u.triad]}">
      <span class="lk-cdx-ult__triad">${esc(i18n.t(`codex.art.${u.triad}`))}</span><b>${esc(u.name)}</b>${mine?.id === u.id ? `<em>${esc(t('yours'))}</em>` : ''}</div>`).join('')}</div>`;
  const body = `<p>${t('ultLead')}</p><ul class="lk-cdx-list lk-cdx-list--ult">${list.map((u) => `<li style="--c:${TRIAD_COL[u.triad]}"><span><b>${esc(u.name)}</b> <em>${esc(i18n.t(`codex.art.${u.triad}`))}</em><small>${esc(u.description || '')}</small></span></li>`).join('')}</ul>
    ${m ? `<p>${t('ultMine', { name: esc(m.base.name || ''), triad: esc(i18n.t(`codex.art.${triadOf(m.base.class) || 'assault'}`)), ult: esc(mine?.name || '—') })}</p>` : ''}`;
  return { art, title: t('ultTitle'), body, tip: t('ultTip') };
}

const RENDER = { beast: renderBeast, axieCards: renderAxieCards, sapidaeClass: renderSapidaeClass, ultimates: renderUltimates };
/** { art (html), title, body (html), tip? } o null si no hay datos. */
export function renderGenerated(page, ctx = {}) {
  try { return RENDER[page.gen]?.(page, ctx) || null; } catch (e) { console.warn('[Codex] página generada', page.gen, e); return null; }
}
