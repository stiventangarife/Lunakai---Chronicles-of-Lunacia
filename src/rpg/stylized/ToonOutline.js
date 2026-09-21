// ToonOutline.js - Modular Inverted Hull Toon Outline for Three.js models (Static & Skinned)
// Inspired by and compatible with Axie Infinity 3D Mixer (threejs-axie-mixer3d-public)
import * as THREE from 'three';

/**
 * GLSL Vertex Shader for Inverted Hull Outline
 * Supports THREE.SkinnedMesh, morph targets, and both view-space and world-space normal extrusion.
 */
const TOON_OUTLINE_VERTEX_SHADER = /* glsl */`
  uniform float uOutlineThickness;

  #include <common>
  #include <batching_pars_vertex>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>

  void main() {
    #include <batching_vertex>
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>

    #if defined(OUTLINE_WORLD_SPACE)
      // World-space extrusion (compatible with Unity ExtraPrePass)
      vec3 outlineNormalOS = objectNormal;
      #ifdef USE_BATCHING
        outlineNormalOS = mat3(batchingMatrix) * outlineNormalOS;
      #endif
      #ifdef USE_INSTANCING
        outlineNormalOS = mat3(instanceMatrix) * outlineNormalOS;
      #endif
      vec3 outlineNormalWS = normalize(mat3(modelMatrix) * outlineNormalOS);

      vec4 localPosition = vec4(transformed, 1.0);
      #ifdef USE_BATCHING
        localPosition = batchingMatrix * localPosition;
      #endif
      #ifdef USE_INSTANCING
        localPosition = instanceMatrix * localPosition;
      #endif
      vec4 worldPosition = modelMatrix * localPosition;
      worldPosition.xyz += outlineNormalWS * uOutlineThickness;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;

    #else
      // View-space extrusion (faithful to Axie RenderObjects ShaderGraph)
      vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_BATCHING
        mvPosition = batchingMatrix * mvPosition;
      #endif
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelViewMatrix * mvPosition;

      vec3 outlineNormalVS = transformedNormal;
      #ifdef FLIP_SIDED
        outlineNormalVS = -outlineNormalVS;
      #endif
      mvPosition.xyz += normalize(outlineNormalVS) * uOutlineThickness;
      gl_Position = projectionMatrix * mvPosition;
    #endif
  }
`;

/**
 * GLSL Fragment Shader for Inverted Hull Outline
 */
const TOON_OUTLINE_FRAGMENT_SHADER = /* glsl */`
  uniform vec3 uOutlineColor;
  uniform float uOutlineAlpha;

  void main() {
    gl_FragColor = vec4(uOutlineColor, uOutlineAlpha);
    #include <colorspace_fragment>
  }
`;

/**
 * Dedicated ShaderMaterial for Toon Outline rendering on back-faces.
 */
export class ToonOutlineMaterial extends THREE.ShaderMaterial {
  constructor(options = {}) {
    const thickness = options.thickness ?? 0.022;
    const color = (options.color !== undefined)
      ? new THREE.Color(options.color)
      : new THREE.Color(0x15161e);
    const alpha = options.alpha ?? 1.0;
    const mode = options.mode ?? 'view'; // 'view' or 'world'

    const defines = {};
    if (mode === 'world') {
      defines.OUTLINE_WORLD_SPACE = '1';
    }

    super({
      name: options.name ?? 'ToonOutlineMaterial',
      defines,
      vertexShader: TOON_OUTLINE_VERTEX_SHADER,
      fragmentShader: TOON_OUTLINE_FRAGMENT_SHADER,
      uniforms: {
        uOutlineThickness: { value: thickness },
        uOutlineColor: { value: color },
        uOutlineAlpha: { value: alpha },
      },
      side: THREE.BackSide,
      transparent: alpha < 1.0,
      depthTest: true,
      depthWrite: true,
      fog: options.fog ?? false,
      toneMapped: false,
    });

    this.mode = mode;
  }

