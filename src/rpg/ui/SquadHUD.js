// SquadHUD.js - Overworld Squad UI with Stylized Hero Frames, Real-Time 3D Portraits, HP, PA & PM
import { formatBond } from '../BondService.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import { SAPIDAE_CLASSES } from '../SaveSlotManager.js';
import { BondDemo } from './CombatEndScreen.js';
import * as i18n from '../../i18n/i18n.js';

export const SAPIDAE_CLASS_THEMES = {
  crafter: {
    className: 'class-sapidae-crafter',
    name: 'Forjacubiles',
    iconUrl: './assets/classes/class_forjacubiles.jpg',
    icon: '🔨',
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    role: 'Soporte y Escudos'
  },
  shepard: {
    className: 'class-sapidae-shepard',
    name: 'Susurrador',
    iconUrl: './assets/classes/class_susurrador.jpg',
    icon: '✨',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    role: 'Búfer Místico'
  },
  lunalogist: {
    className: 'class-sapidae-lunalogist',
    name: 'Lunalogista',
    iconUrl: './assets/classes/class_lunalogista.jpg',
    icon: '🌿',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    role: 'Control Botánico'
  },
  stargazer: {
    className: 'class-sapidae-stargazer',
    name: 'Astromante',
    iconUrl: './assets/classes/class_astromante.jpg',
    icon: '🔮',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.50)',
    role: 'Gravedad Cósmica'
  }
};

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
  if (c.includes('mech') || c.includes('mecá') || c.includes('meca')) return 'mech';
  if (c.includes('dawn') || c.includes('alba')) return 'dawn';
  if (c.includes('dusk') || c.includes('ocaso') || c.includes('crepús')) return 'dusk';

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

  if (heroId === 'bing') return 'beast';
  if (heroId === 'pomodoro') return 'bug';
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
      // El id del retrato del Sapidae lleva comillas (JSON de su aspecto): se escapa para el selector (19-oct)
      const sel = (v) => `.lk-party-med[data-hero-id="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(v)) : String(v).replace(/["\\]/g, '\\$&')}"]`;
      let card = this.container.querySelector(sel(id));
      if (!card && (id === 'sapidae' || (typeof id === 'string' && id.startsWith('sapidae_')))) {
        card = this.container.querySelector(`.lk-party-med[data-hero-id="sapidae"]`);
      }
      if (!card && this.equipmentManager) {
        for (const [hId, base] of Object.entries(this.equipmentManager.heroesBase)) {
          if (base.axieId === id) {
            card = this.container.querySelector(sel(hId));
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
      container.className = 'lk-party';
      if (this.parentContainer) {
        this.parentContainer.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }
    this.container = container;
  }

  _renderSoon() {
    if (this._soon) return;
    this._soon = setTimeout(() => { this._soon = null; this.render(); }, 120);
  }

  render() {
    if (!this.container || !this.equipmentManager) return;
    const em = this.equipmentManager;

    // Escuadrón elegido en el panel Escuadrón (tecla K); sin él, los héroes desbloqueados como antes
    const unlocked = typeof em.getSquad === 'function'
      ? em.getSquad().filter(Boolean)
      : (em.unlockedHeroes || ['kotaro']);
    const mainId = typeof em.getSquad === 'function' ? em.getSquad()[1] : null;

    // Columna del escuadrón a la derecha: medallones con marco dorado neutro, ficha de nivel y barra de vida fina.
    // El principal lleva el anillo de vínculo. Nombre, clase, PA, PM e iniciativa van en el tooltip.
    const CLS_ES = { beast: i18n.t('squadHud.clsBeast'), bird: i18n.t('squadHud.clsBird'), plant: i18n.t('squadHud.clsPlant'), aquatic: i18n.t('squadHud.clsAquatic'), bug: i18n.t('squadHud.clsBug'), reptile: i18n.t('squadHud.clsReptile') };
    const ROLE_ES = { 'Melee Duelist': i18n.t('squadHud.roleMelee'), 'Ranged Marksman': i18n.t('squadHud.roleRanged'), 'Healer & Control': i18n.t('squadHud.roleHealer'), 'Líder': i18n.t('squadHud.roleLeader') };
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    this._tips = {};
    const rows = unlocked.map((heroId) => {
      const base = em.heroesBase[heroId];
      if (!base) return '';
      const stats = em.getCalculatedStats(heroId) || { maxHP: 1 };
      const currHP = typeof em.getCurrentHP === 'function' ? em.getCurrentHP(heroId) : stats.maxHP;
      const hpPct = Math.max(0, Math.min(100, (currHP / Math.max(1, stats.maxHP)) * 100));
      const prog = em.getProgression(heroId);
      const req = typeof em.getRequiredExp === 'function' ? em.getRequiredExp(prog.level) : 100;
      const xpPct = Math.max(0, Math.min(100, Math.round((prog.currentExp / Math.max(1, req)) * 100)));
      const isSapidaeHero = heroId === 'sapidae' || Boolean(base.isSapidae);

      let portraitUrl = null;
      if (isSapidaeHero) {
        const modelId = base.modelType || 'sapidae-f-a';
        const custom = base.customization || (em.playerEntity?.customization) || null;
        const equipped = em.equipped?.sapidae || null;
        portraitUrl = portraitService.getSapidaePortraitSync(modelId, custom, equipped, { fullBody: true }) || portraitService.getPortraitSync(modelId);
        if (!portraitUrl) {
          portraitService.getSapidaeCustomPortrait(modelId, custom, equipped, { fullBody: true, zoomFactor: 1.10, yaw: -0.18, pitch: 0.03 });
        }
      } else {
        const portraitKey = base.axieId || heroId;
        // Axies con ID: solo su propio retrato (el de «kotaro» es de otro Axie); llega en cuanto se fotografía su modelo
        // Hito 93: su foto 3D; mientras se hace (Axie recién cargado por ID), la imagen del marketplace
        portraitUrl = base.axieId ? portraitService.axieUrl(base, () => this._renderSoon())
          : portraitService.getPortraitSync(portraitKey) || portraitService.getPortraitSync(heroId);
        if (!portraitUrl && !base.axieId) portraitService.getPortrait(portraitKey);
      }

      const isMain = heroId === mainId;
      const bond = isMain ? BondDemo.get(heroId) : 0;
      // Vínculo del principal: orbe pequeño con el corazón y el líquido rosa a su nivel (como el medidor de vínculo del sistema de diseño)
      const lvl = (24 * (1 - bond / 100)).toFixed(1);
      const ring = isMain
        ? `<span class="lk-pm-bond" title="${i18n.t('squadHud.bondTitle', { n: formatBond(bond) })}"><svg viewBox="0 0 26 26" aria-hidden="true"><defs><clipPath id="lkPmClip-${heroId}"><circle cx="13" cy="13" r="11"/></clipPath><linearGradient id="lkPmLiq-${heroId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD3E0"/><stop offset="1" stop-color="#E25C88"/></linearGradient></defs><circle cx="13" cy="13" r="11" fill="#121829"/><rect x="0" y="${(1 + +lvl).toFixed(1)}" width="26" height="26" fill="url(#lkPmLiq-${heroId})" clip-path="url(#lkPmClip-${heroId})"/><path d="M13 18.4l-.8-.7C9.3 15.1 7.4 13.4 7.4 11.3c0-1.7 1.3-3 3-3 .95 0 1.86.44 2.46 1.14.6-.7 1.51-1.14 2.46-1.14 1.7 0 3 1.3 3 3 0 2.1-1.9 3.8-4.8 6.4l-.52.7z" fill="#fff" stroke="rgba(11,15,28,.35)" stroke-width=".6"/><circle cx="13" cy="13" r="11.6" fill="none" stroke="#D3AE6C" stroke-width="1.2"/></svg></span>`
        : '';

      // Ficha del tooltip
      let clsName, role, clsIcon;
      if (isSapidaeHero) {
        const sKey = base.sapidaeClassKey || em?.playerEntity?.sapidaeClass || 'crafter';
        const sDef = SAPIDAE_CLASSES[sKey] || SAPIDAE_CLASSES.crafter;
        clsName = sDef.name;
        clsIcon = sDef.icon || sDef.iconImg || (SAPIDAE_CLASS_THEMES[sKey] || SAPIDAE_CLASS_THEMES.crafter).iconUrl;
        role = i18n.t('squadHud.roleLeader');
      } else {
        const cKey = getHeroClassKey(base, heroId);
        clsName = CLS_ES[cKey] || 'Axie';
        clsIcon = `./assets/classes/${cKey === 'dusk' ? 'dust' : cKey}.png`;
        const m = String(base.archetype || '').match(/\(([^)]+)\)/);
        const mEn = String(i18n.en(base.archetype || '')).match(/\(([^)]+)\)/); // rol en inglés para buscarlo (Hito 61)
        role = m ? (ROLE_ES[mEn && mEn[1]] || ROLE_ES[m[1]] || m[1]) : '';
      }
      const slot = isSapidaeHero ? i18n.t('squadHud.slotLeader') : isMain ? i18n.t('squadHud.slotMain') : i18n.t('squadHud.slotSupport');
      this._tips[heroId] = `<header><span class="lk-pt-cls ${isSapidaeHero ? 'lk-is-sapi' : ''}"><img src="${clsIcon}" alt="${esc(clsName)}"></span><div><small>${esc(slot)} · ${esc(clsName)}</small><b>${esc(base.name)}</b></div></header>
        <div class="lk-tt-body">
          ${role ? `<span class="lk-pt-role">${esc(role)}</span>` : ''}
          <div class="lk-pt-xp"><span>${i18n.t('squadHud.lv', { n: prog.level })}</span><span class="lk-bar lk-bar--xp" style="--v:${xpPct}%"><i></i></span><b>${xpPct}%</b></div>
          <div class="lk-tt-stats">
            <span class="lk-tt-stat">${i18n.t('squadHud.hp')}<b>${currHP} / ${stats.maxHP}</b></span>
            <span class="lk-tt-stat">${i18n.t('squadHud.ap')}<b>${stats.maxPA ?? '—'}</b></span>
            <span class="lk-tt-stat">${i18n.t('squadHud.mp')}<b>${stats.maxPM ?? '—'}</b></span>
            <span class="lk-tt-stat">${i18n.t('squadHud.initiative')}<b>${stats.initiative ?? '—'}</b></span>
            ${isMain ? `<span class="lk-tt-stat">${i18n.t('squadHud.bond')}<b style="color:var(--lk-bond-heart-magenta)">${bond}%</b></span>` : ''}
          </div>
          <span class="lk-tt-hint">${i18n.t('squadHud.clickHint')}</span>
        </div>`;

      return `<button type="button" class="lk-party-med ${isMain ? 'lk-is-main' : ''}" data-hero-id="${heroId}" aria-label="${i18n.t('squadHud.medAria', { name: esc(base.name), lv: prog.level, hp: currHP, max: stats.maxHP })}">
          <span class="lk-pm-frame"><img class="squad-avatar-img" src="${portraitUrl || ''}" alt="" style="${portraitUrl ? '' : 'display:none'}">${ring}<span class="lk-pm-lv">${prog.level}</span></span>
          <span class="lk-pm-hp ${hpPct <= 30 ? 'lk-is-low' : ''}"><i style="width:${hpPct}%"></i></span>
        </button>`;
    }).join('');
    this.container.innerHTML = rows;

    // Tooltip a la izquierda del medallón
    if (!this._tipEl) {
      this._tipEl = document.createElement('div');
      this._tipEl.className = 'lk-ui lk-tooltip-tactical lk-party-tip';
      this._tipEl.setAttribute('role', 'tooltip');
      document.body.appendChild(this._tipEl);
    }
    const tip = this._tipEl;
    const showTip = (btn) => {
      tip.innerHTML = this._tips[btn.dataset.heroId] || '';
      tip.classList.add('lk-is-on');
      const r = btn.getBoundingClientRect();
      const h = tip.offsetHeight, w = tip.offsetWidth;
      tip.style.left = `${Math.max(8, r.left - w - 12)}px`;
      tip.style.top = `${Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2))}px`;
    };
    const hideTip = () => tip.classList.remove('lk-is-on');
    hideTip();
    this.container.querySelectorAll('.lk-party-med').forEach((btn) => {
      btn.addEventListener('mouseenter', () => showTip(btn));
      btn.addEventListener('focus', () => showTip(btn));
      btn.addEventListener('mouseleave', hideTip);
      btn.addEventListener('blur', hideTip);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideTip();
        if (document.body.classList.contains('state-combat') ||
            (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
          return;
        }
        if (this.inventoryModal) this.inventoryModal.open(btn.dataset.heroId);
      });
    });

    // Oro arriba a la derecha y vida del Sapidae abajo al centro
    const goldEl = document.getElementById('hud-gold');
    if (goldEl) goldEl.textContent = i18n.num(typeof em.getGold === 'function' ? em.getGold() : (em.gold || 0));
    const bottom = document.getElementById('lk-ow-bottom');
    const sap = em.heroesBase.sapidae;
    if (bottom && sap) {
      const st = em.getCalculatedStats('sapidae') || { maxHP: 1 };
      const hp = typeof em.getCurrentHP === 'function' ? em.getCurrentHP('sapidae') : st.maxHP;
      const pct = Math.max(0, Math.min(100, (hp / Math.max(1, st.maxHP)) * 100));
      bottom.innerHTML = `<span class="lk-lvl">${sap.name} · ${i18n.t('squadHud.lvDot', { n: em.getProgression('sapidae').level })}</span><div class="lk-bar ${pct <= 30 ? 'lk-bar--low' : ''}" style="--v:${pct}%" title="${i18n.t('squadHud.hpTitle', { hp, max: st.maxHP })}"><i></i></div>`;
    }
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
    if (this._tipEl) this._tipEl.classList.remove('lk-is-on');
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
