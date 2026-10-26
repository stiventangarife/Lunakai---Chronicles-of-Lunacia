// CombatEndScreen.js — Victoria y derrota (Crónica Celeste, etapa 3)
// Pantalla 14 del sistema de diseño ("Victoria y derrota") con las clases lk- de src/ui/ds.generated.css.
// Se pinta dentro de #gameover-modal (index.html). Los botones del pie conservan sus ids
// (btn-return-overworld, btn-restart…) para que main.js los siga controlando igual que antes.
import { asset, tooltip } from '../../ui/lk.js';
import { BondService, formatBond } from '../BondService.js';
import { axieMixerService } from '../AxieMixerService.js';
import { matSvg } from '../../ui/MaterialIcons.js';
import * as i18n from '../../i18n/i18n.js';

const I = (name) => asset(`assets/ui/icons/${name}.png`);
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3a9 9 0 1 0 6 15.7A7.5 7.5 0 1 1 15 3z" fill="currentColor"/></svg>';
const BROKEN_MOON = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M40 6a26 26 0 1 0 17 45.4A21.5 21.5 0 1 1 40 6z" fill="currentColor" opacity=".9"/><path d="M27 12l6 13-7 6 8 10-5 13" fill="none" stroke="#0B0F1C" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLASSES = ['beast', 'plant', 'aquatic', 'bird', 'reptile', 'bug', 'mech', 'dawn', 'dusk'];
const RARITY = { common: ['common', i18n.t('combatEnd.rarCommon')], uncommon: ['uncommon', i18n.t('combatEnd.rarUncommon')], rare: ['rare', i18n.t('combatEnd.rarRare')], epic: ['epic', i18n.t('combatEnd.rarEpic')], legendary: ['mystic', i18n.t('combatEnd.rarMystic')], mystic: ['mystic', i18n.t('combatEnd.rarMystic')] };
const SLOT = { weapon: i18n.t('combatEnd.slotWeapon'), hat: i18n.t('combatEnd.slotHat'), shield: i18n.t('combatEnd.slotShield'), body: i18n.t('combatEnd.slotBody'), boots: i18n.t('combatEnd.slotBoots'), consumable: i18n.t('combatEnd.slotConsumable'), material: i18n.t('combatEnd.slotMaterial'), quest: i18n.t('combatEnd.slotQuest') };
const isImg = (s) => typeof s === 'string' && (/^(\.\/|\/|assets\/|http|data:image)/.test(s) || /\.(png|jpe?g|webp|svg)$/i.test(s));
/** Dibujo de un objeto del botín: imagen, material (SVG) o emoji. */
const lootArt = (it, size) => it.glyph && !it.icon ? `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;color:var(--lk-gilt-300, #EED39A)">${matSvg(it.glyph, '')}</span>`
  : isImg(it.icon) ? `<img src="${esc(it.icon)}" alt="" style="width:${size}px;height:${size}px;object-fit:contain">`
  : `<span style="font-size:${Math.round(size * 0.7)}px;line-height:1">${esc(it.icon || '✦')}</span>`;
const STAT = [['damage', i18n.t('combatEnd.statDamage')], ['hp', i18n.t('combatEnd.statHp')], ['shield', i18n.t('combatEnd.statShield')], ['pa', i18n.t('combatEnd.statAp')], ['pm', i18n.t('combatEnd.statMp')], ['initiative', i18n.t('combatEnd.statInitiative')]];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0);
const num = (n) => i18n.num(n || 0);

