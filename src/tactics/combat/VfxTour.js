// VfxTour.js — Recorrido de todos los VFX en la arena de pruebas, en orden y con su nombre (Hito 102).
//
// Consola (F12):
//   lkDebug.vfxRecorrido()                      todas las cartas, en orden (clase → parte), luego α, Ultimates, Sapidae, enemigos y gólems
//   lkDebug.vfxRecorrido({ clase: 'bestia' })   solo una clase (planta, pajaro, reptil, bestia, bicho, acuatico)
//   lkDebug.vfxRecorrido({ grupo: 'alfa' })     solo un grupo: cartas, alfa, ultimates, sapidae, enemigos, golems
//   lkDebug.vfxRecorrido({ solo: 'aliado' })    solo las cartas que se lanzan sobre un aliado (también lanzadas sobre sí mismo)
//   lkDebug.vfxRecorrido({ desde: 120 })        empieza en el número 120 de la lista
//   lkDebug.vfxRecorrido({ d: 3, pausa: 1.5, manual: true })   distancia, pausa entre efectos (s), avance manual
//   lkDebug.vfxRecorrido({ marcadas: true })    solo los marcados con M (en su orden del recorrido)
//   lkDebug.vfxRecorridoParar()                 lo detiene
//   lkDebug.vfxMarcadas()                       tabla de los marcados con M (y los copia al portapapeles)
//   lkDebug.vfxMarcadasBorrar()                 vacía la lista
//
// Teclas durante el recorrido: Espacio pausa/sigue · → siguiente · ← anterior · R repetir · 1/2/4 distancia y repetir ·
//   M marcar «necesita arreglo» (escribe una nota y Enter; Esc la cierra sin nota) · Esc terminar.
// Las cartas se lanzan con lkDebug.probar (camino normal del combate: daño, estados, VFX). Los ataques de enemigos, las
// Ultimates y los gólems solo reproducen su efecto (lkDebug.vfxPlay), sin daño.
// Sonido (fase 5 del audio de skills): antes de cada efecto se cargan sus sonidos (tope 1,5 s) y el panel dice qué suena
// («🔊 bestia · bite + firma growl…»); enemigos, Ultimates y gólems suenan sincronizados con su efecto
// (CombatSfx.previewWhenPlaying). Atajo: lkDebug.sfx('recorrido', opciones) = este recorrido.

import { CARD_VFX } from '../../vfx/vfx-cards.js';
import { PART_CARDS } from '../data/PartCards.js';
import { STARTER_CARDS_LIST } from '../data/StarterCards.js';
import { ULTIMATES } from './UltimateSystem.js';
import { SAPIDAE_VFX_ALIAS, ENEMY_VFX, GOLEM_KIND_MODULE } from '../../vfx/VfxBridge.js';

