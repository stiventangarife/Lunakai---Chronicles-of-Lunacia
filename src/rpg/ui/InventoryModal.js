// InventoryModal.js — Mochila y equipo (Crónica Celeste, etapa 6)
// Pantalla 18 del sistema de diseño ("Mochila y equipo") con las clases lk- de src/ui/ds.generated.css.
// API pública intacta: new InventoryModal(equipmentManager, audio), open(heroId), close(), toggle(heroId), isOpen,
// setTutorialLock(isLocked, itemId), onOpen, onClose, onItemEquipped(heroId, slot, itemId), onItemUnequipped(heroId, slot).
import { formatBond } from '../BondService.js';
import { ITEMS_DB } from '../../tactics/ItemDatabase.js';
import { SPELLS_DB } from '../../tactics/Spells.js';
import { STARTER_DECKS } from '../../tactics/data/StarterCards.js';
import { getHeroSpells } from '../SaveSlotManager.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import { asset, sprite, toast, curIcon } from '../../ui/lk.js';
import { HeroModelPreview } from './HeroModelPreview.js';
import { createRunesView, runesPending } from '../../ui/RunesCharmsPanel.js';
import { RuneCharmService } from '../RuneCharmService.js';
import { loadRuneCharmArt, runeCharmArt } from '../../ui/RuneCharmArt.js';
import { showRewardCard } from '../../ui/RewardCard.js';
import { ForgeService } from '../ForgeService.js';
import { MATERIALS } from '../../tactics/data/EconomyCatalog.js';
import { matSvg, BIOME } from '../../ui/ForgePanel.js';
import { MATERIAL_RARITY_NAME } from '../../tactics/data/EconomyCatalog.js';
import * as i18n from '../../i18n/i18n.js';

/** Clave de clase de un axie (beast · bird · plant · aquatic · bug · reptile · mech · dawn · dusk). */
export function axieClassKey(cls) {
  const s = String(cls || '').toLowerCase();
  if (s.includes('bestia') || s.includes('beast')) return 'beast';
  if (s.includes('pájaro') || s.includes('pajaro') || s.includes('bird')) return 'bird';
  if (s.includes('planta') || s.includes('plant')) return 'plant';
  if (s.includes('acu') || s.includes('aquatic')) return 'aquatic';
  if (s.includes('bicho') || s.includes('bug')) return 'bug';
  if (s.includes('reptil') || s.includes('reptile')) return 'reptile';
  if (s.includes('mech') || s.includes('mecá') || s.includes('meca')) return 'mech';
  if (s.includes('dawn') || s.includes('alba') || s.includes('amanecer')) return 'dawn';
  if (s.includes('dusk') || s.includes('ocaso') || s.includes('crepús') || s.includes('crepus')) return 'dusk';
  return 'beast';
}

/** Ícono de clase: assets/classes/<clave>.png (el de Dusk se llama dust.png). */
export function getAxieClassIcon(cls) {
  const k = axieClassKey(cls);
  return `assets/classes/${k === 'dusk' ? 'dust' : k}.png`;
}

