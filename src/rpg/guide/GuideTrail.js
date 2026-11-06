// GuideTrail.js — Hito 136 · «Chispa guía»: una chispa sale de los pies del personaje y recorre el camino hacia el
// objetivo dejando migas de polvo dorado que se apagan solas. El camino se dibuja por partes y luego desaparece.
//
// Presupuesto: UNA llamada de dibujo (THREE.Points: 1 chispa + 16 migas de 3 motas = 49 puntos), sin texturas (la
// forma se dibuja en el shader), sin luces ni sombras. Por fotograma solo se tocan esos 49 puntos, y nada si no hay
// pulso activo (el objeto se oculta). La altura del suelo se consulta una vez por miga al lanzar el pulso.
// Movimiento reducido (access.reduceMotion): sin chispa que viaja ni parpadeo; las migas aparecen y se apagan.
// API: const t = new GuideTrail(scene); t.pulse(path, heightFn, { skip }); t.update(dt, camera, renderer); t.stop(); t.dispose()

import * as THREE from 'three';
import { access } from '../../ui/AccessPrefs.js';

const MAX_CRUMBS = 16;
const MOTES = 3;         // por miga: una mota grande y dos de polvo alrededor
const SPACING = 1.4;     // m entre migas
const START = 1.3;       // la primera miga, algo por delante de los pies
const MAX_LEN = 18;      // m de camino que se dibujan por pulso
const FLOAT_Y = 0.45;    // altura de las migas (por encima de la hierba)
const SPEED = 11;        // m/s de la chispa
const LIFE = 2.6;        // s que dura cada miga
const FADE_IN = 0.14, FADE_OUT = 0.9;
const SPARK_SIZE = 1.0, CRUMB_SIZE = 0.6, DUST_SIZE = 0.22; // m

export const GUIDE_LEN = MAX_LEN;

const VERT = /* glsl */`
  attribute float aAlpha;
  attribute float aSize;
  attribute float aStar;
  uniform float uScale;
  varying float vAlpha;
  varying float vStar;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aAlpha > 0.003 ? aSize * uScale / max(0.1, -mv.z) : 0.0;
    vAlpha = aAlpha;
    vStar = aStar;
  }
`;

const FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform vec3 uCore;
  varying float vAlpha;
  varying float vStar;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(p, p);
    float glow = exp(-r2 * 3.2);
    float core = exp(-r2 * 30.0);
    // destello de cuatro puntas (más marcado en la chispa)
    float sx = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y));
    float sy = max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x));
    float star = (sx + sy) * vStar;
    float a = clamp(glow * 0.85 + core + star, 0.0, 1.0) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(uColor, uCore, clamp(core * 1.2 + star * 0.6, 0.0, 1.0)), a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class GuideTrail {
  constructor(scene) {
    this.scene = scene;
    const n = 1 + MAX_CRUMBS * MOTES; // [0] chispa
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.alpha = new Float32Array(n);
    this.size = new Float32Array(n);
    this.star = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aStar = new THREE.BufferAttribute(this.star, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos);
    g.setAttribute('aAlpha', this.aAlpha);
    g.setAttribute('aSize', this.aSize);
    g.setAttribute('aStar', this.aStar);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uScale: { value: 600 },
        // oro de la Crónica Celeste; el centro pasa de 1 para que el bloom del mundo le dé brillo
        uColor: { value: new THREE.Color('#F0A531') },
        uCore: { value: new THREE.Color('#FFF6DE').multiplyScalar(1.5) }
      },
      transparent: true,
      depthWrite: false
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.name = 'GuideTrail';
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.points.visible = false;
    // Oculto, warmupRender lo precompila igual (Hito 113): así el primer pulso no congela la pantalla.
    scene.add(this.points);
    this.crumbs = [];      // { x, y, z, s, d: [dx, dz, dy, …] }
    this.active = false;
    this.t = 0;
    this.end = 0;
    this.ready = true;
    this._seed = 1;
  }

  _rnd() { this._seed = (this._seed * 16807) % 2147483647; return this._seed / 2147483647; }

  /**
   * Lanza un pulso por `path` ([{x, z}, …], empezando en el jugador). heightFn(x, z) → altura del suelo.
   * skip(x, z) → true para no dejar una miga ahí (camino en línea recta: dentro de un árbol o en el agua).
   */
  pulse(path, heightFn, { skip = null } = {}) {
    if (!path || path.length < 2) return false;
    const crumbs = [];
    let s = 0, next = START;
    for (let k = 1; k < path.length && crumbs.length < MAX_CRUMBS; k++) {
      const a = path[k - 1], b = path[k];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      while (next <= s + L && next <= MAX_LEN && crumbs.length < MAX_CRUMBS) {
        const t = (next - s) / (L || 1);
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        if (!skip || !skip(x, z)) {
          const h = heightFn ? heightFn(x, z) : 0;
          const d = [];
          for (let m = 1; m < MOTES; m++) d.push((this._rnd() - 0.5) * 0.6, (this._rnd() - 0.5) * 0.6, (this._rnd() - 0.3) * 0.3);
          crumbs.push({ x, y: (Number.isFinite(h) ? h : 0) + FLOAT_Y, z, s: next, d });
        }
        next += SPACING;
      }
      s += L;
      if (next > MAX_LEN) break;
    }
    if (!crumbs.length) return false;
    const h0 = heightFn ? heightFn(path[0].x, path[0].z) : 0;
    this.origin = { x: path[0].x, y: (Number.isFinite(h0) ? h0 : 0) + FLOAT_Y * 0.6, z: path[0].z };
    this.crumbs = crumbs;
    this.reduced = !!access.reduceMotion;
    this.t = 0;
    this.stopping = false;
    const travel = this.reduced ? 0 : crumbs[crumbs.length - 1].s / SPEED;
    this.end = travel + LIFE + 0.1;
    this.active = true;
    this.points.visible = true;
    this.alpha.fill(0);
    return true;
  }

  /** Apaga lo que haya (deprisa, sin cortes). */
  stop() {
    if (!this.active || this.stopping) return;
    this.end = Math.min(this.end, this.t + 0.35);
    this.stopping = true;
  }

  get busy() { return this.active; }

  update(dt, camera, renderer) {
    if (!this.active) return;
    this.t += Math.min(dt, 0.1);
    const t = this.t;
    if (t >= this.end) {
      this.active = false; this.stopping = false;
      this.points.visible = false;
      return;
    }
    if (camera && renderer) {
      const H = renderer.domElement ? renderer.domElement.height : 800;
      this.mat.uniforms.uScale.value = H / (2 * Math.tan(THREE.MathUtils.degToRad((camera.fov || 50) / 2)));
    }
    const { pos, alpha, size, star, crumbs, reduced } = this;
    const fadeAll = this.stopping ? Math.max(0, (this.end - t) / 0.35) : 1;
    // Migas
    for (let i = 0; i < crumbs.length; i++) {
      const c = crumbs[i];
      const born = reduced ? 0 : c.s / SPEED;
      const age = t - born;
      let a = 0;
      if (age > 0) {
        const fi = reduced ? 0.35 : FADE_IN;
        a = Math.max(0, Math.min(1, age / fi) * Math.min(1, (LIFE - age) / FADE_OUT));
      }
      // las del final, algo más tenues: se lee hacia dónde va
      a *= (1 - 0.3 * (i / Math.max(1, crumbs.length - 1))) * fadeAll;
      const rise = reduced ? 0 : Math.max(0, age) * 0.07;
      const bob = reduced ? 0 : Math.sin(t * 3 + i * 0.9) * 0.04;
      const j = 1 + i * MOTES;
      pos[j * 3] = c.x; pos[j * 3 + 1] = c.y + rise + bob; pos[j * 3 + 2] = c.z;
      alpha[j] = a;
      size[j] = CRUMB_SIZE * (reduced ? 1 : 0.88 + 0.2 * Math.sin(t * 9 + i * 2.1));
      star[j] = reduced ? 0.35 : 0.3 + 0.5 * Math.max(0, Math.sin(t * 6 + i * 1.7));
      // polvo: dos motas pequeñas que se separan un poco y suben más deprisa
      for (let m = 1; m < MOTES; m++) {
        const q = j + m, o = (m - 1) * 3;
        const spread = reduced ? 1 : 0.6 + Math.min(1, Math.max(0, age)) * 0.6;
        pos[q * 3] = c.x + c.d[o] * spread;
        pos[q * 3 + 1] = c.y + c.d[o + 2] + rise * 1.8;
        pos[q * 3 + 2] = c.z + c.d[o + 1] * spread;
        alpha[q] = a * (reduced ? 0.8 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 11 + i * 3.3 + m * 2)));
        size[q] = DUST_SIZE;
        star[q] = 0;
      }
    }
    // Chispa: recorre las migas a SPEED; al final, un destello y se apaga
    if (!reduced && crumbs.length) {
      const d = t * SPEED;
      const last = crumbs[crumbs.length - 1];
      if (d < last.s) {
        let ax = this.origin.x, ay = this.origin.y, az = this.origin.z, as = 0;
        let k = 0;
        while (k < crumbs.length && crumbs[k].s <= d) { const c = crumbs[k]; ax = c.x; ay = c.y; az = c.z; as = c.s; k++; }
        const b = crumbs[Math.min(k, crumbs.length - 1)];
        const u = b.s > as ? (d - as) / (b.s - as) : 1;
        pos[0] = ax + (b.x - ax) * u; pos[1] = ay + (b.y - ay) * u + 0.1; pos[2] = az + (b.z - az) * u;
        alpha[0] = fadeAll; size[0] = SPARK_SIZE; star[0] = 1;
      } else {
        const f = (d - last.s) / SPEED; // s desde que llegó
        pos[0] = last.x; pos[1] = last.y + 0.1; pos[2] = last.z;
        alpha[0] = Math.max(0, 1 - f / 0.4) * fadeAll;
        size[0] = SPARK_SIZE * (1 + f * 2); star[0] = 1;
      }
    } else alpha[0] = 0;
    this.aPos.needsUpdate = true;
    this.aAlpha.needsUpdate = true;
    this.aSize.needsUpdate = true;
    this.aStar.needsUpdate = true;
  }

  dispose() {
    this.scene?.remove(this.points);
    this.points.geometry.dispose();
    this.mat.dispose();
    this.active = false;
  }
}
