// StylizedTrees.js - 4 Corner Trees with Volumetric Foliage & 3-Layer Canopy Wind Sway
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';

const TRUNK_SCALE = 12.0;

export const TREE_LAYOUT = [];


function generateTreeLayoutForZone(gx, gy) {
  TREE_LAYOUT.length = 0; // clear existing

  // Special handcrafted Zen Sanctuary layout for Dojo Zone [2, 2]
  if (gx === 2 && gy === 2) {
    const dojoTrees = [
      // --- Japanese Autumn Red Maple Trees (Momiji) ---
      // 1. West of Dojo Pagoda & Master Paladill (framing the main courtyard)
      {
        position: [-21.5, 0, -14.5],
        rotationY: 0.85,
        scale: 1.18,
        variant: 'maple_red'
      },

      // 3. North-East Riverbank (overlooking stepping stones from east bank)
      {
        position: [18.5, 0, -13.5],
        rotationY: 1.4,
        scale: 1.12,
        variant: 'maple_red'
      },
      // 4. South-East Riverbank & Meadow
      {
        position: [20.5, 0, 17.5],
        rotationY: 3.8,
        scale: 1.22,
        variant: 'maple_red'
      },
      // 5. South-West Entrance Path framing
      {
        position: [-18.5, 0, 22.0],
        rotationY: 0.45,
        scale: 1.00,
        variant: 'maple_red'
      },

      // --- Lush Green Forest Trees (providing natural depth and contrast) ---
      // 6. Far North-West behind bamboo grove
      {
        position: [-29.5, 0, -23.0],
        rotationY: 1.1,
        scale: 1.25,
        variant: 'green'
      },
      // 7. Far West boundary
      {
        position: [-32.0, 0, -11.0],
        rotationY: 2.7,
        scale: 1.05,
        variant: 'green'
      },
      // 8. Far North-East corner (East of river)
      {
        position: [26.5, 0, -24.5],
        rotationY: 0.3,
        scale: 1.15,
        variant: 'green'
      },
      // 9. Far East boundary
      {
        position: [28.5, 0, 7.5],
        rotationY: 4.2,
        scale: 1.10,
        variant: 'green'
      },
      // 10. Far South-West corner
      {
        position: [-29.5, 0, 26.5],
        rotationY: 1.9,
        scale: 1.15,
        variant: 'green'
      },
      // 11. Far South-East corner
      {
        position: [16.5, 0, 28.5],
        rotationY: 3.1,
        scale: 1.08,
        variant: 'green'
      }
    ];

    dojoTrees.forEach(t => TREE_LAYOUT.push(t));
    return;
  }

  let seed = gx * 1337 + gy * 7331 + 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const corners = [
    { name: 'NW', cx: -24, cz: -24 },
    { name: 'NE', cx:  24, cz: -24 },
    { name: 'SW', cx: -24, cz:  24 },
    { name: 'SE', cx:  24, cz:  24 }
  ];

  corners.forEach(corner => {
    const treeCount = Math.floor(rand() * 3) + 1; // 1 to 3 trees per corner
    for (let i = 0; i < treeCount; i++) {
        const trPx = corner.cx + (rand() - 0.5) * 18.0;
        const trPz = corner.cz + (rand() - 0.5) * 18.0;
        
        // Keep clear of the river corridor
        if (Math.abs(trPx - 8.5) < 7.0 && gy >= 1 && gy <= 5) continue; 
        // Keep clear of central path/dojo cross
        if (Math.abs(trPx) < 4.5 && Math.abs(trPz) < 4.5) continue;
        // Keep clear of pond in Zone [2, 3] at [29.4, -16.2]
        if (gx === 2 && gy === 3 && Math.hypot(trPx - 29.4, trPz - (-16.2)) < 6.5) continue;

        let variant = 'green';
        const isForest = (gx >= 2 && gx <= 4 && gy >= 2 && gy <= 4);
        if (isForest) {
          if (gx === 2 && gy === 2) {
            // Claro Silvestre de las Flores: golden birch and lush green trees
            variant = rand() > 0.45 ? 'golden' : 'green';
          } else if (gx === 2 && gy === 3) {
            // Pradera Occidental: golden and green trees
            variant = rand() > 0.55 ? 'golden' : 'green';
          } else {
            // Other forest zones: autumn red maples and lush green trees
            variant = rand() > 0.48 ? 'maple_red' : 'green';
          }
        }

        TREE_LAYOUT.push({
            position: [trPx, 0, trPz],
            rotationY: rand() * Math.PI * 2,
            scale: 0.70 + rand() * 0.55,
            variant: variant
        });
    }
  });

  if (TREE_LAYOUT.length < 2) {
    TREE_LAYOUT.push({ position: [-26, 0, -26], rotationY: 0, scale: 1.0, variant: 'green' });
    TREE_LAYOUT.push({ position: [26, 0, 26], rotationY: 1, scale: 1.0, variant: 'maple_red' });
  }
}