const HERO_SPELLS = {
  kotaro: ['kotaro_slash', 'kotaro_push', 'kotaro_jump'],
  bing: STARTER_DECKS.bing, // las 6 cartas originales de Origins (tactics/data/StarterCards.js)
  pomodoro: STARTER_DECKS.pomodoro
};

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const EQ_SLOTS = ['weapon', 'hat', 'shield', 'body', 'boots'];
const SLOT1 = { weapon: i18n.t('inventory.slotWeapon'), hat: i18n.t('inventory.slotHat'), shield: i18n.t('inventory.slotShield'), body: i18n.t('inventory.slotBody'), boots: i18n.t('inventory.slotBoots'), consumable: i18n.t('inventory.slotConsumable'), quest: i18n.t('inventory.slotQuest'), material: i18n.t('inventory.slotMaterial') };
const TABS = [['all', i18n.t('inventory.tabAll')], ['weapon', i18n.t('inventory.tabWeapons')], ['hat', i18n.t('inventory.tabHats')], ['shield', i18n.t('inventory.tabShields')], ['body', i18n.t('inventory.tabArmor')], ['boots', i18n.t('inventory.tabBoots')], ['consumable', i18n.t('inventory.tabConsumables')], ['material', i18n.t('inventory.tabMaterials')], ['quest', i18n.t('inventory.tabQuest')]];
const STAT_ES = { hp: i18n.t('inventory.hp'), damage: i18n.t('inventory.damage'), pa: i18n.t('inventory.ap'), pm: i18n.t('inventory.mp'), initiative: i18n.t('inventory.initiative'), shield: i18n.t('inventory.shield') };
/** Efecto principal de un consumible u objeto de misión, para la franja inferior de su casilla. */
const effectCap = (it, k) => {
  const e = it.effect || {};
  if (e.bond) return i18n.t('inventory.capBond', { n: e.bond });
  if (e.heal) return i18n.t('inventory.capHeal', { n: e.heal });
  if (e.shield) return i18n.t('inventory.capShield', { n: e.shield });
  if (e.pa || e.pm) return [e.pa && i18n.t('inventory.capAp', { n: e.pa }), e.pm && i18n.t('inventory.capMp', { n: e.pm })].filter(Boolean).join(' · ');
  if (k === 'quest') return i18n.t('inventory.tabQuest');
  return SLOT1[k] || i18n.t('inventory.item');
};
const RAR_ORDER = { mystic: 5, legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
const RAR_NAME = { mystic: i18n.t('inventory.rarMystic'), legendary: i18n.t('inventory.rarMystic'), epic: i18n.t('inventory.rarEpic'), rare: i18n.t('inventory.rarRare'), uncommon: i18n.t('inventory.rarUncommon'), common: i18n.t('inventory.rarCommon') };
// Ranuras en una sola columna, en el borde derecho del modelo 3D (junto a la cuadrícula de objetos: arrastre más corto),
// de arriba abajo en orden del cuerpo: sombrero, armadura, arma, escudo, botas
const RAIL_ORDER = ['hat', 'body', 'weapon', 'shield', 'boots'];
const DOLL_POS = Object.fromEntries(RAIL_ORDER.map((s, i) => [s, ['calc(100% - 46px)', `${12 + i * 19}%`]]));
const ATTRS = [
  ['vitality', i18n.t('inventory.attrVitality'), i18n.t('inventory.hintVitality')],
  ['ferocity', i18n.t('inventory.attrFerocity'), i18n.t('inventory.hintFerocity')],
  ['agility', i18n.t('inventory.attrAgility'), i18n.t('inventory.hintAgility')],
  ['essence', i18n.t('inventory.attrEssence'), i18n.t('inventory.hintEssence')]
];
/** Qué hace cada atributo según el héroe (19-oct): el Sapidae Lunalogista y Astromante usan la Esencia como daño. */
function attrHints(heroId, base) {
  const magic = heroId === 'sapidae' && ['lunalogist', 'stargazer'].includes(base?.sapidaeClassKey);
  if (!magic) return ATTRS;
  return [
    ['vitality', i18n.t('inventory.attrVitality'), i18n.t('inventory.hintVitality')],
    ['ferocity', i18n.t('inventory.attrFerocity'), i18n.t('inventory.hintFerocityMagic')],
    ['agility', i18n.t('inventory.attrAgility'), i18n.t('inventory.hintAgilityMagic')],
    ['essence', i18n.t('inventory.attrEssence'), i18n.t('inventory.hintEssenceMagic')]
  ];
}
const pct = (v) => { const s = String(Math.round((Number(v) || 0) * 10) / 10); return i18n.lang() === 'es' ? s.replace('.', ',') : s; };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slotOf = (it) => (it.slot === 'consumable' || it.category === 'consumable' || it.type === 'consumable') ? 'consumable'
  : (it.slot === 'quest' || it.category === 'quest' || it.type === 'quest') ? 'quest' : it.slot;
const rv = (r) => `var(--lk-rar-${r === 'legendary' ? 'legendary' : (r || 'common')})`;
const isImg = (s) => typeof s === 'string' && (/^(\.\/|\/|assets\/|http|data:image)/.test(s) || /\.(png|jpe?g|webp|svg)$/i.test(s));
// Materiales (bolsa de la Forja: recolección, Tienda, botín): se muestran en la mochila como objetos más
const MAT_RARITY = { 0: 'mystic', 1: 'common', 2: 'uncommon', 3: 'rare', 4: 'epic', 5: 'legendary' };
const matItem = (m) => m && ({ id: m.id, name: m.name, slot: 'material', tier: m.tier || null, rarity: m.rarity || MAT_RARITY[m.tier] || 'common', glyph: m.glyph, icon: m.icon, biome: m.biome, description: m.description, source: m.source, mat: true });
const itemOf = (id) => ITEMS_DB[id] || matItem(MATERIALS[id]);
const art = (it) => it.mat && !it.icon ? `<span class="lk-mat-art" style="color:${BIOME[it.biome]?.[1] || '#B8892E'}">${matSvg(it.glyph, '')}</span>` : isImg(it.icon) ? `<img src="${it.icon}" alt="" draggable="false">` : (it.icon ? `<span class="lk-emoji">${it.icon}</span>` : `<img src="./assets/ui/icons/resource.png" alt="" draggable="false">`);

export class InventoryModal {
  constructor(equipmentManager, audioSystem = null) {
    this.equipmentManager = equipmentManager;
    this.audio = audioSystem;
    this.isOpen = false;
    this.selectedHeroId = 'sapidae';
    this.activeHeroTab = 'equipment'; // 'equipment' (mochila) | 'runes' (runas y charms: mejoran las habilidades)
    this.activeCategoryFilter = 'all';
    this.sort = 'rar';
    this.isTutorialEquipLocked = false;
    this.tutorialTargetItemId = null;
    this.tutorialManager = null;
    this.questManager = null;
    this.pinned = null; // { id, anchor }
    this.justDropped = false;

    this._createDOM();
  }

  // ------------------------------------------------------------ DOM
  _createDOM() {
    document.getElementById('inventory-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'inventory-modal';
    modal.className = 'lk-ui lk-backdrop lk-bag-layer hidden';
    modal.innerHTML = `
      <div class="lk-panel-modal-window lk-bag" role="dialog" aria-label="${i18n.t('inventory.title')}">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I('inventory')}" alt=""></span>
          <h3><small>${i18n.t('inventory.kicker')}</small>${i18n.t('inventory.title')}</h3>
          <button type="button" class="lk-btn lk-btn-moon lk-btn--sm lk-bag__squad" data-ref="squadBtn" title="${i18n.t('inventory.keyK')}"><span class="lk-b-ico"><img class="lk-ai" src="${I('team')}" alt=""></span>${i18n.t('inventory.squad')}</button>
          <div class="lk-segmented" data-ref="viewTabs"><button type="button" aria-pressed="true" data-view="equipment">${i18n.t('inventory.title')}</button><button type="button" aria-pressed="false" data-view="runes" title="${i18n.t('inventory.keyU')}">${i18n.t('inventory.runesCharms')}<span class="lk-bag-dot" data-ref="runesDot" hidden></span></button></div>
          <div class="lk-wallet" aria-label="${i18n.t('inventory.currencies')}"><span class="lk-res-pill" title="${i18n.t('inventory.gold')}"><img class="lk-cur-ico" src="${curIcon('gold')}" alt="${i18n.t('inventory.gold')}"><span data-ref="gold">0</span></span><span class="lk-res-pill lk-cur" title="${i18n.t('inventory.slpTitle')}"><img class="lk-cur-ico" src="${curIcon('slp')}" alt="SLP"><span data-ref="slp">0</span></span><span class="lk-res-pill lk-cur" title="${i18n.t('inventory.baxsTitle')}"><img class="lk-cur-ico" src="${curIcon('baxs')}" alt="bAXS"><span data-ref="baxs">0</span></span></div>
          <button type="button" class="lk-btn-close-x" data-ref="close" aria-label="${i18n.t('inventory.close')}">${sprite('i-close')}</button>
        </div>
        <div class="lk-bag__body lk-bag__body--3">
          <div class="lk-bag__attrs">
            <div class="lk-sq-strip" data-ref="strip" aria-label="${i18n.t('inventory.squad')}"></div>
            <div class="lk-hero-stats" data-ref="stats"></div>
          </div>
          <div class="lk-bag__doll lk-bag__doll--model">
            <div class="lk-doll lk-doll--model" data-ref="doll">
              <div class="lk-doll__stage" data-ref="stage"></div>
              <span class="lk-doll__hint">${i18n.t('inventory.dragRotate')}</span>
              <span class="lk-doll__rail" aria-hidden="true"></span>
              ${RAIL_ORDER.map((s) => `<button type="button" class="lk-eq-slot" data-slot="${s}" style="--x:${DOLL_POS[s][0]};--y:${DOLL_POS[s][1]}"></button>`).join('')}
            </div>
          </div>
          <div class="lk-bag__grid-wrap" data-ref="bagView">
            <div class="lk-bag__bar">
              <div class="lk-codex__filters" data-ref="tabs"></div>
              <label class="lk-bag__sort"><span class="lk-label">${i18n.t('inventory.sort')}</span>
                <select data-ref="sort" class="lk-input lk-select" aria-label="${i18n.t('inventory.sortAria')}"><option value="rar">${i18n.t('inventory.sortRarity')}</option><option value="tier">${i18n.t('inventory.sortTier')}</option><option value="name">${i18n.t('inventory.sortName')}</option></select></label>
            </div>
            <div class="lk-bag-tut" data-ref="tut" hidden></div>
            <div class="lk-bag__grid" data-ref="grid"></div>
            <div class="lk-bag__cap"><span class="lk-drag-hint" style="margin-right:auto">${i18n.t('inventory.gridHint')}</span><span data-ref="count"></span></div>
          </div>
          <div class="lk-bag__grid-wrap lk-bag-runes" data-ref="runesView" hidden></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    this.modalEl = modal;
    this.$ = (n) => modal.querySelector(`[data-ref="${n}"]`);

    // Ficha de objeto (hover = vista previa · clic = fijada con acciones)
    this.itip = document.getElementById('lk-item-tip') || document.createElement('div');
    this.itip.id = 'lk-item-tip';
    this.itip.className = 'lk-ui lk-tooltip-tactical lk-tt-item';
    this.itip.setAttribute('role', 'dialog');
    document.body.appendChild(this.itip);

    this._bind();
  }

  _bind() {
    const m = this.modalEl;
    m.addEventListener('click', (e) => { if (e.target === m) this.close(); });
    this.$('close').addEventListener('click', () => this.close());
    this.$('squadBtn').addEventListener('click', () => { if (this.onOpenSquad) this.onOpenSquad(); });
    m.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

    // Runas y charms (sustituyen al antiguo panel de mejora de habilidades): misma fila de retratos que la mochila
    this.runesView = createRunesView(this.$('runesView'), {
      equipmentManager: this.equipmentManager,
      classOf: (id) => this._clsKey(id) || 'beast',
      onChange: () => { this._renderRoster(); this._renderRunesDot(); },
      heroIds: () => this._heroIds(),
      onPickHero: (id) => { this._sfx(); this.selectedHeroId = id; this._renderAll(); },
    });
    this.$('viewTabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      this._sfx();
      this.activeHeroTab = b.dataset.view;
      this._renderHeroDetails();
    }));
    this.$('sort').addEventListener('change', (e) => { this.sort = e.target.value; this._renderBackpackItems(); });

    // Arrastrar y soltar (ratón, lápiz y táctil)
    this.$('grid').addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.lk-it[data-slot]');
      if (!b || e.button > 0) return;
      e.preventDefault();
      this._startDrag(e, b, b.dataset.id, 'grid');
    });
    this.$('doll').addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.lk-eq-slot.lk-has');
      if (!b || e.button > 0) return;
      e.preventDefault();
      this._startDrag(e, b, this._equipped()[b.dataset.slot], 'slot');
    });
    [this.$('grid'), this.$('doll')].forEach((el) => el.addEventListener('dragstart', (e) => e.preventDefault()));

    this.$('doll').querySelectorAll('.lk-eq-slot').forEach((b) => {
      b.addEventListener('mouseenter', () => { const id = this._equipped()[b.dataset.slot]; if (id) this._hoverTip(b, id); });
      b.addEventListener('mouseleave', () => this._unhoverTip());
      b.addEventListener('click', () => {
        if (this.justDropped) return;
        const id = this._equipped()[b.dataset.slot];
        if (this.activeCategoryFilter !== b.dataset.slot) {
          this.activeCategoryFilter = b.dataset.slot;
          this._renderBackpackItems();
          // Solo cambia el foco: la ranura no se vuelve a pintar, así el doble clic llega a ella
          this.$('doll').querySelectorAll('.lk-eq-slot').forEach((x) => x.classList.toggle('lk-is-focus', x === b));
        }
        if (id && this.pinned?.id !== id) this._pinTip(id, b, 'slot');
        else this._closeTip();
      });
      // Doble clic en una ranura ocupada: el objeto vuelve a la mochila
      b.addEventListener('dblclick', () => { if (this._equipped()[b.dataset.slot]) this._unequip(b.dataset.slot); });
    });

    document.addEventListener('pointerdown', (e) => {
      if (this.pinned && !this.itip.contains(e.target) && !e.target.closest('#inventory-modal .lk-it, #inventory-modal .lk-eq-slot')) this._closeTip();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape' && this.pinned) { this._closeTip(); e.stopImmediatePropagation(); }
    }, true);
    this.$('grid').addEventListener('scroll', () => this._closeTip());
    window.addEventListener('resize', () => this._closeTip());
  }

  // ------------------------------------------------------------ apertura
  _renderGold() {
    const g = typeof this.equipmentManager?.getGold === 'function' ? this.equipmentManager.getGold() : (this.equipmentManager?.gold || 0);
    this.$('gold').textContent = i18n.num(g);
    // SLP y bAXS (se guardan con la Forja)
    try {
      const w = ForgeService.wallet();
      this.$('slp').textContent = i18n.num(w.slp);
      this.$('baxs').textContent = (Math.round(w.baxs * 100) / 100).toLocaleString(i18n.lang() === 'es' ? 'es' : 'en', { maximumFractionDigits: 2 });
    } catch { /* sin partida activa */ }
  }

  open(heroId = null) {
    if (document.body.classList.contains('state-combat') ||
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      return;
    }
    if (heroId && this.equipmentManager && this.equipmentManager.isHeroUnlocked(heroId)) {
      this.selectedHeroId = heroId;
    }
    if (this.isOpen) {
      this._renderAll();
      return;
    }
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
    void this.modalEl.offsetWidth;
    this.modalEl.classList.add('lk-is-open');
    // (ya no se fuerza a rehacer el modelo en cada apertura: _showModel compara héroe + equipo +
    //  personalización y solo lo rehace si algo cambió mientras la mochila estaba cerrada)
    this.model?.start();
    if (this.audio && this.audio.playBuff) this.audio.playBuff();
    this._renderAll();
    if (this.onOpen) this.onOpen();
  }

  /** Abre la mochila en una pestaña: 'equipment' o 'runes' (tecla U). En runas, si está elegido el Sapidae, pasa al primer axie. */
  openTab(tab = 'equipment', heroId = null) {
    this.activeHeroTab = tab === 'runes' ? 'runes' : 'equipment';
    if (tab === 'runes' && !heroId && this._isSapi(this.selectedHeroId)) heroId = this._heroIds().find((id) => !this._isSapi(id)) || null;
    if (this.isOpen) {
      if (heroId) this.selectedHeroId = heroId;
      this._closeTip?.();
      this._renderAll();
    } else this.open(heroId);
  }

  toggle(heroId = null) {
    if (document.body.classList.contains('state-combat') ||
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      this.close();
      return;
    }
    if (this.isOpen) this.close();
    else this.open(heroId);
  }

  setTutorialLock(isLocked, targetItemId = 'wood_sword') {
    this.isTutorialEquipLocked = !!isLocked;
    this.tutorialTargetItemId = isLocked ? targetItemId : null;
    if (this.isOpen) {
      this._renderHeroDetails();
      this._renderBackpackItems();
    }
  }

  _isTutorialEquipActive() {
    if (!this.isTutorialEquipLocked || !this.tutorialTargetItemId) return false;
    if (this.tutorialManager) {
      // Hito 48: el tutorial dice qué objeto pide (equipLockItem); el gestor antiguo usaba su paso EQUIP_SWORD
      const lockItem = 'equipLockItem' in this.tutorialManager ? this.tutorialManager.equipLockItem
        : (this.tutorialManager.isActive && this.tutorialManager.currentStep === 'EQUIP_SWORD' && !this.tutorialManager.hasEquippedSword ? this.tutorialTargetItemId : null);
      if (!lockItem) {
        this.isTutorialEquipLocked = false;
        this.tutorialTargetItemId = null;
        return false;
      }
    }
    if (this.questManager) {
      const q = this.questManager.quests?.quest_slime_purification;
      if (q && q.status === 'completed') {
        this.isTutorialEquipLocked = false;
        this.tutorialTargetItemId = null;
        return false;
      }
    }
    return true;
  }

  _isTargetItemEquipped() {
    if (!this.equipmentManager || !this.tutorialTargetItemId) return false;
    const eq = this.equipmentManager.equipped;
    if (!eq) return false;
    const heroEq = eq[this.selectedHeroId] || eq.kotaro;
    if (!heroEq) return false;
    return heroEq.weapon === this.tutorialTargetItemId || Object.values(heroEq).includes(this.tutorialTargetItemId);
  }

  _showTutorialBlockedFeedback() {
    if (this.audio && typeof this.audio.playCollision === 'function') this.audio.playCollision();
    const win = this.modalEl.querySelector('.lk-bag');
    [win, this.$('tut')].forEach((el) => {
      if (!el || !el.animate) return;
      el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 320 });
    });
    this.modalEl.querySelector('.lk-tut-spot')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(i18n.t('inventory.tutEquipFirst', { item: ITEMS_DB[this.tutorialTargetItemId]?.name || i18n.t('inventory.tutTheItem') }), true);
  }

  close() {
    if (!this.isOpen) return;
    if (this._isTutorialEquipActive() && !this._isTargetItemEquipped()) {
      this._showTutorialBlockedFeedback();
      return;
    }
    if (this.tutorialTargetItemId && this._isTargetItemEquipped()) {
      this.isTutorialEquipLocked = false;
      this.tutorialTargetItemId = null;
    }
    this._hideTooltip();
    this.isOpen = false;
    this.activeHeroTab = 'equipment'; // la tecla I vuelve a abrir la mochila; U abre directamente «Runas y charms»
    this.modalEl.classList.remove('lk-is-open');
    this.modalEl.classList.add('hidden');
    this.model?.stop();
    if (this.audio && this.audio.playStep) this.audio.playStep();
    if (this.onClose) this.onClose();
  }

  // ------------------------------------------------------------ render
  _renderAll() {
    this._showModel();
    this._renderRoster();
    this._renderHeroDetails();
    this._renderBackpackItems();
    this._renderGold();
  }

  // Modelo 3D del héroe seleccionado (se crea la primera vez que se abre la mochila)
  _showModel() {
    if (!this.isOpen) return;
    if (!this.model) {
      this.model = this._createModel();
      this.model.start();
    }
    const key = this._modelKey();
    if (this._modelShown === key) return;
    this._modelShown = key;
    this.model.show(this.selectedHeroId, this._base(), this._equipped())
      .then(() => { if (this.isOpen) this.model.start(); })
      .catch(() => { if (this._modelShown === key) this._modelShown = null; }); // reintentar en la próxima apertura
  }

  _createModel() {
    return new HeroModelPreview(this.$('stage'), {
      fallbackPortrait: (id) => {
        const base = this._base(id);
        const key = this._isSapi(id) ? (base?.modelType || 'sapidae-f-a') : (base?.axieId || id);
        return portraitService.getPortraitSync(key) || (this._isSapi(id) ? `./assets/portraits/${key}.png` : base?.image || `./assets/portraits/${id}.png`);
      }
    });
  }

  /**
   * Prepara el visor 3D sin abrir la mochila (se llama detrás de la pantalla de carga): crea su
   * contexto WebGL, carga el modelo del héroe seleccionado y compila sus shaders. Así la primera
   * apertura ya no da el tirón de crear todo eso. No arranca el bucle de render.
   */
  async prewarmModel() {
    if (this.model || this.isOpen) return;
    try {
      const em = this.equipmentManager;
      if (em && typeof em.isHeroUnlocked === 'function' && !em.isHeroUnlocked(this.selectedHeroId)) {
        this.selectedHeroId = this._heroIds()[0] || 'sapidae';
      }
      this.model = this._createModel();
      const key = this._modelKey();
      this._modelShown = key;
      await this.model.show(this.selectedHeroId, this._base(), this._equipped());
      const d = this.model.d;
      if (d && d.renderer && d.scene && d.camera) d.renderer.compile(d.scene, d.camera);
    } catch (err) {
      if (this._modelShown === this._modelKey()) this._modelShown = null;
      console.warn('[InventoryModal] Precalentado del visor omitido:', err);
    }
  }

  _refreshModelEquipment() {
    if (this.model && this._isSapi(this.selectedHeroId)) {
      this.model.applyEquipment(this._base(), this._equipped());
      this._modelShown = this._modelKey(); // el modelo ya muestra este equipo
    }
  }

  /** Lo que determina el aspecto del modelo del visor: si no cambia, no hay que rehacerlo. */
  _modelKey() {
    try {
      return `${this.selectedHeroId}|${JSON.stringify(this._equipped())}|${JSON.stringify(this._base()?.customization || null)}|${this._base()?.modelType || ''}`;
    } catch (_) {
      return `${this.selectedHeroId}|${Math.random()}`;
    }
  }

  _equipped() { return this.equipmentManager.getEquipped(this.selectedHeroId) || {}; }
  _base(id = this.selectedHeroId) { return this.equipmentManager.heroesBase[id]; }
  _isSapi(id) { return id === 'sapidae' || this._base(id)?.isSapidae; }
  _clsKey(id) {
    if (this._isSapi(id)) return null;
    const c = axieClassKey(this._base(id)?.class);
    return c || 'beast';
  }
  _portrait(id, size) {
    const base = this._base(id);
    const sapi = this._isSapi(id);
    const key = sapi ? (base?.modelType || 'sapidae-f-a') : (base?.axieId || id);
    let url = portraitService.getPortraitSync(key) || (sapi ? `./assets/portraits/${key}.png` : base?.image || null);
    if (!url) portraitService.getPortrait(key).then((u) => { if (u && this.isOpen) this._renderRoster(); }).catch(() => {});
    const cc = sapi ? 'var(--lk-gilt-300)' : `var(--lk-class-${this._clsKey(id)})`;
    return `<span class="lk-med" style="--cc:${cc}${size ? `;--s:${size}px` : ''}">${url ? `<img src="${url}" alt="">` : ''}</span>`;
  }

  _heroIds() {
    const em = this.equipmentManager;
    const ids = em.unlockedHeroes && em.unlockedHeroes.length ? em.unlockedHeroes : ['sapidae', 'kotaro'];
    // Mismo orden que el escuadrón (líder, principal, apoyos) y después los axies de la colección
    const squad = typeof em.getSquad === 'function' ? em.getSquad().filter(Boolean) : [];
    const rest = ids.filter((id) => !squad.includes(id));
    return [...squad, ...rest.filter((id) => this._isSapi(id)), ...rest.filter((id) => !this._isSapi(id))].filter((id, i, a) => this._base(id) && a.indexOf(id) === i);
  }

  _renderRoster() {
    const em = this.equipmentManager;
    if (!em.isHeroUnlocked(this.selectedHeroId)) this.selectedHeroId = this._heroIds()[0] || 'sapidae';
    this.$('strip').innerHTML = this._heroIds().map((id, i) => {
      const p = em.getProgression(id);
      const pending = p.unspentStatPoints || 0;
      return `<button type="button" class="lk-sq-pip" data-h="${id}" aria-pressed="${this.selectedHeroId === id}" aria-label="${i18n.t('inventory.equipHero', { name: esc(this._base(id).name) })}">${this._portrait(id)}${i === 1 ? `<span class="lk-hb" title="${i18n.t('inventory.mainCompanion')}"><img src="${I('heart')}" alt=""></span>` : ''}${pending ? `<span class="lk-bag-pend" title="${i18n.t('inventory.unspentPoints')}">!</span>` : ''}<span class="lk-nm">${esc(this._base(id).name)}</span></button>`;
    }).join('');
    this.$('strip').querySelectorAll('.lk-sq-pip').forEach((b) => b.addEventListener('click', () => {
      this._sfx();
      this.selectedHeroId = b.dataset.h;
      this._closeTip();
      this._renderAll();
    }));
  }

  _renderHeroDetails() {
    this._hideTooltip();
    const base = this._base();
    if (!base) return;
    const em = this.equipmentManager;
    const prog = em.getProgression(this.selectedHeroId);
    const req = em.getRequiredExp(prog.level);
    const pct = Math.min(100, Math.round((prog.currentExp / req) * 100));
    this._xp = { level: prog.level, cur: prog.currentExp, req, pct };

    this._renderRunesDot();
    this.$('viewTabs').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === this.activeHeroTab)));
    this.$('bagView').hidden = this.activeHeroTab !== 'equipment';
    this.$('runesView').hidden = this.activeHeroTab !== 'runes';

    this._renderDoll();
    if (this.activeHeroTab === 'runes') this.runesView.render(this.selectedHeroId);
  }

  _renderDoll(flash = []) {
    const id = this.selectedHeroId;
    const eq = this._equipped();
    this.$('doll').querySelectorAll('.lk-eq-slot').forEach((b) => {
      const it = eq[b.dataset.slot] && ITEMS_DB[eq[b.dataset.slot]];
      b.classList.toggle('lk-has', !!it);
      b.style.setProperty('--rc', it ? rv(it.rarity) : '');
      b.classList.toggle('lk-is-focus', this.activeCategoryFilter === b.dataset.slot);
      b.innerHTML = it ? art(it) : `<span class="lk-ph">${SLOT1[b.dataset.slot]}</span>`;
      b.setAttribute('aria-label', it ? it.name : SLOT1[b.dataset.slot]);
    });
    this._renderStats(flash);
  }

  _renderStats(flash = []) {
    const em = this.equipmentManager;
    const s = em.getCalculatedStats(this.selectedHeroId);
    const prog = em.getProgression(this.selectedHeroId);
    if (!s) { this.$('stats').innerHTML = ''; return; }
    const g = s.gear || {};
    const IC = {
      hp: sprite('i-hp', { fill: true }), damage: sprite('i-sword'), pa: sprite('i-pa', { fill: true }), pm: sprite('i-pm'),
      initiative: `<img class="lk-ai" src="${I('hourglass')}" alt="">`, shield: sprite('i-shield'),
      crit: `<img class="lk-ai" src="${I('swords')}" alt="">`, support: sprite('i-hand')
    };
    const cell = (k, label, full, val, gear) => `<div class="lk-st ${flash.includes(k) ? 'lk-flash' : ''}" title="${full}"><span><i class="lk-st-ic">${IC[k]}</i>${label}</span><b>${val}${gear ? `<em>+${gear}</em>` : ''}</b></div>`;
    const pts = prog.unspentStatPoints || 0;
    const ap = prog.allocatedStats || {};
    const base = this._base();
    const CLS_ES = { beast: i18n.t('inventory.clsBeast'), bird: i18n.t('inventory.clsBird'), plant: i18n.t('inventory.clsPlant'), aquatic: i18n.t('inventory.clsAquatic'), bug: i18n.t('inventory.clsBug'), reptile: i18n.t('inventory.clsReptile') };
    const clsName = this._isSapi(this.selectedHeroId) ? 'Sapidae' : (CLS_ES[this._clsKey(this.selectedHeroId)] || 'Axie');
    const xp = this._xp || { level: prog.level, cur: prog.currentExp, req: em.getRequiredExp(prog.level), pct: 0 };
    // Estadísticas en cuadrícula de 2 columnas (pantalla 18 del sistema de diseño)
    this.$('stats').innerHTML = `<span class="lk-label">${esc(base.name)} · ${esc(clsName)}${s.role ? ` · ${esc(s.role)}` : ''}</span>`
      + `<div class="lk-bag-xp"><span>${i18n.t('inventory.lv', { n: xp.level })}</span><span class="lk-bar lk-bar--xp" style="--v:${xp.pct}%"><i></i></span><b>${xp.cur}/${xp.req}</b></div>`
      + '<div class="lk-hero-stats lk-hero-stats--grid">'
      + cell('hp', i18n.t('inventory.hp'), i18n.t('inventory.hpFull'), s.maxHP, g.hp)
      + cell('damage', i18n.t('inventory.damage'), i18n.t('inventory.damageFull'), `+${s.bonusDamage}`, g.damage)
      + cell('pa', i18n.t('inventory.ap'), i18n.t('inventory.apFull'), s.maxPA, g.pa)
      + cell('pm', i18n.t('inventory.mp'), i18n.t('inventory.mpFull'), s.maxPM, g.pm)
      + cell('initiative', i18n.t('inventory.iniShort'), i18n.t('inventory.initiative'), s.initiative, g.initiative)
      + cell('shield', i18n.t('inventory.shield'), i18n.t('inventory.shieldFull'), `+${s.initialShield}`, g.shield)
      + cell('crit', i18n.t('inventory.critShort'), i18n.t('inventory.critFull'), `${pct(s.critRate)}%`)
      + cell('support', i18n.t('inventory.support'), i18n.t('inventory.supportFull'), `+${pct(s.supportPower)}%`)
      + '</div>'
      // Atributos: se reparten aquí con los 3 puntos que da cada nivel (EquipmentManager.allocateStatPoint)
      + `<div class="lk-attr-block"><span class="lk-label">${i18n.t('inventory.attributes')}${pts ? `<span class="lk-attr-pts">${pts === 1 ? i18n.t('inventory.pointOne', { n: pts }) : i18n.t('inventory.pointMany', { n: pts })}</span>` : `<span class="lk-attr-pts lk-is-off">${i18n.t('inventory.perLevel')}</span>`}</span>`
      + attrHints(this.selectedHeroId, base).map(([k, label, hint]) => `<div class="lk-attr ${pts ? 'lk-can' : ''}"><span><b>${label}</b><small>${hint}</small></span><strong>${ap[k] || 0}</strong>${pts ? `<button type="button" class="lk-attr-add" data-stat="${k}" aria-label="${i18n.t('inventory.assignPoint', { label })}">+</button>` : ''}</div>`).join('')
      + '</div>';
    this.$('stats').querySelectorAll('.lk-attr-add').forEach((b) => b.addEventListener('click', () => {
      if (em.allocateStatPoint(this.selectedHeroId, b.dataset.stat)) {
        if (this.audio && this.audio.playBuff) this.audio.playBuff();
        this._renderRoster();
        this._renderDoll(['hp', 'damage', 'crit', 'support']);
      }
    }));
  }

  _invGroups() {
    // La mochila guarda ids repetidos: se agrupan con su cantidad
    const counts = new Map();
    (this.equipmentManager.inventory || []).forEach((id) => { if (ITEMS_DB[id]) counts.set(id, (counts.get(id) || 0) + 1); });
    const items = [...counts.entries()].map(([id, qty]) => ({ it: ITEMS_DB[id], qty }));
    const mats = Object.entries(ForgeService.mats() || {}).filter(([id, n]) => n > 0 && MATERIALS[id]).map(([id, qty]) => ({ it: matItem(MATERIALS[id]), qty }));
    return [...items, ...mats];
  }

  _renderBackpackItems() {
    const all = this._invGroups();
    const tab = this.activeCategoryFilter;
    this.$('tabs').innerHTML = TABS.map(([k, label]) => {
      const n = k === 'all' ? all.length : all.filter((g) => slotOf(g.it) === k).length;
      return `<button type="button" class="lk-fchip lk-no-ico" data-k="${k}" aria-pressed="${tab === k}">${label} <span style="opacity:.55">${n}</span></button>`;
    }).join('');
    this.$('tabs').querySelectorAll('.lk-fchip').forEach((b) => b.addEventListener('click', () => {
      this._sfx();
      this.activeCategoryFilter = b.dataset.k;
      this._closeTip();
      this._renderBackpackItems();
      this._renderDoll();
    }));

    let list = all.filter((g) => tab === 'all' || slotOf(g.it) === tab);
    list.sort(this.sort === 'name' ? (a, b) => a.it.name.localeCompare(b.it.name)
      : this.sort === 'tier' ? (a, b) => (b.it.tier || 0) - (a.it.tier || 0)
        : (a, b) => (RAR_ORDER[b.it.rarity] || 0) - (RAR_ORDER[a.it.rarity] || 0) || (b.it.tier || 0) - (a.it.tier || 0));

    // Tutorial: equipar la espada de Paladill
    const tutOn = this._isTutorialEquipActive();
    const tutDone = tutOn && this._isTargetItemEquipped();
    const tut = this.$('tut');
    tut.hidden = !tutOn;
    if (tutOn) {
      const heroName = this._base()?.name || i18n.t('inventory.yourHero');
      const target = ITEMS_DB[this.tutorialTargetItemId]?.name || i18n.t('inventory.theSword');
      tut.className = `lk-bag-tut ${tutDone ? 'lk-ok' : ''}`;
      tut.innerHTML = tutDone
        ? `<img class="lk-ai" src="${I('tick')}" alt=""><span>${i18n.t('inventory.tutDone')}</span>`
        : `<img class="lk-ai" src="${I('mission')}" alt=""><span>${i18n.t('inventory.tutTask', { item: esc(target), hero: esc(heroName) })}</span>`;
    }

    const cells = list.map(({ it, qty }) => {
      const k = slotOf(it);
      const st = it.stats || {};
      // Franja inferior = siempre el efecto principal; la cantidad va en la chapa de la esquina y el nombre en la ficha
      const cap = EQ_SLOTS.includes(k)
        ? (Object.entries(st).filter(([, v]) => v).slice(0, 1).map(([s, v]) => `+${v} ${STAT_ES[s] || s}`).join('') || SLOT1[k])
        : k === 'material' ? (it.tier ? `${MATERIAL_RARITY_NAME[it.rarity] || ''} · ${BIOME[it.biome]?.[0] || ''}` : i18n.t('inventory.catalyst')) : effectCap(it, k);
      const spot = tutOn && !tutDone && it.id === this.tutorialTargetItemId;
      return `<button type="button" class="lk-it ${this.pinned?.id === it.id ? 'lk-is-sel' : ''} ${spot ? 'lk-tut-spot' : ''}" data-id="${it.id}" ${EQ_SLOTS.includes(k) ? `data-slot="${k}"` : ''} style="--r:${rv(it.rarity)}" aria-label="${esc(it.name)}${qty > 1 ? ` ×${qty}` : ''}"><span class="lk-art">${art(it)}${EQ_SLOTS.includes(k) && it.tier != null ? `<span class="lk-tier">T${it.tier}</span>` : ''}${qty > 1 ? `<span class="lk-qty">×${qty}</span>` : ''}</span><span class="lk-cap">${esc(cap)}</span></button>`;
    });
    const pad = Math.max(0, Math.ceil((cells.length + 1) / 8) * 8 - cells.length);
    const grid = this.$('grid');
    if (!all.length) {
      grid.innerHTML = `<p class="lk-bag-empty"><b>${i18n.t('inventory.emptyTitle')}</b>${i18n.t('inventory.emptyText')}</p>`;
    } else if (!list.length) {
      grid.innerHTML = `<p class="lk-bag-empty"><b>${i18n.t('inventory.emptyCatTitle')}</b>${i18n.t('inventory.emptyCatText')}</p>`;
    } else {
      grid.innerHTML = cells.join('') + Array.from({ length: Math.min(pad, 8) }, () => '<span class="lk-it lk-is-empty"><span class="lk-art"></span><span class="lk-cap">&nbsp;</span></span>').join('');
    }
    grid.querySelectorAll('.lk-it[data-id]').forEach((b) => {
      b.addEventListener('mouseenter', () => this._hoverTip(b, b.dataset.id));
      b.addEventListener('mouseleave', () => this._unhoverTip());
      b.addEventListener('click', () => {
        if (this.justDropped) return;
        if (this.pinned?.id === b.dataset.id) { this._closeTip(); return; }
        this._pinTip(b.dataset.id, b, 'grid');
      });
      // Doble clic: equipar al héroe seleccionado (o usar, si es un consumible)
      b.addEventListener('dblclick', () => this._quickUse(b.dataset.id));
    });
    const n = (this.equipmentManager.inventory || []).length + all.filter((g) => g.it.mat).reduce((a, g) => a + g.qty, 0);
    this.$('count').textContent = n === 1 ? i18n.t('inventory.itemsOne', { n }) : i18n.t('inventory.itemsMany', { n });
    if (this.pinned && !this.pinned.anchor.isConnected) this._closeTip();
  }

  /**
   * Cartas de partes de un Axie (las del combate). Devuelve los 6 ids, 'loading' mientras se consultan
   * o null si no se pueden resolver (entonces se usan las habilidades de siempre).
   */
  _partCardIds(heroId, base) {
    const resolver = typeof window !== 'undefined' ? window.lunakaiParts : null;
    const isAxie = base && (base.modelType === 'axie' || Boolean(base.axieId));
    if (!resolver || !isAxie) return null;
    const ids = resolver.idsFor(base);
    if (ids) return ids;
    this._partsTried = this._partsTried || {};
    const key = String(base.axieId || heroId);
    if (this._partsTried[key] === 'failed') return null;
    if (!this._partsTried[key]) {
      this._partsTried[key] = 'pending';
      resolver.resolve(base).catch(() => null).then((res) => {
        this._partsTried[key] = res?.ids ? 'done' : 'failed';
        if (this.activeHeroTab === 'runes' && this.selectedHeroId === heroId) this._renderHeroDetails();
      });
    }
    return 'loading';
  }

  /** Aviso en la pestaña «Runas y charms»: algún axie de la mochila sin runa. */
  _renderRunesDot() {
    const dot = this.$('runesDot');
    if (dot) dot.hidden = !this._heroIds().some((id) => !this._isSapi(id) && runesPending(id));
  }

  // ------------------------------------------------------------ ficha de objeto
  _tipHTML(it, pinned) {
    const k = slotOf(it);
    const eqSlot = EQ_SLOTS.includes(k);
    const eq = this._equipped();
    const curId = eqSlot ? eq[k] : null;
    const cur = curId ? ITEMS_DB[curId] : null;
    const isOn = curId === it.id && !(this.equipmentManager.inventory || []).includes(it.id);
    const hero = this._base()?.name || i18n.t('inventory.yourHero');
    const st = it.stats || {};
    const keys = eqSlot ? [...new Set([...Object.keys(st), ...Object.keys((!isOn && cur?.stats) || {})])].filter((s) => STAT_ES[s] && (st[s] || (!isOn && cur?.stats?.[s]))) : [];
    const diff = (s) => {
      if (isOn || !cur) return '';
      const d = (st[s] || 0) - (cur.stats?.[s] || 0);
      return d === 0 ? '' : `<span class="${d > 0 ? 'lk-up' : 'lk-down'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>`;
    };
    const eff = it.effect || {};
    const effRows = k === 'consumable' ? [['heal', i18n.t('inventory.healing')], ['pa', i18n.t('inventory.ap')], ['pm', i18n.t('inventory.mp')], ['shield', i18n.t('inventory.shield')], ['bond', i18n.t('inventory.bond')]].filter(([e]) => eff[e]).map(([e, l]) => `<span class="lk-tt-stat">${l}<b>+${eff[e]}${e === 'bond' ? ' %' : ''}</b></span>`).join('') : '';
    let acts = '';
    if (eqSlot) {
      acts = isOn
        ? `<button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="unequip"><span class="lk-b-ico">${sprite('i-close')}</span>${i18n.t('inventory.unequip')}</button>`
        : `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="equip"><span class="lk-b-ico"><img class="lk-ai" src="${I('tick')}" alt=""></span>${i18n.t('inventory.equipHero', { name: esc(hero) })}</button>`;
    } else if (k === 'consumable' && eff.openBag) {
      acts = `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="use"><span class="lk-b-ico"><img class="lk-ai" src="${I(eff.openBag === 'runes' ? 'rune' : 'charm')}" alt=""></span>${i18n.t('inventory.open')}</button>`;
    } else if (k === 'consumable' && eff.bond) {
      const care = typeof window !== 'undefined' ? window.lunakaiAxieCare : null;
      const full = Boolean(care && care.status().max);
      acts = full
        ? `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" disabled title="${i18n.t('inventory.bondFullTitle')}"><span class="lk-b-ico"><img class="lk-ai" src="${I('heart')}" alt=""></span>${i18n.t('inventory.bondFull')}</button>`
        : `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="use"><span class="lk-b-ico"><img class="lk-ai" src="${I('heart')}" alt=""></span>${i18n.t('inventory.giveAxie')}</button>`;
    } else if (k === 'consumable') {
      acts = `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="use"><span class="lk-b-ico"><img class="lk-ai" src="${I('tick')}" alt=""></span>${i18n.t('inventory.useOn', { name: esc(hero) })}</button>`;
    }
    const r = it.rarity || 'common';
    return `${pinned ? `<button type="button" class="lk-tt-x" aria-label="${i18n.t('inventory.closeCard')}">${sprite('i-close')}</button>` : ''}
      <header><span class="lk-tt-art">${art(it)}</span><div><small>${SLOT1[k] || i18n.t('inventory.item')}${EQ_SLOTS.includes(k) && it.tier != null ? i18n.t('inventory.tierSuffix', { n: it.tier }) : ''}</small><b>${esc(it.name)}</b><span class="lk-rar-chip" data-r="${r === 'legendary' ? 'mystic' : r}">${RAR_NAME[r] || r}</span></div></header>
      <div class="lk-tt-body">
        ${keys.length || effRows ? `<div class="lk-tt-stats">${keys.map((s) => `<span class="lk-tt-stat">${STAT_ES[s]}<b>${st[s] ? `+${st[s]}` : '—'}${diff(s)}</b></span>`).join('')}${effRows}</div>` : ''}
        ${isOn ? `<span class="lk-tt-note">${i18n.t('inventory.equippedOn', { name: esc(hero) })}</span>` : cur ? `<span class="lk-tt-note">${i18n.t('inventory.comparedWith', { item: esc(cur.name), name: esc(hero) })}</span>` : ''}
        ${k === 'quest' ? `<span class="lk-tt-note">${i18n.t('inventory.questItemNote')}</span>` : ''}
        ${it.mat ? `<span class="lk-tt-note">${i18n.t('inventory.forgeMaterial')} · ${esc(it.source || '')}</span>` : ''}
        ${it.description ? `<p class="${pinned ? '' : 'lk-clamp'}">${esc(it.description)}</p>` : ''}
        ${pinned ? (acts ? `<div class="lk-actions">${acts}</div>` : '') : `<span class="lk-tt-hint">${eqSlot ? i18n.t('inventory.hintEquip') : k === 'consumable' ? i18n.t('inventory.hintUse') : i18n.t('inventory.hintPin')}</span>`}
      </div>`;
  }

  _placeTip(el) {
    const tip = this.itip;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.right + 12;
    if (x + w > innerWidth - 8) x = r.left - w - 12;
    if (x < 8) x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(8, Math.min(innerHeight - h - 8, r.top - 6))}px`;
  }

  _hoverTip(el, id) {
    if (this.pinned || document.body.classList.contains('lk-is-dragging')) return;
    const it = itemOf(id);
    if (!it) return;
    this.itip.style.setProperty('--c', rv(it.rarity));
    this.itip.innerHTML = this._tipHTML(it, false);
    this.itip.classList.add('lk-is-on');
    this._placeTip(el);
  }

  _unhoverTip() { if (!this.pinned) this.itip.classList.remove('lk-is-on'); }

  _closeTip() {
    this.pinned = null;
    this.itip.classList.remove('lk-is-on', 'lk-is-pinned');
    this.modalEl.querySelectorAll('.lk-it.lk-is-sel').forEach((x) => x.classList.remove('lk-is-sel'));
  }

  _hideTooltip() { this._closeTip(); }

  _pinTip(id, anchor) {
    const it = itemOf(id);
    if (!it || !anchor) { this._closeTip(); return; }
    this.pinned = { id, anchor };
    this.modalEl.querySelectorAll('.lk-it[data-id]').forEach((x) => x.classList.toggle('lk-is-sel', x.dataset.id === id));
    this.itip.style.setProperty('--c', rv(it.rarity));
    this.itip.innerHTML = this._tipHTML(it, true);
    this.itip.classList.add('lk-is-on', 'lk-is-pinned');
    this._placeTip(anchor);
    this.itip.querySelector('.lk-tt-x')?.addEventListener('click', () => this._closeTip());
    this.itip.querySelector('[data-act="equip"]')?.addEventListener('click', () => this._equip(it));
    this.itip.querySelector('[data-act="unequip"]')?.addEventListener('click', () => this._unequip(slotOf(it)));
    this.itip.querySelector('[data-act="use"]')?.addEventListener('click', () => { this._closeTip(); this._useConsumable(it); });
  }

  // ------------------------------------------------------------ equipar
  _statKeys() {
    const s = this.equipmentManager.getCalculatedStats(this.selectedHeroId) || {};
    return { hp: s.maxHP, damage: s.bonusDamage, pa: s.maxPA, pm: s.maxPM, initiative: s.initiative, shield: s.initialShield };
  }

  _equip(it) {
    const hero = this.selectedHeroId;
    const slot = it.slot;
    const before = this._statKeys();
    const prev = this._equipped()[slot];
    if (!this.equipmentManager.equipItem(hero, slot, it.id)) { toast(i18n.t('inventory.cantEquipHere', { item: it.name }), true); return; }
    if (this.audio && this.audio.playBuff) this.audio.playBuff();
    if (this.onItemEquipped) this.onItemEquipped(hero, slot, it.id);
    this._refreshModelEquipment();
    if (this.isTutorialEquipLocked && it.id === this.tutorialTargetItemId) {
      // El aviso de «¡Equipado!» se mantiene hasta cerrar la mochila
    }
    const after = this._statKeys();
    this._closeTip();
    this._renderRoster();
    this._renderBackpackItems();
    this._renderDoll(Object.keys(after).filter((k) => after[k] !== before[k]));
    const el = this.$('doll').querySelector(`.lk-eq-slot[data-slot="${slot}"]`);
    if (el) { el.classList.remove('lk-just-equipped'); void el.offsetWidth; el.classList.add('lk-just-equipped'); }
    toast(`${i18n.t('inventory.equipped', { item: it.name })}${prev && prev !== it.id ? ` · ${i18n.t('inventory.backToBag', { item: ITEMS_DB[prev]?.name || i18n.t('inventory.thePrevious') })}` : ''}`);
  }

  _unequip(slot) {
    const hero = this.selectedHeroId;
    const id = this._equipped()[slot];
    if (!id) return;
    const before = this._statKeys();
    this.equipmentManager.unequipItem(hero, slot);
    if (this.audio && this.audio.playStep) this.audio.playStep();
    if (typeof this.onItemUnequipped === 'function') this.onItemUnequipped(hero, slot);
    this._refreshModelEquipment();
    const after = this._statKeys();
    this._closeTip();
    this._renderBackpackItems();
    this._renderDoll(Object.keys(after).filter((k) => after[k] !== before[k]));
    toast(i18n.t('inventory.backToBag', { item: ITEMS_DB[id]?.name || i18n.t('inventory.item') }));
  }

  _startDrag(e, src, id, from) {
    const it = ITEMS_DB[id];
    if (!it || !EQ_SLOTS.includes(it.slot)) return;
    const sx = e.clientX, sy = e.clientY;
    let ghost = null, over = null;
    const slots = [...this.$('doll').querySelectorAll('.lk-eq-slot')];
    const grid = this.$('bagView');
    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        ghost = document.createElement('div');
        ghost.className = 'lk-ui lk-it lk-drag-ghost';
        ghost.style.setProperty('--r', rv(it.rarity));
        ghost.innerHTML = `<span class="lk-art">${art(it)}</span><span class="lk-cap">${SLOT1[it.slot]}</span>`;
        document.body.appendChild(ghost);
        document.body.classList.add('lk-is-dragging');
        src.classList.add('lk-is-dragging');
        this._closeTip();
        slots.forEach((s) => s.classList.add(s.dataset.slot === it.slot ? 'lk-is-valid' : 'lk-is-invalid'));
        if (from === 'slot') grid.classList.add('lk-is-drop');
      }
      ghost.style.left = `${ev.clientX}px`;
      ghost.style.top = `${ev.clientY}px`;
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      over = t && (t.closest('#inventory-modal .lk-eq-slot') || t.closest('#inventory-modal [data-ref="bagView"]'));
      slots.forEach((s) => s.classList.toggle('lk-is-hover', s === over && s.dataset.slot === it.slot));
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (!ghost) return;
      ghost.remove();
      document.body.classList.remove('lk-is-dragging');
      src.classList.remove('lk-is-dragging');
      grid.classList.remove('lk-is-drop');
      slots.forEach((s) => s.classList.remove('lk-is-valid', 'lk-is-invalid', 'lk-is-hover'));
      this.justDropped = true;
      setTimeout(() => { this.justDropped = false; }, 0);
      if (over && over.classList && over.classList.contains('lk-eq-slot')) {
        if (over.dataset.slot === it.slot) { if (this._equipped()[it.slot] !== id || from === 'grid') this._equip(it); }
        else toast(i18n.t('inventory.goesInSlot', { item: it.name, slot: SLOT1[it.slot] }), true);
      } else if (from === 'slot' && over && over.dataset.ref === 'bagView') {
        this._unequip(it.slot);
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  _quickUse(id) {
    const it = ITEMS_DB[id];
    if (!it) return;
    const k = slotOf(it);
    this._closeTip();
    if (EQ_SLOTS.includes(k)) this._equip(it);
    else if (k === 'consumable') this._useConsumable(it);
  }

  // ------------------------------------------------------------ consumibles
  /** Abre una bolsa de runa o de charm: la saca de la Mochila y muestra lo que tocó. */
  async _openBag(item) {
    const idx = this.equipmentManager.inventory.indexOf(item.id);
    if (idx < 0) return;
    const kind = item.effect.openBag;
    const got = RuneCharmService.openBag(kind, false);
    if (!got) { toast(i18n.t('inventory.bagEmpty'), true); return; }
    this.equipmentManager.inventory.splice(idx, 1);
    try { this.equipmentManager._notifyChange?.(); } catch { /* nada */ }
    RuneCharmService._persist?.();
    this._renderBackpackItems();
    await loadRuneCharmArt();
    const CLS = { aquatic: i18n.t('inventory.clsAquatic'), beast: i18n.t('inventory.clsBeast'), bird: i18n.t('inventory.clsBird'), bug: i18n.t('inventory.clsBug'), plant: i18n.t('inventory.clsPlant'), reptile: i18n.t('inventory.clsReptile') };
    const it = got.item;
    showRewardCard({
      title: item.name,
      items: [{ icon: runeCharmArt(kind, it.id) || I(kind === 'runes' ? 'rune' : 'charm'), name: it.name, rarity: it.rarity }],
      note: kind === 'runes' ? i18n.t('inventory.bagNoteRune', { cls: CLS[it.class] || it.class }) : i18n.t('inventory.bagNoteCharm', { cls: CLS[it.class] || it.class }),
      audio: this.audio,
    });
  }

  _useConsumable(item) {
    if (!item || !this.equipmentManager) return;
    // Bolsa de runa o de charm (Hito 54): se abre y da una de clase al azar
    if (item.effect && item.effect.openBag) { this._openBag(item); return; }
    // Comida: siempre para el Axie principal (Axie Care), sin importar el héroe seleccionado
    if (item.effect && item.effect.bond) {
      const care = typeof window !== 'undefined' ? window.lunakaiAxieCare : null;
      const r = care ? care.feed(item.id) : { ok: false };
      if (this.audio && typeof this.audio.playBuff === 'function' && r.ok) this.audio.playBuff();
      toast(r.ok ? i18n.t('inventory.fed', { item: item.name, before: formatBond(r.before), after: formatBond(r.after) })
        : r.reason === 'full' ? i18n.t('inventory.bondFullFood') : i18n.t('inventory.cantFeed'), !r.ok);
      this._renderHeroDetails();
      this._renderBackpackItems();
      return;
    }
    const heroId = this.selectedHeroId;
    const heroName = this._base(heroId)?.name || i18n.t('inventory.hero');
    const stats = this.equipmentManager.getCalculatedStats(heroId);
    const maxHP = stats ? stats.maxHP : 300;
    const currentHP = this.equipmentManager.getCurrentHP(heroId);
    let message;
    if (item.effect && item.effect.heal) {
      const newHP = Math.min(maxHP, currentHP + item.effect.heal);
      const healed = newHP - currentHP;
      this.equipmentManager.setCurrentHP(heroId, newHP);
      message = healed > 0 ? i18n.t('inventory.healed', { name: heroName, n: healed, hp: newHP, max: maxHP }) : i18n.t('inventory.alreadyFull', { name: heroName });
    } else {
      message = i18n.t('inventory.effectOn', { item: item.name, name: heroName });
    }
    const idx = this.equipmentManager.inventory.indexOf(item.id);
    if (idx !== -1) this.equipmentManager.inventory.splice(idx, 1);
    if (this.audio && typeof this.audio.playBuff === 'function') this.audio.playBuff();
    toast(message);
    this._renderHeroDetails();
    this._renderBackpackItems();
  }

  _showToast(msg) { toast(msg); }

  _sfx() { if (this.audio && this.audio.playStep) this.audio.playStep(); }
}
