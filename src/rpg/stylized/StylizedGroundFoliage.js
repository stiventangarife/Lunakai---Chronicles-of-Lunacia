// StylizedGroundFoliage.js - Instanced stylized low ground foliage (leafy bush shoots) around trees & scattered across meadow
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import { GROUND_SIZE } from './PathSDF.js';
import { TREE_LAYOUT } from './StylizedTrees.js';

// Color palette for lush anime/Ghibli style leaf shoots (multiple vibrant green tones)
const FOLIAGE_COLORS = [
  new THREE.Color('#2d8438'), // Deep emerald leaf
  new THREE.Color('#38a846'), // Vibrant mid green
  new THREE.Color('#46be52'), // Bright foliage green
  new THREE.Color('#58d056'), // Fresh sunny green
  new THREE.Color('#6ee252'), // Tender lime shoot
  new THREE.Color('#3ea442')  // Leaf canopy tone
];

// Open meadow patches (centers for scattered foliage clusters across the field)
const MEADOW_CLUSTERS = [
  // NW Quadrant
  { cx: -14, cz: -18, radius: 2.8, count: 52 },
  { cx: -8,  cz: -24, radius: 2.5, count: 45 },
  { cx: -20, cz: -10, radius: 2.7, count: 48 },
  { cx: -25, cz: -20, radius: 2.4, count: 38 },
  { cx: -11, cz: -12, radius: 2.2, count: 35 },
  // NE Quadrant
  { cx: 16,  cz: -16, radius: 2.8, count: 52 },
  { cx: 22,  cz: -8,  radius: 2.4, count: 42 },
  { cx: 10,  cz: -25, radius: 2.6, count: 45 },
  { cx: 25,  cz: -22, radius: 2.5, count: 38 },
  { cx: 12,  cz: -10, radius: 2.2, count: 35 },
  // SW Quadrant
  { cx: -15, cz: 16,  radius: 2.8, count: 52 },
  { cx: -22, cz: 8,   radius: 2.4, count: 42 },
  { cx: -8,  cz: 25,  radius: 2.6, count: 45 },
  { cx: -26, cz: 20,  radius: 2.5, count: 38 },
  { cx: -12, cz: 11,  radius: 2.2, count: 35 },
  // SE Quadrant
  { cx: 17,  cz: 16,  radius: 2.8, count: 52 },
  { cx: 23,  cz: 10,  radius: 2.4, count: 42 },
  { cx: 11,  cz: 26,  radius: 2.6, count: 45 },
  { cx: 26,  cz: 21,  radius: 2.5, count: 42 },
  { cx: 13,  cz: 11,  radius: 2.2, count: 35 },
  // Outer perimeter patches
  { cx: -28, cz: 2,   radius: 2.4, count: 38 },
  { cx: 28,  cz: 3,   radius: 2.4, count: 38 },
  { cx: 0,   cz: -28, radius: 2.5, count: 42 },
  { cx: 0,   cz: 28,  radius: 2.5, count: 42 }
];

export class StylizedGroundFoliage {
  constructor(config = {}) {
    this.config = {
      windStrength: 0.18,
      windSpeed: 2.2,
      ...config
    };

    this.group = new THREE.Group();
    this.group.name = 'stylized_ground_foliage';
    this.instancedMeshes = [];
    this.uniforms = null;
    this.visible = true;
  }

