// two-players.cjs — Arena PvP (fase P2): dos navegadores (Playwright) juegan contra tools/pvp/local/fake-supabase.cjs.
// Uso: servir la raíz del juego (node server.js 8082) y lanzar fake-supabase; luego
//   PORT=8082 node tools/pvp/local/two-players.cjs [all|full|reload|idle|cheat|presence]
// Jugadores de prueba: 00000000-0000-0000-0000-0000000001NN con partida guardada (ver la sección 13 del plan).
const PORT = process.env.PORT || 8082;
const { chromium } = require('playwright');
const U = (i) => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, '0')}`;
const url = (i, mode = 'play', pick = 1) => `http://localhost:${PORT}/tools/pvp/local/arena-test.html?u=${U(i)}&mode=${mode}&pick=${pick}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scen = process.argv[2] || 'all';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const page = async (u) => { const ctx = await b.newContext(); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(String(e))); await p.goto(u); await p.waitForFunction(() => window.ready, null, { timeout: 20000 }); return p; };
  const S = (p) => p.evaluate(() => ({ done: window.S.done, final: window.S.final, hash: window.S.hash, result: window.S.result, ev: window.S.events.map((e) => e.type), opp: window.S.events.filter((e) => e.type === 'opponent').map((e) => e.online), seq: window.S.session?.seq, queue: window.S.queue, cheated: window.S.cheated, resync: window.S.events.filter((e) => e.type === 'resync').map((e) => e.reason) }));
  const until = async (p, fn, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await S(p); if (fn(s)) return s; await sleep(300); } return S(p); };
  const count = (ev, t) => ev.filter((x) => x === t).length;

  if (scen === 'all' || scen === 'full') {
    console.log('\n1) Partida completa, los dos conectados');
    const a = await page(url(1, 'play', 11)), c = await page(url(2, 'play', 22));
    const sa = await until(a, (s) => s.done, 180000), sc = await until(c, (s) => s.done, 30000);
    console.log(`  A: ${sa.final?.status} · gana ${sa.final?.winner || 'empate'} (${sa.final?.reason}) · puntos ${JSON.stringify(sa.final?.deltas)} · SLP ${JSON.stringify(sa.final?.slp)} · órdenes ${sa.seq}`);
    console.log(`  misma huella final en los dos: ${sa.hash === sc.hash} · aplicadas A ${count(sa.ev, 'applied')} / B ${count(sc.ev, 'applied')} · resincronizaciones ${sa.resync.length + sc.resync.length} · cola de B: ${sc.queue.join(',') || '(emparejado al primer latido)'}`);
    console.log(`  presencia vista por A: ${sa.opp.join(' → ')} · errores ${[...a.errs, ...c.errs].length}`);
    await a.context().close(); await c.context().close();
  }
  if (scen === 'all' || scen === 'reload') {
    console.log('\n2) Recarga a mitad de partida');
    const a = await page(url(3, 'play', 33)); let c = await page(url(4, 'play', 44));
    await until(a, (s) => (s.seq || 0) > 40, 60000);
    const before = (await S(c)).seq;
    await c.reload(); await c.waitForFunction(() => window.ready && window.S.started, null, { timeout: 20000 });
    const after = await S(c);
    console.log(`  B tenía ${before} órdenes; al recargar se pone al día con ${after.seq} sin volver a mandarlas`);
    const sa = await until(a, (s) => s.done, 180000), sc = await until(c, (s) => s.done, 30000);
    console.log(`  final: ${sa.final?.status} / ${sc.final?.status} · misma huella ${sa.hash === sc.hash} · presencia vista por A: ${sa.opp.join(' → ')}`);
    await a.context().close(); await c.context().close();
  }
  if (scen === 'all' || scen === 'idle') {
    console.log('\n3) El rival no juega (turnos de 4 s + 1 s en la prueba)');
    const a = await page(url(5, 'play', 55)), c = await page(url(6, 'idle', 66));
    const sa = await until(a, (s) => s.done, 90000);
    console.log(`  A: ${sa.final?.status} · motivo ${sa.final?.reason} · gana A=${sa.final?.winner === (await a.evaluate(() => window.S.session.side))} · fines forzados aplicados ${sa.ev.filter((x) => x === 'applied').length}`);
    await a.context().close(); await c.context().close();
  }
  if (scen === 'all' || scen === 'cheat') {
    console.log('\n4) El rival manda una orden imposible');
    const a = await page(url(7, 'play', 77)), c = await page(url(8, 'cheat', 88));
    const sa = await until(a, (s) => s.done, 60000);
    console.log(`  A: ${sa.ev.includes('disputed') ? 'disputa abierta' : 'sin disputa'} · estado ${sa.final?.status || '(sin datos)'} · tramposo envió: ${(await S(c)).cheated}`);
    await a.context().close(); await c.context().close();
  }
  if (scen === 'all' || scen === 'presence') {
    console.log('\n5) Presencia: el rival cierra el juego');
    const a = await page(url(9, 'idle', 1)), c = await page(url(10, 'idle', 2));
    await until(a, (s) => s.opp.includes(true), 20000);
    await c.context().close();
    const sa = await until(a, (s) => s.opp.at(-1) === false, 20000);
    console.log(`  A ve al rival: ${sa.opp.join(' → ')}`);
    await a.context().close();
  }
  await b.close();
})();
