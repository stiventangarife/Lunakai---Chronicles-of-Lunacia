// FerryTravelUI.js — Barca de Pomodoro (Crónica Celeste, etapa 2)
// La elección de isla ya no es un panel aparte: Pomodoro pregunta «¿Hacia dónde ponemos rumbo?» y las islas
// aparecen como respuestas numeradas del diálogo (pantalla 21 del sistema de diseño). La isla actual sale
// bloqueada con su motivo y «Ahora no» siempre está disponible.
// API pública intacta: new FerryTravelUI(overworldManager), open(), close(), travel(islandId), isOpen, isTraveling.
import { ISLANDS_REGISTRY } from '../world/MapRegistry.js';

const ISLAND_ORDER = ['island_forest', 'island_savannah', 'island_arctic', 'island_mystic', 'island_dungeon'];
const FERRY_SPEAKER = { speaker: 'Pomodoro', title: 'Barquero de Lunacia', avatar: './assets/portraits/pomodoro.png', npcId: 'pomodoro', cls: 'bug', roleIcon: 'map' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class FerryTravelUI {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.isOpen = false;
    this.isTraveling = false;
    this.el = null;
    this._onKey = (e) => {
      if (!this.isOpen || e.code !== 'Escape') return;
      if (document.querySelector('#settings-modal.lk-is-open')) return;
      e.preventDefault();
      e.stopPropagation();
      this.close();
    };
  }

  _choices() {
    const currentZone = this.om?.worldMapManager?.currentMapId;
    const list = ISLAND_ORDER.map((id) => ISLANDS_REGISTRY[id]).filter(Boolean).map((island) => {
      const here = island.zoneId === currentZone;
      return {
        text: island.name,
        sub: here ? 'Estás aquí' : [island.tagline, island.levelRange].filter(Boolean).join(' · '),
        locked: here,
        islandId: island.id || ISLAND_ORDER.find((k) => ISLANDS_REGISTRY[k] === island),
        reply: {
          ...FERRY_SPEAKER,
          html: `¡Rumbo a <span class="lk-place">${esc(island.name)}</span>! Agárrate fuerte, que hoy sopla el viento del este.`
        },
        onSelect: (c) => { this._selected = c.islandId; }
      };
    });
    list.push({
      text: 'Ahora no',
      sub: 'Volver más tarde',
      leave: true,
      reply: { ...FERRY_SPEAKER, text: 'Como quieras. Aquí estaré cuando cambie la marea.' }
    });
    return list;
  }

  open() {
    if (this.isTraveling || this.isOpen) return;
    const ds = this.om?.dialogSystem;
    if (!ds) { console.warn('[FerryTravelUI] DialogSystem no disponible'); return; }
    this._selected = null;
    this.isOpen = true;
    window.addEventListener('keydown', this._onKey, true);
    ds.startDialogue([{ ...FERRY_SPEAKER, text: '¿Hacia dónde ponemos rumbo?', choices: this._choices() }], () => {
      const target = this._selected;
      this._release();
      if (target) this.travel(target);
    });
  }

  _release() {
    this.isOpen = false;
    window.removeEventListener('keydown', this._onKey, true);
  }

  close() {
    if (!this.isOpen) return;
    this._selected = null;
    this._release();
    const ds = this.om?.dialogSystem;
    if (ds && ds.isActive) ds.forceClose(false);
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