  async load() {
    const loader = new GLTFLoader();

    // Load 3 complementary low-poly bush shoot variations
    const [smallGltf, midGltf, detailedGltf] = await Promise.all([
      loader.loadAsync('./assets/arctic/plant_bushSmall.glb'),
      loader.loadAsync('./assets/arctic/plant_bush.glb'),
      loader.loadAsync('./assets/arctic/plant_bushDetailed.glb')
    ]);

    const geometries = [
      this._extractGeometry(smallGltf),
      this._extractGeometry(midGltf),
      this._extractGeometry(detailedGltf)
    ].filter(Boolean);

    if (geometries.length === 0) {
      console.warn('[StylizedGroundFoliage] Could not extract foliage geometries');
      return this.group;
    }

    // Prepare instance placement definitions
    const instances = this._generateInstancePositions();
    console.log(`[StylizedGroundFoliage] Generated ${instances.length} ground foliage instances.`);

    // Shared wind shader uniforms
    this.uniforms = {
      uTime: { value: 0 },
      uWindSpeed: { value: this.config.windSpeed },
      uWindStrength: { value: this.config.windStrength }
    };

    // Shared stylized foliage material with subtle breeze sway
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    material.onBeforeCompile = (shader) => {
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
        // Subtle organic sway on higher foliage leaves
        float h = max(0.0, position.y);
        float swayPhase = uTime * uWindSpeed + position.x * 0.8 + position.z * 0.8;
        float sway = sin(swayPhase) * h * uWindStrength * 0.35;
        transformed.x += sway;
        transformed.z += cos(swayPhase * 0.7) * h * uWindStrength * 0.25;
        `
      );
    };

    // Distribute instances evenly across the 3 geometry types
    const perType = Math.ceil(instances.length / geometries.length);

    geometries.forEach((geom, gIdx) => {
      const subset = instances.slice(gIdx * perType, (gIdx + 1) * perType);
      if (subset.length === 0) return;

      const instMesh = new THREE.InstancedMesh(geom, material, subset.length);
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();

      subset.forEach((inst, i) => {
        dummy.position.set(inst.x, inst.y, inst.z);
        dummy.rotation.set(inst.rotX, inst.rotY, inst.rotZ);
        dummy.scale.setScalar(inst.scale);
        dummy.updateMatrix();

        instMesh.setMatrixAt(i, dummy.matrix);

        // Pick color with variation
        const color = FOLIAGE_COLORS[inst.colorIndex % FOLIAGE_COLORS.length].clone();
        // Subtle brightness jitter
        color.offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08);
        instMesh.setColorAt(i, color);
      });

      instMesh.instanceMatrix.needsUpdate = true;
      if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;

      this.instancedMeshes.push(instMesh);
      this.group.add(instMesh);
    });

    return this.group;
  }

  _extractGeometry(gltf) {
    let geom = null;
    gltf.scene.traverse((o) => {
      if (!geom && o.isMesh) {
        geom = o.geometry.clone();
      }
    });
    return geom;
  }

  _generateInstancePositions() {
    const instances = [];
    let colorCursor = 0;

    // 1. Dense skirt of foliage around the base of each tree in TREE_LAYOUT
    TREE_LAYOUT.forEach((tree) => {
      const [tx, ty, tz] = tree.position;
      const treeScale = tree.scale || 1.0;
      // 60 instances per tree forming lush ground cover around roots
      const count = 60;

      for (let i = 0; i < count; i++) {
        // Higher density near trunk (0.9m to 2.4m), thinning out up to 4.2m
        const rNorm = Math.pow(Math.random(), 1.3);
        const radius = (0.9 + rNorm * 3.3) * Math.min(1.25, treeScale);
        const theta = Math.random() * Math.PI * 2;

        const x = tx + Math.cos(theta) * radius;
        const z = tz + Math.sin(theta) * radius;

        // Keep inside island bounds
        if (Math.abs(x) > GROUND_SIZE / 2 - 2 || Math.abs(z) > GROUND_SIZE / 2 - 2) continue;

        // Scale variation: larger near trunk, smaller on outer perimeter
        const baseScale = (1.4 + (1.0 - rNorm) * 0.9 + (Math.random() - 0.5) * 0.4);

        instances.push({
          x: x,
          y: 0.01,
          z: z,
          rotX: (Math.random() - 0.5) * 0.18,
          rotY: Math.random() * Math.PI * 2,
          rotZ: (Math.random() - 0.5) * 0.18,
          scale: baseScale,
          colorIndex: colorCursor++
        });
      }
    });

    // 2. Scattered organic foliage patches across open meadow
    MEADOW_CLUSTERS.forEach((cluster) => {
      for (let i = 0; i < cluster.count; i++) {
        const r = Math.pow(Math.random(), 1.2) * cluster.radius;
        const theta = Math.random() * Math.PI * 2;
        const x = cluster.cx + Math.cos(theta) * r;
        const z = cluster.cz + Math.sin(theta) * r;

        // Ensure within island bounds
        if (Math.abs(x) > GROUND_SIZE / 2 - 3 || Math.abs(z) > GROUND_SIZE / 2 - 3) continue;

        const scale = 1.1 + Math.random() * 0.8;

        instances.push({
          x: x,
          y: 0.01,
          z: z,
          rotX: (Math.random() - 0.5) * 0.15,
          rotY: Math.random() * Math.PI * 2,
          rotZ: (Math.random() - 0.5) * 0.15,
          scale: scale,
          colorIndex: colorCursor++
        });
      }
    });

    return instances;
  }

  setVisible(visible) {
    this.visible = visible;
    this.group.visible = visible;
  }

  
  setZone(gx, gy) {
    this.currentGx = gx || 2;
    this.currentGy = gy || 2;
    const isForest = (gx === 2 && gy === 2);
    this.setVisible(isForest);
  }
  update(delta) {
    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }
}
