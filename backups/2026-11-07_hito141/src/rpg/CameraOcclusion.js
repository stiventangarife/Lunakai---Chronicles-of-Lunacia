// CameraOcclusion.js — Que la cámara del mundo no se meta dentro de casas, rocas o laderas (Hito 74).
//
// Dos piezas, como el «spring arm» + «fade» de los motores de juego:
//  1. Brazo de cámara con colisión: un rayo desde la cabeza del personaje hasta donde querría estar la cámara se
//     prueba contra (a) cajas simplificadas de los objetos sólidos de la isla (casas, rocas, columnas, cristales…,
//     una caja por malla o por instancia, calculadas una vez por isla y guardadas en una rejilla de 8 m) y (b) el
//     terreno (12 muestras de altura). Si choca, la cámara se pone delante del obstáculo; al quedar libre vuelve
//     despacio a su distancia.
//  2. Transparencia para lo fino (árboles, troncos, arbustos): no acercan la cámara; lo que tapa al personaje se
//     «agujerea» con un tramado suave alrededor de la línea cámara-personaje (shader, sin coste de CPU).
// Coste por fotograma: unas decenas de pruebas de caja y 12 lecturas de altura; nada si no hay obstáculos cerca.
//
// Hito 79: cajas orientadas (giran con cada casa, en vez de una caja alineada al mundo que en una casa girada es
// mucho más grande que la casa) y lo pequeño (faroles, postes, carteles, vallas, cajas) ya no acerca la cámara.
import * as THREE from 'three';

const CELL = 8;
const INV = 1 / CELL;
const key = (ix, iz) => (ix + 2048) * 4096 + (iz + 2048);

// Lo que NO bloquea la cámara: suelo, cielo, agua, vegetación (se transparenta), efectos, decoración pequeña
const SKIP = /Terrain|Sky|Ocean|Water|Lake|Pond|River|Swamp|Grass|Flower|Tile|Foliage|Tree|Trunk|Leaf|Leaves|Bush|Shrub|Fern|Reed|Willow|Particle|Footstep|Wade|Horizon|FarRange|Karst|Cloud|Mist|Fog|Shadow|Decal|Path|Road|Glow|Light|Butterfl|Fish|Pebble|Vine|Mushroom|Spore|Firefl|Dust|Foam|Ring|Arrow|Beacon|Nameplate|Aurora|Veil|Spark|Smoke|Fire|Flame|Ember|Snow|Rain|Distant|Silhouette|Islet|Stardust|Wisp|Mote|Cattail|Lily|Petal|Slab|Flagstone|Twig|Plinth/i;
// Objetos pequeños o finos (por nombre): ni acercan la cámara ni hace falta agujerearlos
const SMALL_SOLID = /Lamp|Lantern|Post|Sign|Fence|Rail|Totem|Barrel|Crate|Bucket|Stake|Pole|Torch|Flag|Banner/i;
// Lo fino que se transparenta (nombre de la malla)
const SEE_THROUGH = /Tree|Trunk|Foliage|Leaf|Leaves|Bush|Shrub|Palm|Pine|Fir|Willow|Fern|Reed|Cattail/i;

export class CameraOcclusion {
  constructor(om) {
    this.om = om;
    this.boxes = [];               // { minX…maxZ (caja del mundo, para la rejilla), inv (mundo → local), lx0…lz1 (caja local), q }
    this.grid = new Map();
    this._zoneKey = null;
    this._rebuildAt = [];
    this._stamp = 0;
    this._patched = new WeakSet();
    // Uniformes compartidos por todos los materiales transparentables
    this.see = {
      uSeeP: { value: new THREE.Vector3() },  // cabeza del personaje en espacio de cámara
      uSeeR: { value: 1.5 },                  // radio del agujero (m)
      uSeeOn: { value: 0 }
    };
    this._tmp = new THREE.Vector3();
  }

