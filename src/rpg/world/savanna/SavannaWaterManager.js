import * as THREE from 'three';
import { createSeededRandom } from '../demo_scena/MathUtils.js';

/**
 * SavannaWaterManager.js - Waters of the Savannah:
 * 1. Plateau Oasis: turquoise lagoon on the summit, level with the plateau (Hito 23).
 *    Features animated caustic ripples, soft shoreline foam, and swimming fish shadows.
 * 2. Vast Ocean: Endless ocean plane surrounding the island at sea level (Y = 0.45m).
 * 3. Water reeds & bulrushes at the oasis shore.
 */
export class SavannaWaterManager {
  constructor(parentGroup, terrain, assetManager = null) {
    this.parentGroup = parentGroup;
    this.terrain = terrain;
    this.assetManager = assetManager;

    this.group = new THREE.Group();
    this.group.name = 'SavannaWaterGroup';
    if (this.parentGroup) {
      this.parentGroup.add(this.group);
    }

    this.time = 0;
    this.oasisMesh = null;
    this.oceanMesh = null;
    this.oasisMaterial = null;
    this.oceanMaterial = null;

    this.fishes = [];
    this.reedsGroup = new THREE.Group();
    this.group.add(this.reedsGroup);

    this.createOasisWater();
    this.createOcean();
    this.createOasisFishes();
    this.createOasisReeds();
  }

