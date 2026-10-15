// StartScreenUI.js - Title & Save Slots Screen with Sapidae Customization & Companion Axie Selection
import { saveSlotManager, HERO_ROSTER, SAPIDAE_CLASSES } from '../SaveSlotManager.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import {
  HORN_STYLES,
  HORN_COLORS,
  EYE_SHAPES,
  PUPIL_COLORS,
  HAIR_STYLES,
  HAIR_COLORS,
  SUIT_COLORS
} from '../SapidaeModularController.js';
import { CharacterPreviewDiorama } from './CharacterPreviewDiorama.js';

export const RANDOM_NAMES = [
  'Ema', 'Lunara', 'Vael', 'Kaelen', 'Zephyr', 'Solis', 'Nyx', 'Astrid',
  'Tatsumi', 'Sylas', 'Orion', 'Caelum', 'Lyra', 'Mira', 'Riven', 'Thorne',
  'Aeron', 'Kael', 'Finn', 'Elowen', 'Bryn', 'Kaelis'
];

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

export const CLASS_PORTRAITS = {
  crafter: './assets/classes/class_forjacubiles.jpg',
  shepard: './assets/classes/class_susurrador.jpg',
  lunalogist: './assets/classes/class_lunalogista.jpg',
  stargazer: './assets/classes/class_astromante.jpg'
};

export const AXIE_BODY_PARTS = [
  { id: 'eyes', name: 'Eyes', icon: './assets/parts/beast-eyes.png' },
  { id: 'ears', name: 'Ears', icon: './assets/parts/beast-ears.png' },
  { id: 'mouth', name: 'Mouth', icon: './assets/parts/beast-mouth.png' },
  { id: 'horn', name: 'Horn', icon: './assets/parts/beast-horn.png' },
  { id: 'back', name: 'Back', icon: './assets/parts/beast-back.png' },
  { id: 'tail', name: 'Tail', icon: './assets/parts/beast-tail.png' }
];

export const AXIE_BODY_PARTS_MAP = {
  eyes: { name: 'Eyes', icon: './assets/parts/beast-eyes.png' },
  ears: { name: 'Ears', icon: './assets/parts/beast-ears.png' },
  mouth: { name: 'Mouth', icon: './assets/parts/beast-mouth.png' },
  horn: { name: 'Horn', icon: './assets/parts/beast-horn.png' },
  back: { name: 'Back', icon: './assets/parts/beast-back.png' },
  tail: { name: 'Tail', icon: './assets/parts/beast-tail.png' }
};

