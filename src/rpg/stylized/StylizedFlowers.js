// StylizedFlowers.js - 280 Instanced Flower Clusters with Atlas UVs & GPU Wind
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import { GROUND_SIZE } from './PathSDF.js';

// Atlas quadrant layout constants
const STEM_UV = [0.25, 0.75];
const STEM_CELL = [0.0, 0.5];
const PETAL_QUADRANTS = [
  { u0: 0.5, v0: 0.5 }, // top-right
  { u0: 0.0, v0: 0.0 }, // bottom-left
  { u0: 0.5, v0: 0.0 }, // bottom-right
];
const CARD_UV_OVERSCAN = 1.3;
const CAP_NORMAL_MIN_Y = 0.6;
const CAP_MIN_AREA = 1e-3;
const CLUSTER_RADIUS = 0.25;

export function prepareFlowerGeometry(scene) {
  let mesh = null;
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!mesh && o.isMesh) mesh = o;
  });
  if (!mesh) return { geometry: null, height: 1.0 };

  const geometry = mesh.geometry.index
    ? mesh.geometry.toNonIndexed()
    : mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  geometry.translate(0, -box.min.y, 0);
  const height = box.max.y - box.min.y;

  const pos = geometry.getAttribute('position');
  const triCount = pos.count / 3;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();

  // Classify triangles and cluster petal caps
  const clusters = [];
  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac);
    const area = n.length() / 2;
    if (area < CAP_MIN_AREA) continue;
    n.divideScalar(area * 2);
    if (Math.abs(n.y) < CAP_NORMAL_MIN_Y) continue;

    const cx = (a.x + b.x + c.x) / 3;
    const cz = (a.z + b.z + c.z) / 3;
    let target = clusters.find(
      (cl) => Math.hypot(cl.x / cl.count - cx, cl.z / cl.count - cz) < CLUSTER_RADIUS
    );
    if (!target) {
      target = { x: 0, z: 0, count: 0, tris: [] };
      clusters.push(target);
    }
    target.x += cx;
    target.z += cz;
    target.count++;
    target.tris.push(t);
  }

  clusters.sort((p, q) => p.x / p.count - q.x / q.count);

  const uv = new Float32Array(pos.count * 2);
  const cellBase = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = STEM_UV[0];
    uv[i * 2 + 1] = STEM_UV[1];
    cellBase[i * 4] = STEM_CELL[0];
    cellBase[i * 4 + 1] = STEM_CELL[1];
  }

  clusters.forEach((cluster, index) => {
    const quad = PETAL_QUADRANTS[index % PETAL_QUADRANTS.length];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const t of cluster.tris) {
      for (let k = 0; k < 3; k++) {
        const x = pos.getX(t * 3 + k);
        const z = pos.getZ(t * 3 + k);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
    }
    const ext = Math.max(maxX - minX, maxZ - minZ) || 1;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const span = 0.5 * CARD_UV_OVERSCAN;
    for (const t of cluster.tris) {
      for (let k = 0; k < 3; k++) {
        const i = t * 3 + k;
        const nx = (pos.getX(i) - cx) / ext;
        const nz = (pos.getZ(i) - cz) / ext;
        uv[i * 2] = quad.u0 + 0.25 + nx * span;
        uv[i * 2 + 1] = quad.v0 + 0.25 + nz * span;
        cellBase[i * 4] = quad.u0;
        cellBase[i * 4 + 1] = quad.v0;
      }
    }
  });
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // Base centroid calculation for rooted scaling
  if (clusters.length > 0) {
    const centroids = clusters.map((cl) => ({
      x: cl.x / cl.count,
      z: cl.z / cl.count,
    }));
    const nearest = new Uint8Array(pos.count);
    const lowest = clusters.map(() => ({ minY: Infinity, x: 0, z: 0, n: 0 }));
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let best = 0;
      let bestDist = Infinity;
      for (let cIdx = 0; cIdx < centroids.length; cIdx++) {
        const d = Math.hypot(centroids[cIdx].x - x, centroids[cIdx].z - z);
        if (d < bestDist) {
          bestDist = d;
          best = cIdx;
        }
      }
      nearest[i] = best;
      lowest[best].minY = Math.min(lowest[best].minY, pos.getY(i));
    }
    const BASE_BAND = 0.05 * height;
    for (let i = 0; i < pos.count; i++) {
      const lo = lowest[nearest[i]];
      if (pos.getY(i) <= lo.minY + BASE_BAND) {
        lo.x += pos.getX(i);
        lo.z += pos.getZ(i);
        lo.n++;
      }
    }
    for (let i = 0; i < pos.count; i++) {
      const lo = lowest[nearest[i]];
      cellBase[i * 4 + 2] = lo.n > 0 ? lo.x / lo.n : centroids[nearest[i]].x;
      cellBase[i * 4 + 3] = lo.n > 0 ? lo.z / lo.n : centroids[nearest[i]].z;
    }
  }
  geometry.setAttribute('aCellBase', new THREE.BufferAttribute(cellBase, 4));

  return { geometry, height };
}

