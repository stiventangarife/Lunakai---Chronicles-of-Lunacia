// CombatDebug.js — Consola de pruebas del combate: window.lkDebug (escribe lkDebug.help() en la consola F12).
// Solo lee y modifica el estado del combate en curso; no toca guardados.

import { STATUS_DEFS } from './StatusSystem.js';
import { BondService } from '../../rpg/BondService.js';

const STATUS_DEFS_REF = () => STATUS_DEFS;

const EVENT_NAMES = [
  'spell:cast', 'spell:windup', 'spell:projectile', 'spell:impact', 'spell:barricade', 'spell:transpose',
  'spell:aura', 'spell:landing', 'spell:jumpImpact', 'spell:resolved',
  'unit:damaged', 'unit:healed', 'unit:shielded', 'unit:resourceGained', 'unit:resourceLost',
  'unit:pushStart', 'unit:collision', 'unit:healBlocked', 'unit:teleported', 'unit:pulled',
  'status:applied', 'status:expired', 'status:tick', 'status:skipTurn', 'status:resisted',
  'field:obstaclePlaced', 'field:obstacleExpired', 'field:zonePlaced', 'field:zoneExpired',
];

export function installCombatDebug(game) {
  if (typeof window === 'undefined') return null;
  let eventOffs = [];

  const units = () => (game.units || []).filter((u) => !u.isDead);
  const find = (q) => {
    const all = game.units || [];
    if (q && typeof q === 'object') return q;
    const s = String(q ?? '').toLowerCase();
    if (!s || s === 'active') return game.activeUnit || null;
    return all.find((u) => String(u.id).toLowerCase() === s)
      || all.find((u) => String(u.name || '').toLowerCase().includes(s))
      || all.find((u) => String(u.id).toLowerCase().includes(s))
      || null;
  };
  const need = (q) => {
    const u = find(q);
    if (!u) throw new Error(`[lkDebug] No encuentro la unidad "${q}". Usa lkDebug.units() para ver los ids.`);
    return u;
  };
  const refresh = (u) => {
    if (typeof u.updateHUD === 'function') u.updateHUD();
    if (game.activeUnit === u && typeof game._updateHUD === 'function') game._updateHUD(u);
  };

  const api = {
    help() {
      console.log([
        'lkDebug — consola de pruebas del combate',
        '  units()                       tabla de unidades vivas (id, equipo, HP, escudo, PA, PM, clase, iniciativa)',
        '  unit("shinji")                devuelve la unidad (por id o parte del nombre; "active" = la del turno)',
        '  give("active", {pa:3, pm:2, shield:50, hp:40})   suma recursos',
        '  damage("foe", 50) / heal("hero", 50)',
        '  killEnemies()                 derrota a todos los enemigos (fin de combate)',
        '  turn()                        ronda actual y orden de turnos',
        '  events(true|false)            muestra en consola cada evento del combate',
        '  presentation(false|true)      apaga / enciende VFX, sonidos y textos (la lógica sigue igual)',
        '  status("foe", "poison", {value:20, duration:2})   aplica un estado (lista: statusList())',
        '  statuses("foe") / clearStatus("foe")              ver / quitar estados',
        '  setClass("foe", "Plant")      cambia la clase elemental de una unidad',
        '  obstacle(x, z, rondas)        coloca un obstáculo temporal',
        '  cast("active", {effects:[...], targetType:"enemy", areaType:"cross1"}, x, z)   prueba una habilidad por datos',
        '  auditParts()                  cartas de partes de cada Axie del escuadrón (fuente: caché / API / genes)',
        '  bond(100)                     vínculo con el Axie principal (se guarda; en combate también habilita la Ultimate ya)',
        '  ult()                         estado de la Duo Ultimate y por qué no se puede lanzar',
        '  ultReset()                    permite volver a usar la Ultimate en este combate (pruebas)',
      ].join('\n'));
    },

    units() {
      const rows = units().map((u) => ({
        id: u.id, nombre: u.name, equipo: u.team, HP: `${u.currentHP}/${u.maxHP}`, escudo: u.shield || 0,
        PA: `${u.currentPA}/${u.maxPA}`, PM: `${u.currentPM}/${u.maxPM}`, clase: u.axieClass || '-', ini: u.initiative,
      }));
      console.table(rows);
      return rows;
    },

    unit: find,

    give(q, { pa = 0, pm = 0, shield = 0, hp = 0 } = {}) {
      const u = need(q);
      u.currentPA += pa;
      u.currentPM += pm;
      u.shield = (u.shield || 0) + shield;
      if (hp) u.currentHP = Math.min(u.maxHP, u.currentHP + hp);
      refresh(u);
      if (game.activeUnit === u && typeof game._refreshMovementHighlights === 'function') game._refreshMovementHighlights();
      return u;
    },

    damage(q, amount = 50) { const u = need(q); const r = u.takeDamage(amount); refresh(u); return r; },
    heal(q, amount = 50) { const u = need(q); const r = u.heal(amount); refresh(u); return r; },

    killEnemies() {
      units().filter((u) => u.team === 'enemy').forEach((u) => u.takeDamage((u.currentHP || 0) + (u.shield || 0) + 9999));
      if (game.turnManager && typeof game.turnManager.checkCombatEnd === 'function') game.turnManager.checkCombatEnd();
    },

    turn() {
      const tm = game.turnManager;
      if (!tm) return null;
      const info = { ronda: tm.round, activa: tm.getActiveUnit()?.id, orden: (tm.queue || []).map((u) => `${u.id}(${u.initiative})`) };
      console.log(info);
      return info;
    },

    events(on = true) {
      eventOffs.forEach((off) => off());
      eventOffs = [];
      const bus = game.spellManager && game.spellManager.events;
      if (!on || !bus) return false;
      eventOffs = EVENT_NAMES.map((name) => bus.on(name, (p) => {
        const short = {};
        for (const [k, v] of Object.entries(p || {})) {
          if (v && typeof v === 'object' && 'gridX' in v) short[k] = v.id;
          else if (k === 'spell' && v) short[k] = v.id;
          else if (typeof v !== 'object') short[k] = v;
        }
        console.log(`%c[combate] ${name}`, 'color:#D3AE6C', short);
      }));
      return true;
    },

    statusList() {
      const defs = game.spellManager?.statuses ? STATUS_DEFS_REF() : {};
      console.table(Object.entries(defs).map(([id, d]) => ({ id, nombre: d.label, tipo: d.kind })));
      return Object.keys(defs);
    },

    status(q, id, { value, duration = 2 } = {}) {
      const u = need(q);
      const r = game.spellManager.statuses.apply(u, id, { value, duration });
      refresh(u);
      return r;
    },

    statuses(q) {
      const u = need(q);
      const rows = (u.statuses || []).map((s) => ({ id: s.id, valor: s.value, turnos: s.duration }));
      console.table(rows);
      return rows;
    },

    clearStatus(q) {
      const u = need(q);
      [...(u.statuses || [])].forEach((s) => game.spellManager.statuses.remove(u, s.id, 'debug'));
      refresh(u);
    },

    setClass(q, cls) { const u = need(q); u.axieClass = cls; return u.axieClass; },

    obstacle(x, z, rounds = 2) { return game.spellManager.field.placeObstacle({ x, z, rounds, kind: 'debug' }); },

    async cast(q, spell, x, z) {
      const u = need(q);
      const full = { id: 'debug_spell', name: 'Debug', paCost: 0, minRange: 0, maxRange: 99, requiresLoS: false, isLinear: false, targetType: 'any', areaType: 'single', ...spell };
      const ok = await game.spellManager.castSpell(u, full, { x, z });
      if (game.turnManager?.checkCombatEnd) game.turnManager.checkCombatEnd();
      refresh(u);
      return ok;
    },

    bond(value = 100, heroId = null) {
      const squad = typeof game.equipmentManager?.getSquad === 'function' ? game.equipmentManager.getSquad() : [];
      const id = heroId || squad[1] || game.spellManager?.ultimates?.axie?.id;
      if (!id) throw new Error('[lkDebug] No hay Axie principal en el escuadrón');
      const v = BondService.set(id, value);
      const ult = game.spellManager?.ultimates;
      if (ult && ult.axie && ult.axie.id === id) { ult.bond = v; game._updateHUD?.(game.activeUnit); }
      console.log(`[lkDebug] Vínculo con ${id}: ${v}%`);
      return v;
    },

    ult() {
      const u = game.spellManager?.ultimates;
      if (!u) return null;
      const c = u.check(game.activeUnit);
      const info = { ultimate: u.spell?.name || '—', axie: u.axie?.id || '—', clase: u.axie?.axieClass || '—', vinculo: u.bond, usada: u.used, ronda: game.turnManager?.round, puede: c.ok, motivo: c.label };
      console.table([info]);
      return info;
    },

    async auditParts(force = true) {
      const em = game.equipmentManager;
      const r = game.partsResolver;
      if (!r || !em?.heroesBase) throw new Error('[lkDebug] No hay resolutor de cartas de partes');
      const ids = typeof em.getSquad === 'function' ? em.getSquad() : Object.keys(em.heroesBase);
      const heroes = ids.map((id) => em.heroesBase[id]).filter((h) => h && (h.axieId || h.genes));
      const rows = force ? await r.audit(heroes) : heroes.map((h) => ({ axie: h.name || h.axieId, id: h.axieId, cartas: (r.idsFor(h) || []).join(' · ') || '—' }));
      console.table(rows);
      return rows;
    },

    ultReset() { const u = game.spellManager?.ultimates; if (u) { u.used = false; game._updateHUD?.(game.activeUnit); } return true; },

    presentation(on = true) {
      const sm = game.spellManager;
      if (!sm || !sm.presentation) return false;
      sm.presentation.uninstall();
      if (on) sm.presentation.install(sm.events);
      console.log(on ? '[lkDebug] Presentación por defecto activada' : '[lkDebug] Presentación desactivada (solo lógica)');
      return on;
    },
  };

  window.lkDebug = api;
  return api;
}
