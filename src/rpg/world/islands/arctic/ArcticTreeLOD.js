import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { getSoftToonRamp } from '../../demo_scena/genshin/GenshinMaterials.js';

/**
 * ArcticTreeLOD — Fade LOD for the Arctic trees (Arctic only; the shared IslandTrees kit is
 * not modified, its meshes are re-driven from here after they are built).
 *
 *   distance < NEAR            full brush-stroke tree (foliage cards + bark trunk)
 *   NEAR … FAR                 cross-fade: the full tree dissolves with a screen-space dither
 *                              while a low-poly proxy (same colour, snow caps) dithers in —
 *                              complementary patterns, so there is never a hole or a double tree
 *   distance > FAR             proxy only (≈80–140 tris instead of thousands)
 *
 * Instances are re-packed by camera distance (only when the camera has moved), so far trees
 * are really skipped by the GPU (vertex + shadow passes), not just hidden in the fragment.
 * Dead trees (no foliage) stay as they are.
 */
export const ARCTIC_TREE_LOD = { near: 70, far: 95, recomputeStep: 0.75 };

const DITHER_GLSL = /* glsl */ `
  float arcticLodNoise(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

/** Adds the dithered fade (aLodFade per instance) to a material, keeping its own patches. */
function addDitherFade(mat, invert) {
  if (mat.userData.arcticLod) return;
  mat.userData.arcticLod = true;
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(mat, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aLodFade;
        varying float vLodFade;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLodFade = aLodFade;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vLodFade;
        ${DITHER_GLSL}`)
      .replace('#include <clipping_planes_fragment>', `{
          float thr = arcticLodNoise(gl_FragCoord.xy);
          ${invert ? 'if (thr < 1.0 - vLodFade) discard;' : 'if (thr >= vLodFade) discard;'}
        }
        #include <clipping_planes_fragment>`);
  };
  mat.customProgramCacheKey = () => `${prevKey()}|arctic-lod-${invert ? 'in' : 'out'}`;
  mat.needsUpdate = true;
}

/** Same geometry buffers + its own per-instance fade attribute (trunk geometries are shared). */
function withFadeAttribute(geo, count) {
  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
  if (geo.index) g.setIndex(geo.index);
  geo.groups.forEach((gr) => g.addGroup(gr.start, gr.count, gr.materialIndex));
  g.boundingBox = geo.boundingBox ? geo.boundingBox.clone() : null;
  g.boundingSphere = geo.boundingSphere ? geo.boundingSphere.clone() : null;
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1);
  fade.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aLodFade', fade);
  return g;
}

/** Low-poly stand-in fitted to a bucket's foliage / trunk bounds (aPart: 0 fir crown, 1 trunk, 2 round crown). */
function proxyGeometry(kind, foliageGeo, trunkGeo) {
  foliageGeo.computeBoundingBox();
  const fb = foliageGeo.boundingBox;
  const cx = (fb.min.x + fb.max.x) / 2, cz = (fb.min.z + fb.max.z) / 2;
  const rx = (fb.max.x - fb.min.x) / 2, rz = (fb.max.z - fb.min.z) / 2;
  const r = Math.max(rx, rz) * 0.92;
  const y0 = fb.min.y, y1 = fb.max.y, h = y1 - y0;
  const parts = [];
  if (kind === 'conifer') {
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const t0 = i / tiers;
      const rr = r * (1.02 - t0 * 0.78);
      const th = h * (0.3 - t0 * 0.04);
      const c = new THREE.ConeGeometry(rr, th, 9, 2);
      // Droop the rim of each tier a little (silhouette of the fir boughs)
      const p = c.attributes.position;
      for (let v = 0; v < p.count; v++) if (p.getY(v) < -th * 0.49) p.setY(v, p.getY(v) - th * 0.12);
      c.computeVertexNormals();
      c.translate(cx, y0 + h * t0 * 0.8 + th / 2, cz);
      parts.push([c, 0, y0 + h * t0 * 0.8 - th * 0.12, th * 1.12]);
    }
  } else {
    // Lumpy crown: a core + clustered lobes (leafy silhouette); snow only on the top third
    const yTop = y0 + h * 0.62, hTop = h * 0.4;
    const main = new THREE.IcosahedronGeometry(1, 1);
    main.scale(rx * 0.8, h * 0.44, rz * 0.8);
    main.translate(cx, y0 + h * 0.5, cz);
    parts.push([main, 2, yTop, hTop]);
    const lobes = [[0.55, 0.35, 0.15], [-0.5, 0.42, -0.25], [0.1, 0.5, 0.55], [-0.15, 0.62, -0.5], [0.35, 0.72, -0.2], [-0.4, 0.3, 0.45]];
    for (const [ox, oy, oz] of lobes) {
      const lump = new THREE.IcosahedronGeometry(1, 0);
      lump.scale(rx * 0.45, h * 0.26, rz * 0.45);
      lump.translate(cx + ox * rx, y0 + h * oy, cz + oz * rz);
      parts.push([lump, 2, yTop, hTop]);
    }
  }
  trunkGeo.computeBoundingBox();
  const tb = trunkGeo.boundingBox;
  const tr = Math.max(0.12, Math.min(tb.max.x - tb.min.x, tb.max.z - tb.min.z) * 0.18);
  const tH = Math.max(0.5, y0 + h * 0.25 - tb.min.y);
  const trunk = new THREE.CylinderGeometry(tr * 0.7, tr, tH, 6, 1);
  trunk.translate((tb.min.x + tb.max.x) / 2, tb.min.y + tH / 2, (tb.min.z + tb.max.z) / 2);
  parts.push([trunk, 1]);
  const geos = parts.map(([g, part, ty0 = 0, tH = 1]) => {
    const n = g.index ? g.toNonIndexed() : g;
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', n.attributes.position);
    out.setAttribute('normal', n.attributes.normal);
    out.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count).fill(part), 1));
    // aTier: 0 at the bottom of the tier / crown, 1 at its top (snow sits on the upper part)
    const tier = new Float32Array(n.attributes.position.count);
    for (let v = 0; v < tier.length; v++) tier[v] = part === 1 ? 0 : Math.min(1, Math.max(0, (n.attributes.position.getY(v) - ty0) / tH));
    out.setAttribute('aTier', new THREE.BufferAttribute(tier, 1));
    return out;
  });
  const merged = mergeGeometries(geos, false);
  merged.computeBoundingSphere();
  return merged;
}

