// ShopPanel.js — Pantalla de la Tienda (sistema de diseño · 24 «Tienda · Comprar y vender»).
// La abre el mercader del Valle del Dojō al hablar con él (NPCManager · type 'merchant'), con `open(shopId)`.
//
//  · Cuadrícula a la izquierda: la franja de abajo es el precio (en rojo si no te alcanza); la cantidad que tienes va
//    en la chapa. Agotado = casilla apagada. Pestañas: Recursos, Equipo, Comida, Pociones (y Misión al vender).
//  · Ficha marfil a la derecha: comparación con lo que lleva tu héroe (▲▼), cantidad, total y oro que te quedará.
//    Lo raro o mejor se vende manteniendo pulsado. Lo último vendido se recompra al mismo precio.
// Las reglas y el guardado están en rpg/ShopService.js.

import { ShopService, itemOf, kindOf, EQ_SLOTS } from '../rpg/ShopService.js';
import { ForgeService } from '../rpg/ForgeService.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import { CRAFT_RECIPES, EVOLUTION_COST, nextEvolution, MATERIAL_RARITY_NAME } from '../tactics/data/EconomyCatalog.js';
import { asset, esc, toast, sprite, curIcon } from './lk.js';
import { BIOME, matSvg } from './ForgePanel.js';
import { loadRuneCharmArt, runeCharmArtReady } from './RuneCharmArt.js';
import * as i18n from '../i18n/i18n.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const COIN = `<img class="lk-coin" src="${curIcon('gold')}" alt="" aria-hidden="true">`;
const STAT_ES = { hp: i18n.t('shop.statHp'), damage: i18n.t('shop.statDamage'), pa: i18n.t('shop.statPa'), pm: i18n.t('shop.statPm'), initiative: i18n.t('shop.statInitiative'), shield: i18n.t('shop.statShield') };
const SLOT1 = { weapon: i18n.t('shop.slotWeapon'), hat: i18n.t('shop.slotHat'), shield: i18n.t('shop.slotShield'), body: i18n.t('shop.slotBody'), boots: i18n.t('shop.slotBoots'), material: i18n.t('shop.slotMaterial'), quest: i18n.t('shop.slotQuest') };
const RAR_NAME = { mystic: i18n.t('shop.rarMystic'), legendary: i18n.t('shop.rarMystic'), epic: i18n.t('shop.rarEpic'), rare: i18n.t('shop.rarRare'), uncommon: i18n.t('shop.rarUncommon'), common: i18n.t('shop.rarCommon') };
const RAR_ORDER = { mystic: 5, legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
const TABS = { buy: [['all', i18n.t('shop.tabAll')], ['res', i18n.t('shop.tabRes')], ['gear', i18n.t('shop.tabGear')], ['food', i18n.t('shop.tabFood')], ['potion', i18n.t('shop.tabPotion')]], sell: [['all', i18n.t('shop.tabAll')], ['res', i18n.t('shop.tabRes')], ['gear', i18n.t('shop.tabGear')], ['food', i18n.t('shop.tabFood')], ['potion', i18n.t('shop.tabPotion')], ['rc', i18n.t('shop.tabRc')], ['other', i18n.t('shop.tabQuest')]] };
const ORD = { res: 0, food: 1, potion: 2, gear: 3, rc: 4, other: 5 };

const fmt = (n) => i18n.num(n);
const fmtH = (h) => { const m = Math.max(1, Math.ceil(h * 60)); return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`; };
const isImg = (s) => typeof s === 'string' && (/^(\.\/|\/|assets\/|http|data:image)/.test(s) || /\.(png|jpe?g|webp|svg)$/i.test(s));
const rarVar = (r) => `var(--lk-rar-${['rare', 'epic', 'mystic', 'uncommon'].includes(r) ? r : r === 'legendary' ? 'mystic' : 'common'})`;
const bg = (it) => rarVar(it.mat ? it.matRarity : it.rarity); // fondo = color de la rareza (también en materiales)
const slotName = (it) => (it.mat ? i18n.t('shop.slotMaterial') : it.runeCharm ? (it.runeCharm === 'runes' ? i18n.t('shop.rune') : i18n.t('shop.charm')) : SLOT1[it.slot] || (it.category === 'food' ? i18n.t('shop.food') : (it.category === 'bag' ? i18n.t('shop.bag') : it.slot === 'consumable' ? i18n.t('shop.potion') : '')));
const tierLabel = (it) => (it.mat ? (it.tier ? `${MATERIAL_RARITY_NAME[it.matRarity] || ''} · ${BIOME[it.biome]?.[0] || ''}` : i18n.t('shop.catalyst')) : (EQ_SLOTS.includes(it.slot) && it.tier != null ? `Tier ${it.tier}` : ''));
function art(it) {
  if (it.mat && !it.icon) return matSvg(it.glyph);
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
/** Efecto de un consumible en una línea. */
const effectTxt = (it) => {
  const e = it.effect || {};
  return [e.bond && i18n.t('shop.effBond', { n: e.bond }), e.heal && i18n.t('shop.effHeal', { n: e.heal }), e.shield && i18n.t('shop.effShield', { n: e.shield }), e.pa && i18n.t('shop.effPa', { n: e.pa }), e.pm && i18n.t('shop.effPm', { n: e.pm })].filter(Boolean).join(' · ');
};
function matUses(id) {
  const rec = CRAFT_RECIPES.filter((r) => r.mats[id]).map((r) => ITEMS_DB[r.result]?.name).filter(Boolean);
  const evo = Object.entries(EVOLUTION_COST).filter(([, c]) => c.mats[id] || (id === 'mat_lunar_shard' && c.shards)).map(([t]) => `T${t}`);
  return [rec.length ? i18n.t('shop.useCraft', { list: `${rec.slice(0, 3).join(', ')}${rec.length > 3 ? '…' : ''}` }) : '', evo.length ? i18n.t('shop.useEvolve', { list: evo.join(', ') }) : ''].filter(Boolean).join(' · ') || i18n.t('shop.futureRecipes');
}

export function attachShop(game) {
  const ow = game.overworldManager;
  if (!ow || game.__lkShop) return null;
  game.__lkShop = true;
  ShopService.init({ equipmentManager: game.equipmentManager, onSave: () => { try { game._saveCurrentProgress?.(); } catch { /* nada */ } } });
  const em = game.equipmentManager;
  const sfx = (n) => { try { ow.audio?.[n]?.(); } catch { /* nada */ } };

  const modal = document.createElement('div');
  modal.id = 'shop-modal';
  modal.className = 'lk-ui lk-backdrop lk-shop-layer hidden';
  modal.innerHTML = `
    <div class="lk-panel-modal-window lk-shop" role="dialog" aria-label="${i18n.t('shop.shop')}">
      <div class="lk-panel-head">
        <span class="lk-emblem"><img class="lk-ai" src="${I('resource')}" alt=""></span>
        <h3><small data-ref="place">${i18n.t('shop.shop')}</small><span data-ref="name">${i18n.t('shop.merchant')}</span></h3>
        <div class="lk-segmented" data-ref="mode" role="tablist" aria-label="${i18n.t('shop.modeLabel')}"><button type="button" aria-pressed="true" data-m="buy">${i18n.t('shop.buy')}</button><button type="button" aria-pressed="false" data-m="sell">${i18n.t('shop.sell')}</button></div>
        <div class="lk-wallet" aria-label="${i18n.t('shop.coins')}"><span class="lk-res-pill" title="${i18n.t('shop.gold')}"><img class="lk-cur-ico" src="${curIcon('gold')}" alt="${i18n.t('shop.gold')}"><span data-ref="gold">0</span></span><span class="lk-res-pill lk-cur" title="${i18n.t('shop.slpTitle')}"><img class="lk-cur-ico" src="${curIcon('slp')}" alt="SLP"><span data-ref="slp">0</span></span><span class="lk-res-pill lk-cur" title="${i18n.t('shop.baxsTitle')}"><img class="lk-cur-ico" src="${curIcon('baxs')}" alt="bAXS"><span data-ref="baxs">0</span></span></div>
        <button type="button" class="lk-btn-close-x" data-act="close" aria-label="${i18n.t('shop.close')}">${sprite('i-close')}</button>
      </div>
      <div class="lk-shop-body">
        <div class="lk-shop-main">
          <div class="lk-shop-bar"><div class="lk-codex__filters" data-ref="tabs"></div><span class="lk-shop-restock" data-ref="restock"></span></div>
          <div class="lk-shop-grid" data-ref="grid"></div>
          <div class="lk-shop-buyback" data-ref="buyback" hidden></div>
        </div>
        <aside class="lk-shop-page" data-ref="page" aria-live="polite"></aside>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const $ = (r) => modal.querySelector(`[data-ref="${r}"]`);

  const SH = { shop: 'dojo_valley', mode: 'buy', tab: 'all', sel: null, qty: 1 };
  const api = { isOpen: false, open, close, service: ShopService };

  const heroId = () => { const h = ow.inventoryModal?.selectedHeroId; return h && em.equipped?.[h] ? h : 'sapidae'; };
  const heroName = (id) => em.heroesBase?.[id]?.name || id;

  function entries() {
    return SH.mode === 'buy' ? ShopService.buyList(SH.shop) : ShopService.sellList(SH.shop);
  }

  function render() {
    if (!api.isOpen) return;
    if (!runeCharmArtReady()) loadRuneCharmArt().then(() => render()); // arte de las runas y charms (pestaña Vender)
    const d = ShopService.def(SH.shop);
    $('place').textContent = i18n.t('shop.placeKicker', { place: d.place }); $('name').textContent = d.name;
    $('gold').textContent = fmt(ShopService.gold());
    const w = ForgeService.wallet();
    $('slp').textContent = fmt(w.slp); $('baxs').textContent = (Math.round(w.baxs * 100) / 100).toLocaleString(i18n.lang() === 'es' ? 'es' : 'en', { maximumFractionDigits: 2 });
    $('mode').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === SH.mode)));
    const all = entries();
    $('tabs').innerHTML = TABS[SH.mode].map(([k, n]) => { const c = k === 'all' ? all.length : all.filter((e) => kindOf(e.it) === k).length; return c || k === 'all' ? `<button type="button" class="lk-fchip lk-no-ico" data-k="${k}" aria-pressed="${SH.tab === k}">${n} <span style="opacity:.55">${c}</span></button>` : ''; }).join('');
    $('restock').innerHTML = SH.mode === 'buy' ? `<img class="lk-ai" src="${I('hourglass')}" alt="">${i18n.t('shop.restock', { t: fmtH(ShopService.restockInHours(SH.shop)) })}` : i18n.t('shop.sellRate');
    const list = all.filter((e) => SH.tab === 'all' || kindOf(e.it) === SH.tab);
    const tierKey = (it) => (it.mat && !it.tier ? 9 : it.tier || 0);
    list.sort((a, b) => ORD[kindOf(a.it)] - ORD[kindOf(b.it)] || tierKey(a.it) - tierKey(b.it) || (RAR_ORDER[a.it.rarity] || 0) - (RAR_ORDER[b.it.rarity] || 0) || a.it.name.localeCompare(b.it.name));
    if (!list.find((e) => e.key === SH.sel)) { SH.sel = list[0]?.key || null; SH.qty = 1; }
    const gold = ShopService.gold();
    $('grid').innerHTML = list.map((e) => {
      const it = e.it, buy = SH.mode === 'buy';
      const out = buy && e.left === 0, poor = buy && !out && e.price > gold, locked = !buy && e.locked;
      const qty = buy ? ShopService.have(e.id) : e.qty;
      const cap = locked ? (EQ_SLOTS.includes(it.slot) ? i18n.t('shop.wontBuy') : i18n.t('shop.notForSale')) : `${COIN}${fmt(e.price)}`;
      return `<button type="button" class="lk-it ${e.key === SH.sel ? 'lk-is-sel' : ''} ${out ? 'lk-is-out' : ''} ${poor ? 'lk-is-poor' : ''} ${locked ? 'lk-is-locked' : ''}" data-k="${esc(e.key)}" style="--r:${bg(it)}" aria-label="${esc(it.name)}${qty > 1 ? ` ×${qty}` : ''}"><span class="lk-art">${art(it)}${EQ_SLOTS.includes(it.slot) && it.tier != null ? `<span class="lk-tier">T${it.tier}</span>` : ''}${qty > 1 ? `<span class="lk-qty">×${qty}</span>` : ''}</span><span class="lk-cap ${locked ? '' : 'lk-price'}">${cap}</span></button>`;
    }).join('') || `<p class="lk-sp-empty" style="color:#8D97AF">${SH.mode === 'sell' ? i18n.t('shop.nothingToSell') : i18n.t('shop.nothingHere')}</p>`;
    renderBuyback();
    renderPage(list.find((e) => e.key === SH.sel));
  }

  function renderBuyback() {
    const el = $('buyback'); el.hidden = SH.mode !== 'sell';
    if (el.hidden) return;
    const bb = ShopService.buyback(SH.shop);
    el.innerHTML = `<span class="lk-label">${i18n.t('shop.buyback')}</span>${bb.length ? `<div class="lk-bb-list">${bb.map((b, i) => `<button type="button" class="lk-bb" data-i="${i}" title="${i18n.t('shop.buybackTitle', { qty: b.qty > 1 ? `${b.qty} × ` : '', item: esc(b.it.name), n: fmt(b.paid) })}" style="--r:${bg(b.it)}"><span class="lk-bi">${art(b.it)}</span><span class="lk-bn">${b.qty > 1 ? `×${b.qty} ` : ''}${esc(b.it.name)}</span><span class="lk-bp">${COIN}${fmt(b.paid)}</span></button>`).join('')}</div>` : `<span class="lk-muted">${i18n.t('shop.buybackEmpty')}</span>`}`;
  }

  function renderPage(e) {
    const pg = $('page');
    if (!e) { pg.innerHTML = `<p class="lk-sp-empty">${i18n.t('shop.pickOne')}</p>`; return; }
    const it = e.it, buy = SH.mode === 'buy', unit = e.price, gold = ShopService.gold();
    const isGear = EQ_SLOTS.includes(it.slot);
    const hid = heroId(), curId = isGear ? em.equipped?.[hid]?.[it.slot] : null, curIt = curId && ITEMS_DB[curId];
    const max = buy ? Math.max(0, Math.min(e.left ?? 99, unit ? Math.floor(gold / unit) : 99, isGear ? 1 : 99)) : (e.qty || 1);
    SH.qty = Math.max(1, Math.min(SH.qty, Math.max(1, max)));
    const total = unit * SH.qty;
    let why = '';
    if (buy && e.left === 0) why = i18n.t('shop.soldOut');
    else if (buy && unit > gold) why = i18n.t('shop.needGold', { n: fmt(unit - gold) });
    else if (!buy && e.locked) why = e.lockWhy;
    const noSale = !buy && e.locked; // el mercader no lo compra: sin cantidad, sin resumen
    const valuable = !buy && !noSale && isGear && (RAR_ORDER[it.rarity] || 0) >= 3;
    const compare = isGear ? `<div class="lk-sp-sec"><span class="lk-label">${i18n.t('shop.vsWorn', { hero: esc(heroName(hid)) })}</span><div class="lk-sp-stats">${statRows(it, curIt)}</div><small style="font-size:.7rem;font-weight:700;color:var(--lk-ink-600)">${curIt ? i18n.t('shop.nowWearing', { item: esc(curIt.name), tier: curIt.tier }) : i18n.t('shop.notWearing', { hero: esc(heroName(hid)), slot: SLOT1[it.slot].toLowerCase() })}</small></div>` : '';
    const uses = it.mat ? `<div class="lk-sp-sec"><span class="lk-label">${i18n.t('shop.usedIn')}</span><div class="lk-sp-note"><img class="lk-ai" src="${I('build')}" alt=""><span>${esc(matUses(it.id))}</span></div><div class="lk-sp-note"><img class="lk-ai" src="${I('map')}" alt=""><span><b>${i18n.t('shop.whereGet')}</b> ${esc(it.source)}</span></div></div>` : '';
    const eff = !it.mat && !isGear && effectTxt(it) ? `<div class="lk-sp-note"><img class="lk-ai" src="${I('heart')}" alt=""><span>${esc(effectTxt(it))}</span></div>` : '';
    const nx = isGear && nextEvolution(it.id) && ITEMS_DB[nextEvolution(it.id)];
    const evo = nx ? `<div class="lk-sp-note"><img class="lk-ai" src="${I('upgrade')}" alt=""><span>${i18n.t('shop.evolvesTo', { item: esc(nx.name), tier: nx.tier })}</span></div>` : '';
    pg.innerHTML = `
      <div class="lk-sp-head"><span class="lk-sp-art" style="--r:${bg(it)}">${art(it)}</span><div><small>${esc(slotName(it))}${tierLabel(it) ? ` · ${esc(tierLabel(it))}` : ''}</small><b>${esc(it.name)}</b>${((r) => `<span class="lk-rar-chip" data-r="${r === 'legendary' ? 'mystic' : r}">${RAR_NAME[r] || i18n.t('shop.rarCommon')}</span>`)((it.mat ? it.matRarity : it.rarity) || 'common')}</div></div>
      <p class="lk-sp-desc">${esc(it.description || '')}</p>
      ${compare}${uses}${eff}${evo}
      ${!buy && e.locked ? '' : `<div class="lk-sp-qty"><span class="lk-step"><button type="button" data-q="-1" aria-label="${i18n.t('shop.less')}" ${SH.qty <= 1 ? 'disabled' : ''}>−</button><output>${SH.qty}</output><button type="button" data-q="1" aria-label="${i18n.t('shop.more')}" ${SH.qty >= max ? 'disabled' : ''}>+</button></span>${max > 1 ? `<button type="button" class="lk-max" data-q="max">${i18n.t('shop.max')}</button>` : ''}<span class="lk-have">${buy ? `${i18n.t('shop.have', { n: ShopService.have(it.id) })}${e.left != null ? ` · ${i18n.t('shop.left', { n: e.left })}` : ''}` : i18n.t('shop.have', { n: e.qty })}</span></div>`}
      ${noSale ? '' : `<div class="lk-sp-sum">
        <div><span>${i18n.t('shop.unitPrice')}</span><b>${COIN}${fmt(unit)}</b></div>
        <div class="lk-total"><span>${buy ? i18n.t('shop.total') : i18n.t('shop.youGet')}</span><b>${COIN}${fmt(total)}</b></div>
        <div><span>${buy ? i18n.t('shop.leftAfter') : i18n.t('shop.youllHave')}</span><b class="${buy && total > gold ? 'lk-neg' : ''}">${COIN}${fmt(buy ? gold - total : gold + total)}</b></div>
      </div>`}
      <div class="lk-sp-act">
        <button type="button" class="lk-btn ${buy ? 'lk-btn-primary-gold' : 'lk-btn-secondary-wood'} ${valuable ? 'lk-hold' : ''}" data-act="go" ${why ? 'disabled' : ''}>${valuable ? '<span class="lk-fill"></span>' : ''}<span class="lk-b-ico">${buy ? `<img class="lk-ai" src="${I('add')}" alt="">` : `<img class="lk-cur-ico" src="${curIcon('gold')}" alt="">`}</span>${buy ? i18n.t('shop.buyBtn', { q: SH.qty, n: fmt(total) }) : noSale ? i18n.t('shop.cantSellHere') : valuable ? i18n.t('shop.holdSell', { n: fmt(total) }) : i18n.t('shop.sellBtn', { q: SH.qty, n: fmt(total) })}</button>
        <span class="lk-why">${esc(why)}</span>
      </div>`;
    pg.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { SH.qty = b.dataset.q === 'max' ? max : SH.qty + Number(b.dataset.q); renderPage(e); }));
    const go = pg.querySelector('[data-act="go"]');
    if (valuable) holdToConfirm(go, () => doShop(e));
    else go.addEventListener('click', () => doShop(e));
  }

  /** Vender lo valioso: mantener pulsado 0,9 s (o Intro/Espacio con el teclado). */
  function holdToConfirm(btn, done) {
    const fill = btn.querySelector('.lk-fill'); let t0 = 0, raf = 0;
    const stop = () => { cancelAnimationFrame(raf); fill.style.width = '0'; };
    const step = (now) => { const p = Math.min(1, (now - t0) / 900); fill.style.width = `${p * 100}%`; if (p >= 1) { stop(); done(); } else raf = requestAnimationFrame(step); };
    btn.addEventListener('pointerdown', (ev) => { if (btn.disabled) return; ev.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(step); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => btn.addEventListener(n, stop));
    btn.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); done(); } });
  }

  function doShop(e) {
    const q = SH.qty;
    const r = SH.mode === 'buy' ? ShopService.buy(SH.shop, e.id, q) : ShopService.sell(SH.shop, e.id, q);
    if (!r.ok) { toast(r.why || i18n.t('shop.failed'), true); render(); return; }
    sfx(SH.mode === 'buy' ? 'playBuff' : 'playHover');
    toast(SH.mode === 'buy' ? i18n.t('shop.bought', { qty: q > 1 ? `${q} × ` : '', item: r.it.name, extra: r.it.mat ? ` · ${i18n.t('shop.toPouch')}` : '' }) : i18n.t('shop.sold', { qty: q > 1 ? `${q} × ` : '', item: r.it.name, n: fmt(r.gain) }));
    if (SH.mode === 'sell') SH.qty = 1;
    render();
    const cell = modal.querySelector(`.lk-shop-grid .lk-it[data-k="${CSS.escape(SH.sel || '')}"]`);
    if (cell && !matchMedia('(prefers-reduced-motion: reduce)').matches) cell.classList.add('lk-is-flash');
  }

  // ------------------------------------------------------------------ eventos
  $('mode').addEventListener('click', (ev) => { const b = ev.target.closest('button[data-m]'); if (!b) return; SH.mode = b.dataset.m; SH.tab = 'all'; SH.sel = null; SH.qty = 1; sfx('playHover'); render(); });
  $('tabs').addEventListener('click', (ev) => { const b = ev.target.closest('.lk-fchip'); if (!b) return; SH.tab = b.dataset.k; render(); });
  $('grid').addEventListener('click', (ev) => { const b = ev.target.closest('.lk-it[data-k]'); if (!b) return; SH.sel = b.dataset.k; SH.qty = 1; sfx('playHover'); render(); });
  $('buyback').addEventListener('click', (ev) => {
    const b = ev.target.closest('.lk-bb'); if (!b) return;
    const r = ShopService.rebuy(SH.shop, +b.dataset.i);
    if (!r.ok) { toast(r.why || i18n.t('shop.rebuyFail'), true); return; }
    toast(i18n.t('shop.rebought', { item: r.it.name })); render();
  });
  modal.querySelector('[data-act="close"]').addEventListener('click', close);
  modal.addEventListener('pointerdown', (ev) => { if (ev.target === modal) close(); });
  modal.addEventListener('wheel', (ev) => ev.stopPropagation(), { passive: true });

  // Mientras está abierta se queda con el teclado (Esc la cierra)
  window.addEventListener('keydown', (ev) => {
    if (!api.isOpen) return;
    if (ev.code === 'Escape') { ev.preventDefault(); close(); }
    ev.stopImmediatePropagation();
  }, true);
  if (typeof ow.isAnyModalOpen === 'function') {
    const prev = ow.isAnyModalOpen.bind(ow);
    ow.isAnyModalOpen = () => api.isOpen || prev();
  }

  function open(shopId = 'dojo_valley') {
    if (document.body.classList.contains('state-combat') || window.__AXIE_TACTICS_APP__?.gameState === 'BATTLE') return;
    if (!ShopService.def(shopId)) return;
    const lock = ow.tutorialManager?.lockMessage?.('shop'); // Hito 48
    if (lock && !api.isOpen) { ow._showFeatureLockedFeedback?.(lock); return; }
    if (SH.shop !== shopId) { SH.shop = shopId; SH.sel = null; }
    SH.mode = 'buy'; SH.tab = 'all'; SH.qty = 1;
    if (!api.isOpen) {
      api.isOpen = true;
      ow.npcManager?.hideAllOverlays?.();
      modal.classList.remove('hidden'); void modal.offsetWidth; modal.classList.add('lk-is-open');
      sfx('playBuff');
    }
    render();
  }
  function close() {
    if (!api.isOpen) return;
    api.isOpen = false;
    modal.classList.remove('lk-is-open'); modal.classList.add('hidden');
    sfx('playStep');
  }

  ow.shopModal = api;
  window.lunakaiShop = { open, close, service: ShopService };
  return api;
}
