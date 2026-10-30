// GpuProbe.js — Memoria de la tarjeta gráfica que reserva el juego: lkDebug.gpu
//
// El administrador de tareas de Chrome junta en «Proceso de GPU» la memoria de todas las pestañas y del navegador.
// Este módulo cuenta SOLO lo que reserva el juego, en todos sus contextos WebGL (mundo y combate, retratos, visor de
// la mochila, mezclador de Axies…): texturas, buffers de geometría y render targets.
//
// Cómo cuenta: anota cada reserva (texStorage / texImage / compressedTexImage / bufferData / renderbufferStorage) y
// cada liberación (deleteTexture / deleteBuffer / deleteRenderbuffer). No toca las llamadas de cada fotograma (bind,
// draw…), así que no cuesta rendimiento. Los tamaños son los de los datos; el driver puede añadir algo de relleno.
// Debe importarse ANTES de crear cualquier renderer (primera línea de main.js).
//
// Uso (consola F12):
//   lkDebug.gpu()          resumen por contexto y por tipo + las 30 texturas más grandes (con nombre si se conoce)
//   lkDebug.gpu.mark()     guarda una marca (p. ej. al entrar al mundo)
//   lkDebug.gpu.diff()     qué se reservó desde la marca y sigue vivo (sirve para encontrar fugas)
//   lkDebug.gpu.export()   descarga el informe en JSON
//
// Nombres (30-oct): cada textura y render target se anota al crearse con su objeto de three (WeakRef) y una foto de
// su nombre/origen. Al quitar algo de la escena se apunta qué objeto usaba cada textura. Así el informe nombra
// también lo que ya no está en ninguna escena y dice su estado:
//   en escena          lo usa algo que se está dibujando
//   fuera de escena    el objeto de three sigue vivo pero nada de la escena lo usa (caché o fuga)
//   sin dispose        el objeto de three ya se recolectó y nadie llamó a dispose(): fuga segura
//   sombra / render target  mapas de sombra y buffers de posprocesado (creadaEn: quién los creó)
// Los dueños se apuntan desde la primera llamada a lkDebug.gpu() o mark() (antes no cuesta nada).

import { EventDispatcher, Object3D } from 'three';

const MB = (b) => Math.round((b / 1048576) * 10) / 10;

