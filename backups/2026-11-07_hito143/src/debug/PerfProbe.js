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
//
// 29-oct: en Chrome/Edge (API «Long Animation Frames») cada fotograma largo dice QUÉ código lo ocupó: archivo,
// línea y función de los scripts que más tardaron, más el tiempo de estilos/maquetación y de dibujo. Va en la
// tabla «framesLargos» del informe y en la columna «codigo» de los tirones. Las marcas lk:* (telón, precalentado…)
// se ponen solas desde el juego con perfMark() y también salen en el panel Performance de DevTools.

import { GLTFLoader } from '../../vendor/GLTFLoader.js'; // Hito 113: para etiquetar las imágenes de cada GLB (misma instancia que usan ModelCache y el diorama)

const now = () => performance.now();

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[i];
}
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Marca un momento del juego: en el perfilador (si está grabando) y en el panel Performance de DevTools
 * (performance.mark). Seguro de llamar siempre: sin perfilador no hace nada más.
 */
export function perfMark(label) {
  try { performance.mark(`lk:${label}`); } catch (_) { /* opcional */ }
  try { if (typeof window !== 'undefined') window.lkDebug?.perf?.mark?.(label); } catch (_) { /* opcional */ }
}

/**
 * Hito 113 (memoria): ImageBitmap vivos. three.js decodifica cada imagen de un GLB a un ImageBitmap (RGBA, 4 bytes por píxel)
 * y el navegador la mantiene hasta que alguien llama a close() o pasa el recolector de basura; esa memoria NO sale en el heap
 * de JS (por eso el Administrador de tareas sube con el heap plano). Se envuelve createImageBitmap y ImageBitmap.close
 * al importar este módulo para contar todo desde el arranque. vivos = creados − cerrados − recolectados.
 */
const BM = { creados: 0, mbCreados: 0, cerrados: 0, mbCerrados: 0, recolectados: 0, mbRecolectados: 0 };
const bmRecs = new WeakMap();   // ImageBitmap → { mb, closed }
const bmLabeled = [];           // { ref: WeakRef(ImageBitmap), rec, name, id }: imágenes de GLB con el nombre del modelo que las cargó
let bmGltfSeq = 0;
export function bitmapStats() {
  const vivos = BM.creados - BM.cerrados - BM.recolectados;
  const mbVivos = BM.mbCreados - BM.mbCerrados - BM.mbRecolectados;
  const r = (v) => Math.round(v * 10) / 10;
  return { vivos, mbVivos: r(mbVivos), creados: BM.creados, mbCreados: r(BM.mbCreados), cerrados: BM.cerrados, mbCerrados: r(BM.mbCerrados),
    recolectados: BM.recolectados, mbRecolectados: r(BM.mbRecolectados) };
}
/** Imágenes vivas por modelo GLB: { modelo, copias (cargas distintas con imágenes vivas), imagenes, mb } + «sin etiqueta» (no vienen de un GLB). */
export function bitmapsPorModelo() {
  const r = (v) => Math.round(v * 10) / 10;
  const acc = new Map();
  let labeledN = 0, labeledMb = 0;
  for (let i = bmLabeled.length - 1; i >= 0; i--) {
    const e = bmLabeled[i];
    if (e.rec.closed || !e.ref.deref()) { bmLabeled.splice(i, 1); continue; } // ya no está viva: se quita del registro
    const a = acc.get(e.name) || { n: 0, mb: 0, ids: new Set() };
    a.n++; a.mb += e.rec.mb; a.ids.add(e.id); acc.set(e.name, a);
    labeledN++; labeledMb += e.rec.mb;
  }
  const rows = [...acc.entries()].map(([modelo, a]) => ({ modelo, copias: a.ids.size, imagenes: a.n, mb: r(a.mb) })).sort((x, y) => y.mb - x.mb);
  const st = bitmapStats();
  if (st.vivos - labeledN > 0) rows.push({ modelo: '(sin etiqueta: no vienen de un GLB)', copias: 0, imagenes: st.vivos - labeledN, mb: r(st.mbVivos - labeledMb) });
  return rows;
}
function labelGltfBitmaps(gltf, url) {
  const cache = gltf && gltf.parser && gltf.parser.sourceCache;
  if (!cache) return;
  const name = String(url || '?').split('?')[0].split('/').pop();
  const id = ++bmGltfSeq;
  Object.keys(cache).forEach((k) => Promise.resolve(cache[k]).then((t) => {
    const img = t && t.image;
    const rec = img && bmRecs.get(img);
    if (rec) bmLabeled.push({ ref: new WeakRef(img), rec, name, id });
  }).catch(() => { /* la carga falló */ }));
}
try {
  if (typeof window !== 'undefined' && !window.__lkBitmapPatched) {
    window.__lkBitmapPatched = true;
    const fin = typeof FinalizationRegistry !== 'undefined'
      ? new FinalizationRegistry((rec) => { if (!rec.closed) { rec.closed = true; BM.recolectados++; BM.mbRecolectados += rec.mb; } })
      : null;
    const origCreate = window.createImageBitmap;
    if (typeof origCreate === 'function') {
      window.createImageBitmap = function (...a) {
        return origCreate.apply(this, a).then((b) => {
          try {
            const rec = { mb: (b.width * b.height * 4) / 1048576, closed: false };
            bmRecs.set(b, rec); BM.creados++; BM.mbCreados += rec.mb;
            if (fin) fin.register(b, rec);
          } catch (_) { /* opcional */ }
          return b;
        });
      };
    }
    const proto = typeof ImageBitmap !== 'undefined' ? ImageBitmap.prototype : null;
    const origClose = proto && proto.close;
    if (origClose) {
      proto.close = function () {
        try { const rec = bmRecs.get(this); if (rec && !rec.closed) { rec.closed = true; BM.cerrados++; BM.mbCerrados += rec.mb; } } catch (_) { /* opcional */ }
        return origClose.apply(this, arguments);
      };
    }
    // Etiqueta cada GLB con el nombre del archivo (todas las cargas pasan por GLTFLoader.load / loadAsync)
    const gp = GLTFLoader.prototype;
    const origLoad = gp.load;
    if (typeof origLoad === 'function' && !origLoad.__lkBm) {
      gp.load = function (url, onLoad, onProgress, onError) {
        return origLoad.call(this, url, (gltf) => { try { labelGltfBitmaps(gltf, url); } catch (_) { /* opcional */ } if (onLoad) onLoad(gltf); }, onProgress, onError);
      };
      gp.load.__lkBm = true;
    }
  }
} catch (_) { /* opcional: sin contador de bitmaps */ }

