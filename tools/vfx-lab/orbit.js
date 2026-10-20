// orbit.js — Control de órbita mínimo para el laboratorio de VFX (el proyecto no incluye OrbitControls de three).
// Implementa solo lo que usa el laboratorio: target, enableDamping, enablePan (ignorado), minDistance, maxDistance,
// maxPolarAngle y update(). Arrastrar = girar; rueda o pellizco = acercar/alejar.
export class Orbit {
  constructor(THREE, camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.target = new THREE.Vector3();
    this.enableDamping = true;
    this.enablePan = false;
    this.minDistance = 1;
    this.maxDistance = 100;
    this.maxPolarAngle = Math.PI;
    this._sph = new THREE.Spherical();
    this._v = new THREE.Vector3();
    this._dTheta = 0; this._dPhi = 0; this._scale = 1;
    const pts = new Map();
    let pinch = 0;
    dom.addEventListener('pointerdown', (e) => { dom.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
    dom.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 1) {
        const h = dom.clientHeight || 1;
        this._dTheta -= 2 * Math.PI * (e.clientX - p.x) / h;
        this._dPhi -= 2 * Math.PI * (e.clientY - p.y) / h;
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this._scale *= pinch / Math.max(d, 1);
        pinch = d;
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', (e) => { e.preventDefault(); this._scale *= Math.pow(0.95, -Math.sign(e.deltaY)); }, { passive: false });
  }

  update() {
    const k = this.enableDamping ? 0.12 : 1;
    this._v.copy(this.camera.position).sub(this.target);
    this._sph.setFromVector3(this._v);
    this._sph.theta += this._dTheta * k;
    this._sph.phi = Math.min(this.maxPolarAngle, Math.max(0.05, this._sph.phi + this._dPhi * k));
    this._sph.radius = Math.min(this.maxDistance, Math.max(this.minDistance, this._sph.radius * Math.pow(this._scale, k)));
    this._v.setFromSpherical(this._sph);
    this.camera.position.copy(this.target).add(this._v);
    this.camera.lookAt(this.target);
    this._dTheta *= 1 - k; this._dPhi *= 1 - k; this._scale = Math.pow(this._scale, 1 - k);
  }
}