// ---------------------------------------------------------------- bytes por píxel / bloque
const SIZED = {
  0x8058: 4, 0x8C43: 4, 0x8051: 4, 0x8C41: 4, 0x881A: 8, 0x8814: 16, 0x881B: 8, 0x8815: 16, 0x8229: 1, 0x822B: 2,
  0x822D: 2, 0x822E: 4, 0x822F: 4, 0x8230: 8, 0x8C3A: 4, 0x8C3D: 4, 0x81A5: 2, 0x81A6: 4, 0x8CAC: 4, 0x88F0: 4,
  0x8CAD: 8, 0x8056: 2, 0x8D62: 2, 0x8057: 2, 0x8D7C: 4, 0x8D8E: 4, 0x8232: 1, 0x8236: 4, 0x823C: 4, 0x8234: 2,
};
const UNSIZED_TYPE = { 0x1401: 1, 0x1406: 4, 0x140B: 2, 0x8D61: 2, 0x1405: 4, 0x1403: 2, 0x84FA: 4 };
const UNSIZED_CH = { 0x1908: 4, 0x1907: 4, 0x1909: 1, 0x190A: 2, 0x1906: 1, 0x1903: 1, 0x8227: 2, 0x1902: 1, 0x84F9: 1 };
// Formatos comprimidos: bytes por bloque de 4×4
const BLOCK = {
  0x83F0: 8, 0x83F1: 8, 0x8C4C: 8, 0x8C4D: 8, 0x83F2: 16, 0x83F3: 16, 0x8C4E: 16, 0x8C4F: 16, // BC1 / BC2 / BC3
  0x8E8C: 16, 0x8E8D: 16, 0x8E8E: 16, 0x8E8F: 16, // BC7 / BC6H
  0x8D64: 8, 0x9274: 8, 0x9275: 8, 0x9276: 8, 0x9277: 8, 0x9278: 16, 0x9279: 16, 0x9270: 8, 0x9272: 16, // ETC1 / ETC2 / EAC
  0x93B0: 16, 0x93D0: 16, // ASTC 4x4
  0x8DBB: 8, 0x8DBC: 8, 0x8DBD: 16, 0x8DBE: 16, // RGTC
};
const FMT_NAME = {
  0x8058: 'RGBA8', 0x8C43: 'sRGBA8', 0x881A: 'RGBA16F', 0x8814: 'RGBA32F', 0x8229: 'R8', 0x822B: 'RG8', 0x822D: 'R16F',
  0x822E: 'R32F', 0x81A5: 'DEPTH16', 0x81A6: 'DEPTH24', 0x8CAC: 'DEPTH32F', 0x88F0: 'DEPTH24_S8', 0x8C3A: 'R11G11B10F',
  0x83F0: 'BC1', 0x83F1: 'BC1a', 0x8C4C: 'BC1 sRGB', 0x8C4D: 'BC1a sRGB', 0x83F3: 'BC3', 0x8C4F: 'BC3 sRGB',
  0x8E8C: 'BC7', 0x8E8D: 'BC7 sRGB', 0x9274: 'ETC2', 0x9275: 'ETC2 sRGB', 0x9278: 'ETC2a', 0x9279: 'ETC2a sRGB',
  0x93B0: 'ASTC4', 0x93D0: 'ASTC4 sRGB', 0x8D64: 'ETC1', 0x1908: 'RGBA', 0x1907: 'RGB', 0x1902: 'DEPTH', 0x84F9: 'DEPTH_STENCIL',
};

function levelBytes(ifmt, w, h, d = 1, format, type) {
  w = Math.max(1, w | 0); h = Math.max(1, h | 0); d = Math.max(1, d | 0);
  if (BLOCK[ifmt]) return Math.ceil(w / 4) * Math.ceil(h / 4) * BLOCK[ifmt] * d;
  let bpp = SIZED[ifmt];
  if (!bpp) bpp = (UNSIZED_CH[format || ifmt] || 4) * (UNSIZED_TYPE[type] || 1);
  return w * h * d * bpp;
}

// ---------------------------------------------------------------- registro por contexto
const contexts = new Map(); // gl → { id, canvas, tex: Map, buf: Map, rb: Map }
let seq = 0;
let objSeq = 0;
function ctxOf(gl) {
  let c = contexts.get(gl);
  if (!c) { c = { id: ++seq, gl, canvas: gl.canvas, tex: new Map(), buf: new Map(), rb: new Map(), created: performance.now() }; contexts.set(gl, c); }
  return c;
}

const BIND_QUERY = { 0x0DE1: 0x8069, 0x8513: 0x8514, 0x8C1A: 0x8C1D, 0x806F: 0x806A }; // 2D, cube, 2D array, 3D
const CUBE_FACES = new Set([0x8515, 0x8516, 0x8517, 0x8518, 0x8519, 0x851A]);
function boundTexture(gl, target) {
  const q = CUBE_FACES.has(target) ? 0x8514 : BIND_QUERY[target];
  try { return q ? gl.getParameter(q) : null; } catch (_) { return null; }
}
const BUF_QUERY = { 0x8892: 0x8894, 0x8893: 0x8895, 0x8A11: 0x8A28, 0x8F36: 0x8F36, 0x8F37: 0x8F37, 0x88EB: 0x88ED, 0x88EC: 0x88EF, 0x8C8E: 0x8C8F };
function boundBuffer(gl, target) {
  const q = BUF_QUERY[target];
  try { return q ? gl.getParameter(q) : null; } catch (_) { return null; }
}

