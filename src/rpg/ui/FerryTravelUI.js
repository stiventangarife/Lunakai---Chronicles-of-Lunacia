// FerryTravelUI.js — Barca de Kawa, el barquero (Crónica Celeste, etapa 2; Pomodoro hasta el Hito 51)
// La elección de isla ya no es un panel aparte: Kawa pregunta «¿Hacia dónde ponemos rumbo?» y las islas
// aparecen como respuestas numeradas del diálogo (pantalla 21 del sistema de diseño). La isla actual sale
// bloqueada con su motivo y «Ahora no» siempre está disponible.
// API pública intacta: new FerryTravelUI(overworldManager), open(), close(), travel(islandId), isOpen, isTraveling.
import { ISLANDS_REGISTRY } from '../world/MapRegistry.js';
import * as i18n from '../../i18n/i18n.js';

const ISLAND_ORDER = ['island_forest', 'island_savannah', 'island_arctic', 'island_mystic', 'island_dungeon'];
const FERRY_SPEAKER = { speaker: 'Kawa', title: i18n.t('hud.ferryTitle'), avatar: './assets/portraits/kappa.png', npcId: 'kappa', cls: 'bug', roleIcon: 'map' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class FerryTravelUI {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.isOpen = false;
    this.isTraveling = false;
    this.el = null;
    // Espacio desactivado en el selector de islas: si se venía pulsando para pasar el saludo,
    // no debe elegir la primera isla por accidente (se elige con clic o con las teclas 1-5).
    this._onSpace = (e) => {
      if (!this.isOpen || e.code !== 'Space' || !this.om?.dialogSystem?.choicesOpen) return;
      e.preventDefault();
      e.stopPropagation();
    };
    this._onKey = (e) => {
      if (e.code === 'Space') { this._onSpace(e); return; }
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
        sub: here ? i18n.t('hud.youAreHere') : [island.tagline, island.levelRange && String(island.levelRange).replace('Nivel', i18n.t('hud.level'))].filter(Boolean).join(' · '),
        locked: here,
        islandId: island.id || ISLAND_ORDER.find((k) => ISLANDS_REGISTRY[k] === island),
        reply: {
          ...FERRY_SPEAKER,
          html: i18n.t('hud.ferrySetSail', { place: `<span class="lk-place">${esc(island.name)}</span>` })
        },
        onSelect: (c) => { this._selected = c.islandId; }
      };
    });
    list.push({
      text: i18n.t('hud.notNow'),
      sub: i18n.t('hud.comeBackLater'),
      leave: true,
      reply: { ...FERRY_SPEAKER, text: i18n.t('hud.ferryBye') }
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
    window.addEventListener('keyup', this._onSpace, true);
    ds.startDialogue([{ ...FERRY_SPEAKER, text: i18n.t('hud.ferryAsk'), choices: this._choices() }], () => {
      const target = this._selected;
      this._release();
      if (target) this.travel(target);
    });
  }

  _release() {
    this.isOpen = false;
    window.removeEventListener('keydown', this._onKey, true);
    window.removeEventListener('keyup', this._onSpace, true);
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
        if (typeof tm.showLoading === 'function') tm.showLoading(`${island.name}`, i18n.t('hud.ferrySails'));
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
