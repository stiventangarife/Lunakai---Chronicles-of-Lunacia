// PvpBot.js — Cerebro de los rivales bot de la Arena PvP (plan: docs/PLAN_BOTS_ARENA.md, fase R0).
//
// Decide el turno de una unidad sobre el motor sin gráficos (HeadlessCombat): sin three.js, sin DOM y sin tiempo real,
// para que funcione igual en Node (pruebas), en el navegador y en Deno (Edge Function `pvp-bot`, fase R2).
//
// Reglas que no se pueden romper (HITO_123 §5):
//   · El azar del bot es SOLO el suyo (`rng`, mulberry32 a partir de la semilla de la partida). Nunca Math.random ni
//     Date.now: con la misma partida, el bot juega igual, así cualquier partida se puede reproducir.
//   · El bot no toca el azar de las reglas (`sm.rng`): el pronóstico (combat/Forecast.js) no lo usa, y las posiciones
//     «de prueba» se deshacen antes de aplicar nada.
//   · Solo manda órdenes legales a través de engine.apply(), que las comprueba igual que el servidor y el árbitro.
//
// Niveles (según los puntos del bot, ver levelForPoints):
//   novice  carta que más daño hace desde donde está, se acerca en línea recta, bastante azar (jugador que empieza).
//   normal  pronóstico de daño (como TacticalAI): letal, estados, eficiencia por PA; prueba moverse antes de lanzar;
//           cura o protege si un aliado está herido; a veces elige la segunda mejor jugada.
//   strong  normal + se centra en el rival más débil, valora gólems y cartas de apoyo, y al final del turno se coloca
//           donde menos rivales puedan alcanzarle (o a su alcance justo si ataca a distancia). Casi no se equivoca.
//
// Medidas (node tools/pvp/bot-test.mjs 300, equipos al azar, cada pareja desde los dos bandos): normal gana al novato
// ~71 %, fuerte a normal ~55 %, fuerte al jugador sencillo de las pruebas ~82 %; decidir un turno ~1 ms (máx. ~35 ms).
// `planPA` (mejor combinación de cartas para los PA del turno) se probó y no mejora al fuerte (~54 %): queda apagado;
// `tune` permite probar variantes de un nivel sin tocar los perfiles (solo para pruebas).

import { forecast } from '../combat/Forecast.js';
import { mulberry32 } from './SeededRandom.js';

export const BOT_LEVELS = ['novice', 'normal', 'strong'];

/** Nivel de juego de un bot según sus puntos de la Arena. */
export function levelForPoints(points) {
  const p = Number(points) || 0;
  if (p < 950) return 'novice';
  if (p <= 1150) return 'normal';
  return 'strong';
}

/** Azar propio del bot para una partida (no se mezcla con el de las reglas). */
export function botRng(seed, salt = 0) {
  return mulberry32(((Number(seed) >>> 0) ^ 0xB07B0700 ^ (salt >>> 0)) >>> 0);
}

const PROFILE = {
  //            ruido en la puntuación · prob. de elegir la 2.ª mejor · prueba moverse antes de lanzar · colocación final
  novice: { noise: 14, second: 0.35, lookMove: false, place: false, support: 0.4, utility: 0.10, planPA: false },
  normal: { noise: 5,  second: 0.15, lookMove: true,  place: false, support: 0.9, utility: 0.25, planPA: false },
  strong: { noise: 1.5, second: 0.05, lookMove: true, place: true,  support: 1.0, utility: 0.6,  planPA: false },
};

const MAX_STEPS = 14; // órdenes por turno como mucho (moverse y lanzar varias veces)

const alive = (u) => u && !u.isDead;
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const posOf = (u) => ({ x: u.gridX, z: u.gridZ });

/**
 * Juega el turno entero de la unidad activa del motor `e` (HeadlessCombat). Aplica las órdenes al motor y las
 * devuelve en orden (las mismas que la Edge Function manda al servidor con pvp_act).
 *
 * @param {HeadlessCombat} e
 * @param {object} opts  level ('novice'|'normal'|'strong'), rng (función 0..1 del bot)
 * @returns {Promise<object[]>} órdenes aplicadas, terminando en { t: 'end' } salvo que el combate acabe antes
 */
