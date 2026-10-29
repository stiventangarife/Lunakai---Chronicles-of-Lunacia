// Lunakai · Crónica Celeste — utilidades compartidas de UI.
// Las clases son las del sistema de diseño con prefijo lk- (ver ds.generated.css):
//   .btn → .lk-btn · .b-ico → .lk-b-ico · .is-on → .lk-is-on · .panel-modal-window → .lk-panel-modal-window
// Uso: import { icon, sprite, portrait, toast, tooltip, skillTip, h } from './ui/lk.js';

import * as i18n from '../i18n/i18n.js';

const BASE = new URL('../../', import.meta.url); // raíz del juego (axie-tactics-web/)
export const asset = (path) => new URL(path, BASE).href;

/** Crea un elemento a partir de HTML (primer nodo). */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Escapa texto para insertarlo en HTML. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Ícono PNG del sistema (assets/ui/icons/<name>.png). ink=true para fondos claros. */
export const icon = (name, { ink = false } = {}) => `<img class="lk-ai ${ink ? 'lk-ink' : ''}" src="${asset(`assets/ui/icons/${name}.png`)}" alt="">`;

/** Sigilo SVG del sprite (assets/ui/sprite.svg#<id>). fill=true para los rellenos (PA, luna). */
export const sprite = (id, { fill = false } = {}) => `<svg class="lk-ic ${fill ? 'lk-fill' : ''}" aria-hidden="true"><use href="${asset('assets/ui/sprite.svg')}#${id}"/></svg>`;

/** Ícono de clase de axie (assets/classes/<cls>.png). */
const CLASS_FILE = { dusk: 'dust' }; // los PNG están en minúsculas; el de Dusk se llama dust.png
/** Ícono de moneda (assets/currency/<k>.webp, 64 px): gold · slp · baxs. Cambiar aquí la extensión para todo el juego. */
export const curIcon = (k) => asset(`assets/currency/${k}.webp`);
export const classIcon = (cls) => `<img src="${asset(`assets/classes/${CLASS_FILE[cls] || cls}.png`)}" alt="${esc(cls)}">`;

/**
 * Retrato: medallón del sistema (.lk-med) con la imagen real del juego.
 * opts: { size, cls (clase de axie → color y escudo), bond (0-100 → anillo de vínculo) }
 */
export function portrait(src, { size = 56, cls = null, bond = null, alt = '' } = {}) {
  const cc = cls ? `var(--lk-class-${cls})` : 'var(--lk-gilt-300)';
  const url = /^(https?:|data:|blob:|\/)/.test(src) ? src : asset(src);
  return `<span class="lk-pfw ${bond != null ? 'lk-bond' : ''}" style="${bond != null ? `--b:${bond}` : ''}">`
    + `<span class="lk-med" style="--cc:${cc};--s:${size}px"><img src="${url}" alt="${esc(alt)}"></span>`
    + (cls ? `<span class="lk-cb">${classIcon(cls)}</span>` : '')
    + '</span>';
}

