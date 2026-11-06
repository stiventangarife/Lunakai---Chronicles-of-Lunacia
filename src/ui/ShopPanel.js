// ShopPanel.js — Pantalla de la Tienda (sistema de diseño · 24 «Tienda · Comprar y vender»).
// La abre el mercader del Valle del Dojō al hablar con él (NPCManager · type 'merchant'), con `open(shopId)`.
//
//  · Cuadrícula a la izquierda: la franja de abajo es el precio (en rojo si no te alcanza); la cantidad que tienes va
//    en la chapa. Agotado = casilla apagada. Pestañas: Recursos, Equipo, Comida, Pociones (y Misión al vender).
//  · Ficha marfil a la derecha: comparación con lo que lleva tu héroe (▲▼), cantidad, total y oro que te quedará.
//    Lo raro o mejor se vende manteniendo pulsado. Lo último vendido se recompra al mismo precio.
// Las reglas y el guardado están en rpg/ShopService.js.
//  · Hito 77 · Mercado (tercer modo): anuncios de otros jugadores (materiales, comida y pociones por oro), vender lo tuyo
//    con precio propio, tus anuncios e historial. Invitados: solo mirar. Servidor en net/MarketService.js.
//  · Hito 110 · El equipo T1–3, las runas y los charms se compran y venden en AXS (antes bAXS, que ya no se intercambia);
//    llevan el sello «NFT». La cabecera muestra oro · SLP · AXS · bAXS.

