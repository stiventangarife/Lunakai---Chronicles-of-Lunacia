// TestArena.js — Arena de pruebas de habilidades: un muñeco con 25.000 de vida que no ataca ni se mueve.
//
// Consola (F12):
//   lkDebug.arena()                         abre la arena (Sapidae + Shinji/Early Bird/Big Yak (ranura principal), Bing y Pomodoro)
//   lkDebug.probar('part_bird_mouth_little_owl', 3)   lanza la carta a 3 casillas del muñeco (sin número: su distancia mínima)
//   lkDebug.probarLista(['id1', 'id2'], 1)  lanza varias seguidas, con pausa entre ellas
//   lkDebug.pruebas()                       tabla con todas las cartas de la arena y su comando
//
// probar() hace todo lo necesario: abre la arena si no está abierta, busca la unidad que tiene la carta (o la lanza el Axie
// principal), le da PA de sobra, cura al muñeco, lo coloca a la distancia pedida en una dirección libre y con visión,
// centra la cámara y lanza la carta por el camino normal del combate (daño, estados, VFX).

export const TEST_DUMMY_ID = 'test_dummy';

export const TEST_ARENA_CONFIG = {
  id: 'test_arena',
  title: 'Arena de pruebas',
  subtitle: 'Muñeco de 25.000 de vida',
  badgeText: 'Pruebas',
  biome: 'lunacia_plains',
  biomeName: 'Arena de pruebas',
  biomeIcon: '🎯',
  heroIds: ['kotaro', 'bing', 'pomodoro'],
  sapidaePosition: { x: 1, z: 2 },
  heroPositions: [
    { id: 'kotaro', x: 2, z: 5 },
    { id: 'bing', x: 1, z: 7 },
    { id: 'pomodoro', x: 0, z: 4 },
  ],
  enemies: [
    {
      id: TEST_DUMMY_ID,
      name: 'Muñeco de pruebas',
      type: 'slime',
      x: 5,
      z: 5,
      maxHP: 25000,
      maxPA: 0,
      maxPM: 0,
      initiative: 1,
      scale: 1.3,
      spellIds: [],
    },
  ],
  obstacles: [],
  rewardRecruits: [],
  rewardItems: [],
  rewardExp: 0,
  isTutorial: false,
  isTestArena: true,
};

