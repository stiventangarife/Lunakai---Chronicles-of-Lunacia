// OverworldTutorialManager.js - Comprehensive Guided Tutorial Coordinator
export class OverworldTutorialManager {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.isActive = true;
    this.currentStep = 'TALK_TO_PALADILL';
    this.hasOpenedQuestBook = false;
    this.hasEquippedSword = false;

    // Control and overlay states
    this.isOverlayActive = false;
    this.activeOverlayStep = null;
    this.isCutsceneActive = false;

    // Progressive feature unlocks
    this.unlockedFeatures = {
      questBook: false,
      combat: false,
      inventory: false,
      worldMap: false
    };

    this.steps = {
      TALK_TO_PALADILL: {
        badge: '🥋 STEP 1 OF 5',
        title: 'Talk to Master Paladill',
        text: 'Follow the golden arrow using <kbd>W A S D</kbd> to Master Paladill <kbd>[-90.3, 63.3]</kbd> and press <kbd>E</kbd> to receive your training.',
        requiredAction: 'talk_paladill'
      },
      OPEN_QUEST_BOOK: {
        badge: '📖 STEP 2 OF 5',
        title: 'Open your Quest Book',
        text: 'Press <kbd>[J]</kbd> or click <b>📖 Quests [J]</b> to check the mission assigned by the master.',
        requiredAction: 'open_quest_book'
      },
      DEFEAT_SLIME: {
        badge: '⚔️ STEP 3 OF 5',
        title: 'Face the Slime Chimera',
        text: 'A Slime Chimera has appeared in the east garden! Cross the bridge and defeat it in tactical combat <kbd>[E]</kbd>.',
        requiredAction: 'defeat_slime'
      },
      RETURN_TO_PALADILL: {
        badge: '🏆 STEP 4 OF 5',
        title: 'Report your Victory to Master Paladill',
        text: 'Chimera purified! Return to Master Paladill <kbd>[E]</kbd> to turn in the quest and claim your first reward.',
        requiredAction: 'return_paladill'
      },
      EQUIP_SWORD: {
        badge: '🗡️ STEP 5: EQUIP YOUR WEAPON',
        title: 'Open your Inventory and Equip your Sword',
        text: 'Press <kbd>[I]</kbd> or click <b>🎒 Inventory [I]</b>, open your backpack, and equip the Wooden Sword to {heroName}.',
        requiredAction: 'equip_sword'
      },
      TALK_PALADILL_DEPARTURE: {
        badge: '🗺️ DOJO GRADUATION',
        title: 'Talk to the Master to Leave the Dojo',
        text: 'Sword equipped! Speak with Paladill <kbd>[E]</kbd> to dispel the gate seals and receive the World Map.',
        requiredAction: 'talk_paladill_departure'
      },
      COMPLETED: {
        badge: '🎉 OPEN WORLD UNLOCKED!',
        title: 'Lunacia Graduation Completed!',
        text: 'Cardinal barriers have fallen. Press <kbd>[M]</kbd> to open the World Map and freely explore the 49 macro-zones.',
        requiredAction: 'none'
      }
    };

