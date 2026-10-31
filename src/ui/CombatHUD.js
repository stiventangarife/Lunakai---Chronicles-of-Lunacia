// CombatHUD.js — HUD de combate táctico con la Crónica Celeste (maqueta «13 · Combate táctico»).
//
// Dos pasos:
//   1. initCombatHUDMarkup()  → al cargar el módulo principal, ANTES de que AxieTacticsGame enganche sus eventos.
//      Rehace el marcado de #ui-overlay conservando todos los ids que usa main.js (round-number, initiative-timeline,
//      unit-*, hud-*, spell-slot-N con .pa-cost-badge/.spell-icon/.range-badge, btn-end-turn, btn-cam-*, btn-mute,
//      btn-help, spell-tooltip, combat-forecast…) y las clases contenedoras que muestra/oculta (.battle-header,
//      .tactical-hud, .camera-controls).
//   2. attachCombatHUD(game)  → cuando el juego existe. Envuelve (sin cambiar su lógica) _updateHUD,
//      _updateTimelineUI, _showTurnBanner, _showSpellTooltip/_hideSpellTooltip, _toggleSpellSelect,
//      _clearSpellSelection y _showBattleHUD para completar lo que la maqueta muestra: rombos de PA/PM, clase,
//      estados, cartas con nombre/valor/alcance, tooltip marfil, registro de combate y barra apagada en turno enemigo.
//      La lógica de combate no se toca: si main.js cambia sus textos, este módulo solo los reescribe a continuación.

import { STATUS_DEFS, statusIconHtml, preloadStatusIcons } from '../tactics/combat/StatusSystem.js';
import { hasUltimate, paintUltimate, ultimateTipHTML, ultimateView } from './UltimateButton.js';
import * as i18n from '../i18n/i18n.js';

const ICON = './assets/ui/icons/';
const SLOTS = 6;          // seis habilidades por unidad (teclas 1–6). main.js gestiona 0–2; este módulo completa 3–5
const MAIN_SLOTS = 3;     // huecos que main.js ya engancha y actualiza
const ULT_INDEX = 6;      // la Ultimate es spellIds[6] cuando exista (tecla 7)
const SVG_ULT = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 6.3L21 9l-5 4.4L17.6 20 12 16.6 6.4 20 8 13.4 3 9l6.4-.7z"/></svg>';
const AXIE_CLASSES = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile', 'mech', 'dawn', 'dusk'];

const SVG_PM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16c3 0 4-2 6-2s3 2 6 2 4-1 4-1"/><path d="M5 11l3-6 3 4 3-3 3 5"/></svg>';
const SVG_SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';
const SVG_SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
const SVG_ROT_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
const SVG_ROT_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>';
const SVG_FOCUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
const SVG_WARN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z"/></svg>';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function classKey(unit) {
  const k = String(unit?.axieClass || unit?.config?.axieClass || '').toLowerCase();
  return AXIE_CLASSES.includes(k) ? k : null;
}
// Clase de la carta (no la del Axie que la lanza): Gero es acuática aunque la lance Shinji (bestia).
// Las cartas α de clase Mech de Pomodoro (Lost Dream, Village Hero) muestran el icono Mech.
function spellClassKey(spell, unit) {
  for (const c of [spell?.class, spell?.iconClass]) {
    const k = String(c || '').toLowerCase();
    if (AXIE_CLASSES.includes(k)) return k;
  }
  return classKey(unit);
}
// Los iconos de Mech, Dawn y Dusk están en mayúscula en assets/classes (el hosting distingue mayúsculas).
const CLASS_ICON_FILE = { dusk: 'dust' }; // los PNG están en minúsculas; el de Dusk se llama dust.png
const classIcon = (k) => `./assets/classes/${CLASS_ICON_FILE[k] || k}.png`;
// Icono de la carta: la parte del cuerpo (assets/parts/<clase>-<parte>.png, ya pintada con el color de su clase).
// Mech, Dawn y Dusk no tienen iconos de partes: usan la parte de su iconClass y un filtro con el color de su clase.
// Hechizos sin parte (Sapidae, enemigos): el icono de la clase, como antes.
const PART_LABEL = { eyes: i18n.t('combatHud.partEyes'), ears: i18n.t('combatHud.partEars'), mouth: i18n.t('combatHud.partMouth'), horn: i18n.t('combatHud.partHorn'), back: i18n.t('combatHud.partBack'), tail: i18n.t('combatHud.partTail') };
const CLASS_LABEL = { beast: i18n.t('combatHud.clsBeast'), plant: i18n.t('combatHud.clsPlant'), aquatic: i18n.t('combatHud.clsAquatic'), bird: i18n.t('combatHud.clsBird'), bug: i18n.t('combatHud.clsBug'), reptile: i18n.t('combatHud.clsReptile'), mech: 'Mech', dawn: 'Dawn', dusk: 'Dusk' };
function spellIconHtml(spell, unit) {
  const ck = spellClassKey(spell, unit);
  if (spell?.part && PART_LABEL[spell.part]) {
    const src = spell.partIcon || `./assets/parts/${spell.iconClass || spell.class}-${spell.part}.png`;
    const alt = `${PART_LABEL[spell.part]} · ${CLASS_LABEL[ck] || ck || ''}`;
    return { html: `<img class="lk-part-ico lk-part-ico--${ck || 'none'}" src="${src}" alt="${alt}">`, title: i18n.t('combatHud.cardOf', { alt }) };
  }
  return ck ? { html: `<img src="${classIcon(ck)}" alt="${ck}">`, title: i18n.t('combatHud.cardOfClass', { cls: CLASS_LABEL[ck] || ck }) } : null;
}
function tintOf(unit) {
  if (!unit) return 'var(--lk-gilt-300)';
  if (unit.team !== 'player') return 'var(--lk-enemy-red)';
  const k = classKey(unit);
  return k ? `var(--lk-class-${k})` : 'var(--lk-lumen-300)';
}
const rangeTxt = (s) => (s.minRange === s.maxRange ? `${s.minRange}` : `${s.minRange}–${s.maxRange}`);

/**
 * Valores de la carta para el lanzador (19-oct): nivel de habilidad, bonus del atributo y estados del momento
 * (Potenciado, Débil…). Curas y escudos con el poder de apoyo. Sin juego (sm) se muestran los valores base.
 * Devuelve también `parts` (desglose para la ficha) y `boosted` (si difiere del valor base).
 */
