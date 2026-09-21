// QuestBookModal.js - Open Lunacian Tome / Grimoire Quest Book UI
import { NPC_PORTRAIT_MAP } from '../DialogSystem.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import { ITEMS_DB } from '../../tactics/ItemDatabase.js';

export class QuestBookModal {
  constructor(questManager, audioSystem = null) {
    this.questManager = questManager;
    this.audio = audioSystem;
    this.isOpen = false;
    this.hideCompleted = true; // Por defecto van a estar ocultas según requerimiento
    this.selectedQuestId = 'quest_slime_purification';
    this.activeCategory = 'all'; // 'all', 'Principal', 'Secundaria'

    this._createDOM();

    // Listen to quest changes
    if (this.questManager) {
      this.questManager.onQuestUpdated(() => {
        if (this.isOpen) {
          this._renderLeftPage();
          this._renderRightPage();
        }
      });
    }
  }

  _createDOM() {
    let modal = document.getElementById('quest-book-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'quest-book-modal';
      modal.className = 'quest-book-modal hidden';
      modal.innerHTML = `
        <div class="quest-book-backdrop"></div>
        <div class="quest-book-container">
          <!-- Book Header -->
          <div class="quest-book-header">
            <div class="quest-header-title-group">
              <span class="quest-header-badge">📖 LUNACIA GRIMOIRE</span>
              <h2 class="quest-book-title">Quest Log & Adventurer's Journal</h2>
            </div>
            <button id="quest-book-close-btn" class="quest-book-close-btn" title="Close [J] / [Escape]">✕</button>
          </div>

          <!-- Book Pages Layout (Split Folio) -->
          <div class="quest-book-body">
            <!-- Left Page: List of Quests & Filters -->
            <div class="quest-page-left">
              <div class="quest-left-controls">
                <!-- Hide completed checkbox (Checked by default) -->
                <label class="quest-toggle-completed-label" title="Hide completed quests">
                  <input type="checkbox" id="quest-hide-completed-check" checked />
                  <span class="quest-custom-checkbox"></span>
                  <span class="quest-checkbox-text">Hide completed quests</span>
                </label>

                <!-- Category Filter Pills -->
                <div class="quest-category-bar" id="quest-cat-bar">
                  <button class="quest-cat-btn active" data-cat="all">All</button>
                  <button class="quest-cat-btn" data-cat="Principal">⭐ Main</button>
                  <button class="quest-cat-btn" data-cat="Secundaria">🗺️ Side</button>
                </div>
              </div>

              <!-- Scrollable Quest Entries -->
              <div class="quest-list-scroll" id="quest-list-scroll">
                <!-- Injected dynamically -->
              </div>
            </div>

            <!-- Page Spine Divider -->
            <div class="quest-book-spine"></div>

            <!-- Right Page: Quest Details, Lore, Objectives & Rewards -->
            <div class="quest-page-right" id="quest-detail-pane">
              <!-- Injected dynamically -->
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Event listeners
      modal.querySelector('.quest-book-backdrop').addEventListener('click', () => this.close());
      document.getElementById('quest-book-close-btn').addEventListener('click', () => this.close());

      // Prevent wheel scrolling inside quest book from zooming the 3D overworld camera
      modal.addEventListener('wheel', (e) => {
        e.stopPropagation();
      }, { passive: true });

      // Checkbox toggle
      const checkEl = document.getElementById('quest-hide-completed-check');
      if (checkEl) {
        checkEl.addEventListener('change', (e) => {
          if (this.audio && typeof this.audio.playStep === 'function') this.audio.playStep();
          this.hideCompleted = e.target.checked;
          this._renderLeftPage();
        });
      }

      // Category buttons
      const catBtns = modal.querySelectorAll('.quest-cat-btn');
      catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.audio && typeof this.audio.playTileSelect === 'function') this.audio.playTileSelect();
          catBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeCategory = btn.dataset.cat;
          this._renderLeftPage();
        });
      });
    }
    this.modalEl = modal;
  }

  open(questId = null) {
    if (document.body.classList.contains('state-combat') || 
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      return;
    }
    if (this.isOpen) return;
    this.isOpen = true;
    if (questId && this.questManager.getQuest(questId)) {
      this.selectedQuestId = questId;
    }
    this.modalEl.classList.remove('hidden');

    if (this.audio && typeof this.audio.playBuff === 'function') {
      this.audio.playBuff();
    }

    this._renderLeftPage();
    this._renderRightPage();
    if (this.onOpen) this.onOpen();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.modalEl.classList.add('hidden');

    if (this.audio && typeof this.audio.playStep === 'function') {
      this.audio.playStep();
    }
    if (this.onClose) this.onClose();
  }

  toggle(questId = null) {
    if (document.body.classList.contains('state-combat') || 
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      this.close();
      return;
    }
    if (this.isOpen) {
      this.close();
    } else {
      this.open(questId);
    }
  }

  _renderLeftPage() {
    const container = document.getElementById('quest-list-scroll');
    if (!container) return;
    container.innerHTML = '';

    const allQuests = this.questManager.getAllQuests();

    // Show ONLY discovered quests (active, ready to turn in, or completed).
    // Do NOT show unacquired ('available') or future ('locked') quests.
    const discoveredQuests = allQuests.filter(q => 
      q.status === 'active' || q.status === 'ready_to_turn_in' || q.status === 'completed'
    );

    // Filter by category
    const categoryFiltered = discoveredQuests.filter(q => {
      if (this.activeCategory === 'all') return true;
      return q.category === this.activeCategory;
    });

    const activeQuests = categoryFiltered.filter(q => q.status === 'active' || q.status === 'ready_to_turn_in');
    const completedQuests = categoryFiltered.filter(q => q.status === 'completed');

    // Auto-select a valid visible quest if currently selected is not in discovered list
    const visibleQuests = [...activeQuests, ...(this.hideCompleted ? [] : completedQuests)];
    if (visibleQuests.length > 0 && !visibleQuests.some(q => q.id === this.selectedQuestId)) {
      this.selectedQuestId = visibleQuests[0].id;
    }

    // Group 1: Active Quests
    const activeGroup = document.createElement('div');
    activeGroup.className = 'quest-group';
    activeGroup.innerHTML = `
      <div class="quest-group-header">
        <span class="quest-group-icon">⚔️</span>
        <span class="quest-group-title">Active Quests (${activeQuests.length})</span>
      </div>
    `;

    if (activeQuests.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'quest-empty-group';
      emptyEl.textContent = 'You have no ongoing quests in this category. Talk to NPCs on the map [E] to accept quests.';
      activeGroup.appendChild(emptyEl);
    } else {
      activeQuests.forEach(quest => {
        const card = this._createQuestCard(quest);
        activeGroup.appendChild(card);
      });
    }
    container.appendChild(activeGroup);

    // Group 2: Completed Quests (Visible only if hideCompleted is false)
    if (!this.hideCompleted) {
      const compGroup = document.createElement('div');
      compGroup.className = 'quest-group quest-group-completed-section';
      compGroup.innerHTML = `
        <div class="quest-group-header completed">
          <span class="quest-group-icon">✅</span>
          <span class="quest-group-title">Completed Quests (${completedQuests.length})</span>
        </div>
      `;

      if (completedQuests.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'quest-empty-group';
        emptyEl.textContent = 'You have not completed any quests in this category yet.';
        compGroup.appendChild(emptyEl);
      } else {
        completedQuests.forEach(quest => {
          const card = this._createQuestCard(quest);
          compGroup.appendChild(card);
        });
      }
      container.appendChild(compGroup);
    }
  }

  _createQuestCard(quest) {
    const isSelected = (this.selectedQuestId === quest.id);
    const isCompleted = (quest.status === 'completed');
    const isReadyToTurnIn = (quest.status === 'ready_to_turn_in');

    const card = document.createElement('div');
    card.className = `quest-entry-card ${isSelected ? 'selected' : ''} ${isCompleted ? 'is-completed' : ''}`;

    let statusBadge = '';
    if (isCompleted) {
      statusBadge = '<span class="quest-card-badge completed">✓ COMPLETED</span>';
    } else if (isReadyToTurnIn) {
      statusBadge = '<span class="quest-card-badge turn-in">🎁 TURN IN</span>';
    } else {
      statusBadge = '<span class="quest-card-badge in-progress">IN PROGRESS</span>';
    }

    const isTracked = (this.questManager.getTrackedQuest()?.id === quest.id);
    const catIcon = quest.category === 'Principal' ? '⭐' : '🗺️';
    const catDisplay = quest.category === 'Principal' ? 'MAIN' : 'SIDE';

    card.innerHTML = `
      <div class="quest-card-top">
        <span class="quest-card-cat">${catIcon} ${catDisplay} ${isTracked ? '· 🎯 ACTIVE' : ''}</span>
        ${statusBadge}
      </div>
      <h4 class="quest-card-name">${quest.title}</h4>
      <div class="quest-card-giver">
        <span class="quest-giver-avatar">${this._renderGiverAvatar(quest.giver)}</span>
        <span class="quest-giver-name">${quest.giver.name}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      if (this.audio && typeof this.audio.playStep === 'function') this.audio.playStep();
      this.selectedQuestId = quest.id;
      this._renderLeftPage();
      this._renderRightPage();
    });