/**
 * Hito 113 (memoria): memoria de CPU que retienen los recursos de three.js (no sale en el heap de JS ni en la GPU): arrays de
 * las geometrías, datos de texturas comprimidas (KTX2: three los conserva tras subirlas), lienzos 2D, DataTexture e imágenes.
 * roots: [[etiqueta, Object3D], …]. Cada geometría y cada textura (por su fuente compartida) se cuenta una sola vez.
 */
export function cpuResourcesOf(roots) {
  const r = (v) => Math.round(v * 10) / 10;
  const MB = 1048576;
  const cat = { geometrias: { n: 0, mb: 0 }, instancias: { n: 0, mb: 0 }, comprimidas: { n: 0, mb: 0 }, lienzos: { n: 0, mb: 0 }, datos: { n: 0, mb: 0 }, bitmaps: { n: 0, mb: 0 } };
  const seenArr = new Set(), seenSrc = new Set();
  const topG = [], topT = [];
  const add = (k, bytes) => { cat[k].n++; cat[k].mb += bytes / MB; };
  const arrBytes = (a) => (a && a.byteLength && !seenArr.has(a) ? (seenArr.add(a), a.byteLength) : 0);
  const addTexture = (t, owner) => {
    if (!t || !t.isTexture) return;
    const key = t.source || t;
    if (seenSrc.has(key)) return;
    seenSrc.add(key);
    const img = (t.source && t.source.data) || t.image;
    let kind = null, bytes = 0;
    if (t.isCompressedTexture || t.isCompressedArrayTexture) {
      kind = 'comprimidas'; (t.mipmaps || []).forEach((m) => { bytes += (m && m.data && m.data.byteLength) || 0; });
    } else if (img && img.data && img.data.byteLength !== undefined) {   // DataTexture
      kind = 'datos'; bytes = img.data.byteLength;
    } else if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) {
      kind = 'bitmaps'; bytes = (img.width || 0) * (img.height || 0) * 4;
    } else if (img && img.width && img.height) {                          // lienzo, OffscreenCanvas, <img>
      kind = 'lienzos'; bytes = img.width * img.height * 4;
    }
    if (!kind || !bytes) return;
    add(kind, bytes);
    topT.push({ mb: bytes / MB, tipo: kind, nombre: t.name || (owner && owner.name) || `${(img && img.width) || '?'}x${(img && img.height) || '?'}` });
  };
  const addMaterialTextures = (m, owner) => {
    if (!m) return;
    for (const k in m) { const v = m[k]; if (v && v.isTexture) addTexture(v, owner); }
    if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) addTexture(v, owner); }
  };
  for (const [label, root] of roots) {
    if (!root || !root.traverse) continue;
    root.traverse((o) => {
      const g = o.geometry;
      if (g) {
        let b = 0;
        for (const k in g.attributes) { const a = g.attributes[k]; b += arrBytes(a.isInterleavedBufferAttribute ? a.data && a.data.array : a.array); }
        if (g.index) b += arrBytes(g.index.array);
        for (const k in g.morphAttributes) (g.morphAttributes[k] || []).forEach((a) => { b += arrBytes(a.array); });
        if (b) { add('geometrias', b); topG.push({ mb: b / MB, mapa: label, malla: o.name || g.type, vertices: (g.attributes.position && g.attributes.position.count) || 0 }); }
      }
      if (o.isInstancedMesh) {
        const b = arrBytes(o.instanceMatrix && o.instanceMatrix.array) + arrBytes(o.instanceColor && o.instanceColor.array);
        if (b) add('instancias', b);
      }
      if (o.isSkinnedMesh && o.skeleton && o.skeleton.boneTexture) addTexture(o.skeleton.boneTexture, o);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => addMaterialTextures(m, o));
    });
    if (root.isScene) { addTexture(root.background, root); addTexture(root.environment, root); }
  }
  const resumen = {};
  for (const k in cat) resumen[k] = { n: cat[k].n, mb: r(cat[k].mb) };
  const top = (arr) => arr.sort((a, b) => b.mb - a.mb).slice(0, 8).map((x) => ({ ...x, mb: r(x.mb) }));
  return { resumen, totalMB: r(Object.values(cat).reduce((s, c) => s + c.mb, 0)), topGeometrias: top(topG), topTexturas: top(topT) };
}

