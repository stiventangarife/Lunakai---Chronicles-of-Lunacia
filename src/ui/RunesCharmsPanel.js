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
import { CHARM_FX, buildCardOverride } from '../tactics/combat/RuneCharmEffects.js';
import { SPELLS_DB } from '../tactics/Spells.js';
import { STARTER_DECKS } from '../tactics/data/StarterCards.js';
import { getHeroSpells } from '../rpg/SaveSlotManager.js';
import { asset, toast, tooltip, esc, skillTip } from './lk.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const CLS_ES = { beast: 'Bestia', bird: 'Pájaro', plant: 'Planta', aquatic: 'Acuático', bug: 'Bicho', reptile: 'Reptil', mech: 'Mech', dawn: 'Dawn', dusk: 'Dusk', neutral: 'Neutral' };
const PART_ES = { eyes: 'Ojos', ears: 'Orejas', mouth: 'Boca', horn: 'Cuerno', back: 'Espalda', tail: 'Cola' };
const RAR_ES = { common: 'Común', rare: 'Rara', epic: 'Épica', mystic: 'Mística', secret: 'Secreta', neutral: 'Neutral' };
const runeRar = (r) => (['rare', 'epic', 'mystic'].includes(r) ? r : r === 'secret' ? 'epic' : 'common');
const clsPng = (c) => asset(`assets/classes/${c === 'dusk' ? 'dust' : c}.png`); // el icono de Dusk se llama dust.png
const clsImg = (c) => (c && c !== 'neutral' ? `<img src="${clsPng(c)}" alt="">` : '');

let ART = null;          // id → imagen (assets/ui/runes-charms.json, se carga la primera vez)
let artLoading = null;
function loadArt() {
  if (ART) return Promise.resolve(ART);
  artLoading = artLoading || fetch(asset('assets/ui/runes-charms.json')).then((r) => r.json()).then((m) => (ART = m)).catch(() => (ART = {}));
  return artLoading;
}
const art = (kind, id) => (ART ? ART[`${kind}/${id}`] || '' : '');

