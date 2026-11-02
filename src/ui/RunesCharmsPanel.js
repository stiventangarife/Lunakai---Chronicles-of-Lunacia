// RunesCharmsPanel.js — Pestaña «Runas y charms» de la Mochila (Crónica Celeste · pantalla 17 «Preparación»).
//
// Las runas y los charms son la forma de mejorar las habilidades de cada Axie (sustituyen al antiguo panel de mejora).
// Vive dentro de la Mochila (InventoryModal), en la columna derecha, y usa la misma fila de retratos para elegir Axie:
//   · Arriba: la runa del Axie (1, de su clase o neutral) y sus Potential Points (15).
//   · En medio: sus 6 partes reales; los charms se engarzan en las partes (neutral → cualquiera; de clase → solo esa clase).
//   · Abajo: la estantería de runas y charms.
// Clic en una runa → se equipa; clic en la ranura de la runa → se retira. Clic en una parte → queda elegida; clic en un charm →
// se engarza; clic otra vez en la parte elegida → se retira. Lo equipado se guarda en la ranura (RuneCharmService).
// Tecla U: abre la Mochila en esta pestaña (attachRunesCharms, enganchado desde main.js).

import { RUNES, CHARMS, RUNE_BY_ID, CHARM_BY_ID, PP_MAX, runeFits, charmFits, ppAllocate, ppCanSet } from '../tactics/data/RunesCharms.js';
import { RuneCharmService, PART_ORDER } from '../rpg/RuneCharmService.js';
import { syncRoninItems } from '../rpg/RoninItemsService.js';
import { CHARM_FX, buildCardOverride } from '../tactics/combat/RuneCharmEffects.js';
import { SPELLS_DB } from '../tactics/Spells.js';
import { STARTER_DECKS } from '../tactics/data/StarterCards.js';
import { getHeroSpells } from '../rpg/SaveSlotManager.js';
import { asset, toast, tooltip, esc, skillTip } from './lk.js';
import { loadRuneCharmArt, runeCharmArt, runeCharmArtReady } from './RuneCharmArt.js';
import * as i18n from '../i18n/i18n.js';
import { PART_UNLOCK_LEVEL } from '../tactics/combat/SkillUnlocks.js'; // Hito 98

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const CLS_ES = { beast: i18n.t('runesPanel.clsBeast'), bird: i18n.t('runesPanel.clsBird'), plant: i18n.t('runesPanel.clsPlant'), aquatic: i18n.t('runesPanel.clsAquatic'), bug: i18n.t('runesPanel.clsBug'), reptile: i18n.t('runesPanel.clsReptile'), mech: i18n.t('runesPanel.clsMech'), dawn: i18n.t('runesPanel.clsDawn'), dusk: i18n.t('runesPanel.clsDusk'), neutral: i18n.t('runesPanel.clsNeutral') };
const PART_ES = { eyes: i18n.t('runesPanel.partEyes'), ears: i18n.t('runesPanel.partEars'), mouth: i18n.t('runesPanel.partMouth'), horn: i18n.t('runesPanel.partHorn'), back: i18n.t('runesPanel.partBack'), tail: i18n.t('runesPanel.partTail') };
const RAR_ES = { common: i18n.t('runesPanel.rarCommon'), rare: i18n.t('runesPanel.rarRare'), epic: i18n.t('runesPanel.rarEpic'), mystic: i18n.t('runesPanel.rarMystic'), secret: i18n.t('runesPanel.rarSecret'), neutral: i18n.t('runesPanel.clsNeutral') };
const runeRar = (r) => (['rare', 'epic', 'mystic'].includes(r) ? r : r === 'secret' ? 'epic' : 'common');
const clsPng = (c) => asset(`assets/classes/${c === 'dusk' ? 'dust' : c}.png`); // el icono de Dusk se llama dust.png
const clsImg = (c) => (c && c !== 'neutral' ? `<img src="${clsPng(c)}" alt="">` : '');

// Arte compartido con la Tienda, el botín y las recompensas (ui/RuneCharmArt.js)
const loadArt = loadRuneCharmArt;
const art = runeCharmArt;