/** Toon proxy material: instance colour on the crown only, brown trunk, snow on upward faces. */
function proxyMaterial(snow) {
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getSoftToonRamp() });
  m.name = 'ArcticTreeProxy';
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aPart;
        attribute float aTier;
        varying vec3 vProxyCol;
        varying vec3 vProxyN;
        varying float vTier;
        varying float vPart;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 crown = vec3(1.0);
          #ifdef USE_INSTANCING_COLOR
            crown = instanceColor.rgb;
          #endif
          // Desaturated, darker crown: the full trees read blue-grey through their cards and snow
          float lum = dot(crown, vec3(0.299, 0.587, 0.114));
          vec3 c = mix(crown, vec3(lum), 0.3) * 0.5 * vec3(0.92, 0.98, 1.06) * (aPart > 1.5 ? 0.82 : 1.0);
          vProxyCol = abs(aPart - 1.0) < 0.5 ? vec3(0.3, 0.22, 0.17) : c;
          vTier = aTier;
          vPart = abs(aPart - 1.0) < 0.5 ? 1.0 : 0.0;
          vec3 nW = objectNormal;
          #ifdef USE_INSTANCING
            nW = mat3(instanceMatrix) * nW;
          #endif
          vProxyN = normalize(mat3(modelMatrix) * nW);
        }`)
      .replace('#include <color_vertex>', '');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vProxyCol;
        varying vec3 vProxyN;
        varying float vTier;
        varying float vPart;`)
      .replace('#include <color_fragment>', `
        diffuseColor.rgb = vProxyCol;
        {
          // Cone flanks are steep: a softer threshold than the full trees gives the same snowy read
          float up = smoothstep(0.25, 0.7, normalize(vProxyN).y);
          float band = smoothstep(0.25, 0.55, vTier);              // upper part of each tier
          float s = up * band * ${(snow * 1.6).toFixed(3)} * (1.0 - vPart);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.91, 0.98), clamp(s, 0.0, 0.78));
        }`);
  };
  m.customProgramCacheKey = () => 'arctic-tree-proxy-v2';
  m.flatShading = true;
  return m;
}

