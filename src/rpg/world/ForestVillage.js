// ForestVillage.js — El pueblo de la Isla del Bosque (zona 2_2): dojo, tienda de Ochi, Forja, casas, altar de Atia,
// tótem, parada con su bus, farolas y, en el embarcadero de Pomodoro, el puesto de pescado y la balsa. Hito 51.
// Sustituye a ForestDojo.js (el dojo pasa a ser una pieza más) y a los puestos hechos con primitivas.
//
// · Posiciones en ForestVillageLayout.js. Cada modelo se carga una vez y se dibuja como InstancedMesh: las cuatro
//   casas y las seis farolas cuestan una llamada de dibujo cada grupo.
// · Apoyo: la base va a la altura MÁS BAJA del terreno bajo la planta (rejilla 5×5), así ningún lado queda flotando;
//   en pendiente, el lado alto queda un poco enterrado. La balsa flota en el agua y se mece.
// · Claro: dentro de cada planta no crece hierba ni flores (shader de GenshinGrassField) y se retiran plantas,
//   guijarros y rocas; se ocultan los árboles que tocan un edificio o crecen junto a la calle. El resto del bosque
//   no cambia.
// · Colisión: las cuatro paredes de cada edificio (segmentos) y un círculo para las farolas y la balsa.
// · Mismo patrón que la Forja: se coloca al cargar la zona 2_2 y se retira al salir (los modelos se reutilizan).

import * as THREE from 'three';
import { cloneGLTF, evictGLTF } from '../../render/ModelCache.js';
import { ChimneySmoke, chimneyPoint } from './ChimneySmoke.js'; // Hito 96
import { VILLAGE, VILLAGE_MODELS, VILLAGE_ZONE, VILLAGE_STREET } from './ForestVillageLayout.js';

const TAG = 'forest_village';
const WALL_INSET = 0.4;      // las paredes de colisión van algo hacia dentro (porches y aleros no estorban)
const TREE_PAD = 4;          // árboles a menos de esto de un edificio se ocultan (las copas no atraviesan tejados)
const VEG_PAD = 1.2;         // plantas, guijarros y rocas pequeñas
const GRASS_PAD = 0.6;       // hierba y flores

