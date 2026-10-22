import * as THREE from 'three';
import { GENSHIN_PALETTE, GLSL_NOISE, getGroundColorGLSL } from './GenshinArtDirection.js';
import { GenshinTerrainData } from './GenshinTerrainData.js';
import { createSeededRandom } from '../MathUtils.js';

/**
 * GenshinGrassField — Lush, soft, painterly meadow that follows the player.
 *
 * Architecture (GPU-driven, zero per-frame CPU work except re-positioning tiles):
 *  - A grid of N×N tiles (10 m each) recentred around the player. Every tile is one
 *    InstancedMesh that SHARES its geometry with all the other tiles of the same LOD;
 *    the tile origin is simply the mesh position (modelMatrix).
 *  - Each instance is a soft tuft of 3 rounded blades. Height, density, path/river
 *    clearing and colour are read from the baked terrain textures in the vertex shader.
 *  - Near tiles use a dense LOD, far tiles a sparse LOD with wider tufts; blades shrink
 *    smoothly to zero at the outer ring where the terrain shader paints the same colour,
 *    so the field melts into the ground without a visible edge.
 *  - Per-tile bounding spheres → native THREE frustum culling.
 *  - Real directional shadows (trees / characters) via the built-in shadow chunks.
 *  - Wildflowers (yellow / blue / white) use the same tile system with their own LOD.
 */
