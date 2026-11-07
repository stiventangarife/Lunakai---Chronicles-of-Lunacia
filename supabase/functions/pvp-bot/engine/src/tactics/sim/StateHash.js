// StateHash.js — Huella del estado del combate (Arena PvP, fase P0).
//
// Un resumen estable de todo lo que decide la partida: ronda, turno, cada unidad (vida, escudo, PA, PM, casilla,
// estados, recargas), zonas y obstáculos temporales del tablero y el estado del azar. Los dos jugadores la calculan
// tras cada turno y la mandan con su END_TURN: si no coinciden, la partida se ha desincronizado (disputa → árbitro).
//
// Arena PvP (P3): en una partida cada cliente se ve como 'player'; por eso cuenta el bando fijo (pvpSide) y no el equipo.
// Funciona igual con la unidad con modelo (Unit) y la lógica (LogicUnit): solo lee campos de reglas.
// Los números se redondean a 3 decimales para que una diferencia de coma flotante sin efecto en el juego no cuente.

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : v ?? null);
const idOf = (u) => (u && typeof u === 'object' ? (u.id ?? null) : u ?? null);

function statusView(st) {
  return [st.id, num(st.value), num(st.duration), num(st.delay || 0), idOf(st.source)];
}

function unitView(u) {
  const ready = u._spellReady ? Object.keys(u._spellReady).sort().map((k) => [k, num(u._spellReady[k])]) : [];
  return [
    u.id, u.pvpSide ?? u.team, u.isDead ? 1 : 0,
    num(u.currentHP), num(u.maxHP), num(u.shield), num(u.shieldExpiresRound ?? null),
    num(u.currentPA), num(u.currentPM), num(u.maxPA), num(u.maxPM),
    u.gridX, u.gridZ,
    (u.statuses || []).map(statusView).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    (u.buffs || []).map((b) => [b.type, num(b.value), num(b.duration)]),
    ready, num(u._turnNo || 0),
  ];
}

/** Estado canónico (array anidado de valores simples). */
export function stateView({ turnManager, spellManager, units }) {
  const tm = turnManager, sm = spellManager;
  const list = [...(units || tm?.units || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const zones = (sm?.field?.zones || []).map((z) => [z.kind, num(z.expiresAtRound), idOf(z.owner),
    (z.cells || []).map((c) => `${c.x},${c.z}`).sort().join(';')]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const obstacles = (sm?.field?.obstacles || []).map((o) => [o.type || o.kind || 'obstacle', o.x, o.z, num(o.expiresAtRound)])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return [
    num(tm?.round), idOf(tm?.getActiveUnit?.()), tm?.isCombatOver ? 1 : 0,
    list.map(unitView), zones, obstacles,
    typeof sm?.rng?.state === 'function' ? sm.rng.state() : null,
  ];
}

/** FNV-1a de 32 bits en hexadecimal (8 caracteres). */
export function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Huella corta del estado. */
export function stateHash(ctx) {
  return fnv1a(JSON.stringify(stateView(ctx)));
}