  // ------------------------------------------------------------------ construcción por isla
  _skipRoots() {
    const om = this.om, s = new Set();
    if (om.player) { if (om.player.group) s.add(om.player.group); if (om.player.companionGroup) s.add(om.player.companionGroup); }
    (om.npcManager?.npcs || []).forEach((n) => { if (n?.group) s.add(n.group); });
    (om.monsters?.monsters || []).forEach((m) => { if (m?.group) s.add(m.group); });
    return s;
  }

  /**
   * 29-oct: llamar detrás del telón, ANTES del precalentado de shaders. La transparencia de lo fino cambia el shader de
   * cada material que toca (_patchSeeThrough → needsUpdate): si se hace con el juego ya visible, cada material
   * recompila en pleno juego. Medido: un fotograma de 18 s al abrir el telón (13 shaders de árboles y edificios) por el
   * rebuild que llegaba 600 ms después de entrar en la zona. Aquí se aplica ya, también a lo que aún está oculto
   * (los árboles de GenshinTrees siguen ocultos hasta su primer recorte), y el precalentado compila esas versiones.
   */
  prepareForWarmup() {
    try {
      this.rebuild({ includeHidden: true });
      this._zoneKey = this.om?.worldMapManager?.currentMapDef?.id || null;
      const now = performance.now();
      this._rebuildAt = [now + 4000, now + 12000]; // las cajas ya están: solo los repasos por si algo llega tarde
    } catch (e) {
      console.warn('[CameraOcclusion] preparación omitida', e);
    }
  }