const DIRS = [[1, 0], [0, 1], [0, -1], [-1, 0]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function installTestArena(game) {
  if (typeof window === 'undefined') return;
  const d = (window.lkDebug ||= {});
  const sm = () => game.spellManager;
  const grid = () => game.gridManager;
  const units = () => (game.units || []).filter((u) => !u.isDead);
  const dummy = () => (game.units || []).find((u) => u.id === TEST_DUMMY_ID);
  const free = (x, z, except = null) => {
    const t = grid().getTile(x, z);
    return t && t.walkable !== false && !t.obstacle && (!t.unit || t.unit === except || t.unit.isDead);
  };

  async function arena() {
    if (dummy() && game.gameState === 'BATTLE') return true;
    await game._startBattle({ ...TEST_ARENA_CONFIG, enemies: TEST_ARENA_CONFIG.enemies.map((e) => ({ ...e })) });
    for (let i = 0; i < 80 && !(dummy() && game.turnManager?.getActiveUnit()); i++) await sleep(150);
    // el muñeco nunca termina el combate: si algo lo baja mucho, se vuelve a llenar
    const dm = dummy();
    if (dm) dm._testDummy = true;
    console.log('%c[pruebas] Arena lista. Usa lkDebug.probar(\'id_de_carta\', distancia)', 'color:#7ad')
    return Boolean(dm);
  }

  function resetDummy() {
    const dm = dummy();
    if (!dm) return;
    if (dm.isDead) { dm.isDead = false; dm.group && (dm.group.visible = true); }
    dm.currentHP = dm.maxHP; dm.shield = 0;
    for (const st of [...(dm.statuses || [])]) sm().statuses?.remove(dm, st.id, 'test');
    dm.updateHUD?.();
  }

  /** Coloca una unidad a `dist` casillas del lanzador, en línea recta, en una dirección libre. */
  async function placeAt(unit, caster, dist, spell) {
    const valid = (c) => sm().getValidTargetCells(caster, spell).some((v) => v.x === c.x && v.z === c.z);
    for (const [dx, dz] of DIRS) {
      const c = { x: caster.gridX + dx * dist, z: caster.gridZ + dz * dist };
      if (!grid().isValidCoord?.(c.x, c.z) && !grid().getTile(c.x, c.z)) continue;
      if (!free(c.x, c.z, unit)) continue;
      if (unit.gridX !== c.x || unit.gridZ !== c.z) {
        const moved = await sm()._teleport(unit, c);
        if (!moved) continue;
      }
      if (valid(c)) return c;
    }
    return null;
  }

  async function probar(cardId, dist = null) {
    await arena();
    const s = sm().getSpell(cardId);
    if (!s) throw new Error(`[pruebas] No existe la carta ${cardId}`);
    const team = units().filter((u) => u.team === 'player');
    // quién la lanza: su dueño; si nadie la tiene, el Sapidae para sus habilidades de clase y el Axie principal para las cartas
    const sapidaeSpell = /^(craft|shepard|lunalogist|stargazer)_/.test(cardId);
    const caster = team.find((u) => (u.spellIds || []).includes(cardId))
      || (sapidaeSpell && team.find((u) => u.id === 'sapidae_hero'))
      || team.find((u) => u.id === 'kotaro') || team[0];
    caster.currentPA = 99; caster.currentPM = Math.max(caster.currentPM || 0, 3); caster._castsThisTurn = {}; caster._castsOnTarget = {}; caster._unlockAll = true; caster._spellReady = { [cardId]: 0 }; // Hito 98: en la arena todo desbloqueado · Hito 97: en la arena la carta siempre está lista (sin recarga ni espera inicial)
    game.activeUnit = caster;
    resetDummy();
    const dm = dummy();
    const minR = Math.max(0, s.minRange ?? 1), maxR = Math.max(minR, s.maxRange ?? 1);
    let cell = null;
    if (s.targetType === 'self' || maxR === 0) {
      cell = { x: caster.gridX, z: caster.gridZ };
    } else if (s.targetType === 'ally') {
      // el Sapidae apunta a su Axie compañero (varias habilidades solo valen sobre él)
      const ally = (caster.id === 'sapidae_hero' && team.find((u) => u.id === 'kotaro')) || team.find((u) => u !== caster) || caster;
      cell = ally === caster ? { x: caster.gridX, z: caster.gridZ } : await placeAt(ally, caster, Math.max(1, Math.min(maxR, dist ?? Math.max(1, minR))), s);
    } else {
      const want = Math.max(Math.max(1, minR), Math.min(maxR, dist ?? Math.max(1, minR)));
      if (s.targetType === 'empty') {
        // casilla vacía a la distancia pedida; el muñeco se queda al lado para ver el efecto
        for (const [dx, dz] of DIRS) {
          const c = { x: caster.gridX + dx * want, z: caster.gridZ + dz * want };
          if (free(c.x, c.z) && sm().getValidTargetCells(caster, s).some((v) => v.x === c.x && v.z === c.z)) { cell = c; break; }
        }
      } else {
        cell = await placeAt(dm, caster, want, s);
      }
      if (dist != null && dist !== want) console.warn(`[pruebas] ${s.name}: alcance ${minR}–${maxR}, se usa ${want} en lugar de ${dist}`);
    }
    if (!cell) { console.warn(`[pruebas] ${s.name}: no encontré casilla válida (alcance ${minR}–${maxR})`); return false; }
    const tgt = grid().getTile(cell.x, cell.z)?.unit;
    const mid = caster.group.position.clone().add((tgt || caster).group.position).multiplyScalar(0.5);
    game.sceneManager.focusOn?.(mid);
    await sleep(500);
    // el efecto de la carta se carga antes de lanzarla (si no, la primera vez saldría con los VFX antiguos)
    try { await game.vfxBridge?.prepare([{ spellIds: [cardId] }]); } catch { /* sin VFX nuevos: se usan los de siempre */ }
    const before = dm ? dm.currentHP : 0;
    const ok = await sm().castSpell(caster, s, cell);
    await sleep(200);
    const dmg = dm ? before - dm.currentHP : 0;
    console.log(`%c[pruebas] ${s.name} (${cardId}) · ${caster.name} → ${tgt ? tgt.name : 'casilla'} a ${Math.abs(cell.x - caster.gridX) + Math.abs(cell.z - caster.gridZ)} · ${ok ? 'lanzada' : 'NO se lanzó'}${dmg ? ` · ${dmg} de daño` : ''}`, 'color:#7ad');
    if (dm && dm.currentHP < dm.maxHP * 0.3) resetDummy();
    return ok;
  }

  async function probarLista(ids, dist = null, pausa = 2500) {
    for (const id of ids) { try { await probar(id, dist); } catch (e) { console.warn(e.message); } await sleep(pausa); }
    return ids.length;
  }

  function pruebas() {
    const rows = [];
    for (const u of units().filter((x) => x.team === 'player')) {
      for (const id of u.spellIds || []) {
        const s = sm().getSpell(id); if (!s) continue;
        rows.push({ unidad: u.name, carta: s.name, alcance: `${s.minRange ?? 0}-${s.maxRange ?? 0}`, objetivo: s.targetType, comando: `lkDebug.probar('${id}'${s.targetType === 'enemy' || s.targetType === 'any' ? `, ${Math.max(1, s.minRange ?? 1)}` : ''})` });
      }
    }
    console.table(rows);
    return rows;
  }

  Object.assign(d, { arena, probar, probarLista, pruebas, muñeco: resetDummy });
}