/**
 * 29-oct: llamadas que pueden BLOQUEAR el hilo principal esperando a la GPU (compilar/enlazar shaders, subir texturas,
 * leer píxeles, toDataURL…). Mientras se graba se cronometran en TODOS los contextos WebGL (el del juego, el de los
 * retratos, el visor de la Mochila) y las de más de 25 ms se guardan con su pila de llamadas (qué función del juego
 * las pidió). Al parar se restauran las originales.
 */
const GL_SLOW_MS = 25;
// Mientras se graba, pilas más largas (por defecto el navegador guarda 10 líneas: no llegaban al código del juego)
const STACK_LIMIT = 60;
const GL_WATCH = ['getProgramParameter', 'getShaderParameter', 'getProgramInfoLog', 'linkProgram', 'compileShader', 'useProgram',
  'texImage2D', 'texSubImage2D', 'texImage3D', 'texStorage2D', 'compressedTexImage2D', 'generateMipmap', 'readPixels',
  'bufferData', 'bufferSubData', 'finish', 'getError', 'clientWaitSync',
  // Hito 113: el primer dibujo con un programa nuevo puede bloquear dentro de drawElements/drawArrays (ANGLE compila
  // el HLSL de forma diferida): sin esto esos fotogramas salían como «sin scripts»
  'drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'];