import { ShopService, itemOf, kindOf, EQ_SLOTS } from '../rpg/ShopService.js';
import { ForgeService } from '../rpg/ForgeService.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import { CRAFT_RECIPES, EVOLUTION_COST, nextEvolution, MATERIAL_RARITY_NAME } from '../tactics/data/EconomyCatalog.js';
import { asset, esc, toast, sprite, curIcon, isNftGear, nftSeal } from './lk.js';
import { BIOME, matSvg } from './ForgePanel.js';
import { loadRuneCharmArt, runeCharmArtReady } from './RuneCharmArt.js';
import * as i18n from '../i18n/i18n.js';
import { MarketService, MARKET_MAX_LISTINGS, AXS_CEIL as MARKET_CEIL, isDecimalCurrency as isDec } from '../net/MarketService.js';
import { buyPrice } from '../tactics/data/EconomyCatalog.js';

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
        <div class="lk-segmented" data-ref="mode" role="tablist" aria-label="${i18n.t('shop.modeLabel')}"><button type="button" aria-pressed="true" data-m="buy">${i18n.t('shop.buy')}</button><button type="button" aria-pressed="false" data-m="sell">${i18n.t('shop.sell')}</button><button type="button" aria-pressed="false" data-m="market">${i18n.t('market.mode')}</button></div>
        <div class="lk-wallet" aria-label="${i18n.t('shop.coins')}"><span class="lk-res-pill" title="${i18n.t('shop.gold')}"><img class="lk-cur-ico" src="${curIcon('gold')}" alt="${i18n.t('shop.gold')}"><span data-ref="gold">0</span></span><span class="lk-res-pill lk-cur" title="${i18n.t('shop.slpTitle')}"><img class="lk-cur-ico" src="${curIcon('slp')}" alt="SLP"><span data-ref="slp">0</span></span><span class="lk-res-pill lk-cur" title="${i18n.t('shop.axsTitle')}"><img class="lk-cur-ico" src="${curIcon('axs')}" alt="AXS"><span data-ref="axs">0</span></span><span class="lk-res-pill lk-cur" title="${i18n.t('shop.baxsTitle')}"><img class="lk-cur-ico" src="${curIcon('baxs')}" alt="bAXS"><span data-ref="baxs">0</span></span></div>
        <button type="button" class="lk-btn-close-x lk-cdx-help" data-codex="economy" aria-label="${i18n.t('codex.help')}" title="${i18n.t('codex.help')}">?</button>
        <button type="button" class="lk-btn-close-x" data-act="close" aria-label="${i18n.t('shop.close')}">${sprite('i-close')}</button>
      </div>
      <div class="lk-shop-body">
        <div class="lk-shop-main">
          <div class="lk-shop-bar"><div class="lk-codex__filters" data-ref="tabs"></div><span class="lk-shop-restock" data-ref="restock"></span></div>
          <div class="lk-shop-guide" data-ref="guide" hidden></div>
          <div class="lk-shop-grid" data-ref="grid"></div>
          <div class="lk-shop-buyback" data-ref="buyback" hidden></div>
        </div>
        <aside class="lk-shop-page" data-ref="page" aria-live="polite"></aside>
      </div>
    </div>`;
  document.body.appendChild(modal);
  if (!document.getElementById('lk-market-css')) { // Hito 77: el precio editable del Mercado, con el mismo aspecto que la cantidad
    const st = document.createElement('style'); st.id = 'lk-market-css';
    st.textContent = '.lk-shop-guide[hidden]{display:none}.lk-shop-guide{display:flex;align-items:center;gap:10px;margin:0;padding:8px 12px;border-radius:12px;border:1px solid rgba(232,196,120,.55);background:linear-gradient(90deg,rgba(120,84,30,.45),rgba(40,30,18,.35));color:var(--lk-ivory-50);font:700 .86rem var(--lk-font-ui)}.lk-shop-guide img{width:34px;height:34px;border-radius:50%;flex:none;object-fit:cover;object-position:50% 12%;background:rgba(0,0,0,.25);border:1px solid rgba(232,196,120,.6)}.lk-shop-guide span{flex:1}.lk-shop-guide .lk-btn{flex:none;padding:6px 12px;font-size:.8rem}.lk-it.lk-is-guide{box-shadow:0 0 0 2px var(--lk-gilt-300),0 0 14px 3px rgba(240,200,110,.55);animation:lkGuidePulse 1.4s ease-in-out infinite}@keyframes lkGuidePulse{50%{box-shadow:0 0 0 3px var(--lk-gilt-300),0 0 22px 6px rgba(240,200,110,.75)}}@media (prefers-reduced-motion: reduce){.lk-it.lk-is-guide{animation:none}}' + '.lk-sp-qty .lk-step .lk-mk-price{width:64px;height:34px;border:0;background:none;text-align:center;font:900 .95rem var(--lk-font-ui);color:var(--lk-ivory-50);font-variant-numeric:tabular-nums;-moz-appearance:textfield;appearance:textfield}.lk-mk-price::-webkit-inner-spin-button,.lk-mk-price::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.lk-mk-price:focus-visible{outline:2px solid var(--lk-gilt-300);border-radius:8px}.lk-mk-sep{width:1px;height:18px;background:rgba(211,174,108,.3);margin:0 2px}';
    document.head.appendChild(st);
  }
  const $ = (r) => modal.querySelector(`[data-ref="${r}"]`);

  const SH = { shop: 'dojo_valley', mode: 'buy', tab: 'all', sel: null, qty: 1, guide: null }; // guide (Hito 124): { focus, note(), action }
  const MK = { tab: 'browse', cat: 'all', tier: 0, confirm: null, loaded: false, loading: false, browse: [], mine: [], history: [], blocked: false, price: {}, hints: {} };
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
    const dec = (v) => (Math.round((Number(v) || 0) * 100) / 100).toLocaleString(i18n.lang() === 'es' ? 'es' : 'en', { maximumFractionDigits: 2 });
    $('slp').textContent = fmt(w.slp); $('axs').textContent = dec(w.axs); $('baxs').textContent = dec(w.baxs);
    $('mode').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === SH.mode)));
    renderGuide();
    if (SH.mode === 'market') { renderMarket(); return; }
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
      const guide = buy && SH.guide?.focus === e.id && SH.guide.note?.() != null && !SH.guide.done?.();
      return `<button type="button" class="lk-it ${e.key === SH.sel ? 'lk-is-sel' : ''} ${guide ? 'lk-is-guide' : ''} ${out ? 'lk-is-out' : ''} ${poor ? 'lk-is-poor' : ''} ${locked ? 'lk-is-locked' : ''}" data-k="${esc(e.key)}" style="--r:${bg(it)}" aria-label="${esc(it.name)}${qty > 1 ? ` ×${qty}` : ''}"><span class="lk-art">${art(it)}${EQ_SLOTS.includes(it.slot) && it.tier != null ? `<span class="lk-tier">T${it.tier}</span>` : ''}${qty > 1 ? `<span class="lk-qty">×${qty}</span>` : ''}${isNftGear(it) ? nftSeal(i18n.t('market.nftHint')) : ''}</span><span class="lk-cap ${locked ? '' : 'lk-price'}">${cap}</span></button>`;
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
      <div class="lk-sp-head"><span class="lk-sp-art" style="--r:${bg(it)}">${art(it)}</span><div><small>${esc(slotName(it))}${tierLabel(it) ? ` · ${esc(tierLabel(it))}` : ''}</small><b>${esc(it.name)}</b>${((r) => `<span class="lk-rar-chip" data-r="${r === 'legendary' ? 'mystic' : r}">${RAR_NAME[r] || i18n.t('shop.rarCommon')}</span>`)((it.mat ? it.matRarity : it.rarity) || 'common')}${isNftGear(it) ? `<span class="lk-nft-chip" title="${esc(i18n.t('market.nftHint'))}">${nftSeal('', 'lk-nft-seal--chip')}${i18n.t('market.nft')}</span>` : ''}</div></div>
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

  /** Hito 124: franja de misión encima de la rejilla (la usa la misión de Ochi). Se oculta cuando note() devuelve null. */
  function renderGuide() {
    const el = $('guide'), g = SH.guide, txt = g?.note?.();
    // La columna es una rejilla «barra · objetos (elástica) · recompra»: con la franja visible hay una fila más
    const show = !!g && txt != null && SH.mode !== 'market';
    el.parentElement.style.gridTemplateRows = show ? 'auto auto minmax(0,1fr) auto' : '';
    if (!show) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const act = g.action?.();
    el.innerHTML = `${g.avatar ? `<img src="${esc(g.avatar)}" alt="">` : ''}<span>${esc(txt)}</span>${act ? `<button type="button" class="lk-btn lk-btn-primary-gold" data-act="guide">${esc(act.label)}</button>` : ''}`;
    el.querySelector('[data-act="guide"]')?.addEventListener('click', () => { close(); act.run(); });
  }

  async function doShop(e) {
    if (SH.busy) return;
    const q = SH.qty;
    SH.busy = true;
    let r;
    try { r = SH.mode === 'buy' ? await ShopService.buyAsync(SH.shop, e.id, q) : await ShopService.sellAsync(SH.shop, e.id, q); } finally { SH.busy = false; }
    if (!r.ok) { toast(r.why || i18n.t('shop.failed'), true); render(); return; }
    sfx(SH.mode === 'buy' ? 'playBuff' : 'playHover');
    toast(SH.mode === 'buy' ? i18n.t('shop.bought', { qty: q > 1 ? `${q} × ` : '', item: r.it.name, extra: r.it.mat ? ` · ${i18n.t('shop.toPouch')}` : '' }) : i18n.t('shop.sold', { qty: q > 1 ? `${q} × ` : '', item: r.it.name, n: fmt(r.gain) }));
    if (SH.mode === 'sell') SH.qty = 1;
    render();
    const cell = modal.querySelector(`.lk-shop-grid .lk-it[data-k="${CSS.escape(SH.sel || '')}"]`);
    if (cell && !matchMedia('(prefers-reduced-motion: reduce)').matches) cell.classList.add('lk-is-flash');
  }


  // ------------------------------------------------------------------ Hito 77 · Mercado entre jugadores
  // Hito 78: cada objeto tiene su moneda y hay filtros por tipo y tier. Hito 110: oro (recursos) · AXS (equipo T1–3,
  // runas y charms). El bAXS solo aparece en el historial de antes del cambio.
  const MK_TABS = [['browse', 'market.tabBrowse'], ['sell', 'market.tabSell'], ['mine', 'market.tabMine'], ['history', 'market.tabHistory']];
  const MK_CATS = [['all', 'market.catAll'], ['res', 'market.catRes'], ['gear', 'market.catGear'], ['rc', 'market.catRc']];
  const qtyTxt = (q) => (q > 1 ? `${q} × ` : '');
  const hoursLeft = (iso) => Math.max(0, (new Date(iso).getTime() - Date.now()) / 3600e3);
  const CUR_ICO = Object.fromEntries(['axs', 'baxs'].map((k) => [k, `<img class="lk-coin" src="${curIcon(k)}" alt="" aria-hidden="true">`]));
  const CUR_NAME = { axs: 'AXS', baxs: 'bAXS' };
  const curIco = (cur) => CUR_ICO[cur] || COIN;
  const curWord = (cur) => CUR_NAME[cur] || i18n.t('market.goldWord');
  const money = (v, cur) => (isDec(cur)
    ? Number(v || 0).toLocaleString(i18n.lang() === 'es' ? 'es' : 'en', { minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2 })
    : fmt(v));
  const priced = (v, cur) => `${curIco(cur)}${money(v, cur)}`;
  const mul = (price, q, cur) => (isDec(cur) ? Math.round(Math.round(price * 100) * q) / 100 : price * q); // sin errores de coma flotante
  const walletOf = (cur) => (cur === 'axs' || cur === 'baxs' ? Number(ForgeService.wallet()[cur]) || 0 : ShopService.gold());
  const curOf = (e) => e.l?.currency || e.h?.currency || e.rule?.currency || MarketService.rule(e.id)?.currency || 'gold';
  const catOf = (e) => (curOf(e) === 'gold' ? 'res' : (e.l?.kind || e.rule?.kind || MarketService.rule(e.id)?.kind) === 'rc' || e.it?.category === 'bag' ? 'rc' : 'gear');
  const needTxt = (cur, n) => (cur === 'axs' ? i18n.t('market.needAxs', { n: money(n, cur) }) : cur === 'baxs' ? i18n.t('market.needBaxs', { n: money(n, cur) }) : i18n.t('shop.needGold', { n: fmt(n) }));
  const isNft = (cur, it = null) => cur === 'axs' && it?.category !== 'bag'; // Hito 110: equipo, runas y charms se perciben como NFT (las bolsas no)

  async function loadMarket(force = false) {
    if (MK.loading || (MK.loaded && !force)) return;
    MK.loading = true; if (!MK.loaded) render();
    try {
      const [, br, mi] = await Promise.all([MarketService.rules(force), MarketService.browse(), MarketService.mine()]);
      MK.browse = br?.ok ? br.listings || [] : [];
      if (mi?.ok) { MK.mine = mi.listings || []; MK.history = mi.history || []; MK.blocked = !!mi.blocked; } else { MK.mine = []; MK.history = []; }
      MK.loaded = true;
    } finally { MK.loading = false; }
    render();
  }

  function marketEntries() {
    const withIt = (arr) => arr.filter((e) => e.it);
    if (MK.tab === 'browse') return withIt(MK.browse.map((l) => ({ key: `L${l.id}`, id: l.item, it: itemOf(l.item), l, price: Number(l.price), qty: l.qtyLeft })));
    if (MK.tab === 'mine') return withIt(MK.mine.map((l) => ({ key: `L${l.id}`, id: l.item, it: itemOf(l.item), l, price: Number(l.price), qty: l.status === 'open' ? l.qtyLeft : l.qty })));
    if (MK.tab === 'history') return withIt(MK.history.map((h, i) => ({ key: `H${i}`, id: h.item, it: itemOf(h.item), h, price: Number(h.price), qty: h.qty })));
    const rules = MarketService._rules || {};
    return withIt(Object.keys(rules).map((id) => ({ key: id, id, it: itemOf(id), rule: rules[id], qty: MarketService.have(id) })).filter((e) => e.qty > 0));
  }
  /** Precio de partida al vender: mediana de las ventas, o el de Ochi (oro), o el doble del mínimo (AXS). */
  function defaultPrice(e) {
    const r = e.rule, hint = MK.hints[e.id];
    const base = Number(hint?.median) || (isDec(r.currency) ? r.min * 2 : buyPrice(e.it) || r.min);
    return Math.min(r.max ?? MARKET_CEIL, Math.max(r.min, isDec(r.currency) ? Math.round(base * 100) / 100 : Math.round(base)));
  }

  function renderMarket() {
    $('buyback').hidden = true;
    const all = marketEntries();
    const filtered = MK.tab === 'browse' || MK.tab === 'sell';
    const chip = (attr, k, label, on, count = null) => `<button type="button" class="lk-fchip lk-no-ico" data-${attr}="${k}" aria-pressed="${on}">${label}${count != null ? ` <span style="opacity:.55">${count}</span>` : ''}</button>`;
    let bar = MK_TABS.map(([k, n]) => chip('mk', k, i18n.t(n), MK.tab === k)).join('');
    let list = all;
    if (filtered && MK.loaded && !MarketService.unavailable) {
      const cnt = (c) => (c === 'all' ? all.length : all.filter((e) => catOf(e) === c).length);
      bar += `<span class="lk-mk-sep" aria-hidden="true"></span>${MK_CATS.map(([k, n]) => (cnt(k) || k === 'all' || MK.cat === k ? chip('mkc', k, i18n.t(n), MK.cat === k, cnt(k)) : '')).join('')}`;
      if (MK.cat !== 'all') list = list.filter((e) => catOf(e) === MK.cat);
      if (MK.cat === 'gear') {
        bar += [0, 1, 2, 3].map((t) => chip('mkt', t, t ? `T${t}` : i18n.t('market.allTiers'), MK.tier === t)).join('');
        if (MK.tier) list = list.filter((e) => e.it.tier === MK.tier);
      }
    }
    $('tabs').innerHTML = bar;
    const openN = MK.mine.filter((l) => l.status === 'open').length;
    $('restock').textContent = MarketService.canTrade && (MK.tab === 'sell' || MK.tab === 'mine') ? i18n.t('market.limit', { n: openN }) : i18n.t('market.rules');
    const CAT_ORD = { res: 0, gear: 1, rc: 2 };
    if (MK.tab === 'browse') list.sort((a, b) => CAT_ORD[catOf(a)] - CAT_ORD[catOf(b)] || a.it.name.localeCompare(b.it.name) || a.price - b.price);
    else if (MK.tab === 'sell') list.sort((a, b) => CAT_ORD[catOf(a)] - CAT_ORD[catOf(b)] || ORD[kindOf(a.it)] - ORD[kindOf(b.it)] || (a.it.tier || 0) - (b.it.tier || 0) || a.it.name.localeCompare(b.it.name));
    if (!list.find((e) => e.key === SH.sel)) { SH.sel = list[0]?.key || null; SH.qty = 1; MK.confirm = null; }
    const STATUS_CAP = { sold: 'market.status.sold', cancelled: 'market.status.cancelled', expired: 'market.status.expired' };
    let empty = '';
    if (!MK.loaded) empty = i18n.t('market.loading');
    else if (MarketService.unavailable) empty = i18n.t('market.err.unavailable');
    else if (MK.tab !== 'browse' && !MarketService.canTrade) empty = i18n.t('market.guestOnly');
    else empty = i18n.t({ browse: 'market.empty', sell: 'market.nothingToList', mine: 'market.noListings', history: 'market.noHistory' }[MK.tab]);
    const shown = !MK.loaded || MarketService.unavailable || (MK.tab !== 'browse' && !MarketService.canTrade) ? [] : list;
    $('grid').innerHTML = shown.map((e) => {
      const it = e.it, l = e.l, cur = curOf(e);
      const closed = l && l.status !== 'open';
      const poor = MK.tab === 'browse' && !l.mine && e.price > walletOf(cur);
      let cap = priced(e.price || 0, cur);
      if (MK.tab === 'sell') cap = priced(MK.price[e.id] ?? defaultPrice(e), cur);
      if (closed) cap = i18n.t(STATUS_CAP[l.status]);
      if (e.h) cap = `${e.h.side === 'sell' ? '+' : '−'}${priced(e.h.side === 'sell' ? e.h.gross - e.h.fee : e.h.gross, cur)}`;
      const tier = EQ_SLOTS.includes(it.slot) && it.tier != null ? `<span class="lk-tier">T${it.tier}</span>` : '';
      const nft = isNft(cur, it) ? nftSeal(i18n.t('market.nftHint')) : '';
      return `<button type="button" class="lk-it ${e.key === SH.sel ? 'lk-is-sel' : ''} ${closed ? 'lk-is-out' : ''} ${poor ? 'lk-is-poor' : ''}" data-k="${esc(e.key)}" style="--r:${bg(it)}" aria-label="${esc(it.name)}${e.qty > 1 ? ` ×${e.qty}` : ''}"><span class="lk-art">${art(it)}${tier}${nft}${e.qty > 1 ? `<span class="lk-qty">×${e.qty}</span>` : ''}</span><span class="lk-cap ${closed ? '' : 'lk-price'}">${cap}</span></button>`;
    }).join('') || `<p class="lk-sp-empty" style="color:#8D97AF;grid-column:1/-1">${esc(empty)}</p>`;
    renderMarketPage(shown.find((e) => e.key === SH.sel));
  }

  const head = (it, small = '', cur = 'gold') => `<div class="lk-sp-head"><span class="lk-sp-art" style="--r:${bg(it)}">${art(it)}</span><div><small>${esc(slotName(it))}${tierLabel(it) ? ` · ${esc(tierLabel(it))}` : ''}${small ? ` · ${esc(small)}` : ''}</small><b>${esc(it.name)}</b>${((r) => `<span class="lk-rar-chip" data-r="${r === 'legendary' ? 'mystic' : r}">${RAR_NAME[r] || i18n.t('shop.rarCommon')}</span>`)((it.mat ? it.matRarity : it.rarity) || 'common')}${isNft(cur, it) || isNftGear(it) ? `<span class="lk-nft-chip" title="${esc(i18n.t('market.nftHint'))}">${nftSeal('', 'lk-nft-seal--chip')}${i18n.t('market.nft')}</span>` : ''}</div></div>`;
  const note = (icon, html) => `<div class="lk-sp-note"><img class="lk-ai" src="${I(icon)}" alt=""><span>${html}</span></div>`;
  const stepper = (val, max, ref) => `<span class="lk-step"><button type="button" data-${ref}="-1" aria-label="${i18n.t('shop.less')}" ${val <= 1 ? 'disabled' : ''}>−</button><output>${val}</output><button type="button" data-${ref}="1" aria-label="${i18n.t('shop.more')}" ${val >= max ? 'disabled' : ''}>+</button></span>${max > 1 ? `<button type="button" class="lk-max" data-${ref}="max">${i18n.t('shop.max')}</button>` : ''}`;
  const sumRow = (label, v, cls = '') => `<div class="${cls}"><span>${label}</span><b>${v}</b></div>`;
  const actBtn = (cls, icon, label, why) => `<div class="lk-sp-act"><button type="button" class="lk-btn ${cls}" data-act="mk" ${why ? 'disabled' : ''}><span class="lk-b-ico">${icon}</span>${label}</button><span class="lk-why">${esc(why)}</span></div>`;
  /** Equipo: comparación con lo que lleva tu héroe (como en la tienda de Ochi). Runas, charms y consumibles: su efecto. */
  function details(it) {
    if (EQ_SLOTS.includes(it.slot)) {
      const hid = heroId(), curId = em.equipped?.[hid]?.[it.slot], curIt = curId && ITEMS_DB[curId];
      return `<div class="lk-sp-sec"><span class="lk-label">${i18n.t('shop.vsWorn', { hero: esc(heroName(hid)) })}</span><div class="lk-sp-stats">${statRows(it, curIt)}</div><small style="font-size:.7rem;font-weight:700;color:var(--lk-ink-600)">${curIt ? i18n.t('shop.nowWearing', { item: esc(curIt.name), tier: curIt.tier }) : i18n.t('shop.notWearing', { hero: esc(heroName(hid)), slot: SLOT1[it.slot].toLowerCase() })}</small></div>`;
    }
    if (!it.mat && !it.runeCharm && effectTxt(it)) return note('heart', esc(effectTxt(it)));
    return '';
  }

  function renderMarketPage(e) {
    const pg = $('page');
    if (!e) { pg.innerHTML = `<p class="lk-sp-empty">${MK.loaded && !MarketService.unavailable ? i18n.t('shop.pickOne') : ''}</p>`; return; }
    const it = e.it, cur = curOf(e), wallet = walletOf(cur);
    let html = '', act = null;
    if (MK.tab === 'browse') {
      const l = e.l, price = Number(l.price), max = Math.max(0, Math.min(l.qtyLeft, Math.floor((wallet + 1e-9) / price)));
      SH.qty = Math.max(1, Math.min(SH.qty, Math.max(1, max)));
      const total = mul(price, SH.qty, cur);
      const why = !MarketService.canTrade ? i18n.t('market.err.guest') : l.mine ? i18n.t('market.err.own') : price > wallet ? needTxt(cur, mul(price, 1, cur) - wallet) : '';
      const confirming = MK.confirm === e.key && !why;
      html = `${head(it, '', cur)}<p class="lk-sp-desc">${esc(it.description || '')}</p>${details(it)}
        ${note('resource', `<b>${i18n.t('market.seller')}</b> ${esc(l.mine ? i18n.t('market.you') : l.seller)}`)}${note('hourglass', i18n.t('market.expiresIn', { t: fmtH(hoursLeft(l.expiresAt)) }))}
        <div class="lk-sp-qty">${stepper(SH.qty, max, 'q')}<span class="lk-have">${i18n.t('shop.have', { n: MarketService.have(it.id) })} · ${i18n.t('market.inStock', { n: l.qtyLeft })}</span></div>
        <div class="lk-sp-sum">${sumRow(i18n.t('shop.unitPrice'), priced(price, cur))}${sumRow(i18n.t('shop.total'), priced(total, cur), 'lk-total')}${sumRow(i18n.t('shop.leftAfter'), `<span class="${total > wallet ? 'lk-neg' : ''}">${priced(Math.max(0, mul(wallet, 1, cur) - total), cur)}</span>`)}</div>
        ${confirming ? note('upgrade', esc(i18n.t('market.confirmHint', { q: SH.qty, item: it.name, n: money(total, cur), cur: curWord(cur) }))) : ''}
        ${actBtn('lk-btn-primary-gold', confirming ? curIco(cur).replace('lk-coin', 'lk-cur-ico') : `<img class="lk-ai" src="${I('add')}" alt="">`, confirming ? i18n.t('market.confirmBtn', { n: money(total, cur), cur: isDec(cur) ? curWord(cur) : '' }).trim() : i18n.t('market.buyBtn', { q: SH.qty, n: money(total, cur) }), why)}`;
      // En AXS se confirma con un segundo clic (objeto, cantidad y total a la vista)
      act = () => { if (isDec(cur) && MK.confirm !== e.key) { MK.confirm = e.key; renderMarketPage(e); return; } MK.confirm = null; doMarket('buy', e, SH.qty); };
    } else if (MK.tab === 'sell') {
      const r = e.rule, max = Math.min(99, e.qty);
      SH.qty = Math.max(1, Math.min(SH.qty, max));
      const hint = MK.hints[e.id];
      if (hint === undefined) { MK.hints[e.id] = null; MarketService.hint(e.id).then((h) => { MK.hints[e.id] = h?.ok ? h : null; if (SH.sel === e.key && MK.tab === 'sell') renderMarketPage(e); }); }
      if (MK.price[e.id] == null) MK.price[e.id] = defaultPrice(e);
      const price = MK.price[e.id], gross = mul(price, SH.qty, cur), fee = MarketService.fee(gross, cur);
      const openN = MK.mine.filter((l) => l.status === 'open').length;
      const why = !MarketService.canTrade ? i18n.t('market.err.guest') : MK.blocked ? i18n.t('market.err.blocked') : openN >= MARKET_MAX_LISTINGS ? i18n.t('market.err.tooMany') : '';
      const hintTxt = hint?.median ? i18n.t('market.hint', { n: money(hint.median, cur), s: Math.min(20, hint.sales) }) : cur === 'gold' && buyPrice(it) ? i18n.t('market.hintShop', { n: fmt(buyPrice(it)) }) : '';
      const top = r.max ?? MARKET_CEIL;
      html = `${head(it, '', cur)}<p class="lk-sp-desc">${esc(it.description || '')}</p>${details(it)}
        ${hintTxt ? note('map', esc(hintTxt)) : ''}
        <div class="lk-sp-qty">${stepper(SH.qty, max, 'q')}<span class="lk-have">${i18n.t('shop.have', { n: e.qty })}</span></div>
        <span class="lk-label">${i18n.t('market.priceEach')} · ${isDec(cur) ? curWord(cur) : i18n.t('market.goldWord')}</span>
        <div class="lk-sp-qty"><span class="lk-step"><button type="button" data-p="-1" aria-label="${i18n.t('shop.less')}" ${price <= r.min ? 'disabled' : ''}>−</button><input class="lk-mk-price" type="text" inputmode="decimal" autocomplete="off" value="${isDec(cur) ? money(price, cur) : price}" aria-label="${i18n.t('market.priceEach')}"><button type="button" data-p="1" aria-label="${i18n.t('shop.more')}" ${price >= top ? 'disabled' : ''}>+</button></span><span class="lk-have">${r.max != null ? i18n.t('market.range', { min: money(r.min, cur), max: money(r.max, cur) }) : i18n.t('market.rangeMin', { min: money(r.min, cur) })}</span></div>
        <div class="lk-sp-sum">${sumRow(i18n.t('market.gross'), priced(gross, cur))}${sumRow(i18n.t('market.fee'), `−${priced(fee, cur)}`)}${sumRow(i18n.t('market.net'), priced(mul(gross - fee, 1, cur), cur), 'lk-total')}</div>
        ${actBtn('lk-btn-secondary-wood', `<img class="lk-cur-ico" src="${curIcon(isDec(cur) ? cur : 'gold')}" alt="">`, i18n.t('market.publish', { q: SH.qty, n: money(gross, cur) }), why)}`;
      act = () => doMarket('list', e, SH.qty, price);
    } else if (MK.tab === 'mine') {
      const l = e.l, open = l.status === 'open', sold = mul(Number(l.price), l.qty - l.qtyLeft, cur);
      html = `${head(it, i18n.t(`market.status.${l.status}`), cur)}
        ${open ? note('hourglass', i18n.t('market.expiresIn', { t: fmtH(hoursLeft(l.expiresAt)) })) : ''}
        <div class="lk-sp-sum">${sumRow(i18n.t('shop.unitPrice'), priced(l.price, cur))}${sumRow(i18n.t('market.soldOf'), `${l.qty - l.qtyLeft} / ${l.qty}`)}${sumRow(i18n.t('market.netSoFar'), priced(mul(sold - MarketService.fee(sold, cur), 1, cur), cur), 'lk-total')}</div>
        ${open ? `${note('upgrade', esc(i18n.t('market.cancelHint')))}${actBtn('lk-btn-secondary-wood', `<img class="lk-ai" src="${I('resource')}" alt="">`, i18n.t('market.cancelBtn'), '')}` : ''}`;
      if (open) act = () => doMarket('cancel', e);
    } else {
      const h = e.h, sell = h.side === 'sell';
      html = `${head(it, sell ? i18n.t('market.sideSell') : i18n.t('market.sideBuy'))}
        ${note('hourglass', esc(new Date(h.at).toLocaleString(i18n.lang() === 'es' ? 'es' : 'en', { dateStyle: 'medium', timeStyle: 'short' })))}
        <div class="lk-sp-sum">${sumRow(i18n.t('shop.unitPrice'), priced(h.price, cur))}${sumRow(i18n.t('market.gross'), priced(h.gross, cur))}${sell ? sumRow(i18n.t('market.fee'), `−${priced(h.fee, cur)}`) : ''}${sumRow(sell ? i18n.t('shop.youGet') : i18n.t('shop.total'), priced(sell ? mul(h.gross - h.fee, 1, cur) : h.gross, cur), 'lk-total')}</div>`;
    }
    pg.innerHTML = html;
    pg.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
      const max = MK.tab === 'browse' ? Math.max(1, Math.min(e.l.qtyLeft, Math.floor((wallet + 1e-9) / Number(e.l.price)))) : Math.min(99, e.qty);
      SH.qty = b.dataset.q === 'max' ? max : SH.qty + Number(b.dataset.q); MK.confirm = null; renderMarketPage(e);
    }));
    const r = e.rule;
    if (r) {
      const top = r.max ?? MARKET_CEIL;
      const setPrice = (v) => {
        const t = String(v).trim().replace(/\s/g, ''); // «3,75», «3.75» o «1.000,50»
        const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
        const c = Math.min(top, Math.max(r.min, Number.isFinite(n) ? n : r.min));
        MK.price[e.id] = isDec(cur) ? Math.round(c * 100) / 100 : Math.round(c);
        renderMarket();
      };
      const step = isDec(cur) ? 0.1 : Math.max(1, Math.round((r.max ?? r.min * 10) / 50));
      pg.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => setPrice(MK.price[e.id] + Number(b.dataset.p) * step)));
      const inp = pg.querySelector('.lk-mk-price');
      inp?.addEventListener('change', () => setPrice(inp.value));
      inp?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); setPrice(inp.value); } });
    }
    pg.querySelector('[data-act="mk"]')?.addEventListener('click', () => act?.());
  }

  async function doMarket(kind, e, q = 1, price = 0) {
    if (SH.busy) return;
    SH.busy = true;
    let res;
    try {
      res = kind === 'buy' ? await MarketService.buy(e.l.id, q) : kind === 'list' ? await MarketService.list(e.id, q, price) : await MarketService.cancel(e.l.id);
    } finally { SH.busy = false; }
    if (!res?.ok) { toast(MarketService.why(res), true); if (res?.error === 'listing_gone') loadMarket(true); else render(); return; }
    sfx(kind === 'buy' ? 'playBuff' : 'playHover');
    const left = kind === 'cancel' ? e.l.qtyLeft : q;
    toast(i18n.t(kind === 'buy' ? 'market.boughtOk' : kind === 'list' ? 'market.listedOk' : 'market.cancelledOk', { qty: qtyTxt(left), item: e.it.name }));
    SH.qty = 1;
    if (kind === 'list') { SH.sel = null; MK.tab = 'mine'; }
    await loadMarket(true);
  }

  /** Avisos: ventas y anuncios caducados (al entrar en la partida y, con anuncios abiertos, en cuanto pasan). */
  function inboxToasts(r) {
    const name = (id) => itemOf(id)?.name || id;
    const lines = [
      ...(r.sold || []).map((s) => i18n.t('market.inboxSold', { qty: qtyTxt(s.qty), item: name(s.item), n: money(s.net, s.currency || 'gold'), cur: curWord(s.currency) })),
      ...(r.expired || []).map((x) => i18n.t('market.inboxExpired', { qty: qtyTxt(x.qty), item: name(x.item) })),
    ];
    lines.forEach((t, i) => setTimeout(() => toast(t), i * 2400));
    if (lines.length) { if (api.isOpen && SH.mode === 'market') loadMarket(true); else MK.loaded = false; }
  }
  MarketService.onInbox = inboxToasts;
  async function showInbox() { await MarketService.poll().catch(() => null); }
  api.showInbox = showInbox;
  MarketService.onChange(() => { if (api.isOpen && SH.mode !== 'market') render(); }); // entradas aplicadas al guardar o al revisar

  // ------------------------------------------------------------------ eventos
  $('mode').addEventListener('click', (ev) => { const b = ev.target.closest('button[data-m]'); if (!b) return; SH.mode = b.dataset.m; SH.tab = 'all'; SH.sel = null; SH.qty = 1; sfx('playHover'); render(); if (SH.mode === 'market') loadMarket(true); });
  $('tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('.lk-fchip'); if (!b) return;
    if (b.dataset.mk) { MK.tab = b.dataset.mk; SH.sel = null; SH.qty = 1; MK.confirm = null; render(); return; }
    if (b.dataset.mkc) { MK.cat = b.dataset.mkc; MK.tier = 0; SH.sel = null; SH.qty = 1; MK.confirm = null; render(); return; }
    if (b.dataset.mkt != null) { MK.tier = Number(b.dataset.mkt); SH.sel = null; SH.qty = 1; MK.confirm = null; render(); return; }
    SH.tab = b.dataset.k; render();
  });
  $('grid').addEventListener('click', (ev) => { const b = ev.target.closest('.lk-it[data-k]'); if (!b) return; SH.sel = b.dataset.k; SH.qty = 1; sfx('playHover'); render(); });
  $('buyback').addEventListener('click', async (ev) => {
    const b = ev.target.closest('.lk-bb'); if (!b) return;
    if (SH.busy) return;
    SH.busy = true;
    let r;
    try { r = await ShopService.rebuyAsync(SH.shop, +b.dataset.i); } finally { SH.busy = false; }
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

  /** opts.guide (Hito 124): { focus: id del objeto a resaltar y seleccionar, note: () => texto|null, action: () => { label, run }|null, avatar } */
  function open(shopId = 'dojo_valley', opts = {}) {
    if (document.body.classList.contains('state-combat') || window.__AXIE_TACTICS_APP__?.gameState === 'BATTLE') return;
    if (!ShopService.def(shopId)) return;
    const lock = ow.tutorialManager?.lockMessage?.('shop'); // Hito 48
    if (lock && !api.isOpen) { ow._showFeatureLockedFeedback?.(lock); return; }
    if (SH.shop !== shopId) { SH.shop = shopId; SH.sel = null; }
    SH.mode = 'buy'; SH.tab = 'all'; SH.qty = 1;
    SH.guide = opts.guide || null;
    if (SH.guide?.focus) { SH.tab = 'gear'; SH.sel = SH.guide.focus; }
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
