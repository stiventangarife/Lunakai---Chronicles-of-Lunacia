// SquadModal.js — Escuadrón (Crónica Celeste, etapa 7)
// Pantalla 19 del sistema de diseño ("Escuadrón") con las clases lk- de src/ui/ds.generated.css.
// Decide quién viaja y combate contigo: el Sapidae líder (fijo, entra siempre en combate), el compañero principal y 2 axies de apoyo.
// El escuadrón se guarda en EquipmentManager (getSquad / setSquad) y DynamicCombatFactory lo usa para el combate.
// Tecla K (OverworldManager). API: open(), close(), toggle(), isOpen, onOpen, onClose, onChange(squad), onOpenInventory(heroId).
import { getHeroSpells } from '../SaveSlotManager.js';
import { SPELLS_DB } from '../../tactics/Spells.js';
import { STARTER_DECKS } from '../../tactics/data/StarterCards.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import { getAxieClassIcon, axieClassKey } from './InventoryModal.js';
import { BondDemo } from './CombatEndScreen.js';
import { asset, sprite, toast } from '../../ui/lk.js';
import { canBeMainAxie } from '../../tactics/EquipmentManager.js';
import { axieMixerService } from '../AxieMixerService.js';
import { loadAccountAxies, canLoadAccountAxies, loadAxieById } from '../AccountAxiesService.js';
import { RuneCharmService } from '../RuneCharmService.js';
import * as i18n from '../../i18n/i18n.js';

const I = (n) => asset(`assets/ui/icons/${n}.png`);
const SLOT_LBL = [i18n.t('squad.slotLeader'), i18n.t('squad.slotMain'), i18n.t('squad.slotSupport'), i18n.t('squad.slotSupport')];
const CLS_ES = { beast: i18n.t('squad.clsBeast'), bird: i18n.t('squad.clsBird'), plant: i18n.t('squad.clsPlant'), aquatic: i18n.t('squad.clsAquatic'), bug: i18n.t('squad.clsBug'), reptile: i18n.t('squad.clsReptile'), mech: 'Mech', dawn: 'Dawn', dusk: 'Dusk' };
const HERO_SPELLS = {
  bing: STARTER_DECKS.bing, // las 6 cartas originales de Origins (tactics/data/StarterCards.js)
  pomodoro: STARTER_DECKS.pomodoro
};
const PART_ES = { eyes: i18n.t('squad.partEyes'), ears: i18n.t('squad.partEars'), horn: i18n.t('squad.partHorn'), mouth: i18n.t('squad.partMouth'), back: i18n.t('squad.partBack'), tail: i18n.t('squad.partTail') };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Hito 75: los nombres largos de los Axies de la cuenta se cortan con «…» (el nombre completo va en el title)
const NAME_CUT = 'display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
const clsIcon = (c) => `<img src="${asset(`assets/classes/${c === 'dusk' ? 'dust' : c}.png`)}" alt="">`;

export class SquadModal {
  constructor(equipmentManager, audioSystem = null) {
    this.em = equipmentManager;
    this.audio = audioSystem;
    this.isOpen = false;
    this.slots = ['sapidae', null, null, null];
    this.sel = null;
    this.cls = 'all';
    this.pending = null;
    this.justDropped = false;
    this.onOpen = null;
    this.onClose = null;
    this.onChange = null;
    this.onOpenInventory = null;
    this._createDOM();
  }