export class ArcticTreeLOD {
  /**
   * @param {IslandTrees} trees   the Arctic IslandTrees (layer.trees)
   * @param {object} opts         { camera: () => THREE.Camera, snow }
   */
  constructor(trees, opts = {}) {
    this.trees = trees;
    this.cfg = { ...ARCTIC_TREE_LOD, ...(opts.lod || {}) };
    this.getCamera = opts.camera;
    // Punto de referencia para las distancias (el jugador). Con la cámara, al ORBITAR alrededor del
    // jugador se reordenaban y subían a la GPU todas las instancias en cada fotograma.
    this.getFocus = opts.focus || null;
    this.entries = [];     // detail meshes driven by distance
    this.proxies = [];     // proxy meshes (one per foliage bucket)
    this._last = new THREE.Vector2(1e9, 1e9);
    this._tmpM = new THREE.Matrix4();
    const proxyMat = proxyMaterial(opts.snow ?? 0.5);
    addDitherFade(proxyMat, true);
    const proxyGeos = new Map();

    const meshes = trees.meshes.slice();
    for (const mesh of meshes) {
      const m = /^IslandTree(Foliage|Trunk)_([a-z]+)_(\d+)/.exec(mesh.name || '');
      if (!m) continue;
      const kind = m[2];
      if (kind !== 'conifer' && kind !== 'broad') continue;     // dead trees keep their mesh
      const n = mesh.count;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mt) => addDitherFade(mt, false));
      mesh.geometry = withFadeAttribute(mesh.geometry, n);
      const entry = {
        mesh,
        n,
        matrices: mesh.instanceMatrix.array.slice(0, n * 16),
        colors: mesh.instanceColor ? mesh.instanceColor.array.slice(0, n * 3) : null,
        pos: new Float32Array(n * 2)
      };
      for (let i = 0; i < n; i++) { entry.pos[i * 2] = entry.matrices[i * 16 + 12]; entry.pos[i * 2 + 1] = entry.matrices[i * 16 + 14]; }
      this.entries.push(entry);
      // One proxy per foliage bucket (same instances, same colours)
      if (m[1] === 'Foliage') {
        const bkey = `${kind}_${m[3]}`;
        const trunkMesh = meshes.find((t) => (t.name || '').startsWith(`IslandTreeTrunk_${bkey}_`));
        if (!proxyGeos.has(bkey)) proxyGeos.set(bkey, proxyGeometry(kind, mesh.geometry, trunkMesh ? trunkMesh.geometry : mesh.geometry));
        const geo = withFadeAttribute(proxyGeos.get(bkey), n);
        const proxy = new THREE.InstancedMesh(geo, proxyMat, n);
        proxy.name = `ArcticTreeProxy_${bkey}`;
        proxy.castShadow = true;
        proxy.receiveShadow = true;
        proxy.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        proxy.instanceMatrix.array.set(entry.matrices);
        if (entry.colors) {
          proxy.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(entry.colors), 3);
          proxy.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }
        proxy.boundingSphere = mesh.boundingSphere ? mesh.boundingSphere.clone() : null;
        if (!proxy.boundingSphere) proxy.computeBoundingSphere();
        proxy.count = 0;
        mesh.parent.add(proxy);
        this.proxies.push({ mesh: proxy, src: entry });
      }
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (mesh.instanceColor) mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    this.stats = { detail: 0, proxy: 0 };
  }

  /** Fade of the full tree at distance d: 1 near, 0 far. */
  _fade(d) {
    const { near, far } = this.cfg;
    if (d <= near) return 1;
    if (d >= far) return 0;
    const t = (d - near) / (far - near);
    return 1 - t * t * (3 - 2 * t);
  }

  update(force = false) {
    const focus = this.getFocus && this.getFocus();
    const cam = focus ? null : (this.getCamera && this.getCamera());
    const ref = focus || (cam && cam.position);
    if (!ref) return;
    const cx = ref.x, cz = ref.z;
    if (!force && Math.hypot(cx - this._last.x, cz - this._last.y) < this.cfg.recomputeStep) return;
    this._last.set(cx, cz);
    let detail = 0, proxyCount = 0;
    // Detail meshes: keep the instances with fade > 0, packed at the front
    for (const e of this.entries) {
      const dst = e.mesh.instanceMatrix.array;
      const dcol = e.colors ? e.mesh.instanceColor.array : null;
      const fadeAttr = e.mesh.geometry.attributes.aLodFade;
      const fa = fadeAttr.array;
      let k = 0;
      for (let i = 0; i < e.n; i++) {
        const f = this._fade(Math.hypot(e.pos[i * 2] - cx, e.pos[i * 2 + 1] - cz));
        if (f <= 0) continue;
        for (let j = 0; j < 16; j++) dst[k * 16 + j] = e.matrices[i * 16 + j];
        if (dcol) { dcol[k * 3] = e.colors[i * 3]; dcol[k * 3 + 1] = e.colors[i * 3 + 1]; dcol[k * 3 + 2] = e.colors[i * 3 + 2]; }
        fa[k] = f;
        k++;
      }
      e.mesh.count = k;
      e.mesh.visible = k > 0;
      e.mesh.instanceMatrix.needsUpdate = true;
      if (dcol) e.mesh.instanceColor.needsUpdate = true;
      fadeAttr.needsUpdate = true;
      if (e.mesh.name.startsWith('IslandTreeFoliage_')) detail += k;
    }
    // Proxies: the complementary set (fade < 1)
    for (const p of this.proxies) {
      const e = p.src;
      const dst = p.mesh.instanceMatrix.array;
      const dcol = p.mesh.instanceColor ? p.mesh.instanceColor.array : null;
      const fadeAttr = p.mesh.geometry.attributes.aLodFade;
      const fa = fadeAttr.array;
      let k = 0;
      for (let i = 0; i < e.n; i++) {
        const f = this._fade(Math.hypot(e.pos[i * 2] - cx, e.pos[i * 2 + 1] - cz));
        if (f >= 1) continue;
        for (let j = 0; j < 16; j++) dst[k * 16 + j] = e.matrices[i * 16 + j];
        if (dcol) { dcol[k * 3] = e.colors[i * 3]; dcol[k * 3 + 1] = e.colors[i * 3 + 1]; dcol[k * 3 + 2] = e.colors[i * 3 + 2]; }
        fa[k] = 1 - f;
        k++;
      }
      p.mesh.count = k;
      p.mesh.visible = k > 0;
      p.mesh.instanceMatrix.needsUpdate = true;
      if (dcol) p.mesh.instanceColor.needsUpdate = true;
      fadeAttr.needsUpdate = true;
      proxyCount += k;
    }
    this.stats = { detail, proxy: proxyCount };
  }
}
