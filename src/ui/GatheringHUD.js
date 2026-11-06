// GatheringHUD.js — Recolección en el mundo abierto: une catálogo, servicio, puntos, actores y la interfaz.
//
// main.js: this.gathering = attachGathering(this) (después de attachForge: el botín va a la bolsa de la Forja).
//   · E junto a un punto → empieza (si no hay otra recolección, no hay ventana abierta y no es combate).
//   · Barra «Pescando…» abajo, donde sale el aviso «E · …»; al terminar, tarjeta «+2 Pez de río».
//   · No se puede mover hasta que termine; Esc antes de recoger el botín cancela.
//   · Minimapa: un icono por punto de la isla (gris si está agotado).
// Consola: lunakaiGathering.status() · .check() (puntos de la isla contra el terreno) · .reset() · .start('fish_forest_1')

import { GatheringService } from '../rpg/GatheringService.js';
import { GatheringNodes } from '../rpg/world/GatheringNodes.js';
import { AxieSession, SapidaeSession, FISH_CHALLENGE } from '../rpg/GatheringActors.js';
import { GATHER_KINDS, GATHER_NODE_BY_ID, nodesForZone } from '../tactics/data/GatheringCatalog.js';
import { ISLAND_IDS } from '../rpg/world/islands/IslandWorldLayout.js';
import { formatWait } from '../rpg/GatheringService.js';
import { MATERIALS } from '../tactics/data/EconomyCatalog.js';
import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import { matSvg } from './ForgePanel.js';
import { esc, toast as lkToast } from './lk.js';
import * as i18n from '../i18n/i18n.js';

