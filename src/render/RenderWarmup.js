// RenderWarmup.js — Precalentado de shaders y texturas para usar detrás de una pantalla de carga o un velo.
//
// three.js compila el programa de un material la primera vez que lo dibuja, y sube cada textura
// a la GPU la primera vez que la usa. Si eso ocurre durante el juego, el fotograma se congela
// (de decenas a cientos de ms). Aquí se hace por adelantado.
//
// Detalle importante: la clave de un programa depende del destino del render. Cuando la escena
// se dibuja dentro de un EffectComposer (render target) el programa no lleva tone mapping y usa
// espacio de color lineal; si se compila contra la pantalla, la clave no coincide y se vuelve a
// compilar en el primer fotograma real. Por eso se acepta `target` (p. ej. composer.readBuffer).
//
// El trabajo se reparte en porciones de ~12 ms con una pausa entre porciones, para que la pantalla
// de carga (o el velo de combate) siga respondiendo en lugar de congelarse varios segundos.

const BUDGET_MS = 12;
const yieldToBrowser = () => new Promise((r) => setTimeout(r, 0));

/** Devuelve una función que cede el hilo cuando la porción actual supera el presupuesto. */
function makeSlicer(budget = BUDGET_MS) {
  let start = performance.now();
  return async () => {
    if (performance.now() - start < budget) return;
    await yieldToBrowser();
    start = performance.now();
  };
}

/** Recorre `root` sin entrar en los subárboles de `skip` (p. ej. islas inactivas). */
function walk(root, skip, cb) {
  if (skip && skip.has(root)) return;
  cb(root);
  const ch = root.children;
  for (let i = 0; i < ch.length; i++) walk(ch[i], skip, cb);
}

function collectTextures(root, skip = null) {
  const out = [];
  const seen = new Set();
  const add = (t) => {
    if (!t || !t.isTexture || seen.has(t) || t.isRenderTargetTexture) return;
    seen.add(t);
    out.push(t);
  };
  walk(root, skip, (o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
    if (!mats) return;
    for (const m of mats) {
      if (!m) continue;
      for (const k in m) { const v = m[k]; if (v && v.isTexture) add(v); }
      if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) add(v); }
    }
  });
  if (root.isScene && root.background && root.background.isTexture) add(root.background);
  return out;
}

function uploadable(t) {
  // Texturas que su dueño liberó a propósito (p. ej. variantes ocultas del Sapidae): no se suben
  if (t.userData && t.userData.lkNoPrewarm) return false;
  const img = t.image;
  if (!img || img.complete === false) return false; // aún cargando: se subirá cuando llegue
  if (!t.isDataTexture && !t.isData3DTexture && !t.isDataArrayTexture && !t.isCompressedTexture && img.width === 0) return false;
  return true;
}

/** Sube a la GPU (por porciones) las texturas ya decodificadas de los materiales de `root`. */
export async function uploadTextures(renderer, root, slice = makeSlicer(), skip = null) {
  if (!renderer || typeof renderer.initTexture !== 'function' || !root) return 0;
  let uploaded = 0;
  for (const t of collectTextures(root, skip)) {
    if (slice.late && slice.late()) break;
    if (!uploadable(t)) continue;
    try { renderer.initTexture(t); uploaded++; } catch (_) { /* opcional */ }
    await slice();
  }
  return uploaded;
}

/** Todos los objetos de `scene` que tienen material (también los ocultos), en una lista plana. */
function objectsWithMaterial(scene, skip = null) {
  const out = [];
  walk(scene, skip, (o) => { if (o.material) out.push(o); });
  return out;
}

/**
 * Libera de la GPU las texturas de los subárboles `roots` (p. ej. la isla que se deja atrás), salvo
 * las que también usa algo visible fuera de ellos. Las imágenes se conservan: si la isla vuelve a
 * mostrarse, three.js (o el precalentado) las sube otra vez.
 * @returns {number} texturas liberadas
 */
export function releaseTextures(scene, roots) {
  if (!scene || !roots || roots.length === 0) return 0;
  const skip = new Set(roots);
  const keep = new Set(collectTextures(scene, skip));
  let n = 0;
  for (const r of roots) {
    for (const t of collectTextures(r)) {
      if (keep.has(t)) continue;
      t.dispose();
      n++;
    }
  }
  return n;
}

/**
 * Espera (sin bloquear) a que el driver termine de enlazar los programas de estos materiales, con
 * KHR_parallel_shader_compile. Un programa que se borró mientras tanto (su material se destruyó: p. ej.
 * un efecto que ya terminó) deja de esperarse: preguntar por él daba el aviso de WebGL
 * «glGetProgramiv: Program object expected» cada 10 ms. Por eso tampoco se usa renderer.compileAsync,
 * que en ese caso no termina nunca y sigue preguntando el resto de la partida.
 * @param {Iterable<THREE.Material>} materials
 * @param {number} timeoutMs tope de espera
 * @param {() => boolean} [abort] se deja de esperar si devuelve true
 */
export async function waitProgramsReady(renderer, materials, timeoutMs = 8000, abort = null) {
  const programOf = (m) => { try { return renderer.properties.get(m).currentProgram || null; } catch (_) { return null; } };
  const pending = new Set([...materials].map(programOf).filter(Boolean));
  const until = performance.now() + Math.max(0, timeoutMs);
  const live = () => (renderer.info && renderer.info.programs) || null;
  while (pending.size && performance.now() < until && !(abort && abort())) {
    const progs = live();
    for (const p of pending) {
      if (progs && !progs.includes(p)) { pending.delete(p); continue; } // ya no existe
      try { if (!p.isReady || p.isReady()) pending.delete(p); } catch (_) { pending.delete(p); }
    }
    if (pending.size) await new Promise((r) => setTimeout(r, 10));
  }
}