export class ForestVillage {
  constructor(ow) {
    this.ow = ow;
    this.group = null;
    this._loading = null;
    this._clearedFor = null;   // grupo del Bosque ya despejado (si el Bosque se reconstruye, se despeja otra vez)
    this._snapT = 0;
    this._t = 0;
    this.items = [];
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
  _waterLevel() { const w = this.ow.demoScenaZone?.terrain?.waterLevel; return Number.isFinite(w) ? w : 1; }

  /** ¿Está (x, z) dentro de la planta de `it`, ampliada `pad` metros? */
  _inside(it, x, z, pad) {
    const dx = x - it.x, dz = z - it.z;
    const lx = it.c * dx - it.s * dz, lz = it.s * dx + it.c * dz;
    return Math.abs(lx) < it.hw + pad && Math.abs(lz) < it.hd + pad;
  }

  /** Punto del mundo a partir de coordenadas locales (m) de la planta de `it`. */
  _world(it, lx, lz) { return { x: it.x + it.c * lx + it.s * lz, z: it.z - it.s * lx + it.c * lz }; }

  /** Altura de apoyo: la más baja del terreno bajo la planta (rejilla 5×5), algo hundida. */
  _baseY(it) {
    if (it.def.float) return this._waterLevel() - 0.45 * (it.def.scale / 3.5);
    if (it.def.conform) {
      // Vehículos: se inclinan con el terreno (las cuatro ruedas apoyadas) en vez de hundirse por el lado alto
      const h = (lx, lz) => { const p = this._world(it, lx, lz); return this._ground(p.x, p.z); };
      const ax = it.hw * 0.8, az = it.hd * 0.8;
      const xp = h(ax, 0), xm = h(-ax, 0), zp = h(0, az), zm = h(0, -az);
      it.tiltZ = Math.atan2(xp - xm, 2 * ax);   // giro en torno a z local: sube el lado +x
      it.tiltX = -Math.atan2(zp - zm, 2 * az);  // giro en torno a x local: sube el lado +z
      return (xp + xm + zp + zm) / 4 - 0.03 + (it.lift || 0);
    }
    let y = Infinity;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const p = this._world(it, (i / 2 - 1) * it.hw, (j / 2 - 1) * it.hd);
      y = Math.min(y, this._ground(p.x, p.z));
    }
    if (it.plinth) {
      // En pendiente: la casa se apoya en lo más alto del terreno bajo su base (nada asoma por dentro) y un zócalo
      // de piedra rellena el hueco hasta lo más bajo (no flota)
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
        const p = this._world(it, it.baseCX + (i / 2 - 1) * it.baseHW, it.baseCZ + (j / 2 - 1) * it.baseHD);
        const g = this._ground(p.x, p.z);
        lo = Math.min(lo, g); hi = Math.max(hi, g);
      }
      it.plinthBottom = lo - 0.3;
      return hi + 0.03;
    }
    return y - 0.05;
  }

  async _ensureModels() {
    if (this.group) return this.group;
    if (!this._loading) {
      const names = [...new Set(VILLAGE.map((v) => v.model))];
      this._loading = Promise.all(names.map((n) => cloneGLTF(VILLAGE_MODELS[n].url).then(({ scene }) => [n, scene])))
        .then((loaded) => {
          const g = new THREE.Group();
          g.name = 'ForestVillage';
          const byModel = new Map(loaded);
          this.parts = [];
          this.items = [];
          names.forEach((name) => {
            const def = VILLAGE_MODELS[name];
            const scene = byModel.get(name);
            scene.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(scene);
            const list = VILLAGE.filter((v) => v.model === name);
            const center = new THREE.Vector3((box.min.x + box.max.x) / 2, 0, (box.min.z + box.max.z) / 2);
            // Planta de la base (vértices del 5 % más bajo del modelo): más pequeña que la del tejado; la usa el zócalo
            const base = new THREE.Box3(), v = new THREE.Vector3(), yCut = box.min.y + (box.max.y - box.min.y) * 0.05;
            scene.traverse((o) => {
              const pos = o.isMesh && o.geometry.attributes.position;
              if (!pos) return;
              for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (v.y <= yCut) base.expandByPoint(v); }
            });
            list.forEach((v) => {
              this.items.push({
                ...v, def, c: Math.cos(v.yaw), s: Math.sin(v.yaw), y: 0,
                hw: (box.max.x - box.min.x) / 2 * def.scale, hd: (box.max.z - box.min.z) / 2 * def.scale,
                part: name, index: list.indexOf(v), cx0: center.x, cz0: center.z,
                baseHW: (base.max.x - base.min.x) / 2 * def.scale, baseHD: (base.max.z - base.min.z) / 2 * def.scale,
                baseCX: ((base.min.x + base.max.x) / 2 - center.x) * def.scale, baseCZ: ((base.min.z + base.max.z) / 2 - center.z) * def.scale
              });
            });
            scene.traverse((o) => {
              if (!o.isMesh) return;
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              // Luz horneada en la textura: sin metal y mate (los GLB no traen mapa de metal/rugosidad)
              mats.forEach((m) => { if (m) { m.metalness = 0; m.roughness = 0.85; m.needsUpdate = true; } });
              const im = new THREE.InstancedMesh(o.geometry, o.material, list.length);
              im.name = `ForestVillage_${name}`;
              im.castShadow = true;
              im.receiveShadow = true;
              im.userData.local = o.matrixWorld.clone();   // malla dentro del GLB
              im.userData.center = center.clone();         // centro de la planta (origen descentrado)
              im.userData.model = name;
              g.add(im);
              this.parts.push(im);
            });
          });
          // Zócalo de piedra bajo las piezas con `plinth` (casas en pendiente): una sola llamada de dibujo para todos
          const plinths = this.items.filter((it) => it.plinth);
          if (plinths.length) {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            geo.translate(0, 0.5, 0); // origen en la base
            this.plinthMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x8C8378, roughness: 0.95, metalness: 0, flatShading: true }), plinths.length);
            this.plinthMesh.name = 'ForestVillage_plinth';
            this.plinthMesh.castShadow = true;
            this.plinthMesh.receiveShadow = true;
            plinths.forEach((it, i) => { it.plinthIndex = i; });
            g.add(this.plinthMesh);
          }
          this.group = g;
          return g;
        })
        .catch((e) => { console.warn('[ForestVillage] No se pudieron cargar los modelos', e); this._loading = null; return null; });
    }
    return this._loading;
  }

  /** Recalcula la altura de cada pieza y sus matrices. */
  _place(force = false) {
    let changed = force;
    this.items.forEach((it) => {
      const y = this._baseY(it);
      if (Math.abs(y - it.y) > 0.01) { it.y = y; changed = true; }
    });
    if (changed) this._writeMatrices();
  }

  /** Hito 96: humo de las casas con `smoke` (una sola llamada de dibujo; sigue la altura de cada casa). */
  _syncSmoke() {
    if (!this.group) return;
    const pts = this.items.filter((it) => it.smoke && it.model === 'house')
      .map((it) => chimneyPoint({ x: it.x, y: it.y, z: it.z, yaw: it.yaw, scale: it.def.scale, cx: it.cx0, cz: it.cz0 }));
    if (!this.smoke) this.smoke = new ChimneySmoke(this.group, pts);
    else this.smoke.setPoints(pts);
  }

  _writeMatrices() {
    const T = new THREE.Matrix4(), R = new THREE.Matrix4(), S = new THREE.Matrix4(), C = new THREE.Matrix4(), M = new THREE.Matrix4();
    this.parts.forEach((im) => {
      const { local, center, model } = im.userData;
      this.items.filter((it) => it.part === model).forEach((it) => {
        const bob = it.def.float ? Math.sin(this._t * 1.3 + it.x) * 0.05 : 0;
        const tilt = it.def.float ? Math.sin(this._t * 0.9 + it.z) * 0.03 : 0;
        T.makeTranslation(it.x, it.y + bob, it.z);
        R.makeRotationY(it.yaw);
        if (tilt) R.multiply(new THREE.Matrix4().makeRotationX(tilt));
        if (it.tiltZ || it.tiltX) R.multiply(new THREE.Matrix4().makeRotationZ(it.tiltZ || 0)).multiply(new THREE.Matrix4().makeRotationX(it.tiltX || 0));
        S.makeScale(it.def.scale, it.def.scale, it.def.scale);
        C.makeTranslation(-center.x, 0, -center.z);
        M.copy(T).multiply(R).multiply(S).multiply(C).multiply(local);
        im.setMatrixAt(it.index, M);
      });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    });
    this._syncSmoke();
    if (this.plinthMesh) {
      this.items.filter((it) => it.plinth).forEach((it) => {
        const h = Math.max(0.05, it.y + 0.02 - it.plinthBottom);
        const cx = it.x + it.c * it.baseCX + it.s * it.baseCZ, cz = it.z - it.s * it.baseCX + it.c * it.baseCZ;
        T.makeTranslation(cx, it.plinthBottom, cz);
        R.makeRotationY(it.yaw);
        S.makeScale(Math.max(0.2, 2 * it.baseHW - 0.3), h, Math.max(0.2, 2 * it.baseHD - 0.3)); // algo metido: la plataforma sobresale
        M.copy(T).multiply(R).multiply(S);
        this.plinthMesh.setMatrixAt(it.plinthIndex, M);
      });
      this.plinthMesh.instanceMatrix.needsUpdate = true;
      this.plinthMesh.computeBoundingSphere();
    }
  }

  async _sync(key) {
    const col = this.ow.collisions;
    col?.removeBoxesByTag?.(TAG); col?.removeCirclesByTag?.(TAG);
    if (col?.segments) col.segments = col.segments.filter((s) => s.tag !== TAG);
    if (this.group?.parent) this.group.parent.remove(this.group);
    this._activeKey = key;
    if (key !== VILLAGE_ZONE) { this._release(); return; }
    const g = await this._ensureModels();
    if (!g) return;
    if (this._activeKey !== VILLAGE_ZONE) { this._release(); return; } // se cambió de zona mientras cargaba
    this._place(true);
    this.qi.scene.add(g);
    this.items.forEach((it) => {
      if (it.def.collider === 'circle') { col?.addCircle?.(it.x, it.z, it.def.radius, TAG); return; }
      const w = Math.max(0.3, it.hw - WALL_INSET), d = Math.max(0.3, it.hd - WALL_INSET);
      const cs = [[-w, -d], [w, -d], [w, d], [-w, d]].map(([a, b]) => this._world(it, a, b));
      for (let i = 0; i < 4; i++) {
        const p = cs[i], q = cs[(i + 1) % 4];
        col?.addSegment?.(p.x, p.z, q.x, q.z, 0.35, TAG);
      }
    });
    this._clearVegetation();
  }

  /**
   * Fuera del Bosque el pueblo no se ve: se libera todo (≈ 110 MB de texturas en la GPU) y se vuelve a cargar al
   * volver a la isla (los GLB salen del caché HTTP del navegador, sin descargarlos otra vez).
   */
  _release() {
    if (!this.group && !this._loading) return;
    const loading = this._loading;
    const finish = () => {
      if (this._activeKey === VILLAGE_ZONE) return; // se volvió al Bosque antes de terminar: se queda
      if (this.group?.parent) this.group.parent.remove(this.group);
      (this.parts || []).forEach((im) => im.dispose());
      if (this.plinthMesh) { this.plinthMesh.geometry.dispose(); this.plinthMesh.material.dispose(); this.plinthMesh.dispose(); }
      this.smoke?.dispose(); this.smoke = null;
      [...new Set(VILLAGE.map((v) => VILLAGE_MODELS[v.model].url))].forEach((url) => evictGLTF(url));
      this.group = null; this._loading = null; this.parts = []; this.items = []; this.plinthMesh = null;
    };
    if (this.group) finish(); else loading?.then(finish);
  }

  /**
   * Despeja las plantas de las piezas: hierba y flores del campo Genshin (por shader), las instancias de plantas,
   * flores, guijarros y rocas del Bosque y los árboles que tocan un edificio. Nada se regenera, así que el resto
   * de la isla no cambia. Se hace cuando el Bosque ya está construido (si no, se reintenta en _tick).
   */
  _clearVegetation() {
    const zone = this.ow.demoScenaZone;
    if (!zone || !zone.isLoaded || !zone.group || this._clearedFor === zone.group) return;
    this._clearedFor = zone.group;
    const onLand = this.items.filter((it) => !it.def.float);
    zone.genshinArt?.grass?.setClearings?.(onLand.map((it) => ({ x: it.x, z: it.z, yaw: it.yaw, halfW: it.hw + GRASS_PAD, halfD: it.hd + GRASS_PAD })));

    const m = new THREE.Matrix4(), p = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    let removed = 0, trees = 0;
    const hit = (x, z, pad) => onLand.some((it) => this._inside(it, x, z, pad));
    zone.group.updateMatrixWorld(true);
    zone.group.traverse((o) => {
      if (/GenshinTree|GenshinGrass|GenshinFlower|ForestVillage/.test(o.name || '')) return;
      if (o.isInstancedMesh) {
        let changed = false;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          p.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld);
          if (hit(p.x, p.z, VEG_PAD)) { o.setMatrixAt(i, zero); changed = true; removed++; }
        }
        if (changed) { o.instanceMatrix.needsUpdate = true; o.computeBoundingSphere?.(); }
      } else if (o.isMesh && o.geometry) {
        // Rocas y adornos sueltos (no el terreno, el agua ni los caminos, que son mallas grandes)
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const r = o.geometry.boundingSphere.radius * o.getWorldScale(p).x;
        if (r > 6) return;
        o.getWorldPosition(p);
        if (hit(p.x, p.z, 0.8)) { o.visible = false; removed++; }
      }
    });
    // Árboles: GenshinTrees dibuja cada árbol si su esfera (centro + radio) toca la vista o la de sombras; con un
    // radio negativo enorme la prueba de three (Frustum.intersectsSphere) falla siempre y el árbol no se dibuja
    const buildings = onLand.filter((it) => !it.def.small);
    const { points: SP, halfWidth } = VILLAGE_STREET;
    const nearStreet = (x, z) => {
      for (let k = 0; k + 1 < SP.length; k++) {
        const S0 = SP[k], sx = SP[k + 1].x - S0.x, sz = SP[k + 1].z - S0.z;
        const t = Math.max(0, Math.min(1, ((x - S0.x) * sx + (z - S0.z) * sz) / (sx * sx + sz * sz)));
        if (Math.hypot(x - (S0.x + sx * t), z - (S0.z + sz * t)) < halfWidth) return true;
      }
      return false;
    };
    (zone.genshinArt?.trees?.lodBuckets || []).forEach((Bk) => {
      for (let i = 0; i < Bk.n; i++) {
        const x = Bk.centers[i * 3], z = Bk.centers[i * 3 + 2];
        if (Bk.radii[i] > 0 && (nearStreet(x, z) || buildings.some((it) => this._inside(it, x, z, TREE_PAD)))) { Bk.radii[i] = -1e9; trees++; }
      }
    });
    console.log(`[ForestVillage] Claros del pueblo: ${removed} plantas o rocas y ${trees} árboles retirados`);
    zone.refreshForestColliders?.(); // sin colisión donde ya no hay árbol ni roca (Hito 66)
  }

  /** El terreno puede terminar de cargar después: se reajusta la altura y se completan los claros. La balsa se mece. */
  _tick(dt) {
    if (!this.group || !this.group.parent) return;
    this._t += dt;
    this._snapT -= dt;
    if (this._snapT <= 0) {
      this._snapT = 0.5;
      this._place();
      this._clearVegetation();
    }
    const floating = this.items.some((it) => it.def.float);
    if (floating) this._writeFloat();
  }

  /** Solo la pieza que flota se reescribe cada fotograma. */
  _writeFloat() {
    const T = new THREE.Matrix4(), R = new THREE.Matrix4(), S = new THREE.Matrix4(), C = new THREE.Matrix4(), M = new THREE.Matrix4();
    this.parts.forEach((im) => {
      const { local, center, model } = im.userData;
      if (!VILLAGE_MODELS[model].float) return;
      this.items.filter((it) => it.part === model).forEach((it) => {
        T.makeTranslation(it.x, it.y + Math.sin(this._t * 1.3 + it.x) * 0.05, it.z);
        R.makeRotationY(it.yaw).multiply(M.makeRotationX(Math.sin(this._t * 0.9 + it.z) * 0.03));
        S.makeScale(it.def.scale, it.def.scale, it.def.scale);
        C.makeTranslation(-center.x, 0, -center.z);
        M.copy(T).multiply(R).multiply(S).multiply(C).multiply(local);
        im.setMatrixAt(it.index, M);
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }
}
