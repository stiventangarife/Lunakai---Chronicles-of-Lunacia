// ForgeStation.js — Yunque de la Forja en el Valle del Dojō (zona 2_2), hecho con primitivas.
// Horno de barro con boca incandescente y chimenea, yunque sobre tocón, martillo, cubo de temple y un anillo dorado
// en el suelo que marca que se puede usar. Se integra como un nodo más de QuestInteractablesManager: el mismo aviso
// «E · Usar la forja» que el resto de objetos y la misma tecla E. Al pulsarla llama a onUse() (abre la pantalla).

import * as THREE from 'three';

/** Patio del Dojō: dentro del claro sin árboles (radio 16–22 m alrededor de −87.9, 74), a ~20 m del edificio. */
export const FORGE_SPOT = { zone: '2_2', x: -76.5, z: 67.0, yaw: Math.PI / 2 }; // el frente (+z local) mira al este, hacia el camino
const USE_RADIUS = 3.4;
const COLLIDER_RADIUS = 1.7;
const TAG = 'forge_station';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...o });

export class ForgeStation {
  /** @param {object} ow OverworldManager  @param {{ onUse: () => void }} opts */
  constructor(ow, { onUse }) {
    this.ow = ow;
    this.onUse = onUse;
    this.node = null;
    this._t = 0;
    this._snapT = 0;
    this.group = null;
    const qi = ow.questInteractables;
    if (!qi) return;
    this.qi = qi;
    // Luz del horno: se crea UNA vez y se queda en la escena (apagada fuera del Valle). Si se añadiera y quitara con
    // la zona, cambiaría el número de luces y three recompilaría todos los materiales de la escena al entrar y salir.
    this.light = new THREE.PointLight(0xFF8A3D, 0, 8, 1.6);
    this.light.name = 'ForgeStationLight';
    qi.scene.add(this.light);
    const load = qi.loadForZone.bind(qi);
    qi.loadForZone = (key) => { load(key); this._sync(key); };
    const update = qi.update.bind(qi);
    qi.update = (dt, pos) => { this._animate(dt || 0); update(dt, pos); };
    if (qi.currentZoneKey) this._sync(qi.currentZoneKey);
  }

  hidePrompt() { this.qi?.hidePrompt?.(); }

  _sync(key) {
    this.ow.collisions?.removeCirclesByTag?.(TAG);
    this.node = null;
    // el horno anterior (qi.clear() ya lo sacó de la escena): se libera su memoria de GPU
    if (this.group) {
      this.qi.scene.remove(this.group);
      this.group.traverse((c) => { c.geometry?.dispose?.(); c.material?.dispose?.(); });
      this.group = null;
    }
    this.light.intensity = 0;
    if (key !== FORGE_SPOT.zone) return;
    const group = this._build();
    group.position.set(FORGE_SPOT.x, this._ground(), FORGE_SPOT.z);
    group.rotation.y = FORGE_SPOT.yaw;
    this.qi.scene.add(group);
    this.group = group;
    this._placeLight();
    this.ow.collisions?.addCircle?.(FORGE_SPOT.x, FORGE_SPOT.z, COLLIDER_RADIUS, TAG);
    this.node = { id: 'forge_station', type: 'forge', group, radius: USE_RADIUS, promptText: 'Usar la forja', onInteract: () => this.onUse?.() };
    this.qi.nodes.push(this.node);
  }

  /** La luz vive en la escena: se coloca en la boca del horno (punto local 0 · 0,9 · 0,45 del grupo). */
  _placeLight() {
    if (!this.group) return;
    this.group.updateMatrixWorld(true);
    this.light.position.set(0, 0.9, 0.45).applyMatrix4(this.group.matrixWorld);
  }

  _ground() {
    const y = this.ow.getGroundHeight?.(FORGE_SPOT.x, FORGE_SPOT.z);
    return Number.isFinite(y) ? y : 0;
  }

  _build() {
    const g = new THREE.Group();
    g.name = 'ForgeStation';
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true; mesh.receiveShadow = true;
      g.add(mesh); return mesh;
    };
    const stone = mat(0x8E877C), stoneDark = mat(0x6E675E), clay = mat(0xA9774F), clayDark = mat(0x7C5238);
    const wood = mat(0x7A5230), woodDark = mat(0x5A3A22);
    const iron = mat(0x3D434D, { roughness: 0.4, metalness: 0.65 }), ironHi = mat(0x5B6370, { roughness: 0.35, metalness: 0.7 });

    // Plataforma de piedra y losas sueltas
    add(new THREE.CylinderGeometry(2.25, 2.45, 0.28, 10), stone, 0, 0.1, 0);
    [[1.9, -1.2, 0.5], [-2.0, 1.1, 0.42], [2.2, 1.0, 0.36]].forEach(([x, z, s]) => add(new THREE.CylinderGeometry(s, s * 1.1, 0.12, 6), stoneDark, x, 0.04, z, 0, x));

