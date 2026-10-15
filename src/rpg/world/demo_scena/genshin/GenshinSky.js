import * as THREE from 'three';
import { GENSHIN_PALETTE, SUN_DIRECTION, GLSL_NOISE } from './GenshinArtDirection.js';

/**
 * GenshinSky — Painterly golden-hour sky dome.
 *  - 3-stop anime gradient (zenith / mid / horizon) with warm horizon on the sun side
 *    and a cooler lavender horizon on the opposite side.
 *  - Soft sun disk + layered halo (feeds the bloom and lens-flare pass).
 *  - Procedural cel-banded cumulus banks near the horizon and thin cirrus higher up,
 *    with silver/golden rims on the sun side. Fully analytic: 1 draw call, no textures.
 */
export class GenshinSky {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.name = 'GenshinSky';
    parent.add(this.group);

    const P = GENSHIN_PALETTE;
    this.uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIRECTION.clone() },
      uZenith: { value: new THREE.Color(P.skyZenith) },
      uMid: { value: new THREE.Color(P.skyMid) },
      uHorizon: { value: new THREE.Color(P.skyHorizon) },
      uHorizonAway: { value: new THREE.Color(P.skyHorizonAway) },
      uSunDisk: { value: new THREE.Color(P.sunDisk) },
      uSunHalo: { value: new THREE.Color(P.sunHalo) },
      uCloudLit: { value: new THREE.Color(P.cloudLit) },
      uCloudShadow: { value: new THREE.Color(P.cloudShadow) },
      uCloudRim: { value: new THREE.Color(P.cloudRim) },
      uFogColor: { value: new THREE.Color(P.fogColor) },
      uCloudCoverage: { value: 0.6 },
      uCloudSpeed: { value: 0.0045 }
    };

    const geo = new THREE.SphereGeometry(3300, 48, 32);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
          gl_Position.z = gl_Position.w * 0.99999; // push to far plane, never clips terrain
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uZenith, uMid, uHorizon, uHorizonAway;
        uniform vec3 uSunDisk, uSunHalo;
        uniform vec3 uCloudLit, uCloudShadow, uCloudRim, uFogColor;
        uniform float uCloudCoverage, uCloudSpeed;
        varying vec3 vDir;
        ${GLSL_NOISE}

        float cloudDensity(vec2 uv, float bandMask) {
          float base = gFbm(uv);
          float detail = gFbm(uv * 2.7 + 9.1);
          float d = base * 0.78 + detail * 0.32;
          return smoothstep(1.0 - uCloudCoverage * bandMask, 1.0 - uCloudCoverage * bandMask + 0.22, d);
        }

        void main() {
          vec3 dir = normalize(vDir);
          vec3 sunDir = normalize(uSunDir);
          float elev = dir.y;

          // ---- Base gradient -------------------------------------------------
          vec2 dirH = normalize(dir.xz + vec2(1e-4));
          vec2 sunH = normalize(sunDir.xz + vec2(1e-4));
          float sunSide = dot(dirH, sunH) * 0.5 + 0.5;               // 1 = facing the sun
          vec3 horizon = mix(uHorizonAway, uHorizon, pow(max(sunSide, 1e-4), 1.6));
          float hT = clamp(elev, 0.0, 1.0);
          vec3 sky = mix(horizon, uMid, smoothstep(0.0, 0.22, hT));
          sky = mix(sky, uZenith, smoothstep(0.18, 0.75, hT));
          // Thin warm haze band right at the horizon so mountains & sea melt into the sky.
          float hazeBand = 1.0 - smoothstep(-0.02, 0.06, elev);
          sky = mix(sky, uFogColor, hazeBand * 0.7);
          // Below the horizon: fog colour (sea covers it anyway).
          if (elev < 0.0) sky = mix(uFogColor, uFogColor * 0.92, clamp(-elev * 4.0, 0.0, 1.0));

          // ---- Sun --------------------------------------------------------------
          float sd = max(dot(dir, sunDir), 0.0);
          float disk = smoothstep(0.9993, 0.99965, sd);
          float halo1 = (sd > 0.0001) ? pow(sd, 900.0) : 0.0;
          float halo2 = (sd > 0.0001) ? pow(sd, 48.0) : 0.0;
          float halo3 = (sd > 0.0001) ? pow(sd, 6.0) : 0.0;
          sky += uSunHalo * (halo2 * 0.42 + halo3 * 0.2);

          // ---- Clouds -----------------------------------------------------------
          float up = max(elev, 0.0);
          // Planar projection of the dome (clouds grow toward the horizon like a real cloud deck).
          vec2 cuv = dir.xz / (up + 0.09);
          float t = uTime * uCloudSpeed;
          // Cumulus banks: dense near the horizon, fading towards the zenith.
          float band = smoothstep(0.0, 0.05, up) * (1.0 - smoothstep(0.18, 0.5, up));
          vec2 cumUv = cuv * 0.55 + vec2(t, t * 0.35);
          float cum = cloudDensity(cumUv, 0.55 + band * 0.75);
          // Soft cirrus higher up
          float cir = smoothstep(0.55, 0.85, gFbm(vec2(cuv.x * 0.18, cuv.y * 0.6) + vec2(t * 1.7, 0.0))) * smoothstep(0.12, 0.35, up) * 0.45;

          // Fake lighting: sample density slightly toward the sun to get a self-shadow term.
          vec2 toSun = normalize(sunH) * 0.12;
          float shadowSample = cloudDensity(cumUv + toSun, 0.55 + band * 0.75);
          float lit = clamp(1.0 - (shadowSample - cum) * 1.8 - shadowSample * 0.35, 0.0, 1.0);
          // Cel band: two clear tones with a soft painterly transition
          float cel = smoothstep(0.35, 0.65, lit);
          vec3 cloudCol = mix(uCloudShadow, uCloudLit, cel);
          // Golden rim on cloud edges facing the sun
          float edge = cum * (1.0 - cum) * 4.0;
          cloudCol += uCloudRim * edge * pow(max(sunSide, 1e-4), 3.0) * 0.55;
          cloudCol = mix(cloudCol, uSunHalo, halo3 * 0.35);
          // Clouds dissolve into the horizon haze
          float cloudFade = smoothstep(0.0, 0.06, up);
          sky = mix(sky, cloudCol, cum * 0.96 * cloudFade);
          sky = mix(sky, uCloudLit, cir * (1.0 - cum));

          // Sun disk drawn after clouds but dimmed when covered
          sky += uSunDisk * (disk * 3.2 + halo1 * 1.2) * (1.0 - cum * 0.85);

          gl_FragColor = vec4(sky, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'GenshinSkyDome';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.group.add(this.mesh);
  }

  update(delta, cameraPos) {
    this.uniforms.uTime.value += delta;
    if (cameraPos) this.mesh.position.set(cameraPos.x, 0, cameraPos.z);
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
