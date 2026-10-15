import * as THREE from 'three';
import { GLSL_NOISE } from '../../demo_scena/genshin/GenshinArtDirection.js';

/**
 * IslandSky — The Forest's painterly sky dome (3-stop anime gradient, cel-banded cumulus,
 * cirrus, sun disk + halo) with island extras:
 *   - stars      fading in toward the zenith (Mystic dusk, Lunar-volcanic night side)
 *   - moon       large cratered moon disc with soft rim glow (Dungeon "Broken Moon")
 *   - aurora     slow ribbon curtains (Arctic)
 * All colours are per-island uniforms. One draw call, no textures.
 */
export class IslandSky {
  constructor(parent, sky) {
    this.group = new THREE.Group();
    this.group.name = 'IslandSky';
    parent.add(this.group);
    const c = (h) => new THREE.Color(h);
    this.uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: sky.sunDir.clone().normalize() },
      uZenith: { value: c(sky.zenith) },
      uMid: { value: c(sky.mid) },
      uHorizon: { value: c(sky.horizon) },
      uHorizonAway: { value: c(sky.horizonAway) },
      uSunDisk: { value: c(sky.sunDisk) },
      uSunHalo: { value: c(sky.sunHalo) },
      uCloudLit: { value: c(sky.cloudLit) },
      uCloudShadow: { value: c(sky.cloudShadow) },
      uCloudRim: { value: c(sky.cloudRim) },
      uFogColor: { value: c(sky.haze) },
      uCloudCoverage: { value: sky.cloudCoverage ?? 0.6 },
      uCloudSpeed: { value: sky.cloudSpeed ?? 0.0045 },
      uSunStrength: { value: sky.sunStrength ?? 1.0 },
      uStars: { value: sky.stars ?? 0.0 },
      uStarColor: { value: c(sky.starColor ?? 0xfff6e8) },
      uMoonDir: { value: (sky.moonDir || new THREE.Vector3(0, 0.3, 1)).clone().normalize() },
      uMoonSize: { value: sky.moonSize ?? 0.0 },
      uMoonColor: { value: c(sky.moonColor ?? 0xf4efe6) },
      uMoonGlow: { value: c(sky.moonGlow ?? 0xffb88a) },
      uAurora: { value: sky.aurora ?? 0.0 },
      uAuroraA: { value: c(sky.auroraA ?? 0x5bffc8) },
      uAuroraB: { value: c(sky.auroraB ?? 0x7aa8ff) }
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
          gl_Position.z = gl_Position.w * 0.99999;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uCloudCoverage, uCloudSpeed, uSunStrength, uStars, uMoonSize, uAurora;
        uniform vec3 uSunDir, uMoonDir;
        uniform vec3 uZenith, uMid, uHorizon, uHorizonAway, uSunDisk, uSunHalo;
        uniform vec3 uCloudLit, uCloudShadow, uCloudRim, uFogColor, uStarColor, uMoonColor, uMoonGlow, uAuroraA, uAuroraB;
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

          vec2 dirH = normalize(dir.xz + vec2(1e-4));
          vec2 sunH = normalize(sunDir.xz + vec2(1e-4));
          float sunSide = dot(dirH, sunH) * 0.5 + 0.5;
          vec3 horizon = mix(uHorizonAway, uHorizon, pow(max(sunSide, 1e-4), 1.6));
          float hT = clamp(elev, 0.0, 1.0);
          vec3 sky = mix(horizon, uMid, smoothstep(0.0, 0.22, hT));
          sky = mix(sky, uZenith, smoothstep(0.18, 0.75, hT));
          float hazeBand = 1.0 - smoothstep(-0.02, 0.06, elev);
          sky = mix(sky, uFogColor, hazeBand * 0.7);
          if (elev < 0.0) sky = mix(uFogColor, uFogColor * 0.92, clamp(-elev * 4.0, 0.0, 1.0));

          // ---- Stars (behind clouds, stronger toward the zenith) ----
          float up = max(elev, 0.0);
          if (uStars > 0.001) {
            vec2 sp = vec2(atan(dir.z, dir.x + 1e-5) * 70.0, elev * 140.0);
            vec2 cell = floor(sp);
            vec2 f = fract(sp) - 0.5;
            float h = gHash12(cell);
            vec2 off = vec2(gHash12(cell + 3.1), gHash12(cell + 7.7)) - 0.5;
            float d = length(f - off * 0.6);
            float tw = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
            float big = step(0.965, h) * (1.0 - smoothstep(0.04, 0.16, d));
            float small = step(0.88, h) * (1.0 - smoothstep(0.02, 0.07, d)) * 0.45;
            sky += uStarColor * (big + small) * tw * smoothstep(0.08, 0.5, up) * uStars;
          }

          // ---- Aurora curtains ----
          if (uAurora > 0.001) {
            vec2 auv = dir.xz / (up + 0.25);
            float t = uTime * 0.03;
            float band = gFbm(vec2(auv.x * 0.6 + t, auv.y * 0.15));
            float curtain = smoothstep(0.45, 0.62, band) * (1.0 - smoothstep(0.62, 0.8, band));
            float rays = 0.6 + 0.4 * gNoise(vec2(auv.x * 6.0 + t * 4.0, 0.5));
            float aMask = curtain * rays * smoothstep(0.12, 0.3, up) * (1.0 - smoothstep(0.55, 0.85, up));
            sky += mix(uAuroraA, uAuroraB, smoothstep(0.2, 0.6, up)) * aMask * uAurora;
          }

