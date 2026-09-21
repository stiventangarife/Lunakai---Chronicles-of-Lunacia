// StartScreenUI.js - Title & Save Slots Screen with 3-Hero Axie Selection
import { saveSlotManager, HERO_ROSTER } from '../SaveSlotManager.js';
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

export class StartScreenUI {
  constructor(options = {}) {
    this.audio = options.audio || null;
    this.onStartAdventure = options.onStartAdventure || (() => {});

    this.container = null;
    this.heroSelectModal = null;
    this.confirmModal = null;
    this.pendingSlotId = null;

    this.isOpen = true;
    this._createDOM();
    this.refreshSlots();

    // Listen to portrait service updates to refresh slot and hero avatars in real time
    portraitService.addListener(() => {
      if (this.isOpen) {
        this.refreshSlots();
        this._renderHeroRoster();
      }
    });
  }

  _createDOM() {
    // 1. Root Screen Container
    const root = document.createElement('div');
    root.id = 'start-screen-overlay';
    root.className = 'start-screen-overlay';
    root.innerHTML = `
      <div class="start-screen-backdrop"></div>
      <div class="start-screen-content">
        <header class="start-screen-header">
          <div class="game-logo-wrapper">
            <img src="./assets/lunakai_logo.jpg" alt="Lunakai: Chronicles of Lunacia" class="game-logo-img">
          </div>
          <p class="game-tagline">Choose your Lunakai Hero, explore Dojo Valley, and become a legend.</p>
        </header>

        <main class="start-slots-section">
          <div class="slots-header">
            <span class="slots-title">ADVENTURE SLOTS</span>
            <span class="slots-hint">Select a save to continue or create a new one</span>
          </div>

          <div id="start-slots-grid" class="start-slots-grid">
            <!-- Rendered dynamically by refreshSlots() -->
          </div>
        </main>

        <footer class="start-screen-footer">
          <div class="footer-info">
            <span class="footer-version">v1.2.0 • 3D Mixer & Toon Outline Engine</span>
            <span class="footer-badge">Lunakai Ecosystem</span>
          </div>
        </footer>
      </div>
    `;

    document.body.appendChild(root);
    this.container = root;

    // 2. Hero Selection Modal
    const heroModal = document.createElement('div');
    heroModal.id = 'hero-select-modal';
    heroModal.className = 'hero-select-modal hidden';
    heroModal.innerHTML = `
      <div class="hero-select-backdrop"></div>
      <div class="hero-select-container">
        <header class="hero-select-header">
          <div class="hero-select-logo-wrapper">
            <img src="./assets/lunakai_logo.jpg" alt="Lunakai: Chronicles of Lunacia" class="hero-select-logo-img">
          </div>
          <span class="hero-select-badge">NEW ADVENTURE</span>
          <h2 class="hero-select-title">CHOOSE YOUR LUNAKAI HERO</h2>
          <p class="hero-select-desc">
            Select the leader of your squad. 
            <strong>Bing</strong> (Bird Marksman) and <strong>Pomodoro</strong> (Plant Healer) will join you as combat support.
          </p>
          <button id="btn-close-hero-select" class="hero-select-close-btn" title="Close">✕</button>
        </header>

        <div id="hero-roster-grid" class="hero-roster-grid"></div>
      </div>
    `;
    document.body.appendChild(heroModal);
    this.heroSelectModal = heroModal;
    this._renderHeroRoster();

    // 3. Confirm Delete Dialog
    const confirmModal = document.createElement('div');
    confirmModal.id = 'confirm-delete-modal';
    confirmModal.className = 'start-confirm-modal hidden';
    confirmModal.innerHTML = `
      <div class="start-confirm-backdrop"></div>
      <div class="start-confirm-box">
        <div class="confirm-icon">⚠️</div>
        <h3 class="confirm-title">Delete Save?</h3>
        <p id="confirm-msg" class="confirm-msg">Are you sure you want to delete this adventure? All progress will be lost.</p>
        <div class="confirm-actions">
          <button id="btn-confirm-cancel" class="btn-secondary">Cancel</button>
          <button id="btn-confirm-delete" class="btn-danger">Yes, Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmModal);
    this.confirmModal = confirmModal;

    this._setupEventListeners();
  }

  _setupEventListeners() {
    // Close hero select modal
    const closeBtn = document.getElementById('btn-close-hero-select');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeHeroSelect());
    }

    // Hero select cards clicks
    this.heroSelectModal.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-select-hero') || e.target.closest('.hero-card');
      if (btn && this.pendingSlotId) {
        const heroKey = btn.dataset.heroKey || btn.getAttribute('data-hero-key');
        const heroTemplate = HERO_ROSTER.find(h => h.heroKey === heroKey);
        if (heroTemplate) {
          this._createSlotAndStart(this.pendingSlotId, heroTemplate);
        }
      }
    });

    // Confirmation delete buttons
    const cancelDeleteBtn = document.getElementById('btn-confirm-cancel');
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        this.confirmModal.classList.add('hidden');
      });
    }

    const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        if (this._slotToDelete) {
          saveSlotManager.deleteSlot(this._slotToDelete);
          this._slotToDelete = null;
          this.confirmModal.classList.add('hidden');
          this.refreshSlots();
          if (this.audio && typeof this.audio.playCollision === 'function') {
            this.audio.playCollision();
          }
        }
      });
    }
  }

  refreshSlots() {
    const grid = document.getElementById('start-slots-grid');
    if (!grid) return;

    const slots = saveSlotManager.getSlots();
    grid.innerHTML = '';

    slots.forEach(slotInfo => {
      const card = document.createElement('div');
      card.className = `slot-card ${slotInfo.data ? 'slot-occupied' : 'slot-empty'}`;
      card.dataset.slotId = slotInfo.id;

      if (!slotInfo.data) {
        // Empty Slot Card
        card.innerHTML = `
          <div class="slot-badge">SLOT #${slotInfo.id}</div>
          <div class="empty-slot-content">
            <div class="empty-icon-ring">
              <span class="empty-plus-icon">+</span>
            </div>
            <h4 class="empty-slot-title">New Adventure</h4>
            <p class="empty-slot-sub">Start a game by selecting your Lunakai Hero</p>
            <button class="btn-slot-create" data-slot-id="${slotInfo.id}">
              ✨ Create Adventure
            </button>
          </div>
        `;
        const createBtn = card.querySelector('.btn-slot-create');
        card.addEventListener('click', () => {
          this._openHeroSelectForSlot(slotInfo.id);
        });
      } else {
        // Occupied Slot Card
        const data = slotInfo.data;
        const hero = data.hero || {};
        const savedDate = new Date(data.lastSaved || data.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Check if portraitService has a cached 2D portrait for this specific hero
        const cachedPortrait = portraitService.getPortraitSync(hero.axieId)
          || (hero.heroKey && portraitService.getPortraitSync(hero.heroKey))
          || (hero.name && portraitService.getPortraitSync(hero.name.toLowerCase().replace(/\s+/g, '-')))
          || hero.image
          || null;

        card.innerHTML = `
          <div class="slot-header-row">
            <span class="slot-badge">SLOT #${slotInfo.id}</span>
            <span class="slot-saved-date">${savedDate}</span>
          </div>

          <div class="slot-hero-preview">
            <div class="slot-avatar-frame">
              ${cachedPortrait ? `
                <img src="${cachedPortrait}" alt="${hero.name}" class="slot-hero-img">
              ` : `
                <div class="hero-crest crest-${(hero.class || 'beast').toLowerCase()} slot-crest">
                  <span class="crest-emoji">${hero.avatar || '⚔️'}</span>
                </div>
              `}
            </div>
            <div class="slot-hero-info">
              <h4 class="slot-hero-name">${hero.name || 'Lunakai Hero'}</h4>
              <div class="slot-hero-archetype">
                <img class="slot-class-icon" src="${getAxieClassIcon(hero.class || hero.heroKey || hero.archetype)}" alt="" title="Class: ${hero.class || 'Axie'}">
                <span>${hero.archetype || hero.class || 'Beast'}</span>
              </div>
              <div class="slot-level-zone">
                <span class="slot-level-badge">Lv. ${data.level || 1}</span>
                <span class="slot-zone-name">📍 ${data.zone?.name || 'Dojo Valley'}</span>
              </div>
            </div>
          </div>

          <div class="slot-actions-row">
            <button class="btn-slot-play" data-slot-id="${slotInfo.id}">
              ▶ PLAY
            </button>
            <button class="btn-slot-delete" data-slot-id="${slotInfo.id}" title="Delete save">
              🗑️
            </button>
          </div>
        `;

        const playBtn = card.querySelector('.btn-slot-play');
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._playSlot(slotInfo.id);
        });

        const deleteBtn = card.querySelector('.btn-slot-delete');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._confirmDeleteSlot(slotInfo.id, hero.name);
        });

        card.addEventListener('click', () => {
          this._playSlot(slotInfo.id);
        });
      }

      grid.appendChild(card);
    });
  }

  _renderHeroRoster() {
    const container = document.getElementById('hero-roster-grid');
    if (!container) return;

    container.innerHTML = HERO_ROSTER.map(hero => {
      const portrait = portraitService.getPortraitSync(hero.axieId)
        || (hero.heroKey && portraitService.getPortraitSync(hero.heroKey))
        || hero.image;
      return `
        <div class="hero-card" data-hero-key="${hero.heroKey}">
          <div class="hero-card-badge-row">
            <img class="hero-class-icon" src="${getAxieClassIcon(hero.class)}" alt="${hero.class}" title="Class: ${hero.class}">
            <span class="hero-axie-id">#${hero.axieId}</span>
          </div>
          <div class="hero-card-avatar-wrapper">
            ${portrait ? `
              <img src="${portrait}" alt="${hero.name}" class="hero-preview-img">
            ` : `
              <div class="hero-crest crest-${hero.class.toLowerCase()}">
                <span class="crest-emoji">${hero.avatar}</span>
              </div>
            `}
          </div>
          <h3 class="hero-card-name">${hero.name}</h3>
          <div class="hero-card-archetype">${hero.archetype}</div>
          <p class="hero-card-lore">${hero.description}</p>
          
          <div class="hero-card-stats">
            <div class="hero-stat-item">
              <span class="stat-label">❤️ HP</span>
              <span class="stat-val val-hp">${hero.baseHP}</span>
            </div>
            <div class="hero-stat-item">
              <span class="stat-label">⭐ AP</span>
              <span class="stat-val val-pa">${hero.basePA}</span>
            </div>
            <div class="hero-stat-item">
              <span class="stat-label">👟 MP</span>
              <span class="stat-val val-pm">${hero.basePM}</span>
            </div>
            <div class="hero-stat-item">
              <span class="stat-label">⚡ INIT</span>
              <span class="stat-val val-init">${hero.baseInitiative}</span>
            </div>
          </div>

          <div class="hero-card-skills">
            <div class="skills-heading">Starting Skills:</div>
            <ul class="skills-list">
              ${hero.skills.map(s => `
                <li style="display: flex; align-items: center; gap: 6px;">
                  ${s.icon ? `<img src="${s.icon}" alt="${s.name}" style="width: 18px; height: 18px; object-fit: contain; border-radius: 4px; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.5);">` : ''}
                  <span><strong>${s.name}</strong> <span class="cost">${s.cost}</span>: ${s.desc}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <button class="btn-select-hero" data-hero-key="${hero.heroKey}">
            Select ${hero.name}
          </button>
        </div>
      `;
    }).join('');
  }

