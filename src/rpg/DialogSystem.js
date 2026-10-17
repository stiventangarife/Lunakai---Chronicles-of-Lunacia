// DialogSystem.js — Conversación con NPC (Crónica Celeste, etapa 2): máquina de escribir, respuestas numeradas, Auto y Registro
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

const ICON_DIR = new URL('../../assets/ui/icons/', import.meta.url).href;
const DEFAULT_PORTRAIT = './assets/portraits/paladill.png';
const FRAGMENT_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l5 10-5 10-5-10z" fill="#EED39A"/></svg>';
const AUTO_KEY = 'axie_lk_dialog_auto';

const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Diálogo con NPC — pantalla 21 del sistema de diseño ("Conversación con NPC"), clases lk-.
 *
 * Nodo de diálogo: { speaker, title, avatar, npcId, text | html, onEnter, cls, choices }
 *   - text: texto plano (se escapa). html: permite <span class="lk-kw"> y <span class="lk-place">.
 *   - choices: [{ text, sub, cost, locked, leave, onSelect(choice), reply: nodo | [nodos] }]
 *     Se eligen con clic o con las teclas 1–9. Una opción bloqueada explica su motivo en `sub`.
 * API pública sin cambios: startDialogue(list, onComplete), advance(), forceNext(), close(), forceClose(cb),
 * setHeroContext(hero), isActive, typingSpeed.
 */
export class DialogSystem {
  constructor(audioSystem) {
    this.audio = audioSystem;
    this.isActive = false;
    this.currentDialogueQueue = [];
    this.currentIndex = 0;
    this.currentText = '';
    this.typedLength = 0;
    this.isTyping = false;
    this.typingSpeed = 22; // ms por carácter (Opciones › Accesibilidad › Velocidad del texto)
    this.typingTimer = null;
    this.activeHero = { name: 'Shinji', heroClass: 'Melee Duelist' };
    this.onCompleteCallback = null;

    this.choicesOpen = false;
    this.log = [];
    try { this.auto = localStorage.getItem(AUTO_KEY) === '1'; } catch { this.auto = false; }
    this.autoTimer = null;

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
    document.getElementById('dialog-box-overlay')?.remove();
    const container = document.createElement('div');
    container.id = 'dialog-box-overlay';
    container.className = 'lk-ui lk-dlg-layer hidden';
    container.innerHTML = `
      <div class="lk-dlg__log" data-ref="log" hidden></div>
      <div class="lk-dlg__choices" data-ref="choices" hidden role="listbox" aria-label="Respuestas"></div>
      <div class="lk-dlg">
        <div class="lk-dlg__por">
          <span class="lk-frame"><span class="lk-med" data-ref="med" style="--cc:var(--lk-gilt-300)"><img src="${DEFAULT_PORTRAIT}" alt=""></span></span>
          <span class="lk-role"><img src="${ICON_DIR}chat.png" alt="" data-ref="roleIcon"><span data-ref="role">Maestro</span></span>
        </div>
        <div class="lk-dlg__box" data-ref="box" role="log" aria-live="polite">
          <div class="lk-dlg__name"><b data-ref="name">Maestro Paladill</b><i></i></div>
          <div class="lk-dlg__text" data-ref="text"></div>
          <div class="lk-dlg__foot">
            <span class="lk-dlg__pips" data-ref="pips"></span>
            <button class="lk-dlg__tool" data-ref="auto" aria-pressed="false">Auto</button>
            <button class="lk-dlg__tool" data-ref="logBtn" aria-pressed="false"><img src="${ICON_DIR}list.png" alt="" style="width:16px;height:16px">Registro</button>
            <span class="lk-dlg__next" data-ref="next"><kbd>Espacio</kbd><span data-ref="nextTxt">Continuar</span><svg class="lk-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>
          </div>
        </div>
      </div>`;
    document.body.appendChild(container);
    this.container = container;
    const ref = (n) => container.querySelector(`[data-ref="${n}"]`);
    this.dlgEl = container.querySelector('.lk-dlg');
    this.avatarEl = ref('med');
    this.speakerTitleEl = ref('role');
    this.roleIconEl = ref('roleIcon');
    this.speakerNameEl = ref('name');
    this.textEl = ref('text');
    this.boxEl = ref('box');
    this.pipsEl = ref('pips');
    this.nextEl = ref('next');
    this.nextTxtEl = ref('nextTxt');
    this.choicesEl = ref('choices');
    this.logEl = ref('log');
    this.autoBtn = ref('auto');
    this.logBtn = ref('logBtn');
    this.autoBtn.setAttribute('aria-pressed', String(this.auto));
    container.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
  }

  _initInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
      // Ignorar mientras el menú de opciones está abierto encima
      if (document.querySelector('#settings-modal.lk-is-open')) return;