  // ------------------------------------------------------------ DOM
  _createDOM() {
    document.getElementById('squad-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'squad-modal';
    m.className = 'lk-ui lk-backdrop lk-squad-layer hidden';
    m.innerHTML = `
      <div class="lk-panel-modal-window lk-squad" role="dialog" aria-label="${i18n.t('squad.title')}">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I('team')}" alt=""></span>
          <h3><small>${i18n.t('squad.kicker')}</small>${i18n.t('squad.title')}</h3>
          <span class="lk-res-pill" data-ref="count"></span>
          <button type="button" class="lk-btn-close-x" data-ref="close" aria-label="${i18n.t('squad.close')}">${sprite('i-close')}</button>
        </div>
        <div class="lk-squad__top" data-ref="slots"></div>
        <div class="lk-squad__body">
          <div class="lk-squad__col">
            <div class="lk-bag__bar"><div class="lk-codex__filters" data-ref="filter"></div><span class="lk-drag-hint" data-ref="colCount"></span></div>
            <div class="lk-sq-load" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 0 8px">
              <button type="button" class="lk-btn lk-btn-moon lk-btn--sm" data-ref="loadAx"><span class="lk-b-ico"><img class="lk-ai" src="${I('collection')}" alt=""></span><span data-ref="loadTxt">${i18n.t('squad.loadAxies')}</span></button>
              <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-ref="byIdBtn"><span class="lk-b-ico"><img class="lk-ai" src="${I('search')}" alt=""></span>${i18n.t('squad.loadById')}</button>
              <span class="lk-drag-hint" data-ref="loadMsg" style="flex:1;min-width:180px"></span>
            </div>
            <form class="lk-sq-byid" data-ref="byIdForm" hidden style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px">
              <input type="text" inputmode="numeric" autocomplete="off" data-ref="byIdInput" placeholder="${i18n.t('squad.byIdPlaceholder')}" aria-label="${i18n.t('squad.byIdPlaceholder')}" style="flex:1;min-width:160px;max-width:260px;padding:8px 12px;border-radius:10px;border:1px solid rgba(238,211,154,.35);background:rgba(10,14,28,.6);color:#F4EBDD;font:600 .9rem/1.2 inherit">
              <button type="submit" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-ref="byIdGo"><span class="lk-b-ico"><img class="lk-ai" src="${I('add')}" alt=""></span><span data-ref="byIdGoTxt">${i18n.t('squad.byIdAdd')}</span></button>
            </form>
            <div class="lk-ax-grid" data-ref="col"></div>
            <span class="lk-drag-hint" style="font-weight:600">${i18n.t('squad.dragHint')}</span>
          </div>
          <aside class="lk-squad__detail" data-ref="detail"></aside>
        </div>
      </div>`;
    document.body.appendChild(m);
    this.root = m;
    this.$ = (n) => m.querySelector(`[data-ref="${n}"]`);

    m.addEventListener('click', (e) => { if (e.target === m) this.close(); });
    this.$('close').addEventListener('click', () => this.close());
    m.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape' && this.pending) { this.pending = null; this._render(); e.stopImmediatePropagation(); }
    }, true);