export function attachGathering(game) {
  const ow = game?.overworldManager;
  if (!ow?.questInteractables) return null; // el Sapidae y su controlador se crean después (init): se leen al usarlos
  const service = GatheringService;
  let session = null;

  // ── Interfaz: barra de progreso y tarjeta de botín
  const root = document.createElement('div');
  root.className = 'lk-gather lk-ui';
  root.innerHTML = `
    <div class="lk-gather__bar" role="status" aria-live="polite" hidden>
      <span class="lk-gather__ico" aria-hidden="true"></span>
      <span class="lk-gather__txt"><b></b><small>${i18n.t('gatherHud.escCancel')}</small></span>
      <span class="lk-gather__track" aria-hidden="true"><i></i></span>
    </div>
    <div class="lk-gather__loot" role="status" aria-live="polite"></div>
    <div class="lk-fish" hidden>
      <div class="lk-fish__head"><span class="lk-fish__ico" aria-hidden="true">${matSvg('fish', '')}</span><b class="lk-fish__name"></b><small>${i18n.t('gatherHud.escCancel')}</small></div>
      <div class="lk-fish__stage">
        <span class="lk-fish__bob" aria-hidden="true"><i class="lk-fish__ring"></i><i class="lk-fish__ring"></i><i class="lk-fish__float"></i><i class="lk-fish__catch">${matSvg('fish', '')}</i></span>
        <span class="lk-fish__txt" role="status" aria-live="assertive"></span>
      </div>
      <div class="lk-fish__low">
        <div class="lk-fish__reel" aria-hidden="true">
          <span class="lk-fish__track"><i class="lk-fish__zone"><b></b></i><span class="lk-fish__rail"><i class="lk-fish__slide"><i class="lk-fish__mark"></i></i></span></span>
          <span class="lk-fish__meta"><span class="lk-fish__hooks"></span><span class="lk-fish__time"><i></i></span></span>
        </div>
        <div class="lk-fish__note" role="status" aria-live="polite"></div>
      </div>
      <small class="lk-fish__keys">${i18n.t('notices.gather.fishKeys')}</small>
    </div>`;
  document.body.appendChild(root);
  const bar = root.querySelector('.lk-gather__bar');
  const barIco = root.querySelector('.lk-gather__ico');
  const barTxt = root.querySelector('.lk-gather__txt b');
  const barFill = root.querySelector('.lk-gather__track > i');
  const lootEl = root.querySelector('.lk-gather__loot');
  let lootTimer = null, flashTimer = null;
  // Hito 87: reto de pesca. Hito 114: un solo panel de tamaño fijo (cabecera, corcho y texto, barra o resultado, teclas)
  // que sustituye a la barra «Pescando…»; el marcador se mueve con transform y la zona solo se coloca al empezar o tras un fallo.
  const fishEl = root.querySelector('.lk-fish');
  const fishName = fishEl.querySelector('.lk-fish__name');
  const fishTxt = fishEl.querySelector('.lk-fish__txt');
  const fishZone = fishEl.querySelector('.lk-fish__zone');
  const fishSlide = fishEl.querySelector('.lk-fish__slide');
  const fishHooks = fishEl.querySelector('.lk-fish__hooks');
  const fishTime = fishEl.querySelector('.lk-fish__time');
  const fishNote = fishEl.querySelector('.lk-fish__note');
  const HOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="15" cy="3.6" r="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 5.6V15a5.5 5.5 0 0 1-11 0v-3.2l3.2 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let fishTimer = null, nibTimer = null, missTimer = null, fishTries = -1;
  const sfx = (ev, o) => game.audio?.world?.gather?.(ev, o);
  const fishHide = (ms) => { clearTimeout(fishTimer); fishTimer = setTimeout(() => { fishEl.hidden = true; }, ms); };
  const fishShow = (state, text, { note = '', hideIn = 0 } = {}) => {
    clearTimeout(fishTimer);
    fishEl.hidden = false;
    fishEl.dataset.state = state;
    if (text != null) fishTxt.textContent = text;
    fishNote.textContent = note;
    fishEl.classList.remove('lk-is-done');
    if (state !== 'reel') { fishEl.classList.remove('lk-is-miss', 'lk-is-timing'); fishTries = -1; }
    if (hideIn) fishHide(hideIn);
  };
  /** Anzuelos que quedan (fallos permitidos en la barra). */
  const fishSetTries = (n) => {
    if (n === fishTries) return;
    fishTries = n;
    fishHooks.innerHTML = Array.from({ length: FISH_CHALLENGE.tries }, (_, i) => `<i class="${i < n ? '' : 'lk-is-spent'}">${HOOK}</i>`).join('');
    fishHooks.setAttribute('aria-label', i18n.t('notices.gather.fishTries', { n }));
  };
  /** Coloca la zona buena y el centro «perfecto» (no cada fotograma). */
  const fishPlaceZone = (c) => {
    const zh = FISH_CHALLENGE.zoneHalf, ph = FISH_CHALLENGE.perfectHalf;
    fishZone.style.left = `${((c - zh) * 100).toFixed(2)}%`;
    fishZone.style.width = `${(zh * 200).toFixed(2)}%`;
    fishZone.style.setProperty('--p', `${((ph / zh) * 100).toFixed(1)}%`);
  };
  // Un toque o clic en el panel cuenta como E (pantallas táctiles)
  fishEl.addEventListener('pointerdown', (ev) => { if (session?.onAction?.()) { ev.preventDefault(); ev.stopPropagation(); } });

  const hud = {
    begin(s) {
      if (s.def?.kind === 'fish') {          // Hito 114: la pesca usa su propio panel desde el principio
        bar.hidden = true;
        fishName.textContent = s.def.name || s.kind.label;
        fishShow('cast', `${s.kind.verb}…`);
        game.audio?.playClick?.();
        return;
      }
      const k = s.kind;
      bar.style.setProperty('--g', k.color);
      barIco.innerHTML = matSvg(k.icon, '');
      barTxt.textContent = `${k.verb}…`;
      barFill.style.transform = 'scaleX(0)';
      bar.classList.toggle('lk-is-fish', s.def?.kind === 'fish');   // la pesca usa el reto en lugar de la barra de tiempo
      bar.hidden = false;
      game.audio?.playClick?.();
    },
    end(s, cancelled) {
      if (!session || session === s || cancelled) bar.hidden = true;
      if (cancelled && fishEl.dataset.state !== 'lost') { clearTimeout(fishTimer); fishEl.hidden = true; }
    },
    /** Golpe de la herramienta: kind 'chop' (hacha) o 'mine' (pico). */
    hit(kind = 'chop') { if (game.audio?.world) sfx(kind); else game.audio?.playCollision?.(); },
    /** Sonidos de recolección. Hito 114: el mordisquito también hunde un instante el corcho del panel. */
    sfx(ev, o) {
      if (ev === 'nibble' && !fishEl.hidden) {
        fishEl.classList.remove('lk-is-nib'); void fishEl.offsetWidth; fishEl.classList.add('lk-is-nib');
        clearTimeout(nibTimer); nibTimer = setTimeout(() => fishEl.classList.remove('lk-is-nib'), 450);
      }
      return sfx(ev, o);
    },
    /** Reto de pesca: wait · bite · reel · miss · caught · perfect · lost · end */
    fish(state, d = {}) {
      const t = (k) => i18n.t(`notices.gather.${k}`);
      if (state === 'reel' && fishEl.dataset.state === 'reel') {      // cada fotograma: solo el marcador
        fishSlide.style.transform = `translateX(${((d.m ?? 0) * 100).toFixed(2)}%)`;
        fishSetTries(d.tries ?? FISH_CHALLENGE.tries);
        return;
      }
      if (state === 'wait') fishShow('wait', t('fishWait'), { note: t('fishTip') });
      else if (state === 'bite') fishShow('bite', t('fishBite'));
      else if (state === 'reel' || state === 'miss') {
        const first = fishEl.dataset.state !== 'reel';
        fishShow('reel', state === 'miss' ? t('fishMiss') : t('fishReel'));
        fishPlaceZone(d.c ?? 0.5);
        fishSlide.style.transform = `translateX(${((d.m ?? 0) * 100).toFixed(2)}%)`;
        fishSetTries(d.tries ?? FISH_CHALLENGE.tries);
        if (first) {                                                   // el hilo del tiempo empieza una sola vez
          fishTime.style.setProperty('--t', `${FISH_CHALLENGE.reelTimeout}s`);
          fishEl.classList.remove('lk-is-timing'); void fishTime.offsetWidth; fishEl.classList.add('lk-is-timing');
        }
        fishEl.classList.toggle('lk-is-miss', state === 'miss');
        clearTimeout(missTimer);
        if (state === 'miss') missTimer = setTimeout(() => { fishEl.classList.remove('lk-is-miss'); if (fishEl.dataset.state === 'reel') fishTxt.textContent = t('fishReel'); }, 900);
      } else if (state === 'caught' || state === 'perfect') {
        // Se queda a la vista hasta que el Axie entrega el botín (reward), con un límite por si no llega
        fishShow(state, t(state === 'perfect' ? 'fishPerfect' : 'fishCaught'), { note: t('fishBring'), hideIn: 9000 });
      } else if (state === 'lost') {
        const why = d.why === 'early' ? 'fishEarly' : d.why === 'miss' ? 'fishMissed' : 'fishLate';
        fishShow('lost', t(why), { note: t('fishRetry'), hideIn: 2600 });
      } else if (state === 'end') { if (fishEl.dataset.state !== 'caught' && fishEl.dataset.state !== 'perfect') fishEl.hidden = true; }
    },
    flash(text) {
      barTxt.textContent = text;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => { if (session) barTxt.textContent = `${session.kind.verb}…`; }, 600);
      game.audio?.playBuff?.();
    },
    toast(text, warn = false) { lkToast(text, warn); },
    reward(loot, def) {
      if (!loot?.length) return;
      const rows = loot.map((l) => {
        const m = MATERIALS[l.id] || ITEMS_DB[l.id] || {};
        const ico = m.glyph && !m.icon ? matSvg(m.glyph, '') : /\.(png|jpe?g|webp|svg)$/i.test(m.icon || '') ? `<img src="${esc(m.icon)}" alt="" style="width:26px;height:26px;object-fit:contain">` : `<span style="font-size:17px;line-height:1">${esc(m.icon || '✦')}</span>`;
        return `<div class="lk-gather__row ${l.rare ? 'lk-is-rare' : ''}"><span class="lk-gather__mi" aria-hidden="true">${ico}</span><b>+${l.n}</b><span>${esc(m.name || l.id)}</span>${l.rare ? `<em>${i18n.t('gatherHud.rare')}</em>` : ''}</div>`;
      }).join('');
      // Hito 114: el botín de la pesca se enseña en su propio panel (sin una segunda tarjeta encima)
      if (def.kind === 'fish' && !fishEl.hidden && (fishEl.dataset.state === 'caught' || fishEl.dataset.state === 'perfect')) {
        fishEl.classList.add('lk-is-done');
        fishNote.innerHTML = rows;
        fishHide(2800);
        game.audio?.playBuff?.();
        game.audio?.world?.axie?.('happy');
        return;
      }
      lootEl.innerHTML = `<div class="lk-gather__card" style="--g:${GATHER_KINDS[def.kind]?.color || '#D3AE6C'}"><small>${esc(def.name)}</small>${rows}</div>`;
      lootEl.classList.remove('lk-is-on'); void lootEl.offsetWidth; lootEl.classList.add('lk-is-on');
      clearTimeout(lootTimer);
      lootTimer = setTimeout(() => lootEl.classList.remove('lk-is-on'), 2600);
      game.audio?.playBuff?.();
      if (GATHER_KINDS[def.kind]?.actor === 'axie') game.audio?.world?.axie?.('happy');   // Hito 87: el Axie te da el botín contento
    },
  };

  // ── Puntos del mundo
  const nodes = new GatheringNodes(ow, { service, onUse: (item) => start(item), isBusy: () => Boolean(session) });


  function start(item) {
    if (session) return false;
    if (game.gameState === 'BATTLE' || ow.state !== 'EXPLORING' || ow.isAnyModalOpen?.()) return false;
    const def = item?.def;
    if (!def || !ow.player) return false;
    const lock = ow.tutorialManager?.lockMessage?.('gather', def.id); // Hito 48: solo el árbol de la Forja durante el tutorial
    if (lock) { hud.toast(lock, true); return true; }
    hookController();
    if (!service.isAvailable(def.id)) { hud.toast(item.node?.promptText || i18n.t('gatherHud.depleted'), true); return true; }
    const kind = GATHER_KINDS[def.kind];
    const ctx = { ow, player: ow.player, service, nodes, hud, onEnd: (s) => { if (session === s) session = null; } };
    if (kind.actor === 'axie') {
      if (!AxieSession.canRun(ow.player)) { hud.toast(i18n.t('gatherHud.needAxie'), true); return true; }
      session = new AxieSession(ctx, item);
    } else {
      session = new SapidaeSession(ctx, item);
    }
    ow.questInteractables.hidePrompt();
    session.start();
    return true;
  }

  function cancel() { return session ? session.cancel() : false; }

  // El controlador del Sapidae: durante la recolección no se mueve con el teclado.
  // (se engancha la primera vez que existe, igual que el minimapa)
  function hookController() {
    const pc = ow.playerController;
    if (!pc || pc.__lkGather || typeof pc.update !== 'function') return;
    pc.__lkGather = true;
    const orig = pc.update.bind(pc);
    pc.update = (dt) => {
      // Recolectando: el movimiento queda bloqueado hasta que termine (la recolección mueve al Sapidae si hace falta)
      if (session) {
        if (session.ownsPlayer) session.drive(dt); else ow.player?.setAnimation?.('idle');
        return;
      }
      orig(dt);
    };
  }
  hookController();

  // Bucle: va detrás de player.update (dentro de questInteractables.update, ya envuelto por GatheringNodes)
  const qi = ow.questInteractables;
  const qiUpdate = qi.update.bind(qi);
  qi.update = (dt, pos) => {
    qiUpdate(dt, pos);
    hookMinimap();
    hookController();
    hookWorldMap();
    if (!session) return;
    if (game.gameState === 'BATTLE' || ow.state !== 'EXPLORING') { session.cancel() || session._finish?.(true); return; }
    session.update(dt || 0);
    if (session && !bar.hidden) {
      barFill.style.transform = `scaleX(${session.progress.toFixed(3)})`;
    }
  };

  // E durante la recolección no hace nada más (ni NPC ni otro punto); Esc cancela.
  window.addEventListener('keydown', (ev) => {
    if (!session) return;
    // Hito 87: E o Espacio para el reto de pesca
    if ((ev.code === 'KeyE' || ev.code === 'Space') && !ev.repeat && session.onAction?.()) { ev.preventDefault(); ev.stopImmediatePropagation(); return; }
    if (ev.code === 'KeyE') { ev.preventDefault(); ev.stopImmediatePropagation(); }
    else if (ev.code === 'Escape' && session.cancellable) { ev.preventDefault(); ev.stopImmediatePropagation(); session.cancel(); }
  }, true);

  // Al cambiar de isla o entrar en combate no queda nada a medias
  const loadZone = qi.loadForZone.bind(qi);
  qi.loadForZone = (key) => { if (session) { session.cancel() || session._finish?.(true); } loadZone(key); };

  // ── Minimapa: icono por punto de la isla (gris si está agotado)
  // (el minimapa se crea más tarde que esta función: se engancha la primera vez que existe)
  function hookMinimap() {
    const mm = ow.minimapHUD;
    if (!mm || mm.__lkGather || typeof mm.update !== 'function') return;
    mm.__lkGather = true;
    const orig = mm.update.bind(mm);
    mm.update = (dt, playerPos, ...rest) => {
      orig(dt, playerPos, ...rest);
      try { drawMinimap(mm, playerPos); } catch { /* el minimapa nunca rompe el juego */ }
    };
  }
  hookMinimap();

  // ── Mapa del mundo (M): en «Puntos de interés» de cada isla, una fila por actividad con los puntos listos
  const ZONE_OF_ISLAND = Object.fromEntries(Object.entries(ISLAND_IDS).map(([zone, id]) => [id, zone]));
  function hookWorldMap() {
    const modal = ow.worldMapManager?.worldMapModal;
    if (!modal || modal.__lkGather || typeof modal.selectIsland !== 'function') return;
    modal.__lkGather = true;
    const orig = modal.selectIsland.bind(modal);
    modal.selectIsland = (islandId, ...rest) => {
      const r = orig(islandId, ...rest);
      try { addWorldMapRows(modal, islandId); } catch { /* el mapa nunca rompe el juego */ }
      return r;
    };
  }
  function addWorldMapRows(modal, islandId) {
    const list = document.getElementById('detail-landmarks-list');
    const defs = nodesForZone(ZONE_OF_ISLAND[islandId]);
    if (!list || !defs.length) return;
    const byKind = {};
    defs.forEach((d) => (byKind[d.kind] ||= []).push(d));
    const here = ow.questInteractables?.currentZoneKey === ZONE_OF_ISLAND[islandId];
    for (const [kind, ds] of Object.entries(byKind)) {
      const k = GATHER_KINDS[kind];
      const ready = ds.filter((d) => service.isAvailable(d.id));
      const next = ready.length ? null : Math.min(...ds.map((d) => service.remainingMs(d.id)));
      const row = document.createElement('div');
      row.className = 'landmark-row lk-wmap__poi lk-wmap__gather';
      row.innerHTML = `<div class="landmark-icon" style="color:${k.color}">${matSvg(k.icon, '')}</div>
        <div class="landmark-info"><span class="landmark-name">${esc(k.label)} · ${ds.length === 1 ? esc(ds[0].name) : i18n.t('gatherHud.points', { n: ds.length })}</span>
        <span class="landmark-desc">${ready.length ? (ready.length > 1 ? i18n.t('gatherHud.readyMany', { n: ready.length }) : i18n.t('gatherHud.readyOne', { n: ready.length })) : i18n.t('gatherHud.backIn', { t: formatWait(next) })} · ${k.actor === 'axie' ? i18n.t('gatherHud.byAxie') : i18n.t('gatherHud.bySapidae')}</span></div>`;
      const target = ready[0] || ds[0];
      if (here && modal.chart?.focus) {
        row.style.cursor = 'pointer';
        row.title = i18n.t('gatherHud.viewOnMap');
        row.addEventListener('click', () => { if (modal.currentTab !== 'island') modal.switchTab?.('island'); modal.chart?.focus?.(target.x, target.z, 160); });
      }
      list.appendChild(row);
    }
  }
  hookWorldMap();
  function drawMinimap(m, pos) {
    if (!m.isVisible || !m.ctx || !pos || !nodes.items.length) return;
    const ctx = m.ctx, cx = m.center, cy = m.center, r = m.radius, scale = r / m.radarRadiusMeters;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    for (const it of nodes.items) {
      const dx = (it.def.x - pos.x) * scale, dy = (it.def.z - pos.z) * scale;
      if (dx * dx + dy * dy > (r - 6) * (r - 6)) continue;
      const k = GATHER_KINDS[it.def.kind];
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = it.available ? k.color : 'rgba(141, 151, 175, .55)';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(11, 15, 28, .9)';
      ctx.stroke();
      if (it.available) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.4, 0, Math.PI * 2); ctx.fillStyle = '#F6F1E6'; ctx.fill(); }
    }
    ctx.restore();
  }

  const api = {
    service, nodes, hud,
    get busy() { return Boolean(session); },
    get session() { return session; },
    start: (id) => { const it = nodes.item(id); return it ? start(it) : false; },
    cancel,
    status: () => service.status(),
    check: () => { const r = nodes.check(); console.table(r); return r; },
    reset: (id) => service.reset(id),
    nodesHere: () => nodes.items.map((it) => ({ id: it.def.id, kind: it.def.kind, x: it.def.x, z: it.def.z, available: it.available })),
    catalog: GATHER_NODE_BY_ID,
  };
  window.lunakaiGathering = api;
  return api;
}
