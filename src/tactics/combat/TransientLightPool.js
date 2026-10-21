// TransientLightPool.js — Luces puntuales "prestadas" para efectos breves del combate.
//
// Por qué existe: en three.js el número de luces visibles forma parte de la clave de cada
// programa (shader). Crear o quitar una PointLight —o mostrarla/ocultarla con `visible`— hace
// que TODOS los materiales iluminados de la escena se recompilen en ese fotograma: un tirón.
//
// Solución: la escena de combate tiene siempre las mismas N luces puntuales, con intensidad 0.
// Un efecto pide una (acquire) y recibe un "handle" con la misma forma que usaba antes
// (`h.intensity = …`), y la devuelve con release(h). El número de luces nunca cambia.
//
// Seguridad: cada préstamo tiene un número de generación. Si la luz se reasigna a otro efecto
// (todas ocupadas, o venció maxLife), el handle viejo queda "muerto": escribir su intensidad o
// llamar a release() con él ya no afecta a la luz del nuevo dueño. Si no hay luz libre, el efecto
// recibe un handle sin luz (no brilla, pero no le quita la suya a nadie).

import * as THREE from 'three';

const _v = new THREE.Vector3();

class LightHandle {
  constructor(pool, slot, gen) {
    this._pool = pool;
    this._slot = slot;
    this._gen = gen;
    this._intensity = slot ? slot.light.intensity : 0;
  }
  get alive() { return !!this._slot && this._slot.gen === this._gen && this._slot.busy; }
  get intensity() { return this._intensity; }
  set intensity(v) {
    this._intensity = v;
    if (this.alive) this._slot.want = v;
  }
  get light() { return this.alive ? this._slot.light : null; }
}

export class TransientLightPool {
  /**
   * @param {THREE.Scene} scene  escena donde viven las luces (siempre)
   * @param {number} size        número fijo de luces (cada una cuesta algo de GPU aunque esté a 0)
   */
  constructor(scene, size = 2) {
    this.scene = scene;
    this.slots = [];
    for (let i = 0; i < size; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 1, 2);
      light.name = `pool_point_light_${i}`;
      light.castShadow = false;
      light.position.set(0, -500, 0);
      scene.add(light);
      this.slots.push({ light, busy: false, gen: 0, follow: null, offset: new THREE.Vector3(), want: 0, since: 0, maxLife: 0 });
    }
  }

  /**
   * Pide una luz. Devuelve un handle: anímalo con `h.intensity = …` y devuélvelo con release(h).
   * @param {object} o
   * @param {number|THREE.Color} [o.color=0xffffff]
   * @param {number} [o.intensity=1]
   * @param {number} [o.distance=0]
   * @param {number} [o.decay=2]   (2 = valor por defecto de PointLight en r160)
   * @param {THREE.Object3D} [o.follow]   la luz sigue a este objeto (p. ej. el grupo del proyectil)
   * @param {{x,y,z}} [o.offset]   desplazamiento local respecto a `follow`
   * @param {{x,y,z}} [o.position] posición fija en el mundo si no hay `follow`
   * @param {number} [o.maxLife=4] segundos tras los que se devuelve sola
   */
  acquire(o = {}) {
    const slot = this.slots.find((s) => !s.busy);
    if (!slot) return new LightHandle(this, null, 0); // sin luz libre: el efecto sigue sin luz
    const L = slot.light;
    slot.gen++;
    slot.busy = true;
    L.color.set(o.color ?? 0xffffff);
    L.distance = o.distance ?? 0;
    L.decay = o.decay ?? 2;
    slot.want = o.intensity ?? 1;
    slot.follow = o.follow || null;
    slot.offset.set(o.offset?.x || 0, o.offset?.y || 0, o.offset?.z || 0);
    slot.since = performance.now();
    slot.maxLife = (o.maxLife ?? 4) * 1000;
    if (!slot.follow && o.position) L.position.set(o.position.x, o.position.y, o.position.z);
    this._apply(slot);
    const h = new LightHandle(this, slot, slot.gen);
    h._intensity = slot.want;
    return h;
  }

  /** Devuelve una luz al conjunto. Acepta el handle (o null). Un handle viejo no hace nada. */
  release(h) {
    if (!h || !h.alive) return;
    this._free(h._slot);
  }

  releaseAll() {
    for (const s of this.slots) if (s.busy) this._free(s);
  }

  _free(slot) {
    slot.busy = false;
    slot.follow = null;
    slot.want = 0;
    slot.light.intensity = 0;
    slot.light.position.set(0, -500, 0);
  }

  _inScene(obj) {
    for (let p = obj; p; p = p.parent) if (p === this.scene) return true;
    return false;
  }

  _visible(obj) {
    for (let p = obj; p; p = p.parent) if (!p.visible) return false;
    return true;
  }

  /** Coloca la luz y aplica la intensidad pedida (0 si el objeto seguido está oculto). */
  _apply(slot) {
    const L = slot.light;
    if (slot.follow) {
      slot.follow.updateWorldMatrix(true, false);
      _v.copy(slot.offset).applyMatrix4(slot.follow.matrixWorld);
      L.position.copy(_v);
      L.intensity = this._visible(slot.follow) ? slot.want : 0;
    } else {
      L.intensity = slot.want;
    }
  }

  /** Llamar una vez por fotograma antes de renderizar. */
  update() {
    const t = performance.now();
    for (const s of this.slots) {
      if (!s.busy) continue;
      if (t - s.since > s.maxLife) { this._free(s); continue; }
      if (s.follow && !this._inScene(s.follow)) { this._free(s); continue; }
      this._apply(s);
    }
  }
}
