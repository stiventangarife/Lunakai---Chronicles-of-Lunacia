// PanelTour.js — Hito 126 · Recorrido de tarjetas sobre un panel (primera apertura del Escuadrón y del Koliseo).
//
// Tarjetas con «Siguiente» y «Saltar» que resaltan una zona del panel sin bloquearlo (no usa el velo del tutorial).
// La última puede llevar a un capítulo del Códice (data-codex).
//
// Hito 129 · patrón de «coach mark»:
//   · un foco fijo (.lk-sqt-spot) atenúa el resto de la pantalla y deja la zona explicada a la vista; se desliza de un
//     paso a otro y no bloquea los clics (pointer-events: none);
//   · la tarjeta lleva una flecha que apunta a esa zona (debajo o encima de ella);
//   · «Atrás», «Saltar» arriba a la derecha, y teclas → / Intro (siguiente), ← (atrás) y Esc (saltar);
//   · el foco del teclado pasa a la tarjeta y vuelve a donde estaba al terminar; la tarjeta se anuncia como diálogo.
//
// API: const tour = startPanelTour(owner, { steps, ns, codex, onDone(completed) }); tour.stop();
//   owner: el panel ({ isOpen, audio? }); se guarda en owner.__lkTour para que solo haya un recorrido a la vez.
//   steps: [{ el: () => Element, key, text?: () => string, scroll? }] · ns: prefijo i18n de los textos
//   (`${ns}.${key}Title`, `${ns}.${key}Text`, `${ns}.badge`, `${ns}.next`, `${ns}.back`, `${ns}.done`, `${ns}.skip`).

import * as i18n from '../../i18n/i18n.js';

let uid = 0;

