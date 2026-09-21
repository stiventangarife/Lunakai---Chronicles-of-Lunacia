// StylizedTreeVines.js - Creeping ivy & clinging vine foliage clinging down tree trunks (column ivy style)
import * as THREE from 'three';
import { TREE_LAYOUT } from './StylizedTrees.js';

// Vibrant ivy colors matching lush weed / climbing ivy on stone columns
const VINE_LEAF_COLORS = [
  new THREE.Color('#226e2e'), // Deep shade ivy leaf
  new THREE.Color('#2d8638'), // Forest ivy mid green
  new THREE.Color('#38a644'), // Bright vibrant foliage green
  new THREE.Color('#46be50'), // Sunlit fresh leaf
  new THREE.Color('#58d054'), // Vibrant young shoot
  new THREE.Color('#78e24c')  // Tender lime leaf edge
];

// Returns approximate trunk radius at height y (in meters, trunk base at y=0)
function getTrunkRadiusAt(y) {
  if (y < 1.2) {
    // Widens near root base
    return 0.95 + (1.2 - y) * 0.35;
  } else if (y < 3.8) {
    // Main vertical trunk column
    return 0.80 + (3.8 - y) * 0.04;
  } else {
    // Upper trunk spreading into primary branch forks
    return 0.85 + (y - 3.8) * 0.38;
  }
}

