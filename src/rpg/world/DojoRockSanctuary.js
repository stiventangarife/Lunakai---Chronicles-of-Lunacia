// DojoRockSanctuary.js - Monumental stylized rock formations & column ruins with surface-clinging ivy in Dojo macro-zone [3, 3]
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';

// Vibrant ivy leaf colors matching clinging weed on stone column reference
const IVY_COLORS = [
  new THREE.Color('#226e2e'), // Deep shade ivy leaf
  new THREE.Color('#2d8638'), // Forest ivy mid green
  new THREE.Color('#38a644'), // Bright vibrant foliage green
  new THREE.Color('#46be50'), // Sunlit fresh leaf
  new THREE.Color('#58d054'), // Vibrant young shoot
  new THREE.Color('#78e24c')  // Tender lime leaf edge
];

// Procedural 3-lobed stylized English Ivy leaf
function createIvyLeafGeometry() {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array([
    0.00,  0.00, 0.000,
    0.00,  0.06, 0.007,
   -0.045, 0.02, 0.001,
   -0.085, 0.07, 0.002,
   -0.035, 0.10, 0.004,
    0.00,  0.15, 0.008,
    0.035, 0.10, 0.004,
    0.085, 0.07, 0.002,
    0.045, 0.02, 0.001
  ]);

  const indices = new Uint16Array([
    0, 2, 1,
    0, 1, 8,
    2, 3, 1,
    3, 4, 1,
    4, 5, 1,
    1, 5, 6,
    1, 6, 7,
    1, 7, 8
  ]);

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setIndex(new THREE.BufferAttribute(indices, 1));
  geom.computeVertexNormals();
  return geom;
}

// Procedural flat ivy cluster geometry (4 overlapping fan-shaped ivy leaves adhering to stone surface)
function createIvyClusterGeometry() {
  const baseLeaf = createIvyLeafGeometry();
  const leafPos = baseLeaf.getAttribute('position').array;
  const leafIdx = baseLeaf.getIndex().array;
  const numVerts = leafPos.length / 3;

  const transforms = [
    { x: 0.00,   y: 0.00,  rotZ: 0.0,   scale: 1.05 },
    { x: -0.065, y: -0.02, rotZ: -0.55, scale: 0.80 },
    { x: 0.065,  y: -0.01, rotZ: 0.50,  scale: 0.84 },
    { x: -0.02,  y: 0.08,  rotZ: 0.25,  scale: 0.68 }
  ];

  const totalVerts = numVerts * transforms.length;
  const positions = new Float32Array(totalVerts * 3);
  const indices = new Uint16Array(leafIdx.length * transforms.length);

  transforms.forEach((tr, tIdx) => {
    const vOffset = tIdx * numVerts;
    const iOffset = tIdx * leafIdx.length;

    const cosZ = Math.cos(tr.rotZ);
    const sinZ = Math.sin(tr.rotZ);

    for (let v = 0; v < numVerts; v++) {
      const vx = leafPos[v * 3 + 0] * tr.scale;
      const vy = leafPos[v * 3 + 1] * tr.scale;
      const vz = leafPos[v * 3 + 2] * tr.scale;

      const rx = vx * cosZ - vy * sinZ + tr.x;
      const ry = vx * sinZ + vy * cosZ + tr.y;
      const rz = vz + tIdx * 0.003;

      positions[(vOffset + v) * 3 + 0] = rx;
      positions[(vOffset + v) * 3 + 1] = ry;
      positions[(vOffset + v) * 3 + 2] = rz;
    }

    for (let i = 0; i < leafIdx.length; i++) {
      indices[iOffset + i] = vOffset + leafIdx[i];
    }
  });

  const clusterGeom = new THREE.BufferGeometry();
  clusterGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  clusterGeom.setIndex(new THREE.BufferAttribute(indices, 1));
  clusterGeom.computeVertexNormals();
  return clusterGeom;
}

