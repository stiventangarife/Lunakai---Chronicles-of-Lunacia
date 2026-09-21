// SquadHUD.js - Overworld Squad UI with Stylized Hero Frames, Real-Time 3D Portraits, HP, PA & PM
import { portraitService } from '../../tactics/CharacterPortraitService.js';

export const AXIE_CLASS_THEMES = {
  beast: {
    className: 'class-beast',
    name: 'Beast',
    iconUrl: 'assets/classes/beast.png',
    icon: '⚔️',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    role: 'Melee Duelist'
  },
  bird: {
    className: 'class-bird',
    name: 'Bird',
    iconUrl: 'assets/classes/bird.png',
    icon: '🏹',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    role: 'Ranged Marksman'
  },
  plant: {
    className: 'class-plant',
    name: 'Plant',
    iconUrl: 'assets/classes/plant.png',
    icon: '🌱',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    role: 'Healer & Control'
  },
  aquatic: {
    className: 'class-aquatic',
    name: 'Aquatic',
    iconUrl: 'assets/classes/aquatic.png',
    icon: '🐟',
    color: '#0ea5e9',
    glowColor: 'rgba(14, 165, 233, 0.45)',
    role: 'Swift & Balanced'
  },
  bug: {
    className: 'class-bug',
    name: 'Bug',
    iconUrl: 'assets/classes/bug.png',
    icon: '🐛',
    color: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.45)',
    role: 'Disruptor & Charges'
  },
  reptile: {
    className: 'class-reptile',
    name: 'Reptile',
    iconUrl: 'assets/classes/reptile.png',
    icon: '🦎',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.45)',
    role: 'Tank & Poisons'
  }
};

export function getHeroClassKey(base, heroId) {
  const c = String(base?.class || '').toLowerCase();
  if (c.includes('bestia') || c.includes('beast')) return 'beast';
  if (c.includes('pájaro') || c.includes('pajaro') || c.includes('bird')) return 'bird';
  if (c.includes('planta') || c.includes('plant')) return 'plant';
  if (c.includes('acu') || c.includes('aquatic')) return 'aquatic';
  if (c.includes('bicho') || c.includes('bug')) return 'bug';
  if (c.includes('reptil') || c.includes('reptile')) return 'reptile';

  const key = String(base?.heroKey || '').toLowerCase();
  if (key.includes('beast') || key.includes('rage')) return 'beast';
  if (key.includes('bird') || key.includes('early')) return 'bird';
  if (key.includes('plant') || key.includes('yak')) return 'plant';

  const axieId = String(base?.axieId || '');
  if (axieId === '10455' || axieId === '11968787') return 'beast';
  if (axieId === '3797905') return 'bird';
  if (axieId === '10830416') return 'plant';

  const arch = String(base?.archetype || '').toLowerCase();
  if (arch.includes('bestia') || arch.includes('beast')) return 'beast';
  if (arch.includes('pájaro') || arch.includes('pajaro') || arch.includes('bird')) return 'bird';
  if (arch.includes('planta') || arch.includes('plant')) return 'plant';

  if (heroId === 'bing') return 'bird';
  if (heroId === 'pomodoro') return 'plant';
  return 'beast';
}

export class SquadHUD {
  constructor(parentContainer, equipmentManager = null, inventoryModal = null) {
    this.parentContainer = parentContainer || document.body;
    this.equipmentManager = equipmentManager;
    this.inventoryModal = inventoryModal;
    this.container = null;
    this._boundNotify = () => this.render();

    this._boundPortraitListener = (id, dataUrl) => {
      if (!this.container) return;
      let card = this.container.querySelector(`.squad-member-card[data-hero-id="${id}"]`);
      if (!card && this.equipmentManager) {
        for (const [hId, base] of Object.entries(this.equipmentManager.heroesBase)) {
          if (base.axieId === id) {
            card = this.container.querySelector(`.squad-member-card[data-hero-id="${hId}"]`);
            break;
          }
        }
      }
      if (card) {
        const img = card.querySelector('.squad-avatar-img');
        const icon = card.querySelector('.squad-avatar-icon');
        if (img) {
          img.src = dataUrl;
          img.style.display = 'block';
        }
        if (icon) {
          icon.style.display = 'none';
        }
      }
    };
    portraitService.addListener(this._boundPortraitListener);

    this._createDOM();
    if (this.equipmentManager) {
      this.equipmentManager.addListener(this._boundNotify);
    }
    this.render();
  }

  setEquipmentManager(equipmentManager) {
    if (this.equipmentManager && this._boundNotify) {
      this.equipmentManager.removeListener(this._boundNotify);
    }
    this.equipmentManager = equipmentManager;
    if (this.equipmentManager) {
      this.equipmentManager.addListener(this._boundNotify);
    }
    this.render();
  }