export const ITEM_ICONS = {
  hair: {
    braids: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="22" r="13" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <path d="M12 21C12 14.5 17 10 24 10C31 10 36 14.5 36 21C34 19 30 17 24 17C18 17 14 19 12 21Z" fill="#fbbf24"/>
        <path d="M18 10C22 14 26 15 32 16" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
        <path d="M14 21C11 25 10 30 11 36C12 37 14 37 14 35C14 33 13 28 15 24Z" fill="#fbbf24"/>
        <circle cx="11.5" cy="28" r="3" fill="#f59e0b"/>
        <circle cx="12" cy="33" r="2.5" fill="#f59e0b"/>
        <rect x="9.5" y="34" width="4" height="2" rx="1" fill="#ef4444"/>
        <path d="M34 21C37 25 38 30 37 36C36 37 34 37 34 35C34 33 35 28 33 24Z" fill="#fbbf24"/>
        <circle cx="36.5" cy="28" r="3" fill="#f59e0b"/>
        <circle cx="36" cy="33" r="2.5" fill="#f59e0b"/>
        <rect x="34.5" y="34" width="4" height="2" rx="1" fill="#ef4444"/>
      </svg>
    `,
    short: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="23" r="13" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <path d="M11 22C11 13 16 9 24 9C32 9 37 13 37 22C35 21 34 18 31 18C28 18 27 20 23 18C19 16 16 19 11 22Z" fill="#fbbf24"/>
        <path d="M11 22L13 27L16 23L19 28L23 21L27 27L31 21L35 26L37 21" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 12C21 10 28 11 31 15" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    bun: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="25" r="12" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <circle cx="24" cy="11" r="7" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/>
        <path d="M21 9C23 7 26 7 27 9" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>
        <line x1="16" y1="14" x2="32" y2="8" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="32" cy="8" r="2" fill="#facc15"/>
        <path d="M12 24C12 17 18 14 24 14C30 14 36 17 36 24C33 21 29 20 24 20C19 20 15 21 12 24Z" fill="#fbbf24"/>
      </svg>
    `,
    long: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 22C10 28 10 36 13 41C15 42 17 40 16 35C15 30 15 25 15 22Z" fill="#d97706"/>
        <path d="M37 22C38 28 38 36 35 41C33 42 31 40 32 35C33 30 33 25 33 22Z" fill="#d97706"/>
        <circle cx="24" cy="22" r="12" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <path d="M12 20C12 13 17 9 24 9C31 9 36 13 36 20C34 18 29 16 24 16C19 16 14 18 12 20Z" fill="#fbbf24"/>
        <path d="M13 20C13 25 14 31 16 36" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
        <path d="M35 20C35 25 34 31 32 36" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `
  },
  eyes: {
    round: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(4, 0)">
          <ellipse cx="12" cy="24" rx="8" ry="9" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <circle cx="12" cy="24" r="5.5" fill="#0284c7"/>
          <circle cx="12" cy="24" r="3" fill="#0f172a"/>
          <circle cx="14" cy="22" r="1.8" fill="#ffffff"/>
          <path d="M5 19C8 16 16 16 19 19" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
          <ellipse cx="28" cy="24" rx="8" ry="9" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <circle cx="28" cy="24" r="5.5" fill="#0284c7"/>
          <circle cx="28" cy="24" r="3" fill="#0f172a"/>
          <circle cx="30" cy="22" r="1.8" fill="#ffffff"/>
          <path d="M21 19C24 16 32 16 35 19" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </svg>
    `,
    medium: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(4, 0)">
          <path d="M4 25C7 20 17 20 20 25C17 29 7 29 4 25Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="12" cy="25" rx="4.5" ry="4" fill="#0284c7"/>
          <circle cx="12" cy="25" r="2.2" fill="#0f172a"/>
          <circle cx="13.5" cy="23.5" r="1.3" fill="#ffffff"/>
          <path d="M4 22C8 19 16 19 20 22" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M20 25C23 20 33 20 36 25C33 29 23 29 20 25Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="28" cy="25" rx="4.5" ry="4" fill="#0284c7"/>
          <circle cx="28" cy="25" r="2.2" fill="#0f172a"/>
          <circle cx="29.5" cy="23.5" r="1.3" fill="#ffffff"/>
          <path d="M20 22C24 19 32 19 36 22" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </svg>
    `,
    almond: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(4, 0)">
          <path d="M3 26C8 19 16 20 21 24C16 28 8 28 3 26Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="12.5" cy="24.5" rx="4" ry="3.5" fill="#0284c7"/>
          <ellipse cx="12.5" cy="24.5" rx="1.8" ry="3" fill="#0f172a"/>
          <circle cx="14" cy="23" r="1.2" fill="#ffffff"/>
          <path d="M3 24C9 18 17 19 22 23" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M19 24C24 20 32 19 37 26C32 28 24 28 19 24Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="27.5" cy="24.5" rx="4" ry="3.5" fill="#0284c7"/>
          <ellipse cx="27.5" cy="24.5" rx="1.8" ry="3" fill="#0f172a"/>
          <circle cx="29" cy="23" r="1.2" fill="#ffffff"/>
          <path d="M18 23C23 19 31 18 37 24" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </svg>
    `
  },
  horns: {
    base: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 32C15 25 10 18 8 13C12 15 17 21 19 27C20 30 19 32 17 32Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
        <path d="M31 32C33 25 38 18 40 13C36 15 31 21 29 27C28 30 29 32 31 32Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    beast: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 33C13 30 7 24 4 17C9 18 16 23 20 29Z" fill="#ea580c" stroke="#9a3412" stroke-width="1.5"/>
        <path d="M31 33C35 30 41 24 44 17C39 18 32 23 28 29Z" fill="#ea580c" stroke="#9a3412" stroke-width="1.5"/>
        <path d="M6 19C11 23 15 27 18 31" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
        <path d="M42 19C37 23 33 27 30 31" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    spiral: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 30C15 25 11 23 8 25C5 27 6 32 10 34C13 35 17 33 18 30Z" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>
        <path d="M12 25C15 27 16 31 15 33" stroke="#fef08a" stroke-width="1.5"/>
        <path d="M30 30C33 25 37 23 40 25C43 27 42 32 38 34C35 35 31 33 30 30Z" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>
        <path d="M36 25C33 27 32 31 33 33" stroke="#fef08a" stroke-width="1.5"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    dragon: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 32L12 23L14 22L7 11L14 17L16 15L20 28Z" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1.5"/>
        <path d="M30 32L36 23L34 22L41 11L34 17L32 15L28 28Z" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1.5"/>
        <path d="M10 15L15 21" stroke="#c084fc" stroke-width="2"/>
        <path d="M38 15L33 21" stroke="#c084fc" stroke-width="2"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    astral: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 32C16 23 13 16 9 10C14 13 18 20 20 28Z" fill="#06b6d4" stroke="#0891b2" stroke-width="1.5"/>
        <path d="M30 32C32 23 35 16 39 10C34 13 30 20 28 28Z" fill="#06b6d4" stroke="#0891b2" stroke-width="1.5"/>
        <path d="M24 10L25.5 14L29.5 15.5L25.5 17L24 21L22.5 17L18.5 15.5L22.5 14Z" fill="#fef08a" stroke="#f59e0b" stroke-width="1"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    deer: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 32C18 26 15 20 12 15M15 20L10 19M13 17L14 11M16 23L19 19" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M29 32C30 26 33 20 36 15M33 20L38 19M35 17L34 11M32 23L29 19" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `
  }
};

export class StartScreenUI {
  constructor(options = {}) {
    this.audio = options.audio || null;
    this.onStartAdventure = options.onStartAdventure || (() => {});

    this.container = null;
    this.heroSelectModal = null;
    this.confirmModal = null;
    this.pendingSlotId = null;
    this.diorama = null;

    // Wizard & Customization state
    this.currentWizardStep = 1;
    this.playerName = 'Ema';
    this.selectedSapidaeModel = 'sapidae-f-a';
    this.selectedSapidaeClass = 'crafter';
    this.selectedCompanionKey = 'beast_rage';
    this.customization = {
      useOriginalTextures: true,
      hair: 'original',
      hairStyle: 'braids',
      eyes: 'original',
      eyeShape: 'round',
      suitColor: 'original',
      shirt: 'original',
      pants: 'original',
      horns: 'base',
      hornColor: 'original',
      hasHat: false,
      hatColor: 'original'
    };

    this.isOpen = true;
    this._createDOM();
    this.refreshSlots();

    // Listen to portrait service updates to refresh slot and hero avatars in real time
    portraitService.addListener(() => {
      if (this.isOpen) {
        this.refreshSlots();
        if (this.heroSelectModal && !this.heroSelectModal.classList.contains('hidden')) {
          if (this.currentWizardStep === 3) {
            this._renderWizard();
          }
        }
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
          <p class="game-tagline">Create your custom Sapidae Adventurer, choose your companion Axie, and explore Lunacia.</p>
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
            <span class="footer-version">v1.3.0 • Sapidae 4-Class Tactical System</span>
            <span class="footer-badge">Lunakai Ecosystem</span>
          </div>
        </footer>
      </div>
    `;

    document.body.appendChild(root);
    this.container = root;

    // 2. Sapidae Customization Studio (Dofus Unity Style)
    const heroModal = document.createElement('div');
    heroModal.id = 'hero-select-modal';
    heroModal.className = 'hero-select-modal hidden';
    heroModal.innerHTML = `
      <div class="hero-select-backdrop"></div>
      <div class="dofus-studio-container" id="dofus-studio-container">
        <!-- Rendered dynamically by _renderUnifiedStudio() -->
      </div>
    `;
    document.body.appendChild(heroModal);
    this.heroSelectModal = heroModal;

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

    let skillTooltip = document.getElementById('class-skill-tooltip');
    if (!skillTooltip) {
      skillTooltip = document.createElement('div');
      skillTooltip.id = 'class-skill-tooltip';
      skillTooltip.className = 'class-skill-tooltip';
      skillTooltip.style.display = 'none';
      document.body.appendChild(skillTooltip);
    }
    this.skillTooltip = skillTooltip;

    this._setupEventListeners();
  }

  _renderUnifiedStudio() {
    const container = document.getElementById('dofus-studio-container');
    if (!container) return;

    container.innerHTML = `
      <!-- Top Navigation & Title Bar -->
      <div class="dofus-top-bar">
        <button type="button" id="btn-dofus-back" class="dofus-back-btn" title="Return to Adventure Slots">
          <span class="dofus-back-arrow">‹</span>
          <span>BACK TO SLOTS</span>
        </button>

        <div class="dofus-title-center">
          <div class="dofus-super-badge">LUNACIA: TACTICAL ADVENTURE</div>
          <h2 class="dofus-main-title">CHARACTER CREATION</h2>
        </div>

        <div class="dofus-slot-indicator" id="dofus-slot-badge">
          SLOT #${this.pendingSlotId || 1}
        </div>
      </div>

      <!-- 3-Column Main Grid -->
      <div class="dofus-main-grid">
        <!-- Col 1: Left (Class & Companion) -->
        <div class="dofus-col dofus-left-col">
          ${this._renderLeftColumnTactical()}
        </div>

        <!-- Col 2: Center (3D Diorama) -->
        <div class="dofus-col dofus-center-col">
          ${this._renderCenterColumnDiorama()}
        </div>

        <!-- Col 3: Right (Customization) -->
        <div class="dofus-col dofus-right-col">
          ${this._renderRightColumnCustomization()}
        </div>
      </div>
    `;
  }

  _renderLeftColumnTactical() {
    const currentClass = SAPIDAE_CLASSES[this.selectedSapidaeClass] || SAPIDAE_CLASSES.crafter;
    const currentCompanion = HERO_ROSTER.find(h => h.heroKey === this.selectedCompanionKey) || HERO_ROSTER[0];

    return `
      <!-- 1. Class Grid (4 classes) -->
      <div class="dofus-card-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">TACTICAL CLASS</span>
          <span class="dofus-box-hint">Choose your path</span>
        </div>
        <div class="dofus-class-pills">
          ${Object.values(SAPIDAE_CLASSES).map(c => {
            const isSel = c.id === this.selectedSapidaeClass;
            const portrait = CLASS_PORTRAITS[c.id] || './assets/classes/class_forjacubiles.jpg';
            return `
              <div class="dofus-class-pill ${isSel ? 'active' : ''}" data-class-id="${c.id}" role="button" tabindex="0">
                <img src="${portrait}" alt="${c.name}" class="dofus-class-pill-img">
                <div class="dofus-class-pill-name">${c.name}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 2. Selected Class Detail & Lore -->
      <div class="dofus-card-box dofus-class-details-box" id="dofus-class-details">
        <div class="dofus-class-archetype-tag" id="dofus-archetype-tag">${currentClass.archetype}</div>
        <p class="dofus-class-desc-text" id="dofus-class-desc">${currentClass.description}</p>
        <div class="dofus-stats-compact-row" id="dofus-class-stats">
          <span style="color:#ef4444;">❤️ ${currentClass.maxHP} HP</span>
          <span style="color:#38bdf8;">⭐ ${currentClass.maxPA} AP</span>
          <span style="color:#22c55e;">👟 ${currentClass.maxPM} MP</span>
          <span style="color:#fbbf24;">⚡ ${currentClass.initiative} INIT</span>
        </div>
      </div>

      <!-- 3. Repertorio de 6 Habilidades Tácticas -->
      <div class="dofus-card-box dofus-skills-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">COMBAT SPELLS (6)</span>
          <span class="dofus-box-hint">Hover for details</span>
        </div>
        <div class="dofus-skills-row" id="dofus-skills-row">
          ${this._renderSkillIconsRow(currentClass)}
        </div>
      </div>

      <!-- 4. Selector de Compañero Axie -->
      <div class="dofus-card-box dofus-companion-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">STARTING AXIE COMPANION</span>
          <span class="dofus-box-hint">Your battle ally</span>
        </div>
        <div class="dofus-companion-grid" id="dofus-companion-grid">
          ${HERO_ROSTER.map(hero => {
            const isSel = hero.heroKey === this.selectedCompanionKey;
            const portrait = portraitService.getPortraitSync(hero.axieId) || hero.image || `./assets/portraits/${hero.heroKey}.png`;
            const classIcon = getAxieClassIcon(hero.class || hero.heroKey);
            return `
              <div class="dofus-comp-item ${isSel ? 'active' : ''}" data-hero-key="${hero.heroKey}" role="button" tabindex="0">
                <img src="${portrait}" alt="${hero.name}" class="dofus-comp-avatar">
                <div class="dofus-comp-name">
                  <img src="${classIcon}" alt="${hero.class}" class="dofus-comp-class-icon">
                  <span>${hero.name}</span>
                </div>
                <div class="dofus-comp-class">${hero.class}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 5. Habilidades del Compañero Axie (6 Hechizos) -->
      <div class="dofus-card-box dofus-comp-skills-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title" id="dofus-comp-skills-title">${currentCompanion ? currentCompanion.name.toUpperCase() : 'COMPANION'} SPELLS (6)</span>
          <span class="dofus-box-hint">Hover for details</span>
        </div>
        <div class="dofus-skills-row" id="dofus-comp-skills-row">
          ${this._renderCompanionSkillIconsRow(currentCompanion)}
        </div>
      </div>
    `;
  }

  _renderCenterColumnDiorama() {
    const currentClass = SAPIDAE_CLASSES[this.selectedSapidaeClass] || SAPIDAE_CLASSES.crafter;

    return `
      <!-- Top Class Header Badge -->
      <div class="dofus-diorama-class-header" id="dofus-diorama-class-header">
        <img src="${CLASS_PORTRAITS[currentClass.id] || './assets/classes/class_forjacubiles.jpg'}" alt="${currentClass.name}" class="dofus-diorama-constel-img" id="dofus-header-icon">
        <div class="dofus-diorama-class-name" id="dofus-header-name">${currentClass.name.toUpperCase()}</div>
      </div>

      <!-- 3D Diorama Stage -->
      <div class="dofus-diorama-viewport-wrap">
        <div id="dofus-3d-canvas-container" class="dofus-3d-canvas-container"></div>

        <!-- Rotation Controls (Like Dofus) -->
        <div class="dofus-rotation-controls">
          <button type="button" class="dofus-rot-btn dofus-rot-left" id="btn-rot-left" title="Rotate left">⟲</button>
          <div class="dofus-rot-hint">Drag to rotate 360°</div>
          <button type="button" class="dofus-rot-btn dofus-rot-right" id="btn-rot-right" title="Rotate right">⟳</button>
        </div>
      </div>

      <!-- Bottom: Centered Big Play Button -->
      <div class="dofus-bottom-action-bar dofus-play-center-bar">
        <button type="button" id="btn-dofus-play" class="dofus-play-btn" title="Embark on Adventure in Lunacia">
          <span class="dofus-play-text">⚔️ PLAY</span>
        </button>
      </div>
    `;
  }

  _renderColorPickerControl(part, currentVal, defaultHex) {
    const isOriginal = !currentVal || currentVal === 'original';
    const activeHex = (currentVal && currentVal.startsWith('#')) ? currentVal : defaultHex;
    const displayColor = isOriginal ? defaultHex : activeHex;
    const statusText = isOriginal ? 'Base Texture' : activeHex.toUpperCase();

    return `
      <div class="dofus-color-intuitive-bar" data-part="${part}">
        <!-- 1. Clickable Full Color Selector Tile -->
        <label class="dofus-color-picker-box" title="Click to open color picker">
          <div class="dofus-color-swatch-glow" style="background: ${displayColor};"></div>
          <div class="dofus-color-box-texts">
            <div class="dofus-color-box-title-row">
              <span class="dofus-color-rainbow-icon">🎨</span>
              <span class="dofus-color-action-text">Color Picker</span>
            </div>
            <span class="dofus-color-value-badge ${isOriginal ? 'is-original' : 'is-custom'}">${statusText}</span>
          </div>
          <span class="dofus-color-open-arrow">Pick ▾</span>
          <input type="color" class="dofus-rgb-native-input" data-part="${part}" value="${activeHex}">
        </label>

        <!-- 2. Restore Original Texture Button -->
        <button type="button" 
          class="dofus-color-revert-btn ${isOriginal ? 'active' : ''}" 
          data-part="${part}" 
          data-default-hex="${defaultHex}"
          title="Restore default texture colors">
          <span class="dofus-revert-icon">↺</span>
          <span class="dofus-revert-label">Default</span>
        </button>
      </div>
    `;
  }

  _renderRightColumnCustomization() {
    const currentHorn = HORN_STYLES.find(h => h.id === this.customization.horns) || HORN_STYLES[0];
    const currentEyeShape = EYE_SHAPES.find(e => e.id === this.customization.eyeShape) || EYE_SHAPES[0];
    const currentHair = HAIR_STYLES.find(h => h.id === this.customization.hairStyle) || HAIR_STYLES[0];
    const isSuitOriginal = !this.customization.suitColor || this.customization.suitColor === 'original';
    const suitDisplay = isSuitOriginal ? 'Default' : this.customization.suitColor.toUpperCase();

    return `
      <!-- 1. Gender / Model Switcher -->
      <div class="dofus-card-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">GENDER / BASE</span>
          <button type="button" id="btn-randomize-all" class="dofus-randomize-all-btn" title="Randomize appearance & colors">
            🎲 Random
          </button>
        </div>
        <div class="dofus-gender-toggle-row">
          <button type="button" class="dofus-gender-btn ${this.selectedSapidaeModel === 'sapidae-f-a' ? 'active' : ''}" data-gender="sapidae-f-a">
            <span class="dofus-gender-sym">♀</span>
            <span>Female (Ema)</span>
          </button>
          <button type="button" class="dofus-gender-btn ${this.selectedSapidaeModel === 'sapidae-m-a' ? 'active' : ''}" data-gender="sapidae-m-a">
            <span class="dofus-gender-sym">♂</span>
            <span>Male</span>
          </button>
        </div>
      </div>

      <!-- 2. Cabello (Estilo en Tarjetas + Selector Intuitivo de Color) -->
      <div class="dofus-card-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">HAIR STYLE</span>
          <span class="dofus-box-val" id="val-label-hair">${currentHair.name}</span>
        </div>
        <div class="dofus-item-cards-grid grid-hair">
          ${HAIR_STYLES.map(h => `
            <div class="dofus-item-card ${this.customization.hairStyle === h.id ? 'active' : ''}" data-trait-cat="hairStyle" data-trait-val="${h.id}" title="${h.name}" role="button" tabindex="0">
              <div class="dofus-item-icon-box">
                ${ITEM_ICONS.hair[h.id] || ''}
              </div>
              <span class="dofus-item-card-label">${h.name.replace('Corte ', '')}</span>
            </div>
          `).join('')}
        </div>
        ${this._renderColorPickerControl('hair', this.customization.hair, '#b91c1c')}
      </div>

      <!-- 3. Ojos & Mirada (Forma en Tarjetas + Selector Intuitivo de Color) -->
      <div class="dofus-card-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">EYES & GAZE</span>
          <span class="dofus-box-val" id="val-label-eyes">${currentEyeShape.name}</span>
        </div>
        <div class="dofus-item-cards-grid grid-eyes">
          ${EYE_SHAPES.map(e => `
            <div class="dofus-item-card ${this.customization.eyeShape === e.id ? 'active' : ''}" data-trait-cat="eyeShape" data-trait-val="${e.id}" title="${e.name}" role="button" tabindex="0">
              <div class="dofus-item-icon-box">
                ${ITEM_ICONS.eyes[e.id] || ''}
              </div>
              <span class="dofus-item-card-label">${e.name}</span>
            </div>
          `).join('')}
        </div>
        ${this._renderColorPickerControl('eyes', this.customization.eyes, '#dc2626')}
      </div>

      <!-- 4. Cuernos Sapidae (Estilo en Tarjetas + Selector Intuitivo de Color) -->
      <div class="dofus-card-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">SAPIDAE HORNS</span>
          <span class="dofus-box-val" id="val-label-horns">${currentHorn.name}</span>
        </div>
        <div class="dofus-item-cards-grid grid-horns">
          ${HORN_STYLES.map(h => {
            const shortName = h.name.replace('Cuernos ', '').replace('Cornamenta de ', '');
            return `
              <div class="dofus-item-card ${this.customization.horns === h.id ? 'active' : ''}" data-trait-cat="horns" data-trait-val="${h.id}" title="${h.name}" role="button" tabindex="0">
                <div class="dofus-item-icon-box">
                  ${ITEM_ICONS.horns[h.id] || ''}
                </div>
                <span class="dofus-item-card-label">${shortName}</span>
              </div>
            `;
          }).join('')}
        </div>
        ${this._renderColorPickerControl('hornColor', this.customization.hornColor, '#b45309')}
      </div>

      <!-- 5. Traje Base (Color de Túnica con Selector Intuitivo) -->
      <div class="dofus-card-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">OUTFIT COLOR</span>
          <span class="dofus-box-val" id="val-label-suit">${suitDisplay}</span>
        </div>
        ${this._renderColorPickerControl('suitColor', this.customization.suitColor, '#b91c1c')}
      </div>

      <!-- 6. Nombre del Aventurero -->
      <div class="dofus-card-box dofus-name-card-box">
        <div class="dofus-box-header">
          <span class="dofus-box-title">CHARACTER NAME</span>
        </div>
        <div class="dofus-name-field-wrap">
          <input type="text" id="dofus-char-name" class="dofus-char-name-input" maxlength="16" value="${this.playerName || 'Ema'}" placeholder="Ema, Vael, Lunara...">
          <button type="button" id="btn-random-name" class="dofus-dice-btn" title="Generate random name">🎲</button>
        </div>
      </div>
    `;
  }

  _renderSkillIconsRow(classDef) {
    if (!classDef) return '';
    const previews = classDef.spellPreviews || [];
    return previews.map((s, idx) => `
      <div class="class-skill-icon-btn" data-skill-idx="${idx}" data-class-id="${classDef.id}" tabindex="0" role="button" aria-label="${s.name}">
        <div class="class-skill-icon-frame">
          <img src="${s.icon}" alt="${s.name}" class="class-skill-img" onerror="this.src='./assets/skills/heroes/shinji/1.png'">
          <span class="class-skill-num-badge">${idx + 1}</span>
        </div>
      </div>
    `).join('');
  }

  _renderCompanionSkillIconsRow(companionDef) {
    if (!companionDef) return '';
    const skills = companionDef.skills || [];
    return skills.map((s, idx) => {
      const partKey = (s.part || AXIE_BODY_PARTS[idx]?.id || '').toLowerCase();
      const partInfo = AXIE_BODY_PARTS_MAP[partKey] || AXIE_BODY_PARTS[idx];
      const partBadge = partInfo ? `
        <div class="comp-skill-part-badge" title="Axie Part: ${partInfo.name}">
          <img src="${partInfo.icon}" alt="${partInfo.name}" class="comp-skill-part-img">
        </div>
      ` : '';

      return `
        <div class="class-skill-icon-btn comp-skill-icon-btn" data-comp-skill-idx="${idx}" data-hero-key="${companionDef.heroKey}" tabindex="0" role="button" aria-label="${s.name}${partInfo ? ` (${partInfo.name})` : ''}">
          <div class="class-skill-icon-frame comp-skill-frame">
            <img src="${s.icon}" alt="${s.name}" class="class-skill-img" onerror="this.onerror=null; this.src='./assets/skills/heroes/shinji/1.png'">
            ${partBadge}
            <span class="class-skill-num-badge">${idx + 1}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  _randomizeAllTraits() {
    const hair = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)];
    const hairStyle = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)];
    const pupil = PUPIL_COLORS[Math.floor(Math.random() * PUPIL_COLORS.length)];
    const eyeShape = EYE_SHAPES[Math.floor(Math.random() * EYE_SHAPES.length)];
    const horn = HORN_STYLES[Math.floor(Math.random() * HORN_STYLES.length)];
    const hornColor = HORN_COLORS[Math.floor(Math.random() * HORN_COLORS.length)];
    const suit = SUIT_COLORS[Math.floor(Math.random() * SUIT_COLORS.length)];
    const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

    this.customization.hair = hair.hex;
    this.customization.hairStyle = hairStyle.id;
    this.customization.eyes = pupil.hex;
    this.customization.eyeShape = eyeShape.id;
    this.customization.horns = horn.id;
    this.customization.hornColor = hornColor.hex;
    this.customization.suitColor = suit.hex;
    this.customization.shirt = suit.hex;
    this.customization.pants = suit.hex;
    this.playerName = randomName;

    const nameInput = document.getElementById('dofus-char-name');
    if (nameInput) nameInput.value = randomName;

    const rightCol = document.querySelector('.dofus-right-col');
    if (rightCol) {
      rightCol.innerHTML = this._renderRightColumnCustomization();
    }

    if (this.diorama) {
      this.diorama.applyCustomization(this.customization);
    }
  }

  _showSkillTooltip(skill, anchorEl) {
    if (!this.skillTooltip || !skill || !anchorEl) return;

    const typeNormalized = (skill.type || 'buff').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const partKey = (skill.part || '').toLowerCase();
    const partInfo = AXIE_BODY_PARTS_MAP[partKey] || null;
    const partTag = partInfo ? `
      <span class="skill-tooltip-badge skill-tooltip-part-badge" title="Axie Body Part: ${partInfo.name}">
        <img src="${partInfo.icon}" class="skill-tooltip-part-icon" alt="${partInfo.name}">
        <span>${partInfo.name.toUpperCase()}</span>
      </span>
    ` : '';

    this.skillTooltip.innerHTML = `
      <div class="skill-tooltip-header">
        <img src="${skill.icon}" alt="${skill.name}" class="skill-tooltip-icon" onerror="this.src='./assets/skills/heroes/shinji/1.png'">
        <div class="skill-tooltip-title-wrap">
          <div class="skill-tooltip-name">${skill.name}</div>
          <div class="skill-tooltip-meta">
            ${partTag}
            <span class="skill-tooltip-badge type-${typeNormalized}">${skill.type || 'Skill'}</span>
            <span class="skill-tooltip-cost">⭐ ${skill.cost || '3 AP'}</span>
            <span class="skill-tooltip-range">🎯 ${skill.range || '1-3'}</span>
          </div>
        </div>
      </div>
      <div class="skill-tooltip-body">
        ${skill.desc}
      </div>
    `;

    this.skillTooltip.style.display = 'block';

    const rect = anchorEl.getBoundingClientRect();
    const tooltipRect = this.skillTooltip.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    let top = rect.top - tooltipRect.height - 12;
    if (top < 10) {
      top = rect.bottom + 12;
    }

    this.skillTooltip.style.left = `${Math.round(left)}px`;
    this.skillTooltip.style.top = `${Math.round(top)}px`;
  }

  _hideSkillTooltip() {
    if (this.skillTooltip) {
      this.skillTooltip.style.display = 'none';
    }
  }

  _setupEventListeners() {
    // Real-time RGB Native Color Picker change / input
    const handleColorPick = (e) => {
      const picker = e.target.closest('.dofus-rgb-native-input');
      if (!picker) return;
      const part = picker.dataset.part;
      const hex = picker.value;
      if (part && hex) {
        this.customization[part] = hex;
        if (part === 'suitColor') {
          this.customization.shirt = hex;
          this.customization.pants = hex;
          const suitLabel = document.getElementById('val-label-suit');
          if (suitLabel) suitLabel.textContent = hex.toUpperCase();
        }

        const bar = picker.closest('.dofus-color-intuitive-bar');
        if (bar) {
          const swatch = bar.querySelector('.dofus-color-swatch-glow');
          if (swatch) swatch.style.backgroundColor = hex;
          const badge = bar.querySelector('.dofus-color-value-badge');
          if (badge) {
            badge.textContent = hex.toUpperCase();
            badge.classList.remove('is-original');
            badge.classList.add('is-custom');
          }
          const revertBtn = bar.querySelector('.dofus-color-revert-btn');
          if (revertBtn) {
            revertBtn.classList.remove('active');
          }
        }

        if (this.diorama) {
          this.diorama.applyCustomization(this.customization);
        }
      }
    };

    // Input listener for character name & RGB sliders
    this.heroSelectModal.addEventListener('input', (e) => {
      if (e.target.id === 'dofus-char-name' || e.target.id === 'char-name-input') {
        this.playerName = e.target.value;
        return;
      }
      handleColorPick(e);
    });

    this.heroSelectModal.addEventListener('change', (e) => {
      handleColorPick(e);
    });

    // Isolate keyboard events in the Sapidae Creator studio so typing names or using inputs
    // NEVER bubbles to the window and triggers Overworld shortcuts (I for Inventory, M for Map, etc.)
    this.heroSelectModal.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Escape') {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          document.activeElement.blur();
        } else {
          this.closeHeroSelect();
        }
      }
    });

    this.heroSelectModal.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });

    this.heroSelectModal.addEventListener('keypress', (e) => {
      e.stopPropagation();
    });

    this.container.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.stopPropagation();
      }
    });

    // Delegation for all Studio clicks
    this.heroSelectModal.addEventListener('click', (e) => {
      // 1. Close / Back Button
      if (e.target.closest('#btn-dofus-back') || e.target.closest('#btn-close-hero-select')) {
        this.closeHeroSelect();
        return;
      }

      // 2. Play / Start Adventure
      const playBtn = e.target.closest('#btn-dofus-play') || e.target.closest('#btn-finish-adventure');
      if (playBtn && this.pendingSlotId) {
        const heroTemplate = HERO_ROSTER.find(h => h.heroKey === this.selectedCompanionKey) || HERO_ROSTER[0];
        this._createSlotAndStart(this.pendingSlotId, heroTemplate);
        return;
      }

      // 3. Class Pill Click
      const classPill = e.target.closest('.dofus-class-pill');
      if (classPill) {
        const classId = classPill.dataset.classId;
        if (classId && SAPIDAE_CLASSES[classId]) {
          this.selectedSapidaeClass = classId;
          const currentClass = SAPIDAE_CLASSES[classId];

          // Update pill active states
          this.heroSelectModal.querySelectorAll('.dofus-class-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.classId === classId);
          });

          // Update Class Details Card
          const archTag = document.getElementById('dofus-archetype-tag');
          if (archTag) archTag.textContent = currentClass.archetype;

          const descText = document.getElementById('dofus-class-desc');
          if (descText) descText.textContent = currentClass.description;

          const statsRow = document.getElementById('dofus-class-stats');
          if (statsRow) {
            statsRow.innerHTML = `
              <span style="color:#ef4444;">❤️ ${currentClass.maxHP} HP</span>
              <span style="color:#38bdf8;">⭐ ${currentClass.maxPA} AP</span>
              <span style="color:#22c55e;">👟 ${currentClass.maxPM} MP</span>
              <span style="color:#fbbf24;">⚡ ${currentClass.initiative} INIT</span>
            `;
          }

          // Update Skills row
          const skillsRow = document.getElementById('dofus-skills-row');
          if (skillsRow) {
            skillsRow.innerHTML = this._renderSkillIconsRow(currentClass);
          }

          // Update Center Header Badge
          const headIcon = document.getElementById('dofus-header-icon');
          if (headIcon) {
            headIcon.src = CLASS_PORTRAITS[classId] || './assets/classes/class_forjacubiles.jpg';
            headIcon.alt = currentClass.name;
          }

          const headName = document.getElementById('dofus-header-name');
          if (headName) headName.textContent = currentClass.name.toUpperCase();

          if (this.audio && typeof this.audio.playSelect === 'function') {
            this.audio.playSelect();
          }
        }
        return;
      }

      // 4. Companion Axie Click
      const compItem = e.target.closest('.dofus-comp-item');
      if (compItem) {
        const heroKey = compItem.dataset.heroKey;
        if (heroKey) {
          this.selectedCompanionKey = heroKey;
          this.heroSelectModal.querySelectorAll('.dofus-comp-item').forEach(c => {
            c.classList.toggle('active', c.dataset.heroKey === heroKey);
          });

          const compHero = HERO_ROSTER.find(h => h.heroKey === heroKey);
          if (compHero) {
            // Update companion skills box title & icons
            const compTitle = document.getElementById('dofus-comp-skills-title');
            if (compTitle) {
              compTitle.textContent = `HECHIZOS DE ${compHero.name.toUpperCase()} (6)`;
            }
            const compRow = document.getElementById('dofus-comp-skills-row');
            if (compRow) {
              compRow.innerHTML = this._renderCompanionSkillIconsRow(compHero);
            }

            if (this.diorama) {
              this.diorama.loadCompanion(compHero.axieId, compHero.genes);
            }
          }

          if (this.audio && typeof this.audio.playSelect === 'function') {
            this.audio.playSelect();
          }
        }
        return;
      }

      // 5. Gender / Base Model toggle
      const genderBtn = e.target.closest('.dofus-gender-btn');
      if (genderBtn) {
        const model = genderBtn.dataset.gender;
        if (model) {
          this.selectedSapidaeModel = model;
          this.heroSelectModal.querySelectorAll('.dofus-gender-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.gender === model);
          });

          if (this.diorama) {
            this.diorama.loadSapidae(model, this.customization);
          }

          if (this.audio && typeof this.audio.playSelect === 'function') {
            this.audio.playSelect();
          }
        }
        return;
      }

      // 6. Modular Trait Selector (Hair Style, Eye Shape, Horns)
      const traitBtn = e.target.closest('.dofus-item-card, .dofus-trait-btn');
      if (traitBtn) {
        const cat = traitBtn.dataset.traitCat;
        const val = traitBtn.dataset.traitVal;
        if (cat && val && this.customization[cat] !== undefined) {
          this.customization[cat] = val;
          const parentGrid = traitBtn.parentElement;
          if (parentGrid) {
            parentGrid.querySelectorAll('.dofus-item-card, .dofus-trait-btn').forEach(b => {
              b.classList.toggle('active', b.dataset.traitVal === val);
            });
          }

          const labelId = cat === 'hairStyle' ? 'val-label-hair' : cat === 'eyeShape' ? 'val-label-eyes' : 'val-label-horns';
          const labelEl = document.getElementById(labelId);
          if (labelEl) {
            const list = cat === 'horns' ? HORN_STYLES : cat === 'hairStyle' ? HAIR_STYLES : EYE_SHAPES;
            const def = list.find(item => item.id === val);
            if (def) labelEl.textContent = def.name;
          }

          if (this.diorama) {
            this.diorama.applyCustomization(this.customization);
          }

          if (this.audio && typeof this.audio.playSelect === 'function') {
            this.audio.playSelect();
          }
        }
        return;
      }

      // 7. Revert to Original Texture Color
      const revertBtn = e.target.closest('.dofus-color-revert-btn');
      if (revertBtn) {
        const part = revertBtn.dataset.part;
        const defaultHex = revertBtn.dataset.defaultHex || '#b91c1c';
        if (part && this.customization[part] !== undefined) {
          this.customization[part] = 'original';
          if (part === 'suitColor') {
            this.customization.shirt = 'original';
            this.customization.pants = 'original';
            const suitLabel = document.getElementById('val-label-suit');
            if (suitLabel) suitLabel.textContent = 'Default';
          }

          const bar = revertBtn.closest('.dofus-color-intuitive-bar');
          if (bar) {
            revertBtn.classList.add('active');
            const swatch = bar.querySelector('.dofus-color-swatch-glow');
            if (swatch) swatch.style.backgroundColor = defaultHex;
            const badge = bar.querySelector('.dofus-color-value-badge');
            if (badge) {
              badge.textContent = 'Base Texture';
              badge.classList.remove('is-custom');
              badge.classList.add('is-original');
            }
            const nativeInput = bar.querySelector('.dofus-rgb-native-input');
            if (nativeInput) nativeInput.value = defaultHex;
          }

          if (this.diorama) {
            this.diorama.applyCustomization(this.customization);
          }

          if (this.audio && typeof this.audio.playSelect === 'function') {
            this.audio.playSelect();
          }
        }
        return;
      }

      // 7b. Color Picker Box Click (Show Picker)
      const pickerBox = e.target.closest('.dofus-color-picker-box');
      if (pickerBox && e.target.tagName !== 'INPUT') {
        const nativeInput = pickerBox.querySelector('.dofus-rgb-native-input');
        if (nativeInput && typeof nativeInput.showPicker === 'function') {
          try {
            nativeInput.showPicker();
          } catch (_) {}
        }
      }

      // 8. Diorama Rotation Buttons
      if (e.target.closest('#btn-rot-left')) {
        this.diorama?.rotateBy(-Math.PI / 4);
        if (this.audio && typeof this.audio.playSelect === 'function') this.audio.playSelect();
        return;
      }
      if (e.target.closest('#btn-rot-right')) {
        this.diorama?.rotateBy(Math.PI / 4);
        if (this.audio && typeof this.audio.playSelect === 'function') this.audio.playSelect();
        return;
      }

      // 9. Random Name Dice Button
      if (e.target.closest('#btn-random-name')) {
        const randName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        this.playerName = randName;
        const nameInput = document.getElementById('dofus-char-name');
        if (nameInput) nameInput.value = randName;
        if (this.audio && typeof this.audio.playSelect === 'function') this.audio.playSelect();
        return;
      }

      // 10. Randomize All Traits Button
      if (e.target.closest('#btn-randomize-all')) {
        this._randomizeAllTraits();
        if (this.audio && typeof this.audio.playSelect === 'function') this.audio.playSelect();
        return;
      }
    });

    // Hover listeners for skill icon tooltips
    this.heroSelectModal.addEventListener('mouseover', (e) => {
      // 1. Sapidae class skills
      const skillBtn = e.target.closest('.class-skill-icon-btn:not(.comp-skill-icon-btn)');
      if (skillBtn) {
        const classId = skillBtn.dataset.classId;
        const skillIdx = parseInt(skillBtn.dataset.skillIdx, 10);
        const classDef = SAPIDAE_CLASSES[classId];
        if (classDef && classDef.spellPreviews && classDef.spellPreviews[skillIdx]) {
          this._showSkillTooltip(classDef.spellPreviews[skillIdx], skillBtn);
        }
        return;
      }

      // 2. Companion Axie skills
      const compSkillBtn = e.target.closest('.comp-skill-icon-btn');
      if (compSkillBtn) {
        const heroKey = compSkillBtn.dataset.heroKey;
        const skillIdx = parseInt(compSkillBtn.dataset.compSkillIdx, 10);
        const compHero = HERO_ROSTER.find(h => h.heroKey === heroKey);
        if (compHero && compHero.skills && compHero.skills[skillIdx]) {
          this._showSkillTooltip(compHero.skills[skillIdx], compSkillBtn);
        }
      }
    });

    this.heroSelectModal.addEventListener('mouseout', (e) => {
      const skillBtn = e.target.closest('.class-skill-icon-btn');
      if (skillBtn) {
        const related = e.relatedTarget;
        if (!related || !skillBtn.contains(related)) {
          this._hideSkillTooltip();
        }
      }
    });

    // Hide tooltip on scroll or modal click
    this.heroSelectModal.addEventListener('scroll', () => this._hideSkillTooltip(), true);
    this.heroSelectModal.addEventListener('click', (e) => {
      if (!e.target.closest('.class-skill-icon-btn')) {
        this._hideSkillTooltip();
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
            <p class="empty-slot-sub">Customize your Sapidae & choose starting Axie companion</p>
            <button class="btn-slot-create" data-slot-id="${slotInfo.id}">
              ✨ Create Adventure
            </button>
          </div>
        `;
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

        const sapidaeClassKey = data.sapidaeClass || 'crafter';
        const classDef = SAPIDAE_CLASSES[sapidaeClassKey] || SAPIDAE_CLASSES.crafter;

        const customKey = 'sapidae_fullbody_' + (data.sapidaeModel || 'sapidae-f-a') + '_' + JSON.stringify(data.customization || {}) + '_' + JSON.stringify(data.equipped || {});
        let sapidaePortrait = portraitService.getPortraitSync(customKey)
          || data.sapidaePortrait
          || portraitService.getPortraitSync(data.sapidaeModel || 'sapidae-f-a')
          || `./assets/portraits/${data.sapidaeModel || 'sapidae-f-a'}.png`;

        // Generamos o actualizamos de inmediato el render 3D de cuerpo entero parado con su personalización exacta:
        portraitService.getSapidaeCustomPortrait(data.sapidaeModel || 'sapidae-f-a', data.customization, data.equipped).then(url => {
          if (url) {
            data.sapidaePortrait = url;
            saveSlotManager._saveToStorage();
            const img = card.querySelector('.slot-fullbody-img');
            if (img) img.src = url;
          }
        }).catch(() => {});

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
            <div class="slot-standing-duo">
              <div class="slot-standing-figure slot-standing-sapidae" title="Sapidae: ${data.playerName || 'Sapidae'}">
                <img src="${sapidaePortrait}" alt="Sapidae" class="slot-fullbody-img">
                <div class="slot-ground-shadow"></div>
              </div>
              ${cachedPortrait ? `
                <div class="slot-standing-figure slot-standing-companion" title="Compañero Axie: ${hero.name || 'Shinji'}">
                  <img src="${cachedPortrait}" alt="${hero.name || 'Axie'}" class="slot-companion-fullbody-img">
                  <div class="slot-ground-shadow companion-shadow"></div>
                </div>
              ` : ''}
            </div>

            <div class="slot-hero-info">
              <h4 class="slot-hero-name">${data.playerName || 'Sapidae Adventurer'}</h4>
              <div class="slot-hero-archetype" style="color:#fbbf24; font-weight:600; display:flex; align-items:center; gap:6px;">
                <img src="${CLASS_PORTRAITS[sapidaeClassKey] || './assets/classes/class_forjacubiles.jpg'}" alt="${classDef.name}" class="slot-sapidae-class-icon">
                <span>${classDef.name}</span>
              </div>
              <div class="slot-hero-archetype" style="font-size:11px; color:#94a3b8; display:flex; align-items:center; gap:5px;">
                <img class="slot-class-icon" src="${getAxieClassIcon(hero.class || hero.heroKey || hero.archetype)}" alt="" title="Compañero Axie: ${hero.name}" style="width:14px; height:14px;">
                <span>Axie: <strong>${hero.name || 'Shinji'}</strong> (#${hero.axieId || '10455'})</span>
              </div>
              <div class="slot-level-zone" style="margin-top:4px;">
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
          this._confirmDeleteSlot(slotInfo.id, `${data.playerName || 'Sapidae'} & ${hero.name || 'Axie'}`);
        });

        card.addEventListener('click', () => {
          this._playSlot(slotInfo.id);
        });
      }

      grid.appendChild(card);
    });
  }

  _openHeroSelectForSlot(slotId) {
    if (this.audio && typeof this.audio.playSelect === 'function') {
      this.audio.playSelect();
    }
    this.pendingSlotId = slotId;
    this.selectedSapidaeClass = this.selectedSapidaeClass || 'crafter';
    this.selectedSapidaeModel = this.selectedSapidaeModel || 'sapidae-f-a';
    this.selectedCompanionKey = this.selectedCompanionKey || 'beast_rage';
    this.playerName = this.playerName || 'Ema';

    this._renderUnifiedStudio();

    this.heroSelectModal.classList.remove('hidden');
    this.heroSelectModal.style.display = 'flex';

    // Mount and start 3D Diorama
    const canvasContainer = document.getElementById('dofus-3d-canvas-container');
    if (canvasContainer) {
      if (this.diorama) {
        this.diorama.dispose();
        this.diorama = null;
      }
      this.diorama = new CharacterPreviewDiorama(canvasContainer);
      this.diorama.loadSapidae(this.selectedSapidaeModel, this.customization);

      const comp = HERO_ROSTER.find(h => h.heroKey === this.selectedCompanionKey) || HERO_ROSTER[0];
      if (comp) {
        this.diorama.loadCompanion(comp.axieId, comp.genes);
      }
      this.diorama.start();
    }
  }

  closeHeroSelect() {
    this._hideSkillTooltip();
    if (this.diorama) {
      this.diorama.dispose();
      this.diorama = null;
    }
    this.heroSelectModal.classList.add('hidden');
    this.heroSelectModal.style.display = 'none';
    this.pendingSlotId = null;
  }

  _createSlotAndStart(slotId, heroTemplate) {
    if (this.audio && typeof this.audio.playConfirm === 'function') {
      this.audio.playConfirm();
    }
    const nameInput = document.getElementById('dofus-char-name') || document.getElementById('char-name-input');
    if (nameInput && nameInput.value && nameInput.value.trim()) {
      this.playerName = nameInput.value.trim();
    }
    const classDef = SAPIDAE_CLASSES[this.selectedSapidaeClass] || SAPIDAE_CLASSES.crafter;
    const finalPlayerName = (this.playerName && this.playerName.trim()) ? this.playerName.trim() : `Sapidae (${classDef.name})`;

    let dynamicPortrait = null;
    if (this.diorama && typeof this.diorama.capturePortrait === 'function') {
      try {
        dynamicPortrait = this.diorama.capturePortrait();
      } catch (err) {
        console.warn('[StartScreenUI] Could not capture diorama portrait:', err);
      }
    }

    const templateWithSapidae = Object.assign({}, heroTemplate, {
      isSapidae: true,
      sapidaeModel: this.selectedSapidaeModel || 'sapidae-f-a',
      sapidaeClass: this.selectedSapidaeClass || 'crafter',
      customization: { ...this.customization },
      playerName: finalPlayerName,
      sapidaePortrait: dynamicPortrait
    });
    const newSlot = saveSlotManager.createSlot(slotId, templateWithSapidae);
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