/** ¿Este Axie tiene algo pendiente (sin runa o con charms por engarzar)? Para el aviso de la pestaña. */
export function runesPending(heroId) {
  const eq = RuneCharmService.get(heroId);
  return !eq.rune;
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Vista de runas y charms dentro de un contenedor.
 * @param {HTMLElement} host
 * @param {{ equipmentManager: object, classOf: (id:string)=>string, onChange?: ()=>void, onPickHero?: (id:string)=>void, heroIds?: ()=>string[] }} opts
 */
export function createRunesView(host, { equipmentManager, classOf, onChange = null, onPickHero = null, heroIds = null }) {
  const S = { hero: null, part: 'eyes', shelf: 'charms', onlyFit: true, sort: 'pp', flash: null, drag: null };
  const em = () => equipmentManager;
  const base = (id) => em()?.heroesBase?.[id];
  const tried = {};

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
  const rangeTxt = (sp) => (sp?.minRange != null ? `AL ${sp.minRange}${sp.maxRange !== sp.minRange ? `–${sp.maxRange}` : ''}` : '');

  /** Ficha de la habilidad de una parte (mismo formato que en combate). */
  function skillTipHTML(x) {
    const sp = x.sp;
    if (!sp) return '';
    const fx0 = (sp.effects || []).find((e) => ['damage', 'heal', 'shield'].includes(e.type));
    const fx = fx0?.type === 'damage' ? 'dmg' : fx0?.type || null;
    const value = fx0 ? (fx0.min != null ? `${fx0.min}${fx0.max && fx0.max !== fx0.min ? `–${fx0.max}` : ''}` : fx0.amount ?? null) : null;
    const range = sp.minRange != null ? `${sp.minRange}${sp.maxRange !== sp.minRange ? `–${sp.maxRange}` : ''}` : null;
    return skillTip({ name: sp.name, kind: `Habilidad · ${PART_ES[x.k]} · ${CLS_ES[x.cls] || x.cls}`, cost: sp.paCost, range, los: sp.requiresLoS !== false, fx, value, desc: esc(sp.description || ''), art: spellArt(x), color: `var(--lk-class-${x.cls})`, iconHtml: `<img src="${x.icon}" alt="" style="width:26px;height:26px;object-fit:contain">` });
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
    if (ov.paCost !== sp.paCost) rows.push({ label: 'Coste', before: `${sp.paCost} PA`, after: `${ov.paCost} PA` });
    if (ov.maxRange !== sp.maxRange) rows.push({ label: 'Alcance', before: `AL ${range(sp)}`, after: `AL ${range(ov)}` });
    if (ov.requiresLoS !== sp.requiresLoS) rows.push({ label: 'Visión', before: 'Requiere', after: 'No requiere' });
    if (dmg(ov) && dmg(ov) !== dmg(sp)) rows.push({ label: 'Daño', before: dmg(sp), after: dmg(ov) });
    if (ov.shieldAmount != null && ov.shieldAmount !== sp.shieldAmount) rows.push({ label: 'Escudo', before: `+${sp.shieldAmount}`, after: `+${ov.shieldAmount}` });
    if (ov.baseMinHeal != null && ov.baseMinHeal !== sp.baseMinHeal) rows.push({ label: 'Curación', before: `+${sp.baseMinHeal}`, after: `+${ov.baseMinHeal}` });
    return rows.length ? rows : null;
  }

  function tipHTML(kind, x, part = null) {
    if (!x) return '';
    const isRune = kind === 'runes';
    const c = x.class === 'neutral' ? 'var(--lk-gilt-300)' : `var(--lk-class-${x.class})`;
    const meta = isRune ? `Runa · ${CLS_ES[x.class]} · ${RAR_ES[x.rarity] || x.rarity}` : `Charm · ${CLS_ES[x.class]} · ${x.pp} PP`;
    let extra = '';
    if (!isRune && part) {
      const rows = charmPreview(x, part);
      extra = rows ? `<div class="lk-tt-stats">${rows.map((r) => `<span class="lk-tt-stat">${esc(r.label)}<b>${esc(r.before)} → ${esc(r.after)}</b></span>`).join('')}</div>`
        : `<p class="lk-bag-runes__tt-on">En <b>${esc(part.name)}</b> (${PART_ES[part.k]})</p>`;
    }
    return `<div class="lk-tooltip-tactical" style="--c:${c}"><header>${art(kind, x.id) ? `<span class="lk-sigil"><img src="${art(kind, x.id)}" alt="" style="width:26px;height:26px;object-fit:contain"></span>` : ''}<div><small>${meta}</small><b>${esc(x.name)}</b></div></header>
      <div class="lk-tt-body">${extra}<p>${x.desc ? esc(x.desc) : 'Efecto pendiente de integrar en el combate.'}</p></div></div>`;
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
      return `<span class="lk-bag-runes__pipgrp" style="--c:var(--lk-class-${c})" title="${CLS_ES[c] || c}: ${free} de ${n} PP libres">${pips}</span>`;
    }).join('');
  }
  /** Leyenda corta bajo los rombos: «Bicho 3/7 · Bestia 0/2 · Pájaro 0/6», cada clase en su color. */
  const ppLegend = (pp) => Object.entries(pp.pools).map(([c, n]) => `<span style="color:var(--lk-class-${c})">${CLS_ES[c] || c} <b>${Math.max(0, pp.left[c] ?? n)}</b>/${n}</span>`).join(' · ');

  function render(heroId) {
    if (heroId !== S.hero) { S.hero = heroId; S.part = 'eyes'; }
    const b = base(heroId);
    if (!b || b.isSapidae || heroId === 'sapidae') {
      const axies = (heroIds ? heroIds() : []).filter((id) => base(id) && !base(id).isSapidae && id !== 'sapidae');
      host.innerHTML = `<div class="lk-bag-runes__empty"><img class="lk-ai" src="${I('rune')}" alt=""><b>El Sapidae no lleva runas ni charms</b><span>Las runas y los charms mejoran las habilidades de tus axies. Elige uno:</span>
        ${axies.length ? `<div class="lk-bag-runes__pick">${axies.map((id) => `<button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-pick="${id}"><span class="lk-b-ico"><img src="${clsPng(classOf(id))}" alt="" style="width:18px;height:18px"></span>${esc(base(id).name)}</button>`).join('')}</div>` : '<span>Aún no tienes axies.</span>'}</div>`;
      host.querySelectorAll('[data-pick]').forEach((btn) => btn.addEventListener('click', () => onPickHero?.(btn.dataset.pick)));
      return;
    }
    if (!ART) loadArt().then(() => { if (S.hero === heroId && host.isConnected) render(heroId); });
    const id = heroId, cls = classOf(id), name = b.name || id;
    const eq = RuneCharmService.get(id), ps = parts(id);
    const rune = eq.rune && RUNE_BY_ID[eq.rune];
    // PP por clase (GDD §3): 3 de la clase del axie + 2 por parte para la clase de esa parte
    const pcls = Object.fromEntries(ps.map((x) => [x.k, x.cls]));
    const pp = ppAllocate(cls, pcls, eq.charms);
    const left = Math.max(0, pp.total - pp.totalUsed);
    const canSet = (c, partKey) => ppCanSet(cls, pcls, eq.charms, partKey, c.id);
    const tp = ps.find((x) => x.k === S.part) || ps[0];
    const runeOk = (r) => runeFits(r, cls), charmOk = (c) => charmFits(c, tp.cls);
    const usedSet = new Set(Object.values(eq.charms).filter(Boolean));

    // Estantería
    let runes = RUNES.filter((r) => !S.onlyFit || runeOk(r));
    let charms = CHARMS.filter((c) => (!S.onlyFit || charmOk(c)));
    const SORT = { pp: (a, z) => a.pp - z.pp || a.name.localeCompare(z.name), ppd: (a, z) => z.pp - a.pp || a.name.localeCompare(z.name), name: (a, z) => a.name.localeCompare(z.name) };
    runes = [...runes].sort((a, z) => runeOk(z) - runeOk(a) || a.name.localeCompare(z.name));
    charms = [...charms].sort((a, z) => charmOk(z) - charmOk(a) || SORT[S.sort](a, z));
    const shelf = S.shelf === 'runes'
      ? runes.map((r) => { const ok = runeOk(r), on = eq.rune === r.id;
        return `<div class="lk-charm-item ${ok ? '' : 'lk-is-locked'}"><button type="button" class="lk-slot-item lk-is-rune ${on ? 'lk-is-selected' : ''} ${ok ? '' : 'lk-is-locked'}" data-rune="${r.id}" draggable="${ok && !on}" style="--r:var(--lk-rar-${runeRar(r.rarity)})" aria-label="Runa ${esc(r.name)}${ok ? '' : ' (no es de su clase)'}"><span class="lk-cc ${r.class === 'neutral' ? 'lk-n' : ''}">${r.class === 'neutral' ? 'N' : clsImg(r.class)}</span><span class="lk-art">${art('runes', r.id) ? `<img class="lk-charm-art" src="${art('runes', r.id)}" alt="" draggable="false">` : ''}</span><span class="lk-cap">${on ? 'Equipada' : 'Runa'}</span></button><small>${esc(r.name)}</small></div>`; }).join('')
      : charms.map((c) => { const ok = charmOk(c), on = usedSet.has(c.id), afford = canSet(c, tp.k).ok;
        return `<div class="lk-charm-item ${ok ? '' : 'lk-is-locked'}"><button type="button" class="lk-slot-item ${on ? 'lk-is-selected' : ''} ${ok ? '' : 'lk-is-locked'} ${ok && !afford ? 'lk-is-poor' : ''}" data-charm="${c.id}" draggable="${ok}" style="--r:var(--lk-rar-${c.rarity})" aria-label="${esc(c.name)} · ${c.pp} PP${ok ? '' : ' (no compatible con esta parte)'}"><span class="lk-cc ${c.class === 'neutral' ? 'lk-n' : ''}">${c.class === 'neutral' ? 'N' : clsImg(c.class)}</span><span class="lk-art">${art('charms', c.id) ? `<img class="lk-charm-art" src="${art('charms', c.id)}" alt="" draggable="false">` : ''}</span><span class="lk-cap">${c.pp} PP</span></button><small>${esc(c.name)}</small></div>`; }).join('');

    // La estantería tiene su propio scroll: se conserva al equipar (misma lista) y vuelve arriba al cambiar de lista
    const shelfKey = [id, S.shelf, S.shelf === 'charms' ? S.part : '', S.onlyFit, S.sort].join('|');
    const keepScroll = shelfKey === S.shelfKey ? host.querySelector('.lk-shelf')?.scrollTop || 0 : 0;
    S.shelfKey = shelfKey;
    host.innerHTML = `
      <div class="lk-bag-runes__top">
        <div class="lk-rune-row">
          <button type="button" class="lk-socket-master-rune lk-bag-runes__rsock ${rune ? 'lk-has-art' : 'lk-is-empty'} ${S.flash === 'rune' ? 'lk-is-set' : ''}" data-ref="runeSocket" style="--c:var(--lk-class-${cls})" aria-label="${rune ? `Runa ${esc(rune.name)} (clic para retirarla)` : 'Ranura de runa vacía: elegir runa'}">${rune && art('runes', rune.id) ? `<img class="lk-rune-art" src="${art('runes', rune.id)}" alt="">` : '<span class="lk-bag-runes__plus" aria-hidden="true">+</span>'}</button>
          <div><span class="lk-label" style="color:var(--lk-gilt-300)">Runa · ${CLS_ES[cls]}</span>
            <div class="lk-bag-runes__rname">${rune ? esc(rune.name) : 'Sin runa'}</div>
            ${rune ? `<span class="lk-rar-chip" data-r="${runeRar(rune.rarity)}">${RAR_ES[rune.rarity] || rune.rarity}</span>` : '<small class="lk-bag-runes__muted">Pulsa la ranura o arrastra una runa</small>'}</div>
        </div>
        <div class="lk-bag-runes__pp">
          <div class="lk-bag-runes__ppread"><span><b data-ref="ppLeft">${left}</b> / ${PP_MAX} PP</span><small data-ref="ppHint">${left === PP_MAX ? 'Sin charms engarzados' : `${PP_MAX - left} en uso`}</small></div>
          <div class="lk-bag-runes__pips" data-ref="pips" role="img" aria-label="${left} de ${PP_MAX} Potential Points libres. ${Object.entries(pp.pools).map(([c, n]) => `${CLS_ES[c] || c} ${Math.max(0, pp.left[c] ?? n)} de ${n}`).join(', ')}">${ppHTML(pp)}</div>
          <small class="lk-bag-runes__ppleg">${ppLegend(pp)}</small>
          ${pp.ok ? '' : '<small class="lk-bag-runes__ppwarn">Hay charms por encima de los PP de su clase: en combate se ignoran.</small>'}
        </div>
      </div>
      <div class="lk-parts lk-bag-runes__parts">${ps.map((x) => {
        const ch = eq.charms[x.k] && CHARM_BY_ID[eq.charms[x.k]]; const tgt = x.k === S.part; const sa = spellArt(x), sp = x.sp;
        return `<div class="lk-part-row ${tgt ? 'lk-is-target' : ''}" data-row="${x.k}" style="--cc:var(--lk-class-${x.cls})">
          <span class="lk-spell lk-bag-runes__spell ${sa ? '' : 'lk-is-noart'}" data-skill="${x.k}" tabindex="0" aria-label="Habilidad ${esc(x.name)}">${sa ? `<img src="${sa}" alt="">` : ''}<img class="lk-spell-part" src="${x.icon}" alt=""></span>
          <div class="lk-pn"><b>${esc(x.name)} <span class="lk-bag-runes__pk">${PART_ES[x.k]}</span></b><small><span class="lk-pc" style="--c:var(--lk-class-${x.cls})">${clsImg(x.cls)}${CLS_ES[x.cls] || x.cls}</span>${sp ? `${sp.paCost != null ? ` · ${sp.paCost} PA` : ''}${rangeTxt(sp) ? ` · ${rangeTxt(sp)}` : ''}` : ''}${ch ? ` · <span class="lk-bag-runes__chn">${esc(ch.name)}</span>` : ''}</small></div>
          <button type="button" class="lk-socket-charm ${ch ? 'lk-is-filled' : 'lk-is-empty'} ${tgt ? 'lk-is-target' : ''} ${S.flash === x.k ? 'lk-is-set' : ''}" data-part="${x.k}" style="--c:var(--lk-rar-${ch ? ch.rarity : 'common'})" aria-label="${PART_ES[x.k]}: ${ch ? esc(ch.name) + ' (clic para retirarlo)' : 'ranura vacía: elegir charm'}">${ch ? (art('charms', ch.id) ? `<img class="lk-charm-art" src="${art('charms', ch.id)}" alt="">` : '') : '<span class="lk-bag-runes__plus" aria-hidden="true">+</span>'}</button><span class="lk-pp">${ch ? ch.pp + ' PP' : ''}</span></div>`;
      }).join('')}</div>
      <div class="lk-bag-runes__shelf" data-ref="shelfWrap" title="Arrastra un charm a una parte (o una runa a su ranura), o haz clic. Clic en una ranura llena para retirarlo.">
        <div class="lk-bag-runes__bar">
          <div class="lk-segmented lk-bag-runes__kind" data-ref="kind"><button type="button" aria-pressed="${S.shelf === 'charms'}" data-k="charms"><img class="lk-ai" src="${I('charm')}" alt="">Charms</button><button type="button" aria-pressed="${S.shelf === 'runes'}" data-k="runes"><img class="lk-ai" src="${I('rune')}" alt="">Runas</button></div>
          ${S.shelf === 'charms' ? `<label class="lk-bag__sort lk-bag-runes__sort"><span class="lk-label">Orden</span><select data-ref="rsort" class="lk-input lk-select" aria-label="Ordenar charms"><option value="pp" ${S.sort === 'pp' ? 'selected' : ''}>PP ↑</option><option value="ppd" ${S.sort === 'ppd' ? 'selected' : ''}>PP ↓</option><option value="name" ${S.sort === 'name' ? 'selected' : ''}>Nombre</option></select></label>` : ''}
        </div>
        <div class="lk-bag-runes__bar lk-bag-runes__bar--fit">
          <button type="button" class="lk-fchip lk-no-ico" data-fit aria-pressed="${S.onlyFit}" title="Mostrar solo lo que encaja">Solo compatibles</button>
          <span class="lk-bag-runes__hint">${S.shelf === 'runes' ? `Para <b>${esc(name)}</b> · ${CLS_ES[cls]} o neutrales` : `Para <b>${esc(tp.name)}</b> (${PART_ES[tp.k]}) · ${CLS_ES[tp.cls] || tp.cls} o neutrales`}</span>
        </div>
        <div class="lk-shelf">${(S.shelf === 'runes' ? runes.length : charms.length) ? shelf : '<p class="lk-bag-runes__muted">No hay nada aquí. Quita «Solo compatibles» para ver todo.</p>'}</div>
        <span class="lk-drag-hint">Arrastra un charm a una parte (o una runa a su ranura), o haz clic. Clic en una ranura llena para retirarlo.</span>
      </div>`;
    S.flash = null;
    const shelfEl = host.querySelector('.lk-shelf'); if (shelfEl) shelfEl.scrollTop = keepScroll;
    bind({ id, cls, name, eq, ps, tp, rune, left, runeOk, charmOk, pcls, pp });
  }

  // ------------------------------------------------------------------ acciones
  function equipRune(ctx, r) {
    const { id, cls, name, eq, runeOk } = ctx;
    if (!runeOk(r)) { toast(`${r.name} es una runa ${CLS_ES[r.class]}: ${name} solo acepta runas ${CLS_ES[cls]} o neutrales`, true); return; }
    if (eq.rune === r.id) return;
    RuneCharmService.setRune(id, r.id); changed('rune');
  }
  /** Texto de los PP que faltan: «2 PP de Bestia», «1 PP» (neutral). */
  const overTxt = (over) => Object.entries(over).map(([c, n]) => (c === 'neutral' ? `${n} PP` : `${n} PP de ${CLS_ES[c] || c}`)).join(' y ');

  function equipCharm(ctx, c, partKey) {
    const { id, eq, ps, cls, pcls } = ctx;
    const part = ps.find((x) => x.k === partKey);
    if (!charmFits(c, part.cls)) { toast(`${c.name} es un charm ${CLS_ES[c.class]}: solo entra en partes ${CLS_ES[c.class]}. ${part.name} es ${CLS_ES[part.cls] || part.cls}.`, true); return; }
    if (Object.entries(eq.charms).some(([k, v]) => v === c.id && k !== partKey)) { toast('Ese charm ya está engarzado en otra parte de este axie', true); return; }
    const check = ppCanSet(cls, pcls, eq.charms, partKey, c.id);
    if (!check.ok || !RuneCharmService.setCharm(id, partKey, c.id, { axieClass: cls, partClasses: pcls })) {
      const s = host.querySelector(`.lk-socket-charm[data-part="${partKey}"]`); s?.classList.remove('lk-is-error'); void s?.offsetWidth; s?.classList.add('lk-is-error');
      toast(`Te faltan ${overTxt(check.over) || `${c.pp} PP`} para ${c.name}`, true); return;
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
      if (!check.ok) hint.textContent = `Te faltarían ${overTxt(check.over)}`;
      else if (c.class !== 'neutral') hint.textContent = `Te quedarían ${Math.max(0, check.alloc.left[c.class] || 0)} PP de ${CLS_ES[c.class]}`;
      else hint.textContent = `Te quedarían ${Math.max(0, check.alloc.total - check.alloc.totalUsed)} PP`;
      hint.classList.toggle('lk-is-bad', !check.ok);
    };
    const unpreview = () => { pips.innerHTML = ppHTML(ctx.pp); hint.textContent = left === PP_MAX ? 'Sin charms engarzados' : `${PP_MAX - left} en uso`; hint.classList.remove('lk-is-bad'); };

    const rs = $('runeSocket');
    rs.addEventListener('click', () => {
      if (!rune) { S.shelf = 'runes'; render(id); scrollShelf(); return; }
      RuneCharmService.setRune(id, null); changed();
    });
    if (rune) tooltip.attach(rs, () => tipHTML('runes', rune));

    host.querySelectorAll('[data-skill]').forEach((el) => { const x = ps.find((q) => q.k === el.dataset.skill); if (x?.sp) tooltip.attach(el, () => skillTipHTML(x)); });
    host.querySelectorAll('[data-row]').forEach((row) => row.addEventListener('click', (e) => {
      if (e.target.closest('.lk-socket-charm, [data-skill]')) return;
      S.part = row.dataset.row; S.shelf = 'charms'; render(id);
    }));
    host.querySelectorAll('.lk-socket-charm').forEach((btn) => {
      const k = btn.dataset.part;
      btn.addEventListener('click', () => {
        if (eq.charms[k]) { RuneCharmService.setCharm(id, k, null); S.part = k; changed(); return; }
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
      drop(row, (d) => d.kind === 'charm' && charmFits(CHARM_BY_ID[d.id], part.cls), (d) => equipCharm(ctx, CHARM_BY_ID[d.id], k));
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
          row.classList.toggle('lk-can-drop', charmFits(c, x.cls));
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
    if (t && typeof t.isFeatureUnlocked === 'function' && !t.isFeatureUnlocked('inventory')) { ow._showFeatureLockedFeedback?.('Las runas y los charms se desbloquean tras tu primer combate.'); e.preventDefault(); return; }
    if (!inv.isOpen && ow.state !== 'EXPLORING') return;
    if (!inv.isOpen && typeof ow.isAnyModalOpen === 'function' && ow.isAnyModalOpen() && !ow.squadModal?.isOpen) return;
    if (ow.squadModal?.isOpen) ow.squadModal.close();
    open(); e.preventDefault();
  }, true);
  const api = { open, service: RuneCharmService };
  window.lunakaiRunes = api;
  return api;
}
