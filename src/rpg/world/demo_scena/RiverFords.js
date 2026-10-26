// RiverFords.js — Piedras planas que marcan los vados del río (Hito 66).
//
// El lecho de cada vado ya está elevado en Terrain (WaterManager.FORDS): aquí solo se ponen piedras que asoman un
// poco sobre el agua, en dos hileras alternas, para que se vea a simple vista por dónde se cruza. Una sola
// InstancedMesh para todas (una llamada de dibujo); no tienen colisión: se pisan.
import * as THREE from 'three';
import { WaterManager } from './WaterManager.js';
import { getSoftToonRamp } from './genshin/GenshinMaterials.js';

const STEP = 2.1;    // separación entre piedras a lo largo del vado (m)
const SIDE = 0.85;   // desplazamiento lateral alterno (m)

export class RiverFords {
  constructor(zone) {
    this.zone = zone;
    this.group = new THREE.Group();
    this.group.name = 'RiverFords';
    zone.group.add(this.group);

    const spots = this._spots();
    const geo = new THREE.DodecahedronGeometry(0.5, 0);
    const mat = new THREE.MeshToonMaterial({ color: 0xb9ad98, gradientMap: getSoftToonRamp() });
    mat.name = 'RiverFordStone';
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, spots.length));
    mesh.name = 'RiverFordStones';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let rnd = 4242;
    const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
    spots.forEach((s, i) => {
      const k = 0.85 + rand() * 0.35;
      sc.set(1.6 * k, 0.62, 1.25 * k);
      e.set((rand() - 0.5) * 0.12, rand() * Math.PI, (rand() - 0.5) * 0.12);
      q.setFromEuler(e);
      p.set(s.x, s.waterY - 0.14, s.z); // asoma ~15 cm sobre el agua
      m.compose(p, q, sc);
      mesh.setMatrixAt(i, m);
    });
    mesh.count = spots.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    this.group.add(mesh);
    this.mesh = mesh;
    this.count = spots.length;
  }

  /** Puntos de las piedras: a lo largo de cada vado, solo dentro del cauce. */
  _spots() {
    const out = [];
    const inChannel = (x, z) => {
      const b = WaterManager.getRiverBounds(z);
      return z >= WaterManager.RIVER_Z0 && Math.abs(x - b.riverCenterX) < b.riverHalfWidth - 0.6;
    };
    const push = (x, z, nx, nz, i) => {
      const o = (i % 2 ? 1 : -1) * SIDE;
      const px = x + nx * o, pz = z + nz * o;
      if (!inChannel(px, pz)) return;
      // Solo donde el agua cubre algo: en la orilla somera no hacen falta
      const waterY = WaterManager.getRiverWaterHeight(pz);
      const ground = this.zone.terrain.getHeight(px, pz);
      if (waterY - ground < 0.12) return;
      out.push({ x: px, z: pz, waterY });
    };
    for (const f of WaterManager.FORDS) {
      let pts = [];
      if (f.road) {
        pts = WaterManager._roadSamples(this.zone.roadManager, f.road).filter((p) => p.y >= f.zMin && p.y <= f.zMax);
      } else {
        const n = Math.ceil(Math.hypot(f.b.x - f.a.x, f.b.z - f.a.z) / 0.5);
        for (let i = 0; i <= n; i++) pts.push(new THREE.Vector2(f.a.x + (f.b.x - f.a.x) * i / n, f.a.z + (f.b.z - f.a.z) * i / n));
      }
      // Re-muestreo cada STEP metros
      let acc = STEP, idx = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const seg = Math.hypot(b.x - a.x, b.y - a.y);
        if (seg < 1e-6) continue;
        const dx = (b.x - a.x) / seg, dz = (b.y - a.y) / seg;
        let t = 0;
        while (acc - (seg - t) <= 0) {
          t += acc; acc = STEP;
          push(a.x + dx * t, a.y + dz * t, -dz, dx, idx++);
        }
        acc -= (seg - t);
      }
    }
    return out;
  }

  setActive(active) { this.group.visible = active; }
}
