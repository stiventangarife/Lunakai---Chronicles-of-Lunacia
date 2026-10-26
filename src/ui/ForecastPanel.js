// ForecastPanel.js — Pinta el pronóstico (combat/Forecast.js) dentro de la tarjeta #combat-forecast del HUD.
// Añade sus filas en un contenedor propio (#forecast-extra) para no depender del marcado de CombatHUD.js.

import { forecast, elementalLabel } from '../tactics/combat/Forecast.js';
import * as i18n from '../i18n/i18n.js';

const CSS = `
#ui-overlay .lk-fc-extra { display: grid; gap: 5px; }
#ui-overlay .lk-fc-extra:empty { display: none; }
#ui-overlay .lk-fc-row { display: flex; justify-content: space-between; gap: 10px; font: 700 .76rem/1.25 var(--lk-font-ui, system-ui); color: var(--lk-ink-600, #4a4458); }
#ui-overlay .lk-fc-row b { font-weight: 900; color: var(--lk-ink-900, #1d1a26); white-space: nowrap; }
#ui-overlay .lk-fc-good b, #ui-overlay .lk-fc-good { color: #2f7d4f; }
#ui-overlay .lk-fc-bad b, #ui-overlay .lk-fc-bad { color: #b3423c; }
#ui-overlay .lk-fc-lethal { justify-content: center; padding: 3px 8px; border-radius: 999px; background: #b3423c; color: #fff; font-weight: 900; letter-spacing: .02em; }
#ui-overlay .lk-fc-maykill { justify-content: center; padding: 3px 8px; border-radius: 999px; background: #f6d7c9; color: #8a2f22; font-weight: 800; }
#ui-overlay .lk-fc-chips { display: flex; flex-wrap: wrap; gap: 4px; }
#ui-overlay .lk-fc-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 999px; font: 800 .7rem var(--lk-font-ui, system-ui); background: #e7f3ea; color: #2f7d4f; }
#ui-overlay .lk-fc-chip.lk-is-bad { background: #f8e1df; color: #b3423c; }
#ui-overlay .lk-fc-note { font: 600 .7rem/1.3 var(--lk-font-ui, system-ui); color: var(--lk-ink-600, #4a4458); }
`;

let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const range = (a, b) => (a === b ? `${a}` : `${a}–${b}`);

function extraBox() {
  if (!styled) { const st = document.createElement('style'); st.id = 'lk-forecast-css'; st.textContent = CSS; document.head.appendChild(st); styled = true; }
  const body = document.querySelector('#combat-forecast .lk-cb-fc__body') || document.getElementById('combat-forecast');
  if (!body) return null;
  let box = document.getElementById('forecast-extra');
  if (!box) {
    box = document.createElement('div');
    box.id = 'forecast-extra';
    box.className = 'lk-fc-extra';
    const dmgRow = document.getElementById('forecast-damage-row');
    if (dmgRow && dmgRow.parentNode === body) dmgRow.after(box); else body.appendChild(box);
  }
  return box;
}

/**
 * Rellena la tarjeta de pronóstico. Devuelve el resultado del pronóstico (o null si no hay nada que mostrar).
 * game: instancia del juego (spellManager, activeUnit); target: unidad bajo el cursor; cell: casilla objetivo.
 */
