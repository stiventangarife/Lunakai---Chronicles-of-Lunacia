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

import { STATUS_DEFS } from '../tactics/combat/StatusSystem.js';
import { hasUltimate, paintUltimate, ultimateTipHTML, ultimateView } from './UltimateButton.js';

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
const CLASS_ICON_FILE = { mech: 'Mech', dawn: 'Dawn', dusk: 'Dusk' };
const classIcon = (k) => `./assets/classes/${CLASS_ICON_FILE[k] || k}.png`;
// Icono de la carta: la parte del cuerpo (assets/parts/<clase>-<parte>.png, ya pintada con el color de su clase).
// Mech, Dawn y Dusk no tienen iconos de partes: usan la parte de su iconClass y un filtro con el color de su clase.
// Hechizos sin parte (Sapidae, enemigos): el icono de la clase, como antes.
const PART_LABEL = { eyes: 'Ojos', ears: 'Orejas', mouth: 'Boca', horn: 'Cuerno', back: 'Espalda', tail: 'Cola' };
const CLASS_LABEL = { beast: 'Bestia', plant: 'Planta', aquatic: 'Acuático', bird: 'Pájaro', bug: 'Bicho', reptile: 'Reptil', mech: 'Mech', dawn: 'Dawn', dusk: 'Dusk' };
function spellIconHtml(spell, unit) {
  const ck = spellClassKey(spell, unit);
  if (spell?.part && PART_LABEL[spell.part]) {
    const src = spell.partIcon || `./assets/parts/${spell.iconClass || spell.class}-${spell.part}.png`;
    const alt = `${PART_LABEL[spell.part]} · ${CLASS_LABEL[ck] || ck || ''}`;
    return { html: `<img class="lk-part-ico lk-part-ico--${ck || 'none'}" src="${src}" alt="${alt}">`, title: `Carta de ${alt}` };
  }
  return ck ? { html: `<img src="${classIcon(ck)}" alt="${ck}">`, title: `Carta de clase ${CLASS_LABEL[ck] || ck}` } : null;
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
  if (mult !== 1) parts.push(`Nv ${unit.getSkillLevel?.(s.id) || 1} ×${String(mult).replace('.', ',')}`);
  const b0 = s.rcBase || s; // carta sin charms: el valor «de la carta» del desglose
  if (s.rcBase) parts.push('con charms');
  if (s.baseMinDamage) {
    const e = (s.effects || []).find((x) => x.type === 'damage');
    const hits = e && typeof e.hits === 'number' ? e.hits : 1;
    const min0 = e ? e.min : s.baseMinDamage / hits, max0 = e ? e.max : s.baseMaxDamage / hits;
    const flat = sm && unit && typeof sm._flatDamageBonus === 'function' ? sm._flatDamageBonus(unit, s, s.maxRange <= 1 ? 1 : 2) : 0;
    const pctSt = sm?.statuses && unit?.statuses?.length ? sm.statuses.mod(unit, 'damageDealtPct') : 0;
    // Runas del lanzador que no dependen del objetivo (Pure Power, Heart of Ocean…)
    const pctRc = sm?.runeCharms && unit?.rc ? sm.runeCharms.damagePct(unit, null, s.maxRange <= 1 ? 1 : 2, { spell: s }) : 0;
    const pct = pctSt + pctRc;
    if (flat) parts.push(`+${flat} atributos`);
    if (pctSt) parts.push(`${pctSt > 0 ? 'Potenciado' : 'Débil'} ${pctTxt(pctSt)}`);
    if (pctRc) parts.push(`Runa ${pctTxt(pctRc)}`);
    const f = (v) => Math.max(0, Math.round((Math.floor(v * mult) + flat) * (1 + pct / 100)) * hits);
    const lo = f(min0), hi = f(max0);
    return { kind: 'Ataque', cls: '', val: lo === hi ? `${lo}` : `${lo}–${hi}`, label: 'Daño', parts, boosted: lo !== b0.baseMinDamage || hi !== b0.baseMaxDamage, down: hi < b0.baseMaxDamage, base: b0.baseMinDamage === b0.baseMaxDamage ? `${b0.baseMinDamage}` : `${b0.baseMinDamage}–${b0.baseMaxDamage}` };
  }
  const sup = unit?.supportPower || 0;
  if (sup) parts.push(`Apoyo +${Math.round(sup)} %`);
  const g = (v) => Math.round(Math.floor(v * mult) * (1 + sup / 100));
  if (s.baseMinHeal) {
    const lo = g(s.baseMinHeal), hi = g(s.baseMaxHeal || s.baseMinHeal);
    return { kind: 'Apoyo', cls: 'lk-heal', val: `+${lo}${hi !== lo ? '–' + hi : ''}`, label: 'Curación', parts, boosted: lo !== b0.baseMinHeal, base: `+${b0.baseMinHeal}` };
  }
  if (s.shieldAmount) {
    const v = Math.round(Math.round(s.shieldAmount * mult) * (1 + sup / 100));
    return { kind: 'Escudo', cls: 'lk-shield', val: `+${v}`, label: 'Escudo', parts, boosted: v !== b0.shieldAmount, base: `+${b0.shieldAmount}` };
  }
  return { kind: 'Habilidad', cls: '', val: '', label: '', parts: [] };
}
function spellEffect(s, unit = null, sm = null) { return spellNumbers(s, unit, sm); }
const AREA = { single: 'Una casilla', cross1: 'Cruz (1)', cross2: 'Cruz (2)', line: 'Línea', circle1: 'Círculo (1)', square1: 'Cuadrado 3×3' };

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
        <div class="lk-round-badge" title="Ronda"><div><b id="round-number">1</b></div><span class="lk-rb-l">Ronda</span></div>
        <div id="initiative-timeline" class="initiative-bar lk-cb-timeline" aria-label="Orden de iniciativa"></div>
      </div>
      <span class="lk-cb-spacer"></span>
      <div class="header-actions lk-cb-tools">
        <button id="btn-options" class="icon-btn lk-btn-circle-icon" type="button" title="Opciones (Esc)" aria-label="Opciones"><img class="lk-ai" src="${ICON}setting.png" alt=""></button>
        <!-- El volumen vive ahora en Opciones › Audio; el botón se conserva oculto porque main.js lo usa -->
        <button id="btn-mute" class="icon-btn lk-btn-circle-icon" type="button" title="Silenciar música y sonido" hidden>🔊</button>
        <button id="btn-help" class="icon-btn lk-btn-circle-icon" type="button" title="Controles y reglas"><img class="lk-ai" src="${ICON}info.png" alt=""></button>
      </div>`;
  }

  const cams = ov.querySelector('.camera-controls');
  if (cams) {
    cams.className = 'camera-controls lk-ui lk-cb-cams';
    cams.innerHTML = `
      <button id="btn-cam-left" class="cam-btn lk-btn-circle-icon" type="button" title="Girar cámara a la izquierda (Q)">${SVG_ROT_L}<span class="lk-key">Q</span></button>
      <button id="btn-cam-reset" class="cam-btn lk-btn-circle-icon" type="button" title="Centrar en la unidad (R)">${SVG_FOCUS}<span class="lk-key">R</span></button>
      <button id="btn-cam-right" class="cam-btn lk-btn-circle-icon" type="button" title="Girar cámara a la derecha (E)">${SVG_ROT_R}<span class="lk-key">E</span></button>`;
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
            <div class="lk-bar-read"><span>Vida</span><span id="hud-hp-text">0 / 0</span></div>
            <div class="lk-bar lk-cb-hp"><i id="hud-hp-fill" style="width:100%"></i><em data-ref="shield" hidden></em></div>
            <div class="lk-cb-status" data-ref="status"></div>
          </div>
        </div>
        <div class="points-container lk-res-meters">
          <div class="lk-meter lk-meter--pa" data-ref="mPA" title="Puntos de acción: cada hechizo cuesta PA"><span class="lk-orb"><img class="lk-ai" src="${ICON}pa.png" alt=""></span><b id="hud-pa-count">6 / 6</b><span class="lk-pips" data-ref="paPips"></span></div>
          <div class="lk-meter lk-meter--pm" data-ref="mPM" title="Puntos de movimiento: una casilla por PM"><span class="lk-orb">${SVG_PM}</span><b id="hud-pm-count">3 / 3</b><span class="lk-pips" data-ref="pmPips"></span></div>
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
        <button id="btn-end-turn" class="end-turn-btn lk-btn lk-btn-primary-gold lk-btn-end-turn" type="button">Pasar turno<small>Espacio</small></button>
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
      <div class="lk-cb-fc__head"><b id="forecast-target-name">Objetivo</b><span id="forecast-target-hp" class="forecast-hp">0 / 0 HP</span></div>
      <div class="lk-cb-fc__body">
        <div id="forecast-damage-row" class="forecast-row"><span class="row-label">Daño estimado</span><b id="forecast-damage-val" class="damage-badge">—</b></div>
        <div id="forecast-push-row" class="forecast-row hidden"><span class="row-label">Empuje</span><b id="forecast-push-val" class="push-badge">—</b></div>
        <div id="forecast-collision-alert" class="collision-alert hidden">${SVG_WARN}Choca contra un obstáculo: +40 de daño</div>
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
  enemy.innerHTML = '<span class="lk-notice">Turno enemigo</span>';
  ov.appendChild(enemy);

  // El cartel de turno (#turn-banner) también lo usan los avisos de misión: aquí solo se le añade la clase base
  document.getElementById('turn-banner')?.classList.add('lk-ui');
}

/* ───────────────────────────── 2. Comportamiento ───────────────────────────── */
export function attachCombatHUD(game) {
  if (!game || game.__lkCombatHUD) return;
  game.__lkCombatHUD = true;
  const $ = (id) => document.getElementById(id);
  // Valor de carta modificado por nivel, atributos o estados: en verde; desglose en la ficha (19-oct)
  if (!document.getElementById('lk-cb-boost-style')) {
    const st = document.createElement('style');
    st.id = 'lk-cb-boost-style';
    st.textContent = '.lk-card-dmg.lk-is-boosted{color:#7ee08a}.lk-card-dmg.lk-is-reduced{color:#ff8a7a}.lk-cb-tip-calc{margin:6px 0 0;font-size:11px;opacity:.8}';
    document.head.appendChild(st);
  }
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

  const pips = (el, cur, max) => {
    if (!el) return;
    const n = Math.max(0, Math.min(12, max | 0));
    el.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < cur ? 'lk-on' : ''}"></i>`).join('');
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

    // Recursos: «6/6» y rombos
    const pa = Math.max(0, unit.currentPA | 0), pm = Math.max(0, unit.currentPM | 0);
    const paEl = $('hud-pa-count'), pmEl = $('hud-pm-count');
    if (paEl) paEl.textContent = `${pa}/${unit.maxPA}`;
    if (pmEl) pmEl.textContent = `${pm}/${unit.maxPM}`;
    pips(q('[data-ref="paPips"]'), pa, unit.maxPA);
    pips(q('[data-ref="pmPips"]'), pm, unit.maxPM);

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
        sh.title = `Escudo ${s}`;
      }
    }

    // Estados alterados
    const st = q('[data-ref="status"]');
    if (st) {
      const list = (unit.statuses || []).slice(0, 6);
      const defs = STATUS_DEFS;
      st.innerHTML = list.map((s) => {
        const label = s.label || defs?.[s.id]?.label || s.id;
        return `<span class="lk-cb-st" title="${esc(label)} · ${s.duration} turno${s.duration === 1 ? '' : 's'}">${esc(s.icon || defs?.[s.id]?.icon || '•')}<b>${s.duration}</b></span>`;
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
          else iconEl.textContent = s.icon || '⚔️';
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
      if (rng) rng.textContent = `AL ${rangeTxt(s)}${s.isLinear ? ' ↔' : ''}`;
      const los = slot.querySelector('[data-ref="los"]');
      if (los) { los.classList.toggle('lk-nolos', !s.requiresLoS); los.title = s.requiresLoS ? 'Requiere línea de visión' : 'No requiere línea de visión'; }
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
      slot.setAttribute('aria-label', `${s.name} · ${costOf(unit, s)} PA · alcance ${rangeTxt(s)}`);
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
    if (pct) pct.textContent = unit.ultimateUsed ? 'Usada' : ready ? 'Lista' : s ? `${Math.round(charge)}%` : 'Ultimate';
    btn.setAttribute('aria-label', s ? `Ultimate: ${s.name}` : 'Ultimate (aún no disponible)');
  }
  function ultTipHTML(unit) {
    if (hasUltimate(game)) return ultimateTipHTML(game);
    const { s, charge, ready } = ultState(unit);
    if (s) return tipHTML(unit, s).replace('· Ataque', '· Ultimate').replace('· Apoyo', '· Ultimate').replace('· Escudo', '· Ultimate').replace('· Habilidad', '· Ultimate');
    return `<div class="lk-tooltip-tactical" style="--c:var(--lk-gilt-500)"><header><span class="lk-cb-tip-cls lk-cb-tip-ult">${SVG_ULT}</span><div><small>${esc(unit?.name || '')} · Ultimate</small><b>Técnica definitiva</b></div></header>
      <div class="lk-tt-body"><div class="lk-tt-stats"><span class="lk-tt-stat">Carga<b>${Math.round(charge)}%</b></span><span class="lk-tt-stat">Usos<b>1 por combate</b></span></div>
      <p>Esta unidad todavía no tiene Ultimate. Cuando la tenga, el anillo se llenará durante el combate y podrás lanzarla una vez.</p></div></div>`;
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
    if (unit.team === 'player') { if (sub) sub.textContent = 'Turno de'; if (t) t.textContent = unit.name; }
    else { if (sub) sub.textContent = 'Turno enemigo'; if (t) t.textContent = unit.name; }
    banner.style.setProperty('--tint', tintOf(unit));
  }

  // ── Tooltip marfil del hechizo
  function tipHTML(unit, s) {
    const eff = spellEffect(s, unit, game.spellManager);
    const k = spellClassKey(s, unit);
    const tipIco = spellIconHtml(s, unit);
    const art = s.icon && /[/.]/.test(s.icon) ? s.icon : '';
    const stats = [
      `<span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}pa.png" alt="">Coste</i><b>${costOf(unit, s)} PA</b></span>`,
      `<span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}range.png" alt="">Alcance</i><b>AL ${rangeTxt(s)}</b></span>`,
      `<span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}vision.png" alt="">Visión</i><b>${s.requiresLoS ? 'Requiere' : 'No requiere'}</b></span>`,
      `<span class="lk-tt-stat">Área<b>${AREA[s.areaType] || 'Una casilla'}</b></span>`
    ];
    if (s.isLinear) stats.push(`<span class="lk-tt-stat">Lanzamiento<b>En línea</b></span>`);
    if (eff.label) stats.push(`<span class="lk-tt-stat">${eff.label}<b>${eff.val}</b></span>`);
    // Desglose: de dónde sale la diferencia con el valor de la carta (nivel, atributos, estados)
    const breakdown = eff.boosted && eff.parts?.length ? `<p class="lk-cb-tip-calc">Carta ${eff.base} · ${eff.parts.join(' · ')}</p>` : '';
    if (s.pushDistance) stats.push(`<span class="lk-tt-stat">Empuje<b>${s.pushDistance} casilla${s.pushDistance === 1 ? '' : 's'}</b></span>`);
    return `<div class="lk-tooltip-tactical" style="--c:${tintOf(unit)}${art ? `;--art:url('${art}')` : ''}">
      <header class="${art ? 'lk-has-art' : ''}">${tipIco ? `<span class="lk-cb-tip-cls${s?.part ? ' lk-has-part' : ''}" title="${tipIco.title}">${tipIco.html}</span>` : ''}<div><small>${esc(unit.name)} · ${eff.kind}${s.stage >= 2 ? ' · Parte de nivel 2' : ''}${s.collection ? ` · ${esc(String(s.collection).charAt(0).toUpperCase() + String(s.collection).slice(1))}` : ''}</small><b>${esc(s.name)}</b></div></header>
      <div class="lk-tt-body"><div class="lk-tt-stats">${stats.join('')}</div>${breakdown}<p>${esc(s.description || '')}</p>
      ${s.rcNotes?.length ? `<p class="lk-cb-tip-calc">Charms y runa: ${s.rcNotes.map(esc).join(' · ')}</p>` : ''}
      ${unit.team === 'player' && unit.currentPA < costNum(unit, s) ? `<p class="lk-cb-tip-warn">Te faltan ${costNum(unit, s) - unit.currentPA} PA para lanzarlo.</p>` : ''}</div></div>`;
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
  const names = (u) => `<b>${esc(u?.name || '¿?')}</b>`;
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
    ev.on('unit:damaged', ({ unit, source, spell, actual, isCrit }) => {
      if (!(actual > 0)) return;
      const from = source && source !== unit ? `${names(source)}${spell?.name ? ' · ' + esc(spell.name) : ''} → ` : '';
      log(`${from}${names(unit)} · <span class="lk-cb-dmg">${actual}${isCrit ? ' crítico' : ''}</span>`, isCrit ? 'lk-is-crit' : '');
      if (unit?.currentHP <= 0) log(`${names(unit)} ha caído`, 'lk-is-ko');
    });
    ev.on('unit:healed', ({ unit, amount }) => { if (amount > 0) log(`${names(unit)} · <span class="lk-cb-heal">+${amount}</span>`); });
    ev.on('unit:shielded', ({ unit, amount }) => { if (amount > 0) log(`${names(unit)} · <span class="lk-cb-shield">escudo +${amount}</span>`); });
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
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.onBoard = Boolean(e.target?.closest?.('#canvas-container')); if (!mouse.onBoard) hideUnitTip(); else placeUnitTip(); }, { passive: true });
  let tipUnit = null;

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
    const role = ally ? (k ? `Aliado · ${k[0].toUpperCase() + k.slice(1)}` : 'Aliado') : (u.config?.tier ? `Enemigo · Nv. ${u.config.tier}` : 'Enemigo');
    const turn = u === game.activeUnit ? '<span class="lk-cb-ut-now">Su turno</span>' : '';
    const st = (u.statuses || []).map((s) => {
      const d = STATUS_DEFS[s.id] || {};
      const bad = d.kind === 'debuff';
      return `<span class="lk-cb-ut-st ${bad ? 'lk-is-bad' : 'lk-is-good'}">${esc(s.icon || d.icon || '•')} ${esc(s.label || d.label || s.id)}<b>${s.duration}</b></span>`;
    }).join('');
    return `<div class="lk-tooltip-tactical lk-cb-ut" style="--c:${tintOf(u)}">
      <header><span class="lk-cb-ut-por">${img ? `<img src="${img}" alt="">` : ''}</span><div><small>${role}</small><b>${esc(u.name)}</b></div>${turn}</header>
      <div class="lk-tt-body">
        <div><div class="lk-cb-ut-read"><span>Vida</span><b>${hp}${sh ? ` <i>+${sh}</i>` : ''} / ${max}</b></div>
        <div class="lk-bar ${ally ? '' : 'lk-bar--enemy'}" style="--v:${hpPct}%"><i></i>${sh ? `<em style="left:${hpPct}%;width:${shPct}%"></em>` : ''}</div></div>
        <div class="lk-tt-stats">
          <span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}pa.png" alt="">PA</i><b>${u.currentPA}/${u.maxPA}</b></span>
          <span class="lk-tt-stat"><i class="lk-tl">${SVG_PM}PM</i><b>${u.currentPM}/${u.maxPM}</b></span>
        </div>
        ${st ? `<div class="lk-cb-ut-sts">${st}</div>` : ''}
      </div></div>`;
  }
  function placeUnitTip() {
    if (!unitTip.classList.contains('lk-is-on')) return;
    const t = unitTip.getBoundingClientRect();
    let x = mouse.x + 18, y = mouse.y + 18;
    if (x + t.width > innerWidth - 8) x = mouse.x - t.width - 18;
    if (y + t.height > innerHeight - 8) y = mouse.y - t.height - 18;
    unitTip.style.left = Math.max(8, x) + 'px';
    unitTip.style.top = Math.max(8, y) + 'px';
  }
  function hideUnitTip() { tipUnit = null; unitTip.classList.remove('lk-is-on'); }
  function refreshUnitTip() {
    if (!inBattle() || !mouse.onBoard || !game.hoverCell || game.activeUnit?.isMoving) { hideUnitTip(); return; }
    const tile = game.gridManager?.getTile?.(game.hoverCell.x, game.hoverCell.z);
    const u = tile?.unit;
    if (!u || u.isDead) { hideUnitTip(); return; }
    tipUnit = u;
    unitTip.innerHTML = unitTipHTML(u);
    unitTip.classList.add('lk-is-on');
    placeUnitTip();
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