export async function playBotTurn(e, { level = 'normal', rng, onError = null, tune = null } = {}) {
  const prof = tune ? { ...(PROFILE[level] || PROFILE.normal), ...tune } : (PROFILE[level] || PROFILE.normal);
  const pick = typeof rng === 'function' ? rng : botRng(e.setup?.seed || 1);
  const orders = [];
  const u0 = e.activeUnit;
  if (!u0 || e.over) return orders;
  const side = e.turnSide;
  const apply = async (o) => {
    await e.apply(o); // lanza IllegalOrder si algo no cuadra: lo recoge el bucle de abajo
    orders.push(o);
  };

  try {
    for (let step = 0; step < MAX_STEPS && !e.over && e.turnSide === side && e.activeUnit === u0; step++) {
      const plan = chooseAction(e, u0, prof, pick);
      if (!plan) break;
      if (plan.move) {
        await apply({ t: 'move', unit: u0.id, x: plan.move.x, z: plan.move.z });
        if (e.over || e.activeUnit !== u0) break;
      }
      if (plan.cast) {
        await apply({ t: 'cast', unit: u0.id, spell: plan.cast.spell, x: plan.cast.x, z: plan.cast.z });
        continue;
      }
      if (plan.move) continue; // solo colocación: tras moverse puede que ya llegue a alguien
      break;
    }
    if (!e.over && e.activeUnit === u0 && prof.place && u0.currentPM > 0) {
      const spot = finalPlacement(e, u0);
      if (spot) await apply({ t: 'move', unit: u0.id, x: spot.x, z: spot.z });
    }
  } catch (err) {
    // Una orden que el motor no acepta sería un fallo del bot, no del jugador: se termina el turno sin más.
    if (onError) onError(err);
    else if (typeof console !== 'undefined') console.warn('[PvpBot] orden rechazada:', err?.code || err?.message || err);
  }
  if (!e.over && e.activeUnit === u0) {
    const end = { t: 'end', unit: u0.id };
    await e.apply(end);
    orders.push(end);
  }
  return orders;
}

// ------------------------------------------------------------------------------------------------ decisión

/** Mejor acción ahora: { move?, cast? } o null (no hay nada útil que hacer). */
function chooseAction(e, u, prof, pick) {
  const foes = e.units.filter((x) => alive(x) && x.team !== u.team);
  if (!foes.length) return null;

  // 1. Lanzar desde donde está (y, si el nivel lo permite, desde cada casilla alcanzable)
  const options = [];
  collectCasts(e, u, prof, pick, null, options);
  if (prof.lookMove && u.currentPM > 0) {
    for (const c of reachable(e, u)) collectCasts(e, u, prof, pick, c, options);
  }
  if (options.length && prof.planPA) {
    const best = planByPA(options, u.currentPA);
    if (best && best.score > 0) return { move: best.from, cast: best.cast };
  }
  if (options.length) {
    options.sort((a, b) => b.score - a.score || a.tie - b.tie);
    let best = options[0];
    if (options.length > 1 && pick() < prof.second && options[1].score > 0.6 * best.score) best = options[1];
    if (best.score > 0) return { move: best.from, cast: best.cast };
  }

  // 2. Nada que lanzar: acercarse (o colocarse a su alcance)
  if (u.currentPM > 0) {
    const m = approach(e, u, foes, pick);
    if (m) return { move: m };
  }
  return null;
}

/**
 * Fuerte: para cada casilla de salida, la mejor combinación de cartas distintas que cabe en los PA del turno
 * (puntuación sin dividir por PA). Devuelve la primera carta (la de más valor) de la mejor combinación; el bucle del
 * turno vuelve a planear después de cada lanzamiento, con la vida y los PA ya actualizados.
 */
function planByPA(options, pa) {
  const groups = new Map();
  for (const o of options) {
    const k = o.from ? `${o.from.x},${o.from.z}` : 'here';
    let g = groups.get(k);
    if (!g) groups.set(k, (g = { from: o.from, bySpell: new Map(), moveCost: o.moveCost }));
    const cur = g.bySpell.get(o.cast.spell);
    if (!cur || o.raw > cur.raw) g.bySpell.set(o.cast.spell, o);
  }
  let best = null, bestValue = 0;
  for (const g of groups.values()) {
    const list = [...g.bySpell.values()].filter((o) => o.raw > 0).sort((a, b) => b.raw - a.raw).slice(0, 8);
    let value = 0, first = null;
    for (let mask = 1; mask < (1 << list.length); mask++) {
      let cost = 0, v = 0, top = null;
      const hit = new Map(); // rival → { dmg, hp, w, focus }
      for (let i = 0; i < list.length; i++) {
        if (!(mask & (1 << i))) continue;
        const o = list[i];
        cost += o.pa;
        v += o.base;
        for (const t of o.parts || []) {
          const h = hit.get(t.id) || { dmg: 0, hp: t.hp, w: t.w, focus: 0 };
          h.dmg += t.dmg; h.focus = Math.max(h.focus, t.focus);
          hit.set(t.id, h);
        }
        if (!top || o.raw > top.raw) top = o;
      }
      for (const h of hit.values()) v += h.w * (Math.min(h.dmg, h.hp) + (h.dmg >= h.hp ? 60 : 0)) + h.focus;
      if (cost <= pa && v > value) { value = v; first = top; }
    }
    value -= g.moveCost;
    if (first && value > bestValue) { bestValue = value; best = first; }
  }
  return best ? { ...best, score: bestValue } : null;
}