/** ¿Este Axie tiene algo pendiente (sin runa o con charms por engarzar)? Para el aviso de la pestaña. */
export function runesPending(heroId) {
  const eq = RuneCharmService.get(heroId);
  // Hito 54: solo avisa si tienes alguna runa libre que ponerle
  return !eq.rune && RuneCharmService.list('runes').some((r) => r.free > 0);
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Vista de runas y charms dentro de un contenedor.
 * @param {HTMLElement} host
 * @param {{ equipmentManager: object, classOf: (id:string)=>string, onChange?: ()=>void, onPickHero?: (id:string)=>void, heroIds?: ()=>string[] }} opts
 */
export function createRunesView(host, { equipmentManager, classOf, onChange = null, onPickHero = null, heroIds = null }) {
  // Hito 74: «Solo compatibles» empieza apagado: la estantería enseña todo lo que tienes (lo compatible primero, lo
  // demás atenuado con candado). Antes una runa o un charm de otra clase sacado de una bolsa no se veía.
  const S = { hero: null, part: 'eyes', shelf: 'charms', onlyFit: false, sort: 'pp', flash: null, drag: null };
  const em = () => equipmentManager;
  const base = (id) => em()?.heroesBase?.[id];
  const tried = {};
  /** Hito 98: nivel necesario para la habilidad de la parte si aún está bloqueada (0 = desbloqueada). */
  const lockLv = (id, k) => {
    const need = PART_UNLOCK_LEVEL[k] || 1;
    const lvl = em()?.getProgression?.(id)?.level ?? 1;
    return lvl < need ? need : 0;
  };

  function cardIds(id) {
    const b = base(id);
    const resolver = window.lunakaiParts;
    if (resolver && b && (b.modelType === 'axie' || b.axieId)) {
      const ids = resolver.idsFor(b);
      if (ids) return ids;
      const key = String(b.axieId || id);
      if (!tried[key]) { tried[key] = 1; resolver.resolve(b).catch(() => null).then((res) => { if (res?.ids && host.isConnected && !host.hidden && S.hero === id) render(id); }); }
    }
    return STARTER_DECKS[id] || (id === 'kotaro' ? (b?.spellIds || getHeroSpells(b?.heroKey || b?.axieId)) : b?.spellIds) || [];
  }
  /** Las 6 partes con su clase (la de la carta de la parte; si no, la del Axie). */
  function parts(id) {
    const cls = classOf(id);
    const cards = cardIds(id).map((sid) => SPELLS_DB[sid]).filter(Boolean);
    return PART_ORDER.map((p) => {
      const sp = cards.find((c) => c.part === p);
      const pc = sp?.class && CLS_ES[sp.class] ? sp.class : (sp?.partIcon || '').match(/parts\/(\w+)-/)?.[1] || cls;
      return { k: p, cls: pc, sp, name: sp?.name || PART_ES[p], icon: sp?.partIcon || asset(`assets/parts/${['mech', 'dawn', 'dusk'].includes(pc) ? cls : pc}-${p}.png`) };
    });
  }
  const spellArt = (x) => { const a = x.sp?.art || x.sp?.icon; return a && a !== x.icon && !/\/parts\//.test(a) ? a : null; };
  const rangeTxt = (sp) => (sp?.minRange != null ? `${i18n.t('runesPanel.rangeAbbr')} ${sp.minRange}${sp.maxRange !== sp.minRange ? `–${sp.maxRange}` : ''}` : '');

  /** Ficha de la habilidad de una parte (mismo formato que en combate). */
  function skillTipHTML(x) {
    const sp = x.sp;
    if (!sp) return '';
    const fx0 = (sp.effects || []).find((e) => ['damage', 'heal', 'shield'].includes(e.type));
    const fx = fx0?.type === 'damage' ? 'dmg' : fx0?.type || null;
    const value = fx0 ? (fx0.min != null ? `${fx0.min}${fx0.max && fx0.max !== fx0.min ? `–${fx0.max}` : ''}` : fx0.amount ?? null) : null;
    const range = sp.minRange != null ? `${sp.minRange}${sp.maxRange !== sp.minRange ? `–${sp.maxRange}` : ''}` : null;
    const lk = S.hero ? lockLv(S.hero, x.k) : 0;
    return skillTip({ warn: lk ? i18n.t('runesPanel.lockedSkill', { n: lk }) : '', name: sp.name, kind: `${i18n.t('runesPanel.skill')} · ${PART_ES[x.k]} · ${CLS_ES[x.cls] || x.cls}`, cost: sp.paCost, range, los: sp.requiresLoS !== false, fx, value, desc: esc(sp.description || ''), art: spellArt(x), color: `var(--lk-class-${x.cls})`, iconHtml: `<img src="${x.icon}" alt="" style="width:26px;height:26px;object-fit:contain">`, spell: sp });
  }

  /**
   * Cómo cambia la habilidad de la parte con un charm (RuneCharmEffects.buildCardOverride): filas { label, before, after }
   * para el «antes → después». null si el charm no cambia la carta (vida, iniciativa, efectos al usarla…: lo dice su texto).
   */
  function charmPreview(charm, part) {
    const sp = part?.sp, fx = charm && CHARM_FX[charm.id];
    if (!sp || !fx) return null;
    const ov = buildCardOverride(sp, [{ fx, name: charm.name }], null);
    if (!ov) return null;
    const rows = [];
    const range = (s) => `${s.minRange}${s.maxRange !== s.minRange ? `–${s.maxRange}` : ''}`;
    const dmg = (s) => (s.baseMinDamage ? (s.baseMinDamage === s.baseMaxDamage ? `${s.baseMinDamage}` : `${s.baseMinDamage}–${s.baseMaxDamage}`) : null);
    if (ov.paCost !== sp.paCost) rows.push({ label: i18n.t('runesPanel.cost'), before: i18n.t('runesPanel.apN', { n: sp.paCost }), after: i18n.t('runesPanel.apN', { n: ov.paCost }) });
    if (ov.maxRange !== sp.maxRange) rows.push({ label: i18n.t('runesPanel.range'), before: `${i18n.t('runesPanel.rangeAbbr')} ${range(sp)}`, after: `${i18n.t('runesPanel.rangeAbbr')} ${range(ov)}` });
    if (ov.requiresLoS !== sp.requiresLoS) rows.push({ label: i18n.t('runesPanel.los'), before: i18n.t('runesPanel.required'), after: i18n.t('runesPanel.notRequired') });
    if (dmg(ov) && dmg(ov) !== dmg(sp)) rows.push({ label: i18n.t('runesPanel.damage'), before: dmg(sp), after: dmg(ov) });
    if (ov.shieldAmount != null && ov.shieldAmount !== sp.shieldAmount) rows.push({ label: i18n.t('runesPanel.shield'), before: `+${sp.shieldAmount}`, after: `+${ov.shieldAmount}` });
    if (ov.baseMinHeal != null && ov.baseMinHeal !== sp.baseMinHeal) rows.push({ label: i18n.t('runesPanel.healing'), before: `+${sp.baseMinHeal}`, after: `+${ov.baseMinHeal}` });
    return rows.length ? rows : null;
  }

  function tipHTML(kind, x, part = null) {
    if (!x) return '';
    const isRune = kind === 'runes';
    const c = x.class === 'neutral' ? 'var(--lk-gilt-300)' : `var(--lk-class-${x.class})`;
    const meta = isRune ? `${i18n.t('runesPanel.rune')} · ${CLS_ES[x.class]} · ${RAR_ES[x.rarity] || x.rarity}` : `Charm · ${CLS_ES[x.class]} · ${x.pp} PP`;
    let extra = '';
    if (!isRune && part) {
      const rows = charmPreview(x, part);
      extra = rows ? `<div class="lk-tt-stats">${rows.map((r) => `<span class="lk-tt-stat">${esc(r.label)}<b>${esc(r.before)} → ${esc(r.after)}</b></span>`).join('')}</div>`
        : `<p class="lk-bag-runes__tt-on">${i18n.t('runesPanel.onPart', { name: esc(part.name), part: PART_ES[part.k] })}</p>`;
    }
    return `<div class="lk-tooltip-tactical" style="--c:${c}"><header>${art(kind, x.id) ? `<span class="lk-sigil"><img src="${art(kind, x.id)}" alt="" style="width:26px;height:26px;object-fit:contain"></span>` : ''}<div><small>${meta}</small><b>${esc(x.name)}</b></div></header>
      <div class="lk-tt-body">${extra}<p>${x.desc ? esc(x.desc) : i18n.t('runesPanel.fxPending')}</p></div></div>`;
  }

  function changed(flash) { tooltip.hide(); S.flash = flash || null; render(S.hero); onChange?.(); }

  /** Rombos de PP (la unidad lunar del sistema): disponibles, gastados y vista previa de un coste. */
  /**
   * Rombos de PP pintados del color de su clase (GDD §3), agrupados por clase: los libres primero y luego los gastados.
   * next (opcional) = reparto con el charm que se está mirando: sus PP se marcan como vista previa (o en rojo si no caben).
   */
  function ppHTML(pp, next = null) {
    return Object.entries(pp.pools).map(([c, n]) => {
      const free = Math.max(0, Math.min(n, pp.left[c] ?? n));
      const freeAfter = next ? Math.max(0, Math.min(n, next.left[c] ?? n)) : free;
      const over = next && next.over[c] ? true : false;
      const pips = Array.from({ length: n }, (_, i) => {
        const spent = i >= free;
        const prev = !spent && next && i >= freeAfter;
        const st = spent ? 'lk-is-spent' : over ? 'lk-is-over' : prev ? 'lk-is-preview' : '';
        return `<i class="lk-bag-runes__pip lk-has-cls ${st}"></i>`;
      }).join('');
      return `<span class="lk-bag-runes__pipgrp" style="--c:var(--lk-class-${c})" title="${i18n.t('runesPanel.ppFreeTitle', { cls: CLS_ES[c] || c, free, n })}">${pips}</span>`;
    }).join('');
  }
  /** Leyenda corta bajo los rombos: «Bicho 3/7 · Bestia 0/2 · Pájaro 0/6», cada clase en su color. */
  const ppLegend = (pp) => Object.entries(pp.pools).map(([c, n]) => `<span style="color:var(--lk-class-${c})">${CLS_ES[c] || c} <b>${Math.max(0, pp.left[c] ?? n)}</b>/${n}</span>`).join(' · ');

  function render(heroId) {
    if (heroId !== S.hero) { S.hero = heroId; S.part = 'eyes'; }
    // Hito 75: la primera vez en la sesión se leen las runas y charms Ronin (NFT) de la cuenta de Sky Mavis
    if (!S.roninTried) {
      S.roninTried = true;
      syncRoninItems().then((r) => {
        if (r?.ok && (r.runes || r.charms)) toast(i18n.t('runesPanel.roninLoaded', { n: r.runes + r.charms }));
        if (r?.ok && host.isConnected && S.hero) render(S.hero);
      }).catch(() => null);
    }
    const b = base(heroId);
    if (!b || b.isSapidae || heroId === 'sapidae') {
      const axies = (heroIds ? heroIds() : []).filter((id) => base(id) && !base(id).isSapidae && id !== 'sapidae');
      host.innerHTML = `<div class="lk-bag-runes__empty"><img class="lk-ai" src="${I('rune')}" alt=""><b>${i18n.t('runesPanel.sapidaeNone')}</b><span>${i18n.t('runesPanel.sapidaePick')}</span>
        ${axies.length ? `<div class="lk-bag-runes__pick">${axies.map((id) => `<button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-pick="${id}"><span class="lk-b-ico"><img src="${clsPng(classOf(id))}" alt="" style="width:18px;height:18px"></span>${esc(base(id).name)}</button>`).join('')}</div>` : `<span>${i18n.t('runesPanel.noAxies')}</span>`}</div>`;
      host.querySelectorAll('[data-pick]').forEach((btn) => btn.addEventListener('click', () => onPickHero?.(btn.dataset.pick)));
      return;
    }
    if (!runeCharmArtReady()) loadArt().then(() => { if (S.hero === heroId && host.isConnected) render(heroId); });
    const id = heroId, cls = classOf(id), name = b.name || id;
    const eq = RuneCharmService.get(id), ps = parts(id);
    const rune = eq.rune && RUNE_BY_ID[eq.rune];
    // PP por clase (GDD §3): 3 de la clase del axie + 2 por parte para la clase de esa parte
    const pcls = Object.fromEntries(ps.map((x) => [x.k, x.cls]));
    const pp = ppAllocate(cls, pcls, eq.charms);
    const left = Math.max(0, pp.total - pp.totalUsed);
    const canSet = (c, partKey) => ppCanSet(cls, pcls, eq.charms, partKey, c.id);
    if (lockLv(id, S.part)) S.part = (ps.find((x) => !lockLv(id, x.k)) || ps[0])?.k || 'eyes'; // Hito 98
    const tp = ps.find((x) => x.k === S.part) || ps[0];
    const runeOk = (r) => runeFits(r, cls), charmOk = (c) => charmFits(c, tp.cls);
    const usedSet = new Set(Object.values(eq.charms).filter(Boolean));

    // Estantería
    // Solo lo que tienes (Hito 54): la bolsa de runas y charms, más lo que este Axie ya lleva puesto
    const free = (kind, x) => RuneCharmService.available(kind, x.id);
    const ownRunes = RUNES.filter((r) => RuneCharmService.owned('runes', r.id) > 0 || eq.rune === r.id);
    const ownCharms = CHARMS.filter((c) => RuneCharmService.owned('charms', c.id) > 0 || usedSet.has(c.id));
    let runes = ownRunes.filter((r) => !S.onlyFit || runeOk(r));
    let charms = ownCharms.filter((c) => (!S.onlyFit || charmOk(c)));
    const qtyTag = (n) => (n > 1 ? `<em class="lk-rc-qty">×${n}</em>` : '');
    const newTag = (kind, x) => (RuneCharmService.isNew(kind, x.id) ? `<em class="lk-rc-new" style="position:absolute;top:-6px;left:-6px;padding:1px 6px;border-radius:8px;background:#E5B85C;color:#2a1a05;font:700 .62rem/1.4 inherit;font-style:normal;box-shadow:0 1px 3px rgba(0,0,0,.4);pointer-events:none">${i18n.t('runesPanel.new')}</em>` : '');
    // Hito 75: copia Ronin (NFT de la cuenta) → icono de Ronin (assets/ui/icons/ronin.webp)
    const roninTag = (kind, x) => (RuneCharmService.roninCount(kind, x.id) > 0 ? `<img class="lk-rc-ronin" src="${asset('assets/ui/icons/ronin.webp')}" alt="Ronin" title="${i18n.t('runesPanel.roninTitle')}" style="position:absolute;z-index:3;bottom:26px;left:4px;width:20px;height:20px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));pointer-events:none">` : '');
    // Hito 110: regalo del tutorial (ligado a la partida, no se comercia) → candado, en el mismo sitio que el icono Ronin
    const boundTag = (kind, x) => (RuneCharmService.roninCount(kind, x.id) === 0 && RuneCharmService.boundCount?.(kind, x.id) > 0 ? `<img class="lk-rc-bound" src="${asset('assets/ui/icons/lock.png')}" alt="" title="${i18n.t('runesPanel.boundTitle')}" style="position:absolute;z-index:3;bottom:26px;left:4px;width:18px;height:18px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));pointer-events:none">` : '');
    const SORT = { pp: (a, z) => a.pp - z.pp || a.name.localeCompare(z.name), ppd: (a, z) => z.pp - a.pp || a.name.localeCompare(z.name), name: (a, z) => a.name.localeCompare(z.name) };
    runes = [...runes].sort((a, z) => runeOk(z) - runeOk(a) || a.name.localeCompare(z.name));
    charms = [...charms].sort((a, z) => charmOk(z) - charmOk(a) || SORT[S.sort](a, z));
    const shelf = S.shelf === 'runes'
      ? runes.map((r) => { const ok = runeOk(r), on = eq.rune === r.id, n = free('runes', r);
        return `<div class="lk-charm-item ${ok ? '' : 'lk-is-locked'}"><button type="button" class="lk-slot-item lk-is-rune ${on ? 'lk-is-selected' : ''} ${ok ? '' : 'lk-is-locked'} ${!on && !n ? 'lk-is-poor' : ''}" data-rune="${r.id}" draggable="${ok && !on && n > 0}" style="--r:var(--lk-rar-${runeRar(r.rarity)})" aria-label="${i18n.t('runesPanel.runeAria', { name: esc(r.name) })}${ok ? '' : ` ${i18n.t('runesPanel.notClass')}`}"><span class="lk-cc ${r.class === 'neutral' ? 'lk-n' : ''}">${r.class === 'neutral' ? 'N' : clsImg(r.class)}</span><span class="lk-art">${art('runes', r.id) ? `<img class="lk-charm-art" src="${art('runes', r.id)}" alt="" draggable="false">` : ''}</span><span class="lk-cap">${on ? i18n.t('runesPanel.equipped') : n ? i18n.t('runesPanel.rune') : i18n.t('runesPanel.inUse')}</span>${qtyTag(n)}${newTag('runes', r)}${roninTag('runes', r)}${boundTag('runes', r)}</button><small>${esc(r.name)}</small></div>`; }).join('')
      : charms.map((c) => { const ok = charmOk(c), on = usedSet.has(c.id), afford = canSet(c, tp.k).ok, n = free('charms', c);
        return `<div class="lk-charm-item ${ok ? '' : 'lk-is-locked'}"><button type="button" class="lk-slot-item ${on ? 'lk-is-selected' : ''} ${ok ? '' : 'lk-is-locked'} ${ok && !afford ? 'lk-is-poor' : ''}" data-charm="${c.id}" draggable="${ok}" style="--r:var(--lk-rar-${c.rarity})" aria-label="${esc(c.name)} · ${c.pp} PP${ok ? '' : ` ${i18n.t('runesPanel.notPart')}`}"><span class="lk-cc ${c.class === 'neutral' ? 'lk-n' : ''}">${c.class === 'neutral' ? 'N' : clsImg(c.class)}</span><span class="lk-art">${art('charms', c.id) ? `<img class="lk-charm-art" src="${art('charms', c.id)}" alt="" draggable="false">` : ''}</span><span class="lk-cap">${c.pp} PP</span>${qtyTag(n)}${newTag('charms', c)}${roninTag('charms', c)}${boundTag('charms', c)}</button><small>${esc(c.name)}</small></div>`; }).join('');

    // La estantería tiene su propio scroll: se conserva al equipar (misma lista) y vuelve arriba al cambiar de lista
    const shelfKey = [id, S.shelf, S.shelf === 'charms' ? S.part : '', S.onlyFit, S.sort].join('|');
    const keepScroll = shelfKey === S.shelfKey ? host.querySelector('.lk-shelf')?.scrollTop || 0 : 0;
    S.shelfKey = shelfKey;
    host.innerHTML = `
      <div class="lk-bag-runes__top">
        <div class="lk-rune-row">
          <button type="button" class="lk-socket-master-rune lk-bag-runes__rsock ${rune ? 'lk-has-art' : 'lk-is-empty'} ${S.flash === 'rune' ? 'lk-is-set' : ''}" data-ref="runeSocket" style="--c:var(--lk-class-${cls})" aria-label="${rune ? i18n.t('runesPanel.runeSocketAria', { name: esc(rune.name) }) : i18n.t('runesPanel.runeSocketEmpty')}">${rune && art('runes', rune.id) ? `<img class="lk-rune-art" src="${art('runes', rune.id)}" alt="">` : '<span class="lk-bag-runes__plus" aria-hidden="true">+</span>'}</button>
          <div><span class="lk-label" style="color:var(--lk-gilt-300)">${i18n.t('runesPanel.rune')} · ${CLS_ES[cls]}</span>
            <div class="lk-bag-runes__rname">${rune ? esc(rune.name) : i18n.t('runesPanel.noRune')}</div>
            ${rune ? `<span class="lk-rar-chip" data-r="${runeRar(rune.rarity)}">${RAR_ES[rune.rarity] || rune.rarity}</span>` : `<small class="lk-bag-runes__muted">${i18n.t('runesPanel.runeHint')}</small>`}</div>
        </div>
        <div class="lk-bag-runes__pp">
          <div class="lk-bag-runes__ppread"><span><b data-ref="ppLeft">${left}</b> / ${PP_MAX} PP</span><small data-ref="ppHint">${left === PP_MAX ? i18n.t('runesPanel.noCharms') : i18n.t('runesPanel.ppInUse', { n: PP_MAX - left })}</small></div>
          <div class="lk-bag-runes__pips" data-ref="pips" role="img" aria-label="${i18n.t('runesPanel.ppAria', { left, max: PP_MAX })} ${Object.entries(pp.pools).map(([c, n]) => i18n.t('runesPanel.ppAriaCls', { cls: CLS_ES[c] || c, free: Math.max(0, pp.left[c] ?? n), n })).join(', ')}">${ppHTML(pp)}</div>
          <small class="lk-bag-runes__ppleg">${ppLegend(pp)}</small>
          ${pp.ok ? '' : `<small class="lk-bag-runes__ppwarn">${i18n.t('runesPanel.ppWarn')}</small>`}
        </div>
      </div>
      <div class="lk-parts lk-bag-runes__parts">${ps.map((x) => {
        const ch = eq.charms[x.k] && CHARM_BY_ID[eq.charms[x.k]]; const tgt = x.k === S.part; const sa = spellArt(x), sp = x.sp;
        const lk = lockLv(id, x.k); // Hito 98: habilidad aún bloqueada → en gris y sin charms
        return `<div class="lk-part-row ${tgt ? 'lk-is-target' : ''} ${lk ? 'lk-is-locked' : ''}" data-row="${x.k}" ${lk ? `data-locked="${lk}" title="${esc(i18n.t('runesPanel.lockedCharm', { n: lk }))}"` : ''} style="--cc:var(--lk-class-${x.cls})">
          <span class="lk-spell lk-bag-runes__spell ${sa ? '' : 'lk-is-noart'}" data-skill="${x.k}" tabindex="0" aria-label="${i18n.t('runesPanel.skillAria', { name: esc(x.name) })}">${sa ? `<img src="${sa}" alt="">` : ''}<img class="lk-spell-part" src="${x.icon}" alt=""></span>
          <div class="lk-pn"><b>${esc(x.name)} <span class="lk-bag-runes__pk">${PART_ES[x.k]}</span></b><small><span class="lk-pc" style="--c:var(--lk-class-${x.cls})">${clsImg(x.cls)}${CLS_ES[x.cls] || x.cls}</span>${sp ? `${sp.paCost != null ? ` · ${i18n.t('runesPanel.apN', { n: sp.paCost })}` : ''}${rangeTxt(sp) ? ` · ${rangeTxt(sp)}` : ''}` : ''}${ch ? ` · <span class="lk-bag-runes__chn">${esc(ch.name)}</span>` : ''}${lk ? ` · <span class="lk-bag-runes__lock">🔒 ${i18n.t('runesPanel.lockedPart', { n: lk })}${ch ? ` · ${i18n.t('runesPanel.charmInactive')}` : ''}</span>` : ''}</small></div>
          <button type="button" class="lk-socket-charm ${ch ? 'lk-is-filled' : 'lk-is-empty'} ${tgt ? 'lk-is-target' : ''} ${S.flash === x.k ? 'lk-is-set' : ''} ${lk ? 'lk-is-locked' : ''}" data-part="${x.k}" ${lk && !ch ? 'aria-disabled="true"' : ''} style="--c:var(--lk-rar-${ch ? ch.rarity : 'common'})" aria-label="${PART_ES[x.k]}: ${ch ? i18n.t('runesPanel.charmSocketAria', { name: esc(ch.name) }) : i18n.t('runesPanel.charmSocketEmpty')}">${ch ? (art('charms', ch.id) ? `<img class="lk-charm-art" src="${art('charms', ch.id)}" alt="">` : '') : (lk ? '<span class="lk-bag-runes__plus" aria-hidden="true">🔒</span>' : '<span class="lk-bag-runes__plus" aria-hidden="true">+</span>')}</button><span class="lk-pp">${ch ? ch.pp + ' PP' : ''}</span></div>`;
      }).join('')}</div>
      <div class="lk-bag-runes__shelf" data-ref="shelfWrap" title="${i18n.t('runesPanel.dragHint')}">
        <div class="lk-bag-runes__bar">
          <div class="lk-segmented lk-bag-runes__kind" data-ref="kind"><button type="button" aria-pressed="${S.shelf === 'charms'}" data-k="charms"><img class="lk-ai" src="${I('charm')}" alt="">Charms</button><button type="button" aria-pressed="${S.shelf === 'runes'}" data-k="runes"><img class="lk-ai" src="${I('rune')}" alt="">${i18n.t('runesPanel.runes')}</button></div>
          ${S.shelf === 'charms' ? `<label class="lk-bag__sort lk-bag-runes__sort"><span class="lk-label">${i18n.t('runesPanel.sort')}</span><select data-ref="rsort" class="lk-input lk-select" aria-label="${i18n.t('runesPanel.sortAria')}"><option value="pp" ${S.sort === 'pp' ? 'selected' : ''}>PP ↑</option><option value="ppd" ${S.sort === 'ppd' ? 'selected' : ''}>PP ↓</option><option value="name" ${S.sort === 'name' ? 'selected' : ''}>${i18n.t('runesPanel.name')}</option></select></label>` : ''}
        </div>
        <div class="lk-bag-runes__bar lk-bag-runes__bar--fit">
          <button type="button" class="lk-fchip lk-no-ico" data-fit aria-pressed="${S.onlyFit}" title="${i18n.t('runesPanel.onlyFitTitle')}">${i18n.t('runesPanel.onlyFit')}</button>
          <span class="lk-bag-runes__hint">${S.shelf === 'runes' ? i18n.t('runesPanel.forRune', { name: esc(name), cls: CLS_ES[cls] }) : i18n.t('runesPanel.forPart', { name: esc(tp.name), part: PART_ES[tp.k], cls: CLS_ES[tp.cls] || tp.cls })}</span>
        </div>
        <div class="lk-shelf">${(S.shelf === 'runes' ? runes.length : charms.length) ? shelf
          : (S.shelf === 'runes' ? ownRunes.length : ownCharms.length)
            ? `<p class="lk-bag-runes__muted">${i18n.t('runesPanel.emptyFit')}</p>`
            : `<p class="lk-bag-runes__muted">${S.shelf === 'runes' ? i18n.t('runesPanel.noneRunes') : i18n.t('runesPanel.noneCharms')}</p>`}</div>
        <span class="lk-drag-hint">${i18n.t('runesPanel.dragHint')}</span>
      </div>`;
    S.flash = null;
    const shelfEl = host.querySelector('.lk-shelf'); if (shelfEl) shelfEl.scrollTop = keepScroll;
    // La marca «Nuevo» se ve una vez: al enseñar esta lista se quita (se volverá a ver en la próxima apertura)
    RuneCharmService.clearNew(S.shelf, (S.shelf === 'runes' ? runes : charms).map((x) => x.id));
    bind({ id, cls, name, eq, ps, tp, rune, left, runeOk, charmOk, pcls, pp });
  }

  // ------------------------------------------------------------------ acciones
  function equipRune(ctx, r) {
    const { id, cls, name, eq, runeOk } = ctx;
    if (!runeOk(r)) { toast(i18n.t('runesPanel.runeWrongClass', { rune: r.name, cls: CLS_ES[r.class], name, own: CLS_ES[cls] }), true); return; }
    if (eq.rune === r.id) return;
    if (!RuneCharmService.setRune(id, r.id)) { toast(i18n.t('runesPanel.runeTaken', { rune: r.name }), true); return; }
    changed('rune');
  }
  /** Texto de los PP que faltan: «2 PP de Bestia», «1 PP» (neutral). */
  const overTxt = (over) => Object.entries(over).map(([c, n]) => (c === 'neutral' ? `${n} PP` : i18n.t('runesPanel.ppOf', { n, cls: CLS_ES[c] || c }))).join(i18n.t('runesPanel.and'));

  function equipCharm(ctx, c, partKey) {
    const { id, eq, ps, cls, pcls } = ctx;
    const part = ps.find((x) => x.k === partKey);
    const lk = lockLv(id, partKey);
    if (lk) { toast(i18n.t('runesPanel.lockedCharm', { n: lk }), true); return; } // Hito 98
    if (!charmFits(c, part.cls)) { toast(i18n.t('runesPanel.charmWrongClass', { charm: c.name, cls: CLS_ES[c.class], part: part.name, pcls: CLS_ES[part.cls] || part.cls }), true); return; }
    if (Object.entries(eq.charms).some(([k, v]) => v === c.id && k !== partKey)) { toast(i18n.t('runesPanel.charmElsewhere'), true); return; }
    if (eq.charms[partKey] !== c.id && RuneCharmService.available('charms', c.id) < 1) { toast(i18n.t('runesPanel.charmTaken', { charm: c.name }), true); return; }
    const check = ppCanSet(cls, pcls, eq.charms, partKey, c.id);
    if (!check.ok || !RuneCharmService.setCharm(id, partKey, c.id, { axieClass: cls, partClasses: pcls })) {
      const s = host.querySelector(`.lk-socket-charm[data-part="${partKey}"]`); s?.classList.remove('lk-is-error'); void s?.offsetWidth; s?.classList.add('lk-is-error');
      toast(i18n.t('runesPanel.needPp', { pp: overTxt(check.over) || `${c.pp} PP`, charm: c.name }), true); return;
    }
    S.part = partKey; changed(partKey);
  }
  function scrollShelf() {
    const w = host.querySelector('[data-ref="shelfWrap"]');
    if (!w) return;
    const top = w.offsetTop - 8;
    if (host.scrollTop + host.clientHeight < top + 140) host.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
  }

  function bind(ctx) {
    const { id, eq, ps, tp, rune, left, cls, pcls } = ctx;
    const $ = (r) => host.querySelector(`[data-ref="${r}"]`);
    // Vista previa del coste en los rombos de PP (y en los PP de la clase que paga)
    const pips = $('pips'), hint = $('ppHint');
    const preview = (c) => {
      const cur = eq.charms[tp.k] ? CHARM_BY_ID[eq.charms[tp.k]]?.pp || 0 : 0;
      const check = ppCanSet(cls, pcls, eq.charms, tp.k, c.id);
      pips.innerHTML = ppHTML(ctx.pp, check.alloc || ppAllocate(cls, pcls, { ...eq.charms, [tp.k]: c.id }));
      if (!check.ok) hint.textContent = i18n.t('runesPanel.wouldNeed', { pp: overTxt(check.over) });
      else if (c.class !== 'neutral') hint.textContent = i18n.t('runesPanel.wouldLeaveCls', { n: Math.max(0, check.alloc.left[c.class] || 0), cls: CLS_ES[c.class] });
      else hint.textContent = i18n.t('runesPanel.wouldLeave', { n: Math.max(0, check.alloc.total - check.alloc.totalUsed) });
      hint.classList.toggle('lk-is-bad', !check.ok);
    };
    const unpreview = () => { pips.innerHTML = ppHTML(ctx.pp); hint.textContent = left === PP_MAX ? i18n.t('runesPanel.noCharms') : i18n.t('runesPanel.ppInUse', { n: PP_MAX - left }); hint.classList.remove('lk-is-bad'); };

    const rs = $('runeSocket');
    rs.addEventListener('click', () => {
      if (!rune) { S.shelf = 'runes'; render(id); scrollShelf(); return; }
      RuneCharmService.setRune(id, null); changed();
    });
    if (rune) tooltip.attach(rs, () => tipHTML('runes', rune));

    host.querySelectorAll('[data-skill]').forEach((el) => { const x = ps.find((q) => q.k === el.dataset.skill); if (x?.sp) tooltip.attach(el, () => skillTipHTML(x)); });
    host.querySelectorAll('[data-row]').forEach((row) => row.addEventListener('click', (e) => {
      if (e.target.closest('.lk-socket-charm, [data-skill]')) return;
      if (lockLv(id, row.dataset.row)) { toast(i18n.t('runesPanel.lockedCharm', { n: lockLv(id, row.dataset.row) }), true); return; } // Hito 98
      S.part = row.dataset.row; S.shelf = 'charms'; render(id);
    }));
    host.querySelectorAll('.lk-socket-charm').forEach((btn) => {
      const k = btn.dataset.part;
      btn.addEventListener('click', () => {
        if (eq.charms[k]) { RuneCharmService.setCharm(id, k, null); S.part = lockLv(id, k) ? S.part : k; changed(); return; } // se puede quitar aunque esté bloqueada
        if (lockLv(id, k)) { toast(i18n.t('runesPanel.lockedCharm', { n: lockLv(id, k) }), true); return; } // Hito 98
        S.part = k; S.shelf = 'charms'; render(id); scrollShelf();
      });
      const c = eq.charms[k] && CHARM_BY_ID[eq.charms[k]];
      if (c) tooltip.attach(btn, () => tipHTML('charms', c, ps.find((q) => q.k === k)));
    });

    $('kind').addEventListener('click', (e) => { const t = e.target.closest('button[data-k]'); if (!t) return; S.shelf = t.dataset.k; render(id); });
    $('rsort')?.addEventListener('change', (e) => { S.sort = e.target.value; render(id); });
    host.querySelector('[data-fit]').addEventListener('click', () => { S.onlyFit = !S.onlyFit; render(id); });

    host.querySelectorAll('[data-rune]').forEach((btn) => {
      const r = RUNE_BY_ID[btn.dataset.rune];
      tooltip.attach(btn, () => tipHTML('runes', r));
      btn.addEventListener('click', () => equipRune(ctx, r));
      dragSource(btn, { kind: 'rune', id: r.id });
    });
    host.querySelectorAll('[data-charm]').forEach((btn) => {
      const c = CHARM_BY_ID[btn.dataset.charm];
      tooltip.attach(btn, () => tipHTML('charms', c, tp));
      btn.addEventListener('mouseenter', () => { if (charmFits(c, tp.cls)) preview(c); });
      btn.addEventListener('mouseleave', unpreview);
      btn.addEventListener('click', () => equipCharm(ctx, c, tp.k));
      dragSource(btn, { kind: 'charm', id: c.id });
    });

    // Destinos de arrastre: la ranura de runa y las 6 ranuras de charm
    const drop = (el, accept, onDrop) => {
      el.addEventListener('dragover', (e) => { if (!S.drag || !accept(S.drag)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; el.classList.add('lk-is-over'); });
      el.addEventListener('dragleave', () => el.classList.remove('lk-is-over'));
      el.addEventListener('drop', (e) => { el.classList.remove('lk-is-over'); if (!S.drag || !accept(S.drag)) return; e.preventDefault(); const d = S.drag; S.drag = null; onDrop(d); });
    };
    drop(rs, (d) => d.kind === 'rune', (d) => equipRune(ctx, RUNE_BY_ID[d.id]));
    host.querySelectorAll('[data-row]').forEach((row) => {
      const k = row.dataset.row, part = ps.find((q) => q.k === k);
      drop(row, (d) => d.kind === 'charm' && !lockLv(id, k) && charmFits(CHARM_BY_ID[d.id], part.cls), (d) => equipCharm(ctx, CHARM_BY_ID[d.id], k));
    });
  }

  /** Inicio de arrastre: marca en lumen dónde se puede soltar y apaga el resto. */
  function dragSource(btn, data) {
    if (btn.getAttribute('draggable') !== 'true') return;
    btn.addEventListener('dragstart', (e) => {
      S.drag = data; tooltip.hide();
      try { e.dataTransfer.setData('text/plain', data.id); e.dataTransfer.effectAllowed = 'copy'; } catch { /* nada */ }
      const img = btn.querySelector('.lk-charm-art'); if (img && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(img, 24, 24);
      host.classList.add('lk-is-dragging', data.kind === 'rune' ? 'lk-drag-rune' : 'lk-drag-charm');
      if (data.kind === 'charm') {
        const c = CHARM_BY_ID[data.id];
        host.querySelectorAll('[data-row]').forEach((row) => {
          const x = parts(S.hero).find((q) => q.k === row.dataset.row);
          row.classList.toggle('lk-can-drop', !lockLv(S.hero, x.k) && charmFits(c, x.cls));
        });
      }
    });
    btn.addEventListener('dragend', () => {
      S.drag = null;
      host.classList.remove('lk-is-dragging', 'lk-drag-rune', 'lk-drag-charm');
      host.querySelectorAll('.lk-can-drop, .lk-is-over').forEach((el) => el.classList.remove('lk-can-drop', 'lk-is-over'));
    });
  }

  return { render };
}

/** Tecla U: abre la Mochila en la pestaña «Runas y charms». */
export function attachRunesCharms(game) {
  const ow = game.overworldManager;
  if (!ow || game.__lkRunes) return null;
  game.__lkRunes = true;
  loadArt(); // el arte se pide en segundo plano para que la pestaña abra al instante
  const open = () => ow.inventoryModal?.openTab?.('runes');
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyU' || e.repeat) return;
    const tag = (e.target?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
    if (document.querySelector('#start-screen-overlay:not(.hidden), #hero-select-modal:not(.hidden)')) return;
    const inv = ow.inventoryModal;
    if (!inv) return;
    if (inv.isOpen && inv.activeHeroTab === 'runes') { inv.close(); e.preventDefault(); return; }
    if (typeof ow.isCombatActive === 'function' && ow.isCombatActive()) return;
    const t = ow.tutorialManager;
    if (t && (t.isCutsceneActive || t.isOverlayActive)) return;
    if (t && typeof t.isFeatureUnlocked === 'function' && !t.isFeatureUnlocked('runes')) { ow._showFeatureLockedFeedback?.(t.lockMessage?.('runes') || i18n.t('runesPanel.locked')); e.preventDefault(); return; }
    if (!inv.isOpen && ow.state !== 'EXPLORING') return;
    if (!inv.isOpen && typeof ow.isAnyModalOpen === 'function' && ow.isAnyModalOpen() && !ow.squadModal?.isOpen) return;
    if (ow.squadModal?.isOpen) ow.squadModal.close();
    open(); e.preventDefault();
  }, true);
  const api = { open, service: RuneCharmService };
  window.lunakaiRunes = api;
  return api;
}
