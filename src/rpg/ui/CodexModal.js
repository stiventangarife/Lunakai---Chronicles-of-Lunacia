// CodexModal.js — Hito 126 · Códice de Lunacia (tecla C · botón del HUD · botones «?» de los paneles).
//
// Libro de marfil con el bucle del juego: carril de capítulos a la izquierda y una doble página (ilustración +
// texto corto, consejo y botón que lleva al sitio del juego). Las páginas nuevas llevan un sello «Nuevo».
// Solo se carga la imagen de la página abierta (no pesa en la carga inicial).
//
// API: open(chapterId?, pageId?), close(), toggle(), isOpen, onOpen, onClose, onChange (progreso),
//      exportSaveData() / loadSaveData(data) → { v: 1, seen: ['capítulo/página'], beasts: { id: victorias } }.
// Cualquier botón con data-codex="capítulo" (y opcional data-codex-page) abre el Códice ahí.

import { CODEX_CHAPTERS, findChapter, pageKey } from '../codex/CodexData.js';
import { codexArt } from '../codex/CodexArt.js';
import { renderGenerated, beastByType } from '../codex/CodexGenerated.js';
import { asset, sprite } from '../../ui/lk.js';
import * as i18n from '../../i18n/i18n.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const has = (k) => { const v = i18n.t(k); return v && v !== k; };

