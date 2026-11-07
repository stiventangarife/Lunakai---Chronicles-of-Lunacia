// Medición de carga de Lunakai: de «Comenzar aventura» a la cinemática.
// Uso: en la pantalla de título, abre la consola (F12), pega todo esto, pulsa Enter
// y luego crea un personaje nuevo y pulsa «Comenzar aventura». Cuando empiece la
// cinemática, el informe sale en la consola y se copia solo al portapapeles.
(() => {
  performance.setResourceTimingBufferSize(20000);
  performance.clearResourceTimings();
  const M = { marks: [], longs: [], t0: 0 };
  window.__LKM = M;
  const keep = /DIAG|Precalent|diferid|Cinem|Initialized|error|failed/i;
  ['log', 'info', 'warn', 'error'].forEach((lvl) => {
    const orig = console[lvl].bind(console);
    console[lvl] = (...a) => {
      try {
        const s = a.filter((x) => typeof x === 'string').join(' ');
        if (M.t0 && keep.test(s)) M.marks.push(`${Math.round(performance.now() - M.t0)} ms · ${s.slice(0, 140)}`);
      } catch (e) { /* nada */ }
      orig(...a);
    };
  });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => M.t0 && M.longs.push([Math.round(e.startTime - M.t0), Math.round(e.duration)])))
    .observe({ type: 'longtask' });
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!M.t0 && b && /Comenzar aventura|Start adventure/i.test(b.textContent)) {
      M.t0 = performance.now();
      performance.clearResourceTimings();
      console.log('[medición] empieza');
    }
  }, true);
  const timer = setInterval(() => {
    if (!M.t0 || !window.lunakaiCinematic?.running) return;
    clearInterval(timer);
    const t = Math.round(performance.now() - M.t0);
    const res = performance.getEntriesByType('resource');
    const short = (u) => u.replace(location.origin + '/', '').replace(/\?v=[^&]*/, '');
    const groups = {};
    res.forEach((r) => { (groups[short(r.name)] ||= []).push(r); });
    const nav = navigator.connection || {};
    const gl = document.createElement('canvas').getContext('webgl2');
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const report = {
      sitio: location.host,
      clicACinematica_ms: t,
      descargadoMB: +(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1048576).toFixed(1),
      tamanoArchivosMB: +(res.reduce((a, r) => a + (r.encodedBodySize || 0), 0) / 1048576).toFixed(1),
      peticiones: res.length,
      desdeCache: res.filter((r) => r.transferSize === 0 && r.encodedBodySize > 0).length,
      repetidas: Object.entries(groups).filter(([, v]) => v.length > 1).map(([k, v]) => `${k} ×${v.length}`),
      errores: res.filter((r) => r.responseStatus >= 400).map((r) => `${short(r.name)} → ${r.responseStatus}`),
      masLentas: [...res].sort((a, b) => (b.responseEnd - b.startTime) - (a.responseEnd - a.startTime)).slice(0, 10)
        .map((r) => `${short(r.name)} · ${Math.round(r.responseEnd - r.startTime)} ms · ${Math.round(r.encodedBodySize / 1024)} KB`),
      bloqueosHiloPrincipal_ms: M.longs.reduce((a, [, d]) => a + d, 0),
      bloqueosMayores: [...M.longs].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, d]) => `${d} ms en t=${s}`),
      pasos: M.marks,
      equipo: {
        gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?',
        compilacionParalela: Boolean(gl && gl.getExtension('KHR_parallel_shader_compile')),
        red: nav.effectiveType || '?', bajadaMbps: nav.downlink || '?',
        pantalla: `${innerWidth}x${innerHeight} @${devicePixelRatio}`,
      },
    };
    console.log('[medición] INFORME', report);
    try { copy(JSON.stringify(report, null, 2)); console.log('[medición] Copiado al portapapeles: pégalo en el chat'); } catch (e) { /* copy() solo existe en la consola */ }
  }, 100);
  console.log('[medición] Lista. Crea el personaje y pulsa «Comenzar aventura».');
})();
