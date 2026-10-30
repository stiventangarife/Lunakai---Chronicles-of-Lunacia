import * as THREE from 'three';
import { mergeGeometries } from '../../../../../vendor/utils/BufferGeometryUtils.js';
import { GenshinTrees } from '../../demo_scena/genshin/GenshinTrees.js';
import { loadTexture, isKtx2Texture } from '../../../../render/Ktx2.js';
import { createSeededRandom } from '../../demo_scena/MathUtils.js';

/**
 * IslandTrees — The Forest's bulky brush-stroke trees (same leaf cards, toon ramp, wind,
 * translucency and bark textures) extended with island archetypes:
 *
 *   broad    rounded broadleaf (Forest archetype)        — any palette (jade, lavender…)
 *   conifer  drooping fir tiers (Forest archetype)       — optional snow on top of the tiers
 *   acacia   savanna umbrella acacia: forked trunk, wide flat layered crown
 *   palm     curved trunk + drooping feathered fronds
 *   dead     bare twisted branches (dry savanna / charred volcanic trees), no foliage
 *
 * trees: [{ kind, family, pos: Vector3, rotY, s, sy }]
 * cfg:   { palettes: { family: [hex…] }, trunks: { family: { bark, tone:[r,g,b] } },
 *          snow: 0..1, foliageGlow: 0..1 }
 * One InstancedMesh per (archetype variant) for foliage + one per (variant, family) for trunks.
 */
export class IslandTrees extends GenshinTrees {
  constructor(parent, trees, sunDirection, cfg = {}) {
    super(parent, { pendingTrees: [] }, sunDirection);
    this.group.name = 'IslandTrees';
    this.cfg = cfg;

    this.frondTexture = this._createFrondTexture();
    this.frondMaterial = this._decorateFoliage(this._createFoliageMaterial(this.frondTexture, 0.42), 'frond');
    // Island-specific foliage decoration (snow caps / bioluminescence) on the shared materials
    this.leafMaterial = this._decorateFoliage(this.leafMaterial, 'leaf');
    this.needleMaterial = this._decorateFoliage(this.needleMaterial, 'needle');

    const kinds = new Set(trees.map((t) => t.kind));
    if (kinds.has('acacia')) this.archetypes.acacia = [0, 1, 2].map((i) => this._buildAcacia(3100 + i * 29, i));
    if (kinds.has('palm')) this.archetypes.palm = [0, 1, 2].map((i) => this._buildPalm(4100 + i * 31, i));
    if (kinds.has('dead')) this.archetypes.dead = [0, 1, 2].map((i) => this._buildDead(5100 + i * 37, i));
    if (kinds.has('arcane')) this.archetypes.arcane = [this._buildArcane(6100)];

    this._instantiateIsland(trees);
  }

  // ---------------------------------------------------------------------------
  // Materials
  // ---------------------------------------------------------------------------