export function startPanelTour(owner, { steps = [], ns, codex = null, onDone } = {}) {
  if (!owner?.isOpen || !steps.length) return null;
  owner.__lkTour?.stop(false);
  const STEPS = steps;
  const modal = owner;
  const id = `lk-sqt-${++uid}`;
  const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // Foco: un hueco con sombra enorme alrededor; pasa los clics a lo que hay debajo
  const spot = document.createElement('div');
  spot.className = 'lk-sqt-spot';
  spot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(spot);

  const card = document.createElement('div');
  card.className = 'lk-ui lk-sqt';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'false');
  card.setAttribute('aria-labelledby', `${id}-t`);
  card.setAttribute('aria-describedby', `${id}-d`);
  document.body.appendChild(card);

  let i = 0, target = null, alive = true, raf = 0;
  const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  const onKey = (e) => {
    if (!alive) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); back(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stop(true); } // Esc cierra el recorrido, no el panel
  };

  const text = (step) => (step.text ? step.text() : i18n.t(`${ns}.${step.key}Text`));
  const has = (k) => i18n.t(k) !== k;

  function render() {
    const step = STEPS[i];
    target?.classList.remove('lk-sqt-focus');
    target = step.el?.() || null;
    target?.classList.add('lk-sqt-focus');
    if (step.scroll) target?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    const last = i === STEPS.length - 1;
    const backLabel = has(`${ns}.back`) ? i18n.t(`${ns}.back`) : '‹';
    card.innerHTML = `
      <i class="lk-sqt__arrow" aria-hidden="true"></i>
      <div class="lk-sqt__head">
        <span class="lk-sqt__badge">${i18n.t(`${ns}.badge`, { n: i + 1, total: STEPS.length })}</span>
        ${last ? '' : `<button type="button" class="lk-sqt__skip" data-act="skip">${i18n.t(`${ns}.skip`)}</button>`}
      </div>
      <h4 class="lk-sqt__title" id="${id}-t">${i18n.t(`${ns}.${step.key}Title`)}</h4>
      <p class="lk-sqt__text" id="${id}-d">${text(step)}</p>
      ${last && codex ? `<button type="button" class="lk-sqt__codex" data-act="codex" data-codex="${codex}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>${i18n.t('codex.help')}</button>` : ''}
      <div class="lk-sqt__foot">
        <span class="lk-sqt__dots" aria-hidden="true">${STEPS.map((_, k) => `<i class="${k < i ? 'lk-is-done' : k === i ? 'lk-is-on' : ''}"></i>`).join('')}</span>
        <span class="lk-sqt__acts">
          ${i > 0 ? `<button type="button" class="lk-sqt__back" data-act="back" aria-keyshortcuts="ArrowLeft">${backLabel}</button>` : ''}
          <button type="button" class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="next" aria-keyshortcuts="ArrowRight Enter">${i18n.t(last ? `${ns}.done` : `${ns}.next`)}</button>
        </span>
      </div>`;
    card.querySelector('[data-act="next"]').addEventListener('click', next);
    card.querySelector('[data-act="back"]')?.addEventListener('click', back);
    card.querySelector('[data-act="skip"]')?.addEventListener('click', () => stop(true));
    card.querySelector('[data-act="codex"]')?.addEventListener('click', () => stop(true)); // el Códice lo abre su data-codex
    card.classList.remove('lk-sqt--in'); void card.offsetWidth; card.classList.add('lk-sqt--in');
    place();
    if (step.scroll) setTimeout(place, 320); // tras el desplazamiento suave
    card.querySelector('[data-act="next"]').focus({ preventScroll: true });
    modal.audio?.playClick?.();
  }

  /** El foco rodea la zona; la tarjeta va debajo (o encima si no cabe) con la flecha apuntando a su centro. */
  function place() {
    if (!alive) return;
    const r = target?.getBoundingClientRect();
    if (!r || (!r.width && !r.height)) { spot.classList.add('lk-is-off'); card.classList.add('lk-sqt--free'); return; }
    spot.classList.remove('lk-is-off');
    card.classList.remove('lk-sqt--free');
    const pad = 6;
    spot.style.transform = `translate(${Math.round(r.left - pad)}px, ${Math.round(r.top - pad)}px)`;
    spot.style.width = `${Math.round(r.width + pad * 2)}px`;
    spot.style.height = `${Math.round(r.height + pad * 2)}px`;

    const w = Math.min(360, innerWidth - 24);
    card.style.width = `${w}px`;
    const h = card.offsetHeight || 190;
    const gap = 16;
    let top = r.bottom + pad + gap, side = 'below';
    if (top + h > innerHeight - 12) { top = r.top - pad - gap - h; side = 'above'; }
    if (top < 12) { top = Math.max(12, innerHeight - h - 12); side = 'none'; } // zona muy alta: sin flecha
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12);
    const ax = Math.min(Math.max(22, r.left + r.width / 2 - left), w - 22);
    card.style.top = `${Math.round(top)}px`;
    card.style.left = `${Math.round(left)}px`;
    card.style.setProperty('--ax', `${Math.round(ax)}px`);
    card.dataset.side = side;
  }

  function next() {
    if (!alive) return;
    if (i >= STEPS.length - 1) { stop(true); return; }
    i++; render();
  }

  function back() {
    if (!alive || i === 0) return;
    i--; render();
  }

  /** completed = true: el jugador terminó o saltó (no se repite); false: se cerró el panel (se repite la próxima vez). */
  function stop(completed = false) {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    target?.classList.remove('lk-sqt-focus');
    card.remove();
    spot.remove();
    removeEventListener('resize', onResize);
    removeEventListener('scroll', onResize, true);
    removeEventListener('keydown', onKey, true);
    if (modal.__lkTour === api) modal.__lkTour = null;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    onDone?.(completed);
  }

  const api = { stop, get active() { return alive; } };
  modal.__lkTour = api;
  addEventListener('resize', onResize);
  addEventListener('scroll', onResize, true); // la zona puede moverse si el panel hace scroll
  addEventListener('keydown', onKey, true);
  render();
  return api;
}
