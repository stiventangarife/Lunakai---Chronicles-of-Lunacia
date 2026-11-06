// KoliseoRun.js — Flujo de un intento del Desafío de la Bruma (Koliseo, fase B2).
// Plan: docs/PLAN_DESAFIO_DE_LA_BRUMA.md.
//
//   Panel «Empezar / Continuar intento» → start() → servidor (bruma_start) → begin() → bruma_stage_begin →
//   BrumaEncounter → combate (id 'kol_bruma_<n>') → main avisa onBattleEnd(win, rondas) → bruma_report →
//   vuelta al mundo en el mismo sitio (OverworldManager._returnFromKoliseo) → onReturn() → panel con el resultado.
//
// · Vida llena en cada combate (noPersistentHP) y sin botín; la experiencia sí cuenta (main).
// · Entre combates, el panel abre Mochila, Escuadra o Runas (prep) y vuelve a abrirse al cerrarlas.
// · Invitado: el mismo flujo con el progreso en este navegador (KoliseoService).

import { koliseoService } from '../KoliseoService.js';
import { buildBrumaEncounter } from './BrumaEncounter.js';
import { saveSlotManager } from '../SaveSlotManager.js';
import * as i18n from '../../i18n/i18n.js';

const PREP_MAX_MS = 15 * 60_000; // la ventana de preparación no se vigila más de 15 min

export class KoliseoRun {
  constructor(om) {
    this.om = om;
    this.ticket = null;     // combate en curso: { runId, token, stage, guest }
    this._report = null;    // promesa del informe del último combate
    this._busy = false;
    this._prepTimer = null;
  }

  get panel() { return this.om?.koliseoPanel || null; }

  /** Botón del panel: empieza o continúa el intento y lanza el combate actual. */
  async start() {
    if (this._busy) return;
    this._busy = true;
    this._stopPrep();
    this.panel?.setBusy(true);
    try {
      const slot = saveSlotManager.activeSlotId || 1;
      const { run } = await koliseoService.startRun(slot);
      await this._begin(run);
    } catch (err) {
      this._fail(err);
    } finally {
      this._busy = false;
      this.panel?.setBusy(false);
    }
  }

  async _begin(run) {
    let b;
    try {
      b = await koliseoService.beginStage(run);
    } catch (err) {
      if (err?.code === 'run_over') {
        // El combate anterior quedó sin informar (se cerró el juego): cuenta como derrota y terminó el intento
        const r = err.data?.run || err.run || null;
        this.panel?.flash(i18n.t('koliseo.flash.abandonOut', { cleared: r?.cleared ?? 0, turns: r?.turns ?? 0 }), 'bad');
        await this.panel?.refresh();
        return;
      }
      throw err;
    }
    if (!b?.config) throw new Error('combate sin configuración');
    if (b.abandoned) this.panel?.flash(i18n.t('koliseo.flash.abandon'), 'warn');

    const em = this.om?.equipmentManager || window.game?.equipmentManager || null;
    const cfg = buildBrumaEncounter({ biome: b.biome, seed: b.seed, modifier: b.modifier, stage: b.config, week: b.week }, em);
    this.ticket = { runId: b.run?.id ?? run.id, token: b.token, stage: b.stage, guest: Boolean(b.guest) };
    this._report = null;

    this.panel?.close();
    // El mundo abierto lanza el combate con el telón de siempre (sin aliados de misiones ni monstruo en el mapa)
    this.om._handleMonsterEncounter({ id: `kol_bruma_${b.stage}`, biome: cfg.biome || 'forest', packData: null, levelConfig: cfg, name: cfg.title });
  }

  /** main.js: fin del combate (antes de la pantalla de victoria o derrota). */
  onBattleEnd({ win, rounds }) {
    const t = this.ticket;
    if (!t) return;
    this.ticket = null;
    this._lastStage = t.stage;
    this._lastWin = Boolean(win);
    this._lastRounds = rounds;
    this._report = koliseoService.reportStage(t, win, rounds)
      .then((res) => ({ ok: true, run: res.run }))
      .catch((err) => ({ ok: false, error: err }));
  }

  /** OverworldManager: el jugador ya está de vuelta en el mundo abierto tras un combate del Koliseo. */
  async onReturn() {
    const res = this._report ? await this._report : null;
    this._report = null;
    // Se abre el panel en la pestaña de la Bruma con el resultado
    setTimeout(() => {
      this.om?.toggleKoliseo?.('bruma');
      if (!res) return;
      if (!res.ok) {
        const code = res.error?.code;
        this.panel?.flash(i18n.t(code === 'pending' ? 'koliseo.flash.pending' : code === 'too_fast' ? 'koliseo.flash.tooFast' : 'koliseo.flash.reportError'), 'warn');
        return;
      }
      const r = res.run || {};
      const n = this._lastStage;
      let msg, kind = 'good';
      if (r.status === 'finished' && r.cleared >= 5) msg = i18n.t('koliseo.flash.allClear', { turns: r.turns });
      else if (r.status === 'out') { msg = i18n.t('koliseo.flash.out', { cleared: r.cleared, turns: r.turns }); kind = 'bad'; }
      else if (this._lastWin) msg = i18n.t('koliseo.flash.win', { n, rounds: this._lastRounds });
      else { msg = i18n.t('koliseo.flash.loss', { n, left: Math.max(0, 2 - (r.defeats || 0)) }); kind = 'warn'; }
      this.panel?.flash(msg, kind);
    }, 250);
  }

  /** Preparación entre combates: abre Mochila, Escuadra o Runas y vuelve al Koliseo al cerrarlas. */
  prep(kind) {
    const om = this.om;
    if (!om) return;
    this.panel?.close();
    const modal = kind === 'squad' ? om.squadModal : om.inventoryModal;
    try {
      if (kind === 'runes') om.inventoryModal?.openTab?.('runes');
      else modal?.open?.();
    } catch (e) { console.warn('[Koliseo] preparación', e); }
    this._stopPrep();
    let opened = false;
    const until = Date.now() + PREP_MAX_MS;
    this._prepTimer = setInterval(() => {
      if (Date.now() > until || om.isCombatActive?.()) { this._stopPrep(); return; } // se fue a otra cosa: no reabrir
      const isOpen = Boolean(modal?.isOpen);
      if (isOpen) { opened = true; return; }
      if (!opened && !isOpen) { opened = true; return; } // un ciclo de margen por si tarda en abrir
      clearInterval(this._prepTimer);
      this._prepTimer = null;
      if (om.state === 'EXPLORING' && !om.isAnyModalOpen?.()) om.toggleKoliseo?.('bruma');
    }, 300);
  }

  _stopPrep() {
    clearInterval(this._prepTimer);
    this._prepTimer = null;
  }

  _fail(err) {
    console.warn('[Koliseo] intento', err);
    const code = err?.code;
    const key = {
      no_attempts: 'koliseo.flash.noAttempts',
      run_in_other_slot: 'koliseo.flash.otherSlot',
      week_over: 'koliseo.flash.weekOver',
      network: 'koliseo.flash.network',
      not_authenticated: 'koliseo.flash.session',
      session_expired: 'koliseo.flash.session',
    }[code] || 'koliseo.flash.startError';
    this.panel?.flash(i18n.t(key), 'bad');
    this.panel?.refresh();
  }
}
