// PerfProbe.js — Perfilador de rendimiento en consola (F12): lkDebug.perf
//
// No cambia nada del juego mientras está apagado. Al grabar:
//   - mide el tiempo entre fotogramas (lo que nota el jugador) y el tiempo de CPU del bucle;
//   - cuenta draw calls, triángulos, programas (shaders), geometrías y texturas por fotograma;
//   - detecta TIRONES y anota su causa probable: shaders compilados en ese fotograma,
//     texturas o geometrías subidas a la GPU, cambios grandes en el DOM, tareas largas y marcas.
//
// Uso:
//   lkDebug.perf.start()            empieza a grabar (se para solo a los 60 s si no lo paras)
//   lkDebug.perf.mark('abrir forja') añade una marca manual
//   lkDebug.perf.stop()             para y muestra el informe (también lo devuelve)
//   lkDebug.perf.hud(true|false)    contador en pantalla (FPS, ms, draw calls, triángulos)
//   lkDebug.perf.scene()            desglose de la escena actual por grupo (visible y oculto)
//   lkDebug.perf.export()           descarga el último informe en JSON

const now = () => performance.now();

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[i];
}
const r1 = (v) => Math.round(v * 10) / 10;

function triCount(geo) {
  if (!geo) return 0;
  const idx = geo.index;
  if (idx) return idx.count / 3;
  const pos = geo.attributes && geo.attributes.position;
  return pos ? pos.count / 3 : 0;
}

