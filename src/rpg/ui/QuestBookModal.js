// QuestBookModal.js — Crónica de misiones (Crónica Celeste, etapa 8)
// Pantalla 22 del sistema de diseño ("Crónica de misiones"): carril de categorías, lista sobre vidrio
// y página de marfil con la historia, los objetivos y las recompensas. El sello marca las misiones completadas.
// API intacta: new QuestBookModal(questManager, audio), open(questId), close(), toggle(questId), isOpen, onOpen, onClose.
// Los textos de las misiones vienen de QuestManager tal cual; aquí solo se traduce la interfaz.
import { NPC_PORTRAIT_MAP } from '../DialogSystem.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import { ITEMS_DB } from '../../tactics/ItemDatabase.js';
import { MATERIALS } from '../../tactics/data/EconomyCatalog.js';
import { matSvg, matIcon } from '../../ui/MaterialIcons.js';
import { asset, sprite, bindSwitch, curIcon } from '../../ui/lk.js';
import * as i18n from '../../i18n/i18n.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isImg = (s) => typeof s === 'string' && (/^(\.\/|\/|assets\/|http|data:image)/.test(s) || /\.(png|jpe?g|webp|svg)$/i.test(s));
const RAR = { common: 'common', uncommon: 'uncommon', rare: 'rare', epic: 'epic', legendary: 'mystic', mystic: 'mystic' };
const CATS = [
  ['all', i18n.t('questBook.catAll'), 'list'],
  ['Principal', i18n.t('questBook.catMain'), 'mission'],
  ['Secundaria', i18n.t('questBook.catSide'), 'browse']
];
const CAT_ES = { Principal: i18n.t('questBook.catMain'), Secundaria: i18n.t('questBook.catSideOne') };
const RECRUIT = { bing: 'Bing', pomodoro: 'Pomodoro' };

export class QuestBookModal {
  constructor(questManager, audioSystem = null) {
    this.questManager = questManager;
    this.audio = audioSystem;
    this.isOpen = false;
    this.hideCompleted = true;
    this.selectedQuestId = 'quest_slime_purification';
    this.activeCategory = 'all';
    this.onOpen = null;
    this.onClose = null;

    this._createDOM();

    if (this.questManager) {
      this.questManager.onQuestUpdated(() => {
        if (this.isOpen) {
          this._renderLeftPage();
          this._renderRightPage();
        }
      });
    }
  }

