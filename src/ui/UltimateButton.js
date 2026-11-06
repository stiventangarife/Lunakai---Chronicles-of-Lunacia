// UltimateButton.js — Estado y tooltip del botón de la Duo Ultimate del HUD de combate.
//
// El botón lo dibuja CombatHUD (#spell-slot-ult, el medallón con anillo junto a las 6 cartas, tecla 7).
// Este módulo traduce el estado de tactics/combat/UltimateSystem.js a lo que el botón muestra:
//   --p (anillo)  = vínculo con el Axie principal (0–100)
//   data-ult      = locked (vínculo < 100 %) · wait (falta ronda 2, PA o es otro turno) · ready · used
//   texto         = «Vínculo 68 %», «Ronda 2», «Faltan PA», «Turno Sapidae», «Lista», «Usada»
// Al pulsarlo (o con la tecla 7) se llama a game._toggleUltimateSelect().

import { formatBond } from '../rpg/BondService.js';
import * as i18n from '../i18n/i18n.js';

const ICON = './assets/ui/icons/';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TRIAD_LABEL = { assault: i18n.t('combatUi.triadAssault'), bastion: i18n.t('combatUi.triadBastion'), torrent: i18n.t('combatUi.triadTorrent') };

/** ¿Hay sistema de Ultimates y una Ultimate para este combate? */
export function hasUltimate(game) {
  const u = game?.spellManager?.ultimates;
  return Boolean(u && u.spell && !u.isTutorial && !game.pvpBattle); // Arena PvP: sin Ultimate
}

/** Estado visual del botón para la unidad del turno. */
export function ultimateView(game, unit = game?.activeUnit) {
  const ult = game.spellManager.ultimates;
  const caster = unit && unit.team === 'player' ? unit : ult.sapidae;
  const check = ult.check(caster);
  const map = {
    bond: ['locked', i18n.t('combatUi.bondPct', { n: formatBond(ult.bond) })],
    used: ['used', i18n.t('combatUi.ultUsed')],
    axie_down: ['used', i18n.t('combatUi.axieDown')],
    round: ['wait', i18n.t('combatUi.round2')],
    pa: ['wait', i18n.t('combatUi.needPa')],
    not_sapidae: ['wait', i18n.t('combatUi.sapidaeTurn')],
    not_turn: ['wait', i18n.t('combatUi.sapidaeTurn')],
    ok: ['ready', i18n.t('combatUi.ultReady')],
  };
  const [state, label] = map[check.reason] || ['used', check.label || ''];
  return { state, label, bond: ult.bond, ready: check.ok, check, spell: ult.spell };
}

/** Aplica el estado al botón del HUD. */
export function paintUltimate(game, btn, unit = game?.activeUnit) {
  if (!btn) return;
  const wrap = btn.closest('.lk-cb-ult-wrap') || btn;
  if (!hasUltimate(game)) { wrap.hidden = true; return; }
  const v = ultimateView(game, unit);
  // Solo la lanza el Sapidae: en el turno del Axie principal el botón no aparece
  const sap = game.spellManager.ultimates.sapidae;
  wrap.hidden = !unit || !sap || unit !== sap;
  btn.dataset.ult = v.state;
  btn.style.setProperty('--p', v.bond);
  btn.classList.toggle('lk-is-ready', v.state === 'ready');
  btn.classList.toggle('lk-is-spent', v.state === 'used');
  btn.classList.toggle('lk-is-unaffordable', v.state === 'wait' && v.bond >= 100);
  btn.classList.toggle('lk-is-selected', game.selectedSpellIndex === ULTIMATE_SLOT && Boolean(game.selectedSpell?.isUltimate));
  const pct = btn.querySelector('[data-ref="ultPct"]');
  if (pct) pct.textContent = v.label;
  const glyph = btn.querySelector('.lk-cb-ult-glyph');
  if (glyph && v.spell && glyph.dataset.ult !== v.spell.id) {
    glyph.dataset.ult = v.spell.id;
    glyph.innerHTML = `<span class="lk-cb-ult-emoji">${esc(v.spell.icon || '✦')}</span>`;
  }
  btn.setAttribute('aria-label', `Ultimate: ${v.spell.name} · ${v.label}`);
}

/** Tooltip marfil con descripción y requisitos. */
export function ultimateTipHTML(game) {
  const ult = game.spellManager.ultimates;
  const s = ult.spell;
  if (!s) return '';
  const v = ultimateView(game);
  const range = s.minRange === s.maxRange ? `${s.minRange}` : `${s.minRange}–${s.maxRange}`;
  const round = game.turnManager?.round || 1;
  const req = [
    [i18n.t('combatUi.reqBond', { name: esc(ult.axie?.name || i18n.t('combatUi.yourAxie')) }), ult.bond >= 100, `${formatBond(ult.bond)}%`],
    [i18n.t('combatUi.reqRound'), round >= 2, i18n.t('combatUi.roundN', { n: round })],
    [i18n.t('combatUi.reqPa'), (ult.sapidae?.currentPA || 0) >= 6, i18n.t('combatUi.paN', { n: ult.sapidae?.currentPA ?? 0 })],
    [i18n.t('combatUi.reqOnce'), !ult.used, i18n.t('combatUi.usedLower')],
  ];
  return `<div class="lk-tooltip-tactical lk-ult-tip" style="--c:var(--lk-gilt-500)">
    <header><span class="lk-cb-tip-cls lk-ult-tip__ico">${esc(s.icon)}</span><div><small>Duo Ultimate · ${TRIAD_LABEL[s.triad] || ''}</small><b>${esc(s.name)}</b></div></header>
    <div class="lk-tt-body">
      <div class="lk-tt-stats">
        <span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}pa.png" alt="">${i18n.t('combatUi.cost')}</i><b>${i18n.t('combatUi.paN', { n: 6 })}</b></span>
        <span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${ICON}range.png" alt="">${i18n.t('combatUi.range')}</i><b>${i18n.t('combatUi.rangeShort')} ${range}</b></span>
      </div>
      <p>${esc(s.description)}</p>
      <ul class="lk-ult-req">${req.map(([t, ok, extra]) => `<li class="${ok ? 'lk-ok' : ''}">${ok ? '✓' : '·'} ${t}${!ok && extra ? ` <b>(${extra})</b>` : ''}</li>`).join('')}</ul>
      ${v.ready ? '' : `<p class="lk-cb-tip-warn">${esc(v.check.label)}</p>`}
    </div></div>`;
}

/** Índice de selección que usa el HUD para la Ultimate (spellIds[6], tecla 7). */
export const ULTIMATE_SLOT = 6;
