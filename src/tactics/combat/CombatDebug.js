// CombatDebug.js — Consola de pruebas del combate: window.lkDebug (escribe lkDebug.help() en la consola F12).
// Solo lee y modifica el estado del combate en curso; no toca guardados.

import { STATUS_DEFS } from './StatusSystem.js';
import { BondService } from '../../rpg/BondService.js';
import { axieMixerService } from '../../rpg/AxieMixerService.js';
import { cardsFromApiParts, cardsFromDecoded, normalizeDecoded, applyCollections, applyVariants, PART_ORDER } from '../../rpg/AxiePartsResolver.js';
import { PART_CARDS } from '../data/PartCards.js';
import { COLLECTION_CARDS } from '../data/CollectionCards.js';
import { anyPartCard } from '../data/VariantCards.js';
import { AXIE_GENES_DECODER } from '@jaatster/threejs-axie-mixer3d-public';
import { LightingManager } from '../../rpg/world/demo_scena/LightingManager.js';
import { access } from '../../ui/AccessPrefs.js';

const STATUS_DEFS_REF = () => STATUS_DEFS;

const EVENT_NAMES = [
  'spell:cast', 'spell:windup', 'spell:projectile', 'spell:impact', 'spell:barricade', 'spell:transpose',
  'spell:aura', 'spell:landing', 'spell:jumpImpact', 'spell:resolved',
  'unit:damaged', 'unit:healed', 'unit:shielded', 'unit:resourceGained', 'unit:resourceLost',
  'unit:pushStart', 'unit:collision', 'unit:healBlocked', 'unit:teleported', 'unit:pulled',
  'status:applied', 'status:expired', 'status:tick', 'status:skipTurn', 'status:resisted',
  'field:obstaclePlaced', 'field:obstacleExpired', 'field:zonePlaced', 'field:zoneExpired',
  'spell:cooldown', 'spell:ready', 'golem:summoned', 'golem:retired', 'golem:pulse', 'golem:broken', 'golem:stableGround', 'unit:retreat',
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
    // Hito 95 · gólems del Sapidae
    async golem(kind = null, x = null, z = null) {
      const sm = game.spellManager;
      const sap = (game.units || []).find((u) => !u.isDead && u.type === 'sapidae' && u.team === 'player');
      if (!sm?.golems || !sap) throw new Error('[lkDebug] Hace falta un combate con el Sapidae.');
      let cell = x != null && z != null ? { x, z } : null;
      if (!cell) {
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [0, 2]]) {
          const t = game.gridManager.getTile(sap.gridX + dx, sap.gridZ + dz);
          if (t && !t.unit && !t.obstacle && t.walkable !== false) { cell = { x: sap.gridX + dx, z: sap.gridZ + dz }; break; }
        }
      }
      if (!cell) throw new Error('[lkDebug] No hay casilla libre junto al Sapidae.');
      return sm.golems.summon(sap, cell, kind);
    },
    golems() {
      const rows = (game.spellManager?.golems?.golems || []).map((g) => ({
        id: g.id, tipo: g.golemKind, dueño: g.owner?.name, vivo: !g.isDead, x: g.gridX, z: g.gridZ,
        hp: `${g.currentHP}/${g.maxHP}`, escudo: g.shield || 0, estados: (g.statuses || []).map((s) => `${s.id}:${s.duration}`).join(' '),
      }));
      console.table(rows);
      return rows;
    },
    /** Hito 97: recargas y usos de cada unidad viva (o de una: recargas("active")). */
    recargas(who = null) {
      const sm = game.spellManager;
      const list = who ? [find(who)].filter(Boolean) : (game.units || []).filter((u) => !u.isDead && !u.isGolem);
      const rows = [];
      for (const u of list) {
        for (const id of u.spellIds || []) {
          const s = sm.getSpell(id, u);
          if (!s || !(s.cooldown || s.initialCooldown || s.castsPerTurn || s.castsPerTarget)) continue;
          rows.push({ unidad: u.name, turno: u._turnNo || 0, carta: id, recarga: sm.cooldownOf(u, s), espera: s.initialCooldown || 0,
            faltan: sm.cooldownLeft(u, s), porTurno: s.castsPerTurn || '', usados: u._castsThisTurn?.[id] || 0, porObjetivo: s.castsPerTarget || '' });
        }
      }
      console.table(rows);
      return rows;
    },
    /** Hito 98: cambia el nivel de un héroe (guardado) y, en combate, el de su unidad: prueba los desbloqueos. */
    nivel(who = 'active', lvl = 1) {
      const u = find(who);
      const heroId = u ? (u.id === 'sapidae_hero' ? 'sapidae' : u.id) : String(who);
      const em = game.equipmentManager;
      const prog = em?.getProgression?.(heroId);
      const n = Math.max(1, Math.min(20, Math.round(Number(lvl) || 1)));
      if (prog) prog.level = n;
      if (u?.config) u.config.heroLevel = n;
      if (u) refresh(u);
      console.log(`[lkDebug] ${heroId}: nivel ${n}`);
      return n;
    },
    /** Hito 97: deja todas las cartas listas (recargas y usos a cero). */
    sinRecargas(who = 'active') {
      const u = find(who);
      if (!u) return false;
      u._spellReady = {}; u._castsThisTurn = {}; u._castsOnTarget = {};
      for (const id of u.spellIds || []) if (game.spellManager.getSpell(id, u)?.initialCooldown) u._spellReady[id] = 0;
      game._updateHUD?.(u);
      return true;
    },
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
        '  axieParts(585)                diagnóstico de un Axie por ID: partes de Sky Mavis, genes, colecciones y cartas',
        '  golem("bell")                 Hito 95: invoca el gólem (sentinel | hat | bell | shell) del Sapidae junto a él',
        '  golems()                      gólems en el tablero (tipo, dueño, vida, escudo, estados)',
        '  recargas() / recargas("active")   Hito 97: recarga, espera inicial, turnos que faltan y usos por turno / por objetivo',
        '  sinRecargas("active")         deja todas sus cartas listas (sin recarga ni usos gastados)',
        '  nivel("kotaro", 7)           Hito 98: cambia el nivel del héroe (cuernos 3, espalda 7, cola 10; Sapidae: 4.ª, 5.ª y 6.ª habilidad)',
        '  bond(100)                     vínculo con el Axie principal (se guarda; en combate también habilita la Ultimate ya)',
        '  ult()                         estado de la Duo Ultimate y por qué no se puede lanzar',
        '  runes()                       runas y charms activos en este combate (estadísticas y cartas modificadas)',
        '  timer(false|true)             apaga / enciende el reloj del turno · timer({ base: 30, max: 45 }) cambia sus valores',
        '  rune("kotaro", "beast-brutal-claw") / charm("kotaro", "horn", "neutral-deadly-spell")   equipa (se aplica en el próximo combate)',
        '  ultReset()                    permite volver a usar la Ultimate en este combate (pruebas)',
        '  shadows()                     sombras del mundo abierto: estado · shadows({legacy:true}) comparar con lo anterior',
        '                                shadows({everyFrame, freeze, bias, normalBiasTexels, normalBias, depthStep, reset})',
        '  a11y()                        accesibilidad: preferencias activas y textos que no crecen con «Tamaño del texto»',
        '  a11y({ textSize: "xlarge", contrast: true, colorblind: "rg", reduceMotion: true, shake: false, autoAdvance: "slow" })   cambia y guarda',
        '  sfx()                         sonidos del mundo: grabaciones encontradas y último suelo pisado · sfx("pasos" | "voz" | "criaturas" | "pesca" | "recoleccion" | "golpes" | "combate") los toca',
        '  audio()                       sonido ambiente: isla, modo, mar y fuentes cercanas · audio({ island: "arctic" }) fuerza una isla · audio({ off: true }) quita el forzado',
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

    /**
     * Diagnóstico de las cartas de un Axie por su ID (19-oct): qué devuelve Sky Mavis (nombre, clase, id y nivel de
     * cada parte), qué dicen sus genes (variante y skin de colección) y qué carta se le asigna a cada parte.
     * Copia el resultado (copy(JSON.stringify(lkDebug.__lastAxieParts))) para revisarlo.
     */
    async axieParts(axieId) {
      const id = String(axieId);
      const data = await axieMixerService.fetchAxieData(id);
      const api = (data.parts || []).map((p) => ({ tipo: p.type, clase: p.class, nombre: p.name, id: p.id, nivel: p.stage ?? '—', especial: p.specialGenes ?? '—' }));
      const byApi = cardsFromApiParts(data.parts || []);
      let decoded = [];
      try { decoded = normalizeDecoded(await AXIE_GENES_DECODER.decode(data.newGenes || data.genes)); } catch (e) { console.warn('[lkDebug] genes:', e); }
      const byGenes = cardsFromDecoded(decoded);
      const col = applyCollections(byApi.complete ? byApi.ids : byGenes.ids, decoded);
      const vr = applyVariants(col.ids, col.collections, data.parts || []);
      col.ids = vr.ids;
      const name = (cid) => (cid ? anyPartCard(cid)?.name || cid : '—');
      const rows = PART_ORDER.map((t, i) => {
        const a = api.find((p) => String(p.tipo).toLowerCase().startsWith(t.slice(0, 3))) || {};
        const g = decoded.find((d) => String(d.type).toLowerCase().startsWith(t.slice(0, 3))) || {};
        return { parte: t, api: `${a.nombre || '—'} (${a.clase || '?'})`, apiId: a.id || '—', nivel: a.nivel, genes: g.class ? `${g.class} v${g.variant} skin ${g.skin}` : '—', 'carta por API': name(byApi.ids[i]), 'carta por genes': name(byGenes.ids[i]), colección: col.collections[i] || '—', final: name(col.ids[i]) };
      });
      console.log(`[lkDebug] Axie #${id} · ${data.name} · ${data.class}`);
      console.table(rows);
      // Modelo 3D: qué pieza pide cada parte (skin y nivel) y si existe en el catálogo del Axie Mixer
      let modelos = null;
      try {
        modelos = await axieMixerService.partModelReport(data.newGenes || data.genes, game.overworldManager?.renderer || game.sceneManager?.renderer || null, data.parts || []);
        console.log('[lkDebug] Piezas 3D (existe = está en assets/axie; seUsa = la que se dibuja):');
        console.table(modelos);
      } catch (e) { console.warn('[lkDebug] modelo 3D:', e); }
      const out = { id, name: data.name, class: data.class, api, decoded, rows, modelos, apiMissing: byApi.missing, genesMissing: byGenes.missing };
      this.__lastAxieParts = out;
      return out;
    },

    timer(arg = true) {
      const t = game.turnTimer;
      if (!t) throw new Error('[lkDebug] El reloj del turno no está instalado.');
      if (typeof arg === 'boolean') { t.enabled = arg; if (!arg) { t.stop(); const el = document.getElementById('lk-turn-timer'); if (el) el.hidden = true; } }
      else if (arg && typeof arg === 'object') Object.assign(t.config, arg);
      return { enabled: t.enabled, ...t.config, reserva: t.bank };
    },
    runes() {
      const rows = game.spellManager?.runeCharms?.summary(game.units || []) || [];
      if (!rows.length) console.log('[lkDebug] Ningún Axie lleva runas ni charms con efecto en este combate (el tutorial no las aplica).');
      else console.table(rows);
      return rows;
    },
    rune(heroId, runeId = null) {
      const svc = window.lunakaiRuneCharms;
      if (!svc) throw new Error('[lkDebug] RuneCharmService no está disponible.');
      if (runeId && svc.available?.('runes', runeId) < 1) svc.add?.('runes', runeId, 1); // pruebas: se añade a la bolsa
      svc.setRune(heroId, runeId);
      return svc.get(heroId);
    },
    charm(heroId, part, charmId = null) {
      const svc = window.lunakaiRuneCharms;
      if (!svc) throw new Error('[lkDebug] RuneCharmService no está disponible.');
      if (charmId && svc.available?.('charms', charmId) < 1) svc.add?.('charms', charmId, 1); // pruebas: se añade a la bolsa
      if (!svc.setCharm(heroId, part, charmId)) console.warn('[lkDebug] No hay PP suficientes (máx. 15) o la parte no existe.');
      return svc.get(heroId);
    },
    ultReset() { const u = game.spellManager?.ultimates; if (u) { u.used = false; game._updateHUD?.(game.activeUnit); } return true; },

    /**
     * Sombras del mundo abierto (Hito 83). Sin argumentos: muestra el estado.
     *  lkDebug.shadows({ legacy: true })        comportamiento anterior (para comparar el parpadeo)
     *  lkDebug.shadows({ everyFrame: true })    recalcular el mapa en todos los fotogramas
     *  lkDebug.shadows({ freeze: true })        el sol deja de seguir al jugador
     *  lkDebug.shadows({ bias: -0.0002, normalBiasTexels: 1.5, depthStep: 2 })   ajustes en vivo
     *  lkDebug.shadows({ normalBias: 0.05 })    normalBias fijo en metros
     *  lkDebug.shadows({ reset: true })         valores por defecto
     */
    shadows(opts) {
      const D = LightingManager.debug;
      if (opts && typeof opts === 'object') {
        if (opts.reset) {
          Object.assign(D, { everyFrame: false, legacy: false, freeze: false, bias: null, normalBias: null, normalBiasTexels: null, depthStep: null });
        }
        for (const k of ['everyFrame', 'legacy', 'freeze']) if (k in opts) D[k] = !!opts[k];
        for (const k of ['bias', 'normalBias', 'normalBiasTexels', 'depthStep']) {
          if (k in opts) D[k] = (opts[k] === null || opts[k] === undefined) ? null : Number(opts[k]);
        }
        if ('normalBiasTexels' in opts && opts.normalBiasTexels != null) D.normalBias = null;
        LightingManager.refreshAllBias();
      }
      const rows = [];
      for (const lm of LightingManager.instances) {
        const l = lm.dirLight;
        if (!l) continue;
        const sh = l.shadow;
        const ext = sh.camera.right - sh.camera.left;
        rows.push({
          activo: !!(lm.group && lm.group.visible && l.visible),
          sombras: l.castShadow,
          mapa: sh.mapSize.x,
          'caja (m)': ext,
          'celda (cm)': +(100 * ext / Math.max(1, sh.mapSize.x)).toFixed(1),
          bias: sh.bias,
          'normalBias (m)': +sh.normalBias.toFixed(4),
        });
      }
      console.table(rows);
      const def = LightingManager.defaults;
      console.log(`[lkDebug] sombras · legacy:${D.legacy} everyFrame:${D.everyFrame} freeze:${D.freeze} · depthStep:${D.depthStep ?? def.depthStep} m · por defecto bias ${def.bias}, normalBias ${def.normalBiasTexels} celda`);
      return { ...D };
    },

    /** Accesibilidad (Hito 85). Sin argumentos: estado y auditoría del tamaño del texto. */
    a11y(opts) {
      if (opts && typeof opts === 'object') access.set(opts);
      const p = access.prefs;
      console.log(`[lkDebug] accesibilidad · texto ${p.textSize} (×${access.textScale}) · velocidad ${p.textSpeed} · avance ${p.autoAdvance} · contraste ${p.contrast} · daltonismo ${p.colorblind} · reducir movimiento ${p.reduceMotion} (efectivo ${access.reduceMotion}) · temblor ×${access.shakeScale} · destellos ×${access.flashScale}`);
      console.log(`[lkDebug] reglas generadas: tamaño ${access._scaleRules ?? 0} · movimiento ${access._motionRules ?? 0}`);
      const rows = access.auditTextScale();
      if (rows.length) { console.log(`[lkDebug] ${rows.length} textos visibles NO crecen con «Muy grande»:`); console.table(rows); }
      else console.log('[lkDebug] Todos los textos visibles crecen con «Tamaño del texto».');
      return { prefs: p, sinEscalar: rows };
    },

    /** Sonidos del mundo (Hito 87): estado o prueba de una familia. */
    sfx(what) {
      const w = window.lunakaiWorldSfx || game.audio?.world;
      if (!w) { console.log('[lkDebug] Los sonidos del mundo no están cargados.'); return null; }
      if (what === 'golpes' || what === 'combate') { game.audio?.init?.(); return game.audio?.combat?.test(what === 'golpes' ? 'golpes' : 'efectos'); }
      if (what) { game.audio?.init?.(); return w.test(what); }
      const st = w.status(); console.table([st]); return st;
    },

    /** Sonido ambiente (Hito 86). */
    audio(opts) {
      const amb = window.lunakaiAmbience || game.audio?.ambience;
      if (!amb || !amb.started) { console.log('[lkDebug] El ambiente aún no ha arrancado (necesita un clic o una tecla para iniciar el audio).'); return null; }
      if (opts && typeof opts === 'object') amb.force(opts.off ? null : { island: opts.island || amb.island || 'forest', mode: opts.mode || 'world' });
      return amb.status();
    },

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