// ------------------------------------------------------------------------------------------
// AXP DE DEMOSTRACIÓN (ficticia: no se envía a Sky Mavis). Se guarda en este navegador entre combates.
// (19-oct) Empieza en el nivel REAL del Axie en Sky Mavis (axpInfo.level) cuando se conoce; si su nivel real
// cambia, se vuelve a partir de él. Topes:
//   · nivel máximo 60: ya no gana más AXP;
//   · tope de evolución: para pasar de 9→10, 19→20… hay que ascender (en Axie Infinity); con la barra llena,
//     o si Sky Mavis dice que debe ascender (shouldAscend), no gana más AXP hasta ascender.
// Tope diario por axie y el apoyo gana la mitad. El Sapidae no tiene AXP. Las derrotas no dan AXP.
// ------------------------------------------------------------------------------------------
const AXP_KEY = 'lunakai_demo_axp';
const AXP_DAILY_CAP = 4500;
const AXP_PER_XP = 2.75;          // el axie principal gana 2,75 AXP por cada punto de XP del combate
const axpRequired = (lv) => 600 + lv * 180;
const today = () => new Date().toISOString().slice(0, 10);
const hash = (str) => [...String(str)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const AXP_MAX_LEVEL = 60;
const isGate = (next) => next % 10 === 0; // 9→10, 19→20… exigen ascender

/** Nivel/AXP real de Sky Mavis de un héroe del escuadrón (null si no es un Axie con ID o aún no se conoce). */
function realAxpFor(heroId) {
  const base = window.__AXIE_TACTICS_APP__?.equipmentManager?.heroesBase?.[heroId];
  if (!base?.axieId) return null;
  const info = axieMixerService.axieCache.get(String(base.axieId))?.axpInfo || base.axpInfo || null;
  return info && Number.isFinite(Number(info.level)) ? info : null;
}

export const AxpDemo = {
  _load() { try { return JSON.parse(localStorage.getItem(AXP_KEY) || '{}'); } catch { return {}; } },
  _save(all) { try { localStorage.setItem(AXP_KEY, JSON.stringify(all)); } catch { /* sin almacenamiento */ } },
  get(id, real = null) {
    const all = this._load();
    let a = all[id];
    const realLevel = real ? Math.max(1, Math.min(AXP_MAX_LEVEL, Math.round(Number(real.level)))) : null;
    if (realLevel != null && (!a || a.realLevel !== realLevel)) {
      // Parte del nivel real de Sky Mavis (y vuelve a partir de él si cambia allí)
      a = { level: realLevel, axp: 0, ascended: [], realLevel, day: a?.day || today(), todayAxp: a?.todayAxp || 0 };
    } else if (!a) { // sin datos de Sky Mavis: estado inicial creíble y estable para cada axie
      const h = hash(id);
      const level = 4 + (h % 5);
      a = { level, axp: Math.floor(axpRequired(level) * (0.2 + ((h >> 3) % 60) / 100)), ascended: [], day: today(), todayAxp: 0 };
    }
    if (realLevel != null) a.mustAscend = Boolean(real.shouldAscend) && a.level === realLevel;
    if (a.mustAscend) a.axp = axpRequired(a.level); // en su tope de evolución: barra llena
    if (a.level >= AXP_MAX_LEVEL) { a.level = AXP_MAX_LEVEL; a.axp = axpRequired(AXP_MAX_LEVEL); }
    if (a.day !== today()) { a.day = today(); a.todayAxp = 0; }
    return a;
  },
  /** Motivo por el que el axie no puede ganar AXP ahora: 'max' (nivel 60), 'ascend' (tope de evolución) o null. */
  _capReason(a) {
    if (a.level >= AXP_MAX_LEVEL) return 'max';
    if (a.mustAscend) return 'ascend';
    const next = a.level + 1;
    if (isGate(next) && !a.ascended.includes(next) && a.axp >= axpRequired(a.level)) return 'ascend';
    return null;
  },
  /** Suma AXP al axie y devuelve lo necesario para pintar la fila. */
  award(id, amount, real = null) {
    const all = this._load();
    const a = this.get(id, real);
    const before = { level: a.level, pct: pct(a.axp, axpRequired(a.level)) };
    const room = Math.max(0, AXP_DAILY_CAP - a.todayAxp);
    // En un tope (nivel 60 o pendiente de ascender) no gana nada
    let gain = this._capReason(a) ? 0 : Math.max(0, Math.min(Math.round(amount), room));
    let left = gain, levelsGained = 0;
    while (left > 0) {
      const req = axpRequired(a.level);
      const need = req - a.axp;
      const next = a.level + 1;
      const gated = (isGate(next) && !a.ascended.includes(next)) || next > AXP_MAX_LEVEL;
      if (left < need) { a.axp += left; left = 0; break; }
      if (gated) { gain -= (left - need); a.axp = req; left = 0; break; } // se llena la barra y se detiene
      left -= need; a.level = next; a.axp = 0; levelsGained++;
      if (a.level >= AXP_MAX_LEVEL) { gain -= left; a.axp = axpRequired(AXP_MAX_LEVEL); left = 0; break; }
    }
    const capReason = this._capReason(a);
    a.todayAxp += gain;
    all[id] = a; this._save(all);
    return { level: a.level, gain, levelsGained, basePct: levelsGained > 0 ? 0 : before.pct, afterPct: pct(a.axp, axpRequired(a.level)), today: a.todayAxp, cap: AXP_DAILY_CAP, capReason, ascendReady: capReason === 'ascend', nextGate: Math.ceil((a.level + 1) / 10) * 10, fromSkyMavis: a.realLevel != null };
  },
  peek(id, real = null) {
    const a = this.get(id, real);
    const p = pct(a.axp, axpRequired(a.level));
    const capReason = this._capReason(a);
    return { level: a.level, gain: 0, levelsGained: 0, basePct: p, afterPct: p, today: a.todayAxp, cap: AXP_DAILY_CAP, capReason, ascendReady: capReason === 'ascend', nextGate: Math.ceil((a.level + 1) / 10) * 10, fromSkyMavis: a.realLevel != null };
  },
  reset() { try { localStorage.removeItem(AXP_KEY); } catch { /* nada */ } }
};

// VÍNCULO con el axie principal. Toda derrota del escuadrón resta 8 %; la victoria no lo cambia
// (se cuida en el campamento). El valor real vive en BondService (ranura de guardado); BondDemo se
// conserva como fachada para SquadHUD, SquadModal y esta pantalla.
const BOND_LOSS = 8;
export const BondDemo = {
  get(id) { return BondService.get(id); },
  set(id, v) { return BondService.set(id, v); },
  lose(id, amount = BOND_LOSS) { return BondService.lose(id, amount); },
  reset() { /* el vínculo ya no es de demostración: vive en la ranura de guardado */ }
};

export class CombatEndScreen {
  /**
   * @param {object} opts
   * @param {(key:string)=>Promise<string|null>} [opts.resolvePortrait] carga asíncrona de retratos 3D
   */
  constructor({ resolvePortrait = null } = {}) {
    this.resolvePortrait = resolvePortrait;
    this.root = document.getElementById('gameover-modal');
    this.panel = this.root?.querySelector('.lk-end');
    this.crest = this.root?.querySelector('[data-ref="crest"]');
    this.body = this.root?.querySelector('[data-ref="body"]');
    this.hint = this.root?.querySelector('[data-ref="hint"]');
    this.primary = document.getElementById('btn-return-overworld');
    this.primaryLabel = this.root?.querySelector('[data-ref="primaryLabel"]');
    this.primaryIcon = this.root?.querySelector('[data-ref="primaryIcon"]');

    // Espacio / Enter = botón principal mientras la pantalla está abierta
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (e.target?.closest && e.target.closest('button') && e.code === 'Enter') return; // Enter sobre un botón: lo hace el botón
      e.preventDefault();
      e.stopImmediatePropagation();
      this.primary?.click();
    }, true);
  }

  get isOpen() { return Boolean(this.root && !this.root.classList.contains('hidden')); }

  // ------------------------------------------------------------ piezas
  _portrait(p, size) {
    const cc = p.cls && CLASSES.includes(p.cls) ? `var(--lk-class-${p.cls})` : (p.isSapidae ? 'var(--lk-lumen-500)' : 'var(--lk-gilt-300)');
    const id = `lk-end-pt-${Math.random().toString(36).slice(2, 8)}`;
    if (!p.portraitUrl && p.portraitKey && this.resolvePortrait) {
      this.resolvePortrait(p.portraitKey).then((url) => {
        const el = document.getElementById(id);
        if (url && el) el.innerHTML = `<img src="${url}" alt="">`;
      }).catch(() => {});
    }
    return `<span class="lk-med" id="${id}" style="--cc:${cc}${size ? `;--s:${size}px` : ''}">${p.portraitUrl ? `<img src="${p.portraitUrl}" alt="">` : ''}</span>`;
  }

  _bar(u, zero = false) {
    const add = zero ? 0 : Math.max(0, u.afterPct - u.basePct);
    return `<span class="lk-ds-bar"><i class="lk-base" style="--a:${u.basePct}%"></i>${zero ? '' : `<i class="lk-add" style="--a:${u.basePct}%;--d:${add}%"></i>`}</span>`;
  }

  _axpRow(u, zero, compact = false) {
    const x = u.axp;
    if (!x) return '';
    const isZero = zero || x.gain === 0;
    const bar = this._bar({ basePct: x.basePct, afterPct: x.afterPct }, isZero);
    if (compact) return `<div class="lk-prow lk-axp ${isZero ? 'lk-is-zero' : ''}"><span class="lk-chip">AXP</span>${bar}<span class="lk-gain">+${num(x.gain)}</span></div>`;
    return `<div class="lk-prow lk-axp ${isZero ? 'lk-is-zero' : ''}"><span class="lk-chip">AXP</span><span class="lk-lv">${i18n.t('combatEnd.lv', { n: x.level })}</span>${bar}<span class="lk-gain">+${num(x.gain)}</span></div>`;
  }

  _axpMeta(u, zero) {
    const x = u.axp;
    if (!x) return '';
    const demoTitle = x.fromSkyMavis ? i18n.t('combatEnd.demoAxpReal') : i18n.t('combatEnd.demoAxpNoData');
    const demo = `<span class="lk-demo-tag" title="${demoTitle}">${i18n.t('combatEnd.demo')}</span>`;
    if (zero) return `<div class="lk-axp-meta">${demo}</div>`;
    const diamond = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0l6 6-6 6-6-6z" fill="currentColor"/></svg>';
    const top = x.capReason === 'max' ? `<span class="lk-asc-ready">${diamond}${i18n.t('combatEnd.maxLevel', { n: AXP_MAX_LEVEL })}</span>`
      : x.capReason === 'ascend' ? `<span class="lk-asc-ready">${diamond}${i18n.t('combatEnd.ascendCap', { n: x.nextGate })}</span>` : '';
    const capped = x.today >= x.cap ? i18n.t('combatEnd.dailyCapReached') : '';
    return `<div class="lk-axp-meta"><span>${i18n.t('combatEnd.axpToday', { today: num(x.today), cap: num(x.cap) })}${capped}</span>${top}${demo}</div>`;
  }

  _mainRow(u, zero) {
    const lvlUp = !zero && u.levelsGained > 0 ? `<span class="lk-lvl-up">${i18n.t('combatEnd.levelUp', { n: u.level })}</span>` : '';
    const axpUp = !zero && u.axp && u.axp.levelsGained > 0 ? `<span class="lk-lvl-up">${i18n.t('combatEnd.axpLevel', { n: u.axp.level })}</span>` : '';
    const points = !zero && u.levelsGained > 0
      ? `<div class="lk-axp-meta"><span>${i18n.t('combatEnd.statPoints', { n: u.levelsGained * 3 })}</span></div>` : '';
    const sub = u.isSapidae && !zero ? `${u.sub}${i18n.t('combatEnd.xpOnly')}` : u.sub;
    return `<div class="lk-u-prog">${this._portrait(u)}<div class="lk-rows">
      <div class="lk-u-name"><b>${esc(u.name)}</b><small>${esc(sub)}</small>${lvlUp}${axpUp}</div>
      <div class="lk-prow lk-xp ${zero ? 'lk-is-zero' : ''}"><span class="lk-chip">XP</span><span class="lk-lv">${i18n.t('combatEnd.lv', { n: u.level })}</span>${this._bar(u, zero)}<span class="lk-gain">+${zero ? 0 : num(u.gain)}</span></div>
      ${this._axpRow(u, zero)}${this._axpMeta(u, zero)}${points}</div></div>`;
  }

  _supRow(u, zero) {
    const up = !zero && u.levelsGained > 0 ? `<small class="lk-sup-up">${i18n.t('combatEnd.lvUpShort', { n: u.level })}</small>` : '';
    return `<div class="lk-sup ${u.axp ? '' : 'lk-xp-only'}">${this._portrait(u)}<b><span style="overflow:hidden;text-overflow:ellipsis">${esc(u.name)}</span>${up}</b><div class="lk-prow lk-xp ${zero ? 'lk-is-zero' : ''}"><span class="lk-chip">XP</span>${this._bar(u, zero)}<span class="lk-gain">+${zero ? 0 : num(u.gain)}</span></div>${this._axpRow(u, zero, true)}</div>`;
  }

  /** Añade la AXP de demostración a cada axie (no al Sapidae). */
  _withAxp(squad, victory) {
    const main = squad.find((u) => u.isMain && !u.isSapidae);
    const mainGain = main ? main.gain * AXP_PER_XP : 0;
    return squad.map((u) => {
      if (u.isSapidae) return u;
      const id = u.id || u.name;
      const real = realAxpFor(u.id); // nivel real de Sky Mavis (si se conoce): la barra parte de él
      const axp = victory ? AxpDemo.award(id, u.isMain ? mainGain : mainGain * 0.5, real) : AxpDemo.peek(id, real);
      return { ...u, axp };
    });
  }

  _squad(squad, zero = false) {
    const main = squad.filter((u) => u.isMain || u.isSapidae);
    const sup = squad.filter((u) => !(u.isMain || u.isSapidae));
    return main.map((u) => this._mainRow(u, zero)).join('')
      + (sup.length ? `<div class="lk-sup-prog"><span class="lk-label">${zero ? i18n.t('combatEnd.support') : i18n.t('combatEnd.supportLess')}</span>${sup.map((u) => this._supRow(u, zero)).join('')}</div>` : '');
  }

  _loot(items, lost = false) {
    if (!items.length) return `<p class="lk-end-empty">${lost ? i18n.t('combatEnd.noLootLost') : i18n.t('combatEnd.noLoot')}</p>`;
    return `<div class="lk-loot ${lost ? 'lk-is-lost' : ''}">${items.map((it, n) => {
      const [r, rName] = RARITY[it.rarity] || RARITY.common;
      return `<div class="lk-charm-item" data-n="${n}" tabindex="0"><span class="lk-slot-item" style="--r:var(--lk-rar-${r})"><span class="lk-art">${lootArt(it, 44)}</span><span class="lk-cap">${it.qty > 1 ? `×${it.qty}` : rName}</span></span><small>${esc(it.name)}</small></div>`;
    }).join('')}</div>`;
  }

  _itemTip(it) {
    const [r, rName] = RARITY[it.rarity] || RARITY.common;
    const stats = STAT.filter(([k]) => it.stats && it.stats[k]).map(([k, label]) => `<span class="lk-tt-stat">${label}<b>+${it.stats[k]}</b></span>`).join('');
    return `<div class="lk-tooltip-tactical" style="--c:var(--lk-rar-${r})"><header><span class="lk-sigil">${lootArt(it, 22)}</span><div><small>${SLOT[it.slot] || esc(it.slot)} · ${rName}</small><b>${esc(it.name)}</b></div></header>`
      + `<div class="lk-tt-body">${stats ? `<div class="lk-tt-stats">${stats}</div>` : ''}${it.description ? `<p>${esc(it.description)}</p>` : ''}</div></div>`;
  }

  _bindLootTips(items) {
    this.body.querySelectorAll('.lk-charm-item[data-n]').forEach((el) => {
      const it = items[+el.dataset.n];
      if (it) tooltip.attach(el, () => this._itemTip(it));
    });
  }

  _open(defeat) {
    this.root.classList.toggle('lk-is-defeat', defeat);
    this.panel.classList.toggle('lk-end-victory', !defeat);
    this.panel.classList.toggle('lk-end-defeat', defeat);
    this.panel.scrollTop = 0;
    this.root.classList.remove('hidden');
    this.root.setAttribute('aria-hidden', 'false');
    void this.root.offsetWidth;
    this.root.classList.add('lk-is-open');
    this.panel.classList.remove('lk-is-play');
    void this.panel.offsetWidth;
    requestAnimationFrame(() => this.panel.classList.add('lk-is-play'));
    setTimeout(() => this.primary?.focus({ preventScroll: true }), 300);
  }

  _setPrimary(label, icon) {
    if (this.primaryLabel) this.primaryLabel.textContent = label;
    if (this.primaryIcon) this.primaryIcon.src = I(icon);
  }

  // ------------------------------------------------------------ victoria
  /**
   * @param {object} d
   * d.subtitle, d.moons [{label,on}], d.squad [{name,sub,level,gain,basePct,afterPct,levelsGained,isMain,isSapidae,cls,portraitUrl,portraitKey}],
   * d.recruits [{name,sub,cls,portraitUrl,portraitKey}], d.loot [item], d.summary [[label,value]]
   */
  showVictory(d) {
    if (!this.root) return;
    tooltip.hide();
    this.crest.innerHTML = `
      <span class="lk-end__rays" aria-hidden="true"></span>
      <span class="lk-end__emblem">${MOON}</span>
      <div class="lk-end__title" id="lk-end-title">${i18n.t('combatEnd.victory')}</div>
      <div class="lk-end__line"><i></i></div>
      <div class="lk-end__sub">${esc(d.subtitle)}</div>
      <div class="lk-moons">${(d.moons || []).map((m) => `<div class="lk-moon-r ${m.on ? 'lk-on' : ''}">${MOON}<small>${esc(m.label)}</small></div>`).join('')}</div>`;

    const recruits = (d.recruits || []).length
      ? `<span class="lk-label">${i18n.t('combatEnd.recruitsJoin')}</span>${d.recruits.map((r) => `<div class="lk-u-prog">${this._portrait(r)}<div class="lk-rows"><div class="lk-u-name"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small><span class="lk-lvl-up">${i18n.t('combatEnd.new')}</span></div></div></div>`).join('')}` : '';

    this.body.innerHTML = `
      <div class="lk-end__col"><span class="lk-label">${i18n.t('combatEnd.squad')}</span>${this._squad(this._withAxp(d.squad || [], true))}
        <div class="lk-bond-note"><img src="${I('heart')}" alt="">${i18n.t('combatEnd.bondVictoryNote')}</div></div>
      <div class="lk-end__col">${recruits}
        <span class="lk-label">${i18n.t('combatEnd.loot')}</span>${this._loot(d.loot || [])}
        <span class="lk-label" style="margin-top:6px">${i18n.t('combatEnd.summary')}</span>
        <div class="lk-kv">${(d.summary || []).map(([k, v]) => `<span>${esc(k)}<b>${esc(v)}</b></span>`).join('')}</div>
      </div>`;
    this._bindLootTips(d.loot || []);
    if (this.hint) this.hint.textContent = i18n.t('combatEnd.hintContinue');
    this._setPrimary(i18n.t('combatEnd.continue'), 'map');
    this._open(false);
  }

  // ------------------------------------------------------------ derrota
  /**
   * d.subtitle, d.squad (como en victoria, sin ganancia), d.lostLoot [item], d.hints [{icon, html}]
   */
  showDefeat(d) {
    if (!this.root) return;
    tooltip.hide();
    this.crest.innerHTML = `
      <span class="lk-end__emblem">${BROKEN_MOON}</span>
      <div class="lk-end__title" id="lk-end-title">${i18n.t('combatEnd.defeat')}</div>
      <div class="lk-end__line"><i></i></div>
      <div class="lk-end__sub">${esc(d.subtitle)}</div>`;

    const main = (d.squad || []).find((u) => u.isMain && !u.isSapidae);
    let bondRow = '';
    const hints = [...(d.hints || [])];
    if (main) {
      const b = BondDemo.lose(main.id || main.name);
      bondRow = `<div class="lk-xp-row lk-bond-loss">${this._portrait(main, 44)}<b>${i18n.t('combatEnd.bondWith', { name: esc(main.name) })}<small>${i18n.t('combatEnd.squadDefeat')}</small></b><span class="lk-gain lk-bad">−${formatBond(b.lost)}%</span>`
        + `<span class="lk-ds-bar lk-bond lk-loss"><i class="lk-base" style="--a:${b.before}%;--b:${b.after}%"></i><i class="lk-lost" style="--a:${b.before}%;--b:${b.after}%"></i></span></div>`
        + `<div class="lk-axp-meta" style="padding-left:56px"><span>${i18n.t('combatEnd.bondAt', { n: b.after })}</span><span class="lk-demo-tag" title="${i18n.t('combatEnd.demoBond')}">${i18n.t('combatEnd.demo')}</span></div>`;
      hints.unshift({ icon: 'heart', html: `${i18n.t('combatEnd.bondHint', { n: b.after, name: esc(main.name) })}${b.after < 25 ? i18n.t('combatEnd.bondHintLow') : i18n.t('combatEnd.bondHintEnd')}` });
    }

    this.body.innerHTML = `
      <div class="lk-end__col">
        <span class="lk-label" style="color:#FF9C95">${i18n.t('combatEnd.consequences')}</span>
        ${bondRow}
        ${this._squad(this._withAxp(d.squad || [], false), true)}
        <div class="lk-axp-meta" style="padding-left:0"><span>${i18n.t('combatEnd.xpOnlyVictories')}</span></div>
        <span class="lk-label" style="margin-top:6px">${i18n.t('combatEnd.lostLoot')}</span>${this._loot(d.lostLoot || [], true)}
      </div>
      <div class="lk-end__col">
        <span class="lk-label">${i18n.t('combatEnd.nextAttempt')}</span>
        <ul class="lk-hints">${hints.slice(0, 4).map((h) => `<li><img class="lk-ai" src="${I(h.icon)}" alt=""><span>${h.html}</span></li>`).join('')}</ul>
      </div>`;
    this._bindLootTips(d.lostLoot || []);
    if (this.hint) this.hint.textContent = i18n.t('combatEnd.mapProgressKept');
    this._setPrimary(i18n.t('combatEnd.backToDojo'), 'back');
    this._open(true);
  }
}

/** Utilidad para main.js: % de experiencia dentro del nivel. */
export const expPct = pct;
