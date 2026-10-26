// ForestDojo.js — Dojo de madera (assets/environment/dojo.glb) al final del camino de la tienda, en la Isla del
// Bosque (zona 2_2). Hito 50 (23-oct).
//
// · El GLB mide ~1,9 × 1,4 × 1,6 m con el origen en el centro de la base: se escala ×6 (≈11 m de ancho).
// · Luz y sombras vienen horneadas en la textura: material sin metal y bastante mate.
// · Claro: al construirlo se retiran la hierba, las flores, los guijarros, las plantas y las rocas que quedan
//   dentro de su planta (sin regenerar el bosque: el resto de la isla queda igual) y se le pone colisión.
// · Mismo patrón que el puesto de la tienda y la forja: se coloca al cargar la zona 2_2 y se retira al salir.

import * as THREE from 'three';
import { cloneGLTF } from '../../render/ModelCache.js';

/** El porche (mesa de té y cojines) y la escalera miran a la tienda de Ochi y al camino. */
export const DOJO_SPOT = { zone: '2_2', x: -85.9, z: 16.2, yaw: 2.52, scale: 6 };
const MODEL_URL = './assets/environment/dojo.glb';
const TAG = 'forest_dojo';
const HALF_W = 0.95 * DOJO_SPOT.scale; // medio ancho (x local) del modelo escalado
const HALF_D = 0.81 * DOJO_SPOT.scale; // medio fondo (z local)

export class ForestDojo {
  constructor(ow) {
    this.ow = ow;
    this.group = null;
    this._loading = null;
    this._cleared = false;
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

  _ground(x, z) { const y = this.ow.getGroundHeight?.(x, z); return Number.isFinite(y) ? y : 0; }

  /** Punto del mundo a partir de coordenadas locales del dojo (x, z en metros, ya escalados). */
  _world(lx, lz) {
    const c = Math.cos(DOJO_SPOT.yaw), s = Math.sin(DOJO_SPOT.yaw);
    return { x: DOJO_SPOT.x + c * lx + s * lz, z: DOJO_SPOT.z - s * lx + c * lz };
  }

  /** ¿Está (x, z) dentro de la planta del dojo, ampliada `pad` metros? */
  _inside(x, z, pad = 0) {
    const dx = x - DOJO_SPOT.x, dz = z - DOJO_SPOT.z;
    const c = Math.cos(DOJO_SPOT.yaw), s = Math.sin(DOJO_SPOT.yaw);
    const lx = c * dx - s * dz, lz = s * dx + c * dz;
    return Math.abs(lx) < HALF_W + pad && Math.abs(lz) < HALF_D + pad;
  }

  /** Altura de apoyo: la media del terreno bajo el centro y las esquinas (el sitio es casi plano). */
  _baseY() {
    const pts = [[0, 0], [-HALF_W, -HALF_D], [HALF_W, -HALF_D], [-HALF_W, HALF_D], [HALF_W, HALF_D]].map(([a, b]) => this._world(a, b));
    const ys = pts.map((p) => this._ground(p.x, p.z));
    return ys.reduce((a, b) => a + b, 0) / ys.length - 0.05;
  }

  async _ensureModel() {
    if (this.group) return this.group;
    if (!this._loading) {
      this._loading = cloneGLTF(MODEL_URL).then(({ scene }) => {
        scene.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          o.receiveShadow = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          // El GLB no trae textura de metal/rugosidad: sin esto three lo trataría como metal (se ve oscuro)
          mats.forEach((m) => { if (m) { m.metalness = 0; m.roughness = 0.85; m.needsUpdate = true; } });
        });
        const g = new THREE.Group();
        g.name = 'ForestDojo';
        scene.scale.setScalar(DOJO_SPOT.scale);
        g.add(scene);
        g.rotation.y = DOJO_SPOT.yaw;
        this.group = g;
        return g;
      }).catch((e) => { console.warn('[ForestDojo] No se pudo cargar el modelo', e); this._loading = null; return null; });
    }
    return this._loading;
  }

  async _sync(key) {
    const col = this.ow.collisions;
    col?.removeBoxesByTag?.(TAG); col?.removeCirclesByTag?.(TAG);
    if (col?.segments) col.segments = col.segments.filter((s) => s.tag !== TAG);
    if (this.group?.parent) this.group.parent.remove(this.group);
    this._activeKey = key;
    if (key !== DOJO_SPOT.zone) return;
    const g = await this._ensureModel();
    if (!g || this._activeKey !== DOJO_SPOT.zone) return; // se cambió de zona mientras cargaba
    g.position.set(DOJO_SPOT.x, this._baseY(), DOJO_SPOT.z);
    this.qi.scene.add(g);
    // Colisión: las cuatro paredes de la planta (algo hacia dentro, para que el porche no estorbe de lejos)
    const w = HALF_W - 0.5, d = HALF_D - 0.5;
    const corners = [[-w, -d], [w, -d], [w, d], [-w, d]].map(([a, b]) => this._world(a, b));
    for (let i = 0; i < 4; i++) {
      const p = corners[i], q = corners[(i + 1) % 4];
      col?.addSegment?.(p.x, p.z, q.x, q.z, 0.35, TAG);
    }
    this._clearVegetation();
  }

  /**
   * Retira lo que queda dentro de la planta: hierba y flores del campo Genshin (por shader), y las instancias
   * de plantas, flores, guijarros y rocas del Bosque. No toca los árboles (ninguno queda dentro) ni regenera
   * nada, así que el resto de la isla no cambia. Se hace una vez, cuando el Bosque ya está construido.
   */
  _clearVegetation() {
    if (this._cleared) return;
    const zone = this.ow.demoScenaZone;
    if (!zone || !zone.isLoaded || !zone.group) return; // se reintenta en _tick
    this._cleared = true;
    zone.genshinArt?.grass?.setClearing?.(DOJO_SPOT.x, DOJO_SPOT.z, DOJO_SPOT.yaw, HALF_W + 0.6, HALF_D + 0.6);
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    let removed = 0;
    zone.group.updateMatrixWorld(true);
    zone.group.traverse((o) => {
      if (/GenshinTree|GenshinGrass|GenshinFlower/.test(o.name || '')) return;
      if (o.isInstancedMesh) {
        let changed = false;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          p.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld);
          if (this._inside(p.x, p.z, 1.2)) { o.setMatrixAt(i, zero); changed = true; removed++; }
        }
        if (changed) { o.instanceMatrix.needsUpdate = true; o.computeBoundingSphere?.(); }
      } else if (o.isMesh && o.geometry) {
        // Rocas y adornos sueltos (no el terreno, el agua ni los caminos, que son mallas grandes)
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const r = o.geometry.boundingSphere.radius * o.getWorldScale(p).x;
        if (r > 6) return;
        o.getWorldPosition(p);
        if (this._inside(p.x, p.z, 0.8)) { o.visible = false; removed++; }
      }
    });
    console.log(`[ForestDojo] Claro del dojo: ${removed} elementos retirados`);
  }

  /** El terreno puede terminar de cargar después: se reajusta la altura y se completa el claro. */
  _tick(dt) {
    if (!this.group || !this.group.parent) return;
    this._snapT -= dt;
    if (this._snapT <= 0) {
      this._snapT = 0.5;
      this.group.position.y = this._baseY();
      if (!this._cleared) this._clearVegetation();
    }
  }
}
