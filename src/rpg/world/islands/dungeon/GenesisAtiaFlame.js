import * as THREE from 'three';
import { IslandParticles } from '../kit/IslandParticles.js';

/**
 * GenesisAtiaFlame — the sacred Atia Flame floating in front of the chest of the Spirit of Atia
 * (Santuario del Origen). Hito 58.
 *   · warm core + three layered flame shells with licking tongues (pale gold → turquoise → orange-gold tips) that flicker and
 *     sway in the vertex shader (no CPU work per frame besides one time uniform);
 *   · a soft camera-facing halo that breathes with the flame;
 *   · rising embers (GPU particles, IslandParticles 'embers').
 * No lights of its own: the statue's spirit light (NPCManager, `lightColor` / `lightOffset` in MapRegistry) is
 * moved in front of the figure and tinted to match, so the flame lights the statue without extra cost.
 * Unlit and without depth writes (the outer shells are alpha-blended so the turquoise and gold survive on the bright marble; core, inner shell, halo and embers are additive): 5 draw calls, ~1k triangles.
 */
const FLAME_VS = /* glsl */ `
  uniform float uTime, uPhase, uHeight;
  varying float vH;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vec3 p = position;
    float h = clamp(p.y / uHeight + 0.5, 0.0, 1.0);          // 0 at the base, 1 at the tip
    float t = uTime * 2.4 + uPhase;
    // Taper to a tip, flicker the height and sway the upper part
    float ang = atan(p.z, p.x);
    float tongues = 1.0 + 0.35 * h * sin(ang * 5.0 + t * 2.2) * sin(h * 6.0 - t * 3.0);   // licking tongues
    p.xz *= mix(1.0, 0.1, pow(h, 1.2)) * tongues * (1.0 + 0.08 * sin(t * 3.1 + p.y * 4.0));
    p.y *= 1.0 + 0.12 * sin(t * 1.7) + 0.06 * sin(t * 4.3);
    p.x += sin(t + h * 3.0) * 0.18 * h * h;
    p.z += cos(t * 1.3 + h * 2.5) * 0.14 * h * h;
    vH = h;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const FLAME_FS = /* glsl */ `
  uniform vec3 uCore, uMid, uTip;
  uniform float uOpacity, uTime, uPhase;
  varying float vH;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float rim = 1.0 - abs(dot(normalize(vN), vView));        // brighter edges, see-through centre
    vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.45, vH));
    col = mix(col, uTip, smoothstep(0.45, 1.0, vH));
    float a = uOpacity * (0.35 + 0.65 * rim) * (1.0 - smoothstep(0.7, 1.0, vH));
    a *= 0.85 + 0.15 * sin(uTime * 6.0 + uPhase + vH * 8.0);
    #ifdef ADDITIVE
    gl_FragColor = vec4(col * a, a);
    #else
    gl_FragColor = vec4(col * 1.25, a);                       // alpha-blended: keeps its colour on bright stone
    #endif
  }
`;
const HALO_FS = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime, uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.2) * uOpacity * (0.85 + 0.15 * sin(uTime * 2.2));
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export class GenesisAtiaFlame {
  /**
   * @param {THREE.Object3D} parent
   * @param {{ x:number, y:number, z:number, size?:number, time:{value:number}, updatables:Array }} opts
   *   x, y, z = centre of the flame (world); size = flame height in metres
   */
  constructor(parent, { x, y, z, size = 2.4, time, updatables }) {
    this.time = time;
    this.group = new THREE.Group();
    this.group.name = 'Genesis_AtiaFlame';
    this.group.position.set(x, y, z);
    parent.add(this.group);
    this.materials = [];

    const shell = new THREE.SphereGeometry(0.5, 20, 16);     // stretched into flame shells by the shader
    const layers = [
      { s: [0.5, 1.0, 0.5], core: 0xfff4c8, mid: 0x7ff4ff, tip: 0xffc040, opacity: 0.7, phase: 0.0, add: true },
      { s: [0.78, 1.3, 0.78], core: 0x40e8ff, mid: 0x00b4e0, tip: 0xff9a10, opacity: 0.6, phase: 1.7, add: false },
      { s: [1.05, 1.6, 1.05], core: 0x10c8e8, mid: 0x0090d0, tip: 0xff7000, opacity: 0.4, phase: 3.1, add: false }
    ];
    layers.forEach((L, i) => {
      const m = new THREE.ShaderMaterial({
        uniforms: {
          uTime: time, uPhase: { value: L.phase }, uHeight: { value: 1.0 },
          uCore: { value: new THREE.Color(L.core) }, uMid: { value: new THREE.Color(L.mid) }, uTip: { value: new THREE.Color(L.tip) },
          uOpacity: { value: L.opacity }
        },
        vertexShader: FLAME_VS, fragmentShader: FLAME_FS, defines: L.add ? { ADDITIVE: '' } : {},
        transparent: true, depthWrite: false, blending: L.add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide
      });
      m.name = `AtiaFlame_${i}`;
      this.materials.push(m);
      const mesh = new THREE.Mesh(shell, m);
      mesh.scale.set(L.s[0] * size, L.s[1] * size, L.s[2] * size);
      mesh.position.y = (L.s[1] - 1) * size * 0.25;          // outer shells reach a bit higher
      mesh.renderOrder = 12 - i;                             // outer shells first, bright core on top
      mesh.frustumCulled = false;                            // shader moves the vertices
      this.group.add(mesh);
    });
    // Bright core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    coreMat.name = 'AtiaFlameCore';
    this.materials.push(coreMat);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 * size, 2), coreMat);
    core.position.y = -0.12 * size;
    this.group.add(core);
    // Halo (camera-facing quad)
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { uTime: time, uColor: { value: new THREE.Color(0x20c8e0) }, uOpacity: { value: 0.45 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mv.xy += position.xy;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: HALO_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    haloMat.name = 'AtiaFlameHalo';
    this.materials.push(haloMat);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.6, size * 2.6), haloMat);
    halo.renderOrder = 9;
    halo.frustumCulled = false;
    this.group.add(halo);
    // Rising embers around the flame
    this.embers = new IslandParticles(parent, {
      mode: 'embers', count: 70, seed: 4242, velocity: [0.05, 0.9, 0.05], size: 5, box: [size * 1.6, size * 3.2, size * 1.6],
      colorA: 0xbffcff, colorB: 0xffd27a, intensity: 1.4, opacity: 0.9, sway: 0.35
    });
    const ec = new THREE.Vector3(x, y + size * 1.1, z);
    updatables.push((dt) => this.embers.update(dt, ec));
  }
}
