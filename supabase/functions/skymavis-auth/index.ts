// Supabase Edge Function: skymavis-auth
// Canjea el código OAuth de Sky Mavis (Authorization Code + PKCE) por una sesión de Supabase.
//
// Flujo:
//   navegador  ── code + code_verifier + redirect_uri + nonce ──►  esta función
//   función    ── client_secret (solo aquí) ──►  token endpoint de Sky Mavis
//   función    ── valida id_token (firma JWKS, iss, aud, exp, nonce)
//   función    ── busca o crea el usuario de Supabase y su perfil (mavis_id, roninAddress)
//   función    ── emite una sesión normal de Supabase (access + refresh token) ──► navegador
//
// Secretos necesarios (supabase secrets set ...):
//   SKYMAVIS_CLIENT_ID, SKYMAVIS_CLIENT_SECRET, SKYMAVIS_API_KEY, ALLOWED_REDIRECT_URIS
// Inyectados automáticamente por Supabase: SUPABASE_URL y las claves
//   (SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS, o las antiguas SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)
//
// Desplegar sin verificación JWT de Supabase (el jugador aún no tiene sesión):
//   supabase functions deploy skymavis-auth --no-verify-jwt

import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader } from 'npm:jose@5.9.6';

const DISCOVERY_URL = 'https://api-gateway.skymavis.com/account/.well-known/openid-configuration';
// Valores documentados por Sky Mavis, usados si la discovery no responde.
const FALLBACK = {
  issuer: 'https://athena.skymavis.com/',
  token_endpoint: 'https://api-gateway.skymavis.com/account/oauth2/token',
  jwks_uri: 'https://api-gateway.skymavis.com/account/.well-known/jwks.json',
};

const env = (k: string) => Deno.env.get(k) ?? '';
const CLIENT_ID = env('SKYMAVIS_CLIENT_ID');
const CLIENT_SECRET = env('SKYMAVIS_CLIENT_SECRET');
const API_KEY = env('SKYMAVIS_API_KEY');
const SUPABASE_URL = env('SUPABASE_URL');
// Claves de Supabase: primero las nuevas (sb_publishable_ / sb_secret_), después las antiguas (JWT).
const firstKey = (jsonVar: string) => {
  try { const o = JSON.parse(env(jsonVar) || '{}'); return (o.default ?? Object.values(o)[0] ?? '') as string; } catch { return ''; }
};
const ANON_KEY = firstKey('SUPABASE_PUBLISHABLE_KEYS') || env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY');
const SERVICE_KEY = firstKey('SUPABASE_SECRET_KEYS') || env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
const isJwt = (k: string) => k.startsWith('eyJ');
const ALLOWED_REDIRECTS = env('ALLOWED_REDIRECT_URIS').split(',').map((s) => s.trim()).filter(Boolean);
const SYNTHETIC_EMAIL_DOMAIN = 'skymavis.lunakai.invalid';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class AuthError extends Error {
  constructor(public code: string, message: string, public status = 400, public detail?: unknown) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ---------------------------------------------------------------- Sky Mavis OIDC

type Discovery = typeof FALLBACK;
let discoveryCache: { at: number; value: Discovery } | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksUri = '';

async function getDiscovery(): Promise<Discovery> {
  if (discoveryCache && Date.now() - discoveryCache.at < 3600_000) return discoveryCache.value;
  try {
    const r = await fetch(DISCOVERY_URL, { headers: { 'X-API-Key': API_KEY, Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const value = {
      issuer: d.issuer || FALLBACK.issuer,
      token_endpoint: d.token_endpoint || FALLBACK.token_endpoint,
      jwks_uri: d.jwks_uri || FALLBACK.jwks_uri,
    };
    discoveryCache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.warn('[skymavis-auth] discovery no disponible, uso valores documentados:', String(e));
    return FALLBACK;
  }
}

async function exchangeCode(disc: Discovery, code: string, verifier: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET, // client_secret_post
    code_verifier: verifier,
  });
  const r = await fetch(disc.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-API-Key': API_KEY },
    body,
  });
  const text = await r.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { /* respuesta no JSON */ }
  if (!r.ok || !data.id_token) {
    throw new AuthError('token_exchange_failed', 'Sky Mavis rechazó el código de inicio de sesión.', 502, {
      status: r.status,
      error: data.error,
      error_description: data.error_description,
    });
  }
  return data as { id_token: string; access_token?: string };
}

async function verifyIdToken(disc: Discovery, idToken: string, nonce?: string) {
  if (!jwks || jwksUri !== disc.jwks_uri) {
    jwksUri = disc.jwks_uri;
    jwks = createRemoteJWKSet(new URL(disc.jwks_uri), { headers: { 'X-API-Key': API_KEY } });
  }
  const { alg } = decodeProtectedHeader(idToken);
  // Se aceptan las variantes con o sin barra final del issuer.
  const issuers = Array.from(new Set([disc.issuer, disc.issuer.replace(/\/$/, ''), disc.issuer.replace(/\/?$/, '/')]));
  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: issuers,
      audience: CLIENT_ID,
      algorithms: alg ? [alg] : undefined,
      clockTolerance: 60,
    });
    if (nonce && payload.nonce !== nonce) throw new Error('nonce no coincide');
    if (!payload.sub) throw new Error('id_token sin sub');
    return payload as Record<string, unknown> & { sub: string };
  } catch (e) {
    throw new AuthError('id_token_invalid', 'No se pudo verificar la identidad de Sky Mavis.', 401, String(e));
  }
}

