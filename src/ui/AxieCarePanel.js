// AxieCarePanel.js — Panel flotante de Axie Care en el mundo abierto.
//
// · Clic (sin arrastrar la cámara) sobre el Axie compañero → panel anclado sobre él: vínculo, estado de ánimo,
//   Acariciar (+5 %, con recarga), comida del inventario (+3/+5/+8 %) y progreso del paseo (+0,5 % cada 500 m).
// · Cuenta el tiempo de juego para la bajada del vínculo sin cuidados (AxieCareService.tickPlay).
// · Al pasar el ratón por encima del compañero el cursor cambia a una mano.
// · Corazones flotantes y un saltito del Axie al acariciarlo o darle de comer.
// · Cuenta los metros caminados juntos mientras se explora (sin teletransportes ni transiciones).
// La lógica (y el guardado) está en rpg/AxieCareService.js; este módulo solo lee la escena y pinta.

import { formatBond } from '../rpg/BondService.js';
import * as THREE from 'three';
import { AxieCareService, PET_BOND, PET_COOLDOWN_MS, WALK_STEP_METERS, WALK_BOND } from '../rpg/AxieCareService.js';
import { portraitService } from '../tactics/CharacterPortraitService.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import { toast } from './lk.js';
import * as i18n from '../i18n/i18n.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CLICK_SLOP = 6;           // px: más movimiento = arrastre de cámara, no clic
const MAX_PANEL_DIST = 9;       // m: si el jugador se aleja más, el panel se cierra
const MAX_STEP = 3;             // m por fotograma: más = teletransporte o cambio de zona (no cuenta)
const fmtTime = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function attachAxieCare(game) {
  const ow = game.overworldManager;
  if (!ow || game.__lkAxieCare) return null;
  game.__lkAxieCare = true;

  const service = new AxieCareService({
    equipmentManager: game.equipmentManager,
    itemsDb: ITEMS_DB,
    onSave: () => { try { game._saveCurrentProgress?.(); } catch { /* nada */ } },
  });
  window.lunakaiAxieCare = service;

  // ------------------------------------------------------------------ DOM
  const panel = document.createElement('div');
  panel.className = 'lk-ui lk-care';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', i18n.t('care.dialogLabel'));
  document.body.appendChild(panel);
  const fx = document.createElement('div');
  fx.className = 'lk-care-fx';
  document.body.appendChild(fx);

  const container = ow.container || document.getElementById('canvas-container');
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Vector3();
  let open = false;
  let pressed = null;
  let lastPos = null;
  let tickTimer = 0;
  let placed = null;

  const player = () => ow.player;
  const companion = () => player()?.companionGroup || null;
  const exploring = () => ow.state === 'EXPLORING' && !(typeof ow.isAnyModalOpen === 'function' && ow.isAnyModalOpen());
  const companionName = () => player()?.companionName || game.equipmentManager?.heroesBase?.[service.companionId()]?.name || i18n.t('care.yourAxie');

  /** Posición en pantalla de un punto sobre el compañero (alto en metros). */
  function screenOf(height = 1.5) {
    const c = companion();
    const cam = ow.camera;
    if (!c || !cam) return null;
    c.getWorldPosition(tmp);
    tmp.y += height;
    tmp.project(cam);
    if (tmp.z > 1) return null; // detrás de la cámara
    const r = container.getBoundingClientRect();
    return { x: r.left + (tmp.x + 1) / 2 * r.width, y: r.top + (1 - tmp.y) / 2 * r.height };
  }

  /** ¿El puntero está sobre el compañero? Rayo contra la malla y, de respaldo, distancia en pantalla. */
  function hitsCompanion(clientX, clientY) {
    const c = companion();
    const cam = ow.camera;
    if (!c || !c.visible || !cam) return false;
    const r = container.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, cam);
    try { if (raycaster.intersectObject(c, true).length) return true; } catch { /* mallas sin geometría */ }
    const p = screenOf(0.55);
    if (!p) return false;
    c.getWorldPosition(tmp);
    const dist = cam.position.distanceTo(tmp);
    const radius = THREE.MathUtils.clamp(520 / Math.max(1, dist), 26, 90);
    return Math.hypot(clientX - p.x, clientY - p.y) < radius;
  }

  // ------------------------------------------------------------------ pintar
  // Estados del vínculo (maqueta «09 · Vínculo Supremo»): qué significa cada tramo en combate
  const STATES = [
    { id: 'neglected', max: 25, t: i18n.t('care.stNeglected'), c: '#FFB4AE', d: i18n.t('care.stNeglectedDesc') },
    { id: 'neutral', max: 50, t: i18n.t('care.stNeutral'), c: '#EED39A', d: i18n.t('care.stNeutralDesc') },
    { id: 'loyal', max: 75, t: i18n.t('care.stLoyal'), c: '#A8F0B6', d: i18n.t('care.stLoyalDesc') },
    { id: 'soul', max: 100, t: i18n.t('care.stSoul'), c: '#FFB3CA', d: i18n.t('care.stSoulDesc') },
  ];
  const ICO_HAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5v-7a1.5 1.5 0 0 1 3 0V12"/><path d="M14 11.5V6a1.5 1.5 0 0 1 3 0v7.5"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1.2a7 7 0 0 1-5.4-2.6L3.3 15.6a1.6 1.6 0 0 1 2.4-2.1L8 15.5"/></svg>';
  const ICO_WALK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="M7 22l3-7 3 2v5"/><path d="M10 15l-1-6 4-1 3 4 3 1"/><path d="M9 9l-3 3"/></svg>';
  const ICO_STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 6.3L21 9l-5 4.4L17.6 20 12 16.6 6.4 20 8 13.4 3 9l6.4-.7z"/></svg>';

  function portraitUrl() {
    const id = service.companionId();
    const base = game.equipmentManager?.heroesBase?.[id];
    const key = base?.axieId || player()?.axieId || id;
    try { return (base?.axieId ? portraitService.axieUrl(base) : null) || portraitService.getPortraitSync(key) || (base?.axieId ? null : portraitService.getPortraitSync(id)) || null; } catch { return null; }
  }

  /** Luna del vínculo: el líquido sube con el porcentaje. */
  function moonSVG(bond) {
    const y = 6 + 52 * (1 - bond / 100);
    return `<svg viewBox="0 0 64 64" aria-hidden="true">
      <defs><clipPath id="lkCareMoon"><circle cx="32" cy="32" r="25"/></clipPath>
      <linearGradient id="lkCareLiq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD3E0"/><stop offset="1" stop-color="#E25C88"/></linearGradient></defs>
      <circle cx="32" cy="32" r="25" fill="#141B2E"/>
      <g clip-path="url(#lkCareMoon)"><path class="lk-care__liq" d="M-4 ${y} q9 -2.5 18 0 t18 0 t18 0 t18 0 V70 H-4z" fill="url(#lkCareLiq)"/>
      <circle cx="23" cy="25" r="3.2" fill="#fff" opacity=".14"/></g>
      <circle cx="32" cy="32" r="25" fill="none" stroke="#EED39A" stroke-opacity=".75"/>
      <circle cx="32" cy="32" r="29" fill="none" stroke="#EED39A" stroke-opacity=".25" stroke-dasharray="1.5 4"/>
      <path d="M32 40s-7-4.2-7-8.9c0-2.2 1.6-3.5 3.4-3.5 1.6 0 2.6.9 3.6 2.2 1-1.3 2-2.2 3.6-2.2 1.8 0 3.4 1.3 3.4 3.5 0 4.7-7 8.9-7 8.9z" fill="#fff" fill-opacity=".92"/>
    </svg>`;
  }

  function render() {
    const s = service.status();
    const name = companionName();
    const si = Math.max(0, STATES.findIndex((x) => s.bond <= x.max));
    const st = STATES[si];
    const img = portraitUrl();
    const petPct = s.petReady ? 100 : Math.max(0, Math.min(100, (1 - s.petLeftMs / PET_COOLDOWN_MS) * 100));
    const walked = Math.round(WALK_STEP_METERS - s.walkToNext);
    const walkPct = (walked / WALK_STEP_METERS) * 100;
    const foodIco = (ic) => (/[/.]/.test(String(ic || '')) ? `<img src="${esc(ic)}" alt="">` : esc(ic || '✦'));
    const foods = s.foods.length
      ? s.foods.map((f) => `<button type="button" class="lk-care__food" data-food="${esc(f.id)}" ${s.max ? 'disabled' : ''} title="${s.max ? i18n.t('care.fullBondTitle') : esc(f.item.description || f.item.name)}">
            <span class="lk-care__food-ico">${foodIco(f.item.icon)}<em>×${f.count}</em></span>
            <span class="lk-care__food-txt"><b>${esc(f.item.name)}</b><small>${i18n.t('care.bondGain', { n: formatBond(f.bond) })}</small></span>
            <span class="lk-care__food-go">${s.max ? i18n.t('care.full') : i18n.t('care.give')}</span>
          </button>`).join('')
      : `<p class="lk-care__empty">${i18n.t('care.noFood')}</p>`;

    panel.style.setProperty('--sc', st.c);
    panel.innerHTML = `
      <button type="button" class="lk-care__x" data-act="close" aria-label="${i18n.t('care.close')}" title="${i18n.t('care.closeEsc')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <header class="lk-care__head">
        <span class="lk-care__por">${img ? `<img src="${img}" alt="">` : ''}</span>
        <div><span class="lk-care__kick">${i18n.t('care.companion')}</span><b>${esc(name)}</b></div>
      </header>

      <section class="lk-care__bond" aria-label="${i18n.t('care.bondAria', { n: formatBond(s.bond) })}">
        <div class="lk-care__moon ${s.max ? 'lk-is-full' : ''}">${moonSVG(s.bond)}<span>${formatBond(s.bond)}%</span></div>
        <div class="lk-care__state">
          <span class="lk-care__kick">${i18n.t('care.bond')}</span>
          <b>${esc(st.t)}</b>
          <p>${esc(st.d)}</p>
        </div>
      </section>
      <div class="lk-care__rail" aria-hidden="true">${STATES.map((x, i) => `<span class="${i === si ? 'lk-is-on' : i < si ? 'lk-is-past' : ''}" style="--c:${x.c}"><i></i>${x.t}</span>`).join('')}</div>
      <div class="lk-care__duo ${s.max ? 'lk-is-ready' : ''}">${ICO_STAR}<span>${s.max ? i18n.t('care.duoReady') : i18n.t('care.duoLocked', { n: formatBond(100 - s.bond) })}</span></div>

      <div class="lk-care__sec">
        <span class="lk-care__label">${i18n.t('care.care')}</span>
        <button type="button" class="lk-care__pet ${s.petReady ? '' : 'lk-is-wait'}" data-act="pet" ${s.petReady ? '' : 'disabled'} style="--pp:${petPct.toFixed(1)}%">
          <span class="lk-care__pet-ico">${ICO_HAND}</span>
          <span class="lk-care__pet-txt"><b>${i18n.t('care.pet')}</b><small>${s.petReady ? i18n.t('care.bondGain', { n: PET_BOND }) : i18n.t('care.availableIn', { t: fmtTime(s.petLeftMs) })}</small></span>
          <span class="lk-care__pet-go">${s.petReady ? i18n.t('care.ready') : fmtTime(s.petLeftMs)}</span>
        </button>
      </div>

      <div class="lk-care__sec">
        <span class="lk-care__label">${i18n.t('care.feed')}</span>
        <div class="lk-care__foods">${foods}</div>
      </div>

      <div class="lk-care__sec lk-care__walk">
        <div class="lk-care__walk-row"><span class="lk-care__walk-ico">${ICO_WALK}</span>
          <span class="lk-care__walk-txt"><b>${i18n.t('care.walk')}</b><small>${i18n.t('care.walkMore', { m: Math.max(0, WALK_STEP_METERS - walked), n: formatBond(WALK_BOND) })}</small></span>
          <span class="lk-care__walk-num">${walked}<i>/${WALK_STEP_METERS} m</i></span></div>
        <div class="lk-bar lk-bar--xp lk-care__walk-bar" style="--v:${walkPct.toFixed(1)}%"><i></i></div>
      </div>`;
  }

  function updatePetCountdown() {
    const btn = panel.querySelector('[data-act="pet"]');
    if (!btn) return;
    const s = service.status();
    const waiting = btn.classList.contains('lk-is-wait');
    if (s.petReady) { if (waiting) render(); return; }
    const pct = Math.max(0, Math.min(100, (1 - s.petLeftMs / PET_COOLDOWN_MS) * 100));
    btn.style.setProperty('--pp', `${pct.toFixed(1)}%`);
    const small = btn.querySelector('.lk-care__pet-txt small');
    const go = btn.querySelector('.lk-care__pet-go');
    const t = fmtTime(s.petLeftMs);
    if (small) small.textContent = i18n.t('care.availableIn', { t });
    if (go) go.textContent = t;
  }

  function place() {
    if (!open) return;
    const p = screenOf(1.7);
    if (!p) { panel.style.visibility = 'hidden'; return; }
    panel.style.visibility = '';
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const x = Math.round(Math.max(12, Math.min(innerWidth - w - 12, p.x + 28)));
    const y = Math.round(Math.max(12, Math.min(innerHeight - h - 12, p.y - h * 0.6)));
    // Solo se mueve si el Axie se desplaza de verdad: así el panel no tiembla y los botones son fáciles de pulsar
    if (placed && Math.abs(x - placed.x) < 4 && Math.abs(y - placed.y) < 4) return;
    // Durante el tutorial el panel se queda quieto: el señalador y el hueco del velo apuntan a sus botones
    const tut = game.overworldManager?.tutorialManager;
    if (placed && tut?.isActive && !tut.done) return;
    placed = { x, y };
    panel.style.transform = `translate(${x}px, ${y}px)`;
  }

  function show() {
    if (!exploring() || !companion()) return;
    const lock = game.overworldManager?.tutorialManager?.lockMessage?.('care'); // Hito 48
    if (lock) { toast(lock, true); return; }
    placed = null;
    const gift = service.grantStarterFood();
    open = true;
    panel.hidden = false;
    render();
    place();
    if (gift.length) toast(i18n.t('care.gift', { n: gift.length, name: companionName() }));
  }
  function hide() {
    open = false;
    panel.hidden = true;
  }

  // ------------------------------------------------------------------ efectos
  function burst(text, kind = 'heart') {
    const p = screenOf(1.2);
    if (!p) return;
    const HEART = '<img src="./assets/ui/icons/heart.png" alt="" style="width:1em;height:1em;display:block">';
    for (let i = 0; i < (kind === 'heart' ? 6 : 2); i++) {
      const el = document.createElement('span');
      el.className = 'lk-care-heart';
      el.innerHTML = HEART;
      el.style.left = `${p.x + (Math.random() - 0.5) * 60}px`;
      el.style.top = `${p.y + (Math.random() - 0.5) * 20}px`;
      el.style.animationDelay = `${i * 70}ms`;
      fx.appendChild(el);
      setTimeout(() => el.remove(), 1700);
    }
    if (text) {
      const t = document.createElement('span');
      t.className = 'lk-care-gain';
      t.textContent = text;
      t.style.left = `${p.x}px`;
      t.style.top = `${p.y - 18}px`;
      fx.appendChild(t);
      setTimeout(() => t.remove(), 1800);
    }
    const pl = player();
    if (pl) pl.companionHopTimer = 0.45; // saltito de alegría
  }

  service.onChange((res) => {
    if (res.kind === 'walk') {
      burst(i18n.t('care.bondGain', { n: res.gained }), 'walk');
      toast(i18n.t('care.walking', { name: companionName(), n: res.after }));
    }
    if (open) render();
  });

  // ------------------------------------------------------------------ eventos
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  panel.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const food = e.target.closest('[data-food]')?.dataset.food;
    if (act === 'close') { hide(); return; }
    if (act === 'pet') {
      const r = service.pet();
      if (r.ok) { game.audio?.playBuff?.(); game.audio?.world?.axie?.('happy'); burst(i18n.t('care.bondGain', { n: r.gained })); }
      return;
    }
    if (food) {
      const r = service.feed(food);
      if (r.ok) { game.audio?.playBuff?.(); game.audio?.world?.axie?.('happy'); burst(i18n.t('care.bondGain', { n: r.gained })); }
    }
  });

  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pressed = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', (e) => {
    if (!pressed || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y);
    pressed = null;
    if (moved > CLICK_SLOP) return;                       // fue un arrastre de cámara
    if (panel.contains(e.target)) return;
    if (e.target.closest?.('button, input, select, textarea, .modal, .lk-modal')) return;
    if (exploring() && hitsCompanion(e.clientX, e.clientY)) { open ? render() : show(); return; }
    if (open) hide();                                     // clic en otra parte: cerrar
  });
  let hoverAt = 0;
  container.addEventListener('pointermove', (e) => {
    const t = performance.now();
    if (t - hoverAt < 90 || e.buttons) return;
    hoverAt = t;
    container.classList.toggle('lk-care-hover', exploring() && hitsCompanion(e.clientX, e.clientY));
  });
  window.addEventListener('keydown', (e) => { if (open && e.code === 'Escape') hide(); });

  // ------------------------------------------------------------------ bucle: anclaje, cierre y paseo
  let lastT = performance.now();
  function loop() {
    requestAnimationFrame(loop);
    // Tiempo de juego para la bajada del vínculo (solo con una partida en marcha; como mucho 1 s por fotograma)
    const t = performance.now();
    const dt = Math.min(1000, t - lastT);
    lastT = t;
    if (['OVERWORLD', 'BATTLE', 'CAMP'].includes(game.gameState) && service.tickPlay(dt) > 0 && open) render();
    const pl = player();
    const pos = pl?.position || pl?.group?.position; // player.position es la fuente (el grupo la copia)
    const canWalk = ow.state === 'EXPLORING' && companion()?.visible && !ow.isLoadingZone;
    if (pos && canWalk) {
      if (lastPos) {
        const d = Math.hypot(pos.x - lastPos.x, pos.z - lastPos.z);
        if (d > 0.001 && d < MAX_STEP) service.addWalk(d);
      }
      lastPos = { x: pos.x, z: pos.z };
    } else {
      lastPos = null;
    }
    if (!open) return;
    if (!exploring() || !companion()) { hide(); return; }
    // Distancia jugador ↔ compañero: si se separan mucho, se cierra
    const c = companion();
    if (pos && c && Math.hypot(pos.x - c.position.x, pos.z - c.position.z) > MAX_PANEL_DIST) { hide(); return; }
    place();
    // Cuenta atrás de la caricia: solo se cambian sus textos (repintar todo el panel dos veces por segundo
    // perdía clics en «Dar» y descolocaba el señalador del tutorial); el panel entero solo cuando queda lista
    tickTimer += 1;
    if (tickTimer % 30 === 0) updatePetCountdown();
  }
  requestAnimationFrame(loop);
  // «Última vez jugado» (bajada sin jugar): se guarda al cerrar u ocultar la pestaña
  const saveSeen = () => { if (['OVERWORLD', 'BATTLE', 'CAMP'].includes(game.gameState)) { service.tickPlay(1); try { game._saveCurrentProgress?.(); } catch { /* nada */ } service._persist?.(); } };
  window.addEventListener('pagehide', saveSeen);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveSeen(); });

  return { service, show, hide, panel };
}
