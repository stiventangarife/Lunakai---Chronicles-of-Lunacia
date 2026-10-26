// Supabase Edge Function: axie-data (19-oct)
// Intermediario para el marketplace de Sky Mavis: la API key vive aquí (secreto), nunca en el juego.
// Solo responde a dos consultas fijas (no reenvía GraphQL arbitrario):
//   POST { op: 'axie', id }  → datos de un Axie por su ID (nombre, clase, genes, partes y axpInfo). Público (invitados).
//   POST { op: 'owned' }     → todos los Axies del jugador con sesión iniciada. Las direcciones Ronin salen de SU
//                              perfil (las guardó skymavis-auth al iniciar sesión), no de la petición.
//   POST { op: 'items' }     → Hito 75: runas y charms NFT (ERC-1155, las «Ronin») de esas mismas direcciones.
//                              Solo lectura: el juego da una copia jugable mientras sigan en la billetera.
//
// Secretos (supabase secrets set ...):
//   SKYMAVIS_API_KEY        clave de API Gateway (Ronin Developer Console → tu app → «Clave»)
//   ALLOWED_ORIGINS         orígenes del juego separados por comas (p. ej. https://lunakai.stivendev.info,http://localhost:8082)
// Inyectados por Supabase: SUPABASE_URL y las claves.
//
// Desplegar (los invitados no tienen sesión; la función comprueba el token del jugador ella misma):
//   supabase functions deploy axie-data --no-verify-jwt

const GRAPHQL = 'https://api-gateway.skymavis.com/graphql/axie-marketplace';
const env = (k: string) => Deno.env.get(k) ?? '';
const API_KEY = env('SKYMAVIS_API_KEY');
const SUPABASE_URL = env('SUPABASE_URL');
const firstKey = (jsonVar: string) => {
  try { const o = JSON.parse(env(jsonVar) || '{}'); return (o.default ?? Object.values(o)[0] ?? '') as string; } catch { return ''; }
};
const ANON_KEY = firstKey('SUPABASE_PUBLISHABLE_KEYS') || env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY');
const SERVICE_KEY = firstKey('SUPABASE_SECRET_KEYS') || env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
const isJwt = (k: string) => k.startsWith('eyJ');
const ALLOWED_ORIGINS = env('ALLOWED_ORIGINS').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);

const PAGE_SIZE = 100;     // tamaño de página del marketplace
const MAX_OWNED = 3000;    // tope de seguridad por jugador (de momento se cargan todos)
const BASE_FIELDS = 'id name class image genes newGenes parts { id name class type }';
// Nivel y AXP del Axie en Sky Mavis (19-oct): solo para mostrar en la ficha; el nivel de Lunakai es independiente.
const AXP_FIELDS = 'axpInfo { level xp xpToLevelUp onchainLevel shouldAscend }';
let withAxp = true; // si el marketplace no reconoce axpInfo, se sigue sin él
const fields = () => (withAxp ? `${BASE_FIELDS} ${AXP_FIELDS}` : BASE_FIELDS);

const corsFor = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && (!ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin)) ? origin : (ALLOWED_ORIGINS[0] || '*'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});

class ApiError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

// Límite sencillo por IP (en memoria de cada instancia): 60 consultas por minuto.
const hits = new Map<string, { n: number; at: number }>();
function rateLimit(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 60_000) { hits.set(ip, { n: 1, at: now }); return; }
  if (++h.n > 60) throw new ApiError('rate_limited', 'Demasiadas consultas. Espera un minuto.', 429);
}

/** Consulta con axpInfo; si el marketplace lo rechaza, repite sin él (el juego funciona igual). */
async function gqlAxies(build: (f: string) => string, variables: Record<string, unknown>) {
  try {
    return await gql(build(fields()), variables);
  } catch (e) {
    if (withAxp && e instanceof ApiError && /axpInfo|xpToLevelUp|onchainLevel|shouldAscend|Cannot query field/i.test(e.message)) {
      console.warn('[axie-data] axpInfo no disponible, sigo sin él:', e.message);
      withAxp = false;
      return gql(build(fields()), variables);
    }
    throw e;
  }
}

async function gql(query: string, variables: Record<string, unknown>) {
  const r = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new ApiError('upstream_failed', `Sky Mavis respondió HTTP ${r.status}.`, 502);
  const j = await r.json();
  if (j.errors?.length) throw new ApiError('upstream_failed', String(j.errors[0]?.message || 'Error de Sky Mavis'), 502);
  return j.data;
}

async function axieById(id: string) {
  if (!/^\d{1,10}$/.test(id)) throw new ApiError('invalid_request', 'ID de Axie inválido.');
  const data = await gqlAxies((f) => `query GetAxieDetail($axieId: ID!) { axie(axieId: $axieId) { ${f} } }`, { axieId: id });
  if (!data?.axie) throw new ApiError('not_found', `El Axie #${id} no existe.`, 404);
  return data.axie;
}

