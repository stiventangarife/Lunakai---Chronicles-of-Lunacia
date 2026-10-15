// SceneManager.js - 3D Tactical Arena, Floating Island, Isometric Camera & Post-processing
import * as THREE from 'three';
import { EffectComposer } from '../../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/postprocessing/OutputPass.js';

export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 1000);
    
    this.cameraDistance = 21.0;
    this.cameraElevation = 14.5;
    this.currentDistance = 21.0;
    this.currentElevation = 14.5;
    this.timeScale = 1.0;
    this.currentAngle = (3 * Math.PI) / 4;
    this.targetAngle = (3 * Math.PI) / 4;
    this.targetLookAt = new THREE.Vector3(0, 0, 0);
    this.currentLookAt = new THREE.Vector3(0, 0, 0);
    
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.debug.checkShaderErrors = false;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.container.appendChild(this.renderer.domElement);

    this.floatingClouds = [];
    this.floatingRocks = [];

    this._initPostProcessing();
    this._initAtmosphere();
    this._initLighting();
    this._createFloatingIsland();
    this._createAtmosphericDust();

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
    this.panSpeed = 16.0;
    this.dragMode = null;
    this.prevMousePos = { x: 0, y: 0 };
    this._initEvents();

    this.updateCameraPosition(0.016, 1.0);
  }

  _initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.30,
      0.32,
      0.86
    );
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  _initAtmosphere() {
    this.scene.background = new THREE.Color(0x0284c7);
    // Linear fog: starts at distance 55 (past the island) so arena has 100% clarity
    this.scene.fog = new THREE.Fog(0xc2e2fa, 55, 240);

    // Procedural Daytime Sky Dome with solar disc, rich azure zenith and cloud sea
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 cloudSeaColor;
      uniform vec3 sunPosition;
      uniform vec3 sunColor;
      varying vec3 vWorldPosition;

      void main() {
        // View ray direction from camera to sky dome
        vec3 dir = normalize(vWorldPosition - cameraPosition);
        
        // Vertical gradient calibrated for elevated isometric camera
        vec3 sky;
        if (dir.y > -0.32) {
          float t = clamp((dir.y + 0.32) / 0.65, 0.0, 1.0);
          sky = mix(midColor, topColor, t);
        } else if (dir.y > -0.52) {
          float t = clamp((dir.y + 0.52) / 0.20, 0.0, 1.0);
          sky = mix(horizonColor, midColor, t);
        } else {
          float t = clamp((dir.y + 0.76) / 0.24, 0.0, 1.0);
          sky = mix(cloudSeaColor, horizonColor, t);
        }

        // Brilliant sun disk and atmospheric Mie scattering
        vec3 sunDir = normalize(sunPosition);
        float sunDot = max(dot(dir, sunDir), 0.0);
        
        // Solar corona / atmospheric glow
        float corona = pow(sunDot, 10.0) * 0.45;
        // Brilliant sun core
        float sunCore = pow(sunDot, 360.0) * 2.0;

        vec3 finalColor = sky + (sunColor * (corona + sunCore));
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x0369a1) },     // Deep rich sapphire sky
      midColor: { value: new THREE.Color(0x0ea5e9) },     // Vibrant anime sky blue
      horizonColor: { value: new THREE.Color(0x7dd3fc) }, // Luminous sunny horizon
      cloudSeaColor: { value: new THREE.Color(0xe0f2fe) },// Soft white cloud sea below island
      sunPosition: { value: new THREE.Vector3(16, 28, 14) },
      sunColor: { value: new THREE.Color(0xfffbeb) },
    };

    const skyGeo = new THREE.SphereGeometry(450, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    this._createFloatingClouds();
  }

  _createFloatingClouds() {
    this.floatingClouds = [];
    
    // Stylized fluffy cumulus cloud material
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.0,
      emissive: 0xdbeafe,
      emissiveIntensity: 0.22,
      flatShading: true,
    });

    // 20 cloud clusters distributed around and beneath the island
    const cloudConfigs = [
      // Cloud Sea Carpet below the island (y: -5.5 to -9.5)
      { radius: 18, y: -6.0, count: 6, scale: 2.2, speed: 0.0006 },
      { radius: 24, y: -7.5, count: 7, scale: 2.6, speed: 0.0005 },
      { radius: 30, y: -5.5, count: 6, scale: 3.0, speed: 0.00045 },
      { radius: 16, y: -6.8, count: 5, scale: 2.0, speed: 0.00065 },
      { radius: 22, y: -8.8, count: 8, scale: 3.2, speed: 0.0004 },
      { radius: 28, y: -5.8, count: 6, scale: 2.5, speed: 0.0005 },
      { radius: 34, y: -7.2, count: 7, scale: 2.9, speed: 0.0004 },
      { radius: 20, y: -6.5, count: 6, scale: 2.4, speed: 0.00055 },
      { radius: 26, y: -9.2, count: 7, scale: 3.0, speed: 0.00038 },
      { radius: 32, y: -6.2, count: 6, scale: 2.7, speed: 0.00045 },
      // Distant Horizon Clouds
      { radius: 46, y: -1.5, count: 7, scale: 4.0, speed: 0.00025 },
      { radius: 54, y: 3.5, count: 8, scale: 4.5, speed: 0.0002 },
      { radius: 50, y: 8.5, count: 6, scale: 3.8, speed: 0.00022 },
      { radius: 58, y: -0.5, count: 8, scale: 4.8, speed: 0.00018 },
      { radius: 44, y: 5.5, count: 6, scale: 3.6, speed: 0.00026 },
      { radius: 62, y: 12.5, count: 7, scale: 5.2, speed: 0.00016 },
      { radius: 48, y: -2.0, count: 6, scale: 4.2, speed: 0.00024 },
      { radius: 56, y: 6.0, count: 7, scale: 4.4, speed: 0.00019 },
      { radius: 52, y: 10.0, count: 6, scale: 3.9, speed: 0.00021 },
      { radius: 64, y: 2.0, count: 8, scale: 5.0, speed: 0.00017 },
    ];

    cloudConfigs.forEach((cfg, idx) => {
      const cloudGroup = new THREE.Group();
      const initialAngle = (idx / cloudConfigs.length) * Math.PI * 2 + (idx % 2) * 0.3;

      for (let i = 0; i < cfg.count; i++) {
        const puffRadius = (0.75 + Math.random() * 0.5) * cfg.scale;
        const puffGeo = new THREE.DodecahedronGeometry(puffRadius, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * cfg.scale * 2.3,
          (Math.random() - 0.35) * cfg.scale * 0.95,
          (Math.random() - 0.5) * cfg.scale * 1.9
        );
        puff.scale.set(1.0, 0.72, 1.0);
        cloudGroup.add(puff);
      }

      cloudGroup.position.set(
        Math.cos(initialAngle) * cfg.radius,
        cfg.y,
        Math.sin(initialAngle) * cfg.radius
      );

      cloudGroup.userData = {
        radius: cfg.radius,
        angle: initialAngle,
        speed: cfg.speed,
        baseY: cfg.y,
        phase: Math.random() * Math.PI * 2
      };

      this.scene.add(cloudGroup);
      this.floatingClouds.push(cloudGroup);
    });
  }

  _initLighting() {
    // 1. Soft ambient light for controlled shadow depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.28);
    this.scene.add(ambientLight);

    // 2. Natural two-tone hemisphere light: Sky diffuse + warm meadow bounce
    this.hemiLight = new THREE.HemisphereLight(0x70b4ff, 0x425e36, 0.75);
    this.hemiLight.position.set(0, 40, 0);
    this.scene.add(this.hemiLight);

    // 3. Sun Key Light: Warm golden sunlight with crisp PCF soft shadows
    this.sunLight = new THREE.DirectionalLight(0xfff6ea, 2.8);
    this.sunLight.position.set(16, 28, 14);
    this.sunLight.target.position.set(0, 0, 0);
    this.scene.add(this.sunLight.target);

    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 70;
    
    // Tight frustum centered on 10x10 arena
    const d = 14;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.shadow.camera.updateProjectionMatrix();
    this.scene.add(this.sunLight);

    // 4. Three-Point Rim / Kick Light: Silhouette backlight making Axies pop in 3D
    this.rimLight = new THREE.DirectionalLight(0xa5d8ff, 1.25);
    this.rimLight.position.set(-20, 16, -18);
    this.scene.add(this.rimLight);

    // 5. Fill Light: Soft warm fill from side
    this.fillLight = new THREE.DirectionalLight(0xffecd0, 0.32);
    this.fillLight.position.set(-15, 20, 14);
    this.scene.add(this.fillLight);
  }

  applyBiome(biome) {
    if (!biome) return;
    this.currentBiome = biome;

    // 1. Skybox atmospheric uniforms
    if (this.skyUniforms && biome.skybox) {
      if (biome.skybox.topColor) this.skyUniforms.topColor.value.copy(biome.skybox.topColor);
      if (biome.skybox.midColor) this.skyUniforms.midColor.value.copy(biome.skybox.midColor);
      if (biome.skybox.horizonColor) this.skyUniforms.horizonColor.value.copy(biome.skybox.horizonColor);
      if (biome.skybox.cloudSeaColor) this.skyUniforms.cloudSeaColor.value.copy(biome.skybox.cloudSeaColor);
      if (biome.skybox.sunColor) this.skyUniforms.sunColor.value.copy(biome.skybox.sunColor);
      if (biome.skybox.sunPosition) this.skyUniforms.sunPosition.value.copy(biome.skybox.sunPosition);
    }

    // 2. Atmospheric Fog & Background
    if (this.scene.fog && biome.fog) {
      this.scene.fog.color.setHex(biome.fog.color);
      this.scene.fog.near = biome.fog.near;
      this.scene.fog.far = biome.fog.far;
      this.scene.background.setHex(biome.fog.color);
    }

    // 3. Three-point lighting calibration
    if (biome.lighting) {
      if (this.sunLight && biome.lighting.sunColor !== undefined) {
        this.sunLight.color.setHex(biome.lighting.sunColor);
        this.sunLight.intensity = biome.lighting.sunIntensity || 2.8;
      }
      if (this.hemiLight && biome.lighting.hemiSky !== undefined) {
        this.hemiLight.color.setHex(biome.lighting.hemiSky);
        this.hemiLight.groundColor.setHex(biome.lighting.hemiGround);
        this.hemiLight.intensity = biome.lighting.hemiIntensity || 0.75;
      }
      if (this.rimLight && biome.lighting.rimColor !== undefined) {
        this.rimLight.color.setHex(biome.lighting.rimColor);
        this.rimLight.intensity = biome.lighting.rimIntensity || 1.25;
      }
    }
  }

  _createFloatingIsland() {
    this.floatingRocks = [];

    const islandGroup = new THREE.Group();
    const rockGeo = new THREE.ConeGeometry(9.5, 9.0, 7);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x4a3e35,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true
    });
    const baseRock = new THREE.Mesh(rockGeo, rockMat);
    baseRock.rotation.x = Math.PI;
    baseRock.position.y = -4.75; // Top face at y = -0.25, cleanly below tiles
    baseRock.receiveShadow = true;
    islandGroup.add(baseRock);

    const rimGeo = new THREE.BoxGeometry(16.5, 0.6, 16.5);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x5a4d3f,
      roughness: 0.88
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = -0.55; // Top face at y = -0.25, acts as foundation bezel below tiles
    rim.receiveShadow = true;
    islandGroup.add(rim);

    this.scene.add(islandGroup);

    // Glowing amethyst crystal shards around the island
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      emissive: 0xa855f7,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.1,
      flatShading: true
    });

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const dist = 11 + Math.random() * 3;
      const shardGeo = new THREE.DodecahedronGeometry(0.75 + Math.random() * 0.5, 0);
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.set(
        Math.cos(angle) * dist,
        -1 + Math.sin(angle) * 2,
        Math.sin(angle) * dist
      );
      shard.userData = {
        baseY: shard.position.y,
        speed: 1.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2
      };
      this.scene.add(shard);
      this.floatingRocks.push(shard);
    }
  }

  _createAtmosphericDust() {
    const particleCount = 140;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 26;
      positions[i + 1] = Math.random() * 10 - 1;
      positions[i + 2] = (Math.random() - 0.5) * 26;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffdf80, // Radiant golden sunlight pollen motes
      size: 0.16,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.dustParticles = new THREE.Points(geo, mat);
    this.scene.add(this.dustParticles);
  }

  _initEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('contextmenu', e => e.preventDefault());

    this.container.addEventListener('mousedown', e => {
      if (e.button === 2) {
        // Right-click: Orbit rotation & elevation tilt
        this.dragMode = 'orbit';
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      } else if (e.button === 1) {
        // Middle-click / Scroll wheel drag: Ground grab-and-pan
        e.preventDefault();
        this.dragMode = 'pan';
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', e => {
      if (!this.dragMode) return;
      const deltaX = e.clientX - this.prevMousePos.x;
      const deltaY = e.clientY - this.prevMousePos.y;
      this.prevMousePos = { x: e.clientX, y: e.clientY };

      if (this.dragMode === 'orbit') {
        // Orbital horizontal rotation
        this.targetAngle -= deltaX * 0.0055;
        // Pitch elevation angle (clamped between low angle 9 and high top-down 32)
        this.cameraElevation = THREE.MathUtils.clamp(
          this.cameraElevation + deltaY * 0.045,
          9,
          32
        );
      } else if (this.dragMode === 'pan') {
        // Screen-relative ground grab pan
        const forwardX = -Math.sin(this.currentAngle);
        const forwardZ = -Math.cos(this.currentAngle);
        const rightX = Math.cos(this.currentAngle);
        const rightZ = -Math.sin(this.currentAngle);

        const panScale = this.currentDistance * 0.0018;
        this.targetLookAt.x -= (rightX * deltaX - forwardX * deltaY) * panScale;
        this.targetLookAt.z -= (rightZ * deltaX - forwardZ * deltaY) * panScale;
        this.targetLookAt.x = THREE.MathUtils.clamp(this.targetLookAt.x, -7.0, 10.0);
        this.targetLookAt.z = THREE.MathUtils.clamp(this.targetLookAt.z, -7.0, 10.0);
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 2 || e.button === 1) {
        this.dragMode = null;
      }
    });

    this.container.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.018;
      this.cameraDistance = THREE.MathUtils.clamp(
        this.cameraDistance + zoomDelta,
        12,
        38
      );
      // Proportionally calibrate elevation with zoom distance to maintain ideal perspective
      const targetElev = 8.5 + (this.cameraDistance - 12) * (18 / 26);
      this.cameraElevation = THREE.MathUtils.clamp(targetElev, 9, 30);
    }, { passive: false });

    // Keyboard controls for WASD and Arrow Keys (Camera continuous pan)
    window.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.keys.forward = true;
        if (e.code === 'ArrowUp') e.preventDefault();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.keys.backward = true;
        if (e.code === 'ArrowDown') e.preventDefault();
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.keys.left = true;
        if (e.code === 'ArrowLeft') e.preventDefault();
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.keys.right = true;
        if (e.code === 'ArrowRight') e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.keys.forward = false;
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.keys.backward = false;
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.keys.left = false;
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.keys.right = false;
      }
    });

    window.addEventListener('blur', () => {
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      this.dragMode = null;
    });
  }

  rotateLeft() {
    this.targetAngle += Math.PI / 4;
  }

  rotateRight() {
    this.targetAngle -= Math.PI / 4;
  }

  resetCamera(focusTarget = null) {
    this.targetAngle = (3 * Math.PI) / 4;
    this.cameraDistance = 21.0;
    this.cameraElevation = 14.5;
    if (focusTarget) {
      this.targetLookAt.set(focusTarget.x, 0, focusTarget.z);
    } else {
      this.targetLookAt.set(0, 0, 0);
    }
  }

  focusOn(position) {
    this.targetLookAt.set(position.x, 0, position.z);
  }

  startCinematicZoom(worldPos, distance = 13.5, elevation = 7.8) {
    this.cameraDistance = distance;
    this.cameraElevation = elevation;
    this.targetLookAt.set(worldPos.x, worldPos.y + 0.6, worldPos.z);
  }

  restoreCamera() {
    this.cameraDistance = 21.0;
    this.cameraElevation = 14.5;
    this.targetLookAt.set(0, 0, 0);
    this.targetAngle = (3 * Math.PI) / 4;
  }

  setTimeScale(scale) {
    this.timeScale = scale;
  }

  shake(intensity = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  updateCameraPosition(dt = 0.016, lerpFactor = null) {
    // 1. Process continuous keyboard panning (WASD & Arrow Keys)
    // Screen-relative directional vectors projected on ground plane
    const forwardX = -Math.sin(this.currentAngle);
    const forwardZ = -Math.cos(this.currentAngle);
    const rightX = Math.cos(this.currentAngle);
    const rightZ = -Math.sin(this.currentAngle);

    let moveX = 0;
    let moveZ = 0;
    if (this.keys.forward) { moveX += forwardX; moveZ += forwardZ; }
    if (this.keys.backward) { moveX -= forwardX; moveZ -= forwardZ; }
    if (this.keys.right) { moveX += rightX; moveZ += rightZ; }
    if (this.keys.left) { moveX -= rightX; moveZ -= rightZ; }

    const len = Math.hypot(moveX, moveZ);
    if (len > 0.001) {
      const speed = this.panSpeed * dt;
      this.targetLookAt.x += (moveX / len) * speed;
      this.targetLookAt.z += (moveZ / len) * speed;
      this.targetLookAt.x = THREE.MathUtils.clamp(this.targetLookAt.x, -7.0, 10.0);
      this.targetLookAt.z = THREE.MathUtils.clamp(this.targetLookAt.z, -7.0, 10.0);
    }

    // 2. Smooth frame-rate independent interpolation
    const factor = lerpFactor !== null ? lerpFactor : (1.0 - Math.exp(-9.0 * dt));

    this.currentAngle = THREE.MathUtils.lerp(this.currentAngle, this.targetAngle, factor);
    this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, this.cameraDistance, factor);
    this.currentElevation = THREE.MathUtils.lerp(this.currentElevation, this.cameraElevation, factor);
    this.currentLookAt.lerp(this.targetLookAt, factor);

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.001) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    }

    const camX = this.currentLookAt.x + Math.sin(this.currentAngle) * this.currentDistance + shakeX;
    const camZ = this.currentLookAt.z + Math.cos(this.currentAngle) * this.currentDistance;
    const camY = this.currentElevation + shakeY;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(
      this.currentLookAt.x + shakeX * 0.5,
      this.currentLookAt.y,
      this.currentLookAt.z
    );
  }

  render(time, dt = 0.016) {
    this.updateCameraPosition(dt);

    if (this.skyDome) {
      this.skyDome.position.copy(this.camera.position);
    }

    // Floating rocks bobbing and gentle rotation
    this.floatingRocks.forEach(rock => {
      rock.position.y = rock.userData.baseY + Math.sin(time * rock.userData.speed + rock.userData.phase) * 0.35;
      rock.rotation.y += 0.005;
      rock.rotation.x += 0.003;
    });

    // 3D Fluffy Clouds drifting smoothly across the daytime sky
    if (this.floatingClouds) {
      this.floatingClouds.forEach(cloud => {
        cloud.userData.angle += cloud.userData.speed;
        cloud.position.x = Math.cos(cloud.userData.angle) * cloud.userData.radius;
        cloud.position.z = Math.sin(cloud.userData.angle) * cloud.userData.radius;
        cloud.position.y = cloud.userData.baseY + Math.sin(time * 0.35 + cloud.userData.phase) * 0.35;
      });
    }

    // Golden pollen drifting in sunlight
    if (this.dustParticles) {
      this.dustParticles.rotation.y = time * 0.025;
    }

    this.composer.render();
  }
}
