// PvpRoster.js — Equipos igualados de la Arena PvP (fase P3).
// Plan: docs/PLAN_ARENA_PVP.md, sección 14. Lo usan el combate del juego, el motor sin gráficos (pruebas, repeticiones)
// y, en la fase P4, el árbitro del servidor: los tres montan EXACTAMENTE las mismas unidades a partir de la partida.
//
// De la instantánea de cada jugador (la guarda el servidor al entrar en la cola) solo cuentan la clase del Sapidae y
// las 6 cartas de su Axie principal (con sus variantes de colección y de nivel 2). Todo lo demás está igualado: nivel
// 10 (todo desbloqueado), sin atributos repartidos, sin equipo, sin runas, sin charms y sin Ultimate.
//
// Bandos y perspectiva: el bando A y el B son fijos (los decide el servidor). Cada cliente se ve a sí mismo abajo, como
// en cualquier combate: sus unidades son 'player' y las del rival 'enemy'. Las reglas son simétricas (aliado / enemigo
// según el equipo del lanzador) y el orden de las unidades es siempre el mismo (A_sapidae, A_axie, B_sapidae, B_axie),
// así que las dos perspectivas juegan la misma partida. La huella del estado usa el bando (pvpSide), no el equipo.

import { SAPIDAE_CLASSES } from '../../rpg/SaveSlotManager.js';
import { axieBaseStats } from '../data/AxieBaseStats.js';
import { registerVariantCard, variantId, anyPartCard } from '../data/VariantCards.js';
import { PART_CARDS } from '../data/PartCards.js';
import { COLLECTION_CARDS } from '../data/CollectionCards.js';
import { getBattleMap } from '../maps/BattleMaps.js';
import { facingTowards } from '../maps/BattleMapLayout.js';

export const PVP_LEVEL = 10;
export const PVP_SIDES = ['A', 'B'];
const LEVEL_HP = (PVP_LEVEL - 1) * 2;     // los mismos +2 de vida y +3 de iniciativa por nivel que EquipmentManager
const LEVEL_INIT = (PVP_LEVEL - 1) * 3;
const AXIE_CLASSES = ['beast', 'plant', 'aquatic', 'bird', 'bug', 'reptile', 'mech', 'dawn', 'dusk'];

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const otherSide = (s) => (s === 'A' ? 'B' : 'A');

/**
 * Variantes de la instantánea del rival: solo se aceptan las que el juego crearía igual (id = el de variantId,
 * carta base existente). Así un dato manipulado no puede pisar otra carta.
 */
function registerVariants(list) {
  if (!Array.isArray(list)) return;
  for (const d of list.slice(0, 6)) {
    if (!d || typeof d !== 'object') continue;
    const baseId = str(d.baseId, 96), name = str(d.name, 48);
    const stage = Number(d.stage) >= 2 ? 2 : 1;
    if (!baseId || !name || !(PART_CARDS[baseId] || COLLECTION_CARDS[baseId])) continue;
    const id = variantId(baseId, name, stage);
    if (d.id !== id) continue;
    registerVariantCard({ id, baseId, name, stage, collection: str(d.collection, 24) || null });
  }
}

/** Personalización del Sapidae (solo aspecto): valores simples, cortos. */
function cleanCustomization(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const out = {};
  for (const [k, v] of Object.entries(c).slice(0, 40)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(k)) continue;
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v;
    else if (typeof v === 'string' && v.length <= 32) out[k] = v;
  }
  return out;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Las dos unidades de un bando. Coordenadas, ids y orden: los mismos en las dos perspectivas. */
