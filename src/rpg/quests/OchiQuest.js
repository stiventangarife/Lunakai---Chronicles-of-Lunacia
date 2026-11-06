// OchiQuest.js — Hito 124 · Misión principal 2 «El mercader del Dojō» (entre la graduación y Bing).
//
// Enseña la economía sin alargar el tutorial: Paladill manda al jugador con Ochi → Ochi explica el oro, la Tienda y el
// Mercado entre jugadores y da un monedero (completa hasta REWARDS.ochiPurse de oro) → el jugador compra un casco →
// se lo pone (Mochila) → vuelve con Ochi → recompensa (QuestManager) y se desbloquea la misión de Bing.
//
//  · Pasos: talk_ochi · buy_helmet · equip_helmet · report_ochi (QuestManager.quests.quest_merchant_ochi).
//  · La compra la avisa ShopService.onBuy (cualquier casco de la Tienda vale, no solo el Yelmo Bestial).
//  · El equipo se mira por estado (Sapidae con algo en la ranura «hat»), así que también vale si ya lo llevaba puesto.
//  · Monedero: con cuenta lo paga el servidor (economy_reward 'tut:ochi_purse', meta = 1 → «hasta N», una vez por
//    ranura); sin cuenta, se completa aquí al marcar talk_ochi (pasa una sola vez: el paso se guarda en la partida).

import { ShopService } from '../ShopService.js';
import { ITEMS_DB } from '../../tactics/ItemDatabase.js';
import { EconomyService } from '../../net/EconomyService.js';
import { REWARDS } from '../tutorial/TutorialScript.js';
import { showRewardCard } from '../../ui/RewardCard.js';
import { curIcon } from '../../ui/lk.js';
import * as i18n from '../../i18n/i18n.js';

export const OCHI_QUEST = 'quest_merchant_ochi';
export const OCHI_SHOP = 'dojo_valley';
export const OCHI_HELMET = 'beast_helmet';
const OCHI_AVATAR = './assets/portraits/sapidae-m-d.png';

const isHat = (id) => ITEMS_DB[id]?.slot === 'hat';

export class OchiQuest {
  constructor(overworldManager) {
    this.om = overworldManager;
    this._syncing = false;
    this._ems = new Set();
    ShopService.onBuy(({ id }) => this._onBuy(id));
    this.qm?.onQuestUpdated?.(() => this.sync());
    this.attachEquipment(this.em);
  }

  get qm() { return this.om?.questManager || null; }
  get em() { return this.om?.equipmentManager || null; }
  /** Escucha los cambios de equipo (OverworldManager.setEquipmentManager puede cambiar el gestor). */
  attachEquipment(em) {
    if (!em || this._ems.has(em)) return;
    this._ems.add(em);
    em.addListener?.(() => this.sync());
  }

  quest() { return this.qm?.getQuest?.(OCHI_QUEST) || null; }
  isActive() { const q = this.quest(); return !!q && (q.status === 'active' || q.status === 'ready_to_turn_in'); }
  done(stepId) { return !!this.quest()?.objective?.steps?.find((s) => s.id === stepId)?.done; }
  /** El paso pendiente ('talk_ochi'…), o null si la misión no está en curso. */
  pending() { return this.isActive() ? (this.quest().objective.steps.find((s) => !s.done)?.id || null) : null; }
  wearsHat() { const h = this.em?.equipped?.sapidae?.hat; return !!h && isHat(h); }

  _onBuy(id) {
    if (!this.isActive() || !this.done('talk_ochi') || this.done('buy_helmet') || !isHat(id)) return;
    this.qm.advanceStep(OCHI_QUEST, 'buy_helmet', true);
  }

  /** Avanza «equípatelo» en cuanto el Sapidae lleva un casco (también si ya lo llevaba). */
  sync() {
    if (this._syncing || !this.isActive()) return;
    this._syncing = true;
    try {
      if (this.done('buy_helmet') && !this.done('equip_helmet') && this.wearsHat()) {
        this.qm.advanceStep(OCHI_QUEST, 'equip_helmet', true);
        this.om?.npcManager?._showBannerMessage?.(i18n.t('npc.ochi.equippedTitle'), i18n.t('npc.ochi.equippedDesc'));
      }
    } finally { this._syncing = false; }
  }