    this._createDOM();
  }

  _createDOM() {
    let banner = document.getElementById('overworld-tutorial-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'overworld-tutorial-banner';
      banner.className = 'overworld-tutorial-banner hidden';
      banner.innerHTML = `
        <div class="tut-banner-glow"></div>
        <div class="tut-banner-content">
          <div class="tut-banner-header">
            <span id="tut-step-badge" class="tut-step-badge">🥋 STEP 1 OF 5</span>
            <h3 id="tut-step-title" class="tut-step-title">Talk to Master Paladill</h3>
          </div>
          <p id="tut-step-text" class="tut-step-text">
            Walk using <kbd>W A S D</kbd> to Master Paladill and press <kbd>E</kbd>.
          </p>
        </div>
      `;
      document.body.appendChild(banner);
    }
    this.bannerEl = banner;
    this.badgeEl = document.getElementById('tut-step-badge');
    this.titleEl = document.getElementById('tut-step-title');
    this.textEl = document.getElementById('tut-step-text');

    // Dimming spotlight overlay for locked tutorial steps
    let overlay = document.getElementById('tutorial-focus-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tutorial-focus-overlay';
      overlay.className = 'tutorial-focus-overlay hidden';
      overlay.innerHTML = `
        <div class="tutorial-overlay-backdrop"></div>
        <div id="tutorial-spotlight-box" class="tutorial-spotlight-highlight-box hidden"></div>
        <div id="tutorial-spotlight-pointer" class="tutorial-spotlight-pointer hidden">
          <div class="pointer-hand">👇</div>
          <div id="pointer-text" class="pointer-text">Press [J] or click here</div>
        </div>
        <div id="tutorial-cutscene-alert" class="tutorial-cutscene-alert hidden"></div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (this.isOverlayActive && this._currentTargetEl) {
          const rect = this._currentTargetEl.getBoundingClientRect();
          if (
            e.clientX >= rect.left - 6 &&
            e.clientX <= rect.right + 6 &&
            e.clientY >= rect.top - 6 &&
            e.clientY <= rect.bottom + 6
          ) {
            this._currentTargetEl.click();
          }
        }
      });
    }
    this.overlayEl = overlay;
    this.spotlightBoxEl = document.getElementById('tutorial-spotlight-box');
    this.pointerEl = document.getElementById('tutorial-spotlight-pointer');
    this.pointerTextEl = document.getElementById('pointer-text');
    this.cutsceneAlertEl = document.getElementById('tutorial-cutscene-alert');

    window.addEventListener('resize', () => {
      if (this.isOverlayActive && this._currentTargetEl) {
        this._updateSpotlightCutout();
      }
    });
  }

  start(forceReset = false) {
    if (!forceReset && (!this.isActive || this.currentStep === 'COMPLETED')) {
      this.hideBanner();
      this.deactivateStepOverlay();
      this.unlockedFeatures = { questBook: true, combat: true, inventory: true, worldMap: true };
      this._updateHUDButtonsState();
      if (this.om && this.om.worldMapManager && this.om.worldMapManager.transitionManager) {
        this.om.worldMapManager.transitionManager.setPortalsLocked(false);
      }
      return;
    }
    this.isActive = true;
    this.setStep('TALK_TO_PALADILL');
    this._updateHUDButtonsState();
  }

  exportSaveData() {
    return {
      isActive: this.isActive,
      currentStep: this.currentStep,
      hasOpenedQuestBook: Boolean(this.hasOpenedQuestBook),
      hasEquippedSword: Boolean(this.hasEquippedSword),
      unlockedFeatures: { ...this.unlockedFeatures }
    };
  }

  loadSaveData(saveData, heroLevel = 1) {
    if (saveData) {
      this.isActive = saveData.isActive !== undefined ? Boolean(saveData.isActive) : false;
      this.currentStep = saveData.currentStep || (this.isActive ? 'TALK_TO_PALADILL' : 'COMPLETED');
      this.hasOpenedQuestBook = Boolean(saveData.hasOpenedQuestBook);
      this.hasEquippedSword = Boolean(saveData.hasEquippedSword);
      this.unlockedFeatures = saveData.unlockedFeatures || {
        questBook: !this.isActive,
        combat: !this.isActive,
        inventory: !this.isActive,
        worldMap: !this.isActive
      };
    } else if (heroLevel > 1) {
      this.isActive = false;
      this.currentStep = 'COMPLETED';
      this.hasOpenedQuestBook = true;
      this.hasEquippedSword = true;
      this.unlockedFeatures = { questBook: true, combat: true, inventory: true, worldMap: true };
    }

    if (!this.isActive || this.currentStep === 'COMPLETED') {
      this.hideBanner();
      this.deactivateStepOverlay();
      this.unlockedFeatures = { questBook: true, combat: true, inventory: true, worldMap: true };
      if (this.om?.inventoryModal) {
        this.om.inventoryModal.setTutorialLock(false, null);
      }
      if (this.om && this.om.worldMapManager && this.om.worldMapManager.transitionManager) {
        this.om.worldMapManager.transitionManager.setPortalsLocked(false);
      }
    } else {
      this.setStep(this.currentStep);
      if (this.currentStep === 'OPEN_QUEST_BOOK' && !this.hasOpenedQuestBook) {
        setTimeout(() => this.activateStepOverlay('OPEN_QUEST_BOOK'), 400);
      } else if (this.currentStep === 'EQUIP_SWORD' && !this.hasEquippedSword) {
        setTimeout(() => {
          if (this.om?.inventoryModal) {
            this.om.inventoryModal.setTutorialLock(true, 'wood_sword');
          }
          this.activateStepOverlay('EQUIP_SWORD');
        }, 400);
      }
    }
    this._updateHUDButtonsState();
  }

  isFeatureUnlocked(featureName) {
    if (!this.isActive) return true;
    return Boolean(this.unlockedFeatures[featureName]);
  }

  unlockFeature(featureName) {
    this.unlockedFeatures[featureName] = true;
    this._updateHUDButtonsState();

    if (this.om && this.om.audio && typeof this.om.audio.playBuff === 'function') {
      this.om.audio.playBuff();
    }
  }

  _updateHUDButtonsState() {
    const invBtn = document.getElementById('btn-open-inventory');
    if (invBtn) {
      if (this.isFeatureUnlocked('inventory')) {
        invBtn.classList.remove('hud-btn-locked');
        invBtn.classList.add('hud-btn-unlocked');
        invBtn.removeAttribute('disabled');
      } else {
        invBtn.classList.add('hud-btn-locked');
        invBtn.classList.remove('hud-btn-unlocked');
        invBtn.setAttribute('disabled', 'true');
      }
    }

    const questBtn = document.getElementById('btn-open-quest-book');
    if (questBtn) {
      if (this.isFeatureUnlocked('questBook')) {
        questBtn.classList.remove('hud-btn-locked');
        questBtn.classList.add('hud-btn-unlocked');
        questBtn.removeAttribute('disabled');
      } else {
        questBtn.classList.add('hud-btn-locked');
        questBtn.classList.remove('hud-btn-unlocked');
        questBtn.setAttribute('disabled', 'true');
      }
    }

    const mapBtn = document.getElementById('btn-open-world-map');
    if (mapBtn) {
      if (this.isFeatureUnlocked('worldMap')) {
        mapBtn.classList.remove('hud-btn-locked');
        mapBtn.classList.add('hud-btn-unlocked');
        mapBtn.removeAttribute('disabled');
      } else {
        mapBtn.classList.add('hud-btn-locked');
        mapBtn.classList.remove('hud-btn-unlocked');
        mapBtn.setAttribute('disabled', 'true');
      }
    }
  }

  _formatText(str) {
    if (!str || typeof str !== 'string') return str;
    const heroName = this.om?.player?.name || 'Hero';
    return str.replace(/{heroName}/g, heroName);
  }

  setStep(stepId) {
    if (!this.steps[stepId]) return;
    this.currentStep = stepId;
    const step = this.steps[stepId];

    if (this.badgeEl) this.badgeEl.innerHTML = this._formatText(step.badge);
    if (this.titleEl) this.titleEl.innerHTML = this._formatText(step.title);
    if (this.textEl) this.textEl.innerHTML = this._formatText(step.text);

    if (this.bannerEl) {
      this.bannerEl.classList.remove('hidden');
      if (stepId === 'COMPLETED') {
        this.bannerEl.classList.add('is-completed');
        setTimeout(() => {
          this.bannerEl.classList.add('hidden');
          this.isActive = false;
        }, 8000);
      }
    }

    if (this.om && this.om.audio && typeof this.om.audio.playStep === 'function') {
      this.om.audio.playStep();
    }
  }

  hideBanner() {
    if (this.bannerEl) {
      this.bannerEl.classList.add('hidden');
    }
  }

  showBanner() {
    if (this.bannerEl && this.isActive && this.currentStep !== 'COMPLETED') {
      this.bannerEl.classList.remove('hidden');
    }
  }

  // Spotlight & Dimming Control
  activateStepOverlay(stepId) {
    this.isOverlayActive = true;
    this.activeOverlayStep = stepId;

    if (this.om?.playerController) {
      this.om.playerController.setEnabled(false);
    }

    if (this.overlayEl) {
      this.overlayEl.classList.remove('hidden');
    }

    if (this.bannerEl) {
      this.bannerEl.classList.add('tutorial-spotlight-banner');
    }

    document.querySelectorAll('.tutorial-spotlight-target').forEach(el => {
      el.classList.remove('tutorial-spotlight-target');
    });

    if (stepId === 'OPEN_QUEST_BOOK') {
      const btn = document.getElementById('btn-open-quest-book');
      if (btn) {
        btn.classList.add('tutorial-spotlight-target');
        this._showSpotlight(btn, 'Press <kbd>[J]</kbd> or click to open Quests');
      }
    } else if (stepId === 'EQUIP_SWORD') {
      const btn = document.getElementById('btn-open-inventory');
      if (btn) {
        btn.classList.add('tutorial-spotlight-target');
        this._showSpotlight(btn, 'Press <kbd>[I]</kbd> or click to open Inventory');
      }
    }
  }

  deactivateStepOverlay() {
    this.isOverlayActive = false;
    this.activeOverlayStep = null;
    this._currentTargetEl = null;

    if (this.overlayEl) {
      this.overlayEl.classList.add('hidden');
      this.overlayEl.style.clipPath = 'none';
      this.overlayEl.style.webkitClipPath = 'none';
    }

    if (this.spotlightBoxEl) {
      this.spotlightBoxEl.classList.add('hidden');
    }

    if (this.pointerEl) {
      this.pointerEl.classList.add('hidden');
    }

    if (this.bannerEl) {
      this.bannerEl.classList.remove('tutorial-spotlight-banner');
    }

    document.querySelectorAll('.tutorial-spotlight-target').forEach(el => {
      el.classList.remove('tutorial-spotlight-target');
    });

    if (!this.isCutsceneActive && this.om?.playerController) {
      this.om.playerController.setEnabled(true);
    }
  }

  _showSpotlight(targetEl, htmlText) {
    if (!targetEl) return;
    this._currentTargetEl = targetEl;
    if (this.pointerTextEl) this.pointerTextEl.innerHTML = htmlText;
    if (this.pointerEl) this.pointerEl.classList.remove('hidden');
    this._updateSpotlightCutout();
    setTimeout(() => this._updateSpotlightCutout(), 50);
  }

  _updateSpotlightCutout() {
    if (!this.isOverlayActive || !this._currentTargetEl) return;
    const rect = this._currentTargetEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const pad = 6;
    const x1 = Math.round(Math.max(0, rect.left - pad));
    const y1 = Math.round(Math.max(0, rect.top - pad));
    const x2 = Math.round(Math.min(window.innerWidth, rect.right + pad));
    const y2 = Math.round(Math.min(window.innerHeight, rect.bottom + pad));

    // Dynamic physical cutout hole in the dark overlay so the button is completely uncovered and clickable!
    const polygonStr = `polygon(evenodd, 0px 0px, 100vw 0px, 100vw 100vh, 0px 100vh, 0px 0px, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
    if (this.overlayEl) {
      this.overlayEl.style.clipPath = polygonStr;
      this.overlayEl.style.webkitClipPath = polygonStr;
    }

    // Glowing golden outline frame around the button
    if (this.spotlightBoxEl) {
      this.spotlightBoxEl.style.top = `${y1}px`;
      this.spotlightBoxEl.style.left = `${x1}px`;
      this.spotlightBoxEl.style.width = `${x2 - x1}px`;
      this.spotlightBoxEl.style.height = `${y2 - y1}px`;
      this.spotlightBoxEl.classList.remove('hidden');
    }

    // Position pointer tooltip above the cutout frame with comfortable clearance
    if (this.pointerEl) {
      const pWidth = this.pointerEl.offsetWidth || 280;
      const pHeight = this.pointerEl.offsetHeight || 44;
      const top = Math.max(12, y1 - pHeight - 16);
      const left = Math.max(12, Math.min(window.innerWidth - pWidth - 16, (x1 + x2) / 2 - pWidth / 2));
      this.pointerEl.style.top = `${top}px`;
      this.pointerEl.style.left = `${left}px`;
    }
  }

  isInputLocked(keyCode) {
    if (this.isCutsceneActive) return true;
    if (keyCode === 'Escape') return false;
    if (this.isOverlayActive) {
      if (this.activeOverlayStep === 'OPEN_QUEST_BOOK') {
        if (keyCode === 'KeyJ' || keyCode === 'KeyL') return false;
        return true;
      }
      if (this.activeOverlayStep === 'EQUIP_SWORD') {
        if (keyCode === 'KeyI') return false;
        return true;
      }
      return true;
    }
    return false;
  }

  // Point 2: Chimera Spawn Dramatic Camera Pan Cutscene & Arrow
  async _playChimeraSpawnCutscene() {
    this.isCutsceneActive = true;
    if (this.om?.playerController) {
      this.om.playerController.setEnabled(false);
    }

    // Camera pan to Chimera spawn point in east garden: (8.0, 0, 2.0)
    if (this.om?.cameraController) {
      this.om.cameraController.panTo({ x: 8.0, y: 0.6, z: 2.0 });
    }

    // Spawn Chimera Slime
    if (this.om?.monsters && typeof this.om.monsters.spawnTutorialSlime === 'function') {
      await this.om.monsters.spawnTutorialSlime();
    }

    // Show cutscene notification banner
    if (this.cutsceneAlertEl) {
      this.cutsceneAlertEl.innerHTML = `
        <div style="font-size: 16px; font-weight: 900; color: #facc15; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
          👾 A Slime Chimera has appeared in the East Garden!
        </div>
        <div style="font-size: 13px; color: #e2e8f0;">
          Follow the golden arrow above its head to reach and purify it.
        </div>
      `;
      this.cutsceneAlertEl.classList.remove('hidden');
    }

    if (this.om?.audio && typeof this.om.audio.playCollision === 'function') {
      this.om.audio.playCollision();
    }

    // Hold dramatic focus on the newly emerged chimera for 2.6 seconds
    await new Promise(resolve => setTimeout(resolve, 2600));

    if (this.cutsceneAlertEl) {
      this.cutsceneAlertEl.classList.add('hidden');
    }

    // Smoothly return camera to the player
    if (this.om?.cameraController && this.om?.player) {
      this.om.cameraController.setFollowTarget(this.om.player, false);
    }

    // Allow camera 1.1 seconds to glide back to the player
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Restore player controls and normal gameplay
    this.isCutsceneActive = false;
    if (this.om?.playerController) {
      this.om.playerController.setEnabled(true);
    }
  }

  // Sequence Callbacks
  onPaladillInitialTalkComplete() {
    if (this.currentStep === 'TALK_TO_PALADILL') {
      this.unlockFeature('questBook');
      this.setStep('OPEN_QUEST_BOOK');
      this.activateStepOverlay('OPEN_QUEST_BOOK');
    }
  }

  onQuestBookOpened() {
    this.hasOpenedQuestBook = true;
    if (this.pointerEl) {
      this.pointerEl.classList.add('hidden');
    }
  }

  async onQuestBookClosed() {
    if (this.currentStep === 'OPEN_QUEST_BOOK' && this.hasOpenedQuestBook) {
      this.deactivateStepOverlay();
      this.unlockFeature('combat');
      this.setStep('DEFEAT_SLIME');
      await this._playChimeraSpawnCutscene();
    }
  }

  onSlimeDefeated() {
    this.setStep('RETURN_TO_PALADILL');
  }

  onPaladillRewardDelivered() {
    if (this.currentStep === 'RETURN_TO_PALADILL') {
      this.unlockFeature('inventory');
      this.setStep('EQUIP_SWORD');
      if (this.om?.inventoryModal) {
        this.om.inventoryModal.setTutorialLock(true, 'wood_sword');
      }
      this.activateStepOverlay('EQUIP_SWORD');
    }
  }

  onInventoryOpened() {
    if (this.pointerEl) {
      this.pointerEl.classList.add('hidden');
    }
  }

  onSwordEquipped() {
    this.hasEquippedSword = true;
    if (this.currentStep === 'EQUIP_SWORD') {
      if (this.om?.inventoryModal) {
        this.om.inventoryModal.setTutorialLock(false, null);
      }
      this.setStep('TALK_PALADILL_DEPARTURE');
    }
  }

  onInventoryClosed() {
    const em = this.om && this.om.equipmentManager;
    const isSwordEquipped = Boolean(
      this.hasEquippedSword ||
      (em && em.equipped && (
        em.equipped.sapidae?.weapon === 'wood_sword' ||
        em.equipped.kotaro?.weapon === 'wood_sword' ||
        Object.values(em.equipped.sapidae || {}).includes('wood_sword') ||
        Object.values(em.equipped.kotaro || {}).includes('wood_sword')
      ))
    );

    if (this.currentStep === 'EQUIP_SWORD' && isSwordEquipped) {
      this.hasEquippedSword = true;
      this.deactivateStepOverlay();
      this.setStep('TALK_PALADILL_DEPARTURE');
    } else if (this.currentStep === 'EQUIP_SWORD' && !isSwordEquipped) {
      this.activateStepOverlay('EQUIP_SWORD');
    } else if (this.currentStep === 'TALK_PALADILL_DEPARTURE') {
      this.deactivateStepOverlay();
    }
  }

  onPaladillGraduationComplete() {
    this.unlockFeature('worldMap');
    if (this.om && this.om.zoneTransitions) {
      this.om.zoneTransitions.setPortalsLocked(false);
    }
    if (this.om?.inventoryModal) {
      this.om.inventoryModal.setTutorialLock(false, null);
    }
    this.setStep('COMPLETED');
  }
}
