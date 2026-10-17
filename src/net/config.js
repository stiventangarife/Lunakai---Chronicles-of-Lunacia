// config.js — Configuración pública de cuentas y guardado en la nube.
// Todos estos valores son PÚBLICOS (pueden ir en el repositorio).
// El client secret de Sky Mavis NUNCA va aquí: vive en los secretos de Supabase.

export const NET_CONFIG = {
  // Supabase → Project Settings → API
  supabaseUrl: 'https://umujjnazgvxsxfbdjeyb.supabase.co',
  supabaseAnonKey: 'sb_publishable_bkEqHc25JqBEsljHuMyFpg_c4B0iENX', // clave publishable (pública)

  // Ronin Developer Console → tu app → Ronin Account
  skymavis: {
    clientId: '',           // Client ID de la app
    authorizeUrl: 'https://api-gateway.skymavis.com/oauth2/auth',
    scope: 'openid',
    // Si el endpoint de autorización exige la API key como parámetro, ponla aquí
    // (es la misma clave pública de API Gateway; déjala vacía si no hace falta).
    authorizeApiKey: '',
    // Debe coincidir EXACTAMENTE con una "Sign-in URI" registrada en el console
    // y con ALLOWED_REDIRECT_URIS de la Edge Function. Por defecto: la raíz del juego.
    redirectUri: null,
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
