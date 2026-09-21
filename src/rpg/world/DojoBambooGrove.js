// DojoBambooGrove.js - GPU-Instanced Wind-Animated Stylized Bamboo Grove [Exclusive to Zone 3, 3]
import * as THREE from 'three';

// Bamboo Grove Area: North-West designated meadow (West of North Portal)
const BAMBOO_GROVE_CONFIG = {
  cx: -12.0,
  cz: -31.5,
  rx: 5.2,
  rz: 5.2,
  count: 48,
  minHeight: 4.8,
  maxHeight: 7.2
};

// Build a complete, unified Bamboo Tree Geometry (Stalk + Nodes + Attached Branches + Leaves)
// Every vertex shares the exact same coordinate space, making it physically impossible for leaves to detach!
function createCompositeBambooGeometry() {
  const positions = [];
  const normals = [];
  const colors = [];
  const uvs = [];
  const indices = [];

  const numSegments = 9; // 9 internodes
  const radialSegments = 10;
  const height = 6.0; // Base reference height (scaled via instance matrix)
  const baseRadius = 0.082;

  // Authentic stylized bamboo color palette
  const baseColor = [0.18, 0.52, 0.16];    // Jade root
  const shaftColor = [0.30, 0.74, 0.24];   // Vibrant bamboo green
  const nodeColor = [0.78, 0.92, 0.44];    // Golden cream node ring
  const branchColor = [0.24, 0.60, 0.20];  // Branch woody green
  const leafBaseCol = [0.18, 0.54, 0.20];  // Leaf stem junction
  const leafMidCol = [0.34, 0.84, 0.28];   // Vibrant leaf blade
  const leafTipCol = [0.68, 0.95, 0.38];   // Golden lime leaf tip

  let vertCount = 0;

  // 1. Build Bamboo Stalk with Internodes and Ring Nodes
  for (let s = 0; s <= numSegments; s++) {
    const t = s / numSegments;
    const y = t * height;
    const rBase = baseRadius * (1.0 - t * 0.55);
    const rNode = rBase * 1.15; // Raised node ring

    // Node ring vertex loop
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      positions.push(cos * rNode, y, sin * rNode);
      normals.push(cos, 0.04, sin);
      uvs.push(j / radialSegments, t);
      colors.push(nodeColor[0], nodeColor[1], nodeColor[2]);
      vertCount++;
    }

    // Mid-internode shaft vertex loop
    if (s < numSegments) {
      const yMid = y + (height / numSegments) * 0.5;
      const tMid = (s + 0.5) / numSegments;
      const rMid = baseRadius * (1.0 - tMid * 0.55) * 0.95;

      const col = [
        baseColor[0] * (1 - tMid) + shaftColor[0] * tMid,
        baseColor[1] * (1 - tMid) + shaftColor[1] * tMid,
        baseColor[2] * (1 - tMid) + shaftColor[2] * tMid
      ];

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        positions.push(cos * rMid, yMid, sin * rMid);
        normals.push(cos, 0, sin);
        uvs.push(j / radialSegments, tMid);
        colors.push(col[0], col[1], col[2]);
        vertCount++;
      }
    }
  }

  // Stalk quad indices
  const ringsTotal = numSegments * 2 + 1;
  const ringVerts = radialSegments + 1;
  for (let r = 0; r < ringsTotal - 1; r++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = r * ringVerts + j;
      const b = (r + 1) * ringVerts + j;
      const c = (r + 1) * ringVerts + (j + 1);
      const d = r * ringVerts + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // 2. Build Seamless Branches and Lanceolate Leaf Sprays on Upper Nodes
  const nodeIndicesWithBranches = [4, 5, 6, 7, 8, 9];
  let branchSeed = 77;
  const pseudoRnd = () => {
    branchSeed = (branchSeed * 9301 + 49297) % 233280;
    return branchSeed / 233280;
  };

  nodeIndicesWithBranches.forEach((nodeIdx, bIdx) => {
    const t = nodeIdx / numSegments;
    const nodeY = t * height;
    const rAtNode = baseRadius * (1.0 - t * 0.55) * 1.15;

    // 2 to 3 branches per node, distributed with golden phyllotaxis
    const numBranchesAtNode = (nodeIdx >= 7) ? 3 : 2;

    for (let b = 0; b < numBranchesAtNode; b++) {
      const baseAngle = bIdx * 2.39996 + b * (Math.PI * 2 / numBranchesAtNode) + pseudoRnd() * 0.35;
      const branchLen = 0.38 + pseudoRnd() * 0.22;
      const branchPitch = 0.24 + pseudoRnd() * 0.20; // 14 to 25 degrees upward

      const cosA = Math.cos(baseAngle);
      const sinA = Math.sin(baseAngle);
      const cosP = Math.cos(branchPitch);
      const sinP = Math.sin(branchPitch);

      // Start branch inside the stalk core so it seamlessly grows outward through the node ring
      const startX = cosA * (rAtNode * 0.45);
      const startY = nodeY;
      const startZ = sinA * (rAtNode * 0.45);

      // End of branch where leaves fan out
      const endX = startX + cosA * (branchLen * cosP);
      const endY = startY + branchLen * sinP;
      const endZ = startZ + sinA * (branchLen * cosP);

      // Branch stem quad
      const bw = 0.016;
      const bNormX = -sinA * bw;
      const bNormZ = cosA * bw;

      const vBase = vertCount;
      positions.push(startX - bNormX, startY, startZ - bNormZ);
      normals.push(0, 1, 0); uvs.push(0, 0); colors.push(branchColor[0], branchColor[1], branchColor[2]);
      vertCount++;

      positions.push(startX + bNormX, startY, startZ + bNormZ);
      normals.push(0, 1, 0); uvs.push(1, 0); colors.push(branchColor[0], branchColor[1], branchColor[2]);
      vertCount++;

      positions.push(endX - bNormX * 0.6, endY, endZ - bNormZ * 0.6);
      normals.push(0, 1, 0); uvs.push(0, 1); colors.push(branchColor[0], branchColor[1], branchColor[2]);
      vertCount++;

      positions.push(endX + bNormX * 0.6, endY, endZ + bNormZ * 0.6);
      normals.push(0, 1, 0); uvs.push(1, 1); colors.push(branchColor[0], branchColor[1], branchColor[2]);
      vertCount++;

      indices.push(vBase, vBase + 1, vBase + 3, vBase, vBase + 3, vBase + 2);

      // 4 arching lanceolate leaves per spray
      const leafAngles = [-0.52, -0.18, 0.18, 0.52];
      const leafLengths = [0.42, 0.52, 0.50, 0.40];

      leafAngles.forEach((lAngle, lIdx) => {
        const totalAngle = baseAngle + lAngle;
        const lLen = leafLengths[lIdx];
        const lw = 0.052;

        const cosLA = Math.cos(totalAngle);
        const sinLA = Math.sin(totalAngle);
        const droopY = -0.045 - pseudoRnd() * 0.030; // Natural drooping curve

        const tipX = endX + cosLA * lLen;
        const tipY = endY + droopY;
        const tipZ = endZ + sinLA * lLen;

        const midX = endX + cosLA * (lLen * 0.45);
        const midY = endY + 0.01;
        const midZ = endZ + sinLA * (lLen * 0.45);

        const perpX = -sinLA * lw;
        const perpZ = cosLA * lw;

        const lvBase = vertCount;

        // 5 vertices per leaf: Base (0), Left (1), Right (2), Central Spine (3), Drooping Tip (4)
        positions.push(endX, endY, endZ);
        normals.push(0, 1, 0); uvs.push(0.5, 0); colors.push(leafBaseCol[0], leafBaseCol[1], leafBaseCol[2]);
        vertCount++;

        positions.push(midX - perpX, midY - 0.01, midZ - perpZ);
        normals.push(0, 1, 0); uvs.push(0, 0.5); colors.push(leafMidCol[0], leafMidCol[1], leafMidCol[2]);
        vertCount++;

        positions.push(midX + perpX, midY - 0.01, midZ + perpZ);
        normals.push(0, 1, 0); uvs.push(1, 0.5); colors.push(leafMidCol[0], leafMidCol[1], leafMidCol[2]);
        vertCount++;

        positions.push(midX, midY + 0.008, midZ);
        normals.push(0, 1, 0); uvs.push(0.5, 0.5); colors.push(leafMidCol[0], leafMidCol[1], leafMidCol[2]);
        vertCount++;

        positions.push(tipX, tipY, tipZ);
        normals.push(0, 1, 0); uvs.push(0.5, 1); colors.push(leafTipCol[0], leafTipCol[1], leafTipCol[2]);
        vertCount++;

        indices.push(
          lvBase + 0, lvBase + 1, lvBase + 3,
          lvBase + 0, lvBase + 3, lvBase + 2,
          lvBase + 1, lvBase + 4, lvBase + 3,
          lvBase + 3, lvBase + 4, lvBase + 2
        );
      });
    }
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export class DojoBambooGrove {
  constructor(scene, collisions = null) {
    this.scene = scene;
    this.collisions = collisions;

    this.group = new THREE.Group();
    this.group.name = 'dojo_bamboo_grove';
    this.group.visible = false;
    this.scene.add(this.group);

    this.bambooMesh = null;

    this.uniforms = {
      uTime: { value: 0 },
      uWindSpeed: { value: 2.1 },
      uWindStrength: { value: 0.22 }
    };

    this.isLoaded = false;
  }

  async init() {
    console.log('[DojoBambooGrove] Generating composite GPU-instanced bamboo grove for Zone [3, 3]...');

    // 1. Build Unified Bamboo Geometry with permanently attached branches and leaves
    const bambooGeom = createCompositeBambooGeometry();

    // 2. GPU Wind Animated Material
    const bambooMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.62,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    bambooMaterial.onBeforeCompile = (shader) => {
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
        // Height above ground
        float h = max(0.0, position.y);
        float bend = pow(h / 6.0, 1.55);

        // Wind wave travelling diagonally across the island
        vec4 wPos = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float phase = uTime * uWindSpeed + wPos.x * 0.28 + wPos.z * 0.28;

        float sway = (sin(phase) * 0.80 + sin(phase * 0.45 + 1.2) * 0.35) * uWindStrength * 0.95 * bend;

        transformed.x += sway * 0.707;
        transformed.z += sway * 0.707;

        // Leaf fluttering: leaves are farther out from the central stalk axis (dist > 0.12m)
        float distFromAxis = length(position.xz);
        if (distFromAxis > 0.12) {
          float leafWeight = clamp((distFromAxis - 0.12) / 0.40, 0.0, 1.0);
          float flutter = sin(uTime * (uWindSpeed * 2.8) + position.x * 3.5 + position.z * 3.5) * 0.045 * uWindStrength * leafWeight;
          transformed.x += flutter * 0.707;
          transformed.z += flutter * 0.707;
          transformed.y += flutter * 0.5;
        }

        // Slight natural vertical drop when bending
        transformed.y -= (sway * sway) * 0.035;
        `
      );
    };

    // 3. Generate Instance Positions solely within the designated red area (NW Meadow)
    const instances = this._generateInstances();

    // 4. Build InstancedMesh (1 single draw call for the entire bamboo forest!)
    this.bambooMesh = new THREE.InstancedMesh(bambooGeom, bambooMaterial, instances.length);
    this.bambooMesh.castShadow = true;
    this.bambooMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();

    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.rotation.set(inst.rotX, inst.rotY, inst.rotZ);
      const sH = inst.height / 6.0;
      dummy.scale.set(inst.thickness, sH, inst.thickness);
      dummy.updateMatrix();
      this.bambooMesh.setMatrixAt(i, dummy.matrix);
    });

    this.bambooMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.bambooMesh);

    this.isLoaded = true;
    console.log(`[DojoBambooGrove] Built ${instances.length} unified bamboo trees successfully.`);
  }

  _generateInstances() {
    const instances = [];

    // Deterministic pseudo-random generator
    let seed = 98765;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const { cx, cz, rx, rz, count, minHeight, maxHeight } = BAMBOO_GROVE_CONFIG;

    // Generate natural bamboo culm clumps (groups of 2-5 close stalks sharing rhizomes)
    const numClumps = 14;
    const clumpCenters = [];
    for (let c = 0; c < numClumps; c++) {
      const r = Math.sqrt(rnd()) * 0.85;
      const angle = rnd() * Math.PI * 2;
      clumpCenters.push({
        x: cx + Math.cos(angle) * (rx * r),
        z: cz + Math.sin(angle) * (rz * r)
      });
    }

    for (let i = 0; i < count; i++) {
      // Pick a clump center or scatter slightly
      const clump = clumpCenters[i % clumpCenters.length];
      const stalkDist = 0.15 + rnd() * 0.95; // Clustered near clump center
      const stalkAngle = rnd() * Math.PI * 2;

      let x = clump.x + Math.cos(stalkAngle) * stalkDist;
      let z = clump.z + Math.sin(stalkAngle) * stalkDist;

      // Keep strictly within designated boundaries
      x = Math.max(cx - rx, Math.min(cx + rx, x));
      z = Math.max(cz - rz, Math.min(cz + rz, z));

      const h = minHeight + rnd() * (maxHeight - minHeight);
      const thickness = 0.85 + rnd() * 0.30;

      // Natural subtle lean (1.2 to 4.5 degrees)
      const leanAngle = 0.02 + rnd() * 0.055;
      const leanDir = rnd() * Math.PI * 2;
      const rotX = Math.cos(leanDir) * leanAngle;
      const rotY = rnd() * Math.PI * 2;
      const rotZ = Math.sin(leanDir) * leanAngle;

      instances.push({
        x,
        y: 0.0,
        z,
        rotX,
        rotY,
        rotZ,
        thickness,
        height: h
      });
    }

    return instances;
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  update(dt) {
    if (!this.group.visible) return;
    this.uniforms.uTime.value += dt;
  }
}