export class CodexModal {
  constructor({ audio = null, runAction = null, context = null } = {}) {
    this.audio = audio;
    this.context = context; // () => ({ em }) — datos de la partida para las páginas generadas (C3)
    this.runAction = runAction; // (id) => void — lo pone OverworldManager
    this.isOpen = false;
    this.onOpen = null;
    this.onClose = null;
    this.onChange = null;
    this.chapter = CODEX_CHAPTERS[0].id;
    this.page = 0;
    this.seen = new Set();
    this.beasts = {};
    this._createDOM();
    document.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-codex]');
      if (!b || this.modalEl.contains(b)) return;
      e.preventDefault();
      this.open(b.dataset.codex, b.dataset.codexPage || null);
    });
  }

  // ------------------------------------------------------------ guardado
  exportSaveData() { return { v: 1, seen: [...this.seen], beasts: { ...this.beasts } }; }
  loadSaveData(data) {
    this.seen = new Set(Array.isArray(data?.seen) ? data.seen.filter((k) => typeof k === 'string') : []);
    this.beasts = data?.beasts && typeof data.beasts === 'object' ? { ...data.beasts } : {};
    this._renderRail();
  }
  /** Las fichas del Bestiario sin descubrir no cuentan como «sin leer» (si no, el punto no se iría nunca). */
  _countable(ch, p) { return !(p.gen === 'beast' && !this.beasts[p.beast]); }
  /** Páginas sin leer (para el punto del HUD). */
  unreadCount() {
    let n = 0;
    for (const ch of CODEX_CHAPTERS) for (const p of ch.pages) if (this._countable(ch, p) && !this.seen.has(pageKey(ch.id, p.id))) n++;
    return n;
  }
  _chapterUnread(ch) { return ch.pages.some((p) => this._countable(ch, p) && !this.seen.has(pageKey(ch.id, p.id))); }

  /** Fin de un combate ganado: las quimeras vencidas se desvelan en el Bestiario. types: unit.type de los enemigos. */
  recordBeasts(types = []) {
    let changed = false;
    for (const ty of new Set(types)) {
      const b = beastByType(ty);
      if (!b) continue;
      const first = !this.beasts[b.a.id];
      this.beasts[b.a.id] = (this.beasts[b.a.id] || 0) + types.filter((x) => x === ty).length;
      if (first) this.seen.delete(pageKey('bestiary', `b_${b.a.id}`)); // ficha nueva: vuelve a salir el sello
      changed = true;
    }
    if (changed) { this._renderRail(); this.onChange?.(); }
    return changed;
  }
  /** Fichas desveladas / total. */
  bestiaryProgress() {
    const pages = findChapter('bestiary').pages.filter((p) => p.gen === 'beast');
    return { known: pages.filter((p) => this.beasts[p.beast]).length, total: pages.length };
  }

  // ------------------------------------------------------------ DOM
  _createDOM() {
    document.getElementById('codex-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'codex-modal';
    m.className = 'lk-ui lk-backdrop lk-cdx-layer hidden';
    m.innerHTML = `
      <div class="lk-panel-modal-window lk-cdx" role="dialog" aria-modal="true" aria-labelledby="lk-cdx-title">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I('codex')}" alt=""></span>
          <h3 id="lk-cdx-title"><small>${esc(i18n.t('codex.kicker'))}</small>${esc(i18n.t('codex.title'))}</h3>
          <span class="lk-cdx__count" data-ref="count"></span>
          <button type="button" class="lk-btn-close-x" data-ref="close" aria-label="${esc(i18n.t('codex.close'))}">${sprite('i-close')}</button>
        </div>
        <div class="lk-cdx__body">
          <nav class="lk-cdx__rail" data-ref="rail" aria-label="${esc(i18n.t('codex.chapters'))}"></nav>
          <article class="lk-cdx__book" data-ref="book" aria-live="polite"></article>
        </div>
      </div>`;
    document.body.appendChild(m);
    this.modalEl = m;
    this.$ = (n) => m.querySelector(`[data-ref="${n}"]`);

    m.addEventListener('click', (e) => { if (e.target === m) this.close(); });
    m.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    this.$('close').addEventListener('click', () => this.close());
    this.$('rail').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-ch]');
      if (!b) return;
      this.audio?.playClick?.();
      this._go(b.dataset.ch, 0);
    });
    this.$('book').addEventListener('click', (e) => {
      const b = e.target.closest('[data-nav],[data-dot],[data-action],[data-toc],[data-zoom]');
      if (!b) return;
      if (b.dataset.zoom != null) { this.audio?.playClick?.(); this._setZoom(!this._zoom); return; } // Hito 127
      if (b.dataset.toc != null) { this.audio?.playClick?.(); this._go(this.chapter, Number(b.dataset.toc)); return; }
      if (b.dataset.nav) { this._step(Number(b.dataset.nav)); return; }
      if (b.dataset.dot != null) { this.audio?.playClick?.(); this._go(this.chapter, Number(b.dataset.dot)); return; }
      if (b.dataset.action) { const id = b.dataset.action; this.close(); this.runAction?.(id); }
    });
    // Flechas para pasar página (en captura: el mundo no debe girar la cámara ni moverse)
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape' && this._zoom) { e.preventDefault(); e.stopImmediatePropagation(); this._setZoom(false); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); e.stopImmediatePropagation();
        this._step(e.key === 'ArrowRight' ? 1 : -1);
      }
    }, true);
  }

  // ------------------------------------------------------------ apertura
  open(chapterId = null, pageId = null) {
    if (document.body.classList.contains('state-combat') || window.__AXIE_TACTICS_APP__?.gameState === 'BATTLE') return;
    const ch = chapterId && findChapter(chapterId);
    if (ch) {
      this.chapter = ch.id;
      const i = pageId ? ch.pages.findIndex((p) => p.id === pageId) : 0;
      this.page = Math.max(0, i);
    }
    if (!this.isOpen) {
      this.isOpen = true;
      this.modalEl.classList.remove('hidden');
      void this.modalEl.offsetWidth;
      this.modalEl.classList.add('lk-is-open');
      this.audio?.playBuff?.();
      this.onOpen?.();
    }
    this._renderRail();
    this._renderPage();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.modalEl.classList.remove('lk-is-open');
    this.modalEl.classList.add('hidden');
    this.audio?.playClick?.();
    this.onClose?.();
  }

  toggle(chapterId = null) { if (this.isOpen) this.close(); else this.open(chapterId); }

  // ------------------------------------------------------------ navegación
  _go(chapterId, page) {
    const ch = findChapter(chapterId); if (!ch) return;
    this.chapter = ch.id;
    this.page = Math.min(Math.max(0, page), ch.pages.length - 1);
    this._zoom = false;
    this._renderRail();
    this._renderPage();
  }

  /** Hito 127: la ilustración ocupa toda la doble página (capturas de la interfaz con mucho detalle). */
  _setZoom(on) {
    this._zoom = !!on;
    const book = this.$('book');
    book.classList.toggle('lk-cdx__book--zoom', this._zoom);
    const z = book.querySelector('.lk-cdx__zoom'); // el botón (la imagen también lleva data-zoom)
    if (z) {
      z.setAttribute('aria-pressed', String(this._zoom));
      z.setAttribute('aria-label', i18n.t(this._zoom ? 'codex.zoomOut' : 'codex.zoom'));
      const em = z.querySelector('em');
      if (em) em.textContent = i18n.t(this._zoom ? 'codex.zoomOut' : 'codex.zoom');
    }
  }

  /** Título de una página (las generadas lo calculan; solo se usa en capítulos cortos). */
  _pageTitle(ch, p) {
    if (p.gen) return renderGenerated(p, { em: this.context?.()?.em, beasts: this.beasts })?.title || '';
    return i18n.t(`codex.${ch.id}.${p.id}.title`);
  }

  /** Hito 127: páginas leídas / que cuentan, para el carril. */
  _chapterProgress(ch) {
    const pages = ch.pages.filter((p) => this._countable(ch, p));
    return { read: pages.filter((p) => this.seen.has(pageKey(ch.id, p.id))).length, total: pages.length };
  }

  /** Avanza o retrocede una página; al final de un capítulo pasa al siguiente. */
  _step(d) {
    const ci = CODEX_CHAPTERS.findIndex((c) => c.id === this.chapter);
    const ch = CODEX_CHAPTERS[ci];
    let p = this.page + d, c = ci;
    if (p >= ch.pages.length) { c = ci + 1; p = 0; }
    if (p < 0) { c = ci - 1; p = c >= 0 ? CODEX_CHAPTERS[c].pages.length - 1 : 0; }
    if (c < 0 || c >= CODEX_CHAPTERS.length) return;
    this.audio?.playClick?.();
    this._go(CODEX_CHAPTERS[c].id, p);
  }

  _markSeen(key) {
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.onChange?.();
  }

  // ------------------------------------------------------------ pintado
  _renderRail() {
    if (!this.modalEl) return;
    this.$('rail').innerHTML = CODEX_CHAPTERS.map((ch, i) => {
      const on = ch.id === this.chapter;
      const pr = this._chapterProgress(ch);
      const done = pr.total > 0 && pr.read >= pr.total;
      const mark = done ? `<i class="lk-cdx__done" aria-label="${esc(i18n.t('codex.read'))}"></i>`
        : pr.read > 0 ? `<i class="lk-cdx__prog" aria-label="${pr.read}/${pr.total}">${pr.read}/${pr.total}</i>`
          : this._chapterUnread(ch) ? `<i class="lk-cdx__new" aria-label="${esc(i18n.t('codex.new'))}"></i>` : '';
      return `<button type="button" data-ch="${ch.id}" class="${on ? 'lk-is-on' : ''} ${done ? 'lk-is-done' : ''}" ${on ? 'aria-current="page"' : ''}>
        <img class="lk-ai" src="${I(ch.icon)}" alt=""><span class="lk-cdx__ch-n">${String(i).padStart(2, '0')}</span>
        <span class="lk-cdx__ch-t">${esc(i18n.t(`codex.ch.${ch.id}`))}</span>${mark}</button>`;
    }).join('');
    const n = this.unreadCount();
    this.$('count').textContent = n ? i18n.t('codex.unread', { n }) : '';
  }

  _renderPage() {
    const ch = findChapter(this.chapter);
    const pg = ch.pages[this.page];
    const key = pageKey(ch.id, pg.id);
    const base = `codex.${ch.id}.${pg.id}`;
    const fresh = !this.seen.has(key) && this._countable(ch, pg);
    const gen = pg.gen ? renderGenerated(pg, { em: this.context?.()?.em, beasts: this.beasts }) : null;
    const title = gen ? gen.title : i18n.t(`${base}.title`);
    const ci = CODEX_CHAPTERS.indexOf(ch);
    const first = ci === 0 && this.page === 0;
    const last = ci === CODEX_CHAPTERS.length - 1 && this.page === ch.pages.length - 1;
    // Hito 127: índice del capítulo bajo la ilustración (capítulos de hasta 6 páginas), imagen ampliable,
    // pasar página con texto (al final de un capítulo dice cuál sigue) y contador en lugar de puntos en el Bestiario.
    const many = ch.pages.length > 8;
    const toc = !many && ch.pages.length > 1 ? `<nav class="lk-cdx__toc" aria-label="${esc(i18n.t('codex.inChapter'))}">
        <small>${esc(i18n.t('codex.inChapter'))}</small>
        <ol>${ch.pages.map((p, i) => {
          const read = this.seen.has(pageKey(ch.id, p.id)) || i === this.page;
          return `<li><button type="button" data-toc="${i}" class="${i === this.page ? 'lk-is-on' : ''} ${read ? 'lk-is-read' : ''}" ${i === this.page ? 'aria-current="step"' : ''}>
            <span class="lk-cdx__toc-n">${i + 1}</span><span class="lk-cdx__toc-t">${esc(i === this.page ? title : this._pageTitle(ch, p))}</span></button></li>`;
        }).join('')}</ol></nav>` : '';
    const media = gen ? `<div class="lk-cdx__art lk-cdx__art--gen">${gen.art}</div>`
      : pg.art ? `<div class="lk-cdx__art">${codexArt(pg.art)}</div>`
        : pg.img ? `<figure class="lk-cdx__plate"><img class="lk-cdx__img" src="${asset(pg.img)}" alt="${esc(title)}" decoding="async" data-zoom>
            <button type="button" class="lk-cdx__zoom" data-zoom aria-pressed="false" aria-label="${esc(i18n.t('codex.zoom'))}"><span aria-hidden="true"></span><em>${esc(i18n.t('codex.zoom'))}</em></button></figure>`
          : '<div class="lk-cdx__img lk-cdx__img--none"></div>';
    const nextCh = this.page === ch.pages.length - 1 ? CODEX_CHAPTERS[ci + 1] : null;
    const prevCh = this.page === 0 ? CODEX_CHAPTERS[ci - 1] : null;
    const navLabel = (c, fallback) => (c ? i18n.t(`codex.ch.${c.id}`) : i18n.t(fallback));
    const dots = many
      ? `<span class="lk-cdx__counter" aria-live="polite"><span><b>${this.page + 1}</b> / ${ch.pages.length}</span><i style="--p:${((this.page + 1) / ch.pages.length).toFixed(3)}"></i></span>`
      : `<span class="lk-cdx__dots">${ch.pages.map((p, i) => `<button type="button" data-dot="${i}" class="${i === this.page ? 'lk-is-on' : ''} ${p.gen === 'beast' && !this.beasts[p.beast] ? 'lk-is-locked' : ''}" aria-label="${i + 1}"></button>`).join('')}</span>`;
    this.$('book').classList.remove('lk-cdx__book--zoom');
    this.$('book').innerHTML = `
      <div class="lk-cdx__page lk-cdx__page--art ${toc ? 'lk-has-toc' : ''}">
        <div class="lk-cdx__media">${media}</div>
        ${toc}
      </div>
      <div class="lk-cdx__page lk-cdx__page--text">
        <div class="lk-cdx__kicker">${esc(i18n.t(`codex.ch.${ch.id}`))} · ${ch.id === 'bestiary' ? esc(i18n.t('codex.gen.discovered', this.bestiaryProgress())) : `${this.page + 1}/${ch.pages.length}`}${fresh ? `<span class="lk-cdx__stamp">${esc(i18n.t('codex.new'))}</span>` : ''}</div>
        <h4 class="lk-cdx__title">${esc(title)}</h4>
        <div class="lk-cdx__text">${gen ? gen.body : i18n.t(`${base}.body`)}</div>
        ${gen ? (gen.tip ? `<aside class="lk-cdx__tip"><b>${esc(i18n.t('codex.tip'))}</b> ${gen.tip}</aside>` : '') : has(`${base}.tip`) ? `<aside class="lk-cdx__tip"><b>${esc(i18n.t('codex.tip'))}</b> ${i18n.t(`${base}.tip`)}</aside>` : ''}
        ${pg.action ? `<button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm lk-cdx__go" data-action="${pg.action.id}">${esc(i18n.t(pg.action.label))}</button>` : ''}
        <div class="lk-cdx__nav" title="${esc(i18n.t('codex.keysHint'))}">
          <button type="button" class="lk-cdx__arrow lk-cdx__arrow--prev" data-nav="-1" ${first ? 'disabled' : ''} aria-label="${esc(i18n.t('codex.prev'))}" aria-keyshortcuts="ArrowLeft"><span aria-hidden="true">‹</span><em>${esc(first ? i18n.t('codex.prevShort') : navLabel(prevCh, 'codex.prevShort'))}</em></button>
          ${dots}
          <button type="button" class="lk-cdx__arrow lk-cdx__arrow--next ${nextCh ? 'lk-is-chapter' : ''}" data-nav="1" ${last ? 'disabled' : ''} aria-label="${esc(i18n.t('codex.next'))}" aria-keyshortcuts="ArrowRight"><em>${esc(last ? i18n.t('codex.nextShort') : navLabel(nextCh, 'codex.nextShort'))}</em><span aria-hidden="true">›</span></button>
        </div>
      </div>`;
    this._zoom = false;
    if (this._countable(ch, pg)) this._markSeen(key);
    this._renderRail();
  }
}