          // ---- Sun ----
          float sdot = max(dot(dir, sunDir), 0.0);
          float disk = smoothstep(0.9993, 0.99965, sdot);
          float halo1 = (sdot > 0.0001) ? pow(sdot, 900.0) : 0.0;
          float halo2 = (sdot > 0.0001) ? pow(sdot, 48.0) : 0.0;
          float halo3 = (sdot > 0.0001) ? pow(sdot, 6.0) : 0.0;
          sky += uSunHalo * (halo2 * 0.42 + halo3 * 0.2) * uSunStrength;

          // ---- Moon (cratered disc) ----
          float moonCover = 0.0;
          if (uMoonSize > 0.0001) {
            vec3 md = normalize(uMoonDir);
            float mdot = dot(dir, md);
            float ang = acos(clamp(mdot, -1.0, 1.0));
            float rDisk = uMoonSize;
            float inDisk = 1.0 - smoothstep(rDisk * 0.97, rDisk, ang);
            // Local disc coordinates
            vec3 mx = normalize(cross(md, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
            vec3 my = normalize(cross(mx, md));
            vec2 mp = vec2(dot(dir - md * mdot, mx), dot(dir - md * mdot, my)) / max(rDisk, 1e-4);
            float craters = 0.0;
            for (int i = 0; i < 7; i++) {
              float fi = float(i);
              vec2 cc = vec2(sin(fi * 2.7 + 0.5), cos(fi * 1.9 + 1.1)) * (0.25 + 0.45 * fract(fi * 0.618));
              float cr = 0.09 + 0.12 * fract(fi * 0.371);
              float d = length(mp - cc);
              craters += (1.0 - smoothstep(cr * 0.75, cr, d)) * 0.35 + (smoothstep(cr * 0.85, cr, d) * (1.0 - smoothstep(cr, cr * 1.15, d))) * 0.2;
            }
            float maria = smoothstep(0.45, 0.7, gFbm(mp * 1.6 + 3.0)) * 0.35;
            float limb = sqrt(max(1.0 - dot(mp, mp), 0.0));
            vec3 moon = uMoonColor * (0.72 + 0.28 * limb) * (1.0 - maria) * (1.0 - craters * 0.55);
            // Volcanic glow on the lower rim of the moon
            moon += uMoonGlow * smoothstep(0.3, 1.0, -mp.y) * 0.18;
            float glow = (mdot > 0.0) ? pow(max(mdot, 1e-4), 260.0) * 0.6 + pow(max(mdot, 1e-4), 30.0) * 0.12 : 0.0;
            sky += uMoonGlow * glow;
            sky = mix(sky, moon * 1.25, inDisk);
            moonCover = inDisk;
          }

          // ---- Clouds ----
          vec2 cuv = dir.xz / (up + 0.09);
          float t = uTime * uCloudSpeed;
          float band = smoothstep(0.0, 0.05, up) * (1.0 - smoothstep(0.18, 0.5, up));
          vec2 cumUv = cuv * 0.55 + vec2(t, t * 0.35);
          float cum = cloudDensity(cumUv, 0.55 + band * 0.75);
          float cir = smoothstep(0.55, 0.85, gFbm(vec2(cuv.x * 0.18, cuv.y * 0.6) + vec2(t * 1.7, 0.0))) * smoothstep(0.12, 0.35, up) * 0.45;
          vec2 toSun = normalize(sunH) * 0.12;
          float shadowSample = cloudDensity(cumUv + toSun, 0.55 + band * 0.75);
          float lit = clamp(1.0 - (shadowSample - cum) * 1.8 - shadowSample * 0.35, 0.0, 1.0);
          float cel = smoothstep(0.35, 0.65, lit);
          vec3 cloudCol = mix(uCloudShadow, uCloudLit, cel);
          float edge = cum * (1.0 - cum) * 4.0;
          cloudCol += uCloudRim * edge * pow(max(sunSide, 1e-4), 3.0) * 0.55;
          cloudCol = mix(cloudCol, uSunHalo, halo3 * 0.35);
          float cloudFade = smoothstep(0.0, 0.06, up);
          float cloudOverMoon = 1.0 - moonCover * 0.35;
          sky = mix(sky, cloudCol, cum * 0.96 * cloudFade * cloudOverMoon);
          sky = mix(sky, uCloudLit, cir * (1.0 - cum));

          sky += uSunDisk * (disk * 3.2 + halo1 * 1.2) * (1.0 - cum * 0.85) * uSunStrength;
          gl_FragColor = vec4(sky, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'IslandSkyDome';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.group.add(this.mesh);
  }

  update(delta, cameraPos) {
    this.uniforms.uTime.value += delta;
    if (cameraPos) this.mesh.position.set(cameraPos.x, 0, cameraPos.z);
  }

  setVisible(v) { this.group.visible = v; }
}