  get thickness() {
    return this.uniforms.uOutlineThickness.value;
  }

  set thickness(val) {
    this.uniforms.uOutlineThickness.value = val;
  }

  get color() {
    return this.uniforms.uOutlineColor.value;
  }

  setColor(val) {
    this.uniforms.uOutlineColor.value.set(val);
  }

  get alpha() {
    return this.uniforms.uOutlineAlpha.value;
  }

  set alpha(val) {
    this.uniforms.uOutlineAlpha.value = val;
    this.transparent = val < 1.0;
  }
}

/**
 * Helper to copy transform and render layers between meshes
 */
function copyMeshTransform(source, target) {
  target.position.copy(source.position);
  target.rotation.copy(source.rotation);
  target.scale.copy(source.scale);
  target.quaternion.copy(source.quaternion);
  target.matrix.copy(source.matrix);
  target.matrixWorld.copy(source.matrixWorld);
  target.layers.mask = source.layers.mask;
}

/**
 * Controller class to manage Inverted Hull Toon Outline on any Object3D / GLTF hierarchy.
 */
export class ToonOutline {
  /**
   * @param {THREE.Object3D} targetRoot - The root model or mesh group (e.g. gltf.scene)
   * @param {Object} options - Configuration options
   * @param {number} [options.thickness=0.022] - Line thickness in units
   * @param {string|number|THREE.Color} [options.color=0x15161e] - Line color
   * @param {number} [options.alpha=1.0] - Line opacity
   * @param {'view'|'world'} [options.mode='view'] - Normal extrusion space
   * @param {Function} [options.filter] - Optional filter `(mesh) => boolean` to include/exclude meshes
   * @param {boolean} [options.autoApply=true] - Automatically generate outline on construct
   */
  constructor(targetRoot, options = {}) {
    if (!targetRoot || !targetRoot.isObject3D) {
      throw new Error('[ToonOutline] targetRoot must be a valid THREE.Object3D');
    }

    this.targetRoot = targetRoot;
    this.options = {
      thickness: 0.022,
      color: 0x15161e,
      alpha: 1.0,
      mode: 'view',
      autoApply: true,
      ...options,
    };

    /** @type {Array<{source: THREE.Mesh, outline: THREE.Mesh}>} */
    this.entries = [];

    // Shared material for all meshes in this outline instance
    this.material = new ToonOutlineMaterial({
      thickness: this.options.thickness,
      color: this.options.color,
      alpha: this.options.alpha,
      mode: this.options.mode,
    });

    // Reference controller on target object
    this.targetRoot.userData.toonOutline = this;

    if (this.options.autoApply) {
      this.apply();
    }
  }

  /**
   * Scans targetRoot and creates Inverted Hull outline meshes
   */
  apply() {
    this.clear();

    const meshes = [];
    this.targetRoot.traverse((child) => {
      if (child.isMesh && !child.userData.isOutlineMesh && !child.name.includes(':AxieOutline') && !child.name.includes(':ToonOutline')) {
        if (!this.options.filter || this.options.filter(child)) {
          meshes.push(child);
        }
      }
    });

    meshes.forEach((sourceMesh) => {
      let outlineMesh;

      if (sourceMesh.isSkinnedMesh) {
        // SkinnedMesh: Share geometry & bind the exact same skeleton to move in lockstep
        outlineMesh = new THREE.SkinnedMesh(sourceMesh.geometry, this.material);
        outlineMesh.bindMode = sourceMesh.bindMode;
        outlineMesh.bind(sourceMesh.skeleton, sourceMesh.bindMatrix);

        // Share morph targets if any (facial expressions, blendshapes)
        if (sourceMesh.morphTargetDictionary) {
          outlineMesh.morphTargetDictionary = sourceMesh.morphTargetDictionary;
        }
        if (sourceMesh.morphTargetInfluences) {
          outlineMesh.morphTargetInfluences = sourceMesh.morphTargetInfluences;
        }
      } else {
        // Static / Standard Mesh
        outlineMesh = new THREE.Mesh(sourceMesh.geometry, this.material);
      }

      copyMeshTransform(sourceMesh, outlineMesh);
      outlineMesh.name = `${sourceMesh.name || sourceMesh.uuid}:ToonOutline`;
      outlineMesh.castShadow = false;
      outlineMesh.receiveShadow = false;
      outlineMesh.renderOrder = (sourceMesh.renderOrder || 0) - 1;
      outlineMesh.userData.isOutlineMesh = true;
      outlineMesh.userData.sourceMesh = sourceMesh;

      // Add to parent if available, or as child of targetRoot
      if (sourceMesh.parent) {
        sourceMesh.parent.add(outlineMesh);
      } else {
        this.targetRoot.add(outlineMesh);
      }

      this.entries.push({ source: sourceMesh, outline: outlineMesh });
    });

    return this;
  }

