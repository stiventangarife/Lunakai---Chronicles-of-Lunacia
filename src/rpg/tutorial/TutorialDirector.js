// TutorialDirector.js — Tutorial nuevo del Dojo (Hito 48). Sustituye a OverworldTutorialManager y mantiene su API pública
// (isActive, currentStep, isFeatureUnlocked, isInputLocked, hideBanner, loadSaveData/exportSaveData, on…) para que el resto
// del juego siga funcionando igual.
//
// Fases (TutorialScript.js): cinemática → defensa del Dojo (combate guiado, Espada de madera) → Mochila (equiparla)
// → duelo con Paladill (termina al 30 % de vida) → Forja (talar, evolucionar, acelerar ×4, recoger) → vínculo (acariciar,
// dar de comer, combate de prueba con la Ultimate) → runas y charms → graduación (mapa, portales y misión de Bing).
//
// Guardado: slot.tutorialProgress = { v: 2, step, done, flags, bondBefore }. Las partidas con progreso del tutorial antiguo
// (o de nivel > 1) cuentan como terminadas.
// Consola: lunakaiTutorial.goto('forge_talk') · .skip() · .state()

import { STEPS, ORDER, PHASES, DIALOGS, COACH, LOCKED, REWARDS } from './TutorialScript.js';
import { PrologueCinematic } from '../cinematic/PrologueCinematic.js';
import { LEVELS_CONFIG } from '../../tactics/LevelsDatabase.js';
import { ITEMS_DB } from '../../tactics/ItemDatabase.js';
import { MATERIALS } from '../../tactics/data/EconomyCatalog.js';
import { ForgeService } from '../ForgeService.js';
import { GatheringService } from '../GatheringService.js';
import { BondService } from '../BondService.js';
import { RuneCharmService } from '../RuneCharmService.js';
import { RUNE_BY_ID, CHARM_BY_ID } from '../../tactics/data/RunesCharms.js';
import { FORGE_SPOT } from '../world/ForgeStation.js';
import { curIcon } from '../../ui/lk.js';
import { loadRuneCharmArt, runeCharmArt } from '../../ui/RuneCharmArt.js';
import { showRewardCard } from '../../ui/RewardCard.js';
import { FORGE_TREE_SPOT, PALADILL_SPOT, PALADILL_GREET_SPOT } from '../world/ForestVillageLayout.js';
import * as i18n from '../../i18n/i18n.js';
import { EconomyService } from '../../net/EconomyService.js';

const PALADILL = { speaker: i18n.t('tutorialDirector.paladillSpeaker'), title: i18n.t('tutorialDirector.paladillTitle'), avatar: './assets/portraits/paladill.png', npcId: 'paladill' };
const PALADILL_POS = { x: PALADILL_SPOT.x, z: PALADILL_SPOT.z }; // delante del dojo del pueblo
const TREE_POS = { x: FORGE_TREE_SPOT.x, z: FORGE_TREE_SPOT.z }; // tree_forest_forge (GatheringCatalog), al lado de la Forja
const FORGE_POS = { x: FORGE_SPOT.x, z: FORGE_SPOT.z };
const QUEST = 'quest_slime_purification';
const ICON = (n) => `./assets/ui/icons/${n}.png`;
const GOLD_ICON = curIcon('gold'); // la misma moneda que la Forja y la Tienda (Hito 54)
const idx = (step) => ORDER.indexOf(step);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Desde qué paso queda desbloqueada cada función. */
const UNLOCK_AT = {
  questBook: 'defend', combat: 'defend', inventory: 'equip_talk', forge: 'forge_talk', care: 'bond_talk',
  runes: 'runes_talk', squad: 'done', worldMap: 'done', shop: 'done', gather: 'done',
};

