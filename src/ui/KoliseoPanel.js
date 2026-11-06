// KoliseoPanel.js — Ventana del Koliseo (Koliseo, fase B1). Plan: docs/PLAN_DESAFIO_DE_LA_BRUMA.md.
// Tres pestañas: Arena PvP · Desafío de la Bruma · Clasificación (de la Arena y de la Bruma).
// Arena PvP (fase P3): la pestaña la lleva rpg/arena/ArenaFlow.js (panel.arena): puntos, cola, partida abierta.
// Se abre con el botón del HUD (#btn-open-koliseo) y desde el diálogo del Maestro Paladill.
// API: open(tab?), close(), toggle(), isOpen, onOpen, onClose, refresh(), flash(texto, tipo), setBusy(bool).
// Fase B2: onStartRun() (Empezar / Continuar intento) y onPrep('bag'|'squad'|'runes') (preparación entre combates).

import { koliseoService } from '../rpg/KoliseoService.js';
import { pvpService } from '../net/PvpService.js';
import { BATTLE_MAPS } from '../tactics/maps/BattleMaps.js';
import { buildBrumaPack } from '../rpg/koliseo/BrumaEncounter.js';
import { asset, esc, sprite, classIcon, curIcon } from './lk.js';
import { startPanelTour } from '../rpg/ui/PanelTour.js';
import * as i18n from '../i18n/i18n.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const MAT = { mat_lunar_shard: 'assets/materials/lunar_shard.webp', mat_amber_atia: 'assets/materials/atia_amber.webp' };
const BIOME = {
  forest:   { key: 'hud.biomeForest',   color: '#7BC47F' },
  savannah: { key: 'hud.biomeSavannah', color: '#E3B25A' },
  arctic:   { key: 'hud.biomeArctic',   color: '#86CDEB' },
  mystic:   { key: 'hud.biomeMystic',   color: '#B892F0' },
  genesis:  { key: 'hud.biomeGenesis',  color: '#F2C879' },
};
const TABS = ['arena', 'bruma', 'board'];
// Premios del top 3 de la Bruma: [puesto, bAXS, oro, materiales] (los da el servidor; aquí solo se muestran)
const BRUMA_PRIZE = [[1, 10, 1000, 3], [2, 6, 600, 2], [3, 4, 300, 1]];
const TAB_ICON = { arena: 'swords', bruma: 'pve', board: 'rank' }; // Hito 125: icono de cada pestaña

export class KoliseoPanel {
  constructor({ audio = null } = {}) {
    this.audio = audio;
    this.isOpen = false;
    this.tab = 'bruma';
    this.boardWeek = 'current'; // 'current' | 'last'
    this.boardKind = 'arena';   // 'arena' | 'bruma' (fase P3)
    this.boardSeason = 'current'; // 'current' | 'last' (Arena)
    this.arena = null;          // ArenaFlow (fase P3)
    this.onOpen = null;
    this.onClose = null;
    this.onStartRun = null;     // (week) => void · fase B2
    this.onPrep = null;         // ('bag'|'squad'|'runes') => void · fase B2
    this._flash = null;         // { text, kind } · resultado del último combate
    this._busy = false;
    this._week = null;
    this._timer = null;
    this._loadReq = 0;          // revisión: una respuesta vieja de la semana no pisa a una nueva
    this._foesCache = new Map(); // 'semana:combate' → HTML de los retratos (el grupo no cambia en toda la semana)
    this._createDOM();
  }