// Rock formation placements in Zone [3, 3] (Dojo Sanctuary)
const DOJO_ROCK_LAYOUT = [
  // 1. Northern Monolithic Backdrop (Behind Master Paladill & Dojo Pagoda)
  {
    collection: 4, node: 'RockLarge.001',
    x: -11.5, y: -0.8, z: -25.5,
    rotX: 0.05, rotY: 0.25, rotZ: 0,
    scale: 1.25, collisionRadius: 4.5,
    hasIvy: true, ivyType: 'large_rock'
  },
  {
    collection: 1, node: 'Rock1_1',
    x: -18.5, y: -0.8, z: -15.5,
    rotX: 0, rotY: 0.4, rotZ: 0.02,
    scale: 0.75, collisionRadius: 0.85,
    hasIvy: true, ivyType: 'column'
  },
  {
    collection: 1, node: 'Rock1_2',
    x: 8.2, y: -0.8, z: -13.5,
    rotX: 0, rotY: 2.1, rotZ: -0.02,
    scale: 0.72, collisionRadius: 0.85,
    hasIvy: true, ivyType: 'column'
  },
  {
    collection: 2, node: 'Rock2_2',
    x: -5.0, y: -0.2, z: -10.5,
    rotX: 0.1, rotY: 1.2, rotZ: 0,
    scale: 1.1, collisionRadius: 1.35,
    hasIvy: true, ivyType: 'boulder'
  },
  {
    collection: 2, node: 'Rock2_1',
    x: 6.5, y: -0.2, z: -9.5,
    rotX: 0, rotY: 0.8, rotZ: 0.1,
    scale: 1.0, collisionRadius: 1.2,
    hasIvy: true, ivyType: 'boulder'
  },

  // 2. North-West Sanctuary Ruins (Shifted to South-West meadow as requested)
  {
    collection: 1, node: 'Rock1_4',
    x: -20.5, y: -0.8, z: -3.0,
    rotX: 0.03, rotY: 1.7, rotZ: 0,
    scale: 0.76, collisionRadius: 0.85,
    hasIvy: true, ivyType: 'column'
  },
  {
    collection: 3, node: 'Rock3_2',
    x: -22.2, y: -0.3, z: -4.5,
    rotX: 0, rotY: 0.6, rotZ: 0.05,
    scale: 1.2, collisionRadius: 1.1,
    hasIvy: true, ivyType: 'boulder'
  },
  {
    collection: 2, node: 'Rock2_4',
    x: -18.8, y: -0.1, z: -2.0,
    rotX: 0, rotY: 2.8, rotZ: 0,
    scale: 1.15, collisionRadius: 1.0,
    hasIvy: true, ivyType: 'boulder'
  },

  // 3. North-East Sentinel Columns (Guarding path toward chimera hunting grounds)
  {
    collection: 1, node: 'Rock1_3',
    x: 13.0, y: -0.8, z: -7.0,
    rotX: -0.02, rotY: 0.9, rotZ: 0.03,
    scale: 0.74, collisionRadius: 0.85,
    hasIvy: true, ivyType: 'column'
  },
  {
    collection: 3, node: 'Rock3_1',
    x: 14.8, y: -0.2, z: -8.5,
    rotX: 0.05, rotY: 2.3, rotZ: 0,
    scale: 1.25, collisionRadius: 1.1,
    hasIvy: true, ivyType: 'boulder'
  },
  {
    collection: 2, node: 'Rock2_3',
    x: 11.2, y: -0.1, z: -5.8,
    rotX: 0, rotY: 1.5, rotZ: 0,
    scale: 1.2, collisionRadius: 0.95,
    hasIvy: true, ivyType: 'boulder'
  },

  // 4. South-West Shrine Outcrop
  {
    collection: 1, node: 'Rock1_1',
    x: -11.5, y: -0.8, z: 8.5,
    rotX: 0.02, rotY: 3.1, rotZ: 0,
    scale: 0.70, collisionRadius: 0.85,
    hasIvy: true, ivyType: 'column'
  },
  {
    collection: 2, node: 'Rock2_2',
    x: -13.0, y: -0.2, z: 10.0,
    rotX: 0.05, rotY: 0.4, rotZ: 0,
    scale: 1.05, collisionRadius: 1.3,
    hasIvy: true, ivyType: 'boulder'
  },
  {
    collection: 4, node: 'Rock4_1',
    x: -9.8, y: -0.1, z: 7.2,
    rotX: 0, rotY: 1.9, rotZ: 0,
    scale: 1.3, collisionRadius: 0.9,
    hasIvy: false
  },

  // 5. South-East Training Megalith
  {
    collection: 1, node: 'Rock1_2',
    x: 12.0, y: -0.8, z: 9.0,
    rotX: -0.03, rotY: 1.3, rotZ: 0,
    scale: 0.72, collisionRadius: 0.85,
    hasIvy: true, ivyType: 'column'
  },
  {
    collection: 3, node: 'Rock3_3',
    x: 13.6, y: -0.3, z: 10.5,
    rotX: 0, rotY: 2.7, rotZ: 0,
    scale: 1.2, collisionRadius: 1.1,
    hasIvy: true, ivyType: 'boulder'
  },
  {
    collection: 2, node: 'Rock2_1',
    x: 10.2, y: -0.1, z: 7.8,
    rotX: 0, rotY: 0.2, rotZ: 0,
    scale: 1.1, collisionRadius: 1.0,
    hasIvy: false
  },

  // 6. North-East Meadow Monolith (Large Rock with Surface Clinging Ivy)
  {
    collection: 4, node: 'RockLarge.001',
    x: 25.5, y: -0.6, z: -21.5,
    rotX: 0.04, rotY: 1.8, rotZ: 0.02,
    scale: 1.25, collisionRadius: 3.8,
    hasIvy: true, ivyType: 'large_rock'
  },

  // 7. South-East Meadow Monolith (Large Rock with Surface Clinging Ivy at 31.5, 32.2)
  {
    collection: 4, node: 'RockLarge.001',
    x: 31.5, y: -0.6, z: 32.2,
    rotX: 0.03, rotY: 2.4, rotZ: -0.02,
    scale: 1.25, collisionRadius: 3.8,
    hasIvy: true, ivyType: 'large_rock'
  }
];

