// FerryTravelUI.js - Island selection shown by Pomodoro the ferryman (replaces the cardinal portal arrows)
import { ISLANDS_REGISTRY } from '../world/MapRegistry.js';

const ISLAND_ORDER = ['island_forest', 'island_savannah', 'island_arctic', 'island_mystic', 'island_dungeon'];

const STYLE = `
#ferry-travel-modal { position: fixed; inset: 0; z-index: 4200; display: flex; align-items: center; justify-content: center;
  background: rgba(6, 14, 24, 0.62); backdrop-filter: blur(3px); font-family: inherit; }
#ferry-travel-modal.hidden { display: none; }
#ferry-travel-modal .ferry-panel { width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow-y: auto;
  background: linear-gradient(180deg, #13263a 0%, #0c1a29 100%); border: 1px solid rgba(125, 211, 252, 0.35);
  border-radius: 16px; box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55); color: #e6f1fb; padding: 18px 18px 14px; }
#ferry-travel-modal .ferry-head { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
#ferry-travel-modal .ferry-head h3 { margin: 0; font-size: 1.15rem; letter-spacing: 0.02em; }
#ferry-travel-modal .ferry-sub { margin: 0 0 14px; font-size: 0.86rem; color: #9fb6cc; }
#ferry-travel-modal .ferry-list { display: grid; gap: 8px; }
#ferry-travel-modal .ferry-opt { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.10); border-left: 4px solid var(--c);
  border-radius: 12px; padding: 10px 12px; color: inherit; font: inherit; transition: background 0.15s, transform 0.15s; }
#ferry-travel-modal .ferry-opt:hover:not(:disabled), #ferry-travel-modal .ferry-opt:focus-visible { background: rgba(255, 255, 255, 0.10); transform: translateX(2px); outline: none; }
#ferry-travel-modal .ferry-opt:disabled { cursor: default; opacity: 0.55; }
#ferry-travel-modal .ferry-icon { font-size: 1.6rem; width: 2rem; text-align: center; }
#ferry-travel-modal .ferry-txt { display: flex; flex-direction: column; flex: 1; min-width: 0; }
#ferry-travel-modal .ferry-name { font-weight: 700; color: var(--c); }
#ferry-travel-modal .ferry-tag { font-size: 0.8rem; color: #9fb6cc; }
#ferry-travel-modal .ferry-meta { font-size: 0.74rem; color: #c8d8e8; white-space: nowrap; }
#ferry-travel-modal .ferry-foot { display: flex; justify-content: flex-end; margin-top: 12px; }
#ferry-travel-modal .ferry-close { cursor: pointer; background: transparent; color: #c8d8e8; border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px; padding: 6px 14px; font: inherit; }
`;

export class FerryTravelUI {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.isOpen = false;
    this.isTraveling = false;
    this.el = null;
    this._onKey = (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    };
  }

  _build() {
    if (this.el) return;
    if (!document.getElementById('ferry-travel-style')) {
      const st = document.createElement('style');
      st.id = 'ferry-travel-style';
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
    const el = document.createElement('div');
    el.id = 'ferry-travel-modal';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="ferry-panel" role="dialog" aria-modal="true" aria-labelledby="ferry-travel-title">
        <div class="ferry-head"><span class="ferry-icon">⛵</span><h3 id="ferry-travel-title">Barca de Pomodoro</h3></div>
        <p class="ferry-sub">Elige la isla a la que quieres navegar.</p>
        <div class="ferry-list"></div>
        <div class="ferry-foot"><button type="button" class="ferry-close">Quedarme aquí</button></div>
      </div>`;
    el.addEventListener('click', (e) => { if (e.target === el) this.close(); });
    el.querySelector('.ferry-close').addEventListener('click', () => this.close());
    document.body.appendChild(el);
    this.el = el;
  }

  _render() {
    const list = this.el.querySelector('.ferry-list');
    list.innerHTML = '';
    const currentZone = this.om?.worldMapManager?.currentMapId;
    ISLAND_ORDER.forEach((id) => {
      const island = ISLANDS_REGISTRY[id];
      if (!island) return;
      const here = island.zoneId === currentZone;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ferry-opt';
      btn.style.setProperty('--c', island.color || '#7dd3fc');
      btn.disabled = here;
      btn.innerHTML = `
        <span class="ferry-icon">${island.icon || '🏝️'}</span>
        <span class="ferry-txt"><span class="ferry-name"></span><span class="ferry-tag"></span></span>
        <span class="ferry-meta"></span>`;
      btn.querySelector('.ferry-name').textContent = island.name;
      btn.querySelector('.ferry-tag').textContent = island.tagline || '';
      btn.querySelector('.ferry-meta').textContent = here ? '📍 Estás aquí' : (island.levelRange || '');
      if (!here) btn.addEventListener('click', () => this.travel(id));
      list.appendChild(btn);
    });
  }

  open() {
    if (this.isTraveling) return;
    this._build();
    this._render();
    this.isOpen = true;
    this.el.classList.remove('hidden');
    window.addEventListener('keydown', this._onKey, true);
    const first = this.el.querySelector('.ferry-opt:not(:disabled)');
    if (first) first.focus();
    if (this.om?.audio && typeof this.om.audio.playHover === 'function') this.om.audio.playHover();
  }

  close() {
    this.isOpen = false;
    if (this.el) this.el.classList.add('hidden');
    window.removeEventListener('keydown', this._onKey, true);
  }

  /** Sails to another island behind the same loading curtain used by zone changes. */
  async travel(islandId) {
    const om = this.om;
    const wmm = om?.worldMapManager;
    const island = ISLANDS_REGISTRY[islandId];
    if (!wmm || !island || this.isTraveling) return;
    this.close();
    this.isTraveling = true;
    const tm = wmm.transitionManager;
    try {
      if (tm) {
        tm.isTransitioning = true;
        if (typeof tm.onTransitionStart === 'function') tm.onTransitionStart({ targetMap: island.zoneId });
        if (typeof tm.showLoading === 'function') tm.showLoading(`⛵ ${island.name}`, 'Pomodoro iza las velas...');
      }
      om.isLoadingZone = true;
      if (om.audio && typeof om.audio.playSfx === 'function') om.audio.playSfx('menu_confirm');
      await new Promise((r) => setTimeout(r, 450));
      await new Promise((r) => requestAnimationFrame(r));
      await wmm.travelToIsland(islandId);
      if (typeof om.waitForNextRenderFrame === 'function') await om.waitForNextRenderFrame(2);
      else await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (tm && typeof tm.hideLoading === 'function') await tm.hideLoading(500);
    } catch (e) {
      console.error('[FerryTravelUI] Travel failed:', e);
      if (tm && typeof tm.hideLoading === 'function') await tm.hideLoading(0);
    } finally {
      om.isLoadingZone = false;
      if (tm) {
        tm.isTransitioning = false;
        if (typeof tm.onTransitionEnd === 'function') tm.onTransitionEnd({ targetMap: island.zoneId });
      }
      this.isTraveling = false;
    }
  }
}
