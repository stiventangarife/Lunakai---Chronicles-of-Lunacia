// DialogSystem.js - Rich RPG Dialogue Manager with Typewriter, Dynamic Replacements & Real NPC 3D Portraits
import { portraitService } from '../tactics/CharacterPortraitService.js';

export const NPC_PORTRAIT_MAP = {
  // Master Paladill
  'paladill': './assets/portraits/paladill.png',
  'master paladill': './assets/portraits/paladill.png',
  'dojo mentor': './assets/portraits/paladill.png',
  'lunacia dojo mentor': './assets/portraits/paladill.png',
  'maestro paladill': './assets/portraits/paladill.png',
  'mentor del dojo': './assets/portraits/paladill.png',
  'mentor del dojo de lunacia': './assets/portraits/paladill.png',

  // Atia Spirit & Holy Statue
  'statue_atia': './assets/portraits/statue_atia.png',
  'statue-atia': './assets/portraits/statue_atia.png',
  'atia_spirit': './assets/portraits/statue_atia.png',
  'spirit of atia': './assets/portraits/statue_atia.png',
  'statue of atia': './assets/portraits/statue_atia.png',
  'sacred statue of atia': './assets/portraits/statue_atia.png',
  'soul of the great tree': './assets/portraits/statue_atia.png',
  'espíritu de atia': './assets/portraits/statue_atia.png',
  'espiritu de atia': './assets/portraits/statue_atia.png',
  'estatua de atia': './assets/portraits/statue_atia.png',
  'estatua sagrada de atia': './assets/portraits/statue_atia.png',
  'alma del gran árbol': './assets/portraits/statue_atia.png',
  'alma del gran arbol': './assets/portraits/statue_atia.png',

  // Recruits & Heroes
  'bing': './assets/portraits/bing.png',
  'bing_npc': './assets/portraits/bing.png',
  'pomodoro': './assets/portraits/pomodoro.png',
  'pomodoro_npc': './assets/portraits/pomodoro.png',
  'kotaro': './assets/portraits/kotaro.png',
  'sulfur_guard': './assets/portraits/kotaro.png',
  'threshold guardian': './assets/portraits/kotaro.png',
  'guardián del umbral': './assets/portraits/kotaro.png',
  'shinji': './assets/portraits/shinji.png',
  'hero': './assets/portraits/shinji.png',
  'player': './assets/portraits/shinji.png',

  // Overworld NPCs (Map to portraits or character keys)
  'sentinel': './assets/portraits/kibo.png',
  'desert sentinel': './assets/portraits/kibo.png',
  'dune watcher': './assets/portraits/kibo.png',
  'savannah dune watcher': './assets/portraits/kibo.png',
  'centinela del desierto': './assets/portraits/kibo.png',
  'centinela': './assets/portraits/kibo.png',
  'vigía de las dunas': './assets/portraits/kibo.png',
  'vigia de las dunas': './assets/portraits/kibo.png',
  'vigía de las dunas de sabana': './assets/portraits/kibo.png',
  'kibo': './assets/portraits/kibo.png',

  'cartographer': './assets/portraits/xia.png',
  'xia': './assets/portraits/xia.png',
  'imperial explorer': './assets/portraits/xia.png',
  'lunacia imperial explorer': './assets/portraits/xia.png',
  'exploradora imperial': './assets/portraits/xia.png',
  'exploradora imperial de lunacia': './assets/portraits/xia.png',

  'miner': './assets/portraits/tripp.png',
  'tripp': './assets/portraits/tripp.png',
  'miner warrior': './assets/portraits/tripp.png',
  'guerrero minero': './assets/portraits/tripp.png',

  'postman': './assets/portraits/sapidae-m-a.png',
  'royal messenger': './assets/portraits/sapidae-m-a.png',
  'messenger': './assets/portraits/sapidae-m-a.png',
  'mensajero': './assets/portraits/sapidae-m-a.png',
  'mensajero real': './assets/portraits/sapidae-m-a.png',
  'cartero': './assets/portraits/sapidae-m-a.png',
  'cartero lunaciano': './assets/portraits/sapidae-m-a.png',
  'sapidae-m-a': './assets/portraits/sapidae-m-a.png',

  'herbalist': './assets/portraits/sapidae-f-a.png',
  'rosalba': './assets/portraits/sapidae-f-a.png',
  'herbalist rosalba': './assets/portraits/sapidae-f-a.png',
  'flower alchemist': './assets/portraits/sapidae-f-a.png',
  'herborista rosalba': './assets/portraits/sapidae-f-a.png',
  'alquimista de flores': './assets/portraits/sapidae-f-a.png',
  'sapidae-f-a': './assets/portraits/sapidae-f-a.png',

  'blacksmith': './assets/portraits/sapidae-m-b.png',
  'baruk': './assets/portraits/sapidae-m-b.png',
  'blacksmith baruk': './assets/portraits/sapidae-m-b.png',
  'canyon smith': './assets/portraits/sapidae-m-b.png',
  'herrero baruk': './assets/portraits/sapidae-m-b.png',
  'forjador del cañón': './assets/portraits/sapidae-m-b.png',
  'forjador del canon': './assets/portraits/sapidae-m-b.png',
  'sapidae-m-b': './assets/portraits/sapidae-m-b.png',

  'hunter': './assets/portraits/sapidae-m-c.png',
  'zarek': './assets/portraits/sapidae-m-c.png',
  'hunter zarek': './assets/portraits/sapidae-m-c.png',
  'savannah marksman': './assets/portraits/sapidae-m-c.png',
  'cazador zarek': './assets/portraits/sapidae-m-c.png',
  'tirador de la sabana': './assets/portraits/sapidae-m-c.png',
  'sapidae-m-c': './assets/portraits/sapidae-m-c.png',

  'chef': './assets/portraits/sapidae-m-d.png',
  'chef boreal': './assets/portraits/sapidae-m-d.png',
  'snow cook': './assets/portraits/sapidae-m-d.png',
  'cocinero de las nieves': './assets/portraits/sapidae-m-d.png',
  'sapidae-m-d': './assets/portraits/sapidae-m-d.png',

  'hermit': './assets/portraits/sapidae-m-e.png',
  'glacial hermit': './assets/portraits/sapidae-m-e.png',
  'shaman of sacred ice': './assets/portraits/sapidae-m-e.png',
  'ermitaño glacial': './assets/portraits/sapidae-m-e.png',
  'ermitano glacial': './assets/portraits/sapidae-m-e.png',
  'chamán del hielo sagrado': './assets/portraits/sapidae-m-e.png',
  'chaman del hielo sagrado': './assets/portraits/sapidae-m-e.png',
  'sapidae-m-e': './assets/portraits/sapidae-m-e.png',

  'astrologer': './assets/portraits/sapidae-f-b.png',
  'astral astrologer': './assets/portraits/sapidae-f-b.png',
  'sky reader': './assets/portraits/sapidae-f-b.png',
  'astrólogo astral': './assets/portraits/sapidae-f-b.png',
  'astrologo astral': './assets/portraits/sapidae-f-b.png',
  'lector del firmamento': './assets/portraits/sapidae-f-b.png',
  'sapidae-f-b': './assets/portraits/sapidae-f-b.png',

  'polar_sage': './assets/portraits/sapidae-f-c.png',
  'astral sage': './assets/portraits/sapidae-f-c.png',
  'polar sage': './assets/portraits/sapidae-f-c.png',
  'custodian of ley lines': './assets/portraits/sapidae-f-c.png',
  'sabio astral': './assets/portraits/sapidae-f-c.png',
  'sabio polar': './assets/portraits/sapidae-f-c.png',
  'custodio de las líneas ley': './assets/portraits/sapidae-f-c.png',
  'custodio de las lineas ley': './assets/portraits/sapidae-f-c.png',
  'sapidae-f-c': './assets/portraits/sapidae-f-c.png',

  'oracle': './assets/portraits/sapidae-f-d.png',
  'astral oracle': './assets/portraits/sapidae-f-d.png',
  'voice of the constellations': './assets/portraits/sapidae-f-d.png',
  'oráculo astral': './assets/portraits/sapidae-f-d.png',
  'oraculo astral': './assets/portraits/sapidae-f-d.png',
  'voz de las constelaciones': './assets/portraits/sapidae-f-d.png',
  'sapidae-f-d': './assets/portraits/sapidae-f-d.png',

  'shaman': './assets/portraits/sapidae-f-e.png',
  'spiritual shaman': './assets/portraits/sapidae-f-e.png',
  'astral threshold guardian': './assets/portraits/sapidae-f-e.png',
  'chamán espiritual': './assets/portraits/sapidae-f-e.png',
  'chaman espiritual': './assets/portraits/sapidae-f-e.png',
  'guardián del umbral astral': './assets/portraits/sapidae-f-e.png',
  'guardian del umbral astral': './assets/portraits/sapidae-f-e.png',
  'sapidae-f-e': './assets/portraits/sapidae-f-e.png'
};