export const ROCK_LAYOUT_BY_ZONE = {
  '2_2': DOJO_ROCK_LAYOUT,
  '2_3': [
    // 1. NE Monolith in Zone [2, 3] at [29.9, -28.0]
    {
      collection: 4, node: 'RockLarge.001',
      x: 29.9, y: -0.6, z: -28.0,
      rotX: 0.04, rotY: 1.5, rotZ: 0.02,
      scale: 1.25, collisionRadius: 3.8,
      hasIvy: true, ivyType: 'large_rock'
    },
    // 2. NW Monolith in Zone [2, 3] at [-17.0, -30.7]
    {
      collection: 4, node: 'RockLarge.001',
      x: -17.0, y: -0.6, z: -30.7,
      rotX: 0.03, rotY: 2.8, rotZ: -0.02,
      scale: 1.25, collisionRadius: 3.8,
      hasIvy: true, ivyType: 'large_rock'
    }
  ],
  '1_2': [
    // 1. NE Monolith in Zone [1, 2] at [29.9, -28.0]
    {
      collection: 4, node: 'RockLarge.001',
      x: 29.9, y: -0.6, z: -28.0,
      rotX: 0.04, rotY: 1.5, rotZ: 0.02,
      scale: 1.25, collisionRadius: 3.8,
      hasIvy: true, ivyType: 'large_rock'
    },
    // 2. NW Monolith in Zone [1, 2] at [-17.0, -30.7]
    {
      collection: 4, node: 'RockLarge.001',
      x: -17.0, y: -0.6, z: -30.7,
      rotX: 0.03, rotY: 2.8, rotZ: -0.02,
      scale: 1.25, collisionRadius: 3.8,
      hasIvy: true, ivyType: 'large_rock'
    }
  ]
};

