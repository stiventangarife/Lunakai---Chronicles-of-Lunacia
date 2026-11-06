// KoliseoService.js — Datos del Koliseo desde Supabase (Koliseo, fase B1).
// Plan: docs/PLAN_DESAFIO_DE_LA_BRUMA.md. Servidor: supabase/migrations/20261104000001_koliseo_bruma.sql.
//
// · week()        → semana actual del Desafío de la Bruma (bioma, modificador, 5 combates, intentos de la cuenta).
// · board(week?)  → clasificación (los 10 primeros y «tu puesto» si estás fuera).
// · startRun(slot) · beginStage(run) · reportStage(ticket, win, rounds) → intento y combates (fase B2).
// · pendingRewards(slot) · ackRewards(slot, ids) → premios del top 3 (fase B4, ver koliseo/KoliseoRewards.js).
// Invitados: leen la semana y la clasificación del servidor; su intento vive en este navegador (sin clasificar).
// Cuentas: con su token. Nunca se manda quién es el jugador: lo decide el servidor (auth.uid()).
// Si un informe no llega (sin red), queda pendiente en localStorage y se reenvía antes del siguiente combate:
// el servidor contaría como abandono (derrota) un combate empezado y sin informar.

import { supabaseFetch, AuthError } from '../net/AuthService.js';
import { isCloudConfigured } from '../net/config.js';
import { accountManager } from '../net/AccountManager.js';

const WEEK_TTL_MS = 30_000;
const BOARD_CLOSED_TTL_MS = 10 * 60_000;
const GUEST_KEY = 'lunakai_bruma_guest_v1';
const PENDING_KEY = 'lunakai_bruma_pending_v1';
const GUEST_ATTEMPTS = 2;
const GUEST_MAX_DEFEATS = 2;
const STAGES = 5;

const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } };
const writeJSON = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* sin almacenamiento */ } };

class KoliseoService {
  constructor() {
    this._week = null;
    this._weekAt = 0;
    this._clockSkew = 0; // hora del servidor − hora local (para la cuenta atrás)
    this._boards = new Map(); // semana → { at, data }
  }

  get available() { return isCloudConfigured(); }
  get isAccount() { return accountManager.mode === 'account'; }