  _createDOM() {
    let container = document.getElementById('overworld-squad-hud');
    if (!container) {
      container = document.createElement('div');
      container.id = 'overworld-squad-hud';
      container.className = 'overworld-squad-hud';
      if (this.parentContainer) {
        this.parentContainer.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }
    this.container = container;
  }

  render() {
    if (!this.container || !this.equipmentManager) return;

    const unlocked = this.equipmentManager.unlockedHeroes || ['kotaro'];
    this.container.innerHTML = '';

    // Squad title header banner
    const headerEl = document.createElement('div');
    headerEl.className = 'squad-hud-header';
    headerEl.innerHTML = `
      <div class="squad-hud-title-wrap">
        <span class="squad-hud-title-icon">👥</span>
        <span class="squad-hud-title-text">SQUAD</span>
      </div>
      <span class="squad-hud-count">(${unlocked.length}/3)</span>
    `;
    this.container.appendChild(headerEl);

    // Cards list container
    const listEl = document.createElement('div');
    listEl.className = 'squad-hud-list';

    unlocked.forEach(heroId => {
      const base = this.equipmentManager.heroesBase[heroId];
      if (!base) return;

      const stats = this.equipmentManager.getCalculatedStats(heroId);
      const prog = this.equipmentManager.getProgression(heroId);
      const currHP = typeof this.equipmentManager.getCurrentHP === 'function' 
        ? this.equipmentManager.getCurrentHP(heroId) 
        : stats.maxHP;

      const classKey = getHeroClassKey(base, heroId);
      const theme = AXIE_CLASS_THEMES[classKey] || AXIE_CLASS_THEMES.beast;

      const hpPct = Math.max(0, Math.min(100, (currHP / stats.maxHP) * 100));

      // Dynamic 3D model portrait from PortraitService
      const portraitKey = base.axieId || heroId;
      const portraitUrl = portraitService.getPortraitSync(portraitKey) || portraitService.getPortraitSync(heroId);
      if (!portraitUrl) {
        portraitService.getPortrait(portraitKey);
      }

      const card = document.createElement('div');
      card.className = `squad-member-card ${theme.className}`;
      card.dataset.heroId = heroId;
      card.title = `Click to open Arsenal and Attributes for ${base.name} [I]`;

      card.innerHTML = `
        <!-- Stylized Axie portrait frame -->
        <div class="squad-portrait-frame">
          <div class="squad-frame-outer"></div>
          <div class="squad-frame-inner">
            <img class="squad-avatar-img" src="${portraitUrl || ''}" alt="${base.name}" style="${portraitUrl ? '' : 'display: none;'}">
            <span class="squad-avatar-icon" style="${portraitUrl ? 'display: none;' : ''}">${theme.icon}</span>
          </div>
          <span class="squad-level-badge">Lv. ${prog.level}</span>
          <div class="squad-frame-gem"></div>
        </div>

        <!-- Combat info and resources -->
        <div class="squad-info-col">
          <div class="squad-header-row">
            <span class="squad-hero-name">${base.name}</span>
            <img class="squad-class-icon" src="${theme.iconUrl}" alt="${theme.name}" title="Class: ${theme.name}">
          </div>

          <!-- Health Bar (HP) -->
          <div class="squad-hp-row">
            <div class="squad-hp-bar">
              <div class="squad-hp-fill" style="width: ${hpPct}%;"></div>
              <span class="squad-hp-text">${currHP} / ${stats.maxHP} HP</span>
            </div>
          </div>

          <!-- Action Points (AP) & Movement Points (MP) -->
          <div class="squad-points-row">
            <div class="squad-stat-badge pa-badge" title="Action Points to cast skills">
              <span class="badge-icon">⚡</span>
              <span class="badge-val">${stats.maxPA} AP</span>
            </div>
            <div class="squad-stat-badge pm-badge" title="Movement Points to move across tiles">
              <span class="badge-icon">👟</span>
              <span class="badge-val">${stats.maxPM} MP</span>
            </div>
          </div>
        </div>
      `;

      // Clic para abrir el inventario centrado en este Axie
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (document.body.classList.contains('state-combat') || 
            (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
          return;
        }
        if (this.inventoryModal) {
          this.inventoryModal.open(heroId);
        }
      });

      listEl.appendChild(card);
    });

    this.container.appendChild(listEl);
  }

  show() {
    if (this.container) {
      this.container.classList.remove('hidden');
    }
  }

  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
    }
  }

  destroy() {
    portraitService.removeListener(this._boundPortraitListener);
    if (this.equipmentManager && this._boundNotify) {
      this.equipmentManager.removeListener(this._boundNotify);
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
