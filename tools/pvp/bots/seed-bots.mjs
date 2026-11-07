#!/usr/bin/env node
// seed-bots.mjs — Genera tools/pvp/bots/bots.sql: los rivales bot de la Arena (docs/PLAN_BOTS_ARENA.md, R1/R3).
// Uso: node tools/pvp/bots/seed-bots.mjs [número=30] [--seed n]  →  pegar bots.sql en el SQL Editor de Supabase
//      (después de la migración 20261113000000_arena_bots.sql). Volver a ejecutarlo actualiza los mismos bots (ids fijos).
//
// Cada bot es como un jugador nuevo de verdad:
//   · un usuario de auth.users SIN contraseña (nadie puede iniciar sesión con él) y su perfil;
//   · su partida guardada en la ranura 1: nombre, clase de Sapidae, modelo Ema/Kai con personalización al azar (los
//     mismos valores que el botón «Aleatorio» del creador) y su Axie principal con sus genes y sus 6 cartas de partes
//     reales: los 3 bots con menos puntos llevan uno de los Axies iniciales (como un jugador recién llegado); el resto,
//     uno de los 27 Axies reales de axies.json (3 por clase), repartidos por clase entre todos los tramos de puntos;
//   · su fila en pvp_bots: puntos con los que empieza cada temporada (entre 850 y 1300), nivel según los puntos y una
//     franja horaria en la que «juega» (hora de Colombia), para que no estén siempre los mismos.
// Determinista: con la misma semilla salen los mismos bots.

globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
import fs from 'node:fs';
const root = new URL('../../../src/', import.meta.url);
const { HERO_ROSTER } = await import(new URL('rpg/SaveSlotManager.js', root));
const { PART_CARDS } = await import(new URL('tactics/data/PartCards.js', root));
const { COLLECTION_CARDS } = await import(new URL('tactics/data/CollectionCards.js', root));
const { variantId } = await import(new URL('tactics/data/VariantCards.js', root));
const { mulberry32 } = await import(new URL('tactics/sim/SeededRandom.js', root));

const args = process.argv.slice(2);
const COUNT = Math.min(60, Number(args.find((a) => /^\d+$/.test(a))) || 30);
const SEED = args.includes('--seed') ? Number(args[args.indexOf('--seed') + 1]) || 0 : 0;
const rnd = mulberry32(0x5EED_B07 + SEED);
const pick = (list) => list[Math.floor(rnd() * list.length)];

// Nombres de jugador al estilo de la comunidad (ninguno es de una persona real)
const NAMES = ['KaitoLun', 'MiraVex', 'Tobi_ax', 'Selene', 'Rinko', 'JorgeLN', 'Zafiro', 'NoxRonin', 'Lumi', 'Pablito07',
  'AxelMoon', 'Yuki', 'Chiqui', 'Bruma', 'Thalia', 'KenjiGG', 'Valen', 'SoraTide', 'MateoAxie', 'Nami', 'Drako', 'Lua',
  'Cami99', 'Orion', 'Pipo', 'Iker', 'Aiko', 'Brisa', 'Tano', 'Kiara', 'Ezio_LN', 'Nube', 'Rocco', 'Ilse', 'Fenix',
  'Maru', 'Tiago', 'Wen', 'Lia', 'Gael', 'Momo', 'Ciro', 'Aru', 'Pau', 'Dante', 'Ona', 'Bastian', 'Kenia', 'Lior', 'Sami',
  'Teo', 'Vera', 'Ivo', 'Nilo', 'Dafne', 'Lucca', 'Mayu', 'Rafa', 'Zoe', 'Elio'];

// Los tres Axies iniciales, con las partes que devuelve Sky Mavis para cada uno (consultadas el 6-nov-2026)
const STARTER_PARTS = {
  '10455': ['aquatic_eyes_gero', 'beast_ears_nyan', 'reptile_mouth_tiny_turtle', 'bird_horn_trump', 'reptile_back_green_thorns', 'reptile_tail_tiny_dino'],
  '3797905': ['beast_eyes_puppy', 'bird_ears_early_bird', 'bird_mouth_little_owl', 'reptile_horn_scaly_spoon', 'bird_back_cupid', 'bird_tail_the_last_one'],
  '10830416': ['plant_eyes_blossom', 'plant_ears_hollow', 'plant_mouth_zigzag', 'plant_horn_cactus', 'plant_back_bidens', 'reptile_tail_iguana'],
};
const STARTERS = HERO_ROSTER.filter((h) => STARTER_PARTS[h.axieId]).map((h) => {
  const ids = STARTER_PARTS[h.axieId].map((p) => `part_${p}`);
  const missing = ids.filter((id) => !PART_CARDS[id]);
  if (missing.length) throw new Error(`cartas que no existen para ${h.name}: ${missing.join(', ')}`);
  return { ...h, cardIds: ids };
});
if (STARTERS.length !== 3) throw new Error('faltan Axies iniciales en HERO_ROSTER');

