// ChimneySmoke.js — Humo gris claro y tranquilo que sale de las chimeneas de las casas (Hito 96).
//
// · Todas las casas usan house.glb: su chimenea es la boquilla curva de barro del tejado (HOUSE_CHIMNEY, en unidades
//   del GLB, antes de centrar y escalar). Quien coloca la casa pasa su centro, altura, giro y escala con `chimneyPoint`.
// · Un `THREE.Points` por grupo de casas (una sola llamada de dibujo por isla). Las bolitas nacen en la boca, suben,
//   se ensanchan, se inclinan un poco con el viento y se desvanecen. Todo el movimiento va en el shader: sin trabajo
//   del procesador en cada fotograma (el tiempo se lee al dibujar, así que no hace falta llamar a update()).
// · Un solo material para todas las chimeneas del juego (el programa del shader se compila una vez).
// · Con «Reducir movimiento» el humo sube más despacio.
// · Toma la luz de la escena (hemisférica, ambiente y sol; se miran cada pocos segundos): de noche o en islas oscuras
//   el humo se oscurece y se tiñe con su luz en vez de brillar sobre el cielo.

import * as THREE from 'three';
import { access } from '../../ui/AccessPrefs.js';

/** Boca de la chimenea de house.glb (unidades del GLB; frente = +Z). */
export const HOUSE_CHIMNEY = { x: 0.245, y: 1.88, z: -0.11 };

/** Aspecto del humo (gris claro y tranquilo). */
export const SMOKE_STYLE = {
  perChimney: 22,     // bolitas por chimenea
  life: 8.0,          // segundos que tarda una bolita en subir y desaparecer
  rise: 6.5,          // metros que sube
  sizeStart: 0.7,     // tamaño (m) al salir
  sizeEnd: 3.2,       // tamaño (m) al desvanecerse
  drift: 1.6,         // metros que se inclina con el viento al final
  opacity: 0.42,
  colorA: 0xe4e6e8,
  colorB: 0xc9cdd2,
  wind: [0.8, 0.35],  // dirección del viento (x, z), se normaliza
};

/**
 * Punto de salida del humo de una casa, en el espacio de su grupo padre.
 * @param {{x:number,y:number,z:number,yaw?:number,scale:number,cx?:number,cy?:number,cz?:number}} h
 *   x, y, z: posición de la base de la casa (centro de la planta); cx, cy, cz: lo que se restó al centrar el GLB.
 */
export function chimneyPoint(h) {
  const s = h.scale;
  const lx = (HOUSE_CHIMNEY.x - (h.cx || 0)) * s;
  const ly = (HOUSE_CHIMNEY.y - (h.cy || 0)) * s;
  const lz = (HOUSE_CHIMNEY.z - (h.cz || 0)) * s;
  const c = Math.cos(h.yaw || 0), sn = Math.sin(h.yaw || 0);
  return new THREE.Vector3(h.x + c * lx + sn * lz, h.y + ly, h.z - sn * lx + c * lz);
}

let _material = null;
const _size = new THREE.Vector2();

function smokeMaterial() {
  if (_material) return _material;
  const S = SMOKE_STYLE;
  const w = new THREE.Vector2(...S.wind).normalize();
  _material = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsLib.fog,
      uTime: { value: 0 },
      uViewH: { value: 800 },
      uLife: { value: S.life },
      uRise: { value: S.rise },
      uSize: { value: new THREE.Vector2(S.sizeStart, S.sizeEnd) },
      uWind: { value: new THREE.Vector3(w.x * S.drift, 0, w.y * S.drift) },
      uOpacity: { value: S.opacity },
      uColorA: { value: new THREE.Color(S.colorA) },
      uColorB: { value: new THREE.Color(S.colorB) },
      uLight: { value: new THREE.Color(1, 1, 1) },
    },
    transparent: true,
    depthWrite: false,
    fog: true,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      attribute vec3 aRnd;           // x: fase, y/z: variación
      uniform float uTime, uViewH, uLife, uRise;
      uniform vec2 uSize;
      uniform vec3 uWind;
      varying float vAlpha;
      varying float vTint;
      varying vec2 vSpin;
      void main() {
        float age = fract(uTime / (uLife * (0.85 + 0.3 * aRnd.y)) + aRnd.x);
        vec3 p = position;
        p.y += uRise * (age * (1.15 - 0.15 * age));                  // sube y frena un poco arriba
        p += uWind * pow(age, 1.6);                                   // se inclina con el viento
        float a = aRnd.z * 6.2831 + uTime * 0.35;                     // remolino suave
        p.xz += vec2(cos(a), sin(a)) * (0.04 + 0.6 * age);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0); // nombre que espera fog_vertex
        gl_Position = projectionMatrix * mvPosition;
        float size = mix(uSize.x, uSize.y, sqrt(age)) * (0.8 + 0.4 * aRnd.y);
        gl_PointSize = clamp(size * projectionMatrix[1][1] * uViewH * 0.5 / max(-mvPosition.z, 0.5), 1.0, 256.0);
        vAlpha = smoothstep(0.0, 0.06, age) * (1.0 - smoothstep(0.45, 1.0, age));
        vTint = aRnd.y;
        float r = aRnd.z * 6.2831 + age * 1.5;
        vSpin = vec2(cos(r), sin(r));
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform vec3 uColorA, uColorB, uLight;
      uniform float uOpacity;
      varying float vAlpha;
      varying float vTint;
      varying vec2 vSpin;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        c = vec2(c.x * vSpin.x - c.y * vSpin.y, c.x * vSpin.y + c.y * vSpin.x);
        // borde algo irregular (tres lóbulos) para que no parezcan discos
        float ang = atan(c.y, c.x);
        float r = length(c) / (0.86 + 0.14 * sin(ang * 3.0 + vTint * 6.0));
        if (r > 1.0) discard;
        float soft = 1.0 - smoothstep(0.15, 1.0, r);
        vec3 col = mix(uColorA, uColorB, vTint + 0.35 * c.y) * uLight;
        gl_FragColor = vec4(col, soft * soft * vAlpha * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  _material.name = 'ChimneySmoke';
  return _material;
}