export class TutorialDirector {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.isActive = true;
    this.step = 'defend';
    this.done = false;
    this.flags = {};
    this.bondBefore = null;
    this.isCutsceneActive = false;
    this.isOverlayActive = false;
    this.activeOverlayStep = null;
    this._talking = false;
    this._createDOM();
    this._wireServices();
    this._tick = setInterval(() => this._update(), 300);
    // Guía paso a paso (22-oct): señala lo que hay que pulsar y bloquea el resto hasta hacerlo
    this._guide = null;
    this._guideTick = setInterval(() => this._updateGuide(), 200);
    // Hito 75: el Escuadrón se abre al reclutar a Bing, con un mini-tutorial de 3 pasos
    this._squadTick = setInterval(() => this._updateSquadIntro(), 250);
    window.addEventListener('keydown', (e) => this._guardKeys(e), true);
    if (typeof window !== 'undefined') {
      window.lunakaiTutorial = {
        state: () => ({ step: this.step, done: this.done, active: this.isActive, flags: { ...this.flags } }),
        goto: (s) => this._go(s, { talkNow: true }),
        skip: () => this.skipTutorial(),
        reset: () => { this.done = false; this.isActive = true; this.flags = {}; this._go('defend'); },
        director: this,
      };
    }
  }

  // ================================================================ compatibilidad con el gestor antiguo
  get currentStep() { return this.done ? 'COMPLETED' : this.step; }
  set currentStep(v) { if (v === 'COMPLETED') this._markDone(false); }
  get hasEquippedSword() { return this.done || idx(this.step) > idx('equip_sword'); }
  get unlockedFeatures() {
    return Object.fromEntries(Object.keys(UNLOCK_AT).map((k) => [k, this.isFeatureUnlocked(k)]));
  }
  set unlockedFeatures(_) { /* lo decide el paso actual */ }
  /** Objeto que la Mochila no deja de pedir (InventoryModal). */
  get equipLockItem() { return this.isActive && !this.done && this.step === 'equip_sword' ? 'wood_sword' : null; }

  isFeatureUnlocked(name) {
    if (name === 'squad') return this._squadReady(); // Hito 75: al reclutar a Bing
    if (!this.isActive || this.done) return true;
    const at = UNLOCK_AT[name];
    return at ? idx(this.step) >= idx(at) : true;
  }
  unlockFeature() { this._updateHUDButtonsState(); }

  /** Mensaje si `feature` aún no está disponible (null = se puede usar). `extra` = id del punto de recolección. */
  lockMessage(feature, extra = null) {
    if (feature === 'squad') return this._squadReady() ? null : (LOCKED.squad || i18n.t('tutorialDirector.lockDefault'));
    if (!this.isActive || this.done) return null;
    if (feature === 'gather' && extra === 'tree_forest_forge' && idx(this.step) >= idx('chop')) return null;
    return this.isFeatureUnlocked(feature) ? null : (LOCKED[feature] || i18n.t('tutorialDirector.lockDefault'));
  }

  isInputLocked(code) {
    if (this.isCutsceneActive) return code !== 'Escape';
    if (this._guide) return !this._guideKeyAllowed(code);
    return false;
  }

  start() {
    if (this.done || !this.isActive) { this._applyDone(); return; }
    this._render();
    this._enterStep(this.step, { resumed: true });
  }

  hideBanner() { this.bannerEl?.classList.add('hidden'); }
  showBanner() { if (this.isActive && !this.done) this._render(); }

  exportSaveData() {
    return { v: 2, step: this.step, done: this.done, flags: { ...this.flags }, bondBefore: this.bondBefore, isActive: this.isActive && !this.done, currentStep: this.currentStep };
  }

  loadSaveData(save, heroLevel = 1) {
    if (save && save.v === 2) {
      this.done = Boolean(save.done);
      this.step = STEPS[save.step] ? save.step : 'defend';
      this.flags = { ...(save.flags || {}) };
      this.bondBefore = save.bondBefore ?? null;
      // Un combate que se quedó a medias vuelve a su conversación
      if (this.bondBefore != null && this.step === 'ult_talk') this._restoreBond();
    } else if ((save && Object.keys(save).length) || heroLevel > 1) {
      this.done = true; // partidas de antes del Hito 48
    } else {
      this.done = false; this.step = 'defend'; this.flags = {};
    }
    this.isActive = !this.done;
    // Hito 75: las partidas que ya tenían a Bing no repiten el mini-tutorial del Escuadrón
    if (!this.flags.squadIntro) this.flags.squadIntro = this._squadReady() ? 'done' : 'waiting';
    this._loaded = true;
    if (this.done) this._applyDone();
    this._updateHUDButtonsState();
  }

  // Llamadas que siguen haciendo OverworldManager y NPCManager
  onQuestBookOpened() {}
  onQuestBookClosed() {}
  onInventoryOpened() { this._updateGuide(); }
  onInventoryClosed() { this._updateGuide(); }
  onSwordEquipped() { if (this.step === 'equip_sword') this._completeEquip(); }
  onSlimeDefeated() {}
  onPaladillInitialTalkComplete() {}
  onPaladillRewardDelivered() {}
  onPaladillGraduationComplete() {}
  activateStepOverlay() {}
  deactivateStepOverlay() { this._spotlightOff(); }

  // ================================================================ servicios del juego
  get game() { return window.__AXIE_TACTICS_APP__ || window.game || null; }
  get em() { return this.om?.equipmentManager; }
  get qm() { return this.om?.questManager; }
  get care() { return this.game?.axieCare?.service || null; }
  _mainAxie() { const sq = this.em?.getSquad?.() || []; return sq[1] || 'kotaro'; }
  _axieName() { return this.em?.heroesBase?.[this._mainAxie()]?.name || this.om?.player?.companionName || i18n.t('tutorialDirector.fallbackAxie'); }
  _name() { return this.om?.player?.name || i18n.t('tutorialDirector.fallbackName'); }
  _fmt(s) { return String(s || '').replace(/\{name\}/g, esc(this._name())).replace(/\{axie\}/g, esc(this._axieName())); }

  _wireServices() {
    ForgeService.onChange(() => this._onForge());
    GatheringService.onChange((ev) => {
      if (ev?.type === 'gather' && ev.node?.id === 'tree_forest_forge' && this.step === 'chop') this._afterChop();
    });
    RuneCharmService.onChange(() => this._checkRunes());
    // Axie Care se crea después que el mundo: se engancha en el primer tick que exista
  }

  _hookCare() {
    const c = this.care;
    if (!c || this._careHooked === c) return;
    this._careHooked = c;
    c.onChange((r) => {
      if (!r?.ok) return;
      if (r.kind === 'pet' && this.step === 'pet') this._go('feed');
      else if (r.kind === 'feed' && (this.step === 'feed' || this.step === 'pet')) { this._go('ult_talk', { talkNow: true }); }
    });
  }

  // ================================================================ pasos
  _go(step, { talkNow = false } = {}) {
    if (!STEPS[step]) return;
    this.step = step;
    if (step === 'done') { this._markDone(true); return; }
    this.isActive = true; this.done = false;
    this._render();
    this._enterStep(step, { talkNow });
    this._save();
  }

  _enterStep(step, { resumed = false, talkNow = false } = {}) {
    const def = STEPS[step];
    this._spotlightOff();
    this._lockPortals(true);
    this._updateHUDButtonsState();
    if (this.care) {
      this.care.cooldownFree = ['bond_talk', 'pet', 'feed'].includes(step);
      // Hito 54: en el tutorial la caricia y la comida llenan el vínculo (mitad y resto: 100 % al terminar)
      this.care.tutorialFill = ['pet', 'feed'].includes(step);
    }
    this.om?.inventoryModal?.setTutorialLock?.(step === 'equip_sword', step === 'equip_sword' ? 'wood_sword' : null);
    this._syncQuest();
    if (step === 'equip_sword') {
      this._ensureItem('wood_sword');
      if (this._swordOn()) { this._completeEquip(); return; }
    }
    if (step === 'chop') { try { GatheringService.reset('tree_forest_forge'); } catch { /* nada */ } }
    if (step === 'forge_open' || step === 'forge_evolve' || step === 'forge_speed' || step === 'forge_collect') this._onForge();
    if (step === 'feed') {
      if (BondService.get(this._mainAxie()) >= 100) { this._go('ult_talk', { talkNow: true }); return; } // ya está lleno
      this._ensureFood();
    }
    if (step === 'runes') { this._ensureRuneReward(); this._checkRunes(); }
    if (def.kind === 'talk') this._autoTalk();
  }

  /** Habla Paladill en cuanto no haya ventanas abiertas (o ahora mismo si el jugador pulsó E). */
  _autoTalk() {
    this._wantTalk = true;
  }

  _canTalkNow() {
    const g = this.game, om = this.om;
    if (!om || om.state !== 'EXPLORING' || g?.gameState !== 'OVERWORLD') return false;
    if (om.dialogSystem?.isActive || this.isCutsceneActive || this._rewardOpen) return false;
    if (om.isAnyModalOpen?.()) return false;
    return true;
  }

  /** NPCManager: al hablar con Paladill. Devuelve true si el tutorial se encarga. */
  handlePaladill() {
    if (!this.isActive || this.done) return false;
    const def = STEPS[this.step];
    if (def.kind === 'talk') { this._talk(); return true; }
    const remind = { equip_sword: 'remind_equip_sword', chop: 'remind_chop', forge_open: 'remind_forge', forge_evolve: 'remind_forge', forge_speed: 'remind_forge', forge_collect: 'remind_forge', pet: 'remind_pet', feed: 'remind_pet', runes: 'remind_runes' }[this.step];
    this._say(DIALOGS[remind] || DIALOGS.ambient);
    return true;
  }

  _say(lines, onDone = null) {
    const ds = this.om?.dialogSystem;
    if (!ds) { onDone?.(); return; }
    this._talking = true;
    ds.startDialogue(lines.map((l) => ({ ...PALADILL, html: this._fmt(l) })), () => { this._talking = false; onDone?.(); });
  }

  _talk() {
    this._wantTalk = false;
    const step = this.step;
    const def = STEPS[step];
    if (def.kind !== 'talk') return;
    let lines = DIALOGS[def.dialog] || [];
    if (step === 'forge_talk' && this.flags.duelOutcome) lines = [...(DIALOGS[`duel_${this.flags.duelOutcome}`] || []), ...lines];
    this._say(lines, () => this._afterTalk(step));
  }

  _afterTalk(step) {
    if (this.step !== step) return;
    switch (step) {
      case 'defend': this._battle('dojo'); break;
      case 'equip_talk': this._go('equip_sword'); break;
      case 'duel_talk': this._battle('duel'); break;
      case 'forge_talk': this._giveForgeBundle().then(() => this._go('chop')); break;
      case 'bond_talk': this._go('pet'); break;
      case 'ult_talk': this._startUltTrial(); break;
      case 'runes_talk': this._giveRunes().then(() => this._go('runes')); break;
      case 'grad_talk': this._graduate(); break;
      default: break;
    }
  }

  // ================================================================ combates
  _battle(kind) {
    const base = { dojo: LEVELS_CONFIG[1], duel: LEVELS_CONFIG.tut_duel, ult: LEVELS_CONFIG.tut_ult }[kind];
    if (!base || !this.om?.startTutorialBattle) return;
    const main = this._mainAxie();
    const cfg = { ...base, heroPositions: (base.heroPositions || []).map((h) => ({ ...h, id: main })), tutorialKind: kind };
    this._spotlightOff();
    this.hideBanner();
    this.om.startTutorialBattle(`tut_${kind}`, cfg);
  }

  _startUltTrial() {
    // Hito 54: el vínculo ya está al 100 % por la caricia y la comida (Paladill ya no lo «presta»). Por si una partida
    // antigua llega aquí con menos, se completa sin devolverlo después.
    const main = this._mainAxie();
    if (BondService.get(main) < 100) BondService.set(main, 100);
    this.bondBefore = null;
    this._save();
    this._battle('ult');
  }

  _restoreBond() {
    if (this.bondBefore == null) return;
    BondService.set(this._mainAxie(), this.bondBefore);
    this.bondBefore = null;
  }

  /** OverworldManager, al volver al mundo tras un combate (victoria o derrota). */
  onBattleReturn(monsterId, victory = true) {
    this._coachOff();
    if (!this.isActive || this.done || !String(monsterId || '').startsWith('tut_')) return;
    const kind = String(monsterId).slice(4);
    if (kind === 'dojo') {
      if (!victory) { this._go('defend'); return; }
      this.qm?.advanceStep(QUEST, 'defend_dojo', true);
      this._reward({ title: i18n.t('tutorialDirector.reward.dojoTitle'), items: [this._itemView('wood_sword')] }).then(() => this._go('equip_talk', { talkNow: true }));
    } else if (kind === 'duel') {
      this.flags.duelOutcome = this.game?.lastDuelOutcome === 'yield' ? 'yield' : 'stop';
      this.qm?.advanceStep(QUEST, 'duel_paladill', true);
      this._go('forge_talk', { talkNow: true });
    } else if (kind === 'ult') {
      this._restoreBond();
      if (!victory) { this._go('ult_talk'); this._save(); return; }
      this.qm?.advanceStep(QUEST, 'bond_axie', true);
      this._go('runes_talk', { talkNow: true });
    }
  }

  // ================================================================ forja
  _onForge() {
    const s = this.step;
    if (!['forge_open', 'forge_evolve', 'forge_speed', 'forge_collect', 'chop'].includes(s)) return;
    const jobs = ForgeService.jobs();
    const open = Boolean(this.om?.forgeModal?.isOpen);
    if (s === 'forge_open' && (open || jobs.length)) { this._go(jobs.length ? 'forge_speed' : 'forge_evolve'); return; }
    if (s === 'forge_evolve' && open && !this._forgeModeSet) { this._forgeModeSet = true; this.om?.forgeModal?.setMode?.('evolve'); }
    if (!open) this._forgeModeSet = false;
    if (s === 'forge_evolve' && jobs.length) { this._go('forge_speed'); return; }
    if (s === 'forge_speed') {
      const j = jobs[0];
      if (!j) { if (this._collected()) this._afterCollect(); return; }
      if (this.flags.speedCost == null) {
        const o = ForgeService.speedOptions(j.uid).find((x) => x.x === 4);
        if (o) { this.flags.speedCost = o.baxs; if (EconomyService.active) { const b = o.baxs; EconomyService.reward('tut:speed').then((r) => { if (r?.error === 'unavailable') ForgeService.grant?.({ baxs: b }); }).catch(() => null); } else ForgeService.grant?.({ baxs: o.baxs }); } // Paladill invita: se paga con su regalo
      }
      if ((j.speed || 1) >= 4 || j.ready) { this._go('forge_collect'); return; }
    }
    if (s === 'forge_collect' && !jobs.length && this._collected()) this._afterCollect();
  }

  _collected() {
    const em = this.em;
    const eq = em?.equipped?.sapidae || {};
    return Object.values(eq).includes('iron_sword') || (em?.inventory || []).includes('iron_sword') || ForgeService.jobs().length === 0;
  }

  _afterCollect() {
    if (this.flags.forged) return;
    this.flags.forged = true;
    this.qm?.advanceStep(QUEST, 'evolve_sword', true);
    // Hito 54: primero se cierra la Forja y después sale la tarjeta de la espada
    if (this.om?.forgeModal?.isOpen) { this._go('forge_close'); return; }
    this._forgeReward();
  }

  _forgeReward() {
    if (this._forgeRewardShown) return;
    this._forgeRewardShown = true;
    const eq = this.em?.equipped?.sapidae || {};
    this._reward({ title: i18n.t('tutorialDirector.reward.swordTitle'), items: [this._itemView('iron_sword')], note: eq.weapon === 'iron_sword' ? i18n.t('tutorialDirector.reward.swordEquipped') : i18n.t('tutorialDirector.reward.swordInBag') })
      .then(() => this._go('bond_talk', { talkNow: true }));
  }

  async _giveForgeBundle() {
    if (!this.flags.duelGold) { this.flags.duelGold = true; this._grantDuelGold(); }
    if (!this.flags.bundle) {
      this.flags.bundle = true;
      Object.entries(REWARDS.bundle).forEach(([id, n]) => ForgeService.addMats(id, n, false));
      const w = ForgeService.wallet();
      if (w.slp < 50) { if (EconomyService.active) { const s = 50 - w.slp; EconomyService.reward('tut:slp_topup').then((r) => { if (r?.error === 'unavailable') ForgeService.grant?.({ slp: s }); }).catch(() => null); } else ForgeService.grant?.({ slp: 50 - w.slp }); }
      ForgeService.addMats('mat_wood', 0, true);
    }
    await this._reward({
      title: i18n.t('tutorialDirector.reward.giftTitle'),
      items: [{ icon: GOLD_ICON, name: i18n.t('tutorialDirector.reward.gold'), qty: REWARDS.duelGold }, ...Object.entries(REWARDS.bundle).map(([id, n]) => this._matView(id, n))],
      note: i18n.t('tutorialDirector.reward.giftNote'),
    });
  }

  _afterChop() {
    const have = ForgeService.mats().mat_wood || 0;
    if (have < 2) ForgeService.addMats('mat_wood', 2 - have, true); // lo justo para la evolución
    this._go('forge_open');
  }

  // ================================================================ vínculo
  _ensureFood() {
    const c = this.care;
    if (!c) return;
    if (!c.foods().length) {
      try { if (!c.grantStarterFood().length) this.em?.addItemsToInventory?.(REWARDS.food); } catch { this.em?.addItemsToInventory?.(REWARDS.food); }
    }
  }

  // ================================================================ runas
  async _giveRunes() {
    if (!this.flags.runes) {
      this.flags.runes = true;
      // Hito 54: van a la bolsa de runas y charms (solo se equipa lo que tienes)
      RuneCharmService.add('runes', REWARDS.rune, 1, false);
      RuneCharmService.add('charms', REWARDS.charm, 1, true);
      this._save();
    }
    await this._reward({ title: i18n.t('tutorialDirector.reward.runesTitle'), items: await this._runeRewardItems(), note: i18n.t('tutorialDirector.reward.runesNote') });
  }

  /** Fichas de la runa y el charm del tutorial con su arte. */
  async _runeRewardItems() {
    await loadRuneCharmArt();
    return [
      { icon: runeCharmArt('runes', REWARDS.rune) || ICON('rune'), name: RUNE_BY_ID[REWARDS.rune]?.name || i18n.t('tutorialDirector.reward.rune'), rarity: 'rare' },
      { icon: runeCharmArt('charms', REWARDS.charm) || ICON('charm'), name: CHARM_BY_ID[REWARDS.charm]?.name || i18n.t('tutorialDirector.reward.charm'), rarity: CHARM_BY_ID[REWARDS.charm]?.rarity },
    ];
  }

  /** Partidas que llegaron al paso de runas antes de la bolsa (Hito 54): se les da la runa y el charm del tutorial. */
  _ensureRuneReward() {
    if (!this.flags.runes) return;
    const main = this._mainAxie(), eq = RuneCharmService.get(main);
    if (!eq.rune && RuneCharmService.available('runes', REWARDS.rune) < 1) RuneCharmService.add('runes', REWARDS.rune, 1, false);
    if (!Object.values(eq.charms || {}).some(Boolean) && RuneCharmService.available('charms', REWARDS.charm) < 1) RuneCharmService.add('charms', REWARDS.charm, 1, true);
  }

  _checkRunes() {
    if (this.step !== 'runes') return;
    const eq = RuneCharmService.get(this._mainAxie());
    const hasCharm = Object.values(eq.charms || {}).some(Boolean);
    const t = this.bannerEl?.querySelector('[data-ref="text"]');
    if (t) t.innerHTML = this._fmt(i18n.t('tutorialDirector.runesProgress', { rune: eq.rune ? i18n.t('tutorialDirector.runeDone') : i18n.t('tutorialDirector.runeTodo'), charm: hasCharm ? i18n.t('tutorialDirector.charmDone') : i18n.t('tutorialDirector.charmTodo') }));
    if (eq.rune && hasCharm) {
      this.qm?.advanceStep(QUEST, 'equip_runes', true);
      this._go('grad_talk');
      // la conversación espera a que se cierre la Mochila
      this._autoTalk();
    }
  }

  // ================================================================ graduación y «Saltar tutorial»
  _graduate() {
    this.qm?.advanceStep(QUEST, 'graduate', true);
    this._markDone(true);
  }

  _markDone(celebrate = true) {
    const wasDone = this.done;
    this.done = true;
    this.isActive = false;
    this.step = 'done';
    this._restoreBond();
    if (this.care) this.care.cooldownFree = false;
    try { if (this.qm?.getQuest?.(QUEST)?.status !== 'completed') this.qm?.completeQuest?.(QUEST); } catch (e) { console.warn('[Tutorial] Misión', e); }
    this._applyDone();
    if (celebrate && !wasDone) {
      this._renderBanner(STEPS.done, 7, true);
      setTimeout(() => this.hideBanner(), 8000);
    }
    this._save();
  }

  _applyDone() {
    this._spotlightOff();
    this._coachOff();
    this.om?.inventoryModal?.setTutorialLock?.(false, null);
    this._lockPortals(false);
    this._updateHUDButtonsState();
    if (!this.bannerEl?.classList.contains('is-completed')) this.hideBanner();
  }

  /** Da lo que falte y deja el tutorial terminado (botón «Saltar tutorial»). */
  skipTutorial() {
    if (this.done) return;
    const em = this.em;
    const got = [];
    const eq = em?.equipped?.sapidae;
    const hasIron = (eq && Object.values(eq).includes('iron_sword')) || (em?.inventory || []).includes('iron_sword') || ForgeService.jobs().some((j) => j.to === 'iron_sword');
    if (!hasIron && idx(this.step) < idx('bond_talk')) {
      const i = (em?.inventory || []).indexOf('wood_sword');
      if (i >= 0) em.inventory.splice(i, 1);
      if (eq && (!eq.weapon || eq.weapon === 'wood_sword')) eq.weapon = 'iron_sword';
      else em?.addItemsToInventory?.(['iron_sword']);
      got.push(this._itemView('iron_sword'));
    }
    if (!this.flags.duelGold) { this.flags.duelGold = true; this._grantDuelGold(); got.push({ icon: GOLD_ICON, name: i18n.t('tutorialDirector.reward.gold'), qty: REWARDS.duelGold }); }
    if (idx(this.step) < idx('feed')) { em?.addItemsToInventory?.(REWARDS.food); got.push({ ...this._itemView('food_berry'), qty: REWARDS.food.length }); }
    const main = this._mainAxie();
    const rc = RuneCharmService.get(main);
    if (!this.flags.runes) { this.flags.runes = true; RuneCharmService.add('runes', REWARDS.rune, 1, false); RuneCharmService.add('charms', REWARDS.charm, 1, false); }
    if (!rc.rune && RuneCharmService.available('runes', REWARDS.rune) < 1) RuneCharmService.add('runes', REWARDS.rune, 1, false);
    if (!rc.rune) RuneCharmService.setRune(main, REWARDS.rune);
    if (!Object.values(rc.charms || {}).some(Boolean)) {
      if (RuneCharmService.available('charms', REWARDS.charm) < 1) RuneCharmService.add('charms', REWARDS.charm, 1, false);
      RuneCharmService.setCharm(main, 'eyes', REWARDS.charm);
    }
    got.push({ icon: runeCharmArt('runes', REWARDS.rune) || ICON('rune'), name: RUNE_BY_ID[REWARDS.rune]?.name || i18n.t('tutorialDirector.reward.rune') }, { icon: runeCharmArt('charms', REWARDS.charm) || ICON('charm'), name: CHARM_BY_ID[REWARDS.charm]?.name || i18n.t('tutorialDirector.reward.charm') });
    em?._updateSapidaePortrait?.();
    em?._notifyChange?.();
    try { this.om?.player?.applyEquipment?.(em.equipped.sapidae || {}); } catch { /* nada */ }
    this._markDone(false);
    this._reward({ title: i18n.t('tutorialDirector.reward.skipTitle'), items: got, note: i18n.t('tutorialDirector.reward.skipNote') });
  }

  // ================================================================ apertura (partida nueva)
  /** Cinemática → Dojo → Paladill da la alarma → combate guiado. Lo llama OverworldManager.startPrologue(). */
  async playOpening() {
    const om = this.om, g = this.game;
    this.isCutsceneActive = true;
    om.state = 'CINEMATIC';
    om.playerController?.setEnabled(false);
    om.overworldHudEl?.classList.add('hidden');
    om.squadHUD?.container?.classList.add('hidden');
    om.minimapHUD?.hide?.();
    this.hideBanner();
    const veil = document.createElement('div');
    veil.className = 'lk-cine-veil';
    veil.innerHTML = `<div class="lk-cine-veil__load"><span>${i18n.t('tutorialDirector.openingChronicle')}</span><i><b data-ref="bar"></b></i></div>`;
    document.body.appendChild(veil);
    const bar = veil.querySelector('[data-ref="bar"]');
    try {
      const cin = new PrologueCinematic({ renderer: om.renderer, audio: om.audio, player: om.player });
      await cin.preload((k) => { if (bar) bar.style.width = `${Math.round(k * 100)}%`; });
      veil.querySelector('.lk-cine-veil__load')?.remove();
      await new Promise((r) => setTimeout(r, 250));
      if (this.game) this.game.gameState = 'CINEMATIC'; // el bucle principal deja de dibujar el mundo
      // El velo negro tapa el canvas: se quita mientras se ve la cinemática (ella misma empieza y acaba en negro)
      const playing = cin.play();
      veil.style.transition = 'none';
      veil.classList.add('lk-is-off');
      await playing;
    } catch (e) {
      console.warn('[Tutorial] Cinemática', e);
    }
    // Negro otra vez mientras se coloca al jugador en el Dojo
    veil.style.transition = 'none';
    veil.classList.remove('lk-is-off');
    void veil.offsetWidth;
    veil.style.transition = '';
    // Al Dojo, frente al maestro
    try {
      const { x, z, yaw } = PALADILL_GREET_SPOT;
      const y = om.getGroundHeight ? om.getGroundHeight(x, z) : 0;
      om.player?.teleport(x, y, z, yaw);
      // Cámara detrás del jugador, mirando al maestro y al dojo. Con el giro por defecto (45°) quedaba dentro del dojo.
      const cc = om.cameraController;
      if (cc) { cc.targetAngle = cc.currentAngle = yaw - Math.PI; cc.setFollowTarget(om.player, true); }
    } catch { /* nada */ }
    this.isCutsceneActive = false;
    om.state = 'EXPLORING';
    if (g) g.gameState = 'OVERWORLD';
    om.onStateChange?.('OVERWORLD');
    om.overworldHudEl?.classList.remove('hidden');
    om.squadHUD?.container?.classList.remove('hidden');
    om.minimapHUD?.show?.();
    om.audio?.playBiomeMusic?.(om.worldMapManager?.currentMapDef?.biome || 'forest');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    veil.classList.add('lk-is-off');
    setTimeout(() => veil.remove(), 1000);
    this.done = false; this.isActive = true;
    this._go('defend', { talkNow: true });
  }

  // ================================================================ bucle
  _update() {
    if (!this.om) return;
    this._hookCare();
    this._updateCoach();
    if (!this.isActive || this.done) return;
    if (this._wantTalk && STEPS[this.step]?.kind === 'talk' && this._canTalkNow()) {
      setTimeout(() => { if (this._wantTalk && this._canTalkNow()) this._talk(); }, 250);
    }
    if (this.step.startsWith('forge_')) this._onForge();
    if (this.step === 'forge_close' && !this.om?.forgeModal?.isOpen && !this._rewardOpen) this._forgeReward();
    if (this.step === 'equip_sword' && this._swordOn()) this._completeEquip();
    // la franja vuelve al salir de un combate o de una ventana
    if (this.game?.gameState === 'OVERWORLD' && this.bannerEl?.classList.contains('hidden') && !this.isCutsceneActive) this._render();
  }

  _swordOn() {
    const eq = this.em?.equipped || {};
    return Object.values(eq).some((s) => s && Object.values(s).includes('wood_sword'));
  }

  _completeEquip() {
    if (this.step !== 'equip_sword') return;
    this.qm?.advanceStep(QUEST, 'equip_sword', true);
    this.om?.inventoryModal?.setTutorialLock?.(false, null);
    this._spotlightOff();
    this._go('duel_talk', { talkNow: true });
  }

  _ensureItem(id) {
    const em = this.em;
    if (!em) return;
    const has = (em.inventory || []).includes(id) || Object.values(em.equipped || {}).some((s) => s && Object.values(s).includes(id));
    if (!has) em.addItemsToInventory?.([id]);
  }

  _save() {
    try { this.game?._saveCurrentProgress?.(); } catch { /* nada */ }
  }

  _syncQuest() {
    const qm = this.qm;
    if (!qm) return;
    const q = qm.getQuest?.(QUEST);
    if (q && q.status !== 'completed' && q.status !== 'active' && q.status !== 'ready_to_turn_in') q.status = 'active';
    const i = idx(this.step);
    [['defend_dojo', 'equip_talk'], ['equip_sword', 'duel_talk'], ['duel_paladill', 'forge_talk'], ['evolve_sword', 'bond_talk'], ['bond_axie', 'runes_talk'], ['equip_runes', 'grad_talk']]
      .forEach(([sid, from]) => { if (i >= idx(from)) { const st = q?.objective?.steps?.find((s) => s.id === sid); if (st && !st.done) st.done = true; } });
    qm._notify?.();
  }

  /** Destino de la flecha y el navegador de la misión (QuestManager). */
  navTarget() {
    if (!this.isActive || this.done) return null;
    if (this.step === 'chop') return { ...TREE_POS, name: i18n.t('tutorialDirector.nav.forgeTree') };
    if (this.step.startsWith('forge_')) return { ...FORGE_POS, name: i18n.t('places.forestForge') };
    if (this.step === 'pet' || this.step === 'feed' || this.step === 'runes' || this.step === 'equip_sword') return null;
    return { ...PALADILL_POS, name: i18n.t('tutorialDirector.paladillSpeaker') };
  }

  _lockPortals(locked) {
    const tm = this.om?.worldMapManager?.transitionManager;
    try { tm?.setPortalsLocked?.(locked); } catch { /* nada */ }
  }

  // ================================================================ interfaz
  // ================================================================ Escuadrón (Hito 75)
  /** El Escuadrón se desbloquea al reclutar a Bing (antes, al terminar el entrenamiento). */
  /** Hito 76: oro del duelo con Paladill (con cuenta lo paga el servidor, una sola vez). */
  _grantDuelGold() {
    if (EconomyService.active) EconomyService.reward('tut:duel').then((r) => { if (r?.error === 'unavailable') this.em?.addGold?.(REWARDS.duelGold); }).catch(() => null);
    else this.em?.addGold?.(REWARDS.duelGold);
  }

  _squadReady() {
    if (this.em?.unlockedHeroes?.includes('bing')) return true;
    return this.qm?.getQuest?.('quest_prove_ferocity')?.status === 'completed';
  }

  /**
   * Mini-tutorial tras reclutar a Bing: abrir el Escuadrón → colocar a Bing en un puesto de apoyo → «Cargar mis Axies».
   * Estado en flags.squadIntro: waiting · open · place · load · done.
   */
  _updateSquadIntro() {
    if (!this.om || !this.em || !this._loaded) return;
    const ready = this._squadReady();
    if (ready !== this._squadWasReady) { this._squadWasReady = ready; this._updateHUDButtonsState(); }
    const sm = this.om.squadModal;
    if (sm && !sm.__lkIntroHook) {
      const prev = sm.onAccountLoad;
      sm.onAccountLoad = (r) => { try { prev?.(r); } finally { this._onSquadAccountLoad(r); } };
      sm.__lkIntroHook = true;
    }
    if (!this.done) return; // primero el entrenamiento del Dojo
    let st = this.flags.squadIntro;
    if (st === 'waiting' && this.em.unlockedHeroes.includes('bing')) st = this._setSquadIntro('open');
    if (st !== 'open' && st !== 'place' && st !== 'load') { this._squadBanner(null); return; }
    const inSquad = this.em.getSquad().includes('bing');
    if (st === 'open' && sm?.isOpen) st = this._setSquadIntro(inSquad ? 'load' : 'place');
    if (st === 'place' && inSquad) { st = this._setSquadIntro('load'); this.om?.audio?.playBuff?.(); }
    const bing = sm?.root?.querySelector('.lk-ax-card[data-id="bing"]');
    document.querySelectorAll('#squad-modal .lk-sqi-pulse').forEach((el) => { if (el !== bing || st !== 'place') el.classList.remove('lk-sqi-pulse', 'tutorial-spotlight-target'); });
    if (st === 'place' && bing && !bing.classList.contains('lk-sqi-pulse')) bing.classList.add('lk-sqi-pulse', 'tutorial-spotlight-target');
    this._squadBanner(this._squadGuideVisible() ? st : null);
  }

  _setSquadIntro(st) {
    this.flags.squadIntro = st;
    try { this.game?._saveCurrentProgress?.(); } catch { /* nada */ }
    return st;
  }

  _onSquadAccountLoad(r) {
    if (this.flags.squadIntro !== 'load') return;
    this._setSquadIntro('done');
    this._squadBanner(null);
    this._updateGuide();
    const sm = this.om?.squadModal;
    this.om?._showBannerMessage?.(i18n.t('tutorialDirector.squad.doneTitle'), i18n.t(r?.ok ? 'tutorialDirector.squad.doneOk' : 'tutorialDirector.squad.doneGuest'));
  }

  /** Se ve solo explorando (o con el Escuadrón abierto) y sin diálogos, combates ni otras ventanas encima. */
  _squadGuideVisible() {
    const g = this.game, om = this.om;
    if (!om || g?.gameState !== 'OVERWORLD' || om.dialogSystem?.isActive || om.isLoadingZone) return false;
    const sm = om.squadModal;
    if (sm?.isOpen) return true;
    if (om.state !== 'EXPLORING') return false;
    if (om.inventoryModal?.isOpen || om.settingsModal?.isOpen || om.questBookModal?.isOpen || om.worldMapManager?.worldMapModal?.isOpen || om.forgeModal?.isOpen) return false;
    return Boolean(document.getElementById('btn-open-squad')?.getClientRects().length);
  }

  /** Guía del mini-tutorial del Escuadrón (la usa _updateGuide cuando el entrenamiento ya terminó). */
  _computeSquadGuide() {
    const st = this.flags.squadIntro;
    if (st !== 'open' && st !== 'place' && st !== 'load') return null;
    if (!this._squadGuideVisible()) return null;
    const sm = this.om.squadModal;
    if (!sm?.isOpen) {
      return { sel: '#btn-open-squad', html: i18n.t(st === 'open' ? 'tutorialDirector.squad.guideOpen' : 'tutorialDirector.squad.guideReopen'), keys: ['KeyK'] };
    }
    const win = sm.root?.querySelector('.lk-squad');
    if (st === 'place') {
      // Todo el panel queda libre (se puede arrastrar o usar «Añadir al escuadrón»); Bing late en la colección
      return { el: win, html: i18n.t('tutorialDirector.squad.guidePlace'), keys: ['Escape'], soft: true, noClick: true };
    }
    const btn = sm.root?.querySelector('[data-ref="loadAx"]');
    return { el: btn, html: i18n.t('tutorialDirector.squad.guideLoad'), keys: ['Escape'], soft: true, scroll: true };
  }

  _squadBanner(st) {
    const b = this.bannerEl;
    if (!b) return;
    if (!st) {
      if (b.dataset.step && b.dataset.step.startsWith('sq_')) { b.classList.add('hidden'); b.classList.remove('tutorial-spotlight-banner', 'lk-tut--low'); b.dataset.step = ''; }
      return;
    }
    const n = { open: 0, place: 1, load: 2 }[st];
    const $ = (r) => b.querySelector(`[data-ref="${r}"]`);
    const key = `sq_${st}`;
    if (b.dataset.step === key && !b.classList.contains('hidden')) return;
    $('phases').innerHTML = [0, 1, 2].map((i) => `<i class="${i < n ? 'lk-is-full' : i === n ? 'lk-is-half' : ''}"></i>`).join('');
    $('badge').textContent = i18n.t('tutorialDirector.squad.badge', { n: n + 1 });
    $('title').textContent = i18n.t(`tutorialDirector.squad.${st}Title`);
    $('text').innerHTML = i18n.t(`tutorialDirector.squad.${st}Text`);
    $('skip').hidden = true;
    $('confirm').hidden = true;
    b.dataset.step = key;
    b.classList.remove('hidden', 'is-completed', 'lk-tut--low');
    b.classList.toggle('lk-tut--low', Boolean(this.om?.squadModal?.isOpen));
    b.classList.remove('lk-tut--new'); void b.offsetWidth; b.classList.add('lk-tut--new');
    this.om?.audio?.playStep?.();
  }

  _createDOM() {
    let banner = document.getElementById('overworld-tutorial-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'overworld-tutorial-banner';
      document.body.appendChild(banner);
    }
    banner.className = 'lk-ui lk-tut hidden';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <div class="lk-tut__head"><span class="lk-tut__phases" data-ref="phases" aria-hidden="true"></span><span class="lk-tut__badge" data-ref="badge"></span><h3 class="lk-tut__title" data-ref="title"></h3></div>
      <p class="lk-tut__text" data-ref="text"></p>
      <button type="button" class="lk-tut__skip" data-ref="skip" title="${i18n.t('tutorialDirector.skipTitle')}">${i18n.t('tutorialDirector.skip')}</button>
      <div class="lk-tut__confirm" data-ref="confirm" hidden><span>${i18n.t('tutorialDirector.skipConfirm')}</span><button type="button" class="lk-yes" data-ref="yes">${i18n.t('tutorialDirector.skipYes')}</button><button type="button" class="lk-no" data-ref="no">${i18n.t('tutorialDirector.skipNo')}</button></div>`;
    this.bannerEl = banner;
    const $ = (r) => banner.querySelector(`[data-ref="${r}"]`);
    $('skip').addEventListener('click', (e) => { e.stopPropagation(); $('confirm').hidden = false; });
    $('no').addEventListener('click', (e) => { e.stopPropagation(); $('confirm').hidden = true; });
    $('yes').addEventListener('click', (e) => { e.stopPropagation(); $('confirm').hidden = true; this.skipTutorial(); });

    // Velo con hueco para señalar un botón del HUD
    let overlay = document.getElementById('tutorial-focus-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tutorial-focus-overlay';
      overlay.innerHTML = `<div class="tutorial-overlay-backdrop"></div><div id="tutorial-spotlight-box" class="tutorial-spotlight-highlight-box hidden"></div>
        <div id="tutorial-spotlight-pointer" class="tutorial-spotlight-pointer hidden"><div class="pointer-hand">◆</div><div id="pointer-text" class="pointer-text"></div></div>`;
      document.body.appendChild(overlay);
    }
    overlay.className = 'tutorial-focus-overlay hidden';
    overlay.addEventListener('click', (e) => {
      const t = this._spotTarget;
      if (!this._guide && !this.isOverlayActive) return;
      if (!t) { if (this._guide) this._nudge(); return; }
      const r = t.getBoundingClientRect();
      if (e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6) t.click();
      else this._nudge(); // fuera del hueco no pasa nada: solo se recuerda dónde pulsar
    });
    // El velo no deja pasar la rueda del ratón ni los arrastres al juego mientras hay algo que pulsar
    ['wheel', 'pointerdown', 'contextmenu'].forEach((ev) => overlay.addEventListener(ev, (e) => { if (this._guide) { e.preventDefault(); e.stopPropagation(); } }, { passive: false }));
    let catcher = document.getElementById('lk-tut-catch');
    if (!catcher) {
      catcher = document.createElement('div');
      catcher.id = 'lk-tut-catch';
      catcher.className = 'lk-tut-catch';
      document.body.appendChild(catcher);
    }
    catcher.hidden = true;
    // Que pulsar sobre el hueco no cuente como «clic fuera» para las ventanas (p. ej. la ficha del ítem
    // de la Mochila se cerraría antes de recibir el clic en Equipar)
    catcher.addEventListener('pointerdown', (e) => e.stopPropagation());
    catcher.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const t = this._spotTarget;
      if (t && this._guide && !this._guide.noClick) { t.click(); setTimeout(() => this._updateGuide(), 60); }
    });
    this._catchEl = catcher;
    this.overlayEl = overlay;
    window.addEventListener('resize', () => this._placeSpot());

    let coach = document.getElementById('lk-tut-coach');
    if (!coach) {
      coach = document.createElement('div');
      coach.id = 'lk-tut-coach';
      coach.className = 'lk-ui lk-ctut lk-ctut--hint hidden';
      coach.innerHTML = `<div class="lk-ctut__card"><span class="lk-ctut__coach" aria-hidden="true"><img src="./assets/portraits/paladill.png" alt=""></span>
        <div class="lk-ctut__body"><div class="lk-ctut__head"><span class="lk-ctut__badge">${i18n.t('tutorialDirector.paladillSpeaker')}</span></div><p class="lk-ctut__text" data-ref="text"></p></div></div>`;
      document.body.appendChild(coach);
    }
    this.coachEl = coach;
  }

  _render() {
    if (!this.isActive || this.done) return;
    if (this.game?.gameState === 'BATTLE' || this.isCutsceneActive) return;
    const def = STEPS[this.step];
    if (!def) return;
    this._renderBanner(def, def.phase, false);
    if (this.step === 'runes') this._checkRunes();
  }

  _renderBanner(def, phase, completed) {
    const b = this.bannerEl;
    if (!b) return;
    const $ = (r) => b.querySelector(`[data-ref="${r}"]`);
    $('phases').innerHTML = PHASES.map((_, i) => `<i class="${i < phase || completed ? 'lk-is-full' : i === phase ? 'lk-is-half' : ''}"></i>`).join('');
    $('badge').textContent = completed ? i18n.t('tutorialDirector.badge.done') : i18n.t('tutorialDirector.badge.phase', { phase: PHASES[phase] || '' });
    $('title').textContent = this._fmt(def.title).replace(/&amp;/g, '&');
    $('text').innerHTML = this._fmt(def.text);
    $('skip').hidden = completed;
    $('confirm').hidden = true;
    const changed = b.dataset.step !== (completed ? 'done' : this.step);
    b.dataset.step = completed ? 'done' : this.step;
    b.classList.remove('hidden');
    b.classList.toggle('is-completed', completed);
    // por encima de la Forja, la Mochila y Axie Care cuando el paso ocurre dentro de ellas
    b.classList.toggle('tutorial-spotlight-banner', ['forge_evolve', 'forge_speed', 'forge_collect', 'forge_close', 'runes', 'equip_sword', 'pet', 'feed'].includes(this.step) && !completed);
    // dentro de la Forja y la Mochila la franja baja al pie de la pantalla para no tapar sus cabeceras
    b.classList.toggle('lk-tut--low', !completed && this._bannerLow());
    if (changed) { b.classList.remove('lk-tut--new'); void b.offsetWidth; b.classList.add('lk-tut--new'); this.om?.audio?.playStep?.(); }
  }

  _updateHUDButtonsState() {
    const set = (id, on) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('hud-btn-locked', !on);
      el.classList.toggle('hud-btn-unlocked', on);
      if (on) el.removeAttribute('disabled'); else el.setAttribute('disabled', 'true');
    };
    set('btn-open-inventory', this.isFeatureUnlocked('inventory'));
    set('btn-open-quest-book', this.isFeatureUnlocked('questBook'));
    set('btn-open-world-map', this.isFeatureUnlocked('worldMap'));
    set('btn-open-squad', this.isFeatureUnlocked('squad'));
  }

  // ------------------------------------------------ guía paso a paso
  /**
   * Qué hay que pulsar ahora mismo (null = paso del mundo: caminar hasta Paladill, el árbol o la Forja,
   * con la flecha de la misión). { sel | el | rect, html, keys, canvas } — `canvas`: el objetivo está en
   * la escena 3D (el clic pasa por el hueco al juego).
   */
  _computeGuide() {
    if (!this.isActive || this.done || this.isCutsceneActive || this._rewardOpen || this._talking) return null;
    const g = this.game, om = this.om;
    if (!om || g?.gameState !== 'OVERWORLD' || om.state !== 'EXPLORING') return null;
    if (om.dialogSystem?.isActive || om.isLoadingZone) return null;
    if (om.settingsModal?.isOpen || om.questBookModal?.isOpen || om.worldMapManager?.worldMapModal?.isOpen) return null;
    const vis = (el) => Boolean(el && el.isConnected && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    const q = (sel, root = document) => { const el = root.querySelector(sel); return vis(el) ? el : null; };
    const inv = om.inventoryModal;
    const forgeOpen = Boolean(om.forgeModal?.isOpen);
    const carePanel = this.game?.axieCare?.panel;
    const careOpen = Boolean(carePanel && !carePanel.hidden);
    const axie = this._axieName();
    switch (this.step) {
      case 'equip_sword': {
        if (!inv?.isOpen) return { sel: '#btn-open-inventory', html: i18n.t('tutorialDirector.guide.openInventory'), keys: ['KeyI'] };
        const eq = q('[data-act="equip"]', inv.itip || document);
        if (eq) return { el: eq, html: i18n.t('tutorialDirector.guide.equip') };
        return { sel: '#inventory-modal .lk-it.lk-tut-spot, .lk-it.lk-tut-spot', html: i18n.t('tutorialDirector.guide.pickWoodSword'), scroll: true };
      }
      case 'forge_close': {
        if (!forgeOpen) return null;
        const x = q('.lk-forge-layer [data-act="close"]');
        return x ? { el: x, html: i18n.t('tutorialDirector.guide.closeForgeBold') } : null;
      }
      case 'forge_evolve': case 'forge_speed': case 'forge_collect': {
        if (!forgeOpen) return null; // la flecha del mundo lleva al yunque
        const L = document.querySelector('.lk-forge-layer');
        if (!L) return null;
        if (this.step === 'forge_evolve') {
          const evo = L.querySelector('[data-m="evolve"]');
          if (evo && !/lk-is-on|active/.test(evo.className) && evo.getAttribute('aria-pressed') === 'false') return { el: evo, html: i18n.t('tutorialDirector.guide.evolveTab') };
          // primero la fila de la Espada de madera (por su nombre), luego Evolucionar; si no se puede
          // evolucionar con ella elegida, no se señala nada para no dejar al jugador atrapado
          const name = this._itemView('wood_sword').name;
          const row = [...L.querySelectorAll('.lk-fr')].find((r) => vis(r) && r.querySelector('b')?.textContent.trim() === name);
          if (row && row.getAttribute('aria-selected') !== 'true') return { el: row, html: i18n.t('tutorialDirector.guide.pickItem', { name: esc(name) }), scroll: true };
          const go = L.querySelector('[data-act="go"]');
          if (row && go && !go.disabled && go.textContent.includes(i18n.t('forge.modeEvolve'))) return { el: go, html: i18n.t('tutorialDirector.guide.pressEvolve') };
          return null;
        }
        if (this.step === 'forge_speed') {
          const x4 = q('.lk-speed__opts [data-x="4"]', L);
          return x4 ? { el: x4, html: i18n.t('tutorialDirector.guide.speed'), scroll: true } : null;
        }
        const go = L.querySelector('[data-act="go"]');
        if (go && !go.disabled && go.textContent.includes(i18n.t('forge.collect'))) return { el: go, html: i18n.t('tutorialDirector.guide.collect'), scroll: true };
        const wait = q('.lk-forge-cost', L) || q('.lk-forge-stage', L);
        return wait ? { el: wait, html: i18n.t('tutorialDirector.guide.forging'), scroll: true, noClick: true } : null;
      }
      case 'pet': case 'feed': {
        if (careOpen) {
          if (this.step === 'pet') { const b = q('[data-act="pet"]', carePanel); return b ? { el: b, html: i18n.t('tutorialDirector.guide.pet') } : null; }
          const f = [...carePanel.querySelectorAll('[data-food]')].find((b) => !b.disabled && vis(b));
          return f ? { el: f, html: i18n.t('tutorialDirector.guide.feed', { axie: esc(axie) }) } : null;
        }
        const r = this._companionRect();
        return r ? { rect: r, html: i18n.t('tutorialDirector.guide.clickAxie', { axie: esc(axie) }), canvas: true } : null;
      }
      case 'runes': {
        const main = this._mainAxie();
        if (!inv?.isOpen) return { sel: '#btn-open-inventory', html: i18n.t('tutorialDirector.guide.openRunes'), keys: ['KeyU', 'KeyI'] };
        const view = q('[data-view="runes"]');
        if (view && view.getAttribute('aria-pressed') !== 'true') return { el: view, html: i18n.t('tutorialDirector.guide.runesView') };
        const pip = q(`[data-h="${main}"]`);
        if (pip && pip.getAttribute('aria-pressed') !== 'true') return { el: pip, html: i18n.t('tutorialDirector.guide.pickAxie', { axie: esc(axie) }) };
        const eq = RuneCharmService.get(main);
        const tabOn = (k) => q(`[data-k="${k}"]`)?.getAttribute('aria-pressed') === 'true';
        if (!eq.rune) {
          if (!tabOn('runes')) { const s2 = q('[data-ref="runeSocket"]'); return s2 ? { el: s2, html: i18n.t('tutorialDirector.guide.runeSocket') } : null; }
          const it = q(`[data-rune="${REWARDS.rune}"]`);
          return it ? { el: it, html: i18n.t('tutorialDirector.guide.pickRune'), scroll: true } : null;
        }
        if (!Object.values(eq.charms || {}).some(Boolean)) {
          // Hito 54: primero la habilidad donde irá el charm (la primera parte), luego el charm neutro
          const part = q('[data-row]')?.dataset.row || 'eyes';
          if (!this._charmPartPicked || !tabOn('charms')) {
            const sock = q(`.lk-socket-charm[data-part="${part}"]`);
            if (sock && !sock._lkTutHook) { sock._lkTutHook = true; sock.addEventListener('click', () => { this._charmPartPicked = true; }); }
            const nm = q(`[data-row="${part}"] .lk-pn b`)?.firstChild?.textContent?.trim() || i18n.t('tutorialDirector.guide.skillFallback');
            return sock ? { el: sock, html: i18n.t('tutorialDirector.guide.charmSocket', { skill: esc(nm) }) } : null;
          }
          const it = q(`[data-charm="${REWARDS.charm}"]`);
          return it ? { el: it, html: i18n.t('tutorialDirector.guide.pickCharm'), scroll: true } : null;
        }
        return null;
      }
      default: {
        // Paso de hablar o de ir a algún sitio con una ventana abierta: primero, cerrarla
        const kind = STEPS[this.step]?.kind;
        if (kind !== 'talk' && !['chop', 'forge_open'].includes(this.step)) return null;
        if (inv?.isOpen) { const x = q('[data-ref="close"]', inv.modalEl) || q('#inventory-modal [data-ref="close"]'); if (x) return { el: x, html: i18n.t('tutorialDirector.guide.closeBackpack'), keys: ['KeyI'] }; }
        // (al abrir la Forja en el paso forge_open, el paso cambia enseguida a forge_evolve: no pedir cerrarla)
        if (forgeOpen && this.step !== 'forge_open') { const x = q('.lk-forge-layer [data-act="close"]'); if (x) return { el: x, html: i18n.t('tutorialDirector.guide.closeForge') }; }
        if (careOpen) { const x = q('[data-act="close"]', carePanel); if (x) return { el: x, html: i18n.t('tutorialDirector.guide.closePanel') }; }
        return null;
      }
    }
  }

  /** Rectángulo en pantalla alrededor del Axie compañero (para hacer clic en él). */
  _companionRect() {
    const om = this.om, cam = om?.camera, c = om?.player?.companionGroup;
    if (!cam || !c || !c.visible) return null;
    const THREE_V = c.position.clone();
    const top = THREE_V.clone(); top.y += 1.4;
    const p0 = THREE_V.project(cam), p1 = top.project(cam);
    if (p0.z > 1 || p1.z > 1) return null;
    const sx = (v) => (v.x + 1) / 2 * innerWidth, sy = (v) => (1 - v.y) / 2 * innerHeight;
    const x = sx(p0), yb = sy(p0), yt = sy(p1);
    const h = Math.max(60, yb - yt + 30), w = Math.max(70, h * 0.95);
    return { left: x - w / 2, top: yt - 20, right: x + w / 2, bottom: yt - 20 + h, width: w, height: h };
  }

  _guideKeyAllowed(code) {
    const g = this._guide;
    if (!g) return true;
    if ((g.keys || []).includes(code)) return true;
    // Esc solo para cerrar una ventana del propio paso (nunca abre el menú con la guía puesta)
    if (code === 'Escape') return Boolean(this.om?.inventoryModal?.isOpen || this.om?.forgeModal?.isOpen || this.om?.squadModal?.isOpen);
    return false;
  }

  _guardKeys(e) {
    if (!this._guide || this._guideKeyAllowed(e.code)) return;
    if (/input|textarea|select/i.test(e.target?.tagName || '')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this._nudge();
  }

  /** Aviso corto cuando se intenta otra cosa: el señalador se sacude. */
  _nudge() {
    const ptr = document.getElementById('tutorial-spotlight-pointer');
    if (!ptr) return;
    ptr.classList.remove('lk-tut-nudge'); void ptr.offsetWidth; ptr.classList.add('lk-tut-nudge');
  }

  /** La franja baja al pie solo con la Forja o la Mochila abiertas (cerradas, taparía los botones de abajo). */
  _bannerLow() {
    if (!['forge_evolve', 'forge_speed', 'forge_collect', 'runes'].includes(this.step)) return false;
    return Boolean(this.om?.inventoryModal?.isOpen || this.om?.forgeModal?.isOpen);
  }

  _updateGuide() {
    let g = null;
    try { g = this.done ? this._computeSquadGuide() : this._computeGuide(); } catch (e) { console.warn('[Tutorial] guía', e); g = null; }
    if (this.bannerEl && !this.done && !this.bannerEl.classList.contains('is-completed')) {
      // abajo con la Forja o la Mochila abiertas, salvo que lo que hay que pulsar esté en la mitad de abajo
      const tEl = g && (g.el || (g.sel ? document.querySelector(g.sel) : null));
      const tr = g?.rect || tEl?.getBoundingClientRect?.();
      const targetLow = Boolean(tr && tr.height && (tr.top + tr.height / 2) > innerHeight * 0.55);
      this.bannerEl.classList.toggle('lk-tut--low', this._bannerLow() && !targetLow);
    }
    let el = g ? (g.el || (g.sel ? document.querySelector(g.sel) : null)) : null;
    // objetivo que no está o no se ve: mejor sin guía que un velo sin hueco
    if (g && !g.rect && (!el || !el.getClientRects().length)) g = null;
    if (!g) { if (this._guide) { this._guide = null; this._spotlightOff(); } return; }
    const key = `${this.done ? 'sq' : this.step}|${g.html}`;
    if (!this._guide || this._guide.key !== key || this._guide.target !== el) {
      if (el && g.scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      this._guide = { ...g, key, target: el };
      this._spotlightOn(el, g);
    } else {
      this._guide.rect = g.rect;
    }
    // El velo no deja usar la rueda: si el objetivo queda fuera de la vista, se desplaza hasta él
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.height && (r.top < 0 || r.bottom > innerHeight)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    this._placeSpot();
  }

  _spotlightOn(el, g) {
    this._spotTarget?.classList.remove('tutorial-spotlight-target');
    // Cuando la guía señala algo que abre una ventana desde el mundo (el botón de la Mochila, el Axie) o
    // el panel de cuidados, el juego no debe creer que ya hay una ventana abierta: si no, el botón, la
    // tecla U y el clic sobre el compañero se ignoran, y el panel de cuidados se cierra solo. El velo y el
    // bloqueo de teclas de la guía siguen impidiendo todo lo demás.
    const opensFromWorld = g.canvas || g.soft || el?.id === 'btn-open-inventory' || el?.id === 'btn-open-squad' || this.step === 'pet' || this.step === 'feed';
    this.isOverlayActive = !opensFromWorld;
    this.activeOverlayStep = this.step === 'equip_sword' ? 'EQUIP_SWORD' : this.step;
    this._spotTarget = el || null;
    this.overlayEl.classList.remove('hidden');
    this.overlayEl.classList.add('lk-tut-guide');
    const ptr = document.getElementById('tutorial-spotlight-pointer');
    const txt = document.getElementById('pointer-text');
    if (txt) txt.innerHTML = g.html;
    ptr?.classList.remove('hidden');
    if (this._catchEl) this._catchEl.hidden = Boolean(g.canvas || g.noClick || !el);
    this.bannerEl?.classList.add('tutorial-spotlight-banner');
  }

  _spotlight(selector, html) {
    const el = document.querySelector(selector);
    if (!el || this.game?.gameState !== 'OVERWORLD') return;
    this.isOverlayActive = true;
    this.activeOverlayStep = this.step === 'equip_sword' ? 'EQUIP_SWORD' : this.step;
    this._spotTarget = el;
    el.classList.add('tutorial-spotlight-target');
    this.overlayEl.classList.remove('hidden');
    const ptr = document.getElementById('tutorial-spotlight-pointer');
    const txt = document.getElementById('pointer-text');
    if (txt) txt.innerHTML = html;
    ptr?.classList.remove('hidden');
    this.bannerEl?.classList.add('tutorial-spotlight-banner');
    this._placeSpot();
    setTimeout(() => this._placeSpot(), 60);
  }

  _placeSpot() {
    const t = this._spotTarget;
    const rr = this._guide?.rect || null;
    if ((!this.isOverlayActive && !this._guide) || (!t && !rr)) return;
    const r = rr || t.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const pad = 6, x1 = Math.max(0, r.left - pad), y1 = Math.max(0, r.top - pad), x2 = Math.min(innerWidth, r.right + pad), y2 = Math.min(innerHeight, r.bottom + pad);
    const poly = `polygon(evenodd, 0px 0px, 100vw 0px, 100vw 100vh, 0px 100vh, 0px 0px, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
    this.overlayEl.style.clipPath = poly; this.overlayEl.style.webkitClipPath = poly;
    const box = document.getElementById('tutorial-spotlight-box');
    if (box) { Object.assign(box.style, { top: `${y1}px`, left: `${x1}px`, width: `${x2 - x1}px`, height: `${y2 - y1}px` }); box.classList.remove('hidden'); }
    // Capa que recibe el clic sobre el objetivo y se lo pasa (aunque otro elemento lo tape a medias)
    if (this._catchEl && !this._catchEl.hidden) Object.assign(this._catchEl.style, { top: `${y1}px`, left: `${x1}px`, width: `${x2 - x1}px`, height: `${y2 - y1}px` });
    const ptr = document.getElementById('tutorial-spotlight-pointer');
    if (ptr) {
      const pw = ptr.offsetWidth || 260, ph = ptr.offsetHeight || 40;
      ptr.style.top = `${Math.max(12, y1 - ph - 16)}px`;
      ptr.style.left = `${Math.max(12, Math.min(innerWidth - pw - 16, (x1 + x2) / 2 - pw / 2))}px`;
    }
  }

  _spotlightOff() {
    this._guide = null;
    if (this._catchEl) this._catchEl.hidden = true;
    this.overlayEl?.classList.remove('lk-tut-guide');
    this.isOverlayActive = false;
    this.activeOverlayStep = null;
    this._spotTarget?.classList.remove('tutorial-spotlight-target');
    this._spotTarget = null;
    if (this.overlayEl) { this.overlayEl.classList.add('hidden'); this.overlayEl.style.clipPath = 'none'; this.overlayEl.style.webkitClipPath = 'none'; }
    document.getElementById('tutorial-spotlight-box')?.classList.add('hidden');
    document.getElementById('tutorial-spotlight-pointer')?.classList.add('hidden');
    if (!['forge_evolve', 'forge_speed', 'forge_collect', 'forge_close', 'runes', 'equip_sword', 'pet', 'feed'].includes(this.step)) this.bannerEl?.classList.remove('tutorial-spotlight-banner');
    if (this.isActive && !this.isCutsceneActive) this.om?.playerController?.setEnabled?.(this.om.state === 'EXPLORING');
  }

  // ------------------------------------------------ consejo en combate
  _updateCoach() {
    const g = this.game;
    const cfg = g?.activeBattleConfig;
    const kind = cfg?.tutorialKind;
    const inFight = g?.gameState === 'BATTLE' && !document.body.classList.contains('state-combat-ended') && (kind === 'duel' || kind === 'ult');
    if (!inFight) { this._coachOff(); return; }
    // Mientras la guía del combate (TutorialManager) lleva el paso a paso, el consejo no se muestra
    if (g.tutorialManager?.dynamic) { this._coachOff(); return; }
    let html = '';
    const ult = g.spellManager?.ultimates;
    const btn = document.getElementById('spell-slot-ult');
    if (kind === 'duel') html = COACH.duel;
    else if (ult?.used) html = COACH.ult_done;
    else if (g.activeUnit && g.activeUnit.team === 'player' && g.activeUnit !== ult?.sapidae) html = COACH.ult_axie;
    else html = COACH.ult_wait;
    const ready = kind === 'ult' && ult && !ult.used && ult.check?.(g.activeUnit)?.ok;
    btn?.classList.toggle('tut-highlight', Boolean(ready));
    const t = this.coachEl.querySelector('[data-ref="text"]');
    if (t && t.innerHTML !== html) t.innerHTML = html;
    this.coachEl.classList.remove('hidden');
  }

  _coachOff() {
    this.coachEl?.classList.add('hidden');
    document.getElementById('spell-slot-ult')?.classList.remove('tut-highlight');
  }

  // ------------------------------------------------ tarjeta de recompensa
  _itemView(id) { const it = ITEMS_DB[id]; return it ? { icon: it.icon, name: it.name, rarity: it.rarity } : { icon: ICON('gift'), name: id }; }
  _matView(id, n = 1) { const m = MATERIALS[id]; return { icon: m?.icon || ICON('material'), name: m?.name || id, qty: n, rarity: m?.rarity }; }

  _reward({ title, items = [], note = '' }) {
    this._rewardOpen = true;
    return showRewardCard({ title, items, note, audio: this.om?.audio }).then(() => { this._rewardOpen = false; });
  }
}