// Personalización: los mismos valores que el botón «Aleatorio» del creador (SapidaeModularController.js)
const HAIR_COLORS = ['#1e293b', '#451a03', '#eab308', '#f8fafc', '#0284c7', '#f472b6', '#059669', '#dc2626', '#7c3aed', '#ea580c'];
const PUPIL_COLORS = ['#0284c7', '#10b981', '#d97706', '#8b5cf6', '#0f172a', '#ec4899', '#06b6d4', '#eab308'];
const HORN_COLORS = ['#f59e0b', '#f8fafc', '#0f172a', '#dc2626', '#10b981', '#06b6d4', '#7c3aed', '#92400e'];
const SUIT_COLORS = ['#1d4ed8', '#15803d', '#7e22ce', '#1e293b', '#d97706', '#0284c7', '#f1f5f9', '#e11d48', '#b45309'];
const PIECES = {
  'sapidae-f-ema': { hair: ['a', 'b', 'c', 'd', 'e'], eyes: ['a', 'b', 'c', 'd', 'e'], mouth: ['a', 'b', 'c', 'd', 'e'], outfit: 'b' },
  'sapidae-m-kai': { hair: ['a', 'b', 'c', 'd', 'e'], eyes: ['a', 'b', 'c', 'd', 'e'], mouth: ['a', 'b', 'e'], outfit: 'd' },
};
const SAP_CLASSES = ['crafter', 'shepard', 'lunalogist', 'stargazer'];

function customization(model) {
  const P = PIECES[model];
  const suit = rnd() < 0.25 ? 'original' : pick(SUIT_COLORS);
  return {
    useOriginalTextures: true,
    hair: rnd() < 0.2 ? 'original' : pick(HAIR_COLORS), hairStyle: pick(P.hair),
    eyes: rnd() < 0.2 ? 'original' : pick(PUPIL_COLORS), eyeShape: 'round',
    eyeExpr: pick(P.eyes), mouthExpr: pick(P.mouth),
    horns: 'a', hornColor: rnd() < 0.3 ? 'original' : pick(HORN_COLORS),
    outfit: P.outfit, suitColor: suit, shirt: suit, pants: suit,
    hasHat: false, hatColor: 'original',
  };
}

