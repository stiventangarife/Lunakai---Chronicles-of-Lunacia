// FeedbackService.js — Envío de feedback de los jugadores a Supabase (Hito 121).
// Todo pasa por la función `submit_feedback` (migración 20261104000000_feedback.sql), que pueden llamar
// invitados (solo la clave pública) y cuentas (con su token). El tipo de cuenta lo decide el servidor:
// el cliente nunca dice «soy Sky Mavis».

import { supabaseFetch, AuthError } from './AuthService.js';
import { isCloudConfigured } from './config.js';
import { accountManager } from './AccountManager.js';
import * as i18n from '../i18n/i18n.js';

const GUEST_ID_KEY = 'lunakai_feedback_guest_id';
export const FEEDBACK_MIN = 5;
export const FEEDBACK_MAX = 2000;

/** Id anónimo y estable de este navegador para agrupar el feedback de un invitado. */
function guestId() {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = (crypto.randomUUID ? crypto.randomUUID() : fallbackUuid());
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch (_) {
    return fallbackUuid(); // sin almacenamiento: uno por envío
  }
}

function fallbackUuid() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Datos del momento que ayudan a entender el mensaje (sin datos personales). */
async function buildContext(extra = {}) {
  const om = window.overworldManager;
  const tm = om?.tutorialManager;
  let version = null;
  try { version = (await import('../rpg/ui/StartScreenUI.js')).GAME_VERSION; } catch (_) { /* nada */ }
  return {
    version,
    lang: i18n.lang(),
    map: om?.worldMapManager?.currentMapId || null,
    tutorialDone: tm ? Boolean(tm.done) : null,
    tutorialStep: tm && !tm.done ? (tm.step || null) : null,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    ua: String(navigator.userAgent || '').slice(0, 160),
    ...extra,
  };
}

class FeedbackService {
  get available() { return isCloudConfigured(); }

  /** Quién firma el mensaje, para mostrarlo en el formulario: { kind: 'guest'|'skymavis'|'email', name }. */
  sender() {
    const v = accountManager.getSessionView?.();
    if (v && (v.mode === 'skymavis' || v.mode === 'email')) return { kind: v.mode, name: v.name || null };
    return { kind: 'guest', name: null };
  }

  /**
   * Envía el mensaje. Devuelve { ok: true, id } o lanza AuthError con un código:
   * too_short | too_long | rate_limited | missing_guest_id | network | server_unavailable | not_configured | …
   */
  async send({ message, source = 'hud', context = {} }) {
    const text = String(message || '').trim();
    if (text.length < FEEDBACK_MIN) throw new AuthError('too_short', 'feedback corto');
    if (text.length > FEEDBACK_MAX) throw new AuthError('too_long', 'feedback largo');

    // Con cuenta va su token; si la sesión no se puede renovar, se envía como invitado para no perder el mensaje.
    let token;
    if (accountManager.mode === 'account') {
      try { token = await accountManager.auth.getAccessToken(); } catch (_) { token = undefined; }
    }
    const body = {
      p_message: text,
      p_source: source === 'tutorial_end' ? 'tutorial_end' : 'hud',
      p_guest_id: token ? null : guestId(),
      p_context: await buildContext(context),
    };
    const res = await supabaseFetch('/rest/v1/rpc/submit_feedback', { method: 'POST', body, token });
    if (!res || res.ok !== true) {
      const code = res?.error || 'request_failed';
      throw new AuthError(code, `submit_feedback: ${code}`, { retryable: code === 'rate_limited' });
    }
    return { ok: true, id: res.id };
  }
}

export const feedbackService = new FeedbackService();