  // ------------------------------------------------------------ DOM
  _createDOM() {
    document.getElementById('quest-book-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'quest-book-modal';
    m.className = 'lk-ui lk-backdrop lk-chron-layer hidden';
    m.innerHTML = `
      <div class="lk-panel-modal-window lk-chron" role="dialog" aria-label="${i18n.t('questBook.dialogLabel')}">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I('mission')}" alt=""></span>
          <h3><small>${i18n.t('questBook.kicker')}</small>${i18n.t('questBook.title')}</h3>
          <label class="lk-chron__hide"><span>${i18n.t('questBook.hideCompleted')}</span><button type="button" class="lk-switch" role="switch" aria-checked="true" data-ref="hide" aria-label="${i18n.t('questBook.hideCompletedAria')}"></button></label>
          <button type="button" class="lk-btn-close-x" data-ref="close" aria-label="${i18n.t('questBook.close')}">${sprite('i-close')}</button>
        </div>
        <div class="lk-journal">
          <div class="lk-j-rail" data-ref="rail">
            ${CATS.map(([k, label, ic]) => `<button type="button" data-cat="${k}" aria-label="${label}" title="${label}" class="${k === 'all' ? 'lk-is-on' : ''}"><img class="lk-ai" src="${I(ic)}" alt=""></button>`).join('')}
          </div>
          <div class="lk-j-list" data-ref="list"></div>
          <div class="lk-j-page" data-ref="page"></div>
        </div>
      </div>`;
    document.body.appendChild(m);
    this.modalEl = m;
    this.$ = (n) => m.querySelector(`[data-ref="${n}"]`);

    m.addEventListener('click', (e) => { if (e.target === m) this.close(); });
    this.$('close').addEventListener('click', () => this.close());
    m.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    bindSwitch(this.$('hide'), (on) => {
      if (this.audio?.playStep) this.audio.playStep();
      this.hideCompleted = on;
      this._renderLeftPage();
      this._renderRightPage();
    });
    this.$('rail').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-cat]');
      if (!b) return;
      if (this.audio?.playTileSelect) this.audio.playTileSelect();
      this.activeCategory = b.dataset.cat;
      this.$('rail').querySelectorAll('button').forEach((x) => x.classList.toggle('lk-is-on', x === b));
      this._renderLeftPage();
      this._renderRightPage();
    });
    this.$('list').addEventListener('click', (e) => {
      const b = e.target.closest('.lk-q-item[data-id]');
      if (!b) return;
      if (this.audio?.playStep) this.audio.playStep();
      this.selectedQuestId = b.dataset.id;
      this._renderLeftPage();
      this._renderRightPage();
    });
  }

  // ------------------------------------------------------------ apertura
  open(questId = null) {
    if (document.body.classList.contains('state-combat') ||
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      return;
    }
    if (this.isOpen) return;
    this.isOpen = true;
    if (questId && this.questManager.getQuest(questId)) this.selectedQuestId = questId;
    this.modalEl.classList.remove('hidden');
    void this.modalEl.offsetWidth;
    this.modalEl.classList.add('lk-is-open');
    if (this.audio && typeof this.audio.playBuff === 'function') this.audio.playBuff();
    this._renderLeftPage();
    this._renderRightPage();
    if (this.onOpen) this.onOpen();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.modalEl.classList.remove('lk-is-open');
    this.modalEl.classList.add('hidden');
    if (this.audio && typeof this.audio.playStep === 'function') this.audio.playStep();
    if (this.onClose) this.onClose();
  }

  toggle(questId = null) {
    if (document.body.classList.contains('state-combat') ||
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      this.close();
      return;
    }
    if (this.isOpen) this.close();
    else this.open(questId);
  }

  // ------------------------------------------------------------ lista
  _visible() {
    // Solo las misiones descubiertas (en curso, por entregar o completadas); nunca las bloqueadas ni las no aceptadas
    const all = this.questManager.getAllQuests().filter((q) => q.status === 'active' || q.status === 'ready_to_turn_in' || q.status === 'completed');
    const byCat = all.filter((q) => this.activeCategory === 'all' || q.category === this.activeCategory);
    const sort = (a, b) => (a.category === b.category ? (a.order || 99) - (b.order || 99) : a.category === 'Principal' ? -1 : 1);
    const active = byCat.filter((q) => q.status !== 'completed').sort(sort);
    const done = byCat.filter((q) => q.status === 'completed').sort(sort);
    return { active, done };
  }

  _renderLeftPage() {
    const list = this.$('list');
    const { active, done } = this._visible();
    const shown = [...active, ...(this.hideCompleted ? [] : done)];
    if (shown.length && !shown.some((q) => q.id === this.selectedQuestId)) this.selectedQuestId = shown[0].id;
    const tracked = this.questManager.getTrackedQuest()?.id;
    const item = (q) => {
      const cls = q.status === 'completed' ? 'lk-done' : 'lk-active';
      const tag = q.status === 'ready_to_turn_in' ? `<span class="lk-q-tag lk-turn">${i18n.t('questBook.turnIn')}</span>`
        : q.id === tracked ? `<span class="lk-q-tag" title="${i18n.t('questBook.trackedTitle')}"><img src="${I('mission')}" alt=""></span>` : '';
      return `<button type="button" class="lk-q-item ${cls} ${q.id === this.selectedQuestId ? 'lk-is-active' : ''}" data-id="${q.id}"><span class="lk-seal"></span><span class="lk-q-name">${esc(q.title)}</span>${tag}</button>`;
    };
    const mains = active.filter((q) => q.category === 'Principal');
    const sides = active.filter((q) => q.category !== 'Principal');
    let html = '';
    if (mains.length) html += `<h5>${i18n.t('questBook.catMain')}</h5>${mains.map(item).join('')}`;
    if (sides.length) html += `<h5>${i18n.t('questBook.catSide')}</h5>${sides.map(item).join('')}`;
    if (!active.length) html += `<p class="lk-j-empty">${i18n.t('questBook.emptyActive')}</p>`;
    if (!this.hideCompleted) {
      html += `<h5>${i18n.t('questBook.completedN', { n: done.length })}</h5>`;
      html += done.length ? done.map(item).join('') : `<p class="lk-j-empty">${i18n.t('questBook.emptyDone')}</p>`;
    } else if (done.length) {
      html += `<p class="lk-j-foot">${done.length === 1 ? i18n.t('questBook.hiddenOne', { n: done.length }) : i18n.t('questBook.hiddenMany', { n: done.length })}</p>`;
    }
    list.innerHTML = html;
  }

  // ------------------------------------------------------------ página
  _renderRightPage() {
    const page = this.$('page');
    const q = this.questManager.getQuest(this.selectedQuestId);
    const discovered = q && (q.status === 'active' || q.status === 'ready_to_turn_in' || q.status === 'completed');
    const visible = discovered && !(this.hideCompleted && q.status === 'completed') && (this.activeCategory === 'all' || q.category === this.activeCategory);
    if (!visible) {
      page.innerHTML = `<div class="lk-j-blank"><img class="lk-ai" src="${I('mission')}" alt=""><h4>${i18n.t('questBook.blankTitle')}</h4><p>${i18n.t('questBook.blankText')}</p></div>`;
      return;
    }
    const done = q.status === 'completed';
    const ready = q.status === 'ready_to_turn_in';
    const tracked = this.questManager.getTrackedQuest()?.id === q.id;
    const status = done ? i18n.t('questBook.stCompleted') : ready ? i18n.t('questBook.stReady') : i18n.t('questBook.stActive');
    // Una misión completada muestra todos sus pasos cumplidos
    const steps = (q.objective?.steps || []).map((st) => (done ? { ...st, done: true } : st));
    const nDone = steps.filter((s) => s.done).length;
    const next = steps.find((s) => !s.done);

    // Recompensas en casillas del sistema (slot-item): oro, EXP, objetos y reclutas
    const slots = [];
    if (q.rewards?.gold) slots.push(`<div class="lk-slot-item" style="--r:var(--lk-rar-common)" title="${i18n.t('questBook.gold')}"><span class="lk-art"><img class="lk-ai" src="${curIcon('gold')}" alt=""></span><span class="lk-cap">${q.rewards.gold}</span></div>`);
    if (q.rewards?.exp) slots.push(`<div class="lk-slot-item" style="--r:var(--lk-rar-rare)" title="${i18n.t('questBook.experience')}"><span class="lk-art"><img class="lk-ai" src="${I('upgrade')}" alt=""></span><span class="lk-cap">${i18n.t('questBook.exp', { n: q.rewards.exp })}</span></div>`);
    (q.rewards?.items || []).forEach((it) => {
      const mat = it.id ? MATERIALS[it.id] : null;
      if (mat) { // material de la Forja (20-oct): dibujo SVG y cantidad
        const r = RAR[mat.rarity] || 'common';
        slots.push(`<div class="lk-slot-item" style="--r:var(--lk-rar-${r})" title="${esc(mat.name)} ×${it.qty || 1}\n${esc(mat.description)}"><span class="lk-art" style="display:grid;place-items:center;color:var(--lk-gilt-300, #EED39A)">${matIcon(mat, 40)}</span><span class="lk-cap">${esc(mat.name)} ×${it.qty || 1}</span></div>`);
        return;
      }
      const db = it.id ? ITEMS_DB[it.id] : null;
      const icon = isImg(it.icon) ? it.icon : db && isImg(db.icon) ? db.icon : null;
      const r = RAR[db?.rarity || it.rarity] || 'common';
      const stats = it.stats ? Object.entries(it.stats).map(([k, v]) => `+${v} ${{ hp: i18n.t('questBook.statHp'), shield: i18n.t('questBook.statShield'), damage: i18n.t('questBook.statDamage'), initiative: i18n.t('questBook.statInitiative'), pa: i18n.t('questBook.statAp'), pm: i18n.t('questBook.statMp') }[k] || k}`).join(' · ') : '';
      slots.push(`<div class="lk-slot-item" style="--r:var(--lk-rar-${r})" title="${esc(it.name)}${stats ? ' · ' + esc(stats) : ''}${it.desc ? '\n' + esc(it.desc) : ''}"><span class="lk-art">${icon ? `<img src="${icon}" alt="">` : `<span class="lk-emoji">${esc(it.icon || '✦')}</span>`}</span><span class="lk-cap">${esc(it.name)}</span></div>`);
    });
    (q.rewards?.recruits || []).forEach((id) => {
      const url = portraitService.getPortraitSync(id) || `./assets/portraits/${id}.png`;
      slots.push(`<div class="lk-slot-item lk-recruit" style="--r:var(--lk-rar-epic)" title="${i18n.t('questBook.recruitTitle')}"><span class="lk-art"><img src="${url}" alt=""></span><span class="lk-cap">${esc(RECRUIT[id] || id)}</span></div>`);
    });

    page.innerHTML = `
      <span class="lk-label" style="color:var(--lk-gilt-700)">${esc(CAT_ES[q.category] || q.category)} · ${status}${q.zoneCoords ? i18n.t('questBook.zone', { c: q.zoneCoords.join(', ') }) : ''}</span>
      <h4>${esc(q.title)}</h4>
      <div class="lk-giver"><span class="lk-face">${this._renderGiverAvatar(q.giver)}</span><div><b>${esc(q.giver?.name || 'Lunacia')}</b><br><small>${esc(q.giver?.title || '')}</small></div>
        ${!done ? `<button type="button" class="lk-btn ${tracked ? 'lk-btn-primary-gold' : 'lk-btn-secondary-wood'} lk-btn--sm lk-j-track" data-ref="track"${tracked && this.questManager.canDisableTracking?.() ? ` title="${esc(i18n.t('questBook.untrackHint'))}"` : ''}><span class="lk-b-ico"><img class="lk-ai" src="${I('mission')}" alt=""></span>${tracked ? i18n.t('questBook.tracking') : i18n.t('questBook.track')}</button>` : ''}</div>
      ${q.npcQuote ? `<p class="lk-j-quote">“${esc(q.npcQuote)}”</p>` : ''}
      ${q.lore ? `<p>${esc(q.lore)}</p>` : ''}
      <div class="lk-j-objs">
        <span class="lk-label">${i18n.t('questBook.objectives', { done: nDone, total: steps.length })}</span>
        ${q.objective?.summary ? `<p class="lk-j-sum">${esc(q.objective.summary)}</p>` : ''}
        ${steps.map((s) => `<div class="lk-obj ${s.done ? 'lk-is-done' : s === next ? 'lk-is-next' : ''}"><i></i>${esc(s.desc)}</div>`).join('')}
      </div>
      ${slots.length ? `<div class="lk-j-rew"><span class="lk-label">${i18n.t('questBook.rewards')}${done || q.rewardClaimed ? i18n.t('questBook.rewardsReceived') : i18n.t('questBook.rewardsOnComplete')}</span><div class="lk-rewards">${slots.join('')}</div></div>` : ''}
      ${done ? `<div class="lk-seal-stamp"><div>${sprite('i-moon', { fill: true })}${i18n.t('questBook.stamp')}</div></div>` : ''}`;
    page.scrollTop = 0;
    this.$('track')?.addEventListener('click', () => {
      if (this.audio && typeof this.audio.playBuff === 'function') this.audio.playBuff();
      this.questManager.setTrackedQuest(q.id);
      this._renderLeftPage();
      this._renderRightPage();
    });
  }

  _isEmoji(str) {
    if (!str || typeof str !== 'string') return false;
    const clean = str.trim();
    if (clean.length > 8) return false;
    return /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u.test(clean);
  }

  // Retrato del NPC que da la misión (misma resolución que antes: avatar, NPC_PORTRAIT_MAP, modelo o render 3D)
  _renderGiverAvatar(giver) {
    if (!giver) return '<img src="./assets/portraits/paladill.png" alt="">';
    let candidate = this._isEmoji(giver.avatar) ? null : giver.avatar;
    const keys = [giver.name, giver.title, String(giver.model || '').replace('.glb', ''), giver.id].map((s) => String(s || '').toLowerCase().trim()).filter(Boolean);
    if (!candidate && NPC_PORTRAIT_MAP) candidate = keys.map((k) => NPC_PORTRAIT_MAP[k]).find(Boolean) || null;
    const model = String(giver.model || '').toLowerCase().replace('.glb', '').trim();
    if (!candidate && model) candidate = model;
    if (isImg(candidate)) return `<img src="${candidate}" alt="">`;
    const sync = candidate && portraitService.getPortraitSync(candidate);
    if (sync) return `<img src="${sync}" alt="">`;
    const key = candidate || keys[0];
    const uid = `lk-giver-${Math.random().toString(36).slice(2, 9)}`;
    if (key) {
      portraitService.getPortrait(key).then((url) => { const el = document.getElementById(uid); if (url && el) el.src = url; }).catch(() => {});
    }
    return `<img id="${uid}" src="./assets/portraits/paladill.png" alt="">`;
  }
}
