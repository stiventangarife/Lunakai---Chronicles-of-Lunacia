// ShadowMapGC.js — Libera los mapas de sombra de las luces que llevan un rato sin dibujarse (30-oct).
//
// Cada isla (GrandIslandZone, Sabana, Bosque) tiene su propio sol con un mapa de sombras de 2048×2048, y el combate
// otro. three crea el mapa la primera vez que la luz proyecta sombra y no lo suelta nunca, aunque la luz se oculte
// (setVisible(false) al cambiar de isla) o su escena deje de dibujarse (el mundo durante un combate y al revés).
// Cada mapa son 32 MB (16 de color + 16 de profundidad): tras visitar varias islas y combatir había 6 (~190 MB).
//
// Cómo funciona: envuelve renderer.shadowMap.render, que three llama en cada render con las luces con sombra visibles
// de la escena que dibuja. Apunta cuándo se usó cada luz por última vez; cada ~2 s suelta el mapa de las que llevan
// más de IDLE_MS y más de IDLE_PASSES pases sin usarse (por pases: con la pestaña en segundo plano no se suelta nada).
// Cuando la luz vuelve, three ve shadow.map === null y lo crea de nuevo en el mismo pase. Si ese fotograma no tocaba
// recalcular sombras (el mundo abierto las recalcula uno de cada dos, EnvironmentSystem.render), se fuerza el pase:
// así nunca se dibuja un fotograma con el mapa vacío (todo en sombra).
//
// lkDebug.shadowGC() muestra qué luces tienen mapa y cuántos se han liberado.

const IDLE_MS = 8000;
const IDLE_PASSES = 240;
const SWEEP_MS = 2000;

export function installShadowMapGC(renderer, opts = {}) {
  const sm = renderer && renderer.shadowMap;
  if (!sm || typeof sm.render !== 'function' || sm._lkGC) return null;
  const idleMs = opts.idleMs ?? IDLE_MS;
  const idlePasses = opts.idlePasses ?? IDLE_PASSES;
  const sweepMs = opts.sweepMs ?? SWEEP_MS;

  const tracked = new Set();
  let pass = 0;
  let lastSweep = 0;
  let released = 0;
  let releasedBytes = 0;
  let rebuilt = 0;
  let seq = 0;

  const release = (light) => {
    const s = light.shadow;
    if (!s || !s.map) return;
    const w = s.map.width || 0, h = s.map.height || 0;
    s.map.dispose();
    s.map = null;
    if (s.mapPass) { s.mapPass.dispose(); s.mapPass = null; }
    released++;
    releasedBytes += w * h * 8; // color RGBA8 + profundidad
    s._lkReleased = true;
  };

  const sweep = (now) => {
    for (const l of tracked) {
      const s = l.shadow;
      if (!s || !s.map) { tracked.delete(l); continue; }
      if (pass - (s._lkPass || 0) > idlePasses && now - (s._lkT || 0) > idleMs) { release(l); tracked.delete(l); }
    }
  };

  const orig = sm.render;
  sm.render = function (lights, scene, camera) {
    if (lights && lights.length) {
      pass++;
      const now = performance.now();
      for (let i = 0; i < lights.length; i++) {
        const l = lights[i];
        const s = l.shadow;
        if (!s) continue;
        s._lkPass = pass;
        s._lkT = now;
        if (s.map === null) {
          if (!l.name) l.name = `${l.type}#${++seq}`; // nombre del mapa en lkDebug.gpu
          if (s._lkReleased) { rebuilt++; s._lkReleased = false; }
          // El mapa se crea en este pase: que el pase ocurra este fotograma (si no, se leería un mapa vacío)
          if (sm.enabled && sm.autoUpdate === false && sm.needsUpdate === false) sm.needsUpdate = true;
        }
        if (!tracked.has(l)) tracked.add(l);
      }
      if (now - lastSweep > sweepMs) { lastSweep = now; sweep(now); }
    }
    return orig.call(this, lights, scene, camera);
  };
  sm._lkGC = true;

  const api = () => {
    const rows = [];
    const now = performance.now();
    for (const l of tracked) {
      const s = l.shadow;
      if (!s || !s.map) continue;
      rows.push({ luz: l.name || l.type, mapa: `${s.map.width}×${s.map.height}`, MB: Math.round((s.map.width * s.map.height * 8) / 1048576), sinUsar_s: Math.round((now - (s._lkT || now)) / 1000) });
    }
    console.table(rows);
    console.log(`[sombras] ${rows.length} mapas vivos. Liberados ${released} (${Math.round(releasedBytes / 1048576)} MB) y recreados ${rebuilt} desde el inicio.`);
    return { vivos: rows, liberados: released, liberadosMB: Math.round(releasedBytes / 1048576), recreados: rebuilt };
  };
  api.releaseNow = () => { for (const l of [...tracked]) { const s = l.shadow; if (s && s._lkPass !== pass) { release(l); tracked.delete(l); } } return api(); };
  if (typeof window !== 'undefined') (window.lkDebug ||= {}).shadowGC = api;
  return api;
}