export class DojoRockSanctuary {
  constructor(scene, collisions) {
    this.scene = scene;
    this.collisions = collisions;
    this.group = new THREE.Group();
    this.group.name = 'dojo_rock_sanctuary';
    this.group.visible = false;
    this.scene.add(this.group);

    this.models = {};
    this.materials = {};
    this.zoneGroups = {};
    this.registeredCollisions = {};
    this.currentZoneKey = '2_2';
    this.uniforms = {
      uTime: { value: 0 },
      uWindSpeed: { value: 2.0 },
      uWindStrength: { value: 0.15 }
    };
    this.isLoaded = false;
  }

  async init() {
    console.log('[DojoRockSanctuary] Loading stylized rock collections and normal maps...');
    const gltfLoader = new GLTFLoader();
    const texLoader = new THREE.TextureLoader();

    // Load Normal Maps
    const [norm1, norm2, norm3, norm4] = await Promise.all([
      texLoader.loadAsync('./assets/rocks/Textures/RockCollection1NormalMap.png'),
      texLoader.loadAsync('./assets/rocks/Textures/RockCollection2NormalMap.png'),
      texLoader.loadAsync('./assets/rocks/Textures/RockCollection3NormalMap.png'),
      texLoader.loadAsync('./assets/rocks/Textures/RockCollection4NormalMap.png')
    ]);

    // Setup stylized ancient shrine limestone materials
    const baseRockColor = 0x98a79a;
    this.materials = {
      1: new THREE.MeshStandardMaterial({
        color: baseRockColor,
        roughness: 0.82,
        metalness: 0.0,
        normalMap: norm1,
        normalScale: new THREE.Vector2(1.0, 1.0)
      }),
      2: new THREE.MeshStandardMaterial({
        color: baseRockColor,
        roughness: 0.82,
        metalness: 0.0,
        normalMap: norm2,
        normalScale: new THREE.Vector2(1.0, 1.0)
      }),
      3: new THREE.MeshStandardMaterial({
        color: baseRockColor,
        roughness: 0.82,
        metalness: 0.0,
        normalMap: norm3,
        normalScale: new THREE.Vector2(1.0, 1.0)
      }),
      4: new THREE.MeshStandardMaterial({
        color: baseRockColor,
        roughness: 0.82,
        metalness: 0.0,
        normalMap: norm4,
        normalScale: new THREE.Vector2(1.0, 1.0)
      })
    };

    // Load 4 Rock GLB collections
    const [col1Gltf, col2Gltf, col3Gltf, col4Gltf] = await Promise.all([
      gltfLoader.loadAsync('./assets/rocks/StylisedRockCollection1.glb'),
      gltfLoader.loadAsync('./assets/rocks/StylisedRockCollection2.glb'),
      gltfLoader.loadAsync('./assets/rocks/StylisedRockCollection3.glb'),
      gltfLoader.loadAsync('./assets/rocks/StylisedRockCollection4.glb')
    ]);

    const collections = { 1: col1Gltf, 2: col2Gltf, 3: col3Gltf, 4: col4Gltf };

    // Index all individual rock meshes by node name
    Object.entries(collections).forEach(([colId, gltf]) => {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          const nodeName = child.name;
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = this.materials[colId];
          this.models[`col${colId}_${nodeName}`] = child;
        }
      });
    });

    // Build the rock sanctuary formations for all registered zones
    this._buildRocks();

    this.isLoaded = true;
    console.log('[DojoRockSanctuary] Sanctuary rocks and clinging ivy built successfully.');
  }

  _buildRocks() {
    const raycaster = new THREE.Raycaster();
    const clusterGeometry = createIvyClusterGeometry();
    const singleLeafGeometry = createIvyLeafGeometry();

    const ivyMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    ivyMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

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
        float phase = uTime * uWindSpeed + position.x * 2.0 + position.y * 1.5 + position.z * 2.0;
        float flutter = sin(phase) * (position.y > 0.04 ? 0.007 : 0.0) * uWindStrength;
        transformed += normal * flutter;
        `
      );
    };

    Object.entries(ROCK_LAYOUT_BY_ZONE).forEach(([zoneKey, layout]) => {
      const zg = new THREE.Group();
      zg.name = `rock_sanctuary_${zoneKey}`;
      zg.visible = (zoneKey === '2_2');
      this.group.add(zg);
      this.zoneGroups[zoneKey] = zg;

      const placedObjects = [];
      const colList = [];

      layout.forEach((def, idx) => {
        const key = `col${def.collection}_${def.node}`;
        const originalMesh = this.models[key];
        if (!originalMesh) {
          console.warn(`[DojoRockSanctuary] Mesh not found for ${key}`);
          return;
        }

        const rockMesh = originalMesh.clone();
        rockMesh.position.set(def.x, def.y, def.z);
        rockMesh.rotation.set(def.rotX || 0, def.rotY || 0, def.rotZ || 0);
        rockMesh.scale.setScalar(def.scale);
        rockMesh.updateMatrixWorld(true);

        zg.add(rockMesh);
        placedObjects.push({ def, mesh: rockMesh });

        if (def.node === 'RockLarge.001') {
          const s = def.scale || 1.25;
          const rotY = def.rotY || 0;
          const offsetDist = 3.6 * (s / 1.25);
          const sinY = Math.sin(rotY);
          const cosY = Math.cos(rotY);

          // Center circle
          colList.push({
            x: def.x,
            z: def.z,
            radius: 4.8 * (s / 1.25),
            tag: `dojo_rock_${zoneKey}_${idx}_center`
          });
          // Front offset circle
          colList.push({
            x: def.x + sinY * offsetDist,
            z: def.z + cosY * offsetDist,
            radius: 4.4 * (s / 1.25),
            tag: `dojo_rock_${zoneKey}_${idx}_fwd`
          });
          // Back offset circle
          colList.push({
            x: def.x - sinY * offsetDist,
            z: def.z - cosY * offsetDist,
            radius: 4.4 * (s / 1.25),
            tag: `dojo_rock_${zoneKey}_${idx}_bwd`
          });
        } else if (def.collisionRadius) {
          colList.push({
            x: def.x,
            z: def.z,
            radius: def.collisionRadius * 1.15,
            tag: `dojo_rock_${zoneKey}_${idx}`
          });
        }
      });

      zg.updateMatrixWorld(true);
      this.registeredCollisions[zoneKey] = colList;

      // Build surface ivy for this zone
      this._buildIvyForZoneGroup(zg, placedObjects, raycaster, clusterGeometry, singleLeafGeometry, ivyMaterial);
    });
  }

  _buildIvyForZoneGroup(zg, placedRockObjects, raycaster, clusterGeometry, singleLeafGeometry, ivyMaterial) {
    const clusterInstances = [];
    const singleInstances = [];
    const stemGeometries = [];
    let colorCursor = 0;

    // Process each rock that has ivy requested
    placedRockObjects.forEach(({ def, mesh }) => {
      if (!def.hasIvy) return;

      mesh.updateMatrixWorld(true);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);

      if (def.ivyType === 'column') {
        const colTopY = def.y + 4.3 * def.scale;
        const colRadius = 1.0 * def.scale;

        // 1. DENSE TOP CAP: Lush blanket of ivy covering column crest
        const capRays = 32;
        for (let i = 0; i < capRays; i++) {
          const r = Math.pow(Math.random(), 0.75) * (colRadius * 0.95);
          const theta = Math.random() * Math.PI * 2;
          const rx = def.x + Math.cos(theta) * r;
          const rz = def.z + Math.sin(theta) * r;

          raycaster.set(new THREE.Vector3(rx, colTopY + 3.0, rz), new THREE.Vector3(0, -1, 0));
          const hits = raycaster.intersectObject(mesh, false);

          if (hits.length > 0 && hits[0].point.y > def.y + 2.0 * def.scale) {
            const hit = hits[0];
            const worldNorm = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
            const leafScale = (0.95 + Math.random() * 0.45) * def.scale * 1.35;
            const mat = this._createOrientedMatrix(hit.point, worldNorm, leafScale);

            clusterInstances.push({ matrix: mat, colorIndex: colorCursor++ });
          }
        }

        // 2. ABUNDANT CASCADES: 5 to 6 trails descending down the column faces
        const numTrails = 5;
        const trailBaseAngles = [0.2, 1.4, 2.7, 3.9, 5.1];

        trailBaseAngles.forEach((baseAngle) => {
          const curvePts = [];
          const hangDist = (2.2 + Math.random() * 1.6) * def.scale; // Falls 2.2 to 3.8m down the column
          const steps = 18;

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const targetY = colTopY - t * hangDist;
            const meander = baseAngle + Math.sin(t * Math.PI * 2.2) * 0.28;

            // Cast horizontal ray from outside directly toward column axis
            const rayDist = colRadius * 2.5;
            const originX = def.x + Math.cos(meander) * rayDist;
            const originZ = def.z + Math.sin(meander) * rayDist;

            const rayOrigin = new THREE.Vector3(originX, targetY, originZ);
            const rayDir = new THREE.Vector3(def.x - originX, 0, def.z - originZ).normalize();

            raycaster.set(rayOrigin, rayDir);
            const hits = raycaster.intersectObject(mesh, false);

            if (hits.length > 0) {
              const hit = hits[0];
              const worldNorm = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

              // Only place if on column body above ground level
              if (hit.point.y > 0.25) {
                curvePts.push(hit.point.clone().addScaledVector(worldNorm, 0.018));

                const taper = 1.0 - t * 0.35;
                const leafScale = (1.0 + Math.sin(t * 7.0) * 0.2 + (Math.random() - 0.5) * 0.2) * taper * def.scale * 1.3;

                // Place lush cluster along cascade
                if (s % 2 === 0 || t < 0.30) {
                  const mat = this._createOrientedMatrix(
                    hit.point,
                    worldNorm,
                    leafScale,
                    (Math.random() - 0.5) * 0.3,
                    t > 0.85 ? 0.35 : 0.12
                  );
                  clusterInstances.push({ matrix: mat, colorIndex: colorCursor++ });
                }

                // Dense creeping satellite leaves hugging the stone beside the trail
                if (s > 1 && s < steps && Math.random() < 0.85) {
                  const sideAngle = meander + ((s % 2 === 0 ? 1 : -1) * 0.28);
                  const sideOriginX = def.x + Math.cos(sideAngle) * rayDist;
                  const sideOriginZ = def.z + Math.sin(sideAngle) * rayDist;
                  const sideY = targetY + (Math.random() - 0.5) * 0.12;

                  raycaster.set(
                    new THREE.Vector3(sideOriginX, sideY, sideOriginZ),
                    new THREE.Vector3(def.x - sideOriginX, 0, def.z - sideOriginZ).normalize()
                  );
                  const sideHits = raycaster.intersectObject(mesh, false);

                  if (sideHits.length > 0 && sideHits[0].point.y > 0.25) {
                    const sideHit = sideHits[0];
                    const sideNorm = sideHit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
                    const sScale = leafScale * 0.85;

                    const singleMat = this._createOrientedMatrix(
                      sideHit.point,
                      sideNorm,
                      sScale,
                      (Math.random() - 0.5) * 0.4,
                      0.08
                    );
                    singleInstances.push({ matrix: singleMat, colorIndex: colorCursor++ });
                  }
                }
              }
            }
          }

          // Build continuous 3D tendril tube adhering perfectly to rock surface
          if (curvePts.length >= 3) {
            const curve = new THREE.CatmullRomCurve3(curvePts);
            const tube = new THREE.TubeGeometry(curve, 28, 0.016 * def.scale, 5, false);
            stemGeometries.push(tube);
          }
        });
      } else if (def.ivyType === 'large_rock') {
        // MONUMENTAL ROCK: Exact surface raycasting (100% physically attached, zero floating)
        const gridStepsX = 14;
        const gridStepsZ = 12;
        const spanX = 8.0 * def.scale;
        const spanZ = 6.0 * def.scale;

        for (let ix = 0; ix <= gridStepsX; ix++) {
          for (let iz = 0; iz <= gridStepsZ; iz++) {
            const rx = def.x + ((ix / gridStepsX) - 0.5) * spanX + (Math.random() - 0.5) * 0.3;
            const rz = def.z + ((iz / gridStepsZ) - 0.5) * spanZ + (Math.random() - 0.5) * 0.3;

            raycaster.set(new THREE.Vector3(rx, 15.0, rz), new THREE.Vector3(0, -1, 0));
            const hits = raycaster.intersectObject(mesh, false);

            // ONLY place ivy where the ray physically struck the rock surface above ground!
            if (hits.length > 0 && hits[0].point.y > 0.6) {
              const hit = hits[0];
              const worldNorm = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

              // Clusters on crest and shelves
              if (Math.random() < 0.45) {
                const scale = (1.1 + Math.random() * 0.5) * def.scale;
                const mat = this._createOrientedMatrix(hit.point, worldNorm, scale);
                clusterInstances.push({ matrix: mat, colorIndex: colorCursor++ });
              } else if (Math.random() < 0.55) {
                // Single creeping leaves
                const scale = (0.85 + Math.random() * 0.4) * def.scale;
                const mat = this._createOrientedMatrix(hit.point, worldNorm, scale);
                singleInstances.push({ matrix: mat, colorIndex: colorCursor++ });
              }
            }
          }
        }
      } else if (def.ivyType === 'boulder') {
        // MEDIUM BOULDERS & MENHIRS: Ivy on crests and crevasses
        const numSamples = 16;
        const bRadius = (def.collisionRadius || 1.2) * 0.85;

        for (let i = 0; i < numSamples; i++) {
          const r = Math.pow(Math.random(), 0.8) * bRadius;
          const theta = Math.random() * Math.PI * 2;
          const rx = def.x + Math.cos(theta) * r;
          const rz = def.z + Math.sin(theta) * r;

          raycaster.set(new THREE.Vector3(rx, 10.0, rz), new THREE.Vector3(0, -1, 0));
          const hits = raycaster.intersectObject(mesh, false);

          if (hits.length > 0 && hits[0].point.y > 0.35) {
            const hit = hits[0];
            const worldNorm = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
            const leafScale = (0.95 + Math.random() * 0.4) * def.scale * 1.1;
            const mat = this._createOrientedMatrix(hit.point, worldNorm, leafScale);

            if (Math.random() < 0.65) {
              clusterInstances.push({ matrix: mat, colorIndex: colorCursor++ });
            } else {
              singleInstances.push({ matrix: mat, colorIndex: colorCursor++ });
            }
          }
        }
      }
    });

    // Vine tendril stems
    if (stemGeometries.length > 0) {
      const stemMaterial = new THREE.MeshStandardMaterial({
        color: 0x245428,
        roughness: 0.88,
        metalness: 0.02
      });
      stemGeometries.forEach((geom) => {
        const stemMesh = new THREE.Mesh(geom, stemMaterial);
        stemMesh.castShadow = true;
        stemMesh.receiveShadow = true;
        zg.add(stemMesh);
      });
    }

    // Ivy Clusters Instanced Mesh
    if (clusterInstances.length > 0) {
      const clusterMesh = new THREE.InstancedMesh(clusterGeometry, ivyMaterial, clusterInstances.length);
      clusterMesh.castShadow = true;
      clusterMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      clusterInstances.forEach((inst, i) => {
        dummy.matrix.copy(inst.matrix);
        clusterMesh.setMatrixAt(i, dummy.matrix);

        const col = IVY_COLORS[inst.colorIndex % IVY_COLORS.length].clone();
        col.offsetHSL(0, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.06);
        clusterMesh.setColorAt(i, col);
      });

      clusterMesh.instanceMatrix.needsUpdate = true;
      if (clusterMesh.instanceColor) clusterMesh.instanceColor.needsUpdate = true;
      zg.add(clusterMesh);
    }

    // Single Creeping Leaves Instanced Mesh
    if (singleInstances.length > 0) {
      const singleMesh = new THREE.InstancedMesh(singleLeafGeometry, ivyMaterial, singleInstances.length);
      singleMesh.castShadow = true;
      singleMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      singleInstances.forEach((inst, i) => {
        dummy.matrix.copy(inst.matrix);
        singleMesh.setMatrixAt(i, dummy.matrix);

        const col = IVY_COLORS[inst.colorIndex % IVY_COLORS.length].clone();
        col.offsetHSL(0, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.06);
        singleMesh.setColorAt(i, col);
      });

      singleMesh.instanceMatrix.needsUpdate = true;
      if (singleMesh.instanceColor) singleMesh.instanceColor.needsUpdate = true;
      zg.add(singleMesh);
    }
  }

  // Mathematically aligns ivy flat against surface with precision normal offset
  _createOrientedMatrix(pos, normal, scale, tiltAngle = 0, flareAngle = 0.10) {
    const matrix = new THREE.Matrix4();
    const N = normal.clone().normalize();

    let T, V;
    if (Math.abs(N.y) > 0.85) {
      // Horizontal crest surface
      T = new THREE.Vector3(1, 0, 0);
      if (Math.abs(N.x) > 0.85) T = new THREE.Vector3(0, 0, 1);
      V = new THREE.Vector3().crossVectors(N, T).normalize();
      T.crossVectors(V, N).normalize();

      const spin = Math.random() * Math.PI * 2;
      T.applyAxisAngle(N, spin);
      V.applyAxisAngle(N, spin);
    } else {
      // Vertical stone wall surface
      T = new THREE.Vector3(-N.z, 0, N.x).normalize();
      V = new THREE.Vector3().crossVectors(T, N).normalize();

      if (tiltAngle !== 0) {
        T.applyAxisAngle(N, tiltAngle);
        V.applyAxisAngle(N, tiltAngle);
      }
    }

    // Slight outward flare for natural leaf tip depth
    const flaredN = N.clone().addScaledVector(V, -flareAngle).normalize();

    matrix.makeBasis(
      T.multiplyScalar(scale),
      V.multiplyScalar(scale),
      flaredN.multiplyScalar(scale)
    );

    // Place 2.2 cm above stone face to completely eliminate z-fighting
    const finalPos = pos.clone().addScaledVector(N, 0.022);
    matrix.setPosition(finalPos);

    return matrix;
  }

  setZone(gx, gy, colMgr) {
    const zoneKey = `${gx}_${gy}`;
    this.currentZoneKey = zoneKey;
    const hasGroup = !!this.zoneGroups[zoneKey];
    this.group.visible = hasGroup;

    Object.entries(this.zoneGroups).forEach(([zk, zg]) => {
      zg.visible = (zk === zoneKey);
    });

    const cm = colMgr || this.collisions;
    if (cm && typeof cm.removeCirclesByTag === 'function') {
      cm.removeCirclesByTag('dojo_rock');
      if (hasGroup && this.registeredCollisions[zoneKey]) {
        this.registeredCollisions[zoneKey].forEach((c) => {
          cm.addCircle(c.x, c.z, c.radius, c.tag);
        });
      }
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
    const zoneKey = this.currentZoneKey || '2_2';
    if (this.zoneGroups[zoneKey]) {
      this.zoneGroups[zoneKey].visible = visible;
    }
    const cm = this.collisions;
    if (cm && typeof cm.removeCirclesByTag === 'function') {
      cm.removeCirclesByTag('dojo_rock');
      if (visible && this.registeredCollisions[zoneKey]) {
        this.registeredCollisions[zoneKey].forEach((c) => {
          cm.addCircle(c.x, c.z, c.radius, c.tag);
        });
      }
    }
  }

  update(delta) {
    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }
}
