import * as THREE from 'three';
import { createSeededRandom } from '../../demo_scena/MathUtils.js';

/**
 * IslandParticles — GPU ambient particles that live in a box wrapped around the player
 * (zero CPU per frame; positions wrap in the vertex shader):
 *   sand     warm dust motes drifting with the wind
 *   snow     soft flakes falling with a gentle sway
 *   spores   bioluminescent fireflies / spores floating upward (additive)
 *   embers   glowing embers rising + grey ash flakes (additive)
 *   sparkle  tiny ice glints hovering in the air (additive)
 */
export class IslandParticles {
  constructor(parent, cfg) {
    const count = cfg.count || 600;
    const rng = createSeededRandom(cfg.seed || 9001);
    const box = cfg.box || [60, 18, 60];
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng() * box[0];
      pos[i * 3 + 1] = rng() * box[1];
      pos[i * 3 + 2] = rng() * box[2];
      rnd[i * 2] = rng();
      rnd[i * 2 + 1] = rng();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 2));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const additive = cfg.additive !== false && cfg.mode !== 'snow' && cfg.mode !== 'sand';
    this.uniforms = {
      ...THREE.UniformsLib.fog,
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uBox: { value: new THREE.Vector3(...box) },
      uVel: { value: new THREE.Vector3(...(cfg.velocity || [0.6, -0.4, 0.2])) },
      uSize: { value: cfg.size || 6.0 },
      uColorA: { value: new THREE.Color(cfg.colorA ?? 0xffffff) },
      uColorB: { value: new THREE.Color(cfg.colorB ?? 0xffffff) },
      uIntensity: { value: cfg.intensity ?? 1.0 },
      uGround: { value: cfg.groundY ?? 0.0 },
      uSway: { value: cfg.sway ?? 0.6 },
      uOpacity: { value: cfg.opacity ?? 0.8 }
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        attribute vec2 aRnd;
        uniform float uTime, uSize, uSway, uGround;
        uniform vec3 uCenter, uBox, uVel;
        varying float vRnd;
        varying float vFade;
        void main() {
          vec3 p = position + uVel * uTime * (0.6 + 0.8 * aRnd.x);
          p.x += sin(uTime * (0.6 + aRnd.y) + aRnd.x * 30.0) * uSway;
          p.z += cos(uTime * (0.5 + aRnd.x) + aRnd.y * 30.0) * uSway;
          // Wrap inside a box centred on the player
          vec3 origin = uCenter - vec3(uBox.x * 0.5, 0.0, uBox.z * 0.5);
          vec3 w = mod(p - origin, uBox) + origin;
          w.y = mod(p.y, uBox.y) + uCenter.y - 3.0;
          vec3 local = (w - uCenter) / (uBox * 0.5);
          vFade = (1.0 - smoothstep(0.7, 1.0, length(local.xz))) * smoothstep(0.0, 0.15, (w.y - uCenter.y + 3.0) / uBox.y) * (1.0 - smoothstep(0.75, 1.0, (w.y - uCenter.y + 3.0) / uBox.y));
          vRnd = aRnd.y;
          vec4 mvPosition = viewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = uSize * (0.6 + 0.8 * aRnd.x) * (30.0 / max(-mvPosition.z, 1.0));
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform vec3 uColorA, uColorB;
        uniform float uIntensity, uOpacity, uTime;
        varying float vRnd;
        varying float vFade;
        void main() {
          vec2 c = gl_PointCoord * 2.0 - 1.0;
          float r = dot(c, c);
          if (r > 1.0) discard;
          float soft = 1.0 - smoothstep(0.0, 1.0, r);
          float tw = 0.7 + 0.3 * sin(uTime * (2.0 + vRnd * 4.0) + vRnd * 50.0);
          vec3 col = mix(uColorA, uColorB, vRnd) * uIntensity * tw;
          gl_FragColor = vec4(col, soft * vFade * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.name = 'IslandParticles_' + (cfg.mode || 'x');
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    parent.add(this.points);
  }

  update(delta, center) {
    this.uniforms.uTime.value += delta;
    if (center) this.uniforms.uCenter.value.copy(center);
  }
}