  _openHeroSelectForSlot(slotId) {
    if (this.audio && typeof this.audio.playSelect === 'function') {
      this.audio.playSelect();
    }
    this.pendingSlotId = slotId;
    this._renderHeroRoster();
    this.heroSelectModal.classList.remove('hidden');
    this.heroSelectModal.style.display = 'flex';
  }

  closeHeroSelect() {
    this.heroSelectModal.classList.add('hidden');
    this.heroSelectModal.style.display = 'none';
    this.pendingSlotId = null;
  }

  _createSlotAndStart(slotId, heroTemplate) {
    if (this.audio && typeof this.audio.playConfirm === 'function') {
      this.audio.playConfirm();
    }
    const newSlot = saveSlotManager.createSlot(slotId, heroTemplate);
    this.closeHeroSelect();
    this.refreshSlots();
    this._launchGameWithSlot(newSlot, true);
  }

  _playSlot(slotId) {
    const slot = saveSlotManager.getSlot(slotId);
    if (!slot) return;

    if (this.audio && typeof this.audio.playConfirm === 'function') {
      this.audio.playConfirm();
    }
    saveSlotManager.setActiveSlotId(slotId);
    this._launchGameWithSlot(slot, false);
  }

  _confirmDeleteSlot(slotId, heroName = 'this adventure') {
    this._slotToDelete = slotId;
    const msg = document.getElementById('confirm-msg');
    if (msg) {
      msg.textContent = `Are you sure you want to delete save slot #${slotId} (${heroName})? All progress will be lost.`;
    }
    this.confirmModal.classList.remove('hidden');
  }

  _launchGameWithSlot(slotData, isNewGame = false) {
    // Smooth transition fade-out
    this.container.classList.add('fade-out');
    setTimeout(() => {
      this.container.classList.add('hidden');
      this.isOpen = false;
      if (typeof this.onStartAdventure === 'function') {
        this.onStartAdventure(slotData, isNewGame);
      }
    }, 600);
  }

  show() {
    this.refreshSlots();
    this.container.classList.remove('hidden');
    this.container.classList.remove('fade-out');
    this.container.style.display = 'flex';
    this.isOpen = true;
  }

  hide() {
    this.container.classList.add('hidden');
    this.container.style.display = 'none';
    this.isOpen = false;
  }
}