// Luz de la escena para el humo: suma de hemisférica (media cielo/suelo), ambiente y media del sol, normalizada a la
// luz de día del juego (≈ 2,0). Las luces se buscan una vez por escena y cada 5 s (no se recorre la escena por fotograma).
const DAY_LIGHT = 2.0;
const _lights = new WeakMap();
const _tmp = new THREE.Color();
function sceneLight(scene, out) {
  if (!scene) return out.setRGB(1, 1, 1);
  const now = performance.now();
  let rec = _lights.get(scene);
  if (!rec || now - rec.t > 5000) {
    const list = [];
    scene.traverse((o) => { if (o.isHemisphereLight || o.isAmbientLight || o.isDirectionalLight) list.push(o); });
    rec = { t: now, list };
    _lights.set(scene, rec);
  }
  out.setRGB(0, 0, 0);
  for (const l of rec.list) {
    if (!l.visible) continue;
    if (l.isHemisphereLight) out.add(_tmp.copy(l.color).lerp(l.groundColor, 0.5).multiplyScalar(l.intensity));
    else out.add(_tmp.copy(l.color).multiplyScalar(l.intensity * (l.isDirectionalLight ? 0.5 : 1)));
  }
  if (!rec.list.length) return out.setRGB(1, 1, 1);
  const lum = (out.r * 0.2126 + out.g * 0.7152 + out.b * 0.0722) / DAY_LIGHT;
  const k = Math.min(1, Math.max(0.28, lum));
  const m = Math.max(out.r, out.g, out.b, 1e-4);
  // brillo según la luz, con un 25 % de su color (amanecer cálido, noche azulada)
  return out.setRGB(k * (0.75 + 0.25 * out.r / m), k * (0.75 + 0.25 * out.g / m), k * (0.75 + 0.25 * out.b / m));
}

export class ChimneySmoke {
  /**
   * @param {THREE.Object3D} parent  grupo donde viven las casas
   * @param {THREE.Vector3[]} points  bocas de las chimeneas (espacio de `parent`), ver chimneyPoint
   */
  constructor(parent, points = []) {
    this.parent = parent;
    this.points = null;
    this.setPoints(points);
  }

  /** Cambia las chimeneas (p. ej. cuando la casa se asienta en el terreno). */
  setPoints(points) {
    const n = SMOKE_STYLE.perChimney;
    const count = points.length * n;
    if (this.points && this.points.geometry.attributes.position.count === count) {
      const pos = this.points.geometry.attributes.position;
      points.forEach((p, k) => { for (let i = 0; i < n; i++) pos.setXYZ(k * n + i, p.x, p.y, p.z); });
      pos.needsUpdate = true;
      this._bounds(points);
      return;
    }
    this.dispose();
    if (!count) return;
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 3);
    let seed = 1;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    points.forEach((p, k) => {
      for (let i = 0; i < n; i++) {
        const j = k * n + i;
        pos.set([p.x, p.y, p.z], j * 3);
        // fases repartidas (más una pizca de azar): la columna sale continua, no a golpes
        rnd.set([(i + r() * 0.6) / n + k * 0.37, r(), r()], j * 3);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 3));
    this.points = new THREE.Points(geo, smokeMaterial());
    this.points.name = 'ChimneySmoke';
    this.points.renderOrder = 6;
    this.points.onBeforeRender = (renderer, scene) => {
      const u = this.points.material.uniforms;
      sceneLight(scene, u.uLight.value);
      u.uTime.value = performance.now() / 1000 * (access.reduceMotion ? 0.6 : 1);
      u.uViewH.value = renderer.getDrawingBufferSize(_size).y;
    };
    this._bounds(points);
    this.parent.add(this.points);
  }

  _bounds(points) {
    if (!this.points || !points.length) return;
    const box = new THREE.Box3().setFromPoints(points);
    const S = SMOKE_STYLE;
    box.max.y += S.rise + S.sizeEnd;
    box.expandByScalar(S.drift + S.sizeEnd);
    this.points.geometry.boundingBox = box;
    this.points.geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  }

  dispose() {
    if (!this.points) return;
    this.points.parent?.remove(this.points);
    this.points.geometry.dispose(); // el material es compartido por todas las chimeneas
    this.points = null;
  }
}
