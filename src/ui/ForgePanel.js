// ForgePanel.js — Pantalla de la Forja (sistema de diseño · 25 «Forja · Crear y evolucionar») y su yunque en el
// Valle del Dojō. Se abre con E junto al yunque (rpg/world/ForgeStation.js).
//
//  · Crear · Tier 0: recetas con oro + materiales del Bosque → el objeto va a la Mochila al instante.
//  · Evolucionar: la pieza sube a la siguiente de su línea. SLP + materiales + esquirlas + 0,5 bAXS de comisión;
//    rapidez ×1 / ×2 / ×4 (bAXS según el tier). 2 yunques; las piezas listas se recogen con un clic.
// Las reglas y el guardado están en rpg/ForgeService.js; este módulo solo pinta y conecta.

import { ForgeService, EQ_SLOTS, MATERIALS, FORGE_ANVILS } from '../rpg/ForgeService.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import { asset, esc, toast, sprite, curIcon } from './lk.js';
import { ForgeStation } from '../rpg/world/ForgeStation.js';
import { matSvg, matIcon } from './MaterialIcons.js';
import { MATERIAL_RARITY_NAME, CRAFT_RECIPES, EVOLUTION_COST } from '../tactics/data/EconomyCatalog.js';
import * as i18n from '../i18n/i18n.js';

export { matSvg };

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const CUR = { gold: [i18n.t('forge.gold'), curIcon('gold'), '#B8892E'], slp: ['SLP', curIcon('slp'), '#E58BB8'], baxs: ['bAXS', curIcon('baxs'), '#C24FD0'] };
const STAT_ES = { hp: i18n.t('forge.statHp'), damage: i18n.t('forge.statDamage'), pa: i18n.t('forge.statPa'), pm: i18n.t('forge.statPm'), initiative: i18n.t('forge.statInitiative'), shield: i18n.t('forge.statShield') };
const SLOT1 = { weapon: i18n.t('forge.slotWeapon'), hat: i18n.t('forge.slotHat'), shield: i18n.t('forge.slotShield'), body: i18n.t('forge.slotBody'), boots: i18n.t('forge.slotBoots'), consumable: i18n.t('forge.slotBag') };
const RAR_NAME = { legendary: i18n.t('forge.rarLegendary'), epic: i18n.t('forge.rarEpic'), rare: i18n.t('forge.rarRare'), uncommon: i18n.t('forge.rarUncommon'), common: i18n.t('forge.rarCommon'), mystic: i18n.t('forge.rarMystic') };
const FTABS = [['all', i18n.t('forge.tabAll')], ['weapon', i18n.t('forge.tabWeapon')], ['hat', i18n.t('forge.tabHat')], ['shield', i18n.t('forge.tabShield')], ['body', i18n.t('forge.tabBody')], ['boots', i18n.t('forge.tabBoots')]];
export const BIOME = { forest: [i18n.t('forge.biomeForest'), '#4E9A6B'], savannah: [i18n.t('forge.biomeSavannah'), '#C9973A'], arctic: [i18n.t('forge.biomeArctic'), '#4C9CC4'], mystic: [i18n.t('forge.biomeMystic'), '#C2608F'], dungeon: [i18n.t('forge.biomeDungeon'), '#6366F1'], any: [i18n.t('forge.biomeAny'), '#B8892E'] };
const ANVIL_SVG = '<svg class="lk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h13a5 5 0 0 1-5 5H9v3h6v3H6v-3h3v-3H7A4 4 0 0 1 3 9z"/><path d="M16 8h5"/><path d="M18 4l-2 2M21 5l-2 1"/></svg>';
const ARROW = '<svg viewBox="0 0 36 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h30M24 4l8 8-8 8"/></svg>';
const SPARKS = `<svg class="lk-anvil__fx" viewBox="0 0 400 260" aria-hidden="true"><g stroke="#FFD27A" stroke-width="3" stroke-linecap="round">${Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2, r2 = 110 + (i % 3) * 18; return `<line x1="${(200 + Math.cos(a) * 60).toFixed(1)}" y1="${(130 + Math.sin(a) * 60).toFixed(1)}" x2="${(200 + Math.cos(a) * r2).toFixed(1)}" y2="${(130 + Math.sin(a) * r2).toFixed(1)}"/>`; }).join('')}</g></svg>`;