/**
 * Compila todos los materiales de `scene` (también los objetos ocultos) con las luces, niebla y
 * destino reales, y sube sus texturas. Todo por porciones.
 *
 * Truco: renderer.compile(obj, cam, escena) toma las luces de `escena` y además las de `obj`. Se le
 * pasa un objeto "lote" que solo enumera mallas (sin luces propias): las luces se cuentan una vez,
 * igual que en el render real, y basta con unas pocas llamadas para toda la escena.
 * @returns {Promise<{programs:number,total:number,textures:number,ms:number}>}
 */
export async function warmupRender(renderer, scene, camera, { target = null, deadline = Infinity, skipRoots = null } = {}) {
  const t0 = performance.now();
  if (!renderer || !scene || !camera) return { programs: 0, total: 0, textures: 0, ms: 0 };
  // `deadline` (marca de performance.now()): pasado ese momento se deja de trabajar, para que nada
  // de esto caiga ya dentro del juego si quien llama dejó de esperar.
  const late = () => performance.now() > deadline || (renderer.getContext && renderer.getContext().isContextLost());
  const slice = makeSlicer();
  slice.late = late;
  // `skipRoots`: subárboles que no se preparan (islas inactivas: cuando se activen tendrán otras luces
  // y se compilarán de nuevo en su viaje; prepararlas ahora solo gasta tiempo y memoria)
  const skip = skipRoots && skipRoots.length ? new Set(skipRoots) : null;
  const textures = await uploadTextures(renderer, scene, slice, skip);
  const before = renderer.info && renderer.info.programs ? renderer.info.programs.length : 0;
  const materials = new Set();

  const list = objectsWithMaterial(scene, skip);
  const BATCH = 40;
  for (let i = 0; i < list.length; i += BATCH) {
    if (late()) break;
    const batch = list.slice(i, i + BATCH);
    const proxy = {
      traverse: (cb) => { for (const o of batch) cb(o); },
      traverseVisible: () => {}, // sin luces propias: se usan solo las de la escena real
    };
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    try {
      const mats = renderer.compile(proxy, camera, scene);
      if (mats && typeof mats[Symbol.iterator] === 'function') for (const m of mats) materials.add(m);
    } catch (_) {
      // un objeto raro (p. ej. material sin geometría) no debe invalidar el lote entero: uno a uno
      for (const o of batch) {
        try {
          const mats = renderer.compile({ traverse: (cb) => cb(o), traverseVisible: () => {} }, camera, scene);
          if (mats && typeof mats[Symbol.iterator] === 'function') for (const m of mats) materials.add(m);
        } catch (_e) { /* se omite ese objeto */ }
      }
    } finally {
      renderer.setRenderTarget(prev);
    }
    await slice();
  }

  // Terminar de enlazar: con KHR_parallel_shader_compile se espera a que el driver acabe (sin
  // bloquear); sin ella, se fuerza el enlazado aquí, por porciones, detrás del telón.
  const parallel = !!(renderer.extensions && renderer.extensions.has && renderer.extensions.has('KHR_parallel_shader_compile'));
  const programOf = (m) => { try { return renderer.properties.get(m).currentProgram || null; } catch (_) { return null; } };
  if (parallel) {
    await waitProgramsReady(renderer, materials, Math.min(deadline, performance.now() + 20000) - performance.now(), late);
  } else {
    for (const m of materials) {
      if (late()) break;
      const p = programOf(m);
      try { if (p) p.getUniforms(); } catch (_) { /* opcional */ }
      await slice();
    }
  }

  const total = renderer.info && renderer.info.programs ? renderer.info.programs.length : 0;
  return { programs: total - before, total, textures, ms: Math.round(performance.now() - t0) };
}

/**
 * Hito 113 — Precompila y sube las texturas de unos pocos objetos ya montados en `scene` (p. ej. el arma que acaba de
 * equipar un Axie), con el mismo destino que el render real, y espera a que el driver termine de enlazar (sin bloquear).
 * Es la versión pequeña de warmupRender: no recorre toda la escena.
 * @param {THREE.Object3D[]} objects
 * @returns {Promise<{programs:number, textures:number, ms:number}>}
 */
export async function warmupObjects(renderer, scene, camera, objects, { target = null, deadline = Infinity } = {}) {
  const t0 = performance.now();
  if (!renderer || !scene || !camera || !objects || !objects.length) return { programs: 0, textures: 0, ms: 0 };
  const late = () => performance.now() > deadline || (renderer.getContext && renderer.getContext().isContextLost());
  const slice = makeSlicer();
  slice.late = late;
  let textures = 0;
  for (const o of objects) textures += await uploadTextures(renderer, o, slice);
  const before = renderer.info && renderer.info.programs ? renderer.info.programs.length : 0;
  const proxy = { traverse: (cb) => { for (const o of objects) o.traverse(cb); }, traverseVisible: () => {} };
  const materials = new Set();
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  try {
    const mats = renderer.compile(proxy, camera, scene);
    if (mats && typeof mats[Symbol.iterator] === 'function') for (const m of mats) materials.add(m);
  } catch (_) { /* un objeto raro no debe impedir mostrar el resto */ } finally {
    renderer.setRenderTarget(prev);
  }
  const parallel = !!(renderer.extensions && renderer.extensions.has && renderer.extensions.has('KHR_parallel_shader_compile'));
  if (parallel) await waitProgramsReady(renderer, materials, Math.max(0, Math.min(deadline, performance.now() + 5000) - performance.now()), late);
  const total = renderer.info && renderer.info.programs ? renderer.info.programs.length : 0;
  return { programs: total - before, textures, ms: Math.round(performance.now() - t0) };
}