    // Horno: cuerpo, cúpula, chimenea y boca incandescente
    add(new THREE.CylinderGeometry(0.95, 1.15, 1.6, 10), clay, 0, 0.24 + 0.8, -0.95);
    add(new THREE.SphereGeometry(0.95, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), clayDark, 0, 1.84, -0.95);
    add(new THREE.CylinderGeometry(0.2, 0.27, 1.05, 8), stoneDark, 0.18, 2.55, -1.05);
    add(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 8), iron, 0.18, 3.1, -1.05);
    add(new THREE.BoxGeometry(0.92, 0.12, 0.34), stoneDark, 0, 1.12, -0.05); // dintel
    this.ember = add(new THREE.BoxGeometry(0.72, 0.55, 0.2), new THREE.MeshStandardMaterial({ color: 0xFF8A3D, emissive: 0xFF6A1A, emissiveIntensity: 2.2, roughness: 0.6 }), 0, 0.72, -0.02);
    this.ember.castShadow = false;

    // Yunque sobre tocón, delante del horno
    const ax = 0.15, az = 0.95;
    add(new THREE.CylinderGeometry(0.42, 0.5, 0.62, 10), wood, ax, 0.24 + 0.31, az);
    add(new THREE.BoxGeometry(0.36, 0.28, 0.3), iron, ax, 0.99, az);
    add(new THREE.BoxGeometry(0.98, 0.22, 0.42), ironHi, ax, 1.24, az);
    add(new THREE.ConeGeometry(0.2, 0.48, 10), ironHi, ax + 0.72, 1.26, az, 0, 0, -Math.PI / 2);
    add(new THREE.BoxGeometry(0.18, 0.18, 0.36), iron, ax - 0.56, 1.22, az);

    // Martillo apoyado sobre el yunque
    add(new THREE.CylinderGeometry(0.035, 0.04, 0.62, 6), woodDark, ax - 0.05, 1.42, az + 0.08, 0, 0.5, Math.PI / 2.4);
    add(new THREE.BoxGeometry(0.22, 0.12, 0.13), iron, ax - 0.3, 1.4, az - 0.02, 0, 0.5, 0);

    // Cubo de temple con agua
    add(new THREE.CylinderGeometry(0.34, 0.3, 0.5, 10), wood, -1.35, 0.24 + 0.25, 0.65);
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0x4F86B8, roughness: 0.15, metalness: 0.1 }), -1.35, 0.72, 0.65);
    // Pila de leña junto al horno
    [[-1.15, -0.55, 0], [-1.25, -0.85, 0.3], [-1.05, -0.7, 0.6]].forEach(([x, z, r], i) => add(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6), i % 2 ? wood : woodDark, x, 0.36 + i * 0.12, z, Math.PI / 2, r, 0));

    // Anillo dorado: se puede usar
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.72, 48), new THREE.MeshBasicMaterial({ color: 0xD3AE6C, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.27;
    g.add(ring); this.ring = ring;

    // Chispas que suben de la boca del horno
    const N = 14, pos = new Float32Array(N * 3);
    this.sparks = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, v: 0, life: 0, max: 0 }));
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.sparkPts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xFFD27A, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
    this.sparkPts.frustumCulled = false;
    g.add(this.sparkPts);
    return g;
  }

  _animate(dt) {
    const n = this.node; if (!n) return;
    this._t += dt;
    // El terreno puede terminar de cargar después: se reajusta la altura cada medio segundo
    this._snapT -= dt;
    if (this._snapT <= 0) { this._snapT = 0.5; n.group.position.y = this._ground(); this._placeLight(); }
    const flick = 0.75 + Math.sin(this._t * 9.1) * 0.12 + Math.sin(this._t * 23.7) * 0.08;
    this.light.intensity = 3.2 * flick;
    this.ember.material.emissiveIntensity = 2.2 * flick;
    this.ring.material.opacity = 0.32 + Math.sin(this._t * 2.2) * 0.12;
    const arr = this.sparkPts.geometry.attributes.position.array;
    this.sparks.forEach((s, i) => {
      s.life -= dt;
      if (s.life <= 0) { s.max = s.life = 0.8 + Math.random() * 1.1; s.x = (Math.random() - 0.5) * 0.5; s.y = 0.8; s.z = 0.05 + Math.random() * 0.2; s.v = 0.6 + Math.random() * 0.8; }
      s.y += s.v * dt; s.z += 0.25 * dt; s.x += Math.sin(this._t * 3 + i) * 0.12 * dt;
      arr[i * 3] = s.x; arr[i * 3 + 1] = s.y; arr[i * 3 + 2] = s.z;
    });
    this.sparkPts.geometry.attributes.position.needsUpdate = true;
  }
}