    this.$('col').addEventListener('pointerdown', (e) => { const b = e.target.closest('.lk-ax-card'); if (!b || e.button > 0) return; e.preventDefault(); this._drag(e, b, b.dataset.id, -1); });
    this.$('slots').addEventListener('pointerdown', (e) => { const b = e.target.closest('.lk-sq-slot[data-id]'); if (!b || e.button > 0 || b.dataset.i === '0') return; e.preventDefault(); this._drag(e, b, b.dataset.id, +b.dataset.i); });
    [this.$('col'), this.$('slots')].forEach((el) => el.addEventListener('dragstart', (e) => e.preventDefault()));
    this.$('col').addEventListener('click', (e) => {
      if (this.justDropped) return;
      const b = e.target.closest('.lk-ax-card'); if (!b) return;
      if (this.pending && this.pending !== b.dataset.id) this.pending = null;
      this.sel = b.dataset.id; this._sfx(); this._render();
    });
    this.$('slots').addEventListener('click', (e) => {
      if (this.justDropped) return;
      const s = e.target.closest('.lk-sq-slot'); if (!s) return;
      const i = +s.dataset.i;
      if (this.pending) { if (i > 0) this._place(this.pending, i); else toast(i18n.t('squad.leaderNoReplace'), true); return; }
      if (s.dataset.id) { this.sel = s.dataset.id; this._sfx(); this._render(); }
    });
    this.$('loadAx').addEventListener('click', () => this.loadAccountAxies());
    // Hito 75: cargar cualquier Axie por su ID
    this.$('byIdBtn').addEventListener('click', () => {
      const f = this.$('byIdForm'); f.hidden = !f.hidden; f.style.display = f.hidden ? 'none' : 'flex';
      if (!f.hidden) setTimeout(() => this.$('byIdInput').focus(), 30);
    });
    this.$('byIdForm').style.display = 'none';
    this.$('byIdForm').addEventListener('submit', (e) => { e.preventDefault(); this.loadById(this.$('byIdInput').value); });
    this.$('byIdInput').addEventListener('keydown', (e) => e.stopPropagation()); // que escribir no mueva al personaje ni abra menús
    this.$('filter').addEventListener('click', (e) => { const b = e.target.closest('.lk-fchip'); if (!b) return; this.cls = b.dataset.k; this._render(); });
  }

  // ------------------------------------------------------------ apertura
  open() {
    if (document.body.classList.contains('state-combat') || window.__AXIE_TACTICS_APP__?.gameState === 'BATTLE') return;
    if (!this.em) return;
    this.slots = this.em.getSquad();
    if (!this.sel || !this._owned().concat('sapidae').includes(this.sel)) this.sel = this.slots[1] || 'sapidae';
    this.pending = null;
    this.isOpen = true;
    this.root.classList.remove('hidden');
    void this.root.offsetWidth;
    this.root.classList.add('lk-is-open');
    if (this.audio?.playBuff) this.audio.playBuff();
    this._render();
    this.onOpen?.();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.pending = null;
    this.root.classList.remove('lk-is-open');
    this.root.classList.add('hidden');
    if (this.audio?.playStep) this.audio.playStep();
    this.onClose?.();
  }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  // ------------------------------------------------------------ datos
  _owned() { return (this.em.unlockedHeroes || []).filter((id) => id !== 'sapidae' && this.em.heroesBase[id]); }
  _base(id) { return this.em.heroesBase[id]; }
  _isSapi(id) { return id === 'sapidae' || this._base(id)?.isSapidae; }
  _cls(id) {
    if (this._isSapi(id)) return 'sapidae';
    return axieClassKey(this._base(id)?.class) || 'beast';
  }
  _cc(id) { return this._isSapi(id) ? 'var(--lk-gilt-300)' : `var(--lk-class-${this._cls(id)})`; }
  _clsName(id) {
    if (this._isSapi(id)) {
      const k = this._base(id)?.sapidaeClassKey;
      const names = { crafter: 'Forjacubiles', shepard: 'Susurrador', lunalogist: 'Lunalogista', stargazer: 'Astromante' };
      return `Sapidae${names[k] ? ' · ' + names[k] : ''}`;
    }
    return CLS_ES[this._cls(id)] || 'Axie';
  }
  _role(id) {
    const a = String(this._base(id)?.archetype || '');
    const m = a.match(/\(([^)]+)\)/);
    const ROLE = { 'Melee Duelist': i18n.t('squad.roleMelee'), 'Ranged Marksman': i18n.t('squad.roleRanged'), 'Healer & Control': i18n.t('squad.roleHealer'), 'Líder': i18n.t('squad.roleLeader') };
    const r = m ? m[1] : a;
    const mEn = String(i18n.en(a)).match(/\(([^)]+)\)/); // rol en inglés para buscarlo (Hito 61)
    return ROLE[mEn && mEn[1]] || ROLE[r] || r || (this._isSapi(id) ? i18n.t('squad.roleLeader') : 'Axie');
  }
  _prog(id) {
    const p = this.em.getProgression(id);
    const req = this.em.getRequiredExp(p.level);
    return { lv: p.level, xpp: Math.min(100, Math.round((p.currentExp / req) * 100)) };
  }
  _stats(id) {
    const s = this.em.getCalculatedStats(id) || {};
    return { hp: s.maxHP ?? 0, pa: s.maxPA ?? 0, pm: s.maxPM ?? 0, initiative: s.initiative ?? 0, damage: s.bonusDamage ?? 0, shield: s.initialShield ?? 0 };
  }
  /** Cartas de partes del Axie (las del combate); null mientras se consultan o si no se pueden resolver (19-oct). */
  _partCardIds(id, base) {
    const resolver = typeof window !== 'undefined' ? window.lunakaiParts : null;
    if (!resolver || !base || !(base.modelType === 'axie' || base.axieId)) return null;
    const ids = resolver.idsFor(base);
    if (ids) return ids;
    this._partsTried = this._partsTried || {};
    const key = String(base.axieId || id);
    if (!this._partsTried[key]) {
      this._partsTried[key] = 'pending';
      resolver.resolve(base).catch(() => null).then((res) => {
        this._partsTried[key] = res?.ids ? 'done' : 'failed';
        if (res?.ids && this.isOpen) this._render();
      });
    }
    return null;
  }
  _parts(id) {
    const base = this._base(id);
    // Iconos de las partes reales del Axie, cada uno con el color de la clase de su parte (19-oct)
    const ids = this._partCardIds(id, base) || (id === 'kotaro' ? (base?.spellIds || getHeroSpells(base?.heroKey || base?.axieId)) : (HERO_SPELLS[id] || base?.spellIds)) || [];
    const cls = this._cls(id);
    const seen = new Set();
    return ids.map((sid) => SPELLS_DB[sid]).filter((sp) => sp && sp.part && !seen.has(sp.part) && seen.add(sp.part))
      .map((sp) => ({ part: sp.part, icon: sp.partIcon || `./assets/parts/${cls}-${sp.part}.png` }));
  }
  _med(id, size) {
    const base = this._base(id);
    const sapi = this._isSapi(id);
    const key = sapi ? (base?.modelType || 'sapidae-f-a') : (base?.axieId || id);
    // Hito 93: Axies con ID → su foto 3D (o la imagen del marketplace mientras se hace)
    let url = !sapi && base?.axieId ? portraitService.axieUrl(base, () => this._renderSoon())
      : portraitService.getPortraitSync(key) || (sapi ? `./assets/portraits/${key}.png` : base?.image || null);
    if (!url && !base?.axieId) portraitService.getPortrait(key).then((u) => { if (u && this.isOpen) this._render(); }).catch(() => {});
    return `<span class="lk-med" style="--cc:${this._cc(id)}${size ? `;--s:${size}px` : ''}">${url ? `<img src="${url}" alt="">` : ''}</span>`;
  }
  _idx(id) { return this.slots.indexOf(id); }
  /** Hito 93: lo que lleva puesto un Axie (se conserva aunque salga del escuadrón). */
  _gear(id) {
    const items = Object.values(this.em.equipped?.[id] || {}).filter(Boolean).length;
    let rune = 0, charms = 0;
    try { const rc = RuneCharmService.get(id); rune = rc.rune ? 1 : 0; charms = Object.values(rc.charms || {}).filter(Boolean).length; } catch { /* sin partida */ }
    return { items, rune, charms, total: items + rune + charms };
  }
  /** Hito 93: devuelve a la bolsa sus piezas, su runa y sus charms. */
  _returnGear(id) {
    const eq = this.em.equipped?.[id] || {};
    Object.keys(eq).forEach((slot) => { if (eq[slot]) this.em.unequipItem(id, slot); });
    try {
      RuneCharmService.setRune(id, null);
      Object.keys(RuneCharmService.get(id).charms || {}).forEach((part) => RuneCharmService.setCharm(id, part, null));
    } catch { /* sin partida */ }
    toast(i18n.t('squad.gearReturned', { name: this._base(id)?.name || '' }));
    this.audio?.playClick?.();
    this._render();
  }
  /** Volver a dibujar una sola vez aunque lleguen varios retratos seguidos. */
  _renderSoon() {
    if (this._soon) return;
    this._soon = setTimeout(() => { this._soon = null; if (this.isOpen) this._render(); }, 120);
  }

  // ------------------------------------------------------------ render
  _render() {
    const owned = this._owned();
    const n = this.slots.filter(Boolean).length;
    this.$('count').innerHTML = `<span class="lk-ico" style="background:var(--lk-gilt-300)"><img src="${I('team')}" alt="" style="width:15px;height:15px"></span>${n} / 4`;

    this.$('slots').innerHTML = this.slots.map((id, i) => {
      if (!id) {
        return `<div class="lk-sq-slot lk-is-empty ${this.pending ? 'lk-is-valid' : ''}" data-i="${i}"><span class="lk-lbl">${SLOT_LBL[i]}</span><span class="lk-ph-d"></span><b>${i18n.t('squad.free')}</b><span class="lk-meta">${owned.length > this.slots.filter(Boolean).length - 1 ? i18n.t('squad.dragHere') : i18n.t('squad.getMore')}</span></div>`;
      }
      const c = this._cls(id), t = this._stats(id), p = this._prog(id), sapi = c === 'sapidae';
      // Nivel AXP real de Sky Mavis si ya se conoce (lo trae la ficha o la carga del Axie); si no, no se muestra
      const smBase = sapi ? null : this._base(id);
      const axl = sapi || !smBase?.axieId ? null : (axieMixerService.axieCache.get(String(smBase.axieId))?.axpInfo || smBase.axpInfo)?.level ?? null;
      const bond = i === 1 ? BondDemo.get(id) : 0;
      return `<button type="button" class="lk-sq-slot ${this.sel === id ? 'lk-is-sel' : ''} ${i === 0 ? 'lk-is-lead' : ''} ${this.pending && i > 0 ? 'lk-is-valid' : ''}" data-i="${i}" data-id="${id}" style="--cc:${this._cc(id)}">
        <span class="lk-lbl">${i === 0 ? `<img src="${I('lock')}" alt="">` : ''}${SLOT_LBL[i]}</span>
        <span class="lk-pfw ${i === 1 ? 'lk-bond' : ''}" style="--b:${bond}">${this._med(id)}${sapi ? '' : `<span class="lk-cb">${clsIcon(c)}</span>`}</span>
        <b title="${esc(this._base(id).name)}" style="${NAME_CUT}">${esc(this._base(id).name)}</b><span class="lk-meta">${esc(this._clsName(id))} · ${i18n.t('squad.lv', { n: p.lv })}${axl ? ` · <span style="color:var(--lk-gilt-300)">AXP ${axl}</span>` : ''}</span>
        ${i === 1 ? `<span class="lk-bondtag"><img src="${I('heart')}" alt="">${i18n.t('squad.bondPct', { n: i18n.num(bond) })}</span>` : `<span class="lk-meta">${esc(this._role(id))}</span>`}
        <span class="lk-mini"><span>${i18n.t('squad.hp')}<b>${t.hp}</b></span><span>${i18n.t('squad.ap')}<b>${t.pa}</b></span><span>${i18n.t('squad.mp')}<b>${t.pm}</b></span><span>${i18n.t('squad.iniShort')}<b>${t.initiative}</b></span></span>
      </button>`;
    }).join('');

    const classes = ['all', ...new Set(owned.map((id) => this._cls(id)))];
    if (!classes.includes(this.cls)) this.cls = 'all';
    this.$('filter').innerHTML = classes.map((k) => `<button type="button" class="lk-fchip ${k === 'all' ? 'lk-no-ico' : ''}" data-k="${k}" aria-pressed="${this.cls === k}">${k === 'all' ? i18n.t('squad.all') : clsIcon(k) + (CLS_ES[k] || k)}</button>`).join('');
    const list = owned.filter((id) => this.cls === 'all' || this._cls(id) === this.cls).sort((a, b) => this._prog(b).lv - this._prog(a).lv);
    this.$('colCount').textContent = (owned.length === 1 ? i18n.t('squad.collectionOne', { n: owned.length }) : i18n.t('squad.collectionMany', { n: owned.length }));
    this.$('col').innerHTML = list.map((id) => {
      const j = this._idx(id), c = this._cls(id), g = j < 0 ? this._gear(id) : null;
      // Hito 93: fuera del escuadrón conserva su equipo; la etiqueta lo recuerda
      const gearTag = g?.total ? `<span class="lk-tag" title="${esc(i18n.t('squad.gearTitle', g))}" style="display:inline-flex;align-items:center;gap:3px"><img src="${I('inventory')}" alt="" style="width:11px;height:11px">${g.total}</span>` : '';
      return `<button type="button" class="lk-ax-card ${this.sel === id ? 'lk-is-sel' : ''} ${j >= 0 ? 'lk-in-squad' : ''}" data-id="${id}" style="--cc:${this._cc(id)}">${this._med(id)}<b title="${esc(this._base(id).name)}" style="${NAME_CUT}">${esc(this._base(id).name)}</b><small>${clsIcon(c)}${CLS_ES[c] || c} · ${i18n.t('squad.lv', { n: this._prog(id).lv })}</small>
        <span class="lk-parts">${this._parts(id).map((p) => `<img src="${p.icon}" alt="${PART_ES[p.part] || p.part}" title="${PART_ES[p.part] || p.part}">`).join('')}</span>${j >= 0 ? `<span class="lk-tag ${j === 1 ? 'lk-pr' : ''}">${j === 1 ? i18n.t('squad.slotMain') : i18n.t('squad.slotSupport')}</span>` : gearTag}</button>`;
    }).join('') || `<p class="lk-bag-empty"><b>${i18n.t('squad.emptyTitle')}</b>${i18n.t('squad.emptyText')}</p>`;
    this._renderDetail();
  }

  /**
   * Nivel y AXP del Axie en Sky Mavis (19-oct): solo informativo, el nivel de Lunakai es independiente.
   * Devuelve { info, state: 'ok' | 'loading' | 'none' }. La primera vez lo pide a Sky Mavis (vía axie-data).
   */
  _skyMavisAxp(base) {
    const id = base?.axieId ? String(base.axieId) : null;
    if (!id) return { info: null, state: 'none' };
    const cached = axieMixerService.axieCache.get(id);
    if (cached?.axpInfo) return { info: cached.axpInfo, state: 'ok' };
    this._axpTried = this._axpTried || {};
    if (!this._axpTried[id]) {
      this._axpTried[id] = 'loading';
      // La caché puede tener datos antiguos sin axpInfo: se piden de nuevo
      if (cached && !cached.axpInfo) axieMixerService.axieCache.delete(id);
      axieMixerService.fetchAxieData(id).then((d) => { this._axpTried[id] = d?.axpInfo ? 'ok' : 'none'; })
        .catch(() => { this._axpTried[id] = 'none'; })
        .finally(() => { if (this.isOpen) this._renderDetail(); });
    }
    if (this._axpTried[id] === 'loading') return { info: base.axpInfo || null, state: base.axpInfo ? 'ok' : 'loading' };
    return { info: base.axpInfo || null, state: base.axpInfo ? 'ok' : 'none' };
  }

  _renderDetail() {
    const id = this.sel || 'sapidae';
    const base = this._base(id);
    if (!base) { this.$('detail').innerHTML = ''; return; }
    const j = this._idx(id), isAx = !this._isSapi(id), c = this._cls(id), t = this._stats(id), p = this._prog(id);
    const btn = (k, cls, icon, txt) => `<button type="button" class="lk-btn ${cls} lk-btn--sm" data-act="${k}"><span class="lk-b-ico">${icon}</span>${txt}</button>`;
    let acts = '';
    if (!isAx) acts = `<span class="lk-note">${i18n.t('squad.noteLeader')}</span>`;
    else if (j < 0) acts = this.slots.includes(null) ? btn('add', 'lk-btn-primary-gold', sprite('i-plus'), i18n.t('squad.addToSquad')) : btn('swap', 'lk-btn-primary-gold', sprite('i-rotate'), this.pending === id ? i18n.t('squad.pickSlot') : i18n.t('squad.replace'));
    else if (j === 1) acts = `<span class="lk-note">${i18n.t('squad.noteMain')}</span>`;
    else acts = (canBeMainAxie(id) ? btn('lead', 'lk-btn-moon', `<img class="lk-ai lk-heart-ico" src="${I('heart')}" alt="">`, i18n.t('squad.makeMain')) : `<span class="lk-note">${i18n.t('squad.noteSupportOnly')}</span>`) + btn('out', 'lk-btn-secondary-wood', sprite('i-close'), i18n.t('squad.retire'));
    if (j >= 0 && this.onOpenInventory) acts += btn('gear', 'lk-btn-secondary-wood', `<img class="lk-ai" src="${I('inventory')}" alt="">`, i18n.t('squad.equipInBackpack'));
    const gear = isAx ? this._gear(id) : null;
    if (gear?.total) acts += btn('strip', 'lk-btn-secondary-wood', `<img class="lk-ai" src="${I('inventory')}" alt="">`, i18n.t('squad.returnGear')).replace('data-act="strip"', `data-act="strip" title="${esc(i18n.t('squad.returnGearTitle'))}"`);

    let axBlock = '';
    if (isAx) {
      const bond = BondDemo.get(id);
      const nf = (n) => i18n.num(n || 0);
      const sm = this._skyMavisAxp(base);
      let axpRows;
      if (sm.state === 'ok' && sm.info) {
        // Datos reales de Sky Mavis, tal como llegan (sin barra: Sky Mavis no documenta cómo se cuenta xpToLevelUp)
        const a = sm.info, axl = Number(a.level) || 0;
        axpRows = `<div class="lk-prow lk-axp" title="${i18n.t('squad.axpSmTitle')}"><span class="lk-chip">AXP</span><span class="lk-lv">${i18n.t('squad.lv', { n: axl })}</span><span class="lk-gain" style="margin-left:auto">${nf(a.xp)} AXP</span></div>`
          + `<div class="lk-asc-note"><span>Sky Mavis</span>${a.xpToLevelUp != null ? `<span>${i18n.t('squad.toLevelUp', { n: nf(a.xpToLevelUp) })}</span>` : ''}${a.onchainLevel != null && Number(a.onchainLevel) !== axl ? `<span>${i18n.t('squad.onchainLevel', { n: a.onchainLevel })}</span>` : ''}${a.shouldAscend ? `<span><b>${i18n.t('squad.readyAscend')}</b></span>` : ''}</div>`;
      } else if (sm.state === 'loading') {
        axpRows = `<div class="lk-prow lk-axp"><span class="lk-chip">AXP</span><span class="lk-gain" style="margin-left:auto">${i18n.t('squad.smLoading')}</span></div>`;
      } else if (base.axieId) {
        axpRows = `<div class="lk-prow lk-axp" title="${i18n.t('squad.smNoDataTitle')}"><span class="lk-chip">AXP</span><span class="lk-gain" style="margin-left:auto">${i18n.t('squad.smNoData')}</span></div>`;
      } else {
        axpRows = ''; // Bing y Pomodoro no son Axies de Sky Mavis: no tienen AXP
      }
      axBlock = `<div class="lk-bondrow"><span>${i18n.t('squad.bond')} <span class="lk-demo-tag" title="${i18n.t('squad.demoBondTitle')}">${i18n.t('squad.demo')}</span></span><div class="lk-bondbar" style="--b:${bond}%"><i></i></div><b>${bond}%</b></div>`
        + `<div class="lk-prow lk-xp"><span class="lk-chip">XP</span><span class="lk-lv">${i18n.t('squad.lv', { n: p.lv })}</span><span class="lk-ds-bar"><i class="lk-base" style="--a:${p.xpp}%"></i></span><span class="lk-gain">${p.xpp}%</span></div>`
        + axpRows;
    } else {
      axBlock = `<div class="lk-prow lk-xp"><span class="lk-chip">XP</span><span class="lk-lv">${i18n.t('squad.lv', { n: p.lv })}</span><span class="lk-ds-bar"><i class="lk-base" style="--a:${p.xpp}%"></i></span><span class="lk-gain">${p.xpp}%</span></div>`;
    }
    const STAT_ES = [['hp', i18n.t('squad.hp')], ['damage', i18n.t('squad.damage')], ['pa', i18n.t('squad.ap')], ['pm', i18n.t('squad.mp')], ['initiative', i18n.t('squad.initiative')], ['shield', i18n.t('squad.shield')]];
    const parts = isAx ? this._parts(id) : [];
    this.$('detail').innerHTML = `<div class="lk-sqd-top" style="--cc:${this._cc(id)}"><span class="lk-pfw ${j === 1 ? 'lk-bond' : ''}" style="--b:${j === 1 ? BondDemo.get(id) : 0}">${this._med(id, 96)}</span>
        <small>${j >= 0 ? SLOT_LBL[j] + i18n.t('squad.inSquadSuffix') : i18n.t('squad.inCollection')}</small><h4>${esc(base.name)}${base.axieId ? ` <span class="lk-no">#${esc(base.axieId)}</span>` : ''}</h4>
        <span class="lk-meta">${isAx ? clsIcon(c) : ''}${esc(this._clsName(id))} · ${i18n.t('squad.lv', { n: p.lv })} · ${esc(this._role(id))}</span></div>
      <div class="lk-sqd-paper">
        ${axBlock}
        <div class="lk-stl">${STAT_ES.map(([k, l]) => `<span>${l}<b>${t[k]}</b></span>`).join('')}</div>
        ${isAx ? (parts.length ? `<div class="lk-pgrid">${parts.map((pt) => `<span><img src="${pt.icon}" alt="">${PART_ES[pt.part] || pt.part}</span>`).join('')}</div>` : '') + (gear?.total ? `<span class="lk-pp" style="color:var(--lk-gilt-200)">${esc(i18n.t('squad.gearLine', gear))}</span>` : '') + `<span class="lk-pp">${i18n.t('squad.runeCharmsHint')}</span>`
          : `<p>${i18n.t('squad.sapidaeDesc')}</p>`}
        <div class="lk-actions">${acts}</div>
      </div>`;
    this.$('detail').querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.act;
      if (k === 'add') this._place(id, this.slots.indexOf(null));
      else if (k === 'swap') { this.pending = this.pending === id ? null : id; this._render(); if (this.pending) toast(i18n.t('squad.pickWhoToReplace', { name: base.name })); }
      else if (k === 'lead') this._place(id, 1);
      else if (k === 'out') this._retire(j);
      else if (k === 'gear') { this.close(); this.onOpenInventory?.(id); }
      else if (k === 'strip') this._returnGear(id);
    }));
  }

  // ------------------------------------------------------------ Axies de la cuenta (Hito 75)
  /** Trae los demás Axies de la cuenta de Sky Mavis a la colección. Avisa a onAccountLoad({ ok, result | code }). */
  async loadAccountAxies() {
    if (this._loadingAx) return;
    const msg = this.$('loadMsg'), btn = this.$('loadAx'), txt = this.$('loadTxt');
    if (!canLoadAccountAxies()) {
      msg.textContent = i18n.t('squad.loadNeedLogin');
      toast(i18n.t('squad.loadNeedLoginShort'), true);
      this.onAccountLoad?.({ ok: false, code: 'no_session' });
      return;
    }
    this._loadingAx = true;
    btn.disabled = true;
    msg.textContent = '';
    txt.textContent = i18n.t('squad.loadingAxies');
    try {
      const result = await loadAccountAxies(this.em, { onProgress: (d, n) => { txt.textContent = i18n.t('squad.loadingAxiesN', { done: d, total: n }); } });
      this.slots = this.em.getSquad();
      msg.textContent = result.total
        ? i18n.t(result.total === 1 ? 'squad.loadedOne' : 'squad.loadedMany', { n: result.total }) + (result.removed.length ? ` · ${i18n.t('squad.loadRemoved', { n: result.removed.length })}` : '')
        : i18n.t('squad.loadedNone');
      if (result.added.length) toast(i18n.t('squad.loadedToast', { n: result.added.length }));
      this.onChange?.(this.slots.slice());
      this.onAccountLoad?.({ ok: true, result });
    } catch (err) {
      console.warn('[SquadModal] No se pudieron cargar los Axies de la cuenta:', err?.code || err);
      msg.textContent = err?.code === 'session_expired' ? i18n.t('squad.loadExpired') : i18n.t('squad.loadFail');
      this.onAccountLoad?.({ ok: false, code: err?.code || 'error' });
    } finally {
      this._loadingAx = false;
      btn.disabled = false;
      txt.textContent = i18n.t('squad.loadAxies');
      if (this.isOpen) this._render();
    }
  }

  /** Añade a la colección el Axie con ese ID (también como invitado). */
  async loadById(raw) {
    if (this._loadingId) return;
    const msg = this.$('loadMsg'), go = this.$('byIdGo'), txt = this.$('byIdGoTxt');
    this._loadingId = true; go.disabled = true; txt.textContent = i18n.t('squad.byIdSearching');
    try {
      const r = await loadAxieById(this.em, raw);
      if (r.ok) {
        msg.textContent = i18n.t('squad.byIdAdded', { name: r.name });
        toast(i18n.t('squad.byIdAdded', { name: r.name }));
        this.sel = r.heroId; this.cls = 'all';
        this.$('byIdInput').value = '';
        this.slots = this.em.getSquad();
        this.onChange?.(this.slots.slice());
      } else {
        msg.textContent = i18n.t(`squad.byIdErr.${r.code}`, { name: r.name || '', id: r.id || '' });
      }
    } finally {
      this._loadingId = false; go.disabled = false; txt.textContent = i18n.t('squad.byIdAdd');
      if (this.isOpen) this._render();
    }
  }

  // ------------------------------------------------------------ cambios
  _commit(flashI) {
    this.pending = null;
    this.slots = this.em.setSquad(this.slots);
    this._render();
    if (flashI != null) this.$('slots').querySelector(`.lk-sq-slot[data-i="${flashI}"]`)?.classList.add('lk-just-placed');
    if (this.audio?.playBuff) this.audio.playBuff();
    this.onChange?.(this.slots.slice());
  }

  _place(id, i) {
    if (i <= 0) { toast(i18n.t('squad.leaderNoReplace'), true); return; }
    const j = this._idx(id), prev = this.slots[i];
    if (j === i) return;
    // Bing y Pomodoro son solo de apoyo: ni ellos pueden ir a principal ni pueden quedar ahí tras un intercambio
    const newMain = i === 1 ? id : (j === 1 ? prev : this.slots[1]);
    if (!canBeMainAxie(newMain)) {
      const who = this._base(newMain)?.name || i18n.t('squad.thisAxie');
      toast(newMain === id || newMain === prev ? i18n.t('squad.supportOnlyToast', { name: who }) : i18n.t('squad.mainCantBeEmpty'), true);
      return;
    }
    if (j >= 0) this.slots[j] = prev;
    this.slots[i] = id;
    this.sel = id;
    const name = this._base(id).name;
    const msg = i === 1 ? i18n.t('squad.nowMain', { name }) : j >= 0 ? i18n.t('squad.movesSlot', { name }) : i18n.t('squad.joins', { name });
    toast(prev && j < 0 ? `${msg} · ${i18n.t('squad.backToCollection', { name: this._base(prev).name })}` : msg);
    this._commit(i);
  }

  _retire(i) {
    if (i === 1) { toast(i18n.t('squad.mainCantBeEmptyDrag'), true); return; }
    if (i < 1) { toast(i18n.t('squad.leaderNoRetire'), true); return; }
    const id = this.slots[i];
    this.slots[i] = null;
    toast(i18n.t('squad.backToCollection', { name: this._base(id).name }));
    this._commit();
  }

  _drag(e, src, id, fromI) {
    const sx = e.clientX, sy = e.clientY;
    let ghost = null, over = null;
    const slotsEl = this.$('slots'), col = this.$('col');
    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        ghost = document.createElement('div');
        ghost.className = 'lk-ui lk-sq-ghost';
        ghost.innerHTML = this._med(id) + esc(this._base(id).name);
        document.body.appendChild(ghost);
        document.body.classList.add('lk-is-dragging');
        src.classList.add('lk-is-dragging');
        slotsEl.querySelectorAll('.lk-sq-slot').forEach((s) => { const i = +s.dataset.i; if (i !== fromI) s.classList.add(i > 0 ? 'lk-is-valid' : 'lk-is-invalid'); });
        if (fromI >= 1) col.classList.add('lk-is-drop');
      }
      ghost.style.left = `${ev.clientX}px`;
      ghost.style.top = `${ev.clientY}px`;
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      over = t && (t.closest('#squad-modal .lk-sq-slot') || t.closest('#squad-modal [data-ref="col"]'));
      slotsEl.querySelectorAll('.lk-sq-slot').forEach((s) => s.classList.toggle('lk-is-hover', s === over && +s.dataset.i > 0 && +s.dataset.i !== fromI));
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (!ghost) return;
      ghost.remove();
      document.body.classList.remove('lk-is-dragging');
      src.classList.remove('lk-is-dragging');
      col.classList.remove('lk-is-drop');
      slotsEl.querySelectorAll('.lk-sq-slot').forEach((s) => s.classList.remove('lk-is-valid', 'lk-is-invalid', 'lk-is-hover'));
      this.justDropped = true;
      setTimeout(() => { this.justDropped = false; }, 0);
      if (over && over.classList.contains('lk-sq-slot')) { const i = +over.dataset.i; if (i !== fromI) this._place(id, i); }
      else if (over && over.dataset.ref === 'col' && fromI >= 1) this._retire(fromI);
      else if (this.pending) this._render();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  _sfx() { if (this.audio?.playStep) this.audio.playStep(); }
}