  createOasisWater() {
    // Hito 23: summit oasis (level with the plateau) — size & level come from the terrain
    const radius = this.terrain && this.terrain.oasisPoolRadius ? this.terrain.oasisPoolRadius + 0.6 : 17.0;
    const segments = 48;
    const oasisGeo = new THREE.CircleGeometry(radius, segments);
    oasisGeo.rotateX(-Math.PI / 2);

    this.oasisMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x0e7c86) },    // Deep turquoise oasis
        uShallowColor: { value: new THREE.Color(0x38efd8) }, // Bright sparkling aqua
        uFoamColor: { value: new THREE.Color(0xdcfcf6) },    // Gentle soft foam
        uOpacity: { value: 0.88 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        uniform float uTime;

        void main() {
          vUv = uv;
          vec3 pos = position;
          // Gentle organic water ripple
          pos.y += sin(pos.x * 0.45 + uTime * 1.5) * 0.04 + cos(pos.z * 0.45 + uTime * 1.2) * 0.04;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        uniform float uOpacity;

        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
          // Centered radius for depth blend
          vec2 centered = vUv - vec2(0.5);
          float dist = length(centered) * 2.0;

          // Multi-layer animated caustic ripples
          float wave1 = sin(vWorldPosition.x * 1.2 + uTime * 1.4) * cos(vWorldPosition.z * 1.2 + uTime * 1.1);
          float wave2 = sin(vWorldPosition.x * 2.4 - uTime * 1.8) * cos(vWorldPosition.z * 2.4 + uTime * 1.6);
          float caustics = clamp(wave1 * 0.5 + wave2 * 0.5 + 0.3, 0.0, 1.0);

          // Deep to shallow gradient
          vec3 waterCol = mix(uDeepColor, uShallowColor, (1.0 - dist) * 0.7 + caustics * 0.3);

          // Foam edge near shore
          float foamEdge = smoothstep(0.82, 0.98, dist);
          waterCol = mix(waterCol, uFoamColor, foamEdge * 0.55);

          // Soft alpha edge
          float alpha = uOpacity * (1.0 - smoothstep(0.92, 1.0, dist));

          gl_FragColor = vec4(waterCol, alpha);
        }
      `
    });

    this.oasisMesh = new THREE.Mesh(oasisGeo, this.oasisMaterial);
    // Center at terrain oasis center, at the terrain's oasis water level
    this.oasisLevel = this.terrain && this.terrain.oasisWaterLevel !== undefined ? this.terrain.oasisWaterLevel : 11.2;
    this.oasisMesh.position.set(14.0, this.oasisLevel, -12.0);
    this.oasisMesh.name = 'SavannaOasisWaterMesh';
    this.group.add(this.oasisMesh);
  }

  createOcean() {
    const size = 6000;
    const oceanGeo = new THREE.PlaneGeometry(size, size, 80, 80);
    oceanGeo.rotateX(-Math.PI / 2);
    oceanGeo.computeBoundingBox();
    oceanGeo.computeBoundingSphere();

    this.oceanMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: {
        ...THREE.UniformsLib.fog,
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x0e5d75) },    // Deep tropical turquoise
        uShallowColor: { value: new THREE.Color(0x32cfd5) }, // Radiant aqua shallows
        uFoamColor: { value: new THREE.Color(0xdcfcfc) },    // Crisp sunlit foam
        uOpacity: { value: 0.92 },
        uFoamIntensity: { value: 1.4 },
        uToonSpecEnabled: { value: 1.0 }
      },
      vertexShader: `
        #include <common>
        #include <fog_pars_vertex>
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vec3 pos = position;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;

          float distCenter = length(worldPos.xz);

          // Gentle open ocean swell waves
          float wave1 = sin(worldPos.x * 0.03 + uTime * 1.1 + worldPos.z * 0.02) * 0.12;
          float wave2 = cos(worldPos.z * 0.035 - uTime * 0.9 + worldPos.x * 0.015) * 0.09;

          // Rolling shore swell waves approaching the coast
          float shoreRoll = sin(uTime * 2.0 - distCenter * 0.40) * 0.08;
          float nearCoastFactor = (1.0 - smoothstep(135.0, 180.0, distCenter));

          // Calm wave height right at the shoreline
          float calmFactor = smoothstep(136.0, 155.0, distCenter);
          pos.y += ((wave1 + wave2) + shoreRoll * nearCoastFactor) * calmFactor;

          vNormal = normalize(vec3(-wave1 * 0.08, 1.0, -wave2 * 0.08));

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        uniform float uOpacity;
        uniform float uFoamIntensity;
        uniform float uToonSpecEnabled;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          float distToIsland = length(vWorldPosition.xz);
          float angle = atan(vWorldPosition.z, vWorldPosition.x);

          // 1. Exclude inner mesa island footprint (the plateau is dry and oasis is at Y=11.2)
          if (distToIsland < 136.0) {
            discard;
          }

          float shoreAlpha = smoothstep(136.0, 143.0, distToIsland);

          // 2. Harmonic ocean swell pattern
          vec2 p = vWorldPosition.xz * 0.022;
          float swell1 = sin(p.x * 2.2 + uTime * 1.2 + p.y * 1.6);
          float swell2 = cos(p.y * 2.4 - uTime * 1.0 + p.x * 1.3);
          float pattern = (swell1 + swell2) * 0.5;

          // 3. Chromatic turquoise gradient: luminous aqua near coast, deep sapphire turquoise in the deep sea
          float shallowCoastFactor = (1.0 - smoothstep(136.0, 168.0, distToIsland));
          float depthMix = clamp(smoothstep(-0.35, 0.70, pattern) + shallowCoastFactor * 0.55, 0.0, 1.0);
          vec3 col = mix(uDeepColor, uShallowColor, depthMix);

          // 4. Dynamic surf breakers & foam wash at the Savannah beach
          float coastPerturb = sin(angle * 7.0 + sin(angle * 13.0) * 0.6) * 3.2;
          float effDist = distToIsland + coastPerturb;

          float waveRoll1 = sin(uTime * 2.3 - effDist * 0.48);
          float waveRoll2 = sin(uTime * 1.9 - effDist * 0.35 + 2.1);

          float surfZone = (1.0 - smoothstep(150.0, 170.0, distToIsland)) * smoothstep(136.0, 142.0, distToIsland);
          float surfWaveFoam1 = smoothstep(0.35, 0.85, waveRoll1) * surfZone;
          float surfWaveFoam2 = smoothstep(0.40, 0.88, waveRoll2) * surfZone * 0.75;

          // Dense shore swash ribbon washing over coastal sands
          float shoreContactDist = distToIsland - 137.0;
          float shoreWash = sin(uTime * 1.8 + coastPerturb * 0.35) * 1.4;
          float maxShoreWash = max(7.5 + shoreWash, 0.8);
          float shoreContactFoam = (1.0 - smoothstep(0.2, maxShoreWash, shoreContactDist)) * 1.3;

          // Froth lace & caustic bubble details
          float laceUv = sin((vWorldPosition.x * 2.2 + vWorldPosition.z * 1.7) + uTime * 1.4) *
                         cos((vWorldPosition.z * 2.0 - vWorldPosition.x * 1.5) - uTime * 1.2);
          float laceFactor = smoothstep(-0.25, 0.65, laceUv) * 0.35 + 0.65;

          // Open sea whitecaps
          float openSeaFoam = smoothstep(0.72, 0.95, pattern) * 0.35 * smoothstep(155.0, 185.0, distToIsland);

          float totalCoastFoam = (surfWaveFoam1 + surfWaveFoam2 + shoreContactFoam) * laceFactor * uFoamIntensity;
          float totalFoam = clamp(totalCoastFoam + openSeaFoam, 0.0, 1.0);

          col = mix(col, uFoamColor, totalFoam * 0.95);
          if (totalFoam > 0.25) {
            col += uFoamColor * ((totalFoam - 0.25) * 0.45);
          }

          // 5. Toon specular highlight under the desert sun
          if (uToonSpecEnabled > 0.5) {
            vec3 lightDir = normalize(vec3(0.65, 0.75, -0.45));
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            vec3 halfVector = normalize(lightDir + viewDir + vec3(0.0001));
            float NdotH = clamp(dot(normalize(vNormal), halfVector), 0.0, 1.0);
            float toonSpec = smoothstep(0.93, 0.985, NdotH) * 0.35;
            col += vec3(toonSpec);
          }

          gl_FragColor = vec4(col, uOpacity * shoreAlpha);
          #include <fog_fragment>
        }
      `
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, this.oceanMaterial);
    this.oceanMesh.position.set(0, 0.45, 0);
    this.oceanMesh.name = 'SavannaOceanMesh';
    this.oceanMesh.frustumCulled = false;
    this.oceanMesh.renderOrder = 0;
    this.group.add(this.oceanMesh);
  }

  createOasisFishes() {
    const fishCount = 6;
    const fishGeo = new THREE.ConeGeometry(0.18, 0.7, 4);
    fishGeo.rotateX(Math.PI / 2);

    const fishMat = new THREE.MeshBasicMaterial({
      color: 0x063942,
      transparent: true,
      opacity: 0.65
    });

    const rng = createSeededRandom(91823);

    for (let i = 0; i < fishCount; i++) {
      const mesh = new THREE.Mesh(fishGeo, fishMat);
      const angle = (i / fishCount) * Math.PI * 2 + rng() * 0.5;
      const poolR = this.terrain && this.terrain.oasisPoolRadius ? this.terrain.oasisPoolRadius : 15.5;
      const orbitRadius = (4.0 + rng() * 7.5) * Math.min(1.0, (poolR - 2.0) / 11.5);
      const speed = 0.5 + rng() * 0.4;

      mesh.position.set(
        14.0 + Math.cos(angle) * orbitRadius,
        this.oasisLevel - 0.25, // submerged in oasis
        -12.0 + Math.sin(angle) * orbitRadius
      );
      this.group.add(mesh);

      this.fishes.push({
        mesh,
        angle,
        orbitRadius,
        speed,
        baseY: this.oasisLevel - 0.25
      });
    }
  }

  createOasisReeds() {
    // Instanced bulrushes along oasis shoreline
    const count = 35;
    const reedGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.8, 4);
    reedGeo.translate(0, 0.9, 0);

    const reedMat = new THREE.MeshLambertMaterial({
      color: 0x5a8a3a
    });

    const instMesh = new THREE.InstancedMesh(reedGeo, reedMat, count);
    const dummy = new THREE.Object3D();
    const rng = createSeededRandom(44719);

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const poolR = this.terrain && this.terrain.oasisPoolRadius ? this.terrain.oasisPoolRadius : 14.5;
      const r = poolR - 0.6 + rng() * 2.8; // Shoreline band
      const x = 14.0 + Math.cos(angle) * r;
      const z = -12.0 + Math.sin(angle) * r;
      const y = this.terrain ? this.terrain.getHeight(x, z) : 11.2;

      dummy.position.set(x, y, z);
      dummy.scale.set(0.8 + rng() * 0.4, 0.7 + rng() * 0.6, 0.8 + rng() * 0.4);
      dummy.rotation.set((rng() - 0.5) * 0.15, rng() * Math.PI * 2, (rng() - 0.5) * 0.15);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }

    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.receiveShadow = true;
    this.reedsGroup.add(instMesh);
  }

  update(delta) {
    this.time += delta;

    if (this.oasisMaterial) {
      this.oasisMaterial.uniforms.uTime.value = this.time;
    }
    if (this.oceanMaterial) {
      this.oceanMaterial.uniforms.uTime.value = this.time;
    }

    // Fish swim orbits
    for (let i = 0; i < this.fishes.length; i++) {
      const f = this.fishes[i];
      f.angle += delta * f.speed;
      const x = 14.0 + Math.cos(f.angle) * f.orbitRadius;
      const z = -12.0 + Math.sin(f.angle) * f.orbitRadius;
      f.mesh.position.set(x, f.baseY, z);
      f.mesh.rotation.y = -f.angle + Math.PI / 2;
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
