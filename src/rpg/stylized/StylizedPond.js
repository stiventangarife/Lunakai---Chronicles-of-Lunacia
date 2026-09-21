// StylizedPond.js - Stylized Lotus Pond with Dense Pebble & Rock Border in Zone [3, 3]
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';

// Procedural floating leaf / water petal geometry
function createFloatingLeafGeometry() {
  const geom = new THREE.BufferGeometry();
  const vertices = new Float32Array([
     0.00, 0.001,  0.07, // Tip front
    -0.04, 0.000,  0.01, // Left
     0.04, 0.000,  0.01, // Right
     0.00, 0.000, -0.05, // Back base
     0.00, 0.002,  0.01  // Center spine
  ]);
  const indices = [
    0, 1, 4,  0, 4, 2,
    1, 3, 4,  4, 3, 2
  ];
  geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// Procedural stylized fish geometry (fusiform body with flared tail fin)
function createFishGeometry() {
  const geom = new THREE.BufferGeometry();
  const vertices = new Float32Array([
     0.00,  0.00,  0.20,  // Snout
     0.00,  0.035, 0.07,  // Top spine
     0.00, -0.025, 0.07,  // Bottom belly
    -0.04,  0.005, 0.07,  // Left flank
     0.04,  0.005, 0.07,  // Right flank
     0.00,  0.010,-0.10,  // Tail peduncle
    -0.05,  0.020,-0.19,  // Left fin tip
     0.05,  0.020,-0.19,  // Right fin tip
     0.00,  0.010,-0.15   // Tail notch
  ]);
  const indices = [
    0, 1, 3,   0, 4, 1,   0, 3, 2,   0, 2, 4,
    1, 5, 3,   1, 4, 5,   2, 3, 5,   2, 5, 4,
    5, 6, 8,   5, 8, 7
  ];
  geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export class StylizedPond {
  static _sharedAssetsPromise = null;

  constructor(scene, collisions = null, options = {}) {
    this.scene = scene;
    this.collisions = collisions;

    this.id = options.id || 'dojo_stylized_pond';
    this.group = new THREE.Group();
    this.group.name = this.id;
    this.group.visible = false;
    this.scene.add(this.group);

    // Center & radii matching the requested coordinates (default Zone [3, 3])
    this.cx = options.cx !== undefined ? options.cx : -30.3;
    this.cz = options.cz !== undefined ? options.cz : 12.0;
    this.radH = options.radH !== undefined ? options.radH : 4.1; // Horizontal axis along screen diagonal (0.7071, -0.7071)
    this.radV = options.radV !== undefined ? options.radV : 3.0; // Vertical axis along screen diagonal (0.7071, 0.7071)

    this.collisionTag = options.collisionTag || (this.id === 'dojo_stylized_pond' ? 'dojo_pond_water' : `${this.id}_water`);
    this.collisionTagPrefix = options.collisionTagPrefix || (this.collisionTag.replace(/_water$/, ''));
    this.zoneName = options.zoneName || 'Zone [3, 3]';
    this.isOasis = !!options.isOasis;
    this.isFrozen = !!options.isFrozen;
    this.isLava = !!options.isLava;
    this.options = options;

    this.waterUniforms = {
      uTime: { value: 0 },
      uFlowSpeed: { value: options.uFlowSpeed || (this.isLava ? 0.08 : 0.18) },
      uShallowColor: { value: new THREE.Color(options.waterShallowColor || (this.isLava ? '#ff5500' : (this.isFrozen ? '#7ee5f8' : (this.isOasis ? '#5ce1e6' : '#38d1ee')))) }, // Crystal azure turquoise
      uDeepColor: { value: new THREE.Color(options.waterDeepColor || (this.isLava ? '#6a0a00' : (this.isFrozen ? '#1565a0' : (this.isOasis ? '#1e88e5' : '#14649c')))) },       // Luminous azure sky blue
      uFoamColor: { value: new THREE.Color(options.waterFoamColor || (this.isLava ? '#ffcc00' : (this.isFrozen ? '#ffffff' : '#eafcff'))) },
      uSunDir: { value: new THREE.Vector3(18, 18, 10).normalize() }
    };

    if (this.isFrozen) {
      this.iceUniforms = {
        uTime: { value: 0 },
        uIceColor: { value: new THREE.Color(options.iceColor || '#a4e8fc') },
        uFrostColor: { value: new THREE.Color(options.frostColor || '#f0fbff') },
        uSunDir: { value: new THREE.Vector3(18, 18, 10).normalize() }
      };
    }

    this.foliageUniforms = {
      uTime: { value: 0 },
      uWindSpeed: { value: 2.2 },
      uWindStrength: { value: 0.22 }
    };

    this.floatingLeaves = [];
    this.fishData = [];
    this.fishMeshes = [];

    this.isLoaded = false;
  }

  /**
   * Calculates a perimeter point for an angle theta with organic wobble
   */
  getPerimeterPoint(theta, radiusMultiplier = 1.0) {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    // Organic wobble matching natural pond boundaries
    const wobble = 1.0 + 0.09 * Math.sin(theta * 2.0 + 0.5) + 0.05 * Math.cos(theta * 3.0);
    const rH = this.radH * radiusMultiplier * wobble;
    const rV = this.radV * radiusMultiplier * wobble;

    const dx = 0.7071 * cosT * rH + 0.7071 * sinT * rV;
    const dz = -0.7071 * cosT * rH + 0.7071 * sinT * rV;

    return {
      x: this.cx + dx,
      z: this.cz + dz
    };
  }

  static async loadSharedAssets() {
    if (!StylizedPond._sharedAssetsPromise) {
      StylizedPond._sharedAssetsPromise = (async () => {
        const texLoader = new THREE.TextureLoader();
        const gltfLoader = new GLTFLoader();
        const [canyonNorm, pebbleGltfs, rocks4Gltf, clover1Gltf, clover2Gltf, bushSmallGltf, leavesTex, plant1BigGltf, fern1Gltf] = await Promise.all([
          texLoader.loadAsync('./assets/rocks/Textures/RockCollection4NormalMap.png'),
          Promise.all([
            gltfLoader.loadAsync('./assets/nature/Pebble_Round_1.gltf'),
            gltfLoader.loadAsync('./assets/nature/Pebble_Round_2.gltf'),
            gltfLoader.loadAsync('./assets/nature/Pebble_Round_3.gltf'),
            gltfLoader.loadAsync('./assets/nature/Pebble_Round_4.gltf'),
            gltfLoader.loadAsync('./assets/nature/Pebble_Round_5.gltf')
          ]),
          gltfLoader.loadAsync('./assets/rocks/StylisedRockCollection4.glb'),
          gltfLoader.loadAsync('./assets/nature/Clover_1.gltf'),
          gltfLoader.loadAsync('./assets/nature/Clover_2.gltf'),
          gltfLoader.loadAsync('./assets/arctic/plant_bushSmall.glb'),
          texLoader.loadAsync('./assets/nature/Leaves.png'),
          gltfLoader.loadAsync('./assets/nature/Plant_1_Big.gltf'),
          gltfLoader.loadAsync('./assets/nature/Fern_1.gltf')
        ]);
        canyonNorm.wrapS = canyonNorm.wrapT = THREE.RepeatWrapping;
        leavesTex.flipY = false;
        leavesTex.colorSpace = THREE.SRGBColorSpace;
        leavesTex.needsUpdate = true;
        return { canyonNorm, pebbleGltfs, rocks4Gltf, clover1Gltf, clover2Gltf, bushSmallGltf, leavesTex, plant1BigGltf, fern1Gltf };
      })();
    }
    return StylizedPond._sharedAssetsPromise;
  }

  async init() {
    console.log(`[StylizedPond] Building stylized pond [${this.id}] at [${this.cx}, ${this.cz}]...`);
    const assets = await StylizedPond.loadSharedAssets();

    // 1. Build Sunken Basin Embankment
    this._buildBasin(assets.canyonNorm);

    // 2. Build Stylized Water Surface
    this._buildWater();

    // 2b. Build Crystalline Ice Sheet if frozen
    if (this.isFrozen) {
      this._buildIceSheet();
    }

    // 2c. Build Lava Bubbles & Fire Light if lava
    if (this.isLava) {
      this._buildLavaBubbles();
    }

    // 3. Build Floating Petals, Lilies & Water Plants (only for water ponds)
    if (!this.isLava) {
      this._buildFloatingPetals(assets);
      // 4. Build Animated Fish Shadows
      this._buildFishShadows();
    }

    // 5. Load and Build Dense Rocky Border (Pebble_Round_1..5 + River Boulders)
    this._loadAndBuildRockBorder(assets);

    // 6. Add Clovers & Nature Accents along Pond Margins (only for water ponds)
    if (!this.isLava) {
      this._loadAndBuildCloversAndFoliage(assets);
    }

    // 7. Setup Physics Collisions
    this._setupCollisions();

    this.isLoaded = true;
    console.log(`[StylizedPond] Initialized successfully [${this.id}] in ${this.zoneName}!`);
  }

  _buildBasin(canyonNorm) {
    const numRadial = 36;
    // Ring profiles: [radiusMult, y] with true river-like depth down to -0.78m
    const rings = [
      { r: 1.15, y:  0.005 }, // 0: Outer grass seam overlap (ground level)
      { r: 1.00, y: -0.060 }, // 1: Inner bank rim under pebbles
      { r: 0.88, y: -0.360 }, // 2: Water contact shelf
      { r: 0.68, y: -0.620 }, // 3: Submerged toe
      { r: 0.40, y: -0.740 }, // 4: Pond floor shelf
      { r: 0.00, y: -0.780 }  // 5: Deep center
    ];

    const positions = [];
    const uvs = [];
    const normals = [];
    const indices = [];

    // Generate vertices for concentric rings
    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
      const { r: rMult, y: ringY } = rings[rIdx];

      if (rMult === 0.0) {
        // Center vertex
        positions.push(this.cx, ringY, this.cz);
        uvs.push(0.5, 0.5);
        normals.push(0, 1, 0);
        continue;
      }

      for (let i = 0; i <= numRadial; i++) {
        const theta = (i / numRadial) * Math.PI * 2;
        const pt = this.getPerimeterPoint(theta, rMult);
        positions.push(pt.x, ringY, pt.z);
        uvs.push(
          (pt.x - this.cx) / (this.radH * 2.5) + 0.5,
          (pt.z - this.cz) / (this.radV * 2.5) + 0.5
        );
        normals.push(0, 1, 0);
      }
    }

    // Generate triangle indices between rings
    const rowLen = numRadial + 1;
    for (let rIdx = 0; rIdx < rings.length - 2; rIdx++) {
      const rStartA = rIdx * rowLen;
      const rStartB = (rIdx + 1) * rowLen;

      for (let i = 0; i < numRadial; i++) {
        const a = rStartA + i;
        const b = rStartB + i;
        const c = rStartB + (i + 1);
        const d = rStartA + (i + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Connect last ring to center vertex
    const centerIdx = positions.length / 3 - 1;
    const lastRingStart = (rings.length - 2) * rowLen;
    for (let i = 0; i < numRadial; i++) {
      const a = lastRingStart + i;
      const b = centerIdx;
      const c = lastRingStart + (i + 1);
      indices.push(a, b, c);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const basinColor = this.options.basinColor || (this.isLava ? 0x141018 : (this.isFrozen ? 0x364858 : (this.isOasis ? 0xa47c4c : 0x445240)));
    const basinMaterial = new THREE.MeshStandardMaterial({
      color: basinColor, // Basalt for lava, cold glacial stone for frozen, golden wet sand for oasis, dark wet stone for forest
      roughness: 0.85,
      metalness: 0.02,
      normalMap: canyonNorm,
      normalScale: new THREE.Vector2(0.90, 0.90),
      flatShading: true
    });

    const basinMesh = new THREE.Mesh(geom, basinMaterial);
    basinMesh.receiveShadow = true;
    this.group.add(basinMesh);
  }

  _buildWater() {
    const numRadial = 36;
    const numRings = 6;
    const waterRMult = 0.90; // Water extends to the sloping embankment shelf
    const waterLevel = this.isFrozen ? -0.32 : -0.36; // Sunken recessed water level beneath ice

    const positions = [];
    const uvs = [];
    const radialUvs = [];
    const indices = [];

    // Concentric water rings
    for (let ring = 0; ring <= numRings; ring++) {
      const fraction = ring / numRings;
      const curRMult = fraction * waterRMult;

      if (fraction === 0.0) {
        positions.push(this.cx, waterLevel, this.cz);
        uvs.push(0.5, 0.5);
        radialUvs.push(0.0, 0.0);
        continue;
      }

      for (let i = 0; i <= numRadial; i++) {
        const theta = (i / numRadial) * Math.PI * 2;
        const pt = this.getPerimeterPoint(theta, curRMult);

        positions.push(pt.x, waterLevel, pt.z);
        uvs.push(
          (pt.x - this.cx) / (this.radH * 2.0) + 0.5,
          (pt.z - this.cz) / (this.radV * 2.0) + 0.5
        );
        // Radial UV for concentric ripples and shore foam (length = 0 at center, 1 at shore)
        radialUvs.push(fraction, theta);
      }
    }

    // Triangulation
    const rowLen = numRadial + 1;
    // Ring 0 to center
    for (let i = 0; i < numRadial; i++) {
      const a = 0;
      const b = 1 + i;
      const c = 1 + (i + 1);
      indices.push(a, b, c);
    }

    for (let ring = 1; ring < numRings; ring++) {
      const rStartA = 1 + (ring - 1) * rowLen;
      const rStartB = 1 + ring * rowLen;

      for (let i = 0; i < numRadial; i++) {
        const a = rStartA + i;
        const b = rStartB + i;
        const c = rStartB + (i + 1);
        const d = rStartA + (i + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const waterGeom = new THREE.BufferGeometry();
    waterGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    waterGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    waterGeom.setAttribute('aRadial', new THREE.Float32BufferAttribute(radialUvs, 2));
    waterGeom.setIndex(indices);
    waterGeom.computeVertexNormals();

    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      vertexShader: `
        uniform float uTime;
        attribute vec2 aRadial;
        varying vec2 vUv;
        varying vec2 vRadial;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vRadial = aRadial;
          vNormal = normal;

          vec3 pos = position;
          // Soft ambient water wave
          float wave = sin(uTime * 2.5 + pos.x * 2.2 + pos.z * 2.0) * 0.006;
          pos.y += wave;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFlowSpeed;
        uniform vec3 uShallowColor;
        uniform vec3 uDeepColor;
        uniform vec3 uFoamColor;
        uniform vec3 uSunDir;
        varying vec2 vUv;
        varying vec2 vRadial;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          float edgeDist = vRadial.x; // 0 at center, 1 at shoreline

          if (${this.isLava ? 'true' : 'false'}) {
            // Lava convection currents & incandescent crust
            float magmaFlow = sin(vWorldPos.x * 2.2 + uTime * 1.8) * cos(vWorldPos.z * 2.2 + uTime * 1.4);
            float crust = smoothstep(-0.35, 0.45, magmaFlow);
            vec3 lavaCol = mix(uDeepColor, uShallowColor, crust);

            // Fiery golden cracks & heat veins
            float cracks = sin(vWorldPos.x * 5.5 + uTime * 2.5) * cos(vWorldPos.z * 5.5 - uTime * 2.0);
            float crackMask = smoothstep(0.40, 0.75, cracks);
            lavaCol = mix(lavaCol, uFoamColor, crackMask * 0.85);

            // Incandescent glowing shore rim
            float shoreGlow = smoothstep(0.70, 0.98, edgeDist);
            lavaCol = mix(lavaCol, uFoamColor, shoreGlow * 0.70);

            // Specular heat sheen
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            vec3 halfVec = normalize(uSunDir + viewDir);
            float spec = pow(max(dot(vNormal, halfVec), 0.0), 24.0) * 0.55;

            gl_FragColor = vec4(lavaCol + vec3(spec * 0.8, spec * 0.4, 0.0), 0.98);
            return;
          }

          // 1. Shore foam along rocky border
          float bankRipples = sin(vRadial.y * 14.0 + uTime * 2.2) * 0.04;
          float bankFoam = smoothstep(0.82 + bankRipples, 0.98, edgeDist);

          // 2. Color blending: deep sapphire in center, turquoise at shoreline
          vec3 waterCol = mix(uDeepColor, uShallowColor, smoothstep(0.15, 0.85, edgeDist));

          // 3. Sunlight specular glint
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfVec = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfVec), 0.0), 36.0) * 0.45;

          // 4. Combine water color with gentle shore foam
          float totalFoam = clamp(bankFoam * 0.85, 0.0, 1.0);
          vec3 finalCol = mix(waterCol + vec3(spec), uFoamColor, totalFoam);

          // Crystal translucent water allowing underwater pebbles and fish shadows to be clearly visible
          float alpha = ${this.isFrozen ? '0.74' : (this.isOasis ? '0.70' : '0.82')} + totalFoam * 0.16;
          gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 0.98));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const waterMesh = new THREE.Mesh(waterGeom, waterMaterial);
    waterMesh.renderOrder = 4;
    this.group.add(waterMesh);
  }

  _buildIceSheet() {
    const numRadial = 36;
    const numRings = 6;
    const iceRMult = 1.02; // Ice covers pond aperture flush with the ground rim
    const iceLevel = 0.008; // Sits at ground level allowing the player to walk seamlessly over it

    const positions = [];
    const uvs = [];
    const radialUvs = [];
    const indices = [];

    // Concentric ice rings
    for (let ring = 0; ring <= numRings; ring++) {
      const fraction = ring / numRings;
      const curRMult = fraction * iceRMult;

      if (fraction === 0.0) {
        positions.push(this.cx, iceLevel, this.cz);
        uvs.push(0.5, 0.5);
        radialUvs.push(0.0, 0.0);
        continue;
      }

      for (let i = 0; i <= numRadial; i++) {
        const theta = (i / numRadial) * Math.PI * 2;
        const pt = this.getPerimeterPoint(theta, curRMult);

        positions.push(pt.x, iceLevel, pt.z);
        uvs.push(
          (pt.x - this.cx) / (this.radH * 2.0) + 0.5,
          (pt.z - this.cz) / (this.radV * 2.0) + 0.5
        );
        radialUvs.push(fraction, theta);
      }
    }

    // Triangulation
    const rowLen = numRadial + 1;
    for (let i = 0; i < numRadial; i++) {
      const a = 0;
      const b = 1 + i;
      const c = 1 + (i + 1);
      indices.push(a, b, c);
    }

    for (let ring = 1; ring < numRings; ring++) {
      const rStartA = 1 + (ring - 1) * rowLen;
      const rStartB = 1 + ring * rowLen;

      for (let i = 0; i < numRadial; i++) {
        const a = rStartA + i;
        const b = rStartB + i;
        const c = rStartB + (i + 1);
        const d = rStartA + (i + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const iceGeom = new THREE.BufferGeometry();
    iceGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    iceGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    iceGeom.setAttribute('aRadial', new THREE.Float32BufferAttribute(radialUvs, 2));
    iceGeom.setIndex(indices);
    iceGeom.computeVertexNormals();

    const iceMaterial = new THREE.ShaderMaterial({
      uniforms: this.iceUniforms,
      vertexShader: `
        uniform float uTime;
        attribute vec2 aRadial;
        varying vec2 vUv;
        varying vec2 vRadial;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vRadial = aRadial;
          vNormal = normal;

          vec3 pos = position;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uIceColor;
        uniform vec3 uFrostColor;
        uniform vec3 uSunDir;
        varying vec2 vUv;
        varying vec2 vRadial;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          float edgeDist = vRadial.x; // 0 at center, 1 at shoreline

          // 1. Procedural crystalline ice crack web
          vec2 uvGrid = vWorldPos.xz * 1.8;
          vec2 id = floor(uvGrid);
          vec2 f = fract(uvGrid);
          float minDist = 1.0;
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 neighbor = vec2(float(x), float(y));
              vec2 point = neighbor + vec2(hash21(id + neighbor), hash21(id + neighbor + 17.1)) * 0.7;
              minDist = min(minDist, length(f - point));
            }
          }
          float cracks = 1.0 - smoothstep(0.0, 0.05, abs(minDist - 0.28));
          float fineCracks = smoothstep(0.025, 0.0, abs(sin(vWorldPos.x * 3.2 + vWorldPos.z * 2.7 + hash21(id) * 3.14)));
          cracks = clamp(cracks * 0.45 + fineCracks * 0.35, 0.0, 1.0);

          // 2. Shoreline frost ring
          float shoreFrost = smoothstep(0.70, 0.98, edgeDist);

          // 3. Specular shine on smooth ice surface
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfVec = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfVec), 0.0), 56.0) * 0.85;
          float specBroad = pow(max(dot(vNormal, halfVec), 0.0), 14.0) * 0.25;

          // 4. Fresnel reflection
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0) * 0.40;

          // 5. Blended ice surface
          vec3 iceBase = mix(uIceColor, vec3(0.92, 0.98, 1.0), cracks * 0.6);
          vec3 finalCol = mix(iceBase, uFrostColor, shoreFrost * 0.75 + fresnel);
          finalCol += vec3(spec + specBroad);

          // 6. Translucency: center allows water ripples & fish shadows to be clearly visible!
          float alpha = mix(0.62, 0.88, shoreFrost) + cracks * 0.12 + fresnel * 0.18;
          gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 0.94));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const iceMesh = new THREE.Mesh(iceGeom, iceMaterial);
    iceMesh.renderOrder = 6; // Renders above water (4) and fish (3)
    this.group.add(iceMesh);
  }

  _buildLavaBubbles() {
    this.lavaBubbles = [];
    const bubbleCount = 16;
    const bubbleGeo = new THREE.SphereGeometry(0.38, 12, 10);
    // Align hemisphere to dome upwards from lava surface
    bubbleGeo.scale(1.0, 0.65, 1.0);

    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff7700,
      emissiveIntensity: 1.8,
      roughness: 0.28,
      metalness: 0.1
    });

    for (let i = 0; i < bubbleCount; i++) {
      const mesh = new THREE.Mesh(bubbleGeo, bubbleMat);
      mesh.visible = false;
      mesh.renderOrder = 5;
      this.group.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const rMult = 0.12 + Math.random() * 0.68;
      const pt = this.getPerimeterPoint(theta, rMult);

      this.lavaBubbles.push({
        mesh,
        pt,
        maxScale: 0.45 + Math.random() * 0.65,
        lifetime: 1.1 + Math.random() * 1.8,
        age: Math.random() * 2.5,
        waterY: -0.34
      });
    }

    // Warm ambient pulsating point light at center of lava pond
    this.lavaLight = new THREE.PointLight(0xff5500, 2.5, 16.0);
    this.lavaLight.position.set(this.cx, 0.45, this.cz);
    this.group.add(this.lavaLight);
  }

  _buildFloatingPetals(assets = null) {
    if (this.isFrozen) {
      // Small frost shards / ice crystal plates on the ice sheet surface
      const shardGeom = createFloatingLeafGeometry();
      const shardMat = new THREE.MeshStandardMaterial({
        color: 0xeef9ff,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });
      const numShards = 12;
      for (let i = 0; i < numShards; i++) {
        const angle = (i / numShards) * Math.PI * 2 + 0.3;
        const rFrac = 0.30 + 0.50 * Math.sin(i * 2.9 + 0.8);
        const pt = this.getPerimeterPoint(angle, rFrac);

        const shardMesh = new THREE.Mesh(shardGeom, shardMat);
        shardMesh.position.set(pt.x, 0.012, pt.z);
        shardMesh.rotation.set(0.01, i * 1.6, 0.01);
        shardMesh.scale.setScalar(0.70 + (i % 3) * 0.25);
        shardMesh.castShadow = false;
        shardMesh.receiveShadow = true;
        this.group.add(shardMesh);
      }
      return;
    }

    const leafGeom = createFloatingLeafGeometry();
    const leafMat = new THREE.MeshStandardMaterial({
      color: this.isOasis ? 0x98d438 : 0xdeb838, // Vibrant lime green floating lily pads
      roughness: 0.60,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const numPetals = this.isOasis ? 14 : 8;
    for (let i = 0; i < numPetals; i++) {
      const angle = (i / numPetals) * Math.PI * 2 + 0.4;
      const rFrac = 0.28 + 0.42 * Math.sin(i * 3.7 + 1.2);
      const pt = this.getPerimeterPoint(angle, rFrac);

      const leafMesh = new THREE.Mesh(leafGeom, leafMat);
      leafMesh.position.set(pt.x, -0.354, pt.z);
      leafMesh.rotation.set(0.04, i * 1.8, 0.02);
      leafMesh.scale.setScalar(this.isOasis ? (0.85 + (i % 3) * 0.30) : (0.70 + (i % 3) * 0.20));
      leafMesh.castShadow = true;
      this.group.add(leafMesh);

      this.floatingLeaves.push({
        mesh: leafMesh,
        baseX: pt.x,
        baseZ: pt.z,
        baseY: -0.354,
        phase: i * 1.3
      });
    }

    // Floating actual 3D water plants (succulents, ferns, clovers) in the oasis
    if (this.isOasis && assets) {
      if (assets.plant1BigGltf) {
        const pRoot = assets.plant1BigGltf.scene.clone(true);
        pRoot.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            if (c.material) {
              c.material = c.material.clone();
              c.material.roughness = 0.65;
            }
          }
        });

        // 3 floating succulent clusters drifting in quiet water bays
        const plantSpawns = [
          { theta: 0.85, rFrac: 0.48, scale: 0.35 },
          { theta: 2.90, rFrac: 0.52, scale: 0.32 },
          { theta: 4.80, rFrac: 0.44, scale: 0.38 }
        ];

        plantSpawns.forEach((ps, idx) => {
          const pt = this.getPerimeterPoint(ps.theta, ps.rFrac);
          const p = pRoot.clone();
          p.position.set(pt.x, -0.345, pt.z);
          p.rotation.set(0.03, ps.theta * 1.7, -0.02);
          p.scale.setScalar(ps.scale);
          this.group.add(p);
          this.floatingLeaves.push({
            mesh: p,
            baseX: pt.x,
            baseZ: pt.z,
            baseY: -0.345,
            phase: idx * 2.2 + 0.5
          });
        });
      }

      if (assets.fern1Gltf) {
        const fRoot = assets.fern1Gltf.scene.clone(true);
        fRoot.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            if (c.material) {
              c.material = c.material.clone();
              c.material.roughness = 0.70;
            }
          }
        });

        // Floating water ferns drifting near rocks
        const fernSpawns = [
          { theta: 1.65, rFrac: 0.60, scale: 0.32 },
          { theta: 3.75, rFrac: 0.55, scale: 0.28 },
          { theta: 5.85, rFrac: 0.38, scale: 0.34 }
        ];

        fernSpawns.forEach((fs, idx) => {
          const pt = this.getPerimeterPoint(fs.theta, fs.rFrac);
          const f = fRoot.clone();
          f.position.set(pt.x, -0.340, pt.z);
          f.rotation.set(0.02, fs.theta * 2.3, 0.03);
          f.scale.setScalar(fs.scale);
          this.group.add(f);
          this.floatingLeaves.push({
            mesh: f,
            baseX: pt.x,
            baseZ: pt.z,
            baseY: -0.340,
            phase: idx * 1.9 + 1.2
          });
        });
      }
    }
  }

  _buildFishShadows() {
    const fishGeom = createFishGeometry();

    this.fishUniforms = {
      uTime: { value: 0 }
    };

    const fishMat = new THREE.ShaderMaterial({
      uniforms: this.fishUniforms,
      vertexShader: `
        uniform float uTime;
        attribute float aPhase;
        attribute float aWiggleSpeed;
        varying vec3 vNormal;
        varying vec3 vLocalPos;

        void main() {
          vNormal = normal;
          vLocalPos = position;
          vec3 pos = position;

          // Undulating tail fin swish
          float tailWeight = smoothstep(0.08, -0.22, pos.z);
          float wiggle = sin(uTime * aWiggleSpeed + aPhase) * 0.045 * tailWeight;
          pos.x += wiggle;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vLocalPos;

        void main() {
          // Deep aquatic shadow silhouette (dark blue-charcoal fish body seen from above through water)
          vec3 dorsalColor = ${this.isFrozen ? 'vec3(0.06, 0.16, 0.26)' : 'vec3(0.04, 0.09, 0.13)'};
          vec3 flankColor  = ${this.isFrozen ? 'vec3(0.14, 0.30, 0.42)' : 'vec3(0.08, 0.16, 0.20)'};
          float blend = smoothstep(-0.02, 0.03, vLocalPos.y);
          vec3 col = mix(flankColor, dorsalColor, blend);

          // Translucent shadow depth
          gl_FragColor = vec4(col, 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const scaleH = this.radH / 4.1;
    const scaleV = this.radV / 3.0;

    const baseConfigs = [
      { rH: 2.5 * scaleH, rV: 1.7 * scaleV, speed: 0.38, phase: 0.0, depth: -0.45, scale: 1.25, wiggle: 6.8 }, // Large carp
      { rH: 2.0 * scaleH, rV: 1.3 * scaleV, speed: 0.52, phase: 1.9, depth: -0.43, scale: 1.05, wiggle: 8.0 }, // Medium fish
      { rH: 2.2 * scaleH, rV: 1.5 * scaleV, speed: -0.44, phase: 3.8, depth: -0.46, scale: 0.98, wiggle: 7.2 }, // Clockwise swimmer
      { rH: 1.4 * scaleH, rV: 0.9 * scaleV, speed: 0.68, phase: 0.8, depth: -0.42, scale: 0.75, wiggle: 9.2 }, // Small swift minnow
      { rH: 1.6 * scaleH, rV: 1.1 * scaleV, speed: 0.60, phase: 4.6, depth: -0.44, scale: 0.72, wiggle: 8.8 }  // Small minnow
    ];

    if (this.isOasis || this.isFrozen) {
      baseConfigs.push(
        { rH: 3.1 * scaleH, rV: 2.2 * scaleV, speed: 0.32, phase: 2.4, depth: -0.48, scale: 1.35, wiggle: 5.6 }, // Majestic deep cold-water trout / oasis carp
        { rH: 2.8 * scaleH, rV: 1.9 * scaleV, speed: -0.36, phase: 5.1, depth: -0.47, scale: 1.12, wiggle: 6.4 }  // Counter-swimming swimmer
      );
    }

    const configs = baseConfigs;

    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const fishGeomInst = fishGeom.clone();
      const numVerts = fishGeomInst.attributes.position.count;
      const phases = new Float32Array(numVerts).fill(cfg.phase);
      const speeds = new Float32Array(numVerts).fill(cfg.wiggle);
      fishGeomInst.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      fishGeomInst.setAttribute('aWiggleSpeed', new THREE.BufferAttribute(speeds, 1));

      const fishMesh = new THREE.Mesh(fishGeomInst, fishMat);
      // Flatten slightly vertically for authentic top-down fish shadow shape
      fishMesh.scale.set(cfg.scale * 1.05, cfg.scale * 0.42, cfg.scale * 1.10);
      fishMesh.renderOrder = 3; // Renders directly under the water surface (renderOrder = 4) and ice (renderOrder = 6)
      this.group.add(fishMesh);
      this.fishMeshes.push(fishMesh);

      this.fishData.push(cfg);
    }
  }

  _loadAndBuildRockBorder(assets) {
    const { pebbleGltfs, rocks4Gltf, canyonNorm } = assets;

    // Extract pebble meshes
    const pebbleMeshes = [];
    pebbleGltfs.forEach(gltf => {
      gltf.scene.traverse(c => {
        if (c.isMesh) {
          if (c.material && c.material.map) {
            c.material.map.colorSpace = THREE.SRGBColorSpace;
            c.material.map.flipY = false;
            c.material.map.needsUpdate = true;
          }
          if (this.isLava && c.material) {
            c.material = c.material.clone();
            c.material.color.setHex(0x1a141c); // Dark obsidian pebble
          } else if (this.isOasis && c.material) {
            c.material = c.material.clone();
            c.material.color.setHex(0xd0ad75); // Warm desert riverbed pebble
          } else if (this.isFrozen && c.material) {
            c.material = c.material.clone();
            c.material.color.setHex(0x8298a8); // Frosty arctic slate pebble
          }
          c.material.roughness = 0.85;
          c.material.metalness = 0.02;
          c.castShadow = true;
          c.receiveShadow = true;
          pebbleMeshes.push(c);
        }
      });
    });

    // Extract boulder meshes
    const boulderMeshes = [];
    const boulderColor = this.options.boulderColor || (this.isLava ? 0x221a24 : (this.isFrozen ? 0x768c9e : (this.isOasis ? 0xd48e55 : 0x909d8e)));
    const boulderMat = new THREE.MeshStandardMaterial({
      color: boulderColor, // Obsidian for lava, frosty stone for frozen, warm sandstone for oasis, weathered limestone for forest
      roughness: 0.75,
      metalness: 0.02,
      normalMap: canyonNorm
    });

    rocks4Gltf.scene.traverse(c => {
      if (c.isMesh && (c.name.includes('Rock4_2') || c.name.includes('Rock4_3') || c.name.includes('Rock4_4'))) {
        c.material = boulderMat;
        c.castShadow = true;
        c.receiveShadow = true;
        boulderMeshes.push(c);
      }
    });

    // 3. Distribute rocks densely along the perimeter
    const numRocks = (this.isOasis || this.isFrozen) ? 68 : 44;
    for (let i = 0; i < numRocks; i++) {
      const theta = (i / numRocks) * Math.PI * 2;
      const isAnchorBoulder = (i % 5 === 0) && (boulderMeshes.length > 0);

      // Stagger rocks: some slightly inner (water edge), some outer (grass crest)
      const isInner = (i % 2 === 0);
      const rMult = isInner ? (0.92 + (i % 3) * 0.02) : (1.04 + (i % 4) * 0.02);
      const pt = this.getPerimeterPoint(theta, rMult);

      if (isAnchorBoulder) {
        // Large river rock boulder
        const baseMesh = boulderMeshes[(i / 5) % boulderMeshes.length];
        const rock = baseMesh.clone();
        const bScale = (this.isOasis || this.isFrozen) ? (0.75 + ((i * 17) % 10) * 0.045) : (0.55 + ((i * 17) % 10) * 0.035);
        const bY = isInner ? -0.06 : 0.002;
        rock.position.set(pt.x, bY, pt.z);
        rock.rotation.set(0.08, theta + 1.2, 0.05);
        rock.scale.setScalar(bScale);
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.group.add(rock);
      } else if (pebbleMeshes.length > 0) {
        // Round Pebble from Stylized Nature MegaKit
        const baseMesh = pebbleMeshes[i % pebbleMeshes.length];
        const pebble = baseMesh.clone();
        const pScale = (this.isOasis || this.isFrozen) ? (1.95 + ((i * 23) % 10) * 0.09) : (1.65 + ((i * 23) % 10) * 0.08);
        const pY = isInner ? -0.10 : 0.005;
        pebble.position.set(pt.x, pY, pt.z);
        pebble.rotation.set((i % 3 - 1) * 0.08, theta * 2.0 + i, (i % 2 - 0.5) * 0.08);
        pebble.scale.setScalar(pScale);
        pebble.castShadow = true;
        pebble.receiveShadow = true;
        this.group.add(pebble);
      }
    }

    // 3b. Emergent Oasis Center Rock Formation (rising majestically out of the water)
    if (this.isOasis && boulderMeshes.length > 0) {
      const centerRock = boulderMeshes[0].clone();
      centerRock.position.set(this.cx + 0.9, -0.32, this.cz - 0.7);
      centerRock.rotation.set(0.12, 1.4, -0.08);
      centerRock.scale.set(2.4, 2.1, 2.6); // Tall emergent central monolith rising +1.5m above water
      centerRock.castShadow = true;
      centerRock.receiveShadow = true;
      this.group.add(centerRock);

      const subRock = (boulderMeshes[1] || boulderMeshes[0]).clone();
      subRock.position.set(this.cx + 2.3, -0.35, this.cz - 0.2);
      subRock.rotation.set(-0.1, 2.8, 0.15);
      subRock.scale.set(1.4, 1.1, 1.5);
      subRock.castShadow = true;
      subRock.receiveShadow = true;
      this.group.add(subRock);
    }

    // 4. Build small interior rocks and pebbles inside the pond bed and shallow shelf
    this._buildInteriorRocks(pebbleMeshes, boulderMeshes);
  }

  _buildInteriorRocks(pebbleMeshes, boulderMeshes) {
    if (!pebbleMeshes || !pebbleMeshes.length) return;

    // 1. Submerged floor pebbles resting on the bottom bed of the pond (y = -0.72 to -0.74)
    const floorPebbles = [
      { theta: 0.35, rMult: 0.32, scale: 0.85, y: -0.73 },
      { theta: 1.10, rMult: 0.45, scale: 0.70, y: -0.72 },
      { theta: 1.85, rMult: 0.25, scale: 0.95, y: -0.74 },
      { theta: 2.60, rMult: 0.48, scale: 0.75, y: -0.72 },
      { theta: 3.30, rMult: 0.35, scale: 0.90, y: -0.73 },
      { theta: 4.15, rMult: 0.50, scale: 0.80, y: -0.72 },
      { theta: 4.90, rMult: 0.28, scale: 1.05, y: -0.74 },
      { theta: 5.65, rMult: 0.42, scale: 0.72, y: -0.72 }
    ];

    floorPebbles.forEach((cfg, idx) => {
      const pt = this.getPerimeterPoint(cfg.theta, cfg.rMult);
      const baseMesh = pebbleMeshes[(idx * 2) % pebbleMeshes.length];
      const pebble = baseMesh.clone();
      pebble.position.set(pt.x, cfg.y, pt.z);
      pebble.rotation.set((idx % 3) * 0.2, cfg.theta * 1.5, (idx % 2) * 0.2);
      pebble.scale.setScalar(cfg.scale);
      pebble.castShadow = true;
      pebble.receiveShadow = true;
      this.group.add(pebble);
    });

    // 2. Shallow shelf pebbles and rocks (resting on underwater ledge, visible at the water margin)
    const shelfRocks = [
      { theta: 0.75, rMult: 0.76, scale: 1.10, y: -0.38 },
      { theta: 1.50, rMult: 0.80, scale: 0.90, y: -0.36 },
      { theta: 2.20, rMult: 0.74, scale: 1.25, y: -0.40 },
      { theta: 3.80, rMult: 0.78, scale: 1.00, y: -0.37 },
      { theta: 4.50, rMult: 0.82, scale: 0.85, y: -0.35 },
      { theta: 5.25, rMult: 0.75, scale: 1.15, y: -0.39 }
    ];

    shelfRocks.forEach((cfg, idx) => {
      const pt = this.getPerimeterPoint(cfg.theta, cfg.rMult);
      const baseMesh = (idx % 3 === 0 && boulderMeshes && boulderMeshes.length > 0)
        ? boulderMeshes[idx % boulderMeshes.length]
        : pebbleMeshes[(idx * 3 + 1) % pebbleMeshes.length];
      const rock = baseMesh.clone();
      rock.position.set(pt.x, cfg.y, pt.z);
      rock.rotation.set(0.1, cfg.theta + 0.8, -0.1);
      const scaleMultiplier = (idx % 3 === 0 && boulderMeshes && boulderMeshes.length > 0) ? 0.48 : cfg.scale;
      rock.scale.setScalar(scaleMultiplier);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
    });
  }

  _loadAndBuildCloversAndFoliage(assets) {
    // 1. Preloaded Clover models & Leaves texture
    const { clover1Gltf, clover2Gltf, bushSmallGltf, leavesTex } = assets;

    // Wind sway clover material
    const cloverMat = new THREE.MeshStandardMaterial({
      map: leavesTex,
      color: this.isFrozen ? 0x92b2c4 : 0xffffff,
      alphaTest: 0.22,
      depthWrite: true,
      roughness: 0.82,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    cloverMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.foliageUniforms);
      shader.vertexShader = `
        uniform float uTime;
        uniform float uWindSpeed;
        uniform float uWindStrength;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float h = max(0.0, position.y);
        float swayPhase = uTime * uWindSpeed * 1.1 + position.x * 0.9 + position.z * 0.9;
        transformed.x += sin(swayPhase) * h * uWindStrength * 0.35;
        transformed.z += cos(swayPhase * 0.8) * h * uWindStrength * 0.25;
        `
      );
    };

    // Extract geometries
    const extractGeom = (gltf) => {
      let g = null;
      gltf.scene.traverse((c) => {
        if (!g && c.isMesh) g = c.geometry.clone();
      });
      return g;
    };

    const c1Geom = extractGeom(clover1Gltf);
    const c2Geom = extractGeom(clover2Gltf);
    const bushGeom = extractGeom(bushSmallGltf);

    // Place 16 clover clumps along the outer grass edge
    const dummy = new THREE.Object3D();
    const c1List = [];
    const c2List = [];

    const numClovers = 16;
    for (let i = 0; i < numClovers; i++) {
      const theta = (i / numClovers) * Math.PI * 2 + 0.2;
      const rMult = 1.12 + (i % 3) * 0.04;
      const pt = this.getPerimeterPoint(theta, rMult);

      const targetList = (i % 2 === 0) ? c1List : c2List;
      targetList.push({
        x: pt.x,
        y: 0.005,
        z: pt.z,
        scale: 0.48 + (i % 4) * 0.05,
        rotY: i * 1.9
      });
    }

    const buildCloverInstMesh = (geom, list) => {
      if (!geom || list.length === 0) return;
      const instMesh = new THREE.InstancedMesh(geom, cloverMat, list.length);
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;

      list.forEach((inst, idx) => {
        dummy.position.set(inst.x, inst.y, inst.z);
        dummy.rotation.set(0, inst.rotY, 0);
        dummy.scale.setScalar(inst.scale);
        dummy.updateMatrix();
        instMesh.setMatrixAt(idx, dummy.matrix);
      });
      instMesh.instanceMatrix.needsUpdate = true;
      this.group.add(instMesh);
    };

    buildCloverInstMesh(c1Geom, c1List);
    buildCloverInstMesh(c2Geom, c2List);

    // Accent with 3 small bushes framing back edges of the pond
    if (bushGeom) {
      const bushMat = new THREE.MeshStandardMaterial({
        color: this.isFrozen ? 0x82aab8 : 0x38a846,
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide
      });
      const bushAngles = [0.8, 2.5, 4.2];
      bushAngles.forEach((angle, idx) => {
        const pt = this.getPerimeterPoint(angle, 1.18);
        const bush = new THREE.Mesh(bushGeom, bushMat);
        bush.position.set(pt.x, 0.005, pt.z);
        bush.rotation.set(0, idx * 2.1, 0);
        bush.scale.setScalar(0.75 + idx * 0.15);
        bush.castShadow = true;
        bush.receiveShadow = true;
        this.group.add(bush);
      });
    }
  }

  _setupCollisions() {
    if (!this.collisions) return;
    if (this.isFrozen) {
      // Frozen lake: surface is solid ice, allowing player to walk freely across the frozen lake!
      return;
    }
    const tag = this.collisionTag;
    if (this.isOasis) {
      // Scaled collision coverage for large oasis (radH = 7.2, radV = 5.4)
      this.collisions.addCircle(this.cx, this.cz, 4.2, tag);
      this.collisions.addCircle(this.cx + 2.4, this.cz - 1.8, 3.2, tag);
      this.collisions.addCircle(this.cx - 2.4, this.cz + 1.8, 3.2, tag);
      this.collisions.addCircle(this.cx + 1.8, this.cz + 2.0, 3.0, tag);
      this.collisions.addCircle(this.cx - 1.8, this.cz - 2.0, 3.0, tag);
      // Emergent center rock collision
      this.collisions.addCircle(this.cx + 0.9, this.cz - 0.7, 1.8, tag + '_rock');
    } else {
      // Overlapping collision circles protecting the water interior
      this.collisions.addCircle(this.cx, this.cz, 2.5, tag);
      this.collisions.addCircle(this.cx + 1.2, this.cz - 0.9, 2.1, tag);
      this.collisions.addCircle(this.cx - 1.2, this.cz + 0.9, 2.1, tag);
      this.collisions.addCircle(this.cx + 0.8, this.cz + 0.9, 2.0, tag);
      this.collisions.addCircle(this.cx - 0.8, this.cz - 0.9, 2.0, tag);
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
    if (this.collisions) {
      if (!visible) {
        this.collisions.removeCirclesByTag(this.collisionTagPrefix);
      } else {
        this._setupCollisions();
      }
    }
  }

  update(dt) {
    if (!this.group.visible) return;

    this.waterUniforms.uTime.value += dt;
    this.foliageUniforms.uTime.value += dt;
    if (this.fishUniforms) {
      this.fishUniforms.uTime.value += dt;
    }
    if (this.iceUniforms) {
      this.iceUniforms.uTime.value += dt;
    }

    const time = this.waterUniforms.uTime.value;

    // Bobbing floating petals
    for (let i = 0; i < this.floatingLeaves.length; i++) {
      const leaf = this.floatingLeaves[i];
      const bob = Math.sin(time * 2.0 + leaf.phase) * 0.004;
      leaf.mesh.position.y = leaf.baseY + bob;
      leaf.mesh.rotation.y += dt * 0.08;
    }

    // Swimming fish shadows along elliptical paths under water
    for (let i = 0; i < this.fishMeshes.length; i++) {
      const fish = this.fishMeshes[i];
      const data = this.fishData[i];

      const curAngle = time * data.speed + data.phase;
      const cosA = Math.cos(curAngle);
      const sinA = Math.sin(curAngle);

      // Gentle lateral wandering
      const wobbleR = Math.sin(curAngle * 2.0 + data.phase) * 0.12;
      const curRH = data.rH + wobbleR;
      const curRV = data.rV + wobbleR * 0.7;

      const fx = this.cx + 0.7071 * cosA * curRH + 0.7071 * sinA * curRV;
      const fz = this.cz - 0.7071 * cosA * curRH + 0.7071 * sinA * curRV;

      // Heading tangent direction
      const sign = Math.sign(data.speed);
      const dx = (-0.7071 * sinA * curRH + 0.7071 * cosA * curRV) * sign;
      const dz = ( 0.7071 * sinA * curRH + 0.7071 * cosA * curRV) * sign;
      const yaw = Math.atan2(dx, dz);

      const bobY = Math.sin(time * 1.8 + data.phase) * 0.012;
      fish.position.set(fx, data.depth + bobY, fz);
      fish.rotation.set(0, yaw, 0);
    }

    // Animate boiling lava bubbles & pulsating volcanic light
    if (this.isLava && this.lavaBubbles) {
      for (let i = 0; i < this.lavaBubbles.length; i++) {
        const b = this.lavaBubbles[i];
        b.age += dt;
        if (b.age >= b.lifetime) {
          b.age = 0;
          b.lifetime = 1.1 + Math.random() * 1.8;
          b.maxScale = 0.45 + Math.random() * 0.65;
          const theta = Math.random() * Math.PI * 2;
          const rMult = 0.12 + Math.random() * 0.68;
          b.pt = this.getPerimeterPoint(theta, rMult);
        }

        const progress = b.age / b.lifetime;
        const swell = Math.sin(progress * Math.PI);
        if (swell > 0.02) {
          b.mesh.visible = true;
          b.mesh.position.set(b.pt.x, b.waterY + swell * 0.18 * b.maxScale, b.pt.z);
          b.mesh.scale.set(swell * b.maxScale, swell * b.maxScale * 0.75, swell * b.maxScale);
        } else {
          b.mesh.visible = false;
        }
      }

      if (this.lavaLight) {
        const pulse = Math.sin(time * 3.8) * 0.45 + Math.cos(time * 6.5) * 0.25;
        this.lavaLight.intensity = Math.max(1.5, 2.5 + pulse);
      }
    }
  }
}