const fmt = (n) => i18n.num(n);
const fmtB = (n) => (Math.round(n * 100) / 100).toLocaleString(i18n.lang() === 'es' ? 'es' : 'en', { maximumFractionDigits: 2 });
const fmtH = (h) => {
  const m = Math.max(0, Math.ceil(h * 60 - 1e-9));
  if (h > 0 && m < 1) return i18n.t('forge.underMin');
  return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`;
};
const isImg = (s) => typeof s === 'string' && (/^(\.\/|\/|assets\/|http|data:image)/.test(s) || /\.(png|jpe?g|webp|svg)$/i.test(s));
const rarVar = (r) => `var(--lk-rar-${['rare', 'epic', 'mystic', 'legendary', 'uncommon'].includes(r) ? r : 'common'})`;
const bg = (it) => rarVar(it.rarity); // fondo = color de la rareza (también en materiales)
function art(it) {
  if (!it) return '';
  if (it.glyph && !it.icon) return matSvg(it.glyph);
  if (isImg(it.icon)) return `<img class="${it.isT0 ? 'lk-is-t0' : ''}" src="${it.icon}" alt="" draggable="false">`;
  return it.icon ? `<span class="lk-emoji">${esc(it.icon)}</span>` : `<img class="lk-ai" src="./assets/ui/icons/resource.png" alt="">`;
}
const statRows = (it, cmp = null) => {
  const keys = [...new Set([...Object.keys(it.stats || {}), ...Object.keys(cmp?.stats || {})])].filter((k) => STAT_ES[k]);
  return keys.map((k) => {
    const v = it.stats?.[k] || 0, d = cmp ? v - (cmp.stats?.[k] || 0) : 0;
    return `<div class="lk-sp-stat"><span>${STAT_ES[k]}</span><b>${v ? `+${v}` : '—'}${d ? `<span class="${d > 0 ? 'lk-up' : 'lk-down'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>` : ''}</b></div>`;
  }).join('');
};
const fcard = (it, cls, extra = '', cmp = null, who = '') => `<div class="lk-fcard ${cls}"><div class="lk-fcard__art" style="--r:${bg(it)}">${art(it)}<span class="lk-t">T${it.tier ?? 0}</span>${who ? `<span class="lk-who">${esc(who)}</span>` : ''}</div><div class="lk-fcard__body"><small>${SLOT1[it.slot] || ''} · ${RAR_NAME[it.rarity] || i18n.t('forge.rarCommon')}</small><b>${esc(it.name)}</b><div class="lk-sp-stats">${statRows(it, cmp)}</div>${extra}</div></div>`;

export function attachForge(game) {
  const ow = game.overworldManager;
  if (!ow || game.__lkForge) return null;
  game.__lkForge = true;
  ForgeService.init({ equipmentManager: game.equipmentManager, onSave: () => { try { game._saveCurrentProgress?.(); } catch { /* nada */ } } });
  const sfx = (n) => { try { ow.audio?.[n]?.(); } catch { /* nada */ } };

  // ------------------------------------------------------------------ DOM
  const modal = document.createElement('div');
  modal.id = 'forge-modal';
  modal.className = 'lk-ui lk-backdrop lk-forge-layer hidden';
  modal.innerHTML = `
    <div class="lk-panel-modal-window lk-forge" role="dialog" aria-label="${i18n.t('forge.dialogLabel')}">
      <div class="lk-panel-head">
        <span class="lk-emblem">${ANVIL_SVG}</span>
        <h3><small>${i18n.t('forge.kicker')}</small>${i18n.t('forge.title')}</h3>
        <div class="lk-segmented" data-ref="mode" role="tablist" aria-label="${i18n.t('forge.craftLabel')}"><button type="button" aria-pressed="true" data-m="craft">${i18n.t('forge.modeCraft')}</button><button type="button" aria-pressed="false" data-m="evolve">${i18n.t('forge.modeEvolve')}</button></div>
        <div class="lk-forge-wallet">
          <span class="lk-res-pill" title="${i18n.t('forge.gold')}"><img class="lk-cur-ico" src="${CUR.gold[1]}" alt="${i18n.t('forge.gold')}"><span data-ref="gold">0</span></span>
          <span class="lk-res-pill lk-cur" title="${i18n.t('forge.slpTitle')}"><img class="lk-cur-ico" src="${CUR.slp[1]}" alt="SLP"><span data-ref="slp">0</span></span>
          <span class="lk-res-pill lk-cur" title="${i18n.t('forge.baxsTitle')}"><img class="lk-cur-ico" src="${CUR.baxs[1]}" alt="bAXS"><span data-ref="baxs">0</span></span>
        </div>
        <button type="button" class="lk-btn-close-x" data-act="close" aria-label="${i18n.t('forge.close')}">${sprite('i-close')}</button>
      </div>
      <div class="lk-forge-body">
        <div class="lk-forge-list">
          <div class="lk-codex__filters" data-ref="tabs"></div>
          <div class="lk-forge-rows" data-ref="rows" role="listbox" aria-label="${i18n.t('forge.recipes')}"></div>
        </div>
        <div class="lk-forge-stage" data-ref="stage"></div>
      </div>
      <div class="lk-forge-jobs" data-ref="jobs" hidden></div>
      <div class="lk-forge-pouch"><div class="lk-forge-pouch__head"><span class="lk-label">${i18n.t('forge.pouch')}</span><small data-ref="pouchCount"></small><span class="lk-forge-pouch__hint">${i18n.t('forge.pouchHint')}</span></div><div class="lk-forge-mats" data-ref="pouch" role="list"></div></div>
    </div>`;
  document.body.appendChild(modal);
  const $ = (r) => modal.querySelector(`[data-ref="${r}"]`);
  const mtip = document.createElement('div'); mtip.className = 'lk-ui lk-mat-tip'; document.body.appendChild(mtip);

  const FG = { mode: 'craft', tab: 'all', sel: null };
  const api = { isOpen: false, open, close, toggle: () => (api.isOpen ? close() : open()), service: ForgeService };

  // ------------------------------------------------------------------ datos de la vista
  function entries() {
    if (FG.mode === 'craft') {
      return ForgeService.recipes().filter((e) => e.item).map((e) => ({ key: e.recipe.id, it: e.item, recipe: e.recipe, cost: e.cost }));
    }
    const jobs = ForgeService.jobs().map((j) => ({ key: `j:${j.uid}`, it: ITEMS_DB[j.from], job: j, who: j.hero ? ForgeService.heroName(j.hero) : '' }));
    const gear = ForgeService.gear().map((g) => {
      const q = ForgeService.quote(g.id, 1);
      return { key: g.key, it: ITEMS_DB[g.id], gear: g, q, next: q && ITEMS_DB[q.to], who: g.hero ? ForgeService.heroName(g.hero) : '' };
    }).sort((a, b) => (b.gear.hero ? 1 : 0) - (a.gear.hero ? 1 : 0) || (b.it.tier || 0) - (a.it.tier || 0));
    return [...jobs, ...gear].filter((e) => e.it);
  }

  function render() {
    if (!api.isOpen) return;
    const w = ForgeService.wallet();
    $('gold').textContent = fmt(w.gold); $('slp').textContent = fmt(w.slp); $('baxs').textContent = fmtB(w.baxs);
    $('mode').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === FG.mode)));
    const all = entries();
    $('tabs').innerHTML = FTABS.map(([k, n]) => { const c = k === 'all' ? all.length : all.filter((e) => e.it.slot === k).length; return c || k === 'all' ? `<button type="button" class="lk-fchip lk-no-ico" data-k="${k}" aria-pressed="${FG.tab === k}">${n} <span style="opacity:.55">${c}</span></button>` : ''; }).join('');
    const list = all.filter((e) => FG.tab === 'all' || e.it.slot === FG.tab);
    if (!list.find((e) => e.key === FG.sel)) FG.sel = (list.find((e) => (e.cost || e.q?.cost)?.ok) || list[0])?.key || null;
    $('rows').setAttribute('aria-label', FG.mode === 'craft' ? i18n.t('forge.recipes') : i18n.t('forge.yourGear'));
    $('rows').innerHTML = list.length ? list.map((e) => {
      const it = e.it, job = e.job, max = FG.mode === 'evolve' && !job && !e.next;
      const sub = FG.mode === 'craft'
        ? (it.effect?.openBag ? (it.effect.openBag === 'runes' ? i18n.t('forge.bagRune') : i18n.t('forge.bagCharm')) : `${SLOT1[it.slot]} · ${Object.entries(it.stats || {}).map(([k, v]) => `+${v} ${STAT_ES[k] || k}`).join(' · ')}`)
        : job ? (job.ready ? i18n.t('forge.readyCollect') : i18n.t('forge.inForge', { t: fmtH((job.end - Date.now()) / 3.6e6) })) : max ? i18n.t('forge.maxLine') : `→ ${e.next.name} · T${e.next.tier ?? 0}`;
      const ok = (e.cost || e.q?.cost)?.ok;
      const dot = max ? '' : job ? `<span class="lk-ok ${job.ready ? '' : 'lk-busy'}" title="${job.ready ? i18n.t('forge.ready') : i18n.t('forge.forging')}"></span>` : `<span class="lk-ok ${ok ? '' : 'lk-no'}" title="${ok ? i18n.t('forge.haveAll') : i18n.t('forge.missingSome')}"></span>`;
      return `<button type="button" class="lk-fr ${max ? 'lk-is-max' : ''} ${job ? 'lk-is-busy' : ''}" role="option" data-k="${esc(e.key)}" aria-selected="${e.key === FG.sel}"><span class="lk-fi" style="--r:${bg(it)}">${art(it)}<span class="lk-t">T${it.tier ?? 0}</span></span><span class="lk-ft"><b>${esc(it.name)}</b><small ${job ? `data-job="${job.uid}"` : ''}>${esc(sub)}</small></span>${e.who ? `<span class="lk-who">${esc(e.who)}</span>` : ''}${dot}</button>`;
    }).join('') : `<p class="lk-sp-empty" style="color:#8D97AF;padding:8px">${FG.mode === 'craft' ? i18n.t('forge.noRecipes') : i18n.t('forge.noGear')}</p>`;
    renderStage(list.find((e) => e.key === FG.sel));
    renderJobs();
  }

  const curChip = (k, need, have, extra = '') => `<div class="lk-cost ${need > have + 1e-9 ? 'lk-is-short' : ''}"><span class="lk-ci lk-cur" style="--r:${CUR[k][2]}"><img src="${CUR[k][1]}" alt=""></span><span class="lk-cn"><b>${CUR[k][0]}</b><small>${k === 'baxs' ? fmtB(need) : fmt(need)}${need > have + 1e-9 ? ` · ${i18n.t('forge.youHave', { n: k === 'baxs' ? fmtB(have) : fmt(have) })}` : ''}</small>${extra}</span></div>`;
  /** Casilla de material (como las de la Mochila): dibujo sobre el color de su rareza y «tienes/necesitas» en la esquina. */
  const matTile = (m, have, need) => {
    const short = have < need;
    return `<span class="lk-fneed ${short ? 'lk-is-short' : 'lk-is-ok'}" data-id="${m.id}" style="--r:${bg(m)}" tabindex="0" aria-label="${i18n.t('forge.matHaveAria', { name: esc(m.name), have, need })}">${matIcon(m)}<em>${have}/${need}</em></span>`;
  };
  function costHTML(c, baxsNote = '', { onlyMats = false } = {}) {
    const w = ForgeService.wallet();
    if (onlyMats) c = { ...c, gold: 0, slp: 0, baxs: 0 };
    const mats = c.rows.length ? `<div class="lk-forge-need">${c.rows.map((r) => matTile(MATERIALS[r.id], r.have, r.need)).join('')}</div>` : '';
    const cur = (c.gold || c.slp || c.baxs) ? `<div class="lk-cost-list">${c.gold ? curChip('gold', c.gold, w.gold) : ''}${c.slp ? curChip('slp', c.slp, w.slp) : ''}${c.baxs ? curChip('baxs', c.baxs, w.baxs, baxsNote ? `<span class="lk-src">${baxsNote}</span>` : '') : ''}</div>` : '';
    return `${cur}${mats}`;
  }
  function whyShort(c) {
    const w = ForgeService.wallet();
    const short = c.rows.filter((r) => r.have < r.need).map((r) => `${r.need - r.have} ${MATERIALS[r.id].name}`);
    if (c.gold > w.gold) short.unshift(i18n.t('forge.goldShort', { n: fmt(c.gold - w.gold) }));
    if (c.slp > w.slp) short.unshift(`${fmt(c.slp - w.slp)} SLP`);
    if (c.baxs > w.baxs + 1e-9) short.push(`${fmtB(c.baxs - w.baxs)} bAXS`);
    return i18n.t('forge.missing', { list: short.join(', ') });
  }

  function renderStage(e) {
    const st = $('stage');
    if (!e) { st.innerHTML = `<p class="lk-sp-empty" style="color:#8D97AF">${i18n.t('forge.pickOne')}</p>`; renderPouch(); return; }
    if (e.job) {
      const j = e.job, to = ITEMS_DB[j.to];
      st.innerHTML = `<div class="lk-anvil" data-ref="anvil"><div class="lk-anvil__pair">${fcard(e.it, 'lk-is-ghost', '', null, e.who)}<span class="lk-anvil__arrow">${ARROW}${j.ready ? i18n.t('forge.ready') : i18n.t('forge.forging')}</span>${fcard(to, 'lk-is-next', '', e.it, e.who)}</div>${SPARKS}</div>
        <div class="lk-forge-cost lk-is-job"><div><div class="lk-job-big" data-jobbig="${j.uid}"></div>${j.ready ? '' : speedUpHTML(j)}</div><div class="lk-forge-go"><button type="button" class="lk-btn lk-btn-primary-gold" data-act="go" ${j.ready ? '' : 'disabled'}><span class="lk-b-ico"><img class="lk-ai" src="${I('tick')}" alt=""></span>${j.ready ? i18n.t('forge.collect') : i18n.t('forge.inForgeBtn')}</button><span class="lk-keep">${j.hero ? i18n.t('forge.keepHero', { who: esc(e.who) }) : i18n.t('forge.keepBag')}</span></div></div>`;
      st.querySelector('[data-act="go"]').addEventListener('click', () => collect(j.uid));
      st.querySelectorAll('.lk-speed__opts button[data-x]').forEach((b) => b.addEventListener('click', () => speedUp(j.uid, +b.dataset.x)));
      tick(); renderPouch(); return;
    }
    let pair, cost, label, why = '', keep = '', fee = '', btnIco = I(FG.mode === 'craft' ? 'build' : 'upgrade');
    if (FG.mode === 'craft') {
      pair = fcard(e.it, 'lk-is-make', `<p class="lk-sp-desc" style="margin-top:4px;font-size:.74rem">${esc(e.it.description || '')}</p>`);
      cost = e.cost;
      // Hito 74: las bolsas de runa y de charm se pagan con SLP
      if (cost.slp && !cost.gold) { label = i18n.t('forge.labelCraftSlp', { n: fmt(cost.slp) }); btnIco = CUR.slp[1]; } else { label = i18n.t('forge.labelCraft', { n: fmt(cost.gold) }); if (cost.gold) btnIco = CUR.gold[1]; }
      keep = e.it.effect?.openBag ? i18n.t('forge.keepBagOpen') : i18n.t('forge.keepCraft');
    } else if (!e.next) {
      st.innerHTML = `<div class="lk-anvil"><div class="lk-anvil__pair">${fcard(e.it, '', '', null, e.who)}</div><p class="lk-sp-empty" style="color:#C8CFDF">${i18n.t('forge.topOfLine')}</p></div>`;
      renderPouch(); return;
    } else {
      const h = e.q.hours, w = ForgeService.wallet();
      pair = `${fcard(e.it, 'lk-is-ghost', '', null, e.who)}<span class="lk-anvil__arrow">${ARROW}${i18n.t('forge.evolves')}</span>${fcard(e.next, 'lk-is-next', '', e.it, e.who)}`;
      cost = e.q.cost; label = i18n.t('forge.labelEvolve', { n: fmt(cost.slp) }); btnIco = CUR.slp[1];
      const feeShort = cost.baxs > w.baxs + 1e-9;
      fee = `<span class="lk-forge-fee ${feeShort ? 'lk-is-short' : ''}"><img src="${CUR.baxs[1]}" alt="">${i18n.t('forge.fee', { n: fmtB(cost.baxs) })}${feeShort ? ` · ${i18n.t('forge.youHave', { n: fmtB(w.baxs) })}` : ''}</span>`;
      keep = i18n.t('forge.keepEvolve', { t: fmtH(h), hero: e.gear.hero ? ` · ${i18n.t('forge.heroAway', { who: esc(e.who) })}` : '' });
      if (ForgeService.anvilsFree() <= 0) why = i18n.t('forge.anvilsBusy', { n: FORGE_ANVILS });
    }
    if (!why && !cost.ok) why = whyShort(cost);
    st.innerHTML = `<div class="lk-anvil" data-ref="anvil"><div class="lk-anvil__pair">${pair}</div>${SPARKS}</div>
      <div class="lk-forge-cost"><div class="lk-forge-matbox"><span class="lk-label">${i18n.t('forge.materials')}</span>${costHTML(cost, '', { onlyMats: true })}</div>
        <div class="lk-forge-go"><button type="button" class="lk-btn lk-btn-primary-gold" data-act="go" ${cost.ok && !why ? '' : 'disabled'}><span class="lk-b-ico"><img class="${FG.mode === 'evolve' || btnIco === CUR.slp[1] || btnIco === CUR.gold[1] ? 'lk-cur-ico' : 'lk-ai'}" src="${btnIco}" alt=""></span>${label}</button>${fee}<span class="lk-why">${esc(why)}</span><span class="lk-keep">${keep}</span></div></div>`;
    st.querySelector('[data-act="go"]').addEventListener('click', () => doForge(e));
    renderPouch(cost);
  }

  function renderPouch(cost = null) {
    const need = new Set((cost?.rows || []).map((r) => r.id)), mats = ForgeService.mats();
    const list = Object.values(MATERIALS);
    const kinds = list.filter((m) => (mats[m.id] || 0) > 0).length, total = list.reduce((a, m) => a + (mats[m.id] || 0), 0);
    $('pouchCount').textContent = i18n.t('forge.pouchCount', { kinds, n: list.length, total });
    $('pouch').innerHTML = list.map((m) => { const n = mats[m.id] || 0; return `<span class="lk-fm ${n ? '' : 'lk-is-zero'} ${need.has(m.id) ? 'lk-is-need' : ''}" data-id="${m.id}" style="--r:${bg(m)}" tabindex="0" role="listitem" aria-label="${esc(m.name)}: ${n}">${matIcon(m)}<em>${n}</em></span>`; }).join('');
  }

  function strike() {
    const anvil = $('anvil'); if (!anvil || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    anvil.classList.remove('lk-is-strike'); void anvil.offsetWidth; anvil.classList.add('lk-is-strike');
  }
  function doForge(e) {
    let r;
    if (FG.mode === 'craft') r = ForgeService.craft(e.recipe.id);
    else r = ForgeService.evolve(e.gear, 1);
    if (!r.ok) { toast(r.why || i18n.t('forge.forgeFail'), true); render(); return; }
    strike(); sfx('playBuff');
    if (FG.mode === 'craft') toast(i18n.t('forge.forged', { item: r.item.name }));
    else { toast(i18n.t('forge.entered', { item: e.it.name, t: fmtH(r.hours) })); FG.sel = null; }
    setTimeout(render, 650);
  }
  function collect(uid) {
    const r = ForgeService.collect(uid); if (!r.ok) return;
    strike(); sfx('playBuff');
    toast(i18n.t('forge.evolved', { from: r.from?.name || i18n.t('forge.thePiece'), to: r.to?.name || '' }));
    FG.sel = null; setTimeout(render, 450);
  }

  /** Acelerar una pieza que ya se está forjando: ×2 / ×4 sobre el tiempo que le queda (paga la diferencia en bAXS). */
  function speedUpHTML(j) {
    const opts = ForgeService.speedOptions(j.uid); if (!opts.length) return '';
    const w = ForgeService.wallet();
    return `<div class="lk-speed lk-forge-speedup"><span class="lk-label">${i18n.t('forge.speedUp')}</span><div class="lk-speed__opts" role="group" aria-label="${i18n.t('forge.speedUp')}">${opts.map((o) => `<button type="button" data-x="${o.x}" ${o.baxs > w.baxs + 1e-9 ? `disabled title="${i18n.t('forge.noBaxs')}"` : ''}><b>×${o.x}</b><small>${fmtH(o.leftHours)}</small><em><img src="${CUR.baxs[1]}" alt="">${fmtB(o.baxs)}</em></button>`).join('')}</div></div>`;
  }
  function speedUp(uid, x) {
    const r = ForgeService.speedUp(uid, x);
    if (!r.ok) { toast(r.why || i18n.t('forge.speedFail'), true); return; }
    sfx('playBuff'); toast(i18n.t('forge.spedUp', { x, t: fmtH(r.leftHours) })); render();
  }

  // Yunques ocupados y cuenta atrás
  function renderJobs() {
    const el = $('jobs'), jobs = ForgeService.jobs();
    el.hidden = !jobs.length;
    el.innerHTML = `<span class="lk-label">${i18n.t('forge.anvils', { n: jobs.length, max: FORGE_ANVILS })}</span>${jobs.map((j) => { const to = ITEMS_DB[j.to]; return `<button type="button" class="lk-job ${j.ready ? 'lk-is-ready' : ''}" data-uid="${j.uid}" style="--r:${bg(to)}"><span class="lk-ji">${art(to)}</span><span class="lk-jt"><b>${esc(to?.name || j.to)}</b><small data-jobtxt="${j.uid}"></small><i class="lk-jbar"><i data-jobbar="${j.uid}"></i></i></span>${j.ready ? `<span class="lk-jgo">${i18n.t('forge.collect')}</span>` : ''}</button>`; }).join('')}`;
    tick();
  }
  const readySeen = new Set();
  function tick() {
    let changed = false;
    ForgeService.jobs().forEach((j) => {
      const left = Math.max(0, (j.end - Date.now()) / 3.6e6), p = Math.min(1, 1 - left / j.hours);
      if (j.ready && !readySeen.has(j.uid)) { readySeen.add(j.uid); changed = true; }
      const txt = j.ready ? i18n.t('forge.readyTap') : i18n.t('forge.left', { t: fmtH(left) });
      modal.querySelectorAll(`[data-jobtxt="${j.uid}"]`).forEach((n) => { n.textContent = txt; });
      modal.querySelectorAll(`[data-jobbar="${j.uid}"]`).forEach((n) => { n.style.width = `${p * 100}%`; });
      modal.querySelectorAll(`[data-job="${j.uid}"]`).forEach((n) => { n.textContent = j.ready ? i18n.t('forge.readyCollect') : i18n.t('forge.inForge', { t: fmtH(left) }); });
      modal.querySelectorAll(`[data-jobbig="${j.uid}"]`).forEach((n) => { n.innerHTML = `<span class="lk-label">${j.ready ? i18n.t('forge.ready') : i18n.t('forge.timeLeft')}</span><b>${j.ready ? i18n.t('forge.collectIt') : fmtH(left)}</b><i class="lk-jbar"><i style="width:${p * 100}%"></i></i><small>${i18n.t('forge.total', { t: fmtH(j.hours) })}${j.speed > 1 ? ` · ${i18n.t('forge.speedTag', { x: j.speed })}` : ''}</small>`; });
    });
    if (changed && api.isOpen) render();
  }

  // Aviso fuera de la forja cuando una pieza termina (una vez por pieza)
  const announced = new Set();
  setInterval(() => {
    if (api.isOpen) { tick(); return; }
    ForgeService.jobs().forEach((j) => { if (j.ready && !announced.has(j.uid)) { announced.add(j.uid); toast(i18n.t('forge.readyAtForge', { item: ITEMS_DB[j.to]?.name || i18n.t('forge.onePiece') })); } });
  }, 1000);

  // ------------------------------------------------------------------ eventos
  $('mode').addEventListener('click', (ev) => { const b = ev.target.closest('button[data-m]'); if (!b) return; FG.mode = b.dataset.m; FG.tab = 'all'; FG.sel = null; sfx('playHover'); render(); });
  $('tabs').addEventListener('click', (ev) => { const b = ev.target.closest('.lk-fchip'); if (!b) return; FG.tab = b.dataset.k; render(); });
  $('rows').addEventListener('click', (ev) => { const b = ev.target.closest('.lk-fr'); if (!b) return; FG.sel = b.dataset.k; sfx('playHover'); render(); });
  $('jobs').addEventListener('click', (ev) => {
    const b = ev.target.closest('.lk-job'); if (!b) return;
    const j = ForgeService.jobs().find((x) => x.uid === +b.dataset.uid); if (!j) return;
    if (j.ready) collect(j.uid); else { FG.mode = 'evolve'; FG.tab = 'all'; FG.sel = `j:${j.uid}`; render(); }
  });
  modal.querySelector('[data-act="close"]').addEventListener('click', close);
  modal.addEventListener('pointerdown', (ev) => { if (ev.target === modal) close(); });
  modal.addEventListener('wheel', (ev) => ev.stopPropagation(), { passive: true });
  /** «Se usa en»: recetas de Crear y tiers de evolución que piden este material. */
  const matUses = (id) => {
    const rec = CRAFT_RECIPES.filter((r) => r.mats?.[id]).map((r) => ITEMS_DB[r.result]?.name).filter(Boolean);
    const evo = Object.entries(EVOLUTION_COST).filter(([, c]) => c.mats?.[id] || (id === 'mat_lunar_shard' && c.shards)).map(([t]) => `T${t}`);
    return [rec.length ? i18n.t('forge.useCraft', { list: `${rec.slice(0, 3).join(', ')}${rec.length > 3 ? '…' : ''}` }) : '', evo.length ? i18n.t('forge.useEvolve', { list: evo.join(', ') }) : ''].filter(Boolean);
  };
  const showTip = (el) => {
    const m = MATERIALS[el.dataset.id]; if (!m) return;
    const have = ForgeService.mats()[m.id] || 0, uses = matUses(m.id);
    const kind = m.tier ? i18n.t('forge.kindMat', { biome: BIOME[m.biome]?.[0] || 'Lunacia' }) : i18n.t('forge.catalyst');
    mtip.innerHTML = `<div class="lk-tooltip-tactical lk-mat-tt" style="--c:${bg(m)}">
      <header><span class="lk-mat-tt__art" style="--r:${bg(m)}">${matIcon(m)}</span><div><small>${esc(kind)}</small><b>${esc(m.name)}</b><span class="lk-rar-chip" data-r="${m.rarity || 'common'}">${MATERIAL_RARITY_NAME[m.rarity] || i18n.t('forge.rarCommon')}</span></div></header>
      <div class="lk-tt-body">
        <p class="lk-mat-tt__desc">${esc(m.description || '')}</p>
        <div class="lk-mat-tt__row"><img class="lk-ai" src="${I('map')}" alt=""><span><b>${i18n.t('forge.whereGet')}</b>${esc(m.source || '—')}</span></div>
        ${uses.length ? `<div class="lk-mat-tt__row"><img class="lk-ai" src="${I('build')}" alt=""><span><b>${i18n.t('forge.usedFor')}</b>${uses.map(esc).join(' · ')}</span></div>` : ''}
        <div class="lk-mat-tt__have"><span>${i18n.t('forge.inPouch')}</span><b>${have}</b></div>
      </div></div>`;
    mtip.classList.add('lk-is-on');
    const r = el.getBoundingClientRect(), tw = mtip.offsetWidth || 260, th = mtip.offsetHeight || 200;
    const above = r.top - th - 10 > 8;
    mtip.style.left = `${Math.min(innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2))}px`;
    mtip.style.top = `${above ? r.top - 10 : r.bottom + 10}px`;
    mtip.style.transform = above ? 'translateY(-100%)' : 'none';
  };
  const hideTip = () => mtip.classList.remove('lk-is-on');
  // Tooltip también en los materiales del coste
  $('stage').addEventListener('mouseover', (ev) => { const f = ev.target.closest('.lk-fneed'); if (f) showTip(f); });
  $('stage').addEventListener('focusin', (ev) => { const f = ev.target.closest('.lk-fneed'); if (f) showTip(f); });
  $('stage').addEventListener('mouseout', (ev) => { if (ev.target.closest('.lk-fneed')) hideTip(); });
  $('stage').addEventListener('focusout', hideTip);
  const pouch = $('pouch');
  pouch.addEventListener('mouseover', (ev) => { const f = ev.target.closest('.lk-fm'); if (f) showTip(f); });
  pouch.addEventListener('focusin', (ev) => { const f = ev.target.closest('.lk-fm'); if (f) showTip(f); });
  pouch.addEventListener('mouseout', () => mtip.classList.remove('lk-is-on'));
  pouch.addEventListener('focusout', () => mtip.classList.remove('lk-is-on'));

  // Mientras está abierta, la forja se queda con el teclado (Esc la cierra; nada se filtra al mundo)
  window.addEventListener('keydown', (ev) => {
    if (!api.isOpen) return;
    if (ev.code === 'Escape') { ev.preventDefault(); close(); }
    ev.stopImmediatePropagation();
  }, true);

  // El resto del juego la cuenta como ventana abierta (cámara, E, mapas…)
  if (typeof ow.isAnyModalOpen === 'function') {
    const prev = ow.isAnyModalOpen.bind(ow);
    ow.isAnyModalOpen = () => api.isOpen || prev();
  }

  function open() {
    if (api.isOpen) return;
    const lock = ow.tutorialManager?.lockMessage?.('forge'); // Hito 48: la Forja llega en su fase del tutorial
    if (lock) { ow._showFeatureLockedFeedback?.(lock); return; }
    if (document.body.classList.contains('state-combat') || window.__AXIE_TACTICS_APP__?.gameState === 'BATTLE') return;
    api.isOpen = true;
    station.hidePrompt();
    modal.classList.remove('hidden'); void modal.offsetWidth; modal.classList.add('lk-is-open');
    sfx('playBuff');
    FG.sel = null; render();
  }
  function close() {
    if (!api.isOpen) return;
    api.isOpen = false;
    mtip.classList.remove('lk-is-on');
    modal.classList.remove('lk-is-open'); modal.classList.add('hidden');
    sfx('playStep');
  }

  // ------------------------------------------------------------------ yunque en el mundo
  const station = new ForgeStation(ow, { onUse: open });
  ow.forgeModal = api;
  api.setMode = (m) => { if (m !== 'craft' && m !== 'evolve') return; FG.mode = m; FG.sel = null; if (api.isOpen) render(); }; // Hito 48 (tutorial)
  window.lunakaiForge = { open, close, service: ForgeService, station, finishAll: () => { ForgeService.finishAll(); render(); } };
  return api;
}