function shortStack(stack) {
  const all = String(stack || '').split('\n').slice(2)
    .map((l) => l.trim().replace(/^at /, ''))
    .filter((l) => !/PerfProbe\.js/.test(l))
    .map((l) => l.replace(/https?:\/\/[^/]+\//, '').replace(/\?[^:)]*/, ''));
  // 29-oct: las primeras líneas de three.js y luego las del JUEGO (src/…), que dicen qué objeto o sistema lo pidió
  const head = all.slice(0, 3);
  const game = all.slice(3).filter((l) => /src\//.test(l)).slice(0, 8);
  return [...head, ...(game.length ? ['…', ...game] : all.slice(3, 9))].join(' ← ');
}
function installGlSpy(sink) {
  const restore = [];
  const prevLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = STACK_LIMIT;
  restore.push(() => { Error.stackTraceLimit = prevLimit; });
  const wrap = (proto, name, label) => {
    const orig = proto && proto[name];
    if (typeof orig !== 'function' || orig.__lkSpy) return;
    const fn = function (...args) {
      const t = performance.now();
      try { return orig.apply(this, args); } finally {
        const ms = performance.now() - t;
        if (ms > GL_SLOW_MS) sink({ t, ms: Math.round(ms), call: label || name, pila: shortStack(new Error().stack) });
      }
    };
    fn.__lkSpy = true;
    proto[name] = fn;
    restore.push(() => { proto[name] = orig; });
  };
  for (const C of [typeof WebGL2RenderingContext !== 'undefined' && WebGL2RenderingContext, typeof WebGLRenderingContext !== 'undefined' && WebGLRenderingContext]) {
    if (!C) continue;
    for (const n of GL_WATCH) wrap(C.prototype, n, `gl.${n}`);
  }
  if (typeof HTMLCanvasElement !== 'undefined') { wrap(HTMLCanvasElement.prototype, 'toDataURL', 'canvas.toDataURL'); wrap(HTMLCanvasElement.prototype, 'toBlob', 'canvas.toBlob'); }
  if (typeof CanvasRenderingContext2D !== 'undefined') { wrap(CanvasRenderingContext2D.prototype, 'getImageData', 'ctx2d.getImageData'); wrap(CanvasRenderingContext2D.prototype, 'drawImage', 'ctx2d.drawImage'); }
  return () => restore.forEach((f) => f());
}

/** «src/rpg/world/Foo.js:123 · nombreFuncion» a partir de un script de Long Animation Frames. */
function describeScript(s) {
  let file = s.sourceURL || '';
  const i = file.indexOf('/src/');
  file = i >= 0 ? file.slice(i + 1) : file.replace(/^https?:\/\/[^/]+\//, '');
  const pos = Number.isFinite(s.sourceCharPosition) && s.sourceCharPosition >= 0 ? `@${s.sourceCharPosition}` : '';
  const fn = s.sourceFunctionName || '(anónima)';
  return `${file || '?'}${pos} · ${fn} [${s.invokerType || s.invoker || '?'}]`;
}

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
  // Hito 113: nº de objetos y de luces/mallas vivas en la escena principal (si crece en cada combate, algo no se retira)
  // Hito 113: rastreo de geometrías subidas a la GPU. three.js engancha un oyente «dispose» (onGeometryDispose) la primera vez
  // que se dibuja una geometría y lo quita al hacer dispose(): mientras siga enganchado, la geometría está viva en la GPU.
  // Se guarda con WeakRef (no la retenemos nosotros), su pila de creación y su peso; así se ve cuáles quedan fuera de la escena.
  const GT = { recs: [], on: false };
  const geoBytes = (g) => { let b = 0; try { for (const k in g.attributes) b += g.attributes[k].array?.byteLength || 0; b += g.index?.array?.byteLength || 0; } catch (_) { /* nada */ } return b; };
  const trackGeometries = (on) => {
    const proto = THREE.BufferGeometry.prototype;
    if (!on) { if (GT.on) { delete proto.addEventListener; GT.on = false; } return; }
    if (GT.on) return;
    GT.recs = []; GT.on = true;
    const orig = proto.addEventListener;
    proto.addEventListener = function (type, listener) {
      try {
        if (type === 'dispose' && listener && listener.name === 'onGeometryDispose' && GT.recs.length < 6000) {
          GT.recs.push({ ref: new WeakRef(this), fn: listener, t: now() - S.t0, stack: shortStack(new Error().stack), name: this.name || this.type, mb: geoBytes(this) / 1048576 });
        }
      } catch (_) { /* nada */ }
      return orig.apply(this, arguments);
    };
  };
  // Estado de las geometrías vivas: cuántas, cuánto pesan y cuáles NO cuelgan de la escena principal (agrupadas por quién las creó)
  const geoStats = (detalle = false) => {
    const inScene = new Set();
    try { game.sceneManager.scene.traverse((o) => { if (o.geometry) inScene.add(o.geometry); }); } catch (_) { /* nada */ }
    let vivas = 0, mbVivas = 0, fuera = 0, mbFuera = 0;
    const grupos = new Map();
    for (const r of GT.recs) {
      const g = r.ref.deref();
      if (!g) continue;
      const alive = g._listeners && g._listeners.dispose && g._listeners.dispose.indexOf(r.fn) !== -1;
      if (!alive) continue;
      vivas++; mbVivas += r.mb;
      if (inScene.has(g)) continue;
      fuera++; mbFuera += r.mb;
      if (detalle) { const a = grupos.get(r.stack) || { geometrias: 0, mb: 0, ejemplo: r.name, desdeS: r1(r.t / 1000) }; a.geometrias++; a.mb += r.mb; grupos.set(r.stack, a); }
    }
    const out = { vivas, mbVivas: r1(mbVivas), fuera, mbFuera: r1(mbFuera) };
    if (detalle) out.gruposFuera = [...grupos.entries()].sort((a, b) => b[1].mb - a[1].mb).slice(0, 12).map(([donde, a]) => ({ ...a, mb: r1(a.mb), donde }));
    return out;
  };
  const sceneObjs = () => { try { let n = 0, m = 0; game.sceneManager.scene.traverse((o) => { n++; if (o.isMesh) m++; }); return `${n} objetos, ${m} mallas`; } catch (_) { return null; } };

  const S = {
    rec: false,
    t0: 0,
    lastFrameAt: 0,
    frames: [],      // { dt, cpu, calls, tris, state }
    hitches: [],     // tirones con causa
    marks: [],       // { t, label }
    longTasks: [],   // { t, dur }
    loafs: [],       // 29-oct: fotogramas largos con su código { t, dur, bloqueo, estilos, dibujo, scripts:[…] }
    glSlow: [],      // 29-oct: llamadas a WebGL/canvas que bloquearon más de 25 ms, con su pila
    heap: null,      // 29-oct: { inicio, min, max, fin } en MB (una lectura por segundo; el mínimo ≈ memoria real tras el GC)
    heapTimer: null,
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
  let loafPo = null;
  let unspyGl = null;
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
        S.hitches.push({
          t: r1((t - S.t0) / 1000), frameMs: Math.round(dt), cpuPrevMs: Math.round(S.prev.cpu), state, causas: c.join(' · '),
          _from: t - S.t0 - dt - 20, _to: t - S.t0, // el código se rellena en el informe (el navegador lo entrega después)
        });
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
      // Hito 113: serie de memoria cada 5 s (heap JS, programas, geometrías, texturas y objetos de la escena) para separar
      // crecimiento puntual (compilar programas una vez) de una fuga (sube en cada repetición y no baja)
      serieMemoria: S.serie || [],
      // geometrías vivas en la GPU al parar y las que NO cuelgan de la escena principal, agrupadas por quién las creó
      // (pueden ser de otros visores: el de la Mochila, los retratos; la pila dice cuál)
      geometriasAlParar: S.geoFinal || null,
      // imágenes decodificadas (ImageBitmap) de los GLB desde el arranque de la página: creadas, cerradas y vivas (MB)
      bitmapsAlParar: { ...bitmapStats(), porModelo: bitmapsPorModelo() },
      // 29-oct: el heap sube y baja con el recolector de basura; para ver si crece de verdad, mirar el mínimo
      heap: S.heap ? { inicio: S.heap.inicio, min: S.heap.min, max: S.heap.max, fin: S.heap.fin,
        minPrimeraMitad: S.heap.muestras.length > 3 ? Math.min(...S.heap.muestras.slice(0, S.heap.muestras.length >> 1)) : null,
        minSegundaMitad: S.heap.muestras.length > 3 ? Math.min(...S.heap.muestras.slice(S.heap.muestras.length >> 1)) : null } : null,
      tirones: S.hitches.map(({ _from, _to, ...h }) => {
        // 29-oct: el código que ocupó ese hueco (Long Animation Frames, si el navegador lo da)
        const lf = S.loafs.filter((x) => x.t < _to && x.t + x.dur > _from).sort((a, b) => b.dur - a.dur)[0];
        return { ...h, codigo: lf && lf.scripts.length ? lf.scripts.slice(0, 2).map((s) => `${s.ms} ms ${s.donde}`).join(' | ') : '' };
      }),
      // 29-oct: los fotogramas más largos y el código que los ocupó (los 40 peores)
      framesLargos: S.loafs.slice().sort((a, b) => b.dur - a.dur).slice(0, 40).map((x) => ({
        s: r1(x.t / 1000), ms: x.dur, bloqueoMs: x.bloqueo, estilosMs: x.estilos, scriptsMs: x.scriptsMs,
        codigo: x.scripts.map((s) => `${s.ms} ms ${s.donde}`).join(' | ') || '(sin scripts: GPU, maquetación o navegador)',
      })),
      // 29-oct: llamadas a WebGL/canvas que bloquearon (las 30 peores) y quién las pidió
      llamadasLentasGL: S.glSlow.slice().sort((a, b) => b.ms - a.ms).slice(0, 30).map((x) => ({ s: r1(x.t / 1000), ms: x.ms, llamada: x.call, pila: x.pila })),
      llamadasLentasGLTotal: (() => {
        const acc = new Map();
        for (const x of S.glSlow) { const k = `${x.call} ← ${x.pila.split(' ← ').slice(0, 3).join(' ← ')}`; const a = acc.get(k) || { veces: 0, ms: 0 }; a.veces++; a.ms += x.ms; acc.set(k, a); }
        return [...acc.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, 15).map(([donde, a]) => ({ ms: a.ms, veces: a.veces, donde }));
      })(),
      // y el código que más tiempo sumó en todos los fotogramas largos
      codigoMasPesado: (() => {
        const acc = new Map();
        for (const x of S.loafs) for (const s of x.scripts) acc.set(s.donde, (acc.get(s.donde) || 0) + s.ms);
        return [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([donde, ms]) => ({ ms: Math.round(ms), donde }));
      })(),
      marcas: S.marks.map((m) => ({ s: r1(m.t / 1000), marca: m.label, ...(m.mem ? { mem: m.mem } : {}) })),
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
    if (rep.framesLargos && rep.framesLargos.length) { console.log('Fotogramas largos (Long Animation Frames):'); console.table(rep.framesLargos); }
    if (rep.codigoMasPesado && rep.codigoMasPesado.length) { console.log('Código que más tiempo sumó:'); console.table(rep.codigoMasPesado); }
    if (rep.llamadasLentasGL && rep.llamadasLentasGL.length) { console.log('Llamadas a WebGL/canvas que bloquearon:'); console.table(rep.llamadasLentasGL); console.table(rep.llamadasLentasGLTotal); }
    if (rep.marcas.length) console.table(rep.marcas);
    console.groupEnd();
  }

  const api = {
    start(maxSeconds = 60) {
      wrap();
      S.rec = true;
      S.t0 = now();
      S.lastFrameAt = 0;
      S.frames = []; S.hitches = []; S.marks = []; S.longTasks = []; S.loafs = []; S.glSlow = [];
      const mb = () => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
      S.heap = { inicio: mb(), min: mb(), max: mb(), fin: null, muestras: [] };
      clearInterval(S.heapTimer);
      try { trackGeometries(true); } catch (_) { /* opcional */ }
      S.serie = [];
      const snap = () => ({ s: r1((now() - S.t0) / 1000), heapMB: mb(), prog: programsCount(), geo: info.memory.geometries, tex: info.memory.textures, escena: sceneObjs(), geoFuera: (({ fuera, mbFuera, mbVivas }) => ({ fuera, mbFuera, mbVivas }))(geoStats()), bitmaps: (({ vivos, mbVivos }) => ({ vivos, mbVivos }))(bitmapStats()) });
      S.snap = snap;
      let tick = 0;
      S.heapTimer = setInterval(() => { const v = mb(); if (v == null) return; S.heap.min = Math.min(S.heap.min, v); S.heap.max = Math.max(S.heap.max, v); S.heap.muestras.push(v); if ((tick++ % 5) === 0 && S.serie.length < 400) S.serie.push(snap()); }, 1000);
      try { if (unspyGl) unspyGl(); unspyGl = installGlSpy((e) => { if (S.glSlow.length < 2000) S.glSlow.push({ ...e, t: e.t - S.t0 }); }); } catch (_) { unspyGl = null; }
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
      // 29-oct: Long Animation Frames (Chrome/Edge 123+): qué script ocupó cada fotograma de más de 50 ms
      try {
        loafPo = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            const scripts = (e.scripts || []).slice().sort((a, b) => b.duration - a.duration).slice(0, 4)
              .map((s) => ({ ms: Math.round(s.duration), donde: describeScript(s) }));
            S.loafs.push({
              t: e.startTime - S.t0, dur: Math.round(e.duration), bloqueo: Math.round(e.blockingDuration || 0),
              estilos: Math.round(e.styleAndLayoutStart ? (e.startTime + e.duration - e.styleAndLayoutStart) : 0),
              scriptsMs: Math.round((e.scripts || []).reduce((a, s) => a + s.duration, 0)), scripts,
            });
          }
        });
        loafPo.observe({ type: 'long-animation-frame', buffered: false });
      } catch (_) { loafPo = null; }
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
      if (loafPo) { loafPo.disconnect(); loafPo = null; }
      if (unspyGl) { try { unspyGl(); } catch (_) { /* nada */ } unspyGl = null; }
      clearInterval(S.heapTimer);
      try { S.geoFinal = geoStats(true); trackGeometries(false); } catch (_) { /* opcional */ }
      if (S.heap) S.heap.fin = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      info.autoReset = S.hudEl ? false : prevAutoReset;
      const rep = buildReport();
      S.lastReport = rep;
      printReport(rep);
      return rep;
    },
    /** lkDebug.perf.geometrias() — en cualquier momento (grabando): geometrías vivas y las que han quedado fuera de la escena */
    geometrias() { const r = geoStats(true); console.log('[perf] geometrías vivas:', r.vivas, `(${r.mbVivas} MB)`, ' fuera de la escena:', r.fuera, `(${r.mbFuera} MB)`); if (r.gruposFuera.length) console.table(r.gruposFuera); return r; },
    /** lkDebug.perf.recursos() — memoria de CPU que retienen geometrías y texturas (mapa activo + modelos de ModelCache). Es async. */
    async recursos() {
      const roots = [];
      try { roots.push(['combate', game.sceneManager.scene]); } catch (_) { /* nada */ }
      try { if (game.overworldManager && game.overworldManager.scene) roots.push(['mundo', game.overworldManager.scene]); } catch (_) { /* nada */ }
      try {
        const mc = await import('../render/ModelCache.js');
        for (const p of mc.cachedModelPaths()) { try { const g = await mc.loadGLTFCached(p); if (g && g.scene) roots.push([String(p).split('/').pop(), g.scene]); } catch (_) { /* nada */ } }
      } catch (_) { /* nada */ }
      const out = cpuResourcesOf(roots);
      try { const m = await import('../rpg/SapidaeModularController.js'); out.teñido = m.tintMemoryStats(); } catch (_) { out.teñido = null; }
      console.log('[perf] recursos de CPU de three.js (MB):', out.totalMB); console.table(out.resumen);
      if (out.teñido && out.teñido.length) { console.log('cachés del teñido del Sapidae'); console.table(out.teñido); }
      if (out.topGeometrias.length) { console.log('geometrías más pesadas'); console.table(out.topGeometrias); }
      if (out.topTexturas.length) { console.log('texturas más pesadas'); console.table(out.topTexturas); }
      return out;
    },
    /** lkDebug.perf.memoria() — todo junto para apuntar en cada punto de la prueba (es async: await lkDebug.perf.memoria()) */
    async memoria() {
      const mb = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      const b = bitmapStats();
      console.log(`[perf] heap JS: ${mb} MB · ImageBitmap vivos: ${b.vivos} (${b.mbVivos} MB) · creados ${b.creados} · cerrados ${b.cerrados} · programas ${programsCount()} · geometrías ${info.memory.geometries} · texturas ${info.memory.textures}`);
      console.table(bitmapsPorModelo());
      return api.recursos();
    },
    /** lkDebug.perf.bitmaps() — imágenes de GLB decodificadas que siguen en memoria (ver bitmapStats) */
    bitmaps() { const r = bitmapStats(); console.log('[perf] ImageBitmap vivos:', r.vivos, `(${r.mbVivos} MB)`, ' creados:', r.creados, `(${r.mbCreados} MB)`, ' cerrados:', r.cerrados, ' recolectados:', r.recolectados); return r; },
    mark(label) {
      if (S.rec) S.marks.push({ t: now() - S.t0, label: String(label), mem: S.snap ? (({ heapMB, prog, geo, tex, geoFuera, bitmaps }) => ({ heapMB, prog, geo, tex, geoFuera, bitmaps }))(S.snap()) : null });
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
        '  bitmaps()       imágenes de GLB decodificadas que siguen en memoria (MB)',
        '  await memoria() heap + imágenes vivas por modelo + memoria de CPU de geometrías y texturas',
        '  geometrias()    geometrías vivas en la GPU y las que quedaron fuera de la escena',
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
