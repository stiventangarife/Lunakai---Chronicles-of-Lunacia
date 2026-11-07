// Supabase Edge Function: pvp-bot — juega los turnos de los rivales bot de la Arena PvP (docs/PLAN_BOTS_ARENA.md, R2).
//
// La despierta la base de datos (migración 20261113000000_arena_bots.sql, tabla pvp_bot_config):
//   · al crearse una partida contra un bot, cuando el rival termina su turno (o se le acaba el tiempo) y cuando el
//     rival informa del final → { match } ;
//   · cada minuto, si hay partidas de bots sin movimiento (pvp_bot_tick) → {} .
// Responde enseguida y sigue en segundo plano (EdgeRuntime.waitUntil): un turno del bot dura lo que un turno de una
// persona (pausas «humanas» de varios segundos), pero casi todo es espera; el cálculo es de milisegundos.
//
// Para cada partida pendiente (pvp_bot_pending): la reserva (pvp_bot_claim, para que dos llamadas no la jueguen a la
// vez), la juega con src/tactics/sim/PvpBotRunner.js (copia en engine/, generada por tools/pvp/bots/build.mjs) y la
// suelta (pvp_bot_release). El bot llama al servidor con pvp_bot_call: las mismas funciones que un jugador.
//
// Secretos (npx supabase@latest secrets set …):
//   PVP_BOT_KEY   clave compartida con la base de datos (cabecera x-bot-key; la misma que pvp_bot_config.key)
// Inyectados por Supabase: SUPABASE_URL y la clave de servicio (SUPABASE_SECRET_KEYS o SUPABASE_SERVICE_ROLE_KEY).
//
// Desplegar:
//   node tools/pvp/bots/build.mjs
//   npx supabase@latest functions deploy pvp-bot --no-verify-jwt --use-api
// Paso a paso: docs/PLAN_BOTS_ARENA.md, sección 11.

import './shim.ts';
import { runBotMatch } from './engine/src/tactics/sim/PvpBotRunner.js';
import { BUILD } from './engine/build.js';

const env = (k: string) => Deno.env.get(k) ?? '';
const firstKey = (jsonVar: string) => {
  try { const o = JSON.parse(env(jsonVar) || '{}'); return (o.default ?? Object.values(o)[0] ?? '') as string; } catch { return ''; }
};
const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_KEY = firstKey('SUPABASE_SECRET_KEYS') || env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
const BOT_KEY = env('PVP_BOT_KEY');
const FAST = env('PVP_BOT_FAST') === '1'; // solo pruebas locales: sin pausas «humanas»
const BATCH = 8;              // partidas a la vez por llamada (casi todo el tiempo es espera)
const WALL_MS = 120_000;      // no empezar partidas nuevas pasado este tiempo (el límite de la función es mayor)

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function rpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      ...(SERVICE_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}),
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${fn} ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

/** Comparación en tiempo constante de la clave compartida. */
function sameKey(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

type Pending = { match: string; bot: string; side: string; level: string | null; points: number };

/** Juega una partida (si nadie la tiene ya) y la suelta. */
async function playOne(p: Pending) {
  const claimed = await rpc('pvp_bot_claim', { p_match: p.match });
  if (claimed !== true) return { match: p.match, skipped: 'busy' };
  try {
    const call = (fn: string, args: Record<string, unknown>) => rpc('pvp_bot_call', { p_bot: p.bot, p_fn: fn, p_args: args });
    const r = await runBotMatch({ call, match: p.match, level: p.level, points: p.points, log: (t: string) => console.log(`[pvp-bot] ${p.match}: ${t}`),
      ...(FAST ? { sleep: async () => {} } : {}) });
    return { match: p.match, ...r };
  } catch (err) {
    console.error('[pvp-bot]', p.match, err);
    return { match: p.match, error: String((err as Error)?.message || err).slice(0, 160) };
  } finally {
    await rpc('pvp_bot_release', { p_match: p.match }).catch(() => null);
  }
}

/** Todas las pendientes (primero la del aviso), varias a la vez, hasta que no quede ninguna o se acabe el tiempo. */
export async function work(first: string | null) {
  const t0 = Date.now();
  const done: unknown[] = [];
  const seen = new Set<string>();
  while (Date.now() - t0 < WALL_MS) {
    const list: Pending[] = (await rpc('pvp_bot_pending', { p_limit: BATCH * 2 })) ?? [];
    const fresh = list.filter((p) => !seen.has(`${p.match}`)).sort((a, b) => Number(b.match === first) - Number(a.match === first)).slice(0, BATCH);
    if (!fresh.length) break;
    // Una partida se vuelve a mirar en la vuelta siguiente solo si cambió (el rival jugó entretanto)
    for (const p of fresh) seen.add(p.match);
    done.push(...await Promise.all(fresh.map(playOne)));
    for (const r of done.slice(-fresh.length) as Array<{ match: string; played?: number; timeout?: boolean }>) {
      if ((r.played ?? 0) > 0 || r.timeout) seen.delete(r.match); // jugó: puede volver a tocarle (sus dos unidades)
    }
  }
  return { ok: true, engine: BUILD.engine ?? null, matches: done, ms: Date.now() - t0 };
}

// deno-lint-ignore no-explicit-any
const runtime = (globalThis as any).EdgeRuntime;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') return json({ ok: false, error: 'method' }, 405);
  if (!BOT_KEY || !SERVICE_KEY || !SUPABASE_URL) return json({ ok: false, error: 'not_configured' }, 500);
  if (!sameKey(req.headers.get('x-bot-key') ?? '', BOT_KEY)) return json({ ok: false, error: 'forbidden' }, 403);
  let first: string | null = null;
  try { const b = await req.json(); first = typeof b?.match === 'string' ? b.match : null; } catch { /* sin cuerpo */ }

  const job = work(first).catch((err) => { console.error('[pvp-bot]', err); return { ok: false, error: String(err) }; });
  // Respuesta inmediata (el aviso de pg_net no espera); el trabajo sigue en segundo plano
  if (runtime?.waitUntil && new URL(req.url).searchParams.get('wait') !== '1') {
    runtime.waitUntil(job);
    return json({ ok: true, accepted: true, engine: BUILD.engine ?? null });
  }
  return json(await job); // ?wait=1 (o sin EdgeRuntime: pruebas locales): espera y devuelve el resumen
});
