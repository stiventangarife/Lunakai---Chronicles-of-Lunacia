import * as THREE from 'three';
import { cloneGLTF } from '../../../../render/ModelCache.js';
import { trackLoad } from '../../../../render/LoadGate.js';
import { ChimneySmoke, chimneyPoint } from '../../ChimneySmoke.js';

/**
 * IslandProps — GLB set pieces shared by the Grand Islands (Savanna, Arctic, Mystic, Genesis). Hito 55–58.
 *
 * · Same files as the Forest village, but under the `#islas` cache key: ForestVillage evicts its own copies
 *   (closing their texture bitmaps) when the player leaves the Forest, so the islands must not share its
 *   cache entries. The islands do share theirs (a house is loaded once for both). They never evict:
 *   WorldMapManager already releases the GPU textures of inactive islands and re-uploads them on return.
 * · scale = metres per GLB unit (the GLBs come shrunk to a ~1.9 m box). r = collider radius (m).
 * · ground: 'mid' (buildings) on gentle ground (≤ 25 cm of slope under the base) sits a little above the middle;
 *   on steeper ground it sits on the highest point (nothing buried) and a stone plinth fills the gap down to the
 *   lowest point (nothing floats), like the Forest village houses. 'min' sits on the lowest ground (small props).
 * · Front of every model = local +Z; yaw turns it to (sin yaw, cos yaw), like the NPC rotation.
 */
export const ISLAND_PROPS = {
  house: { file: 'house.glb', scale: 4, r: 3.3, ground: 'mid' },
  shop: { file: 'shop.glb', scale: 4, r: 3.8, ground: 'mid' },
  altar: { file: 'altar_atia.glb', scale: 4, r: 3.0, ground: 'mid' },
  totem: { file: 'totem.glb', scale: 2.5, r: 0.9 },
  totem_2: { file: 'totem_2.glb', scale: 2.5, r: 1.0 },
  totem_ice: { file: 'totem_ice.glb', scale: 3, r: 1.4 },
  flag: { file: 'flag.glb', scale: 2, r: 0.4 },
  statue_mystic: { file: 'statue_mystic.glb', scale: 1.3, r: 0.8 },
  // Genesis · Jardín Real (Hito 58): plush guardian in the centre, seven weapon statues on their own stone bases
  peluche: { file: 'peluche.glb', scale: 3, r: 2.4, ground: 'mid' },
  lanza: { file: 'lanza.glb', scale: 3, r: 1.2 },
  hacha: { file: 'hacha.glb', scale: 3, r: 1.4 },
  doble: { file: 'doble.glb', scale: 3, r: 1.3 },
  mando: { file: 'mando.glb', scale: 3, r: 1.4 },
  baston: { file: 'baston.glb', scale: 3, r: 1.4 },
  arco: { file: 'arco.glb', scale: 3, r: 1.3 },
  mana: { file: 'mana.glb', scale: 3, r: 1.2 },
  surf: { file: 'table_surf.glb', scale: 1.3, r: 0.6 },
  canoe: { file: 'balsa.glb', scale: 3.5, r: 0, float: true }
};

const urlOf = (name) => `./assets/environment/${ISLAND_PROPS[name].file}#islas`;
const _prepared = new WeakSet();
const SLOPE_FOR_PLINTH = 0.25;
// Plinths: one unit box (origin at its base) and one material per colour, shared by every island
let _plinthGeo = null;
const _plinthMats = new Map();
function plinthParts(color) {
  if (!_plinthGeo) { _plinthGeo = new THREE.BoxGeometry(1, 1, 1); _plinthGeo.translate(0, 0.5, 0); }
  let m = _plinthMats.get(color);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: true }); m.name = 'IslandPropPlinth'; _plinthMats.set(color, m); }
  return [_plinthGeo, m];
}

/**
 * Places a list of props under `parent`. Colliders are returned at once (callers register them before the
 * GLBs arrive); the models are added when loaded. One load per model: later copies share geometry and materials.
 * @param {THREE.Object3D} parent
 * @param {Array<{model:string,x:number,z:number,yaw?:number,name?:string,scale?:number,smoke?:boolean}>} list
 *   smoke: humo en la chimenea (solo `house`, Hito 96). El humo se añade a `parent` cuando cargan los modelos.
 * @param {{ height:(x:number,z:number)=>number, seaLevel?:number, plinthColor?:number }} opts
 * @returns {{ colliders:Array<[number,number,number]>, floating:Array, ready:Promise<void>, smoke:ChimneySmoke|null }}
 *   `smoke` se rellena al cargar (null si ninguna casa lleva humo).
 */