      if (this.choicesOpen) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 9) { e.preventDefault(); this._pick(n - 1); return; }
        // Enter/Espacio sobre una opción con foco: lo resuelve el propio botón
        return;
      }
      if (e.target?.closest && e.target.closest('.lk-dlg__tool')) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.advance();
      }
    });

    this.boxEl.addEventListener('click', (e) => {
      if (e.target.closest('.lk-dlg__tool')) return;
      if (this.isActive) this.advance();
    });
    this.autoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.auto = !this.auto;
      this.autoBtn.setAttribute('aria-pressed', String(this.auto));
      try { localStorage.setItem(AUTO_KEY, this.auto ? '1' : '0'); } catch { /* sin almacenamiento */ }
      clearTimeout(this.autoTimer);
      if (this.auto && !this.isTyping) this._scheduleAuto(900);
    });
    this.logBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const show = this.logEl.hidden;
      this.logEl.hidden = !show;
      this.logBtn.setAttribute('aria-pressed', String(show));
      if (show) this._renderLog();
    });
  }

  /**
   * Starts a sequence of dialogue nodes.
   * @param {Array<Object>} dialogueList - Array of { speaker, title, avatar, text, onEnter, choices }
   * @param {Function} onComplete
   */
  startDialogue(dialogueList, onComplete = null) {
    if (!dialogueList || dialogueList.length === 0) return;
    this.currentDialogueQueue = [...dialogueList];
    this.currentIndex = 0;
    this.onCompleteCallback = onComplete;
    this.isActive = true;
    this.log = [];
    this._hideChoices();
    this.logEl.hidden = true;
    this.logBtn.setAttribute('aria-pressed', 'false');

    this.container.classList.remove('hidden');
    this.dlgEl.classList.add('lk-is-closed');
    void this.dlgEl.offsetWidth;
    this.dlgEl.classList.remove('lk-is-closed');
    this._showCurrentNode();
  }

  _formatText(rawText) {
    return rawText
      .replace(/{heroName}/g, this.activeHero.name)
      .replace(/{heroClass}/g, this.activeHero.heroClass);
  }

  _nodeHTML(node) {
    if (node.html) return this._formatText(node.html);
    return escapeHTML(this._formatText(node.text || ''));
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

    this.speakerNameEl.textContent = node.speaker || 'Guardián de Lunacia';
    this.speakerTitleEl.textContent = node.title || 'Maestro';
    this.roleIconEl.src = `${ICON_DIR}${node.roleIcon || 'chat'}.png`;
    this.avatarEl.style.setProperty('--cc', node.cls ? `var(--lk-class-${node.cls})` : 'var(--lk-gilt-300)');
    this._renderAvatar(node);
    this._renderPips();

    const html = this._nodeHTML(node);
    this.log.push({ who: node.speaker || '', html });
    if (!this.logEl.hidden) this._renderLog();
    this._type(html);

    if (this.audio && typeof this.audio.playHover === 'function') {
      this.audio.playHover();
    }
  }

  _type(html) {
    clearInterval(this.typingTimer);
    clearTimeout(this.autoTimer);
    this.currentText = html;
    this.isTyping = true;
    this.nextEl.classList.add('lk-is-typing');
    this.nextTxtEl.textContent = 'Completar';
    // Las etiquetas HTML se escriben de golpe; el texto, carácter a carácter
    const tokens = html.match(/<[^>]+>|&[a-z#0-9]+;|[\s\S]/gi) || [];
    let k = 0, out = '';
    this.typedLength = 0;
    this.textEl.innerHTML = '<span class="lk-caret"></span>';
    if (!tokens.length) { this._finishTyping(); return; }
    this.typingTimer = setInterval(() => {
      if (k >= tokens.length) { this._finishTyping(); return; }
      let tk = tokens[k++]; out += tk;
      while (tk.startsWith('<') && k < tokens.length) { tk = tokens[k++]; out += tk; }
      this.typedLength = k;
      this.textEl.innerHTML = `${out}<span class="lk-caret"></span>`;
    }, Math.max(1, this.typingSpeed));
  }

  _finishTyping() {
    clearInterval(this.typingTimer);
    this.typingTimer = null;
    this.isTyping = false;
    this.textEl.innerHTML = this.currentText;
    this.nextEl.classList.remove('lk-is-typing');
    const node = this.currentDialogueQueue[this.currentIndex];
    if (node && Array.isArray(node.choices) && node.choices.length) {
      this.nextTxtEl.textContent = 'Elige una respuesta';
      this._showChoices(node.choices);
      return;
    }
    const last = this.currentIndex >= this.currentDialogueQueue.length - 1;
    this.nextTxtEl.textContent = last ? 'Cerrar' : 'Continuar';
    if (this.auto) this._scheduleAuto(1600);
  }

  _scheduleAuto(ms) {
    clearTimeout(this.autoTimer);
    this.autoTimer = setTimeout(() => { if (this.isActive && this.auto && !this.choicesOpen) this.advance(); }, ms);
  }

  advance() {
    if (!this.isActive) return;
    clearTimeout(this.autoTimer);

    if (this.isTyping) {
      // Primer toque: completa la línea
      this._finishTyping();
      return;
    }
    if (this.choicesOpen) return;

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
    if (this.isTyping) this._finishTyping();
    if (this.choicesOpen) return;
    this.advance();
  }

  // ------------------------------------------------------------ respuestas
  _showChoices(choices) {
    this.choicesOpen = true;
    const box = this.choicesEl;
    box.hidden = false;
    box.innerHTML = choices.map((c, n) => `<button class="lk-choice ${c.locked ? 'lk-is-locked' : ''} ${c.leave ? 'lk-is-leave' : ''}" role="option" data-n="${n}" ${c.locked ? 'aria-disabled="true"' : ''}>`
      + `<kbd>${n + 1}</kbd><span>${escapeHTML(c.text)}${c.sub ? `<small>${escapeHTML(c.sub)}</small>` : ''}</span>`
      + `${c.cost ? `<span class="lk-cost">${FRAGMENT_SVG}${escapeHTML(c.cost)}</span>` : ''}</button>`).join('');
    box.querySelectorAll('.lk-choice').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this._pick(+b.dataset.n); }));
    setTimeout(() => box.querySelector('.lk-choice:not(.lk-is-locked)')?.focus({ preventScroll: true }), 50);
  }

  _hideChoices() {
    this.choicesOpen = false;
    this.choicesEl.hidden = true;
    this.choicesEl.innerHTML = '';
  }

  _pick(n) {
    const node = this.currentDialogueQueue[this.currentIndex];
    const c = node?.choices?.[n];
    if (!c || !this.choicesOpen) return;
    if (c.locked) {
      if (this.audio && typeof this.audio.playCollision === 'function') this.audio.playCollision();
      this._flashLocked(n);
      return;
    }
    if (this.audio && typeof this.audio.playTileSelect === 'function') this.audio.playTileSelect();
    this._hideChoices();
    this.log.push({ who: this.activeHero.name, html: escapeHTML(c.text), me: true });
    if (typeof c.onSelect === 'function') c.onSelect(c);
    if (!this.isActive) return; // onSelect pudo cerrar el diálogo
    const reply = c.reply ? (Array.isArray(c.reply) ? c.reply : [c.reply]) : [];
    if (reply.length) this.currentDialogueQueue.splice(this.currentIndex + 1, 0, ...reply);
    if (c.leave && !reply.length) { this.close(); return; }
    this.currentIndex++;
    if (this.currentIndex < this.currentDialogueQueue.length) this._showCurrentNode();
    else this.close();
  }

  _flashLocked(n) {
    const b = this.choicesEl.querySelector(`.lk-choice[data-n="${n}"]`);
    if (!b || !b.animate) return;
    b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
  }

  // ------------------------------------------------------------ pips y registro
  _renderPips() {
    const total = this.currentDialogueQueue.length;
    if (total <= 1) { this.pipsEl.innerHTML = ''; return; }
    this.pipsEl.innerHTML = this.currentDialogueQueue.map((_, k) => `<i class="${k <= this.currentIndex ? 'lk-on' : ''}"></i>`).join('');
  }

  _renderLog() {
    this.logEl.innerHTML = '<span class="lk-label" style="color:var(--lk-gilt-300)">Registro de la conversación</span>'
      + this.log.map((l) => `<div class="lk-ln ${l.me ? 'lk-me' : ''}"><b>${escapeHTML(l.who)}</b>${l.html}</div>`).join('');
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  // ------------------------------------------------------------ retrato
  _setAvatarImg(src, alt) {
    this.avatarEl.innerHTML = `<img src="${src}" alt="${escapeHTML(alt || 'Retrato')}">`;
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
      avatarSource = DEFAULT_PORTRAIT;
    }

    const isPath = typeof avatarSource === 'string' && (
      avatarSource.startsWith('./') ||
      avatarSource.startsWith('/') ||
      avatarSource.startsWith('assets/') ||
      avatarSource.startsWith('data:image') ||
      avatarSource.startsWith('http') ||
      /\.(png|jpg|jpeg|webp|svg)$/i.test(avatarSource)
    );

    if (isPath) {
      this._setAvatarImg(avatarSource, node.speaker);
      return;
    }

    const syncUrl = portraitService.getPortraitSync(avatarSource);
    if (syncUrl) {
      this._setAvatarImg(syncUrl, node.speaker);
      return;
    }

    // Carga asíncrona del retrato 3D
    const targetKey = avatarSource;
    this.avatarEl.innerHTML = '';
    portraitService.getPortrait(targetKey).then((url) => {
      if (url && this.isActive && this.avatarEl) this._setAvatarImg(url, node.speaker);
    }).catch((err) => {
      console.warn('[DialogSystem] Portrait fallback for', targetKey, err);
      if (this.avatarEl) this._setAvatarImg(DEFAULT_PORTRAIT, node.speaker);
    });
  }

  _isEmoji(val) {
    if (!val || typeof val !== 'string') return false;
    return val.length <= 4 && !val.includes('.') && !val.includes('/') && !val.includes('_');
  }

  forceClose(triggerCallback = false) {
    this.isActive = false;
    clearInterval(this.typingTimer);
    this.typingTimer = null;
    this.isTyping = false;
    clearTimeout(this.autoTimer);
    this._hideChoices();
    if (this.logEl) this.logEl.hidden = true;
    if (this.container) {
      this.container.classList.add('hidden');
    }

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