  /** Completa el oro hasta REWARDS.ochiPurse. Devuelve cuánto se ha dado (estimado con cuenta: lo decide el servidor). */
  _grantPurse() {
    const target = REWARDS.ochiPurse || 0;
    const missing = Math.max(0, target - (this.em?.getGold?.() || 0));
    if (EconomyService.active) {
      EconomyService.reward('tut:ochi_purse').then((r) => { if (r?.error === 'unavailable' && missing > 0) this.em?.addGold?.(missing); }).catch(() => null);
    } else if (missing > 0) this.em?.addGold?.(missing);
    return missing;
  }

  _openShop() {
    ShopService.ensureStock(OCHI_SHOP, OCHI_HELMET, 1);
    this.om?.shopModal?.open(OCHI_SHOP, {
      guide: {
        focus: OCHI_HELMET,
        avatar: OCHI_AVATAR,
        note: () => {
          const p = this.pending();
          if (p === 'buy_helmet') return i18n.t('npc.ochi.guideBuy');
          if (p === 'equip_helmet') return i18n.t('npc.ochi.guideEquip');
          return null;
        },
        action: () => (this.pending() === 'equip_helmet' ? { label: i18n.t('npc.ochi.guideEquipBtn'), run: () => this._openBag() } : null),
      },
    });
  }

  _openBag() { this.om?.inventoryModal?.openTab?.('equipment', 'sapidae'); }

  /**
   * Diálogo de Ochi mientras la misión está en curso. Devuelve false si no hay nada de la misión que decir
   * (entonces Ochi saluda y abre la Tienda como siempre).
   */
  handleOchi(npcManager, npc) {
    const step = this.pending();
    if (!step) return false;
    const who = { speaker: npc.name, title: npc.title, avatar: npc.avatar };
    const ds = npcManager.dialogSystem;

    if (step === 'talk_ochi') {
      ds.startDialogue([
        { ...who, text: i18n.t('npc.ochi.intro1') },
        { ...who, text: i18n.t('npc.ochi.intro2') },
        { ...who, text: i18n.t('npc.ochi.intro3', { n: REWARDS.ochiPurse }) },
      ], async () => {
        this.qm.advanceStep(OCHI_QUEST, 'talk_ochi', true);
        const given = this._grantPurse();
        npcManager.hideAllOverlays?.();
        if (given > 0) {
          await showRewardCard({
            title: i18n.t('npc.ochi.purseTitle'),
            items: [{ icon: curIcon('gold'), name: i18n.t('npc.ochi.purseGold'), qty: given }],
            note: i18n.t('npc.ochi.purseNote'),
            audio: this.om?.audio,
          });
        }
        this._openShop();
      });
      return true;
    }

    if (step === 'buy_helmet') {
      ds.startDialogue([{ ...who, text: i18n.t('npc.ochi.remindBuy') }], () => { npcManager.hideAllOverlays?.(); this._openShop(); });
      return true;
    }

    if (step === 'equip_helmet') {
      ds.startDialogue([{ ...who, text: i18n.t('npc.ochi.remindEquip') }], () => { npcManager.hideAllOverlays?.(); this._openBag(); });
      return true;
    }

    if (step === 'report_ochi') {
      ds.startDialogue([
        { ...who, text: i18n.t('npc.ochi.turnIn1') },
        { ...who, text: i18n.t('npc.ochi.turnIn2') },
      ], async () => {
        this.qm.advanceStep(OCHI_QUEST, 'report_ochi', true);
        const res = this.qm.completeQuest(OCHI_QUEST);
        npcManager.hideAllOverlays?.();
        const r = res?.rewards;
        if (r) {
          const items = [];
          if (r.gold) items.push({ icon: curIcon('gold'), name: i18n.t('npc.ochi.purseGold'), qty: r.gold });
          (r.items || []).forEach((it) => { const db = ITEMS_DB[it.id]; items.push({ icon: db?.icon || it.icon, name: db?.name || it.name, qty: it.qty || 1, rarity: db?.rarity }); });
          await showRewardCard({ title: i18n.t('npc.ochi.doneTitle'), items, note: i18n.t('npc.ochi.doneNote'), audio: this.om?.audio });
        }
      });
      return true;
    }
    return false;
  }
}
