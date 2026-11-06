// RewardCard.js — Tarjeta «Recompensa» (título, iconos con cantidad y una nota). Se cierra con clic, Espacio, Intro,
// Escape o E, o sola a los 6 s (autoCloseMs; 0 = espera al jugador). La usan el tutorial y abrir bolsas de runa o de charm (Hito 54).

import * as i18n from '../i18n/i18n.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RC = { common: '#3a4a6e', rare: '#2a5a8a', epic: '#5a2a8a', mystic: '#8a6a1a' };

/**
 * @param {{ title: string, items?: {icon?:string, name:string, qty?:number, rarity?:string}[], note?: string, audio?: object, autoCloseMs?: number }} o
 * @returns {Promise<void>} cuando se cierra
 */
export function showRewardCard({ title, items = [], note = '', audio = null, autoCloseMs = 6000 }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'lk-ui lk-reward';
    el.setAttribute('role', 'dialog');
    el.innerHTML = `<span class="lk-reward__kicker">${i18n.t('reward.kicker')}</span><h3 class="lk-reward__title">${esc(title)}</h3>
      <div class="lk-reward__items">${items.map((it) => `<div class="lk-reward__it"><span class="lk-reward__ico" style="--rc:${RC[it.rarity] || '#3a4a6e'}">${it.icon ? `<img src="${esc(it.icon)}" alt="">` : '<span>✦</span>'}${it.qty > 1 ? `<em>×${it.qty}</em>` : ''}</span><b>${esc(it.name)}</b></div>`).join('')}</div>
      ${note ? `<p class="lk-reward__note">${note}</p>` : ''}<div class="lk-reward__hint">${i18n.t('reward.hint')}</div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('lk-is-on'));
    try { audio?.playBuff?.(); } catch { /* nada */ }
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      window.removeEventListener('keydown', onKey, true);
      el.classList.remove('lk-is-on');
      setTimeout(() => el.remove(), 400);
      resolve();
    };
    const onKey = (e) => { if (['Space', 'Enter', 'Escape', 'KeyE'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    setTimeout(() => window.addEventListener('keydown', onKey, true), 350);
    el.addEventListener('click', close);
    if (autoCloseMs > 0) setTimeout(close, autoCloseMs);
  });
}