export function placeIslandProps(parent, list, { height, seaLevel = 0.45, plinthColor = 0x8c8378 }) {
  const colliders = [];
  const floating = [];
  list.forEach((it) => {
    const def = ISLAND_PROPS[it.model];
    const k = (it.scale ?? def.scale) / def.scale;
    if (def.r) colliders.push([it.x, it.z, def.r * k]);
  });
  const names = [...new Set(list.map((it) => it.model))];
  const result = { colliders, floating, ready: null, smoke: null };
  const chimneys = [];
  result.ready = Promise.all(names.map((n) => cloneGLTF(urlOf(n)).then(({ scene }) => [n, prepare(scene)])))
    .then((loaded) => {
      const scenes = new Map(loaded);
      const used = new Set();
      list.forEach((it) => {
        const src = scenes.get(it.model);
        const g = buildProp(it, used.has(it.model) ? src.clone() : src, height, seaLevel, plinthColor);
        used.add(it.model);
        parent.add(g);
        if (ISLAND_PROPS[it.model].float) floating.push({ g, y: g.position.y, x: it.x, z: it.z, yaw: it.yaw || 0 });
        if (it.smoke && it.model === 'house') {
          const o = src.userData.origin;
          chimneys.push(chimneyPoint({ x: it.x, y: g.position.y, z: it.z, yaw: it.yaw || 0, scale: it.scale ?? ISLAND_PROPS.house.scale, cx: o.cx, cy: o.minY, cz: o.cz }));
        }
      });
      if (chimneys.length) result.smoke = new ChimneySmoke(parent, chimneys);
      if (typeof window !== 'undefined') window.environmentSystem?.markShadowCastersDirty?.();
    })
    .catch((err) => console.error('[IslandProps] GLB models failed:', err));
  // 29-oct: changeMap espera estos modelos antes del precalentado (antes entraban con el telón ya abierto)
  trackLoad(result.ready, `props ${names.join('/')}`);
  return result;
}

/** Bobbing and rocking of floating props (same motion as the Forest raft). */
export function updateFloatingProps(floating, t) {
  for (const f of floating) {
    f.g.position.y = f.y + Math.sin(t * 1.3 + f.x) * 0.05;
    f.g.rotation.set(Math.sin(t * 0.9 + f.z) * 0.03, f.yaw, 0, 'YXZ');
  }
}

/** Centres the footprint on the origin with the base at y = 0 and stores the base footprint (lowest 5 %). */
function prepare(scene) {
  scene.position.set(0, 0, 0);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const base = new THREE.Box3(), v = new THREE.Vector3(), yCut = box.min.y + (box.max.y - box.min.y) * 0.05;
  scene.traverse((o) => {
    const pos = o.isMesh && o.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (v.y <= yCut) base.expandByPoint(v); }
  });
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  scene.position.set(-cx, -box.min.y, -cz);
  scene.userData.origin = { cx, cz, minY: box.min.y }; // para situar puntos del GLB (chimenea) en la pieza colocada
  scene.userData.foot = {
    hw: (box.max.x - box.min.x) / 2, hd: (box.max.z - box.min.z) / 2,
    bx: (base.min.x + base.max.x) / 2 - cx, bz: (base.min.z + base.max.z) / 2 - cz,
    bhw: (base.max.x - base.min.x) / 2, bhd: (base.max.z - base.min.z) / 2
  };
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.matrixAutoUpdate = false;
    o.updateMatrix();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    // Light is baked in the texture: no metal, matte (same as the Forest village)
    mats.forEach((m) => {
      if (!m || _prepared.has(m)) return;
      _prepared.add(m);
      m.metalness = 0;
      m.roughness = 0.85;
      m.needsUpdate = true;
    });
  });
  return scene;
}

function buildProp(it, scene, height, seaLevel, plinthColor) {
  const def = ISLAND_PROPS[it.model];
  const s = it.scale ?? def.scale;
  const yaw = it.yaw || 0;
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = !def.float; o.receiveShadow = true; } });
  const g = new THREE.Group();
  g.name = it.name || `IslandProp_${it.model}`;
  const model = new THREE.Group();   // scaled model; the plinth stays in metres
  model.add(scene);
  model.scale.setScalar(s);
  g.add(model);
  g.rotation.y = yaw;
  let y;
  if (def.float) y = seaLevel - 0.12 * (s / 3.5);   // shallow draft: the hull rides above the waves (was 0.45: water inside)
  else {
    const f = scene.userData.foot;
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const lx = (f.bx + (i / 2 - 1) * f.bhw) * s, lz = (f.bz + (j / 2 - 1) * f.bhd) * s;
      const gh = height(it.x + lx * c + lz * sn, it.z - lx * sn + lz * c);
      lo = Math.min(lo, gh); hi = Math.max(hi, gh);
    }
    if (def.ground !== 'mid') y = lo - 0.05;
    else if (hi - lo <= SLOPE_FOR_PLINTH) y = lo + (hi - lo) * 0.6;
    else {
      y = hi + 0.03;
      const [geo, mat] = plinthParts(plinthColor);
      const p = new THREE.Mesh(geo, mat);
      p.name = 'IslandPropPlinth';
      const bottom = lo - 0.3 - y;   // relative to the base of the model
      p.position.set(f.bx * s, bottom, f.bz * s);
      p.scale.set(f.bhw * 2 * s, 0.02 - bottom, f.bhd * 2 * s);
      p.castShadow = true;
      p.receiveShadow = true;
      g.add(p);
    }
  }
  g.position.set(it.x, y, it.z);
  if (!def.float) {
    g.updateMatrixWorld(true);
    g.traverse((o) => { o.matrixAutoUpdate = false; });
  }
  return g;
}
