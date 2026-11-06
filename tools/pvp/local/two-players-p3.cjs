// two-players-p3.cjs — Arena PvP (fase P3): dos navegadores juegan con el COMBATE DEL JUEGO (arena-battle.html) contra
// tools/pvp/local/fake-supabase.cjs. Comprueba que las dos perspectivas (A y B, cada una con sus unidades abajo) dan
// la misma partida, la recarga con puesta al día sin animaciones y la rendición.
// Uso: servir la raíz del juego (node server.js 8082), cargar tools/pvp/local/players-p3.sql y lanzar fake-supabase;
//   PORT=8082 node tools/pvp/local/two-players-p3.cjs [all|full|reload|resync|arbiter|surrender]
const PORT = process.env.PORT || 8082;
const { chromium } = require('playwright');
const U = (i) => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, '0')}`;
const url = (i, mode = 'play', pick = 1) => `http://localhost:${PORT}/tools/pvp/local/arena-battle.html?u=${U(i)}&mode=${mode}&pick=${pick}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scen = process.argv[2] || 'all';
let fails = 0;
const check = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = async (u) => {
    const ctx = await b.newContext(); const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', (e) => p.errs.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) p.errs.push(m.text().slice(0, 200)); });
    await p.goto(u); await p.waitForFunction(() => window.ready, null, { timeout: 30000 }); return p;
  };
  const S = (p) => p.evaluate(() => {
    const s = window.S, b = s.battle;
    return { done: s.done, final: s.final, hash: s.hash, result: s.result, ev: s.events.map((e) => e.type), opp: s.events.filter((e) => e.type === 'opponent').map((e) => e.online),
      seq: b?.session?.seq, applied: b?.applied, side: b?.side, started: s.started, surrendered: s.surrendered, botErr: s.events.filter((e) => e.type === 'botError').map((e) => e.error),
      resync: s.events.filter((e) => e.type === 'resync').map((e) => e.reason), endShown: Boolean(document.querySelector('.lk-pvpe.lk-is-open')), endTitle: document.querySelector('.lk-pvpe__title')?.textContent || null,
      flip: b?.game?.sceneManager?.flipSide, mine: b ? [...new Set(b.game.units.filter((u) => u.team === 'player').map((u) => u.pvpSide))] : [] };
  });
  const until = async (p, fn, ms = 240000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await S(p); if (fn(s)) return s; await sleep(400); } return S(p); };

  if (scen === 'all' || scen === 'full') {
    console.log('\n1) Partida completa con el combate del juego, cada uno visto desde su bando');
    const a = await page(url(21, 'play', 11)), c = await page(url(22, 'play', 22));
    const sa = await until(a, (s) => s.done), sc = await until(c, (s) => s.done, 30000);
    const [pA, pB] = sa.side === 'A' ? [sa, sc] : [sc, sa];
    check(sa.done && sc.done, `terminada: ${sa.final?.status} · gana ${sa.final?.winner || 'empate'} (${sa.final?.reason}) · ${sa.seq} órdenes · puntos ${JSON.stringify(sa.final?.deltas)} · SLP ${JSON.stringify(sa.final?.slp)}`);
    check(sa.hash === sc.hash, `misma huella final en los dos (${sa.hash})`);
    check(sa.final?.status === 'finished' && sc.final?.status === 'finished', 'el servidor la da por buena (sin disputa)');
    check(pA.mine.join() === 'A' && pB.mine.join() === 'B', `cada jugador ve sus unidades (y sus gólems) como propias: A → ${pA.mine} · B → ${pB.mine}`);
    check(pB.flip === true && pA.flip === false, 'el bando B mira desde el otro lado del tablero');
    check(sa.endShown && sc.endShown, `pantalla final en los dos: «${sa.endTitle}» / «${sc.endTitle}»`);
    check(!sa.resync.length && !sc.resync.length, `sin resincronizaciones (${[...sa.resync, ...sc.resync].join(',') || 'ninguna'})`);
    check(![...a.errs, ...c.errs].length, `sin errores de página ${JSON.stringify([...a.errs, ...c.errs].slice(0, 3))}`);
    await a.context().close(); await c.context().close();
  }
  if (scen === 'all' || scen === 'reload') {
    console.log('\n2) Recarga a mitad de partida: el combate del juego se pone al día sin animaciones');
    const a = await page(url(23, 'play', 33)); let c = await page(url(24, 'play', 44));
    await until(a, (s) => (s.seq || 0) > 50, 120000);
    const before = (await S(c)).seq;
    const t0 = Date.now();
    await c.reload(); await c.waitForFunction((n) => window.ready && window.S.started && window.S.battle?.session?.seq >= n, before, { timeout: 60000 });
    const after = await S(c);
    check(after.seq >= before, `B tenía ${before} órdenes; tras recargar se pone al día con ${after.seq} (${Date.now() - t0} ms, ${after.applied} aplicadas en el combate)`);
    const sa = await until(a, (s) => s.done), sc = await until(c, (s) => s.done, 30000);
    check(sa.final?.status === 'finished' && sa.hash === sc.hash, `final ${sa.final?.status} / ${sc.final?.status} · misma huella ${sa.hash === sc.hash}`);
    check(sa.opp.includes(false), `A vio la desconexión del rival: ${sa.opp.join(' → ')}`);
    check(![...a.errs, ...c.errs].length, `sin errores de página ${JSON.stringify([...a.errs, ...c.errs].slice(0, 3))}`);
    await a.context().close(); await c.context().close();
  }
  if (scen === 'all' || scen === 'resync') {
    console.log('\n4) Resincronización: un jugador rehace el combate desde cero a mitad de partida');
    const a = await page(url(27, 'play', 77)), c = await page(url(28, 'play', 88));
    await until(c, (s) => (s.seq || 0) > 30, 120000);
    await c.evaluate(() => { const s = window.S.battle.session; s._queue(() => s._resync('prueba')); });
    const mid = await until(c, (s) => s.resync.length > 0 && (s.applied || 0) > 30, 30000);
    check(mid.resync.includes('prueba'), `combate rehecho y puesto al día (${mid.applied} órdenes aplicadas de nuevo)`);
    const sa = await until(a, (s) => s.done), sc = await until(c, (s) => s.done, 30000);
    check(sa.final?.status === 'finished' && sa.hash === sc.hash, `final ${sa.final?.status} / ${sc.final?.status} · misma huella ${sa.hash === sc.hash}`);
    check(![...a.errs, ...c.errs].length, `sin errores de página ${JSON.stringify([...a.errs, ...c.errs].slice(0, 3))}`);
    await a.context().close(); await c.context().close();
  }
  if (scen === 'all' || scen === 'arbiter') {
    console.log('\n5) Trampa y árbitro (fase P4): orden imposible → disputa → árbitro → resultado en las dos pantallas');
    const a = await page(url(33, 'play', 99)), c = await page(url(34, 'cheat', 98));
    const sa = await until(a, (s) => s.ev.includes('disputed'), 120000);
    check(sa.ev.includes('disputed') && sa.endTitle, `el honrado abre la disputa y ve «${sa.endTitle}»`);
    const { execFileSync } = require('child_process');
    const out = execFileSync(process.execPath, ['--experimental-strip-types', 'tools/pvp/arbiter/run-once.mjs'], {
      env: { ...process.env, SUPABASE_URL: 'http://localhost:8200', SUPABASE_SERVICE_ROLE_KEY: process.env.SERVICE_KEY || 'service-test' }, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const r = JSON.parse(out.trim().split('\n').pop());
    check(r.ok && r.matches.some((m) => m.culprit), `árbitro: ${JSON.stringify(r.matches.map((m) => [m.result, m.winner, m.culprit, m.fault]))}`);
    const fa = await until(a, (s) => s.final?.status === 'finished', 30000), fc = await until(c, (s) => s.final?.status === 'finished', 30000);
    check(fa.final?.reason === 'arbiter' && fa.final?.winner === fa.side, `el honrado (${fa.side}) gana por decisión del árbitro y lo ve en la pantalla: «${fa.endTitle}»`);
    check(fc.final?.winner !== fc.side && fc.endShown, `el tramposo (${fc.side}) pierde: «${fc.endTitle}»`);
    await a.context().close(); await c.context().close();
  }
  if (scen === 'all' || scen === 'surrender') {
    console.log('\n3) Rendición');
    const a = await page(url(25, 'play', 55)), c = await page(url(26, 'surrender', 66));
    const sa = await until(a, (s) => s.done, 120000), sc = await until(c, (s) => s.done, 30000);
    const loser = sc.side;
    check(sa.final?.reason === 'surrender' && sa.final?.winner && sa.final.winner !== loser, `gana ${sa.final?.winner} por ${sa.final?.reason} (se rindió ${loser})`);
    check(sc.endShown && sc.endTitle && sa.endShown, `pantallas finales: «${sa.endTitle}» / «${sc.endTitle}»`);
    await a.context().close(); await c.context().close();
  }
  await b.close();
  console.log(fails ? `\n✗ ${fails} fallos` : '\n✓ todo correcto');
  process.exit(fails ? 1 : 0);
})();
