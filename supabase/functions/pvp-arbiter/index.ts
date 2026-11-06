// Supabase Edge Function: pvp-arbiter — el árbitro de la Arena PvP (fase P4). Plan: docs/PLAN_ARENA_PVP.md, sección 15.
//
// Cada llamada pide al servidor las partidas que necesitan árbitro (pvp_arbiter_pending: en disputa, o terminadas con
// un solo informe), repite sus órdenes guardadas en el motor sin gráficos del juego (engine/, copia generada por
// tools/pvp/arbiter/build.mjs) y manda el veredicto (pvp_arbiter_verdict), que fija ganador, puntos y SLP. Sin red ni
// azar propios: el mismo veredicto en cada repetición.
//
// Quién la llama: la tarea programada de la base de datos cada minuto y el aviso al abrirse una disputa
// (migración 20261108000000_arena_arbiter.sql, tabla pvp_arbiter_config). También se puede llamar a mano.
//
// Secretos (npx supabase@latest secrets set …):
//   PVP_ARBITER_KEY   clave compartida con la base de datos (cabecera x-arbiter-key). Nunca en el código.
// Inyectados por Supabase: SUPABASE_URL y la clave de servicio (SUPABASE_SECRET_KEYS o SUPABASE_SERVICE_ROLE_KEY).
//
// Desplegar (la clave la comprueba la propia función):
//   node tools/pvp/arbiter/build.mjs
//   npx supabase@latest functions deploy pvp-arbiter --no-verify-jwt --use-api
// Paso a paso (clave, extensiones, aviso y tarea programada): docs/PLAN_ARENA_PVP.md, sección 15.

// Importaciones estáticas (el empaquetador de Supabase incluye así todo el motor). shim.ts va primero: el motor del
// juego toca localStorage al cargar. engine/build.js lo escribe tools/pvp/arbiter/build.mjs (huella del motor).
import './shim.ts';
import { arbitrate, ARBITER_VERSION } from './engine/src/tactics/sim/PvpArbiter.js';
import { BUILD } from './engine/build.js';

const env = (k: string) => Deno.env.get(k) ?? '';
const firstKey = (jsonVar: string) => {
  try { const o = JSON.parse(env(jsonVar) || '{}'); return (o.default ?? Object.values(o)[0] ?? '') as string; } catch { return ''; }
};
const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_KEY = firstKey('SUPABASE_SECRET_KEYS') || env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
const ARBITER_KEY = env('PVP_ARBITER_KEY');
const BUDGET_MS = 1200;   // tiempo de CPU por llamada (el límite de Supabase es 2 s): lo que no quepa, en la siguiente
const BATCH = 6;

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

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return json({ ok: false, error: 'method' }, 405);
  if (!ARBITER_KEY || !SERVICE_KEY || !SUPABASE_URL) return json({ ok: false, error: 'not_configured' }, 500);
  if (!sameKey(req.headers.get('x-arbiter-key') ?? '', ARBITER_KEY)) return json({ ok: false, error: 'forbidden' }, 403);

  const t0 = performance.now();
  const done: unknown[] = [];
  try {
    const pending = await rpc('pvp_arbiter_pending', { p_limit: BATCH });
    for (const m of pending?.matches ?? []) {
      if (performance.now() - t0 > BUDGET_MS) break;
      let v;
      try {
        v = await arbitrate(m, m.actions);
      } catch (err) {
        v = { v: ARBITER_VERSION, result: 'error', detail: String((err as Error)?.message || err).slice(0, 160) };
      }
      v.engine = BUILD.engine ?? null;
      if (v.result === 'error') { done.push({ id: m.id, error: v.detail }); continue; } // se reintenta (hasta max_tries)
      const res = await rpc('pvp_arbiter_verdict', { p_match: m.id, p_verdict: v, p_actions: m.actions.length });
      done.push({ id: m.id, result: v.result, winner: v.winner, reason: v.reason, culprit: v.culprit, fault: v.fault, applied: res?.ok ?? false, error: res?.error });
    }
    return json({ ok: true, engine: BUILD.engine ?? null, matches: done, ms: Math.round(performance.now() - t0) });
  } catch (err) {
    console.error('[pvp-arbiter]', err);
    return json({ ok: false, error: 'server', detail: String((err as Error)?.message || err).slice(0, 200), matches: done }, 500);
  }
});
