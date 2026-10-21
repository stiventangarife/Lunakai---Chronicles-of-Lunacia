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

/** Sube a la GPU las texturas ya decodificadas de los materiales de `root`. Devuelve cuántas. */
export function uploadTextures(renderer, root) {
  if (!renderer || typeof renderer.initTexture !== 'function' || !root) return 0;
  let uploaded = 0;
  const seen = new Set();
  const tryTex = (t) => {
    if (!t || !t.isTexture || seen.has(t) || t.isRenderTargetTexture) return;
    seen.add(t);
    const img = t.image;
    if (!img || img.complete === false) return; // aún cargando: se subirá cuando llegue
    if (!t.isDataTexture && !t.isData3DTexture && !t.isDataArrayTexture && !t.isCompressedTexture && img.width === 0) return;
    try { renderer.initTexture(t); uploaded++; } catch (_) { /* opcional */ }
  };
  root.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
    if (!mats) return;
    for (const m of mats) {
      if (!m) continue;
      for (const k in m) { const v = m[k]; if (v && v.isTexture) tryTex(v); }
      if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) tryTex(v); }
    }
  });
  if (root.isScene && root.background && root.background.isTexture) tryTex(root.background);
  return uploaded;
}

/**
 * Compila todos los materiales de `scene` (también los objetos ocultos) con las luces, niebla y
 * destino reales, y sube sus texturas.
 * @returns {Promise<{programs:number,total:number,textures:number,ms:number}>}
 */
export async function warmupRender(renderer, scene, camera, { target = null } = {}) {
  const t0 = performance.now();
  if (!renderer || !scene || !camera) return { programs: 0, total: 0, textures: 0, ms: 0 };
  const textures = uploadTextures(renderer, scene);
  const before = renderer.info && renderer.info.programs ? renderer.info.programs.length : 0;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  let pending = null;
  let materials = null;
  try {
    // compileAsync solo aporta con KHR_parallel_shader_compile; sin ella, compile() síncrono
    const parallel = !!(renderer.compileAsync && renderer.extensions && renderer.extensions.has && renderer.extensions.has('KHR_parallel_shader_compile'));
    if (parallel) pending = renderer.compileAsync(scene, camera);
    else materials = renderer.compile(scene, camera);
  } finally {
    renderer.setRenderTarget(prev);
  }
  if (pending) await pending;
  else if (materials && typeof materials[Symbol.iterator] === 'function') {
    // Sin compilación en paralelo, el driver termina de enlazar cada programa en su primer uso.
    // Se fuerza aquí (todavía detrás de la pantalla de carga / el velo).
    for (const m of materials) {
      try { const p = renderer.properties.get(m).currentProgram; if (p) p.getUniforms(); } catch (_) { /* opcional */ }
    }
  }
  const total = renderer.info && renderer.info.programs ? renderer.info.programs.length : 0;
  return { programs: total - before, total, textures, ms: Math.round(performance.now() - t0) };
}