// Procedural 3-lobed stylized English Ivy leaf
function createIvyLeafGeometry() {
  const geom = new THREE.BufferGeometry();
  // 9 vertices forming stylized 3-lobed leaf with subtle central fold
  const positions = new Float32Array([
    0.00,  0.00, 0.000, // 0: stem point
    0.00,  0.06, 0.007, // 1: center vein
   -0.045, 0.02, 0.001, // 2: left base lobe
   -0.085, 0.07, 0.002, // 3: left outer tip
   -0.035, 0.10, 0.004, // 4: left notch
    0.00,  0.15, 0.008, // 5: central main tip
    0.035, 0.10, 0.004, // 6: right notch
    0.085, 0.07, 0.002, // 7: right outer tip
    0.045, 0.02, 0.001  // 8: right base lobe
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

// Procedural flat ivy cluster geometry (4 overlapping fan-shaped ivy leaves adhering to bark)
function createIvyClusterGeometry() {
  const baseLeaf = createIvyLeafGeometry();
  const leafPos = baseLeaf.getAttribute('position').array;
  const leafIdx = baseLeaf.getIndex().array;
  const numVerts = leafPos.length / 3; // 9

  const transforms = [
    { x: 0.00,  y: 0.00, rotZ: 0.0,   scale: 1.05 },  // Main center leaf
    { x: -0.065, y: -0.02, rotZ: -0.55, scale: 0.80 }, // Left flanking leaf
    { x: 0.065,  y: -0.01, rotZ: 0.50,  scale: 0.84 },  // Right flanking leaf
    { x: -0.02,  y: 0.08,  rotZ: 0.25,  scale: 0.68 }   // Upper forward shoot
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
      const rz = vz + tIdx * 0.003; // slight offset to prevent z-fighting

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

// Vine trail definitions per tree (clinging to cylinder surface of trunk)
const TREE_VINE_PATHS = [
  // Primary prominent trail visible from exploration camera
  { startAngle: 0.5,  yTop: 5.4, yBottom: 0.9, freq: 1.5, amp: 0.32, steps: 18, clusterFreq: 2 },
  // Side cascading trail with loop / branch
  { startAngle: 1.8,  yTop: 5.0, yBottom: 1.6, freq: 1.8, amp: 0.26, steps: 14, clusterFreq: 2 },
  // Back/side lush trail
  { startAngle: 3.3,  yTop: 5.5, yBottom: 0.7, freq: 1.4, amp: 0.35, steps: 19, clusterFreq: 2 },
  // Shorter dangling trail
  { startAngle: 4.9,  yTop: 4.8, yBottom: 2.2, freq: 1.6, amp: 0.22, steps: 12, clusterFreq: 2 }
];

export class StylizedTreeVines {
  constructor(config = {}) {
    this.config = {
      windStrength: 0.16,
      windSpeed: 2.0,
      ...config
    };

    this.group = new THREE.Group();
    this.group.name = 'stylized_tree_vines';
    this.clusterInstancedMesh = null;
    this.singleLeafInstancedMesh = null;
    this.uniforms = null;
    this.visible = true;
  }

  
  setZone(gx, gy) {
    this.currentGx = gx || 3;
    this.currentGy = gy || 3;
    // Defer vine rebuild to next event loop tick so zone transition doesn't block the main thread
    setTimeout(() => this._buildVines(), 0);
  }

  async load() {
    this.currentGx = 3;
    this.currentGy = 3;
    this._buildVines();
    return this.group;
  }

  
  _buildVines() {
    this.group.clear();
    let seed = (this.currentGx || 3) * 821 + (this.currentGy || 3) * 128 + 92;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    this.group.clear();

    const clusterGeometry = createIvyClusterGeometry();
    const singleLeafGeometry = createIvyLeafGeometry();

    const { clusterInstances, singleInstances, stemGeometries } = this._generateVineData();
    console.log(`[StylizedTreeVines] Built ${clusterInstances.length} ivy clusters, ${singleInstances.length} single creeping leaves, ${stemGeometries.length} vine stems.`);

    // 1. Vine Stems (thin creeping tendrils adhering smoothly to tree bark)
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
        this.group.add(stemMesh);
      });
    }

    // 2. Clinging Ivy Material (waxy leaf finish, double-sided, subtle breeze sway)
    this.uniforms = {
      uTime: { value: 0 },
      uWindSpeed: { value: this.config.windSpeed },
      uWindStrength: { value: this.config.windStrength }
    };

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
        // Very subtle micro-flutter for leaf edges adhering to bark
        float phase = uTime * uWindSpeed + position.x * 2.0 + position.y * 1.5 + position.z * 2.0;
        float flutter = sin(phase) * (position.y > 0.05 ? 0.008 : 0.0) * uWindStrength;
        transformed += normal * flutter;
        `
      );
    };

    // 3. Cluster Instanced Mesh
    if (clusterInstances.length > 0) {
      const clusterMesh = new THREE.InstancedMesh(clusterGeometry, ivyMaterial, clusterInstances.length);
      clusterMesh.castShadow = true;
      clusterMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      clusterInstances.forEach((inst, i) => {
        dummy.matrix.copy(inst.matrix);
        clusterMesh.setMatrixAt(i, dummy.matrix);

        const color = VINE_LEAF_COLORS[inst.colorIndex % VINE_LEAF_COLORS.length].clone();
        color.offsetHSL(0, (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.06);
        clusterMesh.setColorAt(i, color);
      });

      clusterMesh.instanceMatrix.needsUpdate = true;
      if (clusterMesh.instanceColor) clusterMesh.instanceColor.needsUpdate = true;
      this.clusterInstancedMesh = clusterMesh;
      this.group.add(clusterMesh);
    }

    // 4. Single Leaf Instanced Mesh (for scattered creeping leaves on bark)
    if (singleInstances.length > 0) {
      const singleMesh = new THREE.InstancedMesh(singleLeafGeometry, ivyMaterial, singleInstances.length);
      singleMesh.castShadow = true;
      singleMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      singleInstances.forEach((inst, i) => {
        dummy.matrix.copy(inst.matrix);
        singleMesh.setMatrixAt(i, dummy.matrix);

        const color = VINE_LEAF_COLORS[inst.colorIndex % VINE_LEAF_COLORS.length].clone();
        color.offsetHSL(0, (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.06);
        singleMesh.setColorAt(i, color);
      });

      singleMesh.instanceMatrix.needsUpdate = true;
      if (singleMesh.instanceColor) singleMesh.instanceColor.needsUpdate = true;
      this.singleLeafInstancedMesh = singleMesh;
      this.group.add(singleMesh);
    }

    return this.group;
  }

  
  _generateVineData() {
    let seed = (this.currentGx || 3) * 314 + (this.currentGy || 3) * 159 + 265;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const clusterInstances = [];
    const singleInstances = [];
    const stemGeometries = [];
    let colorCursor = 0;

    // Limit vine paths per tree when there are many trees to prevent main-thread freeze
    const maxVinesPerTree = TREE_LAYOUT.length > 8 ? 2 : TREE_VINE_PATHS.length;

    TREE_LAYOUT.forEach((treeDef) => {
      const [tx, ty, tz] = treeDef.position;
      const rotY = treeDef.rotationY;
      const tScale = treeDef.scale || 1.0;
      const cosT = Math.cos(rotY);
      const sinT = Math.sin(rotY);

      TREE_VINE_PATHS.slice(0, maxVinesPerTree).forEach((vDef) => {
        const curvePoints = [];
        const yRange = vDef.yTop - vDef.yBottom;
        const steps = vDef.steps;

        for (let s = 0; s <= steps; s++) {
          const tNorm = s / steps; // 0 at top, 1 at bottom
          const y = vDef.yTop - tNorm * yRange;
          const trunkR = getTrunkRadiusAt(y);

          // Meandering curve along trunk cylinder
          const angle = vDef.startAngle + Math.sin(tNorm * Math.PI * vDef.freq) * vDef.amp;
          const offsetR = trunkR + 0.025; // Closely hugging bark surface (2.5cm)

          // Local position on cylinder
          const lx = Math.cos(angle) * offsetR;
          const lz = Math.sin(angle) * offsetR;
          const ly = y;

          // Tree world position
          const wx = tx + (lx * cosT + lz * sinT) * tScale;
          const wy = ty + ly * tScale;
          const wz = tz + (-lx * sinT + lz * cosT) * tScale;

          curvePoints.push(new THREE.Vector3(wx, wy, wz));

          // Tangent space basis for clinging flat to trunk surface:
          // N = outward normal from trunk cylinder
          // T = horizontal tangent around cylinder
          // V = vertical vector along trunk
          const normAngle = angle + rotY;
          const Nx = Math.cos(normAngle);
          const Nz = Math.sin(normAngle);
          const Tx = -Math.sin(normAngle);
          const Tz = Math.cos(normAngle);

          // Leaf cluster sizing: lush and full near top, tapering toward lower hanging tip
          const taper = 1.0 - tNorm * 0.35;
          const clusterScale = (1.5 + Math.sin(tNorm * 6.0) * 0.3 + (rand() - 0.5) * 0.2) * taper * tScale;

          // Place Ivy Clusters along the vine trail
          if (s % vDef.clusterFreq === 0 || tNorm < 0.25) {
            const mat = this._createClingingMatrix(
              wx, wy, wz,
              Tx, Tz,
              Nx, Nz,
              clusterScale,
              (rand() - 0.5) * 0.25, // Slight natural tilt
              tNorm > 0.85 ? 0.35 : 0.12     // Lower tips flare slightly away from bark
            );

            clusterInstances.push({
              matrix: mat,
              colorIndex: colorCursor++
            });

            // In the lush top fork, add extra overlapping clusters to create weed patch
            if (tNorm < 0.20) {
              const forkOffset = (rand() - 0.5) * 0.22;
              const fAngle = normAngle + forkOffset;
              const fx = tx + (Math.cos(angle + forkOffset) * (trunkR + 0.035) * cosT + Math.sin(angle + forkOffset) * (trunkR + 0.035) * sinT) * tScale;
              const fz = tz + (-Math.cos(angle + forkOffset) * (trunkR + 0.035) * sinT + Math.sin(angle + forkOffset) * (trunkR + 0.035) * cosT) * tScale;
              const fy = wy + (rand() - 0.5) * 0.15;

              const forkMat = this._createClingingMatrix(
                fx, fy, fz,
                -Math.sin(fAngle), Math.cos(fAngle),
                Math.cos(fAngle), Math.sin(fAngle),
                clusterScale * 0.9,
                (rand() - 0.5) * 0.3,
                0.15
              );

              clusterInstances.push({
                matrix: forkMat,
                colorIndex: colorCursor++
              });
            }
          }

          // Scattered single creeping leaves beside the vine (exactly like column reference)
          if (s > 1 && s < steps - 1 && rand() < 0.75) {
            const sideSign = (s % 2 === 0) ? 1 : -1;
            const sideDist = 0.12 + rand() * 0.20; // 12 to 32cm to the side of vine
            const sAngle = angle + (sideSign * sideDist) / trunkR;
            const sNormAngle = sAngle + rotY;

            const slx = Math.cos(sAngle) * (trunkR + 0.02);
            const slz = Math.sin(sAngle) * (trunkR + 0.02);
            const sly = y + (rand() - 0.5) * 0.14;

            const swx = tx + (slx * cosT + slz * sinT) * tScale;
            const swy = ty + sly * tScale;
            const swz = tz + (-slx * sinT + slz * cosT) * tScale;

            const sScale = (0.9 + rand() * 0.6) * taper * tScale;
            const singleMat = this._createClingingMatrix(
              swx, swy, swz,
              -Math.sin(sNormAngle), Math.cos(sNormAngle),
              Math.cos(sNormAngle), Math.sin(sNormAngle),
              sScale,
              (rand() - 0.5) * 0.4,
              0.08
            );

            singleInstances.push({
              matrix: singleMat,
              colorIndex: colorCursor++
            });
          }
        }

        // Build thin continuous 3D tendril tube adhering to bark
        // NOTE: segments kept low (8) to avoid blocking the main thread when many trees are present
        if (curvePoints.length >= 3) {
          const curve = new THREE.CatmullRomCurve3(curvePoints);
          const tubeGeom = new THREE.TubeGeometry(curve, 8, 0.018 * tScale, 4, false);
          stemGeometries.push(tubeGeom);
        }
      });
    });

    return { clusterInstances, singleInstances, stemGeometries };
  }

  // Constructs 4x4 matrix aligning leaf flat with trunk tangent plane while facing outward
  _createClingingMatrix(px, py, pz, Tx, Tz, Nx, Nz, scale, tiltAngle, flareAngle) {
    const matrix = new THREE.Matrix4();

    // Basis vectors:
    // X = horizontal tangent along bark (T)
    // Y = vertical along trunk with slight flare (V)
    // Z = outward surface normal from bark (N)
    const T = new THREE.Vector3(Tx, 0, Tz).normalize();
    const N = new THREE.Vector3(Nx, 0, Nz).normalize();
    const V = new THREE.Vector3(0, 1, 0);

    // Apply slight tilt/rotation in the tangent plane
    const cosTilt = Math.cos(tiltAngle);
    const sinTilt = Math.sin(tiltAngle);
    const rotatedT = new THREE.Vector3().copy(T).multiplyScalar(cosTilt).addScaledVector(V, sinTilt);
    const rotatedV = new THREE.Vector3().copy(T).multiplyScalar(-sinTilt).addScaledVector(V, cosTilt);

    // Tip flare: tilt slightly away from the bark
    const flaredN = new THREE.Vector3().copy(N).addScaledVector(V, -flareAngle).normalize();

    matrix.makeBasis(
      rotatedT.multiplyScalar(scale),
      rotatedV.multiplyScalar(scale),
      flaredN.multiplyScalar(scale)
    );
    matrix.setPosition(px, py, pz);

    return matrix;
  }

  setVisible(visible) {
    this.visible = visible;
    this.group.visible = visible;
  }

  update(delta) {
    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }
}
