import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';

// Color palette for lush anime/Ghibli style riverbank leaf shoots
const FOLIAGE_COLORS = [
  new THREE.Color('#2d8438'), // Deep emerald leaf
  new THREE.Color('#38a846'), // Vibrant mid green
  new THREE.Color('#46be52'), // Bright foliage green
  new THREE.Color('#58d056'), // Fresh sunny green
  new THREE.Color('#6ee252'), // Tender lime shoot
  new THREE.Color('#3ea442')  // Leaf canopy tone
];

// River centerline curve: gentle natural winding along Z axis
export function getRiverCenter(z) {
  const x = 8.5 + 1.8 * Math.sin(z * 0.09) + 0.8 * Math.cos(z * 0.21);
  const dx = 1.8 * 0.09 * Math.cos(z * 0.09) - 0.8 * 0.21 * Math.sin(z * 0.21);
  return { x, dx };
}

// Procedural flat ivy cluster geometry for bridge edges
function createStoneIvyClusterGeometry() {
  const positions = [
    0.00, 0.00, 0.000,   0.00, 0.06, 0.006,  -0.045, 0.02, 0.001,
    -0.085, 0.07, 0.002, -0.035, 0.10, 0.003, 0.00, 0.14, 0.006,
    0.035, 0.10, 0.003,  0.085, 0.07, 0.002,  0.045, 0.02, 0.001
  ];
  const indices = [
    0, 2, 1,  0, 1, 8,  2, 3, 1,  3, 4, 1,
    4, 5, 1,  1, 5, 6,  1, 6, 7,  1, 7, 8
  ];

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// Procedural floating leaf / water petal geometry (as in reference image)
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
    // Snout
    0.00,  0.00,  0.22,
    // Top spine
    0.00,  0.04,  0.08,
    // Bottom belly
    0.00, -0.03,  0.08,
    // Left flank
   -0.045, 0.005, 0.08,
    // Right flank
    0.045, 0.005, 0.08,
    // Peduncle (tail base)
    0.00,  0.01, -0.12,
    // Left fin tip
   -0.06,  0.025, -0.22,
    // Right fin tip
    0.06,  0.025, -0.22,
    // Center tail notch
    0.00,  0.01,  -0.18
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

export class StylizedRiver {
  constructor(scene, collisions) {
    this.scene = scene;
    this.collisions = collisions;
    this.group = new THREE.Group();
    this.group.name = 'stylized_river';
    this.group.visible = false;
    this.scene.add(this.group);

    this.waterMesh = null;
    this.canyonMesh = null;
    this.stoneBridgeGroup = new THREE.Group();
    this.inStreamRocksGroup = new THREE.Group();
    this.canyonSideRocksGroup = new THREE.Group();
    this.fishInstancedMesh = null;
    this.leavesInstancedMesh = null;

    this.group.add(this.stoneBridgeGroup);
    this.group.add(this.inStreamRocksGroup);
    this.group.add(this.canyonSideRocksGroup);

    this.bankDressingGroup = new THREE.Group();
    this.bankDressingGroup.name = 'riverbank_dressing';
    this.group.add(this.bankDressingGroup);

    // Multi-Zone Support: [2, 1] to [2, 3] (or legacy [3, 1] to [3, 5])
    this.currentZoneId = 'zone_2_2';
    this.currentGx = 2;
    this.currentGy = 2;

    // Sub-feature groups
    this.waterfallLakeGroup = new THREE.Group();
    this.waterfallLakeGroup.name = 'river_waterfall_lake';
    this.waterfallLakeGroup.visible = false;
    this.group.add(this.waterfallLakeGroup);

    this.dungeonChasmGroup = new THREE.Group();
    this.dungeonChasmGroup.name = 'river_dungeon_chasm';
    this.dungeonChasmGroup.visible = false;
    this.group.add(this.dungeonChasmGroup);

    this.bridgeGroups = {
      forest: this.stoneBridgeGroup,
      arctic: new THREE.Group(),
      dungeon: new THREE.Group()
    };
    this.bridgeGroups.arctic.name = 'bridge_arctic';
    this.bridgeGroups.arctic.visible = false;
    this.group.add(this.bridgeGroups.arctic);

    this.bridgeGroups.dungeon.name = 'bridge_dungeon';
    this.bridgeGroups.dungeon.visible = false;
    this.group.add(this.bridgeGroups.dungeon);

    this.waterUniforms = null;
    this.fishUniforms = null;
    this.foamRingsUniforms = null;
    this.waterfallUniforms = null;
    this.chasmUniforms = null;
    this.foliageUniforms = {
      uTime: { value: 0 },
      uWindSpeed: { value: 2.2 },
      uWindStrength: { value: 0.18 }
    };
    this.rockModels = {};
    this.rockNormalMap = null;

    // Simulation data
    this.numFish = 12;
    this.fishData = [];

    this.numLeaves = 28;
    this.leavesData = [];

    this.isLoaded = false;
  }

  async init() {
    console.log('[StylizedRiver] Generating deep canyon riverbed, continuous stone bridge and aquatic life...');
    const texLoader = new THREE.TextureLoader();

    // Load Normal Map for Canyon Walls
    const canyonNorm = await texLoader.loadAsync('./assets/rocks/Textures/RockCollection4NormalMap.png');
    canyonNorm.wrapS = canyonNorm.wrapT = THREE.RepeatWrapping;

    // 1. Build recessed canyon riverbed, rocky cliff walls & water ribbon
    this._buildRiverGeometry(canyonNorm);

    // 2. Build continuous stone bridge & bank rocks
    await this._loadAndBuildRocks();

    // 2b. Build riverbank dressing (follaje de suelo, flores y rocas pequeñas along rim edges)
    await this._loadAndBuildRiverbankDressing(texLoader);

    // 3. Build floating water leaves
    this._buildFloatingLeaves();

    // 4. Build swimming fish school
    this._buildFishSchool();

    // 5. Register boundary collisions
    this._registerCollisions();

    this.isLoaded = true;
    console.log('[StylizedRiver] River canyon and stone bridge built successfully.');
  }

  _buildRiverGeometry(canyonNorm) {
    const numZ = 120;
    const zMin = -40.0;
    const zMax = 40.0;

    // --- 1. Sunken Canyon Riverbed & Steep Rocky Cliff Walls ---
    // Deep gorge profile:
    // Left rim (0.002 overlap) -> Left bevel (-0.015) -> Left upper cliff (-0.26) -> Left mid cliff (-0.54) -> Left water toe (-0.74) -> ...
    const canyonOffsets = [
      { uOffset: -2.55, y:  0.002 }, // 0: East bank ground overlap lip (flush with ground)
      { uOffset: -2.35, y: -0.015 }, // 1: East bank top edge transition
      { uOffset: -2.15, y: -0.260 }, // 2: East canyon wall upper cliff
      { uOffset: -1.96, y: -0.540 }, // 3: East canyon wall mid cliff
      { uOffset: -1.86, y: -0.740 }, // 4: East water edge toe
      { uOffset: -1.10, y: -0.920 }, // 5: East riverbed slope
      { uOffset:  0.00, y: -1.080 }, // 6: Center riverbed trough
      { uOffset:  1.10, y: -0.920 }, // 7: West riverbed slope
      { uOffset:  1.86, y: -0.740 }, // 8: West water edge toe
      { uOffset:  1.96, y: -0.540 }, // 9: West canyon wall mid cliff
      { uOffset:  2.15, y: -0.260 }, // 10: West canyon wall upper cliff
      { uOffset:  2.35, y: -0.015 }, // 11: West bank top edge transition
      { uOffset:  2.55, y:  0.002 }  // 12: West bank ground overlap lip (flush with ground)
    ];
    const numProfile = canyonOffsets.length;

    const canyonPos = [];
    const canyonUvs = [];
    const canyonNormals = [];
    const canyonIndices = [];

    for (let i = 0; i <= numZ; i++) {
      const v = i / numZ;
      const z = zMin + v * (zMax - zMin);
      const { x: cx, dx } = getRiverCenter(z);

      const tangentLen = Math.hypot(dx, 1.0);
      const nx = -1.0 / tangentLen;
      const nz = dx / tangentLen;

      for (let p = 0; p < numProfile; p++) {
        const prof = canyonOffsets[p];
        const posX = cx + nx * prof.uOffset;
        const posZ = z + nz * prof.uOffset;
        const posY = prof.y;

        canyonPos.push(posX, posY, posZ);
        canyonUvs.push(p / (numProfile - 1), v * 8.0);
        canyonNormals.push(0, 1, 0); // Recomputed by computeVertexNormals
      }
    }

    const cRow = numProfile;
    for (let i = 0; i < numZ; i++) {
      for (let p = 0; p < numProfile - 1; p++) {
        const a = i * cRow + p;
        const b = (i + 1) * cRow + p;
        const c = (i + 1) * cRow + (p + 1);
        const d = i * cRow + (p + 1);

        canyonIndices.push(a, b, d);
        canyonIndices.push(b, c, d);
      }
    }

    const canyonGeom = new THREE.BufferGeometry();
    canyonGeom.setAttribute('position', new THREE.Float32BufferAttribute(canyonPos, 3));
    canyonGeom.setAttribute('uv', new THREE.Float32BufferAttribute(canyonUvs, 2));
    canyonGeom.setAttribute('normal', new THREE.Float32BufferAttribute(canyonNormals, 3));
    canyonGeom.setIndex(canyonIndices);
    canyonGeom.computeVertexNormals();

    const canyonMaterial = new THREE.MeshStandardMaterial({
      color: 0x687465, // Stylized earthy rock cliff canyon color
      roughness: 0.88,
      metalness: 0.02,
      normalMap: canyonNorm,
      normalScale: new THREE.Vector2(0.9, 0.9),
      flatShading: true // Low-poly faceted stylized cliff look (as in reference image)
    });

    this.canyonMesh = new THREE.Mesh(canyonGeom, canyonMaterial);
    this.canyonMesh.receiveShadow = true;
    this.canyonMesh.castShadow = false; // Sunken terrain ditch: receives shadows, does not cast harsh shadow on rim
    this.group.add(this.canyonMesh);

    // --- 2. Water Surface Ribbon (Lowered to y = -0.725 inside the canyon) ---
    const waterNumX = 14;
    const waterHalfWidth = 1.86; // Spans exactly from toe to toe (width 3.72m)
    const waterPos = [];
    const waterUvs = [];
    const waterNormals = [];
    const waterIndices = [];

    for (let i = 0; i <= numZ; i++) {
      const v = i / numZ;
      const z = zMin + v * (zMax - zMin);
      const { x: cx, dx } = getRiverCenter(z);

      const tangentLen = Math.hypot(dx, 1.0);
      const nx = -1.0 / tangentLen;
      const nz = dx / tangentLen;

      for (let j = 0; j <= waterNumX; j++) {
        const u = j / waterNumX;
        const offsetDist = (u - 0.5) * 2.0 * waterHalfWidth;

        const posX = cx + nx * offsetDist;
        const posZ = z + nz * offsetDist;
        const posY = -0.725; // Deep recessed water level in canyon

        waterPos.push(posX, posY, posZ);
        waterUvs.push(u, v);
        waterNormals.push(0, 1, 0);
      }
    }

    const wRow = waterNumX + 1;
    for (let i = 0; i < numZ; i++) {
      for (let j = 0; j < waterNumX; j++) {
        const a = i * wRow + j;
        const b = (i + 1) * wRow + j;
        const c = (i + 1) * wRow + (j + 1);
        const d = i * wRow + (j + 1);

        waterIndices.push(a, b, d);
        waterIndices.push(b, c, d);
      }
    }

    const waterGeom = new THREE.BufferGeometry();
    waterGeom.setAttribute('position', new THREE.Float32BufferAttribute(waterPos, 3));
    waterGeom.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
    waterGeom.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
    waterGeom.setIndex(waterIndices);

    // --- 3. GPU Stylized Water Shader Material ---
    this.waterUniforms = {
      uTime: { value: 0 },
      uFlowSpeed: { value: 0.36 },
      uShallowColor: { value: new THREE.Color('#38d1ee') }, // Bright crystal turquoise
      uDeepColor: { value: new THREE.Color('#14649c') },    // Deep rich sapphire blue
      uFoamColor: { value: new THREE.Color('#eafcff') },    // Crisp foam white-cyan
      uSunDir: { value: new THREE.Vector3(18, 18, 10).normalize() }
    };

    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vNormal = normal;
          vec3 pos = position;
          // Soft wave oscillation
          float wave = sin(uTime * 2.8 + pos.z * 1.8 + pos.x * 2.2) * 0.007;
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
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          // Downstream flow UV coordinates along V axis
          float flowV = vUv.y * 14.0 - uTime * uFlowSpeed;
          float crossU = vUv.x;

          // 1. Organic current flow lines (white anime stream streaks)
          float lineNoise1 = sin(crossU * 24.0 + sin(flowV * 3.5) * 2.0);
          float lineNoise2 = sin(flowV * 4.0 + cos(crossU * 16.0) * 1.8);
          float streak1 = smoothstep(0.82, 0.94, lineNoise1 * lineNoise2);

          float flowV2 = vUv.y * 22.0 - uTime * (uFlowSpeed * 1.25) + 0.5;
          float lineNoise3 = sin(crossU * 36.0 + 1.5 + sin(flowV2 * 4.0) * 1.5);
          float streak2 = smoothstep(0.85, 0.96, lineNoise3 * sin(flowV2 * 3.0));

          float currentLines = clamp(streak1 * 0.85 + streak2 * 0.75, 0.0, 1.0);

          // 2. Shore foam along canyon walls
          float edgeDist = abs(crossU - 0.5) * 2.0; // 0 at center, 1 at banks
          float bankRipples = sin(vUv.y * 35.0 - uTime * 2.5) * 0.06 + sin(vUv.y * 70.0 + uTime * 3.0) * 0.03;
          float shoreFoam = smoothstep(0.84 + bankRipples, 0.99, edgeDist);

          // 3. Water depth color blending: deep sapphire in center, turquoise at walls
          vec3 waterCol = mix(uDeepColor, uShallowColor, smoothstep(0.15, 0.80, edgeDist));

          // 4. Subtle sunlight specular glint
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfVec = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfVec), 0.0), 38.0) * 0.45;

          // 5. Combine water color with current lines & foam
          vec3 finalColor = waterCol + vec3(spec);
          float totalFoam = max(currentLines * 0.80, shoreFoam * 0.92);
          finalColor = mix(finalColor, uFoamColor, totalFoam);

          // Translucent water allowing riverbed and fish visibility
          float alpha = 0.85 + totalFoam * 0.14;
          gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 0.98));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.waterMesh = new THREE.Mesh(waterGeom, waterMaterial);
    this.waterMesh.renderOrder = 4;
    this.group.add(this.waterMesh);
  }

  async _loadAndBuildRocks() {
    const gltfLoader = new GLTFLoader();
    const texLoader = new THREE.TextureLoader();

    // Load Rock Collections 2 and 4
    const [norm2, norm4, col2Gltf, col4Gltf] = await Promise.all([
      texLoader.loadAsync('./assets/rocks/Textures/RockCollection2NormalMap.png'),
      texLoader.loadAsync('./assets/rocks/Textures/RockCollection4NormalMap.png'),
      gltfLoader.loadAsync('./assets/rocks/StylisedRockCollection2.glb'),
      gltfLoader.loadAsync('./assets/rocks/StylisedRockCollection4.glb')
    ]);

    const bridgeRockMat = new THREE.MeshStandardMaterial({
      color: 0x98a79a, // Ancient limestone slab color
      roughness: 0.78,
      metalness: 0.0,
      normalMap: norm2,
      normalScale: new THREE.Vector2(1.0, 1.0)
    });

    const riverRockMat = new THREE.MeshStandardMaterial({
      color: 0x829486, // Wet stream limestone
      roughness: 0.65,
      metalness: 0.05,
      normalMap: norm4,
      normalScale: new THREE.Vector2(1.1, 1.1)
    });

    const rockModels = {};
    col2Gltf.scene.traverse((c) => {
      if (c.isMesh) {
        c.material = bridgeRockMat;
        c.castShadow = true;
        c.receiveShadow = true;
        rockModels[c.name] = c;
      }
    });
    col4Gltf.scene.traverse((c) => {
      if (c.isMesh) {
        c.material = riverRockMat;
        c.castShadow = true;
        c.receiveShadow = true;
        rockModels[c.name] = c;
      }
    });

    this.rockModels = rockModels;
    this.rockNormalMap = norm4;

    const slabMeshBase = rockModels['Rock2_4'] || rockModels['Rock4_1'] || Object.values(rockModels)[0];
    const pierMeshBase = rockModels['Rock2_2'] || rockModels['Rock2_1'] || Object.values(rockModels)[0];
    const bankRockMeshBase = rockModels['Rock4_2'] || rockModels['Rock4_3'] || Object.values(rockModels)[0];

    // --- A. Flat Natural Stone Crossing at Ground Level (Paso de rocas plano a nivel del suelo) ---
    // 4 wide, flat rock slabs at ground level (y = 0.015, scaleY = 0.28) forming a continuous, perfectly flat crossing.
    // Removed the elevated arched bridge above as requested by user.
    const bridgeSlabConfigs = [
      { x:  5.85, y: -0.260, z:  0.05, rotY: 0.40, scaleX: 1.10, scaleY: 0.28, scaleZ: 1.45 }, // West bank flat slab (flush with ground)
      { x:  7.75, y: -0.260, z:  0.00, rotY: 1.25, scaleX: 1.15, scaleY: 0.28, scaleZ: 1.45 }, // West channel flat slab (flush with ground)
      { x:  9.65, y: -0.260, z:  0.00, rotY: 2.10, scaleX: 1.15, scaleY: 0.28, scaleZ: 1.45 }, // East channel flat slab (flush with ground)
      { x: 11.55, y: -0.260, z:  0.02, rotY: 0.80, scaleX: 1.10, scaleY: 0.28, scaleZ: 1.45 }  // East bank flat slab (flush with ground)
    ];

    const ivyGeom = createStoneIvyClusterGeometry();
    const ivyMat = new THREE.MeshStandardMaterial({
      color: 0x38a644,
      roughness: 0.65,
      side: THREE.DoubleSide
    });

    bridgeSlabConfigs.forEach((cfg) => {
      const stone = slabMeshBase.clone();
      stone.position.set(cfg.x, cfg.y, cfg.z);
      stone.rotation.y = cfg.rotY;
      stone.scale.set(cfg.scaleX, cfg.scaleY, cfg.scaleZ);
      this.stoneBridgeGroup.add(stone);

      // Clinging ivy along bridge flanks
      const topSurfaceY = cfg.y + cfg.scaleY * 1.00;
      for (let a = 0; a < 2; a++) {
        const ivyAngle = cfg.rotY + a * 2.2 + 0.5;
        const radius = 0.50 * cfg.scaleX;
        const ix = cfg.x + Math.cos(ivyAngle) * radius;
        const iz = cfg.z + Math.sin(ivyAngle) * radius;
        const ivyMesh = new THREE.Mesh(ivyGeom, ivyMat);
        ivyMesh.position.set(ix, topSurfaceY + 0.003, iz);
        ivyMesh.rotation.set(-0.25, ivyAngle + Math.PI / 2, 0.15);
        ivyMesh.scale.setScalar(0.70);
        this.stoneBridgeGroup.add(ivyMesh);
      }
    });

    // --- A2. Arctic Frost-Slate Bridge (Zone 3_1) ---
    const arcticBridgeMat = new THREE.MeshStandardMaterial({
      color: 0x7c8c99, // Slate gray with cold frost tone
      roughness: 0.82,
      metalness: 0.0,
      normalMap: norm2,
      normalScale: new THREE.Vector2(1.0, 1.0)
    });

    // --- A3. Dungeon Charred Basalt Bridge (Zone 3_5) ---
    const dungeonBridgeMat = new THREE.MeshStandardMaterial({
      color: 0x2b242e, // Charred volcanic basalt
      roughness: 0.90,
      metalness: 0.05,
      normalMap: norm2,
      normalScale: new THREE.Vector2(1.1, 1.1)
    });

    bridgeSlabConfigs.forEach((cfg) => {
      // Arctic slab
      const aStone = slabMeshBase.clone();
      aStone.material = arcticBridgeMat;
      aStone.position.set(cfg.x, cfg.y, cfg.z);
      aStone.rotation.y = cfg.rotY;
      aStone.scale.set(cfg.scaleX, cfg.scaleY, cfg.scaleZ);
      this.bridgeGroups.arctic.add(aStone);

      // Dungeon slab
      const dStone = slabMeshBase.clone();
      dStone.material = dungeonBridgeMat;
      dStone.position.set(cfg.x, cfg.y, cfg.z);
      dStone.rotation.y = cfg.rotY;
      dStone.scale.set(cfg.scaleX, cfg.scaleY, cfg.scaleZ);
      this.bridgeGroups.dungeon.add(dStone);
    });

    // --- B. Rocks Lining the Riverbanks at Water's Edge (as in reference image) ---
    const bankRockPlacements = [
      // West canyon foot along water edge
      { x: 7.05, y: -0.72, z: -2.8, rotY: 0.4,  scale: 0.55 },
      { x: 6.95, y: -0.70, z: -1.7, rotY: 1.9,  scale: 0.48 },
      { x: 7.00, y: -0.70, z:  1.6, rotY: 2.8,  scale: 0.50 },
      { x: 7.10, y: -0.72, z:  2.9, rotY: 0.9,  scale: 0.58 },
      // East canyon foot along water edge
      { x: 10.75, y: -0.72, z: -2.7, rotY: 2.1, scale: 0.52 },
      { x: 10.85, y: -0.70, z: -1.6, rotY: 0.6, scale: 0.46 },
      { x: 10.80, y: -0.70, z:  1.5, rotY: 1.7, scale: 0.50 },
      { x: 10.70, y: -0.72, z:  2.8, rotY: 3.0, scale: 0.55 }
    ];

    bankRockPlacements.forEach((bp) => {
      const bRock = bankRockMeshBase.clone();
      bRock.position.set(bp.x, bp.y, bp.z);
      bRock.rotation.y = bp.rotY;
      bRock.scale.setScalar(bp.scale);
      this.canyonSideRocksGroup.add(bRock);
    });

    // --- C. In-Stream Rocks with Animated Foam Rings ---
    const inStreamZList = [-32, -27, -22, -17, -12, -8, -4.5, 4.5, 9, 14, 19, 23, 28, 33];
    const foamRingGeom = new THREE.RingGeometry(0.35, 0.70, 24);
    foamRingGeom.rotateX(-Math.PI / 2);

    this.foamRingsUniforms = {
      uTime: { value: 0 },
      uFoamColor: { value: new THREE.Color('#eafcff') }
    };

    const foamRingMat = new THREE.ShaderMaterial({
      uniforms: this.foamRingsUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uFoamColor;
        varying vec2 vUv;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float pulse = sin(dist * 20.0 - uTime * 3.5) * 0.5 + 0.5;
          float alpha = smoothstep(0.48, 0.15, dist) * pulse * 0.75;
          gl_FragColor = vec4(uFoamColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    inStreamZList.forEach((sz, idx) => {
      const { x: cx } = getRiverCenter(sz);
      const xOffset = ((idx % 3) - 1.0) * 0.65 + Math.sin(sz) * 0.25;
      const rockX = cx + xOffset;
      const rockZ = sz;
      const rockY = -0.75; // Lowered to canyon riverbed level
      const scale = 0.35 + ((idx * 7) % 5) * 0.05;

      const rock = bankRockMeshBase.clone();
      rock.position.set(rockX, rockY, rockZ);
      rock.rotation.set(0.1, idx * 1.3, 0);
      rock.scale.setScalar(scale);
      this.inStreamRocksGroup.add(rock);

      const foamRing = new THREE.Mesh(foamRingGeom, foamRingMat);
      foamRing.position.set(rockX, -0.718, rockZ);
      foamRing.scale.setScalar(scale * 1.35);
      foamRing.renderOrder = 5;
      this.inStreamRocksGroup.add(foamRing);
    });

    // --- D. Build Glacial Waterfall & Mountain Lake (Zone 3_1) ---
    this._buildWaterfallAndLake(rockModels, norm4);

    // --- E. Build Terminal Volcanic Chasm Plunge (Zone 3_5) ---
    this._buildDungeonChasm(rockModels, norm4);
  }

  _buildWaterfallAndLake(rockModels, norm4) {
    this.waterfallUniforms = {
      uTime: { value: 0 }
    };

    // Mountain Rock Formations at northern boundary (Slate gray with cold frost tone)
    // The river ribbon naturally emerges from underneath these majestic mountain boulders!
    const arcticCliffMat = new THREE.MeshStandardMaterial({
      color: 0x7c8a98,
      roughness: 0.82,
      metalness: 0.02,
      normalMap: norm4,
      normalScale: new THREE.Vector2(1.1, 1.1)
    });

    const rockLargeMesh = rockModels['RockLarge.001'] || rockModels['Rock4_1'] || Object.values(rockModels)[0];
    const rock41Mesh = rockModels['Rock4_1'] || rockLargeMesh;
    const rock21Mesh = rockModels['Rock2_1'] || rockLargeMesh;
    const rock22Mesh = rockModels['Rock2_2'] || rockLargeMesh;

    const cliffDefs = [
      // Northernmost boundary cap rocks (sitting directly on and past the z = -38.5 map edge)
      { mesh: rockLargeMesh, x:  8.5, y: 0.2, z: -38.0, scale: 5.4, rotY: 0.05 },
      { mesh: rockLargeMesh, x:  4.5, y: 0.2, z: -37.5, scale: 4.8, rotY: 0.45 },
      { mesh: rockLargeMesh, x: 12.5, y: 0.2, z: -37.5, scale: 4.8, rotY:-0.45 },
      { mesh: rockLargeMesh, x:  1.5, y: 0.1, z: -36.0, scale: 4.4, rotY: 0.85 },
      { mesh: rockLargeMesh, x: 15.5, y: 0.1, z: -36.0, scale: 4.4, rotY:-0.85 },

      // Midground mountain formation (connecting boundary rocks)
      { mesh: rockLargeMesh, x:  8.5, y: 0.3, z: -33.5, scale: 4.4, rotY: 0.15, rotX: -0.1 },
      { mesh: rockLargeMesh, x:  3.5, y: 0.1, z: -31.5, scale: 3.8, rotY: 0.75, rotX:  0.1 },
      { mesh: rockLargeMesh, x: 13.5, y: 0.1, z: -31.5, scale: 3.8, rotY:-0.65, rotX:  0.1 },

      // Flank buttresses
      { mesh: rock41Mesh,    x:  4.0, y: 0.0, z: -27.2, scale: 2.6, rotY: 0.4 },
      { mesh: rock41Mesh,    x: 13.0, y: 0.0, z: -27.2, scale: 2.6, rotY: 2.2 },
      { mesh: rock21Mesh,    x:  8.2, y: 1.8, z: -30.5, scale: 2.4, rotY: 1.4 },
      { mesh: rock22Mesh,    x:  8.8, y: 0.8, z: -28.0, scale: 2.5, rotY: 0.4 }
    ];

    cliffDefs.forEach((cd) => {
      const rock = cd.mesh.clone();
      rock.material = arcticCliffMat;
      rock.position.set(cd.x, cd.y, cd.z);
      rock.rotation.set(cd.rotX || 0, cd.rotY || 0, 0);
      rock.scale.setScalar(cd.scale);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.waterfallLakeGroup.add(rock);
    });
  }

  _buildDungeonChasm(rockModels, norm4) {
    const dungeonRockMat = new THREE.MeshStandardMaterial({
      color: 0x221c25,
      roughness: 0.88,
      metalness: 0.05,
      normalMap: norm4,
      normalScale: new THREE.Vector2(1.2, 1.2)
    });

    const rockLargeMesh = rockModels['RockLarge.001'] || rockModels['Rock4_1'] || Object.values(rockModels)[0];
    const rock41Mesh = rockModels['Rock4_1'] || rockLargeMesh;
    const rockSmallMesh = rockModels['Rock4_2'] || rockModels['Rock4_3'] || rockLargeMesh;

    const chasmRocks = [
      { mesh: rockLargeMesh, x:  8.5, y: -0.3, z: 35.5, scale: 4.4, rotY: 3.14 },
      { mesh: rockLargeMesh, x:  2.8, y: -0.1, z: 32.5, scale: 3.4, rotY: 2.4 },
      { mesh: rockLargeMesh, x: 14.2, y: -0.1, z: 32.5, scale: 3.4, rotY: -2.3 },
      { mesh: rock41Mesh,    x:  4.2, y: -0.2, z: 27.5, scale: 2.6, rotY: 1.2 },
      { mesh: rock41Mesh,    x: 12.8, y: -0.2, z: 27.5, scale: 2.6, rotY: 0.8 },
      { mesh: rockSmallMesh, x:  6.2, y: -0.5, z: 28.5, scale: 1.2, rotY: 0.5 },
      { mesh: rockSmallMesh, x: 10.8, y: -0.5, z: 28.5, scale: 1.2, rotY: 2.5 }
    ];

    chasmRocks.forEach((cr) => {
      const rock = cr.mesh.clone();
      rock.material = dungeonRockMat;
      rock.position.set(cr.x, cr.y, cr.z);
      rock.rotation.y = cr.rotY;
      rock.scale.setScalar(cr.scale);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.dungeonChasmGroup.add(rock);
    });

    // Plunging water curtain into the deep volcanic abyss
    const plungeGeom = new THREE.PlaneGeometry(3.6, 1.0, 16, 24);
    const pPos = plungeGeom.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      const v = pPos.getY(i) + 0.5;
      const worldZ = 27.5 + (1.0 - v) * 6.5;
      const drop = Math.pow(1.0 - v, 1.5);
      const worldY = -0.725 - drop * 5.8;
      const localX = pPos.getX(i);
      pPos.setXYZ(i, 8.5 + localX, worldY, worldZ);
    }
    plungeGeom.computeVertexNormals();

    this.chasmUniforms = {
      uTime: { value: 0 },
      uFlowSpeed: { value: 5.2 },
      uWaterColor: { value: new THREE.Color('#22657e') },
      uFoamColor: { value: new THREE.Color('#d2f4fc') }
    };

    const plungeMat = new THREE.ShaderMaterial({
      uniforms: this.chasmUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec3 p = position;
          vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFlowSpeed;
        uniform vec3 uWaterColor;
        uniform vec3 uFoamColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          float flowV = vUv.y * 6.0 + uTime * uFlowSpeed;
          float crossU = vUv.x;
          float n1 = sin(crossU * 24.0 + sin(flowV * 3.5) * 2.0);
          float n2 = sin(flowV * 5.0 + cos(crossU * 16.0) * 1.8);
          float foam = smoothstep(0.65, 0.95, n1 * n2);
          vec3 col = mix(uWaterColor, uFoamColor, foam);
          float alpha = clamp(0.85 + foam * 0.15, 0.0, 0.98);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const plungeMesh = new THREE.Mesh(plungeGeom, plungeMat);
    plungeMesh.renderOrder = 5;
    this.dungeonChasmGroup.add(plungeMesh);
  }

  async _loadAndBuildRiverbankDressing(texLoader) {
    const gltfLoader = new GLTFLoader();

    // 1. Load bush models, clovers and textures concurrently
    const [bushSmallGltf, bushGltf, clover1Gltf, clover2Gltf, leavesMap] = await Promise.all([
      gltfLoader.loadAsync('./assets/arctic/plant_bushSmall.glb'),
      gltfLoader.loadAsync('./assets/arctic/plant_bush.glb'),
      gltfLoader.loadAsync('./assets/nature/Clover_1.gltf'),
      gltfLoader.loadAsync('./assets/nature/Clover_2.gltf'),
      texLoader.loadAsync('./assets/nature/Leaves.png')
    ]);

    // Extract geometries
    const extractGeom = (gltf) => {
      let g = null;
      gltf.scene.traverse((c) => {
        if (!g && c.isMesh) g = c.geometry.clone();
      });
      return g;
    };

    const bushSmallGeom = extractGeom(bushSmallGltf);
    const bushGeom = extractGeom(bushGltf);
    const clover1Geom = extractGeom(clover1Gltf);
    const clover2Geom = extractGeom(clover2Gltf);

    leavesMap.flipY = false;
    leavesMap.colorSpace = THREE.SRGBColorSpace;
    leavesMap.needsUpdate = true;

    // Prefer texture already loaded by GLTFLoader if present
    let activeCloverMap = leavesMap;
    clover1Gltf.scene.traverse((c) => {
      if (c.isMesh && c.material && c.material.map) {
        activeCloverMap = c.material.map;
        activeCloverMap.flipY = false;
        activeCloverMap.colorSpace = THREE.SRGBColorSpace;
      }
    });

    // Wind shader foliage material
    const foliageMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });
    foliageMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.foliageUniforms);
      shader.vertexShader = `
        uniform float uTime;
        uniform float uWindSpeed;
        uniform float uWindStrength;
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float h = max(0.0, position.y);
        float swayPhase = uTime * uWindSpeed + position.x * 0.8 + position.z * 0.8;
        float sway = sin(swayPhase) * h * uWindStrength * 0.35;
        transformed.x += sway;
        transformed.z += cos(swayPhase * 0.7) * h * uWindStrength * 0.25;
        `
      );
    };

    // Wind shader clover material
    const cloverMaterial = new THREE.MeshStandardMaterial({
      map: activeCloverMap,
      alphaTest: 0.22,
      depthWrite: true,
      roughness: 0.82,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    cloverMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.foliageUniforms);
      shader.vertexShader = `
        uniform float uTime;
        uniform float uWindSpeed;
        uniform float uWindStrength;
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace(
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

    // Small rock material
    const bankSmallRockMat = new THREE.MeshStandardMaterial({
      color: 0x909d8e, // Weathered limestone pebble tone
      roughness: 0.72,
      metalness: 0.02,
      normalMap: this.rockNormalMap,
      normalScale: new THREE.Vector2(1.0, 1.0)
    });

    const smallRockMeshes = [
      this.rockModels['Rock4_2'],
      this.rockModels['Rock4_3'],
      this.rockModels['Rock4_4']
    ].filter(Boolean);

    // Distribution along both rims: East (side = -1) and West (side = +1)
    const bushSmallInstances = [];
    const bushInstances = [];
    const clover1Instances = [];
    const clover2Instances = [];

    // Deterministic pseudo-random helper
    const pseudo = (seed) => {
      const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    let pIdx = 1;
    const zStep = 0.85;

    for (let z = -41.5; z <= 41.5; z += zStep) {
      const { x: cx, dx } = getRiverCenter(z);
      const tangentLen = Math.hypot(dx, 1.0);
      const nx = -1.0 / tangentLen;
      const nz = dx / tangentLen;

      for (const side of [-1, 1]) {
        // Keep bridge crossing completely clear for player passage
        if (Math.abs(z) < 1.45) continue;

        // Bridge entrance flanks: accent framing clusters
        if (Math.abs(z) >= 1.45 && Math.abs(z) <= 2.2) {
          const r1 = pseudo(pIdx++);
          const r2 = pseudo(pIdx++);
          const flankU = side * (2.36 + r1 * 0.20);
          const fx = cx + nx * flankU;
          const fz = z + nz * flankU;

          // Flank rock
          if (smallRockMeshes.length > 0) {
            const rockMesh = smallRockMeshes[pIdx % smallRockMeshes.length].clone();
            rockMesh.material = bankSmallRockMat;
            rockMesh.position.set(fx, 0.005, fz);
            rockMesh.rotation.set(0.05, r2 * Math.PI * 2, 0.05);
            rockMesh.scale.setScalar(0.42 + r1 * 0.15);
            rockMesh.castShadow = true;
            rockMesh.receiveShadow = true;
            this.bankDressingGroup.add(rockMesh);
          }

          // Flank clover
          if (clover1Geom || clover2Geom) {
            const flankList = (pIdx % 2 === 0 && clover1Geom) ? clover1Instances : clover2Instances;
            flankList.push({
              x: fx + nx * 0.25 * side,
              y: 0.005,
              z: fz + nz * 0.25 * side,
              rotY: r1 * Math.PI * 2,
              scale: 0.52 + r1 * 0.12
            });
          }

          // Flank foliage
          if (bushGeom) {
            bushInstances.push({
              x: fx - nx * 0.20 * side,
              y: 0.005,
              z: fz - nz * 0.20 * side,
              rotX: 0,
              rotY: r2 * Math.PI * 2,
              rotZ: 0,
              scale: 1.15,
              colorIndex: pIdx % FOLIAGE_COLORS.length
            });
          }
          continue;
        }

        // Riverbank rim dressing
        const r1 = pseudo(pIdx++);
        const r2 = pseudo(pIdx++);
        const r3 = pseudo(pIdx++);
        const r4 = pseudo(pIdx++);

        // Ground Foliage bushes (approx 68% probability)
        if (r1 > 0.32) {
          const bushU = side * (2.28 + r2 * 0.36);
          const bx = cx + nx * bushU;
          const bz = z + nz * bushU;
          const bScale = 0.90 + r3 * 0.65;
          const bTilt = side * 0.12;

          const list = (r4 > 0.45 && bushSmallGeom) ? bushSmallInstances : bushInstances;
          list.push({
            x: bx,
            y: 0.005,
            z: bz,
            rotX: (r2 - 0.5) * 0.15 + bTilt * (dx / tangentLen),
            rotY: r3 * Math.PI * 2,
            rotZ: (r1 - 0.5) * 0.15 - bTilt * (1.0 / tangentLen),
            scale: bScale,
            colorIndex: pIdx % FOLIAGE_COLORS.length
          });
        }

        // Riverbank Clovers (approx 52% probability, alternating Clover_1 and Clover_2)
        if (r2 > 0.48 && (clover1Geom || clover2Geom)) {
          const cloverU = side * (2.32 + r3 * 0.32);
          const clx = cx + nx * cloverU;
          const clz = z + nz * cloverU;
          const cList = (r4 > 0.5 && clover2Geom) ? clover2Instances : clover1Instances;
          cList.push({
            x: clx,
            y: 0.005,
            z: clz,
            rotY: r4 * Math.PI * 2,
            scale: 0.45 + r1 * 0.20
          });
        }

        // Small River Rocks & Pebbles (approx 42% probability)
        if (r3 > 0.58 && smallRockMeshes.length > 0) {
          const rockU = side * (2.24 + r4 * 0.32);
          const rx = cx + nx * rockU;
          const rz = z + nz * rockU;
          const rScale = 0.20 + r1 * 0.32;
          const rY = -0.04 + r2 * 0.05;

          const rockMesh = smallRockMeshes[pIdx % smallRockMeshes.length].clone();
          rockMesh.material = bankSmallRockMat;
          rockMesh.position.set(rx, rY, rz);
          rockMesh.rotation.set((r1 - 0.5) * 0.3, r4 * Math.PI * 2, (r2 - 0.5) * 0.3);
          rockMesh.scale.setScalar(rScale);
          rockMesh.castShadow = true;
          rockMesh.receiveShadow = true;
          this.bankDressingGroup.add(rockMesh);
        }
      }
    }

    // Build InstancedMeshes
    const dummy = new THREE.Object3D();

    const buildInstancedBushes = (geom, list) => {
      if (!geom || list.length === 0) return;
      const instMesh = new THREE.InstancedMesh(geom, foliageMaterial, list.length);
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;

      list.forEach((inst, i) => {
        dummy.position.set(inst.x, inst.y, inst.z);
        dummy.rotation.set(inst.rotX, inst.rotY, inst.rotZ);
        dummy.scale.setScalar(inst.scale);
        dummy.updateMatrix();
        instMesh.setMatrixAt(i, dummy.matrix);
        instMesh.setColorAt(i, FOLIAGE_COLORS[inst.colorIndex % FOLIAGE_COLORS.length]);
      });
      instMesh.instanceMatrix.needsUpdate = true;
      if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
      this.bankDressingGroup.add(instMesh);
    };

    buildInstancedBushes(bushSmallGeom, bushSmallInstances);
    buildInstancedBushes(bushGeom, bushInstances);

    const buildInstancedClovers = (geom, list) => {
      if (!geom || list.length === 0) return;
      const cloverInstMesh = new THREE.InstancedMesh(geom, cloverMaterial, list.length);
      cloverInstMesh.castShadow = true;
      cloverInstMesh.receiveShadow = true;

      list.forEach((inst, i) => {
        dummy.position.set(inst.x, inst.y, inst.z);
        dummy.rotation.set(0, inst.rotY, 0);
        dummy.scale.setScalar(inst.scale);
        dummy.updateMatrix();
        cloverInstMesh.setMatrixAt(i, dummy.matrix);
      });
      cloverInstMesh.instanceMatrix.needsUpdate = true;
      this.bankDressingGroup.add(cloverInstMesh);
    };

    buildInstancedClovers(clover1Geom, clover1Instances);
    buildInstancedClovers(clover2Geom, clover2Instances);
  }

  _buildFloatingLeaves() {
    const leafGeom = createFloatingLeafGeometry();
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0xdeb838, // Golden/lime floating petals (as in reference image)
      roughness: 0.60,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    this.leavesInstancedMesh = new THREE.InstancedMesh(leafGeom, leafMat, this.numLeaves);
    this.leavesInstancedMesh.renderOrder = 6;

    for (let i = 0; i < this.numLeaves; i++) {
      const zProg = (i / this.numLeaves) * 82.0 - 41.0;
      const crossOff = ((i * 7) % 11 - 5.0) * 0.26;
      this.leavesData.push({
        z: zProg,
        crossOffset: crossOff,
        rotY: Math.random() * Math.PI * 2,
        rotSpeed: 0.3 + (i % 3) * 0.2,
        driftSpeed: 0.40 + (i % 4) * 0.12,
        scale: 0.75 + (i % 3) * 0.25
      });
    }

    this._updateFloatingLeaves(0);
    this.group.add(this.leavesInstancedMesh);
  }

  _buildFishSchool() {
    const fishGeom = createFishGeometry();

    this.fishUniforms = {
      uTime: { value: 0 }
    };

    const fishMaterial = new THREE.ShaderMaterial({
      uniforms: this.fishUniforms,
      vertexShader: `
        uniform float uTime;
        attribute float aPhase;
        varying vec3 vNormal;
        varying vec3 vLocalPos;

        void main() {
          vNormal = normal;
          vLocalPos = position;
          vec3 pos = position;

          // Tail fin swish
          float tailWeight = smoothstep(0.08, -0.22, pos.z);
          float wiggle = sin(uTime * 9.5 + aPhase) * 0.045 * tailWeight;
          pos.x += wiggle;

          vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vLocalPos;

        void main() {
          vec3 backColor = vec3(0.96, 0.32, 0.16);
          vec3 bellyColor = vec3(1.00, 0.88, 0.80);
          vec3 col = mix(bellyColor, backColor, smoothstep(-0.02, 0.03, vLocalPos.y));

          if (vLocalPos.z < -0.13) {
            col *= 0.88;
          }
          gl_FragColor = vec4(col, 0.95);
        }
      `,
      side: THREE.DoubleSide
    });

    this.fishInstancedMesh = new THREE.InstancedMesh(fishGeom, fishMaterial, this.numFish);
    this.fishInstancedMesh.renderOrder = 2;

    const phases = new Float32Array(this.numFish);
    for (let i = 0; i < this.numFish; i++) {
      const zProgress = (i / this.numFish) * 82.0 - 41.0;
      phases[i] = i * 1.618;

      this.fishData.push({
        z: zProgress,
        crossOffset: ((i % 4) - 1.5) * 0.55,
        speed: 1.15 + (i % 3) * 0.25,
        scale: 0.85 + (i % 4) * 0.12
      });
    }

    fishGeom.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    this.group.add(this.fishInstancedMesh);

    this._updateFish(0);
  }

  _registerCollisions() {
    if (!this.collisions) return;

    // Clear any existing river collisions first
    this.collisions.removeCirclesByTag('dojo_river');
    this.collisions.removeCirclesByTag('river_bank');
    this.collisions.removeCirclesByTag('river_waterfall');
    this.collisions.removeCirclesByTag('river_chasm');
    this.collisions.removeBoxesByTag('river_bridge');

    const gy = this.currentGy || 3;

    // Protection boxes covering the river water immediately North and South of the bridge slabs
    // Bridge stone slabs are centered at Z = 0.0 with walkable corridor z: [-0.80, +0.80].
    // North water box blocks any step north off the bridge (z <= -1.35) into the upstream channel.
    // South water box blocks any step south off the bridge (z >= 1.35) into the downstream channel.
    this.collisions.addBox(6.6, 11.6, -5.0, -1.35, 'river_bridge_water_n');
    this.collisions.addBox(6.8, 11.8,  1.35,  5.0, 'river_bridge_water_s');

    if (gy === 1) {
      // === ZONE [3, 1] ARCTIC: GLACIAL WATERFALL & LAKE ===
      let idx = 0;
      for (let z = 3.8; z <= 41.0; z += 2.0) {
        const { x } = getRiverCenter(z);
        this.collisions.addCircle(x, z, 1.95, `river_bank_s_${idx++}`);
      }
      for (let z = -18.0; z <= -3.8; z += 2.0) {
        const { x } = getRiverCenter(z);
        this.collisions.addCircle(x, z, 1.95, `river_bank_n_${idx++}`);
      }
      // Glacial Lake deep center pool (shoreline remains walkable for players)
      this.collisions.addCircle(8.5, -23.0, 3.8, 'river_waterfall_lake_center');
      // Mountain Amphitheater Back & Flank Cliffs (sealing to northern boundary)
      this.collisions.addCircle(8.5, -37.0, 5.2, 'river_waterfall_cliff_boundary');
      this.collisions.addCircle(8.5, -32.5, 4.2, 'river_waterfall_cliff_mid');
      this.collisions.addCircle(2.2, -34.5, 3.8, 'river_waterfall_cliff_west');
      this.collisions.addCircle(14.8, -34.5, 3.8, 'river_waterfall_cliff_east');
    } else if (gy === 3 || gy === 5) {
      // === ZONE [2, 3] / [3, 5] DUNGEON: TERMINAL VOLCANIC ABYSS ===
      let idx = 0;
      for (let z = -41.0; z <= -3.8; z += 2.0) {
        const { x } = getRiverCenter(z);
        this.collisions.addCircle(x, z, 1.95, `river_bank_n_${idx++}`);
      }
      for (let z = 3.8; z <= 23.0; z += 2.0) {
        const { x } = getRiverCenter(z);
        this.collisions.addCircle(x, z, 1.95, `river_bank_s_${idx++}`);
      }
      // Southern Volcanic Chasm Plunge
      this.collisions.addCircle(8.5, 27.5, 3.6, 'river_chasm_1');
      this.collisions.addCircle(8.5, 32.0, 4.0, 'river_chasm_2');
      this.collisions.addCircle(8.5, 36.0, 4.5, 'river_chasm_3');
    } else {
      // === ZONES [2, 2] (or [3, 2], [3, 3], [3, 4]) FOREST ===
      let idx = 0;
      for (let z = -41.0; z <= -3.8; z += 2.0) {
        const { x } = getRiverCenter(z);
        this.collisions.addCircle(x, z, 1.95, `river_bank_n_${idx++}`);
      }
      for (let z = 3.8; z <= 41.0; z += 2.0) {
        const { x } = getRiverCenter(z);
        this.collisions.addCircle(x, z, 1.95, `river_bank_s_${idx++}`);
      }
    }
  }

  setVisible(visible) {
    this.group.visible = visible;

    if (this.collisions) {
      this.collisions.removeCirclesByTag('dojo_river');
      this.collisions.removeCirclesByTag('river_bank');
      this.collisions.removeCirclesByTag('river_waterfall');
      this.collisions.removeCirclesByTag('river_chasm');
      this.collisions.removeBoxesByTag('river_bridge');
      if (visible) {
        this._registerCollisions();
      }
    }
  }

  setZone(zoneId, gx = 2, gy = 2) {
    this.currentZoneId = zoneId;
    this.currentGx = gx;
    this.currentGy = gy;

    const isRiverZone = (gx === 2 && gy >= 1 && gy <= 3);
    if (!isRiverZone) {
      this.setVisible(false);
      return;
    }

    // River is active
    this.group.visible = true;

    // Sub-group visibilities
    if (this.waterfallLakeGroup) {
      this.waterfallLakeGroup.visible = (gy === 1);
    }
    if (this.dungeonChasmGroup) {
      this.dungeonChasmGroup.visible = (gy === 3 || gy === 5);
    }

    // Bridges by biome
    if (this.bridgeGroups) {
      if (this.bridgeGroups.arctic) this.bridgeGroups.arctic.visible = (gy === 1);
      if (this.bridgeGroups.forest) this.bridgeGroups.forest.visible = (gy === 2 || (gy >= 2 && gy <= 4));
      if (this.bridgeGroups.dungeon) this.bridgeGroups.dungeon.visible = (gy === 3 || gy === 5);
    }

    // Update collision circles for active zone
    if (this.collisions) {
      this._registerCollisions();
    }
  }

  _updateFloatingLeaves(delta) {
    if (!this.leavesInstancedMesh) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.numLeaves; i++) {
      const leaf = this.leavesData[i];
      // Drift downstream with the water current (+Z direction)
      leaf.z += leaf.driftSpeed * delta;
      leaf.rotY += leaf.rotSpeed * delta;

      if (leaf.z > 33.0) {
        leaf.z = -33.0;
      }

      const { x: cx, dx } = getRiverCenter(leaf.z);
      const tangentLen = Math.hypot(dx, 1.0);
      const nx = -1.0 / tangentLen;
      const nz = dx / tangentLen;

      const posX = cx + nx * leaf.crossOffset;
      const posZ = leaf.z + nz * leaf.crossOffset;
      const posY = -0.718; // Sitting right on the lowered water surface

      dummy.position.set(posX, posY, posZ);
      dummy.rotation.set(0, leaf.rotY, 0);
      dummy.scale.setScalar(leaf.scale);
      dummy.updateMatrix();

      this.leavesInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.leavesInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  _updateFish(delta) {
    if (!this.fishInstancedMesh) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.numFish; i++) {
      const fish = this.fishData[i];
      fish.z -= fish.speed * delta;

      if (fish.z < -34.0) {
        fish.z = 34.0;
      }

      const { x: cx, dx } = getRiverCenter(fish.z);
      const tangentLen = Math.hypot(dx, 1.0);
      const nx = -1.0 / tangentLen;
      const nz = dx / tangentLen;

      const posX = cx + nx * fish.crossOffset;
      const posZ = fish.z + nz * fish.crossOffset;
      const posY = -0.84; // Submerged beneath the lowered water surface

      const heading = Math.atan2(-dx, -1.0);

      dummy.position.set(posX, posY, posZ);
      dummy.rotation.set(0, heading, 0);
      dummy.scale.setScalar(fish.scale);
      dummy.updateMatrix();

      this.fishInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.fishInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Flat stone crossing at ground level - character remains at Y = 0.0 with zero clipping
   * @param {number} x
   * @param {number} z
   * @returns {number} 0.0
   */
  getBridgeHeight(x, z) {
    return 0.0;
  }

  update(delta) {
    if (!this.group.visible) return;

    // 1. Advance water shader
    if (this.waterUniforms) {
      this.waterUniforms.uTime.value += delta;
    }
    if (this.foamRingsUniforms) {
      this.foamRingsUniforms.uTime.value += delta;
    }

    // 1b. Waterfall & Lake splash animation (Zone 3_1)
    if (this.waterfallUniforms && this.waterfallLakeGroup && this.waterfallLakeGroup.visible) {
      this.waterfallUniforms.uTime.value += delta;
    }

    // 1c. Volcanic chasm plunge animation (Zone 3_5)
    if (this.chasmUniforms && this.dungeonChasmGroup && this.dungeonChasmGroup.visible) {
      this.chasmUniforms.uTime.value += delta;
    }

    // 2. Animate floating leaves drifting downstream
    this._updateFloatingLeaves(delta);

    // 3. Animate fish swimming upstream
    if (this.fishUniforms) {
      this.fishUniforms.uTime.value += delta;
      this._updateFish(delta);
    }

    // 4. Animate riverbank foliage and flowers wind sway
    if (this.foliageUniforms) {
      this.foliageUniforms.uTime.value += delta;
    }
  }
}
