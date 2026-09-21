import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import { TorchFlameGPU } from './TorchFlameGPU.js';

export class DojoBuilding {
  constructor(scene, collisions = null) {
    this.scene = scene;
    this.collisions = collisions;

    this.group = new THREE.Group();
    this.group.name = 'dojo_building';
    this.group.visible = false;
    this.scene.add(this.group);

    this.model = null;
    this.lanternModel = null;
    this.torchModel = null;
    this.torchFlame = null;
    this.isLoaded = false;

    // Configurable placement parameters for main Dojo Pagoda
    this.config = {
      x: -10.5,
      y: -0.22, // Grounded slightly so foundation posts firmly penetrate the soil
      z: -15.5,
      rotationY: Math.PI * 0.5, // Entrance faces south towards player
      scale: 2.9 // Larger monumental scale
    };

    // Configurable placement parameters for Asian Lantern
    this.lanternConfig = {
      x: -7.7,
      y: 0.0,
      z: -6.0,
      scale: 1.5,
      rotationY: 0.0
    };

    // Configurable placement parameters for Asian Torch with GPU Flame
    this.torchConfig = {
      x: -21.1,
      y: 0.0,
      z: 19.6,
      scale: 1.35,
      rotationY: 0.0
    };

    this.collisionTag = 'dojo_building';
    this.lanternCollisionTag = 'dojo_lantern';
    this.torchCollisionTag = 'dojo_torch';
  }

  async init() {
    await Promise.all([
      this._loadBuilding(),
      this._loadLantern(),
      this._loadTorch()
    ]);

    this.isLoaded = true;
    console.log('[DojoBuilding] Dojo Pagoda & Asian Lantern loaded and positioned successfully.');

    // Expose to window for rapid dev tuning if needed
    if (typeof window !== 'undefined') {
      window.__dojoBuilding = this;
    }
  }

