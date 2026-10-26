// GatheringCatalog.js — Puntos de recolección del mundo abierto (datos, sin three ni DOM).
//
// Una actividad por isla, pocos puntos (3 por isla + el árbol de la Forja). Genesis no tiene.
//   · Bosque (2_2): pesca en el río (la hace el Axie con la caña «Whip»: pescado y koi, comida) + 1 árbol junto a la Forja.
//   · Ártico (2_1): tala de abetos (Axie con «Axe»): madera y, a veces, cristal de escarcha.
//   · Sabana (3_2): minería en vetas de cobre al pie de las rocas (el Sapidae, con un pico).
//   · Mística (1_2): recolección de flores lunares (el Sapidae, agachándose).
// Reglas (GATHER_RULES): pulsar E y esperar 6 s (sin poder moverse; Esc cancela); 1–3 unidades y un 10 % de un objeto raro;
// el punto se agota y vuelve a los 8 min reales (cuenta también con el juego cerrado). Sin efecto del vínculo.
//
// Las posiciones están validadas en el terreno real (tools/gathering/check-nodes.mjs repite la comprobación
// en el juego): suelo con pendiente < 0,3, sin colisiones ni rocas o árboles encima, a ≥ 12 m de los NPC y
// de los anclajes de los monstruos. En la pesca, (x, z) es la orilla donde se pone el Axie y `water` el punto
// del río donde cae el corcho. En la minería, `face` es el centro de la roca contra la que está la veta.

import { FORGE_TREE_SPOT } from '../../rpg/world/ForestVillageLayout.js';
import { ARCTIC_SITES } from '../../rpg/world/islands/arctic/ArcticSites.js';
import * as i18n from '../../i18n/i18n.js';

export const GATHER_RULES = {
  durationSec: 6,       // tiempo de trabajo (la pesca estira Whip.Skill a este tiempo)
  amountMin: 1,
  amountMax: 3,
  rareChance: 0.1,
  respawnMs: 8 * 60 * 1000,
  useRadius: 3.4,       // distancia del Sapidae al punto para que salga «E · …»
};

/** Qué hace cada actividad: quién la realiza, con qué y qué da. */
export const GATHER_KINDS = {
  fish: { label: i18n.t('items.gather.fish.label'), verb: i18n.t('items.gather.fish.verb'), actor: 'axie', weapon: 'Whip', icon: 'fish', color: '#5FB6E8' },
  chop: { label: i18n.t('items.gather.chop.label'), verb: i18n.t('items.gather.chop.verb'), actor: 'axie', weapon: 'Axe', icon: 'log', color: '#B98A55' },
  mine: { label: i18n.t('items.gather.mine.label'), verb: i18n.t('items.gather.mine.verb'), actor: 'sapidae', tool: 'pickaxe', icon: 'ingot', color: '#D98A4E' },
  herb: { label: i18n.t('items.gather.herb.label'), verb: i18n.t('items.gather.herb.verb'), actor: 'sapidae', icon: 'flower', color: '#B79BF2' },
};

/** Botín por tipo de recurso: principal y raro (10 %). Ids de MATERIALS van a la bolsa de la Forja; los de ITEMS_DB
 *  (el pescado y el koi son comida) van a la mochila. */
export const GATHER_LOOT = {
  river_fish: { mat: 'food_fish', rare: 'food_koi' },          // comida (mochila), no material
  forest_wood: { mat: 'mat_wood', rare: null },
  frost_fir: { mat: 'mat_wood', rare: 'mat_frost_crystal' },
  copper_vein: { mat: 'mat_copper', rare: 'mat_lunar_shard' },
  moon_flower: { mat: 'mat_moon_flower', rare: 'mat_astral_dust' },
};

