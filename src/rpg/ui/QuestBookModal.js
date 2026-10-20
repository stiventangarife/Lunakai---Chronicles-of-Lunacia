// QuestBookModal.js — Crónica de misiones (Crónica Celeste, etapa 8)
// Pantalla 22 del sistema de diseño ("Crónica de misiones"): carril de categorías, lista sobre vidrio
// y página de marfil con la historia, los objetivos y las recompensas. El sello marca las misiones completadas.
// API intacta: new QuestBookModal(questManager, audio), open(questId), close(), toggle(questId), isOpen, onOpen, onClose.
// Los textos de las misiones vienen de QuestManager tal cual; aquí solo se traduce la interfaz.
import { NPC_PORTRAIT_MAP } from '../DialogSystem.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import { ITEMS_DB } from '../../tactics/ItemDatabase.js';
import { asset, sprite, bindSwitch } from '../../ui/lk.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isImg = (s) => typeof s === 'string' && (/^(\.\/|\/|assets\/|http|data:image)/.test(s) || /\.(png|jpe?g|webp|svg)$/i.test(s));
const RAR = { common: 'common', uncommon: 'uncommon', rare: 'rare', epic: 'epic', legendary: 'mystic', mystic: 'mystic' };
const CATS = [
  ['all', 'Todas las misiones', 'list'],
  ['Principal', 'Historia principal', 'mission'],
  ['Secundaria', 'Encargos', 'browse']
];
const CAT_ES = { Principal: 'Historia principal', Secundaria: 'Encargo' };
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
      <div class="lk-panel-modal-window lk-chron" role="dialog" aria-label="Crónica de misiones">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I('mission')}" alt=""></span>
          <h3><small>Crónica · tecla J</small>Misiones</h3>
          <label class="lk-chron__hide"><span>Ocultar completadas</span><button type="button" class="lk-switch" role="switch" aria-checked="true" data-ref="hide" aria-label="Ocultar misiones completadas"></button></label>
          <button type="button" class="lk-btn-close-x" data-ref="close" aria-label="Cerrar">${sprite('i-close')}</button>
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
      const tag = q.status === 'ready_to_turn_in' ? '<span class="lk-q-tag lk-turn">Entregar</span>'
        : q.id === tracked ? `<span class="lk-q-tag" title="Misión seguida en el HUD"><img src="${I('mission')}" alt=""></span>` : '';
      return `<button type="button" class="lk-q-item ${cls} ${q.id === this.selectedQuestId ? 'lk-is-active' : ''}" data-id="${q.id}"><span class="lk-seal"></span><span class="lk-q-name">${esc(q.title)}</span>${tag}</button>`;
    };
    const mains = active.filter((q) => q.category === 'Principal');
    const sides = active.filter((q) => q.category !== 'Principal');
    let html = '';
    if (mains.length) html += `<h5>Historia principal</h5>${mains.map(item).join('')}`;
    if (sides.length) html += `<h5>Encargos</h5>${sides.map(item).join('')}`;
    if (!active.length) html += '<p class="lk-j-empty">No tienes misiones en curso aquí. Habla con los habitantes de Lunacia <kbd>E</kbd> para aceptar nuevas.</p>';
    if (!this.hideCompleted) {
      html += `<h5>Completadas · ${done.length}</h5>`;
      html += done.length ? done.map(item).join('') : '<p class="lk-j-empty">Aún no has completado misiones en esta categoría.</p>';
    } else if (done.length) {
      html += `<p class="lk-j-foot">${done.length} ${done.length === 1 ? 'misión completada oculta' : 'misiones completadas ocultas'}</p>`;
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
      page.innerHTML = `<div class="lk-j-blank"><img class="lk-ai" src="${I('mission')}" alt=""><h4>Diario de aventura</h4><p>Explora Lunacia y habla con sus habitantes <kbd>E</kbd> para descubrir nuevas misiones.</p></div>`;
      return;
    }
    const done = q.status === 'completed';
    const ready = q.status === 'ready_to_turn_in';
    const tracked = this.questManager.getTrackedQuest()?.id === q.id;
    const status = done ? 'Completada' : ready ? 'Lista para entregar' : 'En curso';
    // Una misión completada muestra todos sus pasos cumplidos
    const steps = (q.objective?.steps || []).map((st) => (done ? { ...st, done: true } : st));
    const nDone = steps.filter((s) => s.done).length;
    const next = steps.find((s) => !s.done);

    // Recompensas en casillas del sistema (slot-item): oro, EXP, objetos y reclutas
    const slots = [];
    if (q.rewards?.gold) slots.push(`<div class="lk-slot-item" style="--r:var(--lk-rar-common)" title="Oro"><span class="lk-art"><img class="lk-ai" src="${I('resource')}" alt=""></span><span class="lk-cap">${q.rewards.gold}</span></div>`);
    if (q.rewards?.exp) slots.push(`<div class="lk-slot-item" style="--r:var(--lk-rar-rare)" title="Experiencia"><span class="lk-art"><img class="lk-ai" src="${I('upgrade')}" alt=""></span><span class="lk-cap">${q.rewards.exp} EXP</span></div>`);
    (q.rewards?.items || []).forEach((it) => {
      const db = it.id ? ITEMS_DB[it.id] : null;
      const icon = isImg(it.icon) ? it.icon : db && isImg(db.icon) ? db.icon : null;
      const r = RAR[db?.rarity || it.rarity] || 'common';
      const stats = it.stats ? Object.entries(it.stats).map(([k, v]) => `+${v} ${{ hp: 'Vida', shield: 'Escudo', damage: 'Daño', initiative: 'Iniciativa', pa: 'PA', pm: 'PM' }[k] || k}`).join(' · ') : '';
      slots.push(`<div class="lk-slot-item" style="--r:var(--lk-rar-${r})" title="${esc(it.name)}${stats ? ' · ' + esc(stats) : ''}${it.desc ? '\n' + esc(it.desc) : ''}"><span class="lk-art">${icon ? `<img src="${icon}" alt="">` : `<span class="lk-emoji">${esc(it.icon || '🎁')}</span>`}</span><span class="lk-cap">${esc(it.name)}</span></div>`);
    });
    (q.rewards?.recruits || []).forEach((id) => {
      const url = portraitService.getPortraitSync(id) || `./assets/portraits/${id}.png`;
      slots.push(`<div class="lk-slot-item lk-recruit" style="--r:var(--lk-rar-epic)" title="Se une a tu expedición"><span class="lk-art"><img src="${url}" alt=""></span><span class="lk-cap">${esc(RECRUIT[id] || id)}</span></div>`);
    });

    page.innerHTML = `
      <span class="lk-label" style="color:var(--lk-gilt-700)">${esc(CAT_ES[q.category] || q.category)} · ${status}${q.zoneCoords ? ` · Zona [${q.zoneCoords.join(', ')}]` : ''}</span>
      <h4>${esc(q.title)}</h4>
      <div class="lk-giver"><span class="lk-face">${this._renderGiverAvatar(q.giver)}</span><div><b>${esc(q.giver?.name || 'Lunacia')}</b><br><small>${esc(q.giver?.title || '')}</small></div>
        ${!done ? `<button type="button" class="lk-btn ${tracked ? 'lk-btn-primary-gold' : 'lk-btn-secondary-wood'} lk-btn--sm lk-j-track" data-ref="track"><span class="lk-b-ico"><img class="lk-ai" src="${I('mission')}" alt=""></span>${tracked ? 'Siguiendo' : 'Seguir en el HUD'}</button>` : ''}</div>
      ${q.npcQuote ? `<p class="lk-j-quote">“${esc(q.npcQuote)}”</p>` : ''}
      ${q.lore ? `<p>${esc(q.lore)}</p>` : ''}
      <div class="lk-j-objs">
        <span class="lk-label">Objetivos · ${nDone}/${steps.length}</span>
        ${q.objective?.summary ? `<p class="lk-j-sum">${esc(q.objective.summary)}</p>` : ''}
        ${steps.map((s) => `<div class="lk-obj ${s.done ? 'lk-is-done' : s === next ? 'lk-is-next' : ''}"><i></i>${esc(s.desc)}</div>`).join('')}
      </div>
      ${slots.length ? `<div class="lk-j-rew"><span class="lk-label">Recompensas${done || q.rewardClaimed ? ' · recibidas' : ' · al completarla'}</span><div class="lk-rewards">${slots.join('')}</div></div>` : ''}
      ${done ? `<div class="lk-seal-stamp"><div>${sprite('i-moon', { fill: true })}COMPLETADA</div></div>` : ''}`;
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