// ---------------------------------------------------------------- Supabase (REST, rol de servicio)

async function sb(path: string, init: RequestInit = {}, key = SERVICE_KEY) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: key,
      // Las claves nuevas solo se aceptan en `apikey`; las antiguas (JWT) también en Authorization.
      ...(isJwt(key) ? { Authorization: `Bearer ${key}` } : {}),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data: data as any };
}

async function findProfileByMavisId(mavisId: string) {
  const r = await sb(`/rest/v1/profiles?select=user_id,email&mavis_id=eq.${encodeURIComponent(mavisId)}&limit=1`);
  if (!r.ok) throw new AuthError('provisioning_failed', 'No se pudo consultar el perfil.', 500, r.data);
  return Array.isArray(r.data) && r.data[0] ? r.data[0] : null;
}

async function getAuthUser(userId: string) {
  const r = await sb(`/auth/v1/admin/users/${userId}`);
  return r.ok ? r.data : null;
}

async function createAuthUser(email: string, meta: Record<string, unknown>) {
  const r = await sb('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, email_confirm: true, user_metadata: meta }),
  });
  if (r.ok) return r.data;
  // Ya existe una cuenta con ese correo (p. ej. registrada antes por email): se vincula a ella.
  const msg = JSON.stringify(r.data || '');
  if (r.status === 422 || /already|exists|registered/i.test(msg)) return null;
  throw new AuthError('provisioning_failed', 'No se pudo crear la cuenta del jugador.', 500, r.data);
}

/** Emite una sesión de Supabase para un correo ya existente sin enviar ningún email. */
async function mintSession(email: string) {
  const link = await sb('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const hashed = link.data?.hashed_token ?? link.data?.properties?.hashed_token;
  if (!link.ok || !hashed) throw new AuthError('session_failed', 'No se pudo abrir la sesión.', 500, link.data);

  for (const type of ['magiclink', 'email']) {
    const v = await sb('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type, token_hash: hashed }) }, ANON_KEY);
    if (v.ok && v.data?.access_token) return v.data;
  }
  throw new AuthError('session_failed', 'No se pudo abrir la sesión.', 500);
}

async function upsertProfile(userId: string, claims: Record<string, unknown>, email: string | null) {
  const ronin = (claims.roninAddress ?? claims.ronin_address ?? null) as string | null;
  const name = (claims.name as string) || (email ? email.split('@')[0] : null) || (ronin ? `${ronin.slice(0, 6)}…${ronin.slice(-4)}` : 'Lunacian');
  const row = {
    user_id: userId,
    mavis_id: claims.sub,
    ronin_address: ronin,
    email,
    auth_provider: 'skymavis',
    display_name: name,
    updated_at: new Date().toISOString(),
  };
  const r = await sb('/rest/v1/profiles?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new AuthError('provisioning_failed', 'No se pudo guardar el perfil.', 500, r.data);
  return Array.isArray(r.data) ? r.data[0] : r.data;
}

// ---------------------------------------------------------------- handler

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    if (!CLIENT_ID || !CLIENT_SECRET || !SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
      throw new AuthError('server_misconfigured', 'El servidor de cuentas no está configurado.', 500);
    }

    const body = await req.json().catch(() => ({}));
    const { code, code_verifier, redirect_uri, nonce } = body as Record<string, string>;
    if (!code || !code_verifier || !redirect_uri) {
      throw new AuthError('invalid_request', 'Faltan datos del inicio de sesión.');
    }
    if (code_verifier.length < 43 || code_verifier.length > 128) {
      throw new AuthError('invalid_request', 'code_verifier inválido.');
    }
    if (ALLOWED_REDIRECTS.length && !ALLOWED_REDIRECTS.includes(redirect_uri)) {
      throw new AuthError('redirect_not_allowed', 'Esta dirección del juego no está autorizada.', 403);
    }

    const disc = await getDiscovery();
    const tokens = await exchangeCode(disc, code, code_verifier, redirect_uri);
    const claims = await verifyIdToken(disc, tokens.id_token, nonce);

    const realEmail = typeof claims.email === 'string' && claims.email.includes('@') ? claims.email.toLowerCase() : null;
    const meta = { auth_provider: 'skymavis', display_name: (claims.name as string) || undefined };

    // 1) ¿Ya vinculó Sky Mavis antes? → misma cuenta.
    let userId: string | null = null;
    let loginEmail: string | null = null;
    const existing = await findProfileByMavisId(claims.sub);
    if (existing) {
      userId = existing.user_id;
      const u = await getAuthUser(existing.user_id);
      loginEmail = u?.email ?? existing.email;
    }

    // 2) Primera vez: crear la cuenta (o vincular la existente con el mismo correo verificado).
    if (!userId) {
      loginEmail = realEmail ?? `${claims.sub}@${SYNTHETIC_EMAIL_DOMAIN}`;
      const created = await createAuthUser(loginEmail, meta);
      userId = created?.id ?? null;
    }
    if (!loginEmail) throw new AuthError('provisioning_failed', 'La cuenta no tiene un identificador de acceso.', 500);

    const session = await mintSession(loginEmail);
    userId = session.user?.id ?? userId;
    const profile = await upsertProfile(userId!, claims, realEmail);

    return json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      },
      profile,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      console.warn(`[skymavis-auth] ${e.code}: ${e.message}`, e.detail ?? '');
      return json({ error: e.code, message: e.message }, e.status);
    }
    console.error('[skymavis-auth] error inesperado', e);
    return json({ error: 'internal_error', message: 'Error inesperado en el servidor de cuentas.' }, 500);
  }
});