/** Añade a `out` las cartas lanzables por `u` desde `from` (null = donde está), con su puntuación. */
function collectCasts(e, u, prof, pick, from, out) {
  const evalHere = () => {
    for (const id of u.spellIds) {
      const spell = e.sm.getSpell(id, u);
      if (!spell || !e.sm._canPay(u, spell) || !e.sm.canCastNow(u, spell)) continue;
      const cells = e.sm.getValidTargetCells(u, spell);
      for (const c of cells) {
        const parts = prof.planPA ? [] : null;
        const raw = scoreCast(e, u, spell, c, prof, parts);
        if (raw <= 0) continue;
        const pa = spell.paCost === 'X' ? (u.currentPA || 1) : Math.max(1, Number(spell.paCost) || 1);
        const moveCost = from ? 1.5 + dist(posOf(u), from) * 0.2 : 0; // moverse sin necesidad tiene un pequeño coste
        const jitter = (pick() - 0.5) * prof.noise;
        out.push({
          from: from ? { x: from.x, z: from.z } : null,
          cast: { spell: id, x: c.x, z: c.z },
          score: raw / pa ** 0.35 - moveCost + jitter, // algo de eficiencia por PA
          raw: raw + jitter,
          pa,
          parts,
          base: parts ? raw - parts.reduce((t, x) => t + x.own + x.focus, 0) : raw, // lo que no es daño a rivales
          moveCost,
          tie: out.length, // desempate estable (determinista)
        });
      }
    }
  };
  if (!from) return evalHere();
  withVirtualPos(e, u, from, evalHere);
}

/** Puntuación de lanzar `spell` en `cell`: daño útil, letal, estados, curas y escudos; penaliza dañar aliados. */
function scoreCast(e, u, spell, cell, prof, parts = null) {
  const sm = e.sm;
  const isDmg = sm.isDamageSpell(spell);
  // Solo casillas con algo cerca: ahorra miles de pronósticos inútiles
  const near = e.units.some((x) => alive(x) && dist(posOf(x), cell) <= (spell.areaType && spell.areaType !== 'single' ? 2 : 0));
  let fc = null;
  if (near) { try { fc = forecast(sm, u, spell, cell); } catch { fc = null; } }
  let score = 0;
  const weakest = Math.min(...e.units.filter((x) => alive(x) && x.team !== u.team && !x.isGolem).map((x) => x.currentHP / x.maxHP), 1);
  for (const r of fc?.targets || []) {
    const t = r.unit;
    if (!t) continue;
    const foe = t.team !== u.team;
    if (r.damage) {
      const avg = (r.damage.min + r.damage.max) / 2;
      const toHP = Math.max(0, avg - ((r.damage.shieldMin + r.damage.shieldMax) / 2 || 0));
      if (foe) {
        let s = Math.min(toHP, t.currentHP) + (r.damage.lethal ? 60 : r.damage.mayKill ? 25 : 0);
        let focus = 0;
        if (t.isGolem) s *= 0.45;                                              // los gólems importan menos
        else if (prof.place && t.currentHP / t.maxHP <= weakest + 1e-6) focus = 8; // fuerte: rematar al más débil
        score += s + focus;
        // Para sumar varias cartas del turno (planByPA): daño con tope en la vida y remate una sola vez por rival
        if (parts) parts.push({ id: t.id, dmg: toHP, hp: t.currentHP, w: t.isGolem ? 0.45 : 1, own: s, focus });
      } else {
        score -= 30 + toHP;
      }
    }
    if (foe && !t.isGolem) score += 12 * (r.statuses || []).filter((st) => st.kind === 'debuff' && !sm.statuses.has(t, st.id)).length;
    if (!foe && !t.isGolem) {
      const missing = t.maxHP - t.currentHP;
      if (r.heal && t.currentHP < t.maxHP * 0.7) score += prof.support * Math.min(r.heal, missing) * 0.9;
      if (r.shield && t.currentHP < t.maxHP * 0.75 && !(t.shield > 0)) score += prof.support * r.shield * 0.5;
      score += prof.support * 6 * (r.statuses || []).filter((st) => st.kind === 'buff' && !sm.statuses.has(t, st.id)).length;
    }
  }
  // Cartas sin objetivo directo (gólems, zonas): de vez en cuando, más en los niveles altos
  if (score === 0 && !isDmg && !near && (spell.isGolemSummon || (spell.effects || []).some((x) => x.type === 'zone' || x.type === 'summon'))) {
    const foes = e.units.filter((x) => alive(x) && x.team !== u.team && !x.isGolem);
    const close = Math.min(...foes.map((f) => dist(posOf(f), cell)));
    if (close <= 3) score = 10 * prof.utility;
  }
  return score;
}

