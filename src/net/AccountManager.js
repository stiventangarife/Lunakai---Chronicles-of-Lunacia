// AccountManager.js — Une la sesión (AuthService), las ranuras (SaveSlotManager) y la nube (CloudSave).
// La interfaz (StartScreenUI) solo habla con este módulo.

import { authService, AuthError, describeAuthError } from './AuthService.js';
import { CloudSave } from './CloudSave.js';
import { saveSlotManager } from '../rpg/SaveSlotManager.js';

const GUEST_FLAG = 'lunakai_session'; // compatibilidad: recordaba "entró como invitado"

class AccountManager {
  constructor() {
    this.auth = authService;
    this.cloud = new CloudSave({ saveSlotManager, authService });
    this.mode = 'none'; // none | guest | account

    // Si la sesión caduca mientras se juega, se avisa a la interfaz.
    this.auth.onChange((event) => {
      if (event === 'expired' && this.mode === 'account') {
        this.cloud.disable();
        this.onSessionExpired?.();
      }
    });

    window.addEventListener('beforeunload', () => {
      if (this.mode === 'account' && this.cloud.hasPending()) this.cloud.flush({ keepalive: true });
    });
  }

  get configured() { return this.auth.configured; }
  get skyMavisConfigured() { return this.auth.skyMavisConfigured; }
  describeError(err) { return describeAuthError(err); }

  /** Sesión para la interfaz: { mode: 'guest' } o { mode: 'skymavis'|'email', name, ... }. */
  getSessionView() {
    if (this.mode === 'account') {
      const info = this.auth.getDisplayInfo();
      return { mode: info.provider === 'skymavis' ? 'skymavis' : 'email', ...info };
    }
    if (this.mode === 'guest') return { mode: 'guest' };
    return null;
  }

  wasGuest() {
    try { return JSON.parse(localStorage.getItem(GUEST_FLAG) || 'null')?.mode === 'guest'; } catch { return false; }
  }

  /** Arranque del juego. Devuelve { status, error, fresh, linkGuest }. */
  async boot() {
    const res = await this.auth.init();
    if (res.status === 'signed_in') {
      await this._enterAccount();
      return { ...res, ...(await this._pull()) };
    }
    return res;
  }

  /** Reintenta verificar una sesión guardada (tras un fallo de red). */
  async retryBoot() { return this.boot(); }

  enterGuest() {
    this.cloud.disable();
    saveSlotManager.setOwner({ mode: 'guest' });
    this.mode = 'guest';
    try { localStorage.setItem(GUEST_FLAG, JSON.stringify({ mode: 'guest' })); } catch { /* nada */ }
  }

  startSkyMavis({ linkGuest = false } = {}) {
    return this.auth.startSkyMavisLogin({ linkGuest });
  }

  sendEmailCode(email) { return this.auth.sendEmailCode(email); }

  async verifyEmailCode(email, code) {
    await this.auth.verifyEmailCode(email, code);
    await this._enterAccount();
    return this._pull();
  }

  async _enterAccount() {
    const userId = this.auth.getUserId();
    if (!userId) throw new AuthError('session_expired', 'sin usuario');
    saveSlotManager.setOwner({ mode: 'account', userId });
    this.cloud.enable();
    this.mode = 'account';
    try { localStorage.removeItem(GUEST_FLAG); } catch { /* nada */ }
  }

  async _pull() {
    try {
      const { notices } = await this.cloud.pullAll();
      return { syncOk: true, notices };
    } catch (err) {
      // Sin red al traer las ranuras: se usa la caché local de ESTA cuenta y se sigue intentando.
      return { syncOk: false, syncError: err, notices: [] };
    }
  }

  /** ¿Hay aventuras de invitado que se puedan subir a la cuenta? */
  getGuestImportOffer() {
    if (this.mode !== 'account' || !saveSlotManager.hasGuestSlots()) return null;
    const guest = saveSlotManager.readGuestSlots();
    const guestIds = [1, 2, 3].filter((id) => guest[id]);
    const accountIds = [1, 2, 3].filter((id) => saveSlotManager.getSlot(id));
    const free = 3 - accountIds.length;
    return { guest, guestCount: guestIds.length, accountCount: accountIds.length, fits: guestIds.length <= free };
  }

  async importGuest(strategy = 'fill') {
    const offer = this.getGuestImportOffer();
    if (!offer) return { imported: 0, skipped: 0 };
    const result = await this.cloud.importGuestSlots(offer.guest, strategy);
    if (result.imported > 0) saveSlotManager.archiveGuestSlots();
    return result;
  }

  dismissGuestImport() { saveSlotManager.archiveGuestSlots(); }

  /**
   * Cierra la sesión. Si hay progreso sin subir y no se puede subir, devuelve
   * { pending: true } para que la interfaz pregunte (salvo force=true).
   */
  async signOut({ force = false } = {}) {
    if (this.mode === 'account' && this.cloud.hasPending()) {
      const ok = await this.cloud.flush().catch(() => false);
      if (!ok && !force) return { pending: true };
    }
    this.cloud.disable();
    if (this.mode === 'account') saveSlotManager.clearAccountCache();
    else saveSlotManager.setOwner({ mode: 'guest' });
    this.mode = 'none';
    try { localStorage.removeItem(GUEST_FLAG); } catch { /* nada */ }
    const out = await this.auth.signOut();
    return { pending: false, redirecting: Boolean(out?.redirecting) };
  }

  /** Marca en el perfil que el jugador ya completó la introducción (para no repetirla). */
  async markIntroCompleted() {
    if (this.mode !== 'account' || this.auth.profile?.has_completed_intro) return;
    try { await this.auth.updateProfile({ has_completed_intro: true }); } catch (e) { console.warn('[Account] intro flag', e.code); }
  }

  hasCompletedIntro() {
    return this.mode === 'account' && Boolean(this.auth.profile?.has_completed_intro);
  }
}

export const accountManager = new AccountManager();
if (typeof window !== 'undefined') window.lunakaiAccount = accountManager;
