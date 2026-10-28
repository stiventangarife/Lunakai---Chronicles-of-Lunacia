// Seagulls.js — Gaviotas sobre el mar, en el horizonte del Bosque y la Sabana (Hito 94).
//
// Unas pocas bandadas planean en círculos sobre el mar, lejos de la costa, y aletean de vez en cuando. Todo es una
// sola malla instanciada (una llamada de dibujo para todas): la gaviota es una V de pocos triángulos hecha por código
// y el aleteo se hace en la GPU (cada vértice del ala sube y baja según lo lejos que está del cuerpo). En la CPU solo se
// mueve la matriz de cada gaviota (≈20 por fotograma). Va dentro del grupo de la zona: se ve y se oculta con ella.
import * as THREE from 'three';

/** Gaviota mirando a +z, alas a lo largo de x (envergadura 2·SPAN). Atributos: color y aSpan (0 cuerpo → 1 punta). */
function gullGeometry() {
  const SPAN = 1.0;
  const P = [], C = [], S = [];
  const white = [0.96, 0.97, 0.98], grey = [0.70, 0.74, 0.79], tip = [0.16, 0.17, 0.2], beak = [0.95, 0.72, 0.22];
  const tri = (a, b, c, ca, cb, cc, sa, sb, sc) => { P.push(...a, ...b, ...c); C.push(...ca, ...cb, ...cc); S.push(sa, sb, sc); };
  // Cuerpo: huso fino (rombo de sección) con pico
  const nose = [0, 0, 0.42], tail = [0, 0.02, -0.38], top = [0, 0.07, 0.02], bot = [0, -0.06, 0.02], l = [-0.07, 0, 0.02], r = [0.07, 0, 0.02];
  for (const [a, b] of [[top, r], [r, bot], [bot, l], [l, top]]) {
    tri(nose, a, b, beak, white, white, 0, 0, 0);
    tri(tail, b, a, white, white, white, 0, 0, 0);
  }
  // Cola en abanico
  tri([0, 0.02, -0.3], [-0.12, 0.02, -0.5], [0.12, 0.02, -0.5], white, white, white, 0, 0, 0);
  // Alas: tramo interior (blanco → gris) y exterior (gris → punta oscura), en «M» suave
  for (const s of [-1, 1]) {
    const r0f = [s * 0.06, 0.02, 0.16], r0b = [s * 0.06, 0.02, -0.12];
    const r1f = [s * 0.5 * SPAN, 0.06, 0.12], r1b = [s * 0.5 * SPAN, 0.06, -0.14];
    const r2 = [s * SPAN, 0.0, -0.22], r2f = [s * 0.86 * SPAN, 0.02, -0.06];
    const k1 = 0.5, k2 = 1.0, k2f = 0.86;
    if (s > 0) {
      tri(r0f, r0b, r1b, white, white, grey, 0.06, 0.06, k1); tri(r0f, r1b, r1f, white, grey, grey, 0.06, k1, k1);
      tri(r1f, r1b, r2, grey, grey, tip, k1, k1, k2); tri(r1f, r2, r2f, grey, tip, tip, k1, k2, k2f);
    } else {
      tri(r0f, r1b, r0b, white, grey, white, 0.06, k1, 0.06); tri(r0f, r1f, r1b, white, grey, grey, 0.06, k1, k1);
      tri(r1f, r2, r1b, grey, tip, grey, k1, k2, k1); tri(r1f, r2f, r2, grey, tip, tip, k1, k2f, k2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('aSpan', new THREE.Float32BufferAttribute(S, 1));
  g.computeVertexNormals();
  return g;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class SeagullFlocks {
  /**
   * @param {THREE.Object3D} parent  grupo de la zona
   * @param {object} [o]
   * @param {number} [o.flocks=3]      bandadas
   * @param {number} [o.perFlock=6]    gaviotas por bandada
   * @param {[number,number]} [o.ring] distancia al centro de la isla de los centros de las bandadas (m), sobre el mar
   * @param {[number,number]} [o.height] altura de vuelo (m)
   * @param {number} [o.size=1.4]      media envergadura (m); algo más grande que una gaviota real para que se lea de lejos
   * @param {number} [o.seed=7]
   * @param {number[]} [o.angles]      ángulos (rad) de las bandadas alrededor de la isla; si no, al azar
   */
  constructor(parent, o = {}) {
    const R = rng(o.seed ?? 7);
    const flocks = o.flocks ?? 3, per = o.perFlock ?? 6, ring = o.ring || [140, 190], hgt = o.height || [16, 30];
    const size = o.size ?? 1.4;
    this.time = { value: 0 };
    this.gulls = [];
    for (let f = 0; f < flocks; f++) {
      const ang = o.angles?.[f] ?? (f / flocks) * Math.PI * 2 + R() * 1.2;
      const dist = ring[0] + R() * (ring[1] - ring[0]);
      const cx = Math.cos(ang) * dist, cz = Math.sin(ang) * dist, cy = hgt[0] + R() * (hgt[1] - hgt[0]);
      const dir = R() < 0.5 ? 1 : -1;                     // sentido de giro de la bandada
      const orbit = 14 + R() * 16;                        // radio del círculo (m)
      for (let i = 0; i < per; i++) {
        this.gulls.push({
          cx, cy, cz, dir,
          rad: orbit * (0.7 + R() * 0.6),                 // cada una en su propio círculo, cerca de las demás
          a0: R() * Math.PI * 2,
          w: (5.5 + R() * 2.5) / orbit,                   // ~6–8 m/s
          dy: (R() - 0.5) * 6, bobF: 0.2 + R() * 0.25, bobP: R() * 6.3,
          wob: R() * 6.3, s: size * (0.85 + R() * 0.3),
          phase: R() * 6.3
        });
      }
    }
    const geo = gullGeometry();
    const n = this.gulls.length;
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(Float32Array.from(this.gulls.map((g) => g.phase)), 1));
    // Sin luz (de lejos se ven desde abajo, a contraluz, y salían grises oscuras): blanco y gris planos, con niebla
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.time;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aSpan;\nattribute float aPhase;\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          // Planea casi siempre; cada pocos segundos aletea un rato
          float on = smoothstep(0.35, 0.8, sin(uTime * 0.45 + aPhase * 1.7));
          float flap = sin(uTime * 7.5 + aPhase) * mix(0.12, 1.0, on);
          float bend = pow(aSpan, 1.4);
          transformed.y += flap * bend * 0.55 + aSpan * 0.08;
          transformed.x *= 1.0 - abs(flap) * bend * 0.12;`);
    };
    mat.customProgramCacheKey = () => 'lk-seagull';
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.name = 'SeagullFlocks';
    this.mesh.userData.cameraIgnore = true;               // la cámara no choca con ellas (CameraOcclusion)
    this.mesh.frustumCulled = false;                      // se mueven por todo el horizonte
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this.update(0);
  }

  update(dt) {
    if (!this.mesh.visible) return;
    const t = (this.time.value += dt);
    const { _m: m, _q: q, _e: e, _p: p, _s: s } = this;
    this.gulls.forEach((g, i) => {
      const a = g.a0 + g.dir * g.w * t;
      const r = g.rad * (1 + 0.12 * Math.sin(t * 0.13 + g.wob));
      p.set(g.cx + Math.cos(a) * r, g.cy + g.dy + Math.sin(t * g.bobF + g.bobP) * 1.4, g.cz + Math.sin(a) * r);
      // mira hacia donde vuela (tangente del círculo) y se inclina hacia dentro del giro
      const tx = -Math.sin(a) * g.dir, tz = Math.cos(a) * g.dir;
      e.set(Math.sin(t * g.bobF + g.bobP) * 0.08, Math.atan2(tx, tz), g.dir * 0.32);
      q.setFromEuler(e);
      s.setScalar(g.s);
      m.compose(p, q, s);
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