const MARKS_KEY = 'lunakai_vfx_marcadas';
const CLASS_ORDER = ['plant', 'bird', 'reptile', 'beast', 'bug', 'aquatic'];
const CLASS_ES = { plant: 'planta', bird: 'pajaro', reptile: 'reptil', beast: 'bestia', bug: 'bicho', aquatic: 'acuatico' };
const CLASS_LABEL = { plant: 'Planta', bird: 'Pájaro', reptile: 'Reptil', beast: 'Bestia', bug: 'Bicho', aquatic: 'Acuático', mech: 'Mech' };
const PART_ORDER = ['horn', 'mouth', 'ears', 'eyes', 'back', 'tail'];
const PART_LABEL = { horn: 'Cuernos', mouth: 'Boca', ears: 'Orejas', eyes: 'Ojos', back: 'Espalda', tail: 'Cola' };
const TT_LABEL = { enemy: 'enemigo', ally: 'aliado', self: 'sobre sí mismo', empty: 'casilla vacía', any: 'cualquiera' };
const HERO_LABEL = { bing: 'Bing', pomodoro: 'Pomodoro' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readMarks() { try { return JSON.parse(localStorage.getItem(MARKS_KEY) || '[]'); } catch { return []; } }
function writeMarks(m) { try { localStorage.setItem(MARKS_KEY, JSON.stringify(m)); } catch { /* sin almacenamiento */ } }

/** Lista ordenada de todo lo que se puede recorrer. */
export function buildTourList(game) {
  const sm = game.spellManager;
  const items = [];
  // 1) las 235 cartas de partes: clase → parte → nombre
  const cards = Object.keys(CARD_VFX).map((id) => PART_CARDS[id]).filter(Boolean);
  cards.sort((a, b) => (CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class)) || (PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part)) || String(a.name).localeCompare(String(b.name)));
  for (const c of cards) {
    items.push({ group: 'cartas', kind: 'card', id: c.id, name: c.name, cls: CLASS_ES[c.class], where: `${CLASS_LABEL[c.class]} · ${PART_LABEL[c.part]}`, tt: c.targetType, min: c.minRange ?? 0 });
    if (c.targetType === 'ally' && (c.minRange ?? 0) === 0) items.push({ group: 'cartas', kind: 'card', id: c.id, name: c.name, cls: CLASS_ES[c.class], where: `${CLASS_LABEL[c.class]} · ${PART_LABEL[c.part]}`, tt: 'ally', self: true });
  }
  // 2) las 12 cartas α de Bing y Pomodoro (las que no tienen efecto propio usan el de su carta base)
  for (const c of STARTER_CARDS_LIST) {
    const where = `α de ${HERO_LABEL[c.hero] || c.hero} · ${PART_LABEL[c.part]}`;
    items.push({ group: 'alfa', kind: 'card', id: c.id, name: `${c.name} α`, where, tt: c.targetType, min: c.minRange ?? 0 });
    if (c.targetType === 'ally' && (c.minRange ?? 0) === 0) items.push({ group: 'alfa', kind: 'card', id: c.id, name: `${c.name} α`, where, tt: 'ally', self: true });
  }
  // 3) Ultimates de dúo (Sapidae + Axie principal)
  for (const u of Object.values(ULTIMATES)) items.push({ group: 'ultimates', kind: 'ultimate', id: u.id, name: u.name || u.id, where: 'Ultimate de dúo', tt: u.targetType || 'enemy', spell: u });
  // 4) habilidades del Sapidae
  for (const id of Object.keys(SAPIDAE_VFX_ALIAS)) {
    const s = sm?.getSpell(id);
    items.push({ group: 'sapidae', kind: 'card', id, name: (s && s.id === id && s.name) || id, where: 'Sapidae', tt: (s && s.id === id && s.targetType) || 'enemy', min: s?.minRange ?? 0 });
  }
  // 5) ataques de enemigos (solo el efecto, del muñeco hacia el Axie principal)
  for (const id of ENEMY_VFX) {
    const s = sm?.getSpell(id);
    items.push({ group: 'enemigos', kind: 'enemy', id, name: (s && s.id === id && s.name) || id, where: 'Enemigo', tt: 'enemy' });
  }
  // 6) gólems (sobre el Sapidae)
  for (const g of Object.keys(GOLEM_KIND_MODULE)) {
    if (g === 'hat' || g === 'bell') items.push({ group: 'golems', kind: 'golem', id: `golem_pulse_${g}`, name: `Pulso del gólem (${g})`, where: 'Gólem', tt: 'self' });
    items.push({ group: 'golems', kind: 'golem', id: `golem_break_${g}`, name: `Rotura del gólem (${g})`, where: 'Gólem', tt: 'self' });
  }
  return items;
}