function sideUnits(side, snap, team, spawns, foeSpawns) {
  const s = snap || {};
  const clsKey = SAPIDAE_CLASSES[s.sapidaeClass] ? s.sapidaeClass : 'crafter';
  const cls = SAPIDAE_CLASSES[clsKey];
  const ax = s.axie || {};
  registerVariants(ax.variants);
  const cards = (Array.isArray(ax.cards) ? ax.cards : []).slice(0, 6).map((id) => str(id, 96)).filter((id) => anyPartCard(id));
  const axClassKey = AXIE_CLASSES.includes(String(ax.class || '').toLowerCase()) ? String(ax.class).toLowerCase() : 'beast';
  const axStats = axieBaseStats(axClassKey, cards);
  const collections = Array.isArray(ax.collections) ? ax.collections : [];
  const partCollections = {};
  cards.forEach((id, i) => { const col = str(collections[i], 24); if (col) partCollections[id] = col; });

  const at = (i) => spawns[Math.min(i, spawns.length - 1)];
  const sapPos = at(0), axPos = at(1);
  const common = { team, pvpSide: side, heroLevel: PVP_LEVEL, skillLevels: {}, maxPA: 6, maxPM: 3, critRate: 20,
    bonusDamage: 0, bonusMeleeDamage: 0, bonusRangedDamage: 0, bonusMagicDamage: 0, collisionBonus: 0, initialShield: 0 };
  const name = str(s.name, 32) || `Sapidae ${side}`;
  const genes = typeof ax.genes === 'string' && /^0x[0-9a-fA-F]{2,600}$/.test(ax.genes) ? ax.genes : null;
  const axieId = /^\d{1,12}$/.test(String(ax.axieId || '')) ? String(ax.axieId) : null;
  return [
    {
      ...common,
      id: `${side}_sapidae`,
      name,
      type: 'sapidae',
      modelType: /^[a-z0-9-]{1,40}$/.test(String(s.sapidaeModel || '')) ? s.sapidaeModel : 'sapidae-m-a',
      archetype: cls.archetype,
      sapidaeClass: clsKey,
      isSapidae: true,
      customization: cleanCustomization(s.customization),
      equipped: {},
      x: sapPos.x, z: sapPos.z,
      initialFacing: facingTowards(sapPos, foeSpawns),
      maxHP: cls.maxHP + LEVEL_HP,
      initiative: (cls.initiative || 90) + LEVEL_INIT,
      supportPower: 25,
      spellIds: [...cls.spells],
      scale: 1.05,
    },
    {
      ...common,
      id: `${side}_axie`,
      name: str(ax.name, 48) || 'Axie',
      type: 'axie',
      modelType: 'axie',
      axieId,
      genes,
      axieClass: cap(axClassKey),
      equipped: {},
      x: axPos.x, z: axPos.z,
      initialFacing: facingTowards(axPos, foeSpawns),
      maxHP: axStats.baseHP + LEVEL_HP,
      initiative: axStats.baseInitiative + LEVEL_INIT,
      supportPower: 0,
      spellIds: cards.length ? cards : ['kotaro_slash'],
      partCollections,
      scale: 0.88,
    },
  ];
}

/**
 * Salidas de la Arena (fase P5): el bando A usa las 2 primeras salidas P del mapa (Sapidae, Axie). El bando B, las
 * mismas giradas media vuelta si el mapa es simétrico (todos los de la lista PvP lo son): así los dos empiezan en
 * casillas equivalentes. El orden de las salidas del mapa (BattleMapLayout.orderSpawns) desempata por fila y columna,
 * y no da casillas equivalentes a los dos bandos. Mapas no simétricos: las 2 primeras salidas E, como antes.
 */
export function pvpSpawns(map) {
  const A = map.spawns.player.slice(0, 2);
  const rot = A.map((c) => ({ x: map.width - 1 - c.x, z: map.height - 1 - c.z }));
  const isE = (c) => map.spawns.enemy.some((e) => e.x === c.x && e.z === c.z);
  const B = A.length === 2 && rot.every(isE) ? rot : map.spawns.enemy.slice(0, 2);
  return { A, B, symmetric: B === rot };
}

/**
 * Configuración del combate de una partida vista desde el bando `mySide` ('A' | 'B'; el árbitro usa 'A').
 * @param {object} match  partida del servidor (_pvp_match_out): seed, map, tieBreak, A, B, maxRounds
 * @returns {{ mapId, seed, tieBreak, maxRounds, units, mySide, teamOf, sideOfTeam }}
 */
export function pvpCombatSetup(match, mySide = 'A') {
  const me = mySide === 'B' ? 'B' : 'A';
  const teamOf = (side) => (side === me ? 'player' : 'enemy');
  const map = getBattleMap(match.map);
  if (!map) throw new Error(`mapa desconocido: ${match.map}`);
  const spawns = pvpSpawns(map);
  const units = PVP_SIDES.flatMap((side) => sideUnits(side, match[side], teamOf(side), spawns[side], spawns[otherSide(side)]));
  return {
    mapId: map.id,
    seed: Number(match.seed) >>> 0,
    tieBreak: teamOf(match.tieBreak === 'B' ? 'B' : 'A'),
    maxRounds: Number(match.maxRounds) > 0 ? Number(match.maxRounds) : 25,
    units,
    mySide: me,
    teamOf,
    sideOfTeam: (team) => (team === 'player' ? me : otherSide(me)),
  };
}

/** Vida total en % de un bando (sin gólems), redondeada a 6 decimales: la misma decisión en todas las máquinas. */
export function sideHealth(units, team) {
  const list = units.filter((u) => u.team === team && !u.isGolem);
  const max = list.reduce((t, u) => t + (u.maxHP || 0), 0);
  const cur = list.reduce((t, u) => t + (u.isDead ? 0 : Math.max(0, u.currentHP || 0)), 0);
  return max > 0 ? Math.round((cur / max) * 1e6) : 0;
}

/** Ganador por vida al agotar las rondas: 'player' | 'enemy' | null (empate). */
export function winnerByHealth(units) {
  const a = sideHealth(units, 'player'), b = sideHealth(units, 'enemy');
  return a > b ? 'player' : b > a ? 'enemy' : null;
}
