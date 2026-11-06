// KoliseoRewards.js — Premios del top 3 del Desafío de la Bruma (Koliseo, fase B4).
// Plan: docs/PLAN_DESAFIO_DE_LA_BRUMA.md (sección 12). Servidor: supabase/migrations/20261105000000_koliseo_rewards.sql.
//
// Al cerrar la semana el servidor paga el bAXS y el oro en la cartera y deja los materiales en koliseo_rewards.
// Este módulo los entrega a la partida sin perderlos ni duplicarlos:
//   1. koliseo_pending → premios sin cobrar.
//   2. Los materiales van a la bolsa de la Forja y el id del premio a `slot.forge.kolClaimed`, en el mismo guardado.
//   3. Con la partida subida a la nube, koliseo_ack los marca como cobrados.
//   Si 3 falla (sin red, juego cerrado), la próxima vez vuelven a llegar, pero sus ids ya están en la partida:
//   no se suman otra vez, solo se repite el ack.
// Después enseña una tarjeta de recompensa por premio y pide a la Economía el saldo nuevo.
// Se comprueba al cargar la partida (main.js) y al abrir el Koliseo. Los invitados no tienen premios.

import { koliseoService } from '../KoliseoService.js';
import { accountManager } from '../../net/AccountManager.js';
import { saveSlotManager } from '../SaveSlotManager.js';
import { ForgeService, MATERIALS } from '../ForgeService.js';
import { EconomyService } from '../../net/EconomyService.js';
import { showRewardCard } from '../../ui/RewardCard.js';
import { curIcon } from '../../ui/lk.js';
import * as i18n from '../../i18n/i18n.js';

const MIN_GAP_MS = 60_000;   // entre comprobaciones automáticas
const KEEP_IDS = 60;         // ids recordados en la partida (más de un año de semanas)
const BIOME_KEY = { forest: 'hud.biomeForest', savannah: 'hud.biomeSavannah', arctic: 'hud.biomeArctic', mystic: 'hud.biomeMystic', genesis: 'hud.biomeGenesis' };

export class KoliseoRewards {
  /** @param {object} om OverworldManager (para saber cuándo se puede enseñar la tarjeta) */
  constructor(om) {
    this.om = om;
    this._busy = null;
    this._lastAt = 0;
  }

  /** Comprueba y entrega los premios pendientes. Devuelve los premios nuevos entregados. */
  check({ force = false } = {}) {
    if (this._busy) return this._busy;
    if (!force && Date.now() - this._lastAt < MIN_GAP_MS) return Promise.resolve([]);
    this._lastAt = Date.now();
    this._busy = this._run().catch((e) => { console.warn('[Koliseo] Premios:', e); return []; }).finally(() => { this._busy = null; });
    return this._busy;
  }

  async _run() {
    if (accountManager.mode !== 'account' || !koliseoService.available) return [];
    const slot = Number(saveSlotManager.activeSlotId) || 0;
    if (!slot || !saveSlotManager.getActiveSlot?.()) return [];

    const list = await koliseoService.pendingRewards(slot);
    if (!list.length) return [];
    if (Number(saveSlotManager.activeSlotId) !== slot) return []; // cambió de partida mientras tanto

    const fresh = this.grant(list);
    let saved = true;
    if (fresh.length) saved = await this._save();
    // Solo se marca como cobrado lo que ya está en la nube (o lo que ya estaba guardado de antes)
    // (en segundo plano: sin red, supabaseFetch reintenta y la tarjeta no debe esperar)
    const ack = saved ? koliseoService.ackRewards(slot, list.map((r) => Number(r.id))).catch(() => null) : Promise.resolve(null);
    if (fresh.length) {
      EconomyService.sync().catch(() => null); // el oro y el bAXS los pagó el servidor al cerrar la semana
      await this._show(fresh);
    }
    await ack;
    return fresh;
  }

  /** Suma a la partida los premios que aún no tiene. Puro respecto a la red (se prueba solo). */
  grant(list) {
    const f = ForgeService._store();
    const have = new Set((Array.isArray(f.kolClaimed) ? f.kolClaimed : []).map(Number));
    const fresh = list.filter((r) => r && Number.isFinite(Number(r.id)) && !have.has(Number(r.id)));
    if (!fresh.length) return [];
    for (const r of fresh) {
      for (const [id, n] of Object.entries(r.items || {})) {
        const qty = Math.floor(Number(n) || 0);
        if (qty > 0 && MATERIALS[id]) ForgeService.addMats(id, qty, false);
      }
      have.add(Number(r.id));
    }
    f.kolClaimed = [...have].slice(-KEEP_IDS);
    ForgeService._commit(true);
    return fresh;
  }

  /** Guarda la partida y la sube a la nube. true si llegó. */
  async _save() {
    try { window.__AXIE_TACTICS_APP__?._saveCurrentProgress?.(); } catch { /* nada */ }
    try { return (await accountManager.cloud?.flush?.()) !== false; } catch { return false; }
  }

  /** Espera a un momento tranquilo (fuera de combate, cinemáticas y diálogos) y enseña una tarjeta por premio. */
  async _show(rewards) {
    // Sin prisa: los materiales ya están en la partida; la tarjeta solo avisa. Si en 30 min no hay un momento
    // tranquilo o cambia la partida, no se enseña (nunca encima de un combate).
    const slot = saveSlotManager.activeSlotId;
    const until = Date.now() + 30 * 60_000;
    while (!this._calm()) {
      if (Date.now() > until || saveSlotManager.activeSlotId !== slot) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
    for (const r of rewards) {
      await showRewardCard({ title: i18n.t('koliseo.reward.title', { rank: r.rank }), items: rewardItems(r), note: rewardNote(r), audio: this.om?.audio, autoCloseMs: 0 });
    }
  }

  _calm() {
    const om = this.om;
    if (!om) return true;
    if (om.isCombatActive?.() || om.state !== 'EXPLORING' || om.isLoadingZone) return false;
    if (om.tutorialManager?.isCutsceneActive || om.dialogSystem?.isActive) return false;
    return !document.querySelector('.lk-reward');
  }
}

/** Fichas de la tarjeta: materiales, oro y bAXS. */
export function rewardItems(r) {
  const out = [];
  for (const [id, n] of Object.entries(r.items || {})) {
    const m = MATERIALS[id];
    if (m && n > 0) out.push({ icon: m.icon, name: m.name, qty: Number(n), rarity: m.rarity });
  }
  if (Number(r.gold) > 0) out.push({ icon: curIcon('gold'), name: i18n.t('koliseo.reward.gold', { n: i18n.num(Number(r.gold)) }), rarity: 'rare' });
  if (Number(r.baxs) > 0) out.push({ icon: curIcon('baxs'), name: i18n.t('koliseo.reward.baxs', { n: i18n.num(Number(r.baxs)) }), rarity: 'mystic' });
  return out;
}

export function rewardNote(r) {
  const biome = BIOME_KEY[r.biome] ? i18n.t(BIOME_KEY[r.biome]) : (r.biome || '');
  return i18n.t('koliseo.reward.note', { week: r.week || '', biome });
}