// ------------------------------------------------------------------------------------------------ movimiento

function reachable(e, u) {
  if (!(u.currentPM > 0)) return [];
  return e.grid.getReachableCells(u.gridX, u.gridZ, u.currentPM, u).filter((c) => !(c.x === u.gridX && c.z === u.gridZ));
}

/** Coloca la unidad en `cell` solo mientras dura fn() (para pronosticar desde allí) y la devuelve a su sitio. */
function withVirtualPos(e, u, cell, fn) {
  const g = e.grid;
  const t0 = g.getTile(u.gridX, u.gridZ), t1 = g.getTile(cell.x, cell.z);
  if (!t1 || (t1.unit && t1.unit !== u)) return;
  const ox = u.gridX, oz = u.gridZ, had0 = t0 && t0.unit === u;
  if (had0) t0.unit = null;
  t1.unit = u; u.gridX = cell.x; u.gridZ = cell.z;
  try { fn(); } finally {
    t1.unit = null; u.gridX = ox; u.gridZ = oz;
    if (had0) t0.unit = u;
  }
}

/** Alcance de daño más largo de la unidad (1 si solo pega cuerpo a cuerpo). */
function attackRange(e, u) {
  let r = 1;
  for (const id of u.spellIds) {
    const sp = e.sm.getSpell(id, u);
    if (sp && e.sm.isDamageSpell(sp)) r = Math.max(r, Number(sp.maxRange) || 1);
  }
  return r;
}

/** Acercarse al objetivo prioritario: a distancia de ataque si es de distancia, pegado si es cuerpo a cuerpo. */
function approach(e, u, foes, pick) {
  const cells = reachable(e, u);
  if (!cells.length) return null;
  const targets = foes.filter((f) => !f.isGolem);
  const list = targets.length ? targets : foes;
  // Objetivo: el más débil en %, desempate por cercanía
  const target = [...list].sort((a, b) => (a.currentHP / a.maxHP) - (b.currentHP / b.maxHP) || dist(posOf(u), posOf(a)) - dist(posOf(u), posOf(b)))[0];
  const range = attackRange(e, u);
  const want = (c) => {
    const d = dist(c, posOf(target));
    return range > 1 ? Math.abs(d - range) + (d < 2 ? 2 : 0) : d;
  };
  let best = null, bestScore = want(posOf(u));
  for (const c of cells) {
    const s = want(c) + pick() * 0.3;
    if (s < bestScore - 0.25) { best = c; bestScore = s; }
  }
  return best ? { x: best.x, z: best.z } : null;
}

/** Fuerte: con los PM que sobran, la casilla donde menos rivales pueden alcanzarle el turno que viene. */
function finalPlacement(e, u) {
  const foes = e.units.filter((x) => alive(x) && x.team !== u.team && !x.isGolem);
  if (!foes.length) return null;
  const threat = (c) => foes.reduce((t, f) => t + (dist(posOf(f), c) <= (f.maxPM || f.currentPM || 3) + attackRange(e, f) ? 1 : 0), 0);
  const range = attackRange(e, u);
  const near = (c) => Math.min(...foes.map((f) => dist(posOf(f), c)));
  // Cuerpo a cuerpo: no huir lejos (perdería el turno que viene); a distancia: quedarse cerca de su alcance
  const score = (c) => threat(c) * 10 + (range > 1 ? Math.abs(near(c) - range) : Math.max(0, near(c) - 2));
  let best = null, bestScore = score(posOf(u));
  for (const c of reachable(e, u)) {
    const s = score(c);
    if (s < bestScore - 0.5) { best = c; bestScore = s; }
  }
  return best ? { x: best.x, z: best.z } : null;
}
