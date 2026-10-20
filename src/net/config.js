// config.js — Configuración pública de cuentas y guardado en la nube.
// Todos estos valores son PÚBLICOS (pueden ir en el repositorio).
// El client secret de Sky Mavis NUNCA va aquí: vive en los secretos de Supabase.

export const NET_CONFIG = {
  // Supabase → Project Settings → API
  supabaseUrl: 'https://umujjnazgvxsxfbdjeyb.supabase.co',
  supabaseAnonKey: 'sb_publishable_bkEqHc25JqBEsljHuMyFpg_c4B0iENX', // clave publishable (pública)

  // Ronin Developer Console → tu app → Sign in with Sky Mavis (OIDC). Ronin Waypoint se apaga el 31-oct-2026:
  // se usa el inicio de sesión estándar OIDC de la cuenta de Sky Mavis (Authorization Code + PKCE).
  // El client secret NUNCA va aquí: lo usa solo la función de servidor `skymavis-auth`.
  skymavis: {
    clientId: '34362128-ba5a-4d5e-afc0-ebf4fb6028f0', // Client ID de la app (público)
    authorizeUrl: 'https://api-gateway.skymavis.com/oauth2/auth',
    scope: 'openid',
    // Si el endpoint de autorización exige la API key como parámetro, ponla aquí (déjala vacía si no hace falta).
    authorizeApiKey: '',
    // Debe coincidir EXACTAMENTE con una URI registrada en la consola y con ALLOWED_REDIRECT_URIS de la función.
    // Por defecto: la raíz del sitio donde corre el juego (con barra final). También es la vuelta tras cerrar sesión.
    redirectUri: null,
    // «Cerrar sesión» cierra también la sesión de Sky Mavis (pasa por la función, que añade la API key).
    logoutAtSkyMavis: true,
  },

  // Funciones de servidor (Supabase Edge Functions)
  functions: {
    auth: '/functions/v1/skymavis-auth',
    axieData: '/functions/v1/axie-data', // consultas al marketplace de Sky Mavis (la API key vive en el servidor)
  },

  // Guardado en la nube
  cloudSave: {
    debounceMs: 4000,       // espera tras el último cambio antes de subir
    retryDelaysMs: [3000, 8000, 20000, 45000],
  },
};

/** URL de retorno efectiva (la raíz del sitio donde corre el juego). */
export function getRedirectUri() {
  if (NET_CONFIG.skymavis.redirectUri) return NET_CONFIG.skymavis.redirectUri;
  const { origin, pathname } = window.location;
  const base = pathname.replace(/index\.html$/, '');
  return origin + (base.endsWith('/') ? base : base + '/');
}

export const isCloudConfigured = () => Boolean(NET_CONFIG.supabaseUrl && NET_CONFIG.supabaseAnonKey);
export const isSkyMavisConfigured = () => isCloudConfigured() && Boolean(NET_CONFIG.skymavis.clientId);
