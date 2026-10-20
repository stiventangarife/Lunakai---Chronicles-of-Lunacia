// MerchantStall.js — Puesto de mercado del Mercader Ochi en el patio del Dojō (zona 2_2), hecho con primitivas.
// Solo decorado + colisión: la interacción la lleva el NPC (MapRegistry · ZONE_NPCS · 'merchant_ochi').
// Mostrador con mercancía delante del mercader, toldo a rayas sobre cuatro postes, cajas, saco y barril detrás.

import * as THREE from 'three';

/** Mismo sitio que el NPC; el frente (+z local) mira al este, hacia el camino y la forja. */
export const STALL_SPOT = { zone: '2_2', x: -80.0, z: 61.0, yaw: Math.PI / 2 };
const TAG = 'merchant_stall';
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...o });

export class MerchantStall {
  constructor(ow) {
    this.ow = ow;
    this.group = null;
    this._snapT = 0;
    const qi = ow.questInteractables;
    if (!qi) return;
    this.qi = qi;
    const load = qi.loadForZone.bind(qi);
    qi.loadForZone = (key) => { load(key); this._sync(key); };
    const update = qi.update.bind(qi);
    qi.update = (dt, pos) => { this._tick(dt || 0); update(dt, pos); };
    if (qi.currentZoneKey) this._sync(qi.currentZoneKey);
  }

  _ground(x = STALL_SPOT.x, z = STALL_SPOT.z) { const y = this.ow.getGroundHeight?.(x, z); return Number.isFinite(y) ? y : 0; }

  _sync(key) {
    const col = this.ow.collisions;
    col?.removeBoxesByTag?.(TAG); col?.removeCirclesByTag?.(TAG);
    if (this.group) { this.qi.scene.remove(this.group); this.group.traverse((c) => { c.geometry?.dispose?.(); c.material?.dispose?.(); }); this.group = null; }
    if (key !== STALL_SPOT.zone) return;
    this.group = this._build();
    this.group.position.set(STALL_SPOT.x, this._ground(), STALL_SPOT.z);
    this.group.rotation.y = STALL_SPOT.yaw;
    this.qi.scene.add(this.group);
    // Mostrador (1,1 m al este del mercader, 2,6 m a lo largo de z) y cajas de detrás
    col?.addBox?.(STALL_SPOT.x + 0.7, STALL_SPOT.x + 1.5, STALL_SPOT.z - 1.35, STALL_SPOT.z + 1.35, TAG);
    col?.addCircle?.(STALL_SPOT.x - 1.4, STALL_SPOT.z + 1.0, 0.65, TAG);
    col?.addCircle?.(STALL_SPOT.x - 1.3, STALL_SPOT.z - 1.8, 0.6, TAG);
  }

  /** El terreno puede terminar de cargar después: se reajusta la altura cada medio segundo. */
  _tick(dt) {
    if (!this.group) return;
    this._snapT -= dt;
    if (this._snapT <= 0) { this._snapT = 0.5; this.group.position.y = this._ground(); }
  }

  _build() {
    const g = new THREE.Group();
    g.name = 'MerchantStall';
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true; mesh.receiveShadow = true;
      g.add(mesh); return mesh;
    };
    const wood = mat(0x8A5E36), woodDark = mat(0x5E3D22), woodLight = mat(0xB98A55);
    const clothA = mat(0xE9DCC0), clothB = mat(0xC2503F), gilt = mat(0xD3AE6C, { roughness: 0.4, metalness: 0.5 });

    // Mostrador delante del mercader (local +z)
    add(new THREE.BoxGeometry(2.6, 0.9, 0.7), wood, 0, 0.45, 1.1);
    add(new THREE.BoxGeometry(2.8, 0.08, 0.86), woodLight, 0, 0.94, 1.1);
    add(new THREE.BoxGeometry(2.62, 0.16, 0.06), clothB, 0, 0.78, 1.47); // faldón

    // Mercancía sobre el mostrador
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6), mat(0x8FB35A), -0.9, 1.06, 1.05, 0, 0, Math.PI / 2); // cañas de bambú
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6), mat(0x9CC266), -0.9, 1.14, 1.15, 0, 0.2, Math.PI / 2);
    add(new THREE.SphereGeometry(0.11, 8, 6), mat(0xF29A3A), -0.3, 1.09, 1.0); // mandarinas
    add(new THREE.SphereGeometry(0.11, 8, 6), mat(0xF2A84A), -0.12, 1.09, 1.12);
    add(new THREE.SphereGeometry(0.1, 8, 6), mat(0xEE8F30), -0.24, 1.25, 1.06);
    [[0.35, 0xE0605A], [0.6, 0x6FA4F2], [0.85, 0x8CF09B]].forEach(([x, c]) => { // pociones
      add(new THREE.SphereGeometry(0.1, 10, 8), mat(c, { roughness: 0.2, emissive: c, emissiveIntensity: 0.25 }), x, 1.08, 1.08);
      add(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), woodDark, x, 1.22, 1.08);
    });

    // Postes y toldo a rayas, inclinado hacia delante
    [[-1.35, -0.9], [1.35, -0.9], [-1.35, 1.45], [1.35, 1.45]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.07, 0.08, z > 0 ? 2.45 : 2.9, 6), woodDark, x, (z > 0 ? 2.45 : 2.9) / 2, z));
    const awn = new THREE.Group(); awn.position.set(0, 2.68, 0.28); awn.rotation.x = 0.2; g.add(awn);
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.0 / 7, 0.06, 2.9), i % 2 ? clothB : clothA);
      m.position.x = -1.5 + (i + 0.5) * (3.0 / 7); m.castShadow = true; awn.add(m);
    }
    for (let i = 0; i < 7; i++) { // festón del borde
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 4), i % 2 ? clothB : clothA);
      m.position.set(-1.5 + (i + 0.5) * (3.0 / 7), -0.12, 1.45); m.rotation.x = Math.PI; awn.add(m);
    }
    // Letrero colgante con una moneda
    add(new THREE.BoxGeometry(0.7, 0.4, 0.05), woodLight, 1.0, 2.05, 1.47);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), gilt, 1.0, 2.05, 1.5, Math.PI / 2, 0, 0);

    // Cajas, saco y barril detrás del mercader
    add(new THREE.BoxGeometry(0.75, 0.6, 0.75), wood, -1.0, 0.3, -1.4, 0, 0.3, 0);
    add(new THREE.BoxGeometry(0.55, 0.45, 0.55), woodLight, -1.05, 0.83, -1.35, 0, -0.2, 0);
    add(new THREE.CylinderGeometry(0.36, 0.32, 0.85, 10), woodDark, 1.75, 0.43, -1.3);
    add(new THREE.SphereGeometry(0.4, 8, 6), mat(0xCDB48A), 1.85, 0.32, -0.45, 0, 0, 0).scale.set(1, 0.85, 1);
    return g;
  }
}