function texRec(gl, tex) {
  const c = ctxOf(gl);
  let r = c.tex.get(tex);
  if (!r) { r = { n: ++objSeq, levels: new Map(), bytes: 0, w: 0, h: 0, fmt: 0, rt: false, t: performance.now() }; c.tex.set(tex, r); }
  return r;
}
function setLevel(r, key, bytes, w, h, fmt) {
  r.bytes += bytes - (r.levels.get(key) || 0);
  r.levels.set(key, bytes);
  if (key.endsWith(':0') || !r.w) { r.w = w; r.h = h; r.fmt = fmt; }
}

// ---------------------------------------------------------------- origen de cada textura / render target
// three llama a addEventListener('dispose') sobre la textura (o el render target) justo antes de createTexture /
// createRenderbuffer, de forma síncrona. Se guarda ese objeto «pendiente» y se limpia en la siguiente microtarea.
const origin = new WeakMap(); // WebGLTexture | WebGLRenderbuffer → { ref, kind, snap, stack, state }
const ownerOfTex = new WeakMap(); // Texture de three → «objeto (modelo)» que la usaba al quitarse de la escena
let pending = null;
let pendingClearQueued = false;
const hasWeakRef = typeof WeakRef !== 'undefined';
let gameRef = null;
// Apuntar dueños al quitar objetos cuesta un recorrido del subárbol: solo desde el primer lkDebug.gpu() o mark()
let ownerTracking = false;