export function renderForecast(game, target, spell, cell = null) {
  const sm = game.spellManager, caster = game.activeUnit;
  const at = cell || (target ? { x: target.gridX, z: target.gridZ } : null);
  const fc = forecast(sm, caster, spell, at);
  const box = extraBox();
  const dmgVal = document.getElementById('forecast-damage-val');
  const dmgRow = document.getElementById('forecast-damage-row');
  if (!fc || !box) return null;

  const main = fc.targets.find((r) => r.unit === target) || fc.targets[0] || null;
  const html = [];

  // Fila principal: daño, cura o escudo sobre el objetivo bajo el cursor
  if (main?.damage) {
    dmgRow?.classList.remove('hidden');
    if (dmgVal) dmgVal.textContent = range(main.damage.min, main.damage.max) + (main.damage.hits > 1 ? ` ${i18n.t('combatUi.hitsN', { n: main.damage.hits })}` : '');
    const el = elementalLabel(main.damage.elemental);
    if (el) html.push(`<div class="lk-fc-row lk-fc-${el.kind}"><span>${esc(el.text)}</span></div>`);
    if (main.damage.barrier) html.push(`<div class="lk-fc-row"><span>${i18n.t('combatUi.barrierAbsorbs')}</span><b>${main.damage.barrier}</b></div>`);
    if (main.damage.shieldMax > 0) html.push(`<div class="lk-fc-row"><span>${i18n.t('combatUi.shieldAbsorbs')}</span><b>${range(main.damage.shieldMin, main.damage.shieldMax)}</b></div>`);
    if (fc.critChance > 0) html.push(`<div class="lk-fc-row"><span>${i18n.t('combatUi.critPct', { n: Math.round(fc.critChance * 100) })}</span><b>${i18n.t('combatUi.upTo', { n: main.damage.critMax })}</b></div>`);
    if (main.damage.lethal) html.push(`<div class="lk-fc-row lk-fc-lethal">✖ ${i18n.t('combatUi.lethal')}</div>`);
    else if (main.damage.mayKill) html.push(`<div class="lk-fc-row lk-fc-maykill">${i18n.t('combatUi.mayKill')}</div>`);
  } else if (main && (main.heal || main.shield)) {
    dmgRow?.classList.add('hidden');
  } else if (dmgVal) {
    dmgVal.textContent = '—';
  }
  if (main?.heal) html.push(`<div class="lk-fc-row lk-fc-good"><span>${i18n.t('combatUi.heal')}</span><b>+${main.heal} HP</b></div>`);
  if (main?.shield) html.push(`<div class="lk-fc-row lk-fc-good"><span>${i18n.t('combatUi.shield')}</span><b>+${main.shield}</b></div>`);
  if (main?.statuses.length) {
    html.push(`<div class="lk-fc-chips">${main.statuses.map((s) => `<span class="lk-fc-chip ${s.kind === 'debuff' ? 'lk-is-bad' : ''}">${esc(s.icon)} ${esc(s.label)}${s.duration ? ` · ${s.duration}t` : ''}</span>`).join('')}</div>`);
  }
  for (const n of main?.notes || []) html.push(`<div class="lk-fc-note">${esc(n)}</div>`);

  // Resto de unidades afectadas (áreas, «a todos los aliados»…)
  const others = fc.targets.filter((r) => r !== main && (r.damage || r.heal || r.shield || r.statuses.length));
  if (others.length) {
    const foes = others.filter((r) => r.unit.team !== caster.team && r.damage);
    const allies = others.filter((r) => r.unit.team === caster.team);
    if (foes.length) {
      const lethal = foes.filter((r) => r.damage.lethal).length;
      html.push(`<div class="lk-fc-row"><span>${i18n.t(foes.length > 1 ? 'combatUi.foesInArea' : 'combatUi.foeInArea', { n: foes.length })}</span><b>${range(foes.reduce((s, r) => s + r.damage.min, 0), foes.reduce((s, r) => s + r.damage.max, 0))}</b></div>`);
      if (lethal) html.push(`<div class="lk-fc-note">✖ ${i18n.t(lethal > 1 ? 'combatUi.wouldFallN' : 'combatUi.wouldFall1', { n: lethal })}</div>`);
    }
    const hit = allies.filter((r) => r.damage);
    if (hit.length) html.push(`<div class="lk-fc-row lk-fc-bad"><span>! ${i18n.t(hit.length > 1 ? 'combatUi.hitsAlliesN' : 'combatUi.hitsAlly1', { n: hit.length })}</span></div>`);
    const helped = allies.filter((r) => r.heal || r.shield || r.statuses.length);
    if (helped.length) html.push(`<div class="lk-fc-note">${i18n.t(helped.length > 1 ? 'combatUi.alsoAlliesN' : 'combatUi.alsoAlly1', { n: helped.length })}</div>`);
  }

  box.innerHTML = html.join('');
  return fc;
}

export function clearForecast() {
  const box = document.getElementById('forecast-extra');
  if (box) box.innerHTML = '';
  document.getElementById('forecast-damage-row')?.classList.remove('hidden');
}
