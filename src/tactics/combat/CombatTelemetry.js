// CombatTelemetry.js — Registro de equilibrio: anota cada combate que juegas para la pasada de balance.
//
// Escucha el bus de eventos (no toca la lógica) y guarda un resumen por combate en el navegador
// (localStorage 'lunakai_balance_log', últimos 60 combates):
//   resultado, rondas, escuadrón y enemigos, y por carta: usos, daño, curación, escudo y estados aplicados.
//
// Consola (F12):
//   lkDebug.balance()         tabla de cartas de tus partidas (usos, daño medio por uso, por PA…)
//   lkDebug.balanceFights()   tabla de combates (resultado, rondas, vida restante)
//   lkDebug.balanceExport()   descarga el registro en JSON para enviarlo
//   lkDebug.balanceReset()    borra el registro

const KEY = 'lunakai_balance_log';
const MAX = 60;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch { /* sin almacenamiento: no pasa nada */ }
}

export class CombatTelemetry {
  constructor(game) {
    this.game = game;
    this.cur = null;
    this._offs = [];
  }

  install(events, turnManager) {
    const on = (evt, fn) => this._offs.push(events.on(evt, (p) => { try { fn(p || {}); } catch { /* nunca rompe el combate */ } }));

    on('spell:cast', ({ caster, spell }) => {
      const c = this._fight();
      if (!c || !caster || !spell) return;
      this._last = { caster, spell };
      const row = this._spell(caster, spell);
      row.casts++;
      row.pa += spell.paCost === 'X' ? 0 : (Number(spell.paCost) || 0);
    });
    on('unit:damaged', ({ unit, source, spell, actual = 0, shieldAbsorbed = 0, selfInflicted }) => {
      const c = this._fight();
      if (!c || !unit) return;
      const dealt = (actual || 0) + (shieldAbsorbed || 0);
      this._unit(unit).taken += dealt;
      if (source && spell && !selfInflicted && source.team !== unit.team) { this._spell(source, spell).damage += dealt; this._unit(source).dealt += dealt; }
      if (!spell && source === undefined) this._unit(unit).dot += dealt;
    });
    on('unit:healed', ({ unit, source, spell, amount = 0 }) => {
      if (this._fight() && source && spell) this._spell(source, spell).heal += amount;
    });
    on('unit:shielded', ({ unit, source, spell, amount = 0 }) => {
      if (this._fight() && source && spell) this._spell(source, spell).shield += amount;
    });
    on('status:applied', ({ status, source, spell }) => {
      // el evento no trae la carta: se atribuye a la última lanzada por ese mismo lanzador
      spell = spell || (this._last && this._last.caster === source ? this._last.spell : null);
      if (!this._fight() || !source || !spell) return;
      const row = this._spell(source, spell);
      row.statuses[status] = (row.statuses[status] || 0) + 1;
    });

    // Inicio y final del combate
    if (turnManager) {
      const origStart = turnManager.onCombatStart;
      turnManager.onCombatStart = (...a) => { this._begin(turnManager); return origStart?.apply(turnManager, a); };
      const origCheck = turnManager.checkCombatEnd.bind(turnManager);
      turnManager.checkCombatEnd = () => {
        const was = turnManager.isCombatOver;
        const r = origCheck();
        if (!was && turnManager.isCombatOver) this._end(turnManager);
        return r;
      };
    }
    return this;
  }

  _fight() { return this.cur; }

  _begin(tm) {
    const g = this.game;
    const units = tm.units || g.units || [];
    this.cur = {
      at: new Date().toISOString(),
      level: g.activeBattleConfig?.id ?? g.currentLevel ?? null,
      name: g.activeBattleConfig?.title || g.activeBattleConfig?.name || (g.currentLevel ? `Nivel ${g.currentLevel}` : 'Encuentro'),
      tutorial: Boolean(g.tutorialManager?.isActive),
      party: units.filter((u) => u.team === 'player').map((u) => ({ id: u.id, name: u.name, cls: u.axieClass || u.sapidaeClass || u.type, hp: u.maxHP, cards: [...(u.spellIds || [])] })),
      enemies: units.filter((u) => u.team === 'enemy').map((u) => ({ id: u.id, name: u.name, hp: u.maxHP })),
      spells: {},
      units: {},
    };
  }

  _end(tm) {
    const c = this.cur;
    if (!c) return;
    const units = tm.units || this.game.units || [];
    const players = units.filter((u) => u.team === 'player');
    c.result = units.some((u) => u.team === 'enemy' && !u.isDead) ? 'derrota' : 'victoria';
    c.rounds = tm.round || 0;
    c.hpLeftPct = Math.round(100 * players.reduce((s, u) => s + (u.isDead ? 0 : u.currentHP), 0) / Math.max(1, players.reduce((s, u) => s + u.maxHP, 0)));
    c.fallen = players.filter((u) => u.isDead).map((u) => u.id);
    for (const u of units) Object.assign(this._unit(u), { final: u.isDead ? 0 : u.currentHP, max: u.maxHP });
    const list = load();
    list.push(c);
    save(list);
    this.cur = null;
  }

  _spell(caster, spell) {
    const key = `${caster.team}|${spell.id}`;
    return (this.cur.spells[key] ||= { id: spell.id, name: spell.name || spell.id, team: caster.team, by: caster.id, casts: 0, pa: 0, damage: 0, heal: 0, shield: 0, statuses: {} });
  }

  _unit(u) {
    return (this.cur.units[u.id] ||= { id: u.id, team: u.team, dealt: 0, taken: 0, dot: 0 });
  }

  // ------------------------------------------------ informes

  static log() { return load(); }
  static reset() { save([]); return true; }

  /** Cartas del jugador agregadas sobre todos los combates registrados. */
  static cardTable({ team = 'player' } = {}) {
    const agg = {};
    for (const f of load()) {
      for (const s of Object.values(f.spells || {})) {
        if (s.team !== team) continue;
        const a = (agg[s.id] ||= { carta: s.name, usos: 0, pa: 0, daño: 0, cura: 0, escudo: 0, combates: 0 });
        a.usos += s.casts; a.pa += s.pa; a.daño += s.damage; a.cura += s.heal; a.escudo += s.shield; a.combates++;
      }
    }
    return Object.values(agg)
      .map((a) => ({ ...a, 'valor/PA': a.pa ? Math.round((a.daño + 0.9 * a.cura + 0.75 * a.escudo) / a.pa) : 0, 'daño/uso': a.usos ? Math.round(a.daño / a.usos) : 0 }))
      .sort((x, y) => y.usos - x.usos);
  }

  static fightTable() {
    return load().map((f) => ({ fecha: f.at?.slice(0, 16).replace('T', ' '), combate: f.name, resultado: f.result, rondas: f.rounds, 'vida %': f.hpLeftPct, caídos: (f.fallen || []).join(', '), enemigos: (f.enemies || []).length }));
  }

  /** Añade los comandos a window.lkDebug (consola F12). */
  static extendDebug() {
    if (typeof window === 'undefined') return;
    const d = (window.lkDebug ||= {});
    d.balance = (team = 'player') => { const t = CombatTelemetry.cardTable({ team }); console.table(t); return t; };
    d.balanceFights = () => { const t = CombatTelemetry.fightTable(); console.table(t); return t; };
    d.balanceExport = () => CombatTelemetry.exportFile();
    d.balanceReset = () => CombatTelemetry.reset();
  }

  static exportFile() {
    const blob = new Blob([JSON.stringify({ version: 1, exported: new Date().toISOString(), fights: load() }, null, 1)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `lunakai-equilibrio-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    return load().length;
  }
}
