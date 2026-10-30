import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { createSeededRandom, SimplexNoise } from '../MathUtils.js';
import { LightingManager } from '../LightingManager.js';
import { loadTexture, isKtx2Texture } from '../../../../render/Ktx2.js';

// Viento del follaje: el mismo código en el material visible y en el de sombras (Hito 84).
const FOLIAGE_SWAY_PARS = /* glsl */ `
  uniform float uTime;
  attribute float aSway;`;
const FOLIAGE_SWAY_VERTEX = /* glsl */ `
  {
    vec3 base = vec3(0.0);
    #ifdef USE_INSTANCING
      base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    #endif
    float ph = base.x * 0.21 + base.z * 0.17;
    float sway = aSway;
    transformed.x += (sin(uTime * 1.3 + ph) * 0.10 + sin(uTime * 3.7 + ph * 2.0 + position.y) * 0.03) * sway;
    transformed.z += (cos(uTime * 1.1 + ph) * 0.08) * sway;
  }`;
/** Material de follaje → su material de profundidad con viento. */
const FOLIAGE_SWAY_DEPTH = new WeakMap();
function makeFoliageSwayDepth(time) {
  // three le copia en cada uso el mapa, el alphaTest y la cara del material de follaje (getDepthMaterial).
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  d.name = 'GenshinFoliageDepthSway';
  d.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${FOLIAGE_SWAY_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${FOLIAGE_SWAY_VERTEX}`);
  };
  d.customProgramCacheKey = () => 'genshin-foliage-depth-sway-v1';
  return d;
}

/**
 * GenshinTrees — Bulky, organic, brush-stroke trees (Mondstadt / Liyue mood).
 *
 *  - Broadleaf archetypes: a gently bent trunk with 2–4 limbs crowned by 6–10 foliage
 *    "puffs". Every puff is a shell of painterly leaf cards whose normals point away from
 *    the crown centre → the canopy lights like one soft, voluminous cloud (the anime trick).
 *  - Conifer archetypes: stacked drooping tiers of needle cards around a straight trunk.
 *  - Colour per instance (InstancedMesh.instanceColor): autumn reds, oranges, golds and
 *    fresh greens; conifers in deep blue-greens.
 *  - Soft toon ramp (MeshToonMaterial + smooth gradient), leaf translucency toward the sun,
 *    GPU wind sway and alpha-tested shadows (leaf-shaped dappled shadows on the grass).
 *  - Draw calls: (archetypes × 2) instanced meshes for the whole island.
 *
 * Placement reuses PropsManager's deterministic Mulberry32 positions (seed 133742),
 * so the layout of the valley — and every gameplay space around it — is unchanged.
 */
export class GenshinTrees {
  /**
   * Cambio de LOD: a LOD_SWITCH metros de la cámara (con ±LOD_HYST de margen para que no oscile)
   * el árbol pasa del original a su versión ligera con un fundido de LOD_FADE_S segundos.
   * Fundido en el tiempo (no en la distancia): el patrón del fundido solo se ve durante ese medio
   * segundo; con la cámara quieta ningún árbol queda a medias.
   */
  static LOD_SWITCH = 50;
  /**
   * LOD desactivado (medido en el Bosque con una RTX 4060, alternando A/B): la versión ligera no
   * ahorra GPU —los árboles cuestan por los píxeles de sus tarjetas de hojas, no por triángulos— y
   * mezclar las dos versiones costó ~2 ms más. Con false los árboles se dibujan exactamente como
   * antes (mismos materiales y sombras); solo queda el descarte árbol a árbol, que no se ve.
   */
  static LOD_ENABLED = false;
  static LOD_HYST = 3;
  static LOD_FADE_S = 0.5;
  /**
   * Hand-painted bark textures that already ship with the game (assets/nature). Only their
   * strokes + relief are used; the colour comes from the tree variety tone below.
   * avg = linear-space average colour of each texture (measured offline).
   */
  static BARK_TEXTURES = {
    normal: { map: './assets/nature/Bark_NormalTree.ktx2', normal: './assets/nature/Bark_NormalTree_Normal.png', avg: [0.2646, 0.0999, 0.0568] },
    twisted: { map: './assets/nature/Bark_TwistedTree.ktx2', normal: './assets/nature/Bark_TwistedTree_Normal.png', avg: [0.0912, 0.0751, 0.0663] },
    pine: { map: './assets/nature/Bark_DeadTree.ktx2', normal: './assets/nature/Bark_DeadTree_Normal.png', avg: [0.0539, 0.0473, 0.0520] }
  };

  /**
   * Trunk per tree variety: same brown family, different tonality (multipliers of the
   * current trunk brown, linear space) + the bark pattern that suits the species.
   */
  static TRUNK_VARIETIES = {
    green: { bark: 'normal', tone: [1.0, 1.0, 1.0] },        // fresh broadleaf: current medium brown
    gold: { bark: 'normal', tone: [1.28, 1.2, 1.02] },       // golden trees: lighter honey brown
    orange: { bark: 'twisted', tone: [1.06, 0.88, 0.8] },    // orange maples: warm chestnut, gnarled bark
    red: { bark: 'twisted', tone: [0.82, 0.6, 0.58] },       // red maples: dark reddish brown, gnarled bark
    conifer: { bark: 'pine', tone: [0.72, 0.68, 0.74] }      // firs: cool dark grey-brown, deep furrows
  };

  constructor(parent, propsManager, sunDirection) {
    this.group = new THREE.Group();
    this.group.name = 'GenshinTrees';
    parent.add(this.group);
    this.props = propsManager;
    this.noise = new SimplexNoise(31337);
    this.sunDirection = sunDirection.clone();
    this.time = { value: 0 };
    this.meshes = [];

    this.leafTexture = this._createLeafTexture(false);
    this.needleTexture = this._createLeafTexture(true);
    this.barkTexture = this._createBarkTexture();
    this.gradientMap = this._createSoftToonRamp();

    this.trunkMaterial = this._getTrunkMaterial('green');
    this.leafMaterial = this._createFoliageMaterial(this.leafTexture, 0.42);
    this.needleMaterial = this._createFoliageMaterial(this.needleTexture, 0.0);

    this.archetypes = {
      broad: [0, 1, 2, 3].map((i) => this._buildBroadleaf(1000 + i * 17, i)),
      conifer: [0, 1, 2].map((i) => this._buildConifer(2000 + i * 23, i))
    };

    this._instantiate();
  }

  // ---------------------------------------------------------------------------
  // Procedural textures
  // ---------------------------------------------------------------------------

  _createLeafTexture(needles) {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.clearRect(0, 0, S, S);
    const rng = createSeededRandom(needles ? 911 : 733);
    if (!needles) {
      // Painterly cluster of rounded leaves; brightness varies per stroke (brush look)
      for (let i = 0; i < 95; i++) {
        const r = Math.sqrt(rng()) * S * 0.38;
        const a = rng() * Math.PI * 2;
        const x = S / 2 + Math.cos(a) * r;
        const y = S / 2 + Math.sin(a) * r;
        const l = 150 + Math.floor(rng() * 105);
        g.save();
        g.translate(x, y);
        g.rotate(a + (rng() - 0.5) * 1.2);
        g.fillStyle = `rgb(${l},${l},${l})`;
        g.beginPath();
        g.ellipse(0, 0, S * (0.05 + rng() * 0.035), S * (0.026 + rng() * 0.018), 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    } else {
      // Opaque brushy needle texture for the solid fir skirts: vertical strokes along v
      g.fillStyle = 'rgb(205,205,205)';
      g.fillRect(0, 0, S, S);
      g.lineCap = 'round';
      for (let i = 0; i < 220; i++) {
        const x = rng() * S;
        const y = rng() * S;
        const len = S * (0.12 + rng() * 0.25);
        const l = rng() < 0.5 ? 150 + Math.floor(rng() * 40) : 225 + Math.floor(rng() * 30);
        g.strokeStyle = `rgb(${l},${l},${l})`;
        g.lineWidth = 3 + rng() * 5;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rng() - 0.5) * 10, y + len);
        g.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (needles) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(7, 1);
    }
    return tex;
  }

  _createBarkTexture() {
    const W = 128, H = 256;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const rng = createSeededRandom(5511);
    g.fillStyle = 'rgb(118,86,62)';
    g.fillRect(0, 0, W, H);
    // Vertical painterly bark strokes
    for (let i = 0; i < 160; i++) {
      const x = rng() * W;
      const y = rng() * H;
      const l = rng();
      g.strokeStyle = l < 0.5 ? `rgba(70,48,36,${0.35 + rng() * 0.3})` : `rgba(170,132,96,${0.25 + rng() * 0.3})`;
      g.lineWidth = 2 + rng() * 5;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + (rng() - 0.5) * 8, y + 20, x + (rng() - 0.5) * 8, y + 40, x + (rng() - 0.5) * 6, y + 30 + rng() * 60);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /** 4-step toon ramp, linearly filtered → soft two-tone anime shading. */
  _createSoftToonRamp() {
    const data = new Uint8Array([70, 120, 230, 255]);
    const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  // ---------------------------------------------------------------------------
  // Materials
  // ---------------------------------------------------------------------------

  /**
   * One trunk material per tree variety (textures are loaded once and shared). The bark texture
   * only provides strokes + relief; its colour is remapped to the variety tone, expressed as a
   * multiplier of the current trunk brown (linear space). instanceColor adds per-tree jitter.
   */
  _getTrunkMaterial(variety) {
    if (!this._trunkMaterials) this._trunkMaterials = {};
    if (this._trunkMaterials[variety]) return this._trunkMaterials[variety];
    const def = GenshinTrees.TRUNK_VARIETIES[variety] || GenshinTrees.TRUNK_VARIETIES.green;
    const tex = GenshinTrees.BARK_TEXTURES[def.bark];
    if (!this._barkTex) this._barkTex = {};
    if (!this._barkTex[def.bark]) {
      // 30-oct: la corteza de color es KTX2 (ETC1S, docs/PLAN_KTX2.md). Una textura KTX2 no se voltea al subirla:
      // repeat.y = -1 la deja igual que el PNG (que three voltea), así coincide con su mapa de normales.
      const map = loadTexture(tex.map);
      map.colorSpace = THREE.SRGBColorSpace;
      const normalMap = loadTexture(tex.normal);
      [map, normalMap].forEach((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2, isKtx2Texture(t) ? -1 : 1);
        t.anisotropy = 4;
      });
      this._barkTex[def.bark] = { map, normalMap };
    }
    if (!this._barkBase) this._barkBase = this._averageLinearColor(this.barkTexture.image);
    const base = this._barkBase;
    const { map, normalMap } = this._barkTex[def.bark];
    const m = new THREE.MeshToonMaterial({
      map,
      normalMap,
      gradientMap: this.gradientMap,
      color: new THREE.Color().setRGB(
        (base[0] * def.tone[0]) / tex.avg[0],
        (base[1] * def.tone[1]) / tex.avg[1],
        (base[2] * def.tone[2]) / tex.avg[2]
      )
    });
    m.name = `GenshinBark_${variety}`;
    this._trunkMaterials[variety] = m;
    return m;
  }

  /** Average linear-space colour of a canvas (used to keep the current trunk colour). */
  _averageLinearColor(canvas) {
    const fallback = [0.18, 0.093, 0.048]; // linear of rgb(118, 86, 62)
    try {
      const g = canvas.getContext('2d');
      const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
      const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) { r += toLin(d[i]); gg += toLin(d[i + 1]); b += toLin(d[i + 2]); n++; }
      return n ? [r / n, gg / n, b / n] : fallback;
    } catch (_) {
      return fallback;
    }
  }

  _createFoliageMaterial(tex, alphaTest) {
    const m = new THREE.MeshToonMaterial({
      map: tex,
      gradientMap: this.gradientMap,
      alphaTest,
      side: THREE.DoubleSide,
      vertexColors: true
    });
    m.name = 'GenshinFoliage';
    const time = this.time;
    const sun = this.sunDirection;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.uniforms.uSunDirW = { value: sun };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          ${FOLIAGE_SWAY_PARS}
          varying vec3 vWorldPosF;
          varying vec3 vCrownNormalW;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          ${FOLIAGE_SWAY_VERTEX}`)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          {
            vec4 wpF = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              wpF = instanceMatrix * wpF;
            #endif
            wpF = modelMatrix * wpF;
            vWorldPosF = wpF.xyz;
            vec3 nW = objectNormal;
            #ifdef USE_INSTANCING
              nW = mat3(instanceMatrix) * nW;
            #endif
            vCrownNormalW = normalize(mat3(modelMatrix) * nW);
          }`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform vec3 uSunDirW;
          varying vec3 vWorldPosF;
          varying vec3 vCrownNormalW;`)
        .replace('#include <opaque_fragment>', `
          // Translucent leaves: warm glow when the sun is behind the canopy
          vec3 Vw = normalize(cameraPosition - vWorldPosF);
          vec3 Lw = normalize(uSunDirW);
          float backLit = pow(clamp(dot(-Vw, Lw), 0.0, 1.0) + 1e-4, 3.0);
          float rim = pow(clamp(1.0 - abs(dot(normalize(vCrownNormalW), Vw)), 0.0, 1.0) + 1e-4, 2.5);
          outgoingLight += diffuseColor.rgb * vec3(1.0, 0.82, 0.5) * (backLit * 0.55 + rim * 0.18);
          #include <opaque_fragment>`);
    };
    // Unique key so three.js does not share the program with an unpatched toon material
    m.customProgramCacheKey = () => 'genshin-foliage-v1';
    FOLIAGE_SWAY_DEPTH.set(m, makeFoliageSwayDepth(time));
    return m;
  }

  /**
   * Material de profundidad con el mismo viento que el follaje (Hito 84), o undefined si el material no
   * es de follaje. Sin él, el pase de sombras dibujaba las hojas quietas mientras se veían moviéndose:
   * la copa se hacía sombra a sí misma en sitios distintos cada fotograma y "hervía".
   */
  static swayDepthFor(mat) {
    return FOLIAGE_SWAY_DEPTH.get(mat);
  }

  // ---------------------------------------------------------------------------
  // Archetype builders (return { trunk: BufferGeometry, foliage: BufferGeometry, kind })
  // ---------------------------------------------------------------------------

  _branch(start, dir, length, r0, r1, radial = 7, segs = 5, bendSeed = 0, bendAmount = 0.35) {
    // Tapered, slightly curved tube built from rings
    const pts = [];
    const d = dir.clone().normalize();
    const side = new THREE.Vector3(1, 0, 0).cross(d).lengthSq() < 0.01 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const n1 = new THREE.Vector3().crossVectors(d, side).normalize();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const bend = this.noise.noise2D(bendSeed + t * 1.7, bendSeed * 0.3) * bendAmount * length * t;
      pts.push(start.clone().addScaledVector(d, length * t).addScaledVector(n1, bend));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, segs * 2, 1, radial, false);
    // Taper radius along the tube
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const rings = segs * 2 + 1;
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1);
      const radius = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.8));
      const center = curve.getPointAt(t);
      for (let k = 0; k <= radial; k++) {
        const idx = r * (radial + 1) + k;
        const nx = nor.getX(idx), ny = nor.getY(idx), nz = nor.getZ(idx);
        pos.setXYZ(idx, center.x + nx * radius, center.y + ny * radius, center.z + nz * radius);
      }
    }
    geo.deleteAttribute('uv');
    // Bark UVs: around × along (tiled)
    const uv = new Float32Array(pos.count * 2);
    for (let r = 0; r < rings; r++) {
      for (let k = 0; k <= radial; k++) {
        const idx = r * (radial + 1) + k;
        uv[idx * 2] = k / radial;
        uv[idx * 2 + 1] = (r / (rings - 1)) * length * 0.35;
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return { geo, end: pts[pts.length - 1] };
  }

  /**
   * Shell of leaf cards around a puff centre. Normals = direction from crown centre
   * (gives the soft "cloud" shading). Vertex colours carry painterly AO: darker inside
   * and underneath, lighter on top.
   */
  _foliagePuff(center, radius, crownCenter, cards, rng, cardSize, swayBase) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const sways = [];
    const indices = [];
    const tmp = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < cards; i++) {
      // Fibonacci-ish distribution on the puff, flattened underneath
      const u = rng() * 2 - 1;
      const a = rng() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const dir = new THREE.Vector3(Math.cos(a) * s, u * 0.85 + 0.12, Math.sin(a) * s).normalize();
      const p = center.clone().addScaledVector(dir, radius * (0.62 + rng() * 0.45));
      const size = cardSize * (0.75 + rng() * 0.5);
      // Card roughly tangent to the puff surface, randomly rolled
      const tangent = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).normalize();
      tangent.applyAxisAngle(dir, rng() * Math.PI);
      const bitangent = new THREE.Vector3().crossVectors(dir, tangent).normalize();
      // Tilt card a bit outward so silhouettes stay fluffy
      const n = tmp.copy(p).sub(crownCenter).normalize();
      const shade = THREE.MathUtils.clamp(0.62 + 0.38 * (n.y * 0.5 + 0.5) + (rng() - 0.5) * 0.12, 0.45, 1.05);
      const base = positions.length / 3;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const uvc = [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (let k = 0; k < 4; k++) {
        const cx = corners[k][0] * size * 0.5;
        const cy = corners[k][1] * size * 0.5;
        positions.push(p.x + tangent.x * cx + bitangent.x * cy, p.y + tangent.y * cx + bitangent.y * cy, p.z + tangent.z * cx + bitangent.z * cy);
        normals.push(n.x, n.y, n.z);
        uvs.push(uvc[k][0], uvc[k][1]);
        colors.push(shade, shade, shade);
        sways.push(swayBase * (0.6 + 0.4 * (p.y / (crownCenter.y + radius * 2.0))));
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(sways, 1));
    g.setIndex(indices);
    return g;
  }

  _withSway(geo, value) {
    geo.setAttribute('aSway', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(value), 1));
    return geo;
  }

  _buildBroadleaf(seed, variant) {
    const rng = createSeededRandom(seed);
    // Se anotan los argumentos de cada rama para construir después la versión ligera (LOD1) con las
    // mismas curvas: _branch es determinista (ruido con semilla fija) y no consume `rng`.
    const calls = [];
    const br = (...args) => { calls.push(args); return this._branch(...args); };
    const height = 4.2 + variant * 0.5 + rng() * 0.8;
    const lean = new THREE.Vector3((rng() - 0.5) * 0.25, 1, (rng() - 0.5) * 0.25);
    const trunk = br(new THREE.Vector3(0, -0.3, 0), lean, height, 0.42, 0.2, 8, 5, seed * 0.01);
    const trunkGeos = [trunk.geo];
    // Flared roots
    for (let r = 0; r < 4; r++) {
      const a = (r / 4) * Math.PI * 2 + rng() * 0.6;
      const root = br(new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(Math.cos(a), -0.55, Math.sin(a)), 0.9, 0.22, 0.05, 5, 2, seed + r);
      trunkGeos.push(root.geo);
    }
    const crownCenter = trunk.end.clone().add(new THREE.Vector3(0, 1.4, 0));
    const puffs = [];
    const limbs = 2 + Math.floor(rng() * 3);
    for (let l = 0; l < limbs; l++) {
      const a = (l / limbs) * Math.PI * 2 + rng() * 0.8;
      const start = trunk.end.clone().multiplyScalar(0.62 + rng() * 0.2);
      const dir = new THREE.Vector3(Math.cos(a), 0.9 + rng() * 0.6, Math.sin(a));
      const limb = br(start, dir, 1.8 + rng() * 1.0, 0.16, 0.06, 6, 3, seed + 10 + l);
      trunkGeos.push(limb.geo);
      puffs.push({ c: limb.end.clone().add(new THREE.Vector3(0, 0.6, 0)), r: 1.5 + rng() * 0.5 });
    }
    // Main crown: central big puff + ring of puffs → bulky, rounded silhouette
    puffs.push({ c: crownCenter.clone(), r: 2.3 + rng() * 0.4 });
    puffs.push({ c: crownCenter.clone().add(new THREE.Vector3(0, 1.3, 0)), r: 1.7 + rng() * 0.3 });
    const ring = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + rng() * 0.5;
      const r = 1.9 + rng() * 0.6;
      puffs.push({ c: crownCenter.clone().add(new THREE.Vector3(Math.cos(a) * r, (rng() - 0.6) * 0.9, Math.sin(a) * r)), r: 1.35 + rng() * 0.45 });
    }
    const foliageGeos = puffs.map((p) => this._foliagePuff(p.c, p.r, crownCenter, Math.round(26 * p.r), rng, 1.55, 1.0));
    const trunkGeo = mergeGeometries(trunkGeos.map((g) => this._withSway(g, 0.0)), false);
    const foliageGeo = mergeGeometries(foliageGeos, false);
    trunkGeo.computeBoundingSphere();
    foliageGeo.computeBoundingSphere();
    const lod1 = GenshinTrees.LOD_ENABLED ? {
      trunk: this._lodTrunk(calls),
      foliage: this._decimateCards(foliageGeo, 0.4, 1.5)
    } : null;
    return { trunk: trunkGeo, foliage: foliageGeo, kind: 'broad', lod1 };
  }

  /**
   * Stylised fir: 6–8 overlapping drooping "skirts". Each skirt is a solid fan from an inner
   * collar to a jagged, scalloped rim (no alpha cards → clean anime silhouette, cheap shadows).
   * Normals blend outward + up so every tier reads with a lit top and a soft shaded underside.
   */
  _buildConifer(seed, variant) {
    const rng = createSeededRandom(seed);
    const height = 9.0 + variant * 1.2 + rng() * 1.4;
    // Straight, perfectly vertical trunk (no procedural bend) running up through every tier,
    // so the needle skirts — centred on the Y axis — always sit on the trunk.
    const trunkArgs = [new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0, 1, 0), height + 1.2, 0.34, 0.06, 7, 4, seed * 0.02, 0.0];
    const trunk = this._branch(...trunkArgs);
    const tiers = 7 + variant;
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const sways = [];
    const indices = [];
    const radial = 22;
    for (let t = 0; t < tiers; t++) {
      const k = t / (tiers - 1);
      const topY = height * (0.30 + 0.72 * k) + 0.6;
      const radius = THREE.MathUtils.lerp(3.1, 0.75, Math.pow(k, 0.85)) * (0.92 + rng() * 0.16);
      const drop = radius * (0.74 + rng() * 0.12);         // how far the skirt droops (tiers overlap)
      const collarR = radius * 0.12;
      const base = positions.length / 3;
      const phase = rng() * Math.PI * 2;
      // ring 0: collar (around trunk, top), ring 1: mid, ring 2: jagged rim
      for (let ring = 0; ring < 3; ring++) {
        for (let i = 0; i <= radial; i++) {
          const a = (i / radial) * Math.PI * 2 + phase;
          const ca = Math.cos(a), sa = Math.sin(a);
          let r, y;
          if (ring === 0) { r = collarR; y = topY; }
          else if (ring === 1) { r = radius * 0.6; y = topY - drop * 0.42; }
          else {
            // Scalloped rim: alternating long / short needle clumps
            const jag = (i % 2 === 0 ? 1.0 : 0.78) * (0.92 + rng() * 0.16);
            r = radius * jag;
            y = topY - drop * (i % 2 === 0 ? 1.0 : 0.82);
          }
          positions.push(ca * r, y, sa * r);
          const n = new THREE.Vector3(ca * 0.75, ring === 2 ? 0.45 : 0.85, sa * 0.75).normalize();
          normals.push(n.x, n.y, n.z);
          uvs.push(i / radial, 1 - ring * 0.5);
          const shade = (ring === 0 ? 1.0 : (ring === 1 ? 0.88 : 0.72)) * (0.78 + 0.28 * k);
          colors.push(shade, shade, shade);
          sways.push(ring * 0.18 * (0.5 + k));
        }
      }
      const row = radial + 1;
      for (let ring = 0; ring < 2; ring++) {
        for (let i = 0; i < radial; i++) {
          const a = base + ring * row + i;
          const b = a + row;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    // Crown tip
    const tipBase = positions.length / 3;
    const tipY = height + 1.6;
    positions.push(0, tipY, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 1);
    colors.push(1.05, 1.05, 1.05);
    sways.push(0.5);

    const foliage = new THREE.BufferGeometry();
    foliage.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    foliage.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    foliage.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    foliage.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    foliage.setAttribute('aSway', new THREE.Float32BufferAttribute(sways, 1));
    foliage.setIndex(indices);
    void tipBase;
    foliage.computeBoundingSphere();
    const trunkGeo = this._withSway(trunk.geo, 0.0);
    trunkGeo.computeBoundingSphere();
    const lod1 = GenshinTrees.LOD_ENABLED ? {
      trunk: this._lodTrunk([trunkArgs]),
      foliage: this._decimateConiferSkirts(foliage, tiers, radial)
    } : null;
    return { trunk: trunkGeo, foliage, kind: 'conifer', lod1 };
  }

  // ---------------------------------------------------------------------------
  // LOD1: versión ligera de cada arquetipo (misma silueta, colores y balanceo)
  // ---------------------------------------------------------------------------

  /** Tronco y ramas con las mismas curvas pero menos lados (el contorno a distancia no cambia). */
  _lodTrunk(calls) {
    const geos = calls.map((a) => {
      const b = a.slice();
      b[5] = Math.max(3, Math.round((b[5] ?? 7) * 0.6)); // lados del tubo
      return this._withSway(this._branch(...b).geo, 0.0);
    });
    const g = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
    g.computeBoundingSphere();
    return g;
  }

  /**
   * Copa de hoja ancha: se conserva una parte de las tarjetas (en su sitio exacto, con su normal,
   * color y balanceo) y cada una crece un poco para cubrir lo mismo. 4 vértices y 6 índices por tarjeta.
   */
  _decimateCards(src, keep, grow) {
    const P = src.attributes.position, N = src.attributes.normal, U = src.attributes.uv;
    const C = src.attributes.color, S = src.attributes.aSway;
    const cards = P.count / 4;
    const step = 1 / keep;
    const pos = [], nor = [], uv = [], col = [], sw = [], idx = [];
    let acc = 0;
    for (let c = 0; c < cards; c++) {
      acc += 1;
      if (acc < step) continue; // reparto uniforme: 1 de cada `step` tarjetas
      acc -= step;
      const v0 = c * 4;
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 4; k++) { cx += P.getX(v0 + k); cy += P.getY(v0 + k); cz += P.getZ(v0 + k); }
      cx /= 4; cy /= 4; cz /= 4;
      const base = pos.length / 3;
      for (let k = 0; k < 4; k++) {
        const v = v0 + k;
        pos.push(cx + (P.getX(v) - cx) * grow, cy + (P.getY(v) - cy) * grow, cz + (P.getZ(v) - cz) * grow);
        nor.push(N.getX(v), N.getY(v), N.getZ(v));
        uv.push(U.getX(v), U.getY(v));
        col.push(C.getX(v), C.getY(v), C.getZ(v));
        sw.push(S.getX(v));
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(sw, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }

  /** Faldas del abeto con la mitad de divisiones: se quedan los vértices pares (las puntas largas). */
  _decimateConiferSkirts(src, tiers, radial) {
    const row = radial + 1;
    const half = radial / 2; // 22 → 11 segmentos
    const nrow = half + 1;
    const attrs = ['position', 'normal', 'uv', 'color', 'aSway'];
    const out = Object.fromEntries(attrs.map((a) => [a, []]));
    const idx = [];
    for (let t = 0; t < tiers; t++) {
      const base = (out.position.length / 3);
      for (let ring = 0; ring < 3; ring++) {
        for (let i = 0; i <= radial; i += 2) {
          const v = t * 3 * row + ring * row + i;
          for (const a of attrs) {
            const A = src.attributes[a];
            for (let k = 0; k < A.itemSize; k++) out[a].push(A.array[v * A.itemSize + k]);
          }
        }
      }
      for (let ring = 0; ring < 2; ring++) {
        for (let i = 0; i < half; i++) {
          const a = base + ring * nrow + i;
          const b = a + nrow;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    for (const a of attrs) g.setAttribute(a, new THREE.Float32BufferAttribute(out[a], src.attributes[a].itemSize));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }

  /**
   * Añade a un material el fundido entre LODs por patrón de píxeles (dithering, como el
   * "LOD Cross-Fade" de Unity). Atributo por instancia `aLod`:
   *   0..1  → LOD0, se descarta donde patrón < valor (0 = árbol completo)
   *   2..3  → LOD1, se descarta donde patrón >= valor − 2 (3 = árbol completo)
   * Los dos patrones son complementarios: en la franja de cambio cada píxel lo pinta uno de los dos.
   * Una malla sin `aLod` (p. ej. el árbol de recolección) recibe 0 → se ve completa.
   */
  static _lodChunks() {
    return {
      vertPars: 'attribute float aLod;\nvarying float vLkLod;',
      vertMain: 'vLkLod = aLod;',
      fragPars: `varying float vLkLod;
        float lkBayer4(vec2 p) {
          vec2 q = mod(floor(p), 4.0);
          int i = int(q.x) + int(q.y) * 4;
          float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
          return (m[i] + 0.5) / 16.0;
        }`
    };
  }

  /**
   * Copia del material con el fundido de LOD. Los originales no se tocan: otros objetos los usan
   * sin el atributo aLod (p. ej. el árbol de recolección de GatheringNodes).
   */
  _lodify(mat) {
    if (!this._lodMats) this._lodMats = new Map();
    const cached = this._lodMats.get(mat);
    if (cached) return cached;
    const C = GenshinTrees._lodChunks();
    const prev = mat.onBeforeCompile;
    const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    const copy = mat.clone();
    copy.name = `${mat.name || 'GenshinTree'}_LOD`;
    this._lodMats.set(mat, copy);
    mat = copy;
    mat.onBeforeCompile = (shader, renderer) => {
      if (prev) prev.call(mat, shader, renderer);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${C.vertPars}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${C.vertMain}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${C.fragPars}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          {
            float lkB = lkBayer4(gl_FragCoord.xy);
            if (vLkLod < 1.5) { if (lkB < vLkLod) discard; }
            else { if (lkB >= vLkLod - 2.0) discard; }
          }`);
    };
    mat.customProgramCacheKey = () => `${prevKey}|lk-lod-xfade-v1`;
    return mat;
  }

  /**
   * Material de sombra para los árboles con LOD: la sombra no se difumina (quedaría granulada),
   * cambia de golpe a mitad de la franja; a esa distancia las dos versiones dan la misma sombra.
   * three.js le copia en cada uso el mapa, alphaTest y lado del material del árbol.
   */
  _depthFor(mat) {
    if (!this._depthMats) this._depthMats = new Map();
    let d = this._depthMats.get(mat);
    if (d) return d;
    const C = GenshinTrees._lodChunks();
    d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    d.name = `GenshinTreeDepth_${mat.name || ''}`;
    d.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${C.vertPars}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${C.vertMain}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying float vLkLod;`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if (vLkLod < 1.5) { if (vLkLod > 0.5) discard; }
          else { if (vLkLod - 2.0 <= 0.5) discard; }`);
    };
    d.customProgramCacheKey = () => 'lk-tree-depth-lod-v1';
    this._depthMats.set(mat, d);
    return d;
  }

  // ---------------------------------------------------------------------------
  // Instancing
  // ---------------------------------------------------------------------------

  _instantiate() {
    const trees = (this.props && this.props.pendingTrees) || [];
    const rng = createSeededRandom(8675309);
    const palettes = {
      green: [0x6fae3c, 0x5c9e36, 0x86bf45],
      orange: [0xf08a2a, 0xf39b35, 0xe8792a],
      red: [0xd8452e, 0xc93a2c, 0xe25a34],
      gold: [0xf3bd3c, 0xeeb02f, 0xf6c950],
      conifer: [0x3f7d4f, 0x37724a, 0x4a8a58]
    };
    const buckets = new Map();
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];

    for (const t of trees) {
      const key = String(t.key || '');
      let kind, colorHex, family;
      if (key.includes('pine')) {
        kind = 'conifer';
        family = 'conifer';
        colorHex = pick(palettes.conifer);
      } else {
        kind = 'broad';
        const r = rng();
        if (key.includes('twisted')) {
          family = r < 0.5 ? 'red' : (r < 0.85 ? 'orange' : 'gold');
        } else {
          family = r < 0.42 ? 'green' : (r < 0.68 ? 'orange' : (r < 0.84 ? 'red' : 'gold'));
        }
        colorHex = pick(palettes[family]);
      }
      const list = this.archetypes[kind];
      const variant = Math.floor(rng() * list.length);
      const bkey = `${kind}_${variant}`;
      if (!buckets.has(bkey)) buckets.set(bkey, { arch: list[variant], items: [] });
      const s = t.scale ? t.scale.x : 1.0;
      const sy = t.scale ? t.scale.y : 1.0;
      // Normalise scale: original GLTF trees were larger; keep a believable 7–12 m range
      const scaleMul = kind === 'conifer' ? 0.95 : 1.05;
      buckets.get(bkey).items.push({
        pos: t.pos,
        rotY: t.rot ? t.rot.y : rng() * Math.PI * 2,
        s: s * scaleMul,
        sy: sy * scaleMul,
        family,
        color: new THREE.Color(colorHex).offsetHSL((rng() - 0.5) * 0.02, (rng() - 0.5) * 0.06, (rng() - 0.5) * 0.06)
      });
    }

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const sc = new THREE.Vector3();
    const trunkTint = new THREE.Color();
    // Separate RNG for trunk tone jitter so the canopy colours / variants stay exactly the same
    const trunkRng = createSeededRandom(4242);
    // Cada árbol conserva exactamente su posición, giro, escala, color, arquetipo y tono de tronco.
    // Por cada pieza (copa, troncos por familia) hay dos InstancedMesh: LOD0 (original) y LOD1 (ligera).
    // _cull() decide en cada render qué árboles se dibujan y con qué LOD (ver _cull).
    this.lodBuckets = [];
    const box = new THREE.Box3();
    const sphere = new THREE.Sphere();
    buckets.forEach(({ arch, items }, bkey) => {
      const n = items.length;
      const matrices = new Float32Array(n * 16);
      const centers = new Float32Array(n * 3);
      const radii = new Float32Array(n);
      // Esfera local del árbol (tronco + copa)
      box.makeEmpty();
      arch.foliage.computeBoundingBox(); arch.trunk.computeBoundingBox();
      box.union(arch.foliage.boundingBox).union(arch.trunk.boundingBox);
      box.getBoundingSphere(sphere);
      const foliageColors = new Float32Array(n * 3);
      items.forEach((it, i) => {
        q.setFromAxisAngle(yAxis, it.rotY);
        sc.set(it.s, it.sy, it.s);
        m.compose(it.pos, q, sc);
        m.toArray(matrices, i * 16);
        const c = sphere.center.clone().applyMatrix4(m);
        centers[i * 3] = c.x; centers[i * 3 + 1] = c.y; centers[i * 3 + 2] = c.z;
        radii[i] = sphere.radius * Math.max(it.s, it.sy) + 0.5;
        foliageColors[i * 3] = it.color.r; foliageColors[i * 3 + 1] = it.color.g; foliageColors[i * 3 + 2] = it.color.b;
      });

      const parts = [];
      const LOD = GenshinTrees.LOD_ENABLED;
      const baseFoliage = arch.kind === 'conifer' ? this.needleMaterial : this.leafMaterial;
      const foliageMat = LOD ? this._lodify(baseFoliage) : baseFoliage;
      parts.push(this._makeLodPart(`GenshinTreeFoliage_${bkey}`, arch.foliage, LOD ? arch.lod1.foliage : null, foliageMat,
        Int32Array.from(items.keys()), foliageColors));

      // Trunks: one InstancedMesh per variety in this archetype (bark pattern + brown tone)
      const byFamily = new Map();
      items.forEach((it, i) => {
        if (!byFamily.has(it.family)) byFamily.set(it.family, []);
        byFamily.get(it.family).push(i);
      });
      byFamily.forEach((ids, family) => {
        const tc = new Float32Array(ids.length * 3);
        ids.forEach((_, j) => {
          // Subtle per-tree tonality (±8 % value) so neighbouring trunks never look identical
          const v = 0.92 + trunkRng() * 0.16;
          trunkTint.setRGB(v, v * (0.98 + trunkRng() * 0.04), v * (0.97 + trunkRng() * 0.04));
          tc[j * 3] = trunkTint.r; tc[j * 3 + 1] = trunkTint.g; tc[j * 3 + 2] = trunkTint.b;
        });
        const trunkMat = this._getTrunkMaterial(family);
        parts.push(this._makeLodPart(`GenshinTreeTrunk_${bkey}_${family}`, arch.trunk, LOD ? arch.lod1.trunk : null,
          LOD ? this._lodify(trunkMat) : trunkMat, Int32Array.from(ids), tc));
      });

      this.lodBuckets.push({ n, matrices, centers, radii, parts, fade: new Float32Array(n), target: new Uint8Array(n), cam: new Uint8Array(n), shadow: new Uint8Array(n), init: false });
    });
    this._tmpM = new THREE.Matrix4();
    this._frustum = new THREE.Frustum();
    this._shadowFrustum = new THREE.Frustum();
    this._pm = new THREE.Matrix4();
    this._sph = new THREE.Sphere();
    this._installCullHook();

    console.log(`[GenshinTrees] 🍁 ${trees.length} painterly trees in ${this.meshes.length} instanced meshes (LOD0 + LOD1 con fundido).`);
  }

  /** Crea el par LOD0/LOD1 de una pieza. `ids` = índices de árbol del cubo; `colors` = color por id. */
  _makeLodPart(name, geo0, geo1, mat, ids, colors) {
    const make = (srcGeo, suffix) => {
      // Geometría propia (comparte los buffers del arquetipo) para poder llevar su atributo aLod
      const g = new THREE.BufferGeometry();
      for (const k in srcGeo.attributes) g.setAttribute(k, srcGeo.attributes[k]);
      g.setIndex(srcGeo.index);
      g.boundingSphere = srcGeo.boundingSphere;
      const cap = ids.length;
      if (GenshinTrees.LOD_ENABLED) {
        g.setAttribute('aLod', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage));
      }
      const im = new THREE.InstancedMesh(g, mat, cap);
      im.name = name + suffix;
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false; // el descarte lo hace _cull, árbol a árbol
      im.matrixAutoUpdate = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.setColorAt(0, trunkTintTmp);
      im.instanceColor.setUsage(THREE.DynamicDrawUsage);
      if (GenshinTrees.LOD_ENABLED) im.customDepthMaterial = this._depthFor(mat);
      else if (FOLIAGE_SWAY_DEPTH.has(mat)) im.customDepthMaterial = FOLIAGE_SWAY_DEPTH.get(mat);
      im.count = 0;
      im.visible = false;
      im.userData.mainCount = 0;
      im.userData.totalCount = 0;
      // Las instancias van ordenadas: primero las que ve la cámara y detrás las que solo proyectan
      // sombra hacia la vista. El pase de sombras dibuja todas; el principal, solo las primeras.
      im.onBeforeShadow = () => { im.count = im.userData.totalCount; };
      im.onBeforeRender = () => { im.count = im.userData.mainCount; };
      this.group.add(im);
      this.meshes.push(im);
      return im;
    };
    const trunkTintTmp = new THREE.Color(1, 1, 1);
    return { ids, colors, lod0: make(geo0, ''), lod1: geo1 ? make(geo1, '_LOD1') : null };
  }

  _installCullHook() {
    // Se ejecuta al principio de cada renderer.render() de la escena, ya con las matrices de la
    // cámara de ese render y antes del pase de sombras (scene.onBeforeRender de three r160).
    // Un único gancho por escena con una lista de árboles registrados: varias instancias (p. ej. un
    // Bosque reconstruido) funcionan, y una instancia retirada de la escena se da de baja sola.
    // Las subclases sin árboles propios en este camino (IslandTrees/ArenaTrees) no se registran.
    const tryInstall = () => {
      if (!this.lodBuckets || this.lodBuckets.length === 0) return true;
      let scene = this.group;
      while (scene.parent) scene = scene.parent;
      if (!scene.isScene) return false;
      let set = scene.userData.lkTreeCullers;
      if (!set) {
        set = scene.userData.lkTreeCullers = new Set();
        const prev = scene.onBeforeRender;
        scene.onBeforeRender = (renderer, sc, camera, target) => {
          if (prev) prev.call(sc, renderer, sc, camera, target);
          for (const t of set) {
            let root = t.group;
            while (root.parent) root = root.parent;
            if (root !== sc) { set.delete(t); continue; } // ya no está en esta escena
            t._cull(camera);
          }
        };
      }
      set.add(this);
      this._cullScene = scene;
      return true;
    };
    this._hookReady = tryInstall();
    this._tryInstallHook = tryInstall;
  }

  /**
   * Copia de la cámara de sombras de la luz, colocada como la colocará el pase de sombras
   * (LightShadow.updateMatrices de three r160), sin tocar light.shadow.
   */
  _shadowCullCamera(light) {
    const src = light.shadow.camera;
    let c = this._shadowCam;
    if (!c) {
      c = this._shadowCam = new THREE.OrthographicCamera();
      this._shadowLook = new THREE.Vector3();
    }
    if (c.left !== src.left || c.right !== src.right || c.top !== src.top || c.bottom !== src.bottom || c.near !== src.near || c.far !== src.far) {
      c.left = src.left; c.right = src.right; c.top = src.top; c.bottom = src.bottom;
      c.near = src.near; c.far = src.far;
      c.updateProjectionMatrix();
    }
    c.position.setFromMatrixPosition(light.matrixWorld);
    this._shadowLook.setFromMatrixPosition(light.target.matrixWorld);
    c.lookAt(this._shadowLook);
    c.updateMatrixWorld();
    return c;
  }

  _shadowLight() {
    // Luz que proyecta sombra y se ve de verdad (ella y todos sus padres visibles)
    const usable = (o) => {
      if (!o || !o.isDirectionalLight || !o.castShadow) return false;
      for (let p = o; p; p = p.parent) if (!p.visible) return false;
      return true;
    };
    if (this._light && this._light.parent && usable(this._light)) return this._light;
    const now = performance.now();
    if (this._lightSearchAt && now - this._lightSearchAt < 200) return null; // sin luz: buscar cada 0.2 s
    this._lightSearchAt = now;
    this._light = null;
    let scene = this.group;
    while (scene.parent) scene = scene.parent;
    scene.traverse((o) => { if (!this._light && usable(o)) this._light = o; });
    return this._light;
  }

  /**
   * Elige qué árboles se dibujan y con qué LOD para la cámara de este render.
   *  - Cerca de la cámara: árbol original; lejos: versión ligera (ver LOD_SWITCH). Durante el
   *    fundido se dibujan los dos, repartiéndose los píxeles (patrón complementario).
   *  - Se dibujan los que caen en la cámara; los que solo caen en la zona de sombras se añaden al
   *    final de la lista y solo los dibuja el pase de sombras.
   */
  _cull(camera) {
    if (!camera || !camera.isCamera) return;
    for (let p = this.group; p; p = p.parent) if (!p.visible) return;
    const SW = GenshinTrees.LOD_SWITCH, H = GenshinTrees.LOD_HYST;
    const now = performance.now();
    const dt = this._lastCull ? Math.min(0.1, Math.max(0, (now - this._lastCull) / 1000)) : 0;
    this._lastCull = now;
    const step = dt / GenshinTrees.LOD_FADE_S;
    this._pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pm);
    const light = this._shadowLight();
    let useShadow = false;
    if (light && light.shadow && light.shadow.camera) {
      // Hito 83: la zona de sombras se calcula en una cámara propia. Antes se llamaba a
      // light.shadow.updateMatrices(light), que cambia la matriz con la que se LEEN las sombras; en los
      // fotogramas en que el mapa no se recalcula (uno de cada dos, Hito 53) el mapa viejo se leía con
      // la matriz nueva y las sombras parpadeaban al caminar.
      const sc = LightingManager.debug.legacy ? (light.shadow.updateMatrices(light), light.shadow.camera) : this._shadowCullCamera(light);
      this._pm.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse);
      this._shadowFrustum.setFromProjectionMatrix(this._pm);
      useShadow = true;
    }
    const cx = camera.matrixWorld.elements[12], cy = camera.matrixWorld.elements[13], cz = camera.matrixWorld.elements[14];
    const sph = this._sph;
    for (const B of this.lodBuckets) {
      for (let i = 0; i < B.n; i++) {
        sph.center.set(B.centers[i * 3], B.centers[i * 3 + 1], B.centers[i * 3 + 2]);
        sph.radius = B.radii[i];
        B.cam[i] = this._frustum.intersectsSphere(sph) ? 1 : 0;
        B.shadow[i] = (!B.cam[i] && useShadow && this._shadowFrustum.intersectsSphere(sph)) ? 1 : 0;
        const d = Math.hypot(sph.center.x - cx, sph.center.y - cy, sph.center.z - cz);
        // target: 1 = original, 0 = ligera (con histéresis)
        if (!B.init) B.target[i] = d < SW ? 1 : 0;
        else if (d < SW - H) B.target[i] = 1;
        else if (d > SW + H) B.target[i] = 0;
        if (!GenshinTrees.LOD_ENABLED) B.target[i] = 1; // sin LOD: siempre el árbol original
        const tgt = B.target[i];
        if (!B.init) B.fade[i] = tgt;
        else if (B.fade[i] < tgt) B.fade[i] = Math.min(tgt, B.fade[i] + step);
        else if (B.fade[i] > tgt) B.fade[i] = Math.max(tgt, B.fade[i] - step);
      }
      B.init = true;
      for (const part of B.parts) {
        this._fillLod(part.lod0, part, B, true);
        if (part.lod1) this._fillLod(part.lod1, part, B, false);
      }
    }
  }

  _fillLod(im, part, B, isLod0) {
    const ids = part.ids;
    const mat = im.instanceMatrix.array;
    const col = im.instanceColor.array;
    const lodAttr = im.geometry.attributes.aLod;
    const lod = lodAttr ? lodAttr.array : null;
    // Solo se sube a la GPU lo que cambió: con la cámara quieta no se sube nada, y al caminar
    // casi siempre cambia solo el valor de fundido de unos pocos árboles.
    const order = im.userData.order || (im.userData.order = new Int32Array(ids.length).fill(-1));
    let k = 0;
    let main = 0;
    let orderChanged = false;
    let lodChanged = false;
    for (let pass = 0; pass < 2; pass++) { // 0: visibles en cámara, 1: solo sombra
      for (let j = 0; j < ids.length; j++) {
        const i = ids[j];
        if (pass === 0 ? !B.cam[i] : !B.shadow[i]) continue;
        const f = B.fade[i];
        if (isLod0 ? f <= 0 : f >= 1) continue;
        if (order[k] !== j) {
          order[k] = j;
          orderChanged = true;
          for (let e = 0; e < 16; e++) mat[k * 16 + e] = B.matrices[i * 16 + e];
          col[k * 3] = part.colors[j * 3]; col[k * 3 + 1] = part.colors[j * 3 + 1]; col[k * 3 + 2] = part.colors[j * 3 + 2];
        }
        if (lod) {
          const v = Math.fround(isLod0 ? 1 - f : 3 - f);
          if (lod[k] !== v) { lod[k] = v; lodChanged = true; }
        }
        k++;
      }
      if (pass === 0) main = k;
    }
    if (k !== im.userData.totalCount) orderChanged = true;
    for (let r = k; r < order.length && order[r] !== -1; r++) order[r] = -1;
    im.userData.mainCount = main;
    im.userData.totalCount = k;
    im.count = k;
    im.visible = k > 0;
    if (k > 0 && orderChanged) {
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
    }
    if (lod && k > 0 && (lodChanged || orderChanged)) lodAttr.needsUpdate = true;
  }

  update(delta) {
    this.time.value += delta;
    if (this._tryInstallHook) {
      const set = this._cullScene && this._cullScene.userData.lkTreeCullers;
      if (!this._hookReady || (set && !set.has(this))) this._hookReady = this._tryInstallHook();
    }
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