export const GATHER_NODES = [
  // ── Isla del Bosque · pesca en el río (orilla llana, agua a 2 m)
  { id: 'fish_forest_1', zone: '2_2', kind: 'fish', loot: 'river_fish', name: i18n.t('items.gather.node.fish_forest_1'), x: 3.8, z: -30.0, water: { x: 7.9, z: -30.0 } },
  { id: 'fish_forest_2', zone: '2_2', kind: 'fish', loot: 'river_fish', name: i18n.t('items.gather.node.fish_forest_2'), x: 38.1, z: -4.0, water: { x: 33.4, z: -4.0 } },
  { id: 'fish_forest_3', zone: '2_2', kind: 'fish', loot: 'river_fish', name: i18n.t('items.gather.node.fish_forest_3'), x: 20.8, z: -74.5, water: { x: 16.7, z: -74.5 } },
  // ── Isla del Bosque · el árbol de la Forja (explica la evolución: madera normal)
  { id: 'tree_forest_forge', zone: '2_2', kind: 'chop', loot: 'forest_wood', name: i18n.t('items.gather.node.tree_forest_forge'), x: FORGE_TREE_SPOT.x, z: FORGE_TREE_SPOT.z, tree: 'oak' },
  // ── Isla del Ártico · tala de abetos
  { id: 'chop_arctic_1', zone: '2_1', kind: 'chop', loot: 'frost_fir', name: i18n.t('items.gather.node.chop_arctic_1'), x: ARCTIC_SITES.chopTrees.atia.x, z: ARCTIC_SITES.chopTrees.atia.z, tree: 'fir', highlight: true },
  { id: 'chop_arctic_2', zone: '2_1', kind: 'chop', loot: 'frost_fir', name: i18n.t('items.gather.node.chop_arctic_2'), x: ARCTIC_SITES.chopTrees.hermit.x, z: ARCTIC_SITES.chopTrees.hermit.z, tree: 'fir', highlight: true },
  { id: 'chop_arctic_3', zone: '2_1', kind: 'chop', loot: 'frost_fir', name: i18n.t('items.gather.node.chop_arctic_3'), x: ARCTIC_SITES.chopTrees.shop.x, z: ARCTIC_SITES.chopTrees.shop.z, tree: 'fir', highlight: true },
  // ── Isla de la Sabana · vetas de cobre al pie de los hoodoos
  { id: 'mine_savannah_1', zone: '3_2', kind: 'mine', loot: 'copper_vein', name: i18n.t('items.gather.node.mine_savannah_1'), x: -76.5, z: 49.6, face: { x: -76.5, z: 46.3 } },
  { id: 'mine_savannah_2', zone: '3_2', kind: 'mine', loot: 'copper_vein', name: i18n.t('items.gather.node.mine_savannah_2'), x: -22.0, z: -21.0, face: { x: -22.0, z: -19.0 } },
  { id: 'mine_savannah_3', zone: '3_2', kind: 'mine', loot: 'copper_vein', name: i18n.t('items.gather.node.mine_savannah_3'), x: 12.2, z: 17.3, face: { x: 12.2, z: 19.1 } },
  // ── Isla Mística · flores lunares
  { id: 'herb_mystic_1', zone: '1_2', kind: 'herb', loot: 'moon_flower', name: i18n.t('items.gather.node.herb_mystic_1'), x: 92.0, z: 8.0 },
  { id: 'herb_mystic_2', zone: '1_2', kind: 'herb', loot: 'moon_flower', name: i18n.t('items.gather.node.herb_mystic_2'), x: -46.0, z: 33.0 }, // orilla sur (Hito 57; estaba en el agua, en -50, 50)
  { id: 'herb_mystic_3', zone: '1_2', kind: 'herb', loot: 'moon_flower', name: i18n.t('items.gather.node.herb_mystic_3'), x: 24.0, z: 4.0 },
];

export const GATHER_NODE_BY_ID = Object.fromEntries(GATHER_NODES.map((n) => [n.id, n]));

/** Puntos de una isla ('2_2', 'zone_2_2' o una zona antigua ya fusionada se tratan igual por quien llama). */
export function nodesForZone(zoneKey) {
  const key = String(zoneKey || '').replace(/^zone_/, '');
  return GATHER_NODES.filter((n) => n.zone === key);
}

/** Texto del aviso «E · …» para un punto. */
export function promptFor(node) {
  return `${GATHER_KINDS[node.kind]?.label || i18n.t('items.gather.herb.label')} · ${node.name}`;
}