    return card;
  }

  _renderRightPage() {
    const container = document.getElementById('quest-detail-pane');
    if (!container) return;

    const quest = this.questManager.getQuest(this.selectedQuestId);
    const isDiscovered = quest && (quest.status === 'active' || quest.status === 'ready_to_turn_in' || quest.status === 'completed');

    if (!quest || !isDiscovered) {
      container.innerHTML = `
        <div class="quest-no-selection">
          <div class="quest-no-sel-icon">📖</div>
          <div class="quest-no-sel-title">Adventure Journal</div>
          <div class="quest-no-sel-desc">Explore Lunacia and interact with its inhabitants [E] to unlock new quests.</div>
        </div>
      `;
      return;
    }

    const isCompleted = (quest.status === 'completed');
    const isReadyToTurnIn = (quest.status === 'ready_to_turn_in');

    let statusTag = '';
    if (isCompleted) {
      statusTag = '<span class="quest-detail-status-pill completed">✅ QUEST COMPLETED</span>';
    } else if (isReadyToTurnIn) {
      statusTag = '<span class="quest-detail-status-pill turn-in">🎁 READY TO TURN IN!</span>';
    } else if (quest.status === 'locked') {
      statusTag = '<span class="quest-detail-status-pill locked">🔒 LOCKED (Complete previous quest)</span>';
    } else if (quest.status === 'available') {
      statusTag = '<span class="quest-detail-status-pill available">❗ AVAILABLE IN THE WORLD</span>';
    } else {
      statusTag = '<span class="quest-detail-status-pill in-progress">⏳ IN PROGRESS</span>';
    }

    // Steps list with checkboxes
    let stepsHTML = '';
    quest.objective.steps.forEach(step => {
      const checkClass = step.done ? 'step-done' : 'step-pending';
      const checkSymbol = step.done ? '✓' : '';
      stepsHTML += `
        <div class="quest-step-item ${checkClass}">
          <div class="quest-step-box">${checkSymbol}</div>
          <span class="quest-step-desc">${step.desc}</span>
        </div>
      `;
    });

    // Rewards
    let rewardsHTML = '';
    if (quest.rewards.recruits && quest.rewards.recruits.length > 0) {
      quest.rewards.recruits.forEach(rId => {
        const recruitName = rId === 'bing' ? 'Bing (Winged Archer)' : (rId === 'pomodoro' ? 'Pomodoro (Botanical Guardian)' : rId);
        rewardsHTML += `<div class="quest-reward-pill recruit">✨ Recruit ${recruitName}!</div>`;
      });
    }
    if (quest.rewards.gold) {
      rewardsHTML += `<div class="quest-reward-pill gold">🪙 +${quest.rewards.gold} Gold</div>`;
    }
    if (quest.rewards.exp) {
      rewardsHTML += `<div class="quest-reward-pill exp">⭐ +${quest.rewards.exp} EXP</div>`;
    }
    if (quest.rewards.items && quest.rewards.items.length > 0) {
      quest.rewards.items.forEach(item => {
        let statsText = '';
        if (item.stats) {
          const pills = [];
          if (item.stats.hp) pills.push(`+${item.stats.hp} HP`);
          if (item.stats.shield) pills.push(`+${item.stats.shield} Shield`);
          if (item.stats.damage) pills.push(`+${item.stats.damage} Damage`);
          if (item.stats.initiative) pills.push(`+${item.stats.initiative} Init`);
          statsText = pills.join(' · ');
        }
        const dbItem = (item.id && ITEMS_DB) ? ITEMS_DB[item.id] : null;
        let iconSrc = item.icon;
        if (!iconSrc || this._isEmoji(iconSrc)) {
          if (dbItem && dbItem.icon && !this._isEmoji(dbItem.icon)) {
            iconSrc = dbItem.icon;
          }
        }

        const isImg = typeof iconSrc === 'string' && (
          iconSrc.startsWith('./') ||
          iconSrc.startsWith('/') ||
          iconSrc.startsWith('assets/') ||
          iconSrc.startsWith('http') ||
          iconSrc.startsWith('data:image') ||
          /\.(png|jpg|jpeg|webp|svg)$/i.test(iconSrc)
        );

        const iconHTML = isImg
          ? `<img class="quest-reward-item-img" src="${iconSrc}" alt="${item.name}">`
          : `<span class="quest-reward-item-icon">${iconSrc || '🎁'}</span>`;

        rewardsHTML += `
          <div class="quest-reward-item-card rarity-${item.rarity}">
            ${iconHTML}
            <div class="quest-reward-item-meta">
              <div class="quest-reward-item-title-row">
                <span class="quest-reward-item-name">${item.name}</span>
                <span class="quest-reward-rarity-badge ${item.rarity}">${item.rarity.toUpperCase()}</span>
              </div>
              <div class="quest-reward-item-desc">${item.desc}</div>
              ${statsText ? `<div class="quest-reward-item-stats">${statsText}</div>` : ''}
            </div>
          </div>
        `;
      });
    }

    const isRewardClaimed = isCompleted || quest.rewardClaimed;
    const rewardStatusBadge = isRewardClaimed
      ? '<span class="quest-reward-claim-badge claimed">🎁 Reward Claimed</span>'
      : '<span class="quest-reward-claim-badge pending">🔒 Reward on Completion</span>';
    const isTracked = (this.questManager.getTrackedQuest()?.id === quest.id);

    container.innerHTML = `
      <!-- Detail Header -->
      <div class="quest-detail-header">
        <div class="quest-detail-badges-row">
          <span class="quest-detail-cat-badge">${quest.category.toUpperCase()}</span>
          ${statusTag}
          ${isTracked ? '<span class="quest-detail-status-pill in-progress" style="border-color:#fbbf24; color:#fbbf24; background:rgba(251,191,36,0.15)">⭐ TRACKED</span>' : ''}
        </div>
        <div class="quest-detail-title-row">
          <h3 class="quest-detail-title">${quest.title}</h3>
          ${(!isCompleted && (quest.status === 'active' || quest.status === 'ready_to_turn_in')) ? `
            <button id="btn-toggle-quest-tracking" class="quest-track-btn ${isTracked ? 'is-tracking' : ''}">
              ${isTracked ? '⭐ Tracking Quest' : '🎯 Track Quest'}
            </button>
          ` : ''}
        </div>
        ${quest.zoneCoords ? `
          <div class="quest-location-badge">
            <span class="quest-loc-icon">📍</span>
            <span class="quest-loc-text">Location: Macro-Zone [${quest.zoneCoords.join(', ')}]</span>
          </div>
        ` : ''}
      </div>

      <!-- NPC Giver Identity -->
      <div class="quest-detail-giver-box">
        <div class="quest-detail-giver-avatar">${this._renderGiverAvatar(quest.giver)}</div>
        <div class="quest-detail-giver-info">
          <span class="quest-detail-giver-label">ISSUED BY:</span>
          <span class="quest-detail-giver-name">${quest.giver.name}</span>
          <span class="quest-detail-giver-title">${quest.giver.title}</span>
        </div>
      </div>

      <!-- NPC Dialogue / Lore Section -->
      <div class="quest-section-box lore-section">
        <h5 class="quest-box-heading">📜 NPC Dialogue & Lore</h5>
        <blockquote class="quest-npc-quote">"${quest.npcQuote}"</blockquote>
        <p class="quest-lore-text">${quest.lore}</p>
      </div>

      <!-- Objective Section (What is required to complete) -->
      <div class="quest-section-box objective-section">
        <h5 class="quest-box-heading">🎯 Quest Objective</h5>
        <p class="quest-objective-summary">${quest.objective.summary}</p>
        <div class="quest-steps-list">
          ${stepsHTML}
        </div>
      </div>

      <!-- Rewards Section -->
      <div class="quest-section-box rewards-section">
        <div class="quest-rewards-header-row">
          <h5 class="quest-box-heading">🏆 Rewards</h5>
          ${rewardStatusBadge}
        </div>
        <div class="quest-rewards-grid">
          ${rewardsHTML}
        </div>
      </div>
    `;

    const trackBtn = document.getElementById('btn-toggle-quest-tracking');
    if (trackBtn) {
      trackBtn.addEventListener('click', () => {
        if (this.audio && typeof this.audio.playBuff === 'function') {
          this.audio.playBuff();
        }
        this.questManager.setTrackedQuest(quest.id);
        this._renderRightPage();
        this._renderLeftPage();
      });
    }
  }

  _isEmoji(str) {
    if (!str || typeof str !== 'string') return false;
    const clean = str.trim();
    if (clean.length > 8) return false;
    const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;
    return emojiRegex.test(clean);
  }

  _renderGiverAvatar(giver) {
    if (!giver) return '<img src="./assets/portraits/paladill.png" class="quest-giver-img" alt="NPC" />';

    let candidate = giver.avatar;
    const nameClean = (giver.name || '').toLowerCase().trim();
    const titleClean = (giver.title || '').toLowerCase().trim();
    const modelClean = (giver.model || '').toLowerCase().replace('.glb', '').trim();
    const idClean = (giver.id || '').toLowerCase().trim();

    // Discard emoji if candidate is one
    if (this._isEmoji(candidate)) {
      candidate = null;
    }

    // Try mapping via NPC_PORTRAIT_MAP
    if (!candidate && NPC_PORTRAIT_MAP) {
      if (nameClean && NPC_PORTRAIT_MAP[nameClean]) {
        candidate = NPC_PORTRAIT_MAP[nameClean];
      } else if (titleClean && NPC_PORTRAIT_MAP[titleClean]) {
        candidate = NPC_PORTRAIT_MAP[titleClean];
      } else if (modelClean && NPC_PORTRAIT_MAP[modelClean]) {
        candidate = NPC_PORTRAIT_MAP[modelClean];
      } else if (idClean && NPC_PORTRAIT_MAP[idClean]) {
        candidate = NPC_PORTRAIT_MAP[idClean];
      }
    }

    if (!candidate && modelClean) {
      candidate = modelClean;
    }

    // Direct path or data URL
    if (candidate && typeof candidate === 'string' && (
      candidate.startsWith('./') ||
      candidate.startsWith('/') ||
      candidate.startsWith('assets/') ||
      candidate.startsWith('data:image') ||
      candidate.startsWith('http') ||
      /\.(png|jpg|jpeg|webp|svg)$/i.test(candidate)
    )) {
      return `<img src="${candidate}" class="quest-giver-img" alt="${giver.name || 'NPC'}" />`;
    }

    // Try portraitService synchronous lookup
    if (portraitService && candidate) {
      const sync = portraitService.getPortraitSync(candidate);
      if (sync) {
        return `<img src="${sync}" class="quest-giver-img" alt="${giver.name || 'NPC'}" />`;
      }
    }

    // If still not a direct image, attempt async resolution with portraitService
    const targetKey = candidate || modelClean || idClean || nameClean;
    const uniqueImgId = `quest-giver-img-${Math.random().toString(36).substring(2, 9)}`;

    if (portraitService && targetKey) {
      portraitService.getPortrait(targetKey).then(url => {
        if (url) {
          const imgEl = document.getElementById(uniqueImgId);
          if (imgEl) {
            imgEl.src = url;
            imgEl.classList.remove('quest-giver-img-loading');
          }
        }
      }).catch(err => {
        console.warn('[QuestBookModal] Failed to load portrait for', targetKey, err);
      });
    }

    // Safe fallback image (never an emoji)
    const fallbackSrc = './assets/portraits/paladill.png';
    return `<img id="${uniqueImgId}" src="${fallbackSrc}" class="quest-giver-img quest-giver-img-loading" alt="${giver.name || 'NPC'}" />`;
  }
}