// Pre-populate layout for starting Zone [3, 3] so dependent foliage systems receive valid layout immediately
generateTreeLayoutForZone(3, 3);


const BUSH_INSTANCES = [
  { pos: [-0.47, 7.59, 0.48], yaw: 0.0, scale: 0.85 },
  { pos: [-3.87, 6.79, -4.47], yaw: 1.3, scale: 0.76 },
  { pos: [-2.08, 10.5, 0.18], yaw: 2.5, scale: 0.9 },
];

export class StylizedTrees {
  constructor(textures, config = {}) {
    this.textures = textures;
    this.config = {
      windStrength: 0.25,
      windSpeed: 2.70,
      windAngle: 45.0,
      gustScale: 0.50,
      turbulence: 0.42,
      flutter: 0.28,
      treeSway: 3.00,
      ...config
    };

    this.group = new THREE.Group();
    this.uniforms = null;
    this.foliageMaterials = [];
    this.trunkClones = [];
    this.foliageMeshes = [];
  }

  async load() {
    const loader = new GLTFLoader();
    const texLoader = new THREE.TextureLoader();

    const [trunkGltf, leavesGltf, alphaMap] = await Promise.all([
      loader.loadAsync('./assets/stylized/tree-tronk.glb'),
      loader.loadAsync('./assets/stylized/tree-leaves-mesh.glb'),
      texLoader.loadAsync('./assets/stylized/leaves-alpha-map.png')
    ]);

    alphaMap.colorSpace = THREE.NoColorSpace;
    this.cachedTrunkModel = trunkGltf.scene;
    this.cachedLeafBaseGeometry = leavesGltf.scene.children[0].geometry;
    this.cachedAlphaMap = alphaMap;
    alphaMap.flipY = false;
    alphaMap.needsUpdate = true;

    // Extract trunk model
    let trunkModel = trunkGltf.scene;
    trunkModel.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) {
          // Fix black trunk: glTF default metalness: 1 renders black without an envmap
          o.material.metalness = 0.0;
          o.material.roughness = 0.85;
          if (o.material.map) {
            o.material.map.colorSpace = THREE.SRGBColorSpace;
            o.material.map.needsUpdate = true;
          }
        }
      }
    });

    // Extract leaf mesh geometry
    let leafBaseGeometry = null;
    leavesGltf.scene.traverse((o) => {
      if (!leafBaseGeometry && o.isMesh) {
        leafBaseGeometry = o.geometry;
      }
    });

    if (!leafBaseGeometry) {
      throw new Error('[StylizedTrees] Could not find leaf geometry');
    }

    leafBaseGeometry.computeBoundingBox();
    const leafBox = leafBaseGeometry.boundingBox;
    // Store as instance properties so _buildTrees() can access them from setZone() too
    this.leafBaseY = leafBox.min.y;
    this.leafHeight = leafBox.max.y - leafBox.min.y;
    this.leafLocalCenter = leafBox.getCenter(new THREE.Vector3());

    // Uniforms shared by all tree canopies
    this.uniforms = {
      uTime: { value: 0 },
      uWindStrength: { value: this.config.windStrength },
      uWindSpeed: { value: this.config.windSpeed },
      uWindAngle: { value: (this.config.windAngle * Math.PI) / 180.0 },
      uGustScale: { value: this.config.gustScale },
      uTurbulence: { value: this.config.turbulence },
      uFlutter: { value: this.config.flutter },
      uTreeSway: { value: this.config.treeSway },
      uNoiseMap: { value: this.textures.noiseMap },
      uSnowAmount: { value: 0.0 },
      uDualToneAmount: { value: 0.0 },
      uCanopyBaseColor: { value: new THREE.Color(0xFCA6B0) },
      uCanopyShadowColor: { value: new THREE.Color(0xB66C8A) }
    };

    this._buildTrees();
    return this.group;
  }

  _disposeCurrentTrees() {
    const preservedGeometries = new Set();
    if (this.cachedLeafBaseGeometry) preservedGeometries.add(this.cachedLeafBaseGeometry);
    if (this.cachedTrunkModel) {
      this.cachedTrunkModel.traverse((c) => {
        if (c.geometry) preservedGeometries.add(c.geometry);
      });
    }

    this.group.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry && !preservedGeometries.has(child.geometry)) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m && m.dispose && m.dispose());
          } else if (child.material.dispose) {
            child.material.dispose();
          }
        }
      }
    });

    this.group.clear();
    this.trunkClones = [];
    this.foliageMeshes = [];
    this.foliageMaterials = [];
  }

  _buildTrees() {
    this._disposeCurrentTrees();
    const trunkModel = this.cachedTrunkModel;
    const leafBaseGeometry = this.cachedLeafBaseGeometry;
    const alphaMap = this.cachedAlphaMap;
    if (!trunkModel || !leafBaseGeometry) return;

    // Build trees based on layout
    TREE_LAYOUT.forEach((treeDef, treeIdx) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(...treeDef.position);
      treeGroup.rotation.y = treeDef.rotationY;
      treeGroup.scale.setScalar(treeDef.scale);

      // 1. Trunk
      const trunkClone = trunkModel.clone(true);
      trunkClone.traverse((o) => {
        if (o.isMesh && o.material) {
          o.material = o.material.clone();
          if (treeDef.trunkColor) {
            o.material.color.set(treeDef.trunkColor);
          } else if (treeDef.variant === 'maple_red') {
            o.material.color.set(0x563422); // Warm rich dark chestnut bark for Japanese maple
          }
        }
      });
      trunkClone.scale.setScalar(TRUNK_SCALE);
      treeGroup.add(trunkClone);
      this.trunkClones.push(trunkClone);

      // 2. Canopy with 3 instanced bushes
      const count = BUSH_INSTANCES.length;
      const geom = leafBaseGeometry.clone();

      const origin = new Float32Array(count * 2);
      const facing = new Float32Array(count * 2);
      const center = new Float32Array(count * 3);
      const span = new Float32Array(count * 2);

      const [posX, posY, posZ] = treeDef.position;
      const rotY = treeDef.rotationY;
      const tScale = treeDef.scale;
      const cosG = Math.cos(rotY);
      const sinG = Math.sin(rotY);
      const up = new THREE.Vector3(0, 1, 0);

      const instancedMesh = new THREE.InstancedMesh(geom, null, count);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      instancedMesh.frustumCulled = false;

      const dummy = new THREE.Object3D();

      BUSH_INSTANCES.forEach((b, i) => {
        dummy.position.set(...b.pos);
        dummy.rotation.set(0, b.yaw, 0);
        dummy.scale.setScalar(b.scale);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);

        // World XZ origin for travelling wind gust
        const ox = b.pos[0] * tScale;
        const oz = b.pos[2] * tScale;
        origin[i * 2 + 0] = posX + ox * cosG + oz * sinG;
        origin[i * 2 + 1] = posZ - ox * sinG + oz * cosG;

        const totalYaw = rotY + b.yaw;
        facing[i * 2 + 0] = Math.cos(totalYaw);
        facing[i * 2 + 1] = Math.sin(totalYaw);

        // Spherical center for volumetric normal shading
        const c = this.leafLocalCenter.clone()
          .multiplyScalar(b.scale)
          .applyAxisAngle(up, b.yaw)
          .add(new THREE.Vector3(...b.pos))
          .multiplyScalar(tScale)
          .applyAxisAngle(up, rotY)
          .add(new THREE.Vector3(posX, posY, posZ));

        center[i * 3 + 0] = c.x;
        center[i * 3 + 1] = c.y;
        center[i * 3 + 2] = c.z;

        span[i * 2 + 0] = b.pos[1] + b.scale * this.leafBaseY;
        span[i * 2 + 1] = b.scale * this.leafHeight;
      });
      instancedMesh.instanceMatrix.needsUpdate = true;

      geom.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(origin, 2));
      geom.setAttribute('aFacing', new THREE.InstancedBufferAttribute(facing, 2));
      geom.setAttribute('aCenter', new THREE.InstancedBufferAttribute(center, 3));
      geom.setAttribute('aSpan', new THREE.InstancedBufferAttribute(span, 2));

      // Tree color parameters based on variant
      const isMaple = (treeDef.variant === 'maple_red');
      const isGolden = (treeDef.variant === 'golden');
      const isCustomCanopy = isMaple || isGolden || !!treeDef.canopyBaseColor || (treeDef.color !== undefined);

      const mainColor = treeDef.color !== undefined
        ? treeDef.color
        : (isMaple ? 0xCB3924 : (isGolden ? 0xE0A328 : 0x38b44a));

      const dualToneAmt = (treeDef.dualToneAmount !== undefined)
        ? treeDef.dualToneAmount
        : ((isMaple || isGolden) ? 1.0 : this.uniforms.uDualToneAmount.value);

      const canopyBaseCol = treeDef.canopyBaseColor
        ? new THREE.Color(treeDef.canopyBaseColor)
        : (isMaple ? new THREE.Color(0xDF4626) : (isGolden ? new THREE.Color(0xF2B93B) : this.uniforms.uCanopyBaseColor.value.clone()));

      const canopyShadowCol = treeDef.canopyShadowColor
        ? new THREE.Color(treeDef.canopyShadowColor)
        : (isMaple ? new THREE.Color(0x6A1515) : (isGolden ? new THREE.Color(0x8C5A14) : this.uniforms.uCanopyShadowColor.value.clone()));

      const highlightCol = treeDef.highlightColor
        ? new THREE.Color(treeDef.highlightColor)
        : (isMaple ? new THREE.Color(0xF5A82E) : (isGolden ? new THREE.Color(0xFFE57F) : new THREE.Color(0x000000)));

      const highlightAmt = (treeDef.highlightAmount !== undefined)
        ? treeDef.highlightAmount
        : ((isMaple || isGolden) ? 0.85 : 0.0);

      // Leaf material with canopy sway and spherical normals
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: mainColor,
        alphaMap: alphaMap,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.0
      });

      leafMaterial.userData = {
        isCustomCanopy: isCustomCanopy,
        variant: treeDef.variant || 'green'
      };

      const treeUniforms = {
        uTime: this.uniforms.uTime,
        uWindStrength: this.uniforms.uWindStrength,
        uWindSpeed: this.uniforms.uWindSpeed,
        uWindAngle: this.uniforms.uWindAngle,
        uGustScale: this.uniforms.uGustScale,
        uTurbulence: this.uniforms.uTurbulence,
        uFlutter: this.uniforms.uFlutter,
        uTreeSway: this.uniforms.uTreeSway,
        uNoiseMap: this.uniforms.uNoiseMap,
        uSnowAmount: this.uniforms.uSnowAmount,
        uDualToneAmount: { value: dualToneAmt },
        uCanopyBaseColor: { value: canopyBaseCol },
        uCanopyShadowColor: { value: canopyShadowCol },
        uCanopyHighlightColor: { value: highlightCol },
        uCanopyHighlightAmount: { value: highlightAmt }
      };
      leafMaterial._treeUniforms = treeUniforms;

      leafMaterial.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, treeUniforms);

        shader.vertexShader = `
          attribute vec2 aOrigin;
          attribute vec2 aFacing;
          attribute vec3 aCenter;
          attribute vec2 aSpan;
          uniform float uTime;
          uniform float uWindStrength;
          uniform float uWindSpeed;
          uniform float uWindAngle;
          uniform float uGustScale;
          uniform float uTurbulence;
          uniform float uFlutter;
          uniform float uTreeSway;
          uniform sampler2D uNoiseMap;

          varying vec3 vLeafWorldPos;
          varying vec3 vLeafCenter;
          varying vec3 vLeafWorldNormal;
          ${shader.vertexShader}
        `;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>

          vLeafCenter = aCenter;

          float t = clamp((position.y - aSpan.x) / aSpan.y, 0.0, 1.0);
          float trunkWeight = mix(0.4, 1.0, t);
          float windGate = clamp(uWindStrength * 4.0, 0.0, 1.0);

          float clumpPhase = texture2D(uNoiseMap, position.xz * 0.5 + 0.5).r * 6.28318;
          float phase = clumpPhase + fract(sin(float(gl_InstanceID) * 19.123) * 43758.5453) * 6.28318;

          float wobble = sin(uTime * uWindSpeed * 0.5 + phase) * uTurbulence * 0.5;
          float angle = uWindAngle + wobble;
          vec2 windDir = vec2(cos(angle), sin(angle));
          vec2 perpDir = vec2(-windDir.y, windDir.x);

          float along = dot(aOrigin, windDir);
          float noiseJitter = (texture2D(uNoiseMap, aOrigin * 0.03).r - 0.5) * 2.0;
          float gustPhase = along * uGustScale - uTime * uWindSpeed * 0.6 + noiseJitter * 1.5;
          float gust = pow(sin(gustPhase) * 0.5 + 0.5, 1.6);

          // 1. Trunk flex
          float trunkAmp = clamp(uWindStrength * (gust * 0.8 + 0.35) * uTreeSway * 2.0, 0.0, 1.0);
          vec2 trunk = windDir * (trunkAmp * trunkWeight);

          // 2. Branch oscillation
          float branchAlong = sin(uTime * uWindSpeed * 1.15 + phase * 3.0);
          float branchAcross = sin(uTime * uWindSpeed * 0.85 + phase * 5.0 + 1.7);
          float branchAmp = (0.25 + gust * 0.35) * uTreeSway * 0.5 * windGate * mix(0.6, 1.0, t);
          vec2 branch = (windDir * (branchAlong * 0.6) + perpDir * (branchAcross * 0.4)) * branchAmp;

          // 3. Leaf flutter
          float flutterOsc = sin(uTime * 7.0 + phase * 7.0 + position.y * 2.0);
          float flutterAmt = flutterOsc * uFlutter * 0.06 * windGate * mix(0.3, 1.0, t);

          vec2 horiz = trunk + branch + perpDir * flutterAmt;
          float cosY = aFacing.x;
          float sinY = aFacing.y;
          vec3 localSway = vec3(
            horiz.x * cosY - horiz.y * sinY,
            sin(uTime * uWindSpeed * 0.7 + phase) * 0.05 * uTreeSway * windGate - trunkAmp * 0.12 * trunkWeight,
            horiz.x * sinY + horiz.y * cosY
          );

          transformed += localSway;
          #ifdef USE_INSTANCING
            vLeafWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
            vLeafWorldNormal = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
          #else
            vLeafWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
            vLeafWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          #endif
          `
        );

        shader.fragmentShader = `
          varying vec3 vLeafWorldPos;
          varying vec3 vLeafCenter;
          varying vec3 vLeafWorldNormal;
          uniform float uSnowAmount;
          uniform float uDualToneAmount;
          uniform vec3 uCanopyBaseColor;
          uniform vec3 uCanopyShadowColor;
          uniform vec3 uCanopyHighlightColor;
          uniform float uCanopyHighlightAmount;
          ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_begin>',
          `
          #include <normal_fragment_begin>
          // Volumetric spherical normal shading
          vec3 sphereNormalWorld = normalize(vLeafWorldPos - vLeafCenter);
          sphereNormalWorld.y = max(sphereNormalWorld.y, 0.25);
          sphereNormalWorld = normalize(sphereNormalWorld);
          normal = normalize((viewMatrix * vec4(sphereNormalWorld, 0.0)).xyz);
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          vec3 leafSphereNorm = normalize(vLeafWorldPos - vLeafCenter);

          // Volumetric Dual-Tone shading (#DF4626 lit canopy, #6A1515 shaded undersides)
          if (uDualToneAmount > 0.001) {
            float dualToneBlend = smoothstep(-0.35, 0.45, leafSphereNorm.y);
            vec3 tone = mix(uCanopyShadowColor, uCanopyBaseColor, dualToneBlend);

            // Subtle golden-amber autumn foliage flecks on sunlit leaves
            if (uCanopyHighlightAmount > 0.001) {
              float fleck = sin(vLeafWorldPos.x * 4.2 + vLeafWorldPos.y * 5.1) * cos(vLeafWorldPos.z * 4.7 + vLeafWorldPos.y * 3.3);
              if (fleck > 0.60 && leafSphereNorm.y > 0.05) {
                tone = mix(tone, uCanopyHighlightColor, uCanopyHighlightAmount);
              }
            }
            diffuseColor.rgb = mix(diffuseColor.rgb, tone, uDualToneAmount);
          }

          float sphereSnow = smoothstep(-0.10, 0.35, leafSphereNorm.y);
          float faceSnow = smoothstep(0.15, 0.65, vLeafWorldNormal.y);
          float snowFactor = clamp(max(sphereSnow, faceSnow * 0.9) * 1.1, 0.0, 1.0) * uSnowAmount;
          vec3 snowColor = vec3(0.953, 0.953, 0.965); // #F3F3F6
          diffuseColor.rgb = mix(diffuseColor.rgb, snowColor, snowFactor * 0.95);
          `
        );
      };

      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      instancedMesh.material = leafMaterial;
      this.foliageMaterials.push(leafMaterial);
      this.foliageMeshes.push(instancedMesh);
      treeGroup.add(instancedMesh);

      this.group.add(treeGroup);
    });

    return this.group;
  }

  setSnowAmount(amount) {
    if (this.uniforms && this.uniforms.uSnowAmount) {
      this.uniforms.uSnowAmount.value = amount;
    }
  }

  setDualTone(amount, baseColorHex = null, shadowColorHex = null) {
    if (this.uniforms) {
      if (this.uniforms.uDualToneAmount) {
        this.uniforms.uDualToneAmount.value = amount;
      }
      if (this.uniforms.uCanopyBaseColor && baseColorHex != null) {
        this.uniforms.uCanopyBaseColor.value.set(baseColorHex);
      }
      if (this.uniforms.uCanopyShadowColor && shadowColorHex != null) {
        this.uniforms.uCanopyShadowColor.value.set(shadowColorHex);
      }
    }
    // Update any non-custom foliage materials
    for (const mesh of this.foliageMeshes) {
      if (mesh && mesh.material && (!mesh.material.userData || !mesh.material.userData.isCustomCanopy)) {
        if (mesh.material._treeUniforms) {
          mesh.material._treeUniforms.uDualToneAmount.value = amount;
          if (baseColorHex != null) mesh.material._treeUniforms.uCanopyBaseColor.value.set(baseColorHex);
          if (shadowColorHex != null) mesh.material._treeUniforms.uCanopyShadowColor.value.set(shadowColorHex);
        }
      }
    }
  }

  setLeafless(isLeafless) {
    for (const mesh of this.foliageMeshes) {
      if (mesh) {
        mesh.visible = !isLeafless;
      }
    }
  }

  setZone(gx, gy, collisionsManager) {
    const isForest = (gx === 2 && gy === 2);
    this.group.visible = isForest;

    if (collisionsManager) {
      collisionsManager.removeCirclesByTag('forest_tree');
      if (isForest) {
        TREE_LAYOUT.forEach((treeDef, idx) => {
          collisionsManager.addCircle(treeDef.position[0], treeDef.position[2], 1.25 * treeDef.scale, 'forest_tree_' + idx);
        });
      }
    }

    if (isForest) {
      if (!this.treesBuilt || this.group.children.length === 0) {
        if (generateTreeLayoutForZone) generateTreeLayoutForZone(gx, gy);
        if (this.cachedTrunkModel) {
          this._buildTrees();
          this.treesBuilt = true;
        }
      }
    }
  }

  setTrunkColor(colorHex) {
    for (let i = 0; i < this.trunkClones.length; i++) {
      const trunk = this.trunkClones[i];
      const treeDef = TREE_LAYOUT[i];
      if (trunk) {
        trunk.traverse((o) => {
          if (o.isMesh && o.material) {
            if (colorHex != null) {
              o.material.color.set(colorHex);
            } else if (treeDef && treeDef.trunkColor) {
              o.material.color.set(treeDef.trunkColor);
            } else if (treeDef && treeDef.variant === 'maple_red') {
              o.material.color.set(0x563422);
            } else {
              o.material.color.set(0xffffff);
            }
          }
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
