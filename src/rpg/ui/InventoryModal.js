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
import { asset, sprite, toast } from '../../ui/lk.js';
import { HeroModelPreview } from './HeroModelPreview.js';
import { createRunesView, runesPending } from '../../ui/RunesCharmsPanel.js';
import { ForgeService } from '../ForgeService.js';
import { MATERIALS } from '../../tactics/data/EconomyCatalog.js';
import { matSvg, BIOME } from '../../ui/ForgePanel.js';
import { MATERIAL_RARITY_NAME } from '../../tactics/data/EconomyCatalog.js';

export function getAxieClassIcon(cls) {
  const s = String(cls || '').toLowerCase();
  if (s.includes('bestia') || s.includes('beast')) return 'assets/classes/beast.png';
  if (s.includes('pájaro') || s.includes('pajaro') || s.includes('bird')) return 'assets/classes/bird.png';
  if (s.includes('planta') || s.includes('plant')) return 'assets/classes/plant.png';
  if (s.includes('acu') || s.includes('aquatic')) return 'assets/classes/aquatic.png';
  if (s.includes('bicho') || s.includes('bug')) return 'assets/classes/bug.png';
  if (s.includes('reptil') || s.includes('reptile')) return 'assets/classes/reptile.png';
  return 'assets/classes/beast.png';
}