/** Aviso tipo banner (igual que el sistema de diseño). toast('Guardado') · toast('Sin PP', true) */
let toastEl = null, toastTimer = null;
export function toast(text, warn = false) {
  if (!toastEl) { toastEl = h('<div class="lk-toast lk-ui" role="status" aria-live="polite"></div>'); document.body.appendChild(toastEl); }
  toastEl.innerHTML = `<div class="lk-notice ${warn ? 'lk-warn' : ''}">${esc(text)}</div>`;
  toastEl.classList.add('lk-is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('lk-is-on'), 2200);
}

/**
 * Tooltip flotante compartido (.lk-tooltip-float). Oculto nunca recibe clics.
 * tooltip.show(anchor, html) · tooltip.hide() · tooltip.attach(el, () => html)
 */
export const tooltip = (() => {
  let el = null, current = null;
  const ensure = () => { if (!el) { el = h('<div class="lk-tooltip-float lk-ui" role="tooltip"></div>'); document.body.appendChild(el); } return el; };
  const api = {
    show(anchor, html) {
      const t = ensure();
      current = anchor;
      if (html != null) t.innerHTML = html;
      t.classList.add('lk-is-on');
      const r = anchor.getBoundingClientRect(), w = t.offsetWidth, hh = t.offsetHeight;
      let x = r.left + r.width / 2 - w / 2, y = r.top - hh - 14;
      if (y < 8) y = r.bottom + 14;
      t.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, x))}px`;
      t.style.top = `${Math.max(8, Math.min(innerHeight - hh - 8, y))}px`;
    },
    hide() { current = null; el?.classList.remove('lk-is-on'); },
    /** Ratón, foco de teclado y toque (pulsación larga) sobre un elemento. */
    attach(target, getHtml) {
      const show = () => api.show(target, getHtml());
      target.addEventListener('mouseenter', show);
      target.addEventListener('mouseleave', api.hide);
      target.addEventListener('focus', show);
      target.addEventListener('blur', api.hide);
      let lp;
      target.addEventListener('touchstart', () => { lp = setTimeout(show, 350); }, { passive: true });
      target.addEventListener('touchend', () => { clearTimeout(lp); setTimeout(api.hide, 1600); });
      return target;
    }
  };
  // Al hacer scroll se recoloca junto a su ancla si sigue bajo el ratón o con foco; si no, se oculta.
  addEventListener('scroll', () => {
    if (current && current.isConnected && current.matches(':hover, :focus')) api.show(current, null);
    else api.hide();
  }, true);
  return api;
})();

/**
 * Ficha de habilidad para el tooltip, con la misma estructura que el sistema de diseño (.lk-tooltip-tactical).
 * { name, kind, cost, range, los, fx: 'dmg'|'heal'|'shield'|otro, value, effectLabel, desc, art (url), color, iconHtml }
 * spell (opcional, Hito 97): la carta de SPELLS_DB, para mostrar su recarga, espera inicial y usos.
 * warn (opcional, Hito 98): aviso en rojo al final (p. ej. «se desbloquea a nivel 3»).
 */
export function skillTip({ name, kind = i18n.t('common.skill'), cost, range, los = true, fx, value, effectLabel = i18n.t('common.effect'), desc = '', art = null, color = 'var(--lk-gilt-500)', iconHtml = '', spell = null, warn = '' }) {
  const eff = fx === 'dmg' ? [i18n.t('common.damage'), value] : fx === 'heal' ? [i18n.t('common.healing'), `+${value}`] : fx === 'shield' ? [i18n.t('common.shield'), `+${value}`] : [effectLabel, value];
  const losIcon = los ? icon('vision') : `<span class="lk-nolos-ai">${icon('vision')}</span>`;
  const artAbs = art ? new URL(art, document.baseURI).href : null; // url() en variables CSS se resuelve contra la hoja de estilos: se usa la ruta absoluta
  return `<div class="lk-tooltip-tactical" style="--c:${color}${artAbs ? `;--art:url('${artAbs}')` : ''}">`
    + `<header class="${art ? 'lk-has-art' : ''}">${iconHtml ? `<span class="lk-sigil">${iconHtml}</span>` : ''}<div><small>${esc(kind)}</small><b>${esc(name)}</b></div></header>`
    + `<div class="lk-tt-body"><div class="lk-tt-stats">`
    + (cost != null ? `<span class="lk-tt-stat"><i class="lk-tl">${icon('pa')}${i18n.t('common.cost')}</i><b>${i18n.t('common.paN', { n: cost })}</b></span>` : '')
    + (range != null ? `<span class="lk-tt-stat"><i class="lk-tl">${icon('range')}${i18n.t('common.range')}</i><b>${i18n.t('common.rangeShort')} ${esc(range)}</b></span>` : '')
    + `<span class="lk-tt-stat"><i class="lk-tl">${losIcon}${i18n.t('common.vision')}</i><b>${los ? i18n.t('common.required') : i18n.t('common.notRequired')}</b></span>`
    + (eff[1] != null ? `<span class="lk-tt-stat">${esc(eff[0])}<b>${esc(eff[1])}</b></span>` : '')
    + spellLimitStats(spell)
    + `</div>${desc ? `<p>${desc}</p>` : ''}${warn ? `<p class="lk-cb-tip-warn">${esc(warn)}</p>` : ''}</div></div>`;
}

/** Hito 97: líneas de recarga, espera inicial y usos de una carta para las fichas (vacío si no tiene límites). */
export function spellLimitStats(sp) {
  if (!sp) return '';
  const turns = (n) => i18n.t(n === 1 ? 'combatHud.turn1' : 'combatHud.turnsN', { n });
  const out = [];
  if (sp.cooldown) out.push(`<span class="lk-tt-stat">${i18n.t('combatHud.cooldown')}<b>${turns(sp.cooldown)}</b></span>`);
  if (sp.initialCooldown) out.push(`<span class="lk-tt-stat">${i18n.t('combatHud.initialCd')}<b>${turns(sp.initialCooldown)}</b></span>`);
  const uses = [sp.castsPerTurn ? i18n.t('combatHud.perTurnN', { n: sp.castsPerTurn }) : '', sp.castsPerTarget ? i18n.t('combatHud.perTargetN', { n: sp.castsPerTarget }) : ''].filter(Boolean);
  if (uses.length) out.push(`<span class="lk-tt-stat">${i18n.t('combatHud.uses')}<b>${uses.join(' · ')}</b></span>`);
  return out.join('');
}

/** Interruptor (.lk-switch con role="switch" y aria-checked). */
export function bindSwitch(btn, onChange) {
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(on));
    onChange?.(on);
  });
}

/** Deslizador dorado (.lk-range): actualiza --v. */
export function bindRange(input, onInput) {
  const paint = () => input.style.setProperty('--v', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
  paint();
  input.addEventListener('input', () => { paint(); onInput?.(Number(input.value)); });
  return paint;
}

/** Segmentado (.lk-segmented). Devuelve data-v o el texto. */
export function bindSeg(group, onChange) {
  const btns = [...group.querySelectorAll('button')];
  btns.forEach((b) => b.addEventListener('click', () => {
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onChange?.(b.dataset.v ?? b.textContent.trim());
  }));
}

/** Ventana modal (.lk-backdrop > .lk-panel-modal-window). Esc y clic fuera cierran. */
export function modal(backdrop, { onClose } = {}) {
  const open = () => { backdrop.classList.add('lk-is-open'); backdrop.setAttribute('aria-hidden', 'false'); backdrop.querySelector('[data-autofocus], button')?.focus({ preventScroll: true }); };
  const close = () => { backdrop.classList.remove('lk-is-open'); backdrop.setAttribute('aria-hidden', 'true'); tooltip.hide(); onClose?.(); };
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('lk-is-open')) { const c = backdrop.querySelector('.lk-confirm.lk-is-on'); if (c) c.classList.remove('lk-is-on'); else close(); } });
  return { open, close, get isOpen() { return backdrop.classList.contains('lk-is-open'); } };
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