export class StylizedFlowers {
  constructor(textures, config = {}) {
    this.textures = textures;
    this.config = {
      density: 280,
      scale: 0.80,
      windStrength: 0.25,
      windSpeed: 2.70,
      windAngle: 45.0,
      gustScale: 0.50,
      turbulence: 0.42,
      flutter: 0.28,
      grassAO: 0.79,
      pathEdgeWidth: 0.65,
      roadOffset: 0.75,
      pathDepth: 0.25,
      flowerTint: 0xffffff,
      flowerTintStrength: 0.0,
      ...config
    };

    this.mesh = null;
    this.uniforms = null;
    this.flowerHeight = 1.0;
  }

  async load() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('./assets/stylized/flowers.glb');
    
    const { geometry, height } = prepareFlowerGeometry(gltf.scene);
    if (!geometry) {
      throw new Error('[StylizedFlowers] Failed to prepare flower geometry');
    }
    this.flowerHeight = height;

    this.mesh = this._createInstancedMesh(geometry);
    return this.mesh;
  }

  _createInstancedMesh(geometry) {
    const count = this.config.density;
    const aWind = new Float32Array(count * 4);
    const dummy = new THREE.Object3D();

    const instancedMesh = new THREE.InstancedMesh(geometry, null, count);
    instancedMesh.receiveShadow = true;
    instancedMesh.frustumCulled = false;

    // Distribute flower clusters across the meadow
    for (let i = 0; i < count; i++) {
      const u1 = (Math.sin(i * 17.351 + 31.81) * 43758.5453) % 1;
      const u2 = (Math.cos(i * 41.117 + 83.17) * 24634.6345) % 1;
      const u3 = (Math.sin(i * 29.873 + 15.42) * 12345.6789) % 1;

      let x = ((u1 < 0 ? u1 + 1 : u1) - 0.5) * (GROUND_SIZE - 2.0);
      const z = ((u2 < 0 ? u2 + 1 : u2) - 0.5) * (GROUND_SIZE - 2.0);
      const rx = 8.5 + 1.8 * Math.sin(z * 0.09) + 0.8 * Math.cos(z * 0.21);
      if (Math.abs(x - rx) < 5.2) {
        x = (x < rx) ? rx - 5.2 - (Math.abs(u1) * 2.5) : rx + 5.2 + (Math.abs(u1) * 2.5);
      }
      // Clear flowers from the pond basin in Zone [3, 3]
      const distToPond = Math.hypot(x - (-30.3), z - 12.0);
      if (distToPond < 4.4) {
        const pAng = Math.atan2(z - 12.0, x - (-30.3));
        x = -30.3 + Math.cos(pAng) * (4.6 + Math.abs(u1) * 1.5);
      }
      const yaw = (u3 < 0 ? u3 + 1 : u3) * Math.PI * 2;

      aWind[i * 4 + 0] = x;
      aWind[i * 4 + 1] = z;
      aWind[i * 4 + 2] = Math.cos(yaw);
      aWind[i * 4 + 3] = Math.sin(yaw);

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(1.0); // Shader handles rooted scale!
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    geometry.setAttribute('aWind', new THREE.InstancedBufferAttribute(aWind, 4));

    const { colorMap, alphaMap, noiseMap, pathSdf, dirtHeight } = this.textures;
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.generateMipmaps = false;
    alphaMap.colorSpace = THREE.NoColorSpace;

    this.uniforms = {
      uTime: { value: 0 },
      uFlowerHeight: { value: this.flowerHeight },
      uFlowerScale: { value: this.config.scale },
      uWindStrength: { value: this.config.windStrength },
      uWindSpeed: { value: this.config.windSpeed },
      uWindAngle: { value: (this.config.windAngle * Math.PI) / 180.0 },
      uGustScale: { value: this.config.gustScale },
      uTurbulence: { value: this.config.turbulence },
      uFlutter: { value: this.config.flutter },
      uGrassAO: { value: this.config.grassAO },
      uPathEdgeWidth: { value: this.config.pathEdgeWidth },
      uRoadOffset: { value: this.config.roadOffset },
      uPathDepth: { value: this.config.pathDepth },
      uColorMap: { value: colorMap },
      uAlphaMap: { value: alphaMap },
      uNoiseMap: { value: noiseMap },
      uPathSdf: { value: pathSdf },
      uDirtHeight: { value: dirtHeight },
      uFlowerTint: { value: new THREE.Color(this.config.flowerTint) },
      uFlowerTintStrength: { value: this.config.flowerTintStrength },
      uPondActive: { value: 1.0 },
      uPondCenter: { value: new THREE.Vector2(-30.3, 12.0) },
      uPondRadii: { value: new THREE.Vector2(4.1, 3.0) },
      uPond2Active: { value: 0.0 },
      uPond2Center: { value: new THREE.Vector2(3.7, -26.1) },
      uPond2Radii: { value: new THREE.Vector2(6.2, 4.6) }
    };

    const material = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
      alphaTest: 0.5
    });

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = `
        attribute vec4 aWind;
        attribute vec4 aCellBase;
        uniform float uTime;
        uniform float uFlowerHeight;
        uniform float uFlowerScale;
        uniform float uWindStrength;
        uniform float uWindSpeed;
        uniform float uWindAngle;
        uniform float uGustScale;
        uniform float uTurbulence;
        uniform float uFlutter;
        uniform float uPathEdgeWidth;
        uniform float uRoadOffset;
        uniform float uPathDepth;
        uniform sampler2D uNoiseMap;
        uniform sampler2D uPathSdf;
        uniform sampler2D uDirtHeight;
        uniform float uPondActive;
        uniform vec2 uPondCenter;
        uniform vec2 uPondRadii;
        uniform float uPond2Active;
        uniform vec2 uPond2Center;
        uniform vec2 uPond2Radii;

        varying vec2 vFlowerUv;
        varying vec4 vCellBase;
        varying float vInstanceId;
        varying float vHeightAlongFlower;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>

        vFlowerUv = uv;
        vCellBase = aCellBase;
        vInstanceId = float(gl_InstanceID);

        vec2 origin = aWind.xy;
        vec2 facing = aWind.zw;
        vec2 flowerBase = aCellBase.zw;

        float t = clamp(position.y / uFlowerHeight, 0.0, 1.0);
        vHeightAlongFlower = t;

        // 1. Wind Sway Calculation (calmer, stiffer than grass)
        float bladeSeed = fract(sin(vInstanceId * 12.9898) * 43758.5453);
        float bladePhase = bladeSeed * 6.28318;
        float ampVar = 0.65 + fract(sin(vInstanceId * 78.233 + 7.0) * 43758.5453) * 0.7;

        float wobble = sin(uTime * uWindSpeed * 0.6 + bladePhase) * (uTurbulence * 0.5) * 0.4;
        float angle = uWindAngle + wobble;
        vec2 windDir = vec2(cos(angle), sin(angle));
        vec2 perpDir = vec2(-windDir.y, windDir.x);

        float along = dot(origin, windDir);
        float noiseJitter = (texture2D(uNoiseMap, origin * 0.03).r - 0.5) * 2.0;
        float gustPhase = along * uGustScale - uTime * uWindSpeed * 0.6 + noiseJitter * 1.5;
        float gust = pow(sin(gustPhase) * 0.5 + 0.5, 1.6);

        float chopPhase = along * (uGustScale * 2.7) - uTime * uWindSpeed * 1.3 + bladePhase;
        float chop = sin(chopPhase) * 0.5 + 0.5;

        float intensity = (0.1 + gust * 0.85 + chop * 0.05) * ampVar;
        float phi = clamp(uWindStrength * intensity * 3.0, 0.0, 1.6);

        float shaped = pow(t, 2.0); // Stiff stem, bends at head
        float a = phi * shaped;
        float safePhi = max(phi, 0.001);
        float R = uFlowerHeight / safePhi;
        float uBend = R * (1.0 - cos(a));
        float dv = R * sin(a) - position.y;

        float flutterMask = smoothstep(0.6, 1.0, t);
        float flutterPhase = uTime * 10.0 + bladePhase * 3.0 + along * 0.8;
        float flutterAmt = sin(flutterPhase) * (uFlutter * 0.1) * 0.08 * flutterMask;

        vec2 horiz = windDir * uBend + perpDir * flutterAmt;
        float cosY = facing.x;
        float sinY = facing.y;
        vec3 localWindOffset = vec3(
          horiz.x * cosY - horiz.y * sinY,
          dv,
          horiz.x * sinY + horiz.y * cosY
        );

        // 2. Path Edge Transition via SDF
        vec2 planeUV = vec2(origin.x / 40.0 + 0.5, 0.5 - origin.y / 40.0);
        float signedMeters = texture2D(uPathSdf, planeUV).r * 8.0 - 4.0;
        float edgeNoise = texture2D(uNoiseMap, planeUV * 6.0).r;
        float noiseBreakup = (edgeNoise - 0.5) * 0.5;
        float dirtH = texture2D(uDirtHeight, planeUV * 8.0).r;
        float adjustedMeters = signedMeters + noiseBreakup + (dirtH - 0.5) * 0.4;

        float grassWeight = smoothstep(uRoadOffset + uPathEdgeWidth * 0.4, uRoadOffset + uPathEdgeWidth, adjustedMeters);
        float coverWeight = 1.0 - grassWeight;

        float surviveRoll = fract(sin(vInstanceId * 31.81 + 23.1) * 43758.5453);
        float alive = step(surviveRoll, grassWeight * grassWeight);
        float edgeScale = alive * mix(0.35, 1.0, smoothstep(0.0, 0.9, grassWeight));

        // Clear flowers inside active pond
        vec2 pFlowOffset = origin - uPondCenter;
        float pFlowH = (pFlowOffset.x * 0.7071 - pFlowOffset.y * 0.7071) / max(0.1, uPondRadii.x);
        float pFlowV = (pFlowOffset.x * 0.7071 + pFlowOffset.y * 0.7071) / max(0.1, uPondRadii.y);
        float distToPond = length(vec2(pFlowH, pFlowV));
        float pondFlowerClear = mix(1.0, smoothstep(0.85, 1.25, distToPond), uPondActive);
        edgeScale *= pondFlowerClear;

        // Clear flowers inside active secondary pond
        vec2 pFlowOffset2 = origin - uPond2Center;
        float pFlowH2 = (pFlowOffset2.x * 0.7071 - pFlowOffset2.y * 0.7071) / max(0.1, uPond2Radii.x);
        float pFlowV2 = (pFlowOffset2.x * 0.7071 + pFlowOffset2.y * 0.7071) / max(0.1, uPond2Radii.y);
        float distToPond2 = length(vec2(pFlowH2, pFlowV2));
        float pondFlowerClear2 = mix(1.0, smoothstep(0.85, 1.25, distToPond2), uPond2Active);
        edgeScale *= pondFlowerClear2;

        float pathSink = coverWeight * uPathDepth;

        // 3. Rooted Scaling about individual flower base
        float sizeJitter = mix(1.0, 2.0, fract(sin(vInstanceId * 47.19 + 5.7) * 43758.5453));
        float scale = uFlowerScale * sizeJitter * edgeScale;

        vec3 swayed = position + localWindOffset;
        transformed = vec3(
          flowerBase.x + (swayed.x - flowerBase.x) * scale,
          swayed.y * scale - pathSink,
          flowerBase.y + (swayed.z - flowerBase.y) * scale
        );
        `
      );

      shader.fragmentShader = `
        uniform sampler2D uColorMap;
        uniform sampler2D uAlphaMap;
        uniform float uGrassAO;
        uniform vec3 uFlowerTint;
        uniform float uFlowerTintStrength;

        varying vec2 vFlowerUv;
        varying vec4 vCellBase;
        varying float vInstanceId;
        varying float vHeightAlongFlower;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        const float CELL_SIZE = 0.5;
        const float CELL_CLAMP_EPS = 0.004;

        vec2 cellMin = vCellBase.xy;
        vec2 clampedUV = clamp(
          vFlowerUv,
          cellMin + vec2(CELL_CLAMP_EPS),
          cellMin + vec2(CELL_SIZE - CELL_CLAMP_EPS)
        );

        vec2 local = vFlowerUv - cellMin;
        float insideCell = step(0.0, local.x) * step(local.x, CELL_SIZE) *
                           step(0.0, local.y) * step(local.y, CELL_SIZE);

        float alphaMask = texture2D(uAlphaMap, clampedUV).r * insideCell;
        diffuseColor.a = alphaMask;

        float brightness = mix(0.9, 1.1, fract(sin(vInstanceId * 91.7) * 43758.5453));
        float aoFactor = mix(1.0 - uGrassAO * 0.6, 1.0, smoothstep(0.05, 0.6, vHeightAlongFlower));

        vec3 flowerRGB = texture2D(uColorMap, clampedUV).rgb;
        // Biome tint: blends original flower color towards uFlowerTint (e.g. white for forest)
        vec3 tintedFlower = mix(flowerRGB, uFlowerTint, uFlowerTintStrength);
        diffuseColor.rgb = tintedFlower * brightness * aoFactor;
        `
      );
    };

    instancedMesh.material = material;
    return instancedMesh;
  }

  setVisible(visible) {
    if (this.mesh) {
      this.mesh.visible = visible;
    }
  }

  setTint(colorHexOrInt, strength = 1.0) {
    if (this.uniforms) {
      if (this.uniforms.uFlowerTint) {
        this.uniforms.uFlowerTint.value.set(colorHexOrInt);
      }
      if (this.uniforms.uFlowerTintStrength) {
        this.uniforms.uFlowerTintStrength.value = strength;
      }
    }
  }

  setPondActive(active, center = null, radii = null) {
    if (this.uniforms && this.uniforms.uPondActive) {
      this.uniforms.uPondActive.value = active ? 1.0 : 0.0;
    }
    if (center && this.uniforms && this.uniforms.uPondCenter) {
      this.uniforms.uPondCenter.value.set(center.x, center.z);
    }
    if (radii && this.uniforms && this.uniforms.uPondRadii) {
      this.uniforms.uPondRadii.value.set(radii.x, radii.y);
    }
  }

  setPond2Active(active, center = null, radii = null) {
    if (this.uniforms && this.uniforms.uPond2Active) {
      this.uniforms.uPond2Active.value = active ? 1.0 : 0.0;
    }
    if (center && this.uniforms && this.uniforms.uPond2Center) {
      this.uniforms.uPond2Center.value.set(center.x, center.z);
    }
    if (radii && this.uniforms && this.uniforms.uPond2Radii) {
      this.uniforms.uPond2Radii.value.set(radii.x, radii.y);
    }
  }

  update(delta) {
    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }
}
