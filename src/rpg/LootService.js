// LootService.js — Botín que mezcla objetos (ITEMS_DB → mochila) y materiales (MATERIALS → bolsa de la Forja).
// Lo usan el final de los combates (main.js) y las recompensas de las misiones (QuestManager).
//   · Un id de material puede venir repetido (o con qty); cada aparición en un combate da 1–2 unidades.
//   · lootView() devuelve fichas para la interfaz: los materiales llevan `glyph` (ui/MaterialIcons.js) y `qty`.

import { ITEMS_DB } from '../tactics/ItemDatabase.js';
import { MATERIALS } from '../tactics/data/EconomyCatalog.js';
import { ForgeService } from './ForgeService.js';

export const isMaterial = (id) => Boolean(MATERIALS[id]);
export const isLootId = (id) => Boolean(ITEMS_DB[id] || MATERIALS[id]);

/**
 * Convierte una lista de ids (con repetidos) en { items: [id…], mats: { id: n } }.
 * matQty(id) decide cuántas unidades da cada aparición de un material (por defecto 1–2 al azar).
 */
export function rollLoot(ids, matQty = () => 1 + Math.floor(Math.random() * 2)) {
  const items = [], mats = {};
  (ids || []).forEach((id) => {
    if (ITEMS_DB[id]) items.push(id);
    else if (MATERIALS[id]) mats[id] = (mats[id] || 0) + matQty(id);
  });
  return { items, mats };
}

/** Entrega el botín: objetos a la mochila y materiales a la bolsa de la Forja (sin guardar: lo hace quien llama). */
export function grantLoot(equipmentManager, { items = [], mats = {} } = {}) {
  if (items.length && equipmentManager?.addItemsToInventory) equipmentManager.addItemsToInventory(items);
  Object.entries(mats).forEach(([id, n]) => { if (n > 0) ForgeService.addMats(id, n, false); });
}

/** Fichas para mostrar: objetos tal cual; materiales con su glyph, rareza y cantidad. */
export function lootView({ items = [], mats = {} } = {}) {
  return [
    ...items.map((id) => ITEMS_DB[id]).filter(Boolean),
    ...Object.entries(mats).map(([id, qty]) => materialView(id, qty)).filter(Boolean),
  ];
}

export function materialView(id, qty = 1) {
  const m = MATERIALS[id];
  if (!m) return null;
  return { id, name: m.name, rarity: m.rarity || 'common', glyph: m.glyph, icon: m.icon, biome: m.biome, description: m.description, source: m.source, slot: 'material', stats: {}, qty, mat: true };
}