// Axies reales (axies.json, resueltos con el AxiePartsResolver del juego). Orden: ronda r = el Axie r de cada clase,
// con las clases barajadas en cada ronda (azar aparte, no consume `rnd`). Así cada tramo de puntos tiene de todo.
const STARTER_BOTS = 3;
const AXIES = JSON.parse(fs.readFileSync(new URL('./axies.json', import.meta.url), 'utf8')).axies;
const byClass = {};
for (const a of AXIES) (byClass[a.class] ??= []).push(a);
const CUSTOM = [];
{
  const r2 = mulberry32(0xA61E5 + SEED);
  const rounds = Math.max(...Object.values(byClass).map((l) => l.length));
  for (let r = 0; r < rounds; r++) {
    const cls = Object.keys(byClass).sort().map((c) => [r2(), c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
    for (const c of cls) if (byClass[c][r]) CUSTOM.push(byClass[c][r]);
  }
}
for (const a of CUSTOM) {
  // Lo mismo que acepta PvpRoster.registerVariants en el cliente: carta base existente e id = variantId(base, nombre, etapa)
  const base = (id) => PART_CARDS[id] || COLLECTION_CARDS[id];
  const okVariant = (v) => base(v.baseId) && v.id === variantId(v.baseId, v.name, Number(v.stage) >= 2 ? 2 : 1);
  const missing = a.ids.filter((id) => !base(id) && !a.variants.some((v) => v.id === id && okVariant(v)));
  if (missing.length) throw new Error(`cartas que no existen para el Axie ${a.id}: ${missing.join(', ')}`);
  if (a.ids.length !== 6 || !/^0x[0-9a-f]+$/i.test(a.genes)) throw new Error(`Axie ${a.id} incompleto`);
}
// Nombre del Axie como lo vería el rival: sin precios ni textos de venta del marketplace (si no queda nada, «Axie #id»)
function axieName(a) {
  const n = a.name.replace(/\s+\d+(\.\d+)?\s*$/, '').replace(/\s+/g, ' ').trim();
  if (n.length < 3 || /sell|floor|lowest|quest|only 1|\bspd\b|shield|always/i.test(n)) return `Axie #${a.id}`;
  return n;
}

const uuid = (i) => `00000000-b07b-4000-8000-${String(i).padStart(12, '0')}`;
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
const names = [...NAMES].sort(() => rnd() - 0.5).slice(0, COUNT);

const rows = [];
for (let i = 0; i < COUNT; i++) {
  const id = uuid(i + 1);
  const starter = STARTERS[i % 3 === 0 ? 0 : Math.floor(rnd() * 3)]; // Shinji algo más frecuente, como en los jugadores nuevos
  const model = rnd() < 0.5 ? 'sapidae-f-ema' : 'sapidae-m-kai';
  // Puntos de base repartidos entre 850 y 1300 (algo más de bots en el centro, como una clasificación real)
  const t = (i + 0.5) / COUNT, curve = 0.5 + Math.sign(t - 0.5) * Math.abs(t - 0.5) ** 0.8 * 2 ** -0.2;
  const basePoints = Math.round((850 + curve * 450) / 5) * 5;
  // Franja en la que juega: la mitad casi todo el día, el resto por tramos (tarde/noche de Colombia sobre todo)
  const long = rnd() < 0.5;
  const onlineFrom = long ? Math.floor(rnd() * 24) : pick([6, 9, 12, 14, 16, 18, 19, 20, 21]);
  const onlineHours = long ? 16 + Math.floor(rnd() * 9) : 5 + Math.floor(rnd() * 6);
  const save = {
    playerName: names[i],
    sapidaeClass: pick(SAP_CLASSES),
    sapidaeModel: model,
    customization: customization(model),
    // Más puntos, más nivel. Azar aparte (no consume `rnd`): añadirlo no cambió el resto de los bots ya creados
    level: Math.max(4, Math.min(18, Math.round(4 + (basePoints - 850) / 32 + (mulberry32(0x1E7E1 + i * 7919)() - 0.5) * 4))),
    mainAxie: { id: starter.heroKey, axieId: starter.axieId, heroKey: starter.heroKey, name: starter.name, class: starter.class, image: null },
    hero: { axieId: starter.axieId, heroKey: starter.heroKey, name: starter.name, class: starter.class, genes: starter.genes },
    partCards: {
      [starter.axieId]: { ids: starter.cardIds, variants: [], vv: 1, collections: [null, null, null, null, null, null], from: 'api', v: 2 },
    },
  };
  // Axie real en vez del inicial (el sorteo del inicial se hace igual: así no cambia el azar de los demás campos)
  const real = i >= STARTER_BOTS ? CUSTOM[(i - STARTER_BOTS) % CUSTOM.length] : null;
  if (real) {
    const ax = { axieId: real.id, name: axieName(real), class: real.class };
    save.mainAxie = { id: real.id, ...ax, heroKey: null, image: null };
    save.hero = { ...ax, heroKey: null, genes: real.genes };
    save.partCards = { [real.id]: { ids: real.ids, variants: real.variants, vv: real.vv, collections: real.collections, from: real.source, v: 2 } };
  }
  rows.push({ id, name: names[i], save, basePoints, onlineFrom, onlineHours });
}

const out = [];
out.push(`-- bots.sql — ${COUNT} rivales bot de la Arena. Generado por tools/pvp/bots/seed-bots.mjs (semilla ${SEED}); no editar a mano.`);
out.push('-- Pegar en el SQL Editor de Supabase después de la migración 20261113000000_arena_bots.sql. Se puede repetir.');
out.push('begin;');
for (const r of rows) {
  const email = `bot-${r.id.slice(-4)}@bots.lunakai.invalid`;
  // Sin contraseña (encrypted_password vacío): nadie puede iniciar sesión. Los tokens van como '' y no NULL, como los
  // deja Supabase: con NULL, la lista de usuarios del panel de Auth puede fallar.
  out.push(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', ${lit(r.id)}, 'authenticated', 'authenticated', ${lit(email)}, '',
          '{"provider":"bot","providers":["bot"]}'::jsonb,
          ${lit(JSON.stringify({ display_name: r.name, auth_provider: 'bot' }))}::jsonb, '', '', '', '', now(), now())
  on conflict (id) do update set raw_user_meta_data = excluded.raw_user_meta_data, encrypted_password = '',
    confirmation_token = coalesce(auth.users.confirmation_token, ''), recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''), email_change = coalesce(auth.users.email_change, ''),
    updated_at = now();`);
  out.push(`insert into public.save_slots (user_id, slot_id, data) values (${lit(r.id)}, 1, ${lit(JSON.stringify(r.save))}::jsonb)
  on conflict (user_id, slot_id) do update set data = excluded.data, updated_at = now();`);
  out.push(`insert into public.pvp_bots (user_id, base_points, online_from, online_hours) values (${lit(r.id)}, ${r.basePoints}, ${r.onlineFrom}, ${r.onlineHours})
  on conflict (user_id) do update set base_points = excluded.base_points, online_from = excluded.online_from, online_hours = excluded.online_hours;`);
}
out.push('commit;');
out.push(`-- Resumen: ${rows.map((r) => `${r.name} ${r.basePoints}`).join(' · ')}`);
const file = new URL('./bots.sql', import.meta.url);
fs.writeFileSync(file, out.join('\n') + '\n');
console.log(`bots.sql: ${COUNT} bots, puntos ${Math.min(...rows.map((r) => r.basePoints))}–${Math.max(...rows.map((r) => r.basePoints))}`);
for (const r of rows) console.log(`  ${r.name.padEnd(10)} ${String(r.basePoints).padStart(4)}  ${r.save.sapidaeClass.padEnd(10)} ${r.save.sapidaeModel.padEnd(14)} ${r.save.mainAxie.class.padEnd(8)} ${r.save.mainAxie.name.padEnd(22)} ${String(r.onlineFrom).padStart(2)}h +${r.onlineHours}h`);
