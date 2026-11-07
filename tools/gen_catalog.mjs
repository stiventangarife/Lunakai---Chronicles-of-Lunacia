// Uso: node tools/gen_catalog.mjs ./src supabase/migrations/<fecha>_economy_catalog.sql [supabase/migrations/<fecha>_market_rules.sql]
// (siempre en una migración NUEVA: `supabase db push` no repite las ya aplicadas). Últimas: 20261101000004 y 20261101000005 (+ 20261111000000: solo las filas de la misión de Ochi).
// Genera supabase/migrations/..._economy_catalog.sql a partir del catálogo del juego (los precios siempre coinciden).
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
try { Object.defineProperty(globalThis, 'navigator', { value: { language: 'es', languages: ['es'], onLine: true }, configurable: true }); } catch {}
globalThis.window = globalThis; globalThis.document = { documentElement: { lang: 'es' }, addEventListener() {} };
const { pathToFileURL } = await import('node:url');
const { resolve } = await import('node:path');
const SRC_DIR = resolve(process.argv[2] || './src');
const SRC = pathToFileURL(SRC_DIR).href;
const E = await import(`${SRC}/tactics/data/EconomyCatalog.js`);
const { ITEMS_DB } = await import(`${SRC}/tactics/ItemDatabase.js`);
const { RUNES, CHARMS } = await import(`${SRC}/tactics/data/RunesCharms.js`);
const fs = await import('node:fs');
const rows = [];
const add = (key, { gold = 0, slp = 0, baxs = 0, meta = null } = {}) => rows.push({ key, gold, slp, baxs, meta });
const itemOf = (id) => (E.MATERIALS[id] ? { ...E.MATERIALS[id] } : ITEMS_DB[id]);
// Tienda: compra (solo lo que vende alguna tienda) y venta (todo lo que tiene precio de venta)
const shopIds = new Set(Object.values(E.SHOPS).flatMap((s) => s.stock.map((x) => x.id)));
shopIds.forEach((id) => { const it = itemOf(id); if (it) add(`buy:${id}`, { gold: E.buyPrice(it) }); });
// Hito 110: el equipo por encima del tier que compra Ochi (T1–3) no se le vende: solo en el Mercado, por AXS.
const GEAR_SLOTS = ['weapon', 'hat', 'shield', 'body', 'boots'];
const ochiBuys = (it) => !(it && GEAR_SLOTS.includes(it.slot) && !E.TIER0_ITEMS[it.id] && (it.tier ?? 0) > E.maxSellGearTier());
[...Object.keys(ITEMS_DB), ...Object.keys(E.MATERIALS)].forEach((id) => { const it = itemOf(id), p = E.sellPrice(it); if (p > 0 && ochiBuys(it)) add(`sell:${id}`, { gold: p }); });
// Runas y charms: Ochi ya no las compra (Hito 110); solo se intercambian en el Mercado, en AXS.
// Forja: crear, evolucionar (rapidez 1, 2 y 4), tier de cada pieza (para acelerar) y precio de acelerar por tier
E.CRAFT_RECIPES.forEach((r) => add(`craft:${r.id}`, { gold: r.gold || 0, slp: r.slp || 0 }));
const tierOf = (id) => (E.TIER0_ITEMS[id] ? 0 : ITEMS_DB[id]?.tier ?? null);
Object.keys(ITEMS_DB).forEach((id) => {
  const to = E.nextEvolution(id); if (!to || !ITEMS_DB[to]) return;
  [1, 2, 4].forEach((s) => { const q = E.evolutionQuote(tierOf(to), s); if (q) add(`evolve:${id}:${s}`, { slp: q.slp, baxs: q.baxs, meta: tierOf(to) }); });
  add(`tier:${to}`, { meta: tierOf(to) });
});
[1, 2, 3].forEach((t) => [1, 2, 4].forEach((x) => add(`speed:${t}:${x}`, { baxs: +((E.SPEEDUP_BAXS[x] ?? 0) * (E.SPEEDUP_TIER_MULT[t] ?? 1)).toFixed(2) })));
// Recompensas: oro de las misiones (QuestManager), tutorial
const qm = fs.readFileSync(resolve(SRC_DIR, 'rpg/QuestManager.js'), 'utf8');
for (const m of qm.matchAll(/\n\s{6}(quest_[a-z0-9_]+):\s*\{[\s\S]*?rewards:\s*\{\s*gold:\s*(\d+)/g)) add(`reward:quest:${m[1]}`, { gold: +m[2] });
const ts = fs.readFileSync(resolve(SRC_DIR, 'rpg/tutorial/TutorialScript.js'), 'utf8');
add('reward:tut:duel', { gold: +(/duelGold:\s*(\d+)/.exec(ts)[1]) });
add('reward:tut:boss', { gold: +(/bossGold:\s*(\d+)/.exec(ts)[1]) });   // Hito 136: botín del Slime Caballero
add('reward:tut:ochi_purse', { gold: +(/ochiPurse:\s*(\d+)/.exec(ts)[1]), meta: 1 }); // Hito 124: monedero de Ochi (completa hasta N de oro)
add('reward:tut:slp_topup', { slp: 50, meta: 1 });                        // completa hasta 50 SLP
add('reward:tut:speed', { baxs: rows.find((r) => r.key === `speed:${tierOf('iron_sword')}:4`)?.baxs ?? 3 }); // Paladill paga la aceleración ×4
const seen = new Set(); const uniq = rows.filter((r) => !seen.has(r.key) && seen.add(r.key));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = `-- Lunakai · catálogo de precios de la economía (GENERADO por tools/gen_catalog.mjs desde el catálogo del juego; no editar a mano)
-- Hitos 76 y 110. Vuelve a generarlo si cambian precios, recetas, evoluciones o recompensas.
truncate public.economy_catalog;
insert into public.economy_catalog (key, gold, slp, baxs, meta) values
${uniq.map((r) => `  (${q(r.key)}, ${r.gold}, ${r.slp}, ${r.baxs}, ${r.meta ?? 'null'})`).join(',\n')};
`;
fs.writeFileSync(process.argv[3], sql);
// Mercado (Hitos 77, 78 y 110): qué se puede anunciar, en qué moneda y a partir de qué precio por unidad.
//  · Oro: materiales, comida y pociones; mínimo = lo que paga Ochi, máximo = 3 × su precio de tienda.
//  · AXS: equipo Tier 1–3, runas, charms y sus bolsas; solo mínimo (el máximo lo pone el mercado). El bAXS ya no se intercambia.
// Cuarto argumento opcional: archivo de salida (supabase/migrations/20261101000002_market_rules.sql).
if (process.argv[4]) {
  const rules = [];
  Object.values(E.MATERIALS).forEach((m) => rules.push({ id: m.id, kind: 'mat', cur: 'gold', min: E.sellPrice(m), max: 3 * E.buyPrice(m) }));
  const GEAR = ['weapon', 'hat', 'shield', 'body', 'boots'];
  const GEAR_MIN = E.MARKET_GEAR_MIN_AXS;
  Object.values(ITEMS_DB).forEach((it) => {
    if (it.category === 'bag' && E.MARKET_BAG_MIN_AXS[it.id]) { rules.push({ id: it.id, kind: 'inv', cur: 'axs', min: E.MARKET_BAG_MIN_AXS[it.id], max: null }); return; } // Hito 110
    if (GEAR.includes(it.slot) && GEAR_MIN[it.tier] && !E.TIER0_ITEMS[it.id]) { rules.push({ id: it.id, kind: 'inv', cur: E.MARKET_CURRENCY.gear, min: GEAR_MIN[it.tier], max: null }); return; }
    const food = it.category === 'food', potion = (it.slot === 'consumable' || it.category === 'consumable') && it.category !== 'bag' && it.category !== 'quest';
    if (!food && !potion) return;
    const buy = E.buyPrice(it), sell = E.sellPrice(it); if (!buy || !sell) return;
    rules.push({ id: it.id, kind: 'inv', cur: 'gold', min: sell, max: 3 * buy });
  });
  const RC_MIN = E.MARKET_RC_MIN_AXS;
  const rcMin = (x) => (x.class === 'neutral' ? RC_MIN.neutral : RC_MIN[x.rarity] ?? 0.2);
  RUNES.forEach((r) => rules.push({ id: `rune:${r.id}`, kind: 'rc', cur: E.MARKET_CURRENCY.rc, min: rcMin(r), max: null }));
  CHARMS.forEach((c) => rules.push({ id: `charm:${c.id}`, kind: 'rc', cur: E.MARKET_CURRENCY.rc, min: rcMin(c), max: null }));
  const rsql = `-- Lunakai · Mercado: objetos que se pueden anunciar, su moneda y su rango de precio (GENERADO por tools/gen_catalog.mjs; no editar a mano)
-- Hitos 77, 78 y 110. Ejecutar después de 20261101000003_market_bound_bags.sql. Vuelve a generarlo (en una migración nueva) si cambian precios u objetos.
truncate public.market_item_rules;
insert into public.market_item_rules (item_id, kind, currency, min_price, max_price) values
${rules.map((r) => `  (${q(r.id)}, ${q(r.kind)}, ${q(r.cur)}, ${r.min}, ${r.max ?? 'null'})`).join(',\n')};
`;
  fs.writeFileSync(process.argv[4], rsql);
  const by = (k) => rules.filter((r) => r.cur === k).length;
  console.log(rules.length, 'objetos comerciables:', by('gold'), 'en oro,', by('axs'), 'en AXS');
}
console.log(uniq.length, 'filas;', uniq.filter((r) => r.key.startsWith('reward:quest')).map((r) => r.key + '=' + r.gold).join(' '));