  _getTrunkMaterial(variety) {
    const extra = this.cfg && this.cfg.trunks ? this.cfg.trunks[variety] : null;
    if (!extra) return super._getTrunkMaterial(variety);
    if (!this._trunkMaterials) this._trunkMaterials = {};
    const key = 'island_' + variety;
    if (this._trunkMaterials[key]) return this._trunkMaterials[key];
    const tex = GenshinTrees.BARK_TEXTURES[extra.bark] || GenshinTrees.BARK_TEXTURES.normal;
    if (!this._barkTex) this._barkTex = {};
    if (!this._barkTex[extra.bark]) {
      // 30-oct: corteza en KTX2 (docs/PLAN_KTX2.md). Una textura KTX2 no se voltea al subirla (el PNG sí):
      // - color (ETC1S, el mismo archivo que usan los .gltf): repeat.y = -1 la deja igual que el PNG;
      // - normales (UASTC): archivo ya volteado (*.flip.ktx2). Con repeat.y = -1 el relieve saldría invertido, porque
      //   three calcula la orientación del mapa de normales a partir de las UV transformadas.
      const map = loadTexture(tex.map);
      map.colorSpace = THREE.SRGBColorSpace;
      const normalMap = loadTexture(tex.normal);
      [map, normalMap].forEach((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2, t === map && isKtx2Texture(t) ? -1 : 1);
        t.anisotropy = 4;
      });
      this._barkTex[extra.bark] = { map, normalMap };
    }
    if (!this._barkBase) this._barkBase = this._averageLinearColor(this.barkTexture.image);
    const base = this._barkBase;
    const { map, normalMap } = this._barkTex[extra.bark];
    const m = new THREE.MeshToonMaterial({
      map,
      normalMap,
      gradientMap: this.gradientMap,
      color: new THREE.Color().setRGB(
        (base[0] * extra.tone[0]) / tex.avg[0],
        (base[1] * extra.tone[1]) / tex.avg[1],
        (base[2] * extra.tone[2]) / tex.avg[2]
      )
    });
    m.name = `IslandBark_${variety}`;
    if (this.cfg.snow) this._addSnowToStandard(m, this.cfg.snow * 0.6, 'bark');
    this._trunkMaterials[key] = m;
    return m;
  }

  /** Adds snow caps (upward faces) and/or a soft bioluminescent glow to a foliage material. */
  _decorateFoliage(m, tag) {
    const snow = this.cfg ? (this.cfg.snow || 0) : 0;
    const glow = this.cfg ? (this.cfg.foliageGlow || 0) : 0;
    if (!snow && !glow) return m;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (shader, r) => {
      prev(shader, r);
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        {
          vec3 nCrown = normalize(vCrownNormalW);
          float snowMask = smoothstep(0.55, 0.85, nCrown.y) * ${snow.toFixed(3)} * 1.4;
          float lit = dot(outgoingLight, vec3(0.3333)) / max(dot(diffuseColor.rgb, vec3(0.3333)), 0.02);
          vec3 snowCol = vec3(0.9, 0.95, 1.0) * clamp(lit, 0.25, 1.6) * 0.85 + vec3(0.04, 0.06, 0.1);
          outgoingLight = mix(outgoingLight, snowCol, clamp(snowMask, 0.0, 0.85));
          outgoingLight += diffuseColor.rgb * ${glow.toFixed(3)};
        }
        #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => `island-foliage-${tag}-${snow.toFixed(2)}-${glow.toFixed(2)}`;
    return m;
  }

  _addSnowToStandard(m, amount, tag) {
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec3 vSnowN;`)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          {
            vec3 nW = objectNormal;
            #ifdef USE_INSTANCING
              nW = mat3(instanceMatrix) * nW;
            #endif
            vSnowN = normalize(mat3(modelMatrix) * nW);
          }`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vSnowN;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.96, 1.0), smoothstep(0.45, 0.8, normalize(vSnowN).y) * ${amount.toFixed(3)});`);
    };
    m.customProgramCacheKey = () => `island-snow-${tag}-${amount.toFixed(2)}`;
  }

  _createFrondTexture() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.clearRect(0, 0, S, S);
    const rng = createSeededRandom(1717);
    // Central rib along v, feathered leaflets angled toward the tip (u = across, v = along)
    g.strokeStyle = 'rgb(170,170,170)';
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const t = i / 46;
      const y = S * (1 - t);
      const len = S * 0.48 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08));
      for (const side of [-1, 1]) {
        const l = 170 + Math.floor(rng() * 80);
        g.strokeStyle = `rgb(${l},${l},${l})`;
        g.lineWidth = 7 + rng() * 4;
        g.beginPath();
        g.moveTo(S / 2, y);
        g.lineTo(S / 2 + side * len, y - len * 0.55);
        g.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  // ---------------------------------------------------------------------------
  // Archetypes
  // ---------------------------------------------------------------------------

  /** Squash a puff vertically around its own centre (flat acacia layers). */
  _flattenPuff(geo, center, k) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, center.y + (p.getY(i) - center.y) * k);
    return geo;
  }

  _buildAcacia(seed, variant) {
    const rng = createSeededRandom(seed);
    const height = 4.6 + variant * 0.5 + rng() * 0.6;
    const lean = new THREE.Vector3((rng() - 0.5) * 0.35, 1, (rng() - 0.5) * 0.35);
    const trunk = this._branch(new THREE.Vector3(0, -0.3, 0), lean, height * 0.55, 0.36, 0.22, 7, 4, seed * 0.01, 0.25);
    const trunkGeos = [trunk.geo];
    const puffs = [];
    // 3–4 forked limbs spreading outward like an umbrella frame
    const limbs = 3 + Math.floor(rng() * 2);
    const tips = [];
    for (let l = 0; l < limbs; l++) {
      const a = (l / limbs) * Math.PI * 2 + rng() * 0.7;
      const dir = new THREE.Vector3(Math.cos(a) * 1.1, 0.95, Math.sin(a) * 1.1);
      const limb = this._branch(trunk.end, dir, height * 0.62, 0.18, 0.07, 6, 3, seed + 20 + l, 0.3);
      trunkGeos.push(limb.geo);
      tips.push({ tip: limb.end.clone(), jitter: (rng() - 0.5) * 0.3, r: 1.9 + rng() * 0.5 });
    }
    // Crown rests ON the limb tips (the flattened layer's underside reaches the branches),
    // instead of a fixed height above them → no floating canopy.
    const tipY = tips.reduce((acc, t) => acc + t.tip.y, 0) / tips.length;
    const crownY = tipY + 0.25;
    tips.forEach(({ tip, jitter, r }) => {
      puffs.push({ c: new THREE.Vector3(tip.x, Math.min(crownY + jitter, tip.y + 0.35), tip.z), r });
    });
    const crownCenter = new THREE.Vector3(trunk.end.x, crownY, trunk.end.z);
    puffs.push({ c: crownCenter.clone().add(new THREE.Vector3(0, 0.25, 0)), r: 2.6 + rng() * 0.4 });
    const ring = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + rng() * 0.5;
      const r = 2.8 + rng() * 0.9;
      puffs.push({ c: crownCenter.clone().add(new THREE.Vector3(Math.cos(a) * r, (rng() - 0.5) * 0.35, Math.sin(a) * r)), r: 1.6 + rng() * 0.4 });
    }
    const foliageGeos = puffs.map((p) => this._flattenPuff(this._foliagePuff(p.c, p.r, crownCenter, Math.round(22 * p.r), rng, 1.5, 0.8), p.c, 0.38));
    const trunkGeo = mergeGeometries(trunkGeos.map((g) => this._withSway(g, 0.0)), false);
    const foliageGeo = mergeGeometries(foliageGeos, false);
    trunkGeo.computeBoundingSphere();
    foliageGeo.computeBoundingSphere();
    return { trunk: trunkGeo, foliage: foliageGeo, kind: 'acacia' };
  }

  _buildPalm(seed, variant) {
    const rng = createSeededRandom(seed);
    const height = 6.5 + variant * 0.9 + rng() * 1.0;
    const bendDir = rng() * Math.PI * 2;
    // Curved trunk: several short segments bending progressively
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const off = Math.pow(t, 2.0) * (1.2 + variant * 0.35);
      pts.push(new THREE.Vector3(Math.cos(bendDir) * off, t * height, Math.sin(bendDir) * off));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 14, 1, 7, false);
    const tp = tube.attributes.position, tn = tube.attributes.normal;
    for (let r = 0; r <= 14; r++) {
      const t = r / 14;
      const c = curve.getPointAt(t);
      // Ringed palm bark: subtle bulges every segment
      const radius = THREE.MathUtils.lerp(0.32, 0.2, t) * (1.0 + 0.08 * Math.sin(t * 40.0));
      for (let k = 0; k <= 7; k++) {
        const idx = r * 8 + k;
        tp.setXYZ(idx, c.x + tn.getX(idx) * radius, c.y + tn.getY(idx) * radius, c.z + tn.getZ(idx) * radius);
      }
    }
    const uv = new Float32Array(tp.count * 2);
    for (let r = 0; r <= 14; r++) for (let k = 0; k <= 7; k++) { const idx = r * 8 + k; uv[idx * 2] = k / 7; uv[idx * 2 + 1] = (r / 14) * height * 0.35; }
    tube.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    tube.computeVertexNormals();
    const top = curve.getPointAt(1);

    // Fronds: drooping feathered strips radiating from the crown
    const positions = [], normals = [], uvs = [], colors = [], sways = [], indices = [];
    const fronds = 9 + Math.floor(rng() * 3);
    for (let f = 0; f < fronds; f++) {
      const a = (f / fronds) * Math.PI * 2 + rng() * 0.3;
      const len = 3.0 + rng() * 0.9;
      const lift = 0.5 + rng() * 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      const segs = 6;
      const base = positions.length / 3;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const r = t * len;
        const y = top.y + lift * Math.sin(t * Math.PI * 0.6) - Math.pow(t, 2.2) * 2.2;
        const w = 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.06));
        const cx = top.x + ca * r, cz = top.z + sa * r;
        positions.push(cx - sa * w, y, cz + ca * w, cx + sa * w, y, cz - ca * w);
        const n = new THREE.Vector3(ca * 0.3, 1.0, sa * 0.3).normalize();
        normals.push(n.x, n.y, n.z, n.x, n.y, n.z);
        uvs.push(0, t, 1, t);
        const shade = 0.8 + 0.25 * (1 - t);
        colors.push(shade, shade, shade, shade, shade, shade);
        sways.push(t * 0.9, t * 0.9);
      }
      for (let s = 0; s < segs; s++) {
        const i0 = base + s * 2;
        indices.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
      }
    }
    const foliage = new THREE.BufferGeometry();
    foliage.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    foliage.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    foliage.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    foliage.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    foliage.setAttribute('aSway', new THREE.Float32BufferAttribute(sways, 1));
    foliage.setIndex(indices);
    foliage.computeBoundingSphere();
    const trunkGeo = this._withSway(tube, 0.0);
    trunkGeo.computeBoundingSphere();
    return { trunk: trunkGeo, foliage, kind: 'palm' };
  }

  /**
   * Colossal Arcane Tree (Mystic island focal point): buttressed trunk, five great limbs and a
   * cloud of huge painterly canopy puffs. Built at real scale (~45 m), instanced once.
   */
  _buildArcane(seed) {
    const rng = createSeededRandom(seed);
    const height = 30;
    const trunk = this._branch(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0.05, 1, -0.04), height, 6.2, 2.6, 14, 6, seed * 0.01, 0.12);
    const geos = [trunk.geo];
    for (let r = 0; r < 7; r++) {
      const a = (r / 7) * Math.PI * 2 + rng() * 0.4;
      const root = this._branch(new THREE.Vector3(Math.cos(a) * 3.5, 5.5, Math.sin(a) * 3.5), new THREE.Vector3(Math.cos(a), -0.42, Math.sin(a)), 11 + rng() * 5, 2.4, 0.5, 8, 4, seed + r, 0.3);
      geos.push(root.geo);
    }
    const crownCenter = trunk.end.clone().add(new THREE.Vector3(0, 6, 0));
    const puffs = [{ c: crownCenter.clone(), r: 11 }, { c: crownCenter.clone().add(new THREE.Vector3(0, 6, 0)), r: 8 }];
    for (let l = 0; l < 5; l++) {
      const a = (l / 5) * Math.PI * 2 + rng() * 0.5;
      const start = trunk.end.clone().multiplyScalar(0.7);
      const limb = this._branch(start, new THREE.Vector3(Math.cos(a), 0.75, Math.sin(a)), 14 + rng() * 4, 1.6, 0.6, 8, 4, seed + 20 + l, 0.3);
      geos.push(limb.geo);
      puffs.push({ c: limb.end.clone().add(new THREE.Vector3(0, 2.5, 0)), r: 8 + rng() * 2 });
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      puffs.push({ c: crownCenter.clone().add(new THREE.Vector3(Math.cos(a) * 12, -2 + rng() * 3, Math.sin(a) * 12)), r: 7 + rng() * 2 });
    }
    const foliageGeos = puffs.map((p) => this._foliagePuff(p.c, p.r, crownCenter, Math.round(14 * p.r), rng, 4.2, 0.35));
    const trunkGeo = mergeGeometries(geos.map((g) => this._withSway(g, 0.0)), false);
    const foliageGeo = mergeGeometries(foliageGeos, false);
    trunkGeo.computeBoundingSphere();
    foliageGeo.computeBoundingSphere();
    return { trunk: trunkGeo, foliage: foliageGeo, kind: 'arcane' };
  }

  _buildDead(seed, variant) {
    const rng = createSeededRandom(seed);
    const height = 3.8 + variant * 0.7 + rng() * 0.8;
    const trunk = this._branch(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3((rng() - 0.5) * 0.4, 1, (rng() - 0.5) * 0.4), height, 0.3, 0.08, 7, 5, seed * 0.01, 0.5);
    const geos = [trunk.geo];
    const limbs = 3 + Math.floor(rng() * 3);
    for (let l = 0; l < limbs; l++) {
      const a = (l / limbs) * Math.PI * 2 + rng() * 0.8;
      const t = 0.45 + rng() * 0.4;
      const start = new THREE.Vector3(0, -0.3, 0).lerp(trunk.end, t);
      const limb = this._branch(start, new THREE.Vector3(Math.cos(a), 0.7 + rng() * 0.6, Math.sin(a)), 1.4 + rng() * 1.3, 0.12, 0.03, 5, 3, seed + 30 + l, 0.6);
      geos.push(limb.geo);
      // Small twig at the limb end
      const twig = this._branch(limb.end, new THREE.Vector3(Math.cos(a + 0.8), 1.0, Math.sin(a + 0.8)), 0.7 + rng() * 0.5, 0.04, 0.012, 4, 2, seed + 60 + l, 0.6);
      geos.push(twig.geo);
    }
    const trunkGeo = mergeGeometries(geos.map((g) => this._withSway(g, 0.0)), false);
    trunkGeo.computeBoundingSphere();
    return { trunk: trunkGeo, foliage: null, kind: 'dead' };
  }

  // ---------------------------------------------------------------------------
  // Instancing
  // ---------------------------------------------------------------------------

  _foliageMaterialFor(kind) {
    if (kind === 'conifer') return this.needleMaterial;
    if (kind === 'palm') return this.frondMaterial;
    return this.leafMaterial;
  }

  _instantiateIsland(trees) {
    const rng = createSeededRandom(this.cfg.seed || 8675309);
    const palettes = this.cfg.palettes || {};
    const buckets = new Map();
    for (const t of trees) {
      const list = this.archetypes[t.kind];
      if (!list) continue;
      const variant = Math.floor(rng() * list.length);
      const bkey = `${t.kind}_${variant}`;
      if (!buckets.has(bkey)) buckets.set(bkey, { arch: list[variant], kind: t.kind, items: [] });
      const pal = palettes[t.family] || [0x6fae3c];
      const hex = pal[Math.floor(rng() * pal.length)];
      buckets.get(bkey).items.push({
        pos: t.pos,
        rotY: t.rotY !== undefined ? t.rotY : rng() * Math.PI * 2,
        s: t.s || 1,
        sy: t.sy || t.s || 1,
        family: t.family,
        color: new THREE.Color(hex).offsetHSL((rng() - 0.5) * 0.02, (rng() - 0.5) * 0.06, (rng() - 0.5) * 0.06)
      });
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const sc = new THREE.Vector3();
    const tint = new THREE.Color();
    const trunkRng = createSeededRandom(4243);
    buckets.forEach(({ arch, kind, items }, bkey) => {
      if (arch.foliage) {
        const foliage = new THREE.InstancedMesh(arch.foliage, this._foliageMaterialFor(kind), items.length);
        foliage.name = `IslandTreeFoliage_${bkey}`;
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        // Sombra con el mismo viento que las hojas (Hito 84)
        const swayDepth = GenshinTrees.swayDepthFor(foliage.material);
        if (swayDepth) foliage.customDepthMaterial = swayDepth;
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
      }
      const byFamily = new Map();
      for (const it of items) {
        if (!byFamily.has(it.family)) byFamily.set(it.family, []);
        byFamily.get(it.family).push(it);
      }
      byFamily.forEach((list, family) => {
        const trunk = new THREE.InstancedMesh(arch.trunk, this._getTrunkMaterial(family), list.length);
        trunk.name = `IslandTreeTrunk_${bkey}_${family}`;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        list.forEach((it, i) => {
          q.setFromAxisAngle(yAxis, it.rotY);
          sc.set(it.s, it.sy, it.s);
          m.compose(it.pos, q, sc);
          trunk.setMatrixAt(i, m);
          const v = 0.92 + trunkRng() * 0.16;
          tint.setRGB(v, v * (0.98 + trunkRng() * 0.04), v * (0.97 + trunkRng() * 0.04));
          trunk.setColorAt(i, tint);
        });
        trunk.instanceMatrix.needsUpdate = true;
        if (trunk.instanceColor) trunk.instanceColor.needsUpdate = true;
        trunk.computeBoundingSphere();
        this.group.add(trunk);
        this.meshes.push(trunk);
      });
    });
    console.log(`[IslandTrees] 🌴 ${trees.length} trees in ${this.meshes.length} instanced draw calls.`);
  }
}
