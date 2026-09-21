// InventoryModal.js - Comprehensive 3-Column Inventory, Equipment & Skills Progression Modal for Axies
import { ITEMS_DB } from '../../tactics/ItemDatabase.js';
import { SPELLS_DB } from '../../tactics/Spells.js';
import { getHeroSpells } from '../SaveSlotManager.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';

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
  bing: ['bing_explosive', 'bing_retreat', 'bing_slow'],
  pomodoro: ['pomodoro_heal', 'pomodoro_stim', 'pomodoro_bramble']
};

export class InventoryModal {
  constructor(equipmentManager, audioSystem = null) {
    this.equipmentManager = equipmentManager;
    this.audio = audioSystem;
    this.isOpen = false;
    this.selectedHeroId = 'kotaro';
    this.activeHeroTab = 'equipment'; // 'equipment' | 'skills'
    this.activeCategoryFilter = 'all'; // 'all', 'weapon', 'hat', 'shield', 'body', 'boots'
    this.isTutorialEquipLocked = false;
    this.tutorialTargetItemId = null;
    this.tutorialManager = null;
    this.questManager = null;

    this._createDOM();
  }

  _createDOM() {
    let modal = document.getElementById('inventory-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'inventory-modal';
      modal.className = 'inventory-modal hidden';
      modal.innerHTML = `
        <div class="inventory-backdrop"></div>
        <div id="inv-floating-tooltip" class="inv-floating-tooltip hidden"></div>
        <div class="inventory-container">
          <!-- Modal Header -->
          <div class="inventory-header">
            <div class="inventory-title-group">
              <span class="inventory-header-badge">🎒 LUNACIA ARSENAL & BACKPACK</span>
              <h2 class="inventory-title">Squad Inventory & Progression</h2>
            </div>
            <div id="inv-header-gold-pill" class="inv-header-gold-pill" style="display:flex;align-items:center;gap:6px;background:rgba(234,179,8,0.18);border:1px solid rgba(234,179,8,0.5);border-radius:20px;padding:6px 14px;color:#facc15;font-weight:700;font-size:14px;">
              <span>🪙</span>
              <span id="inv-gold-amount">0</span>
              <span style="font-size:11px;color:#eab308;text-transform:uppercase;letter-spacing:0.5px;">Gold</span>
            </div>
            <button id="inventory-close-btn" class="inventory-close-btn" title="Close [I] / [Escape]">✕</button>
          </div>

          <!-- Main 3-Column Body -->
          <div class="inventory-body">
            <!-- Column 1: Hero Roster Selection -->
            <div class="inv-col-roster">
              <h3 class="inv-section-title">👥 Squad</h3>
              <div id="inv-roster-list" class="inv-roster-list">
                <!-- Injected dynamically -->
              </div>
            </div>

            <!-- Column 2: Selected Hero Equipment & Live Stats / Skills -->
            <div class="inv-col-equipment">
              <!-- Hero Identity & EXP Progress Banner -->
              <div class="inv-hero-identity">
                <div class="inv-hero-meta">
                  <div class="inv-hero-title-row">
                    <h3 id="inv-hero-name" class="inv-hero-name">Hero</h3>
                    <span id="inv-hero-level-badge" class="inv-hero-level-badge">Lv. 1</span>
                  </div>
                  <span id="inv-hero-archetype" class="inv-hero-archetype">Beast Axie (Melee Duelist)</span>
                  <div class="inv-hero-exp-row">
                    <div class="inv-hero-exp-track">
                      <div id="inv-hero-exp-fill" class="inv-hero-exp-fill" style="width: 0%;"></div>
                    </div>
                    <span id="inv-hero-exp-text" class="inv-hero-exp-text">0 / 100 EXP</span>
                  </div>
                </div>
              </div>

              <!-- Column 2 Navigation Subtabs -->
              <div class="inv-col2-nav-tabs">
                <button id="inv-subtab-equipment" class="inv-subtab-btn active">🛡️ Gear & Stats</button>
                <button id="inv-subtab-skills" class="inv-subtab-btn">
                  ✨ Skills <span id="inv-skills-tab-dot" class="inv-tab-notify-dot hidden">!</span>
                </button>
              </div>

              <!-- View 1: Equipment Slots & Calculated Combat Stats -->
              <div id="inv-view-equipment" class="inv-view-pane">
                <!-- 5 Equipment Slots (Equipment Slots) -->
                <div class="inv-doll-wrapper">
                  <h4 class="inv-sub-title">Equipment Slots</h4>
                  <div id="inv-doll-grid" class="inv-doll-grid">
                    <!-- 5 slots injected dynamically in cross formation -->
                  </div>
                </div>

                <!-- Live Calculated Combat Stats with Points Allocation -->
                <div class="inv-stats-wrapper">
                  <div class="inv-stats-header-row">
                    <h4 class="inv-sub-title">Combat Stats</h4>
                    <span id="inv-stat-points-badge" class="inv-unspent-badge hidden">⚡ 0 Points</span>
                  </div>
                  <div id="inv-stats-list" class="inv-stats-list">
                    <!-- Stats injected dynamically with + buttons -->
                  </div>
                </div>
              </div>

              <!-- View 2: Skills & Progression -->
              <div id="inv-view-skills" class="inv-view-pane hidden">
                <div class="inv-skills-header-row">
                  <h4 class="inv-sub-title">Combat Skills (Lv. 1 to 5)</h4>
                  <span id="inv-skill-points-badge" class="inv-unspent-badge hidden">✨ 0 Skill Pts</span>
                </div>
                <div id="inv-skills-list" class="inv-skills-list">
                  <!-- 3 Skill cards injected dynamically with upgrade buttons -->
                </div>
              </div>
            </div>

            <!-- Column 3: Backpack Items with Filters, Lore & Benefits -->
            <div class="inv-col-backpack">
              <div class="inv-backpack-header">
                <div class="inv-backpack-title-row">
                  <h3 class="inv-section-title">🎒 Item Backpack</h3>
                  <span id="inv-items-count" class="inv-items-counter">0 items</span>
                </div>

                <!-- Slot Category Filter Bar -->
                <div id="inv-filter-bar" class="inv-filter-bar">
                  <button class="inv-filter-btn active" data-filter="all">All</button>
                  <button class="inv-filter-btn" data-filter="weapon">⚔️ Weapons</button>
                  <button class="inv-filter-btn" data-filter="equipment">🎽 Gear</button>
                  <button class="inv-filter-btn" data-filter="shield">🛡️ Shields</button>
                  <button class="inv-filter-btn" data-filter="consumable">🧪 Consumables</button>
                  <button class="inv-filter-btn" data-filter="quest" title="Quest Items">📜 Quest Items</button>
                </div>
              </div>

              <!-- Scrollable Item Cards Grid -->
              <div id="inv-items-grid" class="inv-items-grid">
                <!-- Item cards injected dynamically -->
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Event listeners for close
      modal.querySelector('.inventory-backdrop').addEventListener('click', () => this.close());
      document.getElementById('inventory-close-btn').addEventListener('click', () => this.close());

      // Subtab click listeners
      document.getElementById('inv-subtab-equipment').addEventListener('click', () => {
        if (this.audio && this.audio.playStep) this.audio.playStep();
        this.activeHeroTab = 'equipment';
        this._renderHeroDetails();
      });
      document.getElementById('inv-subtab-skills').addEventListener('click', () => {
        if (this.audio && this.audio.playStep) this.audio.playStep();
        this.activeHeroTab = 'skills';
        this._renderHeroDetails();
      });

      // Prevent wheel scrolling inside inventory modal from zooming 3D overworld camera
      modal.addEventListener('wheel', (e) => {
        e.stopPropagation();
      }, { passive: true });

      // Filter button listeners
      const filterBtns = modal.querySelectorAll('.inv-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.audio && this.audio.playStep) this.audio.playStep();
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeCategoryFilter = btn.dataset.filter;
          this._renderBackpackItems();
        });
      });
    }

    this.modalEl = modal;
  }

  _renderGold() {
    const goldEl = document.getElementById('inv-gold-amount');
    if (goldEl && this.equipmentManager) {
      const currentGold = typeof this.equipmentManager.getGold === 'function'
        ? this.equipmentManager.getGold()
        : (this.equipmentManager.gold || 0);
      goldEl.textContent = Number(currentGold).toLocaleString();
    }
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
      this._renderRoster();
      this._renderHeroDetails();
      this._renderGold();
      return;
    }
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');

    if (this.audio && this.audio.playBuff) {
      this.audio.playBuff();
    }

    this._renderRoster();
    this._renderHeroDetails();
    this._renderBackpackItems();
    this._renderGold();
    if (this.onOpen) this.onOpen();
  }

  toggle(heroId = null) {
    if (document.body.classList.contains('state-combat') || 
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      this.close();
      return;
    }
    if (this.isOpen) {
      this.close();
    } else {
      this.open(heroId);
    }
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
    if (!this.isTutorialEquipLocked || !this.tutorialTargetItemId) {
      return false;
    }

    if (this.tutorialManager) {
      if (!this.tutorialManager.isActive || this.tutorialManager.currentStep === 'COMPLETED' || this.tutorialManager.hasEquippedSword) {
        this.isTutorialEquipLocked = false;
        this.tutorialTargetItemId = null;
        return false;
      }
      if (this.tutorialManager.currentStep !== 'EQUIP_SWORD') {
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
    const heroEq = eq[this.selectedHeroId] || eq['kotaro'];
    if (!heroEq) return false;
    return heroEq.weapon === this.tutorialTargetItemId || Object.values(heroEq).includes(this.tutorialTargetItemId);
  }

  _showTutorialBlockedFeedback() {
    if (this.audio && typeof this.audio.playCollision === 'function') {
      this.audio.playCollision();
    }
    const container = this.modalEl?.querySelector('.inventory-container');
    if (container) {
      container.classList.remove('shake-warning');
      void container.offsetWidth;
      container.classList.add('shake-warning');
      setTimeout(() => container.classList.remove('shake-warning'), 500);
    }
    const hint = this.modalEl?.querySelector('.inv-tutorial-hint');
    if (hint) {
      hint.classList.remove('shake-warning');
      void hint.offsetWidth;
      hint.classList.add('shake-warning');
      setTimeout(() => hint.classList.remove('shake-warning'), 500);
    }
    const targetCard = this.modalEl?.querySelector('.tutorial-spotlight-sword');
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    this.modalEl.classList.add('hidden');

    if (this.audio && this.audio.playStep) {
      this.audio.playStep();
    }
    if (this.onClose) this.onClose();
  }

  _showTooltip(item, e) {
    const tt = document.getElementById('inv-floating-tooltip');
    if (!tt || !item) return;

    let statsHTML = '';
    if (item.stats.damage) statsHTML += `<span class="inv-stat-pill pill-dmg">+${item.stats.damage} Damage</span>`;
    if (item.stats.hp) statsHTML += `<span class="inv-stat-pill pill-hp">+${item.stats.hp} HP</span>`;
    if (item.stats.pa) statsHTML += `<span class="inv-stat-pill pill-pa">+${item.stats.pa} AP</span>`;
    if (item.stats.pm) statsHTML += `<span class="inv-stat-pill pill-pm">+${item.stats.pm} MP</span>`;
    if (item.stats.shield) statsHTML += `<span class="inv-stat-pill pill-shield">+${item.stats.shield} Shield</span>`;
    if (item.stats.initiative) statsHTML += `<span class="inv-stat-pill pill-init">+${item.stats.initiative} Init</span>`;

    const slotLabels = {
      weapon: 'WEAPON',
      hat: 'HAT',
      shield: 'SHIELD',
      body: 'ARMOR',
      boots: 'BOOTS'
    };
    const slotName = slotLabels[item.slot] || (item.slot ? item.slot.toUpperCase() : 'GEAR');

    tt.innerHTML = `
      <div class="inv-tt-header">
        <img class="inv-tt-icon" src="${item.icon}" alt="">
        <div class="inv-tt-title-group">
          <span class="inv-tt-title">${item.name}</span>
          <div class="inv-tt-tags">
            <span class="inv-tt-slot-tag">${slotName}</span>
            <span class="inv-rarity-badge ${item.rarity}">${item.rarity.toUpperCase()}</span>
          </div>
        </div>
      </div>
      <div class="inv-tt-divider"></div>
      ${item.description ? `<div class="inv-tt-desc">${item.description}</div>` : ''}
      <div class="inv-tt-stats">${statsHTML}</div>
      <div class="inv-tt-hint">🖱️ Click to unequip</div>
    `;

    this._positionTooltip(e);
    tt.classList.remove('hidden');
  }

  _positionTooltip(e) {
    const tt = document.getElementById('inv-floating-tooltip');
    if (!tt) return;

    const offset = 14;
    let x = e.clientX + offset;
    let y = e.clientY + offset;

    const width = 230;
    const height = 150;

    if (x + width > window.innerWidth - 10) {
      x = e.clientX - width - 10;
    }
    if (y + height > window.innerHeight - 10) {
      y = e.clientY - height - 10;
    }

    tt.style.left = `${Math.max(10, x)}px`;
    tt.style.top = `${Math.max(10, y)}px`;
  }

  _hideTooltip() {
    const tt = document.getElementById('inv-floating-tooltip');
    if (tt) {
      tt.classList.add('hidden');
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  _renderRoster() {
    const container = document.getElementById('inv-roster-list');
    if (!container) return;
    container.innerHTML = '';

    // If current selected hero is not unlocked, default to first unlocked hero
    if (!this.equipmentManager.isHeroUnlocked(this.selectedHeroId)) {
      this.selectedHeroId = (this.equipmentManager.unlockedHeroes && this.equipmentManager.unlockedHeroes[0]) || 'kotaro';
    }

    // Only render heroes that have been unlocked/acquired in the player's party
    const unlockedHeroIds = this.equipmentManager.unlockedHeroes && this.equipmentManager.unlockedHeroes.length > 0
      ? this.equipmentManager.unlockedHeroes
      : ['kotaro'];

    unlockedHeroIds.forEach(heroId => {
      const base = this.equipmentManager.heroesBase[heroId];
      if (!base) return;

      const isSelected = (this.selectedHeroId === heroId);
      const prog = this.equipmentManager.getProgression(heroId);
      const totalUnspent = (prog.unspentStatPoints || 0) + (prog.unspentSkillPoints || 0);

      const portraitKey = base.axieId || heroId;
      const portraitUrl = portraitService.getPortraitSync(portraitKey) || portraitService.getPortraitSync(heroId);
      if (!portraitUrl) {
        portraitService.getPortrait(portraitKey);
      }

      const card = document.createElement('div');
      card.className = `inv-roster-card ${isSelected ? 'active' : ''}`;
      card.innerHTML = `
        <div class="inv-roster-avatar"><img class="inv-roster-avatar" src="${portraitUrl || ''}" alt="${base.name}" style="${portraitUrl ? '' : 'display: none;'}"></div>
        <div class="inv-roster-info">
          <div class="inv-roster-name-row">
            <span class="inv-roster-name">${base.name}</span>
            <span class="inv-roster-level-badge">Lv. ${prog.level}</span>
          </div>
          <div class="inv-roster-meta-row">
            <span class="inv-roster-role">${base.archetype}</span>
            ${totalUnspent > 0 ? `<span class="inv-roster-notify-badge" title="${prog.unspentStatPoints} stats, ${prog.unspentSkillPoints} skills available">⚡</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (this.audio && this.audio.playStep) this.audio.playStep();
        this.selectedHeroId = heroId;
        this._renderRoster();
        this._renderHeroDetails();
        this._renderBackpackItems();
      });

      container.appendChild(card);
    });
  }

  _renderHeroDetails() {
    this._hideTooltip();
    const base = this.equipmentManager.heroesBase[this.selectedHeroId];
    if (!base) return;

    const prog = this.equipmentManager.getProgression(this.selectedHeroId);
    const reqExp = this.equipmentManager.getRequiredExp(prog.level);
    const expPct = Math.min(100, Math.round((prog.currentExp / reqExp) * 100));

    // 1. Identity & Level / EXP Header
    document.getElementById('inv-hero-name').textContent = base.name;
    document.getElementById('inv-hero-archetype').textContent = base.archetype;
    document.getElementById('inv-hero-level-badge').textContent = `Lv. ${prog.level}`;
    document.getElementById('inv-hero-exp-fill').style.width = `${expPct}%`;
    document.getElementById('inv-hero-exp-text').textContent = `${prog.currentExp} / ${reqExp} EXP`;

    // 2. Subtab State Switcher
    const eqBtn = document.getElementById('inv-subtab-equipment');
    const skBtn = document.getElementById('inv-subtab-skills');
    const eqPane = document.getElementById('inv-view-equipment');
    const skPane = document.getElementById('inv-view-skills');
    const skillsTabDot = document.getElementById('inv-skills-tab-dot');

    if (prog.unspentSkillPoints > 0) {
      skillsTabDot.classList.remove('hidden');
    } else {
      skillsTabDot.classList.add('hidden');
    }

    if (this.activeHeroTab === 'equipment') {
      eqBtn.classList.add('active');
      skBtn.classList.remove('active');
      eqPane.classList.remove('hidden');
      skPane.classList.add('hidden');
      this._renderEquipmentTab(base, prog);
    } else {
      skBtn.classList.add('active');
      eqBtn.classList.remove('active');
      skPane.classList.remove('hidden');
      eqPane.classList.add('hidden');
      this._renderSkillsTab(base, prog);
    }
  }

  _renderEquipmentTab(base, prog) {
    // Render 5 Equipment Slots in Paper Doll Cross Formation
    const dollGrid = document.getElementById('inv-doll-grid');
    if (dollGrid) {
      dollGrid.innerHTML = '';

      const slotDefinitions = [
        { key: 'hat', label: 'Hat', icon: '👑' },
        { key: 'weapon', label: 'Weapon', icon: '⚔️' },
        { key: 'body', label: 'Armor', icon: '🥋' },
        { key: 'shield', label: 'Shield', icon: '🛡️' },
        { key: 'boots', label: 'Boots', icon: '🥾' }
      ];

      const equipped = this.equipmentManager.getEquipped(this.selectedHeroId) || {};

      slotDefinitions.forEach(slotDef => {
        const itemId = equipped[slotDef.key];
        const item = itemId ? ITEMS_DB[itemId] : null;

        const slotBox = document.createElement('div');
        slotBox.dataset.slot = slotDef.key;

        if (item) {
          // Equipped slot: displays ONLY the item icon/image
          const isImg = typeof item.icon === 'string' && (
            item.icon.startsWith('./') || item.icon.startsWith('/') || item.icon.includes('.png') || item.icon.startsWith('data:image')
          );
          slotBox.className = `inv-doll-slot has-item rarity-${item.rarity}`;
          slotBox.innerHTML = isImg 
            ? `<img class="inv-doll-item-icon" src="${item.icon}" alt="">` 
            : `<span class="inv-doll-item-emoji">${item.icon}</span>`;
          slotBox.title = ''; // Suppress browser default title tooltip

          // Hover: shows floating tooltip with item info
          slotBox.addEventListener('mouseenter', (e) => this._showTooltip(item, e));
          slotBox.addEventListener('mousemove', (e) => this._positionTooltip(e));
          slotBox.addEventListener('mouseleave', () => this._hideTooltip());

          // Click: immediately un-equips the item
          slotBox.addEventListener('click', (e) => {
            e.stopPropagation();
            this._hideTooltip();
            if (this.audio && this.audio.playStep) this.audio.playStep();
            this.equipmentManager.unequipItem(this.selectedHeroId, slotDef.key);
            this._renderHeroDetails();
            this._renderBackpackItems();
          });
        } else {
          // Empty slot: displays placeholder icon and label
          slotBox.className = 'inv-doll-slot empty';
          slotBox.innerHTML = `
            <span class="inv-doll-slot-icon">${slotDef.icon}</span>
            <span class="inv-doll-slot-label">${slotDef.label}</span>
          `;
        }

        dollGrid.appendChild(slotBox);
      });
    }

    // Render Stats Calculation Sheet with Allocation Buttons
    const stats = this.equipmentManager.getCalculatedStats(this.selectedHeroId);
    const statsList = document.getElementById('inv-stats-list');
    const statBadge = document.getElementById('inv-stat-points-badge');
    statsList.innerHTML = '';

    if (prog.unspentStatPoints > 0) {
      statBadge.textContent = `⚡ ${prog.unspentStatPoints} Points Available`;
      statBadge.classList.remove('hidden');
    } else {
      statBadge.classList.add('hidden');
    }

    // 1. Group Header: Attributes
    const attrHeader = document.createElement('div');
    attrHeader.className = 'inv-stat-group-title';
    attrHeader.innerHTML = `
      <span>✦ ATTRIBUTES</span>
      <span class="inv-stat-hint">3 pts / level</span>
    `;
    statsList.appendChild(attrHeader);

    // 4 Allocatable Attributes (Vitality, Ferocity, Agility, Essence)
    const elementalAttributes = [
      {
        key: 'vitality',
        label: 'Vitality',
        desc: '+1 HP',
        pts: stats.allocated.points.vitality || 0,
        bonusVal: `+${stats.allocated.vitality} HP`,
        allocText: '+1 HP'
      },
      {
        key: 'ferocity',
        label: 'Ferocity',
        desc: '+1.5 Melee · +1 Collision',
        pts: stats.allocated.points.ferocity || 0,
        bonusVal: `+${Number(stats.allocated.ferocity || 0).toFixed(1)} Melee`,
        allocText: '+1.5 Melee / +1 Collision'
      },
      {
        key: 'agility',
        label: 'Agility',
        desc: '+1.2 Ranged · +0.5% Crit',
        pts: stats.allocated.points.agility || 0,
        bonusVal: `+${Number(stats.allocated.agility || 0).toFixed(1)} Ranged`,
        allocText: '+1.2 Ranged / +0.5% Crit'
      },
      {
        key: 'essence',
        label: 'Essence',
        desc: '+1.2 Magic · +2% Support',
        pts: stats.allocated.points.essence || 0,
        bonusVal: `+${Number(stats.allocated.essence || 0).toFixed(1)} Magic`,
        allocText: '+1.2 Magic / +2% Support'
      }
    ];

    elementalAttributes.forEach(attr => {
      const rowEl = document.createElement('div');
      rowEl.className = 'inv-stat-row inv-attr-row';

      let allocateBtnHTML = '';
      if (prog.unspentStatPoints > 0) {
        allocateBtnHTML = `<button class="inv-stat-add-btn" data-stat="${attr.key}" title="Allocate 1 point (${attr.allocText})">+</button>`;
      }

      rowEl.innerHTML = `
        <div class="inv-stat-label-group">
          <span class="inv-stat-label">${attr.label}</span>
          <span class="inv-stat-hint-tag">${attr.desc}</span>
        </div>
        <div class="inv-stat-vals">
          <span class="inv-stat-alloc-pts">${attr.pts} pts</span>
          ${attr.pts > 0 ? `<span class="inv-stat-alloc-bonus">(${attr.bonusVal})</span>` : ''}
          ${allocateBtnHTML}
        </div>
      `;

      if (prog.unspentStatPoints > 0) {
        const addBtn = rowEl.querySelector('.inv-stat-add-btn');
        if (addBtn) {
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const ok = this.equipmentManager.allocateStatPoint(this.selectedHeroId, attr.key);
            if (ok) {
              if (this.audio && this.audio.playBuff) this.audio.playBuff();
              this._renderHeroDetails();
              this._renderRoster();
            }
          });
        }
      }

      statsList.appendChild(rowEl);
    });

    // 2. Group Header: Combat Stats & Gear
    const combatHeader = document.createElement('div');
    combatHeader.className = 'inv-stat-group-title';
    combatHeader.innerHTML = `
      <span>⚔️ COMBAT STATS</span>
      <span class="inv-stat-hint">Base & Gear</span>
    `;
    statsList.appendChild(combatHeader);

    // Combat Stats: AP, MP, Extra damage, Starting shield and Initiative
    const combatStats = [
      {
        label: 'Max HP',
        val: stats.maxHP,
        breakdown: [
          stats.levelBonuses.hp > 0 ? `<span class="inv-stat-level-bonus" title="Level Bonus (+2/lv)">+${stats.levelBonuses.hp} lv</span>` : '',
          stats.allocated.vitality > 0 ? `<span class="inv-stat-alloc-bonus" title="Vitality Bonus">+${stats.allocated.vitality} vit</span>` : '',
          stats.gear.hp > 0 ? `<span class="inv-stat-gear-bonus" title="Gear Bonus">+${stats.gear.hp} eq</span>` : ''
        ].filter(Boolean).join(' ')
      },
      {
        label: 'Initiative',
        val: stats.initiative,
        breakdown: [
          stats.levelBonuses.initiative > 0 ? `<span class="inv-stat-level-bonus" title="Level Bonus (+3/lv)">+${stats.levelBonuses.initiative} lv</span>` : '',
          stats.gear.initiative > 0 ? `<span class="inv-stat-gear-bonus" title="Gear Bonus">+${stats.gear.initiative} eq</span>` : ''
        ].filter(Boolean).join(' ')
      },
      {
        label: 'Extra Damage',
        val: `+${stats.bonusDamage}`,
        breakdown: stats.gear.damage > 0 ? `<span class="inv-stat-gear-bonus" title="Gear Bonus">+${stats.gear.damage} eq</span>` : ''
      },
      {
        label: 'Starting Shield',
        val: `+${stats.initialShield}`,
        breakdown: stats.gear.shield > 0 ? `<span class="inv-stat-gear-bonus" title="Gear Bonus">+${stats.gear.shield} eq</span>` : ''
      },
      {
        label: 'Action (AP)',
        val: stats.maxPA,
        breakdown: stats.gear.pa > 0 ? `<span class="inv-stat-gear-bonus" title="Gear Bonus">+${stats.gear.pa} eq</span>` : ''
      },
      {
        label: 'Movement (MP)',
        val: stats.maxPM,
        breakdown: stats.gear.pm > 0 ? `<span class="inv-stat-gear-bonus" title="Gear Bonus">+${stats.gear.pm} eq</span>` : ''
      },
      {
        label: 'Crit Chance',
        val: `${stats.critRate}%`,
        breakdown: stats.allocated.critRate > 0 ? `<span class="inv-stat-alloc-bonus" title="Agility Bonus">+${stats.allocated.critRate}% agi</span>` : ''
      },
      {
        label: 'Support / Heal',
        val: `+${stats.supportPower}%`,
        breakdown: stats.allocated.supportPower > 0 ? `<span class="inv-stat-alloc-bonus" title="Essence Bonus">+${stats.allocated.supportPower}% ess</span>` : ''
      }
    ];

    const combatGrid = document.createElement('div');
    combatGrid.className = 'inv-combat-grid';

    combatStats.forEach(cs => {
      const itemEl = document.createElement('div');
      itemEl.className = 'inv-combat-stat-item';
      itemEl.innerHTML = `
        <div class="inv-combat-stat-top">
          <span class="inv-combat-stat-label">${cs.label}</span>
          <span class="inv-combat-stat-val">${cs.val}</span>
        </div>
        ${cs.breakdown ? `<div class="inv-combat-stat-breakdown">${cs.breakdown}</div>` : ''}
      `;
      combatGrid.appendChild(itemEl);
    });

    statsList.appendChild(combatGrid);
  }

  _renderSkillsTab(base, prog) {
    const skillsList = document.getElementById('inv-skills-list');
    const skillBadge = document.getElementById('inv-skill-points-badge');
    skillsList.innerHTML = '';

    if (prog.unspentSkillPoints > 0) {
      skillBadge.textContent = `✨ ${prog.unspentSkillPoints} Skill Points`;
      skillBadge.classList.remove('hidden');
    } else {
      skillBadge.classList.add('hidden');
    }

    const spellIds = (this.selectedHeroId === 'kotaro'
      ? (base.spellIds || getHeroSpells(base.heroKey || base.axieId))
      : HERO_SPELLS[this.selectedHeroId]) || [];
    const multipliers = [1.0, 1.0, 1.20, 1.40, 1.60, 1.85];

    spellIds.forEach(spellId => {
      const spell = SPELLS_DB[spellId];
      if (!spell) return;

      const currentLvl = this.equipmentManager.getSkillLevel(this.selectedHeroId, spellId);
      const currentMult = multipliers[Math.min(5, Math.max(1, currentLvl))];
      const nextMult = currentLvl < 5 ? multipliers[currentLvl + 1] : null;

      // Render 5 pip indicators
      let pipsHTML = '';
      for (let i = 1; i <= 5; i++) {
        pipsHTML += `<span class="inv-skill-pip ${i <= currentLvl ? 'active' : ''}"></span>`;
      }

      // Scaling preview text
      let scalingText = `Effectiveness: x${currentMult.toFixed(2)}`;
      if (currentLvl < 5 && nextMult) {
        const diffPercent = Math.round((nextMult - currentMult) * 100);
        scalingText += ` ➔ Next Level: x${nextMult.toFixed(2)} (+${diffPercent}% effectiveness)`;
      } else {
        scalingText += ` (Maximum mastery reached)`;
      }

      // Upgrade Action Cost
      const cost = currentLvl; // Nv 1->2: 1 pt, Nv 2->3: 2 pts, Nv 3->4: 3 pts, Nv 4->5: 4 pts
      const canAfford = (prog.unspentSkillPoints >= cost);

      let actionHTML = '';
      if (currentLvl >= 5) {
        actionHTML = `<span class="inv-skill-status-tag max">⭐ MAX LEVEL</span>`;
      } else if (canAfford) {
        actionHTML = `<button class="inv-skill-upgrade-btn" data-spell="${spellId}">+ Upgrade to Lv. ${currentLvl + 1} (${cost} ${cost === 1 ? 'Pt' : 'Pts'})</button>`;
      } else {
        actionHTML = `<span class="inv-skill-status-tag locked">Requires ${cost} Skill ${cost === 1 ? 'Point' : 'Points'} (${prog.unspentSkillPoints}/${cost})</span>`;
      }

      const card = document.createElement('div');
      card.className = 'inv-skill-card';
      card.innerHTML = `
        <div class="inv-skill-card-top">
          <div class="inv-skill-title-group">
            <span class="inv-skill-icon">${(spell.icon && (spell.icon.includes('/') || spell.icon.endsWith('.png'))) ? `<img src="${spell.icon}" alt="${spell.name}" style="width: 26px; height: 26px; object-fit: contain; vertical-align: middle; border-radius: 4px;">` : spell.icon}</span>
            <div>
              <span class="inv-skill-name">${spell.name}</span>
              <div class="inv-skill-cost-row">
                <span class="inv-skill-pa">${spell.paCost} AP</span>
                <span class="inv-skill-range">Range ${spell.minRange}-${spell.maxRange}</span>
              </div>
            </div>
          </div>
          <div class="inv-skill-level-block">
            <span class="inv-skill-level-text">Lv. ${currentLvl} / 5</span>
            <div class="inv-skill-pips">${pipsHTML}</div>
          </div>
        </div>

        <p class="inv-skill-desc">${spell.description}</p>
        
        <div class="inv-skill-scaling-box">
          <span class="inv-skill-scaling-label">MASTERY SCALING:</span>
          <span class="inv-skill-scaling-val">${scalingText}</span>
        </div>

        <div class="inv-skill-action-row">
          ${actionHTML}
        </div>
      `;

      if (currentLvl < 5 && canAfford) {
        const upBtn = card.querySelector('.inv-skill-upgrade-btn');
        if (upBtn) {
          upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const ok = this.equipmentManager.upgradeSkill(this.selectedHeroId, spellId);
            if (ok) {
              if (this.audio && this.audio.playBuff) this.audio.playBuff();
              this._renderHeroDetails();
              this._renderRoster();
            }
          });
        }
      }

      skillsList.appendChild(card);
    });
  }

  _renderBackpackItems() {
    const container = document.getElementById('inv-items-grid');
    if (!container) return;
    container.innerHTML = '';

    const inv = this.equipmentManager.inventory || [];
    const countEl = document.getElementById('inv-items-count');
    if (countEl) {
      countEl.textContent = `${inv.length} item${inv.length !== 1 ? 's' : ''}`;
    }

    // Filter items by slot category: Armas, Equipo (Sombrero, Armadura, Botas), Escudo, Consumibles, Objetos de Misión
    const filteredItemIds = inv.filter(itemId => {
      const item = ITEMS_DB[itemId];
      if (!item) return false;
      if (this.activeCategoryFilter === 'all') return true;
      if (this.activeCategoryFilter === 'weapon') {
        return item.slot === 'weapon' || item.category === 'weapon';
      }
      if (this.activeCategoryFilter === 'equipment') {
        return ['hat', 'body', 'boots', 'equipment'].includes(item.slot) || item.category === 'equipment' || item.category === 'gear';
      }
      if (this.activeCategoryFilter === 'shield') {
        return item.slot === 'shield' || item.category === 'shield';
      }
      if (this.activeCategoryFilter === 'consumable') {
        return item.slot === 'consumable' || item.category === 'consumable' || item.type === 'consumable';
      }
      if (this.activeCategoryFilter === 'quest') {
        return item.slot === 'quest' || item.category === 'quest' || item.type === 'quest';
      }
      return item.slot === this.activeCategoryFilter;
    });

    if (inv.length === 0) {
      container.innerHTML = `
        <div class="inv-empty-backpack">
          <div class="inv-empty-icon">🎒</div>
          <div class="inv-empty-title">Empty Backpack</div>
          <div class="inv-empty-desc">You have no items in your inventory. Complete quests or defeat chimeras to obtain gear and supplies.</div>
        </div>
      `;
      return;
    }

    if (filteredItemIds.length === 0) {
      container.innerHTML = `
        <div class="inv-empty-backpack">
          <div class="inv-empty-icon">🔍</div>
          <div class="inv-empty-title">No items in this category</div>
          <div class="inv-empty-desc">You have no items matching this filter. Select "All" to view the full inventory.</div>
        </div>
      `;
      return;
    }

    const activeHero = this.equipmentManager.heroesBase[this.selectedHeroId];
    const heroName = activeHero ? activeHero.name : 'Axie';
    const isTutorialActive = this._isTutorialEquipActive();
    const isTargetEquipped = isTutorialActive && this._isTargetItemEquipped();

    if (isTutorialActive) {
      const hintEl = document.createElement('div');
      hintEl.className = `inv-tutorial-hint ${isTargetEquipped ? 'success' : ''}`;
      hintEl.innerHTML = isTargetEquipped
        ? `<span>✅</span><span><b>Sword equipped successfully!</b> Press <kbd>[I]</kbd>, <kbd>[Escape]</kbd> or click <kbd>[✕]</kbd> to close the inventory.</span>`
        : `<span>🗡️</span><span><b>Master Paladill's Quest:</b> Click on the <b>Wooden Sword</b> to equip it to ${heroName}.</span>`;
      container.appendChild(hintEl);
    }

    filteredItemIds.forEach(itemId => {
      const item = ITEMS_DB[itemId];
      if (!item) return;

      const isConsumable = (item.slot === 'consumable' || item.category === 'consumable' || item.type === 'consumable');
      const isQuest = (item.slot === 'quest' || item.category === 'quest' || item.type === 'quest');

      const isTutorialHighlight = isTutorialActive && !isTargetEquipped && itemId === this.tutorialTargetItemId;
      const card = document.createElement('div');
      card.className = `inv-item-card rarity-${item.rarity || 'common'} ${isConsumable ? 'item-consumable' : ''} ${isQuest ? 'item-quest' : ''} ${isTutorialHighlight ? 'tutorial-spotlight-sword' : ''}`;

      const isImageIcon = typeof item.icon === 'string' && (
        item.icon.startsWith('./') ||
        item.icon.startsWith('/') ||
        item.icon.startsWith('assets/') ||
        item.icon.startsWith('http') ||
        item.icon.startsWith('data:image') ||
        /\.(png|jpg|jpeg|webp|svg)$/i.test(item.icon)
      );

      const iconHTML = isImageIcon
        ? `<img class="inv-card-icon" src="${item.icon}" alt="${item.name}">`
        : `<span class="inv-card-icon-emoji">${item.icon || (isConsumable ? '🧪' : (isQuest ? '📜' : '📦'))}</span>`;

      const slotLabels = {
        weapon: 'WEAPON',
        hat: 'HAT',
        shield: 'SHIELD',
        body: 'ARMOR',
        boots: 'BOOTS',
        equipment: 'GEAR',
        consumable: 'CONSUMABLE',
        quest: 'QUEST ITEM'
      };

      const slotName = isConsumable
        ? 'CONSUMABLE'
        : (isQuest ? 'QUEST ITEM' : (slotLabels[item.slot] || (item.slot ? item.slot.toUpperCase() : 'GEAR')));
      const slotClass = isConsumable
        ? 'consumable'
        : (isQuest ? 'quest' : (['hat', 'body', 'boots', 'equipment'].includes(item.slot) ? 'equipment' : item.slot));

      let benefitsHTML = '';
      if (isConsumable) {
        let effHTML = '';
        if (item.effect?.heal) effHTML += `<span class="inv-stat-pill pill-hp">💚 +${item.effect.heal} HP</span>`;
        if (item.effect?.pa) effHTML += `<span class="inv-stat-pill pill-pa">⚡ +${item.effect.pa} AP</span>`;
        if (item.effect?.pm) effHTML += `<span class="inv-stat-pill pill-pm">👟 +${item.effect.pm} MP</span>`;
        if (item.effect?.shield) effHTML += `<span class="inv-stat-pill pill-shield">🛡️ +${item.effect.shield} Shield</span>`;
        benefitsHTML = `
          <div class="inv-card-stats-row">
            <span class="inv-benefits-label">EFFECT ON USE:</span>
            <div class="inv-benefits-pills">${effHTML || '<span class="inv-stat-pill pill-hp">Consumable</span>'}</div>
          </div>
        `;
      } else if (isQuest) {
        benefitsHTML = `
          <div class="inv-card-stats-row">
            <span class="inv-benefits-label">ITEM TYPE:</span>
            <div class="inv-benefits-pills">
              <span class="inv-stat-pill pill-quest">📜 Quest Key Item</span>
            </div>
          </div>
        `;
      } else {
        // Equipment stat badges
        let statsHTML = '';
        if (item.stats?.damage) statsHTML += `<span class="inv-stat-pill pill-dmg">+${item.stats.damage} Damage</span>`;
        if (item.stats?.hp) statsHTML += `<span class="inv-stat-pill pill-hp">+${item.stats.hp} HP</span>`;
        if (item.stats?.pa) statsHTML += `<span class="inv-stat-pill pill-pa">+${item.stats.pa} AP</span>`;
        if (item.stats?.pm) statsHTML += `<span class="inv-stat-pill pill-pm">+${item.stats.pm} MP</span>`;
        if (item.stats?.shield) statsHTML += `<span class="inv-stat-pill pill-shield">+${item.stats.shield} Shield</span>`;
        if (item.stats?.initiative) statsHTML += `<span class="inv-stat-pill pill-init">+${item.stats.initiative} Init</span>`;

        benefitsHTML = `
          <div class="inv-card-stats-row">
            <span class="inv-benefits-label">BENEFITS:</span>
            <div class="inv-benefits-pills">${statsHTML || '<span class="inv-stat-pill">No stats</span>'}</div>
          </div>
        `;
      }

      let actionHTML = '';
      if (isConsumable) {
        actionHTML = `<button class="inv-use-btn">🧪 Use on ${heroName}</button>`;
      } else if (isQuest) {
        actionHTML = `<div class="inv-quest-badge-btn">📜 Key Quest Item</div>`;
      } else {
        actionHTML = `
          <button class="inv-equip-btn ${isTutorialHighlight ? 'btn-pulse' : ''}">⚔️ Equip to ${heroName}</button>
          ${isTutorialHighlight ? `<div class="inv-tutorial-sword-banner">✨ CLICK HERE TO EQUIP!</div>` : ''}
        `;
      }

      card.innerHTML = `
        <div class="inv-card-header">
          <div class="inv-card-title-group">
            ${iconHTML}
            <span class="inv-card-name">${item.name}</span>
          </div>
          <div class="inv-card-tags">
            <span class="inv-slot-badge ${slotClass}">${slotName}</span>
            <span class="inv-rarity-badge ${item.rarity || 'common'}">${(item.rarity || 'common').toUpperCase()}</span>
          </div>
        </div>

        <!-- Description (Lore and functionality) -->
        <div class="inv-card-desc">${item.description || ''}</div>

        <!-- Stat Benefits or Effect -->
        ${benefitsHTML}

        <!-- Action Button -->
        <div class="inv-card-action">
          ${actionHTML}
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (isConsumable) {
          e.stopPropagation();
          this._useConsumable(item);
          return;
        }
        if (isQuest) {
          e.stopPropagation();
          if (this.audio && this.audio.playStep) this.audio.playStep();
          this._showToast(`📜 ${item.name}: Stored in your backpack for active quests.`);
          return;
        }

        // Equipment click
        if (this.audio && this.audio.playBuff) this.audio.playBuff();
        this.equipmentManager.equipItem(this.selectedHeroId, item.slot, item.id);
        if (this.onItemEquipped) {
          this.onItemEquipped(this.selectedHeroId, item.slot, item.id);
        }
        if (this.isTutorialEquipLocked && item.id === this.tutorialTargetItemId) {
          this.isTutorialEquipLocked = false;
          this.tutorialTargetItemId = null;
        }
        this._renderHeroDetails();
        this._renderBackpackItems();
      });

      container.appendChild(card);
    });
  }

  _useConsumable(item) {
    if (!item || !this.equipmentManager) return;
    const heroId = this.selectedHeroId;
    const heroBase = this.equipmentManager.heroesBase[heroId];
    const heroName = heroBase ? heroBase.name : 'Hero';
    const stats = this.equipmentManager.getCalculatedStats(heroId);
    const maxHP = stats ? stats.maxHP : 300;
    const currentHP = this.equipmentManager.getCurrentHP(heroId);

    let used = false;
    let message = '';

    if (item.effect && item.effect.heal) {
      const healAmt = item.effect.heal;
      const newHP = Math.min(maxHP, currentHP + healAmt);
      const actualHealed = newHP - currentHP;
      this.equipmentManager.setCurrentHP(heroId, newHP);
      used = true;
      message = actualHealed > 0 
        ? `💚 ${heroName} drank ${item.name} and recovered +${actualHealed} HP! (${newHP}/${maxHP})`
        : `✨ ${heroName} used ${item.name} (health already at 100%).`;
    } else if (item.effect && (item.effect.pa || item.effect.pm || item.effect.shield)) {
      used = true;
      message = `✨ Effect of ${item.name} activated on ${heroName}!`;
    } else {
      used = true;
      message = `✨ ${heroName} used ${item.name}.`;
    }

    if (used) {
      const idx = this.equipmentManager.inventory.indexOf(item.id);
      if (idx !== -1) {
        this.equipmentManager.inventory.splice(idx, 1);
      }

      if (this.audio && typeof this.audio.playBuff === 'function') {
        this.audio.playBuff();
      }

      this._showToast(message);
      this._renderHeroDetails();
      this._renderBackpackItems();
    }
  }

  _showToast(msg) {
    let toast = document.getElementById('inv-toast-msg');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'inv-toast-msg';
      toast.className = 'inv-toast-msg';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }
}