async function axiesOf(owner: string) {
  const out: unknown[] = [];
  for (let from = 0; from < MAX_OWNED; from += PAGE_SIZE) {
    const data = await gqlAxies(
      (f) => `query OwnedAxies($owner: String, $from: Int, $size: Int) { axies(owner: $owner, from: $from, size: $size, sort: IdAsc) { total results { ${f} } } }`,
      { owner, from, size: PAGE_SIZE },
    );
    const page = data?.axies?.results || [];
    out.push(...page);
    if (page.length < PAGE_SIZE || out.length >= (data?.axies?.total ?? 0)) break;
  }
  return out;
}

// Hito 75: runas y charms NFT (ERC-1155) de una dirección. Consulta fija del marketplace (erc1155Tokens).
const MAX_ITEMS = 1000;
const ITEMS_QUERY = `query OwnedItems($owner: String, $tokenType: Erc1155Type!, $from: Int, $size: Int) {
  erc1155Tokens(owner: $owner, tokenType: $tokenType, from: $from, size: $size) { total results { tokenId tokenAddress total name description imageUrl } } }`;
async function itemsOf(owner: string, tokenType: 'Rune' | 'Charm') {
  const out: Array<Record<string, unknown>> = [];
  for (let from = 0; from < MAX_ITEMS; from += PAGE_SIZE) {
    const data = await gql(ITEMS_QUERY, { owner, tokenType, from, size: PAGE_SIZE });
    const page = data?.erc1155Tokens?.results || [];
    out.push(...page);
    if (page.length < PAGE_SIZE || out.length >= (data?.erc1155Tokens?.total ?? 0)) break;
  }
  return out;
}
/** Suma por token las cantidades de todas las direcciones del jugador. */
function mergeItems(lists: Array<Array<Record<string, unknown>>>) {
  const by = new Map<string, Record<string, unknown>>();
  for (const list of lists) for (const it of list) {
    const k = `${it.tokenAddress}:${it.tokenId}`;
    const prev = by.get(k);
    if (prev) prev.total = Number(prev.total || 0) + Number(it.total || 0); else by.set(k, { ...it, total: Number(it.total || 0) });
  }
  return [...by.values()].filter((it) => Number(it.total) > 0);
}

/** Direcciones Ronin del jugador con sesión (de su perfil, nunca de la petición). */
async function ownersOfRequest(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const user = await userFromToken(token);
  if (!user?.id) throw new ApiError('session_expired', 'Inicia sesión para ver tu cuenta de Sky Mavis.', 401);
  const p = await profileOf(user.id);
  return [...new Set([p?.ronin_address, p?.ronin_secondary_address].filter(Boolean))] as string[];
}

/** Usuario de Supabase a partir del token del jugador (null si no hay sesión válida). */
async function userFromToken(token: string) {
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
  return r.ok ? await r.json() : null;
}

async function profileOf(userId: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=ronin_address,ronin_secondary_address&user_id=eq.${userId}&limit=1`, {
    headers: { apikey: SERVICE_KEY, ...(isJwt(SERVICE_KEY) ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}) },
  });
  const rows = r.ok ? await r.json() : [];
  return Array.isArray(rows) ? rows[0] || null : null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsFor(origin);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    if (!API_KEY || !SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) throw new ApiError('server_misconfigured', 'El servidor de Axies no está configurado.', 500);
    if (ALLOWED_ORIGINS.length && origin && !ALLOWED_ORIGINS.includes(origin)) throw new ApiError('origin_not_allowed', 'Origen no autorizado.', 403);
    rateLimit(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon');

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (body.op === 'axie') return json({ axie: await axieById(String(body.id ?? '').trim()) });

    if (body.op === 'owned') {
      const owners = await ownersOfRequest(req);
      const seen = new Set<string>();
      const axies: unknown[] = [];
      for (const owner of owners) {
        for (const a of await axiesOf(owner) as Array<{ id: string }>) {
          if (!seen.has(a.id)) { seen.add(a.id); axies.push(a); }
        }
      }
      return json({ owners, axies });
    }

    if (body.op === 'items') {
      const owners = await ownersOfRequest(req);
      const runes = mergeItems(await Promise.all(owners.map((o) => itemsOf(o, 'Rune'))));
      const charms = mergeItems(await Promise.all(owners.map((o) => itemsOf(o, 'Charm'))));
      return json({ owners, runes, charms });
    }

    throw new ApiError('invalid_request', 'Consulta no válida.');
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.code, message: e.message }, e.status);
    console.error('[axie-data] error inesperado', e);
    return json({ error: 'internal_error', message: 'Error inesperado consultando Sky Mavis.' }, 500);
  }
});
