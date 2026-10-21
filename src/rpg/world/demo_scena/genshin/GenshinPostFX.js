import * as THREE from 'three';
import { ShaderPass } from '../../../../../vendor/postprocessing/ShaderPass.js';
import { SUN_DIRECTION } from './GenshinArtDirection.js';

/**
 * GenshinPostFX — One fullscreen pass (HDR, before OutputPass/ACES):
 *   1. Screen-space god rays from the sun (radial blur of bright sky pixels, 20 taps,
 *      skipped entirely when the sun is off-screen).
 *   2. Anime lens flare: soft halo, chromatic ghosts along the sun→center axis and a
 *      subtle starburst. Visibility estimated by sampling the frame around the sun,
 *      so trees/characters occluding the sun naturally hide the flare.
 *   3. Painterly color grade: warm highlights / cool shadows (split toning), gentle
 *      saturation boost and a soft vignette.
 */
export class GenshinPostFX {
  constructor(camera, options = {}) {
    this.camera = camera;
    this.enabledGodRays = options.godRays !== false;
    this._sunWorld = new THREE.Vector3();
    this._sunNdc = new THREE.Vector3();
    this._camDir = new THREE.Vector3();

    this.pass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uSunUv: { value: new THREE.Vector2(0.5, 0.5) },
        uSunOnScreen: { value: 0 },
        uAspect: { value: 1 },
        uGodRays: { value: this.enabledGodRays ? 1 : 0 },
        uGodRayStrength: { value: 0.42 },
        uFlareStrength: { value: 0.55 },
        uWarm: { value: new THREE.Color(1.06, 1.0, 0.9) },
        uCool: { value: new THREE.Color(0.9, 0.97, 1.08) },
        uSaturation: { value: 1.12 },
        uVignette: { value: 0.22 },
        uTime: { value: 0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec2 uSunUv;
        uniform float uSunOnScreen, uAspect, uGodRays, uGodRayStrength, uFlareStrength;
        uniform vec3 uWarm, uCool;
        uniform float uSaturation, uVignette, uTime;
        varying vec2 vUv;

        float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

        // Safe sample: clamp HDR + kill NaN/Inf so bloom/ACES never get poisoned (Hito 21).
        vec3 safeTex(vec2 uv) {
          vec3 c = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb;
          c = max(c, vec3(0.0));
          c = min(c, vec3(64.0));
          return c;
        }

        void main() {
          vec3 col = safeTex(vUv);

          // ---------- 1. God rays -------------------------------------------------
          // Rendimiento: el resultado se multiplica por 'falloff', que vale 0 lejos del sol. Se calcula
          // primero y, donde es 0, se saltan las 20 lecturas de textura (mismo aspecto, mucho menos coste).
          float falloff = 1.0 - smoothstep(0.0, 0.9, length((vUv - uSunUv) * vec2(uAspect, 1.0)));
          if (uSunOnScreen > 0.001 && uGodRays > 0.5 && falloff > 0.0) {
            vec2 delta = (vUv - uSunUv) * (1.0 / 20.0) * 0.9;
            vec2 uv = vUv;
            float decay = 1.0;
            vec3 rays = vec3(0.0);
            for (int i = 0; i < 20; i++) {
              uv -= delta;
              vec3 s = safeTex(uv);
              float b = max(luma(s) - 0.95, 0.0);    // only very bright sky/sun pixels
              rays += s * b * decay;
              decay *= 0.93;
            }
            col += rays * 0.09 * uGodRayStrength * uSunOnScreen * falloff * vec3(1.0, 0.86, 0.62);
          }

          // ---------- 2. Lens flare ---------------------------------------------
          if (uSunOnScreen > 0.001) {
            // Visibility: average luminance in a small cross around the sun
            float vis = 0.0;
            vis += luma(safeTex(uSunUv));
            vis += luma(safeTex(uSunUv + vec2(0.006, 0.0)));
            vis += luma(safeTex(uSunUv - vec2(0.006, 0.0)));
            vis += luma(safeTex(uSunUv + vec2(0.0, 0.01)));
            vis += luma(safeTex(uSunUv - vec2(0.0, 0.01)));
            vis = smoothstep(1.2, 3.0, vis / 5.0) * uSunOnScreen;

            vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
            vec2 s = (uSunUv - 0.5) * vec2(uAspect, 1.0);
            float d = length(p - s);
            // Soft glow + starburst
            float glow = exp(-d * 9.0) * 0.55;
            float ang = atan(p.y - s.y, p.x - s.x + 1e-5);
            float star = pow(max(abs(cos(ang * 3.0 + 0.4)), 1e-4), 40.0) * exp(-d * 4.5) * 0.35;
            vec3 flare = vec3(1.0, 0.85, 0.6) * (glow + star);
            // Ghosts along the axis through the screen centre
            for (int g = 0; g < 4; g++) {
              float fg = float(g);
              float k = -0.35 - fg * 0.42;
              vec2 gp = s * k;
              float r = 0.035 + fg * 0.022;
              float ring = 1.0 - smoothstep(r * 0.55, r, length(p - gp));
              vec3 tint = mix(vec3(0.55, 0.9, 1.0), vec3(1.0, 0.7, 0.45), fract(fg * 0.37 + 0.2));
              flare += tint * ring * (0.10 - fg * 0.015);
            }
            // Thin halo ring around the sun
            float halo = (1.0 - smoothstep(0.0, 0.012, abs(d - 0.22))) * 0.06;
            flare += vec3(0.85, 0.95, 1.0) * halo;
            col += flare * vis * uFlareStrength;
          }

          // ---------- 3. Grade ------------------------------------------------------
          float l = luma(col);
          float hl = smoothstep(0.25, 1.2, l);
          col *= mix(uCool, uWarm, hl);              // split toning
          vec3 gray = vec3(luma(col));
          col = mix(gray, col, uSaturation);          // gentle saturation (anime palette)
          col = max(col, vec3(0.0));

          vec2 vq = (vUv - 0.5) * vec2(uAspect, 1.0);
          float vig = 1.0 - smoothstep(0.45, 1.05, length(vq)) * uVignette;
          col *= vig;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.pass.name = 'GenshinPostFX';
  }

  /** Call every frame before composer.render(). */
  update(delta, sunDirection = SUN_DIRECTION) {
    const u = this.pass.uniforms;
    u.uTime.value += delta;
    const cam = this.camera;
    if (!cam) return;
    u.uAspect.value = cam.aspect || 1;

    this._sunWorld.copy(sunDirection).multiplyScalar(2000).add(cam.position);
    cam.getWorldDirection(this._camDir);
    const facing = this._camDir.dot(sunDirection);
    this._sunNdc.copy(this._sunWorld).project(cam);
    const sx = this._sunNdc.x * 0.5 + 0.5;
    const sy = this._sunNdc.y * 0.5 + 0.5;
    u.uSunUv.value.set(sx, sy);
    // Fade out as the sun leaves the screen or goes behind the camera
    const edge = Math.min(
      THREE.MathUtils.smoothstep(sx, -0.15, 0.08), THREE.MathUtils.smoothstep(1.15 - sx, 0.0, 0.23),
      THREE.MathUtils.smoothstep(sy, -0.15, 0.08), THREE.MathUtils.smoothstep(1.15 - sy, 0.0, 0.23)
    );
    u.uSunOnScreen.value = facing > 0.05 ? edge * THREE.MathUtils.smoothstep(facing, 0.05, 0.35) : 0;
  }

  setEnabled(enabled) {
    this.pass.enabled = enabled;
  }
}
