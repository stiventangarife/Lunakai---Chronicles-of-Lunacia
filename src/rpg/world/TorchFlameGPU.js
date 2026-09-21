// TorchFlameGPU.js - Real-time GPU Shader Flame & Embers for World Torches
import * as THREE from 'three';

// Procedural GPU Flame Vertex Shader
const FLAME_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uScale;
  varying vec2 vUv;
  varying float vHeight;

  void main() {
    vUv = uv;
    vHeight = uv.y;
    vec3 pos = position;

    // Conical tapering towards the flame tip
    float taper = mix(1.0, 0.12, uv.y);
    pos.x *= taper;
    pos.z *= taper;

    // Organic harmonic sway on GPU
    float swayX = sin(uTime * 5.2 + uv.y * 4.5) * 0.07 * uv.y;
    float swayZ = cos(uTime * 4.4 + uv.y * 4.0) * 0.06 * uv.y;
    pos.x += swayX;
    pos.z += swayZ;

    // High frequency flickering licking tongues
    float flutter = sin(uTime * 13.0 + uv.x * 8.0) * 0.035 * uv.y;
    pos.y += flutter;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Procedural GPU Flame Fragment Shader
const FLAME_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uColorCore;
  uniform vec3 uColorMid;
  uniform vec3 uColorTip;
  uniform float uCoreBoost;
  varying vec2 vUv;
  varying float vHeight;

  // 2D Hash function on GPU
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Smooth procedural value noise on GPU
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec2 uv = vUv;

    // Animated upward scrolling noise textures evaluated entirely on GPU
    float n1 = noise(vec2(uv.x * 3.8, uv.y * 2.8 - uTime * 3.4));
    float n2 = noise(vec2(uv.x * 6.5 + 1.7, uv.y * 4.2 - uTime * 4.8));
    float flameNoise = n1 * 0.65 + n2 * 0.35;

    // Teardrop flame silhouette mask
    float dx = abs(uv.x - 0.5) * 2.0;
    float edge = smoothstep(1.0 - uv.y * 0.35, 0.0, dx);
    float verticalFade = smoothstep(1.0, 0.15, uv.y);

    // Dynamic fire threshold
    float shape = edge * verticalFade;
    float flameMask = smoothstep(0.32, 0.78, shape * 1.35 - (1.0 - flameNoise) * uv.y * 0.9);

    if (flameMask <= 0.02) discard;

    // Rich fire color ramp (Core -> Mid -> Outer Tip)
    vec3 col = mix(uColorCore, uColorMid, smoothstep(0.0, 0.45, uv.y));
    col = mix(col, uColorTip, smoothstep(0.4, 0.95, uv.y));

    // Glow boost at the core
    float core = smoothstep(0.55, 0.98, flameMask) * (1.0 - uv.y) * uCoreBoost;
    col += vec3(0.5, 0.4, 0.2) * core;

    gl_FragColor = vec4(col, flameMask);
  }
`;

// GPU Ember Sparks Shaders
const EMBER_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aSpeed;
  attribute float aOffset;
  uniform float uTime;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    // Ascend upwards with GPU loop
    float t = fract(uTime * aSpeed * 0.28 + aOffset);
    pos.y += t * 1.3;
    pos.x += sin(t * 7.5 + aOffset * 22.0) * 0.14;
    pos.z += cos(t * 6.5 + aOffset * 28.0) * 0.14;

    // Fade in at birth, fade out near top
    vAlpha = (1.0 - t) * smoothstep(0.0, 0.18, t);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (160.0 / -mvPosition.z) * (1.0 - t * 0.55);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const EMBER_FRAGMENT_SHADER = `
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float spark = smoothstep(0.5, 0.0, dist);
    vec3 sparkCol = mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 0.35, 0.05), dist * 2.0);
    gl_FragColor = vec4(sparkCol, spark * vAlpha);
  }