  /** @param {{ includeHidden?: boolean }} [opts] includeHidden: también parchea (por nombre) lo oculto; cajas solo de lo visible */
  rebuild({ includeHidden = false } = {}) {
    const om = this.om;
    if (!om?.scene) return;
    const t0 = performance.now();
    this.boxes.length = 0; this.grid.clear();
    const skipRoots = this._skipRoots();
    const box = new THREE.Box3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
    const sc = new THREE.Vector3(), ax = new THREE.Vector3();
    this.skippedSmall = 0;
    // lb: caja local de la geometría · mw: matriz local → mundo. Devuelve true (bloquea), 'float' (flota: se transparenta) o false
    const add = (lb, mw, nm = '') => {
      // Tamaño real (en metros) de la caja orientada: lado local × escala de ese eje
      sc.set(ax.setFromMatrixColumn(mw, 0).length(), ax.setFromMatrixColumn(mw, 1).length(), ax.setFromMatrixColumn(mw, 2).length());
      const ex = (lb.max.x - lb.min.x) * sc.x, ey = (lb.max.y - lb.min.y) * sc.y, ez = (lb.max.z - lb.min.z) * sc.z;
      if (!(Math.min(ex, ey, ez) > 0)) return false;
      const b = box.copy(lb).applyMatrix4(mw);
      const sx = b.max.x - b.min.x, sz = b.max.z - b.min.z, sy = b.max.y - b.min.y;
      if (!(sy > 1.4) || sx > 70 || sz > 70) return false;                             // demasiado bajo o gigante (suelo, isla)
      // Lo que flota (copas, tejadillos sueltos, faroles colgados, carteles altos) no acerca la cámara: se transparenta
      const gy = typeof om.getGroundHeight === 'function' ? om.getGroundHeight((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2) : null;
      if (Number.isFinite(gy) && b.min.y > gy + 2.2) { this.skippedSmall++; return 'float'; }
      // Lo pequeño o fino no acerca la cámara: faroles, postes, carteles, vallas, cajas, barriles…
      const dims = [ex, ey, ez].sort((p, q) => p - q);                                  // [fino, medio, largo]
      if (dims[0] < 0.35 || dims[1] < 1.3) { this.skippedSmall++; return false; }
      const inv = new THREE.Matrix4().copy(mw).invert();
      const o = {
        minX: b.min.x, minY: b.min.y, minZ: b.min.z, maxX: b.max.x, maxY: b.max.y, maxZ: b.max.z, q: 0,
        e: inv.elements, lx0: lb.min.x, ly0: lb.min.y, lz0: lb.min.z, lx1: lb.max.x, ly1: lb.max.y, lz1: lb.max.z,
        px: 1 / sc.x, py: 1 / sc.y, pz: 1 / sc.z,                                       // 1 m del mundo en unidades locales
        n: nm,                                                                          // nombre (para depurar)
      };
      this.boxes.push(o);
      for (let ix = Math.floor(o.minX * INV); ix <= Math.floor(o.maxX * INV); ix++) {
        for (let iz = Math.floor(o.minZ * INV); iz <= Math.floor(o.maxZ * INV); iz++) {
          const k = key(ix, iz); let c = this.grid.get(k); if (!c) this.grid.set(k, (c = [])); c.push(o);
        }
      }
      return true;
    };
    const walk = (obj, visible) => {
      if (skipRoots.has(obj)) return;
      const vis = visible && obj.visible;
      if (!vis) {
        if (!includeHidden) return;
        // 29-oct: oculto (p. ej. árboles antes de su primer recorte): sin cajas, solo la transparencia por nombre
        if (obj.isMesh && !obj.isSkinnedMesh && obj.material) {
          const name = `${obj.name || ''}|${obj.parent?.name || ''}|${obj.parent?.parent?.name || ''}`;
          if (SEE_THROUGH.test(name)) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((mt) => this._patchSeeThrough(mt));
        }
        for (let i = 0; i < obj.children.length; i++) walk(obj.children[i], false);
        return;
      }
      // Hito 94: una pieza puede traer sus propias cajas (userData.cameraBoxes, Box3 en sus ejes locales) en lugar de
      // la de toda su geometría (p. ej. un arco: pilares y muros, sin el hueco), o pedir que se ignore (cameraIgnore)
      if (obj.isMesh && obj.userData?.cameraIgnore) { this.skippedSmall++; }
      else if (obj.isMesh && Array.isArray(obj.userData?.cameraBoxes)) {
        const name = `${obj.name || ''}|${obj.parent?.name || ''}|${obj.parent?.parent?.name || ''}`;
        let blocks = false;
        obj.userData.cameraBoxes.forEach((lb) => { if (add(lb, obj.matrixWorld, name)) blocks = true; });
        if (blocks) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((mt) => this._patchSeeThrough(mt));
      }
      else if (obj.isMesh && !obj.isSkinnedMesh && obj.geometry) {
        // Hito 79: el nombre de la malla y de sus dos padres (en los modelos la malla se llama «Mesh» y el nombre útil,
        // p. ej. «GatherIslandTree», está más arriba)
        const name = `${obj.name || ''}|${obj.parent?.name || ''}|${obj.parent?.parent?.name || ''}`;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        if (SEE_THROUGH.test(name)) mats.forEach((mt) => this._patchSeeThrough(mt));
        else if (SMALL_SOLID.test(name)) this.skippedSmall++;
        else if (!SKIP.test(name) && !mats.every((mt) => mt && (mt.transparent && mt.opacity < 0.5))) {
          const g = obj.geometry;
          if (!g.boundingBox) g.computeBoundingBox();
          let blocks = false;
          if (obj.isInstancedMesh) {
            const n = Math.min(obj.count, 4000);
            for (let i = 0; i < n; i++) {
              obj.getMatrixAt(i, im); m.multiplyMatrices(obj.matrixWorld, im);
              if (add(g.boundingBox, m, name)) blocks = true;                                  // true o 'float'
            }
          } else {
            blocks = add(g.boundingBox, obj.matrixWorld, name);
          }
          // Hito 79: lo que bloquea también se puede agujerear (cuando la cámara solo roza una esquina no se acerca:
          // la esquina se transparenta, como los árboles)
          if (blocks) mats.forEach((mt) => this._patchSeeThrough(mt));
        }
      }
      for (let i = 0; i < obj.children.length; i++) walk(obj.children[i], vis);
    };
    om.scene.updateMatrixWorld(true);
    walk(om.scene, true);
    this.buildMs = performance.now() - t0;
    console.log(`[CameraOcclusion] ${this.boxes.length} cajas que bloquean la cámara, ${this.skippedSmall} objetos pequeños ignorados (${this.buildMs.toFixed(0)} ms)`);
  }

  /** Llamar cada fotograma: rehace las cajas al cambiar de isla (y otra vez cuando terminan de cargar los modelos). */
  tick() {
    const k = this.om?.worldMapManager?.currentMapDef?.id || null;
    const now = performance.now();
    if (k !== this._zoneKey) { this._zoneKey = k; this._rebuildAt = [now + 600, now + 4000, now + 12000]; }
    if (this._rebuildAt.length && now >= this._rebuildAt[0]) { this._rebuildAt.shift(); this.rebuild(); }
  }

  // ------------------------------------------------------------------ brazo con colisión
  /**
   * Fracción [0, 1] del segmento a → b hasta el primer obstáculo (1 = libre).
   * pad: separación que se deja con las cajas (m).
   */
  cast(a, b, pad = 0.3) {
    let best = 1;
    this.lastHit = null;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    // Cajas: las de las celdas que toca el segmento (en planta)
    if (this.boxes.length) {
      const q = ++this._stamp;
      const len = Math.hypot(dx, dz);
      const steps = Math.max(1, Math.ceil(len / (CELL * 0.5)));
      for (let s = 0; s <= steps; s++) {
        const px = a.x + dx * (s / steps), pz = a.z + dz * (s / steps);
        const ix0 = Math.floor((px - 1) * INV), ix1 = Math.floor((px + 1) * INV), iz0 = Math.floor((pz - 1) * INV), iz1 = Math.floor((pz + 1) * INV);
        for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
          const c = this.grid.get(key(ix, iz)); if (!c) continue;
          for (let i = 0; i < c.length; i++) {
            const o = c[i]; if (o.q === q) continue; o.q = q;
            // Descarte rápido con la caja del mundo; la prueba buena es con la caja orientada (en el espacio del objeto,
            // donde el segmento sigue siendo un segmento con el mismo t)
            if (slab(a.x, a.y, a.z, dx, dy, dz, o.minX - pad, o.minY - pad, o.minZ - pad, o.maxX + pad, o.maxY + pad, o.maxZ + pad) < 0) continue;
            const e = o.e;
            const ax0 = e[0] * a.x + e[4] * a.y + e[8] * a.z + e[12], ay0 = e[1] * a.x + e[5] * a.y + e[9] * a.z + e[13], az0 = e[2] * a.x + e[6] * a.y + e[10] * a.z + e[14];
            const ldx = e[0] * dx + e[4] * dy + e[8] * dz, ldy = e[1] * dx + e[5] * dy + e[9] * dz, ldz = e[2] * dx + e[6] * dy + e[10] * dz;
            const qx = pad * o.px, qy = pad * o.py, qz = pad * o.pz;
            const x0 = o.lx0 - qx, y0 = o.ly0 - qy, z0 = o.lz0 - qz, x1 = o.lx1 + qx, y1 = o.ly1 + qy, z1 = o.lz1 + qz;
            // si el personaje ya está dentro (p. ej. bajo un arco o un tejado), esa caja no cuenta
            if (ax0 > x0 && ax0 < x1 && ay0 > y0 && ay0 < y1 && az0 > z0 && az0 < z1) continue;
            const t = slab(ax0, ay0, az0, ldx, ldy, ldz, x0, y0, z0, x1, y1, z1);
            if (t >= 0 && t < best) { best = t; this.lastHit = o; }
          }
        }
      }
    }
    // Terreno (laderas y paredes entre la cámara y el personaje)
    const om = this.om;
    if (om && typeof om.getGroundHeight === 'function') {
      const N = 12;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        if (t >= best) break;
        const x = a.x + dx * t, y = a.y + dy * t, z = a.z + dz * t;
        if (om.getGroundHeight(x, z) + 0.35 > y) { best = Math.min(best, Math.max(0, t - 1 / N)); this.lastHit = 'terrain'; break; }
      }
    }
    return best;
  }

  /** ¿El punto está dentro (o a menos de `pad` m) de alguna caja? (la cámara metida en una casa) */
  inside(p, pad = 0.25) {
    const c = this.grid.get(key(Math.floor(p.x * INV), Math.floor(p.z * INV)));
    if (!c) return false;
    for (let i = 0; i < c.length; i++) {
      const o = c[i], e = o.e;
      if (p.x < o.minX - pad || p.x > o.maxX + pad || p.y < o.minY - pad || p.y > o.maxY + pad || p.z < o.minZ - pad || p.z > o.maxZ + pad) continue;
      const lx = e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12], ly = e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13], lz = e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14];
      if (lx > o.lx0 - pad * o.px && lx < o.lx1 + pad * o.px && ly > o.ly0 - pad * o.py && ly < o.ly1 + pad * o.py && lz > o.lz0 - pad * o.pz && lz < o.lz1 + pad * o.pz) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ transparencia de lo fino
  _patchSeeThrough(mat) {
    if (!mat || this._patched.has(mat)) return;
    if (!(mat.isMeshToonMaterial || mat.isMeshStandardMaterial || mat.isMeshLambertMaterial || mat.isMeshPhongMaterial)) return;
    this._patched.add(mat);
    const U = this.see;
    const prev = mat.onBeforeCompile;
    const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
    mat.onBeforeCompile = (shader, renderer) => {
      if (prev) prev.call(mat, shader, renderer);
      shader.uniforms.uSeeP = U.uSeeP; shader.uniforms.uSeeR = U.uSeeR; shader.uniforms.uSeeOn = U.uSeeOn;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform vec3 uSeeP; uniform float uSeeR; uniform float uSeeOn;`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (uSeeOn > 0.5) {
            vec3 seeF = -vViewPosition;                       // fragmento en espacio de cámara (la cámara en el origen)
            float seeT = dot(seeF, uSeeP) / max(dot(uSeeP, uSeeP), 1e-4);
            if (seeT > 0.02 && seeT < 0.97) {                 // entre la cámara y el personaje
              float seeD = length(seeF - uSeeP * seeT);
              float seeRad = uSeeR * (0.45 + 0.55 * seeT);    // cono: más ancho junto al personaje
              if (seeD < seeRad) {
                float seeK = seeD / seeRad;
                float seeN = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
                if (seeN > seeK * seeK * 0.85) discard;       // tramado: casi vacío en el centro, suave en el borde
              }
            }
          }`);
    };
    mat.customProgramCacheKey = () => `${prevKey()}|lk-see`;
    mat.needsUpdate = true;
  }

  /** Cada fotograma, tras colocar la cámara: dónde está la cabeza del personaje vista desde la cámara. */
  updateSeeThrough(camera, head, on = true) {
    this.see.uSeeOn.value = on ? 1 : 0;
    if (!on) return;
    camera.updateMatrixWorld();
    this._tmp.copy(head).applyMatrix4(camera.matrixWorldInverse);
    this.see.uSeeP.value.copy(this._tmp);
  }
}

/** Rayo (origen o, dirección d sin normalizar, t∈[0,1]) contra caja: t de entrada o -1. */
function slab(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = 1;
  const axis = (o, d, a, b) => {
    if (Math.abs(d) < 1e-9) return o >= a && o <= b;
    let t0 = (a - o) / d, t1 = (b - o) / d;
    if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
    if (t0 > tmin) tmin = t0;
    if (t1 < tmax) tmax = t1;
    return tmin <= tmax;
  };
  if (!axis(ox, dx, x0, x1) || !axis(oy, dy, y0, y1) || !axis(oz, dz, z0, z1)) return -1;
  return tmin;
}