function shortUrl(u) { return String(u || '').replace(/^https?:\/\/[^/]+\//, '').replace(/^\.\//, ''); }

function describeTexture(t) {
  if (!t) return '';
  let src = '';
  try { src = (window.lkDebug && window.lkDebug.assets && window.lkDebug.assets.sourceOf && window.lkDebug.assets.sourceOf(t)) || ''; } catch (_) { /* opcional */ }
  const img = t.image;
  if (!src) src = (t.userData && t.userData.lkSrc) || '';
  if (!src && img && typeof img === 'object' && (img.currentSrc || img.src) && !String(img.currentSrc || img.src).startsWith('data:')) src = shortUrl(img.currentSrc || img.src);
  const name = t.name || '';
  let base = src ? (name && !src.includes(name) ? `${src} › ${name}` : src) : name;
  if (!base) {
    const kind = img && typeof img === 'object' ? (img.constructor && img.constructor.name) || 'imagen' : 'sin imagen';
    base = `${t.constructor.name} [${kind}${img && img.width ? ` ${img.width}×${img.height}` : ''}]`;
  }
  const own = ownerOfTex.get(t);
  return own ? `${base} (de ${own})` : base;
}

function describeRT(rt) {
  const t = rt && rt.texture;
  const n = (t && t.name) || '';
  if (n.endsWith('.shadowMap')) return `sombra de ${n.slice(0, -10) || 'luz sin nombre'}`;
  return n ? `render target ${n}` : 'render target';
}

// Primeras líneas de la pila que no son de three (quién creó el render target)
function callerStack() {
  try {
    const lines = String(new Error().stack || '').split('\n').slice(1);
    const out = [];
    for (const l of lines) {
      if (/three\.module|GpuProbe|ShadowMapGC|EventDispatcher/.test(l)) continue;
      const m = l.match(/at (?:(\S+) \()?.*?\/([^/]+\.js):(\d+)/);
      if (m) out.push(`${m[1] ? m[1] + ' ' : ''}${m[2]}:${m[3]}`);
      if (out.length >= 2) break;
    }
    return out.join(' ← ');
  } catch (_) { return ''; }
}

function where() {
  try {
    const om = gameRef && gameRef.overworldManager;
    return (om && om.state) || '';
  } catch (_) { return ''; }
}

function setPending(obj, kind) {
  pending = { obj, kind };
  if (!pendingClearQueued) {
    pendingClearQueued = true;
    queueMicrotask(() => { pending = null; pendingClearQueued = false; });
  }
}

function claimOrigin(glObj) {
  if (!pending || !glObj) return;
  const { obj, kind } = pending;
  // La textura de three sigue siendo la misma hasta la microtarea; el nombre se fotografía ya por si luego se recolecta
  const rec = { ref: hasWeakRef ? new WeakRef(obj) : null, kind, snap: '', stack: '', state: where(), t: performance.now() };
  try { rec.snap = kind === 'rt' ? describeRT(obj) : describeTexture(obj); } catch (_) { /* opcional */ }
  if (kind === 'rt') rec.stack = callerStack();
  origin.set(glObj, rec);
  if (kind === 'tex') pending = null; // una textura = un createTexture; el render target crea textura y renderbuffer
}

function installOwnerHooks() {
  // Al quitar algo de la escena se apunta qué objeto usaba cada textura (para nombrar lo que se queda en la GPU)
  const rm = Object3D.prototype.remove;
  Object3D.prototype.remove = function (...objs) {
    if (!ownerTracking) return rm.apply(this, objs);
    try {
      let budget = 3000; // nodos como máximo por llamada (vaciar una isla entera no debe trabar)
      for (const o of objs) {
        if (!o || (!o.material && !(o.children && o.children.length))) continue;
        let model = '';
        for (let p = o; p && !model; p = p.parent) model = (p.userData && p.userData.lkSrc) || '';
        o.traverse((m) => {
          if (--budget < 0 || !m.material) return;
          const who = `${m.name || m.type}${model ? ` · ${shortUrl(model)}` : ''}`;
          for (const mat of [].concat(m.material)) {
            if (!mat) continue;
            for (const k in mat) { const v = mat[k]; if (v && v.isTexture) ownerOfTex.set(v, who); }
            if (mat.uniforms) for (const k in mat.uniforms) { const v = mat.uniforms[k] && mat.uniforms[k].value; if (v && v.isTexture) ownerOfTex.set(v, `${who}.${k}`); }
          }
        });
      }
    } catch (_) { /* nunca debe romper la escena */ }
    return rm.apply(this, objs);
  };
  const ael = EventDispatcher.prototype.addEventListener;
  EventDispatcher.prototype.addEventListener = function (type, fn) {
    if (type === 'dispose') {
      if (this.isTexture) setPending(this, 'tex');
      else if (this.isWebGLRenderTarget || this.isRenderTarget) setPending(this, 'rt');
    }
    return ael.call(this, type, fn);
  };
}

let installed = false;
function installHooks() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  try { installOwnerHooks(); } catch (_) { /* opcional */ }
  const protos = [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype].filter(Boolean);
  for (const P of protos) {
    const wrap = (name, fn) => {
      const orig = P[name];
      if (typeof orig !== 'function') return;
      P[name] = function (...a) {
        const res = orig.apply(this, a);
        try { fn(this, a); } catch (_) { /* nunca debe romper el render */ }
        return res;
      };
    };
    wrap('texStorage2D', (gl, [target, levels, ifmt, w, h]) => {
      const tex = boundTexture(gl, target); if (!tex) return;
      const r = texRec(gl, tex); const faces = target === 0x8513 ? 6 : 1;
      for (let l = 0; l < levels; l++) setLevel(r, `s:${l}`, levelBytes(ifmt, w >> l, h >> l) * faces, w, h, ifmt);
    });
    wrap('texStorage3D', (gl, [target, levels, ifmt, w, h, d]) => {
      const tex = boundTexture(gl, target); if (!tex) return;
      const r = texRec(gl, tex);
      for (let l = 0; l < levels; l++) setLevel(r, `s:${l}`, levelBytes(ifmt, w >> l, h >> l, target === 0x806F ? d >> l : d), w, h, ifmt);
    });
    wrap('texImage2D', (gl, a) => {
      const [target, level, ifmt] = a;
      let w, h, format, type;
      if (a.length === 6) { const s = a[5]; format = a[3]; type = a[4]; w = s && (s.videoWidth || s.naturalWidth || s.width); h = s && (s.videoHeight || s.naturalHeight || s.height); }
      else { w = a[3]; h = a[4]; format = a[6]; type = a[7]; }
      const tex = boundTexture(gl, target); if (!tex) return;
      setLevel(texRec(gl, tex), `${target}:${level}`, levelBytes(ifmt, w, h, 1, format, type), w, h, ifmt);
    });
    wrap('texImage3D', (gl, [target, level, ifmt, w, h, d, , format, type]) => {
      const tex = boundTexture(gl, target); if (!tex) return;
      setLevel(texRec(gl, tex), `${target}:${level}`, levelBytes(ifmt, w, h, d, format, type), w, h, ifmt);
    });
    wrap('compressedTexImage2D', (gl, [target, level, ifmt, w, h]) => {
      const tex = boundTexture(gl, target); if (!tex) return;
      setLevel(texRec(gl, tex), `${target}:${level}`, levelBytes(ifmt, w, h), w, h, ifmt);
    });
    wrap('compressedTexImage3D', (gl, [target, level, ifmt, w, h, d]) => {
      const tex = boundTexture(gl, target); if (!tex) return;
      setLevel(texRec(gl, tex), `${target}:${level}`, levelBytes(ifmt, w, h, d), w, h, ifmt);
    });
    const wrapCreate = (name) => {
      const orig = P[name];
      if (typeof orig !== 'function') return;
      P[name] = function (...a) {
        const res = orig.apply(this, a);
        try { claimOrigin(res); } catch (_) { /* nada */ }
        return res;
      };
    };
    wrapCreate('createTexture');
    wrapCreate('createRenderbuffer');
    wrap('deleteTexture', (gl, [tex]) => { if (tex) ctxOf(gl).tex.delete(tex); });
    wrap('framebufferTexture2D', (gl, [, , , tex]) => { if (tex) { const r = ctxOf(gl).tex.get(tex); if (r) r.rt = true; } });
    wrap('bufferData', (gl, [target, sizeOrData]) => {
      const buf = boundBuffer(gl, target); if (!buf) return;
      const bytes = typeof sizeOrData === 'number' ? sizeOrData : (sizeOrData && sizeOrData.byteLength) || 0;
      const c = ctxOf(gl);
      const prev = c.buf.get(buf);
      c.buf.set(buf, { n: prev ? prev.n : ++objSeq, bytes, target, t: prev ? prev.t : performance.now() });
    });
    wrap('deleteBuffer', (gl, [buf]) => { if (buf) ctxOf(gl).buf.delete(buf); });
    const rbStore = (gl, samples, ifmt, w, h) => {
      let rb = null; try { rb = gl.getParameter(0x8CA7); } catch (_) { /* nada */ }
      if (!rb) return;
      const c = ctxOf(gl); const prev = c.rb.get(rb);
      c.rb.set(rb, { n: prev ? prev.n : ++objSeq, bytes: levelBytes(ifmt, w, h) * Math.max(1, samples), w, h, fmt: ifmt, samples, t: prev ? prev.t : performance.now() });
    };
    wrap('renderbufferStorage', (gl, [, ifmt, w, h]) => rbStore(gl, 1, ifmt, w, h));
    wrap('renderbufferStorageMultisample', (gl, [, samples, ifmt, w, h]) => rbStore(gl, samples, ifmt, w, h));
    wrap('deleteRenderbuffer', (gl, [rb]) => { if (rb) ctxOf(gl).rb.delete(rb); });
  }
}

// ---------------------------------------------------------------- nombres (texturas de three conocidas)
function collectLabels(renderers) {
  const labels = new Map(); // WebGLTexture → nombre
  const short = (u) => String(u || '').replace(/^https?:\/\/[^/]+\//, '').replace(/^\.\//, '');
  for (const { name, renderer, roots } of renderers) {
    if (!renderer || !renderer.properties) continue;
    const add = (tex, owner) => {
      if (!tex || !tex.isTexture) return;
      let p; try { p = renderer.properties.get(tex); } catch (_) { return; }
      const wt = p && p.__webglTexture; if (!wt || labels.has(wt)) return;
      const img = tex.image;
      const src = (tex.userData && tex.userData.lkSrc) || tex.name || (img && (img.currentSrc || img.src) ? short(img.currentSrc || img.src) : '') || tex.constructor.name;
      labels.set(wt, `${name}: ${src}${owner ? ` (${owner})` : ''}`);
    };
    for (const root of roots) {
      if (!root || typeof root.traverse !== 'function') continue;
      root.traverse((o) => {
        const mats = o.material ? [].concat(o.material) : [];
        for (const m of mats) {
          if (!m) continue;
          for (const k in m) { const v = m[k]; if (v && v.isTexture) add(v, o.name || o.type); }
          if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) add(v, `${o.name || o.type}.${k}`); }
        }
      });
      if (root.background && root.background.isTexture) add(root.background, 'fondo');
      if (root.environment && root.environment.isTexture) add(root.environment, 'entorno');
    }
  }
  return labels;
}

function canvasLabel(c, game) {
  const cv = c.canvas;
  const size = cv ? `${cv.width}×${cv.height}` : '?';
  const main = game && game.sceneManager && game.sceneManager.renderer && game.sceneManager.renderer.getContext && game.sceneManager.renderer.getContext();
  if (c.gl === main) return `#${c.id} principal (mundo y combate) ${size}`;
  if (cv && typeof OffscreenCanvas !== 'undefined' && cv instanceof OffscreenCanvas) return `#${c.id} offscreen ${size}`;
  const inDom = cv && cv.isConnected;
  return `#${c.id} ${inDom ? 'visible' : 'fuera de pantalla'} ${size}${cv && cv.id ? ` #${cv.id}` : ''}`;
}

function drawingBufferBytes(gl) {
  try {
    const at = gl.getContextAttributes() || {};
    const px = gl.drawingBufferWidth * gl.drawingBufferHeight;
    const samples = at.antialias ? 4 : 1;
    return px * 4 * (1 + samples) + (at.depth ? px * 4 * samples : 0); // color (front + back/MSAA) + profundidad
  } catch (_) { return 0; }
}

// ---------------------------------------------------------------- informe
let markSet = null;

// Nombre y estado de un objeto WebGL: primero lo que se ve en escena, si no, lo anotado al crearlo
function originInfo(glObj, sceneLabel) {
  const rec = origin.get(glObj);
  const creadaEn = rec ? [rec.state, rec.stack].filter(Boolean).join(' · ') : '';
  if (sceneLabel) return { nombre: sceneLabel, estado: 'en escena', creadaEn };
  if (!rec) return { nombre: '', estado: '', creadaEn };
  const obj = rec.ref && rec.ref.deref();
  if (!obj) return { nombre: rec.snap, estado: 'sin dispose', creadaEn };
  let nombre = rec.snap;
  try { nombre = rec.kind === 'rt' ? describeRT(obj) : describeTexture(obj); } catch (_) { /* opcional */ }
  if (rec.kind === 'rt') {
    if (/^sombra de /.test(nombre)) return { nombre, estado: 'sombra', creadaEn };
    return { nombre, estado: 'render target', creadaEn };
  }
  return { nombre: nombre || rec.snap, estado: 'fuera de escena', creadaEn };
}

function byState(rows) {
  const m = new Map();
  for (const t of rows) {
    const k = `${t.estado || 'desconocido'} ctx#${t.ctx}`;
    const e = m.get(k) || { estado: k, cantidad: 0, mb: 0 }; e.cantidad++; e.mb += t._b; m.set(k, e);
  }
  return [...m.values()].map((e) => ({ ...e, mb: MB(e.mb) })).sort((a, b) => b.mb - a.mb);
}

// Clave de grupo: nombre sin el dueño entre paréntesis + estado; o tamaño/formato si no hay nombre
function groupKey(t) {
  if (!t.nombre) return `(sin nombre) ${t.tipo} ${t.tam} ${t.formato} ctx#${t.ctx}`;
  const base = t.nombre.replace(/ \((?:de )?[^()]*\)$/, '');
  return t.estado && t.estado !== 'en escena' ? `${base} [${t.estado}] ctx#${t.ctx}` : `${base} ctx#${t.ctx}`;
}

async function buildReport(game) {
  const renderers = [];
  try {
    const r = game.sceneManager && game.sceneManager.renderer;
    renderers.push({ name: 'mundo/combate', renderer: r, roots: [game.overworldManager && game.overworldManager.scene, game.sceneManager && game.sceneManager.scene] });
  } catch (_) { /* opcional */ }
  try {
    const { portraitService } = await import('../tactics/CharacterPortraitService.js');
    if (portraitService && portraitService.renderer) renderers.push({ name: 'retratos', renderer: portraitService.renderer, roots: [portraitService.scene] });
  } catch (_) { /* opcional */ }
  try {
    const d = game.overworldManager && game.overworldManager.inventoryModal && game.overworldManager.inventoryModal.model && game.overworldManager.inventoryModal.model.d;
    if (d && d.renderer) renderers.push({ name: 'mochila', renderer: d.renderer, roots: [d.scene] });
  } catch (_) { /* opcional */ }
  const labels = collectLabels(renderers);

  const ctxRows = [];
  const texRows = [];
  let total = 0;
  for (const c of contexts.values()) {
    let lost = false; try { lost = c.gl.isContextLost(); } catch (_) { /* nada */ }
    let tex = 0, rt = 0, buf = 0, rb = 0, nTex = 0, nRt = 0;
    for (const [wt, r] of c.tex) {
      if (r.rt) { rt += r.bytes; nRt++; } else { tex += r.bytes; nTex++; }
      const o = originInfo(wt, labels.get(wt));
      texRows.push({ ctx: c.id, mb: MB(r.bytes), tam: `${r.w}×${r.h}`, formato: FMT_NAME[r.fmt] || `0x${(r.fmt || 0).toString(16)}`, mips: r.levels.size, tipo: r.rt ? 'render target' : 'textura', nombre: o.nombre, estado: o.estado, creadaEn: o.creadaEn, _n: r.n, _b: r.bytes });
    }
    for (const b of c.buf.values()) buf += b.bytes;
    for (const [wrb, b] of c.rb) {
      rb += b.bytes;
      const o = originInfo(wrb, '');
      texRows.push({ ctx: c.id, mb: MB(b.bytes), tam: `${b.w}×${b.h}`, formato: FMT_NAME[b.fmt] || `0x${(b.fmt || 0).toString(16)}`, mips: 1, tipo: 'renderbuffer', nombre: o.nombre ? `profundidad de ${o.nombre}` : '', estado: o.estado, creadaEn: o.creadaEn, _n: b.n, _b: b.bytes });
    }
    const screen = drawingBufferBytes(c.gl);
    const sum = tex + rt + buf + rb + screen;
    if (!lost) total += sum;
    ctxRows.push({ contexto: canvasLabel(c, game) + (lost ? ' (perdido)' : ''), texturasMB: MB(tex), texturas: nTex, renderTargetsMB: MB(rt + rb), renderTargets: nRt + c.rb.size, geometriaMB: MB(buf), buffers: c.buf.size, pantallaMB: MB(screen), totalMB: MB(sum) });
  }
  texRows.sort((a, b) => b._b - a._b);
  // Texturas sin nombre agrupadas por tamaño y formato (render targets, texturas generadas, otros contextos)
  const groups = new Map();
  for (const t of texRows) {
    const k = groupKey(t);
    const g = groups.get(k) || { grupo: k, cantidad: 0, mb: 0 };
    g.cantidad++; g.mb += t._b; groups.set(k, g);
  }
  const grupos = [...groups.values()].map((g) => ({ ...g, mb: MB(g.mb) })).sort((a, b) => b.mb - a.mb);
  return {
    porEstado: byState(texRows),
    totalMB: MB(total),
    nota: 'Solo lo que reserva el juego (texturas, render targets, buffers y la pantalla de cada contexto). El driver añade algo más.',
    contextos: ctxRows,
    grupos: grupos.slice(0, 40),
    texturas: texRows.slice(0, 80).map(({ _n, _b, ...r }) => r),
    _all: texRows,
  };
}

export function installGpuProbe(game) {
  installHooks();
  gameRef = game;
  const api = async () => {
    ownerTracking = true;
    const rep = await buildReport(game);
    console.log(`[gpu] El juego tiene reservados ${rep.totalMB} MB en la tarjeta gráfica.`);
    console.table(rep.contextos);
    console.table(rep.porEstado);
    console.table(rep.grupos.slice(0, 25));
    console.table(rep.texturas.slice(0, 30));
    const { _all, ...out } = rep;
    api.last = out;
    return out;
  };
  api.mark = () => {
    ownerTracking = true;
    markSet = new Set();
    for (const c of contexts.values()) { for (const r of c.tex.values()) markSet.add(r.n); for (const b of c.buf.values()) markSet.add(b.n); for (const b of c.rb.values()) markSet.add(b.n); }
    console.log(`[gpu] Marca guardada (${markSet.size} objetos). Juega un rato y luego lkDebug.gpu.diff().`);
    return markSet.size;
  };
  api.diff = async () => {
    if (!markSet) { console.log('[gpu] Primero lkDebug.gpu.mark().'); return null; }
    const rep = await buildReport(game);
    const nuevosTodo = rep._all.filter((t) => !markSet.has(t._n));
    const nuevos = nuevosTodo.filter((t) => t.tipo !== 'renderbuffer');
    let bufNew = 0, nBuf = 0, rbNew = 0;
    const alive = new Set();
    for (const c of contexts.values()) {
      for (const b of c.buf.values()) { alive.add(b.n); if (!markSet.has(b.n)) { bufNew += b.bytes; nBuf++; } }
      for (const b of c.rb.values()) { alive.add(b.n); if (!markSet.has(b.n)) rbNew += b.bytes; }
      for (const r of c.tex.values()) alive.add(r.n);
    }
    let freed = 0; for (const n of markSet) if (!alive.has(n)) freed++;
    const g = new Map();
    for (const t of nuevosTodo) {
      const k = groupKey(t);
      const e = g.get(k) || { grupo: k, cantidad: 0, mb: 0 }; e.cantidad++; e.mb += t._b; g.set(k, e);
    }
    const grupos = [...g.values()].map((e) => ({ ...e, mb: MB(e.mb) })).sort((a, b) => b.mb - a.mb);
    const out = {
      texturasNuevasMB: MB(nuevos.reduce((a, t) => a + t._b, 0)), texturasNuevas: nuevos.length,
      geometriaNuevaMB: MB(bufNew), buffersNuevos: nBuf, renderbuffersNuevosMB: MB(rbNew), liberadosDesdeLaMarca: freed,
      totalAhoraMB: rep.totalMB, porEstado: byState(nuevosTodo), grupos: grupos.slice(0, 40),
    };
    console.log(`[gpu] Desde la marca: +${out.texturasNuevasMB} MB en ${out.texturasNuevas} texturas, +${out.geometriaNuevaMB} MB de geometría en ${nBuf} buffers; ${freed} objetos de la marca ya liberados. Total ahora ${out.totalAhoraMB} MB.`);
    console.table(out.porEstado);
    console.table(grupos.slice(0, 25));
    api.lastDiff = out;
    return out;
  };
  api.export = async () => {
    const rep = api.lastDiff ? { informe: await api(), diff: api.lastDiff } : { informe: await api() };
    const blob = new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lunakai-gpu-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return rep;
  };
  (window.lkDebug ||= {}).gpu = api;
  return api;
}

// Se instala al importar el módulo: así cuenta desde el primer contexto WebGL
try { installHooks(); } catch (_) { /* opcional */ }