const HERO_SPELLS = {
  kotaro: ['kotaro_slash', 'kotaro_push', 'kotaro_jump'],
  bing: STARTER_DECKS.bing, // las 6 cartas originales de Origins (tactics/data/StarterCards.js)
  pomodoro: STARTER_DECKS.pomodoro
};

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const EQ_SLOTS = ['weapon', 'hat', 'shield', 'body', 'boots'];
const SLOT1 = { weapon: 'Arma', hat: 'Sombrero', shield: 'Escudo', body: 'Armadura', boots: 'Botas', consumable: 'Consumible', quest: 'Objeto de misión', material: 'Material' };
const TABS = [['all', 'Todo'], ['weapon', 'Armas'], ['hat', 'Sombreros'], ['shield', 'Escudos'], ['body', 'Armaduras'], ['boots', 'Botas'], ['consumable', 'Consumibles'], ['material', 'Materiales'], ['quest', 'Misión']];
const STAT_ES = { hp: 'Vida', damage: 'Daño', pa: 'PA', pm: 'PM', initiative: 'Iniciativa', shield: 'Escudo' };
/** Efecto principal de un consumible u objeto de misión, para la franja inferior de su casilla. */
const effectCap = (it, k) => {
  const e = it.effect || {};
  if (e.bond) return `+${e.bond}% Vínculo`;
  if (e.heal) return `Cura ${e.heal}`;
  if (e.shield) return `+${e.shield} Escudo`;
  if (e.pa || e.pm) return [e.pa && `+${e.pa} PA`, e.pm && `+${e.pm} PM`].filter(Boolean).join(' · ');
  if (k === 'quest') return 'Misión';
  return SLOT1[k] || 'Objeto';
};
const RAR_ORDER = { mystic: 5, legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
const RAR_NAME = { mystic: 'Místico', legendary: 'Místico', epic: 'Épico', rare: 'Raro', uncommon: 'Poco común', common: 'Común' };
// Ranuras en una sola columna, en el borde derecho del modelo 3D (junto a la cuadrícula de objetos: arrastre más corto),
// de arriba abajo en orden del cuerpo: sombrero, armadura, arma, escudo, botas
const RAIL_ORDER = ['hat', 'body', 'weapon', 'shield', 'boots'];
const DOLL_POS = Object.fromEntries(RAIL_ORDER.map((s, i) => [s, ['calc(100% - 46px)', `${12 + i * 19}%`]]));
const ATTRS = [
  ['vitality', 'Vitalidad', '+1 Vida'],
  ['ferocity', 'Ferocidad', '+1,5 cuerpo a cuerpo · +1 colisión'],
  ['agility', 'Agilidad', '+1,2 a distancia · +0,5% crítico'],
  ['essence', 'Esencia', '+2% apoyo (curas y escudos)']
];
/** Qué hace cada atributo según el héroe (19-oct): el Sapidae Lunalogista y Astromante usan la Esencia como daño. */
function attrHints(heroId, base) {
  const magic = heroId === 'sapidae' && ['lunalogist', 'stargazer'].includes(base?.sapidaeClassKey);
  if (!magic) return ATTRS;
  return [
    ['vitality', 'Vitalidad', '+1 Vida'],
    ['ferocity', 'Ferocidad', '+1 colisión'],
    ['agility', 'Agilidad', '+0,5% crítico'],
    ['essence', 'Esencia', '+1,2 daño de sus hechizos · +2% apoyo']
  ];
}
const pct = (v) => String(Math.round((Number(v) || 0) * 10) / 10).replace('.', ',');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slotOf = (it) => (it.slot === 'consumable' || it.category === 'consumable' || it.type === 'consumable') ? 'consumable'
  : (it.slot === 'quest' || it.category === 'quest' || it.type === 'quest') ? 'quest' : it.slot;
const rv = (r) => `var(--lk-rar-${r === 'legendary' ? 'legendary' : (r || 'common')})`;
const isImg = (s) => typeof s === 'string' && (/^(\.\/|\/|assets\/|http|data:image)/.test(s) || /\.(png|jpe?g|webp|svg)$/i.test(s));
// Materiales (bolsa de la Forja: recolección, Tienda, botín): se muestran en la mochila como objetos más
const MAT_RARITY = { 0: 'mystic', 1: 'common', 2: 'uncommon', 3: 'rare', 4: 'epic', 5: 'legendary' };
const matItem = (m) => m && ({ id: m.id, name: m.name, slot: 'material', tier: m.tier || null, rarity: m.rarity || MAT_RARITY[m.tier] || 'common', glyph: m.glyph, icon: m.icon, biome: m.biome, description: m.description, source: m.source, mat: true });
const itemOf = (id) => ITEMS_DB[id] || matItem(MATERIALS[id]);
const art = (it) => it.mat && !it.icon ? `<span class="lk-mat-art" style="color:${BIOME[it.biome]?.[1] || '#B8892E'}">${matSvg(it.glyph, '')}</span>` : isImg(it.icon) ? `<img src="${it.icon}" alt="" draggable="false">` : `<span class="lk-emoji">${it.icon || '📦'}</span>`;

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
      <div class="lk-panel-modal-window lk-bag" role="dialog" aria-label="Mochila">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I('inventory')}" alt=""></span>
          <h3><small>Inventario</small>Mochila</h3>
          <button type="button" class="lk-btn lk-btn-moon lk-btn--sm lk-bag__squad" data-ref="squadBtn" title="Tecla K"><span class="lk-b-ico"><img class="lk-ai" src="${I('team')}" alt=""></span>Escuadrón</button>
          <div class="lk-segmented" data-ref="viewTabs"><button type="button" aria-pressed="true" data-view="equipment">Mochila</button><button type="button" aria-pressed="false" data-view="runes" title="Tecla U">Runas y charms<span class="lk-bag-dot" data-ref="runesDot" hidden></span></button></div>
          <div class="lk-wallet" aria-label="Monedas"><span class="lk-res-pill" title="Oro"><span class="lk-ico" style="background:var(--lk-gilt-300)"><img src="${I('resource')}" alt="" style="width:15px;height:15px"></span><span data-ref="gold">0</span></span><span class="lk-res-pill lk-cur" title="SLP · Smooth Love Potion (moneda de evolución)"><img class="lk-cur-ico" src="${asset('assets/currency/slp.png')}" alt="SLP"><span data-ref="slp">0</span></span><span class="lk-res-pill lk-cur" title="bAXS (comisión y rapidez de la forja)"><img class="lk-cur-ico" src="${asset('assets/currency/baxs.png')}" alt="bAXS"><span data-ref="baxs">0</span></span></div>
          <button type="button" class="lk-btn-close-x" data-ref="close" aria-label="Cerrar">${sprite('i-close')}</button>
        </div>
        <div class="lk-bag__body lk-bag__body--3">
          <div class="lk-bag__attrs">
            <div class="lk-sq-strip" data-ref="strip" aria-label="Escuadrón"></div>
            <div class="lk-hero-stats" data-ref="stats"></div>
          </div>
          <div class="lk-bag__doll lk-bag__doll--model">
            <div class="lk-doll lk-doll--model" data-ref="doll">
              <div class="lk-doll__stage" data-ref="stage"></div>
              <span class="lk-doll__hint">Arrastra para girar</span>
              <span class="lk-doll__rail" aria-hidden="true"></span>
              ${RAIL_ORDER.map((s) => `<button type="button" class="lk-eq-slot" data-slot="${s}" style="--x:${DOLL_POS[s][0]};--y:${DOLL_POS[s][1]}"></button>`).join('')}
            </div>
          </div>
          <div class="lk-bag__grid-wrap" data-ref="bagView">
            <div class="lk-bag__bar">
              <div class="lk-codex__filters" data-ref="tabs"></div>
              <label class="lk-bag__sort"><span class="lk-label">Orden</span>
                <select data-ref="sort" class="lk-input lk-select" aria-label="Ordenar la mochila"><option value="rar">Rareza</option><option value="tier">Nivel</option><option value="name">Nombre</option></select></label>
            </div>
            <div class="lk-bag-tut" data-ref="tut" hidden></div>
            <div class="lk-bag__grid" data-ref="grid"></div>
            <div class="lk-bag__cap"><span class="lk-drag-hint" style="margin-right:auto">Pasa el ratón para ver la ficha · clic para fijarla · doble clic o arrastra para equipar.</span><span data-ref="count"></span></div>
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
    this.$('gold').textContent = Number(g).toLocaleString('es');
    // SLP y bAXS (se guardan con la Forja)
    try {
      const w = ForgeService.wallet();
      this.$('slp').textContent = Number(w.slp).toLocaleString('es');
      this.$('baxs').textContent = (Math.round(w.baxs * 100) / 100).toLocaleString('es', { maximumFractionDigits: 2 });
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
    toast(`Primero equipa ${ITEMS_DB[this.tutorialTargetItemId]?.name || 'el objeto indicado'}`, true);
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
      this.model = new HeroModelPreview(this.$('stage'), {
        fallbackPortrait: (id) => {
          const base = this._base(id);
          const key = this._isSapi(id) ? (base?.modelType || 'sapidae-f-a') : (base?.axieId || id);
          return portraitService.getPortraitSync(key) || (this._isSapi(id) ? `./assets/portraits/${key}.png` : base?.image || `./assets/portraits/${id}.png`);
        }
      });
      this.model.start();
    }
    const key = this._modelKey();
    if (this._modelShown === key) return;
    this._modelShown = key;
    this.model.show(this.selectedHeroId, this._base(), this._equipped())
      .then(() => { if (this.isOpen) this.model.start(); })
      .catch(() => { if (this._modelShown === key) this._modelShown = null; }); // reintentar en la próxima apertura
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
    const c = String(getAxieClassIcon(this._base(id)?.class)).match(/classes\/(\w+)\.png/)?.[1];
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
      return `<button type="button" class="lk-sq-pip" data-h="${id}" aria-pressed="${this.selectedHeroId === id}" aria-label="Equipar a ${esc(this._base(id).name)}">${this._portrait(id)}${i === 1 ? `<span class="lk-hb" title="Compañero principal"><img src="${I('heart')}" alt=""></span>` : ''}${pending ? '<span class="lk-bag-pend" title="Puntos sin asignar">!</span>' : ''}<span class="lk-nm">${esc(this._base(id).name)}</span></button>`;
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
    const CLS_ES = { beast: 'Bestia', bird: 'Pájaro', plant: 'Planta', aquatic: 'Acuático', bug: 'Bicho', reptile: 'Reptil' };
    const clsName = this._isSapi(this.selectedHeroId) ? 'Sapidae' : (CLS_ES[this._clsKey(this.selectedHeroId)] || 'Axie');
    const xp = this._xp || { level: prog.level, cur: prog.currentExp, req: em.getRequiredExp(prog.level), pct: 0 };
    // Estadísticas en cuadrícula de 2 columnas (pantalla 18 del sistema de diseño)
    this.$('stats').innerHTML = `<span class="lk-label">${esc(base.name)} · ${esc(clsName)}${s.role ? ` · ${esc(s.role)}` : ''}</span>`
      + `<div class="lk-bag-xp"><span>Nv ${xp.level}</span><span class="lk-bar lk-bar--xp" style="--v:${xp.pct}%"><i></i></span><b>${xp.cur}/${xp.req}</b></div>`
      + '<div class="lk-hero-stats lk-hero-stats--grid">'
      + cell('hp', 'Vida', 'Vida máxima', s.maxHP, g.hp)
      + cell('damage', 'Daño', 'Daño extra', `+${s.bonusDamage}`, g.damage)
      + cell('pa', 'PA', 'Puntos de acción', s.maxPA, g.pa)
      + cell('pm', 'PM', 'Puntos de movimiento', s.maxPM, g.pm)
      + cell('initiative', 'Inic.', 'Iniciativa', s.initiative, g.initiative)
      + cell('shield', 'Escudo', 'Escudo inicial', `+${s.initialShield}`, g.shield)
      + cell('crit', 'Crít.', 'Probabilidad de crítico', `${pct(s.critRate)}%`)
      + cell('support', 'Apoyo', 'Poder de apoyo', `+${pct(s.supportPower)}%`)
      + '</div>'
      // Atributos: se reparten aquí con los 3 puntos que da cada nivel (EquipmentManager.allocateStatPoint)
      + `<div class="lk-attr-block"><span class="lk-label">Atributos${pts ? `<span class="lk-attr-pts">${pts} ${pts === 1 ? 'punto' : 'puntos'}</span>` : '<span class="lk-attr-pts lk-is-off">3 por nivel</span>'}</span>`
      + attrHints(this.selectedHeroId, base).map(([k, label, hint]) => `<div class="lk-attr ${pts ? 'lk-can' : ''}"><span><b>${label}</b><small>${hint}</small></span><strong>${ap[k] || 0}</strong>${pts ? `<button type="button" class="lk-attr-add" data-stat="${k}" aria-label="Asignar 1 punto a ${label}">+</button>` : ''}</div>`).join('')
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
      const heroName = this._base()?.name || 'tu héroe';
      const target = ITEMS_DB[this.tutorialTargetItemId]?.name || 'la espada';
      tut.className = `lk-bag-tut ${tutDone ? 'lk-ok' : ''}`;
      tut.innerHTML = tutDone
        ? `<img class="lk-ai" src="${I('tick')}" alt=""><span><b>¡Equipado!</b> Pulsa <kbd>I</kbd>, <kbd>Esc</kbd> o la ✕ para cerrar la mochila.</span>`
        : `<img class="lk-ai" src="${I('mission')}" alt=""><span><b>Misión del Maestro Paladill:</b> arrastra <b>${esc(target)}</b> a la ranura de arma de ${esc(heroName)}, o haz clic en él y pulsa «Equipar».</span>`;
    }

    const cells = list.map(({ it, qty }) => {
      const k = slotOf(it);
      const st = it.stats || {};
      // Franja inferior = siempre el efecto principal; la cantidad va en la chapa de la esquina y el nombre en la ficha
      const cap = EQ_SLOTS.includes(k)
        ? (Object.entries(st).filter(([, v]) => v).slice(0, 1).map(([s, v]) => `+${v} ${STAT_ES[s] || s}`).join('') || SLOT1[k])
        : k === 'material' ? (it.tier ? `${MATERIAL_RARITY_NAME[it.rarity] || ''} · ${BIOME[it.biome]?.[0] || ''}` : 'Catalizador') : effectCap(it, k);
      const spot = tutOn && !tutDone && it.id === this.tutorialTargetItemId;
      return `<button type="button" class="lk-it ${this.pinned?.id === it.id ? 'lk-is-sel' : ''} ${spot ? 'lk-tut-spot' : ''}" data-id="${it.id}" ${EQ_SLOTS.includes(k) ? `data-slot="${k}"` : ''} style="--r:${rv(it.rarity)}" aria-label="${esc(it.name)}${qty > 1 ? ` ×${qty}` : ''}"><span class="lk-art">${art(it)}${EQ_SLOTS.includes(k) && it.tier != null ? `<span class="lk-tier">T${it.tier}</span>` : ''}${qty > 1 ? `<span class="lk-qty">×${qty}</span>` : ''}</span><span class="lk-cap">${esc(cap)}</span></button>`;
    });
    const pad = Math.max(0, Math.ceil((cells.length + 1) / 8) * 8 - cells.length);
    const grid = this.$('grid');
    if (!all.length) {
      grid.innerHTML = '<p class="lk-bag-empty"><b>Mochila vacía</b>Completa misiones o derrota quimeras para conseguir equipo y provisiones.</p>';
    } else if (!list.length) {
      grid.innerHTML = '<p class="lk-bag-empty"><b>Nada en esta categoría</b>Elige «Todo» para ver toda la mochila.</p>';
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
    this.$('count').textContent = `${n} ${n === 1 ? 'objeto' : 'objetos'}`;
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
    const hero = this._base()?.name || 'tu héroe';
    const st = it.stats || {};
    const keys = eqSlot ? [...new Set([...Object.keys(st), ...Object.keys((!isOn && cur?.stats) || {})])].filter((s) => STAT_ES[s] && (st[s] || (!isOn && cur?.stats?.[s]))) : [];
    const diff = (s) => {
      if (isOn || !cur) return '';
      const d = (st[s] || 0) - (cur.stats?.[s] || 0);
      return d === 0 ? '' : `<span class="${d > 0 ? 'lk-up' : 'lk-down'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>`;
    };
    const eff = it.effect || {};
    const effRows = k === 'consumable' ? [['heal', 'Curación'], ['pa', 'PA'], ['pm', 'PM'], ['shield', 'Escudo'], ['bond', 'Vínculo']].filter(([e]) => eff[e]).map(([e, l]) => `<span class="lk-tt-stat">${l}<b>+${eff[e]}${e === 'bond' ? ' %' : ''}</b></span>`).join('') : '';
    let acts = '';
    if (eqSlot) {
      acts = isOn
        ? `<button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="unequip"><span class="lk-b-ico">${sprite('i-close')}</span>Quitar</button>`
        : `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="equip"><span class="lk-b-ico"><img class="lk-ai" src="${I('tick')}" alt=""></span>Equipar a ${esc(hero)}</button>`;
    } else if (k === 'consumable' && eff.bond) {
      const care = typeof window !== 'undefined' ? window.lunakaiAxieCare : null;
      const full = Boolean(care && care.status().max);
      acts = full
        ? `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" disabled title="El vínculo ya está al 100 %"><span class="lk-b-ico"><img class="lk-ai" src="${I('heart')}" alt=""></span>Vínculo al 100 %</button>`
        : `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="use"><span class="lk-b-ico"><img class="lk-ai" src="${I('heart')}" alt=""></span>Dar a tu Axie</button>`;
    } else if (k === 'consumable') {
      acts = `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="use"><span class="lk-b-ico"><img class="lk-ai" src="${I('tick')}" alt=""></span>Usar en ${esc(hero)}</button>`;
    }
    const r = it.rarity || 'common';
    return `${pinned ? `<button type="button" class="lk-tt-x" aria-label="Cerrar ficha">${sprite('i-close')}</button>` : ''}
      <header><span class="lk-tt-art">${art(it)}</span><div><small>${SLOT1[k] || 'Objeto'}${EQ_SLOTS.includes(k) && it.tier != null ? ` · Tier ${it.tier}` : ''}</small><b>${esc(it.name)}</b><span class="lk-rar-chip" data-r="${r === 'legendary' ? 'mystic' : r}">${RAR_NAME[r] || r}</span></div></header>
      <div class="lk-tt-body">
        ${keys.length || effRows ? `<div class="lk-tt-stats">${keys.map((s) => `<span class="lk-tt-stat">${STAT_ES[s]}<b>${st[s] ? `+${st[s]}` : '—'}${diff(s)}</b></span>`).join('')}${effRows}</div>` : ''}
        ${isOn ? `<span class="lk-tt-note">Equipado en ${esc(hero)}</span>` : cur ? `<span class="lk-tt-note">Comparado con ${esc(cur.name)} (equipado en ${esc(hero)})</span>` : ''}
        ${k === 'quest' ? '<span class="lk-tt-note">Objeto de misión: se guarda para tus misiones activas.</span>' : ''}
        ${it.mat ? `<span class="lk-tt-note">Material de la Forja · ${esc(it.source || '')}</span>` : ''}
        ${it.description ? `<p class="${pinned ? '' : 'lk-clamp'}">${esc(it.description)}</p>` : ''}
        ${pinned ? (acts ? `<div class="lk-actions">${acts}</div>` : '') : `<span class="lk-tt-hint">${eqSlot ? 'Clic: fijar ficha · Doble clic o arrastra: equipar' : k === 'consumable' ? 'Clic: fijar ficha · Doble clic: usar' : 'Clic: fijar ficha'}</span>`}
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
    if (!this.equipmentManager.equipItem(hero, slot, it.id)) { toast(`${it.name} no se puede equipar aquí`, true); return; }
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
    toast(`${it.name} equipado${prev && prev !== it.id ? ` · ${ITEMS_DB[prev]?.name || 'el anterior'} vuelve a la mochila` : ''}`);
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
    toast(`${ITEMS_DB[id]?.name || 'Objeto'} vuelve a la mochila`);
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
        else toast(`${it.name} va en la ranura de ${SLOT1[it.slot]}`, true);
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
  _useConsumable(item) {
    if (!item || !this.equipmentManager) return;
    // Comida: siempre para el Axie principal (Axie Care), sin importar el héroe seleccionado
    if (item.effect && item.effect.bond) {
      const care = typeof window !== 'undefined' ? window.lunakaiAxieCare : null;
      const r = care ? care.feed(item.id) : { ok: false };
      if (this.audio && typeof this.audio.playBuff === 'function' && r.ok) this.audio.playBuff();
      toast(r.ok ? `Tu Axie se come ${item.name}: vínculo ${formatBond(r.before)}% → ${formatBond(r.after)}%`
        : r.reason === 'full' ? 'El vínculo ya está al 100 %: guarda la comida para más adelante' : 'Ahora no puedes darle de comer', !r.ok);
      this._renderHeroDetails();
      this._renderBackpackItems();
      return;
    }
    const heroId = this.selectedHeroId;
    const heroName = this._base(heroId)?.name || 'Héroe';
    const stats = this.equipmentManager.getCalculatedStats(heroId);
    const maxHP = stats ? stats.maxHP : 300;
    const currentHP = this.equipmentManager.getCurrentHP(heroId);
    let message;
    if (item.effect && item.effect.heal) {
      const newHP = Math.min(maxHP, currentHP + item.effect.heal);
      const healed = newHP - currentHP;
      this.equipmentManager.setCurrentHP(heroId, newHP);
      message = healed > 0 ? `${heroName} recupera +${healed} de vida (${newHP}/${maxHP})` : `${heroName} ya tenía la vida completa`;
    } else {
      message = `${item.name}: efecto activado en ${heroName}`;
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