export class GenshinGrassField {
  constructor(parent, terrainData, quality) {
    this.parent = parent;
    this.data = terrainData;
    this.q = quality;
    this.T = quality.grassTileSize;
    this.N = quality.grassTilesPerSide;
    this.group = new THREE.Group();
    this.group.name = 'GenshinGrassField';
    parent.add(this.group);

    this.rng = createSeededRandom(77101);
    this._lastTileX = null;
    this._lastTileZ = null;

    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uWindStrength: { value: 0.22 },
        uWindSpeed: { value: 0.9 },
        // Outer fade ends 1 m before the guaranteed tile coverage → tiles recentre while invisible
        uFadeStart: { value: Math.floor(this.N / 2) * this.T - 1.0 - 1.3 * this.T },
        uFadeEnd: { value: Math.floor(this.N / 2) * this.T - 1.0 },
        // Crossfade LOD band (dense → sparse) and flower distance fade-out
        uLodNear: { value: this._lodR() - 10.0 },
        uLodFar: { value: this._lodR() },
        uGrassFarKeep: { value: 1.0 },
        uFlowerFarKeep: { value: 1.0 },
        uFlowerCut: { value: 34.0 },
        uCenter: { value: new THREE.Vector3() },
        uPlayerPos: { value: new THREE.Vector3(9999, 0, 9999) },
        uCompanionPos: { value: new THREE.Vector3(9999, 0, 9999) },
        uHeightScale: { value: 1.0 },
        uSunTint: { value: new THREE.Color(GENSHIN_PALETTE.grassSun) },
        uShadowTint: { value: new THREE.Color(0.80, 0.90, 1.12) }, // linear: cool blue shift, not darkening
        uBacklight: { value: new THREE.Color(0xf6ffa8) }
      },
      terrainData.uniforms()
    ]);
    // UniformsUtils.merge clones textures by reference; re-assign to be explicit.
    this.uniforms.uTerrainHeight.value = terrainData.heightTex;
    this.uniforms.uTerrainMask.value = terrainData.maskTex;

    this.grassMaterial = this._createGrassMaterial();
    this.flowerMaterial = this._createFlowerMaterial();

    // Crossfade LOD: the far LOD is an exact PREFIX of the (shuffled) near instance list, so the
    // same tufts/flowers exist in both LODs at the same spots. The shader fades out the extra
    // near-only instances by distance before a tile ever switches geometry → no pop-in.
    const grassInst = this._createTuftInstances(quality.grassTuftsNear);
    const farGrass = Math.min(quality.grassTuftsFar, quality.grassTuftsNear);
    this.geoNear = this._createTuftGeometry(grassInst, quality.grassTuftsNear, 3);
    this.geoFar = this._createTuftGeometry(grassInst, farGrass, 1);
    this.uniforms.uGrassFarKeep.value = farGrass / quality.grassTuftsNear;
    this._nearCount = quality.grassTuftsNear;
    this._farCount = farGrass;
    const flowerInst = this._createFlowerInstances(quality.flowersPerTile);
    const farFlowers = Math.max(1, Math.round(quality.flowersPerTile * 0.4));
    this.flowerGeoNear = this._createFlowerGeometry(flowerInst, quality.flowersPerTile);
    this.flowerGeoFar = this._createFlowerGeometry(flowerInst, farFlowers);
    this.uniforms.uFlowerFarKeep.value = farFlowers / quality.flowersPerTile;
    this._lastLodPos = new THREE.Vector3(1e9, 0, 1e9);

    this.tiles = [];
    for (let i = 0; i < this.N * this.N; i++) {
      const grass = new THREE.Mesh(this.geoNear, this.grassMaterial);
      grass.receiveShadow = true;
      grass.castShadow = false;
      grass.matrixAutoUpdate = true;
      grass.name = 'GenshinGrassTile';
      const flowers = new THREE.Mesh(this.flowerGeoNear, this.flowerMaterial);
      flowers.receiveShadow = true;
      flowers.name = 'GenshinFlowerTile';
      this.group.add(grass);
      this.group.add(flowers);
      this.tiles.push({ grass, flowers });
    }
  }

  // -------------------------------------------------------------------------------------
  // Geometry
  // -------------------------------------------------------------------------------------

  /** Radius where the dense → sparse crossfade finishes (tiles beyond it use the sparse LOD). */
  _lodR() {
    return this.q.grassNearRadius + 4.0;
  }

  /**
   * Stratified jittered placement inside the tile, then a deterministic shuffle so that any
   * prefix of the list is an even random subset (used by the far LOD). aRank = order / count.
   */
  _createTuftInstances(count) {
    const rng = createSeededRandom(77101 + 97);
    const inst = new Float32Array(count * 4);
    const side = Math.ceil(Math.sqrt(count));
    const cell = this.T / side;
    for (let i = 0; i < count; i++) {
      const gx = i % side, gz = Math.floor(i / side);
      inst[i * 4 + 0] = (gx + rng()) * cell;
      inst[i * 4 + 1] = (gz + rng()) * cell;
      inst[i * 4 + 2] = rng() * Math.PI * 2;
      inst[i * 4 + 3] = rng();
    }
    return this._shuffleInstances(inst, count, 5150);
  }

  _createFlowerInstances(count) {
    const rng = createSeededRandom(66071 + count);
    const inst = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      inst[i * 4 + 0] = rng() * this.T;
      inst[i * 4 + 1] = rng() * this.T;
      inst[i * 4 + 2] = rng() * Math.PI * 2;
      inst[i * 4 + 3] = rng();
    }
    return this._shuffleInstances(inst, count, 6061);
  }

  _shuffleInstances(inst, count, seed) {
    const rng = createSeededRandom(seed);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      for (let k = 0; k < 4; k++) {
        const tmp = inst[i * 4 + k];
        inst[i * 4 + k] = inst[j * 4 + k];
        inst[j * 4 + k] = tmp;
      }
    }
    const rank = new Float32Array(count);
    for (let i = 0; i < count; i++) rank[i] = (i + 0.5) / count;
    return { inst, rank };
  }

  /** One tuft = 3 soft blades. Instances carry (localX, localZ, rotY, rand) + aRank. */
  _createTuftGeometry(instances, count, segsLOD = 3) {
    const widthMul = 1.0; // far tufts are widened in the shader (continuous, no swap pop)
    const base = new THREE.BufferGeometry();
    const pos = [];
    const uv = [];
    const idx = [];
    const blades = [
      { a: 0.0, h: 1.0, w: 0.15, lean: 0.2, ox: 0.0, oz: 0.0 },
      { a: 2.2, h: 0.82, w: 0.14, lean: 0.28, ox: 0.06, oz: 0.03 },
      { a: 4.1, h: 0.7, w: 0.16, lean: 0.3, ox: -0.05, oz: 0.05 }
    ];
    let v = 0;
    for (const b of blades) {
      const ca = Math.cos(b.a), sa = Math.sin(b.a);
      const segs = segsLOD;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        // Rounded, slightly swollen profile → soft painterly look instead of needles
        const halfW = b.w * widthMul * 0.5 * (1.0 - Math.pow(t, 2.2)) * (1.0 + 0.25 * Math.sin(t * Math.PI));
        const lean = b.lean * t * t;
        const y = b.h * t;
        const cx = b.ox + ca * lean;
        const cz = b.oz + sa * lean;
        // Width axis perpendicular to lean direction
        pos.push(cx - sa * halfW, y, cz + ca * halfW);
        pos.push(cx + sa * halfW, y, cz - ca * halfW);
        uv.push(0, t, 1, t);
      }
      // Rounded tip
      pos.push(b.ox + ca * b.lean * 1.05, b.h * 1.06, b.oz + sa * b.lean * 1.05);
      uv.push(0.5, 1.0);
      for (let s = 0; s < segs; s++) {
        const a = v + s * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      idx.push(v + segs * 2, v + segs * 2 + 1, v + segs * 2 + 2);
      v += (segs + 1) * 2 + 1;
    }
    base.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    base.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    base.setIndex(idx);

    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;

    geo.setAttribute('aInst', new THREE.InstancedBufferAttribute(instances.inst.subarray(0, count * 4), 4));
    geo.setAttribute('aRank', new THREE.InstancedBufferAttribute(instances.rank.subarray(0, count), 1));
    geo.instanceCount = count;
    this._setTileBounds(geo, 1.6);
    return geo;
  }

  /** Crossed quads with a procedural 5-petal flower drawn in the fragment shader. */
  _createFlowerGeometry(instances, count) {
    const base = new THREE.BufferGeometry();
    const pos = [];
    const uv = [];
    const idx = [];
    const size = 0.22, stem = 0.34;
    for (let q = 0; q < 2; q++) {
      const a = q * Math.PI * 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      const o = q * 4;
      // Quad from y=0 (stem bottom) to y=stem+size (flower top)
      pos.push(-ca * size, 0, -sa * size, ca * size, 0, sa * size, ca * size, stem + size, sa * size, -ca * size, stem + size, -sa * size);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    // Small horizontal disc so flowers read from the top-down camera too
    const o = 8;
    const hy = stem + size * 0.55;
    pos.push(-size, hy, -size, size, hy, -size, size, hy, size, -size, hy, size);
    uv.push(0, 0.42, 1, 0.42, 1, 1.42, 0, 1.42); // v > 1 flags the "top" card in the shader
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);

    base.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    base.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    base.setIndex(idx);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;
    geo.setAttribute('aInst', new THREE.InstancedBufferAttribute(instances.inst.subarray(0, count * 4), 4));
    geo.setAttribute('aRank', new THREE.InstancedBufferAttribute(instances.rank.subarray(0, count), 1));
    geo.instanceCount = count;
    this._setTileBounds(geo, 0.8);
    return geo;
  }

  _setTileBounds(geo, extraHeight) {
    const minH = this.data.minHeight - 0.5;
    const maxH = this.data.maxHeight + extraHeight + 0.5;
    geo.boundingBox = new THREE.Box3(new THREE.Vector3(-0.5, minH, -0.5), new THREE.Vector3(this.T + 0.5, maxH, this.T + 0.5));
    geo.boundingSphere = new THREE.Sphere();
    geo.boundingBox.getBoundingSphere(geo.boundingSphere);
  }

  // -------------------------------------------------------------------------------------
  // Materials
  // -------------------------------------------------------------------------------------

  _commonVertexHeader() {
    return /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      #include <shadowmap_pars_vertex>
      attribute vec4 aInst;
      attribute float aRank;
      uniform float uTime, uWindStrength, uWindSpeed, uFadeStart, uFadeEnd, uHeightScale;
      uniform float uLodNear, uLodFar, uGrassFarKeep, uFlowerFarKeep, uFlowerCut;

      // Crossfade LOD: fraction of instances kept at this distance; instances whose rank is just
      // above it shrink smoothly to zero (scale fade) instead of popping.
      float lodFade(float dist, float rank, float farKeep) {
        float t = smoothstep(uLodNear, uLodFar, dist);
        float keep = mix(1.0, farKeep, t);
        return clamp((keep - rank) / 0.08, 0.0, 1.0);
      }
      uniform vec3 uCenter, uPlayerPos, uCompanionPos;
      ${GLSL_NOISE}
      ${GenshinTerrainData.glsl()}
      ${getGroundColorGLSL()}

      vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

      // Painterly wind: big slow gust bands + small flutter, returns XZ displacement
      vec2 windAt(vec2 xz, float rnd) {
        vec2 dir = normalize(vec2(1.0, 0.45));
        float gust = gNoise(xz * 0.045 - dir * uTime * uWindSpeed * 0.6);
        float wave = sin(dot(xz, dir) * 0.35 - uTime * uWindSpeed * 1.7) * 0.5 + 0.5;
        float flutter = sin(uTime * 3.1 + rnd * 6.2831 + xz.x * 0.9) * 0.18;
        float w = (gust * 0.75 + wave * 0.45 + flutter) * uWindStrength;
        return dir * w;
      }
    `;
  }

  _createGrassMaterial() {
    const vertexShader = /* glsl */ `
      ${this._commonVertexHeader()}
      varying vec3 vBaseColor;
      varying float vT;
      varying float vRand;
      varying vec3 vWorld;
      varying float vWind;
      varying vec3 vTerrainN;

      void main() {
        vec3 origin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        // World-space jitter (breaks the 10 m tile repetition)
        vec2 local = aInst.xy;
        vec2 wxz0 = origin.xz + local;
        vec2 jitter = vec2(gHash12(wxz0 * 0.731), gHash12(wxz0.yx * 1.379)) - 0.5;
        vec2 wxz = wxz0 + jitter * 0.35;
        float rnd = fract(aInst.w + gHash12(floor(origin.xz * 0.1)) * 0.618);

        vec4 m = terrainMaskAt(wxz);
        float density = m.r;
        float camDist = length(wxz - uCenter.xz);
        float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, camDist);
        fade *= lodFade(camDist, aRank, uGrassFarKeep);

        // Cull: density test + outside the fade ring → degenerate (clipped) vertex
        if (rnd > density * 1.08 || fade <= 0.001) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          vBaseColor = vec3(0.0); vT = 0.0; vRand = 0.0; vWorld = vec3(0.0); vWind = 0.0; vTerrainN = vec3(0.0, 1.0, 0.0);
          return;
        }

        float groundY = terrainHeightAt(wxz);
        // Terrain normal from the baked heights → grass is lit exactly like the ground below it
        float hL = terrainHeightAt(wxz - vec2(1.0, 0.0));
        float hR = terrainHeightAt(wxz + vec2(1.0, 0.0));
        float hD = terrainHeightAt(wxz - vec2(0.0, 1.0));
        float hU = terrainHeightAt(wxz + vec2(0.0, 1.0));
        vTerrainN = normalize(vec3(hL - hR, 2.0, hD - hU));
        // Tuft size: taller in lush areas, shorter near paths & shores, slight per-tuft variety
        float lush = smoothstep(0.2, 0.9, density);
        // Short, soft Genshin meadow grass; shrink blades right in front of the camera so they never fill the screen
        float nearCam = smoothstep(0.8, 3.2, length(wxz - cameraPosition.xz));
        float h = (0.26 + 0.16 * rnd + 0.14 * lush) * uHeightScale * fade * mix(0.35, 1.0, nearCam);
        float w = (0.85 + 0.4 * gHash12(wxz * 3.1)) * mix(1.0, 1.5, smoothstep(uLodNear, uLodFar, camDist));
        float t = uv.y;

        vec3 p = position;
        p.xz = rot2(p.xz * w, aInst.z + jitter.x * 3.0);
        p.y *= h;
        p.xz *= mix(1.0, 1.25, 1.0 - fade);

        // Wind & interaction (tip-weighted)
        float bend = t * t;
        vec2 wind = windAt(wxz, rnd);
        vec2 toP = wxz - uPlayerPos.xz;
        vec2 toC = wxz - uCompanionPos.xz;
        float dP = length(toP), dC = length(toC);
        float pushP = (1.0 - smoothstep(0.0, 1.25, dP)) * (1.0 - smoothstep(0.5, 2.0, abs(groundY - uPlayerPos.y)));
        float pushC = (1.0 - smoothstep(0.0, 1.0, dC)) * (1.0 - smoothstep(0.5, 2.0, abs(groundY - uCompanionPos.y)));
        vec2 push = (dP > 0.001 ? toP / dP : vec2(0.0)) * pushP + (dC > 0.001 ? toC / dC : vec2(0.0)) * pushC;
        float trample = clamp(pushP + pushC, 0.0, 1.0);
        p.xz += (wind * h * 1.6 + push * 0.55 * h) * bend;
        p.y *= mix(1.0, 0.35, trample);
        p.y -= length(wind) * 0.35 * h * bend;

        vec3 world = vec3(wxz.x + p.x, groundY - 0.03 + p.y, wxz.y + p.z);
        vWorld = world;
        vT = t;
        vRand = rnd;
        vWind = clamp(length(wind) * 4.0, 0.0, 1.0);

        // Colour = painterly meadow colour of the ground below (blades melt into the terrain)
        vec3 meadow = genshinMeadowColor(wxz, clamp((groundY - 2.0) / 18.0, 0.0, 1.0));
        float wet = m.a;
        meadow = mix(meadow, meadow * vec3(0.78, 0.92, 0.82), wet * 0.6);
        vBaseColor = meadow * (0.92 + 0.16 * rnd);

        // Shadows: unified up-facing normal (soft cushion lighting)
        vec4 worldPosition = vec4(world, 1.0);
        vec3 transformedNormal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        #include <shadowmap_vertex>

        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `;

    const fragmentShader = /* glsl */ `
      #include <common>
      #include <packing>
      #include <fog_pars_fragment>
      #include <bsdfs>
      #include <lights_pars_begin>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      uniform vec3 uSunTint, uShadowTint, uBacklight;
      varying vec3 vBaseColor;
      varying float vT;
      varying float vRand;
      varying vec3 vWorld;
      varying float vWind;
      varying vec3 vTerrainN;

      void main() {
        // Vertical painterly gradient: deep root → body → sun-kissed tip
        vec3 albedo = vBaseColor * mix(0.74, 1.04, smoothstep(0.0, 0.6, vT));
        albedo = mix(albedo, uSunTint, smoothstep(0.55, 1.0, vT) * (0.22 + vWind * 0.25));

        float shadow = 1.0;
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
          shadow = getShadowMask();
        #endif

        vec3 N = normalize(mix(normalize(vTerrainN), vec3(0.0, 1.0, 0.0), 0.25));
        vec3 irradiance = ambientLightColor;
        vec3 sunCol = vec3(0.0);
        vec3 sunDirW = vec3(0.0, 1.0, 0.0);
        #if NUM_DIR_LIGHTS > 0
          sunCol = directionalLights[0].color;
          sunDirW = normalize((vec4(directionalLights[0].direction, 0.0) * viewMatrix).xyz);
          float ndl = clamp((dot(N, sunDirW) + 0.12) / 1.12, 0.0, 1.0);   // ≈ terrain lambert, slightly wrapped
          irradiance += sunCol * ndl * shadow;
        #endif
        #if NUM_HEMI_LIGHTS > 0
          irradiance += mix(hemisphereLights[0].groundColor, hemisphereLights[0].skyColor, 0.5 * N.y + 0.5);
        #endif
        // Genshin "blue shadow": tint the shadowed side cooler instead of just darker
        vec3 tint = mix(uShadowTint, vec3(1.0), shadow);
        vec3 col = albedo * irradiance * RECIPROCAL_PI * tint;

        // Backlight translucency when looking toward the sun (glowing tips at golden hour)
        vec3 V = normalize(cameraPosition - vWorld);
        float back = pow(clamp(dot(-V, sunDirW), 0.0, 1.0) + 1e-4, 4.0) * smoothstep(0.35, 1.0, vT);
        col += uBacklight * back * 0.22 * shadow * length(sunCol) * 0.25;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `;

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      lights: true,
      fog: true,
      side: THREE.DoubleSide
    });
    mat.name = 'GenshinGrassMaterial';
    return mat;
  }

  _createFlowerMaterial() {
    const vertexShader = /* glsl */ `
      ${this._commonVertexHeader()}
      varying vec2 vUv;
      varying vec3 vPetal;
      varying float vTop;
      varying vec3 vWorld;

      void main() {
        vec3 origin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec2 wxz = origin.xz + aInst.xy;
        float rnd = fract(aInst.w + gHash12(floor(origin.xz * 0.1)) * 0.618);
        vec4 m = terrainMaskAt(wxz);
        float camDist = length(wxz - uCenter.xz);
        float fade = 1.0 - smoothstep(uFadeStart * 0.85, uFadeEnd * 0.85, camDist);
        fade *= lodFade(camDist, aRank, uFlowerFarKeep);
        fade *= 1.0 - smoothstep(uFlowerCut - 8.0, uFlowerCut, camDist);   // gone before tiles hide
        if (rnd > m.b * 1.2 || fade <= 0.001) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          vUv = vec2(0.0); vPetal = vec3(0.0); vTop = 0.0; vWorld = vec3(0.0);
          return;
        }
        float groundY = terrainHeightAt(wxz);
        float s = (0.75 + 0.5 * gHash12(wxz * 2.3)) * fade * smoothstep(1.0, 3.5, length(wxz - cameraPosition.xz));
        vec3 p = position * s;
        p.xz = rot2(p.xz, aInst.z);
        float sway = (p.y / 0.56);
        vec2 wind = windAt(wxz, rnd);
        p.xz += wind * sway * sway * 0.9;

        vec3 world = vec3(wxz.x + p.x, groundY - 0.02 + p.y, wxz.y + p.z);
        vWorld = world;
        vUv = uv;
        vTop = step(1.01, uv.y);

        // Palette: Mondstadt wildflowers (yellow / blue / white, rare pink)
        float pick = gHash12(wxz * 0.113 + 7.0);
        vec3 yellow = vec3(1.0, 0.80, 0.18);
        vec3 blue = vec3(0.38, 0.6, 1.0);
        vec3 white = vec3(1.0, 0.98, 0.93);
        vec3 pink = vec3(1.0, 0.62, 0.74);
        vPetal = pick < 0.4 ? yellow : (pick < 0.7 ? white : (pick < 0.94 ? blue : pink));

        vec4 worldPosition = vec4(world, 1.0);
        vec3 transformedNormal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        #include <shadowmap_vertex>
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `;

    const fragmentShader = /* glsl */ `
      #include <common>
      #include <packing>
      #include <fog_pars_fragment>
      #include <bsdfs>
      #include <lights_pars_begin>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      uniform vec3 uShadowTint;
      varying vec2 vUv;
      varying vec3 vPetal;
      varying float vTop;
      varying vec3 vWorld;

      void main() {
        vec3 albedo;
        if (vTop > 0.5) {
          // Top-down flower disc
          vec2 c = vec2(vUv.x, vUv.y - 0.42) * 2.0 - 1.0;
          float r = length(c);
          float ang = atan(c.y, c.x + 1e-5);
          float petals = 0.62 + 0.3 * cos(ang * 5.0);
          if (r > petals) discard;
          albedo = mix(vec3(1.0, 0.72, 0.15), vPetal, smoothstep(0.18, 0.3, r));
        } else {
          // Side card: stem + flower head
          vec2 c = vec2(vUv.x * 2.0 - 1.0, (vUv.y - 0.72) / 0.28);
          float r = length(c);
          float ang = atan(c.y, c.x + 1e-5);
          float petals = 0.7 + 0.25 * cos(ang * 5.0);
          bool inHead = r < petals && vUv.y > 0.42;
          bool inStem = abs(vUv.x - 0.5) < 0.035 && vUv.y < 0.62;
          if (!inHead && !inStem) discard;
          albedo = inHead ? mix(vec3(1.0, 0.72, 0.15), vPetal, smoothstep(0.2, 0.34, r)) : vec3(0.25, 0.5, 0.18);
        }

        float shadow = 1.0;
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
          shadow = getShadowMask();
        #endif
        vec3 irradiance = ambientLightColor;
        #if NUM_DIR_LIGHTS > 0
          irradiance += directionalLights[0].color * 0.85 * shadow;
        #endif
        #if NUM_HEMI_LIGHTS > 0
          irradiance += hemisphereLights[0].skyColor;
        #endif
        vec3 col = albedo * irradiance * RECIPROCAL_PI * mix(uShadowTint, vec3(1.0), shadow);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `;

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      lights: true,
      fog: true,
      side: THREE.DoubleSide
    });
    mat.name = 'GenshinFlowerMaterial';
    return mat;
  }

  // -------------------------------------------------------------------------------------
  // Runtime
  // -------------------------------------------------------------------------------------

  update(delta, playerPos, companionPos) {
    const u = this.uniforms;
    u.uTime.value += delta;
    if (!playerPos) return;
    u.uCenter.value.copy(playerPos);
    u.uPlayerPos.value.copy(playerPos);
    if (companionPos) u.uCompanionPos.value.copy(companionPos);

    const tx = Math.floor(playerPos.x / this.T);
    const tz = Math.floor(playerPos.z / this.T);
    const dx = playerPos.x - this._lastLodPos.x;
    const dz = playerPos.z - this._lastLodPos.z;
    // Re-evaluate tile LODs every 0.5 m (cheap: ~100 distance checks) so a tile is always
    // switched while the instances that differ between LODs are already fully faded.
    if (tx === this._lastTileX && tz === this._lastTileZ && dx * dx + dz * dz < 0.25) return;
    this._lastTileX = tx;
    this._lastTileZ = tz;
    this._lastLodPos.set(playerPos.x, 0, playerPos.z);

    const half = Math.floor(this.N / 2);
    const lodR = this._lodR() + 1.0;              // +1 m margin covers the 0.5 m update step
    const nearR2 = lodR * lodR;
    const flowerR = this.uniforms.uFlowerCut.value + 1.0;
    const flowerR2 = flowerR * flowerR;
    let k = 0;
    for (let iz = -half; iz <= half; iz++) {
      for (let ix = -half; ix <= half; ix++) {
        const tile = this.tiles[k++];
        if (!tile) continue;
        const ox = (tx + ix) * this.T;
        const oz = (tz + iz) * this.T;
        // Distance from the player to the NEAREST point of the tile (not its centre): a tile only
        // goes sparse / hides flowers when every point of it is past the faded band.
        const cx = Math.max(ox - playerPos.x, 0, playerPos.x - (ox + this.T));
        const cz = Math.max(oz - playerPos.z, 0, playerPos.z - (oz + this.T));
        const d2 = cx * cx + cz * cz;
        const near = d2 < nearR2;
        // Skip tiles fully in the sea (grass density is already 0 beyond ~152 m)
        const ix0 = Math.max(ox, Math.min(0, ox + this.T));
        const iz0 = Math.max(oz, Math.min(0, oz + this.T));
        const island = Math.hypot(ix0, iz0) < 153;
        tile.grass.visible = island;
        // Flowers only in the inner rings → fewer draw calls (already faded to zero there)
        tile.flowers.visible = island && d2 < flowerR2;
        tile.grass.position.set(ox, 0, oz);
        tile.flowers.position.set(ox, 0, oz);
        tile.grass.geometry = near ? this.geoNear : this.geoFar;
        tile.flowers.geometry = near ? this.flowerGeoNear : this.flowerGeoFar;
      }
    }
  }

  /**
   * Densidad de la hierba (1 = la de siempre). Para las calidades Media y Baja. Las matas están
   * barajadas, así que dibujar solo las primeras de la lista da un subconjunto uniforme: la pradera
   * es la misma, con menos matas. No reconstruye nada.
   */
  setDensity(k) {
    k = THREE.MathUtils.clamp(k, 0.1, 1);
    const near = Math.max(1, Math.round(this._nearCount * k));
    const far = Math.max(1, Math.round(this._farCount * k));
    this.geoNear.instanceCount = near;
    this.geoFar.instanceCount = far;
    this.uniforms.uGrassFarKeep.value = far / this._nearCount;
  }

  setVisible(v) {
    this.group.visible = v;
  }

  dispose() {
    [this.geoNear, this.geoFar, this.flowerGeoNear, this.flowerGeoFar].forEach((g) => g && g.dispose());
    this.grassMaterial.dispose();
    this.flowerMaterial.dispose();
  }
}