export function spellNumbers(s, unit, sm) {
  const pctTxt = (v) => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v))} %`;
  const mult = sm && unit && typeof sm._getSpellMultiplier === 'function' ? sm._getSpellMultiplier(unit, s) : 1;
  const parts = [];
  if (mult !== 1) parts.push(i18n.t('combatHud.lvlMult', { lv: unit.getSkillLevel?.(s.id) || 1, mult: i18n.num(mult) }));
  const b0 = s.rcBase || s; // carta sin charms: el valor «de la carta» del desglose
  if (s.rcBase) parts.push(i18n.t('combatHud.withCharms'));
  if (s.baseMinDamage) {
    const e = (s.effects || []).find((x) => x.type === 'damage');
    const hits = e && typeof e.hits === 'number' ? e.hits : 1;
    const min0 = e ? e.min : s.baseMinDamage / hits, max0 = e ? e.max : s.baseMaxDamage / hits;
    const flat = sm && unit && typeof sm._flatDamageBonus === 'function' ? sm._flatDamageBonus(unit, s, s.maxRange <= 1 ? 1 : 2) : 0;
    const pctSt = sm?.statuses && unit?.statuses?.length ? sm.statuses.mod(unit, 'damageDealtPct') : 0;
    // Runas del lanzador que no dependen del objetivo (Pure Power, Heart of Ocean…)
    const pctRc = sm?.runeCharms && unit?.rc ? sm.runeCharms.damagePct(unit, null, s.maxRange <= 1 ? 1 : 2, { spell: s }) : 0;
    const pct = pctSt + pctRc;
    if (flat) parts.push(i18n.t('combatHud.plusAttrs', { n: flat }));
    if (pctSt) parts.push(`${pctSt > 0 ? i18n.t('combatHud.empowered') : i18n.t('combatHud.weakened')} ${pctTxt(pctSt)}`);
    if (pctRc) parts.push(i18n.t('combatHud.runePct', { pct: pctTxt(pctRc) }));
    const f = (v) => Math.max(0, Math.round((Math.floor(v * mult) + flat) * (1 + pct / 100)) * hits);
    const lo = f(min0), hi = f(max0);
    return { kind: i18n.t('combatHud.kindAttack'), cls: '', val: lo === hi ? `${lo}` : `${lo}–${hi}`, label: i18n.t('combatHud.damage'), parts, boosted: lo !== b0.baseMinDamage || hi !== b0.baseMaxDamage, down: hi < b0.baseMaxDamage, base: b0.baseMinDamage === b0.baseMaxDamage ? `${b0.baseMinDamage}` : `${b0.baseMinDamage}–${b0.baseMaxDamage}` };
  }
  const sup = unit?.supportPower || 0;
  if (sup) parts.push(i18n.t('combatHud.supportPct', { n: Math.round(sup) }));
  const g = (v) => Math.round(Math.floor(v * mult) * (1 + sup / 100));
  if (s.baseMinHeal) {
    const lo = g(s.baseMinHeal), hi = g(s.baseMaxHeal || s.baseMinHeal);
    return { kind: i18n.t('combatHud.kindSupport'), cls: 'lk-heal', val: `+${lo}${hi !== lo ? '–' + hi : ''}`, label: i18n.t('combatHud.healing'), parts, boosted: lo !== b0.baseMinHeal, base: `+${b0.baseMinHeal}` };
  }
  if (s.shieldAmount) {
    const v = Math.round(Math.round(s.shieldAmount * mult) * (1 + sup / 100));
    return { kind: i18n.t('combatHud.shield'), cls: 'lk-shield', val: `+${v}`, label: i18n.t('combatHud.shield'), parts, boosted: v !== b0.shieldAmount, base: `+${b0.shieldAmount}` };
  }
  return { kind: i18n.t('combatHud.kindSkill'), cls: '', val: '', label: '', parts: [] };
}
function spellEffect(s, unit = null, sm = null) { return spellNumbers(s, unit, sm); }
const AREA = { single: i18n.t('combatHud.areaSingle'), cross1: i18n.t('combatHud.areaCross1'), cross2: i18n.t('combatHud.areaCross2'), line: i18n.t('combatHud.areaLine'), circle1: i18n.t('combatHud.areaCircle1'), square1: i18n.t('combatHud.areaSquare1') };

/* ───────────────────────────── 1. Marcado ───────────────────────────── */
export function initCombatHUDMarkup() {
  const ov = document.getElementById('ui-overlay');
  if (!ov || ov.dataset.lk) return;
  ov.dataset.lk = '1';

  const header = ov.querySelector('.battle-header');
  if (header) {
    header.className = 'battle-header lk-ui lk-cb-top';
    header.innerHTML = `
      <div class="lk-turn-tracker lk-cb-tracker">
        <div class="lk-round-badge" title="${i18n.t('combatHud.round')}"><div><b id="round-number">1</b></div><span class="lk-rb-l">${i18n.t('combatHud.round')}</span></div>
        <div id="initiative-timeline" class="initiative-bar lk-cb-timeline" aria-label="${i18n.t('combatHud.initiativeOrder')}"></div>
      </div>
      <span class="lk-cb-spacer"></span>
      <div class="header-actions lk-cb-tools">
        <button id="btn-options" class="icon-btn lk-btn-circle-icon" type="button" title="${i18n.t('combatHud.optionsEsc')}" aria-label="${i18n.t('combatHud.options')}"><img class="lk-ai" src="${ICON}setting.png" alt=""></button>
        <!-- El volumen vive ahora en Opciones › Audio; el botón se conserva oculto porque main.js lo usa -->
        <button id="btn-mute" class="icon-btn lk-btn-circle-icon" type="button" title="${i18n.t('combatHud.muteAll')}" hidden>🔊</button>
        <button id="btn-help" class="icon-btn lk-btn-circle-icon" type="button" title="${i18n.t('combatHud.helpTitle')}"><img class="lk-ai" src="${ICON}info.png" alt=""></button>
      </div>`;
  }

  const cams = ov.querySelector('.camera-controls');
  if (cams) {
    cams.className = 'camera-controls lk-ui lk-cb-cams';
    cams.innerHTML = `
      <button id="btn-cam-left" class="cam-btn lk-btn-circle-icon" type="button" title="${i18n.t('combatHud.camLeft')}">${SVG_ROT_L}<span class="lk-key">Q</span></button>
      <button id="btn-cam-reset" class="cam-btn lk-btn-circle-icon" type="button" title="${i18n.t('combatHud.camReset')}">${SVG_FOCUS}<span class="lk-key">R</span></button>
      <button id="btn-cam-right" class="cam-btn lk-btn-circle-icon" type="button" title="${i18n.t('combatHud.camRight')}">${SVG_ROT_R}<span class="lk-key">E</span></button>`;
  }

  const hud = ov.querySelector('.tactical-hud');
  if (hud) {
    hud.className = 'tactical-hud lk-ui lk-cb-bottom';
    const slots = Array.from({ length: SLOTS }, (_, i) => `
          <div id="spell-slot-${i}" class="spell-slot lk-card-tactical" data-index="${i}" tabindex="0" role="button">
            <span class="lk-card-cost"><span class="pa-cost-badge">0</span></span>
            <span class="lk-card-part lk-cb-cls" data-ref="cls"></span>
            <div class="lk-card-tactical__art"><span class="spell-icon"></span></div>
            <span class="lk-card-dmg" data-ref="val"></span>
            <div class="lk-card-tactical__name" data-ref="name"></div>
            <div class="lk-card-tactical__range"><img class="lk-ai" src="${ICON}range.png" alt=""><span class="range-badge">1</span><span class="lk-los" data-ref="los"><img class="lk-ai" src="${ICON}vision.png" alt=""></span></div>
            <span class="lk-cool" aria-hidden="true"></span>
            <span class="lk-hk">${i + 1}</span>
          </div>`).join('');
    hud.innerHTML = `
      <div class="hud-main-panel lk-combat-bar lk-cb-bar" id="lk-combat-bar">
        <div class="unit-profile lk-unit-sheet">
          <span id="unit-avatar" class="avatar-frame lk-portrait"></span>
          <div class="lk-cb-who">
            <b id="unit-name" class="unit-name">—</b>
            <small><span class="lk-cb-cls-badge" data-ref="sheetCls" hidden></span><span id="unit-archetype" class="unit-archetype"></span></small>
            <div class="lk-bar-read"><span>${i18n.t('combatHud.hp')}</span><span id="hud-hp-text">0 / 0</span></div>
            <div class="lk-bar lk-cb-hp"><i id="hud-hp-fill" style="width:100%"></i><em data-ref="shield" hidden></em></div>
            <div class="lk-cb-status" data-ref="status"></div>
          </div>
        </div>
        <div class="points-container lk-res-meters">
          <div class="lk-meter lk-meter--pa" data-ref="mPA" title="${i18n.t('combatHud.paTitle')}"><span class="lk-orb"><img class="lk-ai" src="${ICON}pa.png" alt=""></span><b id="hud-pa-count">6</b><span class="lk-pips" data-ref="paPips"></span></div>
          <div class="lk-meter lk-meter--pm" data-ref="mPM" title="${i18n.t('combatHud.pmTitle')}"><span class="lk-orb">${SVG_PM}</span><b id="hud-pm-count">3</b><span class="lk-pips" data-ref="pmPips"></span></div>
        </div>
        <div class="spell-hotbar lk-tray">${slots}</div>
        <div class="lk-duo-wrap lk-cb-ult-wrap">
          <button id="spell-slot-ult" class="lk-btn-duo-ultimate lk-cb-ult" type="button" data-index="${ULT_INDEX}" aria-label="Ultimate" style="--p:0">
            <span class="lk-rays"></span>
            <svg class="lk-ring" viewBox="0 0 104 104"><circle class="lk-trk" cx="52" cy="52" r="46"/><circle class="lk-val" cx="52" cy="52" r="46"/></svg>
            <span class="lk-medal"><span class="lk-glyph lk-cb-ult-glyph">${SVG_ULT}</span><span class="lk-lock"><img class="lk-ai" src="${ICON}lock.png" alt=""></span></span>
            <span class="lk-pct" data-ref="ultPct">Ultimate</span>
          </button>
        </div>
        <button id="btn-end-turn" class="end-turn-btn lk-btn lk-btn-primary-gold lk-btn-end-turn" type="button">${i18n.t('combatHud.endTurn')}<small>${i18n.t('combatHud.keySpace')}</small></button>
      </div>`;
  }

  // Tooltip del hechizo: main.js sigue rellenando el antiguo (#spell-tooltip, ahora siempre oculto);
  // el visible es el tooltip marfil del sistema (#lk-cb-tip)
  const oldTip = document.getElementById('spell-tooltip');
  if (oldTip) oldTip.classList.add('lk-cb-legacy');
  const tip = document.createElement('div');
  tip.id = 'lk-cb-tip';
  tip.className = 'lk-ui lk-tooltip-float lk-cb-tip';
  document.body.appendChild(tip);

  // Pronóstico sobre el objetivo, como tarjeta marfil
  const fc = document.getElementById('combat-forecast');
  if (fc) {
    fc.className = 'combat-forecast lk-ui lk-cb-forecast hidden';
    fc.innerHTML = `
      <div class="lk-cb-fc__head"><b id="forecast-target-name">${i18n.t('combatHud.target')}</b><span id="forecast-target-hp" class="forecast-hp">0 / 0 HP</span></div>
      <div class="lk-cb-fc__body">
        <div id="forecast-damage-row" class="forecast-row"><span class="row-label">${i18n.t('combatHud.estDamage')}</span><b id="forecast-damage-val" class="damage-badge">—</b></div>
        <div id="forecast-push-row" class="forecast-row hidden"><span class="row-label">${i18n.t('combatHud.push')}</span><b id="forecast-push-val" class="push-badge">—</b></div>
        <div id="forecast-collision-alert" class="collision-alert hidden">${SVG_WARN}${i18n.t('combatHud.collision')}</div>
      </div>`;
  }

  // Registro de combate (arriba a la derecha) y aviso de turno enemigo
  const log = document.createElement('div');
  log.id = 'lk-cb-log';
  log.className = 'lk-ui lk-combat-log lk-cb-log';
  log.setAttribute('aria-live', 'polite');
  ov.appendChild(log);
  const enemy = document.createElement('div');
  enemy.id = 'lk-cb-enemy';
  enemy.className = 'lk-ui lk-enemy-banner lk-cb-enemy';
  enemy.innerHTML = `<span class="lk-notice">${i18n.t('combatHud.enemyTurn')}</span>`;
  ov.appendChild(enemy);

  // El cartel de turno (#turn-banner) también lo usan los avisos de misión: aquí solo se le añade la clase base
  document.getElementById('turn-banner')?.classList.add('lk-ui');
}

/* ───────────────────────────── 2. Comportamiento ───────────────────────────── */
export function attachCombatHUD(game) {
  if (!game || game.__lkCombatHUD) return;
  game.__lkCombatHUD = true;
  const $ = (id) => document.getElementById(id);
  // Valor de carta modificado por nivel, atributos o estados (Hito 79): el número conserva su color (daño, cura o
  // escudo) y lleva una flechita: ▲ verde si es mayor que el de la carta, ▼ roja si es menor. Desglose en la ficha.
  if (!document.getElementById('lk-cb-boost-style-v2')) {
    const st = document.createElement('style');
    st.id = 'lk-cb-boost-style-v2';
    st.textContent = '.lk-card-dmg.lk-is-boosted::before,.lk-card-dmg.lk-is-reduced::before{display:inline-block;margin-right:2px;font:900 normal .58em/1 var(--lk-font-ui);vertical-align:.18em}.lk-card-dmg.lk-is-boosted::before{content:"\\25B2";color:#7ee08a}.lk-card-dmg.lk-is-reduced::before{content:"\\25BC";color:#ff6b5c}.lk-cb-tip-calc{margin:6px 0 0;font-size:11px;opacity:.8}';
    document.head.appendChild(st);
  }
  preloadStatusIcons(); // Hito 80: iconos de los estados
  const bar = $('lk-combat-bar');
  const q = (sel) => bar?.querySelector(sel);
  const tip = $('lk-cb-tip');
  const logEl = $('lk-cb-log');
  const enemyEl = $('lk-cb-enemy');

  const wrap = (name, after, before) => {
    const orig = game[name];
    if (typeof orig !== 'function') return;
    game[name] = function (...args) {
      if (before) try { before.apply(this, args); } catch (e) { console.warn('[CombatHUD]', name, e); }
      const r = orig.apply(this, args);
      try { after && after.apply(this, args); } catch (e) { console.warn('[CombatHUD]', name, e); }
      return r;
    };
  };

  const spellAt = (unit, i) => {
    const id = unit?.spellIds?.[i];
    return id ? game.spellManager?.getSpell?.(id, unit) : null; // con los charms de la unidad
  };
  // Coste real de la carta para la unidad (descuentos de charms y runas)
  const costOf = (unit, s) => {
    const c = game.spellManager?.getSpellCost ? game.spellManager.getSpellCost(unit, s) : s?.paCost;
    return c === 'X' ? 'X' : (c ?? 0);
  };
  const costNum = (unit, s) => { const c = costOf(unit, s); return c === 'X' ? 1 : c; };

  /**
   * Rombos de PA/PM (Hito 108): tantos como el máximo de la unidad o, si ganó puntos por encima, como los que tiene
   * ahora. Los que superan el máximo salen en dorado («extra»); los recién ganados aparecen con un pequeño salto.
   * Hasta 9 caben a tamaño normal; de 10 a 12 se compactan en el mismo ancho (sin mover nada del HUD).
   */
  const PIP_CAP = 12;
  const lastRes = { unit: null, pa: 0, pm: 0 };
  const pips = (el, cur, max, prev) => {
    if (!el) return;
    const base = Math.max(0, max | 0);
    const n = Math.min(PIP_CAP, Math.max(base, cur));
    el.classList.toggle('lk-dense', n > 9);
    el.innerHTML = Array.from({ length: n }, (_, i) => {
      const on = i < cur;
      const cls = [on ? 'lk-on' : '', on && i >= base ? 'lk-extra' : '', on && prev != null && i >= prev ? 'lk-new' : ''].filter(Boolean).join(' ');
      return `<i${cls ? ` class="${cls}"` : ''}></i>`;
    }).join('');
  };
  const bump = (el, cur, prev) => {
    if (!el || prev == null || cur === prev) return;
    el.classList.remove('lk-gain', 'lk-loss');
    void el.offsetWidth; // reinicia la animación de un solo uso
    el.classList.add(cur > prev ? 'lk-gain' : 'lk-loss');
  };

  // ── Hoja de la unidad, recursos y cartas
  function decorateHUD(unit) {
    if (!unit || !bar) return;
    const mine = unit.team === 'player' && game.activeUnit === unit;
    bar.style.setProperty('--tint', tintOf(unit));
    bar.classList.toggle('lk-is-enemy', unit.team !== 'player');
    enemyEl?.classList.toggle('lk-is-on', unit.team !== 'player' && !unit.isDead);

    const k = classKey(unit);
    const cls = q('[data-ref="sheetCls"]');
    if (cls) {
      cls.hidden = !k;
      if (k) cls.innerHTML = `<img src="${classIcon(k)}" alt="${k}">`;
    }
    q('.lk-portrait')?.style.setProperty('--c', tintOf(unit));

    // Recursos (Hito 108): solo lo que queda («7») y rombos que crecen si se ganan puntos por encima del máximo
    const pa = Math.max(0, unit.currentPA | 0), pm = Math.max(0, unit.currentPM | 0);
    const same = lastRes.unit === unit;
    const prevPA = same && pa > lastRes.pa ? lastRes.pa : null, prevPM = same && pm > lastRes.pm ? lastRes.pm : null;
    const paEl = $('hud-pa-count'), pmEl = $('hud-pm-count');
    if (paEl) paEl.textContent = String(pa);
    if (pmEl) pmEl.textContent = String(pm);
    pips(q('[data-ref="paPips"]'), pa, unit.maxPA, prevPA);
    pips(q('[data-ref="pmPips"]'), pm, unit.maxPM, prevPM);
    if (same) { bump(paEl, pa, lastRes.pa); bump(pmEl, pm, lastRes.pm); }
    const extraPA = pa > (unit.maxPA | 0), extraPM = pm > (unit.maxPM | 0);
    q('[data-ref="mPA"]')?.classList.toggle('lk-has-extra', extraPA);
    q('[data-ref="mPM"]')?.classList.toggle('lk-has-extra', extraPM);
    q('[data-ref="mPA"]')?.setAttribute('aria-label', i18n.t('combatHud.paAria', { n: pa }));
    q('[data-ref="mPM"]')?.setAttribute('aria-label', i18n.t('combatHud.pmAria', { n: pm }));
    lastRes.unit = unit; lastRes.pa = pa; lastRes.pm = pm;

    // Vida enemiga en rojo y escudo
    q('.lk-cb-hp')?.classList.toggle('lk-bar--enemy', unit.team !== 'player');
    const sh = q('[data-ref="shield"]');
    if (sh) {
      const s = Math.max(0, unit.shield | 0);
      sh.hidden = !s;
      if (s) {
        const hpPct = Math.max(0, Math.min(100, (unit.currentHP / Math.max(1, unit.maxHP)) * 100));
        sh.style.left = hpPct + '%';
        sh.style.width = Math.min(100 - hpPct, (s / Math.max(1, unit.maxHP)) * 100) + '%';
        sh.title = i18n.t('combatHud.shieldN', { n: s });
      }
    }

    // Estados alterados
    const st = q('[data-ref="status"]');
    if (st) {
      const list = (unit.statuses || []).slice(0, 6);
      const defs = STATUS_DEFS;
      st.innerHTML = list.map((s) => {
        const label = s.label || defs?.[s.id]?.label || s.id;
        return `<span class="lk-cb-st" title="${esc(label)} · ${i18n.t(s.duration === 1 ? 'combatHud.turn1' : 'combatHud.turnsN', { n: s.duration })}">${statusIconHtml(s.id, s.icon || defs?.[s.id]?.icon)}<b>${s.duration}</b></span>`;
      }).join('');
    }

    // Cartas
    for (let i = 0; i < SLOTS; i++) {
      const slot = $('spell-slot-' + i);
      if (!slot) continue;
      const s = spellAt(unit, i);
      if (!s) { slot.style.display = 'none'; continue; }
      if (i >= MAIN_SLOTS) {
        // main.js solo pinta 0–2: aquí se hace lo mismo para 3–5
        const iconEl = slot.querySelector('.spell-icon');
        if (iconEl && iconEl.dataset.src !== String(s.icon || '')) {
          iconEl.dataset.src = String(s.icon || '');
          if (s.icon && /[/.]/.test(s.icon)) iconEl.innerHTML = `<img src="${s.icon}" alt="${esc(s.name)}" class="spell-img-icon">`;
          else if (s.icon) iconEl.textContent = s.icon; else iconEl.innerHTML = '<img src="./assets/ui/icons/swords.png" alt="" class="spell-img-icon">';
        }
        slot.classList.toggle('disabled', unit.currentPA < costNum(unit, s) || unit.team !== 'player' || game.activeUnit !== unit);
      }
      slot.style.removeProperty('display');
      slot.hidden = false;
      slot.style.setProperty('--c', tintOf(unit));
      const cost = slot.querySelector('.pa-cost-badge');
      if (cost) {
        cost.textContent = costOf(unit, s);
        cost.classList.toggle('lk-is-boosted', typeof s.paCost === 'number' && costNum(unit, s) < (s.rcBase?.paCost ?? s.paCost));
      }
      const rng = slot.querySelector('.range-badge');
      if (rng) rng.textContent = `${i18n.t('combatHud.rangeShort')} ${rangeTxt(s)}${s.isLinear ? ' ↔' : ''}`;
      const los = slot.querySelector('[data-ref="los"]');
      if (los) { los.classList.toggle('lk-nolos', !s.requiresLoS); los.title = s.requiresLoS ? i18n.t('combatHud.needsLos') : i18n.t('combatHud.noLos'); }
      const nm = slot.querySelector('[data-ref="name"]');
      if (nm) nm.textContent = s.name || '';
      const eff = spellEffect(s, unit, game.spellManager);
      const val = slot.querySelector('[data-ref="val"]');
      if (val) { val.textContent = eff.val; val.className = `lk-card-dmg ${eff.cls}${eff.boosted ? (eff.down ? ' lk-is-reduced' : ' lk-is-boosted') : ''}`; }
      const badge = slot.querySelector('[data-ref="cls"]');
      if (badge) {
        const ico = spellIconHtml(s, unit);
        badge.innerHTML = ico ? ico.html : '';
        badge.title = ico ? ico.title : '';
        badge.classList.toggle('lk-has-part', Boolean(s?.part));
        badge.hidden = !ico;
      }
      const afford = unit.currentPA >= costNum(unit, s);
      slot.classList.toggle('lk-is-unaffordable', mine && !afford);
      slot.classList.toggle('lk-is-idle', !mine);
      slot.setAttribute('aria-label', i18n.t('combatHud.cardAria', { name: s.name, cost: costOf(unit, s), range: rangeTxt(s) }));
    }
    decorateUltimate(unit);
  }

  // ── Ultimate: spellIds[6] si existe. unit.ultimateCharge (0–100) llena el anillo; sin carga definida está lista.
  function ultState(unit) {
    const s = spellAt(unit, ULT_INDEX);
    const charge = typeof unit?.ultimateCharge === 'number' ? Math.max(0, Math.min(100, unit.ultimateCharge)) : (s ? 100 : 0);
    const mine = unit?.team === 'player' && game.activeUnit === unit;
    const ready = Boolean(s) && charge >= 100 && !unit.ultimateUsed;
    const afford = s ? unit.currentPA >= (s.paCost ?? 0) : false;
    return { s, charge, mine, ready, afford };
  }
  function decorateUltimate(unit) {
    const btn = $('spell-slot-ult');
    if (!btn || !unit) return;
    // Duo Ultimate del motor (vínculo con el Axie principal): el anillo es el vínculo
    if (game.spellManager?.ultimates) { paintUltimate(game, btn, unit); return; }
    const { s, charge, mine, ready, afford } = ultState(unit);
    btn.closest('.lk-cb-ult-wrap').hidden = unit.team !== 'player';
    btn.style.setProperty('--p', charge);
    btn.classList.toggle('lk-is-ready', ready && mine);
    btn.classList.toggle('lk-is-spent', Boolean(unit.ultimateUsed));
    btn.classList.toggle('lk-is-unaffordable', ready && mine && !afford);
    const pct = btn.querySelector('[data-ref="ultPct"]');
    if (pct) pct.textContent = unit.ultimateUsed ? i18n.t('combatHud.ultUsed') : ready ? i18n.t('combatHud.ultReady') : s ? `${Math.round(charge)}%` : 'Ultimate';
    btn.setAttribute('aria-label', s ? `Ultimate: ${s.name}` : i18n.t('combatHud.ultUnavailable'));
  }
  function ultTipHTML(unit) {
    if (hasUltimate(game)) return ultimateTipHTML(game);
    const { s, charge, ready } = ultState(unit);
    if (s) return tipHTML(unit, s).replace('· ' + i18n.t('combatHud.kindAttack'), '· Ultimate').replace('· ' + i18n.t('combatHud.kindSupport'), '· Ultimate').replace('· ' + i18n.t('combatHud.shield'), '· Ultimate').replace('· ' + i18n.t('combatHud.kindSkill'), '· Ultimate');
    return `<div class="lk-tooltip-tactical" style="--c:var(--lk-gilt-500)"><header><span class="lk-cb-tip-cls lk-cb-tip-ult">${SVG_ULT}</span><div><small>${esc(unit?.name || '')} · Ultimate</small><b>${i18n.t('combatHud.ultTech')}</b></div></header>
      <div class="lk-tt-body"><div class="lk-tt-stats"><span class="lk-tt-stat">${i18n.t('combatHud.charge')}<b>${Math.round(charge)}%</b></span><span class="lk-tt-stat">${i18n.t('combatHud.uses')}<b>${i18n.t('combatHud.oncePerBattle')}</b></span></div>
      <p>${i18n.t('combatHud.ultNone')}</p></div></div>`;
  }

  // ── Línea de iniciativa: rombo sobre el que actúa y vida en cada retrato
  function decorateTimeline() {
    const tl = $('initiative-timeline');
    if (!tl) return;
    tl.querySelectorAll('.timeline-card').forEach((card) => {
      card.classList.add('lk-cb-node');
      const name = card.querySelector('.card-name')?.textContent || '';
      card.title = name;
    });
  }

  // ── Cartel de turno en español y con la cartela del sistema
  function decorateBanner(unit) {
    const banner = $('turn-banner');
    const t = $('banner-title'), sub = $('banner-subtitle');
    if (!banner || !unit) return;
    banner.classList.add('lk-ui', 'lk-turn-banner');
    if (unit.team === 'player') { if (sub) sub.textContent = i18n.t('combatHud.turnOf'); if (t) t.textContent = unit.name; }
    else { if (sub) sub.textContent = i18n.t('combatHud.enemyTurn'); if (t) t.textContent = unit.name; }
    banner.style.setProperty('--tint', tintOf(unit));
  }

  // ── Tooltip marfil del hechizo
  function tipHTML(unit, s) {
    const eff = spellEffect(s, unit, game.spellManager);
    const k = spellClassKey(s, unit);
    const tipIco = spellIconHtml(s, unit);
    const art = s.icon && /[/.]/.test(s.icon) ? s.icon : '';
    const stats = [
      `<span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}pa.png" alt="">${i18n.t('combatHud.cost')}</i><b>${i18n.t('combatHud.paN', { n: costOf(unit, s) })}</b></span>`,
      `<span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}range.png" alt="">${i18n.t('combatHud.range')}</i><b>${i18n.t('combatHud.rangeShort')} ${rangeTxt(s)}</b></span>`,
      `<span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}vision.png" alt="">${i18n.t('combatHud.vision')}</i><b>${s.requiresLoS ? i18n.t('combatHud.required') : i18n.t('combatHud.notRequired')}</b></span>`,
      `<span class="lk-tt-stat">${i18n.t('combatHud.area')}<b>${AREA[s.areaType] || AREA.single}</b></span>`
    ];
    if (s.isLinear) stats.push(`<span class="lk-tt-stat">${i18n.t('combatHud.cast')}<b>${i18n.t('combatHud.inLine')}</b></span>`);
    if (eff.label) stats.push(`<span class="lk-tt-stat">${eff.label}<b>${eff.val}</b></span>`);
    // Desglose: de dónde sale la diferencia con el valor de la carta (nivel, atributos, estados)
    const breakdown = eff.boosted && eff.parts?.length ? `<p class="lk-cb-tip-calc">${i18n.t('combatHud.cardBase', { base: eff.base })} · ${eff.parts.join(' · ')}</p>` : '';
    if (s.pushDistance) stats.push(`<span class="lk-tt-stat">${i18n.t('combatHud.push')}<b>${i18n.t(s.pushDistance === 1 ? 'combatHud.tile1' : 'combatHud.tilesN', { n: s.pushDistance })}</b></span>`);
    // Hito 97: recarga, espera inicial y usos (por turno / por objetivo)
    const sm = game.spellManager;
    const cdBase = sm?.cooldownOf ? sm.cooldownOf(unit, s) : (s.cooldown || 0);
    const turnsTxt = (n) => i18n.t(n === 1 ? 'combatHud.turn1' : 'combatHud.turnsN', { n });
    if (cdBase) stats.push(`<span class="lk-tt-stat">${i18n.t('combatHud.cooldown')}<b>${turnsTxt(cdBase)}</b></span>`);
    if (s.initialCooldown) stats.push(`<span class="lk-tt-stat">${i18n.t('combatHud.initialCd')}<b>${turnsTxt(s.initialCooldown)}</b></span>`);
    const uses = [s.castsPerTurn ? i18n.t('combatHud.perTurnN', { n: s.castsPerTurn }) : '', s.castsPerTarget ? i18n.t('combatHud.perTargetN', { n: s.castsPerTarget }) : ''].filter(Boolean);
    if (uses.length) stats.push(`<span class="lk-tt-stat">${i18n.t('combatHud.uses')}<b>${uses.join(' · ')}</b></span>`);
    const cdLeft = sm?.cooldownLeft ? sm.cooldownLeft(unit, s) : 0;
    const spentNow = Boolean(sm?.castLimitReached?.(unit, s));
    // Hito 98: carta bloqueada por nivel
    const lockLv = sm?.isLocked?.(unit, s) ? sm.unlockLevel(unit, s) : 0;
    const PARTK = { horn: 'combatHud.partHorn', back: 'combatHud.partBack', tail: 'combatHud.partTail' };
    const lockWarn = lockLv ? `<p class="lk-cb-tip-warn">${!unit.config?.isSapidae && PARTK[s.part] ? i18n.t('combatHud.lockedAtPart', { n: lockLv, part: i18n.t(PARTK[s.part]) }) : i18n.t('combatHud.lockedAt', { n: lockLv })}</p>` : '';
    const cdWarn = lockWarn ? lockWarn : cdLeft ? `<p class="lk-cb-tip-warn">${i18n.t(cdLeft === 1 ? 'combatHud.readyIn1' : 'combatHud.readyInN', { n: cdLeft })}</p>`
      : spentNow ? `<p class="lk-cb-tip-warn">${i18n.t('combatHud.spentTip')}</p>` : '';
    return `<div class="lk-tooltip-tactical" style="--c:${tintOf(unit)}${art ? `;--art:url('${art}')` : ''}">
      <header class="${art ? 'lk-has-art' : ''}">${tipIco ? `<span class="lk-cb-tip-cls${s?.part ? ' lk-has-part' : ''}" title="${tipIco.title}">${tipIco.html}</span>` : ''}<div><small>${esc(unit.name)} · ${eff.kind}${s.stage >= 2 ? ' · ' + i18n.t('combatHud.stage2') : ''}${s.collection ? ` · ${esc(String(s.collection).charAt(0).toUpperCase() + String(s.collection).slice(1))}` : ''}</small><b>${esc(s.name)}</b></div></header>
      <div class="lk-tt-body"><div class="lk-tt-stats">${stats.join('')}</div>${breakdown}<p>${esc(s.description || '')}</p>
      ${s.rcNotes?.length ? `<p class="lk-cb-tip-calc">${i18n.t('combatHud.charmsRune', { list: s.rcNotes.map(esc).join(' · ') })}</p>` : ''}
      ${cdWarn}${!cdWarn && unit.team === 'player' && unit.currentPA < costNum(unit, s) ? `<p class="lk-cb-tip-warn">${i18n.t('combatHud.missingPa', { n: costNum(unit, s) - unit.currentPA })}</p>` : ''}</div></div>`;
  }
  function showTip(index) {
    const unit = game.activeUnit;
    const isUlt = index === ULT_INDEX;
    const s = spellAt(unit, index);
    const slot = isUlt ? $('spell-slot-ult') : $('spell-slot-' + index);
    if (!tip || !slot || !unit || (!s && !isUlt)) return;
    tip.innerHTML = isUlt ? ultTipHTML(unit) : tipHTML(unit, s);
    tip.classList.add('lk-is-on');
    const r = slot.getBoundingClientRect(), t = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2)) + 'px';
    tip.style.top = Math.max(8, r.top - t.height - 22) + 'px';
  }
  const hideTip = () => tip?.classList.remove('lk-is-on');

  // ── Registro de combate
  const names = (u) => `<b>${esc(u?.name || i18n.t('combatHud.unknown'))}</b>`;
  function log(html, cls = '') {
    if (!logEl) return;
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.innerHTML = html;
    logEl.prepend(p);
    [...logEl.querySelectorAll('p')].slice(5).forEach((n) => n.remove());
  }
  const ev = game.spellManager?.events;
  if (ev && typeof ev.on === 'function') {
    // Hito 97: la carta que vuelve de la recarga destella al empezar el turno
    ev.on('spell:ready', ({ unit, spellId }) => {
      if (!unit || unit.team !== 'player') return;
      setTimeout(() => {
        if (game.activeUnit !== unit) return;
        const i = (unit.spellIds || []).slice(0, SLOTS).indexOf(spellId);
        const el = i >= 0 ? $('spell-slot-' + i) : null;
        if (!el) return;
        el.classList.remove('lk-cd-ready'); void el.offsetWidth; el.classList.add('lk-cd-ready');
        setTimeout(() => el.classList.remove('lk-cd-ready'), 1000);
      }, 120);
    });
    ev.on('unit:damaged', ({ unit, source, spell, actual, isCrit }) => {
      if (!(actual > 0)) return;
      const from = source && source !== unit ? `${names(source)}${spell?.name ? ' · ' + esc(spell.name) : ''} → ` : '';
      log(`${from}${names(unit)} · <span class="lk-cb-dmg">${actual}${isCrit ? ' ' + i18n.t('combatHud.crit') : ''}</span>`, isCrit ? 'lk-is-crit' : '');
      if (unit?.currentHP <= 0) log(i18n.t('combatHud.fell', { name: names(unit) }), 'lk-is-ko');
    });
    ev.on('unit:healed', ({ unit, amount }) => { if (amount > 0) log(`${names(unit)} · <span class="lk-cb-heal">+${amount}</span>`); });
    ev.on('unit:shielded', ({ unit, amount }) => { if (amount > 0) log(`${names(unit)} · <span class="lk-cb-shield">${i18n.t('combatHud.shieldPlus', { n: amount })}</span>`); });
  }

  // ── Envolturas
  wrap('_updateHUD', function (unit) { decorateHUD(unit); });
  wrap('_updateTimelineUI', function () { decorateTimeline(); });
  wrap('_showTurnBanner', function (unit) { decorateBanner(unit); });
  wrap('_showSpellTooltip', function (index) { showTip(index); });
  wrap('_hideSpellTooltip', function () { hideTip(); });
  // Selección: el estado .active de main.js se refleja como carta seleccionada; el tooltip se cierra al elegir
  const syncActive = () => {
    const sel = game.selectedSpell ? game.selectedSpellIndex : -1;
    for (let i = 0; i < SLOTS; i++) $('spell-slot-' + i)?.classList.toggle('active', i === sel);
    $('spell-slot-ult')?.classList.toggle('lk-is-selected', sel === ULT_INDEX);
  };
  wrap('_toggleSpellSelect', function () { hideTip(); syncActive(); });
  wrap('_clearSpellSelection', function () { syncActive(); });
  wrap('_showBattleHUD', function (show) {
    if (show) { if (logEl) logEl.innerHTML = ''; }
    else { hideTip(); enemyEl?.classList.remove('lk-is-on'); }
  });

  // PA que no alcanzan: destello rojo en el contador (antes de que main.js lo ignore)
  wrap('_toggleSpellSelect', null, function (index) {
    const u = game.activeUnit, s = spellAt(u, index);
    if (u && s && u.team === 'player' && u.currentPA < costNum(u, s)) {
      const m = q('[data-ref="mPA"]');
      if (m) { m.classList.remove('lk-is-flash'); void m.offsetWidth; m.classList.add('lk-is-flash'); }
    }
  });

  // Huecos 3–5 y Ultimate: main.js solo engancha 0–2, así que aquí se replica su comportamiento
  const inBattle = () => game.gameState === 'BATTLE';
  const select = (i) => { if (!inBattle()) return; game.audio?.init?.(); game._toggleSpellSelect(i); };
  const hover = (i, el) => { if (inBattle()) game._showSpellTooltip(i, { target: el, currentTarget: el }); };
  for (let i = MAIN_SLOTS; i < SLOTS; i++) {
    const el = $('spell-slot-' + i);
    if (!el) continue;
    el.addEventListener('click', () => select(i));
    el.addEventListener('mouseenter', () => hover(i, el));
    el.addEventListener('mouseleave', () => game._hideSpellTooltip());
  }
  const ultBtn = $('spell-slot-ult');
  if (ultBtn) {
    ultBtn.addEventListener('click', () => {
      if (hasUltimate(game)) {
        hideTip();
        if (ultimateView(game).ready) { game.audio?.init?.(); game._toggleUltimateSelect(); decorateUltimate(game.activeUnit); return; }
      } else {
        const u = game.activeUnit, { ready, mine } = ultState(u);
        if (ready && mine) { select(ULT_INDEX); return; }
      }
      ultBtn.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 240 });
    });
    ultBtn.addEventListener('mouseenter', () => { if (inBattle()) showTip(ULT_INDEX); });
    ultBtn.addEventListener('mouseleave', hideTip);
  }
  window.addEventListener('keydown', (e) => {
    if (!inBattle() || e.repeat || /input|textarea|select/i.test(e.target?.tagName || '')) return;
    const n = { Digit4: 3, Digit5: 4, Digit6: 5, Numpad4: 3, Numpad5: 4, Numpad6: 5, Digit7: ULT_INDEX, Numpad7: ULT_INDEX }[e.code];
    if (n === undefined) return;
    if (n === ULT_INDEX) {
      if (hasUltimate(game)) { game._toggleUltimateSelect(); decorateUltimate(game.activeUnit); return; }
      const u = game.activeUnit, { ready, mine } = ultState(u); if (!(ready && mine)) return;
    }
    game._toggleSpellSelect(n);
  });

  // ── Tablero limpio: sin paneles flotantes sobre las unidades; la información sale en un tooltip al señalarlas
  const hideOverheads = () => {
    (game.units || []).forEach((u) => { if (u?.hudSprite && u.hudSprite.visible) u.hudSprite.visible = false; });
  };
  const unitTip = document.createElement('div');
  unitTip.id = 'lk-cb-unit-tip';
  unitTip.className = 'lk-ui lk-tooltip-float lk-cb-unit-tip';
  document.body.appendChild(unitTip);
  const mouse = { x: 0, y: 0 };
  // La ficha se recoloca como mucho una vez por fotograma (el ratón manda varios eventos por fotograma)
  let placeRaf = 0;
  const schedulePlace = () => { if (!placeRaf) placeRaf = requestAnimationFrame(() => { placeRaf = 0; placeUnitTip(); }); };
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.onBoard = Boolean(e.target?.closest?.('#canvas-container')); if (!mouse.onBoard) hideUnitTip(); else schedulePlace(); }, { passive: true });
  let tipUnit = null;
  let unitTipLastHTML = '';
  let tipSize = null; // ancho y alto de la ficha: se miden solo cuando cambia su contenido

  function portraitOf(u) {
    const ps = window.portraitService || game.portraitService;
    const key = u?.config?.axieId || u?.modelType || u?.type || u?.id;
    try { return ps?.getPortraitSync?.(key) || ps?.getPortraitSync?.(u?.type) || null; } catch { return null; }
  }
  function unitTipHTML(u) {
    const ally = u.team === 'player';
    const k = classKey(u);
    const hp = Math.max(0, u.currentHP | 0), max = Math.max(1, u.maxHP | 0);
    const hpPct = Math.min(100, (hp / max) * 100);
    const sh = Math.max(0, u.shield | 0);
    const shPct = Math.min(100 - hpPct, (sh / max) * 100);
    const img = portraitOf(u) || document.querySelector(`#initiative-timeline .timeline-card img[alt="${CSS.escape(u.name || '')}"]`)?.src;
    const role = u.isGolem ? i18n.t('golems.role') : ally ? (k ? `${i18n.t('combatHud.ally')} · ${CLASS_LABEL[k] || k[0].toUpperCase() + k.slice(1)}` : i18n.t('combatHud.ally')) : (u.config?.tier ? i18n.t('combatHud.enemyLv', { n: u.config.tier }) : i18n.t('combatHud.enemy'));
    const turn = u === game.activeUnit ? `<span class="lk-cb-ut-now">${i18n.t('combatHud.theirTurn')}</span>` : '';
    const st = (u.statuses || []).map((s) => {
      const d = STATUS_DEFS[s.id] || {};
      const bad = d.kind === 'debuff';
      return `<span class="lk-cb-ut-st ${bad ? 'lk-is-bad' : 'lk-is-good'}">${statusIconHtml(s.id, s.icon || d.icon)} ${esc(s.label || d.label || s.id)}<b>${s.duration}</b></span>`;
    }).join('');
    return `<div class="lk-tooltip-tactical lk-cb-ut ${ally ? 'lk-is-ally' : 'lk-is-foe'}" style="--c:${tintOf(u)}">
      <header><span class="lk-cb-ut-por">${img ? `<img src="${img}" alt="">` : ''}</span><div><small>${role}</small><b>${esc(u.name)}</b></div>${turn}</header>
      <div class="lk-tt-body">
        <div><div class="lk-cb-ut-read"><span>${i18n.t('combatHud.hp')}</span><b>${hp}${sh ? ` <i>+${sh}</i>` : ''} / ${max}</b></div>
        <div class="lk-bar ${ally ? '' : 'lk-bar--enemy'}" style="--v:${hpPct}%"><i></i>${sh ? `<em style="left:${hpPct}%;width:${shPct}%"></em>` : ''}</div></div>
        ${u.isGolem ? `<p class="lk-cb-ut-golem">${esc(i18n.t(`golems.${u.golemKind}.passive`))}<br><small>${esc(i18n.t('golems.immune'))}</small></p>` : `<div class="lk-tt-stats">
          <span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}pa.png" alt="">${i18n.t('combatHud.paShort')}</i><b>${u.currentPA}</b></span>
          <span class="lk-tt-stat"><i class="lk-tl">${SVG_PM}${i18n.t('combatHud.pmShort')}</i><b>${u.currentPM}</b></span>
        </div>`}
        ${st ? `<div class="lk-cb-ut-sts">${st}</div>` : ''}
      </div></div>`;
  }
  function placeUnitTip() {
    if (!unitTip.classList.contains('lk-is-on')) return;
    if (!tipSize) { const r = unitTip.getBoundingClientRect(); tipSize = { width: r.width, height: r.height }; }
    const t = tipSize;
    let x = mouse.x + 18, y = mouse.y + 18;
    if (x + t.width > innerWidth - 8) x = mouse.x - t.width - 18;
    if (y + t.height > innerHeight - 8) y = mouse.y - t.height - 18;
    unitTip.style.left = Math.max(8, x) + 'px';
    unitTip.style.top = Math.max(8, y) + 'px';
  }
  function hideUnitTip() { tipUnit = null; if (unitTip.classList.contains('lk-is-on')) unitTip.classList.remove('lk-is-on'); }
  function refreshUnitTip() {
    if (!inBattle() || !mouse.onBoard || !game.hoverCell || game.activeUnit?.isMoving) { hideUnitTip(); return; }
    const tile = game.gridManager?.getTile?.(game.hoverCell.x, game.hoverCell.z);
    const u = tile?.unit;
    if (!u || u.isDead) { hideUnitTip(); return; }
    tipUnit = u;
    // Solo se reescribe (y se vuelve a medir) si cambió algo: misma unidad y mismos datos → nada que hacer
    const html = unitTipHTML(u);
    const wasOn = unitTip.classList.contains('lk-is-on');
    if (html !== unitTipLastHTML) { unitTip.innerHTML = html; unitTipLastHTML = html; tipSize = null; }
    if (!wasOn) { unitTip.classList.add('lk-is-on'); tipSize = null; }
    if (!wasOn || !tipSize) placeUnitTip(); else schedulePlace();
  }
  wrap('_handleHover', function () { hideOverheads(); refreshUnitTip(); });
  wrap('_updateTimelineUI', function () { hideOverheads(); });
  wrap('_updateHUD', function () { hideOverheads(); if (tipUnit) refreshUnitTip(); });
  wrap('_showBattleHUD', function (show) { if (!show) hideUnitTip(); else hideOverheads(); });
  // Los datos cambian tras cada golpe o curación: refresca el tooltip si está abierto
  if (ev && typeof ev.on === 'function') {
    ['unit:damaged', 'unit:healed', 'unit:shielded', 'unit:resourceLost', 'unit:resourceGained'].forEach((n) => ev.on(n, () => { if (tipUnit) setTimeout(refreshUnitTip, 0); }));
  }

  // Botón de sonido: main.js cambia su emoji; aquí se dibuja el icono equivalente
  const mute = $('btn-mute');
  if (mute) {
    const paint = () => {
      const off = /🔇/.test(mute.textContent) || mute.dataset.muted === '1';
      if (mute.dataset.paint === (off ? 'off' : 'on')) return;
      mute.dataset.paint = off ? 'off' : 'on';
      mute.innerHTML = off ? SVG_SOUND_OFF : SVG_SOUND_ON;
      mute.classList.toggle('lk-is-on', off);
    };
    new MutationObserver(() => {
      if (/🔇|🔊/.test(mute.textContent)) { mute.dataset.muted = /🔇/.test(mute.textContent) ? '1' : '0'; mute.dataset.paint = ''; paint(); }
    }).observe(mute, { childList: true, characterData: true, subtree: true });
    paint();
  }
}