export function installPerfProbe(game) {
  if (typeof window === 'undefined' || !game) return null;
  const renderer = game.sceneManager && game.sceneManager.renderer;
  if (!renderer) return null;
  const info = renderer.info;

  const S = {
    rec: false,
    t0: 0,
    lastFrameAt: 0,
    frames: [],      // { dt, cpu, calls, tris, state }
    hitches: [],     // tirones con causa
    marks: [],       // { t, label }
    longTasks: [],   // { t, dur }
    domMutations: 0, // mutaciones del DOM desde el último fotograma
    peak: { programs: 0, geometries: 0, textures: 0, calls: 0, tris: 0 },
    start: { programs: 0, geometries: 0, textures: 0 },
    autoStopTimer: null,
    lastReport: null,
    lastState: null,
    hudEl: null,
    hudAcc: { n: 0, dt: 0, cpu: 0, calls: 0, tris: 0, worst: 0, t: 0 },
  };

  let mo = null;
  let po = null;
  const origAnimate = game._animate;
  let prevAutoReset = info.autoReset;
  let wrapped = false;

  const programsCount = () => (info.programs ? info.programs.length : 0);
  const programNames = () => (info.programs || []).map((p) => p.name || p.cacheKey?.slice(0, 40) || '?');

  function frameWrapper() {
    const t = now();
    const dt = S.lastFrameAt ? t - S.lastFrameAt : 16.7;
    S.lastFrameAt = t;

    const progBefore = programsCount();
    const geoBefore = info.memory.geometries;
    const texBefore = info.memory.textures;
    const dom = S.domMutations;
    S.domMutations = 0;

    if (!info.autoReset) info.reset();
    origAnimate.call(game);
    const cpu = now() - t;

    const calls = info.render.calls;
    const tris = info.render.triangles;
    const state = game.gameState;

    if (S.rec) {
      S.frames.push({ dt, cpu, calls, tris, state });
      const newProgs = programsCount() - progBefore;
      const newGeo = info.memory.geometries - geoBefore;
      const newTex = info.memory.textures - texBefore;
      S.peak.programs = Math.max(S.peak.programs, programsCount());
      S.peak.geometries = Math.max(S.peak.geometries, info.memory.geometries);
      S.peak.textures = Math.max(S.peak.textures, info.memory.textures);
      S.peak.calls = Math.max(S.peak.calls, calls);
      S.peak.tris = Math.max(S.peak.tris, tris);

      if (state !== S.lastState) {
        S.marks.push({ t: t - S.t0, label: `estado → ${state}` });
        S.lastState = state;
      }

      // Lo que ha pasado en ESTE fotograma (sirve para explicar el hueco que verá el siguiente)
      const causes = [];
      if (newProgs > 0) {
        // three.js añade los programas nuevos al final de info.programs
        const added = programNames().slice(-newProgs);
        causes.push(`${newProgs} shader(s) compilados${added.length ? ` [${[...new Set(added)].slice(0, 6).join(', ')}]` : ''}`);
      }
      if (newTex > 0) causes.push(`${newTex} textura(s) subidas`);
      if (newGeo > 20) causes.push(`${newGeo} geometrías nuevas`);
      if (dom > 200) causes.push(`${dom} cambios en el DOM`);
      const cur = { cpu, causes };

      // Tirón: el hueco desde el fotograma anterior (dt) es largo. La causa suele estar en el
      // trabajo del fotograma anterior (S.prev) o en algo que pasó entre ambos (tareas largas, GC).
      if (dt > 50 && S.prev) {
        const c = S.prev.causes.slice();
        const lt = S.longTasks.filter((x) => x.t > t - S.t0 - dt - 5);
        if (lt.length) c.push(`tarea larga ${Math.round(Math.max(...lt.map((x) => x.dur)))} ms`);
        const mk = S.marks.filter((m) => m.t > t - S.t0 - 1000).map((m) => m.label);
        if (!c.length) c.push(S.prev.cpu > 0.6 * dt ? 'CPU del bucle (update/render)' : 'fuera del bucle: GPU, recolector de basura (GC) o navegador');
        if (mk.length) c.push(`cerca de: ${[...new Set(mk)].join(' | ')}`);
        S.hitches.push({ t: r1((t - S.t0) / 1000), frameMs: Math.round(dt), cpuPrevMs: Math.round(S.prev.cpu), state, causas: c.join(' · ') });
      }
      S.prev = cur;
    }

    if (S.hudEl) updateHud(dt, cpu, calls, tris);
  }

  function wrap() {
    if (wrapped) return;
    game._animate = frameWrapper;
    wrapped = true;
  }

  function updateHud(dt, cpu, calls, tris) {
    const a = S.hudAcc;
    a.n++; a.dt += dt; a.cpu += cpu; a.calls += calls; a.tris += tris; a.worst = Math.max(a.worst, dt);
    const t = now();
    if (t - a.t < 500) return;
    const fps = a.dt > 0 ? (1000 * a.n) / a.dt : 0;
    S.hudEl.textContent =
      `${Math.round(fps)} FPS  ${r1(a.dt / a.n)} ms (peor ${Math.round(a.worst)})  CPU ${r1(a.cpu / a.n)} ms\n` +
      `draw ${Math.round(a.calls / a.n)}  tris ${(a.tris / a.n / 1000).toFixed(0)}k  prog ${programsCount()}  ` +
      `geo ${info.memory.geometries}  tex ${info.memory.textures}` +
      (performance.memory ? `  heap ${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : '');
    S.hudAcc = { n: 0, dt: 0, cpu: 0, calls: 0, tris: 0, worst: 0, t };
  }

  function buildReport() {
    const fr = S.frames;
    const dts = fr.map((f) => f.dt).sort((a, b) => a - b);
    const cpus = fr.map((f) => f.cpu).sort((a, b) => a - b);
    const byState = {};
    for (const f of fr) {
      const s = (byState[f.state] ||= { frames: 0, dt: 0, calls: 0, tris: 0, worst: 0 });
      s.frames++; s.dt += f.dt; s.calls += f.calls; s.tris += f.tris; s.worst = Math.max(s.worst, f.dt);
    }
    const states = Object.fromEntries(Object.entries(byState).map(([k, s]) => [k, {
      fps: r1((1000 * s.frames) / s.dt), ms: r1(s.dt / s.frames), peorMs: Math.round(s.worst),
      drawCalls: Math.round(s.calls / s.frames), triangulos: Math.round(s.tris / s.frames),
    }]));
    const dur = fr.reduce((a, f) => a + f.dt, 0);
    return {
      duracionS: r1(dur / 1000),
      fotogramas: fr.length,
      fpsMedio: r1(fr.length / (dur / 1000 || 1)),
      frameMs: { p50: r1(pct(dts, 50)), p95: r1(pct(dts, 95)), p99: r1(pct(dts, 99)), max: Math.round(dts[dts.length - 1] || 0) },
      cpuMs: { p50: r1(pct(cpus, 50)), p95: r1(pct(cpus, 95)), max: Math.round(cpus[cpus.length - 1] || 0) },
      porEstado: states,
      gpu: {
        programas: { inicio: S.start.programs, fin: programsCount(), pico: S.peak.programs },
        geometrias: { inicio: S.start.geometries, fin: info.memory.geometries, pico: S.peak.geometries },
        texturas: { inicio: S.start.textures, fin: info.memory.textures, pico: S.peak.textures },
        drawCallsPico: S.peak.calls, triangulosPico: S.peak.tris,
      },
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      tirones: S.hitches.slice(),
      marcas: S.marks.map((m) => ({ s: r1(m.t / 1000), marca: m.label })),
      renderer: {
        pixelRatio: renderer.getPixelRatio(),
        tamaño: `${renderer.domElement.width}×${renderer.domElement.height}`,
        sombras: renderer.shadowMap.enabled ? renderer.shadowMap.type : 'off',
      },
    };
  }

  function printReport(rep) {
    console.groupCollapsed(`%c[perf] ${rep.fpsMedio} FPS · p95 ${rep.frameMs.p95} ms · ${rep.tirones.length} tirones · ${rep.duracionS} s`, 'color:#7fd;font-weight:bold');
    console.log('Fotograma (ms):', rep.frameMs, ' CPU del bucle (ms):', rep.cpuMs);
    console.table(rep.porEstado);
    console.log('GPU:', rep.gpu, ' heap:', rep.heapMB, 'MB', ' renderer:', rep.renderer);
    if (rep.tirones.length) console.table(rep.tirones);
    if (rep.marcas.length) console.table(rep.marcas);
    console.groupEnd();
  }

  const api = {
    start(maxSeconds = 60) {
      wrap();
      S.rec = true;
      S.t0 = now();
      S.lastFrameAt = 0;
      S.frames = []; S.hitches = []; S.marks = []; S.longTasks = [];
      S.lastState = null;
      S.prev = null;
      S.start = { programs: programsCount(), geometries: info.memory.geometries, textures: info.memory.textures };
      S.peak = { programs: S.start.programs, geometries: S.start.geometries, textures: S.start.textures, calls: 0, tris: 0 };
      prevAutoReset = info.autoReset;
      info.autoReset = false; // el composer hace varios render(); sumamos el fotograma entero
      try {
        mo = new MutationObserver((recs) => { S.domMutations += recs.length; });
        mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
      } catch (_) { mo = null; }
      try {
        po = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) S.longTasks.push({ t: e.startTime - S.t0, dur: e.duration });
        });
        po.observe({ type: 'longtask', buffered: false });
      } catch (_) { po = null; }
      clearTimeout(S.autoStopTimer);
      S.autoStopTimer = setTimeout(() => { if (S.rec) api.stop(); }, maxSeconds * 1000);
      console.log(`[perf] Grabando (máx. ${maxSeconds} s). Juega normalmente y escribe lkDebug.perf.stop() al terminar.`);
      return true;
    },
    stop() {
      if (!S.rec) { console.log('[perf] No estaba grabando.'); return S.lastReport; }
      S.rec = false;
      clearTimeout(S.autoStopTimer);
      if (mo) { mo.disconnect(); mo = null; }
      if (po) { po.disconnect(); po = null; }
      info.autoReset = S.hudEl ? false : prevAutoReset;
      const rep = buildReport();
      S.lastReport = rep;
      printReport(rep);
      return rep;
    },
    mark(label) {
      if (S.rec) S.marks.push({ t: now() - S.t0, label: String(label) });
    },
    hud(on = true) {
      if (on && !S.hudEl) {
        wrap();
        info.autoReset = false;
        const el = document.createElement('pre');
        el.id = 'lk-perf-hud';
        el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;margin:0;padding:6px 8px;' +
          'font:11px/1.35 ui-monospace,monospace;color:#bff;background:rgba(0,0,0,.6);border-radius:6px;pointer-events:none;white-space:pre';
        document.body.appendChild(el);
        S.hudEl = el;
        S.hudAcc.t = now();
      } else if (!on && S.hudEl) {
        S.hudEl.remove();
        S.hudEl = null;
        if (!S.rec) info.autoReset = prevAutoReset;
      }
      return !!S.hudEl;
    },
    scene(rootArg) {
      const root = rootArg || (game.gameState === 'BATTLE' ? game.sceneManager.scene : (game.overworldManager && game.overworldManager.scene));
      if (!root) return null;
      const rows = [];
      const totals = { mallas: 0, mallasOcultas: 0, trisVisibles: 0, trisOcultos: 0, luces: 0, lucesSombra: 0 };
      const materials = new Set();
      for (const child of root.children) {
        const row = { grupo: child.name || child.type, visible: child.visible, mallas: 0, ocultas: 0, instancias: 0, trisVisibles: 0, trisOcultos: 0 };
        child.traverse((o) => {
          if (o.isLight) { totals.luces++; if (o.castShadow) totals.lucesSombra++; }
          if (!o.isMesh && !o.isPoints && !o.isLine) return;
          let vis = true;
          for (let p = o; p; p = p.parent) if (!p.visible) { vis = false; break; }
          const inst = o.isInstancedMesh ? o.count : 1;
          const t = triCount(o.geometry) * inst;
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && materials.add(m));
          if (vis) { row.mallas++; row.trisVisibles += t; } else { row.ocultas++; row.trisOcultos += t; }
          if (o.isInstancedMesh) row.instancias += inst;
        });
        totals.mallas += row.mallas; totals.mallasOcultas += row.ocultas;
        totals.trisVisibles += row.trisVisibles; totals.trisOcultos += row.trisOcultos;
        if (row.mallas || row.ocultas) rows.push(row);
      }
      rows.sort((a, b) => (b.trisVisibles + b.trisOcultos) - (a.trisVisibles + a.trisOcultos));
      rows.forEach((r) => { r.trisVisibles = Math.round(r.trisVisibles); r.trisOcultos = Math.round(r.trisOcultos); });
      console.table(rows);
      const out = { ...totals, materiales: materials.size, programas: programsCount(), geometriasGPU: info.memory.geometries, texturasGPU: info.memory.textures };
      Object.keys(out).forEach((k) => { out[k] = Math.round(out[k]); });
      console.log('[perf] Escena:', out);
      return { grupos: rows, totales: out };
    },
    export() {
      const rep = S.lastReport || (S.rec ? buildReport() : null);
      if (!rep) { console.log('[perf] Aún no hay informe: usa start() y stop().'); return null; }
      const blob = new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lunakai-perf-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return rep;
    },
    help() {
      console.log([
        'lkDebug.perf — perfilador de rendimiento',
        '  start(seg=60)   graba (FPS, ms, draw calls, triángulos, shaders, tirones y su causa)',
        '  mark("texto")   marca un momento (p. ej. antes de abrir la Forja)',
        '  stop()          para y muestra el informe',
        '  hud(true|false) contador en pantalla',
        '  scene()         desglose de la escena por grupo: mallas visibles/ocultas y triángulos',
        '  export()        descarga el informe en JSON',
      ].join('\n'));
    },
  };

  const d = (window.lkDebug ||= {});
  d.perf = api;
  return api;
}