  async _loadBuilding() {
    console.log('[DojoBuilding] Loading stylized_dojo.glb...');
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync('./assets/models/stylized_dojo.glb');
      const root = gltf.scene || gltf.scenes[0];

      // Measure original bounding box to normalize orientation and ground level
      const initialBox = new THREE.Box3().setFromObject(root);
      const initialSize = new THREE.Vector3();
      const initialCenter = new THREE.Vector3();
      initialBox.getSize(initialSize);
      initialBox.getCenter(initialCenter);

      console.log(`[DojoBuilding] Raw Model Bounds: size=[${initialSize.x.toFixed(2)}, ${initialSize.y.toFixed(2)}, ${initialSize.z.toFixed(2)}], center=[${initialCenter.x.toFixed(2)}, ${initialCenter.y.toFixed(2)}, ${initialCenter.z.toFixed(2)}]`);

      // Center model around X and Z, and place base cleanly at Y = 0
      root.position.set(-initialCenter.x, -initialBox.min.y, -initialCenter.z);

      // Wrapper group for clean transforms
      const wrapper = new THREE.Group();
      wrapper.name = 'dojo_model_wrapper';
      wrapper.add(root);

      this.model = wrapper;

      // Enhance materials and enable shadow maps
      this._setupMaterials(root);

      this.group.add(this.model);
      this._applyTransforms();
      this._registerCollisions();
    } catch (err) {
      console.error('[DojoBuilding] Error loading stylized_dojo.glb:', err);
    }
  }

  async _loadLantern() {
    console.log('[DojoBuilding] Loading Asian Lantern (linter_asia.glb)...');
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync('./assets/environment/linter_asia.glb');
      const root = gltf.scene || gltf.scenes[0];

      // Measure original bounding box to normalize orientation and ground level
      const initialBox = new THREE.Box3().setFromObject(root);
      const initialSize = new THREE.Vector3();
      const initialCenter = new THREE.Vector3();
      initialBox.getSize(initialSize);
      initialBox.getCenter(initialCenter);

      console.log(`[DojoBuilding] Lantern Raw Bounds: size=[${initialSize.x.toFixed(2)}, ${initialSize.y.toFixed(2)}, ${initialSize.z.toFixed(2)}]`);

      // Center model around X and Z, and place base cleanly at Y = 0
      root.position.set(-initialCenter.x, -initialBox.min.y, -initialCenter.z);

      const wrapper = new THREE.Group();
      wrapper.name = 'dojo_lantern_wrapper';
      wrapper.add(root);

      // Setup shadows and materials
      root.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
            child.material.roughness = Math.min(0.9, child.material.roughness ?? 0.6);
          }
        }
      });

      // Warm lantern ambient glow
      const lanternLight = new THREE.PointLight(0xffaa44, 1.8, 4.5);
      lanternLight.position.set(0, initialSize.y * 0.55 * this.lanternConfig.scale, 0);
      wrapper.add(lanternLight);

      this.lanternModel = wrapper;
      this.group.add(this.lanternModel);

      this._applyLanternTransforms();
      this._registerLanternCollision();

      console.log('[DojoBuilding] Asian Lantern placed at [-7.7, -6.0].');
    } catch (err) {
      console.error('[DojoBuilding] Error loading linter_asia.glb:', err);
    }
  }

  async _loadTorch() {
    console.log('[DojoBuilding] Loading Asian Torch (torch_1.glb)...');
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync('./assets/environment/torch_1.glb');
      const root = gltf.scene || gltf.scenes[0];

      // Measure original bounding box
      const initialBox = new THREE.Box3().setFromObject(root);
      const initialSize = new THREE.Vector3();
      const initialCenter = new THREE.Vector3();
      initialBox.getSize(initialSize);
      initialBox.getCenter(initialCenter);

      console.log(`[DojoBuilding] Torch Raw Bounds: size=[${initialSize.x.toFixed(2)}, ${initialSize.y.toFixed(2)}, ${initialSize.z.toFixed(2)}], center=[${initialCenter.x.toFixed(2)}, ${initialCenter.y.toFixed(2)}, ${initialCenter.z.toFixed(2)}]`);

      // Center around X and Z, and place base handle firmly at ground level Y = 0
      root.position.set(-initialCenter.x, -initialBox.min.y, -initialCenter.z);

      const wrapper = new THREE.Group();
      wrapper.name = 'dojo_torch_wrapper';
      wrapper.add(root);

      // Setup shadows and materials
      root.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
            child.material.roughness = Math.min(0.9, child.material.roughness ?? 0.7);
          }
        }
      });

      // Top of torch cup is at y = initialSize.y
      const torchHeight = initialSize.y;

      // Attach GPU Shader Flame & Embers nested inside the brazier cup
      this.torchFlame = new TorchFlameGPU({ scale: 0.92 });
      this.torchFlame.group.position.set(0, torchHeight * 0.88, 0);
      wrapper.add(this.torchFlame.group);

      this.torchModel = wrapper;
      this.group.add(this.torchModel);

      this._applyTorchTransforms();
      this._registerTorchCollision();

      console.log('[DojoBuilding] Asian Torch standing upright with GPU Flame placed at [-21.1, 19.6].');
    } catch (err) {
      console.error('[DojoBuilding] Error loading torch_1.glb:', err);
    }
  }

  _setupMaterials(root) {
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const mat = child.material;
          mat.roughness = Math.min(0.9, (mat.roughness ?? 0.6) * 1.1);
          mat.metalness = Math.max(0.0, (mat.metalness ?? 0.05));
          mat.side = THREE.DoubleSide; // Ensure all roof overhangs and wooden beams are solid
        }
      }
    });
  }

  _applyTransforms() {
    if (!this.model) return;
    this.model.position.set(this.config.x, this.config.y, this.config.z);
    this.model.rotation.y = this.config.rotationY;
    this.model.scale.set(this.config.scale, this.config.scale, this.config.scale);
  }

  _applyLanternTransforms() {
    if (!this.lanternModel) return;
    this.lanternModel.position.set(this.lanternConfig.x, this.lanternConfig.y, this.lanternConfig.z);
    this.lanternModel.rotation.y = this.lanternConfig.rotationY;
    this.lanternModel.scale.set(this.lanternConfig.scale, this.lanternConfig.scale, this.lanternConfig.scale);
  }

  _applyTorchTransforms() {
    if (!this.torchModel) return;
    this.torchModel.position.set(this.torchConfig.x, this.torchConfig.y, this.torchConfig.z);
    this.torchModel.rotation.y = this.torchConfig.rotationY;
    this.torchModel.scale.set(this.torchConfig.scale, this.torchConfig.scale, this.torchConfig.scale);
  }

  _registerCollisions() {
    if (!this.collisions) return;
    this.collisions.removeCirclesByTag(this.collisionTag);
    this.collisions.removeBoxesByTag(this.collisionTag);

    // Precise AABB box covering the main Dojo Pagoda hall
    // Building center is at x: -10.5, z: -15.5. Stairs exit toward south (z: -12 to -11).
    this.collisions.addBox(-14.7, -6.3, -19.0, -13.0, this.collisionTag);

    // Left and right porch side railings
    this.collisions.addCircle(-14.2, -12.2, 0.7, this.collisionTag);
    this.collisions.addCircle(-6.8, -12.2, 0.7, this.collisionTag);
  }

  _registerLanternCollision() {
    if (!this.collisions) return;
    this.collisions.removeCirclesByTag(this.lanternCollisionTag);
    this.collisions.addCircle(this.lanternConfig.x, this.lanternConfig.z, 0.45, this.lanternCollisionTag);
  }

  _registerTorchCollision() {
    if (!this.collisions) return;
    this.collisions.removeCirclesByTag(this.torchCollisionTag);
    this.collisions.addCircle(this.torchConfig.x, this.torchConfig.z, 0.35, this.torchCollisionTag);
  }

  setVisible(visible) {
    this.group.visible = visible;
    if (this.collisions) {
      if (visible) {
        this._registerCollisions();
        this._registerLanternCollision();
        this._registerTorchCollision();
      } else {
        this.collisions.removeCirclesByTag(this.collisionTag);
        this.collisions.removeBoxesByTag(this.collisionTag);
        this.collisions.removeCirclesByTag(this.lanternCollisionTag);
        this.collisions.removeCirclesByTag(this.torchCollisionTag);
      }
    }
  }

  // Runtime adjustment helpers for console experimentation
  setPosition(x, y, z) {
    this.config.x = x;
    this.config.y = y;
    this.config.z = z;
    this._applyTransforms();
    this._registerCollisions();
  }

  setRotationY(rad) {
    this.config.rotationY = rad;
    this._applyTransforms();
    this._registerCollisions();
  }

  setScale(s) {
    this.config.scale = s;
    this._applyTransforms();
    this._registerCollisions();
  }

  setLanternPosition(x, y, z) {
    this.lanternConfig.x = x;
    this.lanternConfig.y = y;
    this.lanternConfig.z = z;
    this._applyLanternTransforms();
    this._registerLanternCollision();
  }

  setLanternScale(s) {
    this.lanternConfig.scale = s;
    this._applyLanternTransforms();
    this._registerLanternCollision();
  }

  setLanternRotation(rad) {
    this.lanternConfig.rotationY = rad;
    this._applyLanternTransforms();
  }

  setTorchPosition(x, y, z) {
    this.torchConfig.x = x;
    this.torchConfig.y = y;
    this.torchConfig.z = z;
    this._applyTorchTransforms();
    this._registerTorchCollision();
  }

  setTorchScale(s) {
    this.torchConfig.scale = s;
    this._applyTorchTransforms();
    this._registerTorchCollision();
  }

  setTorchRotation(rad) {
    this.torchConfig.rotationY = rad;
    this._applyTorchTransforms();
  }

  update(dt) {
    if (this.torchFlame && this.group.visible) {
      this.torchFlame.update(dt);
    }
  }
}
