// AuthService.js — Cuentas de jugador: Sign in with Sky Mavis (OIDC + PKCE) y correo (código de 6 dígitos).
// Sin dependencias: habla con Supabase Auth por REST (fetch nativo), fiel a la filosofía Zero-Build.
//
// Estados que devuelve init():
//   { status: 'signed_in' }    sesión válida (recién iniciada o restaurada)
//   { status: 'signed_out' }   no hay sesión (o caducó; ver `error`)
//   { status: 'unverified' }   había sesión pero no se pudo verificar (sin red / servidor caído):
//                              NO se entra a la cuenta hasta poder verificarla.

import { NET_CONFIG, getRedirectUri, isCloudConfigured, isSkyMavisConfigured } from './config.js';
import * as i18n from '../i18n/i18n.js';

const STORAGE_KEY = 'lunakai_auth_v1';
const PKCE_KEY = 'lunakai_pkce_v1';
const LINK_GUEST_KEY = 'lunakai_link_guest_v1';
const LOGOUT_KEY = 'lunakai_sm_logout_v1'; // vuelta de cerrar sesión en Sky Mavis (sessionStorage)
const REFRESH_MARGIN_S = 90;

export class AuthError extends Error {
  constructor(code, message, { retryable = false, status = 0 } = {}) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

/** Texto para el jugador según el código de error. */
export function describeAuthError(err) {
  const code = err?.code || 'unknown';
  const map = {
    network: i18n.t('account.err.network'),
    server_unavailable: i18n.t('account.err.serverUnavailable'),
    session_expired: i18n.t('account.err.sessionExpired'),
    access_denied: i18n.t('account.err.accessDenied'),
    state_mismatch: i18n.t('account.err.stateMismatch'),
    token_exchange_failed: i18n.t('account.err.tokenExchangeFailed'),
    id_token_invalid: i18n.t('account.err.idTokenInvalid'),
    redirect_not_allowed: i18n.t('account.err.redirectNotAllowed'),
    server_misconfigured: i18n.t('account.err.serverMisconfigured'),
    not_configured: i18n.t('account.err.notConfigured'),
    invalid_email: i18n.t('account.err.invalidEmail'),
    invalid_code: i18n.t('account.err.invalidCode'),
    link_expired: i18n.t('account.err.linkExpired'),
    rate_limited: i18n.t('account.err.rateLimited'),
  };
  return map[code] || err?.message || i18n.t('account.err.unknown');
}

// ---------------------------------------------------------------- utilidades

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomString = (len = 64) => b64url(crypto.getRandomValues(new Uint8Array(len))).slice(0, len);
async function sha256b64url(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return b64url(new Uint8Array(digest));
}
const isJwt = (k) => typeof k === 'string' && k.startsWith('eyJ');
const nowS = () => Math.floor(Date.now() / 1000);
const store = {
  get(k, s = localStorage) { try { return JSON.parse(s.getItem(k) || 'null'); } catch { return null; } },
  set(k, v, s = localStorage) { try { if (v == null) s.removeItem(k); else s.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

/** Petición REST a Supabase. Lanza AuthError con un código estable. */
export async function supabaseFetch(path, { method = 'GET', body, token, headers = {}, keepalive = false } = {}) {
  if (!isCloudConfigured()) throw new AuthError('not_configured', 'Supabase no configurado');
  let res;
  try {
    res = await fetch(`${NET_CONFIG.supabaseUrl}${path}`, {
      method,
      keepalive,
      headers: {
        apikey: NET_CONFIG.supabaseAnonKey,
        // Las claves nuevas (sb_publishable_…) solo van en `apikey`; Authorization lleva el JWT del jugador.
        ...(token ? { Authorization: `Bearer ${token}` } : (isJwt(NET_CONFIG.supabaseAnonKey) ? { Authorization: `Bearer ${NET_CONFIG.supabaseAnonKey}` } : {})),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new AuthError('network', String(e?.message || e), { retryable: true });
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const serverCode = data?.error_code || data?.error || data?.code;
    let code = typeof serverCode === 'string' ? serverCode : 'request_failed';
    if (res.status >= 500) code = data?.error && typeof data.error === 'string' && data.error !== 'internal_error' ? data.error : 'server_unavailable';
    if (res.status === 429) code = 'rate_limited';
    throw new AuthError(code, data?.message || data?.msg || data?.error_description || `HTTP ${res.status}`, {
      retryable: res.status >= 500 || res.status === 429,
      status: res.status,
    });
  }
  return data;
}

// ---------------------------------------------------------------- servicio

class AuthService {
  constructor() {
    this.session = null;   // { access_token, refresh_token, expires_at, user, provider }
    this.profile = null;   // fila de public.profiles
    this._listeners = new Set();
    this._refreshing = null;
    this._refreshTimer = null;
  }

  get configured() { return isCloudConfigured(); }
  get skyMavisConfigured() { return isSkyMavisConfigured(); }
  isSignedIn() { return Boolean(this.session?.access_token); }
  getUser() { return this.session?.user || null; }
  getUserId() { return this.session?.user?.id || null; }
  getProvider() { return this.session?.provider || null; }

  onChange(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  _emit(event) { this._listeners.forEach((fn) => { try { fn(event, this.session); } catch (e) { console.warn('[Auth] listener', e); } }); }

  /** Arranque: procesa el retorno de Sky Mavis o restaura la sesión guardada. */
  async init() {
    if (!this.configured) return { status: 'signed_out', error: null };

    // Retorno desde el enlace del correo de Supabase: #access_token=…&refresh_token=… (o #error=…)
    const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    if (hash.has('access_token') || hash.has('error_code') || (hash.has('error') && hash.has('error_description'))) {
      try {
        await this._handleEmailLink(hash);
        return { status: 'signed_in', fresh: true, linkGuest: this._consumeLinkGuest() };
      } catch (err) {
        return { status: 'signed_out', error: err };
      }
    }

    const params = new URLSearchParams(window.location.search);
    // Vuelta de cerrar sesión en Sky Mavis (?state=…): solo se limpia la URL.
    const out = store.get(LOGOUT_KEY, sessionStorage);
    if (out && params.get('state') === out.state && !params.has('code')) {
      store.set(LOGOUT_KEY, null, sessionStorage);
      this._cleanUrl();
      return { status: 'signed_out', error: null };
    }
    if (params.has('code') || params.has('error')) {
      try {
        await this._handleSkyMavisCallback(params);
        return { status: 'signed_in', fresh: true, linkGuest: this._lastLinkGuest };
      } catch (err) {
        return { status: 'signed_out', error: err };
      }
    }

    const saved = store.get(STORAGE_KEY);
    if (!saved?.refresh_token) return { status: 'signed_out', error: null };
    this.session = saved;
    try {
      if (!saved.expires_at || saved.expires_at - nowS() < REFRESH_MARGIN_S) await this._refresh();
      else { await this.loadProfile(); this._scheduleRefresh(); }
      this._emit('restored');
      return { status: 'signed_in' };
    } catch (err) {
      if (err.code === 'session_expired') return { status: 'signed_out', error: err };
      // Sin red o servidor caído: no se entra a la cuenta sin verificarla.
      return { status: 'unverified', error: err };
    }
  }

  // ------------------------------------------------ Sky Mavis (Authorization Code + PKCE)

  async startSkyMavisLogin({ linkGuest = false } = {}) {
    if (!this.skyMavisConfigured) throw new AuthError('not_configured', 'Sky Mavis no configurado');
    const verifier = randomString(64);
    const challenge = await sha256b64url(verifier);
    const state = randomString(32);
    const nonce = randomString(32);
    const redirectUri = getRedirectUri();
    store.set(PKCE_KEY, { verifier, state, nonce, redirectUri, linkGuest, at: Date.now() }, sessionStorage);

    const sm = NET_CONFIG.skymavis;
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: sm.clientId,
      redirect_uri: redirectUri,
      scope: sm.scope || 'openid',
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    if (sm.authorizeApiKey) q.set('apikey', sm.authorizeApiKey);
    window.location.assign(`${sm.authorizeUrl}?${q.toString()}`);
  }

  async _handleSkyMavisCallback(params) {
    const pkce = store.get(PKCE_KEY, sessionStorage);
    store.set(PKCE_KEY, null, sessionStorage);
    this._lastLinkGuest = Boolean(pkce?.linkGuest);
    this._cleanUrl(pkce?.redirectUri);

    if (params.get('error')) {
      const e = params.get('error');
      throw new AuthError(e === 'access_denied' ? 'access_denied' : 'token_exchange_failed', params.get('error_description') || e);
    }
    if (!pkce || !params.get('state') || params.get('state') !== pkce.state || Date.now() - pkce.at > 15 * 60_000) {
      throw new AuthError('state_mismatch', 'state inválido');
    }

    const res = await supabaseFetch(NET_CONFIG.functions.auth, {
      method: 'POST',
      body: { code: params.get('code'), code_verifier: pkce.verifier, redirect_uri: pkce.redirectUri, nonce: pkce.nonce },
    });
    this._setSession(res.session, 'skymavis');
    // id_token de Sky Mavis: solo se guarda para poder cerrar también su sesión (id_token_hint).
    if (res.id_token) this.session.sm_id_token = res.id_token;
    this.profile = res.profile || null;
    this._persist();
    this._emit('signed_in');
  }

  _cleanUrl(redirectUri) {
    try {
      const target = redirectUri ? new URL(redirectUri) : new URL(window.location.href);
      window.history.replaceState(null, '', target.pathname + target.hash);
    } catch { /* nada */ }
  }

  // ------------------------------------------------ Correo (código de un solo uso)

  async sendEmailCode(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new AuthError('invalid_email', 'correo inválido');
    // redirect_to: si el correo trae un enlace, devuelve al jugador al juego con la sesión abierta.
    await supabaseFetch(`/auth/v1/otp?redirect_to=${encodeURIComponent(getRedirectUri())}`, {
      method: 'POST',
      body: { email: clean, create_user: true },
    });
    store.set(LINK_GUEST_KEY, this._pendingLinkGuest ? { at: Date.now() } : null);
    return clean;
  }

  /** Marca que el siguiente inicio de sesión viene de "Vincular cuenta" desde invitado. */
  setPendingLinkGuest(on) { this._pendingLinkGuest = Boolean(on); }

  _consumeLinkGuest() {
    const v = store.get(LINK_GUEST_KEY);
    store.set(LINK_GUEST_KEY, null);
    return Boolean(v && Date.now() - v.at < 3600_000);
  }

  async _handleEmailLink(hash) {
    this._cleanUrl();
    if (!hash.get('access_token')) {
      throw new AuthError('link_expired', hash.get('error_description') || hash.get('error_code') || 'enlace inválido');
    }
    const token = hash.get('access_token');
    const user = await supabaseFetch('/auth/v1/user', { token });
    const expiresIn = Number(hash.get('expires_in')) || 3600;
    this._setSession({
      access_token: token,
      refresh_token: hash.get('refresh_token'),
      expires_at: Number(hash.get('expires_at')) || nowS() + expiresIn,
      user,
    }, 'email');
    this._persist();
    await this.loadProfile().catch(() => null);
    this._emit('signed_in');
  }

  async verifyEmailCode(email, code) {
    const token = String(code || '').replace(/\D/g, '');
    if (token.length < 6) throw new AuthError('invalid_code', 'código incompleto');
    let data;
    try {
      data = await supabaseFetch('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token } });
    } catch (e) {
      if (e.status === 400 || e.status === 403 || /otp|token|expired|invalid/i.test(e.message)) throw new AuthError('invalid_code', e.message);
      throw e;
    }
    this._setSession(data, 'email');
    this._persist();
    await this.loadProfile().catch(() => null);
    this._emit('signed_in');
  }

  // ------------------------------------------------ sesión

  _setSession(s, provider) {
    this.session = {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at || nowS() + (s.expires_in || 3600),
      user: s.user ? { id: s.user.id, email: s.user.email } : this.session?.user,
      provider: provider || this.session?.provider || 'email',
      sm_id_token: this.session?.sm_id_token || undefined,
    };
    this._scheduleRefresh();
  }

  _persist() { store.set(STORAGE_KEY, this.session); }

  _scheduleRefresh() {
    clearTimeout(this._refreshTimer);
    if (!this.session?.expires_at) return;
    const ms = Math.max(5_000, (this.session.expires_at - nowS() - REFRESH_MARGIN_S) * 1000);
    this._refreshTimer = setTimeout(() => this._refresh().catch((e) => console.warn('[Auth] refresh', e.code)), ms);
  }

  async _refresh() {
    if (this._refreshing) return this._refreshing;
    const rt = this.session?.refresh_token;
    if (!rt) throw new AuthError('session_expired', 'sin refresh token');
    this._refreshing = (async () => {
      try {
        const data = await supabaseFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: rt } });
        this._setSession(data, this.session?.provider);
        this._persist();
        await this.loadProfile().catch(() => null);
        this._emit('refreshed');
      } catch (e) {
        if (e.status === 400 || e.status === 401 || e.status === 403) {
          this._clear();
          this._emit('expired');
          throw new AuthError('session_expired', e.message);
        }
        throw e;
      } finally {
        this._refreshing = null;
      }
    })();
    return this._refreshing;
  }

  /** Token de acceso válido (renueva si está por caducar). */
  async getAccessToken() {
    if (!this.session) throw new AuthError('session_expired', 'sin sesión');
    if (this.session.expires_at - nowS() < REFRESH_MARGIN_S) await this._refresh();
    return this.session.access_token;
  }

  async loadProfile() {
    const uid = this.getUserId();
    if (!uid) return null;
    const rows = await supabaseFetch(`/rest/v1/profiles?select=*&user_id=eq.${uid}`, { token: this.session.access_token });
    this.profile = Array.isArray(rows) ? rows[0] || null : null;
    return this.profile;
  }

  async updateProfile(patch) {
    const uid = this.getUserId();
    if (!uid) return null;
    const token = await this.getAccessToken();
    const rows = await supabaseFetch(`/rest/v1/profiles?user_id=eq.${uid}`, {
      method: 'PATCH',
      token,
      headers: { Prefer: 'return=representation' },
      body: { ...patch, updated_at: new Date().toISOString() },
    });
    if (Array.isArray(rows) && rows[0]) this.profile = rows[0];
    return this.profile;
  }

  /** Nombre visible para la interfaz. */
  getDisplayInfo() {
    const p = this.profile || {};
    const email = this.session?.user?.email || '';
    const synthetic = /\.invalid$/.test(email);
    const name = p.display_name || (!synthetic && email ? email.split('@')[0] : '') || 'Lunacian';
    const ronin = p.ronin_address || null;
    const short = ronin ? `${ronin.slice(0, 6)}…${ronin.slice(-4)}` : null;
    return {
      name,
      provider: this.getProvider(),
      providerLabel: this.getProvider() === 'skymavis' ? 'Sky Mavis' : i18n.t('account.providerEmail'),
      email: synthetic ? null : email,
      ronin,
      roninShort: short,
    };
  }

  async signOut() {
    const token = this.session?.access_token;
    const smIdToken = this.getProvider() === 'skymavis' ? this.session?.sm_id_token : null;
    this._clear();
    this._emit('signed_out');
    if (token) {
      try { await supabaseFetch('/auth/v1/logout', { method: 'POST', token }); } catch { /* la sesión local ya se borró */ }
    }
    // Cierra también la sesión de Sky Mavis: la función redirige a su endpoint de logout (añade la API key)
    // y Sky Mavis devuelve al jugador al juego (post_logout_redirect_uri, registrada en la consola).
    if (smIdToken && NET_CONFIG.skymavis.logoutAtSkyMavis && isCloudConfigured()) {
      const state = randomString(24);
      store.set(LOGOUT_KEY, { state, at: Date.now() }, sessionStorage);
      const q = new URLSearchParams({ logout: '1', id_token_hint: smIdToken, post_logout_redirect_uri: getRedirectUri(), state });
      window.location.assign(`${NET_CONFIG.supabaseUrl}${NET_CONFIG.functions.auth}?${q.toString()}`);
      return { redirecting: true };
    }
    return { redirecting: false };
  }

  _clear() {
    clearTimeout(this._refreshTimer);
    this.session = null;
    this.profile = null;
    store.set(STORAGE_KEY, null);
  }
}

export const authService = new AuthService();
if (typeof window !== 'undefined') window.lunakaiAuth = authService;
