import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { createSeededRandom, SimplexNoise } from '../MathUtils.js';

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
   * Hand-painted bark textures that already ship with the game (assets/nature). Only their
   * strokes + relief are used; the colour comes from the tree variety tone below.
   * avg = linear-space average colour of each texture (measured offline).
   */
  static BARK_TEXTURES = {
    normal: { map: './assets/nature/Bark_NormalTree.png', normal: './assets/nature/Bark_NormalTree_Normal.png', avg: [0.2646, 0.0999, 0.0568] },
    twisted: { map: './assets/nature/Bark_TwistedTree.png', normal: './assets/nature/Bark_TwistedTree_Normal.png', avg: [0.0912, 0.0751, 0.0663] },
    pine: { map: './assets/nature/Bark_DeadTree.png', normal: './assets/nature/Bark_DeadTree_Normal.png', avg: [0.0539, 0.0473, 0.0520] }
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
      const loader = new THREE.TextureLoader();
      const map = loader.load(tex.map);
      map.colorSpace = THREE.SRGBColorSpace;
      const normalMap = loader.load(tex.normal);
      [map, normalMap].forEach((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2, 1);
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
          uniform float uTime;
          attribute float aSway;
          varying vec3 vWorldPosF;
          varying vec3 vCrownNormalW;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          {
            vec3 base = vec3(0.0);
            #ifdef USE_INSTANCING
              base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            #endif
            float ph = base.x * 0.21 + base.z * 0.17;
            float sway = aSway;
            transformed.x += (sin(uTime * 1.3 + ph) * 0.10 + sin(uTime * 3.7 + ph * 2.0 + position.y) * 0.03) * sway;
            transformed.z += (cos(uTime * 1.1 + ph) * 0.08) * sway;
          }`)
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
    return m;
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
    const height = 4.2 + variant * 0.5 + rng() * 0.8;
    const lean = new THREE.Vector3((rng() - 0.5) * 0.25, 1, (rng() - 0.5) * 0.25);
    const trunk = this._branch(new THREE.Vector3(0, -0.3, 0), lean, height, 0.42, 0.2, 8, 5, seed * 0.01);
    const trunkGeos = [trunk.geo];
    // Flared roots
    for (let r = 0; r < 4; r++) {
      const a = (r / 4) * Math.PI * 2 + rng() * 0.6;
      const root = this._branch(new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(Math.cos(a), -0.55, Math.sin(a)), 0.9, 0.22, 0.05, 5, 2, seed + r);
      trunkGeos.push(root.geo);
    }
    const crownCenter = trunk.end.clone().add(new THREE.Vector3(0, 1.4, 0));
    const puffs = [];
    const limbs = 2 + Math.floor(rng() * 3);
    for (let l = 0; l < limbs; l++) {
      const a = (l / limbs) * Math.PI * 2 + rng() * 0.8;
      const start = trunk.end.clone().multiplyScalar(0.62 + rng() * 0.2);
      const dir = new THREE.Vector3(Math.cos(a), 0.9 + rng() * 0.6, Math.sin(a));
      const limb = this._branch(start, dir, 1.8 + rng() * 1.0, 0.16, 0.06, 6, 3, seed + 10 + l);
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
    return { trunk: trunkGeo, foliage: foliageGeo, kind: 'broad' };
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
    const trunk = this._branch(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0, 1, 0), height + 1.2, 0.34, 0.06, 7, 4, seed * 0.02, 0.0);
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
    return { trunk: trunkGeo, foliage, kind: 'conifer' };
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
    buckets.forEach(({ arch, items }, bkey) => {
      const n = items.length;
      const foliage = new THREE.InstancedMesh(arch.foliage, arch.kind === 'conifer' ? this.needleMaterial : this.leafMaterial, n);
      foliage.name = `GenshinTreeFoliage_${bkey}`;
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      items.forEach((it, i) => {
        q.setFromAxisAngle(yAxis, it.rotY);
        sc.set(it.s, it.sy, it.s);
        m.compose(it.pos, q, sc);
        foliage.setMatrixAt(i, m);
        foliage.setColorAt(i, it.color);
      });
      foliage.instanceMatrix.needsUpdate = true;
      if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
      foliage.computeBoundingSphere();
      this.group.add(foliage);
      this.meshes.push(foliage);

      // Trunks: one InstancedMesh per variety in this archetype (bark pattern + brown tone)
      const byFamily = new Map();
      for (const it of items) {
        if (!byFamily.has(it.family)) byFamily.set(it.family, []);
        byFamily.get(it.family).push(it);
      }
      byFamily.forEach((list, family) => {
        const trunk = new THREE.InstancedMesh(arch.trunk, this._getTrunkMaterial(family), list.length);
        trunk.name = `GenshinTreeTrunk_${bkey}_${family}`;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        list.forEach((it, i) => {
          q.setFromAxisAngle(yAxis, it.rotY);
          sc.set(it.s, it.sy, it.s);
          m.compose(it.pos, q, sc);
          trunk.setMatrixAt(i, m);
          // Subtle per-tree tonality (±8 % value) so neighbouring trunks never look identical
          const v = 0.92 + trunkRng() * 0.16;
          trunkTint.setRGB(v, v * (0.98 + trunkRng() * 0.04), v * (0.97 + trunkRng() * 0.04));
          trunk.setColorAt(i, trunkTint);
        });
        trunk.instanceMatrix.needsUpdate = true;
        if (trunk.instanceColor) trunk.instanceColor.needsUpdate = true;
        trunk.computeBoundingSphere();
        this.group.add(trunk);
        this.meshes.push(trunk);
      });
    });

    console.log(`[GenshinTrees] 🍁 ${trees.length} painterly trees in ${this.meshes.length} instanced draw calls.`);
  }

  update(delta) {
    this.time.value += delta;
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