export function installVfxTour(game) {
  if (typeof window === 'undefined') return;
  const d = (window.lkDebug ||= {});
  let tour = null;

  // ---------------------------------------------------------------- panel
  function makePanel() {
    const el = document.createElement('div');
    el.id = 'lk-vfx-tour';
    Object.assign(el.style, {
      position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, minWidth: '360px', maxWidth: '92vw',
      padding: '10px 16px', borderRadius: '10px', background: 'rgba(12,18,28,.86)', color: '#eef3f8', font: '14px/1.35 system-ui,sans-serif',
      boxShadow: '0 4px 18px rgba(0,0,0,.35)', pointerEvents: 'auto', textAlign: 'center',
    });
    el.innerHTML = `<div data-k="n" style="font-size:12px;opacity:.75"></div>
      <div data-k="name" style="font-size:20px;font-weight:700;margin:2px 0"></div>
      <div data-k="info" style="font-size:13px;opacity:.9"></div>
      <div data-k="state" style="font-size:12px;margin-top:4px;color:#ffd27a"></div>
      <div data-k="note" style="display:none;margin-top:6px"><input data-k="input" placeholder="Nota (Enter guarda, Esc sin nota)" style="width:100%;box-sizing:border-box;padding:4px 6px;border-radius:6px;border:1px solid #456;background:#1b2738;color:#eef3f8"></div>
      <div style="font-size:11px;opacity:.6;margin-top:6px">Espacio pausa · ← → anterior/siguiente · R repetir · 1/2/4 distancia · M marcar · Esc salir</div>`;
    document.body.appendChild(el);
    return el;
  }
  const q = (k) => tour?.panel.querySelector(`[data-k="${k}"]`);
  function render() {
    if (!tour) return;
    const it = tour.list[tour.i];
    if (!it) return;
    const marked = readMarks().some((m) => m.id === it.id && !!m.self === !!it.self);
    const fx = tour.fx;
    q('n').textContent = `${tour.i + 1} / ${tour.list.length} · ${it.where}${marked ? ' · ⚑ marcada' : ''}`;
    q('name').textContent = it.name;
    q('info').textContent = `${it.id} · objetivo: ${it.self ? 'aliado, lanzada sobre sí mismo' : TT_LABEL[it.tt] || it.tt}${it.kind === 'card' && !it.self && it.tt !== 'self' ? ` · ${tour.d} casillas` : ''}${fx ? ` · ${fx.module}${fx.module?.startsWith('estilizado-') ? '' : ' (estilo anterior)'}` : ' · sin efecto propio'}${tour.sfx ? ` · 🔊 ${tour.sfx}` : ''}`;
    q('state').textContent = tour.paused ? '⏸ en pausa' : tour.manual ? 'avance manual (→)' : '';
  }

  // ---------------------------------------------------------------- reproducción
  const units = () => (game.units || []).filter((u) => !u.isDead);
  const team = () => units().filter((u) => u.team === 'player');
  async function waitVfx(maxMs = 6000) {
    const br = game.vfxBridge, t0 = performance.now();
    await sleep(120);
    while (br?.current && performance.now() - t0 < maxMs) await sleep(80);
  }
  async function playItem(it) {
    const br = game.vfxBridge;
    const sapidae = team().find((u) => u.type === 'sapidae' || u.id === 'sapidae_hero');
    const axie = team().find((u) => u.id === 'kotaro') || team().find((u) => u !== sapidae);
    const dummy = units().find((u) => u._testDummy) || units().find((u) => u.team !== 'player');
    const spell = it.kind === 'ultimate' ? it.spell : game.spellManager.getSpell(it.id);
    tour.fx = br && spell && spell.id === it.id ? br.effectFor(spell) : null;
    // Sonido: qué suena y carga previa (para que suene ya con su archivo y no con la síntesis de respaldo)
    const sfx = game.audio?.combat;
    const sndCaster = it.kind === 'enemy' ? dummy : (it.group === 'sapidae' || it.kind === 'ultimate' || it.kind === 'golem')
      ? sapidae : (team().find((u) => (u.spellIds || []).includes(it.id)) || axie);
    tour.sfx = null;
    if (sfx?.loadFor) {
      if (it.kind === 'ultimate') sfx._ultAxie = game.spellManager?.ultimates?.axie || axie || null;
      const sp = it.kind === 'golem' ? { id: it.id } : spell;
      tour.sfx = sfx.describe?.(sp, sndCaster) || null;
      render();
      await Promise.race([sfx.loadFor(sp, sndCaster).catch(() => {}), sleep(1500)]);
    }
    render();
    if (it.kind === 'card') {
      if (it.self) {
        // carta de aliado lanzada sobre sí mismo: la lanza su dueño (o el Axie principal) sobre su propia casilla
        await d.arena();
        const caster = team().find((u) => (u.spellIds || []).includes(it.id)) || axie;
        if (!caster) throw new Error('no hay quién la lance en la arena');
        caster.currentPA = 99; caster._castsThisTurn = {}; caster._castsOnTarget = {}; caster._unlockAll = true; caster._spellReady = { [it.id]: 0 };
        game.activeUnit = caster;
        try { await br?.prepare([{ spellIds: [it.id] }]); } catch { /* sin VFX nuevos */ }
        await game.spellManager.castSpell(caster, spell, { x: caster.gridX, z: caster.gridZ });
      } else {
        await d.probar(it.id, it.tt === 'self' ? null : tour.d);
      }
    } else if (it.kind === 'enemy') {
      const p = d.vfxPlay(it.id, dummy, axie);
      sfx?.previewWhenPlaying?.('enemy', it.id, br, dummy);
      await p;
    } else if (it.kind === 'ultimate') {
      const p = d.vfxPlay(it.id, sapidae, it.id === 'duo_gaia' ? sapidae : dummy, it.spell);
      sfx?.previewWhenPlaying?.('ultimate', it.id, br, sapidae);
      await p;
    } else if (it.kind === 'golem') {
      const p = d.vfxPlay(it.id, sapidae, sapidae);
      sfx?.previewWhenPlaying?.('golem', it.id, br, sapidae);
      await p;
    }
    await waitVfx();
  }

  async function loop() {
    const me = tour;
    while (tour === me && me.i < me.list.length) {
      if (me.paused) { await sleep(120); continue; }
      const i = me.i;
      try { await playItem(me.list[i]); } catch (e) { console.warn(`[recorrido] ${me.list[i].id}:`, e.message || e); }
      if (tour !== me) return;
      if (me.jump != null) { me.i = me.jump; me.jump = null; continue; }
      // pausa entre efectos; en modo manual se espera a →
      const t0 = performance.now();
      while (tour === me && me.jump == null && (me.manual || me.paused || performance.now() - t0 < me.pausa * 1000)) await sleep(80);
      if (tour !== me) return;
      if (me.jump != null) { me.i = me.jump; me.jump = null; } else me.i = i + 1;
      render();
    }
    if (tour === me) { console.log('%c[recorrido] Terminado. lkDebug.vfxMarcadas() para ver los marcados.', 'color:#7ad'); stop(); }
  }

  // ---------------------------------------------------------------- teclado
  function onKey(e) {
    if (!tour) return;
    const noteOpen = q('note').style.display !== 'none';
    if (noteOpen) {
      if (e.key === 'Enter') { saveMark(q('input').value.trim()); closeNote(); }
      else if (e.key === 'Escape') { saveMark(''); closeNote(); }
      e.stopImmediatePropagation(); return; // la nota se escribe sin activar atajos del juego
    }
    const k = e.key, go = (j) => { tour.jump = Math.max(0, Math.min(tour.list.length - 1, j)); tour.paused = false; };
    let used = true;
    if (k === ' ') tour.paused = !tour.paused;
    else if (k === 'ArrowRight') go(tour.i + 1);
    else if (k === 'ArrowLeft') go(tour.i - 1);
    else if (k === 'r' || k === 'R') go(tour.i);
    else if (k === '1' || k === '2' || k === '4') { tour.d = Number(k); go(tour.i); }
    else if (k === 'm' || k === 'M') { tour.paused = true; q('note').style.display = ''; q('input').value = ''; setTimeout(() => q('input')?.focus(), 0); }
    else if (k === 'Escape') stop();
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); render(); }
  }
  function closeNote() { q('note').style.display = 'none'; q('input').blur(); tour.paused = false; render(); }
  function saveMark(nota) {
    const it = tour.list[tour.i];
    const marks = readMarks().filter((m) => !(m.id === it.id && !!m.self === !!it.self));
    marks.push({ n: tour.i + 1, id: it.id, nombre: it.name, donde: it.where, objetivo: it.self ? 'aliado (sobre sí mismo)' : TT_LABEL[it.tt] || it.tt, self: !!it.self, distancia: tour.d, efecto: tour.fx ? `${tour.fx.key} · ${tour.fx.module}` : '—', nota, fecha: new Date().toISOString().slice(0, 16) });
    writeMarks(marks);
    console.log(`%c[recorrido] ⚑ ${it.name} (${it.id}) marcada${nota ? `: ${nota}` : ''}`, 'color:#ffb35a');
  }

  // ---------------------------------------------------------------- API
  function stop() {
    if (!tour) return;
    window.removeEventListener('keydown', onKey, true);
    tour.panel.remove();
    tour = null;
  }
  d.vfxRecorrido = async (opts = {}) => {
    stop();
    if (!d.arena || !d.probar) throw new Error('[recorrido] Falta la arena de pruebas (lkDebug.arena)');
    await d.arena();
    let list = buildTourList(game);
    if (opts.grupo) list = list.filter((it) => it.group === opts.grupo);
    if (opts.clase) list = list.filter((it) => it.cls === opts.clase);
    if (opts.solo === 'aliado') list = list.filter((it) => it.tt === 'ally' || it.tt === 'any');
    if (opts.ids) list = list.filter((it) => opts.ids.includes(it.id));
    if (opts.marcadas) { const mk = readMarks(); list = list.filter((it) => mk.some((m) => m.id === it.id && !!m.self === !!it.self)); } // Hito 104: repasar solo los marcados
    if (!list.length) { console.warn('[recorrido] La lista está vacía con esos filtros'); return 0; }
    tour = { list, i: Math.max(0, Math.min(list.length - 1, (opts.desde || 1) - 1)), d: opts.d || 2, pausa: opts.pausa ?? 0.8, manual: !!opts.manual, paused: false, jump: null, fx: null, panel: makePanel() };
    window.addEventListener('keydown', onKey, true);
    render();
    console.log(`%c[recorrido] ${list.length} efectos. Espacio pausa · ← → · R · 1/2/4 · M marcar · Esc salir`, 'color:#7ad');
    loop();
    return list.length;
  };
  d.vfxRecorridoParar = stop;
  d.vfxRecorridoLista = (opts = {}) => { const l = buildTourList(game).filter((it) => (!opts.grupo || it.group === opts.grupo) && (!opts.clase || it.cls === opts.clase)); console.table(l.map((it, i) => ({ n: i + 1, nombre: it.name, id: it.id, donde: it.where, objetivo: it.self ? 'aliado (sobre sí mismo)' : it.tt }))); return l.length; };
  d.vfxMarcadas = () => {
    const marks = readMarks().sort((a, b) => a.n - b.n);
    if (!marks.length) { console.log('[recorrido] No hay VFX marcados.'); return []; }
    console.table(marks.map(({ n, nombre, id, donde, objetivo, distancia, nota }) => ({ n, nombre, id, donde, objetivo, distancia, nota })));
    const text = marks.map((m) => `${m.n}. ${m.nombre} (${m.id}) · ${m.donde} · ${m.objetivo} · ${m.distancia} casillas · ${m.efecto}${m.nota ? ` · ${m.nota}` : ''}`).join('\n');
    try { navigator.clipboard?.writeText(text).then(() => console.log('%c[recorrido] Lista copiada al portapapeles', 'color:#7ad'), () => console.log(text)); } catch { console.log(text); }
    return marks;
  };
  d.vfxMarcadasBorrar = () => { writeMarks([]); console.log('[recorrido] Lista de marcados vacía'); };
}