  /**
   * Sets outline thickness dynamically
   * @param {number} thickness - e.g. 0.025
   */
  setThickness(thickness) {
    this.options.thickness = thickness;
    this.material.thickness = thickness;
  }

  /**
   * Gets outline thickness
   * @returns {number}
   */
  getThickness() {
    return this.material.thickness;
  }

  /**
   * Sets outline color dynamically
   * @param {string|number|THREE.Color} color - e.g. '#1e1b4b' or 0x000000
   */
  setColor(color) {
    this.options.color = color;
    this.material.setColor(color);
  }

  /**
   * Sets outline opacity
   * @param {number} alpha - 0.0 to 1.0
   */
  setAlpha(alpha) {
    this.options.alpha = alpha;
    this.material.alpha = alpha;
  }

  /**
   * Toggles visibility of all outline meshes
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.entries.forEach(({ outline }) => {
      outline.visible = visible;
    });
  }

  /**
   * Synchronizes transforms between source meshes and outline meshes
   */
  syncTransforms() {
    this.entries.forEach(({ source, outline }) => {
      if (source && outline) {
        copyMeshTransform(source, outline);
      }
    });
  }

  /**
   * Clears all outline meshes from the scene
   */
  clear() {
    this.entries.forEach(({ outline }) => {
      if (outline.parent) {
        outline.parent.remove(outline);
      }
    });
    this.entries = [];
  }

  /**
   * Destroys the outline controller and disposes GPU resources
   */
  dispose() {
    this.clear();
    if (this.material) {
      this.material.dispose();
    }
    if (this.targetRoot && this.targetRoot.userData.toonOutline === this) {
      delete this.targetRoot.userData.toonOutline;
    }
  }
}

/**
 * Functional convenience helper: applies Toon Outline to any model/object
 * @param {THREE.Object3D} targetRoot
 * @param {Object} [options]
 * @returns {ToonOutline}
 */
export function applyToonOutline(targetRoot, options = {}) {
  if (!targetRoot) return null;
  if (targetRoot.userData?.toonOutline) {
    targetRoot.userData.toonOutline.dispose();
  }
  return new ToonOutline(targetRoot, options);
}

/**
 * Functional convenience helper: removes Toon Outline from a model/object
 * @param {THREE.Object3D} targetRoot
 */
export function removeToonOutline(targetRoot) {
  if (targetRoot?.userData?.toonOutline) {
    targetRoot.userData.toonOutline.dispose();
  }
}

/**
 * Functional convenience helper: gets existing Toon Outline controller
 * @param {THREE.Object3D} targetRoot
 * @returns {ToonOutline|null}
 */
export function getToonOutline(targetRoot) {
  return targetRoot?.userData?.toonOutline || null;
}

if (typeof window !== 'undefined') {
  window.ToonOutlineModule = {
    ToonOutline,
    ToonOutlineMaterial,
    applyToonOutline,
    removeToonOutline,
    getToonOutline,
  };
}