`;

export class TorchFlameGPU {
  constructor(options = {}) {
    this.scale = options.scale ?? 1.0;
    this.group = new THREE.Group();
    this.group.name = 'torch_flame_gpu';

    this.uniforms = {
      uTime: { value: 0.0 },
      uScale: { value: this.scale }
    };

    this._createCrossedFlames();
    this._createEmberParticles();
    this._createPointLight();
  }

  _createCrossedFlames() {
    // 3 intersecting quads rotated at 0, 60, 120 degrees for 360-degree volumetric flame
    const flameGeo = new THREE.PlaneGeometry(0.38 * this.scale, 0.72 * this.scale, 8, 16);
    // Align base of flame geometry at Y = 0
    flameGeo.translate(0, (0.72 * this.scale) / 2, 0);

    // 1. Outer Rich Fiery Envelope
    this.outerMat = new THREE.ShaderMaterial({
      vertexShader: FLAME_VERTEX_SHADER,
      fragmentShader: FLAME_FRAGMENT_SHADER,
      uniforms: {
        uTime: this.uniforms.uTime,
        uScale: this.uniforms.uScale,
        uColorCore: { value: new THREE.Color(0xffef99) }, // Golden incandescent core
        uColorMid:  { value: new THREE.Color(0xff6600) }, // Vibrant orange flame
        uColorTip:  { value: new THREE.Color(0xcc1100) }, // Deep fiery red tip
        uCoreBoost: { value: 0.8 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 2. Inner Bright Hot Flame Core (slightly smaller, white-yellow hot)
    this.innerMat = new THREE.ShaderMaterial({
      vertexShader: FLAME_VERTEX_SHADER,
      fragmentShader: FLAME_FRAGMENT_SHADER,
      uniforms: {
        uTime: this.uniforms.uTime,
        uScale: this.uniforms.uScale,
        uColorCore: { value: new THREE.Color(0xffffff) }, // Pure white-hot core
        uColorMid:  { value: new THREE.Color(0xffdd44) }, // Intense yellow
        uColorTip:  { value: new THREE.Color(0xff5500) }, // Hot orange edge
        uCoreBoost: { value: 1.4 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];

    angles.forEach(angle => {
      // Outer flame plane
      const outerMesh = new THREE.Mesh(flameGeo, this.outerMat);
      outerMesh.rotation.y = angle;
      this.group.add(outerMesh);

      // Inner flame plane (scaled slightly down)
      const innerMesh = new THREE.Mesh(flameGeo, this.innerMat);
      innerMesh.rotation.y = angle + Math.PI / 6;
      innerMesh.scale.set(0.72, 0.85, 0.72);
      this.group.add(innerMesh);
    });
  }

  _createEmberParticles() {
    const emberCount = 32;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(emberCount * 3);
    const sizes = new Float32Array(emberCount);
    const speeds = new Float32Array(emberCount);
    const offsets = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      // Spawn within torch cup radius
      const radius = Math.random() * 0.12 * this.scale;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3]     = Math.cos(theta) * radius;
      positions[i * 3 + 1] = (Math.random() * 0.15) * this.scale;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      sizes[i]   = 4.5 + Math.random() * 5.5;
      speeds[i]  = 0.75 + Math.random() * 0.75;
      offsets[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    this.emberMat = new THREE.ShaderMaterial({
      vertexShader: EMBER_VERTEX_SHADER,
      fragmentShader: EMBER_FRAGMENT_SHADER,
      uniforms: {
        uTime: this.uniforms.uTime
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.embers = new THREE.Points(geometry, this.emberMat);
    this.group.add(this.embers);
  }

  _createPointLight() {
    this.baseIntensity = 2.2;
    this.light = new THREE.PointLight(0xff7a1a, this.baseIntensity, 6.5);
    this.light.position.set(0, 0.25 * this.scale, 0);
    this.light.castShadow = false; // Soft ambient torch cast
    this.group.add(this.light);
  }

  update(dt) {
    this.uniforms.uTime.value += dt;
    const t = this.uniforms.uTime.value;

    // Organic real-time torch fire flicker on the point light
    if (this.light) {
      const flicker =
        Math.sin(t * 14.0) * 0.25 +
        Math.cos(t * 27.0) * 0.18 +
        Math.sin(t * 41.0) * 0.10 +
        (Math.random() - 0.5) * 0.08;
      this.light.intensity = Math.max(1.2, this.baseIntensity + flicker);

      // Subtle light center dance
      this.light.position.x = Math.sin(t * 8.0) * 0.02 * this.scale;
      this.light.position.z = Math.cos(t * 9.5) * 0.02 * this.scale;
    }
  }

  dispose() {
    if (this.outerMat) this.outerMat.dispose();
    if (this.innerMat) this.innerMat.dispose();
    if (this.emberMat) this.emberMat.dispose();
    if (this.embers && this.embers.geometry) this.embers.geometry.dispose();
  }
}