  // ------------------------------------------------------------ DOM
  _createDOM() {
    document.getElementById('lk-koliseo')?.remove();
    const m = document.createElement('div');
    m.id = 'lk-koliseo';
    m.className = 'lk-ui lk-backdrop lk-kol-layer hidden';
    m.innerHTML = `
      <div class="lk-panel-modal-window lk-kol" role="dialog" aria-modal="true" aria-labelledby="lk-kol-title">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I('tournament')}" alt=""></span>
          <h3 id="lk-kol-title"><small>${esc(i18n.t('koliseo.kicker'))}</small>${esc(i18n.t('koliseo.title'))}</h3>
          <div class="lk-segmented lk-kol__tabs" data-ref="tabs" role="tablist">
            ${TABS.map((t) => `<button type="button" role="tab" data-v="${t}" aria-pressed="${t === this.tab}" aria-selected="${t === this.tab}"><img class="lk-ai" src="${I(TAB_ICON[t])}" alt="">${esc(i18n.t(`koliseo.tab.${t}`))}</button>`).join('')}
          </div>
          <button type="button" class="lk-btn-close-x lk-cdx-help" data-codex="koliseo" data-ref="codex" aria-label="${esc(i18n.t('codex.help'))}" title="${esc(i18n.t('codex.help'))}">?</button>
          <button type="button" class="lk-btn-close-x" data-act="close" aria-label="${esc(i18n.t('koliseo.close'))}">${sprite('i-close')}</button>
        </div>
        <div class="lk-kol__body" data-ref="body"></div>
      </div>`;
    document.body.appendChild(m);
    this.el = m;
    this.$ = (r) => m.querySelector(`[data-ref="${r}"]`);
    m.addEventListener('click', (e) => {
      if (e.target === m) { this.close(); return; }
      const tabBtn = e.target.closest('[data-ref="tabs"] button');
      if (tabBtn) { this._setTab(tabBtn.dataset.v); return; }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') this.close();
      else if (act === 'retry') this._load(true);
      else if (act === 'start') this._start();
      else if (act === 'board-week') { this.boardWeek = e.target.closest('[data-act]').dataset.w; this._renderBoard(); }
      else if (act === 'board-kind') { this.boardKind = e.target.closest('[data-act]').dataset.k; this._renderBoard(); }
      else if (act === 'board-season') { this.boardSeason = e.target.closest('[data-act]').dataset.w; this._renderBoard(); }
      else if (act === 'arena-find') this.arena?.startSearch();
      else if (act === 'arena-cancel') this.arena?.cancel();
      else if (act === 'arena-resume') this.arena?.resume();
      else if (act === 'arena-retry') this.arena?.loadMe();
      else if (act === 'arena-flash-x') { if (this.arena) this.arena.flash = null; this.renderArena(); }
      else if (act === 'go-board') { this.boardKind = 'bruma'; this._setTab('board'); }
      else if (act === 'prep') this.onPrep?.(e.target.closest('[data-act]').dataset.k);
      else if (act === 'flash-x') { this._flash = null; this.$('body').querySelector('.lk-kol__flash')?.remove(); }
    });
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  // ------------------------------------------------------------ abrir y cerrar
  open(tab = null) {
    if (tab && TABS.includes(tab)) this.tab = tab;
    if (!this.isOpen) {
      this.isOpen = true;
      this.el.classList.remove('hidden');
      void this.el.offsetWidth;
      this.el.classList.add('lk-is-open');
      try { this.audio?.playBuff?.(); } catch (_) { /* nada */ }
      this._timer = setInterval(() => this._tick(), 30_000);
    }
    this._syncTabs();
    this._load(false);
    this.arena?.loadMe();
    clearInterval(this._fast);
    this._fast = setInterval(() => this._tickArena(), 1000);
    this.onOpen?.();
  }

  /** Hito 126: recorrido de 3 tarjetas (Arena · Bruma · Clasificación) la primera vez que se abre. */
  startTour({ onDone } = {}) {
    if (!this.isOpen) return null;
    const tab = (v) => () => this.el?.querySelector(`[data-ref="tabs"] [data-v="${v}"]`);
    return startPanelTour(this, {
      ns: 'tutorialDirector.koliseoTour',
      codex: 'koliseo',
      onDone,
      steps: [{ el: tab('arena'), key: 'arena' }, { el: tab('bruma'), key: 'bruma' }, { el: tab('board'), key: 'board' }],
    });
  }
  get tourActive() { return Boolean(this.__lkTour?.active); }

  close() {
    this.__lkTour?.stop(false); // Hito 126: el recorrido se repite la próxima vez
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('lk-is-open');
    this.el.classList.add('hidden');
    clearInterval(this._timer);
    clearInterval(this._fast);
    this._timer = null;
    this._fast = null;
    this.onClose?.();
  }

  toggle(tab = null) { if (this.isOpen) this.close(); else this.open(tab); }

  /** Vuelve a pedir la semana y repinta (tras un combate o un error). */
  refresh() { if (this.isOpen) return this._load(true); return Promise.resolve(); }

  /** Mensaje del resultado en la pestaña de la Bruma. kind: good | warn | bad. Se queda hasta cerrarlo o hasta el siguiente. */
  flash(text, kind = 'good') {
    this._flash = text ? { text, kind } : null;
    if (this.isOpen && this.tab === 'bruma') this._render();
  }

  setBusy(on) {
    this._busy = Boolean(on);
    const btn = this.$('body').querySelector('[data-act="start"]');
    if (btn) { btn.disabled = this._busy || btn.dataset.off === '1'; btn.classList.toggle('lk-is-busy', this._busy); }
  }

  _setTab(tab) {
    if (!TABS.includes(tab) || tab === this.tab) return;
    this.tab = tab;
    this._syncTabs();
    this._render();
    if (tab === 'arena' && !this.arena?.searching) this.arena?.loadMe();
  }

  _syncTabs() {
    const help = this.el?.querySelector('[data-ref="codex"]'); // Hito 126: el «?» lleva a su capítulo del Códice
    if (help) help.dataset.codex = this.tab === 'bruma' ? 'mist' : 'koliseo';
    this.$('tabs').querySelectorAll('button').forEach((b) => {
      const on = String(b.dataset.v === this.tab);
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-selected', on);
    });
  }

  // ------------------------------------------------------------ datos
  async _load(force) {
    if (!koliseoService.available) { this._week = null; this._error = 'offline'; this._render(); return; }
    this._error = null;
    if (!this._week || force) this._renderLoading();
    const req = ++this._loadReq;
    let week = null, error = null;
    try { week = await koliseoService.week({ force }); } catch (err) { error = err; }
    if (req !== this._loadReq) return; // llegó otra carga más nueva
    if (error) {
      console.warn('[Koliseo] semana', error);
      this._error = error?.code === 'network' ? 'network' : 'server';
    } else {
      if (this._week?.week !== week.week || this._week?.seed !== week.seed) this._foesCache.clear();
      this._week = week;
    }
    if (this.isOpen) this._render();
  }

  _tick() {
    if (!this.isOpen || this.tab !== 'bruma') return;
    const el = this.$('body').querySelector('[data-ref="countdown"]');
    if (el && this._week) el.textContent = this._countdown(this._week.ends_at);
  }

  // ------------------------------------------------------------ pintar
  _render() {
    if (this.tab === 'arena') return this._renderArena();
    if (this.tab === 'board') return this._renderBoard();
    return this._renderBruma();
  }

  _renderLoading() {
    this.$('body').innerHTML = `<div class="lk-kol__state"><span class="lk-kol__spin" aria-hidden="true"></span><p>${esc(i18n.t('koliseo.loading'))}</p></div>`;
  }

  /**
   * Fase B3: retratos de los enemigos del combate. El grupo sale de la misma semilla que el combate real
   * (buildBrumaPack), así que lo que se ve aquí es lo que se encontrará. Jefe primero y marcado.
   */
  _foesHtml(w, s) {
    const key = `${w.week}:${w.seed}:${s.stage}:${s.pick}`;
    let html = this._foesCache.get(key);
    if (html == null) { html = this._buildFoesHtml(w, s); this._foesCache.set(key, html); }
    return html;
  }

  _buildFoesHtml(w, s) {
    let members = [];
    try { members = buildBrumaPack({ biome: w.biome, seed: w.seed, stage: s }).pack.members || []; } catch { return ''; }
    if (!members.length) return '';
    const nameOf = (m) => {
      const k = `enemies.arch.${m.archetypeId}.name`;
      const t = i18n.t(k);
      return t && t !== k ? t : m.type;
    };
    const heads = members.map((m) => {
      const boss = Boolean(m.isBrumaBoss);
      const label = boss ? i18n.t('koliseo.bruma.bossFoe', { name: nameOf(m) }) : nameOf(m);
      return `<span class="lk-kol__foe ${boss ? 'lk-is-boss' : ''}" title="${esc(label)}"><img src="./assets/portraits/${esc(m.type)}.png" alt="${esc(label)}" loading="lazy" onerror="this.style.visibility='hidden'"></span>`;
    }).join('');
    return `<span class="lk-kol__foes" aria-label="${esc(i18n.t('koliseo.bruma.foes', { n: members.length }))}">${heads}</span>`;
  }

  _renderError() {
    const msg = this._error === 'offline' ? i18n.t('koliseo.offline') : i18n.t('koliseo.error');
    this.$('body').innerHTML = `<div class="lk-kol__state"><p>${esc(msg)}</p>
      ${this._error === 'offline' ? '' : `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="retry"><span class="lk-b-ico"><img class="lk-ai" src="${I('replay')}" alt=""></span>${esc(i18n.t('koliseo.retry'))}</button>`}</div>`;
  }

  /** Pestaña de la Arena (la repinta también ArenaFlow cuando cambia la cola o lo mío). */
  renderArena() { if (this.isOpen && this.tab === 'arena') this._renderArena(); }

  _tickArena() {
    if (!this.isOpen || this.tab !== 'arena') return;
    const a = this.arena;
    const el = this.$('body').querySelector('[data-ref="waited"]');
    if (el && a?.search) el.textContent = i18n.t('arena.waited', { s: Math.max(0, Math.floor((Date.now() - a.search.since) / 1000)) });
    const cd = this.$('body').querySelector('[data-ref="arena-ends"]');
    if (cd && a?.me?.endsAt) cd.textContent = this._countdown(a.me.endsAt, 'arena.endsIn');
  }

  _renderArena() {
    const body = this.$('body');
    const a = this.arena;
    if (!koliseoService.available) { this._error = 'offline'; this._renderError(); return; }
    if (!a || !a.available) {
      body.innerHTML = `<section class="lk-kol__soon">
        <span class="lk-kol__soon-ico"><img class="lk-ai" src="${I('swords')}" alt=""></span>
        <h4>${esc(i18n.t('koliseo.tab.arena'))}</h4>
        <p>${esc(i18n.t('arena.guest'))}</p>
        <ul>${['koliseo.arena.p1', 'koliseo.arena.p2', 'koliseo.arena.p3', 'koliseo.arena.p4'].map((k) => `<li>${esc(i18n.t(k))}</li>`).join('')}</ul>
      </section>`;
      return;
    }
    const me = a.me;
    if (!me) {
      body.innerHTML = a.meError
        ? `<div class="lk-kol__state"><p>${esc(i18n.t('koliseo.error'))}</p><button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="arena-retry"><span class="lk-b-ico"><img class="lk-ai" src="${I('replay')}" alt=""></span>${esc(i18n.t('koliseo.retry'))}</button></div>`
        : `<div class="lk-kol__state"><span class="lk-kol__spin" aria-hidden="true"></span><p>${esc(i18n.t('koliseo.loading'))}</p></div>`;
      return;
    }
    const rivalOf = (m) => (m ? m[m.side === 'A' ? 'B' : 'A']?.name || '?' : '?');
    const open = me.match && (me.match.status === 'active' || me.match.status === 'ended') ? me.match : null;
    const review = me.match && me.match.status === 'disputed' ? me.match : null;
    const flash = a.flash ? `<div class="lk-kol__flash lk-is-${a.flash.kind}" role="status"><span>${esc(a.flash.text)}</span><button type="button" class="lk-btn-close-x" data-act="arena-flash-x" aria-label="${esc(i18n.t('koliseo.close'))}">${sprite('i-close')}</button></div>` : '';
    const slpLeft = Number(me.slpWinsLeft ?? 0);
    // Hito 125: tarjeta de la temporada (puntos y puesto grandes, partidas en fichas, SLP de hoy en una línea)
    const rank = Number(me.rank) || 0;
    const medal = rank > 0 && rank <= 3 ? `lk-is-m${rank}` : '';
    const season = `<section class="lk-kol__card lk-kol__season" aria-labelledby="lk-kol-season-h">
        <div class="lk-kol__cardhead">
          <small id="lk-kol-season-h">${esc(i18n.t('arena.season', { season: me.season || '' }))}</small>
          <span class="lk-kol__pill"><img class="lk-ai" src="${I('hourglass')}" alt=""><span data-ref="arena-ends">${esc(me.endsAt ? this._countdown(me.endsAt, 'arena.endsIn') : '')}</span></span>
        </div>
        <div class="lk-kol__score">
          <span class="lk-kol__rankbadge ${medal}" title="${esc(i18n.t('arena.rank'))}">${esc(rank ? i18n.t('arena.rankValue', { n: rank }) : '—')}</span>
          <div class="lk-kol__pts"><b>${esc(i18n.num(me.points ?? 1000))}</b><small>${esc(i18n.t('arena.points'))}${rank ? '' : ` · ${esc(i18n.t('arena.noRank'))}`}</small></div>
          ${me.streak > 1 ? `<span class="lk-kol__streak" title="${esc(i18n.t('arena.streak'))}">${esc(i18n.t('arena.streak'))} · ${esc(i18n.t('arena.streakValue', { n: me.streak }))}</span>` : ''}
        </div>
        <ul class="lk-kol__record" aria-label="${esc(i18n.t('arena.recordValue', { w: me.wins || 0, l: me.losses || 0, d: me.draws || 0 }))}">
          <li class="lk-is-win"><b>${esc(i18n.num(me.wins || 0))}</b><small>${esc(i18n.t('arena.wins'))}</small></li>
          <li class="lk-is-loss"><b>${esc(i18n.num(me.losses || 0))}</b><small>${esc(i18n.t('arena.losses'))}</small></li>
          <li class="lk-is-draw"><b>${esc(i18n.num(me.draws || 0))}</b><small>${esc(i18n.t('arena.draws'))}</small></li>
        </ul>
        <p class="lk-kol__slpline ${slpLeft > 0 ? '' : 'lk-is-done'}"><img src="${curIcon('slp')}" alt="SLP"><span>${esc(slpLeft > 0 ? i18n.t('arena.slpLine', { n: slpLeft, slp: me.slpPerWin ?? 15 }) : i18n.t('arena.slpTodayNone'))}</span></p>
      </section>`;
    let cta;
    if (open) {
      cta = `<p class="lk-kol__note">${esc(i18n.t('arena.resumeNote', { name: rivalOf(open) }))}</p>
        <button type="button" class="lk-btn lk-btn-primary-gold" data-act="arena-resume"><span class="lk-b-ico"><img class="lk-ai" src="${I('swords')}" alt=""></span>${esc(i18n.t('arena.resume'))}</button>`;
    } else if (a.search) {
      const s = a.search;
      const win = s.status === 'retrying' ? i18n.t('arena.retrying') : s.window == null ? '' : s.window >= 9999 ? i18n.t('arena.windowAny') : i18n.t('arena.window', { n: s.window });
      // Hito 125: Cancelar dentro de la caja de búsqueda (la tarjeta no crece mientras se busca)
      cta = `<div class="lk-kol__search lk-kol__search--inline"><span class="lk-kol__spin" aria-hidden="true"></span>
          <span role="status" aria-live="polite"><b>${esc(i18n.t('arena.searching'))}</b><small><span data-ref="waited">${esc(i18n.t('arena.waited', { s: Math.max(0, Math.floor((Date.now() - s.since) / 1000)) }))}</span>${win ? ` · ${esc(win)}` : ''}</small></span>
          <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="arena-cancel">${esc(i18n.t('arena.cancel'))}</button></div>`;
    } else {
      cta = `${review ? `<p class="lk-kol__note">${esc(i18n.t('arena.reviewNote', { name: rivalOf(review) }))}</p>` : ''}
        <button type="button" class="lk-btn lk-btn-primary-gold" data-act="arena-find" ${review ? 'disabled' : ''}><span class="lk-b-ico"><img class="lk-ai" src="${I('swords')}" alt=""></span>${esc(i18n.t('arena.find'))}</button>`;
    }
    // Hito 125: tarjeta de jugar (acción principal arriba, reglas como lista con iconos)
    const play = `<section class="lk-kol__card lk-kol__play" aria-labelledby="lk-kol-play-h">
        <h5 id="lk-kol-play-h">${esc(i18n.t('arena.play.title'))}</h5>
        <p class="lk-kol__lead">${esc(i18n.t('arena.play.sub'))}</p>
        <div class="lk-kol__cta lk-kol__cta--block">${cta}</div>
        <ul class="lk-kol__rulelist">
          <li><img class="lk-ai" src="${I('info')}" alt="">${esc(i18n.t('arena.rules'))}</li>
          <li><img class="lk-ai" src="${I('hourglass')}" alt="">${esc(i18n.t('arena.turnRule', { s: 45 }))}</li>
        </ul>
      </section>`;
    // Hito 125: historial con resultado en texto e icono (no solo color), tablero y hace cuánto
    const recent = (me.recent || []).map((r) => {
      const where = [this._mapName(r.map), r.at ? this._ago(r.at) : ''].filter(Boolean).join(' · ');
      const d = r.delta != null ? Number(r.delta) : null;
      return `<li class="lk-is-${esc(r.result)}">
        <span class="lk-kol__res">${esc(i18n.t(`arena.res.${r.result}`))}</span>
        <span class="lk-kol__vs"><b>${esc(i18n.t('arena.vs', { name: r.rival || '?' }))}</b>${where ? `<small>${esc(where)}</small>` : ''}</span>
        <em>${d != null ? esc(d > 0 ? `+${d}` : String(d)) : ''}</em></li>`;
    }).join('');
    body.innerHTML = `
      <section class="lk-kol__arena lk-kol__arena--v2">
        ${flash}
        <div class="lk-kol__arenagrid">${season}${play}</div>
        <section class="lk-kol__history" aria-labelledby="lk-kol-recent-h">
          <h5 class="lk-kol__sub" id="lk-kol-recent-h">${esc(i18n.t('arena.recent'))}</h5>
          ${recent ? `<ul class="lk-kol__recent">${recent}</ul>` : `<p class="lk-kol__note">${esc(i18n.t('arena.recentEmpty'))}</p>`}
        </section>
      </section>`;
  }

  /** Nombre del tablero en el idioma del juego (historial de la Arena). */
  _mapName(id) {
    const m = BATTLE_MAPS[id];
    if (!m) return '';
    return i18n.lang() === 'es' ? m.nameEs || m.name : m.name;
  }

  /** «hace 2 h» (historial de la Arena). */
  _ago(iso) {
    const ms = koliseoService.serverNow() - new Date(iso).getTime();
    if (!(ms >= 0)) return '';
    const m = Math.floor(ms / 60_000);
    if (m < 60) return i18n.t('arena.ago.m', { n: Math.max(1, m) });
    const h = Math.floor(m / 60);
    if (h < 24) return i18n.t('arena.ago.h', { n: h });
    return i18n.t('arena.ago.d', { n: Math.floor(h / 24) });
  }

  _renderBruma() {
    if (this._error && !this._week) return this._renderError();
    const w = this._week;
    if (!w) return this._renderLoading();
    const b = BIOME[w.biome] || BIOME.forest;
    const me = w.me;
    const run = me?.active || null;
    const stages = w.config?.stages || [];
    const mod = w.config?.modifier;
    const ended = koliseoService.serverNow() >= new Date(w.ends_at).getTime();

    const stageCard = (s) => {
      const map = BATTLE_MAPS[s.map];
      const mapName = map ? (i18n.lang() === 'es' ? map.nameEs || map.name : map.name) : s.map;
      let state = '';
      if (run) state = s.stage < run.stage ? 'done' : s.stage === run.stage ? 'now' : '';
      const badge = s.rank === 'boss' ? `<em class="lk-kol__tag lk-is-boss">${esc(i18n.t('koliseo.bruma.boss'))}</em>`
        : s.rank === 'strong' ? `<em class="lk-kol__tag">${esc(i18n.t('koliseo.bruma.strong'))}</em>` : '';
      const status = state === 'done' ? `<span class="lk-kol__st lk-is-done" title="${esc(i18n.t('koliseo.bruma.stageDone'))}"><img class="lk-ai" src="${I('tick')}" alt="${esc(i18n.t('koliseo.bruma.stageDone'))}"></span>`
        : state === 'now' ? `<span class="lk-kol__st lk-is-now lk-is-label">${esc(i18n.t('koliseo.bruma.stageNow'))}</span>` : '';
      const threat = Math.max(0, Math.min(1, (Number(s.mult) - 1) / 2)); // Hito 125: 0 (×1) → 1 (×3): del dorado al carmesí
      return `<li class="lk-kol__stage ${state ? `lk-is-${state}` : ''} ${s.rank === 'boss' ? 'lk-is-bossstage' : ''}" style="--threat:${threat.toFixed(2)}">
        <span class="lk-kol__head"><span class="lk-kol__num">${s.stage}</span><b>${esc(i18n.t('koliseo.bruma.stage', { n: s.stage }))}</b>${status}</span>
        <small>${esc(mapName)}</small>
        <span class="lk-kol__meta"><span class="lk-kol__mult" title="${esc(i18n.t('koliseo.bruma.multHint', { x: i18n.num(s.mult) }))}">${esc(i18n.t('koliseo.bruma.mult', { x: i18n.num(s.mult) }))}</span>${badge}</span>
        ${this._foesHtml(w, s)}
      </li>`;
    };

    // Hito 125: barra inferior con los intentos como marcas, la mejor marca y el intento en curso
    let side;
    if (!me) {
      side = `<p class="lk-kol__note">${esc(i18n.t('koliseo.bruma.guest'))}</p>`;
    } else {
      const guestNote = me.guest ? `<p class="lk-kol__note">${esc(i18n.t('koliseo.bruma.guest'))}</p>` : '';
      const best = me.best && (me.best.cleared > 0 || me.best.defeats > 0)
        ? i18n.t('koliseo.bruma.bestValue', { cleared: me.best.cleared, turns: me.best.turns })
        : i18n.t('koliseo.bruma.noBest');
      const max = Number(w.attempts) || 2;
      const pips = Array.from({ length: max }, (_, i) => `<i class="${i < me.left ? 'lk-is-on' : ''}"></i>`).join('');
      side = `<dl class="lk-kol__barstats">
          <div><dt>${esc(i18n.t('koliseo.bruma.attempts'))}</dt><dd><span class="lk-kol__pips" aria-hidden="true">${pips}</span>${esc(i18n.t('koliseo.bruma.attemptsLeft', { n: me.left, max: w.attempts }))}</dd></div>
          <div><dt>${esc(i18n.t('koliseo.bruma.best'))}</dt><dd>${esc(best)}</dd></div>
          ${run ? `<div class="lk-is-run"><dt>${esc(i18n.t('koliseo.bruma.activeLabel'))}</dt><dd>${esc(i18n.t('koliseo.bruma.active', { stage: Math.min(run.stage, 5), defeats: run.defeats, max: w.max_defeats }))}</dd></div>` : ''}
        </dl>${guestNote}`;
    }
    // Preparación entre combates (solo con un intento en curso)
    const prep = run ? `<div class="lk-kol__prep"><small>${esc(i18n.t('koliseo.prep.title'))}</small>
      <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="prep" data-k="bag"><span class="lk-b-ico"><img class="lk-ai" src="${I('inventory')}" alt=""></span>${esc(i18n.t('koliseo.prep.bag'))}</button>
      <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="prep" data-k="squad"><span class="lk-b-ico"><img class="lk-ai" src="${I('team')}" alt=""></span>${esc(i18n.t('koliseo.prep.squad'))}</button>
      <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="prep" data-k="runes"><span class="lk-b-ico"><img class="lk-ai" src="${I('rune')}" alt=""></span>${esc(i18n.t('koliseo.prep.runes'))}</button>
    </div>` : '';
    const flash = this._flash ? `<div class="lk-kol__flash lk-is-${this._flash.kind}" role="status"><span>${esc(this._flash.text)}</span><button type="button" class="lk-btn-close-x" data-act="flash-x" aria-label="${esc(i18n.t('koliseo.close'))}">${sprite('i-close')}</button></div>` : '';

    // Botón principal: la fase B2 conecta onStartRun; hasta entonces queda desactivado con su aviso
    const canPlay = typeof this.onStartRun === 'function' && !ended;
    const noAttempts = Boolean(me && !run && me.left <= 0);
    const off = !canPlay || noAttempts;
    const label = run ? i18n.t('koliseo.bruma.continue') : i18n.t('koliseo.bruma.start');
    // Hito 125: sin intentos se dice cuándo vuelven (antes, «vuelve el lunes» sin tiempo)
    const note = ended ? i18n.t('koliseo.bruma.ended')
      : noAttempts ? this._countdown(w.ends_at, 'koliseo.bruma.resets')
        : !canPlay ? i18n.t('koliseo.bruma.soon') : '';

    this.$('body').innerHTML = `
      <section class="lk-kol__bruma" style="--biome:${b.color}">
        ${flash}
        ${this._error ? `<p class="lk-kol__warn" role="status">${esc(i18n.t('koliseo.stale'))} <button type="button" class="lk-kol__link" data-act="retry">${esc(i18n.t('koliseo.retry'))}</button></p>` : ''}
        <header class="lk-kol__hero">
          <div>
            <small>${esc(i18n.t('koliseo.bruma.thisWeek'))} · ${esc(w.week)}</small>
            <h4>${esc(i18n.t('koliseo.bruma.titleBiome', { biome: i18n.t(b.key) }))}</h4>
            <span class="lk-kol__count" data-ref="countdown">${esc(this._countdown(w.ends_at))}</span>
          </div>
          ${mod ? `<aside class="lk-kol__mod"><small>${esc(i18n.t('koliseo.bruma.modifier'))}</small><b>${esc(i18n.t(`koliseo.mod.${mod}.name`))}</b><span>${esc(i18n.t(`koliseo.mod.${mod}.desc`))}</span></aside>` : ''}
        </header>
        <ol class="lk-kol__stages">${stages.map(stageCard).join('')}</ol>
        ${prep}
        <div class="lk-kol__bar">
          <div class="lk-kol__side">${side}</div>
          <div class="lk-kol__cta">
            <button type="button" class="lk-btn lk-btn-primary-gold ${this._busy ? 'lk-is-busy' : ''}" data-act="start" data-off="${off ? 1 : 0}" ${off || this._busy ? 'disabled' : ''} ${note ? 'aria-describedby="lk-kol-start-note"' : ''}><span class="lk-b-ico"><img class="lk-ai" src="${I('swords')}" alt=""></span>${esc(label)}</button>
            ${note ? `<small id="lk-kol-start-note" ${noAttempts ? `title="${esc(i18n.t('koliseo.bruma.noAttempts'))}"` : ''}>${esc(note)}</small>` : ''}
          </div>
        </div>
        <div class="lk-kol__info">
          <ul class="lk-kol__chips">${String(i18n.t('koliseo.bruma.rules')).replace(/\.\s*$/, '').split(' · ').map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          <p class="lk-kol__prizeline"><small>${esc(i18n.t('koliseo.bruma.prizesShort'))}</small>
            <img src="${curIcon('baxs')}" alt="bAXS" title="bAXS"><img src="${asset(MAT.mat_lunar_shard)}" alt="" title="${esc(i18n.t('items.mat_lunar_shard.name'))}"><img src="${asset(MAT.mat_amber_atia)}" alt="" title="${esc(i18n.t('items.mat_amber_atia.name'))}"><img src="${curIcon('gold')}" alt="" title="${esc(i18n.t('shop.gold'))}">
            <button type="button" class="lk-kol__link" data-act="go-board">${esc(i18n.t('koliseo.bruma.seeBoard'))}</button></p>
        </div>
      </section>`;
  }

  /** Selector Arena / Bruma de la pestaña de clasificación (fase P3). Hito 125: con el selector de periodo en la misma barra. */
  _kindSwitch(period = '') {
    return `<div class="lk-kol__boardbar">
      <div class="lk-segmented lk-kol__kinds" role="tablist">
        <button type="button" data-act="board-kind" data-k="arena" aria-pressed="${this.boardKind === 'arena'}"><img class="lk-ai" src="${I('swords')}" alt="">${esc(i18n.t('arena.board.title'))}</button>
        <button type="button" data-act="board-kind" data-k="bruma" aria-pressed="${this.boardKind === 'bruma'}"><img class="lk-ai" src="${I('pve')}" alt="">${esc(i18n.t('koliseo.board.bruma'))}</button>
      </div>
      ${period}
    </div>`;
  }

  /** Hito 125: tira de premios con los puestos iguales agrupados (1 · 2 · 3 · 4–5 · 6–10). */
  _payoutStrip(payout) {
    const groups = [];
    payout.forEach((v, i) => {
      const g = groups[groups.length - 1];
      if (g && g.v === v) g.b = i + 1; else groups.push({ a: i + 1, b: i + 1, v });
    });
    return `<div class="lk-kol__prizestrip"><small>${esc(i18n.t('arena.board.prizesTitle'))}</small><ul>
      ${groups.map((g) => `<li>${g.a === g.b && g.a <= 3 ? `<span class="lk-kol__medal lk-is-m${g.a}">${g.a}</span>` : `<span class="lk-kol__rk">${g.a === g.b ? g.a : `${g.a}–${g.b}`}</span>`}<span class="lk-kol__pz"><img src="${curIcon('baxs')}" alt="bAXS">${esc(i18n.num(g.v))}</span></li>`).join('')}
    </ul></div>`;
  }

  _renderBoard() {
    return this.boardKind === 'arena' ? this._renderArenaBoard() : this._renderBrumaBoard();
  }

  /** Clasificación de la temporada de la Arena (pvp_board). */
  async _renderArenaBoard() {
    const body = this.$('body');
    const cur = this.arena?.me?.season || null;
    const prevSeason = (sid) => {
      const [y, m] = String(sid || '').split('-').map(Number);
      if (!y || !m) return null;
      return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    };
    const season = this.boardSeason === 'last' ? prevSeason(cur) : cur;
    const head = this._kindSwitch(`
        <div class="lk-segmented lk-kol__weeks">
          <button type="button" data-act="board-season" data-w="current" aria-pressed="${this.boardSeason === 'current'}">${esc(i18n.t('arena.board.season'))}</button>
          <button type="button" data-act="board-season" data-w="last" aria-pressed="${this.boardSeason === 'last'}" ${cur ? '' : 'disabled'}>${esc(i18n.t('arena.board.lastSeason'))}</button>
        </div>`);
    body.innerHTML = `${head}<div class="lk-kol__state"><span class="lk-kol__spin" aria-hidden="true"></span></div>`;
    const req = (this._boardReq = Symbol('board'));
    let data = null, error = null;
    try {
      data = await pvpService.board(season);
      if (data?.ok === false) error = { code: data.error };
    } catch (err) { error = err; }
    if (req !== this._boardReq || !this.isOpen || this.tab !== 'board' || this.boardKind !== 'arena') return; // llegó tarde
    if (error) {
      const unknown = error.code === 'unknown_season';
      body.innerHTML = `${head}<div class="lk-kol__state"><p>${esc(unknown ? i18n.t('arena.board.noSeason') : i18n.t('koliseo.error'))}</p>
        ${unknown ? '' : `<button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="board-season" data-w="${this.boardSeason}">${esc(i18n.t('koliseo.retry'))}</button>`}</div>`;
      return;
    }
    const row = (r) => {
      const medal = r.rank <= 3 ? `<span class="lk-kol__medal lk-is-m${r.rank}">${r.rank}</span>` : `<span class="lk-kol__rk">${r.rank}</span>`;
      const axie = r.axie ? `<span class="lk-kol__axie">${r.axie.class ? classIcon(r.axie.class) : ''}${esc(r.axie.name || '')}</span>` : '<span class="lk-kol__axie"></span>';
      return `<tr class="${r.me ? 'lk-is-me' : ''}"><td>${medal}</td><td class="lk-kol__who">${esc(r.name)}${r.me ? ` <em>${esc(i18n.t('koliseo.board.you'))}</em>` : ''}</td>
        <td>${axie}</td><td class="lk-kol__n">${esc(i18n.num(r.points))}</td><td class="lk-kol__n">${r.wins}/${r.losses}</td>
        <td class="lk-kol__n">${prizeOf(r.rank)}</td></tr>`;
    };
    const payout = Array.isArray(data.payout) ? data.payout : [];
    const prizeOf = (rk) => (payout[rk - 1] ? `<span class="lk-kol__pz"><img src="${curIcon('baxs')}" alt="bAXS">${esc(i18n.num(payout[rk - 1]))}</span>` : '<span class="lk-kol__dash">—</span>');
    const rows = data.rows || [];
    const table = rows.length ? `
      <table class="lk-kol__table">
        <thead><tr><th>${esc(i18n.t('koliseo.board.rank'))}</th><th>${esc(i18n.t('koliseo.board.player'))}</th><th>${esc(i18n.t('koliseo.board.axie'))}</th>
          <th class="lk-kol__n">${esc(i18n.t('arena.board.points'))}</th><th class="lk-kol__n">${esc(i18n.t('arena.board.record'))}</th><th class="lk-kol__n">${esc(i18n.t('arena.board.prize'))}</th></tr></thead>
        <tbody>${rows.map(row).join('')}</tbody>
        ${data.me ? `<tbody class="lk-kol__mine"><tr class="lk-kol__gap"><td colspan="6">⋯</td></tr>${row(data.me)}</tbody>` : ''}
      </table>` : `<p class="lk-kol__empty">${esc(i18n.t('arena.board.empty'))}</p>`;
    const prizes = payout.length ? this._payoutStrip(payout) : '';
    body.innerHTML = `${head}${table}${prizes}<p class="lk-kol__note">${esc(i18n.t('arena.board.order'))}</p>`;
  }

  async _renderBrumaBoard() {
    const body = this.$('body');
    const w = this._week;
    if (!w) { if (this._error) this._renderError(); else this._renderLoading(); return; }
    const weekId = this.boardWeek === 'last' ? koliseoService.previousWeekId(w.starts_at) : w.week;
    const head = this._kindSwitch(`
        <div class="lk-segmented lk-kol__weeks">
          <button type="button" data-act="board-week" data-w="current" aria-pressed="${this.boardWeek === 'current'}">${esc(i18n.t('koliseo.board.thisWeek'))}</button>
          <button type="button" data-act="board-week" data-w="last" aria-pressed="${this.boardWeek === 'last'}">${esc(i18n.t('koliseo.board.lastWeek'))}</button>
        </div>`);
    body.innerHTML = `${head}<div class="lk-kol__state"><span class="lk-kol__spin" aria-hidden="true"></span></div>`;
    const req = (this._boardReq = Symbol('board'));
    let data = null, error = null;
    try { data = await koliseoService.board(weekId); } catch (err) { error = err; }
    if (req !== this._boardReq || !this.isOpen || this.tab !== 'board' || this.boardKind !== 'bruma') return; // llegó tarde
    if (error) {
      const unknown = error.code === 'unknown_week';
      body.innerHTML = `${head}<div class="lk-kol__state"><p>${esc(unknown ? i18n.t('koliseo.board.noWeek') : i18n.t('koliseo.error'))}</p>
        ${unknown ? '' : `<button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="board-week" data-w="${this.boardWeek}">${esc(i18n.t('koliseo.retry'))}</button>`}</div>`;
      return;
    }
    const row = (r) => {
      const medal = r.rank <= 3 ? `<span class="lk-kol__medal lk-is-m${r.rank}">${r.rank}</span>` : `<span class="lk-kol__rk">${r.rank}</span>`;
      const axie = r.axie ? `<span class="lk-kol__axie">${r.axie.class ? classIcon(r.axie.class) : ''}${esc(r.axie.name || '')}</span>` : '<span class="lk-kol__axie"></span>';
      return `<tr class="${r.me ? 'lk-is-me' : ''}"><td>${medal}</td><td class="lk-kol__who">${esc(r.name)}${r.me ? ` <em>${esc(i18n.t('koliseo.board.you'))}</em>` : ''}</td>
        <td>${axie}</td><td class="lk-kol__n">${r.cleared}/5</td><td class="lk-kol__n">${r.turns}</td>
        <td class="lk-kol__n">${BRUMA_PRIZE[r.rank - 1] ? `<span class="lk-kol__pz"><img src="${curIcon('baxs')}" alt="bAXS">${BRUMA_PRIZE[r.rank - 1][1]}</span>` : '<span class="lk-kol__dash">—</span>'}</td></tr>`;
    };
    const rows = data.rows || [];
    const table = rows.length ? `
      <table class="lk-kol__table">
        <thead><tr><th>${esc(i18n.t('koliseo.board.rank'))}</th><th>${esc(i18n.t('koliseo.board.player'))}</th><th>${esc(i18n.t('koliseo.board.axie'))}</th>
          <th class="lk-kol__n">${esc(i18n.t('koliseo.board.cleared'))}</th><th class="lk-kol__n">${esc(i18n.t('koliseo.board.turns'))}</th><th class="lk-kol__n">${esc(i18n.t('koliseo.board.prize'))}</th></tr></thead>
        <tbody>${rows.map(row).join('')}</tbody>
        ${data.me ? `<tbody class="lk-kol__mine"><tr class="lk-kol__gap"><td colspan="6">⋯</td></tr>${row(data.me)}</tbody>` : ''}
      </table>` : `<p class="lk-kol__empty">${esc(i18n.t('koliseo.board.empty'))}</p>`;
    body.innerHTML = `${head}${table}${this._prizesHtml()}
      <p class="lk-kol__note">${esc(i18n.t(koliseoService.isAccount ? 'koliseo.board.order' : 'koliseo.board.guest'))}</p>`;
  }

  /** Tabla pequeña de premios del top 3 (los valores los pone el servidor; aquí solo se muestran). */
  _prizesHtml() {
    const P = BRUMA_PRIZE;
    const mat = (k, n) => `<span class="lk-kol__pz"><img src="${asset(MAT[k])}" alt="">×${n}</span>`;
    return `<div class="lk-kol__prizebox"><small>${esc(i18n.t('koliseo.board.prizesTitle'))}</small>
      ${P.map(([rk, baxs, gold, m]) => `<div><span class="lk-kol__medal lk-is-m${rk}">${rk}</span>
        <span class="lk-kol__pz"><img src="${curIcon('baxs')}" alt="bAXS">${baxs}</span>${mat('mat_lunar_shard', m)}${mat('mat_amber_atia', m)}
        <span class="lk-kol__pz"><img src="${curIcon('gold')}" alt="">${i18n.num(gold)}</span></div>`).join('')}</div>`;
  }

  // ------------------------------------------------------------ utilidades
  _countdown(endsAt, key = 'koliseo.bruma.endsIn') {
    const ms = new Date(endsAt).getTime() - koliseoService.serverNow();
    if (!(ms > 0)) return i18n.t('koliseo.bruma.ended');
    const d = Math.floor(ms / 86400_000), h = Math.floor((ms % 86400_000) / 3600_000), m = Math.floor((ms % 3600_000) / 60_000);
    const time = d > 0 ? i18n.t('koliseo.time.dh', { d, h }) : h > 0 ? i18n.t('koliseo.time.hm', { h, m }) : i18n.t('koliseo.time.m', { m: Math.max(1, m) });
    return i18n.t(key, { time });
  }

  _start() {
    if (typeof this.onStartRun !== 'function' || !this._week || this._busy) return;
    this._flash = null;
    this.onStartRun(this._week);
  }
}