  async _rpc(fn, args = {}) {
    let token;
    if (this.isAccount) {
      try { token = await accountManager.auth.getAccessToken(); } catch (_) { token = undefined; }
    }
    const res = await supabaseFetch(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args, token });
    if (!res || res.ok === false) {
      const err = new AuthError(res?.error || 'request_failed', `${fn}: ${res?.error || 'sin respuesta'}`);
      err.data = res || null; // p. ej. el intento terminado que acompaña a run_over
      throw err;
    }
    return res;
  }

  /** Semana actual (con caché corta). force: pedirla de nuevo. */
  async week({ force = false } = {}) {
    if (!force && this._week && Date.now() - this._weekAt < WEEK_TTL_MS) return this._week;
    const w = await this._rpc('bruma_week');
    if (w.now) this._clockSkew = new Date(w.now).getTime() - Date.now();
    if (!this.isAccount) w.me = this._guestMe(w.week); // invitado: su progreso de este navegador
    this._week = w;
    this._weekAt = Date.now();
    return w;
  }

  /** Clasificación de una semana ('2026-W45'); sin argumento, la actual. Caché de 30 s (la de semanas cerradas, 10 min). */
  async board(week = null) {
    const key = week || 'current';
    const hit = this._boards.get(key);
    if (hit && Date.now() - hit.at < (hit.data?.closed ? BOARD_CLOSED_TTL_MS : WEEK_TTL_MS)) return hit.data;
    const data = await this._rpc('bruma_board', week ? { p_week: week } : {});
    if (this._boards.size > 8) this._boards.clear(); // pocas semanas a la vista: tope simple
    this._boards.set(key, { at: Date.now(), data });
    return data;
  }

  /** Hora del servidor (aproximada) en ms. */
  serverNow() { return Date.now() + this._clockSkew; }

  /** Id de la semana anterior a la dada por su inicio (ISO, lunes en hora de Colombia). */
  previousWeekId(startsAtIso) {
    const start = new Date(startsAtIso).getTime();
    if (!Number.isFinite(start)) return null;
    // Lunes anterior a las 00:00 de Colombia (UTC−5, sin horario de verano) → se trabaja en ese huso
    const d = new Date(start - 7 * 86400_000 - 5 * 3600_000);
    return isoWeekId(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
  }

  invalidate() { this._week = null; this._boards.clear(); }

  // ------------------------------------------------------------ intento y combates (fase B2)
  /** Empieza (o reanuda) un intento. Devuelve { run, resumed } o lanza AuthError (no_attempts, run_in_other_slot…). */
  async startRun(slot) {
    if (!this.isAccount) return this._guestStart();
    const res = await this._rpc('bruma_start', { p_slot: slot });
    this.invalidate();
    return res;
  }

  /**
   * Empieza el combate actual del intento. Devuelve { token, stage (número), config (combate), modifier, biome, seed,
   * week, run, abandoned }. Con run_over lanza AuthError con `run` (intento terminado por un abandono).
   */
  async beginStage(run) {
    await this.flushPending();
    if (!this.isAccount) return this._guestBegin();
    const w = await this.week();
    try {
      const res = await this._rpc('bruma_stage_begin', { p_run: run.id });
      return { ...res, week: w.week };
    } catch (err) { this.invalidate(); throw err; }
  }

  /** Informa el resultado. Devuelve { run } o lanza AuthError; sin red, lo deja pendiente y lanza 'pending'. */
  async reportStage(ticket, win, rounds) {
    const body = { p_run: ticket.runId, p_token: ticket.token, p_result: win ? 'win' : 'loss', p_rounds: Math.max(1, Math.round(rounds || 1)) };
    if (ticket.guest) return this._guestReport(ticket, win, body.p_rounds);
    try {
      const res = await this._rpc('bruma_report', body);
      writeJSON(PENDING_KEY, null);
      this.invalidate();
      return res;
    } catch (err) {
      if (err?.code === 'network' || err?.code === 'server_unavailable' || err?.code === 'rate_limited') {
        writeJSON(PENDING_KEY, body);
        throw new AuthError('pending', 'informe pendiente');
      }
      this.invalidate();
      throw err;
    }
  }

  // ------------------------------------------------------------ premios (fase B4)
  /** Premios sin cobrar de la partida: [{ id, week, biome, rank, items: {mat: n}, gold, baxs }]. Solo cuentas. */
  async pendingRewards(slot) {
    if (!this.isAccount || !slot) return [];
    const res = await this._rpc('koliseo_pending', { p_slot: slot });
    return Array.isArray(res.rewards) ? res.rewards : [];
  }

  /** Marca como cobrados los premios ya guardados en la partida. */
  ackRewards(slot, ids) {
    if (!this.isAccount || !slot || !ids?.length) return Promise.resolve({ ok: true, acked: 0 });
    return this._rpc('koliseo_ack', { p_slot: slot, p_ids: ids });
  }

  /** Reenvía un informe que no llegó. */
  async flushPending() {
    const body = readJSON(PENDING_KEY);
    if (!body || !this.isAccount) return null;
    try {
      const res = await this._rpc('bruma_report', body);
      writeJSON(PENDING_KEY, null);
      this.invalidate();
      return res;
    } catch (err) {
      if (err?.code === 'network' || err?.code === 'server_unavailable') throw err;
      writeJSON(PENDING_KEY, null); // el servidor lo rechazó (ya informado, intento terminado…): no se insiste
      return null;
    }
  }

  // ------------------------------------------------------------ invitado (solo en este navegador)
  _guestState(week) {
    const wk = week || this._week?.week;
    let st = readJSON(GUEST_KEY);
    if (!st || st.week !== wk) st = { week: wk, runs: [] };
    return st;
  }

  _guestMe(week) {
    const st = this._guestState(week);
    const active = st.runs.find((r) => r.status === 'active') || null;
    const best = [...st.runs].sort((a, b) => (b.cleared - a.cleared) || (a.turns - b.turns))[0] || null;
    return { guest: true, used: st.runs.length, left: Math.max(0, GUEST_ATTEMPTS - st.runs.length), active, best };
  }

  _guestStart() {
    const w = this._week;
    if (!w) throw new AuthError('request_failed', 'sin semana');
    const st = this._guestState(w.week);
    let run = st.runs.find((r) => r.status === 'active');
    if (run) return { ok: true, resumed: true, run };
    if (st.runs.length >= GUEST_ATTEMPTS) throw new AuthError('no_attempts', 'sin intentos');
    run = { id: `guest-${w.week}-${st.runs.length + 1}`, attempt: st.runs.length + 1, status: 'active', stage: 1, cleared: 0, turns: 0, defeats: 0, open: null };
    st.runs.push(run);
    writeJSON(GUEST_KEY, st);
    return { ok: true, resumed: false, run };
  }

  _guestBegin() {
    const w = this._week;
    const st = this._guestState(w?.week);
    const run = st.runs.find((r) => r.status === 'active');
    if (!w || !run) throw new AuthError('run_over', 'sin intento');
    let abandoned = false;
    if (run.open) { // combate empezado y sin informar: cuenta como derrota, igual que en el servidor
      abandoned = true;
      run.open = null;
      run.defeats += 1;
      if (run.defeats >= GUEST_MAX_DEFEATS) { run.status = 'out'; writeJSON(GUEST_KEY, st); const e = new AuthError('run_over', 'abandono'); e.run = run; e.abandoned = true; throw e; }
    }
    run.open = `g${Date.now().toString(36)}`;
    writeJSON(GUEST_KEY, st);
    const cfg = (w.config?.stages || [])[run.stage - 1];
    return { ok: true, token: run.open, stage: run.stage, config: cfg, modifier: w.config?.modifier, biome: w.biome, seed: w.seed, week: w.week, run: { ...run }, abandoned, guest: true };
  }

  _guestReport(ticket, win, rounds) {
    const st = this._guestState();
    const run = st.runs.find((r) => r.id === ticket.runId);
    if (!run || run.open !== ticket.token) throw new AuthError('unknown_battle', 'combate desconocido');
    run.open = null;
    run.turns += rounds;
    if (win) { run.cleared += 1; run.stage += 1; if (run.cleared >= STAGES) run.status = 'finished'; }
    else { run.defeats += 1; if (run.defeats >= GUEST_MAX_DEFEATS) run.status = 'out'; }
    writeJSON(GUEST_KEY, st);
    if (this._week) this._week.me = this._guestMe(this._week.week);
    return { ok: true, run: { ...run } };
  }
}

/** 'YYYY-Www' (semana ISO) de una fecha UTC a medianoche. */
export function isoWeekId(date) {
  const d = new Date(date.getTime());
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const koliseoService = new KoliseoService();
if (typeof window !== 'undefined') window.lunakaiKoliseo = koliseoService;
