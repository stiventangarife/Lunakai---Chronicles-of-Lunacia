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

const PALADILL = { speaker: 'Maestro Paladill', title: 'Mentor del Dojo', avatar: './assets/portraits/paladill.png', npcId: 'paladill' };
const PALADILL_POS = { x: -90.3, z: 63.3 };
const TREE_POS = { x: -73.5, z: 54.5 };
const FORGE_POS = { x: -76.5, z: 67.0 };
const QUEST = 'quest_slime_purification';
const ICON = (n) => `./assets/ui/icons/${n}.png`;
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
    if (!this.isActive || this.done) return true;
    const at = UNLOCK_AT[name];
    return at ? idx(this.step) >= idx(at) : true;
  }
  unlockFeature() { this._updateHUDButtonsState(); }

  /** Mensaje si `feature` aún no está disponible (null = se puede usar). `extra` = id del punto de recolección. */
  lockMessage(feature, extra = null) {
    if (!this.isActive || this.done) return null;
    if (feature === 'gather' && extra === 'tree_forest_forge' && idx(this.step) >= idx('chop')) return null;
    return this.isFeatureUnlocked(feature) ? null : (LOCKED[feature] || 'Todavía no: sigue el entrenamiento del Maestro Paladill.');
  }

  isInputLocked(code) {
    if (this.isCutsceneActive) return code !== 'Escape';
    if (this.isOverlayActive) return !(code === 'KeyI' || code === 'Escape');
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
    if (this.done) this._applyDone();
    this._updateHUDButtonsState();
  }

  // Llamadas que siguen haciendo OverworldManager y NPCManager
  onQuestBookOpened() {}
  onQuestBookClosed() {}
  onInventoryOpened() { if (this.step === 'equip_sword') this._spotlightOff(); }
  onInventoryClosed() { if (this.step === 'equip_sword' && !this._swordOn()) this._spotlight('#btn-open-inventory', 'Pulsa <kbd>I</kbd> o haz clic aquí'); }
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
  _axieName() { return this.em?.heroesBase?.[this._mainAxie()]?.name || this.om?.player?.companionName || 'tu Axie'; }
  _name() { return this.om?.player?.name || 'aprendiz'; }
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
    if (this.care) this.care.cooldownFree = ['bond_talk', 'pet', 'feed'].includes(step);
    this.om?.inventoryModal?.setTutorialLock?.(step === 'equip_sword', step === 'equip_sword' ? 'wood_sword' : null);
    this._syncQuest();
    if (step === 'equip_sword') {
      this._ensureItem('wood_sword');
      if (this._swordOn()) { this._completeEquip(); return; }
      if (!this.om?.inventoryModal?.isOpen) setTimeout(() => this.step === 'equip_sword' && !this.om?.inventoryModal?.isOpen && this._spotlight('#btn-open-inventory', 'Pulsa <kbd>I</kbd> o haz clic aquí'), 400);
    }
    if (step === 'chop') { try { GatheringService.reset('tree_forest_forge'); } catch { /* nada */ } }
    if (step === 'forge_open' || step === 'forge_evolve' || step === 'forge_speed' || step === 'forge_collect') this._onForge();
    if (step === 'feed') this._ensureFood();
    if (step === 'runes') this._checkRunes();
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
    const main = this._mainAxie();
    if (this.bondBefore == null) this.bondBefore = BondService.get(main);
    BondService.set(main, 100);
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
      this._reward({ title: 'Has defendido el Dojo', items: [this._itemView('wood_sword')] }).then(() => this._go('equip_talk', { talkNow: true }));
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
        if (o) { this.flags.speedCost = o.baxs; ForgeService.grant?.({ baxs: o.baxs }); } // Paladill invita: se paga con su regalo
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
    const eq = this.em?.equipped?.sapidae || {};
    this._reward({ title: 'Espada evolucionada', items: [this._itemView('iron_sword')], note: eq.weapon === 'iron_sword' ? 'Ya la llevas equipada: la Forja devuelve la pieza a su ranura.' : 'Está en tu Mochila: equípala con <kbd>I</kbd>.' })
      .then(() => this._go('bond_talk', { talkNow: true }));
  }

  async _giveForgeBundle() {
    if (!this.flags.duelGold) { this.flags.duelGold = true; this.em?.addGold?.(REWARDS.duelGold); }
    if (!this.flags.bundle) {
      this.flags.bundle = true;
      Object.entries(REWARDS.bundle).forEach(([id, n]) => ForgeService.addMats(id, n, false));
      const w = ForgeService.wallet();
      if (w.slp < 50) ForgeService.grant?.({ slp: 50 - w.slp });
      ForgeService.addMats('mat_wood', 0, true);
    }
    await this._reward({
      title: 'Regalo del Maestro',
      items: [{ icon: ICON('resource'), name: 'Oro', qty: REWARDS.duelGold }, ...Object.entries(REWARDS.bundle).map(([id, n]) => this._matView(id, n))],
      note: 'Lote del aprendiz: ya solo falta <b>madera</b>.',
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
      this._save();
    }
    await this._reward({
      title: 'Runa y charm neutros',
      items: [
        { icon: ICON('rune'), name: RUNE_BY_ID[REWARDS.rune]?.name || 'Runa', sub: 'Runa' },
        { icon: ICON('charm'), name: CHARM_BY_ID[REWARDS.charm]?.name || 'Charm', sub: 'Charm' },
      ],
      note: 'Los neutros sirven para cualquier Axie y cualquier parte.',
    });
  }

  _checkRunes() {
    if (this.step !== 'runes') return;
    const eq = RuneCharmService.get(this._mainAxie());
    const hasCharm = Object.values(eq.charms || {}).some(Boolean);
    const t = this.bannerEl?.querySelector('[data-ref="text"]');
    if (t) t.innerHTML = this._fmt(`Pulsa <kbd>U</kbd> y equipa a {axie}: ${eq.rune ? '✓ runa' : '<b>una runa</b>'} · ${hasCharm ? '✓ charm' : '<b>un charm</b>'}.`);
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
    if (!this.flags.duelGold) { this.flags.duelGold = true; em?.addGold?.(REWARDS.duelGold); got.push({ icon: ICON('resource'), name: 'Oro', qty: REWARDS.duelGold }); }
    if (idx(this.step) < idx('feed')) { em?.addItemsToInventory?.(REWARDS.food); got.push({ ...this._itemView('food_berry'), qty: REWARDS.food.length }); }
    const main = this._mainAxie();
    const rc = RuneCharmService.get(main);
    if (!rc.rune) RuneCharmService.setRune(main, REWARDS.rune);
    if (!Object.values(rc.charms || {}).some(Boolean)) RuneCharmService.setCharm(main, 'eyes', REWARDS.charm);
    got.push({ icon: ICON('rune'), name: RUNE_BY_ID[REWARDS.rune]?.name || 'Runa' }, { icon: ICON('charm'), name: CHARM_BY_ID[REWARDS.charm]?.name || 'Charm' });
    em?._updateSapidaePortrait?.();
    em?._notifyChange?.();
    try { this.om?.player?.applyEquipment?.(em.equipped.sapidae || {}); } catch { /* nada */ }
    this._markDone(false);
    this._reward({ title: 'Entrenamiento completado', items: got, note: 'La runa y el charm ya están equipados en tu Axie. Pulsa <kbd>M</kbd> para ver el mapa.' });
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
    veil.innerHTML = '<div class="lk-cine-veil__load"><span>Abriendo la crónica…</span><i><b data-ref="bar"></b></i></div>';
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
      const x = PALADILL_POS.x + 1.2, z = PALADILL_POS.z - 4.6;
      const y = om.getGroundHeight ? om.getGroundHeight(x, z) : 0;
      om.player?.teleport(x, y, z, 0);
      om.cameraController?.setFollowTarget(om.player, true);
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
    if (this.step === 'chop') return { ...TREE_POS, name: 'Árbol de la Forja' };
    if (this.step.startsWith('forge_')) return { ...FORGE_POS, name: 'Forja del Valle' };
    if (this.step === 'pet' || this.step === 'feed' || this.step === 'runes' || this.step === 'equip_sword') return null;
    return { ...PALADILL_POS, name: 'Maestro Paladill' };
  }

  _lockPortals(locked) {
    const tm = this.om?.worldMapManager?.transitionManager;
    try { tm?.setPortalsLocked?.(locked); } catch { /* nada */ }
  }

  // ================================================================ interfaz
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
      <button type="button" class="lk-tut__skip" data-ref="skip" title="Saltar el entrenamiento y recibir sus recompensas">Saltar tutorial</button>
      <div class="lk-tut__confirm" data-ref="confirm" hidden><span>¿Saltar el entrenamiento? Recibirás sus recompensas.</span><button type="button" class="lk-yes" data-ref="yes">Sí, saltar</button><button type="button" class="lk-no" data-ref="no">Seguir</button></div>`;
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
        <div id="tutorial-spotlight-pointer" class="tutorial-spotlight-pointer hidden"><div class="pointer-hand">👇</div><div id="pointer-text" class="pointer-text"></div></div>`;
      document.body.appendChild(overlay);
    }
    overlay.className = 'tutorial-focus-overlay hidden';
    overlay.addEventListener('click', (e) => {
      const t = this._spotTarget;
      if (!this.isOverlayActive || !t) return;
      const r = t.getBoundingClientRect();
      if (e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6) t.click();
    });
    this.overlayEl = overlay;
    window.addEventListener('resize', () => this._placeSpot());

    let coach = document.getElementById('lk-tut-coach');
    if (!coach) {
      coach = document.createElement('div');
      coach.id = 'lk-tut-coach';
      coach.className = 'lk-ui lk-ctut lk-ctut--hint hidden';
      coach.innerHTML = `<div class="lk-ctut__card"><span class="lk-ctut__coach" aria-hidden="true"><img src="./assets/portraits/paladill.png" alt=""></span>
        <div class="lk-ctut__body"><div class="lk-ctut__head"><span class="lk-ctut__badge">Maestro Paladill</span></div><p class="lk-ctut__text" data-ref="text"></p></div></div>`;
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
    $('badge').textContent = completed ? 'Entrenamiento completado' : `Entrenamiento · ${PHASES[phase] || ''}`;
    $('title').textContent = this._fmt(def.title).replace(/&amp;/g, '&');
    $('text').innerHTML = this._fmt(def.text);
    $('skip').hidden = completed;
    $('confirm').hidden = true;
    const changed = b.dataset.step !== (completed ? 'done' : this.step);
    b.dataset.step = completed ? 'done' : this.step;
    b.classList.remove('hidden');
    b.classList.toggle('is-completed', completed);
    // por encima de la Forja, la Mochila y Axie Care cuando el paso ocurre dentro de ellas
    b.classList.toggle('tutorial-spotlight-banner', ['forge_evolve', 'forge_speed', 'forge_collect', 'runes', 'equip_sword', 'pet', 'feed'].includes(this.step) && !completed);
    // dentro de la Forja y la Mochila la franja baja al pie de la pantalla para no tapar sus cabeceras
    b.classList.toggle('lk-tut--low', ['forge_evolve', 'forge_speed', 'forge_collect', 'runes'].includes(this.step) && !completed);
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
    if (!this.isOverlayActive || !t) return;
    const r = t.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const pad = 6, x1 = Math.max(0, r.left - pad), y1 = Math.max(0, r.top - pad), x2 = Math.min(innerWidth, r.right + pad), y2 = Math.min(innerHeight, r.bottom + pad);
    const poly = `polygon(evenodd, 0px 0px, 100vw 0px, 100vw 100vh, 0px 100vh, 0px 0px, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
    this.overlayEl.style.clipPath = poly; this.overlayEl.style.webkitClipPath = poly;
    const box = document.getElementById('tutorial-spotlight-box');
    if (box) { Object.assign(box.style, { top: `${y1}px`, left: `${x1}px`, width: `${x2 - x1}px`, height: `${y2 - y1}px` }); box.classList.remove('hidden'); }
    const ptr = document.getElementById('tutorial-spotlight-pointer');
    if (ptr) {
      const pw = ptr.offsetWidth || 260, ph = ptr.offsetHeight || 40;
      ptr.style.top = `${Math.max(12, y1 - ph - 16)}px`;
      ptr.style.left = `${Math.max(12, Math.min(innerWidth - pw - 16, (x1 + x2) / 2 - pw / 2))}px`;
    }
  }

  _spotlightOff() {
    this.isOverlayActive = false;
    this.activeOverlayStep = null;
    this._spotTarget?.classList.remove('tutorial-spotlight-target');
    this._spotTarget = null;
    if (this.overlayEl) { this.overlayEl.classList.add('hidden'); this.overlayEl.style.clipPath = 'none'; this.overlayEl.style.webkitClipPath = 'none'; }
    document.getElementById('tutorial-spotlight-box')?.classList.add('hidden');
    document.getElementById('tutorial-spotlight-pointer')?.classList.add('hidden');
    if (!['forge_evolve', 'forge_speed', 'forge_collect', 'runes', 'equip_sword', 'pet', 'feed'].includes(this.step)) this.bannerEl?.classList.remove('tutorial-spotlight-banner');
    if (this.isActive && !this.isCutsceneActive) this.om?.playerController?.setEnabled?.(this.om.state === 'EXPLORING');
  }

  // ------------------------------------------------ consejo en combate
  _updateCoach() {
    const g = this.game;
    const cfg = g?.activeBattleConfig;
    const kind = cfg?.tutorialKind;
    const inFight = g?.gameState === 'BATTLE' && !document.body.classList.contains('state-combat-ended') && (kind === 'duel' || kind === 'ult');
    if (!inFight) { this._coachOff(); return; }
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
    return new Promise((resolve) => {
      this._rewardOpen = true;
      const RC = { common: '#3a4a6e', rare: '#2a5a8a', epic: '#5a2a8a', mystic: '#8a6a1a' };
      const el = document.createElement('div');
      el.className = 'lk-ui lk-reward';
      el.setAttribute('role', 'dialog');
      el.innerHTML = `<span class="lk-reward__kicker">Recompensa</span><h3 class="lk-reward__title">${esc(title)}</h3>
        <div class="lk-reward__items">${items.map((it) => `<div class="lk-reward__it"><span class="lk-reward__ico" style="--rc:${RC[it.rarity] || '#3a4a6e'}">${it.icon ? `<img src="${esc(it.icon)}" alt="">` : '<span>✦</span>'}${it.qty > 1 ? `<em>×${it.qty}</em>` : ''}</span><b>${esc(it.name)}</b></div>`).join('')}</div>
        ${note ? `<p class="lk-reward__note">${note}</p>` : ''}<div class="lk-reward__hint">Clic o Espacio para continuar</div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('lk-is-on'));
      this.om?.audio?.playBuff?.();
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        window.removeEventListener('keydown', onKey, true);
        el.classList.remove('lk-is-on');
        setTimeout(() => el.remove(), 400);
        this._rewardOpen = false;
        resolve();
      };
      const onKey = (e) => { if (['Space', 'Enter', 'Escape', 'KeyE'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
      setTimeout(() => window.addEventListener('keydown', onKey, true), 350);
      el.addEventListener('click', close);
      setTimeout(close, 6000);
    });
  }
}