export class DialogSystem {
  constructor(audioSystem) {
    this.audio = audioSystem;
    this.isActive = false;
    this.currentDialogueQueue = [];
    this.currentIndex = 0;
    this.currentText = '';
    this.typedLength = 0;
    this.isTyping = false;
    this.typingSpeed = 22; // ms per character
    this.typingTimer = null;
    this.activeHero = { name: 'Shinji', heroClass: 'Melee Duelist' };

    this.onCompleteCallback = null;

    this._createDOM();
    this._initInput();
  }

  setHeroContext(hero) {
    if (hero) {
      this.activeHero = {
        name: hero.name || 'Shinji',
        heroClass: hero.heroClass || 'Melee Duelist'
      };
    }
  }

  _createDOM() {
    let container = document.getElementById('dialog-box-overlay');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dialog-box-overlay';
      container.className = 'dialog-overlay hidden';
      container.innerHTML = `
        <div class="dialog-window">
          <div class="dialog-avatar-frame">
            <div id="dialog-avatar" class="dialog-avatar">
              <img src="./assets/portraits/paladill.png" class="dialog-avatar-img" alt="Avatar" />
            </div>
            <span id="dialog-speaker-title" class="dialog-speaker-title">Dojo Mentor</span>
          </div>
          <div class="dialog-body">
            <div class="dialog-header">
              <h3 id="dialog-speaker-name" class="dialog-speaker-name">Master Paladill</h3>
              <div class="dialog-rune-accent">✦ ✦ ✦</div>
            </div>
            <p id="dialog-text" class="dialog-text"></p>
            <div class="dialog-footer">
              <span class="dialog-prompt">Press <kbd>[Space]</kbd> to continue ➔</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    }
    this.container = container;
    this.container.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });
    this.avatarEl = document.getElementById('dialog-avatar');
    this.speakerTitleEl = document.getElementById('dialog-speaker-title');
    this.speakerNameEl = document.getElementById('dialog-speaker-name');
    this.textEl = document.getElementById('dialog-text');
  }

  _initInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.advance();
      }
    });

    if (this.container) {
      this.container.addEventListener('click', () => {
        if (this.isActive) {
          this.advance();
        }
      });
    }
  }

  /**
   * Starts a sequence of dialogue nodes.
   * @param {Array<Object>} dialogueList - Array of { speaker, title, avatar, text, onEnter }
   * @param {Function} onComplete 
   */
  startDialogue(dialogueList, onComplete = null) {
    if (!dialogueList || dialogueList.length === 0) return;
    this.currentDialogueQueue = dialogueList;
    this.currentIndex = 0;
    this.onCompleteCallback = onComplete;
    this.isActive = true;

    this.container.classList.remove('hidden');
    this._showCurrentNode();
  }

  _formatText(rawText) {
    return rawText
      .replace(/{heroName}/g, this.activeHero.name)
      .replace(/{heroClass}/g, this.activeHero.heroClass);
  }

  _showCurrentNode() {
    if (this.currentIndex >= this.currentDialogueQueue.length) {
      this.close();
      return;
    }

    const node = this.currentDialogueQueue[this.currentIndex];
    if (node.onEnter && typeof node.onEnter === 'function') {
      node.onEnter();
    }

    this.speakerNameEl.textContent = node.speaker || 'Guardian of Lunacia';
    this.speakerTitleEl.textContent = node.title || 'Master';
    this._renderAvatar(node);

    this.currentText = this._formatText(node.text || '');
    this.typedLength = 0;
    this.textEl.textContent = '';
    this.isTyping = true;

    if (this.typingTimer) clearInterval(this.typingTimer);

    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }

    this.typingTimer = setInterval(() => {
      if (this.typedLength < this.currentText.length) {
        this.typedLength++;
        this.textEl.textContent = this.currentText.substring(0, this.typedLength);
        // Soft audio click every 4 chars
        if (this.typedLength % 3 === 0 && this.audio && typeof this.audio.playTileSelect === 'function') {
          // Keep it very soft
        }
      } else {
        this.isTyping = false;
        clearInterval(this.typingTimer);
        this.typingTimer = null;
      }
    }, this.typingSpeed);
  }

  advance() {
    if (!this.isActive) return;

    if (this.isTyping) {
      // Instantly finish current line
      if (this.typingTimer) clearInterval(this.typingTimer);
      this.typingTimer = null;
      this.textEl.textContent = this.currentText;
      this.isTyping = false;
      return;
    }

    if (this.audio && typeof this.audio.playTileSelect === 'function') {
      this.audio.playTileSelect();
    }

    this.currentIndex++;
    if (this.currentIndex < this.currentDialogueQueue.length) {
      this._showCurrentNode();
    } else {
      this.close();
    }
  }

  forceNext() {
    if (this.isTyping) {
      if (this.typingTimer) clearInterval(this.typingTimer);
      this.typingTimer = null;
      this.textEl.textContent = this.currentText;
      this.isTyping = false;
    }
    this.advance();
  }

  _renderAvatar(node) {
    if (!this.avatarEl) return;

    let avatarSource = node.avatar;
    const speakerClean = (node.speaker || '').toLowerCase().trim();
    const titleClean = (node.title || '').toLowerCase().trim();

    // Check if avatar is an emoji, short symbol, or missing
    const isEmoji = this._isEmoji(avatarSource);
    if (!avatarSource || isEmoji) {
      if (NPC_PORTRAIT_MAP[speakerClean]) {
        avatarSource = NPC_PORTRAIT_MAP[speakerClean];
      } else if (NPC_PORTRAIT_MAP[titleClean]) {
        avatarSource = NPC_PORTRAIT_MAP[titleClean];
      } else if (node.npcId && NPC_PORTRAIT_MAP[node.npcId.toLowerCase()]) {
        avatarSource = NPC_PORTRAIT_MAP[node.npcId.toLowerCase()];
      }
    }

    // Default to Master Paladill if still not found
    if (!avatarSource) {
      avatarSource = './assets/portraits/paladill.png';
    }

    // Direct image path / URL (e.g. .png, .webp, .svg, data:image)
    const isPath = typeof avatarSource === 'string' && (
      avatarSource.startsWith('./') ||
      avatarSource.startsWith('/') ||
      avatarSource.startsWith('assets/') ||
      avatarSource.startsWith('data:image') ||
      avatarSource.startsWith('http') ||
      /\.(png|jpg|jpeg|webp|svg)$/i.test(avatarSource)
    );

    if (isPath) {
      this.avatarEl.innerHTML = `<img src="${avatarSource}" class="dialog-avatar-img" alt="${node.speaker || 'Avatar'}" />`;
      return;
    }

    // If it maps to a known ID in portrait service or synchronous portrait
    const syncUrl = portraitService.getPortraitSync(avatarSource);
    if (syncUrl) {
      this.avatarEl.innerHTML = `<img src="${syncUrl}" class="dialog-avatar-img" alt="${node.speaker || 'Avatar'}" />`;
      return;
    }

    // Dynamic asynchronous loading via portraitService
    const targetKey = avatarSource;
    this.avatarEl.innerHTML = `<div class="dialog-avatar-loading">✨</div>`;

    portraitService.getPortrait(targetKey).then(url => {
      if (url && this.isActive && this.avatarEl) {
        this.avatarEl.innerHTML = `<img src="${url}" class="dialog-avatar-img" alt="${node.speaker || 'Avatar'}" />`;
      }
    }).catch(err => {
      console.warn('[DialogSystem] Portrait fallback for', targetKey, err);
      if (this.avatarEl) {
        if (node.avatar && isEmoji) {
          this.avatarEl.textContent = node.avatar;
        } else {
          this.avatarEl.innerHTML = `<img src="./assets/portraits/paladill.png" class="dialog-avatar-img" alt="Avatar" />`;
        }
      }
    });
  }

  _isEmoji(val) {
    if (!val || typeof val !== 'string') return false;
    return val.length <= 4 && !val.includes('.') && !val.includes('/') && !val.includes('_');
  }

  forceClose(triggerCallback = false) {
    this.isActive = false;
    if (this.typingTimer) {
      clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
    if (this.container) {
      this.container.classList.add('hidden');
    }
    const dialogBox = document.getElementById('dialog-box-overlay');
    if (dialogBox) dialogBox.classList.add('hidden');

    const cb = this.onCompleteCallback;
    this.onCompleteCallback = null;
    if (triggerCallback && cb && typeof cb === 'function') {
      cb();
    }
  }

  close() {
    this.forceClose(true);
  }
}
