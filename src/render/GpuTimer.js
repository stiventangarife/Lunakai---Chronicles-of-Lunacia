// GpuTimer.js — Tiempo de GPU del dibujo de cada fotograma (Hito 143).
//
// Con EXT_disjoint_timer_query_webgl2 (Chrome/Edge; Firefox y Safari no la tienen) se abre una consulta de tiempo justo
// antes de dibujar el fotograma y se cierra después (main.js, alrededor de overworldManager.render / sceneManager.render).
// El resultado llega uno o dos fotogramas más tarde: se recoge sin bloquear al empezar el siguiente.
//
// · Solo mide mientras alguien escucha (onSample): la escala de resolución automática y las grabaciones de lkDebug.perf.
// · Si ese fotograma no dibujó nada (p. ej. un panel a pantalla completa: el mundo se dibuja 1 de cada 4), se descarta.
// · Mide desde el primer comando de dibujo hasta el último: si la CPU tarda en enviarlos, el tiempo incluye esa espera.
//   Por eso quien decide algo lo compara con el tiempo de CPU del dibujo (ver ResolutionScale).

class GpuTimerImpl {
  constructor() {
    this.renderer = null;
    this.gl = null;
    this.ext = null;
    this.listeners = new Set();
    this.pending = [];
    this.cur = null;
    this.frame0 = 0;
  }

  attach(renderer) {
    if (!renderer || this.renderer === renderer) return;
    this.renderer = renderer;
    try {
      this.gl = renderer.getContext();
      this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    } catch (_) { this.ext = null; }
  }

  get available() { return !!this.ext; }

  /** fn(ms) por cada fotograma medido. Devuelve la función para dejar de escuchar. */
  onSample(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  begin() {
    if (this.cur) this.end(); // el dibujo anterior falló antes de cerrar su consulta
    if (!this.ext || this.listeners.size === 0) return;
    const gl = this.gl;
    try {
      this._poll();
      this.cur = gl.createQuery();
      gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.cur);
      this.frame0 = this.renderer.info.render.frame;
    } catch (_) { this.cur = null; }
  }

  end() {
    if (!this.cur) return;
    const gl = this.gl;
    try {
      gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.pending.push({ q: this.cur, drew: this.renderer.info.render.frame !== this.frame0 });
    } catch (_) { /* contexto perdido */ }
    this.cur = null;
    if (this.pending.length > 12) { const old = this.pending.shift(); try { gl.deleteQuery(old.q); } catch (_) { /* nada */ } }
  }

  _poll() {
    const gl = this.gl, ext = this.ext;
    let disjoint = false;
    try { disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT); } catch (_) { /* nada */ }
    for (let i = 0; i < this.pending.length;) {
      const p = this.pending[i];
      let ready = false;
      try { ready = gl.getQueryParameter(p.q, gl.QUERY_RESULT_AVAILABLE); } catch (_) { ready = true; p.drew = false; }
      if (!ready) { i++; continue; }
      if (p.drew && !disjoint) {
        let ms = NaN;
        try { ms = gl.getQueryParameter(p.q, gl.QUERY_RESULT) / 1e6; } catch (_) { /* nada */ }
        if (Number.isFinite(ms)) this.listeners.forEach((fn) => { try { fn(ms); } catch (_) { /* nada */ } });
      }
      try { gl.deleteQuery(p.q); } catch (_) { /* nada */ }
      this.pending.splice(i, 1);
    }
  }
}

export const gpuTimer = new GpuTimerImpl();
