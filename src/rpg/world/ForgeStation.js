// ForgeStation.js — Yunque de la Forja (zona 2_2). Hito 51: la Forja es el edificio forja.glb del pueblo del Bosque
// (ForestVillage); aquí queda lo que la hace usable: el punto donde se pulsa E delante de la puerta, un anillo dorado
// en el suelo que lo marca, la luz del horno que parpadea y las chispas. Se integra como un nodo más de
// QuestInteractablesManager: el mismo aviso «E · Usar la forja» que el resto de objetos y la misma tecla E. Al pulsarla
// llama a onUse() (abre la pantalla). La colisión la pone el edificio (ForestVillage).

import * as THREE from 'three';
import { FORGE_USE_SPOT, VILLAGE_ZONE } from './ForestVillageLayout.js';

/** Delante de la puerta de la Forja del pueblo; el frente (+z local) mira al camino. */
export const FORGE_SPOT = { zone: VILLAGE_ZONE, x: FORGE_USE_SPOT.x, z: FORGE_USE_SPOT.z, yaw: FORGE_USE_SPOT.yaw };
const USE_RADIUS = 3.2;
/** Boca del horno del modelo, en ejes locales del punto de uso (hacia dentro del edificio es −z). */
const FURNACE = new THREE.Vector3(-0.8, 1.1, -2.3);

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
    // Luz del horno: se crea UNA vez y se queda en la escena (apagada fuera del Bosque). Si se añadiera y quitara con
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
    this.node = null;
    // el anillo anterior (qi.clear() ya lo sacó de la escena): se libera su memoria de GPU
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
    this.node = { id: 'forge_station', type: 'forge', group, radius: USE_RADIUS, promptText: 'Usar la forja', onInteract: () => this.onUse?.() };
    this.qi.nodes.push(this.node);
  }

  /** La luz vive en la escena: se coloca en la boca del horno. */
  _placeLight() {
    if (!this.group) return;
    this.group.updateMatrixWorld(true);
    this.light.position.copy(FURNACE).applyMatrix4(this.group.matrixWorld);
  }

  _ground() {
    const y = this.ow.getGroundHeight?.(FORGE_SPOT.x, FORGE_SPOT.z);
    return Number.isFinite(y) ? y : 0;
  }

  _build() {
    const g = new THREE.Group();
    g.name = 'ForgeStation';
    // Anillo dorado: aquí se puede usar
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 40), new THREE.MeshBasicMaterial({ color: 0xD3AE6C, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
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
    this.ring.material.opacity = 0.32 + Math.sin(this._t * 2.2) * 0.12;
    const arr = this.sparkPts.geometry.attributes.position.array;
    this.sparks.forEach((s, i) => {
      s.life -= dt;
      if (s.life <= 0) { s.max = s.life = 0.8 + Math.random() * 1.1; s.x = FURNACE.x + (Math.random() - 0.5) * 0.5; s.y = FURNACE.y; s.z = FURNACE.z + 0.05 + Math.random() * 0.2; s.v = 0.6 + Math.random() * 0.8; }
      s.y += s.v * dt; s.z += 0.25 * dt; s.x += Math.sin(this._t * 3 + i) * 0.12 * dt;
      arr[i * 3] = s.x; arr[i * 3 + 1] = s.y; arr[i * 3 + 2] = s.z;
    });
    this.sparkPts.geometry.attributes.position.needsUpdate = true;
  }
}
